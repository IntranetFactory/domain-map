#!/usr/bin/env bun
// scripts/emit_domain_map.ts
//
// Emits domain-map.json at the repo root: every domain in the catalog with its modules
// and its related_domains. Related = the union of domains coupled by shared data_objects
// (any role on the same data_object) and domains coupled by handoffs (either direction).
//
// Same "related" logic the per-module fact sheet uses (master_providers, master_consumers,
// handoff senders, handoff receivers in emit_fact_sheet.ts:709-741), aggregated up to the
// domain layer instead of the module layer.
//
// Usage:
//   bun run scripts/emit_domain_map.ts                 # write domain-map.json
//   bun run scripts/emit_domain_map.ts --out path.json # custom output path
//   bun run scripts/emit_domain_map.ts --stdout        # print to stdout, do not write

export {};

import { writeFileSync } from "node:fs";
import { argv, exit } from "node:process";

const args = argv.slice(2);
function flagValue(name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const STDOUT = args.includes("--stdout");
const OUT_PATH = flagValue("--out") ?? "c:/dev/domain-map/domain-map.json";

type Row = Record<string, unknown>;

async function pg(method: string, path: string, body?: unknown): Promise<any> {
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

type Domain = {
  id: number;
  domain_code: string;
  domain_name: string;
  description: string;
  catalog: boolean;
};

type ModuleRow = {
  id: number;
  domain_module_code: string;
  domain_module_name: string;
  domain_id: number | null;
  description: string;
  catalog: boolean;
};

type DomainDataObjectRow = { domain_id: number; data_object_id: number };
type DomainModuleDataObjectRow = { domain_module_id: number; data_object_id: number };
type HostRow = { domain_module_id: number; domain_id: number };
type HandoffRow = { source_domain_id: number | null; target_domain_id: number | null };

// ---------- load catalog ----------

const domains: Domain[] = await pg(
  "GET",
  "/domains?select=id,domain_code,domain_name,description,catalog&order=domain_code.asc&limit=10000",
);

const modules: ModuleRow[] = (await pg(
  "GET",
  "/domain_modules?select=id,domain_module_code,domain_module_name,domain_id,description,catalog&order=domain_module_code.asc&limit=10000",
)) ?? [];

const hostRows: HostRow[] = (await pg(
  "GET",
  "/domain_module_host_domains?select=domain_module_id,domain_id&limit=10000",
)) ?? [];

const ddoRows: DomainDataObjectRow[] = (await pg(
  "GET",
  "/domain_data_objects?select=domain_id,data_object_id&limit=20000",
)) ?? [];

const dmdoRows: DomainModuleDataObjectRow[] = (await pg(
  "GET",
  "/domain_module_data_objects?select=domain_module_id,data_object_id&limit=20000",
)) ?? [];

const handoffRows: HandoffRow[] = (await pg(
  "GET",
  "/handoffs?select=source_domain_id,target_domain_id&limit=20000",
)) ?? [];

// ---------- build per-domain views ----------

// modules belonging to a domain: primary host (domain_modules.domain_id) + host junction.
const modulesByDomain = new Map<number, ModuleRow[]>();
const moduleHostsByModule = new Map<number, Set<number>>();
for (const h of hostRows) {
  if (!moduleHostsByModule.has(h.domain_module_id)) moduleHostsByModule.set(h.domain_module_id, new Set());
  moduleHostsByModule.get(h.domain_module_id)!.add(h.domain_id);
}
for (const m of modules) {
  const hostDomains = new Set<number>();
  if (m.domain_id !== null) hostDomains.add(m.domain_id);
  const fromJunction = moduleHostsByModule.get(m.id);
  if (fromJunction) for (const d of fromJunction) hostDomains.add(d);
  for (const did of hostDomains) {
    if (!modulesByDomain.has(did)) modulesByDomain.set(did, []);
    modulesByDomain.get(did)!.push(m);
  }
}

// data_objects touched by a domain: domain_data_objects + (modules hosted on domain → domain_module_data_objects).
const modulesByDomainIds = new Map<number, Set<number>>();
for (const [did, mods] of modulesByDomain) {
  modulesByDomainIds.set(did, new Set(mods.map((m) => m.id)));
}

const dataObjectsByDomain = new Map<number, Set<number>>();
for (const d of domains) dataObjectsByDomain.set(d.id, new Set());
for (const r of ddoRows) {
  dataObjectsByDomain.get(r.domain_id)?.add(r.data_object_id);
}
// reverse-index module → domains it is hosted on
const domainsByModule = new Map<number, Set<number>>();
for (const [did, modIds] of modulesByDomainIds) {
  for (const mid of modIds) {
    if (!domainsByModule.has(mid)) domainsByModule.set(mid, new Set());
    domainsByModule.get(mid)!.add(did);
  }
}
for (const r of dmdoRows) {
  const dids = domainsByModule.get(r.domain_module_id);
  if (!dids) continue;
  for (const did of dids) dataObjectsByDomain.get(did)?.add(r.data_object_id);
}

// reverse-index data_object → domains that touch it (any role).
const domainsByDataObject = new Map<number, Set<number>>();
for (const [did, dataObjs] of dataObjectsByDomain) {
  for (const oid of dataObjs) {
    if (!domainsByDataObject.has(oid)) domainsByDataObject.set(oid, new Set());
    domainsByDataObject.get(oid)!.add(did);
  }
}

// handoff coupling: any handoff between two distinct domains creates a related-pair (both directions).
const handoffNeighbors = new Map<number, Set<number>>();
for (const d of domains) handoffNeighbors.set(d.id, new Set());
for (const h of handoffRows) {
  const s = h.source_domain_id;
  const t = h.target_domain_id;
  if (s === null || t === null || s === t) continue;
  handoffNeighbors.get(s)?.add(t);
  handoffNeighbors.get(t)?.add(s);
}

// ---------- assemble JSON ----------

type DomainOut = {
  code: string;
  name: string;
  description: string;
  catalog: boolean;
  modules: { code: string; name: string; description: string; catalog: boolean }[];
  related_domains: string[];
};

const domainsByIdMap = new Map<number, Domain>(domains.map((d) => [d.id, d]));

const out: DomainOut[] = [];
for (const d of domains) {
  const mods = (modulesByDomain.get(d.id) ?? [])
    .slice()
    .sort((a, b) => a.domain_module_code.localeCompare(b.domain_module_code))
    .map((m) => ({
      code: m.domain_module_code,
      name: m.domain_module_name,
      description: m.description ?? "",
      catalog: Boolean(m.catalog),
    }));

  // related = (any other domain touching one of this domain's data_objects) ∪ (handoff neighbors), self removed.
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
    .map((id) => domainsByIdMap.get(id)?.domain_code)
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
const json = JSON.stringify(payload, null, 2) + "\n";

if (STDOUT) {
  process.stdout.write(json);
} else {
  writeFileSync(OUT_PATH, json, "utf8");
  console.log(`wrote ${OUT_PATH} (${out.length} domains, ${out.reduce((n, d) => n + d.modules.length, 0)} module entries)`);
}
