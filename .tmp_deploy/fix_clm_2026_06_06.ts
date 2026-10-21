#!/usr/bin/env bun
// .tmp_deploy/fix_clm_2026_06_06.ts
//
// CLM (domain 26) state-driven Validate execute, 2026-06-06.
// Works ONLY the open b1a items recorded in audits/CLM/state.yaml plus the conditional
// Rule #20 catalog-UX backfill. Everything lands at record_status='new' (Rule #1).
//
//  1. B1A-ENTITY-TYPE : classify entity_type on the 5 CLM masters (66,67,68,69,70),
//     currently all 'unclassified'. PATCH data_objects.entity_type per Rule #12.
//  2. B1A-PHASE-P     : author the missing persona / RACI layer (E1 fail; 5-module domain,
//     0 personas reaching it). domain_roles + role_modules reach + process_raci + wire
//     data_object_lifecycle_states.process_id on the gated transitions that cleanly map.
//     DERIVED model (Plan 3): we author reach + RACI only; no _core roles/permissions.
//  3. Catalog UX     : domain 26 + 5 modules all have empty catalog_tagline/description.
//     Author buyer-voice copy and PATCH straight in (Rule #20: empty fields are written).
//
// Idempotent: read-before-create on every natural key; PATCH only empty / unclassified.
import { pg } from "../scripts/lib/catalog";

const CLM_DOMAIN = 26;

// CLM module ids
const AUTHORING = 125;
const NEGOTIATION = 126;
const REPOSITORY = 127;
const OBLIGATION = 128;
const RENEWAL = 129;

// business_functions: Contract Operations (owner), Legal (counsel), Procurement (contributor)
const CONTRACT_OPS = 74;
const LEGAL = 7;
const PROCUREMENT = 19;

// ---------------------------------------------------------------------------
// 1. B1A-ENTITY-TYPE  (PATCH data_objects.entity_type only when 'unclassified')
// ---------------------------------------------------------------------------
// legal_contracts (66)      : draft->...->signed->active->expired/terminated/renewed state
//                             machine, multi-approver, submit-lock -> operational_workflow
// contract_obligations (67) : open->in_progress->due->satisfied/breached/waived -> operational_workflow
// contract_clauses (68)     : reusable clause LIBRARY, preferred/fallback reference language -> catalog
// contract_templates (69)   : pre-approved drafts assembled from the clause library, versioned;
//                             templates with a publishing flow are catalog per Rule #12 -> catalog
// signature_records (70)    : e-signature ENVELOPE, pending->sent->completed/voided audit trail -> operational_workflow
const ENTITY_TYPES: Record<number, string> = {
  66: "operational_workflow",
  67: "operational_workflow",
  68: "catalog",
  69: "catalog",
  70: "operational_workflow",
};

let etPatched = 0;
let etSkipped = 0;
for (const [idStr, et] of Object.entries(ENTITY_TYPES)) {
  const id = Number(idStr);
  const [row] = await pg("GET", `/data_objects?id=eq.${id}&select=id,data_object_name,entity_type`);
  if (!row) {
    console.log(`  entity_type: data_object ${id} NOT FOUND, skipping`);
    continue;
  }
  if (row.entity_type && row.entity_type !== "unclassified") {
    console.log(`  entity_type: ${row.data_object_name} already '${row.entity_type}', leaving (not overwriting)`);
    etSkipped++;
    continue;
  }
  await pg("PATCH", `/data_objects?id=eq.${id}`, { entity_type: et });
  console.log(`  entity_type: ${row.data_object_name} (${id}) '${row.entity_type}' -> '${et}'`);
  etPatched++;
}
console.log(`entity_type patched=${etPatched} skipped=${etSkipped}`);

// ---------------------------------------------------------------------------
// 2. B1A-PHASE-P  (personas + reach + RACI + process_id wiring)
// ---------------------------------------------------------------------------
type Persona = { role_code: string; role_name: string; business_function_id: number; description: string };

