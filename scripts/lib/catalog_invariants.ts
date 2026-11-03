// scripts/lib/catalog_invariants.ts
//
// Shape invariants shared by the per-domain health check (scripts/analytics/domain_health.ts,
// wired in scripts/lib/health/checks_b.ts and checks_e.ts) and by loader pre-flights
// (scripts/loaders/load_cluster_drafts.ts; see references/loader-idiom.md "Catalog invariant
// pre-flight"). One definition, so the audit and the write path can never disagree.
//
// Every function is PURE: it takes plain rows and returns findings that carry row ids. No I/O.
// A loader passes its incoming batch plus the existing rows each new row interacts with (for E4,
// the process's existing Accountable rows); the health check passes the domain's rows. Incoming
// rows have no catalog id yet, so a loader passes any stable label as `id`.
//
// Checklist IDs (SKILL.md "Per-domain completeness checklist"):
//   B6b  relationship shape: empty inverse_verb; one_to_many / many_to_one owner_side names the
//        "one" (parent) side; composition child mastered in the parent's domain           warn
//   B7b  relationship to users that is many_to_many + reference                                       fail
//        relationship-to-users verb combining two kinds of person ("has coordinator and panelists")   warn
//   B9c  lifecycle / state_change event with blank to_state; any non-blank to_state that
//        matches no lifecycle state of the event's entity                                 warn
//   B9f  handoffs sharing trigger event + source module + target module                   warn
//   E4   every gated process has >= 1 Responsible and EXACTLY 1 Accountable               fail
//   E4b  gated lifecycle state with no process_id ("RACI readiness")                      warn
//   E4c  the Accountable persona is also Responsible on the same process                  warn
//   E4d  gate verb that reads as the author's own action (submit_*)                       warn
//   B16  a British spelling in the authored text of a row being written (loader pre-flight)  fail

import { scanBritishSpelling } from "./british_spelling.ts";

export type RowId = number | string;
export type InvariantId = "B6b" | "B7b" | "B9c" | "B9f" | "E4" | "E4b" | "E4c" | "E4d" | "B16";
export type Severity = "fail" | "warn";

export type InvariantFinding = {
  id: InvariantId;
  severity: Severity;
  rule: string; // sub-rule tag, stable (used to group findings)
  rows: RowId[];
  detail: string;
};

// ---------- row shapes (the subset of columns each invariant reads) ----------

export type RelationshipRow = {
  id?: RowId;
  data_object_id: number;
  related_data_object_id: number;
  relationship_type: string; // one_to_one | one_to_many | many_to_one | many_to_many
  relationship_kind: string; // composition | reference | association | inheritance
  relationship_verb: string;
  inverse_verb?: string | null;
  owner_side: string; // source | target
  is_required?: boolean | null;
};

export type TriggerEventRow = {
  id?: RowId;
  event_name: string;
  data_object_id: number;
  event_category?: string | null; // lifecycle | state_change | signal | threshold | ""
  to_state?: string | null;
};

export type LifecycleStateRow = {
  id?: RowId;
  data_object_id: number;
  state_name: string;
  requires_permission?: boolean | null;
  permission_verb_override?: string | null;
  process_id?: number | null;
  domain_module_id?: number | null;
};

export type HandoffRow = {
  id?: RowId;
  trigger_event_id: number | null;
  source_domain_id: number | null;
  target_domain_id: number | null;
  source_domain_module_id?: number | null;
  target_domain_module_id?: number | null;
  data_object_id?: number | null;
};

export type ProcessRaciRow = {
  id?: RowId;
  process_id: number;
  raci: string; // responsible | accountable | consulted | informed (single letters accepted)
  persona_id?: number | null;
  skill_id?: number | null;
};

export type NameOf = (dataObjectId: number) => string;

const defaultName: NameOf = (id) => `#${id}`;
const rowId = (r: { id?: RowId }, i: number): RowId => (r.id ?? `row${i}`);
const blank = (s: unknown): boolean => s == null || String(s).trim() === "";
const norm = (s: unknown): string => String(s ?? "").trim().toLowerCase();

// ---------- B6b: relationship shape ----------

