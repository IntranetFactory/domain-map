// P1.3 — Draft the trigger_events vocabulary by Option-1 rules:
//   - keep event_name unique
//   - resolve 16 across-data_object collisions by renaming (Patterns A/C)
//   - collapse Pattern-B duplicates onto one event row with publisher-side data_object_id
//   - synthesise from_state / to_state / event_category from event_name shape
//
// Modes:
//   bun run .tmp_deploy/draft_trigger_events.ts             → emit markdown table for review
//   bun run .tmp_deploy/draft_trigger_events.ts --write     → insert into trigger_events (idempotent)
//
// Outputs the draft to c:/tmp/trigger_events_draft.md in either mode.
import { writeFileSync, readFileSync } from "node:fs";

const WRITE = process.argv.includes("--write");

async function call(tool: string, payload: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (${code}): ${stderr || stdout}`);
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// ---- pull existing handoffs + data_objects ----

const handoffs: { trigger_event: string; data_object_id: number; friction_level: string }[] = await call(
  "postgrestRequest",
  { method: "GET", path: "/cross_domain_handoffs?select=trigger_event,data_object_id,friction_level&order=id.asc" },
);

const objs: { id: number; data_object_name: string; singular_label?: string; plural_label?: string; display_label: string }[] = JSON.parse(
  readFileSync("c:/tmp/data_objects.json", "utf-8"),
);
const objById = new Map(objs.map(o => [o.id, o]));
const objByName = new Map(objs.map(o => [o.data_object_name, o]));

// ---- collision-resolution table (16 events) ----
// Pattern A/C: rename per (event_name, handoff_data_object_id) → new event_name + publisher data_object_name
// Pattern B (one event, many subscribers, different payload data_objects): rename = same event_name + canonical publisher
type CollisionDecision = { newEvent: string; publisher: string; note?: string };
const COLLISION_DECISIONS: Record<string, Record<number, CollisionDecision>> = {
  // pure Pattern B — one event, multiple subscriber payloads; publisher = the publisher's data_object
  "offer.accepted":        { ALL: { newEvent: "offer.accepted",        publisher: "offers",                note: "ATS-side event; subscribers carry different payloads" } as any },
  "employee.created":      { ALL: { newEvent: "employee.created",      publisher: "employees" } as any },
  "employee.terminated":   { ALL: { newEvent: "employee.terminated",   publisher: "employees" } as any },
  "requisition.filled":    { ALL: { newEvent: "requisition.filled",    publisher: "job_requisitions" } as any },
  "subscription.activated":{ ALL: { newEvent: "subscription.activated",publisher: "customer_subscriptions" } as any },
  "opportunity.closed_won":{ ALL: { newEvent: "opportunity.closed_won",publisher: "opportunities" } as any },
  "segment.activated":     { ALL: { newEvent: "segment.activated",     publisher: "audience_segments" } as any },
  "merit_cycle.approved":  { ALL: { newEvent: "merit_cycle.approved",  publisher: "merit_recommendations" } as any },
  "enrollment.changed":    { ALL: { newEvent: "enrollment.changed",    publisher: "benefit_enrollments" } as any },
  "alert.threshold_breached": { ALL: { newEvent: "alert.threshold_breached", publisher: "alerts" } as any },
  "pay_cycle.closed":      { ALL: { newEvent: "pay_cycle.closed",      publisher: "pay_slips", note: "best-available publisher; no pay_cycles data_object yet" } as any },
  "contract.signed":       { ALL: { newEvent: "contract.signed",       publisher: "contracts" } as any },

  // Pattern A/C — genuinely different events, rename to disambiguate
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

// ---- category and state derivation rules ----

const CATEGORY_RULES: { test: (verb: string) => boolean; cat: string }[] = [
  // threshold first (most specific) — numeric crossing, risk score, capacity breach
  { test: v => /(threshold_breached|exceeded|warning|risk\.high|critical_health_drop|tenure_threshold|attrition_risk)/.test(v), cat: "threshold" },
  // lifecycle: creation / termination / retirement / activation / publication / promotion
  { test: v => /^(created|signed_up|hired|deployed|added|sanctioned|activated|signed|published|drafted|tagged|earned|approved_for_creation)$/.test(v), cat: "lifecycle" },
  { test: v => /^(terminated|retired|cancelled|churned|promoted)$/.test(v), cat: "lifecycle" },
  // signal: external/derived observation only — not approvals, closures, completions
  { test: v => /^(discovered|detected|identified|alert_triggered|received|recorded|interaction|synced|lifecycle_changed)$/.test(v), cat: "signal" },
  { test: v => /(\.detected$|\.discovered$|\.identified$|\.recorded$|\.captured$|engagement_recorded|burst_detected|noise\.suppression_applied|correlation\.identified|anomaly|topology\.published|root_cause\.identified|posted|matched)/.test(v), cat: "signal" },
  // default: state_change (approvals, closures, completions, escalations, transitions)
];

function deriveCategory(eventName: string): string {
  const verb = eventName.split(".").slice(1).join(".");
  for (const r of CATEGORY_RULES) if (r.test(verb)) return r.cat;
  return "state_change";
}

// from_state / to_state heuristics — only filled where the verb is obvious
function deriveStates(eventName: string): { from_state: string; to_state: string } {
  const verb = eventName.split(".").slice(1).join(".");
  // creation-like → no from_state
  if (/^(created|signed_up|recorded|drafted|deployed|added|discovered|captured|detected|identified|published|received|hired|posted|matched|synced|interaction|completed|sourcing\.contract_drafted)$/.test(verb)) {
    return { from_state: "", to_state: verb };
  }
  // explicit state words
  if (/^(accepted|signed|approved|approved_for_creation|hired|cancelled|churned|terminated|retired|sanctioned|activated|completed|closed|filled|resolved|escalated|matched|reimbursable|breached|exceeded|published|posted|paid|refunded|delivered|invoiced)$/.test(verb)) {
    return { from_state: "", to_state: verb };
  }
  if (/_to_(\w+)$/.test(verb)) {
    return { from_state: "", to_state: verb.split("_to_")[1] };
  }
  // changed/updated/refreshed → no specific state
  if (/(changed|updated|refreshed|recorded)/.test(verb)) {
    return { from_state: "", to_state: "" };
  }
  return { from_state: "", to_state: "" };
}

function readableObject(name: string): string {
  return name.replace(/_/g, " ");
}

function deriveDescription(eventName: string, publisherObj: { data_object_name: string; singular_label?: string; plural_label?: string; display_label: string } | undefined, fallbackObj: { data_object_name: string; singular_label?: string; plural_label?: string; display_label: string } | undefined): string {
  const verb = eventName.split(".").slice(1).join(".").replace(/_/g, " ");
  const objLabel = publisherObj?.display_label ?? publisherObj?.data_object_name ?? fallbackObj?.display_label ?? fallbackObj?.data_object_name ?? "(unknown)";
  return `Fired when a ${readableObject(objLabel)} is ${verb}. Publisher domain owns the state transition; subscribers may react by creating downstream artifacts.`;
}

// ---- build the dedup → resolve → enrich pipeline ----

// 1) collect unique (event, data_object_id) pairs with their subscriber counts
type Key = string;
const pairs = new Map<Key, { event: string; data_object_id: number; count: number; frictions: Set<string> }>();
for (const h of handoffs) {
  const k = `${h.trigger_event}|${h.data_object_id}`;
  let v = pairs.get(k);
  if (!v) { v = { event: h.trigger_event, data_object_id: h.data_object_id, count: 0, frictions: new Set() }; pairs.set(k, v); }
  v.count++;
  v.frictions.add(h.friction_level);
}

// 2) Apply collision-resolution rules → produce the canonical events
type FinalEvent = {
  event_name: string;
  publisher_data_object_name: string;
  publisher_data_object_id: number;
  from_state: string;
  to_state: string;
  event_category: string;
  description: string;
  subscriber_count: number;          // sum of subscribers across collapsed pairs
  source_pairs: { event: string; data_object_id: number; count: number }[]; // provenance
  notes: string;
};

const finalByName = new Map<string, FinalEvent>();
const unresolved: { event: string; data_object_id: number; reason: string }[] = [];

function resolveCollision(event: string, data_object_id: number): CollisionDecision | null {
  const rules = COLLISION_DECISIONS[event];
  if (!rules) return null;
  const all = (rules as any).ALL as CollisionDecision | undefined;
  if (all) return all;
  return rules[data_object_id] ?? null;
}

for (const p of pairs.values()) {
  const decision = resolveCollision(p.event, p.data_object_id);
  let newName: string;
  let publisherName: string;
  let note = "";

  if (decision) {
    newName = decision.newEvent;
    publisherName = decision.publisher;
    note = decision.note ?? "";
  } else {
    // clean event — use as-is.
    // Prefer a publisher data_object whose name matches the event's noun prefix
    // (`<noun>.<verb>` → look for data_object named `<noun>s` / `<noun>` plural form);
    // fall back to the handoff's data_object_id only if no name match exists.
    newName = p.event;
    const noun = p.event.split(".")[0];
    const candidates = [
      `${noun}s`,         // plural
      noun,               // exact
      `${noun}es`,        // boxes
      noun.endsWith("y") ? `${noun.slice(0, -1)}ies` : "",  // policy → policies
    ].filter(Boolean);
    let picked = "";
    for (const c of candidates) {
      if (objByName.has(c)) { picked = c; note = `publisher resolved by prefix match (event noun "${noun}" → data_object "${c}")`; break; }
    }
    if (!picked) {
      const obj = objById.get(p.data_object_id);
      picked = obj?.data_object_name ?? "";
      note = `publisher fallback to handoff data_object (no prefix-match for event noun "${noun}")`;
    }
    publisherName = picked;
  }

  const publisherObj = objByName.get(publisherName);
  if (!publisherObj) {
    unresolved.push({ event: p.event, data_object_id: p.data_object_id, reason: `publisher "${publisherName}" not in data_objects catalog` });
    continue;
  }

  let existing = finalByName.get(newName);
  if (!existing) {
    const { from_state, to_state } = deriveStates(newName);
    existing = {
      event_name: newName,
      publisher_data_object_name: publisherObj.data_object_name,
      publisher_data_object_id: publisherObj.id,
      from_state,
      to_state,
      event_category: deriveCategory(newName),
      description: deriveDescription(newName, publisherObj, objById.get(p.data_object_id)),
      subscriber_count: 0,
      source_pairs: [],
      notes: note,
    };
    finalByName.set(newName, existing);
  }
  existing.subscriber_count += p.count;
  existing.source_pairs.push({ event: p.event, data_object_id: p.data_object_id, count: p.count });
  if (note && !existing.notes.includes(note)) existing.notes = existing.notes ? `${existing.notes}; ${note}` : note;
}

const finals = [...finalByName.values()].sort((a, b) => a.event_name.localeCompare(b.event_name));

// ---- emit markdown ----

const lines: string[] = [];
lines.push("# P1.3 — trigger_events draft");
lines.push("");
lines.push(`Generated ${new Date().toISOString().slice(0, 10)} from ${handoffs.length} handoffs.`);
lines.push("");
lines.push(`- ${pairs.size} unique (event, data_object) pairs in handoffs`);
lines.push(`- ${finals.length} canonical \`trigger_events\` rows after Option-1 disambiguation`);
lines.push(`- ${unresolved.length} unresolved`);
lines.push("");

