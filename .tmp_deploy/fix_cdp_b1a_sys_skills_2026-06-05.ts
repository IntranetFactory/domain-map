#!/usr/bin/env bun
// B1A-SYS-SKILLS: author one skill_type='system' skill per CDP module (216-219),
// each with >=1 skill_tools row (Rule #17 -> F2/F3). Idempotent; safe to re-run.
//
// Tool reuse: the CDP master query/mutate tools and the notify/inbound abstractions
// already exist catalog-wide (re-read at load time, never recreated). Only three
// CDP-specific mutate tools are created here (resolve_identity, create_audience_segment,
// activate_audience_segment), keyed by (tool_name) natural key.
//
// record_status omitted on every insert (DB default 'new'). notes left empty (Rule #15).
// No catalog_tagline / catalog_description writes (Rule #20).

type Json = any;
const DOMAIN_ID = 72;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// ----------------------------------------------------------------
// New CDP-specific mutate tools (domain-specific; not generic/shared).
// data_object_id required for operation_kind='mutate'. coverage_tier omitted
// (DB default 'external'); these are not platform-shipped CRUD primitives.
// ----------------------------------------------------------------
const NEW_TOOLS: {
  tool_name: string;
  description: string;
  operation_kind: string;
  data_object_id: number;
  coverage_tier: string;
}[] = [
  {
    tool_name: "resolve_identity",
    description:
      "Stitch disparate identifiers (email, device, cookie, login) into the identity graph for a resolved profile, applying deterministic and probabilistic merge rules.",
    operation_kind: "mutate",
    data_object_id: 112, // identity_graphs
    coverage_tier: "platform", // required by check constraint for query/mutate
  },
  {
    tool_name: "create_audience_segment",
    description:
      "Author a static or dynamic audience segment from profile attributes and behavioral event rules.",
    operation_kind: "mutate",
    data_object_id: 113, // audience_segments
    coverage_tier: "platform",
  },
  {
    tool_name: "activate_audience_segment",
    description:
      "Push a materialized audience segment to downstream destinations (ad platforms, marketing tools, CRM) for activation.",
    operation_kind: "mutate",
    data_object_id: 113, // audience_segments
    coverage_tier: "platform",
  },
];

// ----------------------------------------------------------------
// One system skill per module + its skill_tools surface.
// tool references are by tool_name; ids resolved at load time.
// ----------------------------------------------------------------
type SkillSpec = {
  module_id: number;
  module_code: string;
  skill_name: string;
  description: string;
  tools: { tool_name: string; requirement_level: "required" | "optional" }[];
};

const SKILLS: SkillSpec[] = [
  {
    module_id: 216,
    module_code: "CDP-INGEST-IDENTITY",
    skill_name: "cdp_ingest_identity_agent",
    description:
      "Agent surface for the CDP Ingestion and Identity Resolution module. Ingests behavioral, transactional, and identifier signals from sources and resolves disparate identifiers into a unified entity graph.",
    tools: [
      { tool_name: "query_customer_events", requirement_level: "required" },
      { tool_name: "query_identity_graphs", requirement_level: "required" },
      { tool_name: "resolve_identity", requirement_level: "required" },
      { tool_name: "ingest_event_stream", requirement_level: "required" },
      { tool_name: "query_crm_contacts", requirement_level: "required" },
      { tool_name: "receive_webhook", requirement_level: "optional" },
    ],
  },
  {
    module_id: 217,
    module_code: "CDP-UNIFIED-PROFILE",
    skill_name: "cdp_unified_profile_agent",
    description:
      "Agent surface for the CDP Unified Profile, Attributes, and Predictive Scoring module. Maintains the resolved golden-record profile, computed attributes, and the predictive scoring layer that downstream segments and personalization read from.",
    tools: [
      { tool_name: "query_customers", requirement_level: "required" },
      { tool_name: "update_customer", requirement_level: "required" },
      { tool_name: "query_customer_attributes", requirement_level: "required" },
      { tool_name: "query_lead_scores", requirement_level: "required" },
      { tool_name: "notify_person", requirement_level: "optional" },
    ],
  },
  {
    module_id: 218,
    module_code: "CDP-SEGMENTATION-ACTIVATION",
    skill_name: "cdp_segmentation_activation_agent",
    description:
      "Agent surface for the CDP Segmentation and Downstream Activation module. Authors static and dynamic audiences over profile attributes and behavioral events, then activates them to ad platforms, marketing tools, CRM, and ad-server destinations.",
    tools: [
      { tool_name: "query_audience_segments", requirement_level: "required" },
      { tool_name: "create_audience_segment", requirement_level: "required" },
      { tool_name: "activate_audience_segment", requirement_level: "required" },
      { tool_name: "query_campaigns", requirement_level: "required" },
      { tool_name: "query_sales_emails", requirement_level: "optional" },
      { tool_name: "notify_team", requirement_level: "optional" },
    ],
  },
  {
    module_id: 219,
    module_code: "CDP-JOURNEYS-360",
    skill_name: "cdp_journeys_360_agent",
    description:
      "Agent surface for the CDP Observed Journeys and Customer 360 module. Reconciles observed multi-channel journey progression into a single queryable customer view across transactional, marketing, and operational systems.",
    tools: [
      { tool_name: "query_customer_journeys", requirement_level: "required" },
      { tool_name: "query_customers", requirement_level: "required" },
      { tool_name: "query_customer_events", requirement_level: "required" },
      { tool_name: "notify_person", requirement_level: "optional" },
    ],
  },
];

