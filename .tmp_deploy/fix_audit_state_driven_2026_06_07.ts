#!/usr/bin/env bun
// State-driven AUDIT review execute pass (2026-06-07).
// Three additive/corrective write types, all idempotent (read live, write only what's missing/empty):
//   1. entity_type PATCH on the 8 AUDIT masters (unclassified -> operational_workflow).
//   2. event_category backfill on trigger events 602/603/605 (empty -> lifecycle/state_change/lifecycle).
//   3. catalog UX (A4): catalog_tagline + catalog_description on the AUDIT domain row (id 16), both empty.
//
// AUDIT is UNBUILT (0 domain_modules, 0 capability_domains): no module-grain catalog UX (M8 vacuous),
// no module-FK backfill, no scaffold. Those stay surfaced/blocked per the build cascade.
// All writes land at record_status (default 'new'); never approved. No 'notes' column is written.

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

// ---------------------------------------------------------------------------
// 1. entity_type on the 8 AUDIT masters.
// All 8 are real-world business objects with a documented workflow (see state.yaml B1B-B12),
// so every one is operational_workflow.
// ---------------------------------------------------------------------------
const MASTER_IDS = [292, 293, 294, 295, 296, 297, 298, 299];

async function fixEntityType(): Promise<number> {
  const live = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const toFix = live.filter(
    r => r.entity_type === "unclassified" || r.entity_type === null,
  );
  if (toFix.length === 0) {
    console.log("entity_type: all 8 masters already classified, nothing to do.");
    return 0;
  }
  const ids = toFix.map(r => Number(r.id));
  await patch(`/data_objects?id=in.(${ids.join(",")})`, {
    entity_type: "operational_workflow",
  });
  console.log(
    `entity_type: PATCHed ${ids.length} masters -> operational_workflow: ` +
      toFix.map(r => `${r.id} ${r.data_object_name}`).join(", "),
  );
  return ids.length;
}

// ---------------------------------------------------------------------------
// 2. event_category backfill on 602/603/605 (only those with empty category).
// ---------------------------------------------------------------------------
const EVENT_CATEGORY: Record<number, string> = {
  602: "lifecycle", // audit_plan.updated
  603: "state_change", // control_test.executed
  605: "lifecycle", // work_paper.completed
};

async function fixEventCategory(): Promise<number> {
  const ids = Object.keys(EVENT_CATEGORY).map(Number);
  const live = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`,
  );
  let count = 0;
  for (const ev of live) {
    const id = Number(ev.id);
    const current = ev.event_category;
    if (current !== "" && current !== null) {
      console.log(
        `event_category: ${id} (${ev.event_name}) already '${current}', skip.`,
      );
      continue;
    }
    const target = EVENT_CATEGORY[id];
    await patch(`/trigger_events?id=eq.${id}`, { event_category: target });
    console.log(`event_category: ${id} (${ev.event_name}) -> '${target}'`);
    count += 1;
  }
  return count;
}

// ---------------------------------------------------------------------------
// 3. Catalog UX (A4) on the AUDIT domain row (id 16). Write only if empty.
// Buyer voice (workflow + value); no vendor names; no em-dash; American English.
// ---------------------------------------------------------------------------
const AUDIT_DOMAIN_ID = 16;

const CATALOG_TAGLINE =
  "Plan, execute, and report internal audits from a risk-based plan through fieldwork, findings, and tracked remediation.";

const CATALOG_DESCRIPTION =
  "Run your internal audit function end to end. Build a risk-based annual plan, scope engagements, " +
  "and assign teams, then carry out fieldwork with work papers and control tests that capture evidence " +
  "as you go. When you raise a finding, route it for management response, agree on recommendations, and " +
  "track follow-up actions to closure so nothing slips.\n\n" +
  "Produce review-ready reports for leadership and the audit committee, and keep a defensible trail of who " +
  "tested what, when, and with what result. Sign-offs, locked work papers, and a clear status on every open " +
  "issue give you confidence that the audit cycle is under control and that remediation is actually getting done.";

async function fixCatalogUX(): Promise<number> {
  const [row] = await get(
    `/domains?id=eq.${AUDIT_DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!row) throw new Error(`AUDIT domain row ${AUDIT_DOMAIN_ID} not found`);
  const body: Row = {};
  if (row.catalog_tagline === "" || row.catalog_tagline === null) {
    body.catalog_tagline = CATALOG_TAGLINE;
  } else {
    console.log("catalog_tagline: already non-empty, leaving untouched.");
  }
  if (row.catalog_description === "" || row.catalog_description === null) {
    body.catalog_description = CATALOG_DESCRIPTION;
  } else {
    console.log("catalog_description: already non-empty, leaving untouched.");
  }
  if (Object.keys(body).length === 0) {
    console.log("catalog UX: both fields already populated, nothing to do.");
    return 0;
  }
  await patch(`/domains?id=eq.${AUDIT_DOMAIN_ID}`, body);
  console.log(`catalog UX: wrote ${Object.keys(body).join(" + ")} on domain 16.`);
  return Object.keys(body).length;
}

// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  // Em-dash guard: never emit U+2014 in any authored copy.
  const authored = [CATALOG_TAGLINE, CATALOG_DESCRIPTION];
  for (const s of authored) {
    if (s.includes("—")) throw new Error("em-dash detected in authored copy");
  }

  console.log("=== AUDIT state-driven execute pass 2026-06-07 ===");
  const nEntity = await fixEntityType();
  const nEvent = await fixEventCategory();
  const nCatalog = await fixCatalogUX();

  console.log("\n=== Summary ===");
  console.log(`entity_type masters patched: ${nEntity}`);
  console.log(`event_category backfilled:   ${nEvent}`);
  console.log(`catalog UX fields written:   ${nCatalog}`);
  console.log("\nUI links:");
  console.log("https://tests.semantius.app/domain_map/data_objects?id=in.(292,293,294,295,296,297,298,299)");
  console.log("https://tests.semantius.app/domain_map/trigger_events?id=in.(602,603,605)");
  console.log("https://tests.semantius.app/domain_map/domains?id=eq.16");
}

await main();
