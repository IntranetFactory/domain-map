/**
 * CRM domain audit fix loader (2026-05-24).
 *
 * Idempotent. Safe to re-run. Run from project root:
 *   bun run .tmp_deploy/fix_crm_audit_2026_05_24.ts
 *
 * Scope (per per-domain completeness checklist):
 *   M1-M6: load 5 domain_modules + domain_module_capabilities +
 *          domain_module_data_objects + domain_starter_modules.
 *   B4:    annotate pattern flags on CRM masters (review pass).
 *   B6:    add intra-domain data_object_relationships.
 *   B7:    add users-edge relationships for crm_leads / crm_opportunities /
 *          crm_contacts / sales_activities.
 *   B11:   add missing aliases on crm_contacts / crm_leads / crm_opportunities /
 *          pipeline_stages / sales_activities.
 *   B12:   dedupe duplicate lifecycle states on customers (id 97); annotate
 *          pipeline_stages + sales_activities as config-shape exemptions in
 *          data_objects.notes; attach lifecycle workflow gates to modules.
 *   B10b:  backfill cross_domain_handoffs.source_domain_module_id (outbound)
 *          and target_domain_module_id (inbound) for all 66 CRM-touching rows.
 *   E1-E6: author 4 roles (SALES-AE, SALES-SDR, SALES-MGR, SALES-OPS) +
 *          role_modules + role_permissions bundles.
 *   Permissions: 5 modules x (read, manage, admin) + 2 workflow-gate
 *          permissions for crm_leads.convert_lead and crm_opportunities.close_won.
 *
 * Defers (documented in fix report):
 *   A4: solution_capabilities matrix backfill (industry-cloud variants etc.)
 *   A6: solution_data_objects for the 24 CRM solutions.
 *   F1: legacy `crm-system` skill stays (transitional state acceptable; no
 *       per-module system skills authored in this pass).
 */

const CRM_DOMAIN_ID = 69;
const DOMAIN_MAP_MODULE_ID = 1001;
const SALES_FUNCTION_ID = 21;
const USERS_DATA_OBJECT_ID = 748;

const ROLE_RANK: Record<string, number> = {
  master: 0,
  embedded_master: 1,
  contributor: 2,
  consumer: 3,
  derived: 4,
};

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  error: string;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    const err = stderr.trim() || stdout.trim();
    return { ok: false, data: null, status: code, error: err };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, error: "" };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.error}`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.error}\n  body: ${JSON.stringify(body).slice(0, 400)}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.error}`);
  return r.data;
}

async function del(path: string): Promise<any> {
  const r = await postgrest("DELETE", path);
  if (!r.ok) throw new Error(`DELETE ${path} failed: ${r.error}`);
  return r.data;
}

function strongest<T extends { role: string }>(rows: T[]): T[] {
  if (rows.length === 0) return [];
  const minRank = Math.min(...rows.map((r) => ROLE_RANK[r.role] ?? 99));
  return rows.filter((r) => (ROLE_RANK[r.role] ?? 99) === minRank);
}

const counters: Record<string, number> = {};
function bump(k: string, n = 1) {
  counters[k] = (counters[k] ?? 0) + n;
}

// ---------------------------------------------------------------------------
// Phase M: domain_modules + junctions + starter
// ---------------------------------------------------------------------------

interface ModuleDef {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_codes: string[];
  data_objects: { name: string; role: string; necessity: string; notes?: string }[];
}

