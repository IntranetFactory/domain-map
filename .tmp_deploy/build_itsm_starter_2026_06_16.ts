// Build ITSM-STARTER single-domain lite-service-desk starter. Additive + idempotent; record_status
// defaults to 'new'. Decisions (a-ITSM-STARTER.md): q1=a full entry desk (incidents + requests
// required; catalog + KB + SLA optional); q2=a name ITSM-STARTER. domain_id=1 (ITSM, single-domain
// anchor, no host_domains). Skill module-anchored (Rule #19 invariant 6). Re-prefixed gates + baseline
// permissions are DERIVED by the emitter, never inserted (no permission rows here). No record_status
// flips (Rule #1). Rule #19 starter invariants validated up front.

type Row = Record<string, any>;

async function call(arg: { method: string; path: string; body?: any }): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(arg));
  proc.stdin.end();
  const out = (await new Response(proc.stdout).text()).trim();
  const err = (await new Response(proc.stderr).text()).trim();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`semantius ${arg.method} ${arg.path} failed: ${err || out}`);
  if (!out) return null;
  try { return JSON.parse(out); }
  catch { const i = out.search(/[\[{]/); if (i >= 0) return JSON.parse(out.slice(i)); return null; }
}
const get = async (path: string): Promise<any[]> => (await call({ method: "GET", path })) ?? [];

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => { const o: Row = {}; for (const k of keys) o[k] = k in r ? r[k] : null; return o; });
}
async function post(path: string, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await call({ method: "POST", path, body: uniformize(rows.slice(i, i + CHUNK)) });
  }
}

const CODE = "ITSM-STARTER";
const DOMAIN_ID = 1; // ITSM (single-domain anchor)
// data_object_id, role, necessity
const EMBEDS: { id: number; name: string; role: string; nec: string }[] = [
  { id: 47, name: "service_incidents", role: "embedded_master", nec: "required" },
  { id: 48, name: "service_requests", role: "embedded_master", nec: "required" },
  { id: 52, name: "service_catalog_items", role: "embedded_master", nec: "optional" },
  { id: 51, name: "knowledge_articles", role: "embedded_master", nec: "optional" },
  { id: 53, name: "service_slas", role: "embedded_master", nec: "optional" },
  { id: 748, name: "users", role: "consumer", nec: "required" }, // platform_builtin
];
// tool_id, requirement_level (all pre-existing, all coverage_tier='platform')
const TOOLS: { id: number; name: string; req: string }[] = [
  { id: 16, name: "query_incidents", req: "required" },
  { id: 30, name: "create_incident", req: "required" },
  { id: 237, name: "update_incident_status", req: "required" },
  { id: 188, name: "query_service_requests", req: "required" },
  { id: 239, name: "create_service_request", req: "required" },
  { id: 952, name: "approve_service_request", req: "optional" },
  { id: 19, name: "query_knowledge_articles", req: "optional" },
  { id: 958, name: "create_knowledge_article", req: "optional" },
  { id: 1004, name: "publish_knowledge_article", req: "optional" },
  { id: 913, name: "notify_person", req: "optional" },
];

// ---- Rule #19 starter pre-flight ----
async function validateStarter(): Promise<void> {
  for (const e of EMBEDS) {
    const [dobj] = await get(`/data_objects?id=eq.${e.id}&select=id,kind`);
    if (!dobj) throw new Error(`Unknown data_object id ${e.id} (${e.name})`);
    if (e.role === "master" || e.role === "derived" || e.role === "contributor")
      throw new Error(`Starter junction ${e.name}: role '${e.role}' forbidden.`);
    if (e.role === "consumer") {
      if (dobj.kind !== "platform_builtin")
        throw new Error(`Starter consumer on ${e.name}: only platform_builtin allowed.`);
      continue;
    }
    // embedded_master
    if (dobj.kind === "platform_builtin") continue;
    const masters = await get(`/domain_module_data_objects?data_object_id=eq.${e.id}&role=eq.master&select=id&limit=1`);
    if (masters.length === 0) throw new Error(`Starter embedded_master on ${e.name}: no canonical master exists.`);
  }
  console.log("  starter pre-flight OK (all embeds embedded_master on mastered domain_owned, or consumer on platform_builtin)");
}

// ---- build ----
console.log(`Building ${CODE} ...`);
await validateStarter();

