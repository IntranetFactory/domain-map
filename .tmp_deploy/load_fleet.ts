#!/usr/bin/env bun
// Loads the Fleet Management cluster (3 domains + caps + vendors + solutions
// + Phase B data_objects/handoffs + Phase C function RACI) into the live
// `domain_map` module via the semantius CLI. Idempotent.

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
    console.log(`  ${path}: ${existing.length} already present, nothing to insert`);
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

// ============================================================
// DOMAINS (parent FLEET-MGMT loaded first; sub-domains second)
// ============================================================
const topDomain = {
  domain_code: "FLEET-MGMT",
  domain_name: "Fleet Management",
  description: "Umbrella for the operational management of vehicle fleets: vehicle inventory and lifecycle, driver assignment, fuel and expense tracking, dispatch, utilization analytics, and regulatory compliance (DOT/IFTA). Cross-industry buyer (logistics, last-mile delivery, field service, public sector, construction, utilities, rentals). Two sub-domains: TELEMATICS (the GPS/ELD/dashcam data layer) and FLEET-MAINT (preventive maintenance, work orders, parts). Vendors: Samsara, Geotab, Verizon Connect, Webfleet (Bridgestone), Trimble, Omnitracs (Solera).",
  business_logic: "Vehicle utilization scoring (idle vs productive time), fuel-card transaction matching against vehicle assignments, mileage-vs-IFTA-jurisdiction allocation, route-to-job assignment optimization, regulatory-compliance scoring (DOT, FMCSA, IFTA).",
  crud_percentage: 75,
  min_org_size: "10 xs <50",
  cost_band: "$$",
  certification_required: false,
  usa_market_size_usd_m: 4500,
  market_size_source_year: 2024,
  parent_domain_code: null as string | null,
  industry_id: null,
};

const subDomains = [
  {
    domain_code: "TELEMATICS",
    domain_name: "Vehicle Telematics",
    description: "GPS tracking, ELD (electronic logging device) compliance, driver-behavior monitoring (harsh braking, speeding, cornering), video telematics (dashcam), and engine/vehicle sensor data ingestion. The connectivity-and-data layer for fleet operations; foundation for utilization analytics, maintenance triggers, and incident-claims evidence. Distinct from FLEET-MGMT (the workflow layer above) and from generic IoT platforms (this is vehicle-specific hardware-plus-software). Vendors: Samsara (flagship), Geotab, Motive, Verizon Connect, Lytx (pure-play video), Webfleet (Bridgestone), Azuga.",
    business_logic: "GPS-trace cleaning and trip-segmentation, ELD HOS calculation per FMCSA rules, driver-behavior-score composition from sensor events, near-miss / collision detection from dashcam AI, geofence event evaluation, IFTA-jurisdiction allocation from GPS traces.",
    crud_percentage: 55,
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 3200,
    market_size_source_year: 2024,
    parent_domain_code: "FLEET-MGMT",
    industry_id: null,
  },
  {
    domain_code: "FLEET-MAINT",
    domain_name: "Fleet Maintenance Management",
    description: "Preventive-maintenance scheduling (mileage / engine-hours / time triggers), vehicle work-order management, parts inventory and consumption, mechanic/shop assignment, warranty tracking, and DOT/DVIR inspection workflow. Distinct from EAM (vehicles are mobile assets with telematics triggers; EAM targets fixed plant) and from FSM (FSM dispatches technicians to customers; this dispatches mechanics to internal vehicles). Vendors: Fleetio (flagship pure-play), AssetWorks FleetFocus (public sector), Whip Around (inspection-first), RTA Fleet Management, Dossier Systems.",
    business_logic: "PM-schedule generation from telematics triggers (engine hours, mileage thresholds, DTC codes), parts BOM matching to vehicle make/model/year, warranty-claim eligibility computation, mechanic-skill matching to work-order type, DVIR-defect-to-work-order routing.",
    crud_percentage: 85,
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 1100,
    market_size_source_year: 2024,
    parent_domain_code: "FLEET-MGMT",
    industry_id: null,
  },
];

[topDomain, ...subDomains].forEach(validateDomainRow);

// ============================================================
// CAPABILITIES (18, 6 per domain)
// ============================================================
const capabilities = [
  // FLEET-MGMT
  { capability_code: "FLEET-VEHICLE-INVENTORY", capability_name: "Vehicle Inventory and Lifecycle", description: "Vehicle master record (VIN, make/model/year, registration, title, fuel type, EV battery), lifecycle stages (acquired/in-service/in-shop/retired/disposed), and end-of-life disposition tracking." },
  { capability_code: "FLEET-DRIVER-MGMT", capability_name: "Driver Management", description: "Driver master records: license class and expiration, medical card, training records, vehicle-assignment history, hours-of-service status (where applicable), and disciplinary records." },
  { capability_code: "FLEET-FUEL-MGMT", capability_name: "Fuel and Expense Management", description: "Fuel-card transaction ingestion, exception detection (out-of-route fueling, capacity overruns), mpg trending by vehicle and driver, alternative-fuel (EV charging) cost allocation." },
  { capability_code: "FLEET-DISPATCH", capability_name: "Fleet Dispatch and Assignment", description: "Vehicle-to-job and vehicle-to-driver assignment, daily route boards, capacity matching, and cross-base relocation planning." },
  { capability_code: "FLEET-UTILIZATION", capability_name: "Fleet Utilization Analytics", description: "Productive-time vs idle vs deadhead analytics, right-sizing recommendations, cost-per-mile and cost-per-hour benchmarking against industry baselines." },
  { capability_code: "FLEET-COMPLIANCE", capability_name: "Fleet Regulatory Compliance", description: "DOT registration, IFTA fuel-tax reporting, IRP apportioned registration, CSA scoring, IFTA jurisdiction-mile reporting, and audit-evidence retention." },
  // TELEMATICS
  { capability_code: "TEL-GPS-TRACKING", capability_name: "Real-Time GPS Tracking", description: "Continuous vehicle-location tracking via OBD/AOBRD/embedded telematics, breadcrumb trail storage, and live-map visualization with playback." },
  { capability_code: "TEL-ELD-HOS", capability_name: "ELD and Hours-of-Service Compliance", description: "Automatic-on-board recording of driving time per FMCSA Part 395 rules, HOS-rule conformance (11-hour driving, 14-hour duty, 70/8 cycles), driver vehicle-inspection-report (DVIR) capture, and roadside-inspection-mode output." },
  { capability_code: "TEL-DRIVER-BEHAVIOR", capability_name: "Driver Behavior Monitoring", description: "Telemetry-derived event detection (harsh braking, hard acceleration, cornering, speeding, fatigue), composite safety scoring, and per-driver coaching playlists." },
  { capability_code: "TEL-DASHCAM-VIDEO", capability_name: "Video Telematics and Dashcam", description: "Forward-facing and driver-facing video capture, AI-based incident detection (distracted driving, collision, near-miss), automatic clip upload on trigger, and incident review workflow." },
  { capability_code: "TEL-GEOFENCING", capability_name: "Geofencing and Location Alerts", description: "Polygon and route-based geofence definition, entry/exit/dwell alerts, after-hours-use detection, and route-deviation alerting." },
  { capability_code: "TEL-VEHICLE-DIAG", capability_name: "Vehicle Diagnostics", description: "Engine fault-code (DTC) ingestion via OBD-II/J1939, vehicle-health scoring, real-time fault alerting, and historical fault trending per vehicle." },
  // FLEET-MAINT
  { capability_code: "FM-PM-SCHEDULING", capability_name: "Preventive Maintenance Scheduling", description: "PM-schedule definition per vehicle class with triggers on mileage, engine hours, calendar time, or DTC codes; auto-generation of work orders ahead of due dates; deferred-maintenance tracking." },
  { capability_code: "FM-WORK-ORDER", capability_name: "Vehicle Work Order Management", description: "Work-order intake (from inspection, telematics trigger, or driver report), task-line composition with labor estimates, in-shop vs out-of-shop routing, completion sign-off, and post-repair quality check." },
  { capability_code: "FM-PARTS-INV", capability_name: "Parts Inventory Management", description: "Parts master with cross-reference to vehicle make/model/year, on-hand stock and reorder thresholds per location, parts-consumption against work orders, and supplier integration for parts ordering." },
  { capability_code: "FM-MECHANIC-MGMT", capability_name: "Mechanic and Shop Management", description: "Mechanic-skill profile and certification tracking, shop-bay scheduling, technician-time capture by work order, productivity (wrench-time) analytics." },
  { capability_code: "FM-WARRANTY", capability_name: "Warranty and Recall Tracking", description: "OEM-warranty coverage tracking per VIN, eligible-claim identification on repair events, recall notification ingestion from NHTSA, and recall-completion tracking across fleet." },
  { capability_code: "FM-INSPECTION-DVIR", capability_name: "Vehicle Inspections and DVIR", description: "Pre-trip and post-trip driver vehicle inspection report (DVIR) capture via mobile, defect routing to maintenance work orders, mandated retention and audit-ready reporting." },
];

