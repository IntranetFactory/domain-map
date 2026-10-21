// P1.5e — Customer cluster handoff backfill incl. data_object scaffolding for CCAAS, CONV-AI, FSM, LOYALTY.
// Idempotent: safe re-runs (existing data_objects by natural key, existing events by name, existing handoffs by composite key).
// Run from project root: bun run .tmp_deploy/load_p15e_customer_handoffs.ts [--dry-run]

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

// ---- Phase-1: scaffold data_objects for CCAAS, CONV-AI, FSM, LOYALTY ----

type NewDataObject = {
  data_object_name: string;
  singular_label?: string; plural_label?: string; display_label: string;
  description: string;
  master_domain_id: number;
  master_notes: string;
};

const NEW_DATA_OBJECTS: NewDataObject[] = [
  // CCAAS (98)
  { data_object_name: "support_sessions",          singular_label: "Support Session", plural_label: "Support Sessions", display_label: "Support Session",       master_domain_id: 98,
    description: "A contact-center interaction record (voice call, chat session, video session, callback). Captures session metadata: duration, channel, agent, customer, resolution status. Distinct from CSM's customer_cases (the support case is the business artifact; the support_session is the engagement event that may or may not result in a case).",
    master_notes: "CCAAS masters the session-level engagement record; CSM consumes for case enrichment." },
  { data_object_name: "contact_records",           singular_label: "Contact Record", plural_label: "Contact Records", display_label: "Contact Record",         master_domain_id: 98,
    description: "A normalized contact-center customer-identity record reconciling phone numbers, email addresses, and known customer_ids across channels. Helps the agent see context regardless of which channel the customer used.",
    master_notes: "CCAAS-side identity reconciliation; CSM/CRM contributors when their identifiers feed in." },
  { data_object_name: "queue_statistics",          singular_label: "Queue Statistics", plural_label: "Queue Statisticses", display_label: "Queue Statistics",       master_domain_id: 98,
    description: "Real-time and historical metrics per queue: wait time, abandonment rate, service level, average handle time. Drives staffing decisions and SLA monitoring.",
    master_notes: "CCAAS-side operational metrics; WFM is the typical downstream consumer." },

  // CONV-AI (34)
  { data_object_name: "conversation_transcripts",  singular_label: "Conversation Transcript", plural_label: "Conversation Transcripts", display_label: "Conversation Transcript",master_domain_id: 34,
    description: "A turn-by-turn record of a bot or AI-assistant conversation: utterances, intents identified, confidence scores, slot fillings, escalation events. Source-of-truth for AI training, audit, and root-cause analysis.",
    master_notes: "CONV-AI master; analytics and ML training consume for model improvement." },
  { data_object_name: "intent_detections",         singular_label: "Intent Detection", plural_label: "Intent Detections", display_label: "Intent Detection",       master_domain_id: 34,
    description: "An NLU output record: detected intent classification, confidence, originating utterance, downstream action taken. Decoupled from conversation_transcripts so intent analytics can roll up independently of transcript retention policy.",
    master_notes: "CONV-AI master; case-routing / CRM consume for downstream action." },

  // FSM (31)
  { data_object_name: "field_visits",              singular_label: "Field Visit", plural_label: "Field Visits", display_label: "Field Visit",            master_domain_id: 31,
    description: "A scheduled or completed on-site visit by a field technician. Captures arrival, departure, work performed, parts used, customer signature, outcome. Distinct from work_orders (the demand-side artifact); a single work_order may produce multiple field_visits if the work spans days or requires re-dispatch.",
    master_notes: "FSM master; CSM and asset-lifecycle consume on visit completion." },
  { data_object_name: "dispatch_records",          singular_label: "Dispatch Record", plural_label: "Dispatch Records", display_label: "Dispatch Record",        master_domain_id: 31,
    description: "An assignment of a work_order to a specific technician at a specific time. Captures dispatch decisions, route optimization output, dispatcher overrides. Audit trail for what was assigned to whom and why.",
    master_notes: "FSM-side dispatch artifact; technician schedule and customer comm are downstream." },

  // LOYALTY (78)
  { data_object_name: "loyalty_members",           singular_label: "Loyalty Member", plural_label: "Loyalty Members", display_label: "Loyalty Member",         master_domain_id: 78,
    description: "A customer enrolled in the loyalty program. Captures tier, accrued points balance, enrollment date, opt-in status. Distinct from the broader customers entity (CDP/CRM-mastered): a loyalty member is the program-side identity which may or may not match a CRM customer one-to-one (households, joint accounts, anonymous tier members in pre-identification flows).",
    master_notes: "LOYALTY-side identity; CRM contributor when customer_id resolves." },
  { data_object_name: "loyalty_transactions",      singular_label: "Loyalty Transaction", plural_label: "Loyalty Transactions", display_label: "Loyalty Transaction",    master_domain_id: 78,
    description: "A point-earning or point-spending event for a loyalty_member: purchase points, bonus-promo points, redemption, expiry, adjustment. The atomic accounting record for the loyalty program.",
    master_notes: "LOYALTY master; finance contributor for liability accrual." },
  { data_object_name: "loyalty_tiers",             singular_label: "Loyalty Tier", plural_label: "Loyalty Tiers", display_label: "Loyalty Tier",           master_domain_id: 78,
    description: "A tier definition in the loyalty program (Bronze / Silver / Gold / Platinum or equivalent). Captures qualifying thresholds, benefits, retention rules. The reference catalog every loyalty_member is assigned to.",
    master_notes: "LOYALTY master; reference data shared with marketing for personalisation." },
];

