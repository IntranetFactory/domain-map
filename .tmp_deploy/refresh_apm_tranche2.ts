#!/usr/bin/env bun
// APM refresh Tranche 2 — Phase B fills:
//  * domain_module_data_objects (masters + cross-module consumers)
//  * domain_data_objects: add business_process_models consumer (B10 inbound resolves)
//  * data_objects pattern flags: technology_fit_assessments has_single_approver
//  * data_objects plural_label fix on application_costs
//  * data_objects config-shape exemption notes on application_costs + application_value_scores
//  * data_object_relationships users edges (B7) — 6 rows
//  * data_object_lifecycle_states (B12) — 18 rows across 5 masters
//  * handoffs B9 fan-out (events 211, 212, 213) — 4 new rows
//  * handoffs B10b backfill — source_domain_module_id on 8 outbound, target_domain_module_id on 2 inbound
//
// Idempotent: re-running is safe.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, body: Row[]) => body.length ? call({ method: "POST", path: p, body }) : Promise.resolve([]);
const patch = (p: string, body: Row) => call({ method: "PATCH", path: p, body });

const APM_ID = 10;
const M_REGISTRY = 103;       // APM-PORTFOLIO-REGISTRY
const M_RATIONAL = 104;       // APM-RATIONALIZATION
const USERS_ID = 748;

// data_object ids
const D = {
  business_capability_maps: 248,
  enterprise_applications: 267,
  application_costs: 268,
  technology_platforms: 269,
  technology_fit_assessments: 270,
  application_interfaces: 271,
  application_value_scores: 272,
  saas_applications: 61,
  software_titles: 57,
  configuration_items: 76,
  data_products: 232,
  business_process_models: 247,
};

// ============================================================
// 1. domain_data_objects — add business_process_models consumer (B10 inbound 182 resolves)
// ============================================================
async function step1_dataObjectsConsumer() {
  console.log("\n[1] domain_data_objects: add business_process_models consumer");
  const existing = await get(`/domain_data_objects?domain_id=eq.${APM_ID}&data_object_id=eq.${D.business_process_models}&select=id`);
  if (existing.length > 0) {
    console.log("  already present");
    return;
  }
  await post("/domain_data_objects", [{
    domain_id: APM_ID,
    data_object_id: D.business_process_models,
    role: "consumer",
    necessity: "optional",
    notes: "BPA-mastered; APM consumes process models to align capability maps with operational process flows. Optional: many APM deployments without an active BPA integration skip this.",
  }]);
  console.log("  inserted");
}

// ============================================================
// 2. domain_module_data_objects — module-level DMDO catalog
// ============================================================
const dmdoRows: Array<{ moduleId: number; dataObjectId: number; role: string; necessity: string }> = [
  // PORTFOLIO-REGISTRY masters
  { moduleId: M_REGISTRY, dataObjectId: D.enterprise_applications, role: "master", necessity: "required" },
  { moduleId: M_REGISTRY, dataObjectId: D.application_interfaces, role: "master", necessity: "required" },
  { moduleId: M_REGISTRY, dataObjectId: D.technology_platforms, role: "master", necessity: "required" },
  { moduleId: M_REGISTRY, dataObjectId: D.business_capability_maps, role: "master", necessity: "required" },
  // PORTFOLIO-REGISTRY consumers
  { moduleId: M_REGISTRY, dataObjectId: D.saas_applications, role: "consumer", necessity: "optional" },
  { moduleId: M_REGISTRY, dataObjectId: D.software_titles, role: "consumer", necessity: "optional" },
  { moduleId: M_REGISTRY, dataObjectId: D.configuration_items, role: "consumer", necessity: "optional" },
  { moduleId: M_REGISTRY, dataObjectId: D.data_products, role: "consumer", necessity: "optional" },
  { moduleId: M_REGISTRY, dataObjectId: D.business_process_models, role: "consumer", necessity: "optional" },
  // RATIONALIZATION masters
  { moduleId: M_RATIONAL, dataObjectId: D.application_costs, role: "master", necessity: "required" },
  { moduleId: M_RATIONAL, dataObjectId: D.application_value_scores, role: "master", necessity: "required" },
  { moduleId: M_RATIONAL, dataObjectId: D.technology_fit_assessments, role: "master", necessity: "required" },
  // RATIONALIZATION cross-module consumers (reads from registry)
  { moduleId: M_RATIONAL, dataObjectId: D.enterprise_applications, role: "consumer", necessity: "required" },
  { moduleId: M_RATIONAL, dataObjectId: D.technology_platforms, role: "consumer", necessity: "required" },
];
async function step2_DMDO() {
  console.log("\n[2] domain_module_data_objects: load module-level DMDO");
  const existing = await get(`/domain_module_data_objects?domain_module_id=in.(${M_REGISTRY},${M_RATIONAL})&select=domain_module_id,data_object_id`);
  const existingSet = new Set(existing.map(r => `${r.domain_module_id}:${r.data_object_id}`));
  const missing = dmdoRows
    .filter(r => !existingSet.has(`${r.moduleId}:${r.dataObjectId}`))
    .map(r => ({
      domain_module_id: r.moduleId,
      data_object_id: r.dataObjectId,
      role: r.role,
      necessity: r.necessity,
    }));
  if (missing.length === 0) { console.log("  nothing to insert"); return; }
  console.log(`  inserting ${missing.length} new`);
  await post("/domain_module_data_objects", missing);
}

