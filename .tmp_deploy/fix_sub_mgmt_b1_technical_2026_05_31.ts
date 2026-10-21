/**
 * SUB-MGMT B1 technical fixes (2026-05-31 continuation pass).
 *
 * Applies only deterministic, technical residual B1 fixes per the
 * audit-time instruction set. In scope:
 *
 *   - B1-S1: PATCH 14 SUB-MGMT outbound handoffs (ids 64, 65, 72, 194, 195,
 *     196, 197, 490, 491, 492, 493, 494, 495, 496) to populate
 *     source_domain_module_id. Each row's source module is derived from
 *     the trigger_events.data_object_id mapped onto the unique SUB-MGMT
 *     module that masters that data_object.
 *   - B1-S1b: PATCH inbound handoff 63 (CLM-REPOSITORY -> SUB-MGMT) to
 *     populate target_domain_module_id. Derived from the payload
 *     data_object_id (106, customer_subscriptions -> module 167).
 *     Handoff 519 (payload legal_contracts, DO 66) is NOT derivable from
 *     an existing SUB-MGMT module and is deferred.
 *   - B1-S2: PATCH 7 SUB-MGMT trigger_events (ids 492, 493, 494, 495, 496,
 *     541, 542) to set event_category per Rule #13 enum vocabulary.
 *
 * Out of scope for this residual pass (deferred):
 *   - B1-S3 (usage_records lifecycle authoring): gated on B2-S1.
 *   - B1-S4 (6 new intra-domain handoff rows): handoff inserts are not in
 *     the TECHNICAL apply scope.
 *   - B1-S5 (Phase E permissions / roles load): full Phase E load.
 *   - B1-S6 (Phase F system skills + skill_tools load): full Phase F load.
 *   - B1-H1 (29 APQC handoff_processes tags): no pre-specified PCF row
 *     IDs in the audit; PCF resolution is a fix-time lookup with judgment
 *     calls (REPLACE vs CONFIRM) the technical pass cannot make.
 *   - B1-S1b handoff 519 target_domain_module_id: payload DO 66 not
 *     mastered in any SUB-MGMT module; editorial pre-specification only.
 *
 * Run from project root: bun run .tmp_deploy/fix_sub_mgmt_b1_technical_2026_05_31.ts
 */

const SUB_MGMT_DOMAIN_ID = 97;
const MODULE_SUBSCRIPTIONS = 167;
const MODULE_BILLING = 168;

