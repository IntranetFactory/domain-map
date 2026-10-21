#!/usr/bin/env bun
// Phase B loader for Library Management (LIB-MGMT).
// Loads: data_objects, domain_module_data_objects, data_object_aliases,
// data_object_relationships, data_object_lifecycle_states, trigger_events, handoffs.
// Idempotent against natural keys.

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
// Data objects
// ============================================================

type DOSpec = {
  data_object_name: string;
  singular_label: string;
  plural_label: string;
  description: string;
  is_canonical_bare_word?: boolean;
  naming_authority_rationale?: string;
  has_personal_content?: boolean;
  has_submit_lock?: boolean;
  has_single_approver?: boolean;
};

const dataObjects: DOSpec[] = [
  {
    data_object_name: "bibliographic_records",
    singular_label: "Bibliographic Record",
    plural_label: "Bibliographic Records",
    description:
      "Medium-neutral catalog description of an intellectual work or expression, encoded in MARC21 or BIBFRAME. Covers books, ebooks, periodicals, serials, audio recordings, video, maps, manuscripts, datasets, and any other library material regardless of format.",
    is_canonical_bare_word: true,
    naming_authority_rationale:
      "Library Management is the canonical owner of bibliographic records catalog-wide. The term is the universal library-science name for the catalog entry, used by every ILS and LSP vendor regardless of the medium described.",
  },
  {
    data_object_name: "library_items",
    singular_label: "Library Item",
    plural_label: "Library Items",
    description:
      "Physical or digital copy of a work held by the library. One bibliographic record may have many items, each with its own barcode, location, status, and circulation history.",
  },
  {
    data_object_name: "library_authorities",
    singular_label: "Library Authority Record",
    plural_label: "Library Authority Records",
    description:
      "Controlled-vocabulary record for a name, subject, organization, or uniform title used as a heading in bibliographic records, supporting consistent retrieval and disambiguation.",
  },
  {
    data_object_name: "library_holdings",
    singular_label: "Library Holdings Record",
    plural_label: "Library Holdings Records",
    description:
      "Summary of which copies of a bibliographic record exist at a given location, including coverage statements for serials and shelf-location information.",
  },
  {
    data_object_name: "library_loans",
    singular_label: "Library Loan",
    plural_label: "Library Loans",
    description:
      "Circulation transaction recording the loan of a library item to a patron, including due date, renewal history, and return status.",
    has_personal_content: true,
  },
  {
    data_object_name: "library_holds",
    singular_label: "Library Hold",
    plural_label: "Library Holds",
    description:
      "Patron request to reserve a bibliographic record or specific item for later pickup, including position in queue, pickup location, and trap status.",
    has_personal_content: true,
  },
  {
    data_object_name: "library_fines",
    singular_label: "Library Fine",
    plural_label: "Library Fines",
    description:
      "Monetary charge against a patron account for overdue, lost, or damaged library items, including assessment, payment, and waiver workflow.",
    has_personal_content: true,
  },
  {
    data_object_name: "library_circulation_policies",
    singular_label: "Library Circulation Policy",
    plural_label: "Library Circulation Policies",
    description:
      "Configuration rule defining loan period, renewal limits, fine accrual, and hold behavior for a combination of item type and patron category.",
  },
  {
    data_object_name: "library_patrons",
    singular_label: "Library Patron",
    plural_label: "Library Patrons",
    description:
      "Registered library member with borrowing privileges, contact information, patron category, and account history. Distinct from platform users; a patron may or may not have a linked user account for self-service.",
    has_personal_content: true,
  },
  {
    data_object_name: "library_patron_categories",
    singular_label: "Library Patron Category",
    plural_label: "Library Patron Categories",
    description:
      "Classification of patrons (e.g. student, faculty, staff, public, juvenile) that drives circulation policy and access entitlement.",
  },
  {
    data_object_name: "library_acquisition_orders",
    singular_label: "Library Acquisition Order",
    plural_label: "Library Acquisition Orders",
    description:
      "Order for library materials from a book vendor, including line items, fund allocations, EDI exchange status, and receiving workflow.",
    has_submit_lock: true,
  },
  {
    data_object_name: "library_vendor_accounts",
    singular_label: "Library Vendor Account",
    plural_label: "Library Vendor Accounts",
    description:
      "Book or serials vendor relationship managed by the library, including account credentials, EDI settings, claiming defaults, and contact information.",
  },
  {
    data_object_name: "library_serial_subscriptions",
    singular_label: "Library Serial Subscription",
    plural_label: "Library Serial Subscriptions",
    description:
      "Active subscription to a periodical or other continuing resource, including issue prediction, check-in records, claim history, and renewal schedule.",
  },
  {
    data_object_name: "library_eresource_licenses",
    singular_label: "Library E-Resource License",
    plural_label: "Library E-Resource Licenses",
    description:
      "License agreement for an electronic resource (database, ebook collection, ejournal package), including authorized users, concurrent-user limits, ILL permissions, and renewal terms.",
  },
  {
    data_object_name: "library_saved_searches",
    singular_label: "Library Saved Search",
    plural_label: "Library Saved Searches",
    description:
      "Patron-owned saved query or reading list in the discovery layer, optionally configured to send alerts when new matching items are added to the catalog.",
    has_personal_content: true,
  },
  {
    data_object_name: "interlibrary_loan_requests",
    singular_label: "Interlibrary Loan Request",
    plural_label: "Interlibrary Loan Requests",
    description:
      "Patron-initiated request to borrow material from another library, including routing across sharing partners, shipping status, and fulfillment workflow.",
    is_canonical_bare_word: true,
    naming_authority_rationale:
      "Library Management is the canonical owner of interlibrary loan requests. The phrase 'interlibrary loan' is unambiguously library-domain with no plausible competing claim from any other catalog domain.",
    has_personal_content: true,
  },
  {
    data_object_name: "library_sharing_partners",
    singular_label: "Library Sharing Partner",
    plural_label: "Library Sharing Partners",
    description:
      "Partner library or consortium member with which this library participates in resource sharing, including agreement terms, default lending policies, and contact endpoints.",
  },
];

