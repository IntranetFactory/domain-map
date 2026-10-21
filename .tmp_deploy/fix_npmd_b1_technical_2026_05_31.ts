#!/usr/bin/env bun
/**
 * NPMD B1 technical fixes (2026-05-31 continuation pass).
 *
 * Applies only the truly-mechanical fixes from audits/NPMD.md:
 *   1. B1-S8 (B7): three Rule #10 user-edges
 *        - network_performance_alerts (541) -> users (748) as alert_acknowledger
 *        - network_baseline_thresholds (545) -> users (748) as threshold_owner
 *        - saas_application_performance (543) -> users (748) as application_owner
 *   2. APQC tagging (H1): five handoff_processes inserts the audit pre-specifies
 *      with confident L4 PCF resolution. Handoff 654 already has a tag, the
 *      sixth (audit-flagged borderline) is skipped.
 *        - 649 -> AIOPS : process 1304 (Manage infra perf & capacity)
 *        - 650 -> ITSM  : process 1299 (Triage IT service delivery incidents)
 *        - 651 -> OBS   : process 1304
 *        - 652 -> ITSM  : process 1299
 *        - 653 -> DEM   : process 1304
 *   3. PATCH handoffs.notes='' on row 654 to revert the Rule #15 forbidden
 *      "source NULL until NPMD is modularized" annotation (audit names the row
 *      by id; this is the explicit revert path the procedure allows).
 *
 * Everything else from B1 (S1-S7, S9-S15) defers: see audit Bucket 1 / 2 / 3
 * dependency chains plus the technical filter slammed in the prompt
 * (no new modules, no new capabilities, no Rule #20 voice writes, no notes
 * authoring, no judgment-gated lifecycle/alias inserts).
 *
 * Idempotent: pre-flight reads existing rows so re-running is a no-op.
 * Run from project root: bun run .tmp_deploy/fix_npmd_b1_technical_2026_05_31.ts
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
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

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// ---------------------------------------------------------------------------
// Pre-flight: resolve and verify every id the loader will touch.
// ---------------------------------------------------------------------------

const DO_NPA = 541;  // network_performance_alerts
const DO_NBT = 545;  // network_baseline_thresholds
const DO_SAP = 543;  // saas_application_performance
const DO_USERS = 748;

const HANDOFF_TO_PCF: Array<{ handoff_id: number; process_id: number; note: string }> = [
  { handoff_id: 649, process_id: 1304, note: "NPMD->AIOPS network_flow_record.anomalous_pattern" },
  { handoff_id: 650, process_id: 1299, note: "NPMD->ITSM  network_performance_alert.raised" },
  { handoff_id: 651, process_id: 1304, note: "NPMD->OBS   network_performance_metric.threshold_breached" },
  { handoff_id: 652, process_id: 1299, note: "NPMD->ITSM  network_interface.down" },
  { handoff_id: 653, process_id: 1304, note: "NPMD->DEM   saas_application_performance.degraded" },
];

console.log("=== Pre-flight ===");

const dataObjects = await get(
  `/data_objects?id=in.(${DO_NPA},${DO_NBT},${DO_SAP},${DO_USERS})&select=id,data_object_name`,
);
const expected: Record<number, string> = {
  [DO_NPA]: "network_performance_alerts",
  [DO_NBT]: "network_baseline_thresholds",
  [DO_SAP]: "saas_application_performance",
  [DO_USERS]: "users",
};
for (const id of Object.keys(expected).map(Number)) {
  const row = dataObjects.find((r: any) => r.id === id);
  if (!row || row.data_object_name !== expected[id]) {
    throw new Error(`Pre-flight: data_object id ${id} missing or renamed (expected ${expected[id]})`);
  }
}
console.log("  data_objects 541/543/545/748 confirmed");

const handoffs = await get(
  `/handoffs?id=in.(${HANDOFF_TO_PCF.map((h) => h.handoff_id).join(",")},654)&select=id,source_domain_id,notes`,
);
for (const { handoff_id } of HANDOFF_TO_PCF) {
  const h = handoffs.find((r: any) => r.id === handoff_id);
  if (!h) throw new Error(`Pre-flight: handoff ${handoff_id} missing`);
  if (h.source_domain_id !== 82) {
    throw new Error(`Pre-flight: handoff ${handoff_id} no longer NPMD-sourced`);
  }
}
const h654 = handoffs.find((r: any) => r.id === 654);
if (!h654) throw new Error("Pre-flight: handoff 654 missing");
console.log("  handoffs 649/650/651/652/653/654 confirmed NPMD-sourced");

const pcfRows = await get(
  `/processes?id=in.(1299,1304)&select=id,external_id,source_framework,process_code`,
);
const pcf1299 = pcfRows.find((r: any) => r.id === 1299);
const pcf1304 = pcfRows.find((r: any) => r.id === 1304);
if (!pcf1299 || pcf1299.external_id !== "20903" || pcf1299.source_framework !== "apqc_pcf_cross_industry") {
  throw new Error("Pre-flight: PCF row 1299 not the expected APQC 20903 (Triage IT incidents)");
}
if (!pcf1304 || pcf1304.external_id !== "20909" || pcf1304.source_framework !== "apqc_pcf_cross_industry") {
  throw new Error("Pre-flight: PCF row 1304 not the expected APQC 20909 (Manage infra perf & cap)");
}
console.log("  PCF rows 1299 (APQC 20903) and 1304 (APQC 20909) confirmed");

// ---------------------------------------------------------------------------
// Step 1: B7 user-edges (Rule #10).
// ---------------------------------------------------------------------------

console.log("\n=== Step 1: B7 user-edges ===");

type UserEdge = {
  data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  label: string;
};

const USER_EDGES: UserEdge[] = [
  {
    data_object_id: DO_NPA,
    relationship_verb: "is_acknowledged_by",
    inverse_verb: "acknowledges",
    label: "network_performance_alerts is_acknowledged_by users",
  },
  {
    data_object_id: DO_NBT,
    relationship_verb: "is_owned_by",
    inverse_verb: "owns",
    label: "network_baseline_thresholds is_owned_by users",
  },
  {
    data_object_id: DO_SAP,
    relationship_verb: "is_owned_by",
    inverse_verb: "owns",
    label: "saas_application_performance is_owned_by users",
  },
];

const existingEdges = await get(
  `/data_object_relationships?data_object_id=in.(${DO_NPA},${DO_NBT},${DO_SAP})&related_data_object_id=eq.${DO_USERS}&select=id,data_object_id,relationship_verb`,
);
const haveEdgeFor = new Set<number>(existingEdges.map((r: any) => r.data_object_id));

const edgesToInsert = USER_EDGES.filter((e) => !haveEdgeFor.has(e.data_object_id)).map((e) => ({
  data_object_id: e.data_object_id,
  related_data_object_id: DO_USERS,
  relationship_type: "one_to_one",
  relationship_kind: "reference",
  relationship_verb: e.relationship_verb,
  inverse_verb: e.inverse_verb,
  is_required: false,
  owner_side: "target",
  data_object_relationship_label: e.label,
  // record_status defaults to 'new', notes defaults to ''
}));

if (edgesToInsert.length > 0) {
  console.log(`  inserting ${edgesToInsert.length} user edge(s)...`);
  await post("/data_object_relationships", edgesToInsert);
  console.log("  done");
} else {
  console.log("  all 3 user edges already exist; nothing to insert");
}

// ---------------------------------------------------------------------------
// Step 2: APQC handoff_processes inserts.
// ---------------------------------------------------------------------------

console.log("\n=== Step 2: APQC handoff_processes inserts ===");

const existingHp = await get(
  `/handoff_processes?handoff_id=in.(${HANDOFF_TO_PCF.map((h) => h.handoff_id).join(",")})&select=handoff_id,process_id`,
);
const haveHp = new Set<string>(
  existingHp.map((r: any) => `${r.handoff_id}.${r.process_id}`),
);

const hpToInsert = HANDOFF_TO_PCF.filter(
  (h) => !haveHp.has(`${h.handoff_id}.${h.process_id}`),
).map((h) => ({
  handoff_id: h.handoff_id,
  process_id: h.process_id,
  role: "implements",
  proposal_source: "agent_curated",
  // record_status defaults to 'new', notes defaults to ''
}));

if (hpToInsert.length > 0) {
  console.log(`  inserting ${hpToInsert.length} handoff_processes row(s)...`);
  await post("/handoff_processes", hpToInsert);
  console.log("  done");
} else {
  console.log("  all 5 APQC tags already exist; nothing to insert");
}

// ---------------------------------------------------------------------------
// Step 3: Revert forbidden notes on handoff 654.
// ---------------------------------------------------------------------------

console.log("\n=== Step 3: Revert Rule #15 forbidden notes on handoff 654 ===");

if (h654.notes && h654.notes !== "") {
  console.log(`  current notes: ${JSON.stringify(h654.notes)}`);
  console.log("  patching to ''...");
  await patch("/handoffs?id=eq.654", { notes: "" });
  console.log("  done");
} else {
  console.log("  handoff 654 notes already empty; nothing to revert");
}

// ---------------------------------------------------------------------------
// Post-flight verification.
// ---------------------------------------------------------------------------

console.log("\n=== Post-flight ===");

const finalEdges = await get(
  `/data_object_relationships?data_object_id=in.(${DO_NPA},${DO_NBT},${DO_SAP})&related_data_object_id=eq.${DO_USERS}&select=id,data_object_id,relationship_verb,inverse_verb,owner_side`,
);
console.log(`  user edges on the 3 masters -> users: ${finalEdges.length} (expected 3)`);
for (const e of finalEdges) {
  console.log(`    id=${e.id} data_object_id=${e.data_object_id} ${e.relationship_verb}/${e.inverse_verb} owner=${e.owner_side}`);
}

const finalHp = await get(
  `/handoff_processes?handoff_id=in.(649,650,651,652,653,654)&select=handoff_id,process_id,role,proposal_source&order=handoff_id.asc`,
);
console.log(`  handoff_processes on the 6 NPMD handoffs: ${finalHp.length} (expected 6: 5 new + 1 pre-existing on 654)`);
for (const r of finalHp) {
  console.log(`    handoff=${r.handoff_id} process=${r.process_id} role=${r.role} source=${r.proposal_source}`);
}

const finalNotes = await get(
  `/handoffs?source_domain_id=eq.82&notes=neq.&select=id,notes`,
);
console.log(`  NPMD-source handoffs with non-empty notes: ${finalNotes.length} (expected 0)`);
for (const r of finalNotes) {
  console.log(`    handoff=${r.id} notes=${JSON.stringify(r.notes)}`);
}

console.log("\nUI links:");
console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
console.log("  https://tests.semantius.app/domain_map/handoffs");
