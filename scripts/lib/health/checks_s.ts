// scripts/lib/health/checks_s.ts
//
// S band: structural coverage sweep (SKILL.md "S. Structural coverage sweep (run first)").
// Each entry's id matches the SKILL.md checklist; registry.ts asserts coverage.
//
// The pass rules live in logic_sam.ts (pure, unit-tested); this file only fetches. Each check
// ends with a `pass` finding carrying the coverage table the gap report leads with.
// Row ids: S1 = "<table>.<field>" codes, S2 = domain_modules.id, S3 = data_objects.id.

import {
  checkDirectFkCoverage,
  checkMasterCoverage,
  checkModuleCoverage,
  CAPABILITY_DOMAINS_PATH,
  DOMAIN_MODULE_CAPABILITIES_PATH,
  FIELDS_TO_DOMAINS_PATH,
  SKILLS_PATH,
  SOLUTION_DOMAINS_PATH,
  TRIGGER_EVENTS_PATH,
  type DirectFkCount,
  type MasterCoverageRow,
} from "./logic_sam.ts";
import type { Check, HealthCtx } from "./types.ts";

// S1 counts every (table, field) pair /fields reports, so a new FK to `domains` is picked up with
// no code change. Tables another S / A / M check already reads reuse that check's select (one
// memoized fetch); any other table gets one catalog-wide select of just its FK columns.
const SHARED_TABLE_PATHS: Record<string, string> = {
  capability_domains: CAPABILITY_DOMAINS_PATH,
  solution_domains: SOLUTION_DOMAINS_PATH,
  skills: SKILLS_PATH,
};
const IDENT_RE = /^[a-z_][a-z0-9_]*$/;

async function directFkCounts(ctx: HealthCtx): Promise<DirectFkCount[]> {
  const pairs = (await ctx.query(FIELDS_TO_DOMAINS_PATH)) as { table_name: string; field_name: string }[];
  const byTable = new Map<string, string[]>();
  for (const p of pairs) {
    if (!IDENT_RE.test(p.table_name) || !IDENT_RE.test(p.field_name)) throw new Error(`S1: unexpected /fields identifier ${p.table_name}.${p.field_name}`);
    const f = byTable.get(p.table_name) ?? [];
    if (!f.includes(p.field_name)) f.push(p.field_name);
    byTable.set(p.table_name, f);
  }
  const out: DirectFkCount[] = [];
  // Sequential on purpose: each GET spawns a semantius CLI process (see phase_p_triage.ts).
  for (const [table, fields] of [...byTable.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const path = SHARED_TABLE_PATHS[table] ?? `/${table}?select=${[...fields].sort().join(",")}&limit=100000`;
    let rows: any[] | null = null;
    let error: string | undefined;
    try {
      rows = await ctx.query(path);
    } catch (e) {
      error = (e as Error).message.split("\n")[0].slice(0, 160);
    }
    for (const field of [...fields].sort()) {
      if (!rows) {
        out.push({ table_name: table, field_name: field, count: null, error });
        continue;
      }
      const mine = rows.filter((r: any) => r[field] === ctx.domainId);
      const c: DirectFkCount = { table_name: table, field_name: field, count: mine.length };
      if (table === "skills") c.domainSkills = mine.filter((r: any) => r.skill_type === "domain").length;
      out.push(c);
    }
  }
  return out;
}

export const S_CHECKS: Check[] = [
  {
    id: "S1",
    band: "S",
    kind: "mechanical",
    title: "direct FKs to domains have expected row counts",
    run: async (ctx) => checkDirectFkCoverage(await directFkCounts(ctx), ctx.domain.domain_kind),
  },
  {
    id: "S2",
    band: "S",
    kind: "mechanical",
    title: "per-module indirect-table coverage",
    run: async (ctx) => {
      const dmc = await ctx.query(DOMAIN_MODULE_CAPABILITIES_PATH);
      const dmcCount = new Map<number, number>();
      for (const r of dmc) if (ctx.moduleIdSet.has(r.domain_module_id)) dmcCount.set(r.domain_module_id, (dmcCount.get(r.domain_module_id) ?? 0) + 1);
      const dmdoCount = new Map<number, number>(ctx.moduleIds.map((id) => [id, (ctx.all.dmdoByModuleId.get(id) ?? []).length]));
      return checkModuleCoverage(ctx.modules, dmdoCount, dmcCount);
    },
  },
  {
    id: "S3",
    band: "S",
    kind: "mechanical",
    title: "per-master indirect-table coverage",
    run: async (ctx) => {
      // master + always installed: the domain's role='master' rows with is_install_optional=false.
      const ids = [...new Set(ctx.dmdo.filter((r: any) => r.role === "master" && !r.is_install_optional).map((r: any) => r.data_object_id as number))].sort((a, b) => a - b);
      const events = await ctx.query(TRIGGER_EVENTS_PATH);
      const eventCount = new Map<number, number>();
      for (const e of events) eventCount.set(e.data_object_id, (eventCount.get(e.data_object_id) ?? 0) + 1);
      const rows: MasterCoverageRow[] = ids.map((id) => ({
        data_object_id: id,
        entity_type: ctx.index.dataObjectsById.get(id)?.entity_type ?? null,
        states: (ctx.all.lifecycleByDataObjectId.get(id) ?? []).length,
        events: eventCount.get(id) ?? 0,
        aliases: (ctx.all.aliasByDataObjectId.get(id) ?? []).length,
      }));
      return checkMasterCoverage(rows, { nameOf: ctx.doName });
    },
  },
];
