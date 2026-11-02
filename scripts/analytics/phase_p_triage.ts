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
 * The rules are the shared health logic, so this triage and domain_health.ts cannot drift:
 * persona reach + the verdict table (logic_cefh.ts domainPersonas / phasePVerdict; the ATS
 * pilot override stays here), B13 (logic_b.ts isUnclassified) and the M9 entity layer
 * (logic_sam.ts entitySelfContainment with this triage's domain-wide scope).
 *
 * Usage (from project root):
 *   bun run scripts/analytics/phase_p_triage.ts            # table + summary + JSON file
 *   bun run scripts/analytics/phase_p_triage.ts --json     # also dump JSON to stdout
 */
export {};
import { pg } from "../lib/catalog.ts";
import { isUnclassified } from "../lib/health/logic_b.ts";
import { domainPersonas, phasePVerdict, type PhasePVerdict } from "../lib/health/logic_cefh.ts";
import { entitySelfContainment } from "../lib/health/logic_sam.ts";
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
type DomainRole = { id: number; business_function_id: number | null; record_status: string | null };
type RoleModule = { role_id: number; domain_module_id: number };
type Dmdo = { domain_module_id: number; data_object_id: number; role: string; necessity: string | null };
type DataObject = { id: number; data_object_name: string; kind: string; entity_type: string | null };

// Fetch sequentially: each pg() spawns a fresh `semantius` CLI process with its own MCP
// connection, and firing them concurrently intermittently times out the server. One at a
// time is slower but reliable for a read-only triage.
const domains = (await pg("GET", "/domains?select=id,domain_code,domain_name,domain_kind&order=domain_code.asc&limit=10000")) as Domain[];
const modules = (await pg("GET", "/domain_modules?select=id,domain_module_code,domain_id&limit=10000")) as Module[];
const capDoms = (await pg("GET", "/capability_domains?select=domain_id&limit=20000")) as CapDom[];
const domainRoles = (await pg("GET", "/domain_roles?select=id,business_function_id,record_status&limit=20000")) as DomainRole[];
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

// domain_id -> its module ids (module_count, and the persona-reach scope)
const moduleIdsByDomain = new Map<number, number[]>();
for (const m of modules) {
  if (m.domain_id == null) continue;
  let a = moduleIdsByDomain.get(m.domain_id);
  if (!a) moduleIdsByDomain.set(m.domain_id, (a = []));
  a.push(m.id);
}

const capCountByDomain = new Map<number, number>();
for (const c of capDoms) capCountByDomain.set(c.domain_id, (capCountByDomain.get(c.domain_id) ?? 0) + 1);

// M9 catalog lookups for entitySelfContainment: the modules holding each entity's master row,
// and each data_object's kind (platform built-ins are always present, never a dependency).
const masterModulesByDO = new Map<number, number[]>();
for (const r of dmdo) {
  if (r.role !== "master") continue;
  let a = masterModulesByDO.get(r.data_object_id);
  if (!a) masterModulesByDO.set(r.data_object_id, (a = []));
  a.push(r.domain_module_id);
}
const kindById = new Map<number, string>(dataObjects.map((d) => [d.id, d.kind]));
const selfContainmentCatalog = { masterModulesByDataObject: masterModulesByDO, moduleDomain, kindById };

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
type Verdict = PhasePVerdict; // BUILD | MODULARIZE | VERIFY-SCOPE | PHASE-P | OK-PERSONAS
const VERDICT_B1A: Partial<{ [V in Verdict]: string }> = {
  BUILD: "B1A-BUILD",
  MODULARIZE: "B1A-MODULARIZE",
  "VERIFY-SCOPE": "B1A-VERIFY-SCOPE",
  "PHASE-P": "B1A-PHASE-P",
};
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
  const moduleIds = moduleIdsByDomain.get(d.id) ?? [];
  const module_count = moduleIds.length;
  const capability_count = capCountByDomain.get(d.id) ?? 0;
  // persona reach (logic_cefh.ts domainPersonas): distinct live personas with a role_modules row
  // on one of this domain's modules. No owning functions are passed: only the reach half counts.
  const persona_count = domainPersonas({ moduleIds, ownerFunctionIds: [], personas: domainRoles, roleModules }).reach.length;
  const rows = dmdoByDomain.get(d.id) ?? [];

  // B13: distinct masters this domain owns whose entity_type is unclassified/null (logic_b.ts)
  const masterDOIds = new Set<number>();
  for (const r of rows) if (r.role === "master") masterDOIds.add(r.data_object_id);
  const unclassified_master_names: string[] = [];
  for (const id of masterDOIds) {
    const obj = doById.get(id);
    if (isUnclassified(obj?.entity_type)) unclassified_master_names.push(obj?.data_object_name ?? `#${id}`);
  }
  unclassified_master_names.sort();
  const unclassified_masters = unclassified_master_names.length;

  // M9 (entity layer, logic_sam.ts entitySelfContainment): contributor / required-consumer rows
  // pointing at an entity mastered by ANOTHER domain (crossDomainOnly), not embedded anywhere in
  // this domain (embeddedScope "domain"), not a platform built-in, not a shared master (mastered
  // by >= 2 domains; counted in sharedExcluded for transparency).
  const m9 = entitySelfContainment(rows, selfContainmentCatalog, { embeddedScope: "domain", crossDomainOnly: true });
  const m9_shared_excluded = m9.sharedExcluded;
  const m9_details: { entity: string; module: string; role: string; necessity: string | null; master_domains: string[] }[] = m9.violations.map((v) => ({
    entity: doById.get(v.row.data_object_id)?.data_object_name ?? `#${v.row.data_object_id}`,
    module: moduleCodeById.get(v.row.domain_module_id) ?? `#${v.row.domain_module_id}`,
    role: v.row.role,
    necessity: v.row.necessity ?? null,
    // not a shared master, so the owning domain is the entity's only master domain
    master_domains: v.ownerDomainIds.map((md) => domainCodeById.get(md) ?? `#${md}`).sort(),
  }));
  m9_details.sort((a, b) => a.entity.localeCompare(b.entity) || a.module.localeCompare(b.module));
  const m9_shapes = m9_details.length;

  // verdict + b1a codes per the plan decision table (logic_cefh.ts phasePVerdict). The ATS
  // persona pilot never accrues B1A-PHASE-P.
  let verdict: Verdict = phasePVerdict(module_count, capability_count, persona_count);
  if (verdict === "PHASE-P" && d.domain_code === PERSONA_PILOT) verdict = "OK-PERSONAS";
  const b1a_codes: string[] = [];
  const verdictCode = VERDICT_B1A[verdict];
  if (verdictCode) b1a_codes.push(verdictCode);

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
