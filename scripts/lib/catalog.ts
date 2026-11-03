// scripts/lib/catalog.ts
//
// Single source of truth for "what data does Semantius hold about a given module."
// Both generate_blueprints.ts (markdown blueprint emitter) and emit_domain_map.ts (JSON
// topology + catalog emitter) call into this library. Any consumer that needs a
// structured per-module view of the catalog should import from here, do NOT
// re-implement the queries inline — drift between consumers is what this layer exists
// to prevent.
//
// Two functions:
//   loadCatalogIndex()                  → CatalogIndex     (run once per emit pass)
//   loadModuleCatalog(moduleIds, index) → ModuleCatalog    (one or many module ids)
//
// loadModuleCatalog accepts an array of module ids so the same path serves single-
// module blueprints and multi-module aggregations (legacy starter-kit bundles). The
// returned scope is the union of the input modules' data_objects with the strongest
// held_as per data_object winning, matching generate_blueprints.ts's existing semantics.

export type Row = Record<string, unknown>;

// ---------- semantius helper ----------

export async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

// ---------- core catalog types ----------

export type DataObject = {
  id: number;
  data_object_name: string;
  singular_label: string;
  plural_label: string;
  description: string;
  // Short reader-facing summary (1-2 sentences) for the §2 Entity summary surface; distinct
  // from the analyst-facing `description`. Empty until authored; the emitter falls back to
  // `description` when this is blank. See SKILL.md "data_objects.catalog_description".
  catalog_description: string;
  kind: string;
  is_canonical_bare_word: boolean;
  has_personal_content: boolean;
  // B2 (plan-2-entity-type-tiers.md): drives the per-entity write tier (deriveWriteTier) and
  // the M5/M6 invariants. Enum: operational_workflow / operational_record / catalog / junction /
  // computed / unclassified. `unclassified` (the bulk of the catalog today) degrades gracefully.
  entity_type: string | null;
};

export type Domain = {
  id: number;
  domain_code: string;
  domain_name: string;
  description: string;
  // Nature of the row (plan: domain-kind taxonomy). 'bundle' = owns no masters,
  // embeds/consumes only; exempt from market-shape floors and the market-research
  // metadata fields (usa_market_size_usd_m / market_size_source_year / crud_percentage /
  // business_logic are N/A for a bundle, not zero). See domain-kind-taxonomy-plan.md.
  domain_kind: "established_market" | "emerging_market" | "bundle";
  catalog_release: string | null;
  catalog_tagline: string;
  catalog_description: string;
  crud_percentage: number;
  business_logic: string;
  min_org_size: string;
  cost_band: string;
  certification_required: boolean;
  usa_market_size_usd_m: number;
  market_size_source_year: number;
  // Lucide icon name that visually identifies the domain (e.g. shield, database, users).
  // Empty string when no icon clearly identifies the domain.
  icon_name: string;
};

export type IndustryRow = { id: number; industry_name: string };

export type ModuleRow = {
  id: number;
  domain_module_code: string;
  domain_module_name: string;
  domain_id: number | null;
  description: string;
  catalog_tagline: string;
  catalog_description: string;
  module_kind: "full" | "starter";
  specification_requirements: string;
};

export type CatalogIndex = {
  domains: Domain[];
  dataObjects: DataObject[];
  industries: IndustryRow[];
  modules: ModuleRow[];
  domainsById: Map<number, Domain>;
  domainsByCode: Map<string, Domain>;
  dataObjectsById: Map<number, DataObject>;
  industriesById: Map<number, IndustryRow>;
  modulesById: Map<number, ModuleRow>;
  modulesByCode: Map<string, ModuleRow>;
  usersId: number;
};

// ---------- module-scoped types ----------

export type ScopeRow = {
  data_object_id: number;
  held_as: string;
  is_install_optional: boolean;
  notes: string | null;
  data_object: DataObject;
  modules: ModuleRow[];
};

export type CoMasterRow = {
  data_object_id: number;
  owner_module: ModuleRow | null;
  owner_domain: Domain | null;
  held_as: string;
  is_install_optional: boolean;
  notes: string | null;
};

export type OwnerInfo = { modules: ModuleRow[]; domains: Domain[] };

export type RelationshipBuckets = {
  intra: any[];
  userRels: any[];
  cross: any[];
  all: any[];
};

export type ModuleCatalog = {
  modules: ModuleRow[];
  scopeRows: ScopeRow[];
  scopeHeldAsById: Map<number, string>;
  scopeInstallOptionalById: Map<number, boolean>;
  aliasRows: any[];
  relationships: RelationshipBuckets;
  coMasters: CoMasterRow[];
  owners: Map<number, OwnerInfo>;
  lifecycleRows: any[];
  outboundHandoffs: any[];
  inboundHandoffs: any[];
  relatedModuleIds: Set<number>;
  parentDomainIds: Set<number>;
  parentDomains: Domain[];
};

export const HELD_AS_ORDER = ["master", "embedded_master", "contributor", "consumer", "derived"] as const;
export const HELD_AS_RANK: Record<string, number> = Object.fromEntries(HELD_AS_ORDER.map((r, i) => [r, i]));

// ---------- release gate (shared across emitters) ----------
//
// A domain counts as "released" once domains.catalog_release carries a date. By DEFAULT any date
// qualifies, including a future-scheduled one — the "earmarked for the public catalog" sense the
// build_catalog command uses. Pass `asOf` (an ISO yyyy-mm-dd) to additionally require the release
// to have already happened (date on/before asOf): the "live on the public catalog as of that day"
// sense emit_domain_map uses by default. catalog_release may carry a full timestamp, so only the
// leading date prefix is compared. One definition, imported by every emitter, so the JSON
// snapshot, the blueprints, and the skills all scope to the same released set.
export function isDomainReleased(d: Pick<Domain, "catalog_release">, asOf?: string): boolean {
  const cr = (d.catalog_release ?? "").slice(0, 10);
  if (!cr) return false;
  return asOf ? cr <= asOf : true;
}

