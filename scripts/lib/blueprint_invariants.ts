// scripts/lib/blueprint_invariants.ts
//
// Derived-result invariants R1-R8 (plans/domain-health-and-blueprint-quality-plan.md Phase 3):
// checks on the BlueprintModel that deriveModuleModel / deriveBlueprintModel produce, i.e. on what a
// blueprint's sections 6-9 SHOW, not on the catalog rows behind them (the data-layer checks live in
// catalog_invariants.ts and the health bands). Prefix R because the checklist already has a D1.
//
//   R1  every role named in 9.(n+1) functional ownership exists among each module's 9.k
//       baseline roles (and carries the named default tier)                                    fail
//   R2  every gate in a RACI row is minted in 8.1                                              fail
//   R3  no gate listed twice in one RACI row                                                   fail
//   R4  every gated process has exactly one Accountable row, and every gate wired to a
//       process is held by exactly one Accountable row                                         fail
//   R5  every Informed row resolves to at least one trigger_event                              warn
//   R6  every 6.2 / 6.3 handoff event resolves to_state on its entity's lifecycle (the B9c
//       rule, catalog_invariants.ts checkEventStates, applied to the handoffs section 6 shows) warn
//   R7  the module description does not contradict the derived counts (heuristic): gates,
//       baseline permissions, system / domain skills                                          warn
//   R8  every row-scope rule's entity has a single-person ownership edge to `users`             warn
//
// Pure: no catalog fetch, no file IO, no console output. Callers: generate_blueprints.ts (stderr on
// every emit, and `--lint`), the health check E6 (scripts/lib/health/checks_e.ts), the architect
// contract harness (scripts/analytics/blueprint_contract_check.ts), and the tests.
//
// Pass `opts.ctx` (the DeriveCtx the model was derived from) whenever you have it: R4's per-process
// half needs it to resolve process ids to the `process_key` the RACI rows carry, and R6 reads the
// trigger event's own entity (and that entity's lifecycle when it is out of scope) from it. Without
// it, R4 runs its per-gate half only and R6 resolves events against the handoff's payload entity.

import {
  checkEventStates,
  oneSide,
  raciLetter,
  TWO_ROLE_VERB_RE,
  type LifecycleStateRow,
  type TriggerEventRow,
} from "./catalog_invariants.ts";
import type { BlueprintModel, DeriveCtx, HandoffModel, ModuleAccessModel } from "./blueprint_derive.ts";
import type { Finding } from "./health/types.ts";

export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8";

export const RULES: Record<RuleId, { severity: "fail" | "warn"; title: string }> = {
  R1: { severity: "fail", title: "every functional-ownership role exists among the baseline roles" },
  R2: { severity: "fail", title: "every gate in a RACI row is minted in 8.1" },
  R3: { severity: "fail", title: "no gate listed twice in one RACI row" },
  R4: { severity: "fail", title: "one Accountable row per gated process; every wired gate held by exactly one" },
  R5: { severity: "warn", title: "every Informed row resolves to a trigger_event" },
  R6: { severity: "warn", title: "every 6.2 / 6.3 handoff event resolves to_state on its entity's lifecycle" },
  R7: { severity: "warn", title: "the module description agrees with the derived counts (heuristic)" },
  R8: { severity: "warn", title: "every row-scope rule's entity has a single-person users edge" },
};

export const RULE_IDS = Object.keys(RULES) as RuleId[];

// A health Finding (scripts/lib/health/types.ts) plus the module it is about. `rows` name the
// derived identifiers involved: gate codes, role slugs, process keys, handoff ids, entity names.
export type ModelFinding = Finding & {
  id: RuleId;
  result: "fail" | "warn";
  module: string; // domain_module_code (codes joined by "+" for a model-level finding on a multi-module scope)
  rows: (number | string)[];
};

export type CheckModelOptions = {
  // The DeriveCtx the model was derived from (see the header).
  ctx?: DeriveCtx;
  // R7's skill clause. Skills attach to domains, never to a module (SKILL.md F1), so a module's own
  // `system` skill count is 0 unless given; `domain` (the parent domain's domain skills) is checked
  // only when known.
  skills?: { system?: number; domain?: number };
};

const LIFECYCLE_GATE = "workflow-gate (lifecycle)";
const GRANT_RE = /grant gates \[([^\]]*)\]/;
const NOTIFY_RE = /notify on trigger_events \[([^\]]*)\]/;

