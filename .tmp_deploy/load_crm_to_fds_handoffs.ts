#!/usr/bin/env bun
// CRM → FDS inbound-handoff extension from pairwise reconciliation 2026-05-26.
// Loads 5 new handoff rows on CRM's side, subscribing FDS to CRM customer events.
// Idempotent: skips trigger_event_ids that already have a CRM→FDS handoff.

async function call(body: Record<string, unknown>): Promise<any[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exit = await proc.exited;
  if (exit !== 0) throw new Error(`semantius failed (exit ${exit}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (p: string) => call({ method: "GET", path: p });

const CRM = 69;
const FDS = 158;
const CRM_ACCT_MGT = 46;
const FDS_CSA_MGMT = 118;
const FDS_WHOLESALE = 122;
const CUSTOMERS = 97;

type Row = {
  trigger_event_id: number;
  target_domain_module_id: number;
  integration_pattern: string;
  friction_level: string;
  notes: string;
};

const ROWS: Row[] = [
  {
    trigger_event_id: 206, // customer.churn_confirmed
    target_domain_module_id: FDS_CSA_MGMT,
    integration_pattern: "event_stream",
    friction_level: "high",
    notes: "Leaver pattern: confirmed CRM churn triggers CSA-side cancellation (cancel future shares, prorate refunds, release the pickup slot). High friction: the going-away signal often arrives via a different channel than membership signup, and refund timing is constrained by share cycles already invoiced.",
  },
  {
    trigger_event_id: 41, // customer.signed_up
    target_domain_module_id: FDS_CSA_MGMT,
    integration_pattern: "event_stream",
    friction_level: "low",
    notes: "New CRM customer activation flows to CSA-MGMT for membership-eligibility checks and welcome-pack composition.",
  },
  {
    trigger_event_id: 163, // account.tier_changed
    target_domain_module_id: FDS_WHOLESALE,
    integration_pattern: "api_call",
    friction_level: "medium",
    notes: "Tier promotion (e.g. chef → restaurant chain → food-hub buyer) re-segments the customer in wholesale catalog/pricing tiers; FDS-WHOLESALE must re-apply contract terms and credit limits.",
  },
  {
    trigger_event_id: 169, // account_health.declined
    target_domain_module_id: FDS_CSA_MGMT,
    integration_pattern: "api_call",
    friction_level: "medium",
    notes: "Probabilistic signal becomes deterministic action: CRM health-score decline triggers CSA retention motion (proactive pickup-issue check, share-customisation reset, satisfaction outreach). Failure mode is false-positive volume on heuristic scores.",
  },
  {
    trigger_event_id: 197, // health_score.declined
    target_domain_module_id: FDS_CSA_MGMT,
    integration_pattern: "api_call",
    friction_level: "medium",
    notes: "Probabilistic signal pattern: a customer-level (vs account-level) health drop triggers CSA-side retention; same failure-mode shape as account_health.declined. Both events shipped catalog-wide and FDS subscribes to both until the two are consolidated upstream.",
  },
];

// Idempotency: skip if a CRM→FDS handoff already exists for the same trigger_event
const existing = await get(`/handoffs?source_domain_id=eq.${CRM}&target_domain_id=eq.${FDS}&select=trigger_event_id`);
const existingSet = new Set(existing.map((r: any) => Number(r.trigger_event_id)));
console.log(`existing CRM→FDS handoffs: ${existing.length}`);

const toInsert = ROWS.filter(r => !existingSet.has(r.trigger_event_id)).map(r => ({
  trigger_event_id: r.trigger_event_id,
  source_domain_id: CRM,
  source_domain_module_id: CRM_ACCT_MGT,
  target_domain_id: FDS,
  target_domain_module_id: r.target_domain_module_id,
  data_object_id: CUSTOMERS,
  integration_pattern: r.integration_pattern,
  friction_level: r.friction_level,
  notes: r.notes,
}));

if (toInsert.length === 0) {
  console.log("all 5 rows already present, nothing to do");
} else {
  console.log(`inserting ${toInsert.length} new CRM→FDS handoff rows`);
  const result = await call({ method: "POST", path: "/handoffs", body: toInsert });
  console.log(`inserted ids:`, (result as any[]).map(r => r.id));
}

// verify
const final = await get(`/handoffs?source_domain_id=eq.${CRM}&target_domain_id=eq.${FDS}&select=id,trigger_event_id,source_domain_module_id,target_domain_module_id,friction_level,trigger_events(event_name)`);
console.log(`\nFinal CRM→FDS handoffs (${final.length}):`);
for (const h of final as any[]) {
  console.log(`  id=${h.id} ${h.trigger_events.event_name} src=${h.source_domain_module_id} tgt=${h.target_domain_module_id} ${h.friction_level}`);
}