const PERSONAS: Persona[] = [
  {
    role_code: "CONTRACT-OPS-MANAGER",
    role_name: "Contract Operations Manager",
    business_function_id: CONTRACT_OPS,
    description: "Accountable for the contract lifecycle end to end: owns the repository, signs off on approvals and executions, drives obligation tracking and renewals, and keeps authoring and negotiation moving across the team.",
  },
  {
    role_code: "CONTRACT-OPS-SPECIALIST",
    role_name: "Contract Operations Specialist",
    business_function_id: CONTRACT_OPS,
    description: "Runs the day-to-day contract workflow: assembles drafts from approved templates, shepherds signature envelopes, tracks obligations to closure, and processes renewals ahead of expiry.",
  },
  {
    role_code: "LEGAL-COUNSEL",
    role_name: "Legal Counsel",
    business_function_id: LEGAL,
    description: "Reviews and approves contract language, clause and template content, and redlines counterparty terms during negotiation. The legal gate on what the organization is willing to sign.",
  },
  {
    role_code: "PROCUREMENT-CONTRACT-LIAISON",
    role_name: "Procurement Contract Liaison",
    business_function_id: PROCUREMENT,
    description: "Bridges sourcing and contracting: turns awarded sourcing outcomes into draft agreements, consults on supplier terms during negotiation, and reads the repository for active supplier commitments.",
  },
];

// reach: role_code -> [module_id, interaction_level][]   (>=2 modules each)
const REACH: Record<string, [number, string][]> = {
  "CONTRACT-OPS-MANAGER": [
    [REPOSITORY, "primary"], [OBLIGATION, "primary"], [RENEWAL, "primary"],
    [AUTHORING, "secondary"], [NEGOTIATION, "secondary"],
  ],
  "CONTRACT-OPS-SPECIALIST": [
    [AUTHORING, "primary"], [REPOSITORY, "primary"], [OBLIGATION, "primary"], [RENEWAL, "primary"],
  ],
  "LEGAL-COUNSEL": [
    [AUTHORING, "primary"], [NEGOTIATION, "primary"], [REPOSITORY, "secondary"],
  ],
  "PROCUREMENT-CONTRACT-LIAISON": [
    [AUTHORING, "secondary"], [NEGOTIATION, "secondary"], [REPOSITORY, "secondary"],
  ],
};

// process-to-permission edge: [data_object_id, state_name, process_id]
// Wire process_id onto the gated (requires_permission=true) lifecycle transitions that
// cleanly map to a process. Only states that already exist (verified live) are wired.
//   398 = Negotiate and document agreements/contracts
//   397 = Provide legal advice/counseling
//   807 = Manage contracts
//  1163 = Evaluate enterprise regulatory and compliance obligations
const P_NEGOTIATE = 398;
const P_LEGAL_ADVICE = 397;
const P_MANAGE_CONTRACTS = 807;
const P_COMPLIANCE_OBLIG = 1163;

const WIRING: [number, string, number][] = [
  [66, "approved", P_NEGOTIATE],          // legal_contracts.approved (negotiation gate)
  [66, "signed", P_MANAGE_CONTRACTS],     // legal_contracts.signed (execution)
  [66, "terminated", P_MANAGE_CONTRACTS], // legal_contracts.terminated
  [66, "renewed", P_MANAGE_CONTRACTS],    // legal_contracts.renewed
  [68, "approved", P_LEGAL_ADVICE],       // contract_clauses.approved
  [68, "deprecated", P_LEGAL_ADVICE],     // contract_clauses.deprecated
  [69, "approved", P_LEGAL_ADVICE],       // contract_templates.approved
  [69, "deprecated", P_LEGAL_ADVICE],     // contract_templates.deprecated
  [67, "satisfied", P_COMPLIANCE_OBLIG],  // contract_obligations.satisfied
  [67, "breached", P_COMPLIANCE_OBLIG],   // contract_obligations.breached
  [67, "waived", P_COMPLIANCE_OBLIG],     // contract_obligations.waived
  [70, "voided", P_MANAGE_CONTRACTS],     // signature_records.voided
];

