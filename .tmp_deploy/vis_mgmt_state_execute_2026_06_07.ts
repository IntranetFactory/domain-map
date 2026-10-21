#!/usr/bin/env bun
// VIS-MGMT state-driven execute pass (2026-06-07).
// Domain is UNBUILT (0 domain_modules, 0 capability_domains): per Rule #21 we do NOT
// scaffold the build. This loader executes ONLY the cascade-independent, mechanical,
// additive/corrective items that touch rows which already exist:
//   1. entity_type classification on the 8 masters (all 'unclassified' -> typed enum).
//   2. catalog_tagline + catalog_description on the domain row (both empty) per Rule #20.
//   3. event_category backfill on the 10 trigger_events (all '').
// Idempotent: each step reads live first and writes only when the target is still empty/unclassified.
// Never flips record_status; never overwrites a non-empty value.

import { } from "bun";

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

const DOMAIN_ID = 24;
const MASTER_IDS = [668, 669, 670, 671, 672, 673, 674, 675];

// ---- Step 1: entity_type classification (Rule #12 enum) ----
// 668 visitor_registrations         operational_workflow (draft->submitted->approved->arrived->checked_out)
// 669 visitor_check_ins             operational_workflow (pending->verified->badged/denied/escalated)
// 670 visitor_badges                operational_workflow (issued->active->returned/lost)
// 671 host_assignments              operational_workflow (assigned->confirmed->closed)
// 672 visitor_evacuation_lists      operational_workflow (open->closed_drill/closed_event)
// 673 visitor_nda_acknowledgements  operational_record   (per-visit ack artifact; Rule #12 lists "acknowledgements")
// 674 visitor_watchlist_screenings  operational_workflow (queued->cleared/flagged/blocked, block is gated)
// 675 visitor_audit_logs            operational_record   (Rule #12 lists "audit logs", append-only trail)
const ENTITY_TYPE: Record<number, string> = {
  668: "operational_workflow",
  669: "operational_workflow",
  670: "operational_workflow",
  671: "operational_workflow",
  672: "operational_workflow",
  673: "operational_record",
  674: "operational_workflow",
  675: "operational_record",
};

// ---- Step 2: catalog UX copy (Rule #20 buyer voice; no vendor names; no em-dash; American English) ----
const CATALOG_TAGLINE =
  "Pre-register every visitor, check them in fast at the door, and keep a defensible record of who was on-site, when, and why.";
const CATALOG_DESCRIPTION =
  "Invite visitors before they arrive and let them fill in their details, accept the agreements your site requires, and get screened ahead of time, so check-in at the front desk is a tap rather than a clipboard. When they walk in, verify them, print or push a badge scoped to where they are allowed to go, and notify their host automatically. Every step is timestamped, so the people watching the lobby always know who is in the building.\n\nThe same flow keeps you compliant and ready for an emergency. Non-disclosure acknowledgements and watchlist screening run as part of the visit instead of as a separate chore, host responsibility is recorded against each guest, and a live on-site roster is one click away when the alarm sounds. Sealed audit logs give security, facilities, and compliance teams a single trustworthy trail of every arrival and departure.";

// ---- Step 3: event_category backfill (Rule #13 enum: lifecycle / state_change / threshold / signal) ----
const EVENT_CATEGORY: Record<number, string> = {
  975: "lifecycle",     // visitor_registration.submitted
  976: "lifecycle",     // visitor_check_in.completed
  977: "lifecycle",     // visitor_badge.issued
  978: "lifecycle",     // visitor_badge.returned
  979: "lifecycle",     // host_assignment.created
  980: "signal",        // host_notification.sent
  981: "state_change",  // evacuation_list.updated
  982: "lifecycle",     // visitor_nda.acknowledged
  983: "state_change",  // visitor_watchlist.screened
  984: "lifecycle",     // visitor_audit_log.sealed
};

async function main() {
  // ===== Step 1: entity_type =====
  console.log("== Step 1: entity_type classification ==");
  const masters = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type&order=id`,
  );
  let etWritten = 0;
  for (const m of masters) {
    const id = Number(m.id);
    const target = ENTITY_TYPE[id];
    if (!target) {
      console.log(`  SKIP ${m.data_object_name} (${id}): not in plan`);
      continue;
    }
    if (m.entity_type !== "unclassified" && m.entity_type !== null && m.entity_type !== "") {
      console.log(`  SKIP ${m.data_object_name} (${id}): already '${m.entity_type}'`);
      continue;
    }
    await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
    console.log(`  SET ${m.data_object_name} (${id}) entity_type='${target}'`);
    etWritten++;
  }
  console.log(`  entity_type: ${etWritten} rows updated`);

  // ===== Step 2: catalog UX =====
  console.log("== Step 2: catalog_tagline + catalog_description ==");
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!dom) throw new Error("VIS-MGMT domain row 24 not found");
  const body: Row = {};
  if (!dom.catalog_tagline || String(dom.catalog_tagline).trim() === "") {
    body.catalog_tagline = CATALOG_TAGLINE;
  } else {
    console.log("  SKIP catalog_tagline: already non-empty");
  }
  if (!dom.catalog_description || String(dom.catalog_description).trim() === "") {
    body.catalog_description = CATALOG_DESCRIPTION;
  } else {
    console.log("  SKIP catalog_description: already non-empty");
  }
  if (Object.keys(body).length > 0) {
    await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
    console.log(`  SET domain 24 fields: ${Object.keys(body).join(", ")}`);
  } else {
    console.log("  catalog UX: nothing to write");
  }

  // ===== Step 3: event_category =====
  console.log("== Step 3: event_category backfill ==");
  const events = await get(
    `/trigger_events?data_object_id=in.(${MASTER_IDS.join(",")})&select=id,event_name,event_category&order=id`,
  );
  let evWritten = 0;
  for (const e of events) {
    const id = Number(e.id);
    const target = EVENT_CATEGORY[id];
    if (!target) {
      console.log(`  SKIP ${e.event_name} (${id}): not in plan`);
      continue;
    }
    if (e.event_category && String(e.event_category).trim() !== "") {
      console.log(`  SKIP ${e.event_name} (${id}): already '${e.event_category}'`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${id}`, { event_category: target });
    console.log(`  SET ${e.event_name} (${id}) event_category='${target}'`);
    evWritten++;
  }
  console.log(`  event_category: ${evWritten} rows updated`);

  console.log("\n== Done ==");
  console.log(`entity_type updated:    ${etWritten}`);
  console.log(`catalog fields written: ${Object.keys(body).length}`);
  console.log(`event_category updated:  ${evWritten}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