const MODULE_DEFS: ModuleDef[] = [
  {
    domain_module_code: "CRM-ACCT-MGT",
    domain_module_name: "Account and Contact Management",
    description: "Masters customer accounts and their associated contacts. The structural backbone of the CRM market: every other CRM module hangs off the account/contact graph. Folds the cross-cutting Customer 360 capability because the unified-customer-view is anchored on the account/contact records this module owns.",
    capability_codes: ["CRM-ACCT-CONTACT", "CUSTOMER-360"],
    data_objects: [
      { name: "customers", role: "master", necessity: "required" },
      { name: "crm_contacts", role: "master", necessity: "required" },
      { name: "customer_cases", role: "consumer", necessity: "required", notes: "Account-health signal." },
      { name: "customer_subscriptions", role: "consumer", necessity: "required" },
      { name: "customer_invoices", role: "consumer", necessity: "required" },
      { name: "audience_segments", role: "consumer", necessity: "required" },
      { name: "customer_attributes", role: "consumer", necessity: "required" },
      { name: "customer_events", role: "contributor", necessity: "required" },
    ],
  },
  {
    domain_module_code: "CRM-LEAD-MGT",
    domain_module_name: "Lead Capture and Qualification",
    description: "Captures inbound and prospected leads, scores and routes them, and converts qualified leads to contacts and opportunities. The top-of-funnel module: a CRM deployment without lead management is viable for pure account-management shops, which is why this is a separate module rather than folded into Account Management.",
    capability_codes: ["CRM-LEAD-MGT"],
    data_objects: [
      { name: "crm_leads", role: "master", necessity: "required" },
      { name: "lead_scores", role: "consumer", necessity: "required", notes: "MQL threshold drives lead routing and rep assignment." },
    ],
  },
  {
    domain_module_code: "CRM-PIPELINE-MGT",
    domain_module_name: "Opportunity and Pipeline Management",
    description: "Masters opportunities, the pipeline-stage definitions that opportunities progress through, and the forecasting roll-ups computed from weighted pipeline. The revenue-execution module: where deal management, sales forecasting, and pipeline health analytics live.",
    capability_codes: ["CRM-OPPTY-PIPELINE", "CRM-FORECAST"],
    data_objects: [
      { name: "crm_opportunities", role: "master", necessity: "required" },
      { name: "pipeline_stages", role: "master", necessity: "required" },
      { name: "conversation_intelligence_records", role: "consumer", necessity: "required", notes: "Deal-context overlay on the opportunity timeline." },
    ],
  },
  {
    domain_module_code: "CRM-ACTIVITY",
    domain_module_name: "Sales Activity and Task Management",
    description: "Masters the sales activity log (calls, emails, meetings, demos, tasks) and the touchpoint history on accounts, contacts, leads, and opportunities. Includes the mobile and offline access surface for field sales: the activity-log mobile app is the canonical mobile CRM use case.",
    capability_codes: ["CRM-ACTIVITY-MGT", "CRM-MOBILE-OFFLINE"],
    data_objects: [
      { name: "sales_activities", role: "master", necessity: "required" },
      { name: "sales_emails", role: "contributor", necessity: "required", notes: "Rep-sent emails logged into the activity timeline." },
    ],
  },
  {
    domain_module_code: "CRM-AI-COPILOT",
    domain_module_name: "AI Sales Copilot and Workflow Automation",
    description: "AI-assisted sales workflows: generative copilot, intelligent next-best-action suggestions, automated approval routing, and process automation across CRM. A standalone module because vendors increasingly package AI copilots and workflow engines as a separate paid tier (Salesforce Agentforce, Microsoft Copilot for Sales).",
    capability_codes: ["CRM-AI-COPILOT", "CRM-WORKFLOW-AUTO"],
    data_objects: [],
  },
];

interface RoleDef {
  role_code: string;
  role_name: string;
  description: string;
  business_function_id: number | null;
  modules: { code: string; interaction_level: string }[];
  // perms: list of permission_names to grant; tier-level + specific gates
  perms: string[];
}

const ROLE_DEFS: RoleDef[] = [
  {
    role_code: "SALES-AE",
    role_name: "Account Executive",
    description: "Owns named opportunities through close. Drives opportunity progression, manages account relationships on assigned accounts, and logs every customer-facing activity. Permission bundle uses :manage on PIPELINE-MGT and ACTIVITY (primary), :read on ACCT-MGT and LEAD-MGT (secondary), plus the close_won gate.",
    business_function_id: SALES_FUNCTION_ID,
    modules: [
      { code: "CRM-PIPELINE-MGT", interaction_level: "primary" },
      { code: "CRM-ACTIVITY", interaction_level: "primary" },
      { code: "CRM-ACCT-MGT", interaction_level: "secondary" },
      { code: "CRM-LEAD-MGT", interaction_level: "secondary" },
    ],
    perms: [
      "crm-pipeline-mgt:manage",
      "crm-pipeline-mgt:close_won",
      "crm-activity:manage",
      "crm-acct-mgt:read",
      "crm-lead-mgt:read",
    ],
  },
  {
    role_code: "SALES-SDR",
    role_name: "Sales Development Representative",
    description: "Prospects and qualifies inbound and outbound leads, books meetings, and hands warm opportunities to AEs. Lives in LEAD-MGT and ACTIVITY day-to-day. Permission bundle uses :manage on LEAD-MGT and ACTIVITY (primary), :read on ACCT-MGT and PIPELINE-MGT (secondary), plus the convert_lead gate.",
    business_function_id: SALES_FUNCTION_ID,
    modules: [
      { code: "CRM-LEAD-MGT", interaction_level: "primary" },
      { code: "CRM-ACTIVITY", interaction_level: "primary" },
      { code: "CRM-ACCT-MGT", interaction_level: "secondary" },
      { code: "CRM-PIPELINE-MGT", interaction_level: "secondary" },
    ],
    perms: [
      "crm-lead-mgt:manage",
      "crm-lead-mgt:convert_lead",
      "crm-activity:manage",
      "crm-acct-mgt:read",
      "crm-pipeline-mgt:read",
    ],
  },
  {
    role_code: "SALES-MGR",
    role_name: "Sales Manager",
    description: "Manages a team of AEs and SDRs. Approves forecasts, reviews pipeline health, and intervenes on at-risk deals. Permission bundle uses :admin on every operational CRM module to inherit all workflow gates via permission_hierarchy, plus :manage on AI-COPILOT.",
    business_function_id: SALES_FUNCTION_ID,
    modules: [
      { code: "CRM-PIPELINE-MGT", interaction_level: "primary" },
      { code: "CRM-ACCT-MGT", interaction_level: "primary" },
      { code: "CRM-LEAD-MGT", interaction_level: "primary" },
      { code: "CRM-ACTIVITY", interaction_level: "primary" },
      { code: "CRM-AI-COPILOT", interaction_level: "secondary" },
    ],
    perms: [
      "crm-pipeline-mgt:admin",
      "crm-acct-mgt:admin",
      "crm-lead-mgt:admin",
      "crm-activity:admin",
      "crm-ai-copilot:manage",
    ],
  },
  {
    role_code: "SALES-OPS",
    role_name: "Sales Operations",
    description: "Configures CRM workflows, pipeline-stage definitions, lead routing rules, and the AI copilot. Owns the system's reference data and integration glue. Permission bundle uses :admin on AI-COPILOT (primary, owns the automation surface) and ACCT-MGT (primary, owns segments and territories), plus :manage on PIPELINE-MGT, LEAD-MGT, and ACTIVITY for ongoing reference-data edits.",
    business_function_id: SALES_FUNCTION_ID,
    modules: [
      { code: "CRM-AI-COPILOT", interaction_level: "primary" },
      { code: "CRM-ACCT-MGT", interaction_level: "primary" },
      { code: "CRM-PIPELINE-MGT", interaction_level: "secondary" },
      { code: "CRM-LEAD-MGT", interaction_level: "secondary" },
      { code: "CRM-ACTIVITY", interaction_level: "secondary" },
    ],
    perms: [
      "crm-ai-copilot:admin",
      "crm-acct-mgt:admin",
      "crm-pipeline-mgt:manage",
      "crm-lead-mgt:manage",
      "crm-activity:manage",
    ],
  },
];

