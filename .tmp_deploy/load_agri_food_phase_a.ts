#!/usr/bin/env bun
// Phase A loader for the Agriculture & Food Systems wedge:
//   5 domains:  FMIS, FOOD-TRACE, DAIRY-MGMT, FSQM, FARMER-DIRECT-SALES
//   ~39 capabilities (domain-prefixed)
//   ~24 new vendors + 2 existing reused (IBM, Trimble Inc)
//   ~37 solutions
//   solution_domains coverage matrix
//   solution_capabilities delivery_strength matrix (focused — meaningful cells only)
//
// Phase B (data_objects + handoffs) and Phase C (business_function_domains)
// are deliberately NOT in this loader. They follow as separate drafts.
//
// Idempotent: reads by natural key before inserting; safe to re-run.

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
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function syncTable<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} candidate(s) already present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

function validateDomainRow(d: Row): void {
  if (!d.crud_percentage || d.min_org_size === "" || d.cost_band === "" ||
      (d.business_logic === "" && (d.crud_percentage as number) < 95) ||
      !d.usa_market_size_usd_m || !d.market_size_source_year) {
    throw new Error(`Incomplete domain payload: ${JSON.stringify(d)}`);
  }
}

// Industry IDs from the Phase 0 load
const IND_CROP_PRODUCTION = 22;
const IND_DAIRY = 26;
const IND_FB_MANUFACTURING = 24;

// ============================================================
// DOMAINS (5)
// ============================================================
type DomainRow = {
  domain_code: string;
  domain_name: string;
  description: string;
  business_logic: string;
  crud_percentage: number;
  min_org_size: string;
  cost_band: string;
  certification_required: boolean;
  usa_market_size_usd_m: number;
  market_size_source_year: number;
  industry_id: number;
};

const domains: DomainRow[] = [
  {
    domain_code: "FMIS",
    domain_name: "Farm Management Information System",
    description: "Records, plans, and analyses farm operations: field mapping, crop planning, planting/application records, harvest tracking, equipment telemetry, yield analytics, work-order assignment, and ag-input inventory. Buyer is the row-crop operator (enterprise tier: Climate FieldView, Granular, Conservis) or smallholder / specialty operator (Farmbrite, AgriWebb). Distinct from generic ERP because operations are weather / soil / season-bound and depend on satellite-imagery, IoT-sensor, and machinery-telemetry feeds (ISOBUS, CAN-bus, John Deere Operations Center API). Spans crop-side and increasingly into mixed-livestock (AgriWebb) and specialty (Conservis Specialty).",
    business_logic: "Variable-rate prescription generation from soil / yield zones, NDVI / satellite-imagery analytics for crop-health scoring, machinery telemetry normalisation (CAN-bus, ISOBUS, JD Operations Center API), weather-driven scheduling, agronomic recommendations (planting / spray timing windows), yield-zone clustering.",
    crud_percentage: 65,
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 2000,
    market_size_source_year: 2024,
    industry_id: IND_CROP_PRODUCTION,
  },
  {
    domain_code: "FOOD-TRACE",
    domain_name: "Food Traceability and Provenance",
    description: "End-to-end traceability of food products through the supply chain: lot / batch genealogy, FSMA-204 critical-tracking-event (CTE) capture and key-data-element (KDE) reporting, supplier-document management, recall execution, and provenance / origin verification. Buyer is the food manufacturer, distributor, or grower-shipper subject to FSMA 204 (Jan 2026 enforcement) and equivalents (EU 1169/2011, Canada SFCR). Regulatory tailwind is the primary demand driver. Differs from generic Supply Chain Visibility by SKU-lot-level granularity and regulator-prescribed event capture.",
    business_logic: "FSMA-204 CTE / KDE event capture and rule conformance, recall-execution workflow (notify → hold → consolidate → report → reconcile), supplier-document OCR / parsing / expiry tracking, lot-genealogy graph traversal, blockchain anchoring (IBM Food Trust), audit-trail integrity.",
    crud_percentage: 75,
    min_org_size: "30 m <2500",
    cost_band: "$$$",
    certification_required: true,
    usa_market_size_usd_m: 1400,
    market_size_source_year: 2024,
    industry_id: IND_FB_MANUFACTURING,
  },
  {
    domain_code: "DAIRY-MGMT",
    domain_name: "Dairy Herd Management",
    description: "Herd-level dairy operations: individual-cow lifecycle (calving, lactation cycles, dry-off, culling), parlor management, milk-quality testing, somatic-cell-count tracking, breeding and reproduction records, feed rationing, and FDA Grade A milk regulation compliance. Buyer is the dairy farm operator (large grazing or confined operations) or dairy cooperative member. Distinct vendor pool from generic livestock (DairyComp 305 / BoviSync / AfiMilk / Lely Horizon / DeLaval DelPro) reflecting fundamentally different workflows from beef / swine.",
    business_logic: "Lactation-cycle stage tracking and dry-off scheduling, somatic-cell-count threshold escalation, reproduction window / heat-detection algorithms, parlor / AMS (automatic milking system) telemetry ingest, milk-meter reconciliation, ration formulation, cull-decision scoring, FDA Grade A milk record audit trail.",
    crud_percentage: 70,
    min_org_size: "20 s <500",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 950,
    market_size_source_year: 2024,
    industry_id: IND_DAIRY,
  },
  {
    domain_code: "FSQM",
    domain_name: "Food Safety and Quality Management",
    description: "Food-safety management systems: HACCP plan development and audit, hazard analysis, CCP (critical-control-point) monitoring, food-fraud / VACCP / TACCP analysis, GFSI scheme certification audits (SQF, BRC-GS, FSSC 22000, IFS), allergen control, sanitation verification, environmental monitoring program (EMP), and recall management. Buyer is the food manufacturer subject to FSMA Preventive Controls Rule and (for export) GFSI-equivalent certification. Heavy overlap with Food Traceability on recall execution and supplier-document management; FSQM is the broader safety-system-of-record while Traceability is the lot-genealogy / CTE-capture specialist.",
    business_logic: "HACCP plan rule conformance and CCP deviation escalation, GFSI audit-prep checklists with score forecasting, environmental-monitoring trend analytics (Listeria / Salmonella positives mapping), allergen-changeover validation, supplier-risk scoring, recall traceback.",
    crud_percentage: 80,
    min_org_size: "30 m <2500",
    cost_band: "$$$",
    certification_required: true,
    usa_market_size_usd_m: 800,
    market_size_source_year: 2024,
    industry_id: IND_FB_MANUFACTURING,
  },
  {
    domain_code: "FARMER-DIRECT-SALES",
    domain_name: "Farmer-Direct Sales Platform",
    description: "Direct-to-consumer (CSA shares, online farm stores, farmers market POS) and farm-to-wholesale (chefs / restaurants / food hubs) commerce platforms for small and mid-scale farms. Buyer is the smallholder operator who has outgrown an Airtable + Stripe + Squarespace + delivery-app stack and needs purpose-built CSA share customisation, route optimisation for DTC delivery, farmers-market POS reconciliation, and wholesale catalog / order management. Captures the small-organic / regenerative / direct-to-consumer segment of the food system — an emerging-growth market where vendor density is rising fast despite a small absolute TAM.",
    business_logic: "Route optimisation for DTC delivery (Mapbox / Google Routes integration), CSA share customisation with swap / pause rules and dietary substitutions, farmers-market POS reconciliation across multiple market days, wholesale-pricing-tier management, payment-plan / installment scheduling, harvest-projection-to-available-shares planning, food-hub multi-farm producer-payout splits.",
    crud_percentage: 85,
    min_org_size: "10 xs <50",
    cost_band: "$",
    certification_required: false,
    usa_market_size_usd_m: 140,
    market_size_source_year: 2024,
    industry_id: IND_CROP_PRODUCTION,
  },
];

domains.forEach(validateDomainRow);