// The gate codes a RACI realization grants (`grant gates [a, b]`), or null when it grants none.
export function grantedGates(realization: string): string[] | null {
  const m = realization.match(GRANT_RE);
  return m ? m[1].split(",").map((c) => c.trim()).filter(Boolean) : null;
}

// The trigger_events an Informed realization notifies on (`notify on trigger_events [a, b]`).
export function notifiedEvents(realization: string): string[] {
  const m = realization.match(NOTIFY_RE);
  return m ? m[1].split(",").map((c) => c.trim()).filter(Boolean) : [];
}

export function checkModel(model: BlueprintModel, opts: CheckModelOptions = {}): ModelFinding[] {
  const out: ModelFinding[] = [];
  const add = (id: RuleId, module: string, rows: (number | string)[], detail: string) =>
    out.push({ id, result: RULES[id].severity, module, rows, detail });
  const scopeLabel = model.modules.map((m) => m.domain_module_code).join("+");

  for (const pm of model.perModule) {
    const code = pm.module.domain_module_code;
    checkFunctionalRoles(model, pm, (rows, d) => add("R1", code, rows, d));
    checkRaciGateLists(pm, (id, rows, d) => add(id, code, rows, d));
    checkAccountableHolders(pm, opts.ctx, (rows, d) => add("R4", code, rows, d));
    checkInformedRows(pm, (rows, d) => add("R5", code, rows, d));
    checkDescriptionCounts(pm, opts.skills, (rows, d) => add("R7", code, rows, d));
    checkRowScopeOwners(model, pm, (rows, d) => add("R8", code, rows, d));
  }
  checkHandoffStates(model, opts.ctx, (rows, d) => add("R6", scopeLabel, rows, d));

  const order = (id: RuleId) => RULE_IDS.indexOf(id);
  const sc = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return out.sort((a, b) => order(a.id) - order(b.id) || sc(a.module, b.module) || sc(a.detail, b.detail));
}

// ---------- R1: functional-ownership roles exist in the baseline roles ----------

// §9.(n+1) `default role` -> the §9.k baseline role suffix (`<slug>_viewer` / `_manager` / `_admin`).
// The generator writes admin / manage / read; the architect template writes viewer / manager / admin.
const BASELINE_SUFFIX: Record<string, string> = { admin: "admin", manage: "manager", manager: "manager", read: "viewer", viewer: "viewer" };

function checkFunctionalRoles(model: BlueprintModel, pm: ModuleAccessModel, report: (rows: string[], detail: string) => void): void {
  for (const fo of model.functionalOwnership) {
    const suffix = BASELINE_SUFFIX[fo.defaultRole];
    if (!suffix) {
      report([fo.func], `functional ownership row "${fo.responsibility} ${fo.func}" names default role \`${fo.defaultRole}\`, which maps to no baseline role (responsibility_type must be owner, contributor or consumer)`);
      continue;
    }
    const want = `${pm.slug}_${suffix}`;
    const role = pm.baselineRoles.find((r) => r.code === want);
    if (!role) {
      report([want, fo.func], `functional ownership gives ${fo.func} (${fo.responsibility}) the \`${fo.defaultRole}\` role, but the baseline roles have no \`${want}\` (they are ${pm.baselineRoles.map((r) => `\`${r.code}\``).join(", ") || "empty"})`);
    } else if (role.grant !== `${pm.slug}${fo.defaultTier}`) {
      report([want, fo.func], `functional ownership gives ${fo.func} (${fo.responsibility}) the \`${fo.defaultRole}\` role with tier \`${fo.defaultTier}\`, but \`${want}\` grants \`${role.grant}\``);
    }
  }
}

// ---------- R2 / R3: RACI gate lists name minted gates, each once ----------

function checkRaciGateLists(pm: ModuleAccessModel, report: (id: RuleId, rows: string[], detail: string) => void): void {
  const minted = new Set(pm.permissions.filter((p) => p.tier.startsWith("workflow-gate")).map((p) => p.code));
  for (const g of pm.raci) {
    const codes = grantedGates(g.realization);
    if (!codes) continue;
    const where = `${g.raci} row \`${g.actor}\` on \`${g.process}\``;
    for (const c of [...new Set(codes)]) {
      if (!minted.has(c)) report("R2", [c, g.actor], `${where} grants \`${c}\`, which 8.1 does not mint`);
    }
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const c of codes) (seen.has(c) ? dupes : seen).add(c);
    for (const c of dupes) report("R3", [c, g.actor], `${where} lists \`${c}\` ${codes.filter((x) => x === c).length} times`);
  }
}

