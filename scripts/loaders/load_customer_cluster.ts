#!/usr/bin/env bun
// Load CRM + CSM + SUB-MGMT data_objects with the multi-master signals and
// cross-domain handoffs that tie the customer-facing cluster together. The
// flagship outcome: `customers` becomes the catalog's highest-degree row
// (4 masters + 3 contributors + 1 consumer = 8) — the structural twin of
// `employees` on the customer side.
//
// 14 data_objects + 19 multi-master rows + 14 handoffs. Idempotent.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function semCall(body: Row): Promise<Row[]> {
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
  path: string,
  rows: T[],
  keyField: keyof T & string,
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

// Resolve domain ids
const domainRows = await get(
  "/domains?domain_code=in.(CRM,CSM,SUB-MGMT,CDP,MA,SALES-ENG,LOYALTY,B2C-COMM,CPQ,CLM,ITSM,OMS,PA)&select=id,domain_code",
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
  // ----- CRM -----
  {
    data_object_name: "customers",
    singular_label: "Customer",
    plural_label: "Customers",
    display_label: "Customer",
    description: "Canonical record of a customer — account (B2B) or end-customer (B2C). Carries identity, segmentation, lifecycle stage, account hierarchy, and pointers to opportunities, cases, subscriptions, and unified profile. The flagship customer-facing entity and the catalog's most multi-mastered row: CRM masters the sales view, CSM the service view, SUB-MGMT the financial view, CDP the unified resolved profile. The structural twin of `employees` on the customer side.",
    master_domain: "CRM",
  },
  {
    data_object_name: "contacts",
    singular_label: "Contact",
    plural_label: "Contacts",
    display_label: "Contact",
    description: "Person at a customer account (B2B) or contact-level record (B2C-relevant). Carries title, email, decision-maker flag, preferred channel, opt-in state. MA contributes engagement data; SALES-ENG contributes cadence touchpoints.",
    master_domain: "CRM",
  },
  {
    data_object_name: "leads",
    singular_label: "Lead",
    plural_label: "Leads",
    display_label: "Lead",
    description: "Pre-qualification prospect record — source, score, status (new/working/qualified/disqualified/converted), assigned rep, conversion target (which contact + account it would become). MQL handoff from MA lands here.",
    master_domain: "CRM",
  },
  {
    data_object_name: "opportunities",
    singular_label: "Opportunity",
    plural_label: "Opportunities",
    display_label: "Opportunity",
    description: "Active sales deal — stage, amount, close date, probability, products/SKUs, competitor, decision criteria. Drives CPQ quote generation and closed-won triggers downstream subscription activation.",
    master_domain: "CRM",
  },
  {
    data_object_name: "pipeline_stages",
    singular_label: "Pipeline Stage",
    plural_label: "Pipeline Stages",
    display_label: "Pipeline Stage",
    description: "Sales-process taxonomy: stage definitions, exit criteria, default probability, allowed-next-stage transitions. The configuration object behind the opportunity pipeline.",
    master_domain: "CRM",
  },
  {
    data_object_name: "sales_activities",
    singular_label: "Sales Activity",
    plural_label: "Sales Activities",
    display_label: "Sales Activity",
    description: "Logged touchpoint between sales and a contact/opportunity — call, email, meeting, demo, content view. SALES-ENG sub-domain may co-master if its data_objects load expands later (cadence sequences, call recordings).",
    master_domain: "CRM",
  },
  // ----- CSM -----
  {
    data_object_name: "customer_cases",
    singular_label: "Customer Case",
    plural_label: "Customer Cases",
    display_label: "Customer Case",
    description: "Customer-facing support ticket — the flagship CSM entity. Distinct from ITSM `incidents` (internal IT) and `service_requests` (catalog-driven internal requests). Carries severity, channel, queue, SLA clock, customer + contact references, CSAT linkage. SUB-MGMT-driven dunning failures and CSM-detected churn risk both surface as cases.",
    master_domain: "CSM",
  },
  {
    data_object_name: "customer_entitlements",
    singular_label: "Customer Entitlement",
    plural_label: "Customer Entitlements",
    display_label: "Customer Entitlement",
    description: "What support a customer can use — service tier (Silver/Gold/Platinum), monthly support hours, supported channels (email/chat/phone), named contacts, included services, SLA response targets. Activated from the SUB-MGMT subscription.activated handoff.",
    master_domain: "CSM",
  },
  {
    data_object_name: "csat_responses",
    singular_label: "CSAT Response",
    plural_label: "CSAT Responses",
    display_label: "CSAT Response",
    description: "Customer satisfaction, NPS, or CES survey response tied to a case, interaction, or relationship-level survey. Drives retention scoring and feeds churn-risk signals back to SUB-MGMT and account-health into CRM.",
    master_domain: "CSM",
  },
  // ----- SUB-MGMT (Billing) -----
  {
    data_object_name: "customer_subscriptions",
    singular_label: "Customer Subscription",
    plural_label: "Customer Subscriptions",
    display_label: "Customer Subscription",
    description: "Customer's recurring revenue contract — plan, term, MRR/ARR, billing cadence, seat count, lifecycle (trial / active / paused / cancelled / churned). **Seller-side view**; distinct from `saas_subscriptions` (SMP, buyer-side view of what we consume from vendors).",
    master_domain: "SUB-MGMT",
  },
  {
    data_object_name: "customer_invoices",
    singular_label: "Customer Invoice",
    plural_label: "Customer Invoices",
    display_label: "Customer Invoice",
    description: "Seller-issued invoice — line items, tax, payment terms, due date, status (draft/sent/paid/overdue/written-off). **AR side**; distinct from S2P `invoices` (AP-side, supplier-issued).",
    master_domain: "SUB-MGMT",
  },
  {
    data_object_name: "usage_records",
    singular_label: "Usage Record",
    plural_label: "Usage Records",
    display_label: "Usage Record",
    description: "Metered-billing inputs — events / consumption units / overage credits feeding usage-based pricing tiers. Stream from product instrumentation (or B2C-COMM events) into SUB-MGMT for cycle aggregation.",
    master_domain: "SUB-MGMT",
  },
  {
    data_object_name: "revenue_recognition_records",
    singular_label: "Revenue Recognition Record",
    plural_label: "Revenue Recognition Records",
    display_label: "Revenue Recognition Record",
    description: "ASC 606 / IFRS 15 deferred-revenue schedules: performance obligations, allocation across obligations, recognition timeline, recognized vs deferred amounts. The bridge between SUB-MGMT and Finance/GL.",
    master_domain: "SUB-MGMT",
  },
  {
    data_object_name: "dunning_events",
    singular_label: "Dunning Event",
    plural_label: "Dunning Events",
    display_label: "Dunning Event",
    description: "Payment failure / retry / collection / past-due-warning records driving the involuntary-churn workflow. Surfaces as customer cases when CSM intervention is required; escalates to write-off if collection fails.",
    master_domain: "SUB-MGMT",
  },
];

