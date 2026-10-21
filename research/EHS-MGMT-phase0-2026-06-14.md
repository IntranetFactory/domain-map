# Phase 0 Vendor-Surface Research: EHS-MGMT (Environmental, Health and Safety Management)

Date: 2026-06-14
Status: RESEARCH ONLY (no catalog writes, no commits, no loads)
Analyst pass: Phase 0 triage for candidate domain EHS-MGMT

---

## 0. Live catalog overlap check (executed)

Query run against the live `/domains` table (codes REAL-EST, ESG, IWMS, GRC, FSQM plus name matches on health / safety / environ). Returned rows:

| domain_code | domain_name | crud% | min_org_size | cost_band |
|---|---|---|---|---|
| ESG | ESG Management | 78 | 40 l <10000 | $$$ |
| GRC | Governance, Risk and Compliance | 80 | 30 m <2500 | $$$ |
| IWMS | Workplace and Space Management | 85 | 30 m <2500 | $$$ |
| REAL-EST | Real Estate and Workplace Management | 80 | 30 m <2500 | $$$ |
| FSQM | Food Safety and Quality Management | 80 | 30 m <2500 | $$$ |
| HC-PATIENT | Healthcare Patient Operations | 88 | 30 m <2500 | $$$$ |

Finding: there is NO standalone EHS / Environmental Health and Safety / Occupational Health and Safety domain in the catalog. The adjacency set (ESG, GRC, IWMS, REAL-EST, FSQM) is all present but none of them is EHS:

- ESG = corporate sustainability data collection, disclosure, and reporting (the disclosure/investor-facing layer).
- GRC = integrated risk management: policy, controls, risk assessment, compliance evidence (enterprise-wide, not operational worker safety).
- FSQM = food-safety management (HACCP, GFSI schemes) for food manufacturers; safety-system pattern but food-specific, not occupational EHS.
- REAL-EST / IWMS = real estate, facilities, space; REAL-EST explicitly owns utility/Scope 1+2 emission SOURCE data but not worker safety.
- HC-PATIENT = clinical patient operations (not employee/occupational health).

The EHS gap is real and clean.

---

## 1. Flagship vendors

EHS (Environmental, Health and Safety, sometimes EHSQ or ESHQ) is a long-standing, separately benchmarked market. Gartner Peer Insights, Verdantix (Green Quadrant EHS Software), and the major analysts all maintain a distinct EHS software category. Verdantix identifies 22 prominent vendors and a 13-vendor Leaders cohort; the enterprise tier has consolidated around six to seven platforms.

| Vendor | One-line positioning | Ownership (2026) |
|---|---|---|
| Cority | Pure-play enterprise EHS/occupational-health suite; strongest in occupational health and industrial hygiene; "CorityOne" platform | Independent; majority growth investment from Thoma Bravo (2019), still its own brand |
| Intelex | Highly configurable EHSQ management system; broad operational EHS + quality | Operating company of Fortive; Fortive also owns Industrial Scientific (gas detection), feeding connected-worker EHS data |
| Sphera | EHS, operational risk, product stewardship, and sustainability; chemical/process-safety depth | Acquired by Blackstone from Genstar Capital for ~$1.4B (announced Aug 2024) |
| Enablon | Often ranked global leader in EHS, risk, and sustainability; large-enterprise process-industry footprint | Owned by Wolters Kluwer (acquired 2016, ~$279M) |
| VelocityEHS | Cloud-native EHS and ESG; strong in chemical/SDS management, industrial ergonomics, and mid-to-large market reach | Independent (private-equity backed) |
| Benchmark Gensuite (Benchmark Digital) | Broad connected-worker EHS suite; large process and manufacturing install base | Independent (Benchmark Digital Partners) |
| ETQ (ETQ Reliance) | Primarily a SaaS QMS (quality) platform with EHS/compliance modules; EHS is secondary to quality | Owned by Hexagon (acquired 2022, ~$1.2B) |

