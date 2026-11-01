// Render-level checks of the gate-permission contract: what the markdown shows, on the
// starter-shaped scenario (fixtures/hiring_starter_scenario.ts). Rendering runs offline through the
// generator's exported renderBlueprint; importing the generator does not run its CLI.

import { describe, expect, test } from "bun:test";
import { renderBlueprint } from "../../generate_blueprints";
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

describe("§7 lifecycle", () => {
  test("the `high risk?` column sits right after `requires_permission?` and is ✓ only on the high-risk gated row", () => {
    const t = tableAfter("### `job_offers` (Offer)");
    expect(t.header).toEqual(["order", "state_name", "initial?", "terminal?", "requires_permission?", "high risk?", "derived gate", "description"]);
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
      ["`hiring-starter:hire_candidate`", "✓"],
      ["`hiring-starter:flag_do_not_hire`", "✓"],
      ["`hiring-starter:publish_posting`", "✓"],
      ["`hiring-starter:approve_offer`", "-"],
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

describe("§6 handoffs (Writing Convention 10)", () => {
  test("§6.2 shows the installing unit as source module; §6.3 as target module", () => {
    const out = tableAfter("### 6.2 Outbound handoffs (events this scope publishes)");
    expect(out.rows.map((r) => `${r[0]} ${r[3]}`)).toEqual(["HIRING-STARTER `candidate.hired`", "HIRING-STARTER `job_offer.accepted`"]);
    const inb = tableAfter("### 6.3 Inbound handoffs (events this scope reacts to)");
    expect(inb.rows.map((r) => `${r[0]} ${r[2]} ${r[3]}`)).toEqual(["HIRING-STARTER HCM-CORE-WORKER `employee.applied_internally`"]);
  });
});
