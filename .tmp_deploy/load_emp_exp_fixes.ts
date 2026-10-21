// EMP-EXP audit fix loader.
//
// Applies the 2026-05-24 audit fixes for domain EMP-EXP (id 62):
//   1. M-band: 2 modules (CONTINUOUS-LISTEN, ACTION-PLANNING)
//   2. domain_module_capabilities (5 rows)
//   3. domain_module_data_objects (5 master + 4 embedded)
//   4. domain_starter_modules (2 rows, position 1+2)
//   5. data_object_lifecycle_states (11 rows across 3 masters)
//   6. data_objects PATCH: pattern flags (3 masters) + config-shape notes (2 masters)
//   7. handoffs: 2 new rows for trigger_event_id 452 (action_plan.completed)
//   8. trigger_events PATCH: event_category backfill (5 rows)
//   9. skills PATCH: legacy emp-exp-system (id 55) -> CONTINUOUS-LISTEN
//
// Idempotent: read existing state before every write.

type Row = Record<string, unknown>;

async function call(args: { method: string; path: string; body?: unknown }): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  proc.stdin.end();
  await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  if (proc.exitCode !== 0) {
    throw new Error(`semantius ${args.method} ${args.path} failed: ${stderr || stdout}`);
  }
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

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
    out.push(...result);
  }
  return out;
}

async function patchById(table: string, id: number, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path: `/${table}?id=eq.${id}`, body });
}

// ---------------------------------------------------------------- constants

const DOMAIN_ID = 62;
const DOMAIN_CODE = "EMP-EXP";

const CAP = {
  ENG_SURVEY: 45,
  PULSE_SURVEY: 46,
  FEEDBACK_360: 47,
  LIFECYCLE_LISTEN: 48,
  ACTION_PLAN: 49,
};

const M = {
  survey_campaigns: 181,
  survey_responses: 182,
  engagement_drivers: 183,
  action_plans: 184,
  pulse_questions: 185,
};

const EMBED = { employees: 31, org_units: 34 };

const EVT = {
  survey_campaign_launched: 449,
  survey_response_received: 450,
  action_plan_created: 451,
  action_plan_completed: 452,
  pulse_question_published: 453,
};

const TARGET = { PA: 63, HCM: 54, HCM_LIFECYCLE_MOD: 56 };

const LEGACY_SKILL_ID = 55;

// ----------------------------------------------------------------- phase 1
// domain_modules

const MODULE_ROWS: Row[] = [
  {
    domain_module_code: "EMP-EXP-CONTINUOUS-LISTEN",
    domain_module_name: "Continuous Listening",
    domain_id: DOMAIN_ID,
    description:
      "Engagement, pulse, and lifecycle surveys; question library; response collection; driver scoring. The on-going voice-of-employee surface that Workday Peakon, Culture Amp, Glint, and Qualtrics EmployeeXM all anchor.",
  },
  {
    domain_module_code: "EMP-EXP-ACTION-PLANNING",
    domain_module_name: "Action Planning",
    domain_id: DOMAIN_ID,
    description:
      "Survey-result-driven action plans owned by managers or HRBPs. Tracks driver-to-action linkage, completion, and downstream WORK-MGMT task spawn. Closes the listen-act loop for engagement programs.",
  },
];

// ----------------------------------------------------------------- phase 5
// data_object_lifecycle_states

type LifecycleSpec = {
  data_object_id: number;
  module_key: "EMP-EXP-CONTINUOUS-LISTEN" | "EMP-EXP-ACTION-PLANNING";
  states: Array<{
    name: string;
    order: number;
    initial?: boolean;
    terminal?: boolean;
    requires_permission?: boolean;
    permission_verb_override?: string;
  }>;
};

const LIFECYCLE_SPECS: LifecycleSpec[] = [
  {
    data_object_id: M.survey_campaigns,
    module_key: "EMP-EXP-CONTINUOUS-LISTEN",
    states: [
      { name: "draft", order: 10, initial: true },
      { name: "launched", order: 20, requires_permission: true, permission_verb_override: "launch_survey_campaign" },
      { name: "closed", order: 30, requires_permission: true, permission_verb_override: "close_survey_campaign" },
      { name: "archived", order: 40, terminal: true },
    ],
  },
  {
    data_object_id: M.survey_responses,
    module_key: "EMP-EXP-CONTINUOUS-LISTEN",
    states: [
      { name: "received", order: 10, initial: true },
      { name: "aggregated", order: 20 },
      { name: "anonymized", order: 30, terminal: true },
    ],
  },
  {
    data_object_id: M.action_plans,
    module_key: "EMP-EXP-ACTION-PLANNING",
    states: [
      { name: "open", order: 10, initial: true },
      { name: "in_progress", order: 20 },
      { name: "completed", order: 30, terminal: true, requires_permission: true, permission_verb_override: "complete_action_plan" },
      { name: "archived", order: 40, terminal: true },
    ],
  },
];

