#!/usr/bin/env bun
// Closes the a-file pass for TMS and TRUCKING-TMS (SKILL.md Rule #22 steps 3-5): rewrites state.yaml with
// what is still open, renders the fresh q-file (catalog copy approvals only), and appends history.
// Audit files only. Makes no semantius calls. Deleting the a-files is the caller's last step.

import { readFileSync, writeFileSync } from "fs";
import yaml from "js-yaml";
import { tms } from "./2026-11-03_transport_spec_tms.ts";
import { trucking } from "./2026-11-03_transport_spec_trucking.ts";
import type { DomainSpec } from "./2026-11-03_transport_build.ts";

const IDS: Record<string, number> = { TMS: 194, "TRUCKING-TMS": 195 };

type Open = { b1b: object[]; b3: object[]; about: string[]; history: string };

const shared = {
  neighborRegs: "Seeded 20 regulations and tagged them on both domains on 2026-11-03.",
};

const tmsOpen: Open = {
  about: [
    "Software a company that buys freight uses to source carriers, plan and tender shipments, track them, and check the carrier's charges before paying. The buyer is a shipper, not the trucking company hauling the freight, which is the sibling domain Trucking Transportation Management (TRUCKING-TMS).",
    "These are the last approvals this domain needs: the buyer-facing wording for the catalog. Answer yes to use a block as written, or write your correction.",
  ],
  b1b: [
    {
      id: "B1B-NEIGHBOR-MODULES",
      summary: "Eight consumed records have no module-level master because S2P, OMS, AP-AUTO, and ESG have no modules yet (B5, UNOWNED in B9d).",
      finding: "sourcing_events, purchase_orders, goods_receipts, and supplier_invoices (S2P), order_allocations and inventory_locations (OMS), payment_runs (AP-AUTO), and emission_factors (ESG) are mastered only in the legacy domain_data_objects rollup. Health check B5 reads the module junction, so it fails here until those domains are modularized. The handoffs to and from them also have no module on the far side.",
      action: "Report-only. Clears when each neighbor gets its modules. Set target_domain_module_id and source_domain_module_id on the handoffs then, and re-run B5.",
      blocked_by: [
        { type: "domain_audit", blocking_domain: "S2P", milestone: "M1" },
        { type: "domain_audit", blocking_domain: "OMS", milestone: "M1" },
        { type: "domain_audit", blocking_domain: "AP-AUTO", milestone: "M1" },
        { type: "domain_audit", blocking_domain: "ESG", milestone: "M1" },
      ],
      affected_entities: ["sourcing_events", "purchase_orders", "goods_receipts", "supplier_invoices", "order_allocations", "inventory_locations", "payment_runs", "emission_factors"],
    },
    {
      id: "B1B-WMS-DOCK",
      summary: "dock_appointments may move to WMS when that candidate loads.",
      finding: "Gartner places yard closer to WMS, and WMS would claim the same dock calendar. WMS is still a queue candidate with nothing in the catalog.",
      action: "Re-check the owner of dock_appointments when WMS is promoted.",
      blocked_by: [{ type: "catalog_addition", scope: "domains", trigger: "WMS promotion" }],
      affected_entities: ["dock_appointments"],
    },
    {
      id: "B1B-HAZMAT-PAIR",
      summary: "hazmat_shipping_papers (TMS) and hazmat_load_declarations (TRUCKING-TMS) were not compared in research.",
      finding: "Both were loaded as separate records. They may hold overlapping data. Neither Phase 0 report compared them.",
      action: "Compare them when field-level specs are drafted, and surface a merge only if they prove to be one record.",
      blocked_by: [{ type: "depends_on", ref: "field-level spec for either module", reason: "the catalog models no fields" }],
      affected_entities: ["hazmat_shipping_papers", "hazmat_load_declarations"],
    },
  ],
  b3: [
    { id: "B3-ROUTING-GUIDES", candidate: "freight_routing_guides", rationale: "Confirmed at Shipwell. Oracle's nearest resources are not the same concept.", vendor_evidence: ["Shipwell"], proposed_module: "TMS-CARRIER-RATES" },
    { id: "B3-LANE-AWARDS", candidate: "freight_lane_awards", rationale: "Confirmed at Transporeon as carrier allocations on an auction.", vendor_evidence: ["Transporeon"], proposed_module: "TMS-PROCUREMENT" },
    { id: "B3-SHIPMENT-LEGS", candidate: "freight_shipment_legs", rationale: "Confirmed at Oracle.", vendor_evidence: ["Oracle"], proposed_module: "TMS-SHIPMENTS" },
    { id: "B3-VEHICLE-ALLOCATIONS", candidate: "freight_vehicle_allocations", rationale: "Confirmed at Transporeon.", vendor_evidence: ["Transporeon"], proposed_module: "TMS-SHIPMENTS" },
    { id: "B3-COST-ACCRUALS", candidate: "freight_cost_accruals", rationale: "Confirmed at Transporeon.", vendor_evidence: ["Transporeon"], proposed_module: "TMS-SETTLEMENT" },
    { id: "B3-SHIPMENT-ALERTS", candidate: "freight_shipment_alerts", rationale: "Confirmed at Shipwell.", vendor_evidence: ["Shipwell"], proposed_module: "TMS-SHIPMENTS" },
    { id: "B3-DELIVERY-NOTES", candidate: "electronic_delivery_notes", rationale: "Confirmed at Transporeon.", vendor_evidence: ["Transporeon"], proposed_module: "TMS-SHIPMENTS" },
    { id: "B3-CARRIER-SCORECARDS", candidate: "freight_carrier_scorecards", rationale: "Manhattan marketing only.", vendor_evidence: ["Manhattan"], proposed_module: "TMS-CARRIER-RATES" },
    { id: "B3-CARRIER-QUALIFICATIONS", candidate: "freight_carrier_qualifications", rationale: "Core by count, but all three cells are marketing. Do not treat as confirmed until a doc is found.", vendor_evidence: ["Infios", "Shipwell", "Transporeon"], proposed_module: "TMS-CARRIER-RATES" },
  ],
  history: `
## 2026-11-03: Built (new domain, established_market, id 194)

**Decisions (a-TMS.md, all as recommended).** q1 yes, add as established market. q2 a, five modules. q3 a, new freight_bid_events master. q4 a, TMS masters invoices through approval and FREIGHT-AUDIT stays a candidate. q5 yes, parcel out. q6 yes, visibility separate. q7 a, split at the dock door. q8 yes, brokerage out. q9 yes, customs out. q10 yes, master transportation_orders. q11 yes, freight_carriers separate from suppliers. q12 a, hazmat papers their own record. q13 a, sanitary records here. q14 a, $1,200M. q15 b, required set plus CountEmissions. q16 yes, research lower-evidence records later. q17 yes, queue three candidates. The user asked for these questions to be put one by one in chat, then chose "Apply everything".

**Loaded (all record_status='new'):**
- Phase A: domain 194; 10 capabilities; 5 full modules (TMS-SHIPMENTS, TMS-CARRIER-RATES, TMS-PROCUREMENT, TMS-SETTLEMENT, TMS-DOCK); 13 primary solutions; 9 new vendors; 5 domain aliases.
- Phase B: 38 masters, lifecycle on 12 workflow masters, 23 trigger events, relationships including 9 users edges, 29 aliases, 31 handoffs across intra-domain and cross-domain, tagged to custom processes.
- Phase C: Logistics owner; Procurement and Accounts Payable contributors; Warehouse Operations consumer; 3 capability-level owners.
- Phase S: domain skill tms; tools and domain_module_tools.
- Phase E: 5 personas, 6 custom processes with RACI.
- Regulations: 6 tagged, from the seed of 20 shared with TRUCKING-TMS.

**Judgment calls in the load, not vendor findings.** crud_percentage 70 and the business_logic text are my estimates. min_org_size is 20 s <500, the smallest buyer of any tier, per the Rule #8 definition; a buyer of the full surface would be 30 m <2500. cost_band $$$ follows Phase 0.

**Corrections made during the load.** The q-file said "optional module" for Dock. No such catalog concept exists: every module deploys on its own, and is_install_optional applies to records. Process tags first written as APQC codes were re-pointed to the custom processes that realize each payload, as B9d requires; purchase_orders and order_allocations stay on 4.4.4 and payment_runs on 4.4.4.4 because no module masters those payloads yet. Custom processes first loaded without process_key, which collapsed RACI grouping (R4), now carry one.

**Health (domain_health.ts, this pass).** Fails: A4 and M8 (catalog copy, awaiting the q-file answer), B5 (neighbors have no modules, B1B-NEIGHBOR-MODULES). Warns: S3, B7, B10, B11, and E6 R6 on neighbors' events with blank to_state, which are other domains' rows. B7 and B11: acted-on masters got users edges and non-obvious masters got aliases; the rest are self-explanatory or record-grain. b3 items were approved for later and were not loaded. Blueprint emission was not run.

**Not done here.** Queue and protocol changes are recorded in audits/_missing-domains.md and the skill changelog.
`,
};

