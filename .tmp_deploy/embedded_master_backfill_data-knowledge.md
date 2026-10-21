# Embedded-master + necessity backfill — cluster `data-knowledge`

**Cluster scope (14 domains):** DATA-AI-PLAT (129), DCG (88), DI (89), DQ (90), MDM (87), BI (74), METRICS-LAYER (137), KGP (138), KMS (33), ECM (91), DAM (92), IDP (39), HCMS (93), WEB-CONTOPS (128).

**Status:** draft. NOT loaded. Awaiting human review.

---

## 1. Cluster scope and rationale

The data/knowledge cluster has two distinct halves with very different ownership shapes:

- **Data half (DATA-AI-PLAT, DCG, DI, DQ, MDM, BI, METRICS-LAYER, KGP):** revolves around a clear flagship — `data_assets` / `metric_definitions` / `ontologies` — with MDM acting as the cross-cluster golden-record authority for shared business entities (`customers`, `suppliers`, `employees`). BI and METRICS-LAYER are derived-tier consumers; KGP is partially derived. The Signal-1 fingerprint should be strong here: DCG and the operational data tools all hold overlapping slices of the same logical asset.
- **Knowledge / content half (KMS, ECM, DAM, IDP, HCMS, WEB-CONTOPS):** point-solution-heavy, with each domain locally mastering `users` / `tags` / `glossary_terms` slices that would defer to a canonical owner (HCM / DCG / MDM) in a holistic deployment. IDP is a "produces fields against documents" derived/contributor on top of ECM. WEB-CONTOPS sits on top of HCMS plus DAM plus DXP segments.

Several proposed rows depend on data_objects that **do not yet exist** in the catalog (`metrics`, `reports`, `dashboards`, `relationships`, `fields`, `users`, `tags`, `datasets`, `semantic_models`, `extracted_fields`). These are flagged in Section 6; no rows pointing at non-existent ids are drafted.

---

## 2. Existing rows snapshot (76 rows, by domain)

### DATA-AI-PLAT (129) — 9 rows, all `master + required`
| # | data_object | role | necessity | notes excerpt |
|---|---|---|---|---|
| 385 | lakehouse_tables (226) | master | required | Platform catalog is the system of record |
| 386 | data_pipelines (227) | master | required | Pipeline definitions and run state |
| 387 | ml_models (228) | master | required | Platform-level model registry |
| 388 | feature_sets (229) | master | required | Feature-store entries |
| 389 | semantic_metrics (230) | master | required | Multi-master with BI |
| 390 | ai_agents (231) | master | required | Agent definitions, tool bindings |
| 391 | data_products (232) | master | required | Published data-product contract |
| 455 | metric_definitions (252) | consumer | required | AI agents consume metric defs |
| 459 | ontologies (254) | master | required | Foundry Ontology slice |
| 460 | knowledge_graph_entities (255) | master | required | Foundry Ontology Objects |

### DCG (88) — 14 rows, all `master + required` except two contributor rows
| # | data_object | role | notes excerpt |
|---|---|---|---|
| 508 | data_assets (300) | master | DCG flagship |
| 509 | data_lineage_relationships (301) | master | Flow-edge graph |
| 510 | glossary_terms (302) | master | Business-language glossary |
| 511 | data_classifications (303) | master | Shared taxonomy |
| 512 | data_domains (304) | master | Subject-area groupings |
| 513 | data_stewardship_assignments (305) | master | Universal steward assignments |
| 514 | data_certifications (306) | master | Production-readiness attestations |
| 515 | data_access_policies (307) | master | Governance policy |
| 516 | data_usage_metrics (308) | master | Asset-popularity |
| 517 | metric_definitions (252) | master | Catalog entry + lineage slice |
| 518 | data_products (232) | master | Published metadata + contract |
| 519 | ontologies (254) | master | Formal RDF/OWL structure |
| 395 | data_products (232) | contributor | (collision — see Section 6) |
| 456 | metric_definitions (252) | contributor | (collision — see Section 6) |
| 458 | ontologies (254) | consumer | (collision — see Section 6) |

### DI (89) — 8 rows
- 393 lakehouse_tables (226) contributor required — Fivetran/Airbyte/dbt write to platform tables
- 394 data_pipelines (227) contributor required — Tool pipelines register alongside platform-native
- 683–689 (`pipeline_runs` 434, `source_connectors` 435, `sink_connectors` 436, `transformation_jobs` 437, `schema_registries` 438, `change_data_capture_streams` 439, `integration_flows` 440) — all `master + required` (Phase-B Lite batch 1).

### DQ (90) — 7 rows
- 520 quality_rules (309) master, 521 quality_incidents (310) master, 522 profile_results (311) master, 523 dq_dimensions (312) master, 524 dq_scorecards (313) master, 525 dq_sla_definitions (314) master, 526 anomaly_detections (94) master (co-master with AIOPS), 527 incidents (47) contributor required — DQ creates ITSM incidents for SLA-critical breaches.

### MDM (87) — 9 rows, all `master + required`
- 528 customer_golden_records (315), 529 supplier_golden_records (316), 530 employee_golden_records (317), 531 match_rules (318), 532 merge_rules (319), 533 source_records (320), 534 customers (97), 535 suppliers (206), 536 employees (31), 457 ontologies (254) contributor, 461 knowledge_graph_entities (255) consumer.

