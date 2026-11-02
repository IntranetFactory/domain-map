// Tests for scripts/lib/health/logic_b.ts: the B-band rules of the per-domain health check, one
// block per checklist ID on tiny literal rows. Pure, offline: no catalog, no cache file.

import { describe, expect, test } from "bun:test";
import {
  checkAliasPresence,
  checkBareWordNaming,
  checkBritishSpelling,
  checkConditionalMasters,
  checkCrossDomainEdges,
  checkDependencyOwners,
  checkEntityTypeClassified,
  checkHandoffModuleAttribution,
  checkInboundCoverage,
  checkIntraDomainEdges,
  checkIntraDomainHandoffs,
  checkLifecycleCoverage,
  checkMasterFloor,
  checkMasterLabels,
  checkOutboundEvents,
  checkPersonalContentClass,
  checkUserEdgePresence,
  conditionalToken,
  eventMatchesState,
  fixBritishSpelling,
  isUnclassified,
  type HandoffRow,
  type MasterRow,
  type StateRow,
} from "../health/logic_b.ts";
import type { Finding } from "../health/types.ts";

const USERS = 748;
const DOM = 56; // the domain under test
const HCM = 54;
const ONB = 70;

// "result:rows" per finding, for compact assertions.
const sig = (fs: Finding[]) => fs.map((f) => `${f.result}:${(f.rows ?? []).join(",")}`);
const results = (fs: Finding[]) => fs.map((f) => f.result);

const master = (id: number, over: Partial<MasterRow> = {}): MasterRow => ({
  id,
  data_object_name: `ats_thing_${id}`,
  singular_label: "Thing",
  plural_label: "Things",
  is_canonical_bare_word: false,
  naming_authority_rationale: null,
  entity_type: "operational_workflow",
  has_personal_content: false,
  ...over,
});

const handoff = (id: number, over: Partial<HandoffRow> = {}): HandoffRow => ({
  id,
  trigger_event_id: null,
  source_domain_id: DOM,
  target_domain_id: HCM,
  source_domain_module_id: 1,
  target_domain_module_id: 9,
  data_object_id: null,
  ...over,
});

const state = (id: number, over: Partial<StateRow> = {}): StateRow => ({
  id,
  data_object_id: 1,
  state_name: "draft",
  state_order: id,
  is_initial: false,
  is_terminal: false,
  requires_permission: false,
  domain_module_id: null,
  ...over,
});

describe("B1 master floor", () => {
  test(">= 1 master passes", () => {
    expect(results(checkMasterFloor({ moduleCount: 2, masterCount: 5, overlayRowCount: 0 }))).toEqual(["pass"]);
  });
  test("bundle is exempt even with zero masters", () => {
    expect(results(checkMasterFloor({ domainKind: "bundle", moduleCount: 1, masterCount: 0, overlayRowCount: 3 }))).toEqual(["pass"]);
  });
  test("zero masters with no modules fails (M1)", () => {
    expect(results(checkMasterFloor({ moduleCount: 0, masterCount: 0, overlayRowCount: 0 }))).toEqual(["fail"]);
  });
  test("zero masters but overlay rows is the overlay judgment", () => {
    expect(results(checkMasterFloor({ moduleCount: 1, masterCount: 0, overlayRowCount: 4 }))).toEqual(["agent"]);
  });
  test("zero masters and an empty module fails (unbuilt)", () => {
    expect(results(checkMasterFloor({ moduleCount: 1, masterCount: 0, overlayRowCount: 0 }))).toEqual(["fail"]);
  });
});

describe("B2 master labels", () => {
  test("both labels present passes", () => {
    expect(results(checkMasterLabels([master(1)]))).toEqual(["pass"]);
  });
  test("a blank singular or plural label fails with the data_object id", () => {
    expect(sig(checkMasterLabels([master(1), master(2, { plural_label: " " }), master(3, { singular_label: null })]))).toEqual(["fail:2,3"]);
  });
});

