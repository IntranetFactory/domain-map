// B13: classify entity_type on the 5 ECM masters (all currently 'unclassified').
// Grounded in ECM's domain review context (the open q-file framing + Rule #12 heuristics):
//   429 content_documents        -> operational_workflow (draft->in_review->published->superseded->archived; legal-hold branch)
//   430 document_versions        -> operational_workflow (draft->published version lifecycle)
//   433 records_retention_policies-> operational_workflow (draft->under_review->active->superseded->retired)
//   431 document_folders         -> catalog (config-shape: created/renamed/archived, no per-record workflow; q7 exemption)
//   432 document_classifications -> catalog (classification-taxonomy: labels created/applied/retired; q8 exemption)
// Additive PATCH; record_status untouched (Rule #1).

const RESOLUTION: Record<number, string> = {
  429: "operational_workflow",
  430: "operational_workflow",
  433: "operational_workflow",
  431: "catalog",
  432: "catalog",
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

const ids = Object.keys(RESOLUTION).join(",");
const current = JSON.parse(
  await call("GET", `/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type`)
);

let patched = 0;
for (const row of current as Array<{ id: number; data_object_name: string; entity_type: string }>) {
  const target = RESOLUTION[row.id];
  if (row.entity_type === target) {
    console.log(`skip ${row.id} ${row.data_object_name}: already ${target}`);
    continue;
  }
  if (row.entity_type !== "unclassified") {
    console.error(`WARN ${row.id} ${row.data_object_name}: was ${row.entity_type}, NOT unclassified -- skipping (no overwrite)`);
    continue;
  }
  await call("PATCH", `/data_objects?id=eq.${row.id}`, { entity_type: target });
  console.log(`PATCH ${row.id} ${row.data_object_name}: ${row.entity_type} -> ${target}`);
  patched++;
}

const after = JSON.parse(
  await call("GET", `/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type&order=id.asc`)
);
console.log("\nAfter:");
for (const r of after as Array<{ id: number; data_object_name: string; entity_type: string }>) {
  console.log(`  ${r.id} ${r.data_object_name}: ${r.entity_type}`);
}
console.log(`\nDone. patched=${patched}`);
