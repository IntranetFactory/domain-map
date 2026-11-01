// scripts/lib/health/logic_cefh.ts
//
// Pure check logic for the C, E, F and H bands of the per-domain health check
// (scripts/analytics/domain_health.ts; wired in checks_c.ts, checks_e.ts, checks_f.ts, checks_h.ts).
// Every function takes plain rows and returns plain data; no I/O, no catalog access. The band
// entries fetch rows (ctx.all / ctx.index / ctx.query) and turn the verdicts into Findings.
//
// Ported (the original scripts are not edited here; a later pass rewires them to call this module):
//   scripts/analytics/audit_backlog.ts   C1 (function ownership), F2-as-F3 (full modules carry tools),
//                                        H1 (cross-domain handoff APQC tagging)
//   scripts/analytics/phase_p_triage.ts  E1 (live-persona filter, persona reach, Phase P verdict),
//                                        B13 predicate (unclassified masters, folded into E6)
//   scripts/analytics/coverage_rollup.ts F5 (SCORES tiers, `covers`, the tool_id dedup in `rollup`)
//
// Pass criteria and severities follow SKILL.md "Per-domain completeness checklist" (the source of
// truth): hard blockers are `fail`, soft checks are `warn`.

export type RowId = number | string;

export type Verdict = {
  result: "pass" | "fail" | "warn";
  rows: RowId[];
  detail: string;
};

const pass = (detail: string, rows: RowId[] = []): Verdict => ({ result: "pass", rows, detail });
const fail = (detail: string, rows: RowId[]): Verdict => ({ result: "fail", rows, detail });
const warn = (detail: string, rows: RowId[]): Verdict => ({ result: "warn", rows, detail });

const blank = (s: unknown): boolean => s == null || String(s).trim() === "";
const byNum = (a: number, b: number) => a - b;

const MAX_LIST = 12;
export function listOf(items: string[], max = MAX_LIST): string {
  if (items.length <= max) return items.join(", ");
  return `${items.slice(0, max).join(", ")}, ...+${items.length - max} more`;
}

// ============================================================================ C1

export type FunctionDomainRow = {
  business_function_id: number;
  domain_id?: number;
  responsibility_type: string | null;
};

// C1: >= 1 business_function_domains row with responsibility_type='owner'; exempt for
// domain_kind='bundle'. audit_backlog.ts counted ANY row (its C1 was "zero rows"); SKILL.md asks for
// an owner row, so a domain with only contributors / consumers fails here.
export function checkFunctionOwnership(
  domainKind: string | null | undefined,
  rows: FunctionDomainRow[],
  fnLabel: (id: number) => string = (id) => `function ${id}`,
): Verdict {
  const owners = rows.filter((r) => r.responsibility_type === "owner").map((r) => r.business_function_id);
  const others = rows.filter((r) => r.responsibility_type !== "owner");
  const otherText = others.length ? `; ${others.length} other: ${listOf(others.map((r) => `${fnLabel(r.business_function_id)} (${r.responsibility_type ?? "no type"})`))}` : "";
  if (domainKind === "bundle") return pass(`exempt: domain_kind='bundle' (${owners.length} owner rows${otherText})`);
  if (owners.length === 0) {
    return fail(`no business_function_domains owner row (${rows.length} rows in total${otherText}); link the owning function from the function spine`, []);
  }
  return pass(`${owners.length} owner: ${listOf(owners.map(fnLabel))}${otherText}`);
}

// ============================================================================ E1 / E2 / E3

export type PersonaRow = {
  id: number;
  role_code?: string | null;
  business_function_id: number | null;
  record_status?: string | null;
};

export type RoleModuleRow = {
  id?: RowId;
  role_id: number;
  domain_module_id: number;
  interaction_level?: string | null;
};

// phase_p_triage.ts: a persona is live unless its record_status marks it removed. Permissive on
// purpose: only explicit archive / delete tombstones drop out; new / active / blank all count.
const PERSONA_TOMBSTONES = new Set(["archived", "deleted", "removed"]);
export function isLivePersona(r: Pick<PersonaRow, "record_status">): boolean {
  return !PERSONA_TOMBSTONES.has(String(r.record_status ?? "").toLowerCase());
}

export type DomainPersonas = {
  reach: number[]; // live personas with >= 1 role_modules row on the domain's modules
  functionScoped: number[]; // live personas of an owning function of the domain
  all: number[]; // the union (SKILL.md E1), sorted
};