// Read existing to dedupe
const existingObjs: { id: number; data_object_name: string }[] = await call("postgrestRequest", {
  method: "GET",
  path: `/data_objects?data_object_name=in.(${NEW_DATA_OBJECTS.map(o => o.data_object_name).join(",")})&select=id,data_object_name`,
});
const existingObjByName = new Map(existingObjs.map(o => [o.data_object_name, o.id]));
const objsToInsert = NEW_DATA_OBJECTS.filter(o => !existingObjByName.has(o.data_object_name));
console.log(`Data_objects to create: ${objsToInsert.length}/${NEW_DATA_OBJECTS.length}`);

if (!DRY && objsToInsert.length > 0) {
  await call("postgrestRequest", {
    method: "POST", path: "/data_objects",
    body: objsToInsert.map(o => ({
      data_object_name: o.data_object_name, display_label: o.display_label, description: o.description,
    })),
  });
  const reread: { id: number; data_object_name: string }[] = await call("postgrestRequest", {
    method: "GET",
    path: `/data_objects?data_object_name=in.(${NEW_DATA_OBJECTS.map(o => o.data_object_name).join(",")})&select=id,data_object_name`,
  });
  reread.forEach(r => existingObjByName.set(r.data_object_name, r.id));
  console.log(`  ✨ inserted ${objsToInsert.length} data_objects`);

  // Link as masters
  const masterLinks = objsToInsert.map(o => ({
    domain_id: o.master_domain_id, data_object_id: existingObjByName.get(o.data_object_name)!,
    role: "master", notes: o.master_notes,
  }));
  await call("postgrestRequest", { method: "POST", path: "/domain_data_objects", body: masterLinks });
  console.log(`  ✨ linked ${masterLinks.length} domain_data_objects (role=master)`);
}

// Build name → id map for events/handoffs (include existing data_objects referenced by handoffs/events)
const referencedExisting: { id: number; data_object_name: string }[] = await call("postgrestRequest", {
  method: "GET", path: "/data_objects?data_object_name=in.(customers)&select=id,data_object_name",
});
referencedExisting.forEach(r => existingObjByName.set(r.data_object_name, r.id));
const dataObjectId = (name: string): number => existingObjByName.get(name) ?? -1;

