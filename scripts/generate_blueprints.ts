#!/usr/bin/env bun
// scripts/generate_blueprints.ts - plan-modules.md §11 step 4 (revised per §9, session 3).
//
// Per-module emitter:
//   Per-module blueprints → blueprints/<MODULE-CODE>-semantic-blueprint.md
//   One per `domain_modules` row. The deployable unit's surface: data_objects assigned to
//   this module, lifecycle states on this module's masters, module-scoped permissions and
//   business rules, capabilities realized, outbound/inbound integration handoffs, architect
//   handoff hints. (Tool requirements live on `domain_module_tools`; the domain's single
//   `system` skill derives its toolset from them. Semantius coverage % is a domain-grain
//   rollup, not rendered here; see scripts/analytics/coverage_rollup.ts.)
//
// Starter-kit rendering is gone (multi-module bundles are no longer authored as a separate
// artifact). Cross-cutting modules live alongside everyone else in blueprints/; their blueprint swaps the parent-domain section for a host-domains section.
//
// Usage:
//   bun run scripts/generate_blueprints.ts --module ATS-CANDIDATE-CRM
//   bun run scripts/generate_blueprints.ts --regenerate         # refresh ONLY the existing blueprint files
//   bun run scripts/generate_blueprints.ts --regenerate --check # CI drift check over existing files
//   bun run scripts/generate_blueprints.ts --released           # a file for every module hosted on a RELEASED domain
//   bun run scripts/generate_blueprints.ts --all                # (re)generate a file for EVERY module (rare)
//   bun run scripts/generate_blueprints.ts --lint               # R1-R8 over the existing blueprints' modules; writes nothing
//
// Every emit also runs the derived-result invariants R1-R8 (./lib/blueprint_invariants.ts) and
// prints their findings to stderr (Policy 1: warn, never throw). `--lint` writes no file, prints the
// findings with a per-rule summary, and exits non-zero on any `fail` finding; it lints the existing
// blueprint files' modules by default, or the --module / --released / --all selection.
//
// Importable: the CLI runs only when this file is the entry point (import.meta.main). Tests import
// renderBlueprint(modules, index, all) to render a blueprint from an offline fixture catalog.
//
// "Regenerate" means refresh what already exists on disk; it never creates a file for a module
// that has no blueprint yet (that is what --all does). Default to --regenerate. Use --all only
// when explicitly asked to (re)generate the entire corpus, because it walks every domain_modules
// row and can be far slower and wider than the curated set of committed blueprints.

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { argv, exit } from "node:process";
import {
  clearCatalogCache,
  isDomainReleased,
  loadCachedCatalog,
  ROLE_ORDER,
  ROLE_RANK,
  type AllRelationships,
  type CatalogIndex,
  type CoMasterRow,
  type IndustryRow,
  type ModuleCatalog,
  type ModuleRow,
  type OwnerInfo,
  type ScopeRow,
} from "./lib/catalog";
import {
  deriveBlueprintModel,
  makeDeriveCtx,
  moduleSlug,
  type BlueprintModel,
  type DeriveCtx,
  type HandoffModel,
  type RelationshipModel,
} from "./lib/blueprint_derive";
import { checkModel, RULE_IDS, RULES, type ModelFinding } from "./lib/blueprint_invariants";

// ---------- CLI flags (set by main) ----------
// Only the IO driver reads these; the renderers below never do.
let CHECK = false;

const ROOT = "c:/dev/domain-map";
const BLUEPRINTS_DIR = `${ROOT}/catalog/blueprints`;
const BLUEPRINT_SUFFIX = "-semantic-blueprint.md";
const TODAY = new Date().toISOString().slice(0, 10);
// Blueprint file format version (front-matter `version`): the architect's semantic-blueprint format
// the catalog blueprints follow (semantius-architect references/semantic-blueprint-template.md). The
// format owns this value; it changes only when the architect's format version changes. 3.1 carries
// the 3.0 Section 3 columns (`canonical code` beside `data_object`, `entity_type` immediately before
// `write tier`) plus the §7 `high risk?` column. Emit exactly this one version key, never a
// consumer/authoring-tool version.
const BLUEPRINT_VERSION = "3.1";

// ---------- catalog bindings (set by bindCatalog) ----------
// The markdown renderers below read the catalog through these module bindings; bindCatalog sets
// them from a loaded (or offline fixture) CatalogIndex + AllRelationships before any render.
let domainsById: CatalogIndex["domainsById"];
let dataObjectsById: CatalogIndex["dataObjectsById"];
let industriesById: CatalogIndex["industriesById"];
let modulesById: CatalogIndex["modulesById"];
let USERS_ID = -1;
// The derivation rules (./lib/blueprint_derive.ts) read the catalog only through this context.
let deriveCtx: DeriveCtx;

function bindCatalog(index: CatalogIndex, all: AllRelationships): void {
  ({ domainsById, dataObjectsById, industriesById, modulesById } = index);
  USERS_ID = index.usersId;
  deriveCtx = makeDeriveCtx(index, all);
}

// Render one blueprint (the full markdown file) for a scope of modules from an already-loaded
// catalog. Pure apart from the emit-time console warnings: no catalog fetch, no file IO.
export function renderBlueprint(modules: ModuleRow[], index: CatalogIndex, all: AllRelationships): string {
  bindCatalog(index, all);
  return emitBlueprint(modules);
}

// ---------- helpers ----------

