#!/usr/bin/env bun
// Loads NCDB (No-Code Database) + WORK-MGMT (Work Management) markets, plus
// LCAP capability backfill and cross-cutting OPERATIONAL-DATA-APPS / SEMANTIC-MODELING
// promotion. Also re-points Asana/Smartsheet from SPM-primary to WORK-MGMT-primary
// (SPM downgraded to partial) and cross-lists Notion/Coda into KMS-primary.
//
// Idempotent: natural-key reads first, only inserts missing rows.
// Chunked POSTs (≤50 rows) + stdin to avoid Windows command-line length limits.

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
// DOMAIN ROWS — full 7-field metadata required (rule #8)
// =========================================================================
type DomainRow = {
  domain_code: string; domain_name: string; description: string;
  crud_percentage: number; business_logic: string;
  min_org_size: string; cost_band: string;
  certification_required: boolean;
  usa_market_size_usd_m: number; market_size_source_year: number;
};

function validateDomainRow(d: DomainRow): void {
  const errs: string[] = [];
  if (!d.domain_code) errs.push("domain_code empty");
  if (!d.domain_name) errs.push("domain_name empty");
  if (!d.description) errs.push("description empty");
  if (d.crud_percentage === 0) errs.push("crud_percentage is 0");
  if (d.crud_percentage < 0 || d.crud_percentage > 100) errs.push("crud_percentage out of range");
  if (d.min_org_size === "") errs.push("min_org_size empty");
  if (d.cost_band === "") errs.push("cost_band empty");
  if (d.business_logic === "" && d.crud_percentage < 95) errs.push("business_logic empty but crud_percentage < 95");
  if (d.usa_market_size_usd_m === 0) errs.push("usa_market_size_usd_m is 0");
  if (d.market_size_source_year === 0) errs.push("market_size_source_year is 0");
  if (errs.length > 0) throw new Error(`Domain ${d.domain_code} failed validation: ${errs.join("; ")}`);
}

const newDomains: DomainRow[] = [
  {
    domain_code: "NCDB",
    domain_name: "No-Code Database",
    description:
      "Spreadsheet-database hybrids letting non-developers model structured data, link records across tables, build forms/views/dashboards, and automate without code. Bought self-serve by citizen developers in marketing, ops, HR, and PMO; expands to enterprise via Business/Enterprise tiers. Distinct from LCAP (no managed app runtime, no environments/version pipeline, no compiled UI), from BI (no warehouse, no analytical semantic layer), and from work management (the data model is the buy reason, not the project view). Vendors: Airtable, Notion, Coda, Quickbase, Baserow, NocoDB, Rows, Stackby.",
    crud_percentage: 80,
    business_logic:
      "Spreadsheet-style formula fields with cross-table rollups and lookups; bidirectional sync engines that mirror records to/from external systems (Salesforce, Postgres, Google Sheets, Jira); automation actions that combine event triggers with conditional logic and external API calls; embedded AI for record summarization, classification, and generation (Airtable AI, Notion AI).",
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 1000,
    market_size_source_year: 2025,
  },
  {
    domain_code: "WORK-MGMT",
    domain_name: "Work Management",
    description:
      "Task, project, and workflow management for cross-functional work — assignments with owners and due dates, dependencies, statuses, dashboards, automations, and goal/OKR tracking. Bought by PMOs, BizOps, marketing, and any team running structured work that isn't engineering-specific. Distinct from SPM (top-down portfolio investment decision, CIO/EPMO buyer), from PSA (services billing/utilization for revenue-generating projects), and from Jira Software (engineering team sprints + dev workflow). Vendors: Monday.com, Asana, Smartsheet, ClickUp, Wrike, Trello, Basecamp, Teamwork, Hive.",
    crud_percentage: 90,
    business_logic:
      "Cross-project resource leveling and capacity calculations; critical-path and dependency scheduling on linked tasks; OKR-to-task progress rollup with weighted contribution; recurring-task generation rules; AI features for task summarization, status drafting, and risk flagging (Asana Intelligence, Monday AI, ClickUp Brain).",
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 1800,
    market_size_source_year: 2025,
  },
];

for (const d of newDomains) validateDomainRow(d);

// =========================================================================
// CAPABILITIES — new (NCDB, WORK-MGMT, LCAP) + cross-cutting promotions
// =========================================================================
type CapRow = { capability_code: string; capability_name: string; description: string };

const ncdbCaps: CapRow[] = [
  {
    capability_code: "NCDB-FLEX-SCHEMA",
    capability_name: "Flexible Schema and Rich Field Types",
    description: "User-defined tables and fields without DBA involvement; rich field types including attachment, single/multi-select, status, person, date, currency, rating, formula, lookup, and rollup. Schema evolves at runtime through the UI; downstream views and automations adapt without code changes.",
  },
  {
    capability_code: "NCDB-LINKED-RECORDS",
    capability_name: "Linked Records and Junction Tables",
    description: "First-class relationships between tables (one-to-many, many-to-many, self-referential), with linked-record fields that surface related records inline, two-way navigation, and junction-table modeling for many-to-many without manual SQL.",
  },
  {
    capability_code: "NCDB-VIEWS",
    capability_name: "Multi-View Data Presentation",
    description: "Switchable presentation of the same underlying records as grid, gallery, kanban (by status/category), calendar (by date field), timeline/Gantt, and form views. Each view filters, sorts, groups, and hides fields independently; views are shareable per-user or per-role.",
  },
  {
    capability_code: "NCDB-FORMULAS",
    capability_name: "Formula Fields and Rollups",
    description: "Spreadsheet-style derived columns with arithmetic, string, date, and conditional functions; cross-table rollups that aggregate child records; lookup fields that surface fields from linked records. The expressiveness gap with full code is where vendors differentiate.",
  },
  {
    capability_code: "NCDB-FORM-CAPTURE",
    capability_name: "Form-Based Data Capture",
    description: "Public or authenticated forms that write directly into a table, with conditional logic, prefilled URL parameters, file uploads, and survey-style branching. The primary intake surface for non-database users contributing structured data.",
  },
  {
    capability_code: "NCDB-SYNC-EXTERNAL",
    capability_name: "Bidirectional External Sync",
    description: "Live or scheduled bidirectional synchronization between a base/table and external systems of record (Salesforce, Jira, Postgres, Google Sheets, Stripe). Updates flow both directions with conflict handling, so the no-code database becomes a working surface over canonical data rather than a copy.",
  },
];

