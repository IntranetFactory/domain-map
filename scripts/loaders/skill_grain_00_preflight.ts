#!/usr/bin/env bun
/**
 * skill_grain_00_preflight.ts - read-only verification that the live catalog matches
 * the assumptions in plans/per-domain-skill-restoration.md §2 BEFORE any migration step runs.
 *
 * Writes NOTHING. Prints a PASS/FAIL line per assertion and exits non-zero if ANY fails.
 * Run from project root: bun run scripts/loaders/skill_grain_00_preflight.ts
 *
 * Every destructive step in the plan is gated on these assertions holding. If the live state
 * has drifted from the plan, this stops the migration loudly.
 */
export {};

async function pg(path: string): Promise<any[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify({ method: "GET", path }));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`GET ${path}: ${err || out}`);
  return out.trim() ? JSON.parse(out.trim()) : [];
}

let failures = 0;
function check(label: string, cond: boolean, detail = ""): void {
  const tag = cond ? "PASS" : "FAIL";
  if (!cond) failures++;
  console.log(`  [${tag}] ${label}${detail ? `  - ${detail}` : ""}`);
}

const LIMIT = 200000;

const [skills, modules, st, hosts, praci, entCheck] = await Promise.all([
  pg(`/skills?select=id,skill_name,skill_type,domain_id,domain_module_id,process_id,record_status&limit=${LIMIT}`),
  pg(`/domain_modules?select=id,domain_id,domain_module_code,module_kind&limit=${LIMIT}`),
  pg(`/skill_tools?select=id,skill_id,tool_id,requirement_level,record_status&limit=${LIMIT}`),
  pg(`/domain_module_host_domains?select=domain_module_id,domain_id&limit=${LIMIT}`),
  pg(`/process_raci?select=actor_skill_id&limit=${LIMIT}`),
  pg(`/entities?table_name=in.(domain_module_tools,process_tools)&select=table_name`),
]);

// guard against server-side row caps masking the true counts
check("skills page not capped", skills.length < LIMIT, `${skills.length} rows`);
check("skill_tools page not capped", st.length < LIMIT, `${st.length} rows`);

console.log(`\n== Headline counts ==`);
check("skills == 315", skills.length === 315, `${skills.length}`);
const system = skills.filter(s => s.skill_type === "system");
const processSkills = skills.filter(s => s.skill_type === "process");
check("system skills == 312", system.length === 312, `${system.length}`);
check("process skills == 3", processSkills.length === 3, `${processSkills.length}`);
check("skill_tools == 2767", st.length === 2767, `${st.length}`);

console.log(`\n== System-skill grain ==`);
const perModule = system.filter(s => s.domain_module_id != null);
const perDomain = system.filter(s => s.domain_module_id == null);
check("per-module system skills == 251", perModule.length === 251, `${perModule.length}`);
check("per-domain system skills == 61", perDomain.length === 61, `${perDomain.length}`);
check("no system skill with both domain_id and domain_module_id null",
  system.every(s => s.domain_id != null || s.domain_module_id != null));

// module_kind discriminator: starter vs full
const moduleById = new Map<number, any>(modules.map(m => [m.id, m]));
const starterModuleIds = new Set<number>(modules.filter(m => m.module_kind === "starter").map(m => m.id));
const perModuleStarter = perModule.filter(s => starterModuleIds.has(s.domain_module_id));
const perModuleFull = perModule.filter(s => !starterModuleIds.has(s.domain_module_id));
check("per-module skills on FULL modules == 246", perModuleFull.length === 246, `${perModuleFull.length}`);
check("per-module skills on STARTER modules == 5", perModuleStarter.length === 5, `${perModuleStarter.length}`);

// 1:1 skill<->module among per-module skills
const moduleSkillCounts = new Map<number, number>();
for (const s of perModule) moduleSkillCounts.set(s.domain_module_id, (moduleSkillCounts.get(s.domain_module_id) ?? 0) + 1);
check("1:1 skill<->module (no module carries >1 system skill)",
  [...moduleSkillCounts.values()].every(c => c === 1),
  `max=${Math.max(...moduleSkillCounts.values())}`);

// 246 full modules span 71 domains
const fullModuleDomains = new Set<number>(perModuleFull.map(s => moduleById.get(s.domain_module_id)?.domain_id).filter((d): d is number => d != null));
check("246 full-module skills span 71 domains", fullModuleDomains.size === 71, `${fullModuleDomains.size}`);

console.log(`\n== The 5 starters ==`);
const starterSkillIds = perModuleStarter.map(s => s.id).sort((a, b) => a - b);
check("starter skill ids == {220,226,236,237,242}",
  JSON.stringify(starterSkillIds) === JSON.stringify([220, 226, 236, 237, 242]),
  `${JSON.stringify(starterSkillIds)}`);
for (const s of perModuleStarter) {
  const m = moduleById.get(s.domain_module_id);
  console.log(`    skill ${s.id} (${s.skill_name}) -> module ${s.domain_module_id} (${m?.domain_module_code}, kind=${m?.module_kind}, domain_id=${m?.domain_id})`);
}