// ============================================================
// Module-data-object junctions
// ============================================================

type DMDO = {
  module: string;
  data_object: string;
  role: "master" | "embedded_master" | "contributor" | "consumer" | "derived";
  necessity: "required" | "optional";
};

const dmdoRows: DMDO[] = [
  // LIB-CATALOG masters
  { module: "LIB-CATALOG", data_object: "bibliographic_records", role: "master", necessity: "required" },
  { module: "LIB-CATALOG", data_object: "library_items", role: "master", necessity: "required" },
  { module: "LIB-CATALOG", data_object: "library_authorities", role: "master", necessity: "required" },
  { module: "LIB-CATALOG", data_object: "library_holdings", role: "master", necessity: "required" },

  // LIB-CIRCULATION masters
  { module: "LIB-CIRCULATION", data_object: "library_loans", role: "master", necessity: "required" },
  { module: "LIB-CIRCULATION", data_object: "library_holds", role: "master", necessity: "required" },
  { module: "LIB-CIRCULATION", data_object: "library_fines", role: "master", necessity: "required" },
  { module: "LIB-CIRCULATION", data_object: "library_circulation_policies", role: "master", necessity: "required" },
  // LIB-CIRCULATION cross-module reads/writes
  { module: "LIB-CIRCULATION", data_object: "library_items", role: "contributor", necessity: "required" },
  { module: "LIB-CIRCULATION", data_object: "library_patrons", role: "consumer", necessity: "required" },
  { module: "LIB-CIRCULATION", data_object: "library_patron_categories", role: "consumer", necessity: "required" },

  // LIB-PATRON masters
  { module: "LIB-PATRON", data_object: "library_patrons", role: "master", necessity: "required" },
  { module: "LIB-PATRON", data_object: "library_patron_categories", role: "master", necessity: "required" },
  // LIB-PATRON cross-module reads
  { module: "LIB-PATRON", data_object: "library_loans", role: "consumer", necessity: "optional" },
  { module: "LIB-PATRON", data_object: "library_fines", role: "consumer", necessity: "optional" },

  // LIB-ACQUISITIONS masters
  { module: "LIB-ACQUISITIONS", data_object: "library_acquisition_orders", role: "master", necessity: "required" },
  { module: "LIB-ACQUISITIONS", data_object: "library_vendor_accounts", role: "master", necessity: "required" },
  { module: "LIB-ACQUISITIONS", data_object: "library_serial_subscriptions", role: "master", necessity: "required" },
  { module: "LIB-ACQUISITIONS", data_object: "library_eresource_licenses", role: "master", necessity: "required" },
  // LIB-ACQUISITIONS cross-module writes (acquisitions creates bib stubs and item records at receipt)
  { module: "LIB-ACQUISITIONS", data_object: "bibliographic_records", role: "contributor", necessity: "required" },
  { module: "LIB-ACQUISITIONS", data_object: "library_items", role: "contributor", necessity: "required" },
  { module: "LIB-ACQUISITIONS", data_object: "library_holdings", role: "contributor", necessity: "optional" },

  // LIB-DISCOVERY masters
  { module: "LIB-DISCOVERY", data_object: "library_saved_searches", role: "master", necessity: "required" },
  // LIB-DISCOVERY cross-module reads
  { module: "LIB-DISCOVERY", data_object: "bibliographic_records", role: "consumer", necessity: "required" },
  { module: "LIB-DISCOVERY", data_object: "library_holdings", role: "consumer", necessity: "required" },
  { module: "LIB-DISCOVERY", data_object: "library_items", role: "consumer", necessity: "required" },
  { module: "LIB-DISCOVERY", data_object: "library_authorities", role: "consumer", necessity: "optional" },
  { module: "LIB-DISCOVERY", data_object: "library_holds", role: "contributor", necessity: "optional" },

  // LIB-ILL masters
  { module: "LIB-ILL", data_object: "interlibrary_loan_requests", role: "master", necessity: "required" },
  { module: "LIB-ILL", data_object: "library_sharing_partners", role: "master", necessity: "required" },
  // LIB-ILL cross-module reads/writes
  { module: "LIB-ILL", data_object: "library_patrons", role: "consumer", necessity: "required" },
  { module: "LIB-ILL", data_object: "library_loans", role: "contributor", necessity: "optional" },
  { module: "LIB-ILL", data_object: "bibliographic_records", role: "consumer", necessity: "required" },
];

// ============================================================
// Aliases
// ============================================================

const aliases: Array<{ data_object: string; alias_name: string; alias_type: string }> = [
  { data_object: "bibliographic_records", alias_name: "MARC Record", alias_type: "synonym" },
  { data_object: "bibliographic_records", alias_name: "BIBFRAME Resource", alias_type: "synonym" },
  { data_object: "bibliographic_records", alias_name: "Catalog Entry", alias_type: "synonym" },
  { data_object: "library_items", alias_name: "Copy", alias_type: "synonym" },
  { data_object: "library_items", alias_name: "Holding Copy", alias_type: "synonym" },
  { data_object: "library_loans", alias_name: "Issue", alias_type: "synonym" },
  { data_object: "library_loans", alias_name: "Charge", alias_type: "synonym" },
  { data_object: "library_loans", alias_name: "Checkout", alias_type: "synonym" },
  { data_object: "library_patrons", alias_name: "Borrower", alias_type: "synonym" },
  { data_object: "library_patrons", alias_name: "Reader", alias_type: "synonym" },
  { data_object: "library_patrons", alias_name: "Library Member", alias_type: "synonym" },
  { data_object: "library_holds", alias_name: "Reservation", alias_type: "synonym" },
  { data_object: "library_authorities", alias_name: "Authority Heading", alias_type: "synonym" },
  { data_object: "library_authorities", alias_name: "Controlled Heading", alias_type: "synonym" },
  { data_object: "library_holdings", alias_name: "Holdings Record", alias_type: "synonym" },
  { data_object: "library_circulation_policies", alias_name: "Loan Rules", alias_type: "synonym" },
  { data_object: "library_circulation_policies", alias_name: "Circ Rules", alias_type: "synonym" },
  { data_object: "interlibrary_loan_requests", alias_name: "ILL Request", alias_type: "synonym" },
  { data_object: "interlibrary_loan_requests", alias_name: "Document Delivery Request", alias_type: "synonym" },
  { data_object: "library_sharing_partners", alias_name: "Resource Sharing Partner", alias_type: "synonym" },
  { data_object: "library_acquisition_orders", alias_name: "Library Order", alias_type: "synonym" },
  { data_object: "library_serial_subscriptions", alias_name: "Periodical Subscription", alias_type: "synonym" },
  { data_object: "library_eresource_licenses", alias_name: "Database License", alias_type: "synonym" },
  { data_object: "library_eresource_licenses", alias_name: "Electronic Resource Agreement", alias_type: "synonym" },
];

