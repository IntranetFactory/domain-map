// scripts/lib/health/logic_sam.ts
//
// Pure logic for the S, A and M bands of the per-domain health check (checks_s.ts, checks_a.ts,
// checks_m.ts). Every function takes plain rows and returns health findings (or, where another
// script needs its own output, a structured result). No I/O: the band files fetch, this decides.
//
// Each `check*` function returns the check's COMPLETE findings: the fail / warn findings, or one
// `pass` finding carrying a count summary when nothing is wrong. Its row-id type is named in the
// function comment and in the findings' `detail`.
//
// Ported from (the originals keep their own copy until a later pass rewires them here):
//   scripts/analytics/audit_backlog.ts                  A1 (domainMetadataGaps), A2, M1
//   scripts/analytics/phase_p_triage.ts                 M9 entity layer (entitySelfContainment)
//   scripts/analytics/required_edge_presence_probe.ts   required-edge target classification
// Where SKILL.md is stricter than the original, SKILL.md wins; each function notes the delta.

import { oneSide } from "../catalog_invariants.ts";
import type { Finding, Result } from "./types.ts";

export type RowId = number | string;
export type NameOf = (dataObjectId: number) => string;
export type Labels = { nameOf?: NameOf; moduleCode?: (moduleId: number) => string };

// ---------- catalog-wide selects shared by the S / A / M band files ----------
//
// One path string per table, so the ctx.query memo serves every check (and every domain in an
// --all run) from one fetch. TRIGGER_EVENTS_PATH is byte-identical to the one in checks_b.ts so
// S3 and B9c share a single fetch.

export const FIELDS_TO_DOMAINS_PATH = "/fields?reference_table=eq.domains&select=table_name,field_name&order=table_name.asc,field_name.asc&limit=1000";
export const CAPABILITY_DOMAINS_PATH = "/capability_domains?select=id,domain_id,capability_id,capabilities(capability_code)&order=id.asc&limit=100000";
export const DOMAIN_MODULE_CAPABILITIES_PATH = "/domain_module_capabilities?select=id,domain_module_id,capability_id&order=id.asc&limit=100000";
export const SOLUTION_DOMAINS_PATH = "/solution_domains?select=id,domain_id,coverage_level,solutions(solution_name)&order=id.asc&limit=100000";
export const SKILLS_PATH = "/skills?select=id,skill_name,skill_type,domain_id&order=id.asc&limit=100000";
// all.dmdo (the catalog loader) carries no `id`; M7 / M9 name their rows, so they fetch it here.
export const DMDO_WITH_ID_PATH = "/domain_module_data_objects?select=id,domain_module_id,data_object_id,role,is_install_optional&order=id.asc&limit=100000";
export const TRIGGER_EVENTS_PATH = "/trigger_events?select=id,event_name,data_object_id,event_category,from_state,to_state&order=id.asc&limit=100000";

// ---------- shared helpers ----------

const MAX_ITEMS = 12;
const blank = (s: unknown): boolean => s == null || String(s).trim() === "";
const defaultName: NameOf = (id) => `#${id}`;
const defaultModule = (id: number): string => `module ${id}`;

// "a, b, c; ...+N more", capped so a finding stays one readable line.
export function listItems(items: string[], max = MAX_ITEMS): string {
  const more = items.length > max ? `; ...+${items.length - max} more` : "";
  return items.slice(0, max).join("; ") + more;
}

function finding(id: string, result: Result, detail: string, rows?: RowId[]): Finding {
  return rows && rows.length ? { id, result, rows, detail } : { id, result, detail };
}

// ---------- row shapes (the subset of columns each check reads) ----------

export type ModuleLite = {
  id: number;
  domain_module_code: string;
  module_kind?: string | null; // full | starter
  catalog_tagline?: string | null;
  catalog_description?: string | null;
};

export type DmdoRow = {
  id?: RowId;
  domain_module_id: number;
  data_object_id: number;
  role: string; // master | embedded_master | contributor | consumer | derived
  is_install_optional?: boolean | null;
};

export type RelationshipLite = {
  id?: RowId;
  data_object_id: number;
  related_data_object_id: number;
  relationship_kind: string;
  relationship_type?: string | null; // one_to_one | one_to_many | many_to_one | many_to_many
  relationship_verb?: string | null;
  owner_side?: string | null; // source | target: the parent side
  is_required?: boolean | null;
};

const isFull = (m: ModuleLite): boolean => m.module_kind !== "starter";

// =====================================================================================
// S band
// =====================================================================================

// ---------- S1: direct FKs to `domains` ----------

// How S1 judges a zero count for one (table, field) pair (SKILL.md S1 "Expected-non-zero call"):
//   required   zero is blocking (fail); `owner` names the band that owns the fix
//   one        exactly one domain-grain skill (skills, F2); any other count fails
//   soft       non-zero when applicable; zero is a review signal (warn)
//   info       counted for the coverage table, never flagged
export type FkLevel = "required" | "one" | "soft" | "info";
export type FkExpectation = { level: FkLevel; owner: string };

