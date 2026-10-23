#!/usr/bin/env bun
// scripts/emit_domain_list.ts
//
// Emits catalog/domain-map/domain-list.json: one entry per domain or point solution that is
// offered as a standalone product by at least MIN_STANDALONE_VENDORS distinct vendors, shaped as a
// starter for a new blueprint build:
//
//   {
//     "name": "ATS",                       // domains.domain_code (the short name)
//     "title": "Applicant Tracking and Recruiting", // domains.domain_name
//     "tagline": "...",                    // domains.catalog_tagline ("" when not set)
//     "domain_class": "point_solution",    // "domain" (top-level market) | "point_solution" (child
//                                          //   market with its own parent_domain_id)
//     "prompt": "I need a system to hire faster ...", // domains.catalog_prompt (filled beforehand by
//                                          //   scripts/fill_catalog_prompts.ts from the tagline)
//     "department": ["Human Resources", "Recruiting"], // owner business function (business_function_domains)
//                                          //   as its path from the top-level function down
//     "industry": null,                    // domains.industry_id -> industries, as its path from the
//                                          //   top-level industry down, e.g. ["Agriculture, ...", "Crop Production"]
//     "entities": ["Job Requisition", ...],// top 10 data objects (domain_data_objects)
//     "vendors": ["Greenhouse", ...],      // top 10 vendors (solution_domains -> solutions -> vendors)
//     "semantius_score": 91,               // % handled by Semantius out of the box, or null
//     "semantius_agent_core": 98,          // + the agent itself and the customer's office suite, or null
//     "semantius_agent_first": 100,        // + agent-ready services that need a subscription, or null
//     "min_org_size": "s"                  // size key of domains.min_org_size ("20 s <500" -> "s"):
//                                          //   smallest realistic buyer by headcount (xs/s/m/l/xl)
//   }
//
// The three scores follow domain-map-analyst SKILL.md "Semantius score": the distinct tools over
// domain_module_tools of the domain's primary modules (domain_modules.domain_id), required and
// optional, whose tools.coverage_tier is covered, divided by all of those distinct tools.
// semantius_score covers every semantius* tier; semantius_agent_core adds agent_native +
// agent_common; semantius_agent_first adds agent_first. null when the modules carry no tools (audit band F3),
// never 0-of-0.
//
// Catalog-only: nothing is researched. Every value comes from the live domain_map module, so an
// entry with fewer than 10 vendors or entities reflects the catalog. Read-only: it never writes to
// the catalog. Empty catalog_prompt values are reported; fill them with scripts/fill_catalog_prompts.ts.
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
//   bun run scripts/emit_domain_list.ts              # write catalog/domain-map/domain-list.json (all entries)
//                                                    # plus domain-list-100.json (semantius_agent_first = 100)
//                                                    # and domain-list-others.json (the rest, incl. no score)
//                                                    # and domain-list-site.json (domains.site_catalog = true)
//   bun run scripts/emit_domain_list.ts --released   # only domains with a catalog_release date
//   bun run scripts/emit_domain_list.ts --out p.json # custom output path
//   bun run scripts/emit_domain_list.ts --stdout     # print the JSON, write no files

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

type Entry = {
  name: string;
  title: string;
  tagline: string;
  domain_class: "domain" | "point_solution";
  prompt: string;
  department: string[] | null;
  industry: string[] | null;
  entities: string[];
  vendors: string[];
  semantius_score: number | null;
  semantius_agent_core: number | null;
  semantius_agent_first: number | null;
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
      "/domains?select=id,domain_code,domain_name,catalog_tagline,domain_kind,catalog_release,catalog_prompt,parent_domain_id,industry_id,min_org_size,site_catalog,record_status&order=domain_code.asc&limit=10000",
    ),
    pg("GET", "/industries?select=id,industry_name,parent_industry_id&limit=10000"),
    pg("GET", "/business_functions?select=id,business_function_name,parent_business_function_id&limit=10000"),
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
    pg("GET", "/domain_module_tools?select=domain_module_id,tool_id,requirement_level&limit=50000"),
    pg("GET", "/tools?select=id,tool_name,coverage_tier&limit=20000"),
  ]);

