#!/usr/bin/env bun
// ATS Validate pass (2026-11-01): additive boundary fixes from the market / pairwise passes.
//   A1  dmdo ATS-CANDIDATE-CRM consumes records_retention_policies (GDPR retention; the
//       2026-06-09 decision that was never written)
//   A2  dmdo ATS-RECRUITMENT-PIPELINE consumes data_object 25 (SWP h455 consumer leg)
//   A3  dmdo ATS-RECRUITMENT-PIPELINE consumes data_object 726 (PSA h1023 consumer leg)
//   A4  handoff job_offer.accepted ATS-OFFERS -> BGV-SCREENING-ORDERS, payload background_checks (+ tag 1020)
//   A5  handoff job_offer.rescinded, same edge (+ tag 1020)
//   A6  handoff requisition.filled ATS-RECRUITMENT-PIPELINE -> TLNT-INTEL-MOBILITY, payload job_requisitions (+ tag 219)
// Insert-only, idempotent by natural key; record_status and notes omitted. Dry-run by default;
// pass --apply to write.
import { preflightHandoffs } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, unknown>;
const APPLY = process.argv.includes("--apply");

async function call(body: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (path: string) => call({ method: "GET", path });
const post = (path: string, rows: Row[]) => call({ method: "POST", path, body: rows });

const ATS = 56, BGV = 191, TLNT_INTEL = 170;
const CRM = 1, PIPE = 4, OFF = 6, BGV_ORDERS = 408, TLNT_MOBILITY = 176;
const EV = { offer_accepted: 80, offer_rescinded: 1208, requisition_filled: 106 };
const DO = { job_requisitions: 1, background_checks: 12, records_retention_policies: 433 };

const DMDO: Row[] = [
  { domain_module_id: CRM, data_object_id: DO.records_retention_policies, role: "consumer", necessity: "optional" },
  { domain_module_id: PIPE, data_object_id: 25, role: "consumer", necessity: "optional" },
  { domain_module_id: PIPE, data_object_id: 726, role: "consumer", necessity: "optional" },
];

const HANDOFFS: { row: Row; process_id: number }[] = [
  {
    row: {
      source_domain_id: ATS, source_domain_module_id: OFF, target_domain_id: BGV, target_domain_module_id: BGV_ORDERS,
      trigger_event_id: EV.offer_accepted, data_object_id: DO.background_checks, integration_pattern: "api_call", friction_level: "medium",
      description: "When a candidate accepts an offer that is contingent on screening, the recruiting team orders the screening package for that candidate; the screening order is opened against the accepted offer.",
    },
    process_id: 1020,
  },
  {
    row: {
      source_domain_id: ATS, source_domain_module_id: OFF, target_domain_id: BGV, target_domain_module_id: BGV_ORDERS,
      trigger_event_id: EV.offer_rescinded, data_object_id: DO.background_checks, integration_pattern: "event_stream", friction_level: "low",
      description: "When an offer is rescinded, any screening order opened for it is canceled so the candidate is not screened for a hire that will not happen.",
    },
    process_id: 1020,
  },
  {
    row: {
      source_domain_id: ATS, source_domain_module_id: PIPE, target_domain_id: TLNT_INTEL, target_domain_module_id: TLNT_MOBILITY,
      trigger_event_id: EV.requisition_filled, data_object_id: DO.job_requisitions, integration_pattern: "event_stream", friction_level: "low",
      description: "When a requisition is filled, the internal mobility marketplace closes the matching internal opportunity so employees stop applying to a role that is no longer open.",
    },
    process_id: 219,
  },
];

// ---- verify every referenced id exists (writers are active; never trust a stale id)
const need: [string, number[]][] = [
  ["/data_objects", [DO.job_requisitions, DO.background_checks, DO.records_retention_policies, 25, 726]],
  ["/domain_modules", [CRM, PIPE, OFF, BGV_ORDERS, TLNT_MOBILITY]],
  ["/domains", [ATS, BGV, TLNT_INTEL]],
  ["/trigger_events", Object.values(EV)],
  ["/business_processes", [1020, 219]],
];
for (const [path, ids] of need) {
  const got = await get(`${path}?id=in.(${ids.join(",")})&select=id`);
  const missing = ids.filter((id) => !got.some((g: any) => g.id === id));
  if (missing.length) throw new Error(`${path}: ids not found ${missing.join(", ")}`);
}

// ---- A1-A3: dmdo rows, skip when (module, data_object) already has a row
const existingDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${CRM},${PIPE})&select=domain_module_id,data_object_id,role`);
const dmdoNew = DMDO.filter((r) => !existingDmdo.some((e: any) => e.domain_module_id === r.domain_module_id && e.data_object_id === r.data_object_id));
for (const r of DMDO) console.log(`${dmdoNew.includes(r) ? "+" : "="} dmdo module ${r.domain_module_id} <- data_object ${r.data_object_id} (${r.role}, ${r.necessity})`);

// ---- A4-A6: handoffs, skip when the natural key already exists
const keyOf = (h: any) => [h.source_domain_id, h.target_domain_id, h.source_domain_module_id, h.target_domain_module_id, h.trigger_event_id, h.data_object_id].join(".");
const existingHandoffs = await get(`/handoffs?source_domain_id=eq.${ATS}&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id`);
const handoffNew = HANDOFFS.filter((h) => !existingHandoffs.some((e: any) => keyOf(e) === keyOf(h.row)));
for (const h of HANDOFFS) console.log(`${handoffNew.includes(h) ? "+" : "="} handoff ${keyOf(h.row)} (tag ${h.process_id})`);

const pf = preflightHandoffs(handoffNew.map((h) => h.row as any), existingHandoffs);
for (const w of pf.warnings) console.log(`  preflight warn: ${w}`);
if (pf.errors.length) throw new Error(`preflight refused: ${pf.errors.join("; ")}`);

if (!APPLY) {
  console.log(`\ndry run: ${dmdoNew.length} dmdo + ${handoffNew.length} handoff(s) + tags would be written. Re-run with --apply.`);
  process.exit(0);
}

if (dmdoNew.length) {
  const out = await post("/domain_module_data_objects", dmdoNew);
  console.log(`wrote ${out.length} dmdo row(s): ${out.map((r: any) => r.id).join(", ")}`);
}
for (const h of handoffNew) {
  const [ins] = await post("/handoffs", [h.row]);
  const [tag] = await post("/handoff_processes", [{ handoff_id: ins.id, process_id: h.process_id, role: "implements", proposal_source: "agent_curated" }]);
  console.log(`wrote handoff ${ins.id} (${keyOf(ins)}) + handoff_processes ${tag.id} -> process ${h.process_id}`);
}
console.log("done.");
