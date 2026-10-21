#!/usr/bin/env bun
// VULN-MGMT Phase-B completion (clears remaining b1a so the domain can flip to next_action_by:user):
//  - intra-domain data_object_relationships (B6) among the 6 new masters
//  - users edges (B7, users id 748) where a master has a human actor
//  - cross-domain data_object_relationships (B8) to CMDB configuration_items and ITSM service_changes
//  - lifecycle-cover trigger_events (B9) over the workflow masters
//  - handoff module-FK backfill (B10b): the single inbound handoff (36) gets its target module
// Idempotent. record_status + notes omitted (defaults). Additive + structural-FK PATCH only.

const M_DETECT = 332;     // VULN-MGMT-DETECT (vulnerability_scans, vulnerabilities, vulnerability_definitions master here)
const M_RISK = 333;       // VULN-MGMT-RISK (vulnerability_assessments master here)
const M_REMEDIATE = 334;  // VULN-MGMT-REMEDIATE (vulnerability_remediations, vulnerability_exceptions master here)
const USERS = 748;

// 6 new masters
const VULN = 1028;        // vulnerabilities
const SCAN = 1029;        // vulnerability_scans
const DEF = 1030;         // vulnerability_definitions
const REM = 1031;         // vulnerability_remediations
const EXC = 1032;         // vulnerability_exceptions
const ASSESS = 1033;      // vulnerability_assessments
// consumed cross-domain masters
const CI = 76;            // configuration_items (CMDB)
const CHG = 50;           // service_changes (ITSM)

