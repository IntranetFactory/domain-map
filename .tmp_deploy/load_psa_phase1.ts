// PSA audit phase 1: A1 em-dash fix, M3 starter modules, B4 pattern-flag notes,
// B12 config-shape exemption for resource_skill_inventories, rename tool 27 to
// follow the query_<entity> convention.
// Idempotent. record_status defaults to 'new' on every insert.

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<unknown> {
  const args = { method, path, ...(body !== undefined ? { body } : {}) };
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  await proc.stdin.end();
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  const t = out.trim();
  return t ? JSON.parse(t) : null;
}

async function a1_emdash_fix(): Promise<void> {
  console.log("\n[A1] PATCH PSA business_logic em-dash");
  const cur = (await pg("GET", "/domains?id=eq.68&select=business_logic")) as Array<{ business_logic: string }>;
  if (!cur.length) throw new Error("PSA domain id 68 not found");
  const newLogic = cur[0].business_logic.replace(/\s*—\s*/g, ", ");
  if (newLogic === cur[0].business_logic) {
    console.log("  no em-dash present; skipping");
    return;
  }
  await pg("PATCH", "/domains?id=eq.68", { business_logic: newLogic });
  console.log(`  PATCHed: "${newLogic}"`);
}

const STARTER_MODULES = [
  {
    domain_module_id: 86, // PSA-PROJECT-DELIVERY
    position: 1,
    notes: "Start here. Project scoping, structure, tasks and milestones are the foundational delivery surface every PSA deployment anchors on.",
    label: "PSA-PROJECT-DELIVERY starter @ PSA",
  },
  {
    domain_module_id: 88, // PSA-TIME-EXPENSE
    position: 2,
    notes: "Add for billable-hours capture and expense rollup once projects are live. Required input for both billing and utilization.",
    label: "PSA-TIME-EXPENSE starter @ PSA",
  },
  {
    domain_module_id: 89, // PSA-PROJECT-FINANCIALS
    position: 3,
    notes: "Add for milestone billing, invoice triggering and revenue recognition. Closes the loop from delivery to cash.",
    label: "PSA-PROJECT-FINANCIALS starter @ PSA",
  },
  {
    domain_module_id: 87, // PSA-RESOURCE-MGMT
    position: 4,
    notes: "Add for skills-based staffing and utilization forecasting once project volume warrants centralized resource pool management.",
    label: "PSA-RESOURCE-MGMT starter @ PSA",
  },
];

async function m3_starter_modules(): Promise<void> {
  console.log("\n[M3] INSERT domain_starter_modules for PSA");
  const existing = (await pg(
    "GET",
    "/domain_starter_modules?domain_id=eq.68&select=domain_module_id",
  )) as Array<{ domain_module_id: number }>;
  const have = new Set(existing.map((r) => r.domain_module_id));
  const rows = STARTER_MODULES.filter((r) => !have.has(r.domain_module_id)).map((r) => ({
    domain_starter_module_label: r.label,
    domain_id: 68,
    domain_module_id: r.domain_module_id,
    position: r.position,
    notes: r.notes,
  }));
  if (rows.length === 0) {
    console.log("  all starter modules present; skipping");
    return;
  }
  const inserted = (await pg("POST", "/domain_starter_modules?select=id,domain_module_id,position", rows)) as Array<{
    id: number;
    domain_module_id: number;
    position: number;
  }>;
  console.log(`  INSERT: ${inserted.length} rows`);
  for (const r of inserted) console.log(`    position ${r.position} -> module ${r.domain_module_id}`);
}

const B4_NOTES: Record<number, string> = {
  // service_projects: contains client-identifying info, not personal PII per se
  216: "Pattern flags considered (2026-05-26 audit): no personal content (engagement-level metadata only), no submit-lock (project plan stays editable through closeout), no single-approver (project manager governs without a sole-approver gate).",
  217: "Pattern flags considered (2026-05-26 audit): no personal content, no submit-lock (status updates editable in flight), no single-approver (task completion does not require a sole approver).",
  218: "Pattern flags considered (2026-05-26 audit): no personal content (refs employee identity via FK), no submit-lock (allocation editable until release), no single-approver (resource-mgr approves but is not a sole authority).",
  219: "Pattern flags considered (2026-05-26 audit): no personal content, no submit-lock (milestone description stays editable until reached), no single-approver (customer signoff is workflow-level, captured by the reached state).",
  725: "Pattern flags considered (2026-05-26 audit): no personal content (skill codes only; no narrative), no submit-lock (refreshed by debriefs and certifications), no single-approver (manager reviews but does not gate).",
  726: "Pattern flags considered (2026-05-26 audit): no personal content, no submit-lock (allocation plan editable through commit), no single-approver (allocator confirms but is not a sole authority).",
};

