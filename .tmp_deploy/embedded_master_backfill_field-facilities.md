# Embedded-master + necessity backfill — `field-facilities` cluster

**Scope:** 13 domains — FSM (31), FLEET-MGMT (147), FLEET-MAINT (149), TELEMATICS (148), EAM (53), REAL-EST (141), CAFM (142), IWMS (23), RE-CRE (145), RE-PROP-MGMT (144), RE-BROKERAGE (143), RE-INVEST (146), VIS-MGMT (24).

**Why this cluster is special.** It is the most physical-world-heavy cluster in the catalog. Three of the 13 domains (CAFM, IWMS, VIS-MGMT) currently hold **zero** `domain_data_objects` rows — they have never been Phase-1 loaded. The remaining 10 are richly modelled but were loaded before the `embedded_master` / `necessity` split shipped, so every "master" row needs a re-classification pass. The cluster also has the catalog's clearest scope-qualifying naming case study (`facility_work_orders` / `eam_work_orders` / `vehicle_work_orders` already split correctly at id 349/476/379, but FSM has no customer-facing `fsm_work_orders` row yet — Section 6).

**Sources of truth at draft time (2026-05-22):**
- 13-domain id list confirmed via `domains?domain_code=in.(...)`.
- 55 existing `domain_data_objects` rows pulled with full notes (Section 1).
- Cross-checked existing master / embedded_master / consumer rows for `employees` (id 31), `customers` (id 97), `positions` (id 32), `hardware_assets` (id 56), `invoices` (id 75), `fixed_assets` (id 201), `industrial_assets` (id 475), `eam_work_orders` (id 476), `equipment_pm_schedules` (id 477) catalog-wide so the demotions / new rows below land consistently with the rest of the platform.

> No writes performed. All semantius CLI invocations executed from `c:/dev/domain-map`.

---

## 1. Existing rows snapshot (55 rows)

Domains with current coverage and what they own.

### FSM (31) — 2 rows
| id | data_object | role | necessity | notes |
|---:|---|---|---|---|
| 445 | `field_visits` (261) | master | required | FSM master; CSM and asset-lifecycle consume on visit completion. |
| 446 | `dispatch_records` (262) | master | required | FSM-side dispatch artifact; technician schedule and customer comm are downstream. |

### EAM (53) — 3 rows (Phase-B already loaded with scope-qualified names)
| id | data_object | role | necessity | notes |
|---:|---|---|---|---|
| 724 | `industrial_assets` (475) | master | required | EAM Phase-B; trigger_events + handoffs deferred. |
| 725 | `eam_work_orders` (476) | master | required | EAM Phase-B; trigger_events + handoffs deferred. |
| 726 | `equipment_pm_schedules` (477) | master | required | EAM Phase-B; trigger_events + handoffs deferred. |

### REAL-EST (141) — 10 rows
| id | data_object | role | necessity | notes |
|---:|---|---|---|---|
| 568 | `real_estate_properties` (344) | master | required | Umbrella property master |
| 569 | `leases` (345) | master | required | ASC 842 / IFRS 16 lease accounting; CLM-distinct |
| 570 | `floor_plans` (346) | master | required |  |
| 571 | `spaces` (347) | master | required |  |
| 572 | `occupancy_records` (348) | master | required |  |
| 573 | `facility_work_orders` (349) | master | required | FSM consumes for technician dispatch |
| 574 | `utility_meter_readings` (350) | master | required | Scope 1+2 source data; ESG consumes via activity_data_records |
| 575 | `capital_projects` (351) | master | required | Building-improvement projects |
| 576 | `configuration_items` (76) | consumer | required | EAM-mastered; assets contained in properties (FIXME: should be `industrial_assets` (475), not `configuration_items` — see Section 6) |
| 577 | `employees` (31) | consumer | required | Seat-assignment + occupancy analytics |

### RE-BROKERAGE (143) — 7 rows
| id | data_object | role | necessity | notes |
|---:|---|---|---|---|
| 578 | `real_estate_listings` (352) | master | required | Listing lifecycle owned at the brokerage; syndicated to MLS and portals. |
| 579 | `real_estate_transactions` (353) | master | required | Offer-to-close transaction pipeline; broker-of-record compliance. |
| 580 | `commission_splits` (354) | master | required | Per-transaction commission distribution; feeds brokerage accounting. |
| 581 | `tour_appointments` (355) | master | required | Showing schedule for active listings. |
| 582 | `disclosure_documents` (356) | master | required | Per-transaction compliance documents per state and brokerage policy. |
| 583 | `contacts` (98) | contributor | required | Buyer/seller leads and past-client contacts; CRM cluster masters. |
| 584 | `leads` (99) | contributor | required | Real-estate inbound leads enrich the CRM-mastered leads pool. |

