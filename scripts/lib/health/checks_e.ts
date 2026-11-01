// scripts/lib/health/checks_e.ts
//
// E band: personas, RACI and responsibilities (SKILL.md "E. Personas, RACI & responsibilities").
// Each entry's id matches the SKILL.md checklist; registry.ts asserts coverage.
//
// Implemented on the shared invariants (scripts/lib/catalog_invariants.ts, also used by loader
// pre-flights): E4 (tightened to EXACTLY one Accountable), E4b, E4c, E4d.
// Scope: the gated lifecycle states (requires_permission=true) of the domain's masters, and the
// processes those states wire via process_id. Row ids: E4 / E4c = business_processes.id,
// E4b / E4d = data_object_lifecycle_states.id.
//
// Implemented on the pure logic in logic_cefh.ts (ported from phase_p_triage.ts): E1, E2, E3 and
// the B13 predicate of E6. Persona set (SKILL.md E1) = live domain_roles of an owning function
// (business_function_domains responsibility_type='owner') UNION the live personas reaching any
// primary module via role_modules; E2 / E3 run over that set. Row ids: E1 / E2 = domain_roles.id,
// E3 = role_modules.id. E1-E3 read ctx.all; E1 adds one catalog-wide /capability_domains select for
// the module-shape rule.
//
// E6 also runs the derived-result invariants R1-R8 (scripts/lib/blueprint_invariants.ts, health plan
// Phase 3) over each primary module's derived blueprint (deriveModuleModel on ctx.index / ctx.all),
// one finding per (R id, result). E6 rows: data_objects.id for the B13 predicate, and
// "<R id>:<identifier>" strings (gate code, role slug, process key, handoff id, entity name) for R1-R8.
// The R7 skill clause reads one catalog-wide /skills select.

import {
  checkAccountableAlsoResponsible,
  checkAuthorActionGates,
  checkGatedStatesWired,
  checkProcessRaci,
  gateVerb,
  isGated,
} from "../catalog_invariants.ts";
import { deriveModuleModel, makeDeriveCtx } from "../blueprint_derive.ts";
import { checkModel, RULE_IDS, RULES, type ModelFinding, type RuleId } from "../blueprint_invariants.ts";
import { fromInvariants, judgment, masterLifecycle, personaLabel, processLabel, skipped } from "./helpers.ts";
import { checkInteractionLevels, checkMastersClassified, checkPersonaCoverage, checkPersonaFloor, domainPersonas } from "./logic_cefh.ts";
import type { Check, Finding, HealthCtx } from "./types.ts";

const CAPABILITY_DOMAINS_PATH = "/capability_domains?select=domain_id,capability_id&limit=100000";

async function capabilityCount(ctx: HealthCtx): Promise<number> {
  const rows = await ctx.query(CAPABILITY_DOMAINS_PATH);
  return new Set(rows.filter((r: any) => r.domain_id === ctx.domainId).map((r: any) => r.capability_id)).size;
}

function ownerFunctionIds(ctx: HealthCtx): number[] {
  return (ctx.all.businessFunctionDomainsByDomainId.get(ctx.domainId) ?? [])
    .filter((r: any) => r.responsibility_type === "owner")
    .map((r: any) => r.business_function_id as number);
}

function e1Personas(ctx: HealthCtx) {
  return domainPersonas({
    moduleIds: ctx.moduleIds,
    ownerFunctionIds: ownerFunctionIds(ctx),
    personas: ctx.all.domainRoles,
    roleModules: ctx.all.roleModules,
  });
}

function gatedStates(ctx: HealthCtx): any[] {
  return masterLifecycle(ctx).filter(isGated);
}

function gatedProcessIds(ctx: HealthCtx): number[] {
  return [...new Set(gatedStates(ctx).map((s) => s.process_id).filter((p): p is number => p != null))].sort((a, b) => a - b);
}

// The module a gated state is reported under: its realizing module, else the master's module.
function stateModuleId(ctx: HealthCtx, s: any): number | null {
  if (s.domain_module_id != null) return s.domain_module_id as number;
  return ctx.masterModulesByDataObject.get(s.data_object_id as number)?.[0] ?? null;
}

const SKILLS_PATH = "/skills?select=id,skill_name,skill_type,domain_id&order=id.asc&limit=100000";
const MAX_R_ITEMS = 12;

// E6 derived result: R1-R8 over every primary module's derived blueprint, grouped per (R id, result).
async function derivedResultFindings(ctx: HealthCtx): Promise<Finding[]> {
  const dctx = makeDeriveCtx(ctx.index, ctx.all);
  const skills = await ctx.query(SKILLS_PATH);
  const found: ModelFinding[] = [];
  for (const m of ctx.modules) {
    const ofDomain = (type: string) => skills.filter((s: any) => s.skill_type === type && s.domain_id === m.domain_id).length;
    found.push(...checkModel(deriveModuleModel(m, dctx), { ctx: dctx, skills: { system: ofDomain("system"), domain: ofDomain("domain") } }));
  }
  if (found.length === 0) {
    return [{ id: "E6", result: "pass", detail: `derived result R1-R8: the derived blueprints of all ${ctx.modules.length} modules pass` }];
  }
  const out: Finding[] = [];
  for (const id of RULE_IDS as RuleId[]) {
    const g = found.filter((f) => f.id === id);
    if (g.length === 0) continue;
    const shown = g.slice(0, MAX_R_ITEMS).map((f) => `${f.module}: ${f.detail}`);
    const more = g.length > MAX_R_ITEMS ? `; ...+${g.length - MAX_R_ITEMS} more` : "";
    out.push({
      id: "E6",
      result: RULES[id].severity,
      rows: [...new Set(g.flatMap((f) => f.rows.map((r) => `${id}:${r}`)))],
      detail: `derived result ${id} ${RULES[id].title} (${g.length}): ${shown.join("; ")}${more}`,
    });
  }
  return out;
}

