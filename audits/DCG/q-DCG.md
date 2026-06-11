# Data Catalog and Governance (DCG): questions waiting for you

## What this domain is
Find, trust, and govern every data asset across the enterprise from one place. Crawl and catalog data sources, trace lineage end to end, run a shared business glossary, classify and certify assets, route data-access requests through policy, and publish governed data products. This is the metadata-and-governance layer that sits over the data estate so people can discover the right data and use it within the rules.

> DCG was fully built on 2026-06-11 from your answers (6 modules, all 10 capabilities, all 4 pattern flags). Everything landed at `record_status='new'` for your review in the records. The questions below are the few things the build deliberately left for you, none of which block the domain from being structurally complete.

---

q1: One existing trigger event looks mis-pointed. The handoff where DCG pushes an access-policy update to the data platform (handoff 158) fires on an event called `access_policy.updated`, but that event is attached to `lakehouse_tables` (a data-platform entity) instead of DCG's own `data_access_policies`. Should I re-point the event to `data_access_policies`? (yes/no)

Recommended: yes. The event name and the fact that DCG is the publisher both say the real subject is the access policy, not the lakehouse table. The lakehouse table is what the policy applies to, which is fine as the handoff payload, but the event itself should hang off the policy. I left it untouched because re-pointing an existing shared event's link is an overwrite (it could affect anything else subscribing to that event), so it needs your nod.

a1:

---

q2: Three cross-domain handoff descriptions still carry wording that reads like vendor-landscape narration (Rule #18). How should they be reworded?

- a) Approve the per-row drafts: handoff 158 replace "...The platform's native RBAC layer needs to enforce it" with "When an access policy is updated in DCG, the data platform's access-control layer must enforce it"; handoff 223 replace "Data Catalog and Governance platforms maintain business glossaries that semantically overlap with KGP ontologies" with "DCG business glossaries semantically overlap with KGP ontologies"; handoff 265 replace "KGP (Knowledge Graph Platform)" with "KGP".
- b) Supply your own per-row text.
- c) Leave as-is.

Recommended: a. The drafts strip the generic-platform narration while keeping the meaning; DCG and KGP are domain codes and stay. This is an overwrite of existing description text, so it needs your sign-off.

a2:

---

q3: Which regulations should be tagged onto DCG? (Not part of the build's scope, so left for you.)

- a) All nine: GDPR Article 30, CCPA / CPRA, HIPAA, SOX ICFR, BCBS 239, GLBA, EU AI Act, SR 11-7, US state-level privacy laws.
- b) A subset (specify).
- c) None for now.
- d) Defer.

Recommended: a. Each is a statutory anchor visible on flagship DCG compliance surfaces (Collibra Privacy & AI Governance, Informatica AXON, Microsoft Purview Compliance Manager), and they map onto DCG's existing masters (classifications, access policies, certifications, the records-of-processing view over assets) rather than new entities. Pick (b) to scope to the regimes you actually operate under. Independent of every other question.

a3:

---

## Optional (will not hold up anything)

q4: Run the B9d handoff-payload realization pass on DCG (classify every handoff payload both directions, re-point or flag mis-tagged process links)? It was outside the build scope. (yes/no)

Recommended: yes, as a follow-up audit pass. It is mechanical and additive; it does not change the build.

a4:

---

q5: Add the discretionary entity candidates that hold up on a vendor check (data_contracts, data_access_requests, data_marketplace_listings, data_impact_analyses, metadata_collection_jobs, data_sensitivity_labels, lineage_pipelines)? They now have modules to land in. (yes/no)

Recommended: yes, but as a separate additive pass. Several sit at Core/Common across the flagship catalogs. data_contracts may instead become its own domain (see q6).

a5:

---

q6: Queue two adjacent point-solution markets as new domain candidates: Data Observability (Monte Carlo, Acceldata, Bigeye, Anomalo, Soda) and Data Contracts (Gable.ai, Datacontract.com, Confluent SR, Buf SR)? (yes/no)

Recommended: yes. Both are recognized pure-play markets adjacent to DCG; promoting Data Contracts would reshape the Data Products module.

a6:

---

<!-- agent map, ignore: q1=B2-TRIGGER-FIX q2=B2-S3 q3=B2-S6 q4=B1A-B9D-VERIFY q5=B3-ENTITIES q6=B3-CANDIDATE-DOMAINS | domain_id=88 | built=2026-06-11 | phase0=.tmp_deploy/DCG-phase0-2026-06-08.md -->
