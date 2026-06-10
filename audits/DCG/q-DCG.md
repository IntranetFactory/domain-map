# Data Catalog and Governance (DCG): questions waiting for you

## What this domain is
Find, trust, and govern every data asset across the enterprise from one place. Crawl and catalog data sources, trace lineage end to end, run a shared business glossary, classify and certify assets, route data-access requests through policy, and publish governed data products. This is the metadata-and-governance layer that sits over the data estate so people can discover the right data and use it within the rules.

> Grounding: these recommendations are backed by a fresh vendor-surface study (Collibra, Atlan, Microsoft Purview, Informatica CDGC, Databricks Unity Catalog, data.world, plus Immuta as a boundary reference; 2025-2026 product docs) saved at `.tmp_deploy/DCG-phase0-2026-06-08.md`. Two framing signals: the leaders package this market very differently (Collibra sells named separate products: Catalog, Lineage, Glossary, Stewardship, Marketplace, Privacy; Atlan and Databricks present one active-metadata core with lineage as a view), and the access-governance boundary is real (Atlan authors access in its catalog but provisions enforcement through Immuta; Databricks enforces natively; pure-play data-access governance is a distinct market). One recommendation is REVERSED by the fresh evidence (see q1).

---

q1: (answer this first) How should Data Catalog and Governance be split into modules (the sub-areas of the product)?

- a) Six modules: Catalog (asset discovery, search, browse, crawler jobs), Lineage (lineage edges, impact analysis, query lineage), Glossary (business glossary, ontology authoring), Stewardship (steward assignment, certification, escalation), Access Governance (classification, sensitivity labels, access policy, access requests), Data Products (data product publishing, marketplace listings, metric definitions, usage metrics).

- b) Five modules: same as (a) but fold Lineage into Catalog (lineage as a tab on the asset, the Atlan / Databricks / data.world packaging).

- c) Three modules: Core (catalog, lineage, glossary), Governance (stewardship, access governance), Data Products standalone (the Databricks lakehouse-tight shape).

- d) Seven modules: same as (a) but elevate Classification to its own module.

Recommended: a, with (b) a close second. The six-module shape matches Collibra, which sells Data Catalog, Data Lineage, Business Glossary, Stewardship, and Data Marketplace as named separate products on one platform; it keeps each surface small enough to own cleanly. Pick (b) if you want the Atlan / Databricks Unity Catalog / data.world posture, where lineage is an integrated view on the asset rather than a separate workflow product (data.world's Eureka Explorer and Atlan's asset-level lineage both present it this way); the trade-off is purely editorial (lineage as tab vs product). Pick (c) only if DCG is meant to ship alongside a lakehouse stack as a tight governance layer (Unity Catalog packages all of this as one layer beneath the lakehouse with no sub-product split). REVERSED: option (d), elevating Classification to its own module, was presented as co-equal in the prior version; the fresh evidence demotes it to the weakest option. Microsoft Purview, Databricks Unity Catalog, and Atlan all FUSE classification with access governance (Purview drives access policies off the same glossary-term/classification linkage; Databricks fuses classification governed-tags with ABAC enforcement); only Collibra treats classification as semi-distinct, and even there it sits inside the catalog/governance continuum, not as a standalone buyable surface. So classification belongs INSIDE Access Governance, not as its own module. This choice gates every module, capability, lifecycle, regulation, and per-handoff link below it.

a1:

---

q2: Which capabilities should Data Catalog and Governance be credited with?

- a) All ten: technical metadata harvesting, business glossary management, data lineage, automated data classification, data stewardship workflow, data quality scorecards, certification workflow, data product publishing, access request and policy authoring, regulatory mapping.

- b) A tighter list of six or seven, mapped one-to-one to the modules (specify which).

- c) A different list altogether (specify).

