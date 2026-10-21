#!/usr/bin/env bun
// Phase C + E + S loader for Library Management.
// C: business_function_domains, business_function_capabilities
// E: roles, role_modules, role_permissions
// S: skills, tools, skill_tools
// Idempotent.

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

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function syncByKey<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// Phase C: business_function_domains
// ============================================================

const businessFunctionDomains: Array<{ function: string; responsibility_type: "owner" | "contributor" | "consumer" }> = [
  { function: "Research and Development", responsibility_type: "owner" },
  { function: "Learning and Development", responsibility_type: "contributor" },
];

// ============================================================
// Phase E: roles + role_modules + role_permissions
// ============================================================

type RoleSpec = {
  role_code: string;
  role_name: string;
  description: string;
  business_function: string | null; // null = cross-functional
  modules: Array<{ module: string; interaction_level: "primary" | "secondary" }>;
  // Permissions bundle: list of permission_name strings.
  // Use the per-module pattern `<module-code-lower>:<tier>` (read / manage / admin).
  permissions: string[];
};

const roles: RoleSpec[] = [
  {
    role_code: "RESEARCH-DEV-CIRCULATION-CLERK",
    role_name: "Library Circulation Clerk",
    description:
      "Frontline library staff handling check-out, check-in, holds, fines, and patron account questions. Touches circulation and patron modules daily.",
    business_function: "Research and Development",
    modules: [
      { module: "LIB-CIRCULATION", interaction_level: "primary" },
      { module: "LIB-PATRON", interaction_level: "primary" },
      { module: "LIB-DISCOVERY", interaction_level: "secondary" },
    ],
    permissions: ["lib-circulation:manage", "lib-patron:manage", "lib-discovery:read"],
  },
  {
    role_code: "RESEARCH-DEV-CATALOGER",
    role_name: "Cataloger and Metadata Librarian",
    description:
      "Authors and maintains bibliographic, authority, and holdings records. Manages metadata quality, classification, and authority control.",
    business_function: "Research and Development",
    modules: [
      { module: "LIB-CATALOG", interaction_level: "primary" },
      { module: "LIB-ACQUISITIONS", interaction_level: "secondary" },
    ],
    permissions: ["lib-catalog:admin", "lib-acquisitions:read"],
  },
  {
    role_code: "RESEARCH-DEV-ACQUISITIONS-LIBRARIAN",
    role_name: "Acquisitions Librarian",
    description:
      "Manages collection development: orders materials from vendors, renews subscriptions, negotiates e-resource licenses, and coordinates receipt with cataloging.",
    business_function: "Research and Development",
    modules: [
      { module: "LIB-ACQUISITIONS", interaction_level: "primary" },
      { module: "LIB-CATALOG", interaction_level: "secondary" },
      { module: "LIB-DISCOVERY", interaction_level: "secondary" },
    ],
    permissions: ["lib-acquisitions:manage", "lib-catalog:manage", "lib-discovery:read"],
  },
  {
    role_code: "RESEARCH-DEV-REFERENCE-LIBRARIAN",
    role_name: "Reference and ILL Librarian",
    description:
      "Assists patrons with research, manages discovery configuration, coordinates interlibrary loan requests, and supports circulation when needed.",
    business_function: "Research and Development",
    modules: [
      { module: "LIB-DISCOVERY", interaction_level: "primary" },
      { module: "LIB-ILL", interaction_level: "primary" },
      { module: "LIB-PATRON", interaction_level: "secondary" },
      { module: "LIB-CIRCULATION", interaction_level: "secondary" },
    ],
    permissions: ["lib-discovery:manage", "lib-ill:manage", "lib-patron:read", "lib-circulation:read"],
  },
  {
    role_code: "RESEARCH-DEV-LIBRARY-DIRECTOR",
    role_name: "Library Director",
    description:
      "Head of the library operation; admin authority across cataloging, circulation, patron, acquisitions, discovery, and interlibrary loan.",
    business_function: "Research and Development",
    modules: [
      { module: "LIB-CATALOG", interaction_level: "primary" },
      { module: "LIB-CIRCULATION", interaction_level: "primary" },
      { module: "LIB-PATRON", interaction_level: "primary" },
      { module: "LIB-ACQUISITIONS", interaction_level: "primary" },
      { module: "LIB-DISCOVERY", interaction_level: "primary" },
      { module: "LIB-ILL", interaction_level: "primary" },
    ],
    permissions: [
      "lib-catalog:admin",
      "lib-circulation:admin",
      "lib-patron:admin",
      "lib-acquisitions:admin",
      "lib-discovery:admin",
      "lib-ill:admin",
    ],
  },
];

