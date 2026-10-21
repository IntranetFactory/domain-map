// P1.5d — Sales cluster handoff backfill (resolve leadership-layer blackout + opportunity lifecycle gaps).
// Idempotent: re-runs safe.
// Run from project root: bun run .tmp_deploy/load_p15d_sales_handoffs.ts [--dry-run]

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

// ---- new trigger_events ----
type NewEvent = {
  event_name: string;
  data_object_id: number;
  from_state: string;
  to_state: string;
  description: string;
  event_category: "lifecycle" | "state_change" | "threshold" | "signal";
};
const NEW_EVENTS: NewEvent[] = [
  { event_name: "lead.scored_above_threshold",   data_object_id: 99,  from_state: "",     to_state: "",          event_category: "threshold",    description: "A lead's predictive score has crossed the qualified-handoff threshold. Sales engagement should pick it up for an outreach cadence." },
  { event_name: "opportunity.closed_lost",       data_object_id: 100, from_state: "open", to_state: "closed_lost", event_category: "lifecycle",   description: "An opportunity has been marked closed-lost. Triggers win-loss analysis in revenue intelligence and re-engagement nurture in marketing." },
  { event_name: "opportunity.created",           data_object_id: 100, from_state: "",     to_state: "created",     event_category: "lifecycle",   description: "A new opportunity has been created. Feeds pipeline quota tracking in sales performance and forecast inputs in revenue intelligence." },
  { event_name: "account.tier_changed",          data_object_id: 97,  from_state: "",     to_state: "",            event_category: "state_change", description: "An account's tier classification (strategic / enterprise / mid-market / SMB) has changed. Triggers territory or quota realignment in sales performance and CSM re-segmentation." },
  { event_name: "quote.expired",                 data_object_id: 100, from_state: "open", to_state: "expired",     event_category: "lifecycle",   description: "A CPQ-generated quote has reached its validity expiry without acceptance. Sales rep needs to re-engage or re-quote." },
  { event_name: "cadence.completed",             data_object_id: 121, from_state: "active",to_state: "completed",  event_category: "lifecycle",   description: "A sales engagement cadence has run to completion (all steps executed). The associated opportunity record needs a stage check; if no engagement was achieved, the lead may downgrade or move to nurture." },
  { event_name: "meeting.no_show",               data_object_id: 102, from_state: "scheduled", to_state: "no_show", event_category: "state_change", description: "A scheduled sales meeting was missed by the prospect. The opportunity may need a stage-back or extra cadence iteration." },
  { event_name: "deal_risk.escalated",           data_object_id: 100, from_state: "",     to_state: "escalated",   event_category: "state_change", description: "Revenue intelligence has flagged an opportunity as high-risk (slipping close date, lack of activity, sentiment shift). CRM should surface for sales-rep intervention." },
  { event_name: "pipeline_health.degraded",      data_object_id: 100, from_state: "",     to_state: "",            event_category: "threshold",    description: "Aggregate pipeline health metric has crossed below a configured threshold (coverage ratio, weighted forecast). Sales leadership needs visibility for pipeline-build motion." },
  { event_name: "account_health.declined",       data_object_id: 97,  from_state: "",     to_state: "",            event_category: "threshold",    description: "An account's composite health score has declined materially. CSM needs to engage for retention; sales for expansion-replan." },
  { event_name: "whitespace.identified",         data_object_id: 97,  from_state: "",     to_state: "identified",  event_category: "signal",       description: "Strategic account planning has identified whitespace (cross-sell or upsell opportunity not yet pursued). Sales engagement picks up for prospecting." },
  { event_name: "co_sell.opportunity_created",   data_object_id: 100, from_state: "",     to_state: "created",     event_category: "lifecycle",   description: "A joint opportunity has been created with a channel partner. Both internal sales and partner-rep need visibility; commissions may need split logic." },
  { event_name: "partner_referral.qualified",    data_object_id: 99,  from_state: "",     to_state: "qualified",   event_category: "state_change", description: "A partner-sourced referral has been qualified and is ready for the sales engagement motion. CRM lead-routing needs to assign to a partner-aware sales rep." },
];

const existingEvents: { id: number; event_name: string }[] = await call("postgrestRequest", {
  method: "GET",
  path: `/trigger_events?event_name=in.(${NEW_EVENTS.map(e => e.event_name).join(",")})&select=id,event_name`,
});
const existingByName = new Map(existingEvents.map(e => [e.event_name, e.id]));
const eventsToInsert = NEW_EVENTS.filter(e => !existingByName.has(e.event_name));
console.log(`New trigger_events to insert: ${eventsToInsert.length}/${NEW_EVENTS.length}`);