const capabilityDomains = [
  ...["FLEET-VEHICLE-INVENTORY", "FLEET-DRIVER-MGMT", "FLEET-FUEL-MGMT", "FLEET-DISPATCH", "FLEET-UTILIZATION", "FLEET-COMPLIANCE"].map(c => ({ capability_code: c, domain_code: "FLEET-MGMT" })),
  ...["TEL-GPS-TRACKING", "TEL-ELD-HOS", "TEL-DRIVER-BEHAVIOR", "TEL-DASHCAM-VIDEO", "TEL-GEOFENCING", "TEL-VEHICLE-DIAG"].map(c => ({ capability_code: c, domain_code: "TELEMATICS" })),
  ...["FM-PM-SCHEDULING", "FM-WORK-ORDER", "FM-PARTS-INV", "FM-MECHANIC-MGMT", "FM-WARRANTY", "FM-INSPECTION-DVIR"].map(c => ({ capability_code: c, domain_code: "FLEET-MAINT" })),
];

// ============================================================
// VENDORS (11 new)
// ============================================================
const vendors = [
  { vendor_name: "Samsara", vendor_url: "https://www.samsara.com", headquarters_country: "USA", description: "Connected-operations platform vendor: telematics, video, environmental sensors, equipment monitoring; flagship spans fleet, equipment, and site safety.", notes: "Public (NYSE: IOT), founded 2015 by Nest co-founders." },
  { vendor_name: "Geotab", vendor_url: "https://www.geotab.com", headquarters_country: "Canada", description: "Telematics and fleet-management platform vendor; MyGeotab is the OEM-grade connected-vehicle data platform.", notes: "Private; one of largest commercial telematics installed bases globally." },
  { vendor_name: "Motive", vendor_url: "https://gomotive.com", headquarters_country: "USA", description: "Fleet-management and ELD vendor (formerly KeepTruckin); strong in long-haul trucking and SMB fleets.", notes: "Renamed from KeepTruckin in 2022." },
  { vendor_name: "Verizon Connect", vendor_url: "https://www.verizonconnect.com", headquarters_country: "USA", description: "Fleet-and-mobile-workforce platform from Verizon (formed by combining Fleetmatics, Telogis, Networkfleet acquisitions).", notes: "Subsidiary of Verizon Communications." },
  { vendor_name: "Trimble Inc", vendor_url: "https://www.trimble.com", headquarters_country: "USA", description: "Positioning, modeling, and connected-workflow vendor across construction, transportation, and geospatial; Trimble Transportation covers heavy-duty fleet and TMS.", notes: "Public (NASDAQ: TRMB)." },
  { vendor_name: "Lytx", vendor_url: "https://www.lytx.com", headquarters_country: "USA", description: "Video-telematics pure-play; DriveCam is the AI-camera and driver-coaching platform.", notes: "Acquired by Permira 2020." },
  { vendor_name: "Solera", vendor_url: "https://www.solera.com", headquarters_country: "USA", description: "Vehicle-lifecycle data conglomerate (Omnitracs, AutoPoint, DealerSocket, Audatex, ClaimXperience); Omnitracs is the long-haul fleet platform.", notes: "Omnitracs acquired 2021; private under Vista Equity Partners." },
  { vendor_name: "Bridgestone", vendor_url: "https://www.bridgestone.com", headquarters_country: "Japan", description: "Tire and mobility-solutions giant; owner of Webfleet (telematics) and Azuga (SMB fleet/telematics).", notes: "Webfleet acquired from TomTom 2019; Azuga 2021." },
  { vendor_name: "Fleetio", vendor_url: "https://www.fleetio.com", headquarters_country: "USA", description: "Fleet-maintenance and operations platform vendor; flagship is the pure-play SMB-friendly maintenance + fuel + inspection solution.", notes: "Acquired Auto Integrate 2022." },
  { vendor_name: "AssetWorks", vendor_url: "https://www.assetworks.com", headquarters_country: "USA", description: "Asset-and-fleet-management vendor with strong public-sector (municipal, university, transit) installed base (FleetFocus, FuelFocus, M5).", notes: "" },
  { vendor_name: "Whip Around", vendor_url: "https://whiparound.com", headquarters_country: "New Zealand", description: "Mobile-first fleet inspection and maintenance vendor; DVIR-led entry, expanding to PM and work-order management.", notes: "" },
];

