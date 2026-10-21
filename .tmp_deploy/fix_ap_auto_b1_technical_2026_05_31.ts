#!/usr/bin/env bun
// AP-AUTO B1 technical fixes (continuation 2026-05-31).
//
// Scope (per orchestrator allow-list - residual B1 only, none yet applied):
//   - B1-S7  PATCH event_category on the 3 trigger_events the audit names with
//            resolved enum value 'state_change' (Rule #13 enum backfill).
//   - B1-S5  INSERT 4 data_object_relationships user-edges (Rule #10) tying the
//            platform-builtin `users` row to the 2 AP-AUTO masters using the
//            verb shapes the audit pre-specifies.
//   - B1-S6  INSERT 1 intra-domain data_object_relationships edge
//            `invoice_matches feeds_into payment_runs` (audit fully pre-specifies
//            cardinality / owner_side / is_required / inverse_verb).
//   - B1-S13 PATCH 3 domain_data_objects rows (supplier_invoices, suppliers,
//            org_units) to revert `notes` to '' (Rule #15) and PATCH the
//            org_units embedded_master row to necessity='optional' (Rule #16).
//   - B1-H1  INSERT 18 handoff_processes rows for handoffs the audit pre-
//            specifies with a resolvable APQC external_id AND that have no
//            existing handoff_processes row pointing at the same PCF. Each
//            row ships proposal_source='agent_curated', record_status omitted
//            (defaults to 'new' per Rule #1), notes omitted (Rule #15).
//
// Deferred (NOT applied here, recorded in the audit continuation):
//   - B1-S1  M1 hard fail. New `domain_modules` rows. Shape itself is a Bucket 2
//            user-judgment call (2 vs 3 vs 4 modules).
//   - B1-S2  A2 capability gap. New `capabilities` rows. Out of orchestrator
//            allow-list (new entities).
//   - B1-S3  B12 lifecycle states. Gated on B1-S1 module set + needs draft state
//            machines.
//   - B1-S4  B11 aliases. Audit names alias candidates but does not pre-specify
//            exact (alias_name, alias_type) tuples. Orchestrator rule defers
//            bulk alias inserts unless audit pre-specifies exact tuples.
//   - B1-S5 follow-on verbs beyond the 4 the audit named (audit says "etc.").
//   - B1-S8  trigger_event 12 DELETE vs RENAME. Bucket 2 item 4 explicitly
//            raises this as a user judgment call ("clean DELETE vs rename-in-
//            place vs full bill_payments investigation").
//   - B1-S9  F1 transitional skill 28 retirement. Gated on B1-S1 modules.
//   - B1-S10 B10b source/target_domain_module_id backfill. Gated on B1-S1.
//   - B1-S11 B9b intra-domain handoffs. Gated on B1-S1 modules.
//   - B1-S12 catalog_tagline + catalog_description (Rule #20: explicit defer).
//   - B1-B1..B4 BOUNDARY findings (gated on B1-S1).
//   - B1-H1 PATCHes (handoffs 192, 193, 128: existing discovery_override flips
//           to agent_curated; handoff 340 second-row replacement; handoff 583
//           PCF replacement; handoff 216 PCF replacement). Orchestrator rule:
//           INSERT-only for handoff_processes.
//   - B1-H1 medium-confidence inserts (handoffs 302, 298, 556 / B1-H1-14, -15,
//           -21). Bucket 2 prompt explicitly labels these as user-decline-able
//           medium-confidence tags.
//   - B1-H1 inserts that would duplicate an existing PCF on the same handoff
//           (handoffs 543, 547, 596: live rows already point at a DIFFERENT
//           agent_curated PCF; adding a second agent_curated PCF on the same
//           handoff is a judgment call).
//   - Bucket 2 items 1-4 (judgment calls).
//   - Bucket 3 items (Phase 0 vetting, new entities).
//
// Pre-flight verifications (run before any PATCH/INSERT):
//   - 3 trigger_events 559/560/561 exist with event_category=''.
//   - 3 domain_data_objects rows 338/344/1135 exist for domain_id=29 with
//     non-empty `notes`; row 1135 has necessity='required'.
//   - All proposed PCFs resolve by external_id.
//   - For each candidate handoff_processes insert, no existing row for the
//     same (handoff_id, process_id) pair.
//
// Run from project root only (Rule #6):
//   bun run .tmp_deploy/fix_ap_auto_b1_technical_2026_05_31.ts

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
const patch = (path: string, body: Row) =>
  call({ method: "PATCH", path, body });
