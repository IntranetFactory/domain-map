// P1.5a — HR cluster handoff backfill (6 high-priority gaps).
// Idempotent: re-runs are safe (skips handoffs already present matching source+target+trigger+data_object).
// Run from project root: bun run .tmp_deploy/load_p15a_hr_handoffs.ts [--dry-run]
import { Buffer } from "node:buffer";

const DRY = process.argv.includes("--dry-run");

async function call(tool: string, payload: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: new Response(JSON.stringify(payload)), stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (${code}): ${(stderr || stdout).slice(0, 500)}`);
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// Resolve trigger_event_id by name
const events: { id: number; event_name: string }[] = await call("postgrestRequest", {
  method: "GET",
  path: "/trigger_events?event_name=in.(employee.created,employee.terminated,merit_cycle.approved,enrollment.changed)&select=id,event_name",
});
const eventByName = new Map(events.map(e => [e.event_name, e.id]));
const need = ["employee.created", "employee.terminated", "merit_cycle.approved", "enrollment.changed"];
for (const n of need) if (!eventByName.has(n)) throw new Error(`missing trigger_event "${n}"`);

// Domain IDs (verified): HCM=54, IGA=35, ITAM=3, ITSM=1, COMP-MGMT=60, PAYROLL=55, BEN-ADMIN=61
// data_object IDs (verified): employees=31, asset_lifecycle_events=55, service_requests=48, pay_slips=139, payroll_journal_entries=145

type ProposedHandoff = {
  source_domain_id: number;
  target_domain_id: number;
  data_object_id: number;
  event_name: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "low" | "medium" | "high";
  description: string;
  notes: string;
};

const PROPOSED: ProposedHandoff[] = [
  {
    source_domain_id: 54, target_domain_id: 35, data_object_id: 31,
    event_name: "employee.created", integration_pattern: "api_call", friction_level: "high",
    description: "New employee in HCM triggers identity provisioning in IGA: account creation, group memberships derived from job-code, application-access entitlements. Failure modes: missing role-to-app mapping for new job codes; latency causes day-one access gaps; manual IGA approval queues stall provisioning.",
    notes: "Identity reconciliation pattern: HCM and IGA hold the same logical person in distinct identifier spaces (employee_id vs principal_id). No canonical resolver; matching usually keyed on email but employees pre-day-one may not have one yet.",
  },
  {
    source_domain_id: 54, target_domain_id: 35, data_object_id: 31,
    event_name: "employee.terminated", integration_pattern: "api_call", friction_level: "high",
    description: "Termination in HCM must immediately revoke identity access in IGA: disable account, remove group memberships, terminate app-level entitlements. Failure modes: contractor terminations not flowing (different HCM table); rehires confuse the de-provisioning idempotency; access lingers after termination is the canonical audit finding.",
    notes: "Leaver recall pattern: the going-away event is harder to catch than the arriving event because exits happen via many channels (resignation, RIF, contract end, no-show, death). HCM is the system of record but not always the first to know.",
  },
  {
    source_domain_id: 54, target_domain_id: 3, data_object_id: 55,
    event_name: "employee.terminated", integration_pattern: "api_call", friction_level: "high",
    description: "Termination in HCM triggers asset recovery workflow in ITAM: laptop return, mobile-device deactivation, physical badge revocation, software-license harvest. Failure modes: assets assigned to terminated employees not surfaced because the assignment record was never updated when the asset was passed along; remote employees ghost the return process.",
    notes: "Leaver recall pattern variant: assets assigned by HCM-created employee records may have drifted (reassignment, loaner pools); ITAM's view of who-has-what diverges from HCM's authoritative termination signal.",
  },
  {
    source_domain_id: 54, target_domain_id: 1, data_object_id: 48,
    event_name: "employee.terminated", integration_pattern: "api_call", friction_level: "medium",
    description: "Termination in HCM creates a fan-out of offboarding service requests in ITSM: workspace cleanup, mail-forwarding setup, equipment-return tracking, exit-interview scheduling. Failure modes: template tasks for new role types missing; tasks created against wrong assignee groups when org changed shortly before termination.",
    notes: "Task fan-out pattern: a single trigger generates a workflow of per-template ITSM tickets. Each ticket is its own lifecycle but they share the termination correlation_id.",
  },
  {
    source_domain_id: 60, target_domain_id: 55, data_object_id: 139,
    event_name: "merit_cycle.approved", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Approved merit cycle in COMP-MGMT must propagate new pay rates into PAYROLL before the next pay run. Failure modes: effective-date mismatches between COMP-MGMT planning calendar and PAYROLL pay-period calendar create retro adjustments; partial-cycle approvals (some managers signed off, some not) split the load across pay runs.",
    notes: "Cross-vendor stack shape: COMP-MGMT and PAYROLL frequently live in different vendors (e.g. Workday Compensation + ADP Payroll); employee identity sync is the friction.",
  },
  {
    source_domain_id: 61, target_domain_id: 55, data_object_id: 145,
    event_name: "enrollment.changed", integration_pattern: "batch_sync", friction_level: "low",
    description: "Benefit enrollment changes in BEN-ADMIN (open enrollment, life events, plan election changes) must update payroll deductions for the affected pay period. Failure modes: late-bound effective dates after pay-period close trigger retro deductions; carrier-confirmed enrollment changes lag the payroll feed.",
    notes: "Same-stack low-friction pattern: BEN-ADMIN and PAYROLL typically share an HRIS suite, so the integration is native event-stream or batch with established mapping.",
  },
];

// Idempotent check: skip rows that already match (source_domain_id, target_domain_id, trigger_event_id, data_object_id)
const existing: { id: number; source_domain_id: number; target_domain_id: number; trigger_event_id: number; data_object_id: number }[] = await call(
  "postgrestRequest",
  {
    method: "GET",
    path: "/cross_domain_handoffs?source_domain_id=eq.54&select=id,source_domain_id,target_domain_id,trigger_event_id,data_object_id",
  },
);
// Note: this snapshot covers HCM-source rows; the merit_cycle and enrollment rows have non-HCM sources so we'll re-check those.
const moreExisting: { id: number; source_domain_id: number; target_domain_id: number; trigger_event_id: number; data_object_id: number }[] = await call(
  "postgrestRequest",
  {
    method: "GET",
    path: "/cross_domain_handoffs?source_domain_id=in.(60,61)&select=id,source_domain_id,target_domain_id,trigger_event_id,data_object_id",
  },
);
const existingSet = new Set<string>(
  [...existing, ...moreExisting].map(h => `${h.source_domain_id}|${h.target_domain_id}|${h.trigger_event_id}|${h.data_object_id}`),
);

console.log(`Existing HR-cluster source handoffs: ${existing.length + moreExisting.length}`);

// Build insert rows
const rows = PROPOSED.map(p => {
  const trigger_event_id = eventByName.get(p.event_name)!;
  return {
    source_domain_id: p.source_domain_id,
    target_domain_id: p.target_domain_id,
    data_object_id: p.data_object_id,
    trigger_event_id,
    trigger_event: p.event_name, // keep the legacy string column populated (per project rule to preserve as safety net)
    integration_pattern: p.integration_pattern,
    friction_level: p.friction_level,
    description: p.description,
    notes: p.notes,
    key: `${p.source_domain_id}|${p.target_domain_id}|${trigger_event_id}|${p.data_object_id}`,
  };
});

const toInsert = rows.filter(r => !existingSet.has(r.key));
console.log(`Proposed: ${rows.length}; to insert: ${toInsert.length}; skipping (already present): ${rows.length - toInsert.length}`);

console.log("\nDraft rows:");
for (const r of toInsert) {
  console.log(`  ${r.source_domain_id} → ${r.target_domain_id} on "${r.trigger_event}" (data_object=${r.data_object_id}, friction=${r.friction_level}, pattern=${r.integration_pattern})`);
}

if (DRY) {
  console.log("\n--dry-run: not inserting.");
  process.exit(0);
}

if (toInsert.length === 0) {
  console.log("\n♻ nothing to insert.");
  process.exit(0);
}

// Bulk insert (under 50 rows so single POST is fine)
const body = toInsert.map(({ key, ...row }) => row);
await call("postgrestRequest", { method: "POST", path: "/cross_domain_handoffs", body });
console.log(`\n✨ inserted ${toInsert.length} handoffs`);

// Verify
const after = await call("postgrestRequest", {
  method: "GET",
  path: "/cross_domain_handoffs?source_domain_id=in.(54,60,61)&select=id,source_domain_id,target_domain_id,trigger_event_id,data_object_id,friction_level&order=id.desc&limit=20",
});
console.log(`\nMost-recent HR-cluster handoffs (showing up to 20):`);
for (const h of after.slice(0, toInsert.length + 1)) {
  console.log(`  id=${h.id} ${h.source_domain_id} → ${h.target_domain_id} event=${h.trigger_event_id} data_object=${h.data_object_id} friction=${h.friction_level}`);
}

console.log(`\n✓ P1.5a HR cluster handoff backfill complete.`);
console.log(`  UI: https://tests.semantius.app/domain_map/cross_domain_handoffs`);
