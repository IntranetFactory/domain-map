#!/usr/bin/env bun
// a6 + a7 b3 additive load for ATS (domain 56). All record_status defaults to 'new' (Rule #1).
//   a6: candidate_emails  (master in ATS-CANDIDATE-CRM, module 1; operational_record)
//   a7: drug_health_screenings (master in ATS-BACKGROUND-CHECKS, module 7; operational_workflow)
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

const CANDIDATES = 3, USERS = 748;
const M_CANDIDATE_CRM = 1, M_BACKGROUND = 7;

// ---- 1. data_objects (insert missing) ----
const newObjects = [
  {
    data_object_name: "candidate_emails",
    singular_label: "Candidate Email",
    plural_label: "Candidate Emails",
    description: "Persisted email correspondence with a candidate as a first-class threaded record, distinct from free-text application notes and engagement summaries. Captures sent and received messages, the template used, and delivery status across the candidate relationship.",
    entity_type: "operational_record",
    has_personal_content: true,
    has_submit_lock: false,
    has_single_approver: false,
    kind: "domain_owned",
  },
  {
    data_object_name: "drug_health_screenings",
    singular_label: "Drug and Health Screening",
    plural_label: "Drug and Health Screenings",
    description: "Pre-employment drug test or occupational health screening ordered as a check distinct from the criminal and employment background check. Tracks the order, provider, result, and any adverse-finding review, and handles sensitive medical data subject to ADA and state-law restrictions.",
    entity_type: "operational_workflow",
    has_personal_content: true,
    has_submit_lock: false,
    has_single_approver: false,
    kind: "domain_owned",
  },
];

const existing = await call("GET", "/data_objects?data_object_name=in.(candidate_emails,drug_health_screenings)&select=id,data_object_name");
const haveNames = new Set(existing.map((r: any) => r.data_object_name));
const toInsert = newObjects.filter((o) => !haveNames.has(o.data_object_name));
if (toInsert.length) {
  await call("POST", "/data_objects", toInsert);
  console.log(`inserted ${toInsert.length} data_objects`);
} else {
  console.log("data_objects already present");
}

// re-read for id map
const objRows = await call("GET", "/data_objects?data_object_name=in.(candidate_emails,drug_health_screenings)&select=id,data_object_name");
const idByName: Record<string, number> = {};
for (const r of objRows) idByName[r.data_object_name] = r.id;
const CE = idByName["candidate_emails"], DHS = idByName["drug_health_screenings"];
console.log("ids:", { candidate_emails: CE, drug_health_screenings: DHS });

// ---- 2. domain_module_data_objects (master rows) ----
const dmdo = [
  { domain_module_id: M_CANDIDATE_CRM, data_object_id: CE, role: "master", necessity: "required" },
  { domain_module_id: M_BACKGROUND, data_object_id: DHS, role: "master", necessity: "optional" },
];
const dmdoExisting = await call("GET", `/domain_module_data_objects?data_object_id=in.(${CE},${DHS})&role=eq.master&select=data_object_id`);
const haveDmdo = new Set(dmdoExisting.map((r: any) => r.data_object_id));
const dmdoToInsert = dmdo.filter((d) => !haveDmdo.has(d.data_object_id));
if (dmdoToInsert.length) { await call("POST", "/domain_module_data_objects", dmdoToInsert); }
console.log(`DMDO master rows inserted: ${dmdoToInsert.length}`);

// ---- 3. lifecycle states for the operational_workflow master (drug_health_screenings) ----
const lcExisting = await call("GET", `/data_object_lifecycle_states?data_object_id=eq.${DHS}&select=state_name`);
if (lcExisting.length === 0) {
  const states = [
    { data_object_id: DHS, state_name: "ordered", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: null },
    { data_object_id: DHS, state_name: "in_progress", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: null },
    { data_object_id: DHS, state_name: "passed", state_order: 3, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: null },
    { data_object_id: DHS, state_name: "failed", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "review_failed_screening", domain_module_id: M_BACKGROUND },
    { data_object_id: DHS, state_name: "cancelled", state_order: 5, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: null },
  ];
  await call("POST", "/data_object_lifecycle_states", states);
  console.log(`lifecycle states inserted: ${states.length}`);
} else {
  console.log("lifecycle states already present");
}

// ---- 4. data_object_relationships (intra-domain subject edge + users edge per Rule #10) ----
const rels = [
  // candidates -> candidate_emails (parent-first one_to_many; one candidate has many emails)
  { data_object_id: CANDIDATES, related_data_object_id: CE, relationship_verb: "corresponds_via", inverse_verb: "concerns", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // candidate_emails -> users (sender; ATS user-edge convention: many_to_many, reference, owner_side=source, "has <role>")
  { data_object_id: CE, related_data_object_id: USERS, relationship_verb: "has sender", inverse_verb: "sends", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // candidates -> drug_health_screenings (parent-first one_to_many)
  { data_object_id: CANDIDATES, related_data_object_id: DHS, relationship_verb: "screened_via", inverse_verb: "for", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // drug_health_screenings -> users (coordinator)
  { data_object_id: DHS, related_data_object_id: USERS, relationship_verb: "has coordinator", inverse_verb: "coordinates", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
];
const relExisting = await call("GET", `/data_object_relationships?or=(data_object_id.in.(${CE},${DHS}),related_data_object_id.in.(${CE},${DHS}))&select=data_object_id,related_data_object_id`);
const relKey = (a: number, b: number) => `${a}:${b}`;
const haveRel = new Set(relExisting.map((r: any) => relKey(r.data_object_id, r.related_data_object_id)));
const relToInsert = rels.filter((r) => !haveRel.has(relKey(r.data_object_id, r.related_data_object_id)));
if (relToInsert.length) { await call("POST", "/data_object_relationships", relToInsert); }
console.log(`relationships inserted: ${relToInsert.length}`);

// ---- 5. data_object_aliases ----
const aliases = [
  { data_object_id: CE, alias_name: "Candidate Correspondence", alias_type: "synonym" },
  { data_object_id: CE, alias_name: "Candidate Messages", alias_type: "synonym" },
  { data_object_id: DHS, alias_name: "Drug Test", alias_type: "synonym" },
  { data_object_id: DHS, alias_name: "Pre-Employment Drug Screening", alias_type: "synonym" },
  { data_object_id: DHS, alias_name: "Occupational Health Screening", alias_type: "synonym" },
];
const aliasExisting = await call("GET", `/data_object_aliases?data_object_id=in.(${CE},${DHS})&select=data_object_id,alias_name`);
const haveAlias = new Set(aliasExisting.map((r: any) => `${r.data_object_id}:${r.alias_name}`));
const aliasToInsert = aliases.filter((a) => !haveAlias.has(`${a.data_object_id}:${a.alias_name}`));
if (aliasToInsert.length) { await call("POST", "/data_object_aliases", aliasToInsert); }
console.log(`aliases inserted: ${aliasToInsert.length}`);

console.log("\na6 + a7 load complete.");
