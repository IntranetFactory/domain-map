#!/usr/bin/env bun
// State-driven Validate execute for MSP-PSA (domain 131), 2026-06-07.
// Works only the open, agent-executable state items:
//   1. B1A-ENTITY-TYPE  : PATCH entity_type on the 5 masters (unclassified -> Rule #12 enum)
//   2. Catalog UX (R#20): author catalog_tagline + catalog_description on the domain + 4 modules
//   3. B1A-H1-TAGS       : INSERT handoff_processes on the 5 still-untagged handoffs
//
// Idempotent: reads live before each write, only writes what is missing / empty.
// Never overwrites a non-empty value. New rows omit record_status (defaults to 'new').

import {} from "bun";

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

// ============================================================
// 1. ENTITY-TYPE classification (B1A-ENTITY-TYPE)
// ============================================================
// msp_tickets/contracts/time_entries/invoices: multi-state, permission-gated
//   lifecycles -> operational_workflow.
// msp_clients: the customer/account master record (roster other entities point at);
//   light status lifecycle, canonical reference -> operational_record.
const entityTypes: Array<{ name: string; id: number; entity_type: string }> = [
  { name: "msp_tickets", id: 233, entity_type: "operational_workflow" },
  { name: "msp_contracts", id: 234, entity_type: "operational_workflow" },
  { name: "msp_time_entries", id: 235, entity_type: "operational_workflow" },
  { name: "msp_invoices", id: 236, entity_type: "operational_workflow" },
  { name: "msp_clients", id: 237, entity_type: "operational_record" },
];

async function fixEntityTypes(): Promise<number> {
  let patched = 0;
  const live = await get(
    `/data_objects?id=in.(${entityTypes.map(e => e.id).join(",")})&select=id,data_object_name,entity_type`,
  );
  const byId = new Map(live.map(r => [Number(r.id), r]));
  for (const e of entityTypes) {
    const cur = byId.get(e.id);
    if (!cur) {
      console.log(`  entity_type: data_object ${e.id} (${e.name}) not found, skipping`);
      continue;
    }
    const curType = cur.entity_type;
    if (curType !== null && curType !== "unclassified") {
      console.log(`  entity_type: ${e.name} already '${curType}', leaving`);
      continue;
    }
    await call({
      method: "PATCH",
      path: `/data_objects?id=eq.${e.id}`,
      body: { entity_type: e.entity_type },
    });
    console.log(`  entity_type: ${e.name} -> ${e.entity_type}`);
    patched++;
  }
  return patched;
}

// ============================================================
// 2. CATALOG UX (Rule #20): buyer-voice copy, no vendor names, no em-dash
// ============================================================
const domainCopy = {
  catalog_tagline: "Run a profitable managed-services book: tickets, contracts, time, and billing in one place.",
  catalog_description:
    "Built for the managed-service provider business model, this brings together customer estates, recurring service contracts, block-hour and value-based pricing, per-customer SLAs, ticket handling, time capture, invoicing, and technician scheduling. Service desks resolve customer issues against contracted SLAs, time entries flow into billing, contracts drive recurring revenue, and dispatch keeps the right technician on the right job, all with clean separation between each customer's data.",
};

const moduleCopy: Record<string, { catalog_tagline: string; catalog_description: string }> = {
  "MSP-PSA-SVC-DESK": {
    catalog_tagline: "Take in, triage, and resolve customer tickets against the SLAs you committed to.",
    catalog_description:
      "Capture issues from any channel, route them to the right technician, and work them through to resolution while the SLA clock tracks response and fix targets and pauses when a ticket is on hold. Every ticket ties back to the customer it belongs to and the time spent on it, so support effort stays visible and billable.",
  },
  "MSP-PSA-CONTRACTS": {
    catalog_tagline: "Manage customer accounts and the recurring service agreements that drive your revenue.",
    catalog_description:
      "Keep a clean roster of the customers you manage and the contracts that define their service, from draft through activation, suspension, and renewal. Contracts set the pricing model, block-hour entitlements, and SLA terms that the rest of the service delivery and billing work reads from, and renewal timing surfaces well before agreements lapse.",
  },
  "MSP-PSA-TIME-BILLING": {
    catalog_tagline: "Turn logged technician time into approved, billed, and paid invoices.",
    catalog_description:
      "Capture time against tickets and contracts, route it through approval, and roll approved effort plus contracted charges into invoices. Track each invoice from draft to issued, paid, overdue, or written off, so the work your team delivers is consistently and accurately billed.",
  },
  "MSP-PSA-DISPATCH": {
    catalog_tagline: "Schedule and assign the right technician to the right job at the right time.",
    catalog_description:
      "Coordinate technician workload across open tickets, matching skills and availability to the jobs that need attention and keeping scheduled work and on-site visits organized. Dispatch decisions feed straight into ticket handling and time capture so assignment, execution, and billing stay connected.",
  },
};

