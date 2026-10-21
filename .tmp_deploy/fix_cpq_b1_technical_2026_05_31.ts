#!/usr/bin/env bun
// CPQ B1 technical fixes (continuation 2026-05-31).
//
// Scope (per orchestrator allow-list):
//   - B1-S1: PATCH event_category on the 16 CPQ trigger_events the audit names
//     with resolved enum values.
//   - B1-S6: PATCH source_domain_module_id on the 9 outbound CPQ handoffs
//     (NULL today, derivable from publishing master's owning module).
//   - B1-S7: PATCH target_domain_module_id on the 4 inbound CPQ handoffs
//     (NULL today, deterministically resolvable from receiving master's owning
//     module).
//   - B1-H1: INSERT handoff_processes APQC tags for 6 untagged outbound /
//     inbound handoffs where the audit pre-specifies handoff_id + a confidently
//     resolvable APQC PCF row (process_id=149, "Develop and manage sales
//     proposals, bids, and quotes"). 3 KEEPs (62, 482, 1014) are already
//     populated and untouched. 1 already-populated row (517) is a
//     medium-confidence REPLACE proposal, deferred. 2 existing
//     discovery_substring rows (204 keeping process 149, 527 medium-confidence
//     re-targeting) are PATCH/REPLACE proposals, deferred (the orchestrator
//     mandate covers INSERT only for handoff_processes). 1 INSERT (1236 PIM
//     -> CPQ) is deferred because the audit's PCF proposal ("10283 or 10410.x")
//     is not unambiguously resolvable to a single process row.
//
// Deferred (out of orchestrator's "technical" allow-list):
//   - B1-S2 (F2/F3/F5 system skills load on 3 modules): new entities, not in
//     the technical apply list; also gated on B2-S1 sequencing decision.
//   - B1-S3 (E2/E3 RBAC scaffolding): new permissions/roles/role_modules, not
//     in the technical apply list; gated on B2-S1.
//   - B1-S4 (B11 alias load): new data_object_aliases rows, not in the
//     technical apply list (orchestrator only licenses enum backfills, FK
//     PATCHes, domain_regulations INSERTs to existing rows, naming renames,
//     user-edge data_object_relationships INSERTs, permission_verb_override
//     PATCHes, and APQC handoff_processes INSERTs).
//   - B1-S5 (C1 lifecycle states on 4 masters): new lifecycle authoring, not
//     in the apply list; partially gated on B2-S5 (config-shape exemption).
//   - B1-S8 (no work owed for CPQ).
//   - B1-S9 (report-only, owed by ERP-FIN / SUB-MGMT / CLM audits).
//   - B1-H1 medium-confidence PCF re-targets on existing rows (517, 527) and
//     PATCH-to-agent_curated on 204: orchestrator licenses INSERT only.
//   - B1-H1 H-13 (1236 PIM -> CPQ): PCF proposal "10283 or 10410.x" is not
//     a unique resolvable process_id.
//   - B2-* (judgment calls), B3-* (Phase 0 speculative).
//
// Run from project root only (Rule #6):
//   bun run .tmp_deploy/fix_cpq_b1_technical_2026_05_31.ts

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

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// ============================================================
// B1-S1: PATCH event_category on 16 CPQ trigger_events
// Values pre-specified by the audit (audits/CPQ.md B1-S1 row).
// Allowed enum (Rule #13): lifecycle | state_change | threshold | signal
// ============================================================

const eventCategoryPatches: { id: number; event_name: string; event_category: string }[] = [
  { id: 474, event_name: "sales_quote.created",                  event_category: "lifecycle" },
  { id: 475, event_name: "sales_quote.submitted_for_approval",   event_category: "state_change" },
  { id: 476, event_name: "sales_quote.approved",                 event_category: "state_change" },
  { id: 477, event_name: "sales_quote.sent",                     event_category: "signal" },
  { id: 478, event_name: "sales_quote.accepted_by_buyer",        event_category: "signal" },
  { id: 479, event_name: "sales_quote.rejected",                 event_category: "state_change" },
  { id: 480, event_name: "quote_line.added",                     event_category: "lifecycle" },
  { id: 481, event_name: "product_configuration.completed",      event_category: "state_change" },
  { id: 482, event_name: "pricing_rule.updated",                 event_category: "lifecycle" },
  { id: 483, event_name: "discount_approval.requested",          event_category: "state_change" },
  { id: 484, event_name: "discount_approval.granted",            event_category: "state_change" },
  { id: 485, event_name: "product_bundle.published",             event_category: "state_change" },
  { id: 486, event_name: "contract_draft.generated",             event_category: "state_change" },
  { id: 1158, event_name: "quote_discount.applied",              event_category: "state_change" },
  { id: 1159, event_name: "quote_discount.approved",             event_category: "state_change" },
  { id: 1160, event_name: "quote_discount.threshold_exceeded",   event_category: "threshold" },
];