const industryName = new Map<number, string>(industries.map((i: any) => [i.id, i.industry_name]));
const industryParent = new Map<number, number | null>(industries.map((i: any) => [i.id, i.parent_industry_id]));

// Path of an industry from its top-level ancestor down to itself.
function industryPath(id: number): string[] {
  const path: string[] = [];
  const seen = new Set<number>();
  for (let cur: number | null | undefined = id; cur != null && !seen.has(cur); cur = industryParent.get(cur)) {
    seen.add(cur);
    const name = industryName.get(cur);
    if (name) path.unshift(name);
  }
  return path;
}
const functionName = new Map<number, string>(functions.map((f: any) => [f.id, f.business_function_name]));
const functionParent = new Map<number, number | null>(functions.map((f: any) => [f.id, f.parent_business_function_id]));

// Path of a business function from its top-level ancestor down to itself.
function functionPath(id: number): string[] {
  const path: string[] = [];
  const seen = new Set<number>();
  for (let cur: number | null | undefined = id; cur != null && !seen.has(cur); cur = functionParent.get(cur)) {
    seen.add(cur);
    const name = functionName.get(cur);
    if (name) path.unshift(name);
  }
  return path;
}
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
const toolNameById = new Map<number, string>(tools.map((t: any) => [t.id, t.tool_name]));
const toolsByDomain = new Map<number, Set<number>>();
const toolLevelByDomain = new Map<number, Map<number, string>>(); // required wins over optional
for (const r of dmtRows) {
  const domainId = primaryModuleDomain.get(r.domain_module_id);
  if (domainId == null) continue;
  if (!toolsByDomain.has(domainId)) toolsByDomain.set(domainId, new Set());
  toolsByDomain.get(domainId)!.add(r.tool_id);
  if (!toolLevelByDomain.has(domainId)) toolLevelByDomain.set(domainId, new Map());
  const levels = toolLevelByDomain.get(domainId)!;
  if (levels.get(r.tool_id) !== "required") levels.set(r.tool_id, r.requirement_level);
}

// semantius_score covers every semantius* tier (semantius_crud / _workflow / _platform);
// each later score adds its agent tiers.
const isSemantius = (tier: string) => tier.startsWith("semantius");
const AGENT_CORE_TIERS = new Set(["agent_native", "agent_common"]);
const AGENT_FIRST_TIERS = new Set([...AGENT_CORE_TIERS, "agent_first"]);
const SEMANTIUS_ONLY = new Set<string>();

function coverageScore(domainId: number, agentTiers: Set<string>): number | null {
  const toolIds = [...(toolsByDomain.get(domainId) ?? [])];
  if (!toolIds.length) return null;
  const hits = toolIds.filter((id) => {
    const tier = toolTier.get(id) ?? "";
    return isSemantius(tier) || agentTiers.has(tier);
  }).length;
  return Math.round((hits / toolIds.length) * 100);
}

// Tools keeping semantius_agent_first below 100: every tier none of the scores covers.
function scoreGaps(domainId: number): { tool: string; tier: string; requirement: string }[] {
  const levels = toolLevelByDomain.get(domainId) ?? new Map<number, string>();
  return [...(toolsByDomain.get(domainId) ?? [])]
    .filter((id) => {
      const tier = toolTier.get(id) ?? "";
      return !isSemantius(tier) && !AGENT_FIRST_TIERS.has(tier);
    })
    .map((id) => ({ tool: toolNameById.get(id) ?? `#${id}`, tier: toolTier.get(id) ?? "", requirement: levels.get(id) ?? "" }))
    .sort((a, b) => a.tier.localeCompare(b.tier) || a.tool.localeCompare(b.tool));
}

// ---------- build ----------

const entries: Entry[] = [];
const tooFewVendors: string[] = [];
const noDepartmentOrIndustry: string[] = [];
const multiOwner: string[] = [];
const thinEntities: string[] = [];
const noScore: string[] = [];
const noPrompt: string[] = []; // catalog_prompt empty: run scripts/fill_catalog_prompts.ts first

