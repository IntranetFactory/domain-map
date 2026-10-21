#!/usr/bin/env bun
// MA domain review (2026-06-08): execute every agent-doable additive/corrective fix
// surfaced by the prior audits, now unblocked under Rule #21 (review EXECUTES additive
// work at record_status='new' for in-record review; no chat gate).
//
// Scope (all additive/corrective, nothing destructive):
//   B13  classify entity_type on the 5 masters
//   B4   pattern-flag re-evaluation (PATCH default-false flags per vendor shape)
//   B12  lifecycle states for the operational_workflow masters (campaigns/emails/journeys/forms)
//   B6   intra-domain data_object_relationships among the 5 masters
//   B7   users -> master actor edges (Rule #10)
//   B11  data_object_aliases (vendor terminology; Rule #18 commerce-allowed surface)
//   E1-3 personas (domain_roles) + reach (role_modules) for the 4-module domain
//
// Idempotent: reads live state and skips anything already present. All inserts omit
// record_status (DB default 'new', Rule #1) and leave notes='' (Rule #15).

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
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
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}
async function patch(path: string, body: Row): Promise<void> { await call({ method: "PATCH", path, body }); }

// Master + module ids (verified live 2026-06-08)
const CAMPAIGNS = 116, EMAILS = 117, LEADSCORES = 118, JOURNEYS = 119, FORMS = 120, USERS = 748;
const M_CAMPAIGN = 197, M_JOURNEY = 198, M_LEADSCORE = 199, M_FORMS = 200;

// ------------------------------------------------------------------
// B13 — entity_type classification + B4 — pattern flags
// ------------------------------------------------------------------
const masterPatch: Record<number, Row> = {
  [CAMPAIGNS]:  { entity_type: "operational_workflow", has_submit_lock: true },
  [EMAILS]:     { entity_type: "operational_workflow", has_submit_lock: true },
  [LEADSCORES]: { entity_type: "computed" }, // derived score; no lifecycle (B12 exempt)
  [JOURNEYS]:   { entity_type: "operational_workflow", has_submit_lock: true },
  [FORMS]:      { entity_type: "operational_workflow", has_personal_content: true },
};

console.log("== B13/B4: classify entity_type + pattern flags ==");
const liveMasters = await get(
  `/data_objects?id=in.(${[CAMPAIGNS, EMAILS, LEADSCORES, JOURNEYS, FORMS].join(",")})` +
  `&select=id,entity_type,has_submit_lock,has_personal_content`,
);
for (const m of liveMasters) {
  const id = Number(m.id);
  const want = masterPatch[id];
  const diff: Row = {};
  for (const [k, v] of Object.entries(want)) if (m[k] !== v) diff[k] = v;
  if (Object.keys(diff).length > 0) {
    await patch(`/data_objects?id=eq.${id}`, diff);
    console.log(`  PATCH do ${id}: ${JSON.stringify(diff)}`);
  } else {
    console.log(`  do ${id}: already correct`);
  }
}

