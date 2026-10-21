#!/usr/bin/env bun
// ECM B1 technical fixes residual pass (audits/ECM.md, 2026-05-30 audit).
//
// Applies only audit-specified, technical, no-judgment fixes. Audit's
// "Fixes applied" section is empty (Validate b1 is read-only), so every
// Bucket 1 item not blocked by user judgment is in scope here.
//
//  1. B1-S5: INSERT 6 domain_regulations rows linking ECM (domain 91) to
//     SOX, GDPR, HIPAA, GLBA, FDA 21 CFR Part 11, eIDAS. Mapping the
//     audit's "industry" applicability to the enum value 'conditional'
//     (per Rule #13, only mandatory/recommended/conditional/optional are
//     valid; the audit's wording matches the conditional definition).
//
//  2. B1-S8a: PATCH trigger_events.event_category on event 900 to
//     'state_change' (currently empty string; enum backfill per Rule #13).
//     The audit pre-specifies this is a state transition on
//     content_documents.
//
//  3. B1-S8b: PATCH trigger_events.event_name on event 900 from
//     'legal_hold.placed' to 'content_document.legal_hold_applied'
//     (audit's recommended rename to keep ECM ownership of the state
//     transition on content_documents while making clear it is NOT the
//     LSD-published legal_hold.issued event 1042).
//
//  4. B1-APQC-DELETE: DELETE the 5 discovery_substring handoff_processes
//     rows (ids 161, 162, 163, 164, 165) that mis-attribute ECM handoffs
//     to PCF process 339 'Document trade' (international-trade documents,
//     not ECM content). Audit pre-specifies these IDs and recommends
//     DELETE.
//
//  5. B1-APQC-INSERT: INSERT 13 new agent_curated handoff_processes rows
//     for ECM handoffs where no agent_curated row exists yet. Audit
//     pre-specifies handoff_id + PCF process_id for all 18, but 5 of them
//     (handoffs 911, 912, 915, 1028, 1031) already carry agent_curated
//     rows authored by the LSD loader pointing at different PCFs; without
//     explicit user license to overwrite prior agent_curated decisions,
//     those 5 are skipped here (logged for awareness).
//
// All deferred items remain untouched:
//   - B1-S1 / S2 / S3 (module split + capability links): gated on
//     Bucket 2 #2 user judgment (module shape).
//   - B1-S4 (new solutions): new entities, deferred.
//   - B1-S6 (catalog_tagline / catalog_description): Rule #20, deferred.
//   - B1-S7 (content_documents rename): Bucket 2 #3 user judgment.
//   - B1-B1 / B2 / B3 / B4 / B5 (handoff module FKs + intra-domain
//     handoffs): gated on B1-S1 module split.
//   - B1-B6 (DELETE rows 300/301): Bucket 2 #4 owner review.
//   - B1-L1..L5 (lifecycle states): need domain_module_id from
//     module split (M5).
//   - Existing agent_curated handoff_processes rows on 911/912/915/1028/
//     1031: prior curated decisions, not stale per audit.
//
// Idempotent: re-reads each target before writing; skips already-correct
// rows.

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

