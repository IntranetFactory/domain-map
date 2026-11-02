#!/usr/bin/env bun
// ATS (domain 56) Validate pass, 2026-11-01: additive RACI, relationship and alias fixes.
//
//   E4b  wire process_id on the 19 gated lifecycle states that have none (fill empty only)
//   M5   fill domain_module_id on the 7 gated states with NULL module (fill empty only)
//   E4   author process_raci A + R rows for the processes newly wired (1016, 369)
//   B7   add single-person users edges (stored one_to_many from users, the canonical flip of
//        "<entity> many_to_one users") for the masters with a genuine internal actor
//   B11  add data_object_aliases synonyms for non-self-explanatory masters
//
// Insert-only / fill-empty-only (Rule #21). record_status omitted (DB default 'new'), no notes.
// Pre-flight: scripts/lib/catalog_invariants.ts on every batch.
//
// Usage: bun run .tmp_deploy/ats_validate_raci_rels_aliases_2026_11_01.ts          (dry-run)
//        bun run .tmp_deploy/ats_validate_raci_rels_aliases_2026_11_01.ts --apply  (write)

import {
  preflightLifecycleStates,
  preflightProcessRaci,
  preflightRelationships,
  checkProcessRaci,
  checkAccountableAlsoResponsible,
  type LifecycleStateRow,
  type ProcessRaciRow,
  type RelationshipRow,
} from "../scripts/lib/catalog_invariants.ts";

const APPLY = process.argv.includes("--apply");
type Row = Record<string, any>;

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${method} ${path}: ${err || out}`);
  const t = out.trim();
  return t ? JSON.parse(t) : null;
}

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const o: Row = {};
    for (const k of keys) o[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return o;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += 50) {
    const res = await call("POST", path, uniformize(rows.slice(i, i + 50)));
    if (Array.isArray(res)) out.push(...res);
  }
  return out;
}

const EM_DASH = "—";
function assertNoEmDash(label: string, ...texts: unknown[]) {
  for (const t of texts) if (typeof t === "string" && t.includes(EM_DASH)) throw new Error(`em-dash in ${label}: ${t}`);
}

console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

// ---------- natural-key resolution ----------
const DOMAIN_ID = 56;
const modules: Row[] = await call("GET", `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
const modId = new Map(modules.map((m) => [String(m.domain_module_code), Number(m.id)]));
const modCode = new Map(modules.map((m) => [Number(m.id), String(m.domain_module_code)]));
const MOD = (code: string) => {
  const id = modId.get(code);
  if (id == null) throw new Error(`unknown module ${code}`);
  return id;
};

const PROCESS_CODES = ["7.2.1", "7.2.2", "7.2.2.5", "7.2.3.4", "7.2.4", "7.2.4.1", "11.2.2"];
const procs: Row[] = await call(
  "GET",
  `/business_processes?source_framework=eq.apqc_pcf_cross_industry&process_code=in.(${PROCESS_CODES.join(",")})&select=id,process_code,process_name`,
);
const procByCode = new Map(procs.map((p) => [String(p.process_code), p]));
const PROC = (code: string) => {
  const p = procByCode.get(code);
  if (!p) throw new Error(`unknown APQC process ${code}`);
  return Number(p.id);
};
const procLabel = (id: number) => {
  const p = procs.find((x) => Number(x.id) === id);
  return p ? `${p.process_code} ${p.process_name} (#${id})` : `process #${id}`;
};

const roles: Row[] = await call(
  "GET",
  `/domain_roles?role_code=in.(RECRUITING-RECRUITER,RECRUITING-MANAGER,LEGAL-COMPLIANCE-SPECIALIST)&select=id,role_code`,
);
const roleId = new Map(roles.map((r) => [String(r.role_code), Number(r.id)]));
const ROLE = (code: string) => {
  const id = roleId.get(code);
  if (id == null) throw new Error(`unknown persona ${code}`);
  return id;
};
const roleCode = (id: number | null | undefined) => roles.find((r) => Number(r.id) === id)?.role_code ?? `role#${id}`;

