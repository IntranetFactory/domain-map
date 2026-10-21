#!/usr/bin/env bun
// S2P state-driven Validate execute (domain-map-analyst Rule #21), 2026-06-07.
// Works ONLY the open S2P state.yaml items classified EXECUTE:
//   1. entity_type: PATCH the 5 unclassified masters -> operational_workflow (B13 / Rule #12).
//   2. Catalog UX (Rule #20): author empty domains.catalog_tagline + catalog_description on S2P (id 27).
//   3. Aliases (B1A-ALIASES / B11): INSERT generic procurement synonyms across the 5 masters.
//   4. trigger_event category backfill: fill empty event_category on S2P-owned events (deterministic).
//   5. B1A-PR-EVENTS: author the 4 purchase_requisitions trigger_events at record_status='new'.
//   6. B1A-PR-PO-RELATION + B1A-GR-INV-RELATION: INSERT the two missing intra-domain relationship rows.
//
// Idempotent: reads live first, inserts only what is missing, patches only empty/unclassified values.
// record_status omitted on inserts (defaults to 'new'); never approved (Rule #1). No notes write (Rule #15).

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
    const msg = stderr.trim();
    if (/audience|JWT|jwt/.test(msg)) {
      throw new Error(`JWT-AUDIENCE-STOP: ${msg}`);
    }
    throw new Error(`semantius call failed (exit ${exitCode}): ${msg}`);
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

const S2P_DOMAIN_ID = 27;
const MASTERS = [71, 72, 73, 74, 75]; // sourcing_events, purchase_requisitions, purchase_orders, goods_receipts, supplier_invoices

