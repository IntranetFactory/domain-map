# Business Continuity Management (BCM): questions waiting for you

## What this domain is
Know what would hurt most if it stopped, plan the recovery, and prove the plan works before you need it.

Build an organization that keeps running when something goes wrong. Start with a business impact analysis that maps each critical service to the processes, applications, people, and suppliers it depends on, then set the recovery time and recovery point targets that say how fast each one has to come back and how much data you can afford to lose. Turn those targets into continuity and disaster recovery plans with named owners, recovery strategies, and step-by-step runbooks, so the response is written down and approved instead of improvised under pressure.

Keep the plans honest. Schedule tabletop, walkthrough, and full-interruption exercises, capture the gaps and action items each one surfaces, and feed the findings back into the plans so they get stronger with every test. When a real disruption hits, activate the right plan, stand up the response team, work the call tree and mass-notification roster, log every decision and outbound message, and stand down cleanly with an after-action record that improves the next response.

> Grounding: these recommendations are backed by a fresh vendor-surface study (5 flagship BCM vendors plus Everbridge for the mass-notification boundary, 2025-2026 product docs) saved at `.tmp_deploy/BCM-phase0-2026-06-08.md`. The framing signal: this is the ISO 22301 / DORA / NIS2 operational-resilience market, where pure-play specialists (Fusion Framework System, Castellan) and suite vendors (ServiceNow BCM, Archer, MetricStream) all build their schema around the same BIA -> plan -> exercise -> crisis lifecycle. The one boundary to watch is mass notification: Everbridge inverts the stack (critical-event-management is the platform, BCM is the acquired module), while the BCM pure-plays embed emergency notification as a feature, not a separate market.

---

q1: (answer this first) Is BCM correctly classified as a leadership-tier domain (no records of its own), or should it become a master-bearing domain that owns continuity records? The catalog has it as leadership-tier, but the vendor mix points at a real point-solution market.

- a) Keep it leadership-tier: author one landing module only, and have it consume records mastered by GRC and ITSM.
- b) Promote it to master-bearing: author a Planning module and an Exercise-and-Crisis module, with their own records (continuity plans, impact analyses, exercises, crisis events, and the rest of the candidate list).
- c) Hybrid: author a thin landing module now, and defer the master-bearing modules to a follow-up vendor-research load.

Recommended: b. The vendor surface meets the Rule #2 point-solution-market test cleanly: two flagship pure-plays (Fusion Framework System, Castellan) and three suites (ServiceNow BCM, Archer Resilience Management, MetricStream BCM) each master first-class BCM records, not derived signals. Every one of the five builds the same object set: Fusion houses BIAs in its Business Function tab and masters dependency maps, recovery strategies, plan exercises, and crisis/incident records; Castellan ships integrated BIA, risk assessment, plan development, testing/exercising, and crisis management end to end; ServiceNow runs a Draft/In Review/Approved lifecycle across BIA, continuity plans, recovery exercises, and crisis events; Archer's "Business Continuity & IT Disaster Recovery Planning" use case masters BIAs, BC and DR plans, and crisis events; MetricStream masters BIA surveys with cumulative criticality scoring, template-driven continuity plans, and crisis/incident workflow. The dependency-mapping logic (service to app to infrastructure, driving recovery sequencing) is real algorithmic substance, not pure derived signal. This choice drives the module count, the capability scope, where the skill lives, the breadth of consumed records, and the entire optional list below, so it unlocks the rest of the build.

a1:

---

q2: How should disaster recovery (DRP) be handled: as part of BCM, or as its own thing? There is no DRP domain in the catalog today.

- a) Keep DR inside BCM as records (disaster recovery plans, recovery strategies) on the Planning module.
- b) Queue DRP as a separate candidate domain.
- c) Defer until the DORA and NIS2 substrate is loaded, which forces an ICT third-party register that sits more naturally in DRP.

