// scripts/lib/health/checks_m.ts
//
// M band: modules (SKILL.md checklist section "M. Phase M", Rule #14). There is no M3.
// Each entry's id matches the SKILL.md checklist; registry.ts asserts coverage.
//
// The pass rules live in logic_sam.ts (pure, unit-tested); this file only fetches.
// Row ids: M1 / M6 / M8 = domain_modules.id, M4 = capabilities.id, M5 = lifecycle state ids,
// M7 = data_objects.id, M9 = "dmdo:<id>" (part 1) and "rel:<id>" (part 2); M2 names no rows.

import { agentOnly, judgment, masterLifecycle } from "./helpers.ts";
import {
  CAPABILITY_DOMAINS_PATH,
  checkCapabilitiesRealized,
  checkGateRealizers,
  checkModuleCatalogCopy,
  checkModulePresence,
  checkModulesRealizeCapabilities,
  checkModuleSplit,
  checkSelfContainment,
  checkSingleMaster,
  DMDO_WITH_ID_PATH,
  DOMAIN_MODULE_CAPABILITIES_PATH,
  entitySelfContainment,
  relationshipSelfContainment,
  type DmdoRow,
} from "./logic_sam.ts";
import type { Check, HealthCtx } from "./types.ts";

async function domainCapabilities(ctx: HealthCtx): Promise<any[]> {
  return (await ctx.query(CAPABILITY_DOMAINS_PATH)).filter((r: any) => r.domain_id === ctx.domainId);
}

async function moduleCapabilityCounts(ctx: HealthCtx): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  for (const r of await ctx.query(DOMAIN_MODULE_CAPABILITIES_PATH)) {
    if (ctx.moduleIdSet.has(r.domain_module_id)) out.set(r.domain_module_id, (out.get(r.domain_module_id) ?? 0) + 1);
  }
  return out;
}

// dmdo rows with their ids (M7 / M9 name them). One catalog-wide fetch, filtered in memory.
async function dmdoWithIds(ctx: HealthCtx): Promise<DmdoRow[]> {
  return (await ctx.query(DMDO_WITH_ID_PATH)) as DmdoRow[];
}

function moduleDomainCode(ctx: HealthCtx, moduleId: number): string {
  const dom = ctx.index.modulesById.get(moduleId)?.domain_id;
  return dom == null ? "(no domain)" : ctx.index.domainsById.get(dom)?.domain_code ?? `domain ${dom}`;
}

