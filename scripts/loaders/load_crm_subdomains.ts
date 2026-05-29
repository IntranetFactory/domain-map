#!/usr/bin/env bun
// Load CDP + MA + SALES-ENG data_objects, multi-master / contributor / consumer
// rows, and the cross-domain handoffs that turn the CRM sub-domain cluster
// from "contributor refs but no master data" into a fully populated graph.
//
// 14 data_objects + ~15 signal rows + 12 handoffs. Idempotent.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function semCall(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}

const get = (path: string) => semCall({ method: "GET", path });
const post = (path: string, body: Row | Row[]) => semCall({ method: "POST", path, body });

async function insertChunked(path: string, rows: Row[]): Promise<void> {
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    if (slice.length > 0) await post(path, slice);
  }
}

async function syncByKey<T extends Row>(
  path: string, rows: T[], keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=20000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insertChunked(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=20000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

const domainRows = await get(
  "/domains?domain_code=in.(CDP,MA,SALES-ENG,CRM,CSM,SUB-MGMT,B2C-COMM,IGA,PA)&select=id,domain_code",
);
const did = (code: string) => {
  const r = domainRows.find(d => d.domain_code === code);
  if (!r) throw new Error(`domain ${code} not in catalog`);
  return Number(r.id);
};

// =============================================================================
// PHASE 1 — data_objects
// =============================================================================
console.log("\n=== Phase 1: data_objects ===");

type ObjSpec = { data_object_name: string; singular_label?: string; plural_label?: string; display_label: string; description: string; master_domain: string };

const allObjects: ObjSpec[] = [
  // ----- CDP -----
  {
    data_object_name: "customer_events",
    singular_label: "Customer Event",
    plural_label: "Customer Events",
    display_label: "Customer Event",
    description: "Unified event stream — every customer interaction across web, mobile, email, in-product, sales-engagement, support. The firehose CDP is built around: typically millions of events per day per active customer base. Multi-feed from MA (campaign events), B2C-COMM (storefront), CRM (sales activities), CSM (support interactions), product instrumentation. The customer-side counterpart to ITOM's `events`.",
    master_domain: "CDP",
  },
  {
    data_object_name: "identity_graphs",
    singular_label: "Identity Graph",
    plural_label: "Identity Graphs",
    display_label: "Identity Graph",
    description: "Identity-resolution edges: email ↔ device ↔ cookie ↔ login ↔ phone. The graph that turns anonymous interactions into resolved customers. Built up over time from event signals; quality drives every downstream activation. IGA contributes employee-as-customer overlap for B2C-employer scenarios.",
    master_domain: "CDP",
  },
  {
    data_object_name: "audience_segments",
    singular_label: "Audience Segment",
    plural_label: "Audience Segments",
    display_label: "Audience Segment",
    description: "Defined segments / cohorts (high-value-active, 90-day-churn-risk, holiday-shoppers, post-purchase-anchor). Computed from events + attributes; activated outbound to MA for campaign targeting, to B2C-COMM for personalized storefront, to SALES-ENG for outreach prioritisation.",
    master_domain: "CDP",
  },
  {
    data_object_name: "customer_attributes",
    singular_label: "Customer Attribute",
    plural_label: "Customer Attributes",
    display_label: "Customer Attribute",
    description: "Derived / calculated attributes attached to the resolved profile: LTV, RFM score, propensity-to-buy, churn-likelihood, preferred-channel, lifecycle stage. The materialized scoring layer of the unified profile; downstream segments and personalization rules read from here.",
    master_domain: "CDP",
  },
  {
    data_object_name: "customer_journeys",
    singular_label: "Customer Journey",
    plural_label: "Customer Journeys",
    display_label: "Customer Journey",
    description: "Observed multi-channel journey progression — the inbound view of how a customer moved through touchpoints over time. Distinct from MA `nurture_journeys` (orchestrated outbound sequences): customer_journeys are descriptive (what happened), nurture_journeys are prescriptive (what we'll do).",
    master_domain: "CDP",
  },
  // ----- MA -----
  {
    data_object_name: "campaigns",
    singular_label: "Campaign",
    plural_label: "Campaigns",
    display_label: "Campaign",
    description: "Marketing campaign definitions — email blast, drip sequence, multi-channel, paid social tie-in, webinar series, ABM play. Carries target audience (segments), schedule, content variants, attribution settings, performance KPIs.",
    master_domain: "MA",
  },
  {
    data_object_name: "marketing_emails",
    singular_label: "Marketing Email",
    plural_label: "Marketing Emails",
    display_label: "Marketing Email",
    description: "Email templates and sent instances at marketing scale: list-driven, volume-heavy, branded. Carries open/click/bounce/unsubscribe metrics, deliverability state, sender-reputation impact. Distinct from SALES-ENG `sales_emails` (1-1, rep-driven).",
    master_domain: "MA",
  },
  {
    data_object_name: "lead_scores",
    singular_label: "Lead Score",
    plural_label: "Lead Scores",
    display_label: "Lead Score",
    description: "Scoring records per lead/contact — explicit signals (form-fill, demo-request, content-download) + implicit signals (behavior, fit/firmographic match). The mechanism behind the MQL handoff to CRM; thresholds and decay rules drive routing.",
    master_domain: "MA",
  },
  {
    data_object_name: "nurture_journeys",
    singular_label: "Nurture Journey",
    plural_label: "Nurture Journeys",
    display_label: "Nurture Journey",
    description: "Multi-touch outbound nurture flows — branching paths, wait conditions, exit criteria, content trees. The orchestrated counterpart to CDP `customer_journeys`; MA defines, CDP observes resulting behavior.",
    master_domain: "MA",
  },
  {
    data_object_name: "forms",
    singular_label: "Form",
    plural_label: "Forms",
    display_label: "Form",
    description: "Lead-capture form definitions: fields, mapping to leads/contacts, hidden field rules, conditional logic, post-submit routing (lead score boost, nurture enrol, sales-rep notification).",
    master_domain: "MA",
  },
  // ----- SALES-ENG -----
  {
    data_object_name: "cadences",
    singular_label: "Cadence",
    plural_label: "Cadences",
    display_label: "Cadence",
    description: "Multi-step outreach sequence — touchpoint definitions (call, email, social, video, voicemail-drop), timing, branching rules based on engagement. The Salesloft/Outreach core entity; enrolment can be manual (rep choice) or automated (CDP intent signal, CRM opportunity stage).",
    master_domain: "SALES-ENG",
  },
  {
    data_object_name: "call_recordings",
    singular_label: "Call Recording",
    plural_label: "Call Recordings",
    display_label: "Call Recording",
    description: "Recorded sales call: audio/video, transcript, participants, talk-track / topic / sentiment metadata. Modern stacks (Gong, Chorus, Salesloft Conversations) attach this to deals and feed conversation_intelligence_records downstream.",
    master_domain: "SALES-ENG",
  },
  {
    data_object_name: "sales_emails",
    singular_label: "Sales Email",
    plural_label: "Sales Emails",
    display_label: "Sales Email",
    description: "Individual sales emails sent (1-1, not blasts) — open/reply/click tracking, thread context, sentiment. Distinct from MA `marketing_emails` (volume-scale, list-driven, brand-template-bound).",
    master_domain: "SALES-ENG",
  },
  {
    data_object_name: "conversation_intelligence_records",
    singular_label: "Conversation Intelligence Record",
    plural_label: "Conversation Intelligence Records",
    display_label: "Conversation Intelligence Record",
    description: "AI-extracted insights from calls, emails, and meetings: competitor mentions, pricing discussions, sentiment shifts, commitments made, action items, risk signals. Feeds opportunity stage signals back to CRM and deal-coaching recommendations to managers.",
    master_domain: "SALES-ENG",
  },
];

const insertableObjects = allObjects.map(({ master_domain, ...rest }) => rest);
const dataObjMap = await syncByKey("/data_objects", insertableObjects, "data_object_name");

// Resolve ids for existing data_objects referenced by signals / handoffs
const refObjects = await get(
  "/data_objects?data_object_name=in.(customers,contacts,opportunities,sales_activities,leads)&select=id,data_object_name",
);
for (const r of refObjects) dataObjMap.set(String(r.data_object_name), Number(r.id));

// =============================================================================
// PHASE 2 — master links
// =============================================================================
console.log("\n=== Phase 2: master links ===");

const allDDO = await get("/domain_data_objects?select=domain_id,data_object_id&limit=20000");
const existingDDOKey = new Set(allDDO.map(r => `${r.domain_id}|${r.data_object_id}`));

const masterRows = allObjects
  .map(o => ({
    domain_id: did(o.master_domain),
    data_object_id: dataObjMap.get(o.data_object_name)!,
    role: "master",
    notes: "",
  }))
  .filter(r => !existingDDOKey.has(`${r.domain_id}|${r.data_object_id}`));

if (masterRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${masterRows.length} master links`);
  await insertChunked("/domain_data_objects", masterRows);
} else {
  console.log(`  /domain_data_objects: all master links already present`);
}

// =============================================================================
// PHASE 3 — multi-master / contributor / consumer rows
// =============================================================================
console.log("\n=== Phase 3: multi-master / contributor / consumer rows ===");

type SignalRow = { data_object: string; domain: string; role: "master" | "contributor" | "consumer" | "derived"; notes: string };

const signals: SignalRow[] = [
  // customer_events — 5-domain fan-in
  { data_object: "customer_events", domain: "MA", role: "contributor", notes: "Campaign delivery, open, click, bounce, unsubscribe events feed CDP's event stream." },
  { data_object: "customer_events", domain: "B2C-COMM", role: "contributor", notes: "Storefront browse, cart, checkout, return events feed CDP." },
  { data_object: "customer_events", domain: "CRM", role: "contributor", notes: "Sales activities (call, email, meeting, demo) and opportunity-stage transitions feed CDP as 'sales-touch' events." },
  { data_object: "customer_events", domain: "CSM", role: "contributor", notes: "Case-creation, escalation, resolution, and CSAT events feed CDP for unified customer view." },

  // audience_segments — fan-out to multiple activation channels
  { data_object: "audience_segments", domain: "MA", role: "consumer", notes: "Segments target campaigns and nurture journeys." },
  { data_object: "audience_segments", domain: "CRM", role: "consumer", notes: "Account-level segment overlay (e.g. 'high-LTV', 'expansion-candidate') surfaces on account records." },
  { data_object: "audience_segments", domain: "B2C-COMM", role: "consumer", notes: "Personalized storefront rendering driven by segment membership." },

  // customer_attributes — read by many
  { data_object: "customer_attributes", domain: "CRM", role: "consumer", notes: "Account view surfaces CDP-derived attributes (LTV, churn-likelihood, preferred-channel) alongside operational CRM fields." },
  { data_object: "customer_attributes", domain: "MA", role: "consumer", notes: "Segment criteria and personalization token resolution read from customer_attributes." },

  // identity_graphs — IGA contributor (B2C employer scenario)
  { data_object: "identity_graphs", domain: "IGA", role: "contributor", notes: "Employee identities that also exist as customer identities (B2C-employer overlap, self-service employee perk programs) contribute resolution edges. Edge case but real." },

  // campaigns — CDP consumes for engagement
  { data_object: "campaigns", domain: "CDP", role: "consumer", notes: "Reads campaign metadata to enrich campaign-event records with attribution context." },

  // lead_scores — CRM consumer (routing), CDP consumer (profile enrichment)
  { data_object: "lead_scores", domain: "CRM", role: "consumer", notes: "MQL threshold drives lead routing and rep assignment in CRM." },
  { data_object: "lead_scores", domain: "CDP", role: "consumer", notes: "Lead scores enrich the resolved customer profile for use across channels." },

  // call_recordings — PA consumer (manager coaching analytics)
  { data_object: "call_recordings", domain: "PA", role: "consumer", notes: "Aggregated call quality, talk-ratio, and topic-coverage metrics feed sales-manager coaching analytics in people analytics." },

  // conversation_intelligence_records — CRM consumer
  { data_object: "conversation_intelligence_records", domain: "CRM", role: "consumer", notes: "Deal-context overlay: competitor mentions, sentiment shifts, commitments visible on the opportunity timeline." },

  // sales_emails — CRM contributor, CDP consumer
  { data_object: "sales_emails", domain: "CRM", role: "contributor", notes: "Rep-sent emails are logged into the account activity timeline; CRM is the longer-term system of record for the touchpoint history." },
  { data_object: "sales_emails", domain: "CDP", role: "consumer", notes: "Open/reply/click events feed CDP as sales-touch engagement signals." },

  // contacts — CDP contributor (resolved profile enrichment)
  { data_object: "contacts", domain: "CDP", role: "contributor", notes: "CDP-resolved attributes (identity match, behavioral score, lifecycle stage) enrich the operational contact record back in CRM." },
];

const signalRows = signals
  .map(s => {
    const objId = dataObjMap.get(s.data_object);
    if (!objId) { console.warn(`  ! data_object missing: ${s.data_object}`); return null; }
    return { domain_id: did(s.domain), data_object_id: objId, role: s.role, notes: s.notes };
  })
  .filter((r): r is Row => r !== null)
  .filter(r => !existingDDOKey.has(`${r.domain_id}|${r.data_object_id}`));

if (signalRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${signalRows.length} signal rows`);
  await insertChunked("/domain_data_objects", signalRows);
} else {
  console.log(`  /domain_data_objects: all signal rows already present`);
}

// =============================================================================
// PHASE 4 — cross_domain_handoffs
// =============================================================================
console.log("\n=== Phase 4: cross_domain_handoffs ===");

const doid = (name: string) => {
  const id = dataObjMap.get(name);
  if (!id) throw new Error(`data_object ${name} not loaded`);
  return id;
};

const handoffs = [
  // CDP fan-in
  {
    source_domain_id: did("MA"), target_domain_id: did("CDP"),
    data_object_id: doid("customer_events"), trigger_event: "campaign.event_recorded",
    integration_pattern: "event_stream", friction_level: "low",
    description: "Campaign delivery, open, click, bounce, and unsubscribe events flow from MA to CDP for unified event-stream aggregation. Low friction because event-stream ingestion is exactly what CDP tools are built for.",
    notes: "",
  },
  {
    source_domain_id: did("B2C-COMM"), target_domain_id: did("CDP"),
    data_object_id: doid("customer_events"), trigger_event: "storefront.interaction",
    integration_pattern: "event_stream", friction_level: "low",
    description: "Storefront events (page view, product view, add-to-cart, checkout, return, search) flow from commerce to CDP for behavioral profile enrichment and segment recomputation.",
    notes: "",
  },
  {
    source_domain_id: did("CRM"), target_domain_id: did("CDP"),
    data_object_id: doid("customer_events"), trigger_event: "opportunity.stage_changed",
    integration_pattern: "event_stream", friction_level: "medium",
    description: "Opportunity-stage transitions and sales-activity events flow from CRM to CDP. Friction sits in the identity match — CRM contacts must reconcile to CDP-resolved customer profiles, which is not always 1:1.",
    notes: "",
  },
  {
    source_domain_id: did("CSM"), target_domain_id: did("CDP"),
    data_object_id: doid("customer_events"), trigger_event: "case.created",
    integration_pattern: "event_stream", friction_level: "medium",
    description: "Case lifecycle events (created, escalated, resolved, CSAT received) flow from CSM to CDP so the unified profile reflects support interactions. Friction is medium — case identifiers need to resolve to the CDP profile, and case context (severity, root cause) needs schema mapping.",
    notes: "",
  },
  // CDP fan-out (activation)
  {
    source_domain_id: did("CDP"), target_domain_id: did("MA"),
    data_object_id: doid("audience_segments"), trigger_event: "segment.activated",
    integration_pattern: "api_call", friction_level: "medium",
    description: "CDP-defined segment activates into MA for campaign targeting. Friction sits in segment-definition portability — what CDP calls 'high-value-active' may not map cleanly to MA's list-and-criteria model, requiring sync logic.",
    notes: "",
  },
  {
    source_domain_id: did("CDP"), target_domain_id: did("SALES-ENG"),
    data_object_id: doid("cadences"), trigger_event: "high_intent_signal.detected",
    integration_pattern: "event_stream", friction_level: "high",
    description: "CDP-detected high-intent signal (pricing-page revisits, integration-doc views, competitor-comparison engagement) triggers cadence enrolment in SALES-ENG so reps reach out at the right moment. High friction: the intent signal is probabilistic, the cadence enrolment rules are rep-team-specific, and the systems have very different data models. The marquee 'intent data → outreach' handoff that powers modern outbound.",
    notes: "",
  },
  {
    source_domain_id: did("CDP"), target_domain_id: did("B2C-COMM"),
    data_object_id: doid("customers"), trigger_event: "segment.activated",
    integration_pattern: "api_call", friction_level: "medium",
    description: "Segment activation drives personalized storefront experience: which products surface, which banners show, what discount tier applies. Friction is medium — real-time segment evaluation at storefront render-time is non-trivial latency-wise.",
    notes: "",
  },
  // CRM ↔ SALES-ENG
  {
    source_domain_id: did("CRM"), target_domain_id: did("SALES-ENG"),
    data_object_id: doid("cadences"), trigger_event: "opportunity.assigned",
    integration_pattern: "api_call", friction_level: "medium",
    description: "New opportunity assignment in CRM auto-enrols the contact in the appropriate cadence in SALES-ENG. Friction sits in cadence-selection rules (which cadence for which deal type, region, segment) which drift faster than the integration code.",
    notes: "",
  },
  {
    source_domain_id: did("SALES-ENG"), target_domain_id: did("CRM"),
    data_object_id: doid("sales_activities"), trigger_event: "call.completed",
    integration_pattern: "event_stream", friction_level: "low",
    description: "Completed calls (and their disposition, duration, recording link) log to the CRM activity timeline. Low friction because activity-sync is a core SALES-ENG ↔ CRM integration that vendors invest in heavily.",
    notes: "",
  },
  {
    source_domain_id: did("SALES-ENG"), target_domain_id: did("CRM"),
    data_object_id: doid("opportunities"), trigger_event: "deal_insight.captured",
    integration_pattern: "api_call", friction_level: "medium",
    description: "Conversation-intelligence-extracted insight (competitor mentioned, pricing objection, decision-maker identified, commitment made) updates the opportunity record in CRM — fields, custom flags, risk score. Friction comes from rep adoption of the AI-suggested fields, not the integration itself.",
    notes: "",
  },
  // MA ↔ CRM
  {
    source_domain_id: did("MA"), target_domain_id: did("CRM"),
    data_object_id: doid("leads"), trigger_event: "nurture.completed",
    integration_pattern: "api_call", friction_level: "low",
    description: "Nurture journey completion (whether successful conversion or exit) updates lead status in CRM. Low friction in same-vendor stacks (HubSpot all-in-one); medium when MA and CRM are separate.",
    notes: "",
  },
  {
    source_domain_id: did("CRM"), target_domain_id: did("MA"),
    data_object_id: doid("contacts"), trigger_event: "contact.synced",
    integration_pattern: "batch_sync", friction_level: "medium",
    description: "Contact updates in CRM (new contact, status change, opt-in change, account ownership) sync to MA so audience lists and campaigns stay current. Batch-sync is the typical pattern — real-time would be ideal but most stacks accept hourly or daily latency here.",
    notes: "",
  },
];

const allHandoffs = await get(
  "/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=20000",
);
const handoffKey = (r: Row) =>
  `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event}`;
const existingHoSet = new Set(allHandoffs.map(handoffKey));
const handoffsToInsert = handoffs.filter(h => !existingHoSet.has(handoffKey(h)));

if (handoffsToInsert.length > 0) {
  console.log(`  /cross_domain_handoffs: inserting ${handoffsToInsert.length} new handoffs`);
  await insertChunked("/cross_domain_handoffs", handoffsToInsert);
} else {
  console.log(`  /cross_domain_handoffs: all already present`);
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log("\n=== Summary ===");
const totalDO = (await get("/data_objects?select=id")).length;
const totalDDO = (await get("/domain_data_objects?select=id&limit=20000")).length;
const totalHO = (await get("/cross_domain_handoffs?select=id&limit=20000")).length;
console.log(`  total data_objects:           ${totalDO}`);
console.log(`  total domain_data_objects:    ${totalDDO}`);
console.log(`  total cross_domain_handoffs:  ${totalHO}`);

console.log("\nMulti-master leaderboard:");
const allMasterRows = await get("/domain_data_objects?role=eq.master&select=data_object_id&limit=20000");
const masterCount = new Map<number, number>();
for (const r of allMasterRows) {
  const id = Number(r.data_object_id);
  masterCount.set(id, (masterCount.get(id) ?? 0) + 1);
}
const multi = [...masterCount.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
if (multi.length > 0) {
  const objNames = await get(`/data_objects?id=in.(${multi.map(([id]) => id).join(",")})&select=id,data_object_name`);
  const nameById = new Map(objNames.map(r => [Number(r.id), String(r.data_object_name)]));
  for (const [id, c] of multi) console.log(`  ${c}×  ${nameById.get(id)}`);
}

console.log("\nTotal-degree leaderboard (top 12):");
const allDDORows = await get("/domain_data_objects?select=data_object_id&limit=20000");
const degCount = new Map<number, number>();
for (const r of allDDORows) {
  const id = Number(r.data_object_id);
  degCount.set(id, (degCount.get(id) ?? 0) + 1);
}
const topDegObj = [...degCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
const topNames = await get(`/data_objects?id=in.(${topDegObj.map(([id]) => id).join(",")})&select=id,data_object_name`);
const topNameById = new Map(topNames.map(r => [Number(r.id), String(r.data_object_name)]));
for (const [id, c] of topDegObj) console.log(`  ${c}×  ${topNameById.get(id)}`);

console.log("\nHandoff hotspots (top 15):");
const allHo = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id&limit=20000");
const degree = new Map<number, number>();
for (const r of allHo) {
  degree.set(Number(r.source_domain_id), (degree.get(Number(r.source_domain_id)) ?? 0) + 1);
  degree.set(Number(r.target_domain_id), (degree.get(Number(r.target_domain_id)) ?? 0) + 1);
}
const topDeg = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
const allDoms = await get(`/domains?id=in.(${topDeg.map(([id]) => id).join(",")})&select=id,domain_code`);
const codeById = new Map(allDoms.map(r => [Number(r.id), String(r.domain_code)]));
for (const [id, c] of topDeg) console.log(`  ${c}×  ${codeById.get(id)}`);

console.log("\nUI:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
console.log("  https://tests.semantius.app/domain_map/cross_domain_handoffs");
