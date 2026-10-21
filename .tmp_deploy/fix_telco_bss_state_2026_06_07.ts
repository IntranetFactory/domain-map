#!/usr/bin/env bun
// State-driven Validate execute for TELCO-BSS (domain id 42), 2026-06-07.
// UNBUILT domain (0 domain_modules, 0 capability_domains) so the build cascade is LEFT.
// Executes only the module-independent additive/corrective items:
//   1. PATCH data_objects.entity_type on the 7 masters (B13 / Rule #12) where 'unclassified'.
//   2. PATCH domains.id=42 catalog_tagline + catalog_description (A4 / Rule #20) where empty.
//   3. INSERT domain_aliases generic synonyms (B1A-S12 / B11 domain grain).
//   4. INSERT data_object_aliases generic TM Forum SID synonyms on the 7 masters (B1B-S9 / B11).
// All writes land at record_status='new' (DB default; omitted). Idempotent: read live, write only missing.

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

function assertNoEmDash(label: string, ...vals: string[]) {
  for (const v of vals) {
    if (v.includes("—")) throw new Error(`em-dash (U+2014) found in ${label}: ${v}`);
  }
}

const DOMAIN_ID = 42;
const MASTERS = [653, 654, 655, 656, 657, 658, 659];

// ---- 1. entity_type classification (Rule #12) ----
const ENTITY_TYPES: Record<number, string> = {
  653: "catalog",              // telco_service_catalog: config/template referenced by orders
  654: "operational_workflow", // telco_service_orders
  655: "operational_workflow", // telco_subscriptions
  656: "operational_workflow", // service_provisioning_workflows
  657: "operational_workflow", // network_inventory_records (planned->deployed->decommissioned)
  658: "operational_workflow", // telco_customer_bills (draft->issued->paid|disputed|written_off)
  659: "operational_workflow", // service_trouble_tickets
};

// ---- 2. domain catalog UX copy (buyer voice; no vendor names; no em-dash; American English) ----
const CATALOG_TAGLINE =
  "Run the commercial and operational backbone of a communications service provider: publish service offers, capture and provision orders, manage subscriptions, bill customers, and resolve service trouble end to end.";
const CATALOG_DESCRIPTION =
  "Telecommunications OSS/BSS is where a carrier turns network capability into a sellable, billable, supportable service. Teams define the product and service catalog, take customer orders, orchestrate provisioning across network inventory, activate and change subscriptions, and rate and bill usage, all on a single operational spine. When something breaks, the same spine opens and tracks trouble tickets through to resolution.\n\n" +
  "Buy into this market when manual order handling, fragmented billing, and disconnected provisioning are slowing time to revenue and frustrating customers. The payoff is faster order-to-activation, accurate convergent charging, fewer revenue leaks, and a clear, auditable trail from offer to invoice to support case.\n\n" +
  "It connects outward to incident management for service trouble, to finance for invoicing and revenue recognition, and to customer service for subscription changes and care, so the order, the bill, and the support history all stay in sync.";

// ---- 3. domain_aliases (generic synonyms, no vendor names) ----
const DOMAIN_ALIASES = [
  "telco BSS",
  "telecom billing systems",
  "OSS BSS",
  "communications service provider platform",
  "convergent charging",
];

// ---- 4. data_object_aliases (generic TM Forum SID labels) ----
const DATA_OBJECT_ALIASES: Array<{ data_object_id: number; alias_name: string }> = [
  { data_object_id: 653, alias_name: "Product Offering Catalog" },
  { data_object_id: 655, alias_name: "Service Instance" },
  { data_object_id: 658, alias_name: "Customer Invoice" },
  { data_object_id: 659, alias_name: "Trouble Report" },
  { data_object_id: 657, alias_name: "Resource Inventory" },
];

