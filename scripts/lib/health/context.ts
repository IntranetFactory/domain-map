// scripts/lib/health/context.ts
//
// Builds the HealthCtx a check runs against. Read-only against the catalog: the only network
// path is `pg("GET", ...)`, and `query()` refuses anything that is not a plain path.
//
// Two steps so `--all` shares one catalog load and one query memo across every domain:
//   const base = await loadHealthBase();          // catalog index + bulk relationships + GET memo
//   const ctx  = buildHealthContext(base, "ATS"); // per-domain view
//
// Band files never edit this module to add a table: they call `ctx.query(path)` with the
// catalog-wide select they need, and the memo dedupes it across checks and domains.

import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCachedCatalog, pg, type AllRelationships, type CatalogIndex } from "../catalog.ts";
import type { HealthCtx } from "./types.ts";

export type HealthBase = {
  index: CatalogIndex;
  all: AllRelationships;
  query(path: string): Promise<any[]>;
};

// The health script keeps its catalog cache OUT of the repo by default. The shared
// `.cache/.catalog-cache.json` is a tracked file that any cold load rewrites; a read-only health
// run should not leave a diff in the working tree. Pass `cacheFile` to share another cache.
export const DEFAULT_HEALTH_CACHE_FILE = join(tmpdir(), "domain-map-health-catalog-cache.json");

export type HealthBaseOptions = {
  cacheFile?: string;
  forceRefresh?: boolean;
};

export function createQueryMemo(): (path: string) => Promise<any[]> {
  const memo = new Map<string, Promise<any[]>>();
  return (path: string) => {
    if (typeof path !== "string" || !path.startsWith("/")) {
      throw new Error(`ctx.query: expected a PostgREST path starting with "/", got ${JSON.stringify(path)}`);
    }
    let p = memo.get(path);
    if (!p) {
      // GET only. There is deliberately no method parameter.
      p = pg("GET", path).then((r: any) => (Array.isArray(r) ? r : r == null ? [] : [r]));
      memo.set(path, p);
      // A failed fetch should not poison the memo for a retry in the same process.
      p.catch(() => memo.delete(path));
    }
    return p;
  };
}

export async function loadHealthBase(opts: HealthBaseOptions = {}): Promise<HealthBase> {
  const { index, all } = await loadCachedCatalog({
    cacheFile: opts.cacheFile ?? DEFAULT_HEALTH_CACHE_FILE,
    forceRefresh: opts.forceRefresh,
  });
  return { index, all, query: createQueryMemo() };
}

// Catalog-wide data_object_id -> Set<domain_id> of its master rows. Computed once per base.
const masterDomainsCache = new WeakMap<AllRelationships, Map<number, Set<number>>>();
function masterDomainsByDataObject(index: CatalogIndex, all: AllRelationships): Map<number, Set<number>> {
  let m = masterDomainsCache.get(all);
  if (m) return m;
  m = new Map();
  for (const r of all.dmdo) {
    if (r.role !== "master") continue;
    const dom = index.modulesById.get(r.domain_module_id as number)?.domain_id;
    if (dom == null) continue;
    let s = m.get(r.data_object_id as number);
    if (!s) m.set(r.data_object_id as number, (s = new Set()));
    s.add(dom);
  }
  masterDomainsCache.set(all, m);
  return m;
}

export function buildHealthContext(base: HealthBase, domainCode: string): HealthCtx {
  const { index, all } = base;
  const domain = index.domainsByCode.get(domainCode);
  if (!domain) throw new Error(`unknown domain code: ${domainCode}`);
  const modules = index.modules
    .filter((m) => m.domain_id === domain.id)
    .sort((a, b) => (a.domain_module_code < b.domain_module_code ? -1 : a.domain_module_code > b.domain_module_code ? 1 : 0));
  const moduleIds = modules.map((m) => m.id);
  const moduleIdSet = new Set(moduleIds);
  const dmdo = moduleIds.flatMap((id) => all.dmdoByModuleId.get(id) ?? []);
  const masterModulesByDataObject = new Map<number, number[]>();
  for (const r of dmdo) {
    if (r.role !== "master") continue;
    const did = r.data_object_id as number;
    const list = masterModulesByDataObject.get(did) ?? [];
    if (!list.includes(r.domain_module_id)) list.push(r.domain_module_id as number);
    masterModulesByDataObject.set(did, list);
  }
  const masters = [...masterModulesByDataObject.keys()].sort((a, b) => a - b);
  return {
    domain,
    domainId: domain.id,
    domainCode: domain.domain_code,
    modules,
    moduleIds,
    moduleIdSet,
    dmdo,
    masters,
    masterSet: new Set(masters),
    masterModulesByDataObject,
    masterDomainsByDataObject: masterDomainsByDataObject(index, all),
    usersId: index.usersId,
    index,
    all,
    query: base.query,
    doName: (id: number) => index.dataObjectsById.get(id)?.data_object_name ?? `#${id}`,
    moduleCode: (id) => (id == null ? "(no module)" : index.modulesById.get(id)?.domain_module_code ?? `#${id}`),
  };
}
