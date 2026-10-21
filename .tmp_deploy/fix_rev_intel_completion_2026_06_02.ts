#!/usr/bin/env bun
// REV-INTEL completion pass (2026-06-02).
//
// The domain was built out (5 modules, ~16 masters, 5 system skills) since the audit
// files were written, but five gaps remained. This loader closes them, all idempotent:
//   Fix 1  A4  — domain catalog UX (PATCH only if empty; Rule #20)
//   Fix 2  M8  — 5 module catalog UX (PATCH only if empty; Rule #20)
//   Fix 3  B9  — analytics-side trigger events + re-anchor events 167/168 onto deal_risk_scores
//   Fix 4  B9b — 4 intra-domain cross-module handoffs
//   Fix 5  E   — 4 personas + role_modules reach + process_id wiring + process_raci
//   Fix 6  B2-C1 — Revenue Operations business_function + contributor row on REV-INTEL
//
// record_status omitted everywhere -> DB default 'new' (Rule #1). notes left empty (Rule #15).

import {} from "bun";

type Row = Record<string, unknown>;

const DOMAIN_ID = 103;
const MOD = {
  CONVERSATION: 186,
  DEAL_INTEL: 187,
  FORECAST: 188,
  COACHING: 189,
  ACTIVITY_CAPTURE: 190,
} as const;
const BF = { SALES: 21, SALES_OPS: 52, LND: 11 } as const;
const PCF = { GENERATE_FORECAST: 687, MANAGE_PIPELINE: 712 } as const;

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
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

// ───────────────────────────────────────────────────────────
// Fix 1 — A4 domain catalog UX
// ───────────────────────────────────────────────────────────
const DOMAIN_TAGLINE =
  "See every deal the way your best rep would. AI-driven pipeline analysis, deal scoring, and revenue forecasts from your team's calls, emails, and CRM activity.";
const DOMAIN_DESCRIPTION = [
  "Revenue Intelligence reads the signals your sales team generates every day, calls, emails, meetings, opportunity updates, and turns them into deal-level risk scores and an accurate roll-up forecast. Instead of reps hand-rolling pipeline reports, the system tells managers which deals are slipping, which are progressing on schedule, and where coaching attention pays off.",
  "Conversation intelligence transcribes and tags every recorded call, surfacing competitor mentions, pricing objections, and next-step commitments. Auto-activity-capture removes the data-entry tax on reps and keeps the CRM clean. Coaching workflows close the loop, replaying calls against your playbook so enablement can spot patterns across the team.",
  "Built for sales managers, RevOps, and enablement, sitting alongside your CRM rather than replacing it. Forecast accuracy is the headline metric; deal-coverage ratios and rep ramp velocity follow.",
].join("\n\n");

async function fix1_domainCatalogUX() {
  console.log("\n=== Fix 1 — A4 domain catalog UX ===");
  const [d] = await get(`/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`);
  if (d && (String(d.catalog_tagline) !== "" || String(d.catalog_description) !== "")) {
    console.log("  domain catalog UX already populated; skipping (Rule #20 no-overwrite).");
    return;
  }
  await patch(`/domains?id=eq.${DOMAIN_ID}`, {
    catalog_tagline: DOMAIN_TAGLINE,
    catalog_description: DOMAIN_DESCRIPTION,
  });
  console.log("  PATCHed domain 103 catalog_tagline + catalog_description.");
}

