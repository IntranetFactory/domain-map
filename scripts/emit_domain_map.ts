#!/usr/bin/env bun
// scripts/emit_domain_map.ts
//
// Emits domain-map.json at the repo root: every domain with code, name, description,
// catalog flag, modules (same four fields per module), and related_domains (codes).
//
// related_domains = (other domains touching one of this domain's data_objects, any role)
//                 ∪ (handoff neighbors, either direction), minus self.
//
// All catalog reads go through scripts/lib/catalog.ts so this script and the per-module
// blueprint emitter (emit_fact_sheet.ts) share one source for the underlying tables.
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

type ModuleOut = {
  code: string;
  name: string;
  description: string;
  catalog: boolean;
  related_modules: string[];
};

type DomainOut = {
  code: string;
  name: string;
  description: string;
  catalog: boolean;
  modules: ModuleOut[];
  related_domains: string[];
};

const t0 = Date.now();
const { index, all }: { index: CatalogIndex; all: AllRelationships } = await loadCachedCatalog({
  forceRefresh: true,
});
console.error(`bulk-loaded catalog + relationships in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// Modules hosted on a domain = primary host (domain_modules.domain_id) ∪ host junction.
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

// data_objects touched by a domain = domain_data_objects ∪ (modules hosted on domain → domain_module_data_objects).
const domainsByModule = new Map<number, Set<number>>();
for (const [did, mods] of modulesByDomain) {
  for (const m of mods) {
    if (!domainsByModule.has(m.id)) domainsByModule.set(m.id, new Set());
    domainsByModule.get(m.id)!.add(did);
  }
}
const dataObjectsByDomain = new Map<number, Set<number>>();
for (const d of index.domains) dataObjectsByDomain.set(d.id, new Set());
for (const r of all.ddo) {
  dataObjectsByDomain.get(r.domain_id as number)?.add(r.data_object_id as number);
}
for (const r of all.dmdo) {
  const dids = domainsByModule.get(r.domain_module_id as number);
  if (!dids) continue;
  for (const did of dids) dataObjectsByDomain.get(did)?.add(r.data_object_id as number);
}

// Reverse: data_object → domains touching it.
const domainsByDataObject = new Map<number, Set<number>>();
for (const [did, dataObjs] of dataObjectsByDomain) {
  for (const oid of dataObjs) {
    if (!domainsByDataObject.has(oid)) domainsByDataObject.set(oid, new Set());
    domainsByDataObject.get(oid)!.add(did);
  }
}

// Handoff neighbors (either direction, self excluded).
const handoffNeighbors = new Map<number, Set<number>>();
for (const d of index.domains) handoffNeighbors.set(d.id, new Set());
for (const h of all.handoffs) {
  const s = h.source_domain_id as number | null;
  const t = h.target_domain_id as number | null;
  if (s === null || t === null || s === t) continue;
  handoffNeighbors.get(s)?.add(t);
  handoffNeighbors.get(t)?.add(s);
}

// Module-level neighbors: co-touch on data_objects (via dmdo) ∪ module-level handoffs.
const modulesByDataObject = new Map<number, Set<number>>();
for (const r of all.dmdo) {
  const oid = r.data_object_id as number;
  const mid = r.domain_module_id as number;
  if (!modulesByDataObject.has(oid)) modulesByDataObject.set(oid, new Set());
  modulesByDataObject.get(oid)!.add(mid);
}
const dataObjectsByModule = new Map<number, Set<number>>();
for (const r of all.dmdo) {
  const mid = r.domain_module_id as number;
  const oid = r.data_object_id as number;
  if (!dataObjectsByModule.has(mid)) dataObjectsByModule.set(mid, new Set());
  dataObjectsByModule.get(mid)!.add(oid);
}
const moduleHandoffNeighbors = new Map<number, Set<number>>();
for (const m of index.modules) moduleHandoffNeighbors.set(m.id, new Set());
for (const h of all.handoffs) {
  const s = h.source_domain_module_id as number | null;
  const t = h.target_domain_module_id as number | null;
  if (s === null || t === null || s === t) continue;
  moduleHandoffNeighbors.get(s)?.add(t);
  moduleHandoffNeighbors.get(t)?.add(s);
}

const out: DomainOut[] = [];
for (const d of index.domains) {
  const mods: ModuleOut[] = (modulesByDomain.get(d.id) ?? [])
    .slice()
    .sort((a, b) => a.domain_module_code.localeCompare(b.domain_module_code))
    .map((m) => {
      const relatedMods = new Set<number>();
      for (const oid of dataObjectsByModule.get(m.id) ?? []) {
        for (const other of modulesByDataObject.get(oid) ?? []) {
          if (other !== m.id) relatedMods.add(other);
        }
      }
      for (const other of moduleHandoffNeighbors.get(m.id) ?? []) {
        if (other !== m.id) relatedMods.add(other);
      }
      const relatedModCodes = [...relatedMods]
        .map((id) => index.modulesById.get(id)?.domain_module_code)
        .filter((c): c is string => Boolean(c))
        .sort((a, b) => a.localeCompare(b));
      return {
        code: m.domain_module_code,
        name: m.domain_module_name,
        description: m.description ?? "",
        catalog: Boolean(m.catalog),
        related_modules: relatedModCodes,
      };
    });

  const related = new Set<number>();
  for (const oid of dataObjectsByDomain.get(d.id) ?? []) {
    for (const other of domainsByDataObject.get(oid) ?? []) {
      if (other !== d.id) related.add(other);
    }
  }
  for (const other of handoffNeighbors.get(d.id) ?? []) {
    if (other !== d.id) related.add(other);
  }
  const relatedCodes = [...related]
    .map((id) => index.domainsById.get(id)?.domain_code)
    .filter((c): c is string => Boolean(c))
    .sort((a, b) => a.localeCompare(b));

  out.push({
    code: d.domain_code,
    name: d.domain_name,
    description: d.description ?? "",
    catalog: Boolean(d.catalog),
    modules: mods,
    related_domains: relatedCodes,
  });
}

out.sort((a, b) => a.code.localeCompare(b.code));

const payload = { domains: out };
const rawJson = JSON.stringify(payload, null, 2);
// Collapse the two string-only array fields to one line for readability.
const json =
  rawJson.replace(
    /"(related_domains|related_modules)": \[([^\]]*)\]/g,
    (_m, key, inner) => {
      const items = inner
        .split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      return `"${key}": [${items.join(", ")}]`;
    },
  ) + "\n";

if (STDOUT) {
  process.stdout.write(json);
} else {
  writeFileSync(OUT_PATH, json, "utf8");
  console.log(`wrote ${OUT_PATH} (${out.length} domains, ${out.reduce((n, d) => n + d.modules.length, 0)} module entries)`);
}