// ============================================================
// Phase S: skills + tools + skill_tools
// ============================================================

type ToolSpec = {
  tool_name: string;
  description: string;
  operation_kind: "query" | "mutate" | "side_effect" | "compute" | "inbound";
  coverage_tier: "platform" | "external" | "integration";
  data_object?: string; // only when query / mutate
};

const tools: ToolSpec[] = [
  // Queries (one per master data_object)
  { tool_name: "query_bibliographic_records", description: "Query bibliographic records by title, author, ISBN, subject, or identifier.", operation_kind: "query", coverage_tier: "platform", data_object: "bibliographic_records" },
  { tool_name: "query_library_items", description: "Query library items by barcode, status, location, or owning bibliographic record.", operation_kind: "query", coverage_tier: "platform", data_object: "library_items" },
  { tool_name: "query_library_authorities", description: "Query authority records by heading, type, or external identifier.", operation_kind: "query", coverage_tier: "platform", data_object: "library_authorities" },
  { tool_name: "query_library_holdings", description: "Query holdings records by bibliographic record and location.", operation_kind: "query", coverage_tier: "platform", data_object: "library_holdings" },
  { tool_name: "query_library_loans", description: "Query loans by patron, item, status, or due-date range.", operation_kind: "query", coverage_tier: "platform", data_object: "library_loans" },
  { tool_name: "query_library_holds", description: "Query holds by patron, bibliographic record, queue position, or status.", operation_kind: "query", coverage_tier: "platform", data_object: "library_holds" },
  { tool_name: "query_library_fines", description: "Query fines by patron, status, amount, or assessment date.", operation_kind: "query", coverage_tier: "platform", data_object: "library_fines" },
  { tool_name: "query_library_circulation_policies", description: "Query circulation policies by item type and patron category.", operation_kind: "query", coverage_tier: "platform", data_object: "library_circulation_policies" },
  { tool_name: "query_library_patrons", description: "Query patrons by name, card number, email, or category.", operation_kind: "query", coverage_tier: "platform", data_object: "library_patrons" },
  { tool_name: "query_library_patron_categories", description: "Query patron categories and their associated privileges.", operation_kind: "query", coverage_tier: "platform", data_object: "library_patron_categories" },
  { tool_name: "query_library_acquisition_orders", description: "Query acquisition orders by vendor, status, fund, or date.", operation_kind: "query", coverage_tier: "platform", data_object: "library_acquisition_orders" },
  { tool_name: "query_library_vendor_accounts", description: "Query library vendor accounts by name or status.", operation_kind: "query", coverage_tier: "platform", data_object: "library_vendor_accounts" },
  { tool_name: "query_library_serial_subscriptions", description: "Query serial subscriptions by vendor, title, or renewal status.", operation_kind: "query", coverage_tier: "platform", data_object: "library_serial_subscriptions" },
  { tool_name: "query_library_eresource_licenses", description: "Query e-resource licenses by vendor, resource, or expiry window.", operation_kind: "query", coverage_tier: "platform", data_object: "library_eresource_licenses" },
  { tool_name: "query_library_saved_searches", description: "Query patron-owned saved searches.", operation_kind: "query", coverage_tier: "platform", data_object: "library_saved_searches" },
  { tool_name: "query_interlibrary_loan_requests", description: "Query ILL requests by patron, status, or partner library.", operation_kind: "query", coverage_tier: "platform", data_object: "interlibrary_loan_requests" },
  { tool_name: "query_library_sharing_partners", description: "Query resource sharing partner libraries.", operation_kind: "query", coverage_tier: "platform", data_object: "library_sharing_partners" },

  // Catalog mutates
  { tool_name: "create_bibliographic_record", description: "Create a new bibliographic record.", operation_kind: "mutate", coverage_tier: "platform", data_object: "bibliographic_records" },
  { tool_name: "publish_bibliographic_record", description: "Publish a bibliographic record so it appears in discovery.", operation_kind: "mutate", coverage_tier: "platform", data_object: "bibliographic_records" },
  { tool_name: "create_library_item", description: "Create a new copy of a library item linked to a bibliographic record.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_items" },
  { tool_name: "activate_library_item", description: "Activate a library item making it circulable.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_items" },
  { tool_name: "withdraw_library_item", description: "Withdraw a library item permanently from the collection.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_items" },
  { tool_name: "establish_library_authority", description: "Establish an authority record so it can be used in bibliographic headings.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_authorities" },

  // Circulation mutates
  { tool_name: "create_library_loan", description: "Check out a library item to a patron, creating a loan record.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_loans" },
  { tool_name: "renew_library_loan", description: "Renew an active loan, extending the due date per circulation policy.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_loans" },
  { tool_name: "return_library_loan", description: "Return a checked-out item and discharge the loan.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_loans" },
  { tool_name: "declare_library_loan_lost", description: "Declare a loan lost and trigger replacement charges.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_loans" },
  { tool_name: "create_library_hold", description: "Place a hold on a bibliographic record or item for a patron.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_holds" },
  { tool_name: "trap_library_hold", description: "Trap an item for a pending hold during check-in.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_holds" },
  { tool_name: "mark_library_hold_ready", description: "Mark a trapped hold as ready for patron pickup.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_holds" },
  { tool_name: "fulfill_library_hold", description: "Fulfill a hold when the patron picks up the item.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_holds" },
  { tool_name: "cancel_library_hold", description: "Cancel a hold by patron or staff request.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_holds" },
  { tool_name: "assess_library_fine", description: "Assess a fine against a patron account for an overdue, lost, or damaged item.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_fines" },
  { tool_name: "waive_library_fine", description: "Waive a previously assessed library fine.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_fines" },
  { tool_name: "mark_library_fine_paid", description: "Record payment against a library fine.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_fines" },

  // Patron mutates
  { tool_name: "create_library_patron", description: "Register a new library patron.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_patrons" },
  { tool_name: "activate_library_patron", description: "Activate a registered patron, granting borrowing privileges.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_patrons" },
  { tool_name: "suspend_library_patron", description: "Suspend a patron's borrowing privileges due to fines, lost items, or policy violations.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_patrons" },
  { tool_name: "archive_library_patron", description: "Archive a library patron account.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_patrons" },

  // Acquisitions mutates
  { tool_name: "create_library_acquisition_order", description: "Create a new acquisition order for library materials.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_acquisition_orders" },
  { tool_name: "submit_library_acquisition_order", description: "Submit a drafted acquisition order to the vendor.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_acquisition_orders" },
  { tool_name: "receive_library_acquisition_order", description: "Mark an acquisition order as fully received.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_acquisition_orders" },
  { tool_name: "cancel_library_acquisition_order", description: "Cancel an acquisition order before fulfillment.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_acquisition_orders" },
  { tool_name: "renew_library_serial_subscription", description: "Renew a serial subscription for the next term.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_serial_subscriptions" },
  { tool_name: "cancel_library_serial_subscription", description: "Cancel an active serial subscription.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_serial_subscriptions" },
  { tool_name: "activate_library_eresource_license", description: "Activate an e-resource license, making the resource accessible to authorized users.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_eresource_licenses" },
  { tool_name: "renew_library_eresource_license", description: "Renew an active e-resource license for the next term.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_eresource_licenses" },
  { tool_name: "terminate_library_eresource_license", description: "Terminate an e-resource license before the natural expiry.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_eresource_licenses" },

  // Discovery
  { tool_name: "create_library_saved_search", description: "Save a search or reading list for a patron.", operation_kind: "mutate", coverage_tier: "platform", data_object: "library_saved_searches" },

  // ILL
  { tool_name: "create_interlibrary_loan_request", description: "Create an interlibrary loan request.", operation_kind: "mutate", coverage_tier: "platform", data_object: "interlibrary_loan_requests" },
  { tool_name: "route_interlibrary_loan_request", description: "Route an ILL request to a potential lending partner.", operation_kind: "mutate", coverage_tier: "platform", data_object: "interlibrary_loan_requests" },
  { tool_name: "accept_interlibrary_loan_request", description: "Accept an incoming ILL request (lending direction).", operation_kind: "mutate", coverage_tier: "platform", data_object: "interlibrary_loan_requests" },
  { tool_name: "ship_interlibrary_loan_request", description: "Ship the requested item to the borrowing library.", operation_kind: "mutate", coverage_tier: "platform", data_object: "interlibrary_loan_requests" },
  { tool_name: "complete_interlibrary_loan_request", description: "Close an ILL request after the item is returned to the lender.", operation_kind: "mutate", coverage_tier: "platform", data_object: "interlibrary_loan_requests" },
];

