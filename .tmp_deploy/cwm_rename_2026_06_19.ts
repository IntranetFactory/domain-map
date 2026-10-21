// VMS -> CWM rename (restructure-first). User-approved 2026-06-19.
// Scope: rename domain 64, aliases, repurpose the domain skill. Keeps the 2 existing modules
// (315 VMS-WORKER-SOURCING, 316 VMS-TIME-INVOICING) as the Staff-Augmentation pillar. Does NOT add
// the 3 new modules (SOW / Direct Sourcing-FMS / Worker Classification) or their 14 new masters,
// those are expansive structure pending the q-CWM.md sign-off (Rule #21). Idempotent.

type Row = Record<string, unknown>;
const DOMAIN_ID = 64;
const DOMAIN_NAME = "Contingent Workforce Management";
const DOMAIN_CODE = "CWM";

async function call(req: { method: string; path: string; body?: unknown }): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(req));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  const trimmed = out.trim();
  if (!trimmed) {
    if (proc.exitCode === 0) return [];
    throw new Error(`call failed (${proc.exitCode}) ${req.method} ${req.path}: ${err}`);
  }
  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`non-JSON from ${req.method} ${req.path}: ${trimmed.slice(0, 500)} ${err}`);
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.code && parsed.message) {
    throw new Error(`PostgREST error ${req.method} ${req.path}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}
const get = (path: string) => call({ method: "GET", path });
const log = (m: string) => console.log(m);

// 1. Rename domain
const [domain] = await get(`/domains?id=eq.${DOMAIN_ID}`);
if (!domain) throw new Error(`domain ${DOMAIN_ID} not found`);
const collision = await get(`/domains?domain_code=eq.${DOMAIN_CODE}&id=neq.${DOMAIN_ID}&select=id`);
if (collision.length > 0) throw new Error(`domain_code ${DOMAIN_CODE} already used by another domain`);
if (domain.domain_code !== DOMAIN_CODE || domain.domain_name !== DOMAIN_NAME) {
  await call({
    method: "PATCH",
    path: `/domains?id=eq.${DOMAIN_ID}`,
    body: { domain_name: DOMAIN_NAME, domain_code: DOMAIN_CODE },
  });
  log(`renamed domain ${DOMAIN_ID}: ${domain.domain_code} -> ${DOMAIN_CODE}`);
} else {
  log(`domain already ${DOMAIN_CODE} (skip)`);
}

// 2. Aliases
const aliasTexts = [
  "VMS",
  "Vendor Management System",
  "contingent workforce",
  "contingent labor",
  "extended workforce",
  "external workforce",
];
const existing = await get(`/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=alias`);
const have = new Set(existing.map((r: Row) => String(r.alias).toLowerCase()));
const newAliases = aliasTexts
  .filter((a) => !have.has(a.toLowerCase()))
  .map((a) => ({ domain_id: DOMAIN_ID, alias: a, label: a, alias_type: "synonym" }));
if (newAliases.length) await call({ method: "POST", path: "/domain_aliases", body: newAliases });
log(`aliases: +${newAliases.length} (had ${existing.length})`);

// 3. Repurpose the domain skill
const skillDescription =
  "Source and manage your non-employee workforce: agency contractors, statement-of-work services, and directly-sourced freelancers. Raise contingent worker requisitions, distribute them to staffing suppliers, manage assignments and rate cards, approve timesheets and invoices, and classify each worker for IR35, AB5, and co-employment compliance.";
const skillTriggers =
  "contingent workforce, contingent labor, VMS, vendor management system, extended workforce, external workforce, staffing supplier, contractor management, freelancer management, statement of work, SOW, rate card, contingent timesheet, worker classification, IR35, AB5, co-employment, MSP, services procurement, direct sourcing";
const [skill] = await get(`/skills?domain_id=eq.${DOMAIN_ID}&skill_type=eq.domain&select=id,skill_name`);
if (!skill) {
  log("WARNING: no domain skill found for domain 64; skipping skill repurpose");
} else {
  await call({
    method: "PATCH",
    path: `/skills?id=eq.${skill.id}`,
    body: { skill_name: "cwm", description: skillDescription, trigger_keywords: skillTriggers },
  });
  log(`skill ${skill.id}: ${skill.skill_name} -> cwm (description + trigger_keywords set)`);
}

// Summary
log("\n=== CWM rename summary ===");
const [d2] = await get(`/domains?id=eq.${DOMAIN_ID}&select=domain_code,domain_name,domain_kind`);
log(`domain: ${d2.domain_code} "${d2.domain_name}" (${d2.domain_kind})`);
const mods = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=domain_module_code,module_kind&order=id.asc`);
log(`modules (${mods.length}, unchanged): ${mods.map((m: Row) => m.domain_module_code).join(", ")}`);
const al = await get(`/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=alias`);
log(`aliases (${al.length}): ${al.map((r: Row) => r.alias).join(", ")}`);
log("Done.");
