#!/usr/bin/env bun
// FMIS B1 technical fixes (2026-05-31).
//
// Applies the agent-fixable, fully-specified B1 items from audits/FMIS.md:
//   - B1-S6 (B9 enum backfill):     PATCH event_category on 6 trigger_events
//   - B1-S8 (B7 user-edges Rule#10): INSERT 9 data_object_relationships
//                                    (users -> each FMIS master)
//   - B1-S11 (H1 APQC tags):        INSERT 8 handoff_processes rows
//                                    (8 high/medium-confidence; 2 deferred)
//
// Deferred (require user judgment, missing modules, or new entities):
//   B1-S1, B1-S2, B1-S3 (module split + capabilities + system-skill retire)
//   B1-S4 (aliases, audit lists multiple alternatives per master, not exact tuples)
//   B1-S5 (lifecycle states, needs domain_module_id from B1-S1)
//   B1-S7 (intra-domain relationships, Rule #10 only licenses user-edges in this run)
//   B1-S9 (cross-domain relationships, target-side masters unverified)
//   B1-S10 (B10b source-side backfill, gated on B1-S1)
//
// Idempotent: pre-flights every write.

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

async function insertMany(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

// ============================================================
// B1-S6 (B9): PATCH event_category on 6 trigger_events
// ============================================================
// Audit decisions (FMIS.md, line ~53):
//   1111 farm_field.boundary_updated         -> state_change
//   1112 crop_plan.committed                 -> state_change
//   1113 planting_record.completed           -> state_change
//   1114 ag_input_inventory.low              -> threshold
//   1115 variable_rate_prescription.published -> state_change
//   1116 machinery_telemetry_record.captured -> signal
const eventCategoryPatches: { id: number; event_category: string }[] = [
  { id: 1111, event_category: "state_change" },
  { id: 1112, event_category: "state_change" },
  { id: 1113, event_category: "state_change" },
  { id: 1114, event_category: "threshold" },
  { id: 1115, event_category: "state_change" },
  { id: 1116, event_category: "signal" },
];

async function applyB1S6() {
  console.log("\n[B1-S6] Backfilling trigger_events.event_category (6 rows)");
  const ids = eventCategoryPatches.map(p => p.id).join(",");
  const existing = await get(`/trigger_events?id=in.(${ids})&select=id,event_category`);
  const existingMap = new Map<number, string>(
    existing.map(r => [Number(r.id), String(r.event_category)]),
  );
  let patched = 0;
  let skipped = 0;
  for (const p of eventCategoryPatches) {
    const current = existingMap.get(p.id);
    if (current === undefined) {
      console.log(`  trigger_event ${p.id} not found, skipping`);
      continue;
    }
    if (current === p.event_category) {
      skipped++;
      continue;
    }
    if (current !== "") {
      console.log(
        `  trigger_event ${p.id} already has event_category='${current}', proposed '${p.event_category}'. Skipping (non-empty).`,
      );
      skipped++;
      continue;
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.event_category });
    patched++;
  }
  console.log(`  patched=${patched}, skipped=${skipped}`);
}

// ============================================================
// B1-S8 (B7 / Rule #10): user-edges (users -> FMIS masters)
// ============================================================
// Convention (verified via existing rows): data_object_id=748 (users),
// related_data_object_id=<target>, owner_side='source',
// relationship_type='one_to_many', relationship_kind='reference',
// is_required=false. Notes left empty per Rule #15.
const USERS_ID = 748;
const masterIds: Record<string, number> = {
  farm_fields: 486,
  crop_plans: 487,
  planting_records: 488,
  field_applications: 489,
  harvest_records: 490,
  ag_input_inventory: 491,
  variable_rate_prescriptions: 492,
  machinery_telemetry_records: 493,
};

// 9 edges per audit B1-S8.
const userEdges: { master: string; verb: string; inverse: string }[] = [
  { master: "farm_fields",                  verb: "owned farm fields",        inverse: "is_owned_by" },
  { master: "crop_plans",                   verb: "authored crop plans",      inverse: "is_authored_by" },
  { master: "planting_records",             verb: "recorded planting passes", inverse: "is_recorded_by" },
  { master: "field_applications",           verb: "applied field applications", inverse: "is_applied_by" },
  { master: "field_applications",           verb: "supervised applications",  inverse: "is_supervised_by" },
  { master: "harvest_records",              verb: "recorded harvest passes",  inverse: "is_recorded_by" },
  { master: "ag_input_inventory",           verb: "managed input inventory",  inverse: "is_managed_by" },
  { master: "variable_rate_prescriptions",  verb: "authored prescriptions",   inverse: "is_authored_by" },
  { master: "machinery_telemetry_records",  verb: "operated telemetry runs",  inverse: "is_operated_by" },
];