// ============================================================
// Lifecycle states
// ============================================================

type LCS = {
  data_object: string;
  state_name: string;
  state_order: number;
  description: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  module: string;
};

const lifecycleStates: LCS[] = [
  // bibliographic_records (CATALOG)
  { data_object: "bibliographic_records", state_name: "new", state_order: 10, description: "New record created, not yet ready for publishing to discovery.", is_initial: true, module: "LIB-CATALOG" },
  { data_object: "bibliographic_records", state_name: "in_progress", state_order: 20, description: "Cataloger is enriching the record (subject headings, classification, links).", module: "LIB-CATALOG" },
  { data_object: "bibliographic_records", state_name: "published", state_order: 30, description: "Record is visible in the discovery layer and items can circulate against it.", requires_permission: true, module: "LIB-CATALOG" },
  { data_object: "bibliographic_records", state_name: "withdrawn", state_order: 40, description: "Record removed from active catalog; items withdrawn or transferred.", is_terminal: true, requires_permission: true, module: "LIB-CATALOG" },

  // library_items (CATALOG)
  { data_object: "library_items", state_name: "on_order", state_order: 10, description: "Item is ordered but not yet received.", is_initial: true, module: "LIB-CATALOG" },
  { data_object: "library_items", state_name: "received", state_order: 20, description: "Item arrived from vendor, awaiting cataloging finalization.", module: "LIB-CATALOG" },
  { data_object: "library_items", state_name: "cataloged", state_order: 30, description: "Item is cataloged but not yet available for circulation.", module: "LIB-CATALOG" },
  { data_object: "library_items", state_name: "available", state_order: 40, description: "Item is available to circulate.", requires_permission: true, permission_verb_override: "activate_library_item", module: "LIB-CATALOG" },
  { data_object: "library_items", state_name: "checked_out", state_order: 50, description: "Item is currently on loan to a patron.", module: "LIB-CIRCULATION" },
  { data_object: "library_items", state_name: "in_transit", state_order: 60, description: "Item is moving between branches or to a hold pickup location.", module: "LIB-CIRCULATION" },
  { data_object: "library_items", state_name: "missing", state_order: 70, description: "Item is not located during inventory or recall.", module: "LIB-CIRCULATION" },
  { data_object: "library_items", state_name: "withdrawn", state_order: 80, description: "Item is permanently removed from the collection.", is_terminal: true, requires_permission: true, permission_verb_override: "withdraw_library_item", module: "LIB-CATALOG" },

  // library_loans (CIRCULATION)
  { data_object: "library_loans", state_name: "active", state_order: 10, description: "Loan is in force; item is with the patron.", is_initial: true, module: "LIB-CIRCULATION" },
  { data_object: "library_loans", state_name: "renewed", state_order: 20, description: "Loan was renewed; due date extended.", requires_permission: true, permission_verb_override: "renew_library_loan", module: "LIB-CIRCULATION" },
  { data_object: "library_loans", state_name: "overdue", state_order: 30, description: "Loan due date has passed without return or renewal.", module: "LIB-CIRCULATION" },
  { data_object: "library_loans", state_name: "returned", state_order: 40, description: "Item has been returned and discharged.", is_terminal: true, requires_permission: true, permission_verb_override: "return_library_loan", module: "LIB-CIRCULATION" },
  { data_object: "library_loans", state_name: "lost", state_order: 50, description: "Loan declared lost; replacement charges may apply.", is_terminal: true, requires_permission: true, permission_verb_override: "declare_library_loan_lost", module: "LIB-CIRCULATION" },
  { data_object: "library_loans", state_name: "claims_returned", state_order: 60, description: "Patron claims they returned the item but the library has no record of it.", module: "LIB-CIRCULATION" },

  // library_holds (CIRCULATION)
  { data_object: "library_holds", state_name: "pending", state_order: 10, description: "Hold queued; no matching item yet trapped.", is_initial: true, module: "LIB-CIRCULATION" },
  { data_object: "library_holds", state_name: "trapped", state_order: 20, description: "Item identified for this hold; ready to be intercepted on return.", requires_permission: true, permission_verb_override: "trap_library_hold", module: "LIB-CIRCULATION" },
  { data_object: "library_holds", state_name: "in_transit", state_order: 30, description: "Trapped item being transported to pickup location.", module: "LIB-CIRCULATION" },
  { data_object: "library_holds", state_name: "ready_for_pickup", state_order: 40, description: "Item is on the hold shelf awaiting patron pickup.", requires_permission: true, permission_verb_override: "mark_library_hold_ready", module: "LIB-CIRCULATION" },
  { data_object: "library_holds", state_name: "fulfilled", state_order: 50, description: "Patron picked up the item; hold satisfied.", is_terminal: true, requires_permission: true, permission_verb_override: "fulfill_library_hold", module: "LIB-CIRCULATION" },
  { data_object: "library_holds", state_name: "expired", state_order: 60, description: "Pickup window passed without patron action.", is_terminal: true, module: "LIB-CIRCULATION" },
  { data_object: "library_holds", state_name: "cancelled", state_order: 70, description: "Hold cancelled by patron or staff.", is_terminal: true, requires_permission: true, permission_verb_override: "cancel_library_hold", module: "LIB-CIRCULATION" },

  // library_fines (CIRCULATION)
  { data_object: "library_fines", state_name: "accrued", state_order: 10, description: "Fine is accruing on an overdue or unreturned item.", is_initial: true, module: "LIB-CIRCULATION" },
  { data_object: "library_fines", state_name: "assessed", state_order: 20, description: "Fine has been posted to the patron account at its final amount.", requires_permission: true, permission_verb_override: "assess_library_fine", module: "LIB-CIRCULATION" },
  { data_object: "library_fines", state_name: "paid", state_order: 30, description: "Fine has been paid in full.", is_terminal: true, requires_permission: true, permission_verb_override: "mark_library_fine_paid", module: "LIB-CIRCULATION" },
  { data_object: "library_fines", state_name: "waived", state_order: 40, description: "Fine has been waived by staff.", is_terminal: true, requires_permission: true, permission_verb_override: "waive_library_fine", module: "LIB-CIRCULATION" },
  { data_object: "library_fines", state_name: "sent_to_collections", state_order: 50, description: "Fine has been escalated to external collections.", requires_permission: true, permission_verb_override: "escalate_library_fine_to_collections", module: "LIB-CIRCULATION" },

  // library_patrons (PATRON)
  { data_object: "library_patrons", state_name: "pending", state_order: 10, description: "Patron registration submitted; card not yet issued.", is_initial: true, module: "LIB-PATRON" },
  { data_object: "library_patrons", state_name: "active", state_order: 20, description: "Patron has full borrowing privileges.", requires_permission: true, permission_verb_override: "activate_library_patron", module: "LIB-PATRON" },
  { data_object: "library_patrons", state_name: "suspended", state_order: 30, description: "Patron privileges revoked due to fines, lost items, or policy violations.", requires_permission: true, permission_verb_override: "suspend_library_patron", module: "LIB-PATRON" },
  { data_object: "library_patrons", state_name: "expired", state_order: 40, description: "Patron card expired and requires renewal.", module: "LIB-PATRON" },
  { data_object: "library_patrons", state_name: "archived", state_order: 50, description: "Patron account closed; record retained for audit.", is_terminal: true, requires_permission: true, permission_verb_override: "archive_library_patron", module: "LIB-PATRON" },

  // library_acquisition_orders (ACQUISITIONS)
  { data_object: "library_acquisition_orders", state_name: "draft", state_order: 10, description: "Order being assembled; line items can still be added or removed.", is_initial: true, module: "LIB-ACQUISITIONS" },
  { data_object: "library_acquisition_orders", state_name: "submitted", state_order: 20, description: "Order submitted to vendor; awaiting acknowledgement.", requires_permission: true, permission_verb_override: "submit_library_acquisition_order", module: "LIB-ACQUISITIONS" },
  { data_object: "library_acquisition_orders", state_name: "ordered", state_order: 30, description: "Vendor acknowledged the order; items in transit.", module: "LIB-ACQUISITIONS" },
  { data_object: "library_acquisition_orders", state_name: "partial_received", state_order: 40, description: "Some line items received; others outstanding.", module: "LIB-ACQUISITIONS" },
  { data_object: "library_acquisition_orders", state_name: "received", state_order: 50, description: "All line items received.", requires_permission: true, permission_verb_override: "receive_library_acquisition_order", module: "LIB-ACQUISITIONS" },
  { data_object: "library_acquisition_orders", state_name: "invoiced", state_order: 60, description: "Vendor invoice received and matched to the order.", module: "LIB-ACQUISITIONS" },
  { data_object: "library_acquisition_orders", state_name: "paid", state_order: 70, description: "Invoice has been paid.", module: "LIB-ACQUISITIONS" },
  { data_object: "library_acquisition_orders", state_name: "closed", state_order: 80, description: "Order is reconciled and closed.", is_terminal: true, module: "LIB-ACQUISITIONS" },
  { data_object: "library_acquisition_orders", state_name: "cancelled", state_order: 90, description: "Order cancelled before fulfillment.", is_terminal: true, requires_permission: true, permission_verb_override: "cancel_library_acquisition_order", module: "LIB-ACQUISITIONS" },

  // library_serial_subscriptions (ACQUISITIONS)
  { data_object: "library_serial_subscriptions", state_name: "active", state_order: 10, description: "Subscription is live; issues are being received and checked in.", is_initial: true, module: "LIB-ACQUISITIONS" },
  { data_object: "library_serial_subscriptions", state_name: "renewed", state_order: 20, description: "Subscription renewed for the next term.", requires_permission: true, permission_verb_override: "renew_library_serial_subscription", module: "LIB-ACQUISITIONS" },
  { data_object: "library_serial_subscriptions", state_name: "cancelled", state_order: 30, description: "Subscription cancelled.", is_terminal: true, requires_permission: true, permission_verb_override: "cancel_library_serial_subscription", module: "LIB-ACQUISITIONS" },
  { data_object: "library_serial_subscriptions", state_name: "expired", state_order: 40, description: "Subscription term ended without renewal.", is_terminal: true, module: "LIB-ACQUISITIONS" },

  // library_eresource_licenses (ACQUISITIONS)
  { data_object: "library_eresource_licenses", state_name: "under_negotiation", state_order: 10, description: "License terms in discussion with the publisher.", is_initial: true, module: "LIB-ACQUISITIONS" },
  { data_object: "library_eresource_licenses", state_name: "active", state_order: 20, description: "License is live; resource is accessible to authorized users.", requires_permission: true, permission_verb_override: "activate_library_eresource_license", module: "LIB-ACQUISITIONS" },
  { data_object: "library_eresource_licenses", state_name: "renewed", state_order: 30, description: "License renewed for the next term.", requires_permission: true, permission_verb_override: "renew_library_eresource_license", module: "LIB-ACQUISITIONS" },
  { data_object: "library_eresource_licenses", state_name: "expiring", state_order: 40, description: "License within renewal window; decision required.", module: "LIB-ACQUISITIONS" },
  { data_object: "library_eresource_licenses", state_name: "expired", state_order: 50, description: "License term ended without renewal; access blocked.", is_terminal: true, module: "LIB-ACQUISITIONS" },
  { data_object: "library_eresource_licenses", state_name: "terminated", state_order: 60, description: "License ended early by agreement.", is_terminal: true, requires_permission: true, permission_verb_override: "terminate_library_eresource_license", module: "LIB-ACQUISITIONS" },

  // interlibrary_loan_requests (ILL)
  { data_object: "interlibrary_loan_requests", state_name: "submitted", state_order: 10, description: "Patron submitted an ILL request.", is_initial: true, module: "LIB-ILL" },
  { data_object: "interlibrary_loan_requests", state_name: "routed", state_order: 20, description: "Request routed to a potential lending partner.", requires_permission: true, permission_verb_override: "route_interlibrary_loan_request", module: "LIB-ILL" },
  { data_object: "interlibrary_loan_requests", state_name: "accepted", state_order: 30, description: "Partner library accepted the request.", requires_permission: true, permission_verb_override: "accept_interlibrary_loan_request", module: "LIB-ILL" },
  { data_object: "interlibrary_loan_requests", state_name: "shipped", state_order: 40, description: "Lending partner shipped the item.", requires_permission: true, permission_verb_override: "ship_interlibrary_loan_request", module: "LIB-ILL" },
  { data_object: "interlibrary_loan_requests", state_name: "received", state_order: 50, description: "Borrowing library received the item; loan to patron about to begin.", module: "LIB-ILL" },
  { data_object: "interlibrary_loan_requests", state_name: "returned", state_order: 60, description: "Patron returned the item to the borrowing library.", module: "LIB-ILL" },
  { data_object: "interlibrary_loan_requests", state_name: "completed", state_order: 70, description: "Item returned to lending library; request closed.", is_terminal: true, requires_permission: true, permission_verb_override: "complete_interlibrary_loan_request", module: "LIB-ILL" },
  { data_object: "interlibrary_loan_requests", state_name: "declined", state_order: 80, description: "All routed partners declined the request.", is_terminal: true, module: "LIB-ILL" },
  { data_object: "interlibrary_loan_requests", state_name: "cancelled", state_order: 90, description: "Request cancelled by patron or staff.", is_terminal: true, requires_permission: true, permission_verb_override: "cancel_interlibrary_loan_request", module: "LIB-ILL" },

  // library_authorities (CATALOG)
  { data_object: "library_authorities", state_name: "new", state_order: 10, description: "Authority record drafted; not yet established for use.", is_initial: true, module: "LIB-CATALOG" },
  { data_object: "library_authorities", state_name: "established", state_order: 20, description: "Authority record approved; usable as a heading in bibliographic records.", requires_permission: true, permission_verb_override: "establish_library_authority", module: "LIB-CATALOG" },
  { data_object: "library_authorities", state_name: "see_reference", state_order: 30, description: "Authority is a cross-reference pointing to a different established heading.", is_terminal: true, module: "LIB-CATALOG" },
  { data_object: "library_authorities", state_name: "obsolete", state_order: 40, description: "Authority deprecated; replaced by a different heading.", is_terminal: true, module: "LIB-CATALOG" },
];