// ============================================================
// SOLUTIONS (12)
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
  { solution_name: "Samsara Connected Operations Platform", vendor_name: "Samsara", description: "Cloud platform combining vehicle telematics, AI dashcams, equipment monitoring, site visibility, and fleet workflow; spans fleet-mgmt, telematics, and maintenance modules.", solution_url: "https://www.samsara.com/products/", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "50 xl 10000+", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Geotab MyGeotab", vendor_name: "Geotab", description: "Open telematics platform with rich device ecosystem, Marketplace add-ons, fleet-management workflows, and benchmarking insights.", solution_url: "https://www.geotab.com/mygeotab/", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "50 xl 10000+", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Motive Fleet Platform", vendor_name: "Motive", description: "ELD-led fleet platform with AI dashcam, dispatch, fuel-card, and driver-safety modules; strong long-haul-trucking adoption.", solution_url: "https://gomotive.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Verizon Connect Reveal", vendor_name: "Verizon Connect", description: "Fleet and mobile-workforce platform with GPS tracking, AI dashcam (Integrated Video), driver workflow, and field-service integration.", solution_url: "https://www.verizonconnect.com/solutions/reveal/", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Webfleet", vendor_name: "Bridgestone", description: "European-leader fleet-management and telematics platform (originally TomTom Telematics); now Bridgestone Mobility Solutions.", solution_url: "https://www.webfleet.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Azuga Fleet", vendor_name: "Bridgestone", description: "SMB-focused fleet-and-telematics platform; GPS, driver behavior, fuel-card, and basic maintenance.", solution_url: "https://www.azuga.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Trimble Transportation", vendor_name: "Trimble Inc", description: "Heavy-duty trucking platform (PeopleNet, TMW, Transics): TMS, ELD/telematics, driver workflow, fleet maintenance.", solution_url: "https://transportation.trimble.com", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Omnitracs One", vendor_name: "Solera", description: "Long-haul / commercial trucking platform: ELD, route optimization, driver workflow, safety, and maintenance.", solution_url: "https://www.omnitracs.com", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Lytx DriveCam", vendor_name: "Lytx", description: "Video-telematics pure-play with AI-detected risky-behavior coaching, exoneration evidence, and continual learning models.", solution_url: "https://www.lytx.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "50 xl 10000+", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Fleetio", vendor_name: "Fleetio", description: "Pure-play fleet maintenance and operations platform: vehicle records, PM scheduling, work orders, parts, fuel imports, mobile inspections.", solution_url: "https://www.fleetio.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "AssetWorks FleetFocus", vendor_name: "AssetWorks", description: "Enterprise fleet-maintenance platform with strong public-sector footprint; integrated with FuelFocus and KeyValet.", solution_url: "https://www.assetworks.com/solutions/fleet-management/", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Whip Around", vendor_name: "Whip Around", description: "Inspection-first fleet maintenance platform; DVIR mobile, defect-to-work-order routing, PM scheduling.", solution_url: "https://whiparound.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
];

// ============================================================
// SOLUTION_DOMAINS
// ============================================================
type SolDomain = { solution_name: string; domain_code: string; coverage_level: string };
const solutionDomains: SolDomain[] = [
  // Connected-operations broad-platform vendors — primary on FLEET-MGMT + TELEMATICS, secondary on FLEET-MAINT
  { solution_name: "Samsara Connected Operations Platform", domain_code: "FLEET-MGMT", coverage_level: "primary" },
  { solution_name: "Samsara Connected Operations Platform", domain_code: "TELEMATICS", coverage_level: "primary" },
  { solution_name: "Samsara Connected Operations Platform", domain_code: "FLEET-MAINT", coverage_level: "secondary" },
  { solution_name: "Geotab MyGeotab", domain_code: "FLEET-MGMT", coverage_level: "primary" },
  { solution_name: "Geotab MyGeotab", domain_code: "TELEMATICS", coverage_level: "primary" },
  { solution_name: "Geotab MyGeotab", domain_code: "FLEET-MAINT", coverage_level: "secondary" },
  { solution_name: "Motive Fleet Platform", domain_code: "TELEMATICS", coverage_level: "primary" },
  { solution_name: "Motive Fleet Platform", domain_code: "FLEET-MGMT", coverage_level: "primary" },
  { solution_name: "Verizon Connect Reveal", domain_code: "FLEET-MGMT", coverage_level: "primary" },
  { solution_name: "Verizon Connect Reveal", domain_code: "TELEMATICS", coverage_level: "primary" },
  { solution_name: "Webfleet", domain_code: "FLEET-MGMT", coverage_level: "primary" },
  { solution_name: "Webfleet", domain_code: "TELEMATICS", coverage_level: "primary" },
  { solution_name: "Azuga Fleet", domain_code: "FLEET-MGMT", coverage_level: "primary" },
  { solution_name: "Azuga Fleet", domain_code: "TELEMATICS", coverage_level: "secondary" },
  { solution_name: "Trimble Transportation", domain_code: "FLEET-MGMT", coverage_level: "primary" },
  { solution_name: "Trimble Transportation", domain_code: "TELEMATICS", coverage_level: "primary" },
  { solution_name: "Trimble Transportation", domain_code: "FLEET-MAINT", coverage_level: "secondary" },
  { solution_name: "Omnitracs One", domain_code: "FLEET-MGMT", coverage_level: "primary" },
  { solution_name: "Omnitracs One", domain_code: "TELEMATICS", coverage_level: "primary" },
  // Pure-play video telematics
  { solution_name: "Lytx DriveCam", domain_code: "TELEMATICS", coverage_level: "primary" },
  // Pure-play maintenance
  { solution_name: "Fleetio", domain_code: "FLEET-MAINT", coverage_level: "primary" },
  { solution_name: "Fleetio", domain_code: "FLEET-MGMT", coverage_level: "secondary" },
  { solution_name: "AssetWorks FleetFocus", domain_code: "FLEET-MAINT", coverage_level: "primary" },
  { solution_name: "AssetWorks FleetFocus", domain_code: "FLEET-MGMT", coverage_level: "secondary" },
  { solution_name: "Whip Around", domain_code: "FLEET-MAINT", coverage_level: "primary" },
];

// ============================================================
// SOLUTION_CAPABILITIES (focused matrix)
// ============================================================
type SolCap = { solution_name: string; capability_code: string; delivery_strength: string; notes: string };
const SC = (sol: string, capCode: string, strength: string, notes = ""): SolCap =>
  ({ solution_name: sol, capability_code: capCode, delivery_strength: strength, notes });

