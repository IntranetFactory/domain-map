#!/usr/bin/env bun
// DXP B1 technical fixes (2026-05-31 continuation).
//
// In scope here (only items the audit pre-specifies a deterministic fix for):
//   1. B1-S7 - PATCH event_category on the 10 DXP trigger_events rows (ids 876-885).
//      Audit pre-specifies the exact target value per row.
//   2. B1-S4 - INSERT users-edge data_object_relationships rows (Rule #10) for the
//      8 user-actor edges the audit explicitly enumerates. Pattern matches the
//      audit text: relationship_type=many_to_many, relationship_kind=reference,
//      is_required=false, owner_side=target. data_object_id points at users
//      (id=748, kind=platform_builtin); related_data_object_id points at the
//      DXP master.
//
// Out of scope (deferred):
//   - B1-S1 (modules): user must answer B2-1 first.
//   - B1-S2, S5, S6, S8, S10 (depend on S1 or S2).
//   - B1-S3 (pattern flags): user must answer B2-2.
//   - B1-S9 (outbound cross-domain relationships): audit says "Surface to user".
//   - B1-S11 (APQC tagging): every proposed PCF row is flagged "needs PCF lookup
//     at fix time" / "possibly defer" - none are pre-resolved. Defer.
//
// Idempotent: each insert is keyed on the natural (data_object_id, related_data_object_id,
// relationship_verb) tuple; PATCHes are no-ops when already set.

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

// ============================================================
// B1-S7: trigger_events.event_category PATCH backfill (Rule #13)
// ============================================================

// Per audit: ids 876,877,879,880,881,882,883,878 -> state_change;
// ids 884,885 -> signal (visitor activity, not state change on master).
const eventCategoryPatches: { id: number; event_category: string }[] = [
  { id: 876, event_category: "state_change" }, // web_page.published
  { id: 877, event_category: "state_change" }, // web_page.unpublished
  { id: 878, event_category: "state_change" }, // content_component.updated
  { id: 879, event_category: "state_change" }, // digital_experience.activated
  { id: 880, event_category: "state_change" }, // personalization_rule.activated
  { id: 881, event_category: "state_change" }, // ab_test.started
  { id: 882, event_category: "state_change" }, // ab_test.completed
  { id: 883, event_category: "state_change" }, // segment_dxp.published
  { id: 884, event_category: "signal" },       // journey_step.entered
  { id: 885, event_category: "signal" },       // journey_step.abandoned
];

async function patchEventCategories(): Promise<void> {
  console.log("\n=== B1-S7: PATCH trigger_events.event_category (10 rows) ===");
  const before = await get(
    "/trigger_events?id=in.(876,877,878,879,880,881,882,883,884,885)" +
      "&select=id,event_name,event_category&order=id.asc",
  );
  let patched = 0;
  let skipped = 0;
  for (const p of eventCategoryPatches) {
    const cur = before.find(r => Number(r.id) === p.id);
    if (!cur) {
      console.warn(`  ! id ${p.id} not found - skipping`);
      continue;
    }
    if (cur.event_category === p.event_category) {
      skipped++;
      continue;
    }
    await call({
      method: "PATCH",
      path: `/trigger_events?id=eq.${p.id}`,
      body: { event_category: p.event_category },
    });
    console.log(`  PATCH id=${p.id} (${cur.event_name}): '' -> '${p.event_category}'`);
    patched++;
  }
  console.log(`  patched=${patched} skipped=${skipped}`);

  const after = await get(
    "/trigger_events?id=in.(876,877,878,879,880,881,882,883,884,885)" +
      "&select=id,event_name,event_category&order=id.asc",
  );
  const stillEmpty = after.filter(r => !r.event_category);
  if (stillEmpty.length > 0) {
    console.error(
      `  ! ${stillEmpty.length} rows still have empty event_category: ` +
        stillEmpty.map(r => r.id).join(","),
    );
  }
}

// ============================================================
// B1-S4: users edges into data_object_relationships (Rule #10)
// ============================================================

// data_objects:
//   users=748 (kind=platform_builtin); web_pages=441; content_components=442;
//   digital_experiences=443; personalization_rules=444; ab_tests=445;
//   segments_dxp=446; journey_steps=447.
//
// Audit B1-S4 pre-specifies these 8 edges (verbatim):
//   "users authors web_pages", "users approves web_pages", "users owns ab_tests",
//   "users authors personalization_rules", "users authors segments_dxp",
//   "users designs journey_steps", "users authors digital_experiences",
//   "users authors content_components".
//
// Shape per audit B1-S4: relationship_type='many_to_many',
// relationship_kind='reference', is_required=false, owner_side='target'.

const USERS_ID = 748;

type UserEdge = {
  related_data_object_id: number;
  related_label: string;
  relationship_verb: string;
  inverse_verb: string;
};