// ------------------------------------------------------------------
// B12 — lifecycle states (operational_workflow masters only)
// ------------------------------------------------------------------
type LState = {
  data_object_id: number; state_name: string; state_order: number;
  is_initial: boolean; is_terminal: boolean; requires_permission: boolean;
  permission_verb_override: string; domain_module_id: number; description: string;
};
const lifecycle: LState[] = [
  // marketing_campaigns -> MA-CAMPAIGN-AUTHORING (197)
  { data_object_id: CAMPAIGNS, state_name: "draft",     state_order: 10, is_initial: true,  is_terminal: false, requires_permission: false, permission_verb_override: "",                domain_module_id: M_CAMPAIGN, description: "Campaign under construction; not yet running." },
  { data_object_id: CAMPAIGNS, state_name: "active",    state_order: 20, is_initial: false, is_terminal: false, requires_permission: true,  permission_verb_override: "launch_campaign", domain_module_id: M_CAMPAIGN, description: "Campaign launched and running; definition locked." },
  { data_object_id: CAMPAIGNS, state_name: "completed", state_order: 30, is_initial: false, is_terminal: true,  requires_permission: false, permission_verb_override: "",                domain_module_id: M_CAMPAIGN, description: "Campaign finished; retained for reporting." },
  // marketing_emails -> MA-CAMPAIGN-AUTHORING (197)
  { data_object_id: EMAILS, state_name: "draft",     state_order: 10, is_initial: true,  is_terminal: false, requires_permission: false, permission_verb_override: "",                    domain_module_id: M_CAMPAIGN, description: "Email being drafted." },
  { data_object_id: EMAILS, state_name: "scheduled", state_order: 20, is_initial: false, is_terminal: false, requires_permission: true,  permission_verb_override: "send_marketing_email", domain_module_id: M_CAMPAIGN, description: "Email scheduled for send; content locked." },
  { data_object_id: EMAILS, state_name: "sent",      state_order: 30, is_initial: false, is_terminal: true,  requires_permission: false, permission_verb_override: "",                    domain_module_id: M_CAMPAIGN, description: "Email dispatched to the audience." },
  // nurture_journeys -> MA-JOURNEY-ORCH (198)
  { data_object_id: JOURNEYS, state_name: "draft",     state_order: 10, is_initial: true,  is_terminal: false, requires_permission: false, permission_verb_override: "",                       domain_module_id: M_JOURNEY, description: "Journey being designed." },
  { data_object_id: JOURNEYS, state_name: "active",    state_order: 20, is_initial: false, is_terminal: false, requires_permission: true,  permission_verb_override: "activate_nurture_journey", domain_module_id: M_JOURNEY, description: "Journey live; enrolling and progressing contacts; definition locked." },
  { data_object_id: JOURNEYS, state_name: "paused",    state_order: 30, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "",                       domain_module_id: M_JOURNEY, description: "Journey temporarily halted; enrollments held." },
  { data_object_id: JOURNEYS, state_name: "completed", state_order: 40, is_initial: false, is_terminal: true,  requires_permission: false, permission_verb_override: "",                       domain_module_id: M_JOURNEY, description: "Journey ended." },
  // marketing_forms -> MA-LANDING-FORMS (200)
  { data_object_id: FORMS, state_name: "draft",     state_order: 10, is_initial: true,  is_terminal: false, requires_permission: false, permission_verb_override: "",            domain_module_id: M_FORMS, description: "Form being built." },
  { data_object_id: FORMS, state_name: "published", state_order: 20, is_initial: false, is_terminal: false, requires_permission: true,  permission_verb_override: "publish_form", domain_module_id: M_FORMS, description: "Form live and collecting submissions." },
  { data_object_id: FORMS, state_name: "archived",  state_order: 30, is_initial: false, is_terminal: true,  requires_permission: false, permission_verb_override: "",            domain_module_id: M_FORMS, description: "Form retired; no longer accepting submissions." },
];

console.log("== B12: lifecycle states ==");
const existStates = await get(
  `/data_object_lifecycle_states?data_object_id=in.(${[CAMPAIGNS, EMAILS, JOURNEYS, FORMS].join(",")})&select=data_object_id,state_name`,
);
const stateKey = (r: Row) => `${r.data_object_id}|${r.state_name}`;
const haveStates = new Set(existStates.map(stateKey));
const newStates = lifecycle.filter(s => !haveStates.has(stateKey(s)));
if (newStates.length) { await insert("/data_object_lifecycle_states", newStates as Row[]); }
console.log(`  inserted ${newStates.length} lifecycle states (${existStates.length} already present)`);

