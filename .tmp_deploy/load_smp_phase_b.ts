#!/usr/bin/env bun
// SMP (domain id=85) Phase B finishing:
//   - B4: PATCH pattern flags + notes on 5 masters
//   - B11: data_object_aliases for 4 masters (saas_usage_metrics self-explanatory)
//   - B12: data_object_lifecycle_states for 4 masters; saas_usage_metrics exempt with notes
//   - B6:  intra-domain data_object_relationships
//   - B7:  users edges
//   - B9:  add missing SMP-published trigger_events on saas_subscriptions / saas_app_assignments
// Idempotent. Run from project root.

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
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// data_object ids (from prior queries):
const DO_SAAS_APPS = 61;
const DO_SAAS_SUBS = 62;
const DO_SAAS_ASSIGN = 63;
const DO_SAAS_USAGE = 64;
const DO_SHADOW = 65;
const DO_USERS = 748;
const DO_LEGAL_CONTRACTS = 66; // verified from prior data_object_relationships handoff (data_object_id=66 on event 104 SMP->CLM contracts.terms_updated)

// module ids:
const MOD_DISCOVERY_OPT = 30;
const MOD_RENEWAL = 31;

// ============================================================
// B4: pattern flags + notes PATCH
// ============================================================
const b4Patches: Array<{ id: number; body: Row }> = [
  { id: DO_SAAS_APPS, body: { notes: "Config-shape registry with discovery and sanction workflow. No personal-content / submit-lock / single-approver pattern: owner is a single FK to users, sanction decision is recorded inline by IT operations." } },
  { id: DO_SAAS_SUBS, body: { notes: "Buyer-side SaaS contract metadata. Renewal lifecycle is gated (renewing / renewed / cancelled require permissions) but the three patterns do not apply: no personal content (vendor record), no submit-lock pattern, multi-party approval handled upstream via CLM legal_contracts." } },
  { id: DO_SAAS_ASSIGN, body: { has_personal_content: true, notes: "Identity-bearing: ties a user to a SaaS app license with access timestamps. has_personal_content=true (per-row user attribution). No submit-lock or single-approver pattern: assignment is system-driven from SSO and HR events." } },
  { id: DO_SAAS_USAGE, body: { notes: "Config-shaped; no workflow. Each row is an immutable measurement (active users, session count, feature adoption) and the only state worth tracking is record_status. Exempt from Rule #12 lifecycle-states requirement." } },
  { id: DO_SHADOW, body: { notes: "Discovery record with triage workflow (discovered -> triaged -> sanctioned-promoted or blocked). No submit-lock or single-approver pattern: triage decision is recorded inline by IT operations." } },
];

// ============================================================
// B11: aliases
// ============================================================
const aliases: Array<{ data_object_id: number; alias_name: string; alias_type: string; is_preferred?: boolean; notes?: string }> = [
  { data_object_id: DO_SAAS_APPS, alias_name: "Cloud App", alias_type: "synonym" },
  { data_object_id: DO_SAAS_APPS, alias_name: "Web App", alias_type: "synonym" },
  { data_object_id: DO_SAAS_APPS, alias_name: "SaaS Tool", alias_type: "synonym" },
  { data_object_id: DO_SAAS_SUBS, alias_name: "SaaS Contract", alias_type: "synonym" },
  { data_object_id: DO_SAAS_SUBS, alias_name: "SaaS Agreement", alias_type: "synonym" },
  { data_object_id: DO_SAAS_ASSIGN, alias_name: "License Assignment", alias_type: "synonym" },
  { data_object_id: DO_SAAS_ASSIGN, alias_name: "User Provisioning Record", alias_type: "synonym" },
  { data_object_id: DO_SHADOW, alias_name: "Unsanctioned App", alias_type: "synonym" },
  { data_object_id: DO_SHADOW, alias_name: "Rogue SaaS", alias_type: "synonym" },
];