const workMgmtCaps: CapRow[] = [
  {
    capability_code: "WORK-TASK-MGMT",
    capability_name: "Task Management and Assignment",
    description: "Task creation with owner, due date, priority, status, subtasks, attachments, and comments; bulk operations; recurring tasks; my-work / inbox views per user. The atomic primitive on which everything else builds.",
  },
  {
    capability_code: "WORK-DEPS-SCHED",
    capability_name: "Dependency-Based Scheduling and Gantt",
    description: "Linked predecessor/successor relationships between tasks (finish-to-start, start-to-start, etc.) with automatic schedule recalculation, critical-path highlighting, and Gantt/timeline visualization. Distinguishes serious project execution from to-do-list tools.",
  },
  {
    capability_code: "WORK-CAPACITY",
    capability_name: "Resource Capacity and Workload Visibility",
    description: "Per-person workload calculated from assigned tasks weighted by effort estimates, over-allocation flags, capacity-vs-demand heatmaps across teams, and reassignment workflows. The buyer-facing view that justifies adding seats.",
  },
  {
    capability_code: "WORK-GOALS-OKR",
    capability_name: "Goals and OKR Tracking",
    description: "Hierarchical goals/OKRs with measurable key results, weighted progress rollup from child tasks/projects, owner accountability views, and quarterly cadence reporting. The strategy-to-execution link that pushes WORK-MGMT into VP/exec rooms.",
  },
  {
    capability_code: "WORK-WORKFLOW-AUTO",
    capability_name: "Workflow Automation",
    description: "Trigger-action automations on tasks and items (status change, due date, assignment, form submission) with conditional branches, multi-step actions, time-based delays, and external integrations. The vendor differentiator that moves teams off email-and-spreadsheet workflows.",
  },
  {
    capability_code: "WORK-DASHBOARDS",
    capability_name: "Cross-Project Dashboards",
    description: "Configurable dashboards combining widgets across multiple projects/boards: task counts by status, burndown, velocity, workload, custom-field rollups, and embedded reports. The artifact a PM presents weekly to leadership.",
  },
];

const lcapCaps: CapRow[] = [
  {
    capability_code: "LCAP-VISUAL-MODELING",
    capability_name: "Visual Application Modeling",
    description: "Drag-and-drop and model-driven authoring of UI, data model, and business logic, generating a deployable application without hand-coded scaffolding. Spans visual page composers, data-modeling canvases, and visual logic flows.",
  },
  {
    capability_code: "LCAP-MANAGED-RUNTIME",
    capability_name: "Managed Application Runtime",
    description: "Vendor-operated runtime for compiled or interpreted low-code apps, including auto-scaling, multi-tenant hosting, version pinning per environment, logging, and observability. Distinguishes LCAP from build-and-deploy-yourself frameworks.",
  },
  {
    capability_code: "LCAP-INTEGRATION-CONNECTORS",
    capability_name: "Pre-built Integration Connectors",
    description: "Library of certified connectors to enterprise systems (SAP, Salesforce, Oracle DB, Microsoft 365, REST/SOAP APIs, databases) with authentication handling, schema introspection, and bidirectional read/write. Reduces the integration tax that kills custom development.",
  },
  {
    capability_code: "LCAP-WORKFLOW-AUTO",
    capability_name: "Process and Workflow Automation",
    description: "Long-running process orchestration with human tasks, approvals, escalations, parallel/sequential branches, SLA tracking, and case-management primitives. Where LCAP overlaps with BPM/iBPMS.",
  },
  {
    capability_code: "LCAP-LIFECYCLE-MGMT",
    capability_name: "Application Lifecycle Management",
    description: "Dev/test/prod environments, promotion pipelines, versioning, rollback, dependency management, branch/merge of model artifacts, and CI/CD integration. The governance layer that makes LCAP enterprise-credible vs spreadsheet-replacement tools.",
  },
  {
    capability_code: "LCAP-AI-ASSIST",
    capability_name: "AI Application and Code Assist",
    description: "Natural-language app generation, AI-suggested data models, UI scaffolding from prompts, code/expression completion, and AI-assisted refactoring inside the visual builder. The 2024+ feature line every LCAP vendor is racing to ship.",
  },
];

const allNewCaps = [...ncdbCaps, ...workMgmtCaps, ...lcapCaps];

