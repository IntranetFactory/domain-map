#!/usr/bin/env bun
// State-driven EAM (domain_id=53) review fixes, 2026-06-07.
// Executes only the agent-fixable open items from audits/EAM/state.yaml:
//   1. entity_type PATCH on the 3 EAM masters (475/476/477), only where unclassified/null.
//   2. catalog_tagline + catalog_description on the EAM domain row, only when both empty (Rule #20).
//   3. handoff_processes INSERT for handoff 953 -> PCF process 1549 "Schedule maintenance work"
//      (proposal_source='agent_curated', role='implements'), idempotent on (handoff_id, process_id).
//
// Idempotent: reads live before every write; never overwrites a non-empty value.
// Rule #1: new rows record_status omitted (defaults to 'new'). Rule #15: never writes a `notes` column.

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
const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });

// ---------------------------------------------------------------------------
// 1. entity_type classification on the 3 EAM masters
// ---------------------------------------------------------------------------
const ENTITY_TYPES: Record<number, string> = {
  475: "operational_workflow", // industrial_assets: commissioned -> in_service -> out_of_service -> retired
  476: "operational_workflow", // eam_work_orders: draft -> scheduled -> assigned -> in_progress -> completed -> closed
  477: "catalog",              // equipment_pm_schedules: config/template that drives PM job generation (Rule #12 config-shape)
};

async function fixEntityTypes(): Promise<number> {
  const masters = await get(
    "/data_objects?id=in.(475,476,477)&select=id,data_object_name,entity_type",
  );
  let patched = 0;
  for (const m of masters) {
    const id = Number(m.id);
    const target = ENTITY_TYPES[id];
    const current = m.entity_type;
    if (current === null || current === "unclassified") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
      console.log(`  entity_type: ${m.data_object_name} (${id}) ${current} -> ${target}`);
      patched++;
    } else {
      console.log(`  entity_type: ${m.data_object_name} (${id}) already '${current}', skipped`);
    }
  }
  return patched;
}

// ---------------------------------------------------------------------------
// 2. catalog_tagline + catalog_description on the EAM domain row (Rule #20)
// ---------------------------------------------------------------------------
const CATALOG_TAGLINE =
  "Keep plant and equipment running. Plan preventive maintenance, dispatch work orders, and track every asset from commissioning to retirement.";

const CATALOG_DESCRIPTION =
  "Enterprise Asset Management gives maintenance and reliability teams one place to run the physical side of the business: the machines, lines, and infrastructure that production depends on. Build an asset register that captures each piece of equipment, its hierarchy of components, and its full history from commissioning through retirement, then drive upkeep from preventive-maintenance schedules tied to runtime hours, meter readings, and condition data so failures are caught before they stop the line.\n\n" +
  "Work flows through a single work-order lifecycle. Requests become planned jobs, jobs get scheduled and assigned to crews, technicians execute and close them out in the field, and every labor hour, part, and inspection result lands back on the asset record. Safety and compliance steps such as lockout/tagout and calibration are built into the same flow, so the audit trail is a byproduct of getting the work done rather than a separate chore.\n\n" +
  "EAM sits at the center of operations. It receives capital projects as new assets to maintain, reacts to production downtime and schedule changes with the right maintenance windows, and feeds completed work, asset costs, and retirement events back to finance, manufacturing, and compliance. The result is higher uptime, longer asset life, lower maintenance spend, and a defensible record of how every asset has been cared for.";

async function fixCatalogCopy(): Promise<number> {
  const [domain] = await get(
    "/domains?id=eq.53&select=id,catalog_tagline,catalog_description",
  );
  if (!domain) throw new Error("EAM domain id=53 not found");
  const body: Row = {};
  if (!domain.catalog_tagline || String(domain.catalog_tagline).trim() === "") {
    body.catalog_tagline = CATALOG_TAGLINE;
  } else {
    console.log("  catalog_tagline already non-empty, skipped");
  }
  if (!domain.catalog_description || String(domain.catalog_description).trim() === "") {
    body.catalog_description = CATALOG_DESCRIPTION;
  } else {
    console.log("  catalog_description already non-empty, skipped");
  }
  if (Object.keys(body).length === 0) return 0;
  await patch("/domains?id=eq.53", body);
  console.log(`  catalog copy written: ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ---------------------------------------------------------------------------
// 3. handoff_processes APQC tag for handoff 953 (H1)
// ---------------------------------------------------------------------------
const H1_HANDOFF = 953;
const H1_PROCESS = 1549; // "Schedule maintenance work" (PCF external_id 19246, L4)

async function fixH1Tag(): Promise<number> {
  const existing = await get(
    `/handoff_processes?handoff_id=eq.${H1_HANDOFF}&process_id=eq.${H1_PROCESS}&select=id`,
  );
  if (existing.length > 0) {
    console.log(`  handoff_processes (${H1_HANDOFF},${H1_PROCESS}) already present, skipped`);
    return 0;
  }
  await post("/handoff_processes", [
    {
      handoff_id: H1_HANDOFF,
      process_id: H1_PROCESS,
      proposal_source: "agent_curated",
      role: "implements",
    },
  ]);
  console.log(`  handoff_processes inserted: handoff ${H1_HANDOFF} -> process ${H1_PROCESS}`);
  return 1;
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("== EAM state-driven fixes 2026-06-07 ==");
  console.log("[1] entity_type classification");
  const nEntity = await fixEntityTypes();
  console.log("[2] catalog UX copy (Rule #20)");
  const nCopy = await fixCatalogCopy();
  console.log("[3] H1 handoff 953 APQC tag");
  const nTag = await fixH1Tag();
  console.log("== Summary ==");
  console.log(`  entity_type PATCHed: ${nEntity}`);
  console.log(`  catalog fields PATCHed: ${nCopy}`);
  console.log(`  handoff_processes inserted: ${nTag}`);
  console.log("UI:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(475,476,477)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.53");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes?handoff_id=eq.953");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
