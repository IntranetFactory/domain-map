#!/usr/bin/env bun
// scripts/loaders/load_ats_personas_pilot.ts
//
// Plan 3 step E pilot: author the ATS persona / RACI layer FRESH (the _core roles were
// deleted in step D). Function-anchored discovery (Recruiting owns ATS, Legal contributes;
// Hiring Manager is cross-functional). Authors, idempotently (read-before-create on the
// natural key):
//   1. domain_roles  (6 personas)
//   2. role_modules  (reach across the 8 ATS modules)
//   3. data_object_lifecycle_states.process_id  (the process-to-permission edge, 6 gates)
//   4. process_raci  (RACI assignments on the 5 wired processes)
//
// Re-runnable. After it, regenerate the ATS blueprints (B3 in §9 fills in).
import { pg } from "../lib/catalog";

const RECRUITING = 37;
const LEGAL = 7;

// module codes -> ids: CRM=1 POOL=2 REF=3 PIPE=4 INTV=5 OFFER=6 BG=7 PRE-EMP=8
const PERSONAS: { role_code: string; role_name: string; business_function_id: number | null; description: string }[] = [
  { role_code: "RECRUITING-RECRUITER", role_name: "Recruiter", business_function_id: RECRUITING, description: "Owns the requisition-to-offer pipeline for assigned reqs: sources, screens, schedules, drafts and sends offers, drives candidates to hire." },
  { role_code: "RECRUITING-SOURCER", role_name: "Sourcer", business_function_id: RECRUITING, description: "Builds and works talent pools and the candidate CRM; generates qualified pipeline ahead of open reqs." },
  { role_code: "RECRUITING-COORDINATOR", role_name: "Recruiting Coordinator", business_function_id: RECRUITING, description: "Owns interview logistics and offer / pre-employee paperwork; schedules panels and keeps the process moving." },
  { role_code: "RECRUITING-MANAGER", role_name: "Recruiting Manager", business_function_id: RECRUITING, description: "Accountable for the recruiting function's output: approves reqs and offers, owns pipeline health and vendor relationships." },
  { role_code: "HIRING-MANAGER", role_name: "Hiring Manager", business_function_id: null, description: "The role owning the open position. Cross-functional (sits in the hiring department, not Recruiting): defines the req, interviews, decides the hire, approves the offer." },
  { role_code: "LEGAL-COMPLIANCE-SPECIALIST", role_name: "Compliance Specialist", business_function_id: LEGAL, description: "Owns hiring-compliance surfaces: background-check adjudication, FCRA / adverse-action, EEO / OFCCP, and candidate data-subject requests." },
];

const REACH: Record<string, [number, string][]> = {
  "RECRUITING-RECRUITER": [[1, "primary"], [4, "primary"], [5, "primary"], [6, "primary"], [7, "secondary"], [3, "secondary"], [2, "secondary"], [8, "secondary"]],
  "RECRUITING-SOURCER": [[1, "primary"], [2, "primary"], [4, "secondary"], [3, "secondary"]],
  "RECRUITING-COORDINATOR": [[5, "primary"], [1, "secondary"], [4, "secondary"], [6, "secondary"], [8, "secondary"]],
  "RECRUITING-MANAGER": [[4, "primary"], [6, "primary"], [1, "secondary"], [5, "secondary"], [7, "secondary"], [3, "secondary"], [2, "secondary"], [8, "secondary"]],
  "HIRING-MANAGER": [[4, "primary"], [5, "primary"], [6, "primary"], [1, "secondary"]],
  "LEGAL-COMPLIANCE-SPECIALIST": [[7, "primary"], [1, "secondary"], [4, "secondary"]],
};

// [data_object_id, state_name, process_id] : wire the gate to its PCF process.
const WIRING: [number, string, number][] = [
  [2, "published", 220],          // job_postings.published       -> Recruit/Source candidates
  [9, "submitted", 1014],         // interview_scorecards.submitted -> Interview candidates
  [11, "approved", 1017],         // job_offers.approved          -> Draw up and make offer
  [3, "hired", 1019],             // candidates.hired             -> Hire candidate
  [4, "hired", 1019],             // job_applications.hired       -> Hire candidate
  [12, "completed_consider", 222], // background_checks adjudicate -> Manage new hire/re-hire
];

// [process_id, role_code, raci, consultation_blocking]
const RACI: [number, string, string, boolean][] = [
  [220, "RECRUITING-SOURCER", "responsible", false],
  [220, "RECRUITING-RECRUITER", "responsible", false],
  [220, "RECRUITING-MANAGER", "accountable", false],
  [220, "HIRING-MANAGER", "informed", false],
  [1014, "HIRING-MANAGER", "responsible", false],
  [1014, "RECRUITING-MANAGER", "accountable", false],
  [1014, "RECRUITING-RECRUITER", "consulted", false],
  [1014, "RECRUITING-COORDINATOR", "informed", false],
  [1017, "RECRUITING-RECRUITER", "responsible", false],
  [1017, "HIRING-MANAGER", "accountable", false],
  [1017, "RECRUITING-MANAGER", "consulted", false],
  [1019, "RECRUITING-RECRUITER", "responsible", false],
  [1019, "HIRING-MANAGER", "accountable", false],
  [1019, "LEGAL-COMPLIANCE-SPECIALIST", "informed", false],
  [222, "LEGAL-COMPLIANCE-SPECIALIST", "responsible", false],
  [222, "RECRUITING-MANAGER", "accountable", false],
  [222, "RECRUITING-COORDINATOR", "consulted", true],
];

const roleIdByCode: Record<string, number> = {};

for (const p of PERSONAS) {
  const existing = await pg("GET", `/domain_roles?role_code=eq.${p.role_code}&select=id`);
  if (existing && existing.length) {
    roleIdByCode[p.role_code] = existing[0].id as number;
    console.log(`persona exists:  ${p.role_code} (#${existing[0].id})`);
    continue;
  }
  const created = await pg("POST", "/domain_roles", p);
  roleIdByCode[p.role_code] = created[0].id as number;
  console.log(`persona created: ${p.role_code} (#${created[0].id})`);
}

let rmCreated = 0;
for (const [code, rows] of Object.entries(REACH)) {
  const rid = roleIdByCode[code];
  for (const [mid, level] of rows) {
    const ex = await pg("GET", `/role_modules?role_id=eq.${rid}&domain_module_id=eq.${mid}&select=id`);
    if (ex && ex.length) continue;
    await pg("POST", "/role_modules", { role_id: rid, domain_module_id: mid, interaction_level: level });
    rmCreated++;
  }
}
console.log(`role_modules created: ${rmCreated}`);

let wired = 0;
for (const [doid, state, pid] of WIRING) {
  await pg("PATCH", `/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}`, { process_id: pid });
  wired++;
}
console.log(`lifecycle process_id wirings applied: ${wired}`);

let raciCreated = 0;
for (const [pid, code, letter, blocking] of RACI) {
  const rid = roleIdByCode[code];
  const ex = await pg("GET", `/process_raci?process_id=eq.${pid}&actor_role_id=eq.${rid}&raci=eq.${letter}&select=id`);
  if (ex && ex.length) continue;
  await pg("POST", "/process_raci", { process_id: pid, actor_role_id: rid, raci: letter, consultation_blocking: blocking });
  raciCreated++;
}
console.log(`process_raci created: ${raciCreated}`);
console.log("done.");
