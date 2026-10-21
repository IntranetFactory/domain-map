#!/usr/bin/env bun
/**
 * smp_afile_2026_06_16.ts -- execute the answered a-SMP.md decisions.
 *
 * Idempotent. Reads natural keys before every insert; PATCHes only the exact rows enumerated.
 * Writes ONLY catalog rows; touches NO record_status (all inserts omit the field -> DB default 'new').
 * Run from project root: bun run .tmp_deploy/smp_afile_2026_06_16.ts
 *
 * Decisions executed (a-file answers):
 *   q1 B2-M9-SELFCONTAIN  (a): saas_applications (61) consumer -> embedded_master on module 31 (legal_contracts 66 already embedded_master+optional).
 *   q5 B2-B8-XREL         (a): author 2 outbound mirror data_object_relationships (61->47 ITSM incidents; 65->72 S2P purchase_requisitions).
 *   q6 B2-CAP-AUTOMATION  (a): new capability SMP-WORKFLOW-AUTOMATION + domain_module_capabilities on module 185.
 *   q2 B2-E4-RACI + q9-q14 B2-B9D-OWN-*: wire process_id on the 6 grounded gates + author process_raci R+A.
 *
 * NOT executed here (kept open, see report): q4 (B6b owner_side per-row destructive), q8 (b3 entity load needs its own q),
 *   q15 B2-B9D-OWN-53 (now RE-TAG, destructive source edit on S2P), q7/q16 (b3 decided/routed).
 */
export {};
import { pg } from "../scripts/lib/catalog";

const log: string[] = [];
const note = (s: string) => { log.push(s); console.log(s); };

// ----------------------------------------------------------------- q1: M9 self-containment
{
  const rows = await pg("GET", "/domain_module_data_objects?id=eq.98&select=id,role,necessity,data_object_id,domain_module_id");
  const r = rows?.[0];
  if (!r) note("q1: DMDO 98 not found (SKIP)");
  else if (r.role === "embedded_master") note(`q1: DMDO 98 already role=embedded_master (necessity=${r.necessity}) -- no change`);
  else {
    await pg("PATCH", "/domain_module_data_objects?id=eq.98", { role: "embedded_master" });
    note(`q1: PATCH DMDO 98 (saas_applications/61 on module 31) role consumer -> embedded_master (necessity stays ${r.necessity})`);
  }
}

// ----------------------------------------------------------------- q6: new automation capability
let newCapId: number | null = null;
{
  const existing = await pg("GET", "/capabilities?capability_code=eq.SMP-WORKFLOW-AUTOMATION&select=id");
  if (existing?.length) { newCapId = existing[0].id; note(`q6: capability SMP-WORKFLOW-AUTOMATION already exists (id ${newCapId})`); }
  else {
    const ins = await pg("POST", "/capabilities", {
      capability_code: "SMP-WORKFLOW-AUTOMATION",
      capability_name: "SaaS Workflow Automation",
      description: "Declarative no-code automation and self-service provisioning for the SaaS portfolio: build trigger-condition-action workflows, run them on a schedule or on events, and let employees request apps through a governed self-service catalog with multi-stage approval.",
    });
    newCapId = ins?.[0]?.id ?? null;
    note(`q6: INSERT capability SMP-WORKFLOW-AUTOMATION (id ${newCapId}) record_status=new (default)`);
  }
  if (newCapId != null) {
    const dmc = await pg("GET", `/domain_module_capabilities?domain_module_id=eq.185&capability_id=eq.${newCapId}&select=id`);
    if (dmc?.length) note(`q6: domain_module_capabilities (185 -> ${newCapId}) already present`);
    else {
      await pg("POST", "/domain_module_capabilities", { domain_module_id: 185, capability_id: newCapId });
      note(`q6: INSERT domain_module_capabilities module 185 -> capability ${newCapId} (SMP-WORKFLOW-AUTOMATION)`);
    }
  }
}

// ----------------------------------------------------------------- q5: outbound mirror relationships
// Outbound handoff 642 (saas_application.deprovisioned -> ITSM service_incidents 47): 61 -> 47.
// Outbound handoffs 39/45 (shadow/seat -> S2P purchase_requisitions 72): 65 (shadow_it_apps) -> 72.
// owner_side: the related (target) object is mastered by the other domain, so the cross-domain payload
// (incidents = ITSM master; purchase_requisitions = unmastered procurement payload) is the dependent
// the SMP master spawns -> owner_side=source (the SMP master is the parent/origin of the edge).
const mirrors = [
  {
    data_object_id: 61, related_data_object_id: 47, relationship_type: "one_to_many", relationship_kind: "reference",
    relationship_verb: "raises_incident", inverse_verb: "raised_on_app_deprovisioning", owner_side: "source", is_required: false,
    label: "saas_applications raises_incident service_incidents (handoff 642 -> ITSM)",
  },
  {
    data_object_id: 65, related_data_object_id: 72, relationship_type: "one_to_many", relationship_kind: "reference",
    relationship_verb: "triggers_requisition", inverse_verb: "raised_for_sanctioning", owner_side: "source", is_required: false,
    label: "shadow_it_apps triggers_requisition purchase_requisitions (handoffs 39/45 -> S2P)",
  },
];
for (const m of mirrors) {
  const found = await pg("GET", `/data_object_relationships?data_object_id=eq.${m.data_object_id}&related_data_object_id=eq.${m.related_data_object_id}&relationship_verb=eq.${encodeURIComponent(m.relationship_verb)}&select=id`);
  if (found?.length) { note(`q5: mirror relationship already present (${m.label})`); continue; }
  await pg("POST", "/data_object_relationships", {
    data_object_id: m.data_object_id, related_data_object_id: m.related_data_object_id,
    relationship_type: m.relationship_type, relationship_kind: m.relationship_kind,
    relationship_verb: m.relationship_verb, inverse_verb: m.inverse_verb,
    owner_side: m.owner_side, is_required: m.is_required,
  });
  note(`q5: INSERT mirror relationship ${m.label} (record_status=new default)`);
}

