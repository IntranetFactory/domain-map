#!/usr/bin/env bun
// scripts/emit_domain_list.ts
//
// Emits catalog/domain-map/domain-list.json: one entry per domain or point solution that is
// offered as a standalone product by at least MIN_STANDALONE_VENDORS distinct vendors, shaped as a
// starter for a new blueprint build:
//
//   {
//     "name": "ATS",                       // domains.domain_code (the short name)
//     "domain_class": "point_solution",    // "domain" (top-level market) | "point_solution" (child
//                                          //   market with its own parent_domain_id)
//     "prompt": "Build me an applicant tracking system to manage ...",
//     "department": "Talent Acquisition",  // the owner business function (business_function_domains)
//     "industry": null,                    // domains.industry_id -> industries.industry_name
//     "entities": ["Job Requisition", ...],// top 10 data objects (domain_data_objects)
//     "vendors": ["Greenhouse", ...],      // top 10 vendors (solution_domains -> solutions -> vendors)
//     "semantius_score": 93,               // strict Semantius score, integer percent, or null
//     "min_org_size": "s"                  // size key of domains.min_org_size ("20 s <500" -> "s"):
//                                          //   smallest realistic buyer by headcount (xs/s/m/l/xl)
//   }
//
// semantius_score follows domain-map-analyst SKILL.md "Semantius score" (strict_score): distinct
// tools over domain_module_tools of the domain's primary modules (domain_modules.domain_id) with
// tools.coverage_tier='platform', divided by all of those distinct tools (required and optional).
// null when the modules carry no tools (audit band F3), never 0-of-0.
//
// Catalog-only: nothing is researched or written back. Every value comes from the live
// domain_map module, so an entry with fewer than 10 vendors or entities reflects the catalog.
//
// Standalone test: a vendor counts toward MIN_STANDALONE_VENDORS only through an active
// (is_active_in_market) solution with coverage_level='primary' on the domain. Bundles have no
// vendors and so never qualify.
//
// department and industry are and/or, but at least one is required. A qualifying domain with
// neither (no owner function, no industry_id) is left out and reported as a catalog gap.
//
// Ranking:
//   entities: drawn from the domain's full modules (domain_module_data_objects) unioned with the
//             domain_data_objects rollup, strongest role per data object winning. Ordered by
//             role (master > embedded_master > contributor > derived; consumer and platform
//             built-ins like users are skipped), then required before optional, then the number of
//             data_object_relationships edges (most connected first), then label.
//   vendors:  best coverage_level on the domain (primary > secondary > partial), then load order
//             (lowest solution_domains id per vendor: research lists market leaders first), then name.
//
// Usage:
//   bun run scripts/emit_domain_list.ts              # write catalog/domain-map/domain-list.json (all domains)
//   bun run scripts/emit_domain_list.ts --released   # only domains with a catalog_release date
//   bun run scripts/emit_domain_list.ts --out p.json # custom output path
//   bun run scripts/emit_domain_list.ts --stdout     # print the JSON, write nothing

export {};

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { argv } from "node:process";
import { isDomainReleased, pg } from "./lib/catalog";

