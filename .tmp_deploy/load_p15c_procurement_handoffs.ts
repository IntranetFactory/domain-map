// P1.5c — Procurement cluster handoff backfill. Scope discovered to be lighter than agent estimated:
// SUP-LIFE and VMS already have master data_objects; only ESIGN needs Phase-1 scaffolding (1 data_object).
// Idempotent: re-runs safe.
// Run from project root: bun run .tmp_deploy/load_p15c_procurement_handoffs.ts [--dry-run]

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

// ---- Phase-1: scaffold ESIGN's envelopes data_object ----
const existingObj: { id: number }[] = await call("postgrestRequest", {
  method: "GET", path: "/data_objects?data_object_name=eq.envelopes&select=id",
});
let envelopeId: number;
if (existingObj.length > 0) {
  envelopeId = existingObj[0].id;
  console.log(`♻ envelopes data_object exists (id=${envelopeId})`);
} else if (!DRY) {
  const inserted: { id: number }[] = await call("postgrestRequest", {
    method: "POST", path: "/data_objects",
    body: [{
      data_object_name: "envelopes",
      singular_label: "Envelope",
      plural_label: "Envelopes",
      display_label: "Envelope",
      description: "An e-signature transaction wrapping one or more signature requests against a contract or document. Lifecycle: created → sent → in_progress → completed (or declined / voided / expired). Distinct from CLM's signature_records (the legal-side authoritative record of signed agreements); ESIGN's envelopes capture the e-sign-platform lifecycle while CLM consumes the completed result.",
    }],
  });
  const reread: { id: number }[] = await call("postgrestRequest", {
    method: "GET", path: "/data_objects?data_object_name=eq.envelopes&select=id",
  });
  envelopeId = reread[0].id;
  console.log(`✨ created envelopes data_object (id=${envelopeId})`);

  // Link as master under ESIGN (id 94)
  await call("postgrestRequest", {
    method: "POST", path: "/domain_data_objects",
    body: [{
      domain_id: 94, data_object_id: envelopeId, role: "master",
      notes: "ESIGN masters the e-signature envelope lifecycle (vendor-side: DocuSign, Adobe Sign, etc.); CLM consumes completed envelopes as input to its signature_records.",
    }],
  });
  console.log(`  ✨ linked ESIGN (94) as master of envelopes`);
} else {
  envelopeId = -1; // dry-run placeholder
  console.log(`(dry-run) would create envelopes data_object + domain_data_objects link`);
}

// ---- new trigger_events ----
type NewEvent = { event_name: string; data_object_id: number; from_state: string; to_state: string; description: string; event_category: "lifecycle" | "state_change" | "threshold" | "signal" };
const NEW_EVENTS: NewEvent[] = [
  { event_name: "supplier.onboarded",       data_object_id: 207, from_state: "in_progress", to_state: "onboarded", event_category: "lifecycle",
    description: "A supplier has completed onboarding (KYC, banking, tax forms, sanctions screening). Triggers vendor-master creation in ERP-FIN, AP setup, and procurement-spend enablement." },
  { event_name: "supplier.risk_elevated",   data_object_id: 209, from_state: "",            to_state: "",          event_category: "threshold",
    description: "A supplier's risk score (financial, operational, ESG, security) has crossed a threshold. GRC and procurement need to engage for re-qualification, mitigation, or replacement." },
  { event_name: "contract.expired",         data_object_id: 66,  from_state: "active",      to_state: "expired",   event_category: "lifecycle",
    description: "A contract has reached its end date without renewal. Procurement and business owners need to decide renewal, replacement, or wind-down." },
  { event_name: "contract.amended",         data_object_id: 66,  from_state: "",            to_state: "amended",   event_category: "state_change",
    description: "A contract amendment has been executed (price change, scope change, term extension). Finance needs to update payment terms, GL coding, and accruals." },
  { event_name: "envelope.completed",       data_object_id: -1,  from_state: "in_progress", to_state: "completed", event_category: "lifecycle",
    description: "An e-signature envelope has been fully signed by all required parties. Downstream: CLM persists the signed contract via signature_records; HR persists offer letters; sales-ops triggers commission and quota effects." },
];

// Resolve envelopes data_object for envelope.completed event
NEW_EVENTS[NEW_EVENTS.length - 1].data_object_id = envelopeId;

