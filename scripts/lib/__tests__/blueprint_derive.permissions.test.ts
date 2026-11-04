// Tests for the permission-naming rule in plans/stable-permission-names-plan.md section 2: an entity's
// permissions are named by the catalog, never by what is installed, and modules hold them through bundles.

import { describe, expect, test } from "bun:test";
import { deriveModuleModel } from "../blueprint_derive";
import { checkModel } from "../blueprint_invariants";
import { hiringStarterScenario, IDS } from "./fixtures/hiring_starter_scenario";
import { buildFixture, dataObject, dmdoRow, lifecycleState, module } from "./fixtures/build";

const OWNER = 10, UNIT = 20;
const OPS = 1, REF = 2, CALC = 3, USERS = 4, NO_MASTER = 5;

const fx = buildFixture({
  modules: [module({ id: OWNER, domain_module_code: "OWNER-MOD" }), module({ id: UNIT, domain_module_code: "UNIT-MOD" })],
  dataObjects: [
    dataObject({ id: OPS, data_object_name: "cases", singular_label: "Case", plural_label: "Cases", entity_type: "operational_workflow", has_personal_content: true }),
    dataObject({ id: REF, data_object_name: "case_types", singular_label: "Case Type", plural_label: "Case Types", entity_type: "catalog" }),
    dataObject({ id: CALC, data_object_name: "case_scores", singular_label: "Case Score", plural_label: "Case Scores", entity_type: "computed" }),
    dataObject({ id: USERS, data_object_name: "users", singular_label: "User", plural_label: "Users", kind: "platform_builtin", entity_type: "operational_record" }),
    dataObject({ id: NO_MASTER, data_object_name: "orphans", singular_label: "Orphan", plural_label: "Orphans", entity_type: "operational_record" }),
  ],
  dmdo: [
    dmdoRow(OWNER, OPS, "master"),
    dmdoRow(OWNER, REF, "master"),
    dmdoRow(OWNER, CALC, "master"),
    dmdoRow(UNIT, OPS, "embedded_master"),
    dmdoRow(UNIT, REF, "contributor"),
    dmdoRow(UNIT, CALC, "embedded_master"),
    dmdoRow(UNIT, USERS, "consumer"),
    dmdoRow(UNIT, NO_MASTER, "consumer"),
  ],
  lifecycle: [
    lifecycleState({ id: 1, data_object_id: OPS, state_name: "open", state_order: 1, is_initial: true }),
    lifecycleState({ id: 2, data_object_id: OPS, state_name: "closed", state_order: 2, is_terminal: true, requires_permission: true, permission_verb_override: "close_case" }),
  ],
});
const unit = deriveModuleModel(fx.index.modulesById.get(UNIT)!, fx.ctx).perModule[0];
const owner = deriveModuleModel(fx.index.modulesById.get(OWNER)!, fx.ctx).perModule[0];
const rows = (pm: typeof unit, tier: string) => pm.permissions.filter((p) => p.tier === tier).map((p) => p.code);
const hierarchy = (pm: typeof unit) => pm.hierarchy.map((h) => `${h.including} -> ${h.included}`);