// ---------- catalog index loader ----------

export type RawCatalogIndex = {
  domains: Domain[];
  dataObjects: DataObject[];
  industries: IndustryRow[];
  modules: ModuleRow[];
};

// Pure in-memory: build the index Maps from raw arrays. Reused by loadCatalogIndex
// (fresh from PostgREST), the cache loader (deserialized from disk), and offline test fixtures.
export function buildCatalogIndex(raw: RawCatalogIndex): CatalogIndex {
  const users = raw.dataObjects.find((d) => d.kind === "platform_builtin" && d.data_object_name === "users");
  return {
    domains: raw.domains,
    dataObjects: raw.dataObjects,
    industries: raw.industries,
    modules: raw.modules,
    domainsById: new Map(raw.domains.map((d) => [d.id, d])),
    domainsByCode: new Map(raw.domains.map((d) => [d.domain_code, d])),
    dataObjectsById: new Map(raw.dataObjects.map((d) => [d.id, d])),
    industriesById: new Map(raw.industries.map((i) => [i.id, i])),
    modulesById: new Map(raw.modules.map((m) => [m.id, m])),
    modulesByCode: new Map(raw.modules.map((m) => [m.domain_module_code, m])),
    usersId: users?.id ?? -1,
  };
}

export async function loadCatalogIndex(): Promise<CatalogIndex> {
  const [domains, dataObjects, industries, modules] = await Promise.all([
    pg(
      "GET",
      "/domains?select=id,domain_code,domain_name,description,domain_kind,catalog_release,catalog_tagline,catalog_description,crud_percentage,business_logic,min_org_size,cost_band,certification_required,usa_market_size_usd_m,market_size_source_year,icon_name&order=domain_code.asc&limit=10000",
    ) as Promise<Domain[]>,
    pg(
      "GET",
      "/data_objects?select=id,data_object_name,singular_label,plural_label,description,catalog_description,kind,is_canonical_bare_word,has_personal_content,entity_type&limit=10000",
    ) as Promise<DataObject[]>,
    pg("GET", "/industries?select=id,industry_name&limit=10000") as Promise<IndustryRow[]>,
    pg(
      "GET",
      "/domain_modules?select=id,domain_module_code,domain_module_name,domain_id,description,catalog_tagline,catalog_description,module_kind,specification_requirements&order=domain_module_code.asc&limit=10000",
    ) as Promise<ModuleRow[]>,
  ]);

  return buildCatalogIndex({
    domains: domains ?? [],
    dataObjects: dataObjects ?? [],
    industries: industries ?? [],
    modules: modules ?? [],
  });
}

// ---------- bulk relationship loader ----------

export type AllRelationships = {
  dmdo: any[]; // domain_module_data_objects
  ddo: any[]; // domain_data_objects
  aliases: any[]; // data_object_aliases
  relationships: any[]; // data_object_relationships
  lifecycle: any[]; // data_object_lifecycle_states
  handoffs: any[]; // handoffs (with trigger_events + data_objects joined)
  hostDomains: any[]; // domain_module_host_domains
  personas: any[]; // personas (catalog personas, Plan 3)
  personaModules: any[]; // persona_modules (persona reach; persona_id -> personas)
  processRaci: any[]; // process_raci (responsibility, Plan 3)
  businessFunctions: any[]; // business_functions
  businessFunctionDomains: any[]; // business_function_domains (market RACI)
  processes: any[]; // business_processes
  handoffProcesses: any[]; // handoff_processes (process<->handoff junction, APQC tagging) with handoff endpoints embedded
  processTools: any[]; // process_tools (process<->tool coverage; consumed only for the "process used somewhere" set)
  triggerEvents: any[]; // trigger_events (the events an entity publishes; §9 Informed rows list them)

  // Pre-built indices keyed by id, populated by loadAllRelationships.
  dmdoByModuleId: Map<number, any[]>;
  dmdoByDataObjectId: Map<number, any[]>;
  ddoByDomainId: Map<number, any[]>;
  ddoByDataObjectId: Map<number, any[]>;
  aliasByDataObjectId: Map<number, any[]>;
  relationshipsTouchingDataObjectId: Map<number, any[]>;
  lifecycleByDataObjectId: Map<number, any[]>;
  handoffsByDataObjectId: Map<number, any[]>;
  personaModulesByModuleId: Map<number, any[]>;
  personaModulesByPersonaId: Map<number, any[]>;
  processRaciByProcessId: Map<number, any[]>;
  handoffProcessesByProcessId: Map<number, any[]>;
  businessFunctionDomainsByDomainId: Map<number, any[]>;
  personasById: Map<number, any>;
  businessFunctionsById: Map<number, any>;
  processesById: Map<number, any>;
  triggerEventsByDataObjectId: Map<number, any[]>;
};

export type RawRelationships = {
  dmdo: any[];
  ddo: any[];
  aliases: any[];
  relationships: any[];
  lifecycle: any[];
  handoffs: any[];
  hostDomains: any[];
  personas: any[];
  personaModules: any[];
  processRaci: any[];
  businessFunctions: any[];
  businessFunctionDomains: any[];
  processes: any[];
  handoffProcesses: any[];
  processTools: any[];
  triggerEvents?: any[]; // optional so a cache file written before the trigger_events load still parses
};