Recommended: a. The fresh vendor check shows no flagship sells DRP as a market independent of BCM: Fusion folds IT disaster recovery into its resilience platform as an integrated component ("response plans for ITDR integrated within broader resilience frameworks, connecting to business continuity management"), Riskonnect (which now owns Castellan) "includes IT disaster recovery as an integrated component of their broader business continuity management system, rather than as a completely separate standalone module," and ServiceNow does not distinguish a separate DR plan object from the continuity plan at all. Archer is the only one that keeps distinct BC-plan and DR-plan TYPES, but still under a single "Business Continuity & IT Disaster Recovery Planning" use case, not a separate product. So DR belongs inside BCM as `disaster_recovery_plans` plus `recovery_strategies` on the Planning module, next to the continuity plans they serve. Note that option (a) is only available if BCM promotes under q1.

a2:

---

q3: Who owns the DORA and NIS2 ICT third-party register? These regulations mandate a register of third-party ICT dependencies, plus continuity reporting and threat-led test artifacts. The register has stronger ownership claims in TPRM (a separate domain).

- a) BCM hosts the register, embedded from TPRM.
- b) BCM consumes it, and the register lives in TPRM.
- c) Author a separate shared DORA-resilience module hosted on both BCM and Operational Resilience.

Recommended: b. The leading DORA vendor routes the register through third-party risk, not continuity: Fusion explicitly handles the DORA Register of Information through its TPRM offering ("Fusion ... has a robust TPRM offering that allows organizations to monitor ... ICT third-party vendors across the entire lifecycle"), and the register is fundamentally a record of contractual arrangements with ICT third-party service providers, which is a third-party-risk artifact by construction. Letting TPRM master it and having BCM consume it for continuity-exposure purposes avoids duplicate ownership of a regulator-facing register. A separate shared module (c) is not justified by the BCM vendor surface: none of the five flagship BCM products carves DORA out as its own marketed module; continuity reporting folds into the Planning surface. This question applies whether or not BCM promotes in q1.

a3:

---

q4: One inbound handoff from GRC (a completed compliance assessment feeding BCM) is wired to a defective trigger that keys on risk assessments rather than the compliance-risk records it actually carries. Should the trigger be repointed onto a correct, compliance-risk-keyed trigger once GRC supplies one? (yes/no)

Recommended: yes, but it cannot be applied yet. Re-attributing an existing trigger is a destructive change that needs your sign-off, and it is also waiting on GRC to author the correct trigger and create its own modules first. Recording your intent now lets it land cleanly once GRC is ready. This is a workflow-wiring fix, not a market-shape call, so it does not depend on the q1 outcome.

a4:

---

## Optional (will not hold up the build)

q5: If BCM promotes in q1, twelve candidate record types surface across the flagship BCM vendors (business continuity plans, business impact analyses, business services, dependency maps, recovery strategies, disaster recovery plans, continuity exercises, exercise findings, crisis events, crisis communications, emergency contacts, and the DORA third-party register entries). Should I add the ones that hold up against the flagship vendor surfaces? (yes/no)

Recommended: yes, but additive and gated on q1. The Phase 0 surface matrix already verified these against the five flagship vendors: eight are Core (present as first-class masters in 3+ vendors): business_impact_analyses, business_continuity_plans, disaster_recovery_plans, recovery_strategies, business_services, dependency_maps, continuity_exercises, and crisis_events all show up across Fusion, Castellan, ServiceNow, Archer, and MetricStream. Three more are Core but vendor-named differently (exercise_findings, crisis_communications, emergency_contacts: every vendor has the concept, e.g. MetricStream call trees plus 25+ channel notification, Castellan emergency notification). business_services lands as embedded_master from CMDB (ServiceNow pulls it straight from the CMDB), and emergency_contacts as embedded_master from users. The DORA register entries are the one that does NOT belong here: per q3 they master in TPRM, so BCM would consume them rather than own a master. Each survivor still wants a verification pass against current field-level docs before loading.

a5:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B1B-S5 q5=B3-BCP+B3-BIA+B3-BSVC+B3-DEPMAP+B3-RECSTRAT+B3-DRP+B3-EXERCISE+B3-EXFINDINGS+B3-CRISIS+B3-CRISCOMM+B3-EMERGCONTACT+B3-DORAREG | domain_id=17 | phase0=.tmp_deploy/BCM-phase0-2026-06-08.md -->
