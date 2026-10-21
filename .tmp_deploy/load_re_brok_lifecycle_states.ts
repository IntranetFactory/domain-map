#!/usr/bin/env bun
// load_re_brok_lifecycle_states.ts - RE-BROKERAGE Phase B12
//
// Loads data_object_lifecycle_states for the 5 RE-BROK masters. Required by
// Rule #12 for every master+required data_object with a real workflow.
// Workflow-gate states (requires_permission=true) materialize into module-
// scoped permissions of shape <module-code>:<verb> via the realizing module's
// domain_module_id.
//
// Per-master state machines (28 rows total, 20 workflow gates):
//
//   real_estate_listings (id 352, in AGENT-OPS 151): 6 states, 4 gates
//     draft -> active -> under_contract -> sold
//                                        -> withdrawn (terminal)
//                                        -> expired (terminal)
//
//   tour_appointments (id 355, in AGENT-OPS 151): 5 states, 3 gates
//     scheduled -> confirmed -> completed (terminal)
//                            -> cancelled (terminal)
//                            -> no_show (terminal)
//
//   real_estate_transactions (id 353, AGENT-OPS+BROKERAGE-OPS): 8 states, 6 gates
//     opened -> inspection -> financing -> contingencies_cleared
//            -> compliance_review (BROKERAGE-OPS) -> cleared_to_close (BROKERAGE-OPS)
//            -> closed (terminal)
//            -> cancelled (terminal)
//
//   disclosure_documents (id 356, in AGENT-OPS 151): 4 states, 2 gates
//     drafted -> delivered -> acknowledged (terminal)
//                          -> rejected (terminal)
//
//   commission_splits (id 354, in BROKERAGE-OPS 152): 5 states, 4 gates
//     calculated -> reviewed -> approved -> paid (terminal)
//                            -> disputed (gate, can re-enter reviewed)
//
// Idempotent on (data_object_id, state_name).
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_re_brok_lifecycle_states.ts

export {};

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
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
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

// Module IDs from the Phase-M load
const AGENT_OPS = 151;
const BROKERAGE_OPS = 152;

type StateSpec = {
  state_name: string;
  state_order: number;
  description: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  domain_module_id?: number | null;
};

type MasterSpec = {
  data_object_name: string;
  states: StateSpec[];
};

