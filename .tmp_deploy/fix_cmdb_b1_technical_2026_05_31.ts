#!/usr/bin/env bun
// CMDB B1 residual technical fixes (2026-05-31).
//
// Scope (residual B1 fixes the audit pre-specifies, with all values either
// directly named in the audit or derivable from existing live rows):
//
//   B1-B1   PATCH handoffs.id=51 set data_object_id=76 (was 47).
//           Mirror of existing relationship row 247 (configuration_items
//           triggers service_incidents).
//
//   B1-M5   INSERT domain_regulations linking CMDB (domain_id=4) to existing
//           regulation SOX (regulation_id=5). Statutory anchor for SOX-ITGC.
//
//   B1-M6   INSERT domain_regulations linking CMDB (domain_id=4) to existing
//           regulation PCI-DSS (regulation_id=16). PCI-DSS 11.5 baseline
//           change-detection requirement; the broader PCI-DSS row is the
//           closest existing catalog anchor.
//
//   B1-H1   INSERT handoff_processes for the 13 untagged handoffs where the
//           audit pre-specifies handoff_id + resolvable PCF external_id.
//           Handoffs whose existing tags would need DELETE+REPLACE (48, 49,
//           51, 236, 237) are deferred (DELETE not licensed: audit does not
//           name the handoff_processes row IDs).
//
// Idempotency: each block pre-reads live state and only inserts/patches when
// the change is missing.

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

// ============================================================
// B1-B1: PATCH handoff 51 data_object_id 47 -> 76
// ============================================================
console.log("B1-B1: PATCH handoffs.id=51 data_object_id=47 -> 76");
{
  const cur = await call({
    method: "GET",
    path: "/handoffs?id=eq.51&select=id,data_object_id",
  });
  if (cur.length === 0) {
    throw new Error("handoff 51 not found");
  }
  if (Number(cur[0].data_object_id) === 76) {
    console.log("  already 76, skip");
  } else if (Number(cur[0].data_object_id) === 47) {
    await call({
      method: "PATCH",
      path: "/handoffs?id=eq.51",
      body: { data_object_id: 76 },
    });
    console.log("  patched to 76");
  } else {
    console.log(`  unexpected current data_object_id=${cur[0].data_object_id}, skip`);
  }
}

// ============================================================
// B1-M5 / B1-M6: domain_regulations links
// Insert into existing rows (regulations 5 SOX, 16 PCI-DSS) for CMDB (4).
// Omit notes (Rule #15) and omit record_status (Rule #1 default 'new').
// ============================================================
console.log("B1-M5/M6: INSERT domain_regulations for CMDB <-> SOX, PCI-DSS");
{
  const CMDB_DOMAIN_ID = 4;
  const targets = [
    { regulation_id: 5, label: "SOX (SOX-ITGC anchor)" },
    { regulation_id: 16, label: "PCI-DSS (11.5 baseline change-detection anchor)" },
  ];

  const existing = await call({
    method: "GET",
    path: `/domain_regulations?domain_id=eq.${CMDB_DOMAIN_ID}&select=id,regulation_id`,
  });
  const have = new Set(existing.map(r => Number(r.regulation_id)));

  const toInsert: Row[] = [];
  for (const t of targets) {
    if (have.has(t.regulation_id)) {
      console.log(`  ${t.label}: already linked, skip`);
    } else {
      toInsert.push({
        domain_id: CMDB_DOMAIN_ID,
        regulation_id: t.regulation_id,
        applicability: "mandatory",
      });
      console.log(`  ${t.label}: queued`);
    }
  }
  if (toInsert.length > 0) {
    await call({ method: "POST", path: "/domain_regulations", body: toInsert });
    console.log(`  inserted ${toInsert.length} row(s)`);
  }
}

