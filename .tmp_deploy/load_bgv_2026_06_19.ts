// BGV (Background Verification) greenfield build + cross-domain mastery promotion.
// Authorized by audits/BGV/a-BGV.md (all q approve). Idempotent: every step reads existing
// state first and inserts only what is missing. Re-running is free.
//
// Scope (user-approved 2026-06-19):
//   1. Create BGV established_market domain (full Rule #8 metadata + q6 catalog copy).
//   2. 3 full modules (buyer-voice copy, Rule #20).
//   3. PROMOTION (a3=yes, DESTRUCTIVE, APPROVED): 11 ATS masters -> BGV masters; ATS rows
//      demoted master -> embedded_master. M7 single-master verified after.
//   4. 22 new masters (a7=yes). NOTE: gdpr_consent_records already exists (id 950, mastered by
//      LMS-CT-GDPR mod 180) -> BGV co-masters the EXISTING row (multi-master, screening slice),
//      does NOT mint a duplicate (Rule #9). So 21 new data_objects + 1 master row on 950.
//   5. Capabilities (8) + capability_domains + domain_module_capabilities.
//   6. Neighbor: CWM (VMS-WORKER-SOURCING 315) consumer row on background_checks. PAYROLL/HRSD
//      already consume the data_object; the master move re-points them, no new rows.
//   7. Domain skill (skill_type='domain') + tools + domain_module_tools (>=1 query, >=1 mutate,
//      >=1 workflow-gate per module). notify_person/notify_team for notifications.
//   8. domain_aliases.
//   9. Canonical bare-word: background_checks (12) is_canonical_bare_word=true + rationale.
//
// NEVER touches record_status (Rule #1): all new rows default 'new'. No vendor names (Rule #18).

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

const DOMAIN_CODE = "BGV";
const DOMAIN_NAME = "Background Verification";
const ATS_BGCHK_MODULE = 7; // ATS-BACKGROUND-CHECKS
const ATS_PRE_EMP_MODULE = 8; // ATS-PRE-EMPLOYEE-RECORD
const CWM_SOURCING_MODULE = 315; // VMS-WORKER-SOURCING

// ---------------------------------------------------------------------------
// 1. Create BGV domain (full Rule #8 metadata + q6 catalog copy)
// ---------------------------------------------------------------------------
const catalogTagline =
  "Order, track, and adjudicate employment background checks with the FCRA adverse-action chain built in.";
const catalogDescription =
  "Run employment background checks end to end. Build screening packages from criminal, " +
  "employment, education, identity, driving, and drug components, then invite candidates to a " +
  "portal to give consent and complete their checks. Adjudicate results against a configurable " +
  "eligibility matrix, and when a result is disqualifying, walk the full pre-adverse and adverse " +
  "action chain with disclosures, authorizations, summary-of-rights acknowledgements, and dispute " +
  "handling. Keep workers cleared after hire with continuous monitoring, rescreening, identity " +
  "verification, and right-to-work checks.";
const businessLogic =
  "Adjudication rules engine that evaluates screening results against a configurable eligibility " +
  "matrix; orchestration of third-party data-source retrieval and result aggregation across " +
  "criminal, employment, education, and identity sources; continuous-monitoring alert generation " +
  "against post-hire data feeds.";

let [bgvDomain] = await get(`/domains?domain_code=eq.${DOMAIN_CODE}&select=id,domain_code`);
if (!bgvDomain) {
  await insert("/domains", [
    {
      domain_code: DOMAIN_CODE,
      domain_name: DOMAIN_NAME,
      description:
        "Employment background verification / pre-employment screening as a standalone market: " +
        "order screening packages, run criminal, employment, education, identity, driving, drug, " +
        "and watchlist components, adjudicate against an eligibility matrix, run the FCRA/EEOC " +
        "adverse-action and compliance chain, and keep workers cleared post-hire with continuous " +
        "monitoring, rescreening, identity, and right-to-work verification. Distinct from the " +
        "recruiting-embedded screening step that an applicant-tracking module local-masters.",
      domain_kind: "established_market",
      crud_percentage: 80,
      business_logic: businessLogic,
      min_org_size: "20 s <500",
      cost_band: "$$",
      certification_required: true,
      usa_market_size_usd_m: 4500,
      market_size_source_year: 2025,
      catalog_tagline: catalogTagline,
      catalog_description: catalogDescription,
    },
  ]);
  log(`created domain ${DOMAIN_CODE}`);
} else {
  log(`domain ${DOMAIN_CODE} already exists (skip create)`);
}
[bgvDomain] = await get(`/domains?domain_code=eq.${DOMAIN_CODE}&select=id,domain_code`);
const DOMAIN_ID = Number(bgvDomain.id);
log(`BGV domain_id = ${DOMAIN_ID}`);

