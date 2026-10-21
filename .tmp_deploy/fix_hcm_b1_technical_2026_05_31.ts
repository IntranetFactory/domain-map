/**
 * HCM b1 continuation, technical-only fixes (2026-05-31).
 *
 * Scope (truly mechanical, no judgment required):
 *
 *   B1-S1, partial (7 of 8):
 *     PATCH trigger_events.event_category for HCM rows where the audit's
 *     default value (state_change) is unambiguous. Event 391 (org_unit.created)
 *     is held back: the audit's default of `lifecycle` is also surfaced as
 *     B2-S1 (user picks lifecycle vs state_change). Defer that one row.
 *
 *   B1-S5 (9 rows):
 *     PATCH `notes` = '' on 8 domain_data_objects rows and 1
 *     domain_module_data_objects row that carry mechanical context strings.
 *     The audit (B2-S2) frames the default-on-auto-populated as revert. Per
 *     SKILL Rule #15, every `notes` column is empty by default; the only
 *     license is per-row user approval of the exact wording. Since the rows
 *     do not match the discussion-shape (no per-row user approval recorded
 *     in the audit), the safe-by-default action is to revert.
 *
 * Deferred to user judgment:
 *   - B1-S1 (1 of 8): event 391 (org_unit.created), held by B2-S1.
 *   - B1-S2: 28 inbound handoff target_domain_module_id PATCHes are NOT
 *     derivable from existing modules. 27 of the 28 foreign payload
 *     data_objects have neither a HCM domain_data_objects rollup nor a
 *     HCM domain_module_data_objects row, so the 54-vs-56 choice is a
 *     judgment call (the audit's own text reads "target = 56 or 54
 *     depending on consumer-DMDO assignment"). Defer until the HCM-side
 *     consumer DMDOs are decided.
 *   - B1-S3: report-only (other domains).
 *   - B1-S4: report-only (other domains).
 *   - B1-S6: APQC tagging, the audit's external_id hints fail to resolve
 *     against the live processes table for most rows, and the process
 *     names match multiple PCF rows requiring per-row judgment. Not
 *     mechanical.
 *   - B1-S7: DMDO INSERTs are outside the technical-only scope.
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_hcm_b1_technical_2026_05_31.ts            # dry-run
 *   bun run .tmp_deploy/fix_hcm_b1_technical_2026_05_31.ts --apply    # apply
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

// ----- B1-S1, trigger_events.event_category PATCHes (7 of 8) -----
// Audit defaults from B1-S1:
//   389 / 390 job_profile.published / .updated  -> state_change
//   391 org_unit.created                         -> lifecycle (HELD by B2-S1)
//   392 / 393 org_unit.merged / .disbanded       -> state_change
//   394 / 395 / 396 employment_contract.*        -> state_change
//
// Event 391 is excluded because B2-S1 surfaces the `lifecycle` vs
// `state_change` choice as a judgment call.
const TRIGGER_EVENT_PATCHES: Array<{ id: number; event_category: string }> = [
  { id: 389, event_category: "state_change" },
  { id: 390, event_category: "state_change" },
  { id: 392, event_category: "state_change" },
  { id: 393, event_category: "state_change" },
  { id: 394, event_category: "state_change" },
  { id: 395, event_category: "state_change" },
  { id: 396, event_category: "state_change" },
];

// ----- B1-S5, notes='' reverts (9 rows) -----
// IDs explicitly named in the audit table B1-S5 + B2-S2.
const DDO_NOTES_REVERTS: number[] = [58, 97, 291, 309, 317, 333, 371, 1124];
const DMDO_NOTES_REVERTS: number[] = [678];

async function patchTriggerEvents(): Promise<void> {
  console.log("B1-S1: PATCH trigger_events.event_category");
  console.log("------------------------------------------");
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

async function revertNotes(): Promise<void> {
  console.log("B1-S5: PATCH notes='' on DDOs + DMDOs");
  console.log("-------------------------------------");

  for (const id of DDO_NOTES_REVERTS) {
    const before = await pg(
      "GET",
      `/domain_data_objects?id=eq.${id}&select=id,data_object_id,notes,data_objects(data_object_name)`,
    );
    if (!before || before.length === 0) {
      console.log(`  ! DDO id=${id} not found`);
      continue;
    }
    const cur = before[0];
    if (!cur.notes || cur.notes === "") {
      console.log(`  = DDO id=${id} already empty`);
      continue;
    }
    console.log(
      `  ${APPLY ? "->" : "DRY"} DDO id=${id} (${cur.data_objects?.data_object_name}): clearing notes (${cur.notes.length} chars)`,
    );
    if (APPLY) {
      await pg(
        "PATCH",
        `/domain_data_objects?id=eq.${id}`,
        { notes: "" },
      );
    }
  }

  for (const id of DMDO_NOTES_REVERTS) {
    const before = await pg(
      "GET",
      `/domain_module_data_objects?id=eq.${id}&select=id,data_object_id,notes,data_objects(data_object_name)`,
    );
    if (!before || before.length === 0) {
      console.log(`  ! DMDO id=${id} not found`);
      continue;
    }
    const cur = before[0];
    if (!cur.notes || cur.notes === "") {
      console.log(`  = DMDO id=${id} already empty`);
      continue;
    }
    console.log(
      `  ${APPLY ? "->" : "DRY"} DMDO id=${id} (${cur.data_objects?.data_object_name}): clearing notes (${cur.notes.length} chars)`,
    );
    if (APPLY) {
      await pg(
        "PATCH",
        `/domain_module_data_objects?id=eq.${id}`,
        { notes: "" },
      );
    }
  }
  console.log("");
}

async function main(): Promise<void> {
  console.log(`HCM b1 technical continuation (apply=${APPLY})`);
  console.log("=================================================\n");

  await patchTriggerEvents();
  await revertNotes();

  console.log("Done.");
  console.log("");
  console.log("Verify in the UI:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
  console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
}

await main();