if (unresolved.length > 0) {
  lines.push("## Unresolved (publisher data_object not found in catalog)");
  lines.push("");
  for (const u of unresolved) lines.push(`- \`${u.event}\` (handoff data_object ${u.data_object_id}): ${u.reason}`);
  lines.push("");
}

const renamed = finals.filter(f => f.source_pairs.some(p => p.event !== f.event_name));
lines.push(`## Renamed events (${renamed.length})`);
lines.push("");
lines.push("| New event_name | Old event_name(s) | Publisher | Reason |");
lines.push("|---|---|---|---|");
for (const f of renamed) {
  const oldUniq = [...new Set(f.source_pairs.map(p => p.event))];
  lines.push(`| \`${f.event_name}\` | ${oldUniq.map(e => `\`${e}\``).join(", ")} | \`${f.publisher_data_object_name}\` | ${f.notes || "disambiguation"} |`);
}
lines.push("");

// Section: publisher-pick provenance for review
const fallbackPublishers = finals.filter(f => f.notes.includes("publisher fallback"));
lines.push(`## Publisher picks that fell back to the handoff's data_object (${fallbackPublishers.length})`);
lines.push("");
lines.push("These events couldn't be matched to a publisher by their `<noun>.<verb>` prefix; the publisher data_object is the one the handoff carries. Review for accuracy — the publisher should be where the state actually changes.");
lines.push("");
if (fallbackPublishers.length > 0) {
  lines.push("| event_name | publisher (fallback) | note |");
  lines.push("|---|---|---|");
  for (const f of fallbackPublishers) {
    lines.push(`| \`${f.event_name}\` | \`${f.publisher_data_object_name}\` | event noun has no matching data_object |`);
  }
  lines.push("");
}