// ---------- 1. lifecycle: fill process_id (E4b) and domain_module_id (M5) ----------
// key = "<data_object_name>.<state_name>"; process = APQC code; module = only where currently NULL.
type LcPlan = { key: string; process: string; module?: string; why: string };
const LC_PLAN: LcPlan[] = [
  // ATS-CANDIDATE-CRM
  { key: "candidates.do_not_hire", process: "7.2.3.4", why: "do-not-hire flag is a select/reject eligibility decision" },
  { key: "candidate_consents.withdrawn", process: "11.2.2", module: "ATS-CANDIDATE-CRM", why: "consent withdrawal is privacy regulatory compliance (precedent: gdpr_consent_record.withdrawn tagged 11.2.2)" },
  { key: "data_subject_requests.verified", process: "11.2.2", why: "DSR handling is privacy regulatory compliance (precedent: data_deletion_request.fulfilled tagged 11.2.2)" },
  { key: "data_subject_requests.fulfilled", process: "11.2.2", why: "DSR handling is privacy regulatory compliance" },
  { key: "data_subject_requests.partially_fulfilled", process: "11.2.2", why: "DSR handling is privacy regulatory compliance" },
  { key: "data_subject_requests.rejected", process: "11.2.2", why: "DSR handling is privacy regulatory compliance" },
  { key: "outreach_sequences.active", process: "7.2.2", why: "activating a sourcing outreach cadence is recruit/source work (same process as job_postings.published)" },
  // ATS-OFFERS
  { key: "job_offers.rescinded", process: "7.2.4.1", why: "rescinding belongs with the offer process (job_offers.approved is on 7.2.4.1)" },
  { key: "offer_approvals.approved", process: "7.2.4.1", module: "ATS-OFFERS", why: "shares gate approve_offer with job_offers.approved (7.2.4.1)" },
  { key: "offer_approvals.rejected", process: "7.2.4.1", module: "ATS-OFFERS", why: "the reject leg of the offer approval chain" },
  { key: "offer_letter_templates.approved", process: "7.2.4", why: "template governance of the new-hire offer subprocess; 7.2.4 Accountable (Recruiting Manager) is the right approver, 7.2.4.1's (Hiring Manager) is not" },
  { key: "offer_letter_templates.retired", process: "7.2.4", why: "same template governance as approved" },
  // ATS-PRE-EMPLOYEE-RECORD
  { key: "pre_employees.activated", process: "7.2.4", why: "pre-employee activation completes the new-hire stage (pre_employee.activated handoffs are tagged 7.2.4)" },
  // ATS-RECRUITMENT-PIPELINE
  { key: "job_requisitions.filled", process: "7.2.1", why: "closing a filled requisition is requisition management (job_requisitions.open is on 7.2.1)" },
  { key: "requisition_approvals.approved", process: "7.2.1", module: "ATS-RECRUITMENT-PIPELINE", why: "shares gate approve_requisition with job_requisitions.open (7.2.1)" },
  { key: "requisition_approvals.rejected", process: "7.2.1", module: "ATS-RECRUITMENT-PIPELINE", why: "the reject leg of the requisition approval chain" },
  { key: "applicant_flow_records.dispositioned", process: "7.2.3.4", why: "dispositioning an applicant records the select/reject outcome" },
  // ATS-REFERRALS
  { key: "referral_payouts.approved", process: "7.2.2.5", module: "ATS-REFERRALS", why: "referral payout approval is referral program management (candidate_referrals.bonus_payable is on 7.2.2.5)" },
  { key: "referral_payouts.clawed_back", process: "7.2.2.5", module: "ATS-REFERRALS", why: "payout clawback is referral program management" },
];

const doNames = [...new Set(LC_PLAN.map((p) => p.key.split(".")[0]))];
const dos: Row[] = await call("GET", `/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name`);
const doId = new Map(dos.map((d) => [String(d.data_object_name), Number(d.id)]));
const lcRows: Row[] = await call(
  "GET",
  `/data_object_lifecycle_states?data_object_id=in.(${[...doId.values()].join(",")})&select=id,data_object_id,state_name,requires_permission,permission_verb_override,process_id,domain_module_id`,
);

