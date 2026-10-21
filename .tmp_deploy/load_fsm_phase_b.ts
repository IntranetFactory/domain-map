#!/usr/bin/env bun
// FSM Phase B.
// - 3 new data_objects: installed_equipment, service_pm_schedules, customer_sites
// - DMDO rows for new masters + cross-module consumer/embedded refs
// - B11 aliases for 4 existing + 3 new masters
// - B12 lifecycle states for 3 new masters; patch existing service_contracts.active verb; add cancel gate on service_work_orders
// - B6 intra-domain relationships + B7 users edges + B8 cross-domain payload edges
// - New trigger_events for new masters + service_work_order.cancelled
// - Intra-domain handoffs (B9b)
// - Cross-domain handoffs (new outbound from installed_equipment / pm_schedule)
// - B10b backfill: source_domain_module_id / target_domain_module_id on existing FSM-touching handoffs
// Idempotent. Re-runnable.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(body)], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius failed (${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, b: Row | Row[]) => call({ method: "POST", path: p, body: b });
const patch = (p: string, b: Row) => call({ method: "PATCH", path: p, body: b });
async function insert(p: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await post(p, rows.slice(i, i + CHUNK)));
  return out;
}

const FSM_DOMAIN_ID = 31;

// Existing FSM masters
const DO_SERVICE_WORK_ORDERS = 740;
const DO_FIELD_VISITS = 261;
const DO_DISPATCH_RECORDS = 262;
const DO_SERVICE_CONTRACTS = 741;
const DO_CUSTOMER_CASES = 103;
const DO_CUSTOMERS = 97;
const DO_USERS = 748;

// ============================================================
// 0. Resolve module IDs from Phase A+M
// ============================================================
console.log("[0/9] resolving module ids");
const modRows = await get(`/domain_modules?domain_id=eq.${FSM_DOMAIN_ID}&domain_module_code=in.(FSM-DISPATCH-OPS,FSM-INSTALLED-BASE,FSM-SERVICE-CONTRACTS)&select=id,domain_module_code`);
const moduleId = new Map<string, number>();
for (const m of modRows) moduleId.set(String(m.domain_module_code), Number(m.id));
const M_DISPATCH = moduleId.get("FSM-DISPATCH-OPS")!;
const M_INSTALLED = moduleId.get("FSM-INSTALLED-BASE")!;
const M_CONTRACTS = moduleId.get("FSM-SERVICE-CONTRACTS")!;
if (!M_DISPATCH || !M_INSTALLED || !M_CONTRACTS) throw new Error("FSM Phase A+M must run first");
console.log(`  M_DISPATCH=${M_DISPATCH}, M_INSTALLED=${M_INSTALLED}, M_CONTRACTS=${M_CONTRACTS}`);

// ============================================================
// 1. New data_objects
// ============================================================
console.log("\n[1/9] new data_objects");
const newDoDefs = [
  {
    data_object_name: "installed_equipment",
    singular_label: "Installed Equipment Unit",
    plural_label: "Installed Equipment",
    kind: "domain_owned",
    description: "Customer-owned equipment that the service organization installs and maintains. Carries identity (manufacturer, model, serial), placement (customer_site), and lifecycle state (active, out_of_service, decommissioned). The asset register that work orders are performed against and service contracts cover.",
    has_personal_content: false,
    has_submit_lock: false,
    has_single_approver: false,
    is_canonical_bare_word: false,
    naming_authority_rationale: "",
  },
  {
    data_object_name: "service_pm_schedules",
    singular_label: "Service PM Schedule",
    plural_label: "Service PM Schedules",
    kind: "domain_owned",
    description: "Recurring preventive-maintenance plan attached to an installed_equipment unit. Defines cadence, due date, grace window, and overdue escalation. Drives proactive work-order generation when the next service is due.",
    has_personal_content: false,
    has_submit_lock: false,
    has_single_approver: false,
    is_canonical_bare_word: false,
    naming_authority_rationale: "",
  },
  {
    data_object_name: "customer_sites",
    singular_label: "Customer Site",
    plural_label: "Customer Sites",
    kind: "domain_owned",
    description: "Physical service location belonging to a customer. One customer can have many sites (commercial chains, multi-property landlords, residential customers with multiple properties). Distinct from CRM accounts (the commercial relationship) and from internal locations (the service organization's own facilities).",
    has_personal_content: false,
    has_submit_lock: false,
    has_single_approver: false,
    is_canonical_bare_word: false,
    naming_authority_rationale: "",
  },
];

const existingNewDo = await get(`/data_objects?data_object_name=in.(${newDoDefs.map(d => d.data_object_name).join(",")})&select=id,data_object_name`);
const existingNewDoNames = new Set(existingNewDo.map(d => String(d.data_object_name)));
const missingNewDo = newDoDefs.filter(d => !existingNewDoNames.has(d.data_object_name));
if (missingNewDo.length) await insert("/data_objects", missingNewDo);

