#!/usr/bin/env bun
// scripts/emit_domain_map.ts
//
// Emits THREE catalog artifacts under catalog/:
//
//   domain-map.json  — every domain with code, name, description, catalog_release date, modules,
//                      related_domains (codes), plus personas[] and processes[] both at the
//                      domain grain and nested per module (modules[].personas / .processes).
//   personas.json    — every catalog persona (domain_roles), with its business function and
//                      the modules / domains its role_modules reach touches.
//   processes.json    — only the processes USED somewhere in the catalog (the processes table is
//                      the full ~2k-row APQC PCF framework; we emit just the in-use subset).
//
// related_domains = (other domains touching one of this domain's data_objects, any role)
//                 ∪ (handoff neighbors, either direction), minus self.
//
// Personas attach to a module via the role_modules REACH edge (persona <-> module, with
// interaction_level); a domain's personas are the union across its hosted modules.
//
// Processes attach two structurally different ways, and each nested entry is TAGGED with `via`:
//   via="gate"    — a module realizes the process as a lifecycle gate
//                   (data_object_lifecycle_states.process_id + domain_module_id). "Owns / runs it."
//   via="handoff" — the process implements one of the domain's handoffs
//                   (handoff_processes -> handoffs endpoints). "Happens at this domain's seam."
// A process attached both ways to the same unit is listed once with via="gate" (the ownership signal wins).
// The "USED" set in processes.json is the broader union: gate ∪ raci ∪ handoff ∪ tool edges.
//
// All catalog reads go through scripts/lib/catalog.ts so this script and the per-module
// blueprint emitter (emit_fact_sheet.ts) share one source for the underlying tables.
//
// Usage:
//   bun run scripts/emit_domain_map.ts                       # write all three under catalog/
//   bun run scripts/emit_domain_map.ts --out path.json       # custom domain-map output path
//   bun run scripts/emit_domain_map.ts --personas-out p.json # custom personas output path
//   bun run scripts/emit_domain_map.ts --processes-out q.json# custom processes output path
//   bun run scripts/emit_domain_map.ts --stdout              # print domain-map to stdout, write nothing

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
const OUT_PATH = flagValue("--out") ?? "c:/dev/domain-map/catalog/domain-map.json";
const PERSONAS_OUT_PATH = flagValue("--personas-out") ?? "c:/dev/domain-map/catalog/personas.json";
const PROCESSES_OUT_PATH = flagValue("--processes-out") ?? "c:/dev/domain-map/catalog/processes.json";

type PersonaRef = {
  code: string;
  name: string;
  interaction_level: string; // "primary" | "secondary" (strongest across this unit's reach rows)
};

type ProcessRef = {
  key: string;
  name: string;
  via: string; // "gate" | "handoff"
};

// Persona <-> process responsibility edge (process_raci), carried on both cross-reference files.
// raci is the full enum word: "responsible" | "accountable" | "consulted" | "informed".
type RaciPersonaRef = {
  code: string;
  name: string;
  raci: string;
};
type RaciProcessRef = {
  key: string;
  name: string;
  raci: string;
};

type ModuleOut = {
  code: string;
  name: string;
  description: string;
  personas: PersonaRef[];
  processes: ProcessRef[];
  related_modules: string[];
};

type DomainOut = {
  code: string;
  name: string;
  description: string;
  catalog_release: string | null;
  modules: ModuleOut[];
  personas: PersonaRef[];
  processes: ProcessRef[];
  related_domains: string[];
};

type PersonaOut = {
  code: string;
  name: string;
  description: string;
  business_function_id: number | null;
  business_function: string | null;
  record_status: string | null;
  module_count: number;
  domain_count: number;
  modules: string[];
  domains: string[];
  processes: RaciProcessRef[]; // processes this persona is RACI on (process_raci)
};

type ProcessUsage = { gate: boolean; raci: boolean; handoff: boolean; tool: boolean };

