// Tests for scripts/lib/blueprint_invariants.ts: one block per derived-result invariant (R1-R9) on
// tiny fixtures, then the invariants over every module of the starter-shaped scenario
// (fixtures/hiring_starter_scenario.ts). R1-R3 guard rules the derivation already enforces, so their
// failing cases mutate a derived model by hand.

import { describe, expect, test } from "bun:test";
import { deriveModuleModel, type BlueprintModel } from "../blueprint_derive";
import { checkModel, grantedGates, notifiedEvents, RULE_IDS, RULES, type CheckModelOptions, type ModelFinding } from "../blueprint_invariants";
import {
  buildFixture,
  dataObject,
  dmdoRow,
  domain,
  handoffRow,
  lifecycleState,
  module,
  processRow,
  raciRow,
  relationshipRow,
  triggerEvent,
  usersObject,
  type Fixture,
} from "./fixtures/build";
import { hiringStarterScenario, IDS } from "./fixtures/hiring_starter_scenario";

// ---------- a tiny help desk: one module mastering tickets ----------

const D = 1, OTHER_D = 2, M = 10, X = 11, OTHER_M = 12, USERS = 100, TICKETS = 101, CHANGES = 102;
const AGENT = 7, LEAD = 8, WATCHER = 9, MANAGER = 10;

type HelpDeskOpts = {
  module?: Record<string, unknown>;
  lifecycle?: any[];
  processRaci?: any[];
  processes?: any[];
  triggerEvents?: any[];
  relationships?: any[];
  handoffs?: any[];
  businessFunctionDomains?: any[];
  personalContent?: boolean;
};

function helpDeskFixture(opts: HelpDeskOpts = {}): Fixture {
  return buildFixture({
    domains: [domain({ id: D, domain_code: "HELPDESK" }), domain({ id: OTHER_D, domain_code: "CHANGE" })],
    modules: [
      module({ id: M, domain_module_code: "HELPDESK-CORE", domain_id: D, ...(opts.module ?? {}) }),
      module({ id: X, domain_module_code: "HELPDESK-ESCALATION", domain_id: D }),
      module({ id: OTHER_M, domain_module_code: "CHANGE-MGMT", domain_id: OTHER_D }),
    ],
    dataObjects: [
      usersObject(USERS),
      dataObject({ id: TICKETS, data_object_name: "tickets", singular_label: "Ticket", plural_label: "Tickets", entity_type: "operational_workflow", has_personal_content: opts.personalContent ?? false }),
      dataObject({ id: CHANGES, data_object_name: "change_requests", singular_label: "Change Request", plural_label: "Change Requests", entity_type: "operational_workflow" }),
    ],
    dmdo: [dmdoRow(M, TICKETS, "master"), dmdoRow(OTHER_M, CHANGES, "master")],
    lifecycle: opts.lifecycle ?? [],
    relationships: opts.relationships ?? [],
    handoffs: opts.handoffs ?? [],
    personas: [
      { id: AGENT, persona_code: "SUPPORT-AGENT" },
      { id: LEAD, persona_code: "SUPPORT-LEAD" },
      { id: WATCHER, persona_code: "SUPPORT-WATCHER" },
      { id: MANAGER, persona_code: "SUPPORT-MANAGER" },
    ],
    processRaci: opts.processRaci ?? [],
    processes: opts.processes ?? [],
    triggerEvents: opts.triggerEvents ?? [],
    businessFunctions: [{ id: 1, business_function_name: "Customer Service" }, { id: 2, business_function_name: "IT" }, { id: 3, business_function_name: "Finance" }],
    businessFunctionDomains: opts.businessFunctionDomains ?? [],
  });
}

function helpDesk(opts: HelpDeskOpts = {}, check: Omit<CheckModelOptions, "ctx"> & { noCtx?: boolean } = {}): { model: BlueprintModel; findings: ModelFinding[] } {
  const fx = helpDeskFixture(opts);
  const model = deriveModuleModel(fx.index.modulesById.get(M)!, fx.ctx);
  return { model, findings: checkModel(model, { ...(check.noCtx ? {} : { ctx: fx.ctx }), skills: check.skills }) };
}

const of = (findings: ModelFinding[], id: string) => findings.filter((f) => f.id === id);
const shape = (findings: ModelFinding[]) => findings.map((f) => `${f.id} ${f.result} ${f.module} [${f.rows.join(", ")}]`);

