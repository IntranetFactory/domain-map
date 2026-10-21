#!/usr/bin/env bun
// fix_clm.ts — comprehensive CLM (domain_id=26) audit-gap fix.
//
// Phases:
//   A. 7 capabilities + capability_domains links
//   M. 5 domain_modules + domain_module_capabilities + 3 domain_starter_modules + domain_module_data_objects
//   B4. PATCH pattern flags on 5 CLM masters
//  B12. Lifecycle states for 5 masters (with M5 domain_module_id where applicable)
//   B9. 2 missing intra-domain handoffs (signature_record.completed, contract_clause.flagged)
// B10b. Backfill source_/target_domain_module_id on all 26 CLM-touching handoff rows
//   F. Create per-module mutate tools + 5 system skills + skill_tools + retire legacy clm-system
//   F7. Swap send_email -> notify_person on legacy skill before retire
//   E. Module-level permissions (baseline tiers + workflow gates) + 5 roles + role_modules + role_permissions
//
// Idempotent: every step reads first, only writes missing rows. Re-run safe.
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/fix_clm.ts

export {};

type Row = Record<string, unknown>;

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`pg ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const CLM = 26;
const PLATFORM_MODULE = 1001; // for permissions.module_id

const DO = { contracts: 66, obligations: 67, clauses: 68, templates: 69, signatures: 70,
             licenses: 58, saas_subs: 62, sourcing: 71, org_units: 34, envelopes: 251,
             contract_drafts: 423, users: 748 };

// =====================================================================
// PHASE A — capabilities (7) + capability_domains
// =====================================================================
console.log("\n========== PHASE A — capabilities ==========");

type Cap = { code: string; name: string; description: string };
const caps: Cap[] = [
  { code: "CLM-CONTRACT-AUTHORING", name: "Contract Authoring",
    description: "Template-driven contract drafting with clause-library lookup. Authoring layer that assembles new contracts from approved templates and clauses, captures party metadata, and produces the initial draft for negotiation." },
  { code: "CLM-CLAUSE-LIBRARY-MGMT", name: "Clause Library Management",
    description: "Curated repository of approved clauses with version control, fallback positions, and approval workflows. The clause library is the artifact CLM-CONTRACT-AUTHORING consumes; managing it (draft / review / approve / deprecate clauses) is a distinct surface." },
  { code: "CLM-REDLINING-NEGOTIATION", name: "Redlining and Negotiation",
    description: "Track-changes negotiation workflow with counterparty exchange, version comparison, and approval routing. Distinct from authoring (creating the draft) and repository (the executed record)." },
  { code: "CLM-AI-RISK-DETECTION", name: "AI Clause-Risk Detection",
    description: "ML-driven clause comparison against the approved library to flag non-standard language, missing protections, and high-risk terms during negotiation. Augments human review; does not replace it." },
  { code: "CLM-CONTRACT-REPOSITORY", name: "Contract Repository",
    description: "Executed-contract index with search, metadata management, full-text retrieval, and lifecycle tracking from signed through expired/renewed/terminated. The system of record post-signature." },
  { code: "CLM-OBLIGATION-EXTRACTION", name: "Obligation Extraction",
    description: "Automated extraction of obligations (deliverables, SLA commitments, payment terms, renewal triggers) from executed contracts. Populates the obligations register for ongoing tracking." },
  { code: "CLM-RENEWAL-MGMT", name: "Renewal Management",
    description: "Date-based renewal alerting, auto-renewal-clause detection, renewal-vs-replace decision support, and renewal execution. Distinct from amendments (in-term changes); renewals extend or replace the term." },
];

const existingCaps: Row[] = await pg(
  "GET",
  `/capabilities?capability_code=in.(${caps.map(c => c.code).join(",")})&select=id,capability_code`,
) ?? [];
const capId: Record<string, number> = {};
for (const r of existingCaps) capId[String(r.capability_code)] = Number(r.id);

for (const c of caps) {
  if (capId[c.code]) { console.log(`  ♻ ${c.code} (id=${capId[c.code]})`); continue; }
  console.log(`  ✨ ${c.code}`);
  await pg("POST", "/capabilities", { capability_code: c.code, capability_name: c.name, description: c.description });
}
const allCapRows: Row[] = await pg("GET", `/capabilities?capability_code=in.(${caps.map(c => c.code).join(",")})&select=id,capability_code`) ?? [];
for (const r of allCapRows) capId[String(r.capability_code)] = Number(r.id);

// capability_domains links (idempotent)
const existingCapDomains: Row[] = await pg("GET", `/capability_domains?domain_id=eq.${CLM}&select=capability_id`) ?? [];
const seenCapDomains = new Set(existingCapDomains.map(r => Number(r.capability_id)));
for (const c of caps) {
  const cid = capId[c.code];
  if (seenCapDomains.has(cid)) continue;
  console.log(`  ✨ capability_domains ${c.code} -> CLM`);
  await pg("POST", "/capability_domains", { capability_id: cid, domain_id: CLM });
}

// =====================================================================
// PHASE M — domain_modules (5) + module_capabilities + module_data + starter
// =====================================================================
console.log("\n========== PHASE M — modules ==========");

type Mod = { code: string; name: string; description: string };
const modules: Mod[] = [
  { code: "CLM-AUTHORING", name: "Contract Authoring",
    description: "Template-driven contract drafting with the approved clause library. Masters contract_templates and contract_clauses; produces draft legal_contracts that flow into CLM-NEGOTIATION. Realizes CLM-CONTRACT-AUTHORING and CLM-CLAUSE-LIBRARY-MGMT." },
  { code: "CLM-NEGOTIATION", name: "Negotiation and Redlining",
    description: "Track-changes negotiation with counterparty exchange, version comparison, and clause-risk detection. Consumes legal_contracts and contract_clauses; gates the in_negotiation -> approved lifecycle transition. Requires sign_document for signature workflow; coverage drops below 100% on the sign_document leg." },
  { code: "CLM-REPOSITORY", name: "Contract Repository",
    description: "Executed-contract index. Masters legal_contracts (post-signature) and signature_records. Contributes terms to saas_subscriptions and software_licenses (the buyer-side records that consume contract terms). The system of record for the active, expired, renewed, and terminated lifecycle states." },
  { code: "CLM-OBLIGATION-MGMT", name: "Obligation Management",
    description: "Register, tracking, and alerting for contract obligations (deliverables, SLA milestones, payment terms). Masters contract_obligations. Publishes obligation.due and obligation.breached events that fan out to OP-RES / GRC." },
  { code: "CLM-RENEWAL", name: "Renewal Management",
    description: "Date-based renewal alerting, auto-renewal-clause detection, and renewal execution. Consumes legal_contracts; publishes renewal.30_day_warning and legal_contract.renewed. Distinct from amendments which run through CLM-REPOSITORY." },
];

const existingMods: Row[] = await pg("GET", `/domain_modules?domain_id=eq.${CLM}&select=id,domain_module_code`) ?? [];
const modId: Record<string, number> = {};
for (const r of existingMods) modId[String(r.domain_module_code)] = Number(r.id);

for (const m of modules) {
  if (modId[m.code]) { console.log(`  ♻ ${m.code} (id=${modId[m.code]})`); continue; }
  console.log(`  ✨ ${m.code}`);
  await pg("POST", "/domain_modules", { domain_module_code: m.code, domain_module_name: m.name, domain_id: CLM, description: m.description });
}
const allModRows: Row[] = await pg("GET", `/domain_modules?domain_id=eq.${CLM}&select=id,domain_module_code`) ?? [];
for (const r of allModRows) modId[String(r.domain_module_code)] = Number(r.id);
console.log(`  modules: ${Object.keys(modId).length} resolved`);

// domain_module_capabilities
type ModCap = { module: string; capability: string };
const modCaps: ModCap[] = [
  { module: "CLM-AUTHORING", capability: "CLM-CONTRACT-AUTHORING" },
  { module: "CLM-AUTHORING", capability: "CLM-CLAUSE-LIBRARY-MGMT" },
  { module: "CLM-NEGOTIATION", capability: "CLM-REDLINING-NEGOTIATION" },
  { module: "CLM-NEGOTIATION", capability: "CLM-AI-RISK-DETECTION" },
  { module: "CLM-NEGOTIATION", capability: "APPROVAL-WORKFLOW" },
  { module: "CLM-REPOSITORY", capability: "CLM-CONTRACT-REPOSITORY" },
  { module: "CLM-OBLIGATION-MGMT", capability: "CLM-OBLIGATION-EXTRACTION" },
  { module: "CLM-RENEWAL", capability: "CLM-RENEWAL-MGMT" },
];
// resolve APPROVAL-WORKFLOW id
const [apw] = await pg("GET", "/capabilities?capability_code=eq.APPROVAL-WORKFLOW&select=id") ?? [];
if (apw) capId["APPROVAL-WORKFLOW"] = Number(apw.id);

const modIdList = Object.values(modId).join(",");
const existingMC: Row[] = await pg("GET", `/domain_module_capabilities?domain_module_id=in.(${modIdList})&select=domain_module_id,capability_id`) ?? [];
const seenMC = new Set(existingMC.map(r => `${r.domain_module_id}:${r.capability_id}`));

for (const mc of modCaps) {
  const mid = modId[mc.module], cid = capId[mc.capability];
  if (!mid || !cid) { console.log(`  ⚠ skip ${mc.module}/${mc.capability}`); continue; }
  if (seenMC.has(`${mid}:${cid}`)) continue;
  console.log(`  ✨ ${mc.module} <-> ${mc.capability}`);
  await pg("POST", "/domain_module_capabilities", { domain_module_id: mid, capability_id: cid });
}

// domain_module_data_objects
type MDO = { module: string; data_object_id: number; role: "master"|"embedded_master"|"contributor"|"consumer"|"derived"; necessity?: "required"|"optional" };
const mdos: MDO[] = [
  // CLM-AUTHORING
  { module: "CLM-AUTHORING", data_object_id: DO.templates, role: "master" },
  { module: "CLM-AUTHORING", data_object_id: DO.clauses, role: "master" },
  { module: "CLM-AUTHORING", data_object_id: DO.contracts, role: "consumer", necessity: "required" },
  { module: "CLM-AUTHORING", data_object_id: DO.sourcing, role: "consumer", necessity: "required" },
  { module: "CLM-AUTHORING", data_object_id: DO.contract_drafts, role: "consumer", necessity: "optional" },
  // CLM-NEGOTIATION
  { module: "CLM-NEGOTIATION", data_object_id: DO.contracts, role: "consumer", necessity: "required" },
  { module: "CLM-NEGOTIATION", data_object_id: DO.clauses, role: "consumer", necessity: "required" },
  { module: "CLM-NEGOTIATION", data_object_id: DO.templates, role: "consumer", necessity: "required" },
  // CLM-REPOSITORY
  { module: "CLM-REPOSITORY", data_object_id: DO.contracts, role: "master" },
  { module: "CLM-REPOSITORY", data_object_id: DO.signatures, role: "master" },
  { module: "CLM-REPOSITORY", data_object_id: DO.clauses, role: "consumer", necessity: "required" },
  { module: "CLM-REPOSITORY", data_object_id: DO.saas_subs, role: "contributor", necessity: "required" },
  { module: "CLM-REPOSITORY", data_object_id: DO.licenses, role: "contributor", necessity: "required" },
  { module: "CLM-REPOSITORY", data_object_id: DO.org_units, role: "embedded_master", necessity: "optional" },
  { module: "CLM-REPOSITORY", data_object_id: DO.envelopes, role: "consumer", necessity: "optional" },
  // CLM-OBLIGATION-MGMT
  { module: "CLM-OBLIGATION-MGMT", data_object_id: DO.obligations, role: "master" },
  { module: "CLM-OBLIGATION-MGMT", data_object_id: DO.contracts, role: "consumer", necessity: "required" },
  // CLM-RENEWAL
  { module: "CLM-RENEWAL", data_object_id: DO.contracts, role: "consumer", necessity: "required" },
  { module: "CLM-RENEWAL", data_object_id: DO.templates, role: "consumer", necessity: "required" },
];

const existingMDO: Row[] = await pg("GET", `/domain_module_data_objects?domain_module_id=in.(${modIdList})&select=domain_module_id,data_object_id`) ?? [];
const seenMDO = new Set(existingMDO.map(r => `${r.domain_module_id}:${r.data_object_id}`));

let mdoAdded = 0;
for (const m of mdos) {
  const mid = modId[m.module];
  if (!mid) continue;
  if (seenMDO.has(`${mid}:${m.data_object_id}`)) continue;
  const body: Row = { domain_module_id: mid, data_object_id: m.data_object_id, role: m.role };
  if (m.necessity) body.necessity = m.necessity;
  await pg("POST", "/domain_module_data_objects", body);
  mdoAdded++;
}
console.log(`  domain_module_data_objects: ${mdoAdded} new`);

// domain_starter_modules
const starters: Array<{ code: string; position: number; notes: string }> = [
  { code: "CLM-REPOSITORY", position: 1,
    notes: "Start with the executed-contract repository. Most CLM rollouts begin by getting the active contract estate indexed and searchable before adding authoring or obligation tracking." },
  { code: "CLM-AUTHORING", position: 2,
    notes: "Add template-driven authoring with the approved clause library once the repository is established. This is the productivity layer for legal/contract operations teams." },
  { code: "CLM-OBLIGATION-MGMT", position: 3,
    notes: "The operational value-add: turn executed contracts into a tracked register of obligations with date-based alerting. Usually adopted once the first two are stable." },
];
const existingStarters: Row[] = await pg("GET", `/domain_starter_modules?domain_id=eq.${CLM}&select=domain_module_id`) ?? [];
const seenStarters = new Set(existingStarters.map(r => Number(r.domain_module_id)));
for (const s of starters) {
  const mid = modId[s.code];
  if (!mid || seenStarters.has(mid)) continue;
  console.log(`  ✨ starter ${s.position} ${s.code}`);
  await pg("POST", "/domain_starter_modules", { domain_id: CLM, domain_module_id: mid, position: s.position, notes: s.notes });
}

// =====================================================================
// PHASE B4 — pattern flags + notes
// =====================================================================
console.log("\n========== PHASE B4 — pattern flags ==========");

type Flags = { id: number; has_personal_content: boolean; has_submit_lock: boolean; has_single_approver: boolean; notes: string };
const flagPatches: Flags[] = [
  { id: DO.contracts, has_personal_content: false, has_submit_lock: true, has_single_approver: false,
    notes: "Submit-lock: once signed, the executed contract is locked from edits (amendments and renewals are separate records). Multi-approver workflow (legal + business + finance), not single-approver." },
  { id: DO.obligations, has_personal_content: false, has_submit_lock: false, has_single_approver: false,
    notes: "No submit-lock (status updates expected throughout the open -> in_progress -> satisfied/breached/waived lifecycle). Obligation owner closes the record but that's a single-person action, not a single-approver gate." },
  { id: DO.clauses, has_personal_content: false, has_submit_lock: true, has_single_approver: false,
    notes: "Submit-lock: once approved and attached to executed contracts, clauses are locked. Deprecation creates a new state but doesn't edit the locked version. Legal-panel review = multi-approver, not single." },
  { id: DO.templates, has_personal_content: false, has_submit_lock: true, has_single_approver: false,
    notes: "Submit-lock: once published, templates lock until explicitly deprecated. Drafted contracts hold a reference to the template version they used. Multi-approver review (legal + business)." },
  { id: DO.signatures, has_personal_content: false, has_submit_lock: true, has_single_approver: false,
    notes: "Submit-lock: once the envelope is dispatched for signature, it's locked from sender edits. Recipients sign in their assigned order. Multi-signer by definition (counterparty signature is the whole point), not single-approver." },
];
for (const f of flagPatches) {
  await pg("PATCH", `/data_objects?id=eq.${f.id}`, {
    has_personal_content: f.has_personal_content,
    has_submit_lock: f.has_submit_lock,
    has_single_approver: f.has_single_approver,
    notes: f.notes,
  });
  console.log(`  ✓ data_object ${f.id} flags patched`);
}

// =====================================================================
// PHASE B12 — lifecycle states (with M5 domain_module_id)
// =====================================================================
console.log("\n========== PHASE B12 — lifecycle states ==========");

type LCS = {
  data_object_id: number;
  state_name: string;
  state_order: number;
  description: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  module?: string;
};

const lcStates: LCS[] = [
  // legal_contracts (mastered in CLM-REPOSITORY; states realized across modules)
  { data_object_id: DO.contracts, state_name: "draft", state_order: 10, is_initial: true,
    description: "Initial draft created in CLM-AUTHORING from a template, or received via inbound handoff from CPQ/sourcing." },
  { data_object_id: DO.contracts, state_name: "in_review", state_order: 20,
    description: "Draft has been routed for internal review prior to counterparty exchange.", module: "CLM-NEGOTIATION" },
  { data_object_id: DO.contracts, state_name: "in_negotiation", state_order: 30,
    description: "Active counterparty negotiation with track-changes / redline exchange.", module: "CLM-NEGOTIATION" },
  { data_object_id: DO.contracts, state_name: "approved", state_order: 40,
    description: "Final negotiated text approved by all internal stakeholders; ready for signature.",
    requires_permission: true, permission_verb_override: "approve_legal_contract", module: "CLM-NEGOTIATION" },
  { data_object_id: DO.contracts, state_name: "out_for_signature", state_order: 50,
    description: "Signature envelope dispatched to all required signers.", module: "CLM-REPOSITORY" },
  { data_object_id: DO.contracts, state_name: "signed", state_order: 60,
    description: "All signers have signed; contract is fully executed.",
    requires_permission: true, permission_verb_override: "execute_legal_contract", module: "CLM-REPOSITORY" },
  { data_object_id: DO.contracts, state_name: "active", state_order: 70,
    description: "Effective date has passed; contract is in force. Default post-signature state." },
  { data_object_id: DO.contracts, state_name: "amended", state_order: 75,
    description: "An amendment has been executed against this contract. Amendment is a separate record; this contract row reflects the amended terms going forward.",
    requires_permission: true, permission_verb_override: "amend_legal_contract", module: "CLM-REPOSITORY" },
  { data_object_id: DO.contracts, state_name: "expired", state_order: 80, is_terminal: true,
    description: "End date passed without renewal or termination. Terminal state." },
  { data_object_id: DO.contracts, state_name: "terminated", state_order: 90, is_terminal: true,
    description: "Contract terminated before end date (by mutual consent, breach, or for-cause). Terminal state.",
    requires_permission: true, permission_verb_override: "terminate_legal_contract", module: "CLM-REPOSITORY" },
  { data_object_id: DO.contracts, state_name: "renewed", state_order: 100, is_terminal: true,
    description: "Renewed via a new contract record (or extended via amendment). The renewal is a separate record; this row is terminal.",
    requires_permission: true, permission_verb_override: "renew_legal_contract", module: "CLM-RENEWAL" },

  // contract_obligations (mastered in CLM-OBLIGATION-MGMT)
  { data_object_id: DO.obligations, state_name: "open", state_order: 10, is_initial: true,
    description: "Obligation extracted/created and registered. Awaiting work or due date." },
  { data_object_id: DO.obligations, state_name: "in_progress", state_order: 20,
    description: "Obligation owner has acknowledged and is actively delivering against the obligation." },
  { data_object_id: DO.obligations, state_name: "due", state_order: 30,
    description: "Due date has passed without closure. Alerts have been raised to the obligation owner; escalation pending.", module: "CLM-OBLIGATION-MGMT" },
  { data_object_id: DO.obligations, state_name: "satisfied", state_order: 40, is_terminal: true,
    description: "Obligation has been fully delivered and accepted. Terminal positive outcome.",
    requires_permission: true, permission_verb_override: "close_contract_obligation", module: "CLM-OBLIGATION-MGMT" },
  { data_object_id: DO.obligations, state_name: "breached", state_order: 50, is_terminal: true,
    description: "Obligation has been formally declared breached. Triggers contract-level remedies. Terminal negative outcome.",
    requires_permission: true, permission_verb_override: "mark_obligation_breached", module: "CLM-OBLIGATION-MGMT" },
  { data_object_id: DO.obligations, state_name: "waived", state_order: 60, is_terminal: true,
    description: "Obligation formally waived (counterparty release or internal forgiveness). Terminal.",
    requires_permission: true, permission_verb_override: "waive_contract_obligation", module: "CLM-OBLIGATION-MGMT" },

  // contract_clauses (mastered in CLM-AUTHORING)
  { data_object_id: DO.clauses, state_name: "draft", state_order: 10, is_initial: true,
    description: "Clause authored but not yet reviewed. Cannot be selected for new contracts." },
  { data_object_id: DO.clauses, state_name: "in_review", state_order: 20,
    description: "Clause routed to the legal panel for review.", module: "CLM-AUTHORING" },
  { data_object_id: DO.clauses, state_name: "approved", state_order: 30,
    description: "Clause approved for use in contract authoring.",
    requires_permission: true, permission_verb_override: "approve_contract_clause", module: "CLM-AUTHORING" },
  { data_object_id: DO.clauses, state_name: "published", state_order: 40,
    description: "Clause available in the library for selection by authors. Locked from edits; supersession requires a new version.", module: "CLM-AUTHORING" },
  { data_object_id: DO.clauses, state_name: "deprecated", state_order: 50, is_terminal: true,
    description: "Clause withdrawn from the library; existing contracts retain it but new authoring cannot select it. Terminal.",
    requires_permission: true, permission_verb_override: "deprecate_contract_clause", module: "CLM-AUTHORING" },

  // contract_templates (mastered in CLM-AUTHORING)
  { data_object_id: DO.templates, state_name: "draft", state_order: 10, is_initial: true,
    description: "Template authored but not yet reviewed. Cannot be used for new contracts." },
  { data_object_id: DO.templates, state_name: "in_review", state_order: 20,
    description: "Template routed to the legal panel for review.", module: "CLM-AUTHORING" },
  { data_object_id: DO.templates, state_name: "approved", state_order: 30,
    description: "Template approved for publication.",
    requires_permission: true, permission_verb_override: "approve_contract_template", module: "CLM-AUTHORING" },
  { data_object_id: DO.templates, state_name: "published", state_order: 40,
    description: "Template available in the library; authors can instantiate new contracts from it. Locked from edits.", module: "CLM-AUTHORING" },
  { data_object_id: DO.templates, state_name: "deprecated", state_order: 50, is_terminal: true,
    description: "Template withdrawn from the library; existing in-flight drafts retain it but new authoring cannot select it. Terminal.",
    requires_permission: true, permission_verb_override: "deprecate_contract_template", module: "CLM-AUTHORING" },

  // signature_records (mastered in CLM-REPOSITORY)
  { data_object_id: DO.signatures, state_name: "pending", state_order: 10, is_initial: true,
    description: "Signature envelope created but not yet dispatched." },
  { data_object_id: DO.signatures, state_name: "sent", state_order: 20,
    description: "Envelope dispatched to first signer(s); awaiting first signature.", module: "CLM-REPOSITORY" },
  { data_object_id: DO.signatures, state_name: "in_progress", state_order: 30,
    description: "One or more signers have signed; others remain.", module: "CLM-REPOSITORY" },
  { data_object_id: DO.signatures, state_name: "completed", state_order: 40, is_terminal: true,
    description: "All required signers have signed. The signed contract document is persisted. Terminal positive outcome." },
  { data_object_id: DO.signatures, state_name: "declined", state_order: 50, is_terminal: true,
    description: "A signer declined to sign. Envelope is terminal; a new envelope can be created if negotiation re-opens." },
  { data_object_id: DO.signatures, state_name: "voided", state_order: 60, is_terminal: true,
    description: "Sender voided the envelope before all signers completed. Terminal.",
    requires_permission: true, permission_verb_override: "void_signature_record", module: "CLM-REPOSITORY" },
];

const allMasterIds = [DO.contracts, DO.obligations, DO.clauses, DO.templates, DO.signatures];
const existingLCS: Row[] = await pg("GET", `/data_object_lifecycle_states?data_object_id=in.(${allMasterIds.join(",")})&select=data_object_id,state_name`) ?? [];
const seenLCS = new Set(existingLCS.map(r => `${r.data_object_id}:${r.state_name}`));

let lcsAdded = 0;
for (const s of lcStates) {
  if (seenLCS.has(`${s.data_object_id}:${s.state_name}`)) continue;
  const body: Row = {
    data_object_id: s.data_object_id,
    state_name: s.state_name,
    state_order: s.state_order,
    description: s.description,
  };
  if (s.is_initial) body.is_initial = true;
  if (s.is_terminal) body.is_terminal = true;
  if (s.requires_permission) body.requires_permission = true;
  if (s.permission_verb_override) body.permission_verb_override = s.permission_verb_override;
  if (s.module && modId[s.module]) body.domain_module_id = modId[s.module];
  await pg("POST", "/data_object_lifecycle_states", body);
  lcsAdded++;
}
console.log(`  lifecycle states: ${lcsAdded} new (of ${lcStates.length} planned)`);

// =====================================================================
// PHASE B9 — missing intra-domain handoffs
// =====================================================================
console.log("\n========== PHASE B9 — missing handoffs ==========");

// signature_record.completed (event 535): intra-domain CLM-NEGOTIATION -> CLM-REPOSITORY
// contract_clause.flagged    (event 533): intra-domain CLM-NEGOTIATION -> CLM-AUTHORING
type NewHandoff = { trigger_event_id: number; data_object_id: number; source_module: string; target_module: string; description: string; friction_level: "low"|"medium"|"high" };
const newHandoffs: NewHandoff[] = [
  { trigger_event_id: 535, data_object_id: DO.signatures, source_module: "CLM-NEGOTIATION", target_module: "CLM-REPOSITORY",
    friction_level: "low",
    description: "Signature envelope completion in negotiation hands the executed envelope to the repository for persistence. Intra-domain lifecycle progression; the signed document gets indexed and the linked legal_contract transitions out_for_signature -> signed." },
  { trigger_event_id: 533, data_object_id: DO.clauses, source_module: "CLM-NEGOTIATION", target_module: "CLM-AUTHORING",
    friction_level: "medium",
    description: "Clause flagged during negotiation (counterparty pushed back, non-standard language detected, missing protection) is routed back to the authoring/library team for review. Library team decides whether the flag warrants a new approved variant or a clarification on the existing clause." },
];

for (const h of newHandoffs) {
  const sid = modId[h.source_module], tid = modId[h.target_module];
  const [existing] = await pg("GET", `/handoffs?source_domain_id=eq.${CLM}&target_domain_id=eq.${CLM}&trigger_event_id=eq.${h.trigger_event_id}&select=id`) ?? [];
  if (existing) { console.log(`  ♻ handoff trigger=${h.trigger_event_id} (id=${existing.id})`); continue; }
  console.log(`  ✨ handoff trigger=${h.trigger_event_id} ${h.source_module} -> ${h.target_module}`);
  await pg("POST", "/handoffs", {
    source_domain_id: CLM,
    target_domain_id: CLM,
    source_domain_module_id: sid,
    target_domain_module_id: tid,
    trigger_event_id: h.trigger_event_id,
    data_object_id: h.data_object_id,
    integration_pattern: "lifecycle_progression",
    friction_level: h.friction_level,
    description: h.description,
  });
}

// =====================================================================
// PHASE B10b — backfill source_/target_domain_module_id on all CLM handoffs
// =====================================================================
console.log("\n========== PHASE B10b — handoff module FK backfill ==========");

// Derivation rules:
//   source_domain_module_id = module in source domain holding trigger_event.data_object_id with strongest role.
//   target_domain_module_id = module in target domain holding handoff.data_object_id with strongest role.
// For CLM: master order is contracts->REPOSITORY, obligations->OBLIGATION-MGMT, clauses->AUTHORING, templates->AUTHORING, signatures->REPOSITORY.
// Renewal-specific event (renewal.30_day_warning, ev 104) maps to CLM-RENEWAL by editorial choice (the event semantics belong there).

// Pull all CLM-touching handoffs (outbound + inbound)
const outRows: Row[] = await pg("GET", `/handoffs?source_domain_id=eq.${CLM}&select=id,trigger_event_id,data_object_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event:trigger_events(event_name,data_object_id)`) ?? [];
const inRows: Row[] = await pg("GET", `/handoffs?target_domain_id=eq.${CLM}&select=id,trigger_event_id,data_object_id,source_domain_id,source_domain_module_id,target_domain_module_id,trigger_event:trigger_events(event_name,data_object_id)`) ?? [];

function clmModuleForDataObject(doId: number): string | null {
  // master mapping
  if (doId === DO.contracts) return "CLM-REPOSITORY";
  if (doId === DO.signatures) return "CLM-REPOSITORY";
  if (doId === DO.obligations) return "CLM-OBLIGATION-MGMT";
  if (doId === DO.clauses) return "CLM-AUTHORING";
  if (doId === DO.templates) return "CLM-AUTHORING";
  // CLM-AUTHORING also masters/consumes sourcing/drafts
  if (doId === DO.sourcing) return "CLM-AUTHORING";
  if (doId === DO.contract_drafts) return "CLM-AUTHORING";
  // CLM-REPOSITORY consumes envelopes
  if (doId === DO.envelopes) return "CLM-REPOSITORY";
  return null;
}

let patchedOut = 0, patchedIn = 0, ambiguous: string[] = [];

for (const r of outRows) {
  const id = Number(r.id);
  const evDOId = Number((r.trigger_event as Row)?.data_object_id);
  const evName = String((r.trigger_event as Row)?.event_name);
  // Editorial override: renewal.30_day_warning belongs to CLM-RENEWAL
  let sourceModule: string | null;
  if (evName === "renewal.30_day_warning") sourceModule = "CLM-RENEWAL";
  else sourceModule = clmModuleForDataObject(evDOId);
  if (!r.source_domain_module_id && sourceModule && modId[sourceModule]) {
    await pg("PATCH", `/handoffs?id=eq.${id}`, { source_domain_module_id: modId[sourceModule] });
    patchedOut++;
    console.log(`  ✓ out#${id} ${evName} -> source=${sourceModule}`);
  }
  // also fix target_domain_module_id if target is CLM (intra-domain row) — none in outRows since source=CLM
}

