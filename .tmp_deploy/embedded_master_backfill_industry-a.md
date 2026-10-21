# Embedded-master + necessity backfill — cluster `industry-a`

**Scope.** Industry-vertical cluster A — 9 domains:
BANK-OPS (43), INS-CLAIMS (44), HC-PATIENT (45), UTIL-OPS (49), TELCO-BSS (42),
MFG-OPS (47), RET-STORE (48), PS-LIC (46), CLIN-DEV (50).

**Module:** `domain_map` (id 1001, slug `domain_map`).

**Reading guide for the reviewer.** Industry-vertical domains have a different
embedded-master profile from horizontal SaaS: in a vertical-system-of-record
deployment the vertical *is* the canonical owner of vertical-native records
(`patients`, `claims`, `subscribers`, `meters`, `permits`, `production_orders`,
`till_sessions`, `clinical_devices`), so the `master`-vs-`embedded_master` split
mostly hangs on horizontal *foundation* records — employees (HCM), customers
(CRM/CDP), cost_centers (ERP-FIN), assets (EAM), products (PIM/B2C-COMM),
suppliers (SUP-LIFE), contracts (CLM), GL accounts / journal entries (ERP-FIN).

---

## Section 1 — Existing rows snapshot

`GET /domain_data_objects?domain_id=in.(42,43,44,45,46,47,48,49,50)` returns
**zero rows**. The entire industry-A cluster is unloaded in
`domain_data_objects`. There are therefore no role demotions or necessity flips
to negotiate — this cluster is a greenfield Phase-2 load.

Two-axis consequence: every row in Section 3 is a NEW insert; Section 4
(changes to existing rows) is intentionally empty.

---

## Section 2 — Canonical-anchor map (read first)

Master ownership claims on records this cluster embeds, copied from live state:

| data_object | id | canonical master(s) |
|---|---:|---|
| `employees` | 31 | HCM, PAYROLL, IGA, MDM |
| `customers` | 97 | CRM, CDP, CSM, SUB-MGMT, MDM |
| `cost_centers` | 196 | ERP-FIN |
| `suppliers` | 206 | SUP-LIFE, MDM |
| `products` | 384 | B2C-COMM (PIM-shape canonical) |
| `industrial_assets` | 475 | EAM |
| `hardware_assets` | 56 | HAM |
| `contracts` | 66 | CLM |
| `policies` | 285 | GRC (**compliance** policies — NOT insurance) |
| `fixed_assets` | 201 | ERP-FIN |
| `cash_transactions` | 200 | ERP-FIN |
| `card_transactions` | 213 | EXPENSE, SPEND-MGMT |
| `payment_transactions` | 387 | B2C-COMM |
| `inventory_locations` | 425 | OMS |
| `incidents` | 47 | ITSM (IT incidents — NOT insurance incidents) |
| `applications` | 4 | ATS (job applications — NOT gov-permit applications) |
| `assessments` | 10 | ATS (candidate assessments — NOT risk assessments) |
| `work_orders` | 187 | VMS (vendor work orders) |
| `eam_work_orders` | 476 | (EAM cluster — likely EAM-mastered) |
| `general_ledger_accounts` | 195 | (ERP-FIN cluster) |

This map is what every `embedded_master` row's `notes` column has to reference
in the demotion phrase ("X local-masters Y when no Z is deployed; reads from Z
when present").

---

## Section 3 — NEW rows to add (reasoning per row)

Format: `domain → data_object_id [role/necessity]  notes-summary`.
Every row carries `notes` text suitable for direct insertion (kept short here;
deployer should copy verbatim into the row).

### 3.1 BANK-OPS (43) — Banking Operations

Canonical claim per task brief: `accounts`, `transactions`, `customers`
(banking-customer shape). All three are **missing as named data_objects** —
no `accounts` (banking deposit/loan accounts), no canonical `transactions`
(only finance `cash_transactions` exists, which is GL-shape), and `customers`
exists but is CRM/CDP-shape — see Section 6 alias note.

What we CAN model from existing catalog rows:

- **43 → 97 (customers) [embedded_master / required]** —
  Banking customers (account holders) are a vertical-specific shape (KYC,
  beneficial-ownership, regulatory-PII slice) but in a holistic enterprise
  deployment with a corporate-banking CRM the relationship slice is shared.
  Notes: "BANK-OPS local-masters banking customers (KYC, beneficial owner,
  account-relationship slice) when no enterprise CRM/MDM is deployed; reads
  customer master from CRM/CDP/MDM when present. Industry alias 'Account
  Holder' — see Section 6."
- **43 → 31 (employees) [embedded_master / required]** —
  Branch staff, tellers, relationship managers. Required because workflows
  attribute every transaction to an operator. Notes: "BANK-OPS local-masters
  bank operators (teller, RM, branch ops) when no HCM is deployed; reads from
  HCM when present."
- **43 → 196 (cost_centers) [embedded_master / optional]** —
  Many core-banking deployments allocate revenue and operating expense per
  branch/cost-center, but the link to ERP-FIN cost_centers is convenience.
  Notes: "BANK-OPS local-masters branch cost-centers only when no ERP-FIN is
  integrated; many deployments skip."