// SKILL.md E1: /domain_roles of the owning function UNION the personas touching any of the domain's
// modules via role_modules. phase_p_triage.ts counted the reach half only (persona_count).
export function domainPersonas(opts: {
  moduleIds: Iterable<number>;
  ownerFunctionIds: Iterable<number>;
  personas: PersonaRow[];
  roleModules: RoleModuleRow[];
}): DomainPersonas {
  const live = new Map(opts.personas.filter(isLivePersona).map((p) => [p.id, p]));
  const mods = new Set(opts.moduleIds);
  const fns = new Set(opts.ownerFunctionIds);
  const reach = new Set<number>();
  for (const rm of opts.roleModules) if (mods.has(rm.domain_module_id) && live.has(rm.role_id)) reach.add(rm.role_id);
  const functionScoped = new Set<number>();
  for (const p of live.values()) if (p.business_function_id != null && fns.has(p.business_function_id)) functionScoped.add(p.id);
  return {
    reach: [...reach].sort(byNum),
    functionScoped: [...functionScoped].sort(byNum),
    all: [...new Set([...reach, ...functionScoped])].sort(byNum),
  };
}

// SKILL.md E1 module shape. "single": capability_count < 3 and at most one module (E1 vacuously
// passes; the 2-module floor blocks persona authoring). "multi": >= 2 modules OR >= 3 capabilities.
export type PersonaShape = "single" | "multi";
export function personaShape(moduleCount: number, capabilityCount: number): PersonaShape {
  return moduleCount >= 2 || capabilityCount >= 3 ? "multi" : "single";
}

// phase_p_triage.ts verdict table (without its ATS-pilot special case, which stays in the script).
export type PhasePVerdict = "BUILD" | "MODULARIZE" | "VERIFY-SCOPE" | "PHASE-P" | "OK-PERSONAS";
export function phasePVerdict(moduleCount: number, capabilityCount: number, personaCount: number): PhasePVerdict {
  if (moduleCount === 0) return "BUILD";
  if (moduleCount === 1 && capabilityCount >= 3) return "MODULARIZE";
  if (moduleCount === 1) return "VERIFY-SCOPE";
  if (personaCount === 0) return "PHASE-P";
  return "OK-PERSONAS";
}

// E1: on a "multi" domain, ZERO personas in the union fails (absence is loud, SKILL.md). A union
// carried only by owning-function personas that reach none of the domain's modules is a warn: the
// derived blueprint section 9 would show no persona for this domain's modules.
export function checkPersonaCoverage(
  moduleCount: number,
  capabilityCount: number,
  p: DomainPersonas,
  label: (roleId: number) => string = (id) => `role ${id}`,
): Verdict[] {
  const shape = personaShape(moduleCount, capabilityCount);
  const counts = `${moduleCount} modules, ${capabilityCount} capabilities`;
  if (shape === "single") {
    return [pass(`vacuous: single-module shape (${counts}); the 2-module floor blocks persona authoring (${p.all.length} personas)`)];
  }
  // Reach-only: a persona counts when it reaches one of the domain's modules (role_modules), since
  // only those personas are provisioned for the modules. Owning-function personas that reach other
  // domains' modules only are named in the detail but do not satisfy E1.
  if (p.reach.length === 0) {
    const route = moduleCount < 2 ? `; ${moduleCount} module(s) with >= 3 capabilities, so M2 (modularize) comes first` : "";
    const elsewhere = p.functionScoped.length ? `; ${p.functionScoped.length} owning-function personas reach other domains' modules only` : "";
    return [fail(`zero personas reaching the domain's modules (${counts})${elsewhere}${route}`, [])];
  }
  return [pass(`${p.reach.length} personas reach the domain's modules (rows = domain_roles ids): ${listOf(p.reach.map(label))}`)];
}

// E2: every E1 persona has >= 2 role_modules rows (any module, catalog-wide).
export function checkPersonaFloor(personaIds: number[], roleModules: RoleModuleRow[], label: (roleId: number) => string = (id) => `role ${id}`): Verdict {
  if (personaIds.length === 0) return pass("vacuous: no personas (see E1)");
  const n = new Map<number, number>();
  for (const rm of roleModules) n.set(rm.role_id, (n.get(rm.role_id) ?? 0) + 1);
  const bad = personaIds.filter((id) => (n.get(id) ?? 0) < 2);
  if (bad.length === 0) return pass(`${personaIds.length} personas, each with >= 2 role_modules rows`);
  return fail(`${bad.length} of ${personaIds.length} personas below the 2-module floor (rows = domain_roles ids): ${listOf(bad.map((id) => `${label(id)}: ${n.get(id) ?? 0}`))}`, bad);
}

