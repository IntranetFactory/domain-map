#!/usr/bin/env bun
// scripts/emit_domain_map.ts
//
// Emits domain-map.json at the repo root: every domain in the catalog with its modules
// (per-module catalog payload populated), plus per-domain related_domains derived from
// the union of each module's relatedModuleIds.
//
// All catalog reads go through scripts/lib/catalog.ts so this script and the per-module
// blueprint emitter (emit_fact_sheet.ts) cannot diverge on what a module's catalog says.
//
// Usage:
//   bun run scripts/emit_domain_map.ts                 # write domain-map.json
//   bun run scripts/emit_domain_map.ts --out path.json # custom output path
//   bun run scripts/emit_domain_map.ts --stdout        # print to stdout, do not write

export {};

import { writeFileSync } from "node:fs";
import { argv } from "node:process";
import {
  loadCachedCatalog,
  loadModuleCatalog,
  type AllRelationships,
  type CatalogIndex,
  type ModuleRow,
} from "./lib/catalog";

const args = argv.slice(2);
function flagValue(name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const STDOUT = args.includes("--stdout");
const OUT_PATH = flagValue("--out") ?? "c:/dev/domain-map/domain-map.json";

// ---------- output shape ----------

type DataObjectOut = {
  name: string;
  role: string;
  necessity: string | null;
};

type HandoffOut = {
  trigger_event: string | null;
  payload: string | null;
  source_module: string | null;
  source_domain: string | null;
  target_module: string | null;
  target_domain: string | null;
  integration_pattern: string | null;
  friction_level: string | null;
};

type LifecycleStateOut = {
  state_name: string;
  state_order: number;
  is_initial: boolean;
  is_terminal: boolean;
  requires_permission: boolean;
  permission_verb_override: string | null;
  realizing_module: string | null;
};

type ModuleCatalogOut = {
  data_objects: DataObjectOut[];
  master_providers: { data_object: string; owner_module: string | null; owner_domain: string | null; role: string; necessity: string | null }[];
  master_consumers: { data_object: string; consumer_module: string; consumer_domain: string | null; role: string; necessity: string | null }[];
  outbound_handoffs: HandoffOut[];
  inbound_handoffs: HandoffOut[];
  lifecycle: { data_object: string; states: LifecycleStateOut[] }[];
  related_modules: string[];
};

type ModuleOut = {
  code: string;
  name: string;
  description: string;
  module_kind: "full" | "starter";
  catalog: ModuleCatalogOut;
};

type DomainOut = {
  code: string;
  name: string;
  description: string;
  modules: ModuleOut[];
  related_domains: string[];
};

// ---------- helpers ----------

function moduleSlug(code: string): string {
  return code.toLowerCase().replace(/_/g, "-");
}

function buildModuleCatalogOut(
  cat: Awaited<ReturnType<typeof loadModuleCatalog>>,
  index: CatalogIndex,
): ModuleCatalogOut {
  const dataObjects: DataObjectOut[] = cat.scopeRows
    .slice()
    .sort((a, b) => a.data_object.data_object_name.localeCompare(b.data_object.data_object_name))
    .map((r) => ({
      name: r.data_object.data_object_name,
      role: r.role,
      necessity: r.necessity,
    }));

  const master_providers = cat.scopeRows
    .filter((r) => r.role !== "master")
    .map((r) => {
      const info = cat.owners.get(r.data_object_id);
      const ownerModule = info?.modules[0];
      const ownerDomain =
        ownerModule && ownerModule.domain_id !== null
          ? index.domainsById.get(ownerModule.domain_id) ?? null
          : info?.domains[0] ?? null;
      return {
        data_object: r.data_object.data_object_name,
        owner_module: ownerModule ? ownerModule.domain_module_code : null,
        owner_domain: ownerDomain ? ownerDomain.domain_code : null,
        role: r.role,
        necessity: r.necessity,
      };
    });

  const master_consumers = cat.coMasters.map((c) => {
    const obj = index.dataObjectsById.get(c.data_object_id);
    return {
      data_object: obj?.data_object_name ?? `#${c.data_object_id}`,
      consumer_module: c.owner_module?.domain_module_code ?? "",
      consumer_domain: c.owner_domain?.domain_code ?? null,
      role: c.role,
      necessity: c.necessity,
    };
  });

  const mapHandoff = (h: any): HandoffOut => {
    const sm = h.source_domain_module_id !== null ? index.modulesById.get(h.source_domain_module_id) : null;
    const tm = h.target_domain_module_id !== null ? index.modulesById.get(h.target_domain_module_id) : null;
    const sd = h.source_domain_id !== null ? index.domainsById.get(h.source_domain_id) : null;
    const td = h.target_domain_id !== null ? index.domainsById.get(h.target_domain_id) : null;
    return {
      trigger_event: h.trigger_events?.event_name ?? null,
      payload: h.data_objects?.data_object_name ?? null,
      source_module: sm?.domain_module_code ?? null,
      source_domain: sd?.domain_code ?? null,
      target_module: tm?.domain_module_code ?? null,
      target_domain: td?.domain_code ?? null,
      integration_pattern: h.integration_pattern ?? null,
      friction_level: h.friction_level ?? null,
    };
  };

  const outbound_handoffs = cat.outboundHandoffs.map(mapHandoff);
  const inbound_handoffs = cat.inboundHandoffs.map(mapHandoff);

  const lifecycleByObj = new Map<number, LifecycleStateOut[]>();
  for (const ls of cat.lifecycleRows) {
    const did = ls.data_object_id as number;
    if (!lifecycleByObj.has(did)) lifecycleByObj.set(did, []);
    const realizingId = ls.domain_module_id as number | null;
    const realizingModule = realizingId !== null ? index.modulesById.get(realizingId) : null;
    lifecycleByObj.get(did)!.push({
      state_name: ls.state_name as string,
      state_order: ls.state_order as number,
      is_initial: Boolean(ls.is_initial),
      is_terminal: Boolean(ls.is_terminal),
      requires_permission: Boolean(ls.requires_permission),
      permission_verb_override: (ls.permission_verb_override as string | null) ?? null,
      realizing_module: realizingModule?.domain_module_code ?? null,
    });
  }
  const lifecycle = [...lifecycleByObj.entries()]
    .map(([did, states]) => {
      const obj = index.dataObjectsById.get(did);
      return {
        data_object: obj?.data_object_name ?? `#${did}`,
        states: states.slice().sort((a, b) => a.state_order - b.state_order),
      };
    })
    .sort((a, b) => a.data_object.localeCompare(b.data_object));

  const related_modules = [...cat.relatedModuleIds]
    .map((id) => index.modulesById.get(id))
    .filter((m): m is ModuleRow => Boolean(m))
    .map((m) => m.domain_module_code)
    .sort((a, b) => a.localeCompare(b));

  return {
    data_objects: dataObjects,
    master_providers,
    master_consumers,
    outbound_handoffs,
    inbound_handoffs,
    lifecycle,
    related_modules,
  };
}

// ---------- driver ----------

const t0 = Date.now();
// This script always reads fresh from the server (it's the "regenerate everything"
// path, usually run after a load). loadCachedCatalog with forceRefresh writes the
// cache for us so the next blueprint emit picks up this exact bundle.
const { index, all }: { index: CatalogIndex; all: AllRelationships } = await loadCachedCatalog({
  forceRefresh: true,
});
const tLoaded = Date.now();
console.error(`bulk-loaded catalog + relationships in ${((tLoaded - t0) / 1000).toFixed(1)}s`);

// Modules hosted on a domain = primary host (domain_modules.domain_id) ∪ host junction.
// host junction rows are bulk-loaded as part of AllRelationships.
const moduleHostsByModule = new Map<number, Set<number>>();
for (const h of all.hostDomains) {
  const mid = h.domain_module_id as number;
  if (!moduleHostsByModule.has(mid)) moduleHostsByModule.set(mid, new Set());
  moduleHostsByModule.get(mid)!.add(h.domain_id as number);
}
const modulesByDomain = new Map<number, ModuleRow[]>();
for (const m of index.modules) {
  const hosts = new Set<number>();
  if (m.domain_id !== null) hosts.add(m.domain_id);
  const fromJunction = moduleHostsByModule.get(m.id);
  if (fromJunction) for (const d of fromJunction) hosts.add(d);
  for (const did of hosts) {
    if (!modulesByDomain.has(did)) modulesByDomain.set(did, []);
    modulesByDomain.get(did)!.push(m);
  }
}

// Derive each module's catalog payload in memory. Same lib that emit_fact_sheet.ts uses.
const catByModuleId = new Map<number, ReturnType<typeof loadModuleCatalog>>();
for (const m of index.modules) {
  catByModuleId.set(m.id, loadModuleCatalog([m.id], index, all));
}
const tCatalogs = Date.now();
console.error(`derived ${catByModuleId.size} module catalogs in ${((tCatalogs - tLoaded) / 1000).toFixed(2)}s`);

// Per-domain related_domains: aggregate each member-module's relatedModuleIds, map
// related module → its parent domain ids (primary + host junction), drop self.
const out: DomainOut[] = [];
for (const d of index.domains) {
  const mods = (modulesByDomain.get(d.id) ?? [])
    .slice()
    .sort((a, b) => a.domain_module_code.localeCompare(b.domain_module_code));

  const moduleOuts: ModuleOut[] = mods.map((m) => {
    const cat = catByModuleId.get(m.id);
    if (!cat) throw new Error(`missing module catalog for ${m.domain_module_code}`);
    return {
      code: m.domain_module_code,
      name: m.domain_module_name,
      description: m.description ?? "",
      module_kind: m.module_kind,
      catalog: buildModuleCatalogOut(cat, index),
    };
  });

  const related = new Set<string>();
  for (const m of mods) {
    const cat = catByModuleId.get(m.id);
    if (!cat) continue;
    for (const relatedModuleId of cat.relatedModuleIds) {
      const relatedMod = index.modulesById.get(relatedModuleId);
      if (!relatedMod) continue;
      const relatedDomainIds = new Set<number>();
      if (relatedMod.domain_id !== null) relatedDomainIds.add(relatedMod.domain_id);
      const junctionHosts = moduleHostsByModule.get(relatedMod.id);
      if (junctionHosts) for (const did of junctionHosts) relatedDomainIds.add(did);
      for (const did of relatedDomainIds) {
        if (did === d.id) continue;
        const rd = index.domainsById.get(did);
        if (rd) related.add(rd.domain_code);
      }
    }
  }

  out.push({
    code: d.domain_code,
    name: d.domain_name,
    description: d.description ?? "",
    modules: moduleOuts,
    related_domains: [...related].sort((a, b) => a.localeCompare(b)),
  });
}

out.sort((a, b) => a.code.localeCompare(b.code));

const payload = { domains: out };
const json = JSON.stringify(payload, null, 2) + "\n";

if (STDOUT) {
  process.stdout.write(json);
} else {
  writeFileSync(OUT_PATH, json, "utf8");
  console.log(`wrote ${OUT_PATH} (${out.length} domains, ${out.reduce((n, d) => n + d.modules.length, 0)} module entries)`);
}