async function applyB1S8() {
  console.log("\n[B1-S8] Loading user-edges for FMIS masters (9 rows expected)");
  const existing = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_ID}&related_data_object_id=in.(${Object.values(masterIds).join(",")})&select=id,related_data_object_id,relationship_verb`,
  );
  // Match on (related_data_object_id, relationship_verb) to allow two distinct verbs
  // against the same master (e.g. field_applications: applied + supervised).
  const existingKeys = new Set(
    existing.map(r => `${r.related_data_object_id}|${r.relationship_verb}`),
  );
  const toInsert: Row[] = [];
  for (const e of userEdges) {
    const relatedId = masterIds[e.master];
    const key = `${relatedId}|${e.verb}`;
    if (existingKeys.has(key)) {
      console.log(`  edge users -> ${e.master} (verb '${e.verb}') already present, skipping`);
      continue;
    }
    toInsert.push({
      data_object_id: USERS_ID,
      related_data_object_id: relatedId,
      owner_side: "source",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      relationship_verb: e.verb,
      inverse_verb: e.inverse,
      is_required: false,
    });
  }
  if (toInsert.length === 0) {
    console.log("  nothing to insert");
    return;
  }
  console.log(`  inserting ${toInsert.length} user-edge rows`);
  await insertMany("/data_object_relationships", toInsert);
}

// ============================================================
// B1-S11 (H1): APQC handoff_processes tags
// ============================================================
// 8 high/medium-confidence tags per audit table. Handoffs 966 and 968
// are deferred to Discover Pass 3 custom-process authoring (low L3).
// PCF process ids (live DB ids, looked up via external_id):
//   external_id 10370 -> processes.id 171  (Maintain production records ...)
//   external_id 10223 -> processes.id 157  (Create materials plan)
//   external_id 10279 -> processes.id 166  (Order materials and services)
const PCF_10370 = 171;
const PCF_10223 = 157;
const PCF_10279 = 166;

const apqcTags: { handoff_id: number; process_id: number }[] = [
  { handoff_id: 350, process_id: PCF_10370 },
  { handoff_id: 349, process_id: PCF_10370 },
  { handoff_id: 965, process_id: PCF_10370 },
  { handoff_id: 969, process_id: PCF_10370 },
  { handoff_id: 970, process_id: PCF_10223 },
  { handoff_id: 967, process_id: PCF_10279 },
  { handoff_id: 351, process_id: PCF_10370 },
  { handoff_id: 352, process_id: PCF_10370 },
];

async function applyB1S11() {
  console.log(`\n[B1-S11] Loading APQC handoff_processes (${apqcTags.length} rows)`);
  const handoffIds = apqcTags.map(t => t.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=id,handoff_id,process_id`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.handoff_id}|${r.process_id}`),
  );
  const toInsert: Row[] = [];
  for (const t of apqcTags) {
    const key = `${t.handoff_id}|${t.process_id}`;
    if (existingKeys.has(key)) {
      console.log(`  handoff_processes (${t.handoff_id}, ${t.process_id}) already present, skipping`);
      continue;
    }
    toInsert.push({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      proposal_source: "agent_curated",
    });
  }
  if (toInsert.length === 0) {
    console.log("  nothing to insert");
    return;
  }
  console.log(`  inserting ${toInsert.length} handoff_processes rows`);
  await insertMany("/handoff_processes", toInsert);
}

// ============================================================
// Audit summary
// ============================================================
async function summary() {
  console.log("\n[Post-load summary]");
  const ev = await get(
    "/trigger_events?id=in.(1111,1112,1113,1114,1115,1116)&select=id,event_name,event_category&order=id.asc",
  );
  console.log("  trigger_events:", JSON.stringify(ev));
  const ue = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_ID}&related_data_object_id=in.(${Object.values(masterIds).join(",")})&select=id,related_data_object_id,relationship_verb&order=id.asc`,
  );
  console.log(`  user-edges loaded: ${ue.length}`);
  const hp = await get(
    "/handoff_processes?handoff_id=in.(350,349,965,969,970,967,351,352)&select=id,handoff_id,process_id&order=id.asc",
  );
  console.log(`  handoff_processes loaded: ${hp.length}`);
}

async function main() {
  await applyB1S6();
  await applyB1S8();
  await applyB1S11();
  await summary();
  console.log("\nDone.");
}

await main();