export const INTERACTION_LEVELS = new Set(["primary", "secondary"]);

// E3: every role_modules row of an E1 persona has interaction_level primary / secondary.
export function checkInteractionLevels(personaIds: number[], roleModules: RoleModuleRow[], label: (roleId: number) => string = (id) => `role ${id}`): Verdict {
  if (personaIds.length === 0) return pass("vacuous: no personas (see E1)");
  const ids = new Set(personaIds);
  const mine = roleModules.filter((rm) => ids.has(rm.role_id));
  const bad = mine.filter((rm) => !INTERACTION_LEVELS.has(String(rm.interaction_level ?? "")));
  if (bad.length === 0) return pass(`${mine.length} role_modules rows of ${personaIds.length} personas, all primary / secondary`);
  return fail(
    `${bad.length} of ${mine.length} role_modules rows lack a valid interaction_level (rows = role_modules ids): ${listOf(bad.map((rm) => `${rm.id ?? "?"} ${label(rm.role_id)} -> module ${rm.domain_module_id}: ${rm.interaction_level == null ? "null" : JSON.stringify(rm.interaction_level)}`))}`,
    bad.map((rm) => rm.id ?? `${rm.role_id}.${rm.domain_module_id}`),
  );
}

// ============================================================================ E6 (mechanical half) / B13

// The B13 predicate, as phase_p_triage.ts reads it: entity_type null, blank or 'unclassified'.
export function isUnclassified(entityType: string | null | undefined): boolean {
  return blank(entityType) || entityType === "unclassified";
}

export function checkMastersClassified(
  masters: number[],
  entityTypeOf: (id: number) => string | null | undefined,
  nameOf: (id: number) => string = (id) => `#${id}`,
): Verdict {
  const bad = masters.filter((id) => isUnclassified(entityTypeOf(id))).sort(byNum);
  if (masters.length === 0) return pass("vacuous: no masters");
  if (bad.length === 0) return pass(`entity_type: all ${masters.length} masters classified`);
  return fail(`entity_type: ${bad.length} of ${masters.length} masters unclassified (B13 predicate; rows = data_object ids; classify each in this domain's review context, b13_resolver.ts proposes): ${listOf(bad.map(nameOf))}`, bad);
}

// ============================================================================ F1 / F2 / F8 (skills)

export type SkillRow = {
  id: number;
  skill_name?: string | null;
  skill_type: string | null;
  domain_id: number | null;
  description?: string | null;
  trigger_keywords?: string | null;
};

const skillLabel = (s: SkillRow) => `${s.skill_name ?? "?"} (skill ${s.id})`;

// F1 (catalog-wide by definition): a skill_type='domain' row with NULL domain_id is an orphan.
export function checkOrphanDomainSkills(skills: SkillRow[]): Verdict {
  const domainSkills = skills.filter((s) => s.skill_type === "domain");
  const orphans = domainSkills.filter((s) => s.domain_id == null);
  const scope = `catalog-wide (one /skills query, shared with F2 / F8): ${domainSkills.length} domain skills`;
  if (orphans.length === 0) return pass(`${scope}, none orphaned (domain_id set on every one)`);
  return fail(`${scope}, ${orphans.length} with domain_id NULL (rows = skills ids; not this domain's own defect): ${listOf(orphans.map(skillLabel))}`, orphans.map((s) => s.id));
}

export function domainSkillsOf(skills: SkillRow[], domainId: number): SkillRow[] {
  return skills.filter((s) => s.skill_type === "domain" && s.domain_id === domainId).sort((a, b) => a.id - b.id);
}

// F2: exactly one skill_type='domain' skill on the domain. Bundle domains are NOT exempt.
export function checkSingleDomainSkill(domainSkills: SkillRow[]): Verdict {
  if (domainSkills.length === 1) return pass(`one domain skill: ${skillLabel(domainSkills[0])}`);
  if (domainSkills.length === 0) return fail("no skill_type='domain' skill on this domain (a Phase-S gap; author it per Phase S)", []);
  return fail(`${domainSkills.length} domain skills (exactly one allowed; keep one, delete the extras; rows = skills ids): ${listOf(domainSkills.map(skillLabel))}`, domainSkills.map((s) => s.id));
}

export const USE_FOR_RE = /\buse\s+for\s*:/i;

