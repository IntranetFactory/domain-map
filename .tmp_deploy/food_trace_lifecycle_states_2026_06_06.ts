#!/usr/bin/env bun
// B1A-S10 (FOOD-TRACE) — per-master lifecycle state machines (Rule #12 / B12).
//
// Prerequisite: the 5 masters are entity_type='unclassified' (B13 fail, blocks B12).
// All 5 carry real workflows per the b1a action and the module descriptions, so PATCH
// entity_type='operational_workflow' first (snapshot prior value 'unclassified' in history).
//
// State-machine shape per B12/M4: exactly one is_initial, >=1 is_terminal, unique monotonic
// state_order. Workflow-gate states get requires_permission=true. domain_module_id = realizing
// module (494/495/496 -> 256, 497 -> 257, 498 -> 258). record_status omitted (default new).
// notes left empty (Rule #15).

import { $ } from "bun";
$.throws(false);
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
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  }
  return out;
}

type S = { state_name: string; state_order: number; is_initial?: boolean; is_terminal?: boolean; requires_permission?: boolean; permission_verb_override?: string; description: string };

const machines: { doid: number; module: number; states: S[] }[] = [
  {
    doid: 494, module: 256, // traceability_lots
    states: [
      { state_name: "created", state_order: 0, is_initial: true, description: "Lot created at an origin (harvest, receipt, or production)." },
      { state_name: "active", state_order: 1, description: "Lot is active and available in the supply chain." },
      { state_name: "split", state_order: 2, requires_permission: true, description: "Lot split into child lots; genealogy edges link children to this parent." },
      { state_name: "merged", state_order: 3, requires_permission: true, description: "Lot merged with others into a single lot; genealogy preserves every source." },
      { state_name: "transformed", state_order: 4, requires_permission: true, description: "Lot transformed into a new product lot; genealogy links output to inputs." },
      { state_name: "recalled", state_order: 5, requires_permission: true, permission_verb_override: "recall_lot", description: "Lot placed under recall hold; segregated pending disposition." },
      { state_name: "consumed", state_order: 6, description: "Lot fully consumed and no longer available." },
      { state_name: "archived", state_order: 7, is_terminal: true, description: "Lot record retained for traceability after end of life." },
    ],
  },
  {
    doid: 495, module: 256, // critical_tracking_events
    states: [
      { state_name: "recorded", state_order: 0, is_initial: true, description: "A FSMA-204 critical tracking event has been recorded." },
      { state_name: "validated", state_order: 1, requires_permission: true, description: "KDE completeness validated against the required data format." },
      { state_name: "amended", state_order: 2, requires_permission: true, description: "Event amended; prior version retained and the correction republished." },
      { state_name: "closed", state_order: 3, is_terminal: true, description: "Event finalized and retained as traceability evidence." },
    ],
  },
  {
    doid: 496, module: 256, // key_data_elements
    states: [
      { state_name: "captured", state_order: 0, is_initial: true, description: "Key data element captured against a tracking event." },
      { state_name: "validated", state_order: 1, requires_permission: true, description: "KDE passed validation for format and completeness." },
      { state_name: "flagged", state_order: 2, description: "KDE flagged for review due to a missing or implausible value." },
      { state_name: "resolved", state_order: 3, is_terminal: true, requires_permission: true, description: "Flagged KDE corrected and the traceability record finalized." },
    ],
  },
  {
    doid: 497, module: 257, // recall_events
    states: [
      { state_name: "initiated", state_order: 0, is_initial: true, requires_permission: true, description: "Recall formally initiated; affected lots identified from genealogy." },
      { state_name: "classified", state_order: 1, requires_permission: true, description: "Recall classified by severity (Class I/II/III), setting the filing and notification path." },
      { state_name: "notification_sent", state_order: 2, description: "Notifications dispatched to affected consignees and agencies." },
      { state_name: "consolidating", state_order: 3, description: "Affected lots and consignee responses being consolidated for the recall scope." },
      { state_name: "reconciling", state_order: 4, description: "Recovered, held, and outstanding quantities being reconciled against the scope." },
      { state_name: "effectiveness_verified", state_order: 5, requires_permission: true, permission_verb_override: "verify_effectiveness", description: "Effectiveness checks confirm the product was removed from commerce." },
      { state_name: "terminated", state_order: 6, is_terminal: true, requires_permission: true, description: "Recall formally terminated after effectiveness verification and regulatory sign-off." },
    ],
  },
  {
    doid: 498, module: 258, // supplier_certifications
    states: [
      { state_name: "uploaded", state_order: 0, is_initial: true, description: "Certification document uploaded and awaiting verification." },
      { state_name: "verified", state_order: 1, requires_permission: true, description: "Certification verified against the issuing authority and document validity." },
      { state_name: "active", state_order: 2, description: "Certification active and within its validity window." },
      { state_name: "expiring", state_order: 3, description: "Certification approaching expiry; renewal requested." },
      { state_name: "expired", state_order: 4, description: "Certification past expiry with no renewal received." },
      { state_name: "renewed", state_order: 5, description: "Certification renewed with a current valid document; validity window resets." },
      { state_name: "revoked", state_order: 6, is_terminal: true, requires_permission: true, description: "Certification revoked; supplier blocked from new lot acceptance until restored." },
    ],
  },
];

