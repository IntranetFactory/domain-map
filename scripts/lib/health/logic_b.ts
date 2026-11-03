// scripts/lib/health/logic_b.ts
//
// Pure logic for the B band of the per-domain health check (SKILL.md "B. Phase B"). Every
// function takes plain rows plus small lookups and returns health findings. No I/O, so each
// rule is unit-tested on literal rows (scripts/lib/__tests__/health_b.test.ts), and the
// catalog-wide scripts it was ported from can call the same code instead of keeping a copy:
//
//   audit_backlog.ts          B1   checkMasterFloor (without its hard-coded leadership list)
//   phase_p_triage.ts         B13  isUnclassified / checkEntityTypeClassified
//   validate_cross_domain.ts  q1   B10b outbound (checkHandoffModuleAttribution)
//                             q2   B10b inbound  (checkHandoffModuleAttribution)
//                             q3   B9 rule event_not_publishable (isPublishableBy, PUBLISH_HELD_AS)
//                             q5   B9 rule event_no_handoff, orphan half (no lifecycle either)
//   be_spelling_sweep.ts      B16  checkBritishSpelling (the map and columns: scripts/lib/british_spelling.ts)
//
// Conventions:
//   - Every function returns a non-empty list. A clean result is one `pass` finding whose detail
//     carries the counts that were checked, so a recorded run shows what "pass" covered.
//   - Severity follows SKILL.md: hard blockers `fail`, soft / report-only checks `warn`, a
//     judgment the script cannot make `agent`.
//   - `rows` are plain catalog ids when a check reports one row type (the detail names it).
//     Checks that mix row types prefix them: "do:12" (data_objects), "event:81"
//     (trigger_events), "state:40" (data_object_lifecycle_states), "handoff:398", "rel:810"
//     (data_object_relationships), and B16 uses "<table>:<id>".

import { BE_AE_MAP, fixBritishSpelling, scanBritishSpelling, type SpellingColumns, type SpellingHit } from "../british_spelling.ts";
import { raciLetter } from "../catalog_invariants.ts";
import type { Finding } from "./types.ts";

export type RowId = number | string;
export type NameOf = (dataObjectId: number) => string;
type Label = (id: number | null | undefined) => string;

// ---------- row shapes (the subset of columns each rule reads) ----------

export type MasterRow = {
  id: number;
  data_object_name: string;
  singular_label?: string | null;
  plural_label?: string | null;
  is_canonical_bare_word?: boolean | null;
  naming_authority_rationale?: string | null;
  entity_type?: string | null;
  has_personal_content?: boolean | null;
};

export type DmdoRow = {
  domain_module_id: number;
  data_object_id: number;
  held_as: string; // master | embedded_master | contributor | consumer | derived
  is_install_optional?: boolean | null;
};

export type RelRow = {
  id?: RowId;
  data_object_id: number;
  related_data_object_id: number;
  relationship_verb?: string | null;
};

export type EventRow = {
  id: number;
  event_name: string;
  data_object_id: number;
  to_state?: string | null;
};

export type StateRow = {
  id: number;
  data_object_id: number;
  state_name: string;
  state_order?: number | null;
  is_initial?: boolean | null;
  is_terminal?: boolean | null;
  requires_permission?: boolean | null;
  domain_module_id?: number | null;
};

export type HandoffRow = {
  id: number;
  trigger_event_id: number | null;
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id?: number | null;
  target_domain_module_id?: number | null;
  data_object_id?: number | null;
};

// ---------- small helpers ----------

const defaultName: NameOf = (id) => `#${id}`;
const defaultModule: Label = (id) => (id == null ? "(no module)" : `module ${id}`);
const defaultDomain: Label = (id) => (id == null ? "(no domain)" : `domain ${id}`);
const blank = (s: unknown): boolean => s == null || String(s).trim() === "";
const norm = (s: unknown): string => String(s ?? "").trim().toLowerCase();
const byNum = (a: number, b: number): number => a - b;

const MAX_ITEMS = 12;
export function listOf(items: string[], max = MAX_ITEMS): string {
  const shown = items.slice(0, max).join("; ");
  return items.length > max ? `${shown}; ...+${items.length - max} more` : shown;
}

const pass = (id: string, detail: string): Finding => ({ id, result: "pass", detail });

function groupBy<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const g = m.get(k);
    if (g) g.push(r);
    else m.set(k, [r]);
  }
  return m;
}