export function directFkExpectation(table: string, field: string, domainKind?: string | null): FkExpectation {
  const bundle = domainKind === "bundle";
  switch (`${table}.${field}`) {
    case "business_function_domains.domain_id":
      return { level: bundle ? "info" : "required", owner: "C1" }; // C1 exempts bundles
    case "capability_domains.domain_id":
      return { level: bundle ? "info" : "required", owner: "A2" }; // A2 exempts bundles
    case "domain_modules.domain_id":
      return { level: "required", owner: "M1" };
    case "solution_domains.domain_id":
      return { level: bundle ? "info" : "required", owner: "A3" }; // A3 exempts bundles
    case "skills.domain_id":
      return { level: "one", owner: "F2" }; // F2: bundles are NOT exempt
    case "handoffs.source_domain_id":
      // "always non-zero for any non-leaf domain": leaf-ness is a judgment, so zero warns.
      return { level: bundle ? "info" : "soft", owner: "B9" };
    case "handoffs.target_domain_id":
      return { level: bundle ? "info" : "soft", owner: "B10" };
    case "domain_regulations.domain_id":
      return { level: bundle ? "info" : "soft", owner: "A" };
    // domain_data_objects is the retired rollup (masters read the module junction); domains.
    // parent_domain_id is routinely zero; any table SKILL.md does not name is informational.
    default:
      return { level: "info", owner: "" };
  }
}

export type DirectFkCount = {
  table_name: string;
  field_name: string;
  count: number | null; // null when the table could not be read
  domainSkills?: number; // skills.domain_id only: the skill_type='domain' subset of `count`
  error?: string;
};

// Row ids: "<table>.<field>" codes of the offending pairs.
export function checkDirectFkCoverage(counts: DirectFkCount[], domainKind?: string | null): Finding[] {
  const fail: { code: string; text: string }[] = [];
  const warn: { code: string; text: string }[] = [];
  const cells: string[] = [];
  for (const c of counts) {
    const code = `${c.table_name}.${c.field_name}`;
    const exp = directFkExpectation(c.table_name, c.field_name, domainKind);
    const route = exp.owner ? `, routes to ${exp.owner}` : "";
    if (c.count == null) {
      warn.push({ code, text: `${code} could not be counted (${c.error ?? "read failed"})` });
      cells.push(`${code}=?`);
      continue;
    }
    if (exp.level === "one") {
      const n = c.domainSkills ?? 0;
      cells.push(`${code}=${c.count} (${n} domain)`);
      if (n !== 1) fail.push({ code, text: `${code}: ${n} skill_type='domain' rows, exactly one expected${route}` });
      continue;
    }
    cells.push(`${code}=${c.count}`);
    if (c.count > 0) continue;
    if (exp.level === "required") fail.push({ code, text: `${code} = 0, expected non-zero${route}` });
    else if (exp.level === "soft") warn.push({ code, text: `${code} = 0, non-zero when applicable${route}` });
  }
  const out: Finding[] = [];
  if (fail.length) out.push(finding("S1", "fail", `zero / wrong-count direct FKs to domains (${fail.length}): ${listItems(fail.map((f) => f.text))}`, fail.map((f) => f.code)));
  if (warn.length) out.push(finding("S1", "warn", `review (${warn.length}): ${listItems(warn.map((f) => f.text))}`, warn.map((f) => f.code)));
  out.push(finding("S1", "pass", `coverage (${counts.length} FK pairs from /fields; rows = table.field codes): ${cells.join(", ")}`));
  return out;
}

// ---------- S2: per-module indirect-table coverage ----------

// Row ids: domain_modules.id. Zero dmdo = an unbuilt module (Rule #14, any module kind, fail).
// Zero domain_module_capabilities routes to M6: fail on a full module, warn on a starter (Rule #19
// invariant 5 allows a starter's capabilities, M6 asks for one on every module).
export function checkModuleCoverage(modules: ModuleLite[], dmdoCount: Map<number, number>, dmcCount: Map<number, number>): Finding[] {
  const noDmdo = modules.filter((m) => (dmdoCount.get(m.id) ?? 0) === 0);
  const noDmcFull = modules.filter((m) => isFull(m) && (dmcCount.get(m.id) ?? 0) === 0);
  const noDmcStarter = modules.filter((m) => !isFull(m) && (dmcCount.get(m.id) ?? 0) === 0);
  const out: Finding[] = [];
  if (noDmdo.length) {
    out.push(finding("S2", "fail", `modules with zero domain_module_data_objects (unbuilt, Rule #14; routes to the A / B band): ${noDmdo.map((m) => m.domain_module_code).join(", ")}`, noDmdo.map((m) => m.id)));
  }
  if (noDmcFull.length) {
    out.push(finding("S2", "fail", `full modules with zero domain_module_capabilities (routes to M6): ${noDmcFull.map((m) => m.domain_module_code).join(", ")}`, noDmcFull.map((m) => m.id)));
  }
  if (noDmcStarter.length) {
    out.push(finding("S2", "warn", `starter modules with zero domain_module_capabilities (allowed by Rule #19, M6 asks for one): ${noDmcStarter.map((m) => m.domain_module_code).join(", ")}`, noDmcStarter.map((m) => m.id)));
  }
  const cells = modules.map((m) => `${m.domain_module_code} ${dmdoCount.get(m.id) ?? 0}/${dmcCount.get(m.id) ?? 0}`);
  out.push(finding("S2", "pass", `coverage (module data_objects/capabilities; rows = module ids): ${cells.join(", ") || "(no modules)"}`));
  return out;
}