// ---------------------------------------------------------------------------
// 2. Three full modules (buyer-voice copy)
// ---------------------------------------------------------------------------
const moduleSpecs = [
  {
    domain_module_code: "BGV-SCREENING-ORDERS",
    domain_module_name: "Screening Orders and Packages",
    description:
      "The screening order itself, the candidate subject, the orderable package catalog, the " +
      "concrete component searches (criminal, employment, education, MVR, drug, watchlist, " +
      "healthcare exclusion), order status history, and candidate-facing invitation and portal " +
      "engagement. The point-in-time transaction every screening product sells first.",
    catalog_tagline:
      "Order a background check, build the package, and run every search from one screen.",
    catalog_description:
      "Order an employment background check, choose a package, and let it expand into the " +
      "concrete searches it needs: criminal records, employment and education verification, " +
      "driving records, drug and health screening, and global watchlist checks. Invite the " +
      "candidate to a portal to give consent and fill in what only they can supply, then track " +
      "every component to completion with a clear status on the order. One order, one subject, " +
      "every search in one place.",
  },
  {
    domain_module_code: "BGV-ADJUDICATION-COMPLIANCE",
    domain_module_name: "Adjudication and Compliance",
    description:
      "The screening decision and the FCRA/EEOC paperwork chain: adjudication against the " +
      "eligibility matrix, FCRA disclosures, candidate authorizations, pre-adverse and adverse " +
      "action notices, summary-of-rights acknowledgements, disputes, individualized assessments, " +
      "and ban-the-box assessments. Regulation-driven entities that must exist even where a " +
      "vendor hides them in the order UI.",
    catalog_tagline:
      "Decide each result against your matrix and walk the FCRA adverse-action chain by the book.",
    catalog_description:
      "Adjudicate every screening result against a configurable eligibility matrix so the same " +
      "rule applies to every candidate. When a result is disqualifying, walk the full compliance " +
      "chain: deliver the disclosure and summary of rights, capture the candidate authorization, " +
      "send the pre-adverse notice with the report copy, honor the waiting period, and issue the " +
      "adverse-action notice, with disputes and EEOC individualized assessments handled in line. " +
      "Keep a defensible, auditable record behind every screening decision.",
  },
  {
    domain_module_code: "BGV-CONTINUOUS-IDENTITY",
    domain_module_name: "Continuous and Identity",
    description:
      "The post-hire and standalone-identity surface: continuous monitoring subscriptions, the " +
      "criminal-records monitoring alert stream, periodic rescreenings, identity verification, " +
      "right-to-work / I-9 / E-Verify, international screening, and GDPR consent for non-US data " +
      "subjects. Every flagship sells this as a separately-priced product distinct from the " +
      "pre-hire order.",
    catalog_tagline:
      "Keep cleared workers cleared with continuous monitoring, rescreening, and identity checks.",
    catalog_description:
      "Stop treating the background check as a one-time event. Subscribe workers to continuous " +
      "monitoring and get an alert the moment a new criminal record surfaces, schedule periodic " +
      "rescreenings for sensitive roles, and verify identity and right to work up front and over " +
      "time. Handle international screening and the consent and lawful-basis records non-US data " +
      "subjects require, so a clearance keeps its meaning long after the hire.",
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
// 3. PROMOTION: 11 ATS masters -> BGV masters; demote ATS rows to embedded_master
// ---------------------------------------------------------------------------
// Each: {data_object_id, name, bgv_module, necessity, ats_module}
const promoted: { id: number; name: string; module: string; necessity: "required" | "optional"; atsModule: number }[] = [
  { id: 12, name: "background_checks", module: "BGV-SCREENING-ORDERS", necessity: "required", atsModule: ATS_BGCHK_MODULE },
  { id: 877, name: "background_check_packages", module: "BGV-SCREENING-ORDERS", necessity: "required", atsModule: ATS_BGCHK_MODULE },
  { id: 878, name: "background_check_components", module: "BGV-SCREENING-ORDERS", necessity: "required", atsModule: ATS_BGCHK_MODULE },
  { id: 1041, name: "drug_health_screenings", module: "BGV-SCREENING-ORDERS", necessity: "optional", atsModule: ATS_BGCHK_MODULE },
  { id: 880, name: "background_check_adjudications", module: "BGV-ADJUDICATION-COMPLIANCE", necessity: "required", atsModule: ATS_BGCHK_MODULE },
  { id: 879, name: "fcra_disclosures", module: "BGV-ADJUDICATION-COMPLIANCE", necessity: "optional", atsModule: ATS_BGCHK_MODULE },
  { id: 898, name: "pre_adverse_action_notices", module: "BGV-ADJUDICATION-COMPLIANCE", necessity: "optional", atsModule: ATS_BGCHK_MODULE },
  { id: 881, name: "adverse_action_notices", module: "BGV-ADJUDICATION-COMPLIANCE", necessity: "optional", atsModule: ATS_BGCHK_MODULE },
  { id: 882, name: "background_check_disputes", module: "BGV-ADJUDICATION-COMPLIANCE", necessity: "optional", atsModule: ATS_BGCHK_MODULE },
  { id: 902, name: "fcra_summary_of_rights_acknowledgements", module: "BGV-ADJUDICATION-COMPLIANCE", necessity: "optional", atsModule: ATS_BGCHK_MODULE },
  { id: 1257, name: "right_to_work_verifications", module: "BGV-CONTINUOUS-IDENTITY", necessity: "optional", atsModule: ATS_PRE_EMP_MODULE },
];

// 3a. INSERT BGV master rows (idempotent on (module,data_object))
const existingBgvDMDO = await get(
  `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id,role`,
);
const haveBgvDMDO = new Set(existingBgvDMDO.map((r: Row) => `${r.domain_module_id}.${r.data_object_id}`));
const promotedMasterRows = promoted
  .map((p) => ({ p, mid: moduleId.get(p.module)! }))
  .filter(({ p, mid }) => !haveBgvDMDO.has(`${mid}.${p.id}`))
  .map(({ p, mid }) => ({
    domain_module_id: mid,
    data_object_id: p.id,
    role: "master",
    necessity: p.necessity,
    domain_module_data_object_label: `${p.module} / ${p.name}`,
    notes: "Promoted from ATS into BGV: BGV is the canonical screening market that masters this entity; the recruiting module keeps an embedded shell.",
  }));
await insert("/domain_module_data_objects", promotedMasterRows);
log(`promoted BGV master rows: +${promotedMasterRows.length} of ${promoted.length}`);

// 3b. DEMOTE the ATS master rows master -> embedded_master (PATCH each by id)
for (const p of promoted) {
  const [atsRow] = await get(
    `/domain_module_data_objects?domain_module_id=eq.${p.atsModule}&data_object_id=eq.${p.id}&select=id,role`,
  );
  if (!atsRow) throw new Error(`ATS master row missing for ${p.name} (do ${p.id}) on module ${p.atsModule}`);
  if (atsRow.role === "master") {
    await call({
      method: "PATCH",
      path: `/domain_module_data_objects?id=eq.${atsRow.id}`,
      body: { role: "embedded_master" },
    });
    log(`demoted ATS row ${atsRow.id} (${p.name}) master -> embedded_master`);
  } else {
    log(`ATS row ${atsRow.id} (${p.name}) already ${atsRow.role} (skip)`);
  }
}

// 3c. VERIFY M7 single-master integrity for the 11
log("\n--- M7 single-master verification ---");
let m7ok = true;
for (const p of promoted) {
  const masters = await get(
    `/domain_module_data_objects?data_object_id=eq.${p.id}&role=eq.master&select=id,domain_module_id`,
  );
  const bgvMasters = masters.filter((r: Row) => modIds.includes(Number(r.domain_module_id)));
  const [atsRow] = await get(
    `/domain_module_data_objects?domain_module_id=eq.${p.atsModule}&data_object_id=eq.${p.id}&select=role`,
  );
  const ok = masters.length === 1 && bgvMasters.length === 1 && atsRow?.role === "embedded_master";
  if (!ok) m7ok = false;
  log(`${p.name}: masters=${masters.length} (bgv=${bgvMasters.length}) ats_role=${atsRow?.role} ${ok ? "OK" : "FAIL"}`);
}
if (!m7ok) throw new Error("M7 single-master integrity FAILED for one or more promoted entities. STOP.");
log("M7 integrity holds for all 11 promoted entities.");

// ---------------------------------------------------------------------------
// 4. 21 new data_objects + master rows (+ 1 master row on existing gdpr_consent_records 950)
// ---------------------------------------------------------------------------
// entity_type per Rule #12; pattern flags per Phase 0. gdpr_consent_records EXCLUDED from inserts
// (already exists id 950) but DOES get a BGV master DMDO row below (co-master, screening slice).
type NewObj = {
  name: string;
  singular: string;
  plural: string;
  module: string;
  necessity: "required" | "optional";
  entity_type: "operational_workflow" | "operational_record" | "catalog" | "junction" | "computed";
  desc: string;
  flags?: Partial<{ has_single_approver: boolean; has_submit_lock: boolean; has_personal_content: boolean }>;
};
const newObjs: NewObj[] = [
  // BGV-SCREENING-ORDERS
  { name: "screening_candidates", singular: "Screening Candidate", plural: "Screening Candidates", module: "BGV-SCREENING-ORDERS", necessity: "required", entity_type: "operational_record",
    desc: "Subjects of a background check order: the person being screened, their contact and consent details, and the identifiers searches resolve against. The order is placed for a screening candidate.", flags: { has_personal_content: true } },
  { name: "criminal_record_searches", singular: "Criminal Record Search", plural: "Criminal Record Searches", module: "BGV-SCREENING-ORDERS", necessity: "required", entity_type: "operational_workflow",
    desc: "Criminal-history searches run as components of an order across county, state, federal, and national sources, each returning records to review or a clear result." },
  { name: "employment_verifications", singular: "Employment Verification", plural: "Employment Verifications", module: "BGV-SCREENING-ORDERS", necessity: "required", entity_type: "operational_workflow",
    desc: "Verifications of a candidate's past employers, titles, and dates against the employment history they declared, run as a component of an order." },
  { name: "education_verifications", singular: "Education Verification", plural: "Education Verifications", module: "BGV-SCREENING-ORDERS", necessity: "required", entity_type: "operational_workflow",
    desc: "Verifications of a candidate's degrees, institutions, and graduation dates with the awarding bodies, run as a component of an order." },
  { name: "motor_vehicle_record_checks", singular: "Motor Vehicle Record Check", plural: "Motor Vehicle Record Checks", module: "BGV-SCREENING-ORDERS", necessity: "optional", entity_type: "operational_workflow",
    desc: "Driving-record pulls for roles that require driving, returning license status, violations, and endorsements for DOT/FMCSA driver qualification." },
  { name: "credential_license_verifications", singular: "Credential and License Verification", plural: "Credential and License Verifications", module: "BGV-SCREENING-ORDERS", necessity: "optional", entity_type: "operational_workflow",
    desc: "Verifications of professional licenses, certifications, and credentials with the issuing authority for roles that require them." },
  { name: "global_watchlist_searches", singular: "Global Watchlist Search", plural: "Global Watchlist Searches", module: "BGV-SCREENING-ORDERS", necessity: "required", entity_type: "operational_workflow",
    desc: "Searches of sanctions, debarment, and global watchlists for matches against a candidate, run as a component of an order." },
  { name: "healthcare_exclusion_screenings", singular: "Healthcare Exclusion Screening", plural: "Healthcare Exclusion Screenings", module: "BGV-SCREENING-ORDERS", necessity: "optional", entity_type: "operational_workflow",
    desc: "Checks of healthcare exclusion lists for candidates barred from federally funded healthcare programs, run for healthcare employers." },
  { name: "background_check_statuses", singular: "Background Check Status", plural: "Background Check Statuses", module: "BGV-SCREENING-ORDERS", necessity: "optional", entity_type: "junction",
    desc: "Status-history entries tracking an order as it moves through ordered, pending, in progress, completed, and disputed states over time." },
  { name: "candidate_invitations", singular: "Candidate Invitation", plural: "Candidate Invitations", module: "BGV-SCREENING-ORDERS", necessity: "optional", entity_type: "operational_workflow",
    desc: "Invitations sent to a candidate to start their portion of a screening order, tracking sent, opened, and completed engagement." },
  { name: "candidate_portal_sessions", singular: "Candidate Portal Session", plural: "Candidate Portal Sessions", module: "BGV-SCREENING-ORDERS", necessity: "optional", entity_type: "operational_record",
    desc: "Sessions in which a candidate signs in to the screening portal to give consent, supply information, and upload documents for their order.", flags: { has_personal_content: true } },
  { name: "screening_notifications", singular: "Screening Notification", plural: "Screening Notifications", module: "BGV-SCREENING-ORDERS", necessity: "optional", entity_type: "operational_record",
    desc: "Notifications sent to candidates and requesters at key points in a screening order, recording channel, recipient, and delivery outcome." },
  // BGV-ADJUDICATION-COMPLIANCE
  { name: "adjudication_matrices", singular: "Adjudication Matrix", plural: "Adjudication Matrices", module: "BGV-ADJUDICATION-COMPLIANCE", necessity: "required", entity_type: "catalog",
    desc: "Configurable eligibility rule sets that map screening results to pass, fail, or review outcomes so the same standard applies to every candidate." },
  { name: "candidate_authorizations", singular: "Candidate Authorization", plural: "Candidate Authorizations", module: "BGV-ADJUDICATION-COMPLIANCE", necessity: "optional", entity_type: "operational_record",
    desc: "Written consents a candidate signs authorizing a consumer report before any screening is ordered, as FCRA requires.", flags: { has_personal_content: true } },
  { name: "individualized_assessments", singular: "Individualized Assessment", plural: "Individualized Assessments", module: "BGV-ADJUDICATION-COMPLIANCE", necessity: "optional", entity_type: "operational_workflow",
    desc: "EEOC Green-factor assessments weighing the nature of an offense, time elapsed, and job relevance before a record disqualifies a candidate." },
  { name: "ban_the_box_assessments", singular: "Ban-the-Box Assessment", plural: "Ban-the-Box Assessments", module: "BGV-ADJUDICATION-COMPLIANCE", necessity: "optional", entity_type: "operational_workflow",
    desc: "Jurisdiction-aware fair-chance checks that enforce when and how criminal history may be considered under state and local ban-the-box laws." },
  // BGV-CONTINUOUS-IDENTITY
  { name: "identity_verifications", singular: "Identity Verification", plural: "Identity Verifications", module: "BGV-CONTINUOUS-IDENTITY", necessity: "required", entity_type: "operational_workflow",
    desc: "Verifications that a candidate is who they claim to be, validating identity documents and biographic data before and during the engagement.", flags: { has_personal_content: true } },
  { name: "continuous_monitoring_subscriptions", singular: "Continuous Monitoring Subscription", plural: "Continuous Monitoring Subscriptions", module: "BGV-CONTINUOUS-IDENTITY", necessity: "required", entity_type: "operational_record",
    desc: "Ongoing subscriptions that keep a worker under post-hire monitoring so new records surface as alerts instead of waiting for the next rescreen." },
  { name: "criminal_records_monitoring_alerts", singular: "Criminal Records Monitoring Alert", plural: "Criminal Records Monitoring Alerts", module: "BGV-CONTINUOUS-IDENTITY", necessity: "required", entity_type: "junction",
    desc: "Alerts raised against a monitoring subscription when a new criminal record surfaces for a monitored worker, queued for review and adjudication." },
  { name: "rescreenings", singular: "Rescreening", plural: "Rescreenings", module: "BGV-CONTINUOUS-IDENTITY", necessity: "optional", entity_type: "operational_workflow",
    desc: "Periodic re-runs of a screening package for an existing worker to refresh clearance on a schedule the role or policy sets." },
  { name: "international_screenings", singular: "International Screening", plural: "International Screenings", module: "BGV-CONTINUOUS-IDENTITY", necessity: "optional", entity_type: "operational_workflow",
    desc: "Screenings of candidates and records outside the United States, handling country-specific sources, consent, and lawful-basis requirements." },
  // gdpr_consent_records (950) is NOT inserted here (already exists). It is co-mastered below.
];

// 4a. Insert the new data_objects (idempotent on name)
const newNames = newObjs.map((o) => o.name);
const existingNew = await get(
  `/data_objects?data_object_name=in.(${newNames.join(",")})&select=id,data_object_name`,
);
const haveObj = new Map<string, number>(
  existingNew.map((r: Row) => [String(r.data_object_name), Number(r.id)]),
);
const objsToInsert = newObjs
  .filter((o) => !haveObj.has(o.name))
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
await insert("/data_objects", objsToInsert);
log(`new data_objects: +${objsToInsert.length} of ${newObjs.length}`);

// Re-read to build name -> id map (new + the pre-existing gdpr row)
const allNewRows = await get(
  `/data_objects?data_object_name=in.(${[...newNames, "gdpr_consent_records"].join(",")})&select=id,data_object_name`,
);
const objId = new Map<string, number>(
  allNewRows.map((r: Row) => [String(r.data_object_name), Number(r.id)]),
);
for (const n of newNames) if (!objId.has(n)) throw new Error(`data_object ${n} missing after insert`);
if (!objId.has("gdpr_consent_records")) throw new Error("gdpr_consent_records (950) not found");

// 4b. BGV master DMDO rows for the new objects + the gdpr co-master
const newMasterSpecs: { name: string; module: string; necessity: "required" | "optional"; notes: string }[] = [
  ...newObjs.map((o) => ({ name: o.name, module: o.module, necessity: o.necessity, notes: "" })),
  // gdpr_consent_records co-master: distinct screening slice; LMS keeps its learner-consent master.
  {
    name: "gdpr_consent_records",
    module: "BGV-CONTINUOUS-IDENTITY",
    necessity: "optional" as const,
    notes: "BGV masters the screening-consent slice: lawful basis and explicit consent for processing a non-US data subject's screening data. Co-mastered with the learning domain, which masters the learner-training-consent slice.",
  },
];
const existingBgvDMDO2 = await get(
  `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`,
);
const haveBgvDMDO2 = new Set(existingBgvDMDO2.map((r: Row) => `${r.domain_module_id}.${r.data_object_id}`));
const newMasterRows = newMasterSpecs
  .map((s) => ({ s, mid: moduleId.get(s.module)!, did: objId.get(s.name)! }))
  .filter(({ mid, did }) => !haveBgvDMDO2.has(`${mid}.${did}`))
  .map(({ s, mid, did }) => ({
    domain_module_id: mid,
    data_object_id: did,
    role: "master",
    necessity: s.necessity,
    domain_module_data_object_label: `${s.module} / ${s.name}`,
    notes: s.notes,
  }));
await insert("/domain_module_data_objects", newMasterRows);
log(`new BGV master rows: +${newMasterRows.length} of ${newMasterSpecs.length}`);

// ---------------------------------------------------------------------------
// 5. Capabilities + capability_domains + domain_module_capabilities
// ---------------------------------------------------------------------------
const capSpecs = [
  { code: "BGV-SCREENING-ORDERS", name: "Screening order management", module: "BGV-SCREENING-ORDERS", desc: "Place, track, and complete background check orders for screening candidates from order through clearance." },
  { code: "BGV-PACKAGE-CONFIG", name: "Screening package configuration", module: "BGV-SCREENING-ORDERS", desc: "Define orderable screening packages and the components they expand into for each role or risk tier." },
  { code: "BGV-COMPONENT-SEARCH", name: "Component search execution", module: "BGV-SCREENING-ORDERS", desc: "Run the concrete component searches an order requires: criminal, employment, education, MVR, drug, and watchlist." },
  { code: "BGV-ADJUDICATION", name: "Adjudication against eligibility matrix", module: "BGV-ADJUDICATION-COMPLIANCE", desc: "Evaluate screening results against a configurable eligibility matrix into pass, fail, or review outcomes." },
  { code: "BGV-ADVERSE-ACTION", name: "FCRA adverse-action workflow", module: "BGV-ADJUDICATION-COMPLIANCE", desc: "Walk the FCRA disclosure, authorization, pre-adverse, adverse, summary-of-rights, and dispute chain." },
  { code: "BGV-CANDIDATE-PORTAL", name: "Candidate consent and portal engagement", module: "BGV-SCREENING-ORDERS", desc: "Invite candidates to a portal to give consent, supply information, and complete their part of the order." },
  { code: "BGV-CONTINUOUS-MONITORING", name: "Post-hire continuous monitoring and rescreening", module: "BGV-CONTINUOUS-IDENTITY", desc: "Keep workers cleared after hire with continuous monitoring subscriptions, alert review, and periodic rescreening." },
  { code: "BGV-IDENTITY-RTW", name: "Identity and right-to-work verification", module: "BGV-CONTINUOUS-IDENTITY", desc: "Verify candidate identity and right to work, including I-9 / E-Verify and international consent handling." },
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
// 6. Neighbor: CWM consumer row on background_checks (12). PAYROLL/HRSD unchanged.
// ---------------------------------------------------------------------------
const [cwmRow] = await get(
  `/domain_module_data_objects?domain_module_id=eq.${CWM_SOURCING_MODULE}&data_object_id=eq.12&select=id,role`,
);
if (!cwmRow) {
  await insert("/domain_module_data_objects", [
    {
      domain_module_id: CWM_SOURCING_MODULE,
      data_object_id: 12,
      role: "consumer",
      necessity: "optional",
      domain_module_data_object_label: `VMS-WORKER-SOURCING / background_checks`,
      notes: "Contingent-worker sourcing gates assignment on a cleared background check sourced from the screening market; it consumes, it does not master the screening machinery.",
    },
  ]);
  log("CWM consumer row on background_checks: +1");
} else {
  log(`CWM already has a ${cwmRow.role} row on background_checks (skip)`);
}
// Confirm PAYROLL/HRSD consumer rows still point at the (now BGV) master data_object - no change needed.
const payrollHrsd = await get(
  `/domain_module_data_objects?domain_module_id=in.(90,75)&data_object_id=eq.12&select=domain_module_id,role,necessity`,
);
log(`PAYROLL/HRSD consumer rows on background_checks (unchanged): ${JSON.stringify(payrollHrsd)}`);

// ---------------------------------------------------------------------------
// 7. Domain skill + tools + domain_module_tools
// ---------------------------------------------------------------------------
const skillDescription =
  "Order employment background checks, build screening packages, and run criminal, employment, " +
  "education, identity, driving, drug, and watchlist component searches for a candidate. Adjudicate " +
  "results against a configurable eligibility matrix and walk the FCRA pre-adverse and adverse-action " +
  "chain with disclosures, authorizations, summary-of-rights, and disputes. Keep workers cleared after " +
  "hire with continuous monitoring, criminal-records alerts, rescreening, identity verification, and " +
  "right-to-work checks.";
const skillTriggers =
  "background check, background screening, employment screening, pre-employment screening, FCRA, " +
  "adverse action, pre-adverse action, adjudication, criminal record check, drug screening, " +
  "education verification, employment verification, continuous monitoring, identity verification, " +
  "right to work, I-9, E-Verify, watchlist screening, ban the box, rescreening";
let [bgvSkill] = await get(`/skills?domain_id=eq.${DOMAIN_ID}&skill_type=eq.domain&select=id,skill_name`);
if (!bgvSkill) {
  await insert("/skills", [
    { skill_name: "bgv", skill_type: "domain", domain_id: DOMAIN_ID, description: skillDescription, trigger_keywords: skillTriggers },
  ]);
  [bgvSkill] = await get(`/skills?domain_id=eq.${DOMAIN_ID}&skill_type=eq.domain&select=id,skill_name`);
  log(`created BGV domain skill id ${bgvSkill.id}`);
} else {
  await call({
    method: "PATCH",
    path: `/skills?id=eq.${bgvSkill.id}`,
    body: { skill_name: "bgv", description: skillDescription, trigger_keywords: skillTriggers },
  });
  log(`BGV domain skill already exists (id ${bgvSkill.id}); refreshed description + triggers`);
}

// Tools: reuse existing where present; insert the rest. Each module gets >=1 query, >=1 mutate,
// >=1 workflow-gate mutate. Platform query/mutate -> coverage_tier='platform'.
// doKey -> data_object_id resolver across promoted + new + neighbor objects.
const doId = (name: string): number => {
  const promotedMap: Record<string, number> = {
    background_checks: 12, background_check_packages: 877, background_check_components: 878,
    drug_health_screenings: 1041, background_check_adjudications: 880, fcra_disclosures: 879,
    pre_adverse_action_notices: 898, adverse_action_notices: 881, background_check_disputes: 882,
    fcra_summary_of_rights_acknowledgements: 902, right_to_work_verifications: 1257,
  };
  if (promotedMap[name]) return promotedMap[name];
  const id = objId.get(name);
  if (!id) throw new Error(`doId: unknown data_object ${name}`);
  return id;
};

type ToolSpec = { name: string; op: "query" | "mutate"; obj: string; desc: string };
const toolSpecs: ToolSpec[] = [
  // SCREENING-ORDERS
  // query_background_checks (207) + request_background_check (865, mutate) already exist -> reuse.
  { name: "query_screening_candidates", op: "query", obj: "screening_candidates", desc: "Query screening candidates and their order subjects." },
  { name: "create_background_check", op: "mutate", obj: "background_checks", desc: "Create a background check order for a screening candidate." },
  { name: "complete_background_check", op: "mutate", obj: "background_checks", desc: "Mark a background check order complete once every component search has resolved (workflow gate)." },
  { name: "send_candidate_invitation", op: "mutate", obj: "candidate_invitations", desc: "Send a candidate the invitation to start their part of a screening order." },
  // ADJUDICATION-COMPLIANCE
  { name: "query_background_check_adjudications", op: "query", obj: "background_check_adjudications", desc: "Query adjudication decisions for screening orders." },
  { name: "adjudicate_background_check", op: "mutate", obj: "background_check_adjudications", desc: "Record the adjudication decision for a screening result against the eligibility matrix (workflow gate)." },
  { name: "issue_pre_adverse_action_notice", op: "mutate", obj: "pre_adverse_action_notices", desc: "Issue the FCRA pre-adverse action notice with the report copy and summary of rights." },
  { name: "issue_adverse_action_notice", op: "mutate", obj: "adverse_action_notices", desc: "Issue the final FCRA adverse-action notice after the waiting period closes (workflow gate)." },
  // CONTINUOUS-IDENTITY
  { name: "query_continuous_monitoring_subscriptions", op: "query", obj: "continuous_monitoring_subscriptions", desc: "Query continuous monitoring subscriptions for monitored workers." },
  { name: "subscribe_continuous_monitoring", op: "mutate", obj: "continuous_monitoring_subscriptions", desc: "Subscribe a worker to post-hire continuous monitoring." },
  { name: "verify_identity", op: "mutate", obj: "identity_verifications", desc: "Run an identity verification for a candidate or worker (workflow gate)." },
  { name: "query_identity_verifications", op: "query", obj: "identity_verifications", desc: "Query identity verification results for candidates and workers." },
];
const existingToolRows = await get(
  `/tools?tool_name=in.(${toolSpecs.map((t) => t.name).join(",")})&select=id,tool_name`,
);
const haveTool = new Map<string, number>(existingToolRows.map((r: Row) => [String(r.tool_name), Number(r.id)]));
const toolsToInsert = toolSpecs
  .filter((t) => !haveTool.has(t.name))
  .map((t) => ({ tool_name: t.name, operation_kind: t.op, data_object_id: doId(t.obj), description: t.desc, coverage_tier: "platform" }));
await insert("/tools", toolsToInsert);
log(`tools: +${toolsToInsert.length} of ${toolSpecs.length}`);

// Resolve all tool ids we link (new + reused existing + notify_*)
const linkToolNames = [
  ...toolSpecs.map((t) => t.name),
  "query_background_checks", "request_background_check", "flag_for_review",
  "notify_person", "notify_team",
];
const toolRows = await get(`/tools?tool_name=in.(${linkToolNames.join(",")})&select=id,tool_name`);
const toolId = new Map<string, number>(toolRows.map((r: Row) => [String(r.tool_name), Number(r.id)]));
for (const n of linkToolNames) if (!toolId.has(n)) throw new Error(`missing tool ${n} after insert`);

const dmtSpecs: { module: string; tool: string; req: "required" | "optional" }[] = [
  // SCREENING-ORDERS: query + mutate + workflow-gate + notify
  { module: "BGV-SCREENING-ORDERS", tool: "query_background_checks", req: "required" },
  { module: "BGV-SCREENING-ORDERS", tool: "query_screening_candidates", req: "required" },
  { module: "BGV-SCREENING-ORDERS", tool: "create_background_check", req: "required" },
  { module: "BGV-SCREENING-ORDERS", tool: "request_background_check", req: "optional" },
  { module: "BGV-SCREENING-ORDERS", tool: "complete_background_check", req: "required" }, // workflow gate
  { module: "BGV-SCREENING-ORDERS", tool: "send_candidate_invitation", req: "optional" },
  { module: "BGV-SCREENING-ORDERS", tool: "notify_person", req: "optional" },
  // ADJUDICATION-COMPLIANCE: query + mutate + workflow-gate + notify
  { module: "BGV-ADJUDICATION-COMPLIANCE", tool: "query_background_check_adjudications", req: "required" },
  { module: "BGV-ADJUDICATION-COMPLIANCE", tool: "adjudicate_background_check", req: "required" }, // workflow gate
  { module: "BGV-ADJUDICATION-COMPLIANCE", tool: "flag_for_review", req: "optional" },
  { module: "BGV-ADJUDICATION-COMPLIANCE", tool: "issue_pre_adverse_action_notice", req: "required" },
  { module: "BGV-ADJUDICATION-COMPLIANCE", tool: "issue_adverse_action_notice", req: "required" }, // workflow gate
  { module: "BGV-ADJUDICATION-COMPLIANCE", tool: "notify_person", req: "optional" },
  // CONTINUOUS-IDENTITY: query + mutate + workflow-gate + notify
  { module: "BGV-CONTINUOUS-IDENTITY", tool: "query_continuous_monitoring_subscriptions", req: "required" },
  { module: "BGV-CONTINUOUS-IDENTITY", tool: "subscribe_continuous_monitoring", req: "required" },
  { module: "BGV-CONTINUOUS-IDENTITY", tool: "query_identity_verifications", req: "required" },
  { module: "BGV-CONTINUOUS-IDENTITY", tool: "verify_identity", req: "required" }, // workflow gate
  { module: "BGV-CONTINUOUS-IDENTITY", tool: "notify_team", req: "optional" },
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
// 8. domain_aliases
// ---------------------------------------------------------------------------
const aliasTexts = [
  "background screening",
  "employment screening",
  "pre-employment screening",
  "background checks",
  "BGS",
];
const existingAliases = await get(`/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=alias`);
const haveAlias = new Set(existingAliases.map((r: Row) => String(r.alias).toLowerCase()));
const newAliases = aliasTexts
  .filter((a) => !haveAlias.has(a.toLowerCase()))
  .map((a) => ({ domain_id: DOMAIN_ID, alias: a, label: a, alias_type: "synonym" }));
await insert("/domain_aliases", newAliases);
log(`domain_aliases: +${newAliases.length} (had ${existingAliases.length})`);

// ---------------------------------------------------------------------------
// 9. Canonical bare-word for background_checks (12)
// ---------------------------------------------------------------------------
const bareWordClaimed = await get(
  `/data_objects?is_canonical_bare_word=eq.true&data_object_name=eq.background_checks&id=neq.12&select=id`,
);
if (bareWordClaimed.length > 0) throw new Error("background_checks bare-word already claimed by another row. STOP.");
const [bgChk] = await get(`/data_objects?id=eq.12&select=id,is_canonical_bare_word`);
if (!bgChk.is_canonical_bare_word) {
  await call({
    method: "PATCH",
    path: `/data_objects?id=eq.12`,
    body: {
      is_canonical_bare_word: true,
      naming_authority_rationale:
        "Background Verification is the canonical screening market and the natural home of the unprefixed name: the background check is the central object every screening product centers on, so BGV holds catalog-wide naming authority for it.",
    },
  });
  log("background_checks (12): is_canonical_bare_word -> true");
} else {
  log("background_checks (12) already canonical bare-word (skip)");
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
log("\n=== BGV build summary ===");
const [d2] = await get(`/domains?id=eq.${DOMAIN_ID}&select=domain_code,domain_name,domain_kind,certification_required,usa_market_size_usd_m`);
log(`domain: ${d2.domain_code} "${d2.domain_name}" (${d2.domain_kind}) cert=${d2.certification_required} TAM=$${d2.usa_market_size_usd_m}m | id ${DOMAIN_ID}`);
for (const m of allModules) {
  const masters = await get(
    `/domain_module_data_objects?domain_module_id=eq.${m.id}&role=eq.master&select=id`,
  );
  log(`  ${m.domain_module_code}: ${masters.length} masters`);
}
const totalMasters = await get(
  `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&role=eq.master&select=id`,
);
log(`Total BGV master rows: ${totalMasters.length} (expect 33)`);
log("UI: https://adenin.semantius.app/domain_map/domains");
log("Done.");