describe("which rows an entity gets", () => {
  test("every entity the module holds gets a read row, named by its master", () => {
    expect(rows(unit, "entity-read")).toEqual(["owner-mod:read_cases", "owner-mod:read_case_types", "owner-mod:read_case_scores"]);
  });

  test("embedded and contributor rows get a write row; a computed entity does not", () => {
    expect(rows(unit, "entity-write")).toEqual(["owner-mod:write_cases", "owner-mod:write_case_types"]);
  });

  test("a platform built-in and an entity with no master get no rows", () => {
    const codes = unit.permissions.map((p) => p.code).join(" ");
    expect(codes).not.toContain("users");
    expect(codes).not.toContain("orphans");
  });

  test("a consumer gets the read row and no write row", () => {
    const f = buildFixture({
      modules: [module({ id: OWNER, domain_module_code: "OWNER-MOD" }), module({ id: UNIT, domain_module_code: "UNIT-MOD" })],
      dataObjects: [dataObject({ id: OPS, data_object_name: "cases", singular_label: "Case", plural_label: "Cases", entity_type: "operational_workflow" })],
      dmdo: [dmdoRow(OWNER, OPS, "master"), dmdoRow(UNIT, OPS, "consumer")],
    });
    const pm = deriveModuleModel(f.index.modulesById.get(UNIT)!, f.ctx).perModule[0];
    expect(rows(pm, "entity-read")).toEqual(["owner-mod:read_cases"]);
    expect(rows(pm, "entity-write")).toEqual([]);
  });

  test("a derived row gets the read row of the entity's master", () => {
    const f = buildFixture({
      modules: [module({ id: OWNER, domain_module_code: "OWNER-MOD" }), module({ id: UNIT, domain_module_code: "UNIT-MOD" })],
      dataObjects: [dataObject({ id: OPS, data_object_name: "cases", singular_label: "Case", plural_label: "Cases", entity_type: "operational_workflow" })],
      dmdo: [dmdoRow(OWNER, OPS, "master"), dmdoRow(UNIT, OPS, "derived")],
    });
    const pm = deriveModuleModel(f.index.modulesById.get(UNIT)!, f.ctx).perModule[0];
    expect(rows(pm, "entity-read")).toEqual(["owner-mod:read_cases"]);
    expect(rows(pm, "entity-write")).toEqual([]);
  });
});

describe("the bundles hold the rows", () => {
  test("read includes every read row, and each write row includes its read row", () => {
    const h = hierarchy(unit);
    for (const code of rows(unit, "entity-read")) expect(h).toContain(`unit-mod:read -> ${code}`);
    expect(h).toContain("owner-mod:write_cases -> owner-mod:read_cases");
    expect(h).toContain("owner-mod:write_case_types -> owner-mod:read_case_types");
  });

  test("the write tier picks the bundle: operational under manage, catalog under admin", () => {
    const h = hierarchy(unit);
    expect(h).toContain("unit-mod:manage -> owner-mod:write_cases");
    expect(h).toContain("unit-mod:admin -> owner-mod:write_case_types");
    expect(h).not.toContain("unit-mod:manage -> owner-mod:write_case_types");
  });
});