// ---------- S3: per-master indirect-table coverage ----------

export type MasterCoverageRow = {
  data_object_id: number;
  entity_type?: string | null;
  states: number;
  events: number;
  aliases: number;
};

// Row ids: data_objects.id. Soft (warn): S3 routes each gap to its owning band (B12 / B9 / B11)
// and adds the one signal no band catches alone, a master with states, events and aliases all zero.
export function checkMasterCoverage(rows: MasterCoverageRow[], labels: Labels = {}): Finding[] {
  const nameOf = labels.nameOf ?? defaultName;
  const quiet = rows.filter((r) => r.states === 0 && r.events === 0 && r.aliases === 0);
  const noStates = rows.filter((r) => r.states === 0 && r.entity_type === "operational_workflow");
  const noEvents = rows.filter((r) => r.states > 0 && r.events === 0);
  const out: Finding[] = [];
  const names = (rs: MasterCoverageRow[]) => listItems(rs.map((r) => nameOf(r.data_object_id)));
  if (quiet.length) out.push(finding("S3", "warn", `quietly incomplete load: zero states, events and aliases (${quiet.length}): ${names(quiet)}`, quiet.map((r) => r.data_object_id)));
  if (noStates.length) out.push(finding("S3", "warn", `operational_workflow masters with zero lifecycle states, routes to B12 (${noStates.length}): ${names(noStates)}`, noStates.map((r) => r.data_object_id)));
  if (noEvents.length) out.push(finding("S3", "warn", `masters with a state machine but zero trigger_events, routes to B9 (${noEvents.length}): ${names(noEvents)}`, noEvents.map((r) => r.data_object_id)));
  const withStates = rows.filter((r) => r.states > 0).length;
  const withEvents = rows.filter((r) => r.events > 0).length;
  const withAliases = rows.filter((r) => r.aliases > 0).length;
  out.push(finding("S3", "pass", `coverage over ${rows.length} master + always installed data_objects (rows = data_object ids): ${withStates} with states, ${withEvents} with events, ${withAliases} with aliases (zero aliases is the B11 judgment)`));
  return out;
}

// =====================================================================================
// A band
// =====================================================================================

// ---------- A1: domains business metadata (Rule #8) ----------

export type DomainMetadata = {
  domain_kind?: string | null;
  crud_percentage?: number | null;
  business_logic?: string | null;
  min_org_size?: string | null;
  cost_band?: string | null;
  certification_required?: boolean | null;
  usa_market_size_usd_m?: number | null;
  market_size_source_year?: number | null;
};

const positive = (n: unknown): boolean => typeof n === "number" && n > 0;

// The missing field names, [] when complete. Ported from audit_backlog.ts A1, plus SKILL.md's
// bundle carve-out (a bundle has no TAM: only min_org_size, cost_band and a non-null
// certification_required) and the non-null certification_required of "all 7 fields populated".
export function domainMetadataGaps(d: DomainMetadata): string[] {
  const gaps: string[] = [];
  if (d.domain_kind !== "bundle") {
    if (!positive(d.crud_percentage)) gaps.push("crud_percentage");
    if (blank(d.business_logic) && !((d.crud_percentage ?? 0) >= 95)) gaps.push("business_logic");
  }
  if (blank(d.min_org_size)) gaps.push("min_org_size");
  if (blank(d.cost_band)) gaps.push("cost_band");
  if (d.certification_required == null) gaps.push("certification_required");
  if (d.domain_kind !== "bundle") {
    if (!positive(d.usa_market_size_usd_m)) gaps.push("usa_market_size_usd_m");
    if (!positive(d.market_size_source_year)) gaps.push("market_size_source_year");
  }
  return gaps;
}

// Row ids: the missing domains column names.
export function checkDomainMetadata(d: DomainMetadata): Finding[] {
  const gaps = domainMetadataGaps(d);
  if (gaps.length) return [finding("A1", "fail", `domains business metadata incomplete (rows = column names): ${gaps.join(", ")}`, gaps)];
  const scope = d.domain_kind === "bundle" ? "bundle carve-out: min_org_size, cost_band, certification_required" : "all 7 fields";
  return [finding("A1", "pass", `domains business metadata populated (${scope})`)];
}

// ---------- A2: capabilities linked ----------

// Zero fails; 1-2 warns ("narrowly-scoped domains may be lower" is a judgment, and Rule #14 has a
// <3-capability single-module shape); bundles are exempt. audit_backlog.ts flags any count < 3.
export function checkCapabilityFloor(capabilityCount: number, domainKind?: string | null): Finding[] {
  if (domainKind === "bundle") return [finding("A2", "pass", `exempt: domain_kind=bundle (${capabilityCount} capability_domains rows)`)];
  if (capabilityCount === 0) return [finding("A2", "fail", "0 capability_domains rows (>= 3 expected)")];
  if (capabilityCount < 3) return [finding("A2", "warn", `${capabilityCount} capability_domains rows (< 3): passes only for a narrowly-scoped domain; confirm the scope`)];
  return [finding("A2", "pass", `${capabilityCount} capability_domains rows`)];
}

