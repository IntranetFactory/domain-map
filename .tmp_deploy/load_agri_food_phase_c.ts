#!/usr/bin/env bun
// Phase C loader for Agriculture & Food Systems wedge:
//   business_function_domains rows (RACI per market) for the 5 new domains
//
// 19 rows total — light load.
// Idempotent: dedupes on (domain_id, business_function_id, responsibility_type).

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
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}\nbody=${JSON.stringify(body).slice(0, 500)}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return await call({ method: "POST", path, body: rows });
}

// ============================================================
// BUSINESS_FUNCTION_DOMAINS
// ============================================================
type BFD = { domain_code: string; business_function_name: string; responsibility_type: string; notes: string };

const businessFunctionDomains: BFD[] = [
  // FMIS — farm-operations-driven; supply-chain + procurement contribute; finance consumes
  { domain_code: "FMIS", business_function_name: "Business Operations", responsibility_type: "owner", notes: "Farm operations leads (production managers, agronomists, farm managers) run FMIS. No dedicated 'farm operations' function in the canonical spine — Business Operations is the closest fit." },
  { domain_code: "FMIS", business_function_name: "Supply Chain", responsibility_type: "contributor", notes: "Harvest-side logistics, grain-handling, and outbound shipping integrate with FMIS." },
  { domain_code: "FMIS", business_function_name: "Procurement", responsibility_type: "contributor", notes: "Ag-input procurement (seed / fertiliser / chemicals) feeds FMIS input-inventory and reconciles applications against purchases." },
  { domain_code: "FMIS", business_function_name: "Finance", responsibility_type: "consumer", notes: "Cost-of-production analytics, per-field profitability, and FP&A forecasts read from FMIS." },

  // FOOD-TRACE — compliance-driven owner; supply-chain executes recalls; procurement manages supplier certs; executive consumes recall events
  { domain_code: "FOOD-TRACE", business_function_name: "Governance, Risk and Compliance", responsibility_type: "owner", notes: "FSMA 204 / EU 1169 / SFCR compliance is the primary driver; the system-of-record for regulatory traceability obligations." },
  { domain_code: "FOOD-TRACE", business_function_name: "Supply Chain", responsibility_type: "contributor", notes: "Recall execution, inventory hold-and-segregate, downstream notification — operationally executed by supply-chain." },
  { domain_code: "FOOD-TRACE", business_function_name: "Procurement", responsibility_type: "contributor", notes: "Supplier-certification document lifecycle (collection, renewal, expiry tracking) is procurement-driven." },
  { domain_code: "FOOD-TRACE", business_function_name: "Executive", responsibility_type: "consumer", notes: "Recall events surface to leadership for brand-impact assessment and crisis communication." },

  // DAIRY-MGMT — dairy-operations-owned
  { domain_code: "DAIRY-MGMT", business_function_name: "Business Operations", responsibility_type: "owner", notes: "Dairy operations leads (herd managers, parlor managers, dairymen) run dairy herd management." },
  { domain_code: "DAIRY-MGMT", business_function_name: "Supply Chain", responsibility_type: "contributor", notes: "Milk-pickup logistics and feed-supply coordination integrate with dairy mgmt." },
  { domain_code: "DAIRY-MGMT", business_function_name: "Finance", responsibility_type: "consumer", notes: "Income-over-feed-cost (IOFC), milk-pricing-pool revenue, and per-cow profitability read from dairy mgmt." },

  // FSQM — compliance-owned; production / procurement contribute; executive consumes
  { domain_code: "FSQM", business_function_name: "Governance, Risk and Compliance", responsibility_type: "owner", notes: "Food safety is a compliance / quality function; HACCP, GFSI, and FSMA Preventive Controls live in GRC / QA." },
  { domain_code: "FSQM", business_function_name: "Business Operations", responsibility_type: "contributor", notes: "Production operations executes CCP monitoring, sanitation, and allergen-control programmes on the plant floor." },
  { domain_code: "FSQM", business_function_name: "Procurement", responsibility_type: "contributor", notes: "Supplier-risk scoring and ingredient-safety controls are procurement-collaborative." },
  { domain_code: "FSQM", business_function_name: "Executive", responsibility_type: "consumer", notes: "Food-safety incidents and audit findings surface to leadership for risk reporting." },

  // FARMER-DIRECT-SALES — sales-owned; fulfillment ops + marketing contribute; finance consumes
  { domain_code: "FARMER-DIRECT-SALES", business_function_name: "Sales", responsibility_type: "owner", notes: "Farmer-direct sales is fundamentally a sales / commerce function — DTC subscription sales, wholesale account management, and farmers-market presence are all sales-led." },
  { domain_code: "FARMER-DIRECT-SALES", business_function_name: "Business Operations", responsibility_type: "contributor", notes: "Share packing, delivery routing, and farmstand operations are fulfillment-ops-driven." },
  { domain_code: "FARMER-DIRECT-SALES", business_function_name: "Marketing", responsibility_type: "contributor", notes: "Member acquisition, share previews, recipe content, and brand-store storefronts are marketing-collaborative." },
  { domain_code: "FARMER-DIRECT-SALES", business_function_name: "Finance", responsibility_type: "consumer", notes: "CSA subscription revenue, deferred-revenue accounting on pre-pays, and wholesale-invoice AR flow into finance." },
];

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("=== Agriculture & Food Systems — Phase C load ===\n");

  // Resolve domain IDs
  const domainLookup = await get("/domains?domain_code=in.(FMIS,FOOD-TRACE,DAIRY-MGMT,FSQM,FARMER-DIRECT-SALES)&select=id,domain_code");
  const domainMap = new Map<string, number>();
  for (const r of domainLookup) domainMap.set(String(r.domain_code), Number(r.id));

  // Resolve business_function IDs
  const bfLookup = await get("/business_functions?select=id,business_function_name&limit=200");
  const bfMap = new Map<string, number>();
  for (const r of bfLookup) bfMap.set(String(r.business_function_name), Number(r.id));

  // Read existing rows for dedup
  const existing = await get("/business_function_domains?select=domain_id,business_function_id,responsibility_type&limit=20000");
  const key = (did: number, fid: number, role: string) => `${did}:${fid}:${role}`;
  const existingKeys = new Set(existing.map(r => key(Number(r.domain_id), Number(r.business_function_id), String(r.responsibility_type))));

  const newRows: Row[] = [];
  for (const bfd of businessFunctionDomains) {
    const did = domainMap.get(bfd.domain_code);
    const fid = bfMap.get(bfd.business_function_name);
    if (!did) throw new Error(`Missing domain: ${bfd.domain_code}`);
    if (!fid) throw new Error(`Missing business_function: ${bfd.business_function_name}`);
    if (existingKeys.has(key(did, fid, bfd.responsibility_type))) continue;
    newRows.push({ domain_id: did, business_function_id: fid, responsibility_type: bfd.responsibility_type, notes: bfd.notes });
  }

  console.log(`Inserting ${newRows.length} business_function_domains (${existingKeys.size} pre-existing rows in table)`);
  await insert("/business_function_domains", newRows);

  // Audit — RACI per domain
  console.log("\n=== Phase C audit ===");
  for (const code of ["FMIS", "FOOD-TRACE", "DAIRY-MGMT", "FSQM", "FARMER-DIRECT-SALES"]) {
    const did = domainMap.get(code)!;
    const rows = await get(`/business_function_domains?domain_id=eq.${did}&select=responsibility_type,business_functions(business_function_name)&order=responsibility_type.asc`);
    const formatted = rows.map(r => `${r.responsibility_type}=${(r.business_functions as any).business_function_name}`).join(", ");
    console.log(`  ${code}: ${formatted}`);
  }

  console.log("\n=== UI links ===");
  console.log("  Function-domain RACI:  https://tests.semantius.app/domain_map/business_function_domains");
}

await main();
