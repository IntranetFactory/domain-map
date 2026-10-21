#!/usr/bin/env bun
// State-driven IWMS audit execute (2026-06-07).
// Two additive/corrective write types, both idempotent and verify-live-then-write:
//   1. entity_type classification (B1A-ENTITY-TYPE): PATCH only rows still null/unclassified.
//   2. Catalog UX copy (Rule #20, A4 + M8): PATCH catalog_tagline / catalog_description ONLY
//      where the live value is empty. Never overwrites a non-empty value.
//
// Run from project root: bun run ".tmp_deploy/fix_iwms_state_driven_2026_06_07.ts"

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

// ============================================================
// 1. entity_type classification (Rule #12 enum)
// ============================================================
// Deterministic from live shape (lifecycle states + description):
//   590 desk_bookings              -> operational_workflow (6 states, booking lifecycle)
//   591 room_reservations          -> operational_workflow (6 states, reservation lifecycle)
//   592 workplace_service_requests -> operational_workflow (5 states, triage/resolve)
//   593 space_utilization_reports  -> computed             (analytics derived from occupancy/usage)
//   594 workplace_experience_feedback -> operational_record (store-and-forward survey record)
//   795 locations                  -> catalog              (site/office/floor registry, reference)
const entityTypes: Record<number, string> = {
  590: "operational_workflow",
  591: "operational_workflow",
  592: "operational_workflow",
  593: "computed",
  594: "operational_record",
  795: "catalog",
};

