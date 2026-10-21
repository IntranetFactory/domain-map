#!/usr/bin/env bun
// .tmp_deploy/apply_hcm_a2_2026_06_09.ts
//
// Apply the 2nd a-HCM.md (Rule #22 go-signal). Decisions:
//   a4 (B1A-SELF-CONTAIN, yes):  DESTRUCTIVE per-row M9 fix (7 DMDO rows). Approved by a-file.
//   a5 (B2-DEPENDENTS, a):        load employee_dependents as HCM master; keep benefit_dependents distinct.
//   a1 (B2-S5r, a):               module 56 masters a self-service request object. The clean, missing,
//                                 HCM-owned one is worker_change_requests (life_events=BEN-ADMIN,
//                                 onboarding_tasks=ONBOARDING, change_requests=taken -> NOT re-mastered).
//   a2 (B2-S6r, yes):            internal-mobility handoff HCM -> ATS on new event employee.applied_internally.
//   a3 (confirm) / a6 (postpone): no writes.
import { pg } from "../scripts/lib/catalog";

const M54 = 54, M55 = 55, M56 = 56;     // HCM modules
const EMPLOYEES = 31, USERS = 748, CANDIDATES = 3;
const ATS_DOMAIN = 56, ATS_CANDIDATE_CRM = 1;
const PROC_EMP_DATA = 243;               // Manage and maintain employee data (already RACI-wired 2026-06-08)

// ---------- Part A: a4 M9 self-containment fix (DESTRUCTIVE, user-approved) ----------
// [data_object_id, module_id, patch]
const M9: [number, number, Record<string, string>][] = [
  [749, M56, { role: "embedded_master" }],   // pre_employees: carry a local shell (necessity stays required)
  [3, M56, { necessity: "optional" }],        // candidates
  [10, M56, { necessity: "optional" }],       // candidate_assessments
  [11, M56, { necessity: "optional" }],       // job_offers
  [1, M55, { necessity: "optional" }],        // job_requisitions
  [22, M54, { necessity: "optional" }],       // onboarding_document_collections
  [55, M56, { necessity: "optional" }],       // asset_lifecycle_events (contributor stays)
];
let m9 = 0;
for (const [doid, mid, patch] of M9) {
  await pg("PATCH", `/domain_module_data_objects?domain_module_id=eq.${mid}&data_object_id=eq.${doid}`, patch);
  console.log(`a4 M9: do=${doid} mod=${mid} -> ${JSON.stringify(patch)}`);
  m9++;
}
console.log(`a4 M9 patched: ${m9}`);

// helper: upsert a data_object by name
async function upsertDO(d: Record<string, unknown>): Promise<number> {
  const ex = await pg("GET", `/data_objects?data_object_name=eq.${d.data_object_name}&select=id`);
  if (ex?.length) { console.log(`data_object exists: ${d.data_object_name} (#${ex[0].id})`); return ex[0].id; }
  const created = await pg("POST", "/data_objects", d);
  console.log(`data_object created: ${d.data_object_name} (#${created[0].id})`);
  return created[0].id;
}
async function ensureDMDO(mid: number, doid: number, role: string, necessity: string) {
  const ex = await pg("GET", `/domain_module_data_objects?domain_module_id=eq.${mid}&data_object_id=eq.${doid}&select=id`);
  if (ex?.length) return;
  await pg("POST", "/domain_module_data_objects", { domain_module_id: mid, data_object_id: doid, role, necessity });
}
async function ensureRel(a: number, b: number, body: Record<string, unknown>) {
  const ex = await pg("GET", `/data_object_relationships?data_object_id=eq.${a}&related_data_object_id=eq.${b}&select=id`);
  if (ex?.length) return;
  await pg("POST", "/data_object_relationships", { data_object_id: a, related_data_object_id: b, ...body });
}
async function ensureAlias(doid: number, alias: string) {
  const ex = await pg("GET", `/data_object_aliases?data_object_id=eq.${doid}&alias_name=eq.${encodeURIComponent(alias)}&select=id`);
  if (ex?.length) return;
  await pg("POST", "/data_object_aliases", { data_object_id: doid, alias_name: alias, alias_type: "synonym" });
}