describe("B3 naming arbitration", () => {
  test("prefixed names pass automatically", () => {
    expect(results(checkBareWordNaming([master(1, { data_object_name: "job_offers" })]))).toEqual(["pass"]);
  });
  test("a bare word needs the canonical claim AND a rationale", () => {
    const fs = checkBareWordNaming([
      master(1, { data_object_name: "candidates", is_canonical_bare_word: true, naming_authority_rationale: "ATS owns candidates" }),
      master(2, { data_object_name: "interviews", is_canonical_bare_word: false }),
      master(3, { data_object_name: "offers", is_canonical_bare_word: true, naming_authority_rationale: "" }),
    ]);
    expect(sig(fs)).toEqual(["fail:2,3"]);
  });
});

describe("B5 dependency owners", () => {
  const owned = new Set([32]);
  const opts = { hasMaster: (id: number) => owned.has(id), isBuiltin: (id: number) => id === USERS };
  test("embedded_master with an owner, and a built-in, pass", () => {
    const fs = checkDependencyOwners(
      [
        { domain_module_id: 1, data_object_id: 32, role: "embedded_master", is_install_optional: false },
        { domain_module_id: 1, data_object_id: USERS, role: "embedded_master", is_install_optional: false },
        { domain_module_id: 1, data_object_id: 99, role: "master", is_install_optional: false },
      ],
      opts,
    );
    expect(results(fs)).toEqual(["pass"]);
  });
  test("an orphan embedded_master fails; an unowned consumer fails separately (B10 routes it to B5)", () => {
    const fs = checkDependencyOwners(
      [
        { domain_module_id: 1, data_object_id: 40, role: "embedded_master", is_install_optional: false },
        { domain_module_id: 2, data_object_id: 41, role: "consumer", is_install_optional: true },
        { domain_module_id: 2, data_object_id: 42, role: "derived", is_install_optional: true }, // derived is not a dependency
      ],
      opts,
    );
    expect(sig(fs)).toEqual(["fail:40", "fail:41"]);
  });
});

describe("B6 intra-domain edges", () => {
  const rel = (id: number, a: number, b: number) => ({ id, data_object_id: a, related_data_object_id: b });
  test("fewer than two masters is vacuous", () => {
    expect(results(checkIntraDomainEdges([1], []))).toEqual(["pass"]);
  });
  test("all masters connected passes", () => {
    expect(results(checkIntraDomainEdges([1, 2, 3], [rel(10, 1, 2), rel(11, 3, 2)]))).toEqual(["pass"]);
  });
  test("an isolated master warns; a self-edge does not connect it", () => {
    expect(sig(checkIntraDomainEdges([1, 2, 3], [rel(10, 1, 2), rel(11, 3, 3)]))).toEqual(["warn:3"]);
  });
  test("no intra edge at all among >= 2 masters fails", () => {
    expect(sig(checkIntraDomainEdges([1, 2], [rel(10, 1, 500)]))).toEqual(["fail:1,2"]);
  });
});

describe("B7 users edge presence", () => {
  const rel = (a: number, b: number) => ({ data_object_id: a, related_data_object_id: b });
  test("either direction counts", () => {
    const ms = [master(1), master(2, { entity_type: "operational_record" })];
    expect(results(checkUserEdgePresence(ms, [rel(1, USERS), rel(USERS, 2)], USERS))).toEqual(["pass"]);
  });
  test("an operational master with no users edge warns; catalog masters are not listed", () => {
    const ms = [master(1), master(2, { entity_type: "operational_record" }), master(3, { entity_type: "catalog" })];
    expect(sig(checkUserEdgePresence(ms, [rel(1, USERS)], USERS))).toEqual(["warn:2"]);
  });
  test("no users edge on any master, with a workflow master, fails", () => {
    const ms = [master(1), master(2, { entity_type: "catalog" })];
    expect(sig(checkUserEdgePresence(ms, [], USERS))).toEqual(["fail:1"]);
  });
});

