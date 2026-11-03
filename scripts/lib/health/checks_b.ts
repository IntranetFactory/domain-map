// scripts/lib/health/checks_b.ts
//
// B band: data-object footprint (SKILL.md checklist section "B. Phase B").
// Each entry's id matches the SKILL.md checklist; registry.ts asserts coverage.
//
// Implemented on the shared invariants (scripts/lib/catalog_invariants.ts, also used by loader
// pre-flights): B6b, B7b, B9c, B9f. Row ids: B6b / B7b = data_object_relationships.id,
// B9c = trigger_events.id, B9f = handoffs.id.
//
// Implemented on the pure B-band logic (scripts/lib/health/logic_b.ts, ported from
// audit_backlog.ts, phase_p_triage.ts, validate_cross_domain.ts q1/q2/q3/q5 and
// be_spelling_sweep.ts): B1, B2, B3, B5, B8, B9, B9b, B10 (report-only, at most warn), B10b, B12,
// B13, B15, B16, and the mechanical half of B6, B7, B7c, B11, B14 (their judgment half is a second,
// `agent` finding). This file only gathers the domain's rows; every rule lives in logic_b.ts.
// Row types per check are documented there and in each finding's detail.

import {
  checkDuplicateHandoffs,
  checkEventStates,
  checkRelationshipShape,
  checkUserRelationships,
  isUserRelationship,
} from "../catalog_invariants.ts";
import { agentOnly, delegated, fromInvariants, judgment, masterLifecycle, personaLabel } from "./helpers.ts";
import {
  checkAliasPresence,
  checkBareWordNaming,
  checkBritishSpelling,
  type SpellingScope,
  checkConditionalMasters,
  checkCrossDomainRelationships,
  checkDependencyOwners,
  checkEntityTypeClassified,
  checkHandoffModuleAttribution,
  checkInboundCoverage,
  checkIntraDomainRelationships,
  checkIntraDomainHandoffs,
  checkLifecycleCoverage,
  checkMasterFloor,
  checkMasterLabels,
  checkOutboundEvents,
  checkPersonalContentClass,
  checkPersonaRelationships,
  checkUserRelationshipPresence,
  type MasterRow,
} from "./logic_b.ts";
import { buildSpellingColumns, DOMAIN_MAP_MODULE_ID, type SpellingColumns } from "../british_spelling.ts";
import type { Check, HealthCtx } from "./types.ts";

const TRIGGER_EVENTS_PATH = "/trigger_events?select=id,event_name,data_object_id,event_category,from_state,to_state&order=id.asc&limit=100000";

// Catalog-wide text select (memoized by ctx.query, so --all fetches it once). B3 reads naming_authority_rationale from it.
const DATA_OBJECTS_TEXT_PATH = "/data_objects?select=id,data_object_name,singular_label,plural_label,description,naming_authority_rationale,notes&order=id.asc&limit=100000";

// Lookups derived from a catalog-wide array, built once per array (so once per --all run).
const derived = new WeakMap<object, Map<string, unknown>>();
function once<T>(key: object, name: string, build: () => T): T {
  let m = derived.get(key);
  if (!m) derived.set(key, (m = new Map()));
  if (!m.has(name)) m.set(name, build());
  return m.get(name) as T;
}

async function eventEntityOf(ctx: HealthCtx): Promise<(eventId: number) => number | undefined> {
  const events = await ctx.query(TRIGGER_EVENTS_PATH);
  const map = once(events, "eventEntity", () => new Map<number, number>(events.map((e: any) => [e.id as number, e.data_object_id as number])));
  return (id) => map.get(id);
}

async function masterEvents(ctx: HealthCtx): Promise<any[]> {
  return (await ctx.query(TRIGGER_EVENTS_PATH)).filter((e: any) => ctx.masterSet.has(e.data_object_id as number));
}

const isBuiltin = (ctx: HealthCtx) => (id: number): boolean => ctx.index.dataObjectsById.get(id)?.kind === "platform_builtin";
const domainCode = (ctx: HealthCtx) => (id: number | null | undefined): string =>
  id == null ? "(no domain)" : ctx.index.domainsById.get(id)?.domain_code ?? `domain ${id}`;
