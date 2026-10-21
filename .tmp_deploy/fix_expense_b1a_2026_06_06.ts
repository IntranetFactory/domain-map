#!/usr/bin/env bun
// EXPENSE b1a execution (2026-06-06).
// Executes three agent-solvable pending actions against the live domain_map module:
//   B1A-S4: split orphan system skill 57 into 3 module-bound system skills (191/192/193)
//           and redistribute its 7 skill_tools by master ownership.
//   B1A-M8: backfill empty catalog_tagline / catalog_description on modules 191/192/193 (buyer voice).
//   B1A-A4: backfill empty catalog_tagline / catalog_description on the EXPENSE domain row (67).
//
// Idempotent: re-reads live state before each write; empty-guards every catalog UX field
// (writes only where the current value is empty); dedups skill / skill_tools inserts by natural key.
// record_status omitted on every insert (DB default 'new', Rule #1). No `notes` writes (Rule #15).

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
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const del = (path: string) => call({ method: "DELETE", path });

const EM_DASH = "—";
function assertNoEmDash(label: string, ...vals: string[]) {
  for (const v of vals) if (v.includes(EM_DASH)) throw new Error(`em-dash in ${label}: ${v}`);
}

// ============================================================
// B1A-S4 — system skill split + skill_tools redistribution
// ============================================================
// Skill 57 (orphan, domain_module_id NULL) rebinds to module 191 and its description
// is rewritten to drop the forbidden em-dash. Two new system skills land for 192 and 193.
// The 7 existing skill_tools rows redistribute by master ownership:
//   191: query_expense_reports(26), query_expense_lines(456), query_expense_policies(457), send_email(37)
//   192: query_corporate_cards(459), query_card_transactions(460), send_email(37)
//   193: query_travel_bookings(458), send_email(37)
// send_email (tool 37, side_effect channel primitive) ships on all three.

const SKILL_191_DESC =
  "System skill for the Expense Capture and Reporting module. Runs agent workflows over expense reports, expense lines, and expense policies: querying report and line state, checking lines against active policy, and notifying submitters and approvers as reports move through the approval lifecycle.";
const SKILL_192_DESC =
  "System skill for the Corporate Card Reconciliation module. Runs agent workflows over corporate cards and card transactions: querying card and transaction state, supporting the match of posted transactions to expense lines, and notifying cardholders and reconcilers during reconciliation.";
const SKILL_193_DESC =
  "System skill for the Travel Booking and Per Diem module. Runs agent workflows over travel bookings: querying booking and itinerary state and notifying travelers and approvers as bookings are reserved, confirmed, and completed.";

assertNoEmDash("skill descriptions", SKILL_191_DESC, SKILL_192_DESC, SKILL_193_DESC);

