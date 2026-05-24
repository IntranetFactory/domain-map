#!/usr/bin/env bun
// scripts/emit_fact_sheet.ts - plan-modules.md §11 step 4 (revised per §9, session 3).
//
// Two-pass emitter:
//   1. Per-module fact sheets → blueprints/modules/<MODULE-CODE>-semantic-blueprint.md
//      One per `domain_modules` row. The deployable unit's surface: data_objects assigned to
//      this module, lifecycle states on this module's masters, system skill + skill_tools +
//      Semantius coverage %, module-scoped permissions and business rules, capabilities
//      realized, outbound/inbound integration handoffs, architect handoff hints.
//
//   2. Per-starter-kit fact sheets → blueprints/starter-kits/<DOMAIN-CODE>-semantic-blueprint.md
//      One per domain that has a `domain_starter_modules` junction. The buyer-facing market
//      entry point: market overview, the editorial on-ramp, every module installable on this
//      domain (primary-home + cross-cutting hosted via domain_module_host_domains), combined
//      view across the starter modules, capabilities, solutions and vendors, RACI,
//      regulations, architect handoff hints.
//
// No per-domain fact sheet - the starter-kit page replaces it as the market entry point.
// No _cross-cutting/ folder - cross-cutting modules live in modules/ with everyone else;
// their fact sheet swaps the parent-domain section for a host-domains section.
//
// Usage:
//   bun run scripts/emit_fact_sheet.ts --module ATS-CANDIDATE-CRM
//   bun run scripts/emit_fact_sheet.ts --starter-kit ATS
//   bun run scripts/emit_fact_sheet.ts --all
//   bun run scripts/emit_fact_sheet.ts --all --check        # CI drift check

export {};

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { argv, exit } from "node:process";