// ------------------------------------------------------------------
// B6 + B7 — data_object_relationships (intra-domain + users edges)
// ------------------------------------------------------------------
type Rel = {
  data_object_id: number; related_data_object_id: number;
  relationship_type: string; relationship_kind: string;
  relationship_verb: string; inverse_verb: string;
  is_required: boolean; owner_side: string;
};
const rels: Rel[] = [
  // B6 intra-domain
  { data_object_id: CAMPAIGNS, related_data_object_id: EMAILS,     relationship_type: "one_to_many",  relationship_kind: "reference", relationship_verb: "includes",  inverse_verb: "part_of",       is_required: false, owner_side: "source" },
  { data_object_id: JOURNEYS,  related_data_object_id: EMAILS,     relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "sends",     inverse_verb: "sent_by",       is_required: false, owner_side: "source" },
  { data_object_id: FORMS,     related_data_object_id: LEADSCORES, relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "feeds",     inverse_verb: "fed_by",        is_required: false, owner_side: "source" },
  { data_object_id: LEADSCORES,related_data_object_id: JOURNEYS,   relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "triggers",  inverse_verb: "triggered_by",  is_required: false, owner_side: "source" },
  { data_object_id: CAMPAIGNS, related_data_object_id: JOURNEYS,   relationship_type: "one_to_many",  relationship_kind: "reference", relationship_verb: "includes",  inverse_verb: "part_of",       is_required: false, owner_side: "source" },
  // B7 users edges
  { data_object_id: USERS, related_data_object_id: CAMPAIGNS,  relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "owns",       inverse_verb: "owned_by",      is_required: false, owner_side: "source" },
  { data_object_id: USERS, related_data_object_id: EMAILS,     relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "authors",    inverse_verb: "authored_by",   is_required: false, owner_side: "source" },
  { data_object_id: USERS, related_data_object_id: JOURNEYS,   relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "owns",       inverse_verb: "owned_by",      is_required: false, owner_side: "source" },
  { data_object_id: USERS, related_data_object_id: FORMS,      relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "owns",       inverse_verb: "owned_by",      is_required: false, owner_side: "source" },
  { data_object_id: USERS, related_data_object_id: LEADSCORES, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "configures", inverse_verb: "configured_by", is_required: false, owner_side: "source" },
];

console.log("== B6/B7: data_object_relationships ==");
const allMasterIds = [CAMPAIGNS, EMAILS, LEADSCORES, JOURNEYS, FORMS, USERS].join(",");
const existRels = await get(
  `/data_object_relationships?or=(data_object_id.in.(${allMasterIds}),related_data_object_id.in.(${allMasterIds}))&select=data_object_id,related_data_object_id`,
);
const relKey = (r: Row) => `${r.data_object_id}|${r.related_data_object_id}`;
const haveRels = new Set(existRels.map(relKey));
const newRels = rels.filter(r => !haveRels.has(relKey(r)));
if (newRels.length) { await insert("/data_object_relationships", newRels as Row[]); }
console.log(`  inserted ${newRels.length} relationships (${existRels.length} pre-existing on these endpoints)`);

// ------------------------------------------------------------------
// B11 — data_object_aliases (Rule #18 commerce-allowed; Rule #15 notes empty)
// ------------------------------------------------------------------
type Alias = { data_object_id: number; alias_name: string; alias_type: string; is_preferred: boolean };
// alias_type kept at 'synonym' for all: these are cross-vendor terms, not tied to one
// solution_id (a 'solution_term' would require Solution context per the DB check constraint).
const aliases: Alias[] = [
  { data_object_id: CAMPAIGNS, alias_name: "Marketing Program", alias_type: "synonym", is_preferred: false },
  { data_object_id: CAMPAIGNS, alias_name: "Program",           alias_type: "synonym", is_preferred: false },
  { data_object_id: EMAILS,    alias_name: "Email Send",        alias_type: "synonym", is_preferred: false },
  { data_object_id: EMAILS,    alias_name: "Broadcast",         alias_type: "synonym", is_preferred: false },
  { data_object_id: LEADSCORES,alias_name: "Engagement Score",  alias_type: "synonym", is_preferred: false },
  { data_object_id: LEADSCORES,alias_name: "Lead Grade",        alias_type: "synonym", is_preferred: false },
  { data_object_id: JOURNEYS,  alias_name: "Journey",           alias_type: "synonym", is_preferred: false },
  { data_object_id: JOURNEYS,  alias_name: "Workflow",          alias_type: "synonym", is_preferred: false },
  { data_object_id: JOURNEYS,  alias_name: "Flow",              alias_type: "synonym", is_preferred: false },
  { data_object_id: JOURNEYS,  alias_name: "Drip Sequence",     alias_type: "synonym", is_preferred: false },
  { data_object_id: FORMS,     alias_name: "Landing Page Form", alias_type: "synonym", is_preferred: false },
  { data_object_id: FORMS,     alias_name: "Form Handler",      alias_type: "synonym", is_preferred: false },
];

