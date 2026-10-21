#!/usr/bin/env bun
//
// D5 (B2-S1 + B1-S1): DELETE 8 sibling consumer DMDO rows on CLM masters.
//
// Resolves M7 within-domain incoherence: legal_contracts mastered by
// CLM-REPOSITORY but consumed in 4 sibling CLM modules; contract_clauses
// and contract_templates mastered by CLM-AUTHORING but consumed in
// sibling CLM modules. Market practice (Icertis, Ironclad, DocuSign CLM,
// Sirion, ContractPodAi, Workday Evisort, et al) is one canonical contract
// record consumed by every workflow; sibling modules read by reference.
//
// Idempotent: each target verified before DELETE; missing rows are skipped.

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
const get = (p: string) => call({ method: "GET", path: p });
const del = (p: string) => call({ method: "DELETE", path: p });

console.log("=== D5 (B2-S1 + B1-S1): DELETE 8 sibling consumer DMDO rows ===\n");

// Each target: (module_id, data_object_id, expected role='consumer').
// Same as the audit's B1-S1 enumeration.
const targets = [
  { module_id: 125, data_object_id: 66, master: "legal_contracts",    module_code: "CLM-AUTHORING" },
  { module_id: 126, data_object_id: 66, master: "legal_contracts",    module_code: "CLM-NEGOTIATION" },
  { module_id: 128, data_object_id: 66, master: "legal_contracts",    module_code: "CLM-OBLIGATION-MGMT" },
  { module_id: 129, data_object_id: 66, master: "legal_contracts",    module_code: "CLM-RENEWAL" },
  { module_id: 126, data_object_id: 68, master: "contract_clauses",   module_code: "CLM-NEGOTIATION" },
  { module_id: 127, data_object_id: 68, master: "contract_clauses",   module_code: "CLM-REPOSITORY" },
  { module_id: 126, data_object_id: 69, master: "contract_templates", module_code: "CLM-NEGOTIATION" },
  { module_id: 129, data_object_id: 69, master: "contract_templates", module_code: "CLM-RENEWAL" },
];

let deleted = 0;
let skippedAlreadyGone = 0;
let skippedWrongRole = 0;

for (const t of targets) {
  const path = `/domain_module_data_objects?domain_module_id=eq.${t.module_id}&data_object_id=eq.${t.data_object_id}&role=eq.consumer&select=id,role,necessity`;
  const rows = await get(path);
  if (rows.length === 0) {
    // Verify it's actually gone (vs. role got changed to something else)
    const anyRole = await get(`/domain_module_data_objects?domain_module_id=eq.${t.module_id}&data_object_id=eq.${t.data_object_id}&select=role`);
    if (anyRole.length === 0) {
      console.log(`  - (${t.module_code}, ${t.master}) consumer: already gone`);
      skippedAlreadyGone++;
    } else {
      console.log(`  ! (${t.module_code}, ${t.master}): present with role='${anyRole[0].role}' (not consumer); skip`);
      skippedWrongRole++;
    }
    continue;
  }
  if (rows.length > 1) {
    console.log(`  ! (${t.module_code}, ${t.master}): ${rows.length} consumer rows found, skipping`);
    continue;
  }
  const row = rows[0];
  await del(`/domain_module_data_objects?id=eq.${row.id}`);
  console.log(`  + deleted (${t.module_code}, ${t.master}, consumer + ${row.necessity}): id=${row.id}`);
  deleted++;
}

console.log(`\nResult: ${deleted} deleted, ${skippedAlreadyGone} already-gone, ${skippedWrongRole} wrong-role-skip\n`);

// ---- Post-state verification ----
console.log("=== Post-state ===");
const masterIds = [66, 68, 69];
const cleanQuery = `/domain_module_data_objects?domain_module_id=in.(125,126,127,128,129)&data_object_id=in.(${masterIds.join(",")})&select=domain_module_id,data_object_id,role,necessity,domain_modules(domain_module_code),data_objects(data_object_name)&order=domain_module_id.asc,data_object_id.asc`;
const remaining = await get(cleanQuery);
console.log(`${remaining.length} DMDO rows remain on (CLM modules x [66, 68, 69]):`);
for (const r of remaining) {
  console.log(`  ${r.domain_modules.domain_module_code} x ${r.data_objects.data_object_name}: role=${r.role}, necessity=${r.necessity}`);
}

// M7 cross-check: for each master, exactly one row with role='master' should remain.
console.log("\nM7 verification (one master row per data_object across CLM):");
for (const id of masterIds) {
  const masters = remaining.filter((r: any) => r.data_object_id === id && r.role === "master");
  const others = remaining.filter((r: any) => r.data_object_id === id && r.role !== "master");
  const name = remaining.find((r: any) => r.data_object_id === id)?.data_objects.data_object_name ?? `id=${id}`;
  console.log(`  ${name}: ${masters.length} master row(s), ${others.length} non-master row(s)`);
}

console.log("\n=== D5 complete ===");
