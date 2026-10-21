// B1B-S3: backfill source_domain_module_id on 8 outbound BPA handoffs.
// Derivation (B10b): source_domain_module_id = the BPA module holding the
// trigger_event's data_object with the strongest role. Single holder per
// data_object in BPA, so no ties:
//   247 business_process_models -> 220 (BPA-PROCESS-REPO, master)
//   248 business_capability_maps -> 221 (BPA-CAPABILITY-MAP, embedded_master)
//   249 value_streams -> 222 (BPA-VALUE-STREAM, master)
//   250 process_simulation_runs -> 222 (BPA-VALUE-STREAM, master)
// Corrective gap-fill (empty FK), no record_status touched.

const PATCHES: Array<{ id: number; source_domain_module_id: number }> = [
  { id: 180, source_domain_module_id: 220 }, // process_model.published (247)
  { id: 181, source_domain_module_id: 221 }, // capability_map.updated (248)
  { id: 182, source_domain_module_id: 220 }, // process_model.published (247)
  { id: 184, source_domain_module_id: 222 }, // value_stream.bottleneck_identified (249)
  { id: 783, source_domain_module_id: 222 }, // process_simulation_run.completed (250)
  { id: 784, source_domain_module_id: 222 }, // process_simulation_run.bottleneck_identified (250)
  { id: 785, source_domain_module_id: 222 }, // process_simulation_run.completed (250)
  { id: 786, source_domain_module_id: 222 }, // process_simulation_run.bottleneck_identified (250)
];

async function call(method: string, path: string, body?: unknown): Promise<string> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (err.trim()) console.error(`stderr(${path}): ${err.trim()}`);
  return out;
}

for (const p of PATCHES) {
  const res = await call("PATCH", `/handoffs?id=eq.${p.id}`, { source_domain_module_id: p.source_domain_module_id });
  console.log(`PATCH handoff ${p.id} -> source_domain_module_id=${p.source_domain_module_id}: ${res.trim() || "ok"}`);
}

// Re-read to confirm
const check = await call("GET", "/handoffs?source_domain_id=eq.136&select=id,source_domain_module_id&order=id.asc");
console.log("\nPost-patch source_domain_module_id:");
console.log(check.trim());
