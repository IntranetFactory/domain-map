#!/usr/bin/env bun
// LIB-MGMT (domain 168) state-driven audit execute pass, 2026-06-07.
// Executes the additive/corrective open state items:
//   1. B1A-ENTITY-TYPE: classify entity_type on 16 of 17 masters (826 deferred to B2-S2).
//   2. Catalog UX (Rule #20): backfill empty catalog_tagline/catalog_description on
//      domain 168 + 6 modules (155-160). Only writes where the existing value is empty.
//   3. B1A-S3: backfill ~25 lifecycle-anchored trigger_events (event_category='state_change').
//   4. C1: add Business Operations + Customer Service as contributors on business_function_domains.
//
// Idempotent: reads live, only inserts/patches what is missing. record_status omitted
// (defaults to 'new'). No destructive writes. No approved/pending/rejected stamps.

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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

// ============================================================
// 1. entity_type classification (B1A-ENTITY-TYPE)
// 826 library_holdings intentionally OMITTED: its config-vs-workflow shape is the
// open B2-S2 decision; classifying it pre-empts that decision (surfaced instead).
// ============================================================
const entityTypes: Record<number, string> = {
  823: "operational_workflow", // bibliographic_records (new->published->withdrawn)
  824: "operational_workflow", // library_items (on_order->...->withdrawn)
  825: "operational_workflow", // library_authorities (new->established->obsolete)
  827: "operational_workflow", // library_loans
  828: "operational_workflow", // library_holds
  829: "operational_workflow", // library_fines
  830: "catalog",              // library_circulation_policies (rule definitions)
  831: "operational_workflow", // library_patrons
  832: "catalog",              // library_patron_categories (taxonomy)
  833: "operational_workflow", // library_acquisition_orders
  834: "catalog",              // library_vendor_accounts (reference/config directory)
  835: "operational_workflow", // library_serial_subscriptions
  836: "operational_workflow", // library_eresource_licenses
  837: "operational_record",   // library_saved_searches (per-user saved query, no workflow)
  838: "operational_workflow", // interlibrary_loan_requests
  839: "catalog",              // library_sharing_partners (partner directory/config)
};

async function classifyEntityTypes(): Promise<number> {
  const ids = Object.keys(entityTypes).map(Number);
  const live = await get(
    `/data_objects?id=in.(${ids.join(",")})&select=id,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = entityTypes[id];
    if (!target) continue;
    const cur = r.entity_type;
    if (cur === "unclassified" || cur === null || cur === "") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
      patched++;
    }
  }
  console.log(`entity_type: patched ${patched} masters (target ${ids.length}; 826 deferred to B2-S2)`);
  return patched;
}

// ============================================================
// 2. Catalog UX (Rule #20) — domain 168 + 6 modules.
// Buyer voice: workflow + value, no vendor names, no em-dash, American English.
// Only writes where the current value is empty (never overwrites a non-empty value).
// ============================================================
const domainCopy = {
  tagline: "Run your library: catalog every title, lend every item, serve every patron.",
  description:
    "Manage the whole library operation from one system. Catalog books, journals, " +
    "e-resources, and special collections, and keep authority headings clean. Run daily " +
    "circulation: check out and check in items, place and trap holds, and assess or waive " +
    "fines under your own loan rules. Register patrons, organize them by category, and issue " +
    "cards. Order print and electronic materials, track serial subscriptions and e-resource " +
    "licenses, and reconcile vendor invoices. Publish a searchable catalog for self-service " +
    "discovery, and extend your reach through interlibrary loan with resource-sharing partners.",
};

const moduleCopy: Record<number, { tagline: string; description: string }> = {
  155: {
    tagline: "Describe every title once, find it everywhere.",
    description:
      "Create and maintain bibliographic records, authority headings, and holdings so every " +
      "title is described consistently and surfaces reliably in search. Catalog physical and " +
      "electronic materials, control headings against external authority files, and keep item " +
      "and holdings data accurate from receipt through withdrawal.",
  },
  156: {
    tagline: "Check out, check in, and keep the queue moving.",
    description:
      "Run the daily circulation desk. Loan and return items, renew loans, place holds and trap " +
      "them when copies become available, and manage the pickup queue. Apply loan rules by patron " +
      "and item type, accrue and collect fines, and handle lost and claimed-returned items without " +
      "losing the thread.",
  },
  157: {
    tagline: "Register, organize, and support every patron.",
    description:
      "Manage the patron community from registration to renewal. Create patron accounts, sort them " +
      "into categories that drive borrowing privileges, issue and renew cards, and suspend or " +
      "archive accounts when needed. Keep contact and eligibility data current so circulation and " +
      "discovery work the way each patron expects.",
  },
  158: {
    tagline: "Acquire print and digital materials and keep licenses current.",
    description:
      "Order, receive, and pay for library materials in one acquisitions workflow. Place orders " +
      "with vendors, track partial and full receipts, reconcile invoices, and manage budgets. " +
      "Renew serial subscriptions on schedule and keep e-resource licenses active, renewed, or " +
      "cleanly terminated so access never lapses unexpectedly.",
  },
  159: {
    tagline: "Let patrons find what the library holds, on their own.",
    description:
      "Give patrons a public catalog and search experience over the library's collection. Expose " +
      "titles, availability, and holdings for self-service discovery, let patrons save searches " +
      "and place holds, and connect search results straight to circulation and request workflows.",
  },
  160: {
    tagline: "Borrow what you do not own, lend what others need.",
    description:
      "Fill requests for materials the library does not hold and supply materials to partner " +
      "libraries. Route, accept, ship, and track interlibrary loan requests end to end, manage " +
      "resource-sharing partners, and keep borrowers informed from request through return.",
  },
};

async function backfillCatalogUx(): Promise<{ domain: number; modules: number }> {
  let domainCount = 0;
  let moduleCount = 0;

  const [dom] = await get(
    "/domains?id=eq.168&select=id,catalog_tagline,catalog_description",
  );
  if (dom) {
    const body: Row = {};
    if (!dom.catalog_tagline) body.catalog_tagline = domainCopy.tagline;
    if (!dom.catalog_description) body.catalog_description = domainCopy.description;
    if (Object.keys(body).length > 0) {
      await patch("/domains?id=eq.168", body);
      domainCount = 1;
    }
  }

  const mods = await get(
    "/domain_modules?domain_id=eq.168&select=id,catalog_tagline,catalog_description&order=id",
  );
  for (const m of mods) {
    const id = Number(m.id);
    const copy = moduleCopy[id];
    if (!copy) continue;
    const body: Row = {};
    if (!m.catalog_tagline) body.catalog_tagline = copy.tagline;
    if (!m.catalog_description) body.catalog_description = copy.description;
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${id}`, body);
      moduleCount++;
    }
  }
  console.log(`catalog UX: patched domain=${domainCount}, modules=${moduleCount}`);
  return { domain: domainCount, modules: moduleCount };
}

