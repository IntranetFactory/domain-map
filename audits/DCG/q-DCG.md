# Data Catalog and Governance (DCG): questions waiting for you

## What this domain is
Find, trust, and govern every data asset across the enterprise from one place. Crawl and catalog data sources, trace lineage end to end, run a shared business glossary, classify and certify assets, route data-access requests through policy, and publish governed data products. This is the metadata-and-governance layer that sits over the data estate so people can discover the right data and use it within the rules.

---

q1: (answer this first) How should Data Catalog and Governance be split into modules (the sub-areas of the product)?

- a) Six modules: Catalog (asset discovery, search, browse), Lineage (lineage extraction, impact analysis), Glossary (business glossary, ontology authoring), Stewardship (steward assignment, certification, escalation), Access Governance (classification, access policy, access requests), Data Products (data product publishing, metric definitions, usage metrics).
- b) Three modules: Core (catalog, lineage, glossary), Governance (stewardship, access governance), Data Products standalone.
- c) Four modules: same as (b) but keep Data Products separate and fold stewardship into Core.
- d) Seven modules: same as (a) but elevate Classification to its own module (the Collibra and Purview pattern).

Recommended: a. Matches how the flagship catalog platforms (Alation, Atlan, Collibra, Microsoft Purview) present their product, and keeps each area small enough to own cleanly. This choice drives every module, capability, lifecycle, regulation, and per-handoff link below it, so it unlocks the rest of the build. Note: lineage may fold into the catalog as a tab (the Atlan / data.world pattern), and Data Products overlaps an emerging data-contracts market, so weigh those when picking the count.

a1:

---

q2: Which capabilities should Data Catalog and Governance be credited with?

- a) All ten: technical metadata harvesting, business glossary management, data lineage, automated data classification, data stewardship workflow, data quality scorecards, certification workflow, data product publishing, access request and policy authoring, regulatory mapping.
- b) A tighter list of six or seven, mapped one-to-one to the modules (specify which).
- c) A different list altogether (specify).

Recommended: a. The ten candidates all show up across the flagship vendor surfaces and set how this domain compares against its neighbors in the fact sheet and blueprint. Pick (b) if you want a leaner footprint.

a2:

---

q3: Three cross-domain handoff descriptions carry wording that reads like vendor-landscape narration (158 "the platform's native RBAC layer", 223 "Data Catalog and Governance platforms maintain...", 265 "KGP (Knowledge Graph Platform)"). How should they be reworded?

- a) Approve the agent's per-row replacement drafts.
- b) Supply your own per-row text.
- c) Leave as-is and treat it as not a violation (the codes are domain names, the narration is acceptable).

Recommended: a. The wording is load-bearing prose, so the agent cannot rewrite it without your sign-off, but the drafts strip the product-name reading while keeping the meaning.

a3:

---

q4: Is "data domains" reference data (logical scopes like Finance or HR that rarely change), so it can skip lifecycle states? (yes/no)

Recommended: yes. It behaves as author-once reference data, which qualifies for the config-shape exemption.

a4:

---

q5: Is "glossary terms" workflow-bearing (a draft, approve, publish, deprecate cycle), so it should get lifecycle states rather than the config-shape exemption? (yes/no)

Recommended: yes. Most catalogs run glossary terms through an approval and publish cycle, so lifecycle states fit better than treating them as static reference data.

a5:

---

q6: Is "data usage metrics" signal-only output with no workflow, so it can skip lifecycle states? (yes/no)

Recommended: yes. It is emitted telemetry, not a record someone moves through states.

a6:

---

q7: Should data access policies be treated as a lock-and-single-approver record (the author drafts, one named approver signs off, then it is locked)? (yes/no)

Recommended: yes. A data access policy is a textbook submit-lock plus single-approver workflow. This overwrites the current default-false flags, so it needs your confirmation.

a7:

---

q8: Should data stewardship assignments be flagged as containing personal data, since the steward's identity is an employee record? (yes/no)

Recommended: yes. The assigned steward is an identifiable employee, so the personal-data flag applies. This overwrites a current value, so it needs your confirmation.

a8:

---

q9: Should data certifications be treated as a single-approver record (the data owner grants the certification)? (yes/no)

Recommended: yes. A certification is granted by one accountable owner, which is the single-approver shape. This overwrites a current value, so it needs your confirmation.

a9:

---

q10: Should data classifications be treated as a lock-after-approval record (the classification rule is locked once approved)? (yes/no)

Recommended: yes. A classification rule should freeze once approved so it cannot be quietly changed. This overwrites a current value, so it needs your confirmation.

a10:

---

q11: Which regulations should be tagged onto Data Catalog and Governance?

- a) All nine: GDPR Article 30, CCPA / CPRA, HIPAA, SOX ICFR, BCBS 239, GLBA, EU AI Act, SR 11-7, and US state-level privacy laws.
- b) A subset (specify).
- c) None for now.
- d) Defer to a later Phase 0 research pass.

Recommended: a. Each is a statutory anchor visible on the flagship vendor compliance surfaces and sets which sub-markets of governance you formally model. Pick (b) to scope it to the regimes you actually operate under. This call is independent of every other question.

a11:

---

## Optional (will not hold up the build)

q12: Ten extra entity candidates show up across the flagship catalog vendors (data contracts, DCG-scoped data quality rules, data access requests, data marketplace listings, lineage pipelines, query lineage records, data impact analyses, metadata collection jobs, data sensitivity labels, data collaboration threads). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules exist. Several are common across the vendor set; routing each depends on the module split in q1.

a12:

---

q13: Should I queue two adjacent point-solution markets as new domain candidates: Data Observability (Monte Carlo, Acceldata, Bigeye, Anomalo, Soda) and Data Contracts (Gable.ai, Datacontract.com, Confluent Schema Registry, Buf Schema Registry)? (yes/no)

Recommended: yes. Both are recognized vendor markets adjacent to this domain; queuing them is a non-blocking idea, and promoting Data Contracts would reshape the Data Products module in q1.

a13:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3 q4=B2-S4.datadomains q5=B2-S4.glossaryterms q6=B2-S4.datausagemetrics q7=B2-S5.accesspolicies q8=B2-S5.stewardship q9=B2-S5.certifications q10=B2-S5.classifications q11=B2-S6 q12=B3-ENTITIES q13=B3-CANDIDATE-DOMAINS | domain_id=88 -->