// ---- new trigger_events ----
type NewEvent = { event_name: string; data_object: string; from_state: string; to_state: string; description: string; event_category: "lifecycle" | "state_change" | "threshold" | "signal" };
const NEW_EVENTS: NewEvent[] = [
  { event_name: "health_score.declined",            data_object: "customers",                from_state: "", to_state: "",        event_category: "threshold",     description: "A customer's composite health score has declined materially. CSM needs retention motion; SUB-MGMT needs to flag for renewal risk." },
  { event_name: "call.escalated",                   data_object: "support_sessions",         from_state: "in_progress", to_state: "escalated", event_category: "state_change",   description: "A contact-center call has been escalated to a supervisor or specialist queue. The originating agent's customer-case may need re-assignment." },
  { event_name: "sentiment.negative",               data_object: "support_sessions",         from_state: "", to_state: "",        event_category: "signal",         description: "Real-time or post-call sentiment analysis flagged the customer interaction as negative. CSM should triage for outreach; supervisor intervention may be needed mid-call." },
  { event_name: "intent.identified",                data_object: "intent_detections",        from_state: "", to_state: "identified", event_category: "signal",     description: "Conversational AI has identified a customer intent (billing question, technical issue, churn signal, upgrade interest). Downstream routing to CRM / case-management / sales-engagement." },
  { event_name: "conversation.escalated_to_human",  data_object: "conversation_transcripts", from_state: "active", to_state: "escalated", event_category: "state_change", description: "A bot conversation has been handed off to a human agent. CCAAS picks up with full transcript context." },
  { event_name: "work_order.completed",             data_object: "field_visits",             from_state: "in_progress", to_state: "completed", event_category: "lifecycle",   description: "A field-service work order has been completed on site. CSM gets the customer-satisfaction signal; asset-lifecycle records the maintenance event; billing kicks off." },
  { event_name: "dispatch.failed",                  data_object: "dispatch_records",         from_state: "scheduled", to_state: "failed", event_category: "state_change", description: "A field-service dispatch failed (technician unavailable, route conflict, customer no-show, equipment unavailable). CSM needs to contact the customer for rescheduling." },
  { event_name: "tier.upgraded",                    data_object: "loyalty_tiers",            from_state: "", to_state: "upgraded", event_category: "lifecycle",     description: "A loyalty member has been upgraded to a higher tier (qualifying threshold met). CRM should know for VIP treatment; marketing for celebration messaging." },
  { event_name: "member.lapsed",                    data_object: "loyalty_members",          from_state: "active", to_state: "lapsed", event_category: "lifecycle",   description: "A loyalty member's status has lapsed (inactivity threshold, missed renewal, opt-out). Marketing should engage in win-back motion." },
  { event_name: "customer.churn_confirmed",         data_object: "customers",                from_state: "at_risk", to_state: "churned", event_category: "lifecycle",  description: "Customer churn has been confirmed (subscription cancel, account close, contract non-renewal). SUB-MGMT processes the cancellation; CRM marks the account; LOYALTY revokes tier benefits if applicable." },
  { event_name: "subscription.expansion_requested", data_object: "customers",                from_state: "", to_state: "",        event_category: "signal",         description: "CSM has identified an expansion opportunity (more seats, additional modules, tier upgrade). SUB-MGMT prepares the proposal; CRM creates the expansion opportunity." },
];

const existingEvents: { id: number; event_name: string }[] = await call("postgrestRequest", {
  method: "GET",
  path: `/trigger_events?event_name=in.(${NEW_EVENTS.map(e => e.event_name).join(",")})&select=id,event_name`,
});
const existingEventByName = new Map(existingEvents.map(e => [e.event_name, e.id]));
const eventsToInsert = NEW_EVENTS.filter(e => !existingEventByName.has(e.event_name));
console.log(`\nNew trigger_events to insert: ${eventsToInsert.length}/${NEW_EVENTS.length}`);