// ---------- Part B: a5 employee_dependents (additive; benefit_dependents left untouched) ----------
const depId = await upsertDO({ data_object_name: "employee_dependents", singular_label: "Employee Dependent", plural_label: "Employee Dependents", entity_type: "operational_record", has_personal_content: true, kind: "domain_owned", description: "Spouse, children, and other dependents of a worker, held as person-level records on the worker. Benefits administration reads these for eligibility and beneficiary designation; the plan-enrollment record is held separately by benefits." });
await ensureDMDO(M54, depId, "master", "optional");
await ensureRel(EMPLOYEES, depId, { relationship_type: "one_to_many", relationship_kind: "composition", relationship_verb: "has", inverse_verb: "belongs_to", is_required: true, owner_side: "source" });
await ensureAlias(depId, "Dependents");
console.log(`a5: employee_dependents ready (#${depId})`);

// ---------- Part C: a1 worker_change_requests master on module 56 (additive) ----------
const wcrId = await upsertDO({ data_object_name: "worker_change_requests", singular_label: "Worker Change Request", plural_label: "Worker Change Requests", entity_type: "operational_workflow", has_personal_content: true, kind: "domain_owned", description: "Self-service request raised by an employee or manager to change worker data (personal details, address, job, or org assignment), routed through an approval workflow before it commits to the worker record. The self-service surface's first-class request object." });
await ensureDMDO(M56, wcrId, "master", "required");
// lifecycle: draft -> submitted -> approved(gate) -> applied; submitted -> rejected
const WCR_STATES: [string, number, boolean, boolean, boolean, number | null][] = [
  ["draft", 1, true, false, false, null],
  ["submitted", 2, false, false, false, null],            // open self-service submit
  ["approved", 3, false, false, true, PROC_EMP_DATA],     // approve gate, wired to Manage employee data RACI
  ["applied", 4, false, true, false, null],
  ["rejected", 5, false, true, false, null],
];
let wcrSt = 0;
for (const [name, order, init, term, perm, proc] of WCR_STATES) {
  const ex = await pg("GET", `/data_object_lifecycle_states?data_object_id=eq.${wcrId}&state_name=eq.${name}&select=id`);
  if (ex?.length) continue;
  const body: Record<string, unknown> = { data_object_id: wcrId, state_name: name, state_order: order, is_initial: init, is_terminal: term, requires_permission: perm, domain_module_id: M56 };
  if (proc != null) body.process_id = proc;
  await pg("POST", "/data_object_lifecycle_states", body);
  wcrSt++;
}
await ensureRel(EMPLOYEES, wcrId, { relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "has", inverse_verb: "about", is_required: true, owner_side: "source" });
await ensureRel(USERS, wcrId, { relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "requests", inverse_verb: "requested_by", is_required: true, owner_side: "source" });
await ensureAlias(wcrId, "Personal Data Change Request");
await ensureAlias(wcrId, "Self-Service Request");
console.log(`a1: worker_change_requests ready (#${wcrId}), ${wcrSt} lifecycle states, approve gate wired to proc ${PROC_EMP_DATA}`);

// ---------- Part D: a2 internal-mobility handoff (additive) ----------
let teId: number;
const exTe = await pg("GET", "/trigger_events?event_name=eq.employee.applied_internally&select=id");
if (exTe?.length) { teId = exTe[0].id; console.log(`trigger_event exists: employee.applied_internally (#${teId})`); }
else {
  const created = await pg("POST", "/trigger_events", { event_name: "employee.applied_internally", data_object_id: EMPLOYEES, event_category: "signal", from_state: "active", to_state: "active", domain_module_id: M54, description: "An existing employee applies to an internal job posting. Materializes an internal candidate in the applicant tracker from the worker record." });
  teId = created[0].id;
  console.log(`trigger_event created: employee.applied_internally (#${teId})`);
}
{
  const ex = await pg("GET", `/handoffs?trigger_event_id=eq.${teId}&source_domain_id=eq.54&target_domain_id=eq.${ATS_DOMAIN}&select=id`);
  if (!ex?.length) {
    await pg("POST", "/handoffs", {
      trigger_event_id: teId, source_domain_id: 54, source_domain_module_id: M54,
      target_domain_id: ATS_DOMAIN, target_domain_module_id: ATS_CANDIDATE_CRM,
      data_object_id: CANDIDATES, integration_pattern: "api_call", friction_level: "medium",
      description: "When an employee applies internally, HCM hands the worker context to the applicant tracker, which materializes an internal candidate record from the worker profile. Friction: reconciling the worker identity against the candidate identity space.",
    });
    console.log("a2: handoff HCM -> ATS on employee.applied_internally created");
  } else console.log("a2: handoff exists, skip");
}
await ensureRel(EMPLOYEES, CANDIDATES, { relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "applies_as", inverse_verb: "sourced_from", is_required: false, owner_side: "source" });
console.log("done.");
