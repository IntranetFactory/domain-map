#!/usr/bin/env bun
/**
 * phase_p_triage.ts — read-only catalog-wide triage for the Phase P sweep.
 *
 * Plan: plans/phase-p-catalog-sweep.md. For every domain it derives the post-Plan-3
 * readiness signals and prints a prioritized backlog. It WRITES NOTHING to the tenant
 * and touches no audit files; it only emits a table + JSON the state-update step consumes.
 *
 * Signals (re-derived live every run, Policy 4):
 *   - module_count        domain_modules rows with domain_id = this domain
 *   - capability_count    capability_domains rows for this domain
 *   - persona_count       distinct domain_roles reaching this domain via
 *                         role_modules.domain_module_id -> domain_modules.domain_id
 *   - unclassified_masters  data_objects this domain masters whose entity_type is
 *                         null or 'unclassified' (B13)
 *   - m9_shapes           contributor / required-consumer rows on this domain's modules
 *                         pointing at an entity mastered by ANOTHER domain, not embedded
 *                         here, not a platform built-in, not a shared master (M9 entity layer)
 *
 * Verdict + b1a codes follow the plan's per-domain decision table.
 *
 * Usage (from project root):
 *   bun run scripts/analytics/phase_p_triage.ts            # table + summary + JSON file
 *   bun run scripts/analytics/phase_p_triage.ts --json     # also dump JSON to stdout
 */
export {};
import { pg } from "../lib/catalog.ts";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DUMP_JSON = process.argv.includes("--json");
const JSON_OUT = "c:/dev/domain-map/.tmp_deploy/phase_p_triage.json";

// ATS is the worked persona pilot; it legitimately has personas. It still gets B13/M9
// evaluated like any other domain, it just never accrues B1A-PHASE-P.
const PERSONA_PILOT = "ATS";

type Domain = { id: number; domain_code: string; domain_name: string };
type Module = { id: number; domain_module_code: string; domain_id: number | null };
type CapDom = { domain_id: number };
type DomainRole = { id: number; record_status: string | null };
type RoleModule = { role_id: number; domain_module_id: number };
type Dmdo = { domain_module_id: number; data_object_id: number; role: string; necessity: string | null };
type DataObject = { id: number; data_object_name: string; kind: string; entity_type: string | null };

// Fetch sequentially: each pg() spawns a fresh `semantius` CLI process with its own MCP
// connection, and firing them concurrently intermittently times out the server. One at a
// time is slower but reliable for a read-only triage.
const domains = (await pg("GET", "/domains?select=id,domain_code,domain_name,domain_kind&order=domain_code.asc&limit=10000")) as Domain[];
const modules = (await pg("GET", "/domain_modules?select=id,domain_module_code,domain_id&limit=10000")) as Module[];
const capDoms = (await pg("GET", "/capability_domains?select=domain_id&limit=20000")) as CapDom[];
const domainRoles = (await pg("GET", "/domain_roles?select=id,record_status&limit=20000")) as DomainRole[];
const roleModules = (await pg("GET", "/role_modules?select=role_id,domain_module_id&limit=20000")) as RoleModule[];
const dmdo = (await pg("GET", "/domain_module_data_objects?select=domain_module_id,data_object_id,role,necessity&limit=30000")) as Dmdo[];
const dataObjects = (await pg("GET", "/data_objects?select=id,data_object_name,kind,entity_type&limit=20000")) as DataObject[];

// ---- indices ----
const doById = new Map<number, DataObject>(dataObjects.map((d) => [d.id, d]));
const moduleDomain = new Map<number, number | null>(modules.map((m) => [m.id, m.domain_id]));
const domainCodeById = new Map<number, string>(domains.map((d) => [d.id, d.domain_code]));
// bundle-domains master nothing; exclude them from triage (plan §4). Inert until §3.
const bundleDomainIds = new Set<number>(domains.filter((d) => (d as any).domain_kind === "bundle").map((d) => d.id));
const moduleCodeById = new Map<number, string>(modules.map((m) => [m.id, m.domain_module_code]));
// A persona is "live" unless its record_status marks it removed. Be permissive: only
// drop explicit archive/delete tombstones, count everything else (new/active/blank).
const liveRoleIds = new Set(
  domainRoles
    .filter((r) => !["archived", "deleted", "removed"].includes(String(r.record_status ?? "").toLowerCase()))
    .map((r) => r.id),
);

const moduleCountByDomain = new Map<number, number>();
for (const m of modules) {
  if (m.domain_id == null) continue;
  moduleCountByDomain.set(m.domain_id, (moduleCountByDomain.get(m.domain_id) ?? 0) + 1);
}

