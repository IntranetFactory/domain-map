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
//                             q3   B9 rule event_not_publishable (isPublishableBy, PUBLISH_ROLES)
//                             q5   B9 rule event_no_handoff, orphan half (no lifecycle either)
//   be_spelling_sweep.ts      B16  BE_AE_MAP / fixBritishSpelling / BE_*_COLUMNS
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
  role: string; // master | embedded_master | contributor | consumer | derived
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

export const DEPENDENCY_ROLES = new Set(["embedded_master", "contributor", "consumer"]);

export type DependencyOwnerOptions = {
  hasMaster: (dataObjectId: number) => boolean; // a role='master' dmdo row anywhere in the catalog
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
  const deps = rows.filter((r) => DEPENDENCY_ROLES.has(r.role));
  const orphan = deps.filter((r) => !opts.hasMaster(r.data_object_id) && !opts.isBuiltin(r.data_object_id));
  const out: Finding[] = [];
  const describe = (g: DmdoRow[]) => {
    const byDo = groupBy(g, (r) => r.data_object_id);
    return {
      rows: [...byDo.keys()].sort(byNum),
      items: [...byDo.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([id, rs]) => `${nameOf(id)} (${rs.map((r) => `${r.role}${r.is_install_optional ? "/install optional" : ""} @ ${mod(r.domain_module_id)}`).join(", ")})`),
    };
  };
  const emb = orphan.filter((r) => r.role === "embedded_master");
  if (emb.length) {
    const d = describe(emb);
    out.push({
      id: "B5",
      result: "fail",
      rows: d.rows,
      detail: `${d.rows.length} embedded_master(s) with no canonical master anywhere and not platform_builtin (rows = data_object ids; fix: add the owner's master row or drop the embed): ${listOf(d.items)}`,
    });
  }
  const other = orphan.filter((r) => r.role !== "embedded_master");
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

// Rows: data_object ids. Self-edges (a master related to itself) do not connect it to another
// master. Whether an isolated master belongs to the primary workflow is the judgment half, so a
// single isolated master is `warn`; a domain with >= 2 masters and NO intra edge at all is `fail`.
export function checkIntraDomainEdges(masterIds: number[], rels: RelRow[], opts: { nameOf?: NameOf } = {}): Finding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const set = new Set(masterIds);
  if (set.size < 2) return [pass("B6", `${set.size} master(s): no in-domain pair to connect`)];
  const intra = rels.filter((r) => set.has(r.data_object_id) && set.has(r.related_data_object_id) && r.data_object_id !== r.related_data_object_id);
  const connected = new Set<number>();
  for (const r of intra) {
    connected.add(r.data_object_id);
    connected.add(r.related_data_object_id);
  }
  const isolated = [...set].filter((id) => !connected.has(id)).sort(byNum);
  if (intra.length === 0) {
    return [{ id: "B6", result: "fail", rows: isolated, detail: `no intra-domain data_object_relationships among ${set.size} masters (rows = data_object ids)` }];
  }
  if (isolated.length === 0) return [pass("B6", `${intra.length} intra-domain edges connect all ${set.size} masters (rows = data_object ids)`)];
  return [
    {
      id: "B6",
      result: "warn",
      rows: isolated,
      detail: `${isolated.length} of ${set.size} masters have no edge to another in-domain master (rows = data_object ids; allowed only with a notes justification): ${listOf(isolated.map(nameOf))}`,
    },
  ];
}

// =====================================================================================
// B7. users edges populated (mechanical half)
// =====================================================================================

// entity_types that carry a user-typed actor in practice. catalog / junction / computed masters
// are not listed (a users edge there is the exception, not the rule).
export const USER_ACTOR_ENTITY_TYPES = new Set(["operational_workflow", "operational_record", "unclassified", ""]);