// ───────────────────────────────────────────────────────────
// Fix 2 — M8 module catalog UX
// ───────────────────────────────────────────────────────────
const MODULE_UX: Record<number, { tagline: string; description: string }> = {
  [MOD.CONVERSATION]: {
    tagline:
      "Turn every recorded call into searchable insight: topics, competitor mentions, objections, and follow-ups, captured automatically.",
    description:
      "Conversation Intelligence transcribes and analyzes your team's calls and meetings, surfacing what was discussed: pricing pushback, competitor names, next-step commitments, and risk signals. Reps stop taking notes and managers stop guessing what happened on a call. Extracted topics and action items flow straight into deal scoring and coaching, so the signal in every conversation reaches the people who need it.",
  },
  [MOD.DEAL_INTEL]: {
    tagline:
      "Know which deals will close and which are slipping, with an AI risk score and named warnings on every opportunity.",
    description:
      "Deal Intelligence scores each open opportunity for risk using the activity, conversation, and CRM signals your team already generates, then flags the specific problems behind a low score: no decision-maker, no next step, single-threaded. Managers inspect the pipeline by risk instead of by gut feel, and reps see exactly what to fix on each deal before the forecast call.",
  },
  [MOD.FORECAST]: {
    tagline:
      "Submit, roll up, and stress-test your revenue forecast, with accuracy tracked every period so the number gets better over time.",
    description:
      "Forecasting replaces the spreadsheet scramble with a structured submission and roll-up cycle. Reps submit their call, managers adjust and lock the team number, and an AI-generated baseline gives leadership a second opinion. Every period's submitted forecast is measured against actuals, so forecast accuracy is a metric you manage, not a mystery.",
  },
  [MOD.COACHING]: {
    tagline:
      "Coach reps on real calls: replay the conversation, score it against your playbook, and track improvement over time.",
    description:
      "Coaching turns recorded calls into a structured development loop. Managers and enablement run 1-on-1 sessions anchored to a specific call, score it against a rubric, and leave timestamped comments reps can revisit. Patterns across the team surface what to train next, closing the loop between what happens on calls and how the team improves.",
  },
  [MOD.ACTIVITY_CAPTURE]: {
    tagline:
      "Capture every email, call, and meeting automatically and attach it to the right deal, no manual CRM entry required.",
    description:
      "Activity Capture removes the data-entry tax on reps by automatically logging emails, calls, and meetings and attributing them to the right opportunity and account. The result is a clean, complete activity record that powers deal scoring, engagement metrics, and forecasting, without anyone updating the CRM by hand.",
  },
};

async function fix2_moduleCatalogUX() {
  console.log("\n=== Fix 2 — M8 module catalog UX ===");
  const mods = await get(
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  for (const m of mods) {
    const id = Number(m.id);
    const spec = MODULE_UX[id];
    if (!spec) continue;
    if (String(m.catalog_tagline) !== "" || String(m.catalog_description) !== "") {
      console.log(`  ${m.domain_module_code}: already populated; skipping (Rule #20).`);
      continue;
    }
    await patch(`/domain_modules?id=eq.${id}`, {
      catalog_tagline: spec.tagline,
      catalog_description: spec.description,
    });
    console.log(`  ${m.domain_module_code}: PATCHed catalog UX.`);
  }
}

// ───────────────────────────────────────────────────────────
// Fix 3 — B9 trigger events (re-anchor + new)
// ───────────────────────────────────────────────────────────
const NEW_EVENTS: { event_name: string; data_object_id: number; event_category: string; to_state: string; description: string }[] = [
  { event_name: "deal_risk_score.changed", data_object_id: 1008, event_category: "signal", to_state: "", description: "A deal's AI-derived risk score has been recalculated after new activity, conversation, or CRM signal. Forecast and pipeline-inspection surfaces re-read the score." },
  { event_name: "revenue_forecast.recalculated", data_object_id: 1010, event_category: "signal", to_state: "", description: "The rolled-up revenue forecast has been recomputed from updated submissions, adjustments, and deal-risk inputs." },
  { event_name: "forecast_submission.submitted", data_object_id: 1011, event_category: "state_change", to_state: "submitted", description: "A rep has submitted their forecast for the period; the submission enters the manager roll-up." },
  { event_name: "forecast_submission.locked", data_object_id: 1011, event_category: "state_change", to_state: "locked", description: "A manager has locked the period's forecast submission; no further edits are accepted for that cycle." },
  { event_name: "deal_warning.acknowledged", data_object_id: 1009, event_category: "state_change", to_state: "acknowledged", description: "A rep or manager has acknowledged a named deal warning, accepting the flagged risk pattern for follow-up." },
  { event_name: "deal_warning.cleared", data_object_id: 1009, event_category: "state_change", to_state: "cleared", description: "A deal warning has been resolved or no longer applies and is cleared from the opportunity." },
  { event_name: "coaching_session.completed", data_object_id: 1014, event_category: "lifecycle", to_state: "completed", description: "A 1-on-1 coaching session anchored to a recorded call has been completed and scored." },
  { event_name: "conversation_action_item.done", data_object_id: 1006, event_category: "lifecycle", to_state: "done", description: "An action item extracted from a conversation has been completed by its owner." },
  { event_name: "captured_activity.captured", data_object_id: 1017, event_category: "lifecycle", to_state: "", description: "An email, call, or meeting has been auto-captured and attributed to an opportunity or account." },
];

async function fix3_triggerEvents(): Promise<Map<string, number>> {
  console.log("\n=== Fix 3 — B9 trigger events ===");
  // Re-anchor 167 (deal_risk.escalated -> deal_risk_score.escalated on deal_risk_scores)
  const [e167] = await get(`/trigger_events?id=eq.167&select=data_object_id,event_name`);
  if (e167 && Number(e167.data_object_id) === 100) {
    await patch(`/trigger_events?id=eq.167`, { data_object_id: 1008, event_name: "deal_risk_score.escalated" });
    console.log("  167 re-anchored to deal_risk_scores (1008), renamed deal_risk_score.escalated.");
  } else {
    console.log("  167 already re-anchored; skipping.");
  }
  // Re-anchor 168 (pipeline_health.degraded onto deal_risk_scores aggregate)
  const [e168] = await get(`/trigger_events?id=eq.168&select=data_object_id`);
  if (e168 && Number(e168.data_object_id) === 100) {
    await patch(`/trigger_events?id=eq.168`, { data_object_id: 1008 });
    console.log("  168 re-anchored to deal_risk_scores (1008).");
  } else {
    console.log("  168 already re-anchored; skipping.");
  }
  // Insert new events idempotently by event_name.
  const names = NEW_EVENTS.map(e => e.event_name);
  const existing = await get(
    `/trigger_events?event_name=in.(${names.join(",")})&select=event_name`,
  );
  const have = new Set(existing.map(r => String(r.event_name)));
  const toInsert = NEW_EVENTS.filter(e => !have.has(e.event_name)).map(e => ({
    event_name: e.event_name,
    data_object_id: e.data_object_id,
    event_category: e.event_category,
    from_state: "",
    to_state: e.to_state,
    description: e.description,
  }));
  if (toInsert.length) {
    await post("/trigger_events", toInsert);
    console.log(`  inserted ${toInsert.length} new trigger events.`);
  } else {
    console.log("  all new trigger events already present.");
  }
  // Build event_name -> id map (include the re-anchored 469 + new).
  const all = await get(
    `/trigger_events?or=(event_name.in.(${names.join(",")}),event_name.eq.conversation_intelligence.insight_published)&select=id,event_name`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r.event_name), Number(r.id));
  return map;
}

