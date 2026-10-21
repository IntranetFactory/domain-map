// P1.4 (steps 1–4) — Migrate cross_domain_handoffs from text trigger_event → trigger_event_id FK.
// Does NOT drop the old column (held until end-of-program review).
//
// Steps:
//   1. Add trigger_event_id column on cross_domain_handoffs (FK → trigger_events, restrict).
//   2. Map each existing handoff's (trigger_event, data_object_id) → trigger_events.id via the
//      same collision-resolution table as draft_trigger_events.ts. PATCH each row.
//   3. Update cross_domain_handoffs' cross_domain_handoff_label computed field to render the
//      event part via the new FK (with a graceful null fallback).
//   4. Verify: every handoff has trigger_event_id set; label still rendering.
//
// Run from project root:
//   bun run .tmp_deploy/migrate_handoffs_to_fk.ts --dry-run    (no writes)
//   bun run .tmp_deploy/migrate_handoffs_to_fk.ts              (write)
import { readFileSync } from "node:fs";

const DRY = process.argv.includes("--dry-run");

async function call(tool: string, payload: unknown, opts: { tolerateTimeout?: boolean } = {}): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) {
    const combined = stderr || stdout || "";
    if (opts.tolerateTimeout && combined.includes("Request timed out")) return { __timedOut: true };
    throw new Error(`${tool} (${code}): ${combined.slice(0, 400)}`);
  }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// ---- COLLISION_DECISIONS: must mirror draft_trigger_events.ts ----
type CollisionDecision = { newEvent: string; publisher: string };
const COLLISION_DECISIONS: Record<string, Record<string | number, CollisionDecision>> = {
  "offer.accepted":        { ALL: { newEvent: "offer.accepted",        publisher: "offers" } },
  "employee.created":      { ALL: { newEvent: "employee.created",      publisher: "employees" } },
  "employee.terminated":   { ALL: { newEvent: "employee.terminated",   publisher: "employees" } },
  "requisition.filled":    { ALL: { newEvent: "requisition.filled",    publisher: "job_requisitions" } },
  "subscription.activated":{ ALL: { newEvent: "subscription.activated",publisher: "customer_subscriptions" } },
  "opportunity.closed_won":{ ALL: { newEvent: "opportunity.closed_won",publisher: "opportunities" } },
  "segment.activated":     { ALL: { newEvent: "segment.activated",     publisher: "audience_segments" } },
  "merit_cycle.approved":  { ALL: { newEvent: "merit_cycle.approved",  publisher: "merit_recommendations" } },
  "enrollment.changed":    { ALL: { newEvent: "enrollment.changed",    publisher: "benefit_enrollments" } },
  "alert.threshold_breached": { ALL: { newEvent: "alert.threshold_breached", publisher: "alerts" } },
  "pay_cycle.closed":      { ALL: { newEvent: "pay_cycle.closed",      publisher: "pay_slips" } },
  "contract.signed":       { ALL: { newEvent: "contract.signed",       publisher: "contracts" } },
  "endpoint.discovered": {
    56:  { newEvent: "hardware_endpoint.discovered",  publisher: "hardware_assets" },
    59:  { newEvent: "software_endpoint.discovered",  publisher: "software_installations" },
    76:  { newEvent: "ci_endpoint.discovered",        publisher: "configuration_items" },
  },
  "period.closed": {
    145: { newEvent: "payroll_period.closed",         publisher: "payroll_journal_entries" },
    194: { newEvent: "accounting_period.closed",      publisher: "journal_entries" },
  },
  "ticket.escalated": {
    223: { newEvent: "rmm_ticket.escalated",          publisher: "rmm_agents" },
    233: { newEvent: "msp_ticket.escalated",          publisher: "msp_tickets" },
  },
  "session.completed": {
    47:  { newEvent: "support_session.completed",     publisher: "incidents" },
    235: { newEvent: "msp_session.completed",         publisher: "msp_time_entries" },
  },
};
function resolveCollision(event: string, data_object_id: number): CollisionDecision | null {
  const rules = COLLISION_DECISIONS[event];
  if (!rules) return null;
  return (rules as any).ALL ?? rules[data_object_id] ?? null;
}

