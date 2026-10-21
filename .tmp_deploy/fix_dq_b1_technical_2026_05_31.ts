#!/usr/bin/env bun
// DQ (domain id 90) - B1 technical fixes from audits/DQ.md (2026-05-30 audit).
//
// In scope for this run (truly-technical B1 only, judgment deferred):
//   1. B1-S5: PATCH domains row 90 to remove em-dash in business_logic and
//      "standardisation" -> "standardization" in description.
//   2. B1-S9: INSERT 7 users-edges (Rule #10) for the 7 DQ masters listed in the
//      audit (quality_rules, quality_incidents x2 actors, profile_results,
//      dq_sla_definitions, dq_scorecards, anomaly_detections).
//   3. B1-S10: INSERT 8 data_object_aliases that the audit pre-specifies
//      exact alias_name strings for (vendor solution_term tuples; solution_id
//      left NULL since the vendor solutions are not loaded yet).
//   4. H1 APQC tagging: INSERT 5 handoff_processes rows for handoffs 266 / 267
//      / 268 / 713 / 714 against the APQC PCF rows the audit pre-specifies by
//      external_id (20903 / 20927 / 10252 / 10252 / 20650). proposal_source
//      'agent_curated', record_status default 'new'.
//
// Deferred (NOT this loader):
//   - B1-S1 (modules), B1-S2 (anomaly_detections canonical owner), B1-S3
//     (capabilities), B1-S4 (primary-coverage solutions), B1-S6 (catalog UX),
//     B1-S7 (legacy skill retire), B1-S8 (intra-domain master edges),
//     B1-S11 (lifecycle states), B1-S12 (cross-domain edges), B1-S13 (B10b),
//     B1-M1/M2/M3 (new entities).
//
// Run from project root:
//   bun run ".tmp_deploy/fix_dq_b1_technical_2026_05_31.ts"

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