// ============================================================
// 3. data_objects PATCHes (pattern flag + plural label fix + exemption notes)
// ============================================================
async function step3_dataObjectsPatches() {
  console.log("\n[3] data_objects PATCHes");

  // 3a. has_single_approver on technology_fit_assessments
  const tfa = await get(`/data_objects?id=eq.${D.technology_fit_assessments}&select=has_single_approver`);
  if (tfa[0]?.has_single_approver !== true) {
    await patch(`/data_objects?id=eq.${D.technology_fit_assessments}`, { has_single_approver: true });
    console.log("  technology_fit_assessments.has_single_approver = true");
  } else {
    console.log("  technology_fit_assessments.has_single_approver already true");
  }

  // 3b. plural_label fix on application_costs
  const ac = await get(`/data_objects?id=eq.${D.application_costs}&select=plural_label`);
  if (ac[0]?.plural_label !== "Application Total Costs of Ownership") {
    await patch(`/data_objects?id=eq.${D.application_costs}`, { plural_label: "Application Total Costs of Ownership" });
    console.log("  application_costs.plural_label fixed");
  } else {
    console.log("  application_costs.plural_label already correct");
  }

  // 3c. config-shape exemption notes on application_costs + application_value_scores (Rule #12)
  const acNote = "Config-shape master: time-series cost snapshots, no per-state permissions needed. Authored quarterly by the rationalization module; superseded by next period's snapshot. Lifecycle states intentionally omitted per Rule #12 exemption.";
  const ac2 = await get(`/data_objects?id=eq.${D.application_costs}&select=notes`);
  if (!String(ac2[0]?.notes ?? "").includes("Config-shape master")) {
    await patch(`/data_objects?id=eq.${D.application_costs}`, { notes: acNote });
    console.log("  application_costs.notes set (config-shape exemption)");
  } else {
    console.log("  application_costs.notes exemption already present");
  }
  const avsNote = "Config-shape master: time-series multi-dimensional score snapshots, no per-state permissions needed. Authored on each value recalculation; superseded by next refresh. Lifecycle states intentionally omitted per Rule #12 exemption.";
  const avs = await get(`/data_objects?id=eq.${D.application_value_scores}&select=notes`);
  if (!String(avs[0]?.notes ?? "").includes("Config-shape master")) {
    await patch(`/data_objects?id=eq.${D.application_value_scores}`, { notes: avsNote });
    console.log("  application_value_scores.notes set (config-shape exemption)");
  } else {
    console.log("  application_value_scores.notes exemption already present");
  }
}

