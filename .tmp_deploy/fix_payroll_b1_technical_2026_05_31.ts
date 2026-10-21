/**
 * PAYROLL b1 continuation, technical-only fixes (2026-05-31).
 *
 * Scope (truly mechanical, no judgment required):
 *
 *   B1-S1 (1 row):
 *     PATCH domains.id=55 business_logic to replace the em-dash with a colon.
 *     Audit pre-specifies the exact replacement string.
 *
 *   B1-S3 (11 rows):
 *     PATCH trigger_events.event_category. Audit pre-specifies the exact
 *     enum value per row id.
 *
 *   B1-S5 (7 rows):
 *     INSERT data_object_relationships user-edges (Rule #10) from users
 *     (data_object 748, kind=platform_builtin) to each workflow-bearing
 *     PAYROLL master. Audit pre-specifies the verbs and counterparties.
 *     Shape mirrors existing user-edge rows: owner_side='source',
 *     relationship_type='one_to_many', relationship_kind='reference',
 *     is_required=false, inverse_verb='is_<verb>_by'.
 *
 *   B1-S6 (10 rows):
 *     PATCH handoffs.target_domain_module_id for the 10 inbound handoffs
 *     PAYROLL owes. Audit pre-specifies the target module id per handoff,
 *     each derivable from existing PAYROLL modules (90, 91, 92, 93).
 *
 * Deferred to user judgment (recorded in the audit continuation):
 *   - B1-S2 (M7 DELETEs): per-bucket prompt gates entire S2 on B2-S1
 *     architectural choice. Even the 5 PAYROLL-RUN-side rows the cross-
 *     bucket-dependencies block calls "immediately executable" should not
 *     be deleted without user confirmation given the explicit gate above.
 *   - B1-S4 (8 intra-domain data_object_relationships): not user-edges,
 *     outside the technical-fix scope (only user-edges allowed per Rule #10).
 *   - B1-S6 row 414 (outbound source_domain_module_id): audit text reads
 *     "Confirm or surface as Bucket 2", which is a judgment hedge.
 *   - B1-S7, S8: report-only (other domains).
 *   - B1-S9 (E-band): audit notes "non-trivial load, stage through Phase
 *     E loader, not one-shot CLI"; full Phase E load is deferred.
 *   - B1-S10 (F-band): full Phase S system-skill / skill_tools load is
 *     deferred.
 *   - B1-S11 (24+ aliases): bulk alias inserts without per-row
 *     (alias_name, data_object_id, solution_id) tuples are deferred.
 *   - B1-S12 (business_function_domains contributors/consumers): explicitly
 *     deferred per the technical-scope rules.
 *   - B1-H1 (41 APQC tags): the audit's external_id references (10522,
 *     10510, 10511, 10728, 10464, 10520, 16437) resolve to different
 *     process_name values in the live processes table than the audit's
 *     textual labels. The PCFs are NOT cleanly resolvable; per the rule
 *     "INSERT handoff_processes ONLY when audit pre-specifies handoff_id
 *     + resolvable PCF (verify before insert)", every row fails the
 *     verification. Defer to user judgment. Also: 5 of the 41 handoffs
 *     (103, 426, 590, 1118, 416) already have agent_curated rows loaded
 *     since the audit was written, so the proposed FLIP/INSERT counts
 *     are stale.
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_payroll_b1_technical_2026_05_31.ts            # dry-run
 *   bun run .tmp_deploy/fix_payroll_b1_technical_2026_05_31.ts --apply    # apply
 */

const APPLY = process.argv.includes("--apply");

async function pg(method: string, path: string, body?: any): Promise<any> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(
      `${method} ${path} (${code}): ${(stderr || stdout).slice(0, 800)}`,
    );
  }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// ----- B1-S1: PATCH domains.business_logic to remove em-dash -----
const DOMAIN_ID = 55;
const NEW_BUSINESS_LOGIC =
  "Tax tables, gross-to-net calculation, garnishment logic, statutory filings, and country-specific compliance kernels: irreducible and continuously updated.";

async function patchDomainBusinessLogic(): Promise<void> {
  console.log("B1-S1: PATCH domains.business_logic (em-dash removal)");
  console.log("-----------------------------------------------------");
  const before = await pg(
    "GET",
    `/domains?id=eq.${DOMAIN_ID}&select=id,domain_code,business_logic`,
  );
  if (!before || before.length === 0) {
    console.log(`  ! domain id=${DOMAIN_ID} not found`);
    return;
  }
  const cur = before[0];
  if (cur.business_logic === NEW_BUSINESS_LOGIC) {
    console.log(`  = domain id=${DOMAIN_ID} (${cur.domain_code}) already clean`);
  } else if (!cur.business_logic.includes("—")) {
    console.log(
      `  ! domain id=${DOMAIN_ID} (${cur.domain_code}) business_logic differs but no em-dash present; SKIPPING`,
    );
    console.log(`    current: ${cur.business_logic}`);
  } else {
    console.log(
      `  ${APPLY ? "->" : "DRY"} domain id=${DOMAIN_ID} (${cur.domain_code}): replacing em-dash`,
    );
    if (APPLY) {
      await pg(
        "PATCH",
        `/domains?id=eq.${DOMAIN_ID}`,
        { business_logic: NEW_BUSINESS_LOGIC },
      );
    }
  }
  console.log("");
}

