#!/usr/bin/env bun
// Phase C (functional ownership) + Phase S (system skills + tools) for EAP(186) / VSM(187).
// business_function_domains, skills, tools, domain_module_tools. Idempotent.
// Modules: EAP-PE=399, EAP-PR=400, VSM-CM=401, VSM-FI=402.
// data_object ids: portfolio_epics=1244, agile_features=1245, program_increments=1246,
//   agile_release_trains=1247, pi_objectives=1248, cross_team_dependencies=1249,
//   agile_roadmaps=1250, delivery_value_streams=1251, tool_connections=1252,
//   flow_metric_definitions=1253, flow_measurements=1254, delivery_bottlenecks=1255, dora_metrics=1256.
// Functions: SoftwareEng=26, ProductMgmt=25, ITOps=27, BizOps=34.
// Reuse tools: notify_person=913, notify_team=914, query_okr_objectives=77,
//   query_strategic_initiatives=69, query_pull_requests=765, query_software_deployments=769.

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  await proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`semantius failed: ${stderr}`);
  const t = stdout.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return []; const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  return out;
}

const EAP = 186, VSM = 187;
const M = { EAP_PE: 399, EAP_PR: 400, VSM_CM: 401, VSM_FI: 402 };
const FN = { ENG: 26, PM: 25, IT: 27, BIZOPS: 34 };
const D = { portfolio_epics: 1244, agile_features: 1245, program_increments: 1246, agile_release_trains: 1247, pi_objectives: 1248, cross_team_dependencies: 1249, agile_roadmaps: 1250, delivery_value_streams: 1251, tool_connections: 1252, flow_metric_definitions: 1253, flow_measurements: 1254, delivery_bottlenecks: 1255, dora_metrics: 1256 };
const REUSE = { notify_person: 913, notify_team: 914, query_okr_objectives: 77, query_strategic_initiatives: 69, query_pull_requests: 765, query_software_deployments: 769 };

console.log("== Phase C: business_function_domains ==");
const bfd = [
  { business_function_id: FN.ENG, domain_id: EAP, responsibility_type: "owner" },
  { business_function_id: FN.PM, domain_id: EAP, responsibility_type: "contributor" },
  { business_function_id: FN.BIZOPS, domain_id: EAP, responsibility_type: "consumer" },
  { business_function_id: FN.ENG, domain_id: VSM, responsibility_type: "owner" },
  { business_function_id: FN.IT, domain_id: VSM, responsibility_type: "contributor" },
  { business_function_id: FN.BIZOPS, domain_id: VSM, responsibility_type: "consumer" },
];
{
  const ex = await get(`/business_function_domains?domain_id=in.(186,187)&select=business_function_id,domain_id`);
  const have = new Set(ex.map(r => `${r.business_function_id}:${r.domain_id}`));
  const rows = bfd.filter(r => !have.has(`${r.business_function_id}:${r.domain_id}`));
  if (rows.length) await insert("/business_function_domains", rows);
  console.log(`  +${rows.length} business_function_domains`);
}

console.log("== Phase S: skills ==");
const skills = [
  { skill_name: "eap-system", skill_type: "system", domain_id: EAP, description: "System agent for Enterprise Agile Planning: query and manage portfolio epics, features, program increments, release trains, PI objectives, dependencies, and roadmaps, and coordinate scaled-agile delivery across the domain's modules." },
  { skill_name: "vsm-system", skill_type: "system", domain_id: VSM, description: "System agent for Value Stream Management: connect the delivery toolchain, model value streams and flow-metric definitions, and read computed flow measurements, bottlenecks, and DORA benchmarks across the domain's modules." },
];
{
  const ex = await get(`/skills?skill_name=in.(eap-system,vsm-system)&select=skill_name`);
  const have = new Set(ex.map(r => String(r.skill_name)));
  const rows = skills.filter(s => !have.has(s.skill_name));
  if (rows.length) await insert("/skills", rows);
  console.log(`  +${rows.length} skills`);
}

