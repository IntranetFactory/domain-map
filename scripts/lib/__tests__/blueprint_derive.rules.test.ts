// One test per blueprint derivation rule of the gate-permission contract
// (plans/domain-health-and-blueprint-quality-plan.md Phase 2 step 4, plans/gate-permission-model-plan.md
// section 5). Each fixture is the smallest catalog that exercises its rule; the starter-shaped
// scenario that combines them lives in blueprint_derive.starter.test.ts.

import { describe, expect, test } from "bun:test";
import { deriveModuleModel, entityPluralToken, entitySingularToken, type BlueprintModel } from "../blueprint_derive";
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
  triggerEvent,
  usersObject,
} from "./fixtures/build";

// ---------- a tiny help desk: one module mastering tickets ----------

const D = 1, OTHER_D = 2, M = 10, X = 11, USERS = 100, TICKETS = 101, CATEGORIES = 102;
const AGENT = 7, LEAD = 8, WATCHER = 9;

type HelpDeskOpts = {
  lifecycle?: any[];
  processRaci?: any[];
  processes?: any[];
  triggerEvents?: any[];
  withCatalogEntity?: boolean;
};

function helpDesk(opts: HelpDeskOpts = {}) {
  const dataObjects = [
    usersObject(USERS),
    dataObject({ id: TICKETS, data_object_name: "tickets", singular_label: "Ticket", plural_label: "Tickets", entity_type: "operational_workflow" }),
  ];
  const dmdo = [dmdoRow(M, TICKETS, "master")];
  if (opts.withCatalogEntity) {
    dataObjects.push(dataObject({ id: CATEGORIES, data_object_name: "ticket_categories", singular_label: "Ticket Category", plural_label: "Ticket Categories", entity_type: "catalog" }));
    dmdo.push(dmdoRow(M, CATEGORIES, "master"));
  }
  const fx = buildFixture({
    domains: [domain({ id: D, domain_code: "HELPDESK" }), domain({ id: OTHER_D, domain_code: "OTHER" })],
    modules: [
      module({ id: M, domain_module_code: "HELPDESK-CORE", domain_id: D }),
      module({ id: X, domain_module_code: "HELPDESK-ESCALATION", domain_id: D }),
    ],
    dataObjects,
    dmdo,
    lifecycle: opts.lifecycle ?? [],
    domainRoles: [{ id: AGENT, role_code: "SUPPORT-AGENT" }, { id: LEAD, role_code: "SUPPORT-LEAD" }, { id: WATCHER, role_code: "SUPPORT-WATCHER" }],
    processRaci: opts.processRaci ?? [],
    processes: opts.processes ?? [],
    triggerEvents: opts.triggerEvents ?? [],
  });
  return deriveModuleModel(fx.index.modulesById.get(M)!, fx.ctx);
}

const open = lifecycleState({ id: 1, data_object_id: TICKETS, state_name: "open", state_order: 1, is_initial: true });
const closed = lifecycleState({ id: 9, data_object_id: TICKETS, state_name: "closed", state_order: 9, is_terminal: true });
const gated = (id: number, state_name: string, state_order: number, p: Record<string, unknown> = {}) =>
  lifecycleState({ id, data_object_id: TICKETS, state_name, state_order, requires_permission: true, domain_module_id: M, ...p });

const raciOf = (model: BlueprintModel, raci: string) =>
  model.perModule[0].raci.filter((g) => g.raci === raci).map((g) => `${g.actor}: ${g.realization}`);
const gatePerms = (model: BlueprintModel) =>
  model.perModule[0].permissions.filter((p) => p.tier === "workflow-gate (lifecycle)");

// ---------- rule 1: the Accountable persona holds the gate, Responsible the write tier ----------

describe("rule 1: gate holder", () => {
  test("the Accountable persona gets grant gates, the Responsible persona only the write tier", () => {
    const model = helpDesk({
      lifecycle: [open, gated(2, "resolved", 2, { process_id: 500 }), closed],
      processes: [processRow(500, "resolve_tickets")],
      processRaci: [raciRow(1, 500, AGENT, "responsible"), raciRow(2, 500, LEAD, "accountable")],
    });
    expect(raciOf(model, "responsible")).toEqual(["SUPPORT-AGENT: the gated entities' write tier"]);
    expect(raciOf(model, "accountable")).toEqual([
      "SUPPORT-LEAD: grant gates [helpdesk-core:resolved_ticket] + the gated entities' write tier",
    ]);
  });
});