async function fixEntityTypes(): Promise<number> {
  const ids = Object.keys(entityTypes).map(Number);
  const live = await get(
    `/data_objects?id=in.(${ids.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = entityTypes[id];
    const current = r.entity_type;
    if (!target) continue;
    if (current === null || current === "unclassified") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
      console.log(`  entity_type: ${r.data_object_name} (${id}) ${current} -> ${target}`);
      patched++;
    } else {
      console.log(`  entity_type: ${r.data_object_name} (${id}) already '${current}', skip`);
    }
  }
  return patched;
}

// ============================================================
// 2. Catalog UX copy (Rule #20). Buyer-voice: workflow + value.
//    No vendor/product names, no em-dash, American English.
//    Written ONLY into empty catalog_tagline / catalog_description.
// ============================================================
type CatalogCopy = {
  catalog_tagline: string;
  catalog_description: string;
};

const domainCopy: CatalogCopy = {
  catalog_tagline: "Book the desk, reserve the room, and prove the space is working.",
  catalog_description:
    "Run the hybrid workplace end to end: a single registry of sites, buildings, and floors that every booking flow rides on, self-service desk and meeting-room reservations with check-in and no-show recapture, a facilities service desk for workplace tickets, and occupancy analytics that turn badge and booking signals into space-utilization reporting. The payoff is a workplace employees can navigate without friction and a real-estate footprint leaders can right-size with evidence instead of guesswork.",
};

const moduleCopy: Record<number, CatalogCopy> = {
  98: {
    catalog_tagline: "One trusted registry of every site, building, and floor.",
    catalog_description:
      "Establish the spatial backbone the rest of the workplace runs on. Maintain the canonical record of sites, offices, buildings, and floors, attach lease and property metadata where the workplace team holds the integrated record, and let every reservation, service, and analytics flow read the same location anchor. The value is consistent space data across the portfolio so no two systems disagree about what exists or where it sits.",
  },
  99: {
    catalog_tagline: "Self-service desk booking that makes return-to-office actually work.",
    catalog_description:
      "Give employees a frictionless way to reserve a desk for the days they come in and give workplace teams the demand signal they need. Handle hoteling and hot-desking with date, time, and work-mode selection, drive check-in and no-show recapture so reserved space is real space, and capture workplace experience feedback to keep improving the office. The result is higher confidence that a seat will be there and cleaner data on how the workplace is actually used.",
  },
  100: {
    catalog_tagline: "Meeting rooms that are booked, checked into, and never sit empty.",
    catalog_description:
      "Make conference and collaboration space easy to find and hard to waste. Reserve rooms with calendar integration, attendee and capacity matching, and the equipment a meeting needs, then enforce check-in and reclaim no-shows so booked rooms get used. The payoff is fewer ghost reservations, less hunting for an open room, and reliable data on which spaces earn their footprint.",
  },
  101: {
    catalog_tagline: "A workplace ticket flow built for facilities, not IT.",
    catalog_description:
      "Turn every burned-out bulb, broken chair, temperature complaint, and spill into a tracked request that reaches the right hands. Capture the issue, triage and route it to in-house facilities staff or building management, and drive it to resolution with a clear audit trail. The value is a responsive workplace where employees know problems get fixed and facilities leaders can see where time and money are going.",
  },
  102: {
    catalog_tagline: "Turn occupancy signals into the case for right-sizing real estate.",
    catalog_description:
      "Convert badge swipes, bookings, and sensor data into a clear picture of how space is really used. Measure occupancy, surface peak patterns and underutilized zones, model scenarios with stack diagrams, and publish utilization signals to real-estate and sustainability teams. The payoff is an evidence-based footprint decision: keep, consolidate, or redesign space on data rather than anecdote.",
  },
};

function hasEmDash(s: string): boolean {
  return s.includes("—");
}

async function fixDomainCatalog(): Promise<number> {
  const [live] = await get(
    "/domains?id=eq.23&select=id,catalog_tagline,catalog_description",
  );
  if (!live) throw new Error("IWMS domain 23 not found");
  const body: Row = {};
  if (!String(live.catalog_tagline ?? "").trim()) body.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(live.catalog_description ?? "").trim())
    body.catalog_description = domainCopy.catalog_description;
  if (Object.keys(body).length === 0) {
    console.log("  domain 23: catalog fields already populated, skip");
    return 0;
  }
  for (const v of Object.values(body)) if (hasEmDash(String(v))) throw new Error("em-dash in domain copy");
  await patch("/domains?id=eq.23", body);
  console.log(`  domain 23: wrote ${Object.keys(body).join(", ")}`);
  return 1;
}

async function fixModuleCatalog(): Promise<number> {
  const ids = Object.keys(moduleCopy).map(Number);
  const live = await get(
    `/domain_modules?id=in.(${ids.join(",")})&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const copy = moduleCopy[id];
    if (!copy) continue;
    const body: Row = {};
    if (!String(r.catalog_tagline ?? "").trim()) body.catalog_tagline = copy.catalog_tagline;
    if (!String(r.catalog_description ?? "").trim()) body.catalog_description = copy.catalog_description;
    if (Object.keys(body).length === 0) {
      console.log(`  module ${id} (${r.domain_module_code}): catalog fields already populated, skip`);
      continue;
    }
    for (const v of Object.values(body))
      if (hasEmDash(String(v))) throw new Error(`em-dash in module ${id} copy`);
    await patch(`/domain_modules?id=eq.${id}`, body);
    console.log(`  module ${id} (${r.domain_module_code}): wrote ${Object.keys(body).join(", ")}`);
    patched++;
  }
  return patched;
}

// ============================================================
async function main() {
  console.log("== IWMS state-driven execute (2026-06-07) ==");
  console.log("\n[1] entity_type classification (B1A-ENTITY-TYPE):");
  const et = await fixEntityTypes();
  console.log("\n[2] domain catalog UX (Rule #20 / A4):");
  const dc = await fixDomainCatalog();
  console.log("\n[3] module catalog UX (Rule #20 / M8):");
  const mc = await fixModuleCatalog();

  console.log("\n== Summary ==");
  console.log(`  entity_type PATCHed:   ${et}`);
  console.log(`  domain catalog PATCHed: ${dc}`);
  console.log(`  module catalog PATCHed: ${mc}`);

  console.log("\n== UI links ==");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(590,591,592,593,594,795)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.23");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.23");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
