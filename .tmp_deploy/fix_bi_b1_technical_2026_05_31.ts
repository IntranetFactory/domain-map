#!/usr/bin/env bun
// BI b1 audit, technical fixes only (2026-05-31 continuation).
//
// Scope per task spec:
//   - B1-S2: PATCH enum backfills on 8 trigger_events (audit pre-specifies values).
//   - B1-S3: INSERT 1 handoff bi_dashboard.published (708) -> DCG (88).
//   - B1-S5: INSERT 5 user-edge data_object_relationships rows (Rule #10).
//   - B1-S10: INSERT handoff_processes rows for the 8 audit-pre-specified PCF tags
//             plus REPLACE the discovery_substring row on handoff 218 with the
//             agent_curated tag (per Discover Pass 1.5 procedure noted in audit).
//
// Deferred (not run): B1-S1, B1-S4 (intra-domain B6), B1-S6, B1-S7, B1-S8, B1-S9,
// B1-N1, B1-N2, B1-N3, all of Bucket 2 / Bucket 3.

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

async function post(path: string, body: Row | Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function del(path: string): Promise<Row[]> {
  return call({ method: "DELETE", path });
}

// -----------------------------------------------------------------------------
// B1-S2: trigger_events enum backfill (8 rows). PATCH per id with audit-specified
// event_category. Allowed values: lifecycle / state_change / threshold / signal.
// -----------------------------------------------------------------------------
const enumBackfill: Array<{ id: number; event_category: string }> = [
  { id: 706, event_category: "lifecycle" },     // bi_report.published
  { id: 707, event_category: "state_change" },  // bi_report.failed
  { id: 708, event_category: "lifecycle" },     // bi_dashboard.published
  { id: 709, event_category: "state_change" },  // bi_dashboard.shared_externally
  { id: 710, event_category: "threshold" },     // bi_query.long_running
  { id: 711, event_category: "threshold" },     // bi_query.cost_threshold_breached
  { id: 712, event_category: "state_change" },  // bi_subscription.delivery_failed
  { id: 713, event_category: "lifecycle" },     // bi_subscription.activated
];

async function applyB1S2(): Promise<number> {
  // Verify all 8 rows currently have empty event_category; skip the ones already set.
  const current = await get(
    `/trigger_events?id=in.(${enumBackfill.map(r => r.id).join(",")})&select=id,event_category`,
  );
  const currentMap = new Map(current.map(r => [Number(r.id), String(r.event_category ?? "")]));
  let n = 0;
  for (const row of enumBackfill) {
    const have = currentMap.get(row.id);
    if (have === row.event_category) {
      console.log(`  [B1-S2] event ${row.id}: already ${row.event_category}, skip`);
      continue;
    }
    if (have && have !== "") {
      console.log(`  [B1-S2] event ${row.id}: already has '${have}' (not empty), skipping to avoid clobber`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${row.id}`, { event_category: row.event_category });
    console.log(`  [B1-S2] event ${row.id}: patched event_category='${row.event_category}'`);
    n++;
  }
  return n;
}

// -----------------------------------------------------------------------------
// B1-S3: INSERT handoff bi_dashboard.published (708) -> DCG (88).
// Audit specifies integration_pattern='api_call', friction_level='low',
// payload data_object_id = bi_dashboards (692).
// Source domain = BI (74), target domain = DCG (88).
// source_domain_module_id remains NULL (blocked on B1-S1 per audit's B10b track).
// -----------------------------------------------------------------------------
async function applyB1S3(): Promise<number> {
  const existing = await get(
    `/handoffs?and=(source_domain_id.eq.74,target_domain_id.eq.88,trigger_event_id.eq.708,data_object_id.eq.692)&select=id`,
  );
  if (existing.length > 0) {
    console.log(`  [B1-S3] handoff already exists (id ${existing[0].id}), skip`);
    return 0;
  }
  const inserted = await post("/handoffs", [
    {
      source_domain_id: 74,
      target_domain_id: 88,
      trigger_event_id: 708,
      data_object_id: 692,
      integration_pattern: "api_call",
      friction_level: "low",
      description: "BI publishes a dashboard; DCG ingests the new content for catalog discovery and governance metadata.",
    },
  ]);
  console.log(`  [B1-S3] inserted handoff bi_dashboard.published -> DCG (id ${inserted[0]?.id})`);
  return 1;
}

// -----------------------------------------------------------------------------
// B1-S5: INSERT 5 user-edge data_object_relationships rows per Rule #10.
// Source = users (748), targets = the 5 BI masters.
// Verbs and inverse verbs use the audit's proposed forms; cardinality one_to_many
// on the user side; is_required per audit (subscription owner, report author, metric
// steward required; dashboard / query authors set required as well since the masters
// have an authoring actor by definition).
// kind = reference (loose link, not composition); owner_side = target (the
// authored / owned BI artifact carries its own lifecycle; user keeps existing).
// -----------------------------------------------------------------------------
const userEdges: Array<{
  related: number;
  verb: string;
  inverse: string;
  is_required: boolean;
  label: string;
}> = [
  { related: 693, verb: "authors",   inverse: "is authored by", is_required: true, label: "users authors bi_queries" },
  { related: 691, verb: "authors",   inverse: "is authored by", is_required: true, label: "users authors bi_reports" },
  { related: 692, verb: "authors",   inverse: "is authored by", is_required: true, label: "users authors bi_dashboards" },
  { related: 694, verb: "owns",      inverse: "is owned by",    is_required: true, label: "users owns bi_subscriptions" },
  { related: 230, verb: "stewards",  inverse: "is stewarded by", is_required: true, label: "users stewards semantic_metrics" },
];

async function applyB1S5(): Promise<number> {
  // Idempotency check on (data_object_id=748, related_data_object_id=related, relationship_verb=verb).
  let n = 0;
  for (const e of userEdges) {
    const existing = await get(
      `/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.eq.${e.related},relationship_verb.eq.${encodeURIComponent(e.verb)})&select=id`,
    );
    if (existing.length > 0) {
      console.log(`  [B1-S5] edge users -> ${e.related} (${e.verb}) exists (id ${existing[0].id}), skip`);
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
        is_required: e.is_required,
      },
    ]);
    console.log(`  [B1-S5] inserted edge users -> ${e.related} (${e.verb}) id ${inserted[0]?.id}`);
    n++;
  }
  return n;
}

// -----------------------------------------------------------------------------
// B1-S10: APQC handoff_processes tags (8 high-confidence) + REPLACE of the
// existing discovery_substring row on handoff 218 (id 124, process 505) with
// the audit-specified agent_curated row pointing at process 277 ("Manage
// business information", external_id 20779, L3).
//
// Process id resolution from /processes by external_id:
//   20765 -> id 50    (Manage information, L2)
//   20779 -> id 277   (Manage business information, L3)
//   20770 -> id 275   (Define and maintain business information architecture, L3)
//   20903 -> id 1299  (Triage IT service delivery incidents, L4)
//
// Pre-specified tags from audit table (8 high-confidence):
//   687 -> 20765 (id 50)    proposal_source='agent_curated'
//   688 -> 20779 (id 277)
//   689 -> 20903 (id 1299)
//   151 -> 20770 (id 275)
//   218 -> 20779 (id 277)   REPLACE existing id 124 row
//   692 -> 20770 (id 275)
//   696 -> 20903 (id 1299)
//   711 -> 20779 (id 277)
// -----------------------------------------------------------------------------
type APQCRow = { handoff_id: number; process_id: number; note: string };
const apqcRows: APQCRow[] = [
  { handoff_id: 687, process_id: 50,   note: "BI -> SUB-MGMT delivery_failed" },
  { handoff_id: 688, process_id: 277,  note: "BI -> DCG report.published" },
  { handoff_id: 689, process_id: 1299, note: "BI -> ITSM report.failed" },
  { handoff_id: 151, process_id: 275,  note: "DATA-AI-PLAT -> BI metric.published" },
  { handoff_id: 218, process_id: 277,  note: "METRICS-LAYER -> BI metric.certified (replaces discovery_substring 124)" },
  { handoff_id: 692, process_id: 275,  note: "METRICS-LAYER -> BI dimensional_model.published" },
  { handoff_id: 696, process_id: 1299, note: "METRICS-LAYER -> BI metric_materialization.refresh_failed" },
  { handoff_id: 711, process_id: 277,  note: "DCG -> BI data_certification.revoked" },
];

async function applyB1S10(): Promise<number> {
  // First, handle the replacement on handoff 218: delete the discovery_substring
  // row 124 (handoff 218, process 505) so the new agent_curated row can be inserted
  // without duplicating the pair. The unique constraint is on key='<handoff_id>.<process_id>',
  // and since the new row points at a different process (277 vs 505) it would NOT
  // collide; but the audit's Discover Pass 1.5 procedure is to REPLACE, so the
  // weaker discovery_substring row is removed.
  const stale = await get(`/handoff_processes?and=(handoff_id.eq.218,process_id.eq.505)&select=id,proposal_source`);
  let deleted = 0;
  if (stale.length === 1 && stale[0].proposal_source === "discovery_substring") {
    await del(`/handoff_processes?id=eq.${stale[0].id}`);
    console.log(`  [B1-S10] deleted stale discovery_substring row id ${stale[0].id} (handoff 218 -> process 505)`);
    deleted++;
  } else if (stale.length === 0) {
    console.log(`  [B1-S10] no stale discovery_substring row on handoff 218 (already cleaned)`);
  } else {
    console.log(`  [B1-S10] stale row on handoff 218 unexpected state: ${JSON.stringify(stale)}, skipping delete`);
  }

  // Now insert the 8 agent_curated rows, skipping any pair that already exists
  // on the unique key=<handoff_id>.<process_id>.
  let inserted = 0;
  for (const r of apqcRows) {
    const key = `${r.handoff_id}.${r.process_id}`;
    const existing = await get(`/handoff_processes?key=eq.${encodeURIComponent(key)}&select=id,proposal_source`);
    if (existing.length > 0) {
      console.log(`  [B1-S10] tag handoff ${r.handoff_id} -> process ${r.process_id} exists (id ${existing[0].id}, ${existing[0].proposal_source}), skip`);
      continue;
    }
    const out = await post("/handoff_processes", [
      {
        handoff_id: r.handoff_id,
        process_id: r.process_id,
        role: "implements",
        proposal_source: "agent_curated",
      },
    ]);
    console.log(`  [B1-S10] inserted tag handoff ${r.handoff_id} -> process ${r.process_id} (id ${out[0]?.id}, ${r.note})`);
    inserted++;
  }
  return deleted + inserted;
}

// -----------------------------------------------------------------------------
// Driver.
// -----------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("BI b1 technical fixes (2026-05-31)");
  console.log("===================================");

  console.log("B1-S2: trigger_events enum backfill");
  const n2 = await applyB1S2();
  console.log(`  -> ${n2} PATCHes applied`);

  console.log("B1-S3: insert bi_dashboard.published -> DCG handoff");
  const n3 = await applyB1S3();
  console.log(`  -> ${n3} handoff inserted`);

  console.log("B1-S5: insert user-edge relationships");
  const n5 = await applyB1S5();
  console.log(`  -> ${n5} user-edge rows inserted`);

  console.log("B1-S10: APQC handoff_processes tags + discovery_substring replacement");
  const n10 = await applyB1S10();
  console.log(`  -> ${n10} handoff_processes ops applied (delete + inserts)`);

  console.log("===================================");
  console.log(`TOTALS  S2=${n2}  S3=${n3}  S5=${n5}  S10=${n10}`);
}

await main();