// Pure in-memory: build the Map indices from raw arrays. Reused by loadAllRelationships
// (fresh from PostgREST), loadCachedAllRelationships (deserialized from disk), and offline
// test fixtures.
export function buildRelationshipIndices(raw: RawRelationships): AllRelationships {
  // Deterministic lifecycle order. The `/data_object_lifecycle_states` query orders by
  // (data_object_id, state_order), but state_order is not guaranteed unique per entity (a data bug
  // the §7 M4 soft-assert flags, e.g. okr_objectives with two states at order 4). Tied rows then
  // shuffle between fetches, churning §7 and the §8/§9 lifecycle-derived tables. Sort here, the one
  // construction point feeding both the fresh-fetch and cache-read paths, with state_name as a
  // stable final tiebreaker so every consumer sees one canonical order regardless of DB/cache order.
  raw.lifecycle.sort((a: any, b: any) =>
    ((a.data_object_id ?? -1) - (b.data_object_id ?? -1)) ||
    ((a.state_order ?? -1) - (b.state_order ?? -1)) ||
    (String(a.state_name ?? "") < String(b.state_name ?? "") ? -1 : String(a.state_name ?? "") > String(b.state_name ?? "") ? 1 : 0),
  );
  // The dmdo, relationship, process_raci, persona_modules and business_processes queries carry no
  // `order=`, so PostgREST returns them in heap order, which can change between fetches. Sort them
  // here for the same reason as the lifecycle sort above.
  const byNum = (...keys: string[]) => (a: any, b: any): number => {
    for (const k of keys) {
      const d = (a[k] ?? -1) - (b[k] ?? -1);
      if (d) return d;
    }
    return 0;
  };
  raw.dmdo.sort((a: any, b: any) =>
    byNum("domain_module_id", "data_object_id")(a, b) ||
    (String(a.held_as ?? "") < String(b.held_as ?? "") ? -1 : String(a.held_as ?? "") > String(b.held_as ?? "") ? 1 : 0),
  );
  raw.relationships.sort(byNum("id", "data_object_id", "related_data_object_id"));
  (raw.processRaci ?? []).sort(byNum("id"));
  (raw.personaModules ?? []).sort(byNum("id"));
  (raw.processes ?? []).sort(byNum("id"));
  // trigger_events is fetched `order=id.asc`; sorted here too so the cache-read path and offline
  // fixtures see the same order as a fresh fetch.
  const triggerEvents = [...(raw.triggerEvents ?? [])].sort(byNum("id"));

  const groupBy = <T>(rows: T[], keyFn: (r: T) => number | null | undefined): Map<number, T[]> => {
    const out = new Map<number, T[]>();
    for (const r of rows ?? []) {
      const k = keyFn(r);
      if (k === null || k === undefined) continue;
      const list = out.get(k);
      if (list) list.push(r);
      else out.set(k, [r]);
    }
    return out;
  };

  const relationshipsTouchingDataObjectId = new Map<number, any[]>();
  for (const r of raw.relationships) {
    const a = r.data_object_id as number;
    const b = r.related_data_object_id as number;
    for (const key of [a, b]) {
      const list = relationshipsTouchingDataObjectId.get(key);
      if (list) list.push(r);
      else relationshipsTouchingDataObjectId.set(key, [r]);
    }
  }

  return {
    dmdo: raw.dmdo,
    ddo: raw.ddo,
    aliases: raw.aliases,
    relationships: raw.relationships,
    lifecycle: raw.lifecycle,
    handoffs: raw.handoffs,
    hostDomains: raw.hostDomains,
    personas: raw.personas ?? [],
    personaModules: raw.personaModules ?? [],
    processRaci: raw.processRaci ?? [],
    businessFunctions: raw.businessFunctions ?? [],
    businessFunctionDomains: raw.businessFunctionDomains ?? [],
    processes: raw.processes ?? [],
    handoffProcesses: raw.handoffProcesses ?? [],
    processTools: raw.processTools ?? [],
    triggerEvents,
    dmdoByModuleId: groupBy(raw.dmdo, (r: any) => r.domain_module_id),
    dmdoByDataObjectId: groupBy(raw.dmdo, (r: any) => r.data_object_id),
    ddoByDomainId: groupBy(raw.ddo, (r: any) => r.domain_id),
    ddoByDataObjectId: groupBy(raw.ddo, (r: any) => r.data_object_id),
    aliasByDataObjectId: groupBy(raw.aliases, (r: any) => r.data_object_id),
    relationshipsTouchingDataObjectId,
    lifecycleByDataObjectId: groupBy(raw.lifecycle, (r: any) => r.data_object_id),
    handoffsByDataObjectId: groupBy(raw.handoffs, (r: any) => r.data_object_id),
    personaModulesByModuleId: groupBy(raw.personaModules, (r: any) => r.domain_module_id),
    personaModulesByPersonaId: groupBy(raw.personaModules, (r: any) => r.persona_id),
    processRaciByProcessId: groupBy(raw.processRaci, (r: any) => r.process_id),
    handoffProcessesByProcessId: groupBy(raw.handoffProcesses, (r: any) => r.process_id),
    businessFunctionDomainsByDomainId: groupBy(raw.businessFunctionDomains, (r: any) => r.domain_id),
    personasById: new Map((raw.personas ?? []).map((r: any) => [r.id as number, r])),
    businessFunctionsById: new Map((raw.businessFunctions ?? []).map((r: any) => [r.id as number, r])),
    processesById: new Map((raw.processes ?? []).map((r: any) => [r.id as number, r])),
    triggerEventsByDataObjectId: groupBy(triggerEvents, (r: any) => r.data_object_id),
  };
}