const post = (path: string, body: Row[]) =>
  call({ method: "POST", path, body });

// ============================================================
// B1-S7: PATCH event_category on 3 trigger_events
// Audit-specified mapping (Rule #13 enum: state_change).
// ============================================================
const eventCategoryPatches: { id: number; event_name: string; event_category: string }[] = [
  { id: 559, event_name: "invoice_match.three_way_passed", event_category: "state_change" },
  { id: 560, event_name: "invoice_match.exception_raised", event_category: "state_change" },
  { id: 561, event_name: "invoice_match.manual_override",  event_category: "state_change" },
];

// ============================================================
// B1-S5 user-edges (Rule #10).
// Verb-shapes pre-specified by the audit:
//   invoice_matches: matches_invoice, overrides_match
//   payment_runs:    approves_payment_run, executes_payment_run
// ============================================================
type EdgeSpec = {
  user_verb: string;
  inverse_verb: string;
  master_name: string;
  is_required: boolean;
};

const userEdgeSpecs: EdgeSpec[] = [
  { user_verb: "matches_invoice",       inverse_verb: "is_matched_by",   master_name: "invoice_matches", is_required: true  },
  { user_verb: "overrides_match",       inverse_verb: "is_overridden_by", master_name: "invoice_matches", is_required: false },
  { user_verb: "approves_payment_run",  inverse_verb: "is_approved_by",  master_name: "payment_runs",    is_required: true  },
  { user_verb: "executes_payment_run",  inverse_verb: "is_executed_by",  master_name: "payment_runs",    is_required: true  },
];

// ============================================================
// B1-S6: 1 intra-domain edge (audit fully pre-specifies).
//   invoice_matches feeds_into payment_runs
//   one_to_many, owner_side=source, is_required=false, inverse_verb=draws_from
// ============================================================
const intraDomainEdge = {
  source_name: "invoice_matches",
  target_name: "payment_runs",
  relationship_verb: "feeds_into",
  inverse_verb: "draws_from",
  relationship_type: "one_to_many",
  relationship_kind: "reference",
  is_required: false,
  owner_side: "source",
};

// ============================================================
// B1-S13(a): Rule #15 notes reverts on 3 domain_data_objects rows for AP-AUTO.
// B1-S13(b): Rule #16 necessity flip on the org_units embedded_master row.
// IDs from live read against domain_id=29.
// ============================================================
const notesRevertIds = [
  { id: 338,  label: "supplier_invoices (contributor)" },
  { id: 344,  label: "suppliers (consumer)" },
  { id: 1135, label: "org_units (embedded_master)" },
];
const orgUnitsNecessityFlip = { id: 1135, label: "org_units (embedded_master)" };

// ============================================================
// B1-H1: handoff_processes INSERTs.
// process_ids resolved from external_id via /processes lookup at runtime.
// Only handoffs WITHOUT an existing row for the same (handoff_id, process_id)
// are inserted; the rest are skipped (PATCH/REPLACE deferred per orchestrator).
// ============================================================
type TagSpec = {
  handoff_id: number;
  external_id: string;   // APQC PCF external_id
  process_name: string;  // for log readability only
};

