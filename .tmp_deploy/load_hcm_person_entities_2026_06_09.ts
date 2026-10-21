#!/usr/bin/env bun
// .tmp_deploy/load_hcm_person_entities_2026_06_09.ts
//
// HCM continuation (a-HCM.md a10/a11): load the person-adjacent entities whose Phase-0
// vendor surface places them clearly on HCM-CORE-WORKER (54), plus the one statute that
// belongs on HCM. Additive, record_status defaults to 'new' (Rule #1). All idempotent.
//
// LOADED (4 masters on module 54): emergency_contacts, work_eligibility_documents,
//   national_ids, worker_addresses. (employee_dependents is HELD OUT: it collides with the
//   existing benefit_dependents (148, BEN-ADMIN) -> ownership question surfaced to the user.)
// NOT loaded here (routed to neighbor domains as b3): worker_bank_accounts -> PAYROLL,
//   medical_certifications -> WFM, i9_records -> ONBOARDING, pay_equity_assessments -> analytics.
// Statutes: only US State Pay Transparency Laws lands on HCM; FMLA/I-9/HIPAA-BAA route to
//   WFM/ONBOARDING/BEN-ADMIN respectively (neighbor b3).
import { pg } from "../scripts/lib/catalog";

const M54 = 54;        // HCM-CORE-WORKER
const EMPLOYEES = 31;  // employees master
const USERS = 748;     // platform_builtin users

const DOS = [
  { data_object_name: "emergency_contacts", singular_label: "Emergency Contact", plural_label: "Emergency Contacts", entity_type: "operational_record", has_personal_content: true, kind: "domain_owned", description: "People to contact in an emergency for a worker, with priority ordering and relationship. Holds personal data on third parties beyond the employee." },
  { data_object_name: "work_eligibility_documents", singular_label: "Work Eligibility Document", plural_label: "Work Eligibility Documents", entity_type: "operational_workflow", has_personal_content: true, kind: "domain_owned", description: "Right-to-work evidence for a worker: visa, work permit, or equivalent authorization, effective-dated with an expiry the system tracks. Jurisdiction-conditional and access-restricted. Distinct from the US-specific hiring I-9 record." },
  { data_object_name: "national_ids", singular_label: "National ID", plural_label: "National IDs", entity_type: "operational_record", has_personal_content: true, kind: "domain_owned", description: "Government-issued identity numbers for a worker, such as social security or national insurance numbers, held with restricted access and validity dates. Jurisdiction-specific." },
  { data_object_name: "worker_addresses", singular_label: "Worker Address", plural_label: "Worker Addresses", entity_type: "operational_record", has_personal_content: true, kind: "domain_owned", description: "Home, work, and mailing addresses for a worker, effective-dated and typed by purpose, supporting multi-jurisdiction and country-variant formats." },
];

const idByName: Record<string, number> = {};
for (const d of DOS) {
  const ex = await pg("GET", `/data_objects?data_object_name=eq.${d.data_object_name}&select=id`);
  if (ex?.length) { idByName[d.data_object_name] = ex[0].id; console.log(`data_object exists: ${d.data_object_name} (#${ex[0].id})`); continue; }
  const created = await pg("POST", "/data_objects", d);
  idByName[d.data_object_name] = created[0].id;
  console.log(`data_object created: ${d.data_object_name} (#${created[0].id})`);
}

// DMDO master + optional on module 54
let dmdo = 0;
for (const name of Object.keys(idByName)) {
  const doid = idByName[name];
  const ex = await pg("GET", `/domain_module_data_objects?domain_module_id=eq.${M54}&data_object_id=eq.${doid}&select=id`);
  if (ex?.length) continue;
  await pg("POST", "/domain_module_data_objects", { domain_module_id: M54, data_object_id: doid, role: "master", necessity: "optional" });
  dmdo++;
}
console.log(`domain_module_data_objects created: ${dmdo}`);