const open = lifecycleState({ id: 1, data_object_id: TICKETS, state_name: "open", state_order: 1, is_initial: true });
const closed = lifecycleState({ id: 9, data_object_id: TICKETS, state_name: "closed", state_order: 9, is_terminal: true });
const gated = (id: number, state_name: string, state_order: number, p: Record<string, unknown> = {}) =>
  lifecycleState({ id, data_object_id: TICKETS, state_name, state_order, requires_permission: true, domain_module_id: M, ...p });
const proc = processRow(500, "resolve_tickets");
const proc2 = processRow(501, "escalate_tickets");

describe("realization parsers", () => {
  test("grantedGates and notifiedEvents read the realization text", () => {
    expect(grantedGates("grant gates [a:x, a:y] + the gated entities' write tier")).toEqual(["a:x", "a:y"]);
    expect(grantedGates("⚠ no gate wired")).toBeNull();
    expect(notifiedEvents("notify on trigger_events [ticket.resolved]")).toEqual(["ticket.resolved"]);
    expect(notifiedEvents("⚠ no event wired")).toEqual([]);
  });

  test("every finding carries its rule's severity", () => {
    expect(RULE_IDS).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9"]);
    const fx = hiringStarterScenario();
    for (const m of fx.index.modules) {
      for (const f of checkModel(deriveModuleModel(m, fx.ctx), { ctx: fx.ctx })) expect(f.result).toBe(RULES[f.id].severity);
    }
  });
});

// ---------- R1 ----------

describe("R1: functional-ownership roles exist among the baseline roles", () => {
  const bfd = [
    { business_function_id: 1, domain_id: D, responsibility_type: "owner" },
    { business_function_id: 2, domain_id: D, responsibility_type: "contributor" },
    { business_function_id: 3, domain_id: D, responsibility_type: "consumer" },
  ];

  test("owner / contributor / consumer resolve to the admin / manager / viewer roles", () => {
    expect(of(helpDesk({ businessFunctionDomains: bfd }).findings, "R1")).toEqual([]);
  });

  test("an owner function with no admin role fails, naming the missing role", () => {
    const fx = helpDeskFixture({ businessFunctionDomains: bfd });
    const model = deriveModuleModel(fx.index.modulesById.get(M)!, fx.ctx);
    model.perModule[0].baselineRoles = model.perModule[0].baselineRoles.filter((r) => !r.code.endsWith("_admin"));
    const r1 = of(checkModel(model, { ctx: fx.ctx }), "R1");
    expect(shape(r1)).toEqual(["R1 fail HELPDESK-CORE [helpdesk-core_admin, Customer Service]"]);
  });

  test("a role whose grant differs from the named tier fails", () => {
    const fx = helpDeskFixture({ businessFunctionDomains: bfd });
    const model = deriveModuleModel(fx.index.modulesById.get(M)!, fx.ctx);
    model.perModule[0].baselineRoles = model.perModule[0].baselineRoles.map((r) => (r.code.endsWith("_viewer") ? { ...r, grant: "helpdesk-core:manage" } : r));
    expect(shape(of(checkModel(model, { ctx: fx.ctx }), "R1"))).toEqual(["R1 fail HELPDESK-CORE [helpdesk-core_viewer, Finance]"]);
  });

  test("an unknown responsibility type maps to no role", () => {
    const r1 = of(helpDesk({ businessFunctionDomains: [{ business_function_id: 1, domain_id: D, responsibility_type: "sponsor" }] }).findings, "R1");
    expect(shape(r1)).toEqual(["R1 fail HELPDESK-CORE [Customer Service]"]);
  });
});

// ---------- R2 / R3 ----------

