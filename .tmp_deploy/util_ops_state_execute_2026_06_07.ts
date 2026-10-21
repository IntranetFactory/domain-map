#!/usr/bin/env bun
// UTIL-OPS state-driven Validate execute (2026-06-07).
// Executes only the non-module-gated additive/corrective items from
// audits/UTIL-OPS/state.yaml. The domain is UNBUILT (0 modules, 0 capabilities),
// so the whole module cascade (B1B-S1 + dependents) is LEFT for the build.
//
// Items executed here:
//   1. entity_type PATCH (B13 / Rule #12): 8 masters unclassified -> operational_workflow
//   2. Catalog UX (Rule #20): domain 49 catalog_tagline + catalog_description (both empty)
//   3. business_function_domains (C1): 4 clean RACI rows on the 20-function spine
//   4. data_object_aliases (B11): industry_term synonyms on the 8 masters (industry_id 7)
//
// Idempotent: reads live before every write; only inserts missing / patches still-empty.
// All inserts land at record_status default ('new'); no approved/pending stamping.

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

const get = (path: string) => call({ method: "GET", path });

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

const DOMAIN_ID = 49;
const INDUSTRY_ID = 7; // Utilities
const MASTER_IDS = [660, 661, 662, 663, 664, 665, 666, 667];

// ============================================================
// 1. entity_type PATCH (B13 / Rule #12)
// ============================================================
// All 8 masters are workflow-bearing per their descriptions + the B1B-S11
// state machines (e.g. utility_bills draft->posted->issued->paid->overdue->cancelled).
// Every one classifies as operational_workflow.
async function patchEntityTypes(): Promise<number> {
  const live = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const toPatch = live.filter(
    r => r.entity_type === "unclassified" || r.entity_type === null,
  );
  let n = 0;
  for (const r of toPatch) {
    await call({
      method: "PATCH",
      path: `/data_objects?id=eq.${r.id}`,
      body: { entity_type: "operational_workflow" },
    });
    console.log(`  entity_type: ${r.data_object_name} (${r.id}) -> operational_workflow`);
    n++;
  }
  if (n === 0) console.log("  entity_type: all 8 masters already classified, nothing to patch");
  return n;
}

// ============================================================
// 2. Catalog UX (Rule #20) on the domain row
// ============================================================
// Buyer-voice copy: workflow + value, no vendor/product names, no em-dash, American English.
const CATALOG_TAGLINE =
  "Run meter-to-cash, outage response, and field work for electric, gas, and water utilities from one operational backbone.";
const CATALOG_DESCRIPTION =
  "Operate the full utility service lifecycle in one place: open and manage customer accounts and service connections, capture and validate meter reads, rate and issue bills, and keep cash flowing. When the grid goes down, declare and track outages, dispatch crews, and restore service while keeping customers informed. Plan and execute connect, disconnect, and field work against your network assets, and surface the reliability and revenue signals regulators and operations leaders depend on. Built for the operational reality of electric, gas, and water utilities so teams spend less time stitching systems together and more time keeping the lights, gas, and water on.";

async function patchCatalogCopy(): Promise<number> {
  const [d] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!d) throw new Error(`domain ${DOMAIN_ID} not found`);
  const body: Row = {};
  if (!d.catalog_tagline || String(d.catalog_tagline).trim() === "") {
    body.catalog_tagline = CATALOG_TAGLINE;
  }
  if (!d.catalog_description || String(d.catalog_description).trim() === "") {
    body.catalog_description = CATALOG_DESCRIPTION;
  }
  if (Object.keys(body).length === 0) {
    console.log("  catalog UX: tagline + description already populated, nothing to write");
    return 0;
  }
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body });
  console.log(`  catalog UX: wrote ${Object.keys(body).join(" + ")} on domain ${DOMAIN_ID}`);
  return Object.keys(body).length;
}

// ============================================================
// 3. business_function_domains (C1) RACI rows
// ============================================================
// Owner (Business Operations id 34) already exists (row 258). Add the clean spine matches.
// Engineering / Asset Mgmt contributor has no clean 20-function-spine match -> SURFACED, not written.
const DOMAIN_LABEL = "Utilities Operations";
const RACI_ROWS = [
  { business_function_id: 51, function_name: "Field Service Operations", responsibility_type: "contributor" },
  { business_function_id: 24, function_name: "Customer Service", responsibility_type: "contributor" },
  { business_function_id: 4, function_name: "Finance", responsibility_type: "consumer" },
  { business_function_id: 31, function_name: "Governance, Risk and Compliance", responsibility_type: "consumer" },
];