### RE-PROP-MGMT (144) — 7 rows
| id | data_object | role | necessity | notes |
|---:|---|---|---|---|
| 585 | `rental_units` (357) | master | required | Lettable-unit inventory per property. |
| 586 | `tenants` (358) | master | required | Tenant master per rental unit; lease and payment history. |
| 587 | `rental_applications` (359) | master | required | Prospective-tenant applications and screening results. |
| 588 | `rent_payments` (360) | master | required | Rent collection records; reconciled to per-property GL. |
| 589 | `tenant_maintenance_requests` (361) | master | required | Tenant-submitted maintenance lifecycle. |
| 590 | `rental_leases` (362) | master | required | Residential lease agreements; landlord side. |
| 591 | `invoices` (75) | contributor | required | Rent invoicing contributes to AR-cluster invoices view. |

### RE-CRE (145) — 4 rows
| id | data_object | role | necessity | notes |
|---:|---|---|---|---|
| 592 | `commercial_leases` (363) | master | required | Commercial leases; landlord side. Distinct from REAL-EST leases. |
| 593 | `stacking_plans` (364) | master | required | Building-level space inventory and lease-expiration heatmap. |
| 594 | `cam_charges` (365) | master | required | Annual CAM reconciliation and tenant true-up. |
| 595 | `investment_properties` (366) | contributor | required | CRE-operations layer feeds rent rolls and NOI to RE-INVEST-mastered valuations. |

### RE-INVEST (146) — 6 rows
| id | data_object | role | necessity | notes |
|---:|---|---|---|---|
| 596 | `investment_properties` (366) | master | required | Investor view of the asset (acquisition basis, debt, valuation, NOI history). |
| 597 | `capital_calls` (367) | master | required | GP-to-LP capital-call issuance and funding tracking. |
| 598 | `fund_distributions` (368) | master | required | Waterfall payouts to LPs and GP. |
| 599 | `property_valuations` (369) | master | required | Periodic valuations driving NAV. |
| 600 | `commercial_leases` (363) | consumer | required | Read rent rolls and lease-economics for valuation models. |
| 601 | `rental_leases` (362) | consumer | required | Read residential rent rolls for multifamily-fund valuation. |

### FLEET-MGMT (147) — 6 rows
| id | data_object | role | necessity | notes |
|---:|---|---|---|---|
| 602 | `vehicles` (370) | master | required | Vehicle master record; TELEMATICS and FLEET-MAINT contribute against it. |
| 603 | `drivers` (371) | master | required | Driver records held in fleet-mgmt platform; co-master with HCM `employees` for employed drivers. |
| 604 | `fuel_transactions` (372) | master | required | Fuel-card ingestion mastered in fleet-mgmt; ERP-FIN consumes for accounting. |
| 605 | `fleet_assignments` (373) | master | required | Vehicle-driver-job time-bound assignment records. |
| 606 | `vehicle_inspections` (374) | master | required | DVIR records; defects route into FLEET-MAINT work orders. |
| 607 | `employees` (31) | contributor | required | Employed drivers contribute driver records back to HCM employees. |

### TELEMATICS (148) — 6 rows
| id | data_object | role | necessity | notes |
|---:|---|---|---|---|
| 608 | `vehicle_trips` (375) | master | required | GPS-segmented trip records derived from raw telemetry. |
| 609 | `driver_behavior_events` (376) | master | required | Risky-behavior event detection from telemetry + AI. |
| 610 | `eld_logs` (377) | master | required | FMCSA-compliant HOS records. |
| 611 | `dashcam_events` (378) | master | required | Video-incident records. |
| 612 | `vehicles` (370) | consumer | required | Vehicle master referenced for telemetry ingestion. |
| 613 | `drivers` (371) | consumer | required | Driver master referenced for HOS and behavior attribution. |

### FLEET-MAINT (149) — 4 rows
| id | data_object | role | necessity | notes |
|---:|---|---|---|---|
| 614 | `vehicle_work_orders` (379) | master | required | Vehicle maintenance/repair work orders. |
| 615 | `preventive_maintenance_schedules` (380) | master | required | PM-schedule templates per vehicle class. |
| 616 | `vehicles` (370) | consumer | required | Maintenance against the vehicle master. |
| 617 | `vehicle_inspections` (374) | consumer | required | Inspection defects routed in from FLEET-MGMT. |

### CAFM (142), IWMS (23), VIS-MGMT (24) — 0 rows each
These three domains exist in `domains` but have no `domain_data_objects` rows. They need Phase-1 master loads before any embedded_master / consumer rows here are meaningful. See Section 6.

---

## 2. NEW rows to add — embedded_master (point-solution local copies)