// ───────────────────────────────────────────────────────────
// Fix 4 — B9b intra-domain cross-module handoffs
// ───────────────────────────────────────────────────────────
async function fix4_intraDomainHandoffs(evMap: Map<string, number>) {
  console.log("\n=== Fix 4 — B9b intra-domain handoffs ===");
  const ev = (n: string) => {
    const id = evMap.get(n);
    if (!id) throw new Error(`trigger_event ${n} not found in map`);
    return id;
  };
  const specs = [
    { src: MOD.CONVERSATION, tgt: MOD.DEAL_INTEL, event: "conversation_intelligence.insight_published", payload: 124, description: "Conversation insights published in REV-INTEL-CONVERSATION feed the deal-scoring model in REV-INTEL-DEAL-INTEL, updating risk scores from competitor mentions, objections, and sentiment." },
    { src: MOD.CONVERSATION, tgt: MOD.COACHING, event: "conversation_intelligence.insight_published", payload: 124, description: "Conversation insights published in REV-INTEL-CONVERSATION surface to REV-INTEL-COACHING so coaches can anchor sessions to the calls that matter." },
    { src: MOD.ACTIVITY_CAPTURE, tgt: MOD.DEAL_INTEL, event: "captured_activity.captured", payload: 1017, description: "Auto-captured activities in REV-INTEL-ACTIVITY-CAPTURE feed deal scoring in REV-INTEL-DEAL-INTEL as engagement signal." },
    { src: MOD.DEAL_INTEL, tgt: MOD.FORECAST, event: "deal_risk_score.changed", payload: 1008, description: "Recalculated deal-risk scores in REV-INTEL-DEAL-INTEL feed the forecast roll-up in REV-INTEL-FORECAST." },
  ];
  // Idempotency key: source_module|target_module|trigger_event_id|payload (all intra-domain on 103).
  const existing = await get(
    `/handoffs?source_domain_id=eq.${DOMAIN_ID}&target_domain_id=eq.${DOMAIN_ID}&select=source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id`,
  );
  const key = (r: Row) =>
    `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.trigger_event_id}|${r.data_object_id}`;
  const have = new Set(existing.map(key));
  const rows = specs
    .map(s => ({
      handoff_label: `Revenue Intelligence → Revenue Intelligence : ${s.event}`,
      source_domain_id: DOMAIN_ID,
      target_domain_id: DOMAIN_ID,
      source_domain_module_id: s.src,
      target_domain_module_id: s.tgt,
      trigger_event_id: ev(s.event),
      data_object_id: s.payload,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: s.description,
      notes: "",
    }))
    .filter(r => !have.has(key(r)));
  if (rows.length) {
    await post("/handoffs", rows);
    console.log(`  inserted ${rows.length} intra-domain handoffs.`);
  } else {
    console.log("  all intra-domain handoffs already present.");
  }
}

