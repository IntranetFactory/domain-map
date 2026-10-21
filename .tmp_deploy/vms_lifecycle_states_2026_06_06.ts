// B1A-B12: INSERT data_object_lifecycle_states for 5 VMS masters (skip 187 pm_work_orders, gated on B2-1).
// Idempotent by (data_object_id, state_name). domain_module_id set to the mastering module.
// Run: bun run c:/dev/domain-map/.tmp_deploy/vms_lifecycle_states_2026_06_06.ts
// Rule #15: notes empty. Rule #1: record_status omitted (DB default "new").

type Row = Record<string, unknown>;

async function call(payload: Row): Promise<Row[]> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe", cwd: "c:/dev/domain-map" },
  );
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius exit ${proc.exitCode}: ${err}\n${out}`);
  }
  try {
    return JSON.parse(out);
  } catch {
    throw new Error(`Non-JSON response: ${out}\n${err}`);
  }
}

// Each state: [state_name, order, is_initial, is_terminal, requires_permission, verb_override]
type StateSpec = [string, number, boolean, boolean, boolean, string];

const SETS: { data_object_id: number; module_id: number; states: StateSpec[] }[] = [
  {
    data_object_id: 186, // contingent_workers -> 315
    module_id: 315,
    states: [
      ["active", 10, true, false, false, ""],
      ["on_assignment", 20, false, false, true, "assign_worker"],
      ["tenure_threshold_reached", 30, false, false, false, ""],
      ["terminated", 40, false, true, true, "terminate_worker"],
    ],
  },
  {
    data_object_id: 188, // staffing_suppliers -> 315
    module_id: 315,
    states: [
      ["draft", 10, true, false, false, ""],
      ["activated", 20, false, false, true, "activate_supplier"],
      ["suspended", 30, false, false, true, "suspend_supplier"],
      ["terminated", 40, false, true, true, "terminate_supplier"],
    ],
  },
  {
    data_object_id: 189, // rate_cards -> 315
    module_id: 315,
    states: [
      ["draft", 10, true, false, false, ""],
      ["published", 20, false, false, true, "publish_rate_card"],
      ["superseded", 30, false, false, false, ""],
      ["retired", 40, false, true, true, "retire_rate_card"],
    ],
  },
  {
    data_object_id: 190, // contingent_timesheets -> 316
    module_id: 316,
    states: [
      ["drafted", 10, true, false, false, ""],
      ["submitted", 20, false, false, false, ""],
      ["approved", 30, false, false, true, "approve_timesheet"],
      ["rejected", 40, false, false, true, "reject_timesheet"],
      ["billed", 50, false, true, true, "bill_timesheet"],
    ],
  },
  {
    data_object_id: 191, // contingent_invoices -> 316
    module_id: 316,
    states: [
      ["received", 10, true, false, false, ""],
      ["matched", 20, false, false, true, "match_invoice"],
      ["disputed", 30, false, false, true, "dispute_invoice"],
      ["paid", 40, false, true, true, "pay_invoice"],
    ],
  },
];

const doIds = SETS.map((s) => s.data_object_id).join(",");
const existing = await call({
  method: "GET",
  path: `/data_object_lifecycle_states?data_object_id=in.(${doIds})&select=data_object_id,state_name`,
});
const seen = new Set(existing.map((r) => `${r.data_object_id}|${r.state_name}`));

const toInsert: Row[] = [];
for (const set of SETS) {
  for (const [name, order, isInit, isTerm, reqPerm, override] of set.states) {
    const key = `${set.data_object_id}|${name}`;
    if (seen.has(key)) continue;
    toInsert.push({
      data_object_id: set.data_object_id,
      state_name: name,
      state_order: order,
      is_initial: isInit,
      is_terminal: isTerm,
      requires_permission: reqPerm,
      permission_verb_override: override,
      domain_module_id: set.module_id,
      process_id: null,
      notes: "",
    });
  }
}

console.log(`Existing states on the 5 masters: ${existing.length}`);
console.log(`To insert: ${toInsert.length}`);

if (toInsert.length > 0) {
  const inserted = await call({
    method: "POST",
    path: "/data_object_lifecycle_states",
    body: toInsert,
  });
  console.log(`Inserted ${inserted.length} lifecycle states.`);
  for (const r of inserted) {
    console.log(
      `  id=${r.id} do=${r.data_object_id} ${r.state_name} (order ${r.state_order}, init=${r.is_initial}, term=${r.is_terminal}, gate=${r.requires_permission}, module=${r.domain_module_id})`,
    );
  }
}

// Verify per-master counts
const verify = await call({
  method: "GET",
  path: `/data_object_lifecycle_states?data_object_id=in.(${doIds})&select=data_object_id,state_name,state_order,is_initial,is_terminal,requires_permission,domain_module_id&order=data_object_id.asc,state_order.asc`,
});
const counts: Record<string, number> = {};
const initials: Record<string, number> = {};
const terminals: Record<string, number> = {};
for (const r of verify) {
  const k = String(r.data_object_id);
  counts[k] = (counts[k] ?? 0) + 1;
  if (r.is_initial) initials[k] = (initials[k] ?? 0) + 1;
  if (r.is_terminal) terminals[k] = (terminals[k] ?? 0) + 1;
}
console.log("\nPer-master verification (count / initials / terminals):");
for (const set of SETS) {
  const k = String(set.data_object_id);
  console.log(`  do=${k} module=${set.module_id}: ${counts[k] ?? 0} states, ${initials[k] ?? 0} initial, ${terminals[k] ?? 0} terminal`);
}
