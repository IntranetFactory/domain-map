#!/usr/bin/env bun
// State-driven DI (Data Integration, domain_id=89) Validate-mode execute pass, 2026-06-07.
// Three additive/corrective EXECUTE items (all record_status defaults to 'new'):
//   1. entity_type PATCH: the 7 DI masters from 'unclassified' -> 'operational_workflow' (Rule #12 / B13).
//   2. Catalog UX (Rule #20): backfill DI domains.catalog_tagline + catalog_description (both empty).
//   3. Aliases (B11): insert generic synonyms for 5 DI masters (alias_type='synonym').
//
// Idempotent: read live first, write only what is missing/empty. No DELETE, no non-empty overwrite.
// No `notes` writes. No vendor/product names in catalog copy or aliases. No em-dashes. American English.

import { $ } from "bun";

$.throws(false);

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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
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

const DI_DOMAIN_ID = 89;
const DI_MASTER_IDS = [434, 435, 436, 437, 438, 439, 440];

// ============================================================
// 1. entity_type PATCH (Rule #12 / B13): all 7 DI masters are
//    workflow-bearing (each has a clear lifecycle state machine
//    per state.yaml B1B-B12), so all classify as operational_workflow.
// ============================================================
async function fixEntityType(): Promise<number> {
  const masters = await get(
    `/data_objects?id=in.(${DI_MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const toFix = masters.filter(m => m.entity_type === "unclassified" || m.entity_type == null);
  console.log(`\n[1] entity_type: ${toFix.length} of ${masters.length} masters need classification.`);
  for (const m of toFix) {
    await patch(`/data_objects?id=eq.${m.id}`, { entity_type: "operational_workflow" });
    console.log(`    PATCH ${m.data_object_name} (id=${m.id}) -> operational_workflow`);
  }
  return toFix.length;
}

// ============================================================
// 2. Catalog UX (Rule #20): backfill empty catalog_tagline +
//    catalog_description on the DI domain row. Buyer voice
//    (workflow + value), no vendor names, no em-dash. Backfill
//    only when empty; never overwrite a non-empty value.
// ============================================================
const CATALOG_TAGLINE =
  "Move data from every source system into your warehouse and lakehouse, on schedule and ready to analyze.";

const CATALOG_DESCRIPTION =
  "Your analytics are only as fresh as the pipelines feeding them. This is where you connect to the source systems your business runs on, pull their data in batch or as a continuous change stream, reshape it into the models your analysts query, and land it in the warehouse or lakehouse where it gets used. " +
  "You configure a source once, pick what to sync and how often, and the platform keeps the destination current, retrying on failure, tracking each run, and adapting when an upstream schema changes so a new column does not silently break a downstream report. " +
  "The payoff is trustworthy, timely data without a standing team of engineers hand-coding extracts. Pipelines run unattended, failures surface as alerts you can act on, and the lineage of every load is recorded so you can prove where a number came from and how stale it is.";

async function fixCatalogUx(): Promise<boolean> {
  const [domain] = await get(
    `/domains?id=eq.${DI_DOMAIN_ID}&select=id,domain_code,catalog_tagline,catalog_description`,
  );
  if (!domain) throw new Error("DI domain row not found");
  const taglineEmpty = !domain.catalog_tagline || String(domain.catalog_tagline).trim() === "";
  const descEmpty =
    !domain.catalog_description || String(domain.catalog_description).trim() === "";
  console.log(
    `\n[2] catalog UX: tagline ${taglineEmpty ? "EMPTY" : "present (skip)"}, description ${descEmpty ? "EMPTY" : "present (skip)"}.`,
  );
  const body: Row = {};
  if (taglineEmpty) body.catalog_tagline = CATALOG_TAGLINE;
  if (descEmpty) body.catalog_description = CATALOG_DESCRIPTION;
  if (Object.keys(body).length === 0) {
    console.log("    nothing to backfill.");
    return false;
  }
  await patch(`/domains?id=eq.${DI_DOMAIN_ID}`, body);
  console.log(`    PATCH DI domain row with ${Object.keys(body).join(" + ")}`);
  return true;
}

// ============================================================
// 3. Aliases (B11): generic cross-vendor synonyms (no product
//    names per Rule #18). alias_type='synonym'. Idempotent on
//    (data_object_id, alias_name).
// ============================================================
type AliasSpec = { data_object_id: number; alias_name: string };
const ALIASES: AliasSpec[] = [
  // pipeline_runs (434)
  { data_object_id: 434, alias_name: "sync_jobs" },
  { data_object_id: 434, alias_name: "connector_runs" },
  // source_connectors (435)
  { data_object_id: 435, alias_name: "sources" },
  { data_object_id: 435, alias_name: "source_endpoints" },
  // sink_connectors (436)
  { data_object_id: 436, alias_name: "destinations" },
  { data_object_id: 436, alias_name: "target_endpoints" },
  // transformation_jobs (437)
  { data_object_id: 437, alias_name: "transformation_runs" },
  // change_data_capture_streams (439)
  { data_object_id: 439, alias_name: "replication_streams" },
  { data_object_id: 439, alias_name: "change_streams" },
];

async function fixAliases(): Promise<number> {
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${DI_MASTER_IDS.join(",")})&select=data_object_id,alias_name`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.data_object_id}|${r.alias_name}`),
  );
  const missing = ALIASES.filter(
    a => !existingKeys.has(`${a.data_object_id}|${a.alias_name}`),
  ).map(a => ({
    data_object_id: a.data_object_id,
    alias_name: a.alias_name,
    alias_type: "synonym",
    is_preferred: false,
  }));
  console.log(
    `\n[3] aliases: ${missing.length} of ${ALIASES.length} synonyms missing (${existing.length} already present on DI masters).`,
  );
  if (missing.length > 0) {
    await insert("/data_object_aliases", missing);
    for (const a of missing) console.log(`    INSERT ${a.alias_name} -> data_object ${a.data_object_id}`);
  }
  return missing.length;
}

async function main() {
  console.log("=== DI state-driven execute pass 2026-06-07 (domain_id=89) ===");
  const etCount = await fixEntityType();
  const uxWritten = await fixCatalogUx();
  const aliasCount = await fixAliases();

  console.log("\n=== Summary ===");
  console.log(`  entity_type PATCHed: ${etCount}`);
  console.log(`  catalog UX backfilled: ${uxWritten ? "yes (tagline + description)" : "no"}`);
  console.log(`  aliases inserted: ${aliasCount}`);
  console.log("\n  UI links:");
  console.log("    https://tests.semantius.app/domain_map/data_objects");
  console.log("    https://tests.semantius.app/domain_map/domains?id=eq.89");
  console.log("    https://tests.semantius.app/domain_map/data_object_aliases");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
