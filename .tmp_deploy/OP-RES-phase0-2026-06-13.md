# OP-RES (Operational Resilience) — Phase 0 Vendor-Surface Research

Date: 2026-06-13
Scope: Read-only vendor-surface research to settle whether OP-RES is a leadership-tier overlay or a master-bearing domain.

Operational Resilience (OP-RES) is the regulator-driven market (DORA, NIS2, UK PRA/FCA operational-resilience rules) for keeping important business services running through severe-but-plausible disruption and proving that capability to regulators. It sits adjacent to BCM (business continuity), TPRM (third-party risk), GRC, SECOPS, and CMDB.

## 1. Flagship vendors

- **Fusion Framework System (Fusion Risk Management)**: a Salesforce-native resilience platform that is the closest thing to a pure-play operational-resilience product. It explicitly models important business services, impact tolerances, and dependency mapping as first-class objects, with BCM, third-party risk, and incident management built on the same data model. Strongest direct fit to the OP-RES regulatory frame.
- **Castellan Solutions**: a resilience-management platform (the former Assurance Software / ClearView / Castellan merger) centered on business continuity that has extended into operational resilience, with important-business-service definition, dependency mapping, and impact-tolerance setting as product capabilities. Pure-play resilience positioning, BCM-rooted.
- **Riskonnect Platform**: an integrated risk-management suite covering BCM, ERM, TPRM, claims, and resilience. Resilience is one module within a broad GRC/IRM portfolio rather than the product's spine; it models business services and tolerances but inside a generalized risk object model.
- **ServiceNow Integrated Risk Management (IRM) + Operational Resilience Management (ORM)**: an IRM suite layered on the ServiceNow platform and its CMDB. ServiceNow ships an Operational Resilience Management application that defines important business services and impact tolerances by mapping onto CMDB business services and CSDM (Common Service Data Model) rather than mastering a separate register. Platform-native, CMDB-anchored.
- **Archer Suite (formerly RSA Archer)**: a configurable GRC platform with a Business Resiliency use-case (BIA, BCM, IT/DR) and an Operational Resilience offering. Archer models the entities as records in a flexible application layer; it is GRC-platform-shaped, master-bearing-capable but configuration-defined rather than opinionated.

Compliance/DORA specialist coverage: DORA-specific packaging (ICT third-party register, register of information, major-incident reporting, TLPT) appears as dedicated modules/accelerators in Fusion, Archer, ServiceNow, and Riskonnect, plus point solutions (e.g. GRC/TPRM tools such as OneTrust, Prevalent/Mitratech, and audit-firm accelerators). Fusion and Archer ship the most explicit DORA register tooling among the flagships above.

## 2. Vendor surface matrix

Cells: **1st** = modeled as a first-class historized master; **partial** = supported but as attributes/config or thin records; **consumed** = read from another system, not mastered here.

| Entity | Fusion | Castellan | Riskonnect | ServiceNow IRM/ORM | Archer | Class |
|---|---|---|---|---|---|---|
| important_business_services | 1st | 1st | 1st | partial (CMDB-embedded) | 1st | Core |
| impact_tolerances | 1st | 1st | partial | 1st | 1st | Core |
| service_dependency_maps | 1st | 1st | partial | consumed (CMDB/CSDM) | partial | Core |
| resilience_scenarios | 1st | 1st | partial | 1st | partial | Common |
| resilience_tests | 1st | 1st | partial | 1st | partial | Common |
| resilience_incidents | 1st | partial | 1st | 1st | partial | Common |
| resilience_remediation_actions | 1st | partial | 1st | 1st | 1st | Common |
| ict_third_party_register_entries | 1st | partial | 1st (TPRM) | partial | 1st | Compliance |
| dora_major_incident_reports | 1st | partial | partial | partial | 1st | Compliance |
| dora_threat_led_pen_tests | partial | no/consumed | no/consumed | partial | partial | Specialist |
| nis2_significant_incident_reports | partial | partial | partial | partial | partial | Compliance |

Reading the matrix: the **mapping triad** (important_business_services, impact_tolerances, service_dependency_maps) is Core and is mastered by every pure-play (Fusion, Castellan) and by the GRC platforms (Archer), with ServiceNow as the lone CMDB-consuming outlier. The **testing/incident** band is Common and broadly mastered. The **DORA/NIS2** band is Compliance: it is register- and report-shaped, and is split across resilience, TPRM, and incident products depending on the vendor. TLPT (threat-led penetration testing) is Specialist: vendors track its scheduling, scope, and findings as records but the actual execution lives in SECOPS / red-team tooling.

## 3. Market-shape verdict

The decisive Phase 0 question is whether flagship pure-play resilience vendors **persist** these entities as first-class historized records or **compute** them at query time from other systems.