// Unordered module pair key ("6|85" and "85|6" are the same pair).
export function pairKey(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// =====================================================================================
// B1. >= 1 master data_object (ported from audit_backlog.ts B1, minus its leadership list)
// =====================================================================================

export type MasterFloorInput = {
  domainKind?: string | null;
  moduleCount: number;
  masterCount: number;
  // consumer / derived / embedded_master rows on the domain's modules (the overlay substrate)
  overlayRowCount: number;
};

// Rows: none (the finding is about the domain). SKILL.md: no fixed list of zero-master domains;
// the only exception is a genuine derive/overlay domain, which is a judgment (`agent`) and still
// needs >= 1 consumer / derived / embedded_master row. domain_kind='bundle' is exempt entirely.
export function checkMasterFloor(x: MasterFloorInput): Finding[] {
  if (x.domainKind === "bundle") return [pass("B1", "exempt: domain_kind=bundle masters nothing by definition (validated by the Rule #19 starter shape instead)")];
  if (x.masterCount > 0) return [pass("B1", `${x.masterCount} master data_object(s) across ${x.moduleCount} module(s)`)];
  if (x.moduleCount === 0) {
    return [{ id: "B1", result: "fail", detail: "zero masters: the domain has no domain_modules rows (M1), so nothing is mastered at module grain" }];
  }
  if (x.overlayRowCount > 0) {
    return [
      {
        id: "B1",
        result: "agent",
        detail: `zero masters across ${x.moduleCount} module(s), with ${x.overlayRowCount} consumer / derived / embedded_master row(s): passes ONLY if this is a genuine derive/overlay domain (SKILL.md overlay test); a domain that persists records of its own is master-bearing and fails`,
      },
    ];
  }
  return [{ id: "B1", result: "fail", detail: `zero masters and zero consumer / derived / embedded_master rows across ${x.moduleCount} module(s): unbuilt (run Phase B), not an overlay` }];
}

// =====================================================================================
// B2. every master has singular_label and plural_label
// =====================================================================================

// Rows: data_object ids.
export function checkMasterLabels(masters: MasterRow[]): Finding[] {
  const bad = masters.filter((m) => blank(m.singular_label) || blank(m.plural_label));
  if (bad.length === 0) return [pass("B2", `${masters.length} masters, all with singular_label and plural_label (rows = data_object ids)`)];
  const what = (m: MasterRow) => [blank(m.singular_label) ? "singular_label" : "", blank(m.plural_label) ? "plural_label" : ""].filter(Boolean).join(" + ");
  return [
    {
      id: "B2",
      result: "fail",
      rows: bad.map((m) => m.id),
      detail: `${bad.length} of ${masters.length} masters miss a label (rows = data_object ids): ${listOf(bad.map((m) => `${m.data_object_name} (${what(m)})`))}`,
    },
  ];
}

// =====================================================================================
// B3. naming arbitration (Rule #9)
// =====================================================================================

// A bare-word name has no `_` separator. Prefixed names pass automatically.
export const isBareWord = (name: string): boolean => !String(name ?? "").includes("_");

// Rows: data_object ids.
export function checkBareWordNaming(masters: MasterRow[]): Finding[] {
  const bare = masters.filter((m) => isBareWord(m.data_object_name));
  const bad = bare.filter((m) => m.is_canonical_bare_word !== true || blank(m.naming_authority_rationale));
  if (bad.length === 0) return [pass("B3", `${bare.length} bare-word master(s) of ${masters.length}, each with a canonical claim and rationale (rows = data_object ids)`)];
  const why = (m: MasterRow) => (m.is_canonical_bare_word !== true ? "no is_canonical_bare_word claim" : "claim without naming_authority_rationale");
  return [
    {
      id: "B3",
      result: "fail",
      rows: bad.map((m) => m.id),
      detail: `${bad.length} bare-word master(s) without naming arbitration (rows = data_object ids; fix: rename to <slug>_<noun> or record the claim): ${listOf(bad.map((m) => `${m.data_object_name} (${why(m)})`))}`,
    },
  ];
}

// =====================================================================================
// B5. embedded_master integrity (Rule #11), plus the B10 "unowned dependencies" rule
// =====================================================================================

export const DEPENDENCY_HELD_AS = new Set(["embedded_master", "contributor", "consumer"]);

export type DependencyOwnerOptions = {
  hasMaster: (dataObjectId: number) => boolean; // a held_as='master' dmdo row anywhere in the catalog
  isBuiltin: (dataObjectId: number) => boolean; // data_objects.kind = 'platform_builtin'
  nameOf?: NameOf;
  moduleLabel?: Label;
};

// Rows: data_object ids. embedded_master with no canonical master is the B5 query proper; a
// contributor / consumer dependency with no master anywhere is SKILL.md B10's "Unowned
// dependencies", which it routes to B5 as an integrity failure.
export function checkDependencyOwners(rows: DmdoRow[], opts: DependencyOwnerOptions): Finding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const mod = opts.moduleLabel ?? defaultModule;
  const deps = rows.filter((r) => DEPENDENCY_HELD_AS.has(r.held_as));
  const orphan = deps.filter((r) => !opts.hasMaster(r.data_object_id) && !opts.isBuiltin(r.data_object_id));
  const out: Finding[] = [];
  const describe = (g: DmdoRow[]) => {
    const byDo = groupBy(g, (r) => r.data_object_id);
    return {
      rows: [...byDo.keys()].sort(byNum),
      items: [...byDo.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([id, rs]) => `${nameOf(id)} (${rs.map((r) => `${r.held_as}${r.is_install_optional ? "/install optional" : ""} @ ${mod(r.domain_module_id)}`).join(", ")})`),
    };
  };
  const emb = orphan.filter((r) => r.held_as === "embedded_master");
  if (emb.length) {
    const d = describe(emb);
    out.push({
      id: "B5",
      result: "fail",
      rows: d.rows,
      detail: `${d.rows.length} embedded_master(s) with no canonical master anywhere and not platform_builtin (rows = data_object ids; fix: add the owner's master row or drop the embed): ${listOf(d.items)}`,
    });
  }
  const other = orphan.filter((r) => r.held_as !== "embedded_master");
  if (other.length) {
    const d = describe(other);
    out.push({
      id: "B5",
      result: "fail",
      rows: d.rows,
      detail: `${d.rows.length} unowned contributor / consumer dependenc(ies): no master anywhere and not platform_builtin (SKILL.md B10 routes these to B5; rows = data_object ids): ${listOf(d.items)}`,
    });
  }
  if (out.length === 0) {
    const n = new Set(deps.map((r) => r.data_object_id)).size;
    return [pass("B5", `${n} embedded_master / contributor / consumer dependenc(ies), each with a canonical master or platform_builtin (rows = data_object ids)`)];
  }
  return out;
}

// =====================================================================================
// B6. intra-domain relationships populated (mechanical half)
// =====================================================================================

// Rows: data_object ids. Self-relationships (a master related to itself) do not relate it to another
// master. Whether an isolated master belongs to the primary workflow is the judgment half, so a
// single isolated master is `warn`; a domain with >= 2 masters and NO intra-domain relationship at all is `fail`.
export function checkIntraDomainRelationships(masterIds: number[], rels: RelRow[], opts: { nameOf?: NameOf } = {}): Finding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const set = new Set(masterIds);
  if (set.size < 2) return [pass("B6", `${set.size} master(s): no in-domain pair to relate`)];
  const intra = rels.filter((r) => set.has(r.data_object_id) && set.has(r.related_data_object_id) && r.data_object_id !== r.related_data_object_id);
  const related = new Set<number>();
  for (const r of intra) {
    related.add(r.data_object_id);
    related.add(r.related_data_object_id);
  }
  const isolated = [...set].filter((id) => !related.has(id)).sort(byNum);
  if (intra.length === 0) {
    return [{ id: "B6", result: "fail", rows: isolated, detail: `no intra-domain data_object_relationships among ${set.size} masters (rows = data_object ids)` }];
  }
  if (isolated.length === 0) return [pass("B6", `${intra.length} intra-domain relationships relate all ${set.size} masters (rows = data_object ids)`)];
  return [
    {
      id: "B6",
      result: "warn",
      rows: isolated,
      detail: `${isolated.length} of ${set.size} masters have no relationship to another in-domain master (rows = data_object ids; allowed only with a notes justification): ${listOf(isolated.map(nameOf))}`,
    },
  ];
}

// =====================================================================================
// B7. relationships to users populated (mechanical half)
// =====================================================================================

// entity_types that carry a user-typed person in practice. catalog / junction / computed masters
// are not listed (a relationship to users there is the exception, not the rule).
export const USER_PERSON_ENTITY_TYPES = new Set(["operational_workflow", "operational_record", "unclassified", ""]);