const insertableObjects = allObjects.map(({ master_domain, ...rest }) => rest);
const dataObjMap = await syncByKey("/data_objects", insertableObjects, "data_object_name");

// Resolve ids for existing data_objects referenced by signal rows / handoffs
const refObjects = await get(
  "/data_objects?data_object_name=in.(contracts,knowledge_articles)&select=id,data_object_name",
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
  // customers — the 4-master flagship
  { data_object: "customers", domain: "CSM", role: "master", notes: "Service view — owns the case history, entitlements, SLAs, CSAT, support contracts associated with the customer. Co-master alongside CRM (sales view), SUB-MGMT (financial view), and CDP (unified profile)." },
  { data_object: "customers", domain: "SUB-MGMT", role: "master", notes: "Financial view — owns the recurring revenue relationship: subscriptions, invoices, payment status, churn state, lifetime value. Co-master alongside CRM, CSM, CDP." },
  { data_object: "customers", domain: "CDP", role: "master", notes: "Unified resolved profile — owns the identity-resolved behavioral view across web, mobile, marketing, product. Distinct slice from CRM/CSM/SUB-MGMT operational records; CDP is where the slices get reconciled into a single golden record." },
  { data_object: "customers", domain: "LOYALTY", role: "contributor", notes: "Contributes loyalty tier, points balance, redemption history, rewards engagement. Surfaces back to CRM/CSM as a retention overlay." },
  { data_object: "customers", domain: "MA", role: "contributor", notes: "Contributes marketing engagement: email opens, clicks, campaign participation, opt-in state. Feeds CDP for unified profile resolution." },
  { data_object: "customers", domain: "B2C-COMM", role: "contributor", notes: "Contributes storefront purchase history, cart abandonment, browse behavior. The transactional-commerce slice of the customer." },
  { data_object: "customers", domain: "PA", role: "consumer", notes: "Where customer-related people-analytics overlap exists (employees acting as customers, customer-success-team workload analytics)." },

  // contacts
  { data_object: "contacts", domain: "MA", role: "contributor", notes: "Contributes engagement state, score deltas, opt-in/preferences." },
  { data_object: "contacts", domain: "SALES-ENG", role: "contributor", notes: "Contributes cadence touchpoint history, call recordings, sales-email engagement." },

  // opportunities
  { data_object: "opportunities", domain: "CPQ", role: "consumer", notes: "Reads opportunity context to generate quotes; awarded quotes feed back as opportunity status updates." },
  { data_object: "opportunities", domain: "SUB-MGMT", role: "consumer", notes: "Closed-won opportunities trigger subscription creation." },

  // contracts (existing CLM-master) — add CSM and SUB-MGMT contributors
  { data_object: "contracts", domain: "CSM", role: "contributor", notes: "Service / support contracts contribute their CSM-specific terms (SLA tier, named-contact lists, support hours) into the canonical contract record." },
  { data_object: "contracts", domain: "SUB-MGMT", role: "contributor", notes: "Subscription contracts contribute their billing-relevant terms (term, renewal cadence, true-up rules, payment terms, auto-renew clauses) into the canonical contract record." },

  // customer_subscriptions
  { data_object: "customer_subscriptions", domain: "CRM", role: "consumer", notes: "Account-health view: which subscriptions are active, MRR by account, expansion opportunities flagged." },
  { data_object: "customer_subscriptions", domain: "CSM", role: "consumer", notes: "Drives the customer_entitlements record on activation; reads subscription state to gate support eligibility." },

  // customer_cases
  { data_object: "customer_cases", domain: "CRM", role: "consumer", notes: "Account-health signal: case volume, critical-severity count, recent CSAT, all surface as account-health overlay in CRM." },
  { data_object: "customer_cases", domain: "SUB-MGMT", role: "consumer", notes: "Case patterns (payment-related cases, churn-risk cases) feed dunning and retention workflows." },

  // customer_invoices
  { data_object: "customer_invoices", domain: "CRM", role: "consumer", notes: "Payment-status overlay on the account: overdue invoices, write-offs, recent payments visible in the CRM account view." },

  // knowledge_articles (existing ITSM-master) — add CSM contributor
  { data_object: "knowledge_articles", domain: "CSM", role: "contributor", notes: "Customer-facing audience for the same KB — same underlying article record, audience-filtered at the application layer. Customer self-service portals and ITSM agent assist share the corpus." },
];

