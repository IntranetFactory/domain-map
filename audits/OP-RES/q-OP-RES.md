# Operational Resilience (OP-RES): questions waiting for you

## What this domain is
Keep the services your clients and the market depend on running through severe disruption, and prove it to regulators.

Map your important business services, set how much disruption each one can tolerate, and trace what each service depends on across people, processes, technology, and third parties. Run severe-but-plausible scenario tests against those tolerances, capture resilience incidents and the remediation they trigger, and produce the reporting that statutory frameworks like DORA and NIS2 demand.

---

q1: (answer this first) How should Operational Resilience be set up: stay a lean leadership-tier landing surface, or be promoted to own its own data?

- a) Keep it leadership-tier: build one landing module only, read the underlying data from GRC, BCM, ITSM, and Security, and treat the regulator artifacts as derived views.
- b) Promote it to master-bearing: build a Mapping module (important business services, impact tolerances, service dependency maps) and a Testing-and-Incident module (resilience scenarios, tests, incidents, remediation actions), and let it own that data.
- c) Hybrid: build the thin landing surface now and defer the data-owning modules to a later research-driven load, aligned with the parallel Business Continuity decision.

Recommended: c. The classification is settled as master-bearing, so it does need a real build, but a thin landing surface now plus a later data load avoids resolving the resilience-versus-continuity overlap prematurely; best decided jointly with the Business Continuity equivalent. This choice gates every module, the skill placement, the consumer data links, and all the optional items below, so it unlocks the rest of the build.

a1:

---

q2: Where should the regulator-facing register of important business services live?

- a) Operational Resilience owns it as its own thing, separate from the operational service list in your CMDB, with regulator-facing fields (tolerance, criticality, regulator mapping).
- b) Operational Resilience reuses the CMDB service list and just adds a per-service regulator overlay on top.
- c) A shared register hosted jointly by Operational Resilience, CMDB, and the Service Catalog.

Recommended: a, but only if you promote in q1. Pure-play resilience vendors master this register themselves; option (a) only applies if Operational Resilience owns data at all, so this depends on q1.

a2:

---

q3: Where should the DORA and NIS2 reporting substrate (ICT third-party register, threat-led pen-test artifacts, major-incident and significant-incident reports) live across Operational Resilience, Business Continuity, Third-Party Risk, and Security?

- a) Split it by artifact, each domain owning its own slice.
- b) Build one shared DORA-compliance area hosted jointly by all four domains.
- c) Defer until the Business Continuity and Third-Party Risk audits land, so the split is decided once.

Recommended: c. The same question is open on the neighboring domains; deciding it once across all of them avoids a split you would have to redo. This is independent of q1.

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
