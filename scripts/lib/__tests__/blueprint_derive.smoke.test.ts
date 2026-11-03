// Smoke test: deriveModuleModel runs fully offline on a tiny fixture and fills every section the
// renderer reads. Per-rule tests (gate holders, admin role, RACI gate lists, ...) live in their
// own files; this only proves the model assembles end to end without a catalog fetch.

import { expect, test } from "bun:test";
import { deriveModuleModel } from "../blueprint_derive";
import {
  buildFixture,
  dataObject,
  dmdoRow,
  domain,
  lifecycleState,
  module,
  relationshipRow,
  usersObject,
} from "./fixtures/build";

// A tiny help desk: one module mastering tickets (operational_workflow, personal content) and
// ticket categories (catalog), a relationship to users, a gated `resolved` state wired to one process with a
// Responsible and an Accountable persona, and one owning business function.
const D = 1, M = 10, USERS = 100, TICKETS = 101, CATEGORIES = 102, PROC = 500;

function helpDeskFixture() {
  return buildFixture({
    domains: [domain({ id: D, domain_code: "HELPDESK" })],
    modules: [module({ id: M, domain_module_code: "HELPDESK-CORE", domain_id: D })],
    dataObjects: [
      usersObject(USERS),
      dataObject({ id: TICKETS, data_object_name: "tickets", singular_label: "Ticket", plural_label: "Tickets", entity_type: "operational_workflow", has_personal_content: true }),
      dataObject({ id: CATEGORIES, data_object_name: "ticket_categories", singular_label: "Ticket Category", plural_label: "Ticket Categories", entity_type: "catalog" }),
    ],
    dmdo: [dmdoRow(M, TICKETS, "master"), dmdoRow(M, CATEGORIES, "master")],
    relationships: [
      relationshipRow({ id: 1, data_object_id: CATEGORIES, related_data_object_id: TICKETS, relationship_verb: "classifies", is_required: true }),
      relationshipRow({ id: 2, data_object_id: USERS, related_data_object_id: TICKETS, relationship_verb: "is assigned" }),
    ],
    lifecycle: [
      lifecycleState({ id: 1, data_object_id: TICKETS, state_name: "open", state_order: 1, is_initial: true }),
      lifecycleState({ id: 2, data_object_id: TICKETS, state_name: "resolved", state_order: 2, requires_permission: true, process_id: PROC }),
      lifecycleState({ id: 3, data_object_id: TICKETS, state_name: "closed", state_order: 3, is_terminal: true }),
    ],
    personas: [{ id: 7, persona_code: "SUPPORT-AGENT" }, { id: 8, persona_code: "SUPPORT-LEAD" }],
    processRaci: [
      { id: 1, process_id: PROC, persona_id: 7, skill_id: null, raci: "responsible", consultation_blocking: false },
      { id: 2, process_id: PROC, persona_id: 8, skill_id: null, raci: "accountable", consultation_blocking: false },
    ],
    processes: [{ id: PROC, process_name: "Resolve tickets", process_key: "resolve_tickets", process_code: "1.2.3", external_id: "99999", hierarchy_level: 3, description: "" }],
    businessFunctions: [{ id: 3, business_function_name: "Customer Service" }],
    businessFunctionDomains: [{ business_function_id: 3, domain_id: D, responsibility_type: "owner" }],
  });
}

test("deriveModuleModel assembles every section offline from a tiny fixture", () => {
  const { index, ctx } = helpDeskFixture();
  const model = deriveModuleModel(index.modulesById.get(M)!, ctx);

  expect(model.modules.map((m) => m.domain_module_code)).toEqual(["HELPDESK-CORE"]);
  // §2 / §3: both masters in scope, with their entity-type write tiers.
  expect(Object.fromEntries(model.entities.map((e) => [e.data_object.data_object_name, e.writeTier.write]))).toEqual({
    tickets: ":manage",
    ticket_categories: ":admin",
  });
  // §5: one intra-scope relationship and one relationship to users, each with a resolved delete mode.
  expect(model.relationships.intra.map((r) => r.deleteMode.mode)).toEqual(["restrict"]);
  expect(model.relationships.userRels.map((r) => r.deleteMode.mode)).toEqual(["clear"]);
  // §6: no handoffs in this fixture.
  expect(model.handoffs).toEqual({ outbound: [], inbound: [] });
  // §7: one state machine; only the gated state's gate is shown, but every state resolves one.
  expect(model.lifecycle.map((l) => l.dataObject.data_object_name)).toEqual(["tickets"]);
  expect(model.lifecycle[0].states.map((s) => s.gate?.code)).toEqual([
    "helpdesk-core:open_ticket",
    "helpdesk-core:resolved_ticket",
    "helpdesk-core:closed_ticket",
  ]);
  // §8 / §9: one per-module entry carrying every derived table.
  expect(model.perModule).toHaveLength(1);
  const pm = model.perModule[0];
  expect(pm.slug).toBe("helpdesk-core");
  expect(pm.permissions.map((p) => p.code)).toContain("helpdesk-core:resolved_ticket");
  expect(pm.businessRules.map((r) => r.name)).toEqual(["ticket_edit_scope"]);
  expect(pm.baselineRoles.length).toBeGreaterThan(0);
  expect(pm.hierarchy.length).toBeGreaterThan(0);
  expect(pm.wiredProcesses.map((p) => p.key)).toEqual(["resolve_tickets"]);
  expect(pm.raci.map((g) => `${g.actor}:${g.raci}`)).toEqual(["SUPPORT-AGENT:responsible", "SUPPORT-LEAD:accountable"]);
  // Front matter lists + §9.(n+1).
  expect(model.personas).toEqual(["SUPPORT-AGENT", "SUPPORT-LEAD"]);
  expect(model.functionalOwnership).toEqual([
    { responsibility: "owner", func: "Customer Service", defaultRole: "admin", defaultTier: ":admin" },
  ]);
});
