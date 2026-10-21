#!/usr/bin/env bun
//
// a-CLM.md processing 2026-06-16, q3 = a (B2-B3-PLAYBOOKS).
//
// Decision: keep negotiation_playbooks (1051) as its own CLM-NEGOTIATION master
// AND remove the misleading "playbook" synonym alias on contract_templates (69).
// The a-file approves option a, which explicitly enumerates removing the stale
// alias, so this destructive DELETE is authorized (Rule #21 / Rule #1: the a-file
// IS the approval for the structural step it enumerates).
//
// Ironclad and LinkSquares model a negotiation playbook (fallback positions /
// negotiation guidance) as a thing distinct from a document template; with the
// new master in place the alias on contract_templates is now misleading.
//
// Idempotent: target verified by natural key before DELETE; missing row is skipped.

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
  return stdout.trim() ? JSON.parse(stdout) : null;
}
const get = (p: string) => call({ method: "GET", path: p });
const del = (p: string) => call({ method: "DELETE", path: p });

console.log("=== q3 (B2-B3-PLAYBOOKS): DELETE stale 'playbook' alias on contract_templates (69) ===\n");

// Natural key: alias_name='playbook' on data_object_id=69 (contract_templates).
const rows = await get(
  "/data_object_aliases?data_object_id=eq.69&alias_name=eq.playbook&select=id,alias_name,alias_type,data_object_id",
);

if (!rows || rows.length === 0) {
  console.log("  - 'playbook' alias on contract_templates: already gone (nothing to delete)");
} else if (rows.length > 1) {
  console.log(`  ! ${rows.length} rows matched alias_name='playbook' on do=69; refusing to bulk-delete, inspect manually`);
  process.exit(1);
} else {
  const row = rows[0];
  await del(`/data_object_aliases?id=eq.${row.id}`);
  console.log(`  + deleted alias id=${row.id} (alias_name='${row.alias_name}', type='${row.alias_type}', data_object_id=${row.data_object_id})`);
}

console.log("\n=== Post-state: remaining aliases on contract_templates (69) ===");
const remaining = await get("/data_object_aliases?data_object_id=eq.69&select=id,alias_name,alias_type");
for (const r of remaining) {
  console.log(`  id=${r.id}: '${r.alias_name}' (${r.alias_type})`);
}
if (remaining.length === 0) console.log("  (none)");

console.log("\n=== q3 complete ===");