// Rows: data_object ids. Either direction counts (master -> users and users -> master).
export function checkUserRelationshipPresence(masters: MasterRow[], rels: RelRow[], usersId: number, opts: { nameOf?: NameOf } = {}): Finding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const ids = new Set(masters.map((m) => m.id));
  const withRelationship = new Set<number>();
  for (const r of rels) {
    if (r.data_object_id === usersId && ids.has(r.related_data_object_id)) withRelationship.add(r.related_data_object_id);
    else if (r.related_data_object_id === usersId && ids.has(r.data_object_id)) withRelationship.add(r.data_object_id);
  }
  if (masters.length === 0) return [pass("B7", "no masters (see B1)")];
  const workflow = masters.filter((m) => norm(m.entity_type) === "operational_workflow");
  if (withRelationship.size === 0 && workflow.length > 0) {
    return [
      {
        id: "B7",
        result: "fail",
        rows: workflow.map((m) => m.id).sort(byNum),
        detail: `no relationship to users on any of ${masters.length} masters, ${workflow.length} of them operational_workflow (a workflow always has a user-typed person, Rule #10; rows = data_object ids)`,
      },
    ];
  }
  const missing = masters.filter((m) => !withRelationship.has(m.id) && USER_PERSON_ENTITY_TYPES.has(norm(m.entity_type))).sort((a, b) => a.id - b.id);
  if (missing.length === 0) return [pass("B7", `${withRelationship.size} of ${masters.length} masters carry a relationship to users; no operational master lacks one (rows = data_object ids)`)];
  return [
    {
      id: "B7",
      result: "warn",
      rows: missing.map((m) => m.id),
      detail: `${missing.length} operational master(s) with no relationship to users (rows = data_object ids; catalog / junction / computed masters not listed): ${listOf(missing.map((m) => nameOf(m.id)))}`,
    },
  ];
}

// =====================================================================================
// B7c. each Responsible and Accountable persona of a row-scoped master has a relationship to users
// =====================================================================================

export type PersonaRelRow = RelRow & { persona_id?: number | null };
export type RaciPersonaRow = { process_id: number; raci: string; persona_id?: number | null };

export type PersonaRelationshipInput = {
  masters: MasterRow[]; // the domain's masters; only has_personal_content ones are in scope
  rels: PersonaRelRow[]; // relationships to users touching a master, either direction
  states: { data_object_id: number; process_id?: number | null }[]; // lifecycle rows of the masters
  raci: RaciPersonaRow[]; // any process_raci rows; filtered to each entity's processes inside
  usersId: number;
  nameOf?: NameOf;
  personaLabel?: (personaId: number) => string;
};

// Rows: data_object ids. A row-scope rule filters on the person a relationship to users holds, so a
// persona who works the entity needs a relationship of its own or it sees nothing. Severity stops at
// warn, because a view_all grant can satisfy the same need and only an agent can read that prose
// (the judgment half in checks_b.ts). An entity with no R or A persona, or with no persona_id on any
// of its relationships to users, was not checked at all: it is reported as such and never passes.
export function checkPersonaRelationships(x: PersonaRelationshipInput): Finding[] {
  const nameOf = x.nameOf ?? defaultName;
  const personaOf = x.personaLabel ?? ((id: number) => `persona ${id}`);
  const scoped = x.masters.filter((m) => m.has_personal_content === true).sort((a, b) => a.id - b.id);
  if (scoped.length === 0) return [pass("B7c", "no row-scoped masters (has_personal_content)")];

  const processesByEntity = new Map<number, Set<number>>();
  for (const s of x.states) {
    if (s.process_id == null) continue;
    const set = processesByEntity.get(s.data_object_id) ?? new Set<number>();
    set.add(s.process_id);
    processesByEntity.set(s.data_object_id, set);
  }
  const raPersonasByProcess = new Map<number, Set<number>>();
  for (const r of x.raci) {
    const letter = raciLetter(r.raci);
    if (r.persona_id == null || (letter !== "R" && letter !== "A")) continue; // a skill row has no persona_id
    const set = raPersonasByProcess.get(r.process_id) ?? new Set<number>();
    set.add(r.persona_id);
    raPersonasByProcess.set(r.process_id, set);
  }
  const relationshipPersonasByEntity = new Map<number, Set<number>>();
  for (const r of x.rels) {
    if (r.persona_id == null) continue;
    const entity = r.data_object_id === x.usersId ? r.related_data_object_id : r.data_object_id;
    const set = relationshipPersonasByEntity.get(entity) ?? new Set<number>();
    set.add(r.persona_id);
    relationshipPersonasByEntity.set(entity, set);
  }

  const missing: string[] = [];
  const missingRows: number[] = [];
  const notChecked: string[] = [];
  const notCheckedRows: number[] = [];
  let checkedPersonas = 0;
  for (const m of scoped) {
    const needed = new Set([...(processesByEntity.get(m.id) ?? [])].flatMap((pid) => [...(raPersonasByProcess.get(pid) ?? [])]));
    const filled = relationshipPersonasByEntity.get(m.id);
    if (needed.size === 0) {
      notChecked.push(`${nameOf(m.id)} (no Responsible or Accountable persona on its processes)`);
      notCheckedRows.push(m.id);
      continue;
    }
    if (!filled) {
      notChecked.push(`${nameOf(m.id)} (no persona_id on any relationship to users)`);
      notCheckedRows.push(m.id);
      continue;
    }
    checkedPersonas += needed.size;
    const gaps = [...needed].filter((p) => !filled.has(p)).sort(byNum);
    if (gaps.length > 0) {
      missing.push(...gaps.map((p) => `${nameOf(m.id)}: ${personaOf(p)}`));
      missingRows.push(m.id);
    }
  }

  const out: Finding[] = [];
  if (missing.length > 0) {
    out.push({
      id: "B7c",
      result: "warn",
      rows: missingRows,
      detail: `${missing.length} of ${checkedPersonas} Responsible or Accountable persona(s) have no relationship to users on the row-scoped master they work (rows = data_object ids; a view_all grant can satisfy it, see the judgment): ${listOf(missing)}`,
    });
  }
  if (notChecked.length > 0) {
    out.push({
      id: "B7c",
      result: "warn",
      rows: notCheckedRows,
      detail: `not checked: ${notChecked.length} of ${scoped.length} row-scoped master(s) (rows = data_object ids): ${listOf(notChecked)}`,
    });
  }
  return out.length > 0 ? out : [pass("B7c", `${scoped.length} row-scoped masters checked, ${checkedPersonas} Responsible or Accountable persona(s), each with a relationship to users`)];
}

// =====================================================================================
// B8. cross-domain relationships, outbound only (+ report-only inbound owed by the source)
// =====================================================================================