// process_raci: [process_id, role_code, raci, consultation_blocking]
// Exactly one actor per row. R/A rows resolve to grants via the process_id-wired gates above.
const RACI: [number, string, string, boolean][] = [
  // Negotiate and document agreements/contracts (398) -> legal_contract.approved gate
  [P_NEGOTIATE, "LEGAL-COUNSEL", "responsible", false],
  [P_NEGOTIATE, "CONTRACT-OPS-MANAGER", "accountable", false],
  [P_NEGOTIATE, "PROCUREMENT-CONTRACT-LIAISON", "consulted", false],
  [P_NEGOTIATE, "CONTRACT-OPS-SPECIALIST", "informed", false],
  // Provide legal advice/counseling (397) -> clause / template approval gates
  [P_LEGAL_ADVICE, "LEGAL-COUNSEL", "responsible", false],
  [P_LEGAL_ADVICE, "CONTRACT-OPS-MANAGER", "accountable", false],
  [P_LEGAL_ADVICE, "CONTRACT-OPS-SPECIALIST", "informed", false],
  // Manage contracts (807) -> sign / terminate / renew / void gates
  [P_MANAGE_CONTRACTS, "CONTRACT-OPS-SPECIALIST", "responsible", false],
  [P_MANAGE_CONTRACTS, "CONTRACT-OPS-MANAGER", "accountable", false],
  [P_MANAGE_CONTRACTS, "LEGAL-COUNSEL", "consulted", false],
  // Evaluate enterprise regulatory and compliance obligations (1163) -> obligation gates
  [P_COMPLIANCE_OBLIG, "CONTRACT-OPS-SPECIALIST", "responsible", false],
  [P_COMPLIANCE_OBLIG, "CONTRACT-OPS-MANAGER", "accountable", false],
  [P_COMPLIANCE_OBLIG, "LEGAL-COUNSEL", "informed", false],
];