export const M_CHECKS: Check[] = [
  {
    id: "M1",
    band: "M",
    kind: "mechanical",
    title: ">= 1 domain_modules row",
    run: async (ctx) => checkModulePresence(ctx.modules, ctx.domain.domain_kind),
  },
  {
    id: "M2",
    band: "M",
    kind: "mechanical",
    title: ">= 3 capabilities implies >= 2 modules",
    run: async (ctx) => checkModuleSplit((await domainCapabilities(ctx)).length, ctx.modules, ctx.domain.domain_kind),
  },
  {
    id: "M4",
    band: "M",
    kind: "mechanical",
    title: "every capability has a realizing module",
    run: async (ctx) => {
      const caps = (await domainCapabilities(ctx)).map((r: any) => ({ capability_id: r.capability_id as number, capability_code: r.capabilities?.capability_code ?? null }));
      const realized = new Set<number>(
        (await ctx.query(DOMAIN_MODULE_CAPABILITIES_PATH)).filter((r: any) => ctx.moduleIdSet.has(r.domain_module_id)).map((r: any) => r.capability_id as number),
      );
      return checkCapabilitiesRealized(caps, realized);
    },
  },
  {
    id: "M5",
    band: "M",
    kind: "mechanical",
    title: "gated states carry their realizing module",
    run: async (ctx) => {
      const states = masterLifecycle(ctx).filter((s: any) => s.requires_permission === true);
      // The realizer may sit in any module (a re-prefixed gate on another domain's shell), so the
      // held_as lookup is catalog-wide.
      const heldAs = new Map<string, string[]>();
      for (const r of ctx.all.dmdo) {
        const k = `${r.domain_module_id}|${r.data_object_id}`;
        const a = heldAs.get(k) ?? [];
        a.push(r.held_as);
        heldAs.set(k, a);
      }
      return checkGateRealizers(states, {
        heldAsAt: (mid, doId) => heldAs.get(`${mid}|${doId}`) ?? [],
        moduleExists: (mid) => ctx.index.modulesById.has(mid),
        fullModuleCount: ctx.modules.filter((m) => m.module_kind !== "starter").length,
        nameOf: ctx.doName,
        moduleCode: (id) => ctx.moduleCode(id),
      });
    },
  },
  {
    id: "M6",
    band: "M",
    kind: "mechanical",
    title: "every module realizes >= 1 capability",
    run: async (ctx) => checkModulesRealizeCapabilities(ctx.modules, await moduleCapabilityCounts(ctx)),
  },
  {
    id: "M7",
    band: "M",
    kind: "mechanical",
    title: "single-master integrity",
    run: async (ctx) => {
      const dmdo = await dmdoWithIds(ctx);
      const domainRows = dmdo.filter((r) => ctx.moduleIdSet.has(r.domain_module_id));
      const masters = [...new Set(domainRows.filter((r) => r.held_as === "master").map((r) => r.data_object_id))].sort((a, b) => a - b);
      return checkSingleMaster(
        { masters, catalogMasterRows: dmdo.filter((r) => r.held_as === "master"), domainRows },
        { nameOf: ctx.doName, moduleCode: (id) => ctx.moduleCode(id), moduleDomainCode: (id) => moduleDomainCode(ctx, id) },
      );
    },
  },
  {
    id: "M8",
    band: "M",
    kind: "mechanical+agent",
    title: "module catalog UX fields populated",
    run: async (ctx) => [
      ...checkModuleCatalogCopy(ctx.modules),
      judgment(
        "M8",
        "each module's tagline / description is buyer voice (workflow + value, not analyst voice); written-but-unconfirmed copy stays an open b1b",
      ),
    ],
  },
  {
    id: "M9",
    band: "M",
    kind: "mechanical",
    title: "module self-containment (both layers)",
    run: async (ctx) => {
      const dmdo = await dmdoWithIds(ctx);
      const domainRows = dmdo.filter((r) => ctx.moduleIdSet.has(r.domain_module_id));
      const masterModulesByDataObject = new Map<number, number[]>();
      for (const r of dmdo) {
        if (r.held_as !== "master") continue;
        const a = masterModulesByDataObject.get(r.data_object_id) ?? [];
        a.push(r.domain_module_id);
        masterModulesByDataObject.set(r.data_object_id, a);
      }
      const moduleDomain = new Map<number, number | null>(ctx.index.modules.map((m) => [m.id, m.domain_id]));
      const kindById = new Map<number, string>(ctx.index.dataObjects.map((d) => [d.id, d.kind]));
      const part1 = entitySelfContainment(domainRows, { masterModulesByDataObject, moduleDomain, kindById }).violations;

      // Shared master-data (mastered by >= 2 domains) is out of M9's reach in both layers; M7
      // reports the multi-master itself.
      const shared = new Set<number>();
      for (const [doId, mods] of masterModulesByDataObject) {
        if (new Set(mods.map((m) => moduleDomain.get(m)).filter((d) => d != null)).size >= 2) shared.add(doId);
      }
      const scopeByModule = new Map<number, Set<number>>();
      for (const id of ctx.moduleIds) scopeByModule.set(id, new Set());
      for (const r of domainRows) scopeByModule.get(r.domain_module_id)!.add(r.data_object_id);
      const touching = ctx.all.relationships.filter(
        (e: any) => e.is_required === true && [...scopeByModule.values()].some((s) => s.has(e.data_object_id) || s.has(e.related_data_object_id)),
      );
      const part2 = relationshipSelfContainment(scopeByModule, touching, { kindById, excluded: shared });
      return checkSelfContainment(part1, part2, {
        nameOf: ctx.doName,
        moduleCode: (id) => ctx.moduleCode(id),
        domainCode: (id) => ctx.index.domainsById.get(id)?.domain_code ?? `domain ${id}`,
        counts: { rows: domainRows.length, requiredRelationships: touching.length, modules: ctx.modules.length },
      });
    },
  },
  agentOnly(
    "M10",
    "M",
    "module names self-explaining standalone",
    "read each domain_module_name with its code and domain hidden: qualifier + noun or an unambiguous discipline term passes; a bare generic noun (Offers, Interviews, Request Intake) fails. HARD BLOCKER; renames are destructive, so surface each as a q-file yes/no",
  ),
];
