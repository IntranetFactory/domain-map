#!/usr/bin/env bun
// SMP Bucket 2 fixes per user decisions on 2026-05-28:
//   #1 — Revert all 8 pre-existing notes rows to empty string (Rule #15 cleanup).
//   #2 — Add GDPR + SOC 2 as domain_regulations on SMP (creating GDPR if missing).
//   #3 — Defer modularization until Bucket 3 entities load (no action here).
//   #4 — Queue IGA and S2P validate runs as separate follow-ups (no action here).
//
// Run:    bun run .tmp_deploy/fix_smp_bucket2.ts --dry-run
// Apply:  bun run .tmp_deploy/fix_smp_bucket2.ts --apply

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

const SMP_DOMAIN_ID = 85;
const SOC2_REGULATION_ID = 15;
const EU_JURISDICTION_ID = 2;

// domain_data_objects PKs to clear notes on
const DDO_PURCHASE_ORDERS_ID = 115;
const DDO_LEGAL_CONTRACTS_ID = 109;
const DDO_CONFIGURATION_ITEMS_ID = 141;

// data_objects PKs to clear notes on (the 5 SMP masters; saas_app_assignments was
// renamed to smp_license_seat_assignments at id=63)
const DO_SAAS_APPLICATIONS = 61;
const DO_SAAS_SUBSCRIPTIONS = 62;
const DO_SMP_LICENSE_SEAT_ASSIGNMENTS = 63;
const DO_SAAS_USAGE_METRICS = 64;
const DO_SHADOW_IT_APPS = 65;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud/postgrestRequest"], {
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

async function patch(path: string, body: Row, label: string): Promise<void> {
  if (DRY_RUN) {
    console.log(`  [DRY] ${label}  PATCH ${path}  ${JSON.stringify(body)}`);
    return;
  }
  await call({ method: "PATCH", path, body });
  console.log(`  ${label}  PATCH ${path}`);
}

async function insertRows(path: string, rows: Row[], label: string): Promise<Row[]> {
  if (rows.length === 0) {
    console.log(`  ${label}  skip (0 rows)`);
    return [];
  }
  if (DRY_RUN) {
    console.log(`  [DRY] ${label}  POST ${path}  ${rows.length} rows`);
    for (const r of rows) console.log(`        ${JSON.stringify(r)}`);
    return [];
  }
  const result = await call({ method: "POST", path, body: rows });
  console.log(`  ${label}  POST ${path}  ${rows.length} rows`);
  return result;
}

// ============================================================
// PHASE 1 — Rule #15 notes cleanup (8 PATCHes)
// ============================================================

async function phase1(): Promise<void> {
  console.log("\n=== Phase 1: revert 8 notes rows to empty string (Rule #15) ===");

  // 3 domain_data_objects rows
  const ddoTargets: Array<{ id: number; label: string }> = [
    { id: DDO_PURCHASE_ORDERS_ID,      label: "DDO purchase_orders (consumer)" },
    { id: DDO_LEGAL_CONTRACTS_ID,      label: "DDO legal_contracts (contributor)" },
    { id: DDO_CONFIGURATION_ITEMS_ID,  label: "DDO configuration_items (contributor)" },
  ];
  for (const t of ddoTargets) {
    const rows = await get(`/domain_data_objects?id=eq.${t.id}&select=id,notes`);
    if (rows.length === 0) {
      console.log(`  skip ${t.label}: id=${t.id} not found`);
      continue;
    }
    if (rows[0]!.notes === "") {
      console.log(`  skip ${t.label}: notes already empty`);
      continue;
    }
    await patch(`/domain_data_objects?id=eq.${t.id}`, { notes: "" }, t.label);
  }

  // 5 data_objects rows
  const doTargets: Array<{ id: number; label: string }> = [
    { id: DO_SAAS_APPLICATIONS,             label: "data_object saas_applications" },
    { id: DO_SAAS_SUBSCRIPTIONS,            label: "data_object saas_subscriptions" },
    { id: DO_SMP_LICENSE_SEAT_ASSIGNMENTS,  label: "data_object smp_license_seat_assignments" },
    { id: DO_SAAS_USAGE_METRICS,            label: "data_object saas_usage_metrics" },
    { id: DO_SHADOW_IT_APPS,                label: "data_object shadow_it_apps" },
  ];
  for (const t of doTargets) {
    const rows = await get(`/data_objects?id=eq.${t.id}&select=id,notes`);
    if (rows.length === 0) {
      console.log(`  skip ${t.label}: id=${t.id} not found`);
      continue;
    }
    if (rows[0]!.notes === "") {
      console.log(`  skip ${t.label}: notes already empty`);
      continue;
    }
    await patch(`/data_objects?id=eq.${t.id}`, { notes: "" }, t.label);
  }
}