export const E_CHECKS: Check[] = [
  {
    id: "E1",
    band: "E",
    kind: "mechanical",
    title: "persona coverage matches the module shape",
    run: async (ctx) => {
      const caps = await capabilityCount(ctx);
      const vs = checkPersonaCoverage(ctx.modules.length, caps, e1Personas(ctx), (id) => personaLabel(ctx, id));
      return vs.map((v) => ({ id: "E1", ...v }));
    },
  },
  {
    id: "E2",
    band: "E",
    kind: "mechanical",
    title: "2-module floor on every persona",
    run: async (ctx) => [{ id: "E2", ...checkPersonaFloor(e1Personas(ctx).reach, ctx.all.roleModules, (id) => personaLabel(ctx, id)) }],
  },
  {
    id: "E3",
    band: "E",
    kind: "mechanical",
    title: "role_modules carry interaction_level",
    run: async (ctx) => [{ id: "E3", ...checkInteractionLevels(e1Personas(ctx).reach, ctx.all.roleModules, (id) => personaLabel(ctx, id)) }],
  },
  {
    id: "E4",
    band: "E",
    kind: "mechanical",
    title: "gated processes: >= 1 Responsible, exactly 1 Accountable",
    run: async (ctx) => {
      const procs = gatedProcessIds(ctx);
      const found = checkProcessRaci(procs, ctx.all.processRaci, { processLabel: (id) => processLabel(ctx, id) });
      if (found.length === 0) return [{ id: "E4", result: "pass", detail: `${procs.length} gated processes, each with >= 1 Responsible and exactly 1 Accountable (rows = process ids)` }];
      return fromInvariants("E4", found);
    },
  },
  {
    id: "E4b",
    band: "E",
    kind: "mechanical",
    title: "RACI readiness: every gated state wires a process",
    run: async (ctx) => {
      const gated = gatedStates(ctx);
      const found = checkGatedStatesWired(gated, { nameOf: ctx.doName, moduleLabel: (id) => ctx.moduleCode(id) });
      if (found.length === 0) return [{ id: "E4b", result: "pass", detail: `RACI readiness: all ${gated.length} gated states wire a process (rows = lifecycle state ids)` }];
      // Report per module: an unwired gate blocks only the `raci` access level (`gated` needs no process).
      const unwired = new Set(found.flatMap((f) => f.rows));
      const byModule = new Map<string, { total: number; bad: any[] }>();
      for (const s of gated) {
        const code = ctx.moduleCode(stateModuleId(ctx, s));
        const g = byModule.get(code) ?? { total: 0, bad: [] };
        g.total++;
        if (unwired.has(s.id)) g.bad.push(s);
        byModule.set(code, g);
      }
      const out: Finding[] = [];
      for (const [code, g] of [...byModule.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
        if (g.bad.length === 0) continue;
        out.push({
          id: "E4b",
          result: "warn",
          rows: g.bad.map((s) => s.id),
          detail: `RACI readiness ${code}: ${g.bad.length} of ${g.total} gated states have no process_id (blocks the raci level only): ${g.bad.map((s) => `${ctx.doName(s.data_object_id)}.${s.state_name} (${gateVerb(s)})`).join(", ")}`,
        });
      }
      return out;
    },
  },
  {
    id: "E4c",
    band: "E",
    kind: "mechanical",
    title: "Accountable is not also Responsible",
    run: async (ctx) => {
      const procs = gatedProcessIds(ctx);
      const found = checkAccountableAlsoResponsible(procs, ctx.all.processRaci, {
        processLabel: (id) => processLabel(ctx, id),
        actorLabel: (r) => (r.actor_role_id != null ? personaLabel(ctx, r.actor_role_id) : `skill ${r.actor_skill_id}`),
      });
      if (found.length === 0) return [{ id: "E4c", result: "pass", detail: `${procs.length} gated processes checked (rows = process ids)` }];
      return fromInvariants("E4c", found);
    },
  },
  {
    id: "E4d",
    band: "E",
    kind: "mechanical",
    title: "gate verb is not the author's own action",
    run: async (ctx) => {
      const gated = gatedStates(ctx);
      const found = checkAuthorActionGates(gated, { nameOf: ctx.doName });
      if (found.length === 0) return [{ id: "E4d", result: "pass", detail: `${gated.length} gated states checked (rows = lifecycle state ids)` }];
      return fromInvariants("E4d", found);
    },
  },
  skipped(
    "E5",
    "E",
    "(retired) entity-level approver flag",
    "retired: the has_single_approver flag was dropped; accountability is process_raci's single Accountable, covered by E4",
  ),
  {
    id: "E6",
    band: "E",
    kind: "mechanical+agent",
    title: "reach reconciles against derived permissions; entity_type classified; derived result R1-R8",
    run: async (ctx) => {
      const v = checkMastersClassified(ctx.masters, (id) => ctx.index.dataObjectsById.get(id)?.entity_type, ctx.doName);
      return [
        { id: "E6", ...v },
        ...(await derivedResultFindings(ctx)),
        judgment(
          "E6",
          "reach: confirm every persona that reaches a module through role_modules gets a sensible section 9 tier (the derived gate, RACI, handoff and description mechanics are R1-R8 above; R7 is a heuristic, so confirm each R7 hit before acting on it)",
        ),
      ];
    },
  },
];
