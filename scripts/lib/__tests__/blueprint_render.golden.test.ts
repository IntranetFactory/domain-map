// Golden markdown: sections 7-9 of the starter-shaped scenario (fixtures/hiring_starter_scenario.ts)
// as the generator renders them, compared byte for byte with the checked-in expected file. After an
// intended change to the derivation or the renderer, refresh the file with
//   UPDATE_GOLDEN=1 bun test scripts/lib/__tests__/blueprint_render.golden.test.ts
// and review its diff.

import { expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderBlueprint } from "../../generate_blueprints";
import { hiringStarterScenario, IDS } from "./fixtures/hiring_starter_scenario";

const GOLDEN = resolve(import.meta.dir, "fixtures/blueprint_render.hiring_starter.sections_7_9.golden.md");

test("sections 7-9 of the hiring-starter scenario match the golden markdown", () => {
  const fx = hiringStarterScenario();
  const md = renderBlueprint([fx.index.modulesById.get(IDS.STARTER)!], fx.index, fx.all);
  const from = md.indexOf("\n## 7. Lifecycle states");
  expect(from).toBeGreaterThan(0);
  const sections = md.slice(from + 1);
  if (process.env.UPDATE_GOLDEN) writeFileSync(GOLDEN, sections, "utf8");
  expect(existsSync(GOLDEN)).toBe(true);
  expect(sections).toBe(readFileSync(GOLDEN, "utf8").replace(/\r\n/g, "\n"));
});
