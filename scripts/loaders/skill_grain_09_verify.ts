#!/usr/bin/env bun
/**
 * skill_grain_09_verify.ts - Step 8 of plans/per-domain-skill-restoration.md.
 *
 * Read-only assertion that the live catalog matches the post-migration target state. Prints a
 * PASS/FAIL line per invariant; exits non-zero if any fails.
 * Run from project root: bun run scripts/loaders/skill_grain_09_verify.ts
 */
export {};

async function pg(path: string): Promise<any[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify({ method: "GET", path }));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`GET ${path}: ${err || out}`);
  return out.trim() ? JSON.parse(out.trim()) : [];
}
let failures = 0;
function check(label: string, cond: boolean, detail = ""): void {
  if (!cond) failures++;
  console.log(`  [${cond ? "PASS" : "FAIL"}] ${label}${detail ? `  - ${detail}` : ""}`);
}
const L = 200000;

const [ents, skills, modules, dmt, pt, praci] = await Promise.all([
  pg(`/entities?table_name=in.(skill_tools,domain_module_tools,process_tools)&select=table_name`),
  pg(`/skills?select=id,skill_name,skill_type,domain_id,domain_module_id,process_id&limit=${L}`),
  pg(`/domain_modules?select=id,domain_id,module_kind&limit=${L}`),
  pg(`/domain_module_tools?select=domain_module_id&limit=${L}`),
  pg(`/process_tools?select=process_id&limit=${L}`),
  pg(`/process_raci?actor_skill_id=not.is.null&select=id&limit=${L}`),
]);

const entNames = new Set(ents.map(e => e.table_name));
const moduleById = new Map<number, any>(modules.map(m => [m.id, m]));
const starterModuleIds = new Set<number>(modules.filter(m => m.module_kind === "starter").map(m => m.id));
const system = skills.filter(s => s.skill_type === "system");
const processSkills = skills.filter(s => s.skill_type === "process");
const perModule = system.filter(s => s.domain_module_id != null);
const perDomain = system.filter(s => s.domain_module_id == null);
const perModuleFull = perModule.filter(s => !starterModuleIds.has(s.domain_module_id));
const perModuleStarter = perModule.filter(s => starterModuleIds.has(s.domain_module_id));

console.log("== Entities ==");
check("skill_tools entity DROPPED", !entNames.has("skill_tools"));
check("domain_module_tools entity exists", entNames.has("domain_module_tools"));
check("process_tools entity exists", entNames.has("process_tools"));

console.log("\n== Relationship row counts ==");
check("domain_module_tools == 2013", dmt.length === 2013, `${dmt.length}`);
check("process_tools == 226", pt.length === 226, `${pt.length}`);

console.log("\n== Skills ==");
check("total skills == 136", skills.length === 136, `${skills.length}`);
check("system skills == 133", system.length === 133, `${system.length}`);
check("process skills == 3", processSkills.length === 3, `${processSkills.length}`);
check("per-module FULL system skills == 0", perModuleFull.length === 0, `${perModuleFull.length}`);
check("per-module STARTER system skills == 5", perModuleStarter.length === 5, `${perModuleStarter.length}`);
check("starter skill ids == {220,226,236,237,242}",
  JSON.stringify(perModuleStarter.map(s => s.id).sort((a, b) => a - b)) === JSON.stringify([220, 226, 236, 237, 242]));
check("per-domain system skills == 128", perDomain.length === 128, `${perDomain.length}`);
check("no system skill with both domain_id and domain_module_id null",
  system.every(s => s.domain_id != null || s.domain_module_id != null));

console.log("\n== One domain-grain skill per full-module domain ==");
// full-module domains: domains of the 5 starters' host coverage are separate; here a full-module
// domain is any domain that owns a non-starter module carrying domain_module_tools.
const modulesWithTools = new Set<number>(dmt.map(r => r.domain_module_id));
const fullModuleDomains = new Set<number>();
for (const mid of modulesWithTools) {
  const m = moduleById.get(mid);
  if (m && !starterModuleIds.has(mid) && m.domain_id != null) fullModuleDomains.add(m.domain_id);
}
const perDomainByDomain = new Map<number, number>();
for (const s of perDomain) perDomainByDomain.set(s.domain_id, (perDomainByDomain.get(s.domain_id) ?? 0) + 1);
let missing = 0, dup = 0;
for (const d of fullModuleDomains) {
  const n = perDomainByDomain.get(d) ?? 0;
  if (n === 0) missing++;
  if (n > 1) dup++;
}
check("every full-module domain has >=1 domain-grain system skill", missing === 0, `${missing} missing`);
check("no full-module domain has >1 domain-grain system skill", dup === 0, `${dup} dup`);
check("full-module domains span 71", fullModuleDomains.size === 71, `${fullModuleDomains.size}`);

console.log("\n== Process skills linked ==");
const proc = processSkills.filter(s => [124, 125, 126].includes(s.id));
check("skills 124/125/126 all have process_id set", proc.length === 3 && proc.every(s => s.process_id != null),
  proc.map(s => `${s.id}->${s.process_id}`).join(", "));

console.log("\n== process_raci ==");
check("process_raci.actor_skill_id still 0 non-null", praci.length === 0, `${praci.length}`);

console.log(`\n${failures === 0 ? "ALL POST-MIGRATION INVARIANTS HOLD" : `${failures} INVARIANT(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
