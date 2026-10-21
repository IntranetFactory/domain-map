/**
 * EMP-EXP B1 technical fixes — 2026-05-31 continuation.
 *
 * Applies only the truly-technical B1 items from audits/EMP-EXP.md that the
 * agent allowlist permits without further user judgment:
 *
 * 1. B1-S5  — DELETE skill_tools (skill_id=55, tool_id=42), the wrong-primitive
 *             sign_document linkage on the EMP-EXP listening skill.
 * 2. B1-S11 — PATCH handoff 1077 notes='' (Rule #15 revert; audit names the row
 *             and the exact provenance-trailer string). Handoffs 444 and 115
 *             already have target_domain_module_id=82 in live state — no FK
 *             PATCH needed.
 * 3. B1-S13 — H1 APQC TAGGING:
 *             a) DELETE 3 wrong discovery_substring handoff_processes
 *                (handoffs 442, 115, 409 carrying market-survey / customer-
 *                journey-map PCFs).
 *             b) INSERT 11 agent_curated rows per the audit's pre-specified
 *                handoff_id + PCF external_id pairs. Skips handoff 116 (gated
 *                on B2-S4) and handoff 1107 (keep existing correct row).
 *
 * Items DEFERRED (require user judgment, new entity authoring, or are gated):
 *   - B1-S1 (zero roles), B1-S2 (F2 module 65 skill), B1-S3 (F3 thin skill_tools),
 *     B1-S4 (F7 send_email repoint, tool_id swap not on allowlist),
 *     B1-S6 (INSERT new trigger_event), B1-S7 (depends on S6),
 *     B1-S8 (surface to user), B1-S9 (INSERT new handoffs not on allowlist),
 *     B1-S10 (judgment), B1-S12 (surface to user).
 *
 * Invocation (from project root c:/dev/domain-map, NEVER cd into .tmp_deploy):
 *   bun run "c:/dev/domain-map/.tmp_deploy/fix_emp_exp_b1_technical_2026_05_31.ts"
 */

type PatchResult = { ok: boolean; status: number; body: string };