- **43 → 285 (policies) [consumer / optional]** —
  Reads GRC compliance policies (AML, sanctions screening). Optional because
  many banks run AML rules outside GRC. Notes: "Consumes GRC compliance
  policies for AML/KYC enforcement when GRC is integrated; standalone
  deployments embed rules directly in core banking."
- **43 → 66 (contracts) [consumer / optional]** —
  Account-opening agreements, loan contracts. Many cores store these locally;
  reads CLM when present. Notes: "Consumes CLM-mastered customer agreements
  when CLM is integrated; standalone deployments store account agreements in
  the core."

Missing rows (cannot insert without new data_objects — see Section 6):
- BANK-OPS → `bank_accounts` / `deposit_accounts` / `loan_accounts` [master / required]
- BANK-OPS → `bank_transactions` (debit/credit ledger entries on accounts) [master / required]
- BANK-OPS → `loan_applications`, `credit_decisions`, `kyc_profiles`,
  `aml_cases`, `fraud_cases`, `disputes` [master / required]

### 3.2 INS-CLAIMS (44) — Insurance Claims Management

Canonical claim: `claims`, `policies` (insurance), `policyholders`. **All
three are missing as named data_objects** — `policies` (id 285) collides
semantically with GRC compliance policies, not insurance policies.

Rows we can author from existing catalog:

- **44 → 31 (employees) [embedded_master / required]** —
  Claims adjusters, examiners, SIU investigators. Notes: "INS-CLAIMS
  local-masters claims-handler employees (adjuster, examiner, SIU investigator
  slice) when no HCM is deployed; reads from HCM when present."
- **44 → 97 (customers) [embedded_master / required]** —
  Policyholders + claimants. The CRM `customers` slice maps to policyholder
  identity but the policy-specific coverages, risk attributes, and claim
  history are vertical-mastered. Notes: "INS-CLAIMS local-masters
  policyholders (insurance identity, coverage history slice) when no
  enterprise CRM is deployed; reads CRM/CDP for policyholder relationship
  data when present. Industry alias 'Policyholder' — see Section 6."
- **44 → 206 (suppliers) [embedded_master / optional]** —
  Repair shops, medical providers, salvage yards (claims supply chain).
  Required for property/auto carriers, absent for many specialty lines.
  Notes: "INS-CLAIMS local-masters claim-vendor network (body shops, medical
  providers, salvage) when no SUP-LIFE is deployed; reads from SUP-LIFE when
  present."
- **44 → 196 (cost_centers) [embedded_master / optional]** —
  Loss-reserve allocation per LOB / region. Notes: "Local-masters
  claims-allocation cost-centers only when no ERP-FIN integration; many
  deployments skip in favor of bordereau roll-up."
- **44 → 66 (contracts) [consumer / optional]** —
  Reinsurance treaties, vendor SLAs. Notes: "Consumes CLM-mastered
  reinsurance / vendor contracts when CLM is integrated."
- **44 → 285 (policies) [consumer / optional]** —
  GRC compliance policies (privacy, fraud, conduct). NOT insurance policies.
  Notes: "Consumes GRC compliance policies (privacy, anti-fraud, conduct)
  when GRC is integrated. Distinct from insurance policies, which INS-CLAIMS
  itself canonical-masters under a different data_object (see Section 6)."

Missing rows (await Section-6 data_objects):
- INS-CLAIMS → `insurance_policies` / `policy_coverages` [master / required]
- INS-CLAIMS → `claims` [master / required]
- INS-CLAIMS → `claim_payments`, `subrogation_cases`, `siu_cases`,
  `loss_reserves`, `policyholders` (if kept distinct from customers — see
  Section 6) [master / required]

### 3.3 HC-PATIENT (45) — Healthcare Patient Operations

Canonical claim: `patients`, `encounters`, `care_plans`. SKILL.md
canonical-examples document is explicit: the Patient↔Customer alias pattern
lives in `data_object_aliases`, NOT as a separate data_object. We therefore
treat `patients` as **the customer-shape with industry semantics** and model
HC-PATIENT against `customers` (97) with an alias flag in Section 6.

- **45 → 97 (customers) [embedded_master / required]** —
  Patients-as-customers (identity, demographics, encounter relationship).
  Notes: "HC-PATIENT local-masters the patient slice of the customer record
  (MRN, demographics, encounter linkage) when no enterprise CRM/MDM is
  deployed; in integrated stacks reads identity from MDM/CRM and writes
  patient-clinical-attributes through the canonical record. Industry alias
  'Patient' — see Section 6 (alias-vs-separate-data_object pattern)."
- **45 → 31 (employees) [embedded_master / required]** —
  Clinicians, nurses, support staff. Notes: "HC-PATIENT local-masters
  clinician employees (provider credentials, license, role-on-encounter
  slice) when no HCM is deployed; reads from HCM when present. Credentialing
  slice is often itself owned by a credentialing subsystem in large
  health-systems."
- **45 → 475 (industrial_assets) [embedded_master / optional]** —
  Bedside equipment, infusion pumps, imaging devices when EAM is the system
  of record. Tension: most health-systems treat clinical devices as a
  *distinct* vertical record (see CLIN-DEV below), so this row is optional
  in HC-PATIENT itself. Notes: "Local-masters in-encounter device usage
  references only when no EAM/CLIN-DEV is deployed. In integrated stacks the
  device authority is CLIN-DEV (or EAM); HC-PATIENT references via
  encounter."