// ---- step 1: add trigger_event_id column (idempotent) ----

console.log("=== step 1: trigger_event_id column ===");
const fields = await call("read_field", {
  filters: "table_name=eq.cross_domain_handoffs&field_name=eq.trigger_event_id&select=table_name,field_name",
});
if (fields && fields.length > 0) {
  console.log("  ♻ trigger_event_id already present");
} else {
  if (DRY) {
    console.log("  (dry-run) would create_field trigger_event_id on cross_domain_handoffs (FK → trigger_events, restrict)");
  } else {
    await call("create_field", {
      data: {
        table_name: "cross_domain_handoffs",
        field_name: "trigger_event_id",
        title: "Trigger Event",
        format: "reference",
        reference_table: "trigger_events",
        reference_delete_mode: "restrict",
        relationship_label: "fires",
        description: "Controlled-vocabulary FK to trigger_events. Replaces the legacy free-text `trigger_event` column (which is kept as a safety net until end-of-program review). One event row can be referenced by many handoff rows (one event, many subscribers).",
        width: "default",
        input_type: "default",
      },
    });
    console.log("  ✨ trigger_event_id created");
  }
}

// ---- step 2: build mapping + PATCH ----

console.log("\n=== step 2: map handoffs to trigger_events.id ===");

const columnExists = (fields && fields.length > 0) || !DRY;  // after step 1's create_field in non-dry mode
const selectCols = columnExists ? "id,trigger_event,data_object_id,trigger_event_id" : "id,trigger_event,data_object_id";
const handoffs: { id: number; trigger_event: string; data_object_id: number; trigger_event_id?: number | null }[] = await call(
  "postgrestRequest",
  { method: "GET", path: `/cross_domain_handoffs?select=${selectCols}&order=id.asc` },
);
console.log(`  handoffs: ${handoffs.length}`);

const triggerEvents: { id: number; event_name: string }[] = await call(
  "postgrestRequest",
  { method: "GET", path: "/trigger_events?select=id,event_name&limit=1000" },
);
const eventNameToId = new Map(triggerEvents.map(e => [e.event_name, e.id]));
console.log(`  trigger_events vocab: ${triggerEvents.size ?? triggerEvents.length}`);

// build per-handoff mapping
type MapEntry = { id: number; oldString: string; newEventName: string; trigger_event_id: number; alreadySet: boolean };
const mapping: MapEntry[] = [];
const unmapped: { id: number; oldString: string; data_object_id: number; reason: string }[] = [];

for (const h of handoffs) {
  const decision = resolveCollision(h.trigger_event, h.data_object_id);
  const canonical = decision?.newEvent ?? h.trigger_event;
  const teId = eventNameToId.get(canonical);
  if (teId === undefined) {
    unmapped.push({ id: h.id, oldString: h.trigger_event, data_object_id: h.data_object_id, reason: `canonical event "${canonical}" not in trigger_events` });
    continue;
  }
  mapping.push({
    id: h.id,
    oldString: h.trigger_event,
    newEventName: canonical,
    trigger_event_id: teId,
    alreadySet: h.trigger_event_id !== undefined && h.trigger_event_id === teId,
  });
}

console.log(`  mapped: ${mapping.length}`);
console.log(`  unmapped: ${unmapped.length}`);
if (unmapped.length > 0) {
  console.log("  ⚠ unmapped rows:");
  for (const u of unmapped.slice(0, 10)) console.log(`    id=${u.id} "${u.oldString}" doid=${u.data_object_id}: ${u.reason}`);
  if (unmapped.length > 10) console.log(`    …`);
}

const toPatch = mapping.filter(m => !m.alreadySet);
console.log(`  to PATCH: ${toPatch.length}; already correct: ${mapping.length - toPatch.length}`);