// ---------- A3: solutions linked with coverage_level ----------

export type SolutionDomainLite = { id: RowId; coverage_level?: string | null; solution_name?: string | null };

// Row ids: solution_domains.id (rows with a null coverage_level). Bundles are exempt. Zero
// `primary` on a domain with masters is the emerging_market signal (warn, set domain_kind and
// confirm, never an A3 failure); a domain already marked emerging_market passes it.
export function checkSolutionCoverage(rows: SolutionDomainLite[], opts: { domainKind?: string | null; hasMasters: boolean }): Finding[] {
  if (opts.domainKind === "bundle") return [finding("A3", "pass", `exempt: domain_kind=bundle (${rows.length} solution_domains rows)`)];
  const out: Finding[] = [];
  const nullLevel = rows.filter((r) => blank(r.coverage_level));
  const primary = rows.filter((r) => r.coverage_level === "primary").length;
  if (rows.length < 3) out.push(finding("A3", "fail", `${rows.length} solution_domains rows (>= 3 expected)`));
  if (nullLevel.length) {
    out.push(finding("A3", "fail", `solution_domains rows with no coverage_level (rows = solution_domains ids): ${listItems(nullLevel.map((r) => `${r.solution_name ?? "?"} (${r.id})`))}`, nullLevel.map((r) => r.id)));
  }
  if (rows.length > 0 && primary === 0 && opts.domainKind !== "emerging_market") {
    if (opts.hasMasters) {
      out.push(finding("A3", "warn", `zero primary solutions on a domain with masters: the emerging_market signal; set domain_kind='emerging_market' and confirm (Rule #2)`));
    } else {
      out.push(finding("A3", "fail", "zero primary solutions (>= 1 expected)"));
    }
  }
  if (out.length) return out;
  const note = primary === 0 ? ", none primary (domain_kind=emerging_market)" : `, ${primary} primary`;
  return [finding("A3", "pass", `${rows.length} solutions${note}, coverage_level set on every row`)];
}

// ---------- A4 (mechanical half): domain catalog UX copy present (Rule #20) ----------

// Row ids: the empty domains column names. Empty copy is a BLOCKER (fail).
export function checkDomainCatalogCopy(d: { catalog_tagline?: string | null; catalog_description?: string | null }): Finding[] {
  const empty = (["catalog_tagline", "catalog_description"] as const).filter((k) => blank(d[k]));
  if (empty.length) return [finding("A4", "fail", `empty catalog copy (BLOCKER, Rule #20; rows = column names): ${empty.join(", ")}`, [...empty])];
  return [finding("A4", "pass", "catalog_tagline and catalog_description both non-empty")];
}

// =====================================================================================
// M band
// =====================================================================================

// ---------- M1: >= 1 domain_modules row ----------

// Ported from audit_backlog.ts M1 (zero modules), plus Rule #14's "every domains row has >= 1
// FULL module" for every non-bundle domain (a bundle homes a starter only, Rule #19).
export function checkModulePresence(modules: ModuleLite[], domainKind?: string | null): Finding[] {
  const full = modules.filter(isFull).length;
  if (modules.length === 0) return [finding("M1", "fail", "zero domain_modules rows (Rule #14 audit blocker)")];
  if (full === 0 && domainKind !== "bundle") {
    return [finding("M1", "fail", `no module_kind='full' module (${modules.length} starter only): Rule #14 needs >= 1 full module`, modules.map((m) => m.id))];
  }
  return [finding("M1", "pass", `${modules.length} modules (${full} full, ${modules.length - full} starter)`)];
}

// ---------- M2: >= 3 capabilities implies >= 2 modules ----------

// Counts FULL modules only (Rule #14: starters do not count toward the >= 2 floor). Bundles are
// exempt (no market shape). Exactly 3 capabilities on one full module warns: SKILL.md allows it
// when domain_modules.description documents why, which is a judgment.
export function checkModuleSplit(capabilityCount: number, modules: ModuleLite[], domainKind?: string | null): Finding[] {
  const full = modules.filter(isFull).length;
  if (domainKind === "bundle") return [finding("M2", "pass", `exempt: domain_kind=bundle (${capabilityCount} capabilities, ${full} full modules)`)];
  if (capabilityCount < 3) return [finding("M2", "pass", `vacuous: ${capabilityCount} capabilities (< 3)`)];
  if (full >= 2) return [finding("M2", "pass", `${capabilityCount} capabilities, ${full} full modules`)];
  if (capabilityCount === 3 && full === 1) {
    return [finding("M2", "warn", "3 capabilities on 1 full module: borderline, passes only if domain_modules.description documents why one module")];
  }
  return [finding("M2", "fail", `${capabilityCount} capabilities on ${full} full module(s): split into >= 2 full modules (starters do not count)`)];
}

// ---------- M4: every capability has a realizing module ----------

export type CapabilityLite = { capability_id: number; capability_code?: string | null };