describe("B8 cross-domain edges", () => {
  // event 81 fires on job_offers (1, an ATS master); payload onboarding_journeys (300) is mastered by ONB.
  const eventEntity = (id: number) => ({ 81: 1, 90: 300, 91: 301 } as Record<number, number>)[id];
  const masterDomains = (id: number) => ({ 1: new Set([DOM]), 300: new Set([ONB]), 301: new Set([HCM]), 2: new Set([DOM]) } as Record<number, Set<number>>)[id];
  const base = { domainId: DOM, masterIds: new Set([1, 2]), eventEntity, masterDomains, isBuiltin: () => false };
  test("a clean outbound mapping with its edge passes", () => {
    const fs = checkCrossDomainEdges({
      ...base,
      handoffs: [handoff(1, { trigger_event_id: 81, target_domain_id: ONB, data_object_id: 300 })],
      rels: [{ data_object_id: 1, related_data_object_id: 300 }],
    });
    expect(results(fs)).toEqual(["pass"]);
  });
  test("a clean outbound mapping without the edge fails; the reverse edge does not count", () => {
    const fs = checkCrossDomainEdges({
      ...base,
      handoffs: [handoff(5, { trigger_event_id: 81, target_domain_id: ONB, data_object_id: 300 })],
      rels: [{ data_object_id: 300, related_data_object_id: 1 }],
    });
    expect(sig(fs)).toEqual(["fail:5"]);
  });
  test("payload = event entity, or payload not mastered by the target, is not a clean mapping", () => {
    const fs = checkCrossDomainEdges({
      ...base,
      handoffs: [
        handoff(6, { trigger_event_id: 81, target_domain_id: ONB, data_object_id: 1 }),
        handoff(7, { trigger_event_id: 81, target_domain_id: HCM, data_object_id: 300 }),
      ],
      rels: [],
    });
    expect(results(fs)).toEqual(["pass"]);
  });
  test("an inbound gap is report-only (warn), owed by the source", () => {
    const fs = checkCrossDomainEdges({
      ...base,
      handoffs: [handoff(8, { trigger_event_id: 91, source_domain_id: HCM, target_domain_id: DOM, data_object_id: 2 })],
      rels: [],
      domainCode: (id) => (id === HCM ? "HCM" : `#${id}`),
    });
    expect(sig(fs)).toEqual(["warn:8"]);
    expect(fs[0].detail).toContain("owed by HCM B8");
  });
});

describe("B9 outbound events", () => {
  const ev = (id: number, name: string, doId = 1, to: string | null = null) => ({ id, event_name: name, data_object_id: doId, to_state: to });
  const base = {
    domainId: DOM,
    masterIds: [1, 2],
    domainDmdo: [
      { domain_module_id: 1, data_object_id: 1, role: "master" },
      { domain_module_id: 1, data_object_id: 2, role: "master" },
      { domain_module_id: 1, data_object_id: 3, role: "consumer" },
    ],
    hasModules: true,
    eventEntity: (id: number) => ({ 10: 1, 11: 1, 20: 3 } as Record<number, number>)[id],
    isBuiltin: () => false,
  };
  test("every event handed off and every gated state evented passes", () => {
    const fs = checkOutboundEvents({
      ...base,
      events: [ev(10, "job_offer.accepted", 1, "accepted")],
      states: [state(1, { state_name: "draft" }), state(2, { state_name: "accepted", requires_permission: true })],
      handoffs: [handoff(1, { trigger_event_id: 10 })],
    });
    expect(results(fs)).toEqual(["pass"]);
  });
  test("a master with states but no events fails", () => {
    const fs = checkOutboundEvents({ ...base, events: [], states: [state(1, { data_object_id: 2 })], handoffs: [] });
    expect(sig(fs)).toEqual(["fail:do:2"]);
  });
  test("an unhanded event fails; the orphan (no lifecycle, q5) is its own finding", () => {
    const fs = checkOutboundEvents({
      ...base,
      events: [ev(10, "job_offer.sent", 1), ev(12, "thing.pinged", 2)],
      states: [state(1, { state_name: "sent" })],
      handoffs: [],
    });
    expect(sig(fs)).toEqual(["fail:event:12", "fail:event:10"]);
  });
  test("a gated or published-verb state with no <entity>.<state> event fails", () => {
    const fs = checkOutboundEvents({
      ...base,
      events: [ev(10, "job_offer.approved", 1)],
      states: [
        state(1, { state_name: "approved", requires_permission: true }), // matched by the name suffix
        state(2, { state_name: "rescinded", requires_permission: true }),
        state(3, { state_name: "cancelled" }), // published verb, not gated
      ],
      handoffs: [handoff(1, { trigger_event_id: 10 })],
    });
    expect(sig(fs)).toEqual(["fail:state:2,state:3"]);
  });
  test("q3: an outbound handoff on an entity this domain only consumes fails", () => {
    const fs = checkOutboundEvents({
      ...base,
      events: [],
      states: [],
      handoffs: [handoff(4, { trigger_event_id: 20 }), handoff(5, { trigger_event_id: 10 })],
    });
    expect(sig(fs)).toEqual(["fail:handoff:4"]);
  });
  test("q3 is skipped for a domain with no modules (M1 / B1 own that)", () => {
    const fs = checkOutboundEvents({ ...base, hasModules: false, domainDmdo: [], events: [], states: [], handoffs: [handoff(4, { trigger_event_id: 20 })] });
    expect(results(fs)).toEqual(["pass"]);
  });
  test("eventMatchesState uses to_state or the name suffix, on the same entity only", () => {
    expect(eventMatchesState(ev(1, "x.y", 1, "signed"), state(1, { state_name: "Signed" }))).toBe(true);
    expect(eventMatchesState(ev(1, "job_offer.signed", 1), state(1, { state_name: "signed" }))).toBe(true);
    expect(eventMatchesState(ev(1, "job_offer.signed", 2), state(1, { state_name: "signed" }))).toBe(false);
  });
});

