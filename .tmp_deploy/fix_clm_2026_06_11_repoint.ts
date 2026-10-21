// CLM a-file processing 2026-06-11: q8 (B1A-B9D-MISTAG) approved as option (a) = re-point.
// Re-point 8 CLM-authored B9d MIS-TAG handoff_processes rows to the process that realizes the
// carried entity in CLM:
//   legal_contracts      -> 398 "Negotiate and document agreements/contracts"
//   contract_obligations -> 1163 "Evaluate enterprise regulatory and compliance obligations"
// All 8 rows are record_status='new' agent_curated drafts; we change ONLY process_id.
// record_status is NEVER touched (Rule #1). Idempotent: re-run finds no old-process row -> 0 updates.

const REPOINTS: { handoff_id: number; from: number; to: number; payload: string }[] = [
  { handoff_id: 138, from: 1661, to: 398, payload: "legal_contracts" },
  { handoff_id: 215, from: 156, to: 398, payload: "legal_contracts" },
  { handoff_id: 216, from: 303, to: 398, payload: "legal_contracts" },
  { handoff_id: 518, from: 1352, to: 398, payload: "legal_contracts" },
  { handoff_id: 519, from: 166, to: 398, payload: "legal_contracts" },
  { handoff_id: 522, from: 210, to: 398, payload: "legal_contracts" },
  { handoff_id: 520, from: 196, to: 1163, payload: "contract_obligations" },
  { handoff_id: 521, from: 11, to: 1163, payload: "contract_obligations" },
];

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const arg = JSON.stringify({ method, path, ...(body ? { body } : {}) });
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", arg], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`semantius exit ${code}: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

let updated = 0;
for (const r of REPOINTS) {
  // Precise filter: handoff_id AND the current (old) process_id, so re-runs are no-ops.
  const res = (await call(
    "PATCH",
    `/handoff_processes?handoff_id=eq.${r.handoff_id}&process_id=eq.${r.from}`,
    { process_id: r.to },
  )) as unknown[] | null;
  const n = Array.isArray(res) ? res.length : 0;
  updated += n;
  console.log(
    `handoff ${r.handoff_id} (${r.payload}): ${r.from} -> ${r.to} : ${n ? "REPOINTED" : "no-op (already repointed)"}`,
  );
}

console.log(`\nDone. ${updated} of ${REPOINTS.length} rows re-pointed this run.`);

// Verify post-state.
const check = (await call(
  "GET",
  `/handoff_processes?handoff_id=in.(138,215,216,518,519,522,520,521)&select=handoff_id,process_id,record_status&order=handoff_id.asc`,
)) as { handoff_id: number; process_id: number; record_status: string }[];
console.log("\nPost-state:");
for (const c of check) {
  console.log(`  ${c.handoff_id} -> process_id=${c.process_id} record_status=${c.record_status}`);
}
const bad = check.filter((c) => ![398, 1163].includes(c.process_id));
if (bad.length) throw new Error(`Unexpected process_id on: ${bad.map((b) => b.handoff_id).join(",")}`);
const approvedLeak = check.filter((c) => c.record_status !== "new");
if (approvedLeak.length) throw new Error(`record_status drifted off 'new' on: ${approvedLeak.map((b) => b.handoff_id).join(",")}`);
console.log("\nAll 8 rows on {398,1163}, all record_status='new'. OK.");
