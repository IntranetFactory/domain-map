// Loads FDS Gap-3 (B9b) intra-domain cross-module handoffs.
// 2 new trigger_events + 9 handoffs (8 required + 1 optional).
// Idempotent: re-reads by natural key before each insert.

const FDS_ID = 158;

type TriggerEvent = {
  id?: number;
  event_name: string;
  data_object_id: number;
  event_category: "lifecycle" | "state_change" | "threshold" | "signal";
  description: string;
};

type Handoff = {
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id: number;
  target_domain_module_id: number;
  trigger_event_id: number;
  data_object_id: number;
  integration_pattern: "lifecycle_progression" | "api_call" | "event_stream" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "low" | "medium" | "high";
  description: string;
};

const NEW_EVENTS: TriggerEvent[] = [
  {
    event_name: "csa_share_pack.packed",
    data_object_id: 515,
    event_category: "state_change",
    description: "A CSA share pack has been composed and packed for delivery; downstream DELIVERY-OPS picks it up for route sequencing.",
  },
  {
    event_name: "wholesale_order.fulfilled",
    data_object_id: 517,
    event_category: "state_change",
    description: "A wholesale order has been physically fulfilled (delivered or picked up); downstream WHOLESALE module finalises invoice posting.",
  },
];

// Module IDs:
// 118 FDS-CSA-MGMT, 119 FDS-ONLINE-STORE, 120 FDS-DELIVERY-OPS,
// 121 FDS-MARKET-POS, 122 FDS-WHOLESALE, 123 FDS-BUTCHER, 124 FDS-HARVEST-PLANNING

type HandoffDraft = Omit<Handoff, "trigger_event_id"> & { event_name: string };

const HANDOFFS: HandoffDraft[] = [
  // 1. CSA pack ready -> DELIVERY-OPS routes it
  {
    source_domain_id: FDS_ID, target_domain_id: FDS_ID,
    source_domain_module_id: 118, target_domain_module_id: 120,
    event_name: "csa_share_pack.packed", data_object_id: 515,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "CSA share pack lifecycle bridge: packed (CSA-MGMT) hands off to DELIVERY-OPS for out-for-delivery routing.",
  },
  // 2. DELIVERY-OPS confirms delivery -> CSA tracks per-membership delivered/missed
  {
    source_domain_id: FDS_ID, target_domain_id: FDS_ID,
    source_domain_module_id: 120, target_domain_module_id: 118,
    event_name: "csa_share_pack.delivered", data_object_id: 515,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Delivery completion writes back to CSA membership-side tracking so missed/delivered state is visible to the member portal.",
  },
  // 3. WHOLESALE confirmed -> DELIVERY-OPS plans routing (non-pickup buyers)
  {
    source_domain_id: FDS_ID, target_domain_id: FDS_ID,
    source_domain_module_id: 122, target_domain_module_id: 120,
    event_name: "wholesale_order.confirmed", data_object_id: 517,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Confirmed wholesale orders flow into DELIVERY-OPS when the buyer is on a delivery route rather than chef-pickup.",
  },
  // 4. DELIVERY-OPS fulfilled -> WHOLESALE invoices
  {
    source_domain_id: FDS_ID, target_domain_id: FDS_ID,
    source_domain_module_id: 120, target_domain_module_id: 122,
    event_name: "wholesale_order.fulfilled", data_object_id: 517,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Wholesale lifecycle bridge: fulfilled (DELIVERY-OPS) advances the order to invoiced (WHOLESALE).",
  },
  // 5. HARVEST forecast -> CSA share composition
  {
    source_domain_id: FDS_ID, target_domain_id: FDS_ID,
    source_domain_module_id: 124, target_domain_module_id: 118,
    event_name: "harvest_forecast.updated", data_object_id: 521,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Harvest forecast revisions drive CSA share-pack composition for the upcoming week.",
  },
  // 6. HARVEST forecast -> WHOLESALE capacity
  {
    source_domain_id: FDS_ID, target_domain_id: FDS_ID,
    source_domain_module_id: 124, target_domain_module_id: 122,
    event_name: "harvest_forecast.updated", data_object_id: 521,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Harvest forecast revisions inform wholesale order capacity for chefs / restaurants / food hubs.",
  },
  // 7. HARVEST forecast -> MARKET-POS day quantities
  {
    source_domain_id: FDS_ID, target_domain_id: FDS_ID,
    source_domain_module_id: 124, target_domain_module_id: 121,
    event_name: "harvest_forecast.updated", data_object_id: 521,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Harvest forecast informs market-day stall quantities for farmers market POS.",
  },
  // 8. ONLINE-STORE pickup activation -> CSA membership-side usability
  {
    source_domain_id: FDS_ID, target_domain_id: FDS_ID,
    source_domain_module_id: 119, target_domain_module_id: 118,
    event_name: "pickup_location.activated", data_object_id: 519,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Activating a pickup site exposes it to CSA memberships for selection in the upcoming cycle.",
  },
  // 9. BUTCHER ready -> DELIVERY-OPS (optional; only when not customer-pickup)
  {
    source_domain_id: FDS_ID, target_domain_id: FDS_ID,
    source_domain_module_id: 123, target_domain_module_id: 120,
    event_name: "butcher_order.ready", data_object_id: 520,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Butcher orders that ship via the operator's delivery route (instead of customer-pickup) flow into DELIVERY-OPS for sequencing.",
  },
];

