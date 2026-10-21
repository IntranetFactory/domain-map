#!/usr/bin/env bun
// State-driven FSM (domain_id=31) Validate-mode execute pass, 2026-06-07.
// Works ONLY the EXECUTE-classified open items from audits/FSM/state.yaml:
//   1. B1A-ENTITY-TYPE: PATCH entity_type='operational_workflow' on the 7 FSM masters
//      (all live carry 'unclassified'; all have real multi-state lifecycles).
//   2. Catalog UX (Rule #20): author + write catalog_tagline + catalog_description on
//      the FSM domain row (31) and the 4 FSM-hosted modules (161/162/163/171).
//      NEVER overwrites a non-empty value.
//   3. B1A-V2: INSERT 3 consumer DMDOs on FSM-DISPATCH-OPS (161) for UTIL-OPS payloads
//      (utility_service_orders 666, utility_assets 664, meter_reads 662).
//   4. B1A-V3 residual: INSERT 1 handoff_processes APQC tag on handoff 945
//      (meter_read.anomalous) -> process 828 "Report maintenance issues" (10319 L4),
//      the sibling-consistent clean PCF match (941 already carries 828). 1261 already tagged.
//
// Idempotent: reads live before every write, inserts only missing, never overwrites non-empty.
// record_status omitted (defaults to 'new'). notes never written (Rule #15).

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
const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });

// ------------------------------------------------------------------
// 1. entity_type on the 7 FSM masters -> operational_workflow
// ------------------------------------------------------------------
const MASTER_IDS = [740, 261, 262, 819, 820, 821, 741];
{
  const live = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const toFix = live.filter(
    r => r.entity_type === "unclassified" || r.entity_type === null,
  );
  if (toFix.length > 0) {
    const ids = toFix.map(r => Number(r.id));
    await patch(`/data_objects?id=in.(${ids.join(",")})`, {
      entity_type: "operational_workflow",
    });
    console.log(
      `entity_type: PATCHed ${ids.length} masters -> operational_workflow (${toFix
        .map(r => r.data_object_name)
        .join(", ")})`,
    );
  } else {
    console.log("entity_type: all 7 masters already classified, nothing to do");
  }
}

// ------------------------------------------------------------------
// 2. Catalog UX (Rule #20) on domain 31 + 4 modules. Never overwrite non-empty.
// ------------------------------------------------------------------
const domainCopy = {
  catalog_tagline:
    "Schedule, dispatch, and complete on-site service work while keeping equipment, contracts, and customer commitments in sync.",
  catalog_description:
    "Field service management runs the full loop from a service request to a closed visit. Dispatchers match the right technician, parts, and time slot to each job; technicians work the route, capture what happened on site, and close out the work order. The installed-equipment record, preventive-maintenance schedules, and service contracts stay current so the next visit starts with full context. Teams that adopt it cut travel and idle time, hit service-level commitments, and turn every completed visit into accurate billing and a cleaner equipment history.",
};

const moduleCopy: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  161: {
    catalog_tagline:
      "Turn inbound service requests into scheduled, dispatched, and completed work orders with the right technician on the job.",
    catalog_description:
      "The dispatch operations module is the desk-and-truck heart of field service. It takes work orders from intake to close: scheduling the visit, assigning a technician, tracking the dispatch from en route to on site, and recording the field visit outcome. Dispatchers see capacity, skills, and travel at a glance so they commit only to jobs they can deliver, and technicians get a clear day plan. The payoff is fewer missed appointments, shorter drive time, and clean completion data that feeds billing and customer follow-up.",
  },
  162: {
    catalog_tagline:
      "Keep a living record of every installed unit and its preventive-maintenance schedule across each customer site.",
    catalog_description:
      "The installed base module is the system of record for equipment in the field. Each unit is tracked from install through active service, maintenance, and eventual decommission or replacement, tied to the customer site where it lives. Preventive-maintenance schedules drive proactive visits before something breaks, and overdue work surfaces automatically. Service teams gain a complete asset history that shortens diagnosis on the next call, protects warranty and contract coverage, and turns reactive break-fix into planned, recurring service revenue.",
  },
  163: {
    catalog_tagline:
      "Manage service contracts and coverage so every visit is billed and every entitlement is honored.",
    catalog_description:
      "The service contracts module governs the agreements that sit behind field work. Contracts move from draft to active to renewal or expiry, and each one defines what coverage a customer is entitled to and how visits get priced and billed. Tying contracts to the installed equipment they cover means dispatch knows whether a job is in-scope, and finance knows what to invoice. Teams reduce revenue leakage from uncovered work, renew on time instead of letting coverage lapse, and give customers a clear picture of what their agreement includes.",
  },
  171: {
    catalog_tagline:
      "A ready-to-run home-services starter that takes an HVAC job from customer call to scheduled visit and invoice.",
    catalog_description:
      "This starter packages the field-service essentials a heating and cooling service business needs on day one. It bundles the customer and contact record, the installed equipment at each site, work orders and field visits, service contracts, and the quote-to-invoice path so a small team can book a call, schedule a technician, complete the job, and bill it without stitching tools together. It is a fast on-ramp to field service for trades operators who want the core workflow working immediately and can grow into the full modules later.",
  },
};

