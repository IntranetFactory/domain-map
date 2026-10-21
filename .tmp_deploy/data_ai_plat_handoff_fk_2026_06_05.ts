#!/usr/bin/env bun
// B1A-S2-OUTBOUND-FK + B1A-S3-INBOUND-FK (backed subset) for DATA-AI-PLAT (domain 129).
// Prior value on every patched FK column = NULL (snapshotted in history.md).
//
// OUTBOUND source_domain_module_id (per trigger_event data_object -> owning module, B10b):
//   151->224 152->224 153->226 154->223 155->224 156->223 682->225 683->225 684->225 685->225 686->225
// INBOUND target_domain_module_id (per payload -> consuming DATA-AI-PLAT module that DECLARES a role, B10b):
//   157->223 158->223 219->224 221->224   (payload has a DMDO role on the named module)
// INBOUND SKIPPED (payload has NO DMDO role on any DATA-AI-PLAT module -> B10b "no candidate"):
//   693 (metric_materializations) 697 (kgp_ontologies) 715 (dq_dimensions)
//   725 (pipeline_runs) 731 (schema_registries)

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
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
const get = (path: string) => call({ method: "GET", path });

const outbound: Record<number, number> = {
  151: 224, 152: 224, 153: 226, 154: 223, 155: 224, 156: 223,
  682: 225, 683: 225, 684: 225, 685: 225, 686: 225,
};
const inbound: Record<number, number> = {
  157: 223, 158: 223, 219: 224, 221: 224,
};

for (const [hid, mod] of Object.entries(outbound)) {
  await call({
    method: "PATCH",
    path: `/handoffs?id=eq.${hid}`,
    body: { source_domain_module_id: mod },
  });
  console.log(`PATCHed handoff ${hid} source_domain_module_id -> ${mod}`);
}
for (const [hid, mod] of Object.entries(inbound)) {
  await call({
    method: "PATCH",
    path: `/handoffs?id=eq.${hid}`,
    body: { target_domain_module_id: mod },
  });
  console.log(`PATCHed handoff ${hid} target_domain_module_id -> ${mod}`);
}

// Verify
const verify = await get(
  "/handoffs?id=in.(151,152,153,154,155,156,157,158,219,221,682,683,684,685,686)&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id&order=id.asc",
);
console.log("\nVERIFY:");
console.log(JSON.stringify(verify, null, 2));
