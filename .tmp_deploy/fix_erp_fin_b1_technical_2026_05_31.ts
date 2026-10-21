#!/usr/bin/env bun
// ERP-FIN B1 technical fixes (continuation 2026-05-31).
//
// Scope (per orchestrator allow-list):
//   - B1-S2: PATCH event_category on the 16 trigger_events the audit names with
//     resolved enum values.
//   - B1-S5 (user-edges only, per Rule #10 + audit pre-specification): INSERT 6
//     data_object_relationships rows tying ERP-FIN masters to the platform-builtin
//     `users` data_object. Existing `users owns cost_centers` edge (id 24) is
//     skipped.
//
// Deferred (out of orchestrator's "technical" allow-list, defer to user):
//   - B1-S1 (author module set, gated on B2-S4 design choice)
//   - B1-S3 (new business_function_domains contributors/consumers, forbidden by
//     orchestrator rule)
//   - B1-S4 (aliases, not in orchestrator's TECHNICAL list and several proposed
//     names embed vendor terminology subject to Rule #18 + #20 review)
//   - B1-S5 master-to-master edges (orchestrator only licensed user-edges)
//   - B1-S6 (skill re-anchoring, gated on B1-S1)
//   - B1-S7 (handoff_processes APQC tags; existing rows are discovery_substring
//     and require PATCH-to-`agent_curated` or DELETE+INSERT which is outside the
//     INSERT-only allow-list)
//   - B2-* (judgement calls)
//
// Run from project root only (Rule #6):
//   bun run .tmp_deploy/fix_erp_fin_b1_technical_2026_05_31.ts

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
// B1-S2: PATCH event_category on 16 trigger_events
// Values pre-specified by the audit (see audits/ERP-FIN.md B1-S2 row).
// Allowed enum (Rule #13): lifecycle | state_change | threshold | signal
// ============================================================

const eventCategoryPatches: { id: number; event_name: string; event_category: string }[] = [
  { id: 543, event_name: "accounting_period.opened", event_category: "state_change" },
  { id: 544, event_name: "accounting_period.reopened", event_category: "state_change" },
  { id: 545, event_name: "gl_account.created", event_category: "lifecycle" },
  { id: 546, event_name: "gl_account.mapping_changed", event_category: "state_change" },
  { id: 547, event_name: "cost_center.created", event_category: "lifecycle" },
  { id: 548, event_name: "cost_center.deactivated", event_category: "state_change" },
  { id: 549, event_name: "legal_entity.created", event_category: "lifecycle" },
  { id: 550, event_name: "bank_account.added", event_category: "lifecycle" },
  { id: 551, event_name: "bank_account.statement_received", event_category: "signal" },
  { id: 552, event_name: "cash_transaction.posted", event_category: "lifecycle" },
  { id: 553, event_name: "cash_transaction.unmatched", event_category: "signal" },
  { id: 554, event_name: "fixed_asset.capitalized", event_category: "state_change" },
  { id: 555, event_name: "fixed_asset.disposed", event_category: "state_change" },
  { id: 556, event_name: "depreciation.posted", event_category: "lifecycle" },
  { id: 557, event_name: "intercompany_transaction.posted", event_category: "lifecycle" },
  { id: 558, event_name: "intercompany.mismatch_detected", event_category: "signal" },
];

// ============================================================
// B1-S5 user-edges (Rule #10). Master ids resolved live; users is the seeded
// platform_builtin (data_objects.id=748, kind='platform_builtin').
//
// Audit-specified user-edges (master `verb_by` users, i.e. users `verb` master):
//   journal_entries        created_by  users  (users creates journal_entries)
//   journal_entries        approved_by users  (users approves journal_entries)
//   accounting_periods     closed_by   users  (users closes accounting_periods)
//   legal_entities         owned_by    users  (users owns legal_entities)
//   fixed_assets           approved_by users  (users approves fixed_assets)
//   intercompany_transactions reconciled_by users (users reconciles intercompany_transactions)
// Existing: users owns cost_centers (id 24) -- skipped.
//
// Authoring convention: store the parent-voice verb on the users row
// (users creates journal_entries), matching existing edge id 24
// (users owns cost_centers) and Rule #10's "edges record the user as actor".
// ============================================================

type EdgeSpec = {
  user_verb: string;       // users <verb> master
  inverse_verb: string;    // master <inverse_verb> users
  master_name: string;     // data_objects.data_object_name
  is_required: boolean;
};