// ───────────────────────────────────────────────────────────
// Fix 5 — E-band: personas + reach + process wiring + RACI
// ───────────────────────────────────────────────────────────
const PERSONAS: { role_code: string; role_name: string; business_function_id: number | null; description: string }[] = [
  { role_code: "SALES-MANAGER", role_name: "Sales Manager", business_function_id: BF.SALES, description: "Front-line sales leader who inspects pipeline by deal risk, runs forecast roll-ups, and coaches reps on recorded calls." },
  { role_code: "SALES-OPS-REVOPS-ANALYST", role_name: "Revenue Operations Analyst", business_function_id: BF.SALES_OPS, description: "RevOps analyst who tunes deal-scoring and forecasting models, monitors forecast accuracy, and curates activity-attribution rules." },
  { role_code: "SALES-REP", role_name: "Sales Representative", business_function_id: BF.SALES, description: "Quota-carrying rep whose activities are auto-captured, who submits a periodic forecast, and who acts on deal warnings and coaching." },
  { role_code: "ENABLEMENT-COACH", role_name: "Sales Enablement Coach", business_function_id: null, description: "Enablement coach who reviews recorded calls against the playbook and runs structured coaching sessions." },
];

const REACH: { role: string; module: number; level: "primary" | "secondary" }[] = [
  { role: "SALES-MANAGER", module: MOD.DEAL_INTEL, level: "primary" },
  { role: "SALES-MANAGER", module: MOD.FORECAST, level: "primary" },
  { role: "SALES-MANAGER", module: MOD.COACHING, level: "primary" },
  { role: "SALES-MANAGER", module: MOD.CONVERSATION, level: "secondary" },
  { role: "SALES-OPS-REVOPS-ANALYST", module: MOD.FORECAST, level: "primary" },
  { role: "SALES-OPS-REVOPS-ANALYST", module: MOD.DEAL_INTEL, level: "primary" },
  { role: "SALES-OPS-REVOPS-ANALYST", module: MOD.ACTIVITY_CAPTURE, level: "secondary" },
  { role: "SALES-OPS-REVOPS-ANALYST", module: MOD.CONVERSATION, level: "secondary" },
  { role: "SALES-REP", module: MOD.FORECAST, level: "primary" },
  { role: "SALES-REP", module: MOD.ACTIVITY_CAPTURE, level: "secondary" },
  { role: "SALES-REP", module: MOD.DEAL_INTEL, level: "secondary" },
  { role: "SALES-REP", module: MOD.COACHING, level: "secondary" },
  { role: "ENABLEMENT-COACH", module: MOD.COACHING, level: "primary" },
  { role: "ENABLEMENT-COACH", module: MOD.CONVERSATION, level: "primary" },
];

const MOD_CODE: Record<number, string> = {
  [MOD.CONVERSATION]: "REV-INTEL-CONVERSATION",
  [MOD.DEAL_INTEL]: "REV-INTEL-DEAL-INTEL",
  [MOD.FORECAST]: "REV-INTEL-FORECAST",
  [MOD.COACHING]: "REV-INTEL-COACHING",
  [MOD.ACTIVITY_CAPTURE]: "REV-INTEL-ACTIVITY-CAPTURE",
};

