#!/usr/bin/env bun
// apply_stable_permission_fixes_2026_11_04.ts
//
// Owner-approved 2026-11-04, each item by name. Follow-ups to the two-master fix, and the remaining
// catalog fixes in plans/stable-permission-names-plan.md (F1, F2, F3, F5, F6).
//
// Default mode is dry-run. Pass --execute to write. Safe to re-run: inserts look up their natural
// key first, and an overwrite refuses to run if the live value is neither the before nor the after.
//
// Usage (from the project root):
//   bun run .tmp_deploy/apply_stable_permission_fixes_2026_11_04.ts
//   bun run .tmp_deploy/apply_stable_permission_fixes_2026_11_04.ts --execute

export {};

import { existsSync, writeFileSync } from "node:fs";
import { argv } from "node:process";

const EXECUTE = argv.includes("--execute");
const BACKUP = "backups/stable-permission-fixes-2026-11-04.json";
console.log(`mode: ${EXECUTE ? "EXECUTE (writes)" : "DRY-RUN (no writes)"}\n`);

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}
const get = (path: string): Promise<any[]> => postgrest("GET", path);

const INCENTIVE_AWARDS = 1482;

// ----- additive holdings -----
const NEW_HOLDINGS = [
  { tag: "F1a", label: "CLM-NEGOTIATION / legal_contracts", module: 126, object: 66, held_as: "embedded_master", optional: false },
  { tag: "F1b", label: "CLM-RENEWAL / legal_contracts", module: 129, object: 66, held_as: "embedded_master", optional: false },
  { tag: "F1c", label: "ATS-PRE-EMPLOYEE-RECORD / job_applications", module: 8, object: 4, held_as: "embedded_master", optional: false },
  { tag: "F2a", label: "LMS-COMPLIANCE-TRAINING / dpo_training_acknowledgments", module: 33, object: 1284, held_as: "master", optional: true },
  { tag: "F2b", label: "LMS-COMPLIANCE-TRAINING / pci_dss_awareness_records", module: 33, object: 1285, held_as: "master", optional: true },
  { tag: "q20", label: "ATS-OFFERS / incentive_awards", module: 6, object: INCENTIVE_AWARDS, held_as: "consumer", optional: true },
];

// ----- overwrites, as table + id + the exact before and after of each column -----
const TAGLINE_FROM = "Grant equity and incentive awards, then track them from proposal through vesting.";
const TAGLINE_TO = "Decide bonus, commission, and equity awards, then track each from proposal to payout.";
const COPY_FROM =
  "Propose equity and incentive awards as part of total rewards, approve them, and follow each grant through vesting, exercise, forfeiture, and expiration. Keep award terms, schedules, and statuses in one place so finance, payroll, and your people all see the same numbers. Give your team a clean record of every long-term incentive you have promised.";
const COPY_TO =
  "Propose bonus, commission, and equity awards as part of total rewards, approve them, and follow each one until it is paid or issued. Keep award amounts, terms, and statuses in one place so finance, payroll, and your people all see the same numbers. Give your team a clean record of every incentive you have promised.";

const OLD_PERMISSION = "hiring-starter:view_all_candidates";
const NEW_PERMISSION = "ats-candidate-crm:view_all_candidates";
const [hiringStarter] = await get("/domain_modules?id=eq.154&select=specification_requirements");
const specFrom: string = hiringStarter.specification_requirements;
const specTo = specFrom.replaceAll(OLD_PERMISSION, NEW_PERMISSION);

type Overwrite = { tag: string; table: string; id: number; from: Row; to: Row };
const OVERWRITES: Overwrite[] = [
  { tag: "q22", table: "domain_module_data_objects", id: 416, from: { held_as: "contributor" }, to: { held_as: "consumer" } },
  { tag: "FSQM q17", table: "domain_module_data_objects", id: 1396, from: { held_as: "contributor" }, to: { held_as: "embedded_master" } },
  {
    tag: "q20",
    table: "data_object_relationships",
    id: 1332,
    from: { related_data_object_id: 158, data_object_relationship_label: "offer_versions proposes equity_grants" },
    to: { related_data_object_id: INCENTIVE_AWARDS, data_object_relationship_label: "offer_versions proposes incentive_awards" },
  },
  { tag: "q21", table: "domain_module_capabilities", id: 153, from: { notes: "Grant, vesting, and exercise lifecycle." }, to: { notes: "Equity award decisions and cap-table integration." } },
  { tag: "q19", table: "domain_modules", id: 79, from: { catalog_tagline: TAGLINE_FROM, catalog_description: COPY_FROM }, to: { catalog_tagline: TAGLINE_TO, catalog_description: COPY_TO } },
  { tag: "F3", table: "domain_module_data_objects", id: 248, from: { held_as: "embedded_master" }, to: { held_as: "master" } },
  { tag: "F5a", table: "domain_module_data_objects", id: 619, from: { held_as: "consumer" }, to: { held_as: "embedded_master" } },
  { tag: "F5b", table: "domain_module_data_objects", id: 620, from: { held_as: "consumer" }, to: { held_as: "embedded_master" } },
  { tag: "F5c", table: "domain_module_data_objects", id: 712, from: { held_as: "consumer" }, to: { held_as: "embedded_master" } },
  { tag: "F6", table: "domain_modules", id: 154, from: { specification_requirements: specFrom }, to: { specification_requirements: specTo } },
];

