#!/usr/bin/env bun
// PLM Bucket 1 technical fixes (2026-05-31).
//
// Applies the technically-deterministic B1 items from audits/PLM.md:
//
//   B1-S1 (M7 hard fail)     DELETE 6 cross-module consumer DMDO rows
//                            (audit pre-specifies exact ids).
//   B1-S2 (B9 missing events) INSERT 11 trigger_events covering the workflow-gate
//                            states that have no matching event row.
//   B1-S5 (Rule #15)         PATCH 12 data_objects.notes to '' (rescinded license).
//   B1-S6 (Rule #15)         PATCH 9 handoffs.notes to '' (rescinded license).
//   H1 APQC tagging          INSERT 10 handoff_processes rows for the
//                            high-confidence agent_curated tags the audit
//                            pre-specifies (handoff 1094 deferred per audit).
//
// Deferred per the technical/judgment split:
//   B1-S3 (B9b intra-domain handoffs) authoring new handoff rows with
//         descriptions and friction levels exceeds the technical-fix scope.
//   B1-S4 (F2 system skills + tools) gated on B2-S3 user scope decision.
//   B1-S7 (B10b NULL target FKs)     symmetric side owned by MFG-OPS / ERP-FIN /
//                                    S2P / FSM; not PLM's to fix.
//   B1-S8 (B6 legacy rollup)         user must confirm whether legacy view
//                                    retires catalog-wide.
//   B1-S9 (B8 missing consumer DMDOs) report-only; owned by neighbor domains.
//   B1-S10 (modularization decision)  no fix, decision recorded.
//   APQC handoff 1094 (medium-confidence) per audit defer candidate.
//
// Idempotent: every section reads live state and skips rows that already
// match. Safe to re-run.