// Rows: data_object ids. Either direction counts (master -> users and users -> master).
export function checkUserEdgePresence(masters: MasterRow[], rels: RelRow[], usersId: number, opts: { nameOf?: NameOf } = {}): Finding[] {
  const nameOf = opts.nameOf ?? defaultName;
  const ids = new Set(masters.map((m) => m.id));
  const withEdge = new Set<number>();
  for (const r of rels) {
    if (r.data_object_id === usersId && ids.has(r.related_data_object_id)) withEdge.add(r.related_data_object_id);
    else if (r.related_data_object_id === usersId && ids.has(r.data_object_id)) withEdge.add(r.data_object_id);
  }
  if (masters.length === 0) return [pass("B7", "no masters (see B1)")];
  const workflow = masters.filter((m) => norm(m.entity_type) === "operational_workflow");
  if (withEdge.size === 0 && workflow.length > 0) {
    return [
      {
        id: "B7",
        result: "fail",
        rows: workflow.map((m) => m.id).sort(byNum),
        detail: `no users edge on any of ${masters.length} masters, ${workflow.length} of them operational_workflow (a workflow always has a user actor, Rule #10; rows = data_object ids)`,
      },
    ];
  }
  const missing = masters.filter((m) => !withEdge.has(m.id) && USER_ACTOR_ENTITY_TYPES.has(norm(m.entity_type))).sort((a, b) => a.id - b.id);
  if (missing.length === 0) return [pass("B7", `${withEdge.size} of ${masters.length} masters carry a users edge; no operational master lacks one (rows = data_object ids)`)];
  return [
    {
      id: "B7",
      result: "warn",
      rows: missing.map((m) => m.id),
      detail: `${missing.length} operational master(s) with no users edge (rows = data_object ids; catalog / junction / computed masters not listed): ${listOf(missing.map((m) => nameOf(m.id)))}`,
    },
  ];
}

// =====================================================================================
// B8. cross-domain relationships, outbound only (+ report-only inbound owed by the source)
// =====================================================================================