### BI (74) — 3 rows
- 392 semantic_metrics (230) master required — tool-specific semantic models
- 396 lakehouse_tables (226) consumer required
- 398 data_products (232) consumer required
- 454 metric_definitions (252) consumer required

### METRICS-LAYER (137) — 2 rows
- 450 metric_definitions (252) master required — flagship
- 451 dimensional_models (253) master required

### KGP (138) — 2 rows
- 452 ontologies (254) master required — formal OWL/RDF
- 453 knowledge_graph_entities (255) master required

### KMS (33) — 6 rows, all `master + required` (Phase-B Lite batch 1)
- 659 knowledge_base_articles (410), 660 knowledge_categories (411), 661 article_revisions (412), 662 article_feedback (413), 663 knowledge_search_queries (414), 664 knowledge_collections (415).

### ECM (91) — 5 rows, all `master + required` (Phase-B Lite batch 1)
- 678 documents (429), 679 document_versions (430), 680 document_folders (431), 681 document_classifications (432), 682 records_retention_policies (433).

### DAM (92) — 1 row
- 238 digital_assets (137) master required.

### HCMS (93) — 7 rows
- 232–237 master required for content_types (131), content_entries (132), content_releases (133), editorial_workflows (134), content_locales (135), content_environments (136).
- 239 digital_assets (137) contributor required — content-bound assets uploaded inline.

### IDP (39) — **0 rows.** Domain holds no `domain_data_objects` rows yet.

### WEB-CONTOPS (128) — **0 rows.** Domain holds no `domain_data_objects` rows yet.

**Cluster total: 76 rows.** All `necessity='required'`. No `embedded_master` rows yet. No `derived` rows yet.

---

## 3. NEW rows to add (reasoning per row)

Grouped by data_object. Each row gives `(domain → data_object | role | necessity | notes)`.

### 3.1 Flagship row consolidation: `data_assets` (300) and `metric_definitions` (252)

