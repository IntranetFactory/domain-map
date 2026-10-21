#!/usr/bin/env bun
// IPAAS state-driven Validate execute pass (2026-06-07).
//
// IPAAS (domain id 36) is UNBUILT: 0 domain_modules, 0 capability_domains
// (B1A-BUILD / B1B-S1). Per the run contract, the BUILD is SURFACED, not
// scaffolded, and the whole M1-gated cascade (B1B-S2..S11) is LEFT. This
// loader executes ONLY the additive/corrective items that stand independent
// of modules existing:
//
//   1. entity_type PATCH on the 6 IPAAS masters (unclassified -> Rule #12 enum).
//   2. Catalog UX (Rule #20): author buyer-voice catalog_tagline +
//      catalog_description on the IPAAS domain row (both currently empty).
//      No module-grain copy: 0 modules exist. The stale "surface-before-write"
//      gate (B1B-S2 / B2-S2) is overridden per the run contract / Rule #20 A4.
//   3. Generic-synonym aliases (B11 / B1B-S6): industry-generic terms only.
//      Vendor product terminology (Boomi "atom", Workato "recipe/job", MuleSoft
//      "flow/DataWeave", Zapier "Zap") is NOT written (Rule #18: no vendor/
//      product names in alias text without an industry_id). Those stay deferred.
//
// Idempotent: reads live state before each write, inserts/patches only what is
// missing. All writes land at record_status='new' (Rule #1). No DELETE, no
// overwrite of a non-empty value, no record_status flip.

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

const get = (path: string) => call({ method: "GET", path });

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    out.push(...(await call({ method: "POST", path, body: slice })));
  }
  return out;
}

const DOMAIN_ID = 36;
const MASTER_IDS = [469, 470, 471, 472, 473, 474];

// ============================================================
// 1. entity_type PATCH (Rule #12 enum)
// ============================================================
// Classification is deterministic from each master's description:
//   469 integration_recipes      -> operational_workflow (versioned artifact:
//                                    draft -> tested -> published -> deprecated)
//   470 integration_runs         -> operational_workflow (in-flight state machine:
//                                    queued -> running -> retrying -> succeeded/failed
//                                    -> archived; permission-gated publish transitions)
//   471 integration_connectors   -> operational_workflow (credential lifecycle:
//                                    configured -> authenticated -> active ->
//                                    credential_expired -> rotated -> revoked)
//   472 webhook_subscriptions    -> operational_workflow (configured -> active ->
//                                    degraded -> disabled)
//   473 integration_triggers     -> catalog (config-shape event source: scheduled/
//                                    webhook/db-change/queue with polling/push config;
//                                    no workflow, Rule #12 structural exemption)
//   474 integration_data_mappings-> operational_workflow (versioned transform rule:
//                                    draft -> validated -> published)
const entityTypeMap: Record<number, string> = {
  469: "operational_workflow",
  470: "operational_workflow",
  471: "operational_workflow",
  472: "operational_workflow",
  473: "catalog",
  474: "operational_workflow",
};

async function patchEntityTypes(): Promise<number> {
  const ids = Object.keys(entityTypeMap).map(Number);
  const live = await get(`/data_objects?id=in.(${ids.join(",")})&select=id,entity_type`);
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = entityTypeMap[id];
    if (!target) continue;
    if (r.entity_type === target) continue; // already correct
    if (r.entity_type !== "unclassified") {
      console.log(`  SKIP ${id}: entity_type='${r.entity_type}' already typed (not unclassified)`);
      continue;
    }
    await call({ method: "PATCH", path: `/data_objects?id=eq.${id}`, body: { entity_type: target } });
    patched++;
    console.log(`  PATCH ${id} entity_type -> ${target}`);
  }
  return patched;
}

// ============================================================
// 2. Catalog UX (Rule #20) on the domain row
// ============================================================
// Buyer voice (workflow + value), no vendor/product names, no em-dash,
// American English, no handoffs/market-position language.
const IPAAS_TAGLINE =
  "Connect your cloud apps, on-premise systems, and event streams and keep data flowing between them without writing custom integration code.";

