#!/usr/bin/env bun
/**
 * B2C-COMM B1 technical fixes per audits/B2C-COMM.md (2026-05-30 audit).
 *
 * Applies only the truly-technical, audit-pre-specified items:
 *
 *   1. B1-S1 domains.business_logic em-dash sanitize (Rule from CLAUDE.md)
 *      PATCH domain id 71 to replace U+2014 between "service" and "the runtime"
 *      with a colon, per the audit's quoted target wording.
 *
 *   2. B1-S5 trigger_events.event_category backfill
 *      PATCH 9 trigger_events (ids 506..514) per audit B1-S5 mapping.
 *
 *   3. B1-S12 skill_tools.notes Rule #15 revert
 *      PATCH 4 skill_tools rows (ids 314, 315, 316, 317; skill_id=24) to
 *      notes='' per Rule #15 default. The audit (B1-S12 + B2-S2) lists the
 *      exact tool names; rows resolved by skill_id=24 + tool_id. The text
 *      currently populated matches the "channel-justification prose on
 *      skill_tools rows" forbidden pattern.
 *
 *   4. B1-H1 APQC handoff_processes
 *      INSERT only the (handoff_id, process_id) pairs where the audit
 *      pre-specifies a confident PCF AND the PCF resolves uniquely in the
 *      live processes table.
 *        - 323 -> 150 (Manage sales orders)
 *        - 324 -> 132 (Design and manage customer loyalty program)
 *        - 498 -> 132 (same; LOYALTY -> B2C-COMM redemption_transaction)
 *      Other B1-H1 candidates name PCF activities not present in the live
 *      catalog under the audit's hint name (Process customer credits,
 *      Manage marketing content, Manage product master data, Develop and
 *      manage marketing campaigns, Issue customer credit, Process customer
 *      orders, Manage customer service requests). Those are deferred; the
 *      audit-named PCF row is not resolvable to a single live row.
 *
 * Items deliberately deferred (out of scope for this technical pass):
 *   - B1-S2 (3-4 new domain_modules + DMDOs) -- new entities, judgment;
 *     gated on user B2-S5 / B2-S6 module-shape decision.
 *   - B1-S3 (intra-domain master-to-master data_object_relationships) --
 *     audit names the chain but not the (verb, inverse_verb, cardinality,
 *     kind, owner_side, is_required) tuples.
 *   - B1-S4 (users edges) -- Rule #10; audit names actor mappings but not
 *     exact verb/cardinality tuples.
 *   - B1-S6 (data_object_aliases bulk) -- audit lists tuples but Rule #18
 *     compliant rows still need alias_type / is_preferred per row, which
 *     the audit does not pre-specify; defer per Rule #15-style discipline.
 *   - B1-S7 (lifecycle states) -- judgment, "decide" shape, user picks.
 *   - B1-S8 / B1-S9 (B10b handoff module FK backfill) -- gated on B1-S2.
 *   - B1-S10 (legacy skill 24 retirement) -- sequenced after B1-S2.
 *   - B1-S11 (send_email -> notify_person) -- sequenced after B1-S2/S10.
 *   - B2-S1 / B2-S3 / B2-S4 / B2-S5 / B2-S6 -- Bucket 2 judgment.
 *   - B3-* candidates -- Phase 0 speculative.
 *   - Refinements of existing handoff_processes (the audit's "refine" hint
 *     on 80, 329, 505) -- DELETE+INSERT is judgment.
 *
 * Idempotent: each step reads existing state before writing.
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_b2c_comm_b1_technical_2026_05_31.ts
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row, opts: { single?: boolean } = {}): Promise<any> {
  const args = ["semantius"];
  if (opts.single) args.push("--single");
  args.push("call", "crud", tool);
  const proc = Bun.spawn(args, { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    if (opts.single && code === 1) return null;
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// --- B1-S1: domains.business_logic em-dash sanitize ---------------------

const B2C_COMM_DOMAIN_ID = 71;
const TARGET_BUSINESS_LOGIC =
  "Cart, promotion engine, search/merchandising ranking, and inventory-availability service: the runtime an e-commerce site depends on.";

async function fixEmDash() {
  console.log("\n=== B1-S1: domains.business_logic em-dash sanitize ===");
  const rows = await get(
    `/domains?id=eq.${B2C_COMM_DOMAIN_ID}&select=id,domain_code,business_logic`,
  );
  if (!rows.length) throw new Error(`domain id ${B2C_COMM_DOMAIN_ID} not found`);
  const cur = String(rows[0].business_logic ?? "");
  if (cur === TARGET_BUSINESS_LOGIC) {
    console.log(`  = id=${B2C_COMM_DOMAIN_ID}: already sanitized, skipping`);
    return;
  }
  if (cur.includes("—")) {
    const res = await patch(`/domains?id=eq.${B2C_COMM_DOMAIN_ID}`, {
      business_logic: TARGET_BUSINESS_LOGIC,
    });
    console.log(`  + id=${B2C_COMM_DOMAIN_ID}: em-dash replaced (rows: ${res.length})`);
  } else {
    console.log(
      `  ! id=${B2C_COMM_DOMAIN_ID}: no em-dash present and text != target; surfacing for user. Current: ${cur}`,
    );
  }
}

// --- B1-S5: trigger_events.event_category backfill ----------------------

// id -> event_category. From audits/B2C-COMM.md B1-S5.
const TRIGGER_EVENT_CATEGORIES: Record<number, "lifecycle" | "state_change"> = {
  506: "state_change", // order_line.added
  507: "lifecycle",    // commerce_product.published
  508: "state_change", // commerce_product.discontinued
  509: "state_change", // commerce_product.price_changed
  510: "lifecycle",    // fulfillment.created
  511: "state_change", // fulfillment.shipped
  512: "state_change", // fulfillment.delivered
  513: "lifecycle",    // coupon.issued
  514: "state_change", // coupon.redeemed
};

async function backfillTriggerEventCategories() {
  console.log("\n=== B1-S5: trigger_events.event_category backfill ===");
  const ids = Object.keys(TRIGGER_EVENT_CATEGORIES).map(Number);
  const live = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`,
  );
  const byId = new Map<number, { event_name: string; event_category: string }>();
  for (const r of live) {
    byId.set(Number(r.id), {
      event_name: String(r.event_name),
      event_category: String(r.event_category ?? ""),
    });
  }

  let patched = 0;
  let skipped = 0;
  for (const id of ids) {
    const cur = byId.get(id);
    if (!cur) throw new Error(`trigger_events row ${id} not found in live catalog`);
    const target = TRIGGER_EVENT_CATEGORIES[id];
    if (cur.event_category === target) {
      console.log(`  = ${id} ${cur.event_name}: already ${target}, skipping`);
      skipped++;
      continue;
    }
    if (cur.event_category && cur.event_category !== target) {
      console.log(
        `  ! ${id} ${cur.event_name}: existing event_category="${cur.event_category}" does not match target "${target}". Skipping; surface to user.`,
      );
      skipped++;
      continue;
    }
    const res = await patch(`/trigger_events?id=eq.${id}`, { event_category: target });
    console.log(`  + ${id} ${cur.event_name}: '' -> '${target}' (rows: ${res.length})`);
    patched++;
  }
  console.log(`  trigger_events: patched=${patched}, skipped=${skipped}`);
}

// --- B1-S12: skill_tools.notes Rule #15 revert --------------------------

// Audit B1-S12 names skill_id=24 + 4 tools by name. Verified live: ids
// 314 (execute_payment), 315 (send_email), 316 (query_customers),
// 317 (query_customer_subscriptions) -- all carry channel-justification
// prose or restated cardinality text that matches the Rule #15 forbidden
// patterns. Per Rule #15 default the audit specifies revert to ''.
const SKILL_TOOLS_NOTES_REVERT_IDS = [314, 315, 316, 317] as const;

async function revertSkillToolsNotes() {
  console.log("\n=== B1-S12: skill_tools.notes Rule #15 revert ===");
  const live = await get(
    `/skill_tools?id=in.(${SKILL_TOOLS_NOTES_REVERT_IDS.join(",")})&select=id,skill_id,tool_id,notes,tools(tool_name)`,
  );
  let patched = 0;
  let skipped = 0;
  for (const r of live) {
    const cur = String(r.notes ?? "");
    const toolName = String(r.tools?.tool_name ?? "?");
    if (Number(r.skill_id) !== 24) {
      console.log(`  ! id=${r.id} ${toolName}: skill_id != 24 (${r.skill_id}); skipping`);
      skipped++;
      continue;
    }
    if (cur === "") {
      console.log(`  = id=${r.id} ${toolName}: already empty, skipping`);
      skipped++;
      continue;
    }
    const res = await patch(`/skill_tools?id=eq.${r.id}`, { notes: "" });
    console.log(`  + id=${r.id} ${toolName}: notes reverted to '' (rows: ${res.length}, was: ${JSON.stringify(cur)})`);
    patched++;
  }
  console.log(`  skill_tools.notes: patched=${patched}, skipped=${skipped}`);
}

// --- B1-H1: handoff_processes INSERTs (resolvable PCF only) -------------

type HpPair = { handoff_id: number; process_id: number; rationale: string };
const HANDOFF_PROCESSES_INSERTS: HpPair[] = [
  { handoff_id: 323, process_id: 150, rationale: "Manage sales orders (B2C-COMM -> CRM commerce_order.placed)" },
  { handoff_id: 324, process_id: 132, rationale: "Design and manage customer loyalty program (B2C-COMM -> LOYALTY commerce_order.placed)" },
  { handoff_id: 498, process_id: 132, rationale: "Design and manage customer loyalty program (LOYALTY -> B2C-COMM redemption_transaction.completed)" },
];

async function insertHandoffProcesses() {
  console.log("\n=== B1-H1: handoff_processes INSERTs ===");
  // Pre-flight: verify each handoff and each process exist live.
  const handoffIds = HANDOFF_PROCESSES_INSERTS.map((p) => p.handoff_id);
  const processIds = HANDOFF_PROCESSES_INSERTS.map((p) => p.process_id);
  const handoffs = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id`,
  );
  const processes = await get(
    `/processes?id=in.(${[...new Set(processIds)].join(",")})&select=id,process_code,process_name`,
  );
  const liveHandoffIds = new Set(handoffs.map((r: any) => Number(r.id)));
  const liveProcessIds = new Set(processes.map((r: any) => Number(r.id)));
  for (const p of HANDOFF_PROCESSES_INSERTS) {
    if (!liveHandoffIds.has(p.handoff_id)) {
      throw new Error(`handoff_id ${p.handoff_id} not in live catalog`);
    }
    if (!liveProcessIds.has(p.process_id)) {
      throw new Error(`process_id ${p.process_id} not in live catalog`);
    }
  }

  // Existence-of-key skip: pull existing pairs for this set of handoffs.
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id`,
  );
  const existingKeys = new Set(
    existing.map((r: any) => `${r.handoff_id}.${r.process_id}`),
  );

  const toInsert: Row[] = [];
  for (const p of HANDOFF_PROCESSES_INSERTS) {
    const key = `${p.handoff_id}.${p.process_id}`;
    if (existingKeys.has(key)) {
      console.log(`  = ${key}: already linked, skipping (${p.rationale})`);
      continue;
    }
    toInsert.push({
      handoff_id: p.handoff_id,
      process_id: p.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted to take column default 'new' per Rule #1.
    });
    console.log(`  + queued ${key}: ${p.rationale}`);
  }

  if (!toInsert.length) {
    console.log(`  handoff_processes: nothing to insert`);
    return;
  }

  const res = await post("/handoff_processes", toInsert);
  console.log(`  handoff_processes: inserted ${res.length} rows`);
}

// --- Orchestrate --------------------------------------------------------

async function main() {
  console.log(`B2C-COMM B1 technical fixes (residual) -- starting`);
  await fixEmDash();
  await backfillTriggerEventCategories();
  await revertSkillToolsNotes();
  await insertHandoffProcesses();
  console.log(`\nDone.`);
}

main().catch((e) => {
  console.error(`\nFATAL: ${e?.message ?? e}`);
  process.exit(1);
});