// ============================================================
// B12: lifecycle states
// ============================================================
type LCS = { data_object_id: number; domain_module_id: number; state_name: string; state_order: number; description: string; is_initial?: boolean; is_terminal?: boolean; requires_permission?: boolean; permission_verb_override?: string };
const lifecycleStates: LCS[] = [
  // saas_applications -> SMP-DISCOVERY-OPT
  { data_object_id: DO_SAAS_APPS, domain_module_id: MOD_DISCOVERY_OPT, state_name: "discovered", state_order: 10, description: "App detected via SSO logs, expense data, or browser plugin. Not yet reviewed by IT.", is_initial: true },
  { data_object_id: DO_SAAS_APPS, domain_module_id: MOD_DISCOVERY_OPT, state_name: "triaged", state_order: 20, description: "App has been reviewed by IT but no sanction decision recorded yet." },
  { data_object_id: DO_SAAS_APPS, domain_module_id: MOD_DISCOVERY_OPT, state_name: "sanctioned", state_order: 30, description: "App is officially supported; IGA provisioning, FINOPS spend tracking, and ITAM registration activated.", requires_permission: true, permission_verb_override: "sanction_application" },
  { data_object_id: DO_SAAS_APPS, domain_module_id: MOD_DISCOVERY_OPT, state_name: "deprecated", state_order: 40, description: "Slated for replacement or removal; no new assignments allowed; existing users on read-only or sunset path.", requires_permission: true, permission_verb_override: "deprecate_application" },
  { data_object_id: DO_SAAS_APPS, domain_module_id: MOD_DISCOVERY_OPT, state_name: "deprovisioned", state_order: 50, description: "App removed tenant-wide. ITSM closes related tickets; IGA revokes access; FINOPS terminates spend.", is_terminal: true, requires_permission: true, permission_verb_override: "deprovision_application" },

  // saas_app_assignments -> SMP-DISCOVERY-OPT
  { data_object_id: DO_SAAS_ASSIGN, domain_module_id: MOD_DISCOVERY_OPT, state_name: "provisioned", state_order: 10, description: "User has been granted access to the SaaS app via SSO or direct provisioning.", is_initial: true },
  { data_object_id: DO_SAAS_ASSIGN, domain_module_id: MOD_DISCOVERY_OPT, state_name: "active", state_order: 20, description: "User is actively using the app per usage telemetry." },
  { data_object_id: DO_SAAS_ASSIGN, domain_module_id: MOD_DISCOVERY_OPT, state_name: "idle", state_order: 30, description: "User has not used the app within the configured engagement window; reclaim candidate." },
  { data_object_id: DO_SAAS_ASSIGN, domain_module_id: MOD_DISCOVERY_OPT, state_name: "reclaimed", state_order: 40, description: "License returned to the pool. User notified, access revoked.", is_terminal: true, requires_permission: true, permission_verb_override: "reclaim_assignment" },

  // shadow_it_apps -> SMP-DISCOVERY-OPT
  { data_object_id: DO_SHADOW, domain_module_id: MOD_DISCOVERY_OPT, state_name: "discovered", state_order: 10, description: "Unsanctioned app surfaced by discovery (expense card, signup detection, network traffic). Awaiting triage.", is_initial: true },
  { data_object_id: DO_SHADOW, domain_module_id: MOD_DISCOVERY_OPT, state_name: "triaged", state_order: 20, description: "IT has reviewed the shadow app and is weighing sanction vs block." },
  { data_object_id: DO_SHADOW, domain_module_id: MOD_DISCOVERY_OPT, state_name: "sanctioned_promoted", state_order: 30, description: "Shadow app promoted to the sanctioned catalog; a corresponding saas_applications record is created.", is_terminal: true, requires_permission: true, permission_verb_override: "promote_shadow_app" },
  { data_object_id: DO_SHADOW, domain_module_id: MOD_DISCOVERY_OPT, state_name: "blocked", state_order: 40, description: "Shadow app blocked at the network and SSO layer; users notified.", is_terminal: true, requires_permission: true, permission_verb_override: "block_shadow_app" },

  // saas_subscriptions -> SMP-RENEWAL
  { data_object_id: DO_SAAS_SUBS, domain_module_id: MOD_RENEWAL, state_name: "draft", state_order: 10, description: "Subscription record created during procurement; terms not yet finalized.", is_initial: true },
  { data_object_id: DO_SAAS_SUBS, domain_module_id: MOD_RENEWAL, state_name: "active", state_order: 20, description: "Contract executed; license consumption underway." },
  { data_object_id: DO_SAAS_SUBS, domain_module_id: MOD_RENEWAL, state_name: "renewing", state_order: 30, description: "Within the renewal window (typically 90 days pre-expiry). Quantity and tier negotiation in progress.", requires_permission: true, permission_verb_override: "initiate_renewal" },
  { data_object_id: DO_SAAS_SUBS, domain_module_id: MOD_RENEWAL, state_name: "renewed", state_order: 40, description: "Renewal executed; a new active term started.", is_terminal: true, requires_permission: true, permission_verb_override: "approve_renewal" },
  { data_object_id: DO_SAAS_SUBS, domain_module_id: MOD_RENEWAL, state_name: "cancelled", state_order: 50, description: "Subscription terminated; deprovisioning workflow triggered.", is_terminal: true, requires_permission: true, permission_verb_override: "cancel_subscription" },
];

