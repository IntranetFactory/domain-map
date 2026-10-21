#!/usr/bin/env bun
// RE-PROP-MGMT B1 technical fixes (audit dated 2026-05-30, continuation 2026-05-31).
//
// Apply ONLY the technically-deterministic B1 items from audits/RE-PROP-MGMT.md:
//
//   B1-S8 (B9 enum backfill)
//     PATCH trigger_events.id IN (957,958,959,960,961) event_category per audit:
//       957 rental_unit.listed    -> lifecycle
//       958 rental_unit.occupied  -> state_change
//       959 rental_unit.vacant    -> state_change
//       960 rental_lease.executed -> lifecycle
//       961 rental_lease.renewed  -> lifecycle
//
//   B1-S7 (B7)  INSERT users -> RE-PROP-MGMT master data_object_relationships
//               (Rule #10), 5 edges audit pre-specifies.
//
//   B1-M7       INSERT domain_regulations row linking FCRA (id 84) to
//               RE-PROP-MGMT (id 144), applicability=mandatory (FCRA section 604
//               binds residential tenant screening; audit prose names it
//               regulatory anchor for tenant_screening_reports). condition_notes
//               and notes omitted -> '' (Rule #15).
//
//   B1-S11 (B11) INSERT data_object_aliases on 4 non-self-explanatory masters,
//                10 rows audit pre-specifies as exact alias text.
//
//   B1 APQC TAGGING  INSERT handoff_processes for confident L3/L4 + medium L4
//                    pairs the audit pre-specifies AND that have no existing tag
//                    on that (handoff_id, process_id) pair:
//                      298 -> 303  (Process accounts receivable (AR))    confident L3
//                      864 -> 1353 (Post receivable entries)             confident L4
//                      300 -> 1627 (Receive work product...)             medium L4
//                      301 -> 1351 (Generate customer billing data)      medium L4
//                    Audit explicitly defers 310 + 865 to Discover Pass 3.
//                    Handoff 296 (1860) and 299 (824) already tagged; skip.
//
// Everything else from the B1 list is deferred per the run prompt:
//   - M-band (B1-S1/S2/S3/S4): new modules + Rule #20 catalog UX -> Bucket 2 #1, #2.
//   - B6 intra-domain relationships: audit prose only; tuples not pre-specified
//     (relationship_kind/owner_side/is_required require judgment per edge).
//   - B9 missing handoffs (S9): new handoffs without pre-specified handoff_id.
//   - B10b FK PATCHes: source_domain_module_id blocked by zero RE-PROP-MGMT
//     modules; target_domain_module_id non-derivable (target domains either
//     have no modules at all, or their modules do not hold the payload
//     data_object per /domain_module_data_objects).
//   - B12 lifecycle states: per-state domain_module_id needed -> blocked by M.
//   - F1 (legacy skill 98 delete): gated on Phase S module-skill creation.
//   - M1-M5, U1-U7, M6 (Fair Housing): new entities/regs -> deferred.
//   - WO1 supplier_invoices reclassification: audit "Likely scope-creep" -> judgment.
//   - B1-B1/B1-B2 boundary: gated on M-band.
//   - APQC 310, 865: audit-stated low confidence + explicit defer.
//   - notes reverts: audit does not pre-specify row IDs to revert.

import { $ } from "bun";