const ROLE_RANK: Record<string, number> = {
  master: 0,
  embedded_master: 1,
  contributor: 2,
  consumer: 3,
  derived: 4,
};

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`  semantius failed (${code}): ${stderr.trim() || stdout.trim()}`);
    return { ok: false, data: null, status: code };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0 };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed`);
  return r.data;
}

function strongest<T extends { role: string }>(rows: T[]): T[] {
  if (rows.length === 0) return [];
  const minRank = Math.min(...rows.map((r) => ROLE_RANK[r.role] ?? 99));
  return rows.filter((r) => (ROLE_RANK[r.role] ?? 99) === minRank);
}

type Handoff = {
  id: number;
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id: number | null;
  target_domain_module_id: number | null;
  trigger_event_id: number;
  data_object_id: number;
  trigger_events: { event_name: string; data_object_id: number } | null;
};

type ModuleRow = { id: number; domain_id: number | null; domain_module_code: string };
type DMDORow = { domain_module_id: number; data_object_id: number; role: string };

const OUTBOUND_IDS = [64, 65, 72, 194, 195, 196, 197, 490, 491, 492, 493, 494, 495, 496];
const INBOUND_DERIVABLE_IDS = [63]; // 519 deferred (legal_contracts not mastered in SUB-MGMT)

// B1-S2 trigger_event event_category backfills (Rule #13 enums).
const EVENT_CATEGORY_PATCHES: { id: number; event_name: string; event_category: string; rationale: string }[] = [
  { id: 492, event_name: "customer_invoice.issued", event_category: "state_change", rationale: "invoice transitions draft -> issued" },
  { id: 493, event_name: "customer_invoice.paid", event_category: "state_change", rationale: "invoice transitions issued -> paid" },
  { id: 494, event_name: "customer_invoice.past_due", event_category: "state_change", rationale: "invoice transitions issued -> past_due" },
  { id: 495, event_name: "usage_record.posted", event_category: "lifecycle", rationale: "usage_record is born when posted (creation lifecycle event)" },
  { id: 496, event_name: "usage_record.overage_detected", event_category: "threshold", rationale: "metered overage threshold crossed" },
  { id: 541, event_name: "subscription.upgraded", event_category: "state_change", rationale: "subscription plan state changed" },
  { id: 542, event_name: "subscription.cancelled", event_category: "state_change", rationale: "subscription transitions active/past_due -> cancelled" },
];

async function main() {
  console.log("SUB-MGMT B1 technical residual pass (2026-05-31)");
  console.log("=================================================\n");

  // ------------------------------------------------------------------
  // Step 1: pull SUB-MGMT modules + DMDOs for deterministic derivation
  // ------------------------------------------------------------------
  console.log("Step 1: pull SUB-MGMT modules + DMDOs");
  const modules: ModuleRow[] = await get(
    `/domain_modules?domain_id=eq.${SUB_MGMT_DOMAIN_ID}&select=id,domain_id,domain_module_code`
  );
  const modulesById = new Map<number, ModuleRow>(modules.map((m) => [m.id, m]));
  console.log(`  ${modules.length} SUB-MGMT modules: ${modules.map((m) => `${m.id}=${m.domain_module_code}`).join(", ")}`);

  const subMgmtModuleIds = modules.map((m) => m.id);
  const dmdoRows: DMDORow[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${subMgmtModuleIds.join(",")})&select=domain_module_id,data_object_id,role`
  );
  console.log(`  ${dmdoRows.length} SUB-MGMT DMDO rows\n`);

  type Candidate = { module: ModuleRow; role: string };
  const candidatesByDo = new Map<number, Candidate[]>();
  for (const r of dmdoRows) {
    const m = modulesById.get(r.domain_module_id);
    if (!m) continue;
    if (!candidatesByDo.has(r.data_object_id)) candidatesByDo.set(r.data_object_id, []);
    candidatesByDo.get(r.data_object_id)!.push({ module: m, role: r.role });
  }

  function deriveSubMgmtModule(dataObjectId: number): { moduleId: number | null; reason: string } {
    const cands = candidatesByDo.get(dataObjectId) ?? [];
    if (cands.length === 0) return { moduleId: null, reason: `no SUB-MGMT module holds data_object ${dataObjectId}` };
    const top = strongest(cands);
    if (top.length === 1) return { moduleId: top[0].module.id, reason: `${top[0].role} on data_object ${dataObjectId}` };
    return {
      moduleId: null,
      reason: `tie: ${top.length} SUB-MGMT modules at role ${top[0].role} (${top.map((c) => c.module.domain_module_code).join(", ")})`,
    };
  }

  // ------------------------------------------------------------------
  // Step 2: B1-S1 outbound handoffs source_domain_module_id PATCHes
  // ------------------------------------------------------------------
  console.log("Step 2: B1-S1 outbound source_domain_module_id PATCHes");
  const outbound: Handoff[] = await get(
    `/handoffs?id=in.(${OUTBOUND_IDS.join(",")})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,trigger_events(event_name,data_object_id)`
  );

  type FixRow = {
    handoff_id: number;
    column: "source_domain_module_id" | "target_domain_module_id";
    newValue: number | null;
    reason: string;
    eventName: string;
  };
  const sourceFixes: FixRow[] = [];
  for (const h of outbound) {
    if (h.source_domain_module_id !== null) {
      console.log(`  handoff ${h.id} already has source_domain_module_id=${h.source_domain_module_id}, skipping`);
      continue;
    }
    const eventDoId = h.trigger_events?.data_object_id;
    if (!eventDoId) {
      sourceFixes.push({
        handoff_id: h.id,
        column: "source_domain_module_id",
        newValue: null,
        reason: "trigger_event missing data_object_id",
        eventName: h.trigger_events?.event_name ?? "?",
      });
      continue;
    }
    const d = deriveSubMgmtModule(eventDoId);
    sourceFixes.push({
      handoff_id: h.id,
      column: "source_domain_module_id",
      newValue: d.moduleId,
      reason: `event DO ${eventDoId}: ${d.reason}`,
      eventName: h.trigger_events?.event_name ?? "?",
    });
  }

  // ------------------------------------------------------------------
  // Step 3: B1-S1b inbound handoff 63 target_domain_module_id
  // ------------------------------------------------------------------
  console.log("\nStep 3: B1-S1b inbound target_domain_module_id PATCHes (derivable subset)");
  const inbound: Handoff[] = await get(
    `/handoffs?id=in.(${INBOUND_DERIVABLE_IDS.join(",")})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,trigger_events(event_name,data_object_id)`
  );
  const targetFixes: FixRow[] = [];
  for (const h of inbound) {
    if (h.target_domain_module_id !== null) {
      console.log(`  handoff ${h.id} already has target_domain_module_id=${h.target_domain_module_id}, skipping`);
      continue;
    }
    const d = deriveSubMgmtModule(h.data_object_id);
    targetFixes.push({
      handoff_id: h.id,
      column: "target_domain_module_id",
      newValue: d.moduleId,
      reason: `payload DO ${h.data_object_id}: ${d.reason}`,
      eventName: h.trigger_events?.event_name ?? "?",
    });
  }

  const allHandoffFixes = [...sourceFixes, ...targetFixes];
  const settable = allHandoffFixes.filter((d) => d.newValue !== null);
  const ambiguous = allHandoffFixes.filter((d) => d.newValue === null);
  console.log(`\n  ${allHandoffFixes.length} handoff decisions: ${settable.length} settable, ${ambiguous.length} ambiguous`);

  if (settable.length > 0) {
    console.log("\n  Settable PATCHes:");
    for (const d of settable) {
      const mod = modulesById.get(d.newValue!);
      console.log(`    handoff ${d.handoff_id} (${d.eventName}): ${d.column} = ${d.newValue} (${mod?.domain_module_code ?? "?"}) [${d.reason}]`);
    }
  }
  if (ambiguous.length > 0) {
    console.log("\n  Ambiguous (left NULL, surface for follow-up):");
    for (const d of ambiguous) {
      console.log(`    handoff ${d.handoff_id} (${d.eventName}): ${d.column} - ${d.reason}`);
    }
  }

  // ------------------------------------------------------------------
  // Step 4: apply handoff PATCHes
  // ------------------------------------------------------------------
  console.log("\nStep 4: apply handoff PATCHes");
  let appliedHandoffs = 0;
  for (const d of settable) {
    const body: any = {};
    body[d.column] = d.newValue;
    await patch(`/handoffs?id=eq.${d.handoff_id}`, body);
    appliedHandoffs++;
  }
  console.log(`  applied ${appliedHandoffs} handoff PATCHes`);

  // ------------------------------------------------------------------
  // Step 5: B1-S2 trigger_events event_category PATCHes
  // ------------------------------------------------------------------
  console.log("\nStep 5: B1-S2 trigger_events event_category PATCHes");
  const teRows = await get(
    `/trigger_events?id=in.(${EVENT_CATEGORY_PATCHES.map((p) => p.id).join(",")})&select=id,event_name,event_category`
  );
  const teById = new Map<number, { id: number; event_name: string; event_category: string }>(
    teRows.map((r: any) => [r.id, r])
  );

  let appliedEvents = 0;
  for (const p of EVENT_CATEGORY_PATCHES) {
    const existing = teById.get(p.id);
    if (!existing) {
      console.log(`  trigger_event ${p.id} (${p.event_name}) NOT FOUND, skipping`);
      continue;
    }
    if (existing.event_category && existing.event_category !== "") {
      console.log(`  trigger_event ${p.id} (${p.event_name}) already set to '${existing.event_category}', skipping`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.event_category });
    console.log(`  trigger_event ${p.id} (${p.event_name}): event_category = '${p.event_category}' [${p.rationale}]`);
    appliedEvents++;
  }
  console.log(`  applied ${appliedEvents} event_category PATCHes`);

  // ------------------------------------------------------------------
  // Step 6: post-fix audit
  // ------------------------------------------------------------------
  console.log("\nStep 6: post-fix audit");

  const remainingOutbound = await get(
    `/handoffs?id=in.(${OUTBOUND_IDS.join(",")})&source_domain_module_id=is.null&select=id,trigger_events(event_name)`
  );
  if (remainingOutbound.length === 0) {
    console.log(`  zero outbound NULL source_domain_module_id remaining on the 14 targeted rows`);
  } else {
    console.log(`  ${remainingOutbound.length} outbound NULL remain: ${remainingOutbound.map((r: any) => `${r.id}(${r.trigger_events?.event_name})`).join(", ")}`);
  }

  const remainingInbound = await get(
    `/handoffs?id=in.(${INBOUND_DERIVABLE_IDS.join(",")})&target_domain_module_id=is.null&select=id,trigger_events(event_name)`
  );
  if (remainingInbound.length === 0) {
    console.log(`  zero inbound NULL target_domain_module_id remaining on the derivable subset`);
  } else {
    console.log(`  ${remainingInbound.length} inbound NULL remain: ${remainingInbound.map((r: any) => `${r.id}(${r.trigger_events?.event_name})`).join(", ")}`);
  }

  const remainingEvents = await get(
    `/trigger_events?id=in.(${EVENT_CATEGORY_PATCHES.map((p) => p.id).join(",")})&event_category=eq.&select=id,event_name`
  );
  if (remainingEvents.length === 0) {
    console.log(`  zero empty event_category remaining on the 7 targeted trigger_events`);
  } else {
    console.log(`  ${remainingEvents.length} trigger_events still empty: ${remainingEvents.map((r: any) => `${r.id}(${r.event_name})`).join(", ")}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
