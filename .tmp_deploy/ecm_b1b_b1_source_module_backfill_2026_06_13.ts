// B1B-B1: backfill source_domain_module_id on the 8 outbound ECM handoffs.
// Resolution rule (B10b): source_domain_module_id = the ECM module that masters
// the TRIGGER EVENT's data_object (not the payload), strongest role first.
//
// Trigger-event data_objects all master in ECM-REPOSITORY (242) except retention
// (records_retention_policies, 433) which masters in ECM-RECORDS-GOV (243).
//
// Idempotent: only PATCHes rows whose source_domain_module_id is still NULL.
// No record_status touched (Rule #1). Run from project root with bun.

const BASE = "/handoffs";

// handoff_id -> resolved source_domain_module_id (per the live DMDO master map)
const RESOLUTION: Record<number, number> = {
  821: 242, // te 429 content_documents      -> ECM-REPOSITORY
  822: 242, // te 432 document_classifications -> ECM-REPOSITORY
  823: 242, // te 431 document_folders        -> ECM-REPOSITORY
  824: 242, // te 429 content_documents       -> ECM-REPOSITORY
  825: 243, // te 433 records_retention_policies -> ECM-RECORDS-GOV
  826: 242, // te 430 document_versions       -> ECM-REPOSITORY
  827: 242, // te 432 document_classifications -> ECM-REPOSITORY
  839: 242, // te 432 document_classifications -> ECM-REPOSITORY
};

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
  if (err.trim()) console.error(`stderr (${path}): ${err.trim()}`);
  return out;
}

// Pre-flight: read current state of the 8 rows.
const ids = Object.keys(RESOLUTION).join(",");
const current = JSON.parse(
  await call("GET", `${BASE}?id=in.(${ids})&select=id,source_domain_id,source_domain_module_id`)
);

let patched = 0;
let skipped = 0;
for (const row of current as Array<{ id: number; source_domain_id: number; source_domain_module_id: number | null }>) {
  if (row.source_domain_id !== 91) {
    console.error(`SKIP ${row.id}: source_domain_id=${row.source_domain_id} is not ECM (91)`);
    continue;
  }
  if (row.source_domain_module_id !== null) {
    console.log(`skip ${row.id}: already set to ${row.source_domain_module_id}`);
    skipped++;
    continue;
  }
  const target = RESOLUTION[row.id];
  await call("PATCH", `${BASE}?id=eq.${row.id}`, { source_domain_module_id: target });
  console.log(`PATCH ${row.id}: source_domain_module_id -> ${target}`);
  patched++;
}

// Verify.
const after = JSON.parse(
  await call("GET", `${BASE}?id=in.(${ids})&select=id,source_domain_module_id&order=id.asc`)
);
console.log("\nAfter:");
for (const r of after as Array<{ id: number; source_domain_module_id: number | null }>) {
  console.log(`  ${r.id}: ${r.source_domain_module_id}`);
}
console.log(`\nDone. patched=${patched} skipped=${skipped}`);