type ProcessOut = {
  key: string;
  code: string | null;
  name: string;
  external_id: string | null;
  hierarchy_level: number | null;
  source_framework: string | null;
  usage: ProcessUsage;
  personas: RaciPersonaRef[]; // personas RACI on this process (process_raci)
};

// --cache emits from the local cache file without a server refresh (offline / fast iteration).
// Default is the regenerate-everything path: force a fresh fetch and rewrite the cache.
const USE_CACHE = args.includes("--cache");
const t0 = Date.now();
const { index, all }: { index: CatalogIndex; all: AllRelationships } = await loadCachedCatalog(
  USE_CACHE ? { forceRefresh: false, ttlMs: Number.MAX_SAFE_INTEGER } : { forceRefresh: true },
);
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

// Domains that MASTER each data_object (rolled up from dmdo master rows via module host,
// plus legacy domain_data_objects master rows). Used for the ownership-mediated relatedness
// rule: D is related to D' iff one of them masters a data_object the other touches.
const masterDomainsByDataObject = new Map<number, Set<number>>();
for (const r of all.dmdo) {
  if (r.role !== "master") continue;
  const dids = domainsByModule.get(r.domain_module_id as number);
  if (!dids) continue;
  const oid = r.data_object_id as number;
  if (!masterDomainsByDataObject.has(oid)) masterDomainsByDataObject.set(oid, new Set());
  for (const did of dids) masterDomainsByDataObject.get(oid)!.add(did);
}
for (const r of all.ddo) {
  if (r.role !== "master") continue;
  const oid = r.data_object_id as number;
  if (!masterDomainsByDataObject.has(oid)) masterDomainsByDataObject.set(oid, new Set());
  masterDomainsByDataObject.get(oid)!.add(r.domain_id as number);
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

// Module-level neighbors: ownership-mediated co-touch on data_objects ∪ module-level handoffs.
// "Ownership-mediated" = M is related to M' iff one of them masters a data_object the other touches.
// Two non-masters that both embed the same data_object are NOT related (the link, if any, runs through
// the master, not between them).
const modulesByDataObject = new Map<number, Set<number>>();
const masterModulesByDataObject = new Map<number, Set<number>>();
for (const r of all.dmdo) {
  const oid = r.data_object_id as number;
  const mid = r.domain_module_id as number;
  if (!modulesByDataObject.has(oid)) modulesByDataObject.set(oid, new Set());
  modulesByDataObject.get(oid)!.add(mid);
  if (r.role === "master") {
    if (!masterModulesByDataObject.has(oid)) masterModulesByDataObject.set(oid, new Set());
    masterModulesByDataObject.get(oid)!.add(mid);
  }
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

// ---------------------------------------------------------------------------
// Personas (role_modules reach) and processes (gate + handoff edges) attribution.
// ---------------------------------------------------------------------------

const personaById = all.domainRolesById; // Map<roleId, domain_roles row>
const functionById = all.businessFunctionsById; // Map<id, business_functions row>

const INTERACTION_RANK: Record<string, number> = { primary: 0, secondary: 1 };
function strongerInteraction(a: string, b: string): string {
  return (INTERACTION_RANK[a] ?? 9) <= (INTERACTION_RANK[b] ?? 9) ? a : b;
}

// personas per module: moduleId -> Map<roleId, strongest interaction_level>
const personaLevelByModule = new Map<number, Map<number, string>>();
for (const m of index.modules) personaLevelByModule.set(m.id, new Map());
for (const rm of all.roleModules) {
  const rid = rm.role_id as number;
  const mid = rm.domain_module_id as number;
  if (!personaById.has(rid)) continue; // dangling reach row, skip
  const bucket = personaLevelByModule.get(mid);
  if (!bucket) continue; // reach row to a module not in the index
  const lvl = (rm.interaction_level as string) ?? "secondary";
  bucket.set(rid, bucket.has(rid) ? strongerInteraction(bucket.get(rid)!, lvl) : lvl);
}

// personas per domain: union across the domain's hosted modules, strongest interaction wins.
const personaLevelByDomain = new Map<number, Map<number, string>>();
for (const d of index.domains) personaLevelByDomain.set(d.id, new Map());
for (const [did, mods] of modulesByDomain) {
  const dbucket = personaLevelByDomain.get(did);
  if (!dbucket) continue;
  for (const m of mods) {
    for (const [rid, lvl] of personaLevelByModule.get(m.id) ?? []) {
      dbucket.set(rid, dbucket.has(rid) ? strongerInteraction(dbucket.get(rid)!, lvl) : lvl);
    }
  }
}

function personaRefs(bucket: Map<number, string>): PersonaRef[] {
  return [...bucket.entries()]
    .map(([rid, lvl]) => {
      const p = personaById.get(rid);
      if (!p) return null;
      return { code: p.role_code as string, name: (p.role_name as string) ?? "", interaction_level: lvl };
    })
    .filter((x): x is PersonaRef => x !== null)
    .sort((a, b) => a.code.localeCompare(b.code));
}

// Gate edge: a lifecycle state with process_id + domain_module_id realizes that process in that module.
// (A NULL domain_module_id gate is master-level and reachable wherever the master installs; none exist
// today, so we attribute only the module-scoped gates and roll those up to the domain.)
const gateProcsByModule = new Map<number, Set<number>>();
for (const m of index.modules) gateProcsByModule.set(m.id, new Set());
for (const ls of all.lifecycle) {
  const pid = ls.process_id as number | null;
  const mid = ls.domain_module_id as number | null;
  if (pid == null || mid == null) continue;
  gateProcsByModule.get(mid)?.add(pid);
}

// Handoff edge: a handoff_processes row ties a process to a handoff; attribute it to BOTH endpoints.
// Module endpoints can be NULL (domain-grain handoff) so module attribution skips nulls; domain
// endpoints are always set, making the domain-grain handoff list the more complete one.
const handoffProcsByModule = new Map<number, Set<number>>();
for (const m of index.modules) handoffProcsByModule.set(m.id, new Set());
const handoffProcsByDomain = new Map<number, Set<number>>();
for (const d of index.domains) handoffProcsByDomain.set(d.id, new Set());
for (const hp of all.handoffProcesses) {
  const pid = hp.process_id as number | null;
  if (pid == null) continue;
  const h = hp.handoff as Record<string, number | null> | null;
  if (!h) continue;
  for (const mid of [h.source_domain_module_id, h.target_domain_module_id]) {
    if (mid != null) handoffProcsByModule.get(mid)?.add(pid);
  }
  for (const did of [h.source_domain_id, h.target_domain_id]) {
    if (did != null) handoffProcsByDomain.get(did)?.add(pid);
  }
}

// Combine a (gate, handoff) pair of process-id sets into tagged refs; gate wins the `via` on overlap.
function processRefs(gate: Set<number>, handoff: Set<number>): ProcessRef[] {
  const refs: ProcessRef[] = [];
  const seen = new Set<number>();
  const emit = (pid: number, via: string) => {
    if (seen.has(pid)) return;
    const p = all.processesById.get(pid);
    if (!p) return;
    seen.add(pid);
    refs.push({ key: p.process_key as string, name: (p.process_name as string) ?? "", via });
  };
  for (const pid of gate) emit(pid, "gate");
  for (const pid of handoff) emit(pid, "handoff");
  return refs.sort((a, b) => a.key.localeCompare(b.key));
}

function processRefsForModule(mid: number): ProcessRef[] {
  return processRefs(gateProcsByModule.get(mid) ?? new Set(), handoffProcsByModule.get(mid) ?? new Set());
}
function processRefsForDomain(did: number): ProcessRef[] {
  const gate = new Set<number>();
  for (const m of modulesByDomain.get(did) ?? []) {
    for (const pid of gateProcsByModule.get(m.id) ?? []) gate.add(pid);
  }
  return processRefs(gate, handoffProcsByDomain.get(did) ?? new Set());
}

const out: DomainOut[] = [];
for (const d of index.domains) {
  const mods: ModuleOut[] = (modulesByDomain.get(d.id) ?? [])
    .slice()
    .sort((a, b) => a.domain_module_code.localeCompare(b.domain_module_code))
    .map((m) => {
      const relatedMods = new Set<number>();
      for (const oid of dataObjectsByModule.get(m.id) ?? []) {
        const masters = masterModulesByDataObject.get(oid);
        const touchers = modulesByDataObject.get(oid);
        if (masters?.has(m.id)) {
          if (touchers) for (const other of touchers) if (other !== m.id) relatedMods.add(other);
        } else if (masters) {
          for (const master of masters) if (master !== m.id) relatedMods.add(master);
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
        personas: personaRefs(personaLevelByModule.get(m.id) ?? new Map()),
        processes: processRefsForModule(m.id),
        related_modules: relatedModCodes,
      };
    });

  const related = new Set<number>();
  for (const oid of dataObjectsByDomain.get(d.id) ?? []) {
    const masters = masterDomainsByDataObject.get(oid);
    const touchers = domainsByDataObject.get(oid);
    if (masters?.has(d.id)) {
      // d masters this data_object → include every other domain touching it.
      if (touchers) for (const other of touchers) if (other !== d.id) related.add(other);
    } else if (masters) {
      // d only touches → include only the master(s).
      for (const m of masters) if (m !== d.id) related.add(m);
    }
    // If no master exists for this data_object (rare; orphan), no relatedness edge from it.
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
    catalog_release: d.catalog_release ?? null,
    modules: mods,
    personas: personaRefs(personaLevelByDomain.get(d.id) ?? new Map()),
    processes: processRefsForDomain(d.id),
    related_domains: relatedCodes,
  });
}

out.sort((a, b) => a.code.localeCompare(b.code));

// ---------------------------------------------------------------------------
// Persona <-> process responsibility (process_raci): both cross-reference directions.
// personas[] per process (processes.json) and processes[] per persona (personas.json).
// Skill actors (actor_skill_id) are excluded; only persona actors carry a role_code.
// ---------------------------------------------------------------------------
const raciPersonasByProcess = new Map<number, RaciPersonaRef[]>();
const raciProcessesByPersona = new Map<number, RaciProcessRef[]>();
{
  const seen = new Set<string>(); // dedup (process, persona, letter)
  for (const r of all.processRaci) {
    const rid = r.actor_role_id as number | null;
    const pid = r.process_id as number | null;
    if (rid == null || pid == null) continue;
    const persona = personaById.get(rid);
    const proc = all.processesById.get(pid);
    if (!persona || !proc) continue;
    const letter = (r.raci as string) ?? "";
    const key = `${pid}:${rid}:${letter}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!raciPersonasByProcess.has(pid)) raciPersonasByProcess.set(pid, []);
    raciPersonasByProcess.get(pid)!.push({ code: persona.role_code, name: persona.role_name ?? "", raci: letter });
    if (!raciProcessesByPersona.has(rid)) raciProcessesByPersona.set(rid, []);
    raciProcessesByPersona.get(rid)!.push({ key: proc.process_key, name: proc.process_name ?? "", raci: letter });
  }
  const byCode = (a: RaciPersonaRef, b: RaciPersonaRef) => a.code.localeCompare(b.code) || a.raci.localeCompare(b.raci);
  const byKey = (a: RaciProcessRef, b: RaciProcessRef) => a.key.localeCompare(b.key) || a.raci.localeCompare(b.raci);
  for (const v of raciPersonasByProcess.values()) v.sort(byCode);
  for (const v of raciProcessesByPersona.values()) v.sort(byKey);
}

// ---------------------------------------------------------------------------
// Release gate. personas.json and processes.json are restricted to RELEASED domains.
// A domain is released once its catalog_release date is set and on or before today, so a
// future-dated release stays hidden until its date arrives. domain-map.json is NOT filtered:
// it still lists every domain whether released or not. To treat "any catalog_release set" as
// released regardless of date, drop the `cr <= todayISO` clause below.
// ---------------------------------------------------------------------------
const todayISO = new Date().toISOString().slice(0, 10);
const releasedDomainIds = new Set<number>();
for (const d of index.domains) {
  const cr = (d.catalog_release ?? "").slice(0, 10);
  if (cr && cr <= todayISO) releasedDomainIds.add(d.id);
}
const releasedDomainCodes = new Set<string>(
  [...releasedDomainIds]
    .map((id) => index.domainsById.get(id)?.domain_code)
    .filter((c): c is string => Boolean(c)),
);
// Processes counted as "used in a released domain": the gate ∪ handoff attribution for each
// released domain (the same domain-grain attribution as domain-map.json's per-domain processes[]).
// raci-only / tool-only processes carry no domain and are therefore excluded.
const processIdsInReleasedDomains = new Set<number>();
for (const did of releasedDomainIds) {
  for (const m of modulesByDomain.get(did) ?? []) {
    for (const pid of gateProcsByModule.get(m.id) ?? []) processIdsInReleasedDomains.add(pid);
  }
  for (const pid of handoffProcsByDomain.get(did) ?? []) processIdsInReleasedDomains.add(pid);
}
console.error(
  `release gate: ${releasedDomainIds.size} released domain(s) [${[...releasedDomainCodes].sort().join(", ")}], ${processIdsInReleasedDomains.size} process(es) attributed`,
);

// ---------------------------------------------------------------------------
// personas.json: every catalog persona that REACHES a released domain (see release gate above).
// Its reverse reach (modules + domains) and the counts are PRUNED to released domains only, so an
// unreleased domain a persona also touches never appears. Personas reaching no released domain are
// dropped. (processes[] is the persona's full RACI list and is intentionally not domain-pruned.)
// ---------------------------------------------------------------------------
const modulesByPersona = new Map<number, Set<number>>();
for (const rm of all.roleModules) {
  const rid = rm.role_id as number;
  const mid = rm.domain_module_id as number;
  if (!personaById.has(rid)) continue;
  if (!modulesByPersona.has(rid)) modulesByPersona.set(rid, new Set());
  modulesByPersona.get(rid)!.add(mid);
}
const personasOut: PersonaOut[] = (all.domainRoles as any[])
  .map((p): PersonaOut => {
    // Prune reach to RELEASED domains only: keep a reached module only if one of its host
    // domains is released, and keep only those released host domains. A persona that reaches no
    // released domain ends up with empty modules/domains and is dropped by the filter below.
    const modIds = new Set<number>();
    const domIds = new Set<number>();
    for (const mid of modulesByPersona.get(p.id) ?? new Set<number>()) {
      let touchesReleased = false;
      for (const did of domainsByModule.get(mid) ?? []) {
        if (releasedDomainIds.has(did)) {
          domIds.add(did);
          touchesReleased = true;
        }
      }
      if (touchesReleased) modIds.add(mid);
    }
    const moduleCodes = [...modIds]
      .map((id) => index.modulesById.get(id)?.domain_module_code)
      .filter((c): c is string => Boolean(c))
      .sort((a, b) => a.localeCompare(b));
    const domainCodes = [...domIds]
      .map((id) => index.domainsById.get(id)?.domain_code)
      .filter((c): c is string => Boolean(c))
      .sort((a, b) => a.localeCompare(b));
    const fn = p.business_function_id != null ? functionById.get(p.business_function_id) : null;
    return {
      code: p.role_code,
      name: p.role_name ?? "",
      description: p.description ?? "",
      business_function_id: p.business_function_id ?? null,
      business_function: fn?.business_function_name ?? null,
      record_status: p.record_status ?? null,
      module_count: moduleCodes.length,
      domain_count: domainCodes.length,
      modules: moduleCodes,
      domains: domainCodes,
      processes: raciProcessesByPersona.get(p.id) ?? [],
    };
  })
  .filter((p) => p.domains.length > 0)
  .sort((a, b) => a.code.localeCompare(b.code));

// ---------------------------------------------------------------------------
// processes.json: of the processes USED somewhere (usage = gate ∪ raci ∪ handoff ∪ tool), emit
// only those attributed (gate ∪ handoff) to a RELEASED domain. See the release gate above.
// The processes table itself is the full ~2k-row APQC PCF framework; emit just the in-use subset.
// ---------------------------------------------------------------------------
const usage = new Map<number, ProcessUsage>();
const markUsed = (pid: number | null | undefined, edge: keyof ProcessUsage) => {
  if (pid == null) return;
  let u = usage.get(pid);
  if (!u) {
    u = { gate: false, raci: false, handoff: false, tool: false };
    usage.set(pid, u);
  }
  u[edge] = true;
};
for (const ls of all.lifecycle) markUsed(ls.process_id as number | null, "gate");
for (const r of all.processRaci) markUsed(r.process_id as number | null, "raci");
for (const hp of all.handoffProcesses) markUsed(hp.process_id as number | null, "handoff");
for (const pt of all.processTools) markUsed(pt.process_id as number | null, "tool");

const processesOut: ProcessOut[] = [...usage.entries()]
  .filter(([pid]) => processIdsInReleasedDomains.has(pid))
  .map(([pid, u]): ProcessOut | null => {
    const p = all.processesById.get(pid);
    if (!p) return null;
    return {
      key: p.process_key,
      code: p.process_code ?? null,
      name: p.process_name ?? "",
      external_id: p.external_id ?? null,
      hierarchy_level: p.hierarchy_level ?? null,
      source_framework: p.source_framework ?? null,
      usage: u,
      personas: raciPersonasByProcess.get(pid) ?? [],
    };
  })
  .filter((x): x is ProcessOut => x !== null)
  .sort((a, b) => a.key.localeCompare(b.key));

// Collapse named string-only arrays to one line for readability (object arrays untouched).
function collapseStringArrays(json: string, keys: string[]): string {
  const re = new RegExp(`"(${keys.join("|")})": \\[([^\\]]*)\\]`, "g");
  return json.replace(re, (_m, key, inner) => {
    const items = inner
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    return `"${key}": [${items.join(", ")}]`;
  });
}

const domainMapJson =
  collapseStringArrays(JSON.stringify({ domains: out }, null, 2), ["related_domains", "related_modules"]) + "\n";
const personasJson =
  collapseStringArrays(JSON.stringify({ personas: personasOut }, null, 2), ["modules", "domains"]) + "\n";
const processesJson = JSON.stringify({ processes: processesOut }, null, 2) + "\n";

if (STDOUT) {
  process.stdout.write(domainMapJson);
} else {
  const moduleEntries = out.reduce((n, d) => n + d.modules.length, 0);
  writeFileSync(OUT_PATH, domainMapJson, "utf8");
  console.log(`wrote ${OUT_PATH} (${out.length} domains, ${moduleEntries} module entries)`);
  writeFileSync(PERSONAS_OUT_PATH, personasJson, "utf8");
  console.log(`wrote ${PERSONAS_OUT_PATH} (${personasOut.length} personas)`);
  writeFileSync(PROCESSES_OUT_PATH, processesJson, "utf8");
  console.log(
    `wrote ${PROCESSES_OUT_PATH} (${processesOut.length} processes used of ${all.processes.length} total)`,
  );
}