// F8 mechanical half: description and trigger_keywords both non-empty; description carries no
// embedded `Use for:` segment (the emitter renders that tail from trigger_keywords).
export function checkSkillCopy(domainSkills: SkillRow[]): Verdict[] {
  if (domainSkills.length === 0) return [fail("no domain skill to check (see F2)", [])];
  const out: Verdict[] = [];
  for (const s of domainSkills) {
    const problems: string[] = [];
    if (blank(s.description)) problems.push("description empty");
    if (blank(s.trigger_keywords)) problems.push("trigger_keywords empty");
    if (!blank(s.description) && USE_FOR_RE.test(String(s.description))) problems.push("description embeds a 'Use for:' segment");
    if (problems.length) out.push(fail(`${skillLabel(s)}: ${problems.join("; ")} (b1a B1A-SKILL-COPY-<DOMAIN>; rows = skills ids)`, [s.id]));
  }
  if (out.length === 0) {
    return [pass(`${listOf(domainSkills.map(skillLabel))}: description and trigger_keywords present, no embedded 'Use for:'`)];
  }
  return out;
}

// ============================================================================ F3 / F4 / F5 (tools)

export type ModuleToolRow = {
  id?: RowId;
  domain_module_id: number;
  tool_id: number;
  requirement_level?: string | null;
};

export type ToolRow = {
  id: number;
  tool_name: string;
  operation_kind: string | null;
  data_object_id: number | null;
  coverage_tier: string | null;
};

export type ModuleLite = { id: number; domain_module_code: string; module_kind?: string | null };

// F3: >= 1 domain_module_tools row across the domain's PRIMARY modules (fail on zero). Soft (warn):
// each FULL module carries >= 1 row (audit_backlog.ts's per-module "F2" shape; starters exempt), and
// the practical required floor of SKILL.md (>= 3 distinct required tools with >= 1 query, >= 1
// mutate, >= 1 workflow gate; the gate leg only when the domain's masters carry a gated state).
export function checkModuleTools(
  modules: ModuleLite[],
  moduleTools: ModuleToolRow[],
  toolsById: Map<number, ToolRow>,
  opts: { hasGatedStates?: boolean } = {},
): Verdict[] {
  const modIds = new Set(modules.map((m) => m.id));
  const mine = moduleTools.filter((r) => modIds.has(r.domain_module_id));
  if (modules.length === 0) return [fail("no primary modules, so no domain_module_tools (see M1)", [])];
  if (mine.length === 0) {
    return [fail(`0 domain_module_tools rows across ${modules.length} primary modules (rows = domain_modules ids): ${listOf(modules.map((m) => m.domain_module_code))}`, modules.map((m) => m.id))];
  }
  const distinct = new Set(mine.map((r) => r.tool_id));
  const out: Verdict[] = [pass(`${mine.length} domain_module_tools rows, ${distinct.size} distinct tools across ${modules.length} primary modules`)];
  const withTools = new Set(mine.map((r) => r.domain_module_id));
  const bare = modules.filter((m) => m.module_kind !== "starter" && !withTools.has(m.id));
  if (bare.length) {
    out.push(warn(`${bare.length} full modules carry no domain_module_tools (rows = domain_modules ids): ${listOf(bare.map((m) => m.domain_module_code))}`, bare.map((m) => m.id)));
  }
  const required = [...new Set(mine.filter((r) => r.requirement_level === "required").map((r) => r.tool_id))];
  const kinds = (pred: (t: ToolRow) => boolean) => required.filter((id) => {
    const t = toolsById.get(id);
    return t ? pred(t) : false;
  }).length;
  const q = kinds((t) => t.operation_kind === "query");
  const m = kinds((t) => t.operation_kind === "mutate");
  const g = kinds((t) => t.coverage_tier === "semantius_workflow");
  const gaps: string[] = [];
  if (required.length < 3) gaps.push(`${required.length} distinct required tools (< 3)`);
  if (q === 0) gaps.push("no required query tool");
  if (m === 0) gaps.push("no required mutate tool");
  if (opts.hasGatedStates && g === 0) gaps.push("no required workflow-gate tool (coverage_tier semantius_workflow) although masters carry gated states");
  if (gaps.length) out.push(warn(`practical required floor not met: ${gaps.join("; ")}`, []));
  return out;
}