console.log(`\n== skill_tools distribution ==`);
const stBySkill = new Map<number, any[]>();
for (const r of st) {
  const arr = stBySkill.get(r.skill_id) ?? [];
  arr.push(r);
  stBySkill.set(r.skill_id, arr);
}
const stCount = (id: number) => (stBySkill.get(id) ?? []).length;
const perModuleST = perModule.reduce((n, s) => n + stCount(s.id), 0);
const perModuleFullST = perModuleFull.reduce((n, s) => n + stCount(s.id), 0);
const perModuleStarterST = perModuleStarter.reduce((n, s) => n + stCount(s.id), 0);
const perDomainST = perDomain.reduce((n, s) => n + stCount(s.id), 0);
const processST = processSkills.reduce((n, s) => n + stCount(s.id), 0);
check("per-module skill_tools == 2013", perModuleST === 2013, `${perModuleST}`);
check("  ...of which full == 1927", perModuleFullST === 1927, `${perModuleFullST}`);
check("  ...of which starter == 86", perModuleStarterST === 86, `${perModuleStarterST}`);
check("per-domain skill_tools == 528", perDomainST === 528, `${perDomainST}`);
check("process skill_tools == 226", processST === 226, `${processST}`);
check("grand total accounting (2013+528+226 == 2767)", perModuleST + perDomainST + processST === 2767,
  `${perModuleST + perDomainST + processST}`);

console.log(`\n== Process skills ==`);
const processIds = processSkills.map(s => s.id).sort((a, b) => a - b);
check("process skill ids == {124,125,126}",
  JSON.stringify(processIds) === JSON.stringify([124, 125, 126]), `${JSON.stringify(processIds)}`);
for (const s of processSkills) {
  console.log(`    process skill ${s.id} (${s.skill_name}) -> ${stCount(s.id)} skill_tools, process_id=${s.process_id}`);
}
check("process skills have null process_id (not yet linked)", processSkills.every(s => s.process_id == null));

console.log(`\n== Per-domain skill split (zero-module vs multi-module) ==`);
const modulesByDomain = new Map<number, number>();
for (const m of modules) modulesByDomain.set(m.domain_id, (modulesByDomain.get(m.domain_id) ?? 0) + 1);
// also count host-domain modules toward a domain having modules
for (const h of hosts) modulesByDomain.set(h.domain_id, (modulesByDomain.get(h.domain_id) ?? 0) + 1);
const perDomainZeroMod = perDomain.filter(s => (modulesByDomain.get(s.domain_id) ?? 0) === 0);
const perDomainMultiMod = perDomain.filter(s => (modulesByDomain.get(s.domain_id) ?? 0) > 0);
const zeroModST = perDomainZeroMod.reduce((n, s) => n + stCount(s.id), 0);
const multiModST = perDomainMultiMod.reduce((n, s) => n + stCount(s.id), 0);
check("per-domain skills in zero-module domains == 45", perDomainZeroMod.length === 45, `${perDomainZeroMod.length}`);
check("per-domain skills in multi-module domains == 16", perDomainMultiMod.length === 16, `${perDomainMultiMod.length}`);
check("  ...zero-module skill_tools == 391", zeroModST === 391, `${zeroModST}`);
check("  ...multi-module skill_tools == 137", multiModST === 137, `${multiModST}`);

console.log(`\n== Name collisions (domains 62/67) ==`);
const skillById = new Map<number, any>(skills.map(s => [s.id, s]));
const s55 = skillById.get(55), s57 = skillById.get(57);
check("skill 55 is 'emp-exp-system' on a module", s55?.skill_name === "emp-exp-system" && s55?.domain_module_id != null,
  `${s55?.skill_name}, module=${s55?.domain_module_id}`);
check("skill 57 is 'expense-system' on a module", s57?.skill_name === "expense-system" && s57?.domain_module_id != null,
  `${s57?.skill_name}, module=${s57?.domain_module_id}`);
check("skill 55 sits on module 64", s55?.domain_module_id === 64, `${s55?.domain_module_id}`);
check("skill 57 sits on module 191", s57?.domain_module_id === 191, `${s57?.domain_module_id}`);

console.log(`\n== Target full-module domains needing a per-domain skill ==`);
// Domains that already have a per-domain (domain_module_id null) system skill:
const domainsWithPerDomainSkill = new Set<number>(perDomain.map(s => s.domain_id));
// Full-module domains lacking one:
const fullDomainsLacking = [...fullModuleDomains].filter(d => !domainsWithPerDomainSkill.has(d));
const fullDomainsHaving = [...fullModuleDomains].filter(d => domainsWithPerDomainSkill.has(d));
check("full-module domains already having a per-domain skill == 4", fullDomainsHaving.length === 4,
  `${JSON.stringify(fullDomainsHaving.sort((a, b) => a - b))}`);
check("full-module domains lacking a per-domain skill == 67", fullDomainsLacking.length === 67, `${fullDomainsLacking.length}`);
check("  -> 65 new + 2 reuse(62,67)", fullDomainsLacking.includes(62) && fullDomainsLacking.includes(67),
  `62 in lacking=${fullDomainsLacking.includes(62)}, 67 in lacking=${fullDomainsLacking.includes(67)}`);

console.log(`\n== requirement_level / record_status / new entities / process_raci ==`);
const reqLevels = new Set(st.map(r => r.requirement_level));
check("requirement_level subset of {required,optional}",
  [...reqLevels].every(v => v === "required" || v === "optional"), `${JSON.stringify([...reqLevels])}`);
const stStatuses = new Set(st.map(r => r.record_status));
check("skill_tools.record_status all 'new'", [...stStatuses].every(v => v === "new"), `${JSON.stringify([...stStatuses])}`);
check("domain_module_tools + process_tools do NOT exist yet", entCheck.length === 0,
  `found: ${JSON.stringify(entCheck.map(e => e.table_name))}`);
const nonNullActor = praci.filter(r => r.actor_skill_id != null).length;
check("process_raci.actor_skill_id has 0 non-null", nonNullActor === 0, `${nonNullActor} non-null`);

console.log(`\n${failures === 0 ? "ALL PREFLIGHT CHECKS PASSED" : `${failures} PREFLIGHT CHECK(S) FAILED - DO NOT PROCEED`}`);
process.exit(failures === 0 ? 0 : 1);