for (const r of inRows) {
  const id = Number(r.id);
  const payloadDO = Number(r.data_object_id);
  const evName = String((r.trigger_event as Row)?.event_name);
  const targetModule = clmModuleForDataObject(payloadDO);
  if (!r.target_domain_module_id && targetModule && modId[targetModule]) {
    await pg("PATCH", `/handoffs?id=eq.${id}`, { target_domain_module_id: modId[targetModule] });
    patchedIn++;
    console.log(`  ✓ in#${id} ${evName} (payload=${payloadDO}) -> target=${targetModule}`);
  } else if (!r.target_domain_module_id) {
    ambiguous.push(`in#${id} ${evName} payload=${payloadDO} — no CLM module owns this data_object`);
  }
}
console.log(`  B10b: ${patchedOut} outbound + ${patchedIn} inbound patched`);
if (ambiguous.length) {
  console.log("  Inbound rows with un-derivable target module (left NULL, report-only):");
  for (const a of ambiguous) console.log(`    - ${a}`);
}

// =====================================================================
// PHASE F — tools + per-module system skills + skill_tools
// =====================================================================
console.log("\n========== PHASE F — tools + skills ==========");

type ToolSpec = { name: string; kind: "query"|"mutate"|"side_effect"|"compute"; dataObject?: number; coverage?: "platform"|"external"|"integration"; description: string };
const newTools: ToolSpec[] = [
  // legal_contracts mutates
  { name: "create_legal_contract", kind: "mutate", dataObject: DO.contracts, description: "Create a new legal contract row (initial draft state)." },
  { name: "update_legal_contract", kind: "mutate", dataObject: DO.contracts, description: "Update legal-contract metadata (parties, dates, terms before execution)." },
  { name: "approve_legal_contract", kind: "mutate", dataObject: DO.contracts, description: "Approve the negotiated draft for signature dispatch. Workflow gate (in_negotiation -> approved)." },
  { name: "execute_legal_contract", kind: "mutate", dataObject: DO.contracts, description: "Persist the executed contract once all signers have signed. Workflow gate (out_for_signature -> signed)." },
  { name: "terminate_legal_contract", kind: "mutate", dataObject: DO.contracts, description: "Terminate an active contract before its end date. Workflow gate." },
  { name: "renew_legal_contract", kind: "mutate", dataObject: DO.contracts, description: "Execute a contract renewal. Creates the successor contract and transitions the predecessor to renewed. Workflow gate." },
  { name: "amend_legal_contract", kind: "mutate", dataObject: DO.contracts, description: "Apply an amendment to an active contract. Creates the amendment record and updates the contract's effective terms. Workflow gate." },
  // contract_obligations mutates
  { name: "create_contract_obligation", kind: "mutate", dataObject: DO.obligations, description: "Register a new contract obligation against an active contract." },
  { name: "update_contract_obligation", kind: "mutate", dataObject: DO.obligations, description: "Update obligation metadata (owner, due date, status notes)." },
  { name: "close_contract_obligation", kind: "mutate", dataObject: DO.obligations, description: "Mark obligation satisfied. Workflow gate (in_progress/due -> satisfied)." },
  { name: "mark_obligation_breached", kind: "mutate", dataObject: DO.obligations, description: "Formally declare an obligation breached. Triggers contract-level remedies. Workflow gate." },
  { name: "waive_contract_obligation", kind: "mutate", dataObject: DO.obligations, description: "Waive an obligation by counterparty release or internal forgiveness. Workflow gate." },
  // contract_clauses mutates
  { name: "create_contract_clause", kind: "mutate", dataObject: DO.clauses, description: "Create a new clause in the library (draft state)." },
  { name: "update_contract_clause", kind: "mutate", dataObject: DO.clauses, description: "Update a clause's draft text or metadata before approval." },
  { name: "approve_contract_clause", kind: "mutate", dataObject: DO.clauses, description: "Approve a clause for use in contract authoring. Workflow gate (in_review -> approved)." },
  { name: "deprecate_contract_clause", kind: "mutate", dataObject: DO.clauses, description: "Deprecate a clause; existing contracts retain it but new authoring cannot select it. Workflow gate." },
  // contract_templates mutates
  { name: "create_contract_template", kind: "mutate", dataObject: DO.templates, description: "Create a new contract template (draft state)." },
  { name: "update_contract_template", kind: "mutate", dataObject: DO.templates, description: "Update a template's draft content or metadata before approval." },
  { name: "approve_contract_template", kind: "mutate", dataObject: DO.templates, description: "Approve a template for publication. Workflow gate (in_review -> approved)." },
  { name: "publish_contract_template", kind: "mutate", dataObject: DO.templates, description: "Publish an approved template to the library." },
  { name: "deprecate_contract_template", kind: "mutate", dataObject: DO.templates, description: "Deprecate a template. Workflow gate." },
  // signature_records mutates
  { name: "create_signature_record", kind: "mutate", dataObject: DO.signatures, description: "Create a signature envelope record linked to a legal_contract." },
  { name: "void_signature_record", kind: "mutate", dataObject: DO.signatures, description: "Void a signature envelope before all signers complete. Workflow gate." },
  // compute tools (AI augmentations) — external coverage by default; flip to platform when shipped natively
  { name: "extract_obligations", kind: "compute", coverage: "external",
    description: "AI-driven extraction of obligations (deliverables, SLA milestones, payment terms, dates) from an executed contract document. Augments human review." },
  { name: "detect_clause_risk", kind: "compute", coverage: "external",
    description: "ML scoring of contract clauses against the approved library to flag non-standard language, missing protections, and high-risk terms. Augments human negotiator review." },
  { name: "generate_redline", kind: "compute", coverage: "external",
    description: "AI-generated redline proposal: produce a marked-up counter-draft suggesting clause swaps based on the approved library. Augments human drafting." },
];