// Derived replacement for the removed `domain_module_host_domains` table (see
// references/deprecations.md). That table only ever meaningfully carried the host set of STARTER
// modules, and that set is exactly the domains that canonically master the entities a starter
// embeds (`embedded_master`), minus the starter's own primary domain. FULL modules host nowhere:
// cross-domain reuse is modeled as separate per-domain modules, not one shared module. Returns
// rows shaped like the old table ({domain_module_id, domain_id}) so existing readers consume it
// unchanged.
export function deriveHostDomains(
  dmdo: { domain_module_id: number; data_object_id: number; held_as: string }[],
  modules: { id: number; domain_id: number | null; module_kind?: string }[],
): { domain_module_id: number; domain_id: number }[] {
  const primaryDomain = new Map<number, number>();
  const moduleKind = new Map<number, string | undefined>();
  for (const m of modules) {
    if (m.domain_id != null) primaryDomain.set(m.id, m.domain_id);
    moduleKind.set(m.id, m.module_kind);
  }
  // data_object_id -> domains that master it (a `master` DMDO row on a module with a primary domain).
  const masterDomainsByDO = new Map<number, Set<number>>();
  for (const r of dmdo) {
    if (r.held_as !== "master") continue;
    const dom = primaryDomain.get(r.domain_module_id);
    if (dom == null) continue;
    let s = masterDomainsByDO.get(r.data_object_id);
    if (!s) masterDomainsByDO.set(r.data_object_id, (s = new Set()));
    s.add(dom);
  }
  const hostsByModule = new Map<number, Set<number>>();
  for (const r of dmdo) {
    if (r.held_as !== "embedded_master") continue;
    if (moduleKind.get(r.domain_module_id) !== "starter") continue; // only starters host
    const owners = masterDomainsByDO.get(r.data_object_id);
    if (!owners) continue;
    const self = primaryDomain.get(r.domain_module_id);
    let s = hostsByModule.get(r.domain_module_id);
    if (!s) hostsByModule.set(r.domain_module_id, (s = new Set()));
    for (const d of owners) if (d !== self) s.add(d);
  }
  const rows: { domain_module_id: number; domain_id: number }[] = [];
  for (const [mid, doms] of hostsByModule) for (const d of doms) rows.push({ domain_module_id: mid, domain_id: d });
  return rows;
}

export async function loadAllRelationships(): Promise<AllRelationships> {
  const [dmdo, ddo, aliases, relationships, lifecycle, handoffs, modulesForHost, personas, personaModules, processRaci, businessFunctions, businessFunctionDomains, processes, handoffProcesses, processTools, triggerEvents] = await Promise.all([
    pg("GET", "/domain_module_data_objects?select=domain_module_id,data_object_id,held_as,is_install_optional,notes&limit=20000"),
    // domain_data_objects (the legacy domain-grain rollup) is RETIRED: masters derive from
    // domain_module_data_objects. The source is kept empty (not a GET) so the entity can be
    // deleted without this read 404-ing; all.ddo is [] everywhere downstream and the
    // un-modularized fallback below is a no-op. Full backup in backups/. See skill-changelog
    // 2026-06-02 "<masters> audit definition reads the module junction".
    Promise.resolve([] as any[]),
    pg("GET", "/data_object_aliases?select=data_object_id,alias_name,alias_type,is_preferred,industry_id,solution_id,notes&order=alias_name.asc&limit=20000"),
    pg("GET", "/data_object_relationships?select=id,data_object_id,related_data_object_id,relationship_type,relationship_kind,relationship_verb,inverse_verb,is_required,owner_side,persona_id,notes&limit=20000"),
    pg("GET", "/data_object_lifecycle_states?select=id,data_object_id,state_name,state_order,description,is_initial,is_terminal,requires_permission,is_high_risk,permission_verb_override,domain_module_id,process_id&order=data_object_id.asc,state_order.asc&limit=20000"),
    pg("GET", "/handoffs?select=id,trigger_event_id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,integration_pattern,friction_level,description,notes,data_objects(data_object_name),trigger_events(event_name,description,from_state,to_state,event_category)&order=target_domain_id.asc&limit=20000"),
    // hostDomains is DERIVED, not stored (the `domain_module_host_domains` table was dropped).
    // Fetch the modules needed to derive it (id + primary domain + kind); deriveHostDomains() below
    // turns this plus dmdo into the same {domain_module_id, domain_id} shape every reader expects.
    pg("GET", "/domain_modules?select=id,domain_id,module_kind&limit=20000"),
    // Plan 3 persona / RACI / function loads (B0).
    pg("GET", "/personas?select=id,persona_code,persona_name,description,business_function_id,record_status&limit=20000"),
    pg("GET", "/persona_modules?select=id,persona_id,domain_module_id,interaction_level,notes&limit=20000"),
    pg("GET", "/process_raci?select=id,process_id,persona_id,skill_id,raci,consultation_blocking&limit=20000"),
    pg("GET", "/business_functions?select=id,business_function_name,description,record_status,parent_business_function_id&limit=10000"),
    pg("GET", "/business_function_domains?select=business_function_id,domain_id,responsibility_type&limit=20000"),
    pg("GET", "/business_processes?select=id,process_name,process_key,process_code,description,external_id,hierarchy_level,source_framework&limit=20000"),
    // handoff_processes is the dominant process-attribution relationship: which APQC/custom process implements
    // each cross-domain handoff. Embed the handoff's domain + module endpoints so consumers can attribute
    // the process to a domain/module without a second join. domain endpoints are always set; module
    // endpoints can be NULL (domain-grain handoff), so domain-grain attribution is the more complete one.
    pg("GET", "/handoff_processes?select=handoff_id,process_id,role,proposal_source,record_status,handoff:handoffs(source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id)&limit=20000"),
    // process_tools contributes only to the "process used somewhere" set (small today); process_id suffices.
    pg("GET", "/process_tools?select=process_id&limit=20000"),
    // trigger_events: the events each entity publishes. The blueprint's §9 Informed rows list the
    // events on their process's wired transitions (blueprint_derive.ts deriveRaciRealization).
    pg("GET", "/trigger_events?select=id,event_name,data_object_id,domain_module_id,event_category,from_state,to_state&order=id.asc&limit=20000"),
  ]);

  return buildRelationshipIndices({
    dmdo: dmdo ?? [],
    ddo: ddo ?? [],
    aliases: aliases ?? [],
    relationships: relationships ?? [],
    lifecycle: lifecycle ?? [],
    handoffs: handoffs ?? [],
    hostDomains: deriveHostDomains(dmdo ?? [], modulesForHost ?? []),
    personas: personas ?? [],
    personaModules: personaModules ?? [],
    processRaci: processRaci ?? [],
    businessFunctions: businessFunctions ?? [],
    businessFunctionDomains: businessFunctionDomains ?? [],
    processes: processes ?? [],
    handoffProcesses: handoffProcesses ?? [],
    processTools: processTools ?? [],
    triggerEvents: triggerEvents ?? [],
  });
}