// =========================================================================
// VENDORS — new entries (existing vendors looked up at runtime)
// =========================================================================
const newVendors = [
  { vendor_name: "Airtable Inc.", vendor_url: "https://www.airtable.com", headquarters_country: "USA", description: "No-code database / app platform with flexible schema, views, automations, and Interface Designer.", notes: "Founded 2012, HQ San Francisco. Private; backed by Thrive, Coatue, Benchmark." },
  { vendor_name: "Notion Labs Inc.", vendor_url: "https://www.notion.so", headquarters_country: "USA", description: "All-in-one workspace combining docs, wikis, databases, and lightweight project management.", notes: "Founded 2013, HQ San Francisco. Private; Series C at $10B valuation (2021)." },
  { vendor_name: "Grammarly Inc.", vendor_url: "https://coda.io", headquarters_country: "USA", description: "Owner of Coda (acquired late 2024) — a doc-database hybrid for collaborative apps. Also operates Grammarly writing assistant.", notes: "Acquired Coda in 2024 to extend into collaborative-doc and AI-agent territory; the Coda product brand persists." },
  { vendor_name: "Baserow B.V.", vendor_url: "https://baserow.io", headquarters_country: "Netherlands", description: "Open-source no-code database platform; self-hostable or SaaS-managed.", notes: "Founded 2017, HQ Amsterdam. Apache-licensed core." },
  { vendor_name: "NocoDB Inc.", vendor_url: "https://www.nocodb.com", headquarters_country: "USA / India", description: "Open-source no-code platform that turns any database into a smart spreadsheet.", notes: "Founded 2021, dual-HQ Bengaluru / San Francisco. AGPL-licensed core." },
  { vendor_name: "Rows Inc.", vendor_url: "https://rows.com", headquarters_country: "Portugal", description: "Spreadsheet-database hybrid with live data connectors (Stripe, Salesforce, Postgres, HubSpot).", notes: "Founded 2016, HQ Lisbon. Private; backed by Lakestar, Accel." },
  { vendor_name: "Stackby Solutions", vendor_url: "https://www.stackby.com", headquarters_country: "India / USA", description: "No-code database with pre-built API integrations (50+ services) and template marketplace.", notes: "Founded 2017." },
  { vendor_name: "Monday.com Ltd.", vendor_url: "https://monday.com", headquarters_country: "Israel", description: "Work OS spanning task/project management, CRM, dev, and service modules built on a common board primitive.", notes: "Public NASDAQ:MNDY since 2021. Founded 2012, HQ Tel Aviv." },
  { vendor_name: "Mango Technologies Inc.", vendor_url: "https://clickup.com", headquarters_country: "USA", description: "Operator of ClickUp — work-management platform consolidating tasks, docs, goals, dashboards.", notes: "DBA ClickUp. Founded 2017, HQ San Diego. Private; Series C at $4B valuation (2021)." },
  { vendor_name: "Wrike Inc.", vendor_url: "https://www.wrike.com", headquarters_country: "USA", description: "Collaborative work management platform with strong Gantt + resource management.", notes: "Acquired by Citrix 2021, then divested to Symphony Technology Group 2022. Founded 2006." },
  { vendor_name: "Hive Technology Inc.", vendor_url: "https://hive.com", headquarters_country: "USA", description: "Project management platform with focus on productivity team workflows, time tracking, and meeting tools.", notes: "Founded 2015, HQ New York." },
  { vendor_name: "Teamwork.com Ltd.", vendor_url: "https://www.teamwork.com", headquarters_country: "Ireland", description: "Project management platform built around client/services workflows with billing and resource management.", notes: "Founded 2007, HQ Cork. Profitable independent." },
  { vendor_name: "37signals LLC", vendor_url: "https://basecamp.com", headquarters_country: "USA", description: "Operator of Basecamp — opinionated project communication and management tool emphasising simplicity.", notes: "Founded 1999, HQ Chicago. Profitable independent; vocal about staying small." },
];

// =========================================================================
// SOLUTIONS — new entries (existing solutions reused from catalog)
// =========================================================================
type SolDraft = { solution_name: string; vendor_natural: string; description: string };

const newSolutions: SolDraft[] = [
  // NCDB
  { solution_name: "Airtable",  vendor_natural: "Airtable Inc.", description: "No-code database platform: linked tables, views (grid/gallery/kanban/calendar/timeline), forms, automations, and Interface Designer apps with write-back." },
  { solution_name: "Notion",    vendor_natural: "Notion Labs Inc.", description: "All-in-one workspace: collaborative docs and wiki, databases with multiple views, lightweight tasks, AI assistant. Primary buy reason is the team wiki + collaborative documents; database and task features are secondary." },
  { solution_name: "Coda",      vendor_natural: "Grammarly Inc.", description: "Doc-database hybrid where structured tables and apps live inside collaborative documents. Owned by Grammarly after the 2024 acquisition; product brand and team retained." },
  { solution_name: "Baserow",   vendor_natural: "Baserow B.V.", description: "Open-source Airtable alternative with self-hostable database, linked records, formulas, and a plugin ecosystem." },
  { solution_name: "NocoDB",    vendor_natural: "NocoDB Inc.", description: "Open-source no-code platform that overlays a spreadsheet UI on any SQL database, with views, forms, and webhooks." },
  { solution_name: "Rows",      vendor_natural: "Rows Inc.", description: "Spreadsheet with built-in live data connectors (Stripe, Salesforce, HubSpot, Postgres) and AI features. Differentiator vs Airtable: a spreadsheet metaphor with database power, not the other way around." },
  { solution_name: "Stackby",   vendor_natural: "Stackby Solutions", description: "No-code database with pre-built integrations across 50+ services, designed for marketing, content, and ops workflows." },
  // WORK-MGMT
  { solution_name: "Monday.com Work OS", vendor_natural: "Monday.com Ltd.", description: "Configurable work-OS built on a board primitive; spans task/project management, CRM, dev tracker, and service modules with shared automation engine." },
  { solution_name: "ClickUp",   vendor_natural: "Mango Technologies Inc.", description: "Consolidated work-management platform: tasks, docs, goals, dashboards, time tracking, and chat in one app. Aggressive product breadth strategy." },
  { solution_name: "Wrike",     vendor_natural: "Wrike Inc.", description: "Collaborative work management with strong Gantt, resource workload management, request forms, and proofing for creative teams." },
  { solution_name: "Trello",    vendor_natural: "Atlassian", description: "Kanban-first task management with Power-Ups for added capability (Gantt, automation, custom fields). Owned by Atlassian since 2017." },
  { solution_name: "Basecamp",  vendor_natural: "37signals LLC", description: "Opinionated, low-feature project communication tool: message boards, to-dos, schedule, docs, chat. Sells flat-rate pricing." },
  { solution_name: "Teamwork",  vendor_natural: "Teamwork.com Ltd.", description: "Project management built around services workflows: client billing, time tracking, resource utilisation, milestone management." },
  { solution_name: "Hive",      vendor_natural: "Hive Technology Inc.", description: "Project management with multi-view task tracking, native messaging, time tracking, and meeting notes." },
];