export type CrossRelationshipInput = {
  domainId: number;
  masterIds: Set<number>;
  handoffs: HandoffRow[]; // any handoffs; filtered to this domain's boundary inside
  eventEntity: (eventId: number) => number | undefined; // trigger_events.data_object_id
  rels: RelRow[];
  masterDomains: (dataObjectId: number) => Set<number> | undefined;
  isBuiltin: (dataObjectId: number) => boolean;
  domainCode?: Label;
  nameOf?: NameOf;
};

// Rows: handoff ids. A "clean payload -> target mapping" (SKILL.md B8): the event's entity is one
// of this domain's masters, the payload is a different entity, mastered by the TARGET domain,
// not one of this domain's masters, not platform_builtin. It needs the relationship
// `<event entity> -> <payload>`. Missing outbound relationships fail (this domain owes them); the mirror
// image on inbound handoffs is owed by the source domain's B8, so it is report-only (`warn`).
export function checkCrossDomainRelationships(x: CrossRelationshipInput): Finding[] {
  const nameOf = x.nameOf ?? defaultName;
  const code = x.domainCode ?? defaultDomain;
  const relationshipKeys = new Set(x.rels.map((r) => `${r.data_object_id}|${r.related_data_object_id}`));
  type Gap = { from: number; to: number; other: number; handoffs: number[] };
  const scan = (outbound: boolean) => {
    const gaps = new Map<string, Gap>();
    let considered = 0;
    let clean = 0;
    for (const h of x.handoffs) {
      if (h.source_domain_id === h.target_domain_id) continue;
      if (outbound ? h.source_domain_id !== x.domainId : h.target_domain_id !== x.domainId) continue;
      considered++;
      const ev = h.trigger_event_id == null ? undefined : x.eventEntity(h.trigger_event_id);
      const payload = h.data_object_id ?? undefined;
      if (ev == null || payload == null || ev === payload || x.isBuiltin(payload)) continue;
      const other = outbound ? h.target_domain_id : h.source_domain_id;
      const mine = outbound ? ev : payload; // the side this domain masters
      const theirs = outbound ? payload : ev; // the side the other domain masters
      if (!x.masterIds.has(mine) || x.masterIds.has(theirs)) continue;
      if (!x.masterDomains(theirs)?.has(other)) continue;
      clean++;
      if (relationshipKeys.has(`${ev}|${payload}`)) continue;
      const k = `${ev}|${payload}|${other}`;
      const g = gaps.get(k) ?? { from: ev, to: payload, other, handoffs: [] };
      g.handoffs.push(h.id);
      gaps.set(k, g);
    }
    return { gaps: [...gaps.values()], considered, clean };
  };
  const out: Finding[] = [];
  const o = scan(true);
  if (o.gaps.length) {
    out.push({
      id: "B8",
      result: "fail",
      rows: o.gaps.flatMap((g) => g.handoffs).sort(byNum),
      detail: `${o.gaps.length} of ${o.clean} clean outbound payload -> target mappings have no data_object_relationships row in this direction (rows = handoff ids): ${listOf(o.gaps.map((g) => `${nameOf(g.from)} -> ${nameOf(g.to)} (to ${code(g.other)}; handoff ${g.handoffs.join(", ")})`))}`,
    });
  }
  const i = scan(false);
  for (const [src, gs] of [...groupBy(i.gaps, (g) => g.other).entries()].sort((a, b) => (code(a[0]) < code(b[0]) ? -1 : 1))) {
    out.push({
      id: "B8",
      result: "warn",
      rows: gs.flatMap((g) => g.handoffs).sort(byNum),
      detail: `report-only, owed by ${code(src)} B8 (inbound; rows = handoff ids): ${listOf(gs.map((g) => `${nameOf(g.from)} -> ${nameOf(g.to)} (handoff ${g.handoffs.join(", ")})`))}`,
    });
  }
  if (out.length === 0) out.push(pass("B8", `${o.considered} outbound cross-domain handoffs, ${o.clean} clean payload -> target mappings, all with a relationship (rows = handoff ids)`));
  return out;
}

// =====================================================================================
// B9. outbound trigger_events + handoffs complete (+ validate_cross_domain q3 / q5)
// =====================================================================================

// SKILL.md B9: a state named like a published verb needs an `<entity>.<state>` event even when
// it is not gated.
export const PUBLISHED_VERB_STATES = new Set(["approved", "signed", "accepted", "canceled", "closed", "hired", "terminated"]);

// validate_cross_domain.ts q3: held_as values that may publish an event about an entity (consumer-only
// is excluded: a domain does not publish events about something it only reads).
export const PUBLISH_HELD_AS = new Set(["master", "embedded_master", "contributor", "derived"]);

export function isPublishableBy(dmdoRows: DmdoRow[], dataObjectId: number): boolean {
  return dmdoRows.some((r) => r.data_object_id === dataObjectId && PUBLISH_HELD_AS.has(r.held_as));
}

// An event "covers" a state when it fires on the same entity and its to_state, or the segment
// after the last "." of its name (`job_offer.accepted`), equals the state name.
export function eventMatchesState(e: EventRow, s: StateRow): boolean {
  if (e.data_object_id !== s.data_object_id) return false;
  const st = norm(s.state_name);
  if (st === "") return false;
  if (norm(e.to_state) === st) return true;
  const name = norm(e.event_name);
  const dot = name.lastIndexOf(".");
  return dot >= 0 && name.slice(dot + 1) === st;
}

export type OutboundEventsInput = {
  domainId: number;
  masterIds: number[];
  events: EventRow[]; // trigger_events (filtered to masters inside)
  states: StateRow[]; // lifecycle states (filtered to masters inside)
  handoffs: HandoffRow[]; // every handoff in the catalog (any reference to an event counts)
  domainDmdo: DmdoRow[]; // dmdo rows on this domain's modules (for q3 publishability)
  // false when the domain has no modules: q3 is then skipped (nothing is held at module grain,
  // so every outbound handoff would flag; M1 / B1 already fail that domain)
  hasModules: boolean;
  eventEntity: (eventId: number) => number | undefined;
  isBuiltin: (dataObjectId: number) => boolean;
  nameOf?: NameOf;
  domainCode?: Label;
};