const newToolNames = newTools.map(t => t.name).join(",");
const existingNewTools: Row[] = await pg("GET", `/tools?tool_name=in.(${newToolNames})&select=id,tool_name`) ?? [];
const seenNewToolNames = new Set(existingNewTools.map(r => String(r.tool_name)));
for (const t of newTools) {
  if (seenNewToolNames.has(t.name)) { continue; }
  const body: Row = { tool_name: t.name, operation_kind: t.kind, description: t.description };
  if (t.dataObject !== undefined) body.data_object_id = t.dataObject;
  if (t.coverage) body.coverage_tier = t.coverage;
  console.log(`  ✨ tool ${t.name} (${t.kind})`);
  await pg("POST", "/tools", body);
}

// Resolve all tools we'll wire to skills
const allToolNames = [
  // existing
  "query_legal_contracts", "query_contract_obligations", "query_contract_clauses",
  "query_contract_templates", "query_signature_records", "query_sourcing_events",
  "query_envelopes", "query_contract_drafts",
  "notify_person", "sign_document",
  // new
  ...newTools.map(t => t.name),
];
const toolMap: Record<string, { id: number; kind: string; coverage: string | null }> = {};
const toolRows: Row[] = await pg("GET", `/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name,operation_kind,coverage_tier`) ?? [];
for (const r of toolRows) {
  toolMap[String(r.tool_name)] = { id: Number(r.id), kind: String(r.operation_kind), coverage: r.coverage_tier as string | null };
}
console.log(`  tools resolved: ${Object.keys(toolMap).length} of ${allToolNames.length}`);
for (const n of allToolNames) {
  if (!toolMap[n]) console.log(`  ⚠ missing tool: ${n}`);
}

