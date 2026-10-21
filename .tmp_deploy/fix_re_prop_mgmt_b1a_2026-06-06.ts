#!/usr/bin/env bun
// RE-PROP-MGMT (domain_id=144) b1a execution, 2026-06-06.
// Idempotent. Run from project root: bun run .tmp_deploy/fix_re_prop_mgmt_b1a_2026-06-06.ts
//
// Covers:
//   B1A-S11B-ALIASES      : data_object_aliases for rent_payments(360), tenant_maintenance_requests(361)
//   B1A-LIFECYCLE-STATES  : data_object_lifecycle_states for the 6 masters, with domain_module_id
//   B1A-HANDOFF-SOURCE-FK  : PATCH source_domain_module_id on outbound handoffs (B10b event-based)
//   B1A-INTRA-DOMAIN-RELS  : 7 intra-domain data_object_relationships (row 473 SKIPPED, user_decision)
//   B1A-CATALOG-UX         : catalog_tagline / catalog_description on domain 144 + modules 285/286/287
//   B1A-SYSTEM-SKILLS      : Phase S - 3 system skills + mutate tools + skill_tools, DELETE legacy skill 98
//
// record_status omitted on every insert (DB default 'new'). No `notes` column written (Rule #15).

import { } from "bun";

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const del = (path: string) => call({ method: "DELETE", path });

const MOD = { LEASING: 285, OPERATIONS: 286, FINANCIALS: 287 };
const DO = {
  rental_units: 357,
  property_tenants: 358,
  rental_applications: 359,
  rent_payments: 360,
  tenant_maintenance_requests: 361,
  rental_leases: 362,
};

