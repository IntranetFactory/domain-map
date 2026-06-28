#!/usr/bin/env bun
// scripts/emit_domain_map.ts
//
// Emits FOUR catalog artifacts under catalog/domain-map/:
//
//   domain-map.json  — every domain with code, name, description, catalog_release date,
//                      business_functions[] (the function<->domain market RACI: owner / contributor /
//                      consumer, from business_function_domains), modules,
//                      related_domains (codes), plus personas[] and processes[] both at the
//                      domain grain and nested per module (modules[].personas / .processes).
//                      Each domain also carries module_personas[] / module_processes[]: the dedup
//                      rollup of its modules' personas/processes, recomputed from the emitted module
//                      objects (an independent path). module_personas ALWAYS equals personas (there
//                      is no domain-grain persona source, so it is a built-in cross-check). By
//                      contrast module_processes is the "anchored in a module" subset of processes:
//                      processes additionally includes domain-seam handoff payloads that no module
//                      anchors, ~94% of which are realized nowhere (B9d orphans) and ~6% realized in
//                      a neighbor domain across the seam.
//   personas.json    — every catalog persona (domain_roles), with its business function and
//                      the modules / domains its role_modules reach touches.
//   processes.json    — only the processes USED somewhere in the catalog (the processes table is
//                      the full ~2k-row APQC PCF framework; we emit just the in-use subset).
//   business-functions.json - the function-centric inverse of domain-map.json's business_functions[]:
//                      every business_functions row with the domains it owns/contributes-to/consumes
//                      (business_function_domains), the personas that belong to it
//                      (domain_roles.business_function_id, LITERAL membership), and a raci[] reveal: the
//                      per-market (persona, process, RACI-letter) triples for that function. raci[] rows
//                      cover the function's OWN personas, its descendant sub-functions' personas
//                      (parent_business_function_id roll-up), and owner-anchored cross-functional "seam"
//                      personas (a NULL-business_function persona attaches only to the function whose
//                      subtree OWNS the domain its work touches, never to that domain's consumers). Each
//                      row is self-describing: domain, the function's responsibility on it, persona, how
//                      the persona attaches (persona_via: own/descendant/seam), process, and letter, so
//                      "who is R/A/C/I for market D" is answerable without joining personas.json.
//                      `personas[]` stays the literal membership list; `actor_personas[]` is the dedup
//                      roll-up of the persona codes in raci[] (own + descendant + seam); `parent` is
//                      emitted for tree nav.
//
// RELEASE GATE (all four artifacts, consistent). By DEFAULT every file is restricted to RELEASED
// domains (catalog_release set and on/before today) and the data related to them: domain-map.json
// lists only released domains with cross-references pruned to them; personas.json / business-
// functions.json keep only personas/functions touching a released domain; processes.json keeps only
// processes attributed to a released domain. Pass --all to drop the filter and emit the full internal
// topology (every domain, like the pre-gate behavior). catalog_release is the public web-site-catalog
// go-live date, so "released" == "live on the public catalog".
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
// blueprint emitter (generate_blueprints.ts) share one source for the underlying tables.
//
// Usage:
//   bun run scripts/emit_domain_map.ts                       # write all four under catalog/ (RELEASED only, as of today)
//   bun run scripts/emit_domain_map.ts --released-any        # released = any catalog_release date (future-scheduled too)
//   bun run scripts/emit_domain_map.ts --all                 # no release filter: every domain
//   bun run scripts/emit_domain_map.ts --out path.json       # custom domain-map output path
//   bun run scripts/emit_domain_map.ts --personas-out p.json # custom personas output path
//   bun run scripts/emit_domain_map.ts --processes-out q.json# custom processes output path
//   bun run scripts/emit_domain_map.ts --functions-out f.json# custom business-functions output path
//   bun run scripts/emit_domain_map.ts --stdout              # print domain-map to stdout, write nothing

