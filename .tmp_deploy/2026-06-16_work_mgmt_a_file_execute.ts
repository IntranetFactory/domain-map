#!/usr/bin/env bun
// 2026-06-16 WORK-MGMT a-file execution (SKILL.md Rule #22 a-file workflow, Rule #21 boundary).
// Domain WORK-MGMT id 135. Modules: TASK-EXEC 149, GOALS-OKR 150, INTAKE 183.
//
// Idempotent: re-reads live state before every write; skips work already done.
// Additive/corrective content lands record_status='new' (omitted -> DB default).
// Rule #15: never write the 'notes' column. No em-dash; American English.
//
// Scope (decided a-file answers):
//   a3 (DESTRUCTIVE, q-file approved): dedup capability near-dup on module 150.
//        DELETE domain_module_capabilities 284 (cap 329 WORK-GOALS-OKR on mod 150) and
//        capability_domains 362 (cap 329 <-> domain 135). Module 150 keeps the cross-cutting
//        GOAL-MGMT (25) via dmc 285; retiring 329's WM links avoids an M4-orphan capability.
//   a5 (DESTRUCTIVE, q-file approved): re-point handoff_processes 878 + 879 (handoffs 1320/1321
//        WM okr_objective.committed/.scored -> TALENT-MGMT) process_id 225 (7.3.2) -> 98 (1.2.6).
//   a6 (DESTRUCTIVE, q-file approved): re-point handoff_processes 880 (handoff 1324 WM
//        okr_objective.scored -> PROD-MGMT) process_id 506 (1.2.6.3) -> 98 (1.2.6).
//   a7 (EXPANSIVE additive, q-file approved): load Tier 1 + Tier 2 Phase-0 MISSING masters.
//        Tier 1: proofing_sessions, proofing_annotations, work_dashboards.
//        Tier 2: work_views, work_time_entries (non-billable; PSA keeps billable worklog),
//                work_portfolios, work_goal_links, work_statuses, work_status_updates.
//        Each: data_objects + DMDO master row + aliases + relationships + users edges;
//        proofing_sessions also gets lifecycle states + trigger_events (only gated master).
//        Capability wiring: proofing_sessions backs CREATIVE-REVIEW (446); work_dashboards
//        backs WORK-DASHBOARDS (331). Both capabilities already realized on mod 149.
//
// NOT executed (kept OPEN, folded into regenerated q-file):
//   a1 (B2-ENTITY-TYPE-AMBIGUOUS): a-file answer is a QUESTION ("how do other vendors handle
//        that") -> not a decision. No write. Answer folded into new q-file.
//   a4 (B2-HANDOFF-787-KEEP-OR-DELETE): Recommended = queue PSA audit. Route to PSA (already
//        tracked in b1b B1B-PSA-787-TARGET-NULL). No WM-side catalog write.

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
const del = (path: string) => call({ method: "DELETE", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const insert = (path: string, rows: Row[]) => call({ method: "POST", path, body: rows });

const EM_DASH = "—";
function assertNoEmDash(rows: Row[]) {
  for (const r of rows)
    for (const v of Object.values(r))
      if (typeof v === "string" && v.includes(EM_DASH))
        throw new Error(`em-dash in: ${v}`);
}

const TASK_EXEC = 149, GOALS_OKR = 150;
const USERS = 748;
const WORK_ITEMS = 243, WORK_PROJECTS = 244, OKR_OBJECTIVES = 245, WORK_SECTIONS = 975;
const CAP_CREATIVE_REVIEW = 446, CAP_WORK_DASHBOARDS = 331;

// ============================================================
// a3 - capability near-dup dedup (DESTRUCTIVE, q-file approved)
// ============================================================
async function a3_dedupCapability() {
  console.log("\n== a3: dedup WORK-GOALS-OKR (329) into cross-cutting GOAL-MGMT (25) ==");
  let n = 0;
  const dmc = await get(`/domain_module_capabilities?capability_id=eq.329&domain_module_id=eq.150&select=id`);
  if (dmc.length) { await del(`/domain_module_capabilities?id=eq.284`); console.log("  DELETE domain_module_capabilities 284 (cap329 on mod150)"); n++; }
  else console.log("  dmc 284 already gone, skip");
  // confirm cross-cutting GOAL-MGMT (25) still realized on 150
  const keep = await get(`/domain_module_capabilities?capability_id=eq.25&domain_module_id=eq.150&select=id`);
  console.log(`  GOAL-MGMT(25) on mod150 present: ${keep.length ? "yes (dmc " + keep[0].id + ")" : "MISSING - ABORT"}`);
  if (!keep.length) throw new Error("cross-cutting GOAL-MGMT link 285 missing; refusing to leave module 150 capability-less");
  const cd = await get(`/capability_domains?capability_id=eq.329&domain_id=eq.135&select=id`);
  if (cd.length) { await del(`/capability_domains?id=eq.362`); console.log("  DELETE capability_domains 362 (cap329 <-> domain135)"); n++; }
  else console.log("  capability_domains 362 already gone, skip");
  console.log(`  a3 destructive rows: ${n}`);
  return n;
}

// ============================================================
// a5 + a6 - handoff_processes re-points (DESTRUCTIVE, q-file approved)
// 225 (7.3.2 Manage employee performance) -> 98 (1.2.6 Develop and set org objectives)
// 506 (1.2.6.3 Monitor performance against objective) -> 98 (1.2.6)
// ============================================================
async function a5a6_repointTags() {
  console.log("\n== a5/a6: re-point handoff_processes to PCF 1.2.6 (process 98) ==");
  let n = 0;
  for (const id of [878, 879]) {
    const [r] = await get(`/handoff_processes?id=eq.${id}&select=id,process_id`);
    if (!r) { console.log(`  hp ${id} missing, skip`); continue; }
    if (Number(r.process_id) === 98) { console.log(`  hp ${id} already 98, skip`); continue; }
    await patch(`/handoff_processes?id=eq.${id}`, { process_id: 98 });
    console.log(`  PATCH handoff_processes ${id}: ${r.process_id} -> 98`); n++;
  }
  const [r] = await get(`/handoff_processes?id=eq.880&select=id,process_id`);
  if (r && Number(r.process_id) !== 98) { await patch(`/handoff_processes?id=eq.880`, { process_id: 98 }); console.log(`  PATCH handoff_processes 880: ${r.process_id} -> 98`); n++; }
  else console.log("  hp 880 already 98 or missing, skip");
  console.log(`  a5/a6 destructive PATCHes: ${n}`);
  return n;
}

// ============================================================
// a7 - Phase-B expansion: Tier 1 + Tier 2 masters (EXPANSIVE additive, q-file approved)
// ============================================================
type MasterDef = {
  name: string; module: number; singular: string; plural: string;
  entity_type: string; description: string;
  flags?: Partial<{ has_personal_content: boolean; has_submit_lock: boolean; has_single_approver: boolean }>;
  aliases: string[];
};

const MASTERS: MasterDef[] = [
  // ---- Tier 1 ----
  { name: "proofing_sessions", module: TASK_EXEC, singular: "Proofing Session", plural: "Proofing Sessions",
    entity_type: "operational_workflow",
    description: "Review-and-approval cycle on a creative asset or document attached to a work item. Reviewers mark up the proof and decide approve or request-changes; backs the creative-review capability.",
    flags: { has_single_approver: true },
    aliases: ["proof", "review_round", "approval_round", "creative_review"] },
  { name: "proofing_annotations", module: TASK_EXEC, singular: "Proofing Annotation", plural: "Proofing Annotations",
    entity_type: "operational_record",
    description: "Markup comment placed on a region of a proof during a proofing session, with the reviewer, location, and resolution state.",
    aliases: ["annotation", "markup", "proof_comment"] },
  { name: "work_dashboards", module: TASK_EXEC, singular: "Work Dashboard", plural: "Work Dashboards",
    entity_type: "catalog",
    description: "Saved, shareable cross-project dashboard composed of configurable widgets that summarize work progress, workload, and goal status. Backs the cross-project dashboards capability.",
    aliases: ["dashboard", "report_view", "overview"] },
  // ---- Tier 2 ----
  { name: "work_views", module: TASK_EXEC, singular: "Work View", plural: "Work Views",
    entity_type: "catalog",
    description: "Saved, named, shareable board / list / timeline / calendar view of work items with persisted filters, grouping, and sort. A configuration record, not a per-user UI toggle.",
    aliases: ["view", "board", "saved_view", "layout"] },
  { name: "work_time_entries", module: TASK_EXEC, singular: "Work Time Entry", plural: "Work Time Entries",
    entity_type: "operational_record",
    description: "Non-billable time logged against a work item for effort tracking and capacity reporting. Billable worklog with rate, utilization, and invoice stays mastered in the services-billing domain and is consumed, not re-mastered, here.",
    flags: { has_personal_content: true },
    aliases: ["time_log", "effort_entry", "logged_time"] },
  { name: "work_portfolios", module: TASK_EXEC, singular: "Work Portfolio", plural: "Work Portfolios",
    entity_type: "catalog",
    description: "Team-level grouping of related projects for cross-project status roll-up. Distinct from the top-down strategic portfolio mastered in the strategic-portfolio domain.",
    aliases: ["portfolio", "project_group", "program"] },
  { name: "work_goal_links", module: GOALS_OKR, singular: "Work-to-Goal Link", plural: "Work-to-Goal Links",
    entity_type: "junction",
    description: "Contribution link between a work item or project and an okr_objective so that goal progress can roll up from the work that drives it.",
    aliases: ["goal_link", "contribution_link", "alignment"] },
  { name: "work_statuses", module: TASK_EXEC, singular: "Work Status", plural: "Work Statuses",
    entity_type: "catalog",
    description: "Configurable status value in a project's or team's status taxonomy, with its category (not started, in progress, done) and display order.",
    aliases: ["status", "stage", "status_option"] },
  { name: "work_status_updates", module: TASK_EXEC, singular: "Work Status Update", plural: "Work Status Updates",
    entity_type: "operational_record",
    description: "Logged status-change event on a work item or project capturing the prior status, the new status, who changed it, and when.",
    aliases: ["status_change", "status_log", "update"] },
];

async function ensureDataObject(m: MasterDef): Promise<number> {
  const ex = await get(`/data_objects?data_object_name=eq.${m.name}&select=id`);
  if (ex.length) { console.log(`  data_object ${m.name} exists (${ex[0].id}), skip insert`); return Number(ex[0].id); }
  const row: Row = {
    data_object_name: m.name, singular_label: m.singular, plural_label: m.plural,
    description: m.description, entity_type: m.entity_type,
    has_personal_content: !!m.flags?.has_personal_content,
    has_submit_lock: !!m.flags?.has_submit_lock,
    has_single_approver: !!m.flags?.has_single_approver,
  };
  assertNoEmDash([row]);
  const [ins] = await insert(`/data_objects`, [row]);
  console.log(`  INSERT data_object ${m.name} -> ${ins.id} (${m.entity_type})`);
  return Number(ins.id);
}

async function ensureDMDOMaster(moduleId: number, doId: number, name: string) {
  const ex = await get(`/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=eq.${doId}&select=id,role`);
  if (ex.length) { console.log(`    DMDO ${name} on mod${moduleId} exists (${ex[0].id}, role=${ex[0].role}), skip`); return; }
  await insert(`/domain_module_data_objects`, [{ domain_module_id: moduleId, data_object_id: doId, role: "master", necessity: "optional" }]);
  console.log(`    INSERT DMDO master ${name} on mod${moduleId} (necessity=optional per Rule #16: Phase-0 market-surface gap)`);
}

async function ensureAliases(doId: number, name: string, aliases: string[]) {
  const ex = await get(`/data_object_aliases?data_object_id=eq.${doId}&select=alias_name`);
  const have = new Set(ex.map((r) => String(r.alias_name).toLowerCase()));
  const rows = aliases.filter((a) => !have.has(a.toLowerCase())).map((a) => ({ data_object_id: doId, alias_name: a, alias_type: "synonym", is_preferred: false }));
  if (!rows.length) { console.log(`    aliases for ${name}: all present, skip`); return; }
  assertNoEmDash(rows);
  await insert(`/data_object_aliases`, rows);
  console.log(`    INSERT ${rows.length} aliases for ${name}`);
}

// relationship + users-edge helpers (idempotent on (data_object_id, related_data_object_id, relationship_verb))
async function ensureRel(srcId: number, relatedId: number, verb: string, inverse: string, type: string, kind: string, isRequired: boolean, ownerSide: string, label: string) {
  const ex = await get(`/data_object_relationships?data_object_id=eq.${srcId}&related_data_object_id=eq.${relatedId}&relationship_verb=eq.${encodeURIComponent(verb)}&select=id`);
  if (ex.length) { console.log(`    rel ${label} exists, skip`); return; }
  const row: Row = { data_object_id: srcId, related_data_object_id: relatedId, relationship_verb: verb, inverse_verb: inverse, relationship_type: type, relationship_kind: kind, is_required: isRequired, owner_side: ownerSide };
  assertNoEmDash([row]);
  await insert(`/data_object_relationships`, [row]);
  console.log(`    INSERT rel ${label}`);
}
async function ensureUserEdge(relatedId: number, verb: string, inverse: string, label: string) {
  const ex = await get(`/data_object_relationships?data_object_id=eq.${USERS}&related_data_object_id=eq.${relatedId}&relationship_verb=eq.${encodeURIComponent(verb)}&select=id`);
  if (ex.length) { console.log(`    users-edge ${label} exists, skip`); return; }
  const row: Row = { data_object_id: USERS, related_data_object_id: relatedId, relationship_verb: verb, inverse_verb: inverse, relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" };
  assertNoEmDash([row]);
  await insert(`/data_object_relationships`, [row]);
  console.log(`    INSERT users-edge ${label}`);
}

async function a7_phaseB() {
  console.log("\n== a7: Phase-B expansion (Tier 1 + Tier 2 masters) ==");
  const ids: Record<string, number> = {};
  for (const m of MASTERS) {
    console.log(`  -- ${m.name} (mod ${m.module}) --`);
    const id = await ensureDataObject(m);
    ids[m.name] = id;
    await ensureDMDOMaster(m.module, id, m.name);
    await ensureAliases(id, m.name, m.aliases);
  }

  // ---- relationships ----
  console.log("  -- relationships --");
  // proofing_sessions belongs_to work_items (a proof is attached to a work item)
  await ensureRel(ids.proofing_sessions, WORK_ITEMS, "belongs_to", "has_proofing_sessions", "one_to_many", "composition", true, "target", "proofing_sessions belongs_to work_items");
  // proofing_annotations belongs_to proofing_sessions
  await ensureRel(ids.proofing_annotations, ids.proofing_sessions, "belongs_to", "has_annotations", "one_to_many", "composition", true, "target", "proofing_annotations belongs_to proofing_sessions");
  // work_dashboards belongs_to work_projects (saved dashboard scoped to a project; optional)
  await ensureRel(ids.work_dashboards, WORK_PROJECTS, "summarizes", "is_summarized_by", "many_to_many", "reference", false, "source", "work_dashboards summarizes work_projects");
  // work_views reference work_projects (a project has many saved views)
  await ensureRel(ids.work_views, WORK_PROJECTS, "scopes", "is_scoped_by", "one_to_many", "reference", false, "target", "work_views scopes work_projects");
  // work_time_entries belongs_to work_items
  await ensureRel(ids.work_time_entries, WORK_ITEMS, "logged_against", "has_time_entries", "one_to_many", "composition", true, "target", "work_time_entries logged_against work_items");
  // work_portfolios aggregate work_projects
  await ensureRel(ids.work_portfolios, WORK_PROJECTS, "groups", "belongs_to_portfolio", "one_to_many", "association", false, "source", "work_portfolios groups work_projects");
  // work_goal_links link work_items -> okr_objectives (junction edges; many links to one parent)
  await ensureRel(ids.work_goal_links, WORK_ITEMS, "links", "is_linked_by", "one_to_many", "reference", true, "target", "work_goal_links links work_items");
  await ensureRel(ids.work_goal_links, OKR_OBJECTIVES, "links_to", "is_advanced_by", "one_to_many", "reference", true, "target", "work_goal_links links_to okr_objectives");
  // work_statuses applies_to work_items (taxonomy reference; one status used by many items)
  await ensureRel(ids.work_statuses, WORK_ITEMS, "is_status_of", "has_status", "one_to_many", "reference", false, "source", "work_statuses is_status_of work_items");
  // work_status_updates belongs_to work_items
  await ensureRel(ids.work_status_updates, WORK_ITEMS, "records_change_on", "has_status_updates", "one_to_many", "composition", true, "target", "work_status_updates records_change_on work_items");

  // ---- users edges (Rule #10): masters with a user-typed actor ----
  console.log("  -- users edges --");
  await ensureUserEdge(ids.proofing_sessions, "owns_proofing_sessions", "is_owned_by", "users owns proofing_sessions");
  await ensureUserEdge(ids.proofing_annotations, "authored_annotations", "is_authored_by", "users authored proofing_annotations");
  await ensureUserEdge(ids.work_dashboards, "owns_dashboards", "is_owned_by", "users owns work_dashboards");
  await ensureUserEdge(ids.work_views, "owns_views", "is_owned_by", "users owns work_views");
  await ensureUserEdge(ids.work_time_entries, "logged_time", "is_logged_by", "users logged work_time_entries");
  await ensureUserEdge(ids.work_portfolios, "owns_portfolios", "is_owned_by", "users owns work_portfolios");
  await ensureUserEdge(ids.work_status_updates, "made_status_updates", "is_made_by", "users made work_status_updates");

  // ---- proofing_sessions lifecycle states (only gated master) + trigger_events ----
  console.log("  -- proofing_sessions lifecycle + events --");
  const psId = ids.proofing_sessions;
  const states = [
    { state_name: "open", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "" },
    { state_name: "in_review", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "" },
    { state_name: "changes_requested", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "" },
    { state_name: "approved", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "approve_proofing_session" },
    { state_name: "rejected", state_order: 5, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "reject_proofing_session" },
  ];
  const exStates = await get(`/data_object_lifecycle_states?data_object_id=eq.${psId}&select=state_name`);
  const haveStates = new Set(exStates.map((r) => String(r.state_name)));
  const newStates = states.filter((s) => !haveStates.has(s.state_name)).map((s) => ({ data_object_id: psId, domain_module_id: TASK_EXEC, ...s }));
  if (newStates.length) { await insert(`/data_object_lifecycle_states`, newStates); console.log(`    INSERT ${newStates.length} lifecycle states on proofing_sessions`); }
  else console.log("    proofing_sessions lifecycle states present, skip");

  const events = [
    { event_name: "proofing_session.approved", from_state: "in_review", to_state: "approved" },
    { event_name: "proofing_session.rejected", from_state: "in_review", to_state: "rejected" },
    { event_name: "proofing_session.changes_requested", from_state: "in_review", to_state: "changes_requested" },
  ];
  const exEvents = await get(`/trigger_events?data_object_id=eq.${psId}&select=event_name`);
  const haveEvents = new Set(exEvents.map((r) => String(r.event_name)));
  const newEvents = events.filter((e) => !haveEvents.has(e.event_name)).map((e) => ({ event_name: e.event_name, data_object_id: psId, from_state: e.from_state, to_state: e.to_state, event_category: "lifecycle", domain_module_id: TASK_EXEC }));
  if (newEvents.length) { await insert(`/trigger_events`, newEvents); console.log(`    INSERT ${newEvents.length} trigger_events on proofing_sessions`); }
  else console.log("    proofing_sessions trigger_events present, skip");

  // ---- capability backing notes: confirm CREATIVE-REVIEW(446) + WORK-DASHBOARDS(331) still realized on 149 ----
  console.log("  -- capability backing check --");
  for (const cap of [CAP_CREATIVE_REVIEW, CAP_WORK_DASHBOARDS]) {
    const l = await get(`/domain_module_capabilities?capability_id=eq.${cap}&domain_module_id=eq.149&select=id`);
    console.log(`    capability ${cap} realized on mod149: ${l.length ? "yes" : "NO (was orphaned; now backed by master)"}`);
  }

  return Object.keys(ids).length;
}

async function main() {
  console.log("WORK-MGMT (135) a-file execution - 2026-06-16");
  const d3 = await a3_dedupCapability();
  const d56 = await a5a6_repointTags();
  const created = await a7_phaseB();
  console.log("\n== SUMMARY ==");
  console.log(`  a3 destructive deletes: ${d3}`);
  console.log(`  a5/a6 destructive PATCHes: ${d56}`);
  console.log(`  a7 masters ensured: ${created} (data_objects + DMDO + aliases + rels + users edges; proofing lifecycle+events)`);
  console.log("  All additive rows: record_status omitted (DB default 'new'). No notes written. No record_status flips.");
}
await main();