const eventLabel = (ctx: HealthCtx) => {
  const names = once(ctx.all.handoffs, "eventNames", () => {
    const m = new Map<number, string>();
    for (const h of ctx.all.handoffs) if (h.trigger_event_id != null && h.trigger_events?.event_name) m.set(h.trigger_event_id, h.trigger_events.event_name);
    return m;
  });
  return (id: number | null): string => (id == null ? "(no event)" : names.has(id) ? `${names.get(id)} (event ${id})` : `event ${id}`);
};

// The domain's masters as rows (catalog index columns).
function masterRows(ctx: HealthCtx): MasterRow[] {
  return ctx.masters.map((id) => ctx.index.dataObjectsById.get(id)).filter((d): d is NonNullable<typeof d> => d != null) as MasterRow[];
}

// Relationships whose SOURCE is a master (SKILL.md B6b query: data_object_id=in.(<masters>)).
function masterSourcedRelationships(ctx: HealthCtx): any[] {
  return ctx.all.relationships.filter((r: any) => ctx.masterSet.has(r.data_object_id as number));
}

// relationships to users touching a master, either direction (SKILL.md B7 query + its symmetric half).
function masterUserRelationships(ctx: HealthCtx): any[] {
  return ctx.all.relationships.filter((r: any) => {
    if (!isUserRelationship(r, ctx.usersId)) return false;
    const other = r.data_object_id === ctx.usersId ? r.related_data_object_id : r.data_object_id;
    return ctx.masterSet.has(other as number);
  });
}

// B16 reads its tables and columns from /entities and /fields, never a hard-coded list, so a new column is scanned the
// day it exists (classification: scripts/lib/british_spelling.ts). Memoized by ctx.query, so --all fetches each once.
async function spellingColumns(ctx: HealthCtx): Promise<{ tables: string[]; columns: SpellingColumns }> {
  const entities = await ctx.query(`/entities?module_id=eq.${DOMAIN_MAP_MODULE_ID}&select=table_name,computed_fields&order=table_name&limit=1000`);
  const tables = entities.map((e: any) => e.table_name as string);
  const fields = await ctx.query(`/fields?table_name=in.(${tables.join(",")})&select=table_name,field_name,format,ctype&limit=100000`);
  return { tables, columns: once(entities, "spellingColumns", () => buildSpellingColumns(entities, fields)) };
}

