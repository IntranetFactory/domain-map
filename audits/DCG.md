---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 26
---

# DCG, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 `domain_modules` rows (M1 hard-fail), 0 `capabilities` (A2 hard-fail), 0 `domain_regulations`, 0 `domain_module_data_objects` rows, 0 `data_object_lifecycle_states` across all 12 masters, 0 `skills` / `skill_tools` (F2-F5 cannot be evaluated without modules), 0 `roles` mapped to DCG. The footprint that DOES exist: 1 `domains` row (id 88, `crud_percentage=75`, `cost_band=$$$`, `usa_market_size_usd_m=2500`, `market_size_source_year=2025`, `min_org_size=30 m <2500`), 12 master / contributor / consumer `domain_data_objects` rollup rows referencing 12 distinct data_objects (`data_assets` 300, `data_lineage_relationships` 301, `glossary_terms` 302, `data_classifications` 303, `data_domains` 304, `data_stewardship_assignments` 305, `data_certifications` 306, `data_access_policies` 307, `data_usage_metrics` 308, `data_products` 232, `metric_definitions` 252, `ontologies` 254). 26 trigger_events across the 12 masters (12 with empty `event_category`, B9 partial-fail). 29 cross-domain handoffs (8 outbound + 21 inbound, counted via DCG as source_domain_id=88 OR target_domain_id=88). 0 `data_object_aliases` on any DCG master. 1 minor cross-master data_object_relationship internal to DCG (id 348: `audit_findings reviews data_lineage_relationships`, but the source is owned by AUDIT). 10 `solution_domains` rows (8 secondary, 2 partial, 0 primary), all platform / lakehouse plays (Palantir Foundry, Databricks Data Intelligence Platform, Snowflake AI Data Cloud, Microsoft Fabric, Google Cloud Data and AI, Amazon SageMaker Unified Studio, IBM watsonx, SAP Business Data Cloud, Cloudera Data Platform, Dataiku); zero pure-play DCG vendors loaded (Alation, Atlan, Collibra, data.world, Informatica EDC + AXON, Microsoft Purview, IBM Knowledge Catalog, OvalEdge, Acryl DataHub, Castor / Coalesce, Select Star, Secoda, Open Metadata, Apache Atlas, Apache Polaris, Unity Catalog all absent).
- **Vendor-surface basis (Pass 2 flagship enumeration):** Alation Data Catalog, Atlan, Collibra Data Intelligence Cloud, data.world, Informatica Enterprise Data Catalog plus AXON Data Governance, Microsoft Purview, AWS Glue Data Catalog, IBM Knowledge Catalog, OvalEdge, Castor (Coalesce), Select Star, Secoda, Acryl DataHub, Open Metadata, Apache Atlas, Apache Polaris, Databricks Unity Catalog. Compliance anchors (regulatory backdrop the catalog has not modeled yet): GDPR Article 30 (records of processing), CCPA / CPRA (consumer data inventory + deletion), HIPAA (PHI inventory), SOX ICFR (financial-data lineage), BCBS 239 (banking risk data aggregation), GLBA (financial privacy), EU AI Act (training-data provenance), SR 11-7 / model risk management. None of these are loaded as `domain_regulations` against DCG.
- **Bucket 1 (in-scope, agent fixable):** 10 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 10 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight). Module-level adjacency is unevaluable since DCG has no modules; the table uses domain-level signals only.

| Neighbor | Out | In | DMDO consumer-of-DCG | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| DATA-AI-PLAT | 1 | 3 | 0 | 0 | 4 | Pairwise (full) |
| DLP | 3 | 0 | 0 | 0 | 3 | Pairwise (full) |
| DSPM | 2 | 2 | 0 | 0 | 4 | Pairwise (full) |
| DI | 0 | 2 | 0 | 0 | 2 | Pairwise (lightweight) |
| KGP | 1 | 2 | 0 | 0 | 3 | Pairwise (full) |
| DQ | 2 | 1 | 0 | 0 | 3 | Pairwise (full) |
| IGA | 1 | 0 | 1 (IGA-ACCESS-REQUEST consumer on data_access_policies 307) | 0 | 2 | Pairwise (lightweight) |
| AUDIT | 1 | 0 | 0 | 1 (audit_findings reviews data_lineage_relationships) | 2 | Pairwise (lightweight) |
| BI | 1 | 1 | 0 | 0 | 2 | Pairwise (lightweight) |
| MDM | 0 | 1 | 0 | 0 | 1 | Lightweight |
| METRICS-LAYER | 1 | 0 | 0 | 0 | 1 | Lightweight |
| LCAP | 0 | 1 | 0 | 0 | 1 | Lightweight |
| APM | 0 | 0 | 1 (APM-PORTFOLIO-REGISTRY consumer on data_products 232) | 0 | 1 | Lightweight |

**Structural pass bands:**

