#!/usr/bin/env bun
// .tmp_deploy/apply_hcm_answers_2026_06_09.ts
//
// Apply the user's a-HCM.md decisions (Rule #22 a-file IS the approval).
//   a2 (B2-S1r):  trigger_event 391 org_unit.created event_category -> 'state_change'
//   a4 (B2-S4r):  data_object 35 employment_contracts.has_personal_content -> true
//   a5 (B2-S4r):  data_object 36 employment_events.has_personal_content   -> true
//   a6 (B2-S8r):  replace ALL ~9 weak/wrong APQC handoff_processes tags with agent_curated.
//                 4 repoint to the correct PCF (delete wrong + insert correct); 4 confirm-as-is
//                 (provenance upgrade discovery_* -> agent_curated). record_status stays 'new'.
// a3 (B2-S2r) needs no write (ratifies the already-applied 2026-05-31 notes revert).
//
// Idempotent + guarded. Destructive parts (a6 deletes, flag flips) are authorized by a-HCM.md.
import { pg } from "../scripts/lib/catalog";

// ---- a2 / a4 / a5 : single-row PATCHes (guarded) ----
const ev = await pg("GET", "/trigger_events?id=eq.391&select=id,event_name,event_category");
if (ev?.[0]) {
  if (ev[0].event_category !== "state_change") {
    await pg("PATCH", "/trigger_events?id=eq.391", { event_category: "state_change" });
    console.log(`a2: trigger_event 391 ${ev[0].event_name} event_category -> state_change (was '${ev[0].event_category}')`);
  } else console.log("a2: already state_change, skip");
} else console.log("a2: trigger_event 391 not found, SKIP");

for (const [doid, label] of [[35, "employment_contracts"], [36, "employment_events"]] as [number, string][]) {
  const d = await pg("GET", `/data_objects?id=eq.${doid}&select=id,data_object_name,has_personal_content`);
  if (!d?.[0]) { console.log(`a4/a5: data_object ${doid} not found, SKIP`); continue; }
  if (d[0].has_personal_content === true) { console.log(`a4/a5: ${label} already true, skip`); continue; }
  await pg("PATCH", `/data_objects?id=eq.${doid}`, { has_personal_content: true });
  console.log(`a4/a5: ${d[0].data_object_name} has_personal_content -> true`);
}

// ---- a6 : replace the weak/wrong APQC tags ----
// process CHANGE: [handoff_id, old_process_id, new_process_id]
const REPOINT: [number, number, number][] = [
  [17, 220, 222],   // candidate.hired: Recruit/Source -> Manage new hire/re-hire
  [393, 220, 222],  // candidate.hired
  [446, 196, 242],  // case.access_required: customer service problems -> Manage employee inquiry process
  [451, 671, 247],  // attrition.forecast_updated: customer attrition -> Develop workforce analytics
];
// CONFIRM (keep process, upgrade provenance to agent_curated): [handoff_id, process_id]
const CONFIRM: [number, number][] = [
  [399, 219],   // Manage employee requisitions
  [135, 1058],  // Manage leave of absence
  [437, 982],   // Develop succession plan
  [1125, 1049], // Review compensation plan
];

let repointed = 0;
for (const [hid, oldPid, newPid] of REPOINT) {
  // insert the correct agent_curated row first (idempotent on the composed key handoff_id+process_id)
  const exNew = await pg("GET", `/handoff_processes?handoff_id=eq.${hid}&process_id=eq.${newPid}&select=id,proposal_source`);
  if (!exNew?.length) {
    await pg("POST", "/handoff_processes", { handoff_id: hid, process_id: newPid, role: "implements", proposal_source: "agent_curated" });
  } else if (exNew[0].proposal_source !== "agent_curated") {
    await pg("PATCH", `/handoff_processes?id=eq.${exNew[0].id}`, { proposal_source: "agent_curated" });
  }
  // delete the wrong old row
  const exOld = await pg("GET", `/handoff_processes?handoff_id=eq.${hid}&process_id=eq.${oldPid}&select=id`);
  if (exOld?.length) {
    await pg("DELETE", `/handoff_processes?handoff_id=eq.${hid}&process_id=eq.${oldPid}`);
    console.log(`a6 repoint: handoff ${hid} ${oldPid} -> ${newPid} (deleted old, agent_curated new)`);
    repointed++;
  } else {
    console.log(`a6 repoint: handoff ${hid} old ${oldPid} already gone; ${newPid} agent_curated ensured`);
  }
}

let confirmed = 0;
for (const [hid, pid] of CONFIRM) {
  const ex = await pg("GET", `/handoff_processes?handoff_id=eq.${hid}&process_id=eq.${pid}&select=id,proposal_source`);
  if (!ex?.length) { console.log(`a6 confirm: handoff ${hid} ${pid} MISSING, SKIP (unexpected)`); continue; }
  if (ex[0].proposal_source === "agent_curated") { console.log(`a6 confirm: handoff ${hid} ${pid} already agent_curated`); continue; }
  await pg("PATCH", `/handoff_processes?id=eq.${ex[0].id}`, { proposal_source: "agent_curated" });
  console.log(`a6 confirm: handoff ${hid} ${pid} provenance -> agent_curated`);
  confirmed++;
}
console.log(`a6 done: ${repointed} repointed, ${confirmed} provenance-upgraded.`);
console.log("done.");