// Per-module skills
type SkillSpec = { name: string; module: string; description: string; required: string[]; optional: string[] };
const skillSpecs: SkillSpec[] = [
  { name: "clm-authoring-system", module: "CLM-AUTHORING",
    description: "Per-module system skill for template-driven contract authoring and clause-library management. Masters contract_templates and contract_clauses; produces draft legal_contracts.",
    required: [
      "query_contract_templates", "create_contract_template", "update_contract_template",
      "approve_contract_template", "publish_contract_template", "deprecate_contract_template",
      "query_contract_clauses", "create_contract_clause", "update_contract_clause",
      "approve_contract_clause", "deprecate_contract_clause",
      "query_legal_contracts", "create_legal_contract",
    ],
    optional: ["query_sourcing_events", "query_contract_drafts"],
  },
  { name: "clm-negotiation-system", module: "CLM-NEGOTIATION",
    description: "Per-module system skill for redlining, counterparty exchange, and clause-risk detection. Consumes legal_contracts and contract_clauses; gates the in_negotiation -> approved transition. AI augmentations (risk detection, redline generation) drop coverage below 100%.",
    required: [
      "query_legal_contracts", "update_legal_contract", "approve_legal_contract",
      "query_contract_clauses", "query_contract_templates",
      "notify_person",
    ],
    optional: ["detect_clause_risk", "generate_redline"],
  },
  { name: "clm-repository-system", module: "CLM-REPOSITORY",
    description: "Per-module system skill for the executed-contract repository. Masters legal_contracts and signature_records. Requires sign_document for envelope completion (external) — drops coverage below 100%.",
    required: [
      "query_legal_contracts", "update_legal_contract", "execute_legal_contract",
      "terminate_legal_contract", "amend_legal_contract",
      "query_signature_records", "create_signature_record", "void_signature_record",
      "sign_document",
    ],
    optional: ["query_envelopes", "extract_obligations", "notify_person"],
  },
  { name: "clm-obligation-mgmt-system", module: "CLM-OBLIGATION-MGMT",
    description: "Per-module system skill for the obligations register. Masters contract_obligations; uses notify_person for due-date alerts (platform-covered).",
    required: [
      "query_contract_obligations", "create_contract_obligation", "update_contract_obligation",
      "close_contract_obligation", "mark_obligation_breached", "waive_contract_obligation",
      "notify_person",
    ],
    optional: ["query_legal_contracts", "extract_obligations"],
  },
  { name: "clm-renewal-system", module: "CLM-RENEWAL",
    description: "Per-module system skill for renewal alerting and execution. Consumes legal_contracts and contract_templates; uses notify_person for renewal warnings (platform-covered).",
    required: [
      "query_legal_contracts", "renew_legal_contract",
      "query_contract_templates",
      "notify_person",
    ],
    optional: [],
  },
];