let [mod] = await get(`/domain_modules?domain_module_code=eq.${CODE}&select=id`);
if (!mod) {
  await post("/domain_modules", [{
    domain_module_code: CODE,
    domain_module_name: "IT Service Desk Starter",
    module_kind: "starter",
    domain_id: DOMAIN_ID,
    description: "Single-domain starter kit for a small IT team that wants a lightweight service desk without the full ITSM suite or any asset estate. Embeds lightweight shells of ITSM's own records: incidents and service requests (the required helpdesk core), plus an optional request catalog, knowledge base, and SLA clocks. Problem, change, release, and event handling stay in the full itsm-* modules you turn on when you outgrow the desk; assets are out of scope (IT-OPS-STARTER and HAM). The embedded shells demote to the canonical itsm-* masters when those modules install alongside. The narrow, single-domain complement to IT-OPS-STARTER.",
    catalog_tagline: "Stand up a lightweight IT help desk in a day: log tickets, take requests, and answer the same questions once.",
    catalog_description: "A simple service desk for a small IT team. Log incidents when something breaks, take service requests from a catalog or by free text, and move each ticket from new to resolved to closed without a heavyweight tool. Turn on a knowledge base so common answers get written once and reused, a request catalog so people ask for the right things, and SLA clocks so nothing sits too long, each when you are ready. Start with just tickets and grow into the rest as your team and your process mature. Built for IT teams that want ticketing and self-service without standing up a full enterprise service-management suite.",
  }]);
  [mod] = await get(`/domain_modules?domain_module_code=eq.${CODE}&select=id`);
}
const moduleId = Number(mod.id);
console.log(`  module id = ${moduleId}`);

// domain_module_data_objects
const haveDmdo = new Set((await get(`/domain_module_data_objects?domain_module_id=eq.${moduleId}&select=data_object_id`)).map(d => Number(d.data_object_id)));
const dmdoRows = EMBEDS.filter(e => !haveDmdo.has(e.id)).map(e => ({ domain_module_id: moduleId, data_object_id: e.id, role: e.role, necessity: e.nec }));
await post("/domain_module_data_objects", dmdoRows);
console.log(`  domain_module_data_objects: +${dmdoRows.length} (total ${EMBEDS.length})`);

// system skill (module-anchored per Rule #19 invariant 6; domain anchor = ITSM 1)
let [skill] = await get(`/skills?skill_name=eq.itsm_starter_system&select=id`);
if (!skill) {
  await post("/skills", [{
    skill_name: "itsm_starter_system",
    skill_type: "system",
    domain_id: DOMAIN_ID,
    domain_module_id: moduleId,
    description: "Agent surface for the IT Service Desk Starter: log and query incidents, move them through resolve and close, take and approve service requests, and (optionally) draft, publish, and query knowledge articles, plus notify reporters and assignees. Derives its toolset from the starter's domain_module_tools; inherits lifecycle and workflow gates from the canonical itsm-* masters (the starter authors no lifecycle states).",
  }]);
  [skill] = await get(`/skills?skill_name=eq.itsm_starter_system&select=id`);
}
console.log(`  system skill id = ${skill?.id}`);

// domain_module_tools
const haveTool = new Set((await get(`/domain_module_tools?domain_module_id=eq.${moduleId}&select=tool_id`)).map(t => Number(t.tool_id)));
const dmtRows = TOOLS.filter(t => !haveTool.has(t.id)).map(t => ({ domain_module_id: moduleId, tool_id: t.id, requirement_level: t.req }));
await post("/domain_module_tools", dmtRows);
console.log(`  domain_module_tools: +${dmtRows.length} (total ${TOOLS.length})`);

// ---- summary ----
console.log("\n=== ITSM-STARTER built ===");
const dmdo = await get(`/domain_module_data_objects?domain_module_id=eq.${moduleId}&select=role,necessity,data_objects(data_object_name)&order=necessity.asc,data_object_id.asc`);
for (const r of dmdo) console.log(`  ${r.role.padEnd(16)} ${r.necessity.padEnd(9)} ${r.data_objects?.data_object_name}`);
const tools = await get(`/domain_module_tools?domain_module_id=eq.${moduleId}&select=requirement_level,tools(tool_name,coverage_tier)&order=requirement_level.asc`);
const cov = tools.map(t => t.tools?.coverage_tier);
const platform = cov.filter(c => c === "platform").length;
console.log(`\n  Semantius score: ${platform}/${cov.length} platform-covered (${Math.round(100 * platform / cov.length)}%)`);
console.log(`\nUI: https://tests.semantius.app/domain_map/domain_modules`);
console.log(`UI: https://tests.semantius.app/domain_map/domain_module_data_objects?domain_module_id=eq.${moduleId}`);
