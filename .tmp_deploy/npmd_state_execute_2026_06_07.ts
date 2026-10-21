#!/usr/bin/env bun
// NPMD state-driven Validate execute pass (2026-06-07).
// Executes the additive/corrective open items from audits/NPMD/state.yaml that do
// NOT depend on the (user-owned) B2-MOD-SPLIT module build. NPMD is UNBUILT
// (0 domain_modules), so module-dependent cascade (M1, capabilities-on-modules,
// vendors/solutions, source_domain_module_id backfill, roles) is LEFT for the build.
// Master-level and domain-level work that needs no modules is executed here:
//   1. entity_type PATCH on the 8 NPMD masters (unclassified -> Rule #12 enum). (B13)
//   2. event_category backfill on the 9 NPMD trigger_events (empty -> Rule #13 enum). (B1A-EVT)
//   3. Catalog UX (Rule #20): author buyer-voice catalog_tagline + catalog_description
//      on the NPMD domain row (both currently empty). No module copy: 0 modules.
//   4. B6 intra-domain master-to-master data_object_relationships (6 audit-specified edges).
//   5. B9 two missing handoff rows for trigger events 657 (network_path.degraded ->
//      AIOPS + ITSM) and 661 (network_interface.flapping -> ITSM). source_domain_module_id
//      stays NULL (NPMD unbuilt).
//   6. B11 generic-synonym aliases on the non-self-explanatory masters
//      (industry/standard synonyms only; no vendor product names; alias_type='synonym').
//
// Idempotent: reads live state before each write, inserts/patches only what is missing.
// All writes land at record_status='new' (Rule #1). No DELETE, no overwrite of a
// non-empty value, no record_status flip.

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

const DOMAIN_ID = 82;
const MASTERS = [538, 539, 540, 541, 542, 543, 544, 545];

// ============================================================
// 1. entity_type PATCH (Rule #12 enum). Deterministic from descriptions.
// ============================================================
const entityTypeMap: Record<number, string> = {
  538: "operational_record",   // network_flow_records: raw captured observation unit, write-once stream
  539: "operational_record",   // network_paths: path trace result, write-once observation
  540: "operational_record",   // network_performance_metrics: time-series samples, write-once stream
  541: "operational_workflow", // network_performance_alerts: open->acknowledged->resolved->closed workflow
  542: "operational_record",   // network_interfaces: discovered/config interface record, no workflow
  543: "operational_record",   // saas_application_performance: synthetic/RUM samples, write-once stream
  544: "operational_record",   // network_topology_snapshots: periodic capture snapshot, write-once
  545: "computed",             // network_baseline_thresholds: derived median/p95 baseline profile
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
// 2. event_category backfill (Rule #13 enum: lifecycle|state_change|threshold|signal)
// ============================================================
const eventCategoryMap: Record<number, string> = {
  656: "signal",        // network_flow_record.anomalous_pattern: anomaly-detection signal
  657: "state_change",  // network_path.degraded: path enters a degraded state
  658: "threshold",     // network_performance_metric.threshold_breached: threshold crossing
  659: "lifecycle",     // network_performance_alert.raised: alert entity entering its lifecycle
  660: "state_change",  // network_interface.down: interface state transition
  661: "state_change",  // network_interface.flapping: interface state transition
  662: "state_change",  // saas_application_performance.degraded: degraded state
  663: "state_change",  // network_topology_snapshot.updated: topology state change
  664: "state_change",  // network_baseline_threshold.recalculated: baseline state change
};

async function patchEventCategories(): Promise<number> {
  const ids = Object.keys(eventCategoryMap).map(Number);
  const live = await get(`/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`);
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = eventCategoryMap[id];
    if (!target) continue;
    const cur = r.event_category;
    if (cur === target) continue;
    if (cur && String(cur).trim() !== "") {
      console.log(`  SKIP ${id}: event_category='${cur}' already set (not empty)`);
      continue;
    }
    await call({ method: "PATCH", path: `/trigger_events?id=eq.${id}`, body: { event_category: target } });
    patched++;
    console.log(`  PATCH ${id} (${r.event_name}) event_category -> ${target}`);
  }
  return patched;
}

// ============================================================
// 3. Catalog UX (Rule #20) on the domain row. Buyer voice, no vendor names, no em-dash.
// ============================================================
const NPMD_TAGLINE =
  "See how traffic flows, where paths break, and how your SaaS and internet performance look to real users, so you catch network trouble before it reaches the help desk.";