// Rows (prefixed): do:<data_object id>, event:<trigger_event id>, state:<lifecycle id>,
// handoff:<handoff id>. All four sub-rules are hard (SKILL.md B9 is not soft).
export function checkOutboundEvents(x: OutboundEventsInput): Finding[] {
  const nameOf = x.nameOf ?? defaultName;
  const code = x.domainCode ?? defaultDomain;
  const masters = new Set(x.masterIds);
  const events = x.events.filter((e) => masters.has(e.data_object_id));
  const states = x.states.filter((s) => masters.has(s.data_object_id));
  const eventsByDo = groupBy(events, (e) => e.data_object_id);
  const statesByDo = groupBy(states, (s) => s.data_object_id);
  const referenced = new Set<number>();
  for (const h of x.handoffs) if (h.trigger_event_id != null) referenced.add(h.trigger_event_id);
  const out: Finding[] = [];

  // (1) a master with a state machine has >= 1 trigger_event
  const silent = [...statesByDo.keys()].filter((d) => !eventsByDo.has(d)).sort(byNum);
  if (silent.length) {
    out.push({
      id: "B9",
      result: "fail",
      rows: silent.map((d) => `do:${d}`),
      detail: `${silent.length} master(s) with lifecycle states but no trigger_events: ${listOf(silent.map(nameOf))}`,
    });
  }

  // (2) every event on a master has >= 1 handoff anywhere (cross-domain B9 or intra-domain B9b).
  // The orphan half (entity has no lifecycle either) is validate_cross_domain.ts q5.
  const unhanded = events.filter((e) => !referenced.has(e.id)).sort((a, b) => a.id - b.id);
  const orphan = unhanded.filter((e) => !statesByDo.has(e.data_object_id));
  const leafy = unhanded.filter((e) => statesByDo.has(e.data_object_id));
  if (orphan.length) {
    out.push({
      id: "B9",
      result: "fail",
      rows: orphan.map((e) => `event:${e.id}`),
      detail: `${orphan.length} orphaned event(s): no handoff anywhere AND no lifecycle state on the entity (validate_cross_domain q5): ${listOf(orphan.map((e) => `${e.event_name} (${e.id})`))}`,
    });
  }
  if (leafy.length) {
    out.push({
      id: "B9",
      result: "fail",
      rows: leafy.map((e) => `event:${e.id}`),
      detail: `${leafy.length} event(s) with no handoff anywhere (add a cross- or intra-domain handoff, or justify it as a leaf in the gap report): ${listOf(leafy.map((e) => `${e.event_name} (${e.id})`))}`,
    });
  }

  // (3) every gated or published-verb state has an <entity>.<state> event
  const needEvent = states.filter((s) => s.requires_permission === true || PUBLISHED_VERB_STATES.has(norm(s.state_name)));
  const noEvent = needEvent.filter((s) => !(eventsByDo.get(s.data_object_id) ?? []).some((e) => eventMatchesState(e, s))).sort((a, b) => a.id - b.id);
  if (noEvent.length) {
    out.push({
      id: "B9",
      result: "fail",
      rows: noEvent.map((s) => `state:${s.id}`),
      detail: `${noEvent.length} gated / published-verb state(s) with no <entity>.<state> event (matched on to_state or the name suffix): ${listOf(noEvent.map((s) => `${nameOf(s.data_object_id)}.${s.state_name}${s.requires_permission ? " (gated)" : ""}`))}`,
    });
  }

  // (4) validate_cross_domain q3: an outbound cross-domain handoff whose event entity this domain
  // cannot publish (no master / embedded_master / contributor / derived row, not a built-in)
  const outbound = x.handoffs.filter((h) => h.source_domain_id === x.domainId && h.target_domain_id !== x.domainId);
  const unpublishable = (x.hasModules ? outbound : [])
    .filter((h) => {
      const ev = h.trigger_event_id == null ? undefined : x.eventEntity(h.trigger_event_id);
      return ev != null && !x.isBuiltin(ev) && !isPublishableBy(x.domainDmdo, ev);
    })
    .sort((a, b) => a.id - b.id);
  if (unpublishable.length) {
    out.push({
      id: "B9",
      result: "fail",
      rows: unpublishable.map((h) => `handoff:${h.id}`),
      detail: `${unpublishable.length} outbound handoff(s) fire an event on an entity this domain holds with no publishing held_as value (validate_cross_domain q3): ${listOf(unpublishable.map((h) => `handoff ${h.id} ${nameOf(x.eventEntity(h.trigger_event_id as number) as number)} -> ${code(h.target_domain_id)}`))}`,
    });
  }

  if (out.length === 0) {
    const q3 = x.hasModules ? `${outbound.length} outbound cross-domain handoffs publishable` : `publishability (q3) not checked: no modules (M1)`;
    out.push(pass("B9", `${events.length} events on ${eventsByDo.size} masters, each handed off; ${needEvent.length} gated / published-verb states, each with an event; ${q3}`));
  }
  return out;
}

// =====================================================================================
// B9b. intra-domain cross-module handoffs complete
// =====================================================================================

export type IntraHandoffInput = {
  domainId: number;
  moduleIds: number[];
  masterIds: Set<number>;
  masterModules: (dataObjectId: number) => number[] | undefined; // the domain's modules mastering it
  rels: RelRow[];
  events: EventRow[]; // trigger_events (filtered to masters inside)
  states: StateRow[]; // lifecycle states (filtered to masters inside)
  handoffs: HandoffRow[]; // every handoff in the catalog
  moduleLabel?: Label;
  nameOf?: NameOf;
};

