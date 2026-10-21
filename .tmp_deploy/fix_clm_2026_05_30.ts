#!/usr/bin/env bun
//
// CLM Bucket-1 mechanical fixes from the 2026-05-30 audit walk-through.
//
// D1 (B1-S2): PATCH 5 trigger_events to set event_category
// D2 (B1-S7): DELETE duplicate role_modules row for SALES-TRANSACTION-COORDINATOR
// D3 (B1-S9): PATCH handoff 1020 set target_domain_module_id=128
// D4 (B1-S4): INSERT 9 missing trigger_events for workflow-gate states
//
// Idempotent: re-running is safe (each step checks pre-state).

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
const patch = (path: string, body: any) => call({ method: "PATCH", path, body });
const del = (path: string) => call({ method: "DELETE", path });
const post = (path: string, body: any) => call({ method: "POST", path, body });

console.log("=== CLM Bucket-1 mechanical fixes (2026-05-30 walk) ===\n");

// ---------- D1 (B1-S2): event_category PATCHes ----------
console.log("D1 (B1-S2): PATCH event_category on 5 trigger_events");
const d1Targets = [
  { id: 531, name: "contract_obligation.due", value: "lifecycle" },
  { id: 532, name: "contract_obligation.breached", value: "state_change" },
  { id: 533, name: "contract_clause.flagged", value: "state_change" },
  { id: 534, name: "contract_template.published", value: "state_change" },
  { id: 535, name: "signature_record.completed", value: "state_change" },
];
const d1Pre = await get(`/trigger_events?id=in.(${d1Targets.map(t => t.id).join(",")})&select=id,event_name,event_category`);
const d1ById = new Map<number, any>(d1Pre.map((r: any) => [r.id, r]));
let d1Applied = 0;
let d1Skipped = 0;
for (const t of d1Targets) {
  const pre = d1ById.get(t.id);
  if (!pre) { console.log(`  ! ${t.id} ${t.name}: not found, skipping`); continue; }
  if (pre.event_name !== t.name) { console.log(`  ! ${t.id} expected '${t.name}', got '${pre.event_name}', skipping`); continue; }
  if (pre.event_category === t.value) { console.log(`  - ${t.id} ${t.name}: already '${t.value}', skip`); d1Skipped++; continue; }
  if (pre.event_category && pre.event_category !== "") { console.log(`  ! ${t.id} ${t.name}: existing value '${pre.event_category}' != target '${t.value}', skipping`); continue; }
  await patch(`/trigger_events?id=eq.${t.id}`, { event_category: t.value });
  console.log(`  + ${t.id} ${t.name}: '' -> '${t.value}'`);
  d1Applied++;
}
console.log(`D1 result: ${d1Applied} applied, ${d1Skipped} already-correct\n`);

// ---------- D2 (B1-S7): DELETE duplicate role_modules row ----------
console.log("D2 (B1-S7): DELETE duplicate role_modules for SALES-TRANSACTION-COORDINATOR on CLM-REPOSITORY");
// Resolve role and module ids by code (safer than hard-coded ids)
const stcRole = await get(`/roles?role_code=eq.SALES-TRANSACTION-COORDINATOR&select=id`);
const clmRepo = await get(`/domain_modules?domain_module_code=eq.CLM-REPOSITORY&select=id`);
if (stcRole.length === 0 || clmRepo.length === 0) {
  console.log(`  ! role or module not found (role=${stcRole.length}, module=${clmRepo.length}), skipping`);
} else {
  const roleId = stcRole[0].id;
  const moduleId = clmRepo[0].id;
  const rows = await get(`/role_modules?role_id=eq.${roleId}&domain_module_id=eq.${moduleId}&select=id,interaction_level`);
  console.log(`  found ${rows.length} role_modules rows for (${roleId}, ${moduleId})`);
  if (rows.length <= 1) {
    console.log(`  - already deduped (${rows.length} rows), skip`);
  } else {
    // DELETE all duplicates beyond the first. Use the lowest-id as the canonical keep.
    const sorted = [...rows].sort((a: any, b: any) => a.id - b.id);
    const keep = sorted[0];
    const toDelete = sorted.slice(1);
    console.log(`  keeping id=${keep.id}, deleting ${toDelete.length} duplicate(s)`);
    for (const r of toDelete) {
      await del(`/role_modules?id=eq.${r.id}`);
      console.log(`  + deleted id=${r.id}`);
    }
  }
}
console.log("D2 done\n");

// ---------- D3 (B1-S9): PATCH handoff 1020 set target_domain_module_id=128 ----------
console.log("D3 (B1-S9): PATCH handoff 1020 set target_domain_module_id=128 (CLM-OBLIGATION-MGMT)");
const h1020 = await get(`/handoffs?id=eq.1020&select=id,target_domain_id,target_domain_module_id`);
if (h1020.length === 0) {
  console.log(`  ! handoff 1020 not found, skipping`);
} else if (h1020[0].target_domain_module_id === 128) {
  console.log(`  - already at target_domain_module_id=128, skip`);
} else if (h1020[0].target_domain_module_id != null) {
  console.log(`  ! existing target_domain_module_id=${h1020[0].target_domain_module_id} != 128, skipping`);
} else {
  // Verify module 128 is in target_domain (CLM) before patching
  const targetDom = h1020[0].target_domain_id;
  const mod128 = await get(`/domain_modules?id=eq.128&select=id,domain_id,domain_module_code`);
  if (mod128.length === 0 || mod128[0].domain_id !== targetDom) {
    console.log(`  ! module 128 not in target domain ${targetDom}, skipping`);
  } else {
    await patch(`/handoffs?id=eq.1020`, { target_domain_module_id: 128 });
    console.log(`  + handoff 1020: target_domain_module_id NULL -> 128 (${mod128[0].domain_module_code})`);
  }
}
console.log("D3 done\n");

