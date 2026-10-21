#!/usr/bin/env bun
// SRM Phase-B load: the 19 new SRM masters approved in a-SRM.md (q2 = yes, B3-NEW-MASTERS),
// anchored to the three SRM modules (SLM=405, SPM=406, SRC=407).
//
// Source surface: .tmp_deploy/SRM-phase0-2026-06-19.md + .tmp_deploy/SRM-phaseB-draft-2026-06-19.md.
// Correction applied vs the draft: supplier_esg_assessments already exists (data_object 327,
// MASTERED by ESG domain 21), so SRM does NOT master it (Rule M7 single-master). SRC takes it
// as consumer+optional instead. That drops the "20 masters" to 19 new SRM masters + 1 ESG consumer.
//
// Idempotent: every table is keyed on a natural / composite key, only the missing rows are inserted.
// Everything lands at record_status='new' (DB default; omitted) per Rule #1. No notes populated (Rule #15).

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
const get = (path: string) => call({ method: "GET", path });
async function insert(path: string, rows: Row[]): Promise<void> {
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
  }
}

const SLM = 405, SPM = 406, SRC = 407;

// ── 1. data_objects (the 19 new masters) ───────────────────────────────────────
// entity_type / pattern flags are Phase-B classifications (Rule #12), reviewable at record_status='new'.
type DO = {
  name: string; sing: string; plur: string; et: string;
  pc?: boolean; sl?: boolean; sa?: boolean;
  desc: string; cat: string;
};
const masters: DO[] = [
  // SLM
  { name: "supplier_contacts", sing: "Supplier Contact", plur: "Supplier Contacts", et: "operational_record", pc: true,
    desc: "Per-supplier contact roster: named people (procurement, AP, legal, certification contacts) with role, email, phone, and primary-contact flag.",
    cat: "Named contact people for each supplier, with their role, email, phone, and primary-contact designation." },
  { name: "supplier_locations", sing: "Supplier Location", plur: "Supplier Locations", et: "operational_record",
    desc: "Physical and operating sites per supplier: ship-from, remit-to, and manufacturing locations with address and site type.",
    cat: "Operating sites for each supplier, such as ship-from, remit-to, and manufacturing locations." },
  { name: "supplier_bank_accounts", sing: "Supplier Bank Account", plur: "Supplier Bank Accounts", et: "operational_workflow", sl: true,
    desc: "Validated remittance bank accounts per supplier: account and routing details, currency, and validation status. The payment-detail record AP consumes.",
    cat: "Validated remittance bank accounts for each supplier, holding account details, currency, and validation status." },
  { name: "supplier_documents", sing: "Supplier Document", plur: "Supplier Documents", et: "operational_record",
    desc: "Supplier-uploaded documents (W-9, tax forms, certificates, agreements) with document type, metadata, and expiry.",
    cat: "Documents uploaded by or about each supplier, such as tax forms, certificates, and agreements, with type and expiry metadata." },
  { name: "supplier_relationships", sing: "Supplier Relationship", plur: "Supplier Relationships", et: "junction",
    desc: "Parent/child and affiliate hierarchy links between supplier records, with relationship type.",
    cat: "Hierarchy and affiliate links between supplier records, such as parent, child, and affiliate relationships." },
  { name: "supplier_registrations", sing: "Supplier Registration", plur: "Supplier Registrations", et: "operational_workflow",
    desc: "Self-service registration record a prospective supplier submits before onboarding, capturing company, tax, and contact basics for review.",
    cat: "Self-service registrations submitted by prospective suppliers before onboarding, with company, tax, and contact basics." },
  { name: "supplier_segmentation_tiers", sing: "Supplier Segmentation Tier", plur: "Supplier Segmentation Tiers", et: "catalog",
    desc: "Category and strategic tier classification scheme used to prioritize supplier-management effort (strategic, preferred, transactional).",
    cat: "Tier classifications that rank suppliers by strategic importance, such as strategic, preferred, and transactional." },
  { name: "supplier_information_requests", sing: "Supplier Information Request", plur: "Supplier Information Requests", et: "operational_workflow",
    desc: "Data-refresh campaigns asking suppliers to update or re-attest their information, tracked from issue through response and closure.",
    cat: "Campaigns asking suppliers to update or re-attest their information, tracked from issue through response and closure." },
  { name: "supplier_tasks", sing: "Supplier Task", plur: "Supplier Tasks", et: "operational_workflow",
    desc: "Workflow tasks and to-dos assigned across the supplier-management lifecycle, with assignee, due date, and status.",
    cat: "Tasks and to-dos assigned across the supplier-management lifecycle, with assignee, due date, and status." },
  { name: "supplier_questionnaires", sing: "Supplier Questionnaire", plur: "Supplier Questionnaires", et: "catalog",
    desc: "Reusable questionnaire templates and their instances (insurance, security, ESG, financial) used by qualification, performance, and risk workflows.",
    cat: "Reusable questionnaire templates used across qualification, performance, and risk workflows, such as insurance, security, ESG, and financial forms." },
  // SPM
  { name: "supplier_kpis", sing: "Supplier KPI", plur: "Supplier KPIs", et: "catalog",
    desc: "Defined performance metrics tracked per supplier (delivery, quality, responsiveness, savings) with target and weighting.",
    cat: "Performance metric definitions tracked per supplier, such as delivery, quality, responsiveness, and savings, with targets and weightings." },
  { name: "supplier_performance_reviews", sing: "Supplier Performance Review", plur: "Supplier Performance Reviews", et: "operational_workflow",
    desc: "Periodic review records rolling KPIs into a shared assessment with the supplier, from draft through finalization and acknowledgment.",
    cat: "Periodic reviews that roll KPIs into a shared assessment with each supplier, from draft through finalization." },
  { name: "supplier_corrective_actions", sing: "Supplier Corrective Action", plur: "Supplier Corrective Actions", et: "operational_workflow",
    desc: "Corrective-action plans (CAPAs) opened against supplier underperformance and tracked to closure with root cause and verification.",
    cat: "Corrective-action plans opened against supplier underperformance and tracked to closure, with root cause and verification." },
  { name: "supplier_issues", sing: "Supplier Issue", plur: "Supplier Issues", et: "operational_workflow",
    desc: "Logged supplier issues and complaints feeding performance and corrective-action workflows, from log through resolution.",
    cat: "Logged supplier issues and complaints that feed performance and corrective-action workflows, tracked from log to resolution." },
  // SRC
  { name: "supplier_screening_records", sing: "Supplier Screening Record", plur: "Supplier Screening Records", et: "operational_workflow", sl: true,
    desc: "Time-stamped sanctions, denied-party, and PEP screening events per supplier with hit results and adjudication trail.",
    cat: "Sanctions, denied-party, and PEP screening events per supplier, with results and adjudication trail." },
  { name: "supplier_beneficial_owners", sing: "Supplier Beneficial Owner", plur: "Supplier Beneficial Owners", et: "operational_record", pc: true,
    desc: "Beneficial-ownership records (25 percent or greater UBO) for know-your-business diligence: owner identity, ownership percentage, and verification source.",
    cat: "Beneficial-ownership records for each supplier, capturing owner identity, ownership percentage, and verification source." },
  { name: "supplier_diversity_classifications", sing: "Supplier Diversity Classification", plur: "Supplier Diversity Classifications", et: "operational_workflow",
    desc: "Diversity and Tier-1/Tier-2 spend certifications (MBE, WBE, VBE, etc.) per supplier, with certifying body and expiry.",
    cat: "Diversity spend certifications for each supplier, such as MBE, WBE, and VBE, with certifying body and expiry." },
  { name: "supplier_insurance_certificates", sing: "Supplier Insurance Certificate", plur: "Supplier Insurance Certificates", et: "operational_workflow", sl: true,
    desc: "Certificate-of-insurance tracking per supplier: coverage type, limits, carrier, and expiry with renewal alerts.",
    cat: "Certificates of insurance for each supplier, with coverage type, limits, carrier, and expiry." },
  { name: "supplier_attestations", sing: "Supplier Attestation", plur: "Supplier Attestations", et: "operational_workflow", sl: true,
    desc: "Code-of-conduct, modern-slavery, and conflict-minerals declarations the supplier signs, tracked from request through signature and expiry.",
    cat: "Declarations the supplier signs, such as code-of-conduct, modern-slavery, and conflict-minerals attestations, tracked through signature and expiry." },
];

