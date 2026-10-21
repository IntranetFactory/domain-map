#!/usr/bin/env bun
// CDP audit B1, truly-technical fixes applied 2026-05-31.
//
// Scope (per audit at audits/CDP.md and the orchestrator prompt):
//
//   B1-S2 (4 trigger_events.event_category PATCHes)
//     - 470 identity_graph.updated     -> state_change
//     - 471 customer_attributes.refreshed -> state_change   (ALREADY 'signal' on read,
//                                                            so no-op; verified at runtime)
//     - 472 customer_journey.stage_entered -> state_change
//     - 473 customer_journey.exited    -> lifecycle
//
//   B1-S6 (domain_regulations INSERTs for CDP)
//     Pre-flight verified the regulations table at run time. CDP (domain_id=72)
//     is ALREADY linked to GDPR (1), CCPA/CPRA (3), EU-AI-Act (33), COPPA (55).
//     Audit's other targets (LGPD, IAB TCF v2, Quebec Law 25, POPIA) are MISSING
//     from the regulations table entirely, creating new regulations rows is a
//     judgment call deferred to the user. Net: no inserts owed.
//
// Everything else in B1 (S1 modules, S3/S4 B10b FKs, S5 lifecycle states, S7 flag
// flips, S8 APQC tags) is deferred per the orchestrator's truly-technical screen.
//
// Idempotency: PATCH-only on stable PKs; safe to re-run.

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
// B1-S2: trigger_events.event_category backfill
// ---------------------------------------------------------------------------
type EventFix = { id: number; event_name: string; event_category: "lifecycle" | "state_change" | "threshold" | "signal" };
const eventFixes: EventFix[] = [
  { id: 470, event_name: "identity_graph.updated",       event_category: "state_change" },
  { id: 471, event_name: "customer_attributes.refreshed", event_category: "state_change" },
  { id: 472, event_name: "customer_journey.stage_entered", event_category: "state_change" },
  { id: 473, event_name: "customer_journey.exited",       event_category: "lifecycle" },
];

async function fixTriggerEvents(): Promise<{ patched: number; skipped: number }> {
  console.log("\n=== B1-S2: trigger_events.event_category backfill ===");
  const ids = eventFixes.map(f => f.id).join(",");
  const current = await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`,
  );
  const byId = new Map<number, Row>();
  for (const r of current) byId.set(Number(r.id), r);

  let patched = 0;
  let skipped = 0;
  for (const fix of eventFixes) {
    const live = byId.get(fix.id);
    if (!live) {
      console.log(`  ! trigger_event ${fix.id} (${fix.event_name}) not found, skipping`);
      skipped++;
      continue;
    }
    if (String(live.event_category) === fix.event_category) {
      console.log(
        `  - ${fix.id} ${fix.event_name}: already '${fix.event_category}', no-op`,
      );
      skipped++;
      continue;
    }
    if (live.event_category && String(live.event_category) !== "") {
      console.log(
        `  ! ${fix.id} ${fix.event_name}: live='${live.event_category}' differs from proposed='${fix.event_category}', skipping (drift, surface to user)`,
      );
      skipped++;
      continue;
    }
    await patch(`/trigger_events?id=eq.${fix.id}`, {
      event_category: fix.event_category,
    });
    console.log(`  + ${fix.id} ${fix.event_name}: '' -> '${fix.event_category}'`);
    patched++;
  }
  return { patched, skipped };
}

// ---------------------------------------------------------------------------
// B1-S6 verification: confirm CDP domain_regulations state, do NOT insert.
// ---------------------------------------------------------------------------
async function verifyDomainRegulations(): Promise<{ existing: number; deferred: string[] }> {
  console.log("\n=== B1-S6: CDP domain_regulations verification (READ-ONLY) ===");
  const existing = await get(
    `/domain_regulations?domain_id=eq.72&select=id,regulation_id,applicability`,
  );
  const regIds = existing.map(r => Number(r.regulation_id));
  if (regIds.length > 0) {
    const regs = await get(
      `/regulations?id=in.(${regIds.join(",")})&select=id,regulation_code,regulation_name`,
    );
    console.log(`  CDP (domain_id=72) is already linked to ${existing.length} regulations:`);
    for (const r of regs) {
      console.log(`    - id=${r.id} ${r.regulation_code} (${r.regulation_name})`);
    }
  } else {
    console.log("  CDP (domain_id=72) has NO domain_regulations rows (unexpected vs audit read).");
  }

  // Check whether audit's other targets exist as regulations rows.
  const auditWanted = ["LGPD", "IAB TCF v2", "Quebec Law 25", "POPIA"];
  const lookups = await get(
    `/regulations?or=(regulation_name.ilike.*LGPD*,regulation_name.ilike.*TCF*,regulation_name.ilike.*POPIA*,regulation_name.ilike.*Quebec*)&select=id,regulation_code,regulation_name`,
  );
  const deferred: string[] = [];
  for (const want of auditWanted) {
    const found = lookups.find(r =>
      String(r.regulation_name).toLowerCase().includes(want.toLowerCase().split(" ")[0]),
    );
    if (!found) {
      deferred.push(want);
      console.log(`  ! '${want}' NOT in regulations table, deferred (would need new regulations row, judgment call)`);
    } else {
      console.log(`  - '${want}' found as id=${found.id} ${found.regulation_code}`);
    }
  }
  return { existing: existing.length, deferred };
}

// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("CDP B1 truly-technical fixes, 2026-05-31");
  console.log("=========================================");

  const events = await fixTriggerEvents();
  const regs = await verifyDomainRegulations();

  console.log("\n=== SUMMARY ===");
  console.log(`  B1-S2 trigger_events: ${events.patched} patched, ${events.skipped} skipped/no-op`);
  console.log(`  B1-S6 domain_regulations: ${regs.existing} already linked, ${regs.deferred.length} deferred (missing from regulations table)`);

  console.log("\n=== UI spot-check links ===");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/domain_regulations");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