const masters: MasterSpec[] = [
  {
    data_object_name: "real_estate_listings",
    states: [
      { state_name: "draft", state_order: 1, is_initial: true,
        description: "Listing is being prepared (photos, copy, pricing); not yet published to MLS." },
      { state_name: "active", state_order: 2, requires_permission: true, permission_verb_override: "activate_listing", domain_module_id: AGENT_OPS,
        description: "Listing is published to the MLS and accepting offers." },
      { state_name: "under_contract", state_order: 3, requires_permission: true, permission_verb_override: "mark_under_contract", domain_module_id: AGENT_OPS,
        description: "Offer accepted; a real_estate_transaction has been opened. Listing remains visible on MLS as 'pending' but not accepting new offers." },
      { state_name: "sold", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "close_listing", domain_module_id: AGENT_OPS,
        description: "Transaction closed; listing terminated as a sale. Triggers downstream events to property-management, CRE, and investment systems." },
      { state_name: "withdrawn", state_order: 5, is_terminal: true, requires_permission: true, permission_verb_override: "withdraw_listing", domain_module_id: AGENT_OPS,
        description: "Listing pulled from the market without a sale (seller decision, expired listing agreement before contract, market reasons)." },
      { state_name: "expired", state_order: 6, is_terminal: true,
        description: "Listing agreement reached its end date without a sale or active renewal. No explicit user action; system marks at expiration." },
    ],
  },
  {
    data_object_name: "tour_appointments",
    states: [
      { state_name: "scheduled", state_order: 1, is_initial: true,
        description: "Tour booked with prospect; access arrangements (lockbox code, listing-agent attendance) pending confirmation." },
      { state_name: "confirmed", state_order: 2, requires_permission: true, permission_verb_override: "confirm_tour", domain_module_id: AGENT_OPS,
        description: "Prospect confirmed attendance; access arrangements finalized." },
      { state_name: "completed", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "complete_tour", domain_module_id: AGENT_OPS,
        description: "Tour took place; agent recorded notes and any buyer-feedback signals." },
      { state_name: "cancelled", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "cancel_tour", domain_module_id: AGENT_OPS,
        description: "Tour cancelled by either party before it took place." },
      { state_name: "no_show", state_order: 5, is_terminal: true,
        description: "Prospect did not appear at the scheduled time. No explicit cancellation; agent marks after the fact." },
    ],
  },
  {
    data_object_name: "real_estate_transactions",
    states: [
      { state_name: "opened", state_order: 1, is_initial: true,
        description: "Accepted offer created the transaction; buyer/seller, listing reference, offer price, escrow agent, target close date captured." },
      { state_name: "inspection", state_order: 2, requires_permission: true, permission_verb_override: "schedule_inspection", domain_module_id: AGENT_OPS,
        description: "Inspection period active; structural / pest / specialty inspections scheduled or in progress." },
      { state_name: "financing", state_order: 3, requires_permission: true, permission_verb_override: "submit_financing", domain_module_id: AGENT_OPS,
        description: "Buyer's loan application in underwriting; appraisal pending; financing contingency open." },
      { state_name: "contingencies_cleared", state_order: 4, requires_permission: true, permission_verb_override: "clear_contingencies", domain_module_id: AGENT_OPS,
        description: "All contingencies (inspection, financing, appraisal, title) satisfied or waived. Transaction ready for broker compliance review." },
      { state_name: "compliance_review", state_order: 5, requires_permission: true, permission_verb_override: "submit_for_compliance_review", domain_module_id: BROKERAGE_OPS,
        description: "Broker / transaction coordinator reviewing transaction file for compliance (disclosure completeness, signature audit, trust-account accounting). Only realized when BROKERAGE-OPS module is deployed." },
      { state_name: "cleared_to_close", state_order: 6, requires_permission: true, permission_verb_override: "approve_for_closing", domain_module_id: BROKERAGE_OPS,
        description: "Broker signed off; closing date and location confirmed. Only realized when BROKERAGE-OPS module is deployed." },
      { state_name: "closed", state_order: 7, is_terminal: true, requires_permission: true, permission_verb_override: "close_transaction", domain_module_id: AGENT_OPS,
        description: "Deed recorded, funds disbursed via escrow; transaction complete. Commission splits become payable; downstream domains notified." },
      { state_name: "cancelled", state_order: 8, is_terminal: true, requires_permission: true, permission_verb_override: "cancel_transaction", domain_module_id: AGENT_OPS,
        description: "Transaction fell through (failed inspection beyond repair, financing denied, mutual cancellation, contingency invocation). Listing typically returns to active." },
    ],
  },
  {
    data_object_name: "disclosure_documents",
    states: [
      { state_name: "drafted", state_order: 1, is_initial: true,
        description: "Disclosure generated from a state-specific template (agency disclosure, lead-paint, natural-hazards, transfer disclosure). Not yet delivered." },
      { state_name: "delivered", state_order: 2, requires_permission: true, permission_verb_override: "deliver_disclosure", domain_module_id: AGENT_OPS,
        description: "Disclosure sent to recipient (buyer or seller); recipient acknowledgment pending." },
      { state_name: "acknowledged", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "acknowledge_disclosure", domain_module_id: AGENT_OPS,
        description: "Recipient signed acknowledgment recorded (typically via eSign callback). Disclosure satisfies the compliance requirement on the transaction." },
      { state_name: "rejected", state_order: 4, is_terminal: true,
        description: "Recipient refused to acknowledge or signed under dispute. Typically requires the transaction to address the rejection before progressing." },
    ],
  },
  {
    data_object_name: "commission_splits",
    states: [
      { state_name: "calculated", state_order: 1, is_initial: true,
        description: "Split row auto-derived from transaction close (listing-side vs buyer-side splits, agent shares, franchise overrides). Pending review." },
      { state_name: "reviewed", state_order: 2, requires_permission: true, permission_verb_override: "review_commission_split", domain_module_id: BROKERAGE_OPS,
        description: "Broker reviewed split accuracy against the listing agreement and brokerage policy; flagged any anomalies." },
      { state_name: "disputed", state_order: 3, requires_permission: true, permission_verb_override: "dispute_commission_split", domain_module_id: BROKERAGE_OPS,
        description: "One participating agent contests the calculated split. Holds disbursement pending resolution; may return to reviewed after adjustment." },
      { state_name: "approved", state_order: 4, requires_permission: true, permission_verb_override: "approve_commission_split", domain_module_id: BROKERAGE_OPS,
        description: "Broker approved the split for payment. Ready for disbursement." },
      { state_name: "paid", state_order: 5, is_terminal: true, requires_permission: true, permission_verb_override: "disburse_commission", domain_module_id: BROKERAGE_OPS,
        description: "Commission funds disbursed to participating agents and franchise; ledger entry recorded." },
    ],
  },
];

