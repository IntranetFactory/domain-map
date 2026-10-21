#!/usr/bin/env bun
// EHS — Phase B loader. Data-object footprint.
// data_objects (labels, entity_type, pattern flags) + domain_module_data_objects (Rule #16 necessity)
// + data_object_relationships (intra + users edges + cross-domain) + data_object_aliases
// + data_object_lifecycle_states + regulations + domain_regulations + trigger_events + handoffs.
// Idempotent. record_status omitted (DB default 'new'). No notes populated. No em-dash.

import { get, insert, syncTable, type Row } from "./ehs_helpers.ts";

const EHS = 174;
const MOD = {
  SAFETY: 352, // EHS-SAFETY-INCIDENT
  HYGIENE: 353, // EHS-INDUSTRIAL-HYGIENE
  ENV: 354, // EHS-ENV-COMPLIANCE
  AUDIT: 355, // EHS-AUDIT-INSPECTION
};
const USERS = 748; // platform_builtin
const EMISSIONS_RECORDS = 321; // ESG-owned data_object (consumed by EHS-ENV-COMPLIANCE)
const ESG = 21;

// ============================================================
// DATA OBJECTS (masters owned by EHS)
// each: name, labels, entity_type, pattern flags, owning module, necessity (Rule #16)
// ============================================================
type DObj = {
  data_object_name: string;
  singular_label: string;
  plural_label: string;
  description: string;
  entity_type: "operational_workflow" | "operational_record" | "catalog" | "junction" | "computed";
  has_personal_content?: boolean;
  has_submit_lock?: boolean;
  has_single_approver?: boolean;
  module: number;
  necessity: "required" | "optional";
};

const dataObjects: DObj[] = [
  // --- EHS-SAFETY-INCIDENT ---
  { data_object_name: "safety_incidents", singular_label: "Safety Incident", plural_label: "Safety Incidents", description: "A workplace injury, illness, near-miss, or unsafe condition, with investigation, root-cause analysis, and recordability determination.", entity_type: "operational_workflow", has_personal_content: true, module: MOD.SAFETY, necessity: "required" },
  { data_object_name: "hazards", singular_label: "Hazard", plural_label: "Hazards", description: "An identified workplace hazard, its source and affected tasks, and the controls applied to reduce its risk.", entity_type: "operational_workflow", module: MOD.SAFETY, necessity: "required" },
  { data_object_name: "ehs_risk_assessments", singular_label: "EHS Risk Assessment", plural_label: "EHS Risk Assessments", description: "An occupational risk assessment such as a job hazard analysis or job safety analysis that scores the likelihood and consequence of identified hazards and assigns controls.", entity_type: "operational_workflow", has_single_approver: true, module: MOD.SAFETY, necessity: "required" },
  { data_object_name: "corrective_actions", singular_label: "Corrective Action", plural_label: "Corrective Actions", description: "A corrective or preventive action arising from an incident, inspection, audit, or finding, with an owner, due date, and verification of effectiveness.", entity_type: "operational_workflow", module: MOD.SAFETY, necessity: "required" },
  { data_object_name: "osha_300_logs", singular_label: "OSHA 300 Log", plural_label: "OSHA 300 Logs", description: "The OSHA Form 300 log of work-related injuries and illnesses, maintained per establishment per year, with the annual 300A summary.", entity_type: "operational_record", module: MOD.SAFETY, necessity: "optional" },
  { data_object_name: "osha_301_reports", singular_label: "OSHA 301 Report", plural_label: "OSHA 301 Reports", description: "The OSHA Form 301 injury and illness incident report filed per recordable incident.", entity_type: "operational_record", has_personal_content: true, module: MOD.SAFETY, necessity: "optional" },

  // --- EHS-INDUSTRIAL-HYGIENE ---
  { data_object_name: "industrial_hygiene_samples", singular_label: "Industrial Hygiene Sample", plural_label: "Industrial Hygiene Samples", description: "An industrial-hygiene sampling or exposure-monitoring result for a chemical, noise, or other agent, measured against occupational exposure limits and linked to the exposed workers and tasks.", entity_type: "operational_record", module: MOD.HYGIENE, necessity: "optional" },
  { data_object_name: "occupational_health_records", singular_label: "Occupational Health Record", plural_label: "Occupational Health Records", description: "A medical surveillance and exposure record such as a respirator fit test, audiometric test, or fitness-for-duty evaluation, retained per occupational-health rules.", entity_type: "operational_record", has_personal_content: true, module: MOD.HYGIENE, necessity: "optional" },
  { data_object_name: "chemical_inventory", singular_label: "Chemical Inventory Item", plural_label: "Chemical Inventory", description: "A hazardous substance in the chemical inventory, with quantity, location, and links to its safety data sheet and exposure limits.", entity_type: "operational_record", module: MOD.HYGIENE, necessity: "required" },
  { data_object_name: "sds_records", singular_label: "Safety Data Sheet", plural_label: "Safety Data Sheets", description: "A safety data sheet for a hazardous substance, carrying hazard classification, exposure limits, and handling guidance for hazard communication under HazCom and REACH or CLP.", entity_type: "catalog", module: MOD.HYGIENE, necessity: "optional" },

  // --- EHS-ENV-COMPLIANCE ---
  { data_object_name: "environmental_permits", singular_label: "Environmental Permit", plural_label: "Environmental Permits", description: "An environmental permit for air, water, or waste, with its conditions, limits, monitoring obligations, and renewal schedule.", entity_type: "operational_workflow", has_single_approver: true, module: MOD.ENV, necessity: "optional" },

  // --- EHS-AUDIT-INSPECTION ---
  { data_object_name: "ehs_inspections", singular_label: "EHS Inspection", plural_label: "EHS Inspections", description: "A safety inspection or observation conducted against a checklist, with findings routed into corrective actions.", entity_type: "operational_workflow", module: MOD.AUDIT, necessity: "required" },
  { data_object_name: "ehs_audits", singular_label: "EHS Audit", plural_label: "EHS Audits", description: "A management-system audit against a standard such as ISO 45001 or ISO 14001, with nonconformities and findings routed into corrective actions.", entity_type: "operational_workflow", module: MOD.AUDIT, necessity: "required" },
  { data_object_name: "contractor_safety_records", singular_label: "Contractor Safety Record", plural_label: "Contractor Safety Records", description: "A contractor or third-party safety prequalification and qualification record, with safety criteria, status, and ties to site access and permit-to-work.", entity_type: "operational_record", module: MOD.AUDIT, necessity: "optional" },
  { data_object_name: "ehs_training_records", singular_label: "EHS Training Record", plural_label: "EHS Training Records", description: "A record of EHS training, competency, or certification completed by a worker, mapped to the roles and regulations that require it.", entity_type: "operational_record", module: MOD.AUDIT, necessity: "required" },
];