$.throws(false);

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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function post(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

// ----------------------------------------------------------------------------
// B1-S8: PATCH trigger_events.event_category per audit-pre-specified mapping.
// ----------------------------------------------------------------------------
const eventCategoryUpdates: Array<{ id: number; event_category: string }> = [
  { id: 957, event_category: "lifecycle"    }, // rental_unit.listed
  { id: 958, event_category: "state_change" }, // rental_unit.occupied
  { id: 959, event_category: "state_change" }, // rental_unit.vacant
  { id: 960, event_category: "lifecycle"    }, // rental_lease.executed
  { id: 961, event_category: "lifecycle"    }, // rental_lease.renewed
];

async function fixTriggerEventCategories() {
  const ids = eventCategoryUpdates.map(u => u.id);
  const before = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`
  );
  const have = new Map<number, string>();
  for (const r of before) have.set(Number(r.id), String(r.event_category ?? ""));
  let patched = 0;
  for (const u of eventCategoryUpdates) {
    const cur = have.get(u.id) ?? "";
    if (cur === u.event_category) continue;
    await patch(`/trigger_events?id=eq.${u.id}`, { event_category: u.event_category });
    patched++;
  }
  console.log(
    `B1-S8 OK: PATCHed ${patched} trigger_events.event_category (of ${ids.length}).`
  );
}

// ----------------------------------------------------------------------------
// B1-S7 (B7): users -> RE-PROP-MGMT master data_object_relationships per Rule #10.
//
// Canonical direction (per existing rows on users id=748): data_object_id=748
// (subject), related_data_object_id=<master>, verb in users-voice, inverse in
// master-voice.
// ----------------------------------------------------------------------------
const USERS_ID = 748;

type UserEdge = {
  related: number;       // master data_object_id
  verb: string;          // users-voice
  inverse: string;       // master-voice
};

const userEdges: UserEdge[] = [
  // users manages rental_units (property_manager)
  { related: 357, verb: "manages rental units",            inverse: "is_managed_by"  },
  // users assigned-to tenant_maintenance_requests (coordinator)
  { related: 361, verb: "assigned maintenance requests",   inverse: "is_assigned_to" },
  // users reviews rental_applications (leasing_agent)
  { related: 359, verb: "reviewed applications",           inverse: "is_reviewed_by" },
  // users approves rental_applications (manager)
  { related: 359, verb: "approved applications",           inverse: "is_approved_by" },
  // users records rent_payments (bookkeeper)
  { related: 360, verb: "recorded rent payments",          inverse: "is_recorded_by" },
];

async function fixUsersEdges() {
  const relatedIds = Array.from(new Set(userEdges.map(e => e.related)));
  const existing = await get(
    `/data_object_relationships?and=(data_object_id.eq.${USERS_ID},related_data_object_id.in.(${relatedIds.join(",")}))&select=id,related_data_object_id,relationship_verb`
  );
  const have = new Set(
    existing.map(r => `${r.related_data_object_id}|${String(r.relationship_verb).toLowerCase()}`)
  );
  const missing = userEdges.filter(
    e => !have.has(`${e.related}|${e.verb.toLowerCase()}`)
  );
  if (missing.length === 0) {
    console.log("B1-S7 SKIP: all users edges already present.");
    return;
  }
  const rows = missing.map(e => ({
    data_object_id: USERS_ID,
    related_data_object_id: e.related,
    owner_side: "target",          // master row owns the lifecycle, not the user
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: e.verb,
    inverse_verb: e.inverse,
    is_required: false,
    // record_status omitted -> default 'new' (Rule #1)
    // notes omitted -> default '' (Rule #15)
  }));
  await post("/data_object_relationships", rows);
  console.log(`B1-S7 OK: INSERTed ${rows.length} users -> RE-PROP-MGMT master edges.`);
}

// ----------------------------------------------------------------------------
// B1-M7: INSERT domain_regulations linking FCRA (id 84) to RE-PROP-MGMT (id 144).
// FCRA section 604 governs consumer reports for tenancy; mandatory per audit prose.
// ----------------------------------------------------------------------------
const RE_PROP_MGMT_ID = 144;
const FCRA_ID = 84;

async function fixFcraDomainRegulation() {
  const existing = await get(
    `/domain_regulations?and=(domain_id.eq.${RE_PROP_MGMT_ID},regulation_id.eq.${FCRA_ID})&select=id`
  );
  if (existing.length > 0) {
    console.log("B1-M7 SKIP: FCRA already linked to RE-PROP-MGMT.");
    return;
  }
  await post("/domain_regulations", [
    {
      domain_id: RE_PROP_MGMT_ID,
      regulation_id: FCRA_ID,
      applicability: "mandatory",
      // condition_notes omitted -> ''
      // notes omitted -> '' (Rule #15)
      // record_status omitted -> 'new' (Rule #1)
    },
  ]);
  console.log("B1-M7 OK: INSERTed domain_regulations FCRA -> RE-PROP-MGMT.");
}

// ----------------------------------------------------------------------------
// B1-S11 (B11): data_object_aliases for non-self-explanatory masters.
// Audit pre-specifies the exact alias text per master.
// ----------------------------------------------------------------------------
const aliases: Array<{ data_object_id: number; alias_name: string }> = [
  // rental_units (357)
  { data_object_id: 357, alias_name: "Apartment" },
  { data_object_id: 357, alias_name: "Unit" },
  { data_object_id: 357, alias_name: "Door" },
  // property_tenants (358)
  { data_object_id: 358, alias_name: "Resident" },
  { data_object_id: 358, alias_name: "Renter" },
  { data_object_id: 358, alias_name: "Lessee" },
  // rental_applications (359)
  { data_object_id: 359, alias_name: "Application" },
  { data_object_id: 359, alias_name: "Lease App" },
  // rental_leases (362)
  { data_object_id: 362, alias_name: "Lease" },
  { data_object_id: 362, alias_name: "Rental Agreement" },
];

async function fixAliases() {
  const ids = Array.from(new Set(aliases.map(a => a.data_object_id)));
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids.join(",")})&select=id,data_object_id,alias_name`
  );
  const have = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`)
  );
  const missing = aliases.filter(
    a => !have.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`)
  );
  if (missing.length === 0) {
    console.log("B1-S11 SKIP: all aliases already present.");
    return;
  }
  const rows = missing.map(a => ({
    data_object_id: a.data_object_id,
    alias_name: a.alias_name,
    // alias_type, is_preferred, record_status, notes -> column defaults
  }));
  await post("/data_object_aliases", rows);
  console.log(`B1-S11 OK: INSERTed ${rows.length} data_object_aliases.`);
}