export type CrossEdgeInput = {
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
// not one of this domain's masters, not platform_builtin. It needs the edge
// `<event entity> -> <payload>`. Missing outbound edges fail (this domain owes them); the mirror
// image on inbound handoffs is owed by the source domain's B8, so it is report-only (`warn`).
export function checkCrossDomainEdges(x: CrossEdgeInput): Finding[] {
  const nameOf = x.nameOf ?? defaultName;
  const code = x.domainCode ?? defaultDomain;
  const edges = new Set(x.rels.map((r) => `${r.data_object_id}|${r.related_data_object_id}`));
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
      if (edges.has(`${ev}|${payload}`)) continue;
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
  if (out.length === 0) out.push(pass("B8", `${o.considered} outbound cross-domain handoffs, ${o.clean} clean payload -> target mappings, all edged (rows = handoff ids)`));
  return out;
}

// =====================================================================================
// B9. outbound trigger_events + handoffs complete (+ validate_cross_domain q3 / q5)
// =====================================================================================

// SKILL.md B9: a state named like a published verb needs an `<entity>.<state>` event even when
// it is not gated. `cancelled` is SKILL.md's own (BE) spelling; both spellings are matched.
export const PUBLISHED_VERB_STATES = new Set(["approved", "signed", "accepted", "canceled", "cancelled", "closed", "hired", "terminated"]);

// validate_cross_domain.ts q3: roles that may publish an event about an entity (consumer-only
// is excluded: a domain does not publish events about something it only reads).
export const PUBLISH_ROLES = new Set(["master", "embedded_master", "contributor", "derived"]);

export function isPublishableBy(dmdoRows: DmdoRow[], dataObjectId: number): boolean {
  return dmdoRows.some((r) => r.data_object_id === dataObjectId && PUBLISH_ROLES.has(r.role));
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
      detail: `${unpublishable.length} outbound handoff(s) fire an event on an entity this domain holds in no publishing role (validate_cross_domain q3): ${listOf(unpublishable.map((h) => `handoff ${h.id} ${nameOf(x.eventEntity(h.trigger_event_id as number) as number)} -> ${code(h.target_domain_id)}`))}`,
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
  deps: DmdoRow[]; // dmdo rows on this domain's modules (non-dependency roles are ignored)
  masterIds: Set<number>;
  masterDomains: (dataObjectId: number) => Set<number> | undefined;
  isBuiltin: (dataObjectId: number) => boolean; // built-ins have no owner and owe no handoff
  handoffs: HandoffRow[];
  domainCode?: Label;
  nameOf?: NameOf;
};

const ROLE_STRENGTH = ["master", "embedded_master", "contributor", "consumer", "derived"];

// Rows: data_object ids (the dependency owed). Discovery reads domain_module_data_objects only
// (the deprecated domain_data_objects rollup is never read). An entity this domain masters on any
// of its modules is not an inbound dependency. Unowned dependencies are counted here and fail B5.
export function checkInboundCoverage(x: InboundCoverageInput): Finding[] {
  const nameOf = x.nameOf ?? defaultName;
  const code = x.domainCode ?? defaultDomain;
  const inbound = x.handoffs.filter((h) => h.target_domain_id === x.domainId && h.source_domain_id !== x.domainId);
  const fromDomains = new Set(inbound.map((h) => h.source_domain_id));
  const deps = groupBy(
    x.deps.filter((r) => DEPENDENCY_ROLES.has(r.role) && !x.masterIds.has(r.data_object_id) && !x.isBuiltin(r.data_object_id)),
    (r) => r.data_object_id,
  );
  type Owed = { owner: number; doId: number; role: string; install: string };
  const owed: Owed[] = [];
  let unowned = 0;
  for (const [doId, rs] of [...deps.entries()].sort((a, b) => a[0] - b[0])) {
    const owners = [...(x.masterDomains(doId) ?? [])].filter((d) => d !== x.domainId).sort(byNum);
    if (owners.length === 0) {
      unowned++;
      continue;
    }
    const strongest = [...rs].sort((a, b) => ROLE_STRENGTH.indexOf(a.role) - ROLE_STRENGTH.indexOf(b.role))[0];
    const install = rs.some((r) => !r.is_install_optional) ? "always installed" : "install optional";
    for (const owner of owners) {
      const hit = inbound.some((h) => h.source_domain_id === owner && h.data_object_id === doId);
      if (!hit) owed.push({ owner, doId, role: strongest.role, install });
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
      detail: `report-only: ${code(owner)} B9 owes outbound on ${os.length} dependenc(ies) (rows = data_object ids): ${listOf(os.map((o) => `${nameOf(o.doId)} (${o.role} + ${o.install})`))}`,
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
  const req = rows.filter((r) => r.role === "master" && !r.is_install_optional);
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
// B16. no British-English spellings (curated map from be_spelling_sweep.ts)
// =====================================================================================

// Confirmed -ize verb STEMS (text before "ise"). Each stem+suffix below is a real BE form whose AE
// spelling swaps `is` for `iz`; AE-native -ise words (enterprise, comprise, surprise, advertise,
// supervise, franchise, ...) are NOT here, so they are never generated.
const IZE_STEMS = [
  "organ", "priorit", "categor", "optim", "normal", "standard", "central", "decentral", "util",
  "special", "visual", "synchron", "author", "capital", "final", "material", "monet", "digit",
  "mobil", "harmon", "custom", "minim", "maxim", "emphas", "summar", "recogn", "real", "character",
  "commercial", "industrial", "legitim", "familiar", "regular", "modern", "formal", "neutral",
  "rational", "revital", "stabil", "steril", "subsid", "apolog", "colon", "critic", "homogen",
  "hospital", "hypothes", "motor", "patron", "penal", "pressur", "public", "random", "scrutin",
  "sensit", "social", "symbol", "sympath", "theor", "marginal", "liberal", "fertil", "civil",
  "item", "global", "local", "computer", "personal", "token",
];
const IZE_SUFFIXES: [string, string][] = [
  ["ise", "ize"], ["ised", "ized"], ["ising", "izing"], ["ises", "izes"],
  ["isation", "ization"], ["isations", "izations"], ["iser", "izer"], ["isers", "izers"],
  ["isable", "izable"], ["isational", "izational"], ["isationally", "izationally"],
];

// -yse verbs. "analyses" is deliberately omitted: it is also the AE plural of "analysis".
const YSE: [string, string][] = [
  ["analyse", "analyze"], ["analysed", "analyzed"], ["analysing", "analyzing"], ["analyser", "analyzer"],
  ["paralyse", "paralyze"], ["paralysed", "paralyzed"], ["paralysing", "paralyzing"],
  ["catalyse", "catalyze"], ["catalysed", "catalyzed"], ["catalysing", "catalyzing"],
];

// Explicit pairs (whole-word, case-insensitive). Grouped only for readability.
const EXPLICIT: [string, string][] = [
  // -our -> -or
  ["behaviour", "behavior"], ["behaviours", "behaviors"], ["behavioural", "behavioral"],
  ["colour", "color"], ["colours", "colors"], ["coloured", "colored"], ["colouring", "coloring"], ["colourful", "colorful"],
  ["favour", "favor"], ["favours", "favors"], ["favoured", "favored"], ["favourite", "favorite"], ["favourites", "favorites"], ["favourable", "favorable"],
  ["flavour", "flavor"], ["flavours", "flavors"],
  ["honour", "honor"], ["honours", "honors"], ["honoured", "honored"],
  ["labour", "labor"], ["laboured", "labored"],
  ["neighbour", "neighbor"], ["neighbours", "neighbors"], ["neighbouring", "neighboring"],
  ["rumour", "rumor"], ["rumours", "rumors"], ["vapour", "vapor"], ["vigour", "vigor"], ["odour", "odor"],
  ["harbour", "harbor"], ["valour", "valor"], ["savour", "savor"], ["endeavour", "endeavor"], ["endeavours", "endeavors"],
  ["splendour", "splendor"], ["demeanour", "demeanor"], ["candour", "candor"], ["clamour", "clamor"],
  ["parlour", "parlor"], ["fervour", "fervor"], ["rigour", "rigor"], ["rigours", "rigors"], ["saviour", "savior"],
  // -re -> -er
  ["centre", "center"], ["centres", "centers"], ["centred", "centered"], ["centring", "centering"],
  ["theatre", "theater"], ["theatres", "theaters"], ["fibre", "fiber"], ["fibres", "fibers"],
  ["calibre", "caliber"], ["metre", "meter"], ["metres", "meters"], ["litre", "liter"], ["litres", "liters"],
  ["spectre", "specter"], ["lustre", "luster"], ["sombre", "somber"], ["meagre", "meager"], ["sabre", "saber"],
  ["kilometre", "kilometer"], ["centimetre", "centimeter"], ["millimetre", "millimeter"],
  // -ence/-ense, -ise/-ice (nouns/verbs that change c<->s)
  ["licence", "license"], ["licences", "licenses"], ["defence", "defense"], ["defences", "defenses"],
  ["offence", "offense"], ["offences", "offenses"], ["pretence", "pretense"],
  ["practise", "practice"], ["practised", "practiced"], ["practising", "practicing"],
  // -logue -> -log
  ["catalogue", "catalog"], ["catalogues", "catalogs"], ["catalogued", "cataloged"], ["cataloguing", "cataloging"],
  ["dialogue", "dialog"], ["dialogues", "dialogs"], ["analogue", "analog"], ["analogues", "analogs"],
  // BE double-L -> AE single-L
  ["cancelled", "canceled"], ["cancelling", "canceling"], ["canceller", "canceler"], ["cancellation", "cancellation"],
  ["modelling", "modeling"], ["modelled", "modeled"], ["modeller", "modeler"],
  ["labelling", "labeling"], ["labelled", "labeled"], ["labeller", "labeler"],
  ["signalling", "signaling"], ["signalled", "signaled"],
  ["travelling", "traveling"], ["travelled", "traveled"], ["traveller", "traveler"], ["travellers", "travelers"],
  ["fuelling", "fueling"], ["fuelled", "fueled"], ["levelling", "leveling"], ["levelled", "leveled"],
  ["totalling", "totaling"], ["totalled", "totaled"], ["channelling", "channeling"], ["channelled", "channeled"],
  ["counselling", "counseling"], ["counselled", "counseled"], ["counsellor", "counselor"], ["counsellors", "counselors"],
  ["dialling", "dialing"], ["dialled", "dialed"], ["funnelling", "funneling"], ["funnelled", "funneled"],
  ["marvelled", "marveled"], ["parcelled", "parceled"], ["pencilled", "penciled"], ["rivalled", "rivaled"],
  ["jewellery", "jewelry"], ["jeweller", "jeweler"],
  // BE single-L -> AE double-L
  ["fulfil", "fulfill"], ["fulfils", "fulfills"], ["fulfilment", "fulfillment"], ["fulfilments", "fulfillments"],
  ["enrol", "enroll"], ["enrols", "enrolls"], ["enrolment", "enrollment"], ["enrolments", "enrollments"],
  ["instalment", "installment"], ["instalments", "installments"], ["instil", "instill"], ["instils", "instills"],
  ["skilful", "skillful"], ["wilful", "willful"], ["distil", "distill"], ["distils", "distills"],
  // misc
  ["programme", "program"], ["programmes", "programs"], ["grey", "gray"], ["greyscale", "grayscale"],
  ["ageing", "aging"], ["judgement", "judgment"], ["judgements", "judgments"],
  ["acknowledgement", "acknowledgment"], ["acknowledgements", "acknowledgments"],
  ["manoeuvre", "maneuver"], ["manoeuvres", "maneuvers"], ["mould", "mold"], ["moulds", "molds"],
  ["smoulder", "smolder"], ["draught", "draft"], ["plough", "plow"],
  ["sceptical", "skeptical"], ["sceptic", "skeptic"], ["scepticism", "skepticism"],
  ["cheque", "check"], ["cheques", "checks"], ["chequebook", "checkbook"], ["kerb", "curb"],
  ["tyre", "tire"], ["tyres", "tires"], ["speciality", "specialty"], ["specialities", "specialties"],
  ["storey", "story"], ["storeys", "stories"], ["cosy", "cozy"], ["dependant", "dependent"], ["dependants", "dependents"],
  ["whilst", "while"], ["amongst", "among"], ["focussed", "focused"], ["focussing", "focusing"],
  ["co-ordinate", "coordinate"], ["co-ordination", "coordination"], ["co-operate", "cooperate"], ["co-operation", "cooperation"],
  ["benefitted", "benefited"], ["benefitting", "benefiting"], ["organisational", "organizational"],
];

export const BE_AE_MAP = new Map<string, string>();
for (const stem of IZE_STEMS) for (const [be, ae] of IZE_SUFFIXES) BE_AE_MAP.set(stem + be, stem + ae);
for (const [be, ae] of YSE) BE_AE_MAP.set(be, ae);
for (const [be, ae] of EXPLICIT) if (be !== ae) BE_AE_MAP.set(be, ae);

// Single whole-word, case-insensitive matcher over every BE key (longest first).
const BE_KEYS = [...BE_AE_MAP.keys()].sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const BE_RE = new RegExp(`\\b(${BE_KEYS.join("|")})\\b`, "gi");

function applyCase(match: string, ae: string): string {
  if (match === match.toUpperCase() && match !== match.toLowerCase()) return ae.toUpperCase();
  if (match[0] === match[0].toUpperCase()) return ae[0].toUpperCase() + ae.slice(1);
  return ae;
}

// Returns the AE text and each old->new substitution made.
export function fixBritishSpelling(text: string): { fixed: string; hits: string[] } {
  const hits: string[] = [];
  const fixed = text.replace(BE_RE, (m) => {
    const ae = BE_AE_MAP.get(m.toLowerCase());
    if (!ae) return m;
    const out = applyCase(m, ae);
    if (out !== m) hits.push(`${m}->${out}`);
    return out;
  });
  return { fixed, hits };
}

// AUTOFIX: prose columns we author (be_spelling_sweep.ts patches them on --write).
// Differences from the sweep's original map, all three dead entries there (its `select=*` simply
// never returned them; an explicit select would 42703): naming_authority_rationale lives on
// data_objects (domains has no such column), domain_modules has no `notes` column, and the APQC
// table is business_processes (`processes` is the platform built-in, whose text column is `name`).
// Checked against /fields on 2026-11-01.
export const BE_AUTOFIX_COLUMNS: Record<string, string[]> = {
  domains: ["domain_name", "description", "business_logic", "catalog_tagline", "catalog_description", "notes"],
  domain_modules: ["domain_module_name", "description", "catalog_tagline", "catalog_description", "specification_requirements"],
  data_objects: ["singular_label", "plural_label", "description", "naming_authority_rationale", "notes"],
  capabilities: ["capability_name", "description"],
  handoffs: ["description", "notes"],
  // state / event vocabulary is free text cross-referenced only within the lifecycle + event
  // model, so it is safe to fix as long as state_name / to_state / from_state move together.
  trigger_events: ["description", "event_name", "to_state", "from_state"],
  data_object_aliases: ["alias_name", "notes"],
  data_object_lifecycle_states: ["description", "notes", "state_name", "permission_verb_override"],
  business_functions: ["business_function_name", "description"],
  domain_roles: ["role_name", "description"],
  skills: ["description", "trigger_keywords"],
  tools: ["description"],
};

// REPORT-ONLY: natural keys / codes (renames cascade to FKs) and externally-sourced names
// (APQC processes, statutes, vendor / solution proper names). Listed, never auto-changed.
export const BE_REPORT_COLUMNS: Record<string, string[]> = {
  domains: ["domain_code"],
  domain_modules: ["domain_module_code"],
  data_objects: ["data_object_name"],
  capabilities: ["capability_code"],
  domain_roles: ["role_code"],
  tools: ["tool_name"],
  skills: ["skill_name"],
  business_processes: ["process_name", "description"],
  regulations: ["regulation_name", "description"],
  solutions: ["solution_name", "description", "notes"],
  vendors: ["vendor_name", "description", "notes"],
  industries: ["industry_name"],
};

export type SpellingHit = { table: string; id: number; column: string; hits: string[]; autofix: boolean };

export function scanBritishSpelling(
  table: string,
  rows: Record<string, unknown>[],
  cols: { autofix?: Record<string, string[]>; report?: Record<string, string[]> } = {},
): SpellingHit[] {
  const auto = (cols.autofix ?? BE_AUTOFIX_COLUMNS)[table] ?? [];
  const report = (cols.report ?? BE_REPORT_COLUMNS)[table] ?? [];
  const out: SpellingHit[] = [];
  for (const row of rows) {
    for (const [list, autofix] of [[auto, true], [report, false]] as const) {
      for (const column of list) {
        const v = row[column];
        if (typeof v !== "string" || v.length === 0) continue;
        const { hits } = fixBritishSpelling(v);
        if (hits.length) out.push({ table, id: row.id as number, column, hits, autofix });
      }
    }
  }
  return out;
}

// Rows: "<table>:<id>". AUTOFIX hits fail (be_spelling_sweep.ts --write fixes them); hits in
// identifier / external-name columns are `warn` (manual judgment: a rename cascades, a brand may
// legitimately carry a BE token).
export function checkBritishSpelling(scope: { table: string; rows: Record<string, unknown>[] }[]): Finding[] {
  const hits = scope.flatMap((s) => scanBritishSpelling(s.table, s.rows));
  const rowCount = scope.reduce((n, s) => n + s.rows.length, 0);
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
      detail: `${report.length} REPORT-only hit(s) in identifier columns (manual: renames cascade): ${listOf(report.map(fmt))}`,
    });
  }
  if (out.length === 0) out.push(pass("B16", `${rowCount} row(s) across ${scope.length} table(s) scanned, no British-English spelling (rows = <table>:<id>)`));
  return out;
}
