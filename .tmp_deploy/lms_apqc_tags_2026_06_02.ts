// B1A-APQC-TAGS: author agent_curated handoff_processes rows for currently-untagged LMS
// cross-domain handoffs (H1). Idempotent: skips any (handoff_id, process_id) already present.
// All ship record_status default 'new' (omitted), proposal_source='agent_curated', role='implements'.
// Run: bun run "<abs path>"

// [handoff_id, process_id] verified to exist in /processes (369,1873,1039,1041,1037,325).
const TAGS: [number, number][] = [
  [111, 1873], [430, 1039], [431, 1041], [434, 369], [435, 369],
  [1047, 369], [1049, 369], [1303, 1873], [1304, 1873], [1305, 1873],
  [1306, 1037], [1308, 369], [1309, 369], [1310, 369], [1311, 1039],
  [1312, 325], [1313, 369], [1314, 369],
];

async function pg(method: string, path: string, body?: unknown): Promise<string> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn({
    cmd: ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  const blob = `${out}\n${err}`;
  if (blob.includes("required audience not found")) {
    console.error("JWT-AUDIENCE ERROR (Rule #6) — STOP and surface verbatim:\n" + blob);
    process.exit(2);
  }
  if (proc.exitCode !== 0) throw new Error(`pg ${method} ${path} failed: ${err || out}`);
  return out;
}

const handoffIds = [...new Set(TAGS.map((t) => t[0]))];
const existingRaw = await pg(
  "GET",
  `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`,
);
const existing = new Set(
  (JSON.parse(existingRaw) as { handoff_id: number; process_id: number }[]).map(
    (r) => `${r.handoff_id}|${r.process_id}`,
  ),
);

const toInsert = TAGS.filter(([h, p]) => !existing.has(`${h}|${p}`)).map(([h, p]) => ({
  handoff_id: h,
  process_id: p,
  role: "implements",
  proposal_source: "agent_curated",
}));

console.log(`tags requested: ${TAGS.length}, already present: ${TAGS.length - toInsert.length}, inserting: ${toInsert.length}`);
if (toInsert.length > 0) {
  await pg("POST", "/handoff_processes", toInsert);
  console.log(`inserted ${toInsert.length} handoff_processes rows (record_status default 'new', agent_curated).`);
} else {
  console.log("nothing to insert.");
}
