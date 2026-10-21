#!/usr/bin/env bun
// DCG Phase E: personas (domain_roles) + reach (role_modules) + lifecycle process_id wiring
// + responsibility (process_raci). Multi-module domain => E1 requires >=1 persona; 2-module
// floor (E2) honored. Idempotent. record_status='new' on domain_roles (default, omitted).

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [o, e] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`fail: ${e}\nbody=${JSON.stringify(body)}`);
  const t = o.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const patch = (p: string, b: Row) => call({ method: "PATCH", path: p, body: b });
async function post(p: string, rows: Row[]) { if (rows.length) await call({ method: "POST", path: p, body: rows }); }

const CATALOG = 337, LINEAGE = 338, GLOSSARY = 339, STEWARDSHIP = 340, ACCESSGOV = 341, DATAPRODUCTS = 342;
const BF_DATA_ENG = 65, BF_DATA_ANALYTICS = 29;

// ---- personas ----
const ROLES = [
  { role_code: "DATA-STEWARD", role_name: "Data Steward", business_function_id: BF_DATA_ENG,
    description: "Day-to-day governance operator: authors and publishes glossary terms, proposes and approves data classifications, manages stewardship assignments, and certifies assets within a data domain." },
  { role_code: "DATA-OWNER", role_name: "Data Owner", business_function_id: BF_DATA_ENG,
    description: "Accountable owner of a set of data assets and data products: grants and revokes certifications, signs off access policies, and is accountable for the asset's fitness for production use." },
  { role_code: "DATA-CATALOG-ADMIN", role_name: "Data Catalog Administrator", business_function_id: BF_DATA_ENG,
    description: "Operates the catalog platform itself: configures and runs metadata crawlers, manages lineage capture, maintains data domains, and curates the data-product marketplace surface." },
  { role_code: "DATA-GOVERNANCE-LEAD", role_name: "Data Governance Lead", business_function_id: null,
    description: "Cross-functional governance authority spanning Data Engineering and GRC: sets classification and access policy, signs off enterprise data policies, and owns regulatory mapping of the data estate." },
  { role_code: "DATA-CONSUMER", role_name: "Data Consumer", business_function_id: BF_DATA_ANALYTICS,
    description: "Analyst or data-product consumer who discovers assets in the catalog, reads glossary and lineage to build trust, and requests access to governed data products through policy." },
];

// reach: role_code -> [module_id, interaction_level][]
const REACH: Record<string, [number, string][]> = {
  "DATA-STEWARD": [[GLOSSARY, "primary"], [STEWARDSHIP, "primary"], [ACCESSGOV, "primary"], [CATALOG, "secondary"]],
  "DATA-OWNER": [[STEWARDSHIP, "primary"], [DATAPRODUCTS, "primary"], [ACCESSGOV, "secondary"], [CATALOG, "secondary"]],
  "DATA-CATALOG-ADMIN": [[CATALOG, "primary"], [LINEAGE, "primary"], [GLOSSARY, "secondary"], [DATAPRODUCTS, "secondary"]],
  "DATA-GOVERNANCE-LEAD": [[ACCESSGOV, "primary"], [STEWARDSHIP, "primary"], [CATALOG, "secondary"], [DATAPRODUCTS, "secondary"]],
  "DATA-CONSUMER": [[CATALOG, "primary"], [DATAPRODUCTS, "primary"], [GLOSSARY, "secondary"]],
};

// PCF process wiring: data_object_id -> { gated state_name -> process_id }
const PROC = { OWNERSHIP: 1208, POLICY: 1210, MONITOR: 1212, ACCESS: 1215, ARCHITECTURE: 275 };
const STATE_PROCESS: { do: number; map: Record<string, number> }[] = [
  { do: 300, map: { classified: PROC.MONITOR, certified: PROC.MONITOR, deprecated: PROC.MONITOR } }, // data_assets
  { do: 302, map: { published: PROC.ARCHITECTURE, deprecated: PROC.ARCHITECTURE } },                  // glossary_terms
  { do: 303, map: { approved: PROC.POLICY, enforced: PROC.POLICY, retired: PROC.POLICY } },            // data_classifications
  { do: 305, map: { active: PROC.OWNERSHIP, escalated: PROC.OWNERSHIP, revoked: PROC.OWNERSHIP } },    // data_stewardship_assignments
  { do: 306, map: { granted: PROC.MONITOR, revoked: PROC.MONITOR } },                                  // data_certifications
  { do: 307, map: { approved: PROC.ACCESS, enforced: PROC.ACCESS, retired: PROC.ACCESS } },            // data_access_policies
];