const existingEvents: { id: number; event_name: string }[] = await call("postgrestRequest", {
  method: "GET",
  path: `/trigger_events?event_name=in.(${NEW_EVENTS.map(e => e.event_name).join(",")})&select=id,event_name`,
});
const existingByName = new Map(existingEvents.map(e => [e.event_name, e.id]));
const eventsToInsert = NEW_EVENTS.filter(e => !existingByName.has(e.event_name));
console.log(`\nNew trigger_events to insert: ${eventsToInsert.length}/${NEW_EVENTS.length}`);

if (!DRY && eventsToInsert.length > 0) {
  await call("postgrestRequest", {
    method: "POST", path: "/trigger_events",
    body: eventsToInsert.map(e => ({
      event_name: e.event_name, data_object_id: e.data_object_id,
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
// domain IDs (verified): S2P=27, SUP-LIFE=28, CLM=26, VMS=64, ESIGN=94, ERP-FIN=65, AP-AUTO=29, GRC=15
// data_object IDs (verified): supplier_onboardings=207, supplier_scorecards=209, contracts=66, signature_records=70, purchase_orders=73, invoices=75

type ProposedHandoff = { source_domain_id: number; target_domain_id: number; data_object_id: number; event_name: string; integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop"; friction_level: "low" | "medium" | "high"; description: string; notes: string };
const PROPOSED: ProposedHandoff[] = [
  { source_domain_id: 28, target_domain_id: 65, data_object_id: 207, event_name: "supplier.onboarded", integration_pattern: "api_call", friction_level: "medium",
    description: "Newly-onboarded supplier triggers vendor-master creation in ERP-FIN: AP setup, payment-method record, tax-form repository. Failure modes: supplier-identity duplication when the same legal entity appears under different names; bank-detail validation delays.",
    notes: "Cross-vendor stack: SUP-LIFE often a separate platform (SAP Ariba SLP, Coupa SIM) from ERP-FIN." },
  { source_domain_id: 28, target_domain_id: 15, data_object_id: 209, event_name: "supplier.risk_elevated", integration_pattern: "api_call", friction_level: "high",
    description: "Risk-score elevation triggers GRC engagement: enhanced due diligence, mitigation plan, exit strategy if warranted. Failure modes: false-positive risk signals from third-party data; rep-attribution edge cases.",
    notes: "Probabilistic-to-deterministic: risk scoring is heuristic, GRC engagement is binding." },
  { source_domain_id: 26, target_domain_id: 27, data_object_id: 66,  event_name: "contract.expired", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Expired contracts trigger procurement renewal-decision workflow. Failure modes: auto-renewal clauses missed; silent expiry of long-tail contracts.",
    notes: "Calendar-driven; common late-binding issue." },
  { source_domain_id: 26, target_domain_id: 29, data_object_id: 66,  event_name: "contract.amended", integration_pattern: "api_call", friction_level: "medium",
    description: "Contract amendments propagate to AP-AUTO: updated payment terms, discount schedule, GL coding. Failure modes: retroactive amendments require recalculating already-paid invoices.",
    notes: "Period-coupling shape: amendments often have effective dates in past periods." },
  { source_domain_id: 94, target_domain_id: 26, data_object_id: -1,  event_name: "envelope.completed", integration_pattern: "api_call", friction_level: "low",
    description: "Completed e-signature envelopes flow into CLM as authoritative signature_records. Failure modes: identity-of-signer verification gaps; multi-party-signing edge cases.",
    notes: "Cross-platform pattern: ESIGN vendor (DocuSign, Adobe Sign) integrates with CLM via webhook or batch sync. envelopes is ESIGN-side, signature_records is CLM-side; this handoff carries the envelope and CLM constructs the matching signature_record." },
];
// Resolve handoff that uses envelopes data_object
PROPOSED[PROPOSED.length - 1].data_object_id = envelopeId;

const sourceIds = [...new Set(PROPOSED.map(p => p.source_domain_id))];
const existing: { id: number; source_domain_id: number; target_domain_id: number; trigger_event_id: number; data_object_id: number }[] = await call(
  "postgrestRequest",
  { method: "GET", path: `/cross_domain_handoffs?source_domain_id=in.(${sourceIds.join(",")})&select=id,source_domain_id,target_domain_id,trigger_event_id,data_object_id` },
);
const existingSet = new Set<string>(existing.map(h => `${h.source_domain_id}|${h.target_domain_id}|${h.trigger_event_id}|${h.data_object_id}`));
console.log(`Existing Procurement-source handoffs: ${existing.length}`);

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
console.log(`\n✓ P1.5c Procurement cluster handoff backfill complete.`);
