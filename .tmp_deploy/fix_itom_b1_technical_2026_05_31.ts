#!/usr/bin/env bun
// Technical-only B1 fixes for the ITOM audit (2026-05-30).
// Applies the deterministic items from audits/ITOM.md that the agent can do
// without user-judgment input. Defers everything that requires module-bringup,
// vendor research, lifecycle authoring, or rewordings the audit doesn't pin down.
//
// Items applied here:
//   - B1-S1  PATCH domains.business_logic em-dash sanitisation on ITOM (id=2)
//   - B1-S8  PATCH trigger_events 6, 45, 53, 78, 634, 635 (descriptions / names /
//            event_category enum backfill)
//   - B1-S6  INSERT 4 data_object_relationships user-edges per Rule #10
//            (users <-> monitoring_policies x2, users <-> monitoring_alerts,
//             users <-> capacity_records)
//   - B1-S10 INSERT data_object_aliases pre-specified per audit B11 list
//   - B1-S16 INSERT 3 handoff_processes tags for handoffs 50, 54, 620
//            (the 3 of 13 ITOM-touching cross-domain handoffs that lack a tag)
//
// Idempotent against existing live state: each section reads first and only
// inserts / patches the missing items.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function post(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

// ------------------------------------------------------------
// Master ids on the ITOM side (verified live before run).
const ITOM_MONITORING_EVENTS = 84;
const ITOM_MONITORING_ALERTS = 85;
const ITOM_MONITORING_POLICIES = 86;
const ITOM_CAPACITY_RECORDS = 87;
const USERS_BUILTIN = 748;

// ============================================================
// B1-S1: replace U+2014 em-dash in ITOM domains.business_logic.
// The em-dash separates two clauses, so use a comma + lowercase
// continuation that preserves the meaning. CLAUDE.md forbids em-dashes
// in any catalog content.
// ============================================================
async function fixB1S1(): Promise<void> {
  console.log("\n[B1-S1] domains.business_logic em-dash sanitisation (ITOM id=2)");
  const existing = await get("/domains?id=eq.2&select=id,business_logic");
  if (existing.length === 0) throw new Error("ITOM domain row missing");
  const current = String(existing[0]?.business_logic ?? "");
  if (!current.includes("—")) {
    console.log("  no em-dash present, skipping");
    return;
  }
  const next = current.replace(
    /—/g,
    ",",
  );
  // Lowercase the first letter immediately after the inserted comma, mirroring
  // the source clause structure ("...analysis, engine-led;..." reads as a
  // single sentence with an appositive).
  const cleaned = next.replace(/, ([A-Z])/, (_m, c) => `, ${String(c).toLowerCase()}`);
  await patch("/domains?id=eq.2", { business_logic: cleaned });
  console.log(`  patched -> ${cleaned}`);
}