async function runS4() {
  console.log("== B1A-S4: system skill split ==");

  // --- snapshot skill 57 before PATCH ---
  const [s57] = await get(
    "/skills?id=eq.57&select=id,skill_name,skill_type,domain_id,domain_module_id,description,record_status",
  );
  console.log("PRIOR skill 57:", JSON.stringify(s57));

  // --- rebind skill 57 to module 191 + rewrite em-dash description ---
  if (s57 && (s57.domain_module_id !== 191 || String(s57.description ?? "").includes(EM_DASH))) {
    await patch("/skills?id=eq.57", { domain_module_id: 191, description: SKILL_191_DESC });
    console.log("PATCHed skill 57 -> domain_module_id=191, description rewritten");
  } else {
    console.log("skill 57 already bound to 191 with clean description; no change");
  }

  // --- create new system skills for 192 and 193 (idempotent by skill_name) ---
  const newSkills = [
    {
      skill_name: "expense_corp_card_recon_agent",
      skill_type: "system",
      domain_id: 67,
      domain_module_id: 192,
      description: SKILL_192_DESC,
    },
    {
      skill_name: "expense_travel_and_per_diem_agent",
      skill_type: "system",
      domain_id: 67,
      domain_module_id: 193,
      description: SKILL_193_DESC,
    },
  ];
  const existingSkills = await get(
    "/skills?skill_name=in.(expense_corp_card_recon_agent,expense_travel_and_per_diem_agent)&select=id,skill_name,domain_module_id",
  );
  const haveName = new Set(existingSkills.map(r => String(r.skill_name)));
  const toInsert = newSkills.filter(s => !haveName.has(s.skill_name));
  if (toInsert.length > 0) {
    const created = await post("/skills", toInsert);
    console.log(`inserted ${created.length} new system skills:`, JSON.stringify(created.map(r => ({ id: r.id, skill_name: r.skill_name, domain_module_id: r.domain_module_id }))));
  } else {
    console.log("both new system skills already present; no insert");
  }

  // --- resolve skill ids by module ---
  const allSkills = await get(
    "/skills?domain_module_id=in.(191,192,193)&skill_type=eq.system&select=id,skill_name,domain_module_id",
  );
  const skillByModule = new Map<number, number>();
  for (const r of allSkills) skillByModule.set(Number(r.domain_module_id), Number(r.id));
  const skill191 = skillByModule.get(191)!;
  const skill192 = skillByModule.get(192)!;
  const skill193 = skillByModule.get(193)!;
  if (!skill191 || !skill192 || !skill193) {
    throw new Error(`missing system skill for a module: 191=${skill191} 192=${skill192} 193=${skill193}`);
  }
  console.log(`skill ids: 191=>${skill191} 192=>${skill192} 193=>${skill193}`);

  // --- snapshot skill 57's current skill_tools before any delete ---
  const s57tools = await get(
    "/skill_tools?skill_id=eq.57&select=id,tool_id,requirement_level,tools(tool_name,data_object_id)&order=id.asc",
  );
  console.log("PRIOR skill 57 skill_tools:", JSON.stringify(s57tools.map(r => ({ id: r.id, tool_id: r.tool_id }))));

  // --- delete the 3 skill_tools that move off 191 (corp-card + travel tools) ---
  // tool 459 query_corporate_cards -> 192, 460 query_card_transactions -> 192, 458 query_travel_bookings -> 193
  const moveOffTools = new Set([459, 460, 458]);
  const toDelete = s57tools.filter(r => moveOffTools.has(Number(r.tool_id)));
  for (const r of toDelete) {
    await del(`/skill_tools?id=eq.${r.id}`);
    console.log(`DELETEd skill_tools id=${r.id} (skill 57 / tool ${r.tool_id})`);
  }

  // --- desired skill_tools per (skill, tool) ---
  // All tools already exist catalog-wide (no new tools created).
  const desired: { skill_id: number; tool_id: number; requirement_level: string }[] = [
    // 191 keeps: 26, 456, 457, 37 (already linked on skill 57)
    { skill_id: skill191, tool_id: 26, requirement_level: "required" },
    { skill_id: skill191, tool_id: 456, requirement_level: "required" },
    { skill_id: skill191, tool_id: 457, requirement_level: "required" },
    { skill_id: skill191, tool_id: 37, requirement_level: "required" },
    // 192
    { skill_id: skill192, tool_id: 459, requirement_level: "required" },
    { skill_id: skill192, tool_id: 460, requirement_level: "required" },
    { skill_id: skill192, tool_id: 37, requirement_level: "required" },
    // 193
    { skill_id: skill193, tool_id: 458, requirement_level: "required" },
    { skill_id: skill193, tool_id: 37, requirement_level: "required" },
  ];

  // --- dedup against existing (skill_id, tool_id) pairs ---
  const skillIds = [skill191, skill192, skill193];
  const existingST = await get(
    `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=id,skill_id,tool_id`,
  );
  const havePair = new Set(existingST.map(r => `${r.skill_id}|${r.tool_id}`));
  const stToInsert = desired.filter(d => !havePair.has(`${d.skill_id}|${d.tool_id}`));
  if (stToInsert.length > 0) {
    const created = await post("/skill_tools", stToInsert);
    console.log(`inserted ${created.length} new skill_tools rows`);
  } else {
    console.log("all desired skill_tools already present; no insert");
  }

  // --- verify final distribution ---
  const finalST = await get(
    `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id,tools(tool_name)&order=skill_id.asc,tool_id.asc`,
  );
  const bySkill = new Map<number, string[]>();
  for (const r of finalST) {
    const k = Number(r.skill_id);
    const arr = bySkill.get(k) ?? [];
    arr.push(String((r.tools as Row)?.tool_name));
    bySkill.set(k, arr);
  }
  console.log("FINAL skill_tools distribution:");
  for (const [sid, tools] of bySkill) console.log(`  skill ${sid}: ${tools.join(", ")}`);
}