async function main() {
  assertNoEmDash("catalog_tagline", CATALOG_TAGLINE);
  assertNoEmDash("catalog_description", CATALOG_DESCRIPTION);
  assertNoEmDash("domain_aliases", ...DOMAIN_ALIASES);
  assertNoEmDash("data_object_aliases", ...DATA_OBJECT_ALIASES.map(a => a.alias_name));

  // 1. entity_type --------------------------------------------------------
  console.log("== 1. entity_type (Rule #12) ==");
  const dobjs = await get(
    `/data_objects?id=in.(${MASTERS.join(",")})&select=id,data_object_name,entity_type`,
  );
  let etPatched = 0;
  for (const d of dobjs) {
    const id = Number(d.id);
    const want = ENTITY_TYPES[id];
    if (!want) continue;
    if (d.entity_type === "unclassified" || d.entity_type == null) {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: want });
      console.log(`  PATCH data_objects ${id} (${d.data_object_name}) entity_type -> ${want}`);
      etPatched++;
    } else {
      console.log(`  skip ${id} (${d.data_object_name}): already ${d.entity_type}`);
    }
  }
  console.log(`  entity_type patched: ${etPatched}`);

  // 2. domain catalog UX --------------------------------------------------
  console.log("== 2. domain catalog UX (Rule #20) ==");
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  const uxPatch: Row = {};
  if (!dom.catalog_tagline || String(dom.catalog_tagline).trim() === "") {
    uxPatch.catalog_tagline = CATALOG_TAGLINE;
  }
  if (!dom.catalog_description || String(dom.catalog_description).trim() === "") {
    uxPatch.catalog_description = CATALOG_DESCRIPTION;
  }
  if (Object.keys(uxPatch).length > 0) {
    await patch(`/domains?id=eq.${DOMAIN_ID}`, uxPatch);
    console.log(`  PATCH domains ${DOMAIN_ID} fields: ${Object.keys(uxPatch).join(", ")}`);
  } else {
    console.log("  skip: catalog_tagline + catalog_description already non-empty");
  }

  // 3. domain_aliases -----------------------------------------------------
  console.log("== 3. domain_aliases ==");
  const existingDA = await get(
    `/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=alias`,
  );
  const haveDA = new Set(existingDA.map(r => String(r.alias)));
  const missingDA = DOMAIN_ALIASES.filter(a => !haveDA.has(a)).map(a => ({
    domain_id: DOMAIN_ID,
    alias: a,
    label: a,
    alias_type: "synonym",
  }));
  if (missingDA.length > 0) {
    await call({ method: "POST", path: "/domain_aliases", body: missingDA });
    console.log(`  inserted ${missingDA.length} domain_aliases`);
  } else {
    console.log("  skip: all domain_aliases present");
  }

  // 4. data_object_aliases ------------------------------------------------
  console.log("== 4. data_object_aliases (TM Forum SID) ==");
  const existingDOA = await get(
    `/data_object_aliases?data_object_id=in.(${MASTERS.join(",")})&select=data_object_id,alias_name`,
  );
  const haveDOA = new Set(existingDOA.map(r => `${r.data_object_id}|${r.alias_name}`));
  const missingDOA = DATA_OBJECT_ALIASES.filter(
    a => !haveDOA.has(`${a.data_object_id}|${a.alias_name}`),
  ).map(a => ({
    data_object_id: a.data_object_id,
    alias_name: a.alias_name,
    alias_type: "synonym",
    is_preferred: false,
  }));
  if (missingDOA.length > 0) {
    await call({ method: "POST", path: "/data_object_aliases", body: missingDOA });
    console.log(`  inserted ${missingDOA.length} data_object_aliases`);
  } else {
    console.log("  skip: all data_object_aliases present");
  }

  console.log("\nDONE.");
  console.log("UI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(653,654,655,656,657,658,659)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.42");
  console.log("  https://tests.semantius.app/domain_map/domain_aliases?domain_id=eq.42");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(653,655,657,658,659)");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