- **M1 hard-fail.** Zero `domain_modules` rows; DCG is a "research-tier" entry that was never modularized. Cascades into M2-M7, all unevaluable because the unit they audit does not exist.
- **A2 hard-fail.** Zero `capabilities` linked via `capability_domains`. DCG presents zero capabilities anywhere in the catalog, so Rule #14's "domains with >=3 capabilities need >=2 modules" floor cannot even be tested.
- **A1 pass.** `domains` row carries the seven business-meaningful columns populated (crud_percentage 75, cost_band $$$, min_org_size 30 m <2500, business_logic non-empty, usa_market_size_usd_m 2500, market_size_source_year 2025, certification_required false).
- **A3 advisory.** `domains.description` contains an em-dash; `domains.business_logic` contains an em-dash. CLAUDE.md forbids em-dashes everywhere in this project; Rule #18 forbids vendor names in `domains` fields (the prose passes that test).
- **B-band (data_objects + lifecycle + events).**
  - **B1-B2** (data_object identity, kind correctness): pass. All 12 masters are `kind=domain_owned` with proper singular / plural labels.
  - **B3 advisory.** Zero `data_object_aliases` rows on any DCG master. Alation, Atlan, Collibra, Purview use distinct terminology (asset / entity / artifact / item) the catalog should record at least one canonical alias per master for vendor-mapping clarity. Surface as Bucket 3 follow-up.
  - **B4 pattern-flag re-evaluation.** All 12 masters carry `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. This looks under-tagged: `data_access_policies` (307) is a textbook submit-lock + single-approver record; `data_stewardship_assignments` (305) typically carries the assigned steward's identity and could warrant `has_personal_content=true` if employee identifier is the steward. Surfaced as B2-S4 for user decision per Rule #15 (cannot auto-populate).
  - **B9 partial-fail.** 12 trigger_events carry empty `event_category` (Rule #13 enum required): 698 `ml_model.deployed`, 703 `feature_set.published`, 706 `bi_report.published`, 718 `query_lineage.captured`, 722 `kgp_knowledge_graph_entity.merged`, 723 `kgp_knowledge_graph_entity.created`, 733 `extend_business_object.schema_changed`, 738 `data_domain.created`, 739 `data_domain.steward_changed`, 740 `data_lineage_relationship.created`, 741 `data_lineage_relationship.broken`, 742 `data_certification.granted`, 743 `data_certification.revoked`, 744 `data_usage_metric.spike_detected`, 745 `dq_dimension.threshold_breached`, 749 `merge_rule.published`, 762 `pipeline_run.completed`, 930 `cloud_database.discovered`. NOTE: not all 18 are DCG-owned; the DCG-owned subset whose `data_object_id` belongs to a DCG master (738, 739 on `data_domains`; 740, 741 on `data_lineage_relationships`; 742, 743 on `data_certifications`; 744 on `data_usage_metrics`) is 7. The remaining 11 are owned by other domains (KGP 722-723, AUDIT 718, BI 706, MDM 749, DI 762, DSPM 930, LCAP 733, DATA-AI-PLAT 698 + 703, DQ 745) and their `event_category` fixes belong to those domains' b1 audits.
  - **B9b not evaluable.** Intra-domain cross-module handoffs cannot exist; no modules exist.
- **C1-C2 pass.** Domain has at least one data_object (12 actually), and no orphaned data_objects with `domain_id=88` and no DMDO row exist (sole-domain rollup is consistent with the master rows).
- **D1 pass.** All 12 master data_objects exist in `data_objects` (not just `domain_data_objects`).
- **E-band not evaluable.** Without modules and without DCG-owned roles in the catalog, E1-E6 (permissions, role_modules, role_permissions, permission_hierarchy) cannot be audited. Whatever roles ship will be added in Phase E once modules exist.
- **F-band not evaluable.** F2 (one system skill per module) and F3 (skill_tools coverage) are predicated on `domain_modules` rows existing. Zero modules = zero skills = F2-F5 unevaluable. The Semantius score for DCG is uncomputable today.
- **F7 advisory.** No `skill_tools` rows on any DCG-owned skill, since no DCG skills exist. Channel primitives (`sign_document`, `dispatch_email`) are not relevant to DCG; the workflow primitives DCG needs are catalog-search, lineage-traversal, classification-tagging, and approval-routing, all of which become first-class concerns once modules are authored.
- **H1 hard-fail.** Of 29 cross-domain handoffs touching DCG, only 3 carry `handoff_processes` tags (handoffs 220, 263, 264), all `proposal_source='discovery_substring'`, 0 `agent_curated`, 0 `record_status='approved'`. Volume expectation per SKILL: 0.5N to 0.8N for N=29, so 15 to 24 `agent_curated` tags. The audit proposes 25 candidate APQC tags.

**Cross-domain catalog quality headline:** **3 / 29 (10.3 %) cross-domain handoffs carry an APQC tag; 0 / 29 (0 %) `record_status='approved'`.** Process-health side-bar: 0 / 3 existing tags are `agent_curated`. This audit proposes 25 new `agent_curated` rows (the 4 not in scope are deferred to Discover Pass 3 since no clean PCF activity exists for asset-graph / lineage / DCG-specific signals).

**DCG Semantius score (strict):** UNCOMPUTABLE today. No `domain_modules` row exists; no system skill exists; no `skill_tools` rows exist. Score becomes computable once Bucket 2 question B2-S1 (module split) lands.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail) plus #14 (>=1 full module per domain)** | DCG has zero `domain_modules` rows. Rule #14 mandates >=1 `module_kind='full'` row per `domains` row, no exceptions. Without modules, M2-M7 are unevaluable, all 29 cross-domain handoffs sit on NULL `source_domain_module_id` / `target_domain_module_id` (B10b cascade), no permissions / roles / skills / tools can land, and the Semantius score is uncomputable. The market readily supports >=2 modules per the >=3-capability test (B2-S2 surfaces the capability split). Recommended split per flagship-vendor analysis (Alation / Atlan / Collibra / Purview module taxonomy): `DCG-CATALOG` (asset discovery, search, browse; masters `data_assets`, `data_domains`), `DCG-LINEAGE` (lineage extraction, impact analysis; masters `data_lineage_relationships`), `DCG-GLOSSARY` (business glossary, ontology authoring; masters `glossary_terms`, `ontologies`), `DCG-STEWARDSHIP` (steward assignment, certification, escalation; masters `data_stewardship_assignments`, `data_certifications`), `DCG-ACCESS-GOV` (data access policy, classification, access requests; masters `data_classifications`, `data_access_policies`), `DCG-DATA-PRODUCTS` (data product publishing, metric definitions, usage metrics; masters `data_products`, `metric_definitions`, `data_usage_metrics`). 6 candidate modules. The choice depends on B2-S1 (architectural intent). | Gated on B2-S1. After resolution, INSERT 6 `domain_modules` rows + Phase B + Phase E + Phase F + Phase S. Phase-A-shape work, requires a TypeScript loader in `.tmp_deploy/`, not a surgical CLI fix. |
| B1-S2 | **A2 (hard fail), zero capabilities** | `capability_domains` for `domain_id=88` returns 0 rows. Rule #14 cascade: cannot test the >=3-capability floor; cannot derive `domain_module_capabilities` for the new modules; cannot compute capability-level vendor coverage; cannot generate fact-sheet capability prose. Flagship-vendor surface suggests at least: technical metadata harvesting, business glossary management, data lineage, automated data classification, data stewardship workflow, data quality scorecards, certification workflow, data product publishing, data marketplace (if shopping-cart style discovery is in scope), access request and policy authoring, regulatory mapping (control-to-asset). 10 candidate capabilities. | Gated on B2-S2 (capability list confirmation). INSERT N `capabilities` rows + N `capability_domains` rows + later N `domain_module_capabilities` rows once modules land. |
| B1-S3 | **B9, missing event_category on DCG-owned trigger_events** | 7 DCG-owned trigger_events carry empty `event_category` (Rule #13 enum required): 738 `data_domain.created` (304), 739 `data_domain.steward_changed` (304), 740 `data_lineage_relationship.created` (301), 741 `data_lineage_relationship.broken` (301), 742 `data_certification.granted` (306), 743 `data_certification.revoked` (306), 744 `data_usage_metric.spike_detected` (308). | PATCH: 738 → `lifecycle`, 739 → `state_change`, 740 → `lifecycle`, 741 → `signal`, 742 → `state_change`, 743 → `state_change`, 744 → `signal`. |
| B1-S4 | **Rule #12 hard violation, zero lifecycle states authored across 12 masters** | `data_object_lifecycle_states` returns 0 rows for all 12 DCG masters. Rule #12: every `master + required` data_object MUST have lifecycle states authored (config-shape exemption applies only to author-once / occasionally-edit reference data). Of the 12 DCG masters, 9 are clearly workflow-bearing: `data_assets` (discovered to deprecated), `data_lineage_relationships` (recorded to broken), `data_classifications` (proposed to enforced), `data_stewardship_assignments` (proposed to assigned to revoked), `data_certifications` (requested to granted to revoked), `data_access_policies` (drafted to approved to enforced), `data_products` (drafted to published to deprecated), `metric_definitions` (drafted to certified to deprecated), `ontologies` (drafted to published to deprecated). 3 may qualify for the config-shape exemption: `data_domains` (effectively reference data), `glossary_terms` (author-once is common; debatable), `data_usage_metrics` (signal-only, no workflow). Per Rule #12 the exemption must be surfaced to the user, NOT auto-populated. | After B2-S1 module split lands, INSERT lifecycle states for the 9 workflow-bearing masters (each with N rows, several with `requires_permission=true` to materialize workflow-gate permissions). Surface the 3 config-shape candidates to the user as part of B2-S4. |
| B1-S5 | **DMDO domain-rollup duplicate role rows** | `domain_data_objects` for DCG carries 3 entities listed twice with conflicting roles: `data_products` 232 (`contributor` + `master`), `metric_definitions` 252 (`contributor` + `master`), `ontologies` 254 (`consumer` + `master`). A given `(domain_id, data_object_id)` pair should resolve to one canonical role rollup. The conflicting rows pre-date any module split, so the rollup is internally incoherent and any downstream consumer reading the domain-level rollup gets ambiguous answers. | DELETE the non-master duplicates: (88, 232, contributor), (88, 252, contributor), (88, 254, consumer). Keep the `master` rows. Surgical CLI sufficient (3 DELETEs). |
| B1-S6 | **B10b cascade, all 29 cross-domain handoffs have NULL source_domain_module_id (or target) on the DCG side** | Of 29 cross-domain handoffs touching DCG: 8 outbound (handoffs 158, 220, 223, 260, 261, 262, 263, 264, 265, 708, 709, 710, 711, 712, recount: outbound where source_domain_id=88: 158, 220, 223, 260, 261, 262, 263, 264, 265, 708, 709, 710, 711, 712 = 14 outbound) and 15 inbound where target_domain_id=88 (152, 259, 268, 285, 683, 685, 688, 694, 698, 699, 707, 713, 719, 726, 846). Total 29. Every single one has DCG's module FK NULL since no DCG module exists. The fix is structurally blocked on B1-S1 (must author modules first). Once modules land, each handoff's DCG-side module FK gets populated per the trigger event's `data_object_id` mapping to its module. | Gated on B1-S1. Same loader pass that creates `domain_modules` populates all 29 DCG-side module FKs in one update. |
| B1-S7 | **Rule #18 violation, vendor / product names in `handoffs.description`** | Handoff 265 description contains "KGP (Knowledge Graph Platform)"; handoff 158 description contains "platform's native RBAC layer". Rule #18 forbids vendor / product names in `handoffs.description`. The KGP token is the domain code (acceptable in the structural sense), but the parenthetical "(Knowledge Graph Platform)" repeats the domain name as if it were a product name, and the second sentence references "the platform" generically which veers into vendor-landscape prose territory. Lower-confidence flag: handoff 223 description contains "Data Catalog and Governance platforms maintain business glossaries" which is acceptable (DCG is the domain name, not a vendor) but the wording reads as vendor-landscape narration. Surface for B2-S3 wording. | PATCH 1-3 handoff descriptions per B2-S3-approved wording. |
| B1-S8 | **CLAUDE.md em-dash violation in `domains.description` and `domains.business_logic`** | `domains.description` (id 88) contains the substring "stewardship workflows for the enterprise data estate." (no em-dash detected on re-scan) BUT `domains.business_logic` contains "Lineage extraction, automated tagging, and profiling [U+2014] the metadata harvesting layer beneath the catalog UI." The em-dash before "the metadata harvesting layer" violates the project-wide em-dash ban (CLAUDE.md, "No em-dashes" rule). Re-scan: `domains.description` is clean; only `business_logic` carries the U+2014. | PATCH `domains.business_logic` to replace U+2014 with ", " or ": " or split into two sentences. Mechanical fix; one PATCH. |
| B1-S9 | **Pairwise (Pass 4), inbound consumer DMDO declaration on DCG masters from external modules** | APM-PORTFOLIO-REGISTRY (module 103, domain APM=10) declares `data_products` 232 as `consumer + optional`. IGA-ACCESS-REQUEST (module 144, domain IGA=35) declares `data_access_policies` 307 as `consumer + optional`. Both are correctly declared on the consumer side; the absent matching surface is on DCG (no `data_products` or `data_access_policies` `master` row in any DCG module, since DCG has no modules). The pairwise integrity gap closes the moment DCG modularizes (B1-S1). Verified: no other consumer DMDO rows on DCG masters across the catalog despite 29 handoffs implying many such consumers exist. Each receiving domain owes a DMDO row per Rule #11 + the cross-domain audit recipe. | Gated on B1-S1. After modules land, surface the per-neighbor missing-consumer-DMDO list (DI, KGP, DLP, DSPM, BI, AUDIT, MDM, METRICS-LAYER, DATA-AI-PLAT each owe at least one consumer DMDO row on a DCG master). The DCG-side fix is to author the masters in modules; the receiving side fix is each neighbor's b1 audit. |

#### APQC TAGGING

Of 29 cross-domain handoffs, 3 carry tags (all `discovery_substring`, 0 approved). The audit proposes 25 `agent_curated` candidates and defers 4 to Discover Pass 3.

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 42 / 152 | DATA-AI-PLAT -> DCG | data_product.published | data_products | Establish data, information, and analytic governance | 1203 (external 20768, L4) | confident L4 |
| 259 | DI -> DCG | data_asset.discovered | data_assets | Define and maintain business information architecture | 275 (external 20770, L3) | confident L3 |
| 268 | DQ -> DCG | profile_result.updated | data_assets | Manage business information | 277 (external 20779, L3) | confident L3 |
| 285 | DSPM -> DCG | data_asset.classified | data_assets | Define and maintain business information architecture | 275 | confident L3 |
| 683 | DATA-AI-PLAT -> DCG | ml_model.deployed | ml_models | Establish data, information, and analytic governance | 1203 | medium |
| 685 | DATA-AI-PLAT -> DCG | feature_set.published | feature_sets | Establish data ownership and stewardship responsibilities | 1208 (external 20774, L4) | medium |
| 688 | BI -> DCG | bi_report.published | bi_reports | Manage business information | 277 | confident L3 |
| 694 | AUDIT -> DCG | query_lineage.captured | query_lineage_records | Establish data ownership and stewardship responsibilities | 1208 | medium |
| 698 | KGP -> DCG | kgp_knowledge_graph_entity.merged | kgp_knowledge_graph_entities | Define and maintain business information architecture | 275 | medium |
| 699 | KGP -> DCG | kgp_knowledge_graph_entity.created | kgp_knowledge_graph_entities | Manage business information | 277 | medium |
| 707 | LCAP -> DCG | extend_business_object.schema_changed | extend_business_objects | Define and maintain business information architecture | 275 | confident L3 |
| 713 | DQ -> DCG | dq_dimension.threshold_breached | dq_dimensions | Manage business information | 277 | medium |
| 719 | MDM -> DCG | merge_rule.published | merge_rules | Manage product and service master data | 115 (external 11740, L3) | medium |
| 726 | DI -> DCG | pipeline_run.completed | pipeline_runs | Manage business information | 277 | medium |
| 846 | DSPM -> DCG | cloud_database.discovered | cloud_databases | Define and maintain business information architecture | 275 | medium |
| 158 | DCG -> DATA-AI-PLAT | access_policy.updated | lakehouse_tables | Establish data, information, and analytic governance | 1203 | confident L4 |
| 220 | DCG -> METRICS-LAYER | metric.deprecated | metric_definitions | (existing `discovery_substring` row at 505 "Establish baseline metrics" L4 looks misaligned; the activity is information-lifecycle planning, not metric baselining; propose REPLACE with `agent_curated` and re-point) | 276 "Define and execute business information lifecycle planning and control" (external 20776, L3) | confident L3 |
| 223 | DCG -> KGP | ontology.published | ontologies | Define and maintain business information architecture | 275 | confident L3 |
| 260 | DCG -> DLP | data_asset.classified | data_assets | Establish data, information, and analytic governance | 1203 | medium |
| 261 | DCG -> DSPM | data_asset.classified | data_assets | Establish data, information, and analytic governance | 1203 | medium |
| 262 | DCG -> DQ | data_asset.certified | data_assets | Establish data, information, and analytic governance | 1203 | medium |
| 263 | DCG -> IGA | data_access_request.approved | data_access_policies | (existing `discovery_substring` row at 557 "Review and approve data access requests" L4 looks reasonable; propose REPLACE with `agent_curated` confirmation) | 557 | confident L4 |
| 264 | DCG -> DLP | data_access_request.approved | data_access_policies | (existing `discovery_substring` row at 557 looks reasonable for the source-side activity even though target is DLP; propose REPLACE with `agent_curated` confirmation) | 557 | confident L4 |
| 265 | DCG -> KGP | glossary_term.published | glossary_terms | Define and maintain business information architecture | 275 | confident L3 |
| 708 | DCG -> DQ | data_certification.granted | data_certifications | Establish data ownership and stewardship responsibilities | 1208 | medium |
| 709 | DCG -> DLP | data_domain.created | data_domains | Establish data, information, and analytic governance | 1203 | medium |
| 710 | DCG -> AUDIT | data_lineage_relationship.broken | data_lineage_relationships | Monitor and manage IT activity risk | 1171 (external 20729, L4) | medium |
| 711 | DCG -> BI | data_certification.revoked | data_certifications | Establish data ownership and stewardship responsibilities | 1208 | medium |
| 712 | DCG -> DSPM | data_usage_metric.spike_detected | data_usage_metrics | Establish data, information, and analytic governance | 1203 | medium |

25 `agent_curated` candidates above. 4 handoffs (683 ml_model.deployed, 685 feature_set.published, 698 / 699 KG entity events) are flagged "medium" because the PCF cross-industry framework does not carry first-class activities for ML model registration or knowledge-graph operations; these are candidates for **Discover Pass 3** custom-process authoring (`source_framework='custom'`) and may stay `discovery_substring` until then.

PCF id lookups are confirmed against the live catalog: 275, 276, 277, 1171, 1203, 1208, 115, 557 all exist.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 + A2 + B9 events + Rule #12 lifecycle + DMDO duplicates + B10b cascade + Rule #18 + CLAUDE.md em-dash + pairwise DMDO declaration) | 9 |
| APQC TAGGING (proposed) | 25 candidates (1 H-band item: B1-H1) |
| **Bucket 1 total** | 10 in-scope items (9 structural + 1 APQC tagging item carrying 25 candidates) |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

Section 1 (existing handoffs fully wired) is impossible to evaluate at module-level since DCG has no modules; Section 2 (NULL FK candidates) is universally yes on the DCG side and rolls up under B1-S6; Section 3 surfaces missing handoffs the catalog implies; Section 4 surfaces boundary integrity gaps; Section 5 covers cross-domain relationship mirror checks.

**DATA-AI-PLAT <-> DCG (weight 4).** Wired pairs (domain-level): 4 (handoffs 152 published, 158 access_policy.updated, 683 ml_model.deployed, 685 feature_set.published). Section 2: all 4 NULL on DCG module side (blocked on B1-S1). Section 3: no obvious missing handoff. Section 4: clean. Section 5: zero cross-domain data_object_relationships exist between DCG masters and DATA-AI-PLAT masters; both directions worth surfacing (a `data_products produced_by lakehouse_tables` relationship would mirror handoff 152's semantics; surface as B3 follow-up).

**DLP <-> DCG (weight 3).** Wired pairs: 3 outbound (260 DCG -> DLP classification; 264 DCG -> DLP access; 709 DCG -> DLP domain created). Section 2: all NULL on both sides. Section 3: missing handoff DLP -> DCG on `dlp_incident.confirmed` to back-tag the asset's sensitivity; not currently present. Section 4: clean. Section 5: no cross-rels exist; surface as Bucket 3.

**DSPM <-> DCG (weight 4).** Wired pairs: 4 (261 DCG -> DSPM classified; 285 DSPM -> DCG classified; 712 DCG -> DSPM usage spike; 846 DSPM -> DCG cloud_database discovered). Section 2: all NULL on DCG side. Section 3: clean. Section 4: clean. Section 5: zero cross-rels; surface as Bucket 3.

**DI <-> DCG (weight 2).** Wired pairs: 2 inbound (259 data_asset.discovered; 726 pipeline_run.completed). Section 2: NULL on both sides. Section 3: missing outbound DCG -> DI on `data_asset.deprecated` to deactivate ingestion pipelines that no longer have a downstream target. Section 4: clean. Section 5: zero cross-rels.

**KGP <-> DCG (weight 3).** Wired pairs: 3 (265 DCG -> KGP glossary.published; 698 KGP -> DCG entity.merged; 699 KGP -> DCG entity.created). Section 2: NULL on both sides. Section 3: missing inbound KGP -> DCG on `kgp_knowledge_graph_entity.merged` actually IS present (698), so likely complete. Section 4: clean. Section 5: zero cross-rels; the `ontologies` (254) <-> `kgp_knowledge_graph_entities` (743) ought to carry a `bridges` or `aligns_to` relationship.

**DQ <-> DCG (weight 3).** Wired pairs: 3 (262 DCG -> DQ certified; 708 DCG -> DQ certification.granted; 713 DQ -> DCG dq_dimension.threshold_breached + 268 DQ -> DCG profile_result.updated, recount = 4 actually; weight may bump to 4 with deeper reading). Section 2: NULL on both sides. Section 3: clean. Section 4: clean. Section 5: zero cross-rels.

**IGA <-> DCG (weight 2).** Wired pairs: 1 (263 DCG -> IGA access approved; target_module=144 is the only handoff in the entire DCG audit that has a non-NULL module FK on EITHER side, an outlier). Section 2: NULL on DCG side only. Section 3: missing inbound IGA -> DCG on `access_request.denied` to record policy effectiveness; not present. Section 4: IGA-ACCESS-REQUEST declares `data_access_policies` 307 as `consumer + optional`, mirroring the catalog: clean. Section 5: zero cross-rels.

**AUDIT <-> DCG (weight 2).** Wired pairs: 2 (694 AUDIT -> DCG query lineage; 710 DCG -> AUDIT broken lineage). Section 2: NULL on both sides. Section 3: clean. Section 4: clean. Section 5: 1 cross-rel exists (348: `audit_findings reviews data_lineage_relationships`); aligned with handoff 710's semantics.

**BI <-> DCG (weight 2).** Wired pairs: 2 (688 BI -> DCG bi_report.published; 711 DCG -> BI certification.revoked). Section 2: NULL on both sides. Section 3: clean. Section 4: clean. Section 5: zero cross-rels.

**Lighter neighbors:**

- **MDM -> DCG (weight 1).** Inbound 719 merge_rule.published. NULL FKs. Cross-rel absent.
- **METRICS-LAYER <-> DCG (weight 1).** Outbound 220 metric.deprecated. NULL FKs. Cross-rel absent.
- **LCAP -> DCG (weight 1).** Inbound 707 extend_business_object.schema_changed. NULL FKs. Cross-rel absent.
- **APM (weight 1, DMDO-only).** APM-PORTFOLIO-REGISTRY consumer on `data_products` 232 (optional). DCG-side fix is to author the master in a DCG module; APM side is clean.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | M1 hard-fail, INSERT 6 candidate `domain_modules` rows + Phase B / E / F / S, gated on B2-S1 |
| B1-S2 | A2 hard-fail, INSERT 10 candidate `capabilities` + `capability_domains` rows, gated on B2-S2 |
| B1-S3 | PATCH 7 DCG-owned trigger_events to populate `event_category` |
| B1-S4 | INSERT lifecycle states for 9 workflow-bearing masters; surface config-shape exemption for 3 more |
| B1-S5 | DELETE 3 duplicate domain-level DMDO rows (data_products contributor, metric_definitions contributor, ontologies consumer) |
| B1-S6 | Populate `source_domain_module_id` or `target_domain_module_id` on 29 cross-domain handoffs (gated on B1-S1) |
| B1-S7 | PATCH 1-3 handoff descriptions per B2-S3 wording (Rule #18 cleanup) |
| B1-S8 | PATCH `domains.business_logic` to replace U+2014 em-dash with permitted punctuation (CLAUDE.md cleanup) |
| B1-S9 | Report-only, document neighbor-DMDO gaps so DI, KGP, DLP, DSPM, BI, AUDIT, MDM, METRICS-LAYER, DATA-AI-PLAT each declare consumer DMDOs on DCG masters in their b1 audits |
| B1-H1 | APQC TAGGING, propose 25 `agent_curated` rows (3 REPLACE existing weak `discovery_substring` rows + 22 INSERT new); 4 medium-confidence rows are candidates for Discover Pass 3 custom-process authoring |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M1 architectural choice: how to split DCG into deployable modules.** The agent's recommendation is a 6-module split (`DCG-CATALOG`, `DCG-LINEAGE`, `DCG-GLOSSARY`, `DCG-STEWARDSHIP`, `DCG-ACCESS-GOV`, `DCG-DATA-PRODUCTS`) anchored on Alation / Atlan / Collibra / Purview taxonomy. Alternatives the user might prefer: (a) a tighter 3-module split (`DCG-CORE` for catalog+lineage+glossary, `DCG-GOVERNANCE` for stewardship+access-gov, `DCG-DATA-PRODUCTS` standalone) more typical of integrated platforms; (b) a 4-module split that keeps `DCG-DATA-PRODUCTS` separate and folds stewardship into core; (c) a 7-module split that elevates `DCG-CLASSIFICATION` to its own module (Collibra and Purview both treat classification as a distinct workflow surface). The choice drives Phase B, E, F, S work. | Architectural decision the agent cannot make alone; depends on whether DCG is intended to deploy alongside DSPM / DLP as a unified governance stack (favors fewer / larger modules) or as a discrete catalog product (favors more / smaller modules). | (a) Agent's 6-module recommendation, (b) 3-module tight split, (c) 4-module split, (d) 7-module split, (e) different split altogether (specify). |
| B2-S2 | **Capability enumeration.** Audit candidates: technical-metadata-harvesting, business-glossary-management, data-lineage, automated-data-classification, data-stewardship-workflow, data-quality-scorecards, certification-workflow, data-product-publishing, access-request-and-policy-authoring, regulatory-mapping. 10 candidates. The agent's proposal is to author all 10. Alternative: a tighter list of 6-7 capabilities mapped directly to modules. | Capability list is a market-definition call that depends on how the user wants DCG to compare against other domains in the fact-sheet / blueprint surface. | (a) author all 10, (b) tighter 6-7 capability list (specify), (c) author a different list altogether (specify). |
| B2-S3 | **Rule #18 wording cleanup on 1-3 handoff descriptions.** Handoff 265 description currently reads "New glossary term published, KGP (Knowledge Graph Platform) populates concept hierarchy and links related entities." The parenthetical "(Knowledge Graph Platform)" reads as a product-name expansion (Rule #18 forbids product names in handoff descriptions; "KGP" alone is the domain code and is fine). Handoff 158 currently reads "An enterprise governance tool updates an access policy ..., the platform's native RBAC layer needs to enforce it. ..." references "an enterprise governance tool" and "the platform" generically, which is vendor-landscape narration shape. Handoff 223 starts "Data Catalog and Governance platforms maintain business glossaries that semantically overlap with KGP ontologies." DCG is the domain code so this is technically fine, but "platforms maintain" reads like vendor-landscape narration. | Rule #18 wording the user must approve per row (Rule #15 cousin). The agent must NOT auto-rewrite without user-confirmed wording. | (a) approve per-row replacement text from the agent (the agent surfaces specific drafts), (b) supply your own per-row text, (c) leave as-is and treat as not-a-violation (KGP / DCG are domain codes, the generic narration is acceptable). |
| B2-S4 | **Rule #12 lifecycle config-shape exemption for 3 masters.** Per Rule #12 the exemption (no lifecycle states required, `record_status` is the only state worth tracking) applies to author-once / occasionally-edit reference data. The 3 candidates for exemption from DCG's masters: (a) `data_domains` (304), pure reference data describing logical scopes (e.g. "Finance", "HR") that rarely changes; (b) `glossary_terms` (302), debatable: terms are author-once in 90 % of catalogs but some platforms model an approve / publish / deprecate cycle; (c) `data_usage_metrics` (308), signal-only metric output, no workflow. Per Rule #12 the agent surfaces the exemption to the user, never auto-populates `data_objects.notes` (Rule #15). | Exemption is the user's call per Rule #12; agent cannot auto-decide. | Per master: (i) confirm config-shape exemption (no lifecycle states authored), (ii) treat as workflow-bearing and author lifecycle states. |
| B2-S5 | **B4 pattern-flag re-evaluation.** Current state: all 12 masters carry `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Audit re-evaluation suggests: `data_access_policies` (307) is a textbook `has_submit_lock=true` + `has_single_approver=true` (policy author drafts, single approver signs off, then locked); `data_stewardship_assignments` (305) could be `has_personal_content=true` (steward identity is employee personal data); `data_certifications` (306) could be `has_single_approver=true` (data owner grants); `data_classifications` (303) could be `has_submit_lock=true` (classification rule locked after approval). 4-5 candidate flips. | Pattern flags are workflow-shape judgments per Rule #12. Agent re-evaluates, user decides; Rule #15 forbids auto-populating notes that document the choice. | Per-flag yes / no, captured in Decisions. |
| B2-S6 | **Regulation scoping.** Catalog has zero `domain_regulations` rows for DCG. Per flagship-vendor analysis the candidates are: (a) GDPR Article 30 record-of-processing-activities mapping (mandatory for EU data subjects); (b) CCPA / CPRA consumer data inventory + deletion (mandatory for CA data subjects); (c) HIPAA PHI inventory (mandatory for US healthcare); (d) SOX ICFR financial-data lineage (mandatory for US publicly-listed companies); (e) BCBS 239 risk data aggregation (mandatory for systemically-important banks); (f) GLBA financial privacy (US financial services); (g) EU AI Act training-data provenance (mandatory for high-risk AI systems); (h) SR 11-7 model risk management (US banks); (i) state-level US data privacy laws (VA, CO, CT, UT, etc.). Each needs a `regulations` row + `domain_regulations` junction with `applicability`. | Regulation-scoping is a market-definition decision (which sub-markets of DCG to formally model). | (a) author all 9 candidate regulations; (b) author a subset (specify); (c) author none for now; (d) defer to Bucket 3 Phase 0. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against Alation, Atlan, Collibra, data.world, Informatica EDC + AXON, Microsoft Purview, AWS Glue Data Catalog, IBM Knowledge Catalog, OvalEdge, Castor / Coalesce, Select Star, Secoda, Acryl DataHub, Open Metadata, Apache Atlas, Apache Polaris, Databricks Unity Catalog. The subagent recipe was not spawned (this is a single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING (10) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `data_contracts` | Confluent Schema Registry, PayPal Data Contract CLI, Gable.ai, Datacontract.com all model a "data contract" as a first-class artifact distinct from a glossary term or asset. Atlan and Collibra are adding native data-contract surfaces (2024-25). Probably its own domain (queued as DATA-CONTRACTS candidate in `_missing-domains.md`), but if folded into DCG, lives in DCG-CATALOG or DCG-DATA-PRODUCTS. | DCG-DATA-PRODUCTS, OR new domain |
| `data_quality_rules` (DCG-scoped) | Alation, Atlan, Collibra all surface DQ rules in-context alongside the asset (the DQ engine is often DQ-domain but the rule definition surfaces in DCG). Not a duplicate of DQ-owned dq_dimensions; this is the catalog-side reference / display copy. | DCG-CATALOG (contributor) |
| `data_access_requests` | Distinct from `data_access_policies` (307) in Collibra, Alation, Immuta. Policy is the rule; request is the workflow instance asking for access. Each request has its own state machine (submitted, under review, approved, denied, granted, revoked). Currently the trigger event `data_access_request.approved` (241) implies this entity exists, but no master is loaded. | DCG-ACCESS-GOV (master) |
| `data_marketplace_listings` | data.world, Atlan, Snowflake Data Exchange, Databricks Marketplace model the marketplace as a separate surface from the catalog. Listing carries its own approval / publishing / monetization workflow. | DCG-DATA-PRODUCTS (master), OR could become DATA-MARKETPLACE domain |
| `lineage_pipelines` | Distinct from `data_lineage_relationships` (301): a pipeline is the producing artifact; a lineage relationship is the resulting edge. Alation, Open Metadata, Acryl DataHub maintain pipeline records distinct from edges. May overlap with DI's pipeline_runs; ownership ambiguous. | DCG-LINEAGE (contributor) or DI ownership |
| `query_lineage_records` | Already loaded (data_object 710) but owned by AUDIT, not DCG. The flagship DCG vendors (Alation, Atlan) all surface query lineage as a catalog-native concept. Ownership debate: leave with AUDIT, or co-own via `consumer + required` DMDO on DCG-LINEAGE? | DCG-LINEAGE (consumer) |
| `data_impact_analyses` | Alation, Atlan, Collibra explicitly model an impact-analysis record (the asset, the proposed change, the affected downstreams, the decision). Distinct from lineage edges. | DCG-LINEAGE (master) |
| `metadata_collection_jobs` | Distinct from `pipeline_runs`: this is the catalog's own crawler / harvester job record (Apache Atlas, Open Metadata, AWS Glue all model "crawler jobs" with schedule + last-run + discovered-asset count). | DCG-CATALOG (master) |
| `data_sensitivity_labels` | Microsoft Purview Information Protection labels, Collibra Sensitive Data Discovery labels, Atlan classifications. Distinct from `data_classifications` (303) which models the policy / rule; sensitivity label is the applied tag. May fold into `data_classifications`. | DCG-ACCESS-GOV (consumer) or fold into 303 |
| `data_collaboration_threads` | Atlan, Secoda, Acryl DataHub all model in-catalog conversation threads (Slack-like). Currently no thread entity; conversations live in vendor-side annotations. | DCG-CATALOG (master), or fold into a generic `annotations` master |

#### MODULARIZATION (2) candidates

- **DCG-LINEAGE may not warrant its own module if lineage is heavily integrated with the catalog UI.** Atlan, data.world, Castor present lineage as a tab on the asset surface, not a separate workflow. Counter-argument: Open Metadata and Collibra have distinct lineage modules with their own ingestion paths. Surface for the B2-S1 split decision.
- **DCG-DATA-PRODUCTS overlaps DATA-CONTRACTS market.** If the user accepts DATA-CONTRACTS as a separate domain (queued in `_missing-domains.md`), DCG-DATA-PRODUCTS may shrink to just the data-product master + metric-definition. If folded in, DCG-DATA-PRODUCTS carries data_contracts as well.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- GDPR Article 30, CCPA / CPRA, HIPAA, SOX ICFR, BCBS 239, GLBA, EU AI Act, SR 11-7. Detailed in B2-S6.

#### Candidate-domain queue

This audit surfaced 2 domain-tier candidates for `audits/_missing-domains.md`:

- **DATA-OBSERVABILITY** (Monte Carlo, Acceldata, Bigeye, Anomalo, Soda, Sifflet, Metaplane, Datafold). Strongly adjacent to DCG (and to DQ), the flagship vendors compete as a recognized point-solution market distinct from DCG. Queued.
- **DATA-CONTRACTS** (Gable.ai, Datacontract.com, PayPal Data Contract CLI, Confluent Schema Registry, Buf Schema Registry). Emerging market, may consolidate into DCG / DCG-DATA-PRODUCTS or remain standalone. Queued.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/DCG-phase0-2026-05-30.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 10 to treat as confirmed and we proceed via Phase B inserts).