// ----------------------------------------------------------------- phase 6
// pattern flags + config-shape notes

const DATA_OBJECT_PATCHES: Array<{ id: number; body: Row }> = [
  { id: M.survey_campaigns, body: { has_submit_lock: true } },
  { id: M.survey_responses, body: { has_personal_content: true } },
  {
    id: M.engagement_drivers,
    body: {
      notes:
        "Config-shaped framework definitions; no workflow. Edited by program admin; record_status is the only state worth tracking.",
    },
  },
  {
    id: M.pulse_questions,
    body: {
      notes:
        "Config-shaped library entries; published vs draft is the only state worth tracking and is captured by record_status.",
    },
  },
];

// ----------------------------------------------------------------- phase 7
// new handoffs for action_plan.completed

type HandoffSpec = {
  trigger_event_id: number;
  target_domain_id: number;
  data_object_id: number;
  integration_pattern: string;
  friction_level: string;
  source_module_key: "EMP-EXP-ACTION-PLANNING" | "EMP-EXP-CONTINUOUS-LISTEN";
  target_domain_module_id: number | null;
  description: string;
  notes: string;
};

const HANDOFF_SPECS: HandoffSpec[] = [
  {
    trigger_event_id: EVT.action_plan_completed,
    target_domain_id: TARGET.PA,
    data_object_id: M.action_plans,
    integration_pattern: "batch_sync",
    friction_level: "low",
    source_module_key: "EMP-EXP-ACTION-PLANNING",
    target_domain_module_id: null,
    description:
      "Engagement action plan marked complete. PA consumes for impact-measurement / driver-uplift rollup.",
    notes: "target NULL until PA is modularized",
  },
  {
    trigger_event_id: EVT.action_plan_completed,
    target_domain_id: TARGET.HCM,
    data_object_id: M.action_plans,
    integration_pattern: "event_stream",
    friction_level: "low",
    source_module_key: "EMP-EXP-ACTION-PLANNING",
    target_domain_module_id: TARGET.HCM_LIFECYCLE_MOD,
    description:
      "Engagement action plan completed. HCM Lifecycle Workflows surfaces closure on the owning manager's people dashboard.",
    notes: "",
  },
];

// ----------------------------------------------------------------- phase 8
// trigger_events.event_category backfill

const EVENT_CATEGORY_PATCHES: Array<{ id: number; category: string }> = [
  { id: EVT.survey_campaign_launched, category: "state_change" },
  { id: EVT.survey_response_received, category: "state_change" },
  { id: EVT.action_plan_created, category: "state_change" },
  { id: EVT.action_plan_completed, category: "state_change" },
  { id: EVT.pulse_question_published, category: "state_change" },
];

// ================================================================= MAIN

