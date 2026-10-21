#!/usr/bin/env bun
// State-driven ITOM review (domain-map-analyst Validate mode, SKILL.md Rule #21).
// Executes the agent-doable additive/corrective items found live for ITOM (domain id 2):
//   1. entity_type backfill on the 4 ITOM masters (84/85/86/87), unclassified -> Rule #12 enum.
//   2. Catalog UX (Rule #20): author empty catalog_tagline + catalog_description on the
//      ITOM domain row (id 2) and the 3 ITOM modules (267/268/269).
//
// All PATCHes only fill empty/unclassified values; none overwrites a non-empty value.
// No record_status touched (additive content stays at DB default 'new'); no 'notes' column written.
// Idempotent: each write is guarded by reading live first and skipping rows already set.
// Run from project root:  bun run ".tmp_deploy/fix_itom_state_driven_2026-06-07.ts"

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

// Guard against any em-dash slipping into authored copy (CLAUDE.md hard rule).
function assertNoEmDash(label: string, ...vals: string[]): void {
  for (const v of vals) {
    if (v.includes("—")) {
      throw new Error(`Em-dash (U+2014) found in ${label}; rewrite before loading.`);
    }
  }
}

// ============================================================
// 1) entity_type backfill on the 4 ITOM masters (Rule #12 enum)
//    monitoring_events  (84): ingest -> correlate -> resolve         => operational_workflow
//    monitoring_alerts  (85): open -> ack -> suppress/resolve -> close => operational_workflow
//    monitoring_policies(86): draft -> review -> activate -> deprecate => operational_workflow (true workflow per audit B12)
//    capacity_records   (87): collected timeseries datapoints, read-mostly => operational_record
// ============================================================
const ENTITY_TYPES: Record<number, string> = {
  84: "operational_workflow",
  85: "operational_workflow",
  86: "operational_workflow",
  87: "operational_record",
};

async function backfillEntityTypes(): Promise<number> {
  const rows = await get(
    "/data_objects?id=in.(84,85,86,87)&select=id,data_object_name,entity_type",
  );
  let patched = 0;
  for (const r of rows) {
    const id = Number(r.id);
    const current = r.entity_type;
    const target = ENTITY_TYPES[id];
    if (!target) continue;
    // Only backfill when null/unclassified; never overwrite a real classification.
    if (current === null || current === "unclassified" || current === "") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
      console.log(`  entity_type: ${r.data_object_name} (${id}) ${String(current)} -> ${target}`);
      patched++;
    } else {
      console.log(`  entity_type: ${r.data_object_name} (${id}) already '${String(current)}', skipped`);
    }
  }
  return patched;
}

// ============================================================
// 2) Catalog UX (Rule #20) - buyer-voice, second person, workflow+value,
//    no vendor names, no em-dash, American English.
// ============================================================

const DOMAIN_TAGLINE =
  "Watch every server, network, and service in one place, catch problems before users feel them, and keep capacity ahead of demand.";

const DOMAIN_DESCRIPTION =
  "Bring monitoring, event management, and capacity planning together so your operations team works from one live picture of the infrastructure. " +
  "Collect signals from across the estate, turn raw events into meaningful alerts with the policies you control, and cut through the noise so the team chases what actually matters instead of every blip. When something breaks, the alert is already correlated to the affected service and routed to the people who can fix it.\n\n" +
  "The same operational data keeps you ahead of growth. Track utilization over time, see where headroom is running out, and forecast when you will need more before a resource is exhausted. Automate the routine recovery steps and scheduled work that used to page someone at 3 a.m., so the team spends its time on the problems that need judgment, not on the ones a runbook can handle. The payoff is fewer outages, faster recovery, and infrastructure spend that tracks real need.";

type ModuleCopy = { code: string; tagline: string; description: string };

