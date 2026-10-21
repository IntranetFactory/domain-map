// Build IT-OPS-STARTER cross-domain starter kit. Additive + idempotent; record_status defaults to 'new'.
// Decisions: domain_id NULL (cross-domain bundle); required core = renewal/contract spine
// (asset_contracts + saas_subscriptions); helpdesk + hardware + saas_apps + licenses optional;
// users consumer. Skill anchors to ITAM (3). All 9 tools already exist (platform-covered).
// Rule #19 starter invariants validated up front. No record_status flips (Rule #1).

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

const CODE = "IT-OPS-STARTER";
const HOSTS = [1, 51, 85, 3, 52]; // ITSM, HAM, SMP, ITAM, SAM
// data_object_id, role, necessity
const EMBEDS: { id: number; name: string; role: string; nec: string }[] = [
  { id: 54, name: "asset_contracts", role: "embedded_master", nec: "required" },
  { id: 62, name: "saas_subscriptions", role: "embedded_master", nec: "required" },
  { id: 47, name: "service_incidents", role: "embedded_master", nec: "optional" },
  { id: 48, name: "service_requests", role: "embedded_master", nec: "optional" },
  { id: 56, name: "hardware_assets", role: "embedded_master", nec: "optional" },
  { id: 61, name: "saas_applications", role: "embedded_master", nec: "optional" },
  { id: 58, name: "software_licenses", role: "embedded_master", nec: "optional" },
  { id: 748, name: "users", role: "consumer", nec: "required" }, // platform_builtin
];
// tool_id, requirement_level
const TOOLS: { id: number; req: string }[] = [
  { id: 870, req: "required" }, // query_saas_subscriptions
  { id: 539, req: "required" }, // query_asset_contracts
  { id: 499, req: "optional" }, // query_hardware_assets
  { id: 66, req: "optional" },  // query_saas_applications
  { id: 16, req: "optional" },  // query_incidents
  { id: 188, req: "optional" }, // query_service_requests
  { id: 694, req: "optional" }, // query_software_licenses
  { id: 239, req: "optional" }, // create_service_request
  { id: 913, req: "optional" }, // notify_person
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
    domain_module_name: "IT Operations Starter",
    module_kind: "starter",
    domain_id: null,
    description: "Cross-domain starter kit for 50-250-user IT teams. Embeds lightweight shells of the records a small IT shop manages: the helpdesk (optional), the hardware register, the SaaS application and renewal tracker, and the contract register. The renewal/contract spine (asset_contracts + saas_subscriptions) is required; hardware, SaaS apps, helpdesk, and on-prem licenses are optional. domain_id NULL; hosts ITSM, HAM, SMP, ITAM, SAM. Replaces the helpdesk-plus-spreadsheets reality; budget stays in the general ledger.",
    catalog_tagline: "Run your whole IT shop from one place: tickets, devices, SaaS renewals, and contracts, without the spreadsheets.",
    catalog_description: "One place to manage IT for a small team. Track the hardware you own and who has it, every SaaS app and when its subscription renews, and the contracts behind them, so nothing slips through a spreadsheet and no renewal catches you off guard. Add a lightweight helpdesk for tickets and requests if you do not already run one, or keep the one you have. Start with the renewal and contract essentials and turn on the device, SaaS, and helpdesk pieces as you need them. Built for organizations of roughly 50 to 250 people that have outgrown spreadsheets but do not need an enterprise IT suite.",
  }]);
  [mod] = await get(`/domain_modules?domain_module_code=eq.${CODE}&select=id`);
}
const moduleId = Number(mod.id);
console.log(`  module id = ${moduleId}`);

// host domains
const haveHost = new Set((await get(`/domain_module_host_domains?domain_module_id=eq.${moduleId}&select=domain_id`)).map(h => Number(h.domain_id)));
const hostRows = HOSTS.filter(d => !haveHost.has(d)).map(domain_id => ({ domain_module_id: moduleId, domain_id }));
await post("/domain_module_host_domains", hostRows);
console.log(`  host_domains: +${hostRows.length} (total ${HOSTS.length})`);

// domain_module_data_objects
const haveDmdo = new Set((await get(`/domain_module_data_objects?domain_module_id=eq.${moduleId}&select=data_object_id`)).map(d => Number(d.data_object_id)));
const dmdoRows = EMBEDS.filter(e => !haveDmdo.has(e.id)).map(e => ({ domain_module_id: moduleId, data_object_id: e.id, role: e.role, necessity: e.nec }));
await post("/domain_module_data_objects", dmdoRows);
console.log(`  domain_module_data_objects: +${dmdoRows.length} (total ${EMBEDS.length})`);

// system skill (anchored to ITAM 3, module-anchored per Rule #19 invariant 6)
let [skill] = await get(`/skills?skill_name=eq.it_ops_starter_system&select=id`);
if (!skill) {
  await post("/skills", [{
    skill_name: "it_ops_starter_system",
    skill_type: "system",
    domain_id: 3,
    domain_module_id: moduleId,
    description: "Agent surface for the IT Operations Starter: query and create helpdesk tickets and service requests, query the hardware register, query SaaS apps and subscriptions and their renewals, query contracts and on-prem licenses, and notify owners of upcoming renewals. Derives its toolset from the starter's domain_module_tools; inherits lifecycle and workflow gates from the canonical masters (the starter authors no lifecycle states).",
  }]);
  [skill] = await get(`/skills?skill_name=eq.it_ops_starter_system&select=id`);
}
console.log(`  system skill id = ${skill?.id}`);

// domain_module_tools
const haveTool = new Set((await get(`/domain_module_tools?domain_module_id=eq.${moduleId}&select=tool_id`)).map(t => Number(t.tool_id)));
const dmtRows = TOOLS.filter(t => !haveTool.has(t.id)).map(t => ({ domain_module_id: moduleId, tool_id: t.id, requirement_level: t.req }));
await post("/domain_module_tools", dmtRows);
console.log(`  domain_module_tools: +${dmtRows.length} (total ${TOOLS.length})`);

// ---- summary ----
console.log("\n=== IT-OPS-STARTER built ===");
const dmdo = await get(`/domain_module_data_objects?domain_module_id=eq.${moduleId}&select=role,necessity,data_objects(data_object_name)&order=necessity.asc,data_object_id.asc`);
for (const r of dmdo) console.log(`  ${r.role.padEnd(16)} ${r.necessity.padEnd(9)} ${r.data_objects?.data_object_name}`);
console.log(`\nUI: https://tests.semantius.app/domain_map/domain_modules`);
console.log(`UI: https://tests.semantius.app/domain_map/domain_module_data_objects?domain_module_id=eq.${moduleId}`);
