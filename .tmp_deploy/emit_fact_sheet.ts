#!/usr/bin/env bun
// emit_fact_sheet.ts — Step 6 of plan-domain-fact-sheets.md.
//
// Generates a per-domain markdown fact sheet from the live `domain_map` catalog.
// Renders the 13-section contract from plan-domain-fact-sheets.md §1 and applies
// the §4 derivation rules (baseline tier, lifecycle-derived workflow gates,
// pattern-flag rules) to compute the permissions and business-rules tables.
//
// Output path: domain-fact-sheets/<DOMAIN_CODE>.md  (committed to git, PR-reviewable).
//
// Usage:
//   bun run c:/dev/domain-map/.tmp_deploy/emit_fact_sheet.ts ATS
//   bun run c:/dev/domain-map/.tmp_deploy/emit_fact_sheet.ts ATS --out path/to/file.md
//   bun run c:/dev/domain-map/.tmp_deploy/emit_fact_sheet.ts --all
//   bun run c:/dev/domain-map/.tmp_deploy/emit_fact_sheet.ts --all --check   # CI drift check

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

const allDomains: Domain[] = await pg("GET", "/domains?select=id,domain_code,domain_name,description,crud_percentage,business_logic,min_org_size,cost_band,certification_required,usa_market_size_usd_m,market_size_source_year&order=domain_code.asc&limit=10000");
const domainsById = new Map<number, Domain>(allDomains.map((d) => [d.id, d]));
const domainsByCode = new Map<string, Domain>(allDomains.map((d) => [d.domain_code, d]));

const allDataObjects: DataObject[] = await pg("GET", "/data_objects?select=id,data_object_name,singular_label,plural_label,description,kind,is_canonical_bare_word,naming_authority_rationale,has_personal_content,has_submit_lock,has_single_approver&limit=10000");
const dataObjectsById = new Map<number, DataObject>(allDataObjects.map((d) => [d.id, d]));

const USERS = allDataObjects.find((d) => d.kind === "platform_builtin" && d.data_object_name === "users");
const USERS_ID = USERS?.id ?? -1;

// ---------- per-domain renderer ----------

