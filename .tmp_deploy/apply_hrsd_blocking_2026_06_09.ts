#!/usr/bin/env bun
// .tmp_deploy/apply_hrsd_blocking_2026_06_09.ts
//
// Apply the blocking answers from the 2nd a-HRSD.md (the a-file IS the approval, Rule #22).
// Idempotent / re-runnable.
//
//   a1=yes  embed the 6 M9 consumer+required rows as embedded_master (5 required, 1 optional)
//   a2=a    delete the redundant customer-service tag on handoff 467 (hp.261);
//           re-tag handoff 29 (HR case -> ITSM IT-assistance) from PCF 196 -> PCF 1316
//           "Provide IT resolution capabilities", and approve it (completes the a10=c batch)
//   a3=a    reword hr_cases (192) note: drop the now-false "No single approver" clause,
//           keep the sensitivity + reopen context verbatim (the option spelled out the exact change)
import { pg } from "../scripts/lib/catalog";

// ---- a1 : embed (consumer+required -> embedded_master) with the confirmed necessity split ----
// [dmdo_id, necessity]
const EMBED: [number, string][] = [
  [333, "required"],  // employees @ HRSD-CASE-MGMT
  [338, "required"],  // employees @ HRSD-EMPLOYEE-PORTAL
  [337, "required"],  // knowledge_articles @ HRSD-EMPLOYEE-PORTAL
  [339, "required"],  // knowledge_articles @ HRSD-KNOWLEDGE
  [336, "required"],  // hr_cases @ HRSD-EMPLOYEE-PORTAL (intra-domain; master is HRSD-CASE-MGMT)
  [335, "optional"],  // service_requests @ HRSD-EMPLOYEE-PORTAL (secondary surface)
];
for (const [id, nec] of EMBED) {
  await pg("PATCH", `/domain_module_data_objects?id=eq.${id}`, { role: "embedded_master", necessity: nec });
}
console.log(`a1: embedded ${EMBED.length} rows as embedded_master (5 required, 1 optional)`);

// ---- a2 : delete redundant 467 tag; re-tag handoff 29 -> PCF 1316; approve the new 29 row ----
// 467 redundant customer-service row (handoff 467 already has the correct PCF 242 tag, approved).
const redundant = await pg("GET", `/handoff_processes?id=eq.261&select=id`);
if (redundant && redundant.length) {
  await pg("DELETE", `/handoff_processes?id=eq.261`);
  console.log("a2: deleted redundant customer-service tag hp.261 (handoff 467)");
} else {
  console.log("a2: redundant hp.261 already gone");
}
// handoff 29: replace the customer-service tag (hp.77, PCF 196) with PCF 1316.
const IT_PROCESS = 1316; // "Provide IT resolution capabilities" (apqc_pcf_cross_industry, external_id 20923)
const exists29 = await pg("GET", `/handoff_processes?handoff_id=eq.29&process_id=eq.${IT_PROCESS}&select=id`);
let new29Id: number | null = null;
if (!exists29 || !exists29.length) {
  const created = await pg("POST", "/handoff_processes", {
    handoff_id: 29,
    process_id: IT_PROCESS,
    role: "implements",
    proposal_source: "agent_curated",
    record_status: "approved", // completes the a10=c batch now that the tag is corrected
  });
  new29Id = created[0].id as number;
  console.log(`a2: re-tagged handoff 29 -> PCF ${IT_PROCESS} (hp.${new29Id}, approved)`);
} else {
  await pg("PATCH", `/handoff_processes?id=eq.${exists29[0].id}`, { record_status: "approved" });
  console.log(`a2: handoff 29 already tagged at PCF ${IT_PROCESS}; ensured approved`);
}
const stale29 = await pg("GET", `/handoff_processes?id=eq.77&select=id`);
if (stale29 && stale29.length) {
  await pg("DELETE", `/handoff_processes?id=eq.77`);
  console.log("a2: deleted stale customer-service tag hp.77 (handoff 29)");
} else {
  console.log("a2: stale hp.77 already gone");
}

// ---- a3 : reword hr_cases (192) note (drop the contradicting clause, keep the rest verbatim) ----
const REWORDED = "Contains sensitive employee data (ER complaints, medical leave, comp questions). Cases can reopen after closure.";
await pg("PATCH", `/data_objects?id=eq.192`, { notes: REWORDED });
console.log("a3: hr_cases note reworded (dropped 'No single approver' clause)");
console.log("done.");