#### data_assets (300) — DCG is canonical master. Existing: DCG master. Add:
- **DATA-AI-PLAT (129) → data_assets `embedded_master + required`** — Foundry, Databricks Unity Catalog, Snowflake Horizon, Microsoft Fabric OneLake all maintain their *own* native asset catalog. They defer to DCG (Collibra/Alation/Atlan) when one is deployed; standalone, the platform catalog *is* the catalog. Demotion path: "DATA-AI-PLAT local-masters data_assets via its native catalog (Unity Catalog, Fabric OneLake, Snowflake Horizon); defers to DCG when an enterprise catalog is present."
- **DI (89) → data_assets `contributor + required`** — Fivetran/Airbyte/dbt/Informatica register their output sinks as assets in the catalog. Already implicit in row 393 (which uses `lakehouse_tables`), but `data_assets` is the DCG-flagship slice the contributor row should target.
- **DQ (90) → data_assets `consumer + required`** — DQ profiles and monitors catalog-registered assets. Reads asset metadata to know what to profile. (Currently only row 397 against `lakehouse_tables`; add the DCG-flagship slice.)
- **BI (74) → data_assets `consumer + required`** — BI tools resolve dashboards back to certified data assets via the catalog. (Currently only row 396 against `lakehouse_tables`.)
- **KGP (138) → data_assets `consumer + required`** — Knowledge-graph ingestion pipelines pull from catalog-registered assets. (Pure-play KGP vendors don't catalog assets themselves.)
- **METRICS-LAYER (137) → data_assets `consumer + required`** — Semantic-layer engines (Cube, AtScale, dbt Semantic Layer) bind metric definitions to physical tables resolved through the catalog. SKILL.md notes BI/METRICS are derived-tier — `consumer` is correct here because the source is an asset reference, not a derived republish.

#### metric_definitions (252) — multi-master is correct (DCG, METRICS-LAYER). Add:
- **DATA-AI-PLAT (129) → metric_definitions `embedded_master + required`** — Databricks Unity Catalog Metrics, Snowflake Cortex Analyst metrics, Foundry Metric Objects all hold platform-native metric definitions when no metrics-layer vendor is present. Demotion path: "DATA-AI-PLAT local-masters metric_definitions via its native semantic surface; defers to METRICS-LAYER when AtScale/Cube/dbt Semantic Layer is deployed."
- (Row 455 already records DATA-AI-PLAT as `consumer` — replace with `embedded_master + required`. See Section 4.)

### 3.2 MDM cluster-flagship reinforcement

#### customers (97), suppliers (206), employees (31)
These are MDM-co-mastered already (rows 534–536). The cross-cluster `embedded_master` rows live in HR / customer / finance clusters (CRM `embedded_master`s customers, S2P `embedded_master`s suppliers, HCM `master`s employees). Nothing new to add **from within this cluster**, but we should:
- **DCG (88) → customers `consumer + required`** — DCG references golden records as the canonical customer asset surface. Already implied by `data_stewardship_assignments` but the FK is on the steward, not on the customer record. Add explicit consumer row.
- **DCG (88) → suppliers `consumer + required`** — same reasoning.
- **DCG (88) → employees `consumer + required`** — same reasoning (data stewards are employees).
- **DQ (90) → customers `consumer + required`** — DQ profiles golden-customer records.
- **DQ (90) → suppliers `consumer + required`** — same.
- **DQ (90) → employees `consumer + required`** — same.

Rationale: these rows make Signal 1 honest for the MDM flagship. Today MDM looks like the sole authority because nobody else references the records; in reality every governance/quality tool reads them.

### 3.3 DCG ↔ MDM ↔ KGP ontology / data_domains boundary

#### data_domains (304) — DCG master. Add:
- **MDM (87) → data_domains `consumer + required`** — MDM aligns its subject areas (customer, supplier, product, employee) to DCG-defined data domains.
- **DQ (90) → data_domains `consumer + required`** — DQ scopes rules and scorecards by data domain.

#### glossary_terms (302) — DCG master. Add:
- **MDM (87) → glossary_terms `consumer + required`** — golden-record attribute meanings reference the business glossary.
- **KGP (138) → glossary_terms `consumer + required`** — KGP ontologies cross-reference glossary terms as the controlled-vocabulary backbone.
- **METRICS-LAYER (137) → glossary_terms `consumer + required`** — semantic-layer metric descriptions and dimension labels reference the glossary.
- **BI (74) → glossary_terms `consumer + optional`** — BI dashboards may surface glossary tooltips when integrated with the catalog; many deployments don't bother. Optional reflects the real-world split between catalog-integrated BI (Tableau+Alation, Power BI+Purview) and standalone BI.
- **KMS (33) → glossary_terms `consumer + optional`** — some KMS deployments cross-link articles to glossary terms; many do not.
- **HCMS (93), ECM (91), WEB-CONTOPS (128) — no row.** These content tools maintain *their own* tags, not glossary terms. Modelling glossary_terms here would conflate two concepts.

#### data_classifications (303) — DCG master. Add:
- **ECM (91) → data_classifications `consumer + required`** — ECM applies catalog-defined classifications to documents for retention/access enforcement. (Document-internal `document_classifications` 432 is a *different* concept — folder-level taxonomy, not enterprise data-sensitivity.)
- **DAM (92) → data_classifications `consumer + optional`** — DAM deployments may apply enterprise classifications to creative assets (PII in shoot footage, embargoed press materials); many don't.
- **HCMS (93) → data_classifications `consumer + optional`** — same shape.

### 3.4 BI / METRICS-LAYER / KGP — `derived` role corrections and additions

Per SKILL.md, `derived` is for domains that *republish computed projections* against upstream masters. The cluster has three candidates.

#### BI (74) — currently 4 rows (1 master, 3 consumer). Reclassifications proposed in Section 4. Add:
- No new rows; BI's footprint is captured by metric_definitions/data_assets/data_products/lakehouse_tables consumer rows plus its own semantic_metrics master.

#### METRICS-LAYER (137) — currently 2 master rows. Add:
- (data_assets, glossary_terms consumer rows already covered in 3.1 and 3.3.)
- **METRICS-LAYER → lakehouse_tables (226) `consumer + required`** — semantic-layer engines compile metric DSL down to SQL hitting physical lakehouse tables. Without this read the engine cannot execute queries.

#### KGP (138) — currently 2 master rows. Add:
- **KGP → data_assets (300) `derived + required`** — KGP republishes graph-derived signals (relationship inferences, entity-resolution edges, semantic similarity scores) against catalog-registered assets. The output is a derived projection, not a master copy. Distinct from the consumer row in 3.1 — `derived` is the right role per SKILL.md (republishes signals against upstream master). Reconsider: the catalog *reads* graph signals, KGP *publishes* them. Two valid interpretations:
  - (a) KGP `derived` against data_assets, DCG `consumer` of the derived signal.
  - (b) KGP `consumer` of data_assets + KGP produces its own `knowledge_graph_entities` derived projection on top.
  Option (b) is cleaner — KGP masters its own derived projection (`knowledge_graph_entities`) and consumes upstream `data_assets`. **Going with option (b): the `consumer` row from 3.1 stands, no separate `derived` row on data_assets.**

### 3.5 Universal `users` / `employees` embedded-master pattern in content half

Every content domain holds a local user table (author, editor, contributor identities). In a holistic deployment these resolve to canonical employees.

`users` does not exist as a data_object today (see Section 6). Until it does, model the **`employees`** dependency for content domains that authenticate against employee identity:

- **KMS (33) → employees (31) `embedded_master + required`** — KMS holds local author/contributor profiles; defers to HCM/MDM employee golden records when SSO + HRIS integration is present. Demotion path: "KMS local-masters author/contributor profiles when standalone; reads from HCM via SSO/SCIM when integrated."
- **ECM (91) → employees (31) `embedded_master + required`** — same shape (document authors, approvers).
- **DAM (92) → employees (31) `embedded_master + required`** — creative-team identities.
- **HCMS (93) → employees (31) `embedded_master + optional`** — headless CMS deployments sometimes use API-key auth with no employee mapping (developer-facing CMSs); when there is editorial UX it embedded_masters editor identities. Optional reflects the headless-API-only deployment shape.
- **WEB-CONTOPS (128) → employees (31) `embedded_master + required`** — DXP author/editor identities.
- **IDP (39) → employees (31) `embedded_master + optional`** — IDP often runs as an automated pipeline service with system-account auth; some deployments surface a reviewer queue with employee identity.

Note: DATA-AI-PLAT, DCG, DI, DQ, MDM, BI, METRICS-LAYER, KGP all also hold local user/role tables, but their access to employee identity flows through DCG `data_stewardship_assignments` (already DCG-mastered) plus platform IAM (DSPM `iam_access_policies`). Modelling each one as `embedded_master employees` would inflate the count without adding signal — they consume `employees` via DCG steward FKs.

### 3.6 Content half — local tags / classifications

Each content domain holds its own taxonomy. **`tags` does not exist as a data_object today** (Section 6). Until it does, no rows are added here. ECM's `document_classifications` (432) is *not* the same concept — it's folder-level retention taxonomy, not free-form tagging.

### 3.7 IDP (39) — entire footprint missing

IDP has zero rows. Proposed footprint:

- **IDP → documents (429) `embedded_master + required`** — IDP holds its own document store during extraction (Hyperscience, ABBYY Vantage, AWS Textract input bucket). Defers to ECM as canonical when integrated. Demotion path: "IDP local-masters documents during the extraction pipeline; reads from ECM and writes extracted fields back when ECM is the system of record."
- **IDP → documents (429) `derived + required`** — *also* republishes derived signals (extracted entities, classification confidence, validation status) against ECM-mastered documents. Two-role pattern on the same (domain, data_object) requires checking the schema; if the junction PK is (domain_id, data_object_id) only, then we cannot record both. **Open question for Section 6.** Default: model as `embedded_master` only and put the derived-signal description in notes.
- **IDP → document_classifications (432) `contributor + required`** — IDP populates classification on documents (form type, document category).
- **IDP → ML model output** — IDP typically uses platform ml_models or its own embedded models. Add **IDP → ml_models (228) `embedded_master + optional`** — IDP vendors ship pre-trained extraction models that local-master inside the product; some deployments custom-train through DATA-AI-PLAT instead.
- **IDP → `extracted_fields`** — the natural data object (per-document key-value extractions) **does not exist** in the catalog. Flagged in Section 6 as a missing data_object. Without it, IDP's primary output cannot be modelled. **Recommend creating `extracted_fields` data_object before finalizing IDP rows.**

### 3.8 WEB-CONTOPS (128) — entire footprint missing

WEB-CONTOPS sits on top of HCMS + DAM + DXP. It governs publishing, workflows, and pre-launch QA across web channels.

- **WEB-CONTOPS → content_entries (132) `embedded_master + required`** — DXP suites with bundled CMSs (Adobe Experience Manager, Sitecore, Optimizely) hold their own content store. Defers to HCMS when headless-CMS-backed. Demotion path: "WEB-CONTOPS local-masters content when bundled-CMS (AEM, Sitecore); reads from HCMS when headless."
- **WEB-CONTOPS → editorial_workflows (134) `embedded_master + required`** — bundled DXPs ship their own workflow engine; headless stacks defer to HCMS workflows.
- **WEB-CONTOPS → digital_assets (137) `consumer + required`** — DXPs render DAM-hosted assets via URL/CDN reference.
- **WEB-CONTOPS → web_pages (441) `master + required`** — page-tree, route-binding, and routing rules are DXP-canonical (no other domain holds these). Even when content_entries are external, the page composition is DXP-mastered.
- **WEB-CONTOPS → personalization_rules (444) `master + required`** — DXP-canonical (Sitecore Personalization, Adobe Target rules embedded in AEM, Optimizely Web).
- **WEB-CONTOPS → experiences (443) `master + required`** — composed digital experiences.
- **WEB-CONTOPS → audience_segments (113) `embedded_master + optional`** — DXPs hold local segments for personalization when no CDP is present; defer to CDP when integrated. Optional because DXP-only deployments without segmentation use cases exist.
- **WEB-CONTOPS → content_components (442) `master + required`** — page/component composition (slices, blocks). Note: `content_components` may overlap with HCMS — see Section 5.

### 3.9 HCMS — additions

HCMS already has 7 rows. Add:
- **HCMS → web_pages (441) `embedded_master + optional`** — some headless CMSs (Storyblok, Sanity) model page entries directly; pure component-only CMSs (Contentful) do not. Optional reflects the headless split.
- **HCMS → experiences (443) `embedded_master + optional`** — same shape.

### 3.10 Data-AI-PLAT additional embedded-masters

DATA-AI-PLAT platforms increasingly embed-master more data concepts. Add:
- **DATA-AI-PLAT → quality_rules (309) `embedded_master + optional`** — Databricks Lakehouse Monitoring, Snowflake Data Quality, Foundry data-health checks all hold native DQ rule definitions. Optional because many platform deployments outsource DQ to Monte Carlo / Bigeye.
- **DATA-AI-PLAT → glossary_terms (302) `embedded_master + optional`** — Unity Catalog comments, Foundry term descriptions. Optional — many deployments defer to DCG entirely.
- **DATA-AI-PLAT → data_lineage_relationships (301) `embedded_master + required`** — Unity Catalog lineage, Foundry lineage, Snowflake account_usage lineage all hold platform-native lineage. Required because lineage is core platform telemetry, not optional.

### 3.11 DI — additions

DI tools also touch metadata:
- **DI → data_lineage_relationships (301) `contributor + required`** — Fivetran/Airbyte/dbt emit lineage to DCG and to platform catalogs.
- **DI → schema_registries (438)** is already DI master (row 688) — fine.
- **DI → data_classifications (303) `contributor + optional`** — some ELT tools (Informatica IDMC, Matillion) propagate column-level classifications during transforms; many do not.

### 3.12 KMS — cross-cluster consumer additions

KMS articles reference operational records:
- **KMS → customers (97) `consumer + optional`** — customer-facing KBs link articles to customer entitlements / segments; internal-only KBs do not. Optional per the prompt.
- **KMS → products (384) `consumer + optional`** — product-help KBs cross-reference product catalog; HR KBs do not.
- **KMS → incidents (47) `consumer + optional`** — some KMSes are wired to ITSM for "incident → suggested article"; many run standalone.
- **KMS → knowledge_graph_entities (255) `consumer + optional`** — KMSes with graph-RAG retrieval (Glean, Microsoft Copilot KB, Guru AI Answers) consume KG entities; classic KB tools do not.

### 3.13 ECM — cross-cluster consumer additions

- **ECM → records_retention_policies (433)** already ECM master (row 682) — fine.
- **ECM → contracts (66) `consumer + optional`** — ECM is sometimes the storage layer for CLM; sometimes CLM (DocuSign CLM, Icertis) holds its own. Optional.
- **ECM → legal_matters (391) `consumer + optional`** — same shape (legal-matter document repositories).

### 3.14 DAM — cross-cluster consumer additions

- **DAM → products (384) `consumer + required`** — DAM links creative assets to PIM-mastered SKUs (e.g., product photography). Required for retail/CPG DAM deployments; nearly universal at modern DAM scale.
- **DAM → campaigns (116) `consumer + optional`** — DAM-MA integrations link asset versions to campaigns; not all DAM deployments do this.

---

## 4. CHANGES to existing rows (role / necessity flips)

### 4.1 DATA-AI-PLAT 455: metric_definitions (252) `consumer + required` → **`embedded_master + required`**

**Reasoning:** Unity Catalog Metrics, Snowflake Cortex Analyst, and Foundry Metric Objects are not pure consumers of an external metrics layer — they are point-solution local masters that defer to METRICS-LAYER (AtScale/Cube/dbt SL) when one is deployed. The existing `consumer` row understates the platform's authority claim and removes a Signal-1b vote. Per SKILL.md anti-pattern #461 (don't model holistic-consumer when embedded_master already captures it), the row should be `embedded_master`.

