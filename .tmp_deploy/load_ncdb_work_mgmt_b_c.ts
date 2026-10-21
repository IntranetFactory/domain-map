#!/usr/bin/env bun
// Phase B + C for NCDB + WORK-MGMT:
//   B: data_objects, domain_data_objects, trigger_events, cross_domain_handoffs
//   C: business_function_domains
//
// Idempotent: natural-key reads first, only inserts missing rows.

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

async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function syncTable<T extends Row>(
  path: string, rows: T[], keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=20000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=20000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// =========================================================================
// DATA OBJECTS
// =========================================================================
const newDataObjects = [
  {
    data_object_name: "nocode_bases",
    singular_label: "No-Code Base",
    plural_label: "No-Code Bases",
    display_label: "No-Code Base",
    description: "User-defined container for a no-code-database deployment. The Airtable 'Base', Notion 'Workspace', Coda 'Doc', Quickbase 'App', Baserow 'Workspace' — same shape: a self-contained namespace for tables, views, automations, and access.",
  },
  {
    data_object_name: "nocode_record_definitions",
    singular_label: "No-Code Record Definition",
    plural_label: "No-Code Record Definitions",
    display_label: "No-Code Record Definition",
    description: "User-defined schema inside a no-code base — tables, fields with types, linked-record relationships, formulas, and views. The 'meta' the platform actually masters; the records themselves are user-owned data the platform stores without owning their semantics.",
  },
  {
    data_object_name: "work_items",
    singular_label: "Work Item",
    plural_label: "Work Items",
    display_label: "Work Item",
    description: "Atomic primitive in a work-management platform: task / item / card with owner, due date, status, priority, dependencies, subtasks, attachments, and comments. Same shape across Asana 'Task', Monday 'Item', Smartsheet 'Row', ClickUp 'Task', Wrike 'Task', Trello 'Card'.",
  },
  {
    data_object_name: "work_projects",
    singular_label: "Work Project",
    plural_label: "Work Projects",
    display_label: "Work Project",
    description: "Container of work_items. Asana 'Project', Monday 'Board', Smartsheet 'Sheet', ClickUp 'Space/List', Wrike 'Project', Trello 'Board'. Has timeline, status, owner, members, dashboards, and embedded views.",
  },
  {
    data_object_name: "okr_objectives",
    singular_label: "Objective / OKR",
    plural_label: "Objective / OKRs",
    display_label: "Objective / OKR",
    description: "Hierarchical objective with measurable key results, weighted progress rollup from child objectives or linked work_items, owner accountability, and cadence (quarterly/annual). Mastered by three distinct domains: WORK-MGMT (team-level execution OKRs), SPM (strategic portfolio OKRs), TALENT-MGMT (individual performance-management OKRs). Same primitive, three different lifecycles and review processes — canonical Signal-1 multi-master.",
  },
  {
    data_object_name: "work_automations",
    singular_label: "Work Automation",
    plural_label: "Work Automations",
    display_label: "Work Automation",
    description: "Trigger-action rule defined per board/project: status change, due date, assignment, form submission as triggers; multi-step actions with conditions, time delays, and external integrations. The user-authored behavior layer on top of the data primitives.",
  },
];

// =========================================================================
// DOMAIN ↔ DATA_OBJECT (role + slice notes)
// =========================================================================
type DomDO = { domain: string; data_object: string; role: "master" | "contributor" | "consumer" | "derived"; notes: string };

const domainDataObjects: DomDO[] = [
  // NCDB masters
  { domain: "NCDB", data_object: "nocode_bases", role: "master", notes: "The platform owns the base/workspace lifecycle, permissions, and tier. The records inside are user data the platform does not semantically own." },
  { domain: "NCDB", data_object: "nocode_record_definitions", role: "master", notes: "The user-authored schema (tables, fields, types, linked records, formulas) is the platform's primary intellectual artifact — what migrates to Airtable Enterprise vs. Notion vs. Quickbase looks like." },

  // WORK-MGMT masters
  { domain: "WORK-MGMT", data_object: "work_items", role: "master", notes: "Tasks/items/cards with full lifecycle, owner, dependencies, comments, and subtasks. The single thing every WORK-MGMT product orbits." },
  { domain: "WORK-MGMT", data_object: "work_projects", role: "master", notes: "The project/board container with timeline, members, dashboards, and embedded views." },
  { domain: "WORK-MGMT", data_object: "work_automations", role: "master", notes: "User-authored automations on the work-management substrate." },

  // okr_objectives — 3-way master
  { domain: "WORK-MGMT", data_object: "okr_objectives", role: "master", notes: "Team-level execution OKRs: weekly check-ins, child key-results that link to work_items for automatic progress rollup. Asana Goals, Monday Goals, ClickUp Goals." },
  { domain: "SPM", data_object: "okr_objectives", role: "master", notes: "Strategic / portfolio-level OKRs aligned to investment decisions, multi-year horizons, exec scorecards. Planview Outcomes, Jira Align Strategy, ServiceNow SPM." },
  { domain: "TALENT-MGMT", data_object: "okr_objectives", role: "master", notes: "Individual employee OKRs as the goal-setting half of the performance-management cycle, tied to compensation and calibration. Workday Talent Goals, Lattice, 15Five, Betterworks." },

  // Cross-cluster consumers/contributors of work_items / work_projects
  { domain: "SPM", data_object: "work_items", role: "consumer", notes: "Portfolio dashboards roll up project/work_item completion as input to portfolio status and strategy-execution alignment." },
  { domain: "PSA", data_object: "work_projects", role: "consumer", notes: "Services orgs that run delivery in WORK-MGMT feed project completion + utilization into PSA for billing and resource forecasting." },
];

// =========================================================================
// TRIGGER EVENTS — opportunity.closed_won already exists; create 4 more
// =========================================================================
type TriggerEv = { event_name: string; data_object: string; event_category: string; from_state: string; to_state: string; description: string };

const newTriggerEvents: TriggerEv[] = [
  {
    event_name: "work_item.completed",
    data_object: "work_items",
    event_category: "lifecycle",
    from_state: "in_progress",
    to_state: "done",
    description: "A work_item transitions to done/complete state in a WORK-MGMT platform. Used by SPM for portfolio rollup, by PSA for billable hours close-out, and by ITSM when the work_item was linked to an IT ticket.",
  },
  {
    event_name: "work_item.status_changed",
    data_object: "work_items",
    event_category: "lifecycle",
    from_state: "any",
    to_state: "any",
    description: "Generic status transition on a work_item. Subscribers care about specific states (blocked, in_review, done) but the platform emits one event with the new status as payload. The atomic synchronization event for cross-tool work-item mirroring (Asana ↔ Jira / Monday ↔ ServiceNow).",
  },
  {
    event_name: "okr_objective.created",
    data_object: "okr_objectives",
    event_category: "lifecycle",
    from_state: "",
    to_state: "draft",
    description: "An OKR is created in one OKR-mastering domain (typically SPM with strategic intent or HCM with performance-cycle intent) and needs to cascade to team-level OKRs in WORK-MGMT. The cascade is rarely automated — the gap drives the dedicated OKR-platform market (Workboard, Gtmhub, Betterworks).",
  },
  {
    event_name: "work_project.completed",
    data_object: "work_projects",
    event_category: "lifecycle",
    from_state: "active",
    to_state: "completed",
    description: "A work_project transitions to completed/closed. Triggers utilization rollup in PSA when services delivery runs in WORK-MGMT, and may trigger retrospective/lessons-learned workflows.",
  },
];

// =========================================================================
// CROSS-DOMAIN HANDOFFS (5)
// =========================================================================
type Handoff = {
  source: string; target: string; data_object: string; trigger_event: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "low" | "medium" | "high";
  description: string; notes: string;
};

const handoffs: Handoff[] = [
  {
    source: "CRM", target: "WORK-MGMT", data_object: "opportunities", trigger_event: "opportunity.closed_won",
    integration_pattern: "api_call", friction_level: "high",
    description: "Sales closes a deal in CRM; delivery / Customer Success spin up a kickoff project in their work-management tool (Asana / Monday / ClickUp). Custom Zapier/Make integrations or hand-built webhooks bridge the two; payload mapping (opportunity products → project tasks, account stakeholders → project members) is bespoke per org.",
    notes: "High-friction shape: cross-vendor stack with the same logical entity. Salesforce/HubSpot don't ship a canonical 'project from won opportunity' flow; every services-delivery org reinvents the bridge. Reusing existing trigger_event id 84.",
  },
  {
    source: "WORK-MGMT", target: "SPM", data_object: "work_items", trigger_event: "work_item.completed",
    integration_pattern: "batch_sync", friction_level: "medium",
    description: "Work-management platforms publish task-completion data to portfolio dashboards in SPM tools. The portfolio rollup powers strategy-to-execution dashboards and OKR progress (via okr_objectives.key_results linking down to work_items). Nightly sync is the common pattern; richer integrations (Planview <-> Asana, Jira Align <-> Jira) exist but are vendor-specific.",
    notes: "Stable, bespoke integration per SPM/WORK-MGMT vendor pair. Friction medium because the dimensional mismatch (operational task → portfolio status) requires per-org mapping rules.",
  },
  {
    source: "WORK-MGMT", target: "ITSM", data_object: "work_items", trigger_event: "work_item.status_changed",
    integration_pattern: "api_call", friction_level: "high",
    description: "Cross-functional WORK-MGMT items intersect with IT support requests: a marketing project task ('IT-provision new SaaS') needs to be linked to a ServiceNow request, with status mirrored both ways. Bidirectional sync is bespoke; the Asana ↔ Jira and Monday ↔ ServiceNow integrations exist but require careful per-team configuration.",
    notes: "High-friction shape: cross-vendor stack with the same logical work entity in two systems. Status-mapping mismatches (Asana 'In Progress' vs Jira workflow states) are the common breakage.",
  },
  {
    source: "SPM", target: "WORK-MGMT", data_object: "okr_objectives", trigger_event: "okr_objective.created",
    integration_pattern: "manual_handoff", friction_level: "high",
    description: "Executive-level OKRs created in SPM (or in a slide deck, or an HCM perf system) need to cascade into team-level OKRs in the work-management tool. Almost universally manual: someone reads the corporate OKR and authors child OKRs in Asana Goals / Monday Goals / ClickUp Goals. The cascade gap is what the dedicated OKR-platform vendors (Workboard, Gtmhub, Betterworks) exist to close.",
    notes: "High-friction shape: probabilistic-to-deterministic. Strategic OKRs are written narratively; team OKRs need to be measurable and assigned. The translation step has no canonical engine.",
  },
  {
    source: "WORK-MGMT", target: "PSA", data_object: "work_projects", trigger_event: "work_project.completed",
    integration_pattern: "batch_sync", friction_level: "medium",
    description: "Services orgs running delivery in WORK-MGMT (Wrike, Teamwork, Asana) close a project and need utilization, billable hours, and milestone-based revenue recognition to roll up into PSA (Kantata, Certinia, Big Time). Nightly sync of project status + hours is the common pattern; richer real-time integration exists but is uncommon.",
    notes: "Medium friction. Stable integration when both sides exist; the bigger issue is the small fraction of services orgs that run delivery in pure WORK-MGMT vs in an integrated PSA — most use PSA's native project module.",
  },
];

// =========================================================================
// BUSINESS_FUNCTION_DOMAINS (Phase C)
// =========================================================================
type FuncDomain = { domain: string; business_function: string; role: "owner" | "contributor" | "consumer"; notes: string };

const funcDomains: FuncDomain[] = [
  // NCDB — BizOps owner, multiple contributors, D&A as consumer
  { domain: "NCDB", business_function: "Business Operations", role: "owner", notes: "BizOps is the function that actually buys NCDB tools at the org level (consolidating Airtable, Notion, Coda subscriptions) and sets the citizen-developer governance policy." },
  { domain: "NCDB", business_function: "Marketing", role: "contributor", notes: "Marketing ops is the heaviest NCDB user base — campaign trackers, asset libraries, content calendars all live in Airtable/Notion. Citizen-developer contributor, not enterprise owner." },
  { domain: "NCDB", business_function: "Human Resources", role: "contributor", notes: "People-ops teams use NCDB to track recruiting pipelines, onboarding checklists, employee directories — often before adopting a formal HRIS." },
  { domain: "NCDB", business_function: "Sales Operations", role: "contributor", notes: "Sales-ops uses NCDB for territory planning, deal-review trackers, and pricing approvals when the CRM is too rigid." },
  { domain: "NCDB", business_function: "Data and Analytics", role: "consumer", notes: "Data team consumes NCDB data via API/ETL into the warehouse; rarely owns NCDB deployment. Tracks sprawl for data-governance reasons." },

  // WORK-MGMT — BizOps/PMO owner, broad contributors
  { domain: "WORK-MGMT", business_function: "Business Operations", role: "owner", notes: "BizOps / PMO is the cross-functional owner of work-management tooling at the org level: vendor selection, license consolidation, integration with CRM / HRIS / ITSM." },
  { domain: "WORK-MGMT", business_function: "Product Management", role: "contributor", notes: "Product teams that don't run on Jira (or that augment Jira with roadmap-and-launch coordination) use Asana/Monday/ClickUp for cross-functional launch projects." },
  { domain: "WORK-MGMT", business_function: "Marketing", role: "contributor", notes: "Marketing campaign management, brand projects, and content calendars are major Asana/Monday/Wrike use cases. Marketing Ops often drives vendor selection." },
  { domain: "WORK-MGMT", business_function: "Customer Success", role: "contributor", notes: "Implementation/onboarding teams run customer projects in WORK-MGMT; the kickoff-from-closed-won handoff lands here." },
  { domain: "WORK-MGMT", business_function: "Sales", role: "consumer", notes: "Sales leadership consumes project-status views for at-risk-account intervention and deal-related delivery commitments. Not a buyer." },
];

// =========================================================================
// EXECUTION
// =========================================================================

console.log("==> Phase B + C: NCDB + WORK-MGMT\n");

// Pre-load lookup maps
const allDomains = await get("/domains?select=id,domain_code&limit=10000");
const domainMap = new Map<string, number>();
for (const d of allDomains) domainMap.set(String(d.domain_code), Number(d.id));

const allFuncs = await get("/business_functions?select=id,business_function_name&limit=10000");
const funcMap = new Map<string, number>();
for (const f of allFuncs) funcMap.set(String(f.business_function_name), Number(f.id));

// --- DATA_OBJECTS ---
console.log("DATA_OBJECTS");
const doMap = await syncTable("/data_objects", newDataObjects, "data_object_name");
const allDOs = await get("/data_objects?select=id,data_object_name&limit=20000");
for (const d of allDOs) doMap.set(String(d.data_object_name), Number(d.id));

// --- DOMAIN_DATA_OBJECTS ---
console.log("DOMAIN_DATA_OBJECTS");
const existingDDO = await get("/domain_data_objects?select=domain_id,data_object_id&limit=20000");
const ddoSet = new Set(existingDDO.map(r => `${r.domain_id}:${r.data_object_id}`));
const ddoRows = domainDataObjects
  .map(x => {
    const did = domainMap.get(x.domain);
    const oid = doMap.get(x.data_object);
    if (!did) throw new Error(`Domain ${x.domain} not found`);
    if (!oid) throw new Error(`Data object ${x.data_object} not found`);
    return {
      domain_id: did, data_object_id: oid, role: x.role, notes: x.notes,
      domain_data_object_label: `${x.domain}:${x.data_object}:${x.role}`,
    };
  })
  .filter(r => !ddoSet.has(`${r.domain_id}:${r.data_object_id}`));
if (ddoRows.length > 0) {
  console.log(`  inserting ${ddoRows.length} new domain_data_objects rows`);
  await insert("/domain_data_objects", ddoRows);
} else {
  console.log("  domain_data_objects: nothing new to insert");
}

// --- TRIGGER_EVENTS ---
console.log("TRIGGER_EVENTS");
const existingTE = await get("/trigger_events?select=id,event_name&limit=20000");
const teMap = new Map<string, number>();
for (const t of existingTE) teMap.set(String(t.event_name), Number(t.id));
const teToInsert = newTriggerEvents
  .filter(t => !teMap.has(t.event_name))
  .map(t => {
    const oid = doMap.get(t.data_object);
    if (!oid) throw new Error(`Data object ${t.data_object} not found for trigger ${t.event_name}`);
    return {
      event_name: t.event_name, data_object_id: oid,
      event_category: t.event_category, from_state: t.from_state, to_state: t.to_state,
      description: t.description,
    };
  });
if (teToInsert.length > 0) {
  console.log(`  inserting ${teToInsert.length} new trigger_events rows`);
  await insert("/trigger_events", teToInsert);
} else {
  console.log("  trigger_events: nothing new to insert");
}
// Re-read
const allTE = await get("/trigger_events?select=id,event_name&limit=20000");
for (const t of allTE) teMap.set(String(t.event_name), Number(t.id));

// --- CROSS_DOMAIN_HANDOFFS ---
console.log("CROSS_DOMAIN_HANDOFFS");
const existingHO = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,trigger_event,data_object_id&limit=20000");
const hoSet = new Set(existingHO.map(r => `${r.source_domain_id}:${r.target_domain_id}:${r.trigger_event}:${r.data_object_id}`));
const hoRows = handoffs
  .map(h => {
    const src = domainMap.get(h.source);
    const tgt = domainMap.get(h.target);
    const oid = doMap.get(h.data_object);
    if (!src) throw new Error(`Source domain ${h.source} not found`);
    if (!tgt) throw new Error(`Target domain ${h.target} not found`);
    if (!oid) throw new Error(`Data object ${h.data_object} not found`);
    return {
      source_domain_id: src, target_domain_id: tgt, data_object_id: oid,
      trigger_event: h.trigger_event,
      integration_pattern: h.integration_pattern, friction_level: h.friction_level,
      description: h.description, notes: h.notes,
      cross_domain_handoff_label: `${h.source}→${h.target}: ${h.trigger_event}`,
    };
  })
  .filter(r => !hoSet.has(`${r.source_domain_id}:${r.target_domain_id}:${r.trigger_event}:${r.data_object_id}`));
if (hoRows.length > 0) {
  console.log(`  inserting ${hoRows.length} new cross_domain_handoffs rows`);
  await insert("/cross_domain_handoffs", hoRows);
} else {
  console.log("  cross_domain_handoffs: nothing new to insert");
}

// --- BUSINESS_FUNCTION_DOMAINS ---
console.log("BUSINESS_FUNCTION_DOMAINS");
const existingBFD = await get("/business_function_domains?select=domain_id,business_function_id&limit=20000");
const bfdSet = new Set(existingBFD.map(r => `${r.domain_id}:${r.business_function_id}`));
const bfdRows = funcDomains
  .map(x => {
    const did = domainMap.get(x.domain);
    const fid = funcMap.get(x.business_function);
    if (!did) throw new Error(`Domain ${x.domain} not found`);
    if (!fid) throw new Error(`Function "${x.business_function}" not found`);
    return {
      domain_id: did, business_function_id: fid, responsibility_type: x.role, notes: x.notes,
      business_function_domain_label: `${x.business_function} → ${x.domain} (${x.role})`,
    };
  })
  .filter(r => !bfdSet.has(`${r.domain_id}:${r.business_function_id}`));
if (bfdRows.length > 0) {
  console.log(`  inserting ${bfdRows.length} new business_function_domains rows`);
  await insert("/business_function_domains", bfdRows);
} else {
  console.log("  business_function_domains: nothing new to insert");
}

// --- POST-LOAD CHECKS ---
console.log("\nPOST-LOAD CHECKS");

// Multi-master flagship verification
const okrMasters = await get(
  "/domain_data_objects?role=eq.master&data_object_id=eq." + doMap.get("okr_objectives") +
  "&select=domains(domain_code)"
);
console.log(`  okr_objectives masters: ${okrMasters.map((r: any) => r.domains.domain_code).join(", ")}`);

// Handoff count for new clusters
const ncdbHandoffs = await get(
  "/cross_domain_handoffs?or=(source_domain_id.eq." + domainMap.get("NCDB") + ",target_domain_id.eq." + domainMap.get("NCDB") + ")&select=id"
);
const workHandoffs = await get(
  "/cross_domain_handoffs?or=(source_domain_id.eq." + domainMap.get("WORK-MGMT") + ",target_domain_id.eq." + domainMap.get("WORK-MGMT") + ")&select=id"
);
console.log(`  NCDB handoffs: ${ncdbHandoffs.length}`);
console.log(`  WORK-MGMT handoffs: ${workHandoffs.length}`);

console.log("\n==> Phase B + C complete.");
console.log("UI links:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
console.log("  https://tests.semantius.app/domain_map/cross_domain_handoffs");
console.log("  https://tests.semantius.app/domain_map/business_function_domains");
