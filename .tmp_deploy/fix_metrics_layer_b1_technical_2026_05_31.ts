#!/usr/bin/env bun
// METRICS-LAYER b1 audit, technical fixes only (2026-05-31 continuation).
//
// Scope per task spec (TECHNICAL only; judgment items deferred):
//   - B1-S7: PATCH enum backfills on 6 trigger_events (audit pre-specifies values).
//   - B1-S4: INSERT 8 user-edge data_object_relationships rows per Rule #10 shape.
//
// Deferred (not run; reasons in final report):
//   - B1-S1  (new modules — "new entities/DMDOs/modules" rule).
//   - B1-S2  (lifecycle states — new entities; gated on B1-S1/B2-1).
//   - B1-S3  (pattern flag flips — explicit defer rule).
//   - B1-S5  (intra-domain data_object_relationships — TECHNICAL clause only
//             licenses *user-edge* relationship inserts; intra-domain edges not
//             covered).
//   - B1-S6  (aliases — bulk inserts not pre-specified as exact tuples; ranges given).
//   - B1-S8  (cross-domain rels — audit defers ("surface to user"); target masters
//             may not exist; not in TECHNICAL clause).
//   - B1-S9  (B10b handoff module FK backfill — no METRICS-LAYER modules exist,
//             so source_domain_module_id cannot be derived; gated on B1-S1).
//   - B1-S10 (skills + tools — new entities; gated on B1-S1).
//   - B1-S11 (A4 catalog_tagline / catalog_description — Rule #20 defer).
//   - B1-H1  (APQC tagging — audit "defer to Discover Pass 3" for most; handoff
//             220 record_status flip blocked by Rule #1).
//   - Bucket 2 / Bucket 3 (all judgment / Phase 0).

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

// -----------------------------------------------------------------------------
// B1-S7: trigger_events enum backfill (6 rows). Audit pre-specifies values.
// Allowed values: lifecycle / state_change / threshold / signal.
// Mapping from audit B1-S7:
//   714 dimensional_model.published       -> state_change
//   715 dimensional_model.deprecated      -> state_change
//   716 metric_materialization.refreshed  -> state_change
//   717 metric_materialization.refresh_failed -> signal
//   718 query_lineage.captured            -> signal
//   719 metric_access_policy.changed      -> state_change
// (193 metric.certified and 194 metric.deprecated already carry 'lifecycle'; skip.)
// -----------------------------------------------------------------------------
const enumBackfill: Array<{ id: number; event_category: string }> = [
  { id: 714, event_category: "state_change" },
  { id: 715, event_category: "state_change" },
  { id: 716, event_category: "state_change" },
  { id: 717, event_category: "signal" },
  { id: 718, event_category: "signal" },
  { id: 719, event_category: "state_change" },
];

async function applyB1S7(): Promise<number> {
  const current = await get(
    `/trigger_events?id=in.(${enumBackfill.map((r) => r.id).join(",")})&select=id,event_category`,
  );
  const currentMap = new Map(
    current.map((r) => [Number(r.id), String(r.event_category ?? "")]),
  );
  let n = 0;
  for (const row of enumBackfill) {
    const have = currentMap.get(row.id);
    if (have === row.event_category) {
      console.log(
        `  [B1-S7] event ${row.id}: already '${row.event_category}', skip`,
      );
      continue;
    }
    if (have && have !== "") {
      console.log(
        `  [B1-S7] event ${row.id}: already has '${have}' (not empty), skipping to avoid clobber`,
      );
      continue;
    }
    await patch(`/trigger_events?id=eq.${row.id}`, {
      event_category: row.event_category,
    });
    console.log(
      `  [B1-S7] event ${row.id}: patched event_category='${row.event_category}'`,
    );
    n++;
  }
  return n;
}

// -----------------------------------------------------------------------------
// B1-S4: INSERT 8 user-edge data_object_relationships rows per Rule #10.
// Audit (B1-S4) pre-specifies these edges and the Rule #10 shape:
//   relationship_type='many_to_many', relationship_kind='reference',
//   is_required=false, owner_side='target'.
//
// Edges (source=users id 748, related=METRICS-LAYER master):
//   1. users authors    metric_definitions      (252)
//   2. users certifies  metric_definitions      (252)
//   3. users authors    dimensional_models      (253)
//   4. users owns       metric_materializations (709)
//   5. users authors    metric_materializations (709)  -- refresh-schedule author
//   6. users authors    metric_access_policies  (711)
//   7. users approves   metric_access_policies  (711)
//   8. users initiated  query_lineage_records   (710)  -- subject of the query
// -----------------------------------------------------------------------------
const userEdges: Array<{
  related: number;
  related_name: string;
  verb: string;
  inverse: string;
  label: string;
}> = [
  {
    related: 252,
    related_name: "metric_definitions",
    verb: "authors",
    inverse: "is authored by",
    label: "users authors metric_definitions",
  },
  {
    related: 252,
    related_name: "metric_definitions",
    verb: "certifies",
    inverse: "is certified by",
    label: "users certifies metric_definitions",
  },
  {
    related: 253,
    related_name: "dimensional_models",
    verb: "authors",
    inverse: "is authored by",
    label: "users authors dimensional_models",
  },
  {
    related: 709,
    related_name: "metric_materializations",
    verb: "owns",
    inverse: "is owned by",
    label: "users owns metric_materializations",
  },
  {
    related: 709,
    related_name: "metric_materializations",
    verb: "authors",
    inverse: "is authored by",
    label: "users authors metric_materializations",
  },
  {
    related: 711,
    related_name: "metric_access_policies",
    verb: "authors",
    inverse: "is authored by",
    label: "users authors metric_access_policies",
  },
  {
    related: 711,
    related_name: "metric_access_policies",
    verb: "approves",
    inverse: "is approved by",
    label: "users approves metric_access_policies",
  },
  {
    related: 710,
    related_name: "query_lineage_records",
    verb: "initiated",
    inverse: "was initiated by",
    label: "users initiated query_lineage_records",
  },
];

async function applyB1S4(): Promise<number> {
  let n = 0;
  for (const e of userEdges) {
    const existing = await get(
      `/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.eq.${e.related},relationship_verb.eq.${encodeURIComponent(e.verb)})&select=id`,
    );
    if (existing.length > 0) {
      console.log(
        `  [B1-S4] edge users -> ${e.related_name} (${e.verb}) exists (id ${existing[0].id}), skip`,
      );
      continue;
    }
    const inserted = await post("/data_object_relationships", [
      {
        data_object_relationship_label: e.label,
        data_object_id: 748,
        related_data_object_id: e.related,
        owner_side: "target",
        relationship_type: "many_to_many",
        relationship_kind: "reference",
        relationship_verb: e.verb,
        inverse_verb: e.inverse,
        is_required: false,
      },
    ]);
    console.log(
      `  [B1-S4] inserted edge users -> ${e.related_name} (${e.verb}) id ${inserted[0]?.id}`,
    );
    n++;
  }
  return n;
}

// -----------------------------------------------------------------------------
// Driver.
// -----------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("METRICS-LAYER b1 technical fixes (2026-05-31)");
  console.log("=============================================");

  console.log("B1-S7: trigger_events enum backfill");
  const n7 = await applyB1S7();
  console.log(`  -> ${n7} PATCHes applied`);

  console.log("B1-S4: insert user-edge relationships");
  const n4 = await applyB1S4();
  console.log(`  -> ${n4} user-edge rows inserted`);

  console.log("=============================================");
  console.log(`TOTALS  S7=${n7}  S4=${n4}`);
}

await main();
