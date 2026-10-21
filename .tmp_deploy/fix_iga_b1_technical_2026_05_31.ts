#!/usr/bin/env bun
// IGA B1 technical fix-loop (2026-05-31).
//
// Applies the truly-technical (audit pre-specified, no judgment) subset of the
// 2026-05-30 IGA audit Bucket 1:
//
//   B1-S2: PATCH 7 trigger_events to set event_category='state_change'
//   B1-S4: INSERT 1 DMDO row (IGA-AUTO-PROVISIONING consumer on learner_certifications),
//          then PATCH 4 inbound LMS handoffs to set target_domain_module_id=148
//   B1-S8: INSERT 4 high-confidence handoff_processes rows (agent_curated) and
//          PATCH 1 existing row from discovery_override to agent_curated
//
// Deferred items (require user judgment per the agent prompt): B1-S1, B1-S3,
// B1-S5, B1-S6, B1-S7, B1-S8 rows 2/3/4/6/10 (PCFs not resolvable or PCF choice
// ambiguous).
//
// Idempotent. Run from project root with: bun run .tmp_deploy/fix_iga_b1_technical_2026_05_31.ts

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
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function post(path: string, body: Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

// ============================================================
// B1-S2: PATCH 7 trigger_events with empty event_category
// All 7 are state-machine transitions, set to 'state_change' per audit.
// ============================================================
const B1_S2_EVENT_IDS = [455, 456, 457, 458, 459, 460, 461];

async function fixB1S2(): Promise<void> {
  console.log("B1-S2: PATCH 7 trigger_events.event_category = 'state_change'");
  const before = await get(
    `/trigger_events?id=in.(${B1_S2_EVENT_IDS.join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  const empty = before.filter(r => r.event_category === "");
  console.log(`  ${empty.length}/${before.length} rows currently empty; patching all 7 to state_change`);
  for (const id of B1_S2_EVENT_IDS) {
    await patch(`/trigger_events?id=eq.${id}`, { event_category: "state_change" });
  }
  const after = await get(
    `/trigger_events?id=in.(${B1_S2_EVENT_IDS.join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  const stillEmpty = after.filter(r => r.event_category === "").length;
  const stateChange = after.filter(r => r.event_category === "state_change").length;
  console.log(`  after: ${stateChange}/${after.length} rows = 'state_change', ${stillEmpty} still empty`);
  if (stillEmpty !== 0) throw new Error(`B1-S2 PATCH incomplete: ${stillEmpty} rows still empty`);
}

// ============================================================
// B1-S4: LMS B10b — 1 DMDO insert + 4 handoff PATCHes
// ============================================================
const IGA_AUTO_PROVISIONING_MODULE_ID = 148;
const LEARNER_CERTIFICATIONS_DATA_OBJECT_ID = 171;
const B1_S4_HANDOFF_IDS = [1303, 1304, 1305, 1309];

async function fixB1S4(): Promise<void> {
  console.log("B1-S4: INSERT 1 DMDO + PATCH 4 LMS-inbound handoffs");
  // Step 1: ensure DMDO row exists (idempotent on (module, data_object))
  const existingDmdo = await get(
    `/domain_module_data_objects?domain_module_id=eq.${IGA_AUTO_PROVISIONING_MODULE_ID}` +
      `&data_object_id=eq.${LEARNER_CERTIFICATIONS_DATA_OBJECT_ID}&select=id,role,necessity`,
  );
  if (existingDmdo.length === 0) {
    console.log("  INSERT DMDO (148, 171, consumer, optional)");
    await post("/domain_module_data_objects", [
      {
        domain_module_id: IGA_AUTO_PROVISIONING_MODULE_ID,
        data_object_id: LEARNER_CERTIFICATIONS_DATA_OBJECT_ID,
        role: "consumer",
        necessity: "optional",
      },
    ]);
  } else {
    console.log(`  DMDO already exists (id=${existingDmdo[0].id}, role=${existingDmdo[0].role}); skipping insert`);
  }

  // Step 2: PATCH target_domain_module_id=148 on the 4 handoffs
  const before = await get(
    `/handoffs?id=in.(${B1_S4_HANDOFF_IDS.join(",")})` +
      `&select=id,source_domain_module_id,target_domain_module_id`,
  );
  const needsPatch = before.filter(r => r.target_domain_module_id !== IGA_AUTO_PROVISIONING_MODULE_ID);
  console.log(`  ${needsPatch.length}/${before.length} handoffs need target_domain_module_id PATCH to 148`);
  for (const id of B1_S4_HANDOFF_IDS) {
    await patch(`/handoffs?id=eq.${id}`, { target_domain_module_id: IGA_AUTO_PROVISIONING_MODULE_ID });
  }
  const after = await get(
    `/handoffs?id=in.(${B1_S4_HANDOFF_IDS.join(",")})&select=id,target_domain_module_id&order=id.asc`,
  );
  const wired = after.filter(r => r.target_domain_module_id === IGA_AUTO_PROVISIONING_MODULE_ID).length;
  console.log(`  after: ${wired}/${after.length} handoffs target module 148`);
  if (wired !== 4) throw new Error(`B1-S4 PATCH incomplete: ${wired}/4 wired`);

  // Final DMDO verification
  const finalDmdo = await get(
    `/domain_module_data_objects?domain_module_id=eq.${IGA_AUTO_PROVISIONING_MODULE_ID}` +
      `&data_object_id=eq.${LEARNER_CERTIFICATIONS_DATA_OBJECT_ID}&select=id,role,necessity`,
  );
  if (finalDmdo.length === 0) throw new Error("B1-S4: DMDO row missing post-load");
  console.log(`  DMDO confirmed: id=${finalDmdo[0].id} role=${finalDmdo[0].role} necessity=${finalDmdo[0].necessity}`);
}

// ============================================================
// B1-S8: 4 new agent_curated handoff_processes + 1 promotion
//
// Resolvable rows from the 10 in the audit (others deferred — PCF IDs
// 10568 / 10708 / 10579 not present in catalog; row 10 names 10470/10473
// ambiguously without semantic match for 'separation'):
//
//   1) handoff 466 → process 273 (PCF 20756 "Manage IT user identity and
//      authorization") — IGA-ACCESS-REQUEST.approved → ITSM
//   2) handoff 464 → process 365 (PCF 16439 "Establish the enterprise risk
//      framework and policies") — IGA-SOD-MGMT.detected → GRC
//   3) handoff 467 → process 196 (PCF 10388 "Manage customer service problems,
//      requests, and inquiries") — IGA-ACCESS-REQUEST.submitted → HRSD
//   4) handoff 19  → process 224 (PCF 10469 "Manage employee onboarding";
//      audit explicitly picks 10469 over the broader 20599)
//   5) handoff_processes id=20 (handoff 5, process 224) PROMOTE
//      discovery_override → agent_curated (audit row 8 says
//      "already discovery_override; promote to agent_curated confirms it")
// ============================================================
const B1_S8_INSERTS = [
  { handoff_id: 466, process_id: 273, proposal_source: "agent_curated", role: "implements" },
  { handoff_id: 464, process_id: 365, proposal_source: "agent_curated", role: "implements" },
  { handoff_id: 467, process_id: 196, proposal_source: "agent_curated", role: "implements" },
  { handoff_id: 19, process_id: 224, proposal_source: "agent_curated", role: "implements" },
];
const B1_S8_PROMOTE_ID = 20;

async function fixB1S8(): Promise<void> {
  console.log("B1-S8: INSERT 4 agent_curated handoff_processes + PATCH 1 promotion");
  // Resolve which inserts are missing
  const handoffIds = B1_S8_INSERTS.map(r => r.handoff_id);
  const processIds = [...new Set(B1_S8_INSERTS.map(r => r.process_id))];
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})` +
      `&process_id=in.(${processIds.join(",")})&select=handoff_id,process_id,proposal_source`,
  );
  const existingKeys = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  const missing = B1_S8_INSERTS.filter(r => !existingKeys.has(`${r.handoff_id}|${r.process_id}`));
  console.log(`  ${missing.length}/${B1_S8_INSERTS.length} pairs need INSERT (others already exist)`);
  if (missing.length > 0) {
    await post("/handoff_processes", missing);
  }

  // Promote (handoff_id=5, process_id=224) from discovery_override to agent_curated
  const promoteBefore = await get(
    `/handoff_processes?id=eq.${B1_S8_PROMOTE_ID}&select=id,handoff_id,process_id,proposal_source`,
  );
  if (promoteBefore.length === 0) {
    throw new Error(`B1-S8 promote target id=${B1_S8_PROMOTE_ID} missing`);
  }
  if (promoteBefore[0].proposal_source === "agent_curated") {
    console.log(`  id=${B1_S8_PROMOTE_ID} already agent_curated; skipping`);
  } else {
    console.log(
      `  PATCH id=${B1_S8_PROMOTE_ID} proposal_source: ${promoteBefore[0].proposal_source} -> agent_curated`,
    );
    await patch(`/handoff_processes?id=eq.${B1_S8_PROMOTE_ID}`, { proposal_source: "agent_curated" });
  }

  // Verification
  const after = await get(
    `/handoff_processes?handoff_id=in.(466,464,467,19,5)&process_id=in.(273,365,196,224)` +
      `&select=handoff_id,process_id,proposal_source&order=handoff_id.asc`,
  );
  console.log(`  after: ${after.length} matching rows`);
  for (const r of after) {
    console.log(`    handoff=${r.handoff_id} process=${r.process_id} source=${r.proposal_source}`);
  }
  const expected = 5; // 4 new pairs + the promoted (5, 224)
  if (after.length < expected) {
    throw new Error(`B1-S8: expected >=${expected} rows after, saw ${after.length}`);
  }
}

// ============================================================
// MAIN
// ============================================================
async function main(): Promise<void> {
  console.log("=== IGA B1 technical fix-loop (2026-05-31) ===\n");
  await fixB1S2();
  console.log("");
  await fixB1S4();
  console.log("");
  await fixB1S8();
  console.log("\n=== Done ===");
  console.log("UI spot-check links:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