// ----------------------------------------------------------------- q2 + q9-q14: RACI overlay + process_id wiring
// Each of the 6 cross-domain APQC processes SMP is tagged on gets (a) a realizing SMP gate wired with
// process_id and (b) process_raci Responsible + Accountable (single persona = "named owner runs and approves it").
// Personas: 16 IT-SAAS-ADMIN, 17 PROCUREMENT-SAAS-RENEWAL-OWNER, 18 ITAM-SAAS-PORTFOLIO-MANAGER.
const PROC = {
  P156: 156,   // 4.1.2  Manage demand for products            (q9)  -> renewal owner (17)
  P294: 294,   // 8.7.7  Manage infrastructure resource admin   (q10) -> SaaS admin (16)
  P317: 317,   // 9.6.3  Manage corporate credit cards          (q11) -> SaaS admin (16)
  P260: 260,   // 8.2.2  Manage IT portfolio strategy           (q12) -> portfolio mgr (18)
  P1134: 1134, // 8.2.5.6 Optimize IT resource allocation       (q13) -> portfolio mgr (18)
  P273: 273,   // 8.3.8  Manage IT user identity and authz      (q14) -> SaaS admin (16)
};

// process_id -> realizing SMP gated lifecycle state ids (the gate that the cross-domain work fires on).
const wiring: Record<number, number[]> = {
  [PROC.P156]: [518, 519, 520],            // saas_subscriptions: initiate/approve/cancel renewal = demand mgmt
  [PROC.P294]: [514, 1425, 1426, 1427, 1429, 1430, 1431, 1433, 1434, 1435, 1436, 1481, 1482, 1483, 1488], // promote_shadow_app + integrations + catalog listings + alerts + automation workflows/runs = infra resource admin
  [PROC.P317]: [515],                       // block_shadow_app (card-detected shadow IT)
  [PROC.P260]: [505, 506, 1438, 1439, 1440, 1441], // sanction/deprecate application + app lifecycle stages = portfolio strategy
  [PROC.P1134]: [511, 1444, 1445, 1446, 1447, 1449, 1451, 1452, 1453, 1471, 1473], // reclaim seat + recommendations + reclamation + spend allocation = optimize allocation
  [PROC.P273]: [507, 1422, 1489, 1490, 1491, 1492, 1493, 1494], // deprovision app + revoke owner + app-request provisioning gates = identity/authz
};
// process_id -> persona (R = A = this persona)
const owner: Record<number, number> = {
  [PROC.P156]: 17, [PROC.P294]: 16, [PROC.P317]: 16, [PROC.P260]: 18, [PROC.P1134]: 18, [PROC.P273]: 16,
};

// (a) wire process_id on each realizing gate (only where currently null; never overwrite a set value).
for (const [pidStr, states] of Object.entries(wiring)) {
  const pid = Number(pidStr);
  for (const sid of states) {
    const row = await pg("GET", `/data_object_lifecycle_states?id=eq.${sid}&select=id,process_id,state_name`);
    const r = row?.[0];
    if (!r) { note(`q2: lifecycle state ${sid} not found (SKIP)`); continue; }
    if (r.process_id != null) {
      if (Number(r.process_id) === pid) note(`q2: state ${sid} already wired to process ${pid}`);
      else note(`q2: state ${sid} already wired to a DIFFERENT process ${r.process_id} (leave; not overwriting)`);
      continue;
    }
    await pg("PATCH", `/data_object_lifecycle_states?id=eq.${sid}`, { process_id: pid });
    note(`q2: wire state ${sid} (${r.state_name}) -> process_id ${pid}`);
  }
}

// (b) author process_raci R + A per process (idempotent by process_id+raci+actor_role_id).
for (const [pidStr, roleId] of Object.entries(owner)) {
  const pid = Number(pidStr);
  for (const raci of ["responsible", "accountable"] as const) {
    const found = await pg("GET", `/process_raci?process_id=eq.${pid}&raci=eq.${raci}&actor_role_id=eq.${roleId}&select=id`);
    if (found?.length) { note(`q9-14: process_raci ${pid}/${raci}/role${roleId} already present`); continue; }
    await pg("POST", "/process_raci", { process_id: pid, raci, actor_role_id: roleId });
    note(`q9-14: INSERT process_raci process ${pid} ${raci} -> role ${roleId}`);
  }
}

note("\nDONE. Verify the rows in the catalog; nothing was committed to git.");
