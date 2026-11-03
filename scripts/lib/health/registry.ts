// scripts/lib/health/registry.ts
//
// The check registry: every band array, in checklist order, plus CHECKLIST_VERSION.
//
// Bump CHECKLIST_VERSION whenever a check is added, removed, or its pass criterion changes, then
// run `bun run scripts/analytics/domain_health.ts --stale` to list the domains whose recorded
// `checks:` block predates it.
//
// The load-time assertion below fails loudly if any SKILL.md checklist ID is missing, duplicated,
// or filed under the wrong band, so a band file edit cannot silently drop a check.

import { A_CHECKS } from "./checks_a.ts";
import { B_CHECKS } from "./checks_b.ts";
import { C_CHECKS } from "./checks_c.ts";
import { D_CHECKS } from "./checks_d.ts";
import { E_CHECKS } from "./checks_e.ts";
import { F_CHECKS } from "./checks_f.ts";
import { H_CHECKS } from "./checks_h.ts";
import { M_CHECKS } from "./checks_m.ts";
import { S_CHECKS } from "./checks_s.ts";
import type { Check } from "./types.ts";

export const CHECKLIST_VERSION = 4;

// The 57 IDs of SKILL.md "Per-domain completeness checklist" (there is no M3).
export const SKILL_CHECKLIST_IDS = [
  "S1", "S2", "S3",
  "A1", "A2", "A3", "A4", "A5",
  "M1", "M2", "M4", "M5", "M6", "M7", "M8", "M9", "M10",
  "B1", "B2", "B3", "B4", "B5", "B6", "B6b", "B7", "B8", "B9", "B9b", "B9c", "B9d", "B9e",
  "B10", "B10b", "B11", "B12", "B13", "B14", "B15", "B16",
  "C1", "C2",
  "D1",
  "E1", "E2", "E3", "E4", "E5", "E6",
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8",
  "H1",
] as const;

// IDs added on top of those 57: the domain-health plan (Phase 1 step 3), then B7c. B6b, B9c and E4 are
// extended in place.
export const NEW_CHECK_IDS = ["B7b", "B7c", "B9f", "E4b", "E4c", "E4d"] as const;

export const CHECKS: Check[] = [
  ...S_CHECKS,
  ...A_CHECKS,
  ...M_CHECKS,
  ...B_CHECKS,
  ...C_CHECKS,
  ...D_CHECKS,
  ...E_CHECKS,
  ...F_CHECKS,
  ...H_CHECKS,
];

export function assertRegistry(checks: Check[] = CHECKS): void {
  const expected = [...SKILL_CHECKLIST_IDS, ...NEW_CHECK_IDS] as string[];
  if (SKILL_CHECKLIST_IDS.length !== 57) throw new Error(`registry: SKILL_CHECKLIST_IDS has ${SKILL_CHECKLIST_IDS.length} ids, expected 57`);
  const counts = new Map<string, number>();
  for (const c of checks) counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
  const missing = expected.filter((id) => !counts.has(id));
  const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  const unknown = [...counts.keys()].filter((id) => !expected.includes(id));
  const misfiled = checks.filter((c) => c.id[0] !== c.band).map((c) => `${c.id}@${c.band}`);
  const problems = [
    missing.length ? `missing: ${missing.join(", ")}` : "",
    dupes.length ? `duplicated: ${dupes.join(", ")}` : "",
    unknown.length ? `not in the checklist: ${unknown.join(", ")}` : "",
    misfiled.length ? `wrong band: ${misfiled.join(", ")}` : "",
  ].filter(Boolean);
  if (problems.length) throw new Error(`health check registry is inconsistent with SKILL.md: ${problems.join("; ")}`);
}

assertRegistry();