// ----- B1-S3: PATCH trigger_events.event_category (11 rows) -----
const TRIGGER_EVENT_PATCHES: Array<{ id: number; event_category: string }> = [
  { id: 402, event_category: "lifecycle" },     // pay_run.opened
  { id: 403, event_category: "state_change" },  // pay_run.calculated
  { id: 404, event_category: "state_change" },  // pay_run.approved
  { id: 405, event_category: "state_change" },  // pay_run.disbursed
  { id: 406, event_category: "lifecycle" },     // earning_code.created
  { id: 407, event_category: "state_change" },  // deduction_code.updated
  { id: 408, event_category: "state_change" },  // tax_authority.rate_changed
  { id: 409, event_category: "state_change" },  // tax_filing.submitted
  { id: 410, event_category: "state_change" },  // tax_filing.accepted
  { id: 411, event_category: "lifecycle" },     // garnishment_order.received
  { id: 412, event_category: "state_change" },  // garnishment_order.released
];

async function patchTriggerEvents(): Promise<void> {
  console.log("B1-S3: PATCH trigger_events.event_category (11 rows)");
  console.log("----------------------------------------------------");
  for (const row of TRIGGER_EVENT_PATCHES) {
    const before = await pg(
      "GET",
      `/trigger_events?id=eq.${row.id}&select=id,event_name,event_category`,
    );
    if (!before || before.length === 0) {
      console.log(`  ! id=${row.id} not found`);
      continue;
    }
    const cur = before[0];
    if (cur.event_category === row.event_category) {
      console.log(
        `  = id=${row.id} (${cur.event_name}) already ${row.event_category}`,
      );
      continue;
    }
    console.log(
      `  ${APPLY ? "->" : "DRY"} id=${row.id} (${cur.event_name}): "${cur.event_category}" -> "${row.event_category}"`,
    );
    if (APPLY) {
      await pg(
        "PATCH",
        `/trigger_events?id=eq.${row.id}`,
        { event_category: row.event_category },
      );
    }
  }
  console.log("");
}

// ----- B1-S5: INSERT user-edge data_object_relationships (Rule #10) -----
// Source data_object 748 = users (kind=platform_builtin).
// Each row mirrors the existing user-edge shape for this catalog:
//   owner_side='source', relationship_type='one_to_many',
//   relationship_kind='reference', is_required=false,
//   inverse_verb='is_<verb>_by'.
// Verbs and counterparties pre-specified in the audit's B1-S5 text.
const USER_EDGES: Array<{
  related_data_object_id: number;
  related_name: string;
  relationship_verb: string;
  inverse_verb: string;
}> = [
  { related_data_object_id: 138, related_name: "pay_runs",                relationship_verb: "manages pay runs",          inverse_verb: "is_managed_by" },
  { related_data_object_id: 143, related_name: "tax_filings",             relationship_verb: "approves tax filings",      inverse_verb: "is_approved_by" },
  { related_data_object_id: 144, related_name: "garnishment_orders",      relationship_verb: "processes garnishment orders", inverse_verb: "is_processed_by" },
  { related_data_object_id: 145, related_name: "payroll_journal_entries", relationship_verb: "approves journal entries",   inverse_verb: "is_approved_by" },
  { related_data_object_id: 139, related_name: "pay_slips",               relationship_verb: "receives pay slips",         inverse_verb: "is_recipient_of" },
  { related_data_object_id: 140, related_name: "earning_codes",           relationship_verb: "manages earning codes",      inverse_verb: "is_managed_by" },
  { related_data_object_id: 141, related_name: "deduction_codes",         relationship_verb: "manages deduction codes",    inverse_verb: "is_managed_by" },
];

const USERS_DO_ID = 748;