describe("R2 / R3: RACI gate lists", () => {
  const opts: HelpDeskOpts = {
    lifecycle: [open, gated(2, "resolved", 2, { process_id: 500 }), closed],
    processes: [proc],
    processRaci: [raciRow(1, 500, AGENT, "responsible"), raciRow(2, 500, LEAD, "accountable")],
  };

  test("the derived Accountable row grants only minted gates, each once", () => {
    const { findings } = helpDesk(opts);
    expect([...of(findings, "R2"), ...of(findings, "R3")]).toEqual([]);
  });

  test("a gate realized by another module is neither minted nor granted here", () => {
    const { model, findings } = helpDesk({
      ...opts,
      lifecycle: [open, gated(2, "resolved", 2, { process_id: 500, domain_module_id: X }), closed],
    });
    expect(model.perModule[0].gates).toEqual([]);
    expect([...of(findings, "R2"), ...of(findings, "R3"), ...of(findings, "R4")]).toEqual([]);
  });

  test("a shared gate code (two states, one process) is listed once", () => {
    const { model, findings } = helpDesk({
      ...opts,
      lifecycle: [open, gated(2, "resolved", 2, { process_id: 500, permission_verb_override: "close_ticket" }), gated(3, "canceled", 3, { process_id: 500, permission_verb_override: "close_ticket" }), closed],
    });
    expect(model.perModule[0].raci.find((g) => g.raci === "accountable")?.realization).toBe("grant gates [helpdesk-core:close_ticket] + the gated entities' write tier");
    expect(of(findings, "R3")).toEqual([]);
  });

  test("a granted gate 8.1 does not mint fails R2; a gate listed twice fails R3", () => {
    const fx = helpDeskFixture(opts);
    const model = deriveModuleModel(fx.index.modulesById.get(M)!, fx.ctx);
    const a = model.perModule[0].raci.find((g) => g.raci === "accountable")!;
    a.realization = "grant gates [helpdesk-core:resolved_ticket, helpdesk-core:resolved_ticket, other-module:hire] + the gated entities' write tier";
    const findings = checkModel(model, { ctx: fx.ctx });
    expect(shape(of(findings, "R2"))).toEqual(["R2 fail HELPDESK-CORE [other-module:hire, SUPPORT-LEAD]"]);
    expect(shape(of(findings, "R3"))).toEqual(["R3 fail HELPDESK-CORE [helpdesk-core:resolved_ticket, SUPPORT-LEAD]"]);
  });
});

// ---------- R4 ----------

describe("R4: one Accountable row per gated process, one holder per wired gate", () => {
  test("one Accountable row holding the gate passes", () => {
    const { findings } = helpDesk({
      lifecycle: [open, gated(2, "resolved", 2, { process_id: 500 }), closed],
      processes: [proc],
      processRaci: [raciRow(1, 500, AGENT, "responsible"), raciRow(2, 500, LEAD, "accountable")],
    });
    expect(of(findings, "R4")).toEqual([]);
  });

  test("two Accountable rows on a gated process fail once, per process", () => {
    const { findings } = helpDesk({
      lifecycle: [open, gated(2, "resolved", 2, { process_id: 500 }), closed],
      processes: [proc],
      processRaci: [raciRow(1, 500, AGENT, "accountable"), raciRow(2, 500, LEAD, "accountable")],
    });
    expect(shape(of(findings, "R4"))).toEqual(["R4 fail HELPDESK-CORE [resolve_tickets, helpdesk-core:resolved_ticket]"]);
    expect(of(findings, "R4")[0].detail).toContain("2 Accountable rows");
  });

  test("a gated process with no Accountable row fails", () => {
    const { findings } = helpDesk({
      lifecycle: [open, gated(2, "resolved", 2, { process_id: 500 }), closed],
      processes: [proc],
      processRaci: [raciRow(1, 500, AGENT, "responsible")],
    });
    expect(shape(of(findings, "R4"))).toEqual(["R4 fail HELPDESK-CORE [resolve_tickets, helpdesk-core:resolved_ticket]"]);
    expect(of(findings, "R4")[0].detail).toContain("no Accountable row");
  });

  test("a gate wired to two processes is held by two Accountable rows and fails per gate", () => {
    const { findings } = helpDesk({
      lifecycle: [open, gated(2, "resolved", 2, { process_id: 500, permission_verb_override: "close_ticket" }), gated(3, "escalated", 3, { process_id: 501, permission_verb_override: "close_ticket" }), closed],
      processes: [proc, proc2],
      processRaci: [raciRow(1, 500, LEAD, "accountable"), raciRow(2, 501, MANAGER, "accountable")],
    });
    expect(shape(of(findings, "R4"))).toEqual(["R4 fail HELPDESK-CORE [helpdesk-core:close_ticket]"]);
    expect(of(findings, "R4")[0].detail).toContain("held by 2 Accountable rows");
  });

  test("an unwired gate is not an R4 finding (gated needs no process; E4b reports the data)", () => {
    const { model, findings } = helpDesk({ lifecycle: [open, gated(2, "reopened", 2), closed] });
    expect(model.perModule[0].gates.map((g) => [g.code, g.processIds.length])).toEqual([["helpdesk-core:reopened_ticket", 0]]);
    expect(of(findings, "R4")).toEqual([]);
  });

  test("without ctx only the per-gate half runs, and still catches a missing holder", () => {
    const { findings } = helpDesk(
      { lifecycle: [open, gated(2, "resolved", 2, { process_id: 500 }), closed], processes: [proc], processRaci: [raciRow(1, 500, AGENT, "responsible")] },
      { noCtx: true },
    );
    expect(shape(of(findings, "R4"))).toEqual(["R4 fail HELPDESK-CORE [helpdesk-core:resolved_ticket]"]);
  });
});

