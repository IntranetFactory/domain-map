// Tests for scripts/lib/catalog_invariants.ts: one block per invariant on tiny literal rows, plus
// the loader pre-flight error / warning split. Pure, offline: no catalog, no cache file.

import { describe, expect, test } from "bun:test";
import {
  checkAccountableAlsoResponsible,
  checkAuthorActionGates,
  checkDuplicateHandoffs,
  checkEventStates,
  checkGatedStatesWired,
  checkProcessRaci,
  checkRelationshipShape,
  checkUserEdges,
  preflightHandoffs,
  preflightProcessRaci,
  preflightRelationships,
  type InvariantFinding,
  type RelationshipRow,
} from "../catalog_invariants.ts";

const USERS = 748;
const rules = (fs: InvariantFinding[]) => fs.map((f) => `${f.id}:${f.rule}:${f.severity}:${f.rows.join(",")}`);

const rel = (over: Partial<RelationshipRow> & { id: number | string }): RelationshipRow => ({
  data_object_id: 1,
  related_data_object_id: 2,
  relationship_type: "one_to_many",
  relationship_kind: "reference",
  relationship_verb: "has",
  inverse_verb: "belongs to",
  owner_side: "source",
  ...over,
});

describe("B6b relationship shape", () => {
  test("canonical one_to_many with inverse verb passes", () => {
    expect(checkRelationshipShape([rel({ id: 1 })])).toEqual([]);
  });
  test("empty inverse_verb warns (m4b)", () => {
    expect(rules(checkRelationshipShape([rel({ id: 2, inverse_verb: " " })]))).toEqual(["B6b:inverse_verb_empty:warn:2"]);
  });
  test("one_to_many with owner_side=target warns (m5), e.g. ATS edge 810", () => {
    expect(rules(checkRelationshipShape([rel({ id: 810, owner_side: "target" })]))).toEqual(["B6b:owner_side_not_parent:warn:810"]);
  });
  test("many_to_one names the target as parent", () => {
    expect(checkRelationshipShape([rel({ id: 3, relationship_type: "many_to_one", owner_side: "target" })])).toEqual([]);
    expect(rules(checkRelationshipShape([rel({ id: 4, relationship_type: "many_to_one", owner_side: "source" })]))).toEqual(["B6b:owner_side_not_parent:warn:4"]);
  });
  test("one_to_one and many_to_many are not decided by cardinality", () => {
    expect(checkRelationshipShape([rel({ id: 5, relationship_type: "one_to_one", owner_side: "target" }), rel({ id: 6, relationship_type: "many_to_many", relationship_kind: "association", owner_side: "target" })])).toEqual([]);
  });
  test("composition child mastered in an unrelated domain warns (M7 coherence)", () => {
    const masters = new Map<number, Set<number>>([[1, new Set([56])], [2, new Set([191])], [3, new Set([56])]]);
    const comp = (id: number, child: number) => rel({ id, related_data_object_id: child, relationship_kind: "composition" });
    expect(rules(checkRelationshipShape([comp(7, 2)], { masterDomainsByDataObject: masters }))).toEqual(["B6b:composition_child_mastered_elsewhere:warn:7"]);
    expect(checkRelationshipShape([comp(8, 3)], { masterDomainsByDataObject: masters })).toEqual([]); // same domain
    expect(checkRelationshipShape([comp(9, 99)], { masterDomainsByDataObject: masters })).toEqual([]); // unmastered dependent
  });
});

describe("B7b users edges", () => {
  test("many_to_many reference to users fails (ATS 822)", () => {
    const r = rel({ id: 822, related_data_object_id: USERS, relationship_type: "many_to_many", relationship_verb: "has owning recruiter" });
    expect(rules(checkUserEdges([r], USERS))).toEqual(["B7b:many_to_many_reference:fail:822"]);
  });
  test("users as the source side is checked too", () => {
    const r = rel({ id: 30, data_object_id: USERS, related_data_object_id: 5, relationship_type: "many_to_many" });
    expect(rules(checkUserEdges([r], USERS))).toEqual(["B7b:many_to_many_reference:fail:30"]);
  });
  test("many_to_many association and one_to_many reference to users pass", () => {
    const a = rel({ id: 31, related_data_object_id: USERS, relationship_type: "many_to_many", relationship_kind: "association" });
    const b = rel({ id: 32, related_data_object_id: USERS, relationship_verb: "has owner" });
    expect(checkUserEdges([a, b], USERS)).toEqual([]);
  });
  test("a verb naming two roles warns (ATS 823), once per row", () => {
    const r = rel({ id: 823, related_data_object_id: USERS, relationship_verb: "has coordinator and panelists", inverse_verb: "coordinates or sits on" });
    expect(rules(checkUserEdges([r], USERS))).toEqual(["B7b:two_role_verb:warn:823"]);
  });
  test("edges that do not touch users are ignored", () => {
    expect(checkUserEdges([rel({ id: 33, relationship_type: "many_to_many", relationship_verb: "links and tags" })], USERS)).toEqual([]);
  });
});

