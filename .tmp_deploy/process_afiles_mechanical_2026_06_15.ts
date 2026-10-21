#!/usr/bin/env bun
// Mechanical a-file fixes for FLEET, FSM, PROD-MGMT, FDS (processed 2026-06-15).
// Every op here is either additive/corrective or an a-file-approved destructive edit
// (Rule #22: the renamed a-file IS the approval for the enumerated structural steps).
// record_status is NEVER touched here (stays 'new'); nothing is ever set to 'approved'.
// Idempotent: existence-checked inserts, PATCHes are naturally idempotent, final re-read verifies.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
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
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const del = (path: string) => call({ method: "DELETE", path });

async function main() {
  // ========================= FLEET (147) =========================
  console.log("== FLEET ==");
  // a2=a: all 5 masters carry personal data
  await patch("/data_objects?id=in.(370,371,372,373,374)", { has_personal_content: true });
  console.log("  FLEET a2: 5 masters has_personal_content=true");
  // a4=a: 6 lifecycle events -> event_category=lifecycle
  await patch("/trigger_events?id=in.(985,986,987,988,989,990)", { event_category: "lifecycle" });
  console.log("  FLEET a4: 6 trigger_events event_category=lifecycle");

  // ========================= FSM (31) =========================
  console.log("== FSM ==");
  // a2 (B1A-V4): replace the discovery_substring tag on handoff 230 with agent_curated process 196
  const hp128 = await get("/handoff_processes?id=eq.128&select=id");
  if (hp128.length) { await del("/handoff_processes?id=eq.128"); console.log("  FSM a2: deleted handoff_processes 128 (h230 -> proc 777)"); }
  const h230_196 = await get("/handoff_processes?handoff_id=eq.230&process_id=eq.196&select=id");
  if (!h230_196.length) {
    await call({ method: "POST", path: "/handoff_processes", body: [
      { handoff_id: 230, process_id: 196, proposal_source: "agent_curated", role: "implements", record_status: "new" },
    ]});
    console.log("  FSM a2: inserted handoff_processes (h230 -> proc 196, agent_curated, new)");
  }
  // a20 (B1A-B9D-RETAG): re-point 4 coarse tags to the realized child code
  await patch("/handoff_processes?id=eq.1146", { process_id: 736 }); // h1261 3.5.2 -> 3.5.4.2
  await patch("/handoff_processes?id=eq.361", { process_id: 862 });  // h883  6.2.2 -> 4.4.4.3
  await patch("/handoff_processes?id=eq.360", { process_id: 862 });  // h229  6.2.2 -> 4.4.4.3
  await patch("/handoff_processes?id=eq.396", { process_id: 824 });  // h292  10.3.3 -> 4.3.1.6
  console.log("  FSM a20: re-pointed 4 handoff_processes (1146/361/360/396)");
  // a7..a12 pattern flags
  await patch("/data_objects?id=eq.740", { has_submit_lock: true });       // a7  service_work_orders
  await patch("/data_objects?id=eq.261", { has_personal_content: true });  // a8  field_visits
  await patch("/data_objects?id=eq.262", { has_submit_lock: true });       // a9  dispatch_records
  await patch("/data_objects?id=eq.741", { has_submit_lock: true });       // a11 service_contracts
  await patch("/data_objects?id=eq.820", { has_submit_lock: true });       // a12 service_pm_schedules
  console.log("  FSM a7/a8/a9/a11/a12: 5 pattern flags set (a10 installed_equipment left false)");
  // a6 (B2-STARTER-HOST-SCOPE): add FIN host row on HVAC starter 171 (CRM 69 + CPQ 73 already present)
  const finHost = await get("/domain_module_host_domains?domain_module_id=eq.171&domain_id=eq.65&select=id");
  if (!finHost.length) {
    await call({ method: "POST", path: "/domain_module_host_domains", body: [{ domain_module_id: 171, domain_id: 65 }]});
    console.log("  FSM a6: added FIN(65) host row on starter 171");
  } else console.log("  FSM a6: FIN host row already present");

  // ========================= PROD-MGMT (101) =========================
  console.log("== PROD-MGMT ==");
  // a2 (B2-31-2): clear product_metrics(408) Rule#15-polluting note
  await patch("/data_objects?id=eq.408", { notes: "" });
  // a3/a4/a5 flags (a6 product_lines left false)
  await patch("/data_objects?id=eq.406", { has_personal_content: true }); // feature_requests
  await patch("/data_objects?id=eq.404", { has_submit_lock: true });      // product_releases
  await patch("/data_objects?id=eq.405", { has_submit_lock: true });      // product_roadmaps
  console.log("  PROD a2/a3/a4/a5: note cleared + 3 flags set");
  // a10 (B2-31-7): clear 9 polluting domain_data_objects notes
  await patch("/domain_data_objects?id=in.(437,651,652,653,654,655,656,657,658)", { notes: "" });
  console.log("  PROD a10: cleared 9 domain_data_objects notes");
  // a9 (B2-31-6): author 8 Rule#10 users edges
  const userVerbs: Array<[number, string, string]> = [
    [402, "owned by", "owns"], [403, "assigned to", "assigned"], [404, "owned by", "owns"],
    [405, "owned by", "owns"], [406, "submitted by", "submits"], [407, "submitted by", "submits"],
    [408, "recorded by", "records"], [409, "owned by", "owns"],
  ];
  const existingUserEdges = await get("/data_object_relationships?related_data_object_id=eq.748&data_object_id=in.(402,403,404,405,406,407,408,409)&select=data_object_id");
  const haveEdge = new Set(existingUserEdges.map(r => Number(r.data_object_id)));
  const newEdges = userVerbs.filter(([id]) => !haveEdge.has(id)).map(([id, v, iv]) => ({
    data_object_id: id, related_data_object_id: 748, relationship_verb: v, inverse_verb: iv,
    relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source",
  }));
  if (newEdges.length) { await call({ method: "POST", path: "/data_object_relationships", body: newEdges }); }
  console.log(`  PROD a9: inserted ${newEdges.length} users edges (${haveEdge.size} already present)`);
  // a14 (B2-B9D-MISTAG-REPOINT): re-point 7 mis-tagged handoff_processes to product-dev codes
  await patch("/handoff_processes?id=eq.950", { process_id: 538 });  // h997  2.3 -> 2.1.2.1
  await patch("/handoff_processes?id=eq.957", { process_id: 538 });  // h1004 2.3 -> 2.1.2.1
  await patch("/handoff_processes?id=eq.1087", { process_id: 539 }); // h1003 6.2.2 -> 2.1.2.2
  await patch("/handoff_processes?id=eq.1001", { process_id: 539 }); // h1006 9.1.3 -> 2.1.2.2
  await patch("/handoff_processes?id=eq.513", { process_id: 534 });  // h999  1.4.2.3 -> 2.1.1.3
  await patch("/handoff_processes?id=eq.514", { process_id: 534 });  // h1000 6.5.3.5 -> 2.1.1.3
  await patch("/handoff_processes?id=eq.1189", { process_id: 539 }); // h1002 9.2.2.1 -> 2.1.2.2
  console.log("  PROD a14: re-pointed 7 mis-tagged handoff_processes");

  // ========================= FDS (158) =========================
  console.log("== FDS ==");
  // a12 (B2-B9D-RETAG-363): re-point 3 customer handoffs 3.5.2 -> 3.5.2.4
  await patch("/handoff_processes?id=in.(419,424,425)", { process_id: 718 });
  console.log("  FDS a12: re-pointed handoff_processes 419/424/425 to process 718 (3.5.2.4)");

  // ========================= VERIFY =========================
  console.log("\n== VERIFY ==");
  const v1 = await get("/data_objects?id=in.(370,371,372,373,374)&has_personal_content=eq.true&select=id");
  console.log(`  FLEET personal-content true: ${v1.length}/5`);
  const v2 = await get("/trigger_events?id=in.(985,986,987,988,989,990)&event_category=eq.lifecycle&select=id");
  console.log(`  FLEET events lifecycle: ${v2.length}/6`);
  const v3 = await get("/handoff_processes?handoff_id=eq.230&process_id=eq.196&select=id");
  const v3b = await get("/handoff_processes?id=eq.128&select=id");
  console.log(`  FSM h230->196 present: ${v3.length===1}, old 128 gone: ${v3b.length===0}`);
  const v4 = await get("/handoff_processes?id=in.(1146,361,360,396)&select=id,process_id");
  console.log(`  FSM re-points: ${JSON.stringify(v4)}`);
  const v5 = await get("/data_objects?id=in.(740,261,262,741,820)&or=(has_submit_lock.eq.true,has_personal_content.eq.true)&select=id,data_object_name,has_submit_lock,has_personal_content");
  console.log(`  FSM flags set: ${v5.length}/5`);
  const v6 = await get("/domain_module_host_domains?domain_module_id=eq.171&select=domain_id");
  console.log(`  FSM starter 171 hosts: ${v6.map(r=>r.domain_id).sort().join(",")}`);
  const v7 = await get("/data_objects?id=eq.408&select=notes");
  console.log(`  PROD product_metrics notes empty: ${(v7[0]?.notes ?? "") === ""}`);
  const v8 = await get("/domain_data_objects?id=in.(437,651,652,653,654,655,656,657,658)&notes=neq.&select=id");
  console.log(`  PROD ddo notes still nonempty: ${v8.length} (want 0)`);
  const v9 = await get("/data_object_relationships?related_data_object_id=eq.748&data_object_id=in.(402,403,404,405,406,407,408,409)&select=data_object_id");
  console.log(`  PROD users edges present: ${v9.length}/8`);
  const v10 = await get("/handoff_processes?id=in.(950,957,1087,1001,513,514,1189)&select=id,process_id");
  console.log(`  PROD re-points: ${JSON.stringify(v10)}`);
  const v11 = await get("/handoff_processes?id=in.(419,424,425)&select=id,process_id");
  console.log(`  FDS re-points: ${JSON.stringify(v11)}`);
  console.log("\nDONE.");
}
main();
