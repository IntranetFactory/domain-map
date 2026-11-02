// Tests for scripts/lib/health/logic_sam.ts: the S, A and M band pass rules of domain_health.ts,
// one block per check on tiny literal rows. Pure, offline: no catalog, no cache file.

import { describe, expect, test } from "bun:test";
import {
  checkCapabilitiesRealized,
  checkCapabilityFloor,
  checkDirectFkCoverage,
  checkDomainCatalogCopy,
  checkDomainMetadata,
  checkGateRealizers,
  checkMasterCoverage,
  checkModuleCatalogCopy,
  checkModuleCoverage,
  checkModulePresence,
  checkModulesRealizeCapabilities,
  checkModuleSplit,
  checkSelfContainment,
  checkSingleMaster,
  checkSolutionCoverage,
  classifyRequiredEdgeTargets,
  domainMetadataGaps,
  entitySelfContainment,
  relationshipSelfContainment,
  type DirectFkCount,
  type DmdoRow,
  type ModuleLite,
  type RelationshipLite,
} from "../health/logic_sam.ts";
import type { Finding } from "../health/types.ts";

// "result:rows" per finding, the shape every assertion compares.
const shape = (fs: Finding[]) => fs.map((f) => `${f.result}:${(f.rows ?? []).join(",")}`);
const results = (fs: Finding[]) => fs.map((f) => f.result);

const mod = (id: number, over: Partial<ModuleLite> = {}): ModuleLite => ({
  id,
  domain_module_code: `MOD-${id}`,
  module_kind: "full",
  catalog_tagline: "Run the thing.",
  catalog_description: "Teams run the thing end to end.",
  ...over,
});

// ---------------------------------------------------------------- S band

describe("S1 direct FKs to domains", () => {
  const fk = (table: string, field: string, count: number | null, over: Partial<DirectFkCount> = {}): DirectFkCount => ({ table_name: table, field_name: field, count, ...over });
  const healthy = [
    fk("business_function_domains", "domain_id", 2),
    fk("capability_domains", "domain_id", 5),
    fk("domain_data_objects", "domain_id", 0),
    fk("domain_modules", "domain_id", 2),
    fk("domain_regulations", "domain_id", 1),
    fk("domains", "parent_domain_id", 0),
    fk("handoffs", "source_domain_id", 4),
    fk("handoffs", "target_domain_id", 3),
    fk("skills", "domain_id", 1, { domainSkills: 1 }),
    fk("solution_domains", "domain_id", 6),
  ];
  test("healthy counts pass; retired / routinely-zero pairs are informational", () => {
    expect(shape(checkDirectFkCoverage(healthy, "established_market"))).toEqual(["pass:"]);
  });
  test("zero on an always-non-zero pair fails, zero on a when-applicable pair warns", () => {
    const counts = healthy.map((c) =>
      c.table_name === "capability_domains" || (c.table_name === "handoffs" && c.field_name === "target_domain_id") ? { ...c, count: 0 } : c,
    );
    expect(shape(checkDirectFkCoverage(counts, "established_market"))).toEqual([
      "fail:capability_domains.domain_id",
      "warn:handoffs.target_domain_id",
      "pass:",
    ]);
  });
  test("skills needs exactly one domain-grain skill, bundles included", () => {
    const two = healthy.map((c) => (c.table_name === "skills" ? { ...c, count: 3, domainSkills: 2 } : c));
    expect(shape(checkDirectFkCoverage(two, "bundle"))).toEqual(["fail:skills.domain_id", "pass:"]);
  });
  test("a bundle is exempt from the capability and solution floors", () => {
    const counts = healthy.map((c) => (["capability_domains", "solution_domains", "handoffs"].includes(c.table_name) ? { ...c, count: 0 } : c));
    expect(shape(checkDirectFkCoverage(counts, "bundle"))).toEqual(["pass:"]);
  });
  test("an unreadable table warns instead of erroring the check", () => {
    const counts = [...healthy, fk("domain_aliases", "domain_id", null, { error: "404" })];
    expect(shape(checkDirectFkCoverage(counts, "established_market"))).toEqual(["warn:domain_aliases.domain_id", "pass:"]);
  });
});

