// PSA audit phase 4:
// (1) Load missing inbound DMDO consumer rows for contingent_timesheets,
//     agency_time_entries, work_schedules on the appropriate PSA modules.
// (2) Backfill target_domain_module_id on the corresponding inbound handoffs.
// (3) Backfill notes on outbound handoffs whose target_domain_module_id is
//     NULL because the target domain hasn't declared a consumer DMDO yet
//     (out-of-scope from this audit; report-only). Annotate so the next audit
//     pass on the target domain has the breadcrumb.
//
// The mis-routed inbound handoffs (creative_briefs 515, work_automations 787)
// are left alone — they are upstream classification problems, not PSA gaps.

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
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

const DMDO_ROWS = [
  // contingent_timesheets (190) — PSA-TIME-EXPENSE (88) consumes for project-cost rollup
  {
    domain_module_id: 88,
    data_object_id: 190,
    role: "consumer" as const,
    necessity: "optional" as const,
    notes: "Services orgs using contingent labor on projects feed approved contingent_timesheets into PSA for billable-hours rollup and project cost tracking. Optional: many services orgs run pure-employee delivery.",
  },
  // agency_time_entries (479) — PSA-TIME-EXPENSE (88) consumes for staff-augmentation cost
  {
    domain_module_id: 88,
    data_object_id: 479,
    role: "consumer" as const,
    necessity: "optional" as const,
    notes: "Services orgs that use creative-agency staff augmentation pull approved agency_time_entries into PSA for project cost reporting. Optional: relevant only when agency-mgmt is integrated.",
  },
  // work_schedules (160) — PSA-RESOURCE-MGMT (87) consumes for resource availability
  {
    domain_module_id: 87,
    data_object_id: 160,
    role: "consumer" as const,
    necessity: "optional" as const,
    notes: "Published work schedules constrain when consultants are available for project assignments. PSA reads to avoid double-booking. Optional: small services orgs without WFM manage availability inside PSA directly.",
  },
];

