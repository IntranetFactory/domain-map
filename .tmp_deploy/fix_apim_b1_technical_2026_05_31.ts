#!/usr/bin/env bun
/**
 * APIM b1 audit technical fixes (2026-05-31 continuation).
 *
 * In scope (per the subagent prompt's truly-technical B1 fix list):
 *   1. B1-S5: PATCH event_category on 10 APIM trigger_events (ids 808 to 817).
 *   2. B1-S7: INSERT 5 user-edges in data_object_relationships (Rule #10),
 *      shape pre-specified by audit.
 *   3. B1-S15: PATCH business_function_domains row 92 (IT Operations
 *      on APIM) responsibility_type contributor -> consumer.
 *   4. B1-H1: INSERT 6 handoff_processes rows (handoffs 747, 748, 749,
 *      750, 751, 797). Handoffs 752 and 767 already carry a row each
 *      (752 -> process 1670, 767 -> process 273) so they are skipped.
 *      All inserts use proposal_source='agent_curated' and the audit's
 *      pre-specified handoff_id + PCF.
 *
 * Deferred (out of scope this run): everything gated on module set
 * (B1-S1), new entities/aliases, judgment items, lifecycle states,
 * pattern flag flips, regulation inserts, BFD additions, catalog
 * UX fields, intra-domain rel edges, cross-domain rel edges, Phase
 * 0 substrate.
 *
 * Run from project root only:
 *   bun run "c:/dev/domain-map/.tmp_deploy/fix_apim_b1_technical_2026_05_31.ts"
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const args = ["semantius", "call", "crud", tool];
  const proc = Bun.spawn(args, { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) => semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// ---------------------------------------------------------------------------
// B1-S5: trigger_events event_category backfill
// ---------------------------------------------------------------------------

const TRIGGER_EVENT_CATEGORY: Record<number, string> = {
  808: "lifecycle",     // api_version.published
  809: "lifecycle",     // api_version.deprecated
  810: "state_change",  // api_specification.updated
  811: "lifecycle",     // api_deployment.published
  812: "state_change",  // api_deployment.rolled_back
  813: "state_change",  // api_policy.updated
  814: "threshold",     // api_usage.quota_breached
  815: "lifecycle",     // api_consumer.onboarded
  816: "state_change",  // api_consumer.revoked
  817: "signal",        // api_gateway.health_degraded
};

async function patchTriggerEventCategories() {
  console.log("=== B1-S5: trigger_events event_category PATCHes ===");
  const ids = Object.keys(TRIGGER_EVENT_CATEGORY).map(Number);
  const rows = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`,
  );
  let patched = 0;
  let skipped = 0;
  for (const r of rows) {
    const id = Number(r.id);
    const want = TRIGGER_EVENT_CATEGORY[id];
    const have = String(r.event_category ?? "");
    if (have === want) {
      console.log(`  = ${id} ${r.event_name}: already ${want}, skipping`);
      skipped++;
      continue;
    }
    if (have !== "") {
      console.log(`  ! ${id} ${r.event_name}: have '${have}', audit proposes '${want}'. Skipping (user must decide).`);
      skipped++;
      continue;
    }
    await patch(`/trigger_events?id=eq.${id}`, { event_category: want });
    console.log(`  + ${id} ${r.event_name}: '' -> '${want}'`);
    patched++;
  }
  console.log(`  total: ${patched} patched, ${skipped} skipped\n`);
  return patched;
}

// ---------------------------------------------------------------------------
// B1-S7: users edges to APIM masters (Rule #10)
// ---------------------------------------------------------------------------

const USERS_ID = 748;

type UserEdge = {
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
};

const USER_EDGES: UserEdge[] = [
  // users owns api_specifications (457)
  { related_data_object_id: 457, relationship_verb: "owns api specifications", inverse_verb: "is_owned_by" },
  // users approves api_deployments (458)
  { related_data_object_id: 458, relationship_verb: "approves api deployments", inverse_verb: "is_approved_by" },
  // users authors api_policies (459)
  { related_data_object_id: 459, relationship_verb: "authors api policies", inverse_verb: "is_authored_by" },
  // users operates api_gateways (461)
  { related_data_object_id: 461, relationship_verb: "operates api gateways", inverse_verb: "is_operated_by" },
  // users onboards api_consumers (462)
  { related_data_object_id: 462, relationship_verb: "onboards api consumers", inverse_verb: "is_onboarded_by" },
];

async function insertUserEdges() {
  console.log("=== B1-S7: users edges to APIM masters ===");
  // Re-fetch the live picture for the 7 APIM masters in both directions.
  const apimIds = [456, 457, 458, 459, 460, 461, 462];
  const existing = await get(
    `/data_object_relationships?or=(and(data_object_id.eq.${USERS_ID},related_data_object_id.in.(${apimIds.join(",")})),and(related_data_object_id.eq.${USERS_ID},data_object_id.in.(${apimIds.join(",")})))&select=id,data_object_id,related_data_object_id,relationship_verb`,
  );
  const seen = new Set<string>();
  for (const e of existing) {
    const a = Number(e.data_object_id);
    const b = Number(e.related_data_object_id);
    const verb = String(e.relationship_verb ?? "");
    seen.add(`${a}|${b}|${verb}`);
    seen.add(`${b}|${a}|${verb}`);
  }
  let inserted = 0;
  let skipped = 0;
  for (const edge of USER_EDGES) {
    const key = `${USERS_ID}|${edge.related_data_object_id}|${edge.relationship_verb}`;
    if (seen.has(key)) {
      console.log(`  = users -> ${edge.related_data_object_id} (${edge.relationship_verb}): already present`);
      skipped++;
      continue;
    }
    const body = {
      data_object_id: USERS_ID,
      related_data_object_id: edge.related_data_object_id,
      relationship_verb: edge.relationship_verb,
      inverse_verb: edge.inverse_verb,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
    };
    await post("/data_object_relationships", body);
    console.log(`  + users ${edge.relationship_verb} -> ${edge.related_data_object_id}`);
    inserted++;
  }
  console.log(`  total: ${inserted} inserted, ${skipped} skipped\n`);
  return inserted;
}

// ---------------------------------------------------------------------------
// B1-S15: BFD row 92 responsibility_type contributor -> consumer
// ---------------------------------------------------------------------------

async function patchBfdItOperations() {
  console.log("=== B1-S15: BFD row 92 (IT Operations on APIM) PATCH ===");
  const rows = await get(
    "/business_function_domains?id=eq.92&select=id,business_function_id,domain_id,responsibility_type",
  );
  if (rows.length !== 1) {
    throw new Error(`BFD row 92 not found (got ${rows.length})`);
  }
  const r = rows[0];
  if (Number(r.business_function_id) !== 27 || Number(r.domain_id) !== 79) {
    throw new Error(
      `BFD row 92 unexpected shape: bf=${r.business_function_id} dom=${r.domain_id} (expected 27/79)`,
    );
  }
  const have = String(r.responsibility_type ?? "");
  if (have === "consumer") {
    console.log("  = BFD row 92 already 'consumer', skipping\n");
    return 0;
  }
  if (have !== "contributor") {
    console.log(`  ! BFD row 92 has unexpected value '${have}', audit assumes 'contributor'. Skipping.\n`);
    return 0;
  }
  await patch("/business_function_domains?id=eq.92", { responsibility_type: "consumer" });
  console.log("  + BFD row 92: contributor -> consumer\n");
  return 1;
}

// ---------------------------------------------------------------------------
// B1-H1: handoff_processes tagging (6 rows, audit pre-specifies handoff+PCF)
// ---------------------------------------------------------------------------

type HpRow = { handoff_id: number; process_id: number };

// 752 already tagged (id 349 -> process 1670). 767 already tagged
// (id 481 -> process 273). The other 6 are new.
const HANDOFF_PROCESSES: HpRow[] = [
  { handoff_id: 747, process_id: 52 },    // APIM->VSDP: Deploy services/solutions
  { handoff_id: 748, process_id: 283 },   // APIM->IPAAS: Develop and manage service/solution deployment strategy
  { handoff_id: 749, process_id: 1307 },  // APIM->OBS: Monitor IT infrastructure security
  { handoff_id: 750, process_id: 523 },   // APIM->SUB-MGMT: Monitor performance against baselines
  { handoff_id: 751, process_id: 1196 },  // APIM->IGA: Manage IT user authorization
  { handoff_id: 797, process_id: 391 },   // APIM->GRC: Manage corporate governance policies
];

async function insertHandoffProcesses() {
  console.log("=== B1-H1: handoff_processes tagging ===");
  const handoffIds = [747, 748, 749, 750, 751, 752, 767, 797];
  // Pre-flight: verify handoffs and processes exist (defensive, audit IDs are authoritative).
  const [hRows, pRows, hpExisting] = await Promise.all([
    get(`/handoffs?id=in.(${handoffIds.join(",")})&select=id`),
    get(`/processes?id=in.(${HANDOFF_PROCESSES.map((r) => r.process_id).join(",")})&select=id`),
    get(`/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id`),
  ]);
  const hSet = new Set(hRows.map((r) => Number(r.id)));
  const pSet = new Set(pRows.map((r) => Number(r.id)));
  const existingPairs = new Set(
    hpExisting.map((r) => `${Number(r.handoff_id)}|${Number(r.process_id)}`),
  );
  const toInsert: Row[] = [];
  for (const row of HANDOFF_PROCESSES) {
    if (!hSet.has(row.handoff_id)) {
      throw new Error(`handoff ${row.handoff_id} not found live; aborting (audit IDs may be stale)`);
    }
    if (!pSet.has(row.process_id)) {
      throw new Error(`process ${row.process_id} not found live; aborting (audit PCF id may be stale)`);
    }
    const k = `${row.handoff_id}|${row.process_id}`;
    if (existingPairs.has(k)) {
      console.log(`  = handoff ${row.handoff_id} -> process ${row.process_id}: already present, skipping`);
      continue;
    }
    toInsert.push({
      handoff_id: row.handoff_id,
      process_id: row.process_id,
      role: "implements",
      proposal_source: "agent_curated",
    });
  }
  if (toInsert.length === 0) {
    console.log("  = no new handoff_processes rows to insert\n");
    return 0;
  }
  const inserted = await post("/handoff_processes", toInsert);
  for (const r of inserted) {
    console.log(`  + id=${r.id} handoff=${r.handoff_id} process=${r.process_id} key=${r.key ?? "(computed)"}`);
  }
  console.log(`  total: ${inserted.length} inserted\n`);
  return inserted.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("APIM B1 technical fixes (2026-05-31)\n========================================\n");
  // Tenant sanity check.
  const me = await semCall("getCurrentUser", {});
  console.log(`Tenant: ${me?.email}\n`);

  const counts = {
    triggerEvents: await patchTriggerEventCategories(),
    userEdges: await insertUserEdges(),
    bfd: await patchBfdItOperations(),
    handoffProcesses: await insertHandoffProcesses(),
  };

  console.log("=== Summary ===");
  console.log(`  B1-S5 trigger_events patched: ${counts.triggerEvents}`);
  console.log(`  B1-S7 user edges inserted:   ${counts.userEdges}`);
  console.log(`  B1-S15 BFD row 92 patched:   ${counts.bfd}`);
  console.log(`  B1-H1 handoff_processes:     ${counts.handoffProcesses}`);
  console.log("\nUI spot-checks:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/business_function_domains");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
