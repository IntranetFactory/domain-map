#!/usr/bin/env bun
// EAM Phase-B — applies the 3 boundary decisions resolved 2026-05-22.
//
// Decision 1: HAM keeps `hardware_assets` (IT); EAM gets new `industrial_assets`.
// Decision 2: Rename id 349 `maintenance_work_orders` -> `facility_work_orders`
//             (REAL-EST-owned, facility scope); add new EAM `eam_work_orders`.
//             Trigger events 281/282/283 renamed to match.
// Decision 3: FLEET-MAINT keeps `preventive_maintenance_schedules` (vehicle);
//             EAM gets new `equipment_pm_schedules`.
//
// Scope: data_objects + master domain_data_objects ONLY. EAM-specific
// trigger_events + handoffs deferred (consistent with Phase-B Lite batch 1
// approach). record_status='new' on the 3 new data_objects.
//
//   bun run load_eam_phase_b.ts          -> DRY RUN
//   bun run load_eam_phase_b.ts --apply  -> Live

import { $ } from "bun";
$.throws(false);
const APPLY = process.argv.includes("--apply");

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function patch(path: string, body: Row): Promise<Row[]> {
  if (!APPLY) { console.log(`  [DRY] PATCH ${path} ${JSON.stringify(body)}`); return []; }
  return call({ method: "PATCH", path, body });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  if (!APPLY) { console.log(`  [DRY] POST ${rows.length} -> ${path}`); return []; }
  return call({ method: "POST", path, body: rows });
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

// ----- Section 1: rename id 349 (data_object) -----
const dox = await get(`/data_objects?id=eq.349&select=id,data_object_name,description`);
if (dox.length !== 1) throw new Error(`expected 1 row for data_object id=349, got ${dox.length}`);
const cur = dox[0];
console.log(`Section 1 - rename data_object id=349`);
console.log(`  current: ${cur.data_object_name}`);
if (cur.data_object_name === "facility_work_orders") {
  console.log(`  already renamed; skipping.`);
} else {
  await patch("/data_objects?id=eq.349", {
    data_object_name: "facility_work_orders",
    singular_label: "Facility Work Order",
    plural_label: "Facility Work Orders",
    display_label: "Facility Work Order",
    description: "Preventive or corrective maintenance task on a building, facility, or workplace asset (HVAC, lighting, doors, plumbing, janitorial, grounds). REAL-EST-mastered; FSM consumes/contributes via handoff. Distinct from EAM `eam_work_orders` (industrial plant/equipment) and FLEET-MAINT `vehicle_work_orders` (fleet vehicles).",
  });
}

// ----- Section 2: rename trigger_events 281/282/283 -----
const evs = await get(`/trigger_events?id=in.(281,282,283)&select=id,event_name`);
console.log(`\nSection 2 - rename trigger_events tied to id 349`);
for (const e of evs) {
  const newName = String(e.event_name).replace(/^maintenance_work_order\./, "facility_work_order.");
  if (e.event_name === newName) { console.log(`  id=${e.id} already renamed`); continue; }
  console.log(`  id=${e.id}: ${e.event_name} -> ${newName}`);
  await patch(`/trigger_events?id=eq.${e.id}`, { event_name: newName });
}

// ----- Section 3: insert new EAM data_objects -----
type Master = { name: string; label: string; desc: string };
const eamMasters: Master[] = [
  {
    name: "industrial_assets",
    label: "Industrial Asset",
    desc: "Physical plant, equipment, or infrastructure tracked for maintenance and lifecycle: HVAC units, generators, pumps, conveyors, production-line machines, building systems. Carries asset_tag, location, manufacturer, install_date, criticality, current_state. The EAM master; distinct from HAM `hardware_assets` (IT gear: laptops, servers, network), `fixed_assets` (ERP-FIN capitalization view of the same physical thing), and CMDB `configuration_items` (logical/topological IT view).",
  },
  {
    name: "eam_work_orders",
    label: "EAM Work Order",
    desc: "Preventive or corrective maintenance task on an industrial asset: PM cycle, breakdown repair, inspection, calibration. Carries asset reference, trigger source (PM schedule / meter threshold / fault / inspection), task lines (labor + parts + downtime), assigned technician/crew, status lifecycle. Distinct from REAL-EST `facility_work_orders` (building maintenance), FLEET-MAINT `vehicle_work_orders` (fleet), and FSM customer-facing work orders.",
  },
  {
    name: "equipment_pm_schedules",
    label: "Equipment PM Schedule",
    desc: "Per-asset or per-asset-class preventive-maintenance template: trigger basis (runtime hours / cycle count / calendar time / meter threshold), task list, frequency, due-date generation rules. Drives EAM `eam_work_orders`. Distinct from FLEET-MAINT `preventive_maintenance_schedules` (vehicle-specific: mileage / engine hours / DTC).",
  },
];

const allNames = eamMasters.map(m => m.name);
const existing = await get(`/data_objects?select=id,data_object_name&data_object_name=in.(${allNames.join(",")})`);
const existingNames = new Set(existing.map(r => String(r.data_object_name)));
const toInsertDOs = eamMasters.filter(m => !existingNames.has(m.name)).map(m => ({
  data_object_name: m.name,
  display_label: m.label,
  description: m.desc,
}));

console.log(`\nSection 3 - new EAM data_objects: ${eamMasters.length} planned, ${toInsertDOs.length} to insert.`);
if (toInsertDOs.length > 0) await insert("/data_objects", toInsertDOs);

// ----- Section 4: domain_data_objects master rows for EAM (id=53) -----
const allDOs = await get(`/data_objects?select=id,data_object_name&data_object_name=in.(${allNames.join(",")})`);
const doId = new Map(allDOs.map(x => [String(x.data_object_name), Number(x.id)]));

const eamDomainId = 53;
const existingDdo = await get(`/domain_data_objects?domain_id=eq.${eamDomainId}&select=data_object_id,role`);
const existingPairs = new Set(existingDdo.map(r => `${r.data_object_id}:${r.role}`));
const ddoPayload: Row[] = [];
for (const m of eamMasters) {
  const oid = doId.get(m.name);
  if (oid === undefined) {
    if (!APPLY) { console.log(`  [DRY] domain_data_object pending for ${m.name}`); continue; }
    throw new Error(`data_object missing after insert: ${m.name}`);
  }
  if (existingPairs.has(`${oid}:master`)) continue;
  ddoPayload.push({
    domain_id: eamDomainId,
    data_object_id: oid,
    role: "master",
    notes: "EAM Phase-B - boundary decisions resolved 2026-05-22; trigger_events + handoffs deferred",
  });
}

console.log(`\nSection 4 - domain_data_objects (EAM masters): ${ddoPayload.length} to insert.`);
if (ddoPayload.length > 0) await insert("/domain_data_objects", ddoPayload);

console.log(`\nDone (${APPLY ? "live" : "dry run"}).`);