export type RelationshipShapeOptions = {
  nameOf?: NameOf;
  // data_object_id -> domain ids that master it. Enables the composition-coherence sub-rule (M7).
  masterDomainsByDataObject?: Map<number, Set<number>>;
  // Every relationship in the catalog, so the optional-composition sub-rule can see a child's other
  // parents when `rels` is only a subset. Defaults to `rels`.
  allRelationships?: RelationshipRow[];
};

function relationshipText(r: RelationshipRow, nameOf: NameOf): string {
  return `${nameOf(r.data_object_id)} ${r.relationship_verb} ${nameOf(r.related_data_object_id)}`;
}

// The cardinality "one" side, i.e. the parent the owner_side must name. null when the cardinality
// does not decide it (one_to_one, many_to_many).
export function oneSide(relationshipType: string): "source" | "target" | null {
  if (relationshipType === "one_to_many") return "source";
  if (relationshipType === "many_to_one") return "target";
  return null;
}

// The child of a composition: the end opposite the parent, which cardinality decides, then owner_side.
function compositionChild(r: RelationshipRow): number {
  const side = oneSide(r.relationship_type) ?? (r.owner_side === "target" ? "target" : "source");
  return side === "source" ? r.related_data_object_id : r.data_object_id;
}

export function checkRelationshipShape(rels: RelationshipRow[], opts: RelationshipShapeOptions = {}): InvariantFinding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const out: InvariantFinding[] = [];
  const compositionsByChild = new Map<number, number>();
  for (const r of opts.allRelationships ?? rels) {
    if (r.relationship_kind !== "composition") continue;
    const child = compositionChild(r);
    compositionsByChild.set(child, (compositionsByChild.get(child) ?? 0) + 1);
  }
  rels.forEach((r, i) => {
    const id = rowId(r, i);
    if (blank(r.inverse_verb)) {
      out.push({ id: "B6b", severity: "warn", rule: "inverse_verb_empty", rows: [id], detail: `empty inverse_verb on '${relationshipText(r, nameOf)}' (m4b)` });
    }
    const parentSide = oneSide(r.relationship_type);
    if (parentSide && r.owner_side !== parentSide) {
      const tag = r.relationship_kind === "composition" ? "composition (M7)" : `${r.relationship_type} (m5)`;
      out.push({
        id: "B6b",
        severity: "warn",
        rule: "owner_side_not_parent",
        rows: [id],
        detail: `${tag} '${relationshipText(r, nameOf)}' has owner_side=${r.owner_side}; the "one" (parent) side is ${parentSide}. Review, never a blanket flip: if the verb reads child-to-parent, swap the verbs instead`,
      });
    }
    if (r.relationship_kind === "composition" && r.is_required === false && compositionsByChild.get(compositionChild(r)) === 1) {
      out.push({
        id: "B6b",
        severity: "warn",
        rule: "optional_composition_single_parent",
        rows: [id],
        detail: `composition '${relationshipText(r, nameOf)}' is optional, but ${nameOf(compositionChild(r))} has no other parent. A composed child cannot exist without its parent, and a \`parent\` field cannot be empty, so is_required should be true`,
      });
    }
    if (r.relationship_kind === "composition" && opts.masterDomainsByDataObject) {
      const side = parentSide ?? (r.owner_side === "target" ? "target" : "source");
      const parent = side === "source" ? r.data_object_id : r.related_data_object_id;
      const child = side === "source" ? r.related_data_object_id : r.data_object_id;
      const pd = opts.masterDomainsByDataObject.get(parent);
      const cd = opts.masterDomainsByDataObject.get(child);
      // A child with no master anywhere is a non-shared dependent: fine. Only a child mastered in
      // an unrelated domain breaks ownership coherence.
      if (pd && pd.size > 0 && cd && cd.size > 0 && ![...cd].some((d) => pd.has(d))) {
        out.push({
          id: "B6b",
          severity: "warn",
          rule: "composition_child_mastered_elsewhere",
          rows: [id],
          detail: `composition '${relationshipText(r, nameOf)}': composed child ${nameOf(child)} is mastered in domain(s) ${[...cd].join(",")}, not in the parent's domain(s) ${[...pd].join(",")} (M7)`,
        });
      }
    }
  });
  return out;
}

// ---------- B7b: relationships to users ----------

