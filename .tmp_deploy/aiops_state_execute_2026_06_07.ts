#!/usr/bin/env bun
// AIOPS state-driven Validate execute pass (2026-06-07).
// Executes ONLY the additive/corrective open items from audits/AIOPS/state.yaml
// that are not gated on the unbuilt-domain build (B1B-M1) or a b2 user decision:
//   1. entity_type PATCH on the 7 AIOPS masters (unclassified -> Rule #12 enum).
//      AIOPS is analytics-heavy: correlations / anomaly scores / forecasts / predictions
//      are computed; training-run records are operational_record; suppression rules are
//      catalog (rule definitions); root_cause_analyses is the one human operational_workflow.
//   2. B1A-B9-CATEGORY: backfill event_category on 6 AIOPS trigger_events currently "".
//   3. Catalog UX (Rule #20): author buyer-voice catalog_tagline + catalog_description
//      on the AIOPS domain row (both currently empty). No module copy: 0 modules (unbuilt).
//   4. H1: tag the one untagged AIOPS cross-domain handoff (1394, NPMD network_path.degraded
//      -> AIOPS) with the clean PCF match process 1128 "Monitor and report IT performance"
//      (the same L4 process every other inbound performance signal to AIOPS uses).
//
// Idempotent: reads live state before each write, patches/inserts only what is missing.
// All writes land at record_status='new' (Rule #1, by omission). No DELETE, no overwrite
// of a non-empty value, no record_status flip. No per-module skill / skill_tools work
// (RETIRED 2026-06-06 per-domain-skill restoration).

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

const DOMAIN_ID = 6;

// ============================================================
// 1. entity_type PATCH (Rule #12 enum). Only unclassified -> typed.
// ============================================================
const entityTypeMap: Record<number, string> = {
  93: "computed",              // event_correlations: ML/statistical correlation output
  94: "computed",              // anomaly_detections: anomaly scores derived from telemetry
  95: "operational_workflow",  // root_cause_analyses: draft -> reviewed -> published human workflow
  96: "computed",              // predictive_signals: model-generated forecast indicators
  722: "catalog",              // alert_suppression_rules: rule definitions referenced by other domains
  723: "operational_record",   // ml_model_training_records: append-only per-run training records
  724: "computed",             // incident_predictions: ML-generated incident forecasts (machine output)
};

async function patchEntityTypes(): Promise<number> {
  const ids = Object.keys(entityTypeMap).map(Number);
  const live = await get(`/data_objects?id=in.(${ids.join(",")})&select=id,entity_type`);
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = entityTypeMap[id];
    if (!target) continue;
    if (r.entity_type === target) continue;
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
// 2. B1A-B9-CATEGORY: event_category backfill on 6 trigger_events.
// Only patches rows currently empty. Mapping from state.yaml proposal.
// ============================================================
const eventCategoryMap: Record<number, string> = {
  645: "state_change", // root_cause_analysis.published
  646: "threshold",    // predictive_signal.elevated
  647: "state_change", // alert_suppression_rule.activated
  648: "lifecycle",    // ml_model_training_record.completed
  649: "signal",       // ml_model_training_record.drift_detected
  650: "signal",       // incident_prediction.high_confidence
};

async function patchEventCategories(): Promise<number> {
  const ids = Object.keys(eventCategoryMap).map(Number);
  const live = await get(`/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`);
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = eventCategoryMap[id];
    if (!target) continue;
    const cur = r.event_category == null ? "" : String(r.event_category).trim();
    if (cur === target) continue;
    if (cur !== "") {
      console.log(`  SKIP trigger ${id}: event_category='${cur}' already set (not empty)`);
      continue;
    }
    await call({ method: "PATCH", path: `/trigger_events?id=eq.${id}`, body: { event_category: target } });
    patched++;
    console.log(`  PATCH trigger ${id} (${r.event_name}) event_category -> ${target}`);
  }
  return patched;
}

// ============================================================
// 3. Catalog UX (Rule #20) on the domain row. Never overwrite non-empty.
// ============================================================
const AIOPS_TAGLINE =
  "Cut through alert noise and turn a flood of IT signals into a short list of correlated, root-caused issues your teams can act on before users feel the impact.";

