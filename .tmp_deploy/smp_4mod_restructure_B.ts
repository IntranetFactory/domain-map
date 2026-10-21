#!/usr/bin/env bun
// SMP 4-module restructure — Loader B+C combined.
// Loads 16 new entities (12 Load-now + 4 Surface-resolved) into the new 4-module shape.
//
// Per-module allocation (decided by user 2026-05-28/29 from Phase 0 research):
//   SMP-DISCOVERY  (id=30):  smp_app_owners, smp_app_integrations, smp_app_catalog_listings,
//                            smp_alerts, smp_app_lifecycle_stages (embedded under saas_applications)
//   SMP-OPTIMIZATION (id=184): smp_optimization_recommendations, smp_reclamation_actions, smp_app_benchmarks
//   SMP-RENEWAL-VENDOR (id=31): smp_renewal_tasks, smp_renewal_engagements, smp_vendor_negotiations,
//                            smp_spend_allocations, smp_vendor_risk_assessments
//   SMP-AUTOMATION (id=185): smp_automation_workflows, smp_workflow_runs (embedded), smp_app_requests
//
// Deferred (not loaded): smp_data_residency_attestations, smp_subprocessor_disclosures, smp_user_app_exposures.
//
// Run:    bun run .tmp_deploy/smp_4mod_restructure_B.ts --dry-run
// Apply:  bun run .tmp_deploy/smp_4mod_restructure_B.ts --apply

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

const SMP_DOMAIN_ID = 85;
const USERS_DO = 748;
const SAAS_APPLICATIONS_DO = 61;
const SAAS_SUBSCRIPTIONS_DO = 62;
const SHADOW_IT_APPS_DO = 65;
const LEGAL_CONTRACTS_DO = 66;

const MOD_DISCOVERY = 30;
const MOD_RENEWAL_VENDOR = 31;
const MOD_OPTIMIZATION = 184;
const MOD_AUTOMATION = 185;

const SKILL_DISCOVERY = 135;
const SKILL_RENEWAL_VENDOR = 136;
const SKILL_OPTIMIZATION = 244;
const SKILL_AUTOMATION = 245;

const TOOL_NOTIFY_PERSON = 913;

// Existing roles
const ROLE_IT_SAAS_ADMIN = 10118;
const ROLE_PROC_RENEWAL_OWNER = 10119;
const ROLE_ITAM_SMP_ADMIN = 10120;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud/postgrestRequest"], {
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
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function insertRows(path: string, rows: Row[], label: string): Promise<Row[]> {
  if (rows.length === 0) {
    console.log(`  ${label}  skip (0)`);
    return [];
  }
  if (DRY_RUN) {
    console.log(`  [DRY] ${label}  POST ${path}  ${rows.length} rows`);
    return [];
  }
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  console.log(`  ${label}  POST ${path}  ${rows.length} rows`);
  return out;
}

// ============================================================
// Entity spec + loader
// ============================================================

interface EntitySpec {
  name: string;
  singular: string;
  plural: string;
  description: string;
  module_id: number;
  skill_id: number;
  role: "master" | "embedded_master";
  necessity: "required" | "optional";
  has_personal_content?: boolean;
  has_submit_lock?: boolean;
  has_single_approver?: boolean;
  states?: Array<{ name: string; order: number; initial?: boolean; terminal?: boolean; gate?: string }>;
  events?: Array<{ name: string; category: "lifecycle" | "state_change" | "threshold" | "signal"; description: string }>;
  aliases: string[];
  relationships: Array<{
    other_ref: number | string; // id (number) or entity name (string) for cross-batch resolution
    verb: string;
    inverse: string;
    type: "one_to_one" | "one_to_many" | "many_to_many";
    kind: "reference" | "composition" | "parent";
    required: boolean;
    owner: "source" | "target";
    direction: "out" | "in";
  }>;
  tools: Array<{ name: string; kind: "query" | "mutate"; description: string; req: "required" | "optional" }>;
  side_effect_tools?: Array<{ tool_id: number; req: "required" | "optional" }>;
}

