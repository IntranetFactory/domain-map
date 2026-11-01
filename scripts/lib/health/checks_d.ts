// scripts/lib/health/checks_d.ts
//
// D band: UI spot-check (SKILL.md "D. UI spot-check").
// Each entry's id matches the SKILL.md checklist; registry.ts asserts coverage.

import { agentOnly } from "./helpers.ts";
import type { Check } from "./types.ts";

export const D_CHECKS: Check[] = [
  agentOnly(
    "D1",
    "D",
    "UI spot-check",
    "visit <ui_baseurl from getCurrentUser>/domain_map/<table> for every table touched: rows render with the expected labels, counts match the loader summary, no record_status='approved' on freshly loaded research",
  ),
];
