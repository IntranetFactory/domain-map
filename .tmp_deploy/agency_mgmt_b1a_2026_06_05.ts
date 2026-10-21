#!/usr/bin/env bun
// AGENCY-MGMT (domain 153) b1a execution - 2026-06-05.
// Executes the mechanical / single-confident-derivation b1a items:
//   B1A-AS1-EVENT-MODULE-FK   : PATCH 11 trigger_events.domain_module_id by event data_object -> module.
//   B1A-AS3-HANDOFF-CASCADE   : PATCH 12 handoffs' AGENCY-side module FK by payload -> module.
//   B1A-H1-APQC-REMAINDER     : INSERT 5 handoff_processes rows (agent_curated, role=implements).
//   B1A-H1-REPLACE-348        : DELETE the discovery_override row on handoff 348; INSERT correct agent_curated row.
//   B1A-AS2-REG-ASC606        : INSERT one domain_regulations row {153, 57, mandatory}.
//
// Idempotent: every write is preceded by a live read; already-correct rows are skipped.
// record_status is OMITTED on all inserts (DB default = "new"). No notes columns written.

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
const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const post = (path: string, body: Row[] | Row) => call({ method: "POST", path, body });
const del = (path: string) => call({ method: "DELETE", path });

// data_object_id -> realizing module id (the AGENCY-MGMT-side master map).
const DO_TO_MODULE: Record<number, number> = {
  478: 210, // agency_jobs        -> JOB-TRAFFIC
  479: 210, // agency_time_entries-> JOB-TRAFFIC
  480: 210, // agency_retainers   -> JOB-TRAFFIC
  485: 210, // agency_estimates   -> JOB-TRAFFIC
  481: 211, // media_plans        -> MEDIA-BUY
  482: 211, // insertion_orders   -> MEDIA-BUY
  483: 212, // creative_briefs    -> CREATIVE-OPS
  484: 212, // creative_deliverables -> CREATIVE-OPS
};