describe("B9b intra-domain handoffs", () => {
  // masters: 1 on module 6, 2 on module 85, 3 on module 6
  const mods: Record<number, number[]> = { 1: [6], 2: [85], 3: [6] };
  const base = {
    domainId: DOM,
    moduleIds: [6, 85],
    masterIds: new Set([1, 2, 3]),
    masterModules: (id: number) => mods[id],
    events: [],
    states: [],
  };
  const intra = (id: number, a: number, b: number, ev = 1) => handoff(id, { trigger_event_id: ev, target_domain_id: DOM, source_domain_module_id: a, target_domain_module_id: b });
  test("a single-module domain is not applicable", () => {
    expect(results(checkIntraDomainHandoffs({ ...base, moduleIds: [6], rels: [], handoffs: [] }))).toEqual(["pass"]);
  });
  test("a cross-module relationship needs an intra handoff on that pair (either direction)", () => {
    const rels = [{ id: 810, data_object_id: 1, related_data_object_id: 2 }, { id: 811, data_object_id: 1, related_data_object_id: 3 }];
    expect(sig(checkIntraDomainHandoffs({ ...base, rels, handoffs: [] }))).toEqual(["fail:rel:810"]);
    expect(results(checkIntraDomainHandoffs({ ...base, rels, handoffs: [intra(1, 85, 6)] }))).toEqual(["pass"]);
  });
  test("an event with no handoff anywhere is source 2", () => {
    const fs = checkIntraDomainHandoffs({ ...base, rels: [], events: [{ id: 40, event_name: "thing.done", data_object_id: 2 }], handoffs: [] });
    expect(sig(fs)).toEqual(["fail:event:40"]);
  });
  test("a gated state realized on another module is source 3", () => {
    const states = [state(7, { data_object_id: 1, state_name: "hired", requires_permission: true, domain_module_id: 85 })];
    expect(sig(checkIntraDomainHandoffs({ ...base, rels: [], states, handoffs: [] }))).toEqual(["fail:state:7"]);
    expect(results(checkIntraDomainHandoffs({ ...base, rels: [], states, handoffs: [intra(2, 6, 85)] }))).toEqual(["pass"]);
  });
});