// ============================================================
// B6 + B7: data_object_relationships
// ============================================================
type Rel = { data_object_id: number; related_data_object_id: number; relationship_verb: string; inverse_verb: string; relationship_type: string; relationship_kind: string; owner_side: string; is_required: boolean; notes: string };
const relationships: Rel[] = [
  // B6: intra-domain (5 masters)
  { data_object_id: DO_SAAS_APPS, related_data_object_id: DO_SAAS_SUBS, relationship_verb: "has", inverse_verb: "covers", relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "source", is_required: false, notes: "An app may have zero (free), one, or many (per-business-unit) subscriptions covering it." },
  { data_object_id: DO_SAAS_APPS, related_data_object_id: DO_SAAS_USAGE, relationship_verb: "measured_by", inverse_verb: "measures", relationship_type: "one_to_many", relationship_kind: "composition", owner_side: "source", is_required: true, notes: "Usage telemetry is per-app. Composition: deleting the app deletes its usage history." },
  { data_object_id: DO_SAAS_APPS, related_data_object_id: DO_SAAS_ASSIGN, relationship_verb: "assigned_via", inverse_verb: "assigns", relationship_type: "one_to_many", relationship_kind: "composition", owner_side: "source", is_required: true, notes: "Each assignment row points at exactly one app." },
  { data_object_id: DO_SAAS_SUBS, related_data_object_id: DO_SAAS_ASSIGN, relationship_verb: "grants", inverse_verb: "granted_under", relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "source", is_required: false, notes: "Assignments may be under a specific subscription (license pool) or unaffiliated (free-tier app)." },
  { data_object_id: DO_SHADOW, related_data_object_id: DO_SAAS_APPS, relationship_verb: "promotes_to", inverse_verb: "promoted_from", relationship_type: "one_to_one", relationship_kind: "reference", owner_side: "source", is_required: false, notes: "Set when shadow_it triage results in sanction-promoted; null otherwise (blocked or still-discovered)." },

  // B7: users edges (Rule #10) — DO_USERS is platform_builtin
  { data_object_id: DO_USERS, related_data_object_id: DO_SAAS_APPS, relationship_verb: "owns", inverse_verb: "owned_by", relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: true, notes: "Each sanctioned app has a designated IT owner responsible for renewal, support, and access reviews." },
  { data_object_id: DO_USERS, related_data_object_id: DO_SAAS_ASSIGN, relationship_verb: "granted", inverse_verb: "granted_to", relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: true, notes: "Each assignment row is the access record for a single user. Identity-bearing per B4 has_personal_content flag." },
  { data_object_id: DO_USERS, related_data_object_id: DO_SAAS_USAGE, relationship_verb: "generates", inverse_verb: "generated_by", relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: true, notes: "Usage telemetry attributes to a user. Drives the idle-threshold reclaim signal." },
  { data_object_id: DO_USERS, related_data_object_id: DO_SAAS_SUBS, relationship_verb: "manages", inverse_verb: "managed_by", relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: true, notes: "Subscription owner (typically procurement or IT) responsible for renewal and quantity decisions." },
  { data_object_id: DO_USERS, related_data_object_id: DO_SHADOW, relationship_verb: "triggered", inverse_verb: "triggered_by", relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: false, notes: "Shadow_it_apps may reference the user(s) whose card charge or signup surfaced the unsanctioned app." },
];

// ============================================================
// B9: missing trigger_events (SMP-published lifecycle events)
// ============================================================
type TE = { event_name: string; data_object_id: number; domain_module_id: number; event_category: string; from_state: string; to_state: string; description: string };
const triggerEvents: TE[] = [
  // saas_subscriptions lifecycle
  { event_name: "saas_subscription.renewal_upcoming", data_object_id: DO_SAAS_SUBS, domain_module_id: MOD_RENEWAL, event_category: "threshold", from_state: "active", to_state: "renewing", description: "Subscription has entered the renewal window (default 90 days pre-expiry). Triggers procurement and legal coordination." },
  { event_name: "saas_subscription.renewed", data_object_id: DO_SAAS_SUBS, domain_module_id: MOD_RENEWAL, event_category: "lifecycle", from_state: "renewing", to_state: "renewed", description: "Renewal executed. New term begins; CLM legal_contracts updated; FINOPS continues spend." },
  { event_name: "saas_subscription.cancelled", data_object_id: DO_SAAS_SUBS, domain_module_id: MOD_RENEWAL, event_category: "lifecycle", from_state: "active", to_state: "cancelled", description: "Subscription terminated. Triggers deprovisioning across IGA, FINOPS, ITAM." },
  // saas_app_assignments lifecycle
  { event_name: "saas_app_assignment.provisioned", data_object_id: DO_SAAS_ASSIGN, domain_module_id: MOD_DISCOVERY_OPT, event_category: "lifecycle", from_state: "", to_state: "provisioned", description: "User granted access to the SaaS app. IGA records the entitlement." },
  { event_name: "saas_app_assignment.reclaimed", data_object_id: DO_SAAS_ASSIGN, domain_module_id: MOD_DISCOVERY_OPT, event_category: "lifecycle", from_state: "idle", to_state: "reclaimed", description: "Idle license reclaimed and returned to the pool. User notified; IGA revokes access." },
  { event_name: "saas_app_assignment.deprovisioned", data_object_id: DO_SAAS_ASSIGN, domain_module_id: MOD_DISCOVERY_OPT, event_category: "lifecycle", from_state: "active", to_state: "reclaimed", description: "Assignment removed (typically driven by HCM leaver event). IGA revokes access." },
];

