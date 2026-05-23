#!/usr/bin/env bun
// scripts/emit_fact_sheet.ts — Step 6 of plan-domain-fact-sheets.md.
//
// Generates a per-domain markdown fact sheet from the live `domain_map` catalog.
// The output is consumed by `semantius-architect` as a Stage 0 input.
//
// Output path: domain-fact-sheets/<DOMAIN_CODE>.md (committed to git).
//
// Usage:
//   bun run scripts/emit_fact_sheet.ts ATS
//   bun run scripts/emit_fact_sheet.ts ATS --out path/to/file.md
//   bun run scripts/emit_fact_sheet.ts --all
//   bun run scripts/emit_fact_sheet.ts --all --check    # CI drift check

export {};

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { argv, exit } from "node:process";

// ---------- args ----------
const args = argv.slice(2);
const ALL = args.includes("--all");
const CHECK = args.includes("--check");
const outArgIdx = args.indexOf("--out");
const OUT_OVERRIDE = outArgIdx >= 0 ? args[outArgIdx + 1] : null;
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
const DOMAIN_CODE = positional[0] ?? null;

if (!ALL && !DOMAIN_CODE) {
  console.error("usage: emit_fact_sheet.ts <DOMAIN_CODE> [--out path] | --all [--check]");
  exit(2);
}

const ROOT = "c:/dev/domain-map";
const FACT_SHEET_DIR = `${ROOT}/domain-fact-sheets`;
const TODAY = new Date().toISOString().slice(0, 10);
const FACT_SHEET_VERSION = "1.0";

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
  naming_authority_rationale: string;
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

const allDomains: Domain[] = await pg(
  "GET",
  "/domains?select=id,domain_code,domain_name,description,crud_percentage,business_logic,min_org_size,cost_band,certification_required,usa_market_size_usd_m,market_size_source_year&order=domain_code.asc&limit=10000",
);
const domainsById = new Map<number, Domain>(allDomains.map((d) => [d.id, d]));
const domainsByCode = new Map<string, Domain>(allDomains.map((d) => [d.domain_code, d]));

const allDataObjects: DataObject[] = await pg(
  "GET",
  "/data_objects?select=id,data_object_name,singular_label,plural_label,description,kind,is_canonical_bare_word,naming_authority_rationale,has_personal_content,has_submit_lock,has_single_approver&limit=10000",
);
const dataObjectsById = new Map<number, DataObject>(allDataObjects.map((d) => [d.id, d]));

const USERS = allDataObjects.find((d) => d.kind === "platform_builtin" && d.data_object_name === "users");
const USERS_ID = USERS?.id ?? -1;

// ---------- helpers ----------

