#!/usr/bin/env bun
/**
 * skill_grain_03_migrate_module_tools.ts - Step 2 of plans/per-domain-skill-restoration.md.
 *
 * For each of the 251 per-module system skills (FULL and STARTER), insert its skill_tools rows
 * into domain_module_tools keyed on the skill's domain_module_id, preserving requirement_level,
 * notes, record_status. Deduped on the unique key (domain_module_id.tool_id); required wins over
 * optional on a collision. Verify the resulting count == 2013 (1927 full + 86 starter).
 *
 * Idempotent: skips any (module, tool) pair already present in domain_module_tools.
 * Run from project root: bun run scripts/loaders/skill_grain_03_migrate_module_tools.ts
 */
export {};

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}
const get = (path: string) => semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row[]) => semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;

const LIMIT = 200000;

const [skills, modules, st, existing] = await Promise.all([
  get(`/skills?skill_type=eq.system&domain_module_id=not.is.null&select=id,skill_name,domain_module_id&limit=${LIMIT}`),
  get(`/domain_modules?select=id,domain_module_code,module_kind&limit=${LIMIT}`),
  get(`/skill_tools?select=skill_id,tool_id,requirement_level,notes,record_status&limit=${LIMIT}`),
  get(`/domain_module_tools?select=domain_module_id,tool_id&limit=${LIMIT}`),
]);

if (skills.length !== 251) throw new Error(`expected 251 per-module skills, got ${skills.length} - ABORT`);
const starterModuleIds = new Set<number>(modules.filter(m => m.module_kind === "starter").map(m => m.id));
const skillModule = new Map<number, number>(skills.map(s => [s.id, s.domain_module_id]));
const perModuleSkillIds = new Set<number>(skills.map(s => s.id));

// Build the candidate rows from skill_tools on per-module skills.
type Cand = { domain_module_id: number; tool_id: number; requirement_level: string; notes: any; record_status: string };
const stOnPerModule = st.filter(r => perModuleSkillIds.has(r.skill_id));
console.log(`skill_tools on the 251 per-module skills: ${stOnPerModule.length} (expect 2013)`);
if (stOnPerModule.length !== 2013) throw new Error(`expected 2013 source rows, got ${stOnPerModule.length} - ABORT`);

// Dedup on (domain_module_id, tool_id); required wins over optional.
const byKey = new Map<string, Cand>();
let collisions = 0;
for (const r of stOnPerModule) {
  const moduleId = skillModule.get(r.skill_id)!;
  const key = `${moduleId}.${r.tool_id}`;
  const cand: Cand = {
    domain_module_id: moduleId,
    tool_id: r.tool_id,
    requirement_level: r.requirement_level,
    notes: r.notes ?? null,
    record_status: r.record_status,
  };
  const prev = byKey.get(key);
  if (!prev) { byKey.set(key, cand); continue; }
  collisions++;
  // required wins over optional; otherwise keep the first
  if (prev.requirement_level !== "required" && cand.requirement_level === "required") byKey.set(key, cand);
}
if (collisions > 0) console.log(`  ! ${collisions} within-module (module,tool) collision(s) collapsed (required wins)`);

const deduped = [...byKey.values()];
const fullCount = deduped.filter(c => !starterModuleIds.has(c.domain_module_id)).length;
const starterCount = deduped.filter(c => starterModuleIds.has(c.domain_module_id)).length;
console.log(`distinct (module,tool) pairs to insert: ${deduped.length} (full ${fullCount} + starter ${starterCount})`);

// Idempotency: skip pairs already present.
const have = new Set(existing.map(r => `${r.domain_module_id}.${r.tool_id}`));
const toInsert = deduped.filter(c => !have.has(`${c.domain_module_id}.${c.tool_id}`));
console.log(`already present: ${have.size}; to insert this run: ${toInsert.length}`);

// Batch POST (key is computed; never include it in the body).
const CHUNK = 500;
let inserted = 0;
for (let i = 0; i < toInsert.length; i += CHUNK) {
  const batch = toInsert.slice(i, i + CHUNK);
  const res = await post(`/domain_module_tools`, batch);
  inserted += res.length;
  console.log(`  + inserted ${inserted}/${toInsert.length}`);
}

// Verify final count.
const finalRows = await get(`/domain_module_tools?select=domain_module_id,tool_id&limit=${LIMIT}`);
const finalFull = finalRows.filter(r => !starterModuleIds.has(r.domain_module_id)).length;
const finalStarter = finalRows.filter(r => starterModuleIds.has(r.domain_module_id)).length;
console.log(`\ndomain_module_tools now holds ${finalRows.length} rows (full ${finalFull} + starter ${finalStarter})`);

const ok = finalRows.length === 2013 && finalFull === 1927 && finalStarter === 86;
console.log(ok ? "VERIFIED: 2013 == 1927 full + 86 starter." : "MISMATCH - investigate before proceeding.");
if (!ok) process.exit(1);