// ---------- R4: one Accountable row per gated process, one holder per wired gate ----------

function checkAccountableHolders(pm: ModuleAccessModel, ctx: DeriveCtx | undefined, report: (rows: string[], detail: string) => void): void {
  const accountable = pm.raci.filter((g) => raciLetter(g.raci) === "A");
  // Per process (needs ctx: the RACI rows carry process_key, the gates carry process ids). The key
  // fallback matches deriveRaciRealization's, so a process missing from the catalog still lines up.
  const flagged = new Set<number>(); // processes reported here; their single-process gates are not reported again
  if (ctx) {
    const keyOf = (pid: number): string => String(ctx.all.processesById.get(pid)?.process_key ?? `process#${pid}`);
    const pids = [...new Set(pm.gates.flatMap((g) => g.processIds))].sort((a, b) => a - b);
    for (const pid of pids) {
      const key = keyOf(pid);
      const gates = pm.gates.filter((g) => g.processIds.includes(pid)).map((g) => g.code);
      const rows = accountable.filter((g) => g.process === key);
      if (rows.length === 1) continue;
      flagged.add(pid);
      report(
        [key, ...gates],
        rows.length === 0
          ? `gated process \`${key}\` (gates ${gates.map((c) => `\`${c}\``).join(", ")}) has no Accountable row, so nothing holds its gates under raci`
          : `gated process \`${key}\` (gates ${gates.map((c) => `\`${c}\``).join(", ")}) has ${rows.length} Accountable rows (${rows.map((g) => `\`${g.actor}\``).join(", ")}); RACI allows exactly one`,
      );
    }
  }
  // Per gate: a gate wired to a process is in the `grant gates [...]` list of exactly one Accountable row.
  for (const gate of pm.gates) {
    if (gate.processIds.length === 0) continue; // unwired: `gated` needs no process; E4b reports the data
    const holders = accountable.filter((g) => (grantedGates(g.realization) ?? []).includes(gate.code));
    if (holders.length === 1) continue;
    if (gate.processIds.length === 1 && flagged.has(gate.processIds[0])) continue; // already said per process
    const procs = ctx
      ? gate.processIds.map((pid) => `\`${ctx.all.processesById.get(pid)?.process_key ?? `process#${pid}`}\``).join(", ")
      : `${gate.processIds.length} process(es)`;
    report(
      [gate.code],
      `gate \`${gate.code}\` is wired to ${procs} and held by ${holders.length} Accountable rows${holders.length ? ` (${holders.map((g) => `\`${g.actor}\` on \`${g.process}\``).join(", ")})` : ""}; exactly one Accountable row holds a gate`,
    );
  }
}

// ---------- R5: Informed rows resolve to trigger_events ----------

function checkInformedRows(pm: ModuleAccessModel, report: (rows: string[], detail: string) => void): void {
  for (const g of pm.raci) {
    if (raciLetter(g.raci) !== "I") continue;
    if (notifiedEvents(g.realization).length > 0) continue;
    report([g.actor, g.process], `Informed row \`${g.actor}\` on \`${g.process}\` resolves to no trigger_event (no event on the process's gated entities): "${g.realization}"`);
  }
}

// ---------- R6: section 6 handoff events resolve to_state ----------

const triggerEventsByIdCache = new WeakMap<object, Map<number, any>>();
function triggerEventsById(ctx: DeriveCtx): Map<number, any> {
  let m = triggerEventsByIdCache.get(ctx.all);
  if (!m) {
    m = new Map(ctx.all.triggerEvents.map((e: any) => [e.id as number, e]));
    triggerEventsByIdCache.set(ctx.all, m);
  }
  return m;
}