- **45 → 196 (cost_centers) [embedded_master / optional]** —
  Department/service-line cost allocation. Notes: "Local-masters
  service-line cost-centers only when no ERP-FIN is integrated."
- **45 → 285 (policies) [consumer / required]** —
  HIPAA / consent / clinical protocol policies. Required (every workflow
  enforces them). Notes: "Consumes GRC-mastered privacy & clinical-conduct
  policies; required in every realistic deployment."
- **45 → 66 (contracts) [consumer / optional]** —
  Payer contracts, vendor-clinical agreements. Notes: "Consumes CLM-mastered
  payer & vendor contracts when CLM is integrated."

Missing rows:
- HC-PATIENT → `encounters` [master / required]
- HC-PATIENT → `care_plans` [master / required]
- HC-PATIENT → `medication_orders`, `lab_results`, `imaging_studies`,
  `appointments`, `clinical_observations`, `referrals` *(referrals(6) exists
  but ATS-shaped, see Section 6)*, `prescriptions`, `allergies`, `diagnoses`
  [master / required]
- (No separate `patients` data_object per SKILL.md canonical guidance;
  modelled as alias on `customers`.)

### 3.4 UTIL-OPS (49) — Utilities Operations

Canonical claim: `service_accounts`, `meters`, `outages`. **All three are
missing.** UTIL-OPS holistically defers to CRM for the corporate-customer
identity slice and to EAM for grid-asset records.

- **49 → 97 (customers) [embedded_master / required]** —
  Utility customers (residential + commercial service-account holders).
  Notes: "UTIL-OPS local-masters utility customers (service-account, premise,
  meter-assignment slice) when no enterprise CRM is deployed; reads CRM/CDP
  for relationship/marketing slice when integrated. Industry alias 'Service
  Account / Premise' — see Section 6."
- **49 → 475 (industrial_assets) [embedded_master / required]** —
  Grid assets (transformers, substations, feeders, poles) when no EAM. Most
  utilities co-deploy EAM and a vertical OMS/ADMS; the industrial_asset rows
  are EAM-canonical, UTIL-OPS embeds local refs to drive outage/work-order
  geography. Notes: "UTIL-OPS local-masters grid-asset references (feeder,
  substation, transformer location) when no EAM is deployed; reads from EAM
  when present. UTIL-OPS canonical-masters meter and outage records
  separately (see missing-rows)."
- **49 → 31 (employees) [embedded_master / required]** —
  Field crews, dispatchers, control-room operators. Notes: "Local-masters
  field-crew employees (dispatch eligibility, certification slice) when no
  HCM is deployed; reads from HCM when present."
- **49 → 206 (suppliers) [embedded_master / optional]** —
  Contractor crews, materials suppliers. Notes: "Local-masters contractor
  suppliers only when no SUP-LIFE is integrated; many integrated stacks read
  from SUP-LIFE."
- **49 → 196 (cost_centers) [embedded_master / optional]** —
  Capital vs O&M cost categorization. Notes: "Local-masters O&M / capital
  cost-centers only when no ERP-FIN integration."
- **49 → 66 (contracts) [consumer / optional]** —
  PPAs, ISO/RTO interconnect agreements, wholesale supply. Notes:
  "Consumes CLM-mastered wholesale & interconnect contracts when CLM is
  integrated."
- **49 → 285 (policies) [consumer / optional]** —
  Regulatory tariffs, reliability standards (NERC CIP, etc.). Notes:
  "Consumes GRC-mastered regulatory & reliability policies when GRC is
  integrated."

Missing rows:
- UTIL-OPS → `service_accounts` (utility service-account / premise) [master / required]
- UTIL-OPS → `meters`, `meter_readings` *(utility_meter_readings (350)
  exists — see Section 6)*, `outages` / `outage_events`, `grid_assets` (if
  kept distinct from `industrial_assets`), `field_dispatches` /
  `field_work_orders`, `billing_accounts`, `consumption_records`
  [master / required]

### 3.5 TELCO-BSS (42) — Telecommunications OSS/BSS

Canonical claim: `subscribers`, `services`, `tariffs`. **All three missing.**
Subscriber-as-customer is the BSS-shape of `customers` (97).

- **42 → 97 (customers) [embedded_master / required]** —
  Subscribers (mobile/broadband account holders). Notes: "TELCO-BSS
  local-masters subscriber identity (MSISDN, line-account, plan-eligibility
  slice) when no enterprise CRM is deployed; reads CRM/CDP for relationship
  slice when integrated. Industry alias 'Subscriber' — see Section 6."
- **42 → 31 (employees) [embedded_master / required]** —
  Field techs, NOC operators, retail agents. Notes: "Local-masters telco
  field-workforce employees when no HCM is deployed; reads from HCM when
  present."
- **42 → 475 (industrial_assets) [embedded_master / optional]** —
  Network elements (cell sites, BTS, MSC, MUX). Many telcos run an
  EAM-distinct inventory system (TIBCO/Granite/CSG); the
  network-asset slice is BSS-mastered, not EAM-mastered. Notes:
  "Local-masters network-element references only when no separate inventory
  system is deployed; most telcos run dedicated network-inventory that
  becomes the master for service-impacted infrastructure."