// ---------- R5 ----------

describe("R5: Informed rows resolve to trigger_events", () => {
  const base: HelpDeskOpts = {
    lifecycle: [open, gated(2, "resolved", 2, { process_id: 500 }), closed],
    processes: [proc],
    processRaci: [raciRow(1, 500, AGENT, "responsible"), raciRow(2, 500, LEAD, "accountable"), raciRow(3, 500, WATCHER, "informed")],
  };

  test("an Informed row with an event on the gated entity passes", () => {
    const { findings } = helpDesk({ ...base, triggerEvents: [triggerEvent({ id: 1, event_name: "ticket.resolved", data_object_id: TICKETS, to_state: "resolved" })] });
    expect(of(findings, "R5")).toEqual([]);
  });

  test("an Informed row with no event warns, naming the persona and the process", () => {
    expect(shape(of(helpDesk(base).findings, "R5"))).toEqual(["R5 warn HELPDESK-CORE [SUPPORT-WATCHER, resolve_tickets]"]);
  });
});

// ---------- R6 ----------

describe("R6: section 6 handoff events resolve to_state", () => {
  const lifecycle = [open, lifecycleState({ id: 2, data_object_id: TICKETS, state_name: "resolved", state_order: 2 }), closed];
  const out = (id: number, event: Record<string, unknown> & { event_name: string }, p: Record<string, unknown> = {}) =>
    handoffRow({ id, source_domain_id: D, target_domain_id: OTHER_D, source_domain_module_id: M, target_domain_module_id: OTHER_M, data_object_id: TICKETS, payload: "tickets", event, ...p });

  test("a lifecycle event whose to_state is a state, and a signal with no to_state, pass", () => {
    const { findings } = helpDesk({
      lifecycle,
      handoffs: [out(1, { event_name: "ticket.resolved", to_state: "resolved" }), out(2, { event_name: "ticket.breached", event_category: "signal" })],
    });
    expect(of(findings, "R6")).toEqual([]);
  });

  test("a blank to_state and an unknown to_state warn, one finding per problem with the handoff ids", () => {
    const { findings } = helpDesk({
      lifecycle,
      handoffs: [
        out(1, { event_name: "ticket.escalated" }),
        out(3, { event_name: "ticket.escalated" }, { target_domain_module_id: X, target_domain_id: D }),
        out(2, { event_name: "ticket.archived", event_category: "state_change", to_state: "archived" }),
      ],
    });
    const r6 = of(findings, "R6");
    expect(shape(r6).sort()).toEqual(["R6 warn HELPDESK-CORE [1, 3]", "R6 warn HELPDESK-CORE [2]"]);
    expect(r6.map((f) => f.detail).join("\n")).toContain("'ticket.archived' to_state 'archived' matches no lifecycle state of tickets");
  });

  test("with ctx the event's own entity decides, even when it is not the payload", () => {
    const opts: HelpDeskOpts = {
      lifecycle: [...lifecycle, lifecycleState({ id: 20, data_object_id: CHANGES, state_name: "approved", state_order: 1, is_initial: true })],
      triggerEvents: [triggerEvent({ id: 77, event_name: "change_request.approved", data_object_id: CHANGES, to_state: "approved" })],
      handoffs: [out(1, { event_name: "change_request.approved", to_state: "approved" }, { trigger_event_id: 77 })],
    };
    expect(of(helpDesk(opts).findings, "R6")).toEqual([]);
    expect(shape(of(helpDesk(opts, { noCtx: true }).findings, "R6"))).toEqual(["R6 warn HELPDESK-CORE [1]"]);
  });
});

// ---------- R7 ----------

