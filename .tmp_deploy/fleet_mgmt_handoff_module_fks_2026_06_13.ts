// B1B-HANDOFF-MODULE-FKS: backfill the FLEET-MGMT-side module FK on the 6
// resolvable handoffs (the ones whose FLEET-MGMT-side data_object resolves to a
// single mastering module). Idempotent: re-reads each row and skips if already set.
//
// Resolution (B10b):
//   outbound source_domain_module_id = FLEET-MGMT module mastering the trigger
//     event's data_object:
//       313 event d.o 374 vehicle_inspections -> 205 (DRIVER-OPS)
//       317 event d.o 372 fuel_transactions   -> 206 (FUEL-COMPLIANCE)
//       874 event d.o 370 fleet_vehicles      -> 204 (VEHICLE-LIFECYCLE)
//       875 event d.o 370 fleet_vehicles      -> 204
//       876 event d.o 370 fleet_vehicles      -> 204
//   inbound target_domain_module_id = FLEET-MGMT module holding the payload:
//       318 payload 373 fleet_assignments     -> 205 (DRIVER-OPS)
//
// The 5 foreign-payload inbounds (319/321/877/880/884) are NOT touched: FLEET-MGMT
// declares no DMDO role on their payloads (driver_behavior_events, vehicle_trips,
// maintenance_defects, driver_safety_scorecards, service_work_orders), so there is
// no module candidate. Whether to add a consumer DMDO is a modeling decision left
// open (interacts with the DVIR / telematics-overlap b2 questions), not a backfill.

const OUTBOUND: Record<number, number> = { 313: 205, 317: 206, 874: 204, 875: 204, 876: 204 };
const INBOUND: Record<number, number> = { 318: 205 };

async function crud(method: string, path: string, body?: unknown): Promise<any> {
  const arg = JSON.stringify({ method, path, ...(body ? { body } : {}) });
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(arg);
  p.stdin.end();
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (err && err.trim() && !out.trim()) throw new Error(`crud ${path}: ${err}`);
  try { return out.trim() ? JSON.parse(out) : null; } catch { return out; }
}

async function patchFk(id: number, column: "source_domain_module_id" | "target_domain_module_id", moduleId: number) {
  const cur = await crud("GET", `/handoffs?id=eq.${id}&select=id,${column}`);
  const row = Array.isArray(cur) ? cur[0] : null;
  if (!row) { console.log(`  handoff ${id}: NOT FOUND, skipped`); return; }
  if (row[column] != null) { console.log(`  handoff ${id}: ${column} already ${row[column]}, skipped`); return; }
  await crud("PATCH", `/handoffs?id=eq.${id}`, { [column]: moduleId });
  console.log(`  handoff ${id}: ${column} = ${moduleId} written`);
}

console.log("outbound source_domain_module_id:");
for (const [id, mod] of Object.entries(OUTBOUND)) await patchFk(Number(id), "source_domain_module_id", mod);
console.log("inbound target_domain_module_id:");
for (const [id, mod] of Object.entries(INBOUND)) await patchFk(Number(id), "target_domain_module_id", mod);
console.log("done.");
