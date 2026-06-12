# DATA-AI-PLAT audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules` rows** (M1 hard-fail, blocks the entire M / B / C / E / F band). 9 own masters at the `domain_data_objects` rollup layer (`lakehouse_tables`, `data_pipelines`, `ml_models`, `feature_sets`, `semantic_metrics`, `ai_agents`, `data_products`, `ontologies`, `knowledge_graph_entities`), plus 1 cross-domain consumer (`metric_definitions`, mastered by METRICS-LAYER). 8 capabilities (`LAKEHOUSE-STORAGE`, `DATA-PIPELINE-ORCH`, `SEMANTIC-MODELING`, `ML-LIFECYCLE`, `LLM-ORCH`, `UNIFIED-GOV-CATALOG`, `OPERATIONAL-DATA-APPS`, `NOTEBOOK-ANALYTICS`). 10 solutions, all coverage_level `primary` (Palantir Foundry, Databricks Data Intelligence Platform, Snowflake AI Data Cloud, Microsoft Fabric, Google Cloud Data and AI, Amazon SageMaker Unified Studio, IBM watsonx, SAP Business Data Cloud, Cloudera Data Platform, Dataiku). 18 trigger_events (10 with valid `event_category`, **8 with empty `event_category`** spanning `ml_model.*` and `feature_set.*`). 11 outbound + 9 inbound cross-domain handoffs = **20 cross-domain handoffs total**. **0 intra-domain cross-module handoffs** (vacuous: zero modules). **0 lifecycle states authored on any of the 9 masters**. **0 `data_object_aliases`**. 1 cross-domain relationship row pointing at `data_products` (id 232). 1 system skill (`data-ai-plat-system`, id 45) with `domain_module_id IS NULL`, 9 `skill_tools` rows attached. 0 roles, 0 role_modules, 0 permissions, 0 role_permissions in DATA-AI-PLAT scope. 0 `domain_regulations` rows.
- **Vendor-surface basis (Pass 2 flagship enumeration):** Databricks Lakehouse (Unity Catalog + MLflow + Feature Store + Vector Search + Mosaic AI Agent Framework), Snowflake AI Data Cloud (Polaris Catalog + Snowpark ML + Cortex AI + Streamlit), Microsoft Fabric (OneLake + Synapse + Real-Time Intelligence + Power BI semantic models + Copilot Studio), Google Cloud Data and AI (BigQuery + Dataplex + Vertex AI + Agent Builder + Gemini), Amazon SageMaker Unified Studio (Lakehouse on S3 Tables + Bedrock + Q Developer), Palantir Foundry (Ontology + AIP + Workshop + Pipeline Builder), IBM watsonx (watsonx.data + watsonx.ai + watsonx.governance), Dataiku DSS, Cloudera Data Platform, SAP Business Data Cloud. Compliance specialists referenced: IBM watsonx.governance, Credo AI, Holistic AI (route to candidate domain AI-GOV in `_missing-domains.md`). Pure-play AI agent runtime referenced: Anyscale, Modal, Hugging Face Hub (capability overlay; not a separate market).