async function insertRaci(): Promise<number> {
  const live = await get(
    `/business_function_domains?domain_id=eq.${DOMAIN_ID}&select=business_function_id,responsibility_type`,
  );
  const existing = new Set(live.map(r => `${r.business_function_id}|${r.responsibility_type}`));
  const missing = RACI_ROWS.filter(
    r => !existing.has(`${r.business_function_id}|${r.responsibility_type}`),
  ).map(r => ({
    domain_id: DOMAIN_ID,
    business_function_id: r.business_function_id,
    responsibility_type: r.responsibility_type,
    business_function_domain_label: `${r.function_name} / ${DOMAIN_LABEL}`,
  }));
  if (missing.length === 0) {
    console.log("  RACI: all 4 contributor/consumer rows already present");
    return 0;
  }
  await insert("/business_function_domains", missing);
  for (const m of missing) console.log(`  RACI: ${m.business_function_domain_label} (${m.responsibility_type})`);
  return missing.length;
}

// ============================================================
// 4. data_object_aliases (B11) industry_term synonyms
// ============================================================
// Generic utility-industry lexicon (Rule #18: no vendor/product names; generic synonyms only).
// alias_type='industry_term' with industry_id=7 (Utilities) since these are industry-conditional.
const ALIASES: Record<number, string[]> = {
  660: ["Service Agreement", "Premises Account", "Customer Account", "Service Point Customer"], // utility_customer_accounts
  661: ["Smart Meter", "Endpoint", "AMI Endpoint", "Metering Device"], // utility_meters
  662: ["Interval Read", "Register Read", "VEE Reading", "Consumption Record"], // meter_reads
  663: ["Service Point", "Point of Delivery", "Service Location", "Premises Connection"], // service_connections
  664: ["Network Asset", "Plant Equipment", "Distribution Asset", "Compatible Unit"], // utility_assets
  665: ["Trouble Ticket", "Outage Case", "Service Interruption", "Power Outage"], // outage_events
  666: ["Field Order", "Service Investigation", "Field Activity", "Connection Work Request"], // utility_service_orders
  667: ["Statement", "Charge Statement", "Bill Determinant Result", "Consumption Invoice"], // utility_bills
};

async function insertAliases(): Promise<number> {
  const live = await get(
    `/data_object_aliases?data_object_id=in.(${MASTER_IDS.join(",")})&select=data_object_id,alias_name`,
  );
  const existing = new Set(live.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`));
  const rows: Row[] = [];
  for (const [doidStr, names] of Object.entries(ALIASES)) {
    const doid = Number(doidStr);
    for (const name of names) {
      if (existing.has(`${doid}|${name.toLowerCase()}`)) continue;
      rows.push({
        data_object_id: doid,
        alias_name: name,
        alias_type: "industry_term",
        industry_id: INDUSTRY_ID,
        is_preferred: false,
      });
    }
  }
  if (rows.length === 0) {
    console.log("  aliases: all enumerated synonyms already present");
    return 0;
  }
  await insert("/data_object_aliases", rows);
  console.log(`  aliases: inserted ${rows.length} industry_term rows across 8 masters`);
  return rows.length;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("UTIL-OPS state-driven execute (2026-06-07)\n");

  console.log("1. entity_type PATCH (B13 / Rule #12):");
  const nEntity = await patchEntityTypes();

  console.log("\n2. Catalog UX (Rule #20):");
  const nCatalog = await patchCatalogCopy();

  console.log("\n3. business_function_domains RACI (C1):");
  const nRaci = await insertRaci();

  console.log("\n4. data_object_aliases (B11):");
  const nAlias = await insertAliases();

  console.log("\n=== SUMMARY ===");
  console.log(`  entity_type patched:      ${nEntity}`);
  console.log(`  catalog fields written:   ${nCatalog}`);
  console.log(`  RACI rows inserted:       ${nRaci}`);
  console.log(`  alias rows inserted:      ${nAlias}`);

  console.log("\n=== UI LINKS ===");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(660,661,662,663,664,665,666,667)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.49");
  console.log("  https://tests.semantius.app/domain_map/business_function_domains?domain_id=eq.49");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(660,661,662,663,664,665,666,667)");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