if (!DRY && eventsToInsert.length > 0) {
  await call("postgrestRequest", {
    method: "POST", path: "/trigger_events",
    body: eventsToInsert.map(e => ({
      event_name: e.event_name, data_object_id: e.data_object_id, from_state: e.from_state, to_state: e.to_state,
      description: e.description, event_category: e.event_category,
    })),
  });
  console.log(`  ✨ inserted ${eventsToInsert.length} trigger_events`);
}

const allEvents: { id: number; event_name: string }[] = await call("postgrestRequest", {
  method: "GET",
  path: `/trigger_events?event_name=in.(${NEW_EVENTS.map(e => e.event_name).join(",")})&select=id,event_name`,
});
const eventByName = new Map(allEvents.map(e => [e.event_name, e.id]));

// ---- proposed handoffs ----
// domain IDs (verified): CRM=69, CPQ=73, SALES-ENG=95, SALES-PERF=102, REV-INTEL=103, GTM-PLAN=104, ACCT-PLAN=105, PRM=96, MA=70, CDP=72, CSM=30, ONBOARDING=99, COMP-MGMT=60, PAYROLL=55
// data_object IDs (verified): customers=97, contacts=98, leads=99, opportunities=100, pipeline_stages=101, sales_activities=102, cadences=121, call_recordings=122, sales_emails=123

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
  { source_domain_id: 69, target_domain_id: 95, data_object_id: 99,  event_name: "lead.scored_above_threshold", integration_pattern: "event_stream", friction_level: "medium",
    description: "A lead's predictive score has crossed the qualified-handoff threshold; SALES-ENG picks up for cadence enrollment. Failure modes: noisy scoring causes cadence whiplash; threshold tuned per segment but not surfaced.",
    notes: "Probabilistic-to-deterministic shape: scoring is heuristic, action is binding (enroll in cadence)." },
  { source_domain_id: 69, target_domain_id: 103, data_object_id: 100, event_name: "opportunity.closed_lost",     integration_pattern: "batch_sync", friction_level: "high",
    description: "Closed-lost opportunities feed REV-INTEL for win-loss analysis. Failure modes: rep-entered loss reasons are free-text and inconsistent; lost-then-revived deals double-count.",
    notes: "Cross-vendor stack: REV-INTEL often a distinct platform (Gong, Clari, Outreach); identifier reconciliation is messy." },
  { source_domain_id: 69, target_domain_id: 102, data_object_id: 100, event_name: "opportunity.created",         integration_pattern: "event_stream", friction_level: "low",
    description: "New opportunities feed pipeline quota tracking in SALES-PERF. Failure modes: rep-attribution edge cases (transfers, team deals).",
    notes: "Same-stack low-friction if SALES-PERF lives inside the CRM." },
  { source_domain_id: 69, target_domain_id: 102, data_object_id: 97,  event_name: "account.tier_changed",        integration_pattern: "api_call", friction_level: "medium",
    description: "Account tier changes trigger territory or quota realignment. Failure modes: mid-quarter changes invalidate existing assignments; commission impact is retroactive.",
    notes: "Period-coupling shape: tier changes are felt at quota recalculation boundaries." },
  { source_domain_id: 73, target_domain_id: 69, data_object_id: 100, event_name: "quote.expired",                integration_pattern: "batch_sync", friction_level: "low",
    description: "Expired quotes need rep follow-up to re-engage or re-quote. Failure modes: silent expiry; reps unaware until customer escalates.",
    notes: "Calendar-driven low-friction." },
  { source_domain_id: 95, target_domain_id: 69, data_object_id: 121, event_name: "cadence.completed",            integration_pattern: "event_stream", friction_level: "low",
    description: "Completed cadences signal an opportunity stage check. Failure modes: cadence completion without engagement should mark for nurture, not advance.",
    notes: "Tight loop: SALES-ENG → CRM are typically same-vendor." },
  { source_domain_id: 95, target_domain_id: 69, data_object_id: 102, event_name: "meeting.no_show",              integration_pattern: "event_stream", friction_level: "medium",
    description: "Missed meetings flag opportunity stage-back or extra cadence iteration. Failure modes: false no-shows from calendar timezone errors; rep-side reschedules not captured.",
    notes: "Engagement-data quality issue." },
  { source_domain_id: 103, target_domain_id: 69, data_object_id: 100, event_name: "deal_risk.escalated",         integration_pattern: "api_call", friction_level: "high",
    description: "Revenue intelligence flags a high-risk opportunity; CRM surfaces it to the rep. Failure modes: too many alerts dilute attention; AI risk scores not explainable.",
    notes: "Probabilistic-to-deterministic shape: REV-INTEL inference, CRM intervention." },
  { source_domain_id: 103, target_domain_id: 102, data_object_id: 100, event_name: "pipeline_health.degraded",    integration_pattern: "api_call", friction_level: "medium",
    description: "Pipeline health metrics dropping below threshold prompt sales leadership pipeline-build motion. Failure modes: lagging indicators trigger after the quarter is already lost.",
    notes: "Leadership-layer signal: REV-INTEL upward to SALES-PERF leadership." },
  { source_domain_id: 105, target_domain_id: 30, data_object_id: 97,  event_name: "account_health.declined",     integration_pattern: "api_call", friction_level: "high",
    description: "Strategic account planning flags declining health; CSM engages for retention. Failure modes: health score components disagree (usage, sentiment, billing) — CSM unclear what to address.",
    notes: "Cross-vendor stack: ACCT-PLAN often a separate planning tool from CSM operations." },
  { source_domain_id: 105, target_domain_id: 95, data_object_id: 97,  event_name: "whitespace.identified",       integration_pattern: "api_call", friction_level: "medium",
    description: "Whitespace (cross-sell / upsell) feeds SALES-ENG for prospecting. Failure modes: account-team toes; whitespace not synchronized with existing CSM relationships.",
    notes: "Probabilistic identification meets coordinated outreach." },
  { source_domain_id: 96, target_domain_id: 69, data_object_id: 100, event_name: "co_sell.opportunity_created",  integration_pattern: "api_call", friction_level: "medium",
    description: "Joint opportunities flow from PRM into CRM with split-credit metadata. Failure modes: commission split rules need re-evaluation per deal; partner identity drift.",
    notes: "Identity reconciliation: partner_id and account_owner_id are separate identifier spaces." },
  { source_domain_id: 96, target_domain_id: 69, data_object_id: 99, event_name: "partner_referral.qualified",   integration_pattern: "api_call", friction_level: "medium",
    description: "Partner-sourced referrals flow into CRM lead-routing. Failure modes: dedup against existing prospects; partner-attribution edge cases.",
    notes: "Cross-vendor stack: PRM platform distinct from CRM in most stacks." },
];