// ============================================================
// B1A-M8 — module catalog UX backfill (empty-guard)
// ============================================================
const MODULE_UX: Record<number, { tagline: string; description: string }> = {
  191: {
    tagline:
      "Capture expenses, check them against policy, and route reports for approval without chasing paper.",
    description:
      "Submit, itemize, and report business expenses in one place. Add expense lines, attach receipts, and let each line check itself against your spending rules before it ever reaches an approver. Send completed reports up the chain for review, watch them move from draft to approved, and hand the approved amounts off cleanly for posting and reimbursement. Spend less time on data entry and reminders, and give finance a reliable, auditable record of every claim.",
  },
  192: {
    tagline:
      "Match corporate card charges to expenses and close the books on card spend with confidence.",
    description:
      "Bring every corporate card charge into one workspace and pair it with the expense it belongs to. Review posted transactions, match them to submitted expense lines, and surface the charges that still need a receipt or an explanation. Keep card programs and statements reconciled month after month, so finance can trust that recorded spend matches what actually hit the card.",
  },
  193: {
    tagline:
      "Book and track business travel and per diem in step with your expense and approval rules.",
    description:
      "Plan, reserve, and track business trips alongside the expenses they generate. Move bookings from request to confirmed and completed, apply per diem and travel rules as you go, and keep travelers and approvers informed at each step. Connect trip details to the expenses they produce so travel spend stays visible, in policy, and ready to report.",
  },
};

async function runM8() {
  console.log("== B1A-M8: module catalog UX backfill ==");
  const mods = await get(
    "/domain_modules?id=in.(191,192,193)&select=id,domain_module_code,catalog_tagline,catalog_description&order=id.asc",
  );
  for (const m of mods) {
    const id = Number(m.id);
    const copy = MODULE_UX[id];
    if (!copy) continue;
    assertNoEmDash(`module ${id}`, copy.tagline, copy.description);
    const body: Row = {};
    if (String(m.catalog_tagline ?? "") === "") body.catalog_tagline = copy.tagline;
    if (String(m.catalog_description ?? "") === "") body.catalog_description = copy.description;
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${id}`, body);
      console.log(`PATCHed module ${id} (${m.domain_module_code}): wrote [${Object.keys(body).join(", ")}]`);
    } else {
      console.log(`module ${id} (${m.domain_module_code}): both fields already non-empty; skipped (overwrite-protected)`);
    }
  }
}

// ============================================================
// B1A-A4 — domain catalog UX backfill (empty-guard)
// ============================================================
const DOMAIN_UX = {
  tagline:
    "Turn employee spending into clean, policy-checked, reimbursable records from receipt to repayment.",
  description:
    "Manage the full life of a business expense, from the moment money is spent to the moment it is reimbursed. Capture receipts and card charges, itemize them into reports, and check every line against your spending policy before it reaches an approver. Route reports for review, reconcile corporate card activity, and handle travel and per diem alongside everyday expenses. When a report is approved, the right amounts flow on for posting and repayment. Give employees a fast, simple way to get paid back, and give finance a trustworthy, audit-ready picture of where the money went.",
};

async function runA4() {
  console.log("== B1A-A4: domain catalog UX backfill ==");
  assertNoEmDash("domain 67", DOMAIN_UX.tagline, DOMAIN_UX.description);
  const [d] = await get("/domains?id=eq.67&select=id,domain_code,catalog_tagline,catalog_description");
  const body: Row = {};
  if (String(d.catalog_tagline ?? "") === "") body.catalog_tagline = DOMAIN_UX.tagline;
  if (String(d.catalog_description ?? "") === "") body.catalog_description = DOMAIN_UX.description;
  if (Object.keys(body).length > 0) {
    await patch("/domains?id=eq.67", body);
    console.log(`PATCHed domain 67 (EXPENSE): wrote [${Object.keys(body).join(", ")}]`);
  } else {
    console.log("domain 67: both fields already non-empty; skipped (overwrite-protected)");
  }
}

// ============================================================
async function main() {
  await runS4();
  await runM8();
  await runA4();
  console.log("\nDONE.");
}
await main();
