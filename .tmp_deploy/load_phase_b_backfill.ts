#!/usr/bin/env bun
// Phase-B backfill for the under-loaded P2.5A.i candidate domains.
//
// Scope (after overlap resolution):
//   APM, SPM, GRC, AUDIT, DCG, DQ, MDM, ESG
//   (DLP, DSPM, REAL-EST domains added in a follow-up section once Phase-A research returns)
//
// Loads:
//   - data_objects (new master rows)
//   - domain_data_objects (master rows for new + co-master/contributor/consumer rows on existing)
//   - trigger_events (new events with data_object FK + from/to_state + category)
//   - cross_domain_handoffs (new handoffs with trigger_event_id + source/target domain + data_object FK)
//
// All inserts use record_status='new' (per rule #1).
//
// Run modes:
//   bun run load_phase_b_backfill.ts            -> DRY RUN
//   bun run load_phase_b_backfill.ts --apply    -> Live write

import { $ } from "bun";

$.throws(false);

const APPLY = process.argv.includes("--apply");

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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  if (!APPLY) {
    console.log(`  [DRY RUN] would POST ${rows.length} rows to ${path}`);
    return [];
  }
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// ============================================================================
// SHARED RESOLVERS
// ============================================================================

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

// Domain code → id map
const domainsRows = await get(`/domains?select=id,domain_code&limit=10000`);
const domainId = new Map<string, number>();
for (const r of domainsRows) domainId.set(String(r.domain_code), Number(r.id));

// Data_object name → id map (will be re-read after Section 1 inserts)
let doId = new Map<string, number>();
async function refreshDoMap() {
  const rows = await get(`/data_objects?select=id,data_object_name&limit=10000`);
  doId = new Map();
  for (const r of rows) doId.set(String(r.data_object_name), Number(r.id));
}
await refreshDoMap();

// Trigger_event name → id map (will be re-read after Section 3 inserts)
let teId = new Map<string, number>();
async function refreshTeMap() {
  const rows = await get(`/trigger_events?select=id,event_name&limit=10000`);
  teId = new Map();
  for (const r of rows) teId.set(String(r.event_name), Number(r.id));
}
await refreshTeMap();

// Existing domain_data_objects (key: domain_id:data_object_id:role)
const existingDdoRows = await get(`/domain_data_objects?select=domain_id,data_object_id,role&limit=20000`);
const existingDdoKey = (d: number, o: number, role: string) => `${d}:${o}:${role}`;
const existingDdos = new Set(existingDdoRows.map(r => existingDdoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));

// Existing cross_domain_handoffs (key: source_id:target_id:trigger_event_id:data_object_id)
const existingHandoffRows = await get(`/cross_domain_handoffs?select=source_domain_id,target_domain_id,trigger_event_id,data_object_id&limit=20000`);
const handoffKey = (s: number, t: number, te: number, d: number) => `${s}:${t}:${te}:${d}`;
const existingHandoffs = new Set(existingHandoffRows.map(r =>
  handoffKey(Number(r.source_domain_id), Number(r.target_domain_id), Number(r.trigger_event_id), Number(r.data_object_id))));

console.log(`Resolved: ${domainId.size} domains, ${doId.size} data_objects, ${teId.size} trigger_events, ${existingDdos.size} domain_data_objects, ${existingHandoffs.size} handoffs.\n`);

// ============================================================================
// SHARED TYPES
// ============================================================================

type DataObjectDraft = {
  data_object_name: string;
  singular_label?: string; plural_label?: string; display_label: string;
  description: string;
};

type DdoDraft = {
  domain_code: string;
  data_object_name: string;
  role: "master" | "contributor" | "consumer" | "derived";
  notes: string;
};

type TriggerEventDraft = {
  event_name: string;
  data_object_name: string;
  from_state: string;
  to_state: string;
  event_category: "lifecycle" | "state_change" | "threshold" | "signal";
  description: string;
};

type HandoffDraft = {
  event_name: string;
  source_domain_code: string;
  target_domain_code: string;
  data_object_name: string;       // per-edge payload
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "high" | "medium" | "low";
  description: string;
};

// ============================================================================
// PER-DOMAIN DRAFTS
// (Each section is independent; can be commented out / scoped)
// ============================================================================

const dataObjects: DataObjectDraft[] = [];
const ddos: DdoDraft[] = [];
const triggerEvents: TriggerEventDraft[] = [];
const handoffs: HandoffDraft[] = [];

// ----------------------------------------------------------------------------
// PLACEHOLDER — per-domain blocks added after agent drafts consolidated
// ----------------------------------------------------------------------------

// >>> APM (6 new data_objects after dropping application_lifecycle_states)
// >>> SPM (9 new data_objects)
// >>> GRC (10 new data_objects)
// >>> AUDIT (8 new data_objects)
// >>> DCG (9 new data_objects + 3 contributor→master promotions)
// >>> DQ (6 new data_objects + 2 co-master rows)
// >>> MDM (6 new data_objects after dropping product_golden_records + 3 co-master rows)
// >>> ESG (9 new data_objects after dropping audit_trails_esg)

