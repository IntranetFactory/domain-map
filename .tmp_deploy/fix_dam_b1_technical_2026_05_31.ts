// DAM B1 technical fixes, 2026-05-31.
//
// Scope: APQC tag inserts (handoff_processes) for B1-H1, B1-H2, B1-H3.
// All other DAM B1 items defer (gated on Bucket 2 modularization choice
// or require new entities / lifecycle states / modules that the brief
// excludes from technical-only application).
//
// Pre-flight verified live:
//   - handoffs 98, 344, 806 exist
//   - processes 1763, 1762, 428 exist
//   - existing handoff_processes for (344,141) only; the three proposed
//     pairs ((98,1763), (344,1762), (806,428)) are new keys, so the
//     unique-value constraint on `key` is not violated.
//
// Rule references:
//   - Rule #0: CLI only (no MCP).
//   - Rule #1: omit record_status, let DB default to 'new'.
//   - Rule #15: omit `notes` (default '').
//   - Rule #5: Use stdin for the POST.

type Insert = {
  handoff_id: number;
  process_id: number;
  proposal_source: "agent_curated";
};

const inserts: Insert[] = [
  // B1-H1: DAM -> HCMS, digital_asset.published, "Publish approved content"
  { handoff_id: 98, process_id: 1763, proposal_source: "agent_curated" },
  // B1-H2: AGENCY-MGMT -> DAM, deliverable.approved, "Assess and approve content"
  { handoff_id: 344, process_id: 1762, proposal_source: "agent_curated" },
  // B1-H3: HCMS -> DAM, content_entry.created, "Develop and manage content"
  { handoff_id: 806, process_id: 428, proposal_source: "agent_curated" },
];

async function semantius(payload: object): Promise<string> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius exited ${code}\nstdout: ${out}\nstderr: ${err}`);
  }
  return out;
}

// Pre-flight, prove the keys are not already present.
const existingRaw = await semantius({
  method: "GET",
  path: `/handoff_processes?or=(and(handoff_id.eq.98,process_id.eq.1763),and(handoff_id.eq.344,process_id.eq.1762),and(handoff_id.eq.806,process_id.eq.428))&select=id,handoff_id,process_id,key`,
});
const existing = JSON.parse(existingRaw) as Array<{ key: string }>;
if (existing.length > 0) {
  console.log("Pre-flight: some pairs already exist, refusing to duplicate:");
  console.log(existing);
  process.exit(2);
}
console.log("Pre-flight: all 3 pairs are absent, proceeding with insert.");

// Insert as a single chunked POST (3 rows, well under any limit).
const postResp = await semantius({
  method: "POST",
  path: "/handoff_processes",
  body: inserts,
  headers: { Prefer: "return=representation" },
});
const created = JSON.parse(postResp) as Array<{
  id: number;
  handoff_id: number;
  process_id: number;
  key: string;
}>;
console.log(`Inserted ${created.length} handoff_processes rows:`);
for (const row of created) {
  console.log(`  id=${row.id} handoff=${row.handoff_id} process=${row.process_id} key=${row.key}`);
}
