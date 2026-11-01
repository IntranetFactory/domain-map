// scripts/lib/health/checks_c.ts
//
// C band: functional ownership (SKILL.md checklist section "C. Phase C").
// Each entry's id matches the SKILL.md checklist; registry.ts asserts coverage.
//
// C1 runs on ctx.all.businessFunctionDomainsByDomainId (no extra query); the pure logic lives in
// logic_cefh.ts. C1 rows: none (it fails on an absence, so there is no offending row to name).

import { agentOnly } from "./helpers.ts";
import { checkFunctionOwnership } from "./logic_cefh.ts";
import type { Check } from "./types.ts";

export const C_CHECKS: Check[] = [
  {
    id: "C1",
    band: "C",
    kind: "mechanical",
    title: ">= 1 business_function_domains owner row",
    run: async (ctx) => {
      const rows = ctx.all.businessFunctionDomainsByDomainId.get(ctx.domainId) ?? [];
      const fnLabel = (id: number) => ctx.all.businessFunctionsById.get(id)?.business_function_name ?? `function ${id}`;
      const v = checkFunctionOwnership(ctx.domain.domain_kind, rows, fnLabel);
      return [{ id: "C1", ...v }];
    },
  },
  agentOnly(
    "C2",
    "C",
    "business_function_capabilities overrides where ownership diverges",
    "a business_function_capabilities row exists exactly for each capability whose owning function differs from the domain's owning function (e.g. a compliance capability under an L&D domain)",
  ),
];