const allNewDo = await get(`/data_objects?data_object_name=in.(${newDoDefs.map(d => d.data_object_name).join(",")})&select=id,data_object_name`);
const doId = new Map<string, number>();
for (const d of allNewDo) doId.set(String(d.data_object_name), Number(d.id));
const DO_INSTALLED_EQUIPMENT = doId.get("installed_equipment")!;
const DO_SERVICE_PM_SCHEDULES = doId.get("service_pm_schedules")!;
const DO_CUSTOMER_SITES = doId.get("customer_sites")!;
console.log(`  installed_equipment=${DO_INSTALLED_EQUIPMENT}, service_pm_schedules=${DO_SERVICE_PM_SCHEDULES}, customer_sites=${DO_CUSTOMER_SITES}`);

// ============================================================
// 2. DMDO for new masters + cross-module rows
// ============================================================
console.log("\n[2/9] DMDO for new masters + cross-module rows");
const dmdoRows = [
  // FSM-INSTALLED-BASE masters
  { domain_module_id: M_INSTALLED, data_object_id: DO_INSTALLED_EQUIPMENT,   role: "master",          necessity: "required" },
  { domain_module_id: M_INSTALLED, data_object_id: DO_SERVICE_PM_SCHEDULES,  role: "master",          necessity: "required" },
  { domain_module_id: M_INSTALLED, data_object_id: DO_CUSTOMER_SITES,        role: "master",          necessity: "required" },
  // FSM-DISPATCH-OPS consumes installed_equipment + customer_sites
  { domain_module_id: M_DISPATCH,  data_object_id: DO_INSTALLED_EQUIPMENT,   role: "consumer",        necessity: "optional" },
  { domain_module_id: M_DISPATCH,  data_object_id: DO_CUSTOMER_SITES,        role: "consumer",        necessity: "required" },
  // FSM-SERVICE-CONTRACTS consumes installed_equipment + customer_sites
  { domain_module_id: M_CONTRACTS, data_object_id: DO_INSTALLED_EQUIPMENT,   role: "consumer",        necessity: "optional" },
  { domain_module_id: M_CONTRACTS, data_object_id: DO_CUSTOMER_SITES,        role: "consumer",        necessity: "optional" },
];
const existingDmdoNew = await get(`/domain_module_data_objects?domain_module_id=in.(${M_DISPATCH},${M_INSTALLED},${M_CONTRACTS})&data_object_id=in.(${DO_INSTALLED_EQUIPMENT},${DO_SERVICE_PM_SCHEDULES},${DO_CUSTOMER_SITES})&select=domain_module_id,data_object_id`);
const dmdoKey = (r: Row) => `${r.domain_module_id}|${r.data_object_id}`;
const existingDmdoNewKeys = new Set(existingDmdoNew.map(dmdoKey));
const missingDmdoNew = dmdoRows.filter(r => !existingDmdoNewKeys.has(dmdoKey(r)));
if (missingDmdoNew.length) await insert("/domain_module_data_objects", missingDmdoNew);
console.log(`  ${missingDmdoNew.length} DMDO inserted (${existingDmdoNew.length} pre-existing)`);