// A verb naming two kinds of person ("has coordinator and panelists", "has recruiter or hiring manager").
// Each kind of person needs its own relationship (its own FK), so one relationship cannot carry both.
export const TWO_PERSON_VERB_RE = /\b(and|or)\b|&|\//i;

export function isUserRelationship(r: RelationshipRow, usersId: number): boolean {
  const a = r.data_object_id === usersId;
  const b = r.related_data_object_id === usersId;
  return a !== b;
}

export function checkUserRelationships(rels: RelationshipRow[], usersId: number, opts: { nameOf?: NameOf } = {}): InvariantFinding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const out: InvariantFinding[] = [];
  rels.forEach((r, i) => {
    if (!isUserRelationship(r, usersId)) return;
    const id = rowId(r, i);
    if (r.relationship_type === "many_to_many" && r.relationship_kind === "reference") {
      out.push({
        id: "B7b",
        severity: "fail",
        rule: "many_to_many_reference",
        rows: [id],
        detail: `'${relationshipText(r, nameOf)}' is many_to_many with kind reference: a reference to users is one person per FK. Model one one_to_many relationship per kind of person, or a real junction`,
      });
    }
    for (const [col, verb] of [["relationship_verb", r.relationship_verb], ["inverse_verb", r.inverse_verb]] as const) {
      if (!blank(verb) && TWO_PERSON_VERB_RE.test(String(verb))) {
        out.push({
          id: "B7b",
          severity: "warn",
          rule: "two_person_verb",
          rows: [id],
          detail: `${col} '${verb}' on '${relationshipText(r, nameOf)}' names two kinds of person; split into one relationship to users per kind of person`,
        });
        break; // one finding per row is enough
      }
    }
  });
  return out;
}

// ---------- B9c: trigger_event states resolve to the lifecycle ----------

const STATEFUL_CATEGORIES = new Set(["lifecycle", "state_change"]);

export function checkEventStates(
  events: TriggerEventRow[],
  lifecycleStates: LifecycleStateRow[],
  opts: { nameOf?: NameOf } = {},
): InvariantFinding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const statesByDO = new Map<number, Set<string>>();
  for (const s of lifecycleStates) {
    let set = statesByDO.get(s.data_object_id);
    if (!set) statesByDO.set(s.data_object_id, (set = new Set()));
    set.add(norm(s.state_name));
  }
  const out: InvariantFinding[] = [];
  events.forEach((e, i) => {
    const id = rowId(e, i);
    const states = statesByDO.get(e.data_object_id);
    const known = states && states.size > 0 ? `known states: ${[...states].join(", ")}` : `${nameOf(e.data_object_id)} has no lifecycle states`;
    const cat = norm(e.event_category);
    if (blank(e.to_state)) {
      if (STATEFUL_CATEGORIES.has(cat)) {
        out.push({ id: "B9c", severity: "warn", rule: "blank_to_state", rows: [id], detail: `${cat} event '${e.event_name}' has a blank to_state (${known})` });
      }
    } else if (!states?.has(norm(e.to_state))) {
      out.push({ id: "B9c", severity: "warn", rule: "unresolved_to_state", rows: [id], detail: `event '${e.event_name}' to_state '${e.to_state}' matches no lifecycle state of ${nameOf(e.data_object_id)} (${known})` });
    }
    // from_state is deliberately NOT checked: SKILL.md B9c's pass criterion names to_state only.
  });
  return out;
}

// ---------- B9f: duplicate handoffs ----------

export function handoffDuplicateKey(h: HandoffRow): string | null {
  if (h.trigger_event_id == null) return null;
  return `${h.trigger_event_id}|${h.source_domain_id}:${h.source_domain_module_id ?? "null"}|${h.target_domain_id}:${h.target_domain_module_id ?? "null"}`;
}