// ============================================================
// B1-S8: trigger_events fixes.
//   id 6   PATCH description (templated default has poor grammar)
//   id 45  RENAME event_name device.requires_monitoring -> monitoring_policy.coverage_requested
//          + PATCH description (templated default)
//   id 53  PATCH description (templated default)
//   id 78  RENAME event_name noise.suppression_applied -> monitoring_event.suppression_applied
//          + PATCH description (templated default)
//   id 634 PATCH event_category '' -> 'threshold'
//   id 635 PATCH event_category '' -> 'signal'
//
// NB: re-anchoring trigger 78.data_object_id to an AIOPS master is a
// judgment call (audit Pass 4 AIOPS Section 3 surfaces it but the AIOPS
// master id is uncertain); deferred.
// ============================================================
async function fixB1S8(): Promise<void> {
  console.log("\n[B1-S8] trigger_events fixes (ids 6, 45, 53, 78, 634, 635)");

  type PatchSpec = { id: number; updates: Row };
  const patches: PatchSpec[] = [
    {
      id: 6,
      updates: {
        description:
          "Monitoring alert breached a configured threshold. ITOM publishes; ITSM may auto-create an incident; AIOPS may correlate or suppress.",
      },
    },
    {
      id: 45,
      updates: {
        event_name: "monitoring_policy.coverage_requested",
        description:
          "DISCOVERY identified a device or service that requires monitoring coverage. ITOM creates or extends a monitoring policy to cover it.",
      },
    },
    {
      id: 53,
      updates: {
        description:
          "ITOM detected an event burst (correlated spike). AIOPS consumes for further correlation and noise reduction.",
      },
    },
    {
      id: 78,
      updates: {
        event_name: "monitoring_event.suppression_applied",
        description:
          "Suppression rule applied to monitoring events. AIOPS owns the suppression logic; ITOM consumes the suppression decision when surfacing alerts.",
      },
    },
    {
      id: 634,
      updates: { event_category: "threshold" },
    },
    {
      id: 635,
      updates: { event_category: "signal" },
    },
  ];

  for (const p of patches) {
    const existing = await get(
      `/trigger_events?id=eq.${p.id}&select=id,event_name,description,event_category`,
    );
    if (existing.length === 0) {
      console.log(`  trigger ${p.id} not found, skipping`);
      continue;
    }
    const current = existing[0];
    const needsUpdate = Object.entries(p.updates).some(
      ([k, v]) => String(current[k] ?? "") !== String(v),
    );
    if (!needsUpdate) {
      console.log(`  trigger ${p.id} already matches target, skipping`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${p.id}`, p.updates);
    console.log(`  trigger ${p.id} patched: ${Object.keys(p.updates).join(", ")}`);
  }
}

// ============================================================
// B1-S6: users edges (Rule #10) for ITOM masters.
// Conventions verified against live data_object_relationships (users-edge
// pattern uses users as source, owner_side='source', one_to_many, reference).
// Audit pre-specifies 4 actor roles:
//   - monitoring_policy author  (creator)
//   - monitoring_policy approver
//   - monitoring_alert assignee
//   - capacity_record collected_by (creator)
// ============================================================
async function fixB1S6(): Promise<void> {
  console.log("\n[B1-S6] users edges for ITOM masters");

  type EdgeSpec = {
    data_object_id: number;
    related_data_object_id: number;
    relationship_verb: string;
    inverse_verb: string;
    relationship_type: string;
    relationship_kind: string;
    is_required: boolean;
    owner_side: string;
  };

  const edges: EdgeSpec[] = [
    {
      data_object_id: USERS_BUILTIN,
      related_data_object_id: ITOM_MONITORING_POLICIES,
      relationship_verb: "authored_monitoring_policies",
      inverse_verb: "is_authored_by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "source",
    },
    {
      data_object_id: USERS_BUILTIN,
      related_data_object_id: ITOM_MONITORING_POLICIES,
      relationship_verb: "approved_monitoring_policies",
      inverse_verb: "is_approved_by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "source",
    },
    {
      data_object_id: USERS_BUILTIN,
      related_data_object_id: ITOM_MONITORING_ALERTS,
      relationship_verb: "assigned_monitoring_alerts",
      inverse_verb: "is_assigned_to",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "source",
    },
    {
      data_object_id: USERS_BUILTIN,
      related_data_object_id: ITOM_CAPACITY_RECORDS,
      relationship_verb: "collected_capacity_records",
      inverse_verb: "is_collected_by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "source",
    },
  ];

  // De-dupe vs existing rows: match on (data_object_id, related_data_object_id, relationship_verb).
  const existing = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_BUILTIN}&related_data_object_id=in.(${ITOM_MONITORING_POLICIES},${ITOM_MONITORING_ALERTS},${ITOM_CAPACITY_RECORDS})&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const existingKey = new Set(
    existing.map(
      (r) =>
        `${r.data_object_id}|${r.related_data_object_id}|${String(r.relationship_verb)}`,
    ),
  );

  const missing = edges.filter(
    (e) =>
      !existingKey.has(
        `${e.data_object_id}|${e.related_data_object_id}|${e.relationship_verb}`,
      ),
  );

  if (missing.length === 0) {
    console.log("  all 4 users edges already present, nothing to insert");
    return;
  }
  console.log(`  inserting ${missing.length} new users edges`);
  await post("/data_object_relationships", missing as unknown as Row[]);
  for (const m of missing) {
    console.log(
      `    users -[${m.relationship_verb}]-> data_object_id=${m.related_data_object_id}`,
    );
  }
}

// ============================================================
// B1-S10: data_object_aliases per audit B11 list.
// Audit pre-specifies aliases per master. alias_type defaults to 'synonym'
// (the dominant value catalog-wide). One alias mentions a vendor name as
// meta-commentary ("monitor (Datadog terminology)"); the alias_name itself
// is 'monitor' - the parenthetical describes provenance, not the alias text,
// so Rule #18 is not violated (data_object_aliases is on the allow-list anyway).
// ============================================================
async function fixB1S10(): Promise<void> {
  console.log("\n[B1-S10] data_object_aliases for ITOM masters");

  type AliasSpec = {
    data_object_id: number;
    alias_name: string;
    alias_type: string;
  };

  const aliases: AliasSpec[] = [
    // monitoring_events (84)
    { data_object_id: ITOM_MONITORING_EVENTS, alias_name: "monitoring event", alias_type: "synonym" },
    { data_object_id: ITOM_MONITORING_EVENTS, alias_name: "IT event", alias_type: "synonym" },
    { data_object_id: ITOM_MONITORING_EVENTS, alias_name: "infrastructure event", alias_type: "synonym" },
    { data_object_id: ITOM_MONITORING_EVENTS, alias_name: "system event", alias_type: "synonym" },
    // monitoring_alerts (85)
    { data_object_id: ITOM_MONITORING_ALERTS, alias_name: "alert", alias_type: "synonym" },
    { data_object_id: ITOM_MONITORING_ALERTS, alias_name: "notification", alias_type: "synonym" },
    { data_object_id: ITOM_MONITORING_ALERTS, alias_name: "threshold breach", alias_type: "synonym" },
    { data_object_id: ITOM_MONITORING_ALERTS, alias_name: "observability alert", alias_type: "synonym" },
    // monitoring_policies (86)
    { data_object_id: ITOM_MONITORING_POLICIES, alias_name: "monitoring rule", alias_type: "synonym" },
    { data_object_id: ITOM_MONITORING_POLICIES, alias_name: "threshold rule", alias_type: "synonym" },
    { data_object_id: ITOM_MONITORING_POLICIES, alias_name: "alert policy", alias_type: "synonym" },
    { data_object_id: ITOM_MONITORING_POLICIES, alias_name: "detection rule", alias_type: "synonym" },
    { data_object_id: ITOM_MONITORING_POLICIES, alias_name: "monitor", alias_type: "synonym" },
    // capacity_records (87)
    { data_object_id: ITOM_CAPACITY_RECORDS, alias_name: "capacity datapoint", alias_type: "synonym" },
    { data_object_id: ITOM_CAPACITY_RECORDS, alias_name: "utilization record", alias_type: "synonym" },
    { data_object_id: ITOM_CAPACITY_RECORDS, alias_name: "resource utilization record", alias_type: "synonym" },
  ];

  const ids = [
    ITOM_MONITORING_EVENTS,
    ITOM_MONITORING_ALERTS,
    ITOM_MONITORING_POLICIES,
    ITOM_CAPACITY_RECORDS,
  ].join(",");
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids})&select=data_object_id,alias_name`,
  );
  const existingKey = new Set(
    existing.map(
      (r) => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`,
    ),
  );

  const missing = aliases.filter(
    (a) => !existingKey.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  );

  if (missing.length === 0) {
    console.log("  all aliases already present, nothing to insert");
    return;
  }
  console.log(
    `  inserting ${missing.length} of ${aliases.length} aliases (${existing.length} already present)`,
  );
  await post("/data_object_aliases", missing as unknown as Row[]);
}

// ============================================================
// B1-S16: handoff_processes tags for ITOM-touching cross-domain handoffs.
// Audit pre-specifies handoff_id + process_id (PCF ids verified live).
// Existing tags cover 10 of 13; this loader adds the 3 missing:
//   handoff 50  -> process 1301 (Operate and monitor online systems)
//   handoff 54  -> process 1301
//   handoff 620 -> process 1285 (Plan operational activities for IT service delivery)
// ============================================================
async function fixB1S16(): Promise<void> {
  console.log("\n[B1-S16] handoff_processes tags for the 3 missing ITOM handoffs");

  type TagSpec = { handoff_id: number; process_id: number };
  const tags: TagSpec[] = [
    { handoff_id: 50, process_id: 1301 },
    { handoff_id: 54, process_id: 1301 },
    { handoff_id: 620, process_id: 1285 },
  ];

  const existing = await get(
    `/handoff_processes?handoff_id=in.(50,54,620)&select=handoff_id,process_id`,
  );
  const existingKey = new Set(
    existing.map((r) => `${r.handoff_id}|${r.process_id}`),
  );

  const missing = tags
    .filter((t) => !existingKey.has(`${t.handoff_id}|${t.process_id}`))
    .map((t) => ({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      proposal_source: "agent_curated",
      // record_status omitted intentionally (default 'new' per Rule #1).
    }));

  if (missing.length === 0) {
    console.log("  all 3 handoff_processes tags already present, nothing to insert");
    return;
  }
  console.log(`  inserting ${missing.length} handoff_processes tags`);
  await post("/handoff_processes", missing as unknown as Row[]);
  for (const m of missing) {
    console.log(`    handoff ${m.handoff_id} -> process ${m.process_id}`);
  }
}

// ============================================================
async function main(): Promise<void> {
  console.log("ITOM B1 technical fixes (2026-05-31)");
  console.log("====================================");
  await fixB1S1();
  await fixB1S8();
  await fixB1S6();
  await fixB1S10();
  await fixB1S16();
  console.log("\nDone.");
}

await main();