// ============================================================
// B1-H1 (partial): INSERT handoff_processes for fresh handoffs only.
// Skip handoffs 48, 49, 51, 236, 237 (would need DELETE of existing
// discovery_substring rows; not licensed by audit row-ID rule).
// ============================================================
console.log("B1-H1: INSERT handoff_processes for 13 fresh handoff tags");
{
  // PCF external_id -> process_id (resolved from /processes pre-flight)
  const PCF = {
    MANAGE_INFRA_CONFIG: 1309,         // 20915
    TRIAGE_INCIDENT: 1299,             // 20903
    MAINTAIN_ASSET_RECORDS: 1312,      // 20918
    IMPL_CHANGE_CONTROL: 1190,         // 20752
  };

  const tags: { handoff_id: number; process_id: number; note: string }[] = [
    { handoff_id: 146,  process_id: PCF.MANAGE_INFRA_CONFIG,    note: "RMM -> CMDB ci_endpoint.discovered" },
    { handoff_id: 621,  process_id: PCF.MANAGE_INFRA_CONFIG,    note: "DISCOVERY -> CMDB discovery_scan.completed" },
    { handoff_id: 625,  process_id: PCF.MANAGE_INFRA_CONFIG,    note: "DISCOVERY -> CMDB discovery_source.connected" },
    { handoff_id: 627,  process_id: PCF.MANAGE_INFRA_CONFIG,    note: "CMDB-SVC-MAP -> ITSM service_map.updated" },
    { handoff_id: 628,  process_id: PCF.MANAGE_INFRA_CONFIG,    note: "CMDB-SVC-MAP -> AIOPS service_map.updated" },
    { handoff_id: 629,  process_id: PCF.TRIAGE_INCIDENT,        note: "CMDB-BASELINES -> ITSM baseline.deviation_detected" },
    { handoff_id: 654,  process_id: PCF.MANAGE_INFRA_CONFIG,    note: "NPMD -> CMDB-SVC-MAP topology snapshot" },
    { handoff_id: 679,  process_id: PCF.MANAGE_INFRA_CONFIG,    note: "DCIM -> CMDB dc_port_connection.changed" },
    { handoff_id: 1199, process_id: PCF.MANAGE_INFRA_CONFIG,    note: "CMDB -> DISCOVERY ci_class.published" },
    { handoff_id: 1200, process_id: PCF.IMPL_CHANGE_CONTROL,    note: "CMDB-BASELINES -> ITSM baseline.captured" },
    { handoff_id: 854,  process_id: PCF.MAINTAIN_ASSET_RECORDS, note: "APM -> CMDB technology_platform.sunset" },
    { handoff_id: 1211, process_id: PCF.MANAGE_INFRA_CONFIG,    note: "CMDB -> CMDB-SVC-MAP (intra) ci.registered" },
    { handoff_id: 1212, process_id: PCF.MANAGE_INFRA_CONFIG,    note: "CMDB -> CMDB-BASELINES (intra) ci.registered" },
  ];

  // Verify all PCFs resolve.
  const pcfIds = Array.from(new Set(tags.map(t => t.process_id)));
  const pcfRows = await call({
    method: "GET",
    path: `/processes?id=in.(${pcfIds.join(",")})&select=id,external_id`,
  });
  if (pcfRows.length !== pcfIds.length) {
    throw new Error(`PCF resolve mismatch: expected ${pcfIds.length}, got ${pcfRows.length}`);
  }

  // Skip any handoff_id that already has a handoff_processes row (idempotency).
  const handoffIds = tags.map(t => t.handoff_id);
  const existing = await call({
    method: "GET",
    path: `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id`,
  });
  const have = new Set(existing.map(r => Number(r.handoff_id)));

  const toInsert: Row[] = [];
  for (const t of tags) {
    if (have.has(t.handoff_id)) {
      console.log(`  handoff ${t.handoff_id}: already tagged, skip (${t.note})`);
    } else {
      toInsert.push({
        handoff_id: t.handoff_id,
        process_id: t.process_id,
        role: "implements",
        proposal_source: "agent_curated",
      });
    }
  }
  if (toInsert.length > 0) {
    // Chunk small for safety though 13 is small.
    const CHUNK = 50;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const slice = toInsert.slice(i, i + CHUNK);
      await call({ method: "POST", path: "/handoff_processes", body: slice });
    }
    console.log(`  inserted ${toInsert.length} handoff_processes row(s)`);
  } else {
    console.log("  nothing to insert");
  }
}

console.log("done");