Reasoning: each row below documents a record the domain *would* locally master if deployed standalone, but defers to a canonical master in a holistic deployment. Per SKILL.md Phase 2 these become `embedded_master + required`. Notes must state the demotion path.

### Cluster flagships first

The cluster has three structural flagships that drive most of the embedded_master volume:
1. **`customers` (id 97, CRM/CSM/CDP/SUB-MGMT canonical)** — held locally by FSM, RE-BROKERAGE, RE-PROP-MGMT.
2. **`employees` (id 31, HCM/PAYROLL/IGA canonical)** — held locally by FSM (technicians), RE-BROKERAGE (agents), RE-PROP-MGMT (property managers).
3. **`vehicles` (id 370, FLEET-MGMT canonical inside the cluster)** — held locally by FLEET-MAINT and TELEMATICS when deployed standalone (e.g. Geotab/Samsara as a standalone telematics tier without a fleet system of record).

> The current rows (612, 613, 616) already model FLEET-MAINT and TELEMATICS as `consumer + required` of `vehicles` / `drivers`. Section 3 demotes those to `embedded_master + required` per Phase-2 anti-pattern #5 ("Modelling holistic-deployment-only consumer rows when an embedded_master row already captures the same dependency"). Section 2 lists only genuinely *new* rows.

### FSM (31)

| data_object | role | necessity | reasoning |
|---|---|---|---|
| `customers` (97) | embedded_master | required | ServiceMax / Salesforce FSM / IFS FSM all hold a local customer record per service contract — name, install base, contact, service address — and reconcile to CRM/CSM when integrated. Without a customer record, FSM cannot create a work order, dispatch a visit, or invoice. In holistic deployment defers to CRM/CSM/CDP. |
| `employees` (31) | embedded_master | required | Field-technician roster: name, certifications, territories, vehicle, mobile device, license expiration. FSM platforms ship a full technician master (Salesforce Field Service "Service Resources", ServiceMax "Technicians") because scheduling requires it inline. Defers to HCM when integrated for employed technicians; contractor technicians remain FSM-mastered (parallel to FLEET-MGMT `drivers`). |
| `work_orders` (NEW — see Section 6) | master | required | FSM masters customer-facing work orders. **Blocked**: no scope-qualified data_object exists. Need `fsm_work_orders` (or `customer_work_orders`) created first. The existing `work_orders` id 187 is the VMS staff-aug requisition object — different domain. |
| `assets` (NEW — see Section 6) | embedded_master | required | FSM holds the "install base" (customer-owned equipment being serviced — HVAC units at customer sites, medical devices, telecom gear). Defers to EAM `industrial_assets` when the customer's own EAM is integrated, which is rare; usually FSM is the master of record for serviceable items at customer locations. **Blocked**: needs `serviceable_assets` or `customer_assets` data_object (Section 6). |

### RE-BROKERAGE (143)

| data_object | role | necessity | reasoning |
|---|---|---|---|
| `customers` (97) | embedded_master | optional | Real-estate brokerages (kvCORE, BoomTown, Compass platform) hold buyer/seller customer records locally. Defers to CRM if integrated, but per SKILL.md Phase-2 (e) integrations with CRM are *optional* in the brokerage market — many brokerages don't run a separate CRM. Note: rows 583/584 already model `contacts` and `leads` as contributors to CRM-mastered records; this row covers the *account-equivalent* customer record that brokerages keep distinct from CRM contacts. |
| `employees` (31) | embedded_master | required | Agent roster (license number, brokerage affiliation, commission tier, team membership, MLS access). Most brokerages master agents in their transaction platform because commission splits and license compliance live with the transaction record, not HRIS. Defers to HCM only for the rare brokerage that runs Workday/ADP for its agents. |

### RE-PROP-MGMT (144)

| data_object | role | necessity | reasoning |
|---|---|---|---|
| `customers` (97) | embedded_master | required | Tenant record (358) covers the rental-tenant *relationship*; the broader `customers` row would cover prospective tenants converted from marketing, past tenants, and B2B leasing customers (commercial property managers). AppFolio/Yardi/Buildium hold this locally. Defers to CRM in larger operators (Greystar) where marketing/CRM is split out. |
| `employees` (31) | embedded_master | required | Property-manager and maintenance-staff roster held locally per portfolio — assigned properties, on-call rotation, vendor approval authority. Defers to HCM when the operator runs a proper HRIS; many mid-market property managers do not. |

### REAL-EST (141)

| data_object | role | necessity | reasoning |
|---|---|---|---|
| `industrial_assets` (475) | embedded_master | required | REAL-EST currently rows in `configuration_items` (76) as consumer (id 576 in Section 1), which is the wrong upstream — buildings contain HVAC / boilers / chillers / generators which are EAM-mastered `industrial_assets`. As an embedded_master row, REAL-EST holds asset metadata at the facility level (asset-to-space links, criticality) when standalone, deferring to EAM when integrated. Pairs with Section 3 fix of id 576. |