async function rpc(method: string, path: string, body?: unknown) {
  const payload = body === undefined ? { method, path } : { method, path, body };
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius ${method} ${path} exit ${proc.exitCode}\nstderr: ${err}\nstdout: ${out}`);
  }
  const trimmed = out.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

async function upsertTriggerEvents() {
  const eventNames = NEW_EVENTS.map((e) => `"${e.event_name}"`).join(",");
  const existing = (await rpc(
    "GET",
    `/trigger_events?event_name=in.(${eventNames})&select=id,event_name`,
  )) as Array<{ id: number; event_name: string }>;

  const existingMap = new Map(existing.map((r) => [r.event_name, r.id]));
  const toInsert = NEW_EVENTS.filter((e) => !existingMap.has(e.event_name));

  if (toInsert.length > 0) {
    const inserted = (await rpc("POST", "/trigger_events?select=id,event_name", toInsert)) as Array<{ id: number; event_name: string }>;
    for (const r of inserted) existingMap.set(r.event_name, r.id);
    console.log(`trigger_events: inserted ${inserted.length}, already-present ${existing.length}`);
  } else {
    console.log(`trigger_events: all ${NEW_EVENTS.length} already present`);
  }

  return existingMap;
}

async function resolveAllEventIds() {
  const allNames = Array.from(new Set(HANDOFFS.map((h) => h.event_name)));
  const list = allNames.map((n) => `"${n}"`).join(",");
  const rows = (await rpc(
    "GET",
    `/trigger_events?event_name=in.(${list})&select=id,event_name`,
  )) as Array<{ id: number; event_name: string }>;
  const m = new Map(rows.map((r) => [r.event_name, r.id]));
  for (const n of allNames) {
    if (!m.has(n)) throw new Error(`trigger_event not found: ${n}`);
  }
  return m;
}

async function insertHandoffs(eventIds: Map<string, number>) {
  const desired: Handoff[] = HANDOFFS.map(({ event_name, ...rest }) => ({
    ...rest,
    trigger_event_id: eventIds.get(event_name)!,
  }));

  // Idempotency: skip rows already present on (source_domain_id, target_domain_id,
  // source_domain_module_id, target_domain_module_id, trigger_event_id, data_object_id).
  const existing = (await rpc(
    "GET",
    `/handoffs?source_domain_id=eq.${FDS_ID}&target_domain_id=eq.${FDS_ID}&select=trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id`,
  )) as Array<{
    trigger_event_id: number;
    data_object_id: number;
    source_domain_module_id: number | null;
    target_domain_module_id: number | null;
  }>;

  const key = (h: { trigger_event_id: number; data_object_id: number; source_domain_module_id: number | null; target_domain_module_id: number | null }) =>
    `${h.trigger_event_id}|${h.data_object_id}|${h.source_domain_module_id}|${h.target_domain_module_id}`;
  const have = new Set(existing.map(key));

  const toInsert = desired.filter((d) => !have.has(key(d)));

  if (toInsert.length === 0) {
    console.log(`handoffs: all ${desired.length} already present (idempotent re-run)`);
    return;
  }

  const inserted = (await rpc("POST", "/handoffs?select=id,trigger_event_id,source_domain_module_id,target_domain_module_id", toInsert)) as Array<{
    id: number;
    trigger_event_id: number;
    source_domain_module_id: number;
    target_domain_module_id: number;
  }>;
  console.log(`handoffs: inserted ${inserted.length}, skipped (already-present) ${desired.length - toInsert.length}`);
  for (const r of inserted) {
    console.log(`  + id=${r.id} trigger=${r.trigger_event_id} ${r.source_domain_module_id}->${r.target_domain_module_id}`);
  }
}

async function main() {
  await upsertTriggerEvents();
  const eventIds = await resolveAllEventIds();
  await insertHandoffs(eventIds);
  console.log("\nDone. UI:");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
}

await main();