const truckingOpen: Open = {
  about: [
    "Software a trucking company uses to run its freight business: take a load from a customer, dispatch it on its own trucks or a partner's, bill the customer, and settle with drivers and owner-operators. The buyer is a for-hire carrier or a private fleet, not the shipper who buys the freight, which is the sibling domain Transportation Management System (TMS).",
    "These are the last approvals this domain needs: the buyer-facing wording for the catalog. Answer yes to use a block as written, or write your correction.",
  ],
  b1b: [
    {
      id: "B1B-FLEET-COMPLIANCE-RECORDS",
      summary: "Records this domain reads but FLEET-MGMT should own do not exist yet.",
      finding: "Phase 0 assigns driver_qualification_records (49 CFR 391.51), clearinghouse_queries (49 CFR 382.701), and ucr_registrations (49 USC 14504a, low confidence) to FLEET-MGMT, because private fleets owe them too. toll_transactions and vehicle_permits are FLEET-MGMT candidates on vendor evidence. None exists in the catalog. The regulations are seeded and tagged here.",
      action: "Report-only here. Raise on the next FLEET-MGMT audit; this domain is a consumer once they exist.",
      blocked_by: [{ type: "domain_audit", blocking_domain: "FLEET-MGMT", milestone: "carrier compliance records" }],
      affected_entities: ["driver_qualification_records", "clearinghouse_queries", "ucr_registrations", "toll_transactions", "vehicle_permits"],
    },
    {
      id: "B1B-ELD-COMPLIANCE-OVERLAP",
      summary: "The ELD-COMPLIANCE candidate overlaps live owners, and EU tachograph records have no owner.",
      finding: "ELD-COMPLIANCE claims hours of service, DVIR, and IFTA. Live data gives eld_logs to TELEMATICS and vehicle_inspections to FLEET-MGMT, and ifta_quarterly_returns now sits in FLEET-MGMT. tachograph_records and driving_rest_records belong to TELEMATICS or ELD-COMPLIANCE, and this domain only consumes them. They were not loaded.",
      action: "Report-only here. Settle when ELD-COMPLIANCE gets its point-solution review, including whether IFTA moves.",
      blocked_by: [{ type: "catalog_addition", scope: "domains", trigger: "ELD-COMPLIANCE point-solution review" }],
      affected_entities: ["eld_logs", "vehicle_inspections", "ifta_quarterly_returns", "tachograph_records", "driving_rest_records"],
    },
    {
      id: "B1B-DRAYAGE-RECHECK",
      summary: "Drayage was loaded as a module on marketing evidence, and may still pass as its own domain.",
      finding: "The user chose a domain module over install-optional records. PortPro drayOS and CargoWise Landside are specialists, and only marketing pages were read, so the three masters are a first cut. Specialist records terminal_appointments, plus LTL interline_partner_splits and tank_wash_records, were skipped.",
      action: "Re-check against a schema if a drayage vendor publishes one. Surface a promotion to its own domain only with that evidence.",
      blocked_by: [{ type: "depends_on", ref: "drayage vendor schema", reason: "marketing evidence only so far" }],
      affected_entities: ["intermodal_containers", "container_per_diem_charges", "chassis_usages"],
    },
    {
      id: "B1B-PLATFORM-SCIENCE",
      summary: "Platform Science, which now owns Trimble's telematics units, is not in the catalog.",
      finding: "The Trimble Transportation row no longer claims those units, so TELEMATICS may be missing a vendor. Adding it was not part of the approved answers.",
      action: "Raise on the next TELEMATICS audit.",
      blocked_by: [{ type: "domain_audit", blocking_domain: "TELEMATICS", milestone: "solutions refresh" }],
    },
  ],
  b3: [
    { id: "B3-RATE-CONFIRMATIONS", candidate: "rate_confirmations", rationale: "Alvys documents outbound to a carrier and inbound from a customer. Truckbase has a PDF load importer and mentions rate cons in a blog. One confirmed vendor understates it.", vendor_evidence: ["Alvys", "Truckbase"], proposed_module: "TRK-LOADS" },
    { id: "B3-TRIP-LEGS", candidate: "trip_legs", rationale: "Confirmed in TMW.Suite docs only.", vendor_evidence: ["Trimble TMW.Suite"], proposed_module: "TRK-DISPATCH" },
    { id: "B3-CHECK-CALLS", candidate: "trip_check_calls", rationale: "Confirmed in Alvys docs only.", vendor_evidence: ["Alvys"], proposed_module: "TRK-DISPATCH" },
    { id: "B3-SETTLEMENT-PAYEES", candidate: "settlement_payees", rationale: "Confirmed in TMW.Suite docs only.", vendor_evidence: ["Trimble TMW.Suite"], proposed_module: "TRK-SETTLEMENT" },
    { id: "B3-LOAD-REQUIREMENTS", candidate: "load_requirements", rationale: "Confirmed in TMW.Suite docs only. Could fold into equipment types.", vendor_evidence: ["Trimble TMW.Suite"], proposed_module: "TRK-LOADS" },
  ],
  history: `
## 2026-11-03: Built (new domain, established_market, id 195)

**Decisions (a-TRUCKING-TMS.md).** q1 a, top-level sibling of TMS. q2 yes, FTL is a capability (loaded as TRK-FTL). q3 a, LTL module. q4 b, drayage module, against the recommendation of records for now. q5 yes, tank and bulk as records. q6 a, carriers that also broker; brokers with no fleet stay a separate market. q7 a, road forwarding in the brokerage module; air and ocean out. q8 a, seven modules with no Compliance module. q9 a, local copies of drivers and trucks. q10 a, new fleet_trailers in FLEET-MGMT. q11 yes, trip assignment separate from fleet_assignments. q12 a, IFTA in FLEET-MGMT. q13 a, posting declarations here. q14 a, carrier_freight_* prefix. q15 a, freight_loads and load_tenders. q16 a, TMS masters bills of lading and consignment notes. q17 yes, one freight_equipment_types. q18 yes, $500M estimate. q19 a, both regulation sets. q20 yes, Trimble row. q21 yes, FLEET-MGMT description. q22 yes, research lower-evidence records later. q23 yes, queue two candidates. q24 yes, protocol rows. The user asked for these questions in chat, asked "why not a domain module" on q6 and q7, answered the corrected versions, then chose "Apply everything".

**Why q6 and q7 changed.** The original options said "install-optional module" and "core". Neither exists in the catalog: every module deploys on its own, and is_install_optional applies to records. Road forwarding has no records of its own, and a full module must master at least one, so it sits in the brokerage module.

**Loaded (all record_status='new'):**
- Phase A: domain 195; 10 capabilities; 7 full modules (TRK-LOADS, TRK-DISPATCH, TRK-BILLING, TRK-SETTLEMENT, TRK-BROKERAGE, TRK-LTL, TRK-DRAYAGE); 12 solutions (8 primary, 2 secondary, 2 partial) including the corrected Trimble row; 9 new vendors; 6 domain aliases.
- Phase B: 46 masters, lifecycle on 11 workflow masters, trigger events, relationships including users edges, aliases, handoffs across intra-domain and cross-domain, tagged to custom processes.
- Phase C: Logistics owner; Accounts Receivable and Accounting contributors; Customer Service consumer; 2 capability-level owners.
- Phase S: domain skill trucking-tms; tools and domain_module_tools.
- Phase E: 6 personas, 6 custom processes with RACI.
- Regulations: 17 tagged, from the seed of 20 shared with TMS. BOC-3 and the annulled EU vehicle-return duty were left out as approved.
- On FLEET-MGMT, per q10 and q12: masters fleet_trailers (FLEET-MGMT-VEHICLE-LIFECYCLE) and ifta_quarterly_returns (FLEET-MGMT-FUEL-COMPLIANCE), with one event, one handoff to FIN, and edges.

**Overwrites made (approved in q20, q21; each checked against the approved "from" value first).** solutions 717 description; solution_domains 1040 TELEMATICS primary to partial; 1039 FLEET-MGMT primary to secondary; domains FLEET-MGMT description.

**Judgment calls in the load, not vendor findings.** crud_percentage 75 and the business_logic text are my estimates. cost_band $$$ is my estimate: about 300 to 400 trucks at a 500-user carrier, at $30 to $60 per truck per month, gives $108K to $288K a year. certification_required false: FMCSA ELD certification falls on TELEMATICS, not here.

**Corrections and departures during the load.**
- q12 said this domain contributes trip miles. A contributor role fails M9, because a module must deploy alone, so TRK-DISPATCH carries ifta_quarterly_returns as an install-optional embedded_master, plus a freight_trips edge and a handoff of miles to FLEET-MGMT.
- pay_runs came off TRK-SETTLEMENT (a row from this same load) because it drew in an unrelated required link; the handoff of approved settlements to PAYROLL covers employee drivers.
- pickup_delivery_routes collided with live delivery_routes under Rule #9, so it loaded as ltl_pickup_routes.
- Proof of delivery is a document type on carrier_freight_documents rather than its own record, as Phase 0 allowed.
- Process tags and process_key: see the TMS history.

**Health (domain_health.ts, this pass).** Fails: A4 and M8 only (catalog copy, awaiting the q-file answer). Warns: S3, B7, B10, B11, and E6 R6, the last from neighbors' events with blank to_state on records embedded here. FLEET-MGMT fails were present before this load and are unchanged in kind; two caused by this load were fixed. b3 items were approved for later and were not loaded. Blueprint emission was not run.
`,
};

