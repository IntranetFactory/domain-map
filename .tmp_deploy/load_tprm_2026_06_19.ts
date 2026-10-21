// TPRM (Third-Party Risk Management, domain_id 19) full build.
// Authorized by audits/TPRM/a-TPRM.md (a1=b, a2=a, a3=b, a4=a, a6=yes-delete, a7=yes-build;
// a5 kept open, non-blocking). Build spec: .tmp_deploy/TPRM-phaseB-draft-2026-06-19.md.
// Idempotent: every step reads existing state first and inserts only what is missing.
//
// Scope (user-approved 2026-06-19):
//   1. Domain metadata (id 19): all Rule #8 fields + catalog copy already populated -> no write.
//   2. 5 full modules (buyer-voice catalog copy, Rule #20).
//   3. 28 new TPRM masters (data_objects + domain_module_data_objects role=master). Every name
//      pre-checked M7-clean (zero existing master rows catalog-wide). necessity per Rule #16.
//   4. Consumed rows (role=consumer) for suppliers (206), audit_findings (294),
//      supplier_esg_assessments (327), compliance_controls (283), control_assessments (284),
//      compliance_risks (282). NEVER master for these. (contracts / risk_categories do not exist
//      as data_objects -> skipped; cannot consume a non-existent object.)
//   5. 8 capabilities + capability_domains + domain_module_capabilities.
//   6. One domain skill (skill_type='domain', skill_name='tprm') + tools + domain_module_tools
//      (>=1 query, >=1 mutate, >=1 workflow-gate per module). notify_person/notify_team default.
//   7. domain_aliases.
//   8. Inbound handoff FK backfill: 258 -> TPRM-REMEDIATION, 278 -> TPRM-CONTINUOUS-MONITORING.
//   9. DELETE handoff_processes id 705 (a6=yes, destructive, APPROVED; verified 278/815).
//
// NEVER touches record_status (Rule #1): all new rows default 'new'. No vendor names (Rule #18).
// All notes left EMPTY (Rule #15). No em-dashes. American English.

type Row = Record<string, unknown>;

async function call(req: { method: string; path: string; body?: unknown }): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(req));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  const trimmed = out.trim();
  if (!trimmed) {
    if (proc.exitCode === 0) return [];
    throw new Error(`call failed (${proc.exitCode}) ${req.method} ${req.path}: ${err}`);
  }
  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`non-JSON from ${req.method} ${req.path}: ${trimmed.slice(0, 500)} ${err}`);
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.code && parsed.message) {
    throw new Error(`PostgREST error ${req.method} ${req.path}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}
const get = (path: string) => call({ method: "GET", path });

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    if (Array.isArray(result)) out.push(...result);
  }
  return out;
}
const log = (m: string) => console.log(m);

const DOMAIN_ID = 19;
const DOMAIN_NAME = "Third-Party Risk Management";

// ---------------------------------------------------------------------------
// 0. Pre-flight: confirm domain exists, confirm metadata complete (no write if so)
// ---------------------------------------------------------------------------
const [domain] = await get(
  `/domains?id=eq.${DOMAIN_ID}&select=id,domain_code,crud_percentage,business_logic,min_org_size,cost_band,certification_required,usa_market_size_usd_m,market_size_source_year,catalog_tagline,catalog_description`,
);
if (!domain) throw new Error(`domain ${DOMAIN_ID} not found`);
if (domain.domain_code !== "TPRM") throw new Error(`domain ${DOMAIN_ID} is not TPRM (${domain.domain_code})`);
{
  const missing: string[] = [];
  if (!domain.crud_percentage) missing.push("crud_percentage");
  if (domain.business_logic === "" && Number(domain.crud_percentage) < 95) missing.push("business_logic");
  if (!domain.min_org_size) missing.push("min_org_size");
  if (!domain.cost_band) missing.push("cost_band");
  if (!domain.usa_market_size_usd_m) missing.push("usa_market_size_usd_m");
  if (!domain.market_size_source_year) missing.push("market_size_source_year");
  if (!domain.catalog_tagline) missing.push("catalog_tagline");
  if (!domain.catalog_description) missing.push("catalog_description");
  if (missing.length) {
    throw new Error(
      `Domain 19 missing Rule #8 / Rule #20 fields: ${missing.join(", ")}. Spec assumed these were already populated; STOP and revisit the draft before authoring.`,
    );
  }
  log("domain 19 metadata + catalog copy already complete (no write needed)");
}

