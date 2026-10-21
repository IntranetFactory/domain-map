#!/usr/bin/env bun
// OBS state-driven Validate-mode execute pass (2026-06-07).
//
// Scope (EXECUTE items only; everything else is surfaced or left per the audit):
//   1. entity_type classification on the 5 OBS masters (Rule #12 enum).
//      All 5 are currently 'unclassified'. Deterministic from their workflow shape:
//        - metric_series / log_entries / distributed_traces -> operational_record
//          (append-only, write-once time-series telemetry; no business workflow)
//        - service_level_objectives / error_groups -> operational_workflow
//          (real-world objects with lifecycles: draft/active/archived and
//           new/triaging/resolved/regressed)
//   2. Catalog UX backfill on the domains row (Rule #20): catalog_tagline +
//      catalog_description are both empty; author buyer-voice copy and write it.
//      No module-grain copy is written because OBS has 0 domain_modules (unbuilt).
//
// Idempotent: reads live first, only writes a field still at its empty/unclassified
// default. Re-running is a no-op. Never stamps record_status (Rule #1; rows stay 'new').

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

const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

const DOMAIN_ID = 7;

// ---- 1. entity_type classification ----------------------------------------
const ENTITY_TYPE: Record<number, string> = {
  88: "operational_record",   // metric_series
  89: "operational_record",   // log_entries
  90: "operational_record",   // distributed_traces
  91: "operational_workflow", // service_level_objectives
  92: "operational_workflow", // error_groups
};

async function fixEntityTypes() {
  const ids = Object.keys(ENTITY_TYPE).join(",");
  const live = await get(
    `/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = ENTITY_TYPE[id];
    if (!want) continue;
    if (r.entity_type === "unclassified" || r.entity_type == null) {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: want });
      console.log(`  entity_type: ${r.data_object_name} (${id}) -> ${want}`);
      patched++;
    } else if (r.entity_type !== want) {
      console.log(
        `  SKIP entity_type ${r.data_object_name} (${id}): already '${r.entity_type}' (non-default; not overwriting)`,
      );
    } else {
      console.log(`  entity_type ${r.data_object_name} (${id}): already '${want}'`);
    }
  }
  console.log(`entity_type: ${patched} row(s) patched.`);
}

// ---- 2. catalog UX backfill on the domains row ----------------------------
const CATALOG_TAGLINE =
  "See what every service in production is doing, and know the moment it stops behaving.";

const CATALOG_DESCRIPTION =
  "Bring metrics, logs, and traces together so you can answer what is happening across " +
  "your distributed systems without jumping between tools. Watch live dashboards, drill " +
  "from a slow request into the exact trace, and search raw logs to find the root cause.\n\n" +
  "Set service level objectives, track error budgets as they burn, and group recurring " +
  "errors so the right engineer is paged before customers notice. When something breaks, " +
  "the signals that fired the alert are already in front of you, with a clean handoff to " +
  "your incident and ticketing workflows.";

async function fixCatalogUX() {
  const live = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,domain_code,catalog_tagline,catalog_description`,
  );
  const d = live[0];
  if (!d) throw new Error("OBS domain row not found");
  const body: Row = {};
  if (!d.catalog_tagline || String(d.catalog_tagline).trim() === "") {
    body.catalog_tagline = CATALOG_TAGLINE;
  } else {
    console.log("  catalog_tagline: non-empty, leaving as-is (overwrite forbidden).");
  }
  if (!d.catalog_description || String(d.catalog_description).trim() === "") {
    body.catalog_description = CATALOG_DESCRIPTION;
  } else {
    console.log("  catalog_description: non-empty, leaving as-is (overwrite forbidden).");
  }
  if (Object.keys(body).length > 0) {
    await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
    console.log(`  catalog UX: wrote ${Object.keys(body).join(", ")} on domain ${DOMAIN_ID}.`);
  } else {
    console.log("  catalog UX: nothing to write.");
  }
}

console.log("== OBS state-driven execute (2026-06-07) ==");
console.log("[1] entity_type classification");
await fixEntityTypes();
console.log("[2] catalog UX backfill (domains row)");
await fixCatalogUX();
console.log("done.");