// ============================================================
// CAPABILITIES (39: 8 + 6 + 6 + 6 + 13)
// ============================================================
const capabilities = [
  // FMIS (8)
  { capability_code: "FMIS-FIELD-MAPPING", capability_name: "Field and Boundary Mapping", description: "GIS-based farm-field boundary definition, sub-field zone mapping (soil-type, yield, productivity), and integration with satellite / aerial imagery layers for visual operations planning." },
  { capability_code: "FMIS-CROP-PLANNING", capability_name: "Crop Planning and Rotation", description: "Seasonal crop-plan authoring (what to plant where), multi-year rotation modelling, cover-crop scheduling, and budget projection per field." },
  { capability_code: "FMIS-PLANTING-RECORDS", capability_name: "Planting and Application Records", description: "Per-pass record-keeping for planting events (seed variety, rate, date) and chemical / fertiliser applications (product, rate, weather conditions, applicator, restricted-use justification)." },
  { capability_code: "FMIS-INPUT-INVENTORY", capability_name: "Ag-Input Inventory", description: "Track seed, fertiliser, chemical, and fuel inventory across farm bins / sheds; reconcile against application records and purchase invoices for spend analysis." },
  { capability_code: "FMIS-HARVEST-TRACKING", capability_name: "Harvest and Yield Tracking", description: "Field-by-field and zone-by-zone yield capture from combine telemetry, scale tickets, and grain-handling records; reconcile against pre-harvest forecasts." },
  { capability_code: "FMIS-VARIABLE-RATE-PRESCRIPTION", capability_name: "Variable-Rate Prescription Generation", description: "Author site-specific application prescriptions for seed, fertiliser, and chemicals based on soil-test data, historical yield maps, and satellite imagery zones; export to machinery in ISOBUS / shapefile format." },
  { capability_code: "FMIS-MACHINERY-TELEMETRY", capability_name: "Machinery Telemetry Integration", description: "Ingest and normalise telemetry from tractors, combines, sprayers, and implements via CAN-bus, ISOBUS, John Deere Operations Center API, AGCO Fuse, AgLeader, Trimble Vehicle Sync, etc." },
  { capability_code: "FMIS-YIELD-ANALYTICS", capability_name: "Yield and Field-Performance Analytics", description: "Multi-season yield comparison, profitability-per-zone analysis, return-on-input modelling, and identification of underperforming zones or fields." },

  // FOOD-TRACE (6)
  { capability_code: "FOOD-TRACE-CTE-CAPTURE", capability_name: "Critical Tracking Event (CTE) Capture", description: "Record FSMA-204-defined critical tracking events (growing, receiving, transformation, creation, shipping) on covered foods through the supply chain." },
  { capability_code: "FOOD-TRACE-KDE-REPORTING", capability_name: "Key Data Element (KDE) Reporting", description: "Generate FDA-electronically-sortable KDE reports for foods on the FSMA-204 Food Traceability List; respond to FDA traceback requests within 24 hours." },
  { capability_code: "FOOD-TRACE-SUPPLIER-DOCS", capability_name: "Supplier Document Management", description: "Centralised vault for supplier certifications (GFSI, organic, kosher, halal), insurance certificates, allergen statements, and country-of-origin attestations; OCR-based expiry tracking and renewal workflow." },
  { capability_code: "FOOD-TRACE-RECALL-EXECUTION", capability_name: "Recall Execution Workflow", description: "Initiate, track, and report on product recalls: identify affected lots from lot-genealogy, notify downstream consignees, manage hold-and-segregate, file FDA Reportable Food Registry submissions." },
  { capability_code: "FOOD-TRACE-LOT-GENEALOGY", capability_name: "Lot and Batch Genealogy", description: "Forward and backward lot-genealogy traversal: from raw material lots through transformation events to finished SKUs and downstream consignees; visualise as a graph." },
  { capability_code: "FOOD-TRACE-PROVENANCE-VERIF", capability_name: "Provenance and Origin Verification", description: "Verify and surface origin claims (country, farm, fishery, sustainability certification) to downstream stakeholders; blockchain anchoring (IBM Food Trust, Provenance) for tamper-evident provenance attestation." },

  // DAIRY-MGMT (6)
  { capability_code: "DAIRY-MGMT-COW-LIFECYCLE", capability_name: "Individual Cow Lifecycle Management", description: "Per-animal record of birth, calving events, lactation cycles, dry-off, breeding history, and culling decisions; serves as the herd-level system of record." },
  { capability_code: "DAIRY-MGMT-PARLOR-INTEGRATION", capability_name: "Parlor and AMS Integration", description: "Integrate with milking parlors (conventional / rotary) and automatic milking systems (Lely Astronaut, DeLaval VMS) to capture per-cow milk yield, milking duration, conductivity, and parlor-side alerts." },
  { capability_code: "DAIRY-MGMT-MILK-QUALITY", capability_name: "Milk Quality Testing and Records", description: "Track somatic cell count (SCC), bacterial counts, butterfat / protein components, antibiotic residue, and bulk-tank quality records per shipment; trigger drug-residue and mastitis-management workflows." },
  { capability_code: "DAIRY-MGMT-REPRODUCTION", capability_name: "Reproduction and Heat Detection", description: "Track reproductive cycles, breeding events (natural service, AI, embryo transfer), pregnancy checks, and heat-detection signals (rumination collars, pedometers); compute reproductive efficiency metrics (days open, conception rate)." },
  { capability_code: "DAIRY-MGMT-FEED-RATIONING", capability_name: "Feed Rationing and TMR Management", description: "Formulate per-group total mixed rations (TMR), track feed inventory and shrink, integrate with feed-mixer load cells (CowSignals, Feed Watch), and compute income-over-feed-cost (IOFC) per cow group." },
  { capability_code: "DAIRY-MGMT-HERD-HEALTH", capability_name: "Herd Health Monitoring", description: "Track health events (mastitis, lameness, metabolic disorders), veterinary treatments, withdrawal periods, and herd-level disease trends; integrate with rumination / activity sensors for early-warning escalation." },

  // FSQM (6)
  { capability_code: "FSQM-HACCP-PLAN", capability_name: "HACCP Plan Authoring", description: "Author and maintain Hazard Analysis Critical Control Point (HACCP) plans: hazard analysis, CCP identification, critical limits, monitoring procedures, corrective actions, verification, and recordkeeping per Codex Alimentarius / FSMA requirements." },
  { capability_code: "FSQM-CCP-MONITORING", capability_name: "CCP Monitoring and Deviation Management", description: "Real-time or shift-frequency CCP monitoring (cook temperature, cold chain, metal detection, etc.) with deviation escalation, hold-and-test workflow, and corrective-action tracking." },
  { capability_code: "FSQM-AUDIT-PREP", capability_name: "Certification Audit Preparation", description: "Prepare for GFSI-benchmarked certification audits (SQF, BRC-GS, FSSC 22000, IFS) with self-assessment checklists, evidence libraries, score forecasting, and corrective-action plans against prior findings." },
  { capability_code: "FSQM-ALLERGEN-CONTROL", capability_name: "Allergen Control Programme", description: "Manage allergen-control programme: allergen mapping per product line, changeover validation (ATP swabbing, allergen-specific tests), labelling control, and supplier allergen attestations." },
  { capability_code: "FSQM-ENVIRONMENTAL-MONITORING", capability_name: "Environmental Monitoring Programme", description: "Sampling-plan management for pathogen environmental monitoring (Listeria, Salmonella, EHEC): sample-site scheduling, result entry, trend analytics by zone (Zone 1-4), corrective-action workflow." },
  { capability_code: "FSQM-SUPPLIER-RISK", capability_name: "Supplier Risk Scoring", description: "Score and segment ingredient and packaging suppliers by safety risk: country-of-origin, food-fraud vulnerability (VACCP), historical non-conformance, certification scope, and audit results." },

  // FARMER-DIRECT-SALES (13)
  { capability_code: "FDS-CSA-MGMT", capability_name: "CSA Membership and Share Management", description: "Manage CSA (community-supported agriculture) memberships: season setup, share types (vegetable, fruit, flower, meat), tiered share sizes, member onboarding, and roster management." },
  { capability_code: "FDS-SHARE-CUSTOMIZATION", capability_name: "CSA Share Customisation", description: "Per-member share customisation: swap-week selection (pick this not that), pause / vacation weeks, dietary substitutions (allergen-free, vegan), proration of partial weeks, and family-share splitting." },
  { capability_code: "FDS-ROUTE-OPTIMIZATION", capability_name: "DTC Delivery Route Optimisation", description: "Optimise multi-stop delivery routes for DTC orders using Mapbox / Google Routes / OSRM; account for delivery windows, vehicle capacity, return depots, and cold-chain duration constraints." },
  { capability_code: "FDS-DELIVERY-WINDOW-MGMT", capability_name: "Delivery Window and Pickup Location Management", description: "Define delivery time-slots, host-pickup-site locations, depot drop-offs, and on-farm pickup windows; let members self-serve their slot / location per week." },
  { capability_code: "FDS-FARMERS-MARKET-POS", capability_name: "Farmers Market POS", description: "On-site point-of-sale for farmers-market stalls: SKU-level pricing, scale integration for by-weight produce, cash / card / EBT-SNAP tender, end-of-day reconciliation per market day, multi-market roll-up." },
  { capability_code: "FDS-FARMSTAND-INVENTORY", capability_name: "On-Farm Farmstand POS and Inventory", description: "Cash-and-carry POS for on-farm farmstands and pick-your-own operations: variable inventory (weight, count), product-mix decisions by harvest availability, and farmstand cash-drawer reconciliation." },
  { capability_code: "FDS-WHOLESALE-ORDERING", capability_name: "Wholesale Order Management", description: "B2B wholesale: per-buyer-tier pricing (chef, restaurant, food-co-op), order intake (catalog browse, recurring standing orders, harvest-day order forms), packing-list generation, and wholesale invoicing with net-30 terms." },
  { capability_code: "FDS-FOODHUB-AGGREGATION", capability_name: "Food Hub Multi-Farm Aggregation", description: "Aggregate inventory from multiple producer farms into a single buyer-facing catalog; manage producer-payout splits per order line, drop-site logistics, and inter-farm sourcing decisions." },
  { capability_code: "FDS-ONLINE-FARM-STORE", capability_name: "Online Farm Store", description: "Direct e-commerce storefront with farm-branded look, product catalog (produce, meat, value-added), gift cards, and member-only pricing; mobile-first ordering UX." },
  { capability_code: "FDS-SUBSCRIPTION-BILLING", capability_name: "Subscription and Recurring Billing", description: "Recurring billing for CSA subscriptions: season pre-pay (full season upfront), monthly installments, weekly auto-charge; failed-card retry, dunning, and refund workflows." },
  { capability_code: "FDS-BUTCHER-CUT-SHEETS", capability_name: "Butcher Cut Sheets and Whole-Animal Pre-Orders", description: "Meat-farm-specific workflow: whole / half / quarter animal pre-orders with deposit, per-customer cut-sheet preferences (steak thickness, roast size, ground/sausage ratio), processor coordination, and pickup scheduling." },
  { capability_code: "FDS-MEMBER-PORTAL", capability_name: "Member-Facing Portal", description: "Customer-facing portal: share previews ('this week's box'), recipe suggestions, pickup reminders, account history, gift-share purchases, and member-to-member share donation / referral." },
  { capability_code: "FDS-HARVEST-FORECASTING", capability_name: "Harvest Forecasting to Available Shares", description: "Translate field-level harvest forecasts (lbs of tomatoes ready by week, lambs ready by month) into available shares / SKUs; surface scarcity-driven dynamic pricing and reserve-list waitlists." },
];