Flagship classification note: Cority, Intelex, Sphera, Enablon, VelocityEHS, and Benchmark Gensuite have EHS as their FLAGSHIP/primary product. ETQ Reliance is fundamentally a QMS whose flagship is quality management; EHS is an adjacent module set, so ETQ counts as adjacent evidence, not a pure-play EHS flagship. EcoOnline, Evotix, IsoMetrix, Quentic, and Alcumus are additional independent EHS-flagship vendors that reinforce the market depth.

---

## 2. Entity x vendor surface matrix

Classification key: Core (every EHS platform has it, it is the spine), Common (present across most suites but module-gated), Compliance (regulator-driven entity that exists because of a statute/standard).

| Core data object | Cority | Intelex | Sphera | Enablon | VelocityEHS | Class |
|---|---|---|---|---|---|---|
| Safety incidents / injuries / near-misses | Yes | Yes | Yes | Yes | Yes | Core |
| Hazards / risk assessments (JSA, job hazard analysis) | Yes | Yes | Yes | Yes | Yes | Core |
| Corrective and preventive actions (CAPA) | Yes | Yes | Yes | Yes | Yes | Core |
| Inspections / audits / observations | Yes | Yes | Yes | Yes | Yes | Core |
| Permits (permit-to-work, regulatory permits) | Yes | Yes | Yes | Yes | Yes | Common |
| Chemical / SDS inventory | Yes | Yes | Yes | Yes | Yes (lead) | Common |
| Health surveillance / occupational medical records | Yes (lead) | Yes | Partial | Yes | Partial | Common |
| Industrial hygiene sampling / exposure monitoring | Yes (lead) | Yes | Yes | Yes | Yes | Common |
| Training / competency / certification records | Yes | Yes | Yes | Yes | Yes | Common |
| Contractors / third-party safety qualification | Yes | Yes | Yes | Yes | Yes | Common |
| Emissions / environmental compliance records | Partial | Yes | Yes (lead) | Yes (lead) | Yes | Compliance |
| Management of change (MOC) / process safety | Partial | Yes | Yes (lead) | Yes | Partial | Common |

Core spine (universal): incidents, hazard/risk assessments, CAPA, inspections/audits. These four are the irreducible EHS system-of-record. Everything else is module-gated but broadly present.

---

## 3. Required compliance entities (regulated)

EHS is regulation-driven; the following regulated entities must exist in any promoted domain:

1. OSHA Form 300 (Log of Work-Related Injuries and Illnesses) - one log per establishment per year.
2. OSHA Form 300A (Annual Summary) - posted/electronically submitted summary.
3. OSHA Form 301 (Injury and Illness Incident Report) - per recordable incident.
4. OSHA electronic submission records (Injury Tracking Application / ITA filings).
5. EU-OSHA / EU member-state occupational accident reporting records (national equivalents of OSHA logs).
6. ISO 45001 (Occupational Health and Safety Management System) audit, nonconformity, and management-review records.
7. ISO 14001 (Environmental Management System) audit and aspect/impact records.
8. REACH / CLP and OSHA HazCom records: Safety Data Sheets (SDS), chemical inventory, hazardous-substance registers, exposure limits.
9. EPCRA / Tier II chemical inventory and emissions reporting records (US environmental release reporting).
10. Environmental permits and permit-condition / limit-monitoring records (air, water/NPDES, waste/RCRA).
11. Medical surveillance and exposure records (OSHA 1910.1020 retention rules; respirator fit tests, audiometric tests).
12. Contractor safety qualification and prequalification records (often tied to permit-to-work compliance).

These compliance entities are what distinguish EHS from ESG: they are operational, establishment-level, and tied to occupational-safety and environmental statutes, not investor-facing disclosure frameworks.

---

## 4. Modularization hypothesis

If promoted, EHS-MGMT decomposes cleanly into four operational modules plus the cross-cutting compliance spine. This mirrors how Cority, Enablon, Sphera, and VelocityEHS actually package their suites.

