#!/usr/bin/env bun
/**
 * skill_grain_07_delete_full_skills.ts — Step 6 of plans/per-domain-skill-restoration.md.
 *
 * After Steps 3 and 5, delete every `system` skill whose domain_module_id is not null AND whose
 * module is NOT a starter. That is the 244 full-module skills (= 246 minus the 55/57 reused).
 * Deleted BY PREDICATE, not a pre-captured id list. Their 1917 skill_tools cascade away, emptying
 * the table. Then drop `skill_tools` (retired per the target model). Descriptions are preserved in
 * the Step-0 snapshot.
 *
 * Verifies: process_raci.actor_skill_id still 0 non-null; the ONLY remaining domain_module_id-not-null
 * system skills are the 5 starters; skill_tools holds 0 rows; then the entity is dropped.
 *
 * Run from project root: bun run scripts/loaders/skill_grain_07_delete_full_skills.ts
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
const del = (path: string) => semCall("postgrestRequest", { method: "DELETE", path }) as Promise<any[]>;

const LIMIT = 200000;

// 1. Re-assert actor_skill_id still 0 non-null (deleting actor skills would orphan RACI otherwise).
const praci = await get(`/process_raci?actor_skill_id=not.is.null&select=id&limit=${LIMIT}`);
if (praci.length !== 0) throw new Error(`process_raci.actor_skill_id has ${praci.length} non-null — ABORT (cascade would orphan)`);
console.log(`process_raci.actor_skill_id non-null: 0 (safe)`);

// 2. Identify the predicate target (244 full-module system skills).
const modules = await get(`/domain_modules?select=id,module_kind&limit=${LIMIT}`);
const starterIds = modules.filter(m => m.module_kind === "starter").map(m => m.id).sort((a, b) => a - b);
console.log(`starter module ids: ${starterIds.join(",")}`);
const PRED = `skill_type=eq.system&domain_module_id=not.is.null&domain_module_id=not.in.(${starterIds.join(",")})`;

const target = await get(`/skills?${PRED}&select=id,domain_module_id&limit=${LIMIT}`);
console.log(`predicate matches: ${target.length} skills (expect 244)`);
if (target.length !== 244) throw new Error(`expected 244 target skills, got ${target.length} — ABORT`);

// 3. Confirm the cascade target: all remaining skill_tools are on these 244 skills (1917), nothing else.
const targetIds = new Set(target.map(s => s.id));
const st = await get(`/skill_tools?select=id,skill_id&limit=${LIMIT}`);
const onTarget = st.filter(r => targetIds.has(r.skill_id)).length;
const offTarget = st.filter(r => !targetIds.has(r.skill_id));
console.log(`skill_tools total ${st.length}; on target ${onTarget}; off target ${offTarget.length}`);
if (st.length !== 1917 || onTarget !== 1917 || offTarget.length !== 0) {
  throw new Error(`cascade target mismatch (total ${st.length}, on ${onTarget}, off ${offTarget.length}) — ABORT`);
}
console.log(`cascade will remove exactly 1917 skill_tools; no other skill_tools exist.`);

// 4. Delete by predicate.
const deleted = await del(`/skills?${PRED}`);
console.log(`  - deleted ${deleted.length} full-module system skills (cascade removes their skill_tools)`);

// 5. Verify post-delete state.
const [remainingPerModule, stAfter, allSkills] = await Promise.all([
  get(`/skills?skill_type=eq.system&domain_module_id=not.is.null&select=id,domain_module_id&limit=${LIMIT}`),
  get(`/skill_tools?select=id&limit=${LIMIT}`),
  get(`/skills?select=id,skill_type,domain_module_id&limit=${LIMIT}`),
]);
const remainStarter = remainingPerModule.every(s => starterIds.includes(s.domain_module_id));
console.log(`\nremaining domain_module_id-not-null system skills: ${remainingPerModule.length} (expect 5, all starters: ${remainStarter})`);
console.log(`skill_tools rows: ${stAfter.length} (expect 0)`);
console.log(`total skills: ${allSkills.length} (expect 136 = 133 system + 3 process)`);
const sys = allSkills.filter(s => s.skill_type === "system").length;
const proc = allSkills.filter(s => s.skill_type === "process").length;
console.log(`  system ${sys} (expect 133) + process ${proc} (expect 3)`);
if (!(remainingPerModule.length === 5 && remainStarter && stAfter.length === 0 && allSkills.length === 136 && sys === 133 && proc === 3)) {
  throw new Error("post-delete verification failed — ABORT before dropping skill_tools");
}

// 6. Drop the now-empty skill_tools entity (retired per the target model).
console.log(`\ndropping skill_tools entity...`);
await semCall("delete_entity", { table_name: "skill_tools" });
const stillThere = await get(`/entities?table_name=eq.skill_tools&select=table_name`);
if (stillThere.length !== 0) throw new Error(`skill_tools entity still present after drop — ${JSON.stringify(stillThere)}`);
console.log(`  + skill_tools entity dropped (GET /entities?table_name=eq.skill_tools -> [])`);

console.log(`\nVERIFIED: 244 full-module skills deleted; only 5 starter per-module skills remain; skill_tools dropped.`);