export function checkDuplicateHandoffs(handoffs: HandoffRow[], opts: { eventName?: (id: number) => string } = {}): InvariantFinding[] {
  const groups = new Map<string, { rows: RowId[]; sample: HandoffRow }>();
  handoffs.forEach((h, i) => {
    const k = handoffDuplicateKey(h);
    if (!k) return;
    const g = groups.get(k);
    if (g) g.rows.push(rowId(h, i));
    else groups.set(k, { rows: [rowId(h, i)], sample: h });
  });
  const out: InvariantFinding[] = [];
  for (const { rows, sample } of groups.values()) {
    if (rows.length < 2) continue;
    const ev = opts.eventName?.(sample.trigger_event_id as number) ?? `event ${sample.trigger_event_id}`;
    out.push({
      id: "B9f",
      severity: "warn",
      rule: "same_event_same_modules",
      rows,
      detail: `handoffs ${rows.join(" / ")} share ${ev} and module pair ${sample.source_domain_module_id ?? "null"} -> ${sample.target_domain_module_id ?? "null"} (payloads may differ; review whether one handoff carries both)`,
    });
  }
  return out;
}

// ---------- E4 / E4c: process_raci on gated processes ----------

export function raciLetter(raci: string): "R" | "A" | "C" | "I" | "?" {
  const r = norm(raci);
  if (r === "responsible" || r === "r") return "R";
  if (r === "accountable" || r === "a") return "A";
  if (r === "consulted" || r === "c") return "C";
  if (r === "informed" || r === "i") return "I";
  return "?";
}

const actorKey = (r: ProcessRaciRow): string =>
  r.persona_id != null ? `persona:${r.persona_id}` : r.skill_id != null ? `skill:${r.skill_id}` : "none";

export function checkProcessRaci(
  processIds: number[],
  raci: ProcessRaciRow[],
  opts: { processLabel?: (id: number) => string } = {},
): InvariantFinding[] {
  const label = opts.processLabel ?? ((id: number) => `process ${id}`);
  const byProc = new Map<number, ProcessRaciRow[]>();
  for (const r of raci) {
    const list = byProc.get(r.process_id) ?? [];
    list.push(r);
    byProc.set(r.process_id, list);
  }
  const out: InvariantFinding[] = [];
  for (const pid of [...new Set(processIds)].sort((a, b) => a - b)) {
    const rows = byProc.get(pid) ?? [];
    const r = rows.filter((x) => raciLetter(x.raci) === "R").length;
    const a = rows.filter((x) => raciLetter(x.raci) === "A").length;
    if (r === 0) out.push({ id: "E4", severity: "fail", rule: "no_responsible", rows: [pid], detail: `${label(pid)} has no Responsible` });
    if (a === 0) out.push({ id: "E4", severity: "fail", rule: "no_accountable", rows: [pid], detail: `${label(pid)} has no Accountable` });
    if (a > 1) out.push({ id: "E4", severity: "fail", rule: "multiple_accountable", rows: [pid], detail: `${label(pid)} has ${a} Accountable rows; RACI allows exactly one` });
  }
  return out;
}

export function checkAccountableAlsoResponsible(
  processIds: number[],
  raci: ProcessRaciRow[],
  opts: { processLabel?: (id: number) => string; actorLabel?: (r: ProcessRaciRow) => string } = {},
): InvariantFinding[] {
  const label = opts.processLabel ?? ((id: number) => `process ${id}`);
  const actor = opts.actorLabel ?? actorKey;
  const wanted = new Set(processIds);
  const out: InvariantFinding[] = [];
  const byProc = new Map<number, ProcessRaciRow[]>();
  for (const r of raci) {
    if (!wanted.has(r.process_id)) continue;
    const list = byProc.get(r.process_id) ?? [];
    list.push(r);
    byProc.set(r.process_id, list);
  }
  for (const pid of [...byProc.keys()].sort((a, b) => a - b)) {
    const rows = byProc.get(pid)!;
    const respActors = new Set(rows.filter((x) => raciLetter(x.raci) === "R").map(actorKey));
    for (const a of rows.filter((x) => raciLetter(x.raci) === "A")) {
      if (actorKey(a) === "none" || !respActors.has(actorKey(a))) continue;
      out.push({ id: "E4c", severity: "warn", rule: "accountable_is_responsible", rows: [pid], detail: `${label(pid)}: ${actor(a)} is both Accountable and Responsible (no separation between doing and signing off)` });
    }
  }
  return out;
}

// ---------- E4b / E4d: gated lifecycle states ----------

export const isGated = (s: LifecycleStateRow): boolean => s.requires_permission === true;