// ============================================================
// LIFECYCLE STATES (operational_workflow masters)
// ============================================================
type LState = { entity: string; state: string; order: number; initial?: boolean; terminal?: boolean; gate?: boolean; verb?: string; module: number };
const lifecycleStates: LState[] = [
  // safety_incidents: reported -> investigating -> action_assigned -> closed
  { entity: "safety_incidents", state: "reported", order: 1, initial: true, module: MOD.SAFETY },
  { entity: "safety_incidents", state: "investigating", order: 2, module: MOD.SAFETY },
  { entity: "safety_incidents", state: "action_assigned", order: 3, module: MOD.SAFETY },
  { entity: "safety_incidents", state: "closed", order: 4, terminal: true, gate: true, verb: "close_incident", module: MOD.SAFETY },
  // hazards: identified -> assessed -> controlled -> closed
  { entity: "hazards", state: "identified", order: 1, initial: true, module: MOD.SAFETY },
  { entity: "hazards", state: "assessed", order: 2, module: MOD.SAFETY },
  { entity: "hazards", state: "controlled", order: 3, module: MOD.SAFETY },
  { entity: "hazards", state: "closed", order: 4, terminal: true, module: MOD.SAFETY },
  // ehs_risk_assessments: draft -> reviewed -> approved -> archived
  { entity: "ehs_risk_assessments", state: "draft", order: 1, initial: true, module: MOD.SAFETY },
  { entity: "ehs_risk_assessments", state: "reviewed", order: 2, module: MOD.SAFETY },
  { entity: "ehs_risk_assessments", state: "approved", order: 3, gate: true, verb: "approve_risk_assessment", module: MOD.SAFETY },
  { entity: "ehs_risk_assessments", state: "archived", order: 4, terminal: true, module: MOD.SAFETY },
  // corrective_actions: open -> in_progress -> completed -> verified
  { entity: "corrective_actions", state: "open", order: 1, initial: true, module: MOD.SAFETY },
  { entity: "corrective_actions", state: "in_progress", order: 2, module: MOD.SAFETY },
  { entity: "corrective_actions", state: "completed", order: 3, module: MOD.SAFETY },
  { entity: "corrective_actions", state: "verified", order: 4, terminal: true, gate: true, verb: "verify_corrective_action", module: MOD.SAFETY },
  // environmental_permits: applied -> active -> renewal_due -> expired
  { entity: "environmental_permits", state: "applied", order: 1, initial: true, module: MOD.ENV },
  { entity: "environmental_permits", state: "active", order: 2, gate: true, verb: "approve_permit", module: MOD.ENV },
  { entity: "environmental_permits", state: "renewal_due", order: 3, module: MOD.ENV },
  { entity: "environmental_permits", state: "expired", order: 4, terminal: true, module: MOD.ENV },
  // ehs_inspections: scheduled -> in_progress -> completed -> closed
  { entity: "ehs_inspections", state: "scheduled", order: 1, initial: true, module: MOD.AUDIT },
  { entity: "ehs_inspections", state: "in_progress", order: 2, module: MOD.AUDIT },
  { entity: "ehs_inspections", state: "completed", order: 3, module: MOD.AUDIT },
  { entity: "ehs_inspections", state: "closed", order: 4, terminal: true, module: MOD.AUDIT },
  // ehs_audits: planned -> fieldwork -> reported -> closed
  { entity: "ehs_audits", state: "planned", order: 1, initial: true, module: MOD.AUDIT },
  { entity: "ehs_audits", state: "fieldwork", order: 2, module: MOD.AUDIT },
  { entity: "ehs_audits", state: "reported", order: 3, module: MOD.AUDIT },
  { entity: "ehs_audits", state: "closed", order: 4, terminal: true, gate: true, verb: "close_audit", module: MOD.AUDIT },
];