// ----------------------------------------------------------------------------
// B1 APQC TAGGING: handoff_processes inserts for audit-pre-specified L3/L4 pairs.
// Skip any (handoff_id, process_id) already present.
// ----------------------------------------------------------------------------
const handoffTags: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 298, process_id: 303  }, // RE-PROP-MGMT -> AP-AUTO, rent_payment.received  (confident L3)
  { handoff_id: 864, process_id: 1353 }, // RE-PROP-MGMT -> ERP-FIN, rent_payment.received  (confident L4)
  { handoff_id: 300, process_id: 1627 }, // RE-PROP-MGMT -> LSD,     property_tenant.evicted (medium L4)
  { handoff_id: 301, process_id: 1351 }, // RE-PROP-MGMT -> RE-INVEST, rent_payment.received (medium L4)
];

async function fixHandoffProcesses() {
  // Verify all processes exist.
  const processIds = Array.from(new Set(handoffTags.map(t => t.process_id)));
  const procRows = await get(`/processes?id=in.(${processIds.join(",")})&select=id`);
  const procHave = new Set(procRows.map(r => Number(r.id)));
  for (const pid of processIds) {
    if (!procHave.has(pid)) {
      throw new Error(`APQC abort: process_id ${pid} not found in /processes`);
    }
  }
  // Pre-flight: per (handoff_id, process_id) idempotency.
  const handoffIds = Array.from(new Set(handoffTags.map(t => t.handoff_id)));
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id`
  );
  const have = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  const missing = handoffTags.filter(t => !have.has(`${t.handoff_id}|${t.process_id}`));
  if (missing.length === 0) {
    console.log("APQC SKIP: all handoff_processes tags already present.");
    return;
  }
  const rows = missing.map(t => ({
    handoff_id: t.handoff_id,
    process_id: t.process_id,
    role: "implements",
    proposal_source: "agent_curated",
    // record_status omitted -> 'new' (Rule #1)
    // notes omitted -> '' (Rule #15)
  }));
  await post("/handoff_processes", rows);
  console.log(`APQC OK: INSERTed ${rows.length} handoff_processes rows.`);
}

// ----------------------------------------------------------------------------
// Drive
// ----------------------------------------------------------------------------
async function main() {
  console.log("RE-PROP-MGMT B1 technical fixes, 2026-05-31");
  await fixTriggerEventCategories();
  await fixUsersEdges();
  await fixFcraDomainRegulation();
  await fixAliases();
  await fixHandoffProcesses();
  console.log("Done.");
}

await main();
