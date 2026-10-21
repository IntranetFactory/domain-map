// DSPM audit additive fixes (2026-06-13)
// 1. B1B-S7: backfill source_domain_module_id on the 8 unblocked outbound handoffs
//    (285 + 288 held: direction-contested under B2-S3 / B2-S4).
//    source_domain_module_id = the DSPM module holding the trigger_event's data_object (B10b rule).
// 2. B1B-H1-RESIDUAL: tag 847/848/849 with handoff_processes -> 8.4.2 (pid 275),
//    consistent with sibling 846 (cloud-store discovery/inventory). 286/289 already tagged.
// All writes additive, record_status defaults to 'new' (omitted). No destructive edits.

async function pg(method: string, path: string, body?: unknown): Promise<string> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)], {
    stdout: "pipe", stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (err.trim()) console.error("stderr:", err.trim());
  return out;
}

// 1. source_domain_module_id backfill. event_data_object -> DSPM module:
//   341 -> 235 ; 340 -> 234 ; 337/338/339 -> 233
const sourceFkPatches: Array<{ id: number; module: number; note: string }> = [
  { id: 287, module: 235, note: "event d_o 341 sensitive_data_incidents -> 235" },
  { id: 290, module: 235, note: "event d_o 341 sensitive_data_incidents -> 235" },
  { id: 286, module: 235, note: "event d_o 341 sensitive_data_incident.detected -> 235" },
  { id: 289, module: 234, note: "event d_o 340 iam_access_policies -> 234" },
  { id: 846, module: 233, note: "event d_o 337 cloud_databases -> 233" },
  { id: 847, module: 233, note: "event d_o 338 data_warehouses -> 233" },
  { id: 848, module: 233, note: "event d_o 339 saas_app_instances -> 233" },
  { id: 849, module: 233, note: "event d_o 337 cloud_databases -> 233" },
];

console.log("=== 1. Backfill source_domain_module_id (8 outbound handoffs) ===");
for (const p of sourceFkPatches) {
  const res = await pg("PATCH", `/handoffs?id=eq.${p.id}&source_domain_module_id=is.null`, {
    source_domain_module_id: p.module,
  });
  console.log(`  handoff ${p.id} -> module ${p.module} (${p.note}) : ${res.trim() || "ok"}`);
}

// 2. handoff_processes tags for 847/848/849 -> 8.4.2 (pid 275). Idempotent via composed key check.
const tagHandoffs = [847, 848, 849];
console.log("\n=== 2. Tag 847/848/849 with handoff_processes pid 275 (8.4.2) ===");
for (const hid of tagHandoffs) {
  const existing = await pg("GET", `/handoff_processes?handoff_id=eq.${hid}&process_id=eq.275&select=handoff_id`);
  if (existing.trim() !== "[]") {
    console.log(`  handoff ${hid}: tag already present, skipping`);
    continue;
  }
  const res = await pg("POST", `/handoff_processes`, {
    handoff_id: hid,
    process_id: 275,
    proposal_source: "agent_curated",
    role: "implements",
  });
  console.log(`  handoff ${hid} -> pid 275 : ${res.trim() || "ok"}`);
}

console.log("\n=== verify ===");
console.log("source FKs:", await pg("GET", "/handoffs?source_domain_id=eq.140&select=id,source_domain_module_id&order=id.asc"));
console.log("tags 847-849:", await pg("GET", "/handoff_processes?handoff_id=in.(847,848,849)&select=handoff_id,process_id"));