const solutionCapabilities: SolCap[] = [
  // Samsara — broad coverage
  SC("Samsara Connected Operations Platform", "FLEET-VEHICLE-INVENTORY", "native"),
  SC("Samsara Connected Operations Platform", "FLEET-DRIVER-MGMT", "native"),
  SC("Samsara Connected Operations Platform", "FLEET-FUEL-MGMT", "native"),
  SC("Samsara Connected Operations Platform", "FLEET-DISPATCH", "partial"),
  SC("Samsara Connected Operations Platform", "FLEET-UTILIZATION", "native"),
  SC("Samsara Connected Operations Platform", "FLEET-COMPLIANCE", "native"),
  SC("Samsara Connected Operations Platform", "TEL-GPS-TRACKING", "native"),
  SC("Samsara Connected Operations Platform", "TEL-ELD-HOS", "native"),
  SC("Samsara Connected Operations Platform", "TEL-DRIVER-BEHAVIOR", "native"),
  SC("Samsara Connected Operations Platform", "TEL-DASHCAM-VIDEO", "native"),
  SC("Samsara Connected Operations Platform", "TEL-GEOFENCING", "native"),
  SC("Samsara Connected Operations Platform", "TEL-VEHICLE-DIAG", "native"),
  SC("Samsara Connected Operations Platform", "FM-PM-SCHEDULING", "native"),
  SC("Samsara Connected Operations Platform", "FM-WORK-ORDER", "partial"),
  SC("Samsara Connected Operations Platform", "FM-INSPECTION-DVIR", "native"),
  // Geotab — telematics depth + ecosystem
  SC("Geotab MyGeotab", "FLEET-VEHICLE-INVENTORY", "native"),
  SC("Geotab MyGeotab", "FLEET-DRIVER-MGMT", "native"),
  SC("Geotab MyGeotab", "FLEET-FUEL-MGMT", "via_extension"),
  SC("Geotab MyGeotab", "FLEET-UTILIZATION", "native"),
  SC("Geotab MyGeotab", "FLEET-COMPLIANCE", "native"),
  SC("Geotab MyGeotab", "TEL-GPS-TRACKING", "native"),
  SC("Geotab MyGeotab", "TEL-ELD-HOS", "native"),
  SC("Geotab MyGeotab", "TEL-DRIVER-BEHAVIOR", "native"),
  SC("Geotab MyGeotab", "TEL-DASHCAM-VIDEO", "via_extension"),
  SC("Geotab MyGeotab", "TEL-GEOFENCING", "native"),
  SC("Geotab MyGeotab", "TEL-VEHICLE-DIAG", "native"),
  SC("Geotab MyGeotab", "FM-PM-SCHEDULING", "via_extension"),
  SC("Geotab MyGeotab", "FM-INSPECTION-DVIR", "native"),
  // Motive — ELD strength
  SC("Motive Fleet Platform", "TEL-ELD-HOS", "native"),
  SC("Motive Fleet Platform", "TEL-GPS-TRACKING", "native"),
  SC("Motive Fleet Platform", "TEL-DRIVER-BEHAVIOR", "native"),
  SC("Motive Fleet Platform", "TEL-DASHCAM-VIDEO", "native"),
  SC("Motive Fleet Platform", "FLEET-DRIVER-MGMT", "native"),
  SC("Motive Fleet Platform", "FLEET-DISPATCH", "native"),
  SC("Motive Fleet Platform", "FLEET-FUEL-MGMT", "native"),
  SC("Motive Fleet Platform", "FM-PM-SCHEDULING", "partial"),
  // Verizon Connect Reveal
  SC("Verizon Connect Reveal", "TEL-GPS-TRACKING", "native"),
  SC("Verizon Connect Reveal", "TEL-ELD-HOS", "native"),
  SC("Verizon Connect Reveal", "TEL-DRIVER-BEHAVIOR", "native"),
  SC("Verizon Connect Reveal", "TEL-DASHCAM-VIDEO", "native"),
  SC("Verizon Connect Reveal", "FLEET-DRIVER-MGMT", "native"),
  SC("Verizon Connect Reveal", "FLEET-DISPATCH", "native"),
  SC("Verizon Connect Reveal", "FLEET-COMPLIANCE", "native"),
  // Webfleet
  SC("Webfleet", "TEL-GPS-TRACKING", "native"),
  SC("Webfleet", "TEL-ELD-HOS", "partial", "EU tachograph stronger than US ELD"),
  SC("Webfleet", "TEL-DRIVER-BEHAVIOR", "native"),
  SC("Webfleet", "FLEET-FUEL-MGMT", "native"),
  SC("Webfleet", "FLEET-COMPLIANCE", "native"),
  // Azuga Fleet
  SC("Azuga Fleet", "TEL-GPS-TRACKING", "native"),
  SC("Azuga Fleet", "TEL-DRIVER-BEHAVIOR", "native"),
  SC("Azuga Fleet", "FLEET-FUEL-MGMT", "native"),
  SC("Azuga Fleet", "FLEET-DISPATCH", "partial"),
  // Trimble Transportation — heavy duty
  SC("Trimble Transportation", "TEL-GPS-TRACKING", "native"),
  SC("Trimble Transportation", "TEL-ELD-HOS", "native"),
  SC("Trimble Transportation", "FLEET-DISPATCH", "native"),
  SC("Trimble Transportation", "FLEET-COMPLIANCE", "native"),
  SC("Trimble Transportation", "FM-WORK-ORDER", "native"),
  SC("Trimble Transportation", "FM-PM-SCHEDULING", "native"),
  // Omnitracs One — long haul
  SC("Omnitracs One", "TEL-ELD-HOS", "native"),
  SC("Omnitracs One", "TEL-GPS-TRACKING", "native"),
  SC("Omnitracs One", "TEL-DRIVER-BEHAVIOR", "native"),
  SC("Omnitracs One", "FLEET-DRIVER-MGMT", "native"),
  SC("Omnitracs One", "FLEET-COMPLIANCE", "native"),
  // Lytx DriveCam — video pure-play
  SC("Lytx DriveCam", "TEL-DASHCAM-VIDEO", "native"),
  SC("Lytx DriveCam", "TEL-DRIVER-BEHAVIOR", "native"),
  SC("Lytx DriveCam", "TEL-GPS-TRACKING", "partial"),
  SC("Lytx DriveCam", "TEL-ELD-HOS", "not_supported"),
  // Fleetio — pure-play maintenance
  SC("Fleetio", "FM-PM-SCHEDULING", "native"),
  SC("Fleetio", "FM-WORK-ORDER", "native"),
  SC("Fleetio", "FM-PARTS-INV", "native"),
  SC("Fleetio", "FM-MECHANIC-MGMT", "native"),
  SC("Fleetio", "FM-WARRANTY", "native"),
  SC("Fleetio", "FM-INSPECTION-DVIR", "native"),
  SC("Fleetio", "FLEET-VEHICLE-INVENTORY", "native"),
  SC("Fleetio", "FLEET-FUEL-MGMT", "native"),
  SC("Fleetio", "TEL-GPS-TRACKING", "via_extension", "Geotab/Samsara integrations"),
  // AssetWorks FleetFocus — public sector enterprise
  SC("AssetWorks FleetFocus", "FM-PM-SCHEDULING", "native"),
  SC("AssetWorks FleetFocus", "FM-WORK-ORDER", "native"),
  SC("AssetWorks FleetFocus", "FM-PARTS-INV", "native"),
  SC("AssetWorks FleetFocus", "FM-MECHANIC-MGMT", "native"),
  SC("AssetWorks FleetFocus", "FM-WARRANTY", "native"),
  SC("AssetWorks FleetFocus", "FLEET-VEHICLE-INVENTORY", "native"),
  SC("AssetWorks FleetFocus", "FLEET-FUEL-MGMT", "native", "FuelFocus module"),
  // Whip Around
  SC("Whip Around", "FM-INSPECTION-DVIR", "native"),
  SC("Whip Around", "FM-WORK-ORDER", "native"),
  SC("Whip Around", "FM-PM-SCHEDULING", "native"),
];