describe("B9c event states", () => {
  const states = [
    { data_object_id: 11, state_name: "approved" },
    { data_object_id: 11, state_name: "Accepted" },
  ];
  test("to_state resolving to a lifecycle state (case-insensitive) passes", () => {
    expect(checkEventStates([{ id: 1, event_name: "job_offer.accepted", data_object_id: 11, event_category: "lifecycle", to_state: "accepted" }], states)).toEqual([]);
  });
  test("to_state matching no state warns (ATS event 81, 'signed')", () => {
    expect(rules(checkEventStates([{ id: 81, event_name: "job_offer.signed", data_object_id: 11, event_category: "lifecycle", to_state: "signed" }], states))).toEqual(["B9c:unresolved_to_state:warn:81"]);
  });
  test("blank to_state warns on lifecycle / state_change, not on signal / threshold", () => {
    const evs = [
      { id: 2, event_name: "a.x", data_object_id: 11, event_category: "lifecycle", to_state: "" },
      { id: 3, event_name: "a.y", data_object_id: 11, event_category: "state_change", to_state: null },
      { id: 4, event_name: "a.z", data_object_id: 11, event_category: "signal", to_state: "" },
      { id: 5, event_name: "a.w", data_object_id: 11, event_category: "threshold", to_state: "" },
    ];
    expect(rules(checkEventStates(evs, states))).toEqual(["B9c:blank_to_state:warn:2", "B9c:blank_to_state:warn:3"]);
  });
  test("a non-blank to_state on an entity with no lifecycle warns", () => {
    expect(rules(checkEventStates([{ id: 6, event_name: "b.done", data_object_id: 12, event_category: "signal", to_state: "done" }], states))).toEqual(["B9c:unresolved_to_state:warn:6"]);
  });
});

describe("B9f duplicate handoffs", () => {
  const h = (id: number, over: object = {}) => ({ id, trigger_event_id: 81, source_domain_id: 56, target_domain_id: 60, source_domain_module_id: 6, target_domain_module_id: 85, data_object_id: id, ...over });
  test("same event + source module + target module warns (ATS 121 / 398)", () => {
    expect(rules(checkDuplicateHandoffs([h(121), h(398)]))).toEqual(["B9f:same_event_same_modules:warn:121,398"]);
  });
  test("a different target module or event is not a duplicate; null events are ignored", () => {
    expect(checkDuplicateHandoffs([h(1), h(2, { target_domain_module_id: 86 }), h(3, { trigger_event_id: 82 }), h(4, { trigger_event_id: null }), h(5, { trigger_event_id: null })])).toEqual([]);
  });
});

describe("E4 RACI on gated processes", () => {
  const raci = [
    { id: 1, process_id: 100, raci: "responsible", actor_role_id: 1 },
    { id: 2, process_id: 100, raci: "accountable", actor_role_id: 2 },
    { id: 3, process_id: 200, raci: "accountable", actor_role_id: 2 },
    { id: 4, process_id: 300, raci: "responsible", actor_role_id: 1 },
    { id: 5, process_id: 400, raci: "R", actor_role_id: 1 },
    { id: 6, process_id: 400, raci: "A", actor_role_id: 2 },
    { id: 7, process_id: 400, raci: "A", actor_role_id: 3 },
  ];
  test(">= 1 R and exactly 1 A passes", () => {
    expect(checkProcessRaci([100], raci)).toEqual([]);
  });
  test("no Responsible, no Accountable and two Accountable each fail", () => {
    expect(rules(checkProcessRaci([200, 300, 400, 500], raci))).toEqual([
      "E4:no_responsible:fail:200",
      "E4:no_accountable:fail:300",
      "E4:multiple_accountable:fail:400",
      "E4:no_responsible:fail:500",
      "E4:no_accountable:fail:500",
    ]);
  });
});

describe("E4b gated states wire a process", () => {
  test("a gated state with no process_id warns (ATS do_not_hire / rescinded); wired and ungated pass", () => {
    const states = [
      { id: 207, data_object_id: 3, state_name: "do_not_hire", requires_permission: true, permission_verb_override: "flag_do_not_hire", process_id: null, domain_module_id: 1 },
      { id: 226, data_object_id: 11, state_name: "approved", requires_permission: true, permission_verb_override: "approve_offer", process_id: 1017, domain_module_id: 6 },
      { id: 228, data_object_id: 11, state_name: "accepted", requires_permission: false, process_id: null },
    ];
    expect(rules(checkGatedStatesWired(states))).toEqual(["E4b:gated_state_no_process:warn:207"]);
  });
});

describe("E4c Accountable is not also Responsible", () => {
  test("the same persona as A and R warns; separated personas pass", () => {
    const raci = [
      { process_id: 1, raci: "responsible", actor_role_id: 9 },
      { process_id: 1, raci: "accountable", actor_role_id: 9 },
      { process_id: 2, raci: "responsible", actor_role_id: 9 },
      { process_id: 2, raci: "accountable", actor_role_id: 10 },
    ];
    expect(rules(checkAccountableAlsoResponsible([1, 2], raci))).toEqual(["E4c:accountable_is_responsible:warn:1"]);
  });
});

