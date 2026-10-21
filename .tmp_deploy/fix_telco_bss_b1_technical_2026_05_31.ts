#!/usr/bin/env bun
/**
 * TELCO-BSS B1 technical fixes (2026-05-31 continuation pass).
 *
 * Domain id 42 ("Telecommunications OSS/BSS").
 *
 * Scope (only truly-technical B1 fixes per the prompt rules):
 *
 *   1. B1-S11(b) enum backfill: PATCH `event_category` from "" (empty) to
 *      "state_change" on all 9 TELCO-BSS trigger_events. Audit guidance says
 *      "Most should be `state_change`"; every one of the 9 names a state
 *      transition (submitted, completed, activated, suspended, failed,
 *      updated, issued, opened, updated), so applying state_change uniformly
 *      is the technical reading. Enum allowed values: lifecycle, state_change,
 *      threshold, signal.
 *
 *   2. B1-H1: INSERT 7 `handoff_processes` rows mapping each of the 7
 *      cross-domain TELCO-BSS outbound handoffs to an APQC PCF process row.
 *      Audit pre-specifies handoff_id + process_id pairs and all 6 distinct
 *      process_ids (196, 302, 740, 1299, 1312, 1351) are verified to exist in
 *      `processes`. proposal_source = 'agent_curated'. record_status omitted
 *      so DB default 'new' applies (Rule #1).
 *
 *      handoff -> process_id table from audit Bucket 1 B1-H1:
 *        927 (TELCO-BSS -> ITSM, service_trouble_ticket.opened)   -> 1299
 *        928 (TELCO-BSS -> ITSM, service_provisioning.failed)     -> 1299
 *        929 (TELCO-BSS -> ERP-FIN, telco_customer_bill.issued)   ->  302
 *        930 (TELCO-BSS -> CSM, telco_subscription.suspended)     ->  196
 *        931 (TELCO-BSS -> CSM, telco_service_order.completed)    ->  740
 *        932 (TELCO-BSS -> ITSM, network_inventory.updated)       -> 1312
 *        933 (TELCO-BSS -> ERP-FIN, telco_subscription.activated) -> 1351
 *
 * Deferred (NOT applied here; recorded in the audit continuation):
 *   - B1-S1 (capabilities)                  : new entities, deferred.
 *   - B1-S2 (modules, M1 hard fail)         : new modules, deferred (B2-2).
 *   - B1-S3 (per-module system skills)      : gated on B1-S2.
 *   - B1-S4 (retire legacy skill 111)       : gated on B1-S3 (deleting before
 *                                             per-module skills land would
 *                                             orphan the only system skill).
 *   - B1-S5 (catalog UX A4)                 : Rule #20 (catalog_tagline /
 *                                             catalog_description), surface
 *                                             to user; never auto-write.
 *   - B1-S6 (lifecycle states, B12)         : gated on B1-S2 (domain_module_id
 *                                             FK is required per state).
 *   - B1-S7 (intra-domain DOR edges, B6)    : not user-edges; the prompt's
 *                                             DOR scope is "user-edges Rule #10
 *                                             audit pre-specifies".
 *   - B1-S8 (users DOR edges, Rule #10)     : audit names actor mappings
 *                                             (order agent, billing
 *                                             specialist, etc.) but not the
 *                                             exact (verb, inverse_verb,
 *                                             cardinality, kind, owner_side,
 *                                             is_required) tuples per master.
 *                                             Defer per the precedent set in
 *                                             other 2026-05-31 B1 fix loaders.
 *   - B1-S9 (aliases B11)                   : Bucket 2 wording approval
 *                                             (B2-6); per the rule, no bulk
 *                                             data_object_aliases inserts
 *                                             unless audit pre-specifies
 *                                             exact tuples (alias_type,
 *                                             is_preferred, etc. are not
 *                                             pre-specified).
 *   - B1-S10 (B10b source module FK)        : gated on B1-S2 (no source module
 *                                             exists to attribute to).
 *   - B1-S11(a) (2 missing handoffs)        : authoring new handoffs is
 *                                             surface-for-user judgment (the
 *                                             audit asks the user whether to
 *                                             treat them as leaf vs. add new
 *                                             handoff rows); deferred.
 *   - B1-S12 (domain_aliases)               : per DEFER list ("new
 *                                             `domain_aliases`").
 *   - B2-1 (em-dashes in domains.description / business_logic): wording
 *                                             approval (Bucket 2); deferred.
 *   - B2-2 / B2-3 / B2-4 / B2-5 / B2-6      : Bucket 2 judgment.
 *   - B3-1 through B3-13                    : Phase 0 speculative.
 *   - Report-only follow-ups owed by CSM / ERP-FIN / ITSM / HCM / CRM / GRC
 *                                           : not TELCO-BSS authoring scope.
 *
 * Pre-flight (verified before run):
 *   - 9 trigger_events ids 1060-1068 exist on the 7 TELCO-BSS master
 *     data_objects (653-659); all have event_category = "".
 *   - 7 outbound handoffs ids 927-933 exist with source_domain_id = 42; none
 *     have an existing handoff_processes row.
 *   - 6 distinct processes ids (196, 302, 740, 1299, 1312, 1351) exist in
 *     /processes; names match audit B1-H1.
 *
 * Idempotent: each step re-reads live state before writing.
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_telco_bss_b1_technical_2026_05_31.ts
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    const errText = stderr || stdout;
    if (errText.includes("JWT") && errText.includes("audience")) {
      throw new Error(`JWT_AUDIENCE_ERROR: ${errText.trim()}`);
    }
    throw new Error(`${tool} (exit ${code}): ${errText}`);
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

const TELCO_BSS_DOMAIN_ID = 42;
const MASTER_DATA_OBJECT_IDS = [653, 654, 655, 656, 657, 658, 659];

const B1_H1_PCF_MAP: Array<{ handoff_id: number; process_id: number; note: string }> = [
  { handoff_id: 927, process_id: 1299, note: "service_trouble_ticket.opened -> Triage IT service delivery incidents" },
  { handoff_id: 928, process_id: 1299, note: "service_provisioning.failed -> Triage IT service delivery incidents" },
  { handoff_id: 929, process_id: 302,  note: "telco_customer_bill.issued -> Invoice customer" },
  { handoff_id: 930, process_id: 196,  note: "telco_subscription.suspended -> Manage customer service problems" },
  { handoff_id: 931, process_id: 740,  note: "telco_service_order.completed -> Handle sales order inquiries" },
  { handoff_id: 932, process_id: 1312, note: "network_inventory.updated -> Maintain IT asset records" },
  { handoff_id: 933, process_id: 1351, note: "telco_subscription.activated -> Generate customer billing data" },
];

async function preflight() {
  console.log("=== Pre-flight ===");

  // 1) trigger_events
  const events = await get(
    `/trigger_events?data_object_id=in.(${MASTER_DATA_OBJECT_IDS.join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  console.log(`  trigger_events on 7 TELCO-BSS masters: ${events.length} rows`);
  if (events.length !== 9) {
    throw new Error(`pre-flight: expected 9 trigger_events, got ${events.length}`);
  }
  const emptyEvents = events.filter((e: any) => e.event_category === "");
  console.log(`    with event_category = "" (target of backfill): ${emptyEvents.length}`);

  // 2) handoffs
  const handoffIds = B1_H1_PCF_MAP.map((m) => m.handoff_id);
  const handoffs = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id,source_domain_id,target_domain_id,trigger_event_id,data_object_id`,
  );
  if (handoffs.length !== 7) {
    throw new Error(`pre-flight: expected 7 handoffs, got ${handoffs.length}`);
  }
  for (const h of handoffs) {
    if (h.source_domain_id !== TELCO_BSS_DOMAIN_ID) {
      throw new Error(`pre-flight: handoff ${h.id} source_domain_id=${h.source_domain_id}, expected ${TELCO_BSS_DOMAIN_ID}`);
    }
  }
  console.log(`  + all 7 handoffs verified as TELCO-BSS outbound`);

  // 3) processes
  const pcfIds = Array.from(new Set(B1_H1_PCF_MAP.map((m) => m.process_id)));
  const procs = await get(
    `/processes?id=in.(${pcfIds.join(",")})&select=id,process_name`,
  );
  if (procs.length !== pcfIds.length) {
    throw new Error(`pre-flight: expected ${pcfIds.length} processes, got ${procs.length}`);
  }
  console.log(`  + all ${pcfIds.length} PCF process rows verified`);

  // 4) existing handoff_processes rows
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id`,
  );
  console.log(`  existing handoff_processes rows on these 7 handoffs: ${existing.length}`);
}

async function backfillEventCategory() {
  console.log("\n=== Step 1: B1-S11(b) backfill trigger_events.event_category ===");
  const targets = await get(
    `/trigger_events?data_object_id=in.(${MASTER_DATA_OBJECT_IDS.join(",")})&event_category=eq.&select=id,event_name`,
  );
  if (targets.length === 0) {
    console.log("  = no empty event_category rows; nothing to do");
    return;
  }
  console.log(`  patching ${targets.length} rows to event_category='state_change':`);
  for (const t of targets) {
    console.log(`    id=${t.id} ${t.event_name}`);
  }
  const ids = targets.map((t: any) => t.id);
  await patch(`/trigger_events?id=in.(${ids.join(",")})`, {
    event_category: "state_change",
  });
  // confirm
  const after = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`,
  );
  for (const r of after) {
    if (r.event_category !== "state_change") {
      throw new Error(`post-check: trigger_event ${r.id} event_category=${r.event_category}`);
    }
  }
  console.log(`  + ${after.length} rows now event_category='state_change'`);
}

async function insertHandoffProcesses() {
  console.log("\n=== Step 2: B1-H1 insert handoff_processes ===");
  let inserted = 0;
  let skipped = 0;
  for (const m of B1_H1_PCF_MAP) {
    const existing = await get(
      `/handoff_processes?handoff_id=eq.${m.handoff_id}&process_id=eq.${m.process_id}&select=id,key`,
    );
    if (existing.length > 0) {
      console.log(`  = handoff ${m.handoff_id} -> process ${m.process_id} already linked (id ${existing[0].id}), skipping`);
      skipped++;
      continue;
    }
    const row = await post("/handoff_processes", {
      handoff_id: m.handoff_id,
      process_id: m.process_id,
      proposal_source: "agent_curated",
      // record_status omitted; DB default 'new' applies (Rule #1).
    });
    console.log(`  + inserted h_p id=${row[0]?.id} (handoff ${m.handoff_id} -> process ${m.process_id}) [${m.note}]`);
    inserted++;
  }
  console.log(`  total: ${inserted} inserted, ${skipped} already-present`);
}

async function postflight() {
  console.log("\n=== Post-flight ===");

  const remainingEmpty = await get(
    `/trigger_events?data_object_id=in.(${MASTER_DATA_OBJECT_IDS.join(",")})&event_category=eq.&select=id,event_name`,
  );
  if (remainingEmpty.length === 0) {
    console.log("  + zero TELCO-BSS trigger_events with empty event_category");
  } else {
    console.log(`  ! ${remainingEmpty.length} TELCO-BSS trigger_events still empty event_category`);
  }

  const handoffIds = B1_H1_PCF_MAP.map((m) => m.handoff_id);
  const hps = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id&order=handoff_id.asc`,
  );
  const byHandoff = new Map<number, number[]>();
  for (const r of hps) {
    if (!byHandoff.has(r.handoff_id)) byHandoff.set(r.handoff_id, []);
    byHandoff.get(r.handoff_id)!.push(r.process_id);
  }
  console.log("  handoff_processes coverage:");
  for (const m of B1_H1_PCF_MAP) {
    const procs = byHandoff.get(m.handoff_id) ?? [];
    const ok = procs.includes(m.process_id);
    console.log(`    handoff ${m.handoff_id} -> processes [${procs.join(",")}] ${ok ? "OK" : "MISS"}`);
  }
}

async function main() {
  console.log("TELCO-BSS B1 technical fixes (2026-05-31 continuation)");
  console.log("======================================================\n");
  await preflight();
  await backfillEventCategory();
  await insertHandoffProcesses();
  await postflight();
  console.log("\nDone.");
  console.log("  UI: https://tests.semantius.app/domain_map/trigger_events");
  console.log("  UI: https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