// SKILL.md Rule #17: query / mutate REQUIRE data_object_id; fetch / side_effect / compute REQUIRE it
// NULL; inbound allows either. Returns null when the pairing holds, else the reason.
export function toolPairingProblem(t: Pick<ToolRow, "operation_kind" | "data_object_id">): string | null {
  const k = t.operation_kind ?? "";
  const set = t.data_object_id != null;
  if (k === "query" || k === "mutate") return set ? null : `${k} without data_object_id`;
  if (k === "fetch" || k === "side_effect" || k === "compute") return set ? `${k} with data_object_id ${t.data_object_id}` : null;
  if (k === "inbound") return null;
  return `unknown operation_kind ${JSON.stringify(t.operation_kind)}`;
}

// F4: every tool reached through the domain's domain_module_tools keeps the pairing.
export function checkToolPairing(toolIds: Iterable<number>, toolsById: Map<number, ToolRow>): Verdict {
  const ids = [...new Set(toolIds)].sort(byNum);
  const missing = ids.filter((id) => !toolsById.has(id));
  const bad = ids.flatMap((id) => {
    const t = toolsById.get(id);
    const p = t ? toolPairingProblem(t) : null;
    return p ? [{ id, text: `${t!.tool_name} (tool ${id}): ${p}` }] : [];
  });
  if (ids.length === 0) return pass("vacuous: no tools (see F3)");
  const parts: string[] = [];
  if (bad.length) parts.push(`${bad.length} of ${ids.length} tools break the operation_kind <-> data_object_id pairing (rows = tools ids): ${listOf(bad.map((b) => b.text))}`);
  if (missing.length) parts.push(`${missing.length} domain_module_tools.tool_id values match no tools row: ${listOf(missing.map(String))}`);
  if (parts.length) return fail(parts.join("; "), [...bad.map((b) => b.id), ...missing]);
  return pass(`${ids.length} tools, every operation_kind <-> data_object_id pairing valid`);
}

// coverage_rollup.ts SCORES: each score covers the tiers of the one before it plus its own; every
// semantius* tier counts in all three.
export const SCORE_KEYS = ["semantius_score", "semantius_agent_core", "semantius_agent_first"] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];
const AGENT_TIERS: Record<ScoreKey, Set<string>> = {
  semantius_score: new Set(),
  semantius_agent_core: new Set(["agent_native", "agent_common"]),
  semantius_agent_first: new Set(["agent_native", "agent_common", "agent_first"]),
};
export const isSemantiusTier = (tier: string): boolean => tier.startsWith("semantius");
export function tierCovers(key: ScoreKey, tier: string): boolean {
  return isSemantiusTier(tier) || AGENT_TIERS[key].has(tier);
}

export type ScoreTool = { id: number; name: string; tier: string; level: string };
export type SemantiusScores = {
  total: number; // distinct tools (required + optional); 0 = uncomputable
  counts: Record<ScoreKey, number>;
  scores: Record<ScoreKey, number | null>; // fraction in [0, 1]; null when total = 0
  gaps: ScoreTool[]; // tools no score covers (vendor_platform / external / unknown tier)
  belowSemantius: ScoreTool[]; // every tool not on a semantius* tier (SKILL.md: name them with the score)
};

// coverage_rollup.ts `rollup`: dedupe by tool_id with `required` winning over `optional` (the level
// only labels the tool lists; both levels count). Unknown tools / tiers read as tier "?" (uncovered).
export function semantiusScores(rows: Pick<ModuleToolRow, "tool_id" | "requirement_level">[], toolsById: Map<number, Pick<ToolRow, "tool_name" | "coverage_tier">>): SemantiusScores {
  const level = new Map<number, string>();
  for (const r of rows) {
    const prev = level.get(r.tool_id);
    if (prev !== "required") level.set(r.tool_id, r.requirement_level ?? "");
  }
  const ids = [...level.keys()].sort(byNum);
  const tierOf = (id: number) => toolsById.get(id)?.coverage_tier || "?";
  const ref = (id: number): ScoreTool => ({ id, name: toolsById.get(id)?.tool_name ?? `?#${id}`, tier: tierOf(id), level: level.get(id) ?? "" });
  const counts = {} as Record<ScoreKey, number>;
  const scores = {} as Record<ScoreKey, number | null>;
  for (const k of SCORE_KEYS) {
    counts[k] = ids.filter((id) => tierCovers(k, tierOf(id))).length;
    scores[k] = ids.length ? counts[k] / ids.length : null;
  }
  return {
    total: ids.length,
    counts,
    scores,
    gaps: ids.filter((id) => !tierCovers("semantius_agent_first", tierOf(id))).map(ref),
    belowSemantius: ids.filter((id) => !isSemantiusTier(tierOf(id))).map(ref),
  };
}