for (const d of domains) {
  if (d.record_status === "rejected") continue;
  if (RELEASED && !isDomainReleased(d)) continue;

  const coverage = vendorCoverageByDomain.get(d.id) ?? new Map<number, { rank: number; firstId: number }>();
  const standaloneVendors = [...coverage.values()].filter((c) => c.rank === COVERAGE_RANK.primary).length;
  if (standaloneVendors < MIN_STANDALONE_VENDORS) {
    tooFewVendors.push(`${d.domain_code} (${standaloneVendors} primary vendor${standaloneVendors === 1 ? "" : "s"})`);
    continue;
  }

  const ownerIds = (ownersByDomain.get(d.id) ?? [])
    .filter((id) => functionName.has(id))
    .sort((a, b) => functionName.get(a)!.localeCompare(functionName.get(b)!));
  const ownerNames = ownerIds.map((id) => functionName.get(id)!);
  if (ownerNames.length > 1) multiOwner.push(`${d.domain_code}: picked ${ownerNames[0]} of ${ownerNames.join(", ")}`);
  const department = ownerIds.length ? functionPath(ownerIds[0]) : null;
  const industry = d.industry_id != null && industryName.has(d.industry_id) ? industryPath(d.industry_id) : null;
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
  const prompt: string = d.catalog_prompt?.trim() ?? "";
  if (!prompt) noPrompt.push(d.domain_code);
  entries.push({
    name: d.domain_code,
    title: d.domain_name ?? "",
    tagline: d.catalog_tagline?.trim() ?? "",
    domain_class: isPointSolution ? "point_solution" : "domain",
    prompt,
    department,
    industry,
    entities: entityObjects.map((o) => o.singular_label),
    vendors: vendorList,
    semantius_score: coverageScore(d.id, SEMANTIUS_ONLY),
    semantius_agent_core: coverageScore(d.id, AGENT_CORE_TIERS),
    semantius_agent_first: coverageScore(d.id, AGENT_FIRST_TIERS),
    min_org_size: d.min_org_size ? d.min_org_size.split(/\s+/)[1] : null,
  });
  if (entries[entries.length - 1].semantius_score === null) noScore.push(d.domain_code);
}

// Order: by department; entries without a department go last, ordered by industry. Ties by name.
// Sorted after building so each prompt's "Build me" / "I need" opener stays stable.
entries.sort(
  (a, b) =>
    Number(a.department === null) - Number(b.department === null) ||
    (a.department?.join(" / ") ?? a.industry?.join(" / ") ?? "").localeCompare(b.department?.join(" / ") ?? b.industry?.join(" / ") ?? "") ||
    a.name.localeCompare(b.name),
);

// Project rule: em-dashes are forbidden in every emitted artifact.
const toJson = (list: object[]) => JSON.stringify(list, null, 2).replace(/\u2014/g, "-") + "\n";
const json = toJson(entries);
// Split files next to the main one: fully reachable with agent-ready services vs the rest
// (including entries without a score).
const full = entries.filter((e) => e.semantius_agent_first === 100);
// The site file lists the entries whose domain is flagged domains.site_catalog (maintained by hand).
const siteCodes = new Set<string>(domains.filter((d: any) => d.site_catalog === true).map((d: any) => d.domain_code));
const site = entries.filter((e) => siteCodes.has(e.name));
const siteMissing = [...siteCodes].filter((c) => !site.some((e) => e.name === c)).sort();
// The others file also names every tool holding semantius_agent_first below 100 (null = no tools).
const domainIdByCode = new Map<string, number>(domains.map((d: any) => [d.domain_code, d.id]));
const others = entries
  .filter((e) => e.semantius_agent_first !== 100)
  .map((e) => ({ ...e, score_gaps: e.semantius_agent_first === null ? null : scoreGaps(domainIdByCode.get(e.name)!) }));

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
report("site_catalog = true but not in the list (filtered out above)", siteMissing);
report("Empty catalog_prompt (run scripts/fill_catalog_prompts.ts before exporting)", noPrompt);

if (STDOUT) {
  process.stdout.write(json);
} else {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, json, "utf8");
  console.error(`\nwrote ${OUT_PATH} (${entries.length})`);
  for (const [suffix, list] of [["-100", full], ["-others", others], ["-site", site]] as const) {
    const path = OUT_PATH.replace(/\.json$/, `${suffix}.json`);
    writeFileSync(path, toJson(list), "utf8");
    console.error(`wrote ${path} (${list.length})`);
  }
}