// ============================================================
// 3. trigger_events backfill (B1A-S3) — ~25 lifecycle-anchored events.
// event_category='state_change', from_state='' (matches existing rows convention).
// Idempotent against event_name.
// ============================================================
type TE = {
  event_name: string;
  data_object_id: number;
  domain_module_id: number;
  to_state: string;
  description: string;
};
const triggerEvents: TE[] = [
  { event_name: "library_item.available", data_object_id: 824, domain_module_id: 155, to_state: "available", description: "Library item became available for loan." },
  { event_name: "library_item.withdrawn", data_object_id: 824, domain_module_id: 155, to_state: "withdrawn", description: "Library item was withdrawn from the collection." },
  { event_name: "library_authority.established", data_object_id: 825, domain_module_id: 155, to_state: "established", description: "Library authority heading was established as controlled." },
  { event_name: "library_loan.renewed", data_object_id: 827, domain_module_id: 156, to_state: "renewed", description: "Library loan was renewed for another period." },
  { event_name: "library_loan.returned", data_object_id: 827, domain_module_id: 156, to_state: "returned", description: "Library loan was returned by the patron." },
  { event_name: "library_loan.lost", data_object_id: 827, domain_module_id: 156, to_state: "lost", description: "Library loan was marked lost." },
  { event_name: "library_hold.trapped", data_object_id: 828, domain_module_id: 156, to_state: "trapped", description: "Library hold was trapped when a copy became available." },
  { event_name: "library_hold.fulfilled", data_object_id: 828, domain_module_id: 156, to_state: "fulfilled", description: "Library hold was fulfilled and picked up by the patron." },
  { event_name: "library_hold.cancelled", data_object_id: 828, domain_module_id: 156, to_state: "cancelled", description: "Library hold was cancelled." },
  { event_name: "library_fine.paid", data_object_id: 829, domain_module_id: 156, to_state: "paid", description: "Library fine was paid by the patron." },
  { event_name: "library_fine.waived", data_object_id: 829, domain_module_id: 156, to_state: "waived", description: "Library fine was waived by staff." },
  { event_name: "library_fine.sent_to_collections", data_object_id: 829, domain_module_id: 156, to_state: "sent_to_collections", description: "Library fine was sent to collections." },
  { event_name: "library_patron.activated", data_object_id: 831, domain_module_id: 157, to_state: "active", description: "Library patron account was activated." },
  { event_name: "library_patron.archived", data_object_id: 831, domain_module_id: 157, to_state: "archived", description: "Library patron account was archived." },
  { event_name: "library_acquisition_order.submitted", data_object_id: 833, domain_module_id: 158, to_state: "submitted", description: "Library acquisition order was submitted for ordering." },
  { event_name: "library_acquisition_order.cancelled", data_object_id: 833, domain_module_id: 158, to_state: "cancelled", description: "Library acquisition order was cancelled." },
  { event_name: "library_serial_subscription.renewed", data_object_id: 835, domain_module_id: 158, to_state: "renewed", description: "Library serial subscription was renewed for another term." },
  { event_name: "library_serial_subscription.cancelled", data_object_id: 835, domain_module_id: 158, to_state: "cancelled", description: "Library serial subscription was cancelled." },
  { event_name: "library_eresource_license.activated", data_object_id: 836, domain_module_id: 158, to_state: "active", description: "Library e-resource license was activated." },
  { event_name: "library_eresource_license.renewed", data_object_id: 836, domain_module_id: 158, to_state: "renewed", description: "Library e-resource license was renewed." },
  { event_name: "library_eresource_license.terminated", data_object_id: 836, domain_module_id: 158, to_state: "terminated", description: "Library e-resource license was terminated." },
  { event_name: "interlibrary_loan_request.routed", data_object_id: 838, domain_module_id: 160, to_state: "routed", description: "Interlibrary loan request was routed to a supplying partner." },
  { event_name: "interlibrary_loan_request.accepted", data_object_id: 838, domain_module_id: 160, to_state: "accepted", description: "Interlibrary loan request was accepted by a supplying partner." },
  { event_name: "interlibrary_loan_request.shipped", data_object_id: 838, domain_module_id: 160, to_state: "shipped", description: "Interlibrary loan request material was shipped." },
  { event_name: "interlibrary_loan_request.completed", data_object_id: 838, domain_module_id: 160, to_state: "completed", description: "Interlibrary loan request was completed." },
  { event_name: "interlibrary_loan_request.cancelled", data_object_id: 838, domain_module_id: 160, to_state: "cancelled", description: "Interlibrary loan request was cancelled." },
];