// Row ids: capabilities.id with no domain_module_capabilities row on the domain's modules.
export function checkCapabilitiesRealized(capabilities: CapabilityLite[], realizedCapabilityIds: Set<number>): Finding[] {
  const orphans = capabilities.filter((c) => !realizedCapabilityIds.has(c.capability_id));
  if (orphans.length) {
    return [finding("M4", "fail", `capabilities with no realizing module (rows = capability ids; ${orphans.length} of ${capabilities.length}): ${listItems(orphans.map((c) => `${c.capability_code ?? "?"} (${c.capability_id})`))}`, orphans.map((c) => c.capability_id))];
  }
  return [finding("M4", "pass", `all ${capabilities.length} capabilities realized by >= 1 module`)];
}

// ---------- M5: gated states carry their realizing module ----------

export type GatedStateLite = { id: RowId; data_object_id: number; state_name: string; domain_module_id?: number | null };

export type GateRealizerContext = Labels & {
  // dmdo roles of (module, data_object), catalog-wide; [] when the module does not carry it.
  rolesAt(moduleId: number, dataObjectId: number): string[];
  moduleExists(moduleId: number): boolean;
  fullModuleCount: number; // the domain's full modules (a NULL realizer is fine on a single-module domain)
};

// Row ids: data_object_lifecycle_states.id. The realizing module's code becomes the gate's
// permission prefix, so:
//   fail  domain_module_id names a module that does not exist or does not carry the entity
//   warn  the realizer carries the entity only as `consumer` (a read-only role realizing a gate)
//   warn  NULL on a multi-module domain: valid only for a cross-cutting gate (a judgment); the
//         prefix otherwise falls back to the master's module
export function checkGateRealizers(states: GatedStateLite[], c: GateRealizerContext): Finding[] {
  const nameOf = c.nameOf ?? defaultName;
  const moduleCode = c.moduleCode ?? defaultModule;
  const label = (s: GatedStateLite) => `${nameOf(s.data_object_id)}.${s.state_name}`;
  const missing: string[] = [];
  const missingRows: RowId[] = [];
  const consumer: string[] = [];
  const consumerRows: RowId[] = [];
  const nulls: GatedStateLite[] = [];
  for (const s of states) {
    const mid = s.domain_module_id;
    if (mid == null) {
      if (c.fullModuleCount > 1) nulls.push(s);
      continue;
    }
    if (!c.moduleExists(mid)) {
      missing.push(`${label(s)} -> unknown module ${mid}`);
      missingRows.push(s.id);
      continue;
    }
    const roles = c.rolesAt(mid, s.data_object_id);
    if (roles.length === 0) {
      missing.push(`${label(s)} -> ${moduleCode(mid)} (no dmdo row for the entity)`);
      missingRows.push(s.id);
    } else if (roles.every((r) => r === "consumer")) {
      consumer.push(`${label(s)} -> ${moduleCode(mid)}`);
      consumerRows.push(s.id);
    }
  }
  const out: Finding[] = [];
  if (missing.length) out.push(finding("M5", "fail", `gated states whose realizing module does not carry the entity (wrong-prefixed permission): ${listItems(missing)}`, missingRows));
  if (consumer.length) out.push(finding("M5", "warn", `gated states realized by a module that only consumes the entity: ${listItems(consumer)}`, consumerRows));
  if (nulls.length) {
    out.push(finding("M5", "warn", `gated states with NULL domain_module_id on a ${c.fullModuleCount}-module domain: confirm each is cross-cutting, else set its realizing module (${nulls.length}): ${listItems(nulls.map(label))}`, nulls.map((s) => s.id)));
  }
  if (out.length) return out;
  return [finding("M5", "pass", `${states.length} gated states checked (rows = lifecycle state ids)`)];
}

// ---------- M6: every module realizes >= 1 capability ----------

// Row ids: domain_modules.id. Full module with none fails; a starter with none warns (Rule #19
// invariant 5 makes a starter's capabilities allowed, not required).
export function checkModulesRealizeCapabilities(modules: ModuleLite[], dmcCount: Map<number, number>): Finding[] {
  const full = modules.filter((m) => isFull(m) && (dmcCount.get(m.id) ?? 0) === 0);
  const starter = modules.filter((m) => !isFull(m) && (dmcCount.get(m.id) ?? 0) === 0);
  const out: Finding[] = [];
  if (full.length) out.push(finding("M6", "fail", `modules realizing zero capabilities: ${full.map((m) => m.domain_module_code).join(", ")}`, full.map((m) => m.id)));
  if (starter.length) out.push(finding("M6", "warn", `starter modules realizing zero capabilities (allowed by Rule #19, confirm): ${starter.map((m) => m.domain_module_code).join(", ")}`, starter.map((m) => m.id)));
  if (out.length) return out;
  return [finding("M6", "pass", `all ${modules.length} modules realize >= 1 capability`)];
}

// ---------- M7: single-master integrity ----------

export type SingleMasterInput = {
  masters: number[]; // the domain's mastered data_object ids
  catalogMasterRows: DmdoRow[]; // every role='master' dmdo row in the catalog
  domainRows: DmdoRow[]; // every dmdo row on the domain's modules
};