async function load_inbound_dmdo(): Promise<void> {
  console.log("\n[1] Load inbound DMDO consumer rows");
  const moduleIds = Array.from(new Set(DMDO_ROWS.map((r) => r.domain_module_id))).join(",");
  const objectIds = Array.from(new Set(DMDO_ROWS.map((r) => r.data_object_id))).join(",");
  const existing = (await pg(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${objectIds})&select=domain_module_id,data_object_id`,
  )) as Array<{ domain_module_id: number; data_object_id: number }>;
  const haveKey = new Set(existing.map((r) => `${r.domain_module_id}:${r.data_object_id}`));
  const rows = DMDO_ROWS.filter((r) => !haveKey.has(`${r.domain_module_id}:${r.data_object_id}`));
  if (rows.length === 0) {
    console.log("  all consumer DMDO rows present; skipping");
    return;
  }
  const inserted = (await pg("POST", "/domain_module_data_objects?select=id,domain_module_id,data_object_id", rows)) as Array<{
    id: number; domain_module_id: number; data_object_id: number;
  }>;
  console.log(`  INSERT: ${inserted.length} consumer rows`);
  for (const r of inserted) console.log(`    module ${r.domain_module_id} -> data_object ${r.data_object_id}`);
}

// Map (handoff id, target_domain_module_id) for inbound rows whose payload is now consumed
// by a PSA module.
const INBOUND_HANDOFF_BACKFILL = [
  // handoff 587: contingent_timesheet.approved (data_object 190) -> PSA-TIME-EXPENSE (88)
  { id: 587, target_domain_module_id: 88, payload: "contingent_timesheets", new_notes: "" },
  // handoff 513: agency_time_entry.submitted (data_object 479) -> PSA-TIME-EXPENSE (88)
  { id: 513, target_domain_module_id: 88, payload: "agency_time_entries", new_notes: "" },
  // handoff 428: work_schedule.published (data_object 160) -> PSA-RESOURCE-MGMT (87)
  { id: 428, target_domain_module_id: 87, payload: "work_schedules", new_notes: "" },
];

async function backfill_inbound_module_fk(): Promise<void> {
  console.log("\n[2] Backfill target_domain_module_id on inbound handoffs");
  for (const r of INBOUND_HANDOFF_BACKFILL) {
    const cur = (await pg(
      "GET",
      `/handoffs?id=eq.${r.id}&select=target_domain_module_id,notes`,
    )) as Array<{ target_domain_module_id: number | null; notes: string }>;
    if (!cur.length) {
      console.log(`  handoff ${r.id}: not found; skipping`);
      continue;
    }
    if (cur[0].target_domain_module_id === r.target_domain_module_id) {
      console.log(`  handoff ${r.id}: already at module ${r.target_domain_module_id}; skipping`);
      continue;
    }
    // Clear the legacy "target NULL: no PSA module holds data_object X" note when present
    const newNotes = cur[0].notes && cur[0].notes.startsWith("target NULL: no PSA module")
      ? r.new_notes
      : cur[0].notes;
    await pg("PATCH", `/handoffs?id=eq.${r.id}`, {
      target_domain_module_id: r.target_domain_module_id,
      notes: newNotes,
    });
    console.log(`  handoff ${r.id} (${r.payload}): PATCHed target_domain_module_id=${r.target_domain_module_id}`);
  }
}

// Outbound handoffs whose target_domain_module_id is NULL because the target domain
// hasn't declared a consumer DMDO for the payload yet. The fix lives on the target
// domain's B-band; this loader only annotates so the breadcrumb survives across audits.
type OutboundBreadcrumb = { handoff_id: number; target_code: string; payload: string };
const OUTBOUND_BREADCRUMBS: OutboundBreadcrumb[] = [
  { handoff_id: 132,  target_code: "S2P",     payload: "purchase_requisitions" },
  { handoff_id: 1127, target_code: "ERP-FIN", payload: "time_entries" },
  { handoff_id: 1128, target_code: "ERP-FIN", payload: "expense_reports" },
  { handoff_id: 1130, target_code: "PA",      payload: "project_assignments" },
  { handoff_id: 131,  target_code: "ERP-FIN", payload: "revenue_recognition_records" },
  { handoff_id: 1016, target_code: "HCM",     payload: "project_assignments" },
  { handoff_id: 1024, target_code: "WORK-MGMT", payload: "project_tasks" },
  { handoff_id: 1025, target_code: "ERP-FIN", payload: "project_tasks" },
  { handoff_id: 1020, target_code: "CLM",     payload: "project_billing_milestones" },
  { handoff_id: 1021, target_code: "EPM",     payload: "project_billing_milestones" },
  { handoff_id: 1022, target_code: "HCM",     payload: "project_resource_allocations" },
  { handoff_id: 1026, target_code: "HCM",     payload: "resource_skill_inventories" },
  { handoff_id: 1017, target_code: "WORK-MGMT", payload: "project_assignments" },
  { handoff_id: 1019, target_code: "ERP-FIN", payload: "project_billing_milestones" },
];

async function backfill_outbound_breadcrumbs(): Promise<void> {
  console.log("\n[3] Annotate outbound handoff notes (report-only breadcrumbs)");
  for (const r of OUTBOUND_BREADCRUMBS) {
    const cur = (await pg(
      "GET",
      `/handoffs?id=eq.${r.handoff_id}&select=target_domain_module_id,notes`,
    )) as Array<{ target_domain_module_id: number | null; notes: string }>;
    if (!cur.length) {
      console.log(`  handoff ${r.handoff_id}: not found; skipping`);
      continue;
    }
    if (cur[0].target_domain_module_id !== null) {
      console.log(`  handoff ${r.handoff_id}: target_domain_module_id already resolved to ${cur[0].target_domain_module_id}; skipping breadcrumb`);
      continue;
    }
    const note = `target NULL until ${r.target_code} declares consumer DMDO on \`${r.payload}\``;
    if (cur[0].notes === note) {
      console.log(`  handoff ${r.handoff_id}: breadcrumb already current; skipping`);
      continue;
    }
    await pg("PATCH", `/handoffs?id=eq.${r.handoff_id}`, { notes: note });
    console.log(`  handoff ${r.handoff_id}: PATCHed breadcrumb -> ${r.target_code} owes ${r.payload}`);
  }
}

async function verify(): Promise<void> {
  console.log("\nPost-load verification");
  const inboundNulls = (await pg(
    "GET",
    "/handoffs?target_domain_id=eq.68&target_domain_module_id=is.null&select=id,data_object_id,notes",
  )) as Array<{ id: number; data_object_id: number; notes: string }>;
  console.log(`  remaining inbound NULL: ${inboundNulls.length}`);
  for (const r of inboundNulls) console.log(`    handoff ${r.id} (payload ${r.data_object_id}): ${r.notes}`);
}

async function main(): Promise<void> {
  console.log("PSA inbound DMDO + B10b backfill loader");
  await load_inbound_dmdo();
  await backfill_inbound_module_fk();
  await backfill_outbound_breadcrumbs();
  await verify();
}

await main();