type SkillSpec = {
  skill_name: string;
  module: string;
  description: string;
  tools: Array<{ tool: string; requirement: "required" | "optional" }>;
};

const skills: SkillSpec[] = [
  {
    skill_name: "lib-catalog-system",
    module: "LIB-CATALOG",
    description:
      "Agent capability for managing the library catalog: bibliographic records, library items, authority control, and holdings.",
    tools: [
      { tool: "query_bibliographic_records", requirement: "required" },
      { tool: "create_bibliographic_record", requirement: "required" },
      { tool: "publish_bibliographic_record", requirement: "required" },
      { tool: "query_library_items", requirement: "required" },
      { tool: "create_library_item", requirement: "required" },
      { tool: "activate_library_item", requirement: "required" },
      { tool: "withdraw_library_item", requirement: "optional" },
      { tool: "query_library_authorities", requirement: "required" },
      { tool: "establish_library_authority", requirement: "required" },
      { tool: "query_library_holdings", requirement: "required" },
    ],
  },
  {
    skill_name: "lib-circulation-system",
    module: "LIB-CIRCULATION",
    description:
      "Agent capability for daily circulation: check-out, check-in, holds, renewals, and fines.",
    tools: [
      { tool: "query_library_loans", requirement: "required" },
      { tool: "create_library_loan", requirement: "required" },
      { tool: "renew_library_loan", requirement: "required" },
      { tool: "return_library_loan", requirement: "required" },
      { tool: "declare_library_loan_lost", requirement: "optional" },
      { tool: "query_library_holds", requirement: "required" },
      { tool: "create_library_hold", requirement: "required" },
      { tool: "trap_library_hold", requirement: "required" },
      { tool: "mark_library_hold_ready", requirement: "required" },
      { tool: "fulfill_library_hold", requirement: "required" },
      { tool: "cancel_library_hold", requirement: "optional" },
      { tool: "query_library_fines", requirement: "required" },
      { tool: "assess_library_fine", requirement: "required" },
      { tool: "waive_library_fine", requirement: "optional" },
      { tool: "mark_library_fine_paid", requirement: "required" },
      { tool: "query_library_circulation_policies", requirement: "required" },
      { tool: "query_library_patrons", requirement: "required" },
      { tool: "notify_person", requirement: "required" }, // overdue / hold-ready notifications
    ],
  },
  {
    skill_name: "lib-patron-system",
    module: "LIB-PATRON",
    description:
      "Agent capability for patron registration, profile maintenance, and account administration.",
    tools: [
      { tool: "query_library_patrons", requirement: "required" },
      { tool: "create_library_patron", requirement: "required" },
      { tool: "activate_library_patron", requirement: "required" },
      { tool: "suspend_library_patron", requirement: "optional" },
      { tool: "archive_library_patron", requirement: "optional" },
      { tool: "query_library_patron_categories", requirement: "required" },
      { tool: "query_library_loans", requirement: "optional" }, // history view
      { tool: "query_library_fines", requirement: "optional" }, // account view
      { tool: "notify_person", requirement: "optional" },
    ],
  },
  {
    skill_name: "lib-acquisitions-system",
    module: "LIB-ACQUISITIONS",
    description:
      "Agent capability for collection development: ordering, receiving, serials, and e-resource licensing.",
    tools: [
      { tool: "query_library_acquisition_orders", requirement: "required" },
      { tool: "create_library_acquisition_order", requirement: "required" },
      { tool: "submit_library_acquisition_order", requirement: "required" },
      { tool: "receive_library_acquisition_order", requirement: "required" },
      { tool: "cancel_library_acquisition_order", requirement: "optional" },
      { tool: "query_library_vendor_accounts", requirement: "required" },
      { tool: "query_library_serial_subscriptions", requirement: "required" },
      { tool: "renew_library_serial_subscription", requirement: "required" },
      { tool: "cancel_library_serial_subscription", requirement: "optional" },
      { tool: "query_library_eresource_licenses", requirement: "required" },
      { tool: "activate_library_eresource_license", requirement: "required" },
      { tool: "renew_library_eresource_license", requirement: "required" },
      { tool: "terminate_library_eresource_license", requirement: "optional" },
      { tool: "query_bibliographic_records", requirement: "required" },
      { tool: "create_bibliographic_record", requirement: "optional" }, // bib stub on order
      { tool: "create_library_item", requirement: "required" }, // item on receipt
    ],
  },
  {
    skill_name: "lib-discovery-system",
    module: "LIB-DISCOVERY",
    description:
      "Agent capability for the public discovery interface: search, browse, saved searches, and hold-placement.",
    tools: [
      { tool: "query_bibliographic_records", requirement: "required" },
      { tool: "query_library_holdings", requirement: "required" },
      { tool: "query_library_items", requirement: "required" },
      { tool: "query_library_authorities", requirement: "optional" },
      { tool: "query_library_saved_searches", requirement: "required" },
      { tool: "create_library_saved_search", requirement: "required" },
      { tool: "create_library_hold", requirement: "required" }, // patron-placed via OPAC
      { tool: "query_library_holds", requirement: "required" },
    ],
  },
  {
    skill_name: "lib-ill-system",
    module: "LIB-ILL",
    description:
      "Agent capability for interlibrary loan: borrowing and lending workflow, partner routing.",
    tools: [
      { tool: "query_interlibrary_loan_requests", requirement: "required" },
      { tool: "create_interlibrary_loan_request", requirement: "required" },
      { tool: "route_interlibrary_loan_request", requirement: "required" },
      { tool: "accept_interlibrary_loan_request", requirement: "required" },
      { tool: "ship_interlibrary_loan_request", requirement: "required" },
      { tool: "complete_interlibrary_loan_request", requirement: "required" },
      { tool: "query_library_sharing_partners", requirement: "required" },
      { tool: "query_library_patrons", requirement: "required" },
      { tool: "query_bibliographic_records", requirement: "required" },
      { tool: "create_library_loan", requirement: "optional" }, // on receipt of borrowed item
      { tool: "notify_person", requirement: "required" }, // ILL status to patron
    ],
  },
];

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log("=== Phase C+E+S: LIB-MGMT ===\n");

  // Resolve domain + modules + business functions + data_objects
  const [domain] = await get("/domains?domain_code=eq.LIB-MGMT&select=id");
  if (!domain) throw new Error("LIB-MGMT not found; run Phase A first.");
  const domainId = Number(domain.id);

  const moduleRows = await get(
    `/domain_modules?domain_id=eq.${domainId}&select=id,domain_module_code`,
  );
  const modMap = new Map<string, number>();
  for (const r of moduleRows) modMap.set(String(r.domain_module_code), Number(r.id));

  const bfRows = await get(
    "/business_functions?select=id,business_function_name&limit=10000",
  );
  const bfMap = new Map<string, number>();
  for (const r of bfRows) bfMap.set(String(r.business_function_name), Number(r.id));

  // ============================================================
  // Phase C
  // ============================================================
  console.log("Step 1: business_function_domains");
  const existingBfd = await get(
    `/business_function_domains?domain_id=eq.${domainId}&select=business_function_id`,
  );
  const haveBfd = new Set(existingBfd.map(r => Number(r.business_function_id)));
  const bfdPayload = businessFunctionDomains
    .map(r => {
      const bfid = bfMap.get(r.function);
      if (!bfid) throw new Error(`Unknown business_function: ${r.function}`);
      return {
        business_function_id: bfid,
        domain_id: domainId,
        responsibility_type: r.responsibility_type,
      };
    })
    .filter(r => !haveBfd.has(r.business_function_id));
  if (bfdPayload.length > 0) {
    await insert("/business_function_domains", bfdPayload);
    console.log(`  inserted ${bfdPayload.length} business_function_domains rows`);
  } else {
    console.log("  all business_function_domains already present");
  }

  // ============================================================
  // Phase E.1 — permissions (3 baseline tiers per module)
  // ============================================================
  console.log("\nStep 2: permissions (baseline tiers per module)");
  const tiers: Array<{ tier: "baseline-read" | "baseline-manage" | "baseline-admin"; suffix: string }> = [
    { tier: "baseline-read", suffix: "read" },
    { tier: "baseline-manage", suffix: "manage" },
    { tier: "baseline-admin", suffix: "admin" },
  ];
  const permissionPayload: Array<Row> = [];
  for (const [code, modId] of modMap) {
    for (const t of tiers) {
      permissionPayload.push({
        permission_name: `${code.toLowerCase()}:${t.suffix}`,
        description: `${t.suffix.toUpperCase()} permission for ${code}`,
        module_id: 1001,
        domain_module_id: modId,
        tier: t.tier,
      });
    }
  }
  const permMap = await syncByKey("/permissions", permissionPayload, "permission_name");

  // ============================================================
  // Phase E.2 — roles
  // ============================================================
  console.log("\nStep 3: roles");
  const slugify = (s: string): string => s.toLowerCase().replace(/-/g, "_");
  const rolePayload = roles.map(r => {
    const bfid = r.business_function ? bfMap.get(r.business_function) : null;
    if (r.business_function && !bfid)
      throw new Error(`Unknown business_function: ${r.business_function}`);
    return {
      role_code: r.role_code,
      role_name: r.role_name,
      slug: slugify(r.role_code),
      description: r.description,
      business_function_id: bfid,
      module_id: 1001,
      origin: "model_master",
    };
  });
  const roleMap = await syncByKey("/roles", rolePayload, "role_code");

  // ============================================================
  // Phase E.3 — role_modules
  // ============================================================
  console.log("\nStep 4: role_modules");
  const allRoleIds = [...roleMap.values()];
  const existingRm = await get(
    `/role_modules?role_id=in.(${allRoleIds.join(",")})&select=role_id,domain_module_id`,
  );
  const haveRm = new Set(existingRm.map(r => `${r.role_id}|${r.domain_module_id}`));
  const rmPayload: Row[] = [];
  for (const r of roles) {
    const roleId = roleMap.get(r.role_code)!;
    for (const m of r.modules) {
      const modId = modMap.get(m.module)!;
      if (!haveRm.has(`${roleId}|${modId}`)) {
        rmPayload.push({
          role_id: roleId,
          domain_module_id: modId,
          interaction_level: m.interaction_level,
        });
      }
    }
  }
  if (rmPayload.length > 0) {
    await insert("/role_modules", rmPayload);
    console.log(`  inserted ${rmPayload.length} role_modules rows`);
  } else {
    console.log("  all role_modules already present");
  }

  // ============================================================
  // Phase E.4 — role_permissions
  // ============================================================
  console.log("\nStep 5: role_permissions");
  const existingRp = await get(
    `/role_permissions?role_id=in.(${allRoleIds.join(",")})&select=role_id,permission_id`,
  );
  const haveRp = new Set(existingRp.map(r => `${r.role_id}|${r.permission_id}`));
  const rpPayload: Row[] = [];
  for (const r of roles) {
    const roleId = roleMap.get(r.role_code)!;
    for (const permName of r.permissions) {
      const permId = permMap.get(permName);
      if (!permId) throw new Error(`Permission not found: ${permName}`);
      if (!haveRp.has(`${roleId}|${permId}`)) {
        rpPayload.push({ role_id: roleId, permission_id: permId });
      }
    }
  }
  if (rpPayload.length > 0) {
    await insert("/role_permissions", rpPayload);
    console.log(`  inserted ${rpPayload.length} role_permissions rows`);
  } else {
    console.log("  all role_permissions already present");
  }

  // ============================================================
  // Phase S.1 — tools (dedupe against existing catalog)
  // ============================================================
  console.log("\nStep 6: tools");
  // Resolve data_object ids for tools needing them
  const doRows = await get(
    `/data_objects?data_object_name=in.(${tools
      .filter(t => t.data_object)
      .map(t => t.data_object!)
      .join(",")})&select=id,data_object_name`,
  );
  const doMap = new Map<string, number>();
  for (const r of doRows) doMap.set(String(r.data_object_name), Number(r.id));

  // Pre-resolve users id for completeness
  const [usersRow] = await get("/data_objects?data_object_name=eq.users&select=id");
  if (usersRow) doMap.set("users", Number(usersRow.id));

  const toolPayload = tools.map(t => {
    if ((t.operation_kind === "query" || t.operation_kind === "mutate") && !t.data_object) {
      throw new Error(`Tool ${t.tool_name}: query/mutate requires data_object`);
    }
    return {
      tool_name: t.tool_name,
      description: t.description,
      operation_kind: t.operation_kind,
      coverage_tier: t.coverage_tier,
      data_object_id: t.data_object ? doMap.get(t.data_object) ?? null : null,
    };
  });
  const toolMap = await syncByKey("/tools", toolPayload, "tool_name");

  // Add platform tools we reference but don't author (notify_person, send_email)
  const platformRefs = await get(
    "/tools?tool_name=in.(notify_person,send_email,notify_team)&select=id,tool_name",
  );
  for (const r of platformRefs) toolMap.set(String(r.tool_name), Number(r.id));

  // ============================================================
  // Phase S.2 — skills
  // ============================================================
  console.log("\nStep 7: skills (system)");
  const skillPayload = skills.map(s => ({
    skill_name: s.skill_name,
    description: s.description,
    skill_type: "system",
    domain_id: domainId,
    domain_module_id: modMap.get(s.module)!,
  }));
  const skillMap = await syncByKey("/skills", skillPayload, "skill_name");

  // ============================================================
  // Phase S.3 — skill_tools
  // ============================================================
  console.log("\nStep 8: skill_tools");
  const allSkillIds = [...skillMap.values()];
  const existingSt = await get(
    `/skill_tools?skill_id=in.(${allSkillIds.join(",")})&select=skill_id,tool_id`,
  );
  const haveSt = new Set(existingSt.map(r => `${r.skill_id}|${r.tool_id}`));
  const stPayload: Row[] = [];
  for (const s of skills) {
    const sid = skillMap.get(s.skill_name)!;
    for (const t of s.tools) {
      const tid = toolMap.get(t.tool);
      if (!tid) throw new Error(`Tool not found: ${t.tool}`);
      if (!haveSt.has(`${sid}|${tid}`)) {
        stPayload.push({ skill_id: sid, tool_id: tid, requirement_level: t.requirement });
      }
    }
  }
  if (stPayload.length > 0) {
    await insert("/skill_tools", stPayload);
    console.log(`  inserted ${stPayload.length} skill_tools rows`);
  } else {
    console.log("  all skill_tools already present");
  }

  // Summary
  console.log("\n=== Phase C+E+S complete ===");
  console.log(`  business_function_domains: ${bfdPayload.length} new`);
  console.log(`  permissions: ${permMap.size} cumulative (LIB modules contribute 18)`);
  console.log(`  roles: ${roleMap.size} cumulative (${roles.length} new for LIB-MGMT)`);
  console.log(`  role_modules: ${rmPayload.length} new`);
  console.log(`  role_permissions: ${rpPayload.length} new`);
  console.log(`  tools: ${toolMap.size} cumulative`);
  console.log(`  skills: ${skillMap.size} cumulative (${skills.length} new for LIB-MGMT)`);
  console.log(`  skill_tools: ${stPayload.length} new`);

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/roles");
  console.log("  https://tests.semantius.app/domain_map/skills");
  console.log("  https://tests.semantius.app/domain_map/tools");
  console.log("  https://tests.semantius.app/domain_map/skill_tools");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