// ============================================================
// 3. B11 aliases
// ============================================================
console.log("\n[3/9] B11 aliases");
const aliases = [
  // service_work_orders
  { data_object_id: DO_SERVICE_WORK_ORDERS, alias_name: "job",          alias_type: "synonym" },
  { data_object_id: DO_SERVICE_WORK_ORDERS, alias_name: "service call", alias_type: "synonym" },
  { data_object_id: DO_SERVICE_WORK_ORDERS, alias_name: "ticket",       alias_type: "synonym" },
  { data_object_id: DO_SERVICE_WORK_ORDERS, alias_name: "work ticket",  alias_type: "synonym" },
  // field_visits
  { data_object_id: DO_FIELD_VISITS, alias_name: "service appointment", alias_type: "synonym" },
  { data_object_id: DO_FIELD_VISITS, alias_name: "visit",               alias_type: "synonym" },
  { data_object_id: DO_FIELD_VISITS, alias_name: "site visit",          alias_type: "synonym" },
  // dispatch_records
  { data_object_id: DO_DISPATCH_RECORDS, alias_name: "assignment",        alias_type: "synonym" },
  { data_object_id: DO_DISPATCH_RECORDS, alias_name: "dispatch",          alias_type: "synonym" },
  { data_object_id: DO_DISPATCH_RECORDS, alias_name: "tech assignment",   alias_type: "synonym" },
  // service_contracts
  { data_object_id: DO_SERVICE_CONTRACTS, alias_name: "maintenance agreement", alias_type: "synonym" },
  { data_object_id: DO_SERVICE_CONTRACTS, alias_name: "service agreement",     alias_type: "synonym" },
  { data_object_id: DO_SERVICE_CONTRACTS, alias_name: "SLA contract",          alias_type: "synonym" },
  // installed_equipment
  { data_object_id: DO_INSTALLED_EQUIPMENT, alias_name: "asset",               alias_type: "synonym" },
  { data_object_id: DO_INSTALLED_EQUIPMENT, alias_name: "serviced unit",       alias_type: "synonym" },
  { data_object_id: DO_INSTALLED_EQUIPMENT, alias_name: "installed unit",      alias_type: "synonym" },
  { data_object_id: DO_INSTALLED_EQUIPMENT, alias_name: "customer equipment",  alias_type: "synonym" },
  // service_pm_schedules
  { data_object_id: DO_SERVICE_PM_SCHEDULES, alias_name: "PM schedule",         alias_type: "synonym" },
  { data_object_id: DO_SERVICE_PM_SCHEDULES, alias_name: "maintenance schedule", alias_type: "synonym" },
  { data_object_id: DO_SERVICE_PM_SCHEDULES, alias_name: "preventive plan",     alias_type: "synonym" },
  // customer_sites
  { data_object_id: DO_CUSTOMER_SITES, alias_name: "service site",     alias_type: "synonym" },
  { data_object_id: DO_CUSTOMER_SITES, alias_name: "service address",  alias_type: "synonym" },
  { data_object_id: DO_CUSTOMER_SITES, alias_name: "service location", alias_type: "synonym" },
];
const aliasDoIds = [DO_SERVICE_WORK_ORDERS, DO_FIELD_VISITS, DO_DISPATCH_RECORDS, DO_SERVICE_CONTRACTS, DO_INSTALLED_EQUIPMENT, DO_SERVICE_PM_SCHEDULES, DO_CUSTOMER_SITES];
const existingAliases = await get(`/data_object_aliases?data_object_id=in.(${aliasDoIds.join(",")})&select=data_object_id,alias_name`);
const aliasKey = (r: Row) => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`;
const existingAliasKeys = new Set(existingAliases.map(aliasKey));
const missingAliases = aliases.filter(a => !existingAliasKeys.has(aliasKey(a)));
if (missingAliases.length) await insert("/data_object_aliases", missingAliases);
console.log(`  ${missingAliases.length} aliases inserted (${existingAliases.length} pre-existing)`);

// ============================================================
// 4. B12 lifecycle states (new masters + patches on existing)
// ============================================================
console.log("\n[4/9] B12 lifecycle states");

// Patch existing service_contracts.active verb override (currently empty)
await patch(`/data_object_lifecycle_states?data_object_id=eq.${DO_SERVICE_CONTRACTS}&state_name=eq.active`, { permission_verb_override: "activate_service_contract", domain_module_id: M_CONTRACTS });
// Set domain_module_id on remaining service_contracts states
await patch(`/data_object_lifecycle_states?data_object_id=eq.${DO_SERVICE_CONTRACTS}&domain_module_id=is.null`, { domain_module_id: M_CONTRACTS });
// Patch existing service_work_orders.completed (already has verb) + cancelled (add gate + verb) + all set module
await patch(`/data_object_lifecycle_states?data_object_id=eq.${DO_SERVICE_WORK_ORDERS}&state_name=eq.cancelled`, { requires_permission: true, permission_verb_override: "cancel_service_work_order", domain_module_id: M_DISPATCH });
await patch(`/data_object_lifecycle_states?data_object_id=eq.${DO_SERVICE_WORK_ORDERS}&domain_module_id=is.null`, { domain_module_id: M_DISPATCH });
// Set domain_module_id on existing field_visits and dispatch_records states
await patch(`/data_object_lifecycle_states?data_object_id=eq.${DO_FIELD_VISITS}&domain_module_id=is.null`, { domain_module_id: M_DISPATCH });
await patch(`/data_object_lifecycle_states?data_object_id=eq.${DO_DISPATCH_RECORDS}&domain_module_id=is.null`, { domain_module_id: M_DISPATCH });
console.log("  patched existing lifecycle rows (verb + domain_module_id)");

type LS = {
  data_object_id: number;
  state_name: string;
  state_order: number;
  description: string;
  is_initial: boolean;
  is_terminal: boolean;
  requires_permission: boolean;
  permission_verb_override: string;
  domain_module_id: number;
};
const newStates: LS[] = [
  // installed_equipment
  { data_object_id: DO_INSTALLED_EQUIPMENT, state_name: "pending_install",  state_order: 1, is_initial: true,  is_terminal: false, requires_permission: false, permission_verb_override: "",                       description: "Unit purchased and tracked; physical installation not yet performed.",                                                              domain_module_id: M_INSTALLED },
  { data_object_id: DO_INSTALLED_EQUIPMENT, state_name: "active",           state_order: 2, is_initial: false, is_terminal: false, requires_permission: true,  permission_verb_override: "activate_equipment",     description: "Unit installed and operational. Eligible for PM schedules and reactive work orders.",                                              domain_module_id: M_INSTALLED },
  { data_object_id: DO_INSTALLED_EQUIPMENT, state_name: "service_due",      state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "",                       description: "PM cycle is due or reactive issue is open. Cleared when the work order completes.",                                                domain_module_id: M_INSTALLED },
  { data_object_id: DO_INSTALLED_EQUIPMENT, state_name: "out_of_service",   state_order: 4, is_initial: false, is_terminal: false, requires_permission: true,  permission_verb_override: "mark_out_of_service",    description: "Unit is non-operational pending repair. PM schedules paused; reactive work orders still allowed.",                                  domain_module_id: M_INSTALLED },
  { data_object_id: DO_INSTALLED_EQUIPMENT, state_name: "decommissioned",   state_order: 5, is_initial: false, is_terminal: true,  requires_permission: true,  permission_verb_override: "decommission_equipment", description: "Unit permanently removed from service. Triggers contract coverage termination and PM schedule cancellation.",                       domain_module_id: M_INSTALLED },
  { data_object_id: DO_INSTALLED_EQUIPMENT, state_name: "replaced",         state_order: 6, is_initial: false, is_terminal: true,  requires_permission: true,  permission_verb_override: "replace_equipment",      description: "Unit physically replaced by a new installed_equipment record. The replacement carries forward warranty and contract coverage.",   domain_module_id: M_INSTALLED },
  // service_pm_schedules
  { data_object_id: DO_SERVICE_PM_SCHEDULES, state_name: "scheduled",  state_order: 1, is_initial: true,  is_terminal: false, requires_permission: false, permission_verb_override: "",                description: "Future PM cycle scheduled. No action required yet.",                                                          domain_module_id: M_INSTALLED },
  { data_object_id: DO_SERVICE_PM_SCHEDULES, state_name: "due",        state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "",                description: "Cycle has reached its due date. Triggers proactive work-order generation.",                                  domain_module_id: M_INSTALLED },
  { data_object_id: DO_SERVICE_PM_SCHEDULES, state_name: "in_grace",   state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "",                description: "Cycle past due date but inside the grace window; auto-escalates to overdue on grace expiry.",                domain_module_id: M_INSTALLED },
  { data_object_id: DO_SERVICE_PM_SCHEDULES, state_name: "overdue",    state_order: 4, is_initial: false, is_terminal: false, requires_permission: true,  permission_verb_override: "escalate_overdue", description: "Cycle past grace; alert sent to account manager. Triggers a high-priority service work order if one is not already open.",   domain_module_id: M_INSTALLED },
  { data_object_id: DO_SERVICE_PM_SCHEDULES, state_name: "completed",  state_order: 5, is_initial: false, is_terminal: true,  requires_permission: true,  permission_verb_override: "complete_pm",      description: "Cycle satisfied by a closed work order. Triggers the next cycle to be scheduled.",                          domain_module_id: M_INSTALLED },
  { data_object_id: DO_SERVICE_PM_SCHEDULES, state_name: "skipped",    state_order: 6, is_initial: false, is_terminal: true,  requires_permission: true,  permission_verb_override: "skip_pm",          description: "Cycle deliberately skipped (customer refused service, equipment decommissioned mid-cycle, contract lapsed).",                  domain_module_id: M_INSTALLED },
  // customer_sites
  { data_object_id: DO_CUSTOMER_SITES, state_name: "prospect",   state_order: 1, is_initial: true,  is_terminal: false, requires_permission: false, permission_verb_override: "",         description: "Site captured during sales/quote phase; no service has been performed yet.",                  domain_module_id: M_INSTALLED },
  { data_object_id: DO_CUSTOMER_SITES, state_name: "active",     state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "",         description: "Site is in service; one or more installed_equipment units or active work orders exist.",        domain_module_id: M_INSTALLED },
  { data_object_id: DO_CUSTOMER_SITES, state_name: "inactive",   state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "",         description: "Site temporarily not serviced (seasonal closure, customer pause). Equipment remains on file.",  domain_module_id: M_INSTALLED },
  { data_object_id: DO_CUSTOMER_SITES, state_name: "terminated", state_order: 4, is_initial: false, is_terminal: true,  requires_permission: true,  permission_verb_override: "terminate_site", description: "Site removed from service (sold, demolished, customer churn). Triggers contract and PM termination.", domain_module_id: M_INSTALLED },
];

const existingNewStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${DO_INSTALLED_EQUIPMENT},${DO_SERVICE_PM_SCHEDULES},${DO_CUSTOMER_SITES})&select=data_object_id,state_name`);
const stateKey = (r: Row) => `${r.data_object_id}|${r.state_name}`;
const existingNewStateKeys = new Set(existingNewStates.map(stateKey));
const missingNewStates = newStates.filter(s => !existingNewStateKeys.has(stateKey(s)));
if (missingNewStates.length) await insert("/data_object_lifecycle_states", missingNewStates);
console.log(`  ${missingNewStates.length} new lifecycle states inserted (${existingNewStates.length} pre-existing)`);