async function post(path: string, body: Row | Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

async function del(path: string): Promise<Row[]> {
  return call({ method: "DELETE", path });
}

const ECM_DOMAIN_ID = 91;

// ---------------------------------------------------------------------------
// B1-S5: INSERT 6 domain_regulations for ECM
// ---------------------------------------------------------------------------
// regulation_ids verified live before this script ran:
//   SOX  = 5    GDPR  = 1    HIPAA = 4
//   GLBA = 47   eIDAS = 34   FDA 21 CFR Part 11 = 22
//
// Applicability mapping (audit -> enum):
//   "mandatory" -> 'mandatory'
//   "industry"  -> 'conditional'  (industry-scoped applicability matches
//                                  the 'conditional' enum description:
//                                  "applies under specific circumstances")
//
// record_status omitted -> default 'new' per Rule #1.
// condition_notes / notes omitted -> default '' per Rule #15.

const domainRegulationRows: Array<{
  regulation_id: number;
  applicability: "mandatory" | "recommended" | "conditional" | "optional";
  reg_label: string; // for logging only
}> = [
  { regulation_id: 5,  applicability: "mandatory",   reg_label: "SOX" },
  { regulation_id: 1,  applicability: "mandatory",   reg_label: "GDPR" },
  { regulation_id: 4,  applicability: "conditional", reg_label: "HIPAA" },
  { regulation_id: 47, applicability: "conditional", reg_label: "GLBA" },
  { regulation_id: 22, applicability: "conditional", reg_label: "FDA-21CFR11" },
  { regulation_id: 34, applicability: "conditional", reg_label: "eIDAS" },
];

async function insertDomainRegulations() {
  const existing = await get(
    `/domain_regulations?domain_id=eq.${ECM_DOMAIN_ID}&select=id,regulation_id`
  );
  const existingRegIds = new Set(existing.map(r => Number(r.regulation_id)));
  const toInsert = domainRegulationRows
    .filter(r => !existingRegIds.has(r.regulation_id))
    .map(r => ({
      domain_id: ECM_DOMAIN_ID,
      regulation_id: r.regulation_id,
      applicability: r.applicability,
    }));
  console.log(
    `B1-S5: ${domainRegulationRows.length} target rows; ${existing.length} already linked; inserting ${toInsert.length}`
  );
  if (toInsert.length > 0) {
    const out = await post(`/domain_regulations`, toInsert);
    console.log(`  INSERTED ${out.length} domain_regulations rows`);
    for (const r of domainRegulationRows.filter(r => !existingRegIds.has(r.regulation_id))) {
      console.log(`    + ${r.reg_label} (${r.applicability})`);
    }
  }
  return { inserted: toInsert.length, existing: existing.length };
}

// ---------------------------------------------------------------------------
// B1-S8a: PATCH event_category on trigger_event 900
// ---------------------------------------------------------------------------

async function fixEventCategory() {
  const rows = await get(
    `/trigger_events?id=eq.900&select=id,event_name,event_category`
  );
  if (rows.length === 0) {
    console.warn(`B1-S8a: trigger_event 900 not found; skipping`);
    return { patched: 0, skipped: 0 };
  }
  const ev = rows[0];
  if (String(ev.event_category) === "state_change") {
    console.log(`B1-S8a: trigger_event 900 already 'state_change'; skipping`);
    return { patched: 0, skipped: 1 };
  }
  await patch(`/trigger_events?id=eq.900`, { event_category: "state_change" });
  console.log(`B1-S8a: PATCHED trigger_event 900 event_category '' -> 'state_change'`);
  return { patched: 1, skipped: 0 };
}

// ---------------------------------------------------------------------------
// B1-S8b: PATCH event_name rename on trigger_event 900
// ---------------------------------------------------------------------------
// Old: legal_hold.placed -> the LSD-published event by name shape, but
//      attributed to ECM's content_documents (id 429), causing confusion
//      with LSD's legal_hold.issued (1042).
// New: content_document.legal_hold_applied -> keeps the event ECM-owned
//      (data_object_id stays 429), makes clear it is the document-side
//      transition, not the legal-hold issuance event.

async function renameEvent900() {
  const rows = await get(
    `/trigger_events?id=eq.900&select=id,event_name,data_object_id`
  );
  if (rows.length === 0) {
    console.warn(`B1-S8b: trigger_event 900 not found; skipping`);
    return { patched: 0, skipped: 0 };
  }
  const ev = rows[0];
  const target = "content_document.legal_hold_applied";
  if (String(ev.event_name) === target) {
    console.log(`B1-S8b: trigger_event 900 already '${target}'; skipping`);
    return { patched: 0, skipped: 1 };
  }
  if (Number(ev.data_object_id) !== 429) {
    throw new Error(
      `B1-S8b: SAFETY: trigger_event 900 data_object_id is ${ev.data_object_id}, expected 429 (content_documents). Refusing to rename.`
    );
  }
  await patch(`/trigger_events?id=eq.900`, { event_name: target });
  console.log(`B1-S8b: PATCHED trigger_event 900 event_name '${ev.event_name}' -> '${target}'`);
  return { patched: 1, skipped: 0 };
}

// ---------------------------------------------------------------------------
// B1-APQC-DELETE: 5 discovery_substring handoff_processes rows
// ---------------------------------------------------------------------------
// Audit explicitly names ids 161-165 (5 rows pointing handoffs 822, 825,
// 826, 827, 839 at process 339 'Document trade'). Audit recommends
// DELETE since they are demonstrably wrong attributions.

const staleHandoffProcessIds = [161, 162, 163, 164, 165];

async function deleteStaleHandoffProcesses() {
  // Verify each row exists and matches the audit's description before
  // deleting (process_id=339).
  const existing = await get(
    `/handoff_processes?id=in.(${staleHandoffProcessIds.join(",")})&select=id,handoff_id,process_id,proposal_source`
  );
  const safeToDelete = existing.filter(
    r => Number(r.process_id) === 339 && r.proposal_source === "discovery_substring"
  );
  const unsafe = existing.filter(
    r => Number(r.process_id) !== 339 || r.proposal_source !== "discovery_substring"
  );
  if (unsafe.length > 0) {
    console.warn(`B1-APQC-DELETE: ${unsafe.length} row(s) drifted; skipping those:`);
    for (const r of unsafe) {
      console.warn(`    id=${r.id} handoff=${r.handoff_id} process=${r.process_id} source=${r.proposal_source}`);
    }
  }
  console.log(
    `B1-APQC-DELETE: ${existing.length} found; ${safeToDelete.length} match (proc 339 + discovery_substring); deleting`
  );
  let deleted = 0;
  for (const r of safeToDelete) {
    await del(`/handoff_processes?id=eq.${r.id}`);
    console.log(`    DELETED handoff_processes.id=${r.id} (handoff=${r.handoff_id})`);
    deleted += 1;
  }
  return { deleted, found: existing.length };
}

// ---------------------------------------------------------------------------
// B1-APQC-INSERT: 13 new agent_curated handoff_processes
// ---------------------------------------------------------------------------
// Audit pre-specifies process_id for all 18 ECM handoffs. We insert only
// the ones where no agent_curated row exists yet:
//   - 5 handoffs (911, 912, 915, 1028, 1031) already carry agent_curated
//     rows authored by the LSD loader pointing at different PCFs (373,
//     396, 373, 373, 397). Per Rule #1, those decisions stay (no user
//     license to overwrite prior curated work).
//   - 5 handoffs (822, 825, 826, 827, 839) currently carry stale
//     discovery_substring rows being deleted above; the agent_curated
//     replacement lands cleanly after the delete.
//   - 8 handoffs (821, 823, 824, 839 dup with above intentional, 732,
//     735, 919, 828, 829) have no prior handoff_processes row.
//
// All process_ids verified live (83=Manage Content L2, 428=Develop and
// manage content L3, 429=Deliver approved content L3, 430=Control
// delivered content L3, 1440=Retain records L4).

const handoffProcessRows: Array<{ handoff_id: number; process_id: number; note: string }> = [
  { handoff_id: 821, process_id: 83,   note: "ECM->DLP content_document.uploaded (L2, no clean L3)" },
  { handoff_id: 822, process_id: 428,  note: "ECM->DLP document.classified" },
  { handoff_id: 823, process_id: 430,  note: "ECM->IGA document_folder.permissions_changed" },
  { handoff_id: 839, process_id: 428,  note: "ECM->IGA document.classified" },
  { handoff_id: 824, process_id: 430,  note: "ECM->LSD legal_hold.placed" },
  { handoff_id: 825, process_id: 1440, note: "ECM->AUDIT document.retention_expired (L4)" },
  { handoff_id: 826, process_id: 429,  note: "ECM->KMS document.version_published" },
  { handoff_id: 827, process_id: 430,  note: "ECM->GRC document.classified" },
  { handoff_id: 732, process_id: 428,  note: "IDP->ECM extracted_record.completed" },
  { handoff_id: 735, process_id: 428,  note: "IDP->ECM document_classification_result.uncertain" },
  { handoff_id: 919, process_id: 429,  note: "LEGAL-PRACT-MGMT->ECM court_filing.submitted" },
  { handoff_id: 828, process_id: 428,  note: "WSC->ECM chat_attachment.shared" },
  { handoff_id: 829, process_id: 1440, note: "WSC->ECM chat_channel.archived (L4)" },
];

// Conflicting prior-curated handoffs (not touched; logged):
const skippedHandoffs = [911, 912, 915, 1028, 1031];

async function insertHandoffProcesses() {
  const handoffIds = [
    ...handoffProcessRows.map(r => r.handoff_id),
    ...skippedHandoffs,
  ];
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id,proposal_source`
  );
  const agentCuratedByHandoff = new Map<number, Row>();
  for (const r of existing) {
    if (r.proposal_source === "agent_curated") {
      agentCuratedByHandoff.set(Number(r.handoff_id), r);
    }
  }

  // Sanity: warn if a row we plan to insert already has an agent_curated
  // tag on a DIFFERENT process_id (would be a silent conflict).
  for (const target of handoffProcessRows) {
    const prior = agentCuratedByHandoff.get(target.handoff_id);
    if (prior && Number(prior.process_id) !== target.process_id) {
      console.warn(
        `  CONFLICT: handoff ${target.handoff_id} already has agent_curated -> process ${prior.process_id}; audit proposes ${target.process_id}; skipping`
      );
    }
  }

  // Build insert set: skip if an agent_curated row exists at all for
  // that handoff (whether matching process_id or not). Per Rule #15 we
  // do not silently overwrite prior agent-curated decisions.
  const toInsert = handoffProcessRows
    .filter(r => !agentCuratedByHandoff.has(r.handoff_id))
    .map(r => ({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      proposal_source: "agent_curated",
    }));

  console.log(
    `B1-APQC-INSERT: ${handoffProcessRows.length} target rows; ${agentCuratedByHandoff.size} already have agent_curated tags; inserting ${toInsert.length}`
  );

  // Log skipped prior-curated handoffs explicitly.
  for (const hid of skippedHandoffs) {
    const prior = agentCuratedByHandoff.get(hid);
    if (prior) {
      console.log(
        `    SKIP handoff ${hid}: prior agent_curated -> process ${prior.process_id} (audit proposed 430/429/430/430/429 respectively)`
      );
    }
  }

  if (toInsert.length > 0) {
    const out = await post(`/handoff_processes`, toInsert);
    console.log(`  INSERTED ${out.length} handoff_processes rows`);
    for (const r of toInsert) {
      const meta = handoffProcessRows.find(x => x.handoff_id === r.handoff_id)!;
      console.log(`    + handoff=${r.handoff_id} process=${r.process_id}  // ${meta.note}`);
    }
  }
  return { inserted: toInsert.length, skipped: skippedHandoffs.length };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
console.log("ECM B1 technical fixes (residual)");
console.log("==================================");
console.log("");

const sS5    = await insertDomainRegulations();
const sS8a   = await fixEventCategory();
const sS8b   = await renameEvent900();
const sDel   = await deleteStaleHandoffProcesses();
const sIns   = await insertHandoffProcesses();

console.log("");
console.log("Summary:");
console.log(`  B1-S5    domain_regulations:        ${sS5.inserted} inserted / ${sS5.existing} existing`);
console.log(`  B1-S8a   event_category backfill:   ${sS8a.patched} patched / ${sS8a.skipped} already correct`);
console.log(`  B1-S8b   event_name rename:         ${sS8b.patched} patched / ${sS8b.skipped} already correct`);
console.log(`  B1-APQC  stale discovery DELETE:    ${sDel.deleted} deleted / ${sDel.found} found`);
console.log(`  B1-APQC  agent_curated INSERT:      ${sIns.inserted} inserted / ${sIns.skipped} prior-curated skipped`);
console.log("");
console.log("UI:");
console.log("  https://tests.semantius.app/domain_map/domain_regulations");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