// Rows (prefixed): rel:<relationship id> (source 1), event:<trigger_event id> (source 2),
// state:<lifecycle id> (source 3). Pairs are matched unordered: relationship direction does not
// reliably name the handoff direction. Skipped (pass) on a domain with < 2 modules.
export function checkIntraDomainHandoffs(x: IntraHandoffInput): Finding[] {
  const mod = x.moduleLabel ?? defaultModule;
  const nameOf = x.nameOf ?? defaultName;
  if (x.moduleIds.length < 2) return [pass("B9b", `not applicable: ${x.moduleIds.length} module(s), no cross-module surface`)];
  const moduleSet = new Set(x.moduleIds);
  const intra = x.handoffs.filter((h) => h.source_domain_id === x.domainId && h.target_domain_id === x.domainId);
  const loaded = new Set<string>();
  for (const h of intra) {
    const a = h.source_domain_module_id;
    const b = h.target_domain_module_id;
    if (a != null && b != null && a !== b) loaded.add(pairKey(a, b));
  }
  const covered = (as: number[], bs: number[]) => as.some((a) => bs.some((b) => a !== b && loaded.has(pairKey(a, b))));
  const pairLabel = (k: string) => k.split("|").map((n) => mod(Number(n))).join(" <-> ");
  const out: Finding[] = [];

  // Source 1: relationships between masters realized on different modules.
  const relGaps = new Map<string, RowId[]>();
  let relExpected = 0;
  for (const r of x.rels) {
    if (!x.masterIds.has(r.data_object_id) || !x.masterIds.has(r.related_data_object_id) || r.data_object_id === r.related_data_object_id) continue;
    const a = x.masterModules(r.data_object_id) ?? [];
    const b = x.masterModules(r.related_data_object_id) ?? [];
    if (a.length === 0 || b.length === 0 || a.some((m) => b.includes(m))) continue;
    relExpected++;
    if (covered(a, b)) continue;
    const k = pairKey(Math.min(...a), Math.min(...b));
    const g = relGaps.get(k) ?? [];
    g.push(r.id ?? `${r.data_object_id}->${r.related_data_object_id}`);
    relGaps.set(k, g);
  }
  for (const [k, ids] of [...relGaps.entries()].sort()) {
    out.push({
      id: "B9b",
      result: "fail",
      rows: ids.map((id) => `rel:${id}`),
      detail: `module pair ${pairLabel(k)}: ${ids.length} cross-module master relationship(s), no intra-domain handoff (source 1)`,
    });
  }

  // Source 2: events on masters with no handoff anywhere (re-examined per realizing module).
  const referenced = new Set<number>();
  for (const h of x.handoffs) if (h.trigger_event_id != null) referenced.add(h.trigger_event_id);
  const unhanded = x.events.filter((e) => x.masterIds.has(e.data_object_id) && !referenced.has(e.id));
  const homeModule = (doId: number) => {
    const mm = x.masterModules(doId) ?? [];
    return mm.length ? Math.min(...mm) : -1;
  };
  for (const [m, es] of [...groupBy(unhanded, (e) => homeModule(e.data_object_id)).entries()].sort((a, b) => a[0] - b[0])) {
    out.push({
      id: "B9b",
      result: "fail",
      rows: es.sort((a, b) => a.id - b.id).map((e) => `event:${e.id}`),
      detail: `${mod(m === -1 ? null : m)}: ${es.length} event(s) with no handoff anywhere (needs an intra- or cross-domain subscriber, or a leaf justification; source 2): ${listOf(es.map((e) => e.event_name))}`,
    });
  }

  // Source 3: gated states realized on a module other than the one mastering the entity.
  const stateGaps = new Map<string, StateRow[]>();
  let stateExpected = 0;
  for (const s of x.states) {
    if (s.requires_permission !== true || s.domain_module_id == null || !moduleSet.has(s.domain_module_id)) continue;
    if (!x.masterIds.has(s.data_object_id)) continue;
    const owners = x.masterModules(s.data_object_id) ?? [];
    if (owners.length === 0 || owners.includes(s.domain_module_id)) continue;
    stateExpected++;
    if (covered(owners, [s.domain_module_id])) continue;
    const k = pairKey(Math.min(...owners), s.domain_module_id);
    const g = stateGaps.get(k) ?? [];
    g.push(s);
    stateGaps.set(k, g);
  }
  for (const [k, ss] of [...stateGaps.entries()].sort()) {
    out.push({
      id: "B9b",
      result: "fail",
      rows: ss.map((s) => `state:${s.id}`),
      detail: `module pair ${pairLabel(k)}: ${ss.length} gated state(s) realized on another module, no intra-domain handoff (source 3): ${listOf(ss.map((s) => `${nameOf(s.data_object_id)}.${s.state_name}`))}`,
    });
  }

  if (out.length === 0) {
    out.push(pass("B9b", `${intra.length} intra-domain handoffs over ${loaded.size} module pair(s) cover every expected pair (${relExpected} cross-module relationships, ${stateExpected} cross-module gated states)`));
  }
  return out;
}

// =====================================================================================
// B10. inbound handoffs (REPORT-ONLY: result is at most `warn`)
// =====================================================================================

export type InboundCoverageInput = {
  domainId: number;
  deps: DmdoRow[]; // dmdo rows on this domain's modules (non-dependency held_as values are ignored)
  masterIds: Set<number>;
  masterDomains: (dataObjectId: number) => Set<number> | undefined;
  isBuiltin: (dataObjectId: number) => boolean; // built-ins have no owner and owe no handoff
  handoffs: HandoffRow[];
  domainCode?: Label;
  nameOf?: NameOf;
};

const HELD_AS_STRENGTH = ["master", "embedded_master", "contributor", "consumer", "derived"];

// Rows: data_object ids (the dependency owed). Discovery reads domain_module_data_objects only
// (the deprecated domain_data_objects rollup is never read). An entity this domain masters on any
// of its modules is not an inbound dependency. Unowned dependencies are counted here and fail B5.
export function checkInboundCoverage(x: InboundCoverageInput): Finding[] {
  const nameOf = x.nameOf ?? defaultName;
  const code = x.domainCode ?? defaultDomain;
  const inbound = x.handoffs.filter((h) => h.target_domain_id === x.domainId && h.source_domain_id !== x.domainId);
  const fromDomains = new Set(inbound.map((h) => h.source_domain_id));
  const deps = groupBy(
    x.deps.filter((r) => DEPENDENCY_HELD_AS.has(r.held_as) && !x.masterIds.has(r.data_object_id) && !x.isBuiltin(r.data_object_id)),
    (r) => r.data_object_id,
  );
  type Owed = { owner: number; doId: number; held_as: string; install: string };
  const owed: Owed[] = [];
  let unowned = 0;
  for (const [doId, rs] of [...deps.entries()].sort((a, b) => a[0] - b[0])) {
    const owners = [...(x.masterDomains(doId) ?? [])].filter((d) => d !== x.domainId).sort(byNum);
    if (owners.length === 0) {
      unowned++;
      continue;
    }
    const strongest = [...rs].sort((a, b) => HELD_AS_STRENGTH.indexOf(a.held_as) - HELD_AS_STRENGTH.indexOf(b.held_as))[0];
    const install = rs.some((r) => !r.is_install_optional) ? "always installed" : "install optional";
    for (const owner of owners) {
      const hit = inbound.some((h) => h.source_domain_id === owner && h.data_object_id === doId);
      if (!hit) owed.push({ owner, doId, held_as: strongest.held_as, install });
    }
  }
  const out: Finding[] = [
    pass(
      "B10",
      `covered inbound: ${inbound.length} handoff(s) from ${fromDomains.size} domain(s); ${deps.size} dependenc(ies) checked, ${owed.length} owed by other domains, ${unowned} unowned (see B5)`,
    ),
  ];
  for (const [owner, os] of [...groupBy(owed, (o) => o.owner).entries()].sort((a, b) => (code(a[0]) < code(b[0]) ? -1 : 1))) {
    out.push({
      id: "B10",
      result: "warn",
      rows: os.map((o) => o.doId),
      detail: `report-only: ${code(owner)} B9 owes outbound on ${os.length} dependenc(ies) (rows = data_object ids): ${listOf(os.map((o) => `${nameOf(o.doId)} (${o.held_as} + ${o.install})`))}`,
    });
  }
  return out;
}

// =====================================================================================
// B10b. per-module attribution on handoffs (validate_cross_domain q1 / q2)
// =====================================================================================