// ============================================================
// 4. data_object_relationships — users edges (B7)
// ============================================================
const usersEdges: Array<{ relatedId: number; verb: string; inverseVerb: string; isRequired: boolean }> = [
  { relatedId: D.enterprise_applications, verb: "owns_application", inverseVerb: "owned by user", isRequired: true },
  { relatedId: D.technology_platforms, verb: "owns_technology_platform", inverseVerb: "owned by user", isRequired: true },
  { relatedId: D.application_interfaces, verb: "owns_application_interface", inverseVerb: "owned by user", isRequired: false },
  { relatedId: D.business_capability_maps, verb: "owns_business_capability_map", inverseVerb: "owned by user", isRequired: false },
  { relatedId: D.technology_fit_assessments, verb: "assesses_technology_fit", inverseVerb: "assessed by user", isRequired: true },
  { relatedId: D.application_value_scores, verb: "evaluates_application_value", inverseVerb: "evaluated by user", isRequired: false },
];
async function step4_usersEdges() {
  console.log("\n[4] data_object_relationships: users edges");
  const existing = await get(`/data_object_relationships?data_object_id=eq.${USERS_ID}&related_data_object_id=in.(${Object.values(D).join(",")})&select=related_data_object_id,relationship_verb`);
  const existingSet = new Set(existing.map(r => `${r.related_data_object_id}:${r.relationship_verb}`));
  const missing = usersEdges
    .filter(e => !existingSet.has(`${e.relatedId}:${e.verb}`))
    .map(e => ({
      data_object_id: USERS_ID,
      related_data_object_id: e.relatedId,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      relationship_verb: e.verb,
      inverse_verb: e.inverseVerb,
      is_required: e.isRequired,
      owner_side: "source",
      notes: "Rule #10 built-in users edge",
    }));
  if (missing.length === 0) { console.log("  nothing to insert"); return; }
  console.log(`  inserting ${missing.length} new`);
  await post("/data_object_relationships", missing);
}