async function fix5_personas() {
  console.log("\n=== Fix 5 — E-band personas + reach + RACI ===");
  // 5a. domain_roles (idempotent by role_code)
  const codes = PERSONAS.map(p => p.role_code);
  const existingRoles = await get(
    `/domain_roles?role_code=in.(${codes.join(",")})&select=id,role_code`,
  );
  const haveRoles = new Set(existingRoles.map(r => String(r.role_code)));
  const roleRows = PERSONAS.filter(p => !haveRoles.has(p.role_code));
  if (roleRows.length) {
    await post("/domain_roles", roleRows);
    console.log(`  inserted ${roleRows.length} personas.`);
  } else {
    console.log("  personas already present.");
  }
  const allRoles = await get(`/domain_roles?role_code=in.(${codes.join(",")})&select=id,role_code,role_name`);
  const roleId = new Map<string, number>();
  const roleName = new Map<string, string>();
  for (const r of allRoles) {
    roleId.set(String(r.role_code), Number(r.id));
    roleName.set(String(r.role_code), String(r.role_name));
  }

  // 5b. role_modules (idempotent by role_id|domain_module_id)
  const roleIds = [...roleId.values()];
  const existingRM = await get(
    `/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id,domain_module_id`,
  );
  const haveRM = new Set(existingRM.map(r => `${r.role_id}|${r.domain_module_id}`));
  const rmRows = REACH.map(r => ({
    role_module_label: `${roleName.get(r.role)} on ${MOD_CODE[r.module]}`,
    role_id: roleId.get(r.role)!,
    domain_module_id: r.module,
    interaction_level: r.level,
    notes: "",
  })).filter(r => !haveRM.has(`${r.role_id}|${r.domain_module_id}`));
  if (rmRows.length) {
    await post("/role_modules", rmRows);
    console.log(`  inserted ${rmRows.length} role_modules reach rows.`);
  } else {
    console.log("  role_modules reach already present.");
  }

  // 5c. custom coaching process (idempotent by process_name)
  const COACH_PROC = "CUSTOM-REVINTEL-CALL-COACHING";
  let [coachProc] = await get(
    `/processes?process_name=eq.${encodeURIComponent(COACH_PROC)}&select=id`,
  );
  if (!coachProc) {
    await post("/processes", [
      {
        process_name: COACH_PROC,
        source_framework: "custom",
        external_id: "",
        hierarchy_level: 4,
        description: "Coach sales reps on recorded calls: anchor a 1-on-1 session to a call, score it against a rubric, and track improvement. Cross-industry PCF has no matching activity.",
      },
    ]);
    [coachProc] = await get(`/processes?process_name=eq.${encodeURIComponent(COACH_PROC)}&select=id`);
    console.log(`  created custom process ${COACH_PROC} (id ${coachProc.id}).`);
  } else {
    console.log(`  custom process ${COACH_PROC} already present (id ${coachProc.id}).`);
  }
  const coachProcId = Number(coachProc.id);

  // 5d. wire process_id on gated lifecycle states (idempotent: only when null)
  const wires: { data_object_id: number; state_name: string; process_id: number }[] = [
    { data_object_id: 1011, state_name: "submitted", process_id: PCF.GENERATE_FORECAST },
    { data_object_id: 1011, state_name: "locked", process_id: PCF.GENERATE_FORECAST },
    { data_object_id: 1009, state_name: "acknowledged", process_id: PCF.MANAGE_PIPELINE },
    { data_object_id: 1009, state_name: "cleared", process_id: PCF.MANAGE_PIPELINE },
    { data_object_id: 1014, state_name: "completed", process_id: coachProcId },
  ];
  for (const w of wires) {
    const [st] = await get(
      `/data_object_lifecycle_states?data_object_id=eq.${w.data_object_id}&state_name=eq.${w.state_name}&select=id,process_id`,
    );
    if (!st) {
      console.log(`  WARN: lifecycle state ${w.data_object_id}/${w.state_name} not found.`);
      continue;
    }
    if (st.process_id == null) {
      await patch(`/data_object_lifecycle_states?id=eq.${st.id}`, { process_id: w.process_id });
      console.log(`  wired ${w.data_object_id}/${w.state_name} -> process ${w.process_id}.`);
    } else {
      console.log(`  ${w.data_object_id}/${w.state_name} already wired (process ${st.process_id}).`);
    }
  }

  // 5e. process_raci (idempotent by process_id|actor_role_id|raci)
  type RaciSpec = { process_id: number; process_label: string; role: string; raci: string };
  const raciSpecs: RaciSpec[] = [
    { process_id: PCF.GENERATE_FORECAST, process_label: "Generate sales forecast", role: "SALES-REP", raci: "responsible" },
    { process_id: PCF.GENERATE_FORECAST, process_label: "Generate sales forecast", role: "SALES-MANAGER", raci: "accountable" },
    { process_id: PCF.GENERATE_FORECAST, process_label: "Generate sales forecast", role: "SALES-OPS-REVOPS-ANALYST", raci: "consulted" },
    { process_id: PCF.MANAGE_PIPELINE, process_label: "Manage opportunity pipeline", role: "SALES-MANAGER", raci: "responsible" },
    { process_id: PCF.MANAGE_PIPELINE, process_label: "Manage opportunity pipeline", role: "SALES-MANAGER", raci: "accountable" },
    { process_id: PCF.MANAGE_PIPELINE, process_label: "Manage opportunity pipeline", role: "SALES-OPS-REVOPS-ANALYST", raci: "consulted" },
    { process_id: coachProcId, process_label: "Call coaching", role: "ENABLEMENT-COACH", raci: "responsible" },
    { process_id: coachProcId, process_label: "Call coaching", role: "SALES-MANAGER", raci: "accountable" },
  ];
  const procIds = [...new Set(raciSpecs.map(s => s.process_id))];
  const existingRaci = await get(
    `/process_raci?process_id=in.(${procIds.join(",")})&select=process_id,actor_role_id,raci`,
  );
  const haveRaci = new Set(existingRaci.map(r => `${r.process_id}|${r.actor_role_id}|${r.raci}`));
  const raciRows = raciSpecs
    .map(s => ({
      process_raci_label: `${roleName.get(s.role)} ${s.raci} for ${s.process_label}`,
      process_id: s.process_id,
      actor_role_id: roleId.get(s.role)!,
      actor_skill_id: null,
      raci: s.raci,
      consultation_blocking: false,
    }))
    .filter(r => !haveRaci.has(`${r.process_id}|${r.actor_role_id}|${r.raci}`));
  if (raciRows.length) {
    await post("/process_raci", raciRows);
    console.log(`  inserted ${raciRows.length} process_raci rows.`);
  } else {
    console.log("  process_raci already present.");
  }
}

