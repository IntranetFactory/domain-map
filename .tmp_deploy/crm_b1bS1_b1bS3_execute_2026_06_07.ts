// CRM state-driven execution, 2026-06-07 follow-up.
// Two now-unblocked items from audits/CRM/state.yaml:
//   B1B-S1 (user approved OVERLAY for B2-S1): DELETE the 6 contributor DMDO rows
//          on CRM-AI-COPILOT (module 50). Destructive, user-approved.
//   B1B-S3 (event-pick resolved to event 70 crm_lead.qualified): author the 5
//          intra-domain cross-module handoff rows. Additive, record_status defaults to 'new'.
//
// Run: bun run "c:/dev/domain-map/.tmp_deploy/crm_b1bS1_b1bS3_execute_2026_06_07.ts"

const CRM_DOMAIN_ID = 69;

// --- helpers ---------------------------------------------------------------

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`semantius failed (${code}) on ${method} ${path}\n${err}\n${out}`);
  }
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

// --- B1B-S1: DELETE the 6 contributor DMDO rows on module 50 ----------------

const DELETE_DMDO_IDS = [539, 540, 541, 542, 543, 544];

async function deleteContributorRows() {
  // Pre-flight: confirm the 6 rows are exactly the contributor rows on module 50.
  const live = await call(
    "GET",
    "/domain_module_data_objects?domain_module_id=eq.50&role=eq.contributor&select=id,data_object_id&order=id.asc",
  );
  const liveIds = (live ?? []).map((r: any) => r.id).sort((a: number, b: number) => a - b);
  const expected = [...DELETE_DMDO_IDS].sort((a, b) => a - b);
  if (JSON.stringify(liveIds) !== JSON.stringify(expected)) {
    throw new Error(
      `Pre-flight mismatch: live contributor rows on module 50 = [${liveIds}], expected [${expected}]. Aborting DELETE.`,
    );
  }
  await call("DELETE", `/domain_module_data_objects?id=in.(${DELETE_DMDO_IDS.join(",")})`);
  const after = await call(
    "GET",
    "/domain_module_data_objects?domain_module_id=eq.50&role=eq.contributor&select=id",
  );
  const remaining = (after ?? []).length;
  if (remaining !== 0) {
    throw new Error(`DELETE incomplete: ${remaining} contributor rows still on module 50.`);
  }
  console.log(`B1B-S1: deleted ${DELETE_DMDO_IDS.length} contributor DMDO rows on CRM-AI-COPILOT (50).`);
}

// --- B1B-S3: author the 5 intra-domain handoffs -----------------------------
// All source_domain_id = target_domain_id = 69. record_status omitted (defaults 'new').
// notes omitted per Rule #15 (no auto-populated wording).

const NEW_HANDOFFS = [
  // (a) PIPELINE -> ACTIVITY on crm_opportunity.created
  { trigger_event_id: 162, source_domain_module_id: 48, target_domain_module_id: 49, data_object_id: 100, integration_pattern: "lifecycle_progression", friction_level: "low" },
  // (b) LEAD-MGT -> ACTIVITY on crm_lead.qualified (event 70, user pick)
  { trigger_event_id: 70, source_domain_module_id: 47, target_domain_module_id: 49, data_object_id: 99, integration_pattern: "lifecycle_progression", friction_level: "low" },
  // (c) PIPELINE -> ACCT-MGT on crm_opportunity.stage_changed
  { trigger_event_id: 86, source_domain_module_id: 48, target_domain_module_id: 46, data_object_id: 100, integration_pattern: "lifecycle_progression", friction_level: "low" },
  // (d) PIPELINE -> ACTIVITY on crm_opportunity.requires_quote
  { trigger_event_id: 85, source_domain_module_id: 48, target_domain_module_id: 49, data_object_id: 100, integration_pattern: "event_stream", friction_level: "low" },
  // (e) ACTIVITY -> PIPELINE on meeting.no_show
  { trigger_event_id: 166, source_domain_module_id: 49, target_domain_module_id: 48, data_object_id: 102, integration_pattern: "event_stream", friction_level: "low" },
].map((h) => ({ ...h, source_domain_id: CRM_DOMAIN_ID, target_domain_id: CRM_DOMAIN_ID }));

async function insertHandoffs() {
  // Idempotency guard: skip any row whose (trigger_event, src, tgt, payload) already exists.
  const existing = await call(
    "GET",
    "/handoffs?source_domain_id=eq.69&target_domain_id=eq.69&select=trigger_event_id,source_domain_module_id,target_domain_module_id,data_object_id",
  );
  const key = (r: any) =>
    `${r.trigger_event_id}|${r.source_domain_module_id}|${r.target_domain_module_id}|${r.data_object_id}`;
  const seen = new Set((existing ?? []).map(key));
  const toInsert = NEW_HANDOFFS.filter((h) => !seen.has(key(h)));
  if (toInsert.length === 0) {
    console.log("B1B-S3: all 5 handoffs already present, nothing to insert.");
    return;
  }
  const inserted = await call("POST", "/handoffs", toInsert);
  console.log(`B1B-S3: inserted ${toInsert.length} intra-domain handoffs.`);
  for (const r of inserted ?? []) {
    console.log(`  id=${r.id} ev=${r.trigger_event_id} ${r.source_domain_module_id}->${r.target_domain_module_id} payload=${r.data_object_id} ${r.integration_pattern}`);
  }
}

// --- run -------------------------------------------------------------------

await deleteContributorRows();
await insertHandoffs();

// Verify final intra-domain handoff set
const finalSet = await call(
  "GET",
  "/handoffs?source_domain_id=eq.69&target_domain_id=eq.69&select=id,trigger_event_id,source_domain_module_id,target_domain_module_id,data_object_id,integration_pattern,record_status&order=id.asc",
);
console.log(`\nIntra-domain handoffs on CRM now: ${(finalSet ?? []).length} rows.`);
console.table(finalSet);