// ---------- D4 (B1-S4): INSERT 9 missing trigger_events ----------
console.log("D4 (B1-S4): INSERT 9 missing trigger_events for workflow-gate states");
// Resolve master data_object ids by name
const masterNames = ["legal_contracts", "contract_clauses", "contract_templates", "contract_obligations", "signature_records"];
const masters = await get(`/data_objects?data_object_name=in.(${masterNames.join(",")})&select=id,data_object_name`);
const masterByName = new Map<string, number>(masters.map((m: any) => [m.data_object_name, m.id]));
for (const n of masterNames) {
  if (!masterByName.has(n)) throw new Error(`master ${n} not found`);
}

const d4Targets = [
  { event_name: "legal_contract.approved",        master: "legal_contracts",      category: "state_change", description: "Legal contract approved by counsel; advances to NEGOTIATION->REPOSITORY handoff." },
  { event_name: "legal_contract.terminated",      master: "legal_contracts",      category: "state_change", description: "Legal contract terminated (early exit before expiry)." },
  { event_name: "contract_clause.approved",       master: "contract_clauses",     category: "state_change", description: "Clause approved into the canonical library." },
  { event_name: "contract_clause.deprecated",     master: "contract_clauses",     category: "state_change", description: "Clause deprecated; no longer offered in new contracts but retained for historical references." },
  { event_name: "contract_template.approved",     master: "contract_templates",   category: "state_change", description: "Template approved for use in drafting new contracts." },
  { event_name: "contract_template.deprecated",   master: "contract_templates",   category: "state_change", description: "Template deprecated; new drafts must use a successor." },
  { event_name: "contract_obligation.satisfied",  master: "contract_obligations", category: "state_change", description: "Obligation deliverable confirmed satisfied; closes the obligation record." },
  { event_name: "contract_obligation.waived",     master: "contract_obligations", category: "state_change", description: "Obligation waived by mutual agreement of the parties." },
  { event_name: "signature_record.voided",        master: "signature_records",    category: "state_change", description: "Signature record voided (e.g., signed in error or withdrawn before counter-signature)." },
];

// Idempotency: skip events whose event_name already exists.
const existing = await get(`/trigger_events?event_name=in.(${d4Targets.map(t => t.event_name).join(",")})&select=id,event_name`);
const existingNames = new Set(existing.map((r: any) => r.event_name));
const toInsert = d4Targets.filter(t => !existingNames.has(t.event_name));
console.log(`  ${existing.length} of ${d4Targets.length} already exist, inserting ${toInsert.length}`);

if (toInsert.length > 0) {
  const rows = toInsert.map(t => ({
    event_name: t.event_name,
    data_object_id: masterByName.get(t.master)!,
    event_category: t.category,
    description: t.description,
    // record_status omitted: DB default 'new' fires per Rule #1
  }));
  const inserted = await post("/trigger_events", rows);
  for (const r of inserted) console.log(`  + inserted id=${r.id} ${r.event_name}`);
}
console.log(`D4 result: ${toInsert.length} inserted, ${existing.length} already existed\n`);

// ---------- Post-state check ----------
console.log("=== Post-state checks ===");
const postD1 = await get(`/trigger_events?id=in.(531,532,533,534,535)&select=id,event_name,event_category&order=id.asc`);
console.log("D1 post:");
for (const r of postD1) console.log(`  ${r.id} ${r.event_name}: event_category='${r.event_category}'`);

const stcRoleId = stcRole[0]?.id;
const clmRepoId = clmRepo[0]?.id;
if (stcRoleId && clmRepoId) {
  const postD2 = await get(`/role_modules?role_id=eq.${stcRoleId}&domain_module_id=eq.${clmRepoId}&select=id,interaction_level`);
  console.log(`D2 post: ${postD2.length} role_modules row(s) for SALES-TRANSACTION-COORDINATOR x CLM-REPOSITORY`);
}

const postD3 = await get(`/handoffs?id=eq.1020&select=id,target_domain_module_id`);
console.log(`D3 post: handoff 1020 target_domain_module_id=${postD3[0]?.target_domain_module_id}`);

const postD4 = await get(`/trigger_events?event_name=in.(${d4Targets.map(t => t.event_name).join(",")})&select=event_name,event_category,record_status&order=event_name.asc`);
console.log(`D4 post: ${postD4.length} of 9 target events present`);
for (const r of postD4) console.log(`  ${r.event_name}: category='${r.event_category}', status='${r.record_status}'`);

console.log("\n=== All four decisions complete ===");