// ============================================================
// CAPABILITY_DOMAINS (1:1 — all domain-prefixed)
// ============================================================
const capabilityDomains: Array<{ capability_code: string; domain_code: string }> = [
  ...["FMIS-FIELD-MAPPING", "FMIS-CROP-PLANNING", "FMIS-PLANTING-RECORDS", "FMIS-INPUT-INVENTORY", "FMIS-HARVEST-TRACKING", "FMIS-VARIABLE-RATE-PRESCRIPTION", "FMIS-MACHINERY-TELEMETRY", "FMIS-YIELD-ANALYTICS"].map(c => ({ capability_code: c, domain_code: "FMIS" })),
  ...["FOOD-TRACE-CTE-CAPTURE", "FOOD-TRACE-KDE-REPORTING", "FOOD-TRACE-SUPPLIER-DOCS", "FOOD-TRACE-RECALL-EXECUTION", "FOOD-TRACE-LOT-GENEALOGY", "FOOD-TRACE-PROVENANCE-VERIF"].map(c => ({ capability_code: c, domain_code: "FOOD-TRACE" })),
  ...["DAIRY-MGMT-COW-LIFECYCLE", "DAIRY-MGMT-PARLOR-INTEGRATION", "DAIRY-MGMT-MILK-QUALITY", "DAIRY-MGMT-REPRODUCTION", "DAIRY-MGMT-FEED-RATIONING", "DAIRY-MGMT-HERD-HEALTH"].map(c => ({ capability_code: c, domain_code: "DAIRY-MGMT" })),
  ...["FSQM-HACCP-PLAN", "FSQM-CCP-MONITORING", "FSQM-AUDIT-PREP", "FSQM-ALLERGEN-CONTROL", "FSQM-ENVIRONMENTAL-MONITORING", "FSQM-SUPPLIER-RISK"].map(c => ({ capability_code: c, domain_code: "FSQM" })),
  ...["FDS-CSA-MGMT", "FDS-SHARE-CUSTOMIZATION", "FDS-ROUTE-OPTIMIZATION", "FDS-DELIVERY-WINDOW-MGMT", "FDS-FARMERS-MARKET-POS", "FDS-FARMSTAND-INVENTORY", "FDS-WHOLESALE-ORDERING", "FDS-FOODHUB-AGGREGATION", "FDS-ONLINE-FARM-STORE", "FDS-SUBSCRIPTION-BILLING", "FDS-BUTCHER-CUT-SHEETS", "FDS-MEMBER-PORTAL", "FDS-HARVEST-FORECASTING"].map(c => ({ capability_code: c, domain_code: "FARMER-DIRECT-SALES" })),
];

// ============================================================
// VENDORS (~24 new)
// ============================================================
const vendors = [
  // FMIS vendors
  { vendor_name: "Bayer Crop Science", vendor_url: "https://www.cropscience.bayer.com", headquarters_country: "Germany", description: "Crop-protection and digital-agriculture division of Bayer AG; markets Climate FieldView (digital ag platform from Monsanto / Climate Corporation acquisition).", notes: "Climate Corporation acquired by Monsanto 2013; Monsanto acquired by Bayer 2018." },
  { vendor_name: "Corteva Agriscience", vendor_url: "https://www.corteva.com", headquarters_country: "USA", description: "Agriculture-only spin-off of DowDuPont (2019). Crop-protection, seeds, and digital-ag (Granular).", notes: "Granular acquired by DuPont 2017; followed Corteva at 2019 spin-off." },
  { vendor_name: "Conservis Corp", vendor_url: "https://www.conservis.ag", headquarters_country: "USA", description: "Independent farm-management software vendor focused on enterprise row-crop and specialty operations; acquired by Telus Agriculture & Consumer Goods in 2021.", notes: "Owned by Telus Agriculture & Consumer Goods (Telus Corporation subsidiary)." },
  { vendor_name: "AgriWebb Pty Ltd", vendor_url: "https://www.agriwebb.com", headquarters_country: "Australia", description: "Livestock and mixed-farm management software vendor; strong in beef cattle, growing into mixed-livestock and dairy.", notes: "" },
  { vendor_name: "Deere and Company", vendor_url: "https://www.deere.com", headquarters_country: "USA", description: "Agricultural and construction equipment manufacturer (John Deere brand); operates John Deere Operations Center precision-ag platform and acquired digital-ag startups (Bear Flag Robotics, Blue River Technology).", notes: "Operations Center is the OEM-led digital-ag platform for the John Deere installed base." },
  { vendor_name: "Farmbrite Inc", vendor_url: "https://www.farmbrite.com", headquarters_country: "USA", description: "SMB-targeted farm management software for small and diversified farms (livestock, crops, market gardens, beekeeping).", notes: "" },
  { vendor_name: "AgWorld", vendor_url: "https://www.agworld.com", headquarters_country: "Australia", description: "Collaborative farm-input planning and execution platform with strong adviser / retailer side; common in Australia and US row-crop.", notes: "" },

  // FOOD-TRACE vendors
  { vendor_name: "Trustwell", vendor_url: "https://www.trustwell.com", headquarters_country: "USA", description: "Food-safety and supply-chain software vendor (Trustwell Connect / FoodLogiQ, Genesis R&D, ESHA Research). Rebranded from FoodLogiQ in 2023.", notes: "FoodLogiQ rebranded to Trustwell after 2022 merger with ESHA Research." },
  { vendor_name: "TraceGains Inc", vendor_url: "https://www.tracegains.com", headquarters_country: "USA", description: "Food-and-beverage supplier intelligence and FSQM vendor (Networked Ingredient Marketplace, Quality Management).", notes: "" },
  { vendor_name: "Provenance Ltd", vendor_url: "https://www.provenance.org", headquarters_country: "United Kingdom", description: "Sustainability and provenance claims verification platform for consumer brands; blockchain-anchored proof points.", notes: "" },
  { vendor_name: "Wholechain Inc", vendor_url: "https://wholechain.com", headquarters_country: "USA", description: "Blockchain-based seafood and produce traceability platform; strong in fishery / aquaculture provenance.", notes: "" },
  { vendor_name: "iTradeNetwork", vendor_url: "https://www.itradenetwork.com", headquarters_country: "USA", description: "Food-industry supply-chain network and traceability vendor for grocery, foodservice, and distributors.", notes: "Owned by Park Place Technologies." },

  // DAIRY-MGMT vendors
  { vendor_name: "Valley Ag Software", vendor_url: "https://www.vas.com", headquarters_country: "USA", description: "Dairy herd-management software vendor (DairyComp 305) — long-standing US dairy industry standard.", notes: "" },
  { vendor_name: "BoviSync Inc", vendor_url: "https://www.bovisync.com", headquarters_country: "USA", description: "Cloud dairy herd-management vendor with strong reproductive-management workflows.", notes: "" },
  { vendor_name: "Afimilk Ltd", vendor_url: "https://www.afimilk.com", headquarters_country: "Israel", description: "Dairy parlor-management and cow-monitoring vendor; AfiMilk sensors + AfiFarm software stack.", notes: "" },
  { vendor_name: "Lely Industries N.V.", vendor_url: "https://www.lely.com", headquarters_country: "Netherlands", description: "Dairy automation and robotic-milking-system vendor (Lely Astronaut, Lely Horizon farm-management software).", notes: "" },
  { vendor_name: "DeLaval International", vendor_url: "https://www.delaval.com", headquarters_country: "Sweden", description: "Dairy parlor, robotic-milking (VMS), and farm-management vendor (DelPro). Tetra Laval Group company.", notes: "Owned by Tetra Laval Group." },
  { vendor_name: "CowManager BV", vendor_url: "https://www.cowmanager.com", headquarters_country: "Netherlands", description: "Ear-tag-sensor-based cow monitoring vendor: fertility, health, and nutrition signals for dairy and beef.", notes: "" },
  { vendor_name: "MSD Animal Health", vendor_url: "https://www.msd-animal-health.com", headquarters_country: "USA", description: "Animal-health pharmaceuticals and livestock-monitoring vendor (Allflex Livestock Intelligence). Merck & Co subsidiary (sold as MSD outside US/Canada).", notes: "Allflex acquired 2019. Operates under Merck Animal Health in US/Canada." },
  { vendor_name: "Dairy.com", vendor_url: "https://www.dairy.com", headquarters_country: "USA", description: "Dairy supply-chain software vendor (milk hauling, milk pricing / pooling, dairy-cooperative back-office).", notes: "" },

  // FSQM vendors
  { vendor_name: "Safefood 360", vendor_url: "https://safefood360.com", headquarters_country: "Ireland", description: "Food-safety management software vendor; HACCP, GFSI audit preparation, supplier control. Owned by LRQA (Lloyd's Register Quality Assurance).", notes: "Acquired by LRQA 2021." },
  { vendor_name: "SafetyChain Software Inc", vendor_url: "https://www.safetychain.com", headquarters_country: "USA", description: "FSQM platform for food and beverage manufacturers: HACCP, supplier compliance, plant-floor data capture, OEE.", notes: "" },
  { vendor_name: "Icicle Technologies Inc", vendor_url: "https://www.icicletechnologies.com", headquarters_country: "Canada", description: "Food-safety and FSQM vendor with AI-assisted HACCP plan generation; smaller, Canada-strong.", notes: "" },
  { vendor_name: "Intelex Technologies", vendor_url: "https://www.intelex.com", headquarters_country: "Canada", description: "EHSQ (Environment, Health, Safety, Quality) software vendor with food-and-beverage vertical (Intelex Food Safety). Fortive Corporation subsidiary.", notes: "Acquired by Fortive 2021." },
  { vendor_name: "FoodReady Inc", vendor_url: "https://foodreadyapp.com", headquarters_country: "USA", description: "SMB-friendly food-safety software vendor: HACCP / SQF / BRC audit prep for craft producers, ghost kitchens, and small food manufacturers.", notes: "" },

  // FARMER-DIRECT-SALES vendors
  { vendor_name: "Barn2Door Inc", vendor_url: "https://www.barn2door.com", headquarters_country: "USA", description: "All-in-one DTC + wholesale farm e-commerce platform; current US market leader for farmer-direct sales software.", notes: "" },
  { vendor_name: "Local Line Inc", vendor_url: "https://www.localline.ca", headquarters_country: "Canada", description: "Farm-to-buyer e-commerce platform with strong wholesale / restaurant tier; growing US presence.", notes: "" },
  { vendor_name: "GrazeCart LLC", vendor_url: "https://www.grazecart.com", headquarters_country: "USA", description: "Bootstrapped e-commerce platform for regenerative meat farms and direct-to-consumer livestock operations.", notes: "" },
  { vendor_name: "Harvie Farms", vendor_url: "https://www.harvie.farm", headquarters_country: "USA", description: "CSA-focused platform specialising in share customisation and member experience.", notes: "" },
  { vendor_name: "Open Food Network", vendor_url: "https://openfoodnetwork.org", headquarters_country: "Australia", description: "Open-source / cooperative platform for food hubs and direct-from-farm distribution; multi-country deployments.", notes: "Cooperative governance model; deployed by community-led hubs globally." },
  { vendor_name: "Small Farm Central", vendor_url: "https://www.smallfarmcentral.com", headquarters_country: "USA", description: "CSA-membership-specific software vendor (CSAware); long-tail of the CSA-only segment.", notes: "" },
  { vendor_name: "Local Food Marketplace", vendor_url: "https://www.localfoodmarketplace.com", headquarters_country: "USA", description: "Food-hub-focused B2B + DTC platform supporting multi-producer aggregation, producer payouts, and drop-site logistics.", notes: "" },
];

