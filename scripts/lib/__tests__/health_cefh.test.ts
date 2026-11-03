// Tests for scripts/lib/health/logic_cefh.ts (the C, E, F and H band logic of domain_health.ts):
// one or more blocks per check on tiny literal rows. Pure, offline: no catalog, no cache file.

import { describe, expect, test } from "bun:test";
import {
  checkFunctionOwnership,
  checkHandoffTags,
  checkInteractionLevels,
  checkMastersClassified,
  checkModuleTools,
  checkOrphanDomainSkills,
  checkPersonaCoverage,
  checkPersonaFloor,
  checkScoreComputable,
  checkSingleDomainSkill,
  checkSkillCopy,
  checkToolPairing,
  crossDomainHandoffs,
  domainPersonas,
  domainSkillsOf,
  handoffTagCoverage,
  isLivePersona,
  isUnclassified,
  phasePVerdict,
  semantiusScores,
  toolPairingProblem,
  type ModuleLite,
  type PersonaRow,
  type PersonaModuleRow,
  type SkillRow,
  type ToolRow,
  type Verdict,
} from "../health/logic_cefh.ts";

const shape = (vs: Verdict | Verdict[]) => (Array.isArray(vs) ? vs : [vs]).map((v) => `${v.result}:${v.rows.join(",")}`);

// ---------------------------------------------------------------- C1

describe("C1 function ownership", () => {
  test("an owner row passes", () => {
    expect(shape(checkFunctionOwnership("established_market", [{ business_function_id: 34, responsibility_type: "owner" }]))).toEqual(["pass:"]);
  });
  test("contributors only fail (audit_backlog.ts counted any row; SKILL.md needs an owner)", () => {
    const v = checkFunctionOwnership("established_market", [{ business_function_id: 7, responsibility_type: "contributor" }]);
    expect(v.result).toBe("fail");
    expect(v.detail).toContain("1 other");
  });
  test("zero rows fail", () => {
    expect(checkFunctionOwnership("emerging_market", []).result).toBe("fail");
  });
  test("bundle domains are exempt", () => {
    const v = checkFunctionOwnership("bundle", []);
    expect(v.result).toBe("pass");
    expect(v.detail).toContain("exempt");
  });
});

// ---------------------------------------------------------------- E1 / E2 / E3

const persona = (id: number, fn: number | null, record_status: string | null = "new"): PersonaRow => ({ id, business_function_id: fn, record_status });
const rm = (id: number, persona_id: number, domain_module_id: number, interaction_level: string | null = "primary"): PersonaModuleRow => ({ id, persona_id, domain_module_id, interaction_level });

describe("E1 persona set and coverage", () => {
  const personas = [persona(1, 34), persona(2, null), persona(3, 34, "archived"), persona(4, 99)];
  const personaModules = [rm(10, 2, 500), rm(11, 2, 501), rm(12, 3, 500), rm(13, 4, 900), rm(14, 4, 901)];

  test("union of owning-function personas and module reach; tombstoned personas drop out", () => {
    const p = domainPersonas({ moduleIds: [500, 501], ownerFunctionIds: [34], personas, personaModules });
    expect(p).toEqual({ reach: [2], functionScoped: [1], all: [1, 2] });
    expect(isLivePersona({ record_status: "Deleted" })).toBe(false);
    expect(isLivePersona({ record_status: null })).toBe(true);
  });
  test("single-module shape passes vacuously with zero personas", () => {
    expect(shape(checkPersonaCoverage(1, 2, { reach: [], functionScoped: [], all: [] }))).toEqual(["pass:"]);
  });
  test("multi-module domain with zero personas fails", () => {
    expect(shape(checkPersonaCoverage(3, 5, { reach: [], functionScoped: [], all: [] }))).toEqual(["fail:"]);
  });
  test("one module with >= 3 capabilities counts as multi (SKILL.md) and routes to M2", () => {
    const [v] = checkPersonaCoverage(1, 4, { reach: [], functionScoped: [], all: [] });
    expect(v.result).toBe("fail");
    expect(v.detail).toContain("M2");
  });
  test("function personas that reach none of the domain's modules fail (reach-only)", () => {
    expect(shape(checkPersonaCoverage(2, 3, { reach: [], functionScoped: [1, 4], all: [1, 4] }))).toEqual(["fail:"]);
  });
  test("reach present passes", () => {
    expect(shape(checkPersonaCoverage(2, 3, { reach: [2], functionScoped: [], all: [2] }))).toEqual(["pass:"]);
  });
  test("phase_p_triage verdict table", () => {
    expect(phasePVerdict(0, 5, 0)).toBe("BUILD");
    expect(phasePVerdict(1, 3, 0)).toBe("MODULARIZE");
    expect(phasePVerdict(1, 2, 0)).toBe("VERIFY-SCOPE");
    expect(phasePVerdict(2, 2, 0)).toBe("PHASE-P");
    expect(phasePVerdict(2, 2, 1)).toBe("OK-PERSONAS");
  });
});