// ---------- file cache ----------

// Default cache file lives under .cache/. Visible in the IDE for inspection; easy to `rm`
// for forced refresh.
export const DEFAULT_CATALOG_CACHE_FILE = "c:/dev/domain-map/.cache/.catalog-cache.json";
export const DEFAULT_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type CacheOptions = {
  cacheFile?: string;
  ttlMs?: number;
  // When true, ignore an existing cache file even if fresh; always refetch + rewrite.
  forceRefresh?: boolean;
};

type CacheFilePayload = {
  _meta: {
    generated_at: string;
    ttl_ms: number;
    row_counts: Record<string, number>;
  };
  index: RawCatalogIndex;
  raw: RawRelationships;
};

export function writeCatalogCache(
  index: CatalogIndex,
  all: AllRelationships,
  opts: { cacheFile?: string; ttlMs?: number } = {},
): void {
  const cacheFile = opts.cacheFile ?? DEFAULT_CATALOG_CACHE_FILE;
  const ttlMs = opts.ttlMs ?? DEFAULT_CATALOG_CACHE_TTL_MS;
  const { mkdirSync, writeFileSync } = require("node:fs") as typeof import("node:fs");
  const { dirname } = require("node:path") as typeof import("node:path");
  mkdirSync(dirname(cacheFile), { recursive: true });
  const payload: CacheFilePayload = {
    _meta: {
      generated_at: new Date().toISOString(),
      ttl_ms: ttlMs,
      row_counts: {
        domains: index.domains.length,
        dataObjects: index.dataObjects.length,
        industries: index.industries.length,
        modules: index.modules.length,
        dmdo: all.dmdo.length,
        ddo: all.ddo.length,
        aliases: all.aliases.length,
        relationships: all.relationships.length,
        lifecycle: all.lifecycle.length,
        handoffs: all.handoffs.length,
        hostDomains: all.hostDomains.length,
        personas: all.personas.length,
        personaModules: all.personaModules.length,
        processRaci: all.processRaci.length,
        businessFunctions: all.businessFunctions.length,
        businessFunctionDomains: all.businessFunctionDomains.length,
        processes: all.processes.length,
        handoffProcesses: all.handoffProcesses.length,
        processTools: all.processTools.length,
        triggerEvents: all.triggerEvents.length,
      },
    },
    index: {
      domains: index.domains,
      dataObjects: index.dataObjects,
      industries: index.industries,
      modules: index.modules,
    },
    raw: {
      dmdo: all.dmdo,
      ddo: all.ddo,
      aliases: all.aliases,
      relationships: all.relationships,
      lifecycle: all.lifecycle,
      handoffs: all.handoffs,
      hostDomains: all.hostDomains,
      personas: all.personas,
      personaModules: all.personaModules,
      processRaci: all.processRaci,
      businessFunctions: all.businessFunctions,
      businessFunctionDomains: all.businessFunctionDomains,
      processes: all.processes,
      handoffProcesses: all.handoffProcesses,
      processTools: all.processTools,
      triggerEvents: all.triggerEvents,
    },
  };
  writeFileSync(cacheFile, JSON.stringify(payload), "utf8");
}

export function clearCatalogCache(cacheFile: string = DEFAULT_CATALOG_CACHE_FILE): boolean {
  const { existsSync, unlinkSync } = require("node:fs") as typeof import("node:fs");
  if (!existsSync(cacheFile)) return false;
  unlinkSync(cacheFile);
  return true;
}