// Module that masters each entity (M5 must name a module that carries the entity).
const dmdo: Row[] = await call(
  "GET",
  `/domain_module_data_objects?data_object_id=in.(${[...doId.values()].join(",")})&select=data_object_id,domain_module_id,role`,
);

type Patch = { id: number; key: string; field: "process_id" | "domain_module_id"; value: number; label: string };
const patches: Patch[] = [];
const lcAfter: LifecycleStateRow[] = [];
const lcSkipped: string[] = [];
for (const p of LC_PLAN) {
  const [dn, sn] = p.key.split(".");
  const did = doId.get(dn);
  const row = lcRows.find((r) => r.data_object_id === did && r.state_name === sn);
  if (!row) throw new Error(`lifecycle state ${p.key} not found`);
  if (row.requires_permission !== true) throw new Error(`${p.key} is not gated; plan is stale`);
  const pid = PROC(p.process);
  const after: LifecycleStateRow = { ...row } as LifecycleStateRow;
  if (row.process_id == null) {
    patches.push({ id: row.id, key: p.key, field: "process_id", value: pid, label: procLabel(pid) });
    after.process_id = pid;
  } else if (row.process_id !== pid) {
    lcSkipped.push(`${p.key}: process_id already ${row.process_id} (plan ${pid}); left alone`);
  }
  if (p.module) {
    const mid = MOD(p.module);
    const carries = dmdo.some((m) => m.data_object_id === did && m.domain_module_id === mid);
    if (!carries) throw new Error(`${p.module} does not carry ${dn}; M5 fill would fail`);
    if (row.domain_module_id == null) {
      patches.push({ id: row.id, key: p.key, field: "domain_module_id", value: mid, label: p.module });
      after.domain_module_id = mid;
    } else if (row.domain_module_id !== mid) {
      lcSkipped.push(`${p.key}: domain_module_id already ${row.domain_module_id} (plan ${mid}); left alone`);
    }
  }
  lcAfter.push(after);
}

console.log(`== 1. lifecycle fills (${patches.length} field fills on ${LC_PLAN.length} states)`);
for (const x of patches) console.log(`  state ${x.id} ${x.key}: ${x.field} NULL -> ${x.value} (${x.label})`);
for (const s of lcSkipped) console.log(`  skip ${s}`);
const lcPre = preflightLifecycleStates(lcAfter, { nameOf: (id) => dos.find((d) => d.id === id)?.data_object_name ?? `#${id}` });
for (const w of lcPre.warnings) console.log(`  warn ${w}`);
if (lcPre.errors.length) {
  for (const e of lcPre.errors) console.error(`  ERROR ${e}`);
  process.exit(1);
}

// ---------- 2. process_raci (E4 / E4c) ----------
// Every process wired to an ATS gate after step 1 must end with exactly 1 A and >= 1 R.
const mastersRows: Row[] = await call(
  "GET",
  `/domain_module_data_objects?domain_module_id=in.(${modules.map((m) => m.id).join(",")})&role=eq.master&select=data_object_id`,
);
const masterIds = [...new Set(mastersRows.map((r) => Number(r.data_object_id)))];
const allGated: Row[] = await call(
  "GET",
  `/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&requires_permission=eq.true&select=id,process_id`,
);
const wiredAfter = new Set<number>();
for (const g of allGated) {
  const planned = patches.find((p) => p.id === g.id && p.field === "process_id");
  const pid = planned ? planned.value : g.process_id;
  if (pid != null) wiredAfter.add(Number(pid));
}
const wiredList = [...wiredAfter].sort((a, b) => a - b);
const existingRaci: ProcessRaciRow[] = await call(
  "GET",
  `/process_raci?process_id=in.(${wiredList.join(",")})&select=id,process_id,raci,actor_role_id,actor_skill_id`,
);