// ---------------------------------------------------------------------------

async function loadModules(): Promise<Map<string, number>> {
  console.log("\n=== Phase M: domain_modules ===");
  const existing: { id: number; domain_module_code: string }[] = await get(
    `/domain_modules?domain_id=eq.${CRM_DOMAIN_ID}&select=id,domain_module_code`
  );
  const codeToId = new Map<string, number>(existing.map((m) => [m.domain_module_code, m.id]));
  console.log(`  ${existing.length} CRM modules already exist`);

  for (const def of MODULE_DEFS) {
    if (codeToId.has(def.domain_module_code)) {
      console.log(`  ${def.domain_module_code}: exists (id=${codeToId.get(def.domain_module_code)})`);
      continue;
    }
    const rows = await post("/domain_modules", [{
      domain_id: CRM_DOMAIN_ID,
      domain_module_code: def.domain_module_code,
      domain_module_name: def.domain_module_name,
      description: def.description,
    }]);
    const id = rows[0].id;
    codeToId.set(def.domain_module_code, id);
    bump("domain_modules");
    console.log(`  ${def.domain_module_code}: created id=${id}`);
  }
  return codeToId;
}

async function loadModuleCapabilities(modIds: Map<string, number>) {
  console.log("\n=== Phase M: domain_module_capabilities ===");
  const capCodes = [...new Set(MODULE_DEFS.flatMap((m) => m.capability_codes))];
  const caps: { id: number; capability_code: string }[] = await get(
    `/capabilities?capability_code=in.(${capCodes.join(",")})&select=id,capability_code`
  );
  const capCodeToId = new Map(caps.map((c) => [c.capability_code, c.id]));

  const existing: { domain_module_id: number; capability_id: number }[] = await get(
    `/domain_module_capabilities?domain_module_id=in.(${[...modIds.values()].join(",")})&select=domain_module_id,capability_id`
  );
  const existsKey = new Set(existing.map((r) => `${r.domain_module_id}:${r.capability_id}`));

  const inserts: any[] = [];
  for (const def of MODULE_DEFS) {
    const mid = modIds.get(def.domain_module_code)!;
    for (const cc of def.capability_codes) {
      const cid = capCodeToId.get(cc);
      if (!cid) {
        console.log(`  WARN: capability ${cc} not found in catalog; skipping`);
        continue;
      }
      const key = `${mid}:${cid}`;
      if (existsKey.has(key)) continue;
      inserts.push({ domain_module_id: mid, capability_id: cid });
    }
  }
  if (inserts.length) {
    await post("/domain_module_capabilities", inserts);
    bump("domain_module_capabilities", inserts.length);
  }
  console.log(`  inserted ${inserts.length} new (already had ${existing.length})`);
}