// ============================================================
// Trigger events (one per state-transition that publishes intra-domain)
// ============================================================

type TE = {
  event_name: string;
  data_object: string;
  description: string;
  from_state?: string;
  to_state?: string;
  event_category: "lifecycle" | "state_change" | "threshold" | "signal";
  module?: string;
};

const triggerEvents: TE[] = [
  { event_name: "library_acquisition_order.received", data_object: "library_acquisition_orders", description: "Library acquisition order fully received from vendor.", to_state: "received", event_category: "state_change", module: "LIB-ACQUISITIONS" },
  { event_name: "library_item.received", data_object: "library_items", description: "Library item received from vendor and ready for cataloging.", to_state: "received", event_category: "state_change", module: "LIB-CATALOG" },
  { event_name: "bibliographic_record.published", data_object: "bibliographic_records", description: "Bibliographic record published to discovery layer.", to_state: "published", event_category: "state_change", module: "LIB-CATALOG" },
  { event_name: "library_item.activated", data_object: "library_items", description: "Library item activated; circulable.", to_state: "available", event_category: "state_change", module: "LIB-CATALOG" },
  { event_name: "library_hold.placed", data_object: "library_holds", description: "Patron placed a hold on a bibliographic record or item.", to_state: "pending", event_category: "lifecycle", module: "LIB-DISCOVERY" },
  { event_name: "library_hold.ready", data_object: "library_holds", description: "Hold is on the pickup shelf awaiting patron retrieval.", to_state: "ready_for_pickup", event_category: "state_change", module: "LIB-CIRCULATION" },
  { event_name: "library_fine.assessed", data_object: "library_fines", description: "Fine assessed against patron account.", to_state: "assessed", event_category: "state_change", module: "LIB-CIRCULATION" },
  { event_name: "library_patron.suspended", data_object: "library_patrons", description: "Patron borrowing privileges suspended.", to_state: "suspended", event_category: "state_change", module: "LIB-PATRON" },
  { event_name: "interlibrary_loan_request.received", data_object: "interlibrary_loan_requests", description: "Borrowed item received and ready to loan to patron.", to_state: "received", event_category: "state_change", module: "LIB-ILL" },
];

