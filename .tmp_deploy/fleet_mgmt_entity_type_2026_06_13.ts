// B13: classify entity_type on the 5 FLEET-MGMT masters (all currently
// 'unclassified', a non-skippable audit failure). Grounded in the FLEET-MGMT
// domain review (master descriptions + the lifecycle workflows enumerated in the
// B1B-LIFECYCLE-STATES state.yaml item + the B12 lifecycle read):
//   370 fleet_vehicles     -> operational_workflow (acquired->in_service->assigned->maintenance->retired->sold)
//   371 fleet_drivers      -> operational_workflow (applicant->qualified->active->on_leave->separated; gated hire/separate)
//   372 fuel_transactions  -> operational_record   (append-only per-charge telemetry, no business workflow; config-shape per Rule #12)
//   373 fleet_assignments  -> operational_workflow (scheduled->active->completed->cancelled)
//   374 vehicle_inspections-> operational_workflow (scheduled->in_progress->passed|failed->repair_completed)
// Additive: record_status untouched (Rule #1). PATCH only when current value is
// 'unclassified' (idempotent, never overwrites a human classification).

const PLAN: Record<number, string> = {
  370: "operational_workflow",
  371: "operational_workflow",
  372: "operational_record",
  373: "operational_workflow",
  374: "operational_workflow",
};

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

for (const [id, type] of Object.entries(PLAN)) {
  const cur = await crud("GET", `/data_objects?id=eq.${id}&select=id,data_object_name,entity_type`);
  const row = Array.isArray(cur) ? cur[0] : null;
  if (!row) { console.log(`  ${id}: NOT FOUND, skipped`); continue; }
  if (row.entity_type !== "unclassified") {
    console.log(`  ${id} ${row.data_object_name}: already '${row.entity_type}', skipped`);
    continue;
  }
  await crud("PATCH", `/data_objects?id=eq.${id}`, { entity_type: type });
  console.log(`  ${id} ${row.data_object_name}: entity_type = ${type} written`);
}
console.log("done.");
