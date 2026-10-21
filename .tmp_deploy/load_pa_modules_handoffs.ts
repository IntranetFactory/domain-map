/**
 * Load People Analytics (PA, domain_id 63) modules + handoffs.
 *
 * Phases:
 *   1. Create 4 domain_modules (PA-WORKFORCE-METRICS, PA-ENGAGEMENT-SURVEYS,
 *      PA-PREDICTIVE-MODELS, PA-DEI-ANALYTICS).
 *   2. Author domain_module_capabilities (one per capability, 4 rows).
 *   3. Author domain_module_data_objects from existing PA domain_data_objects.
 *   4. Author domain_starter_modules (3 rows).
 *   5. Author 6 new trigger_events on PA masters.
 *   6. Author B9 outbound handoffs (PA -> downstream HR cluster).
 *   7. Author B9b intra-domain cross-module handoffs.
 *   8. Backfill B10b: PATCH source_domain_module_id on existing 7 outbound rows.
 *
 * All inserts idempotent by natural key. Re-running is a no-op.
 * record_status omitted -> DB default 'new'.
 *
 * Run from project root: bun run "c:/dev/domain-map/.tmp_deploy/load_pa_modules_handoffs.ts"
 */

const PA_DOMAIN_ID = 63;

// Capability ids (resolved live, but pinned from audit for clarity)
const CAP = {
  "HR-METRICS": 50,
  "ATTRITION-PREDICT": 51,
  "DEI-ANALYTICS": 52,
  "WORKFORCE-COMP": 53,
} as const;

// Data object ids referenced
const DO = {
  attrition_forecasts: 42,
  people_kpis: 43,
  workforce_segments: 44,
  engagement_surveys: 45,
  predictive_models: 46,
  employees: 31,
  employment_events: 36,
  hcm_positions: 32,
  org_units: 34,
  absence_requests: 163,
  time_entries: 162,
  pay_slips: 139,
  compensation_plans: 153,
  merit_recommendations: 156,
  benefit_enrollments: 147,
  engagement_drivers: 183,
  survey_responses: 182,
  performance_reviews: 174,
  learning_records: 170,
  course_enrollments: 169,
  workforce_plans: 23,
} as const;

// Downstream domain ids
const DOM = {
  HCM: 54,
  PAYROLL: 55,
  ATS: 56,
  LMS: 57,
  TALENT_MGMT: 58,
  COMP_MGMT: 60,
  EMP_EXP: 62,
  EPM: 66,
  HRSD: 22,
  SWP: 100,
} as const;

interface Resp { ok: boolean; data: any; status: number; raw: string; }

async function postgrest(method: string, path: string, body?: any): Promise<Resp> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" }
  );
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    return { ok: false, data: null, status: code, raw: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  try {
    return { ok: true, data: text ? JSON.parse(text) : null, status: 0, raw: text };
  } catch {
    return { ok: true, data: text, status: 0, raw: text };
  }
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.raw}`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  if (Array.isArray(body) && body.length === 0) return [];
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.raw}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.raw}`);
  return r.data;
}

// Pre-flight: forbid em-dash anywhere in payload strings.
function checkNoEmDash(label: string, obj: any) {
  const json = JSON.stringify(obj);
  if (json.includes("—")) {
    throw new Error(`em-dash found in ${label}: ${json}`);
  }
}