- Module A - Safety / Incident Management: safety incidents, near-misses, injuries/illnesses, hazards, risk assessments (JSA/JHA), CAPA, leading-indicator/SIF-precursor records, OSHA 300/300A/301 logs.
- Module B - Industrial Hygiene and Occupational Health: IH sampling/exposure monitoring, health surveillance, occupational medical records, respirator fit tests, audiometric records, medical case management.
- Module C - Environmental Compliance: environmental permits and conditions, emissions/release records, air/water/waste compliance, EPCRA/Tier II reporting, environmental aspect/impact registers (ISO 14001).
- Module D - Audit and Inspection: inspections, audits, observations, findings, ISO 45001/14001 conformance, action tracking (shares CAPA with Module A).
- Cross-cutting - Chemical/SDS and Workforce Compliance: SDS/chemical inventory, hazardous-substance registers, training/competency/certification, contractor safety qualification, permit-to-work. (Could be a fifth module or shared master data.)

Master-data candidates that likely already exist or should be shared: sites/facilities/establishments (overlaps REAL-EST), employees/workers (HR), contractors/vendors, chemicals.

---

## 5. Point-solution-market test

Question: Are there at least 3 INDEPENDENT vendors whose FLAGSHIP product is this market?

Answer: YES, comfortably.

Reasoning: At least five to six vendors have EHS as their flagship product and are corporately independent of one another: Cority (independent, Thoma Bravo-backed), VelocityEHS (independent PE-backed), Benchmark Gensuite (independent), Enablon (Wolters Kluwer), Sphera (Blackstone), Intelex (Fortive). Even discounting ETQ (a QMS-flagship with EHS as a secondary module) and treating Enablon/Intelex/Sphera as financially sponsored, the corporate owners are entirely distinct entities competing head-to-head, and Cority + VelocityEHS + Benchmark Gensuite alone satisfy the three-independent-flagship bar. Verdantix benchmarks 22 vendors with a 13-vendor Leaders cohort, and the market has seen 40+ M&A transactions in two years, the signature of a mature, deep, standalone point-solution market.

---

## 6. Overlap analysis (distinct market vs fold-in)

EHS vs ESG (the boundary that matters):
- ESG is the corporate sustainability DISCLOSURE layer: investor- and regulator-facing reporting against frameworks (CSRD/ESRS, GRI, SASB, TCFD, SEC climate). Audience is finance, sustainability, and investor relations.
- EHS is the OPERATIONAL layer: establishment-level worker safety and environmental compliance, system-of-record for incidents, exposures, permits, and OSHA/ISO records. Audience is plant EHS managers, safety officers, and occupational-health staff.
- The two touch (Sphera and Enablon sell both; EHS emissions/incident data can feed ESG disclosure), but they are different buyers, different data granularity (transaction-level operational records vs aggregated disclosure metrics), and different regulatory regimes (OSHA/ISO 45001/14001 vs CSRD/SEC). Analysts (Gartner, Verdantix) maintain separate EHS and ESG/sustainability quadrants. EHS does NOT fold into ESG; it is upstream of it.

EHS vs GRC: GRC is enterprise risk/policy/controls/compliance evidence at the corporate governance level. EHS is operational-safety-specific with its own regulated entities (OSHA logs, SDS, IH sampling). GRC is too generic; EHS is a vertical operational discipline. No fold.

EHS vs FSQM: FSQM is the closest structural analog (a safety-management-system pattern: hazard analysis, audits, CAPA, recordkeeping), but it is food-manufacturing-specific (HACCP, GFSI, FSMA). EHS is occupational/environmental across ALL industries. Same archetype, different domain and buyer. No fold; EHS is its own peer to FSQM.

Conclusion: EHS-MGMT is a distinct, mature, separately-benchmarked enterprise software market. It is upstream of ESG, broader than FSQM, and operationally specific where GRC is generic.

---

## 7. Triage recommendation

VERDICT: promote-as-domain