// =========================================================================
// CAPABILITY → DOMAIN linking (incl. cross-cutting promotions)
// =========================================================================
// New capabilities → their semantic-home domain
const newCapDomains: { cap: string; domain: string }[] = [
  ...ncdbCaps.map(c => ({ cap: c.capability_code, domain: "NCDB" })),
  ...workMgmtCaps.map(c => ({ cap: c.capability_code, domain: "WORK-MGMT" })),
  ...lcapCaps.map(c => ({ cap: c.capability_code, domain: "LCAP" })),
];

// Cross-cutting promotions (additive — existing links untouched)
const crossCuttingPromotions: { cap: string; domain: string }[] = [
  { cap: "OPERATIONAL-DATA-APPS", domain: "LCAP" },
  { cap: "OPERATIONAL-DATA-APPS", domain: "NCDB" },
  { cap: "SEMANTIC-MODELING", domain: "NCDB" },
  { cap: "APPROVAL-WORKFLOW", domain: "WORK-MGMT" },
];

// =========================================================================
// SOLUTION → DOMAIN coverage
// =========================================================================
type SolDomain = { solution: string; domain: string; coverage: "primary" | "secondary" | "partial" };

const solDomains: SolDomain[] = [
  // NCDB
  { solution: "Airtable", domain: "NCDB", coverage: "primary" },
  { solution: "Baserow", domain: "NCDB", coverage: "primary" },
  { solution: "NocoDB", domain: "NCDB", coverage: "primary" },
  { solution: "Rows", domain: "NCDB", coverage: "primary" },
  { solution: "Stackby", domain: "NCDB", coverage: "primary" },
  { solution: "Notion", domain: "NCDB", coverage: "secondary" },
  { solution: "Coda", domain: "NCDB", coverage: "secondary" },
  { solution: "Quickbase", domain: "NCDB", coverage: "secondary" }, // existing solution, cross-list

  // WORK-MGMT
  { solution: "Monday.com Work OS", domain: "WORK-MGMT", coverage: "primary" },
  { solution: "Asana", domain: "WORK-MGMT", coverage: "primary" },     // existing
  { solution: "Smartsheet", domain: "WORK-MGMT", coverage: "primary" }, // existing
  { solution: "ClickUp", domain: "WORK-MGMT", coverage: "primary" },
  { solution: "Wrike", domain: "WORK-MGMT", coverage: "primary" },
  { solution: "Trello", domain: "WORK-MGMT", coverage: "primary" },
  { solution: "Basecamp", domain: "WORK-MGMT", coverage: "primary" },
  { solution: "Teamwork", domain: "WORK-MGMT", coverage: "primary" },
  { solution: "Hive", domain: "WORK-MGMT", coverage: "secondary" },
  { solution: "Notion", domain: "WORK-MGMT", coverage: "partial" },

  // KMS cross-list for Notion / Coda (real primary market)
  { solution: "Notion", domain: "KMS", coverage: "primary" },
  { solution: "Coda", domain: "KMS", coverage: "primary" },
];

// =========================================================================
// SOLUTION → CAPABILITY delivery_strength matrix
// =========================================================================
type SolCap = { solution: string; capability: string; strength: "native" | "partial" | "via_extension" | "not_supported" };