export type ModuleAttributionInput = {
  domainId: number;
  hasModules: boolean;
  handoffs: HandoffRow[];
  domainCode?: Label;
  eventName?: (eventId: number | null) => string;
};

// Rows: handoff ids. Outbound rows must carry source_domain_module_id (q1), inbound rows
// target_domain_module_id (q2); an intra-domain row counts for both. A NULL on the opposite side
// is the other domain's B10b: counted in the detail, never a finding here.
export function checkHandoffModuleAttribution(x: ModuleAttributionInput): Finding[] {
  const code = x.domainCode ?? defaultDomain;
  const ev = x.eventName ?? ((id) => (id == null ? "(no event)" : `event ${id}`));
  if (!x.hasModules) return [pass("B10b", "not applicable: the domain has no modules (M1); a NULL module FK is legitimate until it is modularized")];
  const outbound = x.handoffs.filter((h) => h.source_domain_id === x.domainId);
  const inbound = x.handoffs.filter((h) => h.target_domain_id === x.domainId);
  const outNull = outbound.filter((h) => h.source_domain_module_id == null).sort((a, b) => a.id - b.id);
  const inNull = inbound.filter((h) => h.target_domain_module_id == null).sort((a, b) => a.id - b.id);
  const oppositeOut = outbound.filter((h) => h.target_domain_id !== x.domainId && h.target_domain_module_id == null).length;
  const oppositeIn = inbound.filter((h) => h.source_domain_id !== x.domainId && h.source_domain_module_id == null).length;
  const out: Finding[] = [];
  if (outNull.length) {
    out.push({
      id: "B10b",
      result: "fail",
      rows: outNull.map((h) => h.id),
      detail: `${outNull.length} of ${outbound.length} outbound handoffs have NULL source_domain_module_id (rows = handoff ids): ${listOf(outNull.map((h) => `${h.id} ${ev(h.trigger_event_id)} -> ${code(h.target_domain_id)}`))}`,
    });
  }
  if (inNull.length) {
    out.push({
      id: "B10b",
      result: "fail",
      rows: inNull.map((h) => h.id),
      detail: `${inNull.length} of ${inbound.length} inbound handoffs have NULL target_domain_module_id (rows = handoff ids): ${listOf(inNull.map((h) => `${h.id} ${ev(h.trigger_event_id)} from ${code(h.source_domain_id)}`))}`,
    });
  }
  const opposite = `opposite side (other domains' B10b, not blocking here): ${oppositeOut} outbound without target_domain_module_id, ${oppositeIn} inbound without source_domain_module_id`;
  if (out.length === 0) return [pass("B10b", `${outbound.length} outbound and ${inbound.length} inbound handoffs carry this domain's module FK; ${opposite}`)];
  out.push(pass("B10b", opposite));
  return out;
}

// =====================================================================================
// B11. aliases on non-self-explanatory masters (mechanical half)
// =====================================================================================

// Rows: data_object ids. A master with no alias is `warn`: self-explanatory masters are exempt,
// and which ones are is the judgment half.
export function checkAliasPresence(masters: MasterRow[], aliases: { data_object_id: number }[], opts: { nameOf?: NameOf } = {}): Finding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const has = new Set(aliases.map((a) => a.data_object_id));
  const missing = masters.filter((m) => !has.has(m.id)).sort((a, b) => a.id - b.id);
  if (missing.length === 0) return [pass("B11", `all ${masters.length} masters carry >= 1 alias (rows = data_object ids)`)];
  return [
    {
      id: "B11",
      result: "warn",
      rows: missing.map((m) => m.id),
      detail: `${missing.length} of ${masters.length} masters have no data_object_aliases row (rows = data_object ids; exempt only if self-explanatory): ${listOf(missing.map((m) => nameOf(m.id)))}`,
    },
  ];
}

// =====================================================================================
// B12. lifecycle states on operational_workflow masters, plus state-machine shape (M4)
// =====================================================================================

// Rows: data_object ids.
export function checkLifecycleCoverage(masters: MasterRow[], states: StateRow[], opts: { nameOf?: NameOf } = {}): Finding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const ids = new Set(masters.map((m) => m.id));
  const byDo = groupBy(states.filter((s) => ids.has(s.data_object_id)), (s) => s.data_object_id);
  const out: Finding[] = [];
  const bare = masters.filter((m) => norm(m.entity_type) === "operational_workflow" && !byDo.has(m.id)).sort((a, b) => a.id - b.id);
  if (bare.length) {
    out.push({
      id: "B12",
      result: "fail",
      rows: bare.map((m) => m.id),
      detail: `${bare.length} operational_workflow master(s) with no lifecycle states (rows = data_object ids; author states or fix entity_type): ${listOf(bare.map((m) => m.data_object_name))}`,
    });
  }
  const shape: { id: number; why: string }[] = [];
  for (const [doId, ss] of [...byDo.entries()].sort((a, b) => a[0] - b[0])) {
    const why: string[] = [];
    const initial = ss.filter((s) => s.is_initial === true).length;
    if (initial !== 1) why.push(`${initial} initial states`);
    if (!ss.some((s) => s.is_terminal === true)) why.push("no terminal state");
    const orders = ss.map((s) => s.state_order);
    if (orders.some((o) => o == null)) why.push("state_order missing");
    const seen = new Set<number>();
    const dupes = new Set<number>();
    for (const o of orders) if (o != null) (seen.has(o) ? dupes : seen).add(o);
    if (dupes.size) why.push(`duplicate state_order ${[...dupes].sort(byNum).join(",")}`);
    if (why.length) shape.push({ id: doId, why: why.join(", ") });
  }
  if (shape.length) {
    out.push({
      id: "B12",
      result: "fail",
      rows: shape.map((s) => s.id),
      detail: `${shape.length} state machine(s) break the M4 shape (one initial, >= 1 terminal, unique state_order; rows = data_object ids): ${listOf(shape.map((s) => `${nameOf(s.id)} (${s.why})`))}`,
    });
  }
  if (out.length === 0) {
    const wf = masters.filter((m) => norm(m.entity_type) === "operational_workflow").length;
    out.push(pass("B12", `${wf} operational_workflow master(s) with states; ${byDo.size} state machine(s) with a valid M4 shape (rows = data_object ids)`));
  }
  return out;
}

// =====================================================================================
// B13. entity_type classified (ported from phase_p_triage.ts)
// =====================================================================================

// The single B13 predicate: logic_cefh.ts re-exports it for E6, phase_p_triage.ts imports it.
export const isUnclassified = (entityType: string | null | undefined): boolean => {
  const t = norm(entityType);
  return t === "" || t === "unclassified";
};