Notes to update: "Platforms (Databricks Unity Catalog Metrics, Snowflake Cortex, Foundry Metric Objects) local-master metric definitions when no metrics-layer vendor is deployed; defer to METRICS-LAYER (AtScale, Cube, dbt Semantic Layer, Honeydew) when present."

### 4.2 DATA-AI-PLAT 459: ontologies (254) `master + required` — **keep as `master`**, refine notes

**Reasoning:** Foundry's Ontology is genuinely the canonical authority for Foundry deployments — it's not a point-solution local copy that defers to KGP. The two ontology masters (KGP=pure-play, DATA-AI-PLAT=Foundry) own distinct slices, and SKILL.md explicitly allows multi-master with notes describing the slice. **No role change.** The existing notes already capture the distinction. Multi-master stays.

### 4.3 DATA-AI-PLAT 460: knowledge_graph_entities (255) `master + required` — **demote to `embedded_master + required`**

**Reasoning:** Foundry Ontology Objects are operational entities backed by lakehouse tables — they are Foundry's local-mastered KG instance. In a holistic deployment where KGP (Stardog, Neo4j with reasoning, TopBraid) is the canonical KG, Foundry's objects defer or sync. This is exactly the `embedded_master` pattern per SKILL.md anti-pattern #459 (don't use `master` for local copy that defers to a canonical owner). KGP row 453 stays as canonical `master`.

