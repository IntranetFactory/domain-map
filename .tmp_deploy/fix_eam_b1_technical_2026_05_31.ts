#!/usr/bin/env bun
//
// EAM B1 residual technical fixes (2026-05-31).
//
// Scope: apply ONLY the truly-technical Bucket-1 items from audits/EAM.md
// that meet the strict residual-pass criteria. Everything else is deferred
// (gated on user judgment, on Phase-A/M module authoring, or on Rule #20
// catalog UX wording the user owns).
//
// Applied here:
//   B1-H1..H6: INSERT 6 handoff_processes (APQC tags) — audit pre-specifies
//              handoff_id + PCF id. All handoffs verified live; all PCF rows
//              verified live by external_id. Idempotent: skip handoffs that
//              already carry the proposed process_id; allow additive insert
//              when an existing tag points at a different (less-specific) PCF.
//
// Deferred (NOT applied here):
//   B1-S1 / B1-S2 / B1-S5 (new modules / capabilities / module-level system
//                          skills) — new entities, Phase A authoring.
//   B1-S3 (catalog_tagline / catalog_description) — Rule #20 buyer-voice draft
//                                                   needs user review.
//   B1-S4 (domain_regulations) — only FDA Part 11 exists in regulations; the
//                                audit's primary picks (OSHA-LOTO, OSHA-PSM,
//                                ISO 55000) would be NEW regulation rows.
//                                FDA Part 11 link itself is conditional on
//                                pharma/biotech scope (user judgment).
//   B1-S6 (lifecycle states / permission_verb_override) — audit does not
//                                pre-specify the (state_name, verb_override)
//                                tuples; PM-schedules exemption is a user
//                                decision under Rule #15.
//   B1-S7 (4 new outbound handoffs for asset.commissioned / asset.retired)
//                              — new handoffs = new entities.
//   B1-B1 / B1-B2 (handoffs.source/target_domain_module_id PATCHes) — gated
//                  on B1-S1 modules existing first; no module ids to PATCH to.
//   B1-M1..M5 (5 new data_objects) — new entities, Phase B authoring.
//
// All inserts ship record_status='new' (DB default) per Rule #1; proposal_source
// 'agent_curated' per H-band procedure.

import { spawn } from "bun";

async function call(body: any): Promise<any> {
  const p = spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  p.stdin.end();
  const stdout = await new Response(p.stdout).text();
  const exit = await p.exited;
  if (exit !== 0) {
    const stderr = await new Response(p.stderr).text();
    throw new Error(`${body.method} ${body.path} failed (${exit}): ${stderr}`);
  }
  return JSON.parse(stdout);
}
const get = (path: string) => call({ method: "GET", path });
const post = (path: string, body: any) => call({ method: "POST", path, body });

console.log("=== EAM B1 residual technical fixes (2026-05-31) ===\n");

// Audit-pre-specified (handoff_id, PCF external_id) tuples from audits/EAM.md
// Bucket 1 APQC TAGGING table (B1-H1..H6).
type Spec = {
  audit_id: string;        // e.g. "B1-H1"
  handoff_id: number;
  external_id: string;     // PCF external_id (audit-pinned)
  flow: string;            // descriptive label
};

const specs: Spec[] = [
  { audit_id: "B1-H1", handoff_id: 866,  external_id: "19255", flow: "EAM -> ITSM   eam_work_order.created             (Perform corrective asset maintenance and repairs)" },
  { audit_id: "B1-H2", handoff_id: 867,  external_id: "19249", flow: "EAM -> MFG    eam_work_order.completed           (Update work and asset records)" },
  { audit_id: "B1-H3", handoff_id: 868,  external_id: "10947", flow: "EAM -> GRC    equipment_pm.due                   (Perform preventative asset maintenance)" },
  { audit_id: "B1-H4", handoff_id: 949,  external_id: "19256", flow: "MFG -> EAM    production_downtime_event.recorded (Identify unplanned maintenance requirements)" },
  { audit_id: "B1-H5", handoff_id: 1260, external_id: "19258", flow: "FSM -> EAM    installed_equipment.decommissioned (Decommission productive assets)" },
  { audit_id: "B1-H6", handoff_id: 320,  external_id: "19249", flow: "FLEET -> EAM  vehicle_work_order.completed       (Update work and asset records)" },
];