### Cross-bucket dependencies

- **B1-S1 is gated on B2-S1** (module split must be decided before module rows can be inserted).
- **B1-S2 is gated on B2-S2** (capability list must be confirmed before capability rows can be inserted).
- **B1-S4 is gated on B1-S1 and B2-S4** (lifecycle states attach to modules; config-shape exemption needs user decision).
- **B1-S6 is gated on B1-S1** (handoff module FKs cannot be populated until modules exist).
- **B1-S7 is gated on B2-S3** (Rule #18 wording for handoff descriptions).
- **B1-S9 depends on the receiving domains' b1 audits**: report-only, not CLM's err, not DCG's load.
- **B3 MISSING entity candidates inform B2-S1** (the module split decision shifts if `data_contracts`, `data_marketplace_listings`, `data_impact_analyses` are accepted as DCG entities).
- **B3 DATA-OBSERVABILITY / DATA-CONTRACTS candidate domains do NOT block DCG audit.** They become new audits when promoted.
- **B2-S6 (regulation scoping) is independent of all other buckets.**
- Otherwise Buckets 2 and 3 are independent of each other.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S3, S5, S8, H1`), or `skip`.

- **S1 (M1 hard-fail, 6 modules to insert)** is the centerpiece. Gated on B2-S1. Large loader.
- **S2 (A2 hard-fail, 10 capabilities to insert)** gated on B2-S2.
- **S3 (PATCH 7 trigger_events to populate event_category)** is trivial, one PATCH each.
- **S4 (lifecycle states across 9 masters)** depends on S1; can authorize-in-advance per master once split decided.
- **S5 (DELETE 3 duplicate DMDO domain-rollup rows)** is mechanical, surgical CLI.
- **S6 (populate 29 handoff module FKs)** rolls in to the loader from S1.
- **S7 (PATCH handoff descriptions)** gated on B2-S3 wording.
- **S8 (CLAUDE.md em-dash PATCH in `domains.business_logic`)** is trivial, one PATCH.
- **S9 (neighbor consumer DMDO declarations)** is report-only, schedules audits on 9 neighbors.
- **H1 (25 APQC tags)** load now or in a follow-up batch? 3 are REPLACE candidates, 22 are INSERT, 4 are medium-confidence Discover Pass 3 candidates.

**Bucket 2, what's your call on each?** I will wait for per-item decisions before acting.

- **B2-S1 (6-module split):** (a) agent's 6-module recommendation, (b) 3-module tight split, (c) 4-module split, (d) 7-module split, (e) different (specify).
- **B2-S2 (capability list):** (a) author all 10, (b) tighter 6-7 list, (c) different list (specify).
- **B2-S3 (Rule #18 wording on handoff 265 / 158 / 223):** (a) approve agent-proposed replacements, (b) supply your own, (c) leave as-is.
- **B2-S4 (Rule #12 config-shape exemption per master):** per-master (i) exempt or (ii) author lifecycle states.
- **B2-S5 (pattern-flag re-evaluation):** per-flag yes / no across the 4-5 candidate flips.
- **B2-S6 (regulation scoping):** (a) all 9 candidates, (b) subset (specify), (c) none for now, (d) defer to Phase 0.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 10 entity candidates + 2 modularization candidates + 8 regulation candidates + 2 candidate-domain entries to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing. The B1-S6 cascade fix (populating DCG-side module FK on the 29 handoffs) sits ON DCG; the rows below are the OTHER side.

| Owing domain | Owed work |
|---|---|
| DATA-AI-PLAT | B10b: populate `source_domain_module_id` on inbound handoffs 152, 683, 685 (data_product.published / ml_model.deployed / feature_set.published) and `target_domain_module_id` on outbound 158 (access_policy.updated). Add `consumer` DMDO on DCG masters (data_assets 300, glossary_terms 302) wherever DATA-AI-PLAT modules subscribe. |
| DLP | B10b: populate `target_domain_module_id` on outbound 260, 264, 709 (all DCG -> DLP). Add `consumer` DMDOs on DCG masters (data_classifications 303, data_access_policies 307) in receiving DLP module. |
| DSPM | B10b: populate `source_domain_module_id` on 285, 846 and `target_domain_module_id` on 261, 712 (DCG -> DSPM). Add `consumer` DMDOs on data_assets 300, data_usage_metrics 308 in receiving DSPM module. |
| DI | B10b: populate `source_domain_module_id` on 259, 726. Add `consumer` DMDO on data_assets 300 in receiving DI module (likely DI-INGEST or DI-PIPELINE-OBS). |
| KGP | B10b: populate `source_domain_module_id` on 698, 699 and `target_domain_module_id` on 265. Add `consumer` DMDO on glossary_terms 302, ontologies 254 in receiving KGP module. |
| DQ | B10b: populate `source_domain_module_id` on 268, 713 and `target_domain_module_id` on 262, 708. Add `consumer` DMDO on data_assets 300, data_certifications 306 in receiving DQ module. |
| IGA | B10b: populate `source_domain_module_id` on outbound IGA edges (none today), receive-side already 144. Confirm IGA-ACCESS-REQUEST consumer-DMDO declaration on `data_access_policies` 307 still aligns with whatever DCG-ACCESS-GOV ships. |
| AUDIT | B10b: populate `source_domain_module_id` on 694 and `target_domain_module_id` on 710. Cross-rel 348 (audit_findings reviews data_lineage_relationships) is correctly authored. |
| BI | B10b: populate `source_domain_module_id` on 688 and `target_domain_module_id` on 711. Add `consumer` DMDO on data_assets 300, data_certifications 306 in receiving BI module. |
| MDM | B10b: populate `source_domain_module_id` on 719. Add `consumer` DMDO on data_assets 300 if MDM treats master records as cataloged assets. |
| METRICS-LAYER | B10b: populate `target_domain_module_id` on 220. Add `consumer` DMDO on metric_definitions 252 in METRICS-LAYER module. |
| LCAP | B10b: populate `source_domain_module_id` on 707. |
| APM | DMDO already declared (`data_products` 232 consumer + optional on APM-PORTFOLIO-REGISTRY); clean once DCG modularizes. |
| Discover Pass 3 (catalog process) | 4 medium-confidence APQC candidates need custom-process authoring: ml_model.deployed (683), feature_set.published (685), kgp_knowledge_graph_entity.merged (698), kgp_knowledge_graph_entity.created (699). |

### Decisions

_(empty until reviewed)_

### Fixes applied

_(none yet; this audit is feedback_needed)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

Loader: [.tmp_deploy/fix_dcg_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_dcg_b1_technical_2026_05_31.ts).

Applied only the technical, agent-fixable B1 items from the 2026-05-30 audit (above) that do not depend on B2-S* judgment calls or on the B2-S1 module-split decision. All four blocks verified in-loader.

### Fixes applied

| ID | Fix type | Detail | Verified |
|---|---|---|---|
| B1-S3 | PATCH enum backfill | 7 DCG-owned trigger_events.event_category populated per audit assignments: 738 -> `lifecycle`, 739 -> `state_change`, 740 -> `lifecycle`, 741 -> `signal`, 742 -> `state_change`, 743 -> `state_change`, 744 -> `signal`. | Zero rows in (738,739,740,741,742,743,744) with empty event_category. |
| B1-S5 | DELETE stale rows | 3 duplicate domain-rollup rows in `domain_data_objects` deleted (audit pre-specified IDs): 395 (88, 232, contributor), 456 (88, 252, contributor), 458 (88, 254, consumer). Master sibling rows 517 / 518 / 519 retained. | Only master rollup rows remain for data_object_ids 232 / 252 / 254 under domain_id=88. |
| B1-S8 | PATCH em-dash cleanup | `domains.business_logic` on id=88 rewritten to replace " — " with ", " per CLAUDE.md em-dash ban. New value: "Lineage extraction, automated tagging, and profiling, the metadata harvesting layer beneath the catalog UI." | business_logic free of U+2014. |
| B1-H1 | INSERT handoff_processes | 14 `handoff_processes` rows inserted with `proposal_source='agent_curated'`, one per audit-pre-specified handoff where no existing handoff_processes row existed: handoff_ids 152, 223, 260, 261, 262, 265, 285, 694, 708, 709, 710, 712, 719, 846 (new row IDs 616-629). `record_status` omitted (defaults to `new` per Rule #1); `notes` omitted per Rule #15. | Each inserted (handoff_id, process_id) pair present with proposal_source=agent_curated. |

### Deferred (out of scope for this technical pass)

| ID | Why deferred |
|---|---|
| B1-S1 | New `domain_modules` (6 candidates) gated on B2-S1 architectural choice; not a technical fix. |
| B1-S2 | New `capabilities` (10 candidates) gated on B2-S2 capability-list user picks. |
| B1-S4 | Lifecycle states across 9 masters: gated on B1-S1 (modules must exist first) AND B2-S4 (per-master config-shape exemption user picks). |
| B1-S6 | 29 handoff source/target_domain_module_id PATCHes are gated on B1-S1 (no DCG modules exist to derive FKs from). |
| B1-S7 | Handoff description rewording (handoffs 158, 223, 265) gated on B2-S3 wording approval; Rule #15 / #18 cousin. |
| B1-S9 | Report-only; the work is owed by 9 neighbor domains' own b1 audits (DI, KGP, DLP, DSPM, BI, AUDIT, MDM, METRICS-LAYER, DATA-AI-PLAT). No DCG-side action. |
| H1 partial | Skipped from the 25-row H1 proposal: 4 Discover Pass 3 deferrals (683, 685, 698, 699) per audit's own "may stay discovery_substring until then" note; 3 REPLACE candidates (220, 263, 264) per "decide" judgment defer; 4 handoffs (158, 259, 268, 707, 711, 713, 688, 726) with existing handoff_processes rows where adding a second PCF is a "decide" call. |
| B2-S1 through B2-S6 | All user-judgment items (module split, capability list, Rule #18 wording, lifecycle exemption, pattern-flag flips, regulation scoping). Out of scope for residual technical pass. |
| B3 entries | Speculative entity / domain / modularization candidates; need Phase 0 vetting. |

JWT errors: none encountered.