// Module + necessity per master (Rule #16), per the approved draft.
const masterPlacement: Record<string, { module: number; necessity: string }> = {
  supplier_contacts: { module: SLM, necessity: "required" },
  supplier_locations: { module: SLM, necessity: "optional" },
  supplier_bank_accounts: { module: SLM, necessity: "required" },
  supplier_documents: { module: SLM, necessity: "required" },
  supplier_relationships: { module: SLM, necessity: "optional" },
  supplier_registrations: { module: SLM, necessity: "required" },
  supplier_segmentation_tiers: { module: SLM, necessity: "optional" },
  supplier_information_requests: { module: SLM, necessity: "required" },
  supplier_tasks: { module: SLM, necessity: "optional" },
  supplier_questionnaires: { module: SLM, necessity: "optional" },
  supplier_kpis: { module: SPM, necessity: "optional" },
  supplier_performance_reviews: { module: SPM, necessity: "optional" },
  supplier_corrective_actions: { module: SPM, necessity: "optional" },
  supplier_issues: { module: SPM, necessity: "optional" },
  supplier_screening_records: { module: SRC, necessity: "optional" },
  supplier_beneficial_owners: { module: SRC, necessity: "optional" },
  supplier_diversity_classifications: { module: SRC, necessity: "optional" },
  supplier_insurance_certificates: { module: SRC, necessity: "optional" },
  supplier_attestations: { module: SRC, necessity: "optional" },
};

