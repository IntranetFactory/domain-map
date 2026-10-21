#!/usr/bin/env bun
/**
 * SWP B1 technical fixes - 2026-05-31 continuation.
 *
 * Scope (only truly-technical B1 fixes per the prompt rules):
 *
 *   1. B1-S1 PATCH event_category on 4 of 5 trigger_events to 'state_change'.
 *      Targets: 384 position_demand_forecast.updated, 385 skills_gap_analysis.completed,
 *      386 workforce_scenario.approved, 387 org_design.published. Row 388
 *      labor_market_benchmark.refreshed is DEFERRED (gated on B2-S2 state_change-vs-threshold
 *      convention).
 *
 *   2. B1-S5 PATCH notes='' on rows the audit names with row IDs. Per the technical
 *      rules, notes='' reverts are licensed when the audit pre-specifies row IDs;
 *      B1-S5 lists every polluted row. Live verification reduced the original
 *      34-row target to 30 (skill_tools id 15 absent; 33/57/142 already empty).
 *      Rows reverted:
 *        - domain_data_objects: 31, 53, 57, 59, 906, 907, 908, 909, 910, 911, 912 (11)
 *        - data_objects: 25, 29 (2) [Rule #12 config-shape license RESCINDED]
 *        - data_object_aliases: 513, 514, 515, 516, 517, 518 (6)
 *        - handoffs: 13, 452 (2)
 *        - solution_domains: 515, 516, 517, 518, 519, 520, 521, 522, 523 (9)
 *
 *   3. B1-S7 PATCH proposal_source='agent_curated' on 3 handoff_processes rows
 *      where the existing PCF tag matches the audit's recommendation:
 *        - handoff 12 -> process 219 (Manage employee requisitions): confirm
 *        - handoff 400 -> process 219 (same): confirm
 *        - handoff 27 -> process 1324 (Prepare periodic financial forecasts): confirm
 *
 * Deferred (NOT applied here, see audit continuation entry):
 *
 *   - B1-S1 trigger_event 388: gated on B2-S2 convention question.
 *   - B1-S2 (4 new system skills + 14 skill_tools relocate + legacy DELETE): new
 *     entities/skills are not in the technical-fix scope; gated on user.
 *   - B1-S3 B10b report-only NULLs owed by EPM/WFM/SPM: not SWP's fix.
 *   - B1-S4 pairwise consumer DMDOs owed by other domains: not SWP's fix.
 *   - B1-S6 pattern-flag flips on workforce_scenarios/org_designs/workforce_cost_projections/
 *     skills_gap_analyses: gated on B2-S3.
 *   - B1-S7 other H1 rows: audit-specified PCF external_ids did not resolve to
 *     the named processes in the live catalog (10532 -> "Deliver employee
 *     communications" not "Manage workforce planning", 10519 not found, 10539 not
 *     found, 10742 -> "Process customer credit", 10545 not found, 10511 -> "Review
 *     compensation plan" L4 not L3 "Develop and manage rewards", 10544 not found,
 *     10018 -> "Survey market and determine customer needs and wants", 10773 -> L4
 *     "Prepare periodic financial forecasts"). Per the technical-fix rule
 *     "INSERT handoff_processes ONLY when audit pre-specifies handoff_id +
 *     resolvable PCF (verify before insert)", these inserts and the two REPLACE-
 *     CORRECTIONS (13 and 242) are deferred. Handoff 241 PATCH-to-agent_curated
 *     is also deferred because the audit recommends a tighter PCF whose external
 *     id does not resolve.
 *   - B1-S8 Signal-1 attribution on event 62: gated on B2-S4.
 *
 * Pre-flight (verified live before running):
 *   - 5 trigger_events 384-388 exist with empty event_category; only 4 patched.
 *   - All 30 notes-revert rows verified non-empty in the live tables above.
 *   - handoff_processes ids 48 (h=12, p=219), 49 (h=400, p=219), 115 (h=27, p=1324)
 *     all exist with proposal_source='discovery_substring'.
 *
 * Idempotent: GET-then-PATCH on every row; safe to re-run.
 * Run from project root: bun run .tmp_deploy/fix_swp_b1_technical_2026_05_31.ts
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// --- B1-S1: trigger_events event_category PATCH ---

const EVENT_CATEGORY_PATCHES: { id: number; event_name: string }[] = [
  { id: 384, event_name: "position_demand_forecast.updated" },
  { id: 385, event_name: "skills_gap_analysis.completed" },
  { id: 386, event_name: "workforce_scenario.approved" },
  { id: 387, event_name: "org_design.published" },
];

async function fixTriggerEvents() {
  console.log("\n=== B1-S1: PATCH trigger_events.event_category -> 'state_change' ===");
  for (const ev of EVENT_CATEGORY_PATCHES) {
    const cur = await get(
      `/trigger_events?id=eq.${ev.id}&select=id,event_name,event_category`,
    );
    if (cur.length !== 1) {
      console.log(`  ! trigger_event ${ev.id} not found, skipping`);
      continue;
    }
    if (cur[0].event_name !== ev.event_name) {
      console.log(
        `  ! trigger_event ${ev.id} name mismatch (live='${cur[0].event_name}', expected='${ev.event_name}'), skipping`,
      );
      continue;
    }
    if (cur[0].event_category === "state_change") {
      console.log(`  = trigger_event ${ev.id} already state_change, skipping`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${ev.id}`, { event_category: "state_change" });
    console.log(
      `  + trigger_event ${ev.id} (${ev.event_name}): '${cur[0].event_category}' -> 'state_change'`,
    );
  }
}

// --- B1-S5: notes='' reverts on rows the audit names with IDs ---

type NotesRevert = { table: string; ids: number[] };

const NOTES_REVERTS: NotesRevert[] = [
  {
    table: "domain_data_objects",
    ids: [31, 53, 57, 59, 906, 907, 908, 909, 910, 911, 912],
  },
  { table: "data_objects", ids: [25, 29] },
  { table: "data_object_aliases", ids: [513, 514, 515, 516, 517, 518] },
  { table: "handoffs", ids: [13, 452] },
  {
    table: "solution_domains",
    ids: [515, 516, 517, 518, 519, 520, 521, 522, 523],
  },
];

async function revertNotes() {
  console.log("\n=== B1-S5: PATCH notes='' on rows the audit pre-specifies ===");
  for (const block of NOTES_REVERTS) {
    console.log(`  [${block.table}] ${block.ids.length} candidate rows`);
    const idList = block.ids.join(",");
    const cur = await get(`/${block.table}?id=in.(${idList})&select=id,notes`);
    const byId = new Map<number, string>(
      cur.map((r) => [r.id as number, (r.notes ?? "") as string]),
    );
    for (const id of block.ids) {
      const v = byId.get(id);
      if (v === undefined) {
        console.log(`    ! ${block.table} ${id} not found, skipping`);
        continue;
      }
      if (v === "") {
        console.log(`    = ${block.table} ${id} already empty, skipping`);
        continue;
      }
      await patch(`/${block.table}?id=eq.${id}`, { notes: "" });
      console.log(`    + ${block.table} ${id} notes reverted (was ${v.length} chars)`);
    }
  }
}

// --- B1-S7: PATCH proposal_source='agent_curated' on 3 confirmed rows ---

const PROPOSAL_SOURCE_PATCHES: {
  id: number;
  handoff_id: number;
  process_id: number;
}[] = [
  { id: 48, handoff_id: 12, process_id: 219 },
  { id: 49, handoff_id: 400, process_id: 219 },
  { id: 115, handoff_id: 27, process_id: 1324 },
];

async function confirmAgentCurated() {
  console.log("\n=== B1-S7: PATCH handoff_processes.proposal_source -> 'agent_curated' (3 confirmations) ===");
  for (const r of PROPOSAL_SOURCE_PATCHES) {
    const cur = await get(
      `/handoff_processes?id=eq.${r.id}&select=id,handoff_id,process_id,proposal_source`,
    );
    if (cur.length !== 1) {
      console.log(`  ! handoff_processes ${r.id} not found, skipping`);
      continue;
    }
    if (cur[0].handoff_id !== r.handoff_id || cur[0].process_id !== r.process_id) {
      console.log(
        `  ! handoff_processes ${r.id} mismatch (live h=${cur[0].handoff_id} p=${cur[0].process_id}; expected h=${r.handoff_id} p=${r.process_id}), skipping`,
      );
      continue;
    }
    if (cur[0].proposal_source === "agent_curated") {
      console.log(`  = handoff_processes ${r.id} already agent_curated, skipping`);
      continue;
    }
    await patch(`/handoff_processes?id=eq.${r.id}`, {
      proposal_source: "agent_curated",
    });
    console.log(
      `  + handoff_processes ${r.id} (h=${r.handoff_id} p=${r.process_id}): '${cur[0].proposal_source}' -> 'agent_curated'`,
    );
  }
}

async function postflight() {
  console.log("\n=== Post-flight ===");
  const ev = await get(
    `/trigger_events?id=in.(384,385,386,387,388)&select=id,event_name,event_category&order=id`,
  );
  console.log("  trigger_events:");
  for (const r of ev) {
    console.log(`    ${r.id} ${r.event_name}: event_category='${r.event_category}'`);
  }
  const hp = await get(
    `/handoff_processes?id=in.(48,49,115)&select=id,handoff_id,process_id,proposal_source&order=id`,
  );
  console.log("  handoff_processes:");
  for (const r of hp) {
    console.log(
      `    ${r.id} h=${r.handoff_id} p=${r.process_id} proposal_source='${r.proposal_source}'`,
    );
  }
  // Spot-check notes reverts:
  for (const block of NOTES_REVERTS) {
    const idList = block.ids.join(",");
    const cur = await get(
      `/${block.table}?id=in.(${idList})&notes=neq.&select=id`,
    );
    if (cur.length === 0) {
      console.log(`  ${block.table}: all ${block.ids.length} notes empty (clean)`);
    } else {
      console.log(
        `  ! ${block.table}: ${cur.length} rows still non-empty: ${cur.map((r) => r.id).join(",")}`,
      );
    }
  }
}

async function main() {
  console.log("SWP B1 technical fixes (2026-05-31 continuation)");
  console.log("=================================================");
  await fixTriggerEvents();
  await revertNotes();
  await confirmAgentCurated();
  await postflight();
  console.log("\nDone.");
  console.log("  UI: https://tests.semantius.app/domain_map/trigger_events");
  console.log("  UI: https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
