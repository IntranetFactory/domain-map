#!/usr/bin/env bun
// Loads the INSIDER-RISK domain (Insider Risk Management) into the live Semantius
// `domain_map` module via the semantius CLI. Idempotent by natural key.
//
// Phases: A (domain + capabilities + 2 modules + vendors + solutions),
//         B (masters + DMDO + relationships + aliases + lifecycle + trigger_events + handoffs),
//         C (business_function_domains), S (system skill + tools + domain_module_tools),
//         E (domain_roles + role_modules + process_raci).
//
// Rule #0 CLI only. Rule #1 omit record_status. Rule #15 zero notes. Rule #18 no vendor
// names outside commerce entities. American English, no em-dash.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
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

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
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
    out.push(...(await call({ method: "POST", path, body: slice })));
  }
  return out;
}
async function syncByKey(path: string, rows: Row[], key: string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${key}&limit=20000`);
  const have = new Set(existing.map(r => String(r[key])));
  const missing = rows.filter(r => !have.has(String(r[key])));
  if (missing.length) {
    console.log(`  ${path}: inserting ${missing.length} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} present`);
  }
  const all = await get(`${path}?select=id,${key}&limit=20000`);
  const m = new Map<string, number>();
  for (const r of all) m.set(String(r[key]), Number(r.id));
  return m;
}
// Generic junction sync keyed on a composite tuple computed from a row.
async function syncJunction(path: string, rows: Row[], keyOf: (r: Row) => string, selectCols: string): Promise<void> {
  const existing = await get(`${path}?select=${selectCols}&limit=20000`);
  const have = new Set(existing.map(keyOf));
  const missing = rows.filter(r => !have.has(keyOf(r)));
  if (missing.length) {
    console.log(`  ${path}: inserting ${missing.length} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} present`);
  }
}

function validateDomainRow(d: Row): void {
  const bad =
    Number(d.crud_percentage) === 0 ||
    d.min_org_size === "" ||
    d.cost_band === "" ||
    (d.business_logic === "" && Number(d.crud_percentage) < 95) ||
    Number(d.usa_market_size_usd_m) === 0 ||
    Number(d.market_size_source_year) === 0;
  if (bad) throw new Error(`validateDomainRow failed for ${d.domain_code}: ${JSON.stringify(d)}`);
}

const DOMAIN_CODE = "INSIDER-RISK";

async function main() {
  console.log("== Phase A: domain ==");
  // ---- domain (with full 7 metadata + catalog UX) ----
  const domainRow: Row = {
    domain_code: DOMAIN_CODE,
    domain_name: "Insider Risk Management",
    description:
      "Detects, investigates, and mitigates risk posed by trusted insiders (employees, contractors, partners). Scores user behavior for risk, correlates anomalous data movement and policy-violation signals into prioritized alerts, runs insider-threat investigations with file-lineage forensics and evidence collection, and monitors departing-employee exit risk. Consumes data-egress signals from Data Loss Prevention, sensitive-data context from Data Security Posture Management, and employment status from Human Capital Management; hands high-risk cases to HR and Legal. Distinct from DLP (which enforces content egress at the perimeter) and DSPM (which secures data at rest): insider risk is the human-centric case-and-investigation discipline that fuses those signals around the person.",
    crud_percentage: 55,
    business_logic:
      "Behavior-based risk scoring models over multi-source activity (endpoint, email, file, cloud, identity), anomaly detection against per-user baselines, indicator-of-compromise correlation, and file-lineage reconstruction. These ML and correlation engines sit beyond the JsonLogic-declarable CRUD and state-workflow slice.",
    min_org_size: "40 l <10000",
    cost_band: "$$$",
    certification_required: false,
    usa_market_size_usd_m: 1500,
    market_size_source_year: 2025,
    catalog_tagline: "See, investigate, and contain insider risk before trusted users cause a breach.",
    catalog_description:
      "Spot the people-shaped risks your perimeter tools miss. Score every user's behavior, surface anomalous data movement and risky activity as prioritized alerts, and turn the noise into a clear case queue. Investigate with file-lineage forensics and a full activity timeline, collect defensible evidence for HR and Legal, and keep a close watch on departing employees during their highest-risk window. Pull in egress signals, sensitive-data context, and employment status automatically, so analysts spend their time on real threats instead of stitching data together.",
  };
  validateDomainRow(domainRow);
  const domMap = await syncByKey("/domains", [domainRow], "domain_code");
  const DID = domMap.get(DOMAIN_CODE)!;
  console.log(`  domain_id = ${DID}`);

  // ---- capabilities ----
  const capabilities: Row[] = [
    { capability_code: "INSIDER-RISK-USER-BEHAVIOR-SCORING", capability_name: "User Behavior Risk Scoring", description: "Continuous behavior-based risk scoring of insiders from multi-source activity against per-user baselines." },
    { capability_code: "INSIDER-RISK-ANOMALOUS-DATA-MOVEMENT", capability_name: "Anomalous Data Movement Detection", description: "Detection of unusual file, email, cloud, and removable-media data movement that signals exfiltration or misuse." },
    { capability_code: "INSIDER-RISK-INDICATOR-CORRELATION", capability_name: "Risk Indicator Correlation", description: "Correlation of policy violations and indicators of compromise into prioritized, deduplicated insider-risk alerts." },
    { capability_code: "INSIDER-RISK-THREAT-INVESTIGATION", capability_name: "Insider Threat Investigation", description: "Case-based investigation of insider threats with activity timelines, file-lineage forensics, and analyst workflows." },
    { capability_code: "INSIDER-RISK-EVIDENCE-COLLECTION", capability_name: "Evidence Collection for HR and Legal", description: "Defensible collection, preservation, and packaging of investigation evidence for HR and Legal review." },
    { capability_code: "INSIDER-RISK-FILE-LINEAGE", capability_name: "File Lineage Tracking", description: "Reconstruction of how files were created, copied, renamed, and moved across endpoints and cloud to trace exfiltration paths." },
    { capability_code: "INSIDER-RISK-DEPARTING-USER-MONITORING", capability_name: "Departing-User and Exit Risk Monitoring", description: "Heightened monitoring and exit-risk assessment of employees during resignation, transfer, and termination windows." },
  ];
  const capMap = await syncByKey("/capabilities", capabilities, "capability_code");

  // ---- modules ----
  const modules: Row[] = [
    {
      domain_module_code: "INSIDER-RISK-MONITORING-DETECTION",
      domain_module_name: "Monitoring and Detection",
      domain_id: DID,
      module_kind: "full",
      description:
        "The always-on signal layer. Masters user risk scores, monitored activity, risk indicators, and the prioritized alert queue, plus the detection rules that generate them. Consumes egress events from DLP, sensitive-data context from DSPM, and identity context to baseline behavior and surface anomalies.",
      catalog_tagline: "Turn endpoint, email, file, and cloud signals into a ranked queue of risky users.",
      catalog_description:
        "Continuously score every user's behavior and watch for anomalous data movement across endpoints, email, cloud, and removable media. Tune detection rules to your risk tolerance, fold in egress and sensitive-data signals you already collect, and get a prioritized alert queue that puts the riskiest insiders at the top, so analysts triage real threats instead of chasing noise.",
    },
    {
      domain_module_code: "INSIDER-RISK-INVESTIGATION-CASE-MGMT",
      domain_module_name: "Investigation and Case Management",
      domain_id: DID,
      module_kind: "full",
      description:
        "The human investigation workflow. Masters insider-risk cases (full lifecycle), investigation evidence, and exit-risk assessments for departing users. Provides activity timelines and file-lineage forensics, and hands high-risk cases off to HR and Legal with defensible evidence packages.",
      catalog_tagline: "Investigate insider cases end to end and hand defensible evidence to HR and Legal.",
      catalog_description:
        "Work alerts into a structured case queue and investigate with a full activity timeline and file-lineage forensics. Collect and preserve evidence as you go, assess exit risk for departing employees during their highest-risk window, and package everything for HR and Legal review with a clear chain of custody. Close cases with a documented disposition that stands up to scrutiny.",
    },
  ];
  const MOD_MONITOR_CODE = "INSIDER-RISK-MONITORING-DETECTION";
  const MOD_CASE_CODE = "INSIDER-RISK-INVESTIGATION-CASE-MGMT";
  const modMap = await syncByKey("/domain_modules", modules, "domain_module_code");
  const MID_MONITOR = modMap.get(MOD_MONITOR_CODE)!;
  const MID_CASE = modMap.get(MOD_CASE_CODE)!;

  // ---- capability_domains ----
  await syncJunction(
    "/capability_domains",
    capabilities.map(c => ({ capability_id: capMap.get(String(c.capability_code))!, domain_id: DID })),
    r => `${r.capability_id}|${r.domain_id}`,
    "capability_id,domain_id",
  );

  // ---- domain_module_capabilities ----
  const capModuleMap: Record<string, number> = {
    "INSIDER-RISK-USER-BEHAVIOR-SCORING": MID_MONITOR,
    "INSIDER-RISK-ANOMALOUS-DATA-MOVEMENT": MID_MONITOR,
    "INSIDER-RISK-INDICATOR-CORRELATION": MID_MONITOR,
    "INSIDER-RISK-THREAT-INVESTIGATION": MID_CASE,
    "INSIDER-RISK-EVIDENCE-COLLECTION": MID_CASE,
    "INSIDER-RISK-FILE-LINEAGE": MID_CASE,
    "INSIDER-RISK-DEPARTING-USER-MONITORING": MID_CASE,
  };
  await syncJunction(
    "/domain_module_capabilities",
    capabilities.map(c => ({ domain_module_id: capModuleMap[String(c.capability_code)], capability_id: capMap.get(String(c.capability_code))! })),
    r => `${r.domain_module_id}|${r.capability_id}`,
    "domain_module_id,capability_id",
  );

  // ---- vendors (reuse existing by vendor_name; create missing) ----
  const vendors: Row[] = [
    { vendor_name: "DTEX Systems", vendor_url: "https://www.dtexsystems.com", headquarters_country: "USA", description: "Pure-play insider risk management vendor; behavioral DLP and workforce cyber intelligence (InTERCEPT)." },
    { vendor_name: "Teramind", vendor_url: "https://www.teramind.co", headquarters_country: "USA", description: "Insider threat detection and employee monitoring vendor with ML behavioral baselines." },
    { vendor_name: "Mimecast", vendor_url: "https://www.mimecast.com", headquarters_country: "UK", description: "Email security and human risk management vendor; acquired Code42 in 2024, bringing the Incydr insider risk platform into its portfolio." },
    // Existing vendors reused (no insert needed; syncByKey skips): Microsoft, Forcepoint, Proofpoint, Code42, Cyberhaven.
  ];
  await syncByKey("/vendors", vendors, "vendor_name");
  const allVendors = await get("/vendors?select=id,vendor_name&limit=20000");
  const vMap = new Map<string, number>();
  for (const v of allVendors) vMap.set(String(v.vendor_name), Number(v.id));

  // ---- solutions ----
  type SolDef = { solution_name: string; vendor: string; solution_type: string; solution_url?: string; description: string };
  const solutions: SolDef[] = [
    { solution_name: "DTEX InTERCEPT", vendor: "DTEX Systems", solution_type: "saas", solution_url: "https://www.dtexsystems.com", description: "Insider risk management platform combining behavioral DLP, user activity monitoring, and the i3 behavioral risk model to detect and investigate insider threats." },
    { solution_name: "Mimecast Incydr", vendor: "Mimecast", solution_type: "saas", solution_url: "https://www.mimecast.com", description: "Insider risk and data exfiltration detection platform (formerly Code42 Incydr) focused on departing-employee data theft and risky file movement; Code42 was acquired by Mimecast in 2024." },
    { solution_name: "Proofpoint Insider Threat Management", vendor: "Proofpoint", solution_type: "saas", solution_url: "https://www.proofpoint.com", description: "Dedicated insider threat management platform (formerly ObserveIT) with user activity monitoring, risk scoring, and investigation timelines." },
    { solution_name: "Microsoft Purview Insider Risk Management", vendor: "Microsoft", solution_type: "saas", solution_url: "https://www.microsoft.com/security/business/risk-management/microsoft-purview-insider-risk-management", description: "Insider risk module of Microsoft Purview that detects risky activity across Microsoft 365 and correlates departing-user, data-theft, and policy-violation signals into cases." },
    { solution_name: "Teramind", vendor: "Teramind", solution_type: "saas", solution_url: "https://www.teramind.co", description: "Insider threat detection and employee monitoring platform with behavioral analytics, session recording, and policy-based alerting." },
    { solution_name: "Forcepoint Risk-Adaptive Protection", vendor: "Forcepoint", solution_type: "saas", solution_url: "https://www.forcepoint.com", description: "Behavior-centric, risk-adaptive insider protection that dynamically adjusts data-protection enforcement based on individual user risk scores." },
    { solution_name: "Cyberhaven", vendor: "Cyberhaven", solution_type: "saas", solution_url: "https://www.cyberhaven.com", description: "Data detection and response platform that tracks file lineage across the enterprise to detect insider data exfiltration and misuse." },
  ];
  const solMap = await syncByKey(
    "/solutions",
    solutions.map(s => ({ solution_name: s.solution_name, vendor_id: vMap.get(s.vendor)!, solution_type: s.solution_type, solution_url: s.solution_url ?? "", description: s.description, is_active_in_market: true })),
    "solution_name",
  );

  // ---- solution_domains ----
  await syncJunction(
    "/solution_domains",
    solutions.map(s => ({ solution_id: solMap.get(s.solution_name)!, domain_id: DID, coverage_level: "primary" })),
    r => `${r.solution_id}|${r.domain_id}`,
    "solution_id,domain_id",
  );

  console.log("== Phase B: data objects ==");
  // ---- data_objects (masters) ----
  type DObj = {
    data_object_name: string; singular_label: string; plural_label: string; description: string;
    entity_type: string; has_personal_content?: boolean; has_submit_lock?: boolean; has_single_approver?: boolean;
    module: number; // realizing module id
  };
  const dobjs: DObj[] = [
    { data_object_name: "user_risk_scores", singular_label: "User Risk Score", plural_label: "User Risk Scores",
      description: "Computed risk score for an individual insider, derived from weighted behavioral indicators over a scoring window. Updates continuously as new activity arrives.",
      entity_type: "computed", module: MID_MONITOR },
    { data_object_name: "monitored_activities", singular_label: "Monitored Activity", plural_label: "Monitored Activities",
      description: "An observed insider activity event captured from endpoint, email, file, cloud, identity, or removable-media telemetry. The raw substrate that scoring and detection rules evaluate.",
      entity_type: "operational_record", has_personal_content: true, module: MID_MONITOR },
    { data_object_name: "risk_indicators", singular_label: "Risk Indicator", plural_label: "Risk Indicators",
      description: "A configured behavioral indicator or detection rule (for example, large download before resignation, upload to personal cloud, access to data outside role) that contributes weight to user risk scores and fires alerts.",
      entity_type: "catalog", module: MID_MONITOR },
    { data_object_name: "insider_risk_alerts", singular_label: "Insider Risk Alert", plural_label: "Insider Risk Alerts",
      description: "A prioritized alert raised when correlated indicators cross a risk threshold for a user. Triaged and dispositioned, and escalated into an insider-risk case when warranted.",
      entity_type: "operational_workflow", module: MID_MONITOR },
    { data_object_name: "insider_risk_cases", singular_label: "Insider Risk Case", plural_label: "Insider Risk Cases",
      description: "An investigation case opened on a suspected insider threat. Carries the full lifecycle from triage through investigation to disposition, the activity timeline, linked evidence, and the HR/Legal handoff.",
      entity_type: "operational_workflow", has_personal_content: true, has_single_approver: true, module: MID_CASE },
    { data_object_name: "investigation_evidence", singular_label: "Investigation Evidence Item", plural_label: "Investigation Evidence Items",
      description: "A preserved evidence artifact attached to an insider-risk case (file copy, activity snapshot, screen capture, lineage trace, exported report) with chain-of-custody metadata for HR and Legal review.",
      entity_type: "operational_record", has_personal_content: true, has_submit_lock: true, module: MID_CASE },
    { data_object_name: "exit_risk_assessments", singular_label: "Exit Risk Assessment", plural_label: "Exit Risk Assessments",
      description: "A heightened-monitoring assessment of a departing employee during the resignation, transfer, or termination window, scoring exit-related data-theft risk and driving watchlist placement.",
      entity_type: "operational_workflow", module: MID_CASE },
  ];
  const insertableDobjs = dobjs.map(({ module, ...rest }) => ({
    ...rest,
    has_personal_content: rest.has_personal_content ?? false,
    has_submit_lock: rest.has_submit_lock ?? false,
    has_single_approver: rest.has_single_approver ?? false,
  }));
  const doMap = await syncByKey("/data_objects", insertableDobjs, "data_object_name");
  const doid = (name: string) => {
    const id = doMap.get(name);
    if (!id) throw new Error(`data_object ${name} not found`);
    return id;
  };

  // Pre-load referenced cross-domain + builtin data_object ids
  const refObjs = await get("/data_objects?data_object_name=in.(users,employees,dlp_incidents,dlp_user_activity_logs,data_risk_scores)&select=id,data_object_name");
  for (const r of refObjs) doMap.set(String(r.data_object_name), Number(r.id));
  const USERS = doid("users");
  const EMPLOYEES = doid("employees");

  // ---- domain_module_data_objects ----
  // master rows for the 7 new masters; consumer rows for cross-domain + builtin signals.
  type DMDO = { module: number; data_object: number; role: string; necessity: string };
  const dmdo: DMDO[] = [
    // MONITORING masters
    { module: MID_MONITOR, data_object: doid("user_risk_scores"), role: "master", necessity: "required" },
    { module: MID_MONITOR, data_object: doid("monitored_activities"), role: "master", necessity: "required" },
    { module: MID_MONITOR, data_object: doid("risk_indicators"), role: "master", necessity: "required" },
    { module: MID_MONITOR, data_object: doid("insider_risk_alerts"), role: "master", necessity: "required" },
    // INVESTIGATION masters
    { module: MID_CASE, data_object: doid("insider_risk_cases"), role: "master", necessity: "required" },
    { module: MID_CASE, data_object: doid("investigation_evidence"), role: "master", necessity: "required" },
    { module: MID_CASE, data_object: doid("exit_risk_assessments"), role: "master", necessity: "optional" }, // departing-user feature; not every deployment runs exit monitoring
    // consumed signals (cross-domain + builtin), all optional + graceful degrade
    { module: MID_MONITOR, data_object: USERS, role: "consumer", necessity: "required" },
    { module: MID_MONITOR, data_object: EMPLOYEES, role: "consumer", necessity: "optional" }, // HCM employment status / departures
    { module: MID_MONITOR, data_object: doid("dlp_incidents"), role: "consumer", necessity: "optional" }, // DLP egress signal
    { module: MID_MONITOR, data_object: doid("dlp_user_activity_logs"), role: "consumer", necessity: "optional" },
    { module: MID_MONITOR, data_object: doid("data_risk_scores"), role: "consumer", necessity: "optional" }, // DSPM sensitive-data context
    { module: MID_CASE, data_object: USERS, role: "consumer", necessity: "required" }, // investigator, HR/Legal reviewer
    { module: MID_CASE, data_object: EMPLOYEES, role: "consumer", necessity: "optional" }, // the monitored employee subject
  ];
  await syncJunction(
    "/domain_module_data_objects",
    dmdo.map(d => ({ domain_module_id: d.module, data_object_id: d.data_object, role: d.role, necessity: d.necessity })),
    r => `${r.domain_module_id}|${r.data_object_id}`,
    "domain_module_id,data_object_id",
  );

  // ---- data_object_relationships ----
  // intra-domain + users edges + cross-domain payload->target.
  type Rel = { src: number; dst: number; type: string; kind: string; verb: string; inverse: string; required: boolean; owner: string };
  const rels: Rel[] = [
    // intra-domain
    { src: doid("risk_indicators"), dst: doid("user_risk_scores"), type: "one_to_many", kind: "reference", verb: "contributes weight to", inverse: "is derived from", required: false, owner: "source" },
    { src: doid("monitored_activities"), dst: doid("user_risk_scores"), type: "many_to_many", kind: "reference", verb: "raises", inverse: "is computed from", required: false, owner: "target" },
    { src: doid("risk_indicators"), dst: doid("insider_risk_alerts"), type: "one_to_many", kind: "reference", verb: "fires", inverse: "is fired by", required: false, owner: "source" },
    { src: doid("user_risk_scores"), dst: doid("insider_risk_alerts"), type: "one_to_many", kind: "reference", verb: "triggers", inverse: "is triggered by", required: false, owner: "source" },
    { src: doid("insider_risk_alerts"), dst: doid("insider_risk_cases"), type: "many_to_many", kind: "reference", verb: "escalates into", inverse: "is opened from", required: false, owner: "target" },
    { src: doid("insider_risk_cases"), dst: doid("monitored_activities"), type: "many_to_many", kind: "association", verb: "investigates", inverse: "is investigated in", required: false, owner: "source" },
    { src: doid("insider_risk_cases"), dst: doid("investigation_evidence"), type: "one_to_many", kind: "composition", verb: "contains", inverse: "belongs to", required: false, owner: "source" },
    { src: doid("exit_risk_assessments"), dst: doid("insider_risk_cases"), type: "one_to_many", kind: "reference", verb: "can open", inverse: "may originate from", required: false, owner: "source" },
    { src: doid("exit_risk_assessments"), dst: doid("user_risk_scores"), type: "one_to_one", kind: "reference", verb: "draws on", inverse: "informs", required: false, owner: "source" },
    // users edges (Rule #10)
    { src: USERS, dst: doid("monitored_activities"), type: "one_to_many", kind: "reference", verb: "is monitored via", inverse: "is attributed to", required: false, owner: "target" },
    { src: USERS, dst: doid("user_risk_scores"), type: "one_to_one", kind: "reference", verb: "is scored by", inverse: "scores", required: false, owner: "target" },
    { src: USERS, dst: doid("insider_risk_cases"), type: "one_to_many", kind: "reference", verb: "investigates", inverse: "is investigated by", required: false, owner: "source" },
    { src: USERS, dst: doid("insider_risk_cases"), type: "one_to_many", kind: "reference", verb: "approves disposition of", inverse: "disposition is approved by", required: false, owner: "source" },
    { src: USERS, dst: doid("investigation_evidence"), type: "one_to_many", kind: "reference", verb: "collects", inverse: "is collected by", required: false, owner: "source" },
    { src: USERS, dst: doid("exit_risk_assessments"), type: "one_to_many", kind: "reference", verb: "reviews", inverse: "is reviewed by", required: false, owner: "source" },
    // cross-domain consumed signals (this domain's master <- other domain payload, modeled source-side from our masters where we are the consumer of record)
    { src: doid("monitored_activities"), dst: doid("dlp_incidents"), type: "many_to_many", kind: "association", verb: "correlates", inverse: "is correlated by", required: false, owner: "source" },
    { src: doid("user_risk_scores"), dst: doid("data_risk_scores"), type: "many_to_many", kind: "association", verb: "incorporates", inverse: "feeds", required: false, owner: "source" },
    { src: doid("exit_risk_assessments"), dst: EMPLOYEES, type: "one_to_one", kind: "reference", verb: "assesses", inverse: "is assessed by", required: false, owner: "target" },
    { src: doid("insider_risk_cases"), dst: EMPLOYEES, type: "one_to_many", kind: "reference", verb: "concerns", inverse: "is subject of", required: false, owner: "target" },
  ];
  await syncJunction(
    "/data_object_relationships",
    rels.map(r => ({ data_object_id: r.src, related_data_object_id: r.dst, relationship_type: r.type, relationship_kind: r.kind, relationship_verb: r.verb, inverse_verb: r.inverse, is_required: r.required, owner_side: r.owner })),
    r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`,
    "data_object_id,related_data_object_id,relationship_verb",
  );

  // ---- data_object_aliases ----
  type Alias = { name: string; data_object: number; alias_type: string };
  const aliases: Alias[] = [
    { name: "insider threat case", data_object: doid("insider_risk_cases"), alias_type: "synonym" },
    { name: "insider investigation", data_object: doid("insider_risk_cases"), alias_type: "synonym" },
    { name: "risk alert", data_object: doid("insider_risk_alerts"), alias_type: "synonym" },
    { name: "behavioral risk score", data_object: doid("user_risk_scores"), alias_type: "synonym" },
    { name: "user activity event", data_object: doid("monitored_activities"), alias_type: "synonym" },
    { name: "detection rule", data_object: doid("risk_indicators"), alias_type: "synonym" },
    { name: "indicator of compromise", data_object: doid("risk_indicators"), alias_type: "synonym" },
    { name: "evidence package", data_object: doid("investigation_evidence"), alias_type: "synonym" },
    { name: "departing-user risk assessment", data_object: doid("exit_risk_assessments"), alias_type: "synonym" },
  ];
  await syncJunction(
    "/data_object_aliases",
    aliases.map(a => ({ alias_name: a.name, data_object_id: a.data_object, alias_type: a.alias_type, is_preferred: false })),
    r => `${r.data_object_id}|${r.alias_name}`,
    "data_object_id,alias_name",
  );

  // ---- data_object_lifecycle_states (operational_workflow masters) ----
  type LState = { data_object: number; module: number; states: Array<{ s: string; o: number; init?: boolean; term?: boolean; perm?: boolean; vo?: string }> };
  const lstates: LState[] = [
    { data_object: doid("insider_risk_alerts"), module: MID_MONITOR, states: [
      { s: "new", o: 1, init: true },
      { s: "triaged", o: 2, perm: true },
      { s: "escalated", o: 3, perm: true },
      { s: "dismissed", o: 4, term: true, perm: true },
      { s: "closed", o: 5, term: true },
    ]},
    { data_object: doid("insider_risk_cases"), module: MID_CASE, states: [
      { s: "open", o: 1, init: true },
      { s: "investigating", o: 2, perm: true },
      { s: "evidence_review", o: 3, perm: true },
      { s: "escalated_to_hr_legal", o: 4, perm: true, vo: "escalate_case" },
      { s: "substantiated", o: 5, perm: true },
      { s: "unsubstantiated", o: 6, term: true, perm: true },
      { s: "closed", o: 7, term: true, perm: true },
    ]},
    { data_object: doid("exit_risk_assessments"), module: MID_CASE, states: [
      { s: "initiated", o: 1, init: true },
      { s: "monitoring", o: 2, perm: true },
      { s: "flagged", o: 3, perm: true },
      { s: "cleared", o: 4, term: true, perm: true },
      { s: "completed", o: 5, term: true },
    ]},
  ];
  const lstateRows: Row[] = [];
  for (const ls of lstates) for (const st of ls.states) {
    lstateRows.push({
      data_object_id: ls.data_object, domain_module_id: ls.module, state_name: st.s, state_order: st.o,
      is_initial: !!st.init, is_terminal: !!st.term, requires_permission: !!st.perm, permission_verb_override: st.vo ?? "",
    });
  }
  await syncJunction(
    "/data_object_lifecycle_states",
    lstateRows,
    r => `${r.data_object_id}|${r.state_name}`,
    "data_object_id,state_name",
  );

  // ---- trigger_events ----
  type TEvt = { name: string; data_object: number; from: string; to: string; cat: string; desc: string };
  const tevents: TEvt[] = [
    { name: "insider_risk_alert.escalated", data_object: doid("insider_risk_alerts"), from: "triaged", to: "escalated", cat: "lifecycle", desc: "A triaged alert crossed the escalation threshold and an insider-risk case is opened. Carries the user, contributing indicators, and risk score." },
    { name: "user_risk_score.threshold_breached", data_object: doid("user_risk_scores"), from: "", to: "elevated", cat: "threshold", desc: "A user's risk score crossed a configured threshold, signaling elevated insider risk and prompting alert generation." },
    { name: "insider_risk_case.escalated_to_hr_legal", data_object: doid("insider_risk_cases"), from: "evidence_review", to: "escalated_to_hr_legal", cat: "lifecycle", desc: "A substantiating case is handed to HR and Legal with its evidence package for employment-action or legal-hold decisions." },
    { name: "insider_risk_case.substantiated", data_object: doid("insider_risk_cases"), from: "evidence_review", to: "substantiated", cat: "state_change", desc: "Investigation concluded the insider risk is substantiated; the case carries findings and recommended actions." },
    { name: "exit_risk_assessment.flagged", data_object: doid("exit_risk_assessments"), from: "monitoring", to: "flagged", cat: "signal", desc: "A departing employee exhibited high exit-related data-theft risk during the monitoring window; raises an alert or opens a case." },
    { name: "exit_risk_assessment.initiated", data_object: doid("exit_risk_assessments"), from: "", to: "initiated", cat: "lifecycle", desc: "Heightened exit-risk monitoring started for an employee entering a resignation, transfer, or termination window." },
  ];
  const teMap = await syncByKey("/trigger_events", tevents.map(t => ({ event_name: t.name, data_object_id: t.data_object, from_state: t.from, to_state: t.to, event_category: t.cat, description: t.desc })), "event_name");

  // ---- handoffs (outbound cross-domain) ----
  // Resolve adjacent domain ids live.
  const adj = await get("/domains?domain_code=in.(HCM,DLP,DSPM,SECOPS,IGA)&select=id,domain_code");
  const aid: Record<string, number> = {};
  for (const a of adj) aid[String(a.domain_code)] = Number(a.id);
  // SECOPS has no modules; target module FK stays NULL (counterparty not modularized).
  type HO = { src: number; tgt: number; payload: number; ev: string; srcMod: number | null; tgtMod: number | null; pattern: string; friction: string; desc: string };
  const handoffs: HO[] = [
    // high-risk case -> HR (HRSD) / Legal handled via business-function consumer; cross-domain handoff to SECOPS for incident response
    { src: DID, tgt: aid.SECOPS, payload: doid("insider_risk_cases"), ev: "insider_risk_case.escalated_to_hr_legal", srcMod: MID_CASE, tgtMod: null, pattern: "api_call", friction: "high", desc: "A substantiated insider-risk case is handed to Security Operations for coordinated incident response when the insider activity rises to a security incident. Payload carries the case, timeline, and evidence references." },
    // departing-user signal originates from HCM into our exit monitoring (inbound is HCM's B8; we model the outbound case->HCM employment-action signal)
    { src: DID, tgt: aid.HCM, payload: doid("exit_risk_assessments"), ev: "exit_risk_assessment.flagged", srcMod: MID_CASE, tgtMod: null, pattern: "event_stream", friction: "medium", desc: "A flagged exit-risk assessment notifies Human Capital Management so offboarding can adjust access revocation timing and HR can be looped into a potential employment action." },
    // case escalation feeds IGA for access revocation
    { src: DID, tgt: aid.IGA, payload: doid("insider_risk_cases"), ev: "insider_risk_case.substantiated", srcMod: MID_CASE, tgtMod: null, pattern: "api_call", friction: "high", desc: "A substantiated case triggers Identity Governance to revoke or restrict the insider's access and entitlements pending resolution." },
    // alert escalation can request deeper DLP enforcement / DSPM context (intra-domain alert->case is lifecycle; cross to DLP for policy tightening)
    { src: DID, tgt: aid.DLP, payload: doid("insider_risk_alerts"), ev: "user_risk_score.threshold_breached", srcMod: MID_MONITOR, tgtMod: 232, pattern: "event_stream", friction: "medium", desc: "When a user's risk score breaches threshold, Data Loss Prevention enforcement can be tightened for that user (risk-adaptive policy), narrowing what they can exfiltrate while a case proceeds." },
  ];
  await syncJunction(
    "/handoffs",
    handoffs.map(h => ({
      source_domain_id: h.src, target_domain_id: h.tgt, data_object_id: h.payload,
      trigger_event_id: teMap.get(h.ev)!, source_domain_module_id: h.srcMod, target_domain_module_id: h.tgtMod,
      integration_pattern: h.pattern, friction_level: h.friction, description: h.desc,
    })),
    r => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event_id}`,
    "source_domain_id,target_domain_id,data_object_id,trigger_event_id",
  );

  console.log("== Phase C: business_function_domains ==");
  type BFD = { bf: number; role: string };
  const bfds: BFD[] = [
    { bf: 28, role: "owner" },       // Security
    { bf: 3, role: "contributor" },  // Human Resources
    { bf: 7, role: "consumer" },     // Legal
  ];
  await syncJunction(
    "/business_function_domains",
    bfds.map(b => ({ business_function_id: b.bf, domain_id: DID, responsibility_type: b.role })),
    r => `${r.business_function_id}|${r.domain_id}`,
    "business_function_id,domain_id",
  );

  console.log("== Phase S: system skill + tools ==");
  // ---- tools (reuse shared abstraction tools; create domain-specific query/mutate) ----
  type ToolDef = { tool_name: string; operation_kind: string; coverage_tier: string; data_object?: number | null; description: string };
  const tools: ToolDef[] = [
    // queries (platform-covered)
    { tool_name: "query_user_risk_scores", operation_kind: "query", coverage_tier: "platform", data_object: doid("user_risk_scores"), description: "Read user risk scores and their contributing indicators." },
    { tool_name: "query_monitored_activities", operation_kind: "query", coverage_tier: "platform", data_object: doid("monitored_activities"), description: "Read monitored insider activity events for a user or case." },
    { tool_name: "query_insider_risk_alerts", operation_kind: "query", coverage_tier: "platform", data_object: doid("insider_risk_alerts"), description: "Read the insider-risk alert queue and alert detail." },
    { tool_name: "query_insider_risk_cases", operation_kind: "query", coverage_tier: "platform", data_object: doid("insider_risk_cases"), description: "Read insider-risk cases, their timelines, and disposition." },
    { tool_name: "query_investigation_evidence", operation_kind: "query", coverage_tier: "platform", data_object: doid("investigation_evidence"), description: "Read preserved investigation evidence and chain-of-custody metadata." },
    { tool_name: "query_exit_risk_assessments", operation_kind: "query", coverage_tier: "platform", data_object: doid("exit_risk_assessments"), description: "Read exit-risk assessments for departing employees." },
    { tool_name: "query_risk_indicators", operation_kind: "query", coverage_tier: "platform", data_object: doid("risk_indicators"), description: "Read configured risk indicators and detection rules." },
    // mutates (platform-covered)
    { tool_name: "triage_insider_risk_alert", operation_kind: "mutate", coverage_tier: "platform", data_object: doid("insider_risk_alerts"), description: "Triage and disposition an insider-risk alert (advance, dismiss, or escalate it)." },
    { tool_name: "open_insider_risk_case", operation_kind: "mutate", coverage_tier: "platform", data_object: doid("insider_risk_cases"), description: "Open or advance an insider-risk case through its investigation lifecycle." },
    { tool_name: "collect_investigation_evidence", operation_kind: "mutate", coverage_tier: "platform", data_object: doid("investigation_evidence"), description: "Attach and preserve an evidence item on an insider-risk case." },
    { tool_name: "update_exit_risk_assessment", operation_kind: "mutate", coverage_tier: "platform", data_object: doid("exit_risk_assessments"), description: "Update a departing-employee exit-risk assessment (advance monitoring, flag, or clear)." },
    // external telemetry fetch (Semantius does not own the source schema)
    { tool_name: "fetch_endpoint_activity_telemetry", operation_kind: "fetch", coverage_tier: "external", data_object: null, description: "Pull insider activity telemetry from external endpoint, email, cloud, and identity monitoring agents where Semantius does not own the source schema." },
  ];
  const toolMap = await syncByKey("/tools", tools.map(t => ({ tool_name: t.tool_name, operation_kind: t.operation_kind, coverage_tier: t.coverage_tier, data_object_id: t.data_object ?? null, description: t.description })), "tool_name");
  // shared reused tools
  const sharedTools = await get("/tools?tool_name=in.(notify_person,notify_team,search_web)&select=id,tool_name");
  for (const t of sharedTools) toolMap.set(String(t.tool_name), Number(t.id));

  // ---- system skill (domain grain) ----
  const skillRow: Row = {
    skill_name: "insider-risk-system",
    skill_type: "system",
    domain_id: DID,
    domain_module_id: null,
    description:
      "The insider risk management agent surface. Reasons across user risk scores, monitored activity, alerts, cases, evidence, and exit-risk assessments to triage insider-risk alerts, drive investigations, collect evidence, and notify HR, Legal, and Security. Derives its toolset from the domain's modules and scopes to whichever modules and external telemetry feeds the tenant has installed.",
  };
  await syncByKey("/skills", [skillRow], "skill_name");

  // ---- domain_module_tools ----
  type DMT = { module: number; tool: string; req: string };
  const dmts: DMT[] = [
    // MONITORING module
    { module: MID_MONITOR, tool: "query_user_risk_scores", req: "required" },
    { module: MID_MONITOR, tool: "query_monitored_activities", req: "required" },
    { module: MID_MONITOR, tool: "query_insider_risk_alerts", req: "required" },
    { module: MID_MONITOR, tool: "query_risk_indicators", req: "required" },
    { module: MID_MONITOR, tool: "triage_insider_risk_alert", req: "required" },
    { module: MID_MONITOR, tool: "fetch_endpoint_activity_telemetry", req: "optional" },
    { module: MID_MONITOR, tool: "notify_team", req: "optional" },
    // INVESTIGATION module
    { module: MID_CASE, tool: "query_insider_risk_cases", req: "required" },
    { module: MID_CASE, tool: "query_investigation_evidence", req: "required" },
    { module: MID_CASE, tool: "query_exit_risk_assessments", req: "required" },
    { module: MID_CASE, tool: "open_insider_risk_case", req: "required" },
    { module: MID_CASE, tool: "collect_investigation_evidence", req: "required" },
    { module: MID_CASE, tool: "update_exit_risk_assessment", req: "required" },
    { module: MID_CASE, tool: "notify_person", req: "required" },
    { module: MID_CASE, tool: "search_web", req: "optional" },
  ];
  await syncJunction(
    "/domain_module_tools",
    dmts.map(d => ({ domain_module_id: d.module, tool_id: toolMap.get(d.tool)!, requirement_level: d.req })),
    r => `${r.domain_module_id}|${r.tool_id}`,
    "domain_module_id,tool_id",
  );

  console.log("== Phase E: roles ==");
  // ---- domain_roles ----
  type RoleDef = { role_code: string; role_name: string; bf: number | null; description: string };
  const roles: RoleDef[] = [
    { role_code: "SECURITY-INSIDER-RISK-ANALYST", role_name: "Insider Risk Analyst", bf: 28, description: "Triages insider-risk alerts, tunes detection indicators, and drives day-to-day monitoring of user risk across the workforce." },
    { role_code: "SECURITY-INSIDER-THREAT-INVESTIGATOR", role_name: "Insider Threat Investigator", bf: 28, description: "Investigates escalated insider-risk cases end to end: builds the activity timeline, performs file-lineage forensics, collects evidence, and packages it for HR and Legal." },
    { role_code: "SECURITY-INSIDER-RISK-MANAGER", role_name: "Insider Risk Program Manager", bf: 28, description: "Owns the insider risk program: approves case dispositions, governs HR/Legal escalation, and oversees exit-risk monitoring policy." },
  ];
  const roleMap = await syncByKey("/domain_roles", roles.map(r => ({ role_code: r.role_code, role_name: r.role_name, business_function_id: r.bf, description: r.description })), "role_code");

  // ---- role_modules (>=2 per persona) ----
  type RM = { role: string; module: number; interaction: string };
  const roleModules: RM[] = [
    { role: "SECURITY-INSIDER-RISK-ANALYST", module: MID_MONITOR, interaction: "primary" },
    { role: "SECURITY-INSIDER-RISK-ANALYST", module: MID_CASE, interaction: "secondary" },
    { role: "SECURITY-INSIDER-THREAT-INVESTIGATOR", module: MID_CASE, interaction: "primary" },
    { role: "SECURITY-INSIDER-THREAT-INVESTIGATOR", module: MID_MONITOR, interaction: "secondary" },
    { role: "SECURITY-INSIDER-RISK-MANAGER", module: MID_CASE, interaction: "primary" },
    { role: "SECURITY-INSIDER-RISK-MANAGER", module: MID_MONITOR, interaction: "primary" },
  ];
  await syncJunction(
    "/role_modules",
    roleModules.map(rm => ({ role_id: roleMap.get(rm.role)!, domain_module_id: rm.module, interaction_level: rm.interaction })),
    r => `${r.role_id}|${r.domain_module_id}`,
    "role_id,domain_module_id",
  );

  // ---- process_raci ----
  // Find a fitting cross-industry PCF node for insider-threat investigation / security monitoring.
  const pcf = await get("/processes?and=(source_framework.eq.apqc_pcf_cross_industry)&or=(process_name.ilike.*insider*,process_name.ilike.*security incident*,process_name.ilike.*monitor*security*,process_name.ilike.*manage*security*,process_name.ilike.*investigate*)&select=id,process_code,process_name,hierarchy_level&order=hierarchy_level.asc&limit=20");
  console.log("  candidate PCF nodes:", JSON.stringify(pcf));
  // We will pick a node in code below if a clean match exists; otherwise process_raci is deferred (b2).
  if (pcf.length > 0) {
    // prefer a security-monitoring / incident node
    const pick = pcf.find(p => /security incident|insider|monitor.*security|manage.*security/i.test(String(p.process_name))) ?? pcf[0];
    const PID = Number(pick.id);
    console.log(`  using PCF process id=${PID} (${pick.process_name})`);
    const raci: Row[] = [
      { process_id: PID, actor_role_id: roleMap.get("SECURITY-INSIDER-THREAT-INVESTIGATOR")!, raci: "responsible", consultation_blocking: false },
      { process_id: PID, actor_role_id: roleMap.get("SECURITY-INSIDER-RISK-MANAGER")!, raci: "accountable", consultation_blocking: false },
      { process_id: PID, actor_role_id: roleMap.get("SECURITY-INSIDER-RISK-ANALYST")!, raci: "consulted", consultation_blocking: false },
    ];
    await syncJunction(
      "/process_raci",
      raci,
      r => `${r.process_id}|${r.actor_role_id}|${r.raci}`,
      "process_id,actor_role_id,raci",
    );
  } else {
    console.log("  no fitting PCF node found; process_raci deferred (b2).");
  }

  console.log("\n== SUMMARY ==");
  for (const t of ["domains", "capabilities", "domain_modules", "data_objects"]) {
    // best-effort scoped counts done in verify step separately
  }
  console.log(`domain_id=${DID} MONITOR=${MID_MONITOR} CASE=${MID_CASE}`);
  console.log("UI: https://adenin.semantius.app/domain_map/domains");
}

main().catch(e => { console.error(e); process.exit(1); });