- **42 → 196 (cost_centers) [embedded_master / optional]** —
  Notes: "Local-masters BSS cost-allocation cost-centers only when no
  ERP-FIN integration."
- **42 → 206 (suppliers) [embedded_master / optional]** —
  Roaming partners, MVNO hosts, interconnect carriers. Notes:
  "Local-masters wholesale/roaming partners only when no SUP-LIFE is
  integrated."
- **42 → 66 (contracts) [consumer / optional]** —
  Customer contracts, interconnect agreements. Notes: "Consumes CLM-mastered
  customer/interconnect contracts when integrated."
- **42 → 285 (policies) [consumer / optional]** —
  Regulatory (number-portability, MNP, lawful intercept). Notes:
  "Consumes GRC-mastered regulatory policies when integrated."
- **42 → 387 (payment_transactions) [consumer / optional]** —
  Postpaid bill payment. Notes: "Consumes B2C-COMM-mastered payment
  transactions for postpaid billing when an enterprise commerce platform is
  integrated; many BSS deployments handle payment ingestion natively."

Missing rows:
- TELCO-BSS → `subscribers` *(if kept distinct from customers — see Section 6)*
- TELCO-BSS → `services` / `subscriber_services` [master / required]
- TELCO-BSS → `tariffs` / `service_plans` [master / required]
- TELCO-BSS → `charging_records` / `call_detail_records`, `bills`,
  `activations`, `porting_requests`, `sim_cards`, `number_inventory`,
  `network_elements` (if kept distinct from industrial_assets)
  [master / required]

### 3.6 MFG-OPS (47) — Manufacturing Connected Operations

Canonical claim: `production_orders`, `bills_of_materials`,
`production_runs`. **All three missing.** MFG-OPS embedded-masters `products`
(PIM/B2C-COMM-canonical) and `industrial_assets` (EAM-canonical).

- **47 → 384 (products) [embedded_master / required]** —
  Manufactured-good catalog, BoM material identifiers. Notes: "MFG-OPS
  local-masters product/material references (manufactured SKU, raw-material
  identifier, sub-assembly) when no enterprise PIM/B2C-COMM is deployed;
  reads from PIM when integrated, but the BoM-binding slice is
  MFG-OPS-mastered regardless."
- **47 → 475 (industrial_assets) [embedded_master / required]** —
  Plant equipment, lines, cells. Notes: "MFG-OPS local-masters production
  equipment references (line, cell, station) when no EAM is deployed; reads
  from EAM when integrated. EAM keeps maintenance-master slice; MFG-OPS
  keeps run-state / OEE slice — multi-master split."
- **47 → 31 (employees) [embedded_master / required]** —
  Plant-floor operators, shift supervisors, quality techs. Notes:
  "Local-masters plant-floor workforce (operator, supervisor, QC tech slice)
  when no HCM is deployed; reads from HCM when present."
- **47 → 206 (suppliers) [embedded_master / required]** —
  Raw-material suppliers (production needs them addressable). Notes:
  "Local-masters production suppliers (raw material, sub-assembly vendor)
  when no SUP-LIFE is deployed; reads from SUP-LIFE when integrated.
  Required because production_orders bind to supplier-of-record at consumption."
- **47 → 196 (cost_centers) [embedded_master / optional]** —
  Plant / line cost-center allocation. Notes: "Local-masters plant /
  line cost-centers only when no ERP-FIN integration."
- **47 → 66 (contracts) [consumer / optional]** —
  Supply contracts, customer manufacturing contracts. Notes: "Consumes
  CLM-mastered supply/customer contracts when CLM is integrated."
- **47 → 285 (policies) [consumer / optional]** —
  Quality / safety / regulatory policies. Notes: "Consumes GRC-mastered
  quality/EHS policies when GRC is integrated."

Missing rows:
- MFG-OPS → `production_orders` / `manufacturing_orders` [master / required]
- MFG-OPS → `bills_of_materials` [master / required]
- MFG-OPS → `production_runs`, `routings`, `recipes`, `batches` / `lots`,
  `quality_inspections`, `downtime_events`, `sensor_readings`,
  `work_in_progress` [master / required]

### 3.7 RET-STORE (48) — Retail Store Operations

Canonical claim: `transactions` (POS), `store_inventory`, `till_sessions`.
**All three missing.**

- **48 → 384 (products) [embedded_master / required]** —
  Store-level SKU catalog. Notes: "RET-STORE local-masters store-catalog
  product references (SKU, store-specific assortment slice) when no
  enterprise PIM/B2C-COMM is deployed; reads from PIM when integrated."
- **48 → 97 (customers) [embedded_master / required]** —
  Walk-in / loyalty-tied customer identity at the store level. Notes:
  "Local-masters store-customer references (loyalty-card-at-till, walk-in
  identity slice) when no enterprise CRM/CDP is deployed; reads from CRM/CDP
  when integrated."
- **48 → 31 (employees) [embedded_master / required]** —
  Store associates, cashiers, managers. Notes: "Local-masters store-associate
  employees (till-eligibility, shift-eligibility slice) when no HCM is
  deployed; reads from HCM when present."
- **48 → 263 (loyalty_members) [consumer / optional]** —
  Loyalty-points lookup at till. Notes: "Consumes LOYALTY-mastered loyalty
  members for till-level point lookup when LOYALTY is integrated."
