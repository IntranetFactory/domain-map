#!/usr/bin/env bun
// WEB-CONTOPS B1 technical fixes (2026-05-31 continuation).
//
// In scope here (only items the audit pre-specifies a deterministic fix for):
//   1. B1-S7 - PATCH event_category on the 7 WEB-CONTOPS trigger_events rows
//      (ids 902-908). Audit pre-specifies exact target value per row.
//   2. B1-S4 - INSERT users-edge data_object_relationships rows (Rule #10) for
//      the 11 user-actor edges the audit explicitly enumerates. Shape per
//      audit: relationship_type='many_to_many', relationship_kind='reference',
//      is_required=false, owner_side='target'. data_object_id points at users
//      (id=748, kind=platform_builtin); related_data_object_id points at the
//      WEB-CONTOPS master.
//
// Out of scope (deferred):
//   - B1-S1 (modules): user must answer B2-1 first.
//   - B1-S2 (lifecycle states): depends on S1 (needs domain_module_id).
//   - B1-S3 (pattern flags): user must answer B2-2.
//   - B1-S5 (intra-domain rels): depends on S1+S2.
//   - B1-S6 (aliases): depends on S1; audit gives candidate terminology but
//     not exact pre-specified tuples to insert.
//   - B1-S8 (missing workflow events): depends on S2.
//   - B1-S9 (outbound cross-domain rels): not a user-edge per Rule #10;
//     entity-to-entity cross-domain INSERTs deferred per task rules.
//   - B1-S10 (module-anchored system skills): depends on S1.
//   - B1-S11 (APQC tagging): every proposed PCF row is flagged "needs PCF
//     lookup at fix time" / "possibly defer" / "confident L3 (after lookup)";
//     none are pre-resolved with a concrete handoff_processes.process_id.
//     Defer.
//
// Idempotent: each insert is keyed on the natural (data_object_id,
// related_data_object_id, relationship_verb) tuple; PATCHes are no-ops when
// already set.

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
//
// Per audit B1-S7 (verbatim mappings):
//   902 content_audit.completed       -> lifecycle    (run boundary)
//   903 accessibility_finding.detected -> signal      (new finding from scanner)
//   904 broken_link.detected           -> signal
//   905 seo_finding.created            -> signal
//   906 brand_violation.detected       -> signal
//   907 content_lifecycle.review_due   -> threshold   (date-based)
//   908 content_inventory.refreshed    -> lifecycle   (crawl-batch boundary)

const eventCategoryPatches: { id: number; event_category: string }[] = [
  { id: 902, event_category: "lifecycle" },
  { id: 903, event_category: "signal" },
  { id: 904, event_category: "signal" },
  { id: 905, event_category: "signal" },
  { id: 906, event_category: "signal" },
  { id: 907, event_category: "threshold" },
  { id: 908, event_category: "lifecycle" },
];

async function patchEventCategories(): Promise<void> {
  console.log("\n=== B1-S7: PATCH trigger_events.event_category (7 rows) ===");
  const before = await get(
    "/trigger_events?id=in.(902,903,904,905,906,907,908)" +
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
    console.log(`  PATCH id=${p.id} (${cur.event_name}): '${cur.event_category}' -> '${p.event_category}'`);
    patched++;
  }
  console.log(`  patched=${patched} skipped=${skipped}`);

  const after = await get(
    "/trigger_events?id=in.(902,903,904,905,906,907,908)" +
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
//
// data_objects:
//   users=748 (kind=platform_builtin);
//   content_audits=684; web_content_inventory_records=685;
//   accessibility_scan_findings=686; broken_link_findings=687;
//   technical_seo_findings=688; brand_voice_violations=689;
//   content_lifecycle_plans=690.
//
// Audit B1-S4 pre-specifies these 11 edges (verbatim):
//   "users owns content_audits"
//   "users reviews content_audits"
//   "users owns web_content_inventory_records"
//   "users assignees accessibility_scan_findings"
//   "users approves accessibility_scan_findings"
//   "users assignees broken_link_findings"
//   "users assignees technical_seo_findings"
//   "users approves technical_seo_findings"
//   "users assignees brand_voice_violations"
//   "users reviews brand_voice_violations"
//   "users owns content_lifecycle_plans"
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

// Verbs are taken verbatim from the audit text ("users <verb> <entity>").
// Inverse verbs follow the standard passive-voice pattern already used on
// existing rows in this catalog.
const userEdges: UserEdge[] = [
  { related_data_object_id: 684, related_label: "content_audits", relationship_verb: "owns content_audits", inverse_verb: "is_owned_by" },
  { related_data_object_id: 684, related_label: "content_audits", relationship_verb: "reviews content_audits", inverse_verb: "is_reviewed_by" },
  { related_data_object_id: 685, related_label: "web_content_inventory_records", relationship_verb: "owns web_content_inventory_records", inverse_verb: "is_owned_by" },
  { related_data_object_id: 686, related_label: "accessibility_scan_findings", relationship_verb: "assignees accessibility_scan_findings", inverse_verb: "is_assigned_to" },
  { related_data_object_id: 686, related_label: "accessibility_scan_findings", relationship_verb: "approves accessibility_scan_findings", inverse_verb: "is_approved_by" },
  { related_data_object_id: 687, related_label: "broken_link_findings", relationship_verb: "assignees broken_link_findings", inverse_verb: "is_assigned_to" },
  { related_data_object_id: 688, related_label: "technical_seo_findings", relationship_verb: "assignees technical_seo_findings", inverse_verb: "is_assigned_to" },
  { related_data_object_id: 688, related_label: "technical_seo_findings", relationship_verb: "approves technical_seo_findings", inverse_verb: "is_approved_by" },
  { related_data_object_id: 689, related_label: "brand_voice_violations", relationship_verb: "assignees brand_voice_violations", inverse_verb: "is_assigned_to" },
  { related_data_object_id: 689, related_label: "brand_voice_violations", relationship_verb: "reviews brand_voice_violations", inverse_verb: "is_reviewed_by" },
  { related_data_object_id: 690, related_label: "content_lifecycle_plans", relationship_verb: "owns content_lifecycle_plans", inverse_verb: "is_owned_by" },
];

async function insertUserEdges(): Promise<void> {
  console.log("\n=== B1-S4: INSERT data_object_relationships users edges (Rule #10) ===");
  // Pre-flight: confirm users + every WEB-CONTOPS master exists.
  const dobjs = await get(
    "/data_objects?id=in.(684,685,686,687,688,689,690,748)&select=id,data_object_name,kind",
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

  // Idempotency: read existing user-source edges to any WEB-CONTOPS master
  // and key on (data_object_id, related_data_object_id, relationship_verb).
  const existing = await get(
    "/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.in.(684,685,686,687,688,689,690))" +
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
    "/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.in.(684,685,686,687,688,689,690))" +
      "&select=id,data_object_id,related_data_object_id,relationship_verb,relationship_type,relationship_kind,owner_side,is_required,record_status" +
      "&order=id.asc",
  );
  console.log(`  post-load: ${after.length} user edges to WEB-CONTOPS masters`);
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
  console.log("WEB-CONTOPS B1 technical fixes (2026-05-31 continuation)");
  console.log("========================================================");

  await patchEventCategories();
  await insertUserEdges();

  console.log("\n=== Done ===");
  console.log("  Spot-check UI:");
  console.log("    https://tests.semantius.app/domain_map/trigger_events");
  console.log("    https://tests.semantius.app/domain_map/data_object_relationships");
}

await main();