// relationships: employees (parent) composes each child (one_to_many, composition, owner=source)
let rel = 0;
for (const name of Object.keys(idByName)) {
  const child = idByName[name];
  const ex = await pg("GET", `/data_object_relationships?data_object_id=eq.${EMPLOYEES}&related_data_object_id=eq.${child}&select=id`);
  if (ex?.length) continue;
  await pg("POST", "/data_object_relationships", { data_object_id: EMPLOYEES, related_data_object_id: child, relationship_type: "one_to_many", relationship_kind: "composition", relationship_verb: "has", inverse_verb: "belongs_to", is_required: true, owner_side: "source" });
  rel++;
}
// users verifies work_eligibility_documents (reference, not composition)
{
  const we = idByName["work_eligibility_documents"];
  const ex = await pg("GET", `/data_object_relationships?data_object_id=eq.${USERS}&related_data_object_id=eq.${we}&select=id`);
  if (!ex?.length) {
    await pg("POST", "/data_object_relationships", { data_object_id: USERS, related_data_object_id: we, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "verifies", inverse_verb: "verified_by", is_required: false, owner_side: "source" });
    rel++;
  }
}
console.log(`data_object_relationships created: ${rel}`);

// lifecycle states for work_eligibility_documents (operational_workflow)
const we = idByName["work_eligibility_documents"];
const STATES: [string, number, boolean, boolean, boolean][] = [
  // state_name, order, is_initial, is_terminal, requires_permission
  ["pending_verification", 1, true, false, false],
  ["verified", 2, false, false, true],
  ["expired", 3, false, true, false],
  ["rejected", 4, false, true, false],
];
let st = 0;
for (const [name, order, init, term, perm] of STATES) {
  const ex = await pg("GET", `/data_object_lifecycle_states?data_object_id=eq.${we}&state_name=eq.${name}&select=id`);
  if (ex?.length) continue;
  await pg("POST", "/data_object_lifecycle_states", { data_object_id: we, state_name: name, state_order: order, is_initial: init, is_terminal: term, requires_permission: perm, domain_module_id: M54 });
  st++;
}
console.log(`lifecycle states created: ${st}`);

// aliases (B11) for the non-self-explanatory masters
const ALIASES: [string, string, string][] = [
  // data_object_name, alias_name, alias_type. 'synonym' carries no industry context
  // (industry_term would require an industry_id; these are jurisdiction terms, not sector terms).
  ["national_ids", "SSN", "synonym"],
  ["national_ids", "National Insurance Number", "synonym"],
  ["national_ids", "Government ID", "synonym"],
  ["work_eligibility_documents", "Work Permit", "synonym"],
  ["work_eligibility_documents", "Visa", "synonym"],
  ["work_eligibility_documents", "Right to Work Document", "synonym"],
];
let al = 0;
for (const [name, alias, atype] of ALIASES) {
  const doid = idByName[name];
  const ex = await pg("GET", `/data_object_aliases?data_object_id=eq.${doid}&alias_name=eq.${encodeURIComponent(alias)}&select=id`);
  if (ex?.length) continue;
  await pg("POST", "/data_object_aliases", { data_object_id: doid, alias_name: alias, alias_type: atype });
  al++;
}
console.log(`aliases created: ${al}`);

// regulation: US State Pay Transparency Laws -> HCM (a11)
const regName = "US State Pay Transparency Laws";
let regId: number;
const exReg = await pg("GET", `/regulations?regulation_name=eq.${encodeURIComponent(regName)}&select=id`);
if (exReg?.length) { regId = exReg[0].id; console.log(`regulation exists: ${regName} (#${regId})`); }
else {
  const created = await pg("POST", "/regulations", {
    regulation_name: regName,
    regulation_code: "US-STATE-PAY-TRANSPARENCY",
    regulation_type: "labor_law",
    jurisdiction_id: 3,
    issuing_body: "US state legislatures",
    description: "State-level pay-range disclosure and pay-data reporting requirements enacted by individual US states, including California, Colorado, New York, Washington, and Illinois. Requires salary-range publication on job postings and, in some states, pay-data reporting drawn from worker and compensation records.",
  });
  regId = created[0].id;
  console.log(`regulation created: ${regName} (#${regId})`);
}
{
  const ex = await pg("GET", `/domain_regulations?domain_id=eq.54&regulation_id=eq.${regId}&select=id`);
  if (!ex?.length) {
    await pg("POST", "/domain_regulations", { domain_id: 54, regulation_id: regId, applicability: "conditional" });
    console.log(`domain_regulations created: HCM -> ${regName} (conditional)`);
  } else console.log("domain_regulations exists, skip");
}
console.log("done.");
