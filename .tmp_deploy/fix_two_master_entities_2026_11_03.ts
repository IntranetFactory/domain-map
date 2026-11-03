#!/usr/bin/env bun
// fix_two_master_entities_2026_11_03.ts
//
// Owner-approved 2026-11-03. Gives the two entities with two masters a single master:
//   equity_grants            CAP-TABLE-GRANTS is the only master. The pay decision moves to a new
//                            entity, incentive_awards, mastered in COMP-INCENTIVES.
//   supplier_certifications  SRM-RISK-COMPLIANCE is the only master. FOOD-TRACE-SUPPLIER-PROVENANCE
//                            embeds it.
//
// Default mode is dry-run. Pass --execute to write. Safe to re-run: inserts look up their natural
// key first, and an overwrite refuses to run if the live value is neither the before nor the after.
//
// Usage (from the project root):
//   bun run .tmp_deploy/fix_two_master_entities_2026_11_03.ts
//   bun run .tmp_deploy/fix_two_master_entities_2026_11_03.ts --execute

export {};

import { existsSync, writeFileSync } from "node:fs";
import { argv } from "node:process";
import {
  preflightHandoffs,
  preflightLifecycleStates,
  preflightRelationships,
  preflightTriggerEvents,
} from "../scripts/lib/catalog_invariants.ts";

const EXECUTE = argv.includes("--execute");
const BACKUP = "backups/two-master-fix-2026-11-03.json";
console.log(`mode: ${EXECUTE ? "EXECUTE (writes)" : "DRY-RUN (no writes)"}\n`);

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}
const get = (path: string): Promise<any[]> => postgrest("GET", path);

// ----- live ids -----
const MOD = {
  CAP_TABLE_GRANTS: 21,
  COMP_PLANNING: 78,
  COMP_INCENTIVES: 79,
  COMP_STATEMENTS: 85,
  PAYROLL_EARNINGS: 92,
  FOOD_PROVENANCE: 258,
  SRM_LIFECYCLE: 405,
  SRM_RISK: 407,
};
const DOM = { COMP: 60, PAYROLL: 55, CAP_TABLE: 162, SRM: 28 };
const DO = { equity_grants: 158, supplier_certifications: 498, compensation_plans: 153, merit_recommendations: 156, compensation_statements: 157, employees: 31, users: 748 };
const EVENT_MERIT_CYCLE_APPROVED = 73;
const PROCESS_ADMIN_COMP = 1046; // "Administer compensation and rewards to employees"

const COMP = "Compensation Management";
const CAP = "Cap Table Management and Equity Administration";
const PAY = "Payroll Management";
const FIN = "Core Financial Management";
const SRM = "Supplier Relationship Management";

// ----- additive rows -----
const ENTITY = {
  data_object_name: "incentive_awards",
  kind: "domain_owned",
  entity_type: "operational_workflow",
  singular_label: "Incentive Award",
  plural_label: "Incentive Awards",
  description:
    "One person's bonus, commission, or long-term incentive award: award type, target and approved amount, performance metrics, and payout date. This is the pay decision. When an award pays out in equity, the security itself is issued and tracked as an equity grant on the cap table.",
  catalog_description: "Individual bonus, commission, and long-term incentive awards, with target and approved amounts, performance metrics, and payout dates.",
  has_personal_content: true,
  record_status: "new",
};

const DMDO = [
  { module: MOD.COMP_INCENTIVES, code: "COMP-INCENTIVES", held_as: "master", is_install_optional: false },
  { module: MOD.COMP_STATEMENTS, code: "COMP-STATEMENTS", held_as: "embedded_master", is_install_optional: true },
  { module: MOD.PAYROLL_EARNINGS, code: "PAYROLL-EARNINGS-DEDUCTIONS", held_as: "consumer", is_install_optional: true },
];

const ALIASES = ["bonus_awards", "variable_pay_awards", "lti_awards"];