function lowerSlug(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
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

// Empty-section convention (the blueprint schema, applied to EVERY generated blueprint,
// including clone-like starter / lite units). Every canonical section heading is always
// emitted; nothing is ever silently omitted (no numbering gaps). A section with no content
// carries this canonical placeholder, never a bare-empty heading and never an old-form
// `_(no ...)_` sentence stub. Format: `_(none: <short reason>)_` - lowercase `none`, a
// COLON (never an em-dash; that is a project rule and a downstream scan rewrites them), then
// a brief reason. A bare `_(none)_` is allowed when no reason adds value. Route every
// empty-section placeholder through this helper so the format cannot drift section to section.
function noneSection(reason?: string): string {
  return reason ? `_(none: ${reason})_` : "_(none)_";
}

// Push a `key: value` front-matter line, rendering multi-paragraph prose (e.g. a 1-3
// paragraph `catalog_description`) as a YAML literal block scalar so it stays human-readable
// in the committed file. Single-line values fall back to escapeYaml. Blank lines between
// paragraphs are emitted unindented (valid inside a literal block scalar).
function pushYamlField(out: string[], key: string, value: string): void {
  if (value.includes("\n")) {
    out.push(`${key}: |`);
    for (const line of value.split("\n")) out.push(line ? `  ${line}` : "");
  } else {
    out.push(`${key}: ${escapeYaml(value)}`);
  }
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
    // Rule 5 (edge-verb consistency): the diagram edge label must equal the §5.1 / §5.2 verb
    // column byte-for-byte. The verb column is the bare `relationship_verb`; edge optionality is
    // conveyed by the §5 `necessity` column (and the per-node dashed-stroke overlay below), NOT by
    // an `(opt)` suffix on the label, so we emit the bare verb here too.
    const verb = (r.relationship_verb || "→").replace(/"/g, '\\"');
    lines.push(`  ${a.data_object_name} -->|"${verb}"| ${b.data_object_name}`);
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
  // Three columns: Name (plural label) + data_object (snake_case natural key) + Description.
  // The Description cell prefers the short reader-facing `catalog_description`; it falls back
  // to the analyst-facing `description` when catalog_description has not been authored yet, so
  // the surface degrades gracefully mid-migration.
  // Role classification is conveyed visually via the mermaid color coding below.
  out.push(tableHeader(["Name", "data_object", "Description"]));
  const sorted = [...scopeRows].sort((a, b) => {
    const ra = ROLE_RANK[a.role] ?? 99;
    const rb = ROLE_RANK[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.data_object.plural_label.localeCompare(b.data_object.plural_label);
  });
  for (const r of sorted) {
    out.push(tableRow([
      r.data_object.plural_label,
      `\`${r.data_object.data_object_name}\``,
      r.data_object.catalog_description || r.data_object.description || "",
    ]));
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
    out.push(noneSection("no industry-scoped aliases for this scope"));
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

function renderRelationshipTable(rows: RelationshipModel[], opts: { includeOwnerSide: boolean; includeKind: boolean }): string[] {
  const out: string[] = [];
  if (rows.length === 0) return out;
  const headers: string[] = ["from", "verb", "to", "cardinality"];
  if (opts.includeKind) headers.push("kind");
  headers.push("necessity");
  if (opts.includeOwnerSide) headers.push("owner_side");
  headers.push("delete_mode", "fk_format", "notes");
  out.push(tableHeader(headers));
  for (const { edge: r, deleteMode: dm } of rows) {
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
    // B4 + Plan 4 step C: resolved ON DELETE mode + Semantius FK format per edge, presence-
    // conditional on whether the other endpoint is in the emitted scope (derived in the model).
    cells.push(dm.mode, dm.fkFormat);
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

// The gate-code derivation (M1 deriveGate) and every other derivation rule live in
// ./lib/blueprint_derive.ts; the renderers below read their results from the BlueprintModel.

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

// Coverage % is no longer rendered in the per-module blueprint. It is computed at the domain
// grain from `domain_module_tools` (rolled up over the domain's primary + host modules) by
// scripts/analytics/coverage_rollup.ts, after the per-domain-skill migration retired the
// per-module `system` skill + `skill_tools` grain. The former dead `computeCoverage` helper that
// read `skill_tools` was removed with that migration (it had no call site).

// ============================================================
// UNIFIED BLUEPRINT EMITTER
// One body shape for both single-module and multi-module (starter-kit / future bundle)
// blueprints. Scope = union of input modules' data_objects, strongest role wins per
// data_object. Front matter difference is the length of the `domain_modules:` list.
// ============================================================

function emitBlueprint(modules: ModuleRow[], kindLabel?: string): string {
  if (modules.length === 0) throw new Error("emitBlueprint requires at least one module");

  // All scoped queries (DMDO aggregation, aliases, relationships, co-masters, owners,
  // lifecycle states, handoff attribution, related-module derivation) live in
  // ./lib/catalog.ts. Same code path that emit_domain_map.ts uses, so the two emitters
  // can never report different facts for the same module. Every derived value sections 2-9
  // show (write tiers, delete modes, gates, permissions, roles, RACI) is computed once, in
  // ./lib/blueprint_derive.ts, into the BlueprintModel; the code below only renders it.
  const model: BlueprintModel = deriveBlueprintModel(modules, deriveCtx);
  const cat: ModuleCatalog = model.catalog;
  const {
    scopeRows,
    scopeRolesById,
    scopeNecessityById,
    aliasRows,
    relationships: rels,
    coMasters,
    owners,
    lifecycleRows,
    parentDomains,
  } = cat;
  const moduleIdSet = model.moduleIdSet;
  // M1 cross-section consistency: collect the in-scope gates §7 shows and the gates §8 mints,
  // then warn (Policy 1, never throw) if §7 shows an in-scope gate §8 fails to mint.
  const section7InScopeGates = new Set<string>();
  const section8Gates = new Set<string>();
  const relatedModules = model.relatedModules;

  // ---- render ----
  const out: string[] = [];

  // Front matter
  // The blueprint IS the semantic-blueprint artifact: a human-readable + machine-parseable
  // description of one deployable system (module) or its starter-kit bundle.
  //   - system_name: the human-readable label. Module name / domain name from the
  //     catalog. Not a marketing tagline.
  //   - system_slug: the lowercase path-safe form of the module/domain code. Used as the filename
  //     stem; the on-disk filename is `<system_slug>-semantic-blueprint.md`.
  // domain_modules / related_modules entries are emitted as slugs (lowercase, dashed) so
  // any downstream tool can `glob *-semantic-blueprint.md` and join entry-by-entry without
  // case-folding.
  const isStarterKit = modules.length > 1 && parentDomains.length === 1;
  // A promoted bundle (plan §3) is a SINGLE starter module whose parent domain is
  // domain_kind='bundle'. isStarterKit is structurally false for it (one module), so detect it
  // explicitly: its buyer catalog copy lives on the bundle-DOMAIN and must be read from there so
  // it survives the §5 module-catalog CLEAR (Finding 1). Falls back to the module copy pre-§3 /
  // pre-clear (bundleDomain null until promotion).
  const bundleDomain = parentDomains.find((d) => d.domain_kind === "bundle") ?? null;
  const systemName = isStarterKit ? parentDomains[0].domain_code : modules[0].domain_module_code;
  const systemDescription = isStarterKit ? parentDomains[0].domain_name : modules[0].domain_module_name;
  const systemSlug = moduleSlug(systemName);

  // Buyer-voice catalog copy from the source row (per Rule #20), surfaced into front matter
  // for the catalog / site generator. Single module: pull from that module. Multi-module
  // starter kit or domain-bundle: pull from the parent domain. Empty when the catalog UX
  // field hasn't been backfilled yet; the M8 / A4 audits catch the gap.
  //   - tagline: the one-liner (catalog_tagline).
  //   - description: the long-form 1-3 paragraph buyer copy (catalog_description).
  // These replace the former in-body §1.1/§1.2 overview split: the body's §1 now carries
  // only the analyst voice (no sub-headings); the buyer voice lives entirely here.
  const catalogTagline = bundleDomain
    ? bundleDomain.catalog_tagline || modules[0].catalog_tagline || ""
    : isStarterKit
      ? parentDomains[0].catalog_tagline || ""
      : modules[0].catalog_tagline || "";
  const catalogDescription = bundleDomain
    ? bundleDomain.catalog_description || modules[0].catalog_description || ""
    : isStarterKit
      ? parentDomains[0].catalog_description || ""
      : modules[0].catalog_description || "";

  // persona: the deduplicated persona actors realized in the §9 RACI tables (B3), aggregated
  // across every module in scope (model.personas, from the same per-module RACI the §9 loop
  // renders, sorted for a stable emit). Empty when no `process_raci` rows are wired to this
  // scope's gated processes.
  const personas = model.personas;

  out.push("---");
  out.push("artifact: semantic-blueprint");
  out.push(`version: "${BLUEPRINT_VERSION}"`);
  out.push("license: MIT");
  out.push(`system_name: ${escapeYaml(systemDescription)}`);
  if (catalogTagline) out.push(`tagline: ${escapeYaml(catalogTagline)}`);
  if (catalogDescription) pushYamlField(out, "description", catalogDescription);
  out.push(`system_slug: ${systemSlug}`);
  out.push("domain_modules:");
  for (const m of modules) out.push(`  - ${moduleSlug(m.domain_module_code)}`);
  if (parentDomains.length > 0) {
    out.push(parentDomains.length === 1 ? `domain_code: ${parentDomains[0].domain_code}` : "domain_codes:");
    if (parentDomains.length > 1) for (const d of parentDomains) out.push(`  - ${d.domain_code}`);
    // icon_name: the Lucide icon of the (primary) parent domain, surfaced for the catalog /
    // site generator. Multi-domain scopes take the first parent's icon. Omitted when the
    // domain carries no icon (icon_name empty), so icon-less blueprints stay byte-identical.
    if (parentDomains[0].icon_name) out.push(`icon_name: ${escapeYaml(parentDomains[0].icon_name)}`);
  }
  if (relatedModules.length > 0) {
    out.push(`related_modules: [${relatedModules.map((m) => moduleSlug(m.domain_module_code)).join(", ")}]`);
  }
  out.push(`persona: [${personas.join(", ")}]`);
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
  // Analyst voice only (the row's `description`: single-module domain_modules.description;
  // multi-module domains.description + business_logic). Internal-facing; describes market
  // position, mastership, handoffs. No sub-headings. The buyer voice (catalog_tagline /
  // catalog_description, per Rule #20) is NOT rendered in the body any more; it lives in the
  // front matter `tagline` / `description` fields. If `description` is missing the heading is
  // still emitted with the canonical empty-section placeholder (Rule 1: never a numbering gap);
  // the A1 / per-module-description review independently catches the missing prose upstream.
  const analystOverviewLines: string[] = [];
  if (modules.length === 1) {
    if (modules[0].description) analystOverviewLines.push(modules[0].description);
  } else if (parentDomains.length === 1) {
    const d = parentDomains[0];
    if (d.description) analystOverviewLines.push(d.description);
    if (d.business_logic) {
      if (analystOverviewLines.length > 0) analystOverviewLines.push("");
      analystOverviewLines.push(d.business_logic);
    }
  } else {
    const joined = parentDomains.map((d) => d.description).filter(Boolean).join(" ");
    if (joined) analystOverviewLines.push(joined);
  }
  out.push("## 1. Overview");
  out.push("");
  if (analystOverviewLines.length > 0) {
    out.push(...analystOverviewLines);
  } else {
    out.push(noneSection("no analyst overview authored for this scope"));
  }
  out.push("");

  // §2 Entity summary - table + mermaid in the same section
  out.push("## 2. Entity summary");
  out.push("");
  if (scopeRows.length === 0) {
    out.push(noneSection("no data_objects in scope"));
    out.push("");
  } else {
    out.push(...renderEntitySummary(scopeRows));
    out.push("");
    out.push(...renderMermaid(scopeRolesById, scopeNecessityById, rels.all));
    out.push("");
  }

  // Specification requirements - AUTHORED, not derived. The one body section that is not a
  // projection of the catalog graph: it carries `domain_modules.specification_requirements`, the
  // architect's hand-off to the modeler / deployer. Motivating case: a starter / bundle that
  // collapses a multi-entity pattern from the full module into a flat field on a surviving embedded
  // shell (e.g. showback-lite cost: the full SMP/ITAM modules carry spend across separate entities
  // the starter omits, so it must denormalize a flat cost field onto its shells or its renewal/cost
  // view cannot resolve). A prose directive, NOT a copy of the field contract (that lives on the
  // deployed entities; see SKILL.md field-boundary note).
  //
  // Placed at the overview->detail boundary: AFTER §2 (the entity list + mermaid, which with §1 form
  // the high-level overview a casual reader scans) and BEFORE §3 Entities catalog (where the entity
  // detail begins). Spec requirements are specialist detail for the architect / analyst, so they
  // head the detailed sections rather than interrupt the overview. UNNUMBERED on purpose: authored
  // intent, not part of the derived §1-§9 schema, so staying unnumbered avoids cascade-renumbering
  // §3-§9. CONDITIONAL: emitted only when >=1 in-scope module carries a non-empty value, so the
  // field-less majority of blueprints stay byte-identical (no spurious drift / no mass regenerate).
  const specModules = modules.filter((m) => (m.specification_requirements ?? "").trim().length > 0);
  if (specModules.length > 0) {
    out.push("## Additional Requirements Specification");
    out.push("");
    if (specModules.length === 1) {
      out.push(specModules[0].specification_requirements.trim());
      out.push("");
    } else {
      for (const m of specModules) {
        out.push(`### \`${m.domain_module_code}\``);
        out.push("");
        out.push(m.specification_requirements.trim());
        out.push("");
      }
    }
  }

  // §3 Entities catalog
  out.push("## 3. Entities catalog");
  out.push("");
  const showModulesCol = modules.length > 1;
  if (scopeRows.length === 0) {
    out.push(noneSection("no data_objects in scope"));
  } else {
    // 3.0 Section 3 header (13 canonical columns). `canonical code` sits immediately after
    // `data_object`; `entity_type` sits immediately before `write tier`. Downstream parses by
    // header name, not column position, but this is the canonical order. (`modules` is an
    // extra multi-module-bundle column inserted before `notes`; single-module blueprints omit it.)
    const headers = ["#", "data_object", "canonical code", "singular", "plural", "role", "mastered in", "mastered label", "necessity", "personal_content", "entity_type", "write tier"];
    if (showModulesCol) headers.push("modules");
    headers.push("notes");
    out.push(tableHeader(headers, ["right"]));
    const sortOrder = ["master", "embedded_master", "contributor", "consumer", "derived"];
    const sorted = [...model.entities].sort((a, b) => {
      const ra = sortOrder.indexOf(a.role) === -1 ? 99 : sortOrder.indexOf(a.role);
      const rb = sortOrder.indexOf(b.role) === -1 ? 99 : sortOrder.indexOf(b.role);
      if (ra !== rb) return ra - rb;
      return a.data_object.plural_label.localeCompare(b.data_object.plural_label);
    });
    let i = 1;
    for (const r of sorted) {
      const o = r.data_object;
      const owner = masteredIn(r, owners);
      // B2: per-entity write tier from entity_type (junctions consult their neighbors), derived in the model.
      const wt = r.writeTier;
      const wtCell = wt.write === null ? "read-only" : `\`${wt.write}\`${wt.pending ? " _(pending)_" : ""}`;
      // `canonical code`: the stable uber-model identity (3.0). The domain map IS the uber-model
      // and uses canonical, agent-optimized naming, so canonical code == data_object here (spec
      // population rule #1: self-describing naming). It is the value that feeds the downstream
      // platform `entities.catalog_entity_code` once deployed; `data_object` is the deployed name
      // and may drift (dialect / silo) at deploy time, the canonical code does not.
      const canonicalCode = `\`${o.data_object_name}\``;
      const cells: (string | number)[] = [
        i++,
        `\`${o.data_object_name}\``,
        canonicalCode,
        o.singular_label,
        o.plural_label,
        r.role,
        owner.code,
        owner.label,
        r.necessity || "-",
        o.has_personal_content ? "yes" : "",
        o.entity_type || "unclassified",
        wtCell,
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
  if (model.relationships.intra.length === 0) {
    out.push(noneSection("no relationships with both endpoints inside the scope"));
  } else {
    out.push(...renderRelationshipTable(model.relationships.intra, { includeOwnerSide: true, includeKind: true }));
  }
  out.push("");
  out.push("### 5.2 Built-in edges (`users` and other platform built-ins)");
  out.push("");
  if (model.relationships.userRels.length === 0) {
    out.push(noneSection("no relationships against platform built-ins"));
  } else {
    out.push(...renderRelationshipTable(model.relationships.userRels, { includeOwnerSide: true, includeKind: false }));
  }
  out.push("");
  out.push("### 5.3 Cross-scope edges");
  out.push("");
  out.push("#### 5.3a Outbound from this scope's masters and contributors");
  out.push("");
  out.push("_Edges this scope drives: the in-scope endpoint has `role` of `master` or `contributor`._");
  out.push("");
  if (model.relationships.crossOutbound.length === 0) {
    out.push(noneSection("no outbound cross-scope edges from this scope's masters or contributors"));
  } else {
    out.push(...renderRelationshipTable(model.relationships.crossOutbound, { includeOwnerSide: false, includeKind: false }));
  }
  out.push("");
  out.push("#### 5.3b Context edges on embedded shells and consumed entities");
  out.push("");
  out.push("_Edges the canonical owner drives, shown for context: the in-scope endpoint has `role` of `embedded_master`, `consumer`, or `derived`._");
  out.push("");
  if (model.relationships.crossContext.length === 0) {
    out.push(noneSection("no context cross-scope edges on this scope's embedded shells or consumed entities"));
  } else {
    // Rule 4 (no raw HTML): plain markdown table, never a `<details>` / `<summary>` collapsible.
    out.push(...renderRelationshipTable(model.relationships.crossContext, { includeOwnerSide: false, includeKind: false }));
  }
  out.push("");

  // §6 Cross-domain context
  out.push("## 6. Cross-domain context");
  out.push("");
  out.push("### 6.1 Master consumers (other modules / domains that embed this scope's masters)");
  out.push("");
  if (coMasters.length === 0) {
    out.push(noneSection("no other module embeds this scope's masters; the canonical owners do."));
  } else {
    out.push(...renderCoMasters(coMasters));
  }
  out.push("");
  out.push("### 6.2 Outbound handoffs (events this scope publishes)");
  out.push("");
  if (model.handoffs.outbound.length === 0) {
    out.push(noneSection("no outbound handoffs whose payload is in this scope"));
  } else {
    out.push(...renderHandoffTable(model.handoffs.outbound, "outbound"));
  }
  out.push("");
  out.push("### 6.3 Inbound handoffs (events this scope reacts to)");
  out.push("");
  if (model.handoffs.inbound.length === 0) {
    out.push(noneSection("no inbound handoffs whose payload is in this scope"));
  } else {
    out.push(...renderHandoffTable(model.handoffs.inbound, "inbound"));
  }
  out.push("");
  out.push("### 6.4 Master providers (modules / domains that own masters this scope embeds)");
  out.push("");
  if (scopeRows.some((r) => r.role !== "master")) {
    out.push(...renderDependencies(scopeRows, owners));
  } else {
    out.push(noneSection("this scope embeds no masters owned elsewhere; every entity is mastered here"));
  }
  out.push("");

  // §7 Lifecycle states
  // States belong to the data_object, not the module. Every entity touched by
  // this scope (any DMDO role) shows its full state machine; per-state
  // `realizing module` column indicates whose permission prefix the gate uses,
  // or "(always)" when the gate is universal (domain_module_id is NULL).
  out.push("## 7. Lifecycle states");
  out.push("");
  if (lifecycleRows.length === 0) {
    out.push(noneSection("no lifecycle states for the entities in this scope"));
  } else {
    // model.lifecycle: one entry per entity, sorted by data_object_name, each state carrying the
    // gate the shared deriveGate resolves against the whole emitted scope.
    for (const { dataObject: obj, scopeRow, states: stateModels } of model.lifecycle) {
      const did = obj.id;
      const states = stateModels.map((sm) => sm.state);
      out.push(`### \`${obj.data_object_name}\` (${obj.singular_label})`);
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
      // `high risk?` sits right after `requires_permission?` (architect template §7): ✓ only on a
      // gated row whose catalog state is_high_risk; it changes who holds the gate only under `raci`.
      headers.push("requires_permission?", "high risk?", "derived gate", "description");
      out.push(tableHeader(headers));
      for (const { state: s, gate: g } of stateModels) {
        const realizingId = s.domain_module_id as number | null;
        // M1: gate code comes from the single shared deriveGate (canonical fallback: NULL
        // domain_module_id is gated by the in-scope master's owning module), resolved in the model.
        let gate = s.requires_permission && g ? `\`${g.code}\`` : "";
        // Plan 4 step D: a re-prefixed gate is realized locally by the installing unit, so it
        // counts as in-scope for the M1 §7-vs-§8 cross-check even though its canonical realizer
        // is out of scope.
        if (s.requires_permission && g && (moduleIdSet.has(g.gateModule.id) || g.reprefixed)) section7InScopeGates.add(g.code);
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
            : g?.reprefixed
              // Plan 4 step D: realizer absent, entity carried as embedded_master, gate re-prefixed.
              ? `\`${modulesById.get(realizingId)?.domain_module_code ?? `#${realizingId}`}\` (gate re-prefixed to installing unit)`
              : `\`${modulesById.get(realizingId)?.domain_module_code ?? `#${realizingId}`}\` (needs install)`;
        const cells: (string | number)[] = [
          s.state_order,
          `\`${s.state_name}\``,
          s.is_initial ? "✓" : "",
          s.is_terminal ? "✓" : "",
        ];
        if (showModulesCol) cells.push(realizingLabel);
        cells.push(s.requires_permission ? "✓" : "", s.requires_permission && s.is_high_risk ? "✓" : "", gate, s.description || "");
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
  // §8 and §9 read the per-module derivations from model.perModule (one entry per module, in
  // `modules` order); the §8 permission set there is the same one the §9 hierarchy is built from.
  if (modules.length === 1) {
    const { permissions, businessRules } = model.perModule[0];
    for (const p of permissions) if (p.tier === "workflow-gate (lifecycle)") section8Gates.add(p.code);
    out.push("### 8.1 Permissions");
    out.push("");
    out.push(tableHeader(["permission", "tier", "description", "included in `:admin`?"]));
    for (const p of permissions) out.push(tableRow([`\`${p.code}\``, p.tier, p.description, p.includedInAdmin ? "✓" : ""]));
    out.push("");
    out.push("### 8.2 Business rules");
    out.push("");
    if (businessRules.length === 0) {
      out.push(noneSection("no flag-derived business rules"));
    } else {
      out.push(tableHeader(["rule_name", "data_object", "source flag", "intent"]));
      for (const r of businessRules) out.push(tableRow([`\`${r.name}\``, `\`${r.dataObject}\``, r.sourceFlag, r.intent]));
    }
    out.push("");
  } else {
    model.perModule.forEach(({ module: m, permissions, businessRules }, idx) => {
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

  // §9 Roles, RACI, and responsibilities (DERIVED, Plan 3 step B). Baseline roles (B1),
  // permission hierarchy (B2), and RACI realization (B3) per module; functional ownership +
  // default grants (B5) once per scope. Nothing here is stored: the deployer provisions the
  // tenant from this blueprint (see references/roles.md and downstream-updates rows 3-5).
  out.push("## 9. Roles, RACI, and responsibilities (derived)");
  out.push("");
  out.push("_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._");
  out.push("");
  model.perModule.forEach(({ module: m, baselineRoles: baseRoles, hierarchy, wiredProcesses, raci }, idx) => {
    out.push(`### 9.${idx + 1} \`${m.domain_module_code}\``);
    out.push("");
    out.push("**Baseline roles:**");
    out.push("");
    out.push(tableHeader(["role", "baseline grant"]));
    for (const r of baseRoles) out.push(tableRow([`\`${r.code}\``, `\`${r.grant}\``]));
    out.push("");
    out.push("**Permission hierarchy:**");
    out.push("");
    out.push(tableHeader(["permission", "includes"]));
    for (const e of hierarchy) out.push(tableRow([`\`${e.including}\``, `\`${e.included}\``]));
    out.push("");
    if (wiredProcesses.length > 0) {
      out.push("**Processes wired:**");
      out.push("");
      out.push(tableHeader(["process_key", "process_name", "PCF code", "PCF ID", "level", "description"]));
      for (const p of wiredProcesses) out.push(tableRow([p.key ? `\`${p.key}\`` : "", p.name, p.code, p.pcfId, p.level, p.description]));
      out.push("");
    }
    out.push("**RACI realization:**");
    out.push("");
    if (raci.length === 0) {
      out.push(noneSection("no process_raci assignments wired to this module's gated processes yet"));
    } else {
      out.push(tableHeader(["actor", "kind", "raci", "process_key", "realization"]));
      for (const g of raci) out.push(tableRow([`\`${g.actor}\``, g.actorKind, g.raci, g.process ? `\`${g.process}\`` : "", g.realization]));
    }
    out.push("");
  });
  const ownership = model.functionalOwnership;
  out.push(`### 9.${modules.length + 1} Functional ownership and default grants`);
  out.push("");
  if (ownership.length === 0) {
    out.push(noneSection("no business_function_domains rows for this scope's domain"));
  } else {
    out.push(tableHeader(["responsibility", "business function", "default role", "default tier"]));
    for (const o of ownership) out.push(tableRow([o.responsibility, o.func, `\`${o.defaultRole}\``, `\`${o.defaultTier}\``]));
  }
  out.push("");

  // NOTE: a former "§10 Deployable closure" section was removed (Plan 3 review, 2026-06-02).
  // A correctly-modeled module is SELF-CONTAINED: everything it touches is master,
  // embedded_master (a local shell), or necessity=optional, so it has no hard prerequisites.
  // "Related modules" (data coupling + handoffs + persona reach) are emitted in the front
  // matter `related_modules`, not duplicated here; the self-containment invariant is enforced
  // in the audit/review band (a contributor or required non-embedded consumer is a finding),
  // not rendered in the deploy contract.

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

  // M5 / M6 emit-time soft annotations (Policy 1: warn, never throw). Surface classification
  // violations without bricking the corpus; the M5 / M6 hard checks live in audit band B12.
  // entity_type is the exception: it is now an architect/analyst-authored field, so a missing
  // value is an authoring defect, not a soft degrade. It is a HARD emit gate (B13, thrown below):
  // the module fails and emits no file rather than producing an invalid `unclassified` 3.1 blueprint.
  {
    const lifecycleObjIds = new Set<number>((lifecycleRows ?? []).map((s: any) => s.data_object_id as number));
    const modCodes = modules.map((m) => m.domain_module_code).join("+");
    const unclassified: string[] = [];
    for (const r of scopeRows) {
      const o = r.data_object;
      const et = o.entity_type;
      // B13 hard gate: a version 3.1 blueprint MUST NOT carry `unclassified`
      // in §3 (it is the platform's un-set default, never an authored value). Collect every in-scope
      // row whose source `data_objects.entity_type` is unset and throw after the loop, so one run
      // reports all offenders at once. The fix is to classify the data_object upstream; the emitter
      // never invents a class.
      if (!et || et === "unclassified") {
        unclassified.push(o.data_object_name);
      }
      if (r.role !== "master") continue;
      // M5: an operational_workflow master must carry >=1 lifecycle state.
      if (et === "operational_workflow" && !lifecycleObjIds.has(r.data_object_id)) {
        console.warn(`  ⚠ M5: \`${o.data_object_name}\` is operational_workflow but has no lifecycle states (${modCodes})`);
      }
      // M6: the personal_content flag is forbidden on catalog / junction / computed (overrides suppressed).
      const hasPersonalContent = o.has_personal_content;
      if (hasPersonalContent && (et === "catalog" || et === "junction" || et === "computed")) {
        console.warn(`  ⚠ M6: \`${o.data_object_name}\` is ${et} but carries the personal_content flag (overrides suppressed) (${modCodes})`);
      }
    }
    // B13 hard gate: refuse to emit a 3.1 blueprint that would carry any unclassified entity_type.
    // entity_type is architect/analyst-authored; an unset value must be fixed upstream, not emitted.
    if (unclassified.length > 0) {
      throw new Error(
        `B13: ${unclassified.length} data_object(s) missing entity_type (classify upstream; emitter never invents one): ${unclassified.join(", ")}`,
      );
    }
  }

  // Sanitize em-dashes that may have leaked in from DB-authored descriptions / notes.
  // Project rule (see CLAUDE.md feedback): em-dashes are forbidden everywhere.
  return out.join("\n").replace(/—/g, "-");
}

function renderHandoffTable(rows: HandoffModel[], direction: "outbound" | "inbound"): string[] {
  const out: string[] = [];
  const headers = direction === "outbound"
    ? ["source module", "target domain", "target module", "trigger_event", "transition", "payload", "integration", "friction", "description"]
    : ["target module", "source domain", "source module", "trigger_event", "transition", "payload", "integration", "friction", "description"];
  out.push(tableHeader(headers));
  for (const { row: h, sourceModule: sourceMod, targetModule: targetMod, sourceDomain: sourceDom, targetDomain: targetDom } of rows) {
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
// IO + driver
// ============================================================

// A blueprint differs day-to-day only in its `created_at:` frontmatter line. Normalize that line
// AND line endings before comparing so a re-run that changes nothing else does NOT rewrite the
// file. git autocrlf can leave the on-disk file CRLF while the freshly emitted text is LF; without
// the CRLF->LF pass every line would "differ" and force a rewrite regardless of content (the date
// strip alone is not enough). Real content changes still write the full blueprint with the current
// date. spec.json avoids this because JSON.parse ignores insignificant whitespace.
function blueprintBodyIgnoringDate(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/^created_at: .*$/m, "created_at:");
}

// The derived-result invariants R1-R8 for one emitted unit. The model is derived again from the
// same catalog the render used (derivation is pure and in-memory), so emitBlueprint stays unchanged.
function modelFindings(modules: ModuleRow[]): ModelFinding[] {
  return checkModel(deriveBlueprintModel(modules, deriveCtx), { ctx: deriveCtx });
}

async function emitOneModuleBlueprint(m: ModuleRow): Promise<{ path: string; changed: boolean }> {
  const md = emitBlueprint([m]);
  // Phase 3 invariants on every emit (Policy 1: warn on stderr, never throw; --lint fails on them).
  for (const f of modelFindings([m])) console.warn(`  ⚠ ${f.id} (${f.result}): ${f.detail} (${f.module})`);
  const outPath = resolve(BLUEPRINTS_DIR, `${moduleSlug(m.domain_module_code)}${BLUEPRINT_SUFFIX}`);
  let changed = true;
  if (existsSync(outPath)) {
    const existing = readFileSync(outPath, "utf8");
    if (blueprintBodyIgnoringDate(existing) === blueprintBodyIgnoringDate(md)) changed = false;
  }
  if (!CHECK && changed) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, md, "utf8");
  }
  return { path: outPath, changed };
}

// regen = refresh what already exists. Enumerate committed blueprint files and return their
// slug stems (filename without the `-semantic-blueprint.md` suffix). Each stem is the module's
// moduleSlug(domain_module_code), so it maps straight back to a module below.
function blueprintSlugsOnDisk(): string[] {
  if (!existsSync(BLUEPRINTS_DIR)) return [];
  return readdirSync(BLUEPRINTS_DIR)
    .filter((f) => f.endsWith(BLUEPRINT_SUFFIX))
    .map((f) => f.slice(0, -BLUEPRINT_SUFFIX.length))
    .sort();
}

// Shared driver for the multi-module paths (--regenerate and --all). Keeps going on a single
// module's integrity failure (m9 / plan-1-consistency.md Policy 1): one bad row must never brick
// the rest of the corpus; failures are banner-reported and force a non-zero exit so CI sees them.
async function emitModuleList(modules: ModuleRow[], label: string): Promise<void> {
  let modulesChanged = 0;
  const failures: { code: string; message: string }[] = [];
  for (const m of modules) {
    try {
      const r = await emitOneModuleBlueprint(m);
      if (r.changed) modulesChanged++;
      console.log(`${r.changed ? (CHECK ? "WOULD-CHANGE" : "wrote") : "unchanged"}  module ${m.domain_module_code}  →  ${r.path}`);
    } catch (e) {
      const message = (e as Error).message;
      failures.push({ code: m.domain_module_code, message });
      console.error(`FAILED module ${m.domain_module_code}: ${message}`);
    }
  }
  console.log("");
  console.log(`summary (${label}): modules ${modulesChanged}/${modules.length} ${CHECK ? "would change" : "changed"}, ${failures.length} failed`);
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

// --lint: the derived-result invariants R1-R8 over a module list. Writes no file. Each module is
// also rendered in memory, so an emit failure (e.g. the B13 entity_type gate) counts as a failure.
// Exits non-zero on any `fail` finding or emit failure; `warn` findings never fail the run.
function lintModuleList(modules: ModuleRow[], label: string): void {
  const byRule = new Map<string, { fail: number; warn: number; modules: Set<string> }>();
  const byModule = new Map<string, { fail: number; warn: number }>();
  const failures: { code: string; message: string }[] = [];
  for (const m of modules) {
    let findings: ModelFinding[];
    try {
      emitBlueprint([m]);
      findings = modelFindings([m]);
    } catch (e) {
      const message = (e as Error).message;
      failures.push({ code: m.domain_module_code, message });
      console.log(`FAILED  ${m.domain_module_code}: ${message}`);
      continue;
    }
    for (const f of findings) {
      console.log(`${f.result.padEnd(4)}  ${f.id}  ${f.module}  ${f.detail}`);
      const r = byRule.get(f.id) ?? { fail: 0, warn: 0, modules: new Set<string>() };
      r[f.result]++;
      r.modules.add(f.module);
      byRule.set(f.id, r);
      const mm = byModule.get(f.module) ?? { fail: 0, warn: 0 };
      mm[f.result]++;
      byModule.set(f.module, mm);
    }
  }
  const fails = [...byRule.values()].reduce((n, r) => n + r.fail, 0);
  const warns = [...byRule.values()].reduce((n, r) => n + r.warn, 0);
  console.log("");
  console.log(`lint summary (${label}): ${modules.length} module(s), ${fails} fail, ${warns} warn, ${failures.length} emit failure(s)`);
  for (const id of RULE_IDS) {
    const r = byRule.get(id);
    console.log(`  ${id}  ${RULES[id].severity.padEnd(4)}  ${String(r ? r[RULES[id].severity] : 0).padStart(4)} finding(s) in ${String(r?.modules.size ?? 0).padStart(3)} module(s)  ${RULES[id].title}`);
  }
  const top = [...byModule.entries()]
    .sort((a, b) => b[1].fail - a[1].fail || b[1].warn - a[1].warn || (a[0] < b[0] ? -1 : 1))
    .slice(0, 10);
  if (top.length > 0) {
    console.log("  top offenders:");
    for (const [code, c] of top) console.log(`    ${code.padEnd(32)} ${c.fail} fail, ${c.warn} warn`);
  }
  for (const f of failures) console.error(`  emit failure ${f.code}: ${f.message}`);
  if (fails > 0 || failures.length > 0) exit(1);
}

async function main(): Promise<void> {
  const args = argv.slice(2);
  const ALL = args.includes("--all");
  const RELEASED = args.includes("--released");
  const REGEN = args.includes("--regenerate");
  CHECK = args.includes("--check");
  const LINT = args.includes("--lint");
  const NO_CACHE = args.includes("--no-cache");
  const CLEAR_CACHE = args.includes("--clear-cache");
  const flagValue = (name: string): string | null => {
    const i = args.indexOf(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
  };
  const MODULE_CODE = flagValue("--module");

  if (CLEAR_CACHE) {
    const cleared = clearCatalogCache();
    console.error(cleared ? "catalog cache cleared" : "no catalog cache to clear");
    if (!ALL && !MODULE_CODE) exit(0);
  }

  if (!ALL && !RELEASED && !REGEN && !MODULE_CODE && !LINT) {
    console.error("usage:");
    console.error("  generate_blueprints.ts --module <MODULE_CODE> [--no-cache] [--clear-cache]");
    console.error("  generate_blueprints.ts --regenerate [--check] [--no-cache]   # refresh ONLY existing blueprint files");
    console.error("  generate_blueprints.ts --released [--check] [--no-cache]      # (re)generate a file for every module hosted on a RELEASED domain");
    console.error("  generate_blueprints.ts --all [--check] [--no-cache]          # (re)generate a file for EVERY module");
    console.error("  generate_blueprints.ts --lint [--module <CODE> | --released | --all] [--no-cache]  # R1-R8 only; writes no file");
    console.error("  generate_blueprints.ts --clear-cache");
    exit(2);
  }

  // ---------- catalog index (loaded once via lib) ----------
  const { index, all: allRelationships } = (await loadCachedCatalog({ forceRefresh: NO_CACHE })) as {
    index: CatalogIndex;
    all: AllRelationships;
  };
  bindCatalog(index, allRelationships);
  const { modulesByCode } = index;
  const allModules = index.modules;

  if (MODULE_CODE) {
    const m = modulesByCode.get(MODULE_CODE);
    if (!m) {
      console.error(`module ${MODULE_CODE} not found in domain_modules`);
      exit(2);
    }
    if (LINT) {
      lintModuleList([m], "module");
      return;
    }
    try {
      const r = await emitOneModuleBlueprint(m);
      console.log(`${r.changed ? (CHECK ? "WOULD-CHANGE" : "wrote") : "unchanged"}  ${MODULE_CODE}  →  ${r.path}`);
      if (CHECK && r.changed) exit(1);
    } catch (e) {
      console.error(`FAILED module ${MODULE_CODE}: ${(e as Error).message}`);
      exit(1);
    }
  } else if (REGEN || (LINT && !RELEASED && !ALL)) {
    // Refresh ONLY the blueprint files already on disk. Map each filename slug back to its
    // module; never (re)generate a file for a module that has no committed blueprint. A bare
    // `--lint` lints this same set.
    const bySlug = new Map(allModules.map((m) => [moduleSlug(m.domain_module_code), m] as const));
    const modules: ModuleRow[] = [];
    const orphans: string[] = [];
    for (const slug of blueprintSlugsOnDisk()) {
      const m = bySlug.get(slug);
      if (m) modules.push(m);
      else orphans.push(slug);
    }
    if (orphans.length > 0) {
      console.error(`note: ${orphans.length} blueprint file(s) have no matching module and were left untouched: ${orphans.join(", ")}`);
    }
    if (LINT) {
      console.log(`linting ${modules.length} existing blueprint(s) (no file written)`);
      lintModuleList(modules, "existing blueprints");
      return;
    }
    console.log(`regenerating ${modules.length} existing blueprint(s) (no new files created)`);
    await emitModuleList(modules, "regenerate");
  } else if (RELEASED) {
    // Every module hosted on a RELEASED domain (catalog_release != null), where "hosted" means the
    // module's primary domain (domain_id) is released OR a DERIVED host domain is released (for a
    // starter, a market whose entity it embeds; see deriveHostDomains / references/deprecations.md).
    // Unlike --regenerate this CREATES a blueprint for a released module that
    // has none yet (the build_catalog contract: "blueprints for all modules of released domains").
    const releasedDomainIds = new Set<number>();
    for (const d of index.domains) if (isDomainReleased(d)) releasedDomainIds.add(d.id);
    const hostDomainsByModule = new Map<number, Set<number>>();
    for (const h of allRelationships.hostDomains) {
      const mid = h.domain_module_id as number;
      if (!hostDomainsByModule.has(mid)) hostDomainsByModule.set(mid, new Set());
      hostDomainsByModule.get(mid)!.add(h.domain_id as number);
    }
    const modules = allModules.filter((m) => {
      if (m.domain_id !== null && releasedDomainIds.has(m.domain_id)) return true;
      for (const did of hostDomainsByModule.get(m.id) ?? []) if (releasedDomainIds.has(did)) return true;
      return false;
    });
    if (LINT) {
      lintModuleList(modules, "released");
      return;
    }
    console.log(`generating blueprints for ${modules.length} module(s) hosted on ${releasedDomainIds.size} released domain(s)`);
    await emitModuleList(modules, "released");
  } else if (ALL) {
    if (LINT) {
      lintModuleList(allModules, "all");
      return;
    }
    await emitModuleList(allModules, "all");
  }
}

if (import.meta.main) await main();
