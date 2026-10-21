// WEB-CONTOPS b1a execution loader.
// B1A-LIFECYCLE: data_object_lifecycle_states for 7 masters.
// B1A-SKILLS: 4 system skills (one per module) + new tools + skill_tools; DELETE legacy skill 120.
// Idempotent: dedups by natural key on every table. Run with: bun run <abs path>

type Json = any;

async function crud(method: string, path: string, body?: Json): Promise<Json> {
  const payload: Json = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`crud ${method} ${path} failed (exit ${code}): ${err || out}`);
  }
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

function uniformize(rows: Json[]): Json[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Json = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(table: string, rows: Json[]): Promise<Json[]> {
  if (rows.length === 0) return [];
  // chunk <= 50, uniformize keys per chunk (PGRST102 guard)
  const result: Json[] = [];
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = uniformize(rows.slice(i, i + 50));
    const r = await crud("POST", `/${table}`, chunk);
    if (Array.isArray(r)) result.push(...r);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 1. LIFECYCLE STATES (B1A-LIFECYCLE)
// ---------------------------------------------------------------------------
// Each row: data_object_id, state_name, state_order, is_initial, is_terminal,
// requires_permission, domain_module_id. notes='' (Rule #15). record_status omitted.
// requires_permission=true on transition states (resolve, retain, retire, dismiss,
// verify, ignore, wont_fix, accepted, archived, revised) per the b1a action.

type LState = {
  do: number;
  module: number;
  states: { name: string; order: number; initial?: boolean; terminal?: boolean; gate?: boolean }[];
};

const lifecycle: LState[] = [
  // content_audits (684, module 317): scheduled -> running -> completed -> archived
  {
    do: 684, module: 317,
    states: [
      { name: "scheduled", order: 1, initial: true },
      { name: "running", order: 2 },
      { name: "completed", order: 3 },
      { name: "archived", order: 4, terminal: true, gate: true },
    ],
  },
  // web_content_inventory_records (685, module 317): discovered -> classified -> in_review -> retained -> retired
  {
    do: 685, module: 317,
    states: [
      { name: "discovered", order: 1, initial: true },
      { name: "classified", order: 2 },
      { name: "in_review", order: 3 },
      { name: "retained", order: 4, gate: true },
      { name: "retired", order: 5, terminal: true, gate: true },
    ],
  },
  // accessibility_scan_findings (686, module 319): detected -> triaged -> in_remediation -> resolved -> wont_fix -> verified
  {
    do: 686, module: 319,
    states: [
      { name: "detected", order: 1, initial: true },
      { name: "triaged", order: 2 },
      { name: "in_remediation", order: 3 },
      { name: "resolved", order: 4, gate: true },
      { name: "wont_fix", order: 5, terminal: true, gate: true },
      { name: "verified", order: 6, terminal: true, gate: true },
    ],
  },
  // broken_link_findings (687, module 320): detected -> in_remediation -> resolved -> ignored
  {
    do: 687, module: 320,
    states: [
      { name: "detected", order: 1, initial: true },
      { name: "in_remediation", order: 2 },
      { name: "resolved", order: 3, terminal: true, gate: true },
      { name: "ignored", order: 4, terminal: true, gate: true },
    ],
  },
  // technical_seo_findings (688, module 320): detected -> triaged -> in_remediation -> resolved -> wont_fix
  {
    do: 688, module: 320,
    states: [
      { name: "detected", order: 1, initial: true },
      { name: "triaged", order: 2 },
      { name: "in_remediation", order: 3 },
      { name: "resolved", order: 4, terminal: true, gate: true },
      { name: "wont_fix", order: 5, terminal: true, gate: true },
    ],
  },
  // brand_voice_violations (689, module 319): detected -> in_review -> accepted -> dismissed
  {
    do: 689, module: 319,
    states: [
      { name: "detected", order: 1, initial: true },
      { name: "in_review", order: 2 },
      { name: "accepted", order: 3, terminal: true, gate: true },
      { name: "dismissed", order: 4, terminal: true, gate: true },
    ],
  },
  // content_lifecycle_plans (690, module 318): draft -> active -> review_due -> revised -> retired
  {
    do: 690, module: 318,
    states: [
      { name: "draft", order: 1, initial: true },
      { name: "active", order: 2 },
      { name: "review_due", order: 3 },
      { name: "revised", order: 4, gate: true },
      { name: "retired", order: 5, terminal: true, gate: true },
    ],
  },
];

async function loadLifecycle() {
  console.log("\n=== B1A-LIFECYCLE: data_object_lifecycle_states ===");
  const doIds = lifecycle.map((l) => l.do);
  const existing: Json[] = await crud(
    "GET",
    `/data_object_lifecycle_states?data_object_id=in.(${doIds.join(",")})&select=data_object_id,state_name`
  );
  const have = new Set(existing.map((r) => `${r.data_object_id}|${r.state_name}`));
  const rows: Json[] = [];
  for (const l of lifecycle) {
    for (const s of l.states) {
      const key = `${l.do}|${s.name}`;
      if (have.has(key)) {
        console.log(`  skip existing ${key}`);
        continue;
      }
      rows.push({
        data_object_id: l.do,
        state_name: s.name,
        state_order: s.order,
        is_initial: !!s.initial,
        is_terminal: !!s.terminal,
        requires_permission: !!s.gate,
        permission_verb_override: "",
        domain_module_id: l.module,
        notes: "",
      });
    }
  }
  const inserted = await insert("data_object_lifecycle_states", rows);
  console.log(`  inserted ${inserted.length} lifecycle-state rows`);
  return inserted;
}

// ---------------------------------------------------------------------------
// 2. TOOLS (new mutate / side_effect / fetch / inbound). query_* reuse 771-777.
// ---------------------------------------------------------------------------
// operation_kind invariant: query/mutate REQUIRE data_object_id; side_effect/
// compute/fetch must have data_object_id null; inbound optional (null here).

type ToolDef = {
  tool_name: string;
  operation_kind: "query" | "mutate" | "side_effect" | "compute" | "inbound" | "fetch";
  data_object_id: number | null;
  coverage_tier: "platform" | "external" | "integration";
  description: string;
};

const newTools: ToolDef[] = [
  // mutates (platform-covered: query+mutate are delivered by CRUD)
  { tool_name: "create_content_audit", operation_kind: "mutate", data_object_id: 684, coverage_tier: "platform",
    description: "Create and schedule a content audit run over a set of web properties." },
  { tool_name: "retire_inventory_record", operation_kind: "mutate", data_object_id: 685, coverage_tier: "platform",
    description: "Retire a web content inventory record, marking the page out of the governed estate." },
  { tool_name: "resolve_accessibility_finding", operation_kind: "mutate", data_object_id: 686, coverage_tier: "platform",
    description: "Move an accessibility scan finding to resolved, wont_fix, or verified after remediation review." },
  { tool_name: "dismiss_brand_violation", operation_kind: "mutate", data_object_id: 689, coverage_tier: "platform",
    description: "Accept or dismiss a brand voice violation after editorial review." },
  { tool_name: "resolve_broken_link_finding", operation_kind: "mutate", data_object_id: 687, coverage_tier: "platform",
    description: "Mark a broken link finding resolved or ignored after the link is fixed or intentionally retained." },
  { tool_name: "resolve_technical_seo_finding", operation_kind: "mutate", data_object_id: 688, coverage_tier: "platform",
    description: "Mark a technical SEO finding resolved or wont_fix after remediation or triage." },
  { tool_name: "retire_content_lifecycle_plan", operation_kind: "mutate", data_object_id: 690, coverage_tier: "platform",
    description: "Retire a content lifecycle plan when its governed content is decommissioned or replaced." },
  // side_effect (external; data_object_id must be null)
  { tool_name: "trigger_external_a11y_rescan", operation_kind: "side_effect", data_object_id: null, coverage_tier: "external",
    description: "Trigger an external accessibility scanner to re-crawl a page or property after remediation." },
  { tool_name: "submit_redirect_request", operation_kind: "side_effect", data_object_id: null, coverage_tier: "external",
    description: "Submit a redirect request to the delivery platform when a broken link or retired page needs a forwarding rule." },
  // fetch (external read; data_object_id must be null)
  { tool_name: "fetch_wcag_rules", operation_kind: "fetch", data_object_id: null, coverage_tier: "external",
    description: "Fetch the current WCAG success-criteria rule set from an external standards source for finding classification." },
  { tool_name: "fetch_seo_serp_data", operation_kind: "fetch", data_object_id: null, coverage_tier: "external",
    description: "Fetch search-engine results and ranking data from an external SEO data source for technical SEO context." },
  // inbound (channel callbacks; data_object_id null here)
  { tool_name: "receive_scanner_callback", operation_kind: "inbound", data_object_id: null, coverage_tier: "external",
    description: "Receive an inbound callback from an external scanner when an accessibility or quality scan completes." },
  { tool_name: "receive_crawler_completion", operation_kind: "inbound", data_object_id: null, coverage_tier: "external",
    description: "Receive an inbound notification when a crawler finishes a site inventory crawl run." },
];

async function loadTools(): Promise<Record<string, number>> {
  console.log("\n=== B1A-SKILLS: tools ===");
  const names = newTools.map((t) => t.tool_name);
  // re-read immediately before insert (catalog-wide, concurrent subagents)
  const existing: Json[] = await crud(
    "GET",
    `/tools?tool_name=in.(${names.join(",")})&select=id,tool_name`
  );
  const nameToId: Record<string, number> = {};
  for (const r of existing) nameToId[r.tool_name] = r.id;
  const toInsert = newTools.filter((t) => !(t.tool_name in nameToId));
  for (const t of toInsert) console.log(`  insert tool ${t.tool_name} (${t.operation_kind})`);
  for (const t of Object.keys(nameToId)) console.log(`  reuse existing tool ${t} (id ${nameToId[t]})`);
  const inserted = await insert("tools", toInsert.map((t) => ({
    tool_name: t.tool_name,
    operation_kind: t.operation_kind,
    data_object_id: t.data_object_id,
    coverage_tier: t.coverage_tier,
    description: t.description,
  })));
  for (const r of inserted) nameToId[r.tool_name] = r.id;
  console.log(`  inserted ${inserted.length} new tools`);
  return nameToId;
}

// ---------------------------------------------------------------------------
// 3. SKILLS (one system skill per module) + 4. SKILL_TOOLS
// ---------------------------------------------------------------------------
// Reused query tool ids (fixed):
const QUERY = {
  content_audits: 771,
  web_content_inventory_records: 772,
  accessibility_scan_findings: 773,
  broken_link_findings: 774,
  technical_seo_findings: 775,
  brand_voice_violations: 776,
  content_lifecycle_plans: 777,
};
const NOTIFY_PERSON = 913;

type SkillDef = {
  module: number;
  skill_name: string;
  description: string;
  // tools: [toolName-or-fixedId, requirement_level]
  tools: { ref: number | string; level: "required" | "optional" }[];
};

const skills: SkillDef[] = [
  {
    module: 317,
    skill_name: "web-contops-audit-inventory-system",
    description: "System skill for the Content Audit and Inventory module. Schedules and runs content audits, classifies and retires inventory records, and ingests crawler completion signals over the web content estate.",
    tools: [
      { ref: QUERY.content_audits, level: "required" },
      { ref: QUERY.web_content_inventory_records, level: "required" },
      { ref: "create_content_audit", level: "required" },
      { ref: "retire_inventory_record", level: "required" },
      { ref: "receive_crawler_completion", level: "optional" },
    ],
  },
  {
    module: 318,
    skill_name: "web-contops-editorial-planning-system",
    description: "System skill for the Editorial Workflow and Planning module. Manages content lifecycle plans through draft, active, review-due, revised, and retired states, reading the inventory it governs and notifying content owners of review cadence.",
    tools: [
      { ref: QUERY.content_lifecycle_plans, level: "required" },
      { ref: "retire_content_lifecycle_plan", level: "required" },
      { ref: QUERY.web_content_inventory_records, level: "optional" },
      { ref: NOTIFY_PERSON, level: "optional" },
    ],
  },
  {
    module: 319,
    skill_name: "web-contops-quality-access-system",
    description: "System skill for the Content Quality and Accessibility Scanning module. Triages and resolves accessibility scan findings and brand voice violations, triggers external rescans, and ingests scanner callbacks.",
    tools: [
      { ref: QUERY.accessibility_scan_findings, level: "required" },
      { ref: QUERY.brand_voice_violations, level: "required" },
      { ref: "resolve_accessibility_finding", level: "required" },
      { ref: "dismiss_brand_violation", level: "required" },
      { ref: "trigger_external_a11y_rescan", level: "optional" },
      { ref: "fetch_wcag_rules", level: "optional" },
      { ref: "receive_scanner_callback", level: "optional" },
    ],
  },
  {
    module: 320,
    skill_name: "web-contops-seo-links-system",
    description: "System skill for the Technical SEO and Link Governance module. Triages and resolves technical SEO findings and broken link findings, submits redirect requests, and fetches external SEO data for context.",
    tools: [
      { ref: QUERY.broken_link_findings, level: "required" },
      { ref: QUERY.technical_seo_findings, level: "required" },
      { ref: "resolve_broken_link_finding", level: "required" },
      { ref: "resolve_technical_seo_finding", level: "required" },
      { ref: "submit_redirect_request", level: "optional" },
      { ref: "fetch_seo_serp_data", level: "optional" },
    ],
  },
];

async function loadSkills(toolIds: Record<string, number>) {
  console.log("\n=== B1A-SKILLS: skills + skill_tools ===");
  const moduleIds = skills.map((s) => s.module);
  // dedup skills by (domain_module_id, skill_type=system)
  const existingSkills: Json[] = await crud(
    "GET",
    `/skills?domain_module_id=in.(${moduleIds.join(",")})&skill_type=eq.system&select=id,skill_name,domain_module_id`
  );
  const moduleToSkillId: Record<number, number> = {};
  for (const s of existingSkills) moduleToSkillId[s.domain_module_id] = s.id;

  const skillRowsToInsert = skills
    .filter((s) => !(s.module in moduleToSkillId))
    .map((s) => ({
      skill_name: s.skill_name,
      skill_type: "system",
      domain_id: 128, // platform constraint domain_required_when_skill_type_is_system still requires this
      domain_module_id: s.module,
      description: s.description,
    }));
  for (const s of skillRowsToInsert) console.log(`  insert skill ${s.skill_name} (module ${s.domain_module_id})`);
  const insertedSkills = await insert("skills", skillRowsToInsert);
  for (const s of insertedSkills) moduleToSkillId[s.domain_module_id] = s.id;
  console.log(`  skills total now ${Object.keys(moduleToSkillId).length} for the 4 modules`);

  // skill_tools
  const resolve = (ref: number | string): number => {
    if (typeof ref === "number") return ref;
    const id = toolIds[ref];
    if (!id) throw new Error(`tool id not resolved for ${ref}`);
    return id;
  };

  const stRows: Json[] = [];
  for (const s of skills) {
    const skillId = moduleToSkillId[s.module];
    // dedup existing skill_tools for this skill
    const existingST: Json[] = await crud(
      "GET",
      `/skill_tools?skill_id=eq.${skillId}&select=tool_id`
    );
    const haveTool = new Set(existingST.map((r) => r.tool_id));
    for (const t of s.tools) {
      const tid = resolve(t.ref);
      if (haveTool.has(tid)) {
        console.log(`  skip existing skill_tool skill ${skillId} tool ${tid}`);
        continue;
      }
      stRows.push({
        skill_id: skillId,
        tool_id: tid,
        requirement_level: t.level,
        notes: "",
      });
    }
  }
  const insertedST = await insert("skill_tools", stRows);
  console.log(`  inserted ${insertedST.length} skill_tools rows`);
  return moduleToSkillId;
}

// ---------------------------------------------------------------------------
// 5. DELETE legacy skill 120 + its skill_tools (F1 cleanup)
// ---------------------------------------------------------------------------
async function deleteLegacy() {
  console.log("\n=== B1A-SKILLS: delete legacy skill 120 + skill_tools ===");
  // snapshot first
  const legacySkill: Json = await crud("GET", `/skills?id=eq.120&select=*`);
  const legacyST: Json = await crud("GET", `/skill_tools?skill_id=eq.120&select=*`);
  console.log("  SNAPSHOT skill 120:", JSON.stringify(legacySkill));
  console.log("  SNAPSHOT skill_tools(120):", JSON.stringify(legacyST.map((r: Json) => r.id)));
  // delete children first then parent
  await crud("DELETE", `/skill_tools?skill_id=eq.120`);
  await crud("DELETE", `/skills?id=eq.120`);
  // verify
  const check: Json = await crud("GET", `/skills?id=eq.120&select=id`);
  const checkST: Json = await crud("GET", `/skill_tools?skill_id=eq.120&select=id`);
  console.log(`  after delete: skills(120)=${check.length}, skill_tools(120)=${checkST.length}`);
}

async function main() {
  await loadLifecycle();
  const toolIds = await loadTools();
  await loadSkills(toolIds);
  await deleteLegacy();
  console.log("\nDONE.");
}

await main();
