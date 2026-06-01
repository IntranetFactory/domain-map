// scripts/lib/catalog.ts
//
// Single source of truth for "what data does Semantius hold about a given module."
// Both emit_fact_sheet.ts (markdown blueprint emitter) and emit_domain_map.ts (JSON
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
// module fact sheets and multi-module aggregations (legacy starter-kit bundles). The
// returned scope is the union of the input modules' data_objects with the strongest
// role per data_object winning, matching emit_fact_sheet.ts's existing semantics.

export type Row = Record<string, unknown>;

// ---------- semantius helper ----------

export async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
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
  kind: string;
  is_canonical_bare_word: boolean;
  has_personal_content: boolean;
  has_submit_lock: boolean;
  has_single_approver: boolean;
};

export type Domain = {
  id: number;
  domain_code: string;
  domain_name: string;
  description: string;
  catalog: boolean;
  catalog_tagline: string;
  catalog_description: string;
  crud_percentage: number;
  business_logic: string;
  min_org_size: string;
  cost_band: string;
  certification_required: boolean;
  usa_market_size_usd_m: number;
  market_size_source_year: number;
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
  catalog: boolean;
  module_kind: "full" | "starter";
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
  role: string;
  necessity: string | null;
  notes: string | null;
  data_object: DataObject;
  modules: ModuleRow[];
};

export type CoMasterRow = {
  data_object_id: number;
  owner_module: ModuleRow | null;
  owner_domain: Domain | null;
  role: string;
  necessity: string | null;
  notes: string | null;
};

export type OwnerInfo = { modules: ModuleRow[]; domains: Domain[] };

export type RelationshipBuckets = {
  intra: any[];
  userRels: any[];
  cross: any[];
  crossOutbound: any[];
  crossContext: any[];
  all: any[];
};

export type ModuleCatalog = {
  modules: ModuleRow[];
  scopeRows: ScopeRow[];
  scopeRolesById: Map<number, string>;
  scopeNecessityById: Map<number, string | null>;
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

export const ROLE_ORDER = ["master", "embedded_master", "contributor", "consumer", "derived"] as const;
export const ROLE_RANK: Record<string, number> = Object.fromEntries(ROLE_ORDER.map((r, i) => [r, i]));

// ---------- catalog index loader ----------

export type RawCatalogIndex = {
  domains: Domain[];
  dataObjects: DataObject[];
  industries: IndustryRow[];
  modules: ModuleRow[];
};

// Pure in-memory: build the index Maps from raw arrays. Reused by loadCatalogIndex
// (fresh from PostgREST) and the cache loader (deserialized from disk).
function buildCatalogIndex(raw: RawCatalogIndex): CatalogIndex {
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
      "/domains?select=id,domain_code,domain_name,description,catalog,catalog_tagline,catalog_description,crud_percentage,business_logic,min_org_size,cost_band,certification_required,usa_market_size_usd_m,market_size_source_year&order=domain_code.asc&limit=10000",
    ) as Promise<Domain[]>,
    pg(
      "GET",
      "/data_objects?select=id,data_object_name,singular_label,plural_label,description,kind,is_canonical_bare_word,has_personal_content,has_submit_lock,has_single_approver&limit=10000",
    ) as Promise<DataObject[]>,
    pg("GET", "/industries?select=id,industry_name&limit=10000") as Promise<IndustryRow[]>,
    pg(
      "GET",
      "/domain_modules?select=id,domain_module_code,domain_module_name,domain_id,description,catalog_tagline,catalog_description,catalog,module_kind&order=domain_module_code.asc&limit=10000",
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

  // Pre-built indices keyed by id, populated by loadAllRelationships.
  dmdoByModuleId: Map<number, any[]>;
  dmdoByDataObjectId: Map<number, any[]>;
  ddoByDomainId: Map<number, any[]>;
  ddoByDataObjectId: Map<number, any[]>;
  aliasByDataObjectId: Map<number, any[]>;
  relationshipsTouchingDataObjectId: Map<number, any[]>;
  lifecycleByDataObjectId: Map<number, any[]>;
  handoffsByDataObjectId: Map<number, any[]>;
};

type RawRelationships = {
  dmdo: any[];
  ddo: any[];
  aliases: any[];
  relationships: any[];
  lifecycle: any[];
  handoffs: any[];
  hostDomains: any[];
};

// Pure in-memory: build the Map indices from raw arrays. Reused by loadAllRelationships
// (fresh from PostgREST) and loadCachedAllRelationships (deserialized from disk).
function buildRelationshipIndices(raw: RawRelationships): AllRelationships {
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
    dmdoByModuleId: groupBy(raw.dmdo, (r: any) => r.domain_module_id),
    dmdoByDataObjectId: groupBy(raw.dmdo, (r: any) => r.data_object_id),
    ddoByDomainId: groupBy(raw.ddo, (r: any) => r.domain_id),
    ddoByDataObjectId: groupBy(raw.ddo, (r: any) => r.data_object_id),
    aliasByDataObjectId: groupBy(raw.aliases, (r: any) => r.data_object_id),
    relationshipsTouchingDataObjectId,
    lifecycleByDataObjectId: groupBy(raw.lifecycle, (r: any) => r.data_object_id),
    handoffsByDataObjectId: groupBy(raw.handoffs, (r: any) => r.data_object_id),
  };
}

