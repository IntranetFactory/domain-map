#!/usr/bin/env bun
/**
 * S2P B1 audit technical fixes (2026-05-31 continuation).
 *
 * In scope (per the subagent prompt's truly-technical B1 fix list):
 *
 *   1. B1-S13 (B7): INSERT user-edges in data_object_relationships
 *      (Rule #10) for each of the 5 S2P masters. Audit pre-specifies
 *      the actor role per master. purchase_orders carries TWO actors
 *      (buyer, approver) so it gets two edges, mirroring the
 *      precedent on hardware_assets (rows 256 + 257 carry distinct
 *      assigned / custodian-of verbs against the same target).
 *
 *   2. B1-S18 (B12): PATCH data_object_lifecycle_states row 427
 *      (sourcing_events.awarded) permission_verb_override from
 *      'award_event' (audit calls this awkward) to
 *      'award_sourcing_event'. Audit pre-specifies state + verb.
 *
 *   3. B1-B2: PATCH data_object_relationships row 715
 *      (supplier_invoices.reimbursed_via -> expense_reports)
 *      relationship_verb from the freeform 'reimbursed via invoice'
 *      to the conventional 'reimburses_via'. Audit pre-specifies
 *      row id + new verb.
 *
 *   4. B1-H1: INSERT handoff_processes rows for the 19 untagged
 *      cross-domain handoffs the audit's APQC TAGGING table
 *      pre-specifies. Pre-flight skips:
 *        - handoff 583 + process 811: row 159 already present (exact match).
 *        - handoff 546 + process 805: row 738 already present (exact match).
 *        - handoff 1089: audit explicitly DEFERS (no clean L4 PCF).
 *      Net: 16 new INSERTs out of the 19 audit candidates.
 *      All inserts use proposal_source='agent_curated', role='implements',
 *      record_status default 'new'. The handoff_id is parent-format
 *      (not unique), so multiple PCFs per handoff are allowed; we
 *      only skip exact (handoff_id, process_id) duplicates.
 *
 * Deferred (out of scope this run, per the subagent prompt's
 * defer-list and the audit's own gating notes):
 *
 *   - B1-S1, S2, M1, M2, M4, M5, M6, M7, B9b (S15), B10b (S16),
 *     S3, S4 (E1), S5 (F1), S6 (F2), S8 (F7), N1..N4: all gated on
 *     the M1 module-split decision (Bucket 2 #1). Creates new
 *     modules / entities; out of technical scope.
 *   - B1-A2: 5..8 new capabilities. New entities; gated on Bucket 2 #1.
 *   - B1-A3: Jaggaer duplicate DELETE. User picks survivor (Bucket 2 #2).
 *   - B1-A4: catalog_tagline + catalog_description. Rule #20 backfill
 *     (defer per prompt).
 *   - B1-S11 (B4): pattern flag flips on purchase_orders + sourcing_events.
 *     Defer per prompt ('pattern flag flips').
 *   - B1-S12 (B6): purchase_requisitions -> purchase_orders 'becomes' edge.
 *     Audit text says 'Surface for user approval'; not a Rule #10
 *     user-edge; defer.
 *   - B1-S14 (B9): informational only.
 *   - B1-S17 (B11): ~15 data_object_aliases. Defer per prompt
 *     ('bulk data_object_aliases inserts unless audit pre-specifies
 *     exact tuples'); audit gives counts + vendor examples but no
 *     exact tuples.
 *   - B1-B1: informational only.
 *   - All Bucket 2 (judgment) and Bucket 3 (Phase 0) items.
 *
 * Rule discipline:
 *   - record_status omitted on every INSERT (Rule #1; default 'new').
 *   - Zero writes to any `notes` column (Rule #15).
 *   - No vendor or product names in any text field (Rule #18); the
 *     verbs use generic actor roles (requests, approves, processes,
 *     manages), not vendor terminology.
 *   - No em-dashes anywhere in this file or in any string written.
 *   - American English throughout.
 *
 * Run from project root only (Rule #6):
 *   bun run "c:/dev/domain-map/.tmp_deploy/fix_s2p_b1_technical_2026_05_31.ts"
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const args = ["semantius", "call", "crud", tool];
  const proc = Bun.spawn(args, { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// ---------------------------------------------------------------------------
// B1-S13 (B7): users edges to S2P masters (Rule #10)
// ---------------------------------------------------------------------------
//
// S2P master IDs (verified live):
//   71 sourcing_events
//   72 purchase_requisitions
//   73 purchase_orders
//   74 goods_receipts
//   75 supplier_invoices
//
// Actor roles per audit B1-S13:
//   PR  : requester
//   PO  : buyer + approver  (two edges)
//   GR  : receiver
//   INV : AP clerk
//   RFX : sourcing manager
// ---------------------------------------------------------------------------

const USERS_ID = 748;
const S2P_MASTER_IDS = [71, 72, 73, 74, 75];

type UserEdge = {
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
};

const USER_EDGES: UserEdge[] = [
  // users requests purchase_requisitions (72)
  {
    related_data_object_id: 72,
    relationship_verb: "requests purchase requisitions",
    inverse_verb: "is_requested_by",
  },
  // users approves purchase_orders (73)  -- approver actor
  {
    related_data_object_id: 73,
    relationship_verb: "approves purchase orders",
    inverse_verb: "is_approved_by",
  },
  // users places purchase_orders (73)    -- buyer actor (distinct edge)
  {
    related_data_object_id: 73,
    relationship_verb: "places purchase orders",
    inverse_verb: "is_placed_by",
  },
  // users posts goods_receipts (74)
  {
    related_data_object_id: 74,
    relationship_verb: "posts goods receipts",
    inverse_verb: "is_posted_by",
  },
  // users processes supplier_invoices (75)
  {
    related_data_object_id: 75,
    relationship_verb: "processes supplier invoices",
    inverse_verb: "is_processed_by",
  },
  // users manages sourcing_events (71)
  {
    related_data_object_id: 71,
    relationship_verb: "manages sourcing events",
    inverse_verb: "is_managed_by",
  },
];

async function insertUserEdges() {
  console.log("=== B1-S13 (B7): users edges to S2P masters ===");
  const existing = await get(
    `/data_object_relationships?or=(and(data_object_id.eq.${USERS_ID},related_data_object_id.in.(${S2P_MASTER_IDS.join(",")})),and(related_data_object_id.eq.${USERS_ID},data_object_id.in.(${S2P_MASTER_IDS.join(",")})))&select=id,data_object_id,related_data_object_id,relationship_verb`,
  );
  const seen = new Set<string>();
  for (const e of existing) {
    const a = Number(e.data_object_id);
    const b = Number(e.related_data_object_id);
    const verb = String(e.relationship_verb ?? "");
    seen.add(`${a}|${b}|${verb}`);
    seen.add(`${b}|${a}|${verb}`);
  }
  let inserted = 0;
  let skipped = 0;
  for (const edge of USER_EDGES) {
    const key = `${USERS_ID}|${edge.related_data_object_id}|${edge.relationship_verb}`;
    if (seen.has(key)) {
      console.log(
        `  = users -> ${edge.related_data_object_id} (${edge.relationship_verb}): already present`,
      );
      skipped++;
      continue;
    }
    const body = {
      data_object_id: USERS_ID,
      related_data_object_id: edge.related_data_object_id,
      relationship_verb: edge.relationship_verb,
      inverse_verb: edge.inverse_verb,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
    };
    await post("/data_object_relationships", body);
    console.log(
      `  + users ${edge.relationship_verb} -> ${edge.related_data_object_id}`,
    );
    inserted++;
  }
  console.log(`  total: ${inserted} inserted, ${skipped} skipped\n`);
  return inserted;
}

// ---------------------------------------------------------------------------
// B1-S18 (B12): PATCH lifecycle state 427 permission_verb_override
// ---------------------------------------------------------------------------

async function patchSourcingAwardedVerb() {
  console.log("=== B1-S18 (B12): lifecycle state 427 verb override PATCH ===");
  const rows = await get(
    "/data_object_lifecycle_states?id=eq.427&select=id,data_object_id,state_name,permission_verb_override",
  );
  if (rows.length !== 1) {
    throw new Error(`lifecycle state 427 not found (got ${rows.length})`);
  }
  const r = rows[0];
  if (Number(r.data_object_id) !== 71 || r.state_name !== "awarded") {
    throw new Error(
      `lifecycle state 427 unexpected shape: data_object_id=${r.data_object_id} state_name='${r.state_name}'`,
    );
  }
  const have = String(r.permission_verb_override ?? "");
  if (have === "award_sourcing_event") {
    console.log("  = already 'award_sourcing_event', skipping\n");
    return 0;
  }
  if (have !== "award_event") {
    console.log(
      `  ! unexpected verb '${have}', audit assumed 'award_event'. Skipping (user must decide).\n`,
    );
    return 0;
  }
  await patch("/data_object_lifecycle_states?id=eq.427", {
    permission_verb_override: "award_sourcing_event",
  });
  console.log(
    "  + lifecycle state 427 verb 'award_event' -> 'award_sourcing_event'\n",
  );
  return 1;
}

// ---------------------------------------------------------------------------
// B1-B2: PATCH data_object_relationships row 715 relationship_verb
// ---------------------------------------------------------------------------

async function patchRelationship715Verb() {
  console.log("=== B1-B2: relationship row 715 verb PATCH ===");
  const rows = await get(
    "/data_object_relationships?id=eq.715&select=id,data_object_id,related_data_object_id,relationship_verb",
  );
  if (rows.length !== 1) {
    throw new Error(`relationship row 715 not found (got ${rows.length})`);
  }
  const r = rows[0];
  if (Number(r.data_object_id) !== 75) {
    throw new Error(
      `relationship row 715 unexpected shape: data_object_id=${r.data_object_id} (expected 75 supplier_invoices)`,
    );
  }
  const have = String(r.relationship_verb ?? "");
  if (have === "reimburses_via") {
    console.log("  = already 'reimburses_via', skipping\n");
    return 0;
  }
  if (have !== "reimbursed via invoice") {
    console.log(
      `  ! unexpected verb '${have}', audit assumed 'reimbursed via invoice'. Skipping (user must decide).\n`,
    );
    return 0;
  }
  await patch("/data_object_relationships?id=eq.715", {
    relationship_verb: "reimburses_via",
  });
  console.log(
    "  + relationship 715 verb 'reimbursed via invoice' -> 'reimburses_via'\n",
  );
  return 1;
}

// ---------------------------------------------------------------------------
// B1-H1: handoff_processes tagging (19 audit candidates, 16 new inserts)
// ---------------------------------------------------------------------------
//
// Per the audit's APQC TAGGING table. Each entry is (handoff_id, process_id)
// pre-specified by the auditor. Pre-flight verifies handoff + process exist
// and skips exact-pair duplicates. handoff 1089 is the audit's explicit
// DEFER and is not in this list.
// ---------------------------------------------------------------------------

type HpRow = { handoff_id: number; process_id: number; note: string };

const HANDOFF_PROCESSES: HpRow[] = [
  { handoff_id: 347, process_id: 315, note: "S2P->AGENCY-MGMT vendor_invoice.received" },
  { handoff_id: 565, process_id: 165, note: "S2P->SUP-LIFE sourcing_event.awarded" },
  { handoff_id: 583, process_id: 811, note: "S2P->AP-AUTO purchase_order.changed" },
  { handoff_id: 584, process_id: 315, note: "S2P->AP-AUTO goods_receipt.posted" },
  { handoff_id: 585, process_id: 315, note: "S2P->ERP-FIN goods_receipt.posted" },
  { handoff_id: 586, process_id: 167, note: "S2P->SUP-LIFE goods_receipt.quantity_variance" },
  { handoff_id: 117, process_id: 315, note: "MWO->S2P pm_work_order.invoiced" },
  { handoff_id: 198, process_id: 315, note: "FINOPS->S2P cloud_spend.threshold_breached" },
  { handoff_id: 545, process_id: 1437, note: "AP-AUTO->S2P invoice_match.exception_raised" },
  { handoff_id: 546, process_id: 805, note: "SUP-LIFE->S2P supplier_qualification.approved" },
  { handoff_id: 548, process_id: 805, note: "SUP-LIFE->S2P supplier_qualification.expired" },
  { handoff_id: 560, process_id: 793, note: "SPEND-MGMT->S2P spend_policy.updated" },
  { handoff_id: 636, process_id: 809, note: "SAM->S2P software_license.over_consumed" },
  { handoff_id: 668, process_id: 808, note: "HAM->S2P spare_parts_inventory.low_threshold" },
  { handoff_id: 669, process_id: 808, note: "HAM->S2P hardware_warranty.expiring" },
  { handoff_id: 39, process_id: 808, note: "SMP->S2P shadow_app.requires_sanctioning" },
  { handoff_id: 45, process_id: 808, note: "SMP->S2P seat_demand.exceeded" },
  { handoff_id: 1050, process_id: 811, note: "INV-MGMT->S2P inv_stock_item.below_reorder_point" },
  { handoff_id: 132, process_id: 808, note: "PSA->S2P service_project.staffing_required" },
];

async function insertHandoffProcesses() {
  console.log("=== B1-H1: handoff_processes tagging ===");
  const handoffIds = Array.from(new Set(HANDOFF_PROCESSES.map((r) => r.handoff_id)));
  const processIds = Array.from(new Set(HANDOFF_PROCESSES.map((r) => r.process_id)));
  const [hRows, pRows, hpExisting] = await Promise.all([
    get(`/handoffs?id=in.(${handoffIds.join(",")})&select=id`),
    get(`/processes?id=in.(${processIds.join(",")})&select=id`),
    get(
      `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id`,
    ),
  ]);
  const hSet = new Set(hRows.map((r) => Number(r.id)));
  const pSet = new Set(pRows.map((r) => Number(r.id)));
  const existingPairs = new Set(
    hpExisting.map((r) => `${Number(r.handoff_id)}|${Number(r.process_id)}`),
  );
  const toInsert: Row[] = [];
  let skipped = 0;
  for (const row of HANDOFF_PROCESSES) {
    if (!hSet.has(row.handoff_id)) {
      throw new Error(
        `handoff ${row.handoff_id} not found live; aborting (audit ids may be stale)`,
      );
    }
    if (!pSet.has(row.process_id)) {
      throw new Error(
        `process ${row.process_id} not found live; aborting (audit PCF id may be stale)`,
      );
    }
    const k = `${row.handoff_id}|${row.process_id}`;
    if (existingPairs.has(k)) {
      console.log(
        `  = handoff ${row.handoff_id} -> process ${row.process_id}: already present (${row.note}), skipping`,
      );
      skipped++;
      continue;
    }
    toInsert.push({
      handoff_id: row.handoff_id,
      process_id: row.process_id,
      role: "implements",
      proposal_source: "agent_curated",
    });
  }
  if (toInsert.length === 0) {
    console.log(`  = no new handoff_processes rows to insert (${skipped} already present)\n`);
    return 0;
  }
  const inserted = await post("/handoff_processes", toInsert);
  for (const r of inserted) {
    console.log(
      `  + id=${r.id} handoff=${r.handoff_id} process=${r.process_id}`,
    );
  }
  console.log(`  total: ${inserted.length} inserted, ${skipped} skipped\n`);
  return inserted.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("S2P B1 technical fixes (2026-05-31)\n========================================\n");
  const me = await semCall("getCurrentUser", {});
  console.log(`Tenant: ${me?.email}\n`);

  const counts = {
    userEdges: await insertUserEdges(),
    sourcingAwardedVerb: await patchSourcingAwardedVerb(),
    rel715Verb: await patchRelationship715Verb(),
    handoffProcesses: await insertHandoffProcesses(),
  };

  console.log("=== Summary ===");
  console.log(`  B1-S13 (B7) user edges inserted:      ${counts.userEdges}`);
  console.log(`  B1-S18 (B12) verb override patched:   ${counts.sourcingAwardedVerb}`);
  console.log(`  B1-B2 relationship 715 verb patched:  ${counts.rel715Verb}`);
  console.log(`  B1-H1 handoff_processes inserted:     ${counts.handoffProcesses}`);
  console.log("\nUI spot-checks:");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
