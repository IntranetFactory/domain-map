#!/usr/bin/env bun
// CRM audit Phase 2 fixes (2026-05-25):
//   B9  — insert trigger_event `crm_lead.converted` (data_object_id=99, lifecycle).
//   B9b — insert 4 intra-CRM handoff rows (source_domain_id = target_domain_id = 69):
//           47 -> 46 on crm_lead.converted    payload customers (97)
//           47 -> 46 on crm_lead.converted    payload crm_contacts (98)
//           47 -> 48 on crm_lead.converted    payload crm_opportunities (100)
//           48 -> 46 on crm_opportunity.closed_won (id=84) payload customers (97)
//
// Idempotent: queries existing event by event_name; queries existing intra-CRM
// handoffs by (source_module, target_module, trigger_event_id, data_object_id)
// before inserting.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
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
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

const CRM_ID = 69;
const EVENT_NAME = "crm_lead.converted";
const EVENT_DESCRIPTION =
  "A CRM lead has been converted into a customer (account), contact, and optionally an opportunity. Suppresses ongoing nurture in MA, primes onboarding-readiness signals, and feeds funnel-conversion analytics in revenue intelligence.";

// ============================================================
// B9 — trigger event
// ============================================================
console.log(`B9: ensuring trigger_event '${EVENT_NAME}' exists`);

let existingEvent = await get(
  `/trigger_events?event_name=eq.${EVENT_NAME}&select=id,event_name,event_category,data_object_id`,
);
let eventId: number;
if (existingEvent.length > 0) {
  eventId = Number(existingEvent[0].id);
  console.log(`  already present: id=${eventId}`);
} else {
  const inserted = await insert("/trigger_events", [
    {
      event_name: EVENT_NAME,
      event_category: "lifecycle",
      data_object_id: 99,
      description: EVENT_DESCRIPTION,
    },
  ]);
  // PostgREST returns inserted rows when Prefer: return=representation; if not,
  // re-read to pick up the assigned id.
  if (inserted.length > 0 && inserted[0].id !== undefined) {
    eventId = Number(inserted[0].id);
  } else {
    const refetch = await get(
      `/trigger_events?event_name=eq.${EVENT_NAME}&select=id`,
    );
    if (refetch.length === 0) {
      throw new Error("Inserted trigger_event not found on refetch");
    }
    eventId = Number(refetch[0].id);
  }
  console.log(`  inserted: id=${eventId}`);
}

// Existing event id for closed-won — confirm by name
const closedWon = await get(
  `/trigger_events?event_name=eq.crm_opportunity.closed_won&select=id`,
);
if (closedWon.length !== 1) {
  throw new Error(
    `Expected exactly 1 trigger_event for crm_opportunity.closed_won, found ${closedWon.length}`,
  );
}
const closedWonId = Number(closedWon[0].id);
console.log(`  crm_opportunity.closed_won id=${closedWonId}`);

// ============================================================
// B9b — intra-CRM handoffs
// ============================================================
console.log(`\nB9b: ensuring 4 intra-CRM handoff rows exist`);

type HandoffSpec = {
  source_module: number;
  target_module: number;
  trigger_event_id: number;
  data_object_id: number;
  notes: string;
};

const specs: HandoffSpec[] = [
  {
    source_module: 47,
    target_module: 46,
    trigger_event_id: eventId,
    data_object_id: 97,
    notes:
      "Intra-CRM lifecycle progression: lead conversion materializes the account (customers) record in CRM-ACCT-MGT.",
  },
  {
    source_module: 47,
    target_module: 46,
    trigger_event_id: eventId,
    data_object_id: 98,
    notes:
      "Intra-CRM lifecycle progression: lead conversion materializes the contact (crm_contacts) record in CRM-ACCT-MGT.",
  },
  {
    source_module: 47,
    target_module: 48,
    trigger_event_id: eventId,
    data_object_id: 100,
    notes:
      "Intra-CRM lifecycle progression: optional opportunity is created at lead-conversion time when the lead carries a deal signal.",
  },
  {
    source_module: 48,
    target_module: 46,
    trigger_event_id: closedWonId,
    data_object_id: 97,
    notes:
      "Intra-CRM lifecycle progression: closed-won opportunity transitions the account (customers) to active-customer state and primes expansion-ready signals in CRM-ACCT-MGT.",
  },
];

// Pre-query existing intra-CRM handoffs for idempotency
const existingIntra = await get(
  `/handoffs?source_domain_id=eq.${CRM_ID}&target_domain_id=eq.${CRM_ID}&select=id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id`,
);
console.log(`  existing intra-CRM handoffs: ${existingIntra.length}`);

const key = (r: { source_domain_module_id: number; target_domain_module_id: number; trigger_event_id: number; data_object_id: number }) =>
  `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.trigger_event_id}|${r.data_object_id}`;

const existingKeys = new Set(
  existingIntra.map(r => key({
    source_domain_module_id: Number(r.source_domain_module_id),
    target_domain_module_id: Number(r.target_domain_module_id),
    trigger_event_id: Number(r.trigger_event_id),
    data_object_id: Number(r.data_object_id),
  })),
);

const toInsert = specs.filter(s => !existingKeys.has(
  key({
    source_domain_module_id: s.source_module,
    target_domain_module_id: s.target_module,
    trigger_event_id: s.trigger_event_id,
    data_object_id: s.data_object_id,
  }),
));

console.log(`  to insert: ${toInsert.length}`);

if (toInsert.length > 0) {
  await insert(
    "/handoffs",
    toInsert.map(s => ({
      source_domain_id: CRM_ID,
      target_domain_id: CRM_ID,
      source_domain_module_id: s.source_module,
      target_domain_module_id: s.target_module,
      trigger_event_id: s.trigger_event_id,
      data_object_id: s.data_object_id,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      notes: s.notes,
    })),
  );
}

const afterIntra = await get(
  `/handoffs?source_domain_id=eq.${CRM_ID}&target_domain_id=eq.${CRM_ID}&select=id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,integration_pattern,friction_level`,
);
console.log(`  final intra-CRM handoff rows: ${afterIntra.length}`);
for (const r of afterIntra) {
  console.log(
    `    - id=${r.id}  ${r.source_domain_module_id}->${r.target_domain_module_id}  evt=${r.trigger_event_id}  payload=${r.data_object_id}  ${r.integration_pattern}/${r.friction_level}`,
  );
}

console.log("\nPhase 2 complete.");
console.log("UI:");
console.log(`  https://tests.semantius.app/domain_map/trigger_events?event_name=eq.${EVENT_NAME}`);
console.log(`  https://tests.semantius.app/domain_map/handoffs?source_domain_id=eq.${CRM_ID}&target_domain_id=eq.${CRM_ID}`);
