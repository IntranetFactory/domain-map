#!/usr/bin/env bun
// scripts/emit_fact_sheet.ts - plan-modules.md §11 step 4 (revised per §9, session 3).
//
// Per-module emitter:
//   Per-module fact sheets → blueprints/<MODULE-CODE>-semantic-blueprint.md
//   One per `domain_modules` row. The deployable unit's surface: data_objects assigned to
//   this module, lifecycle states on this module's masters, system skill + skill_tools +
//   Semantius coverage %, module-scoped permissions and business rules, capabilities
//   realized, outbound/inbound integration handoffs, architect handoff hints.
//
// Starter-kit rendering is gone (multi-module bundles are no longer authored as a separate
// artifact). Cross-cutting modules live alongside everyone else in blueprints/; their fact
// sheet swaps the parent-domain section for a host-domains section.
//
// Usage:
//   bun run scripts/emit_fact_sheet.ts --module ATS-CANDIDATE-CRM
//   bun run scripts/emit_fact_sheet.ts --all
//   bun run scripts/emit_fact_sheet.ts --all --check        # CI drift check

export {};

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { argv, exit } from "node:process";
import {
  clearCatalogCache,
  loadCachedCatalog,
  loadModuleCatalog,
  ROLE_ORDER,
  ROLE_RANK,
  type AllRelationships,
  type CatalogIndex,
  type CoMasterRow,
  type DataObject,
  type Domain,
  type IndustryRow,
  type ModuleCatalog,
  type ModuleRow,
  type OwnerInfo,
  type ScopeRow,
} from "./lib/catalog";