async function insertUserEdges(): Promise<void> {
  console.log("B1-S5: INSERT user-edge data_object_relationships (7 rows)");
  console.log("-----------------------------------------------------------");
  for (const edge of USER_EDGES) {
    const existing = await pg(
      "GET",
      `/data_object_relationships?data_object_id=eq.${USERS_DO_ID}&related_data_object_id=eq.${edge.related_data_object_id}&select=id,relationship_verb`,
    );
    if (existing && existing.length > 0) {
      console.log(
        `  = users -> ${edge.related_name}: already exists (id=${existing[0].id}, verb="${existing[0].relationship_verb}")`,
      );
      continue;
    }
    console.log(
      `  ${APPLY ? "->" : "DRY"} users -> ${edge.related_name}: "${edge.relationship_verb}" / inverse="${edge.inverse_verb}"`,
    );
    if (APPLY) {
      await pg("POST", "/data_object_relationships", {
        data_object_id: USERS_DO_ID,
        related_data_object_id: edge.related_data_object_id,
        owner_side: "source",
        relationship_type: "one_to_many",
        relationship_kind: "reference",
        relationship_verb: edge.relationship_verb,
        inverse_verb: edge.inverse_verb,
        is_required: false,
        // record_status omitted; DB default 'new' applies per Rule #1.
      });
    }
  }
  console.log("");
}

// ----- B1-S6: PATCH handoffs.target_domain_module_id (10 inbound rows) -----
// PAYROLL is the receiving side; module ids 90/91/92/93 are the four PAYROLL
// full modules. Audit pre-specifies the target_domain_module_id per handoff.
// The 11th item from the audit (handoff 414, source_domain_module_id PATCH)
// carries "Confirm or surface as Bucket 2" in the audit text, so it is held.
const HANDOFF_TARGET_PATCHES: Array<{
  id: number;
  target_domain_module_id: number;
  note: string;
}> = [
  { id: 105,  target_domain_module_id: 92, note: "COMP-MGMT merit_cycle.approved -> PAYROLL-EARNINGS-DEDUCTIONS" },
  { id: 1118, target_domain_module_id: 90, note: "HRSD hr_case.escalated_to_payroll -> PAYROLL-RUN" },
  { id: 426,  target_domain_module_id: 90, note: "WFM meal_break_record.violated -> PAYROLL-RUN" },
  { id: 590,  target_domain_module_id: 90, note: "VMS contingent_timesheet.approved -> PAYROLL-RUN" },
  { id: 599,  target_domain_module_id: 90, note: "EXPENSE expense_line.approved -> PAYROLL-RUN" },
  { id: 1126, target_domain_module_id: 92, note: "COMP-MGMT compensation_plan.published -> PAYROLL-EARNINGS-DEDUCTIONS" },
  { id: 108,  target_domain_module_id: 92, note: "BEN-ADMIN enrollment.changed -> PAYROLL-EARNINGS-DEDUCTIONS" },
  { id: 110,  target_domain_module_id: 92, note: "BEN-ADMIN benefit_open_enrollment.closed -> PAYROLL-EARNINGS-DEDUCTIONS" },
  { id: 417,  target_domain_module_id: 92, note: "BEN-ADMIN life_event.approved -> PAYROLL-EARNINGS-DEDUCTIONS" },
  { id: 423,  target_domain_module_id: 92, note: "COMP-MGMT equity_grant.vested -> PAYROLL-EARNINGS-DEDUCTIONS" },
];

async function patchHandoffTargets(): Promise<void> {
  console.log("B1-S6: PATCH handoffs.target_domain_module_id (10 rows)");
  console.log("--------------------------------------------------------");
  for (const row of HANDOFF_TARGET_PATCHES) {
    const before = await pg(
      "GET",
      `/handoffs?id=eq.${row.id}&select=id,target_domain_id,target_domain_module_id`,
    );
    if (!before || before.length === 0) {
      console.log(`  ! id=${row.id} not found`);
      continue;
    }
    const cur = before[0];
    if (cur.target_domain_id !== 55) {
      console.log(
        `  ! id=${row.id} target_domain_id=${cur.target_domain_id}, expected 55 (PAYROLL); SKIPPING`,
      );
      continue;
    }
    if (cur.target_domain_module_id === row.target_domain_module_id) {
      console.log(
        `  = id=${row.id} (${row.note}) already -> module ${row.target_domain_module_id}`,
      );
      continue;
    }
    if (cur.target_domain_module_id !== null) {
      console.log(
        `  ! id=${row.id} (${row.note}) currently -> module ${cur.target_domain_module_id} (not NULL); SKIPPING to avoid overwrite`,
      );
      continue;
    }
    console.log(
      `  ${APPLY ? "->" : "DRY"} id=${row.id} (${row.note}): NULL -> ${row.target_domain_module_id}`,
    );
    if (APPLY) {
      await pg(
        "PATCH",
        `/handoffs?id=eq.${row.id}`,
        { target_domain_module_id: row.target_domain_module_id },
      );
    }
  }
  console.log("");
}

async function main(): Promise<void> {
  console.log(`PAYROLL b1 technical continuation (apply=${APPLY})`);
  console.log("==================================================\n");

  await patchDomainBusinessLogic();
  await patchTriggerEvents();
  await insertUserEdges();
  await patchHandoffTargets();

  console.log("Done.");
  console.log("");
  console.log("Verify in the UI:");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
}

await main();