- **48 → 264 (loyalty_transactions) [contributor / optional]** —
  Till writes accrual records back to loyalty. Notes: "Contributes loyalty
  earn/redeem transactions back to LOYALTY when integrated; standalone POS
  deployments handle loyalty internally."
- **48 → 387 (payment_transactions) [embedded_master / required]** —
  Card/cash/digital payments at till. Notes: "RET-STORE local-masters
  in-store payment transactions (till-payment slice) when no enterprise
  commerce platform is deployed; reads/writes B2C-COMM payment transactions
  when an enterprise OMS/commerce stack is integrated. Multi-master split:
  B2C-COMM keeps web-payment slice; RET-STORE keeps in-store-payment slice
  in non-unified stacks."
- **48 → 425 (inventory_locations) [embedded_master / required]** —
  Store-level stock locations / back-of-house bins. Notes: "Local-masters
  store-level inventory locations (back-of-house bin, end-cap, planogram
  slot) when no enterprise OMS is deployed; reads from OMS when integrated.
  Multi-master with OMS in unified commerce stacks (RET-STORE owns the
  store-floor slice, OMS owns DC/warehouse slice)."
- **48 → 196 (cost_centers) [embedded_master / optional]** —
  Store / region cost-center allocation. Notes: "Local-masters store cost
  centers only when no ERP-FIN integration."
- **48 → 66 (contracts) [consumer / optional]** —
  Lease, service-vendor contracts. Notes: "Consumes CLM-mastered lease /
  vendor contracts when CLM is integrated."
- **48 → 285 (policies) [consumer / optional]** —
  Loss-prevention, return, age-verification policies. Notes: "Consumes
  GRC-mastered retail compliance policies when GRC is integrated."

Missing rows:
- RET-STORE → `pos_transactions` / `store_sales_transactions` [master / required]
- RET-STORE → `till_sessions`, `store_inventory_counts`, `cycle_counts`,
  `returns`, `refunds`, `store_locations`, `promotions_at_store`,
  `markdowns`, `assortment_plans` [master / required]

### 3.8 PS-LIC (46) — Public-Sector Licensing and Permitting

Canonical claim: `permits`, `licenses`, `applications` (gov-license shape —
NOT ATS shape; the existing `applications` data_object (4) is ATS-job).
**All three missing in the correct vertical sense.**

- **46 → 97 (customers) [embedded_master / required]** —
  Applicants and licensees (citizens + businesses). Distinct enough from
  CRM customers to keep separate via alias-or-vertical-row tension flagged
  in Section 6 — but in the embedded-master model PS-LIC defers to a
  citizen-identity master when one exists (rare today; most jurisdictions
  run PS-LIC standalone). Notes: "PS-LIC local-masters applicant/licensee
  identity (citizen ID, business registration, licensing-history slice)
  when no enterprise CRM / citizen-identity-master is deployed; reads from
  it when integrated. Industry alias 'Applicant / Licensee / Citizen' — see
  Section 6."
- **46 → 31 (employees) [embedded_master / required]** —
  Reviewers, inspectors, enforcement staff. Notes: "Local-masters
  reviewer/inspector employees when no HCM is deployed; reads from HCM
  when present."
- **46 → 196 (cost_centers) [embedded_master / optional]** —
  Fee-revenue allocation per agency / fund. Notes: "Local-masters
  agency/fund cost-centers only when no ERP-FIN integration."
- **46 → 387 (payment_transactions) [consumer / required]** —
  Licensing fee payments. Required (every license issuance involves payment
  reconciliation). Notes: "Consumes payment transactions for fee collection;
  required in every realistic deployment, whether sourced from an enterprise
  commerce platform or a payment-gateway-direct."
- **46 → 66 (contracts) [consumer / optional]** —
  Inter-agency MoUs, vendor contracts. Notes: "Consumes CLM-mastered
  inter-agency / vendor contracts when CLM is integrated."
- **46 → 285 (policies) [consumer / required]** —
  Licensing statutes, enforcement policy, public-records policy. Notes:
  "Consumes GRC-mastered regulatory policies; required in every realistic
  deployment."

Missing rows:
- PS-LIC → `permits` [master / required]
- PS-LIC → `licenses` [master / required]
- PS-LIC → `license_applications` (NOT to collide with ATS `applications`)
  [master / required]
- PS-LIC → `inspections`, `renewals`, `enforcement_cases`, `public_records`,
  `citations`, `fee_schedules` [master / required]

### 3.9 CLIN-DEV (50) — Clinical Device Management

Canonical claim: `clinical_devices`, `maintenance_logs`. **Both missing.**
CLIN-DEV embedded-masters `industrial_assets` (EAM-canonical) and `employees`
(HCM-canonical, clinician slice).

- **50 → 475 (industrial_assets) [embedded_master / required]** —
  Bedside equipment, imaging, lab analyzers, infusion pumps. Notes:
  "CLIN-DEV local-masters clinical-device asset references (model, serial,
  location, hospital-fixed-asset slice) when no enterprise EAM is deployed;
  reads from EAM when integrated. CLIN-DEV canonical-masters
  maintenance/calibration/recall slice (see missing-rows) even when EAM is
  present — EAM keeps the asset-of-record; CLIN-DEV keeps the
  clinical-state slice."