describe("S2 per-module coverage", () => {
  test("zero dmdo fails, zero capabilities fails on full and warns on a starter", () => {
    const modules = [mod(1), mod(2), mod(3, { module_kind: "starter" }), mod(4)];
    const dmdo = new Map([[1, 4], [2, 0], [3, 2], [4, 3]]);
    const dmc = new Map([[1, 2], [2, 1], [3, 0]]);
    expect(shape(checkModuleCoverage(modules, dmdo, dmc))).toEqual(["fail:2", "fail:4", "warn:3", "pass:"]);
  });
  test("every module with rows in both tables passes", () => {
    expect(shape(checkModuleCoverage([mod(1)], new Map([[1, 1]]), new Map([[1, 1]])))).toEqual(["pass:"]);
  });
});

describe("S3 per-master coverage", () => {
  test("all-zero master, stateless workflow master and eventless state machine each warn", () => {
    const rows = [
      { data_object_id: 10, entity_type: "operational_record", states: 0, events: 0, aliases: 0 },
      { data_object_id: 11, entity_type: "operational_workflow", states: 0, events: 1, aliases: 1 },
      { data_object_id: 12, entity_type: "operational_workflow", states: 3, events: 0, aliases: 1 },
      { data_object_id: 13, entity_type: "operational_workflow", states: 3, events: 2, aliases: 0 },
    ];
    expect(shape(checkMasterCoverage(rows))).toEqual(["warn:10", "warn:11", "warn:12", "pass:"]);
  });
  test("zero aliases alone is the B11 judgment, not an S3 warning", () => {
    expect(results(checkMasterCoverage([{ data_object_id: 1, entity_type: "catalog", states: 0, events: 1, aliases: 0 }]))).toEqual(["pass"]);
  });
});

// ---------------------------------------------------------------- A band

describe("A1 business metadata", () => {
  const full = {
    domain_kind: "established_market",
    crud_percentage: 70,
    business_logic: "Scoring and routing.",
    min_org_size: "50",
    cost_band: "mid",
    certification_required: false,
    usa_market_size_usd_m: 1200,
    market_size_source_year: 2025,
  };
  test("all seven populated passes", () => {
    expect(shape(checkDomainMetadata(full))).toEqual(["pass:"]);
  });
  test("zeroed fields fail and are named", () => {
    expect(shape(checkDomainMetadata({ ...full, crud_percentage: 0, cost_band: " ", usa_market_size_usd_m: 0 }))).toEqual([
      "fail:crud_percentage,cost_band,usa_market_size_usd_m",
    ]);
  });
  test("business_logic may be empty only at crud_percentage >= 95", () => {
    expect(domainMetadataGaps({ ...full, business_logic: "", crud_percentage: 95 })).toEqual([]);
    expect(domainMetadataGaps({ ...full, business_logic: "", crud_percentage: 94 })).toEqual(["business_logic"]);
  });
  test("bundle carve-out: no TAM fields, but certification_required must be set", () => {
    const bundle = { domain_kind: "bundle", min_org_size: "1", cost_band: "low", certification_required: false, crud_percentage: 0 };
    expect(domainMetadataGaps(bundle)).toEqual([]);
    expect(domainMetadataGaps({ ...bundle, certification_required: null })).toEqual(["certification_required"]);
  });
});

describe("A2 capability floor", () => {
  test("0 fails, 1-2 warns, >= 3 passes, bundle exempt", () => {
    expect(results(checkCapabilityFloor(0, "established_market"))).toEqual(["fail"]);
    expect(results(checkCapabilityFloor(2, "established_market"))).toEqual(["warn"]);
    expect(results(checkCapabilityFloor(3, "established_market"))).toEqual(["pass"]);
    expect(results(checkCapabilityFloor(0, "bundle"))).toEqual(["pass"]);
  });
});

describe("A3 solutions", () => {
  const sol = (id: number, coverage_level: string | null) => ({ id, coverage_level, solution_name: `S${id}` });
  test(">= 3 rows with a primary passes", () => {
    expect(results(checkSolutionCoverage([sol(1, "primary"), sol(2, "partial"), sol(3, "partial")], { domainKind: "established_market", hasMasters: true }))).toEqual(["pass"]);
  });
  test("too few rows fails; a null coverage_level fails and names the row", () => {
    expect(shape(checkSolutionCoverage([sol(1, "primary"), sol(2, null)], { domainKind: "established_market", hasMasters: true }))).toEqual(["fail:", "fail:2"]);
  });
  test("zero primary with masters is the emerging_market signal (warn), already-emerging passes", () => {
    const partial = [sol(1, "partial"), sol(2, "partial"), sol(3, "partial")];
    expect(results(checkSolutionCoverage(partial, { domainKind: "established_market", hasMasters: true }))).toEqual(["warn"]);
    expect(results(checkSolutionCoverage(partial, { domainKind: "emerging_market", hasMasters: true }))).toEqual(["pass"]);
    expect(results(checkSolutionCoverage(partial, { domainKind: "established_market", hasMasters: false }))).toEqual(["fail"]);
  });
  test("bundle is exempt", () => {
    expect(results(checkSolutionCoverage([], { domainKind: "bundle", hasMasters: false }))).toEqual(["pass"]);
  });
});

