#!/usr/bin/env bun
// IGA full-scope loader (2026-05-26).
//
// Cures the IGA audit findings end-to-end:
//   Phase 1: A1 cosmetic em-dash patch on domains.business_logic
//   Phase 2: A2 5 new IGA-prefixed capabilities + capability_domains
//   Phase 3: A3 vendors (Okta, One Identity, Omada) + 6 new solutions + solution_domains
//   Phase 4: M1-M6 5 domain_modules + domain_module_capabilities + domain_module_data_objects + domain_starter_modules
//   Phase 5: B4 pattern-flag PATCHes on the 5 IGA-prefixed masters + notes on entitlement_definitions
//   Phase 6: B11 aliases for all 5 IGA masters
//   Phase 7: B12 lifecycle states for all 5 IGA masters
//   Phase 8: B6 + B7 intra-IGA + users-edge data_object_relationships
//   Phase 9: F2/F3 tools (mutates + query_users) + 5 module-level system skills + skill_tools
//   Phase 10: Permissions (baseline + workflow gates) per module
//   Phase 11: E1-E6 roles + role_modules + role_permissions
//   Phase 12: B10b backfill (source/target module FKs on existing IGA-touching handoffs)
//
// Idempotent: every phase reads existing rows by natural key, inserts only missing ones,
// re-reads to build the id map for downstream FKs. Safe to re-run end-to-end.
//
// Rule #1: every insert lets record_status default to 'new'. No 'approved' values anywhere.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

const IGA_DOMAIN_ID = 35;

// ============================================================================
// Helpers
// ============================================================================

