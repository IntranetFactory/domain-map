// SEM audit fixes (2026-05-26):
//   1. Bump create_strategy_map + update_strategy_map on skill 166 to required
//   2. Load strategic_initiatives (id 274) lifecycle states on module 106

const STRATEGIC_INITIATIVES_ID = 274;
const SEM_EXECUTION_TRACKING_ID = 106;

const skillToolPatches = [
  { id: 1512, tool: "create_strategy_map" },
  { id: 1513, tool: "update_strategy_map" },
];

const lifecycleStates = [
  {
    state_name: "proposed",
    state_order: 1,
    is_initial: true,
    is_terminal: false,
    requires_permission: false,
    permission_verb_override: "",
    description: "Initiative is drafted by a strategy-office contributor; not yet funded or scheduled.",
  },
  {
    state_name: "approved",
    state_order: 2,
    is_initial: false,
    is_terminal: false,
    requires_permission: true,
    permission_verb_override: "approve_strategic_initiative",
    description: "Initiative cleared by the operating-rhythm review; budget and owner confirmed. Publishes strategic_initiative.approved.",
  },
  {
    state_name: "in_progress",
    state_order: 3,
    is_initial: false,
    is_terminal: false,
    requires_permission: false,
    permission_verb_override: "",
    description: "Execution underway; status, milestones, and benefits realisation updated against the initiative.",
  },
  {
    state_name: "completed",
    state_order: 4,
    is_initial: false,
    is_terminal: true,
    requires_permission: true,
    permission_verb_override: "complete_strategic_initiative",
    description: "Benefits realised or scope fully delivered. Publishes strategic_initiative.completed.",
  },
  {
    state_name: "cancelled",
    state_order: 4,
    is_initial: false,
    is_terminal: true,
    requires_permission: true,
    permission_verb_override: "cancel_strategic_initiative",
    description: "Initiative withdrawn before completion (deprioritised, blocked, or rolled into another initiative). Publishes strategic_initiative.cancelled.",
  },
];

async function sem(method: string, path: string, body?: unknown): Promise<unknown> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius ${method} ${path} failed (exit ${proc.exitCode}): ${stderr || stdout}`);
  }
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

async function main() {
  console.log("Fix 1: bump strategy_map mutate tools to required on skill 166");
  for (const row of skillToolPatches) {
    await sem("PATCH", `/skill_tools?id=eq.${row.id}`, { requirement_level: "required" });
    console.log(`  patched skill_tools.id=${row.id} (${row.tool}) -> required`);
  }

  console.log("\nFix 2: load strategic_initiatives lifecycle states (data_object_id=274, module=106)");
  const existing = (await sem(
    "GET",
    `/data_object_lifecycle_states?data_object_id=eq.${STRATEGIC_INITIATIVES_ID}&select=state_name`,
  )) as Array<{ state_name: string }>;
  const have = new Set(existing.map((r) => r.state_name));
  const toInsert = lifecycleStates
    .filter((s) => !have.has(s.state_name))
    .map((s) => ({
      ...s,
      data_object_id: STRATEGIC_INITIATIVES_ID,
      domain_module_id: SEM_EXECUTION_TRACKING_ID,
    }));
  if (toInsert.length === 0) {
    console.log("  all states already present, nothing to insert");
  } else {
    await sem("POST", "/data_object_lifecycle_states", toInsert);
    console.log(`  inserted ${toInsert.length} state(s): ${toInsert.map((s) => s.state_name).join(", ")}`);
  }

  console.log("\nVerifying final state...");
  const final = (await sem(
    "GET",
    `/data_object_lifecycle_states?data_object_id=eq.${STRATEGIC_INITIATIVES_ID}&select=state_name,state_order,is_initial,is_terminal,requires_permission,permission_verb_override&order=state_order.asc`,
  )) as Array<Record<string, unknown>>;
  for (const s of final) {
    const flags = [
      s.is_initial ? "initial" : null,
      s.is_terminal ? "terminal" : null,
      s.requires_permission ? `gate:${s.permission_verb_override || "auto"}` : null,
    ].filter(Boolean).join(", ");
    console.log(`  [${s.state_order}] ${s.state_name}${flags ? ` (${flags})` : ""}`);
  }

  const patched = (await sem(
    "GET",
    `/skill_tools?skill_id=eq.166&tool_id=in.(940,941)&select=tool_id,requirement_level`,
  )) as Array<{ tool_id: number; requirement_level: string }>;
  console.log("\nVerify skill 166 strategy_map mutate levels:");
  for (const r of patched) console.log(`  tool_id=${r.tool_id} -> ${r.requirement_level}`);

  console.log("\nDone.");
}

await main();