console.log("== Phase S: tools ==");
type T = { tool_name: string; operation_kind: string; data_object_id: number | null; coverage_tier: string; description: string };
const newTools: T[] = [
  // EAP query (platform)
  { tool_name: "query_portfolio_epics", operation_kind: "query", data_object_id: D.portfolio_epics, coverage_tier: "platform", description: "Query portfolio epics by state, owner, train, or roadmap." },
  { tool_name: "query_agile_features", operation_kind: "query", data_object_id: D.agile_features, coverage_tier: "platform", description: "Query agile features by epic, program increment, team, or state." },
  { tool_name: "query_program_increments", operation_kind: "query", data_object_id: D.program_increments, coverage_tier: "platform", description: "Query program increments by release train, state, or date." },
  { tool_name: "query_agile_release_trains", operation_kind: "query", data_object_id: D.agile_release_trains, coverage_tier: "platform", description: "Query agile release trains and their configuration." },
  { tool_name: "query_pi_objectives", operation_kind: "query", data_object_id: D.pi_objectives, coverage_tier: "platform", description: "Query PI objectives by program increment, team, or score." },
  { tool_name: "query_cross_team_dependencies", operation_kind: "query", data_object_id: D.cross_team_dependencies, coverage_tier: "platform", description: "Query cross-team dependencies by state, train, or feature." },
  { tool_name: "query_agile_roadmaps", operation_kind: "query", data_object_id: D.agile_roadmaps, coverage_tier: "platform", description: "Query agile roadmaps and their planned epics and features." },
  // EAP mutate (platform)
  { tool_name: "create_portfolio_epic", operation_kind: "mutate", data_object_id: D.portfolio_epics, coverage_tier: "platform", description: "Create a portfolio epic in the funnel." },
  { tool_name: "approve_epic", operation_kind: "mutate", data_object_id: D.portfolio_epics, coverage_tier: "platform", description: "Approve a portfolio epic into the portfolio backlog (workflow gate)." },
  { tool_name: "create_agile_feature", operation_kind: "mutate", data_object_id: D.agile_features, coverage_tier: "platform", description: "Create an agile feature under an epic." },
  { tool_name: "update_agile_feature", operation_kind: "mutate", data_object_id: D.agile_features, coverage_tier: "platform", description: "Update an agile feature's state, estimate, or assignment." },
  { tool_name: "create_program_increment", operation_kind: "mutate", data_object_id: D.program_increments, coverage_tier: "platform", description: "Create a program increment for a release train." },
  { tool_name: "commit_pi", operation_kind: "mutate", data_object_id: D.program_increments, coverage_tier: "platform", description: "Commit a program increment plan at the close of PI planning (workflow gate)." },
  { tool_name: "create_pi_objective", operation_kind: "mutate", data_object_id: D.pi_objectives, coverage_tier: "platform", description: "Create a PI objective for a team in a program increment." },
  { tool_name: "score_pi_objective", operation_kind: "mutate", data_object_id: D.pi_objectives, coverage_tier: "platform", description: "Record planned-versus-actual business value on a PI objective." },
  { tool_name: "create_cross_team_dependency", operation_kind: "mutate", data_object_id: D.cross_team_dependencies, coverage_tier: "platform", description: "Raise a cross-team dependency for coordination." },
  { tool_name: "resolve_cross_team_dependency", operation_kind: "mutate", data_object_id: D.cross_team_dependencies, coverage_tier: "platform", description: "Mark a cross-team dependency resolved." },
  { tool_name: "update_agile_roadmap", operation_kind: "mutate", data_object_id: D.agile_roadmaps, coverage_tier: "platform", description: "Update an agile roadmap's planned items." },
  // VSM query (platform)
  { tool_name: "query_delivery_value_streams", operation_kind: "query", data_object_id: D.delivery_value_streams, coverage_tier: "platform", description: "Query modeled delivery value streams." },
  { tool_name: "query_tool_connections", operation_kind: "query", data_object_id: D.tool_connections, coverage_tier: "platform", description: "Query configured toolchain connections and their status." },
  { tool_name: "query_flow_metric_definitions", operation_kind: "query", data_object_id: D.flow_metric_definitions, coverage_tier: "platform", description: "Query flow-metric definitions and their thresholds." },
  { tool_name: "query_flow_measurements", operation_kind: "query", data_object_id: D.flow_measurements, coverage_tier: "platform", description: "Query computed flow measurements for a value stream over a period." },
  { tool_name: "query_delivery_bottlenecks", operation_kind: "query", data_object_id: D.delivery_bottlenecks, coverage_tier: "platform", description: "Query detected delivery bottlenecks by value stream and severity." },
  { tool_name: "query_dora_metrics", operation_kind: "query", data_object_id: D.dora_metrics, coverage_tier: "platform", description: "Query computed DORA delivery-performance benchmarks." },
  // VSM mutate (platform)
  { tool_name: "create_delivery_value_stream", operation_kind: "mutate", data_object_id: D.delivery_value_streams, coverage_tier: "platform", description: "Model and create a delivery value stream." },
  { tool_name: "create_tool_connection", operation_kind: "mutate", data_object_id: D.tool_connections, coverage_tier: "platform", description: "Configure a connection to an external delivery tool." },
  { tool_name: "update_flow_metric_definition", operation_kind: "mutate", data_object_id: D.flow_metric_definitions, coverage_tier: "platform", description: "Update a flow-metric definition's thresholds or targets." },
  // VSM fetch (external; pulls work items from vendor tool APIs)
  { tool_name: "fetch_toolchain_work_items", operation_kind: "fetch", data_object_id: null, coverage_tier: "external", description: "Fetch work items and delivery events from an external delivery tool through a configured connection, to mirror into the value-stream model." },
];
const toolMap = new Map<string, number>(Object.entries(REUSE));
{
  const ex = await get(`/tools?select=id,tool_name&limit=20000`);
  const have = new Set(ex.map(r => String(r.tool_name)));
  for (const r of ex) toolMap.set(String(r.tool_name), Number(r.id));
  const rows = newTools.filter(t => !have.has(t.tool_name));
  if (rows.length) { console.log(`  inserting ${rows.length} tools`); await insert("/tools", rows as unknown as Row[]); }
  const all = await get(`/tools?select=id,tool_name&limit=20000`);
  for (const r of all) toolMap.set(String(r.tool_name), Number(r.id));
  console.log(`  tools: +${rows.length}`);
}
const tid = (n: string) => { const v = toolMap.get(n); if (!v) throw new Error(`missing tool ${n}`); return v; };

