#!/usr/bin/env bun
// PROC-MIN state-driven audit execute (2026-06-07).
// Additive/corrective only; everything lands at record_status='new' (or omitted to take DB default).
// Idempotent: reads live state before each write, inserts only missing, PATCHes only stale values.
//
// EXECUTE set (per domain-map-analyst Rule #21 Validate mode):
//   1. entity_type PATCH on the 6 PROC-MIN masters (currently 'unclassified' -> Rule #12 enum).
//   2. Catalog UX (Rule #20): author + write catalog_tagline + catalog_description on domain row 40
//      (both currently empty; NEVER overwrite a non-empty value).
//   3. B11 aliases: insert clearly-enumerated generic synonyms (alias_type='synonym') on the 6 masters.
//
// Run from project root c:/dev/domain-map:  bun run ".tmp_deploy/fix_proc_min_audit_2026_06_07.ts"

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

const DOMAIN_ID = 40;

// Master id -> target entity_type (Rule #12). Deterministic from description + drafted lifecycle.
const ENTITY_TYPES: Record<number, string> = {
  579: "operational_workflow", // event_logs: real ingestion lifecycle uploaded->ingested->validated->available->archived
  580: "computed",             // discovered_process_models: algorithmic mining output
  581: "computed",             // process_conformance_results: diagnostic from conformance checking
  582: "computed",             // process_variants: discovered execution-pattern cohorts
  583: "operational_workflow", // process_bottleneck_findings: finding with remediation workflow
  584: "operational_workflow", // business_rules_extracted: mined rule with review/codify human workflow
};

// B11 generic synonyms (alias_type='synonym', industry_id null). No vendor product names (Rule #18).
const ALIASES: Array<{ data_object_id: number; alias_name: string }> = [
  { data_object_id: 579, alias_name: "Activity Log" },
  { data_object_id: 579, alias_name: "Event Stream" },
  { data_object_id: 579, alias_name: "Process Case Log" },
  { data_object_id: 580, alias_name: "As-Is Process Model" },
  { data_object_id: 580, alias_name: "Mined Process Model" },
  { data_object_id: 581, alias_name: "Conformance Check" },
  { data_object_id: 581, alias_name: "Conformance Diagnostic" },
  { data_object_id: 582, alias_name: "Case Variant" },
  { data_object_id: 582, alias_name: "Execution Path Variant" },
  { data_object_id: 583, alias_name: "Bottleneck Insight" },
  { data_object_id: 583, alias_name: "Process Bottleneck" },
  { data_object_id: 584, alias_name: "Mined Business Rule" },
  { data_object_id: 584, alias_name: "Inferred Business Rule" },
];

// Rule #20 catalog UX copy. Buyer voice, workflow + value, no vendor names, no em-dash, American English.
const CATALOG_TAGLINE =
  "See how your business processes actually run: pull event logs from your ERP, CRM, and case systems, " +
  "discover the real workflow, and pinpoint the bottlenecks, deviations, and rework that slow it down.";

const CATALOG_DESCRIPTION =
  "Process Mining turns the timestamps your systems already record into an honest picture of how work " +
  "really flows. Pull event logs out of the source systems, validate them, and let discovery algorithms " +
  "reconstruct the actual end-to-end process instead of the one drawn on a whiteboard.\n\n" +
  "From there the work is to find what to fix. Conformance checking compares the real flow against the " +
  "reference model and flags every deviation, missing step, and out-of-order trace, with severity and " +
  "root cause, so audit and operations teams can act on it. Variant analysis groups the distinct paths a " +
  "process takes and shows which ones cost the most time, while bottleneck findings surface the high-wait " +
  "steps and queue points that throttle throughput.\n\n" +
  "The output feeds the rest of the operation: discovered models and detected deviations flow to process " +
  "design and automation teams, and the control logic mined from the logs is routed for analyst review " +
  "and codification. The result is a defensible, evidence-based view of where each process leaks value " +
  "and what it is worth to fix.";

function assertNoEmDash(label: string, text: string): void {
  if (text.includes("—")) {
    throw new Error(`${label} contains a U+2014 em-dash; rewrite before loading.`);
  }
}

async function main() {
  // ---- 1. entity_type PATCH (corrective; only touches rows still 'unclassified') ----
  console.log("== 1. entity_type classification ==");
  const masters = await get(
    `/data_objects?id=in.(${Object.keys(ENTITY_TYPES).join(",")})&select=id,data_object_name,entity_type`,
  );
  let etPatched = 0;
  for (const m of masters) {
    const id = Number(m.id);
    const target = ENTITY_TYPES[id];
    if (m.entity_type === target) {
      console.log(`  ${m.data_object_name}: already ${target}, skip`);
      continue;
    }
    if (m.entity_type !== "unclassified") {
      console.log(
        `  ${m.data_object_name}: current='${m.entity_type}' (not unclassified) -> SKIP (no overwrite of classified value)`,
      );
      continue;
    }
    await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
    console.log(`  ${m.data_object_name}: unclassified -> ${target}`);
    etPatched++;
  }
  console.log(`  entity_type PATCHed: ${etPatched}`);

  // ---- 2. Catalog UX (Rule #20); never overwrite a non-empty value ----
  console.log("== 2. catalog UX (domain row 40) ==");
  assertNoEmDash("catalog_tagline", CATALOG_TAGLINE);
  assertNoEmDash("catalog_description", CATALOG_DESCRIPTION);
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!dom) throw new Error("PROC-MIN domain row 40 not found");
  const uxBody: Row = {};
  if (!String(dom.catalog_tagline ?? "").trim()) uxBody.catalog_tagline = CATALOG_TAGLINE;
  else console.log("  catalog_tagline already populated -> SKIP (no overwrite)");
  if (!String(dom.catalog_description ?? "").trim()) uxBody.catalog_description = CATALOG_DESCRIPTION;
  else console.log("  catalog_description already populated -> SKIP (no overwrite)");
  let uxWrote = 0;
  if (Object.keys(uxBody).length > 0) {
    await patch(`/domains?id=eq.${DOMAIN_ID}`, uxBody);
    uxWrote = Object.keys(uxBody).length;
    console.log(`  wrote ${Object.keys(uxBody).join(", ")}`);
  }
  console.log(`  catalog UX fields written: ${uxWrote}`);

  // ---- 3. B11 aliases (insert missing generic synonyms only) ----
  console.log("== 3. master aliases (B11) ==");
  for (const a of ALIASES) assertNoEmDash(`alias '${a.alias_name}'`, a.alias_name);
  const doIds = [...new Set(ALIASES.map(a => a.data_object_id))].join(",");
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${doIds})&select=data_object_id,alias_name`,
  );
  const existingKey = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const missing = ALIASES.filter(
    a => !existingKey.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  ).map(a => ({ data_object_id: a.data_object_id, alias_name: a.alias_name, alias_type: "synonym" }));
  if (missing.length > 0) {
    await insert("/data_object_aliases", missing);
  }
  console.log(`  aliases inserted: ${missing.length} (${existing.length} already present)`);

  // ---- Summary ----
  console.log("\n== SUMMARY ==");
  console.log(`entity_type PATCHed:        ${etPatched}`);
  console.log(`catalog UX fields written:  ${uxWrote}`);
  console.log(`aliases inserted:           ${missing.length}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
