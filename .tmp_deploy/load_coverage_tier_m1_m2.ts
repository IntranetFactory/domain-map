#!/usr/bin/env bun
// load_coverage_tier_m1_m2.ts — Phase M1 (schema) + Phase M2 (backfill existing 889 tools).
//
// M1: extend tools.operation_kind enum to include 'inbound'; create tools.coverage_tier
//     enum field (platform / external / integration; default external; NOT NULL).
// M2: backfill coverage_tier on all existing tools rows
//     (query + mutate → 'platform'; side_effect + compute → 'external').
//
// Idempotent: M1 skips if enum already extended or column already present;
// M2 only PATCHes rows where coverage_tier is NULL / missing (i.e. first run after M1).
//
// Run from project root (Rule #6):
//   bun run c:/dev/domain-map/.tmp_deploy/load_coverage_tier_m1_m2.ts

export {};

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

async function crud(tool: string, payload: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// ============================================================
// Pre-flight: confirm tenant
// ============================================================
console.log("PRE-FLIGHT — confirm tenant");
const me = await crud("getCurrentUser", {});
console.log(`  user: ${me?.email ?? "?"}  org: ${me?.semantius_org ?? "?"}`);

// ============================================================
// STEP M1.a — extend tools.operation_kind to include 'inbound'
// ============================================================
console.log("M1.a — extend tools.operation_kind enum to include 'inbound'");

const opKindRows = await postgrest("GET", "/fields?id=eq.tools.operation_kind&select=id,enum_values,description");
if (!opKindRows || opKindRows.length !== 1) {
  throw new Error(`Expected exactly 1 tools.operation_kind field row, got ${opKindRows?.length ?? 0}`);
}
const currentEnum = (opKindRows[0].enum_values as string[]) ?? [];
const REQUIRED_KINDS = ["query", "mutate", "side_effect", "compute", "inbound"];
const missing = REQUIRED_KINDS.filter((v) => !currentEnum.includes(v));

if (missing.length === 0) {
  console.log("  ♻ enum already contains all 5 values, skipping");
} else {
  const next = [...currentEnum, ...missing];
  console.log(`  ✨ extending enum_values: ${JSON.stringify(currentEnum)} → ${JSON.stringify(next)}`);
  await crud("update_field", {
    id: "tools.operation_kind",
    data: {
      enum_values: next,
      description:
        "What shape of work the tool performs. `query` and `mutate` read or write structured business data; `side_effect` triggers an external action with no business-data return; `compute` is pure computation, AI, or web automation; `inbound` receives an external event or message. The Semantius score derivation reads from `coverage_tier`, not from this column.",
    },
  });
}

// ============================================================
// STEP M1.b — create tools.coverage_tier enum field if missing
// ============================================================
console.log("M1.b — create tools.coverage_tier field");

const covRows = await postgrest("GET", "/fields?id=eq.tools.coverage_tier&select=id");
if (covRows && covRows.length > 0) {
  console.log("  ♻ tools.coverage_tier already exists, skipping create");
} else {
  console.log("  ✨ creating tools.coverage_tier (enum platform/external/integration)");
  await crud("create_field", {
    data: {
      table_name: "tools",
      field_name: "coverage_tier",
      title: "Coverage Tier",
      description:
        "Where the tool's implementation lives today: `platform` = Semantius covers it natively; `external` = the customer must bring an external integration; `integration` = the platform maintains a curated OOTB integration (e.g. an MCP server in the Semantius catalog). Score derivations read this column, not `operation_kind`. Flip from `external` to `platform` only when the capability is shipped on BOTH the `crud` MCP server AND the `semantius` CLI; shipping one without the other does not count.",
      format: "enum",
      enum_values: ["platform", "external", "integration"],
      default_value: "external",
      field_order: 1000022,
    },
  });
}

// Schema-changing operations: refresh cache before subsequent writes
console.log("  refreshing schema cache");
await crud("refresh_schema_cache", {});

// ============================================================
// STEP M2 — backfill coverage_tier on existing tools
// ============================================================
console.log("M2 — backfill coverage_tier on existing tools");

// Map operation_kind → coverage_tier for the backfill
const BACKFILL: Record<string, "platform" | "external"> = {
  query: "platform",
  mutate: "platform",
  side_effect: "external",
  compute: "external",
};

// We only want to PATCH rows that don't already have a value set to the right one.
// PostgREST PATCH with a filter is atomic, so we issue one PATCH per kind.
let totalUpdated = 0;
for (const [kind, tier] of Object.entries(BACKFILL)) {
  // Filter: rows of this kind whose coverage_tier doesn't already match.
  // We use `coverage_tier=not.eq.<tier>` plus an or() for NULL, but PostgREST
  // can't represent that compactly; simplest is to filter just by kind and
  // PATCH unconditionally — the field has a NOT NULL default so a PATCH that
  // sets it to the same value is a no-op semantically (still touches updated_at).
  // To keep updated_at stable on re-runs, we filter out rows already at target.
  const path = `/tools?operation_kind=eq.${kind}&coverage_tier=neq.${tier}`;
  const before = await postgrest("GET", `${path}&select=id`);
  const count = Array.isArray(before) ? before.length : 0;
  if (count === 0) {
    console.log(`  ♻ ${kind}: no rows to update (already at '${tier}' or empty)`);
    continue;
  }
  console.log(`  ✨ ${kind}: PATCHing ${count} rows → coverage_tier='${tier}'`);
  await postgrest("PATCH", path, { coverage_tier: tier });
  totalUpdated += count;
}

console.log(`M2 complete — ${totalUpdated} rows updated`);

// ============================================================
// Verify
// ============================================================
console.log("VERIFY — coverage_tier distribution");
const verify = await postgrest(
  "GET",
  "/tools?select=operation_kind,coverage_tier&order=operation_kind.asc"
);
const tally: Record<string, number> = {};
for (const r of verify as Row[]) {
  const key = `${r.operation_kind} → ${r.coverage_tier}`;
  tally[key] = (tally[key] ?? 0) + 1;
}
for (const [key, count] of Object.entries(tally).sort()) {
  console.log(`  ${key}: ${count}`);
}

console.log("\nDONE — review at https://tests.semantius.app/domain_map/tools");