const B12_EXEMPTION: Record<number, string> = {
  // resource_skill_inventories: config-shaped reference data; updated through events but no
  // distinct lifecycle states beyond record_status. See Rule #12 exemption clause.
  725: "Config-shaped master; no workflow. resource_skill_inventories is updated continuously via debriefs, certifications and manager reviews, but transitions through no distinct lifecycle states beyond record_status. No per-state permissions are derived. Rule #12 config-shape exemption.",
};

async function b4_b12_notes(): Promise<void> {
  console.log("\n[B4 + B12 exemption] PATCH data_objects.notes on PSA masters");
  for (const [idStr, base] of Object.entries(B4_NOTES)) {
    const id = Number(idStr);
    const exempt = B12_EXEMPTION[id];
    const note = exempt ? `${base}\n\n${exempt}` : base;
    const cur = (await pg("GET", `/data_objects?id=eq.${id}&select=notes`)) as Array<{ notes: string }>;
    if (cur.length && cur[0].notes === note) {
      console.log(`  do ${id}: notes already current; skipping`);
      continue;
    }
    await pg("PATCH", `/data_objects?id=eq.${id}`, { notes: note });
    console.log(`  do ${id}: PATCHed`);
  }
}

async function rename_query_projects_tool(): Promise<void> {
  console.log("\n[Cleanup] Rename tool 27 query_projects -> query_service_projects");
  const cur = (await pg("GET", "/tools?id=eq.27&select=tool_name,data_object_id")) as Array<{
    tool_name: string;
    data_object_id: number;
  }>;
  if (!cur.length) {
    console.log("  tool 27 missing; skipping");
    return;
  }
  if (cur[0].tool_name === "query_service_projects") {
    console.log("  already renamed; skipping");
    return;
  }
  if (cur[0].tool_name !== "query_projects" || cur[0].data_object_id !== 216) {
    throw new Error(`tool 27 unexpected shape: ${JSON.stringify(cur[0])}`);
  }
  // Check for collision
  const collision = (await pg(
    "GET",
    "/tools?tool_name=eq.query_service_projects&select=id",
  )) as Array<{ id: number }>;
  if (collision.length) {
    throw new Error("tool query_service_projects already exists; cannot rename without merge");
  }
  await pg("PATCH", "/tools?id=eq.27", { tool_name: "query_service_projects" });
  console.log("  PATCHed");
}

async function verify(): Promise<void> {
  console.log("\nPost-load verification");
  const d = (await pg("GET", "/domains?id=eq.68&select=business_logic")) as Array<{ business_logic: string }>;
  console.log(`  PSA business_logic: "${d[0].business_logic}"`);
  const sm = (await pg(
    "GET",
    "/domain_starter_modules?domain_id=eq.68&select=domain_module_id,position&order=position.asc",
  )) as Array<{ domain_module_id: number; position: number }>;
  console.log(`  starter modules: ${sm.length} (${sm.map((r) => `${r.position}@${r.domain_module_id}`).join(", ")})`);
  const dos = (await pg(
    "GET",
    "/data_objects?id=in.(216,217,218,219,725,726)&select=id,notes&order=id.asc",
  )) as Array<{ id: number; notes: string }>;
  for (const r of dos) {
    const hasNote = r.notes && r.notes.length > 0;
    console.log(`  do ${r.id}: notes ${hasNote ? `(${r.notes.length} chars)` : "EMPTY"}`);
  }
  const tool = (await pg("GET", "/tools?id=eq.27&select=tool_name")) as Array<{ tool_name: string }>;
  console.log(`  tool 27: ${tool[0].tool_name}`);
}

async function main(): Promise<void> {
  console.log("PSA audit phase 1 loader (2026-05-26)");
  await a1_emdash_fix();
  await m3_starter_modules();
  await b4_b12_notes();
  await rename_query_projects_tool();
  await verify();
}

await main();