### IWMS (23)

> Currently 0 rows. IWMS as a market (Archibus, Tririga, Planon) is essentially "REAL-EST + CAFM + lease accounting + sustainability" in a unified suite. Section 6 flags it for Phase-1 mastering. **Pre-empting** the master rows IWMS *would* claim once Phase-1 ships:

| data_object | role | necessity | reasoning |
|---|---|---|---|
| `real_estate_properties` (344) | embedded_master | required | IWMS suites local-master properties when deployed standalone (Tririga unifies portfolio + ops + sustainability without REAL-EST). Defers to REAL-EST when present. |
| `leases` (345) | embedded_master | required | IWMS ships its own lease-accounting module (Tririga RELM, Nuvolo Lease) — holds the lease record locally. Defers to REAL-EST. |
| `floor_plans` (346) | embedded_master | required | Same pattern — IWMS owns floor plans for space allocation, defers to REAL-EST when the source is REAL-EST. |
| `spaces` (347) | embedded_master | required | Same. |
| `occupancy_records` (348) | embedded_master | required | Same — IWMS captures occupancy via badge / sensor / booking, defers to REAL-EST. |
| `facility_work_orders` (349) | embedded_master | required | IWMS ships maintenance work orders in suite (Planon Maintenance, Archibus Building Operations). Defers to REAL-EST master. |
| `employees` (31) | embedded_master | required | Workforce roster for seat-assignment, hot-desking, badge access. Defers to HCM. |
| `industrial_assets` (475) | embedded_master | optional | IWMS *may* include facility assets (Planon Asset, Tririga Operations); many IWMS deployments skip this and integrate to EAM. Hence optional. |

> Caveat: per SKILL.md anti-pattern "don't load `embedded_master` rows in a domain that has no Phase-1 mastering" — these IWMS rows are *staged* in this draft and should be deferred to a follow-up after IWMS Phase-1 runs. Listed here for completeness of the cluster integration-burden picture.

### CAFM (142)

> Currently 0 rows. CAFM (Archibus standalone, FM:Systems, Serraview) overlaps IWMS but at smaller scope (space + maintenance + moves; no lease accounting, no investment). Same staging caveat as IWMS.

| data_object | role | necessity | reasoning |
|---|---|---|---|
| `real_estate_properties` (344) | embedded_master | required | CAFM owns buildings in scope as a facility, not as a real-estate asset; defers to REAL-EST. |
| `floor_plans` (346) | embedded_master | required | CAFM's anchor object after spaces. |
| `spaces` (347) | embedded_master | required | CAFM is space-mastery first — Serraview / Condeco / iOFFICE all master spaces locally. |
| `occupancy_records` (348) | embedded_master | required | Workplace utilisation is CAFM's flagship metric; sensors and booking feed into local occupancy. Defers to REAL-EST in holistic. |
| `facility_work_orders` (349) | embedded_master | required | CAFM-side work-order issuance: moves, repairs, janitorial. Defers to REAL-EST master. |
| `employees` (31) | embedded_master | required | For seat-allocation and move management. Defers to HCM. |

### VIS-MGMT (24)

> Currently 0 rows. VIS-MGMT vendors (Envoy, Sine, Proxyclick, Traction Guest) master `visitors`, `visitor_appointments`, `host_notifications`. None of these data_objects exist in the catalog yet (Section 6).

| data_object | role | necessity | reasoning |
|---|---|---|---|
| `employees` (31) | embedded_master | optional | Host directory for visitor-host lookup. Envoy/Sine often skip this (admins type the host name) — only larger deployments integrate to HCM/AD for autocomplete. Per Phase-2 (d) explicitly *optional*. |
| `spaces` (347) | consumer | optional | Some VIS-MGMT deployments tie visitor sign-in to a meeting-room booking (Envoy Rooms); many do not. |

### EAM (53) — additional embedded_master rows

| data_object | role | necessity | reasoning |
|---|---|---|---|
| `employees` (31) | embedded_master | required | Maintenance-crew roster (assigned trades, certifications, shift). IBM Maximo and SAP PM both master crew records in the EAM module. Defers to HCM when integrated; defers to FSM `technicians` when FSM is also present and shared. |
| `real_estate_properties` (344) | consumer | required | EAM associates industrial assets to plant locations / facilities; reads property records from REAL-EST. |
| `fixed_assets` (201) | contributor | required | Industrial assets need a capitalisation link to ERP-FIN's fixed-asset register. EAM writes installation/in-service/disposal events; ERP-FIN masters the depreciation schedule. |

### FLEET-MGMT (147) — additional embedded_master rows