// ── 2. lifecycle states for the operational_workflow masters ────────────────────
// [state, order, is_initial, is_terminal, requires_permission, verb_override]
type St = [string, number, boolean, boolean, boolean, string];
const lifecycles: Record<string, St[]> = {
  supplier_bank_accounts: [
    ["unverified", 10, true, false, false, ""],
    ["pending_validation", 20, false, false, false, ""],
    ["validated", 30, false, false, true, "validate_bank_account"],
    ["active", 40, false, false, false, ""],
    ["inactive", 50, false, true, false, ""],
  ],
  supplier_registrations: [
    ["draft", 10, true, false, false, ""],
    ["submitted", 20, false, false, false, ""],
    ["under_review", 30, false, false, false, ""],
    ["approved", 40, false, true, true, "approve_registration"],
    ["rejected", 50, false, true, false, ""],
  ],
  supplier_information_requests: [
    ["draft", 10, true, false, false, ""],
    ["sent", 20, false, false, false, ""],
    ["in_progress", 30, false, false, false, ""],
    ["completed", 40, false, true, true, "close_information_request"],
    ["cancelled", 50, false, true, false, ""],
  ],
  supplier_tasks: [
    ["open", 10, true, false, false, ""],
    ["in_progress", 20, false, false, false, ""],
    ["completed", 30, false, true, false, ""],
    ["cancelled", 40, false, true, false, ""],
  ],
  supplier_performance_reviews: [
    ["draft", 10, true, false, false, ""],
    ["in_review", 20, false, false, false, ""],
    ["finalized", 30, false, false, true, "finalize_performance_review"],
    ["acknowledged", 40, false, true, false, ""],
  ],
  supplier_corrective_actions: [
    ["open", 10, true, false, false, ""],
    ["in_progress", 20, false, false, false, ""],
    ["resolved", 30, false, false, false, ""],
    ["verified", 40, false, false, true, "verify_corrective_action"],
    ["closed", 50, false, true, false, ""],
  ],
  supplier_issues: [
    ["logged", 10, true, false, false, ""],
    ["triaged", 20, false, false, false, ""],
    ["in_progress", 30, false, false, false, ""],
    ["resolved", 40, false, false, false, ""],
    ["closed", 50, false, true, false, ""],
  ],
  supplier_screening_records: [
    ["pending", 10, true, false, false, ""],
    ["screened", 20, false, false, false, ""],
    ["hit_review", 30, false, false, false, ""],
    ["adjudicated", 40, false, true, true, "adjudicate_screening"],
    ["cleared", 50, false, true, false, ""],
  ],
  supplier_diversity_classifications: [
    ["valid", 10, true, false, false, ""],
    ["expiring_soon", 20, false, false, false, ""],
    ["expired", 30, false, true, false, ""],
    ["revoked", 40, false, true, false, ""],
  ],
  supplier_insurance_certificates: [
    ["valid", 10, true, false, false, ""],
    ["expiring_soon", 20, false, false, false, ""],
    ["expired", 30, false, true, false, ""],
  ],
  supplier_attestations: [
    ["requested", 10, true, false, false, ""],
    ["signed", 20, false, false, true, "sign_attestation"],
    ["expired", 30, false, true, false, ""],
  ],
};