async function callPostgrest(method: string, path: string, body?: unknown): Promise<PatchResult> {
  const args = ["call", "crud", "postgrestRequest"];
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const stdinJson = JSON.stringify(payload);

  const proc = Bun.spawn(["semantius", ...args], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(stdinJson);
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exit = await proc.exited;
  const combined = (stdout + stderr).trim();
  if (combined.includes("required audience not found")) {
    console.error("JWT-AUDIENCE ERROR (verbatim, halt per Rule #6):");
    console.error(combined);
    process.exit(2);
  }
  return { ok: exit === 0, status: exit, body: combined };
}

async function main() {
  console.log("EMP-EXP B1 technical fixes (2026-05-31)");
  console.log("=".repeat(60));

  // ------------------------------------------------------------------
  // Step 1 — B1-S5: DELETE skill_tools (skill_id=55, tool_id=42).
  // ------------------------------------------------------------------
  console.log("\n[B1-S5] DELETE skill_tools (skill_id=55, tool_id=42) [sign_document]");
  const s5 = await callPostgrest(
    "DELETE",
    "/skill_tools?and=(skill_id.eq.55,tool_id.eq.42)",
  );
  console.log(`  exit=${s5.status} body=${s5.body || "<empty>"}`);

  // ------------------------------------------------------------------
  // Step 2 — B1-S11: PATCH handoff 1077 notes='' (Rule #15 revert).
  // ------------------------------------------------------------------
  console.log("\n[B1-S11] PATCH handoffs?id=eq.1077 notes=''");
  const s11 = await callPostgrest(
    "PATCH",
    "/handoffs?id=eq.1077",
    { notes: "" },
  );
  console.log(`  exit=${s11.status} body=${s11.body || "<empty>"}`);

  // ------------------------------------------------------------------
  // Step 3a — B1-S13: DELETE 3 wrong discovery_substring rows.
  // ------------------------------------------------------------------
  // Identified via live query 2026-05-31:
  //   id=150 handoff=409 process_id=1814 (Create customer journey maps)
  //   id=173 handoff=442 process_id=89   (Survey market and determine customer needs)
  //   id=174 handoff=115 process_id=89   (Survey market and determine customer needs)
  const wrongIds = [150, 173, 174];
  console.log(`\n[B1-S13 part a] DELETE 3 wrong discovery_substring handoff_processes: ${wrongIds.join(", ")}`);
  for (const id of wrongIds) {
    const r = await callPostgrest("DELETE", `/handoff_processes?id=eq.${id}`);
    console.log(`  id=${id} exit=${r.status} body=${r.body || "<empty>"}`);
  }

  // ------------------------------------------------------------------
  // Step 3b — B1-S13: INSERT 11 agent_curated rows.
  // ------------------------------------------------------------------
  // PCF external_id → processes.id resolved live 2026-05-31:
  //   16944 -> 250 (Conduct employee engagement surveys, L3)
  //   21439 -> 235 (Manage employee assistance and retention, L3)
  //   21700 -> 226 (Manage employee career development, L3)
  //   10510 -> 1048 (Review engagement and retention indicators, L4)
  //   10469 -> 224 (Manage employee onboarding, L3)
  //   10502 -> 1046 (Administer compensation and rewards to employees, L4)
  //
  // Handoffs covered (per audit B1-H1 table):
  //   442  -> 235  (EMP-EXP-CONTINUOUS-LISTEN -> HCM, survey.cycle_closed)
  //   443  -> 226  (-> TALENT-MGMT, survey_response.received)
  //   444  -> 1048 (-> PA, survey_response.received)
  //   1077 -> 1048 (EMP-EXP-ACTION-PLANNING -> PA, action_plan.completed)
  //   1078 -> 235  (-> HCM, action_plan.completed)
  //   445  -> 235  (-> WORK-MGMT, action_plan.created)
  //   1248 -> 235  (-> WORK-MGMT, action_plan.completed)
  //   115  -> 1048 (-> PA, survey.cycle_closed; replacement for deleted 174)
  //   1136 -> 1046 (COMP-MGMT -> EMP-EXP, compensation_statement.issued)
  //   409  -> 224  (ONBOARDING -> EMP-EXP, journey.day_one_reached; replaces 150)
  //   1231 -> 224  (ONBOARDING -> EMP-EXP, onboarding_stage.completed)
  //
  // Skipped: 116 (gated on B2-S4), 1107 (keep existing correct row id 86).
  const newTags: Array<{ handoff_id: number; process_id: number }> = [
    { handoff_id: 442, process_id: 235 },
    { handoff_id: 443, process_id: 226 },
    { handoff_id: 444, process_id: 1048 },
    { handoff_id: 1077, process_id: 1048 },
    { handoff_id: 1078, process_id: 235 },
    { handoff_id: 445, process_id: 235 },
    { handoff_id: 1248, process_id: 235 },
    { handoff_id: 115, process_id: 1048 },
    { handoff_id: 1136, process_id: 1046 },
    { handoff_id: 409, process_id: 224 },
    { handoff_id: 1231, process_id: 224 },
  ];
  const insertBody = newTags.map((t) => ({
    handoff_id: t.handoff_id,
    process_id: t.process_id,
    proposal_source: "agent_curated",
    // record_status defaults to 'new' per Rule #1 — omit to use DB default.
  }));
  console.log(`\n[B1-S13 part b] INSERT ${insertBody.length} agent_curated handoff_processes`);
  const ins = await callPostgrest("POST", "/handoff_processes", insertBody);
  console.log(`  exit=${ins.status} body=${ins.body || "<empty>"}`);

  // ------------------------------------------------------------------
  // Verification summary
  // ------------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("Verification re-reads:");
  const v1 = await callPostgrest(
    "GET",
    "/skill_tools?and=(skill_id.eq.55,tool_id.eq.42)&select=skill_id,tool_id",
  );
  console.log(`  skill_tools (55,42) [should be empty]: ${v1.body}`);
  const v2 = await callPostgrest(
    "GET",
    "/handoffs?id=eq.1077&select=id,notes",
  );
  console.log(`  handoffs 1077 notes [should be empty]: ${v2.body}`);
  const v3 = await callPostgrest(
    "GET",
    "/handoff_processes?handoff_id=in.(115,409,442,443,444,445,1077,1078,1107,1136,1231,1248)&select=handoff_id,process_id,proposal_source,process:processes(external_id,process_name)&order=handoff_id.asc",
  );
  console.log(`  handoff_processes for EMP-EXP handoffs:\n${v3.body}`);

  console.log("\nDone.");
  console.log("UI spot-check links:");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
  console.log("  https://tests.semantius.app/domain_map/skill_tools");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
}

await main();
