// Read-only: characterize the 45 ungrounded domains. For each, count capabilities,
// solutions, modules, data_objects (mastered), handoffs, and read audit status from state.yaml.

import { readFileSync, existsSync } from "node:fs";

const TARGETS = [
  "AIOPS","APIM","APP-PAAS","AUDIT","BANK-OPS","BCM","BI","CLIN-DEV","CONV-AI","DCG",
  "DCIM","DEM","DI","DISCOVERY","DQ","EAM","ESG","ESIGN","FINOPS","HC-PATIENT",
  "IDP","INS-CLAIMS","IPAAS","KUBE-PLAT","NPMD","OBS","OMS","OP-RES","PRIV-MGMT","PRM",
  "PROC-MIN","PS-LIC","RPA","SECOPS","SOAR","SUP-LIFE","TELCO-BSS","TEST-MGMT","THREAT-INTEL","TPRM",
  "UTIL-OPS","VIS-MGMT","VSDP","VULN-MGMT","CCAAS",
];

async function get(path: string): Promise<any[]> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "GET", path })],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  const t = out.trim();
  const s = t.search(/[\[{]/);
  return JSON.parse(s >= 0 ? t.slice(s) : t || "[]");
}

const domains = await get("/domains?select=id,domain_code&domain_code=in.(" + TARGETS.join(",") + ")&limit=1000");
const idByCode = new Map<string, number>(domains.map((d) => [d.domain_code, d.id]));

// bulk pulls
const ids = domains.map((d) => d.id);
const inIds = "(" + ids.join(",") + ")";
const caps = await get(`/capability_domains?domain_id=in.${inIds}&select=domain_id&limit=100000`);
const sols = await get(`/solution_domains?domain_id=in.${inIds}&select=domain_id&limit=100000`);
const mods = await get(`/domain_modules?domain_id=in.${inIds}&select=domain_id&limit=100000`);
const dobs = await get(`/domain_data_objects?domain_id=in.${inIds}&role=eq.master&select=domain_id&limit=100000`);
const hoOut = await get(`/handoffs?source_domain_id=in.${inIds}&select=source_domain_id&limit=100000`);

function tally(rows: any[], key: string): Map<number, number> {
  const m = new Map<number, number>();
  for (const r of rows) m.set(r[key], (m.get(r[key]) || 0) + 1);
  return m;
}
const cCap = tally(caps, "domain_id");
const cSol = tally(sols, "domain_id");
const cMod = tally(mods, "domain_id");
const cDob = tally(dobs, "domain_id");
const cHo = tally(hoOut, "source_domain_id");

function statusOf(code: string): string {
  const p = `c:/dev/domain-map/audits/${code}/state.yaml`;
  if (!existsSync(p)) return "(no state.yaml)";
  const txt = readFileSync(p, "utf8");
  const m = txt.match(/^status:\s*(.+)$/m);
  return m ? m[1].trim() : "(no status)";
}
function hasQ(code: string): boolean {
  return existsSync(`c:/dev/domain-map/audits/${code}/q-${code}.md`);
}

console.log("CODE".padEnd(14), "caps", "sols", "mods", "mstr", "hand", "q?", "status");
console.log("-".repeat(72));
for (const code of TARGETS) {
  const id = idByCode.get(code);
  if (id == null) { console.log(code.padEnd(14), "MISSING FROM /domains"); continue; }
  console.log(
    code.padEnd(14),
    String(cCap.get(id) || 0).padStart(4),
    String(cSol.get(id) || 0).padStart(4),
    String(cMod.get(id) || 0).padStart(4),
    String(cDob.get(id) || 0).padStart(4),
    String(cHo.get(id) || 0).padStart(4),
    (hasQ(code) ? "Y " : "- ").padStart(3),
    statusOf(code),
  );
}