// ============================================================
// 5. data_object_lifecycle_states (B12)
// ============================================================
type StateRow = { dataObjectId: number; stateName: string; stateOrder: number; description: string; isInitial?: boolean; isTerminal?: boolean; requiresPermission?: boolean; permissionVerbOverride?: string; moduleId: number };
const lifecycleStates: StateRow[] = [
  // enterprise_applications (267) — APM-PORTFOLIO-REGISTRY
  { dataObjectId: D.enterprise_applications, stateName: "planned", stateOrder: 10, isInitial: true, description: "Application proposed; portfolio entry created; no production usage yet.", moduleId: M_REGISTRY },
  { dataObjectId: D.enterprise_applications, stateName: "developing", stateOrder: 20, description: "Build / configuration in progress; not yet in production.", moduleId: M_REGISTRY },
  { dataObjectId: D.enterprise_applications, stateName: "operating", stateOrder: 30, description: "Production application; actively used by the business.", moduleId: M_REGISTRY },
  { dataObjectId: D.enterprise_applications, stateName: "sunsetting", stateOrder: 40, requiresPermission: true, permissionVerbOverride: "sunset_application", description: "Sunset decision recorded; user migration and contract wind-down underway.", moduleId: M_REGISTRY },
  { dataObjectId: D.enterprise_applications, stateName: "retired", stateOrder: 50, isTerminal: true, description: "Application decommissioned; no longer in production.", moduleId: M_REGISTRY },

  // technology_platforms (269) — APM-PORTFOLIO-REGISTRY
  { dataObjectId: D.technology_platforms, stateName: "emerging", stateOrder: 10, isInitial: true, description: "Newly evaluated; pilots and proofs of concept only.", moduleId: M_REGISTRY },
  { dataObjectId: D.technology_platforms, stateName: "standard", stateOrder: 20, description: "Approved for use; recommended for new application builds.", moduleId: M_REGISTRY },
  { dataObjectId: D.technology_platforms, stateName: "declining", stateOrder: 30, requiresPermission: true, permissionVerbOverride: "decline_technology_platform", description: "Discouraged for new use; existing applications should plan migration.", moduleId: M_REGISTRY },
  { dataObjectId: D.technology_platforms, stateName: "retired", stateOrder: 40, isTerminal: true, requiresPermission: true, permissionVerbOverride: "retire_technology_platform", description: "Platform removed from the supported list; remediation required for any remaining usage.", moduleId: M_REGISTRY },

  // business_capability_maps (248) — APM-PORTFOLIO-REGISTRY
  { dataObjectId: D.business_capability_maps, stateName: "draft", stateOrder: 10, isInitial: true, description: "Capability map under construction by an Enterprise Architect.", moduleId: M_REGISTRY },
  { dataObjectId: D.business_capability_maps, stateName: "published", stateOrder: 20, requiresPermission: true, permissionVerbOverride: "publish_business_capability_map", description: "Capability map approved and published as the active reference.", moduleId: M_REGISTRY },
  { dataObjectId: D.business_capability_maps, stateName: "superseded", stateOrder: 30, isTerminal: true, description: "Replaced by a newer published version.", moduleId: M_REGISTRY },

  // application_interfaces (271) — APM-PORTFOLIO-REGISTRY
  { dataObjectId: D.application_interfaces, stateName: "active", stateOrder: 10, isInitial: true, description: "Integration point in production use.", moduleId: M_REGISTRY },
  { dataObjectId: D.application_interfaces, stateName: "deprecated", stateOrder: 20, requiresPermission: true, permissionVerbOverride: "deprecate_application_interface", description: "Marked for retirement; new consumers blocked; migration tracked.", moduleId: M_REGISTRY },
  { dataObjectId: D.application_interfaces, stateName: "retired", stateOrder: 30, isTerminal: true, requiresPermission: true, permissionVerbOverride: "retire_application_interface", description: "Integration point removed; no consumers remain.", moduleId: M_REGISTRY },

  // technology_fit_assessments (270) — APM-RATIONALIZATION
  { dataObjectId: D.technology_fit_assessments, stateName: "draft", stateOrder: 10, isInitial: true, description: "Assessment under construction by an architect; criteria scored.", moduleId: M_RATIONAL },
  { dataObjectId: D.technology_fit_assessments, stateName: "in_review", stateOrder: 20, description: "Assessment submitted for architect-of-record sign-off.", moduleId: M_RATIONAL },
  { dataObjectId: D.technology_fit_assessments, stateName: "approved", stateOrder: 30, isTerminal: true, requiresPermission: true, permissionVerbOverride: "approve_technology_fit_assessment", description: "Architect-of-record sign-off complete; assessment is the active reference for the assessed application.", moduleId: M_RATIONAL },
];
async function step5_lifecycleStates() {
  console.log("\n[5] data_object_lifecycle_states");
  const existing = await get(`/data_object_lifecycle_states?data_object_id=in.(${[D.enterprise_applications, D.technology_platforms, D.business_capability_maps, D.application_interfaces, D.technology_fit_assessments].join(",")})&select=data_object_id,state_name`);
  const existingSet = new Set(existing.map(r => `${r.data_object_id}:${r.state_name}`));
  const missing = lifecycleStates
    .filter(s => !existingSet.has(`${s.dataObjectId}:${s.stateName}`))
    .map(s => ({
      data_object_id: s.dataObjectId,
      state_name: s.stateName,
      state_order: s.stateOrder,
      description: s.description,
      is_initial: s.isInitial ?? false,
      is_terminal: s.isTerminal ?? false,
      requires_permission: s.requiresPermission ?? false,
      permission_verb_override: s.permissionVerbOverride ?? "",
      domain_module_id: s.moduleId,
    }));
  if (missing.length === 0) { console.log("  nothing to insert"); return; }
  console.log(`  inserting ${missing.length} new`);
  await post("/data_object_lifecycle_states", missing);
}