// ============================================================
// ALIASES
// ============================================================
type Alias = { entity: string; alias: string; alias_type?: "synonym" | "industry_term" | "solution_term" };
const aliases: Alias[] = [
  { entity: "safety_incidents", alias: "injury and illness records" },
  { entity: "safety_incidents", alias: "near-miss reports" },
  { entity: "hazards", alias: "hazard register entries" },
  { entity: "ehs_risk_assessments", alias: "job hazard analyses" },
  { entity: "ehs_risk_assessments", alias: "job safety analyses" },
  { entity: "corrective_actions", alias: "CAPA" },
  { entity: "industrial_hygiene_samples", alias: "exposure monitoring results" },
  { entity: "occupational_health_records", alias: "medical surveillance records" },
  { entity: "sds_records", alias: "material safety data sheets" },
  { entity: "chemical_inventory", alias: "hazardous substance register" },
  { entity: "environmental_permits", alias: "air, water, and waste permits" },
  { entity: "ehs_inspections", alias: "safety observations" },
  { entity: "ehs_audits", alias: "management-system audits" },
  { entity: "contractor_safety_records", alias: "contractor prequalification records" },
  { entity: "ehs_training_records", alias: "safety training and competency records" },
  { entity: "osha_300_logs", alias: "injury and illness logs" },
];

// ============================================================
// REGULATIONS (insert if missing) + domain_regulations
// jurisdictions: INTL=1, EU=2, US=3
// ============================================================
type Reg = { regulation_code: string; regulation_name: string; regulation_type: string; jurisdiction_id: number; issuing_body: string; regulation_url: string; description: string; certification_required: boolean };
const regulations: Reg[] = [
  { regulation_code: "OSHA", regulation_name: "Occupational Safety and Health Act", regulation_type: "labor_law", jurisdiction_id: 3, issuing_body: "US Department of Labor (OSHA)", regulation_url: "https://www.osha.gov", description: "US occupational safety and health law governing workplace safety standards, injury and illness recordkeeping (Forms 300, 300A, 301), hazard communication, and exposure limits.", certification_required: false },
  { regulation_code: "ISO-45001", regulation_name: "ISO 45001 Occupational Health and Safety Management Systems", regulation_type: "industry_standard", jurisdiction_id: 1, issuing_body: "International Organization for Standardization", regulation_url: "https://www.iso.org/standard/63787.html", description: "International standard for occupational health and safety management systems, certifiable by accredited bodies and used to demonstrate a conformant safety management system.", certification_required: true },
  { regulation_code: "ISO-14001", regulation_name: "ISO 14001 Environmental Management Systems", regulation_type: "environmental", jurisdiction_id: 1, issuing_body: "International Organization for Standardization", regulation_url: "https://www.iso.org/standard/60857.html", description: "International standard for environmental management systems, certifiable by accredited bodies and used to govern environmental aspects, impacts, and continual improvement.", certification_required: true },
  { regulation_code: "REACH", regulation_name: "REACH Regulation on Chemicals", regulation_type: "environmental", jurisdiction_id: 2, issuing_body: "European Chemicals Agency", regulation_url: "https://echa.europa.eu/regulations/reach", description: "EU regulation on the registration, evaluation, authorization, and restriction of chemicals, driving safety data sheet and hazardous-substance recordkeeping.", certification_required: false },
  { regulation_code: "EPA-EPCRA", regulation_name: "EPCRA Emergency Planning and Community Right-to-Know Act", regulation_type: "environmental", jurisdiction_id: 3, issuing_body: "US Environmental Protection Agency", regulation_url: "https://www.epa.gov/epcra", description: "US environmental law requiring chemical inventory (Tier II) and toxic release reporting, underpinning emissions and chemical-release recordkeeping.", certification_required: false },
];
// applicability per domain_regulations: mandatory / recommended / conditional / optional
const domainRegApplicability: Record<string, "mandatory" | "recommended" | "conditional" | "optional"> = {
  OSHA: "conditional", // US establishments
  "ISO-45001": "recommended",
  "ISO-14001": "recommended",
  REACH: "conditional", // EU / chemicals
  "EPA-EPCRA": "conditional", // US / reportable chemicals
};

