#!/usr/bin/env bun
// a3 + a4 + a5 b3 additive load for ATS (domain 56). All record_status defaults to 'new' (Rule #1).
//   a3: right_to_work_verifications (master in ATS-PRE-EMPLOYEE-RECORD, module 8; operational_workflow; optional/jurisdiction-conditional Rule #16)
//   a4: agency_submissions          (master in ATS-CANDIDATE-CRM,      module 1; operational_record)
//   a5: outreach_sequences + outreach_sequence_steps (masters in ATS-CANDIDATE-CRM, module 1; sequence=operational_workflow, step=catalog child)
// Idempotent: insert data_objects only if missing; re-read for ids; then DMDO / lifecycle / rels / aliases.

import { spawn } from "bun";

async function call(method: string, path: string, body?: any): Promise<any> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${method} ${path} failed: ${await new Response(proc.stderr).text()}`);
  return out ? JSON.parse(out) : null;
}

const CANDIDATES = 3, RECRUITMENT_AGENCIES = 13, USERS = 748;
const M_CANDIDATE_CRM = 1, M_PRE_EMPLOYEE = 8;

const NAMES = ["right_to_work_verifications", "agency_submissions", "outreach_sequences", "outreach_sequence_steps"];

// ---- 1. data_objects (insert missing) ----
const newObjects = [
  {
    data_object_name: "right_to_work_verifications",
    singular_label: "Right to Work Verification",
    plural_label: "Right to Work Verifications",
    description: "Pre-hire right-to-work verification event (the I-9 employment eligibility check or E-Verify confirmation itself), distinct from the supporting documents the candidate provides. Tracks the verification method, status, verifier, completion date, and any tentative or final non-confirmation, and handles data subject to federal employment-eligibility law.",
    entity_type: "operational_workflow",
    has_personal_content: true,
    has_submit_lock: false,
    has_single_approver: false,
    kind: "domain_owned",
  },
  {
    data_object_name: "agency_submissions",
    singular_label: "Agency Submission",
    plural_label: "Agency Submissions",
    description: "Record of a staffing or search agency submitting a candidate against a requisition. Carries the submission date, the ownership and dedup window that determines which agency owns a placement when more than one submits the same person, and the fee terms that apply if the submission converts to a hire.",
    entity_type: "operational_record",
    has_personal_content: false,
    has_submit_lock: false,
    has_single_approver: false,
    kind: "domain_owned",
  },
  {
    data_object_name: "outreach_sequences",
    singular_label: "Outreach Sequence",
    plural_label: "Outreach Sequences",
    description: "Named multi-step sourcing cadence definition (for example day 0 email, day 3 nudge, day 7 message) that automates candidate outreach. Holds the sequence name, owner, channel mix, and active status, and is the parent of its ordered steps.",
    entity_type: "operational_workflow",
    has_personal_content: false,
    has_submit_lock: false,
    has_single_approver: false,
    kind: "domain_owned",
  },
  {
    data_object_name: "outreach_sequence_steps",
    singular_label: "Outreach Sequence Step",
    plural_label: "Outreach Sequence Steps",
    description: "One ordered step within an outreach sequence: the channel, the day offset from enrollment, the message template, and whether the step is automated or requires a recruiter action. Defines the cadence the platform follows when a candidate is enrolled in the parent sequence.",
    entity_type: "catalog",
    has_personal_content: false,
    has_submit_lock: false,
    has_single_approver: false,
    kind: "domain_owned",
  },
];

const inFilter = `(${NAMES.join(",")})`;
const existing = await call("GET", `/data_objects?data_object_name=in.${inFilter}&select=id,data_object_name`);
const haveNames = new Set(existing.map((r: any) => r.data_object_name));
const toInsert = newObjects.filter((o) => !haveNames.has(o.data_object_name));
if (toInsert.length) {
  await call("POST", "/data_objects", toInsert);
  console.log(`inserted ${toInsert.length} data_objects: ${toInsert.map((o) => o.data_object_name).join(", ")}`);
} else {
  console.log("data_objects already present");
}

// re-read for id map
const objRows = await call("GET", `/data_objects?data_object_name=in.${inFilter}&select=id,data_object_name`);
const idByName: Record<string, number> = {};
for (const r of objRows) idByName[r.data_object_name] = r.id;
const RTW = idByName["right_to_work_verifications"],
  AS = idByName["agency_submissions"],
  OS = idByName["outreach_sequences"],
  OSS = idByName["outreach_sequence_steps"];
console.log("ids:", { right_to_work_verifications: RTW, agency_submissions: AS, outreach_sequences: OS, outreach_sequence_steps: OSS });

// ---- 2. domain_module_data_objects (master rows) ----
const dmdo = [
  // right-to-work: jurisdiction-conditional compliance master -> optional (Rule #16)
  { domain_module_id: M_PRE_EMPLOYEE, data_object_id: RTW, role: "master", necessity: "optional" },
  // agency submissions: core to any agency-fed pipeline -> required
  { domain_module_id: M_CANDIDATE_CRM, data_object_id: AS, role: "master", necessity: "required" },
  // outreach sequence + step: core sourcing primitive -> required
  { domain_module_id: M_CANDIDATE_CRM, data_object_id: OS, role: "master", necessity: "required" },
  { domain_module_id: M_CANDIDATE_CRM, data_object_id: OSS, role: "master", necessity: "required" },
];
const ids4 = [RTW, AS, OS, OSS].join(",");
const dmdoExisting = await call("GET", `/domain_module_data_objects?data_object_id=in.(${ids4})&role=eq.master&select=data_object_id`);
const haveDmdo = new Set(dmdoExisting.map((r: any) => r.data_object_id));
const dmdoToInsert = dmdo.filter((d) => !haveDmdo.has(d.data_object_id));
if (dmdoToInsert.length) { await call("POST", "/domain_module_data_objects", dmdoToInsert); }
console.log(`DMDO master rows inserted: ${dmdoToInsert.length}`);

// ---- 3. lifecycle states (operational_workflow masters only) ----
// right_to_work_verifications
const lcRtwExisting = await call("GET", `/data_object_lifecycle_states?data_object_id=eq.${RTW}&select=state_name`);
if (lcRtwExisting.length === 0) {
  const states = [
    { data_object_id: RTW, state_name: "pending", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: null },
    { data_object_id: RTW, state_name: "in_progress", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: null },
    { data_object_id: RTW, state_name: "verified", state_order: 3, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "verify_right_to_work", domain_module_id: M_PRE_EMPLOYEE },
    { data_object_id: RTW, state_name: "tentative_nonconfirmation", state_order: 4, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: null },
    { data_object_id: RTW, state_name: "final_nonconfirmation", state_order: 5, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: null },
    { data_object_id: RTW, state_name: "closed", state_order: 6, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: null },
  ];
  await call("POST", "/data_object_lifecycle_states", states);
  console.log(`RTW lifecycle states inserted: ${states.length}`);
} else { console.log("RTW lifecycle states already present"); }

// outreach_sequences (active/paused cadence definition)
const lcOsExisting = await call("GET", `/data_object_lifecycle_states?data_object_id=eq.${OS}&select=state_name`);
if (lcOsExisting.length === 0) {
  const states = [
    { data_object_id: OS, state_name: "draft", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: null },
    { data_object_id: OS, state_name: "active", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "activate_outreach_sequence", domain_module_id: M_CANDIDATE_CRM },
    { data_object_id: OS, state_name: "paused", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: null },
    { data_object_id: OS, state_name: "archived", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: null },
  ];
  await call("POST", "/data_object_lifecycle_states", states);
  console.log(`outreach_sequences lifecycle states inserted: ${states.length}`);
} else { console.log("outreach_sequences lifecycle states already present"); }

// ---- 4. data_object_relationships ----
const rels = [
  // a3 right_to_work_verifications
  { data_object_id: CANDIDATES, related_data_object_id: RTW, relationship_verb: "verified_via", inverse_verb: "for", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { data_object_id: RTW, related_data_object_id: USERS, relationship_verb: "has verifier", inverse_verb: "verifies", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // a4 agency_submissions
  { data_object_id: RECRUITMENT_AGENCIES, related_data_object_id: AS, relationship_verb: "submits_via", inverse_verb: "from", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { data_object_id: CANDIDATES, related_data_object_id: AS, relationship_verb: "submitted_via", inverse_verb: "concerns", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { data_object_id: AS, related_data_object_id: USERS, relationship_verb: "has owner", inverse_verb: "owns", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // a5 outreach_sequences + steps
  { data_object_id: OS, related_data_object_id: OSS, relationship_verb: "contains", inverse_verb: "belongs to", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
  { data_object_id: OS, related_data_object_id: USERS, relationship_verb: "has owner", inverse_verb: "owns", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
];
const relExisting = await call("GET", `/data_object_relationships?or=(data_object_id.in.(${ids4}),related_data_object_id.in.(${ids4}))&select=data_object_id,related_data_object_id`);
const relKey = (a: number, b: number) => `${a}:${b}`;
const haveRel = new Set(relExisting.map((r: any) => relKey(r.data_object_id, r.related_data_object_id)));
const relToInsert = rels.filter((r) => !haveRel.has(relKey(r.data_object_id, r.related_data_object_id)));
if (relToInsert.length) { await call("POST", "/data_object_relationships", relToInsert); }
console.log(`relationships inserted: ${relToInsert.length}`);

// ---- 5. data_object_aliases ----
const aliases = [
  { data_object_id: RTW, alias_name: "I-9 Verification", alias_type: "synonym" },
  { data_object_id: RTW, alias_name: "E-Verify Check", alias_type: "synonym" },
  { data_object_id: RTW, alias_name: "Employment Eligibility Verification", alias_type: "synonym" },
  { data_object_id: AS, alias_name: "Agency Candidate Submission", alias_type: "synonym" },
  { data_object_id: AS, alias_name: "Agency Referral", alias_type: "synonym" },
  { data_object_id: OS, alias_name: "Sourcing Cadence", alias_type: "synonym" },
  { data_object_id: OS, alias_name: "Outreach Campaign", alias_type: "synonym" },
  { data_object_id: OSS, alias_name: "Cadence Step", alias_type: "synonym" },
];
const aliasExisting = await call("GET", `/data_object_aliases?data_object_id=in.(${ids4})&select=data_object_id,alias_name`);
const haveAlias = new Set(aliasExisting.map((r: any) => `${r.data_object_id}:${r.alias_name}`));
const aliasToInsert = aliases.filter((a) => !haveAlias.has(`${a.data_object_id}:${a.alias_name}`));
if (aliasToInsert.length) { await call("POST", "/data_object_aliases", aliasToInsert); }
console.log(`aliases inserted: ${aliasToInsert.length}`);

console.log("\na3 + a4 + a5 load complete.");