| data_object | role | necessity | reasoning |
|---|---|---|---|
| `fixed_assets` (201) | contributor | required | Vehicles are capitalised in ERP-FIN; FLEET-MGMT contributes acquisition / disposal events. |

### RE-INVEST (146) — derived + financial_metrics

See Section 5 (derived rows).

---

## 3. CHANGES to existing rows — role demotions and necessity flips

Per SKILL.md Phase-2 anti-pattern: don't model consumer rows when an embedded_master row captures the same dependency. Also: REAL-EST id 576 is mis-targeted at `configuration_items` and should be re-pointed at `industrial_assets`.

| existing id | domain | current | proposed | reasoning |
|---:|---|---|---|---|
| 612 | TELEMATICS | `vehicles` (370) consumer / required | **`vehicles` (370) embedded_master / required** | Standalone telematics platforms (Samsara, Geotab) master vehicles locally — they create the vehicle record at install time and only later reconcile to a fleet system of record. The current `consumer` row collapses the standalone-vs-holistic picture. Notes should state: "Standalone (Samsara/Geotab without separate FMS) — local master of the vehicle record; defers to FLEET-MGMT `vehicles` when an FMS is integrated." |
| 613 | TELEMATICS | `drivers` (371) consumer / required | **`drivers` (371) embedded_master / required** | Same shape — telematics creates/updates the driver record during ELD onboarding; defers to FLEET-MGMT when integrated. |
| 616 | FLEET-MAINT | `vehicles` (370) consumer / required | **`vehicles` (370) embedded_master / required** | Standalone fleet-maintenance shops (Mitchell 1, Fleetio used without a separate FMS) hold the vehicle master locally per maintenance bay. Defers to FLEET-MGMT in holistic. |
| 617 | FLEET-MAINT | `vehicle_inspections` (374) consumer / required | keep as **consumer / required** | Inspections are FLEET-MGMT-mastered (DVIRs created at trip start/end); FLEET-MAINT reads them to trigger work orders. Not an embedded_master pattern — there's no standalone FLEET-MAINT that creates inspections. |
| 576 | REAL-EST | `configuration_items` (76) consumer / required | **REPOINT to `industrial_assets` (475) embedded_master / required** | The original row pointed at CMDB's `configuration_items`, which is IT-only (servers, applications, network gear). REAL-EST does not consume CMDB; it consumes EAM's `industrial_assets` (HVAC, generators, building systems). Phase-2 (b) explicitly lists this as an embedded_master target. Action: delete row 576, insert REAL-EST→475 embedded_master. (Section 7 open question: who should this re-pointing be approved by — original loader of row 576 vs EAM Phase-B owner?) |
| 577 | REAL-EST | `employees` (31) consumer / required | **`employees` (31) embedded_master / required** | REAL-EST in suite form (Tririga + Workplace) holds an employee local copy for seat-assignment and floor-plan attribution. Defers to HCM. Current `consumer` row hides the embedded_master volume signal. |
| 591 | RE-PROP-MGMT | `invoices` (75) contributor / required | keep | Contributor is correct — RE-PROP-MGMT writes rent invoices into the AR cluster; it doesn't master the invoice object's lifecycle in a separate system. |
| 595 | RE-CRE | `investment_properties` (366) contributor / required | keep | Contributor is correct — CRE feeds rent rolls and NOI to RE-INVEST-mastered valuations. |
| 583 | RE-BROKERAGE | `contacts` (98) contributor / required | **`contacts` (98) contributor / optional** | Per Phase-2 (d) brokerage↔CRM integration is optional (many brokerages don't run a separate CRM). When the brokerage doesn't integrate, the contributor relationship doesn't exist. |
| 584 | RE-BROKERAGE | `leads` (99) contributor / required | **`leads` (99) contributor / optional** | Same reasoning as 583. |

---

## 4. NEW consumer (required) rows

Per Phase-2 (c) — explicit consumer rows that aren't already covered by an embedded_master row.

| domain | data_object | role | necessity | reasoning |
|---|---|---|---|---|
| FLEET-MAINT (149) | `drivers` (371) | consumer | required | Maintenance bay needs driver attribution for inspection→work-order routing. Not embedded_master because FLEET-MAINT doesn't standalone-master drivers (DVIR is created at trip-time by the driver in TELEMATICS / FLEET-MGMT, not in the shop). |
| FLEET-MAINT (149) | `fixed_assets` (201) | consumer | required | Pulls capitalised-vehicle cost basis for repair-vs-replace decisions. |
| EAM (53) | `cost_centers` (196) | consumer | required | Work-order labour and parts are charged to cost centers via ERP-FIN integration. |
| REAL-EST (141) | `cost_centers` (196) | consumer | required | CAM, OPEX, capital-project accounting all charge to cost centers. |
| RE-PROP-MGMT (144) | `cost_centers` (196) | consumer | required | Per-property GL is cost-centred. |
| RE-CRE (145) | `cost_centers` (196) | consumer | required | Per-property GL is cost-centred. |
| RE-INVEST (146) | `cost_centers` (196) | consumer | optional | Fund accounting is fund-centred, not cost-centred; some operators run cost centers, many don't. Hence optional. |
| FSM (31) | `cost_centers` (196) | consumer | required | Service revenue and parts spend are cost-centred for P&L. |
| FLEET-MGMT (147) | `cost_centers` (196) | consumer | required | Vehicle TCO, fuel, maintenance all cost-centred. |
| FSM (31) | `service_requests` (48) | contributor | required | CSM-mastered customer-reported service request becomes the trigger for an FSM work order; FSM writes resolution status back. Required because the standard FSM workflow starts here. (Different from work-order ownership — see Section 6.) |
| RE-PROP-MGMT (144) | `properties` (consumer link) | n/a — see below | n/a | Sub-cluster note: RE-PROP-MGMT already masters `rental_units` (357) which has the property linkage internally; no separate row needed against REAL-EST `real_estate_properties` because rental-only property managers don't generally hold the REAL-EST view of the same building. Flagged for review. |

---

## 5. NEW derived rows

Per Phase-2 (e) — RE-INVEST publishes portfolio performance against real-estate assets as derived analytics.

| domain | data_object | role | necessity | reasoning |
|---|---|---|---|---|
| RE-INVEST (146) | `investment_properties` (366) | already master, no change | — | RE-INVEST masters this row; the derived part is the *valuation series*, captured by `property_valuations` (369) which RE-INVEST also masters. No new derived row needed against `investment_properties` itself. |
| RE-INVEST (146) | `real_estate_properties` (344) | derived | required | RE-INVEST republishes investor-view performance (NOI, occupancy, valuation trends) against REAL-EST's property master, when the same physical building is in both views. The relationship is structurally distinct from "consumer" — RE-INVEST is not just reading the property record, it's emitting derived signals against it that other domains (treasury, board reporting) consume. **Note for reviewer**: this is the equivalent of REV-INTEL → CRM `opportunities` (the canonical derived shape from SKILL.md Phase 2). |
| RE-INVEST (146) | `financial_metrics` (MISSING) | derived | required | **Blocked**: `financial_metrics` does not exist as a data_object. RE-INVEST publishes IRR, cash-on-cash, equity multiple, NAV-per-share as derived metrics. Could be modelled as a separate data_object (`fund_performance_metrics`) or rolled up into EPM `forecasts`. See Section 6. |

---

## 6. Missing data_objects + boundary observations

Critical findings that block parts of Sections 2/4/5.

### 6a. Missing data_objects (must be created before some rows can be loaded)

1. **`fsm_work_orders` (or `customer_work_orders`) — MISSING.**
   - Per SKILL.md generic-name-scope-qualifying rule, FSM masters customer-facing work orders distinct from `facility_work_orders` (REAL-EST), `eam_work_orders` (EAM), `vehicle_work_orders` (FLEET-MAINT).
   - Current catalog state: id 187 `work_orders` is the VMS staff-aug requisition object (description: "Staff-augmentation or statement-of-work requisition: scope, role, rate range, duration, location, hiring manager, supplier-tier rules") — NOT customer-facing service work.
   - FSM rows 445/446 currently model `field_visits` and `dispatch_records` only; the parent work-order concept is missing entirely from FSM's data_objects.
   - **Action proposed**: create `fsm_work_orders` data_object with description "Customer-facing service work order: customer site visit demand, service contract reference, dispatched technician, parts plan, billing terms. Distinct from REAL-EST `facility_work_orders` (in-house FM), EAM `eam_work_orders` (industrial plant), FLEET-MAINT `vehicle_work_orders` (fleet)." Then add FSM→`fsm_work_orders` master/required and field_visits/dispatch_records become children.

2. **`serviceable_assets` (or `customer_assets`, or `install_base_assets`) — MISSING.**
   - FSM holds the "install base": customer-owned equipment being serviced — HVAC at customer sites, MRI machines, telecom CPE, fire systems.
   - SKILL.md rule: when a generic name (`assets`) plausibly belongs to multiple domains, scope-qualify at creation. Already done for `industrial_assets` (475, EAM) / `hardware_assets` (56, HAM) / `fixed_assets` (201, ERP-FIN). Customer-owned-and-serviced is a fifth scope.
   - **Action proposed**: create `serviceable_assets` (snake_case_plural). FSM masters it; EAM `industrial_assets` is referenced when a customer's own EAM exposes it.

3. **`facility_assets` — MAYBE NEEDED.**
   - REAL-EST currently has id 576 pointing at `configuration_items` (76, CMDB) — wrong; should be `industrial_assets` (475, EAM), per Section 3.
   - But the *strict* REAL-EST view (HVAC + lighting + plumbing + access systems inside a building) is arguably a slice of `industrial_assets` rather than a separate data_object. The Section-3 repoint resolves this without a new data_object. Flagging here so the reviewer can decide between "REAL-EST embedded_masters `industrial_assets`" (current proposal) vs "create a sibling `facility_assets` data_object". Recommend embedded_master path to keep the EAM-`industrial_assets` master strong.

4. **`visitors`, `visitor_appointments`, `host_notifications` — MISSING.**
   - VIS-MGMT (24) market masters these (Envoy, Sine, Proxyclick, Traction Guest).
   - Without them, VIS-MGMT cannot be Phase-1 loaded.
   - **Action proposed**: Phase-1 VIS-MGMT load creates them before this backfill row set lands.

5. **`facilities` and `space_allocations` — MISSING.**
   - The task brief mentions IWMS consuming `facilities` and `space_allocations`. Catalog has `real_estate_properties` (344) and `spaces` (347); these are likely the intended targets but named differently. Recommendation: do NOT create new `facilities`/`space_allocations` data_objects — use 344/347 in IWMS rows and document the alias in `data_object_aliases` if vendor terminology demands it.

6. **`financial_metrics` — MISSING.**
   - Used as a derived target for RE-INVEST in the task brief.
   - Probably belongs in EPM cluster, not field-facilities. Flagging for cross-cluster decision. RE-INVEST publishes `property_valuations` (369) which is the load-bearing valuation series; portfolio-level metrics could be expressed via existing `property_valuations` aggregation rather than a new data_object.

### 6b. Domains with zero `domain_data_objects` rows (need Phase-1 first)

| domain_id | code | name | blocker |
|---:|---|---|---|
| 23 | IWMS | Workplace and Space Management | No Phase-1 yet. Section 2 IWMS rows are staged but not loadable until IWMS is Phase-1'd. The IWMS market (Tririga, Archibus, Planon) is mostly *embedded_master* of REAL-EST/CAFM objects + a few unique masters (sustainability KPIs, lease-accounting calcs); arguably IWMS is a *suite* not a domain with unique masters. Open question. |
| 24 | VIS-MGMT | Visitor Management | No Phase-1 yet, AND its anchor data_objects (visitors, appointments) are missing. Two blockers stacked. |
| 142 | CAFM | Computer-Aided Facility Management | No Phase-1 yet. Same shape as IWMS (mostly embedded_master). |

### 6c. Boundary observations

1. **REAL-EST↔IWMS↔CAFM overlap.** All three claim some authority over `floor_plans`, `spaces`, `occupancy_records`. Current loaded state has REAL-EST as the canonical master (rows 570–572). IWMS and CAFM should be embedded_master, not co-master, because the catalog precedent for foundational physical-space concepts is "single canonical owner, point-solution embedded_masters." Confirm with reviewer.

2. **REAL-EST `leases` vs RE-CRE `commercial_leases` vs RE-PROP-MGMT `rental_leases`.** Three distinct lease data_objects already exist (345, 363, 362). The cluster is correctly using buyer-side-vs-seller-side modelling per SKILL.md anti-pattern guidance — `leases` (345) is the corporate-tenant-of-someone-else view, `commercial_leases` (363) is landlord-side commercial, `rental_leases` (362) is landlord-side residential. No consolidation proposed.

3. **`investment_properties` (366) vs `real_estate_properties` (344).** Same physical asset, two view-distinct data_objects. RE-INVEST↔REAL-EST is the rare case where the physical asset rightly appears twice (investor view vs corporate-tenant view). Already modelled correctly in existing rows. The Section-5 RE-INVEST→`real_estate_properties` derived row captures the cross-view publishing.

4. **FSM `customers` embedded_master vs RE-BROKERAGE `customers` embedded_master.** Both are local copies of CRM-mastered `customers` (id 97) but the slice each holds is structurally different: FSM holds service-contract customers (B2B service relationships), RE-BROKERAGE holds buyer/seller leads (B2C transactional). Notes should be slice-specific.

5. **TELEMATICS vs FLEET-MGMT vs FLEET-MAINT — three-way embedded_master pattern on `vehicles`.** After Section 3 changes, `vehicles` (370) has 1 canonical master (FLEET-MGMT) + 2 embedded_master (TELEMATICS, FLEET-MAINT). This is a textbook Signal-1b pattern — the three-way standalone-deployment friction is exactly what point-solution proliferation looks like in the fleet stack (Samsara + Fleetio + a homegrown vehicle DB).

6. **`drivers` (371) cluster-internal pattern.** Same shape as vehicles: FLEET-MGMT canonical, TELEMATICS embedded_master, FLEET-MAINT consumer (the shop doesn't standalone-master drivers).

7. **EAM↔FLEET-MGMT.** Trucks/buses in a transit operator's fleet could plausibly be modelled as `industrial_assets` (EAM) instead of `vehicles` (FLEET-MGMT). The catalog correctly keeps them separate (mobile-asset-maintenance is a distinct vendor market: Trapeze, AssetWorks vs Fleetio/Geotab). No change.

8. **FSM↔EAM at customer-asset boundary.** When customer-owned equipment is being serviced by an FSM provider, both FSM and the customer's EAM have authority claims. If `serviceable_assets` is created (Section 6a #2), FSM masters it; EAM `industrial_assets` is a consumer link from FSM. Without `serviceable_assets`, this boundary is unmodelled.

---

## 7. Open questions for human review

1. **Create `fsm_work_orders`?** Section 6a #1 — without it, FSM is missing its anchor master. Recommend yes, and rename existing `work_orders` (187) to `vms_work_orders` to remove the ambiguity (catalog precedent: id 349 was renamed `maintenance_work_orders` → `facility_work_orders` for the same reason).

2. **Create `serviceable_assets`?** Section 6a #2 — without it, FSM cannot model install-base. Recommend yes.

3. **REAL-EST id 576 re-pointing.** Section 3 — current row points at `configuration_items` (76); proposed re-point to `industrial_assets` (475). Confirm the original loader's intent before re-pointing vs creating a new row.

4. **Stage or skip IWMS / CAFM / VIS-MGMT embedded_master rows?** Section 2 lists them speculatively; recommend deferring loading until each domain runs Phase-1 cleanly. Question: is it worth Phase-1'ing IWMS and CAFM at all, or are they better modelled as suite-level *solutions* layered over REAL-EST domain (since most of their value is embedded_master of REAL-EST/CAFM objects + UI)?

5. **`financial_metrics` for RE-INVEST.** Section 5 — create new data_object vs use existing `property_valuations` aggregation? Cross-cluster decision involving EPM cluster owner.

6. **RE-BROKERAGE `contacts` / `leads` necessity flip.** Section 3 proposes `optional`. Confirm with the loader — were these added with the assumption that the brokerage *always* integrates to CRM (in which case `required`), or with the brokerage-market reality that many don't (in which case `optional`)?

7. **VIS-MGMT `employees` necessity.** Section 2 proposes `optional` per Phase-2 (d) trigger text. The trigger ("VIS-MGMT might or might not integrate with HCM (visitor-host lookup)") agrees, but in practice large-enterprise VIS-MGMT (Envoy at Fortune 500s) always integrates. Possible split: `embedded_master + required` for enterprise tier, `optional` for SMB — but the data model has only one row per domain↔data_object. Recommend `optional` and capture the enterprise-tier shape in `notes`.

8. **EAM Phase-B closure.** Existing rows 724/725/726 still have "trigger_events + handoffs deferred" in notes. Outside the scope of this backfill but flagging: until the deferral is resolved, EAM's Signal-2 footprint is artificially low.

---

## Summary counts

- **Existing rows audited:** 55 (rows 445, 446, 568–617, 724–726)
- **NEW `embedded_master` rows proposed:** 23 (FSM 2 of 4 immediately loadable + 2 blocked; RE-BROKERAGE 2; RE-PROP-MGMT 2; REAL-EST 1; EAM 1; IWMS 8 staged; CAFM 6 staged; VIS-MGMT 1 + 1 consumer)
- **NEW `consumer` rows proposed:** 10 immediately loadable + a couple flagged
- **NEW `contributor` rows proposed:** 2 (EAM→fixed_assets, FLEET-MGMT→fixed_assets, FSM→service_requests)
- **NEW `derived` rows proposed:** 1 (RE-INVEST→`real_estate_properties`) + 1 blocked (`financial_metrics`)
- **Role demotions (existing rows):** 4 (612, 613, 616 consumer→embedded_master; 577 consumer→embedded_master)
- **Re-pointings (existing rows):** 1 (576 from `configuration_items`→`industrial_assets`)
- **Necessity flips:** 2 (583, 584 required→optional)
- **Missing data_objects flagged:** 6 (`fsm_work_orders`, `serviceable_assets`, `visitors`, `visitor_appointments`, `host_notifications`, `financial_metrics`)
- **Domains needing Phase-1 first:** 3 (IWMS, CAFM, VIS-MGMT)
- **Open questions for review:** 8

**Do not load this draft.** Resolve the Section 7 questions, then load in waves: (a) immediate role/necessity changes + simple new rows, (b) after `fsm_work_orders` + `serviceable_assets` creation, (c) after IWMS/CAFM/VIS-MGMT Phase-1.
