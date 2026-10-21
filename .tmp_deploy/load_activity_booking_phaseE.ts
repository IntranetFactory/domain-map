#!/usr/bin/env bun
// Phase E (personas + reach) for ACTIVITY-BOOKING (193). Modules CORE=418 SCHED=419 WAIVERS=420 DIST=421.
// Authors domain_roles + role_modules (REACH). process_raci (RESPONSIBILITY) deferred to the RACI pass.
import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius failed: ${stderr}`);
  const t = stdout.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>(); for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => { const o: Row = {}; for (const k of keys) o[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null; return o; });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += 50) out.push(...await call({ method: "POST", path, body: uniformize(rows.slice(i, i + 50)) }));
  return out;
}
const CORE = 418, SCHED = 419, WAIVERS = 420, DIST = 421;

type Persona = { role_code: string; role_name: string; description: string; business_function_id: number | null; reach: [number, string][] };
const personas: Persona[] = [
  { role_code: "BIZOPS-RESERVATIONS-MANAGER", role_name: "Reservations Manager", business_function_id: 34,
    description: "Owns the operator's booking operation: configures products, departures, and rates, oversees bookings, refunds, guide scheduling, and waiver compliance, and manages distribution.",
    reach: [[CORE, "primary"], [SCHED, "primary"], [WAIVERS, "primary"], [DIST, "secondary"]] },
  { role_code: "BIZOPS-BOOKING-AGENT", role_name: "Booking Agent", business_function_id: 34,
    description: "Front-line staff who take and amend bookings over the phone, at the counter, and online, collect payments, and ensure each guest has signed a waiver.",
    reach: [[CORE, "primary"], [WAIVERS, "secondary"]] },
  { role_code: "BIZOPS-GUIDE", role_name: "Guide and Trip Leader", business_function_id: 34,
    description: "Field staff assigned to departures: confirm availability, review the manifest and participant requirements, check out equipment, and run the trip.",
    reach: [[SCHED, "primary"], [CORE, "secondary"]] },
  { role_code: "MARKETING-DISTRIBUTION-MANAGER", role_name: "Distribution Manager", business_function_id: 22,
    description: "Manages reseller and online-travel-agency relationships, maps products to channels, sets commission terms, and keeps channel availability in sync with the operator calendar.",
    reach: [[DIST, "primary"], [CORE, "secondary"]] },
];

async function main() {
  console.log("=== domain_roles ===");
  const codes = personas.map(p => p.role_code);
  const existRoles = await get(`/domain_roles?role_code=in.(${codes.join(",")})&select=id,role_code`);
  const roleMap = new Map<string, number>(); for (const r of existRoles) roleMap.set(String(r.role_code), Number(r.id));
  const missing = personas.filter(p => !roleMap.has(p.role_code));
  if (missing.length) {
    console.log(`  inserting ${missing.length}`);
    await insert("/domain_roles", missing.map(p => ({ role_code: p.role_code, role_name: p.role_name, description: p.description, business_function_id: p.business_function_id })));
  } else console.log("  all present");
  const allRoles = await get(`/domain_roles?role_code=in.(${codes.join(",")})&select=id,role_code`);
  roleMap.clear(); for (const r of allRoles) roleMap.set(String(r.role_code), Number(r.id));

  console.log("=== role_modules ===");
  const roleIds = [...roleMap.values()].join(",");
  const existRM = await get(`/role_modules?role_id=in.(${roleIds})&select=role_id,domain_module_id&limit=1000`);
  const rmSet = new Set(existRM.map(r => `${r.role_id}:${r.domain_module_id}`));
  const newRM: Row[] = [];
  for (const p of personas) {
    const rid = roleMap.get(p.role_code)!;
    for (const [mid, lvl] of p.reach) {
      if (rmSet.has(`${rid}:${mid}`)) continue;
      newRM.push({ role_id: rid, domain_module_id: mid, interaction_level: lvl, notes: "" });
    }
  }
  if (newRM.length) { console.log(`  inserting ${newRM.length}`); await insert("/role_modules", newRM); } else console.log("  all present");

  console.log("\n=== Phase E counts ===");
  console.log(JSON.stringify({
    personas: allRoles.length,
    role_modules: (await get(`/role_modules?role_id=in.(${roleIds})&select=role_id&limit=1000`)).length,
  }, null, 2));
}
await main();