const args = argv.slice(2);
function flagValue(name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const STDOUT = args.includes("--stdout");
const RELEASED = args.includes("--released");
const OUT_PATH = flagValue("--out") ?? "c:/dev/domain-map/catalog/domain-map/domain-list.json";

const MIN_STANDALONE_VENDORS = 2;
const TOP_N = 10;
const PROMPT_ENTITY_COUNT = 3;

type Entry = {
  name: string;
  domain_class: "domain" | "point_solution";
  prompt: string;
  department: string | null;
  industry: string | null;
  entities: string[];
  vendors: string[];
  semantius_score: number | null;
  min_org_size: string | null;
};

const ENTITY_ROLE_RANK: Record<string, number> = { master: 0, embedded_master: 1, contributor: 2, derived: 3 };
const COVERAGE_RANK: Record<string, number> = { primary: 0, secondary: 1, partial: 2 };

// ---------- load ----------

const [
  domains,
  industries,
  functions,
  ownerRows,
  ddoRows,
  modules,
  dmdoRows,
  dataObjects,
  relRows,
  sdRows,
  vendors,
  primaryModules,
  dmtRows,
  tools,
] = await Promise.all([
    pg(
      "GET",
      "/domains?select=id,domain_code,domain_name,domain_kind,catalog_release,parent_domain_id,industry_id,min_org_size,record_status&order=domain_code.asc&limit=10000",
    ),
    pg("GET", "/industries?select=id,industry_name&limit=10000"),
    pg("GET", "/business_functions?select=id,business_function_name&limit=10000"),
    pg(
      "GET",
      "/business_function_domains?select=domain_id,business_function_id&responsibility_type=eq.owner&record_status=neq.rejected&limit=20000",
    ),
    pg(
      "GET",
      "/domain_data_objects?select=domain_id,data_object_id,role,necessity&record_status=neq.rejected&limit=50000",
    ),
    pg("GET", "/domain_modules?select=id,domain_id&module_kind=eq.full&record_status=neq.rejected&limit=10000"),
    pg(
      "GET",
      "/domain_module_data_objects?select=domain_module_id,data_object_id,role,necessity&limit=50000",
    ),
    pg("GET", "/data_objects?select=id,singular_label,plural_label,kind&limit=10000"),
    pg("GET", "/data_object_relationships?select=data_object_id,related_data_object_id&limit=50000"),
    pg(
      "GET",
      "/solution_domains?select=id,domain_id,coverage_level,solutions(vendor_id,is_active_in_market)&record_status=neq.rejected&limit=50000",
    ),
    pg("GET", "/vendors?select=id,vendor_name&limit=20000"),
    pg("GET", "/domain_modules?select=id,domain_id&limit=10000"),
    pg("GET", "/domain_module_tools?select=domain_module_id,tool_id&limit=50000"),
    pg("GET", "/tools?select=id,coverage_tier&limit=20000"),
  ]);

const industryName = new Map<number, string>(industries.map((i: any) => [i.id, i.industry_name]));
const functionName = new Map<number, string>(functions.map((f: any) => [f.id, f.business_function_name]));
const vendorName = new Map<number, string>(vendors.map((v: any) => [v.id, v.vendor_name]));
const dataObjectById = new Map<number, any>(dataObjects.map((o: any) => [o.id, o]));
const liveDomainIds = new Set<number>(domains.filter((d: any) => d.record_status !== "rejected").map((d: any) => d.id));

const ownersByDomain = new Map<number, number[]>();
for (const r of ownerRows) {
  if (!ownersByDomain.has(r.domain_id)) ownersByDomain.set(r.domain_id, []);
  ownersByDomain.get(r.domain_id)!.push(r.business_function_id);
}

const degree = new Map<number, number>();
for (const r of relRows) {
  for (const id of [r.data_object_id, r.related_data_object_id]) degree.set(id, (degree.get(id) ?? 0) + 1);
}

// Per domain: data_object_id -> strongest { role, necessity } across the rollup and its full modules.
const moduleDomain = new Map<number, number>(modules.filter((m: any) => m.domain_id != null).map((m: any) => [m.id, m.domain_id]));
const scopeByDomain = new Map<number, Map<number, { role: string; necessity: string }>>();
function addScope(domainId: number | undefined, r: any) {
  if (domainId == null) return;
  if (!scopeByDomain.has(domainId)) scopeByDomain.set(domainId, new Map());
  const scope = scopeByDomain.get(domainId)!;
  const prev = scope.get(r.data_object_id);
  const rank = (x: { role: string; necessity: string }) =>
    (ENTITY_ROLE_RANK[x.role] ?? 9) * 2 + Number(x.necessity === "optional");
  if (!prev || rank(r) < rank(prev)) scope.set(r.data_object_id, { role: r.role, necessity: r.necessity });
}
for (const r of ddoRows) addScope(r.domain_id, r);
for (const r of dmdoRows) addScope(moduleDomain.get(r.domain_module_id), r);

// Per domain: vendor_id -> best coverage rank and first load order (active solutions only).
const vendorCoverageByDomain = new Map<number, Map<number, { rank: number; firstId: number }>>();
for (const r of sdRows) {
  const vendorId = r.solutions?.vendor_id;
  if (vendorId == null || r.solutions?.is_active_in_market === false) continue;
  const rank = COVERAGE_RANK[r.coverage_level] ?? 9;
  if (!vendorCoverageByDomain.has(r.domain_id)) vendorCoverageByDomain.set(r.domain_id, new Map());
  const m = vendorCoverageByDomain.get(r.domain_id)!;
  const prev = m.get(vendorId);
  m.set(vendorId, { rank: Math.min(prev?.rank ?? 9, rank), firstId: Math.min(prev?.firstId ?? Infinity, r.id) });
}

// Per domain: distinct tools across its primary modules (any module_kind homed on it).
const primaryModuleDomain = new Map<number, number>(
  primaryModules.filter((m: any) => m.domain_id != null).map((m: any) => [m.id, m.domain_id]),
);
const toolTier = new Map<number, string>(tools.map((t: any) => [t.id, t.coverage_tier]));
const toolsByDomain = new Map<number, Set<number>>();
for (const r of dmtRows) {
  const domainId = primaryModuleDomain.get(r.domain_module_id);
  if (domainId == null) continue;
  if (!toolsByDomain.has(domainId)) toolsByDomain.set(domainId, new Set());
  toolsByDomain.get(domainId)!.add(r.tool_id);
}

function semantiusScore(domainId: number): number | null {
  const toolIds = [...(toolsByDomain.get(domainId) ?? [])];
  if (!toolIds.length) return null;
  const platform = toolIds.filter((id) => toolTier.get(id) === "platform").length;
  return Math.round((platform / toolIds.length) * 100);
}

// ---------- prompt ----------

// Lowercase title-cased words for mid-sentence use, keep acronyms and mixed case
// ("SLA Policies" -> "SLA policies", "AIOps" and "PaaS" unchanged, "Account-Based" -> "account-based").
function sentenceCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) =>
      w
        .split("-")
        .map((part) => (/[A-Z]/.test(part.slice(1)) ? part : part.toLowerCase()))
        .join("-"),
    )
    .join(" ");
}