// ============================================================
// 0. Resolve data_object IDs
// ============================================================
console.log("=== 0. Resolving data_object IDs ===");
const doNames = masters.map((m) => m.data_object_name);
const doRows: Row[] = await postgrest(
  "GET",
  `/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name`,
) ?? [];
const doId: Record<string, number> = {};
for (const r of doRows) doId[String(r.data_object_name)] = Number(r.id);
console.log(`  ${Object.keys(doId).length} of ${doNames.length} resolved`);
for (const n of doNames) if (!doId[n]) throw new Error(`Missing data_object ${n}`);

// ============================================================
// 1. Pre-read existing states (idempotency)
// ============================================================
console.log("\n=== 1. data_object_lifecycle_states ===");
const dataObjectIds = Object.values(doId);
const existing: Row[] = await postgrest(
  "GET",
  `/data_object_lifecycle_states?data_object_id=in.(${dataObjectIds.join(",")})&select=data_object_id,state_name`,
) ?? [];
const seen = new Set(existing.map((r) => `${r.data_object_id}:${r.state_name}`));

let added = 0;
let skipped = 0;
for (const m of masters) {
  const did = doId[m.data_object_name];
  for (const s of m.states) {
    const key = `${did}:${s.state_name}`;
    if (seen.has(key)) { skipped++; continue; }
    const body: Row = {
      data_object_id: did,
      state_name: s.state_name,
      state_order: s.state_order,
      description: s.description,
      is_initial: s.is_initial ?? false,
      is_terminal: s.is_terminal ?? false,
      requires_permission: s.requires_permission ?? false,
    };
    if (s.permission_verb_override) body.permission_verb_override = s.permission_verb_override;
    if (s.domain_module_id !== undefined) body.domain_module_id = s.domain_module_id;
    await postgrest("POST", "/data_object_lifecycle_states", body);
    added++;
  }
}
console.log(`  new ${added} / recycled ${skipped}`);

// ============================================================
// 2. Verification
// ============================================================
console.log("\n=== 2. Verification ===");
let allOk = true;
for (const m of masters) {
  const did = doId[m.data_object_name];
  const rows: Row[] = await postgrest(
    "GET",
    `/data_object_lifecycle_states?data_object_id=eq.${did}&select=state_name,state_order,is_initial,is_terminal,requires_permission,permission_verb_override,domain_module_id&order=state_order.asc`,
  ) ?? [];
  const initials = rows.filter((r) => r.is_initial).length;
  const terminals = rows.filter((r) => r.is_terminal).length;
  const gates = rows.filter((r) => r.requires_permission).length;
  const ok = initials === 1 && rows.length === m.states.length;
  if (!ok) allOk = false;
  console.log(`  ${m.data_object_name.padEnd(28)}: ${rows.length} states (${initials} initial, ${terminals} terminal, ${gates} gates) ${ok ? "PASS" : "FAIL"}`);
}

// Workflow-gate permissions hint (next-step: materialization)
console.log("\n  Workflow-gate permissions to materialize per Rule #12 (next-step):");
for (const m of masters) {
  const did = doId[m.data_object_name];
  const gateRows: Row[] = await postgrest(
    "GET",
    `/data_object_lifecycle_states?data_object_id=eq.${did}&requires_permission=eq.true&select=state_name,permission_verb_override,domain_module_id`,
  ) ?? [];
  for (const g of gateRows) {
    const verb = String(g.permission_verb_override || g.state_name);
    const modCode = g.domain_module_id === AGENT_OPS ? "re-brok-agent-ops" : g.domain_module_id === BROKERAGE_OPS ? "re-brok-brokerage-ops" : "(null-module)";
    console.log(`    ${modCode}:${verb}`);
  }
}

console.log();
console.log(allOk ? "  All masters: state machines verified" : "  FAILURE - investigate");

console.log();
console.log("=== complete ===");
console.log("UI: https://tests.semantius.app/domain_map/data_object_lifecycle_states");
