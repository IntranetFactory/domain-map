#!/usr/bin/env bun
// DCIM B1 technical fixes (2026-05-31).
//
// Scope is limited to truly-technical fixes that defer no judgment:
//   B1-T1  PATCH trigger_events.event_category enum backfill (10 rows, values pre-specified by audit)
//   B1-T3  PATCH data_objects.plural_label rename on dc_power_distribution_units (548)
//   B1-T5  INSERT data_object_relationships user-edges per Rule #10 (4 rows audit pre-specifies)
//   B1-T6  INSERT data_object_aliases for 7 DCIM masters (alias_type='industry_term', tuples pre-specified)
//   B1-H1  INSERT handoff_processes (8 rows; handoff 679 already has a row, skip)
//
// Deferred (gated on modules / not technical):
//   B1-S1..S6 (modules / capabilities / solutions / catalog text / system skills / roles)
//   B1-T2     (new handoff for event 691 - needs source module FK from S1)
//   B1-T4     (pattern flag re-eval - values already at target, no flip; tracked in audit transcript)
//   B1-T5 (rest)  intra-domain + cross-domain edges (audit groups with modules)
//   B1-T7     (lifecycle states - new entity, module FK + user picks config-shape exemption)
//   B1-B1/B2/B3   (handoff source module FK + report-only on other domains)
//
// Per CLAUDE.md: no em-dash, American English, no notes writes.
// Per Rule #6: invoke from project root.

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