// ---------- args ----------
const args = argv.slice(2);
const ALL = args.includes("--all");
const CHECK = args.includes("--check");
const NO_CACHE = args.includes("--no-cache");
const CLEAR_CACHE = args.includes("--clear-cache");
function flagValue(name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const MODULE_CODE = flagValue("--module");

if (CLEAR_CACHE) {
  const cleared = clearCatalogCache();
  console.error(cleared ? "catalog cache cleared" : "no catalog cache to clear");
  if (!ALL && !MODULE_CODE) exit(0);
}

if (!ALL && !MODULE_CODE) {
  console.error("usage:");
  console.error("  emit_fact_sheet.ts --module <MODULE_CODE> [--no-cache] [--clear-cache]");
  console.error("  emit_fact_sheet.ts --all [--check] [--no-cache]");
  console.error("  emit_fact_sheet.ts --clear-cache");
  exit(2);
}

const ROOT = "c:/dev/domain-map";
const BLUEPRINTS_DIR = `${ROOT}/catalog/blueprints`;
const BLUEPRINT_SUFFIX = "-semantic-blueprint.md";
const TODAY = new Date().toISOString().slice(0, 10);
const FACT_SHEET_VERSION = "2.0";

// ---------- catalog index (loaded once via lib) ----------
// Types, pg helper, and scoped query helpers live in ./lib/catalog.ts. Aliasing
// index.xxx into local consts keeps existing render functions calling the same
// names (dataObjectsById, modulesById, etc.) without churn.
const { index, all: allRelationships } = (await loadCachedCatalog({ forceRefresh: NO_CACHE })) as {
  index: CatalogIndex;
  all: AllRelationships;
};
const { domainsById, domainsByCode, dataObjectsById, industriesById, modulesById, modulesByCode } = index;
const allModules = index.modules;
const USERS_ID = index.usersId;
void allModules; // referenced by emitOneModuleFactSheet driver below
void domainsByCode; // exported alias for future callers; harmless if unused here

// ---------- helpers ----------

function lowerSlug(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function moduleSlug(code: string): string {
  // ATS-CANDIDATE-CRM → ats-candidate-crm (used as permission prefix per §4.6)
  return code.toLowerCase().replace(/_/g, "-");
}

function entitySingularToken(o: DataObject): string {
  return o.singular_label.toLowerCase().replace(/\s+/g, "_");
}

function entityPluralToken(o: DataObject): string {
  return o.plural_label.toLowerCase().replace(/\s+/g, "_");
}

function tableRow(cells: (string | number | boolean | null | undefined)[]): string {
  return "| " + cells.map((c) => {
    if (c === null || c === undefined || c === "") return "-";
    const s = String(c).replace(/\|/g, "\\|").replace(/\n+/g, " ");
    return s;
  }).join(" | ") + " |";
}

function tableHeader(headers: string[], alignments?: ("left" | "center" | "right")[]): string {
  const align = (i: number): string => {
    const a = alignments?.[i] ?? "left";
    if (a === "center") return ":---:";
    if (a === "right") return "---:";
    return "---";
  };
  return tableRow(headers) + "\n" + "| " + headers.map((_, i) => align(i)).join(" | ") + " |";
}

function escapeYaml(s: string): string {
  if (s === "" || s === null || s === undefined) return '""';
  if (/^[A-Za-z][A-Za-z0-9 _.,()\-/&+]*$/.test(s)) return s;
  return JSON.stringify(s);
}

const ROLE_INFO: Record<string, { classDef: string }> = {
  master: { classDef: "fill:#d4f4dd,stroke:#27ae60,color:#0b3d20" },
  embedded_master: { classDef: "fill:#fff4cc,stroke:#c79100,color:#5b4500" },
  contributor: { classDef: "fill:#cfe8ff,stroke:#1976d2,color:#0d3a66" },
  consumer: { classDef: "fill:#e8def8,stroke:#7b1fa2,color:#3a155d" },
  derived: { classDef: "fill:#f7d7e6,stroke:#ad1457,color:#5a0930" },
  platform_builtin: { classDef: "fill:#e0e0e0,stroke:#424242,color:#1a1a1a" },
  external: { classDef: "fill:#f5f5f5,stroke:#9e9e9e,color:#616161,stroke-dasharray:3 3" },
};

// ROLE_ORDER, ROLE_RANK, ScopeRow, CoMasterRow, OwnerInfo and the four scoped query
// helpers (loadAliases / loadRelationships / loadCoMasters / loadOwners) now live in
// ./lib/catalog.ts. Render functions below operate on the ModuleCatalog struct that
// loadModuleCatalog returns.

// Build mermaid diagram for a scoped data_object set.
//   scopeRoles  - role per data_object that is "in scope" (rendered with its role color)
//   edges       - every relationship row touching the scope (caller passes all; we filter
//                 down to intra-scope edges and to built-in `users` edges that touch scope)
// Only in-scope entities + the `users` platform built-in are rendered. External neighbors
// are deliberately omitted - they make the diagram too noisy. The §5.3 table covers
// cross-scope edges in textual form.
function renderMermaid(
  scopeRoles: Map<number, string>,
  scopeNecessity: Map<number, string | null>,
  edges: any[],
): string[] {
  const lines: string[] = [];
  lines.push("```mermaid");
  lines.push("flowchart TD");
  const usedRoles = new Set<string>();
  for (const role of scopeRoles.values()) usedRoles.add(role);
  const intraEdges: any[] = [];
  const userEdges: any[] = [];
  for (const r of edges) {
    const a = r.data_object_id as number;
    const b = r.related_data_object_id as number;
    const aInScope = scopeRoles.has(a);
    const bInScope = scopeRoles.has(b);
    const aUsers = a === USERS_ID;
    const bUsers = b === USERS_ID;
    if (aInScope && bInScope) {
      intraEdges.push(r);
    } else if ((aUsers && bInScope) || (aInScope && bUsers)) {
      userEdges.push(r);
    }
    // else: cross-scope edge with an external neighbor - omitted from the diagram
  }
  const usesUsers = userEdges.length > 0;
  for (const role of ROLE_ORDER) {
    if (usedRoles.has(role)) lines.push(`  classDef ${role} ${ROLE_INFO[role].classDef};`);
  }
  if (usesUsers) lines.push(`  classDef platform_builtin ${ROLE_INFO.platform_builtin.classDef};`);
  // Nodes: every in-scope entity, plus `users` if any user edges remain.
  const nodeIds = new Set<number>(scopeRoles.keys());
  if (usesUsers) nodeIds.add(USERS_ID);
  for (const id of nodeIds) {
    const obj = dataObjectsById.get(id);
    if (!obj) continue;
    const label = obj.plural_label.replace(/"/g, '\\"');
    lines.push(`  ${obj.data_object_name}["${label}"]`);
  }
  // Edges: intra-scope + user edges only.
  for (const r of [...intraEdges, ...userEdges]) {
    const a = dataObjectsById.get(r.data_object_id as number);
    const b = dataObjectsById.get(r.related_data_object_id as number);
    if (!a || !b) continue;
    const verb = (r.relationship_verb || "→").replace(/"/g, '\\"');
    const opt = r.is_required ? "" : " (opt)";
    lines.push(`  ${a.data_object_name} -->|"${verb}${opt}"| ${b.data_object_name}`);
  }
  // Class assignments.
  for (const id of nodeIds) {
    const obj = dataObjectsById.get(id);
    if (!obj) continue;
    const cls = scopeRoles.has(id) ? scopeRoles.get(id)! : "platform_builtin";
    lines.push(`  class ${obj.data_object_name} ${cls};`);
  }
  // Per-node optional-necessity overlay: dashed stroke on top of the role classDef.
  // Mermaid honors per-node `style` directives even when a class is already applied.
  for (const id of nodeIds) {
    const obj = dataObjectsById.get(id);
    if (!obj) continue;
    if (scopeNecessity.get(id) === "optional") {
      lines.push(`  style ${obj.data_object_name} stroke-dasharray:5 5;`);
    }
  }
  lines.push("```");
  return lines;
}

function renderEntitySummary(scopeRows: ScopeRow[]): string[] {
  const out: string[] = [];
  if (scopeRows.length === 0) return out;
  // Two columns matching the old ATS.md baseline: Name (plural) + Description.
  // Role classification is conveyed visually via the mermaid color coding below.
  out.push(tableHeader(["Name", "Description"]));
  const sorted = [...scopeRows].sort((a, b) => {
    const ra = ROLE_RANK[a.role] ?? 99;
    const rb = ROLE_RANK[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.data_object.plural_label.localeCompare(b.data_object.plural_label);
  });
  for (const r of sorted) {
    out.push(tableRow([r.data_object.plural_label, r.data_object.description || ""]));
  }
  return out;
}

function renderAliases(aliasRows: any[]): string[] {
  const out: string[] = [];
  // Filter: drop generic synonyms (common-knowledge noise per project decision 2026-05-25)
  // and drop vendor-scoped rows (no competitor references in blueprints per Rule #17).
  // Keep: rows with alias_type other than 'synonym' (abbreviation, acronym, alternate_spelling,
  // ...) OR rows scoped to a specific industry. Both carry signal an LLM cannot derive from
  // the entity name alone.
  const filtered = aliasRows.filter((a) =>
    (a.alias_type !== "synonym" || a.industry_id !== null) && a.solution_id === null,
  );
  if (filtered.length === 0) {
    out.push("_(no industry-scoped aliases or non-synonym alias types loaded for this scope; generic synonyms are omitted as common knowledge.)_");
    return out;
  }
  out.push(tableHeader(["data_object", "alias", "alias_type", "preferred?", "industry", "notes"]));
  for (const a of filtered) {
    const obj = dataObjectsById.get(a.data_object_id as number);
    if (!obj) continue;
    const industry = a.industry_id ? industriesById.get(a.industry_id as number) : null;
    const industryLabel = industry ? `${industry.industry_name}` : "-";
    out.push(tableRow([
      `\`${obj.data_object_name}\``,
      a.alias_name,
      a.alias_type,
      a.is_preferred ? "✓" : "",
      industryLabel,
      a.notes || "",
    ]));
  }
  return out;
}

function renderRelationshipTable(rows: any[], opts: { includeOwnerSide: boolean; includeKind: boolean }): string[] {
  const out: string[] = [];
  if (rows.length === 0) return out;
  const headers: string[] = ["from", "verb", "to", "cardinality"];
  if (opts.includeKind) headers.push("kind");
  headers.push("necessity");
  if (opts.includeOwnerSide) headers.push("owner_side");
  headers.push("notes");
  out.push(tableHeader(headers));
  for (const r of rows) {
    const a = dataObjectsById.get(r.data_object_id as number);
    const b = dataObjectsById.get(r.related_data_object_id as number);
    if (!a || !b) continue;
    const cells: (string | undefined)[] = [
      `\`${a.data_object_name}\``,
      r.relationship_verb || "",
      `\`${b.data_object_name}\``,
      r.relationship_type || "",
    ];
    if (opts.includeKind) cells.push(r.relationship_kind || "");
    cells.push(r.is_required ? "required" : "optional");
    if (opts.includeOwnerSide) cells.push(r.owner_side || "");
    cells.push(r.notes || "");
    out.push(tableRow(cells));
  }
  return out;
}

function renderCoMasters(rows: CoMasterRow[]): string[] {
  const out: string[] = [];
  if (rows.length === 0) return out;
  out.push(tableHeader(["data_object", "other module / domain", "role", "necessity", "notes"]));
  const sorted = [...rows].sort((a, b) => {
    const an = dataObjectsById.get(a.data_object_id)?.data_object_name ?? "";
    const bn = dataObjectsById.get(b.data_object_id)?.data_object_name ?? "";
    if (an !== bn) return an.localeCompare(bn);
    const am = a.owner_module?.domain_module_code ?? a.owner_domain?.domain_code ?? "";
    const bm = b.owner_module?.domain_module_code ?? b.owner_domain?.domain_code ?? "";
    return am.localeCompare(bm);
  });
  for (const r of sorted) {
    const obj = dataObjectsById.get(r.data_object_id);
    if (!obj) continue;
    const owner = r.owner_module
      ? `${r.owner_module.domain_module_code} (${r.owner_module.domain_module_name})${r.owner_domain ? ` - ${r.owner_domain.domain_code}` : ""}`
      : r.owner_domain
        ? `${r.owner_domain.domain_code} (${r.owner_domain.domain_name})`
        : "_(unknown)_";
    out.push(tableRow([
      `\`${obj.data_object_name}\``,
      owner,
      r.role,
      r.necessity || "-",
      r.notes || "",
    ]));
  }
  return out;
}

// Single-owner lookup for §3. A data_object should have exactly one master across the
// catalog; if `owners` reports more than one module or more than one fallback-domain for the
// same data_object, that is a catalog integrity violation (caught here loudly rather than
// silently rendered). Returns both the code-shaped slug ("mastered in" column) and the
// human-readable name ("label" column).
function masteredIn(r: ScopeRow, owners: Map<number, OwnerInfo>): { code: string; label: string } {
  if (r.role === "master" || r.role === "derived") return { code: "-", label: "-" };
  const info = owners.get(r.data_object_id);
  if (!info) {
    const fallback = r.data_object.kind === "platform_builtin" ? "_(platform built-in)_" : "-";
    return { code: fallback, label: fallback };
  }
  if (info.modules.length > 1) {
    throw new Error(
      `catalog integrity: data_object ${r.data_object.data_object_name} (id ${r.data_object_id}) has ${info.modules.length} modules with role=master (${info.modules.map((m) => m.domain_module_code).join(", ")}). Expected exactly one.`,
    );
  }
  if (info.modules.length === 1) {
    const m = info.modules[0];
    return { code: `\`${moduleSlug(m.domain_module_code)}\``, label: m.domain_module_name };
  }
  if (info.domains.length > 1) {
    throw new Error(
      `catalog integrity: data_object ${r.data_object.data_object_name} (id ${r.data_object_id}) has ${info.domains.length} domains with role=master (${info.domains.map((d) => d.domain_code).join(", ")}). Expected exactly one.`,
    );
  }
  if (info.domains.length === 1) {
    const d = info.domains[0];
    return { code: `\`${d.domain_code}\` _(domain-level, not modularized)_`, label: d.domain_name };
  }
  return { code: "-", label: "-" };
}

// M1 (plan-1-consistency.md): the single canonical gate-code derivation, shared by the §7
// lifecycle renderer and §8 deriveWorkflowGatesAndRules so the two can never disagree on a
// gate's module prefix. Canonical fallback: a state with NULL domain_module_id is gated by
// the module that masters its data_object in scope. Returns null when no module resolves
// (the §7 caller renders a blank/annotation; §8 simply does not mint the gate).
function deriveGate(
  state: any,
  scopeRows: ScopeRow[],
): { code: string; gateModule: ModuleRow; verbSegment: string; obj: DataObject } | null {
  const obj = dataObjectsById.get(state.data_object_id as number);
  if (!obj) return null;
  const realizingId = state.domain_module_id as number | null;
  const gateModule = realizingId !== null
    ? modulesById.get(realizingId)
    : scopeRows.find((r) => r.data_object_id === state.data_object_id && r.role === "master")?.modules[0];
  if (!gateModule) return null;
  const verbSegment = state.permission_verb_override
    ? (state.permission_verb_override as string)
    : `${state.state_name}_${entitySingularToken(obj)}`;
  return { code: `${moduleSlug(gateModule.domain_module_code)}:${verbSegment}`, gateModule, verbSegment, obj };
}

function renderDependencies(scopeRows: ScopeRow[], owners: Map<number, OwnerInfo>): string[] {
  const out: string[] = [];
  const deps = scopeRows.filter((r) => r.role !== "master");
  if (deps.length === 0) return out;
  out.push(tableHeader(["data_object", "role here", "necessity", "canonical owner(s)", "slice notes"]));
  const sorted = [...deps].sort((a, b) => {
    const ra = ROLE_RANK[a.role] ?? 99;
    const rb = ROLE_RANK[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.data_object.data_object_name.localeCompare(b.data_object.data_object_name);
  });
  for (const r of sorted) {
    const info = owners.get(r.data_object_id);
    const ownerLabels: string[] = [];
    if (info) {
      for (const m of info.modules) {
        const d = m.domain_id !== null ? domainsById.get(m.domain_id) : null;
        ownerLabels.push(d ? `${m.domain_module_code} (${d.domain_code})` : m.domain_module_code);
      }
      for (const d of info.domains) ownerLabels.push(`${d.domain_code} (${d.domain_name})`);
    }
    const ownerCell = ownerLabels.length > 0
      ? ownerLabels.join(", ")
      : r.data_object.kind === "platform_builtin"
        ? "_(platform built-in)_"
        : "_(no canonical owner recorded)_";
    out.push(tableRow([
      `\`${r.data_object.data_object_name}\``,
      r.role,
      r.necessity || "-",
      ownerCell,
      r.notes || "",
    ]));
  }
  return out;
}

// Coverage % derivation per plan-modules.md §5.6:
// required tools with operation_kind ∈ {query, mutate} / total required tools.
// Optional tools (consumer reads, AI augmentations) excluded from the denominator.
const SEMANTIUS_COVERED = new Set(["query", "mutate"]);

type CoverageResult = {
  required: number;
  covered: number;
  pct: number;
  nonCoveredTools: { tool: string; kind: string }[];
};

function computeCoverage(skillToolRows: any[]): CoverageResult {
  const required = skillToolRows.filter((r) => r.requirement_level === "required");
  const denom = required.length;
  const covered = required.filter((r) => SEMANTIUS_COVERED.has(r.tools?.operation_kind)).length;
  const pct = denom === 0 ? 0 : Math.round((covered / denom) * 100);
  const nonCoveredTools = required
    .filter((r) => !SEMANTIUS_COVERED.has(r.tools?.operation_kind))
    .map((r) => ({ tool: String(r.tools?.tool_name ?? "?"), kind: String(r.tools?.operation_kind ?? "?") }));
  return { required: denom, covered, pct, nonCoveredTools };
}

// ============================================================
// UNIFIED FACT-SHEET EMITTER
// One body shape for both single-module and multi-module (starter-kit / future bundle)
// fact sheets. Scope = union of input modules' data_objects, strongest role wins per
// data_object. Front matter difference is the length of the `domain_modules:` list.
// ============================================================

async function emitFactSheet(modules: ModuleRow[], kindLabel?: string): Promise<string> {
  if (modules.length === 0) throw new Error("emitFactSheet requires at least one module");

  // All scoped queries (DMDO aggregation, aliases, relationships, co-masters, owners,
  // lifecycle states, handoff attribution, related-module derivation) live in
  // ./lib/catalog.ts. Same code path that emit_domain_map.ts uses, so the two emitters
  // can never report different facts for the same module.
  const cat: ModuleCatalog = loadModuleCatalog(modules.map((m) => m.id), index, allRelationships);
  const {
    scopeRows,
    scopeRolesById,
    scopeNecessityById,
    aliasRows,
    relationships: rels,
    coMasters,
    owners,
    lifecycleRows,
    outboundHandoffs,
    inboundHandoffs,
    relatedModuleIds,
    parentDomains,
  } = cat;
  const moduleIdSet = new Set(modules.map((m) => m.id));
  // M1 cross-section consistency: collect the in-scope gates §7 shows and the gates §8 mints,
  // then warn (Policy 1, never throw) if §7 shows an in-scope gate §8 fails to mint.
  const section7InScopeGates = new Set<string>();
  const section8Gates = new Set<string>();
  const relatedModules: ModuleRow[] = [...relatedModuleIds]
    .map((id) => modulesById.get(id))
    .filter((m): m is ModuleRow => Boolean(m));
  relatedModules.sort((a, b) => a.domain_module_code.localeCompare(b.domain_module_code));

  // ---- render ----
  const out: string[] = [];

  // Front matter
  // The fact sheet IS the semantic-blueprint artifact: a human-readable + machine-parseable
  // description of one deployable system (module) or its starter-kit bundle.
  //   - system_name: the canonical name a deploy tool / agent skill addresses the system by.
  //     Single module: the module code (`ATS-CANDIDATE-CRM`). Starter-kit / multi-module:
  //     the parent domain code (`ATS`).
  //   - system_description: the human-readable label. Module name / domain name from the
  //     catalog. Not a marketing tagline.
  //   - system_slug: the lowercase path-safe form of `system_name`. Used as the filename
  //     stem; the on-disk filename is `<system_slug>-semantic-blueprint.md`.
  // domain_modules / related_modules entries are emitted as slugs (lowercase, dashed) so
  // any downstream tool can `glob *-semantic-blueprint.md` and join entry-by-entry without
  // case-folding.
  const isStarterKit = modules.length > 1 && parentDomains.length === 1;
  const systemName = isStarterKit ? parentDomains[0].domain_code : modules[0].domain_module_code;
  const systemDescription = isStarterKit ? parentDomains[0].domain_name : modules[0].domain_module_name;
  const systemSlug = moduleSlug(systemName);

  // catalog_tagline: buyer-voice one-liner from the source row (per Rule #20). Single
  // module: pull from that module. Multi-module starter kit or domain-bundle: pull from
  // the parent domain. Empty when the catalog UX field hasn't been backfilled yet; the
  // M8 / A4 audits catch the gap.
  const catalogTagline = isStarterKit
    ? parentDomains[0].catalog_tagline || ""
    : modules[0].catalog_tagline || "";

  out.push("---");
  out.push("artifact: semantic-blueprint");
  out.push(`fact_sheet_version: "${FACT_SHEET_VERSION}"`);
  out.push(`system_name: ${systemName}`);
  out.push(`system_description: ${escapeYaml(systemDescription)}`);
  if (catalogTagline) out.push(`catalog_tagline: ${escapeYaml(catalogTagline)}`);
  out.push(`system_slug: ${systemSlug}`);
  out.push("domain_modules:");
  for (const m of modules) out.push(`  - ${moduleSlug(m.domain_module_code)}`);
  if (parentDomains.length > 0) {
    out.push(parentDomains.length === 1 ? `domain_code: ${parentDomains[0].domain_code}` : "domain_codes:");
    if (parentDomains.length > 1) for (const d of parentDomains) out.push(`  - ${d.domain_code}`);
  }
  if (relatedModules.length > 0) {
    out.push(`related_modules: [${relatedModules.map((m) => moduleSlug(m.domain_module_code)).join(", ")}]`);
  }
  out.push(`created_at: ${TODAY}`);
  out.push("---");
  out.push("");

  // Title - single module: the human module name only.
  // Multi-module: the parent domain's human-readable name (e.g. "Applicant Tracking and
  // Recruiting"). The starter-kit is the market entry point; its title is the market, not
  // a technical "Starter Kit" suffix.
  const title = modules.length === 1
    ? modules[0].domain_module_name
    : parentDomains.length === 1
      ? parentDomains[0].domain_name
      : parentDomains.map((d) => d.domain_name).join(" + ");
  void kindLabel;
  out.push(`# ${title}`);
  out.push("");

  // §1 Overview
  // Two voices, two sub-sections (per Rule #20):
  //   1.1 Analyst overview - the row's `description` (single-module: domain_modules.description;
  //       multi-module: domains.description + business_logic). Internal-facing; describes
  //       market position, mastership, handoffs.
  //   1.2 Buyer overview - the row's `catalog_description` (single-module:
  //       domain_modules.catalog_description; multi-module: domains.catalog_description).
  //       Marketing-facing; describes what the buyer can do. Rendered only when present.
  // If `description` is missing the review must catch it upstream (A1 / per-module
  // description); the emitter never emits a placeholder. Same for catalog_description
  // (M8 / A4 catch the gap).
  const analystOverviewLines: string[] = [];
  let buyerOverview = "";
  if (modules.length === 1) {
    if (modules[0].description) analystOverviewLines.push(modules[0].description);
    buyerOverview = modules[0].catalog_description || "";
  } else if (parentDomains.length === 1) {
    const d = parentDomains[0];
    if (d.description) analystOverviewLines.push(d.description);
    if (d.business_logic) {
      if (analystOverviewLines.length > 0) analystOverviewLines.push("");
      analystOverviewLines.push(d.business_logic);
    }
    buyerOverview = d.catalog_description || "";
  } else {
    const joined = parentDomains.map((d) => d.description).filter(Boolean).join(" ");
    if (joined) analystOverviewLines.push(joined);
  }
  if (analystOverviewLines.length > 0 || buyerOverview) {
    out.push("## 1. Overview");
    out.push("");
    if (analystOverviewLines.length > 0) {
      out.push("### 1.1 Analyst overview");
      out.push("");
      out.push(...analystOverviewLines);
      out.push("");
    }
    if (buyerOverview) {
      out.push("### 1.2 Buyer overview");
      out.push("");
      out.push("_Buyer-voice marketing copy from `catalog_description` (Rule #20)._");
      out.push("");
      out.push(buyerOverview);
      out.push("");
    }
  }

  // §2 Entity summary - table + mermaid in the same section
  out.push("## 2. Entity summary");
  out.push("");
  out.push(...renderEntitySummary(scopeRows));
  out.push("");
  if (rels.all.length > 0 || scopeRows.length > 0) {
    out.push(...renderMermaid(scopeRolesById, scopeNecessityById, rels.all));
    out.push("");
  }

  // §3 Entities catalog
  out.push("## 3. Entities catalog");
  out.push("");
  const showModulesCol = modules.length > 1;
  if (scopeRows.length === 0) {
    out.push("_(no data_objects in scope.)_");
  } else {
    const headers = ["#", "data_object", "role", "mastered in", "label", "necessity", "pattern flags"];
    if (showModulesCol) headers.push("modules");
    headers.push("notes");
    out.push(tableHeader(headers, ["right"]));
    const sortOrder = ["master", "embedded_master", "contributor", "consumer", "derived"];
    const sorted = [...scopeRows].sort((a, b) => {
      const ra = sortOrder.indexOf(a.role) === -1 ? 99 : sortOrder.indexOf(a.role);
      const rb = sortOrder.indexOf(b.role) === -1 ? 99 : sortOrder.indexOf(b.role);
      if (ra !== rb) return ra - rb;
      return a.data_object.plural_label.localeCompare(b.data_object.plural_label);
    });
    let i = 1;
    for (const r of sorted) {
      const o = r.data_object;
      const flags: string[] = [];
      if (o.has_personal_content) flags.push("personal_content");
      if (o.has_submit_lock) flags.push("submit_lock");
      if (o.has_single_approver) flags.push("single_approver");
      const owner = masteredIn(r, owners);
      const cells: (string | number)[] = [
        i++,
        `\`${o.data_object_name}\` (${o.plural_label})`,
        r.role,
        owner.code,
        owner.label,
        r.necessity || "-",
        flags.join(", "),
      ];
      if (showModulesCol) cells.push(r.modules.map((m) => m.domain_module_code).sort().join(", "));
      cells.push(r.notes || "");
      out.push(tableRow(cells));
    }
  }
  out.push("");

  // §4 Aliases and industry synonyms
  out.push("## 4. Aliases and industry synonyms");
  out.push("");
  out.push(...renderAliases(aliasRows));
  out.push("");

  // §5 Relationships
  out.push("## 5. Relationships");
  out.push("");
  out.push("### 5.1 Intra-scope edges");
  out.push("");
  if (rels.intra.length === 0) {
    out.push("_(no `data_object_relationships` with both endpoints inside the scope.)_");
  } else {
    out.push(...renderRelationshipTable(rels.intra, { includeOwnerSide: true, includeKind: true }));
  }
  out.push("");
  out.push("### 5.2 Built-in edges (`users` and other platform built-ins)");
  out.push("");
  if (rels.userRels.length === 0) {
    out.push("_(no relationships against platform built-ins recorded for this scope.)_");
  } else {
    out.push(...renderRelationshipTable(rels.userRels, { includeOwnerSide: true, includeKind: false }));
  }
  out.push("");
  out.push("### 5.3 Cross-scope edges");
  out.push("");
  out.push("#### 5.3a Outbound from this scope's masters and contributors");
  out.push("");
  out.push("_Edges this scope drives: the in-scope endpoint has `role` of `master` or `contributor`._");
  out.push("");
  if (rels.crossOutbound.length === 0) {
    out.push("_(no outbound cross-scope edges from this scope's masters or contributors.)_");
  } else {
    out.push(...renderRelationshipTable(rels.crossOutbound, { includeOwnerSide: false, includeKind: false }));
  }
  out.push("");
  out.push("#### 5.3b Context edges on embedded shells and consumed entities");
  out.push("");
  out.push("_Edges the canonical owner drives, shown for context: the in-scope endpoint has `role` of `embedded_master`, `consumer`, or `derived`._");
  out.push("");
  if (rels.crossContext.length === 0) {
    out.push("_(no context cross-scope edges on this scope's embedded shells or consumed entities.)_");
  } else {
    out.push("<details>");
    out.push("<summary>" + rels.crossContext.length + " context edges</summary>");
    out.push("");
    out.push(...renderRelationshipTable(rels.crossContext, { includeOwnerSide: false, includeKind: false }));
    out.push("");
    out.push("</details>");
  }
  out.push("");

  // §6 Cross-domain context
  out.push("## 6. Cross-domain context");
  out.push("");
  out.push("### 6.1 Master consumers (other modules / domains that embed this scope's masters)");
  out.push("");
  out.push(...renderCoMasters(coMasters));
  out.push("");
  out.push("### 6.2 Outbound handoffs (events this scope publishes)");
  out.push("");
  if (outboundHandoffs.length === 0) {
    out.push("_(no outbound `handoffs` whose payload is in this scope.)_");
  } else {
    out.push(...renderHandoffTable(outboundHandoffs, "outbound"));
  }
  out.push("");
  out.push("### 6.3 Inbound handoffs (events this scope reacts to)");
  out.push("");
  if (inboundHandoffs.length === 0) {
    out.push("_(no inbound `handoffs` whose payload is in this scope.)_");
  } else {
    out.push(...renderHandoffTable(inboundHandoffs, "inbound"));
  }
  out.push("");
  out.push("### 6.4 Master providers (modules / domains that own masters this scope embeds)");
  out.push("");
  out.push(...renderDependencies(scopeRows, owners));
  out.push("");

  // §7 Lifecycle states
  // States belong to the data_object, not the module. Every entity touched by
  // this scope (any DMDO role) shows its full state machine; per-state
  // `realizing module` column indicates whose permission prefix the gate uses,
  // or "(always)" when the gate is universal (domain_module_id is NULL).
  out.push("## 7. Lifecycle states");
  out.push("");
  if (lifecycleRows.length === 0) {
    out.push("_(no lifecycle states loaded for the entities in this scope.)_");
  } else {
    const byObj = new Map<number, any[]>();
    for (const ls of lifecycleRows) {
      const did = ls.data_object_id as number;
      if (!byObj.has(did)) byObj.set(did, []);
      byObj.get(did)!.push(ls);
    }
    for (const [did, states] of [...byObj.entries()].sort((a, b) =>
      (dataObjectsById.get(a[0])?.data_object_name ?? "").localeCompare(dataObjectsById.get(b[0])?.data_object_name ?? ""),
    )) {
      const obj = dataObjectsById.get(did);
      if (!obj) continue;
      out.push(`### \`${obj.data_object_name}\` (${obj.singular_label})`);
      const scopeRow = scopeRows.find((r) => r.data_object_id === did);
      if (scopeRow && scopeRow.role !== "master") {
        const ownerInfo = owners.get(did);
        const ownerLabel = ownerInfo && ownerInfo.modules.length > 0
          ? ownerInfo.modules.map((m) => `\`${m.domain_module_code}\``).join(", ")
          : ownerInfo && ownerInfo.domains.length > 0
            ? ownerInfo.domains.map((d) => `\`${d.domain_code}\` (domain-level)`).join(", ")
            : "_(no canonical master found)_";
        out.push("");
        out.push(`_This scope holds \`${obj.data_object_name}\` as **${scopeRow.role}**; the canonical state machine is owned by ${ownerLabel}._`);
      }
      out.push("");
      const headers = ["order", "state_name", "initial?", "terminal?"];
      if (showModulesCol) headers.push("realizing module");
      headers.push("requires_permission?", "derived gate", "description");
      out.push(tableHeader(headers));
      for (const s of states) {
        const realizingId = s.domain_module_id as number | null;
        // M1: gate code comes from the single shared deriveGate (canonical fallback: NULL
        // domain_module_id is gated by the in-scope master's owning module). Byte-identical
        // to the previous inline computation on every resolving path.
        const g = deriveGate(s, scopeRows);
        let gate = s.requires_permission && g ? `\`${g.code}\`` : "";
        if (s.requires_permission && g && moduleIdSet.has(g.gateModule.id)) section7InScopeGates.add(g.code);
        // M2 (Policy 1): a requires_permission state on an entity mastered IN this scope that
        // still resolves to no module is a genuine gap (e.g. a dangling realizing module),
        // not the benign "gate owned by an out-of-scope master" case (which stays blank).
        // Annotate + warn rather than emit a silent empty gate.
        if (s.requires_permission && !g && scopeRows.some((r) => r.data_object_id === did && r.role === "master")) {
          gate = "⚠ _(unresolved gate: no realizing module)_";
          console.warn(`  ⚠ M2: requires_permission state \`${obj.data_object_name}.${s.state_name}\` resolves to no gate (${modules.map((m) => m.domain_module_code).join("+")})`);
        }
        const realizingLabel = realizingId === null
          ? "_(always)_"
          : moduleIdSet.has(realizingId)
            ? `\`${modulesById.get(realizingId)?.domain_module_code ?? `#${realizingId}`}\``
            : `\`${modulesById.get(realizingId)?.domain_module_code ?? `#${realizingId}`}\` (needs install)`;
        const cells: (string | number)[] = [
          s.state_order,
          `\`${s.state_name}\``,
          s.is_initial ? "✓" : "",
          s.is_terminal ? "✓" : "",
        ];
        if (showModulesCol) cells.push(realizingLabel);
        cells.push(s.requires_permission ? "✓" : "", gate, s.description || "");
        out.push(tableRow(cells));
      }
      // M4-emit (Policy 1): soft-assert the state-machine shape — exactly one is_initial, at
      // least one is_terminal, and unique/monotonic state_order. Annotate + warn on violation;
      // never throw (the audit and loader bands carry the hard enforcement).
      {
        const initials = states.filter((s: any) => s.is_initial).length;
        const terminals = states.filter((s: any) => s.is_terminal).length;
        const orders = states.map((s: any) => s.state_order as number);
        const orderOk = orders.every((v: number, i: number) => i === 0 || v > orders[i - 1]);
        const problems: string[] = [];
        if (initials !== 1) problems.push(`${initials} is_initial (expected exactly 1)`);
        if (terminals < 1) problems.push(`no is_terminal (expected at least 1)`);
        if (!orderOk) problems.push(`state_order not unique/monotonic`);
        if (problems.length > 0) {
          out.push("");
          out.push(`> ⚠ **state-machine shape:** ${problems.join("; ")}.`);
          console.warn(`  ⚠ M4: ${obj.data_object_name} state machine — ${problems.join("; ")} (${modules.map((m) => m.domain_module_code).join("+")})`);
        }
      }
      out.push("");
    }
  }

  // §8 Permissions and business rules
  out.push("## 8. Permissions and business rules (derived)");
  out.push("");
  if (modules.length === 1) {
    const m = modules[0];
    const slug = moduleSlug(m.domain_module_code);
    const moduleScopeRows = scopeRows.filter((r) => r.modules.includes(m));
    const moduleLifecycle = (lifecycleRows ?? []).filter((s: any) => {
      const masterHere = moduleScopeRows.some((r) => r.data_object_id === s.data_object_id && r.role === "master");
      return masterHere || s.domain_module_id === m.id;
    });
    const { permissions, businessRules } = deriveWorkflowGatesAndRules(slug, moduleScopeRows, moduleLifecycle, m.id);
    for (const p of permissions) if (p.tier === "workflow-gate (lifecycle)") section8Gates.add(p.code);
    out.push("### 8.1 Permissions");
    out.push("");
    out.push(tableHeader(["permission", "tier", "description", "included in `:admin`?"]));
    for (const p of permissions) out.push(tableRow([`\`${p.code}\``, p.tier, p.description, p.includedInAdmin ? "✓" : ""]));
    out.push("");
    out.push("### 8.2 Business rules");
    out.push("");
    if (businessRules.length === 0) {
      out.push("_(no flag-derived business rules.)_");
    } else {
      out.push(tableHeader(["rule_name", "data_object", "source flag", "intent"]));
      for (const r of businessRules) out.push(tableRow([`\`${r.name}\``, `\`${r.dataObject}\``, r.sourceFlag, r.intent]));
    }
    out.push("");
  } else {
    modules.forEach((m, idx) => {
      const slug = moduleSlug(m.domain_module_code);
      const moduleScopeRows = scopeRows.filter((r) => r.modules.includes(m));
      const moduleLifecycle = (lifecycleRows ?? []).filter((s: any) => {
        const masterHere = moduleScopeRows.some((r) => r.data_object_id === s.data_object_id && r.role === "master");
        return masterHere || s.domain_module_id === m.id;
      });
      const { permissions, businessRules } = deriveWorkflowGatesAndRules(slug, moduleScopeRows, moduleLifecycle, m.id);
      for (const p of permissions) if (p.tier === "workflow-gate (lifecycle)") section8Gates.add(p.code);
      out.push(`### 8.${idx + 1} \`${m.domain_module_code}\``);
      out.push("");
      out.push(tableHeader(["permission", "tier", "description", "included in `:admin`?"]));
      for (const p of permissions) out.push(tableRow([`\`${p.code}\``, p.tier, p.description, p.includedInAdmin ? "✓" : ""]));
      if (businessRules.length > 0) {
        out.push("");
        out.push("Business rules:");
        out.push("");
        out.push(tableHeader(["rule_name", "data_object", "source flag", "intent"]));
        for (const r of businessRules) out.push(tableRow([`\`${r.name}\``, `\`${r.dataObject}\``, r.sourceFlag, r.intent]));
      }
      out.push("");
    });
  }

  // M1 cross-section consistency check (Policy 1: warn, never throw). Every in-scope gate
  // §7 shows must also be minted by §8; a miss means the two derivations disagree.
  for (const code of section7InScopeGates) {
    if (!section8Gates.has(code)) {
      console.warn(`  ⚠ M1: §7 shows in-scope gate \`${code}\` that §8 does not mint (${modules.map((m) => m.domain_module_code).join("+")})`);
    }
  }

  // Capabilities moved to front matter (see `capabilities: [...]` above). The parent
  // domain's capability catalog is metadata, not body prose - reader can query the
  // domain map for realization details.

  // Sanitize em-dashes that may have leaked in from DB-authored descriptions / notes.
  // Project rule (see CLAUDE.md feedback): em-dashes are forbidden everywhere.
  return out.join("\n").replace(/—/g, "-");
}

function renderHandoffTable(rows: any[], direction: "outbound" | "inbound"): string[] {
  const out: string[] = [];
  const headers = direction === "outbound"
    ? ["source module", "target domain", "target module", "trigger_event", "transition", "payload", "integration", "friction", "description"]
    : ["target module", "source domain", "source module", "trigger_event", "transition", "payload", "integration", "friction", "description"];
  out.push(tableHeader(headers));
  for (const h of rows) {
    const sourceMod = modulesById.get(h.source_domain_module_id as number);
    const targetMod = modulesById.get(h.target_domain_module_id as number);
    const sourceDom = domainsById.get(h.source_domain_id as number);
    const targetDom = domainsById.get(h.target_domain_id as number);
    const sourceModLabel = sourceMod ? sourceMod.domain_module_code : "_(domain-level)_";
    const targetModLabel = targetMod ? targetMod.domain_module_code : "_(domain-level)_";
    const sourceDomLabel = sourceDom ? sourceDom.domain_code : `domain #${h.source_domain_id}`;
    const targetDomLabel = targetDom ? targetDom.domain_code : `domain #${h.target_domain_id}`;
    const trigger = h.trigger_events?.event_name ? `\`${h.trigger_events.event_name}\`` : "";
    // m8b: carry the trigger's state transition (and event_category) into §6 — the transition
    // is what defines the event, and §6 previously dropped it.
    const te = h.trigger_events || {};
    const fromS = te.from_state ? `\`${te.from_state}\`` : "";
    const toS = te.to_state ? `\`${te.to_state}\`` : "";
    const trans = fromS && toS ? `${fromS} → ${toS}` : (toS || fromS || "");
    const transition = te.event_category ? (trans ? `${trans} _(${te.event_category})_` : `_(${te.event_category})_`) : trans;
    const payload = h.data_objects?.data_object_name ? `\`${h.data_objects.data_object_name}\`` : "";
    if (direction === "outbound") {
      out.push(tableRow([sourceModLabel, targetDomLabel, targetModLabel, trigger, transition, payload, h.integration_pattern || "", h.friction_level || "", h.description || ""]));
    } else {
      out.push(tableRow([targetModLabel, sourceDomLabel, sourceModLabel, trigger, transition, payload, h.integration_pattern || "", h.friction_level || "", h.description || ""]));
    }
  }
  return out;
}

// ============================================================
// Derivation helpers (permissions + business rules)
// ============================================================

type Permission = { code: string; tier: string; description: string; includedInAdmin: boolean };
type BusinessRule = { name: string; dataObject: string; sourceFlag: string; intent: string };

function deriveWorkflowGatesAndRules(
  slug: string,
  moduleObjects: any[],
  lifecycleRows: any[],
  thisModuleId: number,
): { permissions: Permission[]; businessRules: BusinessRule[] } {
  const permissions: Permission[] = [];
  const businessRules: BusinessRule[] = [];

  permissions.push({ code: `${slug}:read`, tier: "baseline-read", description: "Read access to every entity in the module", includedInAdmin: true });
  permissions.push({ code: `${slug}:manage`, tier: "baseline-manage", description: "Edit operational records", includedInAdmin: true });
  permissions.push({ code: `${slug}:admin`, tier: "baseline-admin", description: "Edit reference data and inherit every workflow gate below", includedInAdmin: false });

  const moduleMasterIds = new Set(
    moduleObjects.filter((r) => r.role === "master").map((r) => r.data_object_id as number),
  );
  for (const ls of lifecycleRows) {
    if (!ls.requires_permission) continue;
    const realizingId = ls.domain_module_id as number | null;
    const ownsAsRealizer = realizingId === thisModuleId;
    const ownsAsMaster = realizingId === null && moduleMasterIds.has(ls.data_object_id as number);
    if (!ownsAsRealizer && !ownsAsMaster) continue;
    // M1: same shared deriveGate as §7. On this ownership path its prefix is always this
    // module's slug, so the emitted code is byte-identical to the previous `${slug}:...`.
    const g = deriveGate(ls, moduleObjects);
    if (!g) continue;
    permissions.push({
      code: g.code,
      tier: "workflow-gate (lifecycle)",
      description: `Transition \`${g.obj.data_object_name}\` into state \`${ls.state_name}\``,
      includedInAdmin: true,
    });
  }

  for (const r of moduleObjects) {
    if (r.role !== "master") continue;
    const o = r.data_object as DataObject;
    if (!o) continue;
    const entitySingular = entitySingularToken(o);
    const entityPlural = entityPluralToken(o);
    if (o.has_personal_content) {
      permissions.push({
        code: `${slug}:view_all_${entityPlural}`,
        tier: "override (personal_content)",
        description: `View all \`${o.data_object_name}\` rows beyond row-scope`,
        includedInAdmin: true,
      });
      permissions.push({
        code: `${slug}:manage_all_${entityPlural}`,
        tier: "override (personal_content)",
        description: `Manage all \`${o.data_object_name}\` rows beyond row-scope`,
        includedInAdmin: true,
      });
      businessRules.push({
        name: `${entitySingular}_edit_scope`,
        dataObject: o.data_object_name,
        sourceFlag: "has_personal_content",
        intent: `Row-scope by default; override via \`${slug}:view_all_${entityPlural}\` / \`${slug}:manage_all_${entityPlural}\``,
      });
    }
    if (o.has_submit_lock) {
      permissions.push({
        code: `${slug}:submit_${entitySingular}`,
        tier: "override (submit_lock)",
        description: `Submit and lock a \`${o.data_object_name}\` row (post-submit edits gated)`,
        includedInAdmin: true,
      });
      businessRules.push({
        name: `submit_restricted_to_${entitySingular}_owner`,
        dataObject: o.data_object_name,
        sourceFlag: "has_submit_lock",
        intent: `Only the row's authoring user can submit; post-submit the row is read-only except via \`${slug}:manage_all_${entityPlural}\``,
      });
    }
    if (o.has_single_approver) {
      // M3: name the entity's ACTUAL approval gate (honoring permission_verb_override) instead
      // of the unconditional approve_<entity>. Find the entity's approve-class requires_permission
      // state and resolve its gate via the shared deriveGate. Only override when such a gate
      // exists and differs, so entities without one keep their previous (byte-identical) intent.
      const approveState = lifecycleRows.find((ls: any) =>
        ls.data_object_id === r.data_object_id && ls.requires_permission &&
        /approv/i.test(String(ls.permission_verb_override || ls.state_name)));
      const approveGate = approveState ? deriveGate(approveState, moduleObjects) : null;
      const intent = approveGate && approveGate.code !== `${slug}:approve_${entitySingular}`
        ? `Exactly one explicit approver required; uses the module's approval gate (\`${approveGate.code}\`).`
        : `Exactly one explicit approver required; uses the module's approval gate (\`${slug}:approve_${entitySingular}\` if surfaced as a lifecycle workflow gate).`;
      businessRules.push({
        name: `approve_${entitySingular}_requires_approver`,
        dataObject: o.data_object_name,
        sourceFlag: "has_single_approver",
        intent,
      });
    }
  }

  return { permissions, businessRules };
}

// ============================================================
// IO + driver
// ============================================================

async function emitOneModuleFactSheet(m: ModuleRow): Promise<{ path: string; changed: boolean }> {
  const md = await emitFactSheet([m]);
  const outPath = resolve(BLUEPRINTS_DIR, `${moduleSlug(m.domain_module_code)}${BLUEPRINT_SUFFIX}`);
  let changed = true;
  if (existsSync(outPath)) {
    const existing = readFileSync(outPath, "utf8");
    if (existing === md) changed = false;
  }
  if (!CHECK && changed) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, md, "utf8");
  }
  return { path: outPath, changed };
}

if (MODULE_CODE) {
  const m = modulesByCode.get(MODULE_CODE);
  if (!m) {
    console.error(`module ${MODULE_CODE} not found in domain_modules`);
    exit(2);
  }
  const r = await emitOneModuleFactSheet(m);
  console.log(`${r.changed ? (CHECK ? "WOULD-CHANGE" : "wrote") : "unchanged"}  ${MODULE_CODE}  →  ${r.path}`);
  if (CHECK && r.changed) exit(1);
} else if (ALL) {
  let modulesChanged = 0;
  // m9 (plan-1-consistency.md Policy 1): collect per-module integrity errors and keep
  // going. One module's violation (e.g. a multi-master data_object) must never brick the
  // whole corpus; the rest still regenerates and the failures are reported as a banner
  // below, which forces a non-zero exit so CI still sees them.
  const failures: { code: string; message: string }[] = [];
  for (const m of allModules) {
    try {
      const r = await emitOneModuleFactSheet(m);
      if (r.changed) modulesChanged++;
      console.log(`${r.changed ? (CHECK ? "WOULD-CHANGE" : "wrote") : "unchanged"}  module ${m.domain_module_code}  →  ${r.path}`);
    } catch (e) {
      const message = (e as Error).message;
      failures.push({ code: m.domain_module_code, message });
      console.error(`FAILED module ${m.domain_module_code}: ${message}`);
    }
  }
  console.log("");
  console.log(`summary: modules ${modulesChanged}/${allModules.length} ${CHECK ? "would change" : "changed"}, ${failures.length} failed`);
  let bad = false;
  if (failures.length > 0) {
    console.error("");
    console.error(`=== ${failures.length} module(s) failed integrity and were skipped ===`);
    for (const f of failures) console.error(`  - ${f.code}: ${f.message}`);
    console.error("(corpus still regenerated for every passing module; fix the data above to clear these.)");
    bad = true;
  }
  if (CHECK && modulesChanged > 0) {
    console.error("drift detected - re-run without --check to regenerate, then commit.");
    bad = true;
  }
  if (bad) exit(1);
}