// Row ids: data_objects.id. Both hard fails per SKILL.md: a master row in >= 2 modules anywhere in
// the catalog, and master in module A + consumer / contributor in module B of this domain. Master
// + embedded_master passes (autonomous deployable units). Consumer / contributor in several modules
// passes with a "consider deduplicating" note (a `pass` finding, never blocking).
export function checkSingleMaster(input: SingleMasterInput, labels: Labels & { moduleDomainCode?: (moduleId: number) => string } = {}): Finding[] {
  const nameOf = labels.nameOf ?? defaultName;
  const moduleCode = labels.moduleCode ?? defaultModule;
  const where = (mid: number) => (labels.moduleDomainCode ? `${moduleCode(mid)} [${labels.moduleDomainCode(mid)}]` : moduleCode(mid));
  const masterSet = new Set(input.masters);
  const masterModules = new Map<number, number[]>();
  for (const r of input.catalogMasterRows) {
    if (r.role !== "master" || !masterSet.has(r.data_object_id)) continue;
    const a = masterModules.get(r.data_object_id) ?? [];
    a.push(r.domain_module_id);
    masterModules.set(r.data_object_id, a);
  }
  const multi = [...masterModules.entries()].filter(([, mods]) => mods.length > 1).sort((a, b) => a[0] - b[0]);

  const byObject = new Map<number, DmdoRow[]>();
  for (const r of input.domainRows) {
    const a = byObject.get(r.data_object_id) ?? [];
    a.push(r);
    byObject.set(r.data_object_id, a);
  }
  const incoherent: string[] = [];
  const incoherentRows: number[] = [];
  const dedupe: string[] = [];
  for (const [doId, rows] of [...byObject.entries()].sort((a, b) => a[0] - b[0])) {
    if (rows.length < 2) continue;
    const masterMods = new Set(rows.filter((r) => r.role === "master").map((r) => r.domain_module_id));
    const readers = rows.filter((r) => (r.role === "consumer" || r.role === "contributor") && !masterMods.has(r.domain_module_id));
    if (masterMods.size > 0 && readers.length > 0) {
      incoherent.push(`${nameOf(doId)}: master in ${[...masterMods].map(moduleCode).join(", ")}, ${readers.map((r) => `${r.role} in ${moduleCode(r.domain_module_id)}`).join(", ")}`);
      incoherentRows.push(doId);
    } else if (masterMods.size === 0 && readers.length > 1) {
      dedupe.push(`${nameOf(doId)} (${readers.map((r) => moduleCode(r.domain_module_id)).join(", ")})`);
    }
  }
  const out: Finding[] = [];
  if (multi.length) {
    out.push(finding("M7", "fail", `data_objects with >1 master row catalog-wide (rows = data_object ids): ${listItems(multi.map(([doId, mods]) => `${nameOf(doId)}: ${mods.map(where).join(", ")}`))}`, multi.map(([doId]) => doId)));
  }
  if (incoherent.length) {
    out.push(finding("M7", "fail", `master coexists with consumer / contributor in this domain (rows = data_object ids): ${listItems(incoherent)}`, incoherentRows));
  }
  if (dedupe.length) out.push(finding("M7", "pass", `note, consider deduplicating (consumer / contributor in several modules): ${listItems(dedupe)}`));
  if (!multi.length && !incoherent.length) out.push(finding("M7", "pass", `${input.masters.length} masters, one master row each; no master + consumer / contributor overlap`));
  return out;
}

// ---------- M8 (mechanical half): module catalog UX copy present (Rule #20) ----------

// Row ids: domain_modules.id with an empty catalog_tagline or catalog_description (BLOCKER).
export function checkModuleCatalogCopy(modules: ModuleLite[]): Finding[] {
  const bad = modules
    .map((m) => ({ m, empty: (["catalog_tagline", "catalog_description"] as const).filter((k) => blank(m[k])) }))
    .filter((x) => x.empty.length > 0);
  if (bad.length) {
    return [finding("M8", "fail", `modules with empty catalog copy (BLOCKER, Rule #20; rows = module ids): ${listItems(bad.map((x) => `${x.m.domain_module_code} (${x.empty.join(", ")})`))}`, bad.map((x) => x.m.id))];
  }
  return [finding("M8", "pass", `all ${modules.length} modules carry catalog_tagline and catalog_description`)];
}

// ---------- M9 part 1: entity-layer self-containment ----------

export type SelfContainmentCatalog = {
  // data_object_id -> module ids holding a role='master' row, catalog-wide.
  masterModulesByDataObject: Map<number, number[]>;
  moduleDomain: Map<number, number | null>; // module id -> its primary domain id
  kindById: Map<number, string>; // data_object kind; a missing id means the object is unknown
};

export type SelfContainmentOptions = {
  // Where an embedded_master row neutralizes the dependency. "module" (default, SKILL.md M9: each
  // module deploys standalone, so only its own shell counts) or "domain" (phase_p_triage.ts: a
  // shell anywhere in the same domain).
  embeddedScope?: "module" | "domain";
  // Only masters in ANOTHER domain count as the dependency (phase_p_triage.ts). Default false:
  // SKILL.md M9 counts any other module, sibling modules of the same domain included.
  crossDomainOnly?: boolean;
};

export type SelfContainmentViolation = {
  row: DmdoRow;
  ownerModuleIds: number[]; // the master modules the row depends on (other than its own module)
  ownerDomainIds: number[]; // their domains, sorted
};