export {};

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { argv } from "node:process";
import {
  isDomainReleased,
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
// The four JSON snapshots live in their own folder, catalog/domain-map/, separate from the
// blueprints/ and skills/ siblings. Override any single path with the matching --*-out flag.
const OUT_PATH = flagValue("--out") ?? "c:/dev/domain-map/catalog/domain-map/domain-map.json";
const PERSONAS_OUT_PATH = flagValue("--personas-out") ?? "c:/dev/domain-map/catalog/domain-map/personas.json";
const PROCESSES_OUT_PATH = flagValue("--processes-out") ?? "c:/dev/domain-map/catalog/domain-map/processes.json";
const FUNCTIONS_OUT_PATH = flagValue("--functions-out") ?? "c:/dev/domain-map/catalog/domain-map/business-functions.json";

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

// Business function attached to a domain via business_function_domains (the function<->domain
// "market RACI"). responsibility is the full enum word: "owner" | "contributor" | "consumer".
type BusinessFunctionRef = {
  name: string;
  responsibility: string;
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
  description: string; // analyst voice (domain_modules.description); NOT for public surfaces
  catalog_tagline: string; // buyer voice (domain_modules.catalog_tagline); the public card copy
  catalog_description: string; // buyer voice (domain_modules.catalog_description); the public detail copy
  personas: PersonaRef[];
  processes: ProcessRef[];
  related_modules: string[];
};

type DomainOut = {
  code: string;
  name: string;
  description: string; // analyst voice (domains.description); NOT for public surfaces
  catalog_tagline: string; // buyer voice (domains.catalog_tagline); the public landing copy
  catalog_description: string; // buyer voice (domains.catalog_description); the public landing detail copy
  domain_kind: string; // established_market | emerging_market | bundle (plan: domain-kind taxonomy)
  catalog_release: string | null;
  business_functions: BusinessFunctionRef[]; // functions owning/contributing-to/consuming this domain
  modules: ModuleOut[];
  personas: PersonaRef[];
  module_personas: PersonaRef[]; // dedup rollup of modules[].personas; MUST equal personas (cross-check)
  processes: ProcessRef[];
  module_processes: ProcessRef[]; // dedup rollup of modules[].processes; the "anchored in a module" subset of processes
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

// A domain a function touches, with the function's responsibility on it (business_function_domains).
type DomainRespRef = {
  code: string;
  responsibility: string; // "owner" | "contributor" | "consumer"
};

// One per-market RACI fact on a function: a (persona, process, letter) triple scoped to a domain the
// function declares. persona_via records how the actor attaches: own (business_function_id == fn),
// descendant (a sub-function under parent_business_function_id), or seam (a cross-functional persona,
// NULL business_function_id, owner-anchored to a domain this function's subtree owns).
type FunctionRaciRef = {
  domain: string; // a market the function declares (or "(undeclared)" for own/descendant work outside it)
  responsibility: string; // the strongest responsibility over the function's subtree on that domain: owner | contributor | consumer
  persona: string; // role_code of the actor
  persona_via: string; // own | descendant | seam
  process_code: string | null; // APQC PCF dotted code, e.g. "1.2.5"
  process_key: string;
  process_name: string;
  raci: string; // responsible | accountable | consulted | informed
};

type BusinessFunctionOut = {
  name: string;
  description: string | null;
  parent: string | null; // parent_business_function_id resolved to its name (tree navigation)
  record_status: string | null;
  domain_count: number;
  persona_count: number;
  domains: DomainRespRef[]; // domains this function owns/contributes-to/consumes
  personas: string[]; // role_codes of personas whose business_function_id is this function (LITERAL members)
  actor_personas: string[]; // dedup roll-up of the persona codes appearing in raci[] (own + descendant + seam actors)
  raci: FunctionRaciRef[]; // per-market (persona, process, RACI-letter) triples; see FunctionRaciRef
};

// --cache emits from the local cache file without a server refresh (offline / fast iteration).
// Default is the regenerate-everything path: force a fresh fetch and rewrite the cache.
const USE_CACHE = args.includes("--cache");
const t0 = Date.now();
const { index, all }: { index: CatalogIndex; all: AllRelationships } = await loadCachedCatalog(
  USE_CACHE ? { forceRefresh: false, ttlMs: Number.MAX_SAFE_INTEGER } : { forceRefresh: true },
);
console.error(`bulk-loaded catalog + relationships in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// ---------------------------------------------------------------------------
// Release gate (unified across ALL FOUR artifacts). A domain is RELEASED once its catalog_release
// date is set and on or before today (a future-dated release stays hidden until its date arrives).
// catalog_release is the scheduled public web-site-catalog go-live date; "released" therefore means
// "live on the public catalog". By DEFAULT every artifact is restricted to released domains and the
// data related to them. The --all flag drops the filter (treats every domain as released), producing
// the full internal topology. To treat "any catalog_release set" as released regardless of date, drop
// the `cr <= todayISO` clause below.
// ---------------------------------------------------------------------------
const ALL = args.includes("--all");
// --released-any treats ANY catalog_release date as released (future-scheduled included), the
// "earmarked for the catalog" sense build_catalog uses. Default keeps the "live as of today" gate
// (release date on/before today), so a future-dated domain stays hidden until its date arrives.
const RELEASED_ANY = args.includes("--released-any");
const todayISO = new Date().toISOString().slice(0, 10);
const releaseAsOf = RELEASED_ANY ? undefined : todayISO;
const releasedDomainIds = new Set<number>();
for (const d of index.domains) {
  if (isDomainReleased(d, releaseAsOf)) releasedDomainIds.add(d.id);
}
// The gate the artifacts actually filter on: released-only by default, every domain under --all.
const gateDomainIds = ALL ? new Set<number>(index.domains.map((d) => d.id)) : releasedDomainIds;
const gateDomainCodes = new Set<string>(
  [...gateDomainIds].map((id) => index.domainsById.get(id)?.domain_code).filter((c): c is string => Boolean(c)),
);
// The strictly-released codes (independent of --all). The catalog-copy publish gate below keys on
// these: only released domains are actually published, so only they must carry buyer-voice copy.
const releasedDomainCodes = new Set<string>(
  [...releasedDomainIds].map((id) => index.domainsById.get(id)?.domain_code).filter((c): c is string => Boolean(c)),
);
console.error(
  ALL
    ? `release gate: --all (no filter), ${gateDomainIds.size} domain(s)`
    : `release gate: released-only (${RELEASED_ANY ? "any date" : "as of today"}), ${releasedDomainIds.size} released domain(s) [${[...gateDomainCodes].sort().join(", ")}]`,
);

// A domain's module grid is its PRIMARY modules only (domain_modules.domain_id). A module never
// appears as a card on a domain it merely embeds an entity from: a starter that embeds CLM's
// `legal_contracts` consumes from CLM, it does not add a module to CLM, so it renders only on its
// own (bundle) domain. The cross-market "touches" relationship is carried by related_domains, not
// by the module grid. (Formerly this folded in the dropped `domain_module_host_domains` junction,
// which only ever held starter host rows; see references/deprecations.md.)
const modulesByDomain = new Map<number, ModuleRow[]>();
for (const m of index.modules) {
  if (m.domain_id === null) continue;
  if (!modulesByDomain.has(m.domain_id)) modulesByDomain.set(m.domain_id, []);
  modulesByDomain.get(m.domain_id)!.push(m);
}

// data_objects touched by a domain = domain_data_objects ∪ (the domain's PRIMARY modules →
// domain_module_data_objects). A starter's embedded entities attribute to the starter's own
// (bundle) domain, not to every market it embeds from; cross-market relatedness is still recovered
// by the master/touch rule below (the bundle touches `legal_contracts`, CLM masters it → related).
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

// Business functions per domain via business_function_domains (the function<->domain "market RACI":
// owner / contributor / consumer). Dedup per function within a domain, strongest responsibility wins.
const RESPONSIBILITY_RANK: Record<string, number> = { owner: 0, contributor: 1, consumer: 2 };
function strongerResponsibility(a: string, b: string): string {
  return (RESPONSIBILITY_RANK[a] ?? 9) <= (RESPONSIBILITY_RANK[b] ?? 9) ? a : b;
}
const functionRespByDomain = new Map<number, Map<number, string>>(); // domainId -> fnId -> responsibility
for (const r of all.businessFunctionDomains) {
  const did = r.domain_id as number | null;
  const fid = r.business_function_id as number | null;
  if (did == null || fid == null || !functionById.has(fid)) continue;
  if (!functionRespByDomain.has(did)) functionRespByDomain.set(did, new Map());
  const bucket = functionRespByDomain.get(did)!;
  const resp = (r.responsibility_type as string) ?? "consumer";
  bucket.set(fid, bucket.has(fid) ? strongerResponsibility(bucket.get(fid)!, resp) : resp);
}
function businessFunctionRefs(did: number): BusinessFunctionRef[] {
  const bucket = functionRespByDomain.get(did);
  if (!bucket) return [];
  return [...bucket.entries()]
    .map(([fid, resp]) => {
      const fn = functionById.get(fid);
      return fn ? { name: (fn.business_function_name as string) ?? "", responsibility: resp } : null;
    })
    .filter((x): x is BusinessFunctionRef => x !== null)
    .sort(
      (a, b) =>
        (RESPONSIBILITY_RANK[a.responsibility] ?? 9) - (RESPONSIBILITY_RANK[b.responsibility] ?? 9) ||
        a.name.localeCompare(b.name),
    );
}

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
        catalog_tagline: m.catalog_tagline ?? "",
        catalog_description: m.catalog_description ?? "",
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

  // Module-grain rollups, recomputed from the EMITTED module objects (independent of the
  // personas / processes paths above). module_personas dedups by code, strongest interaction wins,
  // and must equal `personas`. module_processes dedups by key, gate wins `via`, and is the subset of
  // `processes` that is anchored in a module (it omits the domain-seam handoff payloads).
  const mpByCode = new Map<string, PersonaRef>();
  for (const m of mods)
    for (const p of m.personas) {
      const ex = mpByCode.get(p.code);
      mpByCode.set(
        p.code,
        ex ? { ...p, interaction_level: strongerInteraction(ex.interaction_level, p.interaction_level) } : p,
      );
    }
  const modulePersonas = [...mpByCode.values()].sort((a, b) => a.code.localeCompare(b.code));

  const mprByKey = new Map<string, ProcessRef>();
  for (const m of mods)
    for (const pr of m.processes) {
      const ex = mprByKey.get(pr.key);
      if (!ex || (ex.via !== "gate" && pr.via === "gate")) mprByKey.set(pr.key, pr);
    }
  const moduleProcesses = [...mprByKey.values()].sort((a, b) => a.key.localeCompare(b.key));

  out.push({
    code: d.domain_code,
    name: d.domain_name,
    description: d.description ?? "",
    catalog_tagline: d.catalog_tagline ?? "",
    catalog_description: d.catalog_description ?? "",
    domain_kind: d.domain_kind,
    catalog_release: d.catalog_release ?? null,
    business_functions: businessFunctionRefs(d.id),
    modules: mods,
    personas: personaRefs(personaLevelByDomain.get(d.id) ?? new Map()),
    module_personas: modulePersonas,
    processes: processRefsForDomain(d.id),
    module_processes: moduleProcesses,
    related_domains: relatedCodes,
  });
}

out.sort((a, b) => a.code.localeCompare(b.code));

// Apply the release gate to domain-map.json: keep only gated (released, or all under --all) domains,
// then prune cross-references so nothing dangles to a domain/module absent from the gated file.
// related_domains -> gated domain codes; related_modules -> modules hosted on some gated domain.
const gatedOut = out.filter((d) => gateDomainCodes.has(d.code));
const gatedModuleCodes = new Set<string>();
for (const d of gatedOut) for (const m of d.modules) gatedModuleCodes.add(m.code);
for (const d of gatedOut) {
  d.related_domains = d.related_domains.filter((c) => gateDomainCodes.has(c));
  for (const m of d.modules) m.related_modules = m.related_modules.filter((c) => gatedModuleCodes.has(c));
}

// Cross-check: module_personas (rolled up from the emitted modules) must equal the independently
// computed personas for every domain. A mismatch means the two attribution paths diverged (a bug).
// module_processes is intentionally a subset of processes (it omits domain-seam handoff payloads),
// so we only report the size of that seam delta, we do not assert equality.
let personaCheckFailures = 0;
for (const d of gatedOut) {
  const a = d.personas.map((p) => p.code).join(",");
  const b = d.module_personas.map((p) => p.code).join(",");
  if (a !== b) {
    personaCheckFailures++;
    console.error(`WARN ${d.code}: personas != module_personas (${a} vs ${b})`);
  }
}
const seamDelta = gatedOut.reduce((n, d) => n + (d.processes.length - d.module_processes.length), 0);
console.error(
  `module rollups: persona cross-check ${personaCheckFailures === 0 ? "PASSED" : `FAILED (${personaCheckFailures})`} across ${gatedOut.length} domains; ${seamDelta} seam-only process attribution(s) in processes[] beyond module_processes[]`,
);
const domainsWithFunctions = gatedOut.filter((d) => d.business_functions.length > 0).length;
console.error(
  `business_functions: ${domainsWithFunctions}/${gatedOut.length} domains carry >=1 function (from business_function_domains)`,
);

// ---------------------------------------------------------------------------
// Persona <-> process responsibility (process_raci): both cross-reference directions.
// personas[] per process (processes.json) and processes[] per persona (personas.json).
// Skill actors (actor_skill_id) are excluded; only persona actors carry a role_code.
// ---------------------------------------------------------------------------
const raciPersonasByProcess = new Map<number, RaciPersonaRef[]>();
const raciProcessesByPersona = new Map<number, RaciProcessRef[]>();
// Same process_raci facts keyed by role_id but carrying the process_id (the B9e reveal needs the pid to
// look up a process's domain attribution; RaciProcessRef carries only the process_key).
const raciPidsByPersona = new Map<number, { pid: number; letter: string }[]>();
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
    if (!raciPidsByPersona.has(rid)) raciPidsByPersona.set(rid, []);
    raciPidsByPersona.get(rid)!.push({ pid, letter });
  }
  const byCode = (a: RaciPersonaRef, b: RaciPersonaRef) => a.code.localeCompare(b.code) || a.raci.localeCompare(b.raci);
  const byKey = (a: RaciProcessRef, b: RaciProcessRef) => a.key.localeCompare(b.key) || a.raci.localeCompare(b.raci);
  for (const v of raciPersonasByProcess.values()) v.sort(byCode);
  for (const v of raciProcessesByPersona.values()) v.sort(byKey);
}

// Processes counted as "used in a gated domain": the gate ∪ handoff attribution for each gated
// (released-only by default, all under --all) domain, the same domain-grain attribution as
// domain-map.json's per-domain processes[]. raci-only / tool-only processes carry no domain and are
// therefore excluded. (gateDomainIds / releasedDomainIds were computed up front by the release gate.)
const processIdsInGatedDomains = new Set<number>();
for (const did of gateDomainIds) {
  for (const m of modulesByDomain.get(did) ?? []) {
    for (const pid of gateProcsByModule.get(m.id) ?? []) processIdsInGatedDomains.add(pid);
  }
  for (const pid of handoffProcsByDomain.get(did) ?? []) processIdsInGatedDomains.add(pid);
}

// ---------------------------------------------------------------------------
// personas.json: every catalog persona that REACHES a gated domain (released-only by default, every
// domain under --all). Its reverse reach (modules + domains) and the counts are PRUNED to gated
// domains only, so a non-gated domain a persona also touches never appears. Personas reaching no
// gated domain are dropped. (processes[] is the persona's full RACI list and is not domain-pruned.)
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
    // Prune reach to GATED domains only: keep a reached module only if one of its domains is
    // gated, and keep only those gated domains. A persona that reaches no gated domain ends up
    // with empty modules/domains and is dropped by the filter below.
    const modIds = new Set<number>();
    const domIds = new Set<number>();
    for (const mid of modulesByPersona.get(p.id) ?? new Set<number>()) {
      let touchesGate = false;
      for (const did of domainsByModule.get(mid) ?? []) {
        if (gateDomainIds.has(did)) {
          domIds.add(did);
          touchesGate = true;
        }
      }
      if (touchesGate) modIds.add(mid);
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
// only those attributed (gate ∪ handoff) to a GATED domain (released-only by default, every domain
// under --all). See the release gate above. The processes table itself is the full ~2k-row APQC PCF
// framework; emit just the in-use subset.
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
  .filter(([pid]) => processIdsInGatedDomains.has(pid))
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

// ---------------------------------------------------------------------------
// business-functions.json: the function-centric inverse of domain-map.json's per-domain
// business_functions[]. Every business_functions row, with the domains it owns/contributes-to/
// consumes (business_function_domains) and the personas that belong to it
// (domain_roles.business_function_id). GATED like the other three: domains[] is pruned to gated
// domains (released-only by default, every domain under --all) and personas[] to those reaching a
// gated domain (the same persona set as personas.json); a function left with no gated domain AND no
// gated persona is dropped. Links are LITERAL per function: personas and domains are NOT rolled up
// through the parent_business_function_id hierarchy; `parent` is emitted so a consumer can navigate
// the tree. RESPONSIBILITY_RANK / strongerResponsibility are reused from the domain-grain
// business_functions attribution above.
// ---------------------------------------------------------------------------
// Personas that survive the gate (reach >=1 gated domain) = exactly the personas.json set.
const gatePersonaCodes = new Set<string>(personasOut.map((p) => p.code));
const domainRespByFunction = new Map<number, Map<number, string>>(); // fnId -> domainId -> responsibility
for (const r of all.businessFunctionDomains) {
  const did = r.domain_id as number | null;
  const fid = r.business_function_id as number | null;
  if (did == null || fid == null) continue;
  if (!domainRespByFunction.has(fid)) domainRespByFunction.set(fid, new Map());
  const bucket = domainRespByFunction.get(fid)!;
  const resp = (r.responsibility_type as string) ?? "consumer";
  bucket.set(did, bucket.has(did) ? strongerResponsibility(bucket.get(did)!, resp) : resp);
}
const personaCodesByFunction = new Map<number, string[]>();
for (const p of all.domainRoles as any[]) {
  const fid = p.business_function_id as number | null;
  if (fid == null) continue;
  if (!personaCodesByFunction.has(fid)) personaCodesByFunction.set(fid, []);
  personaCodesByFunction.get(fid)!.push(p.role_code as string);
}

// --- B9e per-function RACI reveal: helper indices --------------------------------------------------
// Subtree under parent_business_function_id (fnId -> own id + all descendant ids).
const childrenByFunction = new Map<number, number[]>();
for (const fn of all.businessFunctions as any[]) {
  const ppid = fn.parent_business_function_id as number | null;
  if (ppid == null) continue;
  if (!childrenByFunction.has(ppid)) childrenByFunction.set(ppid, []);
  childrenByFunction.get(ppid)!.push(fn.id as number);
}
function subtreeOf(fid: number): Set<number> {
  const acc = new Set<number>([fid]);
  const stack = [fid];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const ch of childrenByFunction.get(cur) ?? []) if (!acc.has(ch)) { acc.add(ch); stack.push(ch); }
  }
  return acc;
}
// Personas keyed by role_id per OWN function (role_id reaches the RACI map); cross-functional ones split out.
const personaIdsByFunction = new Map<number, number[]>();
const crossFunctionalPersonaIds: number[] = [];
for (const p of all.domainRoles as any[]) {
  const fid = p.business_function_id as number | null;
  if (fid == null) {
    crossFunctionalPersonaIds.push(p.id as number);
    continue;
  }
  if (!personaIdsByFunction.has(fid)) personaIdsByFunction.set(fid, []);
  personaIdsByFunction.get(fid)!.push(p.id as number);
}
// Process -> domains it is attributed to, for the per-market reveal. GATE-DOMINANT: a process's markets
// are the domains that GATE it (own / run it). Handoff attribution is only a FALLBACK for a process gated
// nowhere (handoff-only processes such as monitor_evaluate_learning), so a process gated in domain X does
// not bleed into domain Y merely because it is handed off across the X-Y seam. Mirrors the
// gate-wins-over-handoff rule the per-domain processes[] already uses for `via`.
const attribDomainsByProcess = new Map<number, Set<number>>();
{
  const gateDoms = new Map<number, Set<number>>();
  const handoffDoms = new Map<number, Set<number>>();
  const add = (m: Map<number, Set<number>>, pid: number, did: number) => {
    if (!m.has(pid)) m.set(pid, new Set());
    m.get(pid)!.add(did);
  };
  for (const [did, mods] of modulesByDomain)
    for (const mod of mods) for (const pid of gateProcsByModule.get(mod.id) ?? []) add(gateDoms, pid, did);
  for (const [did, pids] of handoffProcsByDomain) for (const pid of pids) add(handoffDoms, pid, did);
  for (const pid of new Set<number>([...gateDoms.keys(), ...handoffDoms.keys()])) {
    const g = gateDoms.get(pid);
    attribDomainsByProcess.set(pid, g && g.size > 0 ? g : handoffDoms.get(pid) ?? new Set<number>());
  }
}
const RACI_RANK: Record<string, number> = { accountable: 0, responsible: 1, consulted: 2, informed: 3 };
const functionsOut: BusinessFunctionOut[] = (all.businessFunctions as any[])
  .map((fn): BusinessFunctionOut => {
    const domains = [...(domainRespByFunction.get(fn.id) ?? new Map<number, string>()).entries()]
      .filter(([did]) => gateDomainIds.has(did)) // prune to gated domains
      .map(([did, resp]) => {
        const dom = index.domainsById.get(did);
        return dom ? { code: dom.domain_code, responsibility: resp } : null;
      })
      .filter((x): x is DomainRespRef => x !== null)
      .sort(
        (a, b) =>
          (RESPONSIBILITY_RANK[a.responsibility] ?? 9) - (RESPONSIBILITY_RANK[b.responsibility] ?? 9) ||
          a.code.localeCompare(b.code),
      );
    const personas = (personaCodesByFunction.get(fn.id) ?? [])
      .filter((code) => gatePersonaCodes.has(code)) // prune to personas that reach a gated domain
      .slice()
      .sort((a, b) => a.localeCompare(b));

    // --- B9e: per-market RACI triple (who is R/A/C/I for each of this function's markets) ----------
    const subtree = subtreeOf(fn.id);
    const declaredResp = new Map<number, string>(); // gated domainId -> strongest responsibility over subtree
    const ownedDomainIds = new Set<number>(); // gated domains the subtree OWNS (the only seam anchor)
    for (const sfid of subtree) {
      for (const [did, resp] of domainRespByFunction.get(sfid) ?? new Map<number, string>()) {
        if (!gateDomainIds.has(did)) continue;
        declaredResp.set(did, declaredResp.has(did) ? strongerResponsibility(declaredResp.get(did)!, resp) : resp);
        if (resp === "owner") ownedDomainIds.add(did);
      }
    }
    type Actor = { roleId: number; via: "own" | "descendant" | "seam" };
    const actors: Actor[] = [];
    const seenActor = new Set<number>();
    const pushActor = (roleId: number, via: Actor["via"]) => {
      const pr = personaById.get(roleId);
      if (!pr || !gatePersonaCodes.has(pr.role_code as string)) return; // released reach only
      if (seenActor.has(roleId)) return;
      seenActor.add(roleId);
      actors.push({ roleId, via });
    };
    for (const rid of personaIdsByFunction.get(fn.id) ?? []) pushActor(rid, "own");
    for (const sfid of subtree) {
      if (sfid === fn.id) continue;
      for (const rid of personaIdsByFunction.get(sfid) ?? []) pushActor(rid, "descendant");
    }
    // Owner-anchored seam: a cross-functional persona attaches ONLY to the function whose subtree owns a
    // domain its RACI work is attributed to (never to that domain's consumers/contributors).
    if (ownedDomainIds.size > 0) {
      for (const rid of crossFunctionalPersonaIds) {
        const touchesOwned = (raciPidsByPersona.get(rid) ?? []).some(({ pid }) => {
          for (const did of attribDomainsByProcess.get(pid) ?? []) if (ownedDomainIds.has(did)) return true;
          return false;
        });
        if (touchesOwned) pushActor(rid, "seam");
      }
    }
    const raci: FunctionRaciRef[] = [];
    const seenRaciRow = new Set<string>();
    for (const a of actors) {
      const pr = personaById.get(a.roleId)!;
      const pcode = pr.role_code as string;
      const scope = a.via === "seam" ? ownedDomainIds : new Set<number>(declaredResp.keys());
      for (const { pid, letter } of raciPidsByPersona.get(a.roleId) ?? []) {
        const proc = all.processesById.get(pid);
        if (!proc) continue;
        const markets = [...(attribDomainsByProcess.get(pid) ?? new Set<number>())].filter((did) => scope.has(did));
        const emit = (domainCode: string, resp: string) => {
          const k = `${domainCode}|${pcode}|${proc.process_key}|${letter}`;
          if (seenRaciRow.has(k)) return;
          seenRaciRow.add(k);
          raci.push({
            domain: domainCode,
            responsibility: resp,
            persona: pcode,
            persona_via: a.via,
            process_code: (proc.process_code as string) ?? null,
            process_key: proc.process_key as string,
            process_name: (proc.process_name as string) ?? "",
            raci: letter,
          });
        };
        if (markets.length > 0) {
          for (const did of markets) {
            const dom = index.domainsById.get(did);
            if (dom) emit(dom.domain_code, declaredResp.get(did) ?? "consumer");
          }
        } else if (a.via !== "seam") {
          // own/descendant actor with RACI work outside every declared market: surface, never drop.
          emit("(undeclared)", "(undeclared)");
        }
      }
    }
    raci.sort(
      (x, y) =>
        x.domain.localeCompare(y.domain) ||
        (RESPONSIBILITY_RANK[x.responsibility] ?? 9) - (RESPONSIBILITY_RANK[y.responsibility] ?? 9) ||
        x.process_key.localeCompare(y.process_key) ||
        (RACI_RANK[x.raci] ?? 9) - (RACI_RANK[y.raci] ?? 9) ||
        x.persona.localeCompare(y.persona),
    );
    const actorPersonas = [...new Set(raci.map((r) => r.persona))].sort((a, b) => a.localeCompare(b));

    const parent =
      fn.parent_business_function_id != null
        ? functionById.get(fn.parent_business_function_id)?.business_function_name ?? null
        : null;
    return {
      name: (fn.business_function_name as string) ?? "",
      description: (fn.description as string) ?? null,
      parent,
      record_status: (fn.record_status as string) ?? null,
      domain_count: domains.length,
      persona_count: personas.length,
      domains,
      personas,
      actor_personas: actorPersonas,
      raci,
    };
  })
  // Drop functions with no gated domain AND no gated persona (nothing related to a gated domain).
  .filter((f) => f.domain_count > 0 || f.persona_count > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

// B9e set-consistency cross-check: every actor named in a function's raci[] is either a literal member
// (persona_via "own", present in personas[]) or explicitly tagged descendant/seam. A row whose "own"
// persona is not a member, or whose via is unknown, is a bug (the rev.9 split-set failure mode).
let raciCheckFailures = 0;
let raciRowTotal = 0;
let functionsWithRaci = 0;
for (const f of functionsOut) {
  const members = new Set(f.personas);
  if (f.raci.length > 0) functionsWithRaci++;
  raciRowTotal += f.raci.length;
  for (const row of f.raci) {
    const okVia = row.persona_via === "own" || row.persona_via === "descendant" || row.persona_via === "seam";
    const ownIsMember = row.persona_via === "own" ? members.has(row.persona) : true;
    if (!okVia || !ownIsMember) {
      raciCheckFailures++;
      console.error(`WARN ${f.name}: raci persona ${row.persona} via=${row.persona_via} fails set-consistency`);
    }
  }
}
const emptyRaciFns = functionsOut.filter((f) => f.raci.length === 0).map((f) => f.name);
console.error(
  `business-functions RACI: ${functionsWithRaci}/${functionsOut.length} functions carry rows, ${raciRowTotal} rows total; ` +
    `set-consistency ${raciCheckFailures === 0 ? "PASSED" : `FAILED (${raciCheckFailures})`}; ` +
    `empty (Phase-2 backlog): ${emptyRaciFns.length ? emptyRaciFns.join(", ") : "none"}`,
);
// Hard guard: a split persona set (an "own" actor that is not a member, or an unknown via) is the
// rev.9 bug this whole reveal was rebuilt to prevent. Fail the emit (non-zero exit) on any mismatch.
if (raciCheckFailures > 0) process.exitCode = 1;
for (const f of functionsOut) {
  if (f.raci.length === 0) continue;
  const byLetter: Record<string, number> = {};
  for (const row of f.raci) byLetter[row.raci] = (byLetter[row.raci] ?? 0) + 1;
  const byVia: Record<string, number> = {};
  for (const row of f.raci) byVia[row.persona_via] = (byVia[row.persona_via] ?? 0) + 1;
  const markets = [...new Set(f.raci.map((r) => r.domain))].sort().join("/");
  console.error(`  ${f.name}: ${f.raci.length} rows [${markets}] letters=${JSON.stringify(byLetter)} via=${JSON.stringify(byVia)}`);
}

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
  collapseStringArrays(JSON.stringify({ domains: gatedOut }, null, 2), ["related_domains", "related_modules"]) + "\n";
const personasJson =
  collapseStringArrays(JSON.stringify({ personas: personasOut }, null, 2), ["modules", "domains"]) + "\n";
const processesJson = JSON.stringify({ processes: processesOut }, null, 2) + "\n";
// Only `personas` (a role_code string[]) is collapsed; `domains` is an object array (untouched).
const functionsJson =
  collapseStringArrays(JSON.stringify({ business_functions: functionsOut }, null, 2), ["personas", "actor_personas"]) + "\n";

// ---------------------------------------------------------------------------
// Catalog-copy publish gate (Rule #20). emit_domain_map feeds the PUBLIC site catalog, so every
// RELEASED domain and every module it publishes MUST carry buyer-voice copy. An empty
// catalog_tagline / catalog_description would surface analyst-voice `description` (or a blank) on a
// public card, so refuse to emit ANY artifact and list every offender. Unreleased domains are not
// published and are exempt (their copy is backfilled before release). Backfill flow is draft ->
// q-file approval -> write (Rule #20 / Rule #22); the emitter never authors the copy, it only
// refuses to publish without it.
// ---------------------------------------------------------------------------
const catalogCopyOffenders: string[] = [];
for (const d of gatedOut) {
  if (!releasedDomainCodes.has(d.code)) continue; // gate only the published (released) set
  if (!d.catalog_tagline.trim()) catalogCopyOffenders.push(`domain ${d.code}: catalog_tagline empty`);
  if (!d.catalog_description.trim()) catalogCopyOffenders.push(`domain ${d.code}: catalog_description empty`);
  for (const m of d.modules) {
    if (!m.catalog_tagline.trim()) catalogCopyOffenders.push(`module ${m.code} (on ${d.code}): catalog_tagline empty`);
    if (!m.catalog_description.trim())
      catalogCopyOffenders.push(`module ${m.code} (on ${d.code}): catalog_description empty`);
  }
}
if (catalogCopyOffenders.length > 0) {
  console.error(
    `\nERROR: refusing to emit. ${catalogCopyOffenders.length} released domain/module catalog-copy field(s) are empty (Rule #20):`,
  );
  for (const o of catalogCopyOffenders) console.error(`  - ${o}`);
  console.error(
    `\nBuyer-voice catalog_tagline / catalog_description must be backfilled (draft -> q-file approval -> write) before publishing. No files were written.`,
  );
  process.exit(1);
}

const mode = ALL ? "--all (unfiltered)" : RELEASED_ANY ? "released-only (any date)" : "released-only (as of today)";
if (STDOUT) {
  process.stdout.write(domainMapJson);
} else {
  const moduleEntries = gatedOut.reduce((n, d) => n + d.modules.length, 0);
  for (const p of [OUT_PATH, PERSONAS_OUT_PATH, PROCESSES_OUT_PATH, FUNCTIONS_OUT_PATH]) {
    mkdirSync(dirname(p), { recursive: true });
  }
  writeFileSync(OUT_PATH, domainMapJson, "utf8");
  console.log(`wrote ${OUT_PATH} (${gatedOut.length} domains, ${moduleEntries} module entries) [${mode}]`);
  writeFileSync(PERSONAS_OUT_PATH, personasJson, "utf8");
  console.log(`wrote ${PERSONAS_OUT_PATH} (${personasOut.length} personas) [${mode}]`);
  writeFileSync(PROCESSES_OUT_PATH, processesJson, "utf8");
  console.log(
    `wrote ${PROCESSES_OUT_PATH} (${processesOut.length} processes used of ${all.processes.length} total) [${mode}]`,
  );
  writeFileSync(FUNCTIONS_OUT_PATH, functionsJson, "utf8");
  console.log(`wrote ${FUNCTIONS_OUT_PATH} (${functionsOut.length} business functions) [${mode}]`);
}