const signalRows = signals
  .map(s => {
    const objId = dataObjMap.get(s.data_object);
    if (!objId) {
      console.warn(`  ! data_object missing: ${s.data_object}`);
      return null;
    }
    return {
      domain_id: did(s.domain),
      data_object_id: objId,
      role: s.role,
      notes: s.notes,
    };
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
  // Lead-to-cash lifecycle
  {
    source_domain_id: did("MA"),
    target_domain_id: did("CRM"),
    data_object_id: doid("leads"),
    trigger_event: "lead.qualified",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description: "MA-driven scoring crosses the MQL threshold; the lead routes to CRM with a recommended owner. Friction comes from definition drift — what counts as MQL, who owns routing, what happens to disqualified leads — and from the lead-to-contact-to-opportunity conversion chain inside CRM.",
    notes: "",
  },
  {
    source_domain_id: did("CRM"),
    target_domain_id: did("CPQ"),
    data_object_id: doid("opportunities"),
    trigger_event: "opportunity.requires_quote",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Opportunity reaches the proposal stage; CPQ generates a configured quote (product mix, discount structure, term). Friction sits in product-catalog sync between CRM and CPQ and in approval workflows for non-standard pricing.",
    notes: "",
  },
  {
    source_domain_id: did("CPQ"),
    target_domain_id: did("CLM"),
    data_object_id: doid("contracts"),
    trigger_event: "quote.accepted",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Accepted quote hands off to CLM for contract authoring — pulls in clause language, populates the agreed terms, routes for signature.",
    notes: "",
  },
  {
    source_domain_id: did("CLM"),
    target_domain_id: did("SUB-MGMT"),
    data_object_id: doid("customer_subscriptions"),
    trigger_event: "contract.signed",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Signed contract creates the customer subscription in SUB-MGMT: plan, term, MRR/ARR, billing cadence, seat count, start date. The 'order-to-active' moment.",
    notes: "",
  },
  {
    source_domain_id: did("SUB-MGMT"),
    target_domain_id: did("CRM"),
    data_object_id: doid("customers"),
    trigger_event: "subscription.activated",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "Subscription activation marks the account as an active customer in CRM, updates ARR rollups, and unlocks customer-success workflows. Low friction when same-vendor stack; medium when CRM and billing are separate.",
    notes: "",
  },
  {
    source_domain_id: did("SUB-MGMT"),
    target_domain_id: did("CSM"),
    data_object_id: doid("customer_entitlements"),
    trigger_event: "subscription.activated",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Subscription activation creates the matching customer_entitlements record in CSM: tier mapped to support level, named contacts seeded, SLA targets bound. Friction sits in mapping subscription plan SKUs to support tiers, which is rarely 1:1.",
    notes: "",
  },
  // Direct-purchase paths
  {
    source_domain_id: did("B2C-COMM"),
    target_domain_id: did("CRM"),
    data_object_id: doid("customers"),
    trigger_event: "customer.signed_up",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "Storefront signup creates the canonical customer record in CRM. Low friction in B2C-native stacks (Shopify Plus + HubSpot etc.); medium in stitched-together stacks.",
    notes: "",
  },
  {
    source_domain_id: did("B2C-COMM"),
    target_domain_id: did("SUB-MGMT"),
    data_object_id: doid("customer_subscriptions"),
    trigger_event: "order.subscription_purchase",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description: "Storefront order containing a subscription SKU creates the customer_subscription in SUB-MGMT, bypassing the CPQ/CLM path used for B2B deals.",
    notes: "",
  },
  // CDP-driven profile fan-out
  {
    source_domain_id: did("CDP"),
    target_domain_id: did("CRM"),
    data_object_id: doid("customers"),
    trigger_event: "profile.lifecycle_changed",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description: "CDP-detected lifecycle stage change (new → engaged → loyal → at-risk → churned) updates the customer record in CRM. Friction comes from CDP's lifecycle model not matching CRM's account-status taxonomy.",
    notes: "",
  },
  {
    source_domain_id: did("MA"),
    target_domain_id: did("CDP"),
    data_object_id: doid("customers"),
    trigger_event: "campaign.engagement_recorded",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "Marketing engagement events (email open, click, content view, form submission) feed CDP for profile enrichment and segment recomputation.",
    notes: "",
  },
  // Customer-success feedback loops — the high-friction marquee
  {
    source_domain_id: did("CSM"),
    target_domain_id: did("CRM"),
    data_object_id: doid("customers"),
    trigger_event: "case.critical_health_drop",
    integration_pattern: "api_call",
    friction_level: "high",
    description: "Cluster of critical cases or sustained low CSAT triggers an account-health-drop signal back to CRM, surfacing as a churn-risk flag on the account. High friction because the threshold definition is org-specific and the CRM-side account-health field rarely has good UX for the alert.",
    notes: "",
  },
  {
    source_domain_id: did("CRM"),
    target_domain_id: did("CSM"),
    data_object_id: doid("customer_entitlements"),
    trigger_event: "opportunity.closed_won",
    integration_pattern: "api_call",
    friction_level: "low",
    description: "Closed-won opportunity in CRM triggers entitlement provisioning in CSM ahead of (or in parallel to) subscription activation in SUB-MGMT. Important for fast onboarding of high-touch customers.",
    notes: "",
  },
  {
    source_domain_id: did("SUB-MGMT"),
    target_domain_id: did("CSM"),
    data_object_id: doid("customer_cases"),
    trigger_event: "payment.failed",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Payment failure opens a customer-success case in CSM for proactive intervention — distinct from automated dunning emails, this is the human-touch path for higher-value accounts.",
    notes: "",
  },
  {
    source_domain_id: did("CSM"),
    target_domain_id: did("SUB-MGMT"),
    data_object_id: doid("dunning_events"),
    trigger_event: "case.churn_risk_detected",
    integration_pattern: "api_call",
    friction_level: "high",
    description: "CSM-side churn-risk detection (case patterns, low CSAT, low product usage) feeds back to SUB-MGMT to influence dunning treatment, retention offers, and renewal forecasting. High friction because the churn-risk model rarely lives in SUB-MGMT's data model, requiring an event-driven adapter.",
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
// SUMMARY + leaderboards
// =============================================================================
console.log("\n=== Summary ===");
const totalDO = (await get("/data_objects?select=id")).length;
const totalDDO = (await get("/domain_data_objects?select=id&limit=20000")).length;
const totalHO = (await get("/cross_domain_handoffs?select=id&limit=20000")).length;
console.log(`  total data_objects:           ${totalDO}`);
console.log(`  total domain_data_objects:    ${totalDDO}`);
console.log(`  total cross_domain_handoffs:  ${totalHO}`);

console.log("\nMulti-master leaderboard (data_objects with role=master count > 1):");
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

console.log("\nTotal-degree leaderboard (data_objects with most domain_data_objects rows):");
const allDDORows = await get("/domain_data_objects?select=data_object_id&limit=20000");
const degCount = new Map<number, number>();
for (const r of allDDORows) {
  const id = Number(r.data_object_id);
  degCount.set(id, (degCount.get(id) ?? 0) + 1);
}
const topDegObj = [...degCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
const topNames = await get(`/data_objects?id=in.(${topDegObj.map(([id]) => id).join(",")})&select=id,data_object_name`);
const topNameById = new Map(topNames.map(r => [Number(r.id), String(r.data_object_name)]));
for (const [id, c] of topDegObj) console.log(`  ${c}×  ${topNameById.get(id)}`);

console.log("\nHandoff hotspots (top domains by total handoff degree):");
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