// NCDB matrix (NCDB caps + cross-cutting OPERATIONAL-DATA-APPS, SEMANTIC-MODELING)
const ncdbSolCaps: SolCap[] = [
  // Airtable
  { solution: "Airtable", capability: "NCDB-FLEX-SCHEMA", strength: "native" },
  { solution: "Airtable", capability: "NCDB-LINKED-RECORDS", strength: "native" },
  { solution: "Airtable", capability: "NCDB-VIEWS", strength: "native" },
  { solution: "Airtable", capability: "NCDB-FORMULAS", strength: "native" },
  { solution: "Airtable", capability: "NCDB-FORM-CAPTURE", strength: "native" },
  { solution: "Airtable", capability: "NCDB-SYNC-EXTERNAL", strength: "native" },
  { solution: "Airtable", capability: "OPERATIONAL-DATA-APPS", strength: "native" },
  { solution: "Airtable", capability: "SEMANTIC-MODELING", strength: "partial" },
  // Notion
  { solution: "Notion", capability: "NCDB-FLEX-SCHEMA", strength: "native" },
  { solution: "Notion", capability: "NCDB-LINKED-RECORDS", strength: "native" },
  { solution: "Notion", capability: "NCDB-VIEWS", strength: "native" },
  { solution: "Notion", capability: "NCDB-FORMULAS", strength: "native" },
  { solution: "Notion", capability: "NCDB-FORM-CAPTURE", strength: "partial" },
  { solution: "Notion", capability: "NCDB-SYNC-EXTERNAL", strength: "partial" },
  { solution: "Notion", capability: "OPERATIONAL-DATA-APPS", strength: "partial" },
  { solution: "Notion", capability: "SEMANTIC-MODELING", strength: "partial" },
  // Coda
  { solution: "Coda", capability: "NCDB-FLEX-SCHEMA", strength: "native" },
  { solution: "Coda", capability: "NCDB-LINKED-RECORDS", strength: "native" },
  { solution: "Coda", capability: "NCDB-VIEWS", strength: "native" },
  { solution: "Coda", capability: "NCDB-FORMULAS", strength: "native" },
  { solution: "Coda", capability: "NCDB-FORM-CAPTURE", strength: "partial" },
  { solution: "Coda", capability: "NCDB-SYNC-EXTERNAL", strength: "partial" },
  { solution: "Coda", capability: "OPERATIONAL-DATA-APPS", strength: "native" },
  { solution: "Coda", capability: "SEMANTIC-MODELING", strength: "partial" },
  // Baserow
  { solution: "Baserow", capability: "NCDB-FLEX-SCHEMA", strength: "native" },
  { solution: "Baserow", capability: "NCDB-LINKED-RECORDS", strength: "native" },
  { solution: "Baserow", capability: "NCDB-VIEWS", strength: "native" },
  { solution: "Baserow", capability: "NCDB-FORMULAS", strength: "native" },
  { solution: "Baserow", capability: "NCDB-FORM-CAPTURE", strength: "native" },
  { solution: "Baserow", capability: "NCDB-SYNC-EXTERNAL", strength: "partial" },
  { solution: "Baserow", capability: "OPERATIONAL-DATA-APPS", strength: "partial" },
  { solution: "Baserow", capability: "SEMANTIC-MODELING", strength: "not_supported" },
  // NocoDB
  { solution: "NocoDB", capability: "NCDB-FLEX-SCHEMA", strength: "native" },
  { solution: "NocoDB", capability: "NCDB-LINKED-RECORDS", strength: "native" },
  { solution: "NocoDB", capability: "NCDB-VIEWS", strength: "native" },
  { solution: "NocoDB", capability: "NCDB-FORMULAS", strength: "partial" },
  { solution: "NocoDB", capability: "NCDB-FORM-CAPTURE", strength: "partial" },
  { solution: "NocoDB", capability: "NCDB-SYNC-EXTERNAL", strength: "native" }, // it lives on top of a DB
  { solution: "NocoDB", capability: "OPERATIONAL-DATA-APPS", strength: "partial" },
  { solution: "NocoDB", capability: "SEMANTIC-MODELING", strength: "not_supported" },
  // Rows
  { solution: "Rows", capability: "NCDB-FLEX-SCHEMA", strength: "partial" },
  { solution: "Rows", capability: "NCDB-LINKED-RECORDS", strength: "partial" },
  { solution: "Rows", capability: "NCDB-VIEWS", strength: "partial" },
  { solution: "Rows", capability: "NCDB-FORMULAS", strength: "native" }, // spreadsheet heritage
  { solution: "Rows", capability: "NCDB-FORM-CAPTURE", strength: "partial" },
  { solution: "Rows", capability: "NCDB-SYNC-EXTERNAL", strength: "native" }, // its differentiator
  { solution: "Rows", capability: "OPERATIONAL-DATA-APPS", strength: "partial" },
  { solution: "Rows", capability: "SEMANTIC-MODELING", strength: "not_supported" },
  // Stackby
  { solution: "Stackby", capability: "NCDB-FLEX-SCHEMA", strength: "native" },
  { solution: "Stackby", capability: "NCDB-LINKED-RECORDS", strength: "native" },
  { solution: "Stackby", capability: "NCDB-VIEWS", strength: "native" },
  { solution: "Stackby", capability: "NCDB-FORMULAS", strength: "native" },
  { solution: "Stackby", capability: "NCDB-FORM-CAPTURE", strength: "native" },
  { solution: "Stackby", capability: "NCDB-SYNC-EXTERNAL", strength: "partial" },
  { solution: "Stackby", capability: "OPERATIONAL-DATA-APPS", strength: "partial" },
  { solution: "Stackby", capability: "SEMANTIC-MODELING", strength: "not_supported" },
  // Quickbase (existing) — NCDB-side
  { solution: "Quickbase", capability: "NCDB-FLEX-SCHEMA", strength: "native" },
  { solution: "Quickbase", capability: "NCDB-LINKED-RECORDS", strength: "native" },
  { solution: "Quickbase", capability: "NCDB-VIEWS", strength: "native" },
  { solution: "Quickbase", capability: "NCDB-FORMULAS", strength: "native" },
  { solution: "Quickbase", capability: "NCDB-FORM-CAPTURE", strength: "native" },
  { solution: "Quickbase", capability: "NCDB-SYNC-EXTERNAL", strength: "native" },
  { solution: "Quickbase", capability: "OPERATIONAL-DATA-APPS", strength: "native" },
  { solution: "Quickbase", capability: "SEMANTIC-MODELING", strength: "partial" },
];

