#!/usr/bin/env bun
// State-driven execute for LEGAL-PRACT-MGMT (2026-06-07).
// Three write types, all idempotent (read live, act only on what is still open):
//   1. B1A-ENTITY-TYPE: PATCH data_objects.entity_type = operational_workflow on the
//      6 LEGAL masters (each has a full lifecycle state machine -> operational_workflow).
//   2. B1A-H1-TAIL: INSERT handoff_processes for handoff 333 -> process 325 (clean L3 PCF).
//      Handoff 918 is already covered (row 991, process 1359) so it is skipped.
//   3. A4 / M8 catalog UX (Rule #20): author buyer-voice catalog_tagline + catalog_description
//      into the empty fields on domain 150 and modules 132-136. Never overwrite a non-empty value.

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

async function post(path: string, body: Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

// ============================================================
// 1. B1A-ENTITY-TYPE: classify the 6 LEGAL masters
// ============================================================
// All six carry a complete lifecycle state machine (initial + terminal + monotonic order
// + gated transitions) verified live, so each is operational_workflow per Rule #12.
const MASTER_IDS = [391, 392, 393, 394, 738, 739];

async function classifyEntityTypes(): Promise<number> {
  const rows = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const open = rows.filter(
    r => r.entity_type === null || r.entity_type === "unclassified",
  );
  let n = 0;
  for (const r of open) {
    await patch(`/data_objects?id=eq.${r.id}`, { entity_type: "operational_workflow" });
    console.log(`  entity_type -> operational_workflow on ${r.data_object_name} (${r.id})`);
    n++;
  }
  if (open.length === 0) console.log("  entity_type: all 6 masters already classified, nothing to do");
  return n;
}

// ============================================================
// 2. B1A-H1-TAIL: APQC tag on handoff 333
// ============================================================
const H1_TAGS = [
  { handoff_id: 333, process_id: 325 }, // trust_account.exception -> "Operate controls and monitor compliance..." 21574 L3
];

async function tagHandoffs(): Promise<number> {
  let n = 0;
  for (const t of H1_TAGS) {
    const existing = await get(
      `/handoff_processes?handoff_id=eq.${t.handoff_id}&select=id,process_id`,
    );
    if (existing.length > 0) {
      console.log(
        `  handoff ${t.handoff_id}: already has ${existing.length} handoff_processes row(s), skipping`,
      );
      continue;
    }
    const ins = await post("/handoff_processes", [
      {
        handoff_id: t.handoff_id,
        process_id: t.process_id,
        role: "implements",
        proposal_source: "agent_curated",
      },
    ]);
    console.log(
      `  handoff_processes inserted: handoff ${t.handoff_id} -> process ${t.process_id} (new id ${ins[0]?.id})`,
    );
    n++;
  }
  return n;
}

// ============================================================
// 3. A4 / M8 catalog UX: buyer-voice copy into empty fields only
// ============================================================
const DOMAIN_COPY = {
  id: 150,
  catalog_tagline:
    "Run your whole law firm in one place, from client intake and conflict clearance through matters, billable time, trust accounting, and court deadlines.",
  catalog_description:
    "Manage every matter across its full life, from the first intake conversation and conflict check to the day the file is closed and archived. Track the people involved, the key dates that cannot be missed, and the documents tied to each case in one shared workspace.\n\nCapture billable time against standardized task and expense codes, build prebills your partners can review, and send invoices in the electronic-billing formats your clients require. Keep client funds in separated trust ledgers with three-way reconciliation, automatic transfers when fees are earned, and the exception reporting your state bar expects.\n\nClear conflicts before you take on a new client, generate engagement letters from templates, collect retainers, and calendar court deadlines from jurisdiction rules so statutes of limitations and filing dates are never left to memory.",
};

const MODULE_COPY: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  132: {
    catalog_tagline:
      "Open, run, and close every matter with the parties, key dates, and documents that belong to it in one organized file.",
    catalog_description:
      "Move each matter cleanly from intake to active to closed and archived, with the status of every case visible at a glance. Keep the clients, opposing parties, co-counsel, and courts attached to each matter so everyone knows who is involved.\n\nTrack the deadlines and statute-of-limitations dates that carry the most risk, store the documents tied to each case alongside the work, and give every other part of the practice a single matter record to build on.",
  },
  133: {
    catalog_tagline:
      "Clear conflicts, sign the engagement letter, and collect the retainer before a new client ever becomes a matter.",
    catalog_description:
      "Capture new-client details through intake forms, then run a conflict-of-interest search across your existing matters and adversaries so you can decline, clear, or waive before you commit. Record conflict waivers and ethics-wall arrangements as part of the file.\n\nDraft engagement letters from templates, send them for signature, and collect the opening retainer, then convert a cleared intake into a live matter without rekeying anything.",
  },
  134: {
    catalog_tagline:
      "Capture every billable minute, review prebills, and send client-ready invoices in the formats your clients demand.",
    catalog_description:
      "Record time against standardized legal task and expense codes whether you bill by the hour, a flat fee, contingency, or an alternative fee arrangement. Roll entries into prebills your partners can review and adjust before anything reaches the client.\n\nIssue invoices, submit them in the electronic-billing formats large clients require, and follow outstanding balances through accounts-receivable aging so the firm gets paid on time.",
  },
  135: {
    catalog_tagline:
      "Hold client money safely in separated trust ledgers with three-way reconciliation and the exception reporting your bar expects.",
    catalog_description:
      "Keep every client and matter balance in a dedicated trust ledger that stays separate from operating funds, and reconcile bank, ledger, and client balances three ways so the books always agree.\n\nDeposit retainers into trust, transfer earned fees out to the operating account only when they are actually earned, apply the retention rules your state imposes, and surface reconciliation exceptions for review before they become a compliance problem.",
  },
  136: {
    catalog_tagline:
      "Calendar court deadlines from jurisdiction rules so filing dates and statutes of limitations are never left to memory.",
    catalog_description:
      "Capture and submit court filings, then let jurisdiction-specific rules calculate the deadlines that follow so the calendar fills itself instead of relying on someone remembering. Track statute-of-limitations and other key dates with alerts well ahead of time.\n\nFollow service of process and connect to electronic court filing so submissions and confirmations flow into the matter file without manual re-entry.",
  },
};