const roleIdByCode: Record<string, number> = {};
for (const p of PERSONAS) {
  const existing = await pg("GET", `/domain_roles?role_code=eq.${p.role_code}&select=id`);
  if (existing && existing.length) {
    roleIdByCode[p.role_code] = existing[0].id as number;
    console.log(`  persona exists:  ${p.role_code} (#${existing[0].id})`);
    continue;
  }
  const created = await pg("POST", "/domain_roles", p);
  roleIdByCode[p.role_code] = created[0].id as number;
  console.log(`  persona created: ${p.role_code} (#${created[0].id})`);
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
let wireMiss = 0;
for (const [doid, state, pid] of WIRING) {
  const [st] = await pg("GET", `/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}&select=id,process_id`);
  if (!st) {
    console.log(`  WIRING MISS: data_object ${doid} state '${state}' not found`);
    wireMiss++;
    continue;
  }
  if (st.process_id) {
    console.log(`  wiring: data_object ${doid} '${state}' already process_id=${st.process_id}, leaving`);
    continue;
  }
  await pg("PATCH", `/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}`, { process_id: pid });
  wired++;
}
console.log(`lifecycle process_id wirings applied: ${wired} (miss=${wireMiss})`);

let raciCreated = 0;
for (const [pid, code, letter, blocking] of RACI) {
  const rid = roleIdByCode[code];
  const ex = await pg("GET", `/process_raci?process_id=eq.${pid}&actor_role_id=eq.${rid}&raci=eq.${letter}&select=id`);
  if (ex && ex.length) continue;
  await pg("POST", "/process_raci", { process_id: pid, actor_role_id: rid, raci: letter, consultation_blocking: blocking });
  raciCreated++;
}
console.log(`process_raci created: ${raciCreated}`);

// ---------------------------------------------------------------------------
// 3. Catalog UX (Rule #20)  PATCH empty catalog_tagline / catalog_description only
// ---------------------------------------------------------------------------
type CopySpec = { tagline: string; description: string };

const DOMAIN_COPY: CopySpec = {
  tagline: "Draft, negotiate, sign, and track every contract from first draft through renewal in one place.",
  description:
    "Manage the entire life of a contract without losing the thread. Author new agreements from a library of pre-approved clauses and templates, route them through legal and business review, and capture redlines as counterparties negotiate. When terms are settled, send for electronic signature and store the executed document in a searchable repository.\n\n" +
    "After signing, the work continues: track the obligations each contract creates, get ahead of due dates and renewals, and know the moment a commitment is satisfied, breached, or waived. Every contract stays current, every deadline stays visible, and the organization always knows what it has agreed to.",
};

const MODULE_COPY: Record<number, CopySpec> = {
  [AUTHORING]: {
    tagline: "Assemble new contracts fast from a library of approved clauses and templates.",
    description:
      "Build new agreements from pre-approved language instead of starting from a blank page. Pull clauses and templates from a maintained library, assemble a draft, and route it through legal and business review with a clear approval trail.\n\n" +
      "Versioning and approval states keep the clause and template library trustworthy, so every new contract starts from terms the organization has already agreed it can stand behind.",
  },
  [NEGOTIATION]: {
    tagline: "Redline counterparty terms and reach agreement without losing track of changes.",
    description:
      "Work through counterparty markups in a structured negotiation, comparing proposed language against approved positions and capturing each round of changes. Surface the terms that need legal attention and route them for sign-off.\n\n" +
      "When both sides agree, the negotiated contract moves cleanly into approval and execution, with a record of how the final language was reached.",
  },
  [REPOSITORY]: {
    tagline: "Store every executed contract in one searchable, always-current system of record.",
    description:
      "Keep every signed agreement in a single repository with the counterparty, contract type, key dates, value, and governing terms captured as structured data. Find any contract in seconds and see its full history, including amendments and renewals.\n\n" +
      "The repository is the authoritative record of what the organization has signed, ready to answer questions for finance, legal, audit, and the teams that depend on each agreement.",
  },
  [OBLIGATION]: {
    tagline: "Track every commitment a contract creates and act before a deadline slips.",
    description:
      "Turn the promises buried in a signed contract into tracked obligations with owners, due dates, and status. Watch performance, payment, delivery, reporting, and compliance commitments move from open to satisfied, and catch the ones at risk of breach.\n\n" +
      "Clear ownership and visible due dates mean obligations are met on time, and the moment one is breached or waived, the right people know.",
  },
  [RENEWAL]: {
    tagline: "Get ahead of every expiry and renewal so no contract lapses by accident.",
    description:
      "Know which contracts are coming up for renewal well before they expire, and decide deliberately whether to renew, renegotiate, or let them end. Renewal countdowns and early warnings turn a reactive scramble into a planned workflow.\n\n" +
      "Capture each renewal against the original agreement so the repository always reflects the live commitment, and value is never lost to a missed deadline.",
  },
};

let copyPatched = 0;
let copySkipped = 0;

// domain 26
{
  const [d] = await pg("GET", `/domains?id=eq.${CLM_DOMAIN}&select=id,domain_code,catalog_tagline,catalog_description`);
  const patch: Record<string, string> = {};
  if (d && (!d.catalog_tagline || d.catalog_tagline.trim() === "")) patch.catalog_tagline = DOMAIN_COPY.tagline;
  if (d && (!d.catalog_description || d.catalog_description.trim() === "")) patch.catalog_description = DOMAIN_COPY.description;
  if (Object.keys(patch).length) {
    await pg("PATCH", `/domains?id=eq.${CLM_DOMAIN}`, patch);
    console.log(`  catalog UX: domain ${d.domain_code} patched [${Object.keys(patch).join(", ")}]`);
    copyPatched++;
  } else {
    console.log(`  catalog UX: domain CLM already populated, leaving`);
    copySkipped++;
  }
}

// 5 modules
for (const [midStr, copy] of Object.entries(MODULE_COPY)) {
  const mid = Number(midStr);
  const [m] = await pg("GET", `/domain_modules?id=eq.${mid}&select=id,domain_module_code,catalog_tagline,catalog_description`);
  if (!m) {
    console.log(`  catalog UX: module ${mid} NOT FOUND, skipping`);
    continue;
  }
  const patch: Record<string, string> = {};
  if (!m.catalog_tagline || m.catalog_tagline.trim() === "") patch.catalog_tagline = copy.tagline;
  if (!m.catalog_description || m.catalog_description.trim() === "") patch.catalog_description = copy.description;
  if (Object.keys(patch).length) {
    await pg("PATCH", `/domain_modules?id=eq.${mid}`, patch);
    console.log(`  catalog UX: module ${m.domain_module_code} patched [${Object.keys(patch).join(", ")}]`);
    copyPatched++;
  } else {
    console.log(`  catalog UX: module ${m.domain_module_code} already populated, leaving`);
    copySkipped++;
  }
}
console.log(`catalog UX patched=${copyPatched} skipped=${copySkipped}`);

console.log("\n--- CLM 2026-06-06 execute complete ---");
console.log("UI links:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/domain_roles");
console.log("  https://tests.semantius.app/domain_map/role_modules");
console.log("  https://tests.semantius.app/domain_map/process_raci");
console.log("  https://tests.semantius.app/domain_map/domains");
console.log("  https://tests.semantius.app/domain_map/domain_modules");