// The gate verb the blueprint mints: permission_verb_override, else the state name (the generator
// appends the entity token, which never changes whether the verb reads as an author action).
export function gateVerb(s: LifecycleStateRow): string {
  return blank(s.permission_verb_override) ? String(s.state_name) : String(s.permission_verb_override).trim();
}

// Verbs that read as the record author's own action, not a decision someone else signs off.
// Heuristic (false positives expected): a warn, flagged for remodeling as an owner rule.
export const AUTHOR_ACTION_VERB_RE = /^(re)?submit(s|ted)?(_|$)|^self_/i;

export function checkGatedStatesWired(states: LifecycleStateRow[], opts: { nameOf?: NameOf; moduleLabel?: (id: number | null | undefined) => string } = {}): InvariantFinding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const mod = opts.moduleLabel ?? ((id) => (id == null ? "(no module)" : `module ${id}`));
  const out: InvariantFinding[] = [];
  states.forEach((s, i) => {
    if (!isGated(s) || s.process_id != null) return;
    out.push({
      id: "E4b",
      severity: "warn",
      rule: "gated_state_no_process",
      rows: [rowId(s, i)],
      detail: `${nameOf(s.data_object_id)}.${s.state_name} (gate ${gateVerb(s)}, ${mod(s.domain_module_id)}) has no process_id: blocks the raci access level only`,
    });
  });
  return out;
}

export function checkAuthorActionGates(states: LifecycleStateRow[], opts: { nameOf?: NameOf } = {}): InvariantFinding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const out: InvariantFinding[] = [];
  states.forEach((s, i) => {
    if (!isGated(s)) return;
    const verb = gateVerb(s);
    if (!AUTHOR_ACTION_VERB_RE.test(verb)) return;
    out.push({
      id: "E4d",
      severity: "warn",
      rule: "author_action_gate",
      rows: [rowId(s, i)],
      detail: `gate '${verb}' on ${nameOf(s.data_object_id)}.${s.state_name} reads as the author's own action; consider remodeling it as an owner rule instead of a gate`,
    });
  });
  return out;
}

// ---------- loader pre-flight ----------
//
// Scope is ONLY the rows being written: the incoming batch plus the existing rows each new row
// interacts with. Never the whole catalog, so existing drift never blocks a load.
// `errors` refuse the load; `warnings` print and the load proceeds. Every helper here also refuses British spellings in
// its incoming rows (preflightAuthoredText).

export type PreflightResult = { errors: string[]; warnings: string[]; findings: InvariantFinding[] };

const fmt = (f: InvariantFinding): string => `${f.id} ${f.rule} [${f.rows.join(", ")}]: ${f.detail}`;

function split(findings: InvariantFinding[], isError: (f: InvariantFinding) => boolean): PreflightResult {
  return {
    errors: findings.filter(isError).map(fmt),
    warnings: findings.filter((f) => !isError(f)).map(fmt),
    findings,
  };
}

// Any batch of any table. Error: a British spelling in a string value of a row being written, in prose or in a name,
// code or identifier token. Column names decide what is what (no metadata at load time), so it works on any row shape.
// The other preflight helpers call it on their incoming rows; a loader for any other table calls it directly.
// It sees only what it is handed: a script that calls no preflight is caught later by B16 and be_spelling_sweep.ts --check.
export function preflightAuthoredText(rows: readonly object[], opts: { table?: string } = {}): PreflightResult {
  const hits = scanBritishSpelling(opts.table ?? "(batch)", rows as Record<string, unknown>[]);
  const findings: InvariantFinding[] = hits.map((h) => ({
    id: "B16",
    severity: "fail",
    rule: h.autofix ? "british_prose" : "british_identifier",
    rows: [h.id],
    detail: `${h.table}.${h.column}: ${h.hits.join(", ")}`,
  }));
  return split(findings, () => true);
}

const withAuthoredText = (result: PreflightResult, rows: readonly object[], table: string): PreflightResult => {
  const text = preflightAuthoredText(rows, { table });
  return {
    errors: [...result.errors, ...text.errors],
    warnings: [...result.warnings, ...text.warnings],
    findings: [...result.findings, ...text.findings],
  };
};