lines.push(`## Full canonical event list (${finals.length})`);
lines.push("");
lines.push("| event_name | publisher data_object | from_state | to_state | category | subs |");
lines.push("|---|---|---|---|---|---|");
for (const f of finals) {
  lines.push(`| \`${f.event_name}\` | \`${f.publisher_data_object_name}\` (id ${f.publisher_data_object_id}) | \`${f.from_state || "—"}\` | \`${f.to_state || "—"}\` | ${f.event_category} | ${f.subscriber_count} |`);
}
lines.push("");

lines.push("## Sample descriptions (first 10)");
lines.push("");
for (const f of finals.slice(0, 10)) {
  lines.push(`- **\`${f.event_name}\`**: ${f.description}`);
}
lines.push("");

const md = lines.join("\n");
writeFileSync("c:/tmp/trigger_events_draft.md", md, "utf-8");
console.log(`Draft written: c:/tmp/trigger_events_draft.md (${md.length} bytes)`);
console.log(`  ${finals.length} canonical events; ${renamed.length} renamed; ${unresolved.length} unresolved`);

if (!WRITE) {
  console.log("\n--- review the draft, then re-run with --write to insert ---");
  process.exit(0);
}

// ---- write mode: idempotent insert ----

console.log("\n=== inserting into trigger_events (idempotent) ===");