// ============================================================
// Intra-domain handoffs
// ============================================================

type HO = {
  event_name: string;
  source_module: string;
  target_module: string;
  data_object: string;
  integration_pattern: "lifecycle_progression" | "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "low" | "medium" | "high";
  description: string;
};

const handoffs: HO[] = [
  { event_name: "library_acquisition_order.received", source_module: "LIB-ACQUISITIONS", target_module: "LIB-CATALOG", data_object: "library_items", integration_pattern: "lifecycle_progression", friction_level: "low", description: "Received order triggers catalogers to finalize bibliographic and item records." },
  { event_name: "library_item.received", source_module: "LIB-ACQUISITIONS", target_module: "LIB-CATALOG", data_object: "library_items", integration_pattern: "lifecycle_progression", friction_level: "low", description: "Item received from vendor moves to cataloging queue for final metadata and barcode assignment." },
  { event_name: "bibliographic_record.published", source_module: "LIB-CATALOG", target_module: "LIB-DISCOVERY", data_object: "bibliographic_records", integration_pattern: "lifecycle_progression", friction_level: "low", description: "Published bibliographic record indexed by discovery layer." },
  { event_name: "library_item.activated", source_module: "LIB-CATALOG", target_module: "LIB-CIRCULATION", data_object: "library_items", integration_pattern: "lifecycle_progression", friction_level: "low", description: "Activated item becomes available for circulation; circulation workflows can now check it out." },
  { event_name: "library_hold.placed", source_module: "LIB-DISCOVERY", target_module: "LIB-CIRCULATION", data_object: "library_holds", integration_pattern: "lifecycle_progression", friction_level: "low", description: "Patron-placed hold in discovery enters the circulation queue for trapping." },
  { event_name: "library_hold.ready", source_module: "LIB-CIRCULATION", target_module: "LIB-PATRON", data_object: "library_holds", integration_pattern: "lifecycle_progression", friction_level: "low", description: "Hold ready for pickup triggers patron notification on their account." },
  { event_name: "library_fine.assessed", source_module: "LIB-CIRCULATION", target_module: "LIB-PATRON", data_object: "library_fines", integration_pattern: "lifecycle_progression", friction_level: "low", description: "Newly assessed fine appears on patron account ledger." },
  { event_name: "library_patron.suspended", source_module: "LIB-PATRON", target_module: "LIB-CIRCULATION", data_object: "library_loans", integration_pattern: "lifecycle_progression", friction_level: "medium", description: "Suspended patron's open loans flagged for review; further checkouts blocked." },
  { event_name: "interlibrary_loan_request.received", source_module: "LIB-ILL", target_module: "LIB-CIRCULATION", data_object: "library_loans", integration_pattern: "lifecycle_progression", friction_level: "low", description: "Received ILL item is loaned to the requesting patron via standard circulation." },
];

