/**
 * §1 of plans/domain-kind-taxonomy-plan.md — add `domains.domain_kind`.
 *
 * Adds an enum field `domain_kind` to `domains` with values
 *   established_market | emerging_market | bundle
 * default `established_market`, NOT NULL (create_field yields is_nullable=false,
 * matching the precedent enum fields cost_band / min_org_size / record_status).
 *
 * Platform enforces the enum from field metadata (Rule #13) — NO hand-written
 * DB CHECK constraint.
 *
 * The platform creates a required enum via ALTER TABLE ... ADD COLUMN ... NOT
 * NULL DEFAULT '<default_value>', which Postgres backfills onto existing rows,
 * so after creation every domain should already read `established_market`. The
 * backfill step below is an idempotent safety net for any row that is somehow
 * null/empty; normally it patches zero rows. §2 of the plan reclassifies the
 * emerging_market / bundle rows later; §1 only establishes the universal default.
 *
 * Additive only: touches domain_kind exclusively, never record_status (Rule #1).
 * Idempotent: skips create if the field exists; backfill only patches NULL/empty
 * rows; safe to re-run.
 *
 * Run from project root: bun run .tmp_deploy/add_domains_domain_kind_2026_06_16.ts
 */

type CmdResult = { ok: boolean; data: any; stderr: string; code: number };

async function call(server: string, tool: string, payload: any): Promise<CmdResult> {
  const proc = Bun.spawn(["semantius", "call", server, tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, stderr: err.trim() || out.trim(), code };
  return { ok: true, data: out.trim() ? JSON.parse(out.trim()) : null, stderr: "", code };
}

async function get(path: string): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "GET", path });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "PATCH", path, body });
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

const ENUM = ["established_market", "emerging_market", "bundle"];
const DEFAULT_KIND = "established_market";

async function main() {
  console.log("§1 add domains.domain_kind — 2026-06-16");
  console.log("========================================\n");

  // ----- Step 1: ensure domains.domain_kind field exists -----
  console.log("Step 1: ensure domains.domain_kind field exists");
  const existingField = await get(
    "/fields?table_name=eq.domains&field_name=eq.domain_kind&select=field_name,format,enum_values,default_value,is_nullable"
  );
  if (existingField.length === 0) {
    const result = await call("crud", "create_field", {
      data: {
        table_name: "domains",
        field_name: "domain_kind",
        title: "Domain Kind",
        description:
          "Nature of the domain row. established_market = owns its own masters and has at least one primary-coverage vendor. emerging_market = owns its own masters but only partial vendor coverage. bundle = owns no masters; it embeds / consumes from other domains' markets (a deployable starter promoted to a domain row). Filters and audit floors branch on this: bundle rows are exempt from the market-shape floors (capabilities, masters, function-owner, solutions) and from the market-research metadata floor.",
        format: "enum",
        enum_values: ENUM,
        default_value: DEFAULT_KIND,
        field_order: 1000100,
      },
    });
    if (!result.ok) throw new Error(`create_field domains.domain_kind failed: ${result.stderr}`);
    console.log("  + domains.domain_kind created");
  } else {
    console.log(`  = domains.domain_kind already exists, skipped (${JSON.stringify(existingField[0])})`);
  }

  // ----- Step 2: backfill any null/empty rows to the default (idempotent safety net) -----
  // The OR logic-tree form `or=(domain_kind.is.null,domain_kind.eq.)` is a PostgREST
  // parse error (an empty `eq.` member can't sit inside or=()), so detect the two
  // conditions with separate single-predicate GETs and sum them.
  console.log("\nStep 2: backfill any null/empty domains to default 'established_market'");
  const nullRows = await get("/domains?domain_kind=is.null&select=id,domain_code");
  const emptyRows = await get("/domains?domain_kind=eq.&select=id,domain_code");
  const need = nullRows.length + emptyRows.length;
  console.log(`  ${need} domain rows need backfill (${nullRows.length} null, ${emptyRows.length} empty)`);
  if (need === 0) {
    console.log("  (all rows already have domain_kind set; nothing to do)");
  } else {
    // A filtered PATCH updates every matching row server-side in one request (no
    // chunking / command-length concern). Sets domain_kind ONLY — record_status is
    // never touched (Rule #1).
    if (nullRows.length > 0) await patch("/domains?domain_kind=is.null", { domain_kind: DEFAULT_KIND });
    if (emptyRows.length > 0) await patch("/domains?domain_kind=eq.", { domain_kind: DEFAULT_KIND });
    console.log(`  + backfilled ${need} rows to '${DEFAULT_KIND}'`);
  }

  // ----- Step 3: verify -----
  console.log("\nStep 3: verify");
  const all = await get("/domains?select=domain_kind");
  const counts = new Map<string, number>();
  for (const r of all) {
    const k = r.domain_kind === null ? "(null)" : r.domain_kind === "" ? "(empty)" : r.domain_kind;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  console.log(`  ${all.length} total domains, by domain_kind:`);
  for (const [k, n] of [...counts.entries()].sort()) console.log(`    ${k}: ${n}`);

  const badCount = all.filter((r: any) => r.domain_kind === null || r.domain_kind === "").length;
  const outOfEnum = all.filter((r: any) => r.domain_kind && !ENUM.includes(r.domain_kind));
  if (badCount > 0) {
    console.log(`  WARN ${badCount} rows still null/empty - investigate`);
  } else if (outOfEnum.length > 0) {
    console.log(`  WARN ${outOfEnum.length} rows with a value outside the enum - investigate`);
  } else {
    console.log(`  OK every domain has a valid domain_kind (no null/empty, all in enum)`);
  }

  // Assert the field metadata matches §1 exactly (NOT NULL + enum + default); fail loudly.
  const fieldNow = await get(
    "/fields?table_name=eq.domains&field_name=eq.domain_kind&select=field_name,format,enum_values,default_value,is_nullable"
  );
  const f = fieldNow[0] ?? null;
  console.log(`\n  field metadata: ${JSON.stringify(f)}`);
  const problems: string[] = [];
  if (!f) {
    problems.push("field row missing");
  } else {
    if (f.format !== "enum") problems.push(`format=${f.format} (want enum)`);
    if (f.is_nullable !== false) problems.push(`is_nullable=${f.is_nullable} (want false / NOT NULL)`);
    if (f.default_value !== DEFAULT_KIND) problems.push(`default_value=${JSON.stringify(f.default_value)} (want ${DEFAULT_KIND})`);
    const ev = Array.isArray(f.enum_values) ? f.enum_values : [];
    if (ev.length !== ENUM.length || !ENUM.every((v) => ev.includes(v))) {
      problems.push(`enum_values=${JSON.stringify(ev)} (want ${JSON.stringify(ENUM)})`);
    }
  }
  if (badCount > 0) problems.push(`${badCount} rows null/empty`);
  if (outOfEnum.length > 0) problems.push(`${outOfEnum.length} rows out of enum`);
  if (problems.length > 0) throw new Error("§1 verification FAILED: " + problems.join("; "));
  console.log("\n  OK §1 complete: domains.domain_kind enum, NOT NULL, default established_market, every row valid.");
}

await main();
