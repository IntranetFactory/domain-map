#!/usr/bin/env bun
// CRM audit Phase 3 fix (2026-05-25):
//   B10b — PSA -> CRM service_project.completed handoff was missing
//   target_domain_module_id because no CRM module declared any role on
//   service_projects (216). Resolve by:
//     1. Insert domain_module_data_objects row: CRM-ACCT-MGT (46) consumes
//        service_projects (216), necessity=optional.
//     2. PATCH handoffs.id=1129 target_domain_module_id=46.
//
// Idempotent on both steps.

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

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

const MODULE_ID = 46;  // CRM-ACCT-MGT
const DATA_OBJECT_ID = 216;  // service_projects
const HANDOFF_ID = 1129;

// ============================================================
// Step 1 — DMDO consumer row
// ============================================================
console.log(`Step 1: ensure DMDO row CRM-ACCT-MGT(${MODULE_ID}) consumes service_projects(${DATA_OBJECT_ID})`);

const existingDmdo = await get(
  `/domain_module_data_objects?and=(domain_module_id.eq.${MODULE_ID},data_object_id.eq.${DATA_OBJECT_ID})&select=id,role,necessity,notes`,
);
if (existingDmdo.length > 0) {
  console.log(`  already present: ${JSON.stringify(existingDmdo[0])}`);
} else {
  await insert("/domain_module_data_objects", [
    {
      domain_module_id: MODULE_ID,
      data_object_id: DATA_OBJECT_ID,
      role: "consumer",
      necessity: "optional",
      notes: "",
    },
  ]);
  const refetch = await get(
    `/domain_module_data_objects?and=(domain_module_id.eq.${MODULE_ID},data_object_id.eq.${DATA_OBJECT_ID})&select=id,role,necessity,notes`,
  );
  console.log(`  inserted: ${JSON.stringify(refetch[0])}`);
}

// ============================================================
// Step 2 — PATCH handoff target_domain_module_id
// ============================================================
console.log(`\nStep 2: PATCH handoffs.id=${HANDOFF_ID} target_domain_module_id=${MODULE_ID}`);

const beforeHandoff = await get(
  `/handoffs?id=eq.${HANDOFF_ID}&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,trigger_event_id`,
);
if (beforeHandoff.length === 0) {
  throw new Error(`handoffs.id=${HANDOFF_ID} not found`);
}
console.log(`  before: ${JSON.stringify(beforeHandoff[0])}`);

if (Number(beforeHandoff[0].target_domain_module_id) === MODULE_ID) {
  console.log(`  already set, skipping`);
} else {
  await patch(`/handoffs?id=eq.${HANDOFF_ID}`, {
    target_domain_module_id: MODULE_ID,
  });
}

const afterHandoff = await get(
  `/handoffs?id=eq.${HANDOFF_ID}&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id`,
);
console.log(`  after:  ${JSON.stringify(afterHandoff[0])}`);

if (Number(afterHandoff[0].target_domain_module_id) !== MODULE_ID) {
  throw new Error(
    `PATCH did not stick: target_domain_module_id is still ${afterHandoff[0].target_domain_module_id}`,
  );
}

console.log("\nPhase 3 complete.");
console.log("UI:");
console.log(`  https://tests.semantius.app/domain_map/domain_module_data_objects?domain_module_id=eq.${MODULE_ID}&data_object_id=eq.${DATA_OBJECT_ID}`);
console.log(`  https://tests.semantius.app/domain_map/handoffs?id=eq.${HANDOFF_ID}`);