// Try the cache first, fall back to fresh fetches + cache write. Returns BOTH the
// catalog index and the bulk relationships in one call, so a consumer that needs both
// (every emit script today) makes a single cache read instead of two server hits.
// Logs hit/miss + row counts to stderr so callers can audit cache behavior without
// parsing the JSON file.
export async function loadCachedCatalog(
  opts: CacheOptions = {},
): Promise<{ index: CatalogIndex; all: AllRelationships }> {
  const cacheFile = opts.cacheFile ?? DEFAULT_CATALOG_CACHE_FILE;
  const ttlMs = opts.ttlMs ?? DEFAULT_CATALOG_CACHE_TTL_MS;
  const { existsSync, readFileSync } = require("node:fs") as typeof import("node:fs");

  if (!opts.forceRefresh && existsSync(cacheFile)) {
    try {
      const text = readFileSync(cacheFile, "utf8");
      const parsed: CacheFilePayload = JSON.parse(text);
      // Cache file might predate the index extension or the trigger_events load: require the
      // index and raw sections and raw.triggerEvents to consider it valid. Otherwise fall through
      // to a fresh fetch (an old cache would otherwise read as "no events" for its whole TTL).
      // A cache from before is_install_optional would read every entity as always installed.
      if (parsed.index && parsed.raw && Array.isArray(parsed.raw.triggerEvents) && parsed.raw.dmdo?.[0]?.is_install_optional !== undefined) {
        const generatedAt = new Date(parsed._meta.generated_at).getTime();
        const ageMs = Date.now() - generatedAt;
        if (ageMs < ttlMs) {
          const rc = parsed._meta.row_counts;
          console.error(
            `catalog cache hit (age ${Math.round(ageMs / 1000)}s of ${Math.round(ttlMs / 1000)}s ttl; domains=${rc.domains ?? "?"} modules=${rc.modules ?? "?"} dmdo=${rc.dmdo} rel=${rc.relationships} lifecycle=${rc.lifecycle} handoffs=${rc.handoffs})`,
          );
          const index = buildCatalogIndex(parsed.index);
          const all = buildRelationshipIndices(parsed.raw);
          return { index, all };
        }
        console.error(
          `catalog cache stale (age ${Math.round(ageMs / 1000)}s > ttl ${Math.round(ttlMs / 1000)}s), refreshing from server`,
        );
      } else {
        console.error("catalog cache file predates the current cache shape, refreshing from server");
      }
    } catch (e) {
      console.error(`catalog cache unreadable (${(e as Error).message}), refreshing from server`);
    }
  } else if (opts.forceRefresh) {
    console.error("catalog cache: forced refresh, fetching from server");
  } else {
    console.error("catalog cache: no cache file, fetching from server");
  }

  // Cold path: fetch both in parallel, write to cache, return.
  const [index, all] = await Promise.all([loadCatalogIndex(), loadAllRelationships()]);
  writeCatalogCache(index, all, { cacheFile, ttlMs });
  console.error(`catalog cache written to ${cacheFile}`);
  return { index, all };
}

// ---------- module-catalog loader (pure in-memory derivation) ----------

