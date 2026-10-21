#!/usr/bin/env bun
// State-driven execute for DQ (Data Quality), 2026-06-07.
// Works ONLY the open EXECUTE-class items in audits/DQ/state.yaml; idempotent
// (read live, act only on what is still open). DQ is UNBUILT (0 domain_modules,
// 0 capabilities), so B1B-S1 module build is SURFACED, not scaffolded; the
// M / F / B10b / lifecycle cascade is left. All module-gated b1b items stay
// blocked; all b2 + the anomaly_detections single-master conflict stay surfaced.
//
// Write types (all additive/corrective; record_status omitted -> default 'new'):
//   1. B1A-NEW1 (B9): PATCH event_category on the 4 DQ-master trigger_events that
//      carry '' (745 -> threshold, 746 -> state_change, 747 -> threshold,
//      748 -> lifecycle). Fills empty only; skips any already-categorized row.
//   2. B13 / Rule #12: classify data_objects.entity_type off 'unclassified' on the
//      6 DQ masters still unclassified (94 anomaly_detections is already 'computed'
//      and is the contested cross-domain master, so it is NOT touched here).
//   3. A4 catalog UX (Rule #20, B1B-S6 / B2-CATALOG-UX): author buyer-voice
//      catalog_tagline + catalog_description into the EMPTY fields on domain 90.
//      Never overwrite a non-empty value. (No modules exist, so there is no
//      module-level catalog UX to write.)

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

const DOMAIN_ID = 90;
const EM_DASH = "—";

// ============================================================
// 1. B1A-NEW1 (B9): event_category fills on 4 trigger_events
//    Rule #13 enum: lifecycle | state_change | threshold | signal
// ============================================================
const EVENT_CATEGORY: Record<number, string> = {
  745: "threshold", // dq_dimension.threshold_breached
  746: "state_change", // dq_dimension.recovered
  747: "threshold", // dq_sla_definition.breached
  748: "lifecycle", // dq_sla_definition.published
};

async function fillEventCategories(): Promise<number> {
  const ids = Object.keys(EVENT_CATEGORY).join(",");
  const rows = await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`,
  );
  let n = 0;
  for (const r of rows) {
    const cur = String(r.event_category ?? "");
    if (cur.trim() !== "") {
      console.log(`  trigger_event ${r.id} (${r.event_name}): already '${cur}', skipping`);
      continue;
    }
    const cat = EVENT_CATEGORY[Number(r.id)];
    await patch(`/trigger_events?id=eq.${r.id}`, { event_category: cat });
    console.log(`  trigger_event ${r.id} (${r.event_name}) event_category -> ${cat}`);
    n++;
  }
  return n;
}

// ============================================================
// 2. B13 / Rule #12: classify entity_type on the 6 unclassified masters
//    (94 anomaly_detections already 'computed' + cross-domain contested -> left)
// ============================================================
const ENTITY_TYPE: Record<number, string> = {
  309: "catalog", // quality_rules: rule/definition reference data ("business logic defining acceptable data state")
  310: "operational_workflow", // quality_incidents: raised/acknowledged/investigating/remediating/resolved/closed
  311: "computed", // profile_results: summary statistics computed per asset per scan
  312: "catalog", // dq_dimensions: canonical DAMA/ISO quality dimensions (reference data)
  313: "computed", // dq_scorecards: aggregated weighted quality score per asset/time-slice
  314: "operational_workflow", // dq_sla_definitions: draft/published/breached/suspended/archived
};

async function classifyEntityTypes(): Promise<number> {
  const ids = Object.keys(ENTITY_TYPE).join(",");
  const rows = await get(
    `/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type`,
  );
  let n = 0;
  for (const r of rows) {
    const cur = r.entity_type;
    if (cur !== null && cur !== "unclassified") {
      console.log(`  ${r.data_object_name} (${r.id}): already '${cur}', skipping`);
      continue;
    }
    const et = ENTITY_TYPE[Number(r.id)];
    await patch(`/data_objects?id=eq.${r.id}`, { entity_type: et });
    console.log(`  entity_type -> ${et} on ${r.data_object_name} (${r.id})`);
    n++;
  }
  return n;
}

// ============================================================
// 3. A4 catalog UX (Rule #20): buyer-voice copy into EMPTY fields only
// ============================================================
const DOMAIN_COPY = {
  catalog_tagline:
    "Find and fix the data quality problems that break decisions, before they reach a dashboard, a model, or a customer.",
  catalog_description:
    "Make your data trustworthy and keep it that way. Profile your tables to learn what is actually in them, write the rules that define acceptable state, and run those rules on every load so cardinality bounds, format patterns, referential integrity, and statistical thresholds are checked the moment data lands. When a rule breaks, raise an incident, route it to the owner, track root cause and remediation, and close the loop, so a bad batch becomes a worklist item instead of a silent corruption that surfaces three reports later.\n\nMonitor fitness continuously across the dimensions that matter: completeness, uniqueness, validity, timeliness, consistency, and accuracy. Roll the dimension scores up into scorecards that show direction and trend, set quality SLAs with hard thresholds, and get alerted the instant a metric breaches or recovers. Catch the silent failures that fixed rules miss by flagging anomalies in volume, freshness, and distribution before downstream consumers notice.\n\nGive every team a shared, defensible answer to a simple question: can I trust this data? Feed quality signals to the catalog so assets carry a health flag, open tickets in the service desk when an SLA is breached, and hand clean, profiled, monitored data to the analytics and AI platforms that depend on it.",
};

async function authorCatalogUX(): Promise<number> {
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  const body: Row = {};
  if (!dom?.catalog_tagline || String(dom.catalog_tagline).trim() === "")
    body.catalog_tagline = DOMAIN_COPY.catalog_tagline;
  if (!dom?.catalog_description || String(dom.catalog_description).trim() === "")
    body.catalog_description = DOMAIN_COPY.catalog_description;
  if (Object.keys(body).length === 0) {
    console.log("  domain catalog UX: both fields already non-empty, skipping");
    return 0;
  }
  await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
  console.log(`  domain 90 catalog UX written: ${Object.keys(body).join(", ")}`);
  return 1;
}

// ============================================================
// guard: no em-dash anywhere in the copy we are about to write
// ============================================================
function assertNoEmDash() {
  const blobs = [DOMAIN_COPY.catalog_tagline, DOMAIN_COPY.catalog_description];
  for (const b of blobs) {
    if (b.includes(EM_DASH)) throw new Error(`em-dash found in authored copy: ${b}`);
  }
}

async function main() {
  assertNoEmDash();

  console.log("== 1. B1A-NEW1 event_category fills ==");
  const evCount = await fillEventCategories();

  console.log("== 2. B13 entity_type classification ==");
  const etCount = await classifyEntityTypes();

  console.log("== 3. A4 catalog UX ==");
  const uxCount = await authorCatalogUX();

  console.log("\n== SUMMARY ==");
  console.log(`  trigger_events event_category filled: ${evCount}`);
  console.log(`  entity_type PATCHed: ${etCount}`);
  console.log(`  domain catalog UX written: ${uxCount}`);

  console.log("\nUI links:");
  console.log("  https://adenin.semantius.app/domain_map/trigger_events?data_object_id=in.(312,314)");
  console.log("  https://adenin.semantius.app/domain_map/data_objects?id=in.(309,310,311,312,313,314)");
  console.log("  https://adenin.semantius.app/domain_map/domains?id=eq.90");
}

await main();