async function post(path: string, body: Row | Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

// =============================================================================
// B1-T1: PATCH trigger_events.event_category for 10 DCIM events
// =============================================================================
const triggerCategoryUpdates: Array<{ id: number; event_category: string }> = [
  { id: 688, event_category: "threshold" },     // dc_rack.capacity_threshold_breached
  { id: 689, event_category: "threshold" },     // dc_cabinet.environmental_alert
  { id: 690, event_category: "state_change" },  // dc_power_distribution_unit.failure
  { id: 691, event_category: "threshold" },     // dc_power_circuit.overload
  { id: 692, event_category: "state_change" },  // dc_uninterruptible_power_supply.failover
  { id: 693, event_category: "state_change" },  // dc_cooling_unit.failure
  { id: 694, event_category: "threshold" },     // dc_environmental_reading.threshold_breached
  { id: 695, event_category: "lifecycle" },     // dc_capacity_plan.refreshed
  { id: 696, event_category: "state_change" },  // dc_port_connection.changed
  { id: 697, event_category: "lifecycle" },     // dc_cable_connection.added
];

console.log("B1-T1 PATCH trigger_events.event_category");
for (const u of triggerCategoryUpdates) {
  await patch(`/trigger_events?id=eq.${u.id}`, { event_category: u.event_category });
  console.log(`  id=${u.id} -> event_category='${u.event_category}'`);
}

// =============================================================================
// B1-T3: PATCH dc_power_distribution_units.plural_label
// =============================================================================
console.log("B1-T3 PATCH data_objects.plural_label (id=548)");
await patch(`/data_objects?id=eq.548`, { plural_label: "Power Distribution Units (PDUs)" });
console.log(`  id=548 plural_label -> 'Power Distribution Units (PDUs)'`);

// =============================================================================
// B1-T5 (user-edges only): INSERT 4 data_object_relationships per Rule #10
// =============================================================================
// users (748) is platform_builtin. Verb conventions cribbed from existing
// user-edges (data_object_id=748): present-tense gerund "owned X" / "authored X"
// or verb phrase ("approves plans"). Cardinality one_to_many, kind reference,
// owner_side source (the user owns / can produce many of the related object).

const userEdges: Row[] = [
  {
    data_object_id: 748,           // users
    related_data_object_id: 546,   // dc_racks
    relationship_verb: "owns",
    inverse_verb: "is_owned_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  {
    data_object_id: 748,           // users
    related_data_object_id: 553,   // dc_capacity_plans
    relationship_verb: "authors",
    inverse_verb: "is_authored_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  {
    data_object_id: 748,           // users
    related_data_object_id: 553,   // dc_capacity_plans
    relationship_verb: "approves",
    inverse_verb: "is_approved_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  {
    data_object_id: 748,           // users
    related_data_object_id: 552,   // dc_environmental_readings
    relationship_verb: "inspects",
    inverse_verb: "is_inspected_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
];

console.log("B1-T5 INSERT data_object_relationships (user edges, Rule #10)");
// Idempotency pre-check: skip any row whose (data_object_id, related_data_object_id, relationship_verb) already exists.
const existingUserEdges = await get(
  `/data_object_relationships?data_object_id=eq.748&related_data_object_id=in.(546,552,553)&select=data_object_id,related_data_object_id,relationship_verb`,
);
const existingKey = new Set(
  existingUserEdges.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
);
const userEdgesToInsert = userEdges.filter(
  r => !existingKey.has(`${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
);
if (userEdgesToInsert.length > 0) {
  await post("/data_object_relationships", userEdgesToInsert);
  for (const r of userEdgesToInsert) {
    console.log(`  users -> ${r.related_data_object_id} verb='${r.relationship_verb}' inserted`);
  }
} else {
  console.log("  all 4 user-edges already present, nothing to insert");
}

// =============================================================================
// B1-T6: INSERT 7 data_object_aliases (alias_type='industry_term')
// =============================================================================
// alias_type enum: synonym | industry_term | solution_term (verified live).
// industry_id NULL is acceptable for an industry_term alias that is industry-
// agnostic (these are general data-center vocabulary, not vertical-specific).

// alias_type='synonym' (not 'industry_term'): these are general data-center
// vocabulary, not vertical-specific terms. The catalog enforces industry_id
// REQUIRED for 'industry_term' and NULL otherwise. The audit's 'industry'
// (not a valid enum value) is reinterpreted as 'synonym' here.
const aliases: Row[] = [
  { data_object_id: 546, alias_name: "rack",          alias_type: "synonym" }, // dc_racks
  { data_object_id: 547, alias_name: "cabinet",       alias_type: "synonym" }, // dc_cabinets
  { data_object_id: 548, alias_name: "PDU",           alias_type: "synonym" }, // dc_power_distribution_units
  { data_object_id: 550, alias_name: "UPS",           alias_type: "synonym" }, // dc_uninterruptible_power_supplies
  { data_object_id: 552, alias_name: "sensor reading", alias_type: "synonym" }, // dc_environmental_readings
  { data_object_id: 554, alias_name: "patch port",    alias_type: "synonym" }, // dc_port_connections
  { data_object_id: 555, alias_name: "patch cable",   alias_type: "synonym" }, // dc_cable_connections
];

console.log("B1-T6 INSERT data_object_aliases");
const existingAliases = await get(
  `/data_object_aliases?data_object_id=in.(546,547,548,550,552,554,555)&select=data_object_id,alias_name,alias_type`,
);
const existingAliasKey = new Set(
  existingAliases.map(r => `${r.data_object_id}|${r.alias_name}|${r.alias_type}`),
);
const aliasesToInsert = aliases.filter(
  r => !existingAliasKey.has(`${r.data_object_id}|${r.alias_name}|${r.alias_type}`),
);
if (aliasesToInsert.length > 0) {
  await post("/data_object_aliases", aliasesToInsert);
  for (const r of aliasesToInsert) {
    console.log(`  data_object=${r.data_object_id} alias='${r.alias_name}' inserted`);
  }
} else {
  console.log("  all aliases already present, nothing to insert");
}

// =============================================================================
// B1-H1: INSERT handoff_processes (8 rows; 679 already tagged, skip)
// =============================================================================
// PCFs pre-verified live:
//   1299 'Triage IT service delivery incidents' (ext 20903, L4)
//   1304 'Manage infrastructure performance and capacity' (ext 20909, L4)
//    291 'Develop and manage infrastructure resource planning' (ext 20888, L3)
//   1309 'Manage infrastructure configuration' (ext 20915, L4) -- already on 679

const handoffProcesses: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 674, process_id: 1299 }, // dc_cabinet.environmental_alert -> ITSM
  { handoff_id: 675, process_id: 1299 }, // dc_power_distribution_unit.failure -> ITSM
  { handoff_id: 677, process_id: 1299 }, // dc_uninterruptible_power_supply.failover -> ITSM
  { handoff_id: 678, process_id: 1299 }, // dc_cooling_unit.failure -> ITSM
  { handoff_id: 681, process_id: 1304 }, // dc_rack.capacity_threshold_breached -> ITOM
  { handoff_id: 673, process_id: 1304 }, // dc_environmental_reading.threshold_breached -> ITOM
  { handoff_id: 676, process_id: 1304 }, // dc_power_distribution_unit.failure -> AIOPS
  { handoff_id: 680, process_id: 291 },  // dc_capacity_plan.refreshed -> SPM
  // 679 dc_port_connection.changed -> CMDB (process 1309) already exists (id 435)
];

console.log("B1-H1 INSERT handoff_processes (agent_curated)");
const existingHP = await get(
  `/handoff_processes?handoff_id=in.(673,674,675,676,677,678,679,680,681)&select=handoff_id,process_id`,
);
const existingHPKey = new Set(existingHP.map(r => `${r.handoff_id}|${r.process_id}`));
const hpToInsert = handoffProcesses
  .filter(r => !existingHPKey.has(`${r.handoff_id}|${r.process_id}`))
  .map(r => ({
    handoff_id: r.handoff_id,
    process_id: r.process_id,
    role: "implements",
    proposal_source: "agent_curated",
    // record_status omitted: default 'new' per Rule #1
    // notes omitted: empty default per Rule #15
  }));
if (hpToInsert.length > 0) {
  await post("/handoff_processes", hpToInsert);
  for (const r of hpToInsert) {
    console.log(`  handoff=${r.handoff_id} process=${r.process_id} inserted`);
  }
} else {
  console.log("  all handoff_processes already present, nothing to insert");
}

console.log("\nDONE. All B1 technical fixes applied.");
console.log("UI: https://tests.semantius.app/domain_map/trigger_events");
console.log("UI: https://tests.semantius.app/domain_map/data_objects");
console.log("UI: https://tests.semantius.app/domain_map/data_object_relationships");
console.log("UI: https://tests.semantius.app/domain_map/data_object_aliases");
console.log("UI: https://tests.semantius.app/domain_map/handoff_processes");
