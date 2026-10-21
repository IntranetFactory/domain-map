#!/usr/bin/env bun
//
// D6 (B1-S3): INSERT 5 intra-domain cross-module handoffs on CLM.
//
// Closes B9b structural partial-fail. Five lifecycle progressions within CLM:
//   (a) AUTHORING -> NEGOTIATION on legal_contract.submitted_for_review (NEW event)
//   (b) NEGOTIATION -> REPOSITORY on legal_contract.approved (D4 event 1456)
//   (c) REPOSITORY -> OBLIGATION-MGMT on legal_contract.signed (existing)
//   (d) REPOSITORY -> RENEWAL on legal_contract.active (verify event exists)
//   (e) RENEWAL -> REPOSITORY on legal_contract.renewed (existing)
//
// All rows: source_domain_id = target_domain_id = CLM, integration_pattern =
// lifecycle_progression, friction_level = low.
//
// Idempotent: events looked up by name; handoffs deduplicated by
// (trigger_event_id, source_domain_module_id, target_domain_module_id).

import { spawn } from "bun";

async function call(body: any): Promise<any> {
  const p = spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  p.stdin.end();
  const stdout = await new Response(p.stdout).text();
  const exit = await p.exited;
  if (exit !== 0) {
    const stderr = await new Response(p.stderr).text();
    throw new Error(`${body.method} ${body.path} failed (${exit}): ${stderr}`);
  }
  return JSON.parse(stdout);
}
const get = (path: string) => call({ method: "GET", path });
const post = (path: string, body: any) => call({ method: "POST", path, body });

console.log("=== D6 (B1-S3): INSERT 5 intra-domain CLM handoffs ===\n");

// Resolve CLM domain id and CLM module ids by code
const [clmDomain, clmMods, legalContractsRow] = await Promise.all([
  get("/domains?domain_code=eq.CLM&select=id"),
  get("/domain_modules?domain_module_code=in.(CLM-AUTHORING,CLM-NEGOTIATION,CLM-REPOSITORY,CLM-OBLIGATION-MGMT,CLM-RENEWAL)&select=id,domain_module_code"),
  get("/data_objects?data_object_name=eq.legal_contracts&select=id"),
]);
const clmDomainId = clmDomain[0].id;
const modIdByCode = new Map<string, number>(clmMods.map((m: any) => [m.domain_module_code, m.id]));
const legalContractsId = legalContractsRow[0].id;
console.log(`CLM domain id=${clmDomainId}, masters/modules resolved`);

// Step 1: Ensure 2 required trigger_events exist
const requiredEvents = [
  { event_name: "legal_contract.submitted_for_review", description: "Legal contract submitted for legal/counsel review; advances from AUTHORING to NEGOTIATION." },
  { event_name: "legal_contract.active",               description: "Legal contract executed and active; anchor for renewal countdown and obligation extraction." },
];
const eventNames = [
  ...requiredEvents.map(e => e.event_name),
  "legal_contract.approved",
  "legal_contract.signed",
  "legal_contract.renewed",
];
const existingEvents = await get(`/trigger_events?event_name=in.(${eventNames.join(",")})&select=id,event_name`);
const eventIdByName = new Map<string, number>(existingEvents.map((e: any) => [e.event_name, e.id]));
console.log(`Found ${existingEvents.length} of ${eventNames.length} target events`);

const toInsertEvents = requiredEvents.filter(e => !eventIdByName.has(e.event_name));
if (toInsertEvents.length > 0) {
  const rows = toInsertEvents.map(e => ({
    event_name: e.event_name,
    data_object_id: legalContractsId,
    event_category: "state_change",
    description: e.description,
  }));
  const inserted = await post("/trigger_events", rows);
  for (const r of inserted) {
    console.log(`  + inserted trigger_event id=${r.id} ${r.event_name}`);
    eventIdByName.set(r.event_name, r.id);
  }
} else {
  console.log("  - both bridge events already exist, skip");
}

// Verify every needed event is now resolvable
for (const name of eventNames) {
  if (!eventIdByName.has(name)) throw new Error(`event ${name} not found after insert`);
}

// Step 2: Build 5 handoff specs
const handoffs = [
  { source: "CLM-AUTHORING",   target: "CLM-NEGOTIATION",       event: "legal_contract.submitted_for_review" },
  { source: "CLM-NEGOTIATION", target: "CLM-REPOSITORY",        event: "legal_contract.approved" },
  { source: "CLM-REPOSITORY",  target: "CLM-OBLIGATION-MGMT",   event: "legal_contract.signed" },
  { source: "CLM-REPOSITORY",  target: "CLM-RENEWAL",           event: "legal_contract.active" },
  { source: "CLM-RENEWAL",     target: "CLM-REPOSITORY",        event: "legal_contract.renewed" },
];

// Step 3: Dedupe by (trigger_event_id, source_module, target_module) and insert
console.log("\nInserting handoffs:");
let inserted = 0;
let skipped = 0;
for (const h of handoffs) {
  const eventId = eventIdByName.get(h.event)!;
  const srcMod = modIdByCode.get(h.source)!;
  const tgtMod = modIdByCode.get(h.target)!;
  const existing = await get(`/handoffs?trigger_event_id=eq.${eventId}&source_domain_module_id=eq.${srcMod}&target_domain_module_id=eq.${tgtMod}&select=id`);
  if (existing.length > 0) {
    console.log(`  - ${h.source} -> ${h.target} on ${h.event}: already exists (id=${existing[0].id}), skip`);
    skipped++;
    continue;
  }
  const result = await post("/handoffs", [{
    source_domain_id: clmDomainId,
    target_domain_id: clmDomainId,
    source_domain_module_id: srcMod,
    target_domain_module_id: tgtMod,
    trigger_event_id: eventId,
    data_object_id: legalContractsId,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
  }]);
  console.log(`  + ${h.source} -> ${h.target} on ${h.event}: inserted id=${result[0].id}`);
  inserted++;
}

console.log(`\nResult: ${inserted} inserted, ${skipped} already-existed`);

// Step 4: Post-state check
console.log("\n=== Post-state ===");
const intra = await get(`/handoffs?source_domain_id=eq.${clmDomainId}&target_domain_id=eq.${clmDomainId}&select=id,integration_pattern,trigger_event:trigger_events(event_name),source_module:domain_modules!handoffs_source_domain_module_id_fkey(domain_module_code),target_module:domain_modules!handoffs_target_domain_module_id_fkey(domain_module_code)&order=id.asc`);
console.log(`${intra.length} intra-domain CLM handoff rows total:`);
for (const r of intra) {
  console.log(`  id=${r.id} ${r.source_module?.domain_module_code} -> ${r.target_module?.domain_module_code} on ${r.trigger_event?.event_name} (${r.integration_pattern})`);
}

console.log("\n=== D6 complete ===");