const handoffTags: TagSpec[] = [
  // Outbound (AP-AUTO -> *)
  { handoff_id: 125, external_id: "10862", process_name: "Process and distribute payments" },
  { handoff_id: 126, external_id: "10871", process_name: "Audit invoices and key data in AP system" },
  { handoff_id: 191, external_id: "10875", process_name: "Research/Resolve payable exceptions" },
  { handoff_id: 542, external_id: "10756", process_name: "Process accounts payable (AP)" },
  { handoff_id: 545, external_id: "10297", process_name: "Reconcile purchase orders" },
  { handoff_id: 598, external_id: "10756", process_name: "Process accounts payable (AP)" },
  // Inbound (* -> AP-AUTO) - confident only
  { handoff_id: 130, external_id: "10883", process_name: "Process reimbursements and advances" },
  { handoff_id: 168, external_id: "10756", process_name: "Process accounts payable (AP)" },
  { handoff_id: 316, external_id: "10756", process_name: "Process accounts payable (AP)" },
  { handoff_id: 553, external_id: "10883", process_name: "Process reimbursements and advances" },
  // Follow-up block from the audit
  { handoff_id: 584, external_id: "10756", process_name: "Process accounts payable (AP)" },
  { handoff_id: 588, external_id: "10756", process_name: "Process accounts payable (AP)" },
  { handoff_id: 596, external_id: "10280", process_name: "Manage suppliers" },
  { handoff_id: 733, external_id: "10756", process_name: "Process accounts payable (AP)" },
  { handoff_id: 734, external_id: "10875", process_name: "Research/Resolve payable exceptions" },
];

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log("AP-AUTO B1 technical fixes (2026-05-31)\n");

  // ----------------------------------------------------------
  // B1-S7: trigger_events.event_category backfill
  // ----------------------------------------------------------
  console.log(`B1-S7: PATCH event_category on ${eventCategoryPatches.length} trigger_events`);
  const evIds = eventCategoryPatches.map(p => p.id);
  const evBefore = await get(
    `/trigger_events?id=in.(${evIds.join(",")})&select=id,event_name,event_category`,
  );
  if (evBefore.length !== evIds.length) {
    throw new Error(`pre-flight B1-S7: expected ${evIds.length} trigger_events, got ${evBefore.length}`);
  }
  const evState = new Map(evBefore.map(r => [Number(r.id), { name: String(r.event_name), cat: String(r.event_category ?? "") }]));
  let evPatched = 0, evSkipped = 0;
  for (const p of eventCategoryPatches) {
    const cur = evState.get(p.id);
    if (!cur) throw new Error(`pre-flight B1-S7: id ${p.id} not in live read`);
    if (cur.name !== p.event_name) {
      throw new Error(`pre-flight B1-S7: id ${p.id} live name "${cur.name}" != expected "${p.event_name}"`);
    }
    if (cur.cat === p.event_category) {
      evSkipped++;
      continue;
    }
    if (cur.cat !== "") {
      console.log(`  WARN id=${p.id} (${p.event_name}) already has event_category='${cur.cat}' (expected empty). Overwriting to '${p.event_category}'.`);
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.event_category });
    evPatched++;
  }
  console.log(`  patched=${evPatched}, already-correct=${evSkipped}`);
  const evAfter = await get(
    `/trigger_events?id=in.(${evIds.join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  const stillEmpty = evAfter.filter(r => !r.event_category || r.event_category === "");
  if (stillEmpty.length > 0) {
    throw new Error(`B1-S7 post-flight FAIL: ${stillEmpty.length} rows still empty: ${stillEmpty.map(r => r.id).join(",")}`);
  }
  console.log(`  verified: all ${evIds.length} rows now carry a valid event_category.`);

  // ----------------------------------------------------------
  // Resolve master ids + users id (used by B1-S5, B1-S6)
  // ----------------------------------------------------------
  const masterNames = Array.from(new Set([
    ...userEdgeSpecs.map(e => e.master_name),
    intraDomainEdge.source_name,
    intraDomainEdge.target_name,
  ]));
  const masterRows = await get(
    `/data_objects?data_object_name=in.(${masterNames.join(",")})&select=id,data_object_name`,
  );
  const masterIdByName = new Map(masterRows.map(r => [String(r.data_object_name), Number(r.id)]));
  for (const m of masterNames) {
    if (!masterIdByName.has(m)) throw new Error(`Could not resolve data_object '${m}'`);
  }
  const usersRows = await get(`/data_objects?data_object_name=eq.users&kind=eq.platform_builtin&select=id`);
  if (usersRows.length !== 1) throw new Error(`Expected exactly 1 platform_builtin users row, got ${usersRows.length}`);
  const usersId = Number(usersRows[0].id);
  console.log(`\nResolved users.id=${usersId}; masters=${[...masterIdByName.entries()].map(([n,i]) => `${n}=${i}`).join(", ")}`);

  // ----------------------------------------------------------
  // B1-S5: user-edges INSERT
  // ----------------------------------------------------------
  console.log(`\nB1-S5: INSERT data_object_relationships for ${userEdgeSpecs.length} user-edges`);
  const allEdgeIds = [usersId, ...masterNames.map(n => masterIdByName.get(n)!)];
  const existingUserEdges = await get(
    `/data_object_relationships?and=(data_object_id.in.(${allEdgeIds.join(",")}),related_data_object_id.in.(${allEdgeIds.join(",")}))&select=id,data_object_id,relationship_verb,related_data_object_id,inverse_verb`,
  );
  const existingKey = new Set(
    existingUserEdges.map(r => `${r.data_object_id}|${String(r.relationship_verb).toLowerCase()}|${r.related_data_object_id}`),
  );
  const newUserEdges: Row[] = [];
  const skippedUE: string[] = [];
  for (const e of userEdgeSpecs) {
    const masterId = masterIdByName.get(e.master_name)!;
    const fwdKey = `${usersId}|${e.user_verb.toLowerCase()}|${masterId}`;
    const invKey = `${masterId}|${e.inverse_verb.toLowerCase()}|${usersId}`;
    if (existingKey.has(fwdKey)) {
      skippedUE.push(`users ${e.user_verb} ${e.master_name} (already present forward)`);
      continue;
    }
    if (existingKey.has(invKey)) {
      skippedUE.push(`${e.master_name} ${e.inverse_verb} users (already present inverse)`);
      continue;
    }
    newUserEdges.push({
      data_object_id: usersId,
      related_data_object_id: masterId,
      relationship_verb: e.user_verb,
      inverse_verb: e.inverse_verb,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: e.is_required,
      owner_side: "target",
      // record_status -> default 'new' (Rule #1)
      // notes -> default '' (Rule #15)
    });
  }
  for (const s of skippedUE) console.log(`  skip: ${s}`);
  if (newUserEdges.length > 0) {
    const ins = await post("/data_object_relationships", newUserEdges);
    console.log(`  inserted ${ins.length} user-edge(s)`);
  } else {
    console.log(`  no new user-edges to insert`);
  }

  // ----------------------------------------------------------
  // B1-S6: intra-domain edge INSERT
  // ----------------------------------------------------------
  console.log(`\nB1-S6: INSERT intra-domain edge ${intraDomainEdge.source_name} ${intraDomainEdge.relationship_verb} ${intraDomainEdge.target_name}`);
  const srcId = masterIdByName.get(intraDomainEdge.source_name)!;
  const tgtId = masterIdByName.get(intraDomainEdge.target_name)!;
  const existIntra = await get(
    `/data_object_relationships?and=(data_object_id.eq.${srcId},related_data_object_id.eq.${tgtId})&select=id,relationship_verb`,
  );
  const existInv = await get(
    `/data_object_relationships?and=(data_object_id.eq.${tgtId},related_data_object_id.eq.${srcId})&select=id,relationship_verb`,
  );
  const dupFwd = existIntra.find(r => String(r.relationship_verb).toLowerCase() === intraDomainEdge.relationship_verb.toLowerCase());
  const dupInv = existInv.find(r => String(r.relationship_verb).toLowerCase() === intraDomainEdge.inverse_verb.toLowerCase());
  if (dupFwd) {
    console.log(`  skip: forward edge already exists (id=${dupFwd.id})`);
  } else if (dupInv) {
    console.log(`  skip: inverse edge already exists (id=${dupInv.id})`);
  } else {
    const ins = await post("/data_object_relationships", [{
      data_object_id: srcId,
      related_data_object_id: tgtId,
      relationship_verb: intraDomainEdge.relationship_verb,
      inverse_verb: intraDomainEdge.inverse_verb,
      relationship_type: intraDomainEdge.relationship_type,
      relationship_kind: intraDomainEdge.relationship_kind,
      is_required: intraDomainEdge.is_required,
      owner_side: intraDomainEdge.owner_side,
    }]);
    console.log(`  inserted 1 intra-domain edge (id=${ins[0]?.id ?? "?"})`);
  }

  // ----------------------------------------------------------
  // B1-S13(a): Rule #15 notes reverts
  // ----------------------------------------------------------
  console.log(`\nB1-S13(a): PATCH notes='' on ${notesRevertIds.length} domain_data_objects rows`);
  const ddoBefore = await get(
    `/domain_data_objects?id=in.(${notesRevertIds.map(n => n.id).join(",")})&select=id,domain_id,data_object_id,role,necessity,notes`,
  );
  if (ddoBefore.length !== notesRevertIds.length) {
    throw new Error(`pre-flight B1-S13(a): expected ${notesRevertIds.length} rows, got ${ddoBefore.length}`);
  }
  for (const row of ddoBefore) {
    if (Number(row.domain_id) !== 29) {
      throw new Error(`pre-flight B1-S13(a): id ${row.id} domain_id=${row.domain_id} (expected 29)`);
    }
  }
  let ddoPatched = 0, ddoSkipped = 0;
  for (const spec of notesRevertIds) {
    const cur = ddoBefore.find(r => Number(r.id) === spec.id);
    if (!cur) throw new Error(`pre-flight B1-S13(a): id ${spec.id} not in result set`);
    if (cur.notes === "" || cur.notes == null) {
      ddoSkipped++;
      console.log(`  skip: id=${spec.id} ${spec.label} notes already empty`);
      continue;
    }
    await patch(`/domain_data_objects?id=eq.${spec.id}`, { notes: "" });
    console.log(`  + id=${spec.id} ${spec.label} notes -> ''`);
    ddoPatched++;
  }
  console.log(`  patched=${ddoPatched}, already-empty=${ddoSkipped}`);

  // ----------------------------------------------------------
  // B1-S13(b): Rule #16 necessity flip on org_units row
  // ----------------------------------------------------------
  console.log(`\nB1-S13(b): PATCH necessity='optional' on org_units embedded_master (id=${orgUnitsNecessityFlip.id})`);
  const ouRow = ddoBefore.find(r => Number(r.id) === orgUnitsNecessityFlip.id);
  if (!ouRow) throw new Error(`pre-flight B1-S13(b): row id=${orgUnitsNecessityFlip.id} missing`);
  if (ouRow.role !== "embedded_master") {
    throw new Error(`pre-flight B1-S13(b): id=${orgUnitsNecessityFlip.id} role='${ouRow.role}' (expected embedded_master)`);
  }
  if (ouRow.necessity === "optional") {
    console.log(`  skip: already necessity='optional'`);
  } else {
    await patch(`/domain_data_objects?id=eq.${orgUnitsNecessityFlip.id}`, { necessity: "optional" });
    console.log(`  + id=${orgUnitsNecessityFlip.id} necessity '${ouRow.necessity}' -> 'optional'`);
  }

  // ----------------------------------------------------------
  // B1-H1: handoff_processes INSERTs
  // ----------------------------------------------------------
  console.log(`\nB1-H1: INSERT handoff_processes for ${handoffTags.length} candidate (handoff_id, PCF) pairs`);
  const externalIds = Array.from(new Set(handoffTags.map(t => t.external_id)));
  const pcfRows = await get(
    `/processes?external_id=in.(${externalIds.join(",")})&source_framework=eq.apqc_pcf_cross_industry&select=id,external_id,process_name`,
  );
  const processIdByExt = new Map(pcfRows.map(r => [String(r.external_id), Number(r.id)]));
  for (const ext of externalIds) {
    if (!processIdByExt.has(ext)) throw new Error(`pre-flight B1-H1: APQC external_id=${ext} not found`);
  }
  const handoffIds = Array.from(new Set(handoffTags.map(t => t.handoff_id)));
  const existingHp = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id`,
  );
  const haveKey = new Set(existingHp.map(r => `${r.handoff_id}|${r.process_id}`));
  const newHp: Row[] = [];
  const skippedHp: string[] = [];
  for (const t of handoffTags) {
    const pid = processIdByExt.get(t.external_id)!;
    const key = `${t.handoff_id}|${pid}`;
    if (haveKey.has(key)) {
      skippedHp.push(`handoff=${t.handoff_id} pcf=${t.external_id} (${t.process_name}) -- row already exists`);
      continue;
    }
    newHp.push({
      handoff_id: t.handoff_id,
      process_id: pid,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status -> default 'new' (Rule #1)
      // notes -> default '' (Rule #15)
    });
  }
  for (const s of skippedHp) console.log(`  skip: ${s}`);
  if (newHp.length > 0) {
    const ins = await post("/handoff_processes", newHp);
    console.log(`  inserted ${ins.length} handoff_processes row(s)`);
  } else {
    console.log(`  no new handoff_processes to insert`);
  }

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------
  console.log(`\nDone.`);
  console.log(`UI spot-check links:`);
  console.log(`  https://tests.semantius.app/domain_map/trigger_events`);
  console.log(`  https://tests.semantius.app/domain_map/data_object_relationships`);
  console.log(`  https://tests.semantius.app/domain_map/domain_data_objects`);
  console.log(`  https://tests.semantius.app/domain_map/handoff_processes`);
}

await main();
