#!/usr/bin/env bun
// Phase B loader for Agriculture & Food Systems wedge:
//   ~37 data_objects (new) + reuses (suppliers, customers, audit_findings, compliance_obligations)
//   ~49 domain_data_objects (masters + contributors + consumers)
//   ~13 trigger_events (some with fan-out across handoffs)
//   ~17 cross_domain_handoffs
//
// Idempotent — reads by natural key before insert.

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
  const existing = await get(`${path}?select=id,${keyField}&limit=20000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} candidate(s) already present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=20000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// DATA OBJECTS (37 new)
// ============================================================
const dataObjects = [
  // FMIS (8)
  { data_object_name: "fields", singular_label: "Field", plural_label: "Fields", display_label: "Field", description: "Geographical field / paddock boundary record with soil-type, productivity zones, and crop-history; the spatial unit of farm operations." },
  { data_object_name: "crop_plans", singular_label: "Crop Plan", plural_label: "Crop Plans", display_label: "Crop Plan", description: "Per-field seasonal planting plan (crop, variety, target yield, application schedule); includes multi-year rotation history." },
  { data_object_name: "planting_records", singular_label: "Planting Record", plural_label: "Planting Records", display_label: "Planting Record", description: "Per-pass planting event: seed variety, rate, depth, date, weather; ISOBUS-compliant." },
  { data_object_name: "field_applications", singular_label: "Field Application", plural_label: "Field Applications", display_label: "Field Application", description: "Per-pass chemical / fertiliser / micronutrient application event with product, rate, applicator, restricted-use justification." },
  { data_object_name: "harvest_records", singular_label: "Harvest Record", plural_label: "Harvest Records", display_label: "Harvest Record", description: "Per-field and per-zone yield record from combine telemetry, scale tickets, and grain-handling reconciliation." },
  { data_object_name: "ag_input_inventory", singular_label: "Ag Input Inventory", plural_label: "Ag Input Inventories", display_label: "Ag Input Inventory", description: "Seed / fertiliser / chemical / fuel stock across farm bins and sheds; reconciled against applications and purchases." },
  { data_object_name: "variable_rate_prescriptions", singular_label: "Variable-Rate Prescription", plural_label: "Variable-Rate Prescriptions", display_label: "Variable-Rate Prescription", description: "Site-specific application prescription map (shapefile / ISO-XML) authored from yield zones and soil tests; dispatched to machinery." },
  { data_object_name: "machinery_telemetry_records", singular_label: "Machinery Telemetry Record", plural_label: "Machinery Telemetry Records", display_label: "Machinery Telemetry Record", description: "Per-job equipment telemetry log from CAN-bus / ISOBUS / OEM API (planting depth, application rate, GPS track, alarms)." },

  // FOOD-TRACE (5)
  { data_object_name: "traceability_lots", singular_label: "Traceability Lot", plural_label: "Traceability Lots", display_label: "Traceability Lot", description: "Lot / batch identifier per FSMA-204 Traceability Lot Code (TLC); links upstream sources to downstream consignees." },
  { data_object_name: "critical_tracking_events", singular_label: "Critical Tracking Event", plural_label: "Critical Tracking Events", display_label: "Critical Tracking Event", description: "FSMA-204-defined CTE: growing / receiving / transformation / creation / shipping event with KDE references." },
  { data_object_name: "key_data_elements", singular_label: "Key Data Element", plural_label: "Key Data Elements", display_label: "Key Data Element", description: "FSMA-204-defined KDE attached to a CTE; sortable into FDA spreadsheet response format." },
  { data_object_name: "recall_events", singular_label: "Recall Event", plural_label: "Recall Events", display_label: "Recall Event", description: "Product recall execution record: affected lots, notification log, hold-and-segregate status, FDA Reportable Food Registry filing." },
  { data_object_name: "supplier_certifications", singular_label: "Supplier Certification", plural_label: "Supplier Certifications", display_label: "Supplier Certification", description: "Supplier-issued certification document (GFSI, organic, kosher, halal, allergen statement, insurance COI) with expiry tracking." },

  // DAIRY-MGMT (8)
  { data_object_name: "dairy_cows", singular_label: "Dairy Cow", plural_label: "Dairy Cows", display_label: "Dairy Cow", description: "Individual cow record: ear tag, breed, birth date, sire / dam, parity, current lactation status, location pen." },
  { data_object_name: "lactation_records", singular_label: "Lactation Record", plural_label: "Lactation Records", display_label: "Lactation Record", description: "Per-cow per-lactation cycle: calving date, dry-off date, peak milk yield, 305-day projection, days-in-milk." },
  { data_object_name: "milkings", singular_label: "Milking", plural_label: "Milkings", display_label: "Milking", description: "Per-cow per-session milking event: parlor / robot ID, milk yield, conductivity, milking duration; from parlor / AMS telemetry." },
  { data_object_name: "milk_quality_tests", singular_label: "Milk Quality Test", plural_label: "Milk Quality Tests", display_label: "Milk Quality Test", description: "Bulk-tank or per-cow milk-quality result: SCC, bacterial count, butterfat, protein, antibiotic-residue screen." },
  { data_object_name: "breeding_events", singular_label: "Breeding Event", plural_label: "Breeding Events", display_label: "Breeding Event", description: "Reproductive event: natural service / AI / embryo transfer with sire, technician, date; preg-check result downstream." },
  { data_object_name: "cow_health_events", singular_label: "Cow Health Event", plural_label: "Cow Health Events", display_label: "Cow Health Event", description: "Health incident: mastitis, lameness, metabolic disorder; treatment, withdrawal period, recovery status." },
  { data_object_name: "feed_rations", singular_label: "Feed Ration", plural_label: "Feed Rations", display_label: "Feed Ration", description: "Per-group TMR (total mixed ration) formulation: ingredients, inclusion %, mixing log; income-over-feed-cost calculation." },
  { data_object_name: "bulk_milk_shipments", singular_label: "Bulk Milk Shipment", plural_label: "Bulk Milk Shipments", display_label: "Bulk Milk Shipment", description: "Outbound milk-tank shipment to processor / co-op: pickup time, volume, milk-quality grade, hauler." },

  // FSQM (7)
  { data_object_name: "haccp_plans", singular_label: "HACCP Plan", plural_label: "HACCP Plans", display_label: "HACCP Plan", description: "Per-product Hazard Analysis Critical Control Point document: hazard analysis, CCPs, critical limits, monitoring procedures, corrective actions." },
  { data_object_name: "critical_control_points", singular_label: "Critical Control Point", plural_label: "Critical Control Points", display_label: "Critical Control Point", description: "CCP definition with hazard, critical limit, monitoring frequency, responsible party; child of a HACCP plan." },
  { data_object_name: "ccp_measurements", singular_label: "CCP Measurement", plural_label: "CCP Measurements", display_label: "CCP Measurement", description: "Real-time or shift-frequency CCP monitoring reading; deviation triggers corrective-action workflow." },
  { data_object_name: "food_safety_incidents", singular_label: "Food Safety Incident", plural_label: "Food Safety Incidents", display_label: "Food Safety Incident", description: "Deviation, complaint, or non-conformance event triggering investigation and corrective / preventive action (CAPA)." },
  { data_object_name: "allergen_programs", singular_label: "Allergen Program", plural_label: "Allergen Programs", display_label: "Allergen Program", description: "Per-product-line allergen map, changeover validation procedure, labelling controls, supplier-attestation references." },
  { data_object_name: "environmental_monitoring_samples", singular_label: "Environmental Monitoring Sample", plural_label: "Environmental Monitoring Samples", display_label: "Environmental Monitoring Sample", description: "Pathogen-EMP sample: zone (1-4), site, sampling date, lab result; aggregated into trend analytics." },
  { data_object_name: "sanitation_records", singular_label: "Sanitation Record", plural_label: "Sanitation Records", display_label: "Sanitation Record", description: "Cleaning / sanitation completion record per shift / line / equipment with verification (ATP swab, visual)." },

  // FARMER-DIRECT-SALES (9)
  { data_object_name: "csa_memberships", singular_label: "CSA Membership", plural_label: "CSA Memberships", display_label: "CSA Membership", description: "Per-member per-season subscription: share type, customisation preferences, payment plan, pickup location." },
  { data_object_name: "csa_share_packs", singular_label: "CSA Share Pack", plural_label: "CSA Share Packs", display_label: "CSA Share Pack", description: "Per-week packed share for a specific member: contents, swaps applied, packing-list reference, delivery / pickup status." },
  { data_object_name: "farmers_market_sales", singular_label: "Farmers Market Sale", plural_label: "Farmers Market Sales", display_label: "Farmers Market Sale", description: "On-site farmers-market transaction or reconciliation summary; SKU-level line items, tender mix (cash / card / EBT-SNAP)." },
  { data_object_name: "wholesale_orders", singular_label: "Wholesale Order", plural_label: "Wholesale Orders", display_label: "Wholesale Order", description: "B2B order from chef / restaurant / co-op / food-hub buyer; per-line pricing tier, packing-list reference, net-30 invoicing." },
  { data_object_name: "delivery_routes", singular_label: "Delivery Route", plural_label: "Delivery Routes", display_label: "Delivery Route", description: "Optimised multi-stop DTC delivery route per delivery day: vehicle, driver, stops, time windows." },
  { data_object_name: "pickup_locations", singular_label: "Pickup Location", plural_label: "Pickup Locations", display_label: "Pickup Location", description: "Host-pickup-site, depot, or on-farm pickup point with operating hours, member-self-serve capacity." },
  { data_object_name: "butcher_orders", singular_label: "Butcher Order", plural_label: "Butcher Orders", display_label: "Butcher Order", description: "Whole / half / quarter-animal pre-order: deposit status, customer cut-sheet preferences, processor coordination, pickup date." },
  { data_object_name: "harvest_forecasts", singular_label: "Harvest Forecast", plural_label: "Harvest Forecasts", display_label: "Harvest Forecast", description: "Field-level harvest projection translated to available-share / SKU planning; drives reserve-list and dynamic pricing." },
  { data_object_name: "farm_storefronts", singular_label: "Farm Storefront", plural_label: "Farm Storefronts", display_label: "Farm Storefront", description: "Branded farm e-commerce storefront configuration: catalog scope, member-only pricing tiers, gift-card setup, mobile UX skin." },
];

// ============================================================
// DOMAIN_DATA_OBJECTS — masters + contributors + consumers
// ============================================================
type DDO = { domain_code: string; data_object_name: string; role: string; notes: string };

const domainDataObjects: DDO[] = [
  // FMIS masters (8)
  { domain_code: "FMIS", data_object_name: "fields", role: "master", notes: "Geographic field boundary records owned by the FMIS." },
  { domain_code: "FMIS", data_object_name: "crop_plans", role: "master", notes: "Per-season crop plan per field; rotation history." },
  { domain_code: "FMIS", data_object_name: "planting_records", role: "master", notes: "Per-pass planting events; ISOBUS-sourced." },
  { domain_code: "FMIS", data_object_name: "field_applications", role: "master", notes: "Chemical and nutrient application events; restricted-use compliance." },
  { domain_code: "FMIS", data_object_name: "harvest_records", role: "master", notes: "Per-field yield records from combine telemetry and scale tickets. Cluster flagship — consumed by FOOD-TRACE for origin-lot creation and by FDS for available-share planning." },
  { domain_code: "FMIS", data_object_name: "ag_input_inventory", role: "master", notes: "Seed / chemical / fuel inventory at farm bins." },
  { domain_code: "FMIS", data_object_name: "variable_rate_prescriptions", role: "master", notes: "VR application maps; dispatched to machinery." },
  { domain_code: "FMIS", data_object_name: "machinery_telemetry_records", role: "master", notes: "Per-job equipment telemetry feeds." },

  // FOOD-TRACE masters (5) + contributors / consumers
  { domain_code: "FOOD-TRACE", data_object_name: "traceability_lots", role: "master", notes: "FSMA-204 Traceability Lot Codes; the trace-graph node." },
  { domain_code: "FOOD-TRACE", data_object_name: "critical_tracking_events", role: "master", notes: "CTE event log per FSMA 204." },
  { domain_code: "FOOD-TRACE", data_object_name: "key_data_elements", role: "master", notes: "KDE records attached to CTEs; FDA-sortable." },
  { domain_code: "FOOD-TRACE", data_object_name: "recall_events", role: "master", notes: "Recall execution workflow records." },
  { domain_code: "FOOD-TRACE", data_object_name: "supplier_certifications", role: "master", notes: "Supplier-issued cert documents with expiry tracking; Trustwell / TraceGains-network vendors own this lifecycle." },
  { domain_code: "FOOD-TRACE", data_object_name: "suppliers", role: "consumer", notes: "Reads supplier master from S2P for cert attribution and trace-network membership." },
  { domain_code: "FOOD-TRACE", data_object_name: "harvest_records", role: "consumer", notes: "Reads farm-side harvest records to seed the upstream traceability lot." },
  { domain_code: "FOOD-TRACE", data_object_name: "bulk_milk_shipments", role: "consumer", notes: "Reads dairy-shipment records to seed downstream lot creation at processor." },
  { domain_code: "FOOD-TRACE", data_object_name: "compliance_obligations", role: "contributor", notes: "FSMA 204 obligations enrich the GRC-mastered compliance register." },

  // DAIRY-MGMT masters (8) + consumer
  { domain_code: "DAIRY-MGMT", data_object_name: "dairy_cows", role: "master", notes: "Per-cow records — the herd." },
  { domain_code: "DAIRY-MGMT", data_object_name: "lactation_records", role: "master", notes: "Per-cow per-lactation cycle." },
  { domain_code: "DAIRY-MGMT", data_object_name: "milkings", role: "master", notes: "Per-cow per-session milking events; parlor / AMS-sourced." },
  { domain_code: "DAIRY-MGMT", data_object_name: "milk_quality_tests", role: "master", notes: "SCC / bacterial / butterfat / antibiotic-residue results." },
  { domain_code: "DAIRY-MGMT", data_object_name: "breeding_events", role: "master", notes: "AI / natural service / ET reproductive events." },
  { domain_code: "DAIRY-MGMT", data_object_name: "cow_health_events", role: "master", notes: "Disease and treatment events; withdrawal period drives drug-residue compliance." },
  { domain_code: "DAIRY-MGMT", data_object_name: "feed_rations", role: "master", notes: "Per-group TMR formulations; IOFC calc." },
  { domain_code: "DAIRY-MGMT", data_object_name: "bulk_milk_shipments", role: "master", notes: "Outbound milk-tank shipments to processor or co-op; farm-side master. FOOD-TRACE consumes for downstream lot genealogy." },
  { domain_code: "DAIRY-MGMT", data_object_name: "suppliers", role: "consumer", notes: "Reads supplier master from S2P for feed and veterinary suppliers." },

  // FSQM masters (7) + contributors / consumers
  { domain_code: "FSQM", data_object_name: "haccp_plans", role: "master", notes: "Per-product HACCP plans." },
  { domain_code: "FSQM", data_object_name: "critical_control_points", role: "master", notes: "CCP definitions; children of HACCP plans." },
  { domain_code: "FSQM", data_object_name: "ccp_measurements", role: "master", notes: "CCP monitoring readings; deviation drives corrective-action workflow." },
  { domain_code: "FSQM", data_object_name: "food_safety_incidents", role: "master", notes: "Deviations, complaints, and non-conformances; cluster flagship for incident-to-recall escalation." },
  { domain_code: "FSQM", data_object_name: "allergen_programs", role: "master", notes: "Per-product-line allergen-control programmes." },
  { domain_code: "FSQM", data_object_name: "environmental_monitoring_samples", role: "master", notes: "Pathogen-EMP sampling and trend analytics." },
  { domain_code: "FSQM", data_object_name: "sanitation_records", role: "master", notes: "Cleaning and sanitation verification records." },
  { domain_code: "FSQM", data_object_name: "supplier_certifications", role: "contributor", notes: "Adds risk-scoring metadata to FOOD-TRACE-mastered certs for supplier-risk programme." },
  { domain_code: "FSQM", data_object_name: "audit_findings", role: "contributor", notes: "GFSI / FSMA-PC audit findings flow into the AUDIT-mastered enterprise audit register." },
  { domain_code: "FSQM", data_object_name: "recall_events", role: "contributor", notes: "Food-safety incidents escalate into FOOD-TRACE-mastered recall events." },
  { domain_code: "FSQM", data_object_name: "suppliers", role: "consumer", notes: "Reads supplier master for supplier-risk scoring." },
  { domain_code: "FSQM", data_object_name: "compliance_obligations", role: "contributor", notes: "HACCP / GFSI / FSMA-PC obligations enrich the GRC-mastered compliance register." },

  // FARMER-DIRECT-SALES masters (9) + contributors / consumers
  { domain_code: "FARMER-DIRECT-SALES", data_object_name: "csa_memberships", role: "master", notes: "Per-member per-season CSA subscription." },
  { domain_code: "FARMER-DIRECT-SALES", data_object_name: "csa_share_packs", role: "master", notes: "Per-week packed share for a member." },
  { domain_code: "FARMER-DIRECT-SALES", data_object_name: "farmers_market_sales", role: "master", notes: "On-site farmers-market POS transactions." },
  { domain_code: "FARMER-DIRECT-SALES", data_object_name: "wholesale_orders", role: "master", notes: "B2B orders to chefs / restaurants / hubs." },
  { domain_code: "FARMER-DIRECT-SALES", data_object_name: "delivery_routes", role: "master", notes: "Optimised DTC delivery routes." },
  { domain_code: "FARMER-DIRECT-SALES", data_object_name: "pickup_locations", role: "master", notes: "Host-pickup, depot, and on-farm pickup points." },
  { domain_code: "FARMER-DIRECT-SALES", data_object_name: "butcher_orders", role: "master", notes: "Whole / half / quarter-animal pre-orders with cut sheets." },
  { domain_code: "FARMER-DIRECT-SALES", data_object_name: "harvest_forecasts", role: "master", notes: "Field-level harvest projections translated to available shares; consumes FMIS harvest_records." },
  { domain_code: "FARMER-DIRECT-SALES", data_object_name: "farm_storefronts", role: "master", notes: "Branded farm e-commerce storefronts." },
  { domain_code: "FARMER-DIRECT-SALES", data_object_name: "customers", role: "contributor", notes: "CSA members ARE customers in the CRM master; FDS contributes membership-shape data on the underlying customer record." },
  { domain_code: "FARMER-DIRECT-SALES", data_object_name: "harvest_records", role: "consumer", notes: "Reads FMIS harvest_records to drive available-share planning and reserve-list management." },
];

// ============================================================
// TRIGGER EVENTS (13 unique)
// ============================================================
type TriggerEvent = {
  event_name: string;
  data_object_name: string;
  event_category: string;
  from_state: string;
  to_state: string;
  description: string;
};

const triggerEvents: TriggerEvent[] = [
  { event_name: "harvest_record.created", data_object_name: "harvest_records", event_category: "lifecycle", from_state: "", to_state: "created", description: "A field harvest event has been recorded with yield, harvest date, and field reference; downstream creates the upstream traceability lot AND realises available-share inventory for direct-sales planning." },
  { event_name: "field_application.recorded", data_object_name: "field_applications", event_category: "lifecycle", from_state: "", to_state: "recorded", description: "A chemical / fertiliser application pass has been recorded with product, rate, applicator, and weather conditions; downstream creates a KDE entry for traceability and feeds organic / certification-program evidence." },
  { event_name: "bulk_milk_shipment.dispatched", data_object_name: "bulk_milk_shipments", event_category: "lifecycle", from_state: "loading", to_state: "dispatched", description: "A bulk milk shipment has left the farm with volume, hauler, and quality-grade attestation; downstream creates a traceability lot at the processor." },
  { event_name: "milk_quality_test.failed", data_object_name: "milk_quality_tests", event_category: "threshold", from_state: "passed", to_state: "failed", description: "A milk-quality test (SCC, bacterial count, or antibiotic residue) has crossed the failure threshold; downstream triggers food-safety incident, shipment halt, and corrective-action workflow." },
  { event_name: "cow_health_event.treatment_administered", data_object_name: "cow_health_events", event_category: "lifecycle", from_state: "", to_state: "treatment_administered", description: "A veterinary treatment with drug-withdrawal-period implications has been administered; downstream gates milk shipment until withdrawal-period clearance." },
  { event_name: "food_safety_incident.escalated", data_object_name: "food_safety_incidents", event_category: "threshold", from_state: "investigating", to_state: "recall_initiated", description: "A food-safety incident has been escalated to recall status; downstream creates the recall execution record and notifies regulators." },
  { event_name: "audit_finding.created", data_object_name: "audit_findings", event_category: "lifecycle", from_state: "", to_state: "created", description: "An audit finding has been recorded by an auditor; downstream flows into the enterprise audit register and may drive corrective-action workflow." },
  { event_name: "ccp_measurement.deviation", data_object_name: "ccp_measurements", event_category: "threshold", from_state: "in_limit", to_state: "deviation", description: "A CCP monitoring reading has crossed its critical limit; downstream triggers product hold and compliance-event logging." },
  { event_name: "recall_event.initiated", data_object_name: "recall_events", event_category: "lifecycle", from_state: "draft", to_state: "initiated", description: "A product recall has been formally initiated; downstream fans out to FSMA Reportable Food Registry filing (GRC) AND inventory write-off / cost-recovery / customer-credit processing (ERP-FIN)." },
  { event_name: "supplier_certification.expired", data_object_name: "supplier_certifications", event_category: "threshold", from_state: "valid", to_state: "expired", description: "A supplier certification has passed its expiry date with no renewal received; downstream fans out to FSQM supplier-risk elevation AND SUP-LIFE supplier-onboarding-gate (blocks new POs until renewed)." },
  { event_name: "csa_membership.activated", data_object_name: "csa_memberships", event_category: "lifecycle", from_state: "draft", to_state: "active", description: "A CSA membership has been activated for the current season; downstream creates / enriches the CRM-mastered customer record for ongoing engagement." },
  { event_name: "csa_subscription.charged", data_object_name: "csa_memberships", event_category: "lifecycle", from_state: "due", to_state: "charged", description: "A CSA membership payment has been charged (full-season pre-pay or installment); downstream posts revenue to ERP-FIN with deferred-revenue treatment on pre-pays." },
  { event_name: "csa_share_pack.delivered", data_object_name: "csa_share_packs", event_category: "lifecycle", from_state: "in_transit", to_state: "delivered", description: "A weekly CSA share has been delivered or picked up; downstream is a customer-engagement touch-point and a churn-risk feedback signal." },
];

// ============================================================
// CROSS-DOMAIN HANDOFFS (17)
// ============================================================
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
  // From FMIS (4 handoffs, 2 unique events)
  {
    source_domain_code: "FMIS", target_domain_code: "FOOD-TRACE", data_object_name: "harvest_records",
    trigger_event_name: "harvest_record.created", integration_pattern: "api_call", friction_level: "high",
    description: "Farm-side harvest event seeds the upstream traceability lot at the processor or grower-shipper; lot-code reconciliation between FMIS field-keyed records and FOOD-TRACE lot-keyed records is the integration burden.",
    notes: "Cross-vendor stack with same logical entity — Climate FieldView / Granular on the FMIS side vs Trustwell / IBM Food Trust on the FOOD-TRACE side; identifier reconciliation is largely manual or hand-mapped today.",
  },
  {
    source_domain_code: "FMIS", target_domain_code: "FARMER-DIRECT-SALES", data_object_name: "harvest_records",
    trigger_event_name: "harvest_record.created", integration_pattern: "manual_handoff", friction_level: "high",
    description: "Harvest realises stock that becomes available-share inventory for CSA share packs and farmers-market sale lists; today the production system (Farmbrite / AgriWebb) and the direct-sales platform (Barn2Door / Local Line) rarely connect.",
    notes: "Cross-vendor stack — production-side and sales-side are virtually always separate vendors; smallholders commonly use spreadsheet exports as the bridge. Strongest 'farm-to-market integration platform' opportunity in the cluster.",
  },
  {
    source_domain_code: "FMIS", target_domain_code: "FOOD-TRACE", data_object_name: "field_applications",
    trigger_event_name: "field_application.recorded", integration_pattern: "api_call", friction_level: "medium",
    description: "Application records (especially restricted-use pesticides) become KDE evidence for residue-traceback investigations and provenance attestation.",
    notes: "",
  },
  {
    source_domain_code: "FMIS", target_domain_code: "FSQM", data_object_name: "field_applications",
    trigger_event_name: "field_application.recorded", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Application records feed organic / hormone-free / certification-program audit evidence; auditors trace from finished-product claim back to source-farm records.",
    notes: "",
  },

  // From DAIRY-MGMT (3 handoffs)
  {
    source_domain_code: "DAIRY-MGMT", target_domain_code: "FOOD-TRACE", data_object_name: "bulk_milk_shipments",
    trigger_event_name: "bulk_milk_shipment.dispatched", integration_pattern: "api_call", friction_level: "high",
    description: "Dairy-farm milk dispatch seeds the downstream traceability lot at the processor; tank-truck commingling and farm-source apportionment is complex.",
    notes: "Cross-vendor stack — dairy farm management (DairyComp 305 / Lely Horizon / DeLaval DelPro) and processor's traceability (Trustwell / IBM Food Trust) rarely share schema; commingled tanks across multiple farms make per-farm-source attribution non-trivial.",
  },
  {
    source_domain_code: "DAIRY-MGMT", target_domain_code: "FSQM", data_object_name: "milk_quality_tests",
    trigger_event_name: "milk_quality_test.failed", integration_pattern: "event_stream", friction_level: "high",
    description: "Failed milk-quality test (SCC threshold, antibiotic residue, bacterial count) must halt the next-pickup-window shipment and trigger food-safety incident workflow.",
    notes: "Multi-shape: cross-vendor stack (dairy mgmt vs FSQM) + period/cycle-close coupling (pickup window timing). Drug-residue failure is the highest-cost failure mode — entire tank rejection at processor.",
  },
  {
    source_domain_code: "DAIRY-MGMT", target_domain_code: "FSQM", data_object_name: "cow_health_events",
    trigger_event_name: "cow_health_event.treatment_administered", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Veterinary treatments with drug-withdrawal periods must gate milk shipment until clearance; FSQM tracks the compliance interval.",
    notes: "",
  },

  // From FSQM (3 handoffs)
  {
    source_domain_code: "FSQM", target_domain_code: "FOOD-TRACE", data_object_name: "recall_events",
    trigger_event_name: "food_safety_incident.escalated", integration_pattern: "api_call", friction_level: "high",
    description: "A severity-escalated food-safety incident creates a recall-execution record in FOOD-TRACE; recall-decision threshold is judgement-heavy and recall-execution is a regulator-prescribed workflow.",
    notes: "Multi-shape: probabilistic-to-deterministic (incident severity scoring → recall yes/no) + cross-vendor stack (FSQM vs FOOD-TRACE). The escalation point is the highest-stakes manual judgement in the food-safety lifecycle.",
  },
  {
    source_domain_code: "FSQM", target_domain_code: "AUDIT", data_object_name: "audit_findings",
    trigger_event_name: "audit_finding.created", integration_pattern: "api_call", friction_level: "medium",
    description: "GFSI / FSMA-PC audit findings flow into the enterprise audit register for cross-functional follow-up and corrective-action tracking.",
    notes: "",
  },
  {
    source_domain_code: "FSQM", target_domain_code: "GRC", data_object_name: "ccp_measurements",
    trigger_event_name: "ccp_measurement.deviation", integration_pattern: "event_stream", friction_level: "medium",
    description: "CCP deviation events create a compliance-trail entry for FSMA Preventive Controls and HACCP-verification audits.",
    notes: "",
  },

  // From FOOD-TRACE (4 handoffs from 2 fan-out events)
  {
    source_domain_code: "FOOD-TRACE", target_domain_code: "GRC", data_object_name: "recall_events",
    trigger_event_name: "recall_event.initiated", integration_pattern: "api_call", friction_level: "medium",
    description: "Initiated recall creates an FSMA Reportable Food Registry filing obligation and a compliance-event entry.",
    notes: "Fan-out arm of `recall_event.initiated` — the GRC side handles regulatory reporting.",
  },
  {
    source_domain_code: "FOOD-TRACE", target_domain_code: "ERP-FIN", data_object_name: "recall_events",
    trigger_event_name: "recall_event.initiated", integration_pattern: "api_call", friction_level: "medium",
    description: "Initiated recall triggers inventory write-off, cost-recovery workflow (supplier-side and insurance), and customer-credit issuance.",
    notes: "Fan-out arm of `recall_event.initiated` — the ERP-FIN side handles financial impact.",
  },
  {
    source_domain_code: "FOOD-TRACE", target_domain_code: "FSQM", data_object_name: "supplier_certifications",
    trigger_event_name: "supplier_certification.expired", integration_pattern: "event_stream", friction_level: "medium",
    description: "Supplier-certification expiry elevates the supplier-risk score in FSQM; ingredient receipts from expired-cert suppliers may require additional verification.",
    notes: "Fan-out arm of `supplier_certification.expired` — alert/escalation pattern; FSQM side often lacks acknowledgment feedback to FOOD-TRACE.",
  },
  {
    source_domain_code: "FOOD-TRACE", target_domain_code: "SUP-LIFE", data_object_name: "supplier_certifications",
    trigger_event_name: "supplier_certification.expired", integration_pattern: "event_stream", friction_level: "medium",
    description: "Supplier-certification expiry blocks new PO issuance until cert renewed; gates supplier from continued procurement.",
    notes: "Fan-out arm of `supplier_certification.expired` — SUP-LIFE side handles supplier-status gating.",
  },

  // From FARMER-DIRECT-SALES (3 handoffs)
  {
    source_domain_code: "FARMER-DIRECT-SALES", target_domain_code: "CRM", data_object_name: "customers",
    trigger_event_name: "csa_membership.activated", integration_pattern: "api_call", friction_level: "low",
    description: "CSA membership activation creates or enriches the underlying CRM-mastered customer record with membership status, share preferences, and pickup location.",
    notes: "Cloud-native FDS vendors (Barn2Door, Local Line) typically integrate directly with HubSpot / Mailchimp / Klaviyo as the CRM target.",
  },
  {
    source_domain_code: "FARMER-DIRECT-SALES", target_domain_code: "ERP-FIN", data_object_name: "csa_memberships",
    trigger_event_name: "csa_subscription.charged", integration_pattern: "api_call", friction_level: "medium",
    description: "CSA payment events post revenue to ERP-FIN; full-season pre-pays require deferred-revenue accounting amortised across delivery weeks.",
    notes: "Deferred-revenue accounting on pre-paid full-season subscriptions is non-trivial; vendors today often hand-export to QuickBooks / Xero.",
  },
  {
    source_domain_code: "FARMER-DIRECT-SALES", target_domain_code: "CRM", data_object_name: "csa_share_packs",
    trigger_event_name: "csa_share_pack.delivered", integration_pattern: "event_stream", friction_level: "medium",
    description: "Each weekly delivery is a customer-engagement touchpoint; missed pickups, swap-rate trends, and pause-week behaviour are churn-risk signals fed back to CRM.",
    notes: "Probabilistic-signal pattern — engagement scoring is heuristic; vendor maturity in this loop is uneven across the FDS market.",
  },
];

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("=== Agriculture & Food Systems — Phase B load ===\n");

  // --- DATA_OBJECTS ---
  console.log("Data objects...");
  await syncTable("/data_objects", dataObjects, "data_object_name");

  // Build full data_object map (includes pre-existing reuses: suppliers, customers, audit_findings, compliance_obligations, etc.)
  const fullDoLookup = await get("/data_objects?select=id,data_object_name&limit=10000");
  const fullDoMap = new Map<string, number>();
  for (const r of fullDoLookup) fullDoMap.set(String(r.data_object_name), Number(r.id));

  // Build full domain map (includes target domains: GRC, AUDIT, S2P, SUP-LIFE, ERP-FIN, CRM, etc.)
  const fullDomainLookup = await get("/domains?select=id,domain_code&limit=10000");
  const fullDomainMap = new Map<string, number>();
  for (const r of fullDomainLookup) fullDomainMap.set(String(r.domain_code), Number(r.id));

  // --- DOMAIN_DATA_OBJECTS ---
  console.log("\nDomain-data-object links...");
  const existingDdo = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=20000");
  const ddoKey = (did: number, oid: number, role: string) => `${did}:${oid}:${role}`;
  const existingDdoKeys = new Set(existingDdo.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));
  const newDdo = domainDataObjects
    .map(ddo => {
      const did = fullDomainMap.get(ddo.domain_code);
      const oid = fullDoMap.get(ddo.data_object_name);
      if (!did) throw new Error(`Missing domain: ${ddo.domain_code}`);
      if (!oid) throw new Error(`Missing data_object: ${ddo.data_object_name}`);
      return { domain_id: did, data_object_id: oid, role: ddo.role, notes: ddo.notes };
    })
    .filter(r => !existingDdoKeys.has(ddoKey(r.domain_id, r.data_object_id, r.role)));
  console.log(`  inserting ${newDdo.length} domain_data_objects (${existingDdoKeys.size} already existed)`);
  await insert("/domain_data_objects", newDdo);

  // --- TRIGGER_EVENTS ---
  console.log("\nTrigger events...");
  const tePayload = triggerEvents.map(te => {
    const oid = fullDoMap.get(te.data_object_name);
    if (!oid) throw new Error(`Missing data_object for trigger_event: ${te.data_object_name}`);
    return {
      event_name: te.event_name,
      data_object_id: oid,
      event_category: te.event_category,
      from_state: te.from_state,
      to_state: te.to_state,
      description: te.description,
    };
  });
  const teMap = await syncTable("/trigger_events", tePayload, "event_name");

  // --- CROSS_DOMAIN_HANDOFFS ---
  console.log("\nCross-domain handoffs...");
  const existingHo = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=20000");
  const hoKey = (s: number, t: number, o: number, ev: string) => `${s}:${t}:${o}:${ev}`;
  const existingHoKeys = new Set(existingHo.map(r => hoKey(Number(r.source_domain_id), Number(r.target_domain_id), Number(r.data_object_id), String(r.trigger_event))));

  const newHo: Row[] = [];
  for (const h of handoffs) {
    const sid = fullDomainMap.get(h.source_domain_code);
    const tid = fullDomainMap.get(h.target_domain_code);
    const oid = fullDoMap.get(h.data_object_name);
    const teId = teMap.get(h.trigger_event_name);
    if (!sid) { console.warn(`  skip — missing source domain ${h.source_domain_code}`); continue; }
    if (!tid) { console.warn(`  skip — missing target domain ${h.target_domain_code}`); continue; }
    if (!oid) { console.warn(`  skip — missing data_object ${h.data_object_name}`); continue; }
    if (!teId) { console.warn(`  skip — missing trigger_event ${h.trigger_event_name}`); continue; }
    if (h.source_domain_code === h.target_domain_code) { console.warn(`  skip — intra-domain handoff ${h.source_domain_code}`); continue; }
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

  // --- AUDIT ---
  console.log("\n=== Phase B audit ===");
  for (const code of ["FMIS", "FOOD-TRACE", "DAIRY-MGMT", "FSQM", "FARMER-DIRECT-SALES"]) {
    const did = fullDomainMap.get(code)!;
    const [masters, contribs, consumers, outbound, inbound] = await Promise.all([
      get(`/domain_data_objects?domain_id=eq.${did}&role=eq.master&select=id`),
      get(`/domain_data_objects?domain_id=eq.${did}&role=eq.contributor&select=id`),
      get(`/domain_data_objects?domain_id=eq.${did}&role=eq.consumer&select=id`),
      get(`/cross_domain_handoffs?source_domain_id=eq.${did}&select=id`),
      get(`/cross_domain_handoffs?target_domain_id=eq.${did}&select=id`),
    ]);
    console.log(`  ${code}: master=${masters.length} contrib=${contribs.length} consumer=${consumers.length} → out=${outbound.length} ← in=${inbound.length}`);
  }

  console.log("\n=== UI links ===");
  console.log("  Data objects:  https://tests.semantius.app/domain_map/data_objects");
  console.log("  Trigger events: https://tests.semantius.app/domain_map/trigger_events");
  console.log("  Handoffs:      https://tests.semantius.app/domain_map/cross_domain_handoffs");
}

await main();