// ── 3. aliases (alias_type='synonym'; non-self-explanatory masters) ─────────────
const aliases: Record<string, string[]> = {
  supplier_contacts: ["supplier contact roster", "vendor contacts"],
  supplier_locations: ["supplier sites"],
  supplier_bank_accounts: ["remit-to account", "payment details"],
  supplier_documents: ["supplier files"],
  supplier_relationships: ["supplier hierarchy", "parent/child suppliers"],
  supplier_registrations: ["self-registration", "supplier sign-up"],
  supplier_segmentation_tiers: ["supplier tiers", "category segmentation"],
  supplier_information_requests: ["data refresh campaign", "information update request"],
  supplier_questionnaires: ["surveys", "qualification questionnaires", "RFI forms"],
  supplier_kpis: ["supplier metrics", "performance indicators"],
  supplier_performance_reviews: ["supplier business reviews", "QBRs"],
  supplier_corrective_actions: ["CAPA", "corrective action plan"],
  supplier_issues: ["supplier complaints"],
  supplier_screening_records: ["sanctions screening", "watchlist screening", "PEP screening"],
  supplier_beneficial_owners: ["UBO", "ultimate beneficial owners"],
  supplier_diversity_classifications: ["diversity certifications", "MBE/WBE status"],
  supplier_insurance_certificates: ["COI", "certificate of insurance"],
  supplier_attestations: ["compliance declarations", "code of conduct attestations"],
};

