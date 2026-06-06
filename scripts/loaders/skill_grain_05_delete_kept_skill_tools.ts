#!/usr/bin/env bun
/**
 * skill_grain_05_delete_kept_skill_tools.ts — Step 4 of plans/per-domain-skill-restoration.md.
 *
 * Deletes the 624 skill_tools rows on KEPT system skills, AFTER Step 2 migrated the recoverable
 * ones to domain_module_tools:
 *   (i)  528 on the 61 original per-domain skills (purged; pre-modularization domain-grain reqs)
 *   (ii) 10 on reused skills 55/57          (lossless: migrated to domain_module_tools mods 64/191)
 *   (iii) 86 on the 5 starter skills        (lossless: migrated to domain_module_tools)
 * = 624. The 65 new per-domain skills carry 0 skill_tools.
 *
 * Target predicate: skill_tools.skill_id IN (every per-domain system skill) UNION
 * (every starter system skill). After Step 3 that set = the 128 per-domain + 5 starter kept skills.
 *
 * HARD INVARIANT: every target row id is verified present in plans/snapshots/skill_tools.json
 * BEFORE any DELETE. Nothing is destroyed that is not in the committed snapshot.
 *
 * Run from project root: bun run scripts/loaders/skill_grain_05_delete_kept_skill_tools.ts
 */
export {};
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

// 1. Load the committed snapshot (the rollback substrate + the hard invariant).
const snapPath = resolve(process.cwd(), "plans/snapshots/skill_tools.json");
const snapshot = JSON.parse(readFileSync(snapPath, "utf8")) as any[];
const snapIds = new Set<number>(snapshot.map(r => Number(r.id)));
if (snapshot.length !== 2767) throw new Error(`snapshot has ${snapshot.length} rows, expected 2767 — ABORT`);
console.log(`snapshot loaded: ${snapshot.length} skill_tools rows (ids verified set of ${snapIds.size})`);

// 2. Identify KEPT system skills (per-domain + starter).
const [system, modules, st] = await Promise.all([
  get(`/skills?skill_type=eq.system&select=id,skill_name,domain_id,domain_module_id&limit=${LIMIT}`),
  get(`/domain_modules?select=id,module_kind&limit=${LIMIT}`),
  get(`/skill_tools?select=id,skill_id&limit=${LIMIT}`),
]);
const starterModuleIds = new Set<number>(modules.filter(m => m.module_kind === "starter").map(m => m.id));
const perDomainIds = new Set<number>(system.filter(s => s.domain_module_id == null).map(s => s.id));
const starterSkillIds = new Set<number>(system.filter(s => s.domain_module_id != null && starterModuleIds.has(s.domain_module_id)).map(s => s.id));
const keptIds = new Set<number>([...perDomainIds, ...starterSkillIds]);
console.log(`kept system skills: ${perDomainIds.size} per-domain + ${starterSkillIds.size} starter = ${keptIds.size}`);

// 3. Target skill_tools rows on kept skills.
const target = st.filter(r => keptIds.has(r.skill_id));
console.log(`target skill_tools on kept skills: ${target.length} (expect 624)`);
// breakdown
const onStarters = target.filter(r => starterSkillIds.has(r.skill_id)).length;
const on5557 = target.filter(r => r.skill_id === 55 || r.skill_id === 57).length;
const onOrig61 = target.length - onStarters - on5557;
console.log(`  breakdown: ${onOrig61} on original per-domain (expect 528) + ${on5557} on 55/57 (expect 10) + ${onStarters} on starters (expect 86)`);
if (target.length !== 624) throw new Error(`expected 624 target rows, got ${target.length} — ABORT`);
if (onStarters !== 86 || on5557 !== 10 || onOrig61 !== 528) throw new Error(`breakdown mismatch — ABORT`);

// 4. HARD INVARIANT: every target id must be in the committed snapshot.
const missing = target.filter(r => !snapIds.has(Number(r.id)));
if (missing.length > 0) throw new Error(`${missing.length} target rows NOT in snapshot — ABORT (ids: ${missing.slice(0,10).map(r=>r.id)})`);
console.log(`HARD INVARIANT OK: all ${target.length} target rows present in committed snapshot.`);

// 5. Delete by id in batches.
const ids = target.map(r => Number(r.id));
const CHUNK = 200;
let deleted = 0;
for (let i = 0; i < ids.length; i += CHUNK) {
  const batch = ids.slice(i, i + CHUNK);
  const res = await del(`/skill_tools?id=in.(${batch.join(",")})`);
  deleted += res.length;
  console.log(`  - deleted ${deleted}/${ids.length}`);
}

// 6. Verify.
const after = await get(`/skill_tools?select=id,skill_id&limit=${LIMIT}`);
const survivingKept = after.filter(r => keptIds.has(r.skill_id)).length;
console.log(`\nskill_tools now: ${after.length} (expect 2143 = 2767 - 624)`);
console.log(`skill_tools surviving on kept system skills: ${survivingKept} (expect 0)`);
const ok = after.length === 2143 && survivingKept === 0;
console.log(ok ? "VERIFIED: 624 deleted; no kept system skill retains any skill_tools." : "MISMATCH — investigate.");
if (!ok) process.exit(1);
