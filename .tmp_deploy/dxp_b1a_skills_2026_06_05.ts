// DXP b1a — B1A-SYSTEM-SKILLS
// Author one skill_type='system' skill per DXP module (236/237/238) with tools +
// skill_tools (Rule #17, Phase S three-source derivation). Then the legacy
// domain-level skill dxp-system (id 52) is deleted by a separate step AFTER all
// three module skills + their skill_tools land.
// Idempotent: tools deduped by tool_name, skills by domain_module_id, skill_tools
// by (skill_id, tool_id).

type Row = Record<string, unknown>;

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const req: Row = { method, path };
  if (body !== undefined) req.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(req));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (err && err.toLowerCase().includes("required audience not found")) {
    throw new Error("JWT_AUDIENCE_ERROR: " + err);
  }
  if (proc.exitCode !== 0) throw new Error(`semantius call failed (${method} ${path}): ${err || out}`);
  try { return JSON.parse(out); } catch { return out; }
}
const get = (p: string) => call("GET", p);

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const o: Row = {};
    for (const k of keys) o[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return o;
  });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += 50) {
    const res = await call("POST", path, uniformize(rows.slice(i, i + 50)));
    if (Array.isArray(res)) out.push(...res);
  }
  return out;
}

const summary: string[] = [];

// --- Tools: create the missing ones, build a name->id map (reuse existing) ---
const toolSpecs: { tool_name: string; operation_kind: string; data_object_id: number | null; coverage_tier: string; description: string }[] = [
  // DXP-AUTHORING mutates + side effects
  { tool_name: "create_web_page", operation_kind: "mutate", data_object_id: 441, coverage_tier: "platform", description: "Create a new web page in draft state." },
  { tool_name: "publish_web_page", operation_kind: "mutate", data_object_id: 441, coverage_tier: "platform", description: "Transition a web page into the published state, making it live." },
  { tool_name: "update_content_component", operation_kind: "mutate", data_object_id: 442, coverage_tier: "platform", description: "Update a reusable content component used across web pages." },
  { tool_name: "purge_cdn_cache", operation_kind: "side_effect", data_object_id: null, coverage_tier: "external", description: "Purge cached assets from the content delivery network after a publish or unpublish." },
  { tool_name: "invalidate_render_cache", operation_kind: "side_effect", data_object_id: null, coverage_tier: "external", description: "Invalidate the server-side render cache so the next request rebuilds the page output." },
  // DXP-EXPERIENCE-PERSONALIZATION mutates
  { tool_name: "activate_personalization_rule", operation_kind: "mutate", data_object_id: 444, coverage_tier: "platform", description: "Activate a personalization rule so it begins targeting matching visitors." },
  { tool_name: "start_ab_test", operation_kind: "mutate", data_object_id: 445, coverage_tier: "platform", description: "Start an A/B test, moving it into the running state and beginning traffic allocation." },
  { tool_name: "publish_segment_dxp", operation_kind: "mutate", data_object_id: 446, coverage_tier: "platform", description: "Publish a segment definition so personalization and experimentation can target it." },
  // DXP-PORTAL-JOURNEYS mutate + inbound
  { tool_name: "create_journey_step", operation_kind: "mutate", data_object_id: 447, coverage_tier: "platform", description: "Add a step to a guided journey or portal flow." },
  { tool_name: "update_journey_step", operation_kind: "mutate", data_object_id: 447, coverage_tier: "platform", description: "Update an existing journey step's configuration or transition logic." },
  { tool_name: "receive_cdp_segment_update", operation_kind: "inbound", data_object_id: null, coverage_tier: "platform", description: "Receive an inbound segment membership update from the customer data platform to re-evaluate journey entry and personalization." },
];

const existingTools = await get(
  "/tools?tool_name=in.(query_web_pages,query_content_components,query_experiences,query_personalization_rules,query_ab_tests,query_segments_dxp,query_journey_steps,create_web_page,publish_web_page,update_content_component,purge_cdn_cache,invalidate_render_cache,activate_personalization_rule,start_ab_test,publish_segment_dxp,create_journey_step,update_journey_step,receive_cdp_segment_update)&select=id,tool_name",
);
const toolId = new Map<string, number>();
for (const t of existingTools) toolId.set(String(t.tool_name), Number(t.id));

