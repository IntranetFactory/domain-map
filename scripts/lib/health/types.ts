// scripts/lib/health/types.ts
//
// Shared types for the per-domain health check (scripts/analytics/domain_health.ts).
//
// Layout (fixed, so each band can be ported in parallel without touching shared files):
//   types.ts      this file: Result / Finding / Check / HealthCtx
//   context.ts    builds HealthCtx for one domain (catalog index + memoized read-only GET)
//   checks_<band>.ts  one exported array per checklist band (S, A, M, B, C, D, E, F, H)
//   registry.ts   concatenates the band arrays, owns CHECKLIST_VERSION, asserts ID coverage
//   record.ts     the `checks:` block splice for audits/<CODE>/state.yaml
//
// A check NEVER writes to the catalog. ctx.query is GET-only by construction.

import type { AllRelationships, CatalogIndex, Domain, ModuleRow } from "../catalog.ts";

// Per-finding outcome. `agent` = a judgment (or a not-yet-ported mechanical half) the reviewing
// agent must still make; `delegated` = run the named script instead; `skipped` = retired/reserved.
export type Result = "pass" | "fail" | "warn" | "agent" | "delegated" | "skipped";

// Aggregation order when one check emits several findings (worst first). A mechanical+agent check
// whose mechanical half passes aggregates to `agent`: the judgment half is still owed.
export const RESULT_ORDER: Result[] = ["fail", "warn", "agent", "delegated", "skipped", "pass"];

export type Band = "S" | "A" | "M" | "B" | "C" | "D" | "E" | "F" | "H";

// How the script treats the check (Phase 1 step 2 of the health plan):
//   mechanical        the script decides pass / fail / warn on its own
//   mechanical+agent  the script runs the presence half; the judgment half is listed as `agent`
//   agent             judgment only; the script emits one `agent` finding naming the judgment
//   delegated         another committed script runs it; the finding names that script
//   skipped           retired or reserved ID; the finding names the reason
export type CheckKind = "mechanical" | "mechanical+agent" | "agent" | "delegated" | "skipped";

export type Finding = {
  id: string; // the check id (always equals the emitting Check.id)
  result: Result;
  // Catalog row ids the finding is about. Each check documents its row type in `detail`
  // (relationship id, trigger_event id, handoff id, lifecycle state id, process id, ...).
  rows?: (number | string)[];
  detail: string;
};

export type Check = {
  id: string; // matches the SKILL.md checklist ID exactly (e.g. "B6b")
  band: Band;
  kind: CheckKind;
  title: string; // short human label for the table
  run(ctx: HealthCtx): Promise<Finding[]>; // [] means pass
};

export type HealthCtx = {
  domain: Domain;
  domainId: number;
  domainCode: string;
  // The domain's PRIMARY modules (domain_modules.domain_id = domain.id), full and starter.
  modules: ModuleRow[];
  moduleIds: number[];
  moduleIdSet: Set<number>;
  // domain_module_data_objects rows on the domain's modules (any role).
  dmdo: any[];
  // <masters>: distinct data_object_ids with role='master' on the domain's modules, sorted.
  // (SKILL.md: never read masters from the retired domain_data_objects rollup.)
  masters: number[];
  masterSet: Set<number>;
  // data_object_id -> ids of the domain's modules that master it.
  masterModulesByDataObject: Map<number, number[]>;
  // data_object_id -> domain ids that master it anywhere in the catalog (for coherence checks).
  masterDomainsByDataObject: Map<number, Set<number>>;
  usersId: number;
  index: CatalogIndex; // from loadCachedCatalog
  all: AllRelationships; // from loadCachedCatalog
  // Memoized, read-only PostgREST GET. Pass a full path ("/trigger_events?select=...&limit=100000").
  // Prefer CATALOG-WIDE selects and filter in memory: the memo is shared across domains in --all
  // runs, so one fetch serves every domain. Returns [] for an empty / null body.
  query(path: string): Promise<any[]>;
  // Convenience lookups.
  doName(dataObjectId: number): string;
  moduleCode(moduleId: number | null | undefined): string;
};