// Rows: data_object ids. The fix is a grounded classification in the domain review
// (b13_resolver.ts proposes), never a context-free bulk apply.
export function checkEntityTypeClassified(masters: MasterRow[]): Finding[] {
  const bad = masters.filter((m) => isUnclassified(m.entity_type)).sort((a, b) => a.id - b.id);
  if (bad.length === 0) return [pass("B13", `all ${masters.length} masters carry a typed entity_type (rows = data_object ids)`)];
  return [
    {
      id: "B13",
      result: "fail",
      rows: bad.map((m) => m.id),
      detail: `${bad.length} unclassified master(s) (rows = data_object ids; classify in context, b13_resolver.ts proposes): ${listOf(bad.map((m) => m.data_object_name))}`,
    },
  ];
}

// =====================================================================================
// B14. sector- / vendor-conditional masters are optional (statute-token half)
// =====================================================================================

// SKILL.md B14 statute-prefix scan, matched as substrings (its `ilike *<token>*` form).
export const CONDITIONAL_NAME_TOKENS = [
  "fcra_", "ofccp_", "hipaa_", "osha_", "sox_", "ferpa_", "finra_", "gdpr_", "ccpa_", "eeo_",
  "adverse_action", "data_subject", "self_id", "applicant_flow",
];

export function conditionalToken(name: string): string | null {
  const n = norm(name);
  return CONDITIONAL_NAME_TOKENS.find((t) => n.includes(t)) ?? null;
}

// Rows: data_object ids. `warn`: the row may be genuinely universal for this market, or carry a
// user-recorded kept-required decision, neither of which the catalog stores.
export function checkConditionalMasters(rows: DmdoRow[], opts: { nameOf: NameOf; moduleLabel?: Label }): Finding[] {
  const mod = opts.moduleLabel ?? defaultModule;
  const req = rows.filter((r) => r.held_as === "master" && !r.is_install_optional);
  const hits = req.filter((r) => conditionalToken(opts.nameOf(r.data_object_id)) != null);
  if (hits.length === 0) return [pass("B14", `${req.length} master + always installed row(s), none matching a statute token (rows = data_object ids)`)];
  const ids = [...new Set(hits.map((r) => r.data_object_id))].sort(byNum);
  return [
    {
      id: "B14",
      result: "warn",
      rows: ids,
      detail: `${hits.length} master + always installed row(s) named for a statute (rows = data_object ids; set is_install_optional=true unless universal here or kept-required by the user): ${listOf(hits.map((r) => `${opts.nameOf(r.data_object_id)} [${conditionalToken(opts.nameOf(r.data_object_id))}] @ ${mod(r.domain_module_id)}`))}`,
    },
  ];
}

// =====================================================================================
// B15. no has_personal_content on catalog / junction / computed masters
// =====================================================================================

export const NON_OPERATIONAL_ENTITY_TYPES = new Set(["catalog", "junction", "computed"]);

// Rows: data_object ids. The fix clears the flag (destructive: sign-off), never reclassifies.
export function checkPersonalContentClass(masters: MasterRow[]): Finding[] {
  const bad = masters.filter((m) => NON_OPERATIONAL_ENTITY_TYPES.has(norm(m.entity_type)) && m.has_personal_content === true).sort((a, b) => a.id - b.id);
  if (bad.length === 0) return [pass("B15", `no catalog / junction / computed master of ${masters.length} carries has_personal_content (rows = data_object ids)`)];
  return [
    {
      id: "B15",
      result: "fail",
      rows: bad.map((m) => m.id),
      detail: `${bad.length} master(s) with has_personal_content on a non-operational entity_type (rows = data_object ids; clear the flag on sign-off, keep entity_type): ${listOf(bad.map((m) => `${m.data_object_name} (${m.entity_type})`))}`,
    },
  ];
}

// =====================================================================================
// B16. no British spellings (the word map, columns and scanning live in ../british_spelling.ts)
// =====================================================================================

export { BE_AE_MAP, fixBritishSpelling, scanBritishSpelling };

export type SpellingScope = { table: string; rows: Record<string, unknown>[] };

// Rows: "<table>:<id>". In this domain's rows, a British word in prose fails (be_spelling_sweep.ts --write fixes it) and a
// British word in a name, a code or an identifier token warns (a rename is a manual decision, and the allow-list in
// british_spelling.ts covers real brands). Rows no single domain owns (`catalogWide`) warn, because they should not
// fail one domain's check; be_spelling_sweep.ts --check is where they fail the build.
export function checkBritishSpelling(scope: SpellingScope[], opts: { columns?: SpellingColumns; catalogWide?: SpellingScope[] } = {}): Finding[] {
  const hits = scope.flatMap((s) => scanBritishSpelling(s.table, s.rows, opts.columns));
  const wide = (opts.catalogWide ?? []).flatMap((s) => scanBritishSpelling(s.table, s.rows, opts.columns));
  const rowCount = scope.reduce((n, s) => n + s.rows.length, 0);
  const wideCount = (opts.catalogWide ?? []).reduce((n, s) => n + s.rows.length, 0);
  const fmt = (h: SpellingHit) => `${h.table}.${h.column} id=${h.id}: ${h.hits.join(", ")}`;
  const rowsOf = (hs: SpellingHit[]) => [...new Set(hs.map((h) => `${h.table}:${h.id}`))].sort();
  const auto = hits.filter((h) => h.autofix);
  const report = hits.filter((h) => !h.autofix);
  const out: Finding[] = [];
  if (auto.length) {
    out.push({
      id: "B16",
      result: "fail",
      rows: rowsOf(auto),
      detail: `${auto.reduce((n, h) => n + h.hits.length, 0)} AUTOFIX substitution(s) on ${rowsOf(auto).length} row(s) (fix: be_spelling_sweep.ts --write): ${listOf(auto.map(fmt))}`,
    });
  }
  if (report.length) {
    out.push({
      id: "B16",
      result: "warn",
      rows: rowsOf(report),
      detail: `${report.length} REPORT-only hit(s) in names and identifiers (manual: a rename cascades): ${listOf(report.map(fmt))}`,
    });
  }
  if (wide.length) {
    out.push({
      id: "B16",
      result: "warn",
      rows: rowsOf(wide),
      detail: `${wide.length} hit(s) in catalog-wide rows no single domain owns (fix: be_spelling_sweep.ts): ${listOf(wide.map(fmt))}`,
    });
  }
  if (out.length === 0) {
    const across = (opts.catalogWide ?? []).length ? `, plus ${wideCount} catalog-wide row(s) across ${opts.catalogWide!.length} table(s)` : "";
    out.push(pass("B16", `${rowCount} row(s) across ${scope.length} table(s) scanned${across}, no British spelling (rows = <table>:<id>)`));
  }
  return out;
}