describe("R7: the description agrees with the derived counts", () => {
  const withGates: HelpDeskOpts = { lifecycle: [open, gated(2, "resolved", 2, { process_id: 500 }), closed], processes: [proc], processRaci: [raciRow(2, 500, LEAD, "accountable")] };
  const describe_ = (description: string, opts: HelpDeskOpts = withGates, skills?: CheckModelOptions["skills"]) =>
    of(helpDesk({ ...opts, module: { description } }, { skills }).findings, "R7");

  test("a claim of no gates while 8.1 mints one warns (the Hiring Starter case)", () => {
    const r7 = describe_("Ships three baseline permissions and one system skill; no workflow gates, no requisition approvals.");
    expect(r7.map((f) => f.detail)).toEqual([
      'description says "no workflow gates", but 8.1 mints 1 workflow gate(s): `helpdesk-core:resolved_ticket`',
      'description says "one system skill", but skills attach to domains, not modules (SKILL.md F1): the module carries 0 system skill(s) of its own',
    ]);
    expect(r7[0].rows).toEqual(["description", "helpdesk-core:resolved_ticket"]);
  });

  test("the skill clause names the domain's skill count when known, and accepts a matching system count", () => {
    expect(describe_("Ships one system skill.", withGates, { domain: 1 })[0].detail).toContain("its domain has 1 domain skill(s)");
    expect(describe_("Ships one system skill.", withGates, { system: 1 })).toEqual([]);
    expect(describe_("Backed by one domain skill.", withGates, { domain: 1 })).toEqual([]);
    expect(describe_("Backed by two domain skills.", withGates, { domain: 1 }).length).toBe(1);
  });

  test("a wrong gate count, and a gate claim on a module without gates, warn", () => {
    expect(describe_("Adds two approval gates.").length).toBe(1);
    expect(describe_("Adds one approval gate.")).toEqual([]);
    expect(describe_("Approval gates keep changes safe.", {}).length).toBe(1);
    expect(describe_("It gates the in_negotiation -> approved lifecycle transition.", {}).length).toBe(1);
    expect(describe_("Approval gates keep changes safe.")).toEqual([]);
  });

  test("a baseline-permission count is checked; unrelated wording is not read as a claim", () => {
    expect(describe_("Ships three baseline permissions.")).toEqual([]);
    expect(describe_("Ships four baseline permissions.").length).toBe(1);
    expect(describe_("Skill-based assignment; learners build two skills; a qualification-gated supplier list.", {})).toEqual([]);
  });

  test("the catalog copy fields are read too", () => {
    const r7 = of(helpDesk({ ...withGates, module: { catalog_description: "No approval gates to slow you down." } }).findings, "R7");
    expect(r7.map((f) => f.rows[0])).toEqual(["catalog_description"]);
  });
});

// ---------- R8 ----------

describe("R8: row-scope rules have a single-person relationship to users", () => {
  const relationship = (p: Record<string, unknown>) => relationshipRow({ id: 1, data_object_id: USERS, related_data_object_id: TICKETS, relationship_verb: "is assigned", ...p });
  const r8 = (relationships: any[]) => of(helpDesk({ personalContent: true, relationships }).findings, "R8");

  test("users on the one side of a one_to_many, or a one_to_one, passes", () => {
    expect(r8([relationship({})])).toEqual([]);
    expect(r8([relationship({ relationship_type: "one_to_one" })])).toEqual([]);
    expect(r8([relationship({ data_object_id: TICKETS, related_data_object_id: USERS, relationship_type: "many_to_one" })])).toEqual([]);
  });

  test("no relationship to users warns, naming the entity and the rule", () => {
    expect(shape(r8([]))).toEqual(["R8 warn HELPDESK-CORE [tickets, ticket_edit_scope]"]);
    expect(r8([])[0].detail).toContain("it has no relationship to users");
  });

  test("a many_to_many relationship, users on the many side, or a two-person verb warn", () => {
    expect(r8([relationship({ relationship_type: "many_to_many" })])[0].detail).toContain("many users per row");
    expect(r8([relationship({ data_object_id: TICKETS, related_data_object_id: USERS })])[0].detail).toContain("users is not the one side");
    expect(r8([relationship({ relationship_verb: "is assigned to or owns" })])[0].detail).toContain("the verb names two kinds of person");
  });

  test("one single-person relationship among several is enough", () => {
    expect(r8([relationship({ id: 1, relationship_type: "many_to_many" }), relationship({ id: 2 })])).toEqual([]);
  });
});

