// Render-level checks of the gate-permission contract: what the markdown shows, on the
// starter-shaped scenario (fixtures/hiring_starter_scenario.ts). Rendering runs offline through the
// generator's exported renderBlueprint; importing the generator does not run its CLI.

import { describe, expect, test } from "bun:test";
import { renderBlueprint } from "../../generate_blueprints";
import { buildFixture, dataObject, dmdoRow, domain, module } from "./fixtures/build";
import { hiringStarterScenario, IDS } from "./fixtures/hiring_starter_scenario";

const fx = hiringStarterScenario();
const md = renderBlueprint([fx.index.modulesById.get(IDS.STARTER)!], fx.index, fx.all);
const lines = md.split("\n");
const frontMatter = lines.slice(0, lines.indexOf("---", 1) + 1);

// The table under a heading (the first table after it), as header + rows of trimmed cells.
function tableAfter(heading: string): { header: string[]; rows: string[][] } {
  const start = lines.indexOf(heading);
  if (start < 0) throw new Error(`heading not found: ${heading}`);
  const table: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (l.startsWith("|")) table.push(l);
    else if (table.length > 0) break;
  }
  const cells = (l: string) => l.slice(1, -1).split(" | ").map((c) => c.trim());
  return { header: cells(table[0]), rows: table.slice(2).map(cells) };
}

describe("front matter", () => {
  test("carries the architect format key `version: \"3.1\"` and no `blueprint_version`", () => {
    expect(frontMatter).toContain('version: "3.1"');
    expect(frontMatter.some((l) => l.startsWith("blueprint_version"))).toBe(false);
  });

  test("does not carry access_scope (the architect picks the level when it clones a blueprint)", () => {
    expect(frontMatter.some((l) => l.startsWith("access_scope"))).toBe(false);
  });
});

describe("how a module holds an entity is `held_as`; `role` is a permission role only", () => {
  test("§3 and §6.4 name the column `held_as`", () => {
    expect(tableAfter("## 3. Entities catalog").header).toContain("held_as");
    expect(tableAfter("## 3. Entities catalog").header).not.toContain("role");
    expect(tableAfter("### 6.4 Master providers (modules / domains that own masters this scope embeds)").header.slice(0, 2)).toEqual(["data_object", "held_as"]);
  });

  test("§9.1 keeps `role`, which is a permission role", () => {
    expect(tableAfter("**Baseline roles:**").header).toEqual(["role", "baseline grant"]);
  });
});

describe("§7 lifecycle", () => {
  test("the `high risk?` column sits right after `requires_permission?` and is ✓ only on the high-risk gated row", () => {
    const t = tableAfter("### `job_offers` (Offer)");
    expect(t.header).toEqual(["order", "state_name", "initial?", "terminal?", "realizing module", "requires_permission?", "high risk?", "derived gate", "description"]);
    const risk = t.header.indexOf("high risk?");
    expect(t.rows.map((r) => [r[1], r[risk]])).toEqual([
      ["`draft`", "-"],
      ["`approved`", "✓"],
      ["`accepted`", "-"],
    ]);
  });

  test("a gated row that is not high risk shows `-`", () => {
    const t = tableAfter("### `candidates` (Candidate)");
    const risk = t.header.indexOf("high risk?");
    expect(t.rows.map((r) => r[risk])).toEqual(["-", "-", "-"]);
  });
});

describe("§8.1 and §9.1", () => {
  test("the high-risk gate shows `-` in `included in :admin?`, every other gate ✓", () => {
    const t = tableAfter("### 8.1 Permissions");
    const gates = t.rows.filter((r) => r[1] === "workflow-gate (lifecycle)").map((r) => [r[0], r[3]]);
    expect(gates).toEqual([
      ["`ats-candidate-crm:hire_candidate`", "✓"],
      ["`ats-candidate-crm:flag_do_not_hire`", "✓"],
      ["`ats-recruitment-pipeline:publish_posting`", "✓"],
      ["`ats-pre-employee-record:hire_candidate`", "✓"],
      ["`ats-offers:approve_offer`", "-"],
    ]);
  });

  test("the baseline roles include `<slug>_admin`", () => {
    expect(tableAfter("**Baseline roles:**").rows.map((r) => r[0])).toEqual([
      "`hiring-starter_viewer`",
      "`hiring-starter_manager`",
      "`hiring-starter_admin`",
    ]);
  });
});