describe("E2 2-module floor", () => {
  test("a persona with one persona_modules row fails; rows = personas ids", () => {
    expect(shape(checkPersonaFloor([1, 2], [rm(1, 1, 500), rm(2, 1, 501), rm(3, 2, 500)]))).toEqual(["fail:2"]);
  });
  test("every persona at >= 2 passes; no personas is vacuous", () => {
    expect(shape(checkPersonaFloor([1], [rm(1, 1, 500), rm(2, 1, 501)]))).toEqual(["pass:"]);
    expect(checkPersonaFloor([], []).detail).toContain("vacuous");
  });
});

describe("E3 interaction_level", () => {
  test("null and off-enum values fail; rows = persona_modules ids; other personas' rows are out of scope", () => {
    const rows = [rm(1, 1, 500), rm(2, 1, 501, null), rm(3, 1, 502, "read_only"), rm(4, 9, 500, null)];
    expect(shape(checkInteractionLevels([1], rows))).toEqual(["fail:2,3"]);
  });
  test("primary / secondary pass", () => {
    expect(shape(checkInteractionLevels([1], [rm(1, 1, 500), rm(2, 1, 501, "secondary")]))).toEqual(["pass:"]);
  });
});

// ---------------------------------------------------------------- E6 mechanical half (B13)

describe("E6 entity_type classified", () => {
  const types: Record<number, string | null> = { 1: "operational_workflow", 2: "unclassified", 3: null, 4: "" , 5: "catalog" };
  test("unclassified, null and blank masters fail; rows = data_object ids", () => {
    expect(shape(checkMastersClassified([5, 1, 2, 3, 4], (id) => types[id]))).toEqual(["fail:2,3,4"]);
  });
  test("all classified passes", () => {
    expect(shape(checkMastersClassified([1, 5], (id) => types[id]))).toEqual(["pass:"]);
    expect(isUnclassified("junction")).toBe(false);
  });
});

// ---------------------------------------------------------------- F1 / F2 / F8

const skill = (over: Partial<SkillRow> & { id: number }): SkillRow => ({
  skill_name: `s${over.id}`,
  skill_type: "domain",
  domain_id: 56,
  description: "Track candidates from sourcing to offer; schedule interviews.",
  trigger_keywords: "recruiting, applicant tracking",
  ...over,
});

describe("F1 orphan domain skills (catalog-wide)", () => {
  test("a domain skill with NULL domain_id fails; process skills with NULL domain_id are fine", () => {
    const v = checkOrphanDomainSkills([skill({ id: 1 }), skill({ id: 2, domain_id: null }), skill({ id: 3, skill_type: "process", domain_id: null })]);
    expect(shape(v)).toEqual(["fail:2"]);
    expect(v.detail).toContain("catalog-wide");
  });
  test("no orphans passes", () => {
    expect(shape(checkOrphanDomainSkills([skill({ id: 1 })]))).toEqual(["pass:"]);
  });
});

describe("F2 exactly one domain skill", () => {
  const all = [skill({ id: 1 }), skill({ id: 2, domain_id: 57 }), skill({ id: 3, domain_id: 57 }), skill({ id: 4, skill_type: "process", domain_id: 58 })];
  test("one passes, zero fails, two fail with both ids", () => {
    expect(shape(checkSingleDomainSkill(domainSkillsOf(all, 56)))).toEqual(["pass:"]);
    expect(shape(checkSingleDomainSkill(domainSkillsOf(all, 58)))).toEqual(["fail:"]);
    expect(shape(checkSingleDomainSkill(domainSkillsOf(all, 57)))).toEqual(["fail:2,3"]);
  });
});