async function backfillTriggerEvents(): Promise<number> {
  const existing = await get(
    "/trigger_events?data_object_id=in.(823,824,825,826,827,828,829,830,831,832,833,834,835,836,837,838,839)&select=event_name",
  );
  const have = new Set(existing.map(r => String(r.event_name)));
  const missing = triggerEvents
    .filter(t => !have.has(t.event_name))
    .map(t => ({
      event_name: t.event_name,
      data_object_id: t.data_object_id,
      domain_module_id: t.domain_module_id,
      event_category: "state_change",
      from_state: "",
      to_state: t.to_state,
      description: t.description,
    }));
  if (missing.length > 0) {
    await insert("/trigger_events", missing);
  }
  console.log(`trigger_events: inserted ${missing.length} (of ${triggerEvents.length}; ${have.size} already present)`);
  return missing.length;
}

// ============================================================
// 4. C1 business_function_domains contributors.
// Adds clearly-correct contributors WITHOUT touching the existing R&D owner row
// (the owner-flip is the open B2-S3 decision, surfaced not executed).
//   Business Operations (34) — technical services: cataloging, acquisitions, serials.
//   Customer Service (24)     — public services: circulation, patron support.
// ============================================================
const bfdRows = [
  { business_function_id: 34, responsibility_type: "contributor", business_function_domain_label: "Business Operations / Library Management" },
  { business_function_id: 24, responsibility_type: "contributor", business_function_domain_label: "Customer Service / Library Management" },
];

async function backfillBfd(): Promise<number> {
  const existing = await get(
    "/business_function_domains?domain_id=eq.168&select=business_function_id",
  );
  const have = new Set(existing.map(r => Number(r.business_function_id)));
  const missing = bfdRows
    .filter(r => !have.has(r.business_function_id))
    .map(r => ({ domain_id: 168, ...r }));
  if (missing.length > 0) {
    await insert("/business_function_domains", missing);
  }
  console.log(`business_function_domains: inserted ${missing.length} contributor rows`);
  return missing.length;
}

// ============================================================
async function main() {
  console.log("== LIB-MGMT (168) state-driven audit execute, 2026-06-07 ==");
  const et = await classifyEntityTypes();
  const ux = await backfillCatalogUx();
  const te = await backfillTriggerEvents();
  const bfd = await backfillBfd();
  console.log("\n== Summary ==");
  console.log(`entity_type patched:        ${et}`);
  console.log(`catalog UX domain patched:  ${ux.domain}`);
  console.log(`catalog UX modules patched: ${ux.modules}`);
  console.log(`trigger_events inserted:    ${te}`);
  console.log(`business_function_domains:  ${bfd}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/business_function_domains");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