// WORK-MGMT matrix (WORK-MGMT caps + cross-cutting APPROVAL-WORKFLOW)
const workSolCaps: SolCap[] = [
  // Monday.com Work OS
  { solution: "Monday.com Work OS", capability: "WORK-TASK-MGMT", strength: "native" },
  { solution: "Monday.com Work OS", capability: "WORK-DEPS-SCHED", strength: "native" },
  { solution: "Monday.com Work OS", capability: "WORK-CAPACITY", strength: "native" },
  { solution: "Monday.com Work OS", capability: "WORK-GOALS-OKR", strength: "native" },
  { solution: "Monday.com Work OS", capability: "WORK-WORKFLOW-AUTO", strength: "native" },
  { solution: "Monday.com Work OS", capability: "WORK-DASHBOARDS", strength: "native" },
  { solution: "Monday.com Work OS", capability: "APPROVAL-WORKFLOW", strength: "native" },
  // Asana
  { solution: "Asana", capability: "WORK-TASK-MGMT", strength: "native" },
  { solution: "Asana", capability: "WORK-DEPS-SCHED", strength: "native" },
  { solution: "Asana", capability: "WORK-CAPACITY", strength: "native" },
  { solution: "Asana", capability: "WORK-GOALS-OKR", strength: "native" },
  { solution: "Asana", capability: "WORK-WORKFLOW-AUTO", strength: "native" },
  { solution: "Asana", capability: "WORK-DASHBOARDS", strength: "native" },
  { solution: "Asana", capability: "APPROVAL-WORKFLOW", strength: "native" },
  // Smartsheet
  { solution: "Smartsheet", capability: "WORK-TASK-MGMT", strength: "native" },
  { solution: "Smartsheet", capability: "WORK-DEPS-SCHED", strength: "native" }, // Gantt heritage
  { solution: "Smartsheet", capability: "WORK-CAPACITY", strength: "native" },
  { solution: "Smartsheet", capability: "WORK-GOALS-OKR", strength: "partial" },
  { solution: "Smartsheet", capability: "WORK-WORKFLOW-AUTO", strength: "native" },
  { solution: "Smartsheet", capability: "WORK-DASHBOARDS", strength: "native" },
  { solution: "Smartsheet", capability: "APPROVAL-WORKFLOW", strength: "native" },
  // ClickUp
  { solution: "ClickUp", capability: "WORK-TASK-MGMT", strength: "native" },
  { solution: "ClickUp", capability: "WORK-DEPS-SCHED", strength: "native" },
  { solution: "ClickUp", capability: "WORK-CAPACITY", strength: "native" },
  { solution: "ClickUp", capability: "WORK-GOALS-OKR", strength: "native" },
  { solution: "ClickUp", capability: "WORK-WORKFLOW-AUTO", strength: "native" },
  { solution: "ClickUp", capability: "WORK-DASHBOARDS", strength: "native" },
  { solution: "ClickUp", capability: "APPROVAL-WORKFLOW", strength: "native" },
  // Wrike
  { solution: "Wrike", capability: "WORK-TASK-MGMT", strength: "native" },
  { solution: "Wrike", capability: "WORK-DEPS-SCHED", strength: "native" },
  { solution: "Wrike", capability: "WORK-CAPACITY", strength: "native" }, // resource mgmt is a Wrike differentiator
  { solution: "Wrike", capability: "WORK-GOALS-OKR", strength: "partial" },
  { solution: "Wrike", capability: "WORK-WORKFLOW-AUTO", strength: "native" },
  { solution: "Wrike", capability: "WORK-DASHBOARDS", strength: "native" },
  { solution: "Wrike", capability: "APPROVAL-WORKFLOW", strength: "native" },
  // Trello
  { solution: "Trello", capability: "WORK-TASK-MGMT", strength: "native" },
  { solution: "Trello", capability: "WORK-DEPS-SCHED", strength: "via_extension" }, // Power-Ups
  { solution: "Trello", capability: "WORK-CAPACITY", strength: "via_extension" },
  { solution: "Trello", capability: "WORK-GOALS-OKR", strength: "not_supported" },
  { solution: "Trello", capability: "WORK-WORKFLOW-AUTO", strength: "via_extension" }, // Butler
  { solution: "Trello", capability: "WORK-DASHBOARDS", strength: "via_extension" },
  { solution: "Trello", capability: "APPROVAL-WORKFLOW", strength: "via_extension" },
  // Basecamp
  { solution: "Basecamp", capability: "WORK-TASK-MGMT", strength: "native" },
  { solution: "Basecamp", capability: "WORK-DEPS-SCHED", strength: "not_supported" },
  { solution: "Basecamp", capability: "WORK-CAPACITY", strength: "not_supported" },
  { solution: "Basecamp", capability: "WORK-GOALS-OKR", strength: "not_supported" },
  { solution: "Basecamp", capability: "WORK-WORKFLOW-AUTO", strength: "partial" },
  { solution: "Basecamp", capability: "WORK-DASHBOARDS", strength: "partial" },
  { solution: "Basecamp", capability: "APPROVAL-WORKFLOW", strength: "not_supported" },
  // Teamwork
  { solution: "Teamwork", capability: "WORK-TASK-MGMT", strength: "native" },
  { solution: "Teamwork", capability: "WORK-DEPS-SCHED", strength: "native" },
  { solution: "Teamwork", capability: "WORK-CAPACITY", strength: "native" },
  { solution: "Teamwork", capability: "WORK-GOALS-OKR", strength: "partial" },
  { solution: "Teamwork", capability: "WORK-WORKFLOW-AUTO", strength: "native" },
  { solution: "Teamwork", capability: "WORK-DASHBOARDS", strength: "native" },
  { solution: "Teamwork", capability: "APPROVAL-WORKFLOW", strength: "native" },
  // Hive
  { solution: "Hive", capability: "WORK-TASK-MGMT", strength: "native" },
  { solution: "Hive", capability: "WORK-DEPS-SCHED", strength: "native" },
  { solution: "Hive", capability: "WORK-CAPACITY", strength: "native" },
  { solution: "Hive", capability: "WORK-GOALS-OKR", strength: "partial" },
  { solution: "Hive", capability: "WORK-WORKFLOW-AUTO", strength: "native" },
  { solution: "Hive", capability: "WORK-DASHBOARDS", strength: "partial" },
  { solution: "Hive", capability: "APPROVAL-WORKFLOW", strength: "partial" },
  // Notion (WORK-MGMT partial)
  { solution: "Notion", capability: "WORK-TASK-MGMT", strength: "partial" },
  { solution: "Notion", capability: "WORK-DEPS-SCHED", strength: "not_supported" },
  { solution: "Notion", capability: "WORK-CAPACITY", strength: "not_supported" },
  { solution: "Notion", capability: "WORK-GOALS-OKR", strength: "partial" },
  { solution: "Notion", capability: "WORK-WORKFLOW-AUTO", strength: "partial" },
  { solution: "Notion", capability: "WORK-DASHBOARDS", strength: "partial" },
];