describe("A4 domain catalog copy", () => {
  test("empty field fails and is named; both filled passes", () => {
    expect(shape(checkDomainCatalogCopy({ catalog_tagline: "Hire well.", catalog_description: "" }))).toEqual(["fail:catalog_description"]);
    expect(shape(checkDomainCatalogCopy({ catalog_tagline: "Hire well.", catalog_description: "Teams hire." }))).toEqual(["pass:"]);
  });
});

// ---------------------------------------------------------------- M band

describe("M1 module presence", () => {
  test("zero modules fails; starter-only fails unless the domain is a bundle", () => {
    expect(results(checkModulePresence([], "established_market"))).toEqual(["fail"]);
    expect(shape(checkModulePresence([mod(7, { module_kind: "starter" })], "established_market"))).toEqual(["fail:7"]);
    expect(results(checkModulePresence([mod(7, { module_kind: "starter" })], "bundle"))).toEqual(["pass"]);
    expect(results(checkModulePresence([mod(1)], "established_market"))).toEqual(["pass"]);
  });
});

describe("M2 module split", () => {
  const starter = mod(9, { module_kind: "starter" });
  test("< 3 capabilities passes vacuously; >= 2 full modules passes", () => {
    expect(results(checkModuleSplit(2, [mod(1)], "established_market"))).toEqual(["pass"]);
    expect(results(checkModuleSplit(6, [mod(1), mod(2)], "established_market"))).toEqual(["pass"]);
  });
  test("starters do not count toward the floor", () => {
    expect(results(checkModuleSplit(5, [mod(1), starter], "established_market"))).toEqual(["fail"]);
  });
  test("exactly 3 on one full module is borderline (warn); bundles are exempt", () => {
    expect(results(checkModuleSplit(3, [mod(1)], "established_market"))).toEqual(["warn"]);
    expect(results(checkModuleSplit(5, [starter], "bundle"))).toEqual(["pass"]);
  });
});

describe("M4 capabilities realized", () => {
  test("a capability with no realizing module fails and is named by id", () => {
    const caps = [{ capability_id: 13, capability_code: "SOURCING" }, { capability_id: 14, capability_code: "CANDIDATE-EXP" }];
    expect(shape(checkCapabilitiesRealized(caps, new Set([13])))).toEqual(["fail:14"]);
    expect(shape(checkCapabilitiesRealized(caps, new Set([13, 14])))).toEqual(["pass:"]);
  });
});

describe("M5 gate realizers", () => {
  const dmdo = new Map<string, string[]>([["1|100", ["master"]], ["2|100", ["consumer"]], ["3|100", ["embedded_master"]]]);
  const ctx = (fullModuleCount: number) => ({
    rolesAt: (m: number, d: number) => dmdo.get(`${m}|${d}`) ?? [],
    moduleExists: (m: number) => [1, 2, 3, 4].includes(m),
    fullModuleCount,
  });
  const st = (id: number, domain_module_id: number | null) => ({ id, data_object_id: 100, state_name: `s${id}`, domain_module_id });
  test("master or embedded_master realizer passes; NULL passes on a single-module domain", () => {
    expect(shape(checkGateRealizers([st(1, 1), st(2, 3), st(3, null)], ctx(1)))).toEqual(["pass:"]);
  });
  test("a realizer that does not carry the entity (or does not exist) fails", () => {
    expect(shape(checkGateRealizers([st(4, 4), st(5, 99)], ctx(1)))).toEqual(["fail:4,5"]);
  });
  test("a consumer-only realizer warns; NULL on a multi-module domain warns", () => {
    expect(shape(checkGateRealizers([st(6, 2), st(7, null)], ctx(3)))).toEqual(["warn:6", "warn:7"]);
  });
});

describe("M6 modules realize capabilities", () => {
  test("full module with none fails, starter with none warns", () => {
    const modules = [mod(1), mod(2), mod(3, { module_kind: "starter" })];
    expect(shape(checkModulesRealizeCapabilities(modules, new Map([[1, 2]])))).toEqual(["fail:2", "warn:3"]);
    expect(shape(checkModulesRealizeCapabilities([mod(1)], new Map([[1, 1]])))).toEqual(["pass:"]);
  });
});