Recommended: a. All ten show up across the flagship surfaces: technical metadata harvesting (Purview Data Map scans, Informatica Metadata Command Center, Atlan active metadata), business glossary (Collibra/Atlan/Informatica/Purview all first-class), lineage (column-level in all six), automated classification (Purview auto-classify, Databricks governed tags), stewardship (steward/owner roles in all six), certification (Collibra/Atlan/Informatica certifications, Databricks certified-tag Beta 2025), data product publishing (data product is a master in all six), access request and policy authoring (Collibra/Purview/Informatica policy, Atlan request-via-Immuta), and regulatory mapping (Collibra Privacy/AI Governance, Informatica AXON, Purview Compliance Manager). Data quality scorecards is the one credited-here-but-mastered-elsewhere capability (the DQ engine lives in the DQ domain; catalogs surface the rule/score in-context, as Alation/Atlan/Collibra all do), so it stays as a DCG capability realized largely through consumption. Pick (b) if you want a leaner footprint mapped one-to-one to whatever module count you choose in q1.

a2:

---

q3: Three cross-domain handoff descriptions carry wording that reads like vendor-landscape narration. How should they be reworded?

- a) Approve the agent's per-row replacement drafts: handoff 158 replace "An enterprise governance tool updates an access policy ... The platform's native RBAC layer needs to enforce it" with "When an access policy is updated in DCG, the data platform's access-control layer must enforce it"; handoff 223 replace "Data Catalog and Governance platforms maintain business glossaries that semantically overlap with KGP ontologies" with "DCG business glossaries semantically overlap with KGP ontologies"; handoff 265 replace "KGP (Knowledge Graph Platform)" with "KGP".

- b) Supply your own per-row text.

- c) Leave as-is and treat it as not a violation (the codes are domain names, the narration is acceptable).

Recommended: a. The wording is load-bearing prose, so the agent cannot rewrite it without your sign-off. The drafts strip the generic-platform narration (Rule #18 bars vendor-landscape prose, including anonymized "an enterprise governance tool" / "platforms maintain" variants) while keeping the meaning. DCG and KGP are domain codes and stay; only the "(Knowledge Graph Platform)" gloss and the generic-tool/platform phrasing are the problem.

a3:

---

q4: Is "data domains" reference data (logical scopes like Finance or HR that rarely change), so it can skip lifecycle states? (yes/no)

Recommended: yes. Across the flagship vendors, business domains are author-once organizational scopes ("Finance", "HR") that frame the catalog rather than move through a workflow (Atlan and Purview both treat business domains as the structuring scope you assign assets and products into, not a record with states). It behaves as reference data, which qualifies for the config-shape exemption.

a4:

---

q5: Is "glossary terms" workflow-bearing (a draft, approve, publish, deprecate cycle), so it should get lifecycle states rather than the config-shape exemption? (yes/no)

Recommended: yes. Collibra, Atlan, Informatica AXON, and Purview all run glossary terms through an explicit approval-and-publish workflow (propose, steward review, publish, deprecate), with the term-to-asset linkage going live only on publish. Databricks is the lone weak case (governed tags, no approval cycle), but four of six vendors model the cycle, so lifecycle states fit better than treating terms as static reference data.

a5:

---

q6: Is "data usage metrics" signal-only output with no workflow, so it can skip lifecycle states? (yes/no)

Recommended: yes. Every vendor surfaces usage/popularity as emitted telemetry (Atlan usage signals, Collibra usage analytics, data.world usage) that drives ranking and trust scoring, not as a record someone moves through states. It is signal, so it qualifies for the config-shape exemption.

a6:

---

q7: Should data access policies be treated as a lock-and-single-approver record (the author drafts, one named approver signs off, then it is locked)? (yes/no)

Recommended: yes. A data access policy is the textbook submit-lock plus single-approver workflow: across Collibra, Purview, and Informatica AXON the policy is authored, signed off by one accountable governor, then enforced and locked against quiet edits. Purview ties access policies to domain/product/glossary-term scope with required approvals; Immuta's access workflow centers on a single-click governor approval. This overwrites the current default-false flags, so it needs your confirmation.

a7:

---

q8: Should data stewardship assignments be flagged as containing personal data, since the steward's identity is an employee record? (yes/no)

Recommended: yes. In every flagship catalog the steward/owner is a named, identifiable person (Collibra steward roles, Atlan owners, Purview data stewards, Informatica AXON stakeholders), so the assignment record carries employee personal data. The personal-data flag applies. This overwrites a current value, so it needs your confirmation.

a8:

---

q9: Should data certifications be treated as a single-approver record (the data owner grants the certification)? (yes/no)

Recommended: yes. Certification is single-approver by construction across the vendors: one accountable data owner/steward certifies an asset (Collibra/Atlan/Informatica certifications, Databricks certified-tag). It is the "one accountable owner signs off" shape. This overwrites a current value, so it needs your confirmation.

a9:

---

q10: Should data classifications be treated as a lock-after-approval record (the classification rule is locked once approved)? (yes/no)

Recommended: yes. Collibra and Purview model classification as a proposed-to-approved-to-enforced workflow where an auto-classifier proposes, a steward approves, and the approved rule then drives policy. An approved classification rule should freeze so it cannot be quietly changed and silently re-scope access downstream, which is the submit-lock shape. This overwrites a current value, so it needs your confirmation.

a10:

---

q11: Which regulations should be tagged onto Data Catalog and Governance?

- a) All nine: GDPR Article 30, CCPA / CPRA, HIPAA, SOX ICFR, BCBS 239, GLBA, EU AI Act, SR 11-7, and US state-level privacy laws.