// ============================================================
// B1-S6: PATCH source_domain_module_id on 9 outbound CPQ handoffs.
//
// Reasoning (per audit and verified by data):
//   - sales_quotes (master id 416) lives in CPQ-QUOTE-BUILDER (165).
//     Handoffs publishing sales_quote-shaped events go FROM module 165:
//     handoffs 62 (quote.accepted, evt 102), 204 (quote.expired, evt 164),
//     483 (sales_quote.accepted_by_buyer, evt 478), 484
//     (sales_quote.approved, evt 476), 485 (sales_quote.accepted_by_buyer,
//     evt 478, second consumer).
//   - quote_discounts (master id 420) lives in CPQ-QUOTE-BUILDER (165).
//     Handoffs publishing quote_discount events go FROM module 165:
//     handoffs 1013 (quote_discount.applied, evt 1158), 1014
//     (quote_discount.approved, evt 1159), 1015
//     (quote_discount.threshold_exceeded, evt 1160).
//   - contract_drafts (master id 423) lives in CPQ-APPROVALS-CONTRACTS (166).
//     Handoff 482 publishes contract_draft.generated (evt 486) FROM module
//     166.
// ============================================================

const sourceModulePatches: { handoff_id: number; source_domain_module_id: number; reason: string }[] = [
  { handoff_id: 62,   source_domain_module_id: 165, reason: "CPQ-QUOTE-BUILDER publishes quote.accepted (evt 102) -> CLM-REPOSITORY" },
  { handoff_id: 204,  source_domain_module_id: 165, reason: "CPQ-QUOTE-BUILDER publishes quote.expired (evt 164) -> CRM-PIPELINE-MGT" },
  { handoff_id: 482,  source_domain_module_id: 166, reason: "CPQ-APPROVALS-CONTRACTS publishes contract_draft.generated (evt 486) -> CLM-AUTHORING" },
  { handoff_id: 483,  source_domain_module_id: 165, reason: "CPQ-QUOTE-BUILDER publishes sales_quote.accepted_by_buyer (evt 478) -> CRM-PIPELINE-MGT" },
  { handoff_id: 484,  source_domain_module_id: 165, reason: "CPQ-QUOTE-BUILDER publishes sales_quote.approved (evt 476) -> ERP-FIN" },
  { handoff_id: 485,  source_domain_module_id: 165, reason: "CPQ-QUOTE-BUILDER publishes sales_quote.accepted_by_buyer (evt 478) -> SUB-MGMT" },
  { handoff_id: 1013, source_domain_module_id: 165, reason: "CPQ-QUOTE-BUILDER publishes quote_discount.applied (evt 1158) -> CRM-PIPELINE-MGT" },
  { handoff_id: 1014, source_domain_module_id: 165, reason: "CPQ-QUOTE-BUILDER publishes quote_discount.approved (evt 1159) -> CLM" },
  { handoff_id: 1015, source_domain_module_id: 165, reason: "CPQ-QUOTE-BUILDER publishes quote_discount.threshold_exceeded (evt 1160) -> ERP-FIN" },
];

// ============================================================
// B1-S7: PATCH target_domain_module_id on 4 inbound CPQ handoffs.
//
// Reasoning (per audit):
//   - Inbound 61 (CRM-PIPELINE-MGT 48 -> CPQ on crm_opportunity.requires_quote,
//     evt 85) targets CPQ-QUOTE-BUILDER (165) where the quote is built.
//   - Inbound 517 (CLM-AUTHORING 125 -> CPQ on contract_template.published,
//     evt 534) targets CPQ-APPROVALS-CONTRACTS (166) where contract_drafts
//     live.
//   - Inbound 527 (CRM-ACCT-MGT 46 -> CPQ on account.tier_changed, evt 163)
//     targets CPQ-PRODUCT-CATALOG (164) where pricing logic lives.
//   - Inbound 1236 (PIM 143 -> CPQ on pim_product.published, evt 1274)
//     targets CPQ-PRODUCT-CATALOG (164) which masters product_configurations.
// ============================================================

const targetModulePatches: { handoff_id: number; target_domain_module_id: number; reason: string }[] = [
  { handoff_id: 61,   target_domain_module_id: 165, reason: "Quote built in CPQ-QUOTE-BUILDER on crm_opportunity.requires_quote" },
  { handoff_id: 517,  target_domain_module_id: 166, reason: "Contract drafts in CPQ-APPROVALS-CONTRACTS on contract_template.published" },
  { handoff_id: 527,  target_domain_module_id: 164, reason: "Pricing logic in CPQ-PRODUCT-CATALOG on account.tier_changed" },
  { handoff_id: 1236, target_domain_module_id: 164, reason: "CPQ-PRODUCT-CATALOG masters product_configurations on pim_product.published" },
];

