#!/usr/bin/env bun
//
// D7 (B1-H1): APQC tagging for 26 CLM cross-domain handoffs.
//
// Closes H1 hard-fail (only 3 of 26 handoffs tagged, all weak
// `discovery_substring`). Authors `agent_curated` tags from the audit's
// proposed PCF parent table.
//
// Three categories:
//   INSERT      - 23 new tags, lookup PCF by external_id or substring
//   FLIP        - 2 existing discovery_substring rows (handoffs 62, 40)
//                 stay on the same process_id; flip proposal_source only
//   REPLACE     - 1 existing row (343) gets a different process_id +
//                 proposal_source flip
//
// All rows ship `record_status='new'` per Rule #1.

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
const patch = (path: string, body: any) => call({ method: "PATCH", path, body });

console.log("=== D7 (B1-H1): APQC tagging for 26 CLM cross-domain handoffs ===\n");

type Spec = {
  handoff_id: number;
  action: "INSERT" | "FLIP" | "REPLACE";
  external_id?: string;     // PCF external_id (preferred lookup)
  search?: string[];        // substring fallback, tried in order
};

const specs: Spec[] = [
  // Outbound CLM -> other domains
  { handoff_id: 138, action: "INSERT", search: ["Manage project portfolio", "Initiate engagement"] },
  { handoff_id: 41,  action: "INSERT", external_id: "10218" },                                          // Order materials and services
  { handoff_id: 215, action: "INSERT", external_id: "10222" },                                          // Manage suppliers
  { handoff_id: 216, action: "INSERT", external_id: "10744" },                                          // Process accounts payable
  { handoff_id: 517, action: "INSERT", external_id: "10395" },                                          // Develop and manage sales proposals
  { handoff_id: 518, action: "INSERT", external_id: "10796" },                                          // Process revenue accounting
  { handoff_id: 519, action: "INSERT", search: ["Manage subscriptions", "Order materials"] },
  { handoff_id: 520, action: "INSERT", external_id: "10408" },                                          // Manage customer service requests
  { handoff_id: 521, action: "INSERT", external_id: "16437" },                                          // Manage business unit ethics and compliance
  { handoff_id: 522, action: "INSERT", external_id: "10401" },                                          // Manage sales partners
  { handoff_id: 46,  action: "INSERT", external_id: "10222" },                                          // Manage suppliers (SaaS renewal)
  { handoff_id: 63,  action: "INSERT", search: ["Manage customer accounts", "Process subscriptions"] },
  { handoff_id: 342, action: "INSERT", external_id: "10408" },                                          // Manage service delivery / customer service
  // Inbound from other domains -> CLM
  { handoff_id: 44,  action: "INSERT", external_id: "10222" },                                          // Manage suppliers
  { handoff_id: 62,  action: "FLIP" },                                                                  // existing 11779 stays, flip source
  { handoff_id: 217, action: "INSERT", search: ["Manage IT services", "Process documents"] },
  { handoff_id: 309, action: "INSERT", external_id: "10778" },                                          // Manage real estate
  { handoff_id: 332, action: "INSERT", external_id: "16513" },                                          // Manage legal counsel and services
  { handoff_id: 339, action: "INSERT", external_id: "10741" },                                          // Manage accounting and reporting
  { handoff_id: 343, action: "REPLACE", search: ["Manage customer accounts"] },                         // existing weak; replace with this
  { handoff_id: 602, action: "INSERT", external_id: "10277" },                                          // Develop sourcing strategies
  { handoff_id: 40,  action: "FLIP" },                                                                  // existing sourcing-governance stays, flip source
  { handoff_id: 469, action: "INSERT", external_id: "10004" },                                          // Sell products and services
  { handoff_id: 482, action: "INSERT", external_id: "11779" },                                          // Develop and manage sales proposals
  { handoff_id: 1014, action: "INSERT", external_id: "11779" },                                         // Develop and manage sales proposals
  { handoff_id: 1020, action: "INSERT", external_id: "10773" },                                         // Manage project finances
];

console.log(`${specs.length} candidate specs: ${specs.filter(s => s.action === "INSERT").length} INSERT, ${specs.filter(s => s.action === "FLIP").length} FLIP, ${specs.filter(s => s.action === "REPLACE").length} REPLACE\n`);

// Helper: resolve a PCF process given external_id or substring search list
async function resolveProcess(spec: Spec): Promise<{ id: number; process_name: string; external_id: string } | null> {
  if (spec.external_id) {
    const rows = await get(`/processes?source_framework=eq.apqc_pcf_cross_industry&external_id=eq.${spec.external_id}&select=id,process_name,external_id`);
    if (rows.length > 0) return rows[0];
  }
  if (spec.search) {
    for (const term of spec.search) {
      // ILIKE pattern: percent-escaped spaces are %20 but PostgREST accepts spaces as %20 or +; use *
      const pat = `*${term.replace(/\s+/g, "*")}*`;
      const rows = await get(`/processes?source_framework=eq.apqc_pcf_cross_industry&process_name=ilike.${encodeURIComponent(pat)}&select=id,process_name,external_id,hierarchy_level&order=hierarchy_level.asc&limit=5`);
      if (rows.length > 0) return rows[0];
    }
  }
  return null;
}