Notes to update: "Foundry Ontology Objects local-master entity instances in a lakehouse-backed projection; defer to KGP (Stardog, Anzo, Neo4j) when an enterprise knowledge graph is deployed. Distinct slice from KGP's triplestore-native instances."

### 4.4 BI 392: semantic_metrics (230) `master + required` — **demote to `embedded_master + required`**

**Reasoning:** BI-tool-native semantic models (Power BI semantic models, LookML, Tableau metrics, MicroStrategy metrics) are the historical home of metric definitions — but in a modern stack with METRICS-LAYER deployed, BI defers (Tableau Pulse + Cube, Power BI + AtScale, Looker + dbt SL). Per anti-pattern #459, `master` overstates BI's authority claim when a canonical metrics-layer authority exists in the catalog. **Demote to `embedded_master`.** This is the canonical Signal-1b case: BI would master metrics if standalone; defers when METRICS-LAYER is present.

Notes to update: "BI tools (Power BI, Tableau, Looker, MicroStrategy) local-master tool-specific semantic models (Power BI semantic models, LookML, Tableau metrics) when standalone; defer to METRICS-LAYER (AtScale, Cube, dbt Semantic Layer) when a headless BI vendor is deployed. Metric drift between BI-local and METRICS-LAYER-canonical metrics is the Signal-2 friction the metrics-layer market exists to eliminate."