describe("M7 single-master integrity", () => {
  const row = (domain_module_id: number, data_object_id: number, role: string): DmdoRow => ({ domain_module_id, data_object_id, role });
  test("a second master row anywhere in the catalog fails", () => {
    const domainRows = [row(1, 100, "master")];
    const catalogMasterRows = [row(1, 100, "master"), row(50, 100, "master"), row(51, 200, "master")];
    expect(shape(checkSingleMaster({ masters: [100], catalogMasterRows, domainRows }))).toEqual(["fail:100"]);
  });
  test("master + consumer / contributor in this domain fails; master + embedded_master passes", () => {
    const domainRows = [row(1, 100, "master"), row(2, 100, "consumer"), row(1, 101, "master"), row(3, 101, "embedded_master")];
    const catalogMasterRows = domainRows.filter((r) => r.role === "master");
    expect(shape(checkSingleMaster({ masters: [100, 101], catalogMasterRows, domainRows }))).toEqual(["fail:100"]);
  });
  test("consumer in several modules passes with a dedupe note", () => {
    const domainRows = [row(1, 100, "master"), row(1, 300, "consumer"), row(2, 300, "consumer")];
    const fs = checkSingleMaster({ masters: [100], catalogMasterRows: [row(1, 100, "master")], domainRows });
    expect(results(fs)).toEqual(["pass", "pass"]);
    expect(fs[0].detail).toContain("consider deduplicating");
  });
});

describe("M8 module catalog copy", () => {
  test("a module with an empty field fails by module id", () => {
    expect(shape(checkModuleCatalogCopy([mod(1), mod(2, { catalog_tagline: "" })]))).toEqual(["fail:2"]);
    expect(shape(checkModuleCatalogCopy([mod(1)]))).toEqual(["pass:"]);
  });
});

describe("M9 part 1: entity-layer self-containment", () => {
  // Domain 1 owns modules 1, 2; domain 2 owns module 50; domain 3 owns module 60.
  const moduleDomain = new Map<number, number | null>([[1, 1], [2, 1], [50, 2], [60, 3]]);
  const kindById = new Map<number, string>([[100, "domain_owned"], [200, "domain_owned"], [300, "domain_owned"], [400, "platform_builtin"], [500, "domain_owned"]]);
  // 100 mastered in sibling module 1; 200 in domain 2; 300 in domains 2 and 3 (shared); 500 nowhere.
  const masterModulesByDataObject = new Map<number, number[]>([[100, [1]], [200, [50]], [300, [50, 60]]]);
  const catalog = { masterModulesByDataObject, moduleDomain, kindById };
  const r = (id: number, domain_module_id: number, data_object_id: number, role: string, is_install_optional = false): DmdoRow => ({ id, domain_module_id, data_object_id, role, is_install_optional });

  test("contributor / required consumer on another module's master is a violation", () => {
    const rows = [r(1, 1, 100, "master"), r(2, 2, 100, "consumer"), r(3, 2, 200, "contributor", true)];
    const res = entitySelfContainment(rows, catalog);
    expect(res.violations.map((v) => v.row.id)).toEqual([2, 3]);
    expect(res.violations[1].ownerDomainIds).toEqual([2]);
  });
  test("optional consumer, built-ins, embedded shells and unmastered entities pass; shared masters are counted", () => {
    const rows = [
      r(1, 2, 200, "consumer", true),
      r(2, 2, 400, "consumer"),
      r(3, 2, 500, "consumer"),
      r(4, 2, 300, "consumer"),
    ];
    const res = entitySelfContainment(rows, catalog);
    expect(res.violations).toEqual([]);
    expect(res.sharedExcluded).toBe(1);
  });
  test("phase_p_triage.ts compatibility: cross-domain owners only, embedded anywhere in the domain", () => {
    const rows = [r(1, 1, 100, "master"), r(2, 2, 100, "consumer"), r(3, 1, 200, "embedded_master"), r(4, 2, 200, "consumer")];
    expect(entitySelfContainment(rows, catalog).violations.map((v) => v.row.id)).toEqual([2, 4]);
    expect(entitySelfContainment(rows, catalog, { crossDomainOnly: true, embeddedScope: "domain" }).violations).toEqual([]);
  });
});