// Every row of the domain that B16 scans, per table: the domain row and what hangs off it, its primary modules and
// their junctions, its masters (and their events, lifecycle states, aliases and relationships), its related
// capabilities, its outbound handoffs, the personas reaching its modules, its skills, the tools its modules use, its
// solutions and their vendors. Tables no domain can claim are scanned whole and only warn.
async function spellingScope(ctx: HealthCtx): Promise<{ scope: SpellingScope[]; catalogWide: SpellingScope[]; columns: SpellingColumns }> {
  const { tables, columns } = await spellingColumns(ctx);
  // Text columns plus the foreign keys the filters below read.
  const textRows = (table: string, keys: string[] = []): Promise<any[]> => {
    const cols = columns[table];
    return ctx.query(`/${table}?select=${[...new Set(["id", ...keys, ...cols.prose, ...cols.identifier])].join(",")}&order=id.asc&limit=100000`);
  };
  const byDomain = (r: any) => r.domain_id === ctx.domainId;
  const byModule = (r: any) => ctx.moduleIdSet.has(r.domain_module_id);
  const inMasters = (r: any) => ctx.masterSet.has(r.data_object_id as number);

  const capabilityDomains = await textRows("capability_domains", ["capability_id", "domain_id"]);
  const capIds = new Set(capabilityDomains.filter(byDomain).map((r: any) => r.capability_id));
  const personaModules = await textRows("persona_modules", ["persona_id", "domain_module_id"]);
  const personaIds = new Set(personaModules.filter(byModule).map((r: any) => r.persona_id));
  const moduleTools = await textRows("domain_module_tools", ["domain_module_id", "tool_id"]);
  const toolIds = new Set(moduleTools.filter(byModule).map((r: any) => r.tool_id));
  const handoffs = (await textRows("handoffs", ["source_domain_id"])).filter((h: any) => h.source_domain_id === ctx.domainId);
  const handoffIds = new Set(handoffs.map((h: any) => h.id));
  const solutionDomains = await textRows("solution_domains", ["solution_id", "domain_id"]);
  const solutionIds = new Set(solutionDomains.filter(byDomain).map((r: any) => r.solution_id));
  const solutions = (await textRows("solutions", ["vendor_id"])).filter((s: any) => solutionIds.has(s.id));
  const vendorIds = new Set(solutions.map((s: any) => s.vendor_id));

  const scope: SpellingScope[] = [
    { table: "domains", rows: (await textRows("domains")).filter((d: any) => d.id === ctx.domainId) },
    { table: "domain_aliases", rows: (await textRows("domain_aliases", ["domain_id"])).filter(byDomain) },
    { table: "domain_data_objects", rows: (await textRows("domain_data_objects", ["domain_id"])).filter(byDomain) },
    { table: "domain_regulations", rows: (await textRows("domain_regulations", ["domain_id"])).filter(byDomain) },
    { table: "business_function_domains", rows: (await textRows("business_function_domains", ["domain_id"])).filter(byDomain) },
    { table: "capability_domains", rows: capabilityDomains.filter(byDomain) },
    { table: "domain_modules", rows: (await textRows("domain_modules")).filter((m: any) => ctx.moduleIdSet.has(m.id)) },
    { table: "domain_module_capabilities", rows: (await textRows("domain_module_capabilities", ["domain_module_id"])).filter(byModule) },
    { table: "domain_module_data_objects", rows: (await textRows("domain_module_data_objects", ["domain_module_id"])).filter(byModule) },
    { table: "domain_module_tools", rows: moduleTools.filter(byModule) },
    { table: "persona_modules", rows: personaModules.filter(byModule) },
    { table: "data_objects", rows: (await textRows("data_objects")).filter((d: any) => ctx.masterSet.has(d.id)) },
    { table: "data_object_relationships", rows: (await textRows("data_object_relationships", ["data_object_id"])).filter(inMasters) },
    { table: "trigger_events", rows: (await textRows("trigger_events", ["data_object_id"])).filter(inMasters) },
    { table: "data_object_aliases", rows: (await textRows("data_object_aliases", ["data_object_id"])).filter(inMasters) },
    { table: "data_object_lifecycle_states", rows: (await textRows("data_object_lifecycle_states", ["data_object_id"])).filter(inMasters) },
    { table: "capabilities", rows: (await textRows("capabilities")).filter((r: any) => capIds.has(r.id)) },
    { table: "business_function_capabilities", rows: (await textRows("business_function_capabilities", ["capability_id"])).filter((r: any) => capIds.has(r.capability_id)) },
    { table: "handoffs", rows: handoffs },
    { table: "handoff_processes", rows: (await textRows("handoff_processes", ["handoff_id"])).filter((r: any) => handoffIds.has(r.handoff_id)) },
    { table: "personas", rows: (await textRows("personas")).filter((r: any) => personaIds.has(r.id)) },
    { table: "skills", rows: (await textRows("skills", ["domain_id"])).filter(byDomain) },
    { table: "tools", rows: (await textRows("tools")).filter((t: any) => toolIds.has(t.id)) },
    { table: "tool_solutions", rows: (await textRows("tool_solutions", ["tool_id"])).filter((r: any) => toolIds.has(r.tool_id)) },
    { table: "solution_domains", rows: solutionDomains.filter(byDomain) },
    { table: "solutions", rows: solutions },
    { table: "vendors", rows: (await textRows("vendors")).filter((v: any) => vendorIds.has(v.id)) },
  ];
  // Whatever no domain can claim is scanned whole: industries, jurisdictions, regulations and so on, including any table
  // added to the module later. Schema metadata and rows no domain reaches are covered by be_spelling_sweep.ts --check.
  const claimed = new Set(scope.map((s) => s.table));
  const catalogWide: SpellingScope[] = [];
  for (const table of tables) if (!claimed.has(table)) catalogWide.push({ table, rows: await textRows(table) });
  return { scope, catalogWide, columns };
}