// ============================================================
// TRIGGER EVENTS (event_category: lifecycle / state_change / threshold / signal)
// ============================================================
type TEvent = { entity: string; event_name: string; from_state: string; to_state: string; category: "lifecycle" | "state_change" | "threshold" | "signal"; description: string };
const triggerEvents: TEvent[] = [
  { entity: "safety_incidents", event_name: "safety_incident.reported", from_state: "", to_state: "reported", category: "lifecycle", description: "A new safety incident, injury, illness, or near-miss has been reported and enters investigation. Downstream: feeds recordkeeping and corporate sustainability incident metrics." },
  { entity: "safety_incidents", event_name: "safety_incident.closed", from_state: "action_assigned", to_state: "closed", category: "lifecycle", description: "A safety incident investigation is complete and all corrective actions are closed." },
  { entity: "corrective_actions", event_name: "corrective_action.verified", from_state: "completed", to_state: "verified", category: "lifecycle", description: "A corrective or preventive action has been completed and its effectiveness verified." },
  { entity: "environmental_permits", event_name: "environmental_permit.renewal_due", from_state: "active", to_state: "renewal_due", category: "threshold", description: "An environmental permit is approaching its renewal or expiry date and requires action." },
  { entity: "environmental_permits", event_name: "environmental_permit.expired", from_state: "renewal_due", to_state: "expired", category: "lifecycle", description: "An environmental permit has expired without renewal, creating a compliance exposure." },
  { entity: "ehs_audits", event_name: "ehs_audit.closed", from_state: "reported", to_state: "closed", category: "lifecycle", description: "A management-system audit is complete with all nonconformities dispositioned into corrective actions." },
  { entity: "industrial_hygiene_samples", event_name: "industrial_hygiene_sample.limit_exceeded", from_state: "", to_state: "", category: "threshold", description: "An industrial-hygiene sample result exceeds an occupational exposure limit, triggering review and control." },
];
// emissions event published on the consumed emissions_records object (EHS-ENV contributes)
const emissionsEvent = { event_name: "emissions_record.recorded", data_object_id: EMISSIONS_RECORDS, from_state: "", to_state: "recorded", category: "state_change" as const, description: "An emission or release record has been captured at an establishment and is available for corporate sustainability disclosure." };

// ============================================================
// HANDOFFS (outbound) — friction + integration_pattern
// integration_pattern: event_stream / api_call / batch_sync / manual_handoff / file_drop / lifecycle_progression
// ============================================================
type Handoff = {
  source_module: number;
  target_domain: number;
  target_module: number | null; // null when counterparty not modularized
  payload_entity: string; // EHS data_object name OR special 'emissions_records'
  trigger_event_name: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop" | "lifecycle_progression";
  friction: "low" | "medium" | "high";
  description: string;
};
const handoffsOut: Handoff[] = [
  { source_module: MOD.SAFETY, target_domain: ESG, target_module: null, payload_entity: "safety_incidents", trigger_event_name: "safety_incident.reported", integration_pattern: "batch_sync", friction: "medium", description: "A logged safety incident feeds the health-and-safety metrics that corporate sustainability disclosure reports against (recordable rates, lost-time injuries)." },
  { source_module: MOD.ENV, target_domain: ESG, target_module: null, payload_entity: "__emissions__", trigger_event_name: "emissions_record.recorded", integration_pattern: "batch_sync", friction: "medium", description: "An establishment-level emission or release record is aggregated into corporate sustainability disclosure (Scope 1 and environmental metrics)." },
  { source_module: MOD.ENV, target_domain: EHS, target_module: MOD.ENV, payload_entity: "environmental_permits", trigger_event_name: "environmental_permit.renewal_due", integration_pattern: "lifecycle_progression", friction: "low", description: "A permit nearing renewal raises an alert and a corrective action so the renewal is filed before expiry." },
];
// intra-domain cross-module handoffs (source=target=EHS)
const handoffsIntra: Array<{ source_module: number; target_module: number; payload_entity: string; trigger_event_name: string; description: string }> = [
  { source_module: MOD.AUDIT, target_module: MOD.SAFETY, payload_entity: "corrective_actions", trigger_event_name: "ehs_audit.closed", description: "Audit nonconformities are dispositioned into corrective actions owned by the safety module." },
  { source_module: MOD.HYGIENE, target_module: MOD.SAFETY, payload_entity: "hazards", trigger_event_name: "industrial_hygiene_sample.limit_exceeded", description: "An over-limit exposure sample raises a hazard and corrective action in the safety module." },
];