// ---------- args ----------
const args = argv.slice(2);
const ALL = args.includes("--all");
const CHECK = args.includes("--check");
function flagValue(name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const MODULE_CODE = flagValue("--module");
const STARTER_DOMAIN_CODE = flagValue("--starter-kit");

if (!ALL && !MODULE_CODE && !STARTER_DOMAIN_CODE) {
  console.error("usage:");
  console.error("  emit_fact_sheet.ts --module <MODULE_CODE>");
  console.error("  emit_fact_sheet.ts --starter-kit <DOMAIN_CODE>");
  console.error("  emit_fact_sheet.ts --all [--check]");
  exit(2);
}

const ROOT = "c:/dev/domain-map";
const FACT_SHEET_DIR = `${ROOT}/blueprints`;
const MODULES_DIR = `${FACT_SHEET_DIR}/modules`;
const STARTER_KITS_DIR = `${FACT_SHEET_DIR}/starter-kits`;
const BLUEPRINT_SUFFIX = "-semantic-blueprint.md";
const TODAY = new Date().toISOString().slice(0, 10);
const FACT_SHEET_VERSION = "2.0";

// ---------- semantius helper ----------
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

// ---------- catalog index (loaded once) ----------
type DataObject = {
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

type Domain = {
  id: number;
  domain_code: string;
  domain_name: string;
  description: string;
  crud_percentage: number;
  business_logic: string;
  min_org_size: string;
  cost_band: string;
  certification_required: boolean;
  usa_market_size_usd_m: number;
  market_size_source_year: number;
};

type ModuleRow = {
  id: number;
  domain_module_code: string;
  domain_module_name: string;
  domain_id: number | null;
  description: string;
};

const allDomains: Domain[] = await pg(
  "GET",
  "/domains?select=id,domain_code,domain_name,description,crud_percentage,business_logic,min_org_size,cost_band,certification_required,usa_market_size_usd_m,market_size_source_year&order=domain_code.asc&limit=10000",
);
const domainsById = new Map<number, Domain>(allDomains.map((d) => [d.id, d]));
const domainsByCode = new Map<string, Domain>(allDomains.map((d) => [d.domain_code, d]));

const allDataObjects: DataObject[] = await pg(
  "GET",
  "/data_objects?select=id,data_object_name,singular_label,plural_label,description,kind,is_canonical_bare_word,has_personal_content,has_submit_lock,has_single_approver&limit=10000",
);
const dataObjectsById = new Map<number, DataObject>(allDataObjects.map((d) => [d.id, d]));
const USERS = allDataObjects.find((d) => d.kind === "platform_builtin" && d.data_object_name === "users");
const USERS_ID = USERS?.id ?? -1;

const allModules: ModuleRow[] = await pg(
  "GET",
  "/domain_modules?select=id,domain_module_code,domain_module_name,domain_id,description&order=domain_module_code.asc&limit=10000",
) ?? [];
const modulesById = new Map<number, ModuleRow>(allModules.map((m) => [m.id, m]));
const modulesByCode = new Map<string, ModuleRow>(allModules.map((m) => [m.domain_module_code, m]));

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

const ROLE_ORDER = ["master", "embedded_master", "contributor", "consumer", "derived"] as const;
const ROLE_RANK: Record<string, number> = Object.fromEntries(ROLE_ORDER.map((r, i) => [r, i]));

// ============================================================
// Scoped-query helpers - reused by both module and starter-kit emitters.
// "Scope" = a set of data_object IDs (one module's data_objects, or the union across the
// starter modules of a domain). All structural sections (mermaid, entity summary, aliases,
// relationships, master consumers, master providers) are derived from this scope + the role each
// data_object plays in this scope.
// ============================================================

type ScopeRow = { data_object_id: number; role: string; necessity: string | null; notes: string | null; data_object: DataObject };

async function loadAliases(objectIds: number[]): Promise<any[]> {
  if (objectIds.length === 0) return [];
  return (await pg(
    "GET",
    `/data_object_aliases?data_object_id=in.(${objectIds.join(",")})&select=data_object_id,alias_name,alias_type,is_preferred,industry_id,solution_id,notes&order=alias_name.asc`,
  )) ?? [];
}

async function loadRelationships(objectIds: number[]): Promise<{ intra: any[]; userRels: any[]; cross: any[]; all: any[] }> {
  if (objectIds.length === 0) return { intra: [], userRels: [], cross: [], all: [] };
  const rows: any[] = (await pg(
    "GET",
    `/data_object_relationships?or=(data_object_id.in.(${objectIds.join(",")}),related_data_object_id.in.(${objectIds.join(",")}))&select=data_object_id,related_data_object_id,relationship_type,relationship_kind,relationship_verb,inverse_verb,is_required,owner_side,notes&limit=2000`,
  )) ?? [];
  const scope = new Set(objectIds);
  const intra: any[] = [];
  const userRels: any[] = [];
  const cross: any[] = [];
  for (const r of rows) {
    const a = r.data_object_id as number;
    const b = r.related_data_object_id as number;
    const aUser = a === USERS_ID;
    const bUser = b === USERS_ID;
    if (aUser || bUser) {
      userRels.push(r);
    } else if (scope.has(a) && scope.has(b)) {
      intra.push(r);
    } else if (scope.has(a) !== scope.has(b)) {
      cross.push(r);
    }
  }
  return { intra, userRels, cross, all: rows };
}

type CoMasterRow = {
  data_object_id: number;
  owner_module: ModuleRow | null;
  owner_domain: Domain | null;
  role: string;
  necessity: string | null;
  notes: string | null;
};

async function loadCoMasters(masterIds: number[], excludeModuleIds: Set<number>): Promise<CoMasterRow[]> {
  if (masterIds.size === 0) return [];
  const list = [...masterIds];
  // Module-granularity primary path: other modules with any role on these masters.
  const moduleRows: any[] = (await pg(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${list.join(",")})&select=domain_module_id,data_object_id,role,necessity,notes`,
  )) ?? [];
  const out: CoMasterRow[] = [];
  const seenModule = new Set<string>();
  for (const r of moduleRows) {
    const modId = r.domain_module_id as number;
    if (excludeModuleIds.has(modId)) continue;
    const m = modulesById.get(modId);
    if (!m) continue;
    const key = `${modId}:${r.data_object_id}`;
    if (seenModule.has(key)) continue;
    seenModule.add(key);
    out.push({
      data_object_id: r.data_object_id as number,
      owner_module: m,
      owner_domain: m.domain_id !== null ? domainsById.get(m.domain_id) ?? null : null,
      role: r.role as string,
      necessity: (r.necessity as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
    });
  }
  // Domain-granularity fallback: domains that have a role on these masters but haven't been
  // modularized yet (no rows in domain_module_data_objects). Skip domains we've already
  // surfaced via the module path.
  const modularizedDomainIds = new Set<number>();
  for (const r of out) {
    if (r.owner_domain) modularizedDomainIds.add(r.owner_domain.id);
  }
  const domainRows: any[] = (await pg(
    "GET",
    `/domain_data_objects?data_object_id=in.(${list.join(",")})&select=domain_id,data_object_id,role,necessity,notes`,
  )) ?? [];
  for (const r of domainRows) {
    const domId = r.domain_id as number;
    // Skip if this domain has any module in the catalog - its modules are the source of truth.
    const hasAnyModule = allModules.some((m) => m.domain_id === domId);
    if (hasAnyModule) continue;
    const d = domainsById.get(domId);
    if (!d) continue;
    out.push({
      data_object_id: r.data_object_id as number,
      owner_module: null,
      owner_domain: d,
      role: r.role as string,
      necessity: (r.necessity as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
    });
  }
  return out;
}

type OwnerInfo = { modules: ModuleRow[]; domains: Domain[] };
async function loadOwners(nonMasterIds: number[]): Promise<Map<number, OwnerInfo>> {
  const out = new Map<number, OwnerInfo>();
  if (nonMasterIds.length === 0) return out;
  // Module-granularity owners.
  const modOwnerRows: any[] = (await pg(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${nonMasterIds.join(",")})&role=eq.master&select=domain_module_id,data_object_id`,
  )) ?? [];
  for (const r of modOwnerRows) {
    const m = modulesById.get(r.domain_module_id as number);
    if (!m) continue;
    const did = r.data_object_id as number;
    if (!out.has(did)) out.set(did, { modules: [], domains: [] });
    out.get(did)!.modules.push(m);
  }
  // Domain-granularity owners (fallback for not-yet-modularized domains).
  const domOwnerRows: any[] = (await pg(
    "GET",
    `/domain_data_objects?data_object_id=in.(${nonMasterIds.join(",")})&role=eq.master&select=domain_id,data_object_id`,
  )) ?? [];
  for (const r of domOwnerRows) {
    const d = domainsById.get(r.domain_id as number);
    if (!d) continue;
    const did = r.data_object_id as number;
    if (!out.has(did)) out.set(did, { modules: [], domains: [] });
    // Add the domain if it isn't already the parent domain of one of the recorded modules.
    const info = out.get(did)!;
    const alreadyViaModule = info.modules.some((m) => m.domain_id === d.id);
    if (!alreadyViaModule && !info.domains.some((x) => x.id === d.id)) {
      info.domains.push(d);
    }
  }
  return out;
}

// Build mermaid diagram for a scoped data_object set.
//   scopeRoles  - role per data_object that is "in scope" (rendered with its role color)
//   edges       - every relationship row touching the scope (caller passes all; we filter
//                 down to intra-scope edges and to built-in `users` edges that touch scope)
// Only in-scope entities + the `users` platform built-in are rendered. External neighbors
// are deliberately omitted - they make the diagram too noisy. The §5.3 table covers
// cross-scope edges in textual form.
function renderMermaid(scopeRoles: Map<number, string>, edges: any[]): string[] {
  const lines: string[] = [];
  lines.push("```mermaid");
  lines.push("flowchart LR");
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
  if (aliasRows.length === 0) return out;
  out.push(tableHeader(["data_object", "alias", "alias_type", "preferred?", "context", "notes"]));
  for (const a of aliasRows) {
    const obj = dataObjectsById.get(a.data_object_id as number);
    if (!obj) continue;
    let ctx = "";
    if (a.industry_id) ctx = `industry #${a.industry_id}`;
    else if (a.solution_id) ctx = `solution #${a.solution_id}`;
    out.push(tableRow([
      `\`${obj.data_object_name}\``,
      a.alias_name,
      a.alias_type,
      a.is_preferred ? "✓" : "",
      ctx,
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
// silently rendered).
function masteredInLabel(r: ScopeRow, owners: Map<number, OwnerInfo>): string {
  if (r.role === "master" || r.role === "derived") return "-";
  const info = owners.get(r.data_object_id);
  if (!info) {
    return r.data_object.kind === "platform_builtin" ? "_(platform built-in)_" : "-";
  }
  if (info.modules.length > 1) {
    throw new Error(
      `catalog integrity: data_object ${r.data_object.data_object_name} (id ${r.data_object_id}) has ${info.modules.length} modules with role=master (${info.modules.map((m) => m.domain_module_code).join(", ")}). Expected exactly one.`,
    );
  }
  if (info.modules.length === 1) return `\`${moduleSlug(info.modules[0].domain_module_code)}\``;
  if (info.domains.length > 1) {
    throw new Error(
      `catalog integrity: data_object ${r.data_object.data_object_name} (id ${r.data_object_id}) has ${info.domains.length} domains with role=master (${info.domains.map((d) => d.domain_code).join(", ")}). Expected exactly one.`,
    );
  }
  if (info.domains.length === 1) return `\`${info.domains[0].domain_code}\` _(domain-level, not modularized)_`;
  return "-";
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

type ScopeRowWithModules = ScopeRow & { modules: ModuleRow[] };

async function emitFactSheet(modules: ModuleRow[], kindLabel?: string): Promise<string> {
  if (modules.length === 0) throw new Error("emitFactSheet requires at least one module");

  const moduleIds = modules.map((m) => m.id);
  const moduleIdSet = new Set(moduleIds);
  const parentDomainIds = new Set(
    modules.map((m) => m.domain_id).filter((id): id is number => id !== null),
  );
  const parentDomains = [...parentDomainIds]
    .map((id) => domainsById.get(id))
    .filter((d): d is Domain => Boolean(d));

  // Aggregate scope across modules: strongest role per data_object, plus which modules
  // contributed and any per-module notes.
  const moduleDORows: any[] = (await pg(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})&select=domain_module_id,data_object_id,role,necessity,notes`,
  )) ?? [];
  const byDOId = new Map<number, { role: string; necessity: string | null; modules: ModuleRow[]; notes: string[] }>();
  for (const r of moduleDORows) {
    const m = modulesById.get(r.domain_module_id as number);
    if (!m) continue;
    const did = r.data_object_id as number;
    const existing = byDOId.get(did);
    if (!existing) {
      byDOId.set(did, { role: r.role, necessity: (r.necessity as string | null) ?? null, modules: [m], notes: r.notes ? [r.notes] : [] });
    } else {
      if ((ROLE_RANK[r.role] ?? 99) < (ROLE_RANK[existing.role] ?? 99)) {
        existing.role = r.role;
        existing.necessity = (r.necessity as string | null) ?? existing.necessity;
      }
      if (!existing.modules.includes(m)) existing.modules.push(m);
      if (r.notes) existing.notes.push(r.notes);
    }
  }
  const scopeRows: ScopeRowWithModules[] = [...byDOId.entries()]
    .map(([did, info]) => {
      const obj = dataObjectsById.get(did);
      if (!obj) return null;
      return {
        data_object_id: did,
        role: info.role,
        necessity: info.necessity,
        notes: info.notes.join("; ") || null,
        data_object: obj,
        modules: info.modules,
      } satisfies ScopeRowWithModules;
    })
    .filter((r): r is ScopeRowWithModules => r !== null);
  const scopeObjectIds = scopeRows.map((r) => r.data_object_id);
  const scopeRolesById = new Map<number, string>(scopeRows.map((r) => [r.data_object_id, r.role]));
  const masterIds = new Set(scopeRows.filter((r) => r.role === "master").map((r) => r.data_object_id));

  // ---- scoped reads in parallel ----
  const lifecycleFilters: string[] = [];
  if (masterIds.size > 0) lifecycleFilters.push(`data_object_id.in.(${[...masterIds].join(",")})`);
  lifecycleFilters.push(`domain_module_id.in.(${moduleIds.join(",")})`);

  const [aliasRows, rels, coMasters, owners, lifecycleRows, handoffRows] = await Promise.all([
    loadAliases(scopeObjectIds),
    loadRelationships(scopeObjectIds),
    loadCoMasters(masterIds, moduleIdSet),
    loadOwners(scopeRows.filter((r) => r.role !== "master").map((r) => r.data_object_id)),
    pg(
      "GET",
      `/data_object_lifecycle_states?or=(${lifecycleFilters.join(",")})&select=data_object_id,state_name,state_order,description,is_initial,is_terminal,requires_permission,permission_verb_override,domain_module_id&order=data_object_id.asc,state_order.asc`,
    ),
    scopeObjectIds.length === 0
      ? Promise.resolve([])
      : pg(
          "GET",
          `/handoffs?data_object_id=in.(${scopeObjectIds.join(",")})&select=source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,integration_pattern,friction_level,description,notes,data_objects(data_object_name),trigger_events(event_name,description)&order=target_domain_id.asc`,
        ),
  ]);

  // ---- handoff attribution ----
  // Outbound rule:
  //   - source_domain_module_id explicitly in scope, OR
  //   - source_domain_id is a scope parent AND this scope MASTERS the payload (the publisher
  //     is implicitly whichever module owns the payload's master role).
  // Inbound rule:
  //   - target_domain_module_id explicitly in scope, OR
  //   - target_domain_id is a scope parent AND this scope holds the payload in a non-master
  //     role (embedded_master / contributor / consumer / derived).
  // The previous "srcDomainInScope && !tgtDomainInScope" fallback over-attributed every
  // domain-level handoff to every module in the source domain. Per SKILL.md B10b, rows that
  // still sit with NULL module attribution are reported as catalog gaps, not silently spread.
  const outboundHandoffs: any[] = [];
  const inboundHandoffs: any[] = [];
  for (const h of (handoffRows ?? [])) {
    const payloadId = h.data_object_id as number;
    const scopeRole = scopeRolesById.get(payloadId);
    const srcModuleInScope = h.source_domain_module_id !== null && moduleIdSet.has(h.source_domain_module_id as number);
    const tgtModuleInScope = h.target_domain_module_id !== null && moduleIdSet.has(h.target_domain_module_id as number);
    const srcDomainInScope = parentDomainIds.has(h.source_domain_id as number);
    const tgtDomainInScope = parentDomainIds.has(h.target_domain_id as number);
    const payloadMasteredHere = scopeRole === "master";
    const payloadHeldNonMaster = scopeRole !== undefined && scopeRole !== "master";
    if (srcModuleInScope || (srcDomainInScope && h.source_domain_module_id === null && payloadMasteredHere)) {
      outboundHandoffs.push(h);
    } else if (tgtModuleInScope || (tgtDomainInScope && h.target_domain_module_id === null && payloadHeldNonMaster)) {
      inboundHandoffs.push(h);
    }
  }

  // Related modules: the union of four data-coupling sources, deduped, with self removed.
  //   1. master_providers   - modules that own a master this scope embeds (§6.4)
  //   2. master_consumers   - modules that embed a master this scope owns (§6.1)
  //   3. handoff senders    - source module of an inbound handoff (non-null id only)
  //   4. handoff receivers  - target module of an outbound handoff (non-null id only)
  // Handoff rows whose source/target module id is NULL are skipped: per the catalog
  // convention, every handoff will carry per-module attribution at go-live, and any
  // domain-level-only row is treated as not-yet-attributed rather than promoted to a
  // domain-level entry here. Lives in front matter so catalog UIs can render cross-links
  // without parsing prose.
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

  out.push("---");
  out.push("artifact: semantic-blueprint");
  out.push(`fact_sheet_version: "${FACT_SHEET_VERSION}"`);
  out.push(`system_name: ${systemName}`);
  out.push(`system_description: ${escapeYaml(systemDescription)}`);
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
  // Single-module: the module's own description (2-3 sentences stored on `domain_modules`).
  // Multi-module: the parent domain's market-overview description from `domains.description`
  // (+ `business_logic` paragraph if recorded). No module list - the reader doesn't need
  // to know the bundle's constituents in the Overview; the front matter has that.
  // §1 Overview — content-only. If the description is missing the review must catch it
  // upstream (A1 / per-module description); the emitter never emits a placeholder.
  const overviewLines: string[] = [];
  if (modules.length === 1) {
    if (modules[0].description) overviewLines.push(modules[0].description);
  } else if (parentDomains.length === 1) {
    const d = parentDomains[0];
    if (d.description) overviewLines.push(d.description);
    if (d.business_logic) {
      if (overviewLines.length > 0) overviewLines.push("");
      overviewLines.push(d.business_logic);
    }
  } else {
    const joined = parentDomains.map((d) => d.description).filter(Boolean).join(" ");
    if (joined) overviewLines.push(joined);
  }
  if (overviewLines.length > 0) {
    out.push("## 1. Overview");
    out.push("");
    out.push(...overviewLines);
    out.push("");
  }

  // §2 Entity summary - table + mermaid in the same section
  out.push("## 2. Entity summary");
  out.push("");
  out.push(...renderEntitySummary(scopeRows));
  out.push("");
  if (rels.all.length > 0 || scopeObjectIds.length > 0) {
    out.push(...renderMermaid(scopeRolesById, rels.all));
    out.push("");
  }

  // §3 Entities catalog
  out.push("## 3. Entities catalog");
  out.push("");
  const showModulesCol = modules.length > 1;
  if (scopeRows.length === 0) {
    out.push("_(no data_objects in scope.)_");
  } else {
    const headers = ["#", "data_object", "role", "mastered in", "necessity", "pattern flags"];
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
      const cells: (string | number)[] = [
        i++,
        `\`${o.data_object_name}\` (${o.plural_label})`,
        r.role,
        masteredInLabel(r, owners),
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
  if (rels.cross.length === 0) {
    out.push("_(no `data_object_relationships` between scope's data_objects and entities outside.)_");
  } else {
    out.push(...renderRelationshipTable(rels.cross, { includeOwnerSide: false, includeKind: false }));
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
  out.push("## 7. Lifecycle states (per master)");
  out.push("");
  if (lifecycleRows.length === 0) {
    out.push("_(no lifecycle states loaded for this scope's masters.)_");
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
      out.push("");
      const headers = ["order", "state_name", "initial?", "terminal?"];
      if (showModulesCol) headers.push("realizing module");
      headers.push("requires_permission?", "derived gate", "description");
      out.push(tableHeader(headers));
      for (const s of states) {
        const realizingId = s.domain_module_id as number | null;
        // For permission gate slug: the realizing module's slug if set; else the master's
        // owning-module slug (the module in scope that has role=master on this data_object).
        const masterModule = scopeRows.find((r) => r.data_object_id === did && r.role === "master")?.modules[0];
        let gateModule: ModuleRow | undefined;
        if (realizingId !== null) gateModule = modulesById.get(realizingId);
        else gateModule = masterModule;
        const gateSlug = gateModule ? moduleSlug(gateModule.domain_module_code) : "";
        const verbSegment = s.permission_verb_override
          ? s.permission_verb_override
          : `${s.state_name}_${entitySingularToken(obj)}`;
        const gate = s.requires_permission && gateSlug ? `\`${gateSlug}:${verbSegment}\`` : "";
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
    ? ["source module", "target domain", "target module", "trigger_event", "payload", "integration", "friction", "description"]
    : ["target module", "source domain", "source module", "trigger_event", "payload", "integration", "friction", "description"];
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
    const payload = h.data_objects?.data_object_name ? `\`${h.data_objects.data_object_name}\`` : "";
    if (direction === "outbound") {
      out.push(tableRow([sourceModLabel, targetDomLabel, targetModLabel, trigger, payload, h.integration_pattern || "", h.friction_level || "", h.description || ""]));
    } else {
      out.push(tableRow([targetModLabel, sourceDomLabel, sourceModLabel, trigger, payload, h.integration_pattern || "", h.friction_level || "", h.description || ""]));
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
    const obj = dataObjectsById.get(ls.data_object_id as number);
    if (!obj) continue;
    const verbSegment = ls.permission_verb_override
      ? (ls.permission_verb_override as string)
      : `${ls.state_name}_${entitySingularToken(obj)}`;
    permissions.push({
      code: `${slug}:${verbSegment}`,
      tier: "workflow-gate (lifecycle)",
      description: `Transition \`${obj.data_object_name}\` into state \`${ls.state_name}\``,
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
      businessRules.push({
        name: `approve_${entitySingular}_requires_approver`,
        dataObject: o.data_object_name,
        sourceFlag: "has_single_approver",
        intent: `Exactly one explicit approver required; uses the module's approval gate (\`${slug}:approve_${entitySingular}\` if surfaced as a lifecycle workflow gate).`,
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
  const outPath = resolve(MODULES_DIR, `${moduleSlug(m.domain_module_code)}${BLUEPRINT_SUFFIX}`);
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

async function emitOneStarterKit(d: Domain): Promise<{ path: string; changed: boolean; skipped: boolean }> {
  const starterRows: any[] = (await pg(
    "GET",
    `/domain_starter_modules?domain_id=eq.${d.id}&select=domain_module_id,position&order=position.asc`,
  )) ?? [];
  const outPath = resolve(STARTER_KITS_DIR, `${moduleSlug(d.domain_code)}${BLUEPRINT_SUFFIX}`);
  if (starterRows.length === 0) return { path: outPath, changed: false, skipped: true };
  const modules: ModuleRow[] = starterRows
    .map((r) => modulesById.get(r.domain_module_id as number))
    .filter((m): m is ModuleRow => Boolean(m));
  if (modules.length === 0) return { path: outPath, changed: false, skipped: true };
  const md = await emitFactSheet(modules, "Starter Kit");
  let changed = true;
  if (existsSync(outPath)) {
    const existing = readFileSync(outPath, "utf8");
    if (existing === md) changed = false;
  }
  if (!CHECK && changed) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, md, "utf8");
  }
  return { path: outPath, changed, skipped: false };
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
} else if (STARTER_DOMAIN_CODE) {
  const d = domainsByCode.get(STARTER_DOMAIN_CODE);
  if (!d) {
    console.error(`domain_code ${STARTER_DOMAIN_CODE} not found`);
    exit(2);
  }
  const r = await emitOneStarterKit(d);
  if (r.skipped) {
    console.log(`skipped  ${STARTER_DOMAIN_CODE}  (no domain_starter_modules junction)`);
  } else {
    console.log(`${r.changed ? (CHECK ? "WOULD-CHANGE" : "wrote") : "unchanged"}  ${STARTER_DOMAIN_CODE}  →  ${r.path}`);
    if (CHECK && r.changed) exit(1);
  }
} else if (ALL) {
  let modulesChanged = 0;
  for (const m of allModules) {
    try {
      const r = await emitOneModuleFactSheet(m);
      if (r.changed) modulesChanged++;
      console.log(`${r.changed ? (CHECK ? "WOULD-CHANGE" : "wrote") : "unchanged"}  module ${m.domain_module_code}  →  ${r.path}`);
    } catch (e) {
      console.error(`FAILED module ${m.domain_module_code}:`, (e as Error).message);
      throw e;
    }
  }
  let starterKitsChanged = 0;
  let starterKitsSkipped = 0;
  for (const d of allDomains) {
    try {
      const r = await emitOneStarterKit(d);
      if (r.skipped) {
        starterKitsSkipped++;
      } else if (r.changed) {
        starterKitsChanged++;
        console.log(`${CHECK ? "WOULD-CHANGE" : "wrote"}  starter-kit ${d.domain_code}  →  ${r.path}`);
      } else {
        console.log(`unchanged  starter-kit ${d.domain_code}  →  ${r.path}`);
      }
    } catch (e) {
      console.error(`FAILED starter-kit ${d.domain_code}:`, (e as Error).message);
      throw e;
    }
  }
  console.log("");
  console.log(`summary: modules ${modulesChanged}/${allModules.length} ${CHECK ? "would change" : "changed"}; starter-kits ${starterKitsChanged} changed, ${starterKitsSkipped} skipped (no junction)`);
  if (CHECK && (modulesChanged + starterKitsChanged) > 0) {
    console.error("drift detected - re-run without --check to regenerate, then commit.");
    exit(1);
  }
}