const RACI_PLAN: { process: string; raci: "accountable" | "responsible"; role: string; why: string }[] = [
  { process: "7.2.3.4", raci: "accountable", role: "RECRUITING-MANAGER", why: "holds flag_do_not_hire and disposition_applicant" },
  { process: "7.2.3.4", raci: "responsible", role: "RECRUITING-RECRUITER", why: "dispositions applicants and raises do-not-hire flags" },
  { process: "11.2.2", raci: "accountable", role: "LEGAL-COMPLIANCE-SPECIALIST", why: "holds the DSR and consent-withdrawal gates" },
  { process: "11.2.2", raci: "responsible", role: "RECRUITING-RECRUITER", why: "locates and actions the candidate data in the ATS" },
];
const raciIncoming: ProcessRaciRow[] = [];
const raciSkipped: string[] = [];
for (const r of RACI_PLAN) {
  const row: ProcessRaciRow = { process_id: PROC(r.process), raci: r.raci, actor_role_id: ROLE(r.role) };
  const dup = existingRaci.some((e) => e.process_id === row.process_id && e.raci === row.raci && e.actor_role_id === row.actor_role_id);
  if (dup) raciSkipped.push(`${procLabel(row.process_id)} ${r.raci} ${r.role}: exists`);
  else raciIncoming.push(row);
}
console.log(`\n== 2. process_raci (${raciIncoming.length} new)`);
for (const r of raciIncoming) console.log(`  + ${procLabel(r.process_id)} ${r.raci} = ${roleCode(r.actor_role_id)}`);
for (const s of raciSkipped) console.log(`  skip ${s}`);
const raciPre = preflightProcessRaci(
  raciIncoming,
  existingRaci.filter((e) => raciIncoming.some((n) => n.process_id === e.process_id)),
);
for (const w of raciPre.warnings) console.log(`  warn ${w}`);
if (raciPre.errors.length) {
  for (const e of raciPre.errors) console.error(`  ERROR ${e}`);
  process.exit(1);
}
// Whole-set after-state over every wired process (E4 fail / E4c warn).
const raciAfter = [...existingRaci, ...raciIncoming];
const e4 = checkProcessRaci(wiredList, raciAfter, { processLabel: procLabel });
const e4c = checkAccountableAlsoResponsible(wiredList, raciAfter, { processLabel: procLabel });
console.log(`  after-state over ${wiredList.length} wired processes: E4 findings ${e4.length}, E4c findings ${e4c.length}`);
for (const f of [...e4, ...e4c]) console.log(`    ${f.id} ${f.rule}: ${f.detail}`);
if (e4.length) {
  console.error("  ERROR: a wired process would be left without exactly 1 A and >= 1 R");
  process.exit(1);
}

// ---------- 3. users edges (B7) ----------
const USERS = "users";
const relNames = ["users", "candidate_consents", "job_posting_distributions", "application_dispositions"];
const relDos: Row[] = await call("GET", `/data_objects?data_object_name=in.(${relNames.join(",")})&select=id,data_object_name,kind`);
const rid = new Map(relDos.map((d) => [String(d.data_object_name), Number(d.id)]));
const usersId = rid.get(USERS)!;
if (relDos.find((d) => d.data_object_name === USERS)?.kind !== "platform_builtin") throw new Error("users is not platform_builtin");
const nameOf = (id: number) => relDos.find((d) => Number(d.id) === id)?.data_object_name ?? `#${id}`;