- **50 → 31 (employees) [embedded_master / required]** —
  Biomeds, clinical engineers, device-using clinicians. Notes: "Local-masters
  biomed/clinical-engineer employees when no HCM is deployed; reads from
  HCM when present."
- **50 → 196 (cost_centers) [embedded_master / optional]** —
  Capital-equipment cost allocation per department. Notes: "Local-masters
  device cost-centers only when no ERP-FIN integration."
- **50 → 56 (hardware_assets) [embedded_master / optional]** —
  Many clinical-device platforms also bundle the embedded
  IT-hardware-asset slice (the monitor PC attached to the device, etc.).
  Optional because in mature stacks HAM owns it. Notes: "Local-masters the
  IT-hardware slice attached to a clinical device (workstation, embedded PC)
  only when no HAM is deployed; reads from HAM when integrated."
- **50 → 66 (contracts) [consumer / required]** —
  Device-vendor service contracts, third-party maintenance agreements.
  Required (every device has at least an OEM contract). Notes: "Consumes
  CLM-mastered device service contracts when CLM is integrated; required in
  every realistic deployment whether canonical-CLM-sourced or stored locally."
- **50 → 285 (policies) [consumer / required]** —
  FDA UDI, recall policy, biomed-compliance protocols. Required. Notes:
  "Consumes GRC-mastered device-compliance policies; required in every
  realistic deployment."
- **50 → 206 (suppliers) [embedded_master / required]** —
  Device OEMs and third-party-maintenance vendors. Notes: "Local-masters
  device-vendor / TPM-vendor suppliers when no SUP-LIFE is deployed; reads
  from SUP-LIFE when integrated."

Missing rows:
- CLIN-DEV → `clinical_devices` (if kept distinct from industrial_assets —
  see Section 6) [master / required]
- CLIN-DEV → `maintenance_logs`, `calibration_records`, `recall_notices`,
  `sterilization_cycles`, `device_assignments`, `incident_reports` (device
  AE — NOT IT incidents) [master / required]

---

## Section 4 — CHANGES to existing rows

Empty. No existing `domain_data_objects` rows for cluster industry-A (verified
via live GET query in Section 1).

---

## Section 5 — Boundary observations (cross-cluster authority sharing)

Each vertical embeds *the same* horizontal foundation records, but the
intra-vertical authority splits are themselves interesting Phase-4 signals:

1. **`industrial_assets` (EAM) is the single most-embedded record in this
   cluster** — UTIL-OPS, TELCO-BSS, MFG-OPS, CLIN-DEV, and HC-PATIENT
   (5 of 9 domains) all embed it. UTIL-OPS/MFG-OPS/CLIN-DEV explicitly claim
   a *vertical-canonical slice* even when EAM is present (grid-state,
   run-state, clinical-state respectively) — these are textbook multi-master
   splits to record on the EAM-canonical row in EAM-cluster's existing
   `industrial_assets` entry.

2. **`customers` becomes a 5-vertical embedded-master flagship** —
   BANK-OPS (account holders), INS-CLAIMS (policyholders), HC-PATIENT
   (patients), UTIL-OPS (service-account holders), TELCO-BSS (subscribers),
   RET-STORE (walk-in/loyalty), PS-LIC (applicants), plus the seven
   horizontal masters already loaded. After this backfill, Signal 1 on
   `customers` will sit at ~12 (`master`+`embedded_master`+`required`)
   — making `customers` arguably the strongest integration-burden flagship
   in the catalog after `employees`.

3. **HC-PATIENT vs CLIN-DEV vs EAM authority on clinical devices** — three
   plausible masters with genuinely different slices:
   - EAM = enterprise-asset slice (fixed-asset-of-record, depreciation)
   - CLIN-DEV = clinical-state slice (calibration, recall, biomed lifecycle)
   - HC-PATIENT = encounter-usage slice (which device touched which patient)
   This is a candidate multi-master row on a *vertical* data_object
   (`clinical_devices`) plus a boundary observation on `industrial_assets`.

4. **RET-STORE vs OMS vs B2C-COMM on `payment_transactions` and
   `inventory_locations`** — RET-STORE's till_payments and store_inventory
   slices co-master alongside B2C-COMM/OMS in unified commerce stacks. This
   is a clean canonical multi-master pattern, not embedded-master, in any
   true unified-commerce reference deployment — but most retailers run
   non-unified stacks, so embedded_master + required is the right shape
   today. Watch this evolve.

5. **BANK-OPS vs ERP-FIN on `cash_transactions`** — banking transactions and
   GL cash transactions are NOT the same record. `cash_transactions` (200)
   is GL-shape. BANK-OPS bank-account transactions need a distinct
   data_object (`bank_transactions` or `account_transactions`) — see
   Section 6.

6. **PS-LIC vs CRM on citizen identity** — every jurisdiction's
   citizen-identity master is *outside* the SaaS catalog (federated state
   IAM, civil registration). Modelling PS-LIC as embedded_master on
   `customers` is the closest available stand-in; the alias call-out in
   Section 6 needs to make the demotion path clear.

