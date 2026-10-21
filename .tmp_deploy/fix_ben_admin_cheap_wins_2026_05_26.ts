// BEN-ADMIN audit (2026-05-26) — cheap-wins loader.
// Fixes: trigger event 82 data-quality bug, M3 starter modules,
// B12 benefit_carriers lifecycle states, B10b 3 inbound handoff attributions
// plus 2 supporting DMDO rows. Idempotent; all writes default to record_status='new'.

async function semantius(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<unknown> {
  const args = { method, path, ...(body !== undefined ? { body } : {}) };
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  await proc.stdin.end();
  const [stdout, stderr, exit] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exit !== 0) {
    throw new Error(`semantius ${method} ${path} failed (${exit}): ${stderr || stdout}`);
  }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

function summarize(label: string, rows: unknown): void {
  const n = Array.isArray(rows) ? rows.length : rows ? 1 : 0;
  console.log(`  ${label}: ${n}`);
}

// --- Fix 1: trigger event 82 data-quality bug ---
async function fixTriggerEvent82(): Promise<void> {
  console.log("\n[Fix 1] Trigger event 82 cleanup");
  const event82 = (await semantius("GET", "/trigger_events?id=eq.82&select=id")) as Array<{ id: number }>;
  if (event82.length === 0) {
    console.log("  event 82 already deleted; skipping");
    return;
  }
  // Re-point handoff 110: stale trigger -> event 420, source module 73 -> 71,
  // payload 151 (carriers) -> 147 (enrollments). The original row was constructed from
  // the stale event's wrong data_object_id pointer; corrected to the OE-close -> PAYROLL
  // enrollment file-drop shape.
  const handoff110 = (await semantius(
    "GET",
    "/handoffs?id=eq.110&select=id,trigger_event_id,source_domain_module_id,data_object_id",
  )) as Array<{
    id: number;
    trigger_event_id: number;
    source_domain_module_id: number | null;
    data_object_id: number;
  }>;
  if (handoff110.length === 0) {
    console.log("  handoff 110 missing; skipping re-point");
  } else if (handoff110[0].trigger_event_id !== 82) {
    console.log("  handoff 110 already re-pointed; skipping");
  } else {
    await semantius("PATCH", "/handoffs?id=eq.110", {
      trigger_event_id: 420,
      source_domain_module_id: 71,
      data_object_id: 147,
      notes:
        "Corrected 2026-05-26 audit: was wired to stale trigger 82 (open_enrollment.closed mis-pointed at benefit_carriers). Re-pointed to event 420, source module BEN-PLAN-DESIGN (71), payload benefit_enrollments (147).",
    });
    console.log("  PATCH handoff 110 -> trigger_event_id=420, source_module=71, payload=147");
  }
  await semantius("DELETE", "/trigger_events?id=eq.82");
  console.log("  DELETE trigger_events 82");
}

// --- Fix 2: M3 domain_starter_modules ---
async function fixStarterModules(): Promise<void> {
  console.log("\n[Fix 2] M3 starter modules");
  const existing = (await semantius(
    "GET",
    "/domain_starter_modules?domain_id=eq.61&select=domain_module_id",
  )) as Array<{ domain_module_id: number }>;
  const have = new Set(existing.map((r) => r.domain_module_id));
  const want = [
    {
      domain_id: 61,
      domain_module_id: 72,
      position: 1,
      notes:
        "Buyer-facing enrollment workflow: open enrollment, life events, dependents. The first thing employees touch and the part vendors demo first.",
    },
    {
      domain_id: 61,
      domain_module_id: 71,
      position: 2,
      notes:
        "Plan catalog and enrollment-window setup. Required scaffolding for enrollment to function.",
    },
    {
      domain_id: 61,
      domain_module_id: 73,
      position: 3,
      notes:
        "Carrier feeds and reconciliation. Most deployments add this once enrollment is stable.",
    },
  ];
  const missing = want.filter((r) => !have.has(r.domain_module_id));
  if (missing.length === 0) {
    console.log("  all starter rows already present; skipping");
    return;
  }
  const inserted = await semantius("POST", "/domain_starter_modules?select=domain_module_id,position", missing);
  summarize("INSERT domain_starter_modules", inserted);
}

// --- Fix 3: B12 benefit_carriers lifecycle states ---
async function fixCarrierStates(): Promise<void> {
  console.log("\n[Fix 3] B12 benefit_carriers lifecycle states");
  const existing = (await semantius(
    "GET",
    "/data_object_lifecycle_states?data_object_id=eq.151&select=state_name",
  )) as Array<{ state_name: string }>;
  if (existing.length > 0) {
    console.log(`  ${existing.length} states already present; skipping`);
    return;
  }
  const states = [
    { state_name: "prospect", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "" },
    { state_name: "contracted", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "contract" },
    { state_name: "active", state_order: 3, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "activate" },
    { state_name: "suspended", state_order: 4, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "suspend" },
    { state_name: "terminated", state_order: 5, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "terminate" },
  ].map((s) => ({ data_object_id: 151, domain_module_id: 73, ...s }));
  const inserted = await semantius("POST", "/data_object_lifecycle_states?select=state_name,state_order", states);
  summarize("INSERT data_object_lifecycle_states", inserted);
}

// --- Fix 4: B10b inbound handoff attribution + supporting DMDOs ---
async function fixB10bAttribution(): Promise<void> {
  console.log("\n[Fix 4] B10b inbound module attribution");
  // 4a: DMDOs the patches depend on
  const existingDmdos = (await semantius(
    "GET",
    "/domain_module_data_objects?or=(and(domain_module_id.eq.72,data_object_id.eq.192),and(domain_module_id.eq.74,data_object_id.eq.139))&select=domain_module_id,data_object_id",
  )) as Array<{ domain_module_id: number; data_object_id: number }>;
  const haveDmdo = new Set(existingDmdos.map((r) => `${r.domain_module_id}:${r.data_object_id}`));
  const wantDmdos = [
    {
      domain_module_id: 72,
      data_object_id: 192,
      role: "consumer",
      necessity: "required",
      notes:
        "BEN-ENROLLMENT consumes hr_cases when HRSD escalates a benefits question (escalated_to_benefits). Receiving side of handoff 1119.",
    },
    {
      domain_module_id: 74,
      data_object_id: 139,
      role: "consumer",
      necessity: "optional",
      notes:
        "BEN-ACA-COMPLIANCE consumes pay_slips for ACA affordability calculations (1095-C line 15). Receiving side of handoff 413.",
    },
  ];
  const missingDmdos = wantDmdos.filter((r) => !haveDmdo.has(`${r.domain_module_id}:${r.data_object_id}`));
  if (missingDmdos.length > 0) {
    const inserted = await semantius("POST", "/domain_module_data_objects?select=domain_module_id,data_object_id", missingDmdos);
    summarize("INSERT domain_module_data_objects", inserted);
  } else {
    console.log("  DMDOs already present; skipping");
  }

  // 4b: PATCH 3 inbound handoffs
  const patches: Array<{ id: number; target_domain_module_id: number; notes: string }> = [
    {
      id: 1156,
      target_domain_module_id: 72,
      notes:
        "B10b attribution 2026-05-26: payroll_journal.reversed payload is benefit_enrollments (147), mastered by BEN-ENROLLMENT (72). High friction retained: deduction accruals span periods; reversal cascades into employer-match calculations.",
    },
    {
      id: 1119,
      target_domain_module_id: 72,
      notes:
        "B10b attribution 2026-05-26: hr_case.escalated_to_benefits routed to BEN-ENROLLMENT (72) where benefit questions land. DMDO consumer+required added on hr_cases (192) for module 72.",
    },
    {
      id: 413,
      target_domain_module_id: 74,
      notes:
        "B10b attribution 2026-05-26: pay_cycle.closed pay_slip data consumed by BEN-ACA-COMPLIANCE (74) for affordability calculations. DMDO consumer+optional added on pay_slips (139) for module 74.",
    },
  ];
  for (const p of patches) {
    const current = (await semantius(
      "GET",
      `/handoffs?id=eq.${p.id}&select=id,target_domain_module_id`,
    )) as Array<{ id: number; target_domain_module_id: number | null }>;
    if (current.length === 0) {
      console.log(`  handoff ${p.id} missing; skipping`);
      continue;
    }
    if (current[0].target_domain_module_id === p.target_domain_module_id) {
      console.log(`  handoff ${p.id} already attributed to module ${p.target_domain_module_id}; skipping`);
      continue;
    }
    await semantius("PATCH", `/handoffs?id=eq.${p.id}`, {
      target_domain_module_id: p.target_domain_module_id,
      notes: p.notes,
    });
    console.log(`  PATCH handoff ${p.id} -> target_module=${p.target_domain_module_id}`);
  }
}

async function main(): Promise<void> {
  console.log("BEN-ADMIN cheap-wins loader (2026-05-26)");
  await fixTriggerEvent82();
  await fixStarterModules();
  await fixCarrierStates();
  await fixB10bAttribution();

  // Post-load verification
  console.log("\nPost-load verification");
  const starters = (await semantius(
    "GET",
    "/domain_starter_modules?domain_id=eq.61&order=position.asc&select=position,domain_module:domain_modules(domain_module_code)",
  )) as unknown[];
  console.log("  starter_modules:", JSON.stringify(starters));
  const carrierStates = (await semantius(
    "GET",
    "/data_object_lifecycle_states?data_object_id=eq.151&order=state_order.asc&select=state_name",
  )) as Array<{ state_name: string }>;
  console.log("  carrier states:", carrierStates.map((s) => s.state_name).join(", "));
  const event82 = (await semantius("GET", "/trigger_events?id=eq.82&select=id")) as unknown[];
  console.log("  trigger event 82 still present:", event82.length > 0);
  const nullInbound = (await semantius(
    "GET",
    "/handoffs?target_domain_id=eq.61&target_domain_module_id=is.null&select=id,trigger_event:trigger_events(event_name),data_object_id",
  )) as unknown[];
  console.log("  inbound NULL target_module count:", Array.isArray(nullInbound) ? nullInbound.length : 0);
}

await main();