// ---------- rule 2: one permission set, admin roll-up except high-risk, unwired gates marked ----------

describe("rule 2: one permission set", () => {
  const model = helpDesk({
    lifecycle: [
      open,
      gated(2, "resolved", 2, { process_id: 500 }),
      gated(3, "refunded", 3, { process_id: 500, is_high_risk: true }),
      gated(4, "reopened", 4),
      closed,
    ],
    processes: [processRow(500, "resolve_tickets")],
    processRaci: [raciRow(1, 500, AGENT, "responsible"), raciRow(2, 500, LEAD, "accountable")],
  });

  test("every gate keeps its workflow-gate (lifecycle) row; a high-risk gate is not included in :admin", () => {
    expect(gatePerms(model).map((p) => [p.code, p.includedInAdmin])).toEqual([
      ["helpdesk-core:resolved_ticket", true],
      ["helpdesk-core:refunded_ticket", false],
      ["helpdesk-core:reopened_ticket", true],
    ]);
  });

  test("the hierarchy rolls every non-high-risk gate up under :admin and leaves the high-risk gate out", () => {
    const underAdmin = model.perModule[0].hierarchy.filter((e) => e.including === "helpdesk-core:admin").map((e) => e.included);
    expect(underAdmin).toContain("helpdesk-core:resolved_ticket");
    expect(underAdmin).toContain("helpdesk-core:reopened_ticket");
    expect(underAdmin).not.toContain("helpdesk-core:refunded_ticket");
  });

  test("the gate model carries the high-risk flag from is_high_risk", () => {
    expect(model.perModule[0].gates.map((g) => [g.code, g.highRisk])).toEqual([
      ["helpdesk-core:resolved_ticket", false],
      ["helpdesk-core:refunded_ticket", true],
      ["helpdesk-core:reopened_ticket", false],
    ]);
  });

  test("a gate wired to no process is marked ⚠ no process in its §8.1 description", () => {
    const desc = Object.fromEntries(gatePerms(model).map((p) => [p.code, p.description]));
    expect(desc["helpdesk-core:reopened_ticket"]).toBe("Transition `tickets` into state `reopened` (⚠ no process)");
    expect(desc["helpdesk-core:resolved_ticket"]).toBe("Transition `tickets` into state `resolved`");
  });

  test("the high-risk gate is still held by the Accountable row", () => {
    expect(raciOf(model, "accountable")).toEqual([
      "SUPPORT-LEAD: grant gates [helpdesk-core:resolved_ticket, helpdesk-core:refunded_ticket] + the gated entities' write tier",
    ]);
  });
});

// ---------- rule 3: RACI gate lists are filtered to minted gates and deduplicated ----------

describe("rule 3: RACI gate lists", () => {
  test("a gate realized by an out-of-scope module is not granted, and a shared code is listed once", () => {
    const model = helpDesk({
      lifecycle: [
        open,
        gated(2, "resolved", 2, { process_id: 500, permission_verb_override: "close_case" }),
        gated(3, "escalated", 3, { process_id: 500, domain_module_id: X }), // realized by HELPDESK-ESCALATION
        gated(4, "archived", 4, { process_id: 500, permission_verb_override: "close_case" }), // same code as resolved
        closed,
      ],
      processes: [processRow(500, "resolve_tickets")],
      processRaci: [raciRow(1, 500, AGENT, "responsible"), raciRow(2, 500, LEAD, "accountable")],
    });
    expect(gatePerms(model).map((p) => p.code)).toEqual(["helpdesk-core:close_case"]);
    expect(raciOf(model, "accountable")).toEqual([
      "SUPPORT-LEAD: grant gates [helpdesk-core:close_case] + the gated entities' write tier",
    ]);
    for (const g of model.perModule[0].raci) expect(g.realization).not.toContain("helpdesk-escalation:");
  });
});

// ---------- rule 4: the admin role exists whenever :admin is minted ----------

describe("rule 4: admin role", () => {
  test("a module with no catalog-tier entity still gets <slug>_admin, because :admin is minted", () => {
    const model = helpDesk({ lifecycle: [open, closed] });
    expect(model.perModule[0].permissions.map((p) => p.code)).toContain("helpdesk-core:admin");
    expect(model.perModule[0].baselineRoles).toEqual([
      { code: "helpdesk-core_viewer", grant: "helpdesk-core:read" },
      { code: "helpdesk-core_manager", grant: "helpdesk-core:manage" },
      { code: "helpdesk-core_admin", grant: "helpdesk-core:admin" },
    ]);
  });
});