describe("M9 part 2: relationship-layer self-containment", () => {
  const kindById = new Map<number, string>([[1, "domain_owned"], [2, "domain_owned"], [3, "domain_owned"], [9, "platform_builtin"]]);
  const e = (id: number, a: number, b: number, kind: string, over: Partial<RelationshipLite> = {}): RelationshipLite => ({
    id,
    data_object_id: a,
    related_data_object_id: b,
    relationship_kind: kind,
    relationship_type: "one_to_many",
    relationship_verb: "has",
    owner_side: "source",
    is_required: true,
    ...over,
  });
  const scope = new Map<number, Set<number>>([[10, new Set([1, 2])]]);
  const sides = (vs: ReturnType<typeof relationshipSelfContainment>) => vs.map((x) => `${x.edge.id}:${x.outOfScopeId}:${x.inScopeSide}`);
  test("required edges with one endpoint out of scope are flagged, either direction", () => {
    const rels = [e(1, 1, 3, "composition"), e(2, 3, 2, "reference"), e(3, 1, 2, "composition"), e(4, 1, 3, "reference", { is_required: false }), e(5, 1, 9, "reference")];
    expect(sides(relationshipSelfContainment(scope, rels, { kindById }))).toEqual(["1:3:parent", "2:3:holds_fk"]);
  });
  test("the FK side follows cardinality, then owner_side for one_to_one; many_to_many has none", () => {
    const rels = [
      e(1, 1, 3, "reference", { relationship_type: "many_to_one", owner_side: "source" }), // mislabeled owner_side: the "many" source still holds the FK
      e(2, 1, 3, "reference", { relationship_type: "one_to_one", owner_side: "target" }),
      e(3, 1, 3, "reference", { relationship_type: "many_to_many" }),
    ];
    expect(sides(relationshipSelfContainment(scope, rels, { kindById }))).toEqual(["1:3:holds_fk", "2:3:holds_fk", "3:3:many_to_many"]);
  });
  test("shared masters are excluded", () => {
    expect(relationshipSelfContainment(scope, [e(1, 1, 3, "composition")], { kindById, excluded: new Set([3]) })).toEqual([]);
  });
  test("findings: part 1 fails; links whose field sits in scope warn; inbound links are not reported; rows are prefixed by table", () => {
    const part2 = relationshipSelfContainment(scope, [e(1, 1, 3, "composition"), e(2, 3, 2, "reference"), e(3, 1, 3, "reference")], { kindById });
    const part1 = [{ row: { id: 77, domain_module_id: 10, data_object_id: 3, role: "contributor" }, ownerModuleIds: [11], ownerDomainIds: [5] }];
    expect(shape(checkSelfContainment(part1, part2))).toEqual(["fail:dmdo:77", "warn:rel:2"]);
    expect(shape(checkSelfContainment([], []))).toEqual(["pass:"]);
  });
  test("composition is treated like any other link: a missing child passes, a missing parent warns", () => {
    const missingChild = relationshipSelfContainment(scope, [e(1, 1, 3, "composition")], { kindById });
    expect(shape(checkSelfContainment([], missingChild))).toEqual(["pass:"]);
    const missingParent = relationshipSelfContainment(scope, [e(4, 3, 2, "composition")], { kindById });
    expect(shape(checkSelfContainment([], missingParent))).toEqual(["warn:rel:4"]);
  });
});

describe("required-edge target classification (required_edge_presence_probe.ts)", () => {
  test("built-in targets excluded; optional somewhere vs everywhere", () => {
    const kindById = new Map<number, string>([[2, "domain_owned"], [3, "domain_owned"], [9, "platform_builtin"]]);
    const dmdo = [
      { data_object_id: 2, is_install_optional: true },
      { data_object_id: 2, is_install_optional: false },
      { data_object_id: 3, is_install_optional: true },
    ];
    const edges: RelationshipLite[] = [
      { id: 1, data_object_id: 1, related_data_object_id: 2, relationship_kind: "reference", is_required: true },
      { id: 2, data_object_id: 1, related_data_object_id: 3, relationship_kind: "composition", is_required: true },
      { id: 3, data_object_id: 1, related_data_object_id: 9, relationship_kind: "reference", is_required: true },
    ];
    const s = classifyRequiredEdgeTargets(edges, dmdo, kindById);
    expect([s.total, s.builtinTarget, s.optionalSomewhere, s.optionalEverywhere]).toEqual([3, 1, 2, 1]);
    expect(Object.fromEntries(s.everyByKind)).toEqual({ composition: 1 });
    expect(s.everyEdges.map((x) => x.id)).toEqual([2]);
  });
});
