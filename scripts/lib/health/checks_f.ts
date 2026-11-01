// scripts/lib/health/checks_f.ts
//
// F band: skill-layer integrity (SKILL.md "F. Skill-layer integrity").
// Each entry's id matches the SKILL.md checklist; registry.ts asserts coverage.
//
// Implemented on the pure logic in logic_cefh.ts: F1, F2, F3 (ported from audit_backlog.ts F2),
// F4, F5 (ported from coverage_rollup.ts) and the mechanical half of F8. Three catalog-wide selects,
// memoized across checks and domains: /skills (F1, F2, F8), /domain_module_tools and /tools
// (F3, F4, F5). Scope for F3-F5 is the domain's PRIMARY modules (domain_modules.domain_id = the
// domain, full and starter); starters of other domains that embed one of its entities are not
// folded in. Row ids: F1 / F2 / F8 = skills.id, F3 = domain_modules.id, F4 / F5 = tools.id.

import { isGated } from "../catalog_invariants.ts";
import { agentOnly, judgment, masterLifecycle, skipped } from "./helpers.ts";
import {
  checkModuleTools,
  checkOrphanDomainSkills,
  checkScoreComputable,
  checkSingleDomainSkill,
  checkSkillCopy,
  checkToolPairing,
  domainSkillsOf,
  semantiusScores,
  type ModuleToolRow,
  type SkillRow,
  type ToolRow,
} from "./logic_cefh.ts";
import type { Check, HealthCtx } from "./types.ts";

const SKILLS_PATH = "/skills?select=id,skill_name,skill_type,domain_id,process_id,description,trigger_keywords&order=id.asc&limit=100000";
const MODULE_TOOLS_PATH = "/domain_module_tools?select=id,domain_module_id,tool_id,requirement_level&order=id.asc&limit=100000";
const TOOLS_PATH = "/tools?select=id,tool_name,operation_kind,data_object_id,coverage_tier&order=id.asc&limit=100000";

async function skills(ctx: HealthCtx): Promise<SkillRow[]> {
  return (await ctx.query(SKILLS_PATH)) as SkillRow[];
}

// The domain_module_tools rows on the domain's primary modules.
async function moduleTools(ctx: HealthCtx): Promise<ModuleToolRow[]> {
  const rows = (await ctx.query(MODULE_TOOLS_PATH)) as ModuleToolRow[];
  return rows.filter((r) => ctx.moduleIdSet.has(r.domain_module_id));
}

// One Map per fetched /tools array, shared across domains in --all runs.
const toolMapCache = new WeakMap<any[], Map<number, ToolRow>>();
async function toolsById(ctx: HealthCtx): Promise<Map<number, ToolRow>> {
  const rows = await ctx.query(TOOLS_PATH);
  let m = toolMapCache.get(rows);
  if (!m) toolMapCache.set(rows, (m = new Map((rows as ToolRow[]).map((t) => [t.id, t]))));
  return m;
}

export const F_CHECKS: Check[] = [
  {
    id: "F1",
    band: "F",
    kind: "mechanical",
    title: "every domain skill is domain-anchored",
    run: async (ctx) => [{ id: "F1", ...checkOrphanDomainSkills(await skills(ctx)) }],
  },
  {
    id: "F2",
    band: "F",
    kind: "mechanical",
    title: "exactly one domain skill",
    run: async (ctx) => [{ id: "F2", ...checkSingleDomainSkill(domainSkillsOf(await skills(ctx), ctx.domainId)) }],
  },
  {
    id: "F3",
    band: "F",
    kind: "mechanical",
    title: "modules carry domain_module_tools",
    run: async (ctx) => {
      const hasGatedStates = masterLifecycle(ctx).some(isGated);
      const vs = checkModuleTools(ctx.modules, await moduleTools(ctx), await toolsById(ctx), { hasGatedStates });
      return vs.map((v) => ({ id: "F3", ...v }));
    },
  },
  {
    id: "F4",
    band: "F",
    kind: "mechanical",
    title: "tool operation_kind <-> data_object_id",
    run: async (ctx) => {
      const ids = (await moduleTools(ctx)).map((r) => r.tool_id);
      return [{ id: "F4", ...checkToolPairing(ids, await toolsById(ctx)) }];
    },
  },
  {
    id: "F5",
    band: "F",
    kind: "mechanical",
    title: "Semantius score computable",
    run: async (ctx) => {
      const s = semantiusScores(await moduleTools(ctx), await toolsById(ctx));
      return checkScoreComputable(s).map((v) => ({ id: "F5", ...v }));
    },
  },
  skipped(
    "F6",
    "F",
    "(reserved) tools catalog deduplicated",
    "reserved: the tools dedup pass runs catalog-wide when it ships; not part of the routine audit",
  ),
  agentOnly(
    "F7",
    "F",
    "channel primitives only where the channel is the workflow",
    "every domain_module_tools / process_tools row on send_email, send_sms, post_chat_message, make_phone_call, send_push_notification or send_whatsapp_message carries a workflow-specific notes justification; generic notifications use notify_person / notify_team",
  ),
  {
    id: "F8",
    band: "F",
    kind: "mechanical+agent",
    title: "domain skill description + trigger_keywords",
    run: async (ctx) => {
      const vs = checkSkillCopy(domainSkillsOf(await skills(ctx), ctx.domainId));
      return [
        ...vs.map((v) => ({ id: "F8", ...v })),
        judgment(
          "F8",
          "no vendor / product names in either column (Rule #18); description is trigger-shaped task prose (not meta-shaped, not buyer-segment led, no trailing comma-run keyword list); trigger_keywords is the additive, generic complement of the prose",
        ),
      ];
    },
  },
];