// ============================================================
// LOADER
// ============================================================
async function main() {
  console.log("=== SMP Phase B loader ===");

  // --- B4: PATCH masters ---
  console.log("\n[1/6] B4 pattern flags + notes PATCH (5 masters)");
  for (const p of b4Patches) {
    await call({ method: "PATCH", path: `/data_objects?id=eq.${p.id}`, body: p.body });
  }
  console.log(`  patched ${b4Patches.length} data_objects`);

  // --- B11: aliases ---
  console.log("\n[2/6] B11 aliases");
  const existingAliases = await get(`/data_object_aliases?data_object_id=in.(${DO_SAAS_APPS},${DO_SAAS_SUBS},${DO_SAAS_ASSIGN},${DO_SAAS_USAGE},${DO_SHADOW})&select=data_object_id,alias_name`);
  const existingAliasKey = new Set(existingAliases.map(r => `${r.data_object_id}|${r.alias_name}`));
  const newAliases = aliases.filter(r => !existingAliasKey.has(`${r.data_object_id}|${r.alias_name}`));
  if (newAliases.length) await insert("/data_object_aliases", newAliases);
  console.log(`  inserted ${newAliases.length}, ${existingAliases.length} pre-existing`);

  // --- B12: lifecycle states ---
  console.log("\n[3/6] B12 lifecycle states");
  const existingStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${DO_SAAS_APPS},${DO_SAAS_SUBS},${DO_SAAS_ASSIGN},${DO_SAAS_USAGE},${DO_SHADOW})&select=data_object_id,state_name`);
  const existingStateKey = new Set(existingStates.map(r => `${r.data_object_id}|${r.state_name}`));
  const newStates = lifecycleStates
    .filter(r => !existingStateKey.has(`${r.data_object_id}|${r.state_name}`))
    .map(r => ({
      data_object_id: r.data_object_id,
      domain_module_id: r.domain_module_id,
      state_name: r.state_name,
      state_order: r.state_order,
      description: r.description,
      is_initial: r.is_initial ?? false,
      is_terminal: r.is_terminal ?? false,
      requires_permission: r.requires_permission ?? false,
      permission_verb_override: r.permission_verb_override ?? "",
      notes: "",
    }));
  if (newStates.length) await insert("/data_object_lifecycle_states", newStates);
  console.log(`  inserted ${newStates.length}, ${existingStates.length} pre-existing`);

  // --- B6 + B7: relationships ---
  console.log("\n[4/6] B6 + B7 data_object_relationships");
  const allIds = [DO_SAAS_APPS, DO_SAAS_SUBS, DO_SAAS_ASSIGN, DO_SAAS_USAGE, DO_SHADOW, DO_USERS];
  const existingRel = await get(`/data_object_relationships?data_object_id=in.(${allIds.join(",")})&related_data_object_id=in.(${allIds.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`);
  const existingRelKey = new Set(existingRel.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`));
  const newRel = relationships.filter(r => !existingRelKey.has(`${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`));
  if (newRel.length) await insert("/data_object_relationships", newRel);
  console.log(`  inserted ${newRel.length}, ${existingRel.length} pre-existing`);

  // --- B9: trigger_events ---
  console.log("\n[5/6] B9 missing trigger_events");
  const eventNames = triggerEvents.map(e => e.event_name);
  const existingEvents = await get(`/trigger_events?event_name=in.("${eventNames.join('","')}")&select=event_name`);
  const existingEventSet = new Set(existingEvents.map(r => r.event_name as string));
  const newEvents = triggerEvents.filter(e => !existingEventSet.has(e.event_name));
  if (newEvents.length) await insert("/trigger_events", newEvents);
  console.log(`  inserted ${newEvents.length}, ${existingEvents.length} pre-existing`);

  // --- Summary ---
  console.log("\n[6/6] Summary");
  console.log(`  B4 PATCHes:               ${b4Patches.length}`);
  console.log(`  B11 aliases (target):     ${aliases.length}`);
  console.log(`  B12 lifecycle states:     ${lifecycleStates.length}`);
  console.log(`  B6+B7 relationships:      ${relationships.length}`);
  console.log(`  B9 new trigger_events:    ${triggerEvents.length}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
}

await main();