const IPAAS_DESCRIPTION =
  "An integration platform lets teams build, run, and monitor the automated flows that move data between business applications, databases, and event streams. Instead of hand-coding and maintaining brittle point-to-point integrations, builders assemble flows from a library of prebuilt application connectors, map fields from one system to another, and set the triggers and schedules that decide when each flow runs.\n\n" +
  "Once a flow is published it runs on its own: it picks up new records and events, transforms them to match the target system, and delivers them with retry logic that recovers from transient failures. Every execution is captured as a run record with status, timing, and error detail, so teams can see exactly what moved, what failed, and why, and can replay or fix a flow with full audit history.\n\n" +
  "Webhook subscriptions let outside systems push events in the moment they happen, and managed credentials with rotation keep every connection secure as it ages. The result is faster delivery of new integrations, fewer manual data-entry tasks, and reliable, observable data movement across the whole application landscape.";

async function patchCatalogUx(): Promise<number> {
  const [dom] = await get(`/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`);
  if (!dom) throw new Error("IPAAS domain row not found");
  const body: Row = {};
  if (!dom.catalog_tagline || String(dom.catalog_tagline).trim() === "") {
    body.catalog_tagline = IPAAS_TAGLINE;
  } else {
    console.log("  SKIP catalog_tagline: already populated");
  }
  if (!dom.catalog_description || String(dom.catalog_description).trim() === "") {
    body.catalog_description = IPAAS_DESCRIPTION;
  } else {
    console.log("  SKIP catalog_description: already populated");
  }
  if (Object.keys(body).length === 0) return 0;
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body });
  console.log(`  PATCH domain ${DOMAIN_ID} catalog UX: ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ============================================================
// 3. Generic-synonym aliases (B11). No vendor product names.
// ============================================================
// Industry-generic integration vocabulary only. Vendor-keyed terms (Boomi atom/
// process, Workato recipe/job/connection, MuleSoft flow/DataWeave, Zapier Zap/task,
// Make.com scenario, SnapLogic Snap/pipeline) are deferred per Rule #18 (need an
// industry_id to carry a vendor synonym). These plain-English synonyms are safe.
const aliasSpecs: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 469, alias_name: "Integration Flows" },
  { data_object_id: 469, alias_name: "Integration Workflows" },
  { data_object_id: 470, alias_name: "Integration Jobs" },
  { data_object_id: 470, alias_name: "Integration Executions" },
  { data_object_id: 471, alias_name: "Connectors" },
  { data_object_id: 471, alias_name: "Application Connectors" },
  { data_object_id: 472, alias_name: "Event Subscriptions" },
  { data_object_id: 472, alias_name: "Webhooks" },
  { data_object_id: 473, alias_name: "Triggers" },
  { data_object_id: 473, alias_name: "Event Triggers" },
  { data_object_id: 474, alias_name: "Field Mappings" },
  { data_object_id: 474, alias_name: "Data Transformations" },
];

async function insertAliases(): Promise<number> {
  const ids = [...new Set(aliasSpecs.map(a => a.data_object_id))];
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids.join(",")})&select=data_object_id,alias_name`,
  );
  const have = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const missing = aliasSpecs
    .filter(a => !have.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`))
    .map(a => ({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "synonym",
      is_preferred: false,
    }));
  if (missing.length === 0) {
    console.log("  aliases: all present, nothing to insert");
    return 0;
  }
  await insert("/data_object_aliases", missing);
  console.log(`  inserted ${missing.length} alias rows`);
  return missing.length;
}

// ============================================================
// Run
// ============================================================
console.log("== IPAAS state-driven execute 2026-06-07 ==");
console.log("\n[1] entity_type PATCH");
const nEntity = await patchEntityTypes();
console.log("\n[2] catalog UX");
const nCatalog = await patchCatalogUx();
console.log("\n[3] aliases (generic synonyms only)");
const nAlias = await insertAliases();

console.log("\n== Summary ==");
console.log(`entity_type patched: ${nEntity}`);
console.log(`catalog UX fields written: ${nCatalog}`);
console.log(`aliases inserted: ${nAlias}`);

// Verify
console.log("\n== Verify ==");
const verifyEnt = await get(
  `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type&order=id`,
);
for (const r of verifyEnt) console.log(`  ${r.id} ${r.data_object_name}: ${r.entity_type}`);
const [vdom] = await get(`/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`);
console.log(`  catalog_tagline empty? ${!vdom.catalog_tagline}`);
console.log(`  catalog_description empty? ${!vdom.catalog_description}`);
const valias = await get(
  `/data_object_aliases?data_object_id=in.(${MASTER_IDS.join(",")})&select=data_object_id,alias_name&order=data_object_id`,
);
console.log(`  total IPAAS master aliases now: ${valias.length}`);

console.log("\nDone.");