async function fixCatalogUx(): Promise<{ domain: number; modules: number }> {
  let domainPatched = 0;
  // Domain row
  const [domainRow] = await get(
    `/domains?id=eq.131&select=id,catalog_tagline,catalog_description`,
  );
  if (domainRow) {
    const body: Row = {};
    if (!domainRow.catalog_tagline) body.catalog_tagline = domainCopy.catalog_tagline;
    if (!domainRow.catalog_description) body.catalog_description = domainCopy.catalog_description;
    if (Object.keys(body).length > 0) {
      await call({ method: "PATCH", path: `/domains?id=eq.131`, body });
      console.log(`  catalog UX: domain 131 patched (${Object.keys(body).join(", ")})`);
      domainPatched = 1;
    } else {
      console.log(`  catalog UX: domain 131 already populated, leaving`);
    }
  }

  // Modules
  let modulesPatched = 0;
  const modules = await get(
    `/domain_modules?domain_id=eq.131&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  for (const m of modules) {
    const code = String(m.domain_module_code);
    const copy = moduleCopy[code];
    if (!copy) {
      console.log(`  catalog UX: no copy authored for module ${code}, skipping`);
      continue;
    }
    const body: Row = {};
    if (!m.catalog_tagline) body.catalog_tagline = copy.catalog_tagline;
    if (!m.catalog_description) body.catalog_description = copy.catalog_description;
    if (Object.keys(body).length > 0) {
      await call({ method: "PATCH", path: `/domain_modules?id=eq.${m.id}`, body });
      console.log(`  catalog UX: module ${code} patched (${Object.keys(body).join(", ")})`);
      modulesPatched++;
    } else {
      console.log(`  catalog UX: module ${code} already populated, leaving`);
    }
  }
  return { domain: domainPatched, modules: modulesPatched };
}

// ============================================================
// 3. APQC handoff tags (B1A-H1-TAGS): only the still-untagged 5
// ============================================================
// PCF ids pre-verified live this run:
//   295 Operate IT user support (20921), 312 Report time (10753),
//   1094 Maintain IT customer contracts (20637), 1312 Maintain IT asset records (20918)
const handoffTags: Array<{ handoff_id: number; process_id: number; label: string }> = [
  { handoff_id: 161, process_id: 1312, label: "MSP-PSA->HAM ticket.created / hardware_assets -> Maintain IT asset records" },
  { handoff_id: 1244, process_id: 295, label: "intra msp_ticket.created -> Operate IT user support" },
  { handoff_id: 1245, process_id: 312, label: "intra msp_time_entry.approved -> Report time" },
  { handoff_id: 1246, process_id: 1094, label: "intra msp_contract.activated -> Maintain IT customer contracts" },
  { handoff_id: 1247, process_id: 1094, label: "intra msp_contract.suspended -> Maintain IT customer contracts" },
];

async function fixHandoffTags(): Promise<number> {
  // Verify the handoffs exist and are not already tagged.
  const ids = handoffTags.map(t => t.handoff_id).join(",");
  const existingTags = await get(
    `/handoff_processes?handoff_id=in.(${ids})&select=handoff_id,process_id`,
  );
  const tagged = new Set(existingTags.map(t => `${t.handoff_id}`));
  const toInsert = handoffTags.filter(t => !tagged.has(`${t.handoff_id}`));
  if (toInsert.length === 0) {
    console.log(`  APQC tags: all ${handoffTags.length} target handoffs already tagged, nothing to insert`);
    return 0;
  }
  const body = toInsert.map(t => ({
    handoff_id: t.handoff_id,
    process_id: t.process_id,
    proposal_source: "agent_curated",
    role: "implements",
  }));
  await call({ method: "POST", path: "/handoff_processes", body });
  for (const t of toInsert) console.log(`  APQC tag: ${t.label}`);
  return toInsert.length;
}

// ============================================================
async function main() {
  console.log("== MSP-PSA state-driven execute 2026-06-07 ==");
  console.log("[1] entity_type classification");
  const etCount = await fixEntityTypes();
  console.log("[2] catalog UX (Rule #20)");
  const ux = await fixCatalogUx();
  console.log("[3] APQC handoff tags (H1)");
  const tagCount = await fixHandoffTags();

  console.log("\n== SUMMARY ==");
  console.log(`entity_type PATCHed       : ${etCount}`);
  console.log(`catalog UX domain PATCHed : ${ux.domain}`);
  console.log(`catalog UX modules PATCHed: ${ux.modules}`);
  console.log(`handoff_processes INSERTed: ${tagCount}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