// ---------- rule 5: realization text names the gates and the events ----------

describe("rule 5: realization text", () => {
  test("an Accountable row on a process with no minted gate says ⚠ no gate wired", () => {
    const model = helpDesk({
      lifecycle: [open, lifecycleState({ id: 2, data_object_id: TICKETS, state_name: "triaged", state_order: 2, process_id: 500 }), closed],
      processes: [processRow(500, "triage_tickets")],
      processRaci: [raciRow(1, 500, AGENT, "responsible"), raciRow(2, 500, LEAD, "accountable")],
    });
    expect(raciOf(model, "accountable")).toEqual(["SUPPORT-LEAD: ⚠ no gate wired"]);
  });

  test("an Informed row lists the trigger_events on the process's gated entities", () => {
    const model = helpDesk({
      lifecycle: [open, gated(2, "resolved", 2, { process_id: 500 }), closed],
      processes: [processRow(500, "resolve_tickets")],
      processRaci: [raciRow(1, 500, AGENT, "responsible"), raciRow(2, 500, LEAD, "accountable"), raciRow(3, 500, WATCHER, "informed")],
      triggerEvents: [
        triggerEvent({ id: 2, event_name: "ticket.resolved", data_object_id: TICKETS, to_state: "resolved" }),
        triggerEvent({ id: 1, event_name: "ticket.created", data_object_id: TICKETS, event_category: "entity_event" }),
        triggerEvent({ id: 3, event_name: "category.retired", data_object_id: CATEGORIES }),
      ],
    });
    expect(raciOf(model, "informed")).toEqual(["SUPPORT-WATCHER: notify on trigger_events [ticket.created, ticket.resolved]"]);
  });

  test("an Informed row with no event on the gated entities says ⚠ no event wired", () => {
    const model = helpDesk({
      lifecycle: [open, gated(2, "resolved", 2, { process_id: 500 }), closed],
      processes: [processRow(500, "resolve_tickets")],
      processRaci: [raciRow(1, 500, LEAD, "accountable"), raciRow(2, 500, WATCHER, "informed")],
    });
    expect(raciOf(model, "informed")).toEqual(["SUPPORT-WATCHER: ⚠ no event wired"]);
  });
});

// ---------- rule 6: a shared gate code names every mapped state ----------

describe("rule 6: shared gate codes", () => {
  test("the permission description names every state mapped to the code", () => {
    const model = helpDesk({
      lifecycle: [
        open,
        gated(2, "resolved", 2, { permission_verb_override: "close_case" }),
        gated(3, "archived", 3, { permission_verb_override: "close_case" }),
        closed,
      ],
    });
    expect(gatePerms(model).map((p) => [p.code, p.description])).toEqual([
      ["helpdesk-core:close_case", "Transition `tickets` into state `resolved` or `tickets` into state `archived` (⚠ no process)"],
    ]);
    expect(model.perModule[0].gates[0].states.map((s) => s.state.state_name)).toEqual(["resolved", "archived"]);
  });
});

// ---------- rule 7: embedded-entity handoffs follow Writing Convention 10 ----------

