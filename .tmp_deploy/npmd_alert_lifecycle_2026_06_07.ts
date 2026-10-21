#!/usr/bin/env bun
// NPMD B12: author the lifecycle states for network_performance_alerts (data_object 541),
// the one NPMD master classified operational_workflow. The other 7 masters are
// operational_record / computed and are exempt structurally via entity_type (Rule #12).
//
// Workflow (state.yaml B1B-B12): open -> acknowledged -> resolved -> closed, with a
// permission gate on acknowledge and resolve. domain_module_id stays NULL because NPMD
// is unbuilt (0 modules); NULL-module lifecycle states are an established pattern for
// un-modularized domains. record_status omitted -> 'new' (Rule #1).
//
// Idempotent: reads existing states for 541 first; inserts only missing state_names.

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

const ALERT = 541;

const states = [
  { data_object_id: ALERT, state_name: "open", state_order: 10, description: "Alert raised on a network performance threshold breach or anomaly; awaiting triage.", is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: null },
  { data_object_id: ALERT, state_name: "acknowledged", state_order: 20, description: "An operator has acknowledged the alert and taken ownership of the investigation.", is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "acknowledge", domain_module_id: null },
  { data_object_id: ALERT, state_name: "resolved", state_order: 30, description: "The underlying network condition has cleared or been remediated; pending closure review.", is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "resolve", domain_module_id: null },
  { data_object_id: ALERT, state_name: "closed", state_order: 40, description: "Alert reviewed and closed; no further action required.", is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: null },
];

const existing = await get(`/data_object_lifecycle_states?data_object_id=eq.${ALERT}&select=state_name`);
const have = new Set(existing.map(r => String(r.state_name)));
const missing = states.filter(s => !have.has(s.state_name));

if (missing.length === 0) {
  console.log("All 541 lifecycle states already present; nothing to insert.");
} else {
  await call({ method: "POST", path: "/data_object_lifecycle_states", body: missing });
  console.log(`Inserted ${missing.length} lifecycle states for network_performance_alerts (541).`);
}

const verify = await get(
  `/data_object_lifecycle_states?data_object_id=eq.${ALERT}&select=state_name,state_order,is_initial,is_terminal,requires_permission&order=state_order`,
);
console.log("Live lifecycle states for 541:");
for (const r of verify) {
  console.log(`  ${r.state_order} ${r.state_name} initial=${r.is_initial} terminal=${r.is_terminal} gate=${r.requires_permission}`);
}