// ============================================================
// PHASE B — DATA OBJECTS
// ============================================================
const dataObjects = [
  { data_object_name: "vehicles", singular_label: "Vehicle", plural_label: "Vehicles", display_label: "Vehicle", description: "Fleet vehicle master record: VIN, make/model/year, registration, fuel type (ICE/EV/hybrid), in-service date, assigned base/depot, current lifecycle status. The anchor of fleet management." },
  { data_object_name: "drivers", singular_label: "Driver", plural_label: "Drivers", display_label: "Driver", description: "Person authorized to operate fleet vehicles: license class and expiration, medical card status, training/certifications, employer (employee or contractor), HOS status. Multi-master with `employees` for employed drivers; contractors are driver-only." },
  { data_object_name: "fuel_transactions", singular_label: "Fuel Transaction", plural_label: "Fuel Transactions", display_label: "Fuel Transaction", description: "Fuel-card or charging-network transaction: vehicle, driver, fuel type and quantity, cost, location, time. Matched against vehicle assignments for IFTA reporting and exception detection." },
  { data_object_name: "fleet_assignments", singular_label: "Fleet Assignment", plural_label: "Fleet Assignments", display_label: "Fleet Assignment", description: "Time-bound assignment of a vehicle to a driver, a route, or a job; carries start/end time, purpose, expected mileage." },
  { data_object_name: "vehicle_inspections", singular_label: "Vehicle Inspection", plural_label: "Vehicle Inspections", display_label: "Vehicle Inspection", description: "Driver Vehicle Inspection Report (DVIR) record: pre-trip or post-trip, defects identified, photos, driver signature. Defects route to maintenance work orders." },
  { data_object_name: "vehicle_trips", singular_label: "Vehicle Trip", plural_label: "Vehicle Trips", display_label: "Vehicle Trip", description: "GPS-segmented trip record: start/end timestamps, route trace, distance, duration, idle time, jurisdictions (for IFTA), driver. Built from raw telemetry by the platform." },
  { data_object_name: "driver_behavior_events", singular_label: "Driver Behavior Event", plural_label: "Driver Behavior Events", display_label: "Driver Behavior Event", description: "Telemetry-detected risky-event record: harsh braking, hard acceleration, cornering, speeding, fatigue, or distraction. Carries severity, location, video clip reference (when dashcam present)." },
  { data_object_name: "eld_logs", singular_label: "ELD Log", plural_label: "ELD Logs", display_label: "ELD Log", description: "Electronic Logging Device hours-of-service record per FMCSA Part 395: driving / on-duty / off-duty / sleeper-berth status changes, supporting roadside-inspection mode." },
  { data_object_name: "dashcam_events", singular_label: "Dashcam Event", plural_label: "Dashcam Events", display_label: "Dashcam Event", description: "Video-telematics incident record: AI-detected event (collision, near-miss, distracted driving), video clip(s), driver, vehicle, timestamp, severity. Feeds insurance claims and safety coaching." },
  { data_object_name: "vehicle_work_orders", singular_label: "Vehicle Work Order", plural_label: "Vehicle Work Orders", display_label: "Vehicle Work Order", description: "Maintenance or repair work order for a fleet vehicle: triggered by PM schedule, telematics fault, or inspection defect; task lines with labor and parts; assigned mechanic and shop; status lifecycle. Distinct from FSM customer-facing work orders." },
  { data_object_name: "preventive_maintenance_schedules", singular_label: "Preventive Maintenance Schedule", plural_label: "Preventive Maintenance Schedules", display_label: "Preventive Maintenance Schedule", description: "Per-vehicle-class PM schedule template: trigger basis (mileage / engine hours / calendar time / DTC), task list, due-date generation rules." },
];

type DDO = { domain_code: string; data_object_name: string; role: string; notes: string };
const domainDataObjects: DDO[] = [
  // FLEET-MGMT masters core fleet entities
  { domain_code: "FLEET-MGMT", data_object_name: "vehicles", role: "master", notes: "Vehicle master record; sub-domains TELEMATICS and FLEET-MAINT contribute event and maintenance data against it." },
  { domain_code: "FLEET-MGMT", data_object_name: "drivers", role: "master", notes: "Driver records held in fleet-mgmt platform; co-master with HCM `employees` for employed drivers." },
  { domain_code: "FLEET-MGMT", data_object_name: "fuel_transactions", role: "master", notes: "Fuel-card ingestion mastered in fleet-mgmt; ERP-FIN consumes for accounting." },
  { domain_code: "FLEET-MGMT", data_object_name: "fleet_assignments", role: "master", notes: "Vehicle-driver-job time-bound assignment records." },
  { domain_code: "FLEET-MGMT", data_object_name: "vehicle_inspections", role: "master", notes: "DVIR records; defects route into FLEET-MAINT work orders." },
  { domain_code: "FLEET-MGMT", data_object_name: "employees", role: "contributor", notes: "Employed drivers contribute driver records back to HCM employees." },
  // TELEMATICS — masters event/telemetry records, consumes vehicles
  { domain_code: "TELEMATICS", data_object_name: "vehicle_trips", role: "master", notes: "GPS-segmented trip records derived from raw telemetry." },
  { domain_code: "TELEMATICS", data_object_name: "driver_behavior_events", role: "master", notes: "Risky-behavior event detection from telemetry + AI." },
  { domain_code: "TELEMATICS", data_object_name: "eld_logs", role: "master", notes: "FMCSA-compliant HOS records." },
  { domain_code: "TELEMATICS", data_object_name: "dashcam_events", role: "master", notes: "Video-incident records." },
  { domain_code: "TELEMATICS", data_object_name: "vehicles", role: "consumer", notes: "Vehicle master referenced for telemetry ingestion." },
  { domain_code: "TELEMATICS", data_object_name: "drivers", role: "consumer", notes: "Driver master referenced for HOS and behavior attribution." },
  // FLEET-MAINT — masters maintenance records
  { domain_code: "FLEET-MAINT", data_object_name: "vehicle_work_orders", role: "master", notes: "Vehicle maintenance/repair work orders." },
  { domain_code: "FLEET-MAINT", data_object_name: "preventive_maintenance_schedules", role: "master", notes: "PM-schedule templates per vehicle class." },
  { domain_code: "FLEET-MAINT", data_object_name: "vehicles", role: "consumer", notes: "Maintenance against the vehicle master." },
  { domain_code: "FLEET-MAINT", data_object_name: "vehicle_inspections", role: "consumer", notes: "Inspection defects routed in from FLEET-MGMT." },
];