// ───────────────────────────────────────────────────────────
// Fix 6 — B2-C1 Revenue Operations function + contributor row
// ───────────────────────────────────────────────────────────
async function fix6_revops() {
  console.log("\n=== Fix 6 — B2-C1 Revenue Operations function ===");
  const NAME = "Revenue Operations";
  let [bf] = await get(`/business_functions?business_function_name=eq.${encodeURIComponent(NAME)}&select=id`);
  if (!bf) {
    await post("/business_functions", [
      {
        business_function_name: NAME,
        description: "Cross-functional operations discipline consolidating sales, marketing, and customer-success operations around revenue process, forecasting, and go-to-market data.",
      },
    ]);
    [bf] = await get(`/business_functions?business_function_name=eq.${encodeURIComponent(NAME)}&select=id`);
    console.log(`  created business_function Revenue Operations (id ${bf.id}).`);
  } else {
    console.log(`  business_function Revenue Operations already present (id ${bf.id}).`);
  }
  const bfId = Number(bf.id);
  const existing = await get(
    `/business_function_domains?domain_id=eq.${DOMAIN_ID}&business_function_id=eq.${bfId}&select=id`,
  );
  if (existing.length === 0) {
    await post("/business_function_domains", [
      {
        business_function_domain_label: "Revenue Operations contributor of Revenue Intelligence",
        domain_id: DOMAIN_ID,
        business_function_id: bfId,
        responsibility_type: "contributor",
        notes: "",
      },
    ]);
    console.log("  inserted RevOps contributor row on REV-INTEL.");
  } else {
    console.log("  RevOps contributor row already present.");
  }
}

// ───────────────────────────────────────────────────────────
async function main() {
  await fix1_domainCatalogUX();
  await fix2_moduleCatalogUX();
  const evMap = await fix3_triggerEvents();
  await fix4_intraDomainHandoffs(evMap);
  await fix5_personas();
  await fix6_revops();

  console.log("\n=== UI links ===");
  console.log("https://tests.semantius.app/domain_map/domains");
  console.log("https://tests.semantius.app/domain_map/domain_modules");
  console.log("https://tests.semantius.app/domain_map/trigger_events");
  console.log("https://tests.semantius.app/domain_map/handoffs");
  console.log("https://tests.semantius.app/domain_map/domain_roles");
  console.log("https://tests.semantius.app/domain_map/process_raci");
  console.log("\nDone.");
}

await main();