- b) A subset (specify).

- c) None for now.

- d) Defer to a later Phase 0 research pass.

Recommended: a. Each is a statutory anchor visible on the flagship vendor compliance surfaces: Collibra Privacy and AI Governance map GDPR Article 30 records-of-processing, EU AI Act training-data provenance, and SR 11-7 model risk; Informatica AXON and Purview Compliance Manager carry the GDPR/CCPA/HIPAA/SOX/GLBA inventory-and-lineage surface; Collibra's banking footprint carries BCBS 239 risk-data aggregation. These map onto DCG's existing masters (classifications, access policies, certifications, and the records-of-processing view over data assets), not new entities. Pick (b) to scope it to the regimes you actually operate under. This call is independent of every other question.

a11:

---

## Optional (will not hold up the build)

q12: Ten extra entity candidates show up across the flagship catalog vendors (data contracts, DCG-scoped data quality rules, data access requests, data marketplace listings, lineage pipelines, query lineage records, data impact analyses, metadata collection jobs, data sensitivity labels, data collaboration threads). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules exist. The Phase 0 surface matrix puts several of these at Core/Common: metadata collection jobs (crawler/scan, 5 of 6 vendors), data access requests (5 of 6, the workflow instance distinct from the policy), data marketplace listings (Collibra/Atlan/Informatica/Snowflake all ship a marketplace), data impact analyses (4 of 6 first-class), and data sensitivity labels (4 of 6, the applied tag vs the classification rule). Data contracts is Specialist (native only in Atlan, emerging in Collibra 2024.11) and is better treated as a candidate domain (see q13). Routing each depends on the module split in q1.

a12:

---

q13: Should I queue two adjacent point-solution markets as new domain candidates: Data Observability (Monte Carlo, Acceldata, Bigeye, Anomalo, Soda) and Data Contracts (Gable.ai, Datacontract.com, Confluent Schema Registry, Buf Schema Registry)? (yes/no)

Recommended: yes. Both are recognized vendor markets adjacent to this domain. Data contracts in particular is a distinct pure-play market (Gable.ai, Datacontract.com, Confluent and Buf Schema Registries enforce schema/quality/SLA contracts) that only Atlan natively folds into the catalog; queuing it is a non-blocking idea, and promoting Data Contracts would reshape the Data Products module in q1. Data observability overlaps both DCG and the DQ domain and competes as its own market (Monte Carlo et al.), so it queues independently.

a13:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3 q4=B2-S4.datadomains q5=B2-S4.glossaryterms q6=B2-S4.datausagemetrics q7=B2-S5.accesspolicies q8=B2-S5.stewardship q9=B2-S5.certifications q10=B2-S5.classifications q11=B2-S6 q12=B3-ENTITIES q13=B3-CANDIDATE-DOMAINS | domain_id=88 | phase0=.tmp_deploy/DCG-phase0-2026-06-08.md | reversed: B2-S1 7-module option (d) demoted from co-equal to weakest (Purview/Databricks/Atlan fuse classification with access governance) -->