// trigger_events
type TriggerEvent = {
  event_name: string;
  data_object_name: string;
  event_category: string;
  from_state: string;
  to_state: string;
  description: string;
};
const triggerEvents: TriggerEvent[] = [
  { event_name: "vehicle_trip.completed", data_object_name: "vehicle_trips", event_category: "lifecycle", from_state: "in_progress", to_state: "completed", description: "Vehicle trip has ended (engine off, idle threshold, or geofence exit). Triggers utilization update, fuel-trip reconciliation, and IFTA jurisdiction allocation." },
  { event_name: "driver_behavior_event.triggered", data_object_name: "driver_behavior_events", event_category: "signal", from_state: "", to_state: "triggered", description: "Telematics-detected risky-behavior event (harsh brake, speeding, fatigue). Feeds driver-safety scoring and coaching workflow; severe events escalate to fleet-manager review." },
  { event_name: "eld_log.violation_detected", data_object_name: "eld_logs", event_category: "threshold", from_state: "", to_state: "violation", description: "HOS rule violation detected (e.g. driving over 11-hour limit, missed 30-min break). Triggers driver alert, dispatcher reroute, and DOT-compliance log entry." },
  { event_name: "dashcam_event.collision", data_object_name: "dashcam_events", event_category: "signal", from_state: "", to_state: "collision", description: "Dashcam AI detected a likely collision or significant impact. Triggers safety-manager notification, video preservation, and potential insurance first-notice-of-loss." },
  { event_name: "vehicle_inspection.failed", data_object_name: "vehicle_inspections", event_category: "state_change", from_state: "pending", to_state: "failed", description: "DVIR found one or more defects requiring repair. Routes to FLEET-MAINT for work-order creation; severe defects ground the vehicle." },
  { event_name: "preventive_maintenance.due", data_object_name: "preventive_maintenance_schedules", event_category: "threshold", from_state: "", to_state: "due", description: "PM trigger has fired (mileage, engine hours, calendar, or DTC code). Triggers work-order auto-generation and shop scheduling." },
  { event_name: "vehicle_work_order.completed", data_object_name: "vehicle_work_orders", event_category: "lifecycle", from_state: "in_progress", to_state: "completed", description: "Vehicle work order has been completed. Triggers invoice creation, parts-consumption update, vehicle return-to-service, and warranty-claim eligibility check." },
  { event_name: "fuel_transaction.posted", data_object_name: "fuel_transactions", event_category: "lifecycle", from_state: "", to_state: "posted", description: "Fuel-card transaction has been ingested and matched to vehicle/driver. Triggers expense-account posting and exception detection (out-of-route, capacity overflow)." },
  { event_name: "vehicle.dispatched", data_object_name: "fleet_assignments", event_category: "state_change", from_state: "assigned", to_state: "dispatched", description: "Vehicle has been dispatched on an assignment (FSM job, route, delivery). Triggers telematics-tracking activation against this assignment context." },
];

type Handoff = {
  source_domain_code: string;
  target_domain_code: string;
  data_object_name: string;
  trigger_event_name: string;
  integration_pattern: string;
  friction_level: string;
  description: string;
  notes: string;
};
const handoffs: Handoff[] = [
  // TELEMATICS → FLEET-MAINT (the central platform value)
  {
    source_domain_code: "TELEMATICS", target_domain_code: "FLEET-MAINT", data_object_name: "preventive_maintenance_schedules",
    trigger_event_name: "preventive_maintenance.due", integration_pattern: "api_call", friction_level: "medium",
    description: "Telematics-tracked mileage / engine hours / fault codes trigger PM-schedule firings that auto-generate vehicle work orders in the maintenance system.",
    notes: "Cross-vendor stack — Samsara/Geotab on telematics side, Fleetio/AssetWorks on maintenance side; identifier reconciliation on vehicle id is the common pain point.",
  },
  {
    source_domain_code: "FLEET-MGMT", target_domain_code: "FLEET-MAINT", data_object_name: "vehicle_inspections",
    trigger_event_name: "vehicle_inspection.failed", integration_pattern: "api_call", friction_level: "medium",
    description: "Failed DVIR inspection defects route to FLEET-MAINT as a new vehicle work order with the defect description and severity.",
    notes: "Whip Around solves this in-platform; cross-vendor fails when DVIR app and maintenance system are different vendors.",
  },
  // TELEMATICS → GRC (DOT / FMCSA compliance)
  {
    source_domain_code: "TELEMATICS", target_domain_code: "GRC", data_object_name: "eld_logs",
    trigger_event_name: "eld_log.violation_detected", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Hours-of-service violations accumulate into CSA/FMCSA-scoring data feeds; aggregated patterns surface in GRC compliance dashboards.",
    notes: "DOT-audit-relevant; missing violations can trigger CSA score downgrade.",
  },
  // TELEMATICS → INS-CLAIMS (collision exoneration / FNOL)
  {
    source_domain_code: "TELEMATICS", target_domain_code: "INS-CLAIMS", data_object_name: "dashcam_events",
    trigger_event_name: "dashcam_event.collision", integration_pattern: "manual_handoff", friction_level: "high",
    description: "Dashcam-detected collisions trigger insurance first-notice-of-loss; video evidence is preserved and shared with the carrier or claims platform.",
    notes: "Multi-shape: cross-vendor-stack (telematics vendor vs carrier-claims system) + manual handoff (videos typically downloaded and emailed). Lytx and Samsara have begun direct carrier integrations but most fleets still email clips.",
  },
  // FLEET-MAINT → AP-AUTO
  {
    source_domain_code: "FLEET-MAINT", target_domain_code: "AP-AUTO", data_object_name: "vehicle_work_orders",
    trigger_event_name: "vehicle_work_order.completed", integration_pattern: "api_call", friction_level: "medium",
    description: "Completed external work orders (3rd-party shops) generate parts/labor invoices that flow into AP for matching and payment.",
    notes: "Vendor-invoice matching against work-order line items is the common reconciliation step.",
  },
  // FLEET-MGMT → ERP-FIN
  {
    source_domain_code: "FLEET-MGMT", target_domain_code: "ERP-FIN", data_object_name: "fuel_transactions",
    trigger_event_name: "fuel_transaction.posted", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Reconciled fuel transactions post to GL by cost-center, vehicle class, or business unit; IFTA fuel-tax reporting compiled per quarter.",
    notes: "Period/cycle-close coupling for IFTA quarterly filings.",
  },
  // FSM → FLEET-MGMT (the field-service connection)
  {
    source_domain_code: "FSM", target_domain_code: "FLEET-MGMT", data_object_name: "fleet_assignments",
    trigger_event_name: "vehicle.dispatched", integration_pattern: "api_call", friction_level: "medium",
    description: "FSM work-order dispatch assigns a technician's vehicle for the day's route; FLEET-MGMT records the assignment and telematics activates against it.",
    notes: "Common cross-vendor stack: ServiceNow FSM + Samsara/Geotab. Identifier reconciliation on technician-to-driver and vehicle-id is the typical gap.",
  },
  // FLEET-MGMT → HR (driver-coaching / disciplinary)
  {
    source_domain_code: "TELEMATICS", target_domain_code: "FLEET-MGMT", data_object_name: "driver_behavior_events",
    trigger_event_name: "driver_behavior_event.triggered", integration_pattern: "api_call", friction_level: "low",
    description: "Risky-behavior events stream into FLEET-MGMT for driver-safety scoring and coaching-queue management.",
    notes: "Intra-cluster handoff (telematics to fleet workflow); typically same-vendor and low friction.",
  },
  // FLEET-MGMT → EAM (some shops manage vehicles in EAM)
  {
    source_domain_code: "FLEET-MAINT", target_domain_code: "EAM", data_object_name: "vehicle_work_orders",
    trigger_event_name: "vehicle_work_order.completed", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Vehicle-maintenance cost and hours roll into EAM for organizations that report fleet-asset costs through an EAM platform (Maximo, Hexagon EAM).",
    notes: "Common in public-sector / heavy-industrial where vehicles are a subset of overall mobile-asset reporting.",
  },
  // TELEMATICS → FLEET-MGMT (trip-completion drives utilization)
  {
    source_domain_code: "TELEMATICS", target_domain_code: "FLEET-MGMT", data_object_name: "vehicle_trips",
    trigger_event_name: "vehicle_trip.completed", integration_pattern: "event_stream", friction_level: "low",
    description: "Completed trips stream into fleet-utilization analytics, productive-time scoring, and fuel-trip reconciliation.",
    notes: "Intra-cluster low-friction when same vendor; cross-vendor still needs reliable trip-end semantics.",
  },
];

