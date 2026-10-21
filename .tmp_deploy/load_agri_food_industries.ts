#!/usr/bin/env bun
// Loads the Phase-0 industry rows for Agriculture & Food Systems:
//   Tier 1 (top-level): Agriculture/Forestry/Fishing/Hunting, Food Services
//   Tier 2 (under existing or tier-1 parents): Crop Production, Animal Production
//     & Aquaculture, F&B Manufacturing, F&B Retail
//   Tier 3 (under tier-2 parent): Dairy (under Animal Production & Aquaculture)
//
// Idempotent: reads by industry_name before inserting; safe to re-run.

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

async function syncIndustries(rows: Row[]): Promise<Map<string, number>> {
  const existing = await get(`/industries?select=id,industry_name&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r.industry_name)));
  const missing = rows.filter(r => !existingKeys.has(String(r.industry_name)));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new industries (${existing.length} existed)`);
    await insert("/industries", missing);
  } else {
    console.log(`  industries: ${rows.length} candidate(s) already present, nothing to insert`);
  }
  const all = await get(`/industries?select=id,industry_name&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r.industry_name), Number(r.id));
  return map;
}

// ============================================================
// Tier 1: new top-level industries
// ============================================================
const tier1: Row[] = [
  {
    industry_name: "Agriculture, Forestry, Fishing and Hunting",
    naics_code: "11",
    parent_industry_id: null,
    description: "NAICS 11. Primary-production sector: crop growing, animal husbandry, aquaculture, forestry, fishing. Distinct vendor stack from generic Manufacturing: weather / soil / satellite-imagery-driven operations, season-bound revenue cycles, USDA / EPA / FDA / state-ag-department regulation, federal crop insurance, NRCS conservation programs. Catalog scope: load crop and animal production now; defer forestry, fishing, and hunting until evidence threshold met.",
  },
  {
    industry_name: "Food Services and Drinking Places",
    naics_code: "722",
    parent_industry_id: null,
    description: "NAICS 722. Full-service restaurants, quick-service restaurants (QSR), fast-casual, catering, food trucks, bars, coffee shops, and other prepared-food-for-immediate-consumption operations. Separate top-level (not under Hospitality) because the vendor stack is operationally distinct from lodging: restaurant POS (Toast, Square for Restaurants, TouchBistro), online-ordering aggregation (Olo, Otter), kitchen display systems, restaurant-specific labour scheduling (7shifts, Restaurant365), and direct delivery integrations. Driven by gig-labour and aggregator economics not present in lodging.",
  },
];

// ============================================================
// Tier 2: sub-industries (some under tier-1, some under existing parents)
// ============================================================
// Manufacturing (id=5) and Retail (id=6) are pre-existing top-level parents.
const MANUFACTURING_ID = 5;
const RETAIL_ID = 6;

function buildTier2(agId: number): Row[] {
  return [
    {
      industry_name: "Crop Production",
      naics_code: "111",
      parent_industry_id: agId,
      description: "NAICS 111. Row crops (corn, soy, wheat, cotton), specialty crops (vineyards, orchards, market gardens), greenhouse / controlled-environment ag, and field vegetables. Vendor stack diverges sharply by farm size: smallholder FMIS (Farmbrite, AgriWebb) vs enterprise row-crop FMIS (Climate FieldView, Granular, Conservis). USDA Organic certification and state-level pesticide regulations apply. Speciality-crop-specific tooling (Vinsight, AgCode, Croptracker) is a candidate sub-industry — defer until vendor evidence justifies.",
    },
    {
      industry_name: "Animal Production and Aquaculture",
      naics_code: "112",
      parent_industry_id: agId,
      description: "NAICS 112. Beef cattle, swine, poultry, sheep, equine, and aquaculture. Excludes dairy (separate sub-industry due to distinct vendor pool and milk-cycle workflow). USDA FSIS oversight for slaughter / processing; animal-welfare regulation; CAFO permitting. Aquaculture has thin US vendor mass — global software market is healthier (AKVA Group, eFishery) but US TAM is borderline; defer aquaculture sub-industry until US scope justifies.",
    },
    {
      industry_name: "Food and Beverage Manufacturing",
      naics_code: "311-312",
      parent_industry_id: MANUFACTURING_ID,
      description: "NAICS 311-312. Food and beverage processing: dairy plants, meat processors, bakeries, beverage bottling, packaged-food producers. Sub-segment of Manufacturing because process / batch ERP fundamentals carry over, but vendor stack adds FSMA / HACCP / SQF / BRC-GS / kosher / halal certification, allergen control, lot traceability, and short-shelf-life inventory. Vertical-ERP vendors: Aptean Food & Beverage, SAP S/4HANA F&B, Infor M3 Food, Plex Food (under Rockwell Automation).",
    },
    {
      industry_name: "Food and Beverage Retail",
      naics_code: "445",
      parent_industry_id: RETAIL_ID,
      description: "NAICS 445. Supermarkets, grocery, specialty food retailers, beverage retailers, butcher / fish / produce shops. Sub-segment of Retail because POS / merchandising fundamentals carry over, but distinct perishables management (short shelf life, cold-chain monitoring, dynamic markdowns), thin margins driving aggressive markdown-optimisation tooling, and AP-pay-on-receipt supplier dynamics.",
    },
  ];
}

// ============================================================
// Tier 3: sub-of-sub
// ============================================================
function buildTier3(animalProductionId: number): Row[] {
  return [
    {
      industry_name: "Dairy",
      naics_code: "1121",
      parent_industry_id: animalProductionId,
      description: "NAICS 1121. Milk production from cattle, goats, and sheep. Separate sub-industry of Animal Production: vendor pool (DairyComp 305 by Valley Ag, BoviSync, AfiMilk, Lely Horizon, DeLaval DelPro, CowManager) is largely independent from beef / swine livestock vendors, and milk-cycle workflows (parlor management, milk-quality testing, somatic-cell counts, FDA Grade A milk regulation, dairy cooperative pooling) have no counterpart elsewhere in livestock. ~$700M-1.2B US software TAM.",
    },
  ];
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("Phase 0: load Agriculture & Food Systems industry rows");

  console.log("\nTier 1 — new top-level industries");
  const map1 = await syncIndustries(tier1);

  const agId = map1.get("Agriculture, Forestry, Fishing and Hunting");
  if (!agId) throw new Error("Tier 1 insert failed: Agriculture parent not found");

  console.log("\nTier 2 — sub-industries");
  const map2 = await syncIndustries(buildTier2(agId));

  const animalProductionId = map2.get("Animal Production and Aquaculture");
  if (!animalProductionId) throw new Error("Tier 2 insert failed: Animal Production not found");

  console.log("\nTier 3 — Dairy");
  await syncIndustries(buildTier3(animalProductionId));

  console.log("\nFinal state (Ag & Food Systems rows only):");
  // Filter by NAICS code rather than industry_name to avoid PostgREST or=(...) parser
  // choking on commas inside string values.
  const final = await get(
    `/industries?naics_code=in.(11,111,112,1121,311-312,445,722)&select=id,industry_name,naics_code,parent_industry_id&order=parent_industry_id.asc.nullsfirst,naics_code.asc`
  );
  console.table(final);

  console.log("\nUI: https://tests.semantius.app/domain_map/industries");
}

await main();