describe("names do not depend on what is installed", () => {
  test("gates and overrides on an embedded entity carry the owner's name, as in the owner's own blueprint", () => {
    expect(rows(unit, "workflow-gate (lifecycle)")).toEqual(["owner-mod:close_case"]);
    expect(rows(unit, "override (personal_content)")).toEqual(["owner-mod:view_all_cases", "owner-mod:manage_all_cases"]);
    expect(rows(owner, "workflow-gate (lifecycle)")).toEqual(rows(unit, "workflow-gate (lifecycle)"));
    expect(rows(owner, "override (personal_content)")).toEqual(rows(unit, "override (personal_content)"));
  });

  test("the row-scope rule text names the owner's overrides", () => {
    expect(unit.businessRules[0].intent).toContain("`owner-mod:view_all_cases`");
  });

  test("a master mints the gate of a state another module realizes, under that module's name", () => {
    const f = buildFixture({
      modules: [module({ id: OWNER, domain_module_code: "OWNER-MOD" }), module({ id: 30, domain_module_code: "REALIZER-MOD" })],
      dataObjects: [dataObject({ id: OPS, data_object_name: "cases", singular_label: "Case", plural_label: "Cases", entity_type: "operational_workflow" })],
      dmdo: [dmdoRow(OWNER, OPS, "master"), dmdoRow(30, OPS, "embedded_master")],
      lifecycle: [lifecycleState({ id: 2, data_object_id: OPS, state_name: "closed", state_order: 1, is_initial: true, is_terminal: true, requires_permission: true, permission_verb_override: "close_case", domain_module_id: 30 })],
    });
    const ownerPm = deriveModuleModel(f.index.modulesById.get(OWNER)!, f.ctx).perModule[0];
    const realizerPm = deriveModuleModel(f.index.modulesById.get(30)!, f.ctx).perModule[0];
    expect(rows(ownerPm, "workflow-gate (lifecycle)")).toEqual(["realizer-mod:close_case"]);
    expect(rows(realizerPm, "workflow-gate (lifecycle)")).toEqual(["realizer-mod:close_case"]);
    expect(checkModel(deriveModuleModel(f.index.modulesById.get(OWNER)!, f.ctx), { ctx: f.ctx }).filter((x) => x.id === "R12")).toEqual([]);
  });

  test("a bundle keeps the unit's slug", () => {
    expect(unit.permissions.filter((p) => p.tier.startsWith("baseline")).map((p) => p.code)).toEqual(["unit-mod:read", "unit-mod:manage", "unit-mod:admin"]);
  });

  test("an embedded entity with no master anywhere falls back to the installing unit", () => {
    const f = buildFixture({
      modules: [module({ id: UNIT, domain_module_code: "UNIT-MOD" })],
      dataObjects: [dataObject({ id: OPS, data_object_name: "cases", singular_label: "Case", plural_label: "Cases", entity_type: "operational_workflow", has_personal_content: true })],
      dmdo: [dmdoRow(UNIT, OPS, "embedded_master")],
      lifecycle: [lifecycleState({ id: 2, data_object_id: OPS, state_name: "closed", state_order: 1, is_initial: true, is_terminal: true, requires_permission: true, permission_verb_override: "close_case" })],
    });
    const pm = deriveModuleModel(f.index.modulesById.get(UNIT)!, f.ctx).perModule[0];
    expect(rows(pm, "workflow-gate (lifecycle)")).toEqual(["unit-mod:close_case"]);
    expect(rows(pm, "override (personal_content)")).toEqual(["unit-mod:view_all_cases", "unit-mod:manage_all_cases"]);
  });
});

describe("R11 and R12", () => {
  const scenario = hiringStarterScenario();
  const run = (id: number) => checkModel(deriveModuleModel(scenario.index.modulesById.get(id)!, scenario.ctx), { ctx: scenario.ctx });

  test("the starter's borrowed names all match the owners' own blueprints", () => {
    expect(run(IDS.STARTER).filter((f) => f.id === "R11" || f.id === "R12")).toEqual([]);
  });

  test("R12 fails a gate whose realizer does not hold the entity, so its own blueprint cannot mint the name", () => {
    const f = buildFixture({
      modules: [module({ id: OWNER, domain_module_code: "OWNER-MOD" }), module({ id: UNIT, domain_module_code: "UNIT-MOD" }), module({ id: 30, domain_module_code: "REALIZER-MOD" })],
      dataObjects: [dataObject({ id: OPS, data_object_name: "cases", singular_label: "Case", plural_label: "Cases", entity_type: "operational_workflow" })],
      dmdo: [dmdoRow(OWNER, OPS, "master"), dmdoRow(UNIT, OPS, "embedded_master")],
      lifecycle: [lifecycleState({ id: 2, data_object_id: OPS, state_name: "closed", state_order: 1, is_initial: true, is_terminal: true, requires_permission: true, permission_verb_override: "close_case", domain_module_id: 30 })],
    });
    const findings = checkModel(deriveModuleModel(f.index.modulesById.get(UNIT)!, f.ctx), { ctx: f.ctx }).filter((x) => x.id === "R12");
    expect(findings.map((x) => x.rows)).toEqual([["realizer-mod:close_case"]]);
    expect(findings[0].result).toBe("fail");
  });

  test("neither runs without a ctx", () => {
    const model = deriveModuleModel(fx.index.modulesById.get(UNIT)!, fx.ctx);
    expect(checkModel(model).filter((x) => x.id === "R11" || x.id === "R12")).toEqual([]);
  });
});