// ============================================================
// B1-H1: INSERT handoff_processes APQC tags.
//
// Per orchestrator mandate, only INSERTs of agent_curated rows the audit
// pre-specifies with a confidently resolvable PCF process_id. Audit lists
// 13 rows; the 6 applied here are H-07..H-12 (handoffs 483, 484, 485, 1013,
// 1015, 61), all tagging the same PCF row 149 ("Develop and manage sales
// proposals, bids, and quotes") which the audit calls "confident".
//
// Skipped (NOT in apply list):
//   - H-01 (62), H-02 (482), H-03 (1014): KEEP, already present as
//     agent_curated.
//   - H-04 (517 REPLACE): medium-confidence per audit, defer to user.
//   - H-05 (204 REPLACE): orchestrator licenses INSERT only; existing
//     discovery_substring row stays as-is.
//   - H-06 (527 REPLACE): medium-confidence per audit, defer to user.
//   - H-13 (1236 INSERT): PCF "10283 or 10410.x" not uniquely resolvable.
// ============================================================

const handoffProcessInserts: { handoff_id: number; process_id: number; reason: string }[] = [
  { handoff_id: 483,  process_id: 149, reason: "CPQ-QUOTE-BUILDER -> CRM-PIPELINE-MGT on sales_quote.accepted_by_buyer" },
  { handoff_id: 484,  process_id: 149, reason: "CPQ-QUOTE-BUILDER -> ERP-FIN on sales_quote.approved" },
  { handoff_id: 485,  process_id: 149, reason: "CPQ-QUOTE-BUILDER -> SUB-MGMT on sales_quote.accepted_by_buyer" },
  { handoff_id: 1013, process_id: 149, reason: "CPQ-QUOTE-BUILDER -> CRM-PIPELINE-MGT on quote_discount.applied" },
  { handoff_id: 1015, process_id: 149, reason: "CPQ-QUOTE-BUILDER -> ERP-FIN on quote_discount.threshold_exceeded" },
  { handoff_id: 61,   process_id: 149, reason: "CRM-PIPELINE-MGT -> CPQ-QUOTE-BUILDER on crm_opportunity.requires_quote" },
];

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log("CPQ B1 technical fixes (2026-05-31)\n");

  // --- B1-S1 trigger_events.event_category ---
  console.log(`B1-S1: PATCH event_category on ${eventCategoryPatches.length} trigger_events`);
  const beforeEvents = await get(
    `/trigger_events?id=in.(${eventCategoryPatches.map(p => p.id).join(",")})&select=id,event_name,event_category`,
  );
  const eventStateBefore = new Map(beforeEvents.map(r => [Number(r.id), String(r.event_category ?? "")]));
  let s1Patched = 0;
  let s1AlreadyOk = 0;
  for (const p of eventCategoryPatches) {
    const current = eventStateBefore.get(p.id);
    if (current === p.event_category) {
      s1AlreadyOk++;
      continue;
    }
    if (current && current !== "") {
      console.log(`  WARN evt ${p.id} (${p.event_name}) already has event_category='${current}', expected empty. Overwriting with '${p.event_category}'.`);
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.event_category });
    s1Patched++;
  }
  console.log(`  patched=${s1Patched}, already-correct=${s1AlreadyOk}`);
  const afterEvents = await get(
    `/trigger_events?id=in.(${eventCategoryPatches.map(p => p.id).join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  const stillEmpty = afterEvents.filter(r => !r.event_category || r.event_category === "");
  if (stillEmpty.length > 0) {
    console.log(`  FAIL: ${stillEmpty.length} rows still empty:`, stillEmpty.map(r => r.id));
  } else {
    console.log(`  verified: all ${afterEvents.length} rows now carry a valid event_category enum value.`);
  }

  // --- B1-S6 source_domain_module_id ---
  console.log(`\nB1-S6: PATCH source_domain_module_id on ${sourceModulePatches.length} outbound handoffs`);
  const s6Ids = sourceModulePatches.map(p => p.handoff_id);
  const beforeS6 = await get(
    `/handoffs?id=in.(${s6Ids.join(",")})&select=id,source_domain_module_id`,
  );
  const s6Before = new Map(beforeS6.map(r => [Number(r.id), r.source_domain_module_id]));
  let s6Patched = 0;
  let s6Skipped = 0;
  for (const p of sourceModulePatches) {
    const current = s6Before.get(p.handoff_id);
    if (Number(current) === p.source_domain_module_id) {
      s6Skipped++;
      continue;
    }
    if (current !== null && current !== undefined) {
      console.log(`  WARN handoff ${p.handoff_id} already has source_domain_module_id=${current}, expected null. Overwriting with ${p.source_domain_module_id}.`);
    }
    await patch(`/handoffs?id=eq.${p.handoff_id}`, { source_domain_module_id: p.source_domain_module_id });
    s6Patched++;
  }
  console.log(`  patched=${s6Patched}, already-correct=${s6Skipped}`);
  const afterS6 = await get(
    `/handoffs?id=in.(${s6Ids.join(",")})&select=id,source_domain_module_id&order=id.asc`,
  );
  const s6StillNull = afterS6.filter(r => r.source_domain_module_id === null);
  if (s6StillNull.length > 0) {
    console.log(`  FAIL: ${s6StillNull.length} rows still NULL:`, s6StillNull.map(r => r.id));
  } else {
    console.log(`  verified: all ${afterS6.length} rows now carry source_domain_module_id.`);
  }

  // --- B1-S7 target_domain_module_id ---
  console.log(`\nB1-S7: PATCH target_domain_module_id on ${targetModulePatches.length} inbound handoffs`);
  const s7Ids = targetModulePatches.map(p => p.handoff_id);
  const beforeS7 = await get(
    `/handoffs?id=in.(${s7Ids.join(",")})&select=id,target_domain_module_id`,
  );
  const s7Before = new Map(beforeS7.map(r => [Number(r.id), r.target_domain_module_id]));
  let s7Patched = 0;
  let s7Skipped = 0;
  for (const p of targetModulePatches) {
    const current = s7Before.get(p.handoff_id);
    if (Number(current) === p.target_domain_module_id) {
      s7Skipped++;
      continue;
    }
    if (current !== null && current !== undefined) {
      console.log(`  WARN handoff ${p.handoff_id} already has target_domain_module_id=${current}, expected null. Overwriting with ${p.target_domain_module_id}.`);
    }
    await patch(`/handoffs?id=eq.${p.handoff_id}`, { target_domain_module_id: p.target_domain_module_id });
    s7Patched++;
  }
  console.log(`  patched=${s7Patched}, already-correct=${s7Skipped}`);
  const afterS7 = await get(
    `/handoffs?id=in.(${s7Ids.join(",")})&select=id,target_domain_module_id&order=id.asc`,
  );
  const s7StillNull = afterS7.filter(r => r.target_domain_module_id === null);
  if (s7StillNull.length > 0) {
    console.log(`  FAIL: ${s7StillNull.length} rows still NULL:`, s7StillNull.map(r => r.id));
  } else {
    console.log(`  verified: all ${afterS7.length} rows now carry target_domain_module_id.`);
  }

  // --- B1-H1 handoff_processes ---
  console.log(`\nB1-H1: INSERT handoff_processes for ${handoffProcessInserts.length} CPQ handoffs`);
  const h1Ids = handoffProcessInserts.map(r => r.handoff_id);
  const existingHP = await get(
    `/handoff_processes?handoff_id=in.(${h1Ids.join(",")})&select=id,handoff_id,process_id,proposal_source`,
  );
  const existingKey = new Set(existingHP.map(r => `${r.handoff_id}|${r.process_id}`));

  const newHP: Row[] = [];
  const skipped: string[] = [];
  for (const r of handoffProcessInserts) {
    const key = `${r.handoff_id}|${r.process_id}`;
    if (existingKey.has(key)) {
      skipped.push(`handoff ${r.handoff_id} -> process ${r.process_id} already present`);
      continue;
    }
    newHP.push({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted -> defaults to 'new' per Rule #1
      // notes omitted -> stays empty per Rule #15
    });
  }
  if (skipped.length > 0) {
    console.log(`  skipping ${skipped.length} already-present pairs:`);
    for (const s of skipped) console.log(`    - ${s}`);
  }
  if (newHP.length > 0) {
    const inserted = await insert("/handoff_processes", newHP);
    console.log(`  inserted ${inserted.length} new handoff_processes rows (proposal_source=agent_curated, record_status=new)`);
  } else {
    console.log(`  no new handoff_processes rows to insert`);
  }
  const afterHP = await get(
    `/handoff_processes?handoff_id=in.(${h1Ids.join(",")})&select=id,handoff_id,process_id,proposal_source,record_status&order=handoff_id.asc`,
  );
  console.log(`  handoff_processes total for the 6 handoffs after load: ${afterHP.length}`);
  for (const r of afterHP) {
    console.log(`    handoff ${r.handoff_id} -> process ${r.process_id} (${r.proposal_source}, ${r.record_status})`);
  }

  // --- Summary ---
  console.log(`\nDone.`);
  console.log(`UI spot-check links:`);
  console.log(`  https://tests.semantius.app/domain_map/trigger_events`);
  console.log(`  https://tests.semantius.app/domain_map/handoffs`);
  console.log(`  https://tests.semantius.app/domain_map/handoff_processes`);
}

await main();