describe("§6.1 empty placeholder", () => {
  test("a scope with no masters says so", () => {
    expect(lines).toContain("_(none: this scope masters no entities)_");
  });

  test("a scope whose masters no other module embeds says that", () => {
    const solo = buildFixture({
      domains: [domain({ id: 1, domain_code: "HELPDESK" })],
      modules: [module({ id: 2, domain_module_code: "HELPDESK-CORE", domain_id: 1 })],
      dataObjects: [dataObject({ id: 3, data_object_name: "tickets", singular_label: "Ticket", plural_label: "Tickets", entity_type: "operational_workflow" })],
      dmdo: [dmdoRow(2, 3, "master")],
    });
    const out = renderBlueprint([solo.index.modulesById.get(2)!], solo.index, solo.all);
    expect(out.split("\n")).toContain("_(none: no other module embeds this scope's masters)_");
  });
});

describe("§6 handoffs (Writing Convention 10)", () => {
  test("§6.2 shows the installing unit as source module; §6.3 as target module", () => {
    const out = tableAfter("### 6.2 Outbound handoffs (events this scope publishes)");
    expect(out.rows.map((r) => `${r[0]} ${r[3]}`)).toEqual(["HIRING-STARTER `candidate.hired`", "HIRING-STARTER `job_offer.accepted`"]);
    const inb = tableAfter("### 6.3 Inbound handoffs (events this scope reacts to)");
    expect(inb.rows.map((r) => `${r[0]} ${r[2]} ${r[3]}`)).toEqual(["HIRING-STARTER HCM-CORE-WORKER `employee.applied_internally`"]);
  });
});

describe("§6.1 to §6.3 postponed (temporary generator gate)", () => {
  test("§6.2 and §6.3 show their empty placeholders", () => {
    const postponed = renderBlueprint([fx.index.modulesById.get(IDS.STARTER)!], fx.index, fx.all, true).split("\n");
    expect(postponed).toContain("_(none: no outbound handoffs whose payload is in this scope)_");
    expect(postponed).toContain("_(none: no inbound handoffs whose payload is in this scope)_");
  });

  test("related_modules still uses the full data, including modules reached only through handoffs", () => {
    const related = (ls: string[]) => ls.find((l) => l.startsWith("related_modules:"));
    const postponed = renderBlueprint([fx.index.modulesById.get(IDS.STARTER)!], fx.index, fx.all, true).split("\n");
    expect(related(postponed)).toBe(related(lines));
    expect(related(postponed)).toContain("hcm-core-worker");
  });

  test("§6.1 shows its empty placeholder even when another module embeds the master", () => {
    const shared = buildFixture({
      domains: [domain({ id: 1, domain_code: "HELPDESK" })],
      modules: [
        module({ id: 2, domain_module_code: "HELPDESK-CORE", domain_id: 1 }),
        module({ id: 4, domain_module_code: "HELPDESK-STARTER", domain_id: 1 }),
      ],
      dataObjects: [dataObject({ id: 3, data_object_name: "tickets", singular_label: "Ticket", plural_label: "Tickets", entity_type: "operational_workflow" })],
      dmdo: [dmdoRow(2, 3, "master"), dmdoRow(4, 3, "embedded_master")],
    });
    const core = shared.index.modulesById.get(2)!;
    const placeholder = "_(none: no other module embeds this scope's masters)_";
    expect(renderBlueprint([core], shared.index, shared.all).split("\n")).not.toContain(placeholder);
    expect(renderBlueprint([core], shared.index, shared.all, true).split("\n")).toContain(placeholder);
  });
});
