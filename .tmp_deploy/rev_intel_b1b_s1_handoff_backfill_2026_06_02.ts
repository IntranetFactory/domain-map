#!/usr/bin/env bun
// B1B-S1: backfill the 6 NULL module FKs on REV-INTEL's cross-domain handoffs.
// Deterministic (B10b: strongest role on the relevant data_object); ties broken semantically.
// Idempotent: only patches a column that is currently NULL.
import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [o, e] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`semantius failed: ${e}`);
  const t = o.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const patch = (p: string, b: Row) => call({ method: "PATCH", path: p, body: b });

const DEAL = 187, CONV = 186;
// [handoff_id, column, module_id, reason]
const FIX: Array<[number,string,number,string]> = [
  [207, "source_domain_module_id", DEAL, "deal_risk.escalated published by deal-scoring surface"],
  [208, "source_domain_module_id", DEAL, "pipeline_health.degraded published by pipeline-inspection (in DEAL-INTEL)"],
  [201, "target_domain_module_id", DEAL, "closed_lost consumed by deal scoring + forecast-accuracy retraining"],
  [473, "target_domain_module_id", DEAL, "stage_changed consumed by deal-risk recalculation"],
  [477, "target_domain_module_id", DEAL, "high_intent_signal consumed by deal scoring"],
  [476, "target_domain_module_id", CONV, "conversation insight published consumed by CONVERSATION (masters payload 124)"],
];

async function main() {
  for (const [hid, col, mod, why] of FIX) {
    const cur = await get(`/handoffs?id=eq.${hid}&select=id,${col}`);
    if (!cur.length) { console.log(`handoff ${hid} not found, skip`); continue; }
    if (cur[0][col] != null) { console.log(`handoff ${hid}.${col} already ${cur[0][col]}, skip`); continue; }
    await patch(`/handoffs?id=eq.${hid}`, { [col]: mod });
    console.log(`handoff ${hid}.${col} -> ${mod}  (${why})`);
  }
  console.log("\n=== VERIFY: remaining NULL module FKs on REV-INTEL side ===");
  const outNull = await get(`/handoffs?source_domain_id=eq.103&source_domain_module_id=is.null&select=id`);
  const inNull = await get(`/handoffs?target_domain_id=eq.103&target_domain_module_id=is.null&select=id`);
  console.log(`outbound source NULL (expect 0): ${outNull.map(r=>r.id).join(",") || "NONE"}`);
  console.log(`inbound target NULL (expect 0): ${inNull.map(r=>r.id).join(",") || "NONE"}`);
}
main().catch(e => { console.error(e); process.exit(1); });
