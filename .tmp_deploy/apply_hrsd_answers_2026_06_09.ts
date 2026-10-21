#!/usr/bin/env bun
// .tmp_deploy/apply_hrsd_answers_2026_06_09.ts
//
// Apply the decided answers from audits/HRSD/a-HRSD.md (the a-file IS the approval for the
// destructive steps, Rule #22). Idempotent / re-runnable.
//
//   a2  swap handoff 119 tag:  DELETE discovery_override(196) -> INSERT agent_curated(242)
//   a3  swap handoff 369 tag:  DELETE discovery_override(41)  -> INSERT agent_curated(242)
//   a4  swap handoff 1109 tag: DELETE discovery_substring(250)-> INSERT agent_curated(235)
//   a5  clear 25 templated/provenance notes (15 handoffs + 10 module-75 DMDO); KEEP 192, 193
//   a6  hr_cases.has_submit_lock = true
//   a7  hr_cases.has_single_approver = true
//   a8  rename trigger_event 21 'case.access_required' -> 'hr_case.access_required'
//   a10 approve handoff_processes across the HRSD cross-domain set EXCEPT the 2 customer-service
//       mis-tags (process_id=196 on handoffs 29 / 467), which are surfaced back to the user.
//
// a1 (embed - necessity question), a11/a13 (research), a12 (no master) are NOT here; they loop back.
import { pg } from "../scripts/lib/catalog";

// ---- a2 / a3 / a4 : tag swaps (idempotent) ----
// [handoff_id, old_hp_id, new_process_id]
const SWAPS: [number, number, number][] = [
  [119, 78, 242],  // -> Manage employee inquiry process (10523)
  [369, 36, 242],  // -> Manage employee inquiry process (10523)
  [1109, 88, 235], // -> Manage employee assistance and retention (21439)
];
for (const [hid, oldHp, newPid] of SWAPS) {
  const exists = await pg("GET", `/handoff_processes?handoff_id=eq.${hid}&process_id=eq.${newPid}&select=id`);
  if (!exists || !exists.length) {
    await pg("POST", "/handoff_processes", {
      handoff_id: hid,
      process_id: newPid,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted -> DB default 'new' (a10 approves it below)
    });
    console.log(`swap: inserted agent_curated (handoff ${hid} -> process ${newPid})`);
  } else {
    console.log(`swap: target already present (handoff ${hid} -> process ${newPid})`);
  }
  const old = await pg("GET", `/handoff_processes?id=eq.${oldHp}&select=id`);
  if (old && old.length) {
    await pg("DELETE", `/handoff_processes?id=eq.${oldHp}`);
    console.log(`swap: deleted stale row hp.id=${oldHp} (handoff ${hid})`);
  }
}

// ---- a5 : clear templated / provenance notes (25 rows) ----
const NOTE_HANDOFFS = [9, 250, 402, 416, 420, 429, 446, 448, 467, 721, 1048, 1109, 1118, 1119, 1137];
const NOTE_DMDO_DOIDS = [18, 45, 144, 152, 157, 161, 173, 286, 410, 704];
await pg("PATCH", `/handoffs?id=in.(${NOTE_HANDOFFS.join(",")})`, { notes: "" });
console.log(`a5: cleared notes on ${NOTE_HANDOFFS.length} handoffs`);
await pg("PATCH", `/domain_module_data_objects?domain_module_id=eq.75&data_object_id=in.(${NOTE_DMDO_DOIDS.join(",")})`, { notes: "" });
console.log(`a5: cleared notes on ${NOTE_DMDO_DOIDS.length} module-75 DMDO rows`);
console.log("a5: KEPT data_objects 192 (hr_cases, substantive) and 193 (case_categories, config-shape exemption)");

// ---- a6 / a7 : hr_cases pattern flags ----
await pg("PATCH", `/data_objects?id=eq.192`, { has_submit_lock: true, has_single_approver: true });
console.log("a6/a7: hr_cases has_submit_lock=true, has_single_approver=true");

// ---- a8 : rename trigger event 21 ----
await pg("PATCH", `/trigger_events?id=eq.21`, { event_name: "hr_case.access_required" });
console.log("a8: trigger_event 21 renamed -> hr_case.access_required");

// ---- a10 : approve the consolidated batch (exclude the 2 customer-service mis-tags, process 196) ----
const SET = [9, 29, 119, 250, 369, 402, 416, 420, 429, 446, 447, 448, 467, 721, 1048, 1109, 1118, 1119, 1120, 1121, 1137];
const rows = await pg("GET", `/handoff_processes?handoff_id=in.(${SET.join(",")})&select=id,handoff_id,process_id,record_status`);
const toApprove = (rows ?? []).filter((r: any) => r.process_id !== 196 && r.record_status !== "approved");
const excluded = (rows ?? []).filter((r: any) => r.process_id === 196);
for (const r of toApprove) {
  await pg("PATCH", `/handoff_processes?id=eq.${r.id}`, { record_status: "approved" });
}
console.log(`a10: approved ${toApprove.length} handoff_processes rows`);
console.log(`a10: EXCLUDED ${excluded.length} customer-service (process 196) rows -> surfaced: ${excluded.map((r: any) => `hp.${r.id}(handoff ${r.handoff_id})`).join(", ")}`);
console.log("done.");