function checkHandoffStates(model: BlueprintModel, ctx: DeriveCtx | undefined, report: (rows: number[], detail: string) => void): void {
  const nameOf = (id: number): string =>
    ctx?.index.dataObjectsById.get(id)?.data_object_name ??
    model.entities.find((e) => e.data_object_id === id)?.data_object.data_object_name ??
    `#${id}`;
  for (const [section, rows] of [["6.2", model.handoffs.outbound], ["6.3", model.handoffs.inbound]] as [string, HandoffModel[]][]) {
    const events: TriggerEventRow[] = [];
    const entityIds = new Set<number>();
    for (const h of rows) {
      const te = h.row.trigger_events;
      if (!te?.event_name) continue;
      // The event's own entity when the catalog row is at hand; else the handoff's payload.
      const own = ctx && h.row.trigger_event_id != null ? triggerEventsById(ctx).get(h.row.trigger_event_id as number) : undefined;
      const did = (own?.data_object_id ?? h.row.data_object_id) as number;
      entityIds.add(did);
      events.push({ id: h.row.id, event_name: String(te.event_name), data_object_id: did, event_category: te.event_category ?? "", to_state: te.to_state ?? "" });
    }
    if (events.length === 0) continue;
    const states: LifecycleStateRow[] = [];
    const inScope = new Set<number>();
    for (const s of model.catalog.lifecycleRows) {
      if (!entityIds.has(s.data_object_id as number)) continue;
      states.push(s);
      inScope.add(s.data_object_id as number);
    }
    if (ctx) for (const did of entityIds) if (!inScope.has(did)) states.push(...(ctx.all.lifecycleByDataObjectId.get(did) ?? []));
    // One finding per distinct problem; rows = the handoff ids showing it.
    const groups = new Map<string, number[]>();
    for (const f of checkEventStates(events, states, { nameOf })) {
      const ids = groups.get(f.detail) ?? [];
      ids.push(...(f.rows as number[]));
      groups.set(f.detail, ids);
    }
    for (const [detail, unsorted] of groups) {
      const ids = [...new Set(unsorted)].sort((a, b) => a - b);
      report(ids, `section ${section} handoff${ids.length > 1 ? "s" : ""} ${ids.join(", ")}: ${detail}`);
    }
  }
}

// ---------- R7: the description agrees with the derived counts (heuristic) ----------