const sourceIds = [...new Set(PROPOSED.map(p => p.source_domain_id))];
const existing: { id: number; source_domain_id: number; target_domain_id: number; trigger_event_id: number; data_object_id: number }[] = await call(
  "postgrestRequest",
  { method: "GET", path: `/cross_domain_handoffs?source_domain_id=in.(${sourceIds.join(",")})&select=id,source_domain_id,target_domain_id,trigger_event_id,data_object_id` },
);
const existingSet = new Set<string>(existing.map(h => `${h.source_domain_id}|${h.target_domain_id}|${h.trigger_event_id}|${h.data_object_id}`));
console.log(`Existing Sales-source handoffs: ${existing.length}`);

const rows = PROPOSED.map(p => {
  const trigger_event_id = eventByName.get(p.event_name);
  if (trigger_event_id === undefined && !DRY) throw new Error(`event "${p.event_name}" not resolved`);
  return {
    source_domain_id: p.source_domain_id, target_domain_id: p.target_domain_id, data_object_id: p.data_object_id,
    trigger_event_id: trigger_event_id ?? -1, trigger_event: p.event_name,
    integration_pattern: p.integration_pattern, friction_level: p.friction_level,
    description: p.description, notes: p.notes,
    key: `${p.source_domain_id}|${p.target_domain_id}|${trigger_event_id ?? "(new)"}|${p.data_object_id}`,
  };
});
const toInsert = rows.filter(r => !existingSet.has(r.key));
console.log(`Proposed: ${rows.length}; to insert: ${toInsert.length}`);
console.log("\nDraft rows:");
for (const r of toInsert) console.log(`  ${r.source_domain_id} → ${r.target_domain_id} on "${r.trigger_event}" (data_object=${r.data_object_id}, friction=${r.friction_level})`);

if (DRY) { console.log("\n--dry-run: not inserting."); process.exit(0); }
if (toInsert.length === 0) { console.log("\n♻ nothing to insert."); process.exit(0); }

await call("postgrestRequest", {
  method: "POST", path: "/cross_domain_handoffs",
  body: toInsert.map(({ key, ...row }) => row),
});
console.log(`\n✨ inserted ${toInsert.length} handoffs`);

const after: { id: number }[] = await call("postgrestRequest", { method: "GET", path: "/cross_domain_handoffs?select=id&limit=1000" });
console.log(`Total cross_domain_handoffs in catalog: ${after.length}`);
console.log(`\n✓ P1.5d Sales cluster handoff backfill complete.`);
