// B10b CDP-side handoff module-FK backfill (audit CDP, 2026-06-13).
// Modules 216-219 now exist; CDP-side domain_module_id FKs are deterministically resolvable.
// Rule: outbound source_domain_module_id = CDP module holding the EVENT's data_object (strongest role);
//       inbound target_domain_module_id  = CDP module holding the PAYLOAD's data_object (strongest role).
// Rows where CDP holds no role on the relevant data_object are LEFT NULL (no-candidate, surfaced in audit).
// Additive/corrective only: fills empty FK columns; never overwrites a non-null value. No record_status writes.

const BASE = "semantius";

async function patch(path: string, body: unknown): Promise<void> {
  const proc = Bun.spawn([BASE, "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ method: "PATCH", path, body }));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`PATCH ${path} failed: ${err || out}`);
}

// (handoff_id, field, module_id): only the deterministically-resolvable rows.
const OUTBOUND: Array<[number, number]> = [
  [68, 217], [78, 218], [80, 218], [478, 218], [479, 217], [480, 219], [481, 216], [529, 217],
  // 79 left NULL: event data_object sales_cadences(121) is not held by any CDP module (no candidate).
];
const INBOUND: Array<[number, number]> = [
  [69, 217], [74, 216], [75, 216], [76, 216], [77, 216], [89, 217], [272, 217],
  // 504,508,717,809,810,997,1004 left NULL: payload not modeled by any CDP module (no candidate).
];

let touched = 0;
for (const [id, mod] of OUTBOUND) {
  // empty-guard: only patch where currently null
  await patch(`/handoffs?id=eq.${id}&source_domain_module_id=is.null`, { source_domain_module_id: mod });
  console.log(`outbound  handoff ${id} -> source_domain_module_id=${mod}`);
  touched++;
}
for (const [id, mod] of INBOUND) {
  await patch(`/handoffs?id=eq.${id}&target_domain_module_id=is.null`, { target_domain_module_id: mod });
  console.log(`inbound   handoff ${id} -> target_domain_module_id=${mod}`);
  touched++;
}
console.log(`\nDone. ${touched} CDP-side handoff FK attributions applied.`);
