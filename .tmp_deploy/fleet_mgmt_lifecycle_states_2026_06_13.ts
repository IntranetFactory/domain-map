// B1B-LIFECYCLE-STATES (partial): author lifecycle states for the two
// workflow-bearing masters whose state machine is NOT entangled with an open b2
// decision:
//   fleet_vehicles    (370 -> module 204 VEHICLE-LIFECYCLE)
//   fleet_assignments (373 -> module 205 DRIVER-OPS)
//
// NOT authored this pass (gated on open b2):
//   fleet_drivers (371)       -> B2-DRIVERS-VS-EMPLOYEES (does FLEET-MGMT even
//                                master drivers?) + B2-HCM-DRIVER-LIFECYCLE (the
//                                hire/separate gate verbs). The driver state
//                                machine moves / changes depending on the answer.
//   vehicle_inspections (374) -> B2-VEHICLE-INSPECTIONS-DVIR (unified DVIR+PMI
//                                with a discriminator vs split to TELEMATICS).
//   fuel_transactions (372)   -> entity_type=operational_record, no lifecycle
//                                (config-shape exempt per Rule #12; structural,
//                                no notes write).
//
// Idempotent: skip any (data_object_id, state_name) that already exists. notes
// left empty (Rule #15). record_status omitted -> defaults to 'new' (Rule #1).

type State = {
  state_name: string;
  state_order: number;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
};

const MASTERS: { id: number; name: string; module: number; states: State[] }[] = [
  {
    id: 370, name: "fleet_vehicles", module: 204,
    states: [
      { state_name: "acquired", state_order: 10, is_initial: true },
      { state_name: "in_service", state_order: 20 },
      { state_name: "assigned", state_order: 30 },
      { state_name: "maintenance", state_order: 40 },
      { state_name: "retired", state_order: 50, requires_permission: true, permission_verb_override: "retire_vehicle" },
      { state_name: "sold", state_order: 60, is_terminal: true, requires_permission: true, permission_verb_override: "sell_vehicle" },
    ],
  },
  {
    id: 373, name: "fleet_assignments", module: 205,
    states: [
      { state_name: "scheduled", state_order: 10, is_initial: true },
      { state_name: "active", state_order: 20 },
      { state_name: "completed", state_order: 30, is_terminal: true },
      { state_name: "cancelled", state_order: 40, is_terminal: true },
    ],
  },
];

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

for (const m of MASTERS) {
  const existing: any[] = (await crud("GET", `/data_object_lifecycle_states?data_object_id=eq.${m.id}&select=state_name`)) || [];
  const have = new Set(existing.map((r) => r.state_name));
  const rows = m.states
    .filter((s) => !have.has(s.state_name))
    .map((s) => ({
      data_object_lifecycle_state_label: `${m.name}.${s.state_name}`,
      data_object_id: m.id,
      state_name: s.state_name,
      state_order: s.state_order,
      is_initial: s.is_initial ?? false,
      is_terminal: s.is_terminal ?? false,
      requires_permission: s.requires_permission ?? false,
      permission_verb_override: s.permission_verb_override ?? "",
      domain_module_id: m.module,
    }));
  if (rows.length === 0) {
    console.log(`  ${m.name}: all ${m.states.length} states already present, skipped`);
    continue;
  }
  await crud("POST", `/data_object_lifecycle_states`, rows);
  console.log(`  ${m.name}: inserted ${rows.length} states (${rows.map((r) => r.state_name).join(", ")})`);
}
console.log("done.");
