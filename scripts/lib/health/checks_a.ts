// scripts/lib/health/checks_a.ts
//
// A band: market shape (SKILL.md checklist section "A. Phase A").
// Each entry's id matches the SKILL.md checklist; registry.ts asserts coverage.
//
// The pass rules live in logic_sam.ts (pure, unit-tested); this file only fetches.
// Row ids: A1 / A4 = domains column names, A3 = solution_domains.id; A2 names no rows (a count).

import { agentOnly, judgment } from "./helpers.ts";
import {
  CAPABILITY_DOMAINS_PATH,
  checkCapabilityFloor,
  checkDomainCatalogCopy,
  checkDomainMetadata,
  checkSolutionCoverage,
  SOLUTION_DOMAINS_PATH,
} from "./logic_sam.ts";
import type { Check } from "./types.ts";

export const A_CHECKS: Check[] = [
  {
    id: "A1",
    band: "A",
    kind: "mechanical",
    title: "domains row business metadata populated",
    // ctx.domain is the catalog index row, which already carries the seven columns.
    run: async (ctx) => checkDomainMetadata(ctx.domain),
  },
  {
    id: "A2",
    band: "A",
    kind: "mechanical",
    title: "capabilities related",
    run: async (ctx) => {
      const n = (await ctx.query(CAPABILITY_DOMAINS_PATH)).filter((r: any) => r.domain_id === ctx.domainId).length;
      return checkCapabilityFloor(n, ctx.domain.domain_kind);
    },
  },
  {
    id: "A3",
    band: "A",
    kind: "mechanical",
    title: "solutions related with coverage_level",
    run: async (ctx) => {
      const rows = (await ctx.query(SOLUTION_DOMAINS_PATH))
        .filter((r: any) => r.domain_id === ctx.domainId)
        .map((r: any) => ({ id: r.id, coverage_level: r.coverage_level, solution_name: r.solutions?.solution_name ?? null }));
      return checkSolutionCoverage(rows, { domainKind: ctx.domain.domain_kind, hasMasters: ctx.masters.length > 0 });
    },
  },
  {
    id: "A4",
    band: "A",
    kind: "mechanical+agent",
    title: "catalog UX fields populated",
    run: async (ctx) => [
      ...checkDomainCatalogCopy(ctx.domain),
      judgment(
        "A4",
        "catalog_tagline is a single-sentence buyer-voice one-liner and catalog_description is 1-2 short buyer-voice paragraphs (workflow + value, not analyst voice); written-but-unconfirmed copy stays an open b1b",
      ),
    ],
  },
  agentOnly(
    "A5",
    "A",
    "vendor records reflect current legal ownership",
    "opt-in only (run when the user asks for a vendor refresh or there is evidence of an acquisition): every solutions -> vendors row names the current legal owner",
  ),
];