// ============================================================
// SOLUTIONS (~37)
// ============================================================
type SolutionRow = {
  solution_name: string;
  vendor_name: string;
  description: string;
  solution_url: string;
  solution_type: string;
  is_active_in_market: boolean;
  min_org_size: string;
  max_org_size: string;
  cost_band: string;
  solution_kind: string;
  notes: string;
};

const solutions: SolutionRow[] = [
  // FMIS
  { solution_name: "Climate FieldView", vendor_name: "Bayer Crop Science", description: "Digital-agriculture platform with field-mapping, satellite imagery, planting / harvest data ingest, and variable-rate prescription generation; large North American row-crop installed base.", solution_url: "https://climate.com/fieldview", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "50 xl 10000+", cost_band: "$$", solution_kind: "standard_solution", notes: "Acquired by Monsanto via Climate Corporation 2013; under Bayer Crop Science 2018." },
  { solution_name: "Granular", vendor_name: "Corteva Agriscience", description: "Farm-management software for enterprise row-crop operations: financial management, agronomic planning, work-order assignment.", solution_url: "https://granular.ag", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Conservis", vendor_name: "Conservis Corp", description: "Enterprise farm-management platform: planning, operations, harvest, and grain marketing for row-crop and specialty growers.", solution_url: "https://www.conservis.ag", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "AgriWebb", vendor_name: "AgriWebb Pty Ltd", description: "Mobile-first livestock and mixed-farm management platform; offline-capable for paddock-level records.", solution_url: "https://www.agriwebb.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Trimble Ag Software", vendor_name: "Trimble Inc", description: "Connected-farm software stack: field-mapping, machinery-telemetry integration, agronomic data ingest from Trimble displays and third-party machinery.", solution_url: "https://agriculture.trimble.com", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "John Deere Operations Center", vendor_name: "Deere and Company", description: "OEM-led digital-ag platform for the John Deere installed base; field-mapping, machinery telemetry, prescription dispatch, and operations analytics. Free to use with John Deere machinery accounts.", solution_url: "https://operationscenter.deere.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "50 xl 10000+", cost_band: "$", solution_kind: "standard_solution", notes: "Free core; premium analytics layered on top." },
  { solution_name: "Farmbrite", vendor_name: "Farmbrite Inc", description: "SMB farm management software for small and diversified farms; covers crops, livestock, market gardens, beekeeping, and basic farm accounting.", solution_url: "https://www.farmbrite.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "20 s <500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "AgWorld", vendor_name: "AgWorld", description: "Collaborative input-planning and execution platform connecting growers, advisers, and retailers; strong in input-spend reconciliation.", solution_url: "https://www.agworld.com", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },

  // FOOD-TRACE
  { solution_name: "Trustwell Connect", vendor_name: "Trustwell", description: "Supplier-management and traceability platform (formerly FoodLogiQ Connect): CTE / KDE capture, supplier-document control, recall execution, and incident management.", solution_url: "https://www.trustwell.com/trustwell-connect", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "Rebranded from FoodLogiQ Connect in 2023." },
  { solution_name: "IBM Food Trust", vendor_name: "IBM", description: "Blockchain-anchored food traceability network: shared ledger across producers, distributors, and retailers for lot-level traceback and provenance.", solution_url: "https://www.ibm.com/products/supply-chain-intelligence-suite/food-trust", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "TraceGains Networked Ingredient Marketplace", vendor_name: "TraceGains Inc", description: "Networked supplier intelligence and traceability platform for food and beverage manufacturers; supplier documents, ingredient compliance, recall support.", solution_url: "https://www.tracegains.com", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Provenance Platform", vendor_name: "Provenance Ltd", description: "Provenance and sustainability-claims verification platform for consumer brands; tamper-evident proof points and shopper-facing transparency.", solution_url: "https://www.provenance.org", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Wholechain", vendor_name: "Wholechain Inc", description: "Blockchain-anchored seafood and produce traceability with strong fishery / aquaculture provenance workflows.", solution_url: "https://wholechain.com", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "40 l <10000", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "iTradeNetwork", vendor_name: "iTradeNetwork", description: "Food-industry supply-chain network and traceability platform for grocery retailers, foodservice operators, and distributors.", solution_url: "https://www.itradenetwork.com", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },

  // DAIRY-MGMT
  { solution_name: "DairyComp 305", vendor_name: "Valley Ag Software", description: "Dairy herd-management software industry standard in the US; per-cow records, lactation, reproduction, herd analytics.", solution_url: "https://www.vas.com/dairycomp", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "BoviSync", vendor_name: "BoviSync Inc", description: "Cloud dairy herd-management platform with strong reproductive workflows and customisable cow-card views.", solution_url: "https://www.bovisync.com", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "AfiMilk AfiFarm", vendor_name: "Afimilk Ltd", description: "Parlor-integrated dairy management stack: AfiMilk parlor sensors + AfiFarm herd-management software.", solution_url: "https://www.afimilk.com/afifarm", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Lely Horizon", vendor_name: "Lely Industries N.V.", description: "Farm-management software tightly integrated with Lely Astronaut robotic milking systems; cow-traffic and per-cow yield management.", solution_url: "https://www.lely.com/farming-insights/horizon", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "DeLaval DelPro", vendor_name: "DeLaval International", description: "Farm-management software for DeLaval parlors and VMS robotic milking systems; herd, milking, and feed integration.", solution_url: "https://www.delaval.com/en-us/our-solutions/farm-management/", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "CowManager", vendor_name: "CowManager BV", description: "Ear-tag-sensor-based cow monitoring system: fertility, health (rumination, ear-temperature), and nutrition signals.", solution_url: "https://www.cowmanager.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Allflex Livestock Intelligence", vendor_name: "MSD Animal Health", description: "Cow-monitoring sensor suite (collars, ear tags) and accompanying analytics platform; fertility / health / activity signals.", solution_url: "https://www.allflex.global", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$", solution_kind: "standard_solution", notes: "Multi-domain: also serves beef / livestock when that domain loads." },
  { solution_name: "Dairy.com Platform", vendor_name: "Dairy.com", description: "Dairy supply-chain platform: milk hauling logistics, federal-order milk pricing, and dairy-cooperative back-office.", solution_url: "https://www.dairy.com", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "Adjacent — covers DAIRY-MGMT only in milk-quality / shipment-record slice; primary use is logistics + pricing." },

  // FSQM
  { solution_name: "TraceGains Quality Management", vendor_name: "TraceGains Inc", description: "FSQM module of the TraceGains platform: HACCP plans, CCP monitoring, audit prep, and supplier quality.", solution_url: "https://www.tracegains.com/quality-management", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "Same vendor as TraceGains Networked Ingredient Marketplace (FOOD-TRACE)." },
  { solution_name: "Safefood 360", vendor_name: "Safefood 360", description: "Food-safety management software platform; HACCP, GFSI audit prep, supplier control, allergen management, and EMP.", solution_url: "https://safefood360.com", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "SafetyChain", vendor_name: "SafetyChain Software Inc", description: "FSQM and plant-floor data capture for food and beverage manufacturers: HACCP, CCP monitoring, supplier compliance, OEE.", solution_url: "https://www.safetychain.com", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Icicle", vendor_name: "Icicle Technologies Inc", description: "FSQM platform with AI-assisted HACCP plan generation; multi-tenant for SMB / mid-market food and beverage manufacturers.", solution_url: "https://www.icicletechnologies.com", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Intelex Food Safety", vendor_name: "Intelex Technologies", description: "Food-safety module within the Intelex EHSQ platform; integrates with broader environmental, health, and safety workflows.", solution_url: "https://www.intelex.com/solutions/food-and-beverage", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "FoodReady", vendor_name: "FoodReady Inc", description: "SMB-friendly HACCP / SQF / BRC audit-prep platform for craft food producers, ghost kitchens, and small food manufacturers.", solution_url: "https://foodreadyapp.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "" },

  // FARMER-DIRECT-SALES
  { solution_name: "Barn2Door", vendor_name: "Barn2Door Inc", description: "All-in-one farm e-commerce platform: DTC store, CSA management, farmers-market POS, wholesale ordering, butcher cut sheets, and farm-branded mobile portal.", solution_url: "https://www.barn2door.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "20 s <500", cost_band: "$", solution_kind: "standard_solution", notes: "Current US market leader by share." },
  { solution_name: "Local Line", vendor_name: "Local Line Inc", description: "Farm-to-buyer e-commerce platform: DTC subscriptions, wholesale-restaurant ordering, route planning, member portal.", solution_url: "https://www.localline.ca", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "Strong wholesale / restaurant tier compared to peers." },
  { solution_name: "GrazeCart", vendor_name: "GrazeCart LLC", description: "Bootstrapped e-commerce platform purpose-built for regenerative meat farms; whole-animal pre-orders, cut sheets, freezer-style inventory.", solution_url: "https://www.grazecart.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "20 s <500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Harvie", vendor_name: "Harvie Farms", description: "CSA platform specialising in personalised share customisation: per-member swap weeks, dietary preferences, pause / vacation handling.", solution_url: "https://www.harvie.farm", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "20 s <500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Open Food Network", vendor_name: "Open Food Network", description: "Open-source / cooperative platform for food hubs and direct-from-farm distribution; multi-producer aggregation, multi-country deployments.", solution_url: "https://openfoodnetwork.org", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "AGPL-licensed; community-led deployments." },
  { solution_name: "CSAware", vendor_name: "Small Farm Central", description: "CSA-membership-specific software: season setup, share-customisation, delivery / pickup management, recurring billing.", solution_url: "https://www.csaware.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "20 s <500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Local Food Marketplace", vendor_name: "Local Food Marketplace", description: "Food-hub-focused B2B + DTC platform: multi-producer aggregation, producer payouts, drop-site logistics, wholesale invoicing.", solution_url: "https://www.localfoodmarketplace.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$$", solution_kind: "standard_solution", notes: "Strong food-hub-aggregator angle vs per-farm DTC peers." },
];

// ============================================================
// SOLUTION_DOMAINS — coverage_level per (solution, domain)
// ============================================================
type SolDomain = { solution_name: string; domain_code: string; coverage_level: string };

const solutionDomains: SolDomain[] = [
  // FMIS — all primary
  ...["Climate FieldView", "Granular", "Conservis", "AgriWebb", "Trimble Ag Software", "John Deere Operations Center", "Farmbrite", "AgWorld"].map(s => ({ solution_name: s, domain_code: "FMIS", coverage_level: "primary" })),

  // FOOD-TRACE — all primary
  ...["Trustwell Connect", "IBM Food Trust", "TraceGains Networked Ingredient Marketplace", "Provenance Platform", "Wholechain", "iTradeNetwork"].map(s => ({ solution_name: s, domain_code: "FOOD-TRACE", coverage_level: "primary" })),
  // FSQM platform with traceability adjacency
  { solution_name: "TraceGains Quality Management", domain_code: "FOOD-TRACE", coverage_level: "secondary" },

  // DAIRY-MGMT — all primary
  ...["DairyComp 305", "BoviSync", "AfiMilk AfiFarm", "Lely Horizon", "DeLaval DelPro", "CowManager", "Allflex Livestock Intelligence"].map(s => ({ solution_name: s, domain_code: "DAIRY-MGMT", coverage_level: "primary" })),
  { solution_name: "Dairy.com Platform", domain_code: "DAIRY-MGMT", coverage_level: "secondary" },

  // FSQM — all primary
  ...["TraceGains Quality Management", "Safefood 360", "SafetyChain", "Icicle", "Intelex Food Safety", "FoodReady"].map(s => ({ solution_name: s, domain_code: "FSQM", coverage_level: "primary" })),
  // FOOD-TRACE platforms with FSQM adjacency
  { solution_name: "Trustwell Connect", domain_code: "FSQM", coverage_level: "secondary" },
  { solution_name: "TraceGains Networked Ingredient Marketplace", domain_code: "FSQM", coverage_level: "secondary" },

  // FARMER-DIRECT-SALES — all primary
  ...["Barn2Door", "Local Line", "GrazeCart", "Harvie", "Open Food Network", "CSAware", "Local Food Marketplace"].map(s => ({ solution_name: s, domain_code: "FARMER-DIRECT-SALES", coverage_level: "primary" })),
];

// ============================================================
// SOLUTION_CAPABILITIES — focused matrix (native / partial / via_extension / select not_supported)
// ============================================================
type SolCap = { solution_name: string; capability_code: string; delivery_strength: string; notes: string };
const SC = (sol: string, capCode: string, strength: string, notes = ""): SolCap =>
  ({ solution_name: sol, capability_code: capCode, delivery_strength: strength, notes });

const solutionCapabilities: SolCap[] = [
  // ===== FMIS =====
  // Climate FieldView (enterprise row-crop, satellite-leaning)
  SC("Climate FieldView", "FMIS-FIELD-MAPPING", "native"),
  SC("Climate FieldView", "FMIS-CROP-PLANNING", "native"),
  SC("Climate FieldView", "FMIS-PLANTING-RECORDS", "native"),
  SC("Climate FieldView", "FMIS-INPUT-INVENTORY", "partial"),
  SC("Climate FieldView", "FMIS-HARVEST-TRACKING", "native"),
  SC("Climate FieldView", "FMIS-VARIABLE-RATE-PRESCRIPTION", "native"),
  SC("Climate FieldView", "FMIS-MACHINERY-TELEMETRY", "native"),
  SC("Climate FieldView", "FMIS-YIELD-ANALYTICS", "native"),
  // Granular (financial / operational mgmt leaning)
  SC("Granular", "FMIS-FIELD-MAPPING", "native"),
  SC("Granular", "FMIS-CROP-PLANNING", "native"),
  SC("Granular", "FMIS-PLANTING-RECORDS", "native"),
  SC("Granular", "FMIS-INPUT-INVENTORY", "native"),
  SC("Granular", "FMIS-HARVEST-TRACKING", "native"),
  SC("Granular", "FMIS-VARIABLE-RATE-PRESCRIPTION", "partial"),
  SC("Granular", "FMIS-MACHINERY-TELEMETRY", "partial"),
  SC("Granular", "FMIS-YIELD-ANALYTICS", "native"),
  // Conservis
  SC("Conservis", "FMIS-FIELD-MAPPING", "native"),
  SC("Conservis", "FMIS-CROP-PLANNING", "native"),
  SC("Conservis", "FMIS-PLANTING-RECORDS", "native"),
  SC("Conservis", "FMIS-INPUT-INVENTORY", "native"),
  SC("Conservis", "FMIS-HARVEST-TRACKING", "native"),
  SC("Conservis", "FMIS-VARIABLE-RATE-PRESCRIPTION", "partial"),
  SC("Conservis", "FMIS-MACHINERY-TELEMETRY", "via_extension"),
  SC("Conservis", "FMIS-YIELD-ANALYTICS", "partial"),
  // AgriWebb (livestock-first; crop is partial)
  SC("AgriWebb", "FMIS-FIELD-MAPPING", "native"),
  SC("AgriWebb", "FMIS-CROP-PLANNING", "partial"),
  SC("AgriWebb", "FMIS-PLANTING-RECORDS", "partial"),
  SC("AgriWebb", "FMIS-INPUT-INVENTORY", "native"),
  SC("AgriWebb", "FMIS-HARVEST-TRACKING", "partial"),
  SC("AgriWebb", "FMIS-VARIABLE-RATE-PRESCRIPTION", "not_supported"),
  SC("AgriWebb", "FMIS-MACHINERY-TELEMETRY", "partial"),
  SC("AgriWebb", "FMIS-YIELD-ANALYTICS", "partial"),
  // Trimble Ag (machinery-centric)
  SC("Trimble Ag Software", "FMIS-FIELD-MAPPING", "native"),
  SC("Trimble Ag Software", "FMIS-CROP-PLANNING", "partial"),
  SC("Trimble Ag Software", "FMIS-PLANTING-RECORDS", "native"),
  SC("Trimble Ag Software", "FMIS-INPUT-INVENTORY", "native"),
  SC("Trimble Ag Software", "FMIS-HARVEST-TRACKING", "native"),
  SC("Trimble Ag Software", "FMIS-VARIABLE-RATE-PRESCRIPTION", "native"),
  SC("Trimble Ag Software", "FMIS-MACHINERY-TELEMETRY", "native"),
  SC("Trimble Ag Software", "FMIS-YIELD-ANALYTICS", "partial"),
  // John Deere Operations Center (OEM-led)
  SC("John Deere Operations Center", "FMIS-FIELD-MAPPING", "native"),
  SC("John Deere Operations Center", "FMIS-CROP-PLANNING", "partial"),
  SC("John Deere Operations Center", "FMIS-PLANTING-RECORDS", "native"),
  SC("John Deere Operations Center", "FMIS-INPUT-INVENTORY", "partial"),
  SC("John Deere Operations Center", "FMIS-HARVEST-TRACKING", "native"),
  SC("John Deere Operations Center", "FMIS-VARIABLE-RATE-PRESCRIPTION", "native"),
  SC("John Deere Operations Center", "FMIS-MACHINERY-TELEMETRY", "native", "Strongest in-class for JD-branded machinery."),
  SC("John Deere Operations Center", "FMIS-YIELD-ANALYTICS", "native"),
  // Farmbrite (SMB / diversified)
  SC("Farmbrite", "FMIS-FIELD-MAPPING", "partial"),
  SC("Farmbrite", "FMIS-CROP-PLANNING", "native"),
  SC("Farmbrite", "FMIS-PLANTING-RECORDS", "native"),
  SC("Farmbrite", "FMIS-INPUT-INVENTORY", "native"),
  SC("Farmbrite", "FMIS-HARVEST-TRACKING", "partial"),
  SC("Farmbrite", "FMIS-VARIABLE-RATE-PRESCRIPTION", "not_supported"),
  SC("Farmbrite", "FMIS-MACHINERY-TELEMETRY", "not_supported"),
  SC("Farmbrite", "FMIS-YIELD-ANALYTICS", "partial"),
  // AgWorld
  SC("AgWorld", "FMIS-FIELD-MAPPING", "native"),
  SC("AgWorld", "FMIS-CROP-PLANNING", "native"),
  SC("AgWorld", "FMIS-PLANTING-RECORDS", "native"),
  SC("AgWorld", "FMIS-INPUT-INVENTORY", "native"),
  SC("AgWorld", "FMIS-HARVEST-TRACKING", "partial"),
  SC("AgWorld", "FMIS-VARIABLE-RATE-PRESCRIPTION", "partial"),
  SC("AgWorld", "FMIS-MACHINERY-TELEMETRY", "partial"),
  SC("AgWorld", "FMIS-YIELD-ANALYTICS", "partial"),

  // ===== FOOD-TRACE =====
  SC("Trustwell Connect", "FOOD-TRACE-CTE-CAPTURE", "native"),
  SC("Trustwell Connect", "FOOD-TRACE-KDE-REPORTING", "native"),
  SC("Trustwell Connect", "FOOD-TRACE-SUPPLIER-DOCS", "native"),
  SC("Trustwell Connect", "FOOD-TRACE-RECALL-EXECUTION", "native"),
  SC("Trustwell Connect", "FOOD-TRACE-LOT-GENEALOGY", "native"),
  SC("Trustwell Connect", "FOOD-TRACE-PROVENANCE-VERIF", "partial"),
  // IBM Food Trust (blockchain-anchored)
  SC("IBM Food Trust", "FOOD-TRACE-CTE-CAPTURE", "native"),
  SC("IBM Food Trust", "FOOD-TRACE-KDE-REPORTING", "partial"),
  SC("IBM Food Trust", "FOOD-TRACE-SUPPLIER-DOCS", "partial"),
  SC("IBM Food Trust", "FOOD-TRACE-RECALL-EXECUTION", "native"),
  SC("IBM Food Trust", "FOOD-TRACE-LOT-GENEALOGY", "native"),
  SC("IBM Food Trust", "FOOD-TRACE-PROVENANCE-VERIF", "native", "Blockchain-anchored provenance is core differentiator."),
  // TraceGains Networked Ingredient Marketplace (supplier-doc strong)
  SC("TraceGains Networked Ingredient Marketplace", "FOOD-TRACE-CTE-CAPTURE", "partial"),
  SC("TraceGains Networked Ingredient Marketplace", "FOOD-TRACE-KDE-REPORTING", "partial"),
  SC("TraceGains Networked Ingredient Marketplace", "FOOD-TRACE-SUPPLIER-DOCS", "native", "Network of pre-vetted suppliers is the platform's defining feature."),
  SC("TraceGains Networked Ingredient Marketplace", "FOOD-TRACE-RECALL-EXECUTION", "partial"),
  SC("TraceGains Networked Ingredient Marketplace", "FOOD-TRACE-LOT-GENEALOGY", "via_extension"),
  // Provenance Platform (consumer-claims angle)
  SC("Provenance Platform", "FOOD-TRACE-CTE-CAPTURE", "partial"),
  SC("Provenance Platform", "FOOD-TRACE-KDE-REPORTING", "partial"),
  SC("Provenance Platform", "FOOD-TRACE-SUPPLIER-DOCS", "partial"),
  SC("Provenance Platform", "FOOD-TRACE-PROVENANCE-VERIF", "native", "Consumer-facing claims is the product."),
  SC("Provenance Platform", "FOOD-TRACE-LOT-GENEALOGY", "via_extension"),
  // Wholechain (blockchain, seafood-strong)
  SC("Wholechain", "FOOD-TRACE-CTE-CAPTURE", "native"),
  SC("Wholechain", "FOOD-TRACE-KDE-REPORTING", "native"),
  SC("Wholechain", "FOOD-TRACE-SUPPLIER-DOCS", "partial"),
  SC("Wholechain", "FOOD-TRACE-RECALL-EXECUTION", "native"),
  SC("Wholechain", "FOOD-TRACE-LOT-GENEALOGY", "native"),
  SC("Wholechain", "FOOD-TRACE-PROVENANCE-VERIF", "native"),
  // iTradeNetwork
  SC("iTradeNetwork", "FOOD-TRACE-CTE-CAPTURE", "partial"),
  SC("iTradeNetwork", "FOOD-TRACE-KDE-REPORTING", "partial"),
  SC("iTradeNetwork", "FOOD-TRACE-SUPPLIER-DOCS", "native"),
  SC("iTradeNetwork", "FOOD-TRACE-RECALL-EXECUTION", "partial"),
  SC("iTradeNetwork", "FOOD-TRACE-LOT-GENEALOGY", "partial"),
  SC("iTradeNetwork", "FOOD-TRACE-PROVENANCE-VERIF", "not_supported"),

  // ===== DAIRY-MGMT =====
  // DairyComp 305 (US industry standard)
  SC("DairyComp 305", "DAIRY-MGMT-COW-LIFECYCLE", "native"),
  SC("DairyComp 305", "DAIRY-MGMT-PARLOR-INTEGRATION", "partial"),
  SC("DairyComp 305", "DAIRY-MGMT-MILK-QUALITY", "native"),
  SC("DairyComp 305", "DAIRY-MGMT-REPRODUCTION", "native"),
  SC("DairyComp 305", "DAIRY-MGMT-FEED-RATIONING", "partial"),
  SC("DairyComp 305", "DAIRY-MGMT-HERD-HEALTH", "native"),
  // BoviSync (reproduction-leaning)
  SC("BoviSync", "DAIRY-MGMT-COW-LIFECYCLE", "native"),
  SC("BoviSync", "DAIRY-MGMT-PARLOR-INTEGRATION", "partial"),
  SC("BoviSync", "DAIRY-MGMT-MILK-QUALITY", "native"),
  SC("BoviSync", "DAIRY-MGMT-REPRODUCTION", "native"),
  SC("BoviSync", "DAIRY-MGMT-FEED-RATIONING", "partial"),
  SC("BoviSync", "DAIRY-MGMT-HERD-HEALTH", "native"),
  // AfiMilk AfiFarm (parlor-first)
  SC("AfiMilk AfiFarm", "DAIRY-MGMT-COW-LIFECYCLE", "partial"),
  SC("AfiMilk AfiFarm", "DAIRY-MGMT-PARLOR-INTEGRATION", "native"),
  SC("AfiMilk AfiFarm", "DAIRY-MGMT-MILK-QUALITY", "native"),
  SC("AfiMilk AfiFarm", "DAIRY-MGMT-REPRODUCTION", "partial"),
  SC("AfiMilk AfiFarm", "DAIRY-MGMT-FEED-RATIONING", "not_supported"),
  SC("AfiMilk AfiFarm", "DAIRY-MGMT-HERD-HEALTH", "partial"),
  // Lely Horizon (robotic milking)
  SC("Lely Horizon", "DAIRY-MGMT-COW-LIFECYCLE", "native"),
  SC("Lely Horizon", "DAIRY-MGMT-PARLOR-INTEGRATION", "native", "Lely Astronaut robotic milking is core integration."),
  SC("Lely Horizon", "DAIRY-MGMT-MILK-QUALITY", "native"),
  SC("Lely Horizon", "DAIRY-MGMT-REPRODUCTION", "native"),
  SC("Lely Horizon", "DAIRY-MGMT-FEED-RATIONING", "native"),
  SC("Lely Horizon", "DAIRY-MGMT-HERD-HEALTH", "native"),
  // DeLaval DelPro (parlor + VMS)
  SC("DeLaval DelPro", "DAIRY-MGMT-COW-LIFECYCLE", "native"),
  SC("DeLaval DelPro", "DAIRY-MGMT-PARLOR-INTEGRATION", "native"),
  SC("DeLaval DelPro", "DAIRY-MGMT-MILK-QUALITY", "native"),
  SC("DeLaval DelPro", "DAIRY-MGMT-REPRODUCTION", "partial"),
  SC("DeLaval DelPro", "DAIRY-MGMT-FEED-RATIONING", "partial"),
  SC("DeLaval DelPro", "DAIRY-MGMT-HERD-HEALTH", "partial"),
  // CowManager (sensor-only, reproduction + health)
  SC("CowManager", "DAIRY-MGMT-COW-LIFECYCLE", "partial"),
  SC("CowManager", "DAIRY-MGMT-REPRODUCTION", "native"),
  SC("CowManager", "DAIRY-MGMT-HERD-HEALTH", "native"),
  SC("CowManager", "DAIRY-MGMT-PARLOR-INTEGRATION", "not_supported"),
  SC("CowManager", "DAIRY-MGMT-FEED-RATIONING", "not_supported"),
  // Allflex Livestock Intelligence (sensor + analytics)
  SC("Allflex Livestock Intelligence", "DAIRY-MGMT-REPRODUCTION", "native"),
  SC("Allflex Livestock Intelligence", "DAIRY-MGMT-HERD-HEALTH", "native"),
  SC("Allflex Livestock Intelligence", "DAIRY-MGMT-COW-LIFECYCLE", "partial"),
  SC("Allflex Livestock Intelligence", "DAIRY-MGMT-MILK-QUALITY", "partial"),
  SC("Allflex Livestock Intelligence", "DAIRY-MGMT-PARLOR-INTEGRATION", "partial"),
  // Dairy.com (supply-chain side; thin on herd mgmt)
  SC("Dairy.com Platform", "DAIRY-MGMT-MILK-QUALITY", "partial"),
  SC("Dairy.com Platform", "DAIRY-MGMT-COW-LIFECYCLE", "not_supported"),
  SC("Dairy.com Platform", "DAIRY-MGMT-PARLOR-INTEGRATION", "not_supported"),

  // ===== FSQM =====
  // TraceGains Quality Management
  SC("TraceGains Quality Management", "FSQM-HACCP-PLAN", "native"),
  SC("TraceGains Quality Management", "FSQM-CCP-MONITORING", "partial"),
  SC("TraceGains Quality Management", "FSQM-AUDIT-PREP", "native"),
  SC("TraceGains Quality Management", "FSQM-ALLERGEN-CONTROL", "partial"),
  SC("TraceGains Quality Management", "FSQM-ENVIRONMENTAL-MONITORING", "partial"),
  SC("TraceGains Quality Management", "FSQM-SUPPLIER-RISK", "native"),
  // Safefood 360
  SC("Safefood 360", "FSQM-HACCP-PLAN", "native"),
  SC("Safefood 360", "FSQM-CCP-MONITORING", "native"),
  SC("Safefood 360", "FSQM-AUDIT-PREP", "native"),
  SC("Safefood 360", "FSQM-ALLERGEN-CONTROL", "native"),
  SC("Safefood 360", "FSQM-ENVIRONMENTAL-MONITORING", "native"),
  SC("Safefood 360", "FSQM-SUPPLIER-RISK", "partial"),
  // SafetyChain
  SC("SafetyChain", "FSQM-HACCP-PLAN", "native"),
  SC("SafetyChain", "FSQM-CCP-MONITORING", "native"),
  SC("SafetyChain", "FSQM-AUDIT-PREP", "native"),
  SC("SafetyChain", "FSQM-ALLERGEN-CONTROL", "native"),
  SC("SafetyChain", "FSQM-ENVIRONMENTAL-MONITORING", "native"),
  SC("SafetyChain", "FSQM-SUPPLIER-RISK", "partial"),
  // Icicle
  SC("Icicle", "FSQM-HACCP-PLAN", "native", "AI-assisted HACCP plan generation is differentiator."),
  SC("Icicle", "FSQM-CCP-MONITORING", "partial"),
  SC("Icicle", "FSQM-AUDIT-PREP", "partial"),
  SC("Icicle", "FSQM-ALLERGEN-CONTROL", "partial"),
  SC("Icicle", "FSQM-ENVIRONMENTAL-MONITORING", "partial"),
  SC("Icicle", "FSQM-SUPPLIER-RISK", "partial"),
  // Intelex Food Safety
  SC("Intelex Food Safety", "FSQM-HACCP-PLAN", "native"),
  SC("Intelex Food Safety", "FSQM-CCP-MONITORING", "native"),
  SC("Intelex Food Safety", "FSQM-AUDIT-PREP", "native"),
  SC("Intelex Food Safety", "FSQM-ALLERGEN-CONTROL", "partial"),
  SC("Intelex Food Safety", "FSQM-ENVIRONMENTAL-MONITORING", "native"),
  SC("Intelex Food Safety", "FSQM-SUPPLIER-RISK", "native"),
  // FoodReady (SMB)
  SC("FoodReady", "FSQM-HACCP-PLAN", "native"),
  SC("FoodReady", "FSQM-CCP-MONITORING", "partial"),
  SC("FoodReady", "FSQM-AUDIT-PREP", "native"),
  SC("FoodReady", "FSQM-ALLERGEN-CONTROL", "partial"),
  SC("FoodReady", "FSQM-ENVIRONMENTAL-MONITORING", "partial"),
  SC("FoodReady", "FSQM-SUPPLIER-RISK", "not_supported"),

  // ===== FARMER-DIRECT-SALES (deep coverage) =====
  // Barn2Door (broad market leader)
  SC("Barn2Door", "FDS-CSA-MGMT", "native"),
  SC("Barn2Door", "FDS-SHARE-CUSTOMIZATION", "native"),
  SC("Barn2Door", "FDS-ROUTE-OPTIMIZATION", "native"),
  SC("Barn2Door", "FDS-DELIVERY-WINDOW-MGMT", "native"),
  SC("Barn2Door", "FDS-FARMERS-MARKET-POS", "native"),
  SC("Barn2Door", "FDS-FARMSTAND-INVENTORY", "partial"),
  SC("Barn2Door", "FDS-WHOLESALE-ORDERING", "native"),
  SC("Barn2Door", "FDS-FOODHUB-AGGREGATION", "partial"),
  SC("Barn2Door", "FDS-ONLINE-FARM-STORE", "native"),
  SC("Barn2Door", "FDS-SUBSCRIPTION-BILLING", "native"),
  SC("Barn2Door", "FDS-BUTCHER-CUT-SHEETS", "native"),
  SC("Barn2Door", "FDS-MEMBER-PORTAL", "native"),
  SC("Barn2Door", "FDS-HARVEST-FORECASTING", "partial"),
  // Local Line (wholesale-strong)
  SC("Local Line", "FDS-CSA-MGMT", "native"),
  SC("Local Line", "FDS-SHARE-CUSTOMIZATION", "native"),
  SC("Local Line", "FDS-ROUTE-OPTIMIZATION", "native"),
  SC("Local Line", "FDS-DELIVERY-WINDOW-MGMT", "native"),
  SC("Local Line", "FDS-FARMERS-MARKET-POS", "partial"),
  SC("Local Line", "FDS-FARMSTAND-INVENTORY", "partial"),
  SC("Local Line", "FDS-WHOLESALE-ORDERING", "native", "Wholesale / restaurant tier is a key differentiator."),
  SC("Local Line", "FDS-FOODHUB-AGGREGATION", "partial"),
  SC("Local Line", "FDS-ONLINE-FARM-STORE", "native"),
  SC("Local Line", "FDS-SUBSCRIPTION-BILLING", "native"),
  SC("Local Line", "FDS-BUTCHER-CUT-SHEETS", "partial"),
  SC("Local Line", "FDS-MEMBER-PORTAL", "native"),
  SC("Local Line", "FDS-HARVEST-FORECASTING", "native"),
  // GrazeCart (meat / regen-meat specialist)
  SC("GrazeCart", "FDS-CSA-MGMT", "partial"),
  SC("GrazeCart", "FDS-SHARE-CUSTOMIZATION", "partial"),
  SC("GrazeCart", "FDS-ROUTE-OPTIMIZATION", "partial"),
  SC("GrazeCart", "FDS-DELIVERY-WINDOW-MGMT", "native"),
  SC("GrazeCart", "FDS-FARMERS-MARKET-POS", "partial"),
  SC("GrazeCart", "FDS-FARMSTAND-INVENTORY", "partial"),
  SC("GrazeCart", "FDS-WHOLESALE-ORDERING", "partial"),
  SC("GrazeCart", "FDS-FOODHUB-AGGREGATION", "not_supported"),
  SC("GrazeCart", "FDS-ONLINE-FARM-STORE", "native"),
  SC("GrazeCart", "FDS-SUBSCRIPTION-BILLING", "native"),
  SC("GrazeCart", "FDS-BUTCHER-CUT-SHEETS", "native", "Whole / half / quarter-animal pre-orders and cut sheets are core to the product."),
  SC("GrazeCart", "FDS-MEMBER-PORTAL", "partial"),
  SC("GrazeCart", "FDS-HARVEST-FORECASTING", "not_supported"),
  // Harvie (share-customization specialist)
  SC("Harvie", "FDS-CSA-MGMT", "native"),
  SC("Harvie", "FDS-SHARE-CUSTOMIZATION", "native", "Per-member personalization is the platform's defining feature."),
  SC("Harvie", "FDS-ROUTE-OPTIMIZATION", "partial"),
  SC("Harvie", "FDS-DELIVERY-WINDOW-MGMT", "native"),
  SC("Harvie", "FDS-FARMERS-MARKET-POS", "not_supported"),
  SC("Harvie", "FDS-FARMSTAND-INVENTORY", "not_supported"),
  SC("Harvie", "FDS-WHOLESALE-ORDERING", "not_supported"),
  SC("Harvie", "FDS-FOODHUB-AGGREGATION", "not_supported"),
  SC("Harvie", "FDS-ONLINE-FARM-STORE", "partial"),
  SC("Harvie", "FDS-SUBSCRIPTION-BILLING", "native"),
  SC("Harvie", "FDS-BUTCHER-CUT-SHEETS", "partial"),
  SC("Harvie", "FDS-MEMBER-PORTAL", "native"),
  SC("Harvie", "FDS-HARVEST-FORECASTING", "native"),
  // Open Food Network (cooperative, food-hub-leaning)
  SC("Open Food Network", "FDS-CSA-MGMT", "native"),
  SC("Open Food Network", "FDS-SHARE-CUSTOMIZATION", "partial"),
  SC("Open Food Network", "FDS-ROUTE-OPTIMIZATION", "partial"),
  SC("Open Food Network", "FDS-DELIVERY-WINDOW-MGMT", "partial"),
  SC("Open Food Network", "FDS-FARMERS-MARKET-POS", "partial"),
  SC("Open Food Network", "FDS-FARMSTAND-INVENTORY", "not_supported"),
  SC("Open Food Network", "FDS-WHOLESALE-ORDERING", "native"),
  SC("Open Food Network", "FDS-FOODHUB-AGGREGATION", "native", "Cooperative / multi-producer aggregation is the platform's core use case."),
  SC("Open Food Network", "FDS-ONLINE-FARM-STORE", "native"),
  SC("Open Food Network", "FDS-SUBSCRIPTION-BILLING", "native"),
  SC("Open Food Network", "FDS-BUTCHER-CUT-SHEETS", "not_supported"),
  SC("Open Food Network", "FDS-MEMBER-PORTAL", "partial"),
  SC("Open Food Network", "FDS-HARVEST-FORECASTING", "partial"),
  // CSAware (CSA-only specialist)
  SC("CSAware", "FDS-CSA-MGMT", "native"),
  SC("CSAware", "FDS-SHARE-CUSTOMIZATION", "native"),
  SC("CSAware", "FDS-ROUTE-OPTIMIZATION", "partial"),
  SC("CSAware", "FDS-DELIVERY-WINDOW-MGMT", "native"),
  SC("CSAware", "FDS-FARMERS-MARKET-POS", "not_supported"),
  SC("CSAware", "FDS-FARMSTAND-INVENTORY", "not_supported"),
  SC("CSAware", "FDS-WHOLESALE-ORDERING", "partial"),
  SC("CSAware", "FDS-FOODHUB-AGGREGATION", "not_supported"),
  SC("CSAware", "FDS-ONLINE-FARM-STORE", "partial"),
  SC("CSAware", "FDS-SUBSCRIPTION-BILLING", "native"),
  SC("CSAware", "FDS-BUTCHER-CUT-SHEETS", "not_supported"),
  SC("CSAware", "FDS-MEMBER-PORTAL", "native"),
  SC("CSAware", "FDS-HARVEST-FORECASTING", "partial"),
  // Local Food Marketplace (food-hub specialist)
  SC("Local Food Marketplace", "FDS-CSA-MGMT", "partial"),
  SC("Local Food Marketplace", "FDS-SHARE-CUSTOMIZATION", "partial"),
  SC("Local Food Marketplace", "FDS-ROUTE-OPTIMIZATION", "native"),
  SC("Local Food Marketplace", "FDS-DELIVERY-WINDOW-MGMT", "native"),
  SC("Local Food Marketplace", "FDS-FARMERS-MARKET-POS", "partial"),
  SC("Local Food Marketplace", "FDS-FARMSTAND-INVENTORY", "not_supported"),
  SC("Local Food Marketplace", "FDS-WHOLESALE-ORDERING", "native"),
  SC("Local Food Marketplace", "FDS-FOODHUB-AGGREGATION", "native", "Multi-producer aggregation + producer payouts are core to the product."),
  SC("Local Food Marketplace", "FDS-ONLINE-FARM-STORE", "native"),
  SC("Local Food Marketplace", "FDS-SUBSCRIPTION-BILLING", "partial"),
  SC("Local Food Marketplace", "FDS-BUTCHER-CUT-SHEETS", "not_supported"),
  SC("Local Food Marketplace", "FDS-MEMBER-PORTAL", "partial"),
  SC("Local Food Marketplace", "FDS-HARVEST-FORECASTING", "partial"),
];

// ============================================================
// EXECUTE
// ============================================================
async function main() {
  console.log("=== Agriculture & Food Systems — Phase A load ===\n");

  // --- DOMAINS ---
  console.log("Domains...");
  const domMap = await syncTable("/domains", domains, "domain_code");

  // --- CAPABILITIES ---
  console.log("\nCapabilities...");
  const capMap = await syncTable("/capabilities", capabilities, "capability_code");

  // --- CAPABILITY_DOMAINS ---
  console.log("\nCapability-domain links...");
  const existingCapDomains = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const cdKey = (cid: number, did: number) => `${cid}:${did}`;
  const existingCdKeys = new Set(existingCapDomains.map(r => cdKey(Number(r.capability_id), Number(r.domain_id))));
  const newCd = capabilityDomains
    .map(cd => ({ capability_id: capMap.get(cd.capability_code)!, domain_id: domMap.get(cd.domain_code)! }))
    .filter(cd => !existingCdKeys.has(cdKey(cd.capability_id, cd.domain_id)));
  console.log(`  inserting ${newCd.length} capability_domains (${existingCdKeys.size} already existed)`);
  await insert("/capability_domains", newCd);

  // --- VENDORS ---
  console.log("\nVendors...");
  const vendorMap = await syncTable("/vendors", vendors, "vendor_name");

  // --- SOLUTIONS ---
  console.log("\nSolutions...");
  const solutionPayload = solutions.map(s => {
    const { vendor_name, ...rest } = s;
    return { ...rest, vendor_id: vendorMap.get(vendor_name)! };
  });
  const solMap = await syncTable("/solutions", solutionPayload, "solution_name");

  // --- SOLUTION_DOMAINS ---
  console.log("\nSolution-domain links...");
  const existingSolDomains = await get("/solution_domains?select=solution_id,domain_id&limit=10000");
  const sdKey = (sid: number, did: number) => `${sid}:${did}`;
  const existingSdKeys = new Set(existingSolDomains.map(r => sdKey(Number(r.solution_id), Number(r.domain_id))));
  const newSd = solutionDomains
    .map(sd => ({
      solution_id: solMap.get(sd.solution_name)!,
      domain_id: domMap.get(sd.domain_code)!,
      coverage_level: sd.coverage_level,
      notes: "",
    }))
    .filter(sd => !existingSdKeys.has(sdKey(sd.solution_id, sd.domain_id)));
  console.log(`  inserting ${newSd.length} solution_domains`);
  await insert("/solution_domains", newSd);

  // --- SOLUTION_CAPABILITIES ---
  console.log("\nSolution-capability matrix...");
  const existingSolCap = await get("/solution_capabilities?select=solution_id,capability_id&limit=10000");
  const scKey = (sid: number, cid: number) => `${sid}:${cid}`;
  const existingScKeys = new Set(existingSolCap.map(r => scKey(Number(r.solution_id), Number(r.capability_id))));
  const newSc = solutionCapabilities
    .map(sc => ({
      solution_id: solMap.get(sc.solution_name)!,
      capability_id: capMap.get(sc.capability_code)!,
      delivery_strength: sc.delivery_strength,
      notes: sc.notes,
    }))
    .filter(sc => !existingScKeys.has(scKey(sc.solution_id, sc.capability_id)));
  console.log(`  inserting ${newSc.length} solution_capabilities`);
  await insert("/solution_capabilities", newSc);

  // --- POST-LOAD AUDIT (rule #8) ---
  console.log("\nPost-load audit — check for any zero-metadata domains:");
  const auditRows = await get("/domains?select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m&crud_percentage=eq.0&order=id.desc&limit=50");
  if (auditRows.length === 0) {
    console.log("  ✓ no zero-metadata domains detected.");
  } else {
    console.log("  ⚠ zero-metadata rows found — fix before declaring phase done:");
    console.table(auditRows);
  }

  // --- SUMMARY ---
  console.log("\nFinal counts (Ag & Food Phase A rows):");
  const counts = {
    domains: (await get("/domains?domain_code=in.(FMIS,FOOD-TRACE,DAIRY-MGMT,FSQM,FARMER-DIRECT-SALES)&select=id")).length,
    capabilities: (await get(`/capabilities?or=(capability_code.like.FMIS-*,capability_code.like.FOOD-TRACE-*,capability_code.like.DAIRY-MGMT-*,capability_code.like.FSQM-*,capability_code.like.FDS-*)&select=id&limit=100`)).length,
    new_vendors: vendors.length,
    solutions: solutions.length,
  };
  console.table(counts);

  console.log("\nUI links:");
  console.log("  Domains:       https://tests.semantius.app/domain_map/domains");
  console.log("  Capabilities:  https://tests.semantius.app/domain_map/capabilities");
  console.log("  Vendors:       https://tests.semantius.app/domain_map/vendors");
  console.log("  Solutions:     https://tests.semantius.app/domain_map/solutions");
}

await main();
