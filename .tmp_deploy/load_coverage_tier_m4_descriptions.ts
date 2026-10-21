#!/usr/bin/env bun
// load_coverage_tier_m4_descriptions.ts — Phase M4 of the coverage_tier migration.
//
// Updates stale field descriptions to reflect the new coverage_tier-driven score
// derivation, AND drops the unused 'fallback' value from skill_tools.requirement_level.
//
// Specifically:
//   1. tools.data_object_id (field) — add the inbound-is-optional clause
//   2. skill_tools (entity) — remove the stale 'tool_solutions semantius_native' reference
//   3. skill_tools.requirement_level (field) — drop 'fallback' from enum_values
//      (0 uses across 1364 rows as of 2026-05-26; conflated with 'optional' in practice)
//
// Idempotent: only PATCHes if the description doesn't already start with the
// expected new prefix.
//
// Run from project root (Rule #6):
//   bun run c:/dev/domain-map/.tmp_deploy/load_coverage_tier_m4_descriptions.ts

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
// Field-description updates
// ============================================================

const FIELD_UPDATES: Array<{ id: string; description: string; marker: string }> = [
  {
    id: "tools.data_object_id",
    marker: "Required when `operation_kind",
    description:
      "Required when `operation_kind ∈ {query, mutate}`. Must be NULL for `side_effect` and `compute`. Optional for `inbound` (populate when the landing target is known at the catalog level; NULL for generic inbound primitives like `receive_webhook`).",
  },
];

console.log(`M4.a — update ${FIELD_UPDATES.length} field descriptions`);
for (const f of FIELD_UPDATES) {
  const rows = (await postgrest("GET", `/fields?id=eq.${f.id}&select=description`)) as Row[];
  if (!rows || rows.length !== 1) {
    console.log(`  ⚠ ${f.id}: not found (${rows?.length ?? 0} rows)`);
    continue;
  }
  const current = String(rows[0].description ?? "");
  if (current.startsWith(f.marker)) {
    console.log(`  ♻ ${f.id}: already updated`);
    continue;
  }
  console.log(`  ✨ ${f.id}: PATCHing description`);
  await postgrest("PATCH", `/fields?id=eq.${f.id}`, { description: f.description });
}

// ============================================================
// Entity description update — skill_tools
// ============================================================

const ENTITY_UPDATES: Array<{ table: string; description: string; marker: string }> = [
  {
    table: "skill_tools",
    marker: "A junction record linking one Skill to one Tool",
    description:
      "A junction record linking one Skill to one Tool it requires, with the requirement level (required, optional, or fallback) and a one-line workflow context note. The matrix of `skill_tools` rows is the input to the Semantius score derivation: `strict_score = count(WHERE tools.coverage_tier = 'platform') / count(*)`; `operational_score = count(WHERE tools.coverage_tier IN ('platform', 'integration')) / count(*)`. The strict score is the share of needs the platform serves alone; the operational score adds curated OOTB integrations.",
  },
];

console.log(`M4.b — update ${ENTITY_UPDATES.length} entity descriptions`);
for (const e of ENTITY_UPDATES) {
  const rows = (await postgrest("GET", `/entities?table_name=eq.${e.table}&select=table_name,description`)) as Row[];
  if (!rows || rows.length !== 1) {
    console.log(`  ⚠ ${e.table}: not found (${rows?.length ?? 0} rows)`);
    continue;
  }
  const current = String(rows[0].description ?? "");
  // Idempotency: skip if the stale "semantius_native" string is gone
  if (!current.includes("semantius_native")) {
    console.log(`  ♻ ${e.table}: already updated (no stale 'semantius_native' marker)`);
    continue;
  }
  console.log(`  ✨ ${e.table}: PATCHing description`);
  await postgrest("PATCH", `/entities?table_name=eq.${e.table}`, { description: e.description });
}

// ============================================================
// M4.c — drop 'fallback' from skill_tools.requirement_level enum
// ============================================================
console.log("M4.c — drop 'fallback' from skill_tools.requirement_level enum");

const rlRows = await postgrest(
  "GET",
  "/fields?id=eq.skill_tools.requirement_level&select=enum_values"
);
const rlEnum = (rlRows?.[0]?.enum_values as string[]) ?? [];

if (!rlEnum.includes("fallback")) {
  console.log("  ♻ 'fallback' already absent from enum");
} else {
  // Safety check: confirm zero rows still use 'fallback' before removing
  const stragglers = (await postgrest(
    "GET",
    "/skill_tools?requirement_level=eq.fallback&select=id"
  )) as Row[];
  if (stragglers && stragglers.length > 0) {
    throw new Error(
      `Cannot drop 'fallback' enum value: ${stragglers.length} skill_tools rows still use it. ` +
        `Investigate and convert to 'required' or 'optional' first.`
    );
  }
  const next = rlEnum.filter((v) => v !== "fallback");
  console.log(`  ✨ enum_values: ${JSON.stringify(rlEnum)} → ${JSON.stringify(next)}`);
  await crud("update_field", {
    id: "skill_tools.requirement_level",
    data: {
      enum_values: next,
      description:
        "`required` tools must be available for the skill to function; `optional` improves the skill but the skill can degrade gracefully without them.",
    },
  });
}

console.log("\nDONE");