import { $ } from "bun";
$.throws(false);

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
    const err = stderr.trim();
    if (err.includes("required audience not found")) {
      console.error(
        "\n*** JWT AUDIENCE ERROR — STOPPING per SKILL Rule #6 ***\n" +
          err +
          "\nCommand body: " +
          JSON.stringify(body) +
          "\n",
      );
      process.exit(2);
    }
    throw new Error(`semantius call failed (exit ${exitCode}): ${err}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function post(path: string, body: Row[]): Promise<Row[]> {
  if (body.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < body.length; i += CHUNK) {
    const slice = body.slice(i, i + CHUNK);
    const res = await call({ method: "POST", path, body: slice });
    out.push(...res);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function del(path: string): Promise<Row[]> {
  return call({ method: "DELETE", path });
}

// ============================================================
// B1-S1 — DELETE 6 cross-module consumer DMDO rows
// ============================================================
async function fixS1() {
  console.log("\n[B1-S1] DELETE 6 cross-module consumer DMDO rows");
  const targetIds = [304, 305, 309, 310, 313, 316];
  const existing = await get(
    `/domain_module_data_objects?id=in.(${targetIds.join(",")})&select=id,domain_module_id,data_object_id,role`,
  );
  console.log(`  found ${existing.length} of ${targetIds.length} rows still live`);
  if (existing.length === 0) {
    console.log("  nothing to delete");
    return;
  }
  const liveIds = existing.map(r => Number(r.id));
  await del(`/domain_module_data_objects?id=in.(${liveIds.join(",")})`);
  console.log(`  deleted ${liveIds.length} rows`);
}

// ============================================================
// B1-S2 — INSERT 11 trigger_events for workflow-gate states
// ============================================================
//
// Audit specifies these 11 missing events. event_category = 'state_change' for
// all; data_object_id points at the publishing master. event_name follows the
// '<entity>.<state>' pattern. domain_module_id matches the realizing module of
// each lifecycle state per the live data_object_lifecycle_states rows.
async function fixS2() {
  console.log("\n[B1-S2] INSERT trigger_events for workflow-gate states");
  const proposed = [
    { event_name: "engineering_part.in_review",                  data_object_id: 796, domain_module_id: 66, to_state: "in_review" },
    { event_name: "engineering_revision.released",               data_object_id: 797, domain_module_id: 66, to_state: "released" },
    { event_name: "engineering_change_order.impact_assessment",  data_object_id: 798, domain_module_id: 66, to_state: "impact_assessment" },
    { event_name: "engineering_change_order.cab_review",         data_object_id: 798, domain_module_id: 66, to_state: "cab_review" },
    { event_name: "engineering_change_order.approved",           data_object_id: 798, domain_module_id: 66, to_state: "approved" },
    { event_name: "engineering_change_order.closed",             data_object_id: 798, domain_module_id: 66, to_state: "closed" },
    { event_name: "product_compliance_declaration.received",     data_object_id: 805, domain_module_id: 69, to_state: "received" },
    { event_name: "product_compliance_declaration.expired",      data_object_id: 805, domain_module_id: 69, to_state: "expired" },
    { event_name: "engineering_requirement.reviewed",            data_object_id: 807, domain_module_id: 70, to_state: "reviewed" },
    { event_name: "engineering_requirement.approved",            data_object_id: 807, domain_module_id: 70, to_state: "approved" },
    { event_name: "engineering_requirement.obsoleted",           data_object_id: 807, domain_module_id: 70, to_state: "obsolete" },
  ];

  const existing = await get(
    `/trigger_events?data_object_id=in.(796,797,798,805,807)&select=id,event_name`,
  );
  const existingNames = new Set(existing.map(r => String(r.event_name)));
  const missing = proposed.filter(p => !existingNames.has(p.event_name));
  console.log(`  ${proposed.length} proposed; ${proposed.length - missing.length} already present; ${missing.length} to insert`);
  if (missing.length === 0) return;

  // record_status default = 'new' per Rule #1; omit to let DB default fire.
  const rows = missing.map(p => ({
    event_name: p.event_name,
    event_category: "state_change",
    data_object_id: p.data_object_id,
    domain_module_id: p.domain_module_id,
    to_state: p.to_state,
  }));
  await post("/trigger_events", rows);
  console.log(`  inserted ${rows.length} trigger_events`);
}

// ============================================================
// B1-S5 — PATCH 12 data_objects.notes to ''  (Rule #15 cure)
// ============================================================
async function fixS5() {
  console.log("\n[B1-S5] PATCH data_objects.notes to '' on 12 PLM masters");
  const ids = [796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807];
  const existing = await get(
    `/data_objects?id=in.(${ids.join(",")})&select=id,data_object_name,notes`,
  );
  const polluted = existing.filter(r => String(r.notes ?? "").length > 0);
  console.log(`  ${polluted.length} of ${existing.length} rows carry non-empty notes`);
  if (polluted.length === 0) return;
  const pollutedIds = polluted.map(r => Number(r.id));
  await patch(`/data_objects?id=in.(${pollutedIds.join(",")})`, { notes: "" });
  console.log(`  patched ${pollutedIds.length} rows to notes=''`);
}

// ============================================================
// B1-S6 — PATCH 9 handoffs.notes to ''  (Rule #15 cure)
// ============================================================
async function fixS6() {
  console.log("\n[B1-S6] PATCH handoffs.notes to '' on 9 outbound PLM handoffs");
  const ids = [1087, 1088, 1089, 1090, 1091, 1092, 1093, 1094, 1241];
  const existing = await get(
    `/handoffs?id=in.(${ids.join(",")})&select=id,notes`,
  );
  const polluted = existing.filter(r => String(r.notes ?? "").length > 0);
  console.log(`  ${polluted.length} of ${existing.length} rows carry non-empty notes`);
  if (polluted.length === 0) return;
  const pollutedIds = polluted.map(r => Number(r.id));
  await patch(`/handoffs?id=in.(${pollutedIds.join(",")})`, { notes: "" });
  console.log(`  patched ${pollutedIds.length} rows to notes=''`);
}

// ============================================================
// H1 APQC — INSERT 10 handoff_processes rows (agent_curated, status 'new')
// ============================================================
//
// PCF ids resolved at script-write time from /processes (verified live):
//   external_id 20752 -> id 1190  (Implement and enforce change control procedures, L4)
//   external_id 11136 -> id 418   (Implement change, L3)
//   external_id 11742 -> id 549   (Manage bills of material, L4)
//   external_id 10097 -> id 588   (Identify requirements for changes ..., L4)
//   external_id 16819 -> id 1841  (Design for manufacturing, L5)
//   external_id 16818 -> id 1845  (Design and manage product data, design, BoM, L5)
//   external_id 16463 -> id 369   (Manage regulatory compliance, L3)
//
// Handoff 1094 (PLM-CAD-PDM -> FSM, drawing.released) deferred per audit:
// medium-confidence, no clean PCF for drawing-share-to-service.
async function fixH1() {
  console.log("\n[H1 APQC] INSERT handoff_processes for 10 high-confidence handoffs");

  const proposed: { handoff_id: number; process_id: number }[] = [
    { handoff_id: 1087, process_id: 1190 },  // ENG-CORE -> MFG-OPS, ECO.released
    { handoff_id: 1088, process_id: 549 },   // ENG-CORE -> ERP-FIN, ECO.released
    { handoff_id: 1089, process_id: 588 },   // ENG-CORE -> S2P, ECO.released
    { handoff_id: 1090, process_id: 549 },   // ENG-CORE -> ERP-FIN, part.released
    { handoff_id: 1091, process_id: 549 },   // MFG-PROCESS -> MFG-OPS, mBOM.released
    { handoff_id: 1092, process_id: 1841 },  // MFG-PROCESS -> MFG-OPS, routing.released
    { handoff_id: 1093, process_id: 369 },   // COMPLIANCE -> ERP-FIN, declaration.approved
    { handoff_id: 1241, process_id: 418 },   // ENG-CORE -> PIM, ECO.released
    { handoff_id: 1242, process_id: 1845 },  // ENG-CORE -> PIM, part.released
    { handoff_id: 1243, process_id: 369 },   // COMPLIANCE -> PIM, declaration.approved
  ];

  // Validate every process id resolves before any write.
  const procIds = [...new Set(proposed.map(p => p.process_id))];
  const procs = await get(`/processes?id=in.(${procIds.join(",")})&select=id,external_id,process_name`);
  if (procs.length !== procIds.length) {
    throw new Error(
      `process id resolution failed: expected ${procIds.length}, got ${procs.length}`,
    );
  }

  // Validate every handoff id resolves and is cross-domain.
  const hoIds = [...new Set(proposed.map(p => p.handoff_id))];
  const hos = await get(
    `/handoffs?id=in.(${hoIds.join(",")})&select=id,source_domain_id,target_domain_id`,
  );
  if (hos.length !== hoIds.length) {
    throw new Error(
      `handoff id resolution failed: expected ${hoIds.length}, got ${hos.length}`,
    );
  }
  for (const h of hos) {
    if (Number(h.source_domain_id) === Number(h.target_domain_id)) {
      throw new Error(`handoff ${h.id} is intra-domain; expected cross-domain only`);
    }
  }

  // Skip rows that already exist on (handoff_id, process_id).
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${hoIds.join(",")})&select=handoff_id,process_id`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.handoff_id}::${r.process_id}`),
  );
  const missing = proposed.filter(
    p => !existingKeys.has(`${p.handoff_id}::${p.process_id}`),
  );
  console.log(`  ${proposed.length} proposed; ${proposed.length - missing.length} already present; ${missing.length} to insert`);
  if (missing.length === 0) return;

  // record_status default = 'new' per Rule #1, omit. role default = 'implements'.
  // proposal_source = 'agent_curated' per Rule #1's agent-authored discipline.
  const rows = missing.map(p => ({
    handoff_id: p.handoff_id,
    process_id: p.process_id,
    proposal_source: "agent_curated",
  }));
  await post("/handoff_processes", rows);
  console.log(`  inserted ${rows.length} handoff_processes`);
}

// ============================================================
// Main
// ============================================================
const main = async () => {
  console.log("=== PLM Bucket 1 technical fixes — 2026-05-31 ===");
  await fixS1();
  await fixS2();
  await fixS5();
  await fixS6();
  await fixH1();
  console.log("\nAll technical B1 fixes applied. Re-run safe.");
};

await main();