export async function loadAllRelationships(): Promise<AllRelationships> {
  const [dmdo, ddo, aliases, relationships, lifecycle, handoffs, hostDomains] = await Promise.all([
    pg("GET", "/domain_module_data_objects?select=domain_module_id,data_object_id,role,necessity,notes&limit=20000"),
    pg("GET", "/domain_data_objects?select=domain_id,data_object_id,role,necessity,notes&limit=20000"),
    pg("GET", "/data_object_aliases?select=data_object_id,alias_name,alias_type,is_preferred,industry_id,solution_id,notes&order=alias_name.asc&limit=20000"),
    pg("GET", "/data_object_relationships?select=data_object_id,related_data_object_id,relationship_type,relationship_kind,relationship_verb,inverse_verb,is_required,owner_side,notes&limit=20000"),
    pg("GET", "/data_object_lifecycle_states?select=data_object_id,state_name,state_order,description,is_initial,is_terminal,requires_permission,permission_verb_override,domain_module_id&order=data_object_id.asc,state_order.asc&limit=20000"),
    pg("GET", "/handoffs?select=source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,integration_pattern,friction_level,description,notes,data_objects(data_object_name),trigger_events(event_name,description,from_state,to_state,event_category)&order=target_domain_id.asc&limit=20000"),
    pg("GET", "/domain_module_host_domains?select=domain_module_id,domain_id&limit=10000"),
  ]);

  return buildRelationshipIndices({
    dmdo: dmdo ?? [],
    ddo: ddo ?? [],
    aliases: aliases ?? [],
    relationships: relationships ?? [],
    lifecycle: lifecycle ?? [],
    handoffs: handoffs ?? [],
    hostDomains: hostDomains ?? [],
  });
}

// ---------- file cache ----------