async function backfillCatalog(
  path: string,
  copy: { catalog_tagline: string; catalog_description: string },
  whoLabel: string,
): Promise<void> {
  const [row] = await get(`${path}&select=catalog_tagline,catalog_description`);
  if (!row) {
    console.log(`catalog: ${whoLabel} not found, skipping`);
    return;
  }
  const body: Row = {};
  if (!row.catalog_tagline || String(row.catalog_tagline).trim() === "") {
    body.catalog_tagline = copy.catalog_tagline;
  }
  if (!row.catalog_description || String(row.catalog_description).trim() === "") {
    body.catalog_description = copy.catalog_description;
  }
  if (Object.keys(body).length === 0) {
    console.log(`catalog: ${whoLabel} already populated, nothing to do`);
    return;
  }
  await patch(path, body);
  console.log(`catalog: ${whoLabel} backfilled (${Object.keys(body).join(", ")})`);
}

await backfillCatalog("/domains?id=eq.31", domainCopy, "domain FSM (31)");
for (const [idStr, copy] of Object.entries(moduleCopy)) {
  await backfillCatalog(
    `/domain_modules?id=eq.${idStr}`,
    copy,
    `module ${idStr}`,
  );
}

// ------------------------------------------------------------------
// 3. B1A-V2: 3 consumer DMDOs on FSM-DISPATCH-OPS (161) for UTIL-OPS payloads.
//    utility_service_orders 666, utility_assets 664, meter_reads 662.
// ------------------------------------------------------------------
{
  const want = [
    { domain_module_id: 161, data_object_id: 666, role: "consumer", necessity: "optional" },
    { domain_module_id: 161, data_object_id: 664, role: "consumer", necessity: "optional" },
    { domain_module_id: 161, data_object_id: 662, role: "consumer", necessity: "optional" },
  ];
  const live = await get(
    `/domain_module_data_objects?domain_module_id=eq.161&data_object_id=in.(662,664,666)&select=data_object_id`,
  );
  const have = new Set(live.map(r => Number(r.data_object_id)));
  const missing = want.filter(w => !have.has(w.data_object_id));
  if (missing.length > 0) {
    await post("/domain_module_data_objects", missing);
    console.log(
      `DMDO B1A-V2: INSERTed ${missing.length} consumer rows on 161 (data_object_id ${missing
        .map(m => m.data_object_id)
        .join(", ")})`,
    );
  } else {
    console.log("DMDO B1A-V2: all 3 consumer rows already present, nothing to do");
  }
}

// ------------------------------------------------------------------
// 4. B1A-V3 residual: APQC tag on handoff 945 -> process 828.
// ------------------------------------------------------------------
{
  const live = await get(
    `/handoff_processes?handoff_id=eq.945&process_id=eq.828&select=id`,
  );
  if (live.length === 0) {
    await post("/handoff_processes", [
      { handoff_id: 945, process_id: 828, role: "implements", proposal_source: "agent_curated" },
    ]);
    console.log("handoff_processes B1A-V3: INSERTed tag 945 -> 828 (agent_curated)");
  } else {
    console.log("handoff_processes B1A-V3: 945 -> 828 already present, nothing to do");
  }
}

console.log("\nDONE. FSM state-driven execute pass complete.");