async function call(body: any): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(err + out);
  const t = out.trim(); if (!t) return []; const s = t.search(/[\[{]/); return JSON.parse(s >= 0 ? t.slice(s) : t);
}
const get = (p: string) => call({ method: "GET", path: p });
async function post(p: string, rows: any[]) { if (!rows.length) return; for (let i = 0; i < rows.length; i += 50) await call({ method: "POST", path: p, body: rows.slice(i, i + 50) }); }
async function patch(p: string, body: any) { await call({ method: "PATCH", path: p, body }); }

const log: string[] = [];

// ---------- 1. data_object_relationships (B6 intra, B7 users, B8 cross) ----------
// [src, verb, inverse, dst, type, kind, owner_side, is_required]
const rels: [number, string, string, number, string, string, string, boolean][] = [
  // B6 intra-domain (the 6 masters)
  [SCAN, "detects", "detected_by", VULN, "one_to_many", "reference", "source", false],          // a scan detects vulnerabilities
  [VULN, "classified_by", "classifies", DEF, "one_to_many", "reference", "target", false],       // many vulnerabilities classified by one definition (definition is the owning side)
  [VULN, "remediated_by", "remediates", REM, "one_to_many", "reference", "source", false],        // a vulnerability is remediated by remediation work
  [VULN, "waived_by", "waives", EXC, "one_to_many", "reference", "source", false],                // a vulnerability is waived by an exception
  [ASSESS, "scopes", "scoped_by", SCAN, "one_to_many", "reference", "source", false],             // an assessment scopes scans
  [ASSESS, "groups", "grouped_into", VULN, "one_to_many", "reference", "source", false],          // an assessment groups vulnerabilities for the posture snapshot
  // B7 users edges (users is the parent/owner side = source, mirrors aiops_complete.ts)
  [USERS, "assesses", "assessed_by", ASSESS, "one_to_many", "reference", "source", false],        // assessor owns the assessment
  [USERS, "approves", "approved_by", EXC, "one_to_many", "reference", "source", false],           // single approver signs off exceptions
  [USERS, "owns", "owned_by", REM, "one_to_many", "reference", "source", false],                  // remediation owner
  // B8 cross-domain (VULN-MGMT master -> consumed master in another domain)
  [VULN, "affects", "affected_by", CI, "one_to_many", "reference", "target", false],              // many vulnerabilities affect one CMDB configuration item (CI is the owning side)
  [REM, "tracked_via", "tracks", CHG, "one_to_many", "reference", "source", false],               // remediation work executed via an ITSM change
];
{
  const ids = [VULN, SCAN, DEF, REM, EXC, ASSESS, USERS];
  const exist = await get(`/data_object_relationships?data_object_id=in.(${ids.join(",")})&select=data_object_id,related_data_object_id`);
  const have = new Set(exist.map((r: any) => `${r.data_object_id}.${r.related_data_object_id}`));
  const rows = rels.filter(([s, , , d]) => !have.has(`${s}.${d}`)).map(([s, v, iv, d, t, k, o, req]) => ({
    data_object_id: s, related_data_object_id: d, relationship_verb: v, inverse_verb: iv,
    relationship_type: t, relationship_kind: k, owner_side: o, is_required: req,
  }));
  await post("/data_object_relationships", rows);
  log.push(`data_object_relationships: +${rows.length} (of ${rels.length} candidates)`);
}

// ---------- 2. lifecycle-cover trigger_events (B9) ----------
const events: [string, number, number, string, string][] = [
  // [event_name, data_object_id, module_id, event_category, to_state]
  ["vulnerability.detected", VULN, M_DETECT, "state_change", "open"],
  ["vulnerability.triaged", VULN, M_RISK, "state_change", "triaged"],
  ["vulnerability.remediating", VULN, M_REMEDIATE, "state_change", "remediating"],
  ["vulnerability.resolved", VULN, M_REMEDIATE, "state_change", "resolved"],
  ["vulnerability.verified", VULN, M_REMEDIATE, "state_change", "verified"],
  ["vulnerability.closed", VULN, M_REMEDIATE, "state_change", "closed"],
  ["vulnerability.reopened", VULN, M_REMEDIATE, "state_change", "reopened"],
  ["vulnerability_scan.completed", SCAN, M_DETECT, "state_change", "completed"],
  ["vulnerability_scan.failed", SCAN, M_DETECT, "state_change", "failed"],
  ["vulnerability_remediation.assigned", REM, M_REMEDIATE, "state_change", "assigned"],
  ["vulnerability_remediation.completed", REM, M_REMEDIATE, "state_change", "completed"],
  ["vulnerability_exception.requested", EXC, M_REMEDIATE, "state_change", "requested"],
  ["vulnerability_exception.approved", EXC, M_REMEDIATE, "state_change", "approved"],
  ["vulnerability_exception.expired", EXC, M_REMEDIATE, "state_change", "expired"],
  ["vulnerability_assessment.completed", ASSESS, M_RISK, "state_change", "completed"],
];
{
  const exist = await get(`/trigger_events?data_object_id=in.(${VULN},${SCAN},${REM},${EXC},${ASSESS})&select=event_name`);
  const have = new Set(exist.map((r: any) => r.event_name));
  const rows = events.filter(([n]) => !have.has(n)).map(([n, doid, mid, cat, to]) => ({
    event_name: n, data_object_id: doid, domain_module_id: mid, event_category: cat,
    to_state: to, from_state: "", description: `Fired when ${n.split(".")[0].replace(/_/g, " ")} transitions to ${to}.`,
  }));
  await post("/trigger_events", rows);
  log.push(`trigger_events: +${rows.length} (of ${events.length} candidates)`);
}

// ---------- 3. handoff module-FK backfill (B10b) ----------
// Only one handoff touches VULN-MGMT: 36 (SAM software_install.detected -> VULN-MGMT, payload software_installations).
// software_installations is consumed in VULN-MGMT-DETECT (332) -> that is the target module.
// source_domain_module_id is SAM's owed work (report-only here, left null).
{
  const h = await get(`/handoffs?id=eq.36&select=id,target_domain_module_id`);
  let n = 0;
  if (h.length && h[0].target_domain_module_id == null) { await patch(`/handoffs?id=eq.36`, { target_domain_module_id: M_DETECT }); n = 1; }
  log.push(`handoff FK backfill: ${n} inbound target_module (handoff 36 -> DETECT). source_module is SAM's owed work, left null.`);
}

console.log("===== VULN-MGMT completion =====");
for (const l of log) console.log("  " + l);
