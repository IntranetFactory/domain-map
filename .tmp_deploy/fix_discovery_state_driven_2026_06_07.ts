#!/usr/bin/env bun
// State-driven Validate execute for DISCOVERY (domain id 5), 2026-06-07.
// Works ONLY the open state.yaml items that classify as EXECUTE (additive/corrective,
// record_status='new', verify-live-then-write, idempotent). The domain is UNBUILT
// (0 domain_modules) so all module-gated b1b structural work is LEFT, not scaffolded.
//
// EXECUTE write types in this loader:
//   1. entity_type PATCH on the 3 masters (81/82/83): unclassified -> operational_workflow.
//   2. event_category PATCH on 4 trigger_events (630/631/632/633): '' -> state_change.
//   3. Catalog UX (Rule #20): author catalog_tagline + catalog_description on the
//      DISCOVERY domain row (both currently empty). No modules exist, so domain row only.
//   4. data_object_aliases (B11): insert generic cross-vendor synonyms on the 3 masters.
//
// Idempotent: reads live before every write, only changes what is still stale/missing.
// No notes column ever written (Rule #15). No vendor/product names in aliases (Rule #18).

import {} from "bun";

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

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// ============================================================
// 1. entity_type PATCH on the 3 masters
// ============================================================
// discovery_scans (81): a job execution with start/end, candidates emitted, errors
//   -> queued/running/completed/failed state machine -> operational_workflow.
// discovered_devices (82): pre-CMDB candidate awaiting normalization/reconciliation
//   (raw/normalized/reconciled/excluded) -> operational_workflow.
// discovery_sources (83): connector/probe/credential definition that drives scans,
//   carrying configured/connected/disconnected connection state -> operational_workflow.
async function fixEntityType(): Promise<void> {
  console.log("== entity_type PATCH (masters 81/82/83) ==");
  const masters = await get(
    "/data_objects?id=in.(81,82,83)&select=id,data_object_name,entity_type",
  );
  let patched = 0;
  for (const m of masters) {
    if (m.entity_type === "unclassified" || m.entity_type === null || m.entity_type === "") {
      await patch(`/data_objects?id=eq.${m.id}`, { entity_type: "operational_workflow" });
      console.log(`  PATCHed data_objects ${m.id} (${m.data_object_name}) -> operational_workflow`);
      patched++;
    } else {
      console.log(`  data_objects ${m.id} (${m.data_object_name}) already '${m.entity_type}', skip`);
    }
  }
  console.log(`  entity_type patched: ${patched}`);
}

// ============================================================
// 2. event_category PATCH on 4 trigger_events
// ============================================================
// 630 discovery_scan.completed, 631 discovery_scan.failed: terminal-state transitions
//   on discovery_scans -> state_change.
// 632 discovery_source.connected, 633 discovery_source.disconnected: connection-state
//   transitions on discovery_sources -> state_change.
async function fixEventCategory(): Promise<void> {
  console.log("== event_category PATCH (trigger_events 630/631/632/633) ==");
  const targets = [630, 631, 632, 633];
  const events = await get(
    `/trigger_events?id=in.(${targets.join(",")})&select=id,event_name,event_category`,
  );
  let patched = 0;
  for (const e of events) {
    if (e.event_category === "" || e.event_category === null) {
      await patch(`/trigger_events?id=eq.${e.id}`, { event_category: "state_change" });
      console.log(`  PATCHed trigger_events ${e.id} (${e.event_name}) -> state_change`);
      patched++;
    } else {
      console.log(`  trigger_events ${e.id} (${e.event_name}) already '${e.event_category}', skip`);
    }
  }
  console.log(`  event_category patched: ${patched}`);
}

// ============================================================
// 3. Catalog UX (Rule #20) on the DISCOVERY domain row
// ============================================================
// Buyer voice: workflow + value, no vendor names, no em-dash, American English.
// NEVER overwrite a non-empty value.
const DISCOVERY_TAGLINE =
  "See every device, cloud resource, and service before you can manage it.";
const DISCOVERY_DESCRIPTION =
  "Discovery scans your networks, cloud accounts, and directories to find the IT " +
  "you actually run, then fingerprints each asset and maps how components connect " +
  "into the business services they support. It turns blind spots into a normalized, " +
  "reconciled inventory that feeds your CMDB, asset management, and operations tools, " +
  "so teams stop guessing what exists and start acting on a trusted source of truth.";

async function fixDomainCatalogUX(): Promise<void> {
  console.log("== Catalog UX (Rule #20) on domain DISCOVERY (id 5) ==");
  const [dom] = await get(
    "/domains?domain_code=eq.DISCOVERY&select=id,catalog_tagline,catalog_description",
  );
  if (!dom) throw new Error("DISCOVERY domain row not found");
  const body: Row = {};
  if (dom.catalog_tagline === "" || dom.catalog_tagline === null) {
    body.catalog_tagline = DISCOVERY_TAGLINE;
  } else {
    console.log(`  catalog_tagline already non-empty, NOT overwriting`);
  }
  if (dom.catalog_description === "" || dom.catalog_description === null) {
    body.catalog_description = DISCOVERY_DESCRIPTION;
  } else {
    console.log(`  catalog_description already non-empty, NOT overwriting`);
  }
  if (Object.keys(body).length > 0) {
    await patch(`/domains?id=eq.${dom.id}`, body);
    console.log(`  PATCHed domains ${dom.id} with: ${Object.keys(body).join(", ")}`);
  } else {
    console.log(`  nothing to write (both fields already populated)`);
  }
}

// ============================================================
// 4. data_object_aliases (B11) generic synonyms on the 3 masters
// ============================================================
// Generic, cross-vendor terminology only. No vendor/product names (Rule #18).
// alias_type='synonym' (no industry_id available). notes NEVER written (Rule #15).
const ALIASES: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 81, alias_name: "Topology Snapshot" },
  { data_object_id: 81, alias_name: "Scan Run" },
  { data_object_id: 82, alias_name: "CI Candidate" },
  { data_object_id: 82, alias_name: "Asset Record" },
  { data_object_id: 83, alias_name: "Discovery Connector" },
];

async function fixAliases(): Promise<void> {
  console.log("== data_object_aliases (B11) generic synonyms ==");
  const existing = await get(
    "/data_object_aliases?data_object_id=in.(81,82,83)&select=data_object_id,alias_name",
  );
  const existingKeys = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const missing = ALIASES.filter(
    a => !existingKeys.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  ).map(a => ({ data_object_id: a.data_object_id, alias_name: a.alias_name, alias_type: "synonym" }));
  if (missing.length > 0) {
    await insert("/data_object_aliases", missing);
    for (const a of missing) console.log(`  INSERTed alias ${a.data_object_id} -> "${a.alias_name}"`);
  }
  console.log(`  aliases inserted: ${missing.length} (${existing.length} already present)`);
}

// ============================================================
async function main(): Promise<void> {
  await fixEntityType();
  await fixEventCategory();
  await fixDomainCatalogUX();
  await fixAliases();
  console.log("\nDone. UI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(81,82,83)");
  console.log("  https://tests.semantius.app/domain_map/trigger_events?id=in.(630,631,632,633)");
  console.log("  https://tests.semantius.app/domain_map/domains?domain_code=eq.DISCOVERY");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(81,82,83)");
}

await main();