const MODULE_COPY: ModuleCopy[] = [
  {
    code: "ITOM-INFRA-MON",
    tagline:
      "Turn a flood of infrastructure signals into a short list of alerts that matter, each tied to the service it affects.",
    description:
      "The monitoring and event core of IT operations. Ingest events from across servers, networks, and services, then let the policies you author decide what is normal, what is a warning, and what is a real problem. Correlate related events so one underlying fault raises one actionable alert instead of a hundred, and route each alert to the team that owns the affected service.\n\n" +
      "Operators get a single live view of infrastructure health, acknowledge and resolve alerts on a clear workflow, and hand off to incident management automatically when an alert needs a ticket. Tuning your monitoring policies over time means less noise, faster detection, and fewer surprises in production.",
  },
  {
    code: "ITOM-CAPACITY-PLAN",
    tagline:
      "See where capacity is running out and forecast the upgrade before it becomes an outage.",
    description:
      "Track how much of each resource you are actually using over time and turn that history into a forward view. Capture utilization datapoints across the estate, establish baselines for normal load, and project when CPU, memory, storage, or throughput will hit its ceiling. Planners spot the resources trending toward exhaustion, justify upgrades with evidence instead of guesswork, and avoid both the cost of overprovisioning and the risk of running out. Capacity decisions become a scheduled, data-backed routine rather than a reaction to the last incident.",
  },
  {
    code: "ITOM-OPS-AUTOMATION",
    tagline:
      "Automate the routine recovery steps and scheduled work so the team is not paged for problems a runbook can fix.",
    description:
      "Take the repeatable operational work off people's plates. When an alert fires, trigger the runbook that restarts the service, clears the queue, or scales the resource, and let a human step in only when the automation cannot resolve it. Schedule the recurring jobs and workloads that keep the estate healthy, and tie automated actions back to the alerts that prompted them so every run is traceable. The result is faster recovery, fewer after-hours pages, and consistent execution of the steps an experienced operator would take anyway.",
  },
];

async function authorDomainCatalogUX(): Promise<number> {
  assertNoEmDash("ITOM domain catalog copy", DOMAIN_TAGLINE, DOMAIN_DESCRIPTION);
  const [d] = await get(
    "/domains?id=eq.2&select=id,domain_code,catalog_tagline,catalog_description",
  );
  if (!d) throw new Error("ITOM domain (id 2) not found");
  const body: Row = {};
  if (d.catalog_tagline === null || d.catalog_tagline === "") body.catalog_tagline = DOMAIN_TAGLINE;
  if (d.catalog_description === null || d.catalog_description === "")
    body.catalog_description = DOMAIN_DESCRIPTION;
  if (Object.keys(body).length === 0) {
    console.log("  domain ITOM (2): catalog UX already populated, skipped");
    return 0;
  }
  await patch("/domains?id=eq.2", body);
  console.log(`  domain ITOM (2): wrote ${Object.keys(body).join(", ")}`);
  return 1;
}

async function authorModuleCatalogUX(): Promise<number> {
  const codes = MODULE_COPY.map(m => `"${m.code}"`).join(",");
  const mods = await get(
    `/domain_modules?domain_id=eq.2&domain_module_code=in.(${codes})` +
      "&select=id,domain_module_code,catalog_tagline,catalog_description",
  );
  const byCode = new Map<string, Row>();
  for (const m of mods) byCode.set(String(m.domain_module_code), m);
  let patched = 0;
  for (const spec of MODULE_COPY) {
    assertNoEmDash(`module ${spec.code} catalog copy`, spec.tagline, spec.description);
    const live = byCode.get(spec.code);
    if (!live) {
      console.log(`  module ${spec.code}: NOT FOUND live, skipped`);
      continue;
    }
    const body: Row = {};
    if (live.catalog_tagline === null || live.catalog_tagline === "")
      body.catalog_tagline = spec.tagline;
    if (live.catalog_description === null || live.catalog_description === "")
      body.catalog_description = spec.description;
    if (Object.keys(body).length === 0) {
      console.log(`  module ${spec.code} (${live.id}): catalog UX already populated, skipped`);
      continue;
    }
    await patch(`/domain_modules?id=eq.${live.id}`, body);
    console.log(`  module ${spec.code} (${live.id}): wrote ${Object.keys(body).join(", ")}`);
    patched++;
  }
  return patched;
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log("ITOM state-driven review (Rule #21 Validate). Executing additive/corrective items.\n");

  console.log("[1] entity_type backfill on ITOM masters (Rule #12):");
  const et = await backfillEntityTypes();

  console.log("\n[2a] Catalog UX on ITOM domain row (Rule #20):");
  const dom = await authorDomainCatalogUX();

  console.log("\n[2b] Catalog UX on ITOM modules (Rule #20):");
  const mod = await authorModuleCatalogUX();

  console.log("\n=== Summary ===");
  console.log(`  entity_type PATCHed:        ${et} / 4 masters`);
  console.log(`  domain catalog UX PATCHed:  ${dom} / 1`);
  console.log(`  module catalog UX PATCHed:  ${mod} / 3`);

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(84,85,86,87)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.2");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.2");
}

await main();