describe("rule 7: embedded-entity handoffs", () => {
  // A unit U (id 30) embeds `cases` (owner CASES, id 20) and `kb_articles` (owner KB, id 21), and
  // masters `macros`. FOREIGN (id 40) is a module U does not play.
  const U = 30, CASES = 20, KB = 21, FOREIGN = 40;
  const CASE = 201, ARTICLE = 202, MACRO = 203;
  function fixture(handoffs: any[]) {
    const fx = buildFixture({
      domains: [domain({ id: D, domain_code: "SUPPORT" }), domain({ id: OTHER_D, domain_code: "OTHER" })],
      modules: [
        module({ id: CASES, domain_module_code: "SUPPORT-CASES", domain_id: D }),
        module({ id: KB, domain_module_code: "SUPPORT-KB", domain_id: D }),
        module({ id: U, domain_module_code: "SUPPORT-STARTER", domain_id: D, module_kind: "starter" }),
        module({ id: FOREIGN, domain_module_code: "OTHER-SINK", domain_id: OTHER_D }),
      ],
      dataObjects: [
        dataObject({ id: CASE, data_object_name: "cases", singular_label: "Case", plural_label: "Cases" }),
        dataObject({ id: ARTICLE, data_object_name: "kb_articles", singular_label: "Article", plural_label: "Articles" }),
        dataObject({ id: MACRO, data_object_name: "macros", singular_label: "Macro", plural_label: "Macros" }),
      ],
      dmdo: [
        dmdoRow(CASES, CASE, "master"),
        dmdoRow(KB, ARTICLE, "master"),
        dmdoRow(U, CASE, "embedded_master"),
        dmdoRow(U, ARTICLE, "embedded_master"),
        dmdoRow(U, MACRO, "master"),
      ],
      handoffs,
    });
    return deriveModuleModel(fx.index.modulesById.get(U)!, fx.ctx);
  }
  const h = (id: number, src: number, tgt: number, payloadId: number, payload: string, event: string) =>
    handoffRow({
      id,
      source_domain_id: src === FOREIGN ? OTHER_D : D,
      target_domain_id: tgt === FOREIGN ? OTHER_D : D,
      source_domain_module_id: src,
      target_domain_module_id: tgt,
      data_object_id: payloadId,
      payload,
      event: { event_name: event },
    });
  const show = (rows: BlueprintModel["handoffs"]["outbound"]) =>
    rows.map((r) => `${r.row.id} ${r.sourceModule?.domain_module_code} -> ${r.targetModule?.domain_module_code}`);

  test("the installing unit stands in as source (6.2) and target (6.3) for an absent catalog owner", () => {
    const model = fixture([
      h(1, CASES, FOREIGN, CASE, "cases", "case.closed"),
      h(2, FOREIGN, CASES, CASE, "cases", "customer.escalated"),
    ]);
    expect(show(model.handoffs.outbound)).toEqual(["1 SUPPORT-STARTER -> OTHER-SINK"]);
    expect(show(model.handoffs.inbound)).toEqual(["2 OTHER-SINK -> SUPPORT-STARTER"]);
    // The catalog endpoint stays on the model for reference.
    expect(model.handoffs.outbound[0].catalogSourceModule?.domain_module_code).toBe("SUPPORT-CASES");
  });

  test("handoffs between two entities inside the unit are hidden, also when the unit itself is an endpoint", () => {
    const model = fixture([
      h(3, CASES, KB, ARTICLE, "kb_articles", "case.resolved"), // both endpoints played
      h(4, U, CASES, CASE, "cases", "macro.applied"), // the unit itself -> a played owner
      h(5, KB, U, MACRO, "macros", "article.published"), // a played owner -> the unit itself
    ]);
    expect(model.handoffs).toEqual({ outbound: [], inbound: [] });
  });

  test("a boundary-crossing event on an embedded payload, published by a played module that is not its owner, is shown", () => {
    const model = fixture([h(6, KB, FOREIGN, CASE, "cases", "article.linked_to_case")]);
    expect(show(model.handoffs.outbound)).toEqual(["6 SUPPORT-STARTER -> OTHER-SINK"]);
  });
});

// ---------- rule 10: permission tokens are snake_case ----------

describe("rule 10: snake_case tokens", () => {
  test("labels with hyphens, slashes and parentheses become snake_case tokens", () => {
    const o = (singular_label: string, plural_label: string) =>
      dataObject({ id: 1, data_object_name: "x", singular_label, plural_label });
    expect(entityPluralToken(o("Voluntary Self-Identification", "Voluntary Self-Identifications"))).toBe("voluntary_self_identifications");
    expect(entitySingularToken(o("Objective / OKR", "Objective / OKRs"))).toBe("objective_okr");
    expect(entityPluralToken(o("Return Authorization (RMA)", "Return Authorization (RMA)s"))).toBe("return_authorization_rma_s");
    expect(entityPluralToken(o("Job Posting", "Job Postings"))).toBe("job_postings");
  });

  test("a personal_content override on a hyphenated label mints a snake_case permission", () => {
    const fx = buildFixture({
      modules: [module({ id: M, domain_module_code: "HCM-EEO" })],
      dataObjects: [dataObject({ id: 1, data_object_name: "voluntary_self_identifications", singular_label: "Voluntary Self-Identification", plural_label: "Voluntary Self-Identifications", has_personal_content: true })],
      dmdo: [dmdoRow(M, 1, "master")],
    });
    const pm = deriveModuleModel(fx.index.modulesById.get(M)!, fx.ctx).perModule[0];
    expect(pm.permissions.map((p) => p.code)).toContain("hcm-eeo:view_all_voluntary_self_identifications");
    expect(pm.businessRules.map((r) => r.name)).toEqual(["voluntary_self_identification_edit_scope"]);
  });
});