async function authorCatalogUX(): Promise<{ domain: number; modules: number }> {
  let domainWrites = 0;
  let moduleWrites = 0;

  // Domain
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_COPY.id}&select=id,catalog_tagline,catalog_description`,
  );
  const domBody: Row = {};
  if (!dom?.catalog_tagline || String(dom.catalog_tagline).trim() === "")
    domBody.catalog_tagline = DOMAIN_COPY.catalog_tagline;
  if (!dom?.catalog_description || String(dom.catalog_description).trim() === "")
    domBody.catalog_description = DOMAIN_COPY.catalog_description;
  if (Object.keys(domBody).length > 0) {
    await patch(`/domains?id=eq.${DOMAIN_COPY.id}`, domBody);
    console.log(`  domain 150 catalog UX written: ${Object.keys(domBody).join(", ")}`);
    domainWrites = 1;
  } else {
    console.log("  domain 150 catalog UX: both fields already non-empty, skipping");
  }

  // Modules
  const modIds = Object.keys(MODULE_COPY).map(Number);
  const mods = await get(
    `/domain_modules?id=in.(${modIds.join(",")})&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  for (const m of mods) {
    const copy = MODULE_COPY[Number(m.id)];
    if (!copy) continue;
    const body: Row = {};
    if (!m.catalog_tagline || String(m.catalog_tagline).trim() === "")
      body.catalog_tagline = copy.catalog_tagline;
    if (!m.catalog_description || String(m.catalog_description).trim() === "")
      body.catalog_description = copy.catalog_description;
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, body);
      console.log(
        `  module ${m.id} (${m.domain_module_code}) catalog UX written: ${Object.keys(body).join(", ")}`,
      );
      moduleWrites++;
    } else {
      console.log(`  module ${m.id} (${m.domain_module_code}) catalog UX: already non-empty, skipping`);
    }
  }
  return { domain: domainWrites, modules: moduleWrites };
}

// ============================================================
// main
// ============================================================
async function main() {
  console.log("== 1. B1A-ENTITY-TYPE ==");
  const etCount = await classifyEntityTypes();

  console.log("== 2. B1A-H1-TAIL (APQC) ==");
  const h1Count = await tagHandoffs();

  console.log("== 3. A4 / M8 catalog UX ==");
  const ux = await authorCatalogUX();

  console.log("\n== SUMMARY ==");
  console.log(`  entity_type PATCHed: ${etCount}`);
  console.log(`  handoff_processes inserted: ${h1Count}`);
  console.log(`  domain catalog UX written: ${ux.domain}`);
  console.log(`  module catalog UX written: ${ux.modules}`);
}

await main();