const newTools = toolSpecs.filter((t) => !toolId.has(t.tool_name));
const insertedTools = await insert("/tools", newTools.map((t) => ({
  tool_name: t.tool_name,
  operation_kind: t.operation_kind,
  data_object_id: t.data_object_id,
  coverage_tier: t.coverage_tier,
  description: t.description,
})));
for (const t of insertedTools) toolId.set(String(t.tool_name), Number(t.id));
summary.push(`tools: inserted ${insertedTools.length} new (reused ${existingTools.length})`);

function tid(name: string): number {
  const id = toolId.get(name);
  if (id === undefined) throw new Error(`tool id not resolved for ${name}`);
  return id;
}

// --- Skills: one system skill per module ---
const skillSpecs: { skill_name: string; domain_module_id: number; description: string; tools: { name: string; level: "required" | "optional" }[] }[] = [
  {
    skill_name: "dxp_authoring_agent",
    domain_module_id: 236,
    description: "System agent for the DXP authoring and multi-site module: queries and authors web pages, content components, and digital experiences, drives the publish lifecycle, and refreshes delivery caches.",
    tools: [
      { name: "query_web_pages", level: "required" },
      { name: "query_content_components", level: "required" },
      { name: "query_experiences", level: "required" },
      { name: "create_web_page", level: "required" },
      { name: "publish_web_page", level: "required" },
      { name: "update_content_component", level: "required" },
      { name: "purge_cdn_cache", level: "optional" },
      { name: "invalidate_render_cache", level: "optional" },
    ],
  },
  {
    skill_name: "dxp_experience_personalization_agent",
    domain_module_id: 237,
    description: "System agent for the DXP experience personalization and experimentation module: queries and manages personalization rules, A/B tests, and segments, and drives their activation, start, and publish gates.",
    tools: [
      { name: "query_personalization_rules", level: "required" },
      { name: "query_ab_tests", level: "required" },
      { name: "query_segments_dxp", level: "required" },
      { name: "activate_personalization_rule", level: "required" },
      { name: "start_ab_test", level: "required" },
      { name: "publish_segment_dxp", level: "required" },
    ],
  },
  {
    skill_name: "dxp_portal_journeys_agent",
    domain_module_id: 238,
    description: "System agent for the DXP portal and journey orchestration module: queries and authors journey steps, reads the digital experiences they compose, and reacts to inbound segment updates from the customer data platform.",
    tools: [
      { name: "query_journey_steps", level: "required" },
      { name: "query_experiences", level: "required" },
      { name: "create_journey_step", level: "required" },
      { name: "update_journey_step", level: "required" },
      { name: "receive_cdp_segment_update", level: "optional" },
    ],
  },
];

const existingSkills = await get(
  "/skills?skill_type=eq.system&domain_module_id=in.(236,237,238)&select=id,skill_name,domain_module_id",
);
const skillByModule = new Map<number, number>();
for (const s of existingSkills) skillByModule.set(Number(s.domain_module_id), Number(s.id));

const newSkills = skillSpecs.filter((s) => !skillByModule.has(s.domain_module_id));
const insertedSkills = await insert("/skills", newSkills.map((s) => ({
  skill_name: s.skill_name,
  skill_type: "system",
  domain_module_id: s.domain_module_id,
  domain_id: 77, // legacy domain_required_when_skill_type_is_system rule keys on this
  description: s.description,
})));
for (const s of insertedSkills) skillByModule.set(Number(s.domain_module_id), Number(s.id));
summary.push(`skills: inserted ${insertedSkills.length} system skills`);

// --- skill_tools links ---
const existingLinks = await get(
  `/skill_tools?skill_id=in.(${[...skillByModule.values()].join(",")})&select=skill_id,tool_id`,
);
const linkSeen = new Set(existingLinks.map((r: Row) => `${r.skill_id}|${r.tool_id}`));
const linkRows: Row[] = [];
for (const s of skillSpecs) {
  const sid = skillByModule.get(s.domain_module_id)!;
  for (const t of s.tools) {
    const ttid = tid(t.name);
    if (linkSeen.has(`${sid}|${ttid}`)) continue;
    linkRows.push({ skill_id: sid, tool_id: ttid, requirement_level: t.level });
  }
}
const insertedLinks = await insert("/skill_tools", linkRows);
summary.push(`skill_tools: inserted ${insertedLinks.length} links`);

console.log("\n=== DXP b1a skills load summary ===");
for (const s of summary) console.log("  " + s);
console.log("  skill ids by module: " + JSON.stringify([...skillByModule.entries()]));
console.log("=== done ===\n");
