// P1.5b — Finance cluster handoff backfill (high-friction cross-cluster gaps + 8 new events).
// Idempotent: re-runs safe (skips existing events by name, existing handoffs by composite key).
// Run from project root: bun run .tmp_deploy/load_p15b_finance_handoffs.ts [--dry-run]

const DRY = process.argv.includes("--dry-run");

async function call(tool: string, payload: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: new Response(JSON.stringify(payload)), stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (${code}): ${(stderr || stdout).slice(0, 500)}`);
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// ---- proposed new trigger_events ----
type NewEvent = {
  event_name: string;
  data_object_id: number;       // publisher's data_object
  from_state: string;
  to_state: string;
  description: string;
  event_category: "lifecycle" | "state_change" | "threshold" | "signal";
};
const NEW_EVENTS: NewEvent[] = [
  { event_name: "journal_entry.posted",         data_object_id: 194, from_state: "draft",      to_state: "posted",      event_category: "lifecycle",    description: "A general-ledger journal entry has been posted to the books, becoming part of the period's authoritative record. Downstream effects: audit log capture, anomaly detection, intercompany matching." },
  { event_name: "invoice.duplicate_detected",   data_object_id: 75,  from_state: "",           to_state: "",            event_category: "signal",        description: "Three-way match or controller review flagged a candidate invoice as a probable duplicate. Requires manual disposition before payment release." },
  { event_name: "payment.exception",            data_object_id: 205, from_state: "in_progress", to_state: "exception",   event_category: "state_change",  description: "A payment run encountered an exception (bank rejection, account closure, routing error, ACH return). Requires AP-controller intervention and may need to notify subscription-billing customer-success when the failure affects an external party." },
  { event_name: "dunning.escalation",           data_object_id: 110, from_state: "",           to_state: "escalated",   event_category: "state_change",  description: "A dunning sequence has escalated to the next severity tier (e.g. payment retry N exhausted, account suspension imminent). CSM and collections need a heads-up for retention or contact." },
  { event_name: "subscription.renewal_required",data_object_id: 106, from_state: "",           to_state: "",            event_category: "threshold",     description: "A subscription is within the renewal window (typically 90 days from term end). CSM should engage with the customer for renewal motion." },
  { event_name: "subscription.downgraded",      data_object_id: 106, from_state: "",           to_state: "downgraded",  event_category: "state_change",  description: "A customer subscription has been downgraded (lower tier, fewer seats, removed modules). Churn-risk signal; CRM needs expansion-replan, CSM needs retention motion." },
  { event_name: "cloud_spend.threshold_breached", data_object_id: 75, from_state: "",          to_state: "",            event_category: "threshold",     description: "Cloud-provider spend exceeded a configured threshold (monthly, daily, per-account, per-service). Cost-center owners and procurement need a heads-up before the spike compounds." },
  { event_name: "variance.threshold_breached",  data_object_id: 39,  from_state: "",           to_state: "",            event_category: "threshold",     description: "A budget-vs-actuals variance crossed a configured threshold (usually unfavorable). Triggers reforecast or management review." },
];

// ---- look up existing trigger_events to identify which are truly new ----
const existingEvents: { id: number; event_name: string }[] = await call("postgrestRequest", {
  method: "GET",
  path: `/trigger_events?event_name=in.(${NEW_EVENTS.map(e => e.event_name).join(",")})&select=id,event_name`,
});
const existingByName = new Map(existingEvents.map(e => [e.event_name, e.id]));
const eventsToInsert = NEW_EVENTS.filter(e => !existingByName.has(e.event_name));
console.log(`New trigger_events to insert: ${eventsToInsert.length}/${NEW_EVENTS.length}`);

if (!DRY && eventsToInsert.length > 0) {
  const body = eventsToInsert.map(e => ({
    event_name: e.event_name,
    data_object_id: e.data_object_id,
    from_state: e.from_state,
    to_state: e.to_state,
    description: e.description,
    event_category: e.event_category,
  }));
  await call("postgrestRequest", { method: "POST", path: "/trigger_events", body });
  console.log(`  ✨ inserted ${eventsToInsert.length} trigger_events`);
}

// Re-read to build full event_name → id map (covers existing + freshly inserted + extras for handoff refs)
const allEvents: { id: number; event_name: string }[] = await call("postgrestRequest", {
  method: "GET",
  path: `/trigger_events?event_name=in.(${[...NEW_EVENTS.map(e => e.event_name), "revenue.recognised", "forecast.refreshed"].join(",")})&select=id,event_name`,
});
const eventByName = new Map(allEvents.map(e => [e.event_name, e.id]));

// ---- proposed handoffs ----
// domain IDs (verified): ERP-FIN=65, EPM=66, AP-AUTO=29, EXPENSE=67, SUB-MGMT=97, FINOPS=41, AUDIT=16, GRC=15, CSM=30, CRM=69, S2P=27, CLM=26, SUP-LIFE=28
// data_object IDs (verified): journal_entries=194, invoices=75, payment_runs=205, customer_subscriptions=106, customer_invoices=107, revenue_recognition_records=109, dunning_events=110, expense_reports=210, card_transactions=213, workforce_plans=23, financial_plans=37, budgets=38, forecasts=39

type ProposedHandoff = {
  source_domain_id: number;
  target_domain_id: number;
  data_object_id: number;
  event_name: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "low" | "medium" | "high";
  description: string;
  notes: string;
};

const PROPOSED: ProposedHandoff[] = [
  {
    source_domain_id: 65, target_domain_id: 16, data_object_id: 194,
    event_name: "journal_entry.posted", integration_pattern: "event_stream", friction_level: "high",
    description: "Every posted GL journal entry must flow into the audit log for forensic review and anomaly detection. Failure modes: high volume drowns the audit pipeline; backdated entries arrive after the audit-period close.",
    notes: "Cross-vendor stack pattern: ERP-FIN and AUDIT often live in different vendors; same logical entity (journal_entry) but different identifier spaces.",
  },
  {
    source_domain_id: 65, target_domain_id: 15, data_object_id: 194,
    event_name: "journal_entry.posted", integration_pattern: "batch_sync", friction_level: "medium",
    description: "GRC consumes posted journal entries for SOX-style control testing (segregation-of-duties checks, threshold reviews, manual-journal scrutiny). Batched nightly for testing; not real-time.",
    notes: "One event, many subscribers: AUDIT and GRC subscribe to the same journal_entry.posted event with different downstream effects.",
  },
  {
    source_domain_id: 29, target_domain_id: 65, data_object_id: 75,
    event_name: "invoice.duplicate_detected", integration_pattern: "api_call", friction_level: "high",
    description: "AP-AUTO duplicate-detection routes flagged invoices to the AP controller via ERP-FIN's exception queue. Failure modes: false positives drown the queue; legitimate duplicates from supplier portals get auto-paid before the alert lands.",
    notes: "Exception/alert pattern: loose coupling, no feedback loop. Controller resolves outside the source domain.",
  },
  {
    source_domain_id: 29, target_domain_id: 65, data_object_id: 205,
    event_name: "payment.exception", integration_pattern: "event_stream", friction_level: "high",
    description: "Bank rejections, account closures, ACH returns, and routing errors during a payment run land here. ERP-FIN must reverse the cash posting and re-queue the invoice; AR side may need notification if the failed payment was a customer refund.",
    notes: "High-friction: payment exceptions require manual disposition; SLA-sensitive (supplier relations).",
  },
  {
    source_domain_id: 29, target_domain_id: 30, data_object_id: 205,
    event_name: "payment.exception", integration_pattern: "api_call", friction_level: "medium",
    description: "Customer-facing refund payment failures need CSM awareness so the customer can be contacted before they discover the missing refund themselves.",
    notes: "One event, many subscribers: ERP-FIN takes the accounting action; CSM takes the customer-comm action.",
  },
  {
    source_domain_id: 97, target_domain_id: 30, data_object_id: 110,
    event_name: "dunning.escalation", integration_pattern: "api_call", friction_level: "high",
    description: "Dunning sequence escalation (retry count, days-overdue, severity tier) triggers CSM retention or collections handoff. Failure modes: CSM doesn't know when to stop dunning a strategic-customer for relationship reasons; collections double-contacts after CSM intervention.",
    notes: "Cross-vendor stack: SUB-MGMT and CSM often distinct platforms; loose coupling causes contact-cadence collisions.",
  },
  {
    source_domain_id: 97, target_domain_id: 30, data_object_id: 106,
    event_name: "subscription.renewal_required", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Subscriptions entering the renewal window (90 days from term-end by default) must surface in CSM for the renewal motion. Failure modes: auto-renew customers slip through CSM's view; multi-product subscriptions have staggered terms.",
    notes: "Calendar-driven; same-stack low-friction if SUB-MGMT and CSM share a vendor.",
  },
  {
    source_domain_id: 97, target_domain_id: 69, data_object_id: 106,
    event_name: "subscription.downgraded", integration_pattern: "api_call", friction_level: "high",
    description: "Downgrades are churn-risk signals: lower tier, fewer seats, removed modules. CRM needs the opportunity record reopened for expansion replan; CSM needs to run retention motion.",
    notes: "Going-away pattern: downgrades are harder to catch than upgrades because they arrive via many channels (in-app, support ticket, contractual amendment).",
  },
  {
    source_domain_id: 97, target_domain_id: 65, data_object_id: 109,
    event_name: "revenue.recognised", integration_pattern: "batch_sync", friction_level: "medium",
    description: "SUB-MGMT computes revenue recognition under ASC 606 (or equivalent) and feeds resulting GL entries to ERP-FIN. Failure modes: rev-rec timing differences between SUB-MGMT and ERP-FIN close calendars; deferred-revenue reclassifications create suspense entries.",
    notes: "Period/cycle-close pattern: tight timing coupling around month-end.",
  },
  {
    source_domain_id: 41, target_domain_id: 27, data_object_id: 75,
    event_name: "cloud_spend.threshold_breached", integration_pattern: "api_call", friction_level: "high",
    description: "Cloud-provider spend has exceeded a configured threshold (per-account, per-service, monthly). Procurement needs to engage for commitment-discount conversations; finance leadership needs visibility for forecast adjustment.",
    notes: "Probabilistic-to-deterministic pattern: spike detection is heuristic, action is binding (commit dollars).",
  },
  {
    source_domain_id: 66, target_domain_id: 16, data_object_id: 39,
    event_name: "forecast.refreshed", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Refreshed forecast feeds into the audit trail for forecast-accuracy review and as input to management-review documentation. Failure modes: forecast versions proliferate (top-down, bottom-up, scenario variants); audit needs the single authoritative version.",
    notes: "Multiple-version pattern: forecast.refreshed fires for every scenario refresh; audit needs filter by official version flag.",
  },
];

// ---- look up existing handoffs to dedupe ----
const sourceIds = [...new Set(PROPOSED.map(p => p.source_domain_id))];
const existing: { id: number; source_domain_id: number; target_domain_id: number; trigger_event_id: number; data_object_id: number }[] = await call(
  "postgrestRequest",
  {
    method: "GET",
    path: `/cross_domain_handoffs?source_domain_id=in.(${sourceIds.join(",")})&select=id,source_domain_id,target_domain_id,trigger_event_id,data_object_id`,
  },
);
const existingSet = new Set<string>(
  existing.map(h => `${h.source_domain_id}|${h.target_domain_id}|${h.trigger_event_id}|${h.data_object_id}`),
);
console.log(`Existing Finance-source handoffs: ${existing.length}`);

// Build insert rows (resolve trigger_event_id; in dry-run, use a placeholder when the event hasn't been inserted yet)
const rows = PROPOSED.map(p => {
  const trigger_event_id = eventByName.get(p.event_name);
  if (trigger_event_id === undefined && !DRY) throw new Error(`event "${p.event_name}" not resolved`);
  return {
    source_domain_id: p.source_domain_id,
    target_domain_id: p.target_domain_id,
    data_object_id: p.data_object_id,
    trigger_event_id: trigger_event_id ?? -1,
    trigger_event: p.event_name,
    integration_pattern: p.integration_pattern,
    friction_level: p.friction_level,
    description: p.description,
    notes: p.notes,
    key: `${p.source_domain_id}|${p.target_domain_id}|${trigger_event_id ?? "(new)"}|${p.data_object_id}`,
  };
});

const toInsert = rows.filter(r => !existingSet.has(r.key));
console.log(`Proposed: ${rows.length}; to insert: ${toInsert.length}`);

console.log("\nDraft rows:");
for (const r of toInsert) {
  console.log(`  ${r.source_domain_id} → ${r.target_domain_id} on "${r.trigger_event}" (data_object=${r.data_object_id}, friction=${r.friction_level}, pattern=${r.integration_pattern})`);
}

if (DRY) {
  console.log("\n--dry-run: not inserting.");
  process.exit(0);
}

if (toInsert.length === 0) {
  console.log("\n♻ nothing to insert.");
  process.exit(0);
}

const body = toInsert.map(({ key, ...row }) => row);
await call("postgrestRequest", { method: "POST", path: "/cross_domain_handoffs", body });
console.log(`\n✨ inserted ${toInsert.length} handoffs`);

const after: { id: number }[] = await call("postgrestRequest", { method: "GET", path: "/cross_domain_handoffs?select=id&limit=1000" });
console.log(`Total cross_domain_handoffs in catalog: ${after.length}`);
console.log(`\n✓ P1.5b Finance cluster handoff backfill complete.`);