// ============================================================
// handoff_processes: PCF tags for cross-domain handoffs
// ============================================================
const handoffPcf: Record<string, number> = {
  // keyed by trigger_event_name for the cross-domain (source!=target) handoffs
  "safety_incident.reported": 1788, // 13.9.2.4 Record and manage EHS events
  "emissions_record.recorded": 1790, // 13.9.3.2 Measure and report EHS performance
};

async function main() {
  console.log("\n=== EHS Phase B ===");

  // --- DATA OBJECTS ---
  console.log("\n--- data_objects ---");
  const doRows = dataObjects.map(d => ({
    data_object_name: d.data_object_name,
    singular_label: d.singular_label,
    plural_label: d.plural_label,
    description: d.description,
    kind: "domain_owned",
    entity_type: d.entity_type,
    has_personal_content: d.has_personal_content ?? false,
    has_submit_lock: d.has_submit_lock ?? false,
    has_single_approver: d.has_single_approver ?? false,
  }));
  const doMap = await syncTable("/data_objects", doRows, "data_object_name");
  // patch entity_type / labels / flags on any rows that pre-existed without them (safety: our names are clean, so no-op normally)
  doMap.set("emissions_records", EMISSIONS_RECORDS);
  const id = (name: string) => {
    const v = doMap.get(name);
    if (!v) throw new Error(`data_object id missing for ${name}`);
    return v;
  };

  // --- domain_module_data_objects (master rows + consumer of emissions_records) ---
  console.log("\n--- domain_module_data_objects ---");
  const allModIds = Object.values(MOD);
  const existingDMDO = await get(`/domain_module_data_objects?domain_module_id=in.(${allModIds.join(",")})&select=domain_module_id,data_object_id,role`);
  const haveDMDO = new Set(existingDMDO.map(r => `${r.domain_module_id}:${r.data_object_id}`));
  const dmdoRows: Row[] = [];
  for (const d of dataObjects) {
    const key = `${d.module}:${id(d.data_object_name)}`;
    if (!haveDMDO.has(key)) {
      dmdoRows.push({ domain_module_id: d.module, data_object_id: id(d.data_object_name), role: "master", necessity: d.necessity, notes: "" });
      haveDMDO.add(key);
    }
  }
  // EHS-ENV-COMPLIANCE consumes ESG-owned emissions_records (optional)
  const emKey = `${MOD.ENV}:${EMISSIONS_RECORDS}`;
  if (!haveDMDO.has(emKey)) {
    dmdoRows.push({ domain_module_id: MOD.ENV, data_object_id: EMISSIONS_RECORDS, role: "consumer", necessity: "optional", notes: "" });
    haveDMDO.add(emKey);
  }
  if (dmdoRows.length) await insert("/domain_module_data_objects", dmdoRows);
  console.log(`  inserted ${dmdoRows.length} domain_module_data_objects`);

  // --- data_object_relationships ---
  console.log("\n--- data_object_relationships ---");
  // intra-domain edges + users edges + cross-domain edges
  type Rel = { from: string; to: string; type: "one_to_one" | "one_to_many" | "many_to_many"; kind: "composition" | "reference" | "association" | "inheritance"; verb: string; inverse: string; required?: boolean; owner: "source" | "target" };
  const rels: Rel[] = [
    // intra-domain
    { from: "safety_incidents", to: "corrective_actions", type: "one_to_many", kind: "composition", verb: "triggers", inverse: "is triggered by", owner: "source" },
    { from: "hazards", to: "ehs_risk_assessments", type: "one_to_many", kind: "reference", verb: "is assessed in", inverse: "assesses", owner: "target" },
    { from: "ehs_risk_assessments", to: "corrective_actions", type: "one_to_many", kind: "reference", verb: "recommends", inverse: "is recommended by", owner: "source" },
    { from: "safety_incidents", to: "hazards", type: "many_to_many", kind: "association", verb: "reveals", inverse: "is revealed by", owner: "source" },
    { from: "ehs_inspections", to: "corrective_actions", type: "one_to_many", kind: "reference", verb: "raises", inverse: "is raised by", owner: "source" },
    { from: "ehs_audits", to: "corrective_actions", type: "one_to_many", kind: "reference", verb: "raises", inverse: "is raised by", owner: "source" },
    { from: "chemical_inventory", to: "sds_records", type: "many_to_one", kind: "reference", verb: "is documented by", inverse: "documents", owner: "target", required: true } as unknown as Rel,
    { from: "industrial_hygiene_samples", to: "chemical_inventory", type: "many_to_one", kind: "reference", verb: "measures exposure to", inverse: "is measured by", owner: "target" } as unknown as Rel,
    { from: "industrial_hygiene_samples", to: "occupational_health_records", type: "one_to_many", kind: "association", verb: "informs", inverse: "is informed by", owner: "source" },
    { from: "safety_incidents", to: "osha_300_logs", type: "many_to_one", kind: "reference", verb: "is recorded in", inverse: "records", owner: "target" } as unknown as Rel,
    { from: "safety_incidents", to: "osha_301_reports", type: "one_to_one", kind: "reference", verb: "is reported in", inverse: "reports", owner: "source" },
    { from: "contractor_safety_records", to: "ehs_training_records", type: "one_to_many", kind: "association", verb: "evidences", inverse: "is evidenced by", owner: "source" },
    { from: "ehs_inspections", to: "hazards", type: "one_to_many", kind: "association", verb: "identifies", inverse: "is identified by", owner: "source" },
    // cross-domain (outbound payload -> target master)
    { from: "safety_incidents", to: "esg_metrics", type: "many_to_many", kind: "association", verb: "feeds", inverse: "is fed by", owner: "source" },
    { from: "environmental_permits", to: "emissions_records", type: "one_to_many", kind: "association", verb: "governs", inverse: "is governed by", owner: "source" },
  ];
  // normalize many_to_one to one_to_many with flipped sides (relationship_type enum has no many_to_one)
  const relsNorm = rels.map(r => {
    if ((r.type as string) === "many_to_one") {
      return { from: r.to, to: r.from, type: "one_to_many" as const, kind: r.kind, verb: r.inverse, inverse: r.verb, required: r.required, owner: r.owner === "source" ? ("target" as const) : ("source" as const) };
    }
    return r;
  });
  // users edges (Rule #10)
  type URel = { entity: string; verb: string; inverse: string; userIsSource: boolean };
  const userRels: URel[] = [
    { entity: "safety_incidents", verb: "reports", inverse: "is reported by", userIsSource: true },
    { entity: "safety_incidents", verb: "investigates", inverse: "is investigated by", userIsSource: true },
    { entity: "corrective_actions", verb: "owns", inverse: "is owned by", userIsSource: true },
    { entity: "ehs_inspections", verb: "conducts", inverse: "is conducted by", userIsSource: true },
    { entity: "ehs_audits", verb: "conducts", inverse: "is conducted by", userIsSource: true },
    { entity: "ehs_risk_assessments", verb: "approves", inverse: "is approved by", userIsSource: true },
    { entity: "environmental_permits", verb: "approves", inverse: "is approved by", userIsSource: true },
    { entity: "contractor_safety_records", verb: "is contact for", inverse: "has contact", userIsSource: true },
    { entity: "industrial_hygiene_samples", verb: "collects", inverse: "is collected by", userIsSource: true },
    { entity: "ehs_training_records", verb: "completes", inverse: "is completed by", userIsSource: true },
  ];

  // build a global existing-relationship set (by data_object_id, related_data_object_id, verb) to stay idempotent
  const masterIds = dataObjects.map(d => id(d.data_object_name));
  const existRel = await get(`/data_object_relationships?or=(data_object_id.in.(${masterIds.join(",")}),related_data_object_id.in.(${masterIds.join(",")}))&select=data_object_id,related_data_object_id,relationship_verb`);
  const haveRel = new Set(existRel.map(r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));
  const relRows: Row[] = [];
  const pushRel = (fromId: number, toId: number, type: string, kind: string, verb: string, inverse: string, required: boolean, owner: string) => {
    const k = `${fromId}:${toId}:${verb}`;
    if (haveRel.has(k)) return;
    haveRel.add(k);
    relRows.push({ data_object_id: fromId, related_data_object_id: toId, relationship_type: type, relationship_kind: kind, relationship_verb: verb, inverse_verb: inverse, is_required: required, owner_side: owner, notes: "" });
  };
  for (const r of relsNorm) {
    // resolve names; cross-domain targets esg_metrics / emissions_records resolved separately
    const fromId = id(r.from);
    let toId: number;
    if (r.to === "esg_metrics") toId = 325;
    else if (r.to === "emissions_records") toId = EMISSIONS_RECORDS;
    else toId = id(r.to);
    pushRel(fromId, toId, r.type, r.kind, r.verb, r.inverse, r.required ?? false, r.owner);
  }
  for (const u of userRels) {
    const eId = id(u.entity);
    // users -> entity (owner_side source = users is parent actor)
    pushRel(USERS, eId, "one_to_many", "association", u.verb, u.inverse, false, "source");
  }
  if (relRows.length) await insert("/data_object_relationships", relRows);
  console.log(`  inserted ${relRows.length} data_object_relationships`);

  // --- data_object_aliases ---
  console.log("\n--- data_object_aliases ---");
  const existAlias = await get(`/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,alias_name`);
  const haveAlias = new Set(existAlias.map(r => `${r.data_object_id}:${r.alias_name}`));
  const aliasRows: Row[] = [];
  for (const a of aliases) {
    const eId = id(a.entity);
    const k = `${eId}:${a.alias}`;
    if (haveAlias.has(k)) continue;
    haveAlias.add(k);
    aliasRows.push({ data_object_id: eId, alias_name: a.alias, alias_type: a.alias_type ?? "synonym", is_preferred: false, notes: "" });
  }
  if (aliasRows.length) await insert("/data_object_aliases", aliasRows);
  console.log(`  inserted ${aliasRows.length} data_object_aliases`);

  // --- data_object_lifecycle_states ---
  console.log("\n--- data_object_lifecycle_states ---");
  const wfIds = dataObjects.filter(d => d.entity_type === "operational_workflow").map(d => id(d.data_object_name));
  const existLS = await get(`/data_object_lifecycle_states?data_object_id=in.(${wfIds.join(",")})&select=data_object_id,state_name`);
  const haveLS = new Set(existLS.map(r => `${r.data_object_id}:${r.state_name}`));
  const lsRows: Row[] = [];
  for (const s of lifecycleStates) {
    const eId = id(s.entity);
    const k = `${eId}:${s.state}`;
    if (haveLS.has(k)) continue;
    haveLS.add(k);
    lsRows.push({
      data_object_id: eId,
      state_name: s.state,
      state_order: s.order,
      is_initial: s.initial ?? false,
      is_terminal: s.terminal ?? false,
      requires_permission: s.gate ?? false,
      permission_verb_override: s.verb ?? "",
      domain_module_id: s.module,
      notes: "",
    });
  }
  if (lsRows.length) await insert("/data_object_lifecycle_states", lsRows);
  console.log(`  inserted ${lsRows.length} data_object_lifecycle_states`);

  // --- regulations + domain_regulations ---
  console.log("\n--- regulations ---");
  const regMap = await syncTable("/regulations", regulations, "regulation_code");
  console.log("\n--- domain_regulations ---");
  const existDR = await get(`/domain_regulations?domain_id=eq.${EHS}&select=regulation_id`);
  const haveDR = new Set(existDR.map(r => Number(r.regulation_id)));
  const drRows: Row[] = [];
  for (const r of regulations) {
    const rid = regMap.get(r.regulation_code)!;
    if (!haveDR.has(rid)) drRows.push({ domain_id: EHS, regulation_id: rid, applicability: domainRegApplicability[r.regulation_code], condition_notes: "", notes: "" });
  }
  if (drRows.length) await insert("/domain_regulations", drRows);
  console.log(`  inserted ${drRows.length} domain_regulations`);

  // --- trigger_events ---
  console.log("\n--- trigger_events ---");
  const allTriggerNames = [...triggerEvents.map(t => t.event_name), emissionsEvent.event_name];
  const existTE = await get(`/trigger_events?event_name=in.(${allTriggerNames.join(",")})&select=id,event_name`);
  const haveTE = new Map(existTE.map(r => [String(r.event_name), Number(r.id)]));
  const teRows: Row[] = [];
  for (const t of triggerEvents) {
    if (haveTE.has(t.event_name)) continue;
    teRows.push({ data_object_id: id(t.entity), event_name: t.event_name, from_state: t.from_state, to_state: t.to_state, event_category: t.category, description: t.description });
  }
  if (!haveTE.has(emissionsEvent.event_name)) {
    teRows.push({ data_object_id: emissionsEvent.data_object_id, event_name: emissionsEvent.event_name, from_state: emissionsEvent.from_state, to_state: emissionsEvent.to_state, event_category: emissionsEvent.category, description: emissionsEvent.description });
  }
  if (teRows.length) await insert("/trigger_events", teRows);
  // re-read to get all ids
  const allTE = await get(`/trigger_events?event_name=in.(${allTriggerNames.join(",")})&select=id,event_name`);
  const teMap = new Map(allTE.map(r => [String(r.event_name), Number(r.id)]));
  console.log(`  inserted ${teRows.length} trigger_events (${allTE.length} total resolved)`);

  // --- handoffs (outbound cross-domain + intra-domain) ---
  console.log("\n--- handoffs ---");
  const existHO = await get(`/handoffs?source_domain_id=eq.${EHS}&select=source_domain_id,target_domain_id,data_object_id,trigger_event_id`);
  const haveHO = new Set(existHO.map(r => `${r.source_domain_id}:${r.target_domain_id}:${r.data_object_id}:${r.trigger_event_id}`));
  const hoRows: Row[] = [];
  const payloadId = (name: string) => (name === "__emissions__" ? EMISSIONS_RECORDS : id(name));
  for (const h of handoffsOut) {
    const teId = teMap.get(h.trigger_event_name)!;
    const pId = payloadId(h.payload_entity);
    const k = `${EHS}:${h.target_domain}:${pId}:${teId}`;
    if (haveHO.has(k)) continue;
    haveHO.add(k);
    hoRows.push({
      source_domain_id: EHS,
      target_domain_id: h.target_domain,
      source_domain_module_id: h.source_module,
      target_domain_module_id: h.target_module,
      data_object_id: pId,
      trigger_event_id: teId,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction,
      description: h.description,
      notes: "",
    });
  }
  for (const h of handoffsIntra) {
    const teId = teMap.get(h.trigger_event_name)!;
    const pId = id(h.payload_entity);
    const k = `${EHS}:${EHS}:${pId}:${teId}`;
    if (haveHO.has(k)) continue;
    haveHO.add(k);
    hoRows.push({
      source_domain_id: EHS,
      target_domain_id: EHS,
      source_domain_module_id: h.source_module,
      target_domain_module_id: h.target_module,
      data_object_id: pId,
      trigger_event_id: teId,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: h.description,
      notes: "",
    });
  }
  const insertedHO = await insert("/handoffs", hoRows);
  console.log(`  inserted ${hoRows.length} handoffs`);

  // --- handoff_processes (PCF tags for cross-domain handoffs) ---
  console.log("\n--- handoff_processes ---");
  const allHO = await get(`/handoffs?source_domain_id=eq.${EHS}&select=id,target_domain_id,trigger_event_id,trigger_events(event_name)`);
  const existHP = await get(`/handoff_processes?handoff_id=in.(${allHO.map(h => h.id).join(",")})&select=handoff_id,process_id`);
  const haveHP = new Set(existHP.map(r => `${r.handoff_id}:${r.process_id}`));
  const hpRows: Row[] = [];
  for (const h of allHO) {
    if (Number(h.target_domain_id) === EHS) continue; // tag cross-domain only
    const evName = (h.trigger_events as any)?.event_name as string | undefined;
    if (!evName) continue;
    const pid = handoffPcf[evName];
    if (!pid) continue;
    const k = `${h.id}:${pid}`;
    if (haveHP.has(k)) continue;
    haveHP.add(k);
    hpRows.push({ handoff_id: h.id, process_id: pid, role: "implements", proposal_source: "agent_curated", notes: "" });
  }
  if (hpRows.length) await insert("/handoff_processes", hpRows);
  console.log(`  inserted ${hpRows.length} handoff_processes`);

  // --- counts ---
  const counts = {
    data_objects_mastered: dmdoRows.filter(r => r.role === "master").length + (existingDMDO.filter(r => masterIds.includes(Number(r.data_object_id)) && r.role === "master").length),
    domain_module_data_objects: (await get(`/domain_module_data_objects?domain_module_id=in.(${allModIds.join(",")})&select=domain_module_id`)).length,
    relationships_touching_masters: (await get(`/data_object_relationships?or=(data_object_id.in.(${masterIds.join(",")}),related_data_object_id.in.(${masterIds.join(",")}))&select=data_object_id`)).length,
    aliases: (await get(`/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&select=data_object_id`)).length,
    lifecycle_states: (await get(`/data_object_lifecycle_states?data_object_id=in.(${wfIds.join(",")})&select=data_object_id`)).length,
    domain_regulations: (await get(`/domain_regulations?domain_id=eq.${EHS}&select=regulation_id`)).length,
    trigger_events: (await get(`/trigger_events?data_object_id=in.(${[...masterIds, EMISSIONS_RECORDS].join(",")})&event_name=like.*${""}*&select=id&event_name=in.(${allTriggerNames.join(",")})`)).length,
    handoffs: (await get(`/handoffs?source_domain_id=eq.${EHS}&select=id`)).length,
    handoff_processes: (await get(`/handoff_processes?handoff_id=in.(${allHO.map(h => h.id).join(",")})&select=handoff_id`)).length,
  };
  console.log("\n=== Phase B counts (EHS) ===");
  console.log(counts);
}

await main();
console.log("Phase B done.");