7. **All seven verticals embed `employees`** — adds seven embedded-master
   rows to the `employees` flagship, pushing Signal 1 on `employees` from
   the current 4 canonical masters + ATS/Sales-Eng/ITSM/etc. embedded
   masters past 20 once this cluster + cluster-b industry verticals load.
   Confirms the original 2026-05-22 hypothesis that adding the
   embedded_master role makes Signal 1 the dominant flagship signal.

---

## Section 6 — Open questions / missing data_objects (for human review)

### 6.1 Naming collisions — must resolve before load

The catalog has pre-loaded horizontal data_objects whose names overlap with
vertical-canonical semantics. Each needs a decision:

| existing | shape today | vertical that needs the name | suggested resolution |
|---|---|---|---|
| `policies` (285) | GRC compliance policies | INS-CLAIMS insurance policies | **New data_object** `insurance_policies` (INS-CLAIMS-mastered). Keep `policies` for GRC. |
| `applications` (4) | ATS job applications | PS-LIC license applications | **New data_object** `license_applications` (PS-LIC-mastered). Keep `applications` for ATS. |
| `assessments` (10) | ATS candidate assessments | BANK-OPS/INS-CLAIMS risk assessments | **New data_object** `risk_assessments` (291) **already exists** — use it for verticals; flag no overlap. |
| `incidents` (47) | ITSM IT incidents | INS-CLAIMS loss incidents, CLIN-DEV device AEs | **New data_objects** `loss_incidents` (INS-CLAIMS), `device_adverse_events` (CLIN-DEV). |
| `work_orders` (187) | VMS vendor work orders | UTIL-OPS field work orders, MFG-OPS prod work orders | **New data_objects** `field_dispatches` (UTIL-OPS), `production_orders` (MFG-OPS). `eam_work_orders` (476) already separates the EAM slice. |
| `cash_transactions` (200) | ERP-FIN GL cash | BANK-OPS bank-account transactions | **New data_object** `bank_transactions` (BANK-OPS-mastered). |
| `card_transactions` (213) | EXPENSE/SPEND-MGMT corporate-card | RET-STORE customer-card till transactions | **New data_object** `pos_transactions` (RET-STORE-mastered), distinct from corporate-card. |
| `referrals` (6) | (ATS-shape per Section 2) | HC-PATIENT clinical referrals | **New data_object** `clinical_referrals` (HC-PATIENT-mastered). |

### 6.2 Vertical-alias-vs-separate-data_object tension

SKILL.md canonical-examples document is explicit that *industry-specific
terminology like Patient / Policyholder / Subscriber belongs in
`data_object_aliases`, NOT as new data_objects*. This rule cleanly handles
the customer-shape verticals — `customers` (97) with aliases:

| alias | domain | data_object_id |
|---|---|---:|
| Patient | HC-PATIENT (45) | 97 |
| Policyholder | INS-CLAIMS (44) | 97 |
| Account Holder | BANK-OPS (43) | 97 |
| Service Account / Premise | UTIL-OPS (49) | 97 |
| Subscriber | TELCO-BSS (42) | 97 |
| Applicant / Licensee | PS-LIC (46) | 97 |
| Loyalty Member at Till | RET-STORE (48) | 97 |

These should be added to `data_object_aliases` as part of this load.

**Open question:** the alias rule conflicts with the practical observation
that *the slice* a vertical owns of "customers" (KYC for BANK-OPS, coverage
history for INS-CLAIMS, MRN for HC-PATIENT) is data of substantially
different shape and lifecycle from CRM-customer relationship data. If
`data_object_aliases` only carries the *label* and not extra fields, the
extra fields have to live somewhere — either on the canonical `customers`
data_object (bloated) or on vertical-specific *child* data_objects (e.g.
`patient_demographics` parented to `customers`). **Recommend** the latter
shape: alias on `customers`, plus vertical-specific child data_objects for
the vertical-only attributes. Flag for reviewer.

**Open question 2:** PS-LIC `applicants` distinction. The brief says
"applicants (≈ citizens, distinct enough to keep separate)." If we follow
the strict alias rule, PS-LIC applicants are an alias on `customers`. If we
treat citizen-identity as fundamentally different (federated state IAM,
public-record obligations), `applicants` becomes its own data_object.
**Recommend** alias for now, with a follow-up note that promotes to a
separate data_object if a citizen-identity master ever appears in the
catalog.

### 6.3 Vertical-canonical missing data_objects — to be created

Bulk list (subset of what each section flagged in "Missing rows"):

**Banking (BANK-OPS):**
`bank_accounts` *(exists at id 199 — verify it covers banking-deposit/loan shape, not just ERP corporate bank accounts)*, `bank_transactions`, `loans`, `loan_applications`, `credit_decisions`, `kyc_profiles`, `aml_cases`, `fraud_cases`, `disputes`, `deposits`.

**Insurance (INS-CLAIMS):**
`insurance_policies`, `policy_coverages`, `claims`, `claim_payments`, `loss_incidents`, `subrogation_cases`, `siu_cases`, `loss_reserves`.

**Healthcare (HC-PATIENT):**
`encounters`, `care_plans`, `medication_orders`, `lab_results`, `imaging_studies`, `appointments`, `clinical_observations`, `clinical_referrals`, `prescriptions`, `allergies`, `diagnoses`, `consents`.