describe("F8 skill copy (mechanical half)", () => {
  test("complete copy passes", () => {
    expect(shape(checkSkillCopy([skill({ id: 1 })]))).toEqual(["pass:"]);
  });
  test("empty trigger_keywords fails", () => {
    const [v] = checkSkillCopy([skill({ id: 5, trigger_keywords: "" })]);
    expect(shape(v)).toEqual(["fail:5"]);
    expect(v.detail).toContain("trigger_keywords empty");
  });
  test("empty description and an embedded 'Use for:' fail", () => {
    expect(checkSkillCopy([skill({ id: 6, description: "  " })])[0].detail).toContain("description empty");
    expect(checkSkillCopy([skill({ id: 7, description: "Track candidates. Use for: recruiting, ATS" })])[0].detail).toContain("Use for:");
  });
  test("no domain skill fails", () => {
    expect(shape(checkSkillCopy([]))).toEqual(["fail:"]);
  });
});

// ---------------------------------------------------------------- F3 / F4 / F5

const tool = (id: number, operation_kind: string, data_object_id: number | null, coverage_tier: string, tool_name = `t${id}`): ToolRow => ({ id, tool_name, operation_kind, data_object_id, coverage_tier });
const TOOLS = new Map<number, ToolRow>(
  [
    tool(1, "query", 10, "semantius_crud"),
    tool(2, "mutate", 10, "semantius_crud"),
    tool(3, "mutate", 10, "semantius_workflow"),
    tool(4, "side_effect", null, "agent_common"),
    tool(5, "compute", null, "agent_first"),
    tool(6, "fetch", null, "vendor_platform"),
    tool(7, "inbound", 10, "external"),
    tool(8, "query", null, "semantius_crud"), // bad pairing
    tool(9, "compute", 10, "agent_native"), // bad pairing
  ].map((t) => [t.id, t]),
);
const mods: ModuleLite[] = [
  { id: 500, domain_module_code: "X-CORE", module_kind: "full" },
  { id: 501, domain_module_code: "X-EXTRA", module_kind: "full" },
  { id: 502, domain_module_code: "X-STARTER", module_kind: "starter" },
];
const mt = (domain_module_id: number, tool_id: number, requirement_level = "required") => ({ domain_module_id, tool_id, requirement_level });

describe("F3 module tools", () => {
  test("zero rows across the union fails with every module id", () => {
    expect(shape(checkModuleTools(mods, [mt(999, 1)], TOOLS))).toEqual(["fail:500,501,502"]);
  });
  test("a bare FULL module warns; a bare starter does not", () => {
    expect(shape(checkModuleTools(mods, [mt(500, 1), mt(500, 2), mt(500, 3)], TOOLS, { hasGatedStates: true }))).toEqual(["pass:", "warn:501"]);
  });
  test("practical required floor warns (no mutate, optional tools do not count)", () => {
    const vs = checkModuleTools(mods.slice(0, 1), [mt(500, 1), mt(500, 4), mt(500, 5), mt(500, 2, "optional")], TOOLS);
    expect(shape(vs)).toEqual(["pass:", "warn:"]);
    expect(vs[1].detail).toContain("no required mutate tool");
  });
  test("the workflow-gate leg applies only when the masters carry gated states", () => {
    const rows = [mt(500, 1), mt(500, 2), mt(500, 4)];
    expect(shape(checkModuleTools(mods.slice(0, 1), rows, TOOLS))).toEqual(["pass:"]);
    expect(checkModuleTools(mods.slice(0, 1), rows, TOOLS, { hasGatedStates: true })[1].detail).toContain("workflow-gate");
  });
});

describe("F4 operation_kind <-> data_object_id", () => {
  test("pairing table", () => {
    expect(toolPairingProblem({ operation_kind: "query", data_object_id: 1 })).toBeNull();
    expect(toolPairingProblem({ operation_kind: "mutate", data_object_id: null })).toContain("without");
    expect(toolPairingProblem({ operation_kind: "side_effect", data_object_id: 3 })).toContain("with data_object_id");
    expect(toolPairingProblem({ operation_kind: "inbound", data_object_id: null })).toBeNull();
    expect(toolPairingProblem({ operation_kind: "inbound", data_object_id: 3 })).toBeNull();
    expect(toolPairingProblem({ operation_kind: "teleport", data_object_id: null })).toContain("unknown");
  });
  test("bad tools and dangling tool ids fail; rows = tools ids", () => {
    expect(shape(checkToolPairing([1, 8, 9, 9, 42], TOOLS))).toEqual(["fail:8,9,42"]);
    expect(shape(checkToolPairing([1, 2, 7], TOOLS))).toEqual(["pass:"]);
  });
});