async function main() {
  // ============================================================
  // B1A-S11B-ALIASES
  // ============================================================
  console.log("\n== B1A-S11B-ALIASES ==");
  const aliasSpecs = [
    { data_object_id: DO.rent_payments, alias_name: "Rent Charge", alias_type: "synonym", is_preferred: false },
    { data_object_id: DO.rent_payments, alias_name: "Payment", alias_type: "synonym", is_preferred: false },
    { data_object_id: DO.rent_payments, alias_name: "Receipt", alias_type: "synonym", is_preferred: false },
    { data_object_id: DO.tenant_maintenance_requests, alias_name: "Work Order", alias_type: "synonym", is_preferred: false },
    { data_object_id: DO.tenant_maintenance_requests, alias_name: "Maintenance Ticket", alias_type: "synonym", is_preferred: false },
    { data_object_id: DO.tenant_maintenance_requests, alias_name: "Service Request", alias_type: "synonym", is_preferred: false },
  ];
  {
    const existing = await get(
      `/data_object_aliases?data_object_id=in.(${DO.rent_payments},${DO.tenant_maintenance_requests})&select=data_object_id,alias_name`,
    );
    const have = new Set(existing.map(r => `${r.data_object_id}|${r.alias_name}`));
    const missing = aliasSpecs.filter(a => !have.has(`${a.data_object_id}|${a.alias_name}`));
    if (missing.length) await post("/data_object_aliases", missing);
    console.log(`  aliases: ${missing.length} inserted, ${existing.length} already present`);
  }

  // ============================================================
  // B1A-LIFECYCLE-STATES
  //   is_initial = first state; is_terminal = terminal/branch-end states.
  //   requires_permission = gated transitions (approval/sign/eviction/collection moves).
  //   domain_module_id = realizing module per the state.yaml mapping.
  // ============================================================
  console.log("\n== B1A-LIFECYCLE-STATES ==");
  type LS = {
    data_object_id: number; state_name: string; state_order: number;
    is_initial: boolean; is_terminal: boolean; requires_permission: boolean;
    permission_verb_override: string; domain_module_id: number;
  };
  const ls = (
    data_object_id: number, domain_module_id: number, state_name: string, state_order: number,
    opts: Partial<Pick<LS, "is_initial" | "is_terminal" | "requires_permission" | "permission_verb_override">> = {},
  ): LS => ({
    data_object_id, domain_module_id, state_name, state_order,
    is_initial: opts.is_initial ?? false,
    is_terminal: opts.is_terminal ?? false,
    requires_permission: opts.requires_permission ?? false,
    permission_verb_override: opts.permission_verb_override ?? "",
  });

  const lifecycleStates: LS[] = [
    // rental_units (286): vacant -> listed -> applied -> approved -> occupied -> vacating -> vacant
    ls(DO.rental_units, MOD.OPERATIONS, "vacant", 1, { is_initial: true }),
    ls(DO.rental_units, MOD.OPERATIONS, "listed", 2),
    ls(DO.rental_units, MOD.OPERATIONS, "applied", 3),
    ls(DO.rental_units, MOD.OPERATIONS, "approved", 4, { requires_permission: true, permission_verb_override: "approve_rental_unit" }),
    ls(DO.rental_units, MOD.OPERATIONS, "occupied", 5),
    ls(DO.rental_units, MOD.OPERATIONS, "vacating", 6),
    // rental_applications (285): draft -> submitted -> screening -> approved/declined -> withdrawn
    ls(DO.rental_applications, MOD.LEASING, "draft", 1, { is_initial: true }),
    ls(DO.rental_applications, MOD.LEASING, "submitted", 2),
    ls(DO.rental_applications, MOD.LEASING, "screening", 3),
    ls(DO.rental_applications, MOD.LEASING, "approved", 4, { requires_permission: true, permission_verb_override: "approve_rental_application" }),
    ls(DO.rental_applications, MOD.LEASING, "declined", 5, { is_terminal: true, requires_permission: true, permission_verb_override: "decline_rental_application" }),
    ls(DO.rental_applications, MOD.LEASING, "withdrawn", 6, { is_terminal: true }),
    // rental_leases (285): drafted -> sent -> signed -> active -> ending -> terminated -> renewed
    ls(DO.rental_leases, MOD.LEASING, "drafted", 1, { is_initial: true }),
    ls(DO.rental_leases, MOD.LEASING, "sent", 2),
    ls(DO.rental_leases, MOD.LEASING, "signed", 3, { requires_permission: true, permission_verb_override: "sign_rental_lease" }),
    ls(DO.rental_leases, MOD.LEASING, "active", 4),
    ls(DO.rental_leases, MOD.LEASING, "ending", 5),
    ls(DO.rental_leases, MOD.LEASING, "terminated", 6, { is_terminal: true, requires_permission: true, permission_verb_override: "terminate_rental_lease" }),
    ls(DO.rental_leases, MOD.LEASING, "renewed", 7, { is_terminal: true, requires_permission: true, permission_verb_override: "renew_rental_lease" }),
    // rent_payments (287): due -> received -> late -> delinquent -> in_collections
    ls(DO.rent_payments, MOD.FINANCIALS, "due", 1, { is_initial: true }),
    ls(DO.rent_payments, MOD.FINANCIALS, "received", 2, { is_terminal: true }),
    ls(DO.rent_payments, MOD.FINANCIALS, "late", 3),
    ls(DO.rent_payments, MOD.FINANCIALS, "delinquent", 4),
    ls(DO.rent_payments, MOD.FINANCIALS, "in_collections", 5, { is_terminal: true, requires_permission: true, permission_verb_override: "place_rent_payment_in_collections" }),
    // property_tenants (285): prospective -> current -> notice_given -> moved_out -> evicted
    ls(DO.property_tenants, MOD.LEASING, "prospective", 1, { is_initial: true }),
    ls(DO.property_tenants, MOD.LEASING, "current", 2),
    ls(DO.property_tenants, MOD.LEASING, "notice_given", 3),
    ls(DO.property_tenants, MOD.LEASING, "moved_out", 4, { is_terminal: true }),
    ls(DO.property_tenants, MOD.LEASING, "evicted", 5, { is_terminal: true, requires_permission: true, permission_verb_override: "evict_property_tenant" }),
    // tenant_maintenance_requests (286): submitted -> triaged -> assigned -> in_progress -> resolved -> closed
    ls(DO.tenant_maintenance_requests, MOD.OPERATIONS, "submitted", 1, { is_initial: true }),
    ls(DO.tenant_maintenance_requests, MOD.OPERATIONS, "triaged", 2),
    ls(DO.tenant_maintenance_requests, MOD.OPERATIONS, "assigned", 3),
    ls(DO.tenant_maintenance_requests, MOD.OPERATIONS, "in_progress", 4),
    ls(DO.tenant_maintenance_requests, MOD.OPERATIONS, "resolved", 5),
    ls(DO.tenant_maintenance_requests, MOD.OPERATIONS, "closed", 6, { is_terminal: true }),
  ];
  {
    const ids = [...new Set(lifecycleStates.map(s => s.data_object_id))].join(",");
    const existing = await get(
      `/data_object_lifecycle_states?data_object_id=in.(${ids})&select=data_object_id,state_name`,
    );
    const have = new Set(existing.map(r => `${r.data_object_id}|${r.state_name}`));
    const missing = lifecycleStates.filter(s => !have.has(`${s.data_object_id}|${s.state_name}`));
    if (missing.length) await post("/data_object_lifecycle_states", missing);
    console.log(`  lifecycle_states: ${missing.length} inserted, ${existing.length} already present`);
  }

  // ============================================================
  // B1A-HANDOFF-SOURCE-FK (PATCH)
  //   source_domain_module_id derived per B10b = module mastering the EVENT's data_object.
  //   298 ev rent_payment.received(360)->287 ; 299 ev maint.created(361)->286 ;
  //   300 ev tenant.evicted(358)->285 ; 301 ev rent_payment.received(360)->287 [B10b; item said 285] ;
  //   310 ev application.approved(359)->285 ; 864 ev rent_payment.received(360)->287 [B10b; item said 285] ;
  //   865 ev rental_unit.vacant(357)->286 .
  //   296 inbound target SKIPPED: no RE-PROP-MGMT module holds payload 353 (real_estate_transactions).
  // ============================================================
  console.log("\n== B1A-HANDOFF-SOURCE-FK ==");
  const handoffSource: Record<number, number> = {
    298: MOD.FINANCIALS, 299: MOD.OPERATIONS, 300: MOD.LEASING,
    301: MOD.FINANCIALS, 310: MOD.LEASING, 864: MOD.FINANCIALS, 865: MOD.OPERATIONS,
  };
  for (const [hid, modId] of Object.entries(handoffSource)) {
    await patch(`/handoffs?id=eq.${hid}`, { source_domain_module_id: modId });
    console.log(`  handoff ${hid}: source_domain_module_id = ${modId}`);
  }

  // ============================================================
  // B1A-INTRA-DOMAIN-RELS (7 edges; row 473 SKIPPED - user_decision PATCH-vs-DELETE)
  // ============================================================
  console.log("\n== B1A-INTRA-DOMAIN-RELS ==");
  type Rel = {
    data_object_id: number; related_data_object_id: number;
    relationship_type: string; relationship_kind: string;
    relationship_verb: string; inverse_verb: string;
    is_required: boolean; owner_side: string;
  };
  const rels: Rel[] = [
    // rental_units has-many rental_leases (unit is parent)
    { data_object_id: DO.rental_units, related_data_object_id: DO.rental_leases, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "has", inverse_verb: "covers", is_required: false, owner_side: "source" },
    // rental_applications results-in rental_leases (application is parent of the lease it produces)
    { data_object_id: DO.rental_applications, related_data_object_id: DO.rental_leases, relationship_type: "one_to_one", relationship_kind: "reference", relationship_verb: "results in", inverse_verb: "originates from", is_required: false, owner_side: "source" },
    // property_tenants signs rental_leases (tenant is parent / signer)
    { data_object_id: DO.property_tenants, related_data_object_id: DO.rental_leases, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "signs", inverse_verb: "is signed by", is_required: false, owner_side: "source" },
    // rental_leases generates rent_payments (lease is parent; payments compose under it)
    { data_object_id: DO.rental_leases, related_data_object_id: DO.rent_payments, relationship_type: "one_to_many", relationship_kind: "composition", relationship_verb: "generates", inverse_verb: "is generated by", is_required: false, owner_side: "source" },
    // rental_units receives tenant_maintenance_requests (unit is parent)
    { data_object_id: DO.rental_units, related_data_object_id: DO.tenant_maintenance_requests, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "receives", inverse_verb: "is raised against", is_required: false, owner_side: "source" },
    // property_tenants submits tenant_maintenance_requests (tenant is parent)
    { data_object_id: DO.property_tenants, related_data_object_id: DO.tenant_maintenance_requests, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "submits", inverse_verb: "is submitted by", is_required: false, owner_side: "source" },
    // rental_applications target rental_units (application is for a unit; unit is the parent -> owner_side target)
    { data_object_id: DO.rental_applications, related_data_object_id: DO.rental_units, relationship_type: "many_to_many", relationship_kind: "association", relationship_verb: "applies for", inverse_verb: "is applied for by", is_required: false, owner_side: "target" },
  ];
  {
    const existing = await get(
      `/data_object_relationships?and=(data_object_id.in.(357,358,359,360,361,362),related_data_object_id.in.(357,358,359,360,361,362))&select=data_object_id,related_data_object_id,relationship_verb`,
    );
    const have = new Set(existing.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`));
    const missing = rels.filter(r => !have.has(`${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`));
    if (missing.length) await post("/data_object_relationships", missing);
    console.log(`  intra-domain rels: ${missing.length} inserted, ${existing.length} pre-existing in-domain edges`);
  }

  // ============================================================
  // B1A-CATALOG-UX (write only where empty; never overwrite non-empty)
  // ============================================================
  console.log("\n== B1A-CATALOG-UX ==");
  const domainTagline =
    "Collect rent, screen tenants, dispatch maintenance, and account for each property, all in one residential-management platform.";
  const domainDescription =
    "Run a residential portfolio (single-family rentals, multifamily buildings, condo associations) end to end. Market vacant units to listing sites, screen applicants against credit, criminal, and eviction history, draft and sign leases, collect rent (with prorations, late fees, and security-deposit accounting), and handle maintenance requests with vendor or in-house teams. Per-property general ledger feeds owner distributions and investor reporting, with built-in compliance for the Fair Housing Act, FCRA-regulated screening, and state-by-state landlord-tenant statutes.";

  const moduleCopy: Record<number, { tagline: string; description: string }> = {
    [MOD.LEASING]: {
      tagline:
        "Turn vacant units into signed leases: market listings, screen applicants, and sign tenants in one pipeline.",
      description:
        "Move every prospect from first inquiry to move-in. Publish vacant units to listing sites, capture applications, and screen applicants against credit, criminal, and eviction history with the required adverse-action steps. Draft, send, and sign leases, then track each tenant from prospective through current, notice given, and move-out. Fair-housing-aware inquiry handling and FCRA-compliant screening are built into the flow.",
    },
    [MOD.OPERATIONS]: {
      tagline:
        "Keep the portfolio running: track every unit's status and resolve maintenance requests end to end.",
      description:
        "Manage the physical side of the portfolio. Hold the source-of-truth record for every rental unit and its availability, from vacant and listed through occupied and vacating. Take in maintenance requests from residents, triage and assign them, dispatch in-house or vendor crews, and follow each work order through to resolved and closed so nothing slips through the cracks.",
    },
    [MOD.FINANCIALS]: {
      tagline:
        "Collect rent, chase late balances, and keep the books straight for every property.",
      description:
        "Run the money side of the portfolio. Bill recurring rent and charges, take payments, and apply prorations, late fees, and deposits automatically. Track each payment from due through received, late, delinquent, and collections, and keep a per-property general ledger that feeds owner statements, distributions, and investor reporting. Vendor bills paid through accounts payable reconcile back to the property they belong to.",
    },
  };

  // Domain 144
  {
    const [row] = await get("/domains?id=eq.144&select=catalog_tagline,catalog_description");
    const body: Row = {};
    if (!row?.catalog_tagline) body.catalog_tagline = domainTagline;
    if (!row?.catalog_description) body.catalog_description = domainDescription;
    if (Object.keys(body).length) {
      await patch("/domains?id=eq.144", body);
      console.log(`  domain 144: wrote ${Object.keys(body).join(", ")}`);
    } else {
      console.log("  domain 144: both fields already non-empty, skipped");
    }
  }
  // Modules
  for (const [modId, copy] of Object.entries(moduleCopy)) {
    const [row] = await get(`/domain_modules?id=eq.${modId}&select=catalog_tagline,catalog_description`);
    const body: Row = {};
    if (!row?.catalog_tagline) body.catalog_tagline = copy.tagline;
    if (!row?.catalog_description) body.catalog_description = copy.description;
    if (Object.keys(body).length) {
      await patch(`/domain_modules?id=eq.${modId}`, body);
      console.log(`  module ${modId}: wrote ${Object.keys(body).join(", ")}`);
    } else {
      console.log(`  module ${modId}: both fields already non-empty, skipped`);
    }
  }

  // ============================================================
  // B1A-SYSTEM-SKILLS (Phase S)
  //   3 system skills (one per module). Reuse existing query tools (658-663),
  //   notify_person (913), sign_document (42). Create module mutate tools.
  //   Then DELETE legacy skill 98 (its skill_tools cascade).
  // ============================================================
  console.log("\n== B1A-SYSTEM-SKILLS (Phase S) ==");

  // 1) Create mutate tools (idempotent by tool_name). query/mutate REQUIRE data_object_id.
  //    coverage_tier defaults to 'external'; internal mutate tools are platform-covered
  //    (delivered by CRUD + cube), so set 'platform' explicitly to keep the Semantius score correct.
  const mutateToolSpecs = [
    // LEASING masters: rental_applications(359), rental_leases(362), property_tenants(358)
    { tool_name: "create_rental_application", operation_kind: "mutate", data_object_id: DO.rental_applications, coverage_tier: "platform", description: "Create a new rental application." },
    { tool_name: "approve_rental_application", operation_kind: "mutate", data_object_id: DO.rental_applications, coverage_tier: "platform", description: "Approve or decline a screened rental application." },
    { tool_name: "create_rental_lease", operation_kind: "mutate", data_object_id: DO.rental_leases, coverage_tier: "platform", description: "Draft a new rental lease." },
    { tool_name: "update_rental_lease", operation_kind: "mutate", data_object_id: DO.rental_leases, coverage_tier: "platform", description: "Update or advance a rental lease through its lifecycle." },
    { tool_name: "update_property_tenant", operation_kind: "mutate", data_object_id: DO.property_tenants, coverage_tier: "platform", description: "Update a tenant record or advance its tenancy state." },
    // OPERATIONS masters: rental_units(357), tenant_maintenance_requests(361)
    { tool_name: "update_rental_unit", operation_kind: "mutate", data_object_id: DO.rental_units, coverage_tier: "platform", description: "Update a rental unit record or its availability state." },
    { tool_name: "create_tenant_maintenance_request", operation_kind: "mutate", data_object_id: DO.tenant_maintenance_requests, coverage_tier: "platform", description: "Create a tenant maintenance request." },
    { tool_name: "assign_tenant_maintenance_request", operation_kind: "mutate", data_object_id: DO.tenant_maintenance_requests, coverage_tier: "platform", description: "Triage and assign a maintenance request to a crew or vendor." },
    // FINANCIALS masters: rent_payments(360)
    { tool_name: "create_rent_payment", operation_kind: "mutate", data_object_id: DO.rent_payments, coverage_tier: "platform", description: "Record a rent charge or payment." },
    { tool_name: "update_rent_payment", operation_kind: "mutate", data_object_id: DO.rent_payments, coverage_tier: "platform", description: "Update a rent payment or advance its collection state." },
  ];
  {
    const names = mutateToolSpecs.map(t => t.tool_name).join(",");
    const existing = await get(`/tools?tool_name=in.(${names})&select=tool_name`);
    const have = new Set(existing.map(r => String(r.tool_name)));
    const missing = mutateToolSpecs.filter(t => !have.has(t.tool_name));
    if (missing.length) await post("/tools", missing);
    console.log(`  mutate tools: ${missing.length} inserted, ${existing.length} already present`);
  }

  // Build tool_name -> id map for everything we link.
  const allLinkedNames = [
    "query_rental_units", "query_tenants", "query_rental_applications",
    "query_rent_payments", "query_tenant_maintenance_requests", "query_rental_leases",
    "notify_person", "sign_document",
    ...mutateToolSpecs.map(t => t.tool_name),
  ];
  const toolRows = await get(`/tools?tool_name=in.(${allLinkedNames.join(",")})&select=id,tool_name`);
  const toolId = new Map<string, number>();
  for (const r of toolRows) toolId.set(String(r.tool_name), Number(r.id));
  const tid = (name: string): number => {
    const v = toolId.get(name);
    if (v === undefined) throw new Error(`tool not found: ${name}`);
    return v;
  };

  // 2) Create the 3 system skills (idempotent by skill_name).
  // domain_id=144 is required by the legacy `domain_required_when_skill_type_is_system`
  // platform rule even for module-anchored system skills; set both (per module-shape.md).
  const skillSpecs = [
    { skill_name: "re-prop-mgmt-leasing_agent", skill_type: "system", domain_module_id: MOD.LEASING, domain_id: 144, description: "System skill for the Residential Leasing and Screening module: manage applications, screening, leases, and tenancy lifecycle." },
    { skill_name: "re-prop-mgmt-operations_agent", skill_type: "system", domain_module_id: MOD.OPERATIONS, domain_id: 144, description: "System skill for the Unit Inventory and Maintenance module: manage rental-unit availability and the maintenance-request lifecycle." },
    { skill_name: "re-prop-mgmt-financials_agent", skill_type: "system", domain_module_id: MOD.FINANCIALS, domain_id: 144, description: "System skill for the Rent Collection and Property Accounting module: bill and collect rent, track delinquency, and reconcile property accounting." },
  ];
  {
    const names = skillSpecs.map(s => s.skill_name).join(",");
    const existing = await get(`/skills?skill_name=in.(${names})&select=skill_name`);
    const have = new Set(existing.map(r => String(r.skill_name)));
    const missing = skillSpecs.filter(s => !have.has(s.skill_name));
    if (missing.length) await post("/skills", missing);
    console.log(`  system skills: ${missing.length} inserted, ${existing.length} already present`);
  }
  const skillRows = await get(
    `/skills?skill_name=in.(${skillSpecs.map(s => s.skill_name).join(",")})&select=id,skill_name`,
  );
  const skillId = new Map<string, number>();
  for (const r of skillRows) skillId.set(String(r.skill_name), Number(r.id));

  // 3) skill_tools per module (three-source derivation: masters query+mutate required;
  //    cross-cutting externals as needed). No `notes` written (Rule #15).
  type ST = { skill_id: number; tool_id: number; requirement_level: string };
  const st = (skill: string, tool: string, req: "required" | "optional"): ST => ({
    skill_id: skillId.get(skill)!, tool_id: tid(tool), requirement_level: req,
  });
  const skillTools: ST[] = [
    // LEASING
    st("re-prop-mgmt-leasing_agent", "query_rental_applications", "required"),
    st("re-prop-mgmt-leasing_agent", "create_rental_application", "required"),
    st("re-prop-mgmt-leasing_agent", "approve_rental_application", "required"),
    st("re-prop-mgmt-leasing_agent", "query_rental_leases", "required"),
    st("re-prop-mgmt-leasing_agent", "create_rental_lease", "required"),
    st("re-prop-mgmt-leasing_agent", "update_rental_lease", "required"),
    st("re-prop-mgmt-leasing_agent", "query_tenants", "required"),
    st("re-prop-mgmt-leasing_agent", "update_property_tenant", "required"),
    st("re-prop-mgmt-leasing_agent", "query_rental_units", "required"),
    st("re-prop-mgmt-leasing_agent", "sign_document", "required"),
    st("re-prop-mgmt-leasing_agent", "notify_person", "optional"),
    // OPERATIONS
    st("re-prop-mgmt-operations_agent", "query_rental_units", "required"),
    st("re-prop-mgmt-operations_agent", "update_rental_unit", "required"),
    st("re-prop-mgmt-operations_agent", "query_tenant_maintenance_requests", "required"),
    st("re-prop-mgmt-operations_agent", "create_tenant_maintenance_request", "required"),
    st("re-prop-mgmt-operations_agent", "assign_tenant_maintenance_request", "required"),
    st("re-prop-mgmt-operations_agent", "notify_person", "optional"),
    // FINANCIALS
    st("re-prop-mgmt-financials_agent", "query_rent_payments", "required"),
    st("re-prop-mgmt-financials_agent", "create_rent_payment", "required"),
    st("re-prop-mgmt-financials_agent", "update_rent_payment", "required"),
    st("re-prop-mgmt-financials_agent", "query_rental_leases", "required"),
    st("re-prop-mgmt-financials_agent", "notify_person", "optional"),
  ];
  {
    const skillIds = [...skillId.values()].join(",");
    const existing = await get(`/skill_tools?skill_id=in.(${skillIds})&select=skill_id,tool_id`);
    const have = new Set(existing.map(r => `${r.skill_id}|${r.tool_id}`));
    const missing = skillTools.filter(s => !have.has(`${s.skill_id}|${s.tool_id}`));
    if (missing.length) await post("/skill_tools", missing);
    console.log(`  skill_tools: ${missing.length} inserted, ${existing.length} already present`);
  }

  // 4) DELETE legacy skill 98 (only after the three replacements exist).
  {
    const replacements = await get(
      `/skills?domain_module_id=in.(285,286,287)&skill_type=eq.system&select=domain_module_id`,
    );
    const covered = new Set(replacements.map(r => Number(r.domain_module_id)));
    const allThree = [285, 286, 287].every(m => covered.has(m));
    const [legacy] = await get("/skills?id=eq.98&select=id");
    if (!legacy) {
      console.log("  legacy skill 98: already deleted");
    } else if (!allThree) {
      throw new Error("Refusing to delete skill 98: not all three module system skills exist yet.");
    } else {
      await del("/skill_tools?skill_id=eq.98"); // explicit; FK cascade also covers this
      await del("/skills?id=eq.98");
      console.log("  legacy skill 98: DELETED (after 3 replacements confirmed)");
    }
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