async function main() {
  console.log("PA modules + handoffs loader");
  console.log("============================\n");

  // ---- Phase 1: domain_modules ----
  console.log("Phase 1: domain_modules");
  const moduleSpecs = [
    {
      domain_module_code: "PA-WORKFORCE-METRICS",
      domain_module_name: "Workforce Metrics",
      description: "Headcount, attrition snapshots, span-of-control, workforce composition, and people-KPI scorecards. Masters people_kpis and workforce_segments. Entry-point module for People Analytics deployments.",
    },
    {
      domain_module_code: "PA-ENGAGEMENT-SURVEYS",
      domain_module_name: "Engagement Surveys",
      description: "Pulse and engagement-survey campaigns, driver-score computation, sentiment aggregation. Masters engagement_surveys; consumes survey_responses from EMP-EXP.",
    },
    {
      domain_module_code: "PA-PREDICTIVE-MODELS",
      domain_module_name: "Predictive Models",
      description: "Attrition-risk, flight-risk, succession-readiness, hire-success ML models. Masters attrition_forecasts and predictive_models; emits scored populations to TALENT-MGMT, HCM, and SWP.",
    },
    {
      domain_module_code: "PA-DEI-ANALYTICS",
      domain_module_name: "DEI Analytics",
      description: "Representation analytics, pay-equity analysis, DEI dashboards, skill-gap signaling. No native master entities (computes over HCM, COMP-MGMT, and PA-WORKFORCE-METRICS data).",
    },
  ];
  for (const s of moduleSpecs) checkNoEmDash(`module ${s.domain_module_code}`, s);
  const existingModules: { id: number; domain_module_code: string }[] = await get(
    `/domain_modules?domain_id=eq.${PA_DOMAIN_ID}&select=id,domain_module_code`
  );
  const moduleByCode = new Map<string, number>(
    existingModules.map(m => [m.domain_module_code, m.id])
  );
  const toCreate = moduleSpecs
    .filter(s => !moduleByCode.has(s.domain_module_code))
    .map(s => ({ ...s, domain_id: PA_DOMAIN_ID }));
  if (toCreate.length > 0) {
    const created = await post("/domain_modules", toCreate);
    for (const m of created) moduleByCode.set(m.domain_module_code, m.id);
    console.log(`  created ${created.length} modules`);
  } else {
    console.log(`  all 4 already present`);
  }
  for (const s of moduleSpecs) {
    const id = moduleByCode.get(s.domain_module_code);
    console.log(`    ${s.domain_module_code} = ${id}`);
  }

  const M_WORKFORCE = moduleByCode.get("PA-WORKFORCE-METRICS")!;
  const M_ENGAGEMENT = moduleByCode.get("PA-ENGAGEMENT-SURVEYS")!;
  const M_PREDICTIVE = moduleByCode.get("PA-PREDICTIVE-MODELS")!;
  const M_DEI = moduleByCode.get("PA-DEI-ANALYTICS")!;

  // ---- Phase 2: domain_module_capabilities ----
  console.log("\nPhase 2: domain_module_capabilities");
  const capSpecs = [
    { domain_module_id: M_WORKFORCE, capability_id: CAP["WORKFORCE-COMP"], notes: "Workforce composition is the module's main lens." },
    { domain_module_id: M_WORKFORCE, capability_id: CAP["HR-METRICS"], notes: "People-KPI scorecards live here." },
    { domain_module_id: M_ENGAGEMENT, capability_id: CAP["HR-METRICS"], notes: "Engagement metrics roll up into the people-KPI scorecard." },
    { domain_module_id: M_PREDICTIVE, capability_id: CAP["ATTRITION-PREDICT"], notes: "Attrition-prediction models." },
    { domain_module_id: M_DEI, capability_id: CAP["DEI-ANALYTICS"], notes: "Representation, pay-equity, DEI dashboards." },
  ];
  const existingCaps: { domain_module_id: number; capability_id: number }[] = await get(
    `/domain_module_capabilities?domain_module_id=in.(${[M_WORKFORCE, M_ENGAGEMENT, M_PREDICTIVE, M_DEI].join(",")})&select=domain_module_id,capability_id`
  );
  const capKey = (m: number, c: number) => `${m}:${c}`;
  const existingCapSet = new Set(existingCaps.map(r => capKey(r.domain_module_id, r.capability_id)));
  const newCaps = capSpecs.filter(s => !existingCapSet.has(capKey(s.domain_module_id, s.capability_id)));
  for (const s of newCaps) checkNoEmDash("capability", s);
  if (newCaps.length > 0) {
    await post("/domain_module_capabilities", newCaps);
    console.log(`  inserted ${newCaps.length} capability links`);
  } else {
    console.log(`  all capability links present`);
  }

  // ---- Phase 3: domain_module_data_objects ----
  console.log("\nPhase 3: domain_module_data_objects");
  const dmdoSpecs = [
    // PA-WORKFORCE-METRICS
    { domain_module_id: M_WORKFORCE, data_object_id: DO.people_kpis, role: "master", necessity: "required" },
    { domain_module_id: M_WORKFORCE, data_object_id: DO.workforce_segments, role: "master", necessity: "required" },
    { domain_module_id: M_WORKFORCE, data_object_id: DO.employees, role: "derived", necessity: "required" },
    { domain_module_id: M_WORKFORCE, data_object_id: DO.employment_events, role: "derived", necessity: "required" },
    { domain_module_id: M_WORKFORCE, data_object_id: DO.hcm_positions, role: "consumer", necessity: "required" },
    { domain_module_id: M_WORKFORCE, data_object_id: DO.org_units, role: "consumer", necessity: "required" },
    { domain_module_id: M_WORKFORCE, data_object_id: DO.absence_requests, role: "derived", necessity: "required" },
    { domain_module_id: M_WORKFORCE, data_object_id: DO.time_entries, role: "consumer", necessity: "optional" },
    { domain_module_id: M_WORKFORCE, data_object_id: DO.pay_slips, role: "derived", necessity: "required" },
    { domain_module_id: M_WORKFORCE, data_object_id: DO.compensation_plans, role: "consumer", necessity: "optional" },
    { domain_module_id: M_WORKFORCE, data_object_id: DO.merit_recommendations, role: "consumer", necessity: "optional" },
    { domain_module_id: M_WORKFORCE, data_object_id: DO.benefit_enrollments, role: "consumer", necessity: "optional" },
    // PA-ENGAGEMENT-SURVEYS
    { domain_module_id: M_ENGAGEMENT, data_object_id: DO.engagement_surveys, role: "master", necessity: "required" },
    { domain_module_id: M_ENGAGEMENT, data_object_id: DO.engagement_drivers, role: "derived", necessity: "required" },
    { domain_module_id: M_ENGAGEMENT, data_object_id: DO.survey_responses, role: "consumer", necessity: "required" },
    { domain_module_id: M_ENGAGEMENT, data_object_id: DO.employees, role: "derived", necessity: "required" },
    // PA-PREDICTIVE-MODELS
    { domain_module_id: M_PREDICTIVE, data_object_id: DO.attrition_forecasts, role: "master", necessity: "required" },
    { domain_module_id: M_PREDICTIVE, data_object_id: DO.predictive_models, role: "master", necessity: "required" },
    { domain_module_id: M_PREDICTIVE, data_object_id: DO.employees, role: "derived", necessity: "required" },
    { domain_module_id: M_PREDICTIVE, data_object_id: DO.employment_events, role: "derived", necessity: "required" },
    { domain_module_id: M_PREDICTIVE, data_object_id: DO.performance_reviews, role: "derived", necessity: "required" },
    { domain_module_id: M_PREDICTIVE, data_object_id: DO.learning_records, role: "derived", necessity: "required" },
    { domain_module_id: M_PREDICTIVE, data_object_id: DO.course_enrollments, role: "consumer", necessity: "optional" },
    { domain_module_id: M_PREDICTIVE, data_object_id: DO.hcm_positions, role: "consumer", necessity: "required" },
    { domain_module_id: M_PREDICTIVE, data_object_id: DO.org_units, role: "consumer", necessity: "required" },
    // PA-DEI-ANALYTICS
    { domain_module_id: M_DEI, data_object_id: DO.employees, role: "derived", necessity: "required" },
    { domain_module_id: M_DEI, data_object_id: DO.compensation_plans, role: "consumer", necessity: "optional" },
    { domain_module_id: M_DEI, data_object_id: DO.hcm_positions, role: "consumer", necessity: "required" },
    { domain_module_id: M_DEI, data_object_id: DO.org_units, role: "consumer", necessity: "required" },
    { domain_module_id: M_DEI, data_object_id: DO.merit_recommendations, role: "consumer", necessity: "optional" },
  ];
  const existingDmdo: { domain_module_id: number; data_object_id: number }[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${[M_WORKFORCE, M_ENGAGEMENT, M_PREDICTIVE, M_DEI].join(",")})&select=domain_module_id,data_object_id`
  );
  const dmdoKey = (m: number, d: number) => `${m}:${d}`;
  const existingDmdoSet = new Set(existingDmdo.map(r => dmdoKey(r.domain_module_id, r.data_object_id)));
  const newDmdo = dmdoSpecs.filter(s => !existingDmdoSet.has(dmdoKey(s.domain_module_id, s.data_object_id)));
  const dmdoWithNotes = newDmdo.map(s => ({ ...s, notes: "" }));
  if (dmdoWithNotes.length > 0) {
    // chunk to ≤50
    const CHUNK = 50;
    for (let i = 0; i < dmdoWithNotes.length; i += CHUNK) {
      await post("/domain_module_data_objects", dmdoWithNotes.slice(i, i + CHUNK));
    }
    console.log(`  inserted ${dmdoWithNotes.length} module-data_object rows`);
  } else {
    console.log(`  all ${dmdoSpecs.length} module-data_object rows present`);
  }

  // ---- Phase 4: domain_starter_modules ----
  console.log("\nPhase 4: domain_starter_modules");
  const starterSpecs = [
    { domain_module_id: M_WORKFORCE, position: 1, notes: "Entry point: people-KPI scorecards and workforce composition." },
    { domain_module_id: M_PREDICTIVE, position: 2, notes: "Adds attrition-risk and predictive scoring on top of metrics." },
    { domain_module_id: M_ENGAGEMENT, position: 3, notes: "Adds engagement-survey campaigns and driver-score signaling." },
  ];
  const existingStarters: { domain_module_id: number; position: number }[] = await get(
    `/domain_starter_modules?domain_id=eq.${PA_DOMAIN_ID}&select=domain_module_id,position`
  );
  const existingStarterSet = new Set(existingStarters.map(r => `${r.domain_module_id}:${r.position}`));
  const newStarters = starterSpecs
    .filter(s => !existingStarterSet.has(`${s.domain_module_id}:${s.position}`))
    .map(s => ({ ...s, domain_id: PA_DOMAIN_ID }));
  if (newStarters.length > 0) {
    await post("/domain_starter_modules", newStarters);
    console.log(`  inserted ${newStarters.length} starter rows`);
  } else {
    console.log(`  all 3 starter rows present`);
  }

  // ---- Phase 5: trigger_events ----
  console.log("\nPhase 5: trigger_events");
  const newEventSpecs: {
    event_name: string;
    data_object_id: number;
    event_category: string;
    to_state: string;
    from_state: string;
    description: string;
  }[] = [
    {
      event_name: "people_kpi.snapshot_published",
      data_object_id: DO.people_kpis,
      event_category: "lifecycle",
      to_state: "",
      from_state: "",
      description: "People-KPI snapshot computed and published for the reporting period. HCM and EPM consumers refresh scorecards and workforce-cost forecasts.",
    },
    {
      event_name: "workforce_segment.composition_changed",
      data_object_id: DO.workforce_segments,
      event_category: "state_change",
      to_state: "",
      from_state: "",
      description: "Workforce-segment composition crossed a meaningful threshold (representation, span-of-control, attrition). Downstream DEI and HCM dashboards re-render; SWP recalibrates plan assumptions.",
    },
    {
      event_name: "attrition_risk.elevated",
      data_object_id: DO.attrition_forecasts,
      event_category: "threshold",
      to_state: "",
      from_state: "",
      description: "Aggregate attrition-risk score for a segment elevated past threshold. Signals TALENT-MGMT, HCM, and HRSD to act on retention motion.",
    },
    {
      event_name: "engagement.declining",
      data_object_id: DO.engagement_surveys,
      event_category: "signal",
      to_state: "",
      from_state: "",
      description: "Engagement driver score declined materially vs the prior cycle. EMP-EXP and TALENT-MGMT triage; HRSD may open a manager-outreach case.",
    },
    {
      event_name: "pay_equity.gap_detected",
      data_object_id: DO.workforce_segments,
      event_category: "threshold",
      to_state: "",
      from_state: "",
      description: "Pay-equity analysis surfaced a statistically meaningful gap for a workforce segment. COMP-MGMT reviews and may launch a structured remediation cycle.",
    },
    {
      event_name: "skill_gap.identified",
      data_object_id: DO.workforce_segments,
      event_category: "signal",
      to_state: "",
      from_state: "",
      description: "DEI / workforce analysis identified a skill gap in a segment. LMS curates targeted learning paths.",
    },
  ];
  for (const e of newEventSpecs) checkNoEmDash(`event ${e.event_name}`, e);
  const existingEvents: { id: number; event_name: string }[] = await get(
    `/trigger_events?event_name=in.(${newEventSpecs.map(e => e.event_name).join(",")})&select=id,event_name`
  );
  const eventByName = new Map<string, number>(existingEvents.map(e => [e.event_name, e.id]));
  // Also fetch the already-existing PA events we'll reference downstream
  const refEvents: { id: number; event_name: string }[] = await get(
    `/trigger_events?event_name=in.(attrition_forecast.published,engagement_survey.closed,predictive_model.deployed,high_potential.identified)&select=id,event_name`
  );
  for (const e of refEvents) eventByName.set(e.event_name, e.id);

  const eventsToCreate = newEventSpecs.filter(e => !eventByName.has(e.event_name));
  if (eventsToCreate.length > 0) {
    const created = await post("/trigger_events", eventsToCreate);
    for (const e of created) eventByName.set(e.event_name, e.id);
    console.log(`  created ${created.length} trigger_events`);
  } else {
    console.log(`  all ${newEventSpecs.length} trigger_events present`);
  }

  // ---- Phase 6 + 7: handoffs (new B9 outbound + B9b intra-domain) ----
  console.log("\nPhase 6+7: handoffs (B9 outbound + B9b intra-domain)");

  type HandoffSpec = {
    source_domain_id: number;
    target_domain_id: number;
    data_object_id: number;
    trigger_event_id: number;
    integration_pattern: string;
    friction_level: string;
    source_domain_module_id: number | null;
    target_domain_module_id: number | null;
    description: string;
    notes: string;
  };
  const newHandoffs: HandoffSpec[] = [
    // B9 outbound (new)
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: DOM.HCM,
      data_object_id: DO.people_kpis,
      trigger_event_id: eventByName.get("people_kpi.snapshot_published")!,
      integration_pattern: "batch_sync", friction_level: "low",
      source_domain_module_id: M_WORKFORCE, target_domain_module_id: null,
      description: "Refreshed people-KPI snapshot lands; HCM dashboards and workforce scorecards re-render against the new period.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: DOM.EPM,
      data_object_id: DO.people_kpis,
      trigger_event_id: eventByName.get("people_kpi.snapshot_published")!,
      integration_pattern: "batch_sync", friction_level: "medium",
      source_domain_module_id: M_WORKFORCE, target_domain_module_id: null,
      description: "EPM consumes people-KPI deltas (headcount, attrition, comp ratios) to refine workforce-cost and plan forecasts.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: DOM.COMP_MGMT,
      data_object_id: DO.workforce_segments,
      trigger_event_id: eventByName.get("pay_equity.gap_detected")!,
      integration_pattern: "api_call", friction_level: "medium",
      source_domain_module_id: M_DEI, target_domain_module_id: null,
      description: "DEI analysis surfaces a pay-equity gap for a segment. COMP-MGMT triggers structured review and remediation.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: DOM.LMS,
      data_object_id: DO.workforce_segments,
      trigger_event_id: eventByName.get("skill_gap.identified")!,
      integration_pattern: "api_call", friction_level: "medium",
      source_domain_module_id: M_DEI, target_domain_module_id: null,
      description: "Workforce skill-gap signal; LMS curates targeted learning paths and assigns to the at-risk segment.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: DOM.EMP_EXP,
      data_object_id: DO.engagement_surveys,
      trigger_event_id: eventByName.get("engagement.declining")!,
      integration_pattern: "event_stream", friction_level: "low",
      source_domain_module_id: M_ENGAGEMENT, target_domain_module_id: null,
      description: "Engagement decline detected; EMP-EXP launches an action plan against the affected population.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: DOM.TALENT_MGMT,
      data_object_id: DO.engagement_surveys,
      trigger_event_id: eventByName.get("engagement.declining")!,
      integration_pattern: "event_stream", friction_level: "medium",
      source_domain_module_id: M_ENGAGEMENT, target_domain_module_id: null,
      description: "Engagement decline forwards to retention motion: TALENT-MGMT flags at-risk high-performers for manager intervention.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: DOM.HRSD,
      data_object_id: DO.engagement_surveys,
      trigger_event_id: eventByName.get("engagement.declining")!,
      integration_pattern: "api_call", friction_level: "medium",
      source_domain_module_id: M_ENGAGEMENT, target_domain_module_id: null,
      description: "Sustained low-engagement signal opens an HR case for manager outreach and follow-up.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: DOM.TALENT_MGMT,
      data_object_id: DO.attrition_forecasts,
      trigger_event_id: eventByName.get("attrition_risk.elevated")!,
      integration_pattern: "event_stream", friction_level: "high",
      source_domain_module_id: M_PREDICTIVE, target_domain_module_id: null,
      description: "Attrition-risk elevation for high-value population; TALENT-MGMT prioritizes retention motion. High friction because scoring methodology and trigger thresholds are bespoke and require recalibration.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: DOM.HCM,
      data_object_id: DO.attrition_forecasts,
      trigger_event_id: eventByName.get("attrition_risk.elevated")!,
      integration_pattern: "event_stream", friction_level: "medium",
      source_domain_module_id: M_PREDICTIVE, target_domain_module_id: null,
      description: "Attrition-risk elevation flagged in HCM workforce dashboards for HRBPs.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: DOM.SWP,
      data_object_id: DO.workforce_segments,
      trigger_event_id: eventByName.get("workforce_segment.composition_changed")!,
      integration_pattern: "batch_sync", friction_level: "medium",
      source_domain_module_id: M_WORKFORCE, target_domain_module_id: null,
      description: "Segment-composition shift updates SWP plan assumptions on demand, supply, and natural reduction.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: DOM.TALENT_MGMT,
      data_object_id: DO.predictive_models,
      trigger_event_id: eventByName.get("predictive_model.deployed")!,
      integration_pattern: "api_call", friction_level: "low",
      source_domain_module_id: M_PREDICTIVE, target_domain_module_id: null,
      description: "A new predictive model (flight-risk, performance, succession) is deployed; downstream consumers re-bind scoring endpoints.",
      notes: "",
    },
    // B9b intra-domain
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: PA_DOMAIN_ID,
      data_object_id: DO.engagement_surveys,
      trigger_event_id: eventByName.get("engagement_survey.closed")!,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      source_domain_module_id: M_ENGAGEMENT, target_domain_module_id: M_PREDICTIVE,
      description: "Closed engagement cycle drops driver scores into the predictive-model feature store for retraining.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: PA_DOMAIN_ID,
      data_object_id: DO.people_kpis,
      trigger_event_id: eventByName.get("people_kpi.snapshot_published")!,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      source_domain_module_id: M_WORKFORCE, target_domain_module_id: M_DEI,
      description: "Fresh people-KPI snapshot feeds DEI dashboards (representation, pay-equity inputs).",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: PA_DOMAIN_ID,
      data_object_id: DO.workforce_segments,
      trigger_event_id: eventByName.get("workforce_segment.composition_changed")!,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      source_domain_module_id: M_WORKFORCE, target_domain_module_id: M_PREDICTIVE,
      description: "Segment-composition shifts inform attrition-risk model recalibration on the next training cycle.",
      notes: "",
    },
    {
      source_domain_id: PA_DOMAIN_ID, target_domain_id: PA_DOMAIN_ID,
      data_object_id: DO.attrition_forecasts,
      trigger_event_id: eventByName.get("attrition_forecast.published")!,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      source_domain_module_id: M_PREDICTIVE, target_domain_module_id: M_WORKFORCE,
      description: "Forecasts surface in the workforce-metrics dashboard layer alongside actuals.",
      notes: "",
    },
  ];
  for (const h of newHandoffs) checkNoEmDash(`handoff ${h.trigger_event_id}`, h);

  // Idempotency: 4-tuple (source, target, data_object, trigger_event)
  const allOutbound: { id: number; source_domain_id: number; target_domain_id: number; data_object_id: number; trigger_event_id: number }[] = await get(
    `/handoffs?source_domain_id=eq.${PA_DOMAIN_ID}&select=id,source_domain_id,target_domain_id,data_object_id,trigger_event_id`
  );
  const hkey = (s: number, t: number, d: number, e: number) => `${s}|${t}|${d}|${e}`;
  const existingHandoffKeys = new Set(
    allOutbound.map(r => hkey(r.source_domain_id, r.target_domain_id, r.data_object_id, r.trigger_event_id))
  );
  const handoffsToInsert = newHandoffs.filter(h =>
    !existingHandoffKeys.has(hkey(h.source_domain_id, h.target_domain_id, h.data_object_id, h.trigger_event_id))
  );
  if (handoffsToInsert.length > 0) {
    const CHUNK = 50;
    for (let i = 0; i < handoffsToInsert.length; i += CHUNK) {
      await post("/handoffs", handoffsToInsert.slice(i, i + CHUNK));
    }
    console.log(`  inserted ${handoffsToInsert.length} handoffs (${newHandoffs.length - handoffsToInsert.length} were already present)`);
  } else {
    console.log(`  all ${newHandoffs.length} handoffs already present`);
  }

  // ---- Phase 8: B10b backfill on existing PA outbound rows ----
  console.log("\nPhase 8: B10b backfill source_domain_module_id on existing PA outbound rows");
  // Refetch (so we don't patch rows we just inserted; they already have module ids)
  const allOutboundFresh: { id: number; trigger_event_id: number; data_object_id: number; source_domain_module_id: number | null; trigger_events?: { event_name: string; data_object_id: number } }[] = await get(
    `/handoffs?source_domain_id=eq.${PA_DOMAIN_ID}&source_domain_module_id=is.null&select=id,trigger_event_id,data_object_id,source_domain_module_id,trigger_events(event_name,data_object_id)`
  );
  console.log(`  ${allOutboundFresh.length} rows missing source_domain_module_id`);

  // Derive per the audit document. Rules:
  //   - event publishes data_object 42 (attrition_forecasts) -> PA-PREDICTIVE-MODELS
  //   - event publishes data_object 44 (workforce_segments) -> PA-WORKFORCE-METRICS
  //   - event publishes data_object 46 (predictive_models) -> PA-PREDICTIVE-MODELS
  //   - event publishes data_object 31 (employees) -> PA-PREDICTIVE-MODELS (analytic tiebreak on attrition_risk.high)
  //   - event publishes data_object 23 (workforce_plans) -> PA-PREDICTIVE-MODELS (attrition forecast analytic context)
  function derive(eventDoId: number, payloadDoId: number, eventName: string): { id: number | null; note: string } {
    if (eventDoId === DO.attrition_forecasts) return { id: M_PREDICTIVE, note: "trigger_event publishes attrition_forecasts (master in PA-PREDICTIVE-MODELS)" };
    if (eventDoId === DO.workforce_segments) return { id: M_WORKFORCE, note: "trigger_event publishes workforce_segments (master in PA-WORKFORCE-METRICS)" };
    if (eventDoId === DO.predictive_models) return { id: M_PREDICTIVE, note: "trigger_event publishes predictive_models (master in PA-PREDICTIVE-MODELS)" };
    if (eventDoId === DO.people_kpis) return { id: M_WORKFORCE, note: "trigger_event publishes people_kpis (master in PA-WORKFORCE-METRICS)" };
    if (eventDoId === DO.engagement_surveys) return { id: M_ENGAGEMENT, note: "trigger_event publishes engagement_surveys (master in PA-ENGAGEMENT-SURVEYS)" };
    if (eventDoId === DO.employees) return { id: M_PREDICTIVE, note: "employees not mastered in PA; analytic context of event '" + eventName + "' attributes to PA-PREDICTIVE-MODELS" };
    if (eventDoId === DO.workforce_plans) return { id: M_PREDICTIVE, note: "workforce_plans not mastered in PA; analytic context of event '" + eventName + "' (attrition forecast) attributes to PA-PREDICTIVE-MODELS" };
    return { id: null, note: "no derivation rule for event data_object " + eventDoId };
  }

  let patched = 0;
  let leftNull = 0;
  for (const r of allOutboundFresh) {
    const evDo = r.trigger_events?.data_object_id ?? 0;
    const decision = derive(evDo, r.data_object_id, r.trigger_events?.event_name ?? "?");
    if (decision.id === null) {
      console.log(`  handoff ${r.id} (${r.trigger_events?.event_name}): LEFT NULL - ${decision.note}`);
      await patch(`/handoffs?id=eq.${r.id}`, { notes: decision.note });
      leftNull++;
    } else {
      await patch(`/handoffs?id=eq.${r.id}`, {
        source_domain_module_id: decision.id,
        notes: decision.note,
      });
      patched++;
    }
  }
  console.log(`  patched ${patched} rows, left ${leftNull} null with notes`);

  // ---- Post-load verification ----
  console.log("\nPost-load verification:");
  const finalModules = await get(`/domain_modules?domain_id=eq.${PA_DOMAIN_ID}&select=id,domain_module_code`);
  const finalStarters = await get(`/domain_starter_modules?domain_id=eq.${PA_DOMAIN_ID}&select=id`);
  const finalDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${[M_WORKFORCE, M_ENGAGEMENT, M_PREDICTIVE, M_DEI].join(",")})&select=id`);
  const finalCaps = await get(`/domain_module_capabilities?domain_module_id=in.(${[M_WORKFORCE, M_ENGAGEMENT, M_PREDICTIVE, M_DEI].join(",")})&select=id`);
  const finalOutbound = await get(`/handoffs?source_domain_id=eq.${PA_DOMAIN_ID}&select=id,source_domain_module_id,target_domain_id`);
  const finalEvents = await get(`/trigger_events?data_object_id=in.(${[DO.attrition_forecasts, DO.people_kpis, DO.workforce_segments, DO.engagement_surveys, DO.predictive_models].join(",")})&select=id,event_name`);
  console.log(`  domain_modules                    : ${finalModules.length}`);
  console.log(`  domain_module_capabilities        : ${finalCaps.length}`);
  console.log(`  domain_module_data_objects        : ${finalDmdo.length}`);
  console.log(`  domain_starter_modules            : ${finalStarters.length}`);
  console.log(`  trigger_events on PA masters      : ${finalEvents.length}`);
  console.log(`  total outbound handoffs           : ${finalOutbound.length}`);
  const stillNull = finalOutbound.filter((r: any) => r.source_domain_module_id === null).length;
  const intraDomain = finalOutbound.filter((r: any) => r.target_domain_id === PA_DOMAIN_ID).length;
  console.log(`    intra-domain (B9b)              : ${intraDomain}`);
  console.log(`    null source_domain_module_id    : ${stillNull}`);

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/domain_starter_modules");

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