const existingEvents: { id: number; event_name: string }[] = await call("postgrestRequest", {
  method: "GET",
  path: "/trigger_events?select=id,event_name&limit=10000",
});
const existingNames = new Set(existingEvents.map(e => e.event_name));
console.log(`  existing trigger_events rows: ${existingEvents.length}`);

const toInsert = finals.filter(f => !existingNames.has(f.event_name));
console.log(`  to insert: ${toInsert.length}; skipping ${finals.length - toInsert.length} already present`);

if (toInsert.length > 0) {
  const CHUNK = 50;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const slice = toInsert.slice(i, i + CHUNK);
    const body = slice.map(f => ({
      event_name: f.event_name,
      data_object_id: f.publisher_data_object_id,
      from_state: f.from_state,
      to_state: f.to_state,
      description: f.description,
      event_category: f.event_category,
    }));
    await call("postgrestRequest", { method: "POST", path: "/trigger_events", body });
    process.stdout.write(`    ${i + slice.length}/${toInsert.length}\r`);
  }
  console.log();
}

const finalCount: { id: number }[] = await call("postgrestRequest", {
  method: "GET",
  path: "/trigger_events?select=id&limit=1000",
});
console.log(`  trigger_events total after insert: ${finalCount.length}`);
console.log(`  UI: https://tests.semantius.app/domain_map/trigger_events`);