const capCountByDomain = new Map<number, number>();
for (const c of capDoms) capCountByDomain.set(c.domain_id, (capCountByDomain.get(c.domain_id) ?? 0) + 1);

// persona reach: domain_id -> set of distinct live role_ids reaching it via role_modules
const personaSetByDomain = new Map<number, Set<number>>();
for (const rm of roleModules) {
  if (!liveRoleIds.has(rm.role_id)) continue;
  const dom = moduleDomain.get(rm.domain_module_id);
  if (dom == null) continue;
  let s = personaSetByDomain.get(dom);
  if (!s) personaSetByDomain.set(dom, (s = new Set()));
  s.add(rm.role_id);
}

// master domains per data_object (which domains canonically master it, via dmdo role=master)
const masterDomainsByDO = new Map<number, Set<number>>();
for (const r of dmdo) {
  if (r.role !== "master") continue;
  const dom = moduleDomain.get(r.domain_module_id);
  if (dom == null) continue;
  let s = masterDomainsByDO.get(r.data_object_id);
  if (!s) masterDomainsByDO.set(r.data_object_id, (s = new Set()));
  s.add(dom);
}
// An entity mastered by >=2 distinct domains is treated as a shared master (master-data);
// pointing at it is not a self-containment violation. Reported separately for transparency.
const sharedMasterDOs = new Set<number>();
for (const [doId, doms] of masterDomainsByDO) if (doms.size >= 2) sharedMasterDOs.add(doId);

// embedded_master entities per domain (so an entity carried as a local shell is excluded)
const embeddedByDomain = new Map<number, Set<number>>();
for (const r of dmdo) {
  if (r.role !== "embedded_master") continue;
  const dom = moduleDomain.get(r.domain_module_id);
  if (dom == null) continue;
  let s = embeddedByDomain.get(dom);
  if (!s) embeddedByDomain.set(dom, (s = new Set()));
  s.add(r.data_object_id);
}

// per-domain dmdo rows
const dmdoByDomain = new Map<number, Dmdo[]>();
for (const r of dmdo) {
  const dom = moduleDomain.get(r.domain_module_id);
  if (dom == null) continue;
  let a = dmdoByDomain.get(dom);
  if (!a) dmdoByDomain.set(dom, (a = []));
  a.push(r);
}

// ---- per-domain derivation ----
type Verdict = "BUILD" | "MODULARIZE" | "VERIFY-SCOPE" | "PHASE-P" | "OK-PERSONAS";
type Record = {
  domain_code: string;
  domain_id: number;
  module_count: number;
  capability_count: number;
  persona_count: number;
  unclassified_masters: number;
  unclassified_master_names: string[];
  m9_shapes: number;
  m9_shared_excluded: number;
  m9_details: { entity: string; module: string; role: string; necessity: string | null; master_domains: string[] }[];
  verdict: Verdict;
  b1a_codes: string[];
};

const records: Record[] = [];