// Default cache file lives under .tmp_deploy/ which is gitignored. Visible in the IDE
// for inspection; easy to `rm` for forced refresh.
export const DEFAULT_CATALOG_CACHE_FILE = "c:/dev/domain-map/.tmp_deploy/.catalog-cache.json";
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
      // Cache file might predate the index extension — require both index and raw
      // sections to consider it valid. Otherwise fall through to fresh fetch.
      if (parsed.index && parsed.raw) {
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
        console.error("catalog cache file predates index extension, refreshing from server");
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

  // Aggregate scope across modules: strongest role per data_object, plus which modules
  // contributed and the per-module notes joined together.
  const byDOId = new Map<number, { role: string; necessity: string | null; modules: ModuleRow[]; notes: string[] }>();
  for (const mid of moduleIds) {
    const rows = all.dmdoByModuleId.get(mid) ?? [];
    for (const r of rows) {
      const m = index.modulesById.get(r.domain_module_id as number);
      if (!m) continue;
      const did = r.data_object_id as number;
      const existing = byDOId.get(did);
      if (!existing) {
        byDOId.set(did, {
          role: r.role,
          necessity: (r.necessity as string | null) ?? null,
          modules: [m],
          notes: r.notes ? [r.notes] : [],
        });
      } else {
        if ((ROLE_RANK[r.role] ?? 99) < (ROLE_RANK[existing.role] ?? 99)) {
          existing.role = r.role;
          existing.necessity = (r.necessity as string | null) ?? existing.necessity;
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
        role: info.role,
        necessity: info.necessity,
        notes: info.notes.join("; ") || null,
        data_object: obj,
        modules: info.modules,
      } satisfies ScopeRow;
    })
    .filter((r): r is ScopeRow => r !== null);
  const scopeObjectIds = scopeRows.map((r) => r.data_object_id);
  const scopeObjectIdSet = new Set(scopeObjectIds);
  const scopeRolesById = new Map<number, string>(scopeRows.map((r) => [r.data_object_id, r.role]));
  const scopeNecessityById = new Map<number, string | null>(scopeRows.map((r) => [r.data_object_id, r.necessity]));
  const masterIds = new Set(scopeRows.filter((r) => r.role === "master").map((r) => r.data_object_id));

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
  const relCrossOutbound: any[] = [];
  const relCrossContext: any[] = [];
  const DRIVING_ROLES = new Set(["master", "contributor"]);
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
        const inScopeId = scopeObjectIdSet.has(a) ? a : b;
        const inScopeRole = scopeRolesById.get(inScopeId) || "";
        if (DRIVING_ROLES.has(inScopeRole)) {
          relCrossOutbound.push(r);
        } else {
          relCrossContext.push(r);
        }
      }
    }
  }
  const relationships: RelationshipBuckets = {
    intra: relIntra,
    userRels: relUsers,
    cross: relCross,
    crossOutbound: relCrossOutbound,
    crossContext: relCrossContext,
    all: relAll,
  };

  // ---- coMasters: other modules / domains with any role on this scope's masters ----
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
      role: r.role as string,
      necessity: (r.necessity as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
    });
  }
  // Domain-granularity fallback: domains with a role on these masters but no modules.
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
      role: r.role as string,
      necessity: (r.necessity as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
    });
  }

  // ---- owners: canonical module / domain that masters each non-master in scope ----
  const nonMasterIdSet = new Set(scopeRows.filter((r) => r.role !== "master").map((r) => r.data_object_id));
  const owners = new Map<number, OwnerInfo>();
  for (const r of all.dmdo) {
    if (r.role !== "master") continue;
    const did = r.data_object_id as number;
    if (!nonMasterIdSet.has(did)) continue;
    const m = index.modulesById.get(r.domain_module_id as number);
    if (!m) continue;
    if (!owners.has(did)) owners.set(did, { modules: [], domains: [] });
    const info = owners.get(did)!;
    if (!info.modules.includes(m)) info.modules.push(m);
  }
  for (const r of all.ddo) {
    if (r.role !== "master") continue;
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

  // Handoff attribution (see emit_fact_sheet.ts comment block for rationale).
  const outboundHandoffs: any[] = [];
  const inboundHandoffs: any[] = [];
  for (const h of handoffRows ?? []) {
    const payloadId = h.data_object_id as number;
    const scopeRole = scopeRolesById.get(payloadId);
    const srcModuleInScope =
      h.source_domain_module_id !== null && moduleIdSet.has(h.source_domain_module_id as number);
    const tgtModuleInScope =
      h.target_domain_module_id !== null && moduleIdSet.has(h.target_domain_module_id as number);
    const srcDomainInScope = parentDomainIds.has(h.source_domain_id as number);
    const tgtDomainInScope = parentDomainIds.has(h.target_domain_id as number);
    const payloadMasteredHere = scopeRole === "master";
    const payloadHeldNonMaster = scopeRole !== undefined && scopeRole !== "master";
    if (srcModuleInScope || (srcDomainInScope && h.source_domain_module_id === null && payloadMasteredHere)) {
      outboundHandoffs.push(h);
    } else if (
      tgtModuleInScope ||
      (tgtDomainInScope && h.target_domain_module_id === null && payloadHeldNonMaster)
    ) {
      inboundHandoffs.push(h);
    }
  }

  // Related modules: union of four data-coupling sources, deduped, with self removed.
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

  return {
    modules,
    scopeRows,
    scopeRolesById,
    scopeNecessityById,
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