const pct = (x: number | null) => (x == null ? "n/a" : `${Math.round(x * 100)}%`);

// F5: the score must be COMPUTABLE (>= 1 tool), not high. Uncomputable is the F3 rollup (fail).
// A tool with no tier (dangling tool_id or blank coverage_tier) makes the score unreliable: warn.
export function checkScoreComputable(s: SemantiusScores): Verdict[] {
  if (s.total === 0) return [fail("uncomputable, see F3 (the primary modules carry no domain_module_tools)", [])];
  const line = SCORE_KEYS.map((k) => `${k} ${pct(s.scores[k])} (${s.counts[k]}/${s.total})`).join(", ");
  const below = s.belowSemantius.length ? `; not on a semantius tier: ${listOf(s.belowSemantius.map((t) => `${t.name}(${t.tier}${t.level === "optional" ? ", optional" : ""})`))}` : "";
  const out: Verdict[] = [pass(`${line}${below}`)];
  const unknown = s.belowSemantius.filter((t) => t.tier === "?");
  if (unknown.length) out.push(warn(`${unknown.length} tools have no coverage_tier (counted as uncovered; rows = tools ids): ${listOf(unknown.map((t) => t.name))}`, unknown.map((t) => t.id)));
  return out;
}

// ============================================================================ H1

export type HandoffLite = { id: number; source_domain_id: number | null; target_domain_id: number | null };
export type HandoffProcessLite = { handoff_id: number; proposal_source?: string | null; record_status?: string | null };

// H1 scope: cross-domain handoffs this domain publishes or receives (source != target, one of them
// is the domain). Same set audit_backlog.ts counts per domain.
export function crossDomainHandoffs(handoffs: HandoffLite[], domainId: number): HandoffLite[] {
  return handoffs
    .filter((h) => h.source_domain_id != null && h.target_domain_id != null && h.source_domain_id !== h.target_domain_id)
    .filter((h) => h.source_domain_id === domainId || h.target_domain_id === domainId)
    .sort((a, b) => a.id - b.id);
}

export type H1Coverage = {
  total: number;
  outbound: number;
  inbound: number;
  tagged: number[];
  untagged: number[];
  approved: number; // handoffs with >= 1 approved tag (the headline quality number)
  contextRich: number; // handoffs with >= 1 agent_curated / human_curated tag (the provenance number)
};

export function handoffTagCoverage(cross: HandoffLite[], tags: HandoffProcessLite[], domainId: number): H1Coverage {
  const byHandoff = new Map<number, HandoffProcessLite[]>();
  for (const t of tags) {
    const l = byHandoff.get(t.handoff_id);
    if (l) l.push(t);
    else byHandoff.set(t.handoff_id, [t]);
  }
  const tagged: number[] = [];
  const untagged: number[] = [];
  let approved = 0;
  let contextRich = 0;
  for (const h of cross) {
    const ts = byHandoff.get(h.id) ?? [];
    (ts.length ? tagged : untagged).push(h.id);
    if (ts.some((t) => t.record_status === "approved")) approved++;
    if (ts.some((t) => t.proposal_source === "agent_curated" || t.proposal_source === "human_curated")) contextRich++;
  }
  return {
    total: cross.length,
    outbound: cross.filter((h) => h.source_domain_id === domainId).length,
    inbound: cross.filter((h) => h.target_domain_id === domainId).length,
    tagged,
    untagged,
    approved,
    contextRich,
  };
}

// H1: every cross-domain handoff has >= 1 handoff_processes row, or an explicit defer-to-Discover
// entry in the audit. The script sees only the catalog half, so an untagged handoff fails; the
// deferral half is confirmed by the reviewing agent (the band entry adds that `agent` finding).
export function checkHandoffTags(c: H1Coverage, label: (id: number) => string = (id) => `handoff ${id}`): Verdict {
  const head = `${c.tagged.length}/${c.total} cross-domain handoffs APQC-tagged (${c.outbound} outbound, ${c.inbound} inbound); coverage ${c.approved} with an approved tag, provenance ${c.contextRich} agent / human curated`;
  if (c.total === 0) return pass("vacuous: no cross-domain handoffs");
  if (c.untagged.length === 0) return pass(head);
  return fail(`${head}; ${c.untagged.length} untagged and not verifiably deferred (rows = handoffs ids): ${listOf(c.untagged.map(label))}`, c.untagged);
}
