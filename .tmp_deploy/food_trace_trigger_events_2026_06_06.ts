#!/usr/bin/env bun
// B1A-S8 (FOOD-TRACE) — author the missing lifecycle / side-channel trigger_events on
// the 5 masters. event_category=lifecycle for all (state verbs; no expiry-shaped events
// in this set, the only threshold event `supplier_certification.expired` already exists).
// domain_module_id set to the realizing module that masters the event's data_object.
// Idempotent: dedup by event_name (natural key). record_status omitted (default new).

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  }
  return out;
}

// data_object -> realizing module: 494/495/496 -> 256, 497 -> 257, 498 -> 258
const events = [
  // recall_events (497) under FOOD-TRACE-RECALL-MGMT (257)
  { event_name: "recall_event.classified", data_object_id: 497, domain_module_id: 257, event_category: "lifecycle", from_state: "initiated", to_state: "classified", description: "A recall has been classified by severity (Class I/II/III); the class determines the required regulatory filing and notification path." },
  { event_name: "recall_event.notification_sent", data_object_id: 497, domain_module_id: 257, event_category: "lifecycle", from_state: "classified", to_state: "notification_sent", description: "Recall notifications have been dispatched to the affected consignees and agencies; each recipient is tracked in the communications log." },
  { event_name: "recall_event.consolidated", data_object_id: 497, domain_module_id: 257, event_category: "lifecycle", from_state: "notification_sent", to_state: "consolidating", description: "Affected lots and the consignee response set have been consolidated for the recall, establishing the working scope for reconciliation." },
  { event_name: "recall_event.reconciled", data_object_id: 497, domain_module_id: 257, event_category: "lifecycle", from_state: "consolidating", to_state: "reconciling", description: "Recovered, held, and outstanding quantities have been reconciled against the consolidated recall scope." },
  { event_name: "recall_event.effectiveness_verified", data_object_id: 497, domain_module_id: 257, event_category: "lifecycle", from_state: "reconciling", to_state: "effectiveness_verified", description: "Recall effectiveness checks have confirmed the affected product was removed from commerce; closure evidence is recorded for audit." },
  { event_name: "recall_event.terminated", data_object_id: 497, domain_module_id: 257, event_category: "lifecycle", from_state: "effectiveness_verified", to_state: "terminated", description: "The recall has been formally terminated after effectiveness verification and regulatory sign-off." },
  // traceability_lots (494) under FOOD-TRACE-TRACEABILITY-EVENTS (256)
  { event_name: "traceability_lot.split", data_object_id: 494, domain_module_id: 256, event_category: "lifecycle", from_state: "active", to_state: "split", description: "A traceability lot has been split into child lots; genealogy edges link each child back to the parent lot." },
  { event_name: "traceability_lot.merged", data_object_id: 494, domain_module_id: 256, event_category: "lifecycle", from_state: "active", to_state: "merged", description: "Two or more traceability lots have been merged into one lot; genealogy edges preserve every source lot." },
  { event_name: "traceability_lot.transformed", data_object_id: 494, domain_module_id: 256, event_category: "lifecycle", from_state: "active", to_state: "transformed", description: "A traceability lot has been transformed into a new product lot; genealogy links the output lot to its input lots." },
  { event_name: "traceability_lot.consumed", data_object_id: 494, domain_module_id: 256, event_category: "lifecycle", from_state: "active", to_state: "consumed", description: "A traceability lot has been fully consumed and is no longer available; the lot record is retained for traceability." },
  // critical_tracking_events (495) under FOOD-TRACE-TRACEABILITY-EVENTS (256)
  { event_name: "critical_tracking_event.amended", data_object_id: 495, domain_module_id: 256, event_category: "lifecycle", from_state: "validated", to_state: "amended", description: "A previously recorded critical tracking event has been amended; the prior version is retained for audit and the correction is republished." },
  // key_data_elements (496) under FOOD-TRACE-TRACEABILITY-EVENTS (256)
  { event_name: "key_data_element.validated", data_object_id: 496, domain_module_id: 256, event_category: "lifecycle", from_state: "captured", to_state: "validated", description: "A key data element has passed validation against the required traceability data format and completeness checks." },
  { event_name: "key_data_element.flagged_for_review", data_object_id: 496, domain_module_id: 256, event_category: "lifecycle", from_state: "captured", to_state: "flagged", description: "A key data element has been flagged for review due to a missing, inconsistent, or implausible value." },
  // supplier_certifications (498) under FOOD-TRACE-SUPPLIER-PROVENANCE (258)
  { event_name: "supplier_certification.uploaded", data_object_id: 498, domain_module_id: 258, event_category: "lifecycle", from_state: "", to_state: "uploaded", description: "A supplier certification document has been uploaded and is awaiting verification." },
  { event_name: "supplier_certification.renewed", data_object_id: 498, domain_module_id: 258, event_category: "lifecycle", from_state: "expiring", to_state: "renewed", description: "A supplier certification has been renewed with a current valid document; the expiry clock resets." },
  { event_name: "supplier_certification.revoked", data_object_id: 498, domain_module_id: 258, event_category: "lifecycle", from_state: "active", to_state: "revoked", description: "A supplier certification has been revoked; the supplier is blocked from new lot acceptance until a valid certification is restored." },
];

const existing = await get("/trigger_events?data_object_id=in.(494,495,496,497,498)&select=event_name");
const have = new Set(existing.map(r => String(r.event_name)));
const toInsert = events.filter(e => !have.has(e.event_name));
console.log(`trigger_events: ${events.length} proposed, ${existing.length} already present on these masters, ${toInsert.length} to insert`);
if (toInsert.length) {
  const ins = await insert("/trigger_events", toInsert);
  console.log("inserted ids:", ins.map((r: Row) => `${r.id}:${r.event_name}`).join(", "));
}
const after = await get("/trigger_events?data_object_id=in.(494,495,496,497,498)&select=id,event_name,event_category,domain_module_id&order=data_object_id.asc,id.asc");
console.log(`\nVERIFY: ${after.length} trigger_events total on FOOD-TRACE masters`);
for (const r of after) console.log(`  ${r.id} | ${r.event_name} | ${r.event_category} | mod=${r.domain_module_id ?? "null"}`);