export function loadModuleCatalog(
  moduleIds: number[],
  index: CatalogIndex,
  all: AllRelationships,
): ModuleCatalog {
  if (moduleIds.length === 0) throw new Error("loadModuleCatalog requires at least one module id");
  const moduleIdSet = new Set(moduleIds);
  const modules: ModuleRow[] = moduleIds
    .map((id) => index.modulesById.get(id))
    .filter((m): m is ModuleRow => Boolean(m));
  if (modules.length === 0) throw new Error("loadModuleCatalog: no resolvable modules in moduleIds");
  const parentDomainIds = new Set(modules.map((m) => m.domain_id).filter((id): id is number => id !== null));
  const parentDomains = [...parentDomainIds]
    .map((id) => index.domainsById.get(id))
    .filter((d): d is Domain => Boolean(d));

  // Aggregate scope across modules: strongest held_as per data_object, plus which modules
  // contributed and the per-module notes joined together.
  const byDOId = new Map<number, { held_as: string; is_install_optional: boolean; modules: ModuleRow[]; notes: string[] }>();
  for (const mid of moduleIds) {
    const rows = all.dmdoByModuleId.get(mid) ?? [];
    for (const r of rows) {
      const m = index.modulesById.get(r.domain_module_id as number);
      if (!m) continue;
      const did = r.data_object_id as number;
      const existing = byDOId.get(did);
      if (!existing) {
        byDOId.set(did, {
          held_as: r.held_as,
          is_install_optional: Boolean(r.is_install_optional),
          modules: [m],
          notes: r.notes ? [r.notes] : [],
        });
      } else {
        if ((HELD_AS_RANK[r.held_as] ?? 99) < (HELD_AS_RANK[existing.held_as] ?? 99)) {
          existing.held_as = r.held_as;
          existing.is_install_optional = Boolean(r.is_install_optional);
        }
        if (!existing.modules.includes(m)) existing.modules.push(m);
        if (r.notes) existing.notes.push(r.notes);
      }
    }
  }
  const scopeRows: ScopeRow[] = [...byDOId.entries()]
    .map(([did, info]) => {
      const obj = index.dataObjectsById.get(did);
      if (!obj) return null;
      return {
        data_object_id: did,
        held_as: info.held_as,
        is_install_optional: info.is_install_optional,
        notes: info.notes.join("; ") || null,
        data_object: obj,
        modules: info.modules,
      } satisfies ScopeRow;
    })
    .filter((r): r is ScopeRow => r !== null);
  const scopeObjectIds = scopeRows.map((r) => r.data_object_id);
  const scopeObjectIdSet = new Set(scopeObjectIds);
  const scopeHeldAsById = new Map<number, string>(scopeRows.map((r) => [r.data_object_id, r.held_as]));
  const scopeInstallOptionalById = new Map<number, boolean>(scopeRows.map((r) => [r.data_object_id, r.is_install_optional]));
  const masterIds = new Set(scopeRows.filter((r) => r.held_as === "master").map((r) => r.data_object_id));

  // Per-section derivation iterates the bulk arrays directly (not the per-scope index
  // maps) so row order matches PostgREST's natural insertion order — what the original
  // per-scope queries returned. This keeps the markdown blueprint byte-identical with
  // the pre-refactor output. Filtering by scope membership is O(n) over each bulk array
  // (a few thousand rows max); the index maps stay available for callers that want
  // per-id lookup.

  // ---- aliases ----
  const aliasRows = all.aliases.filter((a: any) => scopeObjectIdSet.has(a.data_object_id as number));

  // ---- relationships split into intra / users / cross ----
  // Original PostgREST query was `?or=(data_object_id.in.(scope),related_data_object_id.in.(scope))`,
  // returning a single deduped result set. In-memory equivalent: scan the bulk array
  // once, keep rows where either endpoint is in scope.
  const relAll: any[] = [];
  const relIntra: any[] = [];
  const relUsers: any[] = [];
  const relCross: any[] = [];
  for (const r of all.relationships) {
    const a = r.data_object_id as number;
    const b = r.related_data_object_id as number;
    if (!scopeObjectIdSet.has(a) && !scopeObjectIdSet.has(b)) continue;
    const aUser = a === index.usersId;
    const bUser = b === index.usersId;
    if (aUser || bUser) {
      const otherId = aUser ? b : a;
      if (otherId === index.usersId) continue;
      if (!scopeObjectIdSet.has(otherId)) continue;
      relAll.push(r);
      relUsers.push(r);
    } else {
      relAll.push(r);
      if (scopeObjectIdSet.has(a) && scopeObjectIdSet.has(b)) {
        relIntra.push(r);
      } else if (scopeObjectIdSet.has(a) !== scopeObjectIdSet.has(b)) {
        relCross.push(r);
      }
    }
  }
  const relationships: RelationshipBuckets = {
    intra: relIntra,
    userRels: relUsers,
    cross: relCross,
    all: relAll,
  };

  // ---- coMasters: other modules / domains with any held_as on this scope's masters ----
  // Walk bulk arrays in insertion order. Dedup on (module_id, data_object_id) for the
  // module path so a co-master that appears in both a full module row and a
  // legacy domain-level row is only listed once.
  const coMasters: CoMasterRow[] = [];
  const seenCoMasterModuleKey = new Set<string>();
  for (const r of all.dmdo) {
    const did = r.data_object_id as number;
    if (!masterIds.has(did)) continue;
    const modId = r.domain_module_id as number;
    if (moduleIdSet.has(modId)) continue;
    const m = index.modulesById.get(modId);
    if (!m) continue;
    const key = `${modId}:${did}`;
    if (seenCoMasterModuleKey.has(key)) continue;
    seenCoMasterModuleKey.add(key);
    coMasters.push({
      data_object_id: did,
      owner_module: m,
      owner_domain: m.domain_id !== null ? index.domainsById.get(m.domain_id) ?? null : null,
      held_as: r.held_as as string,
      is_install_optional: Boolean(r.is_install_optional),
      notes: (r.notes as string | null) ?? null,
    });
  }
  // Domain-granularity fallback: domains holding these masters but no modules.
  // Pre-compute which domains have any module so the check is O(1) per row.
  const domainsWithAnyModule = new Set<number>();
  for (const m of index.modules) {
    if (m.domain_id !== null) domainsWithAnyModule.add(m.domain_id);
  }
  for (const r of all.ddo) {
    const did = r.data_object_id as number;
    if (!masterIds.has(did)) continue;
    const domId = r.domain_id as number;
    if (domainsWithAnyModule.has(domId)) continue;
    const d = index.domainsById.get(domId);
    if (!d) continue;
    coMasters.push({
      data_object_id: did,
      owner_module: null,
      owner_domain: d,
      held_as: r.held_as as string,
      is_install_optional: Boolean(r.is_install_optional),
      notes: (r.notes as string | null) ?? null,
    });
  }

  // ---- owners: canonical module / domain that masters each non-master in scope ----
  const nonMasterIdSet = new Set(scopeRows.filter((r) => r.held_as !== "master").map((r) => r.data_object_id));
  const owners = new Map<number, OwnerInfo>();
  for (const r of all.dmdo) {
    if (r.held_as !== "master") continue;
    const did = r.data_object_id as number;
    if (!nonMasterIdSet.has(did)) continue;
    const m = index.modulesById.get(r.domain_module_id as number);
    if (!m) continue;
    if (!owners.has(did)) owners.set(did, { modules: [], domains: [] });
    const info = owners.get(did)!;
    if (!info.modules.includes(m)) info.modules.push(m);
  }
  for (const r of all.ddo) {
    if (r.held_as !== "master") continue;
    const did = r.data_object_id as number;
    if (!nonMasterIdSet.has(did)) continue;
    const d = index.domainsById.get(r.domain_id as number);
    if (!d) continue;
    if (!owners.has(did)) owners.set(did, { modules: [], domains: [] });
    const info = owners.get(did)!;
    const alreadyViaModule = info.modules.some((m) => m.domain_id === d.id);
    if (!alreadyViaModule && !info.domains.some((x) => x.id === d.id)) {
      info.domains.push(d);
    }
  }

  // ---- lifecycle states for each scope data_object ----
  const lifecycleRows = all.lifecycle.filter((ls: any) => scopeObjectIdSet.has(ls.data_object_id as number));

  // ---- handoffs ----
  const handoffRows = all.handoffs.filter((h: any) => scopeObjectIdSet.has(h.data_object_id as number));

  // Handoff attribution. A unit surfaces a handoff when the handoff CROSSES its boundary. Plan 4:
  // the unit "plays" its own modules PLUS the canonical owner modules of every entity it carries as
  // `embedded_master` (it stands in for them when deployed standalone, the same self-containment
  // principle as the re-prefixed gates). Without this an embedded entity's module-level handoffs
  // (whose endpoints are the canonical modules, not this unit) silently vanished.
  const playedModuleIds = new Set<number>(moduleIdSet);
  for (const r of scopeRows) {
    if (r.held_as !== "embedded_master") continue;
    for (const m of owners.get(r.data_object_id as number)?.modules ?? []) playedModuleIds.add(m.id);
  }
  const outboundHandoffs: any[] = [];
  const inboundHandoffs: any[] = [];
  for (const h of handoffRows ?? []) {
    const payloadId = h.data_object_id as number;
    const scopeHeldAs = scopeHeldAsById.get(payloadId);
    const srcMod = h.source_domain_module_id as number | null;
    const tgtMod = h.target_domain_module_id as number | null;
    const srcModuleInScope = srcMod !== null && moduleIdSet.has(srcMod);
    const tgtModuleInScope = tgtMod !== null && moduleIdSet.has(tgtMod);
    const srcDomainInScope = parentDomainIds.has(h.source_domain_id as number);
    const tgtDomainInScope = parentDomainIds.has(h.target_domain_id as number);
    const payloadMasteredHere = scopeHeldAs === "master";
    const payloadHeldNonMaster = scopeHeldAs !== undefined && scopeHeldAs !== "master";
    if (srcModuleInScope || (srcDomainInScope && srcMod === null && payloadMasteredHere)) {
      outboundHandoffs.push(h);
    } else if (
      tgtModuleInScope ||
      (tgtDomainInScope && tgtMod === null && payloadHeldNonMaster)
    ) {
      inboundHandoffs.push(h);
    } else if (scopeHeldAs === "embedded_master") {
      // The payload is carried here as an embedded shell but neither endpoint module is one of our
      // OWN modules. Stand in for the payload's canonical owner: outbound if we own the source side
      // and the target is outside what we play, inbound if we own the target side and the source is
      // outside. A handoff whose counterparty we ALSO play is internal to the embedded set -> hidden.
      const ownerIds = (owners.get(payloadId)?.modules ?? []).map((m) => m.id);
      const ownsSrc = srcMod !== null && ownerIds.includes(srcMod);
      const ownsTgt = tgtMod !== null && ownerIds.includes(tgtMod);
      const srcPlayed = srcMod !== null && playedModuleIds.has(srcMod);
      const tgtPlayed = tgtMod !== null && playedModuleIds.has(tgtMod);
      if (ownsSrc && !tgtPlayed) {
        outboundHandoffs.push(h);
      } else if (ownsTgt && !srcPlayed) {
        inboundHandoffs.push(h);
      }
    }
  }
  // Deterministic emit order. The `/handoffs` query orders by `target_domain_id` only, so rows
  // sharing a target domain come back in arbitrary DB order and §6 reshuffled on every fresh-cache
  // regen (spurious `--check` drift, noisy diffs). Impose a stable total order here, in the shared
  // loader, so cached and live loads render identically. Compare on the same fields §6 renders:
  // domain/module endpoints, then the joined trigger event + transition, then payload, pattern,
  // friction, description. Code-point string compare (not localeCompare) keeps it locale-independent.
  const sc = (x: string, y: string): number => (x < y ? -1 : x > y ? 1 : 0);
  const handoffCmp = (a: any, b: any): number => {
    const ta = a.trigger_events || {};
    const tb = b.trigger_events || {};
    return (
      (a.target_domain_id ?? -1) - (b.target_domain_id ?? -1) ||
      (a.source_domain_id ?? -1) - (b.source_domain_id ?? -1) ||
      (a.source_domain_module_id ?? -1) - (b.source_domain_module_id ?? -1) ||
      (a.target_domain_module_id ?? -1) - (b.target_domain_module_id ?? -1) ||
      sc(String(ta.event_name ?? ""), String(tb.event_name ?? "")) ||
      sc(String(ta.from_state ?? ""), String(tb.from_state ?? "")) ||
      sc(String(ta.to_state ?? ""), String(tb.to_state ?? "")) ||
      sc(String(ta.event_category ?? ""), String(tb.event_category ?? "")) ||
      (a.data_object_id ?? -1) - (b.data_object_id ?? -1) ||
      sc(String(a.integration_pattern ?? ""), String(b.integration_pattern ?? "")) ||
      sc(String(a.friction_level ?? ""), String(b.friction_level ?? "")) ||
      sc(String(a.description ?? ""), String(b.description ?? ""))
    );
  };
  outboundHandoffs.sort(handoffCmp);
  inboundHandoffs.sort(handoffCmp);

  // Related modules: union of data-coupling sources + handoffs + persona reach, deduped,
  // with self removed. NOTE these are RELATED (navigation / integration hints), NOT
  // requirements: a module is self-contained (it embedded_masters or optionally consumes
  // what it touches), so "related" never implies "must co-deploy".
  const relatedModuleIds = new Set<number>();
  for (const info of owners.values()) {
    for (const m of info.modules) {
      if (!moduleIdSet.has(m.id)) relatedModuleIds.add(m.id);
    }
  }
  for (const c of coMasters) {
    if (c.owner_module && !moduleIdSet.has(c.owner_module.id)) {
      relatedModuleIds.add(c.owner_module.id);
    }
  }
  for (const h of inboundHandoffs) {
    const srcId = h.source_domain_module_id as number | null;
    if (srcId !== null && !moduleIdSet.has(srcId)) relatedModuleIds.add(srcId);
  }
  for (const h of outboundHandoffs) {
    const tgtId = h.target_domain_module_id as number | null;
    if (tgtId !== null && !moduleIdSet.has(tgtId)) relatedModuleIds.add(tgtId);
  }
  // Persona reach (Plan 3): modules that share >=1 persona with this scope via persona_modules.
  // A persona whose workspace spans modules makes them related (same job-shaped workflow).
  {
    const personaIds = new Set<number>();
    for (const mid of moduleIds) {
      for (const rm of all.personaModulesByModuleId.get(mid) ?? []) personaIds.add(rm.persona_id as number);
    }
    for (const pid of personaIds) {
      for (const rm of all.personaModulesByPersonaId.get(pid) ?? []) {
        const mid = rm.domain_module_id as number;
        if (!moduleIdSet.has(mid)) relatedModuleIds.add(mid);
      }
    }
  }

  return {
    modules,
    scopeRows,
    scopeHeldAsById,
    scopeInstallOptionalById,
    aliasRows,
    relationships,
    coMasters,
    owners,
    lifecycleRows: lifecycleRows ?? [],
    outboundHandoffs,
    inboundHandoffs,
    relatedModuleIds,
    parentDomainIds,
    parentDomains,
  };
}