async function main() {
  console.log("=== EMP-EXP audit fix loader ===\n");

  // -- 1. domain_modules ---------------------------------------------------
  console.log("Phase 1: domain_modules");
  const existingModules = await get(
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
  );
  const moduleByCode = new Map<string, number>();
  for (const r of existingModules) moduleByCode.set(String(r.domain_module_code), Number(r.id));
  const newModules = MODULE_ROWS.filter((r) => !moduleByCode.has(String(r.domain_module_code)));
  if (newModules.length > 0) {
    const inserted = await insert("/domain_modules", newModules);
    for (const r of inserted) moduleByCode.set(String(r.domain_module_code), Number(r.id));
    console.log(`  inserted ${inserted.length} modules`);
  } else {
    console.log("  all modules already present");
  }
  const modContinuous = moduleByCode.get("EMP-EXP-CONTINUOUS-LISTEN")!;
  const modActionPlanning = moduleByCode.get("EMP-EXP-ACTION-PLANNING")!;
  if (!modContinuous || !modActionPlanning) throw new Error("module id resolution failed");

  // -- 2. domain_module_capabilities --------------------------------------
  console.log("\nPhase 2: domain_module_capabilities");
  const capabilityLinks: Row[] = [
    { domain_module_id: modContinuous, capability_id: CAP.ENG_SURVEY },
    { domain_module_id: modContinuous, capability_id: CAP.PULSE_SURVEY },
    { domain_module_id: modContinuous, capability_id: CAP.FEEDBACK_360 },
    { domain_module_id: modContinuous, capability_id: CAP.LIFECYCLE_LISTEN },
    { domain_module_id: modActionPlanning, capability_id: CAP.ACTION_PLAN },
  ];
  const existingCapLinks = await get(
    `/domain_module_capabilities?domain_module_id=in.(${modContinuous},${modActionPlanning})&select=domain_module_id,capability_id`,
  );
  const capLinkKey = (r: Row) => `${r.domain_module_id}|${r.capability_id}`;
  const existingCapKeys = new Set(existingCapLinks.map(capLinkKey));
  const newCapLinks = capabilityLinks.filter((r) => !existingCapKeys.has(capLinkKey(r)));
  if (newCapLinks.length > 0) {
    await insert("/domain_module_capabilities", newCapLinks);
    console.log(`  inserted ${newCapLinks.length} capability links`);
  } else {
    console.log("  all capability links already present");
  }

  // -- 3. domain_module_data_objects --------------------------------------
  console.log("\nPhase 3: domain_module_data_objects");
  const dmdoRows: Row[] = [
    // CONTINUOUS-LISTEN masters
    { domain_module_id: modContinuous, data_object_id: M.survey_campaigns, role: "master", necessity: "required", notes: "" },
    { domain_module_id: modContinuous, data_object_id: M.survey_responses, role: "master", necessity: "required", notes: "" },
    { domain_module_id: modContinuous, data_object_id: M.engagement_drivers, role: "master", necessity: "required", notes: "" },
    { domain_module_id: modContinuous, data_object_id: M.pulse_questions, role: "master", necessity: "required", notes: "" },
    // ACTION-PLANNING master
    { domain_module_id: modActionPlanning, data_object_id: M.action_plans, role: "master", necessity: "required", notes: "" },
    // Embedded masters on both modules
    {
      domain_module_id: modContinuous,
      data_object_id: EMBED.employees,
      role: "embedded_master",
      necessity: "required",
      notes:
        "Respondent identity, demographic-cohort breakdowns, manager-hierarchy filtering. HCM canonical; local when standalone.",
    },
    {
      domain_module_id: modContinuous,
      data_object_id: EMBED.org_units,
      role: "embedded_master",
      necessity: "required",
      notes: "Team / department scoping for survey targeting and driver rollups. HCM canonical.",
    },
    {
      domain_module_id: modActionPlanning,
      data_object_id: EMBED.employees,
      role: "embedded_master",
      necessity: "required",
      notes: "Owner / contributor identity for action plans. HCM canonical.",
    },
    {
      domain_module_id: modActionPlanning,
      data_object_id: EMBED.org_units,
      role: "embedded_master",
      necessity: "required",
      notes: "Accountable team / department for action plans. HCM canonical.",
    },
  ];
  const existingDmdo = await get(
    `/domain_module_data_objects?domain_module_id=in.(${modContinuous},${modActionPlanning})&select=domain_module_id,data_object_id`,
  );
  const dmdoKey = (r: Row) => `${r.domain_module_id}|${r.data_object_id}`;
  const existingDmdoKeys = new Set(existingDmdo.map(dmdoKey));
  const newDmdo = dmdoRows.filter((r) => !existingDmdoKeys.has(dmdoKey(r)));
  if (newDmdo.length > 0) {
    await insert("/domain_module_data_objects", newDmdo);
    console.log(`  inserted ${newDmdo.length} domain_module_data_objects rows`);
  } else {
    console.log("  all domain_module_data_objects already present");
  }

  // -- 4. domain_starter_modules ------------------------------------------
  console.log("\nPhase 4: domain_starter_modules");
  const starterRows: Row[] = [
    {
      domain_id: DOMAIN_ID,
      domain_module_id: modContinuous,
      position: 1,
      notes:
        "Start here: continuous listening is the primary surface and the masters every action plan depends on.",
    },
    {
      domain_id: DOMAIN_ID,
      domain_module_id: modActionPlanning,
      position: 2,
      notes: "Add once survey results consistently flow; closes the listen-act loop.",
    },
  ];
  const existingStarters = await get(
    `/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=domain_module_id`,
  );
  const existingStarterMods = new Set(existingStarters.map((r) => Number(r.domain_module_id)));
  const newStarters = starterRows.filter(
    (r) => !existingStarterMods.has(Number(r.domain_module_id)),
  );
  if (newStarters.length > 0) {
    await insert("/domain_starter_modules", newStarters);
    console.log(`  inserted ${newStarters.length} starter rows`);
  } else {
    console.log("  all starter rows already present");
  }

  // -- 5. data_object_lifecycle_states ------------------------------------
  console.log("\nPhase 5: data_object_lifecycle_states");
  const lifecycleRows: Row[] = [];
  for (const spec of LIFECYCLE_SPECS) {
    const moduleId =
      spec.module_key === "EMP-EXP-CONTINUOUS-LISTEN" ? modContinuous : modActionPlanning;
    for (const s of spec.states) {
      lifecycleRows.push({
        data_object_id: spec.data_object_id,
        state_name: s.name,
        state_order: s.order,
        is_initial: !!s.initial,
        is_terminal: !!s.terminal,
        requires_permission: !!s.requires_permission,
        permission_verb_override: s.permission_verb_override ?? "",
        domain_module_id: moduleId,
      });
    }
  }
  const existingLifecycle = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${M.survey_campaigns},${M.survey_responses},${M.action_plans})&select=data_object_id,state_name`,
  );
  const lifeKey = (r: Row) => `${r.data_object_id}|${r.state_name}`;
  const existingLifeKeys = new Set(existingLifecycle.map(lifeKey));
  const newLifecycle = lifecycleRows.filter((r) => !existingLifeKeys.has(lifeKey(r)));
  if (newLifecycle.length > 0) {
    await insert("/data_object_lifecycle_states", newLifecycle);
    console.log(`  inserted ${newLifecycle.length} lifecycle states`);
  } else {
    console.log("  all lifecycle states already present");
  }

  // -- 6. data_objects PATCH (pattern flags + notes) ----------------------
  console.log("\nPhase 6: data_objects PATCH");
  for (const p of DATA_OBJECT_PATCHES) {
    await patchById("data_objects", p.id, p.body);
    console.log(`  patched data_objects.id=${p.id}: ${JSON.stringify(p.body)}`);
  }

  // -- 7. new handoffs ----------------------------------------------------
  console.log("\nPhase 7: handoffs for action_plan.completed");
  const existingHandoffs = await get(
    `/handoffs?trigger_event_id=eq.${EVT.action_plan_completed}&source_domain_id=eq.${DOMAIN_ID}&select=trigger_event_id,target_domain_id,data_object_id`,
  );
  const hoKey = (r: Row) =>
    `${r.trigger_event_id}|${r.target_domain_id}|${r.data_object_id}`;
  const existingHoKeys = new Set(existingHandoffs.map(hoKey));
  const handoffRows: Row[] = [];
  for (const spec of HANDOFF_SPECS) {
    const key = `${spec.trigger_event_id}|${spec.target_domain_id}|${spec.data_object_id}`;
    if (existingHoKeys.has(key)) continue;
    handoffRows.push({
      source_domain_id: DOMAIN_ID,
      target_domain_id: spec.target_domain_id,
      trigger_event_id: spec.trigger_event_id,
      data_object_id: spec.data_object_id,
      integration_pattern: spec.integration_pattern,
      friction_level: spec.friction_level,
      source_domain_module_id: modActionPlanning,
      target_domain_module_id: spec.target_domain_module_id,
      description: spec.description,
      notes: spec.notes,
    });
  }
  if (handoffRows.length > 0) {
    await insert("/handoffs", handoffRows);
    console.log(`  inserted ${handoffRows.length} handoffs`);
  } else {
    console.log("  all handoffs already present");
  }

  // -- 8. trigger_events.event_category PATCH -----------------------------
  console.log("\nPhase 8: trigger_events.event_category backfill");
  for (const p of EVENT_CATEGORY_PATCHES) {
    // Only patch if currently empty.
    const existing = await get(`/trigger_events?id=eq.${p.id}&select=id,event_category`);
    if (existing[0] && existing[0].event_category) {
      console.log(`  skip trigger_events.id=${p.id} (already set to "${existing[0].event_category}")`);
      continue;
    }
    await patchById("trigger_events", p.id, { event_category: p.category });
    console.log(`  patched trigger_events.id=${p.id}: event_category="${p.category}"`);
  }

  // -- 9. legacy skill migration ------------------------------------------
  console.log("\nPhase 9: skill migration (legacy domain-level -> CONTINUOUS-LISTEN)");
  const skillRow = await get(`/skills?id=eq.${LEGACY_SKILL_ID}&select=id,skill_name,domain_module_id`);
  if (skillRow[0] && skillRow[0].domain_module_id === null) {
    await patchById("skills", LEGACY_SKILL_ID, { domain_module_id: modContinuous });
    console.log(`  patched skills.id=${LEGACY_SKILL_ID}: domain_module_id=${modContinuous}`);
  } else {
    console.log(
      `  skip skills.id=${LEGACY_SKILL_ID} (domain_module_id already set or row missing)`,
    );
  }

  // -- Summary ------------------------------------------------------------
  console.log("\n=== Summary ===");
  console.log(`CONTINUOUS-LISTEN module id : ${modContinuous}`);
  console.log(`ACTION-PLANNING module id   : ${modActionPlanning}`);
  console.log("\nUI links:");
  console.log(`  https://tests.semantius.app/domain_map/domain_modules`);
  console.log(`  https://tests.semantius.app/domain_map/domain_module_data_objects`);
  console.log(`  https://tests.semantius.app/domain_map/data_object_lifecycle_states`);
  console.log(`  https://tests.semantius.app/domain_map/handoffs`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
