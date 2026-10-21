#!/usr/bin/env bun
//
// Add `fetch` to tools.operation_kind enum + add JsonLogic input_type_rule
// to tools.data_object_id enforcing the operation_kind ↔ data_object_id
// pairing (query/mutate require, side_effect/compute/fetch forbid, inbound optional).
//
// Idempotent: re-running is safe.

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

console.log("=== Add `fetch` to tools.operation_kind + JsonLogic on data_object_id ===\n");

// --- Step 1: read current operation_kind, add fetch if missing ---
const opKindRows = await get(`/fields?table_name=eq.tools&field_name=eq.operation_kind&select=enum_values,description`);
if (opKindRows.length !== 1) throw new Error(`Expected 1 operation_kind field, got ${opKindRows.length}`);
const opKind = opKindRows[0];

const targetEnum = ["query", "mutate", "side_effect", "compute", "inbound", "fetch"];
const targetDescription = "What shape of work the tool performs. `query` and `mutate` read or write Semantius-mastered structured business data; `fetch` reads external data via a vendor API (no Semantius-side data model); `side_effect` triggers an external action with no business-data return; `compute` is pure computation, AI, or web automation; `inbound` receives an external event or message. The Semantius score derivation reads from `coverage_tier`, not from this column.";

const enumChanged = JSON.stringify(opKind.enum_values) !== JSON.stringify(targetEnum);
const descChanged = opKind.description !== targetDescription;

if (enumChanged || descChanged) {
  await patch(
    `/fields?table_name=eq.tools&field_name=eq.operation_kind`,
    { enum_values: targetEnum, description: targetDescription },
  );
  console.log(`operation_kind: ${enumChanged ? `enum_values [${opKind.enum_values.join(", ")}] -> [${targetEnum.join(", ")}]` : "enum unchanged"}${enumChanged && descChanged ? ", " : ""}${descChanged ? "description updated" : ""}`);
} else {
  console.log(`operation_kind: already at target (enum + description)`);
}

// --- Step 2: set JsonLogic on data_object_id ---
const doiRows = await get(`/fields?table_name=eq.tools&field_name=eq.data_object_id&select=input_type_rule,description`);
if (doiRows.length !== 1) throw new Error(`Expected 1 data_object_id field, got ${doiRows.length}`);
const doi = doiRows[0];

const targetRule = {
  if: [
    { in: [{ var: "operation_kind" }, ["query", "mutate"]] }, "required",
    { in: [{ var: "operation_kind" }, ["side_effect", "compute", "fetch"]] }, "hidden",
    "default",
  ],
};
const targetDoiDescription = "Required when `operation_kind` is `query` or `mutate` (Semantius-mastered data). Must be NULL for `fetch` (external read), `side_effect` (external write), and `compute` (pure transform). Optional for `inbound` (populate when the landing target is known at the catalog level; NULL for generic inbound primitives like `receive_webhook`).";

const ruleChanged = JSON.stringify(doi.input_type_rule) !== JSON.stringify(targetRule);
const doiDescChanged = doi.description !== targetDoiDescription;

if (ruleChanged || doiDescChanged) {
  await patch(
    `/fields?table_name=eq.tools&field_name=eq.data_object_id`,
    { input_type_rule: targetRule, description: targetDoiDescription },
  );
  console.log(`data_object_id: ${ruleChanged ? "input_type_rule set" : "rule unchanged"}${ruleChanged && doiDescChanged ? ", " : ""}${doiDescChanged ? "description updated" : ""}`);
} else {
  console.log(`data_object_id: already at target`);
}

// --- Step 3: verify ---
console.log("\n=== Post-state ===");
const verify1 = await get(`/fields?table_name=eq.tools&field_name=eq.operation_kind&select=enum_values`);
console.log(`operation_kind.enum_values: ${JSON.stringify(verify1[0].enum_values)}`);
const verify2 = await get(`/fields?table_name=eq.tools&field_name=eq.data_object_id&select=input_type_rule`);
console.log(`data_object_id.input_type_rule: ${JSON.stringify(verify2[0].input_type_rule)}`);

// --- Step 4: scan existing tools for any candidates to reclassify as fetch ---
console.log("\n=== Backfill candidate scan ===");
const tools = await get(`/tools?select=id,tool_name,operation_kind,data_object_id,description&order=id.asc&limit=500`);
console.log(`${tools.length} tools in catalog. Looking for fetch candidates...`);

// Heuristic: query tools with data_object_id NULL would be the obvious fetch candidates
// (but the prior check constraint blocks that). Look for other suspicious shapes:
// - side_effect or compute tools whose description suggests external read
// - tools named "search_*", "lookup_*", "fetch_*", "get_*_from_*", "query_external_*"
const suspects = tools.filter((t: any) =>
  /^(search_|lookup_|fetch_)/.test(t.tool_name) ||
  (t.operation_kind === "compute" && /\b(search|lookup|fetch|retrieve|query)\b/i.test(t.description ?? "")) ||
  (t.operation_kind === "side_effect" && /\b(search|lookup|fetch|retrieve|query)\b/i.test(t.description ?? ""))
);
if (suspects.length === 0) {
  console.log("  No obvious fetch-candidates by name or description heuristic.");
} else {
  console.log(`  ${suspects.length} candidate(s) worth reviewing for fetch reclassification:`);
  for (const t of suspects) {
    console.log(`    id=${t.id} ${t.tool_name} [${t.operation_kind}] - ${(t.description ?? "").slice(0, 80)}`);
  }
}

console.log("\n=== Done ===");