const AIOPS_DESCRIPTION =
  "An AIOps platform sits across the high-volume telemetry your IT estate produces every second, metrics, logs, traces, events, and alerts, and uses machine learning and statistical analysis to find the few patterns that matter. Instead of paging on every threshold breach, it groups related signals into a single correlated incident, filters out duplicate and flapping alerts, and surfaces the probable root cause so responders start from an answer rather than a blank screen.\n\n" +
  "Operations and engineering teams use it to detect anomalies against learned baselines, suppress noise during planned changes, and receive early warning of predicted outages and capacity problems while there is still time to act. Correlated incidents and high-confidence predictions flow straight into incident and problem workflows, and suppression decisions flow back to the monitoring layer, so the whole operational loop stays in sync.\n\n" +
  "Behind the scenes, detection and prediction models are continuously retrained and watched for drift, keeping the signal accurate as the environment changes. The result is fewer pages, faster mean time to resolution, and a clearer picture of service health, so on-call teams spend their time fixing problems instead of triaging alerts.";

async function patchCatalogUx(): Promise<number> {
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!dom) throw new Error("AIOPS domain row not found");
  const body: Row = {};
  if (!dom.catalog_tagline || String(dom.catalog_tagline).trim() === "") {
    body.catalog_tagline = AIOPS_TAGLINE;
  } else {
    console.log("  SKIP catalog_tagline: already populated");
  }
  if (!dom.catalog_description || String(dom.catalog_description).trim() === "") {
    body.catalog_description = AIOPS_DESCRIPTION;
  } else {
    console.log("  SKIP catalog_description: already populated");
  }
  if (Object.keys(body).length === 0) return 0;
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body });
  console.log(`  PATCH domain ${DOMAIN_ID} catalog UX: ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ============================================================
// 4. H1: tag untagged handoff 1394 (NPMD -> AIOPS, network_path.degraded)
// with PCF 1128 "Monitor and report IT performance" (clean L4 match,
// same process every other inbound performance signal to AIOPS uses).
// ============================================================
const H1_HANDOFF = 1394;
const H1_PROCESS = 1128;

async function tagHandoff(): Promise<number> {
  const existing = await get(
    `/handoff_processes?handoff_id=eq.${H1_HANDOFF}&select=handoff_id,process_id`,
  );
  if (existing.some(r => Number(r.process_id) === H1_PROCESS)) {
    console.log(`  SKIP handoff ${H1_HANDOFF}: already tagged with process ${H1_PROCESS}`);
    return 0;
  }
  if (existing.length > 0) {
    console.log(
      `  NOTE handoff ${H1_HANDOFF} already carries ${existing.length} other PCF tag(s); adding ${H1_PROCESS}`,
    );
  }
  await insert("/handoff_processes", [
    {
      handoff_id: H1_HANDOFF,
      process_id: H1_PROCESS,
      role: "implements",
      proposal_source: "agent_curated",
    },
  ]);
  console.log(`  INSERT handoff_processes ${H1_HANDOFF} -> process ${H1_PROCESS}`);
  return 1;
}

// ============================================================
// Run
// ============================================================
console.log("== AIOPS state-driven execute 2026-06-07 ==");
console.log("\n[1] entity_type PATCH");
const nEntity = await patchEntityTypes();
console.log("\n[2] event_category backfill (B1A-B9-CATEGORY)");
const nCat = await patchEventCategories();
console.log("\n[3] catalog UX (Rule #20)");
const nCatalog = await patchCatalogUx();
console.log("\n[4] H1 handoff PCF tag");
const nTag = await tagHandoff();

console.log("\n== Summary ==");
console.log(`entity_type patched: ${nEntity}`);
console.log(`event_category patched: ${nCat}`);
console.log(`catalog UX fields written: ${nCatalog}`);
console.log(`handoff_processes inserted: ${nTag}`);

// Verify
console.log("\n== Verify ==");
const ve = await get(
  "/data_objects?id=in.(93,94,95,96,722,723,724)&select=id,data_object_name,entity_type&order=id",
);
for (const r of ve) console.log(`  ${r.id} ${r.data_object_name}: ${r.entity_type}`);
const vt = await get(
  "/trigger_events?id=in.(645,646,647,648,649,650)&select=id,event_name,event_category&order=id",
);
for (const r of vt) console.log(`  trigger ${r.id} ${r.event_name}: '${r.event_category}'`);
const [vd] = await get(
  `/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`,
);
console.log(`  catalog_tagline empty? ${!vd.catalog_tagline}`);
console.log(`  catalog_description empty? ${!vd.catalog_description}`);
const vh = await get(
  `/handoff_processes?handoff_id=eq.${H1_HANDOFF}&select=handoff_id,process_id,proposal_source,record_status`,
);
console.log(`  handoff ${H1_HANDOFF} tags: ${JSON.stringify(vh)}`);

console.log("\nDone.");