describe("B10 inbound coverage (report-only)", () => {
  const masterDomains = (id: number) => ({ 32: new Set([HCM]), 33: new Set([HCM, DOM]), 34: new Set<number>() } as Record<number, Set<number>>)[id];
  const deps = [
    { domain_module_id: 1, data_object_id: 32, role: "embedded_master", is_install_optional: false },
    { domain_module_id: 1, data_object_id: 34, role: "consumer", is_install_optional: true },
    { domain_module_id: 1, data_object_id: USERS, role: "embedded_master", is_install_optional: false }, // built-in: no owner, owes nothing
  ];
  const isBuiltin = (id: number) => id === USERS;
  test("a covered dependency passes, and the result is never worse than warn", () => {
    const fs = checkInboundCoverage({
      domainId: DOM,
      deps,
      masterIds: new Set([1]),
      masterDomains,
      isBuiltin,
      handoffs: [handoff(1, { source_domain_id: HCM, target_domain_id: DOM, data_object_id: 32 })],
    });
    expect(results(fs)).toEqual(["pass"]);
    expect(fs[0].detail).toContain("2 dependenc(ies) checked, 0 owed by other domains, 1 unowned (see B5)");
  });
  test("an uncovered dependency is owed by its owner domain (warn)", () => {
    const fs = checkInboundCoverage({ domainId: DOM, deps, masterIds: new Set([1]), masterDomains, isBuiltin, handoffs: [], domainCode: (id) => (id === HCM ? "HCM" : `#${id}`) });
    expect(sig(fs)).toEqual(["pass:", "warn:32"]);
    expect(fs[1].detail).toContain("HCM B9 owes outbound");
    expect(fs.every((f) => f.result === "pass" || f.result === "warn")).toBe(true);
  });
  test("an entity this domain masters is not an inbound dependency", () => {
    const fs = checkInboundCoverage({
      domainId: DOM,
      deps: [{ domain_module_id: 2, data_object_id: 33, role: "consumer", is_install_optional: false }],
      masterIds: new Set([33]),
      masterDomains,
      isBuiltin,
      handoffs: [],
    });
    expect(results(fs)).toEqual(["pass"]);
  });
});

describe("B10b handoff module attribution", () => {
  test("not applicable without modules", () => {
    expect(results(checkHandoffModuleAttribution({ domainId: DOM, hasModules: false, handoffs: [handoff(1, { source_domain_module_id: null })] }))).toEqual(["pass"]);
  });
  test("outbound NULL source module (q1) and inbound NULL target module (q2) fail; opposite side is a note", () => {
    const hs = [
      handoff(1, { source_domain_module_id: null }), // outbound, ours: fail
      handoff(2, { target_domain_module_id: null }), // outbound, opposite side: note only
      handoff(3, { source_domain_id: HCM, target_domain_id: DOM, target_domain_module_id: null }), // inbound, ours: fail
      handoff(4, { source_domain_id: HCM, target_domain_id: DOM, source_domain_module_id: null }), // inbound, opposite side
    ];
    const fs = checkHandoffModuleAttribution({ domainId: DOM, hasModules: true, handoffs: hs });
    expect(sig(fs)).toEqual(["fail:1", "fail:3", "pass:"]);
    expect(fs[2].detail).toContain("1 outbound without target_domain_module_id, 1 inbound without source_domain_module_id");
  });
});

describe("B11 alias presence", () => {
  test("a master with no alias warns", () => {
    expect(sig(checkAliasPresence([master(1), master(2)], [{ data_object_id: 1 }]))).toEqual(["warn:2"]);
    expect(results(checkAliasPresence([master(1)], [{ data_object_id: 1 }]))).toEqual(["pass"]);
  });
});

