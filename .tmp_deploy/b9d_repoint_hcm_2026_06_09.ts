#!/usr/bin/env bun
// .tmp_deploy/b9d_repoint_hcm_2026_06_09.ts
//
// B9d execution for HCM (review again, 2026-06-09). Re-point the 22 coarse
// `discovery_override` handoff_processes tags (the 7.3-family onboarding/training/dev L2 +
// career-dev 226 + offboarding 1059) to HCM's REALIZED worker-lifecycle process, by event:
//   employee.created   -> 243 (7.7.3 Manage and maintain employee data)
//   employee.terminated -> 239 (7.6.2 Manage separation)
//   employee.promoted  -> 240 (7.6.3 Relocate employees and manage assignments)
// 243/239/240 are all gated lifecycle process_ids carrying R+A, so each becomes RESOLVED.
// Re-point = delete the stale discovery_override row + insert agent_curated (record_status='new').
// These are not approved tags (machine-generated discovery_override), so this is corrective, not
// a destructive overwrite of user-approved content (Rule #21).
import { pg } from "../scripts/lib/catalog";

// hp ids grouped by the realized process they should point to (derived from the B9d resolver run)
const GROUPS: [number, number[]][] = [
  [243, [34, 26, 29, 38, 40, 42, 44, 24]],          // employee.created
  [239, [25, 31, 32, 35, 43, 30, 45, 1065, 1067]],  // employee.terminated (incl. offboarding 1059)
  [240, [28, 39, 41, 33, 1064]],                    // employee.promoted (incl. career-dev 226)
];

let repointed = 0, skipped = 0;
for (const [newPid, hpIds] of GROUPS) {
  for (const hpId of hpIds) {
    const ex = await pg("GET", `/handoff_processes?id=eq.${hpId}&select=id,handoff_id,process_id`);
    if (!ex?.length) { console.log(`SKIP hp=${hpId}: not found`); skipped++; continue; }
    const handoffId = ex[0].handoff_id as number;
    const oldPid = ex[0].process_id as number;
    if (oldPid === newPid) { console.log(`SKIP hp=${hpId}: already ${newPid}`); skipped++; continue; }
    // ensure the correct agent_curated row exists (composed key handoff_id+process_id)
    const exNew = await pg("GET", `/handoff_processes?handoff_id=eq.${handoffId}&process_id=eq.${newPid}&select=id`);
    if (!exNew?.length) {
      await pg("POST", "/handoff_processes", { handoff_id: handoffId, process_id: newPid, role: "implements", proposal_source: "agent_curated" });
    }
    // delete the stale coarse tag
    await pg("DELETE", `/handoff_processes?id=eq.${hpId}`);
    console.log(`repoint hp=${hpId} handoff=${handoffId} ${oldPid} -> ${newPid}`);
    repointed++;
  }
}
console.log(`B9d re-points: ${repointed} done, ${skipped} skipped.`);