// ============================================================
// 6. handoffs — B9 fan-out (events 211, 212, 213)
// ============================================================
const fanouts: Array<{ triggerEventId: number; sourceDataObjectId: number; targetDomainId: number; integrationPattern: string; frictionLevel: string; description: string }> = [
  // 211 technology_fit.assessment_completed
  { triggerEventId: 211, sourceDataObjectId: D.technology_fit_assessments, targetDomainId: 15, integrationPattern: "api_call", frictionLevel: "medium", description: "Technology fit assessment completion notifies GRC for architecture risk classification and policy compliance routing." },
  // 212 application_cost.updated
  { triggerEventId: 212, sourceDataObjectId: D.application_costs, targetDomainId: 41, integrationPattern: "batch_sync", frictionLevel: "medium", description: "Quarterly application TCO refresh feeds FINOPS allocation reports for application-level cloud spend reconciliation." },
  { triggerEventId: 212, sourceDataObjectId: D.application_costs, targetDomainId: 66, integrationPattern: "batch_sync", frictionLevel: "medium", description: "Application TCO refresh feeds EPM consolidation for IT-spend budget vs actual reporting." },
  // 213 application_value.recalculated
  { triggerEventId: 213, sourceDataObjectId: D.application_value_scores, targetDomainId: 9, integrationPattern: "event_stream", frictionLevel: "high", description: "Quarterly value-score refresh feeds SPM portfolio reviews; outliers trigger invest/eliminate decisions. High friction: probabilistic score becomes deterministic portfolio action; false positives drive defensive review work." },
];
async function step6_fanoutHandoffs() {
  console.log("\n[6] handoffs: B9 fan-out");
  const existing = await get(`/handoffs?source_domain_id=eq.${APM_ID}&trigger_event_id=in.(211,212,213)&select=trigger_event_id,target_domain_id`);
  const existingSet = new Set(existing.map(r => `${r.trigger_event_id}:${r.target_domain_id}`));
  const missing = fanouts
    .filter(f => !existingSet.has(`${f.triggerEventId}:${f.targetDomainId}`))
    .map(f => ({
      source_domain_id: APM_ID,
      target_domain_id: f.targetDomainId,
      source_domain_module_id: M_RATIONAL,        // events 211/212/213 all fire on RATIONALIZATION masters
      target_domain_module_id: null,              // target side NULL until target domains are modularized
      data_object_id: f.sourceDataObjectId,
      trigger_event_id: f.triggerEventId,
      integration_pattern: f.integrationPattern,
      friction_level: f.frictionLevel,
      description: f.description,
      notes: "target NULL until target domain is modularized",
    }));
  if (missing.length === 0) { console.log("  nothing to insert"); return; }
  console.log(`  inserting ${missing.length} new`);
  await post("/handoffs", missing);
}

// ============================================================
// 7. handoffs — B10b backfill source_domain_module_id (8 outbound + 2 inbound target side)
// ============================================================
async function step7_b10bBackfill() {
  console.log("\n[7] handoffs B10b backfill");

  // 7a. 8 outbound source side -> M_REGISTRY (all source events on data_objects 267/269/271, all mastered by REGISTRY)
  const outbound = await get(`/handoffs?source_domain_id=eq.${APM_ID}&source_domain_module_id=is.null&select=id,data_object_id,trigger_event_id`);
  for (const h of outbound) {
    // Determine: source data_object's master module
    const doId = Number(h.data_object_id);
    let moduleId: number;
    if ([D.enterprise_applications, D.technology_platforms, D.application_interfaces, D.business_capability_maps].includes(doId)) {
      moduleId = M_REGISTRY;
    } else if ([D.application_costs, D.application_value_scores, D.technology_fit_assessments].includes(doId)) {
      moduleId = M_RATIONAL;
    } else {
      console.log(`  WARN: outbound handoff ${h.id} on data_object ${doId} has no APM master mapping; skipping`);
      continue;
    }
    await patch(`/handoffs?id=eq.${h.id}`, { source_domain_module_id: moduleId });
  }
  console.log(`  outbound source_domain_module_id: patched ${outbound.length} rows`);

  // 7b. 2 inbound target side -> M_REGISTRY (BPA -> APM on business_capability_maps + business_process_models, both consumed by REGISTRY)
  const inbound = await get(`/handoffs?target_domain_id=eq.${APM_ID}&target_domain_module_id=is.null&select=id,data_object_id`);
  for (const h of inbound) {
    const doId = Number(h.data_object_id);
    // both 247 (business_process_models) and 248 (business_capability_maps) sit on REGISTRY
    if ([D.business_process_models, D.business_capability_maps].includes(doId)) {
      await patch(`/handoffs?id=eq.${h.id}`, { target_domain_module_id: M_REGISTRY });
    } else {
      console.log(`  WARN: inbound handoff ${h.id} on data_object ${doId} has no APM module mapping; skipping`);
    }
  }
  console.log(`  inbound target_domain_module_id: patched ${inbound.length} rows`);
}

async function main() {
  console.log("Tranche 2 starting");
  await step1_dataObjectsConsumer();
  await step2_DMDO();
  await step3_dataObjectsPatches();
  await step4_usersEdges();
  await step5_lifecycleStates();
  await step6_fanoutHandoffs();
  await step7_b10bBackfill();
  console.log("\nTranche 2 done");
}
await main();
