#!/usr/bin/env bun
/**
 * REMOTE-ACCESS B1 technical fixes - 2026-05-31 continuation.
 *
 * Scope (truly-technical B1 fixes only, per the continuation prompt):
 *   - B1-S6: PATCH 3 trigger_events.event_category enum backfills
 *       653 remote_session.started               -> state_change
 *       654 remote_session.ended                 -> state_change
 *       655 remote_session.unauthorized_access_attempt -> signal
 *     (Event 113 session.recorded already = signal, valid.)
 *
 *   - B1-S4 (B7): INSERT 4 user-edge data_object_relationships rows per Rule #10.
 *       Source = users (748), targets = the 2 REMOTE-ACCESS masters.
 *       Audit pre-specifies 4 roles:
 *         users -> remote_sessions     (technician initiator)
 *         users -> remote_sessions     (end-user participant)
 *         users -> session_recordings  (recording author)
 *         users -> session_recordings  (recording approver)
 *       Convention (matches recent loads): owner_side='target',
 *       relationship_type='one_to_many', relationship_kind='reference',
 *       is_required=false.
 *
 *   - B1-H1: INSERT 6 handoff_processes rows (audit pre-specifies handoff_id +
 *     PCF external_id). Handoff 162 already has a tag (process 295). The 6 new:
 *         handoff 163 -> process 295 (external_id 20921 "Operate IT user support")
 *         handoff 164 -> process 268 (external_id 20721 "Control IT risk, compliance, and security")
 *         handoff 646 -> process 295 (external_id 20921 "Operate IT user support")
 *         handoff 647 -> process 295 (external_id 20921 "Operate IT user support")
 *         handoff 648 -> process 268 (external_id 20721 "Control IT risk, compliance, and security")
 *         handoff 160 -> process 295 (external_id 20921 "Operate IT user support")
 *     proposal_source='agent_curated'; record_status omitted (DB default 'new' per Rule #1).
 *
 * Deferred (not applied; reasons recorded in audit continuation):
 *   - B1-S1 / B1-S2 (new modules + capability links): gated on B2-S1 + B2-S5 user picks.
 *   - B1-S3 (intra-domain B6 produces): cardinality "TBD with user".
 *   - B1-S5 (cross-domain B8 relationships): scope rule limits user-edges only; GRC edges blocked on Bucket 3 target masters.
 *   - B1-S7 (B10b backfill): blocked on B1-S1 (REMOTE-ACCESS has zero modules).
 *   - B1-S8 (F1 legacy skill retire) + B1-S9 (F7 channel primitives): blocked on B1-S1 + Phase-S re-author.
 *   - B1-S10 (B11 aliases 6-8 rows): audit lists synonym options, not exact tuples; bulk aliases deferred.
 *   - B1-S11 (domain_regulations 3 rows): blocked on B2-S4 user-chosen scoping.
 *   - B1-S12 (B12 lifecycle states): blocked on B1-S1 + B2-S2.
 *
 * Pre-flight verified:
 *   - REMOTE-ACCESS domain id = 132.
 *   - trigger_events 653/654/655 carry empty event_category; 113 = 'signal'.
 *   - data_object 748 is users (kind='platform_builtin').
 *   - data_objects 238 (remote_sessions), 239 (session_recordings) exist.
 *   - Zero data_object_relationships on 238 or 239.
 *   - processes 295 (external_id 20921) and 268 (external_id 20721) exist.
 *   - handoff_processes already has 1 row: handoff 162 -> process 295.
 *
 * Idempotent: each step re-checks before writing; safe to re-run.
 * Run from project root: bun run .tmp_deploy/fix_remote_access_b1_technical_2026_05_31.ts
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
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", {
    method: "POST",
    path,
    body,
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
  }) as Promise<any[]>;
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", {
    method: "PATCH",
    path,
    body,
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
  }) as Promise<any[]>;

// -----------------------------------------------------------------------------
// Pre-flight
// -----------------------------------------------------------------------------
async function preflight() {
  console.log("=== Pre-flight ===");

  // Events
  const evs = await get(
    "/trigger_events?id=in.(113,653,654,655)&select=id,event_name,event_category&order=id.asc",
  );
  if (evs.length !== 4) throw new Error(`pre-flight: expected 4 events, got ${evs.length}`);
  const evById = new Map(evs.map((e: any) => [e.id, e]));
  for (const id of [653, 654, 655]) {
    const e: any = evById.get(id);
    if (!e) throw new Error(`pre-flight: trigger_event ${id} missing`);
    console.log(`  + trigger_event ${id} ${e.event_name}: event_category=${JSON.stringify(e.event_category)}`);
  }

  // Data objects (masters + users)
  const dos = await get("/data_objects?id=in.(238,239,748)&select=id,data_object_name,kind");
  if (dos.length !== 3) throw new Error(`pre-flight: expected 3 data_objects, got ${dos.length}`);
  for (const d of dos) {
    console.log(`  + data_object ${d.id} ${d.data_object_name} (kind=${d.kind})`);
  }

  // Existing relationships on the masters
  const existingRels = await get(
    "/data_object_relationships?or=(data_object_id.in.(238,239),related_data_object_id.in.(238,239))&select=id,data_object_id,related_data_object_id,relationship_verb",
  );
  console.log(`  + existing data_object_relationships on masters: ${existingRels.length}`);
  for (const r of existingRels) {
    console.log(`      id=${r.id} ${r.data_object_id}->${r.related_data_object_id} (${r.relationship_verb})`);
  }

  // Processes
  const ps = await get(
    "/processes?id=in.(268,295)&select=id,process_name,external_id&order=id.asc",
  );
  if (ps.length !== 2) throw new Error(`pre-flight: expected 2 processes, got ${ps.length}`);
  for (const p of ps) {
    console.log(`  + process ${p.id}: "${p.process_name}" (external_id=${p.external_id})`);
  }

  // Handoffs (own-domain + inbound)
  const hs = await get(
    "/handoffs?id=in.(160,162,163,164,646,647,648)&select=id,source_domain_id,target_domain_id,trigger_event_id,data_object_id&order=id.asc",
  );
  if (hs.length !== 7) throw new Error(`pre-flight: expected 7 handoffs, got ${hs.length}`);
  for (const h of hs) {
    console.log(`    handoff ${h.id} src=${h.source_domain_id} tgt=${h.target_domain_id} ev=${h.trigger_event_id} payload_do=${h.data_object_id}`);
  }

  // Existing handoff_processes
  const existingHp = await get(
    "/handoff_processes?handoff_id=in.(160,162,163,164,646,647,648)&select=id,handoff_id,process_id,proposal_source",
  );
  console.log(`  + existing handoff_processes rows: ${existingHp.length}`);
  for (const r of existingHp) {
    console.log(`      id=${r.id} handoff=${r.handoff_id} process=${r.process_id} (${r.proposal_source})`);
  }
}

// -----------------------------------------------------------------------------
// B1-S6: PATCH 3 trigger_events.event_category
// -----------------------------------------------------------------------------
async function patchEventCategories() {
  console.log("\n=== B1-S6: PATCH 3 trigger_events.event_category ===");
  const targets: Array<{ id: number; category: string }> = [
    { id: 653, category: "state_change" }, // remote_session.started
    { id: 654, category: "state_change" }, // remote_session.ended
    { id: 655, category: "signal" },       // remote_session.unauthorized_access_attempt
  ];
  let n = 0;
  for (const t of targets) {
    const existing = await get(
      `/trigger_events?id=eq.${t.id}&select=id,event_name,event_category`,
    );
    if (existing.length !== 1) throw new Error(`event ${t.id} not found at patch-time`);
    if (existing[0].event_category === t.category) {
      console.log(`  = event ${t.id} already ${t.category}, skip`);
      continue;
    }
    const r = await patch(`/trigger_events?id=eq.${t.id}`, { event_category: t.category });
    console.log(`  + event ${t.id} ${existing[0].event_name}: event_category -> ${t.category} (rows=${r.length})`);
    n++;
  }
  console.log(`  applied ${n} PATCHes`);
}

// -----------------------------------------------------------------------------
// B1-S4 (B7): INSERT 4 user-edges per Rule #10
// -----------------------------------------------------------------------------
async function insertUserEdges() {
  console.log("\n=== B1-S4 (B7): INSERT 4 user-edge data_object_relationships ===");
  const edges: Array<{
    related: number;
    verb: string;
    inverse: string;
    label: string;
  }> = [
    // remote_sessions (238)
    {
      related: 238,
      verb: "initiates",
      inverse: "is initiated by",
      label: "user initiates remote_sessions",
    },
    {
      related: 238,
      verb: "participates_in",
      inverse: "has participant",
      label: "user participates_in remote_sessions",
    },
    // session_recordings (239)
    {
      related: 239,
      verb: "authors",
      inverse: "is authored by",
      label: "user authors session_recordings",
    },
    {
      related: 239,
      verb: "approves",
      inverse: "is approved by",
      label: "user approves session_recordings",
    },
  ];

  let n = 0;
  for (const e of edges) {
    const existing = await get(
      `/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.eq.${e.related},relationship_verb.eq.${encodeURIComponent(e.verb)})&select=id`,
    );
    if (existing.length > 0) {
      console.log(`  = edge users->${e.related} (${e.verb}) exists (id ${existing[0].id}), skip`);
      continue;
    }
    const inserted = await post("/data_object_relationships", [
      {
        data_object_relationship_label: e.label,
        data_object_id: 748,
        related_data_object_id: e.related,
        owner_side: "target",
        relationship_type: "one_to_many",
        relationship_kind: "reference",
        relationship_verb: e.verb,
        inverse_verb: e.inverse,
        is_required: false,
      },
    ]);
    console.log(`  + inserted edge users->${e.related} (${e.verb}) id ${inserted[0]?.id}`);
    n++;
  }
  console.log(`  inserted ${n} user-edges`);
}

// -----------------------------------------------------------------------------
// B1-H1: INSERT 6 handoff_processes rows
// -----------------------------------------------------------------------------
async function insertHandoffProcesses() {
  console.log("\n=== B1-H1: INSERT 6 handoff_processes ===");
  const tags: Array<{ handoff_id: number; process_id: number; note: string }> = [
    { handoff_id: 163, process_id: 295, note: "msp_session.completed -> MSP-PSA, Operate IT user support" },
    { handoff_id: 164, process_id: 268, note: "session.recorded -> GRC, Control IT risk/compliance/security" },
    { handoff_id: 646, process_id: 295, note: "remote_session.ended -> ITSM, Operate IT user support" },
    { handoff_id: 647, process_id: 295, note: "remote_session.ended -> MSP-PSA, Operate IT user support" },
    { handoff_id: 648, process_id: 268, note: "remote_session.unauthorized_access_attempt -> GRC, Control IT risk/compliance/security" },
    { handoff_id: 160, process_id: 295, note: "MSP-PSA -> REMOTE-ACCESS on msp_ticket.escalated, Operate IT user support" },
  ];
  let n = 0;
  for (const t of tags) {
    const existing = await get(
      `/handoff_processes?handoff_id=eq.${t.handoff_id}&process_id=eq.${t.process_id}&select=id,proposal_source,record_status`,
    );
    if (existing.length > 0) {
      console.log(`  = handoff ${t.handoff_id} -> process ${t.process_id} exists (id ${existing[0].id}), skip`);
      continue;
    }
    const inserted = await post("/handoff_processes", {
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      proposal_source: "agent_curated",
      // record_status omitted; DB default 'new' applies per Rule #1.
    });
    console.log(`  + inserted handoff ${t.handoff_id} -> process ${t.process_id} (id ${inserted[0]?.id}) [${t.note}]`);
    n++;
  }
  console.log(`  inserted ${n} handoff_processes rows`);
}

// -----------------------------------------------------------------------------
// Post-flight
// -----------------------------------------------------------------------------
async function postflight() {
  console.log("\n=== Post-flight ===");

  const evs = await get(
    "/trigger_events?id=in.(653,654,655)&select=id,event_name,event_category&order=id.asc",
  );
  for (const e of evs) {
    console.log(`  trigger_event ${e.id} ${e.event_name}: event_category=${e.event_category}`);
    if (e.event_category === "") throw new Error(`post-flight: event ${e.id} still has empty event_category`);
  }

  const rels = await get(
    "/data_object_relationships?data_object_id=eq.748&related_data_object_id=in.(238,239)&select=id,related_data_object_id,relationship_verb&order=id.asc",
  );
  console.log(`  user-edges on REMOTE-ACCESS masters: ${rels.length}`);
  for (const r of rels) {
    console.log(`    id=${r.id} users->${r.related_data_object_id} (${r.relationship_verb})`);
  }
  if (rels.length < 4) throw new Error(`post-flight: expected >=4 user-edges, got ${rels.length}`);

  const hp = await get(
    "/handoff_processes?handoff_id=in.(160,162,163,164,646,647,648)&select=id,handoff_id,process_id,proposal_source,record_status&order=id.asc",
  );
  console.log(`  handoff_processes rows for REMOTE-ACCESS handoffs: ${hp.length}`);
  for (const r of hp) {
    console.log(`    id=${r.id} handoff=${r.handoff_id} process=${r.process_id} (${r.proposal_source}/${r.record_status})`);
  }
  if (hp.length < 7) throw new Error(`post-flight: expected >=7 handoff_processes rows, got ${hp.length}`);
}

async function main() {
  console.log("REMOTE-ACCESS B1 technical fixes (2026-05-31 continuation)");
  console.log("===========================================================\n");
  await preflight();
  await patchEventCategories();
  await insertUserEdges();
  await insertHandoffProcesses();
  await postflight();
  console.log("\nDone.");
  console.log("  UI: https://tests.semantius.app/domain_map/trigger_events");
  console.log("  UI: https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  UI: https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