The vendor evidence is clear: **pure-play resilience vendors persist the mapping triad and the testing/incident band as first-class, historized, owned records.** Fusion's whole model is a graph of important-business-service objects, impact-tolerance thresholds, dependency edges, and exercise/incident records that are authored, versioned, attested, and reported on inside the product. Castellan does the same from a BCM root. These are not views over CMDB or GRC; they are the master data the regulator audits, because the regulatory artifact (the self-assessment, the tolerance breach evidence, the exercise outcome) requires a defensible point-in-time record of what the tolerance *was* and what the service *depended on* at the time of disruption. A query-time computation cannot satisfy "prove your tolerance as it stood last March."

Therefore **OP-RES is master-bearing per the vendor evidence**, not a pure leadership-tier overlay. The pure-plays exist precisely because BCM/GRC/CMDB did not already master impact tolerances and important-business-service-to-dependency mapping with resilience semantics.

But mastery is partial, and the seams matter:

- **Genuinely OP-RES-owned**: important_business_services (as a *resilience* register, distinct from raw CMDB services), impact_tolerances, service_dependency_maps (the resilience overlay edges and their tolerance context), resilience_scenarios, resilience_tests, resilience_incidents (as resilience-framed records), resilience_remediation_actions.
- **Better owned elsewhere, consumed by OP-RES**: the *raw* service catalog and the technical dependency graph belong to **CMDB** (`business_services`); OP-RES references them and overlays resilience attributes. The supplier/third-party master and the ICT third-party register substrate belong to **TPRM**; OP-RES references it for DORA register-of-information purposes. **TLPT execution** belongs to **SECOPS** (red-team / pen-test programs); OP-RES owns the regulatory scheduling/scope/attestation record but not the test run itself.

So OP-RES masters a *resilience overlay register* plus its own testing/incident lifecycle, while consuming the host catalog from CMDB, the third-party master from TPRM, and TLPT execution from SECOPS. It is master-bearing **and** a consumer: a hybrid, not a pure overlay.

## 4. Per-decision verdicts

### q1 — leadership-tier vs promote vs hybrid

**Verdict: promote to master-bearing, hybrid in posture.** Flagship vendors ship the resilience substrate as first-class product modules with owned entities, not as computed dashboards. Fusion Framework and Castellan are entire products built around persisting important business services, impact tolerances, dependency maps, exercises, and incidents. Archer and Riskonnect expose the same entities as configurable GRC records. Only ServiceNow leans overlay, and even ServiceNow ships a dedicated ORM application with its own tolerance and assessment records. A leadership-tier-only OP-RES that masters nothing would contradict every pure-play. OP-RES should be promoted with owned modules, while explicitly consuming CMDB, TPRM, and SECOPS for the substrate those domains already master.

### q2 — important_business_services: OP-RES-mastered vs CMDB-consumed vs shared host

**Verdict: OP-RES-mastered as a resilience register that references the CMDB service.** Fusion and Castellan **master** the important-business-service: it is a distinct resilience object carrying tolerance, criticality tier, regulatory designation, and a curated dependency set, authored and historized in the resilience product. ServiceNow IRM/ORM **embeds** it from the platform CMDB/CSDM, defining the important business service by selecting and annotating an existing CMDB `business_service`. The split is real and load-bearing: the *resilience designation* (what is important, what its tolerance is, how it maps under stress) is OP-RES-owned; the *underlying service identity and technical dependency graph* is CMDB-owned. Recommended model: OP-RES masters `important_business_services` with an FK reference to CMDB `business_services`, not a copy. This matches the pure-plays (own the register) while honoring CMDB as system-of-record for the service itself (the ServiceNow lesson).

### q3 — DORA/NIS2 substrate split across OP-RES / BCM / TPRM / SECOPS

**Verdict: split by artifact, anchored to the owning master.**
- **ICT third-party register entries / register of information**: packaged primarily in the **third-party-risk** product line. Riskonnect and Fusion surface it through their third-party-risk modules; Archer ships a DORA register-of-information accelerator. These entries should reference the **TPRM** third-party master; OP-RES/DORA owns only the DORA-specific register fields layered on top, not the supplier master.
- **TLPT artifacts (dora_threat_led_pen_tests)**: vendors (Fusion, Archer, ServiceNow) model the *governance* record (scope, threat scenario, schedule, findings, attestation) but the *execution* is **SECOPS** red-team/pen-test work. OP-RES owns the regulatory wrapper record; SECOPS owns the test run. Keep them as separate linked entities.
- **Major-incident reporting (dora_major_incident_reports, nis2_significant_incident_reports)**: packaged in the **incident/resilience** product. Archer and Fusion ship DORA major-incident reporting workflows; these are regulatory report records derived from a resilience or security incident. They are OP-RES-owned report artifacts that reference the source `resilience_incident` (or a SECOPS security incident for NIS2 cyber cases).

Net: the DORA/NIS2 band is a thin compliance-reporting overlay whose substrate is mastered in TPRM (third parties), SECOPS (TLPT execution, cyber incidents), and OP-RES (business-service incidents). Model the DORA/NIS2 reports and register entries as OP-RES-owned artifacts with FK references outward, not as new copies of supplier, pen-test, or incident masters.
