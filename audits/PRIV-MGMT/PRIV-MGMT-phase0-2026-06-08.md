# PRIV-MGMT Phase 0 — Vendor Surface

Privacy program management market: DSR/DSAR fulfillment, consent management, ROPA / processing inventory, PIA/DPIA assessments, breach records, cross-border transfer bookkeeping, and processor/DPA registries. Child of GRC (domain_id=20). Five pure-play privacy specialists researched. Consent-only CMP vendors (Cookiebot, Didomi, Usercentrics, Sourcepoint) are a sibling market and out of scope here; the consent ledger surface is covered through the full-platform vendors that ship it as a module.

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| OneTrust Privacy | onetrust.com | Full privacy suite: DSR automation, data mapping/ROPA, assessment automation, consent | Category leader, defines the reference surface; the compliance-focused flagship (300+ jurisdictions, 50+ frameworks) |
| TrustArc | trustarc.com | Data Mapping & Risk Manager, Individual Rights Manager (DSR), Assessment Manager, Consent & Preference Manager | Long-standing pure-play; cleanest entity vocabulary in public docs (systems, data elements, processing activities, transfers, ROPA) |
| Securiti | securiti.ai | Data Command Center: DSR automation, data mapping/ROPA, assessment automation, universal consent | Data-discovery-led pure-play; strong DSR robotic automation and risk-register modeling |
| DataGrail | datagrail.io | Request Manager (DSR), Live Data Map (ROPA), Consent | Mid-market pure-play; unified Request Manager is the clearest evidence for one-DSR-object modeling |
| Transcend | transcend.io | DSR Automation, Data Inventory, Consent, Assessments, AI Governance | Modern pure-play; assessments tie directly to Data Inventory; confirms DSR + inventory + assessment as one platform |

## Surface matrix

Vendors: O=OneTrust, T=TrustArc, S=Securiti, D=DataGrail, X=Transcend.

| Entity | Category | O | T | S | D | X | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| data_subject_requests | Master | x | x | x | x | x | Core | PRIV-DSR-MGMT |
| data_subjects | Master | x | x | x | x | x | Core | PRIV-DSR-MGMT |
| processing_activities | Master | x | x | x | x | x | Core | PRIV-DATA-INVENTORY |
| personal_data_assets | Master | x | x | x | x | x | Core | PRIV-DATA-INVENTORY |
| data_elements | Master | x | x | x | x | x | Core | PRIV-DATA-INVENTORY |
| data_flows | Master | x | x | x | x | x | Core | PRIV-DATA-INVENTORY |
| processor_agreements | Master | x | x | x | . | x | Core | PRIV-DATA-INVENTORY |
| vendors_processors | Master | x | x | x | x | x | Core | PRIV-DATA-INVENTORY |
| data_transfers | Master | x | x | x | x | x | Core | PRIV-DATA-INVENTORY |
| privacy_impact_assessments | Master | x | x | x | . | x | Core | PRIV-ASSESSMENTS |
| privacy_assessment_templates | Config | x | x | x | . | x | Core | PRIV-ASSESSMENTS |
| consent_records | Master | x | x | x | x | x | Core | PRIV-CONSENT |
| consent_purposes | Master | x | x | x | x | x | Core | PRIV-CONSENT |
| consent_preferences | Master | x | x | x | x | x | Core | PRIV-CONSENT |
| data_subject_request_subtasks | Junction | x | x | x | x | x | Core | PRIV-DSR-MGMT |
| dsr_fulfillment_actions | Junction | x | x | x | x | x | Core | PRIV-DSR-MGMT |
| identity_verifications | Audit | x | x | x | x | x | Core | PRIV-DSR-MGMT |
| dsr_request_status_transitions | Junction | x | x | x | x | . | Core | PRIV-DSR-MGMT |
| privacy_risk_records | Master | x | x | x | . | x | Core | PRIV-ASSESSMENTS |
| data_breach_records | Master | x | x | x | . | . | Common | PRIV-ASSESSMENTS |
| assessment_responses | Junction | x | x | x | . | x | Core | PRIV-ASSESSMENTS |
| assessment_risk_findings | Junction | x | x | x | . | x | Core | PRIV-ASSESSMENTS |
| inventory_assessment_links | Junction | x | x | x | . | x | Core | PRIV-DATA-INVENTORY |
| systems_inventory | Master | x | x | x | x | x | Core | PRIV-DATA-INVENTORY |
| consent_collection_points | Config | x | x | x | x | x | Core | PRIV-CONSENT |
| consent_withdrawal_events | Junction | x | x | x | x | x | Core | PRIV-CONSENT |
| cookie_scan_records | Audit | x | . | x | x | . | Common | PRIV-CONSENT |
| dsr_audit_logs | Audit | x | x | x | x | x | Core | PRIV-DSR-MGMT |
| dsr_intake_forms | Config | x | x | x | x | x | Core | PRIV-DSR-MGMT |
| legal_holds | Config | x | . | x | . | . | Specialist | PRIV-DSR-MGMT |
| trust_center_pages | Engagement | x | x | . | x | . | Common | (out of scope; sibling) |
| dpa_clause_library | Config | x | x | . | . | . | Common | PRIV-DATA-INVENTORY |
| data_residency_locations | Master | x | x | x | . | x | Core | PRIV-DATA-INVENTORY |