describe("E4d author-action gates", () => {
  test("submit_* overrides and a default 'submitted' verb warn; approval verbs and ungated states pass", () => {
    const states = [
      { id: 210, data_object_id: 9, state_name: "submitted", requires_permission: true, permission_verb_override: "submit_scorecard", process_id: 1014 },
      { id: 211, data_object_id: 9, state_name: "submitted", requires_permission: true, permission_verb_override: "", process_id: null },
      { id: 226, data_object_id: 11, state_name: "approved", requires_permission: true, permission_verb_override: "approve_offer", process_id: 1017 },
      { id: 1496, data_object_id: 1004, state_name: "in_review", requires_permission: false, permission_verb_override: "submit_template_for_review" },
      { id: 5, data_object_id: 1, state_name: "submission_window_closed", requires_permission: true, permission_verb_override: "close_submissions" },
    ];
    expect(rules(checkAuthorActionGates(states))).toEqual(["E4d:author_action_gate:warn:210", "E4d:author_action_gate:warn:211"]);
  });
});

describe("loader pre-flight", () => {
  test("relationships: B7b many_to_many reference users edge is an error; B6b and two-role verbs only warn", () => {
    const res = preflightRelationships(
      [
        rel({ id: "a", related_data_object_id: USERS, relationship_type: "many_to_many", relationship_verb: "has panelists" }),
        rel({ id: "b", related_data_object_id: USERS, relationship_verb: "has recruiter and hiring manager" }),
        rel({ id: "c", owner_side: "target", inverse_verb: "" }),
      ],
      { usersId: USERS },
    );
    expect(res.errors.length).toBe(1);
    expect(res.errors[0]).toContain("B7b many_to_many_reference [a]");
    expect(res.warnings.map((w) => w.split(" [")[0]).sort()).toEqual(["B6b inverse_verb_empty", "B6b owner_side_not_parent", "B7b two_role_verb"]);
  });
  test("process_raci: a new Accountable on a process that already has one is an error", () => {
    const res = preflightProcessRaci([{ process_id: 1, raci: "accountable", actor_role_id: 5 }], [{ process_id: 1, raci: "accountable", actor_role_id: 4 }, { process_id: 1, raci: "responsible", actor_role_id: 3 }]);
    expect(res.errors.length).toBe(1);
    expect(res.errors[0]).toContain("E4 multiple_accountable [1]");
  });
  test("process_raci: two new Accountable rows for one process are an error", () => {
    const res = preflightProcessRaci([{ process_id: 2, raci: "A", actor_role_id: 5 }, { process_id: 2, raci: "A", actor_role_id: 6 }, { process_id: 2, raci: "R", actor_role_id: 7 }], []);
    expect(res.errors.length).toBe(1);
  });
  test("process_raci: re-posting the existing Accountable row is idempotent, not a second A", () => {
    const res = preflightProcessRaci([{ process_id: 1, raci: "accountable", actor_role_id: 4 }], [{ process_id: 1, raci: "accountable", actor_role_id: 4 }, { process_id: 1, raci: "responsible", actor_role_id: 3 }]);
    expect(res.errors).toEqual([]);
    expect(res.warnings).toEqual([]);
  });
  test("process_raci: zero Accountable after the batch only warns (Responsible may load first); A also R warns", () => {
    const r1 = preflightProcessRaci([{ process_id: 3, raci: "responsible", actor_role_id: 1 }], []);
    expect(r1.errors).toEqual([]);
    expect(r1.warnings.length).toBe(1);
    expect(r1.warnings[0]).toContain("E4 no_accountable [3]");
    const r2 = preflightProcessRaci([{ process_id: 4, raci: "accountable", actor_role_id: 1 }, { process_id: 4, raci: "responsible", actor_role_id: 1 }], []);
    expect(r2.errors).toEqual([]);
    expect(r2.warnings.some((w) => w.startsWith("E4c accountable_is_responsible [4]"))).toBe(true);
  });
  test("handoffs: a duplicate against an existing row warns; duplicates only among existing rows are out of scope", () => {
    const base = { trigger_event_id: 81, source_domain_id: 56, target_domain_id: 60, source_domain_module_id: 6, target_domain_module_id: 85 };
    const res = preflightHandoffs([{ ...base, data_object_id: 11 }], [{ ...base, id: 121, data_object_id: 157 }]);
    expect(res.errors).toEqual([]);
    expect(res.warnings.length).toBe(1);
    expect(res.warnings[0]).toContain("B9f same_event_same_modules [incoming0, 121]");
    expect(preflightHandoffs([{ ...base, trigger_event_id: 99 }], [{ ...base, id: 121 }, { ...base, id: 398 }]).warnings).toEqual([]);
  });
});
