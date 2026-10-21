// SMM B1A-F2 2026-06-06: retire legacy skill 18, author 4 per-module system skills,
// redistribute the 12 existing skill_tools across them, then DELETE skill 18.
// Reuses existing tools rows (no new tools). notes + record_status omitted per Rules #15/#1.

type Row = Record<string, unknown>;

async function call(payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`semantius exited ${code}: ${err}\n${out}`);
  const txt = out.trim();
  return txt ? JSON.parse(txt) : null;
}
async function get(path: string): Promise<any[]> {
  const r = await call({ method: "GET", path });
  return Array.isArray(r) ? r : [];
}
async function post(path: string, body: Row[] | Row): Promise<any[]> {
  const r = await call({ method: "POST", path, body });
  return Array.isArray(r) ? r : [];
}

// tool ids (verified live, reused as-is)
const T = {
  query_social_posts: 228,
  create_social_post: 259,
  query_social_accounts: 231,
  post_social_message: 267,
  generate_image: 48,
  generate_text: 49,
  query_social_messages: 229,
  detect_sentiment: 55,
  query_social_mentions: 230,
  respond_to_social_mention: 260,
  query_social_listening_topics: 233,
  query_influencers: 232,
};

// one system skill per module
const skillSpecs = [
  { skill_name: "smm_publishing_agent", domain_module_id: 299, description: "System skill for the Social Publishing and Planning module: draft, schedule, approve, and publish social posts across connected accounts, with AI assistance for copy and imagery." },
  { skill_name: "smm_engagement_agent", domain_module_id: 300, description: "System skill for the Social Engagement Inbox module: triage and respond to inbound social messages with account context and sentiment scoring." },
  { skill_name: "smm_listening_agent", domain_module_id: 301, description: "System skill for the Social Listening and Monitoring module: track listening topics, surface brand mentions, score sentiment, and respond to mentions." },
  { skill_name: "smm_influencer_agent", domain_module_id: 302, description: "System skill for the Influencer and Creator Programs module: manage creator relationships from outreach through active partnership." },
];

// (tool_id, requirement_level) per module skill
const toolPlan: Record<string, [number, "required" | "optional"][]> = {
  smm_publishing_agent: [
    [T.query_social_posts, "required"],
    [T.create_social_post, "required"],
    [T.query_social_accounts, "required"],
    [T.post_social_message, "required"],
    [T.generate_image, "optional"],
    [T.generate_text, "optional"],
  ],
  smm_engagement_agent: [
    [T.query_social_messages, "required"],
    [T.query_social_accounts, "required"],
    [T.detect_sentiment, "required"],
  ],
  smm_listening_agent: [
    [T.query_social_mentions, "required"],
    [T.respond_to_social_mention, "required"],
    [T.query_social_listening_topics, "required"],
    [T.detect_sentiment, "required"],
  ],
  smm_influencer_agent: [[T.query_influencers, "required"]],
};

// ---- pre-flight: ensure no per-module system skill already exists ----
const existing = await get("/skills?domain_module_id=in.(299,300,301,302)&skill_type=eq.system&select=id,skill_name,domain_module_id");
if (existing.length > 0) {
  console.log("Per-module system skills already present, aborting to avoid duplicates:", existing);
  process.exit(1);
}

// ---- insert 4 skills ----
// domain_id is required platform-side even for module-anchored system skills
// (legacy domain_required_when_skill_type_is_system rule); set both.
const skillRows = skillSpecs.map((s) => ({ skill_name: s.skill_name, skill_type: "system", domain_id: 106, domain_module_id: s.domain_module_id, description: s.description }));
const inserted = await post("/skills", skillRows);
const idByName = new Map<string, number>();
for (const s of inserted) idByName.set(String(s.skill_name), Number(s.id));
console.log("inserted skills:");
for (const s of inserted) console.log(`  skill id ${s.id}: ${s.skill_name} (module ${s.domain_module_id})`);

// ---- insert skill_tools (empty notes per Rule #15 -> omit column entirely) ----
const stRows: Row[] = [];
for (const [name, pairs] of Object.entries(toolPlan)) {
  const sid = idByName.get(name)!;
  for (const [tool_id, requirement_level] of pairs) stRows.push({ skill_id: sid, tool_id, requirement_level });
}
const stInserted = await post("/skill_tools", stRows);
console.log(`\ninserted skill_tools: ${stInserted.length} (expected ${stRows.length})`);

// ---- DELETE legacy skill 18 (cascades its skill_tools) ----
const before18 = await get("/skill_tools?skill_id=eq.18&select=id");
console.log(`\nlegacy skill 18 skill_tools before delete: ${before18.length}`);
await call({ method: "DELETE", path: "/skill_tools?skill_id=eq.18" });
await call({ method: "DELETE", path: "/skills?id=eq.18" });
const skill18After = await get("/skills?id=eq.18&select=id");
const st18After = await get("/skill_tools?skill_id=eq.18&select=id");
console.log(`after delete: skill 18 rows=${skill18After.length}, its skill_tools=${st18After.length}`);

// ---- verify ----
const finalSkills = await get("/skills?domain_module_id=in.(299,300,301,302)&select=id,skill_name,domain_module_id,skill_type&order=domain_module_id.asc");
console.log("\nVERIFY per-module system skills:");
for (const s of finalSkills) {
  const st = await get(`/skill_tools?skill_id=eq.${s.id}&select=tool_id,requirement_level,tools(tool_name,coverage_tier)`);
  console.log(`  ${s.skill_name} (module ${s.domain_module_id}, ${s.skill_type}): ${st.length} tools`);
  for (const t of st) console.log(`    - ${t.tools?.tool_name} [${t.requirement_level}/${t.tools?.coverage_tier}]`);
}
