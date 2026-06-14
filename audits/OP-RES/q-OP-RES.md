# Operational Resilience (OP-RES): questions waiting for you

## What this domain is
Keep the services your clients and the market depend on running through severe disruption, and prove it to regulators.

Map your important business services, set how much disruption each one can tolerate, and trace what each service depends on across people, processes, technology, and third parties. Run severe-but-plausible scenario tests against those tolerances, capture resilience incidents and the remediation they trigger, and produce the reporting that statutory frameworks like DORA and NIS2 demand.

---

q1: (answer this first) How should Operational Resilience be set up: stay a lean leadership-tier landing surface, or be promoted to own its own data?

- a) Keep it leadership-tier: build one landing module only, read the underlying data from GRC, BCM, ITSM, and Security, and treat the regulator artifacts as derived views.
- b) Promote it to master-bearing: build a Mapping module (important business services, impact tolerances, service dependency maps) and a Testing-and-Incident module (resilience scenarios, tests, incidents, remediation actions), and let it own that data, while still consuming the underlying service catalog from CMDB, the third-party master from Third-Party Risk, and threat-led-pen-test execution from Security.
- c) Hybrid: build the thin landing surface now and defer the data-owning modules to a later research-driven load, aligned with the parallel Business Continuity decision.

Recommended: b (promote). Fresh vendor research is decisive: the pure-play operational-resilience products are built around persisting this data as owned records, not computing it from other systems. Fusion Framework System (Fusion Risk Management) and Castellan both master important business services, impact tolerances, dependency maps, scenarios, tests, and incidents as first-class, versioned, attested records; Archer (formerly RSA Archer) exposes the same entities as configurable GRC records. The reason they exist is that the regulator audits a defensible point-in-time record (what the tolerance was, what the service depended on at the moment of disruption), which a query-time view cannot satisfy. Only ServiceNow IRM/ORM leans overlay, and even it ships a dedicated Operational Resilience Management application with its own tolerance and assessment records rather than mastering nothing. A leadership-tier-only OP-RES that owns no data would contradict every pure-play in the market. Promote (b), but as a hybrid in posture: own the resilience register and the testing/incident lifecycle, and consume CMDB, Third-Party Risk, and Security for the substrate those domains already master. Still worth coordinating with the Business Continuity equivalent so the resilience-tests-versus-continuity-exercises boundary is drawn once. This choice gates every module, the skill, the consumer data links, and all the optional items below. (Full surface matrix: .tmp_deploy/OP-RES-phase0-2026-06-13.md.)

a1:

---

q2: Where should the regulator-facing register of important business services live?

- a) Operational Resilience owns it as its own thing, separate from the operational service list in your CMDB, with regulator-facing fields (tolerance, criticality, regulator mapping).
- b) Operational Resilience reuses the CMDB service list and just adds a per-service regulator overlay on top.
- c) A shared register hosted jointly by Operational Resilience, CMDB, and the Service Catalog.

Recommended: a (own it as a resilience register that references the CMDB service), conditional on promoting in q1. Fusion and Castellan master the important-business-service as a distinct resilience object carrying tolerance, criticality tier, regulatory designation, and a curated dependency set, authored and historized inside the resilience product. ServiceNow IRM/ORM instead embeds it from the platform CMDB/CSDM by annotating an existing CMDB business_service. The split is load-bearing: the resilience designation (what is important, its tolerance, how it maps under stress) is OP-RES-owned, while the underlying service identity and technical dependency graph stay CMDB-owned. So model it as an OP-RES-mastered important_business_services entity with an FK reference to CMDB business_services, not a copy. Option (a) only applies if OP-RES owns data at all, so this depends on q1.

a2:

---

q3: Where should the DORA and NIS2 reporting substrate (ICT third-party register, threat-led pen-test artifacts, major-incident and significant-incident reports) live across Operational Resilience, Business Continuity, Third-Party Risk, and Security?

- a) Split it by artifact, each domain owning its own slice.
- b) Build one shared DORA-compliance area hosted jointly by all four domains.
- c) Defer until the Business Continuity and Third-Party Risk audits land, so the split is decided once.

Recommended: a (split by artifact, anchored to the owning master), or c (defer) if you want to decide it jointly with the Business Continuity and Third-Party Risk audits. Vendor packaging supports a clean by-artifact split: the ICT third-party register sits in the third-party-risk product line (Riskonnect and Fusion surface it through their third-party-risk modules; Archer ships a DORA register-of-information accelerator), so those entries should reference the Third-Party Risk supplier master and OP-RES owns only the DORA-specific register fields layered on top. Threat-led-pen-test records: Fusion, Archer, and ServiceNow model the governance record (scope, threat scenario, schedule, findings, attestation) but the execution is Security red-team work, so OP-RES owns the regulatory wrapper and Security owns the test run, as two linked entities. Major-incident and significant-incident reports: Archer and Fusion ship DORA major-incident reporting workflows as report records derived from a resilience or security incident, so they are OP-RES-owned report artifacts that reference the source incident. Net: the DORA/NIS2 band is a thin compliance-reporting overlay whose substrate is mastered in Third-Party Risk, Security, and OP-RES, modeled as OP-RES-owned artifacts with FK references outward, never new copies of supplier, pen-test, or incident masters. This is independent of q1; deferring (c) only buys deciding it once across the neighbors.

a3:

---

q4: Inbound handoff 252 (from GRC) currently rides a defective trigger that points at the wrong payload. Should it be repointed onto a correct trigger once GRC supplies one? (yes/no)

Recommended: yes, but it cannot be applied yet: GRC owes the valid replacement trigger first (and a canonical owner for the payload). Repointing re-attributes a trigger event, so it is a destructive change that needs your sign-off before it is applied.

a4:

---

## Optional (will not hold up the build)

q5: If you promote in q1, should I research and add the deeper resilience data set the flagship vendors carry (important business services, impact tolerances, service dependency maps, resilience scenarios, tests, incidents, remediation actions, plus the DORA and NIS2 reporting records)? (yes/no)

Recommended: yes, but additive and gated on the q1 promote decision; each candidate still wants a vendor-research vetting pass first.

a5:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B1B-S5 q5=B3-IBS+B3-IT+B3-SDM+B3-RS+B3-RT+B3-RI+B3-RRA+B3-ICT3PR+B3-DMIR+B3-DTLPT+B3-NSIR | domain_id=18 -->
