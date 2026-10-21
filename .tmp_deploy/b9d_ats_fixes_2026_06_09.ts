#!/usr/bin/env bun
// B9d execution — ATS (domain 56). Resolves the cleanly-resolvable outbound payloads.
// Per the user-injected B1A-B9D-VERIFY instruction: re-point ROLL-UPs, realize ATS-owned
// ORPHANs on existing requires_permission=true gates. record_status untouched (Rule #1).
//
//   REALIZE 7.2.1 "Manage employee requisitions" (219) on job_requisitions.open
//           -> resolves #12, #23, #399, #400, #406
//   REALIZE 7.2.2.5 "Manage employee referral programs" (1011) on candidate_referrals.bonus_payable
//           -> resolves #404
//   RE-POINT 7.2.3 "Screen and select" (221) -> 7.2.3.2 "Interview candidates" (1014, realized)
//           on handoff_processes for handoffs 1033/1034/1035 -> resolves 3 (screen/select grain roll-up)
//
// RACI actor convention mirrors ATS's realized recruiting spine:
//   responsible = RECRUITING-RECRUITER (role 6), accountable = RECRUITING-MANAGER (role 9).

import { spawn } from "bun";

async function call(method: string, path: string, body?: any): Promise<any> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${method} ${path} failed: ${await new Response(proc.stderr).text()}`);
  return out ? JSON.parse(out) : null;
}

// 1. Realize 7.2.1 on job_requisitions.open (data_object_id 1).
const r1 = await call("PATCH", "/data_object_lifecycle_states?data_object_id=eq.1&state_name=eq.open", { process_id: 219 });
console.log("wired 219 -> job_requisitions.open:", r1?.length ?? 0, "row(s)");

// 2. Realize 7.2.2.5 on candidate_referrals.bonus_payable (data_object_id 6).
const r2 = await call("PATCH", "/data_object_lifecycle_states?data_object_id=eq.6&state_name=eq.bonus_payable", { process_id: 1011 });
console.log("wired 1011 -> candidate_referrals.bonus_payable:", r2?.length ?? 0, "row(s)");

// 3. process_raci for the two realized processes (R = recruiter 6, A = manager 9). record_status defaults to 'new'.
const raciRows = [
  { process_id: 219, raci: "responsible", actor_role_id: 6 },
  { process_id: 219, raci: "accountable", actor_role_id: 9 },
  { process_id: 1011, raci: "responsible", actor_role_id: 6 },
  { process_id: 1011, raci: "accountable", actor_role_id: 9 },
];
const r3 = await call("POST", "/process_raci", raciRows);
console.log("inserted process_raci:", Array.isArray(r3) ? r3.length : r3, "rows");

// 4. Re-point the three screen/select assessment handoffs to the realized interview gate (1014).
for (const hid of [1033, 1034, 1035]) {
  const rp = await call("PATCH", `/handoff_processes?handoff_id=eq.${hid}&process_id=eq.221`, { process_id: 1014 });
  console.log(`re-pointed handoff ${hid}: 221 -> 1014 (${rp?.length ?? 0} row)`);
}

console.log("\nB9d execution complete. Resolved: #12,#23,#399,#400,#406 (7.2.1), #404 (7.2.2.5), #1033,#1034,#1035 (re-point).");