// data_object_relationships batch. Error: B7b many_to_many reference relationship to users.
// Warn: B6b (soft by SKILL.md policy), B7b two-person verb.
export function preflightRelationships(
  incoming: RelationshipRow[],
  opts: { usersId: number } & RelationshipShapeOptions,
): PreflightResult {
  const findings = [...checkRelationshipShape(incoming, opts), ...checkUserRelationships(incoming, opts.usersId, opts)];
  return withAuthoredText(split(findings, (f) => f.id === "B7b" && f.rule === "many_to_many_reference"), incoming, "data_object_relationships");
}

// trigger_events batch. `lifecycleStates` = the existing states of the incoming events' entities
// plus any states loaded in the same batch. Warn only (B9c is soft by SKILL.md policy).
export function preflightTriggerEvents(incoming: TriggerEventRow[], lifecycleStates: LifecycleStateRow[], opts: { nameOf?: NameOf } = {}): PreflightResult {
  return withAuthoredText(split(checkEventStates(incoming, lifecycleStates, opts), () => false), incoming, "trigger_events");
}

// handoffs batch. `existing` = catalog handoffs sharing a trigger_event_id with the batch.
// Warn only, and only for duplicate groups that contain at least one incoming row.
export function preflightHandoffs(incoming: HandoffRow[], existing: HandoffRow[]): PreflightResult {
  const tagged = [...incoming.map((h, i) => ({ ...h, id: h.id ?? `incoming${i}` })), ...existing];
  const incomingIds = new Set(tagged.slice(0, incoming.length).map((h) => h.id));
  const findings = checkDuplicateHandoffs(tagged).filter((f) => f.rows.some((r) => incomingIds.has(r)));
  return withAuthoredText(split(findings, () => false), incoming, "handoffs");
}

// process_raci batch. `existing` = the catalog process_raci rows of the processes in the batch
// (at least their Accountable rows). Error: a new Accountable on a process that already has one,
// or two new Accountable rows for one process. Warn: a process left with zero Accountable or zero
// Responsible after the batch (a batch may add the Responsible rows first), and E4c.
export function preflightProcessRaci(incoming: ProcessRaciRow[], existing: ProcessRaciRow[]): PreflightResult {
  const sameRow = (a: ProcessRaciRow, b: ProcessRaciRow) =>
    a.process_id === b.process_id && raciLetter(a.raci) === raciLetter(b.raci) && actorKey(a) === actorKey(b);
  // An incoming row identical to an existing one is an idempotent re-run, not a second row.
  const fresh = incoming.filter((n) => !existing.some((e) => sameRow(n, e)));
  const findings: InvariantFinding[] = [];
  const procs = [...new Set(incoming.map((r) => r.process_id))].sort((a, b) => a - b);
  for (const pid of procs) {
    const exA = existing.filter((e) => e.process_id === pid && raciLetter(e.raci) === "A");
    const newA = fresh.filter((n) => n.process_id === pid && raciLetter(n.raci) === "A");
    if (newA.length > 0 && exA.length + newA.length > 1) {
      findings.push({
        id: "E4",
        severity: "fail",
        rule: "multiple_accountable",
        rows: [pid],
        detail: `process ${pid}: batch adds ${newA.length} Accountable row(s) (${newA.map(actorKey).join(", ")}) to ${exA.length} existing (${exA.map(actorKey).join(", ") || "none"}); RACI allows exactly one`,
      });
    }
  }
  const after = [...existing.filter((e) => procs.includes(e.process_id)), ...fresh];
  for (const f of checkProcessRaci(procs, after)) {
    if (f.rule === "multiple_accountable") continue; // reported above with batch context
    findings.push({ ...f, severity: "warn", detail: `${f.detail} after this batch` });
  }
  findings.push(...checkAccountableAlsoResponsible(procs, after));
  return withAuthoredText(split(findings, (f) => f.id === "E4" && f.severity === "fail"), incoming, "process_raci");
}

// data_object_lifecycle_states batch. Warn only: E4b (unwired gate), E4d (author-action gate).
export function preflightLifecycleStates(incoming: LifecycleStateRow[], opts: { nameOf?: NameOf } = {}): PreflightResult {
  return withAuthoredText(split([...checkGatedStatesWired(incoming, opts), ...checkAuthorActionGates(incoming, opts)], () => false), incoming, "data_object_lifecycle_states");
}
