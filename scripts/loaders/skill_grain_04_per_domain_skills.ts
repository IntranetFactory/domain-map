#!/usr/bin/env bun
/**
 * skill_grain_04_per_domain_skills.ts — Step 3 of plans/per-domain-skill-restoration.md.
 *
 * One `system` skill per deployable DOMAIN. The 5 starter skills stay as-is (kept). For the 67
 * full-module domains lacking a per-domain skill, create one (`domain_id` set, `domain_module_id`
 * null, name `<domain_code_lower>-system`, no skill_tools). EXCEPTION: when the target name
 * collides with an existing full-module skill in the same domain (domains 62/67 -> skills 55/57),
 * REUSE that skill by nulling its `domain_module_id` instead of creating a new row. The plan
 * asserts exactly 2 collisions: net 6 reuse (the 4 already-present 72/91/130/149 + 55/57), 65 new.
 *
 * Idempotent: a domain that already has a per-domain system skill is skipped.
 * Run from project root: bun run scripts/loaders/skill_grain_04_per_domain_skills.ts
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
const patch = (path: string, body: Row) => semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

const LIMIT = 200000;

const [allSystem, modules, domains, hosts] = await Promise.all([
  get(`/skills?skill_type=eq.system&select=id,skill_name,domain_id,domain_module_id&limit=${LIMIT}`),
  get(`/domain_modules?select=id,domain_id,module_kind&limit=${LIMIT}`),
  get(`/domains?select=id,domain_code,domain_name&limit=${LIMIT}`),
  get(`/domain_module_host_domains?select=domain_module_id,domain_id&limit=${LIMIT}`),
]);

const domainById = new Map<number, any>(domains.map(d => [d.id, d]));
const moduleById = new Map<number, any>(modules.map(m => [m.id, m]));
const starterModuleIds = new Set<number>(modules.filter(m => m.module_kind === "starter").map(m => m.id));

const perModule = allSystem.filter(s => s.domain_module_id != null);
const perDomain = allSystem.filter(s => s.domain_module_id == null);
const perModuleFull = perModule.filter(s => !starterModuleIds.has(s.domain_module_id));

// Full-module domains (71): the domains of the 246 full-module skills.
const fullModuleDomains = new Set<number>(
  perModuleFull.map(s => moduleById.get(s.domain_module_id)?.domain_id).filter((d): d is number => d != null),
);
const domainsWithPerDomain = new Set<number>(perDomain.map(s => s.domain_id));
const lacking = [...fullModuleDomains].filter(d => !domainsWithPerDomain.has(d)).sort((a, b) => a - b);
console.log(`full-module domains: ${fullModuleDomains.size} (expect 71)`);
console.log(`already have a per-domain skill: ${[...fullModuleDomains].filter(d => domainsWithPerDomain.has(d)).sort((a,b)=>a-b).join(",")} (expect 72,91,130,149)`);
console.log(`lacking a per-domain skill: ${lacking.length} (expect 67)`);
if (fullModuleDomains.size !== 71) throw new Error(`expected 71 full-module domains, got ${fullModuleDomains.size} — ABORT`);
if (lacking.length !== 67) throw new Error(`expected 67 lacking domains, got ${lacking.length} — ABORT`);

const targetName = (d: any) => `${String(d.domain_code).toLowerCase()}-system`;

// Detect collisions: a lacking domain whose target name equals an existing (to-be-deleted)
// full-module system skill in the SAME domain. Reuse that skill instead of creating a new one.
type Reuse = { domainId: number; skillId: number; name: string };
const reuses: Reuse[] = [];
const toCreate: { domainId: number; name: string; description: string }[] = [];
for (const did of lacking) {
  const d = domainById.get(did);
  const name = targetName(d);
  const collide = perModuleFull.find(s => s.skill_name === name && s.domain_id === did);
  if (collide) {
    reuses.push({ domainId: did, skillId: collide.id, name });
  } else {
    // any OTHER existing system skill already carrying this exact name would be an unexpected clash
    const otherClash = allSystem.find(s => s.skill_name === name && s.domain_id !== did);
    if (otherClash) throw new Error(`target name '${name}' (domain ${did}) clashes with skill ${otherClash.id} in domain ${otherClash.domain_id} — unexpected, ABORT`);
    toCreate.push({
      domainId: did,
      name,
      description:
        `System skill for ${d.domain_name}: the domain's single runtime agent surface. Derives its toolset from the domain's modules (the domain_module_tools union over primary and host modules) and scopes itself at runtime to whichever modules and tools the deploying tenant has installed.`,
    });
  }
}

console.log(`\nreuse (null domain_module_id): ${reuses.map(r => `${r.name}#${r.skillId}(dom ${r.domainId})`).join(", ")}`);
console.log(`new to create: ${toCreate.length}`);
if (reuses.length !== 2) throw new Error(`expected exactly 2 reuse collisions, got ${reuses.length} — ABORT`);
const reuseIds = reuses.map(r => r.skillId).sort((a, b) => a - b);
const reuseDomains = reuses.map(r => r.domainId).sort((a, b) => a - b);
if (JSON.stringify(reuseIds) !== JSON.stringify([55, 57])) throw new Error(`reuse skill ids ${JSON.stringify(reuseIds)} != [55,57] — ABORT`);
if (JSON.stringify(reuseDomains) !== JSON.stringify([62, 67])) throw new Error(`reuse domains ${JSON.stringify(reuseDomains)} != [62,67] — ABORT`);
if (toCreate.length !== 65) throw new Error(`expected 65 new, got ${toCreate.length} — ABORT`);

// --- mutations ---
// Reuse: null the domain_module_id so 55/57 become per-domain skills (escaping the Step-6 delete predicate).
for (const r of reuses) {
  const res = await patch(`/skills?id=eq.${r.skillId}`, { domain_module_id: null });
  console.log(`  ~ reused skill ${r.skillId} (${r.name}): domain_module_id -> null (${res.length} row)`);
}

// Create the 65 new per-domain skills.
const bodies = toCreate.map(c => ({
  skill_name: c.name,
  description: c.description,
  skill_type: "system",
  domain_id: c.domainId,
  domain_module_id: null,
  record_status: "new",
}));
const CHUNK = 100;
let created = 0;
for (let i = 0; i < bodies.length; i += CHUNK) {
  const res = await post(`/skills`, bodies.slice(i, i + CHUNK));
  created += res.length;
}
console.log(`  + created ${created} new per-domain system skills`);

// --- verify ---
const after = await get(`/skills?skill_type=eq.system&domain_module_id=is.null&select=id,domain_id,skill_name&limit=${LIMIT}`);
const byDomain = new Map<number, any[]>();
for (const s of after) {
  const arr = byDomain.get(s.domain_id) ?? [];
  arr.push(s);
  byDomain.set(s.domain_id, arr);
}
let missing = 0, dup = 0;
for (const did of fullModuleDomains) {
  const n = (byDomain.get(did) ?? []).length;
  if (n === 0) { missing++; console.warn(`  ! domain ${did} still has NO per-domain system skill`); }
  if (n > 1) { dup++; console.warn(`  ! domain ${did} has ${n} per-domain system skills`); }
}
console.log(`\nper-domain system skills now: ${after.length} (61 prior + 65 new + 2 reused 55/57 = 128 expected)`);
console.log(`full-module domains missing a per-domain skill: ${missing}; with duplicates: ${dup}`);
const ok = missing === 0 && dup === 0 && after.length === 128;
console.log(ok ? "VERIFIED: every full-module domain has exactly one per-domain system skill." : "MISMATCH — investigate.");
if (!ok) process.exit(1);