async function main() {
  console.log("=== AGENCY-MGMT b1a execution 2026-06-05 ===\n");

  // ---------------------------------------------------------------
  // B1A-AS1-EVENT-MODULE-FK : 11 trigger_events
  // ---------------------------------------------------------------
  const EVENT_IDS = [338, 339, 340, 341, 342, 525, 526, 527, 528, 529, 530];
  const events = await get(
    `/trigger_events?id=in.(${EVENT_IDS.join(",")})&select=id,event_name,data_object_id,domain_module_id`,
  );
  console.log("[B1A-AS1] trigger_events.domain_module_id backfill");
  let evPatched = 0;
  for (const e of events) {
    const target = DO_TO_MODULE[Number(e.data_object_id)];
    if (target === undefined) {
      console.log(`  SKIP event ${e.id} ${e.event_name}: data_object ${e.data_object_id} not in map`);
      continue;
    }
    if (Number(e.domain_module_id) === target) {
      console.log(`  ok   event ${e.id} ${e.event_name}: already -> ${target}`);
      continue;
    }
    if (e.domain_module_id !== null) {
      console.log(`  WARN event ${e.id} ${e.event_name}: existing ${e.domain_module_id} != target ${target}; leaving as-is`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${e.id}`, { domain_module_id: target });
    console.log(`  PATCH event ${e.id} ${e.event_name}: NULL -> ${target}`);
    evPatched++;
  }
  console.log(`  -> ${evPatched} events patched\n`);

  // ---------------------------------------------------------------
  // B1A-AS3-HANDOFF-CASCADE : 12 handoffs, AGENCY-side module FK
  //   outbound (source=153) -> set source_domain_module_id
  //   inbound  (target=153) -> set target_domain_module_id
  //   target module derived from the handoff's payload data_object_id, EXCEPT
  //   handoff 343 whose payload (66 legal_contracts) is not an AGENCY master:
  //   per state.yaml it maps to 210 (agency_estimates/legal_contracts -> JOB-TRAFFIC).
  // ---------------------------------------------------------------
  const HANDOFF_IDS = [341, 342, 343, 344, 345, 346, 347, 348, 513, 514, 515, 516];
  const HANDOFF_OVERRIDE: Record<number, number> = { 343: 210 };
  const handoffs = await get(
    `/handoffs?id=in.(${HANDOFF_IDS.join(",")})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id`,
  );
  console.log("[B1A-AS3] handoffs AGENCY-side module FK backfill");
  let hoPatched = 0;
  for (const h of handoffs) {
    const target = HANDOFF_OVERRIDE[Number(h.id)] ?? DO_TO_MODULE[Number(h.data_object_id)];
    if (target === undefined) {
      console.log(`  SKIP handoff ${h.id}: payload ${h.data_object_id} not in map`);
      continue;
    }
    const isOutbound = Number(h.source_domain_id) === 153;
    const isInbound = Number(h.target_domain_id) === 153;
    const field = isOutbound ? "source_domain_module_id" : "target_domain_module_id";
    if (!isOutbound && !isInbound) {
      console.log(`  SKIP handoff ${h.id}: neither side is 153`);
      continue;
    }
    const cur = Number(h[field as keyof Row]);
    if (h[field as keyof Row] !== null && cur === target) {
      console.log(`  ok   handoff ${h.id}: ${field} already -> ${target}`);
      continue;
    }
    if (h[field as keyof Row] !== null) {
      console.log(`  WARN handoff ${h.id}: ${field} existing ${cur} != target ${target}; leaving as-is`);
      continue;
    }
    await patch(`/handoffs?id=eq.${h.id}`, { [field]: target });
    console.log(`  PATCH handoff ${h.id}: ${field} NULL -> ${target}`);
    hoPatched++;
  }
  console.log(`  -> ${hoPatched} handoffs patched\n`);

  // ---------------------------------------------------------------
  // B1A-H1-REPLACE-348 : DELETE discovery_override row, INSERT correct one.
  //   Prior row (snapshotted in history.md): hp.id=37, handoff 348, process 41
  //   "Manage employee onboarding, training, and development" (L2, 20599),
  //   proposal_source=discovery_override.
  //   Correct exit/separation activity: process 239 "Manage separation" (L3, 10513).
  // ---------------------------------------------------------------
  console.log("[B1A-H1-REPLACE-348] replace mismatched override on handoff 348");
  const existing348 = await get(
    `/handoff_processes?handoff_id=eq.348&select=id,process_id,proposal_source,record_status,role`,
  );
  const overrideRow = existing348.find(r => r.proposal_source === "discovery_override" && Number(r.process_id) === 41);
  const already239 = existing348.find(r => Number(r.process_id) === 239);
  if (overrideRow) {
    await del(`/handoff_processes?id=eq.${overrideRow.id}`);
    console.log(`  DELETE hp ${overrideRow.id} (handoff 348 -> process 41 discovery_override)`);
  } else {
    console.log(`  no discovery_override(process 41) row on 348 to delete (already removed?)`);
  }
  if (already239) {
    console.log(`  ok   handoff 348 already tagged process 239 (hp ${already239.id})`);
  } else {
    const ins = await post(`/handoff_processes`, [
      { handoff_id: 348, process_id: 239, proposal_source: "agent_curated", role: "implements" },
    ]);
    console.log(`  INSERT hp handoff 348 -> process 239 "Manage separation" (id ${ins[0]?.id})`);
  }
  console.log("");

  // ---------------------------------------------------------------
  // B1A-H1-APQC-REMAINDER : 5 handoff_processes rows
  //   341 -> 147 "Manage leads/opportunities"  (L3, 10182)
  //   346 -> 315 "Process accounts payable (AP)" (L3, 10756)
  //   513 -> 312 "Report time"                  (L3, 10753)
  //   514 -> 148 "Manage customers and accounts" (L3, 10183)
  //   516 -> 307 "Perform general accounting"    (L3, 10748)
  // ---------------------------------------------------------------
  console.log("[B1A-H1-APQC-REMAINDER] tag 5 untagged cross-domain handoffs");
  const REMAINDER: { handoff_id: number; process_id: number; label: string }[] = [
    { handoff_id: 341, process_id: 147, label: 'Manage leads/opportunities' },
    { handoff_id: 346, process_id: 315, label: 'Process accounts payable (AP)' },
    { handoff_id: 513, process_id: 312, label: 'Report time' },
    { handoff_id: 514, process_id: 148, label: 'Manage customers and accounts' },
    { handoff_id: 516, process_id: 307, label: 'Perform general accounting' },
  ];
  const remIds = REMAINDER.map(r => r.handoff_id);
  const existingRem = await get(
    `/handoff_processes?handoff_id=in.(${remIds.join(",")})&select=handoff_id,process_id`,
  );
  const existKey = new Set(existingRem.map(r => `${r.handoff_id}|${r.process_id}`));
  const toInsert = REMAINDER.filter(r => !existKey.has(`${r.handoff_id}|${r.process_id}`)).map(r => ({
    handoff_id: r.handoff_id,
    process_id: r.process_id,
    proposal_source: "agent_curated",
    role: "implements",
  }));
  for (const r of REMAINDER) {
    if (existKey.has(`${r.handoff_id}|${r.process_id}`)) {
      console.log(`  ok   handoff ${r.handoff_id} already tagged process ${r.process_id}`);
    }
  }
  if (toInsert.length > 0) {
    const ins = await post(`/handoff_processes`, toInsert);
    for (let i = 0; i < toInsert.length; i++) {
      const r = REMAINDER.find(x => x.handoff_id === toInsert[i].handoff_id)!;
      console.log(`  INSERT hp handoff ${r.handoff_id} -> process ${r.process_id} "${r.label}" (id ${ins[i]?.id})`);
    }
  } else {
    console.log("  nothing to insert (all already tagged)");
  }
  console.log("");

  // ---------------------------------------------------------------
  // B1A-AS2-REG-ASC606 : domain_regulations {153, 57, mandatory}
  // ---------------------------------------------------------------
  console.log("[B1A-AS2-REG-ASC606] link ASC 606 (reg 57) to AGENCY-MGMT (domain 153)");
  const existingReg = await get(
    `/domain_regulations?domain_id=eq.153&regulation_id=eq.57&select=id,applicability`,
  );
  if (existingReg.length > 0) {
    console.log(`  ok   domain_regulations row already exists (id ${existingReg[0].id}, applicability ${existingReg[0].applicability})`);
  } else {
    const ins = await post(`/domain_regulations`, [
      { domain_id: 153, regulation_id: 57, applicability: "mandatory" },
    ]);
    console.log(`  INSERT domain_regulations {153, 57, mandatory} (id ${ins[0]?.id})`);
  }
  console.log("");

  // ---------------------------------------------------------------
  // Verification re-reads
  // ---------------------------------------------------------------
  console.log("=== verification ===");
  const evNull = await get(`/trigger_events?id=in.(${EVENT_IDS.join(",")})&domain_module_id=is.null&select=id`);
  console.log(`trigger_events still NULL module: ${evNull.length} (expect 0)`);
  const hoOutNull = await get(`/handoffs?source_domain_id=eq.153&source_domain_module_id=is.null&select=id`);
  const hoInNull = await get(`/handoffs?target_domain_id=eq.153&target_domain_module_id=is.null&select=id`);
  console.log(`handoffs outbound NULL source module: ${hoOutNull.length} (expect 0); inbound NULL target module: ${hoInNull.length} (expect 0)`);
  const hp = await get(`/handoff_processes?handoff_id=in.(${HANDOFF_IDS.join(",")})&select=handoff_id,process_id,proposal_source&order=handoff_id.asc`);
  console.log(`handoff_processes on the 12 handoffs: ${hp.length} rows`);
  for (const r of hp) console.log(`  handoff ${r.handoff_id} -> process ${r.process_id} (${r.proposal_source})`);
  const reg = await get(`/domain_regulations?domain_id=eq.153&select=id,regulation_id,applicability`);
  console.log(`domain_regulations on 153: ${reg.length} rows`);
  console.log("\nUI links:");
  console.log("  https://adenin.semantius.ai/domain_map/trigger_events");
  console.log("  https://adenin.semantius.ai/domain_map/handoffs");
  console.log("  https://adenin.semantius.ai/domain_map/handoff_processes");
  console.log("  https://adenin.semantius.ai/domain_map/domain_regulations");
  console.log("\n=== done ===");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