const existingSkills: Row[] = await pg("GET", `/skills?skill_name=in.(${skillSpecs.map(s => s.name).join(",")})&select=id,skill_name`) ?? [];
const skillId: Record<string, number> = {};
for (const r of existingSkills) skillId[String(r.skill_name)] = Number(r.id);

for (const s of skillSpecs) {
  if (skillId[s.name]) { console.log(`  ♻ skill ${s.name} (id=${skillId[s.name]})`); continue; }
  console.log(`  ✨ skill ${s.name}`);
  await pg("POST", "/skills", {
    skill_name: s.name,
    description: s.description,
    skill_type: "system",
    domain_id: CLM,
    domain_module_id: modId[s.module],
  });
}
const finalSkills: Row[] = await pg("GET", `/skills?skill_name=in.(${skillSpecs.map(s => s.name).join(",")})&select=id,skill_name`) ?? [];
for (const r of finalSkills) skillId[String(r.skill_name)] = Number(r.id);

// skill_tools
const skillIdList = Object.values(skillId).join(",");
const existingST: Row[] = await pg("GET", `/skill_tools?skill_id=in.(${skillIdList})&select=skill_id,tool_id`) ?? [];
const seenST = new Set(existingST.map(r => `${r.skill_id}:${r.tool_id}`));