describe("F5 Semantius score (coverage_rollup.ts formulas)", () => {
  test("three nested scores over distinct tools, required winning the level", () => {
    // tools 1,2,3 semantius; 4 agent_common; 5 agent_first; 6 vendor_platform; tool 1 listed twice
    const s = semantiusScores([mt(500, 1, "optional"), mt(501, 1), mt(500, 2), mt(500, 3), mt(500, 4), mt(500, 5), mt(500, 6, "optional")], TOOLS);
    expect(s.total).toBe(6);
    expect(s.counts).toEqual({ semantius_score: 3, semantius_agent_core: 4, semantius_agent_first: 5 });
    expect(s.scores.semantius_score).toBeCloseTo(0.5);
    expect(s.scores.semantius_agent_first).toBeCloseTo(5 / 6);
    expect(s.gaps.map((t) => t.id)).toEqual([6]);
    expect(s.belowSemantius.map((t) => `${t.id}:${t.level}`)).toEqual(["4:required", "5:required", "6:optional"]);
    const vs = checkScoreComputable(s);
    expect(shape(vs)).toEqual(["pass:"]);
    expect(vs[0].detail).toContain("semantius_score 50% (3/6)");
  });
  test("zero tools is uncomputable (fail, see F3)", () => {
    const s = semantiusScores([], TOOLS);
    expect(s.scores.semantius_score).toBeNull();
    expect(shape(checkScoreComputable(s))).toEqual(["fail:"]);
  });
  test("a dangling tool id scores as uncovered and warns", () => {
    const s = semantiusScores([mt(500, 1), mt(500, 77)], TOOLS);
    expect(s.counts.semantius_score).toBe(1);
    expect(shape(checkScoreComputable(s))).toEqual(["pass:", "warn:77"]);
  });
  test("an all-external toolset still computes (0 is a number)", () => {
    const s = semantiusScores([mt(500, 7)], TOOLS);
    expect(s.scores.semantius_agent_first).toBe(0);
    expect(checkScoreComputable(s)[0].result).toBe("pass");
  });
});

// ---------------------------------------------------------------- H1

describe("H1 cross-domain handoff tagging", () => {
  const D = 56;
  const handoffs = [
    { id: 1, source_domain_id: D, target_domain_id: 57 }, // outbound, tagged
    { id: 2, source_domain_id: 54, target_domain_id: D }, // inbound, untagged
    { id: 3, source_domain_id: D, target_domain_id: D }, // intra-domain: out of scope
    { id: 4, source_domain_id: 54, target_domain_id: 57 }, // not this domain
    { id: 5, source_domain_id: D, target_domain_id: 22 }, // outbound, tagged twice
  ];
  const tags = [
    { handoff_id: 1, proposal_source: "discovery_substring", record_status: "approved" },
    { handoff_id: 5, proposal_source: "agent_curated", record_status: "new" },
    { handoff_id: 5, proposal_source: "human_curated", record_status: "new" },
    { handoff_id: 3, proposal_source: "agent_curated", record_status: "new" },
  ];
  test("scope is cross-domain handoffs in either direction", () => {
    expect(crossDomainHandoffs(handoffs, D).map((h) => h.id)).toEqual([1, 2, 5]);
  });
  test("untagged fails with the handoff ids; coverage and provenance are separate numbers", () => {
    const cov = handoffTagCoverage(crossDomainHandoffs(handoffs, D), tags, D);
    expect(cov).toMatchObject({ total: 3, outbound: 2, inbound: 1, tagged: [1, 5], untagged: [2], approved: 1, contextRich: 1 });
    const v = checkHandoffTags(cov);
    expect(shape(v)).toEqual(["fail:2"]);
    expect(v.detail).toContain("coverage 1 with an approved tag, provenance 1 agent / human curated");
  });
  test("all tagged passes; no cross-domain handoffs is vacuous", () => {
    expect(shape(checkHandoffTags(handoffTagCoverage(crossDomainHandoffs(handoffs, D).filter((h) => h.id !== 2), tags, D)))).toEqual(["pass:"]);
    expect(checkHandoffTags(handoffTagCoverage([], tags, D)).detail).toContain("vacuous");
  });
});