function render(spec: DomainSpec, open: Open) {
  const code = spec.domain.domain_code;
  const blocks = [
    { id: "B1A-COPY-DOMAIN", label: spec.domain.domain_name, table: "domains", key: code, copy: spec.copy.domain },
    ...spec.modules.map((m) => ({ id: `B1A-COPY-${m.code}`, label: m.name, table: "domain_modules", key: m.code, copy: spec.copy.modules[m.code] })),
  ];
  const state = {
    schema_version: 2,
    domain: code,
    status: "feedback_needed",
    next_action_by: "user",
    last_audit: "2026-11-03",
    b1a: blocks.map((b) => ({
      id: b.id,
      summary: `Write the approved catalog copy for ${b.label}.`,
      finding: "catalog_tagline and catalog_description are empty (A4 or M8, Rule #20). The wording is drafted and waits for approval.",
      action: "Write these two values once approved, or the user's correction, at record_status='new'. Fill empty columns only.",
      extra_rows: [
        { table: b.table, natural_key: b.key, field: "catalog_tagline", to: b.copy.tagline },
        { table: b.table, natural_key: b.key, field: "catalog_description", to: b.copy.description },
      ],
    })),
    b1b: open.b1b,
    b2: [],
    b3: open.b3.map((x) => ({ ...x, extra_answer: "Approved 2026-11-03: research and add after the modules exist." })),
  };
  writeFileSync(`audits/${code}/state.yaml`, yaml.dump(state, { lineWidth: 100, noRefs: true, quotingType: '"' }), "utf8");

  const out: string[] = [`# ${spec.domain.domain_name} (${code}): questions waiting for you`, "", "## What this domain is", ""];
  for (const p of open.about) out.push(p, "");
  out.push("---", "");
  const map: string[] = [];
  blocks.forEach((b, i) => {
    const n = i + 1;
    map.push(`q${n}=${b.id}`);
    out.push(`q${n}: Should the catalog use this wording for ${b.label}? (yes/no, or write your correction)`, "");
    out.push(`Tagline: ${b.copy.tagline}`, "", "Description:", "");
    for (const para of b.copy.description.split("\n\n")) out.push(`> ${para}`, ">");
    out.pop();
    out.push("", "Recommended: yes. Written in buyer voice, from what the module's records and workflows do. It names no vendors.", "", `a${n}:`, "", "---", "");
  });
  out.push(`<!-- agent map, ignore: ${map.join(" ")} | domain_id=${IDS[code]} -->`, "");
  writeFileSync(`audits/${code}/q-${code}.md`, out.join("\n"), "utf8");

  const historyPath = `audits/${code}/history.md`;
  writeFileSync(historyPath, readFileSync(historyPath, "utf8").trimEnd() + "\n" + open.history, "utf8");
  console.log(`${code}: state.yaml, q-${code}.md (${blocks.length} copy blocks), history appended`);
}

render(tms, tmsOpen);
render(trucking, truckingOpen);
void shared;
