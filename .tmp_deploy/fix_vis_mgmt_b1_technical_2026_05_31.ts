#!/usr/bin/env bun
// VIS-MGMT audit B1, truly-technical fixes applied 2026-05-31.
//
// Scope (per audit at audits/VIS-MGMT.md and the orchestrator's truly-technical
// screen):
//
//   APQC TAGGING (H1 / Bucket 1)
//     The audit pre-specifies handoff_id + PCF process_id for all three
//     currently-loaded outbound cross-domain handoffs, all confident L4 matches:
//
//       handoff 871 (VIS-MGMT -> IGA, visitor_registration.submitted)
//         -> process 1523 'Provide facility access and security' (PCF 21690)
//       handoff 872 (VIS-MGMT -> GRC, visitor_audit_log.sealed)
//         -> process 1570 'Manage compliance audits' (PCF 12183)
//       handoff 873 (VIS-MGMT -> HCM, host_notification.sent)
//         -> process 1540 'Manage safety, security, and access to sites' (PCF 19228)
//
//     All three handoff_processes rows verified absent before insert
//     (queried /handoff_processes?handoff_id=in.(871,872,873) returned []).
//     Loaded as proposal_source='agent_curated', record_status omitted so the
//     'new' default applies (Rule #1).
//
// Everything else in B1 is deferred:
//   - B1-S1 (new modules), B1-S2 (new capabilities), B1-M1..M7 (new entities),
//     B1-T1..T6 (new handoffs): create new entities -> DEFER.
//   - B1-S3 (catalog_tagline/description): Rule #20 buyer-voice draft, surface
//     to user -> DEFER.
//   - B1-S4 (business_logic): audit says surface to user -> DEFER.
//   - B1-S5 (DELETE legacy skill 117), B1-S6 (channel-primitive replacement):
//     gated on B1-S1 modules existing -> DEFER.
//   - B1-S7 (B10b source_domain_module_id backfill on 871/872/873): the source
//     modules do not yet exist (VIS-MGMT has zero domain_modules rows), so the
//     B10b FK PATCHes are not derivable -> DEFER.
//   - B1-S8 (relationship_verb rename `logged_in`): audit says 'surface to user
//     for the exact wording' -> DEFER.
//   - B1-S9 (lifecycle states): gated on B1-S1 modules -> DEFER.
//   - B1-S10 (pattern flag flips has_personal_content/has_submit_lock):
//     explicit orchestrator defer (pattern flag flips) -> DEFER.
//   - Bucket 2 #3/#4 (GDPR/CCPA/OSHA regulation linkage): 'options:' list,
//     user picks -> DEFER.
//   - Bucket 3 (Phase 0 candidates): speculative -> DEFER.
//
// Idempotency: pre-flight checks for existing (handoff_id, process_id) pair;
// safe to re-run.

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

async function post(path: string, body: Row | Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

// ---------------------------------------------------------------------------
// APQC TAGGING: handoff_processes inserts for handoffs 871, 872, 873.
// ---------------------------------------------------------------------------
type HandoffTag = {
  handoff_id: number;
  process_id: number;
  label: string;
};

const apqcTags: HandoffTag[] = [
  { handoff_id: 871, process_id: 1523, label: "VIS-MGMT->IGA visitor_registration.submitted -> 'Provide facility access and security' (PCF 21690)" },
  { handoff_id: 872, process_id: 1570, label: "VIS-MGMT->GRC visitor_audit_log.sealed -> 'Manage compliance audits' (PCF 12183)" },
  { handoff_id: 873, process_id: 1540, label: "VIS-MGMT->HCM host_notification.sent -> 'Manage safety, security, and access to sites' (PCF 19228)" },
];

async function insertApqcTags(): Promise<{ inserted: number; skipped: number; failed: number }> {
  console.log("\n=== APQC TAGGING (H1): handoff_processes inserts ===");

  // Pre-flight: verify all handoffs and processes exist and tag rows are absent.
  const handoffIds = apqcTags.map(t => t.handoff_id);
  const processIds = apqcTags.map(t => t.process_id);

  const liveHandoffs = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id,source_domain_id,target_domain_id`,
  );
  const liveProcesses = await get(
    `/processes?id=in.(${processIds.join(",")})&select=id,process_name,external_id,source_framework`,
  );
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`,
  );

  const liveHandoffIds = new Set(liveHandoffs.map(r => Number(r.id)));
  const liveProcessIds = new Set(liveProcesses.map(r => Number(r.id)));
  const existingPairs = new Set(
    existing.map(r => `${Number(r.handoff_id)}.${Number(r.process_id)}`),
  );

  console.log(`  handoffs found: ${liveHandoffs.length}/${handoffIds.length}`);
  console.log(`  processes found: ${liveProcesses.length}/${processIds.length}`);
  console.log(`  existing handoff_processes rows on these handoffs: ${existing.length}`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const tag of apqcTags) {
    const pairKey = `${tag.handoff_id}.${tag.process_id}`;
    if (!liveHandoffIds.has(tag.handoff_id)) {
      console.log(`  ! ${tag.label}: handoff ${tag.handoff_id} not found, skipping`);
      failed++;
      continue;
    }
    if (!liveProcessIds.has(tag.process_id)) {
      console.log(`  ! ${tag.label}: process ${tag.process_id} not found, skipping`);
      failed++;
      continue;
    }
    if (existingPairs.has(pairKey)) {
      console.log(`  - ${tag.label}: pair already exists, no-op`);
      skipped++;
      continue;
    }
    try {
      const res = await post("/handoff_processes", {
        handoff_id: tag.handoff_id,
        process_id: tag.process_id,
        proposal_source: "agent_curated",
        // record_status omitted: 'new' default applies per Rule #1.
      });
      console.log(`  + ${tag.label}: inserted (${res.length} row)`);
      inserted++;
    } catch (e: any) {
      console.log(`  ! ${tag.label}: insert failed: ${String(e.message).slice(0, 300)}`);
      failed++;
    }
  }

  return { inserted, skipped, failed };
}

// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("VIS-MGMT B1 truly-technical fixes, 2026-05-31");
  console.log("==============================================");

  const apqc = await insertApqcTags();

  console.log("\n=== SUMMARY ===");
  console.log(`  APQC TAGGING handoff_processes: ${apqc.inserted} inserted, ${apqc.skipped} skipped (already present), ${apqc.failed} failed`);

  console.log("\n=== UI spot-check links ===");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
  console.log("  https://tests.semantius.app/domain_map/handoffs");

  if (apqc.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