Rationale: EHS is a long-standing, separately benchmarked Gartner/Verdantix enterprise market with 5+ independent vendors whose flagship product is EHS (Cority, VelocityEHS, Benchmark Gensuite, plus sponsor-owned Enablon, Sphera, Intelex), clearing the three-independent-flagship bar with room to spare. It has a distinct buyer (plant EHS/safety/occupational-health managers), a distinct regulated entity set (OSHA 300/301, ISO 45001/14001, REACH/SDS, environmental permits), and is operationally upstream of ESG rather than a subset of it, so it does not fold into ESG, GRC, or FSQM. The candidate capability list (incident management, hazard analysis, permit tracking, health surveillance, OSHA/EU-OSHA reporting, contractor safety, audits) maps cleanly onto a four-module decomposition that the flagship vendors themselves use.

### Proposed domain definition

- domain_code: EHS
- domains.description: "Environmental, Health and Safety management: operational system-of-record for workplace safety (incidents, hazards, risk assessments, CAPA), occupational health and industrial hygiene, audits and inspections, and environmental compliance (permits, emissions, chemical/SDS), satisfying OSHA, EU-OSHA, ISO 45001 and ISO 14001. Operationally upstream of ESG (supplies incident and environmental data to corporate disclosure) and a peer to FSQM (same safety-management-system archetype, occupational/environmental rather than food-specific)."

### Business-metadata estimates

| Field | Estimate | Basis |
|---|---|---|
| crud_percentage | 80 | Heavy transactional capture (incidents, inspections, samples, training) with meaningful workflow/analytics logic; in line with FSQM (80) and GRC (80). |
| business_logic | Moderate-to-high | Incident-investigation workflows, OSHA recordability determination, SIF/leading-indicator analytics, exposure-limit calculations, CAPA escalation, permit-condition monitoring. Not pure CRUD. |
| min_org_size | 30 m <2500 | Mid-market and up adopt formal EHS systems; regulated process/manufacturing sites drive adoption. Enterprise tier (Enablon/Sphera) skews larger, but the floor is mid-market, matching FSQM/IWMS/GRC. |
| cost_band | $$$ | Six-figure annual enterprise deals typical; consistent with the $$$ cohort (ESG, GRC, IWMS, FSQM). |
| certification_required | Yes | Tied to ISO 45001 / ISO 14001 certification and OSHA/EPA/EU-OSHA regulatory compliance; certification and regulatory audit are core drivers. |
| usa_market_size_usd_m | ~2,500 | Global EHS software market estimated ~USD 7.06B (2025), rising to ~7.58B (2026); US is roughly 35-40% of the global total, implying ~2,500-3,000M USD. Use ~2,500M as a conservative US figure. |
| market_size_source_year | 2025 | Global figure sourced 2025 (Mordor Intelligence / market trackers cited via 2026 vendor-landscape research). |

---

## B3 follow-ups (non-blocking ideas, do not gate "finished")

- Possible discretionary additive entities once promoted: "permit-to-work" as a first-class entity distinct from regulatory environmental permits; "management of change (MOC)" for process-industry buyers; "SIF precursor / leading indicator" records.
- Master-data sharing review: sites/establishments overlap REAL-EST; contractors/vendors and chemicals are cross-domain master candidates. Worth a master-promotion check during deployment, not at triage.
- Adjacency note for future: EHS emissions/incident outputs are an explicit upstream feed into ESG disclosure; a documented relationship edge EHS -> ESG would be worth recording.

---

## Sources

- Mordor Intelligence, Environmental Health and Safety Software Market (2025-2030 sizing).
- Verdantix, EHS Software Benchmark / Green Quadrant (22 vendors, 13-vendor Leaders cohort; AI/proactive-risk shift).
- Gartner Peer Insights, EHS Software market reviews (2026).
- Blackstone press release, acquisition of Sphera from Genstar Capital (~$1.4B, Aug 2024).
- Wolters Kluwer / Enablon ownership (acquired 2016, ~$279M).
- Fortive / Intelex (operating company; Industrial Scientific connected-worker data).
- Hexagon press release, acquisition of ETQ (QMS flagship, ~$1.2B, 2022).
- VelocityEHS solution pages (chemical/SDS, contractor safety, permit-to-work, incident management).
- EHS Insight / Ecesis (OSHA 300/300A/301 recordkeeping, IH, medical surveillance feature breakdown).