// ---------- R9 ----------

describe("R9: every persona in the RACI table has a row that grants access", () => {
  const r9 = (processRaci: any[]) =>
    of(helpDesk({
      lifecycle: [open, gated(2, "resolved", 2, { process_id: 500 }), gated(3, "escalated", 3, { process_id: 501 }), closed],
      processes: [proc, proc2],
      processRaci,
    }).findings, "R9");

  test("Responsible, Accountable and Consulted rows pass", () => {
    expect(r9([raciRow(1, 500, AGENT, "responsible"), raciRow(2, 500, LEAD, "accountable"), raciRow(3, 500, WATCHER, "consulted")])).toEqual([]);
  });

  test("a persona that is only Informed warns, naming the persona and every process", () => {
    const found = r9([raciRow(1, 500, WATCHER, "informed"), raciRow(2, 501, WATCHER, "informed")]);
    expect(shape(found)).toEqual(["R9 warn HELPDESK-CORE [SUPPORT-WATCHER, resolve_tickets, escalate_tickets]"]);
    expect(found[0].detail).toContain("Informed grants nothing");
  });

  test("Informed on one process and Responsible on another passes", () => {
    expect(r9([raciRow(1, 500, WATCHER, "informed"), raciRow(2, 501, WATCHER, "responsible")])).toEqual([]);
  });

  test("a skill that is only Informed is no finding", () => {
    expect(r9([raciRow(1, 500, null as any, "informed", { skill_id: 77 })])).toEqual([]);
  });
});

// ---------- the invariants over every module of the starter-shaped scenario ----------

describe("R1-R9 over every module of the hiring-starter scenario", () => {
  const fx = hiringStarterScenario();
  const run = (id: number) => checkModel(deriveModuleModel(fx.index.modulesById.get(id)!, fx.ctx), { ctx: fx.ctx });

  test("the starter: the Informed row without an event (R5), candidates without a relationship to users (R8) and the Informed-only persona (R9)", () => {
    expect(shape(run(IDS.STARTER))).toEqual([
      "R5 warn HIRING-STARTER [HIRING-MANAGER, recruit_source_candidates]",
      "R8 warn HIRING-STARTER [candidates, candidate_edit_scope]",
      "R9 warn HIRING-STARTER [LEGAL-COMPLIANCE-SPECIALIST, hire_candidate]",
    ]);
  });

  test("the starter's deliberately unwired gate is minted, held by no Accountable row, and is no R4 finding", () => {
    const model = deriveModuleModel(fx.index.modulesById.get(IDS.STARTER)!, fx.ctx);
    const unwired = model.perModule[0].gates.find((g) => g.code === "hiring-starter:flag_do_not_hire")!;
    expect(unwired.processIds).toEqual([]);
    expect(model.perModule[0].raci.some((g) => (grantedGates(g.realization) ?? []).includes(unwired.code))).toBe(false);
    expect(of(run(IDS.STARTER), "R4")).toEqual([]);
  });

  test("the full modules", () => {
    expect(shape(run(IDS.CRM))).toEqual([
      "R8 warn ATS-CANDIDATE-CRM [candidates, candidate_edit_scope]",
      "R9 warn ATS-CANDIDATE-CRM [LEGAL-COMPLIANCE-SPECIALIST, hire_candidate]",
    ]);
    expect(shape(run(IDS.PIPE))).toEqual([
      "R5 warn ATS-RECRUITMENT-PIPELINE [HIRING-MANAGER, recruit_source_candidates]",
      "R6 warn ATS-RECRUITMENT-PIPELINE [3]",
      "R9 warn ATS-RECRUITMENT-PIPELINE [LEGAL-COMPLIANCE-SPECIALIST, hire_candidate]",
    ]);
    for (const id of [IDS.OFFERS, IDS.PRE, IDS.HCM_WORKFLOWS, IDS.HCM_CORE]) expect(run(id)).toEqual([]);
  });

  test("the high-risk gate is held by its Accountable row (no R2 / R4 finding)", () => {
    const model = deriveModuleModel(fx.index.modulesById.get(IDS.OFFERS)!, fx.ctx);
    expect(model.perModule[0].gates.map((g) => [g.code, g.highRisk])).toEqual([["ats-offers:approve_offer", true]]);
    expect(run(IDS.OFFERS)).toEqual([]);
  });
});