// ============================================================
// PHASE 2 — Create GDPR + link 2 regulations to SMP
// ============================================================

async function phase2(): Promise<void> {
  console.log("\n=== Phase 2: regulations (GDPR + SOC 2 → SMP) ===");

  // B2.1 — Create GDPR if missing (natural key: regulation_name exact match).
  let gdprId: number;
  const gdprExisting = await get(`/regulations?regulation_name=eq.GDPR%20%28General%20Data%20Protection%20Regulation%29&select=id`);
  if (gdprExisting.length > 0) {
    gdprId = Number(gdprExisting[0]!.id);
    console.log(`  GDPR already exists: id=${gdprId}`);
  } else {
    await insertRows("/regulations", [{
      regulation_name: "GDPR (General Data Protection Regulation)",
      regulation_code: "GDPR",
      regulation_type: "data_privacy",
      jurisdiction_id: EU_JURISDICTION_ID,
      issuing_body: "European Parliament and Council",
      effective_date: "2018-05-25",
      certification_required: false,
      regulation_url: "https://gdpr-info.eu/",
      description: "EU regulation governing personal-data processing, transfer, and data-subject rights. Articles 15-22 (access / erasure / portability), Article 28 (processor / subprocessor obligations), and Article 30 (records of processing activities) drive SaaS-management visibility requirements: which apps process personal data, which subprocessors are disclosed, and DSAR fulfillment across the SaaS portfolio.",
    }], "create GDPR regulation");
    if (DRY_RUN) {
      gdprId = -1;
    } else {
      const fresh = await get(`/regulations?regulation_code=eq.GDPR&select=id`);
      gdprId = Number(fresh[0]!.id);
      console.log(`  GDPR id=${gdprId}`);
    }
  }

  // B2.2 — Insert SMP↔GDPR and SMP↔SOC 2 domain_regulations rows.
  const linksToInsert: Row[] = [];

  const existingDomainRegs = await get(`/domain_regulations?domain_id=eq.${SMP_DOMAIN_ID}&regulation_id=in.(${gdprId === -1 ? "999999" : gdprId},${SOC2_REGULATION_ID})&select=regulation_id`);
  const existingRegIds = new Set(existingDomainRegs.map(r => Number(r.regulation_id)));

  if (gdprId !== -1 && !existingRegIds.has(gdprId)) {
    linksToInsert.push({
      domain_id: SMP_DOMAIN_ID,
      regulation_id: gdprId,
      applicability: "conditional",
    });
  } else if (gdprId === -1) {
    linksToInsert.push({
      domain_id: SMP_DOMAIN_ID,
      regulation_id: "<NEW_GDPR_ID>",
      applicability: "conditional",
    });
  }

  if (!existingRegIds.has(SOC2_REGULATION_ID)) {
    linksToInsert.push({
      domain_id: SMP_DOMAIN_ID,
      regulation_id: SOC2_REGULATION_ID,
      applicability: "recommended",
    });
  }

  await insertRows("/domain_regulations", linksToInsert, `${linksToInsert.length} domain_regulations rows`);
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log(DRY_RUN
    ? "MODE: dry-run (no writes). Re-run with --apply to execute."
    : "MODE: apply (writes will execute).");

  await phase1();
  await phase2();

  console.log("\n=== Summary ===");
  console.log("  Phase 1: 8 notes rows reverted to empty string (Rule #15 cleanup) — Bucket 2 #1.");
  console.log("  Phase 2: GDPR regulation created (if missing); SMP linked to GDPR (conditional) + SOC 2 (recommended) — Bucket 2 #2.");
  console.log("  Bucket 2 #3 (modularization): DEFERRED until Bucket 3 entities load.");
  console.log("  Bucket 2 #4 (pairwise IGA + S2P validates): QUEUED as separate runs.");
  console.log("\nUI:");
  console.log("  https://tests.semantius.app/domain_map/regulations");
  console.log("  https://tests.semantius.app/domain_map/domain_regulations");
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