console.log("== Phase S: domain_module_tools ==");
type DMT = { domain_module_id: number; tool: string; requirement_level: string };
const dmt: DMT[] = [
  // EAP-PROGRAM-EXECUTION
  ...["query_program_increments", "query_agile_release_trains", "query_pi_objectives", "query_cross_team_dependencies", "query_agile_features", "create_program_increment", "commit_pi", "create_pi_objective", "score_pi_objective", "create_cross_team_dependency", "resolve_cross_team_dependency"].map(t => ({ domain_module_id: M.EAP_PE, tool: t, requirement_level: "required" })),
  { domain_module_id: M.EAP_PE, tool: "notify_team", requirement_level: "optional" },
  // EAP-PORTFOLIO-ROADMAP
  ...["query_portfolio_epics", "query_agile_features", "query_agile_roadmaps", "query_program_increments", "create_portfolio_epic", "approve_epic", "create_agile_feature", "update_agile_feature", "update_agile_roadmap"].map(t => ({ domain_module_id: M.EAP_PR, tool: t, requirement_level: "required" })),
  ...["query_okr_objectives", "query_strategic_initiatives", "notify_person"].map(t => ({ domain_module_id: M.EAP_PR, tool: t, requirement_level: "optional" })),
  // VSM-CONNECT-MODEL
  ...["query_delivery_value_streams", "query_tool_connections", "query_flow_metric_definitions", "create_delivery_value_stream", "create_tool_connection", "update_flow_metric_definition", "fetch_toolchain_work_items"].map(t => ({ domain_module_id: M.VSM_CM, tool: t, requirement_level: "required" })),
  ...["query_pull_requests", "query_software_deployments", "query_agile_features"].map(t => ({ domain_module_id: M.VSM_CM, tool: t, requirement_level: "optional" })),
  // VSM-FLOW-INSIGHTS
  ...["query_flow_measurements", "query_delivery_bottlenecks", "query_dora_metrics", "query_delivery_value_streams", "query_flow_metric_definitions"].map(t => ({ domain_module_id: M.VSM_FI, tool: t, requirement_level: "required" })),
  { domain_module_id: M.VSM_FI, tool: "notify_team", requirement_level: "optional" },
];
{
  const ex = await get(`/domain_module_tools?domain_module_id=in.(399,400,401,402)&select=domain_module_id,tool_id`);
  const have = new Set(ex.map(r => `${r.domain_module_id}:${r.tool_id}`));
  const rows = dmt.map(r => ({ domain_module_id: r.domain_module_id, tool_id: tid(r.tool), requirement_level: r.requirement_level }))
    .filter(r => !have.has(`${r.domain_module_id}:${r.tool_id}`));
  if (rows.length) await insert("/domain_module_tools", rows);
  console.log(`  +${rows.length} domain_module_tools`);
}

console.log("\n== Phase C + S done ==");