// "<entity> many_to_one users (is X by)" is stored in its canonical one_to_many form: users on the
// "one" side as source, owner_side=source (the relationship_type enum has no many_to_one; the
// cluster loader auto-flips the same way). One role per edge (B7b).
const REL_PLAN = [
  { entity: "candidate_consents", verb: "records", inverse: "is recorded by", why: "the recruiter or privacy staff who captures an offline consent or processes a withdrawal; NULL when the candidate self-submits" },
  { entity: "job_posting_distributions", verb: "distributes", inverse: "is distributed by", why: "the recruiter or sourcer who syndicates the posting to a board; NULL for automated syndication" },
  { entity: "application_dispositions", verb: "dispositions", inverse: "is dispositioned by", why: "the recruiter or hiring manager who records the non-selection reason; NULL for knockout auto-rejects" },
];
const existingUserEdges: Row[] = await call(
  "GET",
  `/data_object_relationships?or=(and(data_object_id.eq.${usersId},related_data_object_id.in.(${REL_PLAN.map((r) => rid.get(r.entity)).join(",")})),and(related_data_object_id.eq.${usersId},data_object_id.in.(${REL_PLAN.map((r) => rid.get(r.entity)).join(",")})))&select=id,data_object_id,related_data_object_id,relationship_verb`,
);
const relIncoming: Row[] = [];
const relSkipped: string[] = [];
for (const r of REL_PLAN) {
  const eid = rid.get(r.entity)!;
  const have = existingUserEdges.filter((e) => e.data_object_id === eid || e.related_data_object_id === eid);
  if (have.length) {
    relSkipped.push(`${r.entity}: already has users edge(s) ${have.map((h) => `${h.id} '${h.relationship_verb}'`).join(", ")}`);
    continue;
  }
  assertNoEmDash("relationship", r.verb, r.inverse);
  relIncoming.push({
    data_object_id: usersId,
    related_data_object_id: eid,
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: r.verb,
    inverse_verb: r.inverse,
    owner_side: "source",
    is_required: false,
  });
}
console.log(`\n== 3. users edges (${relIncoming.length} new)`);
for (const r of relIncoming) {
  console.log(`  + users [${r.relationship_verb} / ${r.inverse_verb}] ${nameOf(r.related_data_object_id)}  one_to_many reference owner=source required=false`);
  console.log(`      (= ${nameOf(r.related_data_object_id)} many_to_one users, '${r.inverse_verb}')`);
}
for (const s of relSkipped) console.log(`  skip ${s}`);
const relRows: RelationshipRow[] = relIncoming.map((r, i) => ({ id: `new${i}:${nameOf(r.related_data_object_id)}`, ...r }) as RelationshipRow);
const relPre = preflightRelationships(relRows, { usersId, nameOf });
for (const w of relPre.warnings) console.log(`  warn ${w}`);
if (relPre.errors.length) {
  for (const e of relPre.errors) console.error(`  ERROR ${e}`);
  process.exit(1);
}
// Guard self-test: the B7b pre-flight must refuse a many_to_many users reference.
const probe = preflightRelationships(
  [{ id: "probe", data_object_id: rid.get("candidate_consents")!, related_data_object_id: usersId, relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "has recorder", inverse_verb: "records", owner_side: "source" }],
  { usersId, nameOf },
);
if (probe.errors.length === 0) throw new Error("B7b pre-flight did not refuse a many_to_many users probe");
console.log(`  guard ok: B7b pre-flight refuses a many_to_many users draft (${probe.errors[0].slice(0, 60)}...)`);