console.log(`${specs.length} audit-pre-specified APQC tag candidates\n`);

// Resolve PCF processes by external_id (single batched read)
const externalIds = [...new Set(specs.map(s => s.external_id))];
const processes = await get(
  `/processes?source_framework=eq.apqc_pcf_cross_industry&external_id=in.(${externalIds.join(",")})&select=id,external_id,process_name,hierarchy_level`
);
const procByExtId = new Map<string, any>(processes.map((p: any) => [p.external_id, p]));

// Verify every spec resolves
for (const s of specs) {
  if (!procByExtId.has(s.external_id)) {
    throw new Error(`PCF resolution failed for ${s.audit_id} (handoff ${s.handoff_id}, external_id ${s.external_id}). Aborting per residual-pass safety rule.`);
  }
}
console.log(`Resolved ${externalIds.length} distinct PCF rows by external_id`);

// Verify all handoffs exist
const handoffIds = specs.map(s => s.handoff_id);
const handoffs = await get(`/handoffs?id=in.(${handoffIds.join(",")})&select=id,source_domain_id,target_domain_id`);
if (handoffs.length !== handoffIds.length) {
  const found = new Set(handoffs.map((h: any) => h.id));
  const missing = handoffIds.filter(id => !found.has(id));
  throw new Error(`Handoff resolution failed: missing ids ${missing.join(",")}. Aborting.`);
}
console.log(`Verified ${handoffs.length} of ${handoffIds.length} handoffs exist`);

// Pull existing handoff_processes rows to avoid composite-key dupes
const existingHP: any[] = await get(
  `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id,proposal_source,record_status`
);
const existingByPair = new Set<string>(existingHP.map((r: any) => `${r.handoff_id}:${r.process_id}`));
console.log(`${existingHP.length} pre-existing handoff_processes rows on the 6 target handoffs\n`);

const toInsert: any[] = [];
const skipped: string[] = [];

for (const s of specs) {
  const proc = procByExtId.get(s.external_id)!;
  const key = `${s.handoff_id}:${proc.id}`;
  if (existingByPair.has(key)) {
    console.log(`  - ${s.audit_id} handoff ${s.handoff_id} -> process ${proc.id} already tagged, skip`);
    skipped.push(`${s.audit_id} (already tagged)`);
    continue;
  }
  toInsert.push({
    handoff_id: s.handoff_id,
    process_id: proc.id,
    proposal_source: "agent_curated",
    // record_status omitted, DB default 'new' fires per Rule #1
  });
  console.log(`  + ${s.audit_id} handoff ${s.handoff_id} -> process ${proc.id} (ext ${proc.external_id} L${proc.hierarchy_level}) ${proc.process_name}`);
}

console.log(`\n${toInsert.length} INSERT, ${skipped.length} SKIP\n`);

if (toInsert.length > 0) {
  console.log("Inserting...");
  const inserted = await post("/handoff_processes", toInsert);
  console.log(`  ${inserted.length} rows inserted`);
}

// Post-state verification
console.log("\n=== Post-state ===");
const finalHP = await get(
  `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id,proposal_source,record_status,process:processes(external_id,process_name)&order=handoff_id.asc`
);
const byHandoff = new Map<number, any[]>();
for (const r of finalHP) {
  const arr = byHandoff.get(r.handoff_id) ?? [];
  arr.push(r);
  byHandoff.set(r.handoff_id, arr);
}
let covered = 0;
for (const id of handoffIds) if (byHandoff.has(id)) covered++;
console.log(`${covered} of ${handoffIds.length} target handoffs now carry >=1 APQC tag`);

const sourceCounts = new Map<string, number>();
for (const r of finalHP) sourceCounts.set(r.proposal_source, (sourceCounts.get(r.proposal_source) ?? 0) + 1);
console.log("Proposal source distribution across these handoffs:");
for (const [s, n] of sourceCounts) console.log(`  ${s}: ${n}`);

console.log("\n=== EAM B1 residual technical fixes complete ===");