// ============================================================
// PHASE C — business_function_domains
// ============================================================
type BFD = { domain_code: string; business_function_name: string; responsibility_type: string; notes: string };
const businessFunctionDomains: BFD[] = [
  // FLEET-MGMT
  { domain_code: "FLEET-MGMT", business_function_name: "Logistics", responsibility_type: "owner", notes: "Fleet management sits in Logistics (sub of Supply Chain); for non-logistics buyers (field service, public sector) the closest fit is the operations org running the field workforce." },
  { domain_code: "FLEET-MGMT", business_function_name: "Field Service Operations", responsibility_type: "contributor", notes: "Service orgs operate vehicle fleets to dispatch technicians; FSM and fleet-mgmt are tightly coupled here." },
  { domain_code: "FLEET-MGMT", business_function_name: "Governance, Risk and Compliance", responsibility_type: "contributor", notes: "DOT, FMCSA, IFTA compliance reporting." },
  { domain_code: "FLEET-MGMT", business_function_name: "Accounting", responsibility_type: "consumer", notes: "Fuel and maintenance cost accounting." },
  // TELEMATICS
  { domain_code: "TELEMATICS", business_function_name: "Logistics", responsibility_type: "owner", notes: "Fleet operations own the telematics data layer." },
  { domain_code: "TELEMATICS", business_function_name: "Security", responsibility_type: "contributor", notes: "Vehicle telematics carries personal-data and location-data sensitivities; security/privacy review of dashcam and driver-monitoring." },
  { domain_code: "TELEMATICS", business_function_name: "Governance, Risk and Compliance", responsibility_type: "contributor", notes: "ELD HOS compliance, CSA scoring evidence." },
  { domain_code: "TELEMATICS", business_function_name: "Human Resources", responsibility_type: "consumer", notes: "Driver-safety scoring and coaching feed disciplinary and incentive workflows." },
  // FLEET-MAINT
  { domain_code: "FLEET-MAINT", business_function_name: "Logistics", responsibility_type: "owner", notes: "Fleet operations runs maintenance scheduling and shops." },
  { domain_code: "FLEET-MAINT", business_function_name: "Indirect Procurement", responsibility_type: "contributor", notes: "Parts sourcing and supplier negotiations." },
  { domain_code: "FLEET-MAINT", business_function_name: "Accounting", responsibility_type: "contributor", notes: "Capitalized vehicle improvements vs expensed repairs accounting." },
  { domain_code: "FLEET-MAINT", business_function_name: "Field Service Operations", responsibility_type: "consumer", notes: "Vehicle availability constrains FSM dispatch capacity." },
];