async function main() {
  console.log("=== S2P state-driven execute 2026-06-07 ===\n");

  // ---------------------------------------------------------------
  // 1. entity_type PATCH (B13 / Rule #12): unclassified -> operational_workflow
  //    All 5 masters carry a multi-state lifecycle (draft -> ... -> terminal), so they are
  //    deterministically operational_workflow.
  // ---------------------------------------------------------------
  let entityTypePatched = 0;
  const masterRows = await get(
    `/data_objects?id=in.(${MASTERS.join(",")})&select=id,data_object_name,entity_type`,
  );
  for (const m of masterRows) {
    if (m.entity_type === "unclassified") {
      await patch(`/data_objects?id=eq.${m.id}`, { entity_type: "operational_workflow" });
      console.log(`  entity_type: PATCH ${m.data_object_name} (id ${m.id}) unclassified -> operational_workflow`);
      entityTypePatched++;
    } else {
      console.log(`  entity_type: ${m.data_object_name} already '${m.entity_type}', skip`);
    }
  }

  // ---------------------------------------------------------------
  // 2. Catalog UX (Rule #20): author empty domains.catalog_tagline + catalog_description on S2P.
  //    Buyer voice, workflow + value, no vendor/product names (Rule #18), no em-dash, American English.
  //    NEVER overwrite a non-empty value.
  // ---------------------------------------------------------------
  let catalogUxPatched = 0;
  const [dom] = await get(
    `/domains?id=eq.${S2P_DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  const taglineEmpty = !dom.catalog_tagline || String(dom.catalog_tagline).trim() === "";
  const descEmpty = !dom.catalog_description || String(dom.catalog_description).trim() === "";
  const taglineCopy =
    "Run procurement end to end: source suppliers, raise requisitions, issue purchase orders, receive goods, and match invoices in one connected workflow.";
  const descCopy =
    "Source-to-Pay is the operational backbone of corporate buying. It tracks the requisition, the purchase order, the goods receipt, and the supplier invoice as one connected chain of records, with approvals, three-way matching, and savings tracking layered on top. Buyers raise requisitions and route them through approval, sourcing managers run RFx events and award contracts, receivers post goods receipts against open orders, and accounts-payable specialists match invoices to orders and receipts before payment is released.\n\nThe value is control and speed across the whole buying motion: every dollar of spend is requested, approved, and reconciled against a negotiated price, exceptions are routed instead of stalling the line, and spend categories drive the routing so direct, indirect, services, and tail spend each follow the right path. Teams get a single audit trail from first sourcing event to final payment, fewer maverick purchases, and measurable savings captured at line-item granularity.";
  if (taglineEmpty || descEmpty) {
    const body: Row = {};
    if (taglineEmpty) body.catalog_tagline = taglineCopy;
    if (descEmpty) body.catalog_description = descCopy;
    await patch(`/domains?id=eq.${S2P_DOMAIN_ID}`, body);
    catalogUxPatched = Object.keys(body).length;
    console.log(`  catalog UX: PATCH domains id 27 fields [${Object.keys(body).join(", ")}]`);
  } else {
    console.log("  catalog UX: both fields already non-empty, skip (never overwrite)");
  }

  // ---------------------------------------------------------------
  // 3. Aliases (B1A-ALIASES / B11): generic procurement synonyms, alias_type='synonym'.
  //    Generic industry terms + standard abbreviations only (no vendor product names; Rule #18).
  //    Idempotent on (data_object_id, alias_name).
  // ---------------------------------------------------------------
  const aliasSpecs: { data_object_id: number; alias_name: string }[] = [
    // sourcing_events (71)
    { data_object_id: 71, alias_name: "RFP" },
    { data_object_id: 71, alias_name: "RFI" },
    { data_object_id: 71, alias_name: "RFQ" },
    { data_object_id: 71, alias_name: "Reverse Auction" },
    { data_object_id: 71, alias_name: "Sourcing Event" },
    // purchase_requisitions (72)
    { data_object_id: 72, alias_name: "PR" },
    { data_object_id: 72, alias_name: "Purchase Request" },
    { data_object_id: 72, alias_name: "Requisition" },
    // purchase_orders (73)
    { data_object_id: 73, alias_name: "PO" },
    { data_object_id: 73, alias_name: "Purchase Order" },
    // goods_receipts (74)
    { data_object_id: 74, alias_name: "GR" },
    { data_object_id: 74, alias_name: "Goods Receipt Note" },
    { data_object_id: 74, alias_name: "GRN" },
    // supplier_invoices (75)
    { data_object_id: 75, alias_name: "Supplier Invoice" },
    { data_object_id: 75, alias_name: "Vendor Invoice" },
    { data_object_id: 75, alias_name: "AP Invoice" },
  ];
  const existingAliases = await get(
    `/data_object_aliases?data_object_id=in.(${MASTERS.join(",")})&select=data_object_id,alias_name`,
  );
  const aliasKey = (doid: number, name: string) => `${doid}|${name.toLowerCase()}`;
  const haveAlias = new Set(existingAliases.map(r => aliasKey(Number(r.data_object_id), String(r.alias_name))));
  const aliasMissing = aliasSpecs
    .filter(a => !haveAlias.has(aliasKey(a.data_object_id, a.alias_name)))
    .map(a => ({ data_object_id: a.data_object_id, alias_name: a.alias_name, alias_type: "synonym" }));
  if (aliasMissing.length > 0) {
    await insert("/data_object_aliases", aliasMissing);
  }
  console.log(`  aliases: inserted ${aliasMissing.length} (of ${aliasSpecs.length} specs; ${existingAliases.length} pre-existing)`);

  // ---------------------------------------------------------------
  // 4. trigger_event category backfill: fill EMPTY event_category on S2P-owned events.
  //    Deterministic from the event shape. State transitions -> state_change; variance/exception -> signal.
  //    Only patches rows where event_category is currently empty (additive/corrective fill).
  // ---------------------------------------------------------------
  const categoryByEvent: Record<string, string> = {
    "sourcing_event.launched": "state_change",
    "sourcing_event.awarded": "state_change",
    "purchase_order.issued": "state_change",
    "purchase_order.changed": "state_change",
    "purchase_order.closed": "state_change",
    "goods_receipt.posted": "state_change",
    "goods_receipt.quantity_variance": "signal",
  };
  const eventRows = await get(
    `/trigger_events?data_object_id=in.(${MASTERS.join(",")})&select=id,event_name,event_category`,
  );
  let categoryPatched = 0;
  for (const e of eventRows) {
    const target = categoryByEvent[String(e.event_name)];
    if (!target) continue;
    const cur = e.event_category == null ? "" : String(e.event_category).trim();
    if (cur === "") {
      await patch(`/trigger_events?id=eq.${e.id}`, { event_category: target });
      console.log(`  event_category: PATCH ${e.event_name} (id ${e.id}) '' -> ${target}`);
      categoryPatched++;
    }
  }
  console.log(`  event_category backfill: ${categoryPatched} patched`);

  // ---------------------------------------------------------------
  // 5. B1A-PR-EVENTS: author the 4 purchase_requisitions trigger_events (data_object_id=72).
  //    Deterministic from published lifecycle states. record_status omitted (defaults 'new').
  // ---------------------------------------------------------------
  const prEventSpecs = [
    { event_name: "purchase_requisition.submitted", event_category: "state_change", to_state: "submitted", description: "Fired when a purchase requisition is submitted for approval. Publisher domain owns the state transition; subscribers may react by routing the approval." },
    { event_name: "purchase_requisition.approved", event_category: "state_change", to_state: "approved", description: "Fired when a purchase requisition is approved. Publisher domain owns the state transition; subscribers may react by creating the downstream purchase order." },
    { event_name: "purchase_requisition.po_created", event_category: "state_change", to_state: "po_created", description: "Fired when a purchase order is created from an approved requisition. Publisher domain owns the state transition; subscribers may react by linking the order." },
    { event_name: "purchase_requisition.rejected", event_category: "state_change", to_state: "rejected", description: "Fired when a purchase requisition is rejected. Publisher domain owns the state transition; subscribers may react by notifying the requester." },
  ];
  const existingPrEvents = new Set(eventRows.filter(e => Number(e.data_object_id ?? 72)).map(e => String(e.event_name)));
  // Re-read PR events explicitly for a clean idempotency set.
  const prEventRows = await get(`/trigger_events?data_object_id=eq.72&select=event_name`);
  const havePrEvent = new Set(prEventRows.map(r => String(r.event_name)));
  const prEventMissing = prEventSpecs
    .filter(s => !havePrEvent.has(s.event_name))
    .map(s => ({ ...s, data_object_id: 72, from_state: "" }));
  if (prEventMissing.length > 0) {
    await insert("/trigger_events", prEventMissing);
  }
  console.log(`  PR trigger_events: inserted ${prEventMissing.length} (of ${prEventSpecs.length}; ${prEventRows.length} pre-existing)`);
  void existingPrEvents;

  // ---------------------------------------------------------------
  // 6. Intra-domain relationship rows (B1A-PR-PO-RELATION + B1A-GR-INV-RELATION).
  //    Verbs fully specified by prior audit. Idempotent on (data_object_id, related_data_object_id).
  // ---------------------------------------------------------------
  const relSpecs = [
    {
      data_object_id: 72, related_data_object_id: 73,
      relationship_verb: "becomes", inverse_verb: "originates_from",
      relationship_type: "one_to_many", owner_side: "source", is_required: false,
    },
    {
      data_object_id: 74, related_data_object_id: 75,
      relationship_verb: "confirms", inverse_verb: "confirmed_by",
      relationship_type: "one_to_many", owner_side: "source", is_required: false,
    },
  ];
  let relInserted = 0;
  for (const r of relSpecs) {
    const existing = await get(
      `/data_object_relationships?and=(data_object_id.eq.${r.data_object_id},related_data_object_id.eq.${r.related_data_object_id})&select=id`,
    );
    if (existing.length === 0) {
      await insert("/data_object_relationships", [r]);
      console.log(`  relationship: INSERT ${r.data_object_id} ${r.relationship_verb} ${r.related_data_object_id}`);
      relInserted++;
    } else {
      console.log(`  relationship: ${r.data_object_id}->${r.related_data_object_id} already present (id ${existing[0].id}), skip`);
    }
  }

  // ---------------------------------------------------------------
  console.log("\n=== SUMMARY ===");
  console.log(`  entity_type patched:        ${entityTypePatched}`);
  console.log(`  catalog UX fields written:  ${catalogUxPatched}`);
  console.log(`  aliases inserted:           ${aliasMissing.length}`);
  console.log(`  event_category backfilled:  ${categoryPatched}`);
  console.log(`  PR trigger_events inserted: ${prEventMissing.length}`);
  console.log(`  relationships inserted:     ${relInserted}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(71,72,73,74,75)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.27");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(71,72,73,74,75)");
  console.log("  https://tests.semantius.app/domain_map/trigger_events?data_object_id=in.(71,72,73,74,75)");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
}

main().catch(err => {
  console.error(String(err));
  process.exit(1);
});