describe("B12 lifecycle coverage + M4 shape", () => {
  const good = [state(1, { is_initial: true, state_order: 1 }), state(2, { state_name: "closed", is_terminal: true, state_order: 2 })];
  test("a workflow master with a well-shaped machine passes; a catalog master needs no states", () => {
    expect(results(checkLifecycleCoverage([master(1), master(2, { entity_type: "catalog" })], good))).toEqual(["pass"]);
  });
  test("an operational_workflow master with no states fails", () => {
    expect(sig(checkLifecycleCoverage([master(1), master(3)], good))).toEqual(["fail:3"]);
  });
  test("two initials, no terminal, or a duplicate state_order fail the shape", () => {
    const bad = [
      state(1, { data_object_id: 1, is_initial: true, state_order: 1 }),
      state(2, { data_object_id: 1, is_initial: true, state_order: 1 }),
    ];
    const fs = checkLifecycleCoverage([master(1)], bad);
    expect(sig(fs)).toEqual(["fail:1"]);
    expect(fs[0].detail).toContain("2 initial states, no terminal state, duplicate state_order 1");
  });
});

describe("B13 entity_type classified", () => {
  test("unclassified and null fail; typed passes", () => {
    expect(isUnclassified(null)).toBe(true);
    expect(isUnclassified("unclassified")).toBe(true);
    expect(isUnclassified("catalog")).toBe(false);
    expect(sig(checkEntityTypeClassified([master(1), master(2, { entity_type: "unclassified" }), master(3, { entity_type: null })]))).toEqual(["fail:2,3"]);
  });
});

describe("B14 statute-named masters", () => {
  const names: Record<number, string> = { 1: "job_applications", 2: "fcra_disclosures", 3: "eeo_self_identifications", 4: "gdpr_consents" };
  test("master + required rows named for a statute warn; optional ones pass", () => {
    const fs = checkConditionalMasters(
      [
        { domain_module_id: 1, data_object_id: 1, role: "master", is_install_optional: false },
        { domain_module_id: 1, data_object_id: 2, role: "master", is_install_optional: false },
        { domain_module_id: 1, data_object_id: 3, role: "master", is_install_optional: false },
        { domain_module_id: 1, data_object_id: 4, role: "master", is_install_optional: true },
      ],
      { nameOf: (id) => names[id] },
    );
    expect(sig(fs)).toEqual(["warn:2,3"]);
    expect(conditionalToken("candidate_adverse_action_notices")).toBe("adverse_action");
    expect(conditionalToken("job_offers")).toBeNull();
  });
});

describe("B15 personal content on non-operational masters", () => {
  test("catalog / junction / computed with has_personal_content fails; operational passes", () => {
    const fs = checkPersonalContentClass([
      master(1, { has_personal_content: true }),
      master(2, { entity_type: "catalog", has_personal_content: true }),
      master(3, { entity_type: "junction", has_personal_content: false }),
    ]);
    expect(sig(fs)).toEqual(["fail:2"]);
  });
});

describe("B16 British-English spelling", () => {
  test("the curated map fixes BE forms and keeps AE-native -ise words", () => {
    expect(fixBritishSpelling("Organise the Catalogue; enterprise advertise").fixed).toBe("Organize the Catalog; enterprise advertise");
    expect(fixBritishSpelling("CANCELLED behaviour").hits).toEqual(["CANCELLED->CANCELED", "behaviour->behavior"]);
    expect(fixBritishSpelling("analyses of the cancellation").hits).toEqual([]);
  });
  test("an AUTOFIX column fails; an identifier column is report-only (warn)", () => {
    const fs = checkBritishSpelling([
      { table: "data_objects", rows: [{ id: 7, data_object_name: "software_licenses", description: "Tracks the licence lifecycle" }] },
      { table: "domain_modules", rows: [{ id: 12, domain_module_code: "LMS-CATALOGUE", description: "Course catalog" }] },
      { table: "domains", rows: [{ id: 56, description: "Recruiting, American spelling" }] },
    ]);
    expect(sig(fs)).toEqual(["fail:data_objects:7", "warn:domain_modules:12"]);
  });
  test("like the sweep, a BE token inside a snake_case identifier is not matched (\\b treats _ as a word char)", () => {
    expect(fixBritishSpelling("licence_records").hits).toEqual([]);
  });
  test("a clean scope passes", () => {
    expect(results(checkBritishSpelling([{ table: "domains", rows: [{ id: 56, description: "Organize the hiring program" }] }]))).toEqual(["pass"]);
  });
});