export const B_CHECKS: Check[] = [
  {
    id: "B1",
    band: "B",
    kind: "mechanical",
    title: ">= 1 master data_object",
    run: async (ctx) =>
      checkMasterFloor({
        domainKind: ctx.domain.domain_kind,
        moduleCount: ctx.modules.length,
        masterCount: ctx.masters.length,
        overlayRowCount: ctx.dmdo.filter((r: any) => r.held_as === "consumer" || r.held_as === "derived" || r.held_as === "embedded_master").length,
      }),
  },
  {
    id: "B2",
    band: "B",
    kind: "mechanical",
    title: "every master has singular_label and plural_label",
    run: async (ctx) => checkMasterLabels(masterRows(ctx)),
  },
  {
    id: "B3",
    band: "B",
    kind: "mechanical",
    title: "naming arbitration on every master",
    run: async (ctx) => {
      const text = await ctx.query(DATA_OBJECTS_TEXT_PATH);
      const rationale = once(text, "rationale", () => new Map<number, string | null>(text.map((d: any) => [d.id as number, d.naming_authority_rationale ?? null])));
      return checkBareWordNaming(masterRows(ctx).map((m) => ({ ...m, naming_authority_rationale: rationale.get(m.id) ?? null })));
    },
  },
  agentOnly(
    "B4",
    "B",
    "has_personal_content considered on every master",
    "positively re-evaluate has_personal_content on every master (false-by-default is not false-after-review); record the pass in the gap report, never in notes",
  ),
  {
    id: "B5",
    band: "B",
    kind: "mechanical",
    title: "embedded_master integrity",
    run: async (ctx) =>
      checkDependencyOwners(ctx.dmdo, {
        hasMaster: (id) => (ctx.masterDomainsByDataObject.get(id)?.size ?? 0) > 0,
        isBuiltin: isBuiltin(ctx),
        nameOf: ctx.doName,
        moduleLabel: ctx.moduleCode,
      }),
  },
  {
    id: "B6",
    band: "B",
    kind: "mechanical+agent",
    title: "intra-domain relationships populated",
    run: async (ctx) => [
      ...checkIntraDomainRelationships(ctx.masters, ctx.all.relationships, { nameOf: ctx.doName }),
      judgment(
        "B6",
        "every master in the domain's primary workflow has >= 1 relationship to another in-domain master; an isolated master is allowed only when a data_object_relationships.notes entry justifies it",
      ),
    ],
  },
  {
    id: "B6b",
    band: "B",
    kind: "mechanical",
    title: "relationship shape invariants (owner_side, verbs)",
    run: async (ctx) => {
      const rels = masterSourcedRelationships(ctx);
      const found = checkRelationshipShape(rels, { nameOf: ctx.doName, masterDomainsByDataObject: ctx.masterDomainsByDataObject, allRelationships: ctx.all.relationships });
      if (found.length === 0) return [{ id: "B6b", result: "pass", detail: `${rels.length} master-sourced relationships checked (rows = relationship ids)` }];
      return fromInvariants("B6b", found);
    },
  },
  {
    id: "B7",
    band: "B",
    kind: "mechanical+agent",
    title: "relationships to users populated",
    run: async (ctx) => [
      ...checkUserRelationshipPresence(masterRows(ctx), masterUserRelationships(ctx), ctx.usersId, { nameOf: ctx.doName }),
      judgment(
        "B7",
        "which masters carry a user-typed person (assignee, creator, approver, panelist, owner, hiring_manager, recruiter, author); each needs >= 1 relationship to users (Rule #10)",
      ),
    ],
  },
  {
    id: "B7b",
    band: "B",
    kind: "mechanical",
    title: "shape of relationships to users (one person per reference, one kind of person per relationship)",
    run: async (ctx) => {
      const rels = masterUserRelationships(ctx);
      const found = checkUserRelationships(rels, ctx.usersId, { nameOf: ctx.doName });
      if (found.length === 0) return [{ id: "B7b", result: "pass", detail: `${rels.length} relationships to users checked (rows = relationship ids)` }];
      return fromInvariants("B7b", found);
    },
  },
  {
    id: "B7c",
    band: "B",
    kind: "mechanical+agent",
    title: "row-scoped masters: each Responsible and Accountable persona has a relationship to users",
    run: async (ctx) => [
      ...checkPersonaRelationships({
        masters: masterRows(ctx),
        rels: masterUserRelationships(ctx),
        states: masterLifecycle(ctx),
        raci: ctx.all.processRaci,
        usersId: ctx.usersId,
        nameOf: ctx.doName,
        personaLabel: (id) => personaLabel(ctx, id),
      }),
      judgment(
        "B7c",
        "for each entity and persona the mechanical half warns about, read domain_modules.specification_requirements: a view_all grant named there for that persona satisfies the check, and the script cannot read that prose",
      ),
    ],
  },
  {
    id: "B8",
    band: "B",
    kind: "mechanical",
    title: "cross-domain relationships (outbound only)",
    run: async (ctx) =>
      checkCrossDomainRelationships({
        domainId: ctx.domainId,
        masterIds: ctx.masterSet,
        handoffs: ctx.all.handoffs,
        eventEntity: await eventEntityOf(ctx),
        rels: ctx.all.relationships,
        masterDomains: (id) => ctx.masterDomainsByDataObject.get(id),
        isBuiltin: isBuiltin(ctx),
        domainCode: domainCode(ctx),
        nameOf: ctx.doName,
      }),
  },
  {
    id: "B9",
    band: "B",
    kind: "mechanical",
    title: "outbound trigger_events + handoffs complete",
    run: async (ctx) =>
      checkOutboundEvents({
        domainId: ctx.domainId,
        masterIds: ctx.masters,
        events: await masterEvents(ctx),
        states: masterLifecycle(ctx),
        handoffs: ctx.all.handoffs,
        domainDmdo: ctx.dmdo,
        hasModules: ctx.modules.length > 0,
        eventEntity: await eventEntityOf(ctx),
        isBuiltin: isBuiltin(ctx),
        nameOf: ctx.doName,
        domainCode: domainCode(ctx),
      }),
  },
  {
    id: "B9b",
    band: "B",
    kind: "mechanical",
    title: "intra-domain cross-module handoffs complete",
    run: async (ctx) =>
      checkIntraDomainHandoffs({
        domainId: ctx.domainId,
        moduleIds: ctx.moduleIds,
        masterIds: ctx.masterSet,
        masterModules: (id) => ctx.masterModulesByDataObject.get(id),
        rels: ctx.all.relationships,
        events: await masterEvents(ctx),
        states: masterLifecycle(ctx),
        handoffs: ctx.all.handoffs,
        moduleLabel: ctx.moduleCode,
        nameOf: ctx.doName,
      }),
  },
  {
    id: "B9c",
    band: "B",
    kind: "mechanical",
    title: "trigger_event to_state resolves to the lifecycle",
    run: async (ctx) => {
      const events = (await ctx.query(TRIGGER_EVENTS_PATH)).filter((e: any) => ctx.masterSet.has(e.data_object_id as number));
      const found = checkEventStates(events, masterLifecycle(ctx), { nameOf: ctx.doName });
      if (found.length === 0) return [{ id: "B9c", result: "pass", detail: `${events.length} master events checked (rows = trigger_event ids)` }];
      return fromInvariants("B9c", found);
    },
  },
  delegated(
    "B9d",
    "B",
    "handoff payload realization (both directions)",
    "run `bun run scripts/analytics/b9d_resolver.ts <CODE> --dry-run` (then --write for the additive owner-side b2 + q edits); its both-directions classification output must be in the audit transcript",
  ),
  delegated(
    "B9e",
    "B",
    "per-function RACI reveal",
    "released, persona-bearing domains only: re-emit with `bun run scripts/emit_domain_map.ts` and confirm the domain's owner / contributor / consumer functions carry non-empty raci[] in catalog/domain-map/business-functions.json",
  ),
  {
    id: "B9f",
    band: "B",
    kind: "mechanical",
    title: "no duplicate handoffs (event + module pair)",
    run: async (ctx) => {
      const out = ctx.all.handoffs.filter((h: any) => h.source_domain_id === ctx.domainId);
      const names = new Map<number, string>();
      for (const h of out) if (h.trigger_event_id != null && h.trigger_events?.event_name) names.set(h.trigger_event_id, `${h.trigger_events.event_name} (event ${h.trigger_event_id})`);
      const found = checkDuplicateHandoffs(out, { eventName: (id) => names.get(id) ?? `event ${id}` });
      if (found.length === 0) return [{ id: "B9f", result: "pass", detail: `${out.length} outbound handoffs checked (rows = handoff ids)` }];
      return fromInvariants("B9f", found);
    },
  },
  {
    id: "B10",
    band: "B",
    kind: "mechanical",
    title: "inbound handoffs (report-only)",
    run: async (ctx) =>
      checkInboundCoverage({
        domainId: ctx.domainId,
        deps: ctx.dmdo,
        masterIds: ctx.masterSet,
        masterDomains: (id) => ctx.masterDomainsByDataObject.get(id),
        isBuiltin: isBuiltin(ctx),
        handoffs: ctx.all.handoffs,
        domainCode: domainCode(ctx),
        nameOf: ctx.doName,
      }),
  },
  {
    id: "B10b",
    band: "B",
    kind: "mechanical",
    title: "per-module attribution on handoffs",
    run: async (ctx) =>
      checkHandoffModuleAttribution({
        domainId: ctx.domainId,
        hasModules: ctx.modules.length > 0,
        handoffs: ctx.all.handoffs,
        domainCode: domainCode(ctx),
        eventName: eventLabel(ctx),
      }),
  },
  {
    id: "B11",
    band: "B",
    kind: "mechanical+agent",
    title: "aliases on non-self-explanatory masters",
    run: async (ctx) => [
      ...checkAliasPresence(masterRows(ctx), ctx.all.aliases, { nameOf: ctx.doName }),
      judgment(
        "B11",
        "which masters have a cross-vendor / cross-industry synonym and need >= 1 alias (self-explanatory masters are exempt; record the exemption in the gap report, not in notes)",
      ),
    ],
  },
  {
    id: "B12",
    band: "B",
    kind: "mechanical",
    title: "lifecycle states on operational_workflow masters",
    run: async (ctx) => checkLifecycleCoverage(masterRows(ctx), masterLifecycle(ctx), { nameOf: ctx.doName }),
  },
  {
    id: "B13",
    band: "B",
    kind: "mechanical",
    title: "entity_type classified on every master",
    run: async (ctx) => checkEntityTypeClassified(masterRows(ctx)),
  },
  {
    id: "B14",
    band: "B",
    kind: "mechanical+agent",
    title: "sector / vendor-conditional masters are optional",
    run: async (ctx) => [
      ...checkConditionalMasters(ctx.dmdo, { nameOf: ctx.doName, moduleLabel: ctx.moduleCode }),
      judgment(
        "B14",
        "vendor-shape scan: which master + always installed rows are sector- or vendor-conditional (a flagship vendor lacks the entity) and should be is_install_optional=true, unless the user recorded a kept-required decision",
      ),
    ],
  },
  {
    id: "B15",
    band: "B",
    kind: "mechanical",
    title: "no has_personal_content on catalog / junction / computed masters",
    run: async (ctx) => checkPersonalContentClass(masterRows(ctx)),
  },
  {
    id: "B16",
    band: "B",
    kind: "mechanical",
    title: "no British spellings",
    run: async (ctx) => {
      const { scope, catalogWide, columns } = await spellingScope(ctx);
      return checkBritishSpelling(scope, { catalogWide, columns });
    },
  },
];