if (DRY) {
  console.log("\n  (dry-run) sample of first 10 PATCHes:");
  for (const m of toPatch.slice(0, 10)) {
    const renamed = m.oldString !== m.newEventName ? `  [RENAMED]` : "";
    console.log(`    id=${m.id}: "${m.oldString}" → ${m.trigger_event_id} (${m.newEventName})${renamed}`);
  }
} else if (toPatch.length > 0) {
  // PATCH in batches via filter (id=eq.<id>)
  let done = 0;
  for (const m of toPatch) {
    await call("postgrestRequest", {
      method: "PATCH",
      path: `/cross_domain_handoffs?id=eq.${m.id}`,
      body: { trigger_event_id: m.trigger_event_id },
    });
    done++;
    if (done % 25 === 0 || done === toPatch.length) process.stdout.write(`    PATCH ${done}/${toPatch.length}\r`);
  }
  console.log();
}

// ---- step 3: update computed_field on cross_domain_handoffs ----

console.log("\n=== step 3: update cross_domain_handoff_label computed field ===");

const newComputedFields = [
  {
    name: "cross_domain_handoff_label",
    jsonlogic: {
      set_record: ["s", "domains", { var: "source_domain_id" },
        { set_record: ["t", "domains", { var: "target_domain_id" },
          { if: [
            { var: "trigger_event_id" },
            { set_record: ["e", "trigger_events", { var: "trigger_event_id" },
              { cat: [{ var: "s.domain_name" }, " → ", { var: "t.domain_name" }, " : ", { var: "e.event_name" }] },
            ]},
            { cat: [{ var: "s.domain_name" }, " → ", { var: "t.domain_name" }, " : (no event)"] },
          ]},
        ]},
      ],
    },
    source_module: "domain_map",
  },
];

const currentEntity = await call("read_entity", { filters: "table_name=eq.cross_domain_handoffs" });
const entity = Array.isArray(currentEntity) ? currentEntity[0] : currentEntity;
if (!entity) throw new Error("cross_domain_handoffs entity not found");
const currentLabel = (entity.computed_fields ?? []).find((c: any) => c.name === "cross_domain_handoff_label");
const currentUsesOld = JSON.stringify(currentLabel?.jsonlogic ?? {}).includes("\"trigger_event\"") && !JSON.stringify(currentLabel?.jsonlogic ?? {}).includes("trigger_event_id");

if (!currentUsesOld) {
  console.log("  ♻ label computed field already uses the new FK (or has no reference to the old column)");
} else if (DRY) {
  console.log("  (dry-run) would PATCH /entities to update cross_domain_handoff_label JSONLogic");
  console.log("  new JSONLogic:", JSON.stringify(newComputedFields[0].jsonlogic).slice(0, 200) + "…");
} else {
  await call("postgrestRequest", {
    method: "PATCH",
    path: "/entities?table_name=eq.cross_domain_handoffs",
    body: { computed_fields: newComputedFields },
  });
  console.log("  ✨ computed_field updated");
}

// ---- step 4: verify ----

console.log("\n=== step 4: verify ===");
const verify = await call("postgrestRequest", {
  method: "GET",
  path: "/cross_domain_handoffs?select=id,trigger_event,trigger_event_id,cross_domain_handoff_label&order=id.asc",
});
const nullCount = verify.filter((r: any) => r.trigger_event_id == null).length;
const sample = verify.slice(0, 5);
console.log(`  rows with trigger_event_id IS NULL: ${nullCount}`);
console.log(`  sample (first 5 rows):`);
for (const r of sample) {
  console.log(`    id=${r.id} old="${r.trigger_event}" fk=${r.trigger_event_id} label="${r.cross_domain_handoff_label}"`);
}
if (nullCount === 0) {
  console.log(`\n✓ all ${verify.length} handoffs migrated. Old text column preserved.`);
  console.log(`  UI: https://tests.semantius.app/domain_map/cross_domain_handoffs`);
} else {
  console.log(`\n⚠ ${nullCount} rows still have NULL trigger_event_id — re-run after fixing the unmapped list`);
}
