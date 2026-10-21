// Read-only sweep: classify the 16 "leadership-tier" domains by their actual
// data-object footprint. Goal: which are genuinely empty-shell (legit no-master
// overlay) vs mis-flagged master/derived-bearing domains that were filed empty.
// No writes. Run: bun run .tmp_deploy/leadership_tier_sweep_2026_06_02.ts

const CODES = [
  "REV-INTEL", "SALES-PERF", "GTM-PLAN", "ACCT-PLAN", "PRM", "OP-RES",
  "BCM", "SECOPS", "SOAR", "THREAT-INTEL", "TPRM", "VULN-MGMT",
  "PRIV-MGMT", "FINOPS", "INTRANET", "COLLAB-GOV",
];

async function pg(path: string): Promise<any[]> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "GET", path })],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = (await new Response(proc.stdout).text()).trim();
  await proc.exited;
  const start = out.indexOf("[");
  if (start < 0) {
    console.error("Non-JSON output for", path, "\n", out.slice(0, 400));
    throw new Error("bad output");
  }
  return JSON.parse(out.slice(start));
}

const domains = await pg(`/domains?domain_code=in.(${CODES.join(",")})&select=id,domain_code,crud_percentage,usa_market_size_usd_m`);
const idByCode = new Map<string, number>();
const codeById = new Map<number, string>();
for (const d of domains) { idByCode.set(d.domain_code, d.id); codeById.set(d.id, d.domain_code); }
const ids = domains.map((d: any) => d.id);
const idList = ids.join(",");

const ddo = await pg(`/domain_data_objects?domain_id=in.(${idList})&select=domain_id,role,data_object_id`);
const mods = await pg(`/domain_modules?domain_id=in.(${idList})&select=id,domain_id,domain_module_code,module_kind`);
const modIds = mods.map((m: any) => m.id);
const dmdo = modIds.length
  ? await pg(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,role,data_object_id`)
  : [];
const caps = await pg(`/capability_domains?domain_id=in.(${idList})&select=domain_id,capability_id`);
const hOut = await pg(`/handoffs?source_domain_id=in.(${idList})&select=id,source_domain_id,target_domain_id`);
const hIn = await pg(`/handoffs?target_domain_id=in.(${idList})&select=id,source_domain_id,target_domain_id`);
const skills = await pg(`/skills?domain_id=in.(${idList})&select=id,domain_id,skill_type,domain_module_id`);

// module id -> domain id, for rolling DMDO roles up to the domain
const modDomain = new Map<number, number>();
for (const m of mods) modDomain.set(m.id, m.domain_id);

function tallyRoles(rows: any[], getDomain: (r: any) => number) {
  const out = new Map<number, Record<string, number>>();
  for (const r of rows) {
    const dom = getDomain(r);
    if (!out.has(dom)) out.set(dom, { master: 0, embedded_master: 0, contributor: 0, consumer: 0, derived: 0 });
    const rec = out.get(dom)!;
    rec[r.role] = (rec[r.role] ?? 0) + 1;
  }
  return out;
}

const ddoRoles = tallyRoles(ddo, (r) => r.domain_id);
const dmdoRoles = tallyRoles(dmdo, (r) => modDomain.get(r.domain_module_id)!);

function count<T>(arr: T[], pred: (x: T) => boolean) { return arr.filter(pred).length; }

const rows: any[] = [];
for (const code of CODES) {
  const id = idByCode.get(code);
  if (id == null) { rows.push({ code, missing: true }); continue; }
  const modList = mods.filter((m: any) => m.domain_id === id);
  const dr = ddoRoles.get(id) ?? { master: 0, embedded_master: 0, contributor: 0, consumer: 0, derived: 0 };
  const mr = dmdoRoles.get(id) ?? { master: 0, embedded_master: 0, contributor: 0, consumer: 0, derived: 0 };
  const capCount = count(caps, (c: any) => c.domain_id === id);
  const out = count(hOut, (h: any) => h.source_domain_id === id);
  const inb = count(hIn, (h: any) => h.target_domain_id === id);
  const sysSkills = count(skills, (s: any) => s.domain_id === id && s.skill_type === "system");

  // combined footprint (union of legacy DDO + module DMDO roles)
  const master = dr.master + mr.master;
  const embedded = dr.embedded_master + mr.embedded_master;
  const consumer = dr.consumer + mr.consumer;
  const derived = dr.derived + mr.derived;
  const contributor = dr.contributor + mr.contributor;
  const anyFootprint = master + embedded + consumer + derived + contributor;

  let cls: string;
  if (master > 0) cls = "MASTER-BEARING (mis-flagged: already owns masters)";
  else if (anyFootprint > 0) cls = "OVERLAY (legit: consumes/derives, non-empty, deployable)";
  else if (modList.length === 0) cls = "EMPTY-SHELL/no-modules (broken: not deployable)";
  else cls = "EMPTY-MODULE (broken: module exists but 0 data-object rows)";

  rows.push({
    code, id, modules: modList.length,
    kinds: modList.map((m: any) => m.module_kind).join("/") || "-",
    caps: capCount,
    m: master, em: embedded, cn: consumer, dv: derived, co: contributor,
    dmdo: mr.master + mr.embedded_master + mr.consumer + mr.derived + mr.contributor,
    hOut: out, hIn: inb, sysSkills, cls,
  });
}

console.log("\n=== Leadership-tier footprint sweep (live) ===\n");
const header = ["code", "id", "mods", "kinds", "caps", "mstr", "emb", "cons", "derv", "ctrb", "hOut", "hIn", "sysSk"];
console.log(header.map((h) => h.padEnd(h === "code" ? 13 : h === "kinds" ? 10 : 5)).join(" "));
for (const r of rows) {
  if (r.missing) { console.log(`${r.code.padEnd(13)} (NOT FOUND in /domains)`); continue; }
  console.log([
    r.code.padEnd(13), String(r.id).padEnd(5), String(r.modules).padEnd(5),
    String(r.kinds).padEnd(10), String(r.caps).padEnd(5),
    String(r.m).padEnd(5), String(r.em).padEnd(5), String(r.cn).padEnd(5),
    String(r.dv).padEnd(5), String(r.co).padEnd(5),
    String(r.hOut).padEnd(5), String(r.hIn).padEnd(5), String(r.sysSkills).padEnd(5),
  ].join(" "));
}

console.log("\n=== Classification ===\n");
const groups = new Map<string, string[]>();
for (const r of rows) {
  if (r.missing) continue;
  if (!groups.has(r.cls)) groups.set(r.cls, []);
  groups.get(r.cls)!.push(r.code);
}
for (const [cls, list] of [...groups.entries()].sort()) {
  console.log(`${cls}  (${list.length})`);
  console.log(`   ${list.join(", ")}\n`);
}