// ---------------------------------------------------------------------------
// 1. Five full modules
// ---------------------------------------------------------------------------
const moduleSpecs = [
  {
    domain_module_code: "TPRM-ONBOARDING-INTAKE",
    domain_module_name: "Third-Party Onboarding and Intake",
    description:
      "Register the broad third party, scope the per-service engagement, capture the vendor-side contacts, and classify criticality before any diligence begins. The intake spine: business-sponsor requests in, the third-party master and its tier out, plus offboarding and exit due diligence.",
    catalog_tagline: "Register every third party, scope the engagement, and tier it before diligence starts.",
    catalog_description:
      "Bring every external party you depend on into one inventory, not just the suppliers you invoice. Take in a business sponsor's request, register the third party and the specific service engagement, capture who to contact on the vendor side, and classify how critical the relationship is so the right depth of diligence kicks in. Flag the engagements that are critical or important to the business, and run a clean exit when a relationship ends. One trusted record per third party that procurement, security, and risk all work from.",
  },
  {
    domain_module_code: "TPRM-DUE-DILIGENCE",
    domain_module_name: "Due Diligence and Assessment",
    description:
      "The deep, engagement and contract-gated diligence that distinguishes third-party risk from operational supplier qualification: questionnaires, document collection, certification and attestation checks, regulatory agreements, and the pre-contract go or no-go.",
    catalog_tagline: "Run the questionnaires, collect the evidence, and decide go or no-go before you sign.",
    catalog_description:
      "Send each third party the diligence its tier demands and grade what comes back. Build assessments from a library of security questionnaires, collect every answer and its supporting evidence, and gather the certifications, audit reports, and attestations that prove the controls are real. Track the regulatory agreements a relationship requires, run periodic re-assessment campaigns, and reach a clear, defensible go or no-go before the contract is signed. The deep diligence that decides whether it is safe to do business.",
  },
  {
    domain_module_code: "TPRM-CONTINUOUS-MONITORING",
    domain_module_name: "Continuous Risk Monitoring",
    description:
      "Post-contract watching: recompute the internal risk rating per third party and engagement, ingest external security ratings, and triage breach, sanctions, and financial signals to drive the re-assessment cadence.",
    catalog_tagline: "Keep watching after you sign, with ratings, signals, and a live risk score.",
    catalog_description:
      "Stop treating diligence as a one-time gate. Recompute each third party's risk rating on a cadence set by its tier, pull in external security ratings as they change, and triage breach, sanctions, and financial-distress signals as they surface. When a third party drifts into higher risk, the score moves and the right reviewers see it in time to act, so a clearance keeps its meaning long after the contract goes live.",
  },
  {
    domain_module_code: "TPRM-REMEDIATION",
    domain_module_name: "Remediation and Issue Management",
    description:
      "Turn findings raised from assessment and monitoring into tracked, time-boxed remediation that closes before renewal, and record risk acceptances with an expiry when a finding will not be fixed. Consumes audit findings handed off from the audit domain.",
    catalog_tagline: "Turn findings into tracked remediation that closes before the next renewal.",
    catalog_description:
      "Raise an issue the moment an assessment or a monitoring signal surfaces a problem, and drive it to closure. Open vendor-scoped remediation plans time-boxed to the next review cycle or contract renewal, assign owners, and track them to done. When a finding will not be fixed, record a risk acceptance with a clear owner and an expiry date so nothing stays accepted forever. A defensible trail of every issue raised against a third party and how it was resolved.",
  },
  {
    domain_module_code: "TPRM-SUPPLY-CHAIN-RISK",
    domain_module_name: "Supply-Chain and Nth-Party Risk",
    description:
      "Visibility beyond the direct third party: subcontractor and fourth-party edges, concentration risk across shared providers, and the regulatory registers and subcontracting-chain disclosures that resilience frameworks require.",
    catalog_tagline: "See past the direct vendor into the subcontractors and concentration risk behind it.",
    catalog_description:
      "Your risk does not stop at the companies you contract with directly. Map the subcontractors and fourth parties your providers depend on, spot where many of your critical services trace back to the same handful of providers, and maintain the registers and subcontracting-chain disclosures that operational-resilience rules require. Add supply-chain attestations where standards demand them, so you can answer for the whole chain, not just the first link.",
  },
];
const existingModules = await get(
  `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
);
const haveModule = new Map<string, number>(
  existingModules.map((r: Row) => [String(r.domain_module_code), Number(r.id)]),
);
const modulesToInsert = moduleSpecs
  .filter((m) => !haveModule.has(m.domain_module_code))
  .map((m) => ({ ...m, domain_id: DOMAIN_ID, module_kind: "full" }));
await insert("/domain_modules", modulesToInsert);
const allModules = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
const moduleId = new Map<string, number>(
  allModules.map((r: Row) => [String(r.domain_module_code), Number(r.id)]),
);
const modIds = allModules.map((r: Row) => Number(r.id));
log(`modules: +${modulesToInsert.length} (total ${allModules.length})`);
for (const m of moduleSpecs) if (!moduleId.has(m.domain_module_code)) throw new Error(`module ${m.domain_module_code} missing after insert`);

// ---------------------------------------------------------------------------
// 2. 28 new TPRM masters (data_objects + master DMDO rows)
// ---------------------------------------------------------------------------
// entity_type per Rule #12; necessity per Rule #16 (statute/sector-bound -> optional). All names
// pre-checked M7-clean catalog-wide (zero existing rows + zero existing masters). notes EMPTY.
type NewMaster = {
  name: string;
  singular: string;
  plural: string;
  module: string;
  necessity: "required" | "optional";
  entity_type: "operational_workflow" | "operational_record" | "catalog" | "junction" | "computed";
  desc: string;
  flags?: Partial<{ has_single_approver: boolean; has_submit_lock: boolean; has_personal_content: boolean }>;
};
const newMasters: NewMaster[] = [
  // --- Module 1: TPRM-ONBOARDING-INTAKE ---
  { name: "third_parties", singular: "Third Party", plural: "Third Parties", module: "TPRM-ONBOARDING-INTAKE", necessity: "required", entity_type: "operational_workflow",
    desc: "External parties the organization depends on and risk-manages: the broad umbrella inventory record covering suppliers, service providers, processors, and partners, whether or not each is an invoiced supplier." },
  { name: "third_party_engagements", singular: "Third-Party Engagement", plural: "Third-Party Engagements", module: "TPRM-ONBOARDING-INTAKE", necessity: "required", entity_type: "operational_workflow",
    desc: "Per-service, contract-scoped relationships with a third party. Each engagement carries its own scope, data access, and risk profile, so one third party can hold several distinct engagements." },
  { name: "third_party_tiers", singular: "Third-Party Tier", plural: "Third-Party Tiers", module: "TPRM-ONBOARDING-INTAKE", necessity: "required", entity_type: "catalog",
    desc: "Criticality classifications such as critical, high, moderate, and low that drive re-assessment cadence and the depth of controls a third party must demonstrate." },
  { name: "third_party_contacts", singular: "Third-Party Contact", plural: "Third-Party Contacts", module: "TPRM-ONBOARDING-INTAKE", necessity: "optional", entity_type: "operational_record",
    desc: "Vendor-side respondents and relationship owners who answer questionnaires and supply evidence for a third party. Smaller programs inline these as attributes.", flags: { has_personal_content: true } },
  { name: "onboarding_requests", singular: "Onboarding Request", plural: "Onboarding Requests", module: "TPRM-ONBOARDING-INTAKE", necessity: "required", entity_type: "operational_workflow",
    desc: "Business-sponsor intake requests that start the third-party lifecycle, naming the proposed third party, the service, and the sponsoring team before diligence begins." },
  { name: "offboarding_records", singular: "Offboarding Record", plural: "Offboarding Records", module: "TPRM-ONBOARDING-INTAKE", necessity: "optional", entity_type: "operational_workflow",
    desc: "Termination and exit due-diligence records for ending a third-party relationship: data return or destruction, access revocation, and final obligations. Not every program formalizes exit." },
  { name: "critical_function_designations", singular: "Critical Function Designation", plural: "Critical Function Designations", module: "TPRM-ONBOARDING-INTAKE", necessity: "optional", entity_type: "operational_record",
    desc: "Flags marking an engagement as supporting a critical or important business function under operational-resilience rules, driving heightened oversight. Sector-bound." },
  // --- Module 2: TPRM-DUE-DILIGENCE ---
  { name: "third_party_assessments", singular: "Third-Party Assessment", plural: "Third-Party Assessments", module: "TPRM-DUE-DILIGENCE", necessity: "required", entity_type: "operational_workflow",
    desc: "The deep, engagement and contract-gated diligence record that decides whether it is safe to do business with a third party. Distinct from operational supplier qualification: it is keyed on the third party and scored from questionnaires and external ratings." },
  { name: "due_diligence_questionnaires", singular: "Due-Diligence Questionnaire", plural: "Due-Diligence Questionnaires", module: "TPRM-DUE-DILIGENCE", necessity: "required", entity_type: "catalog",
    desc: "Reusable questionnaire templates the assessment library draws from, such as standardized security and control questionnaires issued to third parties during diligence." },
  { name: "assessment_responses", singular: "Assessment Response", plural: "Assessment Responses", module: "TPRM-DUE-DILIGENCE", necessity: "required", entity_type: "junction",
    desc: "Per-question answers a third party returns on an assessment, with the supporting evidence attached, linking each response to the questionnaire version used." },
  { name: "assessment_campaigns", singular: "Assessment Campaign", plural: "Assessment Campaigns", module: "TPRM-DUE-DILIGENCE", necessity: "optional", entity_type: "operational_workflow",
    desc: "Batches that send a questionnaire to many third parties on a periodic re-assessment cadence and track collection to completion. Some programs assess ad hoc instead." },
  { name: "vendor_documents", singular: "Vendor Document", plural: "Vendor Documents", module: "TPRM-DUE-DILIGENCE", necessity: "required", entity_type: "operational_record",
    desc: "Evidence artifacts collected during diligence, such as audit reports, certifications, and policies, stored against the third party and its assessment." },
  { name: "business_associate_agreements", singular: "Business Associate Agreement", plural: "Business Associate Agreements", module: "TPRM-DUE-DILIGENCE", necessity: "optional", entity_type: "operational_record",
    desc: "Agreements required when a third party handles protected health information, tracking the signed instrument and its scope. Sector-bound to US healthcare." },
  { name: "data_processing_agreements", singular: "Data Processing Agreement", plural: "Data Processing Agreements", module: "TPRM-DUE-DILIGENCE", necessity: "optional", entity_type: "operational_record",
    desc: "Processor agreements required when a third party processes personal data on the organization's behalf, tracking the instrument and the processing terms. Jurisdiction-bound." },
  { name: "attestation_records", singular: "Attestation Record", plural: "Attestation Records", module: "TPRM-DUE-DILIGENCE", necessity: "optional", entity_type: "operational_record",
    desc: "Receipt and expiry tracking for third-party control reports and certifications, such as service-organization control reports and security-standard certifications. Distinct from employee policy attestations." },
  { name: "pci_vendor_compliance_records", singular: "PCI Vendor Compliance Record", plural: "PCI Vendor Compliance Records", module: "TPRM-DUE-DILIGENCE", necessity: "optional", entity_type: "operational_record",
    desc: "Payment-card service-provider compliance tracking, recording a third party's attestation of compliance and its validity window. Sector-bound." },
  { name: "regulatory_oversight_records", singular: "Regulatory Oversight Record", plural: "Regulatory Oversight Records", module: "TPRM-DUE-DILIGENCE", necessity: "optional", entity_type: "operational_record",
    desc: "Records aligning third-party diligence to financial-regulator interagency guidance on managing third-party relationships. Sector-bound to regulated financial institutions." },
  // --- Module 3: TPRM-CONTINUOUS-MONITORING ---
  { name: "third_party_risk_ratings", singular: "Third-Party Risk Rating", plural: "Third-Party Risk Ratings", module: "TPRM-CONTINUOUS-MONITORING", necessity: "required", entity_type: "computed",
    desc: "Internal computed risk scores per third party and engagement, recalculated from assessment results and monitoring signals to drive the re-assessment cadence." },
  { name: "security_ratings", singular: "Security Rating", plural: "Security Ratings", module: "TPRM-CONTINUOUS-MONITORING", necessity: "optional", entity_type: "operational_record",
    desc: "Point-in-time external security scores ingested for a third party from outside-in scanning sources, snapshotting the score, the source, and the scan date. Not every program subscribes to an external feed." },
  { name: "monitoring_signals", singular: "Monitoring Signal", plural: "Monitoring Signals", module: "TPRM-CONTINUOUS-MONITORING", necessity: "optional", entity_type: "junction",
    desc: "Breach, sanctions, and financial-distress events surfaced against a third party for triage, each linking the signal to the third party it concerns. Optional where a program does not ingest external signals." },
  // --- Module 4: TPRM-REMEDIATION ---
  { name: "third_party_risk_findings", singular: "Third-Party Risk Finding", plural: "Third-Party Risk Findings", module: "TPRM-REMEDIATION", necessity: "required", entity_type: "operational_workflow",
    desc: "Issues raised against a third party from an assessment or a monitoring signal, carrying a third-party reference and a remediation lifecycle. Distinct from the enterprise compliance-risk register." },
  { name: "third_party_remediation_plans", singular: "Third-Party Remediation Plan", plural: "Third-Party Remediation Plans", module: "TPRM-REMEDIATION", necessity: "required", entity_type: "operational_workflow",
    desc: "Vendor-scoped remediation plans that resolve a third-party finding, time-boxed to the next review cycle or contract renewal, with owners and due dates tracked to closure." },
  { name: "risk_acceptances", singular: "Risk Acceptance", plural: "Risk Acceptances", module: "TPRM-REMEDIATION", necessity: "optional", entity_type: "operational_workflow",
    desc: "Decisions to accept a third-party finding rather than remediate it, recorded with an owner, a rationale, and an expiry so accepted risk is revisited. Not every program formalizes acceptances.", flags: { has_single_approver: true } },
  // --- Module 5: TPRM-SUPPLY-CHAIN-RISK ---
  { name: "fourth_party_relationships", singular: "Fourth-Party Relationship", plural: "Fourth-Party Relationships", module: "TPRM-SUPPLY-CHAIN-RISK", necessity: "optional", entity_type: "junction",
    desc: "Subcontractor and nth-party edges linking a third party to the providers it in turn depends on, building the supply-chain graph behind a direct relationship. Not universal." },
  { name: "concentration_risk_views", singular: "Concentration Risk View", plural: "Concentration Risk Views", module: "TPRM-SUPPLY-CHAIN-RISK", necessity: "optional", entity_type: "computed",
    desc: "Derived views showing where many critical engagements trace back to the same shared fourth parties, surfacing single points of failure across the supply chain." },
  { name: "ict_provider_registers", singular: "ICT Provider Register", plural: "ICT Provider Registers", module: "TPRM-SUPPLY-CHAIN-RISK", necessity: "optional", entity_type: "operational_record",
    desc: "Structured registers of information-and-communications-technology providers maintained for operational-resilience reporting. Sector-bound to regulated financial institutions." },
  { name: "subcontracting_chains", singular: "Subcontracting Chain", plural: "Subcontracting Chains", module: "TPRM-SUPPLY-CHAIN-RISK", necessity: "optional", entity_type: "operational_record",
    desc: "Disclosures of the chain of subcontractors a critical provider relies on, required by operational-resilience rules to make nth-party dependencies visible. Sector-bound." },
  { name: "supply_chain_attestations", singular: "Supply-Chain Attestation", plural: "Supply-Chain Attestations", module: "TPRM-SUPPLY-CHAIN-RISK", necessity: "optional", entity_type: "operational_record",
    desc: "Attestations a provider gives about the security and integrity of its supply chain under supply-chain risk-management standards. Sector-bound." },
];

// 2a. Insert data_objects (idempotent on name)
const masterNames = newMasters.map((o) => o.name);
const existingMasterObjs = await get(
  `/data_objects?data_object_name=in.(${masterNames.join(",")})&select=id,data_object_name`,
);
const haveMasterObj = new Map<string, number>(
  existingMasterObjs.map((r: Row) => [String(r.data_object_name), Number(r.id)]),
);
const masterObjsToInsert = newMasters
  .filter((o) => !haveMasterObj.has(o.name))
  .map((o) => ({
    data_object_name: o.name,
    singular_label: o.singular,
    plural_label: o.plural,
    description: o.desc,
    entity_type: o.entity_type,
    kind: "domain_owned",
    has_personal_content: o.flags?.has_personal_content ?? false,
    has_submit_lock: o.flags?.has_submit_lock ?? false,
    has_single_approver: o.flags?.has_single_approver ?? false,
  }));
await insert("/data_objects", masterObjsToInsert);
log(`master data_objects: +${masterObjsToInsert.length} of ${newMasters.length}`);

const allMasterRows = await get(
  `/data_objects?data_object_name=in.(${masterNames.join(",")})&select=id,data_object_name`,
);
const objId = new Map<string, number>(
  allMasterRows.map((r: Row) => [String(r.data_object_name), Number(r.id)]),
);
for (const n of masterNames) if (!objId.has(n)) throw new Error(`data_object ${n} missing after insert`);

// 2b. M7 GUARD: before inserting any master DMDO row, confirm zero existing master rows for it.
log("\n--- M7 pre-insert guard (each TPRM master must have ZERO existing master rows) ---");
for (const o of newMasters) {
  const did = objId.get(o.name)!;
  const existingMasters = await get(
    `/domain_module_data_objects?data_object_id=eq.${did}&role=eq.master&select=id,domain_module_id`,
  );
  const foreign = existingMasters.filter((r: Row) => !modIds.includes(Number(r.domain_module_id)));
  if (foreign.length > 0) {
    throw new Error(
      `M7 FAIL: ${o.name} (do ${did}) already has a master row outside TPRM: ${JSON.stringify(foreign)}. STOP. This entity must be CONSUMED, not mastered.`,
    );
  }
}
log("M7 guard passed: all 28 TPRM master names are master-free catalog-wide.");

// 2c. Insert master DMDO rows (idempotent on (module, data_object))
const existingDMDO = await get(
  `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id,role`,
);
const haveDMDO = new Set(existingDMDO.map((r: Row) => `${r.domain_module_id}.${r.data_object_id}`));
const masterRows = newMasters
  .map((o) => ({ o, mid: moduleId.get(o.module)!, did: objId.get(o.name)! }))
  .filter(({ mid, did }) => !haveDMDO.has(`${mid}.${did}`))
  .map(({ o, mid, did }) => ({
    domain_module_id: mid,
    data_object_id: did,
    role: "master",
    necessity: o.necessity,
    domain_module_data_object_label: `${o.module} / ${o.name}`,
    notes: "",
  }));
await insert("/domain_module_data_objects", masterRows);
log(`master DMDO rows: +${masterRows.length} of ${newMasters.length}`);

// ---------------------------------------------------------------------------
// 3. Consumed rows (role=consumer). NEVER master for these. contracts / risk_categories
//    do not exist as data_objects -> cannot consume; skipped with a log line.
// ---------------------------------------------------------------------------
const consumeSpecs: { name: string; module: string }[] = [
  { name: "suppliers", module: "TPRM-ONBOARDING-INTAKE" },          // SRM master (206); third party subtype source
  { name: "suppliers", module: "TPRM-SUPPLY-CHAIN-RISK" },          // chain roots
  { name: "compliance_controls", module: "TPRM-DUE-DILIGENCE" },    // GRC (unbuilt)
  { name: "control_assessments", module: "TPRM-DUE-DILIGENCE" },    // GRC (unbuilt)
  { name: "audit_findings", module: "TPRM-REMEDIATION" },           // AUDIT (unbuilt); a7 routing
  { name: "compliance_risks", module: "TPRM-REMEDIATION" },         // GRC (unbuilt) link
  { name: "supplier_esg_assessments", module: "TPRM-CONTINUOUS-MONITORING" }, // ESG (unbuilt); handoff 278 payload
];
const consumeNames = [...new Set(consumeSpecs.map((c) => c.name))];
const consumeObjRows = await get(
  `/data_objects?data_object_name=in.(${consumeNames.join(",")})&select=id,data_object_name`,
);
const consumeId = new Map<string, number>(
  consumeObjRows.map((r: Row) => [String(r.data_object_name), Number(r.id)]),
);
const missingConsume = consumeNames.filter((n) => !consumeId.has(n));
if (missingConsume.length) log(`consume targets absent from catalog (skipped, cannot consume non-existent objects): ${missingConsume.join(", ")}`);

// M7 within-domain coherence guard: never add a consumer for an object TPRM also masters.
const tprmMasterIds = new Set(newMasters.map((o) => objId.get(o.name)!));
const existingDMDO2 = await get(
  `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`,
);
const haveDMDO2 = new Set(existingDMDO2.map((r: Row) => `${r.domain_module_id}.${r.data_object_id}`));
const consumeRows = consumeSpecs
  .filter((c) => consumeId.has(c.name))
  .map((c) => ({ c, mid: moduleId.get(c.module)!, did: consumeId.get(c.name)! }))
  .filter(({ did }) => {
    if (tprmMasterIds.has(did)) throw new Error(`coherence FAIL: consumer requested for ${did} which TPRM also masters`);
    return true;
  })
  .filter(({ mid, did }) => !haveDMDO2.has(`${mid}.${did}`))
  .map(({ c, mid, did }) => ({
    domain_module_id: mid,
    data_object_id: did,
    role: "consumer",
    necessity: "optional",
    domain_module_data_object_label: `${c.module} / ${c.name}`,
    notes: "",
  }));
await insert("/domain_module_data_objects", consumeRows);
log(`consumer DMDO rows: +${consumeRows.length}`);

// ---------------------------------------------------------------------------
// 4. Capabilities + capability_domains + domain_module_capabilities
// ---------------------------------------------------------------------------
const capSpecs = [
  { code: "TPRM-ONBOARDING-INTAKE", name: "Third-party onboarding and intake", module: "TPRM-ONBOARDING-INTAKE", desc: "Register third parties, scope engagements, and take in business-sponsor intake requests to start the lifecycle." },
  { code: "TPRM-RISK-TIERING", name: "Risk tiering and criticality classification", module: "TPRM-ONBOARDING-INTAKE", desc: "Classify each third party by criticality to set the cadence and control depth its diligence demands." },
  { code: "TPRM-DUE-DILIGENCE", name: "Due-diligence questionnaire assessment", module: "TPRM-DUE-DILIGENCE", desc: "Send questionnaires, collect answers and evidence, and grade the deep diligence record for a third party." },
  { code: "TPRM-GO-NO-GO", name: "Pre-contract go/no-go risk decisioning", module: "TPRM-DUE-DILIGENCE", desc: "Reach a defensible go or no-go decision on a third-party engagement before the contract is signed." },
  { code: "TPRM-CONTINUOUS-MONITORING", name: "Continuous third-party risk monitoring", module: "TPRM-CONTINUOUS-MONITORING", desc: "Recompute the internal risk rating and triage breach, sanctions, and financial signals on a cadence after contract." },
  { code: "TPRM-SECURITY-RATINGS", name: "Security-ratings ingestion", module: "TPRM-CONTINUOUS-MONITORING", desc: "Ingest external security ratings as point-in-time snapshots onto the third-party record." },
  { code: "TPRM-REMEDIATION", name: "Finding remediation and issue tracking", module: "TPRM-REMEDIATION", desc: "Raise third-party findings and drive vendor-scoped remediation to closure, with risk acceptances where needed." },
  { code: "TPRM-SUPPLY-CHAIN", name: "Fourth-party and supply-chain risk mapping", module: "TPRM-SUPPLY-CHAIN-RISK", desc: "Map subcontractor and fourth-party edges and surface concentration risk across shared providers." },
];
const existingCaps = await get(
  `/capabilities?capability_code=in.(${capSpecs.map((c) => c.code).join(",")})&select=id,capability_code`,
);
const haveCap = new Map<string, number>(
  existingCaps.map((r: Row) => [String(r.capability_code), Number(r.id)]),
);
const capsToInsert = capSpecs
  .filter((c) => !haveCap.has(c.code))
  .map((c) => ({ capability_code: c.code, capability_name: c.name, description: c.desc }));
await insert("/capabilities", capsToInsert);
const allCaps = await get(
  `/capabilities?capability_code=in.(${capSpecs.map((c) => c.code).join(",")})&select=id,capability_code`,
);
const capId = new Map<string, number>(allCaps.map((r: Row) => [String(r.capability_code), Number(r.id)]));
log(`capabilities: +${capsToInsert.length} (total ${allCaps.length})`);

const existingCapDom = await get(`/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id`);
const haveCapDom = new Set(existingCapDom.map((r: Row) => Number(r.capability_id)));
const capDomToInsert = capSpecs
  .filter((c) => !haveCapDom.has(capId.get(c.code)!))
  .map((c) => ({ capability_id: capId.get(c.code)!, domain_id: DOMAIN_ID, capability_domain_label: `${c.name} / ${DOMAIN_NAME}`, notes: "" }));
await insert("/capability_domains", capDomToInsert);
log(`capability_domains: +${capDomToInsert.length}`);

const existingDMC = await get(
  `/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`,
);
const haveDMC = new Set(existingDMC.map((r: Row) => `${r.domain_module_id}.${r.capability_id}`));
const dmcToInsert = capSpecs
  .map((c) => ({ mid: moduleId.get(c.module)!, cid: capId.get(c.code)!, c }))
  .filter(({ mid, cid }) => !haveDMC.has(`${mid}.${cid}`))
  .map(({ mid, cid, c }) => ({ domain_module_id: mid, capability_id: cid, domain_module_capability_label: `${c.module} / ${c.code}`, notes: "" }));
await insert("/domain_module_capabilities", dmcToInsert);
log(`domain_module_capabilities: +${dmcToInsert.length}`);

// ---------------------------------------------------------------------------
// 5. Domain skill + tools + domain_module_tools
// ---------------------------------------------------------------------------
const skillDescription =
  "Run third-party and vendor risk end to end. Register the broad third party, scope its engagements, " +
  "and tier it by criticality, then run engagement and contract-gated due diligence with questionnaires, " +
  "evidence collection, certification and attestation checks, and a pre-contract go or no-go. After " +
  "signing, recompute the internal risk rating, ingest external security ratings, and triage breach and " +
  "sanctions signals on a cadence. Turn findings into vendor-scoped remediation that closes before " +
  "renewal, record risk acceptances with expiry, and map the fourth-party subcontracting chain and " +
  "concentration risk behind each direct relationship.";
const skillTriggers =
  "third party risk, third-party risk management, TPRM, vendor risk, vendor risk management, VRM, " +
  "supplier risk, third-party due diligence, vendor due diligence, security questionnaire, vendor onboarding, " +
  "vendor tiering, continuous monitoring, security ratings, vendor remediation, risk acceptance, " +
  "fourth party risk, nth party risk, subcontractor risk, concentration risk, supply chain risk, " +
  "DORA, ICT provider register, business associate agreement, data processing agreement";

let [tprmSkill] = await get(`/skills?domain_id=eq.${DOMAIN_ID}&skill_type=eq.domain&select=id,skill_name`);
if (!tprmSkill) {
  await insert("/skills", [
    { skill_name: "tprm", skill_type: "domain", domain_id: DOMAIN_ID, description: skillDescription, trigger_keywords: skillTriggers },
  ]);
  [tprmSkill] = await get(`/skills?domain_id=eq.${DOMAIN_ID}&skill_type=eq.domain&select=id,skill_name`);
  log(`created TPRM domain skill id ${tprmSkill.id}`);
} else {
  await call({
    method: "PATCH",
    path: `/skills?id=eq.${tprmSkill.id}`,
    body: { skill_name: "tprm", description: skillDescription, trigger_keywords: skillTriggers },
  });
  log(`TPRM domain skill already exists (id ${tprmSkill.id}); refreshed description + triggers`);
}

// Tools: one query + one create + one workflow-gate mutate per module, anchored on a real master.
type ToolSpec = { name: string; op: "query" | "mutate"; obj: string; desc: string };
const toolSpecs: ToolSpec[] = [
  // ONBOARDING-INTAKE
  { name: "query_third_parties", op: "query", obj: "third_parties", desc: "Query the third-party inventory and each party's tier and engagements." },
  { name: "register_third_party", op: "mutate", obj: "third_parties", desc: "Register a new third party in the inventory from an intake request." },
  { name: "approve_third_party_onboarding", op: "mutate", obj: "onboarding_requests", desc: "Approve a third-party onboarding request to admit it for diligence (workflow gate)." },
  { name: "query_third_party_engagements", op: "query", obj: "third_party_engagements", desc: "Query the service engagements scoped under each third party." },
  // DUE-DILIGENCE
  { name: "query_third_party_assessments", op: "query", obj: "third_party_assessments", desc: "Query third-party diligence assessments and their scores and status." },
  { name: "create_third_party_assessment", op: "mutate", obj: "third_party_assessments", desc: "Open a third-party diligence assessment for an engagement." },
  { name: "decide_third_party_assessment", op: "mutate", obj: "third_party_assessments", desc: "Record the pre-contract go or no-go decision on a third-party assessment (workflow gate)." },
  { name: "query_vendor_documents", op: "query", obj: "vendor_documents", desc: "Query collected diligence evidence documents for a third party." },
  // CONTINUOUS-MONITORING
  { name: "query_third_party_risk_ratings", op: "query", obj: "third_party_risk_ratings", desc: "Query the internal computed risk ratings per third party and engagement." },
  { name: "recompute_third_party_risk_rating", op: "mutate", obj: "third_party_risk_ratings", desc: "Recompute a third party's internal risk rating from assessment and monitoring inputs (workflow gate)." },
  { name: "record_monitoring_signal", op: "mutate", obj: "monitoring_signals", desc: "Record a breach, sanctions, or financial-distress signal against a third party for triage." },
  // REMEDIATION
  { name: "query_third_party_risk_findings", op: "query", obj: "third_party_risk_findings", desc: "Query risk findings raised against third parties from assessment and monitoring." },
  { name: "create_third_party_remediation_plan", op: "mutate", obj: "third_party_remediation_plans", desc: "Open a vendor-scoped remediation plan to resolve a third-party finding." },
  { name: "close_third_party_remediation_plan", op: "mutate", obj: "third_party_remediation_plans", desc: "Close a remediation plan once the finding is resolved and verified (workflow gate)." },
  { name: "approve_risk_acceptance", op: "mutate", obj: "risk_acceptances", desc: "Approve a risk acceptance for a third-party finding with an owner and an expiry (workflow gate)." },
  // SUPPLY-CHAIN-RISK
  { name: "query_fourth_party_relationships", op: "query", obj: "fourth_party_relationships", desc: "Query the subcontractor and fourth-party edges behind a third party." },
  { name: "map_fourth_party_relationship", op: "mutate", obj: "fourth_party_relationships", desc: "Record a subcontractor or fourth-party dependency edge for a third party." },
  { name: "update_ict_provider_register", op: "mutate", obj: "ict_provider_registers", desc: "Update the information-and-communications-technology provider register entry for a third party (workflow gate)." },
];
const existingToolRows = await get(
  `/tools?tool_name=in.(${toolSpecs.map((t) => t.name).join(",")})&select=id,tool_name`,
);
const haveTool = new Map<string, number>(existingToolRows.map((r: Row) => [String(r.tool_name), Number(r.id)]));
const toolsToInsert = toolSpecs
  .filter((t) => !haveTool.has(t.name))
  .map((t) => ({ tool_name: t.name, operation_kind: t.op, data_object_id: objId.get(t.obj)!, description: t.desc, coverage_tier: "platform" }));
await insert("/tools", toolsToInsert);
log(`tools: +${toolsToInsert.length} of ${toolSpecs.length}`);

const linkToolNames = [...toolSpecs.map((t) => t.name), "notify_person", "notify_team"];
const toolRows = await get(`/tools?tool_name=in.(${linkToolNames.join(",")})&select=id,tool_name`);
const toolId = new Map<string, number>(toolRows.map((r: Row) => [String(r.tool_name), Number(r.id)]));
for (const n of linkToolNames) if (!toolId.has(n)) throw new Error(`missing tool ${n} after insert`);

const dmtSpecs: { module: string; tool: string; req: "required" | "optional" }[] = [
  // ONBOARDING-INTAKE: query + mutate + workflow-gate + notify
  { module: "TPRM-ONBOARDING-INTAKE", tool: "query_third_parties", req: "required" },
  { module: "TPRM-ONBOARDING-INTAKE", tool: "query_third_party_engagements", req: "required" },
  { module: "TPRM-ONBOARDING-INTAKE", tool: "register_third_party", req: "required" },
  { module: "TPRM-ONBOARDING-INTAKE", tool: "approve_third_party_onboarding", req: "required" }, // workflow gate
  { module: "TPRM-ONBOARDING-INTAKE", tool: "notify_person", req: "optional" },
  // DUE-DILIGENCE
  { module: "TPRM-DUE-DILIGENCE", tool: "query_third_party_assessments", req: "required" },
  { module: "TPRM-DUE-DILIGENCE", tool: "query_vendor_documents", req: "required" },
  { module: "TPRM-DUE-DILIGENCE", tool: "create_third_party_assessment", req: "required" },
  { module: "TPRM-DUE-DILIGENCE", tool: "decide_third_party_assessment", req: "required" }, // workflow gate
  { module: "TPRM-DUE-DILIGENCE", tool: "notify_person", req: "optional" },
  // CONTINUOUS-MONITORING
  { module: "TPRM-CONTINUOUS-MONITORING", tool: "query_third_party_risk_ratings", req: "required" },
  { module: "TPRM-CONTINUOUS-MONITORING", tool: "record_monitoring_signal", req: "required" },
  { module: "TPRM-CONTINUOUS-MONITORING", tool: "recompute_third_party_risk_rating", req: "required" }, // workflow gate
  { module: "TPRM-CONTINUOUS-MONITORING", tool: "notify_team", req: "optional" },
  // REMEDIATION
  { module: "TPRM-REMEDIATION", tool: "query_third_party_risk_findings", req: "required" },
  { module: "TPRM-REMEDIATION", tool: "create_third_party_remediation_plan", req: "required" },
  { module: "TPRM-REMEDIATION", tool: "close_third_party_remediation_plan", req: "required" }, // workflow gate
  { module: "TPRM-REMEDIATION", tool: "approve_risk_acceptance", req: "optional" }, // workflow gate
  { module: "TPRM-REMEDIATION", tool: "notify_person", req: "optional" },
  // SUPPLY-CHAIN-RISK
  { module: "TPRM-SUPPLY-CHAIN-RISK", tool: "query_fourth_party_relationships", req: "required" },
  { module: "TPRM-SUPPLY-CHAIN-RISK", tool: "map_fourth_party_relationship", req: "required" },
  { module: "TPRM-SUPPLY-CHAIN-RISK", tool: "update_ict_provider_register", req: "optional" }, // workflow gate
  { module: "TPRM-SUPPLY-CHAIN-RISK", tool: "notify_team", req: "optional" },
];
const existingDMT = await get(
  `/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,tool_id`,
);
const haveDMT = new Set(existingDMT.map((r: Row) => `${r.domain_module_id}.${r.tool_id}`));
const dmtToInsert = dmtSpecs
  .map((s) => ({ mid: moduleId.get(s.module)!, tid: toolId.get(s.tool)!, req: s.req }))
  .filter(({ mid, tid }) => !haveDMT.has(`${mid}.${tid}`))
  .map(({ mid, tid, req }) => ({ domain_module_id: mid, tool_id: tid, requirement_level: req, notes: "" }));
await insert("/domain_module_tools", dmtToInsert);
log(`domain_module_tools: +${dmtToInsert.length} of ${dmtSpecs.length}`);

// ---------------------------------------------------------------------------
// 6. domain_aliases
// ---------------------------------------------------------------------------
const aliasTexts = ["third party risk", "vendor risk management", "VRM", "supplier risk", "TPRM"];
const existingAliases = await get(`/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=alias`);
const haveAlias = new Set(existingAliases.map((r: Row) => String(r.alias).toLowerCase()));
const newAliases = aliasTexts
  .filter((a) => !haveAlias.has(a.toLowerCase()))
  .map((a) => ({ domain_id: DOMAIN_ID, alias: a, label: a, alias_type: "synonym" }));
await insert("/domain_aliases", newAliases);
log(`domain_aliases: +${newAliases.length} (had ${existingAliases.length})`);

// ---------------------------------------------------------------------------
// 7. Inbound handoff FK backfill (258 -> REMEDIATION, 278 -> CONTINUOUS-MONITORING)
// ---------------------------------------------------------------------------
const remediationId = moduleId.get("TPRM-REMEDIATION")!;
const monitoringId = moduleId.get("TPRM-CONTINUOUS-MONITORING")!;
const handoffBackfill: { id: number; target: number; label: string }[] = [
  { id: 258, target: remediationId, label: "TPRM-REMEDIATION" },
  { id: 278, target: monitoringId, label: "TPRM-CONTINUOUS-MONITORING" },
];
for (const h of handoffBackfill) {
  const [row] = await get(`/handoffs?id=eq.${h.id}&select=id,target_domain_id,target_domain_module_id`);
  if (!row) throw new Error(`handoff ${h.id} not found`);
  if (Number(row.target_domain_id) !== DOMAIN_ID) throw new Error(`handoff ${h.id} does not target TPRM (target_domain_id=${row.target_domain_id})`);
  if (row.target_domain_module_id == null) {
    await call({
      method: "PATCH",
      path: `/handoffs?id=eq.${h.id}`,
      body: { target_domain_module_id: h.target },
    });
    log(`handoff ${h.id}: target_domain_module_id -> ${h.target} (${h.label})`);
  } else if (Number(row.target_domain_module_id) === h.target) {
    log(`handoff ${h.id}: already points at ${h.label} (skip)`);
  } else {
    log(`handoff ${h.id}: target_domain_module_id already set to ${row.target_domain_module_id} (NOT ${h.label}); left as-is, surface`);
  }
}

// ---------------------------------------------------------------------------
// 8. DELETE handoff_processes id 705 (a6=yes, destructive, APPROVED). Verify 278/815 first.
// ---------------------------------------------------------------------------
const [hp705] = await get(`/handoff_processes?id=eq.705&select=id,handoff_id,process_id`);
if (!hp705) {
  log("handoff_processes 705 already absent (skip delete)");
} else if (Number(hp705.handoff_id) === 278 && Number(hp705.process_id) === 815) {
  await call({ method: "DELETE", path: "/handoff_processes?id=eq.705" });
  log("DELETED handoff_processes id 705 (handoff_id=278, process_id=815, the L4 tag)");
} else {
  throw new Error(`handoff_processes 705 does NOT match expected (handoff_id=278, process_id=815): got ${JSON.stringify(hp705)}. STOP, do not delete.`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
log("\n=== TPRM build summary ===");
const [d2] = await get(`/domains?id=eq.${DOMAIN_ID}&select=domain_code,domain_name,domain_kind`);
log(`domain: ${d2.domain_code} "${d2.domain_name}" (${d2.domain_kind}) | id ${DOMAIN_ID}`);
let total = 0;
for (const m of allModules) {
  const masters = await get(
    `/domain_module_data_objects?domain_module_id=eq.${m.id}&role=eq.master&select=id`,
  );
  total += masters.length;
  log(`  ${m.domain_module_code}: ${masters.length} masters`);
}
log(`Total TPRM master rows: ${total} (expect 28)`);
const caps2 = await get(`/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id`);
log(`capability_domains: ${caps2.length} (expect 8)`);
log(`UI: ${"https://adenin.semantius.app"}/domain_map/domains`);
log("Done.");
