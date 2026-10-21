#!/usr/bin/env bun
// ITAM b1 audit, technical fixes only (2026-05-31 continuation).
//
// Applies the in-scope, agent-fixable items from audits/ITAM.md that meet the
// strict technical filter (PATCH enums/backfills, INSERT handoff_processes where
// the audit pre-specifies handoff_id + resolvable PCF, PATCH notes='' reverts
// where the audit names the row ids, channel substitution PATCHes on skill_tools
// where the audit pre-specifies state + verb).
//
// Defers everything else (catalog UX drafts under Rule #20, judgment calls, the
// two handoffs the audit itself defers to Discover Pass 3).

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

async function insertRows(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

// ============================================================
// B1-S2: channel substitution on skill_tools.
// Audit row ids: skill_tools 1370 (skill 149 send_email required) and 1383
// (skill 150 send_email optional). Per F7 + Rule "Channel vs capability",
// switch tool_id 37 (send_email) to tool_id 913 (notify_person). The pre-flight
// already confirmed no existing 913 row on either skill, so DELETE is not needed.
// ============================================================

async function fixSendEmailToNotifyPerson(): Promise<void> {
  console.log("[B1-S2] channel substitution skill_tools 1370, 1383 send_email -> notify_person");

  // Pre-flight: confirm tool_id 37 and 913 still resolve.
  const tools = await get("/tools?tool_name=in.(send_email,notify_person)&select=id,tool_name");
  const sendEmail = tools.find(t => t.tool_name === "send_email");
  const notifyPerson = tools.find(t => t.tool_name === "notify_person");
  if (!sendEmail || !notifyPerson) {
    throw new Error("send_email or notify_person tool row missing; aborting");
  }
  if (Number(sendEmail.id) !== 37 || Number(notifyPerson.id) !== 913) {
    throw new Error(`tool id drift: send_email=${sendEmail.id} (expected 37), notify_person=${notifyPerson.id} (expected 913)`);
  }

  // Pre-flight: confirm rows 1370 and 1383 still carry tool_id 37.
  const rows = await get("/skill_tools?id=in.(1370,1383)&select=id,skill_id,tool_id,requirement_level");
  if (rows.length !== 2) {
    throw new Error(`expected 2 skill_tools rows (1370,1383), got ${rows.length}`);
  }
  for (const r of rows) {
    if (Number(r.tool_id) !== 37) {
      throw new Error(`row ${r.id} no longer points at tool_id 37 (got ${r.tool_id}); aborting`);
    }
  }

  // Pre-flight: confirm no duplicate (skill_id, tool_id=913) already exists on
  // either skill. (Audit said "if duplicate exists, DELETE instead of PATCH".)
  const dupes = await get("/skill_tools?or=(and(skill_id.eq.149,tool_id.eq.913),and(skill_id.eq.150,tool_id.eq.913))&select=id,skill_id");
  if (dupes.length > 0) {
    console.log(`  duplicates found, switching strategy not implemented in this loader: ${JSON.stringify(dupes)}`);
    throw new Error("notify_person already linked on one of the skills; manual reconciliation required");
  }

  // PATCH the two rows.
  for (const id of [1370, 1383]) {
    await patch(`/skill_tools?id=eq.${id}`, { tool_id: 913 });
    console.log(`  PATCH skill_tools.id=${id} tool_id 37 -> 913`);
  }
}

// ============================================================
// B1-S3: notes revert on data_objects 54 (asset_contracts) and 55
// (asset_lifecycle_events). Audit names ids and recommends revert to ''.
// Rule #15 explicitly permits notes='' reverts when the audit names row ids.
// ============================================================

async function revertDataObjectNotes(): Promise<void> {
  console.log("[B1-S3] data_objects.notes revert to '' on ids 54, 55");

  const rows = await get("/data_objects?id=in.(54,55)&select=id,data_object_name,notes");
  if (rows.length !== 2) {
    throw new Error(`expected 2 data_object rows (54,55), got ${rows.length}`);
  }
  for (const r of rows) {
    if (!String(r.notes ?? "").startsWith("Audit 2026-05-24:")) {
      console.log(`  data_object.id=${r.id} (${r.data_object_name}) notes already cleared or changed; skipping (current: ${JSON.stringify(r.notes)})`);
      continue;
    }
    await patch(`/data_objects?id=eq.${r.id}`, { notes: "" });
    console.log(`  PATCH data_objects.id=${r.id} (${r.data_object_name}) notes -> ''`);
  }
}

// ============================================================
// B1-H1..H7: insert handoff_processes (agent_curated, record_status default 'new').
// Each row in the audit pre-specifies handoff_id and the target process id; the
// pre-flight verified every process id resolves and the audited PCF external_id
// matches the row.
//
// B1-H4 is an additional row on handoff 633 (audit notes the existing
// discovery_substring row tagged PCF 10/19207; the new agent_curated row tags
// the more specific PCF 1389/10830). Both rows coexist because the natural key
// is (handoff_id, process_id); the user reconciles the duplicate during review.
// ============================================================

const handoffProcessProposals: Array<{
  audit_id: string;
  handoff_id: number;
  process_id: number;
}> = [
  { audit_id: "B1-H1", handoff_id: 634, process_id: 807 },  // ITAM-CONTRACTS -> GRC, Manage contracts
  { audit_id: "B1-H2", handoff_id: 635, process_id: 807 },  // ITAM-CONTRACTS -> ERP-FIN, Manage contracts
  { audit_id: "B1-H3", handoff_id: 632, process_id: 1390 }, // ITAM-LIFECYCLE -> ERP-FIN, fixed-asset adjustments
  { audit_id: "B1-H4", handoff_id: 633, process_id: 1389 }, // ITAM-LIFECYCLE -> HAM, fixed-asset additions/retires
  { audit_id: "B1-H5", handoff_id: 853, process_id: 1312 }, // APM -> ITAM-NORMALIZATION-CATALOG, Maintain IT asset records
  { audit_id: "B1-H6", handoff_id: 462, process_id: 1335 }, // IGA -> ITAM-LIFECYCLE, Manage asset resource deployment
  { audit_id: "B1-H7", handoff_id: 645, process_id: 1552 }, // RMM -> ITAM-LIFECYCLE, Update work and asset records
];

async function insertHandoffProcesses(): Promise<void> {
  console.log("[B1-H1..H7] insert handoff_processes (agent_curated)");

  // Pre-flight: verify every handoff and process exist.
  const handoffIds = [...new Set(handoffProcessProposals.map(p => p.handoff_id))];
  const processIds = [...new Set(handoffProcessProposals.map(p => p.process_id))];
  const [handoffs, processes] = await Promise.all([
    get(`/handoffs?id=in.(${handoffIds.join(",")})&select=id`),
    get(`/processes?id=in.(${processIds.join(",")})&select=id,external_id,process_name`),
  ]);
  const handoffSet = new Set(handoffs.map(h => Number(h.id)));
  const processSet = new Set(processes.map(p => Number(p.id)));
  for (const p of handoffProcessProposals) {
    if (!handoffSet.has(p.handoff_id)) throw new Error(`${p.audit_id}: handoff ${p.handoff_id} not found`);
    if (!processSet.has(p.process_id)) throw new Error(`${p.audit_id}: process ${p.process_id} not found`);
  }

  // Pre-flight: skip pairs that already exist (the (handoff_id, process_id)
  // unique key would reject them anyway).
  const existing = await get(`/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`);
  const existingKeys = new Set(existing.map(r => `${r.handoff_id}.${r.process_id}`));

  const toInsert = handoffProcessProposals
    .filter(p => {
      const key = `${p.handoff_id}.${p.process_id}`;
      if (existingKeys.has(key)) {
        console.log(`  ${p.audit_id}: (handoff=${p.handoff_id}, process=${p.process_id}) already present; skipping`);
        return false;
      }
      return true;
    })
    .map(p => ({
      handoff_id: p.handoff_id,
      process_id: p.process_id,
      proposal_source: "agent_curated",
      role: "implements",
      // record_status omitted: default 'new' per Rule #1.
      // notes omitted: empty default per Rule #15.
    }));

  if (toInsert.length === 0) {
    console.log("  nothing to insert");
    return;
  }
  const inserted = await insertRows("/handoff_processes", toInsert);
  console.log(`  inserted ${inserted.length} handoff_processes rows`);
}

// ============================================================
// Main
// ============================================================

const start = Date.now();

await fixSendEmailToNotifyPerson();
await revertDataObjectNotes();
await insertHandoffProcesses();

console.log(`\nITAM b1 technical fixes complete in ${((Date.now() - start) / 1000).toFixed(1)}s`);
console.log("UI: https://tests.semantius.app/domain_map/handoff_processes");
console.log("UI: https://tests.semantius.app/domain_map/skill_tools");
console.log("UI: https://tests.semantius.app/domain_map/data_objects");