// A contributor row, or an always-installed consumer row, on an entity mastered by another module, that
// is not a platform built-in, not a shared master (mastered by >= 2 domains: the master-data
// exclusion of phase_p_triage.ts, counted in `sharedExcluded`), and not carried as
// embedded_master in scope. Self-mastered or unmastered entities are not an M9 dependency.
export function entitySelfContainment(
  rows: DmdoRow[],
  catalog: SelfContainmentCatalog,
  opts: SelfContainmentOptions = {},
): { violations: SelfContainmentViolation[]; sharedExcluded: number } {
  const scope = opts.embeddedScope ?? "module";
  const domainOf = (mid: number) => catalog.moduleDomain.get(mid) ?? null;
  const embedded = new Set<string>();
  for (const r of rows) {
    if (r.role !== "embedded_master") continue;
    embedded.add(scope === "module" ? `${r.domain_module_id}|${r.data_object_id}` : `${domainOf(r.domain_module_id)}|${r.data_object_id}`);
  }
  const violations: SelfContainmentViolation[] = [];
  let sharedExcluded = 0;
  for (const r of rows) {
    const isContributor = r.role === "contributor";
    const isRequiredConsumer = r.role === "consumer" && !r.is_install_optional;
    if (!isContributor && !isRequiredConsumer) continue;
    const kind = catalog.kindById.get(r.data_object_id);
    if (kind === undefined || kind === "platform_builtin") continue;
    const key = scope === "module" ? `${r.domain_module_id}|${r.data_object_id}` : `${domainOf(r.domain_module_id)}|${r.data_object_id}`;
    if (embedded.has(key)) continue;
    const self = domainOf(r.domain_module_id);
    const owners = (catalog.masterModulesByDataObject.get(r.data_object_id) ?? []).filter((mid) =>
      opts.crossDomainOnly ? domainOf(mid) != null && domainOf(mid) !== self : mid !== r.domain_module_id,
    );
    if (owners.length === 0) continue;
    const masterDomains = new Set((catalog.masterModulesByDataObject.get(r.data_object_id) ?? []).map(domainOf).filter((d): d is number => d != null));
    if (masterDomains.size >= 2) {
      sharedExcluded++;
      continue;
    }
    const ownerDomainIds = [...new Set(owners.map(domainOf).filter((d): d is number => d != null))].sort((a, b) => a - b);
    violations.push({ row: r, ownerModuleIds: [...owners].sort((a, b) => a - b), ownerDomainIds });
  }
  return { violations, sharedExcluded };
}

// ---------- M9 part 2: relationship-layer self-containment ----------

export type ScopeEdgeViolation = {
  edge: RelationshipLite;
  moduleId: number;
  outOfScopeId: number; // the endpoint the module does not carry
  // The in-scope endpoint's side of the FK: "holds_fk" (it carries the FK column, so the field is
  // mandatory only once the absent entity exists), "parent" (the absent entity holds the FK), or
  // "many_to_many" / "unknown" (no single FK side).
  inScopeSide: "holds_fk" | "parent" | "many_to_many" | "unknown";
};

// The endpoint that physically holds the FK column: the "many" side when the cardinality decides
// it (robust to a mislabeled owner_side, see B6b), else the non-owner side of a one_to_one.
export function fkHolderSide(e: RelationshipLite): "source" | "target" | null {
  const parent = oneSide(e.relationship_type ?? "") ?? (e.relationship_type === "one_to_one" ? (e.owner_side === "target" ? "target" : e.owner_side === "source" ? "source" : null) : null);
  if (parent == null) return null;
  return parent === "source" ? "target" : "source";
}

// Per module, the in-scope set is the data_objects with any dmdo row on that module (its
// blueprint section 3). Flags every is_required=true edge with exactly one endpoint in scope whose
// other endpoint is not a platform built-in and not a shared master (`excluded`). Either
// direction counts (SKILL.md M9 part 2 "touching either endpoint", matching the emitter's
// cross-scope buckets in catalog.ts loadModuleCatalog); `inScopeSide` says which direction.
export function relationshipSelfContainment(
  scopeByModule: Map<number, Set<number>>,
  rels: RelationshipLite[],
  opts: { kindById: Map<number, string>; excluded?: Set<number> },
): ScopeEdgeViolation[] {
  const required = rels.filter((r) => r.is_required === true);
  const out: ScopeEdgeViolation[] = [];
  for (const [moduleId, scope] of scopeByModule) {
    for (const e of required) {
      const a = scope.has(e.data_object_id);
      const b = scope.has(e.related_data_object_id);
      if (a === b) continue;
      const other = a ? e.related_data_object_id : e.data_object_id;
      if (opts.kindById.get(other) === "platform_builtin") continue;
      if (opts.excluded?.has(other)) continue;
      const holder = fkHolderSide(e);
      const inScopeSide = e.relationship_type === "many_to_many" ? "many_to_many" : holder == null ? "unknown" : (holder === "source") === a ? "holds_fk" : "parent";
      out.push({ edge: e, moduleId, outOfScopeId: other, inScopeSide });
    }
  }
  return out;
}