// ════════════════════════════════════════════════════════════════════════════════
async function main() {
  // 1. data_objects ────────────────────────────────────────────────────────────
  const existingDO = await get(`/data_objects?data_object_name=in.(${masters.map(m => m.name).join(",")})&select=id,data_object_name`);
  const haveDO = new Set(existingDO.map(r => String(r.data_object_name)));
  const newDO = masters.filter(m => !haveDO.has(m.name)).map(m => ({
    data_object_name: m.name,
    singular_label: m.sing,
    plural_label: m.plur,
    description: m.desc,
    catalog_description: m.cat,
    entity_type: m.et,
    kind: "domain_owned",
    is_canonical_bare_word: false,
    has_personal_content: !!m.pc,
    has_submit_lock: !!m.sl,
    has_single_approver: !!m.sa,
  }));
  console.log(`data_objects: ${newDO.length} new, ${existingDO.length} already present`);
  await insert("/data_objects", newDO);

  // name -> id map (incl. the ESG-mastered supplier_esg_assessments for the consumer row)
  const allDO = await get(`/data_objects?or=(data_object_name.in.(${masters.map(m => m.name).join(",")}),data_object_name.eq.supplier_esg_assessments)&select=id,data_object_name`);
  const idOf = new Map<string, number>(allDO.map(r => [String(r.data_object_name), Number(r.id)]));

  // 2. domain_module_data_objects ──────────────────────────────────────────────
  const dmdoRows: Row[] = [];
  for (const m of masters) {
    const p = masterPlacement[m.name];
    dmdoRows.push({ domain_module_id: p.module, data_object_id: idOf.get(m.name), role: "master", necessity: p.necessity });
  }
  // supplier_questionnaires consumed by SPM + SRC (mastered in SLM; single-master, Rule M7)
  const qId = idOf.get("supplier_questionnaires")!;
  dmdoRows.push({ domain_module_id: SPM, data_object_id: qId, role: "consumer", necessity: "optional" });
  dmdoRows.push({ domain_module_id: SRC, data_object_id: qId, role: "consumer", necessity: "optional" });
  // supplier_esg_assessments consumed by SRC (mastered by ESG domain 21; do NOT re-master)
  dmdoRows.push({ domain_module_id: SRC, data_object_id: idOf.get("supplier_esg_assessments"), role: "consumer", necessity: "optional" });

  const existingDMDO = await get(`/domain_module_data_objects?domain_module_id=in.(${SLM},${SPM},${SRC})&select=domain_module_id,data_object_id`);
  const haveDMDO = new Set(existingDMDO.map(r => `${r.domain_module_id}:${r.data_object_id}`));
  const newDMDO = dmdoRows.filter(r => !haveDMDO.has(`${r.domain_module_id}:${r.data_object_id}`));
  console.log(`domain_module_data_objects: ${newDMDO.length} new (${dmdoRows.length} intended, ${existingDMDO.length} pre-existing on the 3 modules)`);
  await insert("/domain_module_data_objects", newDMDO);

  // 3. data_object_lifecycle_states ─────────────────────────────────────────────
  const lsTargets = Object.keys(lifecycles).map(n => idOf.get(n)!);
  const existingLS = await get(`/data_object_lifecycle_states?data_object_id=in.(${lsTargets.join(",")})&select=data_object_id,state_name`);
  const haveLS = new Set(existingLS.map(r => `${r.data_object_id}:${r.state_name}`));
  const lsRows: Row[] = [];
  for (const [name, states] of Object.entries(lifecycles)) {
    const doId = idOf.get(name)!;
    const moduleId = masterPlacement[name].module;
    for (const [state, order, init, term, reqPerm, verb] of states) {
      if (haveLS.has(`${doId}:${state}`)) continue;
      lsRows.push({
        data_object_id: doId,
        data_object_lifecycle_state_label: `${name}.${state}`,
        state_name: state,
        state_order: order,
        is_initial: init,
        is_terminal: term,
        requires_permission: reqPerm,
        permission_verb_override: verb,
        domain_module_id: moduleId,
      });
    }
  }
  console.log(`data_object_lifecycle_states: ${lsRows.length} new`);
  await insert("/data_object_lifecycle_states", lsRows);

  // 4. data_object_aliases ──────────────────────────────────────────────────────
  const alTargets = Object.keys(aliases).map(n => idOf.get(n)!);
  const existingAL = await get(`/data_object_aliases?data_object_id=in.(${alTargets.join(",")})&select=data_object_id,alias_name`);
  const haveAL = new Set(existingAL.map(r => `${r.data_object_id}:${String(r.alias_name).toLowerCase()}`));
  const alRows: Row[] = [];
  for (const [name, syns] of Object.entries(aliases)) {
    const doId = idOf.get(name)!;
    syns.forEach((alias, i) => {
      if (haveAL.has(`${doId}:${alias.toLowerCase()}`)) return;
      alRows.push({ data_object_id: doId, alias_name: alias, alias_type: "synonym", is_preferred: i === 0 });
    });
  }
  console.log(`data_object_aliases: ${alRows.length} new`);
  await insert("/data_object_aliases", alRows);

  console.log("\nDone. All rows at record_status='new'.");
}

await main();
