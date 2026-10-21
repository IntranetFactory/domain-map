#!/usr/bin/env bun
// .tmp_deploy/psa_audit_2026_06_06_h1_apqc.ts
//
// PSA state-driven audit 2026-06-06, EXECUTE item 4 (B1A-H1, NET-NEW only):
//   INSERT agent_curated handoff_processes rows for the cross-domain handoffs that are
//   still untagged. Idempotent on (handoff_id, process_id): re-check existing first,
//   insert only where no row for that pair exists. proposal_source='agent_curated',
//   role='implements', record_status omitted (defaults to 'new').
//
//   SKIP 787 (defer to Discover; no clean PCF match).
//   1129 is a NET-NEW agent_curated alongside its weak discovery_substring (process 569);
//     the 569 deletion is SURFACED, not done here. 132 already carries agent_curated 808,
//     so it is NOT re-tagged here (its 569 deletion is also surfaced).
import { pg } from "../scripts/lib/catalog";

// [handoff_id, process_id, note-for-log]
const TAGS: [number, number, string][] = [
  [1130, 1417, "utilization_low -> Analyze and report employee utilization"],
  [1016, 240, "assignment.confirmed -> Relocate employees and manage assignments"],
  [1021, 1325, "milestone.slipped -> Perform variance analysis against forecasts and budgets"],
  [1022, 240, "allocation.committed -> Relocate employees and manage assignments"],
  [1026, 1036, "skill_inventory.updated -> Define employees competencies and skills"],
  [1018, 980, "assignment.released -> Perform strategic workforce planning"],
  [1027, 887, "skill_inventory.gap_identified -> Define and manage skills taxonomy"],
  [137, 147, "opportunity.closed_won -> Manage leads/opportunities"],
  [1129, 148, "service_project.completed -> Manage customers and accounts (REPLACE weak 569)"],
  [1218, 224, "employee.created -> Manage employee onboarding"],
  [1219, 226, "employee.promoted -> Manage employee career development"],
  [1220, 1059, "employee.terminated -> Manage offboarding"],
  [1221, 247, "attrition_risk.high -> Develop workforce analytics"],
  [1222, 1059, "employee.terminated -> Manage offboarding"],
  [1223, 995, "job_profile.published -> Develop and maintain job descriptions"],
  [1224, 995, "job_profile.updated -> Develop and maintain job descriptions"],
  [1225, 995, "job_profile.activated -> Develop and maintain job descriptions"],
  [1226, 995, "job_profile.retired -> Develop and maintain job descriptions"],
];

let inserted = 0;
let skipped = 0;
for (const [hid, pid, note] of TAGS) {
  const existing = await pg(
    "GET",
    `/handoff_processes?handoff_id=eq.${hid}&process_id=eq.${pid}&select=handoff_id`,
  );
  if (existing && existing.length) {
    console.log(`  skip (exists): handoff ${hid} / process ${pid}  [${note}]`);
    skipped++;
    continue;
  }
  await pg("POST", "/handoff_processes", {
    handoff_id: hid,
    process_id: pid,
    proposal_source: "agent_curated",
    role: "implements",
  });
  console.log(`  INSERT: handoff ${hid} / process ${pid}  [${note}]`);
  inserted++;
}

console.log(`\nhandoff_processes inserted: ${inserted}, skipped (already present): ${skipped}`);
console.log("UI: https://tests.semantius.app/domain_map/handoff_processes");