if (!DRY && eventsToInsert.length > 0) {
  await call("postgrestRequest", {
    method: "POST", path: "/trigger_events",
    body: eventsToInsert.map(e => ({
      event_name: e.event_name, data_object_id: dataObjectId(e.data_object),
      from_state: e.from_state, to_state: e.to_state, description: e.description, event_category: e.event_category,
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
// domain IDs: CSM=30, CCAAS=98, CONV-AI=34, FSM=31, LOYALTY=78, CRM=69, SUB-MGMT=97, MA=70

type ProposedHandoff = { source_domain_id: number; target_domain_id: number; data_object: string; event_name: string; integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop"; friction_level: "low" | "medium" | "high"; description: string; notes: string };
const PROPOSED: ProposedHandoff[] = [
  { source_domain_id: 30, target_domain_id: 97, data_object: "customers", event_name: "health_score.declined", integration_pattern: "api_call", friction_level: "high",
    description: "Declining customer health score flags renewal risk; SUB-MGMT may need to adjust dunning lenience or surface for retention. Failure modes: multiple health-score variants disagree.",
    notes: "Probabilistic-to-deterministic shape." },
  { source_domain_id: 98, target_domain_id: 30, data_object: "support_sessions", event_name: "call.escalated", integration_pattern: "event_stream", friction_level: "medium",
    description: "Escalated calls trigger CSM case re-assignment to a specialist or supervisor. Failure modes: original agent's context lost in handoff.",
    notes: "Tight loop; same-vendor typical." },
  { source_domain_id: 98, target_domain_id: 30, data_object: "support_sessions", event_name: "sentiment.negative", integration_pattern: "api_call", friction_level: "high",
    description: "Real-time negative sentiment triggers CSM triage for outreach. Failure modes: AI sentiment scoring is unreliable; false positives drown the queue.",
    notes: "Probabilistic-to-deterministic shape; AI confidence varies." },
  { source_domain_id: 34, target_domain_id: 69, data_object: "intent_detections", event_name: "intent.identified", integration_pattern: "event_stream", friction_level: "medium",
    description: "Detected intent routes to CRM for opportunity creation or case enrichment. Failure modes: intent disambiguation when multiple intents in one conversation.",
    notes: "AI-mediated routing." },
  { source_domain_id: 34, target_domain_id: 98, data_object: "conversation_transcripts", event_name: "conversation.escalated_to_human", integration_pattern: "event_stream", friction_level: "medium",
    description: "Bot-to-human handoff passes the conversation transcript and context to CCAAS. Failure modes: transcript context truncated by agent UI; customer has to repeat.",
    notes: "Identity reconciliation needed across CONV-AI and CCAAS user sessions." },
  { source_domain_id: 31, target_domain_id: 30, data_object: "field_visits", event_name: "work_order.completed", integration_pattern: "api_call", friction_level: "medium",
    description: "Completed field visits trigger CSM customer-satisfaction outreach and billing kickoff. Failure modes: technician sign-off lag; partial completion edge cases.",
    notes: "Tight cross-cluster integration between FSM and CSM." },
  { source_domain_id: 31, target_domain_id: 30, data_object: "dispatch_records", event_name: "dispatch.failed", integration_pattern: "api_call", friction_level: "high",
    description: "Failed dispatch must reach CSM for customer rescheduling comm. Failure modes: failure detection lag; rescheduling SLA breached before CSM is informed.",
    notes: "Going-away pattern: failure detection harder than success detection." },
  { source_domain_id: 78, target_domain_id: 69, data_object: "loyalty_tiers", event_name: "tier.upgraded", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Tier upgrades surface in CRM for account-tag refresh, VIP treatment, sales-rep awareness. Failure modes: tier change effective dates and CRM record sync lag.",
    notes: "Identity reconciliation: LOYALTY member_id and CRM customer_id may differ." },
  { source_domain_id: 78, target_domain_id: 70, data_object: "loyalty_members", event_name: "member.lapsed", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Lapsed loyalty members trigger marketing-automation win-back motion. Failure modes: lapse criteria (inactivity threshold) tuning; false lapses for seasonal customers.",
    notes: "Marketing automation typically same-vendor with MA platform." },
  { source_domain_id: 30, target_domain_id: 97, data_object: "customers", event_name: "customer.churn_confirmed", integration_pattern: "api_call", friction_level: "high",
    description: "Confirmed churn triggers SUB-MGMT subscription cancellation and revenue-impact recognition. Failure modes: churn confirmed but contract-end-date not aligned; refund logic edge cases.",
    notes: "Leaver recall: the going-away event must reliably reach finance to avoid continued billing." },
  { source_domain_id: 30, target_domain_id: 97, data_object: "customers", event_name: "subscription.expansion_requested", integration_pattern: "api_call", friction_level: "medium",
    description: "CSM-identified expansion needs SUB-MGMT proposal generation and CRM opportunity creation. Failure modes: duplicate opportunities when CSM and sales both file.",
    notes: "Tight cross-domain coordination." },
];

const sourceIds = [...new Set(PROPOSED.map(p => p.source_domain_id))];
const existing: { id: number; source_domain_id: number; target_domain_id: number; trigger_event_id: number; data_object_id: number }[] = await call(
  "postgrestRequest",
  { method: "GET", path: `/cross_domain_handoffs?source_domain_id=in.(${sourceIds.join(",")})&select=id,source_domain_id,target_domain_id,trigger_event_id,data_object_id` },
);
const existingSet = new Set<string>(existing.map(h => `${h.source_domain_id}|${h.target_domain_id}|${h.trigger_event_id}|${h.data_object_id}`));
console.log(`\nExisting Customer-source handoffs: ${existing.length}`);

const rows = PROPOSED.map(p => {
  const trigger_event_id = eventByName.get(p.event_name);
  const data_object_id = dataObjectId(p.data_object);
  if (trigger_event_id === undefined && !DRY) throw new Error(`event "${p.event_name}" not resolved`);
  if (data_object_id === -1 && !DRY) throw new Error(`data_object "${p.data_object}" not resolved`);
  return {
    source_domain_id: p.source_domain_id, target_domain_id: p.target_domain_id, data_object_id,
    trigger_event_id: trigger_event_id ?? -1, trigger_event: p.event_name,
    integration_pattern: p.integration_pattern, friction_level: p.friction_level,
    description: p.description, notes: p.notes,
    key: `${p.source_domain_id}|${p.target_domain_id}|${trigger_event_id ?? "(new)"}|${data_object_id}`,
  };
});
const toInsert = rows.filter(r => !existingSet.has(r.key));
console.log(`Proposed: ${rows.length}; to insert: ${toInsert.length}`);
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
console.log(`\n✓ P1.5e Customer cluster handoff backfill complete.`);