for (const d of domains) {
  if (bundleDomainIds.has(d.id)) continue; // exclude bundle-domains (plan §4)
  const module_count = moduleCountByDomain.get(d.id) ?? 0;
  const capability_count = capCountByDomain.get(d.id) ?? 0;
  const persona_count = personaSetByDomain.get(d.id)?.size ?? 0;
  const rows = dmdoByDomain.get(d.id) ?? [];
  const embedded = embeddedByDomain.get(d.id) ?? new Set<number>();

  // B13: distinct masters this domain owns whose entity_type is unclassified/null
  const masterDOIds = new Set<number>();
  for (const r of rows) if (r.role === "master") masterDOIds.add(r.data_object_id);
  const unclassified_master_names: string[] = [];
  for (const id of masterDOIds) {
    const obj = doById.get(id);
    const et = obj?.entity_type ?? null;
    if (et == null || et === "unclassified") unclassified_master_names.push(obj?.data_object_name ?? `#${id}`);
  }
  unclassified_master_names.sort();
  const unclassified_masters = unclassified_master_names.length;

  // M9 (entity layer): contributor / required-consumer rows pointing cross-domain,
  // not embedded here, not platform built-in, not a shared master.
  let m9_shared_excluded = 0;
  const m9_details: { entity: string; role: string; necessity: string | null; master_domains: string[] }[] = [];
  for (const r of rows) {
    const isContrib = r.role === "contributor";
    const isReqConsumer = r.role === "consumer" && r.necessity === "required";
    if (!isContrib && !isReqConsumer) continue;
    const obj = doById.get(r.data_object_id);
    if (!obj) continue;
    if (obj.kind === "platform_builtin") continue; // users etc. always present
    if (embedded.has(r.data_object_id)) continue; // local shell carried here
    const masters = masterDomainsByDO.get(r.data_object_id);
    const masteredCrossDomain = masters && [...masters].some((md) => md !== d.id);
    if (!masteredCrossDomain) continue; // self-mastered or unmastered -> not an M9 cross-dep
    if (sharedMasterDOs.has(r.data_object_id)) {
      m9_shared_excluded++;
      continue;
    }
    m9_details.push({
      entity: obj.data_object_name,
      module: moduleCodeById.get(r.domain_module_id) ?? `#${r.domain_module_id}`,
      role: r.role,
      necessity: r.necessity,
      master_domains: [...(masters ?? [])].map((md) => domainCodeById.get(md) ?? `#${md}`).sort(),
    });
  }
  m9_details.sort((a, b) => a.entity.localeCompare(b.entity) || a.module.localeCompare(b.module));
  const m9_shapes = m9_details.length;

  // verdict + b1a codes per the plan decision table
  let verdict: Verdict;
  const b1a_codes: string[] = [];
  if (module_count === 0) {
    verdict = "BUILD";
    b1a_codes.push("B1A-BUILD");
  } else if (module_count === 1 && capability_count >= 3) {
    verdict = "MODULARIZE";
    b1a_codes.push("B1A-MODULARIZE");
  } else if (module_count === 1) {
    verdict = "VERIFY-SCOPE";
    b1a_codes.push("B1A-VERIFY-SCOPE");
  } else if (persona_count === 0 && d.domain_code !== PERSONA_PILOT) {
    verdict = "PHASE-P";
    b1a_codes.push("B1A-PHASE-P");
  } else {
    verdict = "OK-PERSONAS";
  }

  // appends (any domain with modules): B13 + M9
  if (module_count > 0) {
    if (unclassified_masters > 0) b1a_codes.push("B1A-ENTITY-TYPE");
    if (m9_shapes > 0) b1a_codes.push("B1A-SELF-CONTAIN");
  }

  records.push({
    domain_code: d.domain_code,
    domain_id: d.id,
    module_count,
    capability_count,
    persona_count,
    unclassified_masters,
    unclassified_master_names,
    m9_shapes,
    m9_shared_excluded,
    m9_details,
    verdict,
    b1a_codes,
  });
}

// ---- output ----
const verdictOrder: Verdict[] = ["BUILD", "MODULARIZE", "PHASE-P", "VERIFY-SCOPE", "OK-PERSONAS"];
const vRank = (v: Verdict) => verdictOrder.indexOf(v);
records.sort((a, b) => vRank(a.verdict) - vRank(b.verdict) || a.domain_code.localeCompare(b.domain_code));

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const padL = (s: string | number, n: number) => String(s).padStart(n);
console.log(
  pad("DOMAIN", 22) + padL("mods", 5) + padL("caps", 5) + padL("pers", 5) +
    padL("uncl", 6) + padL("m9", 4) + "  " + pad("VERDICT", 13) + "B1A",
);
console.log("-".repeat(110));
for (const r of records) {
  console.log(
    pad(r.domain_code, 22) +
      padL(r.module_count, 5) + padL(r.capability_count, 5) + padL(r.persona_count, 5) +
      padL(r.unclassified_masters, 6) + padL(r.m9_shapes, 4) + "  " +
      pad(r.verdict, 13) + r.b1a_codes.join(", "),
  );
}

// summary
const byVerdict = new Map<Verdict, number>();
for (const r of records) byVerdict.set(r.verdict, (byVerdict.get(r.verdict) ?? 0) + 1);
const codeCount = new Map<string, number>();
for (const r of records) for (const c of r.b1a_codes) codeCount.set(c, (codeCount.get(c) ?? 0) + 1);
const touched = records.filter((r) => r.b1a_codes.length > 0).length;

console.log("\n=== summary ===");
console.log(`domains: ${records.length}`);
for (const v of verdictOrder) console.log(`  ${pad(v, 13)} ${byVerdict.get(v) ?? 0}`);
console.log(`\nb1a code totals:`);
for (const [c, n] of [...codeCount.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${pad(c, 18)} ${n}`);
console.log(`\ndomains needing state update (>=1 b1a): ${touched}`);
const totalShared = records.reduce((s, r) => s + r.m9_shared_excluded, 0);
console.log(`M9 shared-master rows excluded across catalog (transparency): ${totalShared}`);

mkdirSync(dirname(JSON_OUT), { recursive: true });
writeFileSync(JSON_OUT, JSON.stringify(records, null, 2), "utf8");
console.log(`\nJSON backlog written to ${JSON_OUT}`);
if (DUMP_JSON) console.log(JSON.stringify(records, null, 2));
