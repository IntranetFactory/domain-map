// The architect-checker acceptance harness (scripts/analytics/blueprint_contract_check.ts) on the
// starter-shaped scenario, which carries a high-risk gate (`job_offers.approved`) and an unwired gate
// (`candidates.do_not_hire`): the access level it injects, the `gated` body conversion, and (when the
// semantius-plugin checker is present on this machine) a clean checker run at both `raci` and
// `gated` with the high-risk gate in place. The copies go to a fresh folder under the OS temp dir.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  accessLevelFor,
  applyGatedConversion,
  DEFAULT_CHECKER,
  injectAccessScope,
  prepareCopy,
  runChecker,
  type AccessLevel,
} from "../../analytics/blueprint_contract_check";
import { deriveModuleModel } from "../blueprint_derive";
import { renderBlueprint } from "../../generate_blueprints";
import { hiringStarterScenario, IDS } from "./fixtures/hiring_starter_scenario";

const fx = hiringStarterScenario();
const mod = (id: number) => fx.index.modulesById.get(id)!;
const render = (id: number): string => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    return renderBlueprint([mod(id)], fx.index, fx.all);
  } finally {
    console.warn = warn;
  }
};

describe("access level", () => {
  test("raci when the blueprint supports it, gated when it does not, none without gates", () => {
    expect(accessLevelFor(deriveModuleModel(mod(IDS.OFFERS), fx.ctx))).toBe("raci");
    expect(accessLevelFor(deriveModuleModel(mod(IDS.STARTER), fx.ctx))).toBe("gated");
    expect(accessLevelFor(deriveModuleModel(mod(IDS.HCM_CORE), fx.ctx))).toBeNull();
  });

  test("the level is written into the front matter before created_at, once", () => {
    const md = injectAccessScope(injectAccessScope(render(IDS.OFFERS), "raci"), "gated");
    const fm = md.slice(0, md.indexOf("\n---", 4));
    expect(fm.match(/^access_scope: .*$/gm)).toEqual(["access_scope: gated"]);
    expect(fm.indexOf("access_scope:")).toBeLessThan(fm.indexOf("created_at:"));
    expect(injectAccessScope("x", null)).toBe("x");
  });
});

describe("gated body conversion", () => {
  const before = render(IDS.STARTER);
  const after = applyGatedConversion(before);

  test("the high-risk gate gets ✓ and its admin hierarchy row; nothing else in 8.1 changes", () => {
    expect(before).toContain("| `ats-offers:approve_offer` | workflow-gate (lifecycle) | Transition `job_offers` into state `approved` | - |");
    expect(after).toContain("| `ats-offers:approve_offer` | workflow-gate (lifecycle) | Transition `job_offers` into state `approved` | ✓ |");
    expect(before).not.toContain("| `hiring-starter:admin` | `ats-offers:approve_offer` |");
    expect(after).toContain("| `hiring-starter:admin` | `ats-offers:approve_offer` |");
    expect(after).toContain("| `hiring-starter:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |");
    // The added row sits in 8.1 order, right after the gate before it.
    const h = after.slice(after.indexOf("**Permission hierarchy:**"));
    expect(h.indexOf("`ats-pre-employee-record:hire_candidate` |")).toBeLessThan(h.indexOf("`ats-offers:approve_offer` |"));
    expect(h.indexOf("`ats-offers:approve_offer` |")).toBeLessThan(h.indexOf("`ats-candidate-crm:view_all_candidates` |"));
  });

  test("the RACI trio and the persona list are dropped; the rest of section 9 stays", () => {
    for (const gone of ["**RACI realization:**", "**Processes wired:**", "Functional ownership and default grants", "\npersona:"]) {
      expect(before).toContain(gone);
      expect(after).not.toContain(gone);
    }
    for (const kept of ["### 9.1 `HIRING-STARTER`", "**Baseline roles:**", "**Permission hierarchy:**", "## 8. Permissions"]) expect(after).toContain(kept);
  });

  test("the conversion is idempotent", () => {
    expect(applyGatedConversion(after)).toBe(after);
  });
});

describe.skipIf(!existsSync(DEFAULT_CHECKER))("the architect checker on the converted copies", () => {
  const dir = mkdtempSync(join(tmpdir(), "blueprint-contract-test-"));
  const cases: [string, number, AccessLevel][] = [
    ["offers-raci", IDS.OFFERS, "raci"],
    ["offers-gated", IDS.OFFERS, "gated"],
    ["starter-gated", IDS.STARTER, "gated"],
    ["starter-raci", IDS.STARTER, "raci"],
  ];
  const files = cases.map(([name, id, level]) => {
    const p = join(dir, `${name}-semantic-blueprint.md`);
    writeFileSync(p, prepareCopy(render(id), level), "utf8");
    return p;
  });
  const { results } = runChecker(files);
  const errors = (name: string) => (results.get(`${name}-semantic-blueprint.md`)?.issues ?? [{ check: "missing", detail: "no report", warn: false }]).filter((i) => !i.warn).map((i) => i.detail);

  test("a high-risk gate is clean at raci (admin left out) and at gated (admin holds it)", () => {
    expect(errors("offers-raci")).toEqual([]);
    expect(errors("offers-gated")).toEqual([]);
    expect(errors("starter-gated")).toEqual([]);
  });

  test("at raci the starter is refused: its unwired gate has no Accountable row, so it does not support raci", () => {
    expect(errors("starter-raci")).toEqual([
      "RACI rule: process gate `ats-candidate-crm:flag_do_not_hire` is in the `grant gates [...]` list of 0 accountable rows; under raci exactly one accountable row holds it",
      "`access_scope: raci` needs `supports_raci: true`",
    ]);
  });

  test("the generated flag says true for the offers module and false for the starter", () => {
    expect(render(IDS.OFFERS)).toContain("\nsupports_raci: true\n");
    expect(render(IDS.STARTER)).toContain("\nsupports_raci: false\n");
    expect(applyGatedConversion(render(IDS.OFFERS))).toContain("\nsupports_raci: false\n");
  });
});