const userEdges: UserEdge[] = [
  { related_data_object_id: 441, related_label: "web_pages", relationship_verb: "authors web_pages", inverse_verb: "is_authored_by" },
  { related_data_object_id: 441, related_label: "web_pages", relationship_verb: "approves web_pages", inverse_verb: "is_approved_by" },
  { related_data_object_id: 445, related_label: "ab_tests", relationship_verb: "owns ab_tests", inverse_verb: "is_owned_by" },
  { related_data_object_id: 444, related_label: "personalization_rules", relationship_verb: "authors personalization_rules", inverse_verb: "is_authored_by" },
  { related_data_object_id: 446, related_label: "segments_dxp", relationship_verb: "authors segments_dxp", inverse_verb: "is_authored_by" },
  { related_data_object_id: 447, related_label: "journey_steps", relationship_verb: "designs journey_steps", inverse_verb: "is_designed_by" },
  { related_data_object_id: 443, related_label: "digital_experiences", relationship_verb: "authors digital_experiences", inverse_verb: "is_authored_by" },
  { related_data_object_id: 442, related_label: "content_components", relationship_verb: "authors content_components", inverse_verb: "is_authored_by" },
];

async function insertUserEdges(): Promise<void> {
  console.log("\n=== B1-S4: INSERT data_object_relationships users edges (Rule #10) ===");
  // Pre-flight: confirm users + every DXP master exists.
  const dobjs = await get(
    "/data_objects?id=in.(441,442,443,444,445,446,447,748)&select=id,data_object_name,kind",
  );
  const usersRow = dobjs.find(r => Number(r.id) === USERS_ID);
  if (!usersRow || usersRow.kind !== "platform_builtin") {
    throw new Error(
      `users row id=748 missing or not platform_builtin (got: ${JSON.stringify(usersRow)})`,
    );
  }
  for (const edge of userEdges) {
    const m = dobjs.find(r => Number(r.id) === edge.related_data_object_id);
    if (!m) throw new Error(`master id=${edge.related_data_object_id} (${edge.related_label}) not found`);
  }

  // Idempotency: read existing user-source edges to any DXP master and key on
  // (data_object_id, related_data_object_id, relationship_verb).
  const existing = await get(
    "/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.in.(441,442,443,444,445,446,447))" +
      "&select=id,data_object_id,related_data_object_id,relationship_verb",
  );
  const key = (e: { data_object_id: number; related_data_object_id: number; relationship_verb: string }) =>
    `${e.data_object_id}|${e.related_data_object_id}|${e.relationship_verb}`;
  const have = new Set(
    existing.map(r =>
      key({
        data_object_id: Number(r.data_object_id),
        related_data_object_id: Number(r.related_data_object_id),
        relationship_verb: String(r.relationship_verb),
      }),
    ),
  );

  const toInsert = userEdges
    .map(e => ({
      data_object_id: USERS_ID,
      related_data_object_id: e.related_data_object_id,
      relationship_verb: e.relationship_verb,
      inverse_verb: e.inverse_verb,
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "target",
      // record_status omitted -> defaults to "new" (Rule #1).
      // notes omitted -> defaults to "" (Rule #15).
    }))
    .filter(
      r =>
        !have.has(
          key({
            data_object_id: r.data_object_id,
            related_data_object_id: r.related_data_object_id,
            relationship_verb: r.relationship_verb,
          }),
        ),
    );

  if (toInsert.length === 0) {
    console.log(`  all ${userEdges.length} edges already present, nothing to insert`);
    return;
  }
  console.log(
    `  inserting ${toInsert.length}/${userEdges.length} edges ` +
      `(${userEdges.length - toInsert.length} already present)`,
  );
  for (const r of toInsert) {
    console.log(`    + users -> ${r.related_data_object_id} (${r.relationship_verb})`);
  }
  const inserted = await call({
    method: "POST",
    path: "/data_object_relationships",
    body: toInsert,
  });
  console.log(`  inserted ${inserted.length} rows`);

  // Post-load verify.
  const after = await get(
    "/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.in.(441,442,443,444,445,446,447))" +
      "&select=id,data_object_id,related_data_object_id,relationship_verb,relationship_type,relationship_kind,owner_side,is_required,record_status" +
      "&order=id.asc",
  );
  console.log(`  post-load: ${after.length} user edges to DXP masters`);
  for (const r of after) {
    console.log(
      `    id=${r.id} 748 -> ${r.related_data_object_id} verb='${r.relationship_verb}' ` +
        `type=${r.relationship_type} kind=${r.relationship_kind} owner=${r.owner_side} ` +
        `required=${r.is_required} status=${r.record_status}`,
    );
  }
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log("DXP B1 technical fixes (2026-05-31 continuation)");
  console.log("================================================");

  await patchEventCategories();
  await insertUserEdges();

  console.log("\n=== Done ===");
  console.log("  Spot-check UI:");
  console.log("    https://tests.semantius.app/domain_map/trigger_events");
  console.log("    https://tests.semantius.app/domain_map/data_object_relationships");
}

await main();