const NUMBER_WORDS: Record<string, number> = {
  no: 0, zero: 0, "a single": 1, single: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const COUNT = "(no|zero|a single|single|one|two|three|four|five|six|seven|eight|nine|ten|\\d+)";
const GATE_QUALIFIER = "(?:workflow|process|approval|lifecycle|permission|state|transition)";
// "no workflow gates", "without any gates", "ungated": a claim of zero gates.
const GATE_NONE_RE = new RegExp(`\\b(?:no|zero|without(?:\\s+any)?)\\s+(?:${GATE_QUALIFIER}\\s+)?gates?\\b|\\bungated\\b`, "i");
// "two approval gates", "a single gate": a claimed count ("a" / "an" alone are not counts).
const GATE_COUNT_RE = new RegExp(`\\b(a single|single|one|two|three|four|five|six|seven|eight|nine|ten|\\d+)\\s+(?:${GATE_QUALIFIER}\\s+)?gates?\\b`, "i");
// "approval gates", "gates the in_negotiation -> approved transition": a claim that gates exist.
const GATE_SOME_RE =
  /\b(?:approval|workflow|process|lifecycle|resolution|permission|sign-off)\s+gates?\b|\bgates\s+(?:the\s+)?[\w-]+(?:\s*(?:->|→)\s*[\w-]+)?\s+(?:lifecycle\s+)?(?:transition|conversion)\b/i;
// "one system skill", "two agent skills", "a single domain skill" (a qualifier is required, so
// "learners build two skills" is not read as a claim about agent skills).
const SKILL_COUNT_RE = new RegExp(`\\b${COUNT}\\s+(system|agent|domain)\\s+skills?(?![-\\w])`, "i");
const BASELINE_COUNT_RE = new RegExp(`\\b${COUNT}\\s+baseline\\s+permissions?\\b`, "i");

function countOf(word: string): number {
  const w = word.toLowerCase().replace(/\s+/g, " ");
  return /^\d+$/.test(w) ? Number(w) : NUMBER_WORDS[w] ?? NaN;
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.;!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

const listCodes = (codes: string[], max = 6): string =>
  codes.slice(0, max).map((c) => `\`${c}\``).join(", ") + (codes.length > max ? `, +${codes.length - max} more` : "");

function checkDescriptionCounts(
  pm: ModuleAccessModel,
  skills: CheckModelOptions["skills"],
  report: (rows: string[], detail: string) => void,
): void {
  const m = pm.module;
  const gates = pm.gates.map((g) => g.code);
  const baseline = pm.permissions.filter((p) => p.tier.startsWith("baseline")).map((p) => p.code);
  const systemSkills = skills?.system ?? 0;
  for (const [field, text] of [["description", m.description], ["catalog_tagline", m.catalog_tagline], ["catalog_description", m.catalog_description]] as const) {
    for (const s of sentences(text ?? "")) {
      const none = s.match(GATE_NONE_RE);
      const count = none ? null : s.match(GATE_COUNT_RE);
      const some = none || count ? null : s.match(GATE_SOME_RE);
      if (none && gates.length > 0) {
        report([field, ...gates], `${field} says "${none[0]}", but 8.1 mints ${gates.length} workflow gate(s): ${listCodes(gates)}`);
      } else if (count && countOf(count[1]) !== gates.length) {
        report([field, ...gates], `${field} says "${count[0]}", but 8.1 mints ${gates.length} workflow gate(s)${gates.length ? `: ${listCodes(gates)}` : ""}`);
      } else if (some && gates.length === 0) {
        report([field], `${field} says "${some[0]}", but 8.1 mints no workflow gate`);
      }
      const sk = s.match(SKILL_COUNT_RE);
      if (sk) {
        const claimed = countOf(sk[1]);
        const kind = sk[2].toLowerCase();
        if (kind === "domain") {
          if (skills?.domain !== undefined && claimed !== skills.domain) {
            report([field], `${field} says "${sk[0]}", but the module's domain has ${skills.domain} domain skill(s)`);
          }
        } else if (claimed !== systemSkills) {
          const dom = skills?.domain !== undefined ? `; its domain has ${skills.domain} domain skill(s)` : "";
          report([field], `${field} says "${sk[0]}", but skills attach to domains, not modules (SKILL.md F1): the module carries ${systemSkills} ${kind} skill(s) of its own${dom}`);
        }
      }
      const bl = s.match(BASELINE_COUNT_RE);
      if (bl && countOf(bl[1]) !== baseline.length) {
        report([field, ...baseline], `${field} says "${bl[0]}", but 8.1 mints ${baseline.length}: ${listCodes(baseline)}`);
      }
    }
  }
}

// ---------- R8: row-scope rules have a single-person users edge ----------

const ROW_SCOPE_FLAGS = new Set(["has_personal_content", "owner_edit"]);

function checkRowScopeOwners(model: BlueprintModel, pm: ModuleAccessModel, report: (rows: string[], detail: string) => void): void {
  for (const rule of pm.businessRules) {
    if (!ROW_SCOPE_FLAGS.has(rule.sourceFlag)) continue;
    const entity = model.entities.find((e) => e.data_object.data_object_name === rule.dataObject);
    if (!entity) {
      report([rule.dataObject, rule.name], `row-scope rule \`${rule.name}\` names \`${rule.dataObject}\`, which is not in scope`);
      continue;
    }
    const did = entity.data_object_id;
    // userRels holds only `users` edges whose other endpoint is in scope, so the endpoint that is
    // not this entity is `users`.
    const edges = model.relationships.userRels.map((r) => r.edge).filter((e) => e.data_object_id === did || e.related_data_object_id === did);
    const why = edges.map((e) => ({ e, problem: singlePersonProblem(e, did) }));
    if (why.some((w) => w.problem === null)) continue;
    const seen = why.length
      ? `its users edges are not single-person: ${why.map((w) => `"${w.e.relationship_verb || "?"}" (${w.e.relationship_type}${w.problem ? `, ${w.problem}` : ""})`).join("; ")}`
      : "it has no users edge";
    report([rule.dataObject, rule.name], `row-scope rule \`${rule.name}\` scopes \`${rule.dataObject}\` rows to a person, but ${seen}`);
  }
}

// null when the edge names one user per row of the entity: `users` on the "one" side of a
// one_to_many / many_to_one (or a one_to_one), with a verb that names one role.
function singlePersonProblem(e: any, entityId: number): string | null {
  const usersSide = e.data_object_id === entityId ? "target" : "source";
  const one = oneSide(String(e.relationship_type));
  const single = e.relationship_type === "one_to_one" || one === usersSide;
  if (!single) return e.relationship_type === "many_to_many" ? "many users per row" : "users is not the one side";
  if (TWO_ROLE_VERB_RE.test(String(e.relationship_verb ?? ""))) return "the verb names two roles";
  return null;
}