// Resolve handoffs by id and existing handoff_processes rows
const allIds = specs.map(s => s.handoff_id);
const [handoffs, existingHP] = await Promise.all([
  get(`/handoffs?id=in.(${allIds.join(",")})&select=id`),
  get(`/handoff_processes?handoff_id=in.(${allIds.join(",")})&select=handoff_id,process_id,proposal_source,record_status,id`),
]);
console.log(`Verified ${handoffs.length} of ${allIds.length} handoffs exist`);
console.log(`${existingHP.length} existing handoff_processes rows on those handoffs\n`);

const existingByHandoff = new Map<number, any>(existingHP.map((r: any) => [r.handoff_id, r]));

const toInsert: any[] = [];
const toPatch: Array<{ id: number; body: any }> = [];
const errors: string[] = [];

for (const spec of specs) {
  if (spec.action === "INSERT") {
    if (existingByHandoff.has(spec.handoff_id)) {
      console.log(`  ! ${spec.handoff_id}: existing row found, skip INSERT (re-run with FLIP/REPLACE if intended)`);
      continue;
    }
    const proc = await resolveProcess(spec);
    if (!proc) {
      console.log(`  ! ${spec.handoff_id}: PCF lookup failed (${spec.external_id ?? spec.search?.join(" | ")}), skip`);
      errors.push(`${spec.handoff_id}: PCF lookup failed`);
      continue;
    }
    toInsert.push({
      handoff_id: spec.handoff_id,
      process_id: proc.id,
      proposal_source: "agent_curated",
      // record_status: omitted, DB default 'new' fires per Rule #1
    });
    console.log(`  + ${spec.handoff_id} -> process ${proc.id} (${proc.external_id}) ${proc.process_name}`);
  } else if (spec.action === "FLIP") {
    const ex = existingByHandoff.get(spec.handoff_id);
    if (!ex) { console.log(`  ! ${spec.handoff_id}: FLIP requested but no existing row, skip`); continue; }
    if (ex.proposal_source === "agent_curated") {
      console.log(`  - ${spec.handoff_id}: already agent_curated, skip`);
      continue;
    }
    toPatch.push({ id: ex.id, body: { proposal_source: "agent_curated" } });
    console.log(`  ~ ${spec.handoff_id}: FLIP proposal_source ${ex.proposal_source} -> agent_curated (keep process_id ${ex.process_id})`);
  } else if (spec.action === "REPLACE") {
    const ex = existingByHandoff.get(spec.handoff_id);
    if (!ex) { console.log(`  ! ${spec.handoff_id}: REPLACE requested but no existing row, skip`); continue; }
    const proc = await resolveProcess(spec);
    if (!proc) {
      console.log(`  ! ${spec.handoff_id}: REPLACE PCF lookup failed, skip`);
      errors.push(`${spec.handoff_id}: REPLACE lookup failed`);
      continue;
    }
    toPatch.push({ id: ex.id, body: { process_id: proc.id, proposal_source: "agent_curated" } });
    console.log(`  ~ ${spec.handoff_id}: REPLACE process_id ${ex.process_id} -> ${proc.id} (${proc.process_name}), flip source`);
  }
}

// Execute INSERTs in one bulk POST
if (toInsert.length > 0) {
  console.log(`\nInserting ${toInsert.length} new handoff_processes rows...`);
  const inserted = await post("/handoff_processes", toInsert);
  console.log(`  ${inserted.length} inserted`);
}

// Execute PATCHes
if (toPatch.length > 0) {
  console.log(`\nApplying ${toPatch.length} PATCHes...`);
  for (const p of toPatch) {
    await patch(`/handoff_processes?id=eq.${p.id}`, p.body);
    console.log(`  patched id=${p.id}: ${JSON.stringify(p.body)}`);
  }
}

if (errors.length > 0) {
  console.log(`\n!! ${errors.length} errors:`);
  for (const e of errors) console.log(`  - ${e}`);
}

// Post-state check
console.log("\n=== Post-state ===");
const finalHP = await get(`/handoff_processes?handoff_id=in.(${allIds.join(",")})&select=handoff_id,process_id,proposal_source,record_status,process:processes(process_name,external_id)&order=handoff_id.asc`);
const byHandoff = new Map<number, any[]>();
for (const r of finalHP) {
  const arr = byHandoff.get(r.handoff_id) ?? [];
  arr.push(r);
  byHandoff.set(r.handoff_id, arr);
}
let tagged = 0;
for (const id of allIds) {
  if (byHandoff.has(id)) tagged++;
}
console.log(`${tagged} of ${allIds.length} target handoffs now have tags`);

const proposalSourceCounts = new Map<string, number>();
const statusCounts = new Map<string, number>();
for (const r of finalHP) {
  proposalSourceCounts.set(r.proposal_source, (proposalSourceCounts.get(r.proposal_source) ?? 0) + 1);
  statusCounts.set(r.record_status, (statusCounts.get(r.record_status) ?? 0) + 1);
}
console.log("Proposal source distribution:");
for (const [s, n] of proposalSourceCounts) console.log(`  ${s}: ${n}`);
console.log("Record status distribution:");
for (const [s, n] of statusCounts) console.log(`  ${s}: ${n}`);

console.log("\n=== D7 complete ===");