// ============================================================
// EXECUTE
// ============================================================
async function main() {
  console.log("=== Fleet Management cluster load ===\n");

  // --- DOMAINS — parent first, then sub-domains with parent FK ---
  console.log("Domains (parent)...");
  const parentMap = await syncTable(
    "/domains",
    [{
      domain_code: topDomain.domain_code,
      domain_name: topDomain.domain_name,
      description: topDomain.description,
      business_logic: topDomain.business_logic,
      crud_percentage: topDomain.crud_percentage,
      min_org_size: topDomain.min_org_size,
      cost_band: topDomain.cost_band,
      certification_required: topDomain.certification_required,
      usa_market_size_usd_m: topDomain.usa_market_size_usd_m,
      market_size_source_year: topDomain.market_size_source_year,
      parent_domain_id: null,
      industry_id: null,
    }],
    "domain_code",
  );
  const parentId = parentMap.get(topDomain.domain_code)!;
  console.log(`  FLEET-MGMT id=${parentId}`);

  console.log("\nDomains (sub-domains)...");
  const domMap = await syncTable(
    "/domains",
    subDomains.map(d => ({
      domain_code: d.domain_code,
      domain_name: d.domain_name,
      description: d.description,
      business_logic: d.business_logic,
      crud_percentage: d.crud_percentage,
      min_org_size: d.min_org_size,
      cost_band: d.cost_band,
      certification_required: d.certification_required,
      usa_market_size_usd_m: d.usa_market_size_usd_m,
      market_size_source_year: d.market_size_source_year,
      parent_domain_id: parentId,
      industry_id: null,
    })),
    "domain_code",
  );
  // Ensure parent FK on sub-domains is set even if they pre-existed
  for (const d of subDomains) {
    const id = domMap.get(d.domain_code)!;
    await call({
      method: "PATCH",
      path: `/domains?id=eq.${id}`,
      body: { parent_domain_id: parentId },
    });
  }
  // domMap currently only has sub-domains; add parent for downstream lookups
  domMap.set(topDomain.domain_code, parentId);

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
  const existingSolCaps = await get("/solution_capabilities?select=solution_id,capability_id&limit=20000");
  const scKey = (sid: number, cid: number) => `${sid}:${cid}`;
  const existingScKeys = new Set(existingSolCaps.map(r => scKey(Number(r.solution_id), Number(r.capability_id))));
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

  // ====================================================
  // PHASE B
  // ====================================================
  console.log("\n=== PHASE B: data_objects ===");
  await syncTable("/data_objects", dataObjects, "data_object_name");
  const fullDoLookup = await get("/data_objects?select=id,data_object_name&limit=10000");
  const fullDoMap = new Map<string, number>();
  for (const r of fullDoLookup) fullDoMap.set(String(r.data_object_name), Number(r.id));

  console.log("\nDomain-data-object links...");
  const existingDdo = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=20000");
  const ddoKey = (did: number, oid: number, role: string) => `${did}:${oid}:${role}`;
  const existingDdoKeys = new Set(existingDdo.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));
  const newDdo = domainDataObjects
    .map(ddo => {
      const did = domMap.get(ddo.domain_code)!;
      const oid = fullDoMap.get(ddo.data_object_name);
      if (!oid) throw new Error(`Missing data_object: ${ddo.data_object_name}`);
      return { domain_id: did, data_object_id: oid, role: ddo.role, notes: ddo.notes };
    })
    .filter(r => !existingDdoKeys.has(ddoKey(r.domain_id, r.data_object_id, r.role)));
  console.log(`  inserting ${newDdo.length} domain_data_objects`);
  await insert("/domain_data_objects", newDdo);

  console.log("\nTrigger events...");
  const teMap = await syncTable(
    "/trigger_events",
    triggerEvents.map(te => ({
      event_name: te.event_name,
      data_object_id: fullDoMap.get(te.data_object_name)!,
      event_category: te.event_category,
      from_state: te.from_state,
      to_state: te.to_state,
      description: te.description,
    })),
    "event_name",
  );

  console.log("\nCross-domain handoffs...");
  const existingHandoffs = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=20000");
  const hoKey = (s: number, t: number, o: number, ev: string) => `${s}:${t}:${o}:${ev}`;
  const existingHoKeys = new Set(existingHandoffs.map(r => hoKey(Number(r.source_domain_id), Number(r.target_domain_id), Number(r.data_object_id), String(r.trigger_event))));

  const fullDomainLookup = await get("/domains?select=id,domain_code&limit=10000");
  const fullDomainMap = new Map<string, number>();
  for (const r of fullDomainLookup) fullDomainMap.set(String(r.domain_code), Number(r.id));

  const newHo = [];
  for (const h of handoffs) {
    const sid = fullDomainMap.get(h.source_domain_code);
    const tid = fullDomainMap.get(h.target_domain_code);
    const oid = fullDoMap.get(h.data_object_name);
    const teId = teMap.get(h.trigger_event_name);
    if (!sid) { console.warn(`  skip — missing source domain ${h.source_domain_code}`); continue; }
    if (!tid) { console.warn(`  skip — missing target domain ${h.target_domain_code}`); continue; }
    if (!oid) { console.warn(`  skip — missing data_object ${h.data_object_name}`); continue; }
    if (!teId) { console.warn(`  skip — missing trigger_event ${h.trigger_event_name}`); continue; }
    if (existingHoKeys.has(hoKey(sid, tid, oid, h.trigger_event_name))) continue;
    newHo.push({
      source_domain_id: sid,
      target_domain_id: tid,
      data_object_id: oid,
      trigger_event: h.trigger_event_name,
      trigger_event_id: teId,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: h.notes,
    });
  }
  console.log(`  inserting ${newHo.length} cross_domain_handoffs`);
  await insert("/cross_domain_handoffs", newHo);

  // ====================================================
  // PHASE C
  // ====================================================
  console.log("\n=== PHASE C: business_function_domains ===");
  const bfLookup = await get("/business_functions?select=id,business_function_name&limit=1000");
  const bfMap = new Map<string, number>();
  for (const r of bfLookup) bfMap.set(String(r.business_function_name), Number(r.id));

  const existingBfd = await get("/business_function_domains?select=domain_id,business_function_id,responsibility_type&limit=20000");
  const bfdKey = (did: number, fid: number, role: string) => `${did}:${fid}:${role}`;
  const existingBfdKeys = new Set(existingBfd.map(r => bfdKey(Number(r.domain_id), Number(r.business_function_id), String(r.responsibility_type))));
  const newBfd = businessFunctionDomains
    .map(bfd => {
      const did = domMap.get(bfd.domain_code)!;
      const fid = bfMap.get(bfd.business_function_name);
      if (!fid) throw new Error(`Missing business_function: ${bfd.business_function_name}`);
      return { domain_id: did, business_function_id: fid, responsibility_type: bfd.responsibility_type, notes: bfd.notes };
    })
    .filter(r => !existingBfdKeys.has(bfdKey(r.domain_id, r.business_function_id, r.responsibility_type)));
  console.log(`  inserting ${newBfd.length} business_function_domains`);
  await insert("/business_function_domains", newBfd);

  // ====================================================
  // SUMMARY + AUDIT
  // ====================================================
  console.log("\n=== Audit ===");
  for (const code of ["FLEET-MGMT", "TELEMATICS", "FLEET-MAINT"]) {
    const did = domMap.get(code)!;
    const [solCount, capCount, doCount, hoOutCount] = await Promise.all([
      get(`/solution_domains?domain_id=eq.${did}&select=id`),
      get(`/capability_domains?domain_id=eq.${did}&select=id`),
      get(`/domain_data_objects?domain_id=eq.${did}&select=id`),
      get(`/cross_domain_handoffs?source_domain_id=eq.${did}&select=id`),
    ]);
    console.log(`  ${code}: ${solCount.length} solutions, ${capCount.length} caps, ${doCount.length} data_objects, ${hoOutCount.length} outbound handoffs`);
  }

  console.log("\n=== UI links ===");
  console.log(`  Parent FLEET-MGMT: https://tests.semantius.app/domain_map/domains?id=eq.${parentId}`);
  console.log(`  Sub-domains:       https://tests.semantius.app/domain_map/domains?parent_domain_id=eq.${parentId}`);
  console.log(`  Solutions:         https://tests.semantius.app/domain_map/solutions`);
  console.log(`  Data objects:      https://tests.semantius.app/domain_map/data_objects`);
  console.log(`  Handoffs:          https://tests.semantius.app/domain_map/cross_domain_handoffs`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