// ---------- rule 11: an embedded entity's NULL-realizer gate is minted by the installing unit ----------

describe("rule 11: NULL-realizer gate on an embedded entity", () => {
  test("the installing unit mints the gate re-prefixed and §7 shows that code", () => {
    const OWNER = 20, U = 30, ADJ = 301;
    const fx = buildFixture({
      modules: [
        module({ id: OWNER, domain_module_code: "BGV-ADJUDICATION" }),
        module({ id: U, domain_module_code: "ATS-BACKGROUND-CHECKS" }),
      ],
      dataObjects: [dataObject({ id: ADJ, data_object_name: "adjudications", singular_label: "Adjudication", plural_label: "Adjudications", entity_type: "operational_workflow" })],
      dmdo: [dmdoRow(OWNER, ADJ, "master"), dmdoRow(U, ADJ, "embedded_master")],
      lifecycle: [
        lifecycleState({ id: 1, data_object_id: ADJ, state_name: "pending", state_order: 1, is_initial: true }),
        lifecycleState({ id: 2, data_object_id: ADJ, state_name: "clear", state_order: 2, is_terminal: true, requires_permission: true, permission_verb_override: "clear_adjudication" }),
      ],
    });
    const model = deriveModuleModel(fx.index.modulesById.get(U)!, fx.ctx);
    const gate = model.lifecycle[0].states[1].gate;
    expect(gate?.code).toBe("ats-background-checks:clear_adjudication");
    expect(gate?.reprefixed).toBe(true);
    expect(gatePerms(model).map((p) => p.code)).toEqual(["ats-background-checks:clear_adjudication"]);
    expect(model.perModule[0].lifecycle.map((s: any) => s.state_name)).toEqual(["pending", "clear"]);
  });
});

// ---------- rule 12: §7 is per master ----------

describe("rule 12: §7 is per master", () => {
  const OWNER = 20, U = 30, CONTRACTS = 401;
  const contractStates = (realizer: number | null) => [
    lifecycleState({ id: 1, data_object_id: CONTRACTS, state_name: "draft", state_order: 1, is_initial: true, domain_module_id: OWNER }),
    lifecycleState({ id: 2, data_object_id: CONTRACTS, state_name: "approved", state_order: 2, requires_permission: true, domain_module_id: realizer }),
    lifecycleState({ id: 3, data_object_id: CONTRACTS, state_name: "signed", state_order: 3, is_terminal: true, requires_permission: true, domain_module_id: OWNER }),
  ];
  const fixture = (role: string, realizer: number | null) =>
    buildFixture({
      modules: [module({ id: OWNER, domain_module_code: "CLM-REPOSITORY" }), module({ id: U, domain_module_code: "CLM-NEGOTIATION" })],
      dataObjects: [dataObject({ id: CONTRACTS, data_object_name: "contracts", singular_label: "Contract", plural_label: "Contracts", entity_type: "operational_workflow" })],
      dmdo: [dmdoRow(OWNER, CONTRACTS, "master"), dmdoRow(U, CONTRACTS, role)],
      lifecycle: contractStates(realizer),
    });

  test("a consumer entity whose states this module doesn't realize gets no §7 section", () => {
    const fx = fixture("consumer", OWNER);
    const model = deriveModuleModel(fx.index.modulesById.get(U)!, fx.ctx);
    expect(model.lifecycle).toEqual([]);
  });

  test("a contributor that realizes a gated state shows only that state, and §8.1 mints its gate", () => {
    const fx = fixture("contributor", U);
    const model = deriveModuleModel(fx.index.modulesById.get(U)!, fx.ctx);
    expect(model.lifecycle.map((e) => e.dataObject.data_object_name)).toEqual(["contracts"]);
    expect(model.lifecycle[0].states.map((s) => s.state.state_name)).toEqual(["approved"]);
    expect(gatePerms(model).map((p) => p.code)).toEqual([model.lifecycle[0].states[0].gate!.code]);
  });

  test("the master module shows the whole state machine", () => {
    const fx = fixture("consumer", U);
    const model = deriveModuleModel(fx.index.modulesById.get(OWNER)!, fx.ctx);
    expect(model.lifecycle[0].states.map((s) => s.state.state_name)).toEqual(["draft", "approved", "signed"]);
  });
});
