#!/usr/bin/env bun
// AIOPS B1 technical fixes (audit dated 2026-05-30, continuation 2026-05-31).
//
// Apply ONLY the technically-deterministic B1 items from audits/AIOPS.md:
//
//   B1-S1   PATCH domains.id=6 business_logic, remove U+2014 em-dash.
//   B1-B9a  PATCH trigger_events.id=39 description, rename "Incident" -> "Event Correlation".
//           (Trigger 143 re-attribution is Bucket 2 judgment, DEFERRED.)
//   B1-B7   INSERT users -> AIOPS master data_object_relationships (Rule #10), 4 edges.
//   B1-B11  INSERT data_object_aliases on 5 non-self-explanatory masters, 10 rows.
//   B1-H1   INSERT handoff_processes for confident L4 pairs that audit pre-specifies AND
//           that have no existing tag on that handoff_id+process_id pair; 15 rows.
//
// Everything else from the B1 list is deferred per the run prompt (gated on B2 module
// split, blocked by M1, requires user judgment, or violates Rule #15/#20).

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

async function post(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

// ----------------------------------------------------------------------------
// B1-S1: PATCH domains.business_logic on AIOPS to drop the em-dash.
// ----------------------------------------------------------------------------
async function fixBusinessLogic() {
  const before = await get("/domains?id=eq.6&select=id,business_logic");
  const txt = String(before[0]?.business_logic ?? "");
  if (!txt.includes("—")) {
    console.log("B1-S1 SKIP: no em-dash present in domains.id=6 business_logic.");
    return;
  }
  // Replace " — " (or em-dash alone) with ": " for readability, preserve sentence structure.
  const next = "Event correlation, deduplication, anomaly detection, and root-cause analysis: ML and statistical algorithms across high-volume telemetry.";
  if (next.includes("—")) {
    throw new Error("B1-S1 abort: proposed text still contains an em-dash.");
  }
  await patch("/domains?id=eq.6", { business_logic: next });
  console.log("B1-S1 OK: PATCHed domains.id=6 business_logic.");
}

// ----------------------------------------------------------------------------
// B1-B9a: PATCH trigger_events.id=39 description to remove the mis-referenced
// entity word "Incident" and use "Event Correlation".
// ----------------------------------------------------------------------------
async function fixTrigger39() {
  const before = await get("/trigger_events?id=eq.39&select=id,event_name,description");
  const desc = String(before[0]?.description ?? "");
  if (!desc.includes("Incident")) {
    console.log("B1-B9a SKIP: trigger 39 description no longer mentions 'Incident'.");
    return;
  }
  const next = "Fired when an Event Correlation is identified. Publisher domain owns the state transition; subscribers may react by creating downstream artifacts.";
  await patch("/trigger_events?id=eq.39", { description: next });
  console.log("B1-B9a OK: PATCHed trigger_events.id=39 description.");
}

// ----------------------------------------------------------------------------
// B1-B7: Author users -> AIOPS master data_object_relationships per Rule #10.
// Audit pre-specifies the four edges (root_cause_analyses authored, alert_suppression_rules
// reviewed, ml_model_training_records created, incident_predictions acknowledged).
// users.id=748 (kind=platform_builtin).
// ----------------------------------------------------------------------------
const USERS_ID = 748;

const userEdges = [
  // verb, related_data_object_id, inverse_verb
  { related: 95,  verb: "authored root cause analyses", inverse: "is_authored_by" },   // root_cause_analyses
  { related: 722, verb: "reviewed suppression rules",   inverse: "is_reviewed_by" },   // alert_suppression_rules
  { related: 723, verb: "created training records",     inverse: "is_created_by"  },   // ml_model_training_records
  { related: 724, verb: "acknowledged predictions",     inverse: "is_acknowledged_by" }, // incident_predictions
];

async function fixUsersEdges() {
  // Pre-flight: confirm none of these edges already exist (audit reported zero).
  const existing = await get(
    `/data_object_relationships?and=(data_object_id.eq.${USERS_ID},related_data_object_id.in.(95,722,723,724))&select=id,related_data_object_id`
  );
  const have = new Set(existing.map(r => Number(r.related_data_object_id)));
  const missing = userEdges.filter(e => !have.has(e.related));
  if (missing.length === 0) {
    console.log("B1-B7 SKIP: all 4 users edges already present.");
    return;
  }
  const rows = missing.map(e => ({
    data_object_id: USERS_ID,
    related_data_object_id: e.related,
    owner_side: "target",          // user is the creator/actor; the AIOPS row owns the lifecycle
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: e.verb,
    inverse_verb: e.inverse,
    is_required: false,
    // record_status omitted -> default 'new' (Rule #1)
    // notes omitted -> default '' (Rule #15)
  }));
  await post("/data_object_relationships", rows);
  console.log(`B1-B7 OK: INSERTed ${rows.length} users -> AIOPS-master edges.`);
}

// ----------------------------------------------------------------------------
// B1-B11: Author data_object_aliases for the 5 non-self-explanatory masters.
// Audit pre-specifies exact alias tuples.
// ----------------------------------------------------------------------------
const aliases: Array<{ data_object_id: number; alias_name: string }> = [
  // event_correlations (93)
  { data_object_id: 93,  alias_name: "alert clustering" },
  { data_object_id: 93,  alias_name: "event grouping" },
  // anomaly_detections (94)
  { data_object_id: 94,  alias_name: "outlier detection" },
  { data_object_id: 94,  alias_name: "baseline deviation" },
  // root_cause_analyses (95)
  { data_object_id: 95,  alias_name: "RCA" },
  { data_object_id: 95,  alias_name: "probable cause inference" },
  // predictive_signals (96)
  { data_object_id: 96,  alias_name: "leading indicator" },
  { data_object_id: 96,  alias_name: "forecast indicator" },
  // incident_predictions (724)
  { data_object_id: 724, alias_name: "proactive incident" },
  { data_object_id: 724, alias_name: "predicted incident" },
];

async function fixAliases() {
  const ids = [93, 94, 95, 96, 724];
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids.join(",")})&select=id,data_object_id,alias_name`
  );
  const have = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`)
  );
  const missing = aliases.filter(a => !have.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`));
  if (missing.length === 0) {
    console.log("B1-B11 SKIP: all 10 aliases already present.");
    return;
  }
  const rows = missing.map(a => ({
    data_object_id: a.data_object_id,
    alias_name: a.alias_name,
    alias_type: "synonym",
    is_preferred: false,
    // record_status omitted -> 'new'
    // notes omitted -> '' (Rule #15)
  }));
  await post("/data_object_aliases", rows);
  console.log(`B1-B11 OK: INSERTed ${rows.length} data_object_aliases.`);
}

// ----------------------------------------------------------------------------
// B1-H1: APQC handoff_processes tags for confident-L4 pairs the audit pre-specifies,
// excluding any handoff_id that already has any handoff_processes row (so we never
// duplicate or contradict an existing tag).
// ----------------------------------------------------------------------------
const handoffTags: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 604, process_id: 1299 }, // AIOPS -> ITSM, incident_prediction.high_confidence
  { handoff_id: 605, process_id: 1304 }, // AIOPS -> ITOM, predictive_signal.elevated
  { handoff_id: 606, process_id: 1301 }, // AIOPS -> OBS,  alert_suppression_rule.activated
  { handoff_id: 607, process_id: 1301 }, // AIOPS -> ITOM, alert_suppression_rule.activated
  { handoff_id: 59,  process_id: 1301 }, // AIOPS -> ITOM, noise.suppression_applied
  { handoff_id: 56,  process_id: 1128 }, // OBS  -> AIOPS, anomaly_candidate.detected
  { handoff_id: 608, process_id: 1128 }, // OBS  -> AIOPS, metric_series.threshold_breached
  { handoff_id: 609, process_id: 1128 }, // OBS  -> AIOPS, metric_series.anomaly_detected
  { handoff_id: 610, process_id: 1128 }, // OBS  -> AIOPS, log_entry.error_pattern_matched
  { handoff_id: 612, process_id: 1128 }, // OBS  -> AIOPS, distributed_trace.slow_path_detected
  { handoff_id: 613, process_id: 1128 }, // OBS  -> AIOPS, distributed_trace.error_spike
  { handoff_id: 619, process_id: 1304 }, // ITOM -> AIOPS, capacity_record.threshold_breached
  { handoff_id: 141, process_id: 1301 }, // RMM  -> AIOPS, monitoring_alert.threshold_breached
  { handoff_id: 665, process_id: 1128 }, // DEM  -> AIOPS, endpoint_anomaly_finding.published
  { handoff_id: 667, process_id: 1128 }, // DEM  -> AIOPS, real_user_session.poor_experience
];

async function fixHandoffProcesses() {
  // Verify all processes exist.
  const processIds = Array.from(new Set(handoffTags.map(t => t.process_id)));
  const procRows = await get(`/processes?id=in.(${processIds.join(",")})&select=id`);
  const procHave = new Set(procRows.map(r => Number(r.id)));
  for (const pid of processIds) {
    if (!procHave.has(pid)) {
      throw new Error(`B1-H1 abort: process_id ${pid} not found in /processes`);
    }
  }
  // Pre-flight: per (handoff_id, process_id) idempotency by natural key.
  const handoffIds = Array.from(new Set(handoffTags.map(t => t.handoff_id)));
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id`
  );
  const have = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  const missing = handoffTags.filter(t => !have.has(`${t.handoff_id}|${t.process_id}`));
  if (missing.length === 0) {
    console.log("B1-H1 SKIP: all handoff_processes tags already present.");
    return;
  }
  const rows = missing.map(t => ({
    handoff_id: t.handoff_id,
    process_id: t.process_id,
    role: "implements",
    proposal_source: "agent_curated",
    // record_status omitted -> 'new' (Rule #1)
    // notes omitted -> '' (Rule #15)
  }));
  await post("/handoff_processes", rows);
  console.log(`B1-H1 OK: INSERTed ${rows.length} handoff_processes rows.`);
}

// ----------------------------------------------------------------------------
// Drive
// ----------------------------------------------------------------------------
async function main() {
  console.log("AIOPS B1 technical fixes, 2026-05-31");
  await fixBusinessLogic();
  await fixTrigger39();
  await fixUsersEdges();
  await fixAliases();
  await fixHandoffProcesses();
  console.log("Done.");
}

await main();