## Compliance entities (non-optional)

These load regardless of vendor doc visibility; the regulation drives them.

| Entity | Regulation | Proposed module |
| --- | --- | --- |
| records_of_processing_activities | GDPR Art. 30 (ROPA) | PRIV-DATA-INVENTORY (= processing_activities is the ROPA master) |
| data_breach_records | GDPR Art. 33/34, US state breach laws | PRIV-ASSESSMENTS |
| data_protection_impact_assessments | GDPR Art. 35 (DPIA) | PRIV-ASSESSMENTS (= privacy_impact_assessments) |
| data_transfers | GDPR Ch. V (SCC/IDTA), transfer impact | PRIV-DATA-INVENTORY |
| transfer_impact_assessments | GDPR Ch. V (TIA post-Schrems II) | PRIV-ASSESSMENTS |
| consent_records | GDPR Art. 6/7, CPRA, LGPD | PRIV-CONSENT |
| data_subject_requests | GDPR Art. 15-22, CCPA/CPRA, LGPD, PIPEDA | PRIV-DSR-MGMT |
| processor_agreements | GDPR Art. 28 (DPA register) | PRIV-DATA-INVENTORY |

## Modularization hypothesis

Four modules, mapping one-to-one onto how every flagship packages its privacy suite into product areas:

- **PRIV-DATA-INVENTORY** (master: processing_activities) — the ROPA / data-mapping product. Scopes processing activities, personal-data assets, data elements, data flows, systems, processor agreements + DPA clauses, vendors/processors, cross-border transfers and residency. This is OneTrust Data Mapping, TrustArc Data Mapping & Risk Manager, Securiti Data Mapping, DataGrail Live Data Map, Transcend Data Inventory.
- **PRIV-DSR-MGMT** (master: data_subject_requests) — the individual-rights pipeline. One request master plus subtasks, fulfillment actions, identity verification, status transitions, intake forms, audit logs. This is OneTrust Privacy Rights Automation, TrustArc Individual Rights Manager, Securiti DSR Automation, DataGrail Request Manager, Transcend DSR Automation.
- **PRIV-CONSENT** (master: consent_records) — the consent/preference ledger. Records, purposes, preferences, collection points, withdrawal events. Every flagship ships this as a distinct module. (The cookie-banner CMP delivery layer stays in the sibling CMP market; this module is the consent *ledger of record*, not the banner widget.)
- **PRIV-ASSESSMENTS** (master: privacy_impact_assessments) — PIA/DPIA/TIA assessment automation plus the risk register and breach records. This is OneTrust Assessment Automation, TrustArc Assessment Manager, Securiti Assessment Automation, Transcend Assessments.