const entities: EntitySpec[] = [
  // ==================== SMP-DISCOVERY ====================
  {
    name: "smp_app_owners",
    singular: "SaaS App Owner",
    plural: "SaaS App Owners",
    description: "Typed role assignment of a user to a SaaS application (business owner, IT owner, finance owner, security owner). Not a flat FK on saas_applications because one app may have multiple typed owners; modeled by Productiv and LeanIX as a first-class junction.",
    module_id: MOD_DISCOVERY,
    skill_id: SKILL_DISCOVERY,
    role: "master",
    necessity: "required",
    has_personal_content: true,
    states: [
      { name: "active", order: 10, initial: true },
      { name: "revoked", order: 20, terminal: true, gate: "revoke_app_owner" },
    ],
    events: [
      { name: "smp_app_owner.assigned", category: "lifecycle", description: "A user assigned as a typed owner of a SaaS application." },
      { name: "smp_app_owner.revoked", category: "lifecycle", description: "Ownership revoked (typically driven by HCM leaver or manual reassignment)." },
    ],
    aliases: ["App Steward", "Application Owner"],
    relationships: [
      { other_ref: SAAS_APPLICATIONS_DO, verb: "owns", inverse: "owned_by", type: "many_to_many", kind: "reference", required: true, owner: "source", direction: "in" },
      { other_ref: USERS_DO, verb: "assigned_owner", inverse: "owner_of", type: "many_to_many", kind: "reference", required: true, owner: "source", direction: "in" },
    ],
    tools: [
      { name: "query_smp_app_owners", kind: "query", description: "Query / list / get SaaS app owner records.", req: "required" },
      { name: "assign_app_owner",     kind: "mutate", description: "Assign a user as a typed owner of a SaaS application.", req: "required" },
      { name: "revoke_app_owner",     kind: "mutate", description: "Revoke a SaaS app owner role from a user.", req: "required" },
    ],
  },
  {
    name: "smp_app_integrations",
    singular: "SaaS App Integration",
    plural: "SaaS App Integrations",
    description: "Discovered or configured connection between SMP and a SaaS application's APIs (SSO source, SCIM source, finance source, usage source). Per-app per-tenant, with auth state and last-sync time. Distinct from IPAAS integration_connectors (platform-grain vendor-connector definitions); BetterCloud's App Integrations flagship surface.",
    module_id: MOD_DISCOVERY,
    skill_id: SKILL_DISCOVERY,
    role: "master",
    necessity: "required",
    states: [
      { name: "configured",   order: 10, initial: true },
      { name: "connected",    order: 20 },
      { name: "degraded",     order: 30, gate: "mark_integration_degraded" },
      { name: "disconnected", order: 40, gate: "disconnect_integration" },
      { name: "archived",     order: 50, terminal: true, gate: "archive_integration" },
    ],
    events: [
      { name: "smp_app_integration.configured", category: "lifecycle", description: "Integration connection configured against a SaaS app's API." },
      { name: "smp_app_integration.connected",  category: "lifecycle", description: "Integration authenticated successfully; sync active." },
      { name: "smp_app_integration.degraded",   category: "state_change", description: "Integration sync degraded (auth expiry, rate-limit, API change). Triggers alert." },
      { name: "smp_app_integration.disconnected", category: "lifecycle", description: "Integration disconnected; sync halted." },
    ],
    aliases: ["App Connector", "SaaS Connector", "Data Source"],
    relationships: [
      { other_ref: SAAS_APPLICATIONS_DO, verb: "integrates_with", inverse: "integrated_via", type: "one_to_many", kind: "reference", required: true, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_app_integrations",    kind: "query",  description: "Query / list / get SaaS app integration records.", req: "required" },
      { name: "configure_app_integration",     kind: "mutate", description: "Configure an integration connection to a SaaS app's APIs.", req: "required" },
      { name: "mark_integration_degraded",     kind: "mutate", description: "Mark an integration as degraded (sync failures).", req: "required" },
      { name: "disconnect_integration",        kind: "mutate", description: "Disconnect an integration (halt sync).", req: "required" },
      { name: "archive_integration",           kind: "mutate", description: "Archive a disconnected integration.", req: "required" },
    ],
  },
  {
    name: "smp_app_catalog_listings",
    singular: "App Catalog Listing",
    plural: "App Catalog Listings",
    description: "Curated, published listing of a sanctioned SaaS application that employees can browse and request access to. Carries description, owner, request route, SSO availability, approval workflow. Distinct from saas_applications (the discovered inventory of what's running); the catalog is the publication of what's offered. LeanIX, Torii, BetterCloud flagship.",
    module_id: MOD_DISCOVERY,
    skill_id: SKILL_DISCOVERY,
    role: "master",
    necessity: "required",
    states: [
      { name: "draft",       order: 10, initial: true },
      { name: "published",   order: 20, gate: "publish_catalog_listing" },
      { name: "deprecated",  order: 30, gate: "deprecate_catalog_listing" },
      { name: "unlisted",    order: 40, terminal: true, gate: "unlist_catalog_listing" },
    ],
    events: [
      { name: "smp_app_catalog_listing.published",  category: "lifecycle", description: "A catalog listing is published and visible to employees for requests." },
      { name: "smp_app_catalog_listing.deprecated", category: "lifecycle", description: "A catalog listing is deprecated; new requests blocked but visible." },
      { name: "smp_app_catalog_listing.unlisted",   category: "lifecycle", description: "A catalog listing is removed from the catalog." },
    ],
    aliases: ["App Catalog Entry", "Self-Service Listing"],
    relationships: [
      { other_ref: SAAS_APPLICATIONS_DO, verb: "publishes", inverse: "published_as", type: "one_to_one", kind: "reference", required: true, owner: "source", direction: "in" },
    ],
    tools: [
      { name: "query_smp_app_catalog_listings",  kind: "query",  description: "Query / list / get app catalog listings.", req: "required" },
      { name: "publish_catalog_listing",         kind: "mutate", description: "Publish a draft listing to the employee app catalog.", req: "required" },
      { name: "deprecate_catalog_listing",       kind: "mutate", description: "Deprecate a published catalog listing.", req: "required" },
      { name: "unlist_catalog_listing",          kind: "mutate", description: "Remove a listing from the app catalog entirely.", req: "required" },
    ],
  },
  {
    name: "smp_alerts",
    singular: "SaaS Alert",
    plural: "SaaS Alerts",
    description: "System-raised anomaly on the SaaS portfolio: shadow-IT signup detected, license-overage projected, renewal window opening, integration token expiring, vendor-risk score change. Distinct from monitoring_alerts (OBS/AIOPS infrastructure-grain). BetterCloud Alert Center and Torii Alerts are the flagship surfaces.",
    module_id: MOD_DISCOVERY,
    skill_id: SKILL_DISCOVERY,
    role: "master",
    necessity: "required",
    states: [
      { name: "raised",        order: 10, initial: true },
      { name: "acknowledged",  order: 20, gate: "acknowledge_alert" },
      { name: "triaged",       order: 30, gate: "triage_alert" },
      { name: "resolved",      order: 40, terminal: true, gate: "resolve_alert" },
      { name: "suppressed",    order: 50, terminal: true, gate: "suppress_alert" },
    ],
    events: [
      { name: "smp_alert.raised",       category: "signal",       description: "A new alert raised on the SaaS portfolio." },
      { name: "smp_alert.acknowledged", category: "lifecycle",    description: "An alert acknowledged by an operator." },
      { name: "smp_alert.resolved",     category: "lifecycle",    description: "An alert resolved; underlying condition cleared." },
      { name: "smp_alert.suppressed",   category: "lifecycle",    description: "An alert suppressed; will not re-raise for the suppression window." },
    ],
    aliases: ["SaaS Anomaly", "Portfolio Alert"],
    relationships: [
      { other_ref: SAAS_APPLICATIONS_DO, verb: "raised_for", inverse: "has_alerts", type: "one_to_many", kind: "reference", required: false, owner: "target", direction: "in" },
      { other_ref: SHADOW_IT_APPS_DO,    verb: "raised_for_shadow", inverse: "has_alerts", type: "one_to_many", kind: "reference", required: false, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_alerts",   kind: "query",  description: "Query / list / get SaaS portfolio alerts.", req: "required" },
      { name: "acknowledge_alert",  kind: "mutate", description: "Acknowledge a raised alert.", req: "required" },
      { name: "triage_alert",       kind: "mutate", description: "Triage an acknowledged alert (set severity, owner, planned action).", req: "required" },
      { name: "resolve_alert",      kind: "mutate", description: "Resolve a triaged alert.", req: "required" },
      { name: "suppress_alert",     kind: "mutate", description: "Suppress an alert for a defined window.", req: "required" },
    ],
    side_effect_tools: [{ tool_id: TOOL_NOTIFY_PERSON, req: "required" }],
  },
  {
    name: "smp_app_lifecycle_stages",
    singular: "App Lifecycle Stage",
    plural: "App Lifecycle Stages",
    description: "Portfolio-rationalization stage of a SaaS application (Evaluate, Pilot, Sanctioned, Sunset, Retired). Distinct from saas_applications.record_status (discovered → sanctioned → deprecated → deprovisioned, which tracks discovery state). LeanIX's TIME taxonomy is the flagship.",
    module_id: MOD_DISCOVERY,
    skill_id: SKILL_DISCOVERY,
    role: "embedded_master",
    necessity: "optional",
    states: [
      { name: "evaluate",   order: 10, initial: true },
      { name: "pilot",      order: 20, gate: "promote_to_pilot" },
      { name: "sanctioned", order: 30, gate: "promote_to_sanctioned" },
      { name: "sunset",     order: 40, gate: "sunset_app" },
      { name: "retired",    order: 50, terminal: true, gate: "retire_app" },
    ],
    events: [
      { name: "smp_app_lifecycle_stage.advanced", category: "lifecycle", description: "A SaaS application advances to a new portfolio lifecycle stage." },
    ],
    aliases: ["TIME Stage", "Portfolio Stage"],
    relationships: [
      { other_ref: SAAS_APPLICATIONS_DO, verb: "tracks_stage", inverse: "has_stage", type: "one_to_one", kind: "reference", required: true, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_app_lifecycle_stages", kind: "query",  description: "Query / list / get portfolio lifecycle stages on SaaS applications.", req: "required" },
      { name: "promote_to_pilot",               kind: "mutate", description: "Promote a SaaS app from Evaluate to Pilot.", req: "optional" },
      { name: "promote_to_sanctioned",          kind: "mutate", description: "Promote a SaaS app from Pilot to Sanctioned.", req: "optional" },
      { name: "sunset_app",                     kind: "mutate", description: "Mark a SaaS app for sunset.", req: "optional" },
      { name: "retire_app",                     kind: "mutate", description: "Retire a sunsetted SaaS app from the portfolio.", req: "optional" },
    ],
  },

  // ==================== SMP-OPTIMIZATION ====================
  {
    name: "smp_optimization_recommendations",
    singular: "Optimization Recommendation",
    plural: "Optimization Recommendations",
    description: "System-generated rightsizing or consolidation proposal against a SaaS subscription or application. Carries savings_estimate, rationale, recommendation type (downgrade tier, reduce seats, consolidate apps), status. Productiv Recommendations + Zylo Savings Opportunities are the flagship.",
    module_id: MOD_OPTIMIZATION,
    skill_id: SKILL_OPTIMIZATION,
    role: "master",
    necessity: "required",
    states: [
      { name: "open",        order: 10, initial: true },
      { name: "reviewed",    order: 20 },
      { name: "accepted",    order: 30, gate: "accept_recommendation" },
      { name: "in_progress", order: 40, gate: "start_recommendation" },
      { name: "realized",    order: 50, terminal: true, gate: "realize_recommendation" },
      { name: "dismissed",   order: 60, terminal: true, gate: "dismiss_recommendation" },
    ],
    events: [
      { name: "smp_optimization_recommendation.generated", category: "signal",    description: "A new optimization recommendation generated by SMP." },
      { name: "smp_optimization_recommendation.accepted",  category: "lifecycle", description: "A recommendation accepted; triggers downstream action (reclamation, renewal change)." },
      { name: "smp_optimization_recommendation.realized",  category: "lifecycle", description: "Recommended savings realized." },
      { name: "smp_optimization_recommendation.dismissed", category: "lifecycle", description: "Recommendation dismissed without action." },
    ],
    aliases: ["Savings Opportunity", "Rightsizing Recommendation"],
    relationships: [
      { other_ref: SAAS_APPLICATIONS_DO,  verb: "recommends_for_app",  inverse: "has_recommendations", type: "one_to_many", kind: "reference", required: false, owner: "target", direction: "in" },
      { other_ref: SAAS_SUBSCRIPTIONS_DO, verb: "recommends_for_sub", inverse: "has_recommendations", type: "one_to_many", kind: "reference", required: false, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_optimization_recommendations", kind: "query",  description: "Query / list / get optimization recommendations.", req: "required" },
      { name: "accept_recommendation",                  kind: "mutate", description: "Accept an optimization recommendation; routes to execution.", req: "required" },
      { name: "start_recommendation",                   kind: "mutate", description: "Start execution of an accepted recommendation.", req: "required" },
      { name: "realize_recommendation",                 kind: "mutate", description: "Mark recommended savings as realized.", req: "required" },
      { name: "dismiss_recommendation",                 kind: "mutate", description: "Dismiss a recommendation without execution.", req: "required" },
    ],
  },
  {
    name: "smp_reclamation_actions",
    singular: "Reclamation Action",
    plural: "Reclamation Actions",
    description: "Executed reclamation against an smp_license_seat_assignment (revoke, downgrade, reassign) with savings_realized linkage. Tracks the operational payoff of the optimization workflow. BetterCloud License Recovery + Torii Reclaim workflows are the flagship.",
    module_id: MOD_OPTIMIZATION,
    skill_id: SKILL_OPTIMIZATION,
    role: "master",
    necessity: "required",
    states: [
      { name: "identified",   order: 10, initial: true },
      { name: "notified",     order: 20, gate: "notify_user_of_reclamation" },
      { name: "grace_period", order: 30 },
      { name: "reclaimed",    order: 40, terminal: true, gate: "execute_reclamation" },
      { name: "restored",     order: 50, terminal: true, gate: "restore_reclamation" },
      { name: "cancelled",    order: 60, terminal: true, gate: "cancel_reclamation" },
    ],
    events: [
      { name: "smp_reclamation_action.identified", category: "signal",    description: "An idle seat identified for reclamation." },
      { name: "smp_reclamation_action.notified",   category: "lifecycle", description: "User notified that a seat is up for reclamation; grace period begins." },
      { name: "smp_reclamation_action.reclaimed",  category: "lifecycle", description: "Seat reclaimed; revocation executed via the IGA-side entitlement revocation." },
      { name: "smp_reclamation_action.restored",   category: "lifecycle", description: "Reclamation reversed; user re-granted access (heard-back-from-user case)." },
    ],
    aliases: ["License Recovery Action", "Reclaim Workflow"],
    relationships: [
      { other_ref: 63, verb: "reclaims_seat", inverse: "reclaimed_by", type: "one_to_one", kind: "reference", required: true, owner: "source", direction: "in" }, // 63 = smp_license_seat_assignments
    ],
    tools: [
      { name: "query_smp_reclamation_actions",  kind: "query",  description: "Query / list / get reclamation actions.", req: "required" },
      { name: "notify_user_of_reclamation",     kind: "mutate", description: "Notify a user that their seat is up for reclamation.", req: "required" },
      { name: "execute_reclamation",            kind: "mutate", description: "Execute the reclamation: revokes IGA entitlement, frees the seat.", req: "required" },
      { name: "restore_reclamation",            kind: "mutate", description: "Restore a reclaimed seat (user heard back, still needs access).", req: "required" },
      { name: "cancel_reclamation",             kind: "mutate", description: "Cancel an in-progress reclamation.", req: "required" },
    ],
    side_effect_tools: [{ tool_id: TOOL_NOTIFY_PERSON, req: "required" }],
  },
  {
    name: "smp_app_benchmarks",
    singular: "SaaS App Benchmark",
    plural: "SaaS App Benchmarks",
    description: "Per-app utilization and cost-per-seat benchmark vs an industry peer-set. Snapshot record per measurement period; carries headcount cohort, peer-percentile, and outlier flag. Productiv Benchmarks + Zylo Industry Benchmarks are the flagship.",
    module_id: MOD_OPTIMIZATION,
    skill_id: SKILL_OPTIMIZATION,
    role: "master",
    necessity: "optional",
    events: [
      { name: "smp_app_benchmark.refreshed", category: "lifecycle", description: "A benchmark snapshot refreshed for a SaaS application." },
    ],
    aliases: ["Industry Benchmark", "Peer Benchmark"],
    relationships: [
      { other_ref: SAAS_APPLICATIONS_DO, verb: "benchmarks_for", inverse: "has_benchmarks", type: "one_to_many", kind: "reference", required: true, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_app_benchmarks", kind: "query",  description: "Query / list / get app benchmarks.", req: "required" },
      { name: "refresh_app_benchmark",    kind: "mutate", description: "Refresh a benchmark snapshot for a SaaS application.", req: "optional" },
    ],
  },

  // ==================== SMP-RENEWAL-VENDOR ====================
  {
    name: "smp_renewal_tasks",
    singular: "Renewal Task",
    plural: "Renewal Tasks",
    description: "Workstream task within a SaaS renewal cycle (renewal window notice, owner assignment, decision: renew/renegotiate/consolidate/cancel). Productiv, Zylo, Flexera Renewal workspace surfaces.",
    module_id: MOD_RENEWAL_VENDOR,
    skill_id: SKILL_RENEWAL_VENDOR,
    role: "master",
    necessity: "required",
    states: [
      { name: "open",        order: 10, initial: true },
      { name: "in_progress", order: 20, gate: "start_renewal_task" },
      { name: "blocked",     order: 30 },
      { name: "done",        order: 40, terminal: true, gate: "complete_renewal_task" },
      { name: "cancelled",   order: 50, terminal: true, gate: "cancel_renewal_task" },
    ],
    events: [
      { name: "smp_renewal_task.opened",    category: "lifecycle", description: "A renewal task is opened." },
      { name: "smp_renewal_task.completed", category: "lifecycle", description: "A renewal task is completed." },
    ],
    aliases: ["Renewal Work Item"],
    relationships: [
      { other_ref: SAAS_SUBSCRIPTIONS_DO, verb: "tasks_for", inverse: "has_renewal_tasks", type: "one_to_many", kind: "reference", required: true, owner: "target", direction: "in" },
      { other_ref: USERS_DO, verb: "owned_by_user", inverse: "owns_tasks", type: "one_to_many", kind: "reference", required: true, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_renewal_tasks", kind: "query",  description: "Query / list / get renewal tasks.", req: "required" },
      { name: "start_renewal_task",      kind: "mutate", description: "Start a renewal task.", req: "required" },
      { name: "complete_renewal_task",   kind: "mutate", description: "Complete a renewal task.", req: "required" },
      { name: "cancel_renewal_task",     kind: "mutate", description: "Cancel a renewal task.", req: "required" },
    ],
  },
  {
    name: "smp_renewal_engagements",
    singular: "Renewal Engagement",
    plural: "Renewal Engagements",
    description: "Lifecycle envelope per renewal cycle: timeline, owner, vendor proposals received, BATNA notes, decisions taken. Buyer-side analogue of CRM opportunities; distinct in that the buyer drives the negotiation. Productiv Renewal Pipeline + Zylo Renewal Workbench are the flagship.",
    module_id: MOD_RENEWAL_VENDOR,
    skill_id: SKILL_RENEWAL_VENDOR,
    role: "master",
    necessity: "required",
    states: [
      { name: "scheduled",   order: 10, initial: true },
      { name: "discovery",   order: 20 },
      { name: "negotiation", order: 30, gate: "begin_negotiation" },
      { name: "decision",    order: 40, gate: "decide_renewal" },
      { name: "executed",    order: 50, gate: "execute_renewal" },
      { name: "closed",      order: 60, terminal: true },
    ],
    events: [
      { name: "smp_renewal_engagement.scheduled", category: "lifecycle", description: "Renewal engagement scheduled for an upcoming renewal cycle." },
      { name: "smp_renewal_engagement.decision",  category: "lifecycle", description: "Renewal decision made (renew, renegotiate, consolidate, cancel)." },
      { name: "smp_renewal_engagement.closed",    category: "lifecycle", description: "Renewal engagement closed." },
    ],
    aliases: ["Renewal Pipeline Record", "Renewal Cycle"],
    relationships: [
      { other_ref: SAAS_SUBSCRIPTIONS_DO, verb: "engagement_for", inverse: "has_engagements", type: "one_to_many", kind: "reference", required: true, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_renewal_engagements", kind: "query",  description: "Query / list / get renewal engagements.", req: "required" },
      { name: "begin_negotiation",             kind: "mutate", description: "Move an engagement into negotiation phase.", req: "required" },
      { name: "decide_renewal",                kind: "mutate", description: "Record the renewal decision on an engagement.", req: "required" },
      { name: "execute_renewal",               kind: "mutate", description: "Execute the renewal decision (handed off to CLM for contract execution).", req: "required" },
    ],
  },
  {
    name: "smp_vendor_negotiations",
    singular: "Vendor Negotiation",
    plural: "Vendor Negotiations",
    description: "Quote, counter-quote, and discount-applied artifact tied to a renewal engagement. Decision-provenance record for how the final commercial terms were reached; contributor into CLM at execution time. Productiv Negotiation Intelligence + Zylo negotiation insights are the flagship.",
    module_id: MOD_RENEWAL_VENDOR,
    skill_id: SKILL_RENEWAL_VENDOR,
    role: "master",
    necessity: "required",
    states: [
      { name: "opened",         order: 10, initial: true },
      { name: "counter_offered", order: 20 },
      { name: "at_impasse",     order: 30 },
      { name: "agreed",         order: 40, terminal: true, gate: "agree_negotiation" },
      { name: "abandoned",      order: 50, terminal: true, gate: "abandon_negotiation" },
    ],
    events: [
      { name: "smp_vendor_negotiation.agreed",    category: "lifecycle", description: "Negotiation reached agreement; terms finalized." },
      { name: "smp_vendor_negotiation.abandoned", category: "lifecycle", description: "Negotiation abandoned; default to non-renewal or status quo." },
    ],
    aliases: ["Quote Negotiation"],
    relationships: [
      { other_ref: "smp_renewal_engagements", verb: "negotiated_under", inverse: "has_negotiations", type: "one_to_many", kind: "composition", required: true, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_vendor_negotiations", kind: "query",  description: "Query / list / get vendor negotiations.", req: "required" },
      { name: "agree_negotiation",             kind: "mutate", description: "Mark a negotiation as agreed; finalize terms.", req: "required" },
      { name: "abandon_negotiation",           kind: "mutate", description: "Abandon a negotiation.", req: "required" },
    ],
  },
  {
    name: "smp_spend_allocations",
    singular: "SaaS Spend Allocation",
    plural: "SaaS Spend Allocations",
    description: "Chargeback split of a SaaS subscription across cost centers, business units, or projects, with allocation method (per-seat, per-headcount, fixed-percentage) and effective window. Zylo Cost Center Allocation + Flexera Chargeback Allocations are the flagship. Distinct from FINOPS cost_allocations (cloud-only).",
    module_id: MOD_RENEWAL_VENDOR,
    skill_id: SKILL_RENEWAL_VENDOR,
    role: "master",
    necessity: "optional",
    states: [
      { name: "draft",    order: 10, initial: true },
      { name: "active",   order: 20, gate: "activate_allocation" },
      { name: "adjusted", order: 30 },
      { name: "closed",   order: 40, terminal: true, gate: "close_allocation" },
    ],
    events: [
      { name: "smp_spend_allocation.activated", category: "lifecycle", description: "A spend allocation is activated for charging." },
      { name: "smp_spend_allocation.adjusted",  category: "state_change", description: "An allocation split is adjusted mid-period." },
    ],
    aliases: ["Chargeback Allocation", "Cost Center Split"],
    relationships: [
      { other_ref: SAAS_SUBSCRIPTIONS_DO, verb: "allocates", inverse: "has_allocations", type: "one_to_many", kind: "reference", required: true, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_spend_allocations", kind: "query",  description: "Query / list / get spend allocation records.", req: "required" },
      { name: "activate_allocation",         kind: "mutate", description: "Activate a spend allocation for charging.", req: "required" },
      { name: "close_allocation",            kind: "mutate", description: "Close a spend allocation period.", req: "required" },
    ],
  },
  {
    name: "smp_vendor_risk_assessments",
    singular: "Vendor Risk Assessment",
    plural: "Vendor Risk Assessments",
    description: "SaaS-specific vendor-risk scorecard: SOC 2 attestation status, ISO 27001, DPA review, subprocessor disclosures, breach history, posture score. Per-SaaS-application (Slack vs Salesforce risk profiles differ from the same vendor). Flexera Vendor Risk Scorecard is the flagship; pure-plays defer most risk surfaces to GRC.",
    module_id: MOD_RENEWAL_VENDOR,
    skill_id: SKILL_RENEWAL_VENDOR,
    role: "master",
    necessity: "optional",
    states: [
      { name: "scoped",                  order: 10, initial: true },
      { name: "in_review",               order: 20, gate: "start_risk_review" },
      { name: "information_requested",   order: 30 },
      { name: "completed",               order: 40, gate: "complete_risk_review" },
      { name: "expired",                 order: 50, terminal: true },
      { name: "remediation_required",    order: 60, gate: "flag_remediation" },
    ],
    events: [
      { name: "smp_vendor_risk_assessment.completed",  category: "lifecycle", description: "Vendor risk assessment completed with a posture score." },
      { name: "smp_vendor_risk_assessment.expired",    category: "lifecycle", description: "Vendor risk assessment expired; refresh required." },
      { name: "smp_vendor_risk_assessment.remediation_required", category: "state_change", description: "Risk findings require remediation before renewal can proceed." },
    ],
    aliases: ["Vendor Risk Scorecard", "SaaS Risk Posture"],
    relationships: [
      { other_ref: SAAS_APPLICATIONS_DO, verb: "assesses_app", inverse: "has_risk_assessments", type: "one_to_many", kind: "reference", required: true, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_vendor_risk_assessments", kind: "query",  description: "Query / list / get vendor risk assessment records.", req: "required" },
      { name: "start_risk_review",                 kind: "mutate", description: "Start a vendor risk review.", req: "required" },
      { name: "complete_risk_review",              kind: "mutate", description: "Complete a vendor risk review with a posture score.", req: "required" },
      { name: "flag_remediation",                  kind: "mutate", description: "Flag a vendor risk assessment as requiring remediation.", req: "required" },
    ],
  },

  // ==================== SMP-AUTOMATION ====================
  {
    name: "smp_automation_workflows",
    singular: "Automation Workflow",
    plural: "Automation Workflows",
    description: "Declarative orchestration: trigger + steps (provision in SaaS app, send notification, file offboarding action, request approval, escalate). BetterCloud Workflows + Torii Workflows are the flagship product surface. Distinct from iga_access_requests (request-side) and integration_recipes (generic iPaaS).",
    module_id: MOD_AUTOMATION,
    skill_id: SKILL_AUTOMATION,
    role: "master",
    necessity: "required",
    states: [
      { name: "draft",    order: 10, initial: true },
      { name: "active",   order: 20, gate: "activate_workflow" },
      { name: "paused",   order: 30, gate: "pause_workflow" },
      { name: "archived", order: 40, terminal: true, gate: "archive_workflow" },
    ],
    events: [
      { name: "smp_automation_workflow.activated", category: "lifecycle", description: "An automation workflow activated; trigger arms it for execution." },
      { name: "smp_automation_workflow.paused",    category: "lifecycle", description: "An automation workflow paused; no further runs." },
    ],
    aliases: ["Automation Playbook", "SaaS Workflow"],
    relationships: [
      { other_ref: SAAS_APPLICATIONS_DO, verb: "automates_app", inverse: "has_workflows", type: "one_to_many", kind: "reference", required: false, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_automation_workflows", kind: "query",  description: "Query / list / get automation workflows.", req: "required" },
      { name: "activate_workflow",              kind: "mutate", description: "Activate a draft automation workflow.", req: "required" },
      { name: "pause_workflow",                 kind: "mutate", description: "Pause an active automation workflow.", req: "required" },
      { name: "archive_workflow",               kind: "mutate", description: "Archive a workflow.", req: "required" },
    ],
  },
  {
    name: "smp_workflow_runs",
    singular: "Workflow Run",
    plural: "Workflow Runs",
    description: "Execution log per automation workflow invocation. Carries trigger source, input payload, step-by-step status, output, duration, error if failed. BetterCloud Activity log + Torii Run history are the flagship.",
    module_id: MOD_AUTOMATION,
    skill_id: SKILL_AUTOMATION,
    role: "embedded_master",
    necessity: "required",
    states: [
      { name: "queued",    order: 10, initial: true },
      { name: "running",   order: 20 },
      { name: "succeeded", order: 30, terminal: true },
      { name: "failed",    order: 40, terminal: true },
      { name: "cancelled", order: 50, terminal: true, gate: "cancel_workflow_run" },
    ],
    events: [
      { name: "smp_workflow_run.started",   category: "lifecycle", description: "A workflow run started." },
      { name: "smp_workflow_run.succeeded", category: "lifecycle", description: "A workflow run completed successfully." },
      { name: "smp_workflow_run.failed",    category: "lifecycle", description: "A workflow run failed; error captured in the run record." },
    ],
    aliases: ["Workflow Execution", "Run Log"],
    relationships: [
      { other_ref: "smp_automation_workflows", verb: "runs_for", inverse: "has_runs", type: "one_to_many", kind: "composition", required: true, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_workflow_runs", kind: "query",  description: "Query / list / get workflow run records.", req: "required" },
      { name: "cancel_workflow_run",     kind: "mutate", description: "Cancel a queued or in-progress workflow run.", req: "optional" },
    ],
  },
  {
    name: "smp_app_requests",
    singular: "App Access Request",
    plural: "App Access Requests",
    description: "Employee request for access to a SaaS application via the published catalog. Routes through manager + IT approval, then hands off to IGA for entitlement provisioning. App-grain (pre-IGA-handoff); distinct from iga_access_requests (entitlement-grain) and itsm_service_requests (generic catalog). Torii App Catalog requests + BetterCloud Self-Service Requests are the flagship.",
    module_id: MOD_AUTOMATION,
    skill_id: SKILL_AUTOMATION,
    role: "master",
    necessity: "required",
    has_personal_content: true,
    has_submit_lock: true,
    states: [
      { name: "submitted",         order: 10, initial: true, gate: "submit_app_request" },
      { name: "manager_approved",  order: 20, gate: "manager_approve_request" },
      { name: "it_approved",       order: 30, gate: "it_approve_request" },
      { name: "fulfilled",         order: 40, terminal: true, gate: "fulfill_app_request" },
      { name: "denied",            order: 50, terminal: true, gate: "deny_app_request" },
      { name: "cancelled",         order: 60, terminal: true, gate: "cancel_app_request" },
    ],
    events: [
      { name: "smp_app_request.submitted",         category: "lifecycle", description: "An app access request submitted by an employee through the catalog." },
      { name: "smp_app_request.manager_approved",  category: "lifecycle", description: "Manager approval recorded." },
      { name: "smp_app_request.it_approved",       category: "lifecycle", description: "IT approval recorded; routes to IGA for provisioning." },
      { name: "smp_app_request.fulfilled",         category: "lifecycle", description: "Request fulfilled; user has access." },
      { name: "smp_app_request.denied",            category: "lifecycle", description: "Request denied at manager or IT stage." },
    ],
    aliases: ["Self-Service App Request"],
    relationships: [
      { other_ref: "smp_app_catalog_listings", verb: "requests_listing", inverse: "has_requests", type: "one_to_many", kind: "reference", required: true, owner: "target", direction: "in" },
      { other_ref: USERS_DO, verb: "requested_by", inverse: "requested", type: "one_to_many", kind: "reference", required: true, owner: "target", direction: "in" },
    ],
    tools: [
      { name: "query_smp_app_requests",    kind: "query",  description: "Query / list / get app access requests.", req: "required" },
      { name: "submit_app_request",        kind: "mutate", description: "Submit an app access request from the catalog.", req: "required" },
      { name: "manager_approve_request",   kind: "mutate", description: "Record manager approval on a request.", req: "required" },
      { name: "it_approve_request",        kind: "mutate", description: "Record IT approval on a request; routes to IGA.", req: "required" },
      { name: "fulfill_app_request",       kind: "mutate", description: "Mark a request as fulfilled (entitlement provisioned).", req: "required" },
      { name: "deny_app_request",          kind: "mutate", description: "Deny a request at manager or IT stage.", req: "required" },
      { name: "cancel_app_request",        kind: "mutate", description: "Cancel an in-flight request.", req: "required" },
    ],
    side_effect_tools: [{ tool_id: TOOL_NOTIFY_PERSON, req: "required" }],
  },
];

// ============================================================
// Loader
// ============================================================

async function loadEntity(spec: EntitySpec, nameIdMap: Map<string, number>): Promise<number> {
  console.log(`\n  --- ${spec.name} (module ${spec.module_id}) ---`);

  // 1. data_object (idempotent on name)
  let doId: number;
  const existing = await get(`/data_objects?data_object_name=eq.${spec.name}&select=id`);
  if (existing.length > 0) {
    doId = Number(existing[0]!.id);
    console.log(`    skip data_object: exists (id=${doId})`);
  } else {
    const payload: Row = {
      data_object_name: spec.name,
      singular_label: spec.singular,
      plural_label: spec.plural,
      description: spec.description,
      kind: "domain_owned",
    };
    if (spec.has_personal_content) payload.has_personal_content = true;
    if (spec.has_submit_lock) payload.has_submit_lock = true;
    if (spec.has_single_approver) payload.has_single_approver = true;
    await insertRows("/data_objects", [payload], `data_object ${spec.name}`);
    if (DRY_RUN) {
      doId = -1000 - nameIdMap.size; // sentinel
    } else {
      const fresh = await get(`/data_objects?data_object_name=eq.${spec.name}&select=id`);
      doId = Number(fresh[0]!.id);
    }
  }
  nameIdMap.set(spec.name, doId);

  // 2. DMDO
  if (doId > 0) {
    const dmdo = await get(`/domain_module_data_objects?data_object_id=eq.${doId}&domain_module_id=eq.${spec.module_id}&select=id`);
    if (dmdo.length === 0) {
      await insertRows("/domain_module_data_objects",
        [{ data_object_id: doId, domain_module_id: spec.module_id, role: spec.role, necessity: spec.necessity }],
        `DMDO ${spec.name} ${spec.role}/${spec.necessity}`);
    } else {
      console.log("    skip DMDO: exists");
    }
  }

  // 3. lifecycle_states
  if (spec.states && doId > 0) {
    const toInsert: Row[] = [];
    for (const s of spec.states) {
      const ex = await get(`/data_object_lifecycle_states?data_object_id=eq.${doId}&state_name=eq.${s.name}&select=id`);
      if (ex.length === 0) {
        toInsert.push({
          data_object_id: doId,
          state_name: s.name,
          state_order: s.order,
          is_initial: !!s.initial,
          is_terminal: !!s.terminal,
          requires_permission: !!s.gate,
          permission_verb_override: s.gate ?? "",
          domain_module_id: spec.module_id,
        });
      }
    }
    await insertRows("/data_object_lifecycle_states", toInsert, `lifecycle_states ${spec.name} (${toInsert.length})`);
  }

  // 4. trigger_events
  if (spec.events && doId > 0) {
    const toInsert: Row[] = [];
    for (const e of spec.events) {
      const ex = await get(`/trigger_events?event_name=eq.${e.name}&select=id`);
      if (ex.length === 0) {
        toInsert.push({
          event_name: e.name,
          description: e.description,
          event_category: e.category,
          data_object_id: doId,
          domain_module_id: spec.module_id,
        });
      }
    }
    await insertRows("/trigger_events", toInsert, `trigger_events ${spec.name} (${toInsert.length})`);
  }

  // 5. aliases
  if (spec.aliases.length > 0 && doId > 0) {
    const toInsert: Row[] = [];
    for (const a of spec.aliases) {
      const ex = await get(`/data_object_aliases?data_object_id=eq.${doId}&alias_name=eq.${encodeURIComponent(a)}&select=id`);
      if (ex.length === 0) {
        toInsert.push({ data_object_id: doId, alias_name: a, alias_type: "synonym" });
      }
    }
    await insertRows("/data_object_aliases", toInsert, `aliases ${spec.name} (${toInsert.length})`);
  }

  return doId;
}

async function loadRelationships(spec: EntitySpec, nameIdMap: Map<string, number>): Promise<void> {
  const doId = nameIdMap.get(spec.name);
  if (!doId || doId < 0) return;
  const toInsert: Row[] = [];
  for (const r of spec.relationships) {
    let otherId: number;
    if (typeof r.other_ref === "number") otherId = r.other_ref;
    else {
      const resolved = nameIdMap.get(r.other_ref);
      if (!resolved || resolved < 0) {
        console.log(`    warn: relationship references unloaded entity "${r.other_ref}"`);
        continue;
      }
      otherId = resolved;
    }
    // Direction 'in' means: other_ref -> this entity. data_object_id = other, related_data_object_id = doId.
    // Direction 'out' means: this entity -> other_ref. data_object_id = doId, related_data_object_id = other.
    const fromId = r.direction === "in" ? otherId : doId;
    const toId   = r.direction === "in" ? doId : otherId;
    const ex = await get(`/data_object_relationships?data_object_id=eq.${fromId}&related_data_object_id=eq.${toId}&relationship_verb=eq.${encodeURIComponent(r.verb)}&select=id`);
    if (ex.length === 0) {
      toInsert.push({
        data_object_id: fromId,
        related_data_object_id: toId,
        relationship_verb: r.verb,
        inverse_verb: r.inverse,
        relationship_type: r.type,
        relationship_kind: r.kind,
        is_required: r.required,
        owner_side: r.owner,
      });
    }
  }
  await insertRows("/data_object_relationships", toInsert, `relationships ${spec.name} (${toInsert.length})`);
}

async function loadToolsAndSkillTools(spec: EntitySpec, nameIdMap: Map<string, number>): Promise<void> {
  const doId = nameIdMap.get(spec.name);
  if (!doId || doId < 0) return;
  const toolsToInsert: Row[] = [];
  const toolNameToReq = new Map<string, "required" | "optional">();
  for (const t of spec.tools) {
    toolNameToReq.set(t.name, t.req);
    const ex = await get(`/tools?tool_name=eq.${t.name}&select=id`);
    if (ex.length === 0) {
      toolsToInsert.push({
        tool_name: t.name,
        operation_kind: t.kind,
        coverage_tier: "platform",
        data_object_id: doId,
        description: t.description,
      });
    }
  }
  await insertRows("/tools", toolsToInsert, `tools ${spec.name} (${toolsToInsert.length})`);

  // Resolve all tool ids (existing + newly created)
  const allToolNames = spec.tools.map(t => t.name);
  const refresh = await get(`/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name`);
  const toolIdByName = new Map<string, number>();
  for (const r of refresh) toolIdByName.set(r.tool_name as string, Number(r.id));

  // Add skill_tools rows for entity's own tools
  const stToInsert: Row[] = [];
  for (const t of spec.tools) {
    const tid = toolIdByName.get(t.name);
    if (!tid) continue;
    const ex = await get(`/skill_tools?skill_id=eq.${spec.skill_id}&tool_id=eq.${tid}&select=id`);
    if (ex.length === 0) {
      stToInsert.push({ skill_id: spec.skill_id, tool_id: tid, requirement_level: t.req });
    }
  }
  // Add skill_tools rows for side-effect tools (notify_person etc.)
  for (const set of spec.side_effect_tools ?? []) {
    const ex = await get(`/skill_tools?skill_id=eq.${spec.skill_id}&tool_id=eq.${set.tool_id}&select=id`);
    if (ex.length === 0) {
      stToInsert.push({ skill_id: spec.skill_id, tool_id: set.tool_id, requirement_level: set.req });
    }
  }
  await insertRows("/skill_tools", stToInsert, `skill_tools ${spec.name} (${stToInsert.length})`);
}

// ============================================================
// Workflow-gate permissions + role_permissions for new gates on existing roles
// ============================================================

async function loadWorkflowGatePermissions(): Promise<void> {
  console.log("\n=== Workflow-gate permissions for new entities ===");

  const modulePrefix: Record<number, string> = {
    [MOD_DISCOVERY]: "smp-discovery",
    [MOD_OPTIMIZATION]: "smp-optimization",
    [MOD_RENEWAL_VENDOR]: "smp-renewal-vendor",
    [MOD_AUTOMATION]: "smp-automation",
  };

  const permsToInsert: Row[] = [];
  for (const spec of entities) {
    if (!spec.states) continue;
    const prefix = modulePrefix[spec.module_id];
    for (const s of spec.states) {
      if (!s.gate) continue;
      const permName = `${prefix}:${s.gate}`;
      const ex = await get(`/permissions?permission_name=eq.${encodeURIComponent(permName)}&select=id`);
      if (ex.length === 0) {
        permsToInsert.push({
          permission_name: permName,
          tier: "workflow-gate",
          domain_module_id: spec.module_id,
          description: `Workflow-gate permission derived from ${spec.name}.${s.name} lifecycle transition.`,
        });
      }
    }
  }
  await insertRows("/permissions", permsToInsert, `workflow-gate permissions (${permsToInsert.length})`);
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log(DRY_RUN
    ? "MODE: dry-run (no writes). Re-run with --apply to execute."
    : "MODE: apply (writes will execute).");

  const nameIdMap = new Map<string, number>();

  console.log("\n=== Phase 1: load data_objects + DMDO + lifecycle_states + trigger_events + aliases ===");
  for (const spec of entities) {
    await loadEntity(spec, nameIdMap);
  }

  console.log("\n=== Phase 2: load relationships (cross-entity refs resolved) ===");
  for (const spec of entities) {
    await loadRelationships(spec, nameIdMap);
  }

  console.log("\n=== Phase 3: load tools + skill_tools ===");
  for (const spec of entities) {
    await loadToolsAndSkillTools(spec, nameIdMap);
  }

  console.log("\n=== Phase 4: workflow-gate permissions ===");
  await loadWorkflowGatePermissions();

  console.log("\n=== Summary ===");
  console.log(`  Loaded ${entities.length} entities across 4 modules.`);
  console.log("  Per-module count:");
  const perMod: Record<number, number> = {};
  for (const spec of entities) perMod[spec.module_id] = (perMod[spec.module_id] ?? 0) + 1;
  for (const [mid, count] of Object.entries(perMod)) console.log(`    module ${mid}: ${count} entities`);
  console.log("\nUI:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
  console.log("  https://tests.semantius.app/domain_map/skill_tools");
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