**Note:** The existing `metric_definitions` row 454 (BI consumer) stays. semantic_metrics (the tool-native) vs metric_definitions (the canonical) are two distinct data_objects by design.

### 4.5 BI 396: lakehouse_tables (226) `consumer + required` — **keep**, but reconsider role

**Reasoning:** BI is genuinely derived-tier here — it publishes dashboards / metrics computed against lakehouse tables. Should it be `derived` instead of `consumer`? Per SKILL.md, `derived` applies when the domain "republishes derived signals against the upstream master". BI publishes *visualizations and computed metrics*, not back-into-the-data-asset signals. `consumer` is the right role for the raw-table read; the *derived output* is BI's own `semantic_metrics` (which is BI-mastered). **No change.**

### 4.6 BI 398: data_products (232) `consumer + required` — **keep.** Same reasoning as 4.5.

### 4.7 BI 454: metric_definitions (252) `consumer + required` — **keep.** BI consuming canonical metrics is exactly what Signal-1's "BI defers to METRICS-LAYER" world looks like. (Combined with 4.4, BI now reads as: masters tool-specific semantic_metrics locally, consumes canonical metric_definitions and data_assets/data_products.)

### 4.8 DCG 395: data_products (232) `contributor + required` vs DCG 518: data_products (232) `master + required` — **collision**

Two DCG rows on `data_products`. Row 395 is contributor; row 518 is master. The schema may or may not allow this (depends on the PK shape — see Section 6). The master row (518) supersedes; the contributor row (395) likely was the earlier model and should be **deleted** as redundant.

### 4.9 DCG 456: metric_definitions (252) `contributor + required` vs DCG 517: metric_definitions (252) `master + required` — **collision**

Same shape. Row 456 (contributor) is redundant against row 517 (master). **Delete row 456.**

### 4.10 DCG 458: ontologies (254) `consumer + required` vs DCG 519: ontologies (254) `master + required` — **collision**

Same shape. Row 458 (consumer) is redundant against row 519 (master). **Delete row 458.**

### 4.11 MDM 534/535/536: customers/suppliers/employees `master + required` — **demote to `embedded_master`? No.**

Tempting per the SKILL.md "canonical authority" test: in a holistic deployment, is MDM *the* authority everyone defers to for customer identity? Yes — that's the entire definition of MDM. The operational owners (CRM masters `customers` for sales lifecycle, S2P masters `suppliers` for procurement lifecycle, HCM masters `employees` for employment lifecycle) own *different slices* — the operational lifecycle slice. MDM owns the *golden-identity slice*. Multi-master with slice-clear notes is correct and already in place. **No change.**

The right Signal-1b inflators are the *other* point-solutions that local-master these records — CRM, OMS, CCAAS, MA, CDP, LMS, ATS, etc. — and those rows live in the customer/HR clusters, not this cluster. Out of scope.

### 4.12 KMS 659–664: knowledge_base_articles + ancillaries `master + required` — **keep**, expand notes

The Phase-B Lite batch 1 notes are placeholder. They should not be flipped, but the notes should be expanded post-load. Outside Section 4 scope; flagged.

### 4.13 ECM 678–682: documents + ancillaries `master + required` — **keep**, expand notes

Same shape.

### 4.14 HCMS 239: digital_assets (137) `contributor + required` — **flip to `embedded_master + required`**

**Reasoning:** Per row 239's own notes, "standalone HCMS effectively masters its own asset library until a DAM is introduced." That is *exactly* the `embedded_master` pattern. `contributor` understates HCMS's authority claim when standalone. Demotion path is already captured in notes.

Notes to update (keep substance): "HCMS local-masters content-bound assets (Contentful Assets, Sanity Files, Storyblok Assets) when no DAM is present; defers to DAM-hosted assets by URL reference when DAM is deployed."

### 4.15 No necessity flips proposed on existing rows

All existing rows are `required`. Per SKILL.md anti-pattern #458 the default fail-safe is required; flipping to optional requires evidence that "many real deployments skip it." None of the existing rows clearly meet that bar — they're all flagship-ownership rows by domain. Necessity flips happen on the *new* rows in Section 3 where the optional pattern is real.

---

## 5. Boundary observations (cross-cluster authority sharing)

1. **MDM ↔ KGP boundary** is already well-modelled: MDM masters golden records, KGP masters ontologies + KG entities, MDM contributes to ontologies, KGP consumes from MDM. This is a textbook two-domain boundary-object pattern executed correctly.

