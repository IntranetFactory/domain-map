#!/usr/bin/env bun
// SEM Phase B + Phase S + Phase E load.
// Idempotent: reads natural keys, inserts missing, re-reads for id maps.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius failed (${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

async function insert(path: string, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
  }
}

async function syncByKey<T extends Row>(
  path: string, rows: T[], keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=20000`);
  const have = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !have.has(String(r[keyField])));
  if (missing.length) {
    console.log(`  ${path}: +${missing.length} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=20000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// CONSTANTS
// ============================================================
const SEM_ID = 166;
const SEM_STRAT_DEF = 105;   // SEM-STRATEGY-DEFINITION
const SEM_EXEC_TRK = 106;    // SEM-EXECUTION-TRACKING
const SEM_OPS_RHY  = 107;    // SEM-OPERATING-RHYTHM
const SPM_ID = 9;
const EPM_ID = 66;
const DM_MODULE_ID = 1001;   // domain_map platform module

// Existing data_objects we reference
const USERS_DO = 748;
const ORG_UNITS_DO = 34;
const EMPLOYEES_DO = 31;
const COST_CENTERS_DO = 196;
const OKR_OBJECTIVES_DO = 245;
const STRATEGIC_INITIATIVES_DO = 274;
const TALENT_PERF_MGMT_MODULE = 51; // existing master of okr_objectives

// Existing tools we reuse
const T_CREATE_CAL = 41;
const T_GENERATE_TEXT = 49;
const T_QUERY_EMPLOYEES = 13;
const T_QUERY_STRAT_INIT = 69;
const T_QUERY_OKR = 77;
const T_QUERY_ORG_UNITS = 196;
const T_QUERY_COST_CENTERS = 447;
const T_NOTIFY_PERSON = 913;

// ============================================================
// PHASE B - 1) data_objects
// ============================================================
console.log("\n========== PHASE B ==========");
console.log("== B.1 data_objects ==");
const newDataObjects = [
  {
    data_object_name: "strategy_maps",
    singular_label: "Strategy Map",
    plural_label: "Strategy Maps",
    kind: "domain_owned",
    description: "Balanced-scorecard and strategy-house visualisations linking strategic pillars to objectives, initiatives, and measures across financial, customer, process, and learning perspectives. Configured once per planning horizon; rarely changes structure.",
    has_personal_content: false,
    has_submit_lock: false,
    has_single_approver: false,
    notes: "Config-shaped; no workflow. Authored once per planning cycle, edited inline; no per-state permissions needed.",
  },
  {
    data_object_name: "operating_reviews",
    singular_label: "Operating Review",
    plural_label: "Operating Reviews",
    kind: "domain_owned",
    description: "QBR, MBR, and WBR operating-cadence meeting records. Carries agenda, participants, structured commentary against initiatives and KRs, action items, and outcome summary. Once closed, the record is locked as the audit trail of the cadence.",
    has_personal_content: false,
    has_submit_lock: true,
    has_single_approver: false,
    notes: "",
  },
  {
    data_object_name: "strategy_decisions",
    singular_label: "Strategy Decision",
    plural_label: "Strategy Decisions",
    kind: "domain_owned",
    description: "Decisions captured during operating reviews or strategy off-sites: changes to objective priorities, resource reallocation, initiative go/no-go, scope adjustments. Single decision-maker per record; once decided, the record is locked except by explicit revert.",
    has_personal_content: false,
    has_submit_lock: true,
    has_single_approver: true,
    notes: "",
  },
];
const doMap = await syncByKey("/data_objects", newDataObjects, "data_object_name");
const STRATEGY_MAPS_DO = doMap.get("strategy_maps")!;
const OPERATING_REVIEWS_DO = doMap.get("operating_reviews")!;
const STRATEGY_DECISIONS_DO = doMap.get("strategy_decisions")!;

// ============================================================
// PHASE B - 2) domain_data_objects (domain-level roles)
// ============================================================
console.log("== B.2 domain_data_objects ==");
const ddoExisting = await get(`/domain_data_objects?domain_id=eq.${SEM_ID}&select=data_object_id,role`);
const ddoSet = new Set(ddoExisting.map(r => `${r.data_object_id}:${r.role}`));

const ddoRows: Row[] = [];
const addDDO = (do_id: number, role: string, necessity: string, notes: string = "") => {
  const k = `${do_id}:${role}`;
  if (!ddoSet.has(k)) {
    ddoSet.add(k);
    ddoRows.push({ domain_id: SEM_ID, data_object_id: do_id, role, necessity, notes });
  }
};

// Masters (SEM owns)
addDDO(STRATEGY_MAPS_DO, "master", "required");
addDDO(OPERATING_REVIEWS_DO, "master", "required");
addDDO(STRATEGY_DECISIONS_DO, "master", "required");
// Multi-master adds
addDDO(OKR_OBJECTIVES_DO, "master", "required", "Strategy-office slice: corporate and divisional OKRs cascading from strategic objectives. Distinct from WORK-MGMT (team execution OKRs), SPM (portfolio OKRs), and TALENT-MGMT (individual performance OKRs).");
addDDO(STRATEGIC_INITIATIVES_DO, "master", "required", "Strategy-office slice: corporate strategic initiative register with sponsor, benefits realisation, and traceability to strategic objectives. Co-mastered with SPM whose slice is the PMO portfolio view.");
// Consumers
addDDO(USERS_DO, "consumer", "required", "Owners, sponsors, approvers, decision-makers on every SEM master.");
addDDO(ORG_UNITS_DO, "consumer", "optional", "Cascading hierarchy for strategic-objective deployment. Optional when the cascade is flat.");
addDDO(EMPLOYEES_DO, "consumer", "optional", "Operating-review attendees; only needed when SEM integrates with HCM.");
addDDO(COST_CENTERS_DO, "consumer", "optional", "Investment-alignment views require cost-center linkage; many SEM deployments skip this.");

if (ddoRows.length) {
  console.log(`  +${ddoRows.length} domain_data_objects rows`);
  await insert("/domain_data_objects", ddoRows);
} else console.log("  all present");

// ============================================================
// PHASE B - 3) domain_module_data_objects (module-level roles)
// ============================================================
console.log("== B.3 domain_module_data_objects ==");
const dmdoExisting = await get(`/domain_module_data_objects?domain_module_id=in.(${SEM_STRAT_DEF},${SEM_EXEC_TRK},${SEM_OPS_RHY})&select=domain_module_id,data_object_id,role`);
const dmdoSet = new Set(dmdoExisting.map(r => `${r.domain_module_id}:${r.data_object_id}:${r.role}`));

const dmdoRows: Row[] = [];
const addDMDO = (mod: number, do_id: number, role: string, necessity: string, notes: string = "") => {
  const k = `${mod}:${do_id}:${role}`;
  if (!dmdoSet.has(k)) {
    dmdoSet.add(k);
    dmdoRows.push({ domain_module_id: mod, data_object_id: do_id, role, necessity, notes });
  }
};

// SEM-STRATEGY-DEFINITION
addDMDO(SEM_STRAT_DEF, STRATEGY_MAPS_DO, "master", "required");
addDMDO(SEM_STRAT_DEF, OKR_OBJECTIVES_DO, "embedded_master", "required");
addDMDO(SEM_STRAT_DEF, USERS_DO, "consumer", "required");
addDMDO(SEM_STRAT_DEF, ORG_UNITS_DO, "consumer", "optional");

// SEM-EXECUTION-TRACKING
addDMDO(SEM_EXEC_TRK, STRATEGIC_INITIATIVES_DO, "master", "required");
addDMDO(SEM_EXEC_TRK, OKR_OBJECTIVES_DO, "consumer", "required");
addDMDO(SEM_EXEC_TRK, STRATEGY_MAPS_DO, "consumer", "required");
addDMDO(SEM_EXEC_TRK, USERS_DO, "consumer", "required");
addDMDO(SEM_EXEC_TRK, COST_CENTERS_DO, "consumer", "optional");

// SEM-OPERATING-RHYTHM
addDMDO(SEM_OPS_RHY, OPERATING_REVIEWS_DO, "master", "required");
addDMDO(SEM_OPS_RHY, STRATEGY_DECISIONS_DO, "master", "required");
addDMDO(SEM_OPS_RHY, STRATEGIC_INITIATIVES_DO, "consumer", "required");
addDMDO(SEM_OPS_RHY, OKR_OBJECTIVES_DO, "consumer", "required");
addDMDO(SEM_OPS_RHY, USERS_DO, "consumer", "required");
addDMDO(SEM_OPS_RHY, EMPLOYEES_DO, "consumer", "optional");

if (dmdoRows.length) {
  console.log(`  +${dmdoRows.length} DMDO rows`);
  await insert("/domain_module_data_objects", dmdoRows);
} else console.log("  all present");

// ============================================================
// PHASE B - 4) data_object_aliases
// ============================================================
console.log("== B.4 data_object_aliases ==");
const aliasExisting = await get(`/data_object_aliases?data_object_id=in.(${STRATEGY_MAPS_DO},${OPERATING_REVIEWS_DO},${STRATEGY_DECISIONS_DO})&select=data_object_id,alias_name`);
const aliasSet = new Set(aliasExisting.map(r => `${r.data_object_id}:${String(r.alias_name).toLowerCase()}`));

const aliasRows: Row[] = [];
const addAlias = (do_id: number, alias_name: string, alias_type: string = "synonym") => {
  const k = `${do_id}:${alias_name.toLowerCase()}`;
  if (!aliasSet.has(k)) {
    aliasSet.add(k);
    aliasRows.push({ data_object_id: do_id, alias_name, alias_type });
  }
};
addAlias(STRATEGY_MAPS_DO, "Balanced Scorecard");
addAlias(STRATEGY_MAPS_DO, "Strategy House");
addAlias(STRATEGY_MAPS_DO, "Strategic Framework");
addAlias(OPERATING_REVIEWS_DO, "QBR");
addAlias(OPERATING_REVIEWS_DO, "Quarterly Business Review");
addAlias(OPERATING_REVIEWS_DO, "MBR");
addAlias(OPERATING_REVIEWS_DO, "Monthly Business Review");
addAlias(OPERATING_REVIEWS_DO, "Strategy Review");
addAlias(STRATEGY_DECISIONS_DO, "Decision Log Entry");
addAlias(STRATEGY_DECISIONS_DO, "Steering Decision");

if (aliasRows.length) {
  console.log(`  +${aliasRows.length} alias rows`);
  await insert("/data_object_aliases", aliasRows);
} else console.log("  all present");

// ============================================================
// PHASE B - 5) data_object_lifecycle_states
// ============================================================
console.log("== B.5 data_object_lifecycle_states ==");
const lsExisting = await get(`/data_object_lifecycle_states?data_object_id=in.(${STRATEGY_MAPS_DO},${OPERATING_REVIEWS_DO},${STRATEGY_DECISIONS_DO})&select=data_object_id,state_name`);
const lsSet = new Set(lsExisting.map(r => `${r.data_object_id}:${r.state_name}`));

const lsRows: Row[] = [];
const addLS = (do_id: number, mod_id: number, state_name: string, state_order: number, opts: { is_initial?: boolean; is_terminal?: boolean; requires_permission?: boolean; permission_verb_override?: string; description?: string } = {}) => {
  const k = `${do_id}:${state_name}`;
  if (!lsSet.has(k)) {
    lsSet.add(k);
    lsRows.push({
      data_object_id: do_id, domain_module_id: mod_id, state_name, state_order,
      is_initial: opts.is_initial ?? false,
      is_terminal: opts.is_terminal ?? false,
      requires_permission: opts.requires_permission ?? false,
      permission_verb_override: opts.permission_verb_override ?? "",
      description: opts.description ?? "",
    });
  }
};

// operating_reviews: scheduled -> in_progress -> completed
addLS(OPERATING_REVIEWS_DO, SEM_OPS_RHY, "scheduled", 1, { is_initial: true, description: "Review is on the calendar; agenda may still be in flux." });
addLS(OPERATING_REVIEWS_DO, SEM_OPS_RHY, "in_progress", 2, { description: "Review is in session; participants are entering commentary, action items, and decisions." });
addLS(OPERATING_REVIEWS_DO, SEM_OPS_RHY, "completed", 3, { is_terminal: true, requires_permission: true, permission_verb_override: "close_review", description: "Review concluded; record locked. Only the facilitator role may close." });

// strategy_decisions: proposed -> decided / deferred / withdrawn
addLS(STRATEGY_DECISIONS_DO, SEM_OPS_RHY, "proposed", 1, { is_initial: true, description: "Decision proposed but not yet acted on." });
addLS(STRATEGY_DECISIONS_DO, SEM_OPS_RHY, "decided", 2, { is_terminal: true, requires_permission: true, permission_verb_override: "record_decision", description: "Decision-maker has logged the outcome; record locked." });
addLS(STRATEGY_DECISIONS_DO, SEM_OPS_RHY, "deferred", 2, { description: "Decision postponed to a later cadence." });
addLS(STRATEGY_DECISIONS_DO, SEM_OPS_RHY, "withdrawn", 2, { is_terminal: true, requires_permission: true, permission_verb_override: "withdraw_decision", description: "Decision pulled before being acted on." });

if (lsRows.length) {
  console.log(`  +${lsRows.length} lifecycle-state rows`);
  await insert("/data_object_lifecycle_states", lsRows);
} else console.log("  all present");

// ============================================================
// PHASE B - 6) trigger_events
// ============================================================
console.log("== B.6 trigger_events ==");
const teExisting = await get(`/trigger_events?data_object_id=in.(${OKR_OBJECTIVES_DO},${STRATEGIC_INITIATIVES_DO},${OPERATING_REVIEWS_DO},${STRATEGY_DECISIONS_DO})&select=event_name`);
const teSet = new Set(teExisting.map(r => String(r.event_name)));

const teRows: Row[] = [];
const addTE = (event_name: string, do_id: number, opts: { description: string; event_category?: string; from_state?: string; to_state?: string; domain_module_id?: number }) => {
  if (!teSet.has(event_name)) {
    teSet.add(event_name);
    teRows.push({
      event_name, data_object_id: do_id,
      description: opts.description,
      event_category: opts.event_category ?? "state_change",
      from_state: opts.from_state ?? "",
      to_state: opts.to_state ?? "",
      domain_module_id: opts.domain_module_id ?? null,
    });
  }
};

// SEM publishes on okr_objectives state changes (strategy-office cascade)
addTE("strategic_objective.cascaded", OKR_OBJECTIVES_DO, {
  description: "Strategy-office cascades a corporate or divisional objective down to subordinate units; subscribers create child OKRs.",
  event_category: "lifecycle", to_state: "committed",
  domain_module_id: SEM_STRAT_DEF,
});
// strategic_initiatives state events
addTE("strategic_initiative.approved", STRATEGIC_INITIATIVES_DO, {
  description: "Strategic initiative approved for execution; downstream portfolio (SPM) registers the investment.",
  event_category: "state_change", to_state: "approved",
  domain_module_id: SEM_EXEC_TRK,
});
addTE("strategic_initiative.completed", STRATEGIC_INITIATIVES_DO, {
  description: "Strategic initiative completed; benefits realisation captured.",
  event_category: "state_change", to_state: "completed",
  domain_module_id: SEM_EXEC_TRK,
});
addTE("strategic_initiative.cancelled", STRATEGIC_INITIATIVES_DO, {
  description: "Strategic initiative cancelled; downstream portfolio releases capacity.",
  event_category: "state_change", to_state: "cancelled",
  domain_module_id: SEM_EXEC_TRK,
});
// operating_reviews state events
addTE("operating_review.completed", OPERATING_REVIEWS_DO, {
  description: "Operating review concluded; commentary, action items, and decisions are now in the record.",
  event_category: "lifecycle", from_state: "in_progress", to_state: "completed",
  domain_module_id: SEM_OPS_RHY,
});
// strategy_decisions state events
addTE("strategy_decision.decided", STRATEGY_DECISIONS_DO, {
  description: "Strategy decision logged by the decision-maker; affected initiatives, OKRs, or resources are updated.",
  event_category: "state_change", to_state: "decided",
  domain_module_id: SEM_OPS_RHY,
});

if (teRows.length) {
  console.log(`  +${teRows.length} trigger_events rows`);
  await insert("/trigger_events", teRows);
} else console.log("  all present");

// Build trigger_event map
const teAll = await get(`/trigger_events?data_object_id=in.(${OKR_OBJECTIVES_DO},${STRATEGIC_INITIATIVES_DO},${OPERATING_REVIEWS_DO},${STRATEGY_DECISIONS_DO})&select=id,event_name`);
const teMap = new Map<string, number>();
for (const r of teAll) teMap.set(String(r.event_name), Number(r.id));

// ============================================================
// PHASE B - 7) handoffs
// ============================================================
console.log("== B.7 handoffs ==");
const hExisting = await get(`/handoffs?or=(source_domain_id.eq.${SEM_ID},target_domain_id.eq.${SEM_ID})&select=trigger_event_id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id`);
const hSet = new Set(hExisting.map(r => `${r.trigger_event_id}:${r.source_domain_id}:${r.target_domain_id}:${r.source_domain_module_id}:${r.target_domain_module_id}`));

const hRows: Row[] = [];
const addH = (event: string, src_dom: number, src_mod: number | null, tgt_dom: number, tgt_mod: number | null, payload_do: number, pattern: string, friction: string, description: string, notes: string = "") => {
  const teId = teMap.get(event);
  if (!teId) throw new Error(`trigger_event missing: ${event}`);
  const k = `${teId}:${src_dom}:${tgt_dom}:${src_mod}:${tgt_mod}`;
  if (!hSet.has(k)) {
    hSet.add(k);
    hRows.push({
      trigger_event_id: teId,
      source_domain_id: src_dom, target_domain_id: tgt_dom,
      source_domain_module_id: src_mod, target_domain_module_id: tgt_mod,
      data_object_id: payload_do,
      integration_pattern: pattern, friction_level: friction,
      description, notes,
    });
  }
};

// Intra-domain (lifecycle_progression — in-process FK + state transition)
addH("strategic_objective.cascaded", SEM_ID, SEM_STRAT_DEF, SEM_ID, SEM_EXEC_TRK, OKR_OBJECTIVES_DO, "lifecycle_progression", "low",
  "Strategy-office cascades a corporate objective; Execution Tracking begins to track contributing initiatives against the cascaded objective.");
addH("strategic_initiative.approved", SEM_ID, SEM_EXEC_TRK, SEM_ID, SEM_OPS_RHY, STRATEGIC_INITIATIVES_DO, "lifecycle_progression", "low",
  "Approved initiative becomes a standing review item in the next operating cadence.");
addH("strategic_initiative.completed", SEM_ID, SEM_EXEC_TRK, SEM_ID, SEM_OPS_RHY, STRATEGIC_INITIATIVES_DO, "lifecycle_progression", "low",
  "Completed initiative scheduled for benefits-realisation review in next operating cadence.");
addH("strategy_decision.decided", SEM_ID, SEM_OPS_RHY, SEM_ID, SEM_EXEC_TRK, STRATEGY_DECISIONS_DO, "lifecycle_progression", "medium",
  "Strategy decision from an operating review (e.g. initiative cancellation, reprioritisation) updates the affected initiative records.");

// Cross-domain SEM -> SPM (portfolio registers approved initiatives)
addH("strategic_initiative.approved", SEM_ID, SEM_EXEC_TRK, SPM_ID, null, STRATEGIC_INITIATIVES_DO, "event_stream", "high",
  "Strategy-office approves a corporate strategic initiative; PMO/SPM registers it in the portfolio and allocates capacity. High friction because the strategy-office record and the portfolio record are typically managed in different vendors (WorkBoard + Planview, Cascade + ServiceNow SPM) without identifier reconciliation.");
addH("strategic_initiative.cancelled", SEM_ID, SEM_EXEC_TRK, SPM_ID, null, STRATEGIC_INITIATIVES_DO, "event_stream", "medium",
  "Strategy-office cancels an initiative; PMO/SPM must release capacity and update portfolio scenarios.");

// Cross-domain SEM -> EPM (planning aligns to approved strategy)
addH("strategic_initiative.approved", SEM_ID, SEM_EXEC_TRK, EPM_ID, null, STRATEGIC_INITIATIVES_DO, "api_call", "high",
  "Strategy-office approves an initiative with budget implications; FP&A must allocate spend in the rolling forecast. High friction: strategy-office initiative budget and EPM allocation are usually in different tools, with manual reconciliation at quarter end.");
addH("strategic_objective.cascaded", SEM_ID, SEM_STRAT_DEF, EPM_ID, null, OKR_OBJECTIVES_DO, "manual_handoff", "high",
  "Cascaded strategic objectives drive driver-based planning in EPM. Almost always manual: FP&A re-keys the strategic priorities into the planning model.");

if (hRows.length) {
  console.log(`  +${hRows.length} handoffs rows`);
  await insert("/handoffs", hRows);
} else console.log("  all present");

// ============================================================
// PHASE B - 8) data_object_relationships
// ============================================================
console.log("== B.8 data_object_relationships ==");
const drExisting = await get(`/data_object_relationships?or=(data_object_id.in.(${STRATEGY_MAPS_DO},${OPERATING_REVIEWS_DO},${STRATEGY_DECISIONS_DO},${OKR_OBJECTIVES_DO},${STRATEGIC_INITIATIVES_DO}),related_data_object_id.in.(${STRATEGY_MAPS_DO},${OPERATING_REVIEWS_DO},${STRATEGY_DECISIONS_DO}))&select=data_object_id,related_data_object_id,relationship_verb`);
const drSet = new Set(drExisting.map(r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));

const drRows: Row[] = [];
const addDR = (src: number, verb: string, inverse: string, tgt: number, type: string, kind: string, required: boolean, owner_side: string, notes: string = "") => {
  const k = `${src}:${tgt}:${verb}`;
  if (!drSet.has(k)) {
    drSet.add(k);
    drRows.push({
      data_object_id: src, related_data_object_id: tgt,
      relationship_verb: verb, inverse_verb: inverse,
      relationship_type: type, relationship_kind: kind,
      is_required: required, owner_side, notes,
    });
  }
};

// Intra-SEM master edges
addDR(STRATEGY_MAPS_DO, "organizes", "appears_on", OKR_OBJECTIVES_DO, "one_to_many", "reference", false, "source");
addDR(OKR_OBJECTIVES_DO, "advanced_by", "advances", STRATEGIC_INITIATIVES_DO, "many_to_many", "reference", false, "source");
addDR(STRATEGIC_INITIATIVES_DO, "reviewed_in", "reviews", OPERATING_REVIEWS_DO, "many_to_many", "reference", false, "target");
addDR(OKR_OBJECTIVES_DO, "reviewed_in", "reviews", OPERATING_REVIEWS_DO, "many_to_many", "reference", false, "target");
addDR(OPERATING_REVIEWS_DO, "produces", "produced_by", STRATEGY_DECISIONS_DO, "one_to_many", "composition", false, "source");
addDR(STRATEGY_DECISIONS_DO, "affects", "affected_by", STRATEGIC_INITIATIVES_DO, "many_to_many", "reference", false, "source");
addDR(STRATEGY_DECISIONS_DO, "affects", "affected_by", OKR_OBJECTIVES_DO, "many_to_many", "reference", false, "source");

// users edges (Rule #10)
addDR(STRATEGY_MAPS_DO, "owned_by", "owns", USERS_DO, "one_to_many", "reference", true, "source", "Strategy-map owner.");
addDR(OPERATING_REVIEWS_DO, "facilitated_by", "facilitates", USERS_DO, "one_to_many", "reference", true, "source", "Review facilitator.");
addDR(OPERATING_REVIEWS_DO, "attended_by", "attends", USERS_DO, "many_to_many", "reference", false, "source", "Review attendees.");
addDR(STRATEGY_DECISIONS_DO, "decided_by", "decides", USERS_DO, "one_to_many", "reference", true, "source", "Decision-maker on the record.");

if (drRows.length) {
  console.log(`  +${drRows.length} data_object_relationships rows`);
  await insert("/data_object_relationships", drRows);
} else console.log("  all present");

// ============================================================
// PHASE S - 9) tools (new)
// ============================================================
console.log("\n========== PHASE S ==========");
console.log("== S.1 tools ==");
const newTools = [
  { tool_name: "query_strategy_maps", operation_kind: "query", coverage_tier: "platform", data_object_id: STRATEGY_MAPS_DO, description: "Query strategy-map records (filters: planning horizon, owning org, pillar)." },
  { tool_name: "create_strategy_map", operation_kind: "mutate", coverage_tier: "platform", data_object_id: STRATEGY_MAPS_DO, description: "Create a new strategy-map record for a planning horizon." },
  { tool_name: "update_strategy_map", operation_kind: "mutate", coverage_tier: "platform", data_object_id: STRATEGY_MAPS_DO, description: "Update a strategy-map record (pillars, descriptions, owners)." },
  { tool_name: "create_okr_objective", operation_kind: "mutate", coverage_tier: "platform", data_object_id: OKR_OBJECTIVES_DO, description: "Create an OKR-objective record (strategy-office cascade or team-level)." },
  { tool_name: "update_okr_objective", operation_kind: "mutate", coverage_tier: "platform", data_object_id: OKR_OBJECTIVES_DO, description: "Update an OKR-objective record (progress, owner, key-result values)." },
  { tool_name: "create_strategic_initiative", operation_kind: "mutate", coverage_tier: "platform", data_object_id: STRATEGIC_INITIATIVES_DO, description: "Create a strategic-initiative record with sponsor, owner, and benefits plan." },
  { tool_name: "update_strategic_initiative", operation_kind: "mutate", coverage_tier: "platform", data_object_id: STRATEGIC_INITIATIVES_DO, description: "Update a strategic-initiative record (status, milestones, RAID)." },
  { tool_name: "query_operating_reviews", operation_kind: "query", coverage_tier: "platform", data_object_id: OPERATING_REVIEWS_DO, description: "Query operating-review records (filters: cadence type, date, owning org)." },
  { tool_name: "create_operating_review", operation_kind: "mutate", coverage_tier: "platform", data_object_id: OPERATING_REVIEWS_DO, description: "Create an operating-review record (scheduled state, with agenda and participants)." },
  { tool_name: "update_operating_review", operation_kind: "mutate", coverage_tier: "platform", data_object_id: OPERATING_REVIEWS_DO, description: "Update an operating-review record (commentary, action items, state transitions)." },
  { tool_name: "query_strategy_decisions", operation_kind: "query", coverage_tier: "platform", data_object_id: STRATEGY_DECISIONS_DO, description: "Query strategy-decision records (filters: decision-maker, affected initiative/objective, date)." },
  { tool_name: "create_strategy_decision", operation_kind: "mutate", coverage_tier: "platform", data_object_id: STRATEGY_DECISIONS_DO, description: "Create a strategy-decision record in proposed state." },
  { tool_name: "update_strategy_decision", operation_kind: "mutate", coverage_tier: "platform", data_object_id: STRATEGY_DECISIONS_DO, description: "Update a strategy-decision record (outcome, affected records, state transitions)." },
];
const toolMap = await syncByKey("/tools", newTools, "tool_name");

// ============================================================
// PHASE S - 10) skills
// ============================================================
console.log("== S.2 skills ==");
const newSkills = [
  { skill_name: "sem_strategy_definition_agent", skill_type: "system", domain_id: SEM_ID, domain_module_id: SEM_STRAT_DEF, description: "Agent for the SEM-STRATEGY-DEFINITION module: authoring strategic objectives, strategy maps, and cascading goal hierarchies." },
  { skill_name: "sem_execution_tracking_agent", skill_type: "system", domain_id: SEM_ID, domain_module_id: SEM_EXEC_TRK, description: "Agent for the SEM-EXECUTION-TRACKING module: managing strategic initiatives, traceability, and investment alignment views." },
  { skill_name: "sem_operating_rhythm_agent", skill_type: "system", domain_id: SEM_ID, domain_module_id: SEM_OPS_RHY, description: "Agent for the SEM-OPERATING-RHYTHM module: orchestrating QBR/MBR/WBR cadences and recording strategy decisions." },
];
const skillMap = await syncByKey("/skills", newSkills, "skill_name");

// ============================================================
// PHASE S - 11) skill_tools
// ============================================================
console.log("== S.3 skill_tools ==");
const stExisting = await get(`/skill_tools?skill_id=in.(${[...skillMap.values()].join(",")})&select=skill_id,tool_id`);
const stSet = new Set(stExisting.map(r => `${r.skill_id}:${r.tool_id}`));

const stRows: Row[] = [];
const addST = (skill_id: number, tool_id: number, level: string, notes: string = "") => {
  const k = `${skill_id}:${tool_id}`;
  if (!stSet.has(k)) {
    stSet.add(k);
    stRows.push({ skill_id, tool_id, requirement_level: level, notes });
  }
};

const SK_DEF = skillMap.get("sem_strategy_definition_agent")!;
const SK_EXEC = skillMap.get("sem_execution_tracking_agent")!;
const SK_OPS = skillMap.get("sem_operating_rhythm_agent")!;

// SEM-STRATEGY-DEFINITION agent
addST(SK_DEF, T_QUERY_OKR, "required", "Read corporate / divisional OKRs for cascading.");
addST(SK_DEF, toolMap.get("create_okr_objective")!, "required", "Create cascaded OKR for subordinate units.");
addST(SK_DEF, toolMap.get("update_okr_objective")!, "required", "Update OKR progress and owner assignments.");
addST(SK_DEF, toolMap.get("query_strategy_maps")!, "required", "Read the strategy map driving the cascade.");
addST(SK_DEF, toolMap.get("create_strategy_map")!, "optional", "Author a new strategy map at planning-cycle start.");
addST(SK_DEF, toolMap.get("update_strategy_map")!, "optional", "Edit the active strategy map (rare; usually annual).");
addST(SK_DEF, T_QUERY_ORG_UNITS, "required", "Resolve cascade targets in the org hierarchy.");
addST(SK_DEF, T_QUERY_EMPLOYEES, "optional", "Look up owner candidates for cascaded OKRs.");
addST(SK_DEF, T_NOTIFY_PERSON, "optional", "Notify owners of newly cascaded OKRs.");

// SEM-EXECUTION-TRACKING agent
addST(SK_EXEC, T_QUERY_STRAT_INIT, "required", "Read the strategic initiative register.");
addST(SK_EXEC, toolMap.get("create_strategic_initiative")!, "required", "Create a strategic initiative record.");
addST(SK_EXEC, toolMap.get("update_strategic_initiative")!, "required", "Update initiative status, milestones, and benefits realisation.");
addST(SK_EXEC, T_QUERY_OKR, "required", "Trace initiatives to OKRs they advance.");
addST(SK_EXEC, T_QUERY_COST_CENTERS, "optional", "Cost-center attribution for investment alignment.");
addST(SK_EXEC, T_GENERATE_TEXT, "optional", "Generate executive-summary narratives across the initiative portfolio.");
addST(SK_EXEC, T_NOTIFY_PERSON, "optional", "Notify initiative owners and sponsors of status changes.");

// SEM-OPERATING-RHYTHM agent
addST(SK_OPS, toolMap.get("query_operating_reviews")!, "required", "Read upcoming and past reviews.");
addST(SK_OPS, toolMap.get("create_operating_review")!, "required", "Schedule a new QBR/MBR/WBR.");
addST(SK_OPS, toolMap.get("update_operating_review")!, "required", "Capture commentary, action items, and close the review.");
addST(SK_OPS, toolMap.get("query_strategy_decisions")!, "required", "Read decision log for traceability.");
addST(SK_OPS, toolMap.get("create_strategy_decision")!, "required", "Log a new strategy decision during a review.");
addST(SK_OPS, toolMap.get("update_strategy_decision")!, "required", "Move a decision to decided/deferred/withdrawn.");
addST(SK_OPS, T_QUERY_STRAT_INIT, "required", "Pull initiative status for the review agenda.");
addST(SK_OPS, T_QUERY_OKR, "required", "Pull OKR progress for the review agenda.");
addST(SK_OPS, T_CREATE_CAL, "required", "Schedule the operating-review meeting on participant calendars.");
addST(SK_OPS, T_NOTIFY_PERSON, "required", "Distribute agenda, action items, and decision summaries to participants.");
addST(SK_OPS, T_GENERATE_TEXT, "optional", "Generate post-review summary narratives.");

if (stRows.length) {
  console.log(`  +${stRows.length} skill_tools rows`);
  await insert("/skill_tools", stRows);
} else console.log("  all present");

// ============================================================
// PHASE E - 12) permissions
// ============================================================
console.log("\n========== PHASE E ==========");
console.log("== E.1 permissions ==");
const permsExisting = await get("/permissions?select=permission_name&limit=50000");
const permsSet = new Set(permsExisting.map(r => String(r.permission_name)));

const permsRows: Row[] = [];
const addPerm = (name: string, mod_id: number, tier: string, description: string) => {
  if (!permsSet.has(name)) {
    permsSet.add(name);
    permsRows.push({ permission_name: name, domain_module_id: mod_id, tier, description, module_id: DM_MODULE_ID });
  }
};

// Baseline tiers per module
addPerm("sem-strategy-definition:read", SEM_STRAT_DEF, "baseline-read", "Read strategic objectives, strategy maps, and cascading OKRs.");
addPerm("sem-strategy-definition:manage", SEM_STRAT_DEF, "baseline-manage", "Author and update strategic objectives and strategy maps within scope.");
addPerm("sem-strategy-definition:admin", SEM_STRAT_DEF, "baseline-admin", "Full administration of strategy-definition records and cascading.");
addPerm("sem-execution-tracking:read", SEM_EXEC_TRK, "baseline-read", "Read the strategic initiative register and traceability views.");
addPerm("sem-execution-tracking:manage", SEM_EXEC_TRK, "baseline-manage", "Author and update strategic initiatives within scope.");
addPerm("sem-execution-tracking:admin", SEM_EXEC_TRK, "baseline-admin", "Full administration of execution tracking and investment-alignment views.");
addPerm("sem-operating-rhythm:read", SEM_OPS_RHY, "baseline-read", "Read operating reviews and the strategy decision log.");
addPerm("sem-operating-rhythm:manage", SEM_OPS_RHY, "baseline-manage", "Schedule reviews, capture commentary, log decisions in scope.");
addPerm("sem-operating-rhythm:admin", SEM_OPS_RHY, "baseline-admin", "Full administration of operating cadences and decision logs.");

// Workflow gates (derived from lifecycle states with requires_permission=true)
addPerm("sem-operating-rhythm:close_review", SEM_OPS_RHY, "workflow-gate", "Close an operating-review record (terminal state). Restricted to facilitators.");
addPerm("sem-operating-rhythm:record_decision", SEM_OPS_RHY, "workflow-gate", "Record a strategy-decision outcome (move from proposed to decided).");
addPerm("sem-operating-rhythm:withdraw_decision", SEM_OPS_RHY, "workflow-gate", "Withdraw a proposed strategy decision before action.");

// Initiative + objective workflow gates (anticipated from typical SEM workflows; not driven by loaded lifecycle states since strategic_initiatives/okr_objectives are reused masters)
addPerm("sem-execution-tracking:approve_initiative", SEM_EXEC_TRK, "workflow-gate", "Approve a strategic initiative for execution (transitions to approved state, triggers SPM portfolio registration).");
addPerm("sem-execution-tracking:complete_initiative", SEM_EXEC_TRK, "workflow-gate", "Mark a strategic initiative as completed with benefits realisation logged.");
addPerm("sem-execution-tracking:cancel_initiative", SEM_EXEC_TRK, "workflow-gate", "Cancel a strategic initiative and release portfolio capacity.");
addPerm("sem-strategy-definition:cascade_objective", SEM_STRAT_DEF, "workflow-gate", "Cascade a corporate or divisional strategic objective to subordinate units.");
addPerm("sem-strategy-definition:retire_objective", SEM_STRAT_DEF, "workflow-gate", "Retire a strategic objective at the close of its planning horizon.");
addPerm("sem-strategy-definition:publish_strategy_map", SEM_STRAT_DEF, "workflow-gate", "Publish a new strategy map for an upcoming planning horizon.");

if (permsRows.length) {
  console.log(`  +${permsRows.length} permissions rows`);
  await insert("/permissions", permsRows);
} else console.log("  all present");

const permsAll = await get("/permissions?select=id,permission_name&domain_module_id=in.(105,106,107)&limit=200");
const permsMap = new Map<string, number>();
for (const r of permsAll) permsMap.set(String(r.permission_name), Number(r.id));

// ============================================================
// PHASE E - 13) roles
// ============================================================
console.log("== E.2 roles ==");
const EXECUTIVE_FN = 32;

const newRoles = [
  {
    role_code: "EXECUTIVE-CHIEF-OF-STAFF",
    slug: "executive_chief_of_staff",
    role_name: "Chief of Staff",
    business_function_id: EXECUTIVE_FN,
    origin: "model",
    description: "Senior operator in the Executive Office responsible for end-to-end strategy execution: cascading corporate objectives, tracking initiatives, and orchestrating operating cadences.",
  },
  {
    role_code: "EXECUTIVE-STRATEGY-ANALYST",
    slug: "executive_strategy_analyst",
    role_name: "Strategy Office Analyst",
    business_function_id: EXECUTIVE_FN,
    origin: "model",
    description: "Analyst supporting the Chief of Staff: maintains strategy maps and OKR cascades, builds initiative dashboards, prepares operating-review materials.",
  },
  {
    role_code: "HEAD-OF-DEPARTMENT",
    slug: "head_of_department",
    role_name: "Head of Department",
    business_function_id: null, // cross-functional
    origin: "model",
    description: "Department or business-unit head accountable for cascaded objectives and owned initiatives. Touches strategy-definition (owns objectives), execution-tracking (owns initiatives), and operating-rhythm (participates in QBRs). Cross-functional: business_function_id is NULL.",
  },
];
const roleMap = await syncByKey("/roles", newRoles, "role_code");

// ============================================================
// PHASE E - 14) role_modules
// ============================================================
console.log("== E.3 role_modules ==");
const rmExisting = await get(`/role_modules?role_id=in.(${[...roleMap.values()].join(",")})&select=role_id,domain_module_id`);
const rmSet = new Set(rmExisting.map(r => `${r.role_id}:${r.domain_module_id}`));

const rmRows: Row[] = [];
const addRM = (role_id: number, mod_id: number, level: string, notes: string = "") => {
  const k = `${role_id}:${mod_id}`;
  if (!rmSet.has(k)) {
    rmSet.add(k);
    rmRows.push({ role_id, domain_module_id: mod_id, interaction_level: level, notes });
  }
};

const COS = roleMap.get("EXECUTIVE-CHIEF-OF-STAFF")!;
const ANALYST = roleMap.get("EXECUTIVE-STRATEGY-ANALYST")!;
const HEAD = roleMap.get("HEAD-OF-DEPARTMENT")!;

// Chief of Staff: primary on all 3 modules
addRM(COS, SEM_STRAT_DEF, "primary", "Owns the corporate strategy cascade.");
addRM(COS, SEM_EXEC_TRK, "primary", "Owns the strategic initiative register and benefits realisation.");
addRM(COS, SEM_OPS_RHY, "primary", "Facilitates the operating cadence and logs decisions.");

// Strategy Office Analyst: primary on strategy definition, secondary on execution and ops rhythm
addRM(ANALYST, SEM_STRAT_DEF, "primary", "Maintains strategy maps and OKR cascades.");
addRM(ANALYST, SEM_EXEC_TRK, "secondary", "Builds initiative dashboards and traceability views.");
addRM(ANALYST, SEM_OPS_RHY, "secondary", "Prepares review materials and captures commentary.");

// Head of Department: secondary on strategy definition, primary on execution tracking, secondary on operating rhythm
addRM(HEAD, SEM_STRAT_DEF, "secondary", "Owns cascaded objectives for the department.");
addRM(HEAD, SEM_EXEC_TRK, "primary", "Owns initiatives within the department.");
addRM(HEAD, SEM_OPS_RHY, "secondary", "Participates in operating reviews; receives action items.");

if (rmRows.length) {
  console.log(`  +${rmRows.length} role_modules rows`);
  await insert("/role_modules", rmRows);
} else console.log("  all present");

// ============================================================
// PHASE E - 15) role_permissions
// ============================================================
console.log("== E.4 role_permissions ==");
const rpExisting = await get(`/role_permissions?role_id=in.(${[...roleMap.values()].join(",")})&select=role_id,permission_id`);
const rpSet = new Set(rpExisting.map(r => `${r.role_id}:${r.permission_id}`));

const rpRows: Row[] = [];
const addRP = (role_id: number, perm_name: string, notes: string = "") => {
  const pid = permsMap.get(perm_name);
  if (!pid) throw new Error(`permission missing: ${perm_name}`);
  const k = `${role_id}:${pid}`;
  if (!rpSet.has(k)) {
    rpSet.add(k);
    rpRows.push({ role_id, permission_id: pid, notes });
  }
};

// Chief of Staff: admin on all 3 modules (tier-level grants pull in workflow gates via permission_hierarchy)
addRP(COS, "sem-strategy-definition:admin");
addRP(COS, "sem-execution-tracking:admin");
addRP(COS, "sem-operating-rhythm:admin");

// Strategy Office Analyst: manage on strategy-definition, read on the other two (analyst doesn't approve initiatives or close reviews)
addRP(ANALYST, "sem-strategy-definition:manage");
addRP(ANALYST, "sem-execution-tracking:read");
addRP(ANALYST, "sem-operating-rhythm:read");
// Analyst needs to cascade objectives explicitly (workflow gate, not auto-included at manage tier)
addRP(ANALYST, "sem-strategy-definition:cascade_objective", "Analyst executes the cascade once the Chief of Staff approves it.");

// Head of Department: manage on execution-tracking (owns initiatives), read on others, explicit gates for initiative approval within scope
addRP(HEAD, "sem-strategy-definition:read");
addRP(HEAD, "sem-execution-tracking:manage");
addRP(HEAD, "sem-operating-rhythm:read");
addRP(HEAD, "sem-execution-tracking:approve_initiative", "Heads approve initiatives within their department.");
addRP(HEAD, "sem-execution-tracking:complete_initiative", "Heads mark their own initiatives complete.");

if (rpRows.length) {
  console.log(`  +${rpRows.length} role_permissions rows`);
  await insert("/role_permissions", rpRows);
} else console.log("  all present");

console.log("\nDONE — SEM Phase B + Phase S + Phase E loaded.");