**Utilities (UTIL-OPS):**
`service_accounts`, `meters` *(`utility_meter_readings` (350) exists — confirm it's UTIL-OPS-mastered and add a meter-master parent)*, `outages` / `outage_events`, `grid_assets` (or model as `industrial_assets` alias — recommend separate child), `field_dispatches`, `billing_accounts`, `consumption_records`.

**Telco (TELCO-BSS):**
`services`, `tariffs`, `charging_records`, `call_detail_records`, `bills`, `activations`, `porting_requests`, `sim_cards`, `number_inventory`, `network_elements`.

**Manufacturing (MFG-OPS):**
`production_orders`, `bills_of_materials`, `production_runs`, `routings`, `recipes`, `batches`, `lots`, `quality_inspections`, `downtime_events`, `sensor_readings`, `work_in_progress`.

**Retail (RET-STORE):**
`pos_transactions`, `till_sessions`, `store_inventory_counts`, `cycle_counts`, `returns`, `refunds`, `store_locations`, `markdowns`, `assortment_plans`.

**Public Sector (PS-LIC):**
`permits`, `licenses`, `license_applications`, `inspections`, `renewals`, `enforcement_cases`, `public_records`, `citations`, `fee_schedules`.

**Clinical Devices (CLIN-DEV):**
`clinical_devices`, `maintenance_logs`, `calibration_records`, `recall_notices`, `sterilization_cycles`, `device_assignments`, `device_adverse_events`.

### 6.4 `bank_accounts` (199) — semantic audit needed

`bank_accounts` exists at id 199 but is in the ERP-FIN cluster (corporate
treasury accounts). Decide whether BANK-OPS depositor / loan accounts:
(a) share that data_object (probably wrong — corporate-treasury vs
retail-banking are different shapes),
(b) get a new data_object `customer_accounts` or `deposit_accounts`,
(c) live under a banking-specific master entity hierarchy.

**Recommend** (b) — distinct data_object — and rename (199) to
`corporate_bank_accounts` for clarity if no production constraints block it.

### 6.5 `policies` collision for INS-CLAIMS is severe

`policies` (285) is the worst collision in the cluster because the
insurance industry calls its primary contractual artefact "the policy" — a
casual reader will conflate INS-CLAIMS `policies` with the GRC row and
misread the integration model. **Strongly recommend** the new data_object
be named `insurance_policies` (NOT `policies_insurance` or
`policy_contracts`) and the GRC row stay as `policies` since "compliance
policy" is the broadly-understood meaning.

---

## Section 7 — Summary counts

**Cluster:** industry-a (9 domains, ids 42–50, codes BANK-OPS, INS-CLAIMS,
HC-PATIENT, UTIL-OPS, TELCO-BSS, MFG-OPS, RET-STORE, PS-LIC, CLIN-DEV).

| metric | count |
|---|---:|
| existing `domain_data_objects` rows in cluster | 0 |
| NEW rows to add (Section 3) | 60 |
| CHANGES to existing rows (Section 4) | 0 |
| NEW rows by role: `embedded_master` | 42 |
| NEW rows by role: `consumer` | 18 |
| NEW rows by role: `master` / `contributor` / `derived` | 0 (all canonical-master rows are blocked on missing vertical data_objects — Section 6) |
| NEW rows by necessity: `required` | 30 |
| NEW rows by necessity: `optional` | 30 |
| naming-collision resolutions required | 8 |
| new vertical data_objects to create (Section 6.3) | ~70 |
| new aliases to register (Section 6.2) | 7 |
| boundary observations (Section 5) | 7 |

**Per-domain row counts:**

| domain | NEW rows |
|---|---:|
| BANK-OPS (43) | 5 |
| INS-CLAIMS (44) | 6 |
| HC-PATIENT (45) | 6 |
| UTIL-OPS (49) | 7 |
| TELCO-BSS (42) | 8 |
| MFG-OPS (47) | 7 |
| RET-STORE (48) | 10 |
| PS-LIC (46) | 6 |
| CLIN-DEV (50) | 7 |
| **total** | **62** |

(Slight count drift between aggregate-by-role and per-domain — rounded in
draft; deployer to confirm during load.)

**Headline finding.** Industry-A is greenfield in `domain_data_objects` AND
the catalog is missing most vertical-canonical data_objects (`patients`,
`claims`, `subscribers`, `meters`, `outages`, `permits`, `production_orders`,
`till_sessions`, `clinical_devices`). The 60-ish NEW rows in Section 3 are
**only the embedded-master + consumer dependencies on horizontal records** —
they capture the integration-burden signal for the vertical's deferrals to
HCM/CRM/ERP-FIN/EAM/PIM, but they do NOT cover the vertical's own canonical
mastery (which is exactly the strongest Signal-1 source for these domains).

**Recommended load order:**

1. Create the ~70 missing vertical data_objects (Section 6.3) + resolve the
   8 naming collisions (Section 6.1).
2. Add the 7 customer-alias rows in `data_object_aliases` (Section 6.2).
3. Insert the 60 Section-3 embedded-master + consumer rows.
4. Run Phase-2 *again* per domain to land the now-loadable canonical-master
   rows on the freshly-created vertical data_objects.

Without step 1 the cluster will look artificially "low integration burden"
because the canonical-master rows are unrepresentable.