async function ensureTools(): Promise<Map<string, number>> {
  // Re-read existing tools by name (catalog-wide, shared, concurrent subagents).
  const names = NEW_TOOLS.map((t) => t.tool_name);
  const existing = await semantius(
    "GET",
    `/tools?tool_name=in.(${names.join(",")})&select=id,tool_name`,
  );
  const existingNames = new Set(existing.map((r: any) => r.tool_name));
  const toInsert = NEW_TOOLS.filter((t) => !existingNames.has(t.tool_name));
  if (toInsert.length) {
    await semantius("POST", "/tools", toInsert);
    console.log(`  +${toInsert.length} tools: ${toInsert.map((t) => t.tool_name).join(", ")}`);
  } else {
    console.log("  new tools already present, no inserts");
  }
  // Resolve ALL tool_names used across skills -> id map.
  const allNames = new Set<string>();
  for (const s of SKILLS) for (const t of s.tools) allNames.add(t.tool_name);
  const all = await semantius(
    "GET",
    `/tools?tool_name=in.(${[...allNames].join(",")})&select=id,tool_name`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.tool_name, r.id);
  for (const n of allNames) {
    if (!map.has(n)) throw new Error(`tool_name ${n} did not resolve to an id`);
  }
  return map;
}

async function ensureSkill(s: SkillSpec): Promise<number> {
  const existing = await semantius(
    "GET",
    `/skills?domain_module_id=eq.${s.module_id}&skill_type=eq.system&select=id,skill_name`,
  );
  if (existing.length > 1) {
    throw new Error(`module ${s.module_code} already has ${existing.length} system skills (Rule #17 violation)`);
  }
  if (existing.length === 1) {
    console.log(`  skill for ${s.module_code} already present (id ${existing[0].id})`);
    return existing[0].id;
  }
  const [row] = await semantius("POST", "/skills", [
    {
      skill_name: s.skill_name,
      description: s.description,
      skill_type: "system",
      domain_id: DOMAIN_ID,
      domain_module_id: s.module_id,
    },
  ]);
  console.log(`  +skill ${s.skill_name} (id ${row.id}) on module ${s.module_code}`);
  return row.id;
}

async function ensureSkillTools(skillId: number, s: SkillSpec, toolMap: Map<string, number>): Promise<void> {
  const toolIds = s.tools.map((t) => toolMap.get(t.tool_name)!);
  const existing = await semantius(
    "GET",
    `/skill_tools?skill_id=eq.${skillId}&tool_id=in.(${toolIds.join(",")})&select=tool_id`,
  );
  const existingToolIds = new Set(existing.map((r: any) => r.tool_id));
  const toInsert = s.tools
    .filter((t) => !existingToolIds.has(toolMap.get(t.tool_name)))
    .map((t) => ({
      skill_id: skillId,
      tool_id: toolMap.get(t.tool_name),
      requirement_level: t.requirement_level,
    }));
  if (toInsert.length) {
    await semantius("POST", "/skill_tools", toInsert);
    console.log(`    +${toInsert.length} skill_tools on skill ${skillId}`);
  } else {
    console.log(`    skill_tools already present on skill ${skillId}`);
  }
}

async function main() {
  console.log("=== B1A-SYS-SKILLS: per-module system skills for CDP (216-219) ===");
  const toolMap = await ensureTools();
  for (const s of SKILLS) {
    console.log(`\n--- ${s.module_code} (module ${s.module_id}) ---`);
    const skillId = await ensureSkill(s);
    await ensureSkillTools(skillId, s, toolMap);
  }

  // Verification rollup.
  console.log("\n=== Verification ===");
  const skills = await semantius(
    "GET",
    `/skills?domain_module_id=in.(216,217,218,219)&skill_type=eq.system&select=id,skill_name,domain_module_id&order=domain_module_id.asc`,
  );
  for (const sk of skills) {
    const st = await semantius(
      "GET",
      `/skill_tools?skill_id=eq.${sk.id}&select=id,requirement_level,tools(tool_name,coverage_tier)`,
    );
    const required = st.filter((r: any) => r.requirement_level === "required");
    const platformReq = required.filter((r: any) => r.tools?.coverage_tier === "platform");
    const strict = required.length ? Math.round((platformReq.length / required.length) * 100) : 0;
    console.log(
      `  module ${sk.domain_module_id} / skill ${sk.skill_name} (id ${sk.id}): ` +
        `${st.length} skill_tools (${required.length} required); strict_score ${strict}%`,
    );
  }

  console.log("\nDone.");
  console.log("UI: https://tests.semantius.app/domain_map/skills");
  console.log("UI: https://tests.semantius.app/domain_map/skill_tools");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
