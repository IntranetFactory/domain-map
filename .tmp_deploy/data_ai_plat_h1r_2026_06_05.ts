#!/usr/bin/env bun
// B1A-H1R for DATA-AI-PLAT (domain 129).
// APQC PCF tagging of cross-domain handoffs via handoff_processes.
//   TAG (agent_curated, record_status omitted -> "new", role 'implements'):
//     155 golden_record.synced  -> 771  Maintain master data (10252, L4)
//     156 quality_check.failed   -> 1212 Monitor and control business information (20780, L4)
//     221 ontology.published     -> 275  Define and maintain business information architecture (20770, L3)
//     693 metric_materialization.refreshed -> 1213 Maintain business information feeds and repositories (20781, L4)
//     697 kgp_ontology.imported  -> 1209 Maintain and evolve enterprise data and information architecture (20775, L4)
//   OPTIONAL REPLACE on 219: delete weak discovery_substring row (id 125, process 505) and
//     insert agent_curated -> 1203 Establish data, information, and analytic governance (20768, L4)
//   DEFERRED (no tag): 683 ml_model.deployed, 684 feature_set.staleness_breached,
//     685 feature_set.published (modern-AI, no clean PCF anchor), 715 dq_dimension.threshold_breached
//     (DQ-owned anchor, defer to DQ audit) -- per b1a action text.

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

const tags = [
  { handoff_id: 155, process_id: 771 },
  { handoff_id: 156, process_id: 1212 },
  { handoff_id: 221, process_id: 275 },
  { handoff_id: 693, process_id: 1213 },
  { handoff_id: 697, process_id: 1209 },
];

// Dedup against existing (handoff_id, process_id)
const existing = await get(
  "/handoff_processes?handoff_id=in.(155,156,221,693,697)&select=handoff_id,process_id",
);
const have = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
const toInsert = tags
  .filter(t => !have.has(`${t.handoff_id}|${t.process_id}`))
  .map(t => ({
    handoff_id: t.handoff_id,
    process_id: t.process_id,
    role: "implements",
    proposal_source: "agent_curated",
    // record_status omitted -> DB default "new"
  }));
if (toInsert.length > 0) {
  await call({ method: "POST", path: "/handoff_processes", body: toInsert });
  console.log(`Inserted ${toInsert.length} agent_curated handoff_processes rows`);
} else {
  console.log("All 5 tags already present");
}

// OPTIONAL REPLACE on handoff 219 (snapshot taken in history.md before this run).
const row219 = await get(
  "/handoff_processes?handoff_id=eq.219&select=id,process_id,proposal_source,record_status",
);
console.log("219 existing row(s):", JSON.stringify(row219));
const weak = row219.find(r => r.proposal_source === "discovery_substring" && Number(r.process_id) === 505);
const already1203 = row219.some(r => Number(r.process_id) === 1203);
if (weak) {
  await call({ method: "DELETE", path: `/handoff_processes?id=eq.${weak.id}` });
  console.log(`DELETED weak discovery_substring row id ${weak.id} (handoff 219 -> process 505)`);
}
if (!already1203) {
  await call({
    method: "POST",
    path: "/handoff_processes",
    body: [{ handoff_id: 219, process_id: 1203, role: "implements", proposal_source: "agent_curated" }],
  });
  console.log("Inserted agent_curated row handoff 219 -> process 1203");
} else {
  console.log("219 already tagged with process 1203");
}

// Verify
const verify = await get(
  "/handoff_processes?handoff_id=in.(155,156,219,221,683,684,685,693,697,715)&select=handoff_id,process_id,proposal_source,record_status,processes(process_name,external_id,hierarchy_level)&order=handoff_id.asc",
);
console.log("\nVERIFY:");
console.log(JSON.stringify(verify, null, 2));