function article(phrase: string): string {
  if (/\bsoftware$/i.test(phrase)) return ""; // uncountable: "Build me agency management software"
  const first = phrase.split(/\s+/)[0] ?? "";
  if (first.length > 1 && first === first.toUpperCase()) return /^[AEFHILMNORSX]/.test(first) ? "an" : "a";
  if (/^(uni|use|usa|eu)/i.test(first)) return "a";
  return /^[aeiou]/i.test(first) ? "an" : "a";
}

function joinList(items: string[]): string {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const SELF_NAMED_PRODUCT = /\b(system|systems|platform|software|suite|tool|engine|hub|portal|desk)$/i;

function buildPrompt(domainName: string, entityPlurals: string[], index: number): string {
  const opener = index % 2 === 0 ? "Build me" : "I need";
  const base = sentenceCase(domainName.replace(/\s*\(.*?\)\s*/g, " ").trim());
  const product = SELF_NAMED_PRODUCT.test(base) ? base : `${base} system`;
  const manage = entityPlurals.length ? ` to manage ${joinList(entityPlurals.map(sentenceCase))}` : "";
  return `${opener} ${[article(product), product].filter(Boolean).join(" ")}${manage}.`;
}

// ---------- build ----------

const entries: Entry[] = [];
const tooFewVendors: string[] = [];
const noDepartmentOrIndustry: string[] = [];
const multiOwner: string[] = [];
const thinEntities: string[] = [];
const noScore: string[] = [];

for (const d of domains) {
  if (d.record_status === "rejected") continue;
  if (RELEASED && !isDomainReleased(d)) continue;

  const coverage = vendorCoverageByDomain.get(d.id) ?? new Map<number, { rank: number; firstId: number }>();
  const standaloneVendors = [...coverage.values()].filter((c) => c.rank === COVERAGE_RANK.primary).length;
  if (standaloneVendors < MIN_STANDALONE_VENDORS) {
    tooFewVendors.push(`${d.domain_code} (${standaloneVendors} primary vendor${standaloneVendors === 1 ? "" : "s"})`);
    continue;
  }

  const ownerNames = (ownersByDomain.get(d.id) ?? [])
    .map((id) => functionName.get(id))
    .filter((n): n is string => !!n)
    .sort();
  if (ownerNames.length > 1) multiOwner.push(`${d.domain_code}: picked ${ownerNames[0]} of ${ownerNames.join(", ")}`);
  const department = ownerNames[0] ?? null;
  const industry = d.industry_id != null ? (industryName.get(d.industry_id) ?? null) : null;
  if (!department && !industry) {
    noDepartmentOrIndustry.push(d.domain_code);
    continue;
  }

  const entityObjects = [...(scopeByDomain.get(d.id) ?? new Map()).entries()]
    .filter(([, r]) => r.role in ENTITY_ROLE_RANK)
    .map(([id, r]) => ({ r, o: dataObjectById.get(id) }))
    .filter(({ o }) => o && o.kind !== "platform_builtin")
    .sort(
      (a, b) =>
        ENTITY_ROLE_RANK[a.r.role] - ENTITY_ROLE_RANK[b.r.role] ||
        Number(a.r.necessity === "optional") - Number(b.r.necessity === "optional") ||
        (degree.get(b.o.id) ?? 0) - (degree.get(a.o.id) ?? 0) ||
        a.o.singular_label.localeCompare(b.o.singular_label),
    )
    .slice(0, TOP_N)
    .map(({ o }) => o);
  if (entityObjects.length < TOP_N) thinEntities.push(`${d.domain_code} (${entityObjects.length})`);

  const vendorList = [...coverage.entries()]
    .sort(
      ([va, ca], [vb, cb]) =>
        ca.rank - cb.rank ||
        ca.firstId - cb.firstId ||
        (vendorName.get(va) ?? "").localeCompare(vendorName.get(vb) ?? ""),
    )
    .slice(0, TOP_N)
    .map(([v]) => vendorName.get(v))
    .filter((n): n is string => !!n);

  const isPointSolution = d.parent_domain_id != null && liveDomainIds.has(d.parent_domain_id);
  entries.push({
    name: d.domain_code,
    domain_class: isPointSolution ? "point_solution" : "domain",
    prompt: buildPrompt(
      d.domain_name,
      entityObjects.slice(0, PROMPT_ENTITY_COUNT).map((o) => o.plural_label),
      entries.length,
    ),
    department,
    industry,
    entities: entityObjects.map((o) => o.singular_label),
    vendors: vendorList,
    semantius_score: semantiusScore(d.id),
    min_org_size: d.min_org_size ? d.min_org_size.split(/\s+/)[1] : null,
  });
  if (entries[entries.length - 1].semantius_score === null) noScore.push(d.domain_code);
}

// Order: by department; entries without a department go last, ordered by industry. Ties by name.
// Sorted after building so each prompt's "Build me" / "I need" opener stays stable.
entries.sort(
  (a, b) =>
    Number(a.department === null) - Number(b.department === null) ||
    (a.department ?? a.industry ?? "").localeCompare(b.department ?? b.industry ?? "") ||
    a.name.localeCompare(b.name),
);

// Project rule: em-dashes are forbidden in every emitted artifact.
const json = JSON.stringify(entries, null, 2).replace(/\u2014/g, "-") + "\n";

// ---------- report ----------

function report(label: string, items: string[]) {
  if (!items.length) return;
  console.error(`\n${label} (${items.length}):`);
  for (const i of items) console.error(`  - ${i}`);
}
const pointSolutions = entries.filter((e) => e.domain_class === "point_solution").length;
console.error(
  `${entries.length} entries (${entries.length - pointSolutions} domain, ${pointSolutions} point_solution)` +
    `${RELEASED ? " [released only]" : ""}; ` +
    `${entries.filter((e) => e.vendors.length < TOP_N).length} with fewer than ${TOP_N} vendors`,
);
report(`Skipped: fewer than ${MIN_STANDALONE_VENDORS} standalone (primary) vendors`, tooFewVendors);
report("Skipped: no owner department and no industry (catalog gap)", noDepartmentOrIndustry);
report("Multiple owner functions (first alphabetically kept)", multiOwner);
report(`Fewer than ${TOP_N} entities`, thinEntities);
report("No Semantius score: modules carry no domain_module_tools (band F3)", noScore);

if (STDOUT) {
  process.stdout.write(json);
} else {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, json, "utf8");
  console.error(`\nwrote ${OUT_PATH}`);
}