function lowerSlug(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function tableRow(cells: (string | number | boolean | null | undefined)[]): string {
  return "| " + cells.map((c) => {
    if (c === null || c === undefined || c === "") return "—";
    const s = String(c).replace(/\|/g, "\\|").replace(/\n+/g, " ");
    return s;
  }).join(" | ") + " |";
}

function tableHeader(headers: string[]): string {
  return tableRow(headers) + "\n" + "| " + headers.map(() => "---").join(" | ") + " |";
}

function sectionHeader(num: number, title: string): string {
  return `\n## ${num}. ${title}\n`;
}

async function emitDomain(domain: Domain): Promise<string> {
  const slug = lowerSlug(domain.domain_code);

  // ---- §2 data object inventory ----
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

  // ---- §3 aliases ----
  const aliasRows: any[] = objectIds.length === 0 ? [] : await pg(
    "GET",
    `/data_object_aliases?data_object_id=in.(${objectIds.join(",")})&select=data_object_id,alias_name,alias_type,is_preferred,industry_id,solution_id,notes&order=alias_name.asc`,
  );

  // ---- §4 + §5 relationships ----
  // Intra-domain edges: both endpoints in objectIds and neither is users
  // Built-in edges: one endpoint in objectIds, other is users
  // Cross-domain edges: one endpoint in objectIds, other is a non-users data_object NOT in objectIds
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
    if (aUser || bUser) {
      userRels.push(r);
    } else if (aIn && bIn) {
      intraRels.push(r);
    } else if (aIn !== bIn) {
      crossRels.push(r);
    }
  }

  // ---- §6 cross-domain context ----
  // Co-masters: data_objects this domain masters that another domain also has any role on
  const coMasterRowsRaw: any[] = masterIds.size === 0 ? [] : await pg(
    "GET",
    `/domain_data_objects?data_object_id=in.(${[...masterIds].join(",")})&domain_id=neq.${domain.id}&select=domain_id,data_object_id,role,necessity,notes&order=data_object_id.asc`,
  );

  // Non-master rows in this domain (embedded_master / contributor / consumer / derived)
  const dependencyRows = objectsInDomain.filter((r) => r.role !== "master");

  // Cross-domain handoffs (Phase B `cross_domain_handoffs`)
  const handoffOutbound: any[] = await pg(
    "GET",
    `/cross_domain_handoffs?source_domain_id=eq.${domain.id}&select=source_domain_id,target_domain_id,integration_pattern,friction_level,description,notes,data_object_id,trigger_event_id,trigger_events(event_name,description),data_objects(data_object_name)&order=target_domain_id.asc`,
  );
  const handoffInbound: any[] = await pg(
    "GET",
    `/cross_domain_handoffs?target_domain_id=eq.${domain.id}&select=source_domain_id,target_domain_id,integration_pattern,friction_level,description,notes,data_object_id,trigger_event_id,trigger_events(event_name,description),data_objects(data_object_name)&order=source_domain_id.asc`,
  );

  // ---- §7 lifecycle states ----
  const lifecycleRows: any[] = masterIds.size === 0 ? [] : await pg(
    "GET",
    `/data_object_lifecycle_states?data_object_id=in.(${[...masterIds].join(",")})&select=data_object_id,state_name,state_order,description,is_initial,is_terminal,requires_permission,permission_verb_override&order=data_object_id.asc,state_order.asc`,
  );

  // ---- §9 capabilities + delivery_strength ----
  const capRows: any[] = await pg(
    "GET",
    `/capability_domains?domain_id=eq.${domain.id}&select=capabilities(id,capability_code,capability_name,description)`,
  );
  const capIds = capRows.map((r) => r.capabilities?.id as number).filter(Boolean);
  const solCapRows: any[] = capIds.length === 0 ? [] : await pg(
    "GET",
    `/solution_capabilities?capability_id=in.(${capIds.join(",")})&select=delivery_strength,solution_id,capability_id,solutions(solution_name),capabilities(capability_code)&limit=2000`,
  );

  // ---- §10 solutions ----
  const solDomainRows: any[] = await pg(
    "GET",
    `/solution_domains?domain_id=eq.${domain.id}&select=coverage_level,solutions(id,solution_name,solution_kind,vendors(vendor_name))&order=coverage_level.asc`,
  );

  // ---- §11 business_functions (RACI) ----
  const bfdRows: any[] = await pg(
    "GET",
    `/business_function_domains?domain_id=eq.${domain.id}&select=responsibility_type,notes,business_functions(business_function_name)&order=responsibility_type.asc`,
  );
  const bfcRows: any[] = capIds.length === 0 ? [] : await pg(
    "GET",
    `/business_function_capabilities?capability_id=in.(${capIds.join(",")})&select=responsibility_type,notes,business_functions(business_function_name),capabilities(capability_code)&order=responsibility_type.asc`,
  );

  // ---- §12 regulations ----
  const regRows: any[] = await pg(
    "GET",
    `/domain_regulations?domain_id=eq.${domain.id}&select=applicability,notes,regulations(regulation_name,jurisdictions(jurisdiction_name))&order=applicability.asc`,
  );

  // ============================================================
  // RENDER
  // ============================================================
  const out: string[] = [];

  out.push(`# ${domain.domain_code} — ${domain.domain_name} fact sheet`);
  out.push("");
  out.push(`> Auto-generated by \`.tmp_deploy/emit_fact_sheet.ts\` from the live \`domain_map\` catalog. **Do not hand-edit.** Regenerate with \`bun run .tmp_deploy/emit_fact_sheet.ts ${domain.domain_code}\`. Consumed by \`semantius-architect\` (Stage 0 fact-sheet load) per [plan-domain-fact-sheets.md § 8](../plan-domain-fact-sheets.md#8-architect-integration-contract-only).`);

  // §1 identity + behavioral-pattern summary
  out.push(sectionHeader(1, "Domain identity and behavioral pattern"));
  out.push(tableHeader(["Field", "Value"]));
  out.push(tableRow(["domain_code", domain.domain_code]));
  out.push(tableRow(["domain_name", domain.domain_name]));
  out.push(tableRow(["crud_percentage", `${domain.crud_percentage}%`]));
  out.push(tableRow(["min_org_size", domain.min_org_size]));
  out.push(tableRow(["cost_band", domain.cost_band]));
  out.push(tableRow(["certification_required", domain.certification_required ? "yes" : "no"]));
  out.push(tableRow(["usa_market_size_usd_m", `${domain.usa_market_size_usd_m} (${domain.market_size_source_year})`]));
  out.push("");
  out.push("**Description.** " + (domain.description || "_(none)_"));
  if (domain.business_logic) {
    out.push("");
    out.push("**Business logic beyond CRUD.** " + domain.business_logic);
  }
  const patternProse = composeBehavioralPatternProse(masterRows, intraRels, dataObjectsById);
  if (patternProse) {
    out.push("");
    out.push("**Behavioral pattern.** " + patternProse);
  }

  // §2 data object inventory
  out.push(sectionHeader(2, "Data object inventory"));
  if (objectsInDomain.length === 0) {
    out.push("_(no data_objects loaded for this domain; Phase B not yet run — see [plan-domain-fact-sheets.md § 6.2](../plan-domain-fact-sheets.md#62-phase-b2--built-in-seed--relationship-graph-population) and SKILL.md Rule #12)_");
  } else {
    const grouped: Record<string, any[]> = { master: [], embedded_master: [], contributor: [], consumer: [], derived: [] };
    for (const r of objectsInDomain) {
      const role = String(r.role);
      if (!grouped[role]) grouped[role] = [];
      grouped[role].push(r);
    }
    for (const role of ["master", "embedded_master", "contributor", "consumer", "derived"] as const) {
      const rows = grouped[role];
      if (!rows || rows.length === 0) continue;
      out.push(`### ${role} (${rows.length})`);
      out.push("");
      out.push(tableHeader(["data_object_name", "singular_label", "plural_label", "necessity", "canonical?", "flags", "description / slice"]));
      for (const r of rows) {
        const o = r.data_object as DataObject;
        const flags: string[] = [];
        if (o.has_personal_content) flags.push("personal_content");
        if (o.has_submit_lock) flags.push("submit_lock");
        if (o.has_single_approver) flags.push("single_approver");
        const desc = role === "master" ? (o.description || "") : (r.notes || o.description || "");
        out.push(tableRow([
          `\`${o.data_object_name}\``,
          o.singular_label,
          o.plural_label,
          r.necessity || "—",
          o.is_canonical_bare_word ? "✓ bare-word" : "",
          flags.join(", "),
          desc,
        ]));
      }
      out.push("");
    }
  }

  // §3 aliases
  out.push(sectionHeader(3, "Aliases and industry synonyms"));
  if (aliasRows.length === 0) {
    out.push("_(no aliases recorded for any data_object in this domain)_");
  } else {
    out.push(tableHeader(["data_object", "alias_name", "alias_type", "preferred?", "context", "notes"]));
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
  }

  // §4 intra-domain relationship graph
  out.push(sectionHeader(4, "Intra-domain relationship graph"));
  if (intraRels.length === 0) {
    out.push("_(no intra-domain `data_object_relationships` recorded; relationship-graph backfill may be pending — see [plan-domain-fact-sheets.md § 6.2](../plan-domain-fact-sheets.md#62-phase-b2--built-in-seed--relationship-graph-population))_");
  } else {
    out.push("```mermaid");
    out.push("graph LR");
    const seenNodes = new Set<string>();
    for (const r of intraRels) {
      const a = dataObjectsById.get(r.data_object_id as number);
      const b = dataObjectsById.get(r.related_data_object_id as number);
      if (!a || !b) continue;
      const aId = a.data_object_name;
      const bId = b.data_object_name;
      if (!seenNodes.has(aId)) { out.push(`  ${aId}[${a.singular_label}]`); seenNodes.add(aId); }
      if (!seenNodes.has(bId)) { out.push(`  ${bId}[${b.singular_label}]`); seenNodes.add(bId); }
      const verb = r.relationship_verb || "→";
      const required = r.is_required ? "" : " (opt)";
      out.push(`  ${aId} -->|${verb}${required}| ${bId}`);
    }
    out.push("```");
    out.push("");
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

  // §5 built-in edges (users)
  out.push(sectionHeader(5, "Built-in edges (`users` and other platform built-ins)"));
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

  // §6 cross-domain context
  out.push(sectionHeader(6, "Cross-domain context"));

  out.push("### Co-masters (other domains that also have a role on this domain's masters)");
  out.push("");
  if (coMasterRowsRaw.length === 0) {
    out.push("_(no other domains have rows against this domain's master data_objects)_");
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

  out.push("### Embedded / contributing / consuming dependencies (this domain's non-master rows)");
  out.push("");
  if (dependencyRows.length === 0) {
    out.push("_(this domain only has master rows; no dependencies on external data_objects recorded)_");
  } else {
    out.push(tableHeader(["data_object", "role here", "necessity", "owner domain(s)", "notes"]));
    // Resolve owner domain (master row) for each dependency
    const depObjectIds = dependencyRows.map((r) => r.data_object_id as number);
    const ownerRows: any[] = depObjectIds.length === 0 ? [] : await pg(
      "GET",
      `/domain_data_objects?data_object_id=in.(${depObjectIds.join(",")})&role=eq.master&select=domain_id,data_object_id`,
    );
    const ownerMap = new Map<number, string[]>();
    for (const o of ownerRows) {
      const did = o.data_object_id as number;
      const d = domainsById.get(o.domain_id as number);
      if (!d) continue;
      if (!ownerMap.has(did)) ownerMap.set(did, []);
      ownerMap.get(did)!.push(d.domain_code);
    }
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
  out.push("");

  out.push("### Outbound handoffs (events this domain publishes that other domains react to)");
  out.push("");
  if (handoffOutbound.length === 0) {
    out.push("_(no outbound `cross_domain_handoffs` recorded)_");
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

  out.push("### Inbound handoffs (events from other domains this domain reacts to)");
  out.push("");
  if (handoffInbound.length === 0) {
    out.push("_(no inbound `cross_domain_handoffs` recorded)_");
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

  out.push("### Cross-domain `data_object_relationships` (payload→target verb edges)");
  out.push("");
  if (crossRels.length === 0) {
    out.push("_(no cross-domain `data_object_relationships` recorded — backfill only covers handoffs with clean payload→target mappings)_");
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

  // §7 lifecycle states per master
  out.push(sectionHeader(7, "Lifecycle states (per master data_object)"));
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
        const verb = s.permission_verb_override || s.state_name;
        const gate = s.requires_permission ? `\`${slug}:${verb}_${obj.singular_label.toLowerCase().replace(/\s+/g, "_")}\`` : "";
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

  // §8 workflow gates + business rules (derived)
  out.push(sectionHeader(8, "Workflow gates and business rules (derived from §3.1 flags + §7 lifecycle states)"));
  const { permissions, businessRules } = deriveWorkflowGatesAndRules(slug, masterRows, lifecycleRows, dataObjectsById);
  out.push("### Permissions table");
  out.push("");
  out.push(tableHeader(["permission", "tier", "description", "included in `:admin`?"]));
  for (const p of permissions) {
    out.push(tableRow([`\`${p.code}\``, p.tier, p.description, p.includedInAdmin ? "✓" : ""]));
  }
  out.push("");
  out.push("### Business rules");
  out.push("");
  if (businessRules.length === 0) {
    out.push("_(no flag-derived business rules — no master data_object on this domain has `has_personal_content`, `has_submit_lock`, or `has_single_approver` set.)_");
  } else {
    out.push(tableHeader(["rule_name", "data_object", "source flag", "intent"]));
    for (const r of businessRules) {
      out.push(tableRow([`\`${r.name}\``, `\`${r.dataObject}\``, r.sourceFlag, r.intent]));
    }
  }

  // §9 capabilities + delivery_strength matrix
  out.push(sectionHeader(9, "Capabilities"));
  if (capRows.length === 0) {
    out.push("_(no `capabilities` linked to this domain via `capability_domains`)_");
  } else {
    out.push(tableHeader(["capability_code", "capability_name", "description"]));
    for (const c of capRows) {
      const cap = c.capabilities;
      if (!cap) continue;
      out.push(tableRow([`\`${cap.capability_code}\``, cap.capability_name, cap.description || ""]));
    }
    out.push("");
    out.push("### Delivery-strength matrix (solution × capability)");
    out.push("");
    if (solCapRows.length === 0) {
      out.push("_(no `solution_capabilities` recorded for any capability on this domain)_");
    } else {
      // Build pivot: rows = solutions, cols = capabilities, cells = delivery_strength
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

  // §10 solutions & vendors
  out.push(sectionHeader(10, "Solutions and vendors"));
  if (solDomainRows.length === 0) {
    out.push("_(no `solution_domains` rows for this domain)_");
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

  // §11 functional ownership (RACI)
  out.push(sectionHeader(11, "Functional ownership (RACI)"));
  if (bfdRows.length === 0) {
    out.push("_(no `business_function_domains` rows for this domain — Phase C backfill pending)_");
  } else {
    out.push("### Domain-level");
    out.push("");
    out.push(tableHeader(["business_function", "responsibility", "notes"]));
    for (const r of bfdRows) {
      out.push(tableRow([r.business_functions?.business_function_name || "", r.responsibility_type, r.notes || ""]));
    }
  }
  if (bfcRows.length > 0) {
    out.push("");
    out.push("### Capability-level overrides (where capability diverges from domain)");
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

  // §12 regulations
  out.push(sectionHeader(12, "Regulatory and jurisdictional context"));
  if (regRows.length === 0) {
    out.push("_(no `domain_regulations` rows)_");
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

  // §13 architect handoff hints
  out.push(sectionHeader(13, "Architect handoff hints"));
  const flagshipSolution = pickFlagshipSolution(solDomainRows);
  const namingMode = pickNamingMode(masterRows);
  out.push(tableHeader(["hint", "value", "rationale"]));
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
  out.push(tableRow([
    "module_slug_suggestion",
    `\`${slug}\``,
    "lowercased `domain_code`; used as the prefix in derived permissions (§4.1, §8)",
  ]));

  out.push("");
  out.push(`---`);
  out.push(``);
  out.push(`_Section ordering and table shapes follow the contract in [plan-domain-fact-sheets.md § 1](../plan-domain-fact-sheets.md#1-the-fact-sheet-contract)._`);
  out.push("");

  return out.join("\n");
}

// ---------- §4 derivation ----------

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

  // §4.1 baseline tier
  permissions.push({ code: `${slug}:read`, tier: "baseline-read", description: "Read access to every entity in the module", includedInAdmin: true });
  permissions.push({ code: `${slug}:manage`, tier: "baseline-manage", description: "Edit operational records", includedInAdmin: true });
  permissions.push({ code: `${slug}:admin`, tier: "baseline-admin", description: "Edit reference data + inherit all workflow gates", includedInAdmin: false });

  // §4.2 workflow gates from lifecycle states with requires_permission
  for (const ls of lifecycleRows) {
    if (!ls.requires_permission) continue;
    const obj = dataObjectsById.get(ls.data_object_id as number);
    if (!obj) continue;
    const verb = ls.permission_verb_override || ls.state_name;
    const entity = obj.singular_label.toLowerCase().replace(/\s+/g, "_");
    permissions.push({
      code: `${slug}:${verb}_${entity}`,
      tier: "workflow-gate (lifecycle)",
      description: `Transition \`${obj.data_object_name}\` into state \`${ls.state_name}\``,
      includedInAdmin: true,
    });
  }

  // §4.3 pattern-flag derived
  for (const r of masterRows) {
    const o = r.data_object as DataObject;
    const entitySingular = o.singular_label.toLowerCase().replace(/\s+/g, "_");
    const entityPlural = o.plural_label.toLowerCase().replace(/\s+/g, "_");
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

function composeBehavioralPatternProse(
  masterRows: any[],
  intraRels: any[],
  dataObjectsById: Map<number, DataObject>,
): string {
  const parts: string[] = [];
  const personalContent = masterRows.filter((r) => (r.data_object as DataObject).has_personal_content).map((r) => (r.data_object as DataObject).plural_label);
  if (personalContent.length > 0) {
    parts.push(`personal-content scoping on ${personalContent.map((n) => `**${n}**`).join(", ")}`);
  }
  const submitLock = masterRows.filter((r) => (r.data_object as DataObject).has_submit_lock).map((r) => (r.data_object as DataObject).plural_label);
  if (submitLock.length > 0) {
    parts.push(`submit-lock workflow on ${submitLock.map((n) => `**${n}**`).join(", ")}`);
  }
  const singleApprover = masterRows.filter((r) => (r.data_object as DataObject).has_single_approver).map((r) => (r.data_object as DataObject).plural_label);
  if (singleApprover.length > 0) {
    parts.push(`single-approver flow on ${singleApprover.map((n) => `**${n}**`).join(", ")}`);
  }
  if (parts.length === 0) return "";
  return "This domain follows " + parts.join("; ") + ".";
}

function pickFlagshipSolution(solDomainRows: any[]): { name: string; rationale: string } {
  if (solDomainRows.length === 0) return { name: "_(none)_", rationale: "no solutions linked" };
  const primary = solDomainRows.filter((r) => r.coverage_level === "primary");
  const pool = primary.length > 0 ? primary : solDomainRows;
  // Prefer a `standard_solution` or `external_connector` over an action/compute one
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
  if (bareCount === 0) {
    return { mode: "domain-prefixed", rationale: `all ${masterRows.length} master data_objects use domain-prefixed names (default per SKILL.md naming rule)` };
  }
  if (prefixCount === 0) {
    return { mode: "canonical bare-word", rationale: `all ${masterRows.length} masters carry \`is_canonical_bare_word=true\` — this domain owns the unprefixed names catalog-wide` };
  }
  return {
    mode: "mixed",
    rationale: `${bareCount} canonical bare-word masters + ${prefixCount} domain-prefixed; preserve existing claims when extending the model`,
  };
}

// ---------- IO ----------

if (!existsSync(FACT_SHEET_DIR)) {
  if (!CHECK) mkdirSync(FACT_SHEET_DIR, { recursive: true });
}

async function emitOne(domain: Domain): Promise<{ path: string; changed: boolean }> {
  const md = await emitDomain(domain);
  const outPath = OUT_OVERRIDE
    ? resolve(OUT_OVERRIDE)
    : resolve(FACT_SHEET_DIR, `${domain.domain_code}.md`);

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
    console.error(`drift detected — re-run without --check to regenerate, then commit.`);
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