// ============================================================
// Data object relationships
// ============================================================

type DOR = {
  source: string;
  target: string;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
  relationship_kind: "composition" | "association" | "reference" | "succession";
  is_required: boolean;
  owner_side: "source" | "target";
};

const relationships: DOR[] = [
  // bibliographic_records as core
  { source: "bibliographic_records", target: "library_items", relationship_verb: "has_copy", inverse_verb: "describes", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
  { source: "bibliographic_records", target: "library_holdings", relationship_verb: "summarized_in", inverse_verb: "summarizes", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  { source: "bibliographic_records", target: "library_authorities", relationship_verb: "uses_heading", inverse_verb: "appears_in", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },

  // library_items circulation links
  { source: "library_items", target: "library_loans", relationship_verb: "checked_out_via", inverse_verb: "loans_out", relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "target" },
  { source: "library_items", target: "library_holds", relationship_verb: "reserved_via", inverse_verb: "reserves", relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "target" },

  // patron relationships
  { source: "library_loans", target: "library_patrons", relationship_verb: "loaned_to", inverse_verb: "has_loan", relationship_type: "many_to_one", relationship_kind: "reference", is_required: true, owner_side: "source" },
  { source: "library_holds", target: "library_patrons", relationship_verb: "placed_by", inverse_verb: "has_hold", relationship_type: "many_to_one", relationship_kind: "reference", is_required: true, owner_side: "source" },
  { source: "library_fines", target: "library_patrons", relationship_verb: "assessed_to", inverse_verb: "has_fine", relationship_type: "many_to_one", relationship_kind: "reference", is_required: true, owner_side: "source" },
  { source: "library_patrons", target: "library_patron_categories", relationship_verb: "categorized_as", inverse_verb: "categorizes", relationship_type: "many_to_one", relationship_kind: "reference", is_required: true, owner_side: "source" },

  // fine links
  { source: "library_fines", target: "library_loans", relationship_verb: "assessed_for", inverse_verb: "accrued_fine", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },

  // circulation policy links
  { source: "library_loans", target: "library_circulation_policies", relationship_verb: "governed_by", inverse_verb: "governs", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { source: "library_holds", target: "library_circulation_policies", relationship_verb: "governed_by", inverse_verb: "governs", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },

  // acquisitions links
  { source: "library_acquisition_orders", target: "library_vendor_accounts", relationship_verb: "ordered_from", inverse_verb: "fulfills", relationship_type: "many_to_one", relationship_kind: "reference", is_required: true, owner_side: "source" },
  { source: "library_acquisition_orders", target: "library_items", relationship_verb: "creates", inverse_verb: "ordered_via", relationship_type: "one_to_many", relationship_kind: "succession", is_required: false, owner_side: "source" },
  { source: "library_acquisition_orders", target: "bibliographic_records", relationship_verb: "may_create", inverse_verb: "may_originate_from", relationship_type: "one_to_many", relationship_kind: "succession", is_required: false, owner_side: "source" },
  { source: "library_serial_subscriptions", target: "library_vendor_accounts", relationship_verb: "ordered_from", inverse_verb: "supplies", relationship_type: "many_to_one", relationship_kind: "reference", is_required: true, owner_side: "source" },
  { source: "library_eresource_licenses", target: "library_vendor_accounts", relationship_verb: "ordered_from", inverse_verb: "licensed_via", relationship_type: "many_to_one", relationship_kind: "reference", is_required: true, owner_side: "source" },

  // ILL links
  { source: "interlibrary_loan_requests", target: "library_patrons", relationship_verb: "requested_by", inverse_verb: "has_ill_request", relationship_type: "many_to_one", relationship_kind: "reference", is_required: true, owner_side: "source" },
  { source: "interlibrary_loan_requests", target: "library_sharing_partners", relationship_verb: "fulfilled_by", inverse_verb: "fulfills_request", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { source: "interlibrary_loan_requests", target: "library_loans", relationship_verb: "creates_loan", inverse_verb: "originated_from_ill", relationship_type: "one_to_many", relationship_kind: "succession", is_required: false, owner_side: "source" },
  { source: "interlibrary_loan_requests", target: "bibliographic_records", relationship_verb: "requests_record", inverse_verb: "requested_via_ill", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },

  // discovery links
  { source: "library_saved_searches", target: "library_patrons", relationship_verb: "created_by", inverse_verb: "has_saved_search", relationship_type: "many_to_one", relationship_kind: "reference", is_required: true, owner_side: "source" },

  // users edges (Rule #10)
  { source: "library_loans", target: "users", relationship_verb: "processed_by", inverse_verb: "processed_loan", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { source: "library_holds", target: "users", relationship_verb: "processed_by", inverse_verb: "processed_hold", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { source: "library_fines", target: "users", relationship_verb: "assessed_by", inverse_verb: "assessed_fine", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { source: "library_acquisition_orders", target: "users", relationship_verb: "ordered_by", inverse_verb: "placed_order", relationship_type: "many_to_one", relationship_kind: "reference", is_required: true, owner_side: "source" },
  { source: "bibliographic_records", target: "users", relationship_verb: "cataloged_by", inverse_verb: "cataloged_record", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { source: "library_authorities", target: "users", relationship_verb: "maintained_by", inverse_verb: "maintains_authority", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { source: "interlibrary_loan_requests", target: "users", relationship_verb: "coordinated_by", inverse_verb: "coordinates_ill", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { source: "library_items", target: "users", relationship_verb: "received_by", inverse_verb: "received_item", relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { source: "library_patrons", target: "users", relationship_verb: "linked_to_user", inverse_verb: "is_library_patron", relationship_type: "one_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
];

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log("=== Phase B: LIB-MGMT ===\n");

  // Resolve domain + modules
  const [domain] = await get("/domains?domain_code=eq.LIB-MGMT&select=id");
  if (!domain) throw new Error("Run Phase A first; LIB-MGMT not found.");
  const domainId = Number(domain.id);

  const moduleRows = await get(
    `/domain_modules?domain_id=eq.${domainId}&select=id,domain_module_code`,
  );
  const modMap = new Map<string, number>();
  for (const r of moduleRows) modMap.set(String(r.domain_module_code), Number(r.id));
  if (modMap.size === 0) throw new Error("No LIB-MGMT modules found; rerun Phase A.");

  // Step 1: data_objects (explicitly default booleans so uniformize doesn't insert null)
  console.log("Step 1: data_objects");
  const dataObjectsPayload = dataObjects.map(d => ({
    data_object_name: d.data_object_name,
    singular_label: d.singular_label,
    plural_label: d.plural_label,
    description: d.description,
    is_canonical_bare_word: d.is_canonical_bare_word ?? false,
    naming_authority_rationale: d.naming_authority_rationale ?? "",
    has_personal_content: d.has_personal_content ?? false,
    has_submit_lock: d.has_submit_lock ?? false,
    has_single_approver: d.has_single_approver ?? false,
    kind: "domain_owned",
  }));
  const doMap = await syncByKey("/data_objects", dataObjectsPayload, "data_object_name");

  // Pull users id for relationships
  const [userObj] = await get(
    "/data_objects?data_object_name=eq.users&select=id,kind",
  );
  if (!userObj) throw new Error("users platform_builtin data_object not found.");
  doMap.set("users", Number(userObj.id));

  // Step 2: domain_module_data_objects
  console.log("\nStep 2: domain_module_data_objects");
  const existingDmdo = await get(
    `/domain_module_data_objects?domain_module_id=in.(${[...modMap.values()].join(",")})&select=domain_module_id,data_object_id`,
  );
  const haveDmdo = new Set(
    existingDmdo.map(r => `${r.domain_module_id}|${r.data_object_id}`),
  );
  const dmdoPayload = dmdoRows
    .map(r => ({
      domain_module_id: modMap.get(r.module)!,
      data_object_id: doMap.get(r.data_object)!,
      role: r.role,
      necessity: r.necessity,
    }))
    .filter(r => !haveDmdo.has(`${r.domain_module_id}|${r.data_object_id}`));
  if (dmdoPayload.length > 0) {
    await insert("/domain_module_data_objects", dmdoPayload);
    console.log(`  inserted ${dmdoPayload.length} domain_module_data_objects rows`);
  } else {
    console.log("  all domain_module_data_objects already present");
  }

  // Step 3: data_object_aliases
  console.log("\nStep 3: data_object_aliases");
  const existingAlias = await get(
    `/data_object_aliases?data_object_id=in.(${[...doMap.values()].join(",")})&select=data_object_id,alias_name`,
  );
  const haveAlias = new Set(
    existingAlias.map(r => `${r.data_object_id}|${r.alias_name}`),
  );
  const aliasPayload = aliases
    .map(a => ({
      data_object_id: doMap.get(a.data_object)!,
      alias_name: a.alias_name,
      alias_type: a.alias_type,
    }))
    .filter(a => !haveAlias.has(`${a.data_object_id}|${a.alias_name}`));
  if (aliasPayload.length > 0) {
    await insert("/data_object_aliases", aliasPayload);
    console.log(`  inserted ${aliasPayload.length} data_object_aliases rows`);
  } else {
    console.log("  all data_object_aliases already present");
  }

  // Step 4: data_object_lifecycle_states
  console.log("\nStep 4: data_object_lifecycle_states");
  const existingLcs = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${[...doMap.values()].join(",")})&select=data_object_id,state_name`,
  );
  const haveLcs = new Set(existingLcs.map(r => `${r.data_object_id}|${r.state_name}`));
  const lcsPayload = lifecycleStates
    .map(s => ({
      data_object_id: doMap.get(s.data_object)!,
      state_name: s.state_name,
      state_order: s.state_order,
      description: s.description,
      is_initial: s.is_initial ?? false,
      is_terminal: s.is_terminal ?? false,
      requires_permission: s.requires_permission ?? false,
      permission_verb_override: s.permission_verb_override ?? "",
      domain_module_id: modMap.get(s.module)!,
    }))
    .filter(s => !haveLcs.has(`${s.data_object_id}|${s.state_name}`));
  if (lcsPayload.length > 0) {
    await insert("/data_object_lifecycle_states", lcsPayload);
    console.log(`  inserted ${lcsPayload.length} data_object_lifecycle_states rows`);
  } else {
    console.log("  all data_object_lifecycle_states already present");
  }

  // Step 5: trigger_events
  console.log("\nStep 5: trigger_events");
  const teMap = await syncByKey(
    "/trigger_events",
    triggerEvents.map(t => ({
      event_name: t.event_name,
      data_object_id: doMap.get(t.data_object)!,
      description: t.description,
      from_state: t.from_state ?? "",
      to_state: t.to_state ?? "",
      event_category: t.event_category,
      domain_module_id: t.module ? modMap.get(t.module)! : null,
    })),
    "event_name",
  );

  // Step 6: handoffs
  console.log("\nStep 6: handoffs");
  const existingHo = await get(
    `/handoffs?source_domain_id=eq.${domainId}&target_domain_id=eq.${domainId}&select=trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id`,
  );
  const haveHo = new Set(
    existingHo.map(
      r => `${r.trigger_event_id}|${r.data_object_id}|${r.source_domain_module_id}|${r.target_domain_module_id}`,
    ),
  );
  const hoPayload = handoffs
    .map(h => ({
      source_domain_id: domainId,
      target_domain_id: domainId,
      source_domain_module_id: modMap.get(h.source_module)!,
      target_domain_module_id: modMap.get(h.target_module)!,
      trigger_event_id: teMap.get(h.event_name)!,
      data_object_id: doMap.get(h.data_object)!,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
    }))
    .filter(
      h =>
        !haveHo.has(
          `${h.trigger_event_id}|${h.data_object_id}|${h.source_domain_module_id}|${h.target_domain_module_id}`,
        ),
    );
  if (hoPayload.length > 0) {
    await insert("/handoffs", hoPayload);
    console.log(`  inserted ${hoPayload.length} handoffs rows`);
  } else {
    console.log("  all handoffs already present");
  }

  // Step 7: data_object_relationships
  console.log("\nStep 7: data_object_relationships");
  // Normalize: flip many_to_one to one_to_many (swap source/target/verbs) and
  // map non-supported relationship_kind values to supported ones.
  const normalizedRels = relationships.map(r => {
    let source = r.source;
    let target = r.target;
    let verb = r.relationship_verb;
    let inverse = r.inverse_verb;
    let type: string = r.relationship_type;
    let owner_side: "source" | "target" = r.owner_side;
    if (type === "many_to_one") {
      [source, target] = [target, source];
      [verb, inverse] = [inverse, verb];
      type = "one_to_many";
      owner_side = owner_side === "source" ? "target" : "source";
    }
    let kind: string = r.relationship_kind;
    if (kind === "succession") kind = "reference";
    return {
      source,
      target,
      relationship_verb: verb,
      inverse_verb: inverse,
      relationship_type: type,
      relationship_kind: kind,
      is_required: r.is_required,
      owner_side,
    };
  });
  const allObjIds = [...doMap.values()];
  const existingRel = await get(
    `/data_object_relationships?data_object_id=in.(${allObjIds.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const haveRel = new Set(
    existingRel.map(
      r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`,
    ),
  );
  const relPayload = normalizedRels
    .map(r => ({
      data_object_id: doMap.get(r.source)!,
      related_data_object_id: doMap.get(r.target)!,
      relationship_verb: r.relationship_verb,
      inverse_verb: r.inverse_verb,
      relationship_type: r.relationship_type,
      relationship_kind: r.relationship_kind,
      is_required: r.is_required,
      owner_side: r.owner_side,
    }))
    .filter(
      r => !haveRel.has(`${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
    );
  if (relPayload.length > 0) {
    await insert("/data_object_relationships", relPayload);
    console.log(`  inserted ${relPayload.length} data_object_relationships rows`);
  } else {
    console.log("  all data_object_relationships already present");
  }

  // Summary
  console.log("\n=== Phase B complete ===");
  console.log(`  data_objects: ${doMap.size - 1} library + 1 platform_builtin (users)`);
  console.log(`  domain_module_data_objects: ${dmdoRows.length} authored`);
  console.log(`  aliases: ${aliases.length} authored`);
  console.log(`  lifecycle_states: ${lifecycleStates.length} authored`);
  console.log(`  trigger_events: ${teMap.size}`);
  console.log(`  handoffs: ${handoffs.length} authored (all intra-domain)`);
  console.log(`  relationships: ${relationships.length} authored`);

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log(
    `  https://tests.semantius.app/domain_map/domain_module_data_objects?domain_module_id=in.(${[...modMap.values()].join(",")})`,
  );
  console.log(
    `  https://tests.semantius.app/domain_map/handoffs?source_domain_id=eq.${domainId}`,
  );
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