// ============================================================================
// EXECUTION
// ============================================================================

// --- Section 1: new data_objects (idempotent by data_object_name) ---
const missingDOs = dataObjects.filter(d => !doId.has(d.data_object_name));
console.log(`Section 1 — data_objects: ${dataObjects.length} planned, ${missingDOs.length} new to insert.`);
if (missingDOs.length > 0) {
  await insert("/data_objects", missingDOs);
  if (APPLY) await refreshDoMap();
}

// --- Section 2: domain_data_objects (idempotent on (domain, data_object, role)) ---
const ddoPayload: Row[] = [];
const ddoSkipped: string[] = [];
for (const r of ddos) {
  const dId = domainId.get(r.domain_code);
  const oId = doId.get(r.data_object_name);
  if (dId === undefined) { ddoSkipped.push(`${r.domain_code}: domain not in catalog`); continue; }
  if (oId === undefined) {
    if (!APPLY) { ddoSkipped.push(`${r.data_object_name}: pending Section 1`); continue; }
    throw new Error(`Data_object not found: ${r.data_object_name}`);
  }
  if (existingDdos.has(existingDdoKey(dId, oId, r.role))) continue;
  ddoPayload.push({ domain_id: dId, data_object_id: oId, role: r.role, notes: r.notes });
}
console.log(`Section 2 — domain_data_objects: ${ddos.length} planned, ${ddoPayload.length} to insert, ${ddoSkipped.length} skipped.`);
if (ddoSkipped.length > 0 && !APPLY) console.log(`  Dry-run skips (will resolve on apply): ${ddoSkipped.length}`);
if (ddoPayload.length > 0) await insert("/domain_data_objects", ddoPayload);

// --- Section 3: trigger_events (idempotent by event_name) ---
const tePayload: Row[] = [];
const teSkipped: string[] = [];
for (const r of triggerEvents) {
  if (teId.has(r.event_name)) continue;
  const oId = doId.get(r.data_object_name);
  if (oId === undefined) {
    if (!APPLY) { teSkipped.push(`${r.event_name}: data_object pending`); continue; }
    throw new Error(`Trigger_event refers to unknown data_object: ${r.data_object_name}`);
  }
  tePayload.push({
    event_name: r.event_name,
    data_object_id: oId,
    from_state: r.from_state,
    to_state: r.to_state,
    event_category: r.event_category,
    description: r.description,
  });
}
console.log(`Section 3 — trigger_events: ${triggerEvents.length} planned, ${tePayload.length} new to insert, ${teSkipped.length} skipped.`);
if (tePayload.length > 0) {
  await insert("/trigger_events", tePayload);
  if (APPLY) await refreshTeMap();
}

// --- Section 4: cross_domain_handoffs (idempotent on (source, target, te, data_object)) ---
const hoPayload: Row[] = [];
const hoSkipped: string[] = [];
for (const r of handoffs) {
  const sId = domainId.get(r.source_domain_code);
  const tId = domainId.get(r.target_domain_code);
  const teIdN = teId.get(r.event_name);
  const oId = doId.get(r.data_object_name);
  if (sId === undefined) { hoSkipped.push(`${r.event_name}: source ${r.source_domain_code} not in catalog`); continue; }
  if (tId === undefined) { hoSkipped.push(`${r.event_name}: target ${r.target_domain_code} not in catalog`); continue; }
  if (teIdN === undefined) {
    if (!APPLY) { hoSkipped.push(`${r.event_name}: trigger_event pending`); continue; }
    throw new Error(`Handoff refers to unknown trigger_event: ${r.event_name}`);
  }
  if (oId === undefined) {
    if (!APPLY) { hoSkipped.push(`${r.event_name}: data_object pending`); continue; }
    throw new Error(`Handoff refers to unknown data_object: ${r.data_object_name}`);
  }
  if (existingHandoffs.has(handoffKey(sId, tId, teIdN, oId))) continue;
  hoPayload.push({
    source_domain_id: sId,
    target_domain_id: tId,
    trigger_event_id: teIdN,
    data_object_id: oId,
    integration_pattern: r.integration_pattern,
    friction_level: r.friction_level,
    description: r.description,
  });
}
console.log(`Section 4 — cross_domain_handoffs: ${handoffs.length} planned, ${hoPayload.length} new to insert, ${hoSkipped.length} skipped.`);
if (hoSkipped.length > 0 && !APPLY) console.log(`  Dry-run skips (will resolve on apply): ${hoSkipped.length}`);
if (hoPayload.length > 0) await insert("/cross_domain_handoffs", hoPayload);

console.log(`\nDone (${APPLY ? "live" : "dry run"}).`);