let stAdded = 0;
for (const s of skillSpecs) {
  const sid = skillId[s.name];
  if (!sid) continue;
  const pairs: Array<{ tool: string; level: "required"|"optional" }> = [
    ...s.required.map(t => ({ tool: t, level: "required" as const })),
    ...s.optional.map(t => ({ tool: t, level: "optional" as const })),
  ];
  for (const p of pairs) {
    const tool = toolMap[p.tool];
    if (!tool) { console.log(`  ⚠ ${s.name} -> ${p.tool} unresolved`); continue; }
    if (seenST.has(`${sid}:${tool.id}`)) continue;
    await pg("POST", "/skill_tools", { skill_id: sid, tool_id: tool.id, requirement_level: p.level });
    stAdded++;
  }
}
console.log(`  skill_tools: ${stAdded} new`);

// =====================================================================
// PHASE F7 / F1 — Migrate legacy clm-system: swap send_email -> notify_person, then retire
// =====================================================================
console.log("\n========== PHASE F7/F1 — retire legacy clm-system ==========");

const [legacy] = await pg("GET", "/skills?skill_name=eq.clm-system&select=id") ?? [];
if (legacy) {
  const legacyId = Number(legacy.id);
  // Delete its skill_tools first (FK), then the skill itself.
  const legacyST: Row[] = await pg("GET", `/skill_tools?skill_id=eq.${legacyId}&select=id`) ?? [];
  for (const st of legacyST) {
    await pg("DELETE", `/skill_tools?id=eq.${st.id}`);
  }
  await pg("DELETE", `/skills?id=eq.${legacyId}`);
  console.log(`  ✓ retired legacy skill clm-system (id=${legacyId}); deleted ${legacyST.length} skill_tools`);
} else {
  console.log("  ♻ legacy skill clm-system already absent");
}