// ---------- 4. aliases (B11) ----------
const ALIASES: Record<string, string[]> = {
  candidate_engagements: ["Candidate Activity", "Candidate Touchpoint"],
  candidate_nurture_campaigns: ["Drip Campaign", "Nurture Campaign"],
  recruiting_event_attendances: ["Event Registration"],
  candidate_consents: ["Privacy Consent", "Data Processing Consent", "GDPR Consent"],
  talent_segments: ["Smart List", "Dynamic Pool"],
  recruiter_saved_searches: ["Search Agent", "Saved Search Alert"],
  referral_rewards: ["Referral Bonus Plan", "Referral Bounty"],
  referral_payouts: ["Referral Bonus Payment"],
  referral_campaigns: ["Referral Drive", "Referral Bonus Promotion"],
  application_stages: ["Pipeline Stage", "Hiring Stage"],
  application_stage_transitions: ["Stage History"],
  requisition_approvals: ["Headcount Approval", "Req Approval"],
  job_posting_distributions: ["Job Syndication", "Job Board Posting"],
  application_screening_questions: ["Knockout Question", "Prescreening Question"],
  application_screening_answers: ["Prescreening Response", "Questionnaire Response"],
  eeo_responses: ["EEO Survey Response", "Diversity Survey Response"],
  interview_kits: ["Interview Guide", "Interview Template"],
  interview_panels: ["Interview Team"],
  interviewer_availability_slots: ["Interviewer Availability", "Booking Slot"],
  offer_versions: ["Offer Revision"],
  offer_approvals: ["Offer Sign-Off"],
  offer_letter_documents: ["Offer Packet", "Generated Offer Letter"],
  applicant_flow_records: ["Applicant Flow Log", "Internet Applicant Record"],
  data_subject_requests: ["DSAR", "Data Subject Rights Request", "Privacy Rights Request"],
  voluntary_self_identifications: ["Self-ID"],
  ofccp_audit_trails: ["Compliance Audit Log"],
  hiring_team_assignments: ["Hiring Team Member"],
  candidate_documents: ["Candidate Attachment"],
  candidate_notes: ["Candidate Comment", "Internal Note"],
  candidate_tags: ["Candidate Label"],
  offer_letter_templates: ["Offer Template"],
  // Not a B11 finding (already aliased), but the staffing-agency term is missing.
  job_requisitions: ["Job Order"],
};
const aliasDos: Row[] = await call("GET", `/data_objects?data_object_name=in.(${Object.keys(ALIASES).join(",")})&select=id,data_object_name`);
const aid = new Map(aliasDos.map((d) => [String(d.data_object_name), Number(d.id)]));
for (const n of Object.keys(ALIASES)) if (!aid.has(n)) throw new Error(`unknown data_object ${n}`);
for (const n of Object.keys(ALIASES)) if (!masterIds.includes(aid.get(n)!)) throw new Error(`${n} is not an ATS master`);
const existingAliases: Row[] = await call(
  "GET",
  `/data_object_aliases?data_object_id=in.(${[...aid.values()].join(",")})&select=id,data_object_id,alias_name`,
);
const aliasIncoming: Row[] = [];
const aliasSkipped: string[] = [];
for (const [n, names] of Object.entries(ALIASES)) {
  const did = aid.get(n)!;
  for (const a of names) {
    assertNoEmDash("alias", a);
    if (existingAliases.some((e) => e.data_object_id === did && String(e.alias_name).toLowerCase() === a.toLowerCase())) {
      aliasSkipped.push(`${n} '${a}': exists`);
      continue;
    }
    aliasIncoming.push({ data_object_id: did, alias_name: a, alias_type: "synonym", is_preferred: false });
  }
}
console.log(`\n== 4. aliases (${aliasIncoming.length} new on ${new Set(aliasIncoming.map((a) => a.data_object_id)).size} masters)`);
for (const a of aliasIncoming) console.log(`  + ${aliasDos.find((d) => d.id === a.data_object_id)?.data_object_name}: '${a.alias_name}' (synonym, is_preferred=false)`);
for (const s of aliasSkipped) console.log(`  skip ${s}`);

if (!APPLY) {
  console.log("\nDRY-RUN complete. Re-run with --apply to write.");
  process.exit(0);
}

// ---------- apply ----------
console.log("\nAPPLYING");
for (const x of patches) {
  // The is.null guard makes the write fill-only at the DB: a value set since the read is never overwritten.
  const res = await call("PATCH", `/data_object_lifecycle_states?id=eq.${x.id}&${x.field}=is.null`, { [x.field]: x.value });
  console.log(`  state ${x.id} ${x.key}: ${x.field} = ${x.value} (${Array.isArray(res) ? res.length : 0} row)`);
}
const raciRes = await insert("/process_raci", raciIncoming as Row[]);
for (const r of raciRes) console.log(`  process_raci ${r.id}: ${procLabel(r.process_id)} ${r.raci} = ${roleCode(r.actor_role_id)}`);
const relRes = await insert("/data_object_relationships", relIncoming);
for (const r of relRes) console.log(`  data_object_relationships ${r.id}: users [${r.relationship_verb} / ${r.inverse_verb}] ${nameOf(r.related_data_object_id)}`);
const aliasRes = await insert("/data_object_aliases", aliasIncoming);
for (const r of aliasRes) console.log(`  data_object_aliases ${r.id}: ${aliasDos.find((d) => d.id === r.data_object_id)?.data_object_name} '${r.alias_name}'`);
console.log(`\ndone: ${patches.length} lifecycle fills, ${raciRes.length} process_raci, ${relRes.length} relationships, ${aliasRes.length} aliases`);
console.log("UI: https://domain-map.semantius.app/domain_map/data_object_lifecycle_states");
console.log("UI: https://domain-map.semantius.app/domain_map/process_raci");
console.log("UI: https://domain-map.semantius.app/domain_map/data_object_relationships");
console.log("UI: https://domain-map.semantius.app/domain_map/data_object_aliases");