2. **DCG ↔ METRICS-LAYER ↔ DATA-AI-PLAT on `metric_definitions`** is a three-way multi-master. After the changes in Section 4, the row is:
   - DCG master (catalog entry + lineage slice) — row 517
   - METRICS-LAYER master (formula + dimension slice) — row 450
   - DATA-AI-PLAT embedded_master (platform-native metric surface, defers to METRICS-LAYER) — row 455 after flip
   - BI consumer (read-only on canonical) — row 454
   - DATA-AI-PLAT consumer (AI agents) — wait, this row was 455 too. After flip, DATA-AI-PLAT is only `embedded_master` on this object (single row). The AI-agent-consumes-metrics concern is captured in the embedded_master notes; per anti-pattern #461 don't double-count.

3. **DCG ↔ DSPM boundary on `data_access_policies` (307) vs `iam_access_policies` (340)** — already split by row 515 note. Two distinct objects, correct.

4. **DCG ↔ DLP boundary on `data_classifications` (303)** — DCG masters the taxonomy; DLP applies it. Should have a DLP `contributor + required` row on 303. **Out of cluster scope** (DLP is security cluster) but flagged here.

5. **HCMS ↔ DAM ↔ WEB-CONTOPS triangle** is the content half's flagship boundary. After Section 3.8 changes, the shape is:
   - HCMS masters content_entries/content_types
   - DAM masters digital_assets
   - WEB-CONTOPS embedded_masters content_entries (bundled CMS) OR HCMS-defers (headless)
   - WEB-CONTOPS consumes digital_assets
   - HCMS embedded_masters digital_assets (defers to DAM)
   This is a strong Signal-1b cluster — multiple embedded_masters around `digital_assets` reflect the real-world point-solution sprawl.

6. **IDP is best modelled as ECM-adjacent**, not as its own data layer. The natural fit is IDP `embedded_master`s documents (when standalone, runs its own ingest store) and contributes `document_classifications` + a new `extracted_fields` object back to ECM.

7. **KMS straddles content half and data half**: KMS articles are content, but KMS *retrieval* increasingly uses KGP entities and DCG glossary_terms. The KMS consumer rows in 3.12 + 3.3 surface this — KMS is becoming a KGP/RAG consumer in modern deployments.

8. **Cross-cluster `employees` embedded_master sprawl**: every content domain (KMS, ECM, DAM, HCMS, WEB-CONTOPS, IDP) holds local user identity. This is exactly the canonical Signal-1b pattern from SKILL.md — same record, N point-solution local-masters, one canonical (HCM/MDM). After Section 3.5, `employees` will be the cluster's highest-embedded-master-count data_object.

---

## 6. Open questions and missing data_objects

### 6.1 Missing data_objects (blocking some rows)

The following data_objects **do not exist** in the live catalog. Proposed rows referencing them are deferred until they are created (out of scope for this analyst; flagged for separate Phase-1 work):

| Proposed object | Plural form | Use case | Rows blocked |
|---|---|---|---|
| `users` | users | universal user identity (auth) — separate from `employees` (employment) | Every content domain's "local users" embedded_master rows. Workaround in this draft: model via `employees` where SSO/IDP integration is the typical path. |
| `tags` | tags | universal free-form tag taxonomy | Content-domain local tag embedded_masters (KMS, ECM, DAM, HCMS, WEB-CONTOPS). No clean substitute. |
| `metrics` | metrics | distinct from `metric_definitions` (canonical metric registry) and `semantic_metrics` (tool-local)? Or are the three already sufficient? | Possibly no — three metric-related objects may already cover the space. |
| `reports` | reports | BI report instances (not dashboards, not metric_definitions) | BI rows. Currently no BI master beyond semantic_metrics. |
| `dashboards` | dashboards | BI dashboard objects | Same. |
| `relationships` | relationships | KGP graph relationships (currently absorbed into `knowledge_graph_entities`?) | KGP additional rows. |
| `fields` / `extracted_fields` | fields / extracted_fields | IDP primary output object (per-document key-value extractions) | IDP's flagship output row. **High-priority gap — IDP cannot be properly modelled without this.** |
| `datasets` | datasets | distinct from `data_assets`, `lakehouse_tables`, `data_products`? | Probably already covered by the existing three. |
| `semantic_models` | semantic_models | distinct from `semantic_metrics` and `dimensional_models`? | Probably covered by `dimensional_models` (253). |

**Recommendation:** before loading IDP rows, create `extracted_fields` data_object. The other gaps (`users`, `tags`, `reports`, `dashboards`, `relationships`) are useful but not blocking — workarounds documented above.

### 6.2 Schema question: can `domain_data_objects` carry two roles for the same (domain, data_object)?

Section 3.7 proposed both `embedded_master` and `derived` for IDP→documents. If the table PK is (domain_id, data_object_id), this is not representable. Need to verify the table constraint. **Default in this draft:** model as `embedded_master` only and capture the derived-signal description in notes.

### 6.3 DCG triple collisions (4.8–4.10)

The three (DCG, data_products), (DCG, metric_definitions), (DCG, ontologies) duplicate rows look like layering — earlier `contributor` / `consumer` rows that were superseded by later `master` rows from a re-scope. **Recommend deletion of rows 395, 456, 458** as cleanup, contingent on confirming via row timestamps that the master rows (518, 517, 519) are the authoritative later additions.