// =====================================================================
// PHASE E — permissions (baseline + workflow gates + overrides) + roles + bundles
// =====================================================================
console.log("\n========== PHASE E — permissions + roles ==========");

// 1. Build permission set per module: <slug>:read, :manage, :admin, plus workflow gates from lifecycle states with requires_permission=true and domain_module_id assigned.
type PermSpec = { name: string; module: string; tier: "baseline-read"|"baseline-manage"|"baseline-admin"|"workflow-gate"|"override" };
const perms: PermSpec[] = [];

for (const m of modules) {
  const slug = m.code.toLowerCase();
  perms.push({ name: `${slug}:read`, module: m.code, tier: "baseline-read" });
  perms.push({ name: `${slug}:manage`, module: m.code, tier: "baseline-manage" });
  perms.push({ name: `${slug}:admin`, module: m.code, tier: "baseline-admin" });
}

// Workflow gates derived from lcStates with requires_permission=true and module assignment
for (const s of lcStates) {
  if (!s.requires_permission || !s.module) continue;
  const slug = s.module.toLowerCase();
  const verb = s.permission_verb_override ?? `${s.state_name}_${"contract"}`; // fallback (should always have override)
  perms.push({ name: `${slug}:${verb}`, module: s.module, tier: "workflow-gate" });
}

// Override perms from pattern flags (has_submit_lock=true on master => :submit_<singular>)
const masterFlagMap: Array<{ doId: number; singular: string; module: string; hasSubmitLock: boolean; hasPersonalContent: boolean }> = [
  { doId: DO.contracts, singular: "legal_contract", module: "CLM-REPOSITORY", hasSubmitLock: true, hasPersonalContent: false },
  { doId: DO.obligations, singular: "contract_obligation", module: "CLM-OBLIGATION-MGMT", hasSubmitLock: false, hasPersonalContent: false },
  { doId: DO.clauses, singular: "contract_clause", module: "CLM-AUTHORING", hasSubmitLock: true, hasPersonalContent: false },
  { doId: DO.templates, singular: "contract_template", module: "CLM-AUTHORING", hasSubmitLock: true, hasPersonalContent: false },
  { doId: DO.signatures, singular: "signature_record", module: "CLM-REPOSITORY", hasSubmitLock: true, hasPersonalContent: false },
];
for (const f of masterFlagMap) {
  const slug = f.module.toLowerCase();
  if (f.hasSubmitLock) perms.push({ name: `${slug}:submit_${f.singular}`, module: f.module, tier: "override" });
}

const permNameList = perms.map(p => p.name).join(",");
const existingPerms: Row[] = await pg("GET", `/permissions?permission_name=in.(${permNameList})&select=id,permission_name`) ?? [];
const permId: Record<string, number> = {};
for (const r of existingPerms) permId[String(r.permission_name)] = Number(r.id);

for (const p of perms) {
  if (permId[p.name]) continue;
  console.log(`  ✨ perm ${p.name} (${p.tier})`);
  await pg("POST", "/permissions", {
    permission_name: p.name,
    tier: p.tier,
    module_id: PLATFORM_MODULE,
    domain_module_id: modId[p.module],
  });
}
const allPermRows: Row[] = await pg("GET", `/permissions?permission_name=in.(${permNameList})&select=id,permission_name`) ?? [];
for (const r of allPermRows) permId[String(r.permission_name)] = Number(r.id);

// 2. Roles
type RoleSpec = { code: string; name: string; description: string; functionId: number | null;
                  modules: Array<{ code: string; interaction: "primary"|"secondary" }>;
                  bundle: string[] };