// ----- current state, and refuse on drift -----
const before: Row[] = [];
const drift: string[] = [];
const pending: Overwrite[] = [];
for (const o of OVERWRITES) {
  const columns = Object.keys(o.from).join(",");
  const [live] = await get(`/${o.table}?id=eq.${o.id}&select=id,${columns}`);
  if (!live) {
    drift.push(`${o.tag}: ${o.table} ${o.id} not found`);
    continue;
  }
  before.push({ table: o.table, ...live });
  const isBefore = Object.keys(o.from).every((c) => live[c] === o.from[c]);
  const isAfter = Object.keys(o.to).every((c) => live[c] === o.to[c]);
  if (!isBefore && !isAfter) drift.push(`${o.tag}: ${o.table} ${o.id} is ${JSON.stringify(live)}`);
  if (!isAfter) pending.push(o);
}
if (!specFrom.includes(OLD_PERMISSION) && !specFrom.includes(NEW_PERMISSION)) drift.push("F6: specification_requirements names neither permission");
const missingHoldings: typeof NEW_HOLDINGS = [];
for (const h of NEW_HOLDINGS) {
  const found = await get(`/domain_module_data_objects?domain_module_id=eq.${h.module}&data_object_id=eq.${h.object}&select=id,held_as`);
  if (found.length && found[0].held_as !== h.held_as) drift.push(`${h.tag}: ${h.label} already exists as ${found[0].held_as}`);
  if (!found.length) missingHoldings.push(h);
}
if (drift.length) {
  console.error("DRIFT, nothing written:\n" + drift.map((d) => `  ${d}`).join("\n"));
  process.exit(1);
}

// ----- plan -----
console.log(`new holdings to add: ${missingHoldings.length}`);
for (const h of missingHoldings) console.log(`  ${h.tag} ${h.label}: ${h.held_as}${h.optional ? ", optional" : ""}`);
console.log(`overwrites to apply: ${pending.length}`);
for (const o of pending) console.log(`  ${o.tag} ${o.table} ${o.id}: ${Object.keys(o.to).join(", ")}`);

if (!EXECUTE) {
  console.log("\nDry-run only. Re-run with --execute to write.");
  process.exit(0);
}

// ----- backup, first run only -----
if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), loader: ".tmp_deploy/apply_stable_permission_fixes_2026_11_04.ts", before }, null, 1));
  console.log(`\nbackup: ${BACKUP}`);
}

// ----- additive first -----
for (const h of missingHoldings) {
  await postgrest("POST", "/domain_module_data_objects", { domain_module_data_object_label: h.label, domain_module_id: h.module, data_object_id: h.object, held_as: h.held_as, is_install_optional: h.optional, notes: "" });
  console.log(`  added ${h.label}`);
}
for (const o of pending) {
  await postgrest("PATCH", `/${o.table}?id=eq.${o.id}`, o.to);
  console.log(`  overwrote ${o.tag} ${o.table} ${o.id}`);
}

// ----- verify from live -----
for (const o of OVERWRITES) {
  const columns = Object.keys(o.to).join(",");
  const [live] = await get(`/${o.table}?id=eq.${o.id}&select=${columns}`);
  const ok = Object.keys(o.to).every((c) => live[c] === o.to[c]);
  if (!ok) console.error(`  MISMATCH ${o.tag} ${o.table} ${o.id}`);
}
const noMaster = await get("/domain_module_data_objects?data_object_id=in.(425,1284,1285)&held_as=eq.master&select=domain_module_data_object_label");
console.log("\nmasters now on F2 and F3 entities:");
for (const m of noMaster) console.log(`  ${m.domain_module_data_object_label}`);