// ============================================================
// 5. B6 relationships + B7 users edges + B8 cross-domain
// ============================================================
console.log("\n[5/9] B6 + B7 + B8 relationships");
type RR = {
  data_object_id: number;
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: string;
  relationship_kind: string;
  is_required: boolean;
  owner_side: string;
};
const rels: RR[] = [
  // Intra-domain (FSM masters only). Convention: source is the "one" side; type=one_to_many flips the natural direction so the FK lives on the target.
  { data_object_id: DO_SERVICE_WORK_ORDERS, related_data_object_id: DO_FIELD_VISITS,         relationship_verb: "fulfilled_by",  inverse_verb: "fulfills",        relationship_type: "one_to_many", relationship_kind: "composition", is_required: true,  owner_side: "source" },
  { data_object_id: DO_FIELD_VISITS,        related_data_object_id: DO_DISPATCH_RECORDS,    relationship_verb: "dispatched_by", inverse_verb: "dispatches",      relationship_type: "one_to_one",  relationship_kind: "reference",   is_required: true,  owner_side: "source" },
  { data_object_id: DO_INSTALLED_EQUIPMENT, related_data_object_id: DO_SERVICE_WORK_ORDERS, relationship_verb: "serviced_by",   inverse_verb: "services",        relationship_type: "one_to_many", relationship_kind: "reference",   is_required: false, owner_side: "target" },
  { data_object_id: DO_CUSTOMER_SITES,      related_data_object_id: DO_SERVICE_WORK_ORDERS, relationship_verb: "hosts",         inverse_verb: "performed_at",    relationship_type: "one_to_many", relationship_kind: "reference",   is_required: true,  owner_side: "target" },
  { data_object_id: DO_SERVICE_CONTRACTS,   related_data_object_id: DO_INSTALLED_EQUIPMENT, relationship_verb: "covers",        inverse_verb: "covered_by",      relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  { data_object_id: DO_INSTALLED_EQUIPMENT, related_data_object_id: DO_SERVICE_PM_SCHEDULES, relationship_verb: "has_pm",       inverse_verb: "scheduled_for",   relationship_type: "one_to_many", relationship_kind: "reference",   is_required: true,  owner_side: "target" },
  { data_object_id: DO_CUSTOMER_SITES,      related_data_object_id: DO_INSTALLED_EQUIPMENT, relationship_verb: "hosts_equipment", inverse_verb: "located_at",    relationship_type: "one_to_many", relationship_kind: "reference",   is_required: true,  owner_side: "target" },
  // Cross-domain payload edges (FSM to CRM): customers is the "one" side
  { data_object_id: DO_CUSTOMERS,           related_data_object_id: DO_CUSTOMER_SITES,      relationship_verb: "owns_sites",    inverse_verb: "belongs_to",      relationship_type: "one_to_many", relationship_kind: "reference",   is_required: true,  owner_side: "target" },
  { data_object_id: DO_CUSTOMERS,           related_data_object_id: DO_SERVICE_CONTRACTS,   relationship_verb: "is_party_to",   inverse_verb: "written_for",     relationship_type: "one_to_many", relationship_kind: "reference",   is_required: true,  owner_side: "target" },
  // users edges (B7) — owner_side=target by convention (users is the related)
  { data_object_id: DO_USERS, related_data_object_id: DO_FIELD_VISITS,         relationship_verb: "performs_as_technician", inverse_verb: "performed_by",  relationship_type: "one_to_many", relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_DISPATCH_RECORDS,    relationship_verb: "assigned_as_technician", inverse_verb: "assigned_to",   relationship_type: "one_to_many", relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_DISPATCH_RECORDS,    relationship_verb: "dispatches",             inverse_verb: "dispatched_by", relationship_type: "one_to_many", relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_SERVICE_WORK_ORDERS, relationship_verb: "creates_work_order",     inverse_verb: "created_by",    relationship_type: "one_to_many", relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_SERVICE_CONTRACTS,   relationship_verb: "manages_as_account_mgr", inverse_verb: "managed_by",    relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_INSTALLED_EQUIPMENT, relationship_verb: "installs",               inverse_verb: "installed_by",  relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_SERVICE_PM_SCHEDULES, relationship_verb: "completes_pm",          inverse_verb: "completed_by",  relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "target" },
];

const relCheckIds = [DO_SERVICE_WORK_ORDERS, DO_FIELD_VISITS, DO_DISPATCH_RECORDS, DO_SERVICE_CONTRACTS, DO_INSTALLED_EQUIPMENT, DO_SERVICE_PM_SCHEDULES, DO_CUSTOMER_SITES, DO_USERS];
const existingRels = await get(`/data_object_relationships?data_object_id=in.(${relCheckIds.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`);
const relKey = (r: Row) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`;
const existingRelKeys = new Set(existingRels.map(relKey));
const missingRels = rels.filter(r => !existingRelKeys.has(relKey(r)));
if (missingRels.length) await insert("/data_object_relationships", missingRels);
console.log(`  ${missingRels.length} relationships inserted (${existingRels.length} pre-existing)`);

// ============================================================
// 6. trigger_events
// ============================================================
console.log("\n[6/9] trigger_events");
const newEvents = [
  { event_name: "installed_equipment.installed",       data_object_id: DO_INSTALLED_EQUIPMENT,  event_category: "lifecycle",    from_state: "pending_install", to_state: "active",          description: "An installed_equipment unit has been physically installed and activated. Triggers PM schedule creation and contract coverage start." },
  { event_name: "installed_equipment.service_due",     data_object_id: DO_INSTALLED_EQUIPMENT,  event_category: "state_change", from_state: "active",          to_state: "service_due",     description: "A PM cycle is due on the unit. Drives proactive work-order generation." },
  { event_name: "installed_equipment.out_of_service",  data_object_id: DO_INSTALLED_EQUIPMENT,  event_category: "state_change", from_state: "active",          to_state: "out_of_service",  description: "Equipment marked non-operational. PM schedules pause; reactive work orders allowed." },
  { event_name: "installed_equipment.decommissioned",  data_object_id: DO_INSTALLED_EQUIPMENT,  event_category: "lifecycle",    from_state: "active",          to_state: "decommissioned",  description: "Unit permanently retired. Triggers contract termination and PM cancellation." },
  { event_name: "service_pm_schedule.due",             data_object_id: DO_SERVICE_PM_SCHEDULES, event_category: "threshold",    from_state: "scheduled",       to_state: "due",             description: "PM cycle hit due date. Work order should be generated." },
  { event_name: "service_pm_schedule.overdue",         data_object_id: DO_SERVICE_PM_SCHEDULES, event_category: "threshold",    from_state: "in_grace",        to_state: "overdue",         description: "PM cycle past grace window. Escalation alert sent to account manager." },
  { event_name: "service_pm_schedule.completed",       data_object_id: DO_SERVICE_PM_SCHEDULES, event_category: "lifecycle",    from_state: "due",             to_state: "completed",       description: "PM cycle satisfied by a closed work order. Triggers next-cycle scheduling." },
  { event_name: "customer_site.activated",             data_object_id: DO_CUSTOMER_SITES,       event_category: "lifecycle",    from_state: "prospect",        to_state: "active",          description: "Site moves from prospect to active service. May trigger CRM account update and contract creation." },
  { event_name: "customer_site.terminated",            data_object_id: DO_CUSTOMER_SITES,       event_category: "lifecycle",    from_state: "active",          to_state: "terminated",      description: "Site removed from service. Triggers contract termination and PM cancellation on all equipment at the site." },
  { event_name: "service_work_order.cancelled",        data_object_id: DO_SERVICE_WORK_ORDERS,  event_category: "lifecycle",    from_state: "scheduled",       to_state: "cancelled",       description: "Work order cancelled (customer change, duplicate, no longer needed)." },
];
const existingEventsRows = await get(`/trigger_events?event_name=in.(${newEvents.map(e => e.event_name).join(",")})&select=id,event_name`);
const existingEventNames = new Set(existingEventsRows.map(e => String(e.event_name)));
const missingEvents = newEvents.filter(e => !existingEventNames.has(e.event_name));
if (missingEvents.length) await insert("/trigger_events", missingEvents);
console.log(`  ${missingEvents.length} trigger_events inserted (${existingEventsRows.length} pre-existing)`);

// Resolve trigger_event id map (existing + new) for handoff inserts
const eventNamesNeeded = [
  ...newEvents.map(e => e.event_name),
  "service_work_order.completed",
  "service_work_order.assigned",
  "service_work_order.created",
  "service_contract.activated",
  "service_contract.expired",
];
const allEventRows = await get(`/trigger_events?event_name=in.(${eventNamesNeeded.join(",")})&select=id,event_name,data_object_id`);
const eventId = new Map<string, number>();
const eventDoId = new Map<string, number>();
for (const e of allEventRows) {
  eventId.set(String(e.event_name), Number(e.id));
  eventDoId.set(String(e.event_name), Number(e.data_object_id));
}

// ============================================================
// 7. handoffs (cross-domain new + intra-domain new)
// ============================================================
console.log("\n[7/9] handoffs (new)");

// Domain id helper map
const CRM_DOMAIN = 69;
const EAM_DOMAIN = 53;

type Hand = {
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id: number | null;
  target_domain_module_id: number | null;
  trigger_event_id: number;
  data_object_id: number;
  integration_pattern: string;
  friction_level: string;
  description: string;
};
const newHandoffs: Hand[] = [
  // Intra-domain (lifecycle_progression)
  { source_domain_id: FSM_DOMAIN_ID, target_domain_id: FSM_DOMAIN_ID, source_domain_module_id: M_INSTALLED, target_domain_module_id: M_DISPATCH,  trigger_event_id: eventId.get("service_pm_schedule.due")!,       data_object_id: DO_SERVICE_WORK_ORDERS, integration_pattern: "lifecycle_progression", friction_level: "low",    description: "PM cycle hits due date in INSTALLED-BASE; DISPATCH-OPS generates the proactive service work order to fulfill the cycle." },
  { source_domain_id: FSM_DOMAIN_ID, target_domain_id: FSM_DOMAIN_ID, source_domain_module_id: M_INSTALLED, target_domain_module_id: M_DISPATCH,  trigger_event_id: eventId.get("service_pm_schedule.overdue")!,   data_object_id: DO_SERVICE_WORK_ORDERS, integration_pattern: "lifecycle_progression", friction_level: "medium", description: "PM cycle past grace; DISPATCH-OPS creates a high-priority work order to recover the missed cycle." },
  { source_domain_id: FSM_DOMAIN_ID, target_domain_id: FSM_DOMAIN_ID, source_domain_module_id: M_INSTALLED, target_domain_module_id: M_CONTRACTS, trigger_event_id: eventId.get("installed_equipment.decommissioned")!, data_object_id: DO_SERVICE_CONTRACTS,  integration_pattern: "lifecycle_progression", friction_level: "medium", description: "Equipment decommissioned in INSTALLED-BASE; SERVICE-CONTRACTS removes coverage and adjusts the recurring billing." },
  { source_domain_id: FSM_DOMAIN_ID, target_domain_id: FSM_DOMAIN_ID, source_domain_module_id: M_CONTRACTS, target_domain_module_id: M_DISPATCH,  trigger_event_id: eventId.get("service_contract.activated")!,    data_object_id: DO_SERVICE_WORK_ORDERS, integration_pattern: "lifecycle_progression", friction_level: "low",    description: "Contract activated in SERVICE-CONTRACTS; DISPATCH-OPS begins enforcing SLA terms on covered equipment's work orders." },
  { source_domain_id: FSM_DOMAIN_ID, target_domain_id: FSM_DOMAIN_ID, source_domain_module_id: M_DISPATCH,  target_domain_module_id: M_INSTALLED, trigger_event_id: eventId.get("service_work_order.completed")!,  data_object_id: DO_INSTALLED_EQUIPMENT, integration_pattern: "lifecycle_progression", friction_level: "low",    description: "Work order completed in DISPATCH-OPS; INSTALLED-BASE updates last_serviced_at on the unit and advances PM schedule." },
  { source_domain_id: FSM_DOMAIN_ID, target_domain_id: FSM_DOMAIN_ID, source_domain_module_id: M_CONTRACTS, target_domain_module_id: M_INSTALLED, trigger_event_id: eventId.get("service_contract.expired")!,      data_object_id: DO_INSTALLED_EQUIPMENT, integration_pattern: "lifecycle_progression", friction_level: "low",    description: "Contract expired; INSTALLED-BASE flips covered equipment to uncovered status, affecting PM scheduling eligibility." },
  // Cross-domain new outbound
  { source_domain_id: FSM_DOMAIN_ID, target_domain_id: EAM_DOMAIN, source_domain_module_id: M_INSTALLED, target_domain_module_id: null, trigger_event_id: eventId.get("installed_equipment.decommissioned")!, data_object_id: DO_INSTALLED_EQUIPMENT, integration_pattern: "api_call", friction_level: "medium", description: "Customer-side equipment decommissioned; EAM-side asset retirement workflow updates the partner-mastered asset record." },
  { source_domain_id: FSM_DOMAIN_ID, target_domain_id: CRM_DOMAIN, source_domain_module_id: M_INSTALLED, target_domain_module_id: null, trigger_event_id: eventId.get("service_pm_schedule.overdue")!,        data_object_id: DO_CUSTOMERS,           integration_pattern: "api_call", friction_level: "medium", description: "PM overdue on equipment at customer site; CRM account-manager receives escalation signal for proactive outreach." },
  { source_domain_id: FSM_DOMAIN_ID, target_domain_id: CRM_DOMAIN, source_domain_module_id: M_INSTALLED, target_domain_module_id: null, trigger_event_id: eventId.get("customer_site.activated")!,            data_object_id: DO_CUSTOMERS,           integration_pattern: "api_call", friction_level: "low",    description: "New customer site activated; CRM enriches the account record with the service-address footprint." },
];

const existingHandoffsRows = await get(`/handoffs?or=(source_domain_id.eq.${FSM_DOMAIN_ID},target_domain_id.eq.${FSM_DOMAIN_ID})&select=id,source_domain_id,target_domain_id,trigger_event_id,data_object_id`);
const handKey = (r: Row) => `${r.source_domain_id}|${r.target_domain_id}|${r.trigger_event_id}|${r.data_object_id}`;
const existingHandKeys = new Set(existingHandoffsRows.map(handKey));
const missingHandoffs = newHandoffs.filter(h => !existingHandKeys.has(handKey(h)));
if (missingHandoffs.length) await insert("/handoffs", missingHandoffs);
console.log(`  ${missingHandoffs.length} handoffs inserted (${existingHandoffsRows.length} pre-existing on FSM)`);

// ============================================================
// 8. B10b backfill: source_domain_module_id / target_domain_module_id on existing FSM handoffs
// ============================================================
console.log("\n[8/9] B10b backfill");

// Build data_object -> module resolver for FSM masters
const fsmDataObjectToModule: Record<number, number> = {
  [DO_SERVICE_WORK_ORDERS]:   M_DISPATCH,
  [DO_FIELD_VISITS]:          M_DISPATCH,
  [DO_DISPATCH_RECORDS]:      M_DISPATCH,
  [DO_INSTALLED_EQUIPMENT]:   M_INSTALLED,
  [DO_SERVICE_PM_SCHEDULES]:  M_INSTALLED,
  [DO_CUSTOMER_SITES]:        M_INSTALLED,
  [DO_SERVICE_CONTRACTS]:     M_CONTRACTS,
};

const allFsmHandoffs = await get(`/handoffs?or=(source_domain_id.eq.${FSM_DOMAIN_ID},target_domain_id.eq.${FSM_DOMAIN_ID})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,trigger_event:trigger_events(data_object_id)`);

let srcPatched = 0, tgtPatched = 0;
for (const h of allFsmHandoffs) {
  const trig = h.trigger_event as Row | null;
  const trigDoId = trig ? Number(trig.data_object_id) : null;
  // source side: only patch if source is FSM and currently NULL
  if (Number(h.source_domain_id) === FSM_DOMAIN_ID && h.source_domain_module_id == null && trigDoId != null) {
    const srcMod = fsmDataObjectToModule[trigDoId];
    if (srcMod) {
      await patch(`/handoffs?id=eq.${h.id}`, { source_domain_module_id: srcMod });
      srcPatched++;
    }
  }
  // target side: only patch if target is FSM and currently NULL
  if (Number(h.target_domain_id) === FSM_DOMAIN_ID && h.target_domain_module_id == null) {
    const payloadDoId = Number(h.data_object_id);
    const tgtMod = fsmDataObjectToModule[payloadDoId];
    if (tgtMod) {
      await patch(`/handoffs?id=eq.${h.id}`, { target_domain_module_id: tgtMod });
      tgtPatched++;
    }
  }
}
console.log(`  patched source_domain_module_id on ${srcPatched} rows; target_domain_module_id on ${tgtPatched} rows`);

// ============================================================
// 9. Verification
// ============================================================
console.log("\n[9/9] verification");
const finalDo = await get(`/data_objects?id=in.(${DO_INSTALLED_EQUIPMENT},${DO_SERVICE_PM_SCHEDULES},${DO_CUSTOMER_SITES})&select=id`);
const finalAliases = await get(`/data_object_aliases?data_object_id=in.(${aliasDoIds.join(",")})&select=id`);
const finalStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${DO_INSTALLED_EQUIPMENT},${DO_SERVICE_PM_SCHEDULES},${DO_CUSTOMER_SITES},${DO_SERVICE_WORK_ORDERS},${DO_SERVICE_CONTRACTS})&select=id`);
const finalRels = await get(`/data_object_relationships?data_object_id=in.(${relCheckIds.join(",")})&select=id`);
const finalHandoffs = await get(`/handoffs?or=(source_domain_id.eq.${FSM_DOMAIN_ID},target_domain_id.eq.${FSM_DOMAIN_ID})&select=id`);
const handoffsWithModuleFK = await get(`/handoffs?source_domain_id=eq.${FSM_DOMAIN_ID}&source_domain_module_id=not.is.null&select=id`);
console.log(`  new data_objects=${finalDo.length}/3`);
console.log(`  aliases on FSM masters=${finalAliases.length}`);
console.log(`  lifecycle states on new + augmented masters=${finalStates.length}`);
console.log(`  relationships on FSM masters=${finalRels.length}`);
console.log(`  FSM handoffs total=${finalHandoffs.length}, with source_module set (outbound)=${handoffsWithModuleFK.length}`);
console.log("\nPhase B complete. UI:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
console.log("  https://tests.semantius.app/domain_map/handoffs");
