#!/usr/bin/env bun
// State-driven CCAAS audit execute pass (2026-06-07).
// Three additive/corrective EXECUTE batches, all idempotent, all record_status='new' by default:
//   1. B1A-B9b-EVENT-CAT: backfill 6 empty trigger_events.event_category (Rule #13 enum).
//   2. entity_type (Rule #12 / B13): PATCH 6 masters from 'unclassified' to the typed enum.
//   3. B1B-B11-ALIASES: INSERT generic, vendor-free industry synonyms (Rule #18) for the masters.
//
// NOT touched here (surfaced/left): em-dash + British-spelling rewrites on domains.business_logic /
// description (overwrite of non-empty value = destructive), handoff_processes DELETE/retag decisions,
// the unbuilt-domain build cascade. Catalog UX domain-row fill is done in a separate PATCH (see report).
//
// Run from project root: bun run ".tmp_deploy/fix_ccaas_state_2026_06_07.ts"

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
async function patch(path: string, body: Row): Promise<Row[]> { return call({ method: "PATCH", path, body }); }
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Batch 1: trigger_events.event_category backfill (only where currently empty).
// ---------------------------------------------------------------------------
const eventCats: Record<number, string> = {
  500: "lifecycle",     // contact_record.captured
  501: "threshold",     // queue_statistics.threshold_breached
  502: "lifecycle",     // ccaas_call_recording.captured
  503: "state_change",  // agent_state.changed
  504: "threshold",     // agent_state.aux_threshold_exceeded
  505: "state_change",  // disposition_code.applied
};
{
  console.log("== Batch 1: trigger_events.event_category ==");
  const live = await get(`/trigger_events?id=in.(${Object.keys(eventCats).join(",")})&select=id,event_name,event_category`);
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = eventCats[id];
    if ((r.event_category ?? "") === "") {
      await patch(`/trigger_events?id=eq.${id}`, { event_category: want });
      console.log(`  PATCH ${id} ${r.event_name} -> event_category='${want}'`);
      patched++;
    } else {
      console.log(`  skip  ${id} ${r.event_name} already='${r.event_category}'`);
    }
  }
  console.log(`  batch 1 patched: ${patched}`);
}

// ---------------------------------------------------------------------------
// Batch 2: data_objects.entity_type classification (only where 'unclassified'/null).
// ---------------------------------------------------------------------------
const entityTypes: Record<number, string> = {
  256: "operational_workflow", // support_sessions: open->routing->active->wrap_up->closed engagement event
  257: "operational_record",   // contact_records: normalized customer-identity record
  258: "computed",             // queue_statistics: real-time/historical aggregate metrics
  735: "operational_workflow", // ccaas_call_recordings: captured->indexed->evaluated->signed_off
  736: "operational_workflow", // agent_states: presence/availability/pause-code state machine
  737: "catalog",              // disposition_codes: configurable wrap-category taxonomy
};
{
  console.log("== Batch 2: data_objects.entity_type ==");
  const live = await get(`/data_objects?id=in.(${Object.keys(entityTypes).join(",")})&select=id,data_object_name,entity_type`);
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = entityTypes[id];
    const cur = (r.entity_type ?? "") as string;
    if (cur === "" || cur === "unclassified") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: want });
      console.log(`  PATCH ${id} ${r.data_object_name} -> entity_type='${want}'`);
      patched++;
    } else {
      console.log(`  skip  ${id} ${r.data_object_name} already='${cur}'`);
    }
  }
  console.log(`  batch 2 patched: ${patched}`);
}

// ---------------------------------------------------------------------------
// Batch 3: data_object_aliases (generic industry synonyms, no vendor names, Rule #18).
// alias_type='synonym', industry_id null, record_status omitted (default new), notes omitted (Rule #15).
// Idempotent on (data_object_id, alias_name).
// ---------------------------------------------------------------------------
const aliasSpecs: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 256, alias_name: "Interaction" },
  { data_object_id: 256, alias_name: "Customer Contact" },
  { data_object_id: 257, alias_name: "Unified Customer Profile" },
  { data_object_id: 257, alias_name: "Customer Identity Record" },
  { data_object_id: 258, alias_name: "Queue Metrics" },
  { data_object_id: 258, alias_name: "Service Level Statistics" },
  { data_object_id: 735, alias_name: "Interaction Recording" },
  { data_object_id: 735, alias_name: "Call Recording" },
  { data_object_id: 736, alias_name: "Agent Presence" },
  { data_object_id: 736, alias_name: "Agent Status" },
  { data_object_id: 737, alias_name: "Wrap-Up Codes" },
  { data_object_id: 737, alias_name: "Reason Codes" },
];
{
  console.log("== Batch 3: data_object_aliases ==");
  const ids = [...new Set(aliasSpecs.map(a => a.data_object_id))].join(",");
  const live = await get(`/data_object_aliases?data_object_id=in.(${ids})&select=data_object_id,alias_name`);
  const existing = new Set(live.map(r => `${r.data_object_id}|${r.alias_name}`));
  const missing = aliasSpecs
    .filter(a => !existing.has(`${a.data_object_id}|${a.alias_name}`))
    .map(a => ({ ...a, alias_type: "synonym", industry_id: null }));
  if (missing.length) {
    const inserted = await insert("/data_object_aliases", missing);
    console.log(`  inserted ${inserted.length} aliases (${live.length} pre-existing)`);
  } else {
    console.log(`  all ${aliasSpecs.length} aliases already present, nothing to insert`);
  }
}

console.log("\nDONE.");
console.log("UI links:");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