// 1) Classify entity_type (snapshot prior value handled in history.md by the agent).
const masters = await get("/data_objects?id=in.(494,495,496,497,498)&select=id,data_object_name,entity_type");
console.log("entity_type BEFORE:", masters.map((m: Row) => `${m.id}:${m.entity_type}`).join(", "));
for (const m of masters) {
  if (m.entity_type !== "operational_workflow") {
    await call({ method: "PATCH", path: `/data_objects?id=eq.${m.id}`, body: { entity_type: "operational_workflow" } });
    console.log(`  PATCHed data_objects ${m.id} entity_type ${m.entity_type} -> operational_workflow`);
  }
}

// 2) Author lifecycle states (idempotent: dedup by (data_object_id, state_name)).
const existing = await get("/data_object_lifecycle_states?data_object_id=in.(494,495,496,497,498)&select=data_object_id,state_name");
const have = new Set(existing.map(r => `${r.data_object_id}|${r.state_name}`));
const rows: Row[] = [];
for (const mc of machines) {
  for (const s of mc.states) {
    if (have.has(`${mc.doid}|${s.state_name}`)) continue;
    rows.push({
      data_object_id: mc.doid,
      domain_module_id: mc.module,
      state_name: s.state_name,
      state_order: s.state_order,
      is_initial: s.is_initial ?? false,
      is_terminal: s.is_terminal ?? false,
      requires_permission: s.requires_permission ?? false,
      permission_verb_override: s.permission_verb_override ?? "",
      description: s.description,
    });
  }
}
console.log(`\nlifecycle_states: ${machines.reduce((a, m) => a + m.states.length, 0)} proposed, ${rows.length} to insert`);
if (rows.length) {
  const ins = await insert("/data_object_lifecycle_states", rows);
  console.log("inserted", ins.length, "state rows");
}

// 3) Verify shape per master.
const after = await get("/data_object_lifecycle_states?data_object_id=in.(494,495,496,497,498)&select=data_object_id,state_name,state_order,is_initial,is_terminal,requires_permission,permission_verb_override,domain_module_id&order=data_object_id.asc,state_order.asc");
const byDo = new Map<number, Row[]>();
for (const r of after) { const k = Number(r.data_object_id); if (!byDo.has(k)) byDo.set(k, []); byDo.get(k)!.push(r); }
console.log("\nVERIFY:");
for (const [doid, sts] of byDo) {
  const initials = sts.filter(s => s.is_initial).length;
  const terminals = sts.filter(s => s.is_terminal).length;
  const orders = sts.map(s => Number(s.state_order));
  const uniqueMonotonic = new Set(orders).size === orders.length && orders.every((v, i) => i === 0 || v > orders[i - 1]);
  const gates = sts.filter(s => s.requires_permission).map(s => s.state_name + (s.permission_verb_override ? `(${s.permission_verb_override})` : ""));
  console.log(`  do ${doid}: ${sts.length} states | initial=${initials} terminal=${terminals} uniqueMonotonic=${uniqueMonotonic} mod=${sts[0].domain_module_id} | gates: ${gates.join(", ")}`);
}