async function call(body: Row): Promise<Row[]> {
  const json = JSON.stringify(body);
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", json], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}\n${json.slice(0, 400)}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 1;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function syncByKey<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map((r) => String(r[keyField])));
  const missing = rows.filter((r) => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  + ${missing.length} new into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  = ${path}: ${existing.length} present, none missing`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const m = new Map<string, number>();
  for (const r of all) m.set(String(r[keyField]), Number(r.id));
  return m;
}

// Sync a junction by composite key (e.g. capability_id + domain_id).
async function syncJunction(
  path: string,
  rows: Row[],
  keyFields: string[],
  selectExtra: string = "",
): Promise<void> {
  if (rows.length === 0) {
    console.log(`  = ${path}: no rows to insert`);
    return;
  }
  const select = `select=${keyFields.join(",")}${selectExtra ? "," + selectExtra : ""}&limit=10000`;
  const existing = await get(`${path}?${select}`);
  const keyOf = (r: Row) => keyFields.map((k) => String(r[k] ?? "")).join("|");
  const existingKeys = new Set(existing.map(keyOf));
  const missing = rows.filter((r) => !existingKeys.has(keyOf(r)));
  if (missing.length > 0) {
    console.log(`  + ${missing.length} new into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  = ${path}: ${existing.length} present, none missing`);
  }
}

function slugify(code: string): string {
  return code.toLowerCase().replace(/-/g, "_");
}

// ============================================================================
// Phase 1: A1 patch — remove em-dash from domains.business_logic
// ============================================================================

async function phase1_patchDomainBusinessLogic() {
  console.log("\n=== Phase 1: A1 domain business_logic em-dash patch ===");
  const cleaned =
    "Segregation-of-duties engine, certification ML for outlier detection, and access analytics. The rest is joiner/mover/leaver workflow.";
  await patch(`/domains?id=eq.${IGA_DOMAIN_ID}`, { business_logic: cleaned });
  console.log("  PATCHed domains.business_logic");
}

// ============================================================================
// Phase 2: A2 capabilities + capability_domains
// ============================================================================

const newCapabilities = [
  {
    capability_code: "IGA-ACCESS-REQUEST-WORKFLOW",
    capability_name: "Access Request Workflow",
    description:
      "End-to-end workflow for raising, approving, and provisioning entitlement requests (joiner, mover, ad-hoc), including pre-flight SoD checks and approval routing.",
  },
  {
    capability_code: "IGA-ACCESS-CERTIFICATION",
    capability_name: "Access Certification",
    description:
      "Periodic recertification campaigns where reviewers (managers, application owners) attest to or revoke user entitlements. Generates audit-grade evidence for GRC.",
  },
  {
    capability_code: "IGA-SOD-DETECTION",
    capability_name: "Segregation of Duties Detection",
    description:
      "Rule-based and ML-driven detection of toxic entitlement combinations across systems, with mitigation workflow and accepted-risk tracking.",
  },
  {
    capability_code: "IGA-ENTITLEMENT-MGMT",
    capability_name: "Entitlement Management",
    description:
      "Catalog and lifecycle of access primitives (roles, groups, permission sets, birthright bundles) used by access requests and SoD rules.",
  },
  {
    capability_code: "IGA-AUTO-PROVISIONING-CONNECTORS",
    capability_name: "Automated Provisioning Connectors",
    description:
      "SCIM, REST, and proprietary connectors that create, modify, suspend, and delete accounts in downstream applications on receipt of an approved access request or lifecycle event.",
  },
];

async function phase2_capabilities(): Promise<Map<string, number>> {
  console.log("\n=== Phase 2: A2 capabilities + capability_domains ===");
  const capMap = await syncByKey("/capabilities", newCapabilities, "capability_code");
  const all = await get(`/capabilities?capability_code=in.(${newCapabilities.map((c) => c.capability_code).join(",")})&select=id,capability_code&limit=100`);
  for (const r of all) capMap.set(String(r.capability_code), Number(r.id));

  // Link to IGA domain
  const links = newCapabilities.map((c) => ({
    capability_id: capMap.get(c.capability_code)!,
    domain_id: IGA_DOMAIN_ID,
  }));
  await syncJunction("/capability_domains", links, ["capability_id", "domain_id"]);
  return capMap;
}

// ============================================================================
// Phase 3: A3 vendors + solutions + solution_domains
// ============================================================================

const newVendors = [
  {
    vendor_name: "Okta",
    vendor_url: "https://www.okta.com",
    headquarters_country: "USA",
    description: "Identity platform vendor (Workforce Identity, Customer Identity, Okta Identity Governance).",
  },
  {
    vendor_name: "One Identity",
    vendor_url: "https://www.oneidentity.com",
    headquarters_country: "USA",
    description: "Identity and access management vendor (Identity Manager, Safeguard, OneLogin). Quest Software brand.",
  },
  {
    vendor_name: "Omada",
    vendor_url: "https://www.omada.net",
    headquarters_country: "Denmark",
    description: "Identity governance and administration vendor (Omada Identity Cloud).",
  },
];

type SolutionDraft = {
  solution_name: string;
  vendor_name: string;
  description: string;
  solution_url: string;
  coverage_level: "primary" | "secondary" | "partial";
};

const newSolutions: SolutionDraft[] = [
  {
    solution_name: "Okta Identity Governance",
    vendor_name: "Okta",
    description: "Cloud-native IGA built on Okta's identity fabric: access requests, access certifications, lifecycle policies.",
    solution_url: "https://www.okta.com/products/identity-governance/",
    coverage_level: "primary",
  },
  {
    solution_name: "Microsoft Entra ID Governance",
    vendor_name: "Microsoft",
    description: "Entra-native IGA covering entitlement management, access reviews, privileged identity management, lifecycle workflows.",
    solution_url: "https://www.microsoft.com/en-us/security/business/identity-access/microsoft-entra-id-governance",
    coverage_level: "primary",
  },
  {
    solution_name: "One Identity Manager",
    vendor_name: "One Identity",
    description: "On-prem and cloud-deployable IGA suite with deep entitlement modeling, SAP integration, and certification workflows.",
    solution_url: "https://www.oneidentity.com/products/identity-manager/",
    coverage_level: "primary",
  },
  {
    solution_name: "Oracle Identity Governance",
    vendor_name: "Oracle",
    description: "Oracle's IGA platform (formerly OIM): user provisioning, access request, certification, role lifecycle.",
    solution_url: "https://www.oracle.com/security/identity-management/identity-governance/",
    coverage_level: "primary",
  },
  {
    solution_name: "IBM Security Verify Governance",
    vendor_name: "IBM",
    description: "IBM's IGA platform (formerly ISIM/ISIG): access certification, role mining, provisioning, separation of duties.",
    solution_url: "https://www.ibm.com/products/verify-governance",
    coverage_level: "primary",
  },
  {
    solution_name: "Omada Identity Cloud",
    vendor_name: "Omada",
    description: "SaaS-native IGA platform with prepackaged best-practice processes and SAP-strong connectors.",
    solution_url: "https://www.omada.net/en-us/products/omada-identity-cloud",
    coverage_level: "primary",
  },
];

async function phase3_vendorsAndSolutions(): Promise<void> {
  console.log("\n=== Phase 3: A3 vendors + solutions + solution_domains ===");
  const vendorMap = await syncByKey("/vendors", newVendors, "vendor_name");
  // Re-read full vendor name set
  const allVendors = await get(`/vendors?vendor_name=in.(${[...newVendors.map((v) => v.vendor_name), "Microsoft", "Oracle", "IBM"].map(encodeURIComponent).join(",")})&select=id,vendor_name&limit=50`);
  for (const r of allVendors) vendorMap.set(String(r.vendor_name), Number(r.id));

  // Insert solutions with vendor_id
  const solutionRows = newSolutions.map((s) => ({
    solution_name: s.solution_name,
    description: s.description,
    solution_url: s.solution_url,
    vendor_id: vendorMap.get(s.vendor_name)!,
    solution_type: "saas",
  }));
  if (!solutionRows.every((s) => s.vendor_id)) {
    throw new Error("Vendor lookup failed for one or more solutions: " + JSON.stringify(solutionRows));
  }
  const solMap = await syncByKey("/solutions", solutionRows, "solution_name");

  // solution_domains links
  const links = newSolutions.map((s) => ({
    solution_id: solMap.get(s.solution_name)!,
    domain_id: IGA_DOMAIN_ID,
    coverage_level: s.coverage_level,
  }));
  await syncJunction("/solution_domains", links, ["solution_id", "domain_id"]);
}

// ============================================================================
// Phase 4: M1-M6 modules
// ============================================================================

const newModules = [
  {
    domain_module_code: "IGA-ACCESS-REQUEST",
    domain_module_name: "IGA Access Request",
    description: "Joiner/mover/ad-hoc access request workflow: request submission, SoD pre-check, approval routing, provisioning handoff.",
    capabilities: ["IGA-ACCESS-REQUEST-WORKFLOW"],
    dataObjects: [
      { code: "iga_access_requests", role: "master", necessity: "required" },
      { code: "iga_entitlement_definitions", role: "consumer", necessity: "required" },
      { code: "iga_sod_violations", role: "consumer", necessity: "required" },
      { code: "iga_provisioning_events", role: "consumer", necessity: "required" },
      { code: "employees", role: "consumer", necessity: "required" },
      { code: "org_units", role: "embedded_master", necessity: "required" },
      { code: "users", role: "consumer", necessity: "required" },
    ],
  },
  {
    domain_module_code: "IGA-ACCESS-CERTIFICATION",
    domain_module_name: "IGA Access Certification",
    description: "Scheduled and ad-hoc access recertification campaigns. Reviewers attest or revoke; revoke decisions drive provisioning; campaign closure produces GRC evidence.",
    capabilities: ["IGA-ACCESS-CERTIFICATION"],
    dataObjects: [
      { code: "iga_access_certifications", role: "master", necessity: "required" },
      { code: "iga_entitlement_definitions", role: "consumer", necessity: "required" },
      { code: "iga_provisioning_events", role: "consumer", necessity: "required" },
      { code: "employees", role: "consumer", necessity: "required" },
      { code: "users", role: "consumer", necessity: "required" },
    ],
  },
  {
    domain_module_code: "IGA-SOD-MGMT",
    domain_module_name: "IGA Segregation of Duties Management",
    description: "Toxic-combination ruleset, detection engine, triage workflow, mitigation tracking, accepted-risk register.",
    capabilities: ["IGA-SOD-DETECTION"],
    dataObjects: [
      { code: "iga_sod_violations", role: "master", necessity: "required" },
      { code: "iga_entitlement_definitions", role: "consumer", necessity: "required" },
      { code: "iga_provisioning_events", role: "consumer", necessity: "optional" },
      { code: "employees", role: "consumer", necessity: "required" },
      { code: "users", role: "consumer", necessity: "required" },
    ],
  },
  {
    domain_module_code: "IGA-ENTITLEMENT-CATALOG",
    domain_module_name: "IGA Entitlement Catalog",
    description: "Catalog of access primitives (roles, groups, permission sets, birthright bundles). Lightweight lifecycle: draft -> published -> deprecated -> retired.",
    capabilities: ["IGA-ENTITLEMENT-MGMT", "IDENTITY-RESOLUTION"],
    dataObjects: [
      { code: "iga_entitlement_definitions", role: "master", necessity: "required" },
      { code: "identity_graphs", role: "contributor", necessity: "required" },
      { code: "org_units", role: "embedded_master", necessity: "required" },
      { code: "users", role: "consumer", necessity: "required" },
    ],
  },
  {
    domain_module_code: "IGA-AUTO-PROVISIONING",
    domain_module_name: "IGA Automated Provisioning",
    description: "Connector framework + provisioning event log. Executes create/modify/suspend/delete actions in downstream systems on receipt of approved requests or JML events.",
    capabilities: ["IGA-AUTO-PROVISIONING-CONNECTORS", "OFFBOARDING"],
    dataObjects: [
      { code: "iga_provisioning_events", role: "master", necessity: "required" },
      { code: "iga_entitlement_definitions", role: "consumer", necessity: "required" },
      { code: "iga_access_requests", role: "consumer", necessity: "required" },
      { code: "saas_app_assignments", role: "master", necessity: "required" },
      { code: "employees", role: "consumer", necessity: "required" },
      { code: "locations", role: "embedded_master", necessity: "optional" },
      { code: "users", role: "consumer", necessity: "required" },
    ],
  },
];

const starterPositions = [
  { code: "IGA-ACCESS-REQUEST", position: 1, notes: "Day-1 entry point: stand up the JML request workflow, then plug in connectors and certification." },
  { code: "IGA-AUTO-PROVISIONING", position: 2, notes: "Pair with ACCESS-REQUEST: requests without provisioning produce paper-only IT tickets; provisioning without requests is just SCIM. Together they replace the manual joiner runbook." },
  { code: "IGA-ACCESS-CERTIFICATION", position: 3, notes: "Once provisioning is reliable, layer in periodic certification to produce audit-grade evidence for GRC and shrink the entitlement footprint." },
];

async function phase4_modules(capMap: Map<string, number>): Promise<Map<string, number>> {
  console.log("\n=== Phase 4: M1-M6 modules + capabilities + data_objects + starter ===");

  // Insert modules
  const moduleRows = newModules.map((m) => ({
    domain_module_code: m.domain_module_code,
    domain_module_name: m.domain_module_name,
    description: m.description,
    domain_id: IGA_DOMAIN_ID,
  }));
  const modMap = await syncByKey("/domain_modules", moduleRows, "domain_module_code");

  // Resolve data_object codes -> ids
  const objCodes = Array.from(new Set(newModules.flatMap((m) => m.dataObjects.map((d) => d.code))));
  const objs = await get(`/data_objects?data_object_name=in.(${objCodes.join(",")})&select=id,data_object_name&limit=200`);
  const objMap = new Map<string, number>();
  for (const r of objs) objMap.set(String(r.data_object_name), Number(r.id));
  for (const c of objCodes) {
    if (!objMap.has(c)) throw new Error(`data_object missing: ${c}`);
  }

  // domain_module_capabilities (also link existing cross-cutting caps OFFBOARDING + IDENTITY-RESOLUTION)
  // Resolve cross-cutting cap ids if not in capMap
  if (!capMap.has("OFFBOARDING") || !capMap.has("IDENTITY-RESOLUTION")) {
    const cc = await get(`/capabilities?capability_code=in.(OFFBOARDING,IDENTITY-RESOLUTION)&select=id,capability_code`);
    for (const r of cc) capMap.set(String(r.capability_code), Number(r.id));
  }
  const capLinks: Row[] = [];
  for (const m of newModules) {
    const mid = modMap.get(m.domain_module_code)!;
    for (const capCode of m.capabilities) {
      const cid = capMap.get(capCode);
      if (!cid) throw new Error(`capability missing: ${capCode}`);
      capLinks.push({ domain_module_id: mid, capability_id: cid });
    }
  }
  await syncJunction("/domain_module_capabilities", capLinks, ["domain_module_id", "capability_id"]);

  // domain_module_data_objects
  const dmoRows: Row[] = [];
  for (const m of newModules) {
    const mid = modMap.get(m.domain_module_code)!;
    for (const d of m.dataObjects) {
      dmoRows.push({
        domain_module_id: mid,
        data_object_id: objMap.get(d.code)!,
        role: d.role,
        necessity: d.necessity,
      });
    }
  }
  await syncJunction("/domain_module_data_objects", dmoRows, ["domain_module_id", "data_object_id"]);

  // domain_starter_modules: skipped — table has been retired from the live catalog
  console.log("  - domain_starter_modules: skipped (table retired)");

  return modMap;
}

// ============================================================================
// Phase 5: B4 pattern-flag PATCHes
// ============================================================================

const patternPatches = [
  { name: "iga_access_requests", patch: { has_submit_lock: true, has_single_approver: true } },
  { name: "iga_access_certifications", patch: { has_single_approver: true } },
  { name: "iga_sod_violations", patch: { has_submit_lock: true } },
  { name: "iga_provisioning_events", patch: { has_submit_lock: true } },
  {
    name: "iga_entitlement_definitions",
    patch: {
      notes: "Config-shape master: lightweight draft -> published -> deprecated -> retired lifecycle, no per-record approval workflow. Permission gates apply only on publish and retire.",
    },
  },
];

async function phase5_patternFlags() {
  console.log("\n=== Phase 5: B4 pattern flags + entitlement notes ===");
  for (const p of patternPatches) {
    await patch(`/data_objects?data_object_name=eq.${p.name}`, p.patch);
    console.log(`  PATCH ${p.name}: ${JSON.stringify(p.patch).slice(0, 80)}`);
  }
}

// ============================================================================
// Phase 6: B11 aliases
// ============================================================================

const aliases: Array<{ name: string; aliases: Array<{ alias_name: string; alias_type: string; is_preferred?: boolean }> }> = [
  {
    name: "iga_access_requests",
    aliases: [
      { alias_name: "Access Request", alias_type: "synonym", is_preferred: true },
      { alias_name: "Permission Request", alias_type: "synonym" },
      { alias_name: "Joiner Request", alias_type: "synonym" },
      { alias_name: "RBAC Change Request", alias_type: "synonym" },
    ],
  },
  {
    name: "iga_access_certifications",
    aliases: [
      { alias_name: "Access Review", alias_type: "synonym", is_preferred: true },
      { alias_name: "Recertification Campaign", alias_type: "synonym" },
      { alias_name: "Attestation Campaign", alias_type: "synonym" },
      { alias_name: "User Access Review", alias_type: "synonym" },
    ],
  },
  {
    name: "iga_sod_violations",
    aliases: [
      { alias_name: "SoD Violation", alias_type: "synonym", is_preferred: true },
      { alias_name: "Toxic Combination", alias_type: "synonym" },
      { alias_name: "Segregation of Duties Conflict", alias_type: "synonym" },
    ],
  },
  {
    name: "iga_entitlement_definitions",
    aliases: [
      { alias_name: "Entitlement", alias_type: "synonym", is_preferred: true },
      { alias_name: "Role Definition", alias_type: "synonym" },
      { alias_name: "Permission Set", alias_type: "synonym" },
      { alias_name: "Access Role", alias_type: "synonym" },
      { alias_name: "Birthright Role", alias_type: "synonym" },
    ],
  },
  {
    name: "iga_provisioning_events",
    aliases: [
      { alias_name: "Provisioning Action", alias_type: "synonym", is_preferred: true },
      { alias_name: "Account Action", alias_type: "synonym" },
      { alias_name: "Access Grant/Revoke", alias_type: "synonym" },
      { alias_name: "Account Operation", alias_type: "synonym" },
    ],
  },
];

async function phase6_aliases() {
  console.log("\n=== Phase 6: B11 aliases ===");
  const objNames = aliases.map((a) => a.name);
  const objs = await get(`/data_objects?data_object_name=in.(${objNames.join(",")})&select=id,data_object_name`);
  const objMap = new Map<string, number>();
  for (const r of objs) objMap.set(String(r.data_object_name), Number(r.id));

  const rows: Row[] = [];
  for (const a of aliases) {
    const oid = objMap.get(a.name)!;
    for (const al of a.aliases) {
      rows.push({
        data_object_id: oid,
        alias_name: al.alias_name,
        alias_type: al.alias_type,
        is_preferred: al.is_preferred ?? false,
      });
    }
  }
  await syncJunction("/data_object_aliases", rows, ["data_object_id", "alias_name"]);
}

// ============================================================================
// Phase 7: B12 lifecycle states
// ============================================================================

type LifecycleState = {
  state_name: string;
  state_order: number;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  description: string;
  module_code?: string;
};

const lifecycleStates: Record<string, LifecycleState[]> = {
  iga_access_requests: [
    { state_name: "draft", state_order: 10, is_initial: true, description: "Requester is composing the request; not yet submitted." },
    { state_name: "submitted", state_order: 20, description: "Request submitted; SoD pre-check evaluating." },
    { state_name: "sod_pre_check_failed", state_order: 25, requires_permission: true, permission_verb_override: "override_sod_violation", description: "SoD pre-check flagged a toxic combination; requires elevated approver override or scope adjustment." },
    { state_name: "pending_approval", state_order: 30, description: "Routed to one or more approvers." },
    { state_name: "approved", state_order: 40, requires_permission: true, permission_verb_override: "approve_access_request", description: "All required approvers approved; queued for provisioning." },
    { state_name: "provisioning", state_order: 50, description: "Connector framework executing entitlement grants in downstream systems." },
    { state_name: "completed", state_order: 60, is_terminal: true, description: "All grants confirmed; request closed." },
    { state_name: "rejected", state_order: 70, is_terminal: true, requires_permission: true, permission_verb_override: "reject_access_request", description: "Denied by an approver." },
    { state_name: "cancelled", state_order: 80, is_terminal: true, description: "Requester or admin cancelled before completion." },
  ],
  iga_access_certifications: [
    { state_name: "draft", state_order: 10, is_initial: true, description: "Campaign being configured (scope, reviewers, schedule); not yet active." },
    { state_name: "scheduled", state_order: 20, requires_permission: true, permission_verb_override: "schedule_certification", description: "Campaign scheduled to start at a future date." },
    { state_name: "in_progress", state_order: 30, description: "Reviewers receiving line items; attestation/revoke decisions being captured." },
    { state_name: "review_complete", state_order: 40, description: "All reviewers have made their decisions; revoke queue assembled." },
    { state_name: "revocations_pending", state_order: 50, description: "Revoke decisions queued; provisioning events being created." },
    { state_name: "closed", state_order: 60, is_terminal: true, requires_permission: true, permission_verb_override: "close_certification", description: "Campaign closed; evidence pack delivered to GRC." },
    { state_name: "cancelled", state_order: 70, is_terminal: true, description: "Campaign cancelled (rare; usually due to scope error)." },
  ],
  iga_sod_violations: [
    { state_name: "detected", state_order: 10, is_initial: true, description: "Toxic combination identified by rule engine or ML model." },
    { state_name: "triaged", state_order: 20, requires_permission: true, permission_verb_override: "triage_violation", description: "Analyst reviewed; initial assessment of severity and remediation path captured." },
    { state_name: "mitigation_pending", state_order: 30, description: "Compensating control or entitlement adjustment in flight." },
    { state_name: "mitigated", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "close_violation", description: "Violation resolved via entitlement change or compensating control." },
    { state_name: "accepted_risk", state_order: 50, is_terminal: true, requires_permission: true, permission_verb_override: "accept_risk", description: "Business accepts the violation; recorded in risk register, periodic review required." },
    { state_name: "false_positive", state_order: 60, is_terminal: true, requires_permission: true, permission_verb_override: "mark_false_positive", description: "Determined not to be a real violation; rule may need refinement." },
  ],
  iga_entitlement_definitions: [
    { state_name: "draft", state_order: 10, is_initial: true, description: "New entitlement being authored; not yet visible to access requests." },
    { state_name: "published", state_order: 20, requires_permission: true, permission_verb_override: "publish_entitlement", description: "Entitlement live in the catalog; available to access requests and SoD ruleset." },
    { state_name: "deprecated", state_order: 30, description: "Marked for retirement; existing grants honored but new requests blocked." },
    { state_name: "retired", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "retire_entitlement", description: "No longer issuable; existing grants must be migrated or revoked." },
  ],
  iga_provisioning_events: [
    { state_name: "queued", state_order: 10, is_initial: true, description: "Event recorded; awaiting connector execution." },
    { state_name: "in_progress", state_order: 20, description: "Connector executing the action against the target system." },
    { state_name: "completed", state_order: 30, is_terminal: true, description: "Action confirmed by target system; event closed." },
    { state_name: "failed", state_order: 40, is_terminal: true, description: "Connector returned an error; remediation workflow opens." },
    { state_name: "rolled_back", state_order: 50, is_terminal: true, requires_permission: true, permission_verb_override: "rollback_provisioning", description: "Action reversed due to downstream error or compliance issue." },
  ],
};

// Map states to realizing modules (some are cross-module, leave null)
const stateModuleMap: Record<string, string | null> = {
  // iga_access_requests states realized in IGA-ACCESS-REQUEST
  "iga_access_requests:draft": "IGA-ACCESS-REQUEST",
  "iga_access_requests:submitted": "IGA-ACCESS-REQUEST",
  "iga_access_requests:sod_pre_check_failed": "IGA-ACCESS-REQUEST",
  "iga_access_requests:pending_approval": "IGA-ACCESS-REQUEST",
  "iga_access_requests:approved": "IGA-ACCESS-REQUEST",
  "iga_access_requests:provisioning": "IGA-AUTO-PROVISIONING",
  "iga_access_requests:completed": "IGA-ACCESS-REQUEST",
  "iga_access_requests:rejected": "IGA-ACCESS-REQUEST",
  "iga_access_requests:cancelled": "IGA-ACCESS-REQUEST",
  // certifications in IGA-ACCESS-CERTIFICATION
  "iga_access_certifications:draft": "IGA-ACCESS-CERTIFICATION",
  "iga_access_certifications:scheduled": "IGA-ACCESS-CERTIFICATION",
  "iga_access_certifications:in_progress": "IGA-ACCESS-CERTIFICATION",
  "iga_access_certifications:review_complete": "IGA-ACCESS-CERTIFICATION",
  "iga_access_certifications:revocations_pending": "IGA-ACCESS-CERTIFICATION",
  "iga_access_certifications:closed": "IGA-ACCESS-CERTIFICATION",
  "iga_access_certifications:cancelled": "IGA-ACCESS-CERTIFICATION",
  // SoD in IGA-SOD-MGMT
  "iga_sod_violations:detected": "IGA-SOD-MGMT",
  "iga_sod_violations:triaged": "IGA-SOD-MGMT",
  "iga_sod_violations:mitigation_pending": "IGA-SOD-MGMT",
  "iga_sod_violations:mitigated": "IGA-SOD-MGMT",
  "iga_sod_violations:accepted_risk": "IGA-SOD-MGMT",
  "iga_sod_violations:false_positive": "IGA-SOD-MGMT",
  // entitlement in IGA-ENTITLEMENT-CATALOG
  "iga_entitlement_definitions:draft": "IGA-ENTITLEMENT-CATALOG",
  "iga_entitlement_definitions:published": "IGA-ENTITLEMENT-CATALOG",
  "iga_entitlement_definitions:deprecated": "IGA-ENTITLEMENT-CATALOG",
  "iga_entitlement_definitions:retired": "IGA-ENTITLEMENT-CATALOG",
  // provisioning in IGA-AUTO-PROVISIONING
  "iga_provisioning_events:queued": "IGA-AUTO-PROVISIONING",
  "iga_provisioning_events:in_progress": "IGA-AUTO-PROVISIONING",
  "iga_provisioning_events:completed": "IGA-AUTO-PROVISIONING",
  "iga_provisioning_events:failed": "IGA-AUTO-PROVISIONING",
  "iga_provisioning_events:rolled_back": "IGA-AUTO-PROVISIONING",
};

async function phase7_lifecycleStates(modMap: Map<string, number>) {
  console.log("\n=== Phase 7: B12 lifecycle states ===");
  const objNames = Object.keys(lifecycleStates);
  const objs = await get(`/data_objects?data_object_name=in.(${objNames.join(",")})&select=id,data_object_name`);
  const objMap = new Map<string, number>();
  for (const r of objs) objMap.set(String(r.data_object_name), Number(r.id));

  const rows: Row[] = [];
  for (const [name, states] of Object.entries(lifecycleStates)) {
    const oid = objMap.get(name)!;
    for (const s of states) {
      const key = `${name}:${s.state_name}`;
      const modCode = stateModuleMap[key];
      const row: Row = {
        data_object_id: oid,
        state_name: s.state_name,
        state_order: s.state_order,
        description: s.description,
        is_initial: s.is_initial ?? false,
        is_terminal: s.is_terminal ?? false,
        requires_permission: s.requires_permission ?? false,
      };
      if (s.permission_verb_override) row.permission_verb_override = s.permission_verb_override;
      if (modCode) row.domain_module_id = modMap.get(modCode)!;
      rows.push(row);
    }
  }
  await syncJunction("/data_object_lifecycle_states", rows, ["data_object_id", "state_name"]);
}

// ============================================================================
// Phase 8: B6 + B7 data_object_relationships
// ============================================================================

type RelationshipDraft = {
  src: string;
  rel: string;
  inv: string;
  tgt: string;
  type: "one_to_one" | "one_to_many" | "many_to_many";
  kind: "reference" | "composition" | "association";
  required: boolean;
  owner: "source" | "target";
};

const relationships: RelationshipDraft[] = [
  // Intra-IGA-master (B6)
  {
    src: "iga_access_requests", rel: "targets", inv: "requested_by",
    tgt: "iga_entitlement_definitions",
    type: "many_to_many", kind: "association", required: true, owner: "source",
  },
  {
    src: "iga_access_requests", rel: "spawns", inv: "spawned_by",
    tgt: "iga_provisioning_events",
    type: "one_to_many", kind: "reference", required: false, owner: "source",
  },
  {
    src: "iga_access_requests", rel: "may_trigger", inv: "raised_by",
    tgt: "iga_sod_violations",
    type: "one_to_many", kind: "reference", required: false, owner: "source",
  },
  {
    src: "iga_access_certifications", rel: "covers", inv: "covered_by",
    tgt: "iga_entitlement_definitions",
    type: "many_to_many", kind: "association", required: true, owner: "source",
  },
  {
    src: "iga_access_certifications", rel: "spawns_revocations", inv: "originated_from",
    tgt: "iga_provisioning_events",
    type: "one_to_many", kind: "reference", required: false, owner: "source",
  },
  {
    src: "iga_sod_violations", rel: "remediated_by", inv: "remediates",
    tgt: "iga_provisioning_events",
    type: "one_to_many", kind: "reference", required: false, owner: "source",
  },
  {
    src: "iga_sod_violations", rel: "implicates", inv: "implicated_in",
    tgt: "iga_entitlement_definitions",
    type: "many_to_many", kind: "association", required: true, owner: "source",
  },
  {
    src: "iga_provisioning_events", rel: "targets", inv: "provisioned_via",
    tgt: "iga_entitlement_definitions",
    type: "one_to_many", kind: "reference", required: true, owner: "source",
  },

  // users-edges (B7) — users is data_object id 748
  {
    src: "users", rel: "requests", inv: "requested_by",
    tgt: "iga_access_requests",
    type: "one_to_many", kind: "reference", required: true, owner: "source",
  },
  {
    src: "users", rel: "approves", inv: "approved_by",
    tgt: "iga_access_requests",
    type: "one_to_many", kind: "reference", required: false, owner: "source",
  },
  {
    src: "users", rel: "reviews", inv: "reviewed_by",
    tgt: "iga_access_certifications",
    type: "one_to_many", kind: "reference", required: true, owner: "source",
  },
  {
    src: "users", rel: "owns", inv: "owned_by",
    tgt: "iga_entitlement_definitions",
    type: "one_to_many", kind: "reference", required: false, owner: "source",
  },
  {
    src: "users", rel: "implicated_in", inv: "implicates",
    tgt: "iga_sod_violations",
    type: "one_to_many", kind: "reference", required: true, owner: "source",
  },
  {
    src: "users", rel: "targeted_by", inv: "targets",
    tgt: "iga_provisioning_events",
    type: "one_to_many", kind: "reference", required: true, owner: "target",
  },
];

async function phase8_relationships() {
  console.log("\n=== Phase 8: B6 + B7 relationships ===");
  const allNames = Array.from(new Set(relationships.flatMap((r) => [r.src, r.tgt])));
  const objs = await get(`/data_objects?data_object_name=in.(${allNames.join(",")})&select=id,data_object_name`);
  const objMap = new Map<string, number>();
  for (const r of objs) objMap.set(String(r.data_object_name), Number(r.id));

  const rows: Row[] = relationships.map((r) => ({
    data_object_id: objMap.get(r.src)!,
    related_data_object_id: objMap.get(r.tgt)!,
    relationship_verb: r.rel,
    inverse_verb: r.inv,
    relationship_type: r.type,
    relationship_kind: r.kind,
    is_required: r.required,
    owner_side: r.owner,
  }));
  await syncJunction(
    "/data_object_relationships",
    rows,
    ["data_object_id", "related_data_object_id", "relationship_verb"],
  );
}

// ============================================================================
// Phase 9: F2/F3 tools + skills + skill_tools
// ============================================================================

type ToolDraft = {
  tool_name: string;
  operation_kind: "query" | "mutate" | "side_effect" | "compute" | "inbound";
  data_object_name: string | null;
  coverage_tier: "platform" | "external" | "integration";
  description: string;
};

const newTools: ToolDraft[] = [
  // query_users (only query primitive missing)
  { tool_name: "query_users", operation_kind: "query", data_object_name: "users", coverage_tier: "platform", description: "Read user records (the platform_builtin users table)." },
  // Mutates on IGA masters
  { tool_name: "create_iga_access_request", operation_kind: "mutate", data_object_name: "iga_access_requests", coverage_tier: "platform", description: "Create a new access request in draft state." },
  { tool_name: "submit_iga_access_request", operation_kind: "mutate", data_object_name: "iga_access_requests", coverage_tier: "platform", description: "Submit a draft access request; triggers SoD pre-check and approval routing." },
  { tool_name: "approve_iga_access_request", operation_kind: "mutate", data_object_name: "iga_access_requests", coverage_tier: "platform", description: "Approve an access request as an authorized approver; advances to provisioning." },
  { tool_name: "reject_iga_access_request", operation_kind: "mutate", data_object_name: "iga_access_requests", coverage_tier: "platform", description: "Reject an access request; terminal state." },
  { tool_name: "cancel_iga_access_request", operation_kind: "mutate", data_object_name: "iga_access_requests", coverage_tier: "platform", description: "Cancel an in-flight access request before completion." },
  { tool_name: "create_iga_access_certification", operation_kind: "mutate", data_object_name: "iga_access_certifications", coverage_tier: "platform", description: "Create a new access-certification campaign." },
  { tool_name: "schedule_iga_access_certification", operation_kind: "mutate", data_object_name: "iga_access_certifications", coverage_tier: "platform", description: "Schedule a campaign to begin at a future date." },
  { tool_name: "close_iga_access_certification", operation_kind: "mutate", data_object_name: "iga_access_certifications", coverage_tier: "platform", description: "Close a completed campaign; emits GRC evidence." },
  { tool_name: "triage_iga_sod_violation", operation_kind: "mutate", data_object_name: "iga_sod_violations", coverage_tier: "platform", description: "Mark a detected SoD violation as triaged; assign mitigation path." },
  { tool_name: "mitigate_iga_sod_violation", operation_kind: "mutate", data_object_name: "iga_sod_violations", coverage_tier: "platform", description: "Record that an SoD violation has been remediated." },
  { tool_name: "accept_iga_sod_violation_risk", operation_kind: "mutate", data_object_name: "iga_sod_violations", coverage_tier: "platform", description: "Record business acceptance of an SoD violation as residual risk." },
  { tool_name: "publish_iga_entitlement_definition", operation_kind: "mutate", data_object_name: "iga_entitlement_definitions", coverage_tier: "platform", description: "Publish a draft entitlement to the live catalog." },
  { tool_name: "retire_iga_entitlement_definition", operation_kind: "mutate", data_object_name: "iga_entitlement_definitions", coverage_tier: "platform", description: "Retire a deprecated entitlement; new grants blocked." },
  { tool_name: "create_iga_provisioning_event", operation_kind: "mutate", data_object_name: "iga_provisioning_events", coverage_tier: "platform", description: "Create a queued provisioning event for connector execution." },
  { tool_name: "complete_iga_provisioning_event", operation_kind: "mutate", data_object_name: "iga_provisioning_events", coverage_tier: "platform", description: "Mark a provisioning event as completed after target-system confirmation." },
  { tool_name: "fail_iga_provisioning_event", operation_kind: "mutate", data_object_name: "iga_provisioning_events", coverage_tier: "platform", description: "Mark a provisioning event as failed; opens remediation." },
];

type SkillDraft = {
  module_code: string;
  skill_name: string;
  description: string;
  tools: Array<{ tool_name: string; requirement_level: "required" | "optional"; notes?: string }>;
};

const newSkills: SkillDraft[] = [
  {
    module_code: "IGA-ACCESS-REQUEST",
    skill_name: "iga_access_request_agent",
    description: "Agent for the joiner/mover/ad-hoc access-request workflow: receive request, run SoD pre-check, route approval, hand off to provisioning, notify requester on completion.",
    tools: [
      { tool_name: "query_iga_access_requests", requirement_level: "required" },
      { tool_name: "create_iga_access_request", requirement_level: "required" },
      { tool_name: "submit_iga_access_request", requirement_level: "required" },
      { tool_name: "approve_iga_access_request", requirement_level: "required" },
      { tool_name: "reject_iga_access_request", requirement_level: "required" },
      { tool_name: "cancel_iga_access_request", requirement_level: "optional", notes: "User-driven cancellation path." },
      { tool_name: "query_iga_entitlement_definitions", requirement_level: "required", notes: "Catalog lookup for valid entitlements." },
      { tool_name: "query_iga_sod_violations", requirement_level: "required", notes: "SoD pre-check evaluation." },
      { tool_name: "create_iga_provisioning_event", requirement_level: "required", notes: "Hands off to AUTO-PROVISIONING on approval." },
      { tool_name: "query_employees", requirement_level: "required", notes: "Resolves requester identity, peer-of-similar checks." },
      { tool_name: "query_users", requirement_level: "required" },
      { tool_name: "query_org_units", requirement_level: "required", notes: "Department-scoped role grants." },
      { tool_name: "notify_person", requirement_level: "required", notes: "Requester notification on approval / rejection / completion; approver notification on assignment." },
    ],
  },
  {
    module_code: "IGA-ACCESS-CERTIFICATION",
    skill_name: "iga_access_certification_agent",
    description: "Agent for periodic and ad-hoc access-certification campaigns: assemble line items, route to reviewers, capture decisions, queue revocations, close out with GRC evidence.",
    tools: [
      { tool_name: "query_iga_access_certifications", requirement_level: "required" },
      { tool_name: "create_iga_access_certification", requirement_level: "required" },
      { tool_name: "schedule_iga_access_certification", requirement_level: "required" },
      { tool_name: "close_iga_access_certification", requirement_level: "required" },
      { tool_name: "query_iga_entitlement_definitions", requirement_level: "required", notes: "Resolves entitlement names for review line items." },
      { tool_name: "query_saas_app_assignments", requirement_level: "required", notes: "Source of recertifiable assignments." },
      { tool_name: "create_iga_provisioning_event", requirement_level: "required", notes: "Revoke decisions create provisioning events." },
      { tool_name: "query_employees", requirement_level: "required", notes: "Manager-of-employee chain for line-item routing." },
      { tool_name: "query_users", requirement_level: "required" },
      { tool_name: "notify_person", requirement_level: "required", notes: "Reviewer assignment + reminder notifications; campaign closure notice." },
    ],
  },
  {
    module_code: "IGA-SOD-MGMT",
    skill_name: "iga_sod_mgmt_agent",
    description: "Agent for SoD detection + triage + mitigation workflow: evaluate toxic combinations against rule + ML output, triage with severity, drive mitigation, track accepted risk.",
    tools: [
      { tool_name: "query_iga_sod_violations", requirement_level: "required" },
      { tool_name: "triage_iga_sod_violation", requirement_level: "required" },
      { tool_name: "mitigate_iga_sod_violation", requirement_level: "required" },
      { tool_name: "accept_iga_sod_violation_risk", requirement_level: "required" },
      { tool_name: "query_iga_entitlement_definitions", requirement_level: "required", notes: "Resolves the toxic combination's component entitlements." },
      { tool_name: "create_iga_provisioning_event", requirement_level: "optional", notes: "Mitigation may include automated entitlement revocation." },
      { tool_name: "query_employees", requirement_level: "required", notes: "Identifies the violator and their reporting chain." },
      { tool_name: "query_users", requirement_level: "required" },
      { tool_name: "notify_person", requirement_level: "required", notes: "Notify analyst on detection; notify violator's manager on mitigation/accepted risk." },
    ],
  },
  {
    module_code: "IGA-ENTITLEMENT-CATALOG",
    skill_name: "iga_entitlement_catalog_agent",
    description: "Agent for the entitlement catalog: author, publish, deprecate, retire access primitives; surface them to access requests and SoD ruleset.",
    tools: [
      { tool_name: "query_iga_entitlement_definitions", requirement_level: "required" },
      { tool_name: "publish_iga_entitlement_definition", requirement_level: "required" },
      { tool_name: "retire_iga_entitlement_definition", requirement_level: "required" },
      { tool_name: "query_org_units", requirement_level: "required", notes: "Org-scoped birthright bundles." },
      { tool_name: "query_users", requirement_level: "required", notes: "Owner-of-entitlement lookups." },
      { tool_name: "notify_person", requirement_level: "optional", notes: "Notify entitlement owner on deprecation requests; notify catalog admin on publication." },
    ],
  },
  {
    module_code: "IGA-AUTO-PROVISIONING",
    skill_name: "iga_auto_provisioning_agent",
    description: "Agent for the connector framework: pick up queued provisioning events, execute against downstream systems via SCIM/REST/proprietary connectors, record completion or failure.",
    tools: [
      { tool_name: "query_iga_provisioning_events", requirement_level: "required" },
      { tool_name: "create_iga_provisioning_event", requirement_level: "required" },
      { tool_name: "complete_iga_provisioning_event", requirement_level: "required" },
      { tool_name: "fail_iga_provisioning_event", requirement_level: "required" },
      { tool_name: "query_iga_access_requests", requirement_level: "required", notes: "Source-of-truth on what to provision." },
      { tool_name: "query_iga_entitlement_definitions", requirement_level: "required", notes: "Definition of the access primitive to grant/revoke." },
      { tool_name: "query_saas_app_assignments", requirement_level: "required", notes: "Updates SaaS assignment table on grant/revoke." },
      { tool_name: "query_employees", requirement_level: "required" },
      { tool_name: "query_users", requirement_level: "required" },
      { tool_name: "notify_person", requirement_level: "required", notes: "Notify requester/manager on completion or failure." },
    ],
  },
];

async function phase9_toolsAndSkills(modMap: Map<string, number>) {
  console.log("\n=== Phase 9: F2/F3 tools + skills + skill_tools ===");

  // Resolve data_object ids for tool inserts
  const objNames = Array.from(new Set(newTools.map((t) => t.data_object_name).filter((n): n is string => n !== null)));
  const objs = await get(`/data_objects?data_object_name=in.(${objNames.join(",")})&select=id,data_object_name`);
  const objMap = new Map<string, number>();
  for (const r of objs) objMap.set(String(r.data_object_name), Number(r.id));

  // Insert tools
  const toolRows = newTools.map((t) => ({
    tool_name: t.tool_name,
    operation_kind: t.operation_kind,
    coverage_tier: t.coverage_tier,
    description: t.description,
    ...(t.data_object_name ? { data_object_id: objMap.get(t.data_object_name)! } : {}),
  }));
  const toolMap = await syncByKey("/tools", toolRows, "tool_name");

  // Re-read all tools we reference (existing + new) for skill_tools resolution
  const allRefTools = Array.from(
    new Set(newSkills.flatMap((s) => s.tools.map((t) => t.tool_name))),
  );
  const refRows = await get(`/tools?tool_name=in.(${allRefTools.join(",")})&select=id,tool_name`);
  for (const r of refRows) toolMap.set(String(r.tool_name), Number(r.id));

  // Insert skills (module-level system skills)
  const skillRows = newSkills.map((s) => ({
    skill_name: s.skill_name,
    skill_type: "system",
    domain_id: IGA_DOMAIN_ID,
    domain_module_id: modMap.get(s.module_code)!,
    description: s.description,
  }));
  const skillMap = await syncByKey("/skills", skillRows, "skill_name");

  // Re-read skills to ensure ids
  const allSkills = await get(`/skills?skill_name=in.(${newSkills.map((s) => s.skill_name).join(",")})&select=id,skill_name`);
  for (const r of allSkills) skillMap.set(String(r.skill_name), Number(r.id));

  // skill_tools
  const stRows: Row[] = [];
  for (const s of newSkills) {
    const sid = skillMap.get(s.skill_name)!;
    for (const t of s.tools) {
      const tid = toolMap.get(t.tool_name);
      if (!tid) throw new Error(`tool missing for skill_tools: ${t.tool_name}`);
      stRows.push({
        skill_id: sid,
        tool_id: tid,
        requirement_level: t.requirement_level,
        ...(t.notes ? { notes: t.notes } : {}),
      });
    }
  }
  await syncJunction("/skill_tools", stRows, ["skill_id", "tool_id"]);
}

// ============================================================================
// Phase 10: Permissions
// ============================================================================

type PermissionDraft = {
  module_code: string;
  permission_name: string; // full prefixed name
  tier: "baseline-read" | "baseline-manage" | "baseline-admin" | "workflow-gate" | "override";
  description: string;
};

function generateBaselinePerms(moduleCode: string): PermissionDraft[] {
  const slug = moduleCode.toLowerCase();
  return [
    { module_code: moduleCode, permission_name: `${slug}:read`, tier: "baseline-read", description: `Read access to ${moduleCode} resources.` },
    { module_code: moduleCode, permission_name: `${slug}:manage`, tier: "baseline-manage", description: `Manage ${moduleCode} resources (create / update non-gated state).` },
    { module_code: moduleCode, permission_name: `${slug}:admin`, tier: "baseline-admin", description: `Full administrative control of ${moduleCode}.` },
  ];
}

// Workflow gates derived from lifecycle states with requires_permission=true
const workflowGates: PermissionDraft[] = [
  // IGA-ACCESS-REQUEST
  { module_code: "IGA-ACCESS-REQUEST", permission_name: "iga-access-request:override_sod_violation", tier: "workflow-gate", description: "Override a failed SoD pre-check; requires elevated authority." },
  { module_code: "IGA-ACCESS-REQUEST", permission_name: "iga-access-request:approve_access_request", tier: "workflow-gate", description: "Approve a pending access request." },
  { module_code: "IGA-ACCESS-REQUEST", permission_name: "iga-access-request:reject_access_request", tier: "workflow-gate", description: "Reject a pending access request." },
  // IGA-ACCESS-CERTIFICATION
  { module_code: "IGA-ACCESS-CERTIFICATION", permission_name: "iga-access-certification:schedule_certification", tier: "workflow-gate", description: "Schedule a certification campaign." },
  { module_code: "IGA-ACCESS-CERTIFICATION", permission_name: "iga-access-certification:close_certification", tier: "workflow-gate", description: "Close a completed certification campaign." },
  // IGA-SOD-MGMT
  { module_code: "IGA-SOD-MGMT", permission_name: "iga-sod-mgmt:triage_violation", tier: "workflow-gate", description: "Triage a detected SoD violation." },
  { module_code: "IGA-SOD-MGMT", permission_name: "iga-sod-mgmt:close_violation", tier: "workflow-gate", description: "Mark an SoD violation as mitigated." },
  { module_code: "IGA-SOD-MGMT", permission_name: "iga-sod-mgmt:accept_risk", tier: "workflow-gate", description: "Record business acceptance of an SoD violation." },
  { module_code: "IGA-SOD-MGMT", permission_name: "iga-sod-mgmt:mark_false_positive", tier: "workflow-gate", description: "Mark an SoD violation as a false positive." },
  // IGA-ENTITLEMENT-CATALOG
  { module_code: "IGA-ENTITLEMENT-CATALOG", permission_name: "iga-entitlement-catalog:publish_entitlement", tier: "workflow-gate", description: "Publish a draft entitlement to the live catalog." },
  { module_code: "IGA-ENTITLEMENT-CATALOG", permission_name: "iga-entitlement-catalog:retire_entitlement", tier: "workflow-gate", description: "Retire a deprecated entitlement." },
  // IGA-AUTO-PROVISIONING
  { module_code: "IGA-AUTO-PROVISIONING", permission_name: "iga-auto-provisioning:rollback_provisioning", tier: "workflow-gate", description: "Roll back a previously executed provisioning event." },
];

async function phase10_permissions(modMap: Map<string, number>): Promise<Map<string, number>> {
  console.log("\n=== Phase 10: Permissions (baseline + workflow gates) ===");
  const allPerms: PermissionDraft[] = [];
  for (const m of newModules) {
    allPerms.push(...generateBaselinePerms(m.domain_module_code));
  }
  allPerms.push(...workflowGates);

  const rows = allPerms.map((p) => ({
    permission_name: p.permission_name,
    description: p.description,
    tier: p.tier,
    domain_module_id: modMap.get(p.module_code)!,
  }));
  const permMap = await syncByKey("/permissions", rows, "permission_name");
  return permMap;
}

// ============================================================================
// Phase 11: Roles
// ============================================================================

type RoleDraft = {
  role_code: string;
  role_name: string;
  description: string;
  business_function_name: string | null; // null = cross-functional (drop function prefix)
  modules: Array<{ module_code: string; interaction_level: "primary" | "secondary" }>;
  permissions: string[]; // permission_name list
};

const newRoles: RoleDraft[] = [
  {
    role_code: "IAM-IDENTITY-ADMIN",
    role_name: "Identity Administrator",
    description: "IGA platform owner. Full admin across all IGA modules; authoritative voice on entitlement catalog, certification cadence, and connector configuration.",
    business_function_name: "Identity and Access Management",
    modules: [
      { module_code: "IGA-ACCESS-REQUEST", interaction_level: "primary" },
      { module_code: "IGA-ACCESS-CERTIFICATION", interaction_level: "primary" },
      { module_code: "IGA-SOD-MGMT", interaction_level: "primary" },
      { module_code: "IGA-ENTITLEMENT-CATALOG", interaction_level: "primary" },
      { module_code: "IGA-AUTO-PROVISIONING", interaction_level: "primary" },
    ],
    permissions: [
      "iga-access-request:admin",
      "iga-access-certification:admin",
      "iga-sod-mgmt:admin",
      "iga-entitlement-catalog:admin",
      "iga-auto-provisioning:admin",
    ],
  },
  {
    role_code: "IAM-ACCESS-CERTIFIER",
    role_name: "Access Certifier",
    description: "Runs and tunes recertification campaigns. Reads entitlement catalog and provisioning state to scope campaigns; closes campaigns and produces evidence.",
    business_function_name: "Identity and Access Management",
    modules: [
      { module_code: "IGA-ACCESS-CERTIFICATION", interaction_level: "primary" },
      { module_code: "IGA-ENTITLEMENT-CATALOG", interaction_level: "secondary" },
      { module_code: "IGA-AUTO-PROVISIONING", interaction_level: "secondary" },
    ],
    permissions: [
      "iga-access-certification:manage",
      "iga-access-certification:schedule_certification",
      "iga-access-certification:close_certification",
      "iga-entitlement-catalog:read",
      "iga-auto-provisioning:read",
    ],
  },
  {
    role_code: "IAM-ACCESS-REQUEST-APPROVER",
    role_name: "Access Request Approver",
    description: "Application owner / line-of-business approver. Approves or rejects access requests for their entitlements; reads entitlement catalog and the SoD rule output.",
    business_function_name: "Identity and Access Management",
    modules: [
      { module_code: "IGA-ACCESS-REQUEST", interaction_level: "primary" },
      { module_code: "IGA-ENTITLEMENT-CATALOG", interaction_level: "secondary" },
      { module_code: "IGA-SOD-MGMT", interaction_level: "secondary" },
    ],
    permissions: [
      "iga-access-request:read",
      "iga-access-request:approve_access_request",
      "iga-access-request:reject_access_request",
      "iga-entitlement-catalog:read",
      "iga-sod-mgmt:read",
    ],
  },
  {
    role_code: "IAM-SOD-ANALYST",
    role_name: "SoD Analyst",
    description: "Triages and remediates SoD violations. Tunes the toxic-combination ruleset; reads entitlement catalog and provisioning events to chase mitigation paths.",
    business_function_name: "Identity and Access Management",
    modules: [
      { module_code: "IGA-SOD-MGMT", interaction_level: "primary" },
      { module_code: "IGA-ENTITLEMENT-CATALOG", interaction_level: "secondary" },
      { module_code: "IGA-AUTO-PROVISIONING", interaction_level: "secondary" },
    ],
    permissions: [
      "iga-sod-mgmt:manage",
      "iga-sod-mgmt:triage_violation",
      "iga-sod-mgmt:close_violation",
      "iga-sod-mgmt:accept_risk",
      "iga-sod-mgmt:mark_false_positive",
      "iga-entitlement-catalog:read",
      "iga-auto-provisioning:read",
    ],
  },
];

async function phase11_roles(modMap: Map<string, number>, permMap: Map<string, number>) {
  console.log("\n=== Phase 11: E1-E6 roles + role_modules + role_permissions ===");

  // Resolve business_function ids
  const fnNames = Array.from(new Set(newRoles.map((r) => r.business_function_name).filter((n): n is string => n !== null)));
  const fns = await get(`/business_functions?business_function_name=in.(${fnNames.map(encodeURIComponent).join(",")})&select=id,business_function_name`);
  const fnMap = new Map<string, number>();
  for (const r of fns) fnMap.set(String(r.business_function_name), Number(r.id));

  // Insert roles
  const roleRows = newRoles.map((r) => ({
    role_code: r.role_code,
    role_name: r.role_name,
    slug: slugify(r.role_code),
    description: r.description,
    origin: "model",
    business_function_id: r.business_function_name ? fnMap.get(r.business_function_name)! : null,
  }));
  const existingRoles = await get(`/roles?role_code=in.(${newRoles.map((r) => r.role_code).join(",")})&select=id,role_code`);
  const existingCodes = new Set(existingRoles.map((r) => String(r.role_code)));
  const missingRoles = roleRows.filter((r) => !existingCodes.has(String(r.role_code)));
  if (missingRoles.length > 0) {
    console.log(`  + ${missingRoles.length} new into /roles`);
    await insert("/roles", missingRoles);
  } else {
    console.log(`  = /roles: all present`);
  }
  const allRoles = await get(`/roles?role_code=in.(${newRoles.map((r) => r.role_code).join(",")})&select=id,role_code`);
  const roleMap = new Map<string, number>();
  for (const r of allRoles) roleMap.set(String(r.role_code), Number(r.id));

  // role_modules
  const rmRows: Row[] = [];
  for (const r of newRoles) {
    const rid = roleMap.get(r.role_code)!;
    for (const m of r.modules) {
      rmRows.push({
        role_id: rid,
        domain_module_id: modMap.get(m.module_code)!,
        interaction_level: m.interaction_level,
      });
    }
  }
  await syncJunction("/role_modules", rmRows, ["role_id", "domain_module_id"]);

  // role_permissions
  const rpRows: Row[] = [];
  for (const r of newRoles) {
    const rid = roleMap.get(r.role_code)!;
    for (const pname of r.permissions) {
      const pid = permMap.get(pname);
      if (!pid) throw new Error(`permission missing: ${pname}`);
      rpRows.push({ role_id: rid, permission_id: pid });
    }
  }
  await syncJunction("/role_permissions", rpRows, ["role_id", "permission_id"]);
}

// ============================================================================
// Phase 12: B10b backfill — derive source/target_domain_module_id on IGA handoffs
// ============================================================================

async function phase12_b10bBackfill() {
  console.log("\n=== Phase 12: B10b backfill (handoff module FKs for IGA-touching rows) ===");

  // Build a (domain_id, data_object_id) -> strongest-module map.
  // Strength: master > embedded_master > contributor > consumer > derived.
  const ROLE_STRENGTH: Record<string, number> = { master: 5, embedded_master: 4, contributor: 3, consumer: 2, derived: 1 };

  const dmoAll = await get(
    `/domain_module_data_objects?select=domain_module_id,data_object_id,role,domain_module:domain_modules(id,domain_id)`,
  );
  // Map: `${domain_id}:${data_object_id}` -> { module_id, role_strength }
  const bestMap = new Map<string, { module_id: number; strength: number }>();
  for (const row of dmoAll) {
    const mod = row.domain_module as { id: number; domain_id: number } | null;
    if (!mod) continue;
    const key = `${mod.domain_id}:${row.data_object_id}`;
    const strength = ROLE_STRENGTH[String(row.role)] ?? 0;
    const existing = bestMap.get(key);
    if (!existing || strength > existing.strength) {
      bestMap.set(key, { module_id: Number(row.domain_module_id), strength });
    }
  }

  // Outbound handoffs from IGA: derive source_domain_module_id via trigger_events.data_object_id
  const outbound = await get(
    `/handoffs?source_domain_id=eq.${IGA_DOMAIN_ID}&source_domain_module_id=is.null&select=id,target_domain_id,target_domain_module_id,data_object_id,trigger_event_id,trigger_events(data_object_id)`,
  );
  for (const h of outbound) {
    const te = h.trigger_events as { data_object_id: number } | null;
    const eventDoid = te ? te.data_object_id : (h.data_object_id as number);
    const sourceKey = `${IGA_DOMAIN_ID}:${eventDoid}`;
    const sourceBest = bestMap.get(sourceKey);
    const patchBody: Row = {};
    if (sourceBest) patchBody.source_domain_module_id = sourceBest.module_id;
    // Also try target backfill if NULL
    if (!h.target_domain_module_id) {
      const targetKey = `${h.target_domain_id}:${h.data_object_id}`;
      const targetBest = bestMap.get(targetKey);
      if (targetBest) patchBody.target_domain_module_id = targetBest.module_id;
    }
    if (Object.keys(patchBody).length === 0) {
      console.log(`  - outbound id=${h.id} unresolved (no IGA module masters event_doid=${eventDoid})`);
      continue;
    }
    await patch(`/handoffs?id=eq.${h.id}`, patchBody);
    console.log(`  PATCH outbound id=${h.id}: ${JSON.stringify(patchBody)}`);
  }

  // Inbound handoffs into IGA: derive target_domain_module_id via handoffs.data_object_id (the payload)
  const inbound = await get(
    `/handoffs?target_domain_id=eq.${IGA_DOMAIN_ID}&target_domain_module_id=is.null&select=id,source_domain_id,source_domain_module_id,data_object_id,trigger_event_id`,
  );
  for (const h of inbound) {
    const targetKey = `${IGA_DOMAIN_ID}:${h.data_object_id}`;
    const targetBest = bestMap.get(targetKey);
    if (!targetBest) {
      console.log(`  - inbound id=${h.id} unresolved (no IGA module declares any role on data_object_id=${h.data_object_id})`);
      continue;
    }
    await patch(`/handoffs?id=eq.${h.id}`, { target_domain_module_id: targetBest.module_id });
    console.log(`  PATCH inbound id=${h.id}: target_domain_module_id=${targetBest.module_id}`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("IGA full-scope loader starting...");
  await phase1_patchDomainBusinessLogic();
  const capMap = await phase2_capabilities();
  await phase3_vendorsAndSolutions();
  const modMap = await phase4_modules(capMap);
  await phase5_patternFlags();
  await phase6_aliases();
  await phase7_lifecycleStates(modMap);
  await phase8_relationships();
  await phase9_toolsAndSkills(modMap);
  const permMap = await phase10_permissions(modMap);
  await phase11_roles(modMap, permMap);
  await phase12_b10bBackfill();
  console.log("\nDone.");
}

await main();