// LCAP backfill — 6 existing solutions × 6 LCAP caps + OPERATIONAL-DATA-APPS
const lcapSolCaps: SolCap[] = [
  // OutSystems
  { solution: "OutSystems", capability: "LCAP-VISUAL-MODELING", strength: "native" },
  { solution: "OutSystems", capability: "LCAP-MANAGED-RUNTIME", strength: "native" },
  { solution: "OutSystems", capability: "LCAP-INTEGRATION-CONNECTORS", strength: "native" },
  { solution: "OutSystems", capability: "LCAP-WORKFLOW-AUTO", strength: "native" },
  { solution: "OutSystems", capability: "LCAP-LIFECYCLE-MGMT", strength: "native" },
  { solution: "OutSystems", capability: "LCAP-AI-ASSIST", strength: "native" },
  { solution: "OutSystems", capability: "OPERATIONAL-DATA-APPS", strength: "native" },
  // Mendix
  { solution: "Mendix", capability: "LCAP-VISUAL-MODELING", strength: "native" },
  { solution: "Mendix", capability: "LCAP-MANAGED-RUNTIME", strength: "native" },
  { solution: "Mendix", capability: "LCAP-INTEGRATION-CONNECTORS", strength: "native" },
  { solution: "Mendix", capability: "LCAP-WORKFLOW-AUTO", strength: "native" },
  { solution: "Mendix", capability: "LCAP-LIFECYCLE-MGMT", strength: "native" },
  { solution: "Mendix", capability: "LCAP-AI-ASSIST", strength: "native" },
  { solution: "Mendix", capability: "OPERATIONAL-DATA-APPS", strength: "native" },
  // Microsoft Power Platform
  { solution: "Microsoft Power Platform", capability: "LCAP-VISUAL-MODELING", strength: "native" },
  { solution: "Microsoft Power Platform", capability: "LCAP-MANAGED-RUNTIME", strength: "native" },
  { solution: "Microsoft Power Platform", capability: "LCAP-INTEGRATION-CONNECTORS", strength: "native" },
  { solution: "Microsoft Power Platform", capability: "LCAP-WORKFLOW-AUTO", strength: "native" },
  { solution: "Microsoft Power Platform", capability: "LCAP-LIFECYCLE-MGMT", strength: "native" },
  { solution: "Microsoft Power Platform", capability: "LCAP-AI-ASSIST", strength: "native" }, // Copilot
  { solution: "Microsoft Power Platform", capability: "OPERATIONAL-DATA-APPS", strength: "native" }, // Power Apps + Dataverse
  // Appian
  { solution: "Appian Platform", capability: "LCAP-VISUAL-MODELING", strength: "native" },
  { solution: "Appian Platform", capability: "LCAP-MANAGED-RUNTIME", strength: "native" },
  { solution: "Appian Platform", capability: "LCAP-INTEGRATION-CONNECTORS", strength: "native" },
  { solution: "Appian Platform", capability: "LCAP-WORKFLOW-AUTO", strength: "native" }, // BPM heritage
  { solution: "Appian Platform", capability: "LCAP-LIFECYCLE-MGMT", strength: "native" },
  { solution: "Appian Platform", capability: "LCAP-AI-ASSIST", strength: "native" },
  { solution: "Appian Platform", capability: "OPERATIONAL-DATA-APPS", strength: "native" },
  // Quickbase
  { solution: "Quickbase", capability: "LCAP-VISUAL-MODELING", strength: "native" },
  { solution: "Quickbase", capability: "LCAP-MANAGED-RUNTIME", strength: "native" },
  { solution: "Quickbase", capability: "LCAP-INTEGRATION-CONNECTORS", strength: "native" },
  { solution: "Quickbase", capability: "LCAP-WORKFLOW-AUTO", strength: "native" },
  { solution: "Quickbase", capability: "LCAP-LIFECYCLE-MGMT", strength: "partial" },
  { solution: "Quickbase", capability: "LCAP-AI-ASSIST", strength: "partial" },
  // OPERATIONAL-DATA-APPS for Quickbase already covered in NCDB matrix above
  // Retool
  { solution: "Retool", capability: "LCAP-VISUAL-MODELING", strength: "native" },
  { solution: "Retool", capability: "LCAP-MANAGED-RUNTIME", strength: "native" },
  { solution: "Retool", capability: "LCAP-INTEGRATION-CONNECTORS", strength: "native" }, // its differentiator
  { solution: "Retool", capability: "LCAP-WORKFLOW-AUTO", strength: "native" }, // Workflows product
  { solution: "Retool", capability: "LCAP-LIFECYCLE-MGMT", strength: "partial" },
  { solution: "Retool", capability: "LCAP-AI-ASSIST", strength: "native" },
  { solution: "Retool", capability: "OPERATIONAL-DATA-APPS", strength: "native" },
];

// =========================================================================
// EXECUTION
// =========================================================================

console.log("==> Phase A: NCDB + WORK-MGMT + LCAP backfill + cross-cutting moves\n");

// --- DOMAINS ---
console.log("DOMAINS");
const domainMap = await syncTable("/domains", newDomains, "domain_code");
// All existing domains too
const allDomains = await get("/domains?select=id,domain_code&limit=10000");
for (const d of allDomains) domainMap.set(String(d.domain_code), Number(d.id));

// --- CAPABILITIES ---
console.log("CAPABILITIES");
const capMap = await syncTable("/capabilities", allNewCaps, "capability_code");
// All existing capabilities (for OPERATIONAL-DATA-APPS / SEMANTIC-MODELING / APPROVAL-WORKFLOW lookup)
const allCaps = await get("/capabilities?select=id,capability_code&limit=10000");
for (const c of allCaps) capMap.set(String(c.capability_code), Number(c.id));

// --- VENDORS ---
console.log("VENDORS");
const vendorMap = await syncTable("/vendors", newVendors, "vendor_name");
const allVendors = await get("/vendors?select=id,vendor_name&limit=10000");
for (const v of allVendors) vendorMap.set(String(v.vendor_name), Number(v.id));