const userEdgeSpecs: EdgeSpec[] = [
  { user_verb: "creates",     inverse_verb: "is_created_by",    master_name: "journal_entries",            is_required: true  },
  { user_verb: "approves",    inverse_verb: "is_approved_by",   master_name: "journal_entries",            is_required: false },
  { user_verb: "closes",      inverse_verb: "is_closed_by",     master_name: "accounting_periods",         is_required: true  },
  { user_verb: "owns",        inverse_verb: "is_owned_by",      master_name: "legal_entities",             is_required: true  },
  { user_verb: "approves",    inverse_verb: "is_approved_by",   master_name: "fixed_assets",               is_required: false },
  { user_verb: "reconciles",  inverse_verb: "is_reconciled_by", master_name: "intercompany_transactions",  is_required: true  },
];

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log("ERP-FIN B1 technical fixes (2026-05-31)\n");

  // --- B1-S2 ---
  console.log(`B1-S2: PATCH event_category on ${eventCategoryPatches.length} trigger_events`);
  const beforeEvents = await get(
    `/trigger_events?id=in.(${eventCategoryPatches.map(p => p.id).join(",")})&select=id,event_name,event_category`,
  );
  const stateBefore = new Map(beforeEvents.map(r => [Number(r.id), String(r.event_category ?? "")]));
  let patchedCount = 0;
  let skippedAlreadyOk = 0;
  for (const p of eventCategoryPatches) {
    const current = stateBefore.get(p.id);
    if (current === p.event_category) {
      skippedAlreadyOk++;
      continue;
    }
    if (current && current !== "") {
      console.log(`  WARN id=${p.id} (${p.event_name}) already has event_category='${current}' (expected empty). Overwriting with '${p.event_category}'.`);
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.event_category });
    patchedCount++;
  }
  console.log(`  patched=${patchedCount}, already-correct=${skippedAlreadyOk}`);

  // Verify
  const afterEvents = await get(
    `/trigger_events?id=in.(${eventCategoryPatches.map(p => p.id).join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  const stillEmpty = afterEvents.filter(r => !r.event_category || r.event_category === "");
  if (stillEmpty.length > 0) {
    console.log(`  FAIL: ${stillEmpty.length} rows still empty:`, stillEmpty.map(r => r.id));
  } else {
    console.log(`  verified: all 16 rows now carry a valid event_category enum value.`);
  }

  // --- B1-S5 user-edges ---
  console.log(`\nB1-S5 user-edges: INSERT data_object_relationships for ${userEdgeSpecs.length} candidate edges`);

  // Resolve master data_object ids
  const masterNames = Array.from(new Set(userEdgeSpecs.map(e => e.master_name)));
  const masterRows = await get(
    `/data_objects?data_object_name=in.(${masterNames.join(",")})&select=id,data_object_name`,
  );
  const masterIdByName = new Map(masterRows.map(r => [String(r.data_object_name), Number(r.id)]));
  for (const m of masterNames) {
    if (!masterIdByName.has(m)) throw new Error(`Could not resolve data_object '${m}' to an id`);
  }

  // Resolve users id (platform_builtin)
  const usersRows = await get(`/data_objects?data_object_name=eq.users&kind=eq.platform_builtin&select=id`);
  if (usersRows.length !== 1) {
    throw new Error(`Expected exactly 1 platform_builtin users row, got ${usersRows.length}`);
  }
  const usersId = Number(usersRows[0].id);
  console.log(`  resolved users data_object_id=${usersId}`);

  // Pull existing edges between any master and users in either direction
  const allIds = [usersId, ...masterNames.map(n => masterIdByName.get(n)!)];
  const existingEdges = await get(
    `/data_object_relationships?or=(and(data_object_id.in.(${allIds.join(",")}),related_data_object_id.in.(${allIds.join(",")})))&select=id,data_object_id,relationship_verb,related_data_object_id,inverse_verb`,
  );

  // Build a dedup key for (data_object_id, relationship_verb, related_data_object_id)
  const existingKey = new Set(
    existingEdges.map(r => `${r.data_object_id}|${String(r.relationship_verb).toLowerCase()}|${r.related_data_object_id}`),
  );

  const newEdges: Row[] = [];
  const skippedExisting: string[] = [];
  for (const e of userEdgeSpecs) {
    const masterId = masterIdByName.get(e.master_name)!;
    // Parent-voice: users <user_verb> master  =>  data_object_id=users, related=master
    const key = `${usersId}|${e.user_verb.toLowerCase()}|${masterId}`;
    if (existingKey.has(key)) {
      skippedExisting.push(`users ${e.user_verb} ${e.master_name}`);
      continue;
    }
    // Also skip if inverse already loaded on master->users direction with the inverse verb.
    const inverseKey = `${masterId}|${e.inverse_verb.toLowerCase()}|${usersId}`;
    if (existingKey.has(inverseKey)) {
      skippedExisting.push(`${e.master_name} ${e.inverse_verb} users (already exists in inverse direction)`);
      continue;
    }
    newEdges.push({
      data_object_id: usersId,
      related_data_object_id: masterId,
      relationship_verb: e.user_verb,
      inverse_verb: e.inverse_verb,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: e.is_required,
      owner_side: "target",
      // record_status omitted -> defaults to 'new' per Rule #1
      // notes omitted -> stays empty per Rule #15
    });
  }

  if (skippedExisting.length > 0) {
    console.log(`  skipping ${skippedExisting.length} already-present edges:`);
    for (const s of skippedExisting) console.log(`    - ${s}`);
  }

  if (newEdges.length > 0) {
    const inserted = await insert("/data_object_relationships", newEdges);
    console.log(`  inserted ${inserted.length} new user-edges`);
  } else {
    console.log(`  no new edges to insert`);
  }

  // Verify
  const afterEdges = await get(
    `/data_object_relationships?and=(data_object_id.eq.${usersId},related_data_object_id.in.(${masterNames.map(n => masterIdByName.get(n)!).join(",")}))&select=id,data_object_id,relationship_verb,related_data_object_id,inverse_verb&order=related_data_object_id.asc,relationship_verb.asc`,
  );
  console.log(`  users-to-ERP-FIN-masters edges total after load: ${afterEdges.length}`);
  for (const r of afterEdges) {
    const name = [...masterIdByName.entries()].find(([, v]) => v === Number(r.related_data_object_id))?.[0] ?? `id=${r.related_data_object_id}`;
    console.log(`    users ${r.relationship_verb} ${name}`);
  }

  // --- Summary ---
  console.log(`\nDone.`);
  console.log(`UI spot-check links:`);
  console.log(`  https://tests.semantius.app/domain_map/trigger_events`);
  console.log(`  https://tests.semantius.app/domain_map/data_object_relationships`);
}

await main();