const STATES = [
  { state_name: "proposed", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", description: "Award proposed during a hire, promotion, merit, or bonus cycle." },
  { state_name: "approved", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "approve", description: "Approver (manager chain, compensation committee, or delegate) signs off on the award." },
  { state_name: "settled", state_order: 3, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", description: "Award paid through payroll, or issued as an equity grant on the cap table." },
  { state_name: "canceled", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "cancel", description: "Award withdrawn before it settles." },
];

// `out` means incentive_awards is the source of the relationship.
const RELATIONSHIPS = [
  { other: DO.compensation_plans, otherName: "compensation_plans", verb: "governs", inverse: "governed by", required: false, out: false },
  { other: DO.merit_recommendations, otherName: "merit_recommendations", verb: "produces", inverse: "produced by", required: false, out: false },
  { other: DO.employees, otherName: "employees", verb: "receives", inverse: "granted to", required: true, out: false },
  { other: DO.users, otherName: "users", verb: "approves", inverse: "approved by", required: false, out: false },
  { other: DO.compensation_statements, otherName: "compensation_statements", verb: "composes", inverse: "rolled up into", required: false, out: false },
  { other: DO.equity_grants, otherName: "equity_grants", verb: "settles as", inverse: "settles", required: false, out: true },
];

const EVENTS = [
  { event_name: "incentive_award.approved", description: "Approver signs off on an incentive award. Payroll schedules cash amounts; equity amounts are proposed as grants on the cap table.", from_state: "proposed", to_state: "approved" },
  { event_name: "incentive_award.canceled", description: "Incentive award withdrawn before it settles.", from_state: "approved", to_state: "canceled" },
];

const TOOL = { tool_name: "query_incentive_awards", description: "Query / list / get incentive awards records.", operation_kind: "query", coverage_tier: "semantius_crud", record_status: "new" };

// ----- overwrites -----
const MODULE_DESCRIPTIONS = [
  {
    id: MOD.CAP_TABLE_GRANTS,
    from: "Option pool tracking (size, available headroom), RSU/option grant issuance with board approval, grant acceptance, vesting-schedule administration. Multi-masters equity_grants alongside COMP-MGMT (which holds the compensation-policy slice).",
    to: "Option pool tracking (size, available headroom), RSU/option grant issuance with board approval, grant acceptance, vesting-schedule administration. Masters equity_grants; the pay decision behind a grant is an incentive_awards record in COMP-INCENTIVES.",
  },
  {
    id: MOD.COMP_INCENTIVES,
    from: "Bonus, commission, and long-term equity plan administration. Masters equity_grants and folds INCENTIVE-MGMT + EQUITY-MGMT capabilities (grant lifecycle, vesting, exercise, expense tracking).",
    to: "Bonus, commission, and long-term equity plan administration. Masters incentive_awards, each person's pay decision, and folds INCENTIVE-MGMT + EQUITY-MGMT capabilities. The equity grant itself, with its vesting and exercise, is mastered in CAP-TABLE-GRANTS.",
  },
];

const HANDOFF_MOVES = [
  {
    id: 423,
    from: { source_domain_id: DOM.COMP, source_domain_module_id: MOD.COMP_INCENTIVES, handoff_label: `${COMP} → ${PAY} : equity_grant.vested` },
    to: { source_domain_id: DOM.CAP_TABLE, source_domain_module_id: MOD.CAP_TABLE_GRANTS, handoff_label: `${CAP} → ${PAY} : equity_grant.vested` },
  },
  {
    id: 424,
    from: { source_domain_id: DOM.COMP, source_domain_module_id: MOD.COMP_INCENTIVES, handoff_label: `${COMP} → ${FIN} : equity_grant.granted` },
    to: { source_domain_id: DOM.CAP_TABLE, source_domain_module_id: MOD.CAP_TABLE_GRANTS, handoff_label: `${CAP} → ${FIN} : equity_grant.granted` },
  },
  {
    id: 1150,
    from: { source_domain_id: DOM.COMP, source_domain_module_id: MOD.COMP_INCENTIVES, data_object_id: DO.compensation_statements, handoff_label: `${COMP} → ${COMP} : equity_grant.granted` },
    to: { source_domain_id: DOM.CAP_TABLE, source_domain_module_id: MOD.CAP_TABLE_GRANTS, data_object_id: DO.equity_grants, handoff_label: `${CAP} → ${COMP} : equity_grant.granted` },
  },
  {
    id: 362,
    from: { source_domain_id: 155, source_domain_module_id: null, target_domain_module_id: null, handoff_label: `Food Traceability and Provenance → ${SRM} : supplier_certification.expired` },
    to: { source_domain_id: DOM.SRM, source_domain_module_id: MOD.SRM_RISK, target_domain_module_id: MOD.SRM_LIFECYCLE, handoff_label: `${SRM} → ${SRM} : supplier_certification.expired` },
  },
];

const EQUITY_STATES = [112, 113, 114, 115, 116, 117, 118];
const CERT_STATES = [1771, 1772, 1773, 1774, 1775, 1776, 1777];
const CERT_EVENTS = [1518, 1519, 1520];

// ----- current state -----
const [existingEntity] = await get(`/data_objects?data_object_name=eq.${ENTITY.data_object_name}&select=id`);
const newId: number = existingEntity?.id ?? -1;

const before = {
  dmdo: await get("/domain_module_data_objects?id=in.(399,1379)&select=id,domain_module_data_object_label,held_as,is_install_optional"),
  equityStates: await get(`/data_object_lifecycle_states?id=in.(${EQUITY_STATES.join(",")})&select=id,data_object_lifecycle_state_label,domain_module_id`),
  certStates: await get(`/data_object_lifecycle_states?id=in.(${CERT_STATES.join(",")})&select=id,data_object_lifecycle_state_label,domain_module_id`),
  certEvents: await get(`/trigger_events?id=in.(${CERT_EVENTS.join(",")})&select=id,event_name,domain_module_id`),
  modules: await get(`/domain_modules?id=in.(${MODULE_DESCRIPTIONS.map((m) => m.id).join(",")})&select=id,domain_module_code,description`),
  handoffs: await get(`/handoffs?id=in.(${HANDOFF_MOVES.map((h) => h.id).join(",")})&select=id,handoff_label,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,trigger_event_id`),
};

// ----- refuse on drift: every overwrite must find its before or its after -----
const drift: string[] = [];
const expectOneOf = (what: string, actual: unknown, ...allowed: unknown[]) => {
  if (!allowed.includes(actual)) drift.push(`${what}: live value ${JSON.stringify(actual)} is not one of ${JSON.stringify(allowed)}`);
};
for (const r of before.dmdo) {
  if (r.id === 399) expectOneOf("dmdo 399 held_as", r.held_as, "master", "consumer");
  if (r.id === 1379) expectOneOf("dmdo 1379 held_as", r.held_as, "master", "embedded_master");
}
for (const r of before.equityStates) expectOneOf(`state ${r.id}`, r.domain_module_id, MOD.COMP_INCENTIVES, MOD.CAP_TABLE_GRANTS);
for (const r of before.certStates) expectOneOf(`state ${r.id}`, r.domain_module_id, MOD.FOOD_PROVENANCE, MOD.SRM_RISK);
for (const r of before.certEvents) expectOneOf(`event ${r.id}`, r.domain_module_id, MOD.FOOD_PROVENANCE, MOD.SRM_RISK);
for (const m of MODULE_DESCRIPTIONS) {
  const live = before.modules.find((x) => x.id === m.id);
  expectOneOf(`module ${m.id} description`, live?.description, m.from, m.to);
}
for (const h of HANDOFF_MOVES) {
  const live = before.handoffs.find((x) => x.id === h.id);
  expectOneOf(`handoff ${h.id} label`, live?.handoff_label, h.from.handoff_label, h.to.handoff_label);
}
if (drift.length) {
  console.error("DRIFT, nothing written:\n" + drift.map((d) => `  ${d}`).join("\n"));
  process.exit(1);
}

// ----- preflight -----
const usersId = DO.users;
const relRows = RELATIONSHIPS.map((r, i) => ({
  id: `incoming${i}`,
  data_object_id: r.out ? newId : r.other,
  related_data_object_id: r.out ? r.other : newId,
  relationship_type: "one_to_many",
  relationship_kind: "reference",
  relationship_verb: r.verb,
  inverse_verb: r.inverse,
  owner_side: "source",
  is_required: r.required,
}));
const stateRows = STATES.map((s) => ({ data_object_id: newId, state_name: s.state_name, requires_permission: s.requires_permission, permission_verb_override: s.permission_verb_override, process_id: null, domain_module_id: MOD.COMP_INCENTIVES }));
const eventRows = EVENTS.map((e) => ({ event_name: e.event_name, data_object_id: newId, event_category: "state_change", to_state: e.to_state }));

// New handoffs, resolved once the events exist. `event` is an event_name, or a fixed id for an existing event.
const NEW_HANDOFFS = [
  { event: "incentive_award.approved", label: `${COMP} → ${CAP} : incentive_award.approved`, target_domain: DOM.CAP_TABLE, source_module: MOD.COMP_INCENTIVES, target_module: MOD.CAP_TABLE_GRANTS, payload: DO.equity_grants, pattern: "api_call", friction: "medium", description: "An approved equity award opens a proposed grant on the cap table, where the board approves and issues it. Cash awards do not pass here.", tag: true },
  { event: "incentive_award.approved", label: `${COMP} → ${PAY} : incentive_award.approved`, target_domain: DOM.PAYROLL, source_module: MOD.COMP_INCENTIVES, target_module: MOD.PAYROLL_EARNINGS, payload: newId, pattern: "event_stream", friction: "medium", description: "Approved bonus or commission amount becomes a one-time payment in the next pay run.", tag: true },
  { event: "incentive_award.approved", label: `${COMP} → ${COMP} : incentive_award.approved`, target_domain: DOM.COMP, source_module: MOD.COMP_INCENTIVES, target_module: MOD.COMP_STATEMENTS, payload: newId, pattern: "lifecycle_progression", friction: "low", description: "Approved award included in the worker's next statement assembly.", tag: false },
  { event: "incentive_award.canceled", label: `${COMP} → ${COMP} : incentive_award.canceled`, target_domain: DOM.COMP, source_module: MOD.COMP_INCENTIVES, target_module: MOD.COMP_STATEMENTS, payload: newId, pattern: "lifecycle_progression", friction: "low", description: "Canceled award dropped from the worker's next statement assembly.", tag: false },
  { event: EVENT_MERIT_CYCLE_APPROVED, label: `${COMP} → ${COMP} : merit_cycle.approved`, target_domain: DOM.COMP, source_module: MOD.COMP_PLANNING, target_module: MOD.COMP_INCENTIVES, payload: newId, pattern: "lifecycle_progression", friction: "low", description: "Approved bonus and equity refresh amounts open incentive awards for the cycle.", tag: false },
];

const nameOf = (id: number) => (id === newId ? "incentive_awards" : RELATIONSHIPS.find((r) => r.other === id)?.otherName ?? `#${id}`);
const pre = [
  preflightRelationships(relRows, { usersId, nameOf }),
  preflightLifecycleStates(stateRows, { nameOf }),
  preflightTriggerEvents(eventRows, stateRows, { nameOf }),
];
for (const p of pre) for (const w of p.warnings) console.log(`  warn ${typeof w === "string" ? w : JSON.stringify(w)}`);
const errors = pre.flatMap((p) => p.errors);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${typeof e === "string" ? e : JSON.stringify(e)}`);
  process.exit(1);
}

// ----- plan -----
console.log(`incentive_awards: ${existingEntity ? `exists as ${newId}` : "will be created"}`);
console.log(`  ${DMDO.length} holdings, ${ALIASES.length} aliases, ${STATES.length} states, ${RELATIONSHIPS.length} relationships, ${EVENTS.length} events, 1 tool, ${NEW_HANDOFFS.length} handoffs, ${NEW_HANDOFFS.filter((h) => h.tag).length + 1} process tags`);
console.log("overwrites:");
for (const r of before.dmdo) console.log(`  dmdo ${r.id} ${r.domain_module_data_object_label}: ${r.held_as}, optional=${r.is_install_optional}`);
console.log(`  equity_grants states ${EQUITY_STATES[0]}-${EQUITY_STATES.at(-1)}: module ${[...new Set(before.equityStates.map((s) => s.domain_module_id))].join(",")} to ${MOD.CAP_TABLE_GRANTS}`);
console.log(`  supplier_certifications states ${CERT_STATES[0]}-${CERT_STATES.at(-1)}: module ${[...new Set(before.certStates.map((s) => s.domain_module_id))].join(",")} to ${MOD.SRM_RISK}`);
console.log(`  supplier_certifications events ${CERT_EVENTS.join(",")}: module ${[...new Set(before.certEvents.map((s) => s.domain_module_id))].join(",")} to ${MOD.SRM_RISK}`);
for (const h of HANDOFF_MOVES) console.log(`  handoff ${h.id}: ${h.to.handoff_label}`);
for (const m of MODULE_DESCRIPTIONS) console.log(`  module ${m.id} description`);

if (!EXECUTE) {
  console.log("\nDry-run only. Re-run with --execute to write.");
  process.exit(0);
}

// ----- backup, first run only -----
if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), loader: ".tmp_deploy/fix_two_master_entities_2026_11_03.ts", before }, null, 1));
  console.log(`\nbackup: ${BACKUP}`);
}

// ----- additive first, so a failure never leaves an entity without a master -----
const postOne = async (table: string, row: Row): Promise<any> => {
  const out = await postgrest("POST", `/${table}`, row);
  return Array.isArray(out) ? out[0] : out;
};

const entityId: number = existingEntity?.id ?? (await postOne("data_objects", ENTITY)).id;
console.log(`\ndata_objects: incentive_awards = ${entityId}`);

for (const d of DMDO) {
  const found = await get(`/domain_module_data_objects?domain_module_id=eq.${d.module}&data_object_id=eq.${entityId}&select=id`);
  if (found.length) continue;
  await postOne("domain_module_data_objects", { domain_module_data_object_label: `${d.code} / incentive_awards`, domain_module_id: d.module, data_object_id: entityId, held_as: d.held_as, is_install_optional: d.is_install_optional, notes: "" });
  console.log(`  holding ${d.code} ${d.held_as}`);
}
for (const alias_name of ALIASES) {
  const found = await get(`/data_object_aliases?data_object_id=eq.${entityId}&alias_name=eq.${alias_name}&select=id`);
  if (!found.length) await postOne("data_object_aliases", { alias_name, data_object_id: entityId, alias_type: "synonym", is_preferred: false, record_status: "new", notes: "" });
}
for (const s of STATES) {
  const found = await get(`/data_object_lifecycle_states?data_object_id=eq.${entityId}&state_name=eq.${s.state_name}&select=id`);
  if (!found.length) await postOne("data_object_lifecycle_states", { ...s, data_object_lifecycle_state_label: `incentive_awards.${s.state_name}`, data_object_id: entityId, domain_module_id: MOD.COMP_INCENTIVES, record_status: "new", notes: "", is_high_risk: false });
}
for (const r of RELATIONSHIPS) {
  const source = r.out ? entityId : r.other;
  const target = r.out ? r.other : entityId;
  const label = r.out ? `incentive_awards ${r.verb} ${r.otherName}` : `${r.otherName} ${r.verb} incentive_awards`;
  const found = await get(`/data_object_relationships?data_object_id=eq.${source}&related_data_object_id=eq.${target}&relationship_verb=eq.${encodeURIComponent(r.verb)}&select=id`);
  if (!found.length) await postOne("data_object_relationships", { data_object_relationship_label: label, data_object_id: source, related_data_object_id: target, owner_side: "source", relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: r.verb, inverse_verb: r.inverse, is_required: r.required, record_status: "new", notes: "" });
}
const eventIds = new Map<string, number>();
for (const e of EVENTS) {
  const [found] = await get(`/trigger_events?event_name=eq.${e.event_name}&select=id`);
  const id = found?.id ?? (await postOne("trigger_events", { ...e, data_object_id: entityId, event_category: "state_change", domain_module_id: MOD.COMP_INCENTIVES, record_status: "new" })).id;
  eventIds.set(e.event_name, id);
}
const toolFound = await get(`/tools?tool_name=eq.${TOOL.tool_name}&select=id`);
if (!toolFound.length) await postOne("tools", { ...TOOL, data_object_id: entityId });

const resolved = NEW_HANDOFFS.map((h) => ({ ...h, eventId: typeof h.event === "number" ? h.event : (eventIds.get(h.event) as number), payload: h.payload === newId ? entityId : h.payload }));
const existingForEvents = await get(`/handoffs?trigger_event_id=in.(${[...new Set(resolved.map((h) => h.eventId))].join(",")})&select=id,trigger_event_id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id`);
const handoffPre = preflightHandoffs(
  resolved
    .filter((h) => !existingForEvents.some((e) => e.trigger_event_id === h.eventId && e.source_domain_module_id === h.source_module && e.target_domain_module_id === h.target_module && e.data_object_id === h.payload))
    .map((h) => ({ trigger_event_id: h.eventId, source_domain_id: DOM.COMP, target_domain_id: h.target_domain, source_domain_module_id: h.source_module, target_domain_module_id: h.target_module, data_object_id: h.payload })),
  existingForEvents,
);
for (const w of handoffPre.warnings) console.log(`  warn ${typeof w === "string" ? w : JSON.stringify(w)}`);

const tags: { handoff: number; process: number }[] = [{ handoff: 1150, process: PROCESS_ADMIN_COMP }];
for (const h of resolved) {
  const found = existingForEvents.find((e) => e.trigger_event_id === h.eventId && e.source_domain_module_id === h.source_module && e.target_domain_module_id === h.target_module && e.data_object_id === h.payload);
  const id: number =
    found?.id ??
    (
      await postOne("handoffs", {
        handoff_label: h.label,
        source_domain_id: DOM.COMP,
        target_domain_id: h.target_domain,
        data_object_id: h.payload,
        integration_pattern: h.pattern,
        friction_level: h.friction,
        description: h.description,
        notes: "",
        record_status: "new",
        trigger_event_id: h.eventId,
        source_domain_module_id: h.source_module,
        target_domain_module_id: h.target_module,
      })
    ).id;
  console.log(`  handoff ${id}: ${h.label}`);
  if (h.tag) tags.push({ handoff: id, process: PROCESS_ADMIN_COMP });
}
for (const t of tags) {
  const found = await get(`/handoff_processes?handoff_id=eq.${t.handoff}&process_id=eq.${t.process}&select=id`);
  if (!found.length) await postOne("handoff_processes", { label: "", handoff_id: t.handoff, process_id: t.process, role: "implements", proposal_source: "agent_curated", notes: "", record_status: "new" });
}

// ----- overwrites -----
const patch = (table: string, ids: number[], body: Row) => postgrest("PATCH", `/${table}?id=in.(${ids.join(",")})`, body);

await patch("data_object_lifecycle_states", EQUITY_STATES, { domain_module_id: MOD.CAP_TABLE_GRANTS });
await patch("domain_module_data_objects", [399], { held_as: "consumer", is_install_optional: true });
await patch("data_object_lifecycle_states", CERT_STATES, { domain_module_id: MOD.SRM_RISK });
await patch("trigger_events", CERT_EVENTS, { domain_module_id: MOD.SRM_RISK });
await patch("domain_module_data_objects", [1379], { held_as: "embedded_master" });
for (const m of MODULE_DESCRIPTIONS) await patch("domain_modules", [m.id], { description: m.to });
for (const h of HANDOFF_MOVES) await patch("handoffs", [h.id], h.to);
console.log("overwrites applied");

// ----- verify from live -----
const masters = await get(`/domain_module_data_objects?data_object_id=in.(${DO.equity_grants},${DO.supplier_certifications},${entityId})&held_as=eq.master&select=domain_module_data_object_label`);
console.log("\nmaster rows now:");
for (const m of masters) console.log(`  ${m.domain_module_data_object_label}`);
const moved = await get(`/handoffs?id=in.(${HANDOFF_MOVES.map((h) => h.id).join(",")})&select=id,handoff_label,key`);
for (const h of moved) console.log(`  handoff ${h.id} key=${h.key}: ${h.handoff_label}`);
console.log(`\nhttps://tests.semantius.app/domain_map/data_objects?id=eq.${entityId}`);
