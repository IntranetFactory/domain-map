// Sync query tools + skill_tools to newly-added masters from the thin-coverage audit.
//
// For each existing system skill, find masters under its domain that don't yet have a query tool linked.
// Create the missing `query_<master>` tool (if not in catalog) and the `(skill, tool, required)` row.

const APPLY = process.argv.includes("--apply");
const CHUNK = 50;

async function call(body: any): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  await p.stdin.end();
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (p.exitCode !== 0) throw new Error(`semantius failed: ${err}`);
  return JSON.parse(out);
}
const get = (path: string) => call({ method: "GET", path });
async function insertChunked(path: string, rows: any[]) {
  if (!rows.length) return;
  if (!APPLY) { console.log(`[dry-run] POST ${path} rows=${rows.length}`); return; }
  for (let i = 0; i < rows.length; i += CHUNK) {
    await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
  }
}

const [skills, tools, dos, ddo, st] = await Promise.all([
  get(`/skills?select=id,skill_name,skill_type,domain_id&skill_type=eq.system&limit=10000`),
  get(`/tools?select=id,tool_name,operation_kind,data_object_id&limit=10000`),
  get(`/data_objects?select=id,data_object_name&limit=10000`),
  get(`/domain_data_objects?select=domain_id,data_object_id,role&role=eq.master&limit=20000`),
  get(`/skill_tools?select=skill_id,tool_id&limit=30000`),
]);

const doNameById = new Map(dos.map((d: any) => [d.id, d.data_object_name]));
const doIdByName = new Map(dos.map((d: any) => [d.data_object_name, d.id]));
const toolByName = new Map(tools.map((t: any) => [t.tool_name, t]));
const queryByDOID = new Map<number, string>();
for (const t of tools as any[]) {
  if (t.operation_kind === "query" && t.data_object_id != null) queryByDOID.set(t.data_object_id, t.tool_name);
}
const mastersByDomain = new Map<number, number[]>();
for (const r of ddo as any[]) {
  const arr = mastersByDomain.get(r.domain_id) ?? [];
  arr.push(r.data_object_id);
  mastersByDomain.set(r.domain_id, arr);
}
const stSet = new Set((st as any[]).map(r => `${r.skill_id}:${r.tool_id}`));

// Plan inserts
const newQueryTools: { tool_name: string; operation_kind: "query"; data_object_id: number; description: string }[] = [];
const seenNewTool = new Set<string>();
type STPlan = { skill_name: string; tool_name: string };
const newST: STPlan[] = [];

for (const s of skills as any[]) {
  if (s.domain_id == null) continue;
  const masters = mastersByDomain.get(s.domain_id) ?? [];
  for (const doi of masters) {
    const name = doNameById.get(doi);
    if (!name) continue;
    let toolName = queryByDOID.get(doi);
    if (!toolName) {
      toolName = `query_${name}`;
      if (!seenNewTool.has(toolName) && !toolByName.has(toolName)) {
        seenNewTool.add(toolName);
        newQueryTools.push({
          tool_name: toolName,
          operation_kind: "query",
          data_object_id: doi,
          description: `Query / list / get ${name.replace(/_/g, " ")} records.`,
        });
      }
    }
    newST.push({ skill_name: s.skill_name, tool_name: toolName });
  }
}

console.log(`new query tools to insert: ${newQueryTools.length}`);
await insertChunked("/tools", newQueryTools);

// Refresh tool map post-insert
let toolByNameAfter = toolByName;
if (APPLY) {
  const t2 = await get(`/tools?select=id,tool_name&limit=10000`);
  toolByNameAfter = new Map((t2 as any[]).map(t => [t.tool_name, { id: t.id }]));
}

const skillIdByName = new Map((skills as any[]).map(s => [s.skill_name, s.id]));
const stRows: any[] = [];
let skipped = 0;
for (const p of newST) {
  const sid = skillIdByName.get(p.skill_name);
  const tool = toolByNameAfter.get(p.tool_name) as any;
  if (sid == null || tool == null) {
    if (!APPLY) continue;
    throw new Error(`Could not resolve (${p.skill_name}, ${p.tool_name})`);
  }
  const tid = tool.id;
  if (stSet.has(`${sid}:${tid}`)) { skipped++; continue; }
  stRows.push({ skill_id: sid, tool_id: tid, requirement_level: "required" });
}
console.log(`skill_tools to insert: ${stRows.length} (${skipped} already linked)`);
await insertChunked("/skill_tools", stRows);

console.log(`\nMode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