**Neighbor discovery** (auto-derived from cross-domain handoffs + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| DCG (Data Catalog and Governance) | 3 | 1 | 0 | 0 | 4 | Pairwise (full) |
| DI (Data Integration) | 0 | 3 | 0 | 0 | 3 | Pairwise (full) |
| DQ (Data Quality) | 2 | 1 | 0 | 0 | 3 | Pairwise (full) |
| METRICS-LAYER | 0 | 2 | 1 (consumer on metric_definitions) | 0 | 3 | Pairwise (full) |
| ITSM | 2 | 0 | 0 | 0 | 2 | Lightweight |
| KGP (Knowledge Graph Platform) | 0 | 2 | 0 | 0 | 2 | Lightweight |
| BI (Business Intelligence) | 1 | 0 | 0 | 0 | 1 | Lightweight |
| MDM (Master Data Mgmt) | 1 | 0 | 0 | 0 | 1 | Lightweight |
| AIOPS | 1 | 0 | 0 | 0 | 1 | Lightweight |
| CONV-AI | 1 | 0 | 0 | 0 | 1 | Lightweight |

**Structural pass bands (highlights):**

- **S1-S3 (domain self-consistency):** `domains` row populates all 7 buyer-side fields (crud_percentage=30, business_logic populated, min_org_size=`30 m <2500`, cost_band=`$$$$`, certification_required=false, usa_market_size_usd_m=25000, market_size_source_year=2024). Description / business_logic vendor-name scan passes Rule #18 (no vendor names in prose). Pass.
- **A1-A3 (capability shape):** 8 capabilities loaded; each has a `capability_code` and a backing capability_name. No orphan capabilities detected. Pass.
- **M1 (deployable modules):** **HARD FAIL.** Zero `domain_modules` rows. Per Rule #14: every `domains` row MUST have at least one `module_kind='full'` row. With 8 capabilities the floor is actually **two** full modules (Rule #14 second clause). The entire M / B / C / E / F band downstream of M1 cascades into a structural blocker since none of those bands can be evaluated against modules that do not exist.
- **M2-M7:** vacuously not-evaluable until M1 cures.
- **B1-B12:** vacuously not-evaluable; B9 (trigger_events have `event_category` populated) IS evaluable on the 18 events that exist, **8 fail** (`ml_model.deployed`, `ml_model.drift_detected`, `ml_model.retraining_required`, `ml_model.evaluation_failed`, `ml_model.archived`, `feature_set.published`, `feature_set.schema_changed`, `feature_set.staleness_breached`).
- **C1-C2 (lifecycle states):** **HARD FAIL.** Zero `data_object_lifecycle_states` rows on any of the 9 own masters. Rule #12 mandates lifecycle states for every `master + required` data_object that is not a documented config-shape exemption. None of the 9 own masters are obvious config-shape; all carry workflow (e.g. `ai_agent.deployed`, `data_product.published`, `ml_model.archived`).
- **D1 (data_object_aliases):** zero aliases on a domain where vendor naming varies wildly (Foundry "objects" vs Databricks "tables" vs Snowflake "tables" vs BigQuery "tables" for `lakehouse_tables`; Foundry "ontology" vs Snowflake "horizon" vs Fabric "OneLake schema" for `ontologies`). Soft-fail: aliases are vendor-naming reconciliation surface, not a structural blocker, but their absence is notable on a domain with 10 flagship vendors.
- **E1-E6 (RBAC):** vacuously not-evaluable; no roles or permissions exist at the DATA-AI-PLAT scope (would be derived from modules per Rule #14).
- **F1 (system skill exists):** present (`data-ai-plat-system`, id 45). **F2 (one system skill per module):** vacuously passes since 0 modules and 1 skill; the skill's `domain_module_id IS NULL` means it cannot be a module's system skill until M1 cures and a module is assigned. **F3 (system skill has skill_tools):** 9 skill_tools exist on skill 45, satisfies the floor. **F4 (operation_kind invariants):** not audited in this pass; flagged for follow-up after M1 cures. **F5 (Semantius score computable):** vacuously not-applicable; score is per-module and there are no modules. **F7 (channel-primitive justification):** not yet evaluable without modules.
- **H1 (APQC handoff tagging):** **HARD FAIL.** 1 of 20 cross-domain handoffs tagged. The one tag (handoff 219 `metric.certified` → DATA-AI-PLAT) is `proposal_source='discovery_substring'`, `record_status='new'`, points at "Establish baseline metrics" (PCF L4 19954). **0 agent_curated, 0 record_status='approved'.** Volume expectation per H1: 0.5N to 0.8N for N=20 → 10 to 16 agent_curated tags.

DATA-AI-PLAT Semantius score: **not computable** until M1 cures (the score is per-module).

- **Bucket 1 (in-scope, agent fixable):** 5 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 12 items.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B9 missing `event_category` on 8 trigger_events** | Per Rule #13, `trigger_events.event_category` must be one of `lifecycle / state_change / threshold / signal`. 8 events carry empty `event_category`: 698 `ml_model.deployed`, 699 `ml_model.drift_detected`, 700 `ml_model.retraining_required`, 701 `ml_model.evaluation_failed`, 702 `ml_model.archived`, 703 `feature_set.published`, 704 `feature_set.schema_changed`, 705 `feature_set.staleness_breached`. | PATCH 8 trigger_events: 698 → `lifecycle` (deployed is a positive lifecycle stage on the model); 699 → `signal` (drift detection is an emitted signal, not a state); 700 → `signal` (retraining-required is a derived signal); 701 → `state_change` (evaluation failure transitions the model to a failed state); 702 → `lifecycle` (archived is a terminal lifecycle stage); 703 → `lifecycle`; 704 → `state_change`; 705 → `threshold` (staleness is a time-window threshold breach). |
| B1-S2 | **Pairwise, B10b report-only (outbound NULLs owed by target domains)** | 11 outbound handoffs and **every single one** carries NULL on `source_domain_module_id` AND NULL on `target_domain_module_id`. The DATA-AI-PLAT side cannot be backfilled until B2-S1 lands a module split. The target side is the target's b1 audit work. Outbound rows: 151 → BI (`semantic_metric.published`), 152 → DCG (`data_product.published`), 153 → CONV-AI (`ai_agent.deployed`), 154 → AIOPS (`pipeline_run.failed`), 155 → MDM (`golden_record.synced`), 156 → DQ (`quality_check.failed`), 682 → ITSM (`ml_model.drift_detected`), 683 → DCG (`ml_model.deployed`), 684 → DQ (`feature_set.staleness_breached`), 685 → DCG (`feature_set.published`), 686 → ITSM (`ml_model.evaluation_failed`). 682 and 686 already have `target_domain_module_id=38` populated (ITSM module 38, exception to the all-NULL pattern). Source side is DATA-AI-PLAT's fix once B2-S1 resolves modules. | Schedule b1 audits on BI, DCG, CONV-AI, AIOPS, MDM, DQ, ITSM to backfill `target_domain_module_id` on each outbound. DATA-AI-PLAT itself patches `source_domain_module_id` only after B2-S1 modules exist. |
| B1-S3 | **Pairwise, B10b report-only (inbound NULLs owed by source domains)** | 9 inbound handoffs, **all 9 with NULL on both FKs**. Inbound rows: 157 ← DI (`replication_load.completed`), 158 ← DCG (`access_policy.updated`), 219 ← METRICS-LAYER (`metric.certified`), 221 ← KGP (`ontology.published`), 693 ← METRICS-LAYER (`metric_materialization.refreshed`), 697 ← KGP (`kgp_ontology.imported`), 715 ← DQ (`dq_dimension.threshold_breached`), 731 ← DI (`schema_registry.schema_evolved`), 725 ← DI (`pipeline_run.completed`). | Schedule b1 audits on DI, DCG, METRICS-LAYER, KGP, DQ to backfill `source_domain_module_id` on each inbound. DATA-AI-PLAT's own `target_domain_module_id` follow-up depends on B2-S1. |
| B1-S4 | **Pairwise, missing consumer DMDOs report-only** | Several downstream domains receive payloads from DATA-AI-PLAT masters but have no `domain_module_data_objects` or `domain_data_objects` consumer row declaring the dependency: DCG receives `data_products` / `ml_models` / `feature_sets` (3 handoffs), DQ receives `lakehouse_tables` / `feature_sets`, BI receives `semantic_metrics`, MDM receives `data_products`, CONV-AI receives `ai_agents`, AIOPS receives `data_pipelines`, ITSM receives the `ml_models` drift / evaluation alarms (already wired to module 38 but not declared as a consumer DMDO on `ml_models`). Per the catalog-wide validate-cross-domain baseline (audits/\_validate-cross-domain.md), this is the same B8-reverse pattern that hits FIN / GRC / AUDIT. Not DATA-AI-PLAT's fix to make. | Report-only; each receiving domain's b1 audit picks up the consumer DMDO authoring. |
| B1-H1 | **H1 hard-fail, APQC PCF tagging** | 1 of 20 cross-domain handoffs tagged (handoff 219 `discovery_substring`, weak); 19 untagged. Volume expectation 10 to 16 `agent_curated` rows. The audit proposes the following high-confidence PCF classifications from the structural-pass mental model; PCF id resolution is required at fix time (queries returned no L2/L3 PCF row that maps cleanly to "Develop and manage information services" / "Manage business intelligence" / "Manage master data" surfaces, the L2 anchor for most of these is **Process 8 "Manage Information Technology (IT)"** at L1 with limited L3 children populated in the catalog). Proposed candidates:

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 151 | DATA-AI-PLAT → BI | `semantic_metric.published` | `semantic_metrics` | Manage business analysis (within 8.x) or "Analyze data" (439) | 439 candidate | medium L3 |
| 152 | DATA-AI-PLAT → DCG | `data_product.published` | `data_products` | "Develop and manage information services" / "Manage product and service master data" | 115 candidate | medium L3 |
| 153 | DATA-AI-PLAT → CONV-AI | `ai_agent.deployed` | `ai_agents` | "Manage IT user identity and authorization" parent or "Develop and manage information technology" | needs lookup | medium L3 |
| 154 | DATA-AI-PLAT → AIOPS | `pipeline_run.failed` | `data_pipelines` | "Develop and execute IT resilience and continuity operations" 20749 | 272 candidate | confident L3 |
| 155 | DATA-AI-PLAT → MDM | `golden_record.synced` | `data_products` | "Maintain master data" 10252 L4 (parent unknown; lookup) | needs lookup | confident L4 |
| 156 | DATA-AI-PLAT → DQ | `quality_check.failed` | `lakehouse_tables` | "Develop and manage IT security, privacy, and data protection" (270) parent (DQ has its own PCF anchor; verify at fix time) | needs lookup | medium |
| 682 | DATA-AI-PLAT → ITSM | `ml_model.drift_detected` | `service_incidents` | "Develop and execute IT resilience and continuity operations" 20749 | 272 | confident L3 |
| 683 | DATA-AI-PLAT → DCG | `ml_model.deployed` | `ml_models` | "Develop and manage information services" parent | needs lookup | confident L3 |
| 684 | DATA-AI-PLAT → DQ | `feature_set.staleness_breached` | `feature_sets` | "Manage IT operations" parent or "Maintain master data" 10252 | needs lookup | medium |
| 685 | DATA-AI-PLAT → DCG | `feature_set.published` | `feature_sets` | "Develop and manage information services" parent | needs lookup | confident L3 |
| 686 | DATA-AI-PLAT → ITSM | `ml_model.evaluation_failed` | `service_incidents` | "Develop and execute IT resilience and continuity operations" 20749 | 272 | confident L3 |
| 157 | DI → DATA-AI-PLAT | `replication_load.completed` | `lakehouse_tables` | "Develop and manage IT solutions" / "Manage IT operations" parent | needs lookup | confident L3 |
| 158 | DCG → DATA-AI-PLAT | `access_policy.updated` | `lakehouse_tables` | "Manage IT user identity and authorization" 20756 | 273 | confident L3 |
| 219 | METRICS-LAYER → DATA-AI-PLAT | `metric.certified` | `metric_definitions` | (existing `discovery_substring` 505 "Establish baseline metrics" 19954 L4, weak; propose REPLACE with "Manage business analysis" parent or "Analyze data" 439 L3) | 439 candidate | medium |
| 221 | KGP → DATA-AI-PLAT | `ontology.published` | `ontologies` | "Develop and manage information services" / "Manage product and service master data" 115 | 115 candidate | medium L3 |
| 693 | METRICS-LAYER → DATA-AI-PLAT | `metric_materialization.refreshed` | `metric_materializations` | "Analyze data" 439 / "Prepare data" 438 | 438 / 439 | medium |
| 697 | KGP → DATA-AI-PLAT | `kgp_ontology.imported` | `kgp_ontologies` | "Develop and manage information services" parent | needs lookup | medium |
| 715 | DQ → DATA-AI-PLAT | `dq_dimension.threshold_breached` | `dq_dimensions` | DQ-anchored PCF (DQ owns the L3 it ladders up to); defer to DQ audit's authoring | needs lookup | defer |
| 731 | DI → DATA-AI-PLAT | `schema_registry.schema_evolved` | `schema_registries` | "Manage product and service master data" 115 / Schema-mgmt L3 | 115 candidate | medium |
| 725 | DI → DATA-AI-PLAT | `pipeline_run.completed` | `pipeline_runs` | "Develop and execute IT resilience and continuity operations" 20749 / DI-anchored | 272 candidate | confident |

**Defer to Discover Pass 3 (custom processes needed)** for the modern-AI-specific events with no clean PCF cross-industry match: `ml_model.deployed` / `ml_model.drift_detected` / `feature_set.staleness_breached` / `ai_agent.deployed` / `data_product.published`. These may need custom Discover Pass 3 process rows because the APQC PCF cross-industry framework predates the data-product and MLOps concept. Tag the survivors as `agent_curated`, defer the rest with explicit deferral reason.

| Tag 14 high-confidence candidates + REPLACE 1 weak `discovery_substring`, defer ~5 to custom processes. | Insert/REPLACE rows in `handoff_processes` after PCF lookups land per the table above. |

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 (in-scope; B3 covers candidates) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (B9 event_category) | 1 (B1-S1) |
| BOUNDARY / Pairwise report-only | 3 (B1-S2, B1-S3, B1-S4) |
| **APQC TAGGING** | 1 (B1-H1, ~14 confident proposals + 5 deferrals) |
| MODULARIZATION ISSUES | 0 (refactor conversations live in Bucket 2) |
| **Bucket 1 total** | **5 items** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M1 hard-fail, the entire module split for DATA-AI-PLAT.** Zero `domain_modules` rows. With 8 capabilities Rule #14 mandates ≥2 full modules. Flagship vendors split the surface differently: Databricks splits Data Engineering / Data Warehousing / AI/ML / Governance; Snowflake splits Compute (Warehouse) / Data Sharing / AI Cloud Services / Apps; Microsoft Fabric splits Data Engineering / Data Science / Data Warehouse / Real-Time Intelligence / Power BI / Data Factory / Activator; Palantir Foundry splits Pipeline Builder / Workshop / AIP / Ontology. The smallest coherent module set that covers the 8 capabilities and the 9 masters is probably 4 modules: **DATA-AI-PLAT-LAKEHOUSE** (lakehouse_tables, data_pipelines; caps LAKEHOUSE-STORAGE + DATA-PIPELINE-ORCH), **DATA-AI-PLAT-SEMANTIC** (semantic_metrics, ontologies, knowledge_graph_entities, data_products; caps SEMANTIC-MODELING + UNIFIED-GOV-CATALOG + OPERATIONAL-DATA-APPS), **DATA-AI-PLAT-ML** (ml_models, feature_sets; cap ML-LIFECYCLE), **DATA-AI-PLAT-AI-AGENTS** (ai_agents; cap LLM-ORCH + NOTEBOOK-ANALYTICS). Alternative splits per vendor lens above. Whichever split lands, B1-S1 PATCHes, B1-S2 / B1-S3 source FK populates, lifecycle states (C1), role bundles (E), system skill module assignment (F2), and per-module Semantius scores (F5) all cascade from this decision. | Architectural intent decision, the audit cannot pick the module split without explicit user direction (every flagship vendor splits differently, and the choice has load-bearing downstream effects on lifecycle states, RBAC bundles, and 20 cross-domain handoff source FKs). | (a) 4-module split as proposed above; (b) coarser 2-module split (`DATA-AI-PLAT-DATA` + `DATA-AI-PLAT-AI`); (c) finer 6-module split mirroring Fabric (Engineering / Warehouse / Science / RT-Intel / Semantic / Agents); (d) deferred to a separate Phase A authoring session, this audit ships the structural findings only. |
| B2-S2 | **C1 hard-fail, lifecycle states for the 9 own masters.** No `data_object_lifecycle_states` on any master. The state machines vary in shape: `ml_models` has a workflow shape every vendor agrees on (registered → staging → production → archived, with drift / retraining gates); `data_pipelines` has run-state vs schedule-state (active / paused / decommissioned vs running / failed / succeeded); `ai_agents` is a deployment-shape (draft → published → deployed → retired); `lakehouse_tables` is more config-shaped (created → active → deprecated; the per-row data is the work, not the table); `data_products` follows the Foundry Ontology product-lifecycle (proposed → in_development → published → deprecated); `semantic_metrics` is config-shape (proposed → certified → deprecated); `ontologies` follows Foundry's ontology-version lifecycle (draft → released → deprecated); `feature_sets` lifecycle mirrors `ml_models` (registered → online → stale → archived); `knowledge_graph_entities` per-row is data not workflow, config-shape (created → linked → archived). The agent can propose a default lifecycle per master, but Rule #12 mandates per-master positive consideration with no auto-population of `data_objects.notes` for config-shape exemptions. | Lifecycle authorship is workflow-shape judgment; per Rule #12 the agent surfaces and the user decides. | Per-master decision: (a) author the proposed default state machine; (b) document the config-shape exemption (`lakehouse_tables`, `knowledge_graph_entities` plausibly); (c) skip authoring this round, surface at next audit. Per Rule #15 the config-shape exemption is RESCINDED from auto-populating `notes`; record exemption decisions in this audit file. |
| B2-S3 | **D1 alias coverage on 9 masters with 10 flagship vendors.** Zero `data_object_aliases` rows for `lakehouse_tables` ("Tables" in Databricks / Snowflake / BigQuery / Fabric OneLake; "Objects" / "Datasets" in Foundry), `ml_models` ("Models" / "Registered Models" / "Endpoints" across vendors), `feature_sets` ("Features" / "Feature Views" in Tecton / Hopsworks / SageMaker), `ai_agents` ("Agents" / "Assistants" / "Bots" / "Copilots"), `data_products` ("Data Products" / "Marketplace Listings"), `semantic_metrics` ("Metrics" / "Measures" / "Semantic Layer Objects"), `ontologies` ("Ontology" Foundry-specific; "Semantic Model" Fabric; "Knowledge Graph Schema" elsewhere), `knowledge_graph_entities` ("Entities" / "Nodes" / "Vertices"), `data_pipelines` ("Pipelines" / "Workflows" / "DAGs" / "Jobs"). The 9 aliases proposed map cleanly to vendor terminology in commerce-shaped surfaces per Rule #18. | Loading aliases requires per-vendor naming evidence (and Rule #15 forbids auto-populating `data_object_aliases.notes`). | (a) Load the 9 proposed aliases; (b) load a subset (user-specified); (c) defer to Phase B follow-up. |
| B2-S4 | **F2 / F4, system skill 45's module assignment and tool operation_kind audit.** Skill 45 (`data-ai-plat-system`) has `domain_module_id IS NULL`. Per Rule #17 every `domain_module_kind='full'` row gets one system skill 1:1; with 0 modules the existing skill cannot be assigned. Once B2-S1 lands the module split, one of three patterns applies: (a) re-target skill 45 to one of the new modules and create additional system skills (one per module); (b) delete skill 45 and re-author one system skill per module from scratch; (c) leave skill 45 as a "pre-split" placeholder and trust the deployer to fix it (not recommended; the floor is 1 skill per module). Rule #17 also requires `operation_kind` ↔ `data_object_id` pairing on each `skill_tools` row; the 9 tools currently on skill 45 are untested for that pairing. | Module split (B2-S1) gates the skill assignment; F4 needs a module skeleton before operation_kind invariants are checkable. | Resolution path coupled with B2-S1; user picks (a) / (b) / (c) after the module split decision. |

### Bucket 3, Phase 0 pending (speculative)

Pass 2 ran the semantic enumeration against the 10 flagship vendors named in the Summary plus tier-2 reference (Hugging Face Hub, Anyscale, Modal, MLflow, Weights & Biases, DataRobot, Domino Data Lab, H2O.ai). The compliance anchor is the **EU AI Act** (in force 2025-08-01, phased through 2027), plus **NIST AI RMF**, **ISO/IEC 42001** (AI management systems), **SR 11-7** (US Federal Reserve model risk), and **HIPAA / GDPR** for protected-data slices.

The subagent was not spawned (single-pass orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge.

#### MISSING (9) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module (per B2-S1 a) |
|---|---|---|
| `model_experiments` | MLflow, Databricks, Weights & Biases, SageMaker, Vertex AI all model "experiments" as a first-class master distinct from `ml_models`, an experiment captures a training run with hyperparams, metrics, artifacts. The current `ml_models` master conflates the registered model with its training experiments. | DATA-AI-PLAT-ML (or a new MLOPS domain, see candidate queue) |
| `model_endpoints` | SageMaker, Vertex AI, Databricks Model Serving, Foundry all model the deployed inference endpoint as a separate master (online / batch / streaming inference targets). Current catalog folds it into `ml_models`. | DATA-AI-PLAT-ML |
| `vector_indexes` | Databricks Vector Search, Snowflake Cortex Search, Fabric AI Search, Foundry AIP, SageMaker JumpStart all expose vector indexes as a separate master for similarity search and RAG. | DATA-AI-PLAT-AI-AGENTS |
| `prompt_templates` | Mosaic AI Agent Framework, Vertex Agent Builder, Snowflake Cortex, watsonx.ai Prompt Lab all model prompt templates as versioned first-class entities. | DATA-AI-PLAT-AI-AGENTS |
| `agent_tools` | Mosaic AI Agent Framework, Bedrock Agents, Vertex Agent Builder, watsonx.ai, Foundry AIP all expose "tools" the agent calls as a separate master (registered function / API endpoint the LLM can invoke). Distinct from Semantius's own `tools` master. | DATA-AI-PLAT-AI-AGENTS |
| `rag_retrievers` / `retrieval_configs` | Bedrock Knowledge Bases, Vertex RAG Engine, Databricks Vector Search, watsonx.ai RAG, LangChain-style retrievers all model the retrieval policy as a versioned master separate from the underlying index. | DATA-AI-PLAT-AI-AGENTS |
| `notebooks` | Databricks Notebooks, Hex, Foundry Code Workbook, Snowflake Notebooks, Vertex Workbench, Jupyter on AWS all model the notebook as a first-class master with versioning, schedule, and parameter binding. Backs the orphan `NOTEBOOK-ANALYTICS` capability that currently has no entity. | DATA-AI-PLAT-LAKEHOUSE or a new `DATA-AI-PLAT-NOTEBOOKS` module |
| `data_contracts` | Databricks Unity Catalog Data Contracts, Foundry Ontology Contracts, Snowflake Horizon, watsonx.data, Atlan, DataHub all model the producer / consumer SLA on a `data_products` as a separate master. | DATA-AI-PLAT-SEMANTIC |
| `lineage_events` | Unity Catalog lineage, OpenLineage, Foundry data lineage, Vertex AI lineage, every flagship surfaces lineage as queryable records, not just edges. Could materialize as a master if the catalog wants queryable lineage; otherwise it stays as `data_object_relationships`. | DATA-AI-PLAT-LAKEHOUSE |

#### MODULARIZATION (3) candidates

- **`DATA-AI-PLAT-AI-AGENTS` may warrant a split.** If `ai_agents` + `prompt_templates` + `agent_tools` + `rag_retrievers` + `vector_indexes` all land, that single module crosses the master count of three other modules combined and looks like a separate market. Candidate: split to `DATA-AI-PLAT-AGENT-RUNTIME` (ai_agents, agent_tools) + `DATA-AI-PLAT-RAG` (vector_indexes, prompt_templates, rag_retrievers). Possibly the agent runtime is itself a domain candidate (see queue).
- **`MLOPS` domain candidate (already queued in `_missing-domains.md`).** If `model_experiments` + `model_endpoints` get their own modules with their own lifecycle and RBAC, the shape is recognizable as the MLOPS market (Weights & Biases, MLflow, Comet, Domino). Whether MLOPS is folded into DATA-AI-PLAT-ML or promoted to a separate domain is a market-boundary call.
- **`NOTEBOOK-ANALYTICS` capability lacks a master.** Either add `notebooks` (preferred) or retire the dangling capability.

#### Regulation candidates (no `domain_regulations` row exists today)

- **EU AI Act** (mandatory for any EU-market AI provider; in force 2025-08-01).
- **NIST AI Risk Management Framework** (US guidance, de-facto industry baseline for AI risk).
- **ISO/IEC 42001** (international AI management system standard).
- **SR 11-7** (US Federal Reserve model risk management; mandatory for US banks).
- **GDPR Article 22** (right-to-explanation for automated decisions).
- **HIPAA** applicability for health-data masters in the lakehouse.

#### Candidate-domain queue contributions

This audit queued **4 candidate domains** in `audits/_missing-domains.md`:

- **MLOPS, ML Operations.** Evidence: Weights & Biases, MLflow, Comet ML, Domino Data Lab, Neptune.ai, ClearML, Iguazio, DataRobot MLOps.
- **AI-GOV, AI Governance.** Evidence: Credo AI, Holistic AI, Fairly AI, Monitaur, Saidot, IBM watsonx.governance, ServiceNow AI Control Tower.
- **FEATURE-STORE, Feature Store.** Evidence: Tecton, Feast, Hopsworks, Featureform, Databricks Feature Store, Vertex AI Feature Store, SageMaker Feature Store.
- **LLM-OPS, LLM Operations.** Evidence: LangSmith, Langfuse, Arize Phoenix, Helicone, Humanloop, PromptLayer, Weights & Biases Prompts, TruEra.

Each surface needs the SKILL Rule #2 point-solution test at triage time. AI-GOV is the strongest standalone market (specialist vendors, regulatory anchor in the EU AI Act, distinct buyer persona). MLOPS / LLM-OPS / FEATURE-STORE could plausibly fold into DATA-AI-PLAT modules rather than promote, depending on where the user wants the market boundary.

**Bucket 3 count summary:** 9 MISSING entity candidates + 3 MODULARIZATION candidates + 6 regulation candidates = **12 distinct decision items in this bucket** (regulations grouped, MISSING / MOD enumerated). Plus 4 candidate domains queued externally (counted in `_missing-domains.md`, not in Bucket 3).

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces `c:/tmp/DATA-AI-PLAT-phase0-<date>.md` confirming per-entity vendor coverage with citations) or eyeball-mode (user names which of the 12 to treat as confirmed and we proceed via Phase B inserts gated on B2-S1 module split landing first).

### Cross-bucket dependencies

- **B1-S1 is independent** of all other items; trivial PATCH on 8 trigger_events.
- **B1-S2 / B1-S3 (report-only B10b NULLs)** are routed to 11 other-domain audits (BI, DCG, CONV-AI, AIOPS, MDM, DQ, ITSM, DI, METRICS-LAYER, KGP), not DATA-AI-PLAT's fix. DATA-AI-PLAT's own-side FK populate is **gated on B2-S1**.
- **B1-S4 (consumer DMDOs on downstream domains)** is routed to receiving-domain audits, not DATA-AI-PLAT's fix.
- **B1-H1 (APQC tagging)** is **partially gated on B3** (the modern-AI-specific events `ml_model.deployed`, `feature_set.staleness_breached`, `ai_agent.deployed`, `data_product.published` may need Discover Pass 3 custom processes since the PCF cross-industry framework predates the data-product and MLOps concept).
- **B2-S1 (module split) gates B2-S2 (lifecycle states), B2-S3 (aliases live on data_objects already exists, INDEPENDENT), B2-S4 (system skill module assignment), the source-FK populate of B1-S2 / B1-S3, and B3 entity inserts (which need a target module to land in).**
- **B2-S2 (lifecycle states)** is gated on B2-S1.
- **B2-S3 (aliases)** is **independent** of B2-S1 (aliases live on `data_objects`, not on modules).
- **B2-S4 (system skill)** is gated on B2-S1.
- **B3 entity candidates** are **gated on B2-S1** (need target modules).
- **B3 regulation candidates** are **independent** of B2-S1 (regulations live at the domain layer).
- Buckets are otherwise resolvable in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, H1-top10`), or `skip`.

- **S1 (PATCH 8 trigger_events event_category):** trivial; no dependencies; safe to run now.
- **S2 / S3 (report-only B10b NULLs on 20 cross-domain handoffs):** schedules b1 audits on 10 distinct other domains (BI, DCG, CONV-AI, AIOPS, MDM, DQ, ITSM, DI, METRICS-LAYER, KGP). Not DATA-AI-PLAT's fix to write; this audit surfaces and the queue captures them.
- **S4 (report-only consumer DMDOs):** schedules 7 other-domain audits (DCG, DQ, BI, MDM, CONV-AI, AIOPS, ITSM). Same routing as above.
- **H1 (APQC tagging, ~14 confident proposals + ~5 deferrals):** load now or wait until B2-S1 lands modules? The tags don't strictly need modules (handoffs are taggable independent of module assignment), but the deferrals overlap with B3 modularization candidates.

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (module split):** (a) 4-module / (b) 2-module / (c) 6-module Fabric-style / (d) defer.
- **B2-S2 (lifecycle states per master):** per-master decision after B2-S1.
- **B2-S3 (9 aliases):** approve all / approve subset / defer.
- **B2-S4 (system skill module assignment):** (a) re-target + add / (b) delete + re-author / (c) leave (not recommended).

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 9 entity candidates + 3 modularization candidates + 6 regulation candidates to treat as confirmed. The 4 candidate domains in `_missing-domains.md` are a separate decision (promote / fold / reject per SKILL Rule #2).

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| BI | B10b: populate `target_domain_module_id` on inbound 151 (`semantic_metric.published`). Add `consumer` DMDO on `semantic_metrics` (230) in the consuming BI module. |
| DCG | B10b: populate `target_domain_module_id` on inbound 152 (`data_product.published`), 683 (`ml_model.deployed`), 685 (`feature_set.published`); populate `source_domain_module_id` on outbound 158 (`access_policy.updated` → DATA-AI-PLAT). Add `consumer` DMDOs on `data_products` (232), `ml_models` (228), `feature_sets` (229) in the catalog module(s). |
| CONV-AI | B10b: populate `target_domain_module_id` on inbound 153 (`ai_agent.deployed`). Add `consumer` DMDO on `ai_agents` (231) in the agent-runtime module. |
| AIOPS | B10b: populate `target_domain_module_id` on inbound 154 (`pipeline_run.failed`). Add `consumer` DMDO on `data_pipelines` (227). |
| MDM | B10b: populate `target_domain_module_id` on inbound 155 (`golden_record.synced`). Add `consumer` DMDO on `data_products` (232). |
| DQ | B10b: populate `target_domain_module_id` on inbound 156 (`quality_check.failed`), 684 (`feature_set.staleness_breached`); populate `source_domain_module_id` on outbound 715 (`dq_dimension.threshold_breached` → DATA-AI-PLAT). Add `consumer` DMDOs on `lakehouse_tables` (226), `feature_sets` (229). |
| ITSM | B10b: populate `target_domain_module_id` on 682 / 686 (currently 38, confirm correctness against the ML-drift incident routing). Add `consumer` DMDO on `ml_models` (228) in the consuming ITSM module if drift / evaluation alarms drive incident creation declaratively. |
| DI | B10b: populate `source_domain_module_id` on inbound 157 (`replication_load.completed`), 731 (`schema_registry.schema_evolved`), 725 (`pipeline_run.completed`). |
| METRICS-LAYER | B10b: populate `source_domain_module_id` on inbound 219 (`metric.certified`), 693 (`metric_materialization.refreshed`). |
| KGP | B10b: populate `source_domain_module_id` on inbound 221 (`ontology.published`), 697 (`kgp_ontology.imported`). |

### Decisions

_(empty until reviewed)_

### Fixes applied

_(empty until reviewed)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

### Fixes applied

Loader: [.tmp_deploy/fix_data_ai_plat_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_data_ai_plat_b1_technical_2026_05_31.ts)

| B1 ID | Action | Row counts |
|---|---|---|
| B1-S1 | PATCH `trigger_events.event_category` on 8 rows per audit-pre-mapped values (698→`lifecycle`, 699→`signal`, 700→`signal`, 701→`state_change`, 702→`lifecycle`, 703→`lifecycle`, 704→`state_change`, 705→`threshold`). | 8 PATCH |
| B1-H1 (subset) | INSERT `handoff_processes` for the 5 audit-confident PCF pairs only: 154→272, 682→272, 686→272, 158→273, 725→272. `proposal_source='agent_curated'`, `record_status` defaulted to `new` (Rule #1), `role` defaulted to `implements`, `notes` omitted (Rule #15). | 5 INSERT |

### Deferred B1 items

| B1 ID | Reason |
|---|---|
| B1-S2 | Outbound `source_domain_module_id` backfill on DATA-AI-PLAT's 11 outbound handoffs is gated on the B2-S1 module split (no `domain_modules` rows exist for this domain). `target_domain_module_id` is owed by the 7 receiving domains' own b1 audits (BI, DCG, CONV-AI, AIOPS, MDM, DQ, ITSM). |
| B1-S3 | `source_domain_module_id` on the 9 inbound handoffs is owed by source domains' b1 audits (DI, DCG, METRICS-LAYER, KGP, DQ). DATA-AI-PLAT's own-side `target_domain_module_id` is gated on B2-S1. |
| B1-S4 | Consumer DMDOs on downstream domains (DCG, DQ, BI, MDM, CONV-AI, AIOPS, ITSM) are each receiving domain's authoring task, not DATA-AI-PLAT's. |
| B1-H1 (remainder) | 9 audit candidates flagged "needs lookup", "candidate", or "medium" confidence on the PCF anchor (handoffs 151, 152, 153, 155, 156, 219 REPLACE, 221, 683, 684, 685, 693, 697, 731). Resolving each requires picking among multiple plausible L3/L4 PCF rows, judgment call surfaced to user. Plus ~5 modern-AI events the audit pre-deferred to Discover Pass 3 (custom processes for `ml_model.deployed`, `feature_set.staleness_breached`, `ai_agent.deployed`, `data_product.published` etc. that lack a clean cross-industry PCF analog). |

UI spot-checks:
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary
- **Current footprint:** **0 `domain_modules` rows** (M1 hard-fail persists from prior audit). 9 own masters at the `domain_data_objects` rollup: `lakehouse_tables` (226), `data_pipelines` (227), `ml_models` (228), `feature_sets` (229), `semantic_metrics` (230), `ai_agents` (231), `data_products` (232), `ontologies` (254), `knowledge_graph_entities` (255). 1 cross-domain consumer (`metric_definitions` 252, mastered by METRICS-LAYER). 8 capabilities (LAKEHOUSE-STORAGE, DATA-PIPELINE-ORCH, SEMANTIC-MODELING, ML-LIFECYCLE, LLM-ORCH, UNIFIED-GOV-CATALOG, OPERATIONAL-DATA-APPS, NOTEBOOK-ANALYTICS). 18 trigger_events, **all 18 carry valid `event_category`** (B1-S1 cured in the 2026-05-31 continuation loader). 11 outbound + 9 inbound cross-domain handoffs = 20 cross-domain handoffs total. 0 intra-domain cross-module handoffs (vacuous, zero modules). 0 lifecycle states authored on any of the 9 masters. 0 `data_object_aliases`. 1 system skill (`data-ai-plat-system`, id 45, `domain_module_id IS NULL`) with 9 `skill_tools` rows all `operation_kind='query'` paired with valid `data_object_id` (F3 floor, F4 invariant pass). 0 roles / 0 role_modules / 0 permissions / 0 role_permissions. 0 `domain_regulations`. **12 of 20 cross-domain handoffs APQC-tagged** (11 `agent_curated` from the continuation loader plus 1 legacy `discovery_substring` on 219); 8 remain untagged.
- **Bucket 1, in-scope agent-fixable:** 1 item (H1 remainder).
- **Bucket 2, surface-for-user judgment:** 4 items (S1-S4 carried, unchanged).
- **Bucket 3, Phase 0 pending:** 12 items (9 entity candidates + 3 modularization candidates, plus 6 regulation candidates as a side queue).

### Structural pass bands (Validate b1)
- **A1-A3:** Pass. 8 capabilities, no orphans.
- **M1:** **HARD FAIL persists.** 0 `domain_modules` rows. Rule #14 mandates at least 2 full modules for 8 capabilities. Cascades into M2-M7, B1-B8, B10-B12, C1-C2, D1, E1-E5, F1-F5, F7 all not-evaluable until B2-S1 lands a module split.
- **B5/B7/B9/B9b/B10b/B11/B12:** B9 (`event_category` populated) now passes on all 18 events. B10b inspectable across the 20 cross-domain handoffs: every row except 682 and 686 carries NULL on both `source_domain_module_id` and `target_domain_module_id`. 682 / 686 carry `target_domain_module_id=38` (ITSM module). DATA-AI-PLAT's own-side FK populate gated on B2-S1; counter-party owes the other side. B5 / B7 / B11 / B12 not evaluable without modules.
- **C1-C2:** **HARD FAIL persists.** Zero `data_object_lifecycle_states` on any of the 9 own masters. Rule #12 mandates lifecycle states for every `master + required` data_object not on a config-shape exemption. Surfaced to user under B2-S2.
- **D1:** Zero `data_object_aliases` on a domain whose flagship vendor naming varies (Foundry Objects vs Databricks Tables vs Snowflake Tables vs Fabric OneLake Tables for `lakehouse_tables`, etc.). Soft-fail carried as B2-S3.
- **E1-E5:** Vacuously not-evaluable (no modules, so no role bundles and no `<module>:<verb>_<entity>` permissions).
- **F1-F5:** F1 passes (system skill id 45 exists). F2 vacuously passes only because there are 0 modules; once B2-S1 resolves, F2 needs one system skill per module. F3 passes (9 skill_tools). F4 passes (all 9 tools are `query` with `data_object_id` populated, per Rule #17 invariant). F5 not computable (no modules, so no per-module Semantius score).
- **H1 (APQC tagging):** 12 of 20 handoffs tagged. 11 `agent_curated` (record_status `new`), 1 legacy `discovery_substring` on handoff 219 (record_status `new`). **0 record_status='approved'.** Volume against the 0.5N to 0.8N expectation (10 to 16 for N=20): 11 agent_curated is within band. Untagged remainder: 155, 156, 683, 684, 685, 221, 693, 697, 715 = 9 untagged.

### Bucket 1, in-scope confirmed gaps

| ID | Finding | Fix |
|---|---|---|
| B1-H1r | H1 remainder: 9 untagged handoffs. Handoffs 155 to MDM `golden_record.synced` (payload `data_products`), 156 to DQ `quality_check.failed` (payload `lakehouse_tables`), 683 to DCG `ml_model.deployed` (payload `ml_models`), 684 to DQ `feature_set.staleness_breached` (payload `feature_sets`), 685 to DCG `feature_set.published` (payload `feature_sets`), 221 from KGP `ontology.published` (payload `ontologies`), 693 from METRICS-LAYER `metric_materialization.refreshed` (payload `metric_materializations`), 697 from KGP `kgp_ontology.imported` (payload `kgp_ontologies`), 715 from DQ `dq_dimension.threshold_breached` (payload `dq_dimensions`, defer to DQ audit's authoring path). Plus the existing weak `discovery_substring` row on handoff 219 (`metric.certified` from METRICS-LAYER, currently tagged to process 505 "Establish baseline metrics" L4, weak). | Per-handoff PCF lookup at fix time. Tag survivors with `proposal_source='agent_curated'`, `record_status='new'`, `role='implements'`. Defer the modern-AI-specific events (`ml_model.deployed`, `feature_set.published`, `feature_set.staleness_breached`) to Discover Pass 3 custom processes if the PCF cross-industry framework has no clean L2/L3 anchor. Optionally REPLACE the 219 `discovery_substring` row with a stronger `agent_curated` row. |

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| MISSING | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL | 0 (B1-S1 cured in continuation) |
| BOUNDARY / Pairwise report-only | 0 in Bucket 1 this pass (counter-party owed; tracked under Report-only follow-ups) |
| APQC TAGGING | 1 (B1-H1r) |
| MODULARIZATION ISSUES | 0 (routed to Bucket 2) |
| **Bucket 1 total** | **1 item** |

### Bucket 2, surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | M1 hard-fail: the module split for DATA-AI-PLAT. Zero `domain_modules` rows. With 8 capabilities Rule #14 mandates at least 2 full modules. Smallest coherent split covering the 8 capabilities and 9 masters is 4 modules: DATA-AI-PLAT-LAKEHOUSE (lakehouse_tables, data_pipelines; LAKEHOUSE-STORAGE + DATA-PIPELINE-ORCH), DATA-AI-PLAT-SEMANTIC (semantic_metrics, ontologies, knowledge_graph_entities, data_products; SEMANTIC-MODELING + UNIFIED-GOV-CATALOG + OPERATIONAL-DATA-APPS), DATA-AI-PLAT-ML (ml_models, feature_sets; ML-LIFECYCLE), DATA-AI-PLAT-AI-AGENTS (ai_agents; LLM-ORCH + NOTEBOOK-ANALYTICS). Alternative splits per flagship vendor lens. Decision gates B1-S2 / B1-S3 source FK populate, lifecycle states (B2-S2), system skill module assignment (B2-S4), per-module Semantius scores (F5), and any B3 entity inserts. | Architectural intent: the audit cannot pick the module split without explicit user direction. | (a) 4-module split as proposed; (b) coarser 2-module split (DATA-AI-PLAT-DATA + DATA-AI-PLAT-AI); (c) finer 6-module split mirroring Fabric (Engineering / Warehouse / Science / RT-Intel / Semantic / Agents); (d) defer to a separate Phase A authoring session. |
| B2-S2 | C1 hard-fail: lifecycle states for the 9 own masters. The state machine shape varies per master (`ml_models` registered, staging, production, archived; `data_pipelines` active / paused vs running / failed / succeeded; `ai_agents` draft, published, deployed, retired; `lakehouse_tables` and `knowledge_graph_entities` plausibly config-shape; `data_products` proposed, in_development, published, deprecated; `semantic_metrics` proposed, certified, deprecated; `ontologies` draft, released, deprecated; `feature_sets` registered, online, stale, archived). Per Rule #12 the agent surfaces and user decides per master. Per Rule #15 the config-shape exemption is RESCINDED from auto-populating notes; exemption decisions land in this history file, not in `data_objects.notes`. | Workflow-shape judgment per master. | Per-master: (a) author proposed default state machine; (b) document config-shape exemption (`lakehouse_tables`, `knowledge_graph_entities` plausibly); (c) skip authoring this round, surface at next audit. |
| B2-S3 | D1 alias coverage. Zero `data_object_aliases` rows for the 9 own masters across vendors whose naming varies wildly: `lakehouse_tables` (Foundry Objects vs Databricks Tables vs Snowflake Tables vs Fabric OneLake Tables), `ml_models` (Models / Registered Models / Endpoints), `feature_sets` (Features / Feature Views), `ai_agents` (Agents / Assistants / Bots / Copilots), `data_products` (Data Products / Marketplace Listings), `semantic_metrics` (Metrics / Measures / Semantic Layer Objects), `ontologies` (Ontology / Semantic Model / Knowledge Graph Schema), `knowledge_graph_entities` (Entities / Nodes / Vertices), `data_pipelines` (Pipelines / Workflows / DAGs / Jobs). Loading aliases requires per-vendor naming evidence (Rule #18 commerce-shaped surface, allowed). Rule #15 forbids auto-populating `data_object_aliases.notes`. | Per-vendor evidence plus per-row approval; aliases are commerce-shaped (Rule #18 allowed list). Independent of B2-S1 since aliases live on `data_objects`. | (a) Load proposed 9 aliases; (b) load user-specified subset; (c) defer to Phase B follow-up. |
| B2-S4 | F2 / F4: system skill 45's module assignment. Skill 45 has `domain_module_id IS NULL`. Per Rule #17 every `module_kind='full'` row gets exactly one system skill 1:1. Once B2-S1 lands the split: (a) re-target skill 45 to one new module and create additional system skills (one per module); (b) delete skill 45 and re-author one system skill per module from scratch; (c) leave as pre-split placeholder (not recommended). Currently 9 skill_tools attached to skill 45 are all `query` + `data_object_id` populated, so F4 invariants pass on the current shape. | Gated on B2-S1 module split. | (a) / (b) / (c) coupled with B2-S1 decision. |

### Bucket 3, Phase 0 pending (speculative)

Candidates carried from the prior audit's flagship-vendor knowledge enumeration (10 flagships: Databricks, Snowflake, Microsoft Fabric, Google Cloud Data and AI, SageMaker Unified Studio, Palantir Foundry, IBM watsonx, Dataiku, Cloudera, SAP Business Data Cloud). Compliance anchors: EU AI Act, NIST AI RMF, ISO/IEC 42001, SR 11-7, HIPAA / GDPR Article 22.

#### MISSING (9) entity candidates
- `model_experiments` (MLflow, Databricks, W&B, SageMaker, Vertex AI) -> DATA-AI-PLAT-ML
- `model_endpoints` (SageMaker, Vertex AI, Databricks Model Serving, Foundry) -> DATA-AI-PLAT-ML
- `vector_indexes` (Databricks Vector Search, Snowflake Cortex Search, Fabric AI Search, Foundry AIP, SageMaker JumpStart) -> DATA-AI-PLAT-AI-AGENTS
- `prompt_templates` (Mosaic AI Agent Framework, Vertex Agent Builder, Snowflake Cortex, watsonx.ai Prompt Lab) -> DATA-AI-PLAT-AI-AGENTS
- `agent_tools` (Mosaic AI Agent Framework, Bedrock Agents, Vertex Agent Builder, watsonx.ai, Foundry AIP) -> DATA-AI-PLAT-AI-AGENTS
- `rag_retrievers` (Bedrock Knowledge Bases, Vertex RAG Engine, Databricks Vector Search, watsonx.ai RAG) -> DATA-AI-PLAT-AI-AGENTS
- `notebooks` (Databricks Notebooks, Hex, Foundry Code Workbook, Snowflake Notebooks, Vertex Workbench) -> DATA-AI-PLAT-LAKEHOUSE or new DATA-AI-PLAT-NOTEBOOKS
- `data_contracts` (Databricks Unity Catalog Data Contracts, Foundry Ontology Contracts, Snowflake Horizon, watsonx.data, Atlan, DataHub) -> DATA-AI-PLAT-SEMANTIC
- `lineage_events` (Unity Catalog lineage, OpenLineage, Foundry data lineage, Vertex AI lineage) -> DATA-AI-PLAT-LAKEHOUSE

#### MODULARIZATION (3) candidates
- DATA-AI-PLAT-AI-AGENTS warrants a split if `ai_agents` + `prompt_templates` + `agent_tools` + `rag_retrievers` + `vector_indexes` all land. Candidate: split into DATA-AI-PLAT-AGENT-RUNTIME + DATA-AI-PLAT-RAG.
- MLOPS domain candidate (queued in `_missing-domains.md`): if `model_experiments` + `model_endpoints` get their own modules with own lifecycle/RBAC, the shape matches the MLOPS market.
- NOTEBOOK-ANALYTICS capability lacks a master: either add `notebooks` (preferred) or retire the dangling capability.

#### Regulation candidates (side queue; no `domain_regulations` row exists today)
EU AI Act, NIST AI RMF, ISO/IEC 42001, SR 11-7, GDPR Article 22, HIPAA-for-PHI-slices.

#### Verification path
Vet via formal Phase 0 vendor research producing `c:/tmp/DATA-AI-PLAT-phase0-<date>.md` with per-entity vendor coverage citations, OR eyeball-mode (user names which to treat as confirmed). All B3 entity inserts gated on B2-S1 landing modules first. Regulation rows are independent.

### Cross-bucket dependencies
- **B1-H1r** independent of all other items; per-handoff PCF lookups + INSERT into `handoff_processes`. Partial dependency on B3 only for the modern-AI events that may require Discover Pass 3 custom processes.
- **B2-S1** gates B2-S2 (lifecycle), B2-S4 (skill assignment), per-module Semantius scores (F5), DATA-AI-PLAT's own-side `source_domain_module_id` populate on the 20 cross-domain handoffs, and all B3 entity inserts (need target modules).
- **B2-S2** gated on B2-S1.
- **B2-S3** independent of B2-S1 (aliases live on `data_objects`).
- **B2-S4** gated on B2-S1.
- **B3 entity candidates** gated on B2-S1.
- **B3 regulation candidates** independent.
- Buckets 1, 2, 3 otherwise resolvable in any order.

### Report-only follow-ups (owed by other domains)
Same routing as the 2026-05-30 audit; unchanged. BI, DCG, CONV-AI, AIOPS, MDM, DQ, ITSM, DI, METRICS-LAYER, KGP each owe `source_domain_module_id` / `target_domain_module_id` populate on their side of the 20 cross-domain handoffs once their own modules exist. DCG, DQ, BI, MDM, CONV-AI, AIOPS, ITSM each owe a `consumer` DMDO row declaring their dependency on the DATA-AI-PLAT payload entities they receive.

### Decisions
_(empty until reviewed)_

### Fixes applied
_(empty in this audit pass; the 2026-05-31 continuation loader cured B1-S1 and inserted 11 `agent_curated` handoff_processes rows)_

## 2026-06-02 Audit (modularization)

### Summary

Resolved the long-standing M1 hard-fail. DATA-AI-PLAT went from **0 `domain_modules`** to **4 `module_kind='full'` modules** built on B2-S1 option (a), the smallest coherent split covering all 8 capabilities and the 9 own masters. Scope was modularization only: modules + capability links + data_object assignment, reusing existing entities. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created.

Loader: [.tmp_deploy/modularize_data_ai_plat_2026-06-02.ts](../../.tmp_deploy/modularize_data_ai_plat_2026-06-02.ts) (idempotent; verified no-op on re-run).

Module ids assigned by the DB: LAKEHOUSE 223, SEMANTIC-CATALOG 224, ML 225, AI-AGENTS 226. All four carry `record_status='new'` (Rule #1) and empty `catalog_tagline` / `catalog_description` (deliberate M8/A4 buyer-copy gap, tracked under B1A-CATALOG-UX below).

### Module split

| Module (code) | Module id | Capabilities (id) | Data objects (id, role/necessity) |
|---|---|---|---|
| DATA-AI-PLAT-LAKEHOUSE (Lakehouse and Pipeline Engineering) | 223 | LAKEHOUSE-STORAGE (195), DATA-PIPELINE-ORCH (196), NOTEBOOK-ANALYTICS (202) | lakehouse_tables (226, master/required), data_pipelines (227, master/required) |
| DATA-AI-PLAT-SEMANTIC-CATALOG (Semantic Layer, Governance, and Data Products) | 224 | SEMANTIC-MODELING (197), UNIFIED-GOV-CATALOG (200), OPERATIONAL-DATA-APPS (201) | semantic_metrics (230, master/required), ontologies (254, master/required), knowledge_graph_entities (255, master/required), data_products (232, master/required), metric_definitions (252, consumer/required) |
| DATA-AI-PLAT-ML (Machine Learning Lifecycle) | 225 | ML-LIFECYCLE (198) | ml_models (228, master/required), feature_sets (229, master/required) |
| DATA-AI-PLAT-AI-AGENTS (LLM Orchestration and AI Agents) | 226 | LLM-ORCH (199) | ai_agents (231, master/required) |

### Counts

- domain_modules inserted: **4** (all `module_kind='full'`).
- domain_module_capabilities inserted: **8** (every one of the 8 domain capabilities placed in exactly one module; M4 satisfied; M6 satisfied, every module realizes >=1 capability).
- domain_module_data_objects inserted: **10** (9 own masters + 1 cross-domain consumer).
- Masters placed: **9**, each in exactly one module as master (M7 single-master satisfied): 226->223, 227->223, 230->224, 232->224, 254->224, 255->224, 228->225, 229->225, 231->226.
- Cross-domain consumer preserved: metric_definitions (252) at consumer/required (mastered by METRICS-LAYER); role NOT promoted.
- Empty modules: **0** (every module holds >=1 capability AND >=1 data_object).
- `notes` left empty on all DMC and DMDO rows (Rule #15).

### Placement notes

- **NOTEBOOK-ANALYTICS (202)** has no backing master today (the standing B3-MOD-NOTEBOOK-CAPABILITY / B3-ENT-NOTEBOOKS gap). It was placed in DATA-AI-PLAT-LAKEHOUSE, which holds the notebook-adjacent lakehouse compute (`lakehouse_tables`, `data_pipelines`), to satisfy M4 without leaving the capability orphaned. The module is non-empty on its own masters regardless; the capability itself still lacks a dedicated entity. Carried as B3 (unchanged).
- **metric_definitions (252)** consumer landed in DATA-AI-PLAT-SEMANTIC-CATALOG alongside the platform's own `semantic_metrics` master, the module that actually consumes the certified metric definition.
- The 4-module split intentionally folds the prior proposal's separate AI-AGENTS scope (vector_indexes / prompt_templates / agent_tools / rag_retrievers) into a single module since those entities do not yet exist; the B3-MOD-AGENTS-SPLIT refactor remains queued for if/when they land.

### Deferred gaps (carried, not filled this pass)

- **Per-module system skills (Rule #17 -> F2/F3).** With 4 full modules now live, the domain owes one system skill per module (currently only skill 45 `data-ai-plat-system` exists, `domain_module_id IS NULL`). Tracked as new B1A-SYSTEM-SKILLS. Supersedes the gated portion of B2-S4.
- **Catalog UX backfill (M8/A4).** All 4 modules ship with empty `catalog_tagline` / `catalog_description`. Tracked as new B1A-CATALOG-UX.
- **Source-side handoff FKs (B1B-S2-OUTBOUND-FK / B1B-S3-INBOUND-FK).** Now unblocked on the DATA-AI-PLAT side: `source_domain_module_id` on the 11 outbound and `target_domain_module_id` on the 9 inbound cross-domain handoffs can be populated now that modules exist. Out of scope for this modularization-only pass; re-pointed off B2-S1 to the live module ids.
- **Lifecycle states (B2-S2).** 0 lifecycle states on the 9 masters; not authored this pass (out of scope). Module ids now available to anchor `data_object_lifecycle_states.domain_module_id` when authored.
- **Aliases (B2-S3), regulations (B3-REG-CANDIDATES), entity candidates (B3-ENT-*), MLOPS/agents domain-boundary calls (B3-MOD-*).** All carried unchanged.
- **APQC tagging remainder (B1A-H1R).** Carried unchanged; independent of modularization.

## 2026-06-05 - b1a execution

Executed the agent-solvable `b1a` items against the live `domain_map` module for DATA-AI-PLAT (domain 129). All inserts omit `record_status` (DB default `new`, Rule #1/#4); no row stamped approved/pending/rejected. No `notes` column written (Rule #15). No em-dashes.

### B1A-SYSTEM-SKILLS - DONE (Phase S only); Phase P moved to b1b (blocked)

Phase S (per-module system skills, Rule #17) authored. Loader `.tmp_deploy/data_ai_plat_phase_s_2026_06_05.ts`.

- **PATCH `skills` id 45** (prior values: `skill_name='data-ai-plat-system'`, `domain_module_id=NULL`, description "System skill for Data and AI Platform - runtime workflows over the domain's master data, derived from masters + cross-domain handoffs."). Retargeted to `domain_module_id=224` (SEMANTIC-CATALOG), renamed `data_ai_plat_semantic_catalog_agent`, description updated to the module scope.
- **INSERT 3 `skills` rows** (`skill_type='system'`, `domain_id=129`): id 271 `data_ai_plat_lakehouse_agent` (module 223), id 272 `data_ai_plat_ml_agent` (module 225), id 273 `data_ai_plat_ai_agents_agent` (module 226).
- **PATCH 5 `skill_tools` rows** re-pointed `skill_id` from 45 to the owning module's skill (no tools created or deleted; the 9 existing query tools redistributed): 444 (query_lakehouse_tables) -> 271; 445 (query_data_pipelines) -> 271; 446 (query_ml_models) -> 272; 447 (query_feature_sets) -> 272; 449 (query_ai_agents) -> 273. Skill 45 retains 448/450/451/452 (semantic_metrics, data_products, ontologies, knowledge_graph_entities).
- Result: F1 clean (no legacy domain-level system skill), F2 = exactly one system skill per module (223->271, 224->45, 225->272, 226->273), F3 = each skill >=1 skill_tools, F4 = every tool `query` with a valid `data_object_id`.
- **Phase P NOT executed (blocked).** The action's "then Phase P (personas, role_modules, process_raci, lifecycle.process_id)" cannot run: `process_raci` gated assignments and `data_object_lifecycle_states.process_id` both require lifecycle states, and lifecycle authoring is blocked by user_decision B2-LIFECYCLE-SHAPE (per B1B-S2-LIFECYCLE). Also, all 9 masters are still `entity_type='unclassified'` (B13), which gates whether lifecycle is even required. Moved the Phase P residual to b1b under B1B-S-PHASE-P.

### B1A-CATALOG-UX - DONE

Loader `.tmp_deploy/data_ai_plat_catalog_ux_2026_06_05.ts`. Empty-guard applied per field; all 4 modules had empty `catalog_tagline` and `catalog_description`, so all 8 fields written (buyer voice, no vendor names, no em-dashes). No non-empty value overwritten.

- **PATCH `domain_modules`** 223, 224, 225, 226: `catalog_tagline` + `catalog_description` written into the empty fields. Prior value on every field = `''`. `record_status` untouched (carries the review signal).

### B1A-H1R - DONE (5 tagged + 1 replace; 4 deferred per action)

Loader `.tmp_deploy/data_ai_plat_h1r_2026_06_05.ts`. Per-handoff PCF lookup at fix time; all new rows `proposal_source='agent_curated'`, `role='implements'`, `record_status` omitted (`new`).

- **INSERT 5 `handoff_processes`**: 155 (golden_record.synced) -> process 771 "Maintain master data" (10252, L4); 156 (quality_check.failed) -> 1212 "Monitor and control business information" (20780, L4); 221 (ontology.published) -> 275 "Define and maintain business information architecture" (20770, L3); 693 (metric_materialization.refreshed) -> 1213 "Maintain business information feeds and repositories" (20781, L4); 697 (kgp_ontology.imported) -> 1209 "Maintain and evolve enterprise data and information architecture" (20775, L4).
- **REPLACE on handoff 219** (optional, taken): DELETED prior weak row id 125 (`proposal_source='discovery_substring'`, `process_id=505` "Establish baseline metrics" 19954 L4, `record_status='new'`, `role='implements'`); INSERTED agent_curated row 219 -> process 1203 "Establish data, information, and analytic governance" (20768, L4). [Prior row snapshot recorded here for reversibility.]
- **DEFERRED, no tag** (per action text): 683 (ml_model.deployed), 684 (feature_set.staleness_breached), 685 (feature_set.published) - modern-AI events with no clean cross-industry PCF anchor, route to Discover Pass 3 custom processes; 715 (dq_dimension.threshold_breached) - DQ owns the L3 anchor, defer to DQ audit's authoring. Carried as B3-H1R-DEFERRED.

### B1A-S2-OUTBOUND-FK - DONE

Loader `.tmp_deploy/data_ai_plat_handoff_fk_2026_06_05.ts`. Prior value on every patched column = NULL. Mapping = trigger_event's data_object -> owning module (B10b source rule), which matches the action text.

- **PATCH `handoffs.source_domain_module_id`** on 11 outbound: 151->224, 152->224, 153->226, 154->223, 155->224, 156->223, 682->225, 683->225, 684->225, 685->225, 686->225. Verified: 0 outbound DATA-AI-PLAT handoffs remain NULL on source_domain_module_id.

### B1A-S3-INBOUND-FK - DONE for 4 of 9; 5 SKIPPED (B10b no-candidate)

Same loader. `target_domain_module_id` = module that holds the payload data_object with a DMDO role (B10b target rule).

- **PATCH `handoffs.target_domain_module_id`** on 4 inbound whose payload is declared on a DATA-AI-PLAT module: 157 (lakehouse_tables, master on 223) -> 223; 158 (lakehouse_tables) -> 223; 219 (metric_definitions, consumer on 224) -> 224; 221 (ontologies, master on 224) -> 224. Prior value = NULL.
- **SKIPPED 5 inbound** - payload has NO `domain_module_data_objects` (and no legacy `domain_data_objects`) role on any DATA-AI-PLAT module, so B10b yields "no candidate"; patching would point the FK at a module that declares no role on the payload. These need a `consumer` DMDO row authored first (Phase B), which is a modeling decision outside this b1a action: 693 (metric_materializations 709), 697 (kgp_ontologies 742), 715 (dq_dimensions 312), 725 (pipeline_runs 434), 731 (schema_registries 438). Carried as B3-INBOUND-DMDO.

### Verification (re-queried after writes)

- `skills` system rows for domain 129: 4 (one per module 223/224/225/226). F2 satisfied.
- `skill_tools`: 9 rows redistributed across the 4 skills (2+4+2+1); no orphan.
- `handoffs.source_domain_module_id` NULL on DATA-AI-PLAT outbound: 0.
- `handoff_processes` on 155/156/219/221/693/697: all present, agent_curated.
- `domain_modules` 223/224/225/226 catalog_tagline/catalog_description: all non-empty.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