## Per-decision verdicts

### D1 — Re-homing the four external masters into PRIV-MGMT

**All four belong in PRIV-MGMT, but as ONE consolidated DSR master plus one consent master, not four parallel masters.**

- **data_subject_requests (id 901, in ATS-CANDIDATE-CRM):** YES, re-home. Every flagship models a data-subject/consumer request as a first-class master: OneTrust Privacy Rights Automation, TrustArc Individual Rights Manager, Securiti DSR workbench, DataGrail Request Manager, Transcend DSR Automation. This is the headline noun of the DSR market. The ATS-scoped row (candidate rights) is a domain-specific projection; the canonical master lives in PRIV-DSR-MGMT.
- **subject_access_requests (id 951, in LMS-CT-GDPR):** YES re-home, but **consolidate into data_subject_requests as a request_type, do NOT carry as a separate master.** Vendor evidence is decisive: DataGrail's "Request Manager" routes access, deletion, object-to-processing, transfer, and update-inaccuracy requests through one product with one centralized dashboard and shared intake forms. OneTrust "Privacy Rights Automation" is one workflow engine across request types. TrustArc "Individual Rights Manager," Securiti's "single pane for all DSR activities," and Transcend's one "DSR Automation" solution ("no matter the request type") all do the same. None of the five exposes access as a structurally separate master object; access is a `request_type` enum value on the unified request.
- **data_deletion_requests (id 952, in LMS-CT-GDPR):** YES re-home, **same consolidation.** Deletion/erasure is a request_type on the unified DSR master across all five vendors. It carries type-specific fields (anonymization policy, retention/legal-hold exceptions), which are columns on the one request master, not justification for a separate table.
- **gdpr_consent_records (id 950, in LMS-CT-GDPR):** YES re-home, into PRIV-CONSENT as the **consent_records master.** Every flagship ships a consent/preference module mastering consent records keyed to purposes; rename the GDPR-specific row to the regulation-neutral consent_records master (Rule #18).

**Net for D1:** re-home all four, but the catalog should collapse 901 + 951 + 952 into a single `data_subject_requests` master carrying a `request_type` discriminator (access | deletion | correction | portability | opt-out | objection | restriction), and re-home 950 as `consent_records`. The catalog currently carries 951 and 952 as separate `master`-role rows in LMS-CT-GDPR (confirmed live); that triple-master split contradicts how 5/5 vendors model it and should be consolidated on re-home rather than ported as-is.

### D2 — Module split: 4 vs 3 vs 2

**4 modules.** The market gives four cleanly separable product areas, and every flagship sells them as distinct (often separately licensed) SKUs: data mapping/ROPA, DSR/individual-rights, consent/preference, and assessments. Rule #14 is satisfied four times over: each module has a clear master (processing_activities / data_subject_requests / consent_records / privacy_impact_assessments) and the domain has well more than three capabilities, so >=2 modules is mandatory; the natural decomposition lands on four. Collapsing to 3 would force consent or assessments to merge into inventory despite vendors treating them as independent SKUs with independent data models. 2 is clearly too coarse (it would fuse DSR + consent + assessments into one bucket that no vendor ships as one product). The candidate 4-module split in the audit is correct and should stand.

### D3 — Bucket-3 master candidates (Core/Common + module)

- **processing_activities** — Core (5/5). Master of PRIV-DATA-INVENTORY; this IS the ROPA record (GDPR Art. 30).
- **personal_data_assets** — Core (5/5). PRIV-DATA-INVENTORY. **Collision resolution below.**
- **processor_agreements** — Core (4/5; absent only in DataGrail public docs). PRIV-DATA-INVENTORY, with a dpa_clause_library config sibling.
- **data_transfers** — Core (5/5). PRIV-DATA-INVENTORY (SCC/IDTA cross-border bookkeeping).
- **privacy_impact_assessments** — Core (4/5; DataGrail is the DSR/consent-led exception). Master of PRIV-ASSESSMENTS.
- **data_breach_records** — Common (3/5: OneTrust, TrustArc, Securiti; not surfaced in DataGrail/Transcend public docs) but **load as Compliance** (GDPR Art. 33/34). PRIV-ASSESSMENTS.
- **consent_purposes** — Core (5/5). PRIV-CONSENT, parent lookup for consent_records.

**personal_data_assets vs DCG data_assets (id 300) collision — RESOLUTION:** keep them **distinct masters** under different names; PRIV-MGMT's personal_data_assets is a privacy-scoped master, NOT a rename of and NOT merged into DCG's data_assets. Vendor evidence: the privacy data inventory tracks personal-data semantics that the data-governance catalog does not (data elements/categories such as special-category data, lawful basis, retention period, linkage to processing activities and to a data subject). All five flagships build a personal-data inventory inside the privacy product rather than consuming a generic asset catalog. Concrete recommendation: PRIV-MGMT keeps `personal_data_assets` as its own master in PRIV-DATA-INVENTORY, optionally holding a reference FK to DCG's `data_assets` (id 300) so the privacy inventory can *derive/link* to the governance catalog (this is exactly OneTrust/Securiti "data discovery feeds the privacy inventory"), but it is not an embedded_master of DCG and does not collapse into 300. Distinct master with a different name + optional reference to DCG. (Note: the `data_elements` row in the matrix is the finer-grained child of personal_data_assets, not a duplicate.)

### D4 — Regulation coverage across flagships (ranked by universality)

1. **GDPR** — 5/5 universal. The reference regulation for all flagships.
2. **CCPA / CPRA** — 5/5 universal (CPRA already in catalog; keep). Every flagship is built for US-state rights.
3. **LGPD (Brazil)** — 5/5 effectively universal; named explicitly by OneTrust, TrustArc, Securiti.
4. **PIPEDA (Canada)** — 4/5; named by OneTrust and TrustArc explicitly, supported by Securiti/Transcend's jurisdiction engines. **Add.**
5. **PIPL (China)** — 3/5; named by TrustArc, covered by OneTrust's 300+ jurisdictions and Securiti's regulation library; not surfaced by DataGrail/Transcend. Add for enterprise completeness.
6. **POPIA (South Africa)** — 2-3/5; OneTrust and Securiti via jurisdiction libraries. Add (regional).
7. **HIPAA** — 2/5 in the *privacy-program* sense (OneTrust, Securiti list it among frameworks); it is primarily a healthcare-security regime, peripheral to core privacy-program SKUs. Lowest priority for PRIV-MGMT; flag as cross-domain with healthcare/security rather than a core privacy regulation.

**Verdict:** keep CPRA; add PIPEDA, LGPD, PIPL, POPIA. Treat HIPAA as out-of-core (cross-domain) for PRIV-MGMT.

### D5 — DataGrail and Transcend as flagship solutions rows

**Confirmed: add both as genuine flagship privacy-management solutions, not point tools.** DataGrail is a multi-product platform: Request Manager (DSR) + Live Data Map (ROPA/data mapping with audit-ready Article 30 records) + Consent. It spans three of the four modules, so it is a privacy-management platform, not DSR-only. Transcend is broader still: DSR Automation + Data Inventory + Consent + Assessments (DPIA/vendor/AI risk, tied to the inventory) + AI Governance, spanning all four modules. Both are pure-play privacy specialists with real data-mapping and assessment surface, qualifying them as solutions rows alongside OneTrust, TrustArc, and Securiti. (Sourcepoint/Cookiebot/Didomi, by contrast, would be CMP-only and do NOT qualify for PRIV-MGMT.)