console.log("== B11: data_object_aliases ==");
const existAliases = await get(
  `/data_object_aliases?data_object_id=in.(${[CAMPAIGNS, EMAILS, LEADSCORES, JOURNEYS, FORMS].join(",")})&select=data_object_id,alias_name`,
);
const aliasKey = (r: Row) => `${r.data_object_id}|${r.alias_name}`;
const haveAliases = new Set(existAliases.map(aliasKey));
const newAliases = aliases.filter(a => !haveAliases.has(aliasKey(a)));
if (newAliases.length) { await insert("/data_object_aliases", newAliases as Row[]); }
console.log(`  inserted ${newAliases.length} aliases (${existAliases.length} already present)`);

// ------------------------------------------------------------------
// E1-E3 — personas (domain_roles) + reach (role_modules)
// ------------------------------------------------------------------
const BF_DEMAND_GEN = 54;
type Persona = { role_code: string; role_name: string; description: string; reach: { m: number; level: string }[] };
const personas: Persona[] = [
  {
    role_code: "DEMAND-GEN-MARKETING-OPS",
    role_name: "Marketing Operations Manager",
    description: "Owns the marketing automation platform: configures campaigns, journeys, lead scoring, and forms, and keeps the program running across modules.",
    reach: [
      { m: M_CAMPAIGN, level: "primary" }, { m: M_JOURNEY, level: "primary" },
      { m: M_LEADSCORE, level: "primary" }, { m: M_FORMS, level: "primary" },
    ],
  },
  {
    role_code: "DEMAND-GEN-CAMPAIGN-MANAGER",
    role_name: "Campaign Manager",
    description: "Plans and runs marketing campaigns and nurture journeys end to end, from authoring through launch and follow-up.",
    reach: [
      { m: M_CAMPAIGN, level: "primary" }, { m: M_JOURNEY, level: "primary" }, { m: M_FORMS, level: "secondary" },
    ],
  },
];

console.log("== E1-E3: personas + reach ==");
const existRoles = await get(`/domain_roles?role_code=in.(${personas.map(p => p.role_code).join(",")})&select=id,role_code`);
const roleMap = new Map<string, number>(existRoles.map(r => [String(r.role_code), Number(r.id)]));
const newRoles = personas.filter(p => !roleMap.has(p.role_code))
  .map(p => ({ role_code: p.role_code, role_name: p.role_name, description: p.description, business_function_id: BF_DEMAND_GEN }));
if (newRoles.length) {
  const inserted = await insert("/domain_roles", newRoles as Row[]);
  for (const r of inserted) roleMap.set(String(r.role_code), Number(r.id));
}
console.log(`  inserted ${newRoles.length} personas (${existRoles.length} already present)`);

// re-read to be safe (in case POST did not return representation)
const allRoles = await get(`/domain_roles?role_code=in.(${personas.map(p => p.role_code).join(",")})&select=id,role_code`);
for (const r of allRoles) roleMap.set(String(r.role_code), Number(r.id));

const roleIds = personas.map(p => roleMap.get(p.role_code)!).filter(Boolean);
const existReach = await get(`/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id,domain_module_id`);
const reachKey = (r: Row) => `${r.role_id}|${r.domain_module_id}`;
const haveReach = new Set(existReach.map(reachKey));
const newReach: Row[] = [];
for (const p of personas) {
  const rid = roleMap.get(p.role_code)!;
  for (const r of p.reach) {
    const row = { role_id: rid, domain_module_id: r.m, interaction_level: r.level };
    if (!haveReach.has(reachKey(row))) newReach.push(row);
  }
}
if (newReach.length) { await insert("/role_modules", newReach); }
console.log(`  inserted ${newReach.length} role_modules reach rows (${existReach.length} already present)`);

console.log("\nDONE. UI: https://adenin.semantius.ai/domain_map/data_object_lifecycle_states");