function lowerSlug(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function entitySingularToken(o: DataObject): string {
  return o.singular_label.toLowerCase().replace(/\s+/g, "_");
}

function entityPluralToken(o: DataObject): string {
  return o.plural_label.toLowerCase().replace(/\s+/g, "_");
}

function tableRow(cells: (string | number | boolean | null | undefined)[]): string {
  return "| " + cells.map((c) => {
    if (c === null || c === undefined || c === "") return "—";
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

// ROLE → mermaid classDef + legend glyph
const ROLE_INFO: Record<string, { classDef: string; legend: string }> = {
  master: { classDef: "fill:#d4f4dd,stroke:#27ae60,color:#0b3d20", legend: "● green = master" },
  embedded_master: { classDef: "fill:#fff4cc,stroke:#c79100,color:#5b4500", legend: "● amber = embedded_master" },
  contributor: { classDef: "fill:#cfe8ff,stroke:#1976d2,color:#0d3a66", legend: "● blue = contributor" },
  consumer: { classDef: "fill:#e8def8,stroke:#7b1fa2,color:#3a155d", legend: "● purple = consumer" },
  derived: { classDef: "fill:#f7d7e6,stroke:#ad1457,color:#5a0930", legend: "● pink = derived" },
  platform_builtin: { classDef: "fill:#e0e0e0,stroke:#424242,color:#1a1a1a", legend: "● grey = platform built-in (`users`)" },
};

// ---------- per-domain renderer ----------

async function emitDomain(domain: Domain): Promise<string> {
  const slug = lowerSlug(domain.domain_code);

  // ---- catalog reads ----
  const ddoRows: any[] = await pg(
    "GET",
    `/domain_data_objects?domain_id=eq.${domain.id}&select=role,necessity,notes,data_object_id&order=role.asc`,
  );

  const objectsInDomain = ddoRows
    .map((r) => ({ ...r, data_object: dataObjectsById.get(r.data_object_id as number)! }))
    .filter((r) => r.data_object);

  const objectIds = objectsInDomain.map((r) => r.data_object_id as number);
  const masterRows = objectsInDomain.filter((r) => r.role === "master");
  const masterIds = new Set(masterRows.map((r) => r.data_object_id as number));

  const aliasRows: any[] = objectIds.length === 0 ? [] : await pg(
    "GET",
    `/data_object_aliases?data_object_id=in.(${objectIds.join(",")})&select=data_object_id,alias_name,alias_type,is_preferred,industry_id,solution_id,notes&order=alias_name.asc`,
  );

  const relRows: any[] = objectIds.length === 0 ? [] : await pg(
    "GET",
    `/data_object_relationships?or=(data_object_id.in.(${objectIds.join(",")}),related_data_object_id.in.(${objectIds.join(",")}))&select=data_object_id,related_data_object_id,relationship_type,relationship_kind,relationship_verb,inverse_verb,is_required,owner_side,notes&limit=2000`,
  );

  const intraRels: any[] = [];
  const userRels: any[] = [];
  const crossRels: any[] = [];
  for (const r of relRows) {
    const a = r.data_object_id as number;
    const b = r.related_data_object_id as number;
    const aIn = objectIds.includes(a);
    const bIn = objectIds.includes(b);
    const aUser = a === USERS_ID;
    const bUser = b === USERS_ID;
    if (aUser || bUser) userRels.push(r);
    else if (aIn && bIn) intraRels.push(r);
    else if (aIn !== bIn) crossRels.push(r);
  }

  const coMasterRowsRaw: any[] = masterIds.size === 0 ? [] : await pg(
    "GET",
    `/domain_data_objects?data_object_id=in.(${[...masterIds].join(",")})&domain_id=neq.${domain.id}&select=domain_id,data_object_id,role,necessity,notes&order=data_object_id.asc`,
  );

  const dependencyRows = objectsInDomain.filter((r) => r.role !== "master");
  const depObjectIds = dependencyRows.map((r) => r.data_object_id as number);
  const ownerRowsRaw: any[] = depObjectIds.length === 0 ? [] : await pg(
    "GET",
    `/domain_data_objects?data_object_id=in.(${depObjectIds.join(",")})&role=eq.master&select=domain_id,data_object_id`,
  );
  const ownerMap = new Map<number, string[]>();
  for (const o of ownerRowsRaw) {
    const did = o.data_object_id as number;
    const d = domainsById.get(o.domain_id as number);
    if (!d) continue;
    if (!ownerMap.has(did)) ownerMap.set(did, []);
    ownerMap.get(did)!.push(d.domain_code);
  }

  const handoffOutbound: any[] = await pg(
    "GET",
    `/cross_domain_handoffs?source_domain_id=eq.${domain.id}&select=source_domain_id,target_domain_id,integration_pattern,friction_level,description,notes,data_object_id,trigger_event_id,trigger_events(event_name,description),data_objects(data_object_name)&order=target_domain_id.asc`,
  );
  const handoffInbound: any[] = await pg(
    "GET",
    `/cross_domain_handoffs?target_domain_id=eq.${domain.id}&select=source_domain_id,target_domain_id,integration_pattern,friction_level,description,notes,data_object_id,trigger_event_id,trigger_events(event_name,description),data_objects(data_object_name)&order=source_domain_id.asc`,
  );

  const lifecycleRows: any[] = masterIds.size === 0 ? [] : await pg(
    "GET",
    `/data_object_lifecycle_states?data_object_id=in.(${[...masterIds].join(",")})&select=data_object_id,state_name,state_order,description,is_initial,is_terminal,requires_permission,permission_verb_override&order=data_object_id.asc,state_order.asc`,
  );

  const capRows: any[] = await pg(
    "GET",
    `/capability_domains?domain_id=eq.${domain.id}&select=capabilities(id,capability_code,capability_name,description)`,
  );
  const capIds = capRows.map((r) => r.capabilities?.id as number).filter(Boolean);
  const solCapRows: any[] = capIds.length === 0 ? [] : await pg(
    "GET",
    `/solution_capabilities?capability_id=in.(${capIds.join(",")})&select=delivery_strength,solution_id,capability_id,solutions(solution_name),capabilities(capability_code)&limit=2000`,
  );

  const solDomainRows: any[] = await pg(
    "GET",
    `/solution_domains?domain_id=eq.${domain.id}&select=coverage_level,solutions(id,solution_name,solution_kind,vendors(vendor_name))&order=coverage_level.asc`,
  );

  const bfdRows: any[] = await pg(
    "GET",
    `/business_function_domains?domain_id=eq.${domain.id}&select=responsibility_type,notes,business_functions(business_function_name)&order=responsibility_type.asc`,
  );
  const bfcRows: any[] = capIds.length === 0 ? [] : await pg(
    "GET",
    `/business_function_capabilities?capability_id=in.(${capIds.join(",")})&select=responsibility_type,notes,business_functions(business_function_name),capabilities(capability_code)&order=responsibility_type.asc`,
  );

  const regRows: any[] = await pg(
    "GET",
    `/domain_regulations?domain_id=eq.${domain.id}&select=applicability,notes,regulations(regulation_name,jurisdictions(jurisdiction_name))&order=applicability.asc`,
  );

  // Cross-domain context: which other domains this fact sheet "touches"
  const relatedDomainCodes = new Set<string>();
  for (const r of coMasterRowsRaw) {
    const d = domainsById.get(r.domain_id as number);
    if (d) relatedDomainCodes.add(d.domain_code);
  }
  for (const codes of ownerMap.values()) for (const c of codes) relatedDomainCodes.add(c);
  for (const h of handoffOutbound) {
    const d = domainsById.get(h.target_domain_id as number);
    if (d) relatedDomainCodes.add(d.domain_code);
  }
  for (const h of handoffInbound) {
    const d = domainsById.get(h.source_domain_id as number);
    if (d) relatedDomainCodes.add(d.domain_code);
  }
  relatedDomainCodes.delete(domain.domain_code);

  // ============================================================
  // RENDER
  // ============================================================
  const out: string[] = [];

  // ---- YAML frontmatter ----
  out.push("---");
  out.push("artifact: domain-fact-sheet");
  out.push(`fact_sheet_version: "${FACT_SHEET_VERSION}"`);
  out.push(`domain_code: ${domain.domain_code}`);
  out.push(`domain_name: ${escapeYaml(domain.domain_name)}`);
  out.push(`domain_slug: ${slug}`);
  out.push(`generated_at: ${TODAY}`);
  out.push(`generator: scripts/emit_fact_sheet.ts`);
  out.push(`source: live domain_map catalog (tests.semantius.app)`);
  out.push(`crud_percentage: ${domain.crud_percentage}`);
  out.push(`min_org_size: ${escapeYaml(domain.min_org_size)}`);
  out.push(`cost_band: "${domain.cost_band}"`);
  out.push(`certification_required: ${domain.certification_required ? "true" : "false"}`);
  out.push(`usa_market_size_usd_m: ${domain.usa_market_size_usd_m}`);
  out.push(`market_size_source_year: ${domain.market_size_source_year}`);
  out.push(`data_object_count: ${objectsInDomain.length}`);
  out.push(`master_count: ${masterRows.length}`);
  out.push(`outbound_handoff_count: ${handoffOutbound.length}`);
  out.push(`inbound_handoff_count: ${handoffInbound.length}`);
  if (relatedDomainCodes.size > 0) {
    out.push("related_domains:");
    for (const c of [...relatedDomainCodes].sort()) out.push(`  - ${c}`);
  } else {
    out.push("related_domains: []");
  }
  if (objectsInDomain.length > 0) {
    out.push("entities:");
    for (const r of [...objectsInDomain].sort((a, b) => (a.data_object as DataObject).data_object_name.localeCompare((b.data_object as DataObject).data_object_name))) {
      out.push(`  - ${(r.data_object as DataObject).data_object_name}`);
    }
  } else {
    out.push("entities: []");
  }
  out.push("---");
  out.push("");

  out.push(`# ${domain.domain_code} — ${domain.domain_name} fact sheet`);

  // ---- §1 Overview ----
  out.push("");
  out.push("## 1. Overview");
  out.push("");
  out.push(domain.description || "_(no `domains.description` recorded — extend the catalog row to populate this section.)_");
  if (domain.business_logic) {
    out.push("");
    out.push(domain.business_logic);
  }
  out.push("");

  // ---- §2 Entity summary (one table + colored mermaid) ----
  out.push("## 2. Entity summary");
  out.push("");
  if (objectsInDomain.length === 0) {
    out.push("_(no data_objects loaded for this domain; Phase B not yet run — see [plan-domain-fact-sheets.md § 6.2](../plan-domain-fact-sheets.md#62-phase-b2--built-in-seed--relationship-graph-population) and SKILL.md Rule #12.)_");
  } else {
    out.push(tableHeader(["Name", "Description"]));
    for (const r of [...objectsInDomain].sort((a, b) => (a.data_object as DataObject).plural_label.localeCompare((b.data_object as DataObject).plural_label))) {
      const o = r.data_object as DataObject;
      out.push(tableRow([o.plural_label, o.description || ""]));
    }
    out.push("");
    out.push(renderMermaid(objectsInDomain, intraRels, userRels));
  }

  // ---- §3 Data object inventory (single table, role as a column) ----
  out.push("");
  out.push("## 3. Data object inventory");
  out.push("");
  if (objectsInDomain.length === 0) {
    out.push("_(no inventory — Phase B not yet run for this domain.)_");
  } else {
    out.push(tableHeader(["#", "Name (plural)", "Role", "Necessity", "Canonical?", "Pattern flags", "Notes / slice"], ["right"]));
    const sortOrder = ["master", "embedded_master", "contributor", "consumer", "derived"];
    const sorted = [...objectsInDomain].sort((a, b) => {
      const ra = sortOrder.indexOf(a.role) === -1 ? 99 : sortOrder.indexOf(a.role);
      const rb = sortOrder.indexOf(b.role) === -1 ? 99 : sortOrder.indexOf(b.role);
      if (ra !== rb) return ra - rb;
      return (a.data_object as DataObject).plural_label.localeCompare((b.data_object as DataObject).plural_label);
    });
    let i = 1;
    for (const r of sorted) {
      const o = r.data_object as DataObject;
      const flags: string[] = [];
      if (o.has_personal_content) flags.push("personal_content");
      if (o.has_submit_lock) flags.push("submit_lock");
      if (o.has_single_approver) flags.push("single_approver");
      out.push(tableRow([
        i++,
        `\`${o.data_object_name}\` (${o.plural_label})`,
        r.role,
        r.necessity || "—",
        o.is_canonical_bare_word ? "✓ bare-word" : "",
        flags.join(", "),
        r.notes || "",
      ]));
    }
  }

  // ---- §4 Aliases ----
  out.push("");
  out.push("## 4. Aliases and industry synonyms");
  out.push("");
  if (aliasRows.length === 0) {
    out.push("_(no aliases recorded for any data_object in this domain.)_");
  } else {
    out.push(tableHeader(["data_object", "alias", "alias_type", "preferred?", "context", "notes"]));
    for (const a of [...aliasRows].sort((x, y) => String(x.alias_name).localeCompare(String(y.alias_name)))) {
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
  }

  // ---- §5 Relationships ----
  out.push("");
  out.push("## 5. Relationships");
  out.push("");

  out.push("### 5.1 Intra-domain edges");
  out.push("");
  if (intraRels.length === 0) {
    out.push("_(no intra-domain `data_object_relationships` recorded; relationship-graph backfill may be pending — see [plan-domain-fact-sheets.md § 6.2](../plan-domain-fact-sheets.md#62-phase-b2--built-in-seed--relationship-graph-population).)_");
  } else {
    out.push(tableHeader(["from", "verb", "to", "cardinality", "kind", "necessity", "owner_side", "notes"]));
    for (const r of intraRels) {
      const a = dataObjectsById.get(r.data_object_id as number);
      const b = dataObjectsById.get(r.related_data_object_id as number);
      if (!a || !b) continue;
      out.push(tableRow([
        `\`${a.data_object_name}\``,
        r.relationship_verb || "",
        `\`${b.data_object_name}\``,
        r.relationship_type || "",
        r.relationship_kind || "",
        r.is_required ? "required" : "optional",
        r.owner_side || "",
        r.notes || "",
      ]));
    }
  }

  out.push("");
  out.push("### 5.2 Built-in edges (`users` and other platform built-ins)");
  out.push("");
  if (userRels.length === 0) {
    out.push("_(no relationships against platform built-ins recorded; see SKILL.md Rule #10 — built-in edges are first-class. Backfill if this domain has assignees/creators/approvers that reference `users`.)_");
  } else {
    out.push(tableHeader(["from", "verb", "to", "cardinality", "necessity", "owner_side", "notes"]));
    for (const r of userRels) {
      const a = dataObjectsById.get(r.data_object_id as number);
      const b = dataObjectsById.get(r.related_data_object_id as number);
      if (!a || !b) continue;
      out.push(tableRow([
        `\`${a.data_object_name}\``,
        r.relationship_verb || "",
        `\`${b.data_object_name}\``,
        r.relationship_type || "",
        r.is_required ? "required" : "optional",
        r.owner_side || "",
        r.notes || "",
      ]));
    }
  }

  out.push("");
  out.push("### 5.3 Cross-domain edges (payload→target verb edges)");
  out.push("");
  if (crossRels.length === 0) {
    out.push("_(no cross-domain `data_object_relationships` recorded — backfill only covers handoffs with clean payload→target mappings.)_");
  } else {
    out.push(tableHeader(["from", "verb", "to", "cardinality", "necessity", "notes"]));
    for (const r of crossRels) {
      const a = dataObjectsById.get(r.data_object_id as number);
      const b = dataObjectsById.get(r.related_data_object_id as number);
      if (!a || !b) continue;
      out.push(tableRow([
        `\`${a.data_object_name}\``,
        r.relationship_verb || "",
        `\`${b.data_object_name}\``,
        r.relationship_type || "",
        r.is_required ? "required" : "optional",
        r.notes || "",
      ]));
    }
  }

  // ---- §6 Cross-domain context ----
  out.push("");
  out.push("## 6. Cross-domain context");
  out.push("");

  out.push("### 6.1 Co-masters (other domains that have a role on this domain's masters)");
  out.push("");
  if (coMasterRowsRaw.length === 0) {
    out.push("_(no other domains have rows against this domain's master data_objects.)_");
  } else {
    out.push(tableHeader(["data_object", "other domain", "role", "necessity", "notes"]));
    for (const r of coMasterRowsRaw) {
      const obj = dataObjectsById.get(r.data_object_id as number);
      const otherDom = domainsById.get(r.domain_id as number);
      if (!obj || !otherDom) continue;
      out.push(tableRow([
        `\`${obj.data_object_name}\``,
        `${otherDom.domain_code} (${otherDom.domain_name})`,
        r.role,
        r.necessity || "—",
        r.notes || "",
      ]));
    }
  }

  out.push("");
  out.push("### 6.2 Outbound handoffs (events this domain publishes)");
  out.push("");
  if (handoffOutbound.length === 0) {
    out.push("_(no outbound `cross_domain_handoffs` recorded.)_");
  } else {
    out.push(tableHeader(["target domain", "trigger_event", "payload data_object", "integration", "friction", "description"]));
    for (const h of handoffOutbound) {
      const target = domainsById.get(h.target_domain_id as number);
      out.push(tableRow([
        target ? `${target.domain_code}` : `domain #${h.target_domain_id}`,
        h.trigger_events?.event_name ? `\`${h.trigger_events.event_name}\`` : "",
        h.data_objects?.data_object_name ? `\`${h.data_objects.data_object_name}\`` : "",
        h.integration_pattern || "",
        h.friction_level || "",
        h.description || "",
      ]));
    }
  }

  out.push("");
  out.push("### 6.3 Inbound handoffs (events from other domains this domain reacts to)");
  out.push("");
  if (handoffInbound.length === 0) {
    out.push("_(no inbound `cross_domain_handoffs` recorded.)_");
  } else {
    out.push(tableHeader(["source domain", "trigger_event", "payload data_object", "integration", "friction", "description"]));
    for (const h of handoffInbound) {
      const source = domainsById.get(h.source_domain_id as number);
      out.push(tableRow([
        source ? `${source.domain_code}` : `domain #${h.source_domain_id}`,
        h.trigger_events?.event_name ? `\`${h.trigger_events.event_name}\`` : "",
        h.data_objects?.data_object_name ? `\`${h.data_objects.data_object_name}\`` : "",
        h.integration_pattern || "",
        h.friction_level || "",
        h.description || "",
      ]));
    }
  }

  out.push("");
  out.push("### 6.4 Embedded / contributing / consuming dependencies (this domain's non-master rows)");
  out.push("");
  if (dependencyRows.length === 0) {
    out.push("_(this domain only has master rows; no dependencies on external data_objects recorded.)_");
  } else {
    out.push(tableHeader(["data_object", "role here", "necessity", "canonical owner domain(s)", "slice notes"]));
    for (const r of dependencyRows) {
      const o = r.data_object as DataObject;
      const owners = ownerMap.get(r.data_object_id as number) ?? [];
      out.push(tableRow([
        `\`${o.data_object_name}\``,
        r.role,
        r.necessity || "—",
        owners.length ? owners.join(", ") : (o.kind === "platform_builtin" ? "_(platform built-in)_" : "_(none — unowned)_"),
        r.notes || "",
      ]));
    }
  }

  // ---- §7 Lifecycle states ----
  out.push("");
  out.push("## 7. Lifecycle states (per master data_object)");
  out.push("");
  if (lifecycleRows.length === 0) {
    out.push("_(no lifecycle states loaded for this domain's masters; Phase B3 backfill may be pending — see [plan-domain-fact-sheets.md § 6.3](../plan-domain-fact-sheets.md#63-phase-b3--lifecycle-states--pattern-flags) and SKILL.md Rule #12.)_");
  } else {
    const byObj = new Map<number, any[]>();
    for (const ls of lifecycleRows) {
      const did = ls.data_object_id as number;
      if (!byObj.has(did)) byObj.set(did, []);
      byObj.get(did)!.push(ls);
    }
    for (const [did, states] of [...byObj.entries()].sort((a, b) => (dataObjectsById.get(a[0])?.data_object_name ?? "").localeCompare(dataObjectsById.get(b[0])?.data_object_name ?? ""))) {
      const obj = dataObjectsById.get(did);
      if (!obj) continue;
      out.push(`### \`${obj.data_object_name}\` (${obj.singular_label})`);
      out.push("");
      out.push(tableHeader(["order", "state_name", "initial?", "terminal?", "requires_permission?", "derived gate", "description"]));
      for (const s of states) {
        const verbSegment = s.permission_verb_override
          ? s.permission_verb_override
          : `${s.state_name}_${entitySingularToken(obj)}`;
        const gate = s.requires_permission ? `\`${slug}:${verbSegment}\`` : "";
        out.push(tableRow([
          s.state_order,
          `\`${s.state_name}\``,
          s.is_initial ? "✓" : "",
          s.is_terminal ? "✓" : "",
          s.requires_permission ? "✓" : "",
          gate,
          s.description || "",
        ]));
      }
      out.push("");
    }
  }

  // ---- §8 Permissions and business rules (derived) ----
  out.push("");
  out.push("## 8. Permissions and business rules (derived)");
  out.push("");
  out.push("Derived from baseline tier (§4.1 of the plan) + lifecycle states with `requires_permission=true` (§4.2) + pattern flags `has_personal_content` / `has_submit_lock` / `has_single_approver` on masters (§4.3).");
  out.push("");
  const { permissions, businessRules } = deriveWorkflowGatesAndRules(slug, masterRows, lifecycleRows, dataObjectsById);
  out.push("### 8.1 Permissions");
  out.push("");
  out.push(tableHeader(["permission", "tier", "description", "included in `:admin`?"]));
  for (const p of permissions) {
    out.push(tableRow([`\`${p.code}\``, p.tier, p.description, p.includedInAdmin ? "✓" : ""]));
  }
  out.push("");
  out.push("### 8.2 Business rules");
  out.push("");
  if (businessRules.length === 0) {
    out.push("_(no flag-derived business rules — no master data_object on this domain has `has_personal_content`, `has_submit_lock`, or `has_single_approver` set.)_");
  } else {
    out.push(tableHeader(["rule_name", "data_object", "source flag", "intent"]));
    for (const r of businessRules) {
      out.push(tableRow([`\`${r.name}\``, `\`${r.dataObject}\``, r.sourceFlag, r.intent]));
    }
  }

  // ---- §9 Capabilities + delivery-strength matrix ----
  out.push("");
  out.push("## 9. Capabilities");
  out.push("");
  if (capRows.length === 0) {
    out.push("_(no `capabilities` linked to this domain via `capability_domains`.)_");
  } else {
    out.push(tableHeader(["capability_code", "capability_name", "description"]));
    for (const c of capRows) {
      const cap = c.capabilities;
      if (!cap) continue;
      out.push(tableRow([`\`${cap.capability_code}\``, cap.capability_name, cap.description || ""]));
    }
    out.push("");
    out.push("### 9.1 Delivery-strength matrix (solution × capability)");
    out.push("");
    if (solCapRows.length === 0) {
      out.push("_(no `solution_capabilities` recorded for any capability on this domain.)_");
    } else {
      const solutions = new Map<string, Map<string, string>>();
      const allCapCodes = new Set<string>();
      for (const sc of solCapRows) {
        const sname = sc.solutions?.solution_name as string | undefined;
        const ccode = sc.capabilities?.capability_code as string | undefined;
        if (!sname || !ccode) continue;
        allCapCodes.add(ccode);
        if (!solutions.has(sname)) solutions.set(sname, new Map());
        solutions.get(sname)!.set(ccode, String(sc.delivery_strength));
      }
      const capCodeList = [...allCapCodes].sort();
      out.push(tableHeader(["solution", ...capCodeList]));
      const STRENGTH_GLYPH: Record<string, string> = {
        native: "● native",
        partial: "◐ partial",
        via_extension: "◑ ext",
        not_supported: "✗ none",
      };
      for (const [sname, capMap] of [...solutions.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const row: string[] = [sname];
        for (const cc of capCodeList) {
          const v = capMap.get(cc);
          row.push(v ? (STRENGTH_GLYPH[v] || v) : "");
        }
        out.push(tableRow(row));
      }
    }
  }

  // ---- §10 Solutions & vendors ----
  out.push("");
  out.push("## 10. Solutions and vendors");
  out.push("");
  if (solDomainRows.length === 0) {
    out.push("_(no `solution_domains` rows for this domain.)_");
  } else {
    out.push(tableHeader(["solution", "vendor", "coverage", "solution_kind"]));
    for (const s of solDomainRows) {
      const sol = s.solutions;
      if (!sol) continue;
      out.push(tableRow([
        sol.solution_name,
        sol.vendors?.vendor_name || "",
        s.coverage_level,
        sol.solution_kind,
      ]));
    }
  }

  // ---- §11 Functional ownership ----
  out.push("");
  out.push("## 11. Functional ownership (RACI)");
  out.push("");
  if (bfdRows.length === 0) {
    out.push("_(no `business_function_domains` rows for this domain — Phase C backfill pending.)_");
  } else {
    out.push("### 11.1 Domain-level");
    out.push("");
    out.push(tableHeader(["business_function", "responsibility", "notes"]));
    for (const r of bfdRows) {
      out.push(tableRow([r.business_functions?.business_function_name || "", r.responsibility_type, r.notes || ""]));
    }
  }
  if (bfcRows.length > 0) {
    out.push("");
    out.push("### 11.2 Capability-level overrides (where capability diverges from domain)");
    out.push("");
    out.push(tableHeader(["capability_code", "business_function", "responsibility", "notes"]));
    for (const r of bfcRows) {
      out.push(tableRow([
        r.capabilities?.capability_code || "",
        r.business_functions?.business_function_name || "",
        r.responsibility_type,
        r.notes || "",
      ]));
    }
  }

  // ---- §12 Regulations ----
  out.push("");
  out.push("## 12. Regulatory and jurisdictional context");
  out.push("");
  if (regRows.length === 0) {
    out.push("_(no `domain_regulations` rows.)_");
  } else {
    out.push(tableHeader(["regulation", "jurisdiction", "applicability", "notes"]));
    for (const r of regRows) {
      out.push(tableRow([
        r.regulations?.regulation_name || "",
        r.regulations?.jurisdictions?.jurisdiction_name || "",
        r.applicability,
        r.notes || "",
      ]));
    }
  }

  // ---- §13 Architect handoff hints ----
  out.push("");
  out.push("## 13. Architect handoff hints");
  out.push("");
  const flagshipSolution = pickFlagshipSolution(solDomainRows);
  const namingMode = pickNamingMode(masterRows);
  out.push(tableHeader(["hint", "value", "rationale"]));
  out.push(tableRow([
    "module_slug_suggestion",
    `\`${slug}\``,
    "lowercased `domain_code`; used as the prefix in derived permissions (§8)",
  ]));
  out.push(tableRow([
    "naming_mode",
    namingMode.mode,
    namingMode.rationale,
  ]));
  out.push(tableRow([
    "suggested_vendor_template",
    flagshipSolution.name,
    flagshipSolution.rationale,
  ]));

  out.push("");

  return out.join("\n");
}

// ---------- Mermaid renderer (single colored graph for §2) ----------

function renderMermaid(objectsInDomain: any[], intraRels: any[], userRels: any[]): string {
  const lines: string[] = [];
  lines.push("```mermaid");
  lines.push("flowchart LR");
  for (const [name, info] of Object.entries(ROLE_INFO)) {
    lines.push(`  classDef ${name} ${info.classDef};`);
  }

  const roleByName = new Map<string, string>();
  for (const r of objectsInDomain) {
    const o = r.data_object as DataObject;
    roleByName.set(o.data_object_name, String(r.role));
    lines.push(`  ${o.data_object_name}["${o.plural_label}"]`);
  }
  if (userRels.length > 0 && USERS) {
    if (!roleByName.has(USERS.data_object_name)) {
      lines.push(`  ${USERS.data_object_name}["${USERS.plural_label}"]`);
      roleByName.set(USERS.data_object_name, "platform_builtin");
    }
  }

  const seenEdges = new Set<string>();
  function addEdge(fromId: number, toId: number, verb: string, required: boolean): void {
    const a = dataObjectsById.get(fromId);
    const b = dataObjectsById.get(toId);
    if (!a || !b) return;
    const key = `${a.data_object_name}|${verb}|${b.data_object_name}`;
    if (seenEdges.has(key)) return;
    seenEdges.add(key);
    const v = (verb || "→").replace(/"/g, "'");
    const opt = required ? "" : " (opt)";
    lines.push(`  ${a.data_object_name} -->|"${v}${opt}"| ${b.data_object_name}`);
  }
  for (const r of intraRels) addEdge(r.data_object_id as number, r.related_data_object_id as number, String(r.relationship_verb ?? ""), Boolean(r.is_required));
  for (const r of userRels) addEdge(r.data_object_id as number, r.related_data_object_id as number, String(r.relationship_verb ?? ""), Boolean(r.is_required));

  for (const [name, role] of roleByName.entries()) {
    lines.push(`  class ${name} ${role};`);
  }
  lines.push("```");
  return lines.join("\n");
}

// ---------- §8 derivation rules ----------

type Permission = { code: string; tier: string; description: string; includedInAdmin: boolean };
type BusinessRule = { name: string; dataObject: string; sourceFlag: string; intent: string };

function deriveWorkflowGatesAndRules(
  slug: string,
  masterRows: any[],
  lifecycleRows: any[],
  dataObjectsById: Map<number, DataObject>,
): { permissions: Permission[]; businessRules: BusinessRule[] } {
  const permissions: Permission[] = [];
  const businessRules: BusinessRule[] = [];

  permissions.push({ code: `${slug}:read`, tier: "baseline-read", description: "Read access to every entity in the module", includedInAdmin: true });
  permissions.push({ code: `${slug}:manage`, tier: "baseline-manage", description: "Edit operational records", includedInAdmin: true });
  permissions.push({ code: `${slug}:admin`, tier: "baseline-admin", description: "Edit reference data and inherit every workflow gate below", includedInAdmin: false });

  for (const ls of lifecycleRows) {
    if (!ls.requires_permission) continue;
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

  for (const r of masterRows) {
    const o = r.data_object as DataObject;
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
        intent: `Exactly one explicit approver required; uses the approval gate from §7 (\`${slug}:approve_${entitySingular}\` if surfaced).`,
      });
    }
  }

  return { permissions, businessRules };
}

function pickFlagshipSolution(solDomainRows: any[]): { name: string; rationale: string } {
  if (solDomainRows.length === 0) return { name: "_(none)_", rationale: "no solutions linked" };
  const primary = solDomainRows.filter((r) => r.coverage_level === "primary");
  const pool = primary.length > 0 ? primary : solDomainRows;
  const best = pool.find((r) => r.solutions?.solution_kind === "external_connector") ?? pool[0];
  const sol = best?.solutions;
  if (!sol) return { name: "_(none)_", rationale: "no solution rows" };
  return {
    name: `${sol.solution_name} (${sol.vendors?.vendor_name || "?"})`,
    rationale: `primary-coverage solution with \`solution_kind=${sol.solution_kind}\`; architect can mine its public schema for entity shapes`,
  };
}

function pickNamingMode(masterRows: any[]): { mode: string; rationale: string } {
  if (masterRows.length === 0) return { mode: "_n/a_", rationale: "no master data_objects" };
  const bareCount = masterRows.filter((r) => (r.data_object as DataObject).is_canonical_bare_word).length;
  const prefixCount = masterRows.length - bareCount;
  if (bareCount === 0) return { mode: "domain-prefixed", rationale: `all ${masterRows.length} master data_objects use domain-prefixed names (default per SKILL.md naming rule)` };
  if (prefixCount === 0) return { mode: "canonical bare-word", rationale: `all ${masterRows.length} masters carry \`is_canonical_bare_word=true\` — this domain owns the unprefixed names catalog-wide` };
  return { mode: "mixed", rationale: `${bareCount} canonical bare-word masters + ${prefixCount} domain-prefixed; preserve existing claims when extending the model` };
}

function escapeYaml(s: string): string {
  if (s === "" || s === null || s === undefined) return '""';
  if (/^[A-Za-z][A-Za-z0-9 _.,()\-/&+]*$/.test(s)) return s;
  return JSON.stringify(s);
}

// ---------- IO ----------

if (!existsSync(FACT_SHEET_DIR) && !CHECK) {
  mkdirSync(FACT_SHEET_DIR, { recursive: true });
}

async function emitOne(domain: Domain): Promise<{ path: string; changed: boolean }> {
  const md = await emitDomain(domain);
  const outPath = OUT_OVERRIDE ? resolve(OUT_OVERRIDE) : resolve(FACT_SHEET_DIR, `${domain.domain_code}.md`);
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

if (ALL) {
  const results: { path: string; changed: boolean; code: string }[] = [];
  for (const d of allDomains) {
    try {
      const r = await emitOne(d);
      results.push({ ...r, code: d.domain_code });
      console.log(`${r.changed ? (CHECK ? "WOULD-CHANGE" : "wrote") : "unchanged"}  ${d.domain_code}  →  ${r.path}`);
    } catch (e) {
      console.error(`FAILED  ${d.domain_code}:`, (e as Error).message);
      throw e;
    }
  }
  const changedCount = results.filter((r) => r.changed).length;
  console.log("");
  console.log(`summary: ${changedCount}/${results.length} fact sheets ${CHECK ? "would change" : "written/updated"}`);
  if (CHECK && changedCount > 0) {
    console.error("drift detected — re-run without --check to regenerate, then commit.");
    exit(1);
  }
} else {
  const domain = domainsByCode.get(DOMAIN_CODE!);
  if (!domain) {
    console.error(`domain_code ${DOMAIN_CODE} not found`);
    exit(2);
  }
  const r = await emitOne(domain);
  console.log(`${r.changed ? (CHECK ? "WOULD-CHANGE" : "wrote") : "unchanged"}  ${domain.domain_code}  →  ${r.path}`);
  if (CHECK && r.changed) exit(1);
}
