# Business Continuity Management (BCM): questions waiting for you

## What this domain is
Plan, test, and run your response to disruption, so the business keeps operating and recovers fast when something fails. It covers business impact analysis, continuity and recovery planning, exercises and drills, and live crisis response, with the regulatory continuity obligations (ISO 22301, DORA, NIS2) that sit on top. Today the domain is unbuilt: it has no modules, capabilities, or mastered records of its own yet, so the first question below decides the whole shape of the build.

---

q1: (answer this first) Is BCM correctly classified as a leadership-tier domain (no records of its own), or should it become a master-bearing domain that owns continuity records? The catalog has it as leadership-tier, but two pure-play BCM specialists in the vendor mix point at a real point-solution market.

- a) Keep it leadership-tier: author one landing module only, and have it consume records mastered by GRC and ITSM.
- b) Promote it to master-bearing: author a Planning module and an Exercise-and-Crisis module, with their own records (continuity plans, impact analyses, exercises, crisis events, and the rest of the candidate list).
- c) Hybrid: author a thin landing module now, and defer the master-bearing modules to a follow-up vendor-research load.

Recommended: b. The vendor evidence (two flagship pure-play specialists plus suites with first-class BCM modules) meets the point-solution-market test, and the dependency-mapping logic is real algorithmic substance rather than pure derived signals. This choice drives the module count, the capability scope, where the skill lives, the breadth of consumed records, and the entire optional list below, so it unlocks the rest of the build.

a1:

---

q2: How should disaster recovery (DRP) be handled: as part of BCM, or as its own thing? Vendors split here, with some carrying a distinct DRP module and others folding DR into BCM as a recovery-strategy slice. There is no DRP domain in the catalog today.

- a) Keep DR inside BCM as records (disaster recovery plans, recovery strategies) on the Planning module.
- b) Queue DRP as a separate candidate domain.
- c) Defer until the DORA and NIS2 substrate is loaded, which forces an ICT third-party register that sits more naturally in DRP.

Recommended: a. Folding DR into BCM matches the pure-play vendors and keeps recovery planning next to the continuity plans it serves. Note that option (a) is only available if BCM promotes under q1.

a2:

---

q3: Who owns the DORA and NIS2 ICT third-party register? These regulations mandate a register of third-party ICT dependencies, plus continuity reporting and threat-led test artifacts. The register has stronger ownership claims in TPRM (a separate domain).

- a) BCM hosts the register, embedded from TPRM.
- b) BCM consumes it, and the register lives in TPRM.
- c) Author a separate shared DORA-resilience module hosted on both BCM and Operational Resilience.

Recommended: b. The register is fundamentally a third-party-risk artifact, so letting TPRM master it and having BCM consume it avoids duplicate ownership. This question applies whether or not BCM promotes in q1.

a3:

---

q4: One inbound handoff from GRC (a completed compliance assessment feeding BCM) is wired to a defective trigger that keys on risk assessments rather than the compliance-risk records it actually carries. Should the trigger be repointed onto a correct, compliance-risk-keyed trigger once GRC supplies one? (yes/no)

Recommended: yes, but it cannot be applied yet. Re-attributing an existing trigger is a destructive change that needs your sign-off, and it is also waiting on GRC to author the correct trigger and create its own modules first. Recording your intent now lets it land cleanly once GRC is ready.

a4:

---

## Optional (will not hold up the build)

q5: If BCM promotes in q1, twelve candidate record types surface across the flagship BCM vendors (business continuity plans, business impact analyses, business services, dependency maps, recovery strategies, disaster recovery plans, continuity exercises, exercise findings, crisis events, crisis communications, emergency contacts, and the DORA third-party register entries). Should I research and add the ones that hold up against the flagship vendor surfaces? (yes/no)

Recommended: yes, but additive and gated on q1: most are universal across all five flagship vendors, though each still wants a verification pass before loading.

a5:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B1B-S5 q5=B3-BCP+B3-BIA+B3-BSVC+B3-DEPMAP+B3-RECSTRAT+B3-DRP+B3-EXERCISE+B3-EXFINDINGS+B3-CRISIS+B3-CRISCOMM+B3-EMERGCONTACT+B3-DORAREG | domain_id=17 -->
