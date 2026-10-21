#!/usr/bin/env bun
/**
 * IPAAS B1 technical fixes, 2026-05-31 continuation.
 *
 * Applies the truly-technical B1 fixes from audits/IPAAS.md:
 *   - B1-S13: PATCH event_category on 8 IPAAS trigger_events
 *     (audit pre-specifies each row's category verbatim).
 *   - B1-S5: INSERT data_object_relationships user-edges (Rule #10),
 *     5 pre-specified edges. The "publishes" edge is gated on B2-S3
 *     (pattern flag flips); deferred.
 *   - B1-H1: INSERT handoff_processes for 5 of 6 IPAAS handoffs
 *     (handoff 768 already tagged; skipped). Audit pre-specifies each
 *     (handoff_id, PCF process_id) pair with confident L4/L5 confidence.
 *     The 2 deferred handoffs (705, 748) per the audit are not inserted.
 *
 * DEFERRED (out of scope for this continuation):
 *   - B1-S1 / B1-S12 (modules + capabilities + DMDOs): new entities.
 *   - B1-S2: catalog UX fields (Rule #20, requires user wording).
 *   - B1-S3: pattern flag flips (explicit defer).
 *   - B1-S4: intra-domain relationships (Rule #10 user-edges only).
 *   - B1-S6: aliases (audit suggests vendor terms but does not pre-specify
 *     exact (data_object_id, alias_name) tuples).
 *   - B1-S7: lifecycle states (depends on B1-S1 module FKs).
 *   - B1-S8: skill retire + per-module skills (new entities, depends on B1-S1).
 *   - B1-S9: handoff module FK PATCH (NOT derivable, IPAAS has zero modules).
 *   - B1-S10: cross-domain relationship mirrors (depends on B1-S4/S5; targets
 *     partly unverified).
 *   - B1-S11: intra-domain handoffs (depends on B1-S1).
 *
 * Idempotent: pre-flights every PATCH and INSERT against live state.
 * Run from project root: bun run .tmp_deploy/fix_ipaas_b1_technical_2026_05_31.ts
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// ---- B1-S13: trigger_events.event_category backfill (8 rows) ----
// Pre-specified by audit (lines 65-66 of audits/IPAAS.md).
const EVENT_CATEGORY_PATCHES: Array<{ id: number; event_name: string; category: string }> = [
  { id: 836, event_name: "integration_recipe.published", category: "state_change" },
  { id: 837, event_name: "integration_recipe.deprecated", category: "state_change" },
  { id: 838, event_name: "integration_run.succeeded", category: "lifecycle" },
  { id: 839, event_name: "integration_run.failed", category: "lifecycle" },
  { id: 840, event_name: "integration_connector.credential_expired", category: "threshold" },
  { id: 841, event_name: "webhook_subscription.delivery_failed", category: "signal" },
  { id: 842, event_name: "integration_trigger.fired", category: "signal" },
  { id: 843, event_name: "integration_data_mapping.updated", category: "state_change" },
];

// ---- B1-S5: Rule #10 user-edges (5 rows) ----
// Pre-specified by audit (lines 58 of audits/IPAAS.md). The "publishes
// integration_recipes" edge is gated on B2-S3 (single-approver pattern
// flag flip); deferred.
const USERS_ID = 748;
const IPAAS_MASTERS = {
  integration_recipes: 469,
  integration_runs: 470,
  integration_connectors: 471,
  webhook_subscriptions: 472,
  integration_triggers: 473,
  integration_data_mappings: 474,
} as const;
type UserEdge = { related: number; related_name: string; verb: string; inverse: string };
const USER_EDGES: UserEdge[] = [
  { related: IPAAS_MASTERS.integration_recipes, related_name: "integration_recipes", verb: "authors", inverse: "authored_by" },
  { related: IPAAS_MASTERS.integration_connectors, related_name: "integration_connectors", verb: "owns", inverse: "owned_by" },
  { related: IPAAS_MASTERS.webhook_subscriptions, related_name: "webhook_subscriptions", verb: "subscribes", inverse: "subscribed_by" },
  { related: IPAAS_MASTERS.integration_runs, related_name: "integration_runs", verb: "initiates", inverse: "initiated_by" },
  { related: IPAAS_MASTERS.integration_data_mappings, related_name: "integration_data_mappings", verb: "designs", inverse: "designed_by" },
];

// ---- B1-H1: handoff_processes inserts ----
// Pre-specified by audit (lines 71-78). Handoff 768 already tagged
// (process_id=1670); skipped. Handoffs 705 and 748 deferred by the audit.
const HANDOFF_PROCESS_INSERTS: Array<{ handoff_id: number; process_id: number; pcf_name: string }> = [
  { handoff_id: 766, process_id: 1299, pcf_name: "Triage IT service delivery incidents" },
  { handoff_id: 765, process_id: 1299, pcf_name: "Triage IT service delivery incidents" },
  { handoff_id: 767, process_id: 273, pcf_name: "Manage IT user identity and authorization" },
  { handoff_id: 769, process_id: 1947, pcf_name: "Manage service/solution operations" },
  { handoff_id: 801, process_id: 1262, pcf_name: "Implement software change/release" },
];

async function patchEventCategories(): Promise<{ patched: number; skipped: number }> {
  let patched = 0;
  let skipped = 0;
  const ids = EVENT_CATEGORY_PATCHES.map((p) => p.id).join(",");
  const live = await get(`/trigger_events?id=in.(${ids})&select=id,event_name,event_category`);
  const byId = new Map<number, { event_name: string; event_category: string }>();
  for (const row of live) {
    byId.set(row.id as number, {
      event_name: row.event_name as string,
      event_category: row.event_category as string,
    });
  }
  for (const p of EVENT_CATEGORY_PATCHES) {
    const cur = byId.get(p.id);
    if (!cur) {
      console.error(`  ! trigger_events id=${p.id} (${p.event_name}) not found, skipping`);
      skipped++;
      continue;
    }
    if (cur.event_name !== p.event_name) {
      console.error(
        `  ! trigger_events id=${p.id}: expected ${p.event_name}, found ${cur.event_name}; skipping`,
      );
      skipped++;
      continue;
    }
    if (cur.event_category === p.category) {
      skipped++;
      continue;
    }
    if (cur.event_category !== "") {
      console.error(
        `  ! trigger_events id=${p.id} (${p.event_name}) already has category='${cur.event_category}', refusing to overwrite to '${p.category}'`,
      );
      skipped++;
      continue;
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.category });
    console.log(`  + ${p.event_name} (id=${p.id}) -> ${p.category}`);
    patched++;
  }
  return { patched, skipped };
}

async function insertUserEdges(): Promise<{ inserted: number; skipped: number }> {
  const masterIds = Object.values(IPAAS_MASTERS).join(",");
  const existing = (await get(
    `/data_object_relationships?select=id,data_object_id,related_data_object_id&or=(and(data_object_id.eq.${USERS_ID},related_data_object_id.in.(${masterIds})),and(related_data_object_id.eq.${USERS_ID},data_object_id.in.(${masterIds})))`,
  )) as Array<{ data_object_id: number; related_data_object_id: number }>;
  const skip = new Set<number>();
  for (const row of existing) {
    const other = row.data_object_id === USERS_ID ? row.related_data_object_id : row.data_object_id;
    skip.add(other);
  }
  const rows = USER_EDGES.filter((e) => !skip.has(e.related)).map((e) => ({
    data_object_relationship_label: `users ${e.verb} ${e.related_name}`,
    data_object_id: USERS_ID,
    related_data_object_id: e.related,
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: e.verb,
    inverse_verb: e.inverse,
    is_required: false,
    owner_side: "source",
    // record_status omitted -> default 'new' per Rule #1
    // notes omitted -> empty per Rule #15
  }));
  if (rows.length === 0) {
    return { inserted: 0, skipped: USER_EDGES.length };
  }
  await post("/data_object_relationships", rows);
  for (const r of rows) {
    console.log(`  + users -> ${(r as any).data_object_relationship_label.split(" ").slice(2).join(" ")}`);
  }
  return { inserted: rows.length, skipped: USER_EDGES.length - rows.length };
}

async function insertHandoffProcesses(): Promise<{ inserted: number; skipped: number }> {
  // Verify all process_ids resolve.
  const procIds = Array.from(new Set(HANDOFF_PROCESS_INSERTS.map((h) => h.process_id))).join(",");
  const procRows = await get(`/processes?id=in.(${procIds})&select=id,process_name`);
  const procById = new Map<number, string>();
  for (const r of procRows) procById.set(r.id as number, r.process_name as string);
  for (const h of HANDOFF_PROCESS_INSERTS) {
    const name = procById.get(h.process_id);
    if (!name) throw new Error(`PCF process_id=${h.process_id} not found in live processes`);
    if (name !== h.pcf_name) {
      throw new Error(
        `PCF process_id=${h.process_id}: expected name '${h.pcf_name}', live name '${name}'`,
      );
    }
  }

  // Verify all handoffs exist.
  const handoffIds = Array.from(new Set(HANDOFF_PROCESS_INSERTS.map((h) => h.handoff_id))).join(",");
  const handoffRows = await get(`/handoffs?id=in.(${handoffIds})&select=id`);
  const handoffSet = new Set<number>(handoffRows.map((r) => r.id as number));
  for (const h of HANDOFF_PROCESS_INSERTS) {
    if (!handoffSet.has(h.handoff_id)) {
      throw new Error(`handoff_id=${h.handoff_id} not found in live handoffs`);
    }
  }

  // Idempotency: skip rows already present.
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`,
  );
  const existingKey = new Set<string>();
  for (const e of existing) existingKey.add(`${e.handoff_id}.${e.process_id}`);

  const toInsert: Row[] = [];
  let skipped = 0;
  for (const h of HANDOFF_PROCESS_INSERTS) {
    const key = `${h.handoff_id}.${h.process_id}`;
    if (existingKey.has(key)) {
      skipped++;
      continue;
    }
    toInsert.push({
      handoff_id: h.handoff_id,
      process_id: h.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted -> default 'new' per Rule #1
      // notes omitted -> empty per Rule #15
    });
  }

  if (toInsert.length > 0) {
    await post("/handoff_processes", toInsert);
    for (const h of HANDOFF_PROCESS_INSERTS) {
      const key = `${h.handoff_id}.${h.process_id}`;
      if (!existingKey.has(key)) {
        console.log(
          `  + handoff_id=${h.handoff_id} -> process_id=${h.process_id} (${h.pcf_name})`,
        );
      }
    }
  }
  return { inserted: toInsert.length, skipped };
}

async function main() {
  console.log("== IPAAS B1 technical fixes ==");

  console.log("\n[B1-S13] PATCH trigger_events.event_category (8 rows)");
  const ec = await patchEventCategories();
  console.log(`  Result: patched=${ec.patched}, skipped=${ec.skipped}`);

  console.log("\n[B1-S5] INSERT data_object_relationships user-edges (5 rows)");
  const ue = await insertUserEdges();
  console.log(`  Result: inserted=${ue.inserted}, skipped=${ue.skipped}`);

  console.log("\n[B1-H1] INSERT handoff_processes (5 rows)");
  const hp = await insertHandoffProcesses();
  console.log(`  Result: inserted=${hp.inserted}, skipped=${hp.skipped}`);

  console.log("\nDone.");
}

await main();