// Both layers as health findings. Row ids are prefixed strings, because the layers name rows of
// two tables: `dmdo:<domain_module_data_objects.id>` and `rel:<data_object_relationships.id>`.
//   part 1 violation                      fail (the module cannot deploy without another module)
//   part 2 required link, the in-scope     warn, any relationship_kind: no constraint until the
//     entity holds the FK                  absent entity exists, surfaced so the author picks embed
//                                          / not required / install-required
//   part 2 required link, the absent       not reported: the module carries no field and no
//     entity holds the FK, or many_to_many constraint. A required link never requires an entity
export function checkSelfContainment(
  part1: SelfContainmentViolation[],
  part2: ScopeEdgeViolation[],
  labels: Labels & { domainCode?: (domainId: number) => string; counts?: { rows: number; requiredEdges: number; modules: number } } = {},
): Finding[] {
  const nameOf = labels.nameOf ?? defaultName;
  const moduleCode = labels.moduleCode ?? defaultModule;
  const domainCode = labels.domainCode ?? ((id: number) => `domain ${id}`);
  const out: Finding[] = [];
  if (part1.length) {
    const items = part1.map((v) => `${moduleCode(v.row.domain_module_id)}: ${v.row.role}${v.row.role === "consumer" ? " + always installed" : ""} on ${nameOf(v.row.data_object_id)} mastered by ${v.ownerModuleIds.map(moduleCode).join(", ")} [${v.ownerDomainIds.map(domainCode).join(", ")}]`);
    out.push(finding("M9", "fail", `part 1 (entity layer): rows needing another module to deploy, recommend embed (${part1.length}): ${listItems(items)}`, part1.map((v) => `dmdo:${v.row.id ?? "?"}`)));
  }
  const edgeText = (v: ScopeEdgeViolation) =>
    `${moduleCode(v.moduleId)}: ${nameOf(v.edge.data_object_id)} ${v.edge.relationship_verb ?? "?"} ${nameOf(v.edge.related_data_object_id)} [${v.edge.relationship_kind}] (out of scope: ${nameOf(v.outOfScopeId)})`;
  const holds = part2.filter((v) => v.inScopeSide === "holds_fk");
  // Inbound edges (the out-of-scope endpoint holds the FK, or many_to_many) put no constraint on
  // the module, so they are not reported: hub entities attract hundreds of them from other domains.
  const relRows = (vs: ScopeEdgeViolation[]) => [...new Set(vs.map((v) => `rel:${v.edge.id ?? "?"}`))];
  if (holds.length) {
    out.push(finding("M9", "warn", `part 2 (relationship layer): an in-scope entity holds a mandatory field to an out-of-scope entity, which applies only once that entity exists; pick embed / not required / install-required (${holds.length}): ${listItems(holds.map(edgeText))}`, relRows(holds)));
  }
  if (out.length) return out;
  const c = labels.counts;
  return [finding("M9", "pass", c ? `${c.modules} modules self-contained: ${c.rows} dmdo rows, ${c.requiredEdges} required edges touching scope` : "every module self-contained (both layers)")];
}

// ---------- required-edge target classification (required_edge_presence_probe.ts) ----------
//
// The catalog-wide plan-4 signal, distinct from the per-scope M9 check above (SKILL.md M9 part 2:
// "a catalog-wide signal"). Exported for the probe; not part of the per-domain pass criterion.

export type RequiredEdgeTargetSummary = {
  total: number;
  builtinTarget: number; // target is platform_builtin (always present, excluded)
  optionalSomewhere: number; // target is is_install_optional=true in at least one module
  optionalEverywhere: number; // target is is_install_optional=true in every module it appears in
  everyByKind: Map<string, number>; // optionalEverywhere broken down by relationship_kind
  everyEdges: RelationshipLite[]; // the optionalEverywhere edges, in input order
};

export function classifyRequiredEdgeTargets(
  requiredEdges: RelationshipLite[],
  dmdo: { data_object_id: number; is_install_optional?: boolean | null }[],
  kindById: Map<number, string>,
): RequiredEdgeTargetSummary {
  const installOptionalByDO = new Map<number, Set<boolean>>();
  for (const r of dmdo) {
    const id = Number(r.data_object_id);
    const s = installOptionalByDO.get(id) ?? new Set<boolean>();
    if (r.is_install_optional != null) s.add(r.is_install_optional);
    installOptionalByDO.set(id, s);
  }
  const summary: RequiredEdgeTargetSummary = { total: 0, builtinTarget: 0, optionalSomewhere: 0, optionalEverywhere: 0, everyByKind: new Map(), everyEdges: [] };
  for (const e of requiredEdges) {
    summary.total++;
    const target = Number(e.related_data_object_id);
    if (kindById.get(target) === "platform_builtin") {
      summary.builtinTarget++;
      continue;
    }
    const s = installOptionalByDO.get(target);
    if (s?.has(true)) summary.optionalSomewhere++;
    if (s && s.size > 0 && [...s].every((v) => v)) {
      summary.optionalEverywhere++;
      summary.everyByKind.set(e.relationship_kind, (summary.everyByKind.get(e.relationship_kind) ?? 0) + 1);
      summary.everyEdges.push(e);
    }
  }
  return summary;
}