// RACI: process_id -> [role_code, raci, consultation_blocking][]
const RACI: Record<number, [string, string, boolean][]> = {
  [PROC.OWNERSHIP]: [["DATA-STEWARD", "responsible", false], ["DATA-OWNER", "accountable", false], ["DATA-GOVERNANCE-LEAD", "consulted", false]],
  [PROC.POLICY]: [["DATA-STEWARD", "responsible", false], ["DATA-GOVERNANCE-LEAD", "accountable", false]],
  [PROC.MONITOR]: [["DATA-STEWARD", "responsible", false], ["DATA-OWNER", "accountable", false]],
  [PROC.ACCESS]: [["DATA-GOVERNANCE-LEAD", "responsible", false], ["DATA-OWNER", "accountable", false], ["DATA-STEWARD", "consulted", true]],
  [PROC.ARCHITECTURE]: [["DATA-STEWARD", "responsible", false], ["DATA-GOVERNANCE-LEAD", "accountable", false]],
};

// ---- execute ----
console.log("== Phase E: domain_roles ==");
{
  const existing = await get(`/domain_roles?role_code=in.(${ROLES.map(r => r.role_code).join(",")})&select=role_code`);
  const have = new Set(existing.map(r => r.role_code as string));
  const rows = ROLES.filter(r => !have.has(r.role_code));
  if (rows.length) { console.log(`  + ${rows.length} personas`); await post("/domain_roles", rows); }
  else console.log("  = all personas present");
}
const roleRows = await get(`/domain_roles?role_code=in.(${ROLES.map(r => r.role_code).join(",")})&select=id,role_code`);
const roleId = new Map(roleRows.map(r => [r.role_code as string, Number(r.id)]));

console.log("== Phase E: role_modules reach ==");
{
  const ids = [...roleId.values()];
  const existing = await get(`/role_modules?role_id=in.(${ids.join(",")})&select=role_id,domain_module_id`);
  const have = new Set(existing.map(r => `${r.role_id}.${r.domain_module_id}`));
  const rows: Row[] = [];
  for (const [code, reach] of Object.entries(REACH)) {
    const rid = roleId.get(code)!;
    for (const [mid, lvl] of reach) if (!have.has(`${rid}.${mid}`)) rows.push({ role_id: rid, domain_module_id: mid, interaction_level: lvl, notes: "" });
  }
  if (rows.length) { console.log(`  + ${rows.length} role_modules`); await post("/role_modules", rows); }
  else console.log("  = all role_modules present");
}

console.log("== Phase E: wire lifecycle process_id on gated states ==");
{
  let n = 0;
  for (const { do: doid, map } of STATE_PROCESS)
    for (const [state, pid] of Object.entries(map)) { await patch(`/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}`, { process_id: pid }); n++; }
  console.log(`  wired process_id on ${n} gated lifecycle states`);
}

console.log("== Phase E: process_raci ==");
{
  const pids = Object.keys(RACI);
  const existing = await get(`/process_raci?process_id=in.(${pids.join(",")})&select=process_id,actor_role_id,raci`);
  const have = new Set(existing.map(r => `${r.process_id}.${r.actor_role_id}.${r.raci}`));
  const rows: Row[] = [];
  for (const [pid, assigns] of Object.entries(RACI))
    for (const [code, raci, blocking] of assigns) {
      const rid = roleId.get(code)!;
      if (!have.has(`${pid}.${rid}.${raci}`)) rows.push({ process_id: Number(pid), actor_role_id: rid, actor_skill_id: null, raci, consultation_blocking: blocking });
    }
  if (rows.length) { console.log(`  + ${rows.length} process_raci`); await post("/process_raci", rows); }
  else console.log("  = all process_raci present");
}

console.log("\n== Phase E done. Persona id map ==");
for (const [code, id] of roleId) console.log(`  ${code} = ${id}`);