const roles: RoleSpec[] = [
  { code: "CONTRACT-OPS-ADMINISTRATOR", name: "Contract Administrator",
    description: "Day-to-day operator of the contract repository, obligations register, and renewal queue. Drafts contracts from templates, persists executed contracts, tracks obligations, and surfaces renewals for review.",
    functionId: 74, // Contract Operations
    modules: [
      { code: "CLM-REPOSITORY", interaction: "primary" },
      { code: "CLM-OBLIGATION-MGMT", interaction: "primary" },
      { code: "CLM-RENEWAL", interaction: "primary" },
      { code: "CLM-AUTHORING", interaction: "secondary" },
      { code: "CLM-NEGOTIATION", interaction: "secondary" },
    ],
    bundle: [
      "clm-repository:manage",
      "clm-obligation-mgmt:manage",
      "clm-renewal:manage",
      "clm-authoring:read",
      "clm-negotiation:read",
    ],
  },
  { code: "CONTRACT-OPS-MANAGER", name: "Contract Operations Manager",
    description: "Manager of the contract operations function. Full admin on repository, obligations, and renewal; final approver for high-value contracts. Owns SLAs on obligation closure and renewal cycles.",
    functionId: 74,
    modules: [
      { code: "CLM-REPOSITORY", interaction: "primary" },
      { code: "CLM-OBLIGATION-MGMT", interaction: "primary" },
      { code: "CLM-RENEWAL", interaction: "primary" },
      { code: "CLM-AUTHORING", interaction: "secondary" },
      { code: "CLM-NEGOTIATION", interaction: "secondary" },
    ],
    bundle: [
      "clm-repository:admin",
      "clm-obligation-mgmt:admin",
      "clm-renewal:admin",
      "clm-authoring:manage",
      "clm-negotiation:manage",
    ],
  },
  { code: "LEGAL-COUNSEL", name: "Legal Counsel",
    description: "In-house attorney with final authority on contract approval and clause-library curation. Drives negotiation, approves clauses and templates, owns redline workflow.",
    functionId: 7, // Legal
    modules: [
      { code: "CLM-AUTHORING", interaction: "primary" },
      { code: "CLM-NEGOTIATION", interaction: "primary" },
      { code: "CLM-REPOSITORY", interaction: "secondary" },
    ],
    bundle: [
      "clm-authoring:admin",
      "clm-negotiation:admin",
      "clm-repository:manage",
    ],
  },
  { code: "PROCUREMENT-NEGOTIATOR", name: "Procurement Contract Negotiator",
    description: "Procurement-side counterpart to legal counsel for supplier contracts. Drives commercial negotiation, requests legal approvals, finalizes terms with suppliers.",
    functionId: 19, // Procurement
    modules: [
      { code: "CLM-NEGOTIATION", interaction: "primary" },
      { code: "CLM-AUTHORING", interaction: "secondary" },
      { code: "CLM-REPOSITORY", interaction: "secondary" },
    ],
    bundle: [
      "clm-negotiation:manage",
      "clm-authoring:manage",
      "clm-repository:read",
    ],
  },
  { code: "SALES-CONTRACT-INITIATOR", name: "Sales Contract Initiator",
    description: "Sales-side counterpart driving customer-contract authoring from quote-to-signature. Initiates contracts from CPQ-approved quotes, hands negotiation to legal, monitors signature status.",
    functionId: 21, // Sales
    modules: [
      { code: "CLM-AUTHORING", interaction: "primary" },
      { code: "CLM-REPOSITORY", interaction: "secondary" },
    ],
    bundle: [
      "clm-authoring:manage",
      "clm-repository:read",
    ],
  },
];

const existingRoles: Row[] = await pg("GET", `/roles?role_code=in.(${roles.map(r => r.code).join(",")})&select=id,role_code`) ?? [];
const roleId: Record<string, number> = {};
for (const r of existingRoles) roleId[String(r.role_code)] = Number(r.id);

for (const r of roles) {
  if (roleId[r.code]) { console.log(`  ♻ role ${r.code} (id=${roleId[r.code]})`); continue; }
  console.log(`  ✨ role ${r.code}`);
  const slug = r.code.toLowerCase().replace(/-/g, "_");
  const body: Row = {
    role_code: r.code,
    role_name: r.name,
    slug,
    description: r.description,
    origin: "model",
  };
  if (r.functionId !== null) body.business_function_id = r.functionId;
  await pg("POST", "/roles", body);
}
const allRoleRows: Row[] = await pg("GET", `/roles?role_code=in.(${roles.map(r => r.code).join(",")})&select=id,role_code`) ?? [];
for (const r of allRoleRows) roleId[String(r.role_code)] = Number(r.id);

// role_modules
const roleIdList = Object.values(roleId).join(",");
const existingRM: Row[] = await pg("GET", `/role_modules?role_id=in.(${roleIdList})&select=role_id,domain_module_id`) ?? [];
const seenRM = new Set(existingRM.map(r => `${r.role_id}:${r.domain_module_id}`));
let rmAdded = 0;
for (const r of roles) {
  const rid = roleId[r.code];
  if (!rid) continue;
  for (const m of r.modules) {
    const mid = modId[m.code];
    if (!mid || seenRM.has(`${rid}:${mid}`)) continue;
    await pg("POST", "/role_modules", { role_id: rid, domain_module_id: mid, interaction_level: m.interaction });
    rmAdded++;
  }
}
console.log(`  role_modules: ${rmAdded} new`);

// role_permissions
const existingRP: Row[] = await pg("GET", `/role_permissions?role_id=in.(${roleIdList})&select=role_id,permission_id`) ?? [];
const seenRP = new Set(existingRP.map(r => `${r.role_id}:${r.permission_id}`));
let rpAdded = 0;
for (const r of roles) {
  const rid = roleId[r.code];
  if (!rid) continue;
  for (const pn of r.bundle) {
    const pid = permId[pn];
    if (!pid) { console.log(`  ⚠ role ${r.code} -> ${pn} (permission unresolved)`); continue; }
    if (seenRP.has(`${rid}:${pid}`)) continue;
    await pg("POST", "/role_permissions", { role_id: rid, permission_id: pid });
    rpAdded++;
  }
}
console.log(`  role_permissions: ${rpAdded} new`);

// =====================================================================
// FINAL — Semantius scores per module
// =====================================================================
console.log("\n========== Semantius scores per module ==========\n");

const SEMANTIUS_PLATFORM = new Set(["platform"]);
const SEMANTIUS_OPERATIONAL = new Set(["platform", "integration"]);

console.log("  module                  | tools | platform | strict | operational | gap tools");
console.log("  ------------------------|-------|----------|--------|-------------|-----------");

for (const s of skillSpecs) {
  const sid = skillId[s.name];
  if (!sid) { console.log(`  ${s.module.padEnd(23)} | NO SKILL`); continue; }
  // pull skill_tools + tools.coverage_tier
  const stRows: Row[] = await pg("GET", `/skill_tools?skill_id=eq.${sid}&select=tool_id,requirement_level,tool:tools(tool_name,coverage_tier)`) ?? [];
  const total = stRows.length;
  let platformCount = 0;
  let operationalCount = 0;
  const gapTools: string[] = [];
  for (const row of stRows) {
    const tool = row.tool as Row;
    const ct = String(tool.coverage_tier);
    if (SEMANTIUS_PLATFORM.has(ct)) platformCount++;
    if (SEMANTIUS_OPERATIONAL.has(ct)) operationalCount++;
    if (!SEMANTIUS_PLATFORM.has(ct)) gapTools.push(`${tool.tool_name}(${ct})`);
  }
  const strict = total === 0 ? 0 : Math.round((platformCount / total) * 100);
  const operational = total === 0 ? 0 : Math.round((operationalCount / total) * 100);
  console.log(
    `  ${s.module.padEnd(23)} | ${String(total).padStart(5)} | ${String(platformCount).padStart(8)} | ${(strict + "%").padStart(6)} | ${(operational + "%").padStart(11)} | ${gapTools.join(", ") || "—"}`
  );
}

console.log("\n✓ fix_clm.ts complete.");
console.log("\nUI checks:");
console.log("  https://tests.semantius.app/domain_map/domain_modules");
console.log("  https://tests.semantius.app/domain_map/capabilities");
console.log("  https://tests.semantius.app/domain_map/skills");
console.log("  https://tests.semantius.app/domain_map/roles");