async function loadModuleDataObjects(modIds: Map<string, number>) {
  console.log("\n=== Phase M: domain_module_data_objects ===");
  const names = [...new Set(MODULE_DEFS.flatMap((m) => m.data_objects.map((d) => d.name)))];
  const dos: { id: number; data_object_name: string }[] = await get(
    `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`
  );
  const nameToId = new Map(dos.map((d) => [d.data_object_name, d.id]));

  const existing: { domain_module_id: number; data_object_id: number }[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${[...modIds.values()].join(",")})&select=domain_module_id,data_object_id`
  );
  const existsKey = new Set(existing.map((r) => `${r.domain_module_id}:${r.data_object_id}`));

  const inserts: any[] = [];
  for (const def of MODULE_DEFS) {
    const mid = modIds.get(def.domain_module_code)!;
    for (const d of def.data_objects) {
      const doid = nameToId.get(d.name);
      if (!doid) {
        console.log(`  WARN: data_object ${d.name} not found; skipping`);
        continue;
      }
      const key = `${mid}:${doid}`;
      if (existsKey.has(key)) continue;
      inserts.push({
        domain_module_id: mid,
        data_object_id: doid,
        role: d.role,
        necessity: d.necessity,
        notes: d.notes ?? "",
      });
    }
  }
  if (inserts.length) {
    await post("/domain_module_data_objects", inserts);
    bump("domain_module_data_objects", inserts.length);
  }
  console.log(`  inserted ${inserts.length} new (already had ${existing.length})`);
}

async function loadStarterModules(modIds: Map<string, number>) {
  console.log("\n=== Phase M: domain_starter_modules ===");
  const STARTERS = [
    { code: "CRM-ACCT-MGT", position: 1, notes: "The structural backbone. Start here. Provides accounts, contacts, the unified customer view." },
    { code: "CRM-LEAD-MGT", position: 2, notes: "Adds the top-of-funnel: lead capture, scoring, qualification, conversion to opportunity." },
    { code: "CRM-PIPELINE-MGT", position: 3, notes: "Adds opportunity management, pipeline stages, and sales forecasting. With these three installed you have a minimum recognizable CRM." },
  ];

  const existing: { domain_module_id: number }[] = await get(
    `/domain_starter_modules?domain_id=eq.${CRM_DOMAIN_ID}&select=domain_module_id`
  );
  const have = new Set(existing.map((r) => r.domain_module_id));

  const inserts: any[] = [];
  for (const s of STARTERS) {
    const mid = modIds.get(s.code)!;
    if (have.has(mid)) continue;
    inserts.push({
      domain_id: CRM_DOMAIN_ID,
      domain_module_id: mid,
      position: s.position,
      notes: s.notes,
    });
  }
  if (inserts.length) {
    await post("/domain_starter_modules", inserts);
    bump("domain_starter_modules", inserts.length);
  }
  console.log(`  inserted ${inserts.length} new (already had ${existing.length})`);
}

// ---------------------------------------------------------------------------
// Phase B fixes
// ---------------------------------------------------------------------------

interface RelDef {
  source: string;  // data_object_name
  target: string;
  verb: string;
  inverse: string;
  type: "one_to_many" | "many_to_one" | "many_to_many" | "one_to_one";
  is_required: boolean;
  owner_side: "source" | "target";
  notes: string;
}

const REL_DEFS: RelDef[] = [
  // Intra-CRM relationships (B6)
  { source: "customers", target: "crm_contacts", verb: "has_contacts", inverse: "belongs_to_account",
    type: "one_to_many", is_required: false, owner_side: "source",
    notes: "intra | CRM | every contact belongs to one account; an account can have many contacts" },
  { source: "customers", target: "crm_opportunities", verb: "has_opportunities", inverse: "for_account",
    type: "one_to_many", is_required: true, owner_side: "source",
    notes: "intra | CRM | every opportunity is associated with one account" },
  { source: "customers", target: "crm_leads", verb: "converted_from_lead", inverse: "converts_to_account",
    type: "one_to_many", is_required: false, owner_side: "source",
    notes: "intra | CRM | lead conversion produces an account (and contact and optionally opportunity) | inverse-side stored" },
  { source: "crm_contacts", target: "crm_leads", verb: "converted_from_lead", inverse: "converts_to_contact",
    type: "one_to_many", is_required: false, owner_side: "source",
    notes: "intra | CRM | lead conversion materializes a contact | inverse-side stored" },
  { source: "crm_opportunities", target: "crm_leads", verb: "converted_from_lead", inverse: "converts_to_opportunity",
    type: "one_to_many", is_required: false, owner_side: "source",
    notes: "intra | CRM | optional opportunity created at lead conversion time | inverse-side stored" },
  { source: "pipeline_stages", target: "crm_opportunities", verb: "tracks", inverse: "at_stage",
    type: "one_to_many", is_required: true, owner_side: "target",
    notes: "intra | CRM | opportunity sits at exactly one pipeline stage at a time | inverse-side stored" },
  { source: "crm_opportunities", target: "crm_contacts", verb: "involves_contacts", inverse: "involved_in",
    type: "many_to_many", is_required: false, owner_side: "source",
    notes: "intra | CRM | opportunity contact roles (decision-maker, influencer, evaluator)" },
  { source: "customers", target: "sales_activities", verb: "has_activities", inverse: "logged_against_account",
    type: "one_to_many", is_required: false, owner_side: "source",
    notes: "intra | CRM | activity timeline rolled up onto the account view | inverse-side stored" },
  { source: "crm_contacts", target: "sales_activities", verb: "has_activities", inverse: "logged_against_contact",
    type: "one_to_many", is_required: false, owner_side: "source",
    notes: "intra | CRM | activity timeline rolled up onto the contact view | inverse-side stored" },
  { source: "crm_leads", target: "sales_activities", verb: "has_activities", inverse: "logged_against_lead",
    type: "one_to_many", is_required: false, owner_side: "source",
    notes: "intra | CRM | activity timeline rolled up onto the lead view | inverse-side stored" },
  { source: "crm_opportunities", target: "sales_activities", verb: "has_activities", inverse: "logged_against_opportunity",
    type: "one_to_many", is_required: false, owner_side: "source",
    notes: "intra | CRM | activity timeline rolled up onto the opportunity view | inverse-side stored" },

  // Users edges (B7) - Rule #10
  { source: "users", target: "crm_leads", verb: "owns", inverse: "is_owned_by",
    type: "one_to_many", is_required: true, owner_side: "source",
    notes: "users | CRM | lead owner (assigned sales rep)" },
  { source: "users", target: "crm_opportunities", verb: "owns", inverse: "is_owned_by",
    type: "one_to_many", is_required: true, owner_side: "source",
    notes: "users | CRM | opportunity owner (AE)" },
  { source: "users", target: "crm_contacts", verb: "owns", inverse: "is_owned_by",
    type: "one_to_many", is_required: false, owner_side: "source",
    notes: "users | CRM | contact relationship owner" },
  { source: "users", target: "sales_activities", verb: "creates", inverse: "created_by",
    type: "one_to_many", is_required: true, owner_side: "source",
    notes: "users | CRM | the rep who logged the activity" },
];

async function loadRelationships() {
  console.log("\n=== Phase B6/B7: data_object_relationships ===");
  const names = [...new Set(REL_DEFS.flatMap((r) => [r.source, r.target]))];
  const dos: { id: number; data_object_name: string }[] = await get(
    `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`
  );
  const nameToId = new Map(dos.map((d) => [d.data_object_name, d.id]));

  const ids = [...nameToId.values()];
  const existing: { data_object_id: number; related_data_object_id: number; relationship_verb: string }[] = await get(
    `/data_object_relationships?or=(data_object_id.in.(${ids.join(",")}),related_data_object_id.in.(${ids.join(",")}))&select=data_object_id,related_data_object_id,relationship_verb`
  );
  const existsKey = new Set(existing.map((r) => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));

  const inserts: any[] = [];
  for (const r of REL_DEFS) {
    const sid = nameToId.get(r.source);
    const tid = nameToId.get(r.target);
    if (!sid || !tid) {
      console.log(`  WARN: missing data_object for ${r.source} or ${r.target}`);
      continue;
    }
    const key = `${sid}:${tid}:${r.verb}`;
    const revKey = `${tid}:${sid}:${r.inverse}`;
    if (existsKey.has(key) || existsKey.has(revKey)) continue;
    inserts.push({
      data_object_id: sid,
      related_data_object_id: tid,
      relationship_verb: r.verb,
      inverse_verb: r.inverse,
      relationship_type: r.type,
      is_required: r.is_required,
      owner_side: r.owner_side,
      notes: r.notes,
    });
  }
  if (inserts.length) {
    await post("/data_object_relationships", inserts);
    bump("data_object_relationships", inserts.length);
  }
  console.log(`  inserted ${inserts.length} new (already had ${existing.length} touching these objects)`);
}

const ALIAS_DEFS = [
  { data_object_name: "crm_contacts", alias_name: "person", alias_type: "synonym" },
  { data_object_name: "crm_contacts", alias_name: "individual", alias_type: "synonym" },
  { data_object_name: "crm_leads", alias_name: "prospect", alias_type: "synonym" },
  { data_object_name: "crm_leads", alias_name: "mql", alias_type: "synonym" },
  { data_object_name: "crm_opportunities", alias_name: "deal", alias_type: "synonym" },
  { data_object_name: "crm_opportunities", alias_name: "pipeline item", alias_type: "synonym" },
  { data_object_name: "pipeline_stages", alias_name: "deal stage", alias_type: "synonym" },
  { data_object_name: "pipeline_stages", alias_name: "sales stage", alias_type: "synonym" },
  { data_object_name: "sales_activities", alias_name: "touchpoint", alias_type: "synonym" },
  { data_object_name: "sales_activities", alias_name: "activity log entry", alias_type: "synonym" },
];

async function loadAliases() {
  console.log("\n=== Phase B11: data_object_aliases ===");
  const names = [...new Set(ALIAS_DEFS.map((a) => a.data_object_name))];
  const dos: { id: number; data_object_name: string }[] = await get(
    `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`
  );
  const nameToId = new Map(dos.map((d) => [d.data_object_name, d.id]));
  const ids = [...nameToId.values()];
  const existing: { data_object_id: number; alias_name: string }[] = await get(
    `/data_object_aliases?data_object_id=in.(${ids.join(",")})&select=data_object_id,alias_name`
  );
  const existsKey = new Set(existing.map((a) => `${a.data_object_id}:${a.alias_name.toLowerCase()}`));
  const inserts: any[] = [];
  for (const a of ALIAS_DEFS) {
    const id = nameToId.get(a.data_object_name);
    if (!id) continue;
    if (existsKey.has(`${id}:${a.alias_name.toLowerCase()}`)) continue;
    inserts.push({ data_object_id: id, alias_name: a.alias_name, alias_type: a.alias_type });
  }
  if (inserts.length) {
    await post("/data_object_aliases", inserts);
    bump("data_object_aliases", inserts.length);
  }
  console.log(`  inserted ${inserts.length} new (already had ${existing.length})`);
}

async function dedupeCustomersLifecycle(modIds: Map<string, number>) {
  console.log("\n=== Phase B12: dedupe customers lifecycle states ===");
  // customers (id 97) has duplicated rows: prospect/active 3x, inactive/churned 2x, churned/4 vs /5 (same terminal).
  // Keep the LOWEST id for each unique (state_name, state_order, is_initial, is_terminal,
  // requires_permission, permission_verb_override) tuple where domain_module_id IS NULL;
  // delete the rest. Also drop the duplicate-semantics row churned/5.
  const rows: any[] = await get(
    `/data_object_lifecycle_states?data_object_id=eq.97&select=id,state_name,state_order,is_initial,is_terminal,requires_permission,permission_verb_override,domain_module_id&order=id.asc`
  );
  const seen = new Map<string, number>();
  const toDelete: number[] = [];
  for (const r of rows) {
    if (r.domain_module_id !== null) continue;  // module-scoped rows are not deduped here
    // Treat churned at order 5 as duplicate semantics of churned at order 4 (same terminal state).
    const normOrder = r.state_name === "churned" ? 4 : r.state_order;
    const key = [r.state_name, normOrder, r.is_initial, r.is_terminal, r.requires_permission, r.permission_verb_override].join("|");
    if (seen.has(key)) {
      toDelete.push(r.id);
    } else {
      seen.set(key, r.id);
    }
  }
  for (const id of toDelete) {
    await del(`/data_object_lifecycle_states?id=eq.${id}`);
    bump("lifecycle_state_dedupe_deletes");
  }
  console.log(`  deleted ${toDelete.length} duplicate rows (kept ${seen.size})`);
}

async function attachLifecycleGatesToModules(modIds: Map<string, number>) {
  console.log("\n=== Phase B12 + M5: attach lifecycle workflow gates to modules ===");
  // crm_leads (99) state 'converted' (permission_verb_override='convert_lead') -> CRM-LEAD-MGT
  // crm_opportunities (100) state 'won' (permission_verb_override='close_won') -> CRM-PIPELINE-MGT
  const updates = [
    { data_object_id: 99, state_name: "converted", module_code: "CRM-LEAD-MGT" },
    { data_object_id: 100, state_name: "won", module_code: "CRM-PIPELINE-MGT" },
  ];
  for (const u of updates) {
    const mid = modIds.get(u.module_code)!;
    const rows: any[] = await get(
      `/data_object_lifecycle_states?data_object_id=eq.${u.data_object_id}&state_name=eq.${u.state_name}&select=id,domain_module_id`
    );
    for (const r of rows) {
      if (r.domain_module_id === mid) continue;
      await patch(`/data_object_lifecycle_states?id=eq.${r.id}`, { domain_module_id: mid });
      bump("lifecycle_state_module_attribution");
    }
  }
}

async function annotateConfigShapeExemptions() {
  console.log("\n=== Phase B12: annotate config-shape exemptions on pipeline_stages + sales_activities ===");
  // pipeline_stages (101) — config-shaped; no per-stage workflow (stage progression lives on opportunities)
  // sales_activities (102) — config-shaped for the catalog's purposes; intra-row state (open/completed) is
  //   captured by a single status column and doesn't justify a permission gate.
  const notes = {
    101: "Config-shaped; no per-row workflow. Authored once by Sales Ops, edited inline. Pipeline-stage progression lives on `crm_opportunities` (via the `at_stage` relationship), not on the stage definitions themselves; no per-state permissions needed on this entity.",
    102: "Config-shaped; intra-row state (open / completed) is a single status field and does not justify a permission gate. Per-row workflow lives on the underlying customer / opportunity / lead the activity is logged against.",
  };
  for (const [id, note] of Object.entries(notes)) {
    const r: any[] = await get(`/data_objects?id=eq.${id}&select=id,notes`);
    if (!r.length) continue;
    if (r[0].notes && r[0].notes.includes("Config-shaped")) continue;
    await patch(`/data_objects?id=eq.${id}`, { notes: note });
    bump("config_shape_annotations");
  }
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

interface PermDef {
  permission_name: string;
  description: string;
  tier: string;
  module_code: string;
}

function buildPermDefs(modIds: Map<string, number>): PermDef[] {
  const out: PermDef[] = [];
  for (const def of MODULE_DEFS) {
    const slug = def.domain_module_code.toLowerCase();
    out.push({
      permission_name: `${slug}:read`,
      description: `Read access to every entity in the ${def.domain_module_code} module.`,
      tier: "baseline-read",
      module_code: def.domain_module_code,
    });
    out.push({
      permission_name: `${slug}:manage`,
      description: `Edit operational records in the ${def.domain_module_code} module.`,
      tier: "baseline-manage",
      module_code: def.domain_module_code,
    });
    out.push({
      permission_name: `${slug}:admin`,
      description: `Edit reference data in the ${def.domain_module_code} module and inherit every workflow gate below via permission_hierarchy.`,
      tier: "baseline-admin",
      module_code: def.domain_module_code,
    });
  }
  // workflow-gate permissions derived from lifecycle states (Rule #14)
  out.push({
    permission_name: "crm-lead-mgt:convert_lead",
    description: "Transition `crm_leads` into state `converted`.",
    tier: "workflow-gate",
    module_code: "CRM-LEAD-MGT",
  });
  out.push({
    permission_name: "crm-pipeline-mgt:close_won",
    description: "Transition `crm_opportunities` into state `won`.",
    tier: "workflow-gate",
    module_code: "CRM-PIPELINE-MGT",
  });
  return out;
}

async function loadPermissions(modIds: Map<string, number>): Promise<Map<string, number>> {
  console.log("\n=== Phase E precursor: permissions ===");
  const defs = buildPermDefs(modIds);
  const names = defs.map((d) => d.permission_name);
  const existing: { id: number; permission_name: string }[] = await get(
    `/permissions?permission_name=in.(${names.map((n) => `"${n}"`).join(",")})&select=id,permission_name`
  );
  const nameToId = new Map(existing.map((p) => [p.permission_name, p.id]));
  const inserts: any[] = [];
  for (const d of defs) {
    if (nameToId.has(d.permission_name)) continue;
    inserts.push({
      permission_name: d.permission_name,
      description: d.description,
      module_id: DOMAIN_MAP_MODULE_ID,
      domain_module_id: modIds.get(d.module_code)!,
      tier: d.tier,
    });
  }
  if (inserts.length) {
    const created: { id: number; permission_name: string }[] = await post("/permissions", inserts);
    for (const c of created) nameToId.set(c.permission_name, c.id);
    bump("permissions", inserts.length);
  }
  console.log(`  inserted ${inserts.length} new (already had ${existing.length})`);
  return nameToId;
}

// ---------------------------------------------------------------------------
// Phase E: roles + role_modules + role_permissions
// ---------------------------------------------------------------------------

async function loadRoles(modIds: Map<string, number>, permIds: Map<string, number>) {
  console.log("\n=== Phase E: roles + role_modules + role_permissions ===");
  const codes = ROLE_DEFS.map((r) => r.role_code);
  const existing: { id: number; role_code: string }[] = await get(
    `/roles?role_code=in.(${codes.join(",")})&select=id,role_code`
  );
  const codeToId = new Map(existing.map((r) => [r.role_code, r.id]));

  // create missing roles
  for (const def of ROLE_DEFS) {
    if (codeToId.has(def.role_code)) {
      console.log(`  ${def.role_code}: exists (id=${codeToId.get(def.role_code)})`);
      continue;
    }
    const slug = def.role_code.toLowerCase().replace(/-/g, "_");
    const rows = await post("/roles", [{
      role_name: def.role_name,
      slug,
      description: def.description,
      origin: "model",
      module_id: DOMAIN_MAP_MODULE_ID,
      role_code: def.role_code,
      business_function_id: def.business_function_id,
    }]);
    codeToId.set(def.role_code, rows[0].id);
    bump("roles");
    console.log(`  ${def.role_code}: created id=${rows[0].id}`);
  }

  // role_modules
  const allRoleIds = [...codeToId.values()];
  const existingRM: { role_id: number; domain_module_id: number }[] = await get(
    `/role_modules?role_id=in.(${allRoleIds.join(",")})&select=role_id,domain_module_id`
  );
  const rmKey = new Set(existingRM.map((r) => `${r.role_id}:${r.domain_module_id}`));
  const rmInserts: any[] = [];
  for (const def of ROLE_DEFS) {
    const rid = codeToId.get(def.role_code)!;
    for (const m of def.modules) {
      const mid = modIds.get(m.code)!;
      const key = `${rid}:${mid}`;
      if (rmKey.has(key)) continue;
      rmInserts.push({ role_id: rid, domain_module_id: mid, interaction_level: m.interaction_level });
    }
  }
  if (rmInserts.length) {
    await post("/role_modules", rmInserts);
    bump("role_modules", rmInserts.length);
  }
  console.log(`  role_modules: inserted ${rmInserts.length} (already had ${existingRM.length})`);

  // role_permissions
  const existingRP: { role_id: number; permission_id: number }[] = await get(
    `/role_permissions?role_id=in.(${allRoleIds.join(",")})&select=role_id,permission_id`
  );
  const rpKey = new Set(existingRP.map((r) => `${r.role_id}:${r.permission_id}`));
  const rpInserts: any[] = [];
  for (const def of ROLE_DEFS) {
    const rid = codeToId.get(def.role_code)!;
    for (const pname of def.perms) {
      const pid = permIds.get(pname);
      if (!pid) {
        console.log(`  WARN: permission ${pname} not found for role ${def.role_code}`);
        continue;
      }
      const key = `${rid}:${pid}`;
      if (rpKey.has(key)) continue;
      rpInserts.push({ role_id: rid, permission_id: pid });
    }
  }
  if (rpInserts.length) {
    await post("/role_permissions", rpInserts);
    bump("role_permissions", rpInserts.length);
  }
  console.log(`  role_permissions: inserted ${rpInserts.length} (already had ${existingRP.length})`);
}

// ---------------------------------------------------------------------------
// Phase B10b: backfill handoff module attribution
// ---------------------------------------------------------------------------

async function backfillHandoffModules() {
  console.log("\n=== Phase B10b: backfill cross_domain_handoffs source/target module ids ===");

  // Pull every CRM-touching handoff that has any NULL on the relevant side.
  const handoffs: any[] = await get(
    `/cross_domain_handoffs?or=(source_domain_id.eq.${CRM_DOMAIN_ID},target_domain_id.eq.${CRM_DOMAIN_ID})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,trigger_events(event_name,data_object_id)`
  );
  console.log(`  ${handoffs.length} CRM-touching handoffs total`);

  // Pull all domain_modules + domain_module_data_objects for both CRM and every other domain
  // that appears on the OTHER side of a CRM handoff. (We only backfill the CRM-side column,
  // not the partner side — that's the partner domain's B10b responsibility.)
  // For OUTBOUND (source=CRM): we need source_domain_module_id => CRM modules holding the trigger_event's data_object.
  // For INBOUND (target=CRM): we need target_domain_module_id => CRM modules holding the handoff's payload data_object.
  const crmMods: { id: number; domain_module_code: string }[] = await get(
    `/domain_modules?domain_id=eq.${CRM_DOMAIN_ID}&select=id,domain_module_code`
  );
  const crmModIds = crmMods.map((m) => m.id);
  const crmDMDO: { domain_module_id: number; data_object_id: number; role: string }[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${crmModIds.join(",")})&select=domain_module_id,data_object_id,role`
  );

  // Build: for each (CRM module set, data_object_id) -> strongest-role module(s)
  function pickCrmModule(dataObjectId: number): number | null {
    const candidates = crmDMDO.filter((r) => r.data_object_id === dataObjectId);
    if (candidates.length === 0) return null;
    const strongs = strongest(candidates);
    if (strongs.length === 1) return strongs[0].domain_module_id;
    return null;  // tie -> leave NULL
  }

  const patches: { id: number; body: any }[] = [];
  let unresolved = 0;

  for (const h of handoffs) {
    const body: any = {};

    // OUTBOUND side (source=CRM)
    if (h.source_domain_id === CRM_DOMAIN_ID && h.source_domain_module_id === null) {
      const eventDoId = h.trigger_events?.data_object_id ?? h.data_object_id;
      const mid = pickCrmModule(eventDoId);
      if (mid !== null) body.source_domain_module_id = mid;
      else unresolved++;
    }

    // INBOUND side (target=CRM)
    if (h.target_domain_id === CRM_DOMAIN_ID && h.target_domain_module_id === null) {
      const mid = pickCrmModule(h.data_object_id);
      if (mid !== null) body.target_domain_module_id = mid;
      else unresolved++;
    }

    if (Object.keys(body).length) patches.push({ id: h.id, body });
  }

  for (const p of patches) {
    await patch(`/cross_domain_handoffs?id=eq.${p.id}`, p.body);
    bump("cross_domain_handoffs_module_attribution");
  }
  console.log(`  patched ${patches.length} rows; ${unresolved} side-attributions left NULL (no CRM module holds the data_object, or tie)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("CRM domain audit fix (2026-05-24)");
  console.log("==================================\n");
  console.log(`CRM domain_id = ${CRM_DOMAIN_ID}`);

  const modIds = await loadModules();
  await loadModuleCapabilities(modIds);
  await loadModuleDataObjects(modIds);
  await loadStarterModules(modIds);

  await loadRelationships();
  await loadAliases();
  await dedupeCustomersLifecycle(modIds);
  await attachLifecycleGatesToModules(modIds);
  await annotateConfigShapeExemptions();

  const permIds = await loadPermissions(modIds);
  await loadRoles(modIds, permIds);

  await backfillHandoffModules();

  console.log("\n=== Summary ===");
  for (const [k, v] of Object.entries(counters)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log("\nDone. Verify in UI: https://tests.semantius.app/domain_map/domain_modules");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