### 6.4 DATA-AI-PLAT embedded_master count is going to be very high

After this backfill, DATA-AI-PLAT will hold embedded_master rows on metric_definitions, data_assets, data_lineage_relationships, glossary_terms, quality_rules, knowledge_graph_entities, and likely more in future iterations. This is **correct** — the data-AI platform thesis is "absorb the point-solution sprawl into one platform" — but it does mean DATA-AI-PLAT will dominate the Signal-1b chart for the data cluster. Sanity-check this with the user; if the count looks performative, prune the optional ones.

### 6.5 WEB-CONTOPS overlap with DXP

The "DXP" domain is referenced in HCMS row 233's notes as bundling its own CMS. WEB-CONTOPS as defined here is essentially that DXP — verify with the user that WEB-CONTOPS = DXP and not a separate concept. If DXP exists separately in another cluster (workspace cluster mentions DXP), the WEB-CONTOPS rows in 3.8 may need to move there. Likely WEB-CONTOPS is the on-publish/governance subset of DXP and DXP is the broader composable-suite domain.

### 6.6 KGP `derived` role

Argued in 3.4 to not use `derived` for KGP (option (b) chosen — `consumer` of data_assets, master of own knowledge_graph_entities). Reconsider if the user prefers explicit `derived` modelling for clarity in scoring.

---

## 7. Summary counts

### Existing cluster footprint
- Total existing rows: **76**
- By domain: DATA-AI-PLAT 10, DCG 14, DI 8, DQ 8, MDM 11, BI 4, METRICS-LAYER 2, KGP 2, KMS 6, ECM 5, DAM 1, HCMS 7, IDP 0, WEB-CONTOPS 0
- By role today: master 64, contributor 5, consumer 7, embedded_master 0, derived 0
- All rows `necessity='required'`

### Proposed deltas

**NEW rows (Section 3):** approximately **47**, broken down:
- 3.1 flagship rows: 6 (data_assets) + 1 (DATA-AI-PLAT metric_definitions — moves to Section 4 as a flip) = 6
- 3.2 MDM consumer additions: 6
- 3.3 DCG glossary/classification/domain consumers: 8 (5 required + 3 optional)
- 3.4 METRICS-LAYER lakehouse_tables consumer: 1
- 3.5 employees embedded_masters across content domains: 6 (3 required + 3 optional)
- 3.7 IDP footprint (excluding extracted_fields): 3
- 3.8 WEB-CONTOPS footprint: 8
- 3.9 HCMS additions: 2 (both optional)
- 3.10 DATA-AI-PLAT additions: 3 (1 required + 2 optional)
- 3.11 DI additions: 2 (1 required + 1 optional)
- 3.12 KMS cross-cluster consumers: 4 (all optional)
- 3.13 ECM cross-cluster consumers: 2 (both optional)
- 3.14 DAM cross-cluster consumers: 2 (1 required + 1 optional)

**By role on NEW rows:**
- consumer: ~25 (mix required + optional)
- embedded_master: ~14 (mix required + optional)
- contributor: ~3
- master: ~5 (WEB-CONTOPS native objects)
- derived: 0 (option (b) chosen for KGP; IDP derived absorbed into embedded_master notes)

**By necessity on NEW rows:**
- required: ~28
- optional: ~19

### CHANGES to existing rows (Section 4):
- Role flips: **3** (DATA-AI-PLAT 455 consumer→embedded_master, DATA-AI-PLAT 460 master→embedded_master, BI 392 master→embedded_master, HCMS 239 contributor→embedded_master). Actually 4.
- Notes-only updates flagged: 4.2 (no change), 4.5/4.6/4.7 (no change), several note expansions on Phase-B Lite batch 1 rows.
- **Row deletions proposed:** 3 (rows 395, 456, 458 — DCG duplicate collisions).

### Post-backfill cluster shape (projected)

- Total rows: ~76 + ~47 NEW − 3 deletions = **~120**
- embedded_master count: ~14 NEW + 4 flipped = **~18** (vs 0 today)
- derived count: **0** (per option (b))
- optional rows: **~19** (all NEW)
- Signal-1b flagship: **`employees`** with 6 embedded_masters in this cluster alone (KMS, ECM, DAM, HCMS optional, WEB-CONTOPS, IDP optional) — plus the HR cluster's additional embedded_masters when that draft lands.
- Signal-1 multi-master flagships: `customers` (CRM-cluster + MDM), `metric_definitions` (DCG + METRICS-LAYER + co-master cluster-wide), `ontologies` (DCG + KGP + DATA-AI-PLAT/Foundry).

### Blocking issues for load
1. **`extracted_fields` data_object missing** — IDP's flagship output row cannot be modelled without it. Recommend Phase-1 creation pass before loading IDP section.
2. **Schema check on dual-role (embedded_master + derived) on same (domain, data_object) pair** — confirm before drafting IDP option-A rows. Current draft uses option (b) workaround (no dual rows).
3. **DCG row deletions (395, 456, 458)** — confirm with user before deletion that the master rows are the authoritative later additions.
4. **WEB-CONTOPS vs DXP scope** — confirm with user whether WEB-CONTOPS = DXP (same domain) or a narrower scope.
