/**
 * IWMS b1 technical fixes (audit 2026-05-30).
 *
 * Applies the subset of Bucket 1 findings that are truly technical
 * (enum backfills, handoff_processes inserts where the audit pre-specifies
 * handoff_id + resolvable PCF, Rule #15 notes='' reverts on rows the audit
 * pre-specifies). Architectural decisions (B1-S1 capability fix gated on
 * B2-S1, B1-S2 system skills gated on B2-S4 module split, B1-S4 new
 * handoffs + events, B1-S5/S6/S7 report-only for other domains,
 * B1-S8 cross-domain relationships needing target FK lookups) are
 * deferred to follow-ups gated on the user's B2 answers.
 *
 * Floor-plan events 940/941 are skipped from B1-S3: they already carry
 * non-empty event_category, and B2-S5 defers ownership to REAL-EST.
 *
 * Idempotent: every write is preceded by a read against the natural key
 * or composed key, and skipped when already present.
 *
 * Run from project root: bun run .tmp_deploy/fix_iwms_b1_technical_2026_05_31.ts
 */

type CmdResult = { ok: boolean; data: any; stderr: string; code: number };

async function call(server: string, tool: string, payload: any): Promise<CmdResult> {
  const proc = Bun.spawn(["semantius", "call", server, tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, stderr: err.trim() || out.trim(), code };
  return { ok: true, data: out.trim() ? JSON.parse(out.trim()) : null, stderr: "", code };
}

async function get(path: string): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "GET", path });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "PATCH", path, body });
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "POST", path, body });
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}`);
  return r.data;
}

// =====================================================================
// B1-S3 (partial): PATCH trigger_events.event_category enum backfill.
// Audit pre-specifies values for 9 rows. We skip 940 / 941 (floor_plan)
// because (a) they already carry non-empty values and (b) B2-S5 defers
// their ownership to REAL-EST's audit perimeter. 7 IWMS-owned rows.
// =====================================================================
async function fixB1S3() {
  console.log("\n[B1-S3] trigger_events.event_category backfill (IWMS-owned only; 940/941 deferred per B2-S5)");
  const patches: Array<{ id: number; event_category: string }> = [
    { id: 968, event_category: "lifecycle" },     // desk_booking.created
    { id: 969, event_category: "state_change" },  // desk_booking.cancelled
    { id: 970, event_category: "lifecycle" },     // room_reservation.created
    { id: 971, event_category: "lifecycle" },     // workplace_service_request.submitted
    { id: 972, event_category: "state_change" },  // workplace_service_request.completed
    { id: 973, event_category: "signal" },        // space_utilization.measured
    { id: 974, event_category: "lifecycle" },     // workplace_feedback.submitted
  ];
  for (const p of patches) {
    const existing = await get(`/trigger_events?id=eq.${p.id}&select=id,event_name,event_category`);
    if (existing.length === 0) {
      console.warn(`  trigger_event ${p.id} not found, skipping`);
      continue;
    }
    if (existing[0].event_category === p.event_category) {
      console.log(`  ${p.id} (${existing[0].event_name}) already = ${p.event_category}, skip`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.event_category });
    console.log(`  ${p.id} (${existing[0].event_name}) -> ${p.event_category}`);
  }
}

// =====================================================================
// B2-S2: Rule #15 notes='' revert on rows the audit pre-specifies by ID.
// 6 domain_data_objects rows (857, 858, 859, 860, 861, 1122) carry
// auto-populated notes (the "Phase-B Lite batch 2..." string on 857-861
// and a canonical-ownership editorial on 1122). 3 data_objects rows
// (594, 593, 795) carry the rescinded config-shape exemption text per
// Rule #12's now-revoked license. Orchestrator authorizes the revert
// because audit names the row IDs explicitly.
// =====================================================================
async function fixB2S2() {
  console.log("\n[B2-S2] Rule #15 notes='' revert on pre-specified rows");

  const ddoIds = [857, 858, 859, 860, 861, 1122];
  const ddoExisting = await get(
    `/domain_data_objects?id=in.(${ddoIds.join(",")})&select=id,notes`
  );
  let ddoPatched = 0;
  for (const row of ddoExisting) {
    if ((row.notes ?? "") === "") {
      console.log(`  domain_data_objects ${row.id} already empty, skip`);
      continue;
    }
    await patch(`/domain_data_objects?id=eq.${row.id}`, { notes: "" });
    console.log(`  domain_data_objects ${row.id} notes -> ''`);
    ddoPatched++;
  }

  const doIds = [594, 593, 795];
  const doExisting = await get(
    `/data_objects?id=in.(${doIds.join(",")})&select=id,data_object_name,notes`
  );
  let doPatched = 0;
  for (const row of doExisting) {
    if ((row.notes ?? "") === "") {
      console.log(`  data_objects ${row.id} (${row.data_object_name}) already empty, skip`);
      continue;
    }
    await patch(`/data_objects?id=eq.${row.id}`, { notes: "" });
    console.log(`  data_objects ${row.id} (${row.data_object_name}) notes -> ''`);
    doPatched++;
  }

  console.log(`  reverted ${ddoPatched} DDO + ${doPatched} data_objects notes`);
}

// =====================================================================
// B1-H1 (partial): INSERT handoff_processes for handoffs with resolvable
// PCF. Audit pre-specifies handoff_id + PCF row name. Verified live:
//   handoff 858 already tagged (process_id=344 Plan facility)
//   handoff 870 already tagged (process_id=345 Provide workspace and facilities)
//   handoff 6   already tagged (process_id=224, discovery_override, kept)
// Remaining 5 handoffs to tag, with PCFs resolved from /processes by
// name lookup:
//   869  IWMS-DESK -> HCM    workplace_feedback.submitted   -> 250  (7.8.2 Conduct employee engagement surveys)
//   1165 IWMS-DESK -> IGA    desk_booking.checked_in         -> 1196 (8.3.8.3 Manage IT user authorization)
//   1166 IWMS-WSD  -> ERP-FIN workplace_service_request.resolved -> 1371 (9.2.5.5 Prepare chargeback invoices)
//   1167 IWMS-ROOM -> IWMS-ANALYTICS room_reservation.no_show -> 346 (10.1.4 Manage facilities operations)
//   1168 IWMS-DESK -> IWMS-ANALYTICS desk_booking.checked_in  -> 346 (10.1.4 Manage facilities operations)
// =====================================================================
async function fixH1() {
  console.log("\n[H1] handoff_processes inserts (agent_curated)");
  const rows: Array<{ handoff_id: number; process_id: number; note: string }> = [
    { handoff_id: 869,  process_id: 250,  note: "Conduct employee engagement surveys (IWMS-DESK->HCM workplace_feedback.submitted)" },
    { handoff_id: 1165, process_id: 1196, note: "Manage IT user authorization (IWMS-DESK->IGA desk_booking.checked_in)" },
    { handoff_id: 1166, process_id: 1371, note: "Prepare chargeback invoices (IWMS-WSD->ERP-FIN workplace_service_request.resolved)" },
    { handoff_id: 1167, process_id: 346,  note: "Manage facilities operations (IWMS-ROOM->IWMS-ANALYTICS room_reservation.no_show)" },
    { handoff_id: 1168, process_id: 346,  note: "Manage facilities operations (IWMS-DESK->IWMS-ANALYTICS desk_booking.checked_in)" },
  ];

  // Idempotency: pull every existing (handoff_id, process_id) for these handoffs.
  const handoffIds = rows.map(r => r.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`
  );
  const existingKey = new Set(
    existing.map((r: any) => `${r.handoff_id}::${r.process_id}`)
  );

  // Verify every proposed process_id exists in /processes before any insert.
  const processIds = Array.from(new Set(rows.map(r => r.process_id))).join(",");
  const processCheck = await get(`/processes?id=in.(${processIds})&select=id,process_name`);
  const foundProcessIds = new Set(processCheck.map((p: any) => Number(p.id)));
  for (const r of rows) {
    if (!foundProcessIds.has(r.process_id)) {
      throw new Error(`process_id ${r.process_id} (${r.note}) not found in /processes; aborting before any insert`);
    }
  }
  console.log(`  verified ${processCheck.length} PCF processes resolvable`);

  // Verify every handoff_id exists.
  const handoffCheck = await get(`/handoffs?id=in.(${handoffIds})&select=id`);
  const foundHandoffIds = new Set(handoffCheck.map((h: any) => Number(h.id)));
  for (const r of rows) {
    if (!foundHandoffIds.has(r.handoff_id)) {
      throw new Error(`handoff_id ${r.handoff_id} (${r.note}) not found in /handoffs; aborting before any insert`);
    }
  }

  const toInsert = rows
    .filter(r => !existingKey.has(`${r.handoff_id}::${r.process_id}`))
    .map(r => ({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted -> defaults to 'new' (Rule #1)
      // notes omitted -> defaults to '' (Rule #15)
    }));

  for (const r of rows) {
    if (existingKey.has(`${r.handoff_id}::${r.process_id}`)) {
      console.log(`  (${r.handoff_id}, ${r.process_id}) already present, skip`);
    }
  }
  if (toInsert.length === 0) {
    console.log(`  nothing to insert`);
    return;
  }
  console.log(`  inserting ${toInsert.length} agent_curated handoff_processes rows`);
  for (const row of toInsert) {
    await post(`/handoff_processes`, [row]);
    console.log(`  + (${row.handoff_id}, ${row.process_id})`);
  }
}

// =====================================================================
// MAIN
// =====================================================================
async function main() {
  // Sanity check tenant.
  const who = await call("crud", "getCurrentUser", {});
  if (!who.ok) throw new Error(`getCurrentUser failed: ${who.stderr}`);
  const email = who.data?.email ?? "<unknown>";
  console.log(`Authenticated as ${email}`);
  // Belt-and-braces: refuse to run if domain_map module (1001) is not in scope.
  const dm = (who.data?.modules ?? []).find((m: any) => Number(m.id) === 1001);
  if (!dm) throw new Error(`domain_map module (1001) not in tenant scope; aborting`);

  await fixB1S3();
  await fixB2S2();
  await fixH1();

  console.log("\nDone.");
  console.log("UI: https://tests.semantius.app/domain_map/trigger_events");
  console.log("UI: https://tests.semantius.app/domain_map/domain_data_objects");
  console.log("UI: https://tests.semantius.app/domain_map/data_objects");
  console.log("UI: https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