async function post(path: string, body: Row[]): Promise<Row[]> {
  if (body.length === 0) return [];
  return call({ method: "POST", path, body });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

// Data object IDs (verified pre-run via /data_objects lookup).
const DO = {
  users: 748,
  quality_rules: 309,
  quality_incidents: 310,
  profile_results: 311,
  dq_dimensions: 312,
  dq_scorecards: 313,
  dq_sla_definitions: 314,
  anomaly_detections: 94,
} as const;

// =====================================================================
// 1. B1-S5: PATCH domains row 90 (em-dash + British spelling fixes).
// =====================================================================
async function fixDomainText() {
  const current = await get(`/domains?id=eq.90&select=description,business_logic`);
  const row = current[0] as { description: string; business_logic: string };
  const desc = row.description.replace(/standardisation/g, "standardization");
  // em-dash U+2014, replace with comma+space; collapse possible double-space.
  const bl = row.business_logic.replace(/\s*—\s*/g, ", ").replace(/  +/g, " ");

  const changes: Row = {};
  if (desc !== row.description) changes.description = desc;
  if (bl !== row.business_logic) changes.business_logic = bl;

  if (Object.keys(changes).length === 0) {
    console.log("  domains row 90: no text changes needed (already clean)");
    return;
  }

  await patch(`/domains?id=eq.90`, changes);
  console.log(`  domains row 90: PATCHed ${Object.keys(changes).join(", ")}`);
}

// =====================================================================
// 2. B1-S9: 7 user-edges per Rule #10.
// =====================================================================
const userEdges: Array<{ target: number; verb: string; inverse: string; targetTable: string }> = [
  // quality_rules: rule_author
  { target: DO.quality_rules, verb: "authored rules", inverse: "is_created_by", targetTable: "quality_rules" },
  // quality_incidents: assignee + raiser (2 actor labels in audit)
  { target: DO.quality_incidents, verb: "assigned incidents", inverse: "is_assigned_to", targetTable: "quality_incidents" },
  { target: DO.quality_incidents, verb: "raised incidents", inverse: "is_created_by", targetTable: "quality_incidents" },
  // profile_results: profiler_owner
  { target: DO.profile_results, verb: "owned profile results", inverse: "is_owned_by", targetTable: "profile_results" },
  // dq_sla_definitions: sla_owner
  { target: DO.dq_sla_definitions, verb: "owned SLA definitions", inverse: "is_owned_by", targetTable: "dq_sla_definitions" },
  // dq_scorecards: scorecard_owner
  { target: DO.dq_scorecards, verb: "owned scorecards", inverse: "is_owned_by", targetTable: "dq_scorecards" },
  // anomaly_detections: acknowledger
  { target: DO.anomaly_detections, verb: "acknowledged anomalies", inverse: "is_acknowledged_by", targetTable: "anomaly_detections" },
];

async function loadUserEdges() {
  // Idempotency: skip if (data_object_id=748, related_data_object_id=<target>, relationship_verb=<verb>) already exists.
  const existing = await get(
    `/data_object_relationships?data_object_id=eq.${DO.users}&related_data_object_id=in.(${userEdges.map(e => e.target).join(",")})&select=related_data_object_id,relationship_verb`,
  );
  const seen = new Set(existing.map(r => `${r.related_data_object_id}|${r.relationship_verb}`));

  const toInsert = userEdges
    .filter(e => !seen.has(`${e.target}|${e.verb}`))
    .map(e => ({
      data_object_id: DO.users,
      related_data_object_id: e.target,
      relationship_verb: e.verb,
      inverse_verb: e.inverse,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "source",
      data_object_relationship_label: `users ${e.verb} ${e.targetTable}`,
    }));

  if (toInsert.length === 0) {
    console.log(`  data_object_relationships (user-edges): all ${userEdges.length} already present`);
    return;
  }
  await post(`/data_object_relationships`, toInsert);
  console.log(`  data_object_relationships (user-edges): inserted ${toInsert.length} of ${userEdges.length}`);
}

// =====================================================================
// 3. B1-S10: data_object_aliases (audit pre-specified alias_name strings).
// =====================================================================
// NOTE: 7 solution_term aliases the audit pre-specifies (expectation, check,
// monitor, profiling output, profile, incident, issue) are DEFERRED here
// because the platform check-constraint requires solution_id to be set when
// alias_type='solution_term', and the corresponding vendor solutions
// (Great Expectations, Soda, Monte Carlo, Ataccama ONE, Informatica IDQ,
// Bigeye) are not loaded yet (gated on B1-S4 / Bucket 2 #4 user decision on
// primary-coverage solutions). Only the cross-vendor synonym is loaded here.
const aliases: Array<{ data_object_id: number; alias_name: string; alias_type: string }> = [
  // anomaly_detections: generic data-observability synonym (no specific vendor).
  { data_object_id: DO.anomaly_detections, alias_name: "anomaly", alias_type: "synonym" },
];

async function loadAliases() {
  const ids = [...new Set(aliases.map(a => a.data_object_id))].join(",");
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids})&select=data_object_id,alias_name`,
  );
  const seen = new Set(existing.map(r => `${r.data_object_id}|${r.alias_name}`));
  const toInsert = aliases.filter(a => !seen.has(`${a.data_object_id}|${a.alias_name}`));
  if (toInsert.length === 0) {
    console.log(`  data_object_aliases: all ${aliases.length} already present`);
    return;
  }
  await post(`/data_object_aliases`, toInsert);
  console.log(`  data_object_aliases: inserted ${toInsert.length} of ${aliases.length}`);
}

// =====================================================================
// 4. H1 APQC tagging: 5 handoff_processes rows.
// =====================================================================
// PCF external_id -> process_id (verified via /processes lookup before this run).
const PCF = {
  "20903": 1299, // Triage IT service delivery incidents
  "20927": 1319, // Resolve IT issues/requests
  "20650": 1103, // Triage SLA compliance issues
  "10252": 771,  // Maintain master data
} as const;

const handoffTags: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 266, process_id: PCF["20903"] }, // DQ->ITSM quality_rule.breach -> Triage IT service delivery incidents (high)
  { handoff_id: 267, process_id: PCF["20927"] }, // DQ->ITSM dq_scorecard.breached -> Resolve IT issues/requests (medium)
  { handoff_id: 268, process_id: PCF["10252"] }, // DQ->DCG profile_result.updated -> Maintain master data (medium)
  { handoff_id: 713, process_id: PCF["10252"] }, // DQ->DCG dq_dimension.threshold_breached -> Maintain master data (low; audit accepted)
  { handoff_id: 714, process_id: PCF["20650"] }, // DQ->ITSM dq_sla_definition.breached -> Triage SLA compliance issues (high)
];

async function loadHandoffTags() {
  const ids = handoffTags.map(t => t.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${ids})&select=handoff_id,process_id`,
  );
  const seen = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  const toInsert = handoffTags
    .filter(t => !seen.has(`${t.handoff_id}|${t.process_id}`))
    .map(t => ({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      proposal_source: "agent_curated",
    }));
  if (toInsert.length === 0) {
    console.log(`  handoff_processes: all ${handoffTags.length} already present`);
    return;
  }
  await post(`/handoff_processes`, toInsert);
  console.log(`  handoff_processes: inserted ${toInsert.length} of ${handoffTags.length}`);
}

// =====================================================================
// MAIN
// =====================================================================
console.log("DQ B1 technical fixes (2026-05-31)");
console.log("");
console.log("1. B1-S5: PATCH domains row 90 (em-dash + spelling)");
await fixDomainText();
console.log("");
console.log("2. B1-S9: 7 user-edges (Rule #10)");
await loadUserEdges();
console.log("");
console.log("3. B1-S10: 8 data_object_aliases (audit pre-specified)");
await loadAliases();
console.log("");
console.log("4. H1: 5 handoff_processes (APQC PCF tags, agent_curated)");
await loadHandoffTags();
console.log("");
console.log("Done.");