const NPMD_DESCRIPTION =
  "Network performance monitoring and diagnostics gives operations teams a live picture of how the network is behaving end to end. It collects flow records and path traces, samples latency, jitter, loss, and throughput across links and application paths, and learns a baseline for what normal looks like so that real problems stand out from everyday noise.\n\n" +
  "When a metric crosses a threshold or a path degrades, the platform raises a network-specific alert with the affected path or flow and the baseline it broke, and walks that alert through acknowledge, resolve, and close. Topology snapshots and interface state keep the map of the network current, so an engineer can move from a symptom to the segment or device at fault in minutes instead of hours.\n\n" +
  "The same lens reaches past the edge of the corporate network. Synthetic and real-user checks measure how reachable and responsive SaaS applications are from the locations, networks, and carriers your people actually use, exposing internet and last-mile trouble that lives outside your own gear. Alerts open tickets in service management, anomalies feed event correlation and observability, and topology updates reconcile with the configuration database, so network insight drives the rest of the operations toolchain rather than sitting in a silo.";

async function patchCatalogUx(): Promise<number> {
  const [dom] = await get(`/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`);
  if (!dom) throw new Error("NPMD domain row not found");
  const body: Row = {};
  if (!dom.catalog_tagline || String(dom.catalog_tagline).trim() === "") {
    body.catalog_tagline = NPMD_TAGLINE;
  } else {
    console.log("  SKIP catalog_tagline: already populated");
  }
  if (!dom.catalog_description || String(dom.catalog_description).trim() === "") {
    body.catalog_description = NPMD_DESCRIPTION;
  } else {
    console.log("  SKIP catalog_description: already populated");
  }
  if (Object.keys(body).length === 0) return 0;
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body });
  console.log(`  PATCH domain ${DOMAIN_ID} catalog UX: ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ============================================================
// 4. B6 intra-domain master-to-master data_object_relationships (6 edges)
// ============================================================
type RelSpec = {
  data_object_id: number;
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: string; // cardinality
  relationship_kind: string;
  is_required: boolean;
  owner_side: string;
  label: string;
};
// Cardinality convention in this catalog: relationship_type reads source -> target
// and the enum only admits one_to_one | one_to_many | many_to_many (no many_to_one).
// The 1500+ existing one_to_many rows are authored parent-first (the "one" is the
// source). The three child->parent edges below are therefore oriented parent-first
// so the verb reads naturally and the cardinality stays valid; owner_side points at
// the FK-bearing child (target). The two M:N edges and the path-trace M:N keep their
// natural reading.
const relSpecs: RelSpec[] = [
  { data_object_id: 539, related_data_object_id: 542, relationship_verb: "traverses", inverse_verb: "is_traversed_by", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", label: "network_paths traverses network_interfaces" },
  { data_object_id: 540, related_data_object_id: 541, relationship_verb: "raises", inverse_verb: "raised_from", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target", label: "network_performance_metrics raises network_performance_alerts" },
  { data_object_id: 538, related_data_object_id: 540, relationship_verb: "feeds", inverse_verb: "derived_from", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target", label: "network_flow_records feeds network_performance_metrics" },
  { data_object_id: 540, related_data_object_id: 545, relationship_verb: "is_baselined_by", inverse_verb: "applies_to", relationship_type: "one_to_one", relationship_kind: "reference", is_required: false, owner_side: "target", label: "network_performance_metrics is_baselined_by network_baseline_thresholds" },
  { data_object_id: 544, related_data_object_id: 542, relationship_verb: "contains", inverse_verb: "is_contained_in", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", label: "network_topology_snapshots contains network_interfaces" },
  { data_object_id: 543, related_data_object_id: 539, relationship_verb: "correlated_with", inverse_verb: "correlated_with", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", label: "saas_application_performance correlated_with network_paths" },
];

async function insertRelationships(): Promise<number> {
  const existing = await get(
    `/data_object_relationships?data_object_id=in.(${MASTERS.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const have = new Set(
    existing.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );
  const missing = relSpecs
    .filter(s => !have.has(`${s.data_object_id}|${s.related_data_object_id}|${s.relationship_verb}`))
    .map(({ label, ...rest }) => rest);
  if (missing.length === 0) {
    console.log("  data_object_relationships (intra-domain): all present, nothing to insert");
    return 0;
  }
  await insert("/data_object_relationships", missing);
  console.log(`  inserted ${missing.length} intra-domain data_object_relationships rows`);
  return missing.length;
}

// ============================================================
// 5. B9 missing handoffs for trigger events 657 and 661
//    source_domain_module_id stays NULL (NPMD is unbuilt).
// ============================================================
type HandoffSpec = {
  source_domain_id: number;
  target_domain_id: number;
  data_object_id: number;
  trigger_event_id: number;
  integration_pattern: string;
  friction_level: string;
  description: string;
};
const handoffSpecs: HandoffSpec[] = [
  { source_domain_id: 82, target_domain_id: 6, data_object_id: 539, trigger_event_id: 657, integration_pattern: "event_stream", friction_level: "low", description: "Degraded network paths stream to AIOps for correlation with other operational signals." },
  { source_domain_id: 82, target_domain_id: 1, data_object_id: 47, trigger_event_id: 657, integration_pattern: "api_call", friction_level: "medium", description: "Sustained path degradation opens an ITSM incident for the affected service." },
  { source_domain_id: 82, target_domain_id: 1, data_object_id: 47, trigger_event_id: 661, integration_pattern: "api_call", friction_level: "medium", description: "A flapping interface opens an ITSM incident for investigation." },
];

async function insertHandoffs(): Promise<number> {
  const existing = await get(
    `/handoffs?source_domain_id=eq.${DOMAIN_ID}&select=source_domain_id,target_domain_id,data_object_id,trigger_event_id`,
  );
  const have = new Set(
    existing.map(r => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event_id}`),
  );
  const missing = handoffSpecs.filter(
    s => !have.has(`${s.source_domain_id}|${s.target_domain_id}|${s.data_object_id}|${s.trigger_event_id}`),
  );
  if (missing.length === 0) {
    console.log("  handoffs (B9): all present, nothing to insert");
    return 0;
  }
  await insert("/handoffs", missing);
  console.log(`  inserted ${missing.length} handoff rows`);
  return missing.length;
}

// ============================================================
// 6. B11 generic-synonym aliases. Industry/standard synonyms only.
//    NetFlow/IPFIX/sFlow are open industry/IETF standards, not vendor products.
// ============================================================
const aliasSpecs: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 538, alias_name: "Flow Records" },
  { data_object_id: 538, alias_name: "NetFlow Records" },
  { data_object_id: 538, alias_name: "IPFIX Records" },
  { data_object_id: 538, alias_name: "sFlow Samples" },
  { data_object_id: 539, alias_name: "Network Paths" },
  { data_object_id: 539, alias_name: "Path Traces" },
  { data_object_id: 539, alias_name: "Hop Traces" },
  { data_object_id: 540, alias_name: "Network Telemetry" },
  { data_object_id: 540, alias_name: "Network KPIs" },
  { data_object_id: 543, alias_name: "SaaS Performance" },
  { data_object_id: 543, alias_name: "Internet Performance" },
  { data_object_id: 544, alias_name: "Network Maps" },
  { data_object_id: 544, alias_name: "Topology Maps" },
  { data_object_id: 545, alias_name: "Performance Baselines" },
  { data_object_id: 545, alias_name: "Dynamic Thresholds" },
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
console.log("== NPMD state-driven execute 2026-06-07 ==");
console.log("\n[1] entity_type PATCH");
const nEntity = await patchEntityTypes();
console.log("\n[2] event_category backfill");
const nEvent = await patchEventCategories();
console.log("\n[3] catalog UX");
const nCatalog = await patchCatalogUx();
console.log("\n[4] intra-domain relationships (B6)");
const nRel = await insertRelationships();
console.log("\n[5] handoffs (B9)");
const nHandoff = await insertHandoffs();
console.log("\n[6] aliases (B11)");
const nAlias = await insertAliases();

console.log("\n== Summary ==");
console.log(`entity_type patched: ${nEntity}`);
console.log(`event_category patched: ${nEvent}`);
console.log(`catalog UX fields written: ${nCatalog}`);
console.log(`intra-domain relationships inserted: ${nRel}`);
console.log(`handoffs inserted: ${nHandoff}`);
console.log(`aliases inserted: ${nAlias}`);

// Verify
console.log("\n== Verify ==");
const verifyEnt = await get(
  `/data_objects?id=in.(${MASTERS.join(",")})&select=id,data_object_name,entity_type&order=id`,
);
for (const r of verifyEnt) console.log(`  ${r.id} ${r.data_object_name}: ${r.entity_type}`);
const verifyEvt = await get(
  "/trigger_events?id=in.(656,657,658,659,660,661,662,663,664)&select=id,event_name,event_category&order=id",
);
const emptyEvt = verifyEvt.filter(r => !r.event_category || String(r.event_category).trim() === "");
console.log(`  trigger_events still empty event_category: ${emptyEvt.length}`);
const [vdom] = await get(`/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`);
console.log(`  catalog_tagline empty? ${!vdom.catalog_tagline}`);
console.log(`  catalog_description empty? ${!vdom.catalog_description}`);
const vrel = await get(
  `/data_object_relationships?data_object_id=in.(${MASTERS.join(",")})&related_data_object_id=in.(${MASTERS.join(",")})&select=id`,
);
console.log(`  intra-domain master-to-master relationships now: ${vrel.length}`);
const vho = await get(
  `/handoffs?source_domain_id=eq.${DOMAIN_ID}&select=id,trigger_event_id&order=id`,
);
console.log(`  total NPMD outbound handoffs now: ${vho.length}`);
const valias = await get(
  `/data_object_aliases?data_object_id=in.(${MASTERS.join(",")})&select=id`,
);
console.log(`  total NPMD master aliases now: ${valias.length}`);

console.log("\nDone.");