// --- SOLUTIONS ---
console.log("SOLUTIONS");
const solutionsToInsert = newSolutions.map(s => {
  const vid = vendorMap.get(s.vendor_natural);
  if (!vid) throw new Error(`Vendor ${s.vendor_natural} not found for solution ${s.solution_name}`);
  return { solution_name: s.solution_name, vendor_id: vid, description: s.description };
});
const solMap = await syncTable("/solutions", solutionsToInsert, "solution_name");
const allSols = await get("/solutions?select=id,solution_name&limit=10000");
for (const s of allSols) solMap.set(String(s.solution_name), Number(s.id));

// --- CAPABILITY → DOMAIN ---
console.log("CAPABILITY_DOMAINS");
const wantCapDomains = [...newCapDomains, ...crossCuttingPromotions];
const existingCapDom = await get("/capability_domains?select=capability_id,domain_id&limit=20000");
const existingCapDomSet = new Set(existingCapDom.map(r => `${r.capability_id}:${r.domain_id}`));
const capDomToInsert = wantCapDomains
  .map(x => {
    const cid = capMap.get(x.cap);
    const did = domainMap.get(x.domain);
    if (!cid) throw new Error(`Capability ${x.cap} not found`);
    if (!did) throw new Error(`Domain ${x.domain} not found`);
    return { capability_id: cid, domain_id: did };
  })
  .filter(r => !existingCapDomSet.has(`${r.capability_id}:${r.domain_id}`));
if (capDomToInsert.length > 0) {
  console.log(`  inserting ${capDomToInsert.length} new capability_domains rows`);
  await insert("/capability_domains", capDomToInsert);
} else {
  console.log("  capability_domains: nothing new to insert");
}

// --- SOLUTION → DOMAIN ---
console.log("SOLUTION_DOMAINS");
const existingSolDom = await get("/solution_domains?select=solution_id,domain_id&limit=20000");
const existingSolDomSet = new Set(existingSolDom.map(r => `${r.solution_id}:${r.domain_id}`));
const solDomToInsert = solDomains
  .map(x => {
    const sid = solMap.get(x.solution);
    const did = domainMap.get(x.domain);
    if (!sid) throw new Error(`Solution ${x.solution} not found`);
    if (!did) throw new Error(`Domain ${x.domain} not found`);
    return { solution_id: sid, domain_id: did, coverage_level: x.coverage };
  })
  .filter(r => !existingSolDomSet.has(`${r.solution_id}:${r.domain_id}`));
if (solDomToInsert.length > 0) {
  console.log(`  inserting ${solDomToInsert.length} new solution_domains rows`);
  await insert("/solution_domains", solDomToInsert);
} else {
  console.log("  solution_domains: nothing new to insert");
}

// --- Re-point Asana / Smartsheet on SPM from primary → partial ---
console.log("RECLASSIFY Asana/Smartsheet SPM coverage → partial");
const asanaId = solMap.get("Asana");
const smartsheetId = solMap.get("Smartsheet");
const spmId = domainMap.get("SPM");
for (const [sname, sid] of [["Asana", asanaId], ["Smartsheet", smartsheetId]] as const) {
  if (!sid || !spmId) continue;
  const cur = await get(`/solution_domains?solution_id=eq.${sid}&domain_id=eq.${spmId}&select=coverage_level`);
  if (cur.length === 0) {
    console.log(`  ${sname}: no SPM row to update`);
    continue;
  }
  if (cur[0].coverage_level === "partial") {
    console.log(`  ${sname}: SPM already partial`);
    continue;
  }
  await call({ method: "PATCH", path: `/solution_domains?solution_id=eq.${sid}&domain_id=eq.${spmId}`, body: { coverage_level: "partial" } });
  console.log(`  ${sname}: SPM ${cur[0].coverage_level} → partial`);
}

// --- SOLUTION → CAPABILITY matrix ---
console.log("SOLUTION_CAPABILITIES");
const allSolCaps = [...ncdbSolCaps, ...workSolCaps, ...lcapSolCaps];
const existingSolCap = await get("/solution_capabilities?select=solution_id,capability_id&limit=20000");
const existingSolCapSet = new Set(existingSolCap.map(r => `${r.solution_id}:${r.capability_id}`));
const solCapToInsert = allSolCaps
  .map(x => {
    const sid = solMap.get(x.solution);
    const cid = capMap.get(x.capability);
    if (!sid) throw new Error(`Solution ${x.solution} not found in matrix`);
    if (!cid) throw new Error(`Capability ${x.capability} not found in matrix`);
    return { solution_id: sid, capability_id: cid, delivery_strength: x.strength };
  })
  .filter(r => !existingSolCapSet.has(`${r.solution_id}:${r.capability_id}`));
if (solCapToInsert.length > 0) {
  console.log(`  inserting ${solCapToInsert.length} new solution_capabilities rows`);
  await insert("/solution_capabilities", solCapToInsert);
} else {
  console.log("  solution_capabilities: nothing new to insert");
}

// --- POST-LOAD AUDIT (rule #8, prevention #3) ---
console.log("\nPOST-LOAD AUDIT: domains with default-zero metadata");
const zeros = await get(
  "/domains?select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m&crud_percentage=eq.0&order=id.desc&limit=50"
);
if (zeros.length > 0) {
  console.log(`  WARNING: ${zeros.length} domain rows still at crud_percentage=0:`);
  for (const z of zeros) console.log(`    - ${z.domain_code}`);
} else {
  console.log("  no domains at crud_percentage=0");
}

console.log("\n==> Phase A complete.");
console.log("UI links:");
console.log("  https://tests.semantius.app/domain_map/domains");
console.log("  https://tests.semantius.app/domain_map/capabilities");
console.log("  https://tests.semantius.app/domain_map/solutions");
console.log("  https://tests.semantius.app/domain_map/solution_domains");
console.log("  https://tests.semantius.app/domain_map/solution_capabilities");
