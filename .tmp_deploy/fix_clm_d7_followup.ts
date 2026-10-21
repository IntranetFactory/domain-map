#!/usr/bin/env bun
//
// D7 follow-up: tag the 4 handoffs that failed in the first D7 pass.
//
// Approach: substring-first PCF matching (ignore the audit's recalled
// external_id hints since they didn't match the loaded catalog). Try
// multiple search terms per row, prefer lowest hierarchy_level.

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

console.log("=== D7 follow-up: tag 4 failed handoffs ===\n");

const targets = [
  { handoff_id: 138, context: "CLM->PSA legal_contract.signed",        terms: ["Initiate engagement", "Develop project plans", "Onboard customer", "engagement", "Establish project"] },
  { handoff_id: 520, context: "CLM->CSM contract_obligation.due",      terms: ["Manage customer service requests", "Customer service requests", "Manage customer cases", "Address customer complaints"] },
  { handoff_id: 342, context: "CLM->AGENCY-MGMT legal_contract.signed",terms: ["Manage service delivery", "Deliver products and services", "Schedule and dispatch", "Manage service requests"] },
  { handoff_id: 332, context: "LEGAL-PRACT-MGMT->CLM engagement_letter.signed", terms: ["Manage legal", "Provide legal services", "Manage external counsel", "Manage professional services"] },
];

async function findPCF(terms: string[]): Promise<any | null> {
  for (const t of terms) {
    const pat = `*${t.replace(/\s+/g, "*")}*`;
    const rows = await get(`/processes?source_framework=eq.apqc_pcf_cross_industry&process_name=ilike.${encodeURIComponent(pat)}&select=id,process_name,external_id,hierarchy_level&order=hierarchy_level.asc&limit=5`);
    if (rows.length > 0) return { match: rows[0], term: t, alternates: rows.slice(1) };
  }
  return null;
}

const toInsert: any[] = [];

for (const t of targets) {
  console.log(`Handoff ${t.handoff_id} (${t.context}):`);
  const result = await findPCF(t.terms);
  if (!result) {
    console.log(`  ! no match across ${t.terms.length} search terms`);
    continue;
  }
  const m = result.match;
  console.log(`  matched on "${result.term}" -> process ${m.id} L${m.hierarchy_level} "${m.process_name}" (external_id=${m.external_id})`);
  if (result.alternates.length > 0) {
    console.log(`  alternates considered:`);
    for (const a of result.alternates) console.log(`    L${a.hierarchy_level} ${a.process_name} (${a.external_id})`);
  }
  toInsert.push({
    handoff_id: t.handoff_id,
    process_id: m.id,
    proposal_source: "agent_curated",
  });
}

if (toInsert.length === 0) {
  console.log("\nNo matches found for any failure; nothing to insert");
  process.exit(0);
}

console.log(`\nInserting ${toInsert.length} handoff_processes rows...`);
const inserted = await post("/handoff_processes", toInsert);
console.log(`${inserted.length} inserted, all record_status='new'`);

// Post-state
const ids = targets.map(t => t.handoff_id);
const final = await get(`/handoff_processes?handoff_id=in.(${ids.join(",")})&select=handoff_id,process:processes(process_name,external_id),proposal_source,record_status`);
console.log(`\n${final.length} of ${ids.length} target handoffs now have tags:`);
for (const r of final) {
  console.log(`  ${r.handoff_id}: "${r.process?.process_name}" (${r.process?.external_id}) [${r.proposal_source}, ${r.record_status}]`);
}

console.log("\n=== D7 follow-up complete ===");
