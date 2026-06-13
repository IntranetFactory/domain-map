# DI audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 modules** (M-band hard-fail blocker); 7 masters (`pipeline_runs`, `source_connectors`, `sink_connectors`, `transformation_jobs`, `schema_registries`, `change_data_capture_streams`, `integration_flows`); 2 contributor rows (`lakehouse_tables` and `data_pipelines`, both mastered by DATA-AI-PLAT); 0 consumers; **0 capabilities** (A2 hard fail); 10 solutions (0 primary, 9 secondary, 1 partial; A3 quality fail on primary count); 14 trigger_events (ALL 14 with empty `event_category`); 9 outbound cross-domain handoffs + **0 inbound** (B10 vacuously passes); 0 intra-domain handoffs; 0 lifecycle states (B12 hard fail); 0 `data_object_aliases` (B11 soft fail); 0 intra-domain `data_object_relationships` among DI masters (B6 hard fail); 0 `users` edges (B7 hard fail); 0 cross-domain relationships on the contributor objects either; 1 legacy domain-level system skill (`skill_id=48 di-system`, `domain_module_id=null`) with 7 query-only skill_tools; 0 mutates, 0 workflow gates, 0 inbound, 0 compute, 0 side_effect; 0 roles; 0 role_modules; 0 role_permissions; business_function_domains has 2 rows (`Data Engineering` owner + `Software Engineering` contributor; C1 passes); 0 `domain_regulations` rows; 0 of 9 cross-domain handoffs carry APQC tags (H1 hard fail, headline coverage 0%); the legacy `di-system` skill carries only `query_*` tools so the Semantius `strict_score` is uncomputable per module (F5 rollup is blocked on F2).
- Vendor-surface basis (Phase 2 inline): Fivetran, Airbyte, Confluent (Connect + Schema Registry + ksqlDB), Striim, Qlik Replicate (Attunity), Talend Stitch, Informatica IDMC IICS, Matillion, dbt Labs (transformation layer), AWS Glue, Azure Data Factory, Google Cloud Dataflow / Datastream, Debezium (CDC OSS), Estuary Flow. Compliance specialists in scope: Striim and Qlik Replicate for regulated CDC + replication (audit-trail + change-set lineage for SOX / HIPAA), Confluent for governed streaming with schema enforcement.
- **Bucket 1 (in-scope, agent fixable):** 17 items (1 M-band hard fail + 1 A2 hard fail + 1 A3 quality fail + 1 trigger_events batch + 1 APQC top-level + 12 other structural items).
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 14 items (10 missing entities + 1 modularization proposal + 3 regulation candidates).
- **Candidates queued:** 4 (STREAMING-PLATFORM new; REVERSE-ETL, DATA-OBSERVABILITY, DATA-CONTRACTS re-surfaced).
- **Status set:** `feedback_needed`.

### Neighbor discovery (auto-derived from handoffs + DMDO; ranked by edge weight)

| Neighbor | Out | In | DMDO cross | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| DATA-AI-PLAT | 3 | 0 | 2 (DI contributor on `lakehouse_tables`, `data_pipelines`; both mastered by DATA-AI-PLAT) | 0 | 5 | Pairwise (full) |
| DCG | 2 | 0 | 0 | 0 | 2 | Lightweight |
| DLP | 1 | 0 | 0 | 0 | 1 | Lightweight |
| DSPM | 1 | 0 | 0 | 0 | 1 | Lightweight |
| DQ | 1 | 0 | 0 | 0 | 1 | Lightweight |
| ITSM | 1 | 0 | 0 | 0 | 1 | Lightweight |
| AIOPS | 0 | 0 | 1 (AIOPS consumer on `data_pipelines`; DI is contributor on the same master) | 0 | 1 | Lightweight |
| BI | 0 | 0 | 1 (BI consumer on `lakehouse_tables`; DI is contributor) | 0 | 1 | Lightweight |

The dominant pairwise finding is that **every outbound handoff carries `source_domain_module_id=NULL`** (and 8 of 9 also `target_domain_module_id=NULL`) because DI has zero `domain_modules` rows. Every B-band check that depends on module FKs is vacuously stuck until M1 is cured. Pairwise diff vs. each neighbor reduces to the same finding (B1-S1 below); per-neighbor reconciliation cannot resolve handoff module FKs without DI's own modularization.

### Pairwise reconciliation - DATA-AI-PLAT (weight 5; full 5-leg analysis)

DATA-AI-PLAT is by far the dominant neighbor: it canonically masters `lakehouse_tables` (226) and `data_pipelines` (227), the two objects DI is `contributor` on, and DI's 3 outbound handoffs to DATA-AI-PLAT (157 `lakehouse_tables.replication_load.completed`, 725 `pipeline_runs.pipeline_run.completed`, 731 `schema_registries.schema_evolved`) all land at DATA-AI-PLAT with both module FKs NULL.

| Leg | Status | Finding |
|---|---|---|
| 1. Producer master + lifecycle state (DI side) | FAIL | DI masters `pipeline_runs`, `schema_registries`; events fire on these, but neither has any lifecycle state row (B12 fail), so no `requires_permission` anchor exists. Handoff 157 fires on `lakehouse_tables` (id 226) which DI does NOT master (DATA-AI-PLAT does); B9 attribution defect candidate (the publisher of the event is not the canonical master). |
| 2. Trigger event row | PARTIAL | trigger_event 105 (`replication_load.completed`, data_object_id=226) exists but the event mis-attributes the source to DATA-AI-PLAT's master; if the event semantically represents "DI replicated a load into DATA-AI-PLAT's table", the data_object_id should arguably be a DI-mastered object (e.g. `pipeline_runs`) and the payload a DATA-AI-PLAT-mastered one. Surface in B2-S5. |
| 3. Handoff row with both module FKs | FAIL | All 3 outbound rows (157, 725, 731): `source_domain_module_id=NULL` (DI has no modules), `target_domain_module_id=NULL` (no DATA-AI-PLAT module attribution either). Both halves require DI's M-band fix first. |
| 4. Consumer DMDO on the target (DATA-AI-PLAT side) | INFO | DATA-AI-PLAT-mastered objects (226, 227) are consumed by BI and DQ and AIOPS via `domain_data_objects`, but DATA-AI-PLAT's per-module DMDO rows on these objects are out of scope for this audit; report-only for DATA-AI-PLAT's own pass. |
| 5. Cross-domain `data_object_relationships` | FAIL | Zero rows between DI masters (434-440) and DATA-AI-PLAT masters (226, 227). At minimum: `pipeline_run loads lakehouse_table`, `transformation_job materializes lakehouse_table`, `schema_registry governs lakehouse_table`, `change_data_capture_stream feeds lakehouse_table` should exist. All MISSING-RELATIONSHIP; load on DI's side. |

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (M / A / B / F / H)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail) - BLOCKING** | `domain_modules?domain_id=eq.89` returns zero rows. DI has no deployable unit. Every downstream concern (DMDO attribution, lifecycle-state realization, workflow-gate permissions, system-skill scope, role bundles, handoff `source_domain_module_id`, intra-domain handoffs) is gated on M-band. Capability count is currently 0 (see B1-S2), but the 7 DI-mastered objects + 2 contributor edges + 9 outbound handoffs imply at least 2 deployable surfaces. Proposed module split per market practice (see Bucket 3 vendor evidence): (a) `DI-INGEST-CDC` masters `source_connectors`, `change_data_capture_streams`, `pipeline_runs` (the ingestion + replication runtime surface; Fivetran / Airbyte / Striim / Debezium territory); (b) `DI-TRANSFORM-DELIVER` masters `transformation_jobs`, `sink_connectors`, `schema_registries`, `integration_flows` (the ELT + sink + governed-schema + orchestration surface; dbt / Matillion / Glue / Dataflow territory). Both modules consume the DATA-AI-PLAT-mastered `lakehouse_tables` and `data_pipelines`. | Phase A load: create 2 `domain_modules` rows with `module_kind='full'`, author the missing capabilities (B1-S2) and link them via `domain_module_capabilities`, then migrate the 7 master DMDO rows + 2 contributor rows from legacy `domain_data_objects` to `domain_module_data_objects` per the split. Lifecycle states, workflow-gate permissions, system-skill split (Rule #17 one `system` skill per module) follow in the same load. |
| B1-S2 | **A2 (hard fail)** | `capability_domains?domain_id=eq.89` returns zero rows. Per Rule #14 a domain with the data-object surface DI carries should have 5-8 capabilities. Proposed set (8): `DI-INGEST-BATCH` (Fivetran / Airbyte / Stitch batch ELT), `DI-INGEST-CDC` (Debezium / Striim / Qlik Replicate change-data-capture), `DI-STREAMING-INGEST` (Kafka Connect / Confluent / Estuary Flow), `DI-TRANSFORM-ELT` (dbt / Matillion in-warehouse transformation), `DI-SCHEMA-EVOLUTION` (Schema Registry / Iceberg schema management), `DI-PIPELINE-ORCH` (Airflow / Prefect / Dagster orchestration), `DI-LINEAGE-EMIT` (OpenLineage emit to DCG / DATA-AI-PLAT), `DI-CONNECTOR-LIBRARY` (the catalog of pre-built source / sink connectors). | Load 8 `capabilities` rows + 8 `capability_domains` rows + 8 `domain_module_capabilities` rows (mapping per the M1 split: `DI-INGEST-BATCH`, `DI-INGEST-CDC`, `DI-STREAMING-INGEST`, `DI-CONNECTOR-LIBRARY` to module a; `DI-TRANSFORM-ELT`, `DI-SCHEMA-EVOLUTION`, `DI-PIPELINE-ORCH`, `DI-LINEAGE-EMIT` to module b). |
| B1-S3 | **A3 (quality fail)** | 10 solution_domains rows but 0 carry `coverage_level='primary'` and 9 of 10 are `secondary`. The flagship pure-play DI vendors (Fivetran, Airbyte, dbt Labs, Confluent, Striim, Qlik Replicate, Matillion, Informatica IDMC IICS) are NOT in `solution_domains` at all; the 10 rows are diversified data-AI suites (Foundry, Databricks, Snowflake, Fabric, watsonx, Cloudera, SAP BDC, Dataiku, GCP Data and AI, SageMaker Unified Studio). Per A3 floor: every domain needs >=1 `primary` solution. | Load missing flagship DI vendor `solutions` rows where they don't exist in the catalog (Fivetran, Airbyte, dbt Labs, Confluent Platform, Striim, Qlik Replicate, Matillion, Informatica IDMC) and link with `coverage_level='primary'`. Re-evaluate the 10 existing suite-level rows: most should drop to `coverage_level='partial'` since they include DI as one feature among many. |
| B1-S4 | **B-band - trigger_events.event_category** | ALL 14 events under DI masters have empty `event_category` (Rule #13 enum: `lifecycle / state_change / threshold / signal`). Mapping: 762 `pipeline_run.completed` -> `state_change`; 763 `pipeline_run.sla_breached` -> `threshold`; 764 `source_connector.disconnected` -> `state_change`; 765 `source_connector.added` -> `lifecycle`; 766 `sink_connector.added` -> `lifecycle`; 767 `sink_connector.write_failed` -> `state_change`; 768 `transformation_job.failed` -> `state_change`; 769 `transformation_job.published` -> `lifecycle`; 770 `schema_registry.schema_evolved` -> `state_change`; 771 `schema_registry.breaking_change_attempted` -> `signal`; 772 `change_data_capture_stream.lag_threshold_breached` -> `threshold`; 773 `change_data_capture_stream.paused` -> `state_change`; 774 `integration_flow.activated` -> `lifecycle`; 775 `integration_flow.error_burst` -> `threshold`. | Batch PATCH 14 events with the mapping above. |
| B1-S5 | **B6 (hard fail)** | Zero intra-domain `data_object_relationships` rows among the 7 DI masters. Workflow demands: `transformation_job materialized_by pipeline_run`, `source_connector feeds pipeline_run`, `sink_connector receives pipeline_run`, `change_data_capture_stream produces pipeline_run`, `schema_registry validates transformation_job`, `schema_registry governs sink_connector`, `integration_flow orchestrates pipeline_run`, `integration_flow chains transformation_job`. | Draft 7-8 intra-domain relationship rows (verb + is_required + owner_side) and load via the cluster-drafts pattern. |
| B1-S6 | **B7 (hard fail)** | Zero edges between `users` (id 748) and any DI master. Every master needs at least one user-typed actor: `pipeline_runs` (operator, error_reviewer); `source_connectors` (configurer, owner); `sink_connectors` (configurer, owner); `transformation_jobs` (author, approver); `schema_registries` (schema_steward, breaking_change_reviewer); `change_data_capture_streams` (operator); `integration_flows` (author, operator). Rule #10: built-in `users` edges are first-class. | Load 8-10 `users -> master` relationship rows with verb-shape names (`authors_transformation_job`, `configures_source_connector`, `stewards_schema_registry`, `reviews_breaking_change`, `operates_change_data_capture_stream`, `authors_integration_flow`). |
| B1-S7 | **B8 (outbound cross-domain relationships)** | 9 outbound `handoffs` rows but zero `data_object_relationships` rows linking DI masters to other-domain masters. Required edges (per the handoff payloads): `pipeline_run loads lakehouse_table` (-> DATA-AI-PLAT), `pipeline_run loads data_pipeline` (-> DATA-AI-PLAT), `schema_registry governs lakehouse_table` (-> DATA-AI-PLAT), `pipeline_run notifies data_quality_check` (-> DQ via `pipeline_runs` payload; verb candidate `signals_freshness_to`), `source_connector triggers data_asset` (-> DCG via `data_assets` payload; verb candidate `registers_data_asset_with`), `source_connector triggers dspm_scan` (-> DSPM via `source_connectors` payload), `sink_connector triggers dlp_review` (-> DLP via `sink_connectors` payload), `pipeline_run informs service_incident` (-> ITSM via `service_incidents` payload). The intra-DI payload `pipeline_runs` should also surface a relationship to DCG-mastered `data_assets`. | Draft 7-8 cross-domain relationship rows; load via the cluster-drafts pattern. |
| B1-S8 | **B9 (partial)** | 14 trigger_events exist but only 9 have `handoffs` rows pointing at a cross-domain target. Specifically, no handoff currently covers: `source_connector.disconnected` (764; likely fans out to ITSM for ticket, OBS for alert); `transformation_job.failed` (768; ITSM + DQ); `transformation_job.published` (769; DCG for lineage); `schema_registry.breaking_change_attempted` (771; DCG + DQ + GRC); `change_data_capture_stream.lag_threshold_breached` (772; OBS + DQ); `change_data_capture_stream.paused` (773; ITSM + OBS); `integration_flow.activated` (774; DCG for lineage); `integration_flow.error_burst` (775; OBS + ITSM). | After B1-S1, draft missing handoff rows with both module FKs populated; load via standard handoffs loader. |
| B1-S9 | **B9b (gated on B1-S1)** | With 0 modules today, no intra-domain cross-module handoffs are modellable. Once B1-S1 splits DI into 2 modules, expect intra-domain handoffs for at least: `source_connector.added` (DI-INGEST-CDC -> DI-TRANSFORM-DELIVER, registers an upstream feed); `change_data_capture_stream.paused` (DI-INGEST-CDC -> DI-TRANSFORM-DELIVER, downstream transformation runs see stale data); `schema_registry.schema_evolved` (DI-TRANSFORM-DELIVER -> DI-INGEST-CDC, source-side schema reconciliation); `transformation_job.published` (DI-TRANSFORM-DELIVER -> DI-INGEST-CDC, downstream may need new column ingest). | Draft once modules exist. `integration_pattern='lifecycle_progression'`, `friction_level='low'`. |
| B1-S10 | **B10b (this domain's own side)** | All 9 outbound handoffs carry `source_domain_module_id=NULL` because DI has zero modules (gated on B1-S1). Inbound is vacuously fine (0 inbound). After B1-S1, the source-side backfill is deterministic: source_domain_module_id = the module that masters the trigger_event's data_object_id (e.g. handoff 725 / 726 / 728 fire on `pipeline_runs` -> DI-INGEST-CDC; handoff 731 fires on `schema_registries` -> DI-TRANSFORM-DELIVER; handoff 729 fires on `source_connectors` -> DI-INGEST-CDC; handoff 730 fires on `sink_connectors` -> DI-TRANSFORM-DELIVER; handoff 727 fires on `data_pipelines` which DI does not master - this is the B9 attribution defect noted in B1-S15). | After B1-S1, run the standard backfill recipe. |
| B1-S11 | **B11 (soft fail)** | Zero `data_object_aliases` rows for any DI master. Vendor terminology is fragmented (Fivetran "Connectors", "Connector Runs"; Airbyte "Sources", "Destinations", "Sync Jobs"; dbt "Models", "Runs"; Confluent "Connectors", "Tasks"; Striim "Replication Streams"; Qlik "Source Endpoints", "Target Endpoints"). Aliases help cross-vendor lookup. Cross-industry equivalents: `pipeline_runs <-> sync_jobs <-> connector_runs`, `source_connectors <-> sources <-> source_endpoints`, `sink_connectors <-> destinations <-> target_endpoints`, `transformation_jobs <-> dbt_models <-> ksql_queries`, `change_data_capture_streams <-> replication_streams <-> change_streams`. | Draft 12-18 alias rows total (2-3 per master) once B1-S1 lands. |
| B1-S12 | **B12 (hard fail)** | Zero `data_object_lifecycle_states` rows for any DI master. Per Rule #12 every workflow-bearing master needs a state machine; workflow-gate permissions materialize from those states. Expected machines: `pipeline_runs (queued -> running -> succeeded | failed)`; `source_connectors (configured -> active -> paused -> retired)`; `sink_connectors (configured -> active -> paused -> retired)`; `transformation_jobs (draft -> in_review -> approved -> published -> retired)`; `schema_registries (registered -> versioned -> evolved -> deprecated)`; `change_data_capture_streams (initializing -> active -> paused -> stopped)`; `integration_flows (draft -> active -> error_burst -> paused -> retired)`. | Draft 7 state machines after B1-S1 lands (module ids needed for the optional `domain_module_id` realization column on each gated state). |
| B1-S13 | **B4 (soft fail)** | Pattern flags on all 7 masters are `false` by default; no positive audit pass recorded. Candidates: `transformation_jobs.has_submit_lock=true` (published transformation jobs typically freeze at `published` so dependent consumers have a stable surface); `transformation_jobs.has_single_approver=true` (single-approver workflow is common in dbt / Matillion governance); `schema_registries.has_submit_lock=true` (schemas freeze at versioned state, evolution authors a NEW version rather than mutating the prior). | Decisions belong in Bucket 2 (B2-S2). |
| B1-S14 | **F1 (hard fail)** | Skill 48 (`di-system`, `skill_type='system'`, `domain_module_id=NULL`) is a legacy domain-level system skill. Once B1-S1 lands, F1 mandates retiring this legacy row in favor of per-module system skills (one per module per Rule #17). The legacy skill's 7 query tools (`query_pipeline_runs`, `query_source_connectors`, `query_sink_connectors`, `query_transformation_jobs`, `query_schema_registries`, `query_change_data_capture_streams`, `query_integration_flows`) can stay in the `tools` catalog; the skill_tools junctions move to the new module-level skills, then DELETE the legacy skill row and its `skill_tools` rows. | After B1-S1, author: `di_ingest_cdc_agent` (skill_type=system, domain_module_id=<ingest-cdc id>), `di_transform_deliver_agent` (skill_type=system, domain_module_id=<transform-deliver id>); split the 7 query tools across them per data_object_id, then DELETE skill 48 and its 7 skill_tools rows. |
| B1-S15 | **F3/F4/F7 (gated on F2)** | Once two module-level system skills exist, each needs >=1 skill_tools row with mix of `required` + `optional` (typical 5-20). Today's surface is 100% `query` operations; the strict_score and operational_score are uncomputable per module (F5 rollup). Phase-S floor: at least one `mutate` per master (e.g. `update_pipeline_run_status`, `pause_change_data_capture_stream`, `publish_transformation_job`, `version_schema_registry`), at least one `side_effect` per module (e.g. `trigger_pipeline_run`, `roll_back_transformation_job`), at least one `inbound` primitive (e.g. `receive_cdc_event_webhook`), at least one `fetch` (e.g. `fetch_source_schema_from_external_api`). Channel primitives go through `notify_person` / `notify_team` per F7. | Phase-S load alongside B1-S14 once modules exist. F4 invariant: `query`/`mutate` set `data_object_id`; `fetch`/`side_effect`/`compute` NULL; `inbound` optional. |
| B1-S16 | **E1/E2/E4 (gated on B1-S1)** | Zero `roles` rows for any DI-affiliated business function (Data Engineering id=65), zero `role_modules`, zero `role_permissions`. Once 2 modules exist (M2 satisfied), E1 mandates >=3 distinct roles touching both modules. Likely roles: `DATA-ENGINEER` (primary across both modules; pipelines and transformations), `DATA-PLATFORM-ADMIN` (primary on DI-TRANSFORM-DELIVER for schema-registry stewardship, secondary on DI-INGEST-CDC), `INTEGRATION-OPERATOR` (primary on DI-INGEST-CDC for connector / CDC operations, secondary on DI-TRANSFORM-DELIVER), and a cross-cutting `DATA-PLATFORM-VIEWER` for read-only consumption. | Author after B1-S1. Use function-scoped naming. Load with explicit `interaction_level` per E3. |

#### APQC TAGGING (B1-S17 H1 hard fail)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S17 | **APQC TAGGING (H1 hard fail)** | 9 cross-domain outbound handoffs + 0 inbound = 9 total cross-domain handoffs; ZERO carry tags. Volume expectation per SKILL: 0.5N to 0.8N agent_curated tags for N=9 -> 5-7 tags. Proposed sub-table below. | Author the agent_curated rows below. |

The DI domain's outbound events are predominantly about IT-side data-platform operations: pipeline lifecycle, schema evolution, connector registration. The strongest L3 anchor is APQC PCF "Manage information" (external_id 20765 / id 50, L2), with the L3 child "Manage business information" (external_id 20779 / id 277) and the L4 "Maintain and evolve enterprise data and information architecture" (external_id 20775 / id 1209) being the best-fit anchors for schema-evolution and lineage-emitting events. The pipeline-failure-to-ITSM handoff anchors at "Triage IT service delivery incidents" (external_id 20903 / id 1299, L4). The DCG / DSPM / DLP / DQ inbound-from-DI events anchor at "Manage business information" (20779) on the target side; DI's perspective is "publishing information assets and contracts."

| handoff_id | direction | source -> target | trigger_event | payload | Proposed PCF (name / ext_id / L) | confidence |
|---|---|---|---|---|---|---|
| 157 | out | DI -> DATA-AI-PLAT | replication_load.completed | lakehouse_tables | Manage business information / 20779 / L3 | confident L3 |
| 725 | out | DI -> DATA-AI-PLAT | pipeline_run.completed | pipeline_runs | Manage business information / 20779 / L3 | confident L3 |
| 731 | out | DI -> DATA-AI-PLAT | schema_registry.schema_evolved | schema_registries | Maintain and evolve enterprise data and information architecture / 20775 / L4 | confident L4 |
| 259 | out | DI -> DCG | data_asset.discovered | data_assets | Manage business information / 20779 / L3 | confident L3 |
| 726 | out | DI -> DCG | pipeline_run.completed | pipeline_runs | Manage business information / 20779 / L3 | confident L3 |
| 728 | out | DI -> DQ | pipeline_run.sla_breached | pipeline_runs | Manage business information / 20779 / L3 (DQ-side anchor; DI is publishing the freshness signal) | confident L3 |
| 729 | out | DI -> DSPM | source_connector.added | source_connectors | Develop and manage IT security, privacy, and data protection / 20735 / L3 (security-side anchor; new source surface needs scan) | confident L3 |
| 730 | out | DI -> DLP | sink_connector.added | sink_connectors | Develop and manage IT security, privacy, and data protection / 20735 / L3 | confident L3 |
| 727 | out | DI -> ITSM | pipeline_run.failed | service_incidents | Triage IT service delivery incidents / 20903 / L4 (target-side anchor; pipeline failure routes to ITSM triage) | confident L4 |

Sub-counts: 9 fresh `agent_curated` proposals + 0 upgrades + 0 deferred. All confident at L3 or L4; the meets-or-exceeds-target volume is 9 / 9 (100% tagging rate, exceeding the 0.5N to 0.8N expectation).

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1, A2, A3, B-band events, B6, B7, B8, B9, B9b, B10b, B11, B12, B4, F1, F3/F4/F7, E-band) | 16 |
| APQC TAGGING (1 top-level Bucket 1 item per SKILL convention; sub-table proposes 9 rows) | 1 |
| **Bucket 1 total** | **17** |

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module split topology** (B1-S1 prerequisite). Proposed split is `DI-INGEST-CDC` (sources + CDC + replication runtime) vs. `DI-TRANSFORM-DELIVER` (transformation + sinks + schema + orchestration). Alternatives include: (b) per-runtime split (`DI-BATCH-ELT`, `DI-STREAMING`, `DI-CDC`, `DI-TRANSFORM`); (c) per-vendor-cluster (Fivetran/Airbyte style vs. Confluent/Striim style vs. dbt-style transformation); (d) hybrid: 2 full modules + 1 starter `DI-LITE` for small-org Fivetran-only deployments. | Modularization design choice with downstream effects on capability assignment, role bundles, and Phase-B + Phase-S load shape. | (a) Ingest-vs-Deliver split (recommended for vendor neutrality); (b) Per-runtime split (4 modules); (c) Per-vendor-cluster (3 modules); (d) Hybrid 2-modules + `DI-LITE` starter. |
| B2-S2 | **Pattern-flag positive re-evaluation (B1-S13)**. Per-flag decisions: `transformation_jobs.has_submit_lock=?`; `transformation_jobs.has_single_approver=?`; `schema_registries.has_submit_lock=?`. Per Rule #15 the consideration cannot be recorded in `notes`; it lives in this audit conversation. | Pattern flags are workflow-shape judgments the user owns; false-by-default is not a positive answer. | Per-flag yes/no from user; load via PATCH after each decision. |
| B2-S3 | **B9 attribution defect on handoff 727** (`pipeline_run.failed` -> ITSM). The trigger_event 96 references `data_pipelines` (227, mastered by DATA-AI-PLAT) but the handoff payload is `service_incidents` (47, mastered by ITSM). The event semantically belongs to DI (pipeline run failure) but the trigger_event's `data_object_id` points at DATA-AI-PLAT's master. Either (a) the event is correctly anchored on `data_pipelines` and DI should be a `contributor` on the event, or (b) a new DI-side trigger_event should be authored for `pipeline_runs.failed` with `data_object_id=434` and the handoff re-pointed. | The attribution choice has implications for who owns the lifecycle state that fires the event (DATA-AI-PLAT's `data_pipelines` state machine vs DI's `pipeline_runs` state machine) and where the failure is surfaced (DI-side or DATA-AI-PLAT-side). | (a) Keep existing attribution; document DI as contributor on event 96; (b) Author a new DI-side event `pipeline_run.failed` (data_object_id=434) and re-point handoff 727 to it. |
| B2-S4 | **Compliance / regulatory scope for DI** (B1-S2 + Bucket 3 regulation candidates). DI's `certification_required=false` today and zero `domain_regulations` rows. The data-movement-through-DI workflow has real regulatory exposure (cross-border data transfer under GDPR Chapter V; HIPAA ePHI ingress; SOX-relevant financial-data CDC streams; PCI-DSS cardholder-data masking-at-ingest), and Striim / Qlik Replicate compete on this surface. | Whether DI itself is in-scope for the regulation, vs. only DLP / DSPM / DCG being in-scope while DI passes the data through unchanged, is a real catalog policy decision. Differences: if DI in-scope, expect `domain_regulations` rows + new `dlp_*` integration points + audit-trail entities; if not, DI stays substrate-only and the regulations attach downstream. | (a) DI in-scope for GDPR / HIPAA / SOX (load 3 `domain_regulations` rows); (b) Only HIPAA / SOX in-scope (CDC streams carry PHI / financial-record state); (c) None in-scope, DI is substrate-only. |
| B2-S5 | **Trigger-event source attribution defect** (event 105 / handoff 157). Trigger_event 105 (`replication_load.completed`, data_object_id=226 / `lakehouse_tables`) fires from DI but the event's data_object is DATA-AI-PLAT's master. This is the same shape as B2-S3 but for a different handoff. The "correct" attribution is ambiguous: is the event a DATA-AI-PLAT lifecycle event (a lakehouse table received a new load) or a DI lifecycle event (a pipeline-run completed and that's why the table now has new data)? Flagship vendor behavior varies; Snowflake's Snowpipe fires events on TABLE; Fivetran fires on CONNECTOR-RUN. | The attribution choice changes who owns the event's lifecycle state and which side's B9b coverage the event counts toward. | (a) Keep DATA-AI-PLAT attribution; DI is a contributor on event 105; (b) Author a parallel DI-side event `pipeline_run.completed_load` (data_object_id=434); (c) Replace event 105 with a DI-side event pointing at `pipeline_runs`. |

### Bucket 3 - Phase 0 pending (speculative; vendor knowledge basis)

The DI catalog footprint covers ingest, CDC, transformation, sink, schema registry, and orchestration but lacks: (1) **connector-task / sync-job granularity** below the connector level (the per-execution unit); (2) **lineage event records** as first-class entities (the OpenLineage event log); (3) **data-contract entities** distinct from schema registries; (4) **stream topics / partitions** as first-class for streaming runtimes; (5) **secrets / connection credentials** as governed entities; (6) **transformation models** (dbt-style) distinct from transformation jobs (a job is an execution; a model is the published artifact); (7) **catalog of supported connectors** as a discoverable inventory; (8) **deployment environments** (dev / staging / prod) per integration flow; (9) **incident records** that aggregate multiple alerts; (10) **data contract tests** distinct from schema validation.

#### MISSING (10) - proposed module assignment

| Entity | Proposed module | Vendor evidence |
|---|---|---|
| `connector_tasks` | DI-INGEST-CDC | Fivetran "Sync Tasks", Airbyte "Job Attempts", Confluent Connect "Task Instances". The per-execution work unit below a connector; today's `pipeline_runs` aggregates these but flagships expose per-task granularity. |
| `data_lineage_events` | DI-TRANSFORM-DELIVER | OpenLineage "RunEvents", Marquez events, dbt Cloud lineage log, Atlan / DataHub lineage emitter. First-class lineage emit log distinct from `data_pipelines` itself. |
| `data_contracts` | DI-TRANSFORM-DELIVER | Gable.ai data contracts, PayPal data-contract-cli, Buf schema contracts, Confluent Cloud Stream Catalog contracts. Distinct from `schema_registries`: a contract is a producer-consumer agreement (SLA + schema + tests + ownership); a registry holds schemas. |
| `stream_topics` | DI-INGEST-CDC | Confluent "Topics", AWS MSK "Topics", Redpanda "Topics". For streaming runtimes, the topic is the lifecycle-bearing master (created, partitioned, retention-policied, retired). |
| `connection_credentials` | DI-INGEST-CDC (config-shape) | Fivetran "Service Accounts", Airbyte "Credentials", Confluent "API Keys". Governed credentials with rotation + audit-trail. May overlap PAM but DI-side has a distinct "data-source credential" shape. |
| `dbt_models` (or `transformation_models`) | DI-TRANSFORM-DELIVER | dbt Cloud "Models", Coalesce "Nodes", SQLMesh "Models". The published artifact (a SQL+config file) distinct from `transformation_jobs` (an execution of a model in a run). |
| `connector_catalog_entries` | DI-CONNECTOR-LIBRARY (capability, today; could be a master) | Fivetran "Connectors catalog", Airbyte "Connector Marketplace", Singer "Taps and Targets". The inventory of supported source/sink types vs. the configured instances. |
| `deployment_environments` | DI-TRANSFORM-DELIVER (config-shape) | dbt Cloud "Environments", Matillion "Environments", Airflow "Connections". Dev / staging / prod scopes per integration flow. |
| `data_incidents` | DI-INGEST-CDC | Distinct from `pipeline_runs.failed`: an incident aggregates multiple run failures + symptom (freshness, schema, volume, distribution). Often co-loaded with Data Observability vendors (Monte Carlo, Bigeye); see candidate `DATA-OBSERVABILITY` (queued separately). |
| `data_contract_tests` | DI-TRANSFORM-DELIVER | dbt tests, Great Expectations expectations, Soda checks. Producer-defined assertions distinct from the schema check itself. |

(Several of these may collapse onto pure `data_object_relationships` or per-run columns rather than first-class masters; decided per-entity at fix time.)

#### MODULARIZATION (1)

- **2-module split** (`DI-INGEST-CDC` + `DI-TRANSFORM-DELIVER`) is the recommended baseline per B2-S1. With 7 masters + 8 proposed capabilities, Rule #14 floor of 2 modules is satisfied with headroom. If the user picks B2-S1 option (b) the per-runtime split lands closer to vendor product lines (`DI-BATCH-ELT`, `DI-STREAMING`, `DI-CDC`, `DI-TRANSFORM`); 4 modules is feasible but doubles authoring cost.

#### REGULATION CANDIDATES (3)

DI has zero `domain_regulations` rows. Candidates to load (with `applicability`):

| Regulation candidate | applicability | Why |
|---|---|---|
| GDPR | indirect | Chapter V (Articles 44-49) cross-border transfer rules; DI is the primary control surface for international source / sink configuration. Indirect because the data subject is identified elsewhere (CRM, HCM); DI carries the transfer. |
| HIPAA | indirect | Security Rule 164.312(e)(1) Transmission Security; CDC streams carrying ePHI must encrypt in transit and maintain audit-trail. Indirect because the PHI master is in HCM / EHR / claims systems; DI carries it. |
| SOX | indirect | Section 404 internal controls over financial reporting; CDC streams that carry GL / sub-ledger / sub-system financial state to the warehouse are in-scope for ITGCs (change management, access control, monitoring). |

(Each regulation row would need confirmation in `regulations` as a candidate; not new regulation entities.)

#### Vendor-research basis (Phase 0 candidates)

The vendor surface walked above is from my own knowledge of the market, not a formal Phase 0 document. The headline signal is that the **ingest-vs-transform split** is correct (every flagship distinguishes the ingestion / replication surface from the transformation / serving surface in its product navigation, even within unified suites like IDMC). The **lineage events** + **data contracts** + **stream topics** are first-class entities at multiple flagships; their absence from the catalog is a real gap. The **connector_tasks / sync_jobs** granularity below `pipeline_runs` is a real schema gap matched by Fivetran's Sync Tasks and Airbyte's Job Attempts.

### Cross-bucket dependencies

- **B1-S1 (M-band) blocks the cascade**. B1-S5/S6/S9/S10/S12/S14/S15/S16 are downstream of having modules. Fix order: S1 (modules) -> S2 (capabilities + linking) -> S12 (lifecycle states with `domain_module_id` set) -> S14 (per-module system skills) -> S15 (skill_tools) -> S10 (handoff module FK backfill) -> S8 (missing handoffs with both module FKs populated) -> S9 (intra-domain handoffs) -> S16 (roles). S4 (event_category PATCH on 14 events), S3 (A3 primary solutions), S5 (intra-domain relationships), S6 (users edges), S7 (cross-domain B8 relationships), S11 (aliases), S17 (APQC) can land in parallel with or before S1.
- **B2-S1 (module split topology) gates B1-S1**. The chosen split determines capability assignment and master-to-module attribution.
- **B2-S3 + B2-S5 (event attribution defects) gate B1-S8 / B1-S10**. The re-attribution choice changes how trigger_events get sourced and where the B10b backfill resolves.
- **B2-S4 (regulatory scope) gates Bucket 3 regulation candidates**. The in-scope-vs-substrate choice determines whether 3, 2, or 0 `domain_regulations` rows load.
- **Bucket 3** is independent of Bucket 1: vendor research either vets the candidates (they become Bucket 1 items in a follow-up audit) or eyeball-mode promotes a subset. The modules in B1-S1 are designed to absorb the Bucket 3 entities without re-splitting.

### Per-bucket prompts

**Bucket 1 - fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S4`, or `S17 only` to fast-track APQC tagging), or `skip`.

- **S1 (M1 - load 2 modules + capability mapping + DMDO migration):** decide B2-S1 first (module split topology).
- **S2 (A2 - 8 capabilities + capability_domains + domain_module_capabilities):** gated on S1's module ids.
- **S3 (A3 - load missing pure-play flagship solutions + re-evaluate coverage_level on existing 10 rows):** no dependencies; can land independently.
- **S4 (event_category PATCH on 14 events):** trivial; one PATCH each. No dependencies.
- **S5 (B6 - intra-domain relationships among DI masters, 7-8 rows):** no dependencies.
- **S6 (B7 - users-edge relationships, 8-10 rows per Rule #10):** no dependencies.
- **S7 (B8 - outbound cross-domain relationships, 7-8 rows):** no dependencies.
- **S8 (B9 - missing handoffs):** gated on S1.
- **S9 (B9b - intra-domain handoffs):** gated on S1.
- **S10 (B10b - handoff module FK backfill):** gated on S1.
- **S11 (B11 - data_object_aliases, 12-18 rows):** no dependencies; can land in parallel.
- **S12 (B12 - lifecycle states for 7 masters):** gated on S1 + B2-S2 (pattern-flag re-evaluation can land independently but state-machine authoring touches similar surface).
- **S13 (B4 - pattern flags PATCH):** gated on B2-S2 decision.
- **S14 / S15 (F1/F2/F3 - retire legacy skill, author per-module system skills + skill_tools):** gated on S1.
- **S16 (E-band - roles):** gated on S1.
- **S17 (APQC TAGGING - 9 new rows):** no dependencies; can land first.

**Bucket 2 - what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (module split topology - 2-module vs per-runtime vs hybrid)**: a / b / c / d?
- **B2-S2 (pattern flags - per-flag yes/no)**: 3 flags to decide (`transformation_jobs.has_submit_lock`, `transformation_jobs.has_single_approver`, `schema_registries.has_submit_lock`).
- **B2-S3 (handoff 727 attribution defect)**: a / b?
- **B2-S4 (regulatory scope)**: a / b / c?
- **B2-S5 (handoff 157 / event 105 attribution defect)**: a / b / c?

**Bucket 3 - Phase 0 pending - vet via formal Phase 0 vendor research or eyeball-mode?**

- Vetted route: spawn a focused Phase 0 subagent walking the 10 entity candidates against Fivetran, Airbyte, dbt, Confluent, Striim, Qlik, Matillion, Informatica schemas. Survivors return as Bucket 1 in a follow-up audit.
- Eyeball route: user names which of the 10 ring true; they become Bucket 1 items immediately. Strongest-signal candidates from my own pass: `connector_tasks`, `data_lineage_events`, `stream_topics` (the runtime trio every flagship masters), and `data_contracts` + `data_contract_tests` (the producer-consumer agreement layer). The remaining 5 are softer signals.
- Regulation candidates (3) need a separate decision: gated on B2-S4 scope choice.

### Report-only follow-ups (owed by other domains)

- **DATA-AI-PLAT B8 owes outbound `data_object_relationships`**: handoff 157 (`lakehouse_tables`), 725 (`pipeline_runs`), 731 (`schema_registries`) imply DI-mastered to DATA-AI-PLAT-mastered cross-edges, but the reverse direction (DATA-AI-PLAT-mastered `lakehouse_tables` / `data_pipelines` to DI-mastered objects) is owed by DATA-AI-PLAT's own B8. Specifically: `lakehouse_tables loaded_by pipeline_run` (DATA-AI-PLAT side), `data_pipelines orchestrates pipeline_run` (DATA-AI-PLAT side).
- **DATA-AI-PLAT B10b (target_domain_module_id NULL on inbound rows)**: handoffs 157, 725, 731 land at DATA-AI-PLAT with `target_domain_module_id=NULL`. Schedule DATA-AI-PLAT's audit to backfill once its modules can be queried.
- **DCG B10b**: handoffs 259, 726 land at DCG with `target_domain_module_id=NULL`. Schedule DCG audit.
- **DLP B10b**: handoff 730 lands at DLP with `target_domain_module_id=NULL` (DLP has zero modules per its 2026-05-30 audit; this is DLP's own B1-S1 dependency).
- **DSPM B10b**: handoff 729 lands at DSPM with `target_domain_module_id=NULL`. Schedule DSPM audit (it has an audit already; verify).
- **DQ B10b**: handoff 728 lands at DQ with `target_domain_module_id=NULL`. Schedule DQ audit.
- **ITSM B10b on handoff 727**: already has `target_domain_module_id=38` populated (the only outbound row that does); informational pass.
- **DATA-AI-PLAT B9 attribution review on trigger_event 105**: same defect as DI's B2-S5; the source-side fix needs DATA-AI-PLAT to decide whether to keep `data_object_id=226` (`lakehouse_tables`) or co-author a DI-mastered event.

### Candidates queued

- **STREAMING-PLATFORM** (Streaming Data Platform) - Confluent Cloud, Redpanda, Amazon MSK, Aiven for Kafka, StreamNative, Upstash Kafka. Distinct from DI: managed Kafka broker infrastructure as a deployable surface (topics + partitions + consumer groups) rather than data movement; DI uses brokers as a source / sink type. Distinct from IPAAS: focused on event-streaming runtime, not app-integration orchestration.
- **REVERSE-ETL** (Reverse-ETL / Warehouse-Activation) - Hightouch, Census, RudderStack Reverse-ETL, Polytomic, Grouparoo. Re-surfaced (already in queue, mention bumped). Distinct from DI: warehouse-out direction (warehouse to SaaS), CDP-adjacent activation use case; DI's sink_connectors overlap but the audience-targeting + identity-resolution semantics are different.
- **DATA-OBSERVABILITY** (Data Observability) - Monte Carlo, Acceldata, Bigeye, Anomalo, Soda, Sifflet, Metaplane, Datafold. Re-surfaced. Distinct from DI: monitoring + lineage-based RCA surface that sits above DI / DCG / DQ rather than running pipelines itself. DI emits the freshness / volume / lag signals; observability platforms aggregate and route them.
- **DATA-CONTRACTS** (Data Contracts Management) - Gable.ai, Datacontract.com, PayPal data-contract-cli, Confluent Schema Registry, Buf Schema Registry. Re-surfaced. Distinct from DI's `schema_registries`: a contract is a producer-consumer agreement (schema + SLA + ownership + tests + breaking-change policy), not just a schema document; Gable.ai is the clearest pure-play.

## 2026-05-31, Continuation: B1 technical fixes

### Applied (3 of 17 B1 items)

- **S4 (B-band trigger_events.event_category enum backfill).** PATCHed 14 rows (ids 762-775) with the categories the audit pre-specifies: `state_change` x7 (762, 764, 767, 768, 770, 773), `threshold` x3 (763, 772, 775), `lifecycle` x4 (765, 766, 769, 774), `signal` x1 (771). Post-load: all 14 carry non-empty `event_category`.
- **S6 (B7 hard fail - users-edge data_object_relationships, Rule #10).** INSERTed 13 rows linking `users` (id=748, `kind='platform_builtin'`) to the 7 DI masters with verbs the audit pre-specifies (operator / configurer / owner / author / approver / steward / reviewer / error_reviewer / breaking_change_reviewer). Mapping: `pipeline_runs` (434) operates + reviews_errors_on; `source_connectors` (435) configures + owns; `sink_connectors` (436) configures + owns; `transformation_jobs` (437) authors + approves; `schema_registries` (438) stewards + reviews_breaking_changes_on; `change_data_capture_streams` (439) operates; `integration_flows` (440) authors + operates. All rows `owner_side='target'`, `relationship_type='one_to_many'`, `relationship_kind='reference'`, `is_required=false`, `record_status` defaulted to `new` per Rule #1, `notes=''` per Rule #15.
- **S17 (H1 hard fail - APQC tagging, agent_curated).** INSERTed 9 `handoff_processes` rows (proposal_source=`agent_curated`, role=`implements`, record_status defaulted to `new`, notes=`''`) on the 9 cross-domain outbound handoffs: 157 -> PCF 20779 (id 277); 725 -> PCF 20779 (id 277, joins existing 725-272 row, not a duplicate since key is the 2-tuple); 731 -> PCF 20775 (id 1209); 259 -> PCF 20779; 726 -> PCF 20779; 728 -> PCF 20779; 729 -> PCF 20735 (id 270); 730 -> PCF 20735; 727 -> PCF 20903 (id 1299). All four PCF processes verified live before insert. Post-load: 10 rows for the 9 handoffs (handoff 725 has 2 process links by design).

### Deferred (14 of 17 B1 items)

- **S1, S2, S8, S9, S10, S12, S14, S15, S16:** all gated on B2-S1 (module split topology user judgment) and on creating new `domain_modules` / `capabilities` / lifecycle states / system skills / roles. Task scope excludes new-entity creation; cannot proceed until user picks the split and authorizes the entity loads.
- **S3:** A3 primary-solution fix and `coverage_level` re-evaluation on the existing 10 rows are judgment calls (which suite drops to `partial`, which flagships earn `primary`). Also requires creating missing pure-play `solutions` rows. Defer per task scope (new entities + user judgment).
- **S5 (B6 intra-DI relationships):** audit specifies pairs and verb candidates but uses "Draft 7-8" language and cluster-drafts review path; not pre-specified as exact tuples with `is_required` / `owner_side`. Task scope restricts user-edges to Rule #10 (built-ins); intra-DI relationships are deferred for cluster-drafts review.
- **S7 (B8 outbound cross-domain relationships):** audit uses "verb candidate" language and "Draft 7-8" cluster-drafts path. Not pre-specified as exact tuples; defer per task rules on cluster-drafts and the absence of pre-specified `is_required` / `owner_side` per row.
- **S11 (B11 data_object_aliases):** audit asks for 12-18 aliases "once B1-S1 lands"; not pre-specified as exact tuples, and task rules explicitly defer bulk data_object_aliases inserts unless audit pre-specifies exact tuples.
- **S13 (B4 pattern flags):** explicitly gated on B2-S2 user-judgment (per-flag yes/no).

### Notes

- No JWT errors during the load.
- No `notes` writes; no vendor-name writes; no `record_status` overrides; no new domains / modules / capabilities / entities created.
- B1-S10 (handoff source_domain_module_id backfill) remains blocked because DI still has 0 `domain_modules` rows; the backfill becomes derivable only after B1-S1 lands.

### Loader

- `c:/dev/domain-map/.tmp_deploy/fix_di_b1_technical_2026_05_31.ts`

## 2026-05-31, Audit

### Summary

- **Current footprint:** 0 modules (M1 hard fail blocker carried forward); 7 masters (`pipeline_runs`, `source_connectors`, `sink_connectors`, `transformation_jobs`, `schema_registries`, `change_data_capture_streams`, `integration_flows`); 2 contributor rows (`lakehouse_tables`, `data_pipelines`); 0 capabilities (A2 hard fail); 10 solution_domains (0 primary, 9 secondary, 1 partial; A3 quality fail); 14 trigger_events ALL with non-empty `event_category` (B-band trigger_events PASS, S4 cured); 9 outbound cross-domain handoffs (ids 157, 259, 725, 726, 727, 728, 729, 730, 731) + 0 inbound; 0 intra-domain handoffs; 0 lifecycle states (B12 hard fail); 0 `data_object_aliases` (B11 soft fail); 0 intra-DI `data_object_relationships` (B6 hard fail still open); **13 `users` edges to DI masters** (B7 PASS, S6 cured); 0 cross-domain `data_object_relationships` on outbound payloads (B8 hard fail still open); 1 legacy `di-system` skill (id 48, `domain_module_id=null`) with 7 `query` skill_tools (F1 hard fail, F2 hard fail, Semantius score uncomputable per module); 0 roles, 0 role_modules, 0 role_permissions; 2 business_function_domains (owner Data Engineering id=65, contributor Software Engineering id=26; C1 PASS); 0 `domain_regulations`; **10 `handoff_processes` rows covering all 9 cross-domain handoffs** all at `proposal_source='agent_curated'`, `record_status='new'` (H1 process headline PASS at 9 of 9 handoffs covered; H1 quality headline 0 approved still pending reviewer signoff). All 9 outbound handoffs still carry `source_domain_module_id=NULL` and 8 of 9 carry `target_domain_module_id=NULL` (B10b hard fail still open, gated on M1).
- **Em-dash drift.** `domains.business_logic` for DI contains one em-dash character (per project rule "No em-dashes"). `domains.description` is clean. Flagged as B1A-EMDASH-BL in Bucket 1.
- **A4 (Rule #20) fail.** `domains.catalog_tagline=''` and `domains.catalog_description=''`. Backfill candidate, user-approval gated (Bucket 2 new item B2-S6).
- Bucket 1 (in-scope, agent fixable): 1 item (B1A-EMDASH-BL hygiene). Three prior Bucket-1 items already applied (S4, S6, S17).
- Bucket 2 (surface-for-user, judgment): 6 items (5 carried forward from 2026-05-30 + 1 new for A4 / Rule #20 buyer-voice copy).
- Bucket 3 (Phase 0 pending, speculative): 14 items carried forward (10 missing entities + 1 modularization proposal + 3 regulation candidates).
- **Status set:** `feedback_needed`.

### Structural pass deltas vs prior audit (2026-05-30)

| Band | Prior 2026-05-30 | This run 2026-05-31 | Change |
|---|---|---|---|
| A1 | PASS | PASS | unchanged |
| A2 | hard fail (0 capabilities) | hard fail (0 capabilities) | unchanged |
| A3 | quality fail (0 primary) | quality fail (0 primary) | unchanged |
| A4 | not reported | hard fail (empty `catalog_tagline` and `catalog_description`) | newly surfaced under Rule #20 |
| M1 | hard fail (0 modules) | hard fail (0 modules) | unchanged, blocking |
| M2 / M4 / M5 / M6 / M8 | gated on M1 | gated on M1 | unchanged |
| B-band trigger_events | 14 of 14 empty `event_category` | 14 of 14 populated | **CURED by S4** |
| B4 (pattern flags) | not re-evaluated | not re-evaluated | gated on B2-S2 |
| B6 (intra-DI rels) | hard fail (0 edges) | hard fail (0 edges) | unchanged |
| B7 (users edges) | hard fail (0 edges) | PASS (13 edges across 7 masters) | **CURED by S6** |
| B8 (outbound cross-domain rels) | hard fail (0 rows) | hard fail (0 rows) | unchanged |
| B9 (handoffs) | partial (5 events with no handoff) | partial (5 events with no handoff) | unchanged |
| B9b (intra-domain handoffs) | gated on M1 | gated on M1 | unchanged |
| B10b (per-module attribution) | hard fail (all NULL source module FK) | hard fail (8 of 9 NULL target FK; 9 of 9 NULL source FK) | unchanged, gated on M1 |
| B11 (aliases) | soft fail (0 rows) | soft fail (0 rows) | unchanged |
| B12 (lifecycle states) | hard fail (0 rows) | hard fail (0 rows) | unchanged |
| C1 | PASS | PASS | unchanged |
| C2 | n/a | n/a | unchanged |
| E1 / E2 / E4 / E5 | hard fail (0 roles) | hard fail (0 roles) | unchanged, gated on M1 |
| F1 (legacy skill cleanup) | gated on F2 | gated on F2 | unchanged |
| F2 / F3 / F4 / F5 (per-module skills) | hard fail (0 module-level skills) | hard fail (0 module-level skills) | unchanged, gated on M1 |
| H1 (process headline) | hard fail (0 of 9 tagged) | PASS at 9 of 9 covered (10 rows) | **CURED by S17** |
| H1 (quality headline) | 0 approved | 0 approved | unchanged (reviewer signoff pending) |

### Bucket 1, in-scope confirmed gaps

| ID | Band | Finding | Fix surface |
|---|---|---|---|
| B1A-EMDASH-BL | Hygiene (no-em-dash project rule) | `domains.business_logic` on DI id=89 contains one em-dash character. | Surgical PATCH on `/domains?id=eq.89` to replace the em-dash with comma+space. One field, one row. No notes touched, no other column touched. |

All other prior Bucket-1 items either resolved (S4 / S6 / S17 from 2026-05-31 continuation) or remain gated on user judgment (B2-S1 module split topology) and are tracked under `b1b` in `state.yaml`.

### Bucket 2, surface-for-user judgment calls

Carried forward from 2026-05-30 plus one new entry for Rule #20 A4 backfill.

1. **B2-S1, module split topology** (gates the entire M-band cascade). Options: (a) `DI-INGEST-CDC` + `DI-TRANSFORM-DELIVER` (recommended for vendor neutrality); (b) per-runtime split (`DI-BATCH-ELT`, `DI-STREAMING`, `DI-CDC`, `DI-TRANSFORM`, 4 modules); (c) per-vendor-cluster (3 modules); (d) hybrid 2-module + `DI-LITE` starter.
2. **B2-S2, pattern-flag positive re-evaluation** on 3 candidates: `transformation_jobs.has_submit_lock`, `transformation_jobs.has_single_approver`, `schema_registries.has_submit_lock`. Per-flag yes/no decisions needed.
3. **B2-S3, handoff 727 attribution defect.** `pipeline_run.failed` event 96 references `data_pipelines` (227, mastered by DATA-AI-PLAT) but DI publishes the event. Options: (a) keep attribution + DI as contributor on event 96; (b) author a new DI-side event `pipeline_run.failed` with `data_object_id=434` and re-point handoff 727.
4. **B2-S4, regulatory scope** for DI. Options: (a) in-scope for GDPR / HIPAA / SOX (3 `domain_regulations` rows); (b) only HIPAA / SOX in-scope; (c) none in-scope (DI is substrate-only).
5. **B2-S5, handoff 157 / event 105 attribution defect.** `replication_load.completed` event 105 references `lakehouse_tables` (226, mastered by DATA-AI-PLAT). Options: (a) keep DATA-AI-PLAT attribution + DI as contributor; (b) author parallel DI-side `pipeline_run.completed_load` event with `data_object_id=434`; (c) replace event 105 entirely with a DI-side event pointing at `pipeline_runs`.
6. **B2-S6 (NEW), A4 buyer-voice copy.** `domains.catalog_tagline` and `domains.catalog_description` are both empty (Rule #20). Agent will draft one-sentence tagline + 1 to 3 paragraph description in buyer voice (workflow + value, not market position) on user approval, surface for review BEFORE writing.

### Bucket 3, Phase 0 pending speculative

Unchanged from 2026-05-30 audit. 10 missing entity candidates (`connector_tasks`, `data_lineage_events`, `data_contracts`, `stream_topics`, `connection_credentials`, `dbt_models` or `transformation_models`, `connector_catalog_entries`, `deployment_environments`, `data_incidents`, `data_contract_tests`) plus 1 modularization proposal (2-module baseline) plus 3 regulation candidates (GDPR, HIPAA, SOX, applicability=indirect). Vetted-vs-eyeball decision still open.

### Cross-bucket dependencies

- B1A-EMDASH-BL is independent of everything and can land first.
- B2-S1 still gates the entire M-band cascade (B1B-M1-MODULES + all M2 / M4 / M5 / M6 / M8 + B9b / B10b / B12 / E-band / F2 to F5).
- B2-S2, B2-S3, B2-S5 each unlock a structural fix (pattern flags, two attribution defects).
- B2-S4 gates Bucket 3 regulation candidates.
- B2-S6 gates A4 (Rule #20 forbids overwrite without approval; backfill on empty is also draft-then-approve).

### Per-bucket prompts

- **Bucket 1:** fix the one em-dash now? Reply `yes` or `skip`.
- **Bucket 2:** per-item decisions. B2-S1 a / b / c / d, B2-S2 three yes / no flags, B2-S3 a / b, B2-S4 a / b / c, B2-S5 a / b / c, B2-S6 draft tagline and description for review.
- **Bucket 3:** vet via formal Phase 0 vendor research, or eyeball-mode (name which candidates ring true)? Regulation candidates gated on B2-S4.

### Report-only follow-ups owed by other domains

Carried forward from 2026-05-30. DATA-AI-PLAT owes outbound `data_object_relationships` for handoffs 157, 725, 731 reverse direction plus B10b backfill on inbound 157 / 725 / 731; DCG owes B10b on inbound 259, 726; DLP owes M1 first then B10b on inbound 730; DSPM owes B10b on inbound 729; DQ owes B10b on inbound 728; ITSM B10b on 727 already populated (`target_domain_module_id=38`); DATA-AI-PLAT also owes attribution review on event 105 (mirrors B2-S5).

### Candidates queued

Unchanged: STREAMING-PLATFORM (new), REVERSE-ETL, DATA-OBSERVABILITY, DATA-CONTRACTS (3 re-surfaced).

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

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass (SKILL.md Rule #21) over DI's open state.yaml items only; no fresh
from-scratch audit. DI confirmed still UNBUILT live (0 domain_modules, 0 capability_domains on
domain_id=89), so the entire M-band cascade remains user-gated on B2-S1. Three additive/corrective
items were executable without a decision and were applied; everything destructive or judgment-bound
was surfaced. Status stays `feedback_needed`; `next_action_by` moves to `user` (the agent has done
every fix it can without a decision).

### Executed (record_status='new'; idempotent; verified live)

- **entity_type (Rule #12 / B13).** PATCHed all 7 DI masters from `unclassified` to
  `operational_workflow` (ids 434 pipeline_runs, 435 source_connectors, 436 sink_connectors,
  437 transformation_jobs, 438 schema_registries, 439 change_data_capture_streams,
  440 integration_flows). All 7 are workflow-bearing (each carries a clear lifecycle state machine
  per B1B-B12), so the classification is deterministic. This makes B12 lifecycle states REQUIRED on
  all 7 once modules exist (recorded on B1B-B12-LIFECYCLE-STATES).
- **Catalog UX (Rule #20, was B1B-A4-CATALOG-UX / B2-S6).** Both `catalog_tagline` and
  `catalog_description` were empty on DI id=89. Authored buyer-voice copy (workflow + value, no
  vendor/product names, no em-dash, American English) and wrote it in. The stale surface-before-write
  gate (B2-S6) was overridden per the execute directive; B2-S6 is now resolved by execution and
  dropped from b2. No non-empty value was overwritten.
- **Aliases (B11, was B1B-B11-ALIASES).** Inserted 9 generic cross-vendor synonyms across 5 masters,
  all `alias_type='synonym'`, `record_status='new'`: pipeline_runs -> sync_jobs, connector_runs;
  source_connectors -> sources, source_endpoints; sink_connectors -> destinations, target_endpoints;
  transformation_jobs -> transformation_runs; change_data_capture_streams -> replication_streams,
  change_streams. Vendor-product candidates from the prior finding (dbt_models, ksql_queries) were
  dropped per Rule #18 (no product names in alias text). schema_registries and integration_flows got
  no aliases this pass (no clean generic synonym was enumerated). The stale cluster-drafts gate was
  overridden per the execute directive for clearly-enumerated generic synonyms.

Loader: `c:/dev/domain-map/.tmp_deploy/fix_di_state_driven_2026_06_07.ts`

### Surfaced for user (no write)

- **B1A-EMDASH-BL (now reclassified DESTRUCTIVE).** `domains.business_logic` on id=89 still contains
  one em-dash. Fixing it overwrites a non-empty value, which is a destructive class per Rule #21, so
  it is surfaced for approval rather than executed. (catalog_tagline/catalog_description authored this
  pass are em-dash clean; description is also clean.)
- **B1A-BUILD.** DI is unbuilt (0 modules, 0 capabilities). The build is surfaced, not scaffolded;
  the cascade is left. Personas/RACI are DEFERRED until modules exist (no candidate personas authored).
- **b2 decisions (carried, none executed except B2-S6):** B2-S1 module split topology (a/b/c/d);
  B2-S2 three pattern-flag yes/no; B2-S3 handoff 727 / event 96 attribution defect (a/b);
  B2-S4 regulatory scope (a/b/c); B2-S5 handoff 157 / event 105 attribution defect (a/b/c).

### Left (untouched)

- All blocked b1b gated on B1B-M1-MODULES / B2-S1: A2 capabilities, A3 primary-solutions, B6
  intra-DI rels, B8 outbound cross-domain rels, B9 missing handoffs, B9b intra-domain handoffs,
  B10b source-module-FK backfill, B12 lifecycle states, B4 pattern flags, E-band roles.
- F-band skill-layer items: RETIRED per the 2026-06-06 supersession header (per-module system skills
  / skill_tools canceled). Reframed as a single non-actionable marker (B1B-F-SKILL-LAYER-RETIRED) so
  future passes do not re-open them.
- b3 backlog (10 entity candidates + 1 modularization proposal + 3 regulation candidates): unchanged.
- APQC tagging (H1): already cured (S17, 10 handoff_processes rows cover all 9 outbound handoffs);
  no untagged cross-domain handoffs remain. Nothing to do.
- C1 (business_function_domains): already PASS (owner Data Engineering id=65 + contributor Software
  Engineering id=26); not an open item; left untouched.

### UI links (tables written this pass)

- https://tests.semantius.app/domain_map/data_objects
- https://tests.semantius.app/domain_map/domains?id=eq.89
- https://tests.semantius.app/domain_map/data_object_aliases

## 2026-06-08 - Phase 0 + q-file regeneration (Rule #22 remediation)

### Why this pass ran

The 2026-06-07 q-file surfaced market-shape b2 calls (module split, attribution defects, regulatory
scope) WITHOUT a current Phase 0 vendor-surface report, leaning on generic "vendor-neutral" /
"cleanest" reasoning rather than named-vendor evidence. Rule #22 (the forcing step, skill-changelog
2026-06-08) requires every market-shape recommendation to be backed by a Phase 0 report produced
THIS pass, with named-vendor evidence inline. This pass ran Phase 0, then regenerated q-DI.md from
its evidence. Research + file-authoring only; no DB writes (the build stays gated on the user's
answers). No `record_status` changes.

### Market confirmation (CLIN-DEV lesson)

Before researching, confirmed the actual market from live state, not the candidate-vendor
hypothesis. The live domain row (id=89) self-describes as ELT/ETL/CDC/replication for analytics,
"Distinct from iPaaS (transactional app integration)." The 7 live masters are the data-pipeline
runtime substrate (pipeline_runs, source_connectors, sink_connectors, transformation_jobs,
schema_registries, change_data_capture_streams, integration_flows); DI is a contributor (not master)
on DATA-AI-PLAT's lakehouse_tables and data_pipelines. The candidate vendors matched the market;
Boomi was excluded as primarily iPaaS (the DI/IPAAS boundary the domain row draws).

### Vendor study (7 flagships)

Fivetran, Airbyte, dbt Labs, Confluent (Kafka Connect + Schema Registry), Qlik Replicate / Striim
(compliance-grade CDC), Informatica IDMC (CDIR + CDI), Matillion Data Productivity Cloud. Report:
`.tmp_deploy/DI-phase0-2026-06-08.md`.

### Surface-matrix highlights

- **Ingest surface is universal.** Every flagship masters source_connectors + pipeline_runs +
  connector_tasks + connection_credentials; the streaming/replication vendors (Confluent, Qlik,
  Striim) add CDC. Classified Core.
- **Transform/deliver surface is the second pillar.** dbt / Matillion / Informatica CDI lead on
  transformation_jobs + sink_connectors + integration_flows; dbt model contracts + Confluent
  immutable schema versions anchor governed schema. Classified Core/Common.
- **schema_registries is split-spanning, mastered once.** Confluent/Informatica enforce schema at
  INGEST (drift), dbt enforces at TRANSFORM (model contracts). The single live schema_registries
  master belongs on the transform/deliver side as the governed schema-of-record; the ingest side
  detects drift against it. Not a reason to duplicate.
- **Compliance shape is an audit/lineage substrate, not statute-prefixed masters.** Qlik Replicate
  (Qlik Catalog lineage) and Striim (transaction-matching audit) compete on the proof-of-movement
  surface, but DI is the data CARRIER, not the owner. No fcra_/hipaa_/gdpr_ masters belong in DI;
  its regulatory role is INDIRECT (q7).
- **Modularization packaging confirms the 2-module split.** Informatica IDMC ships CDIR (ingest/
  replicate) and CDI (transform/orchestrate) as distinct service modules with separate UIs (recently
  unified into one homepage, still two products); Matillion splits orchestration pipelines vs
  transformation pipelines. The ingest-vs-deliver cut is how the suites actually divide the surface,
  not merely an abstraction.

### Per-decision verdicts (mapped to the q-file)

| q | state id | shape | verdict | grounding |
|---|---|---|---|---|
| q1 | B2-S1 | market-shape (module split) | keep (a) 2-module | Informatica CDIR/CDI + Matillion orchestration/transformation packaging |
| q2 | B2-S2.txjlock | workflow-shape | keep yes | dbt model contracts; Fivetran Oct-2025 unified standardized model |
| q3 | B2-S2.txjapprover | workflow-shape | keep yes (lower confidence, flagged) | flagships gate review (dbt CI, Matillion env promotion) more than single named approver |
| q4 | B2-S2.schemalock | workflow-shape | keep yes | Confluent immutable versioned subjects; dbt contracts |
| q5 | B2-S3 | market-shape (where-mastered) | keep (b) re-anchor on run | Fivetran/Airbyte/Qlik/Striim fire failure on the RUN object, not the table |
| q6 | B2-S5 | market-shape | keep (b) parallel event | genuine vendor split: connector-run (Fivetran/Airbyte/Qlik) vs table (Snowpipe) |
| q7 | B2-S4 | non-market (regulations) | keep (a) indirect | Qlik/Striim compete on audit-trail/lineage; DI is indirect carrier |
| q8 | B1A-EMDASH-BL | non-market hygiene | keep yes | one-char no-em-dash fix; destructive overwrite, surfaced |
| q9 | b3 (10 candidates) | optional additive | keep yes/after-modules | runtime trio + contract layer strongest; stream_topics/data_incidents likely sibling domains |

### Reversals

None. Fresh Phase 0 CONFIRMED every prior recommendation. The substantive change is grounding: the
q1 reason moved from "vendor-neutral / absorbs additions" to named packaging evidence (Informatica
CDIR vs CDI, Matillion orchestration vs transformation). q3 and q6 reasons were re-grounded in
named-vendor behavior, with q3 honestly downgraded to the lower-confidence flag and q6's parallel-
event hedge tied to the real connector-run-vs-table vendor split. No b2 `why` framing needed a
substance change beyond this re-grounding (the underlying decisions stand).

### Files written this pass

- `.tmp_deploy/DI-phase0-2026-06-08.md` (Phase 0 report, new)
- `audits/DI/q-DI.md` (regenerated with inline named-vendor evidence + Grounding block + phase0
  pointer in the trailing comment)
- `audits/DI/state.yaml` (dated Phase 0 note added after the SUPERSEDED header; last_audit ->
  2026-06-08; status / next_action_by unchanged)
- `audits/DI/history.md` (this section)

No DB inserts/updates/deletes. No em-dash characters authored. American English throughout.

## 2026-06-13 - B9d handoff-payload realization (resolves B1A-B9D-VERIFY)

### Summary

Ran the committed B9d resolver (`scripts/analytics/b9d_resolver.ts DI`) in BOTH directions over
every DI boundary. DI is still UNBUILT (0 domain_modules), so its own side authors no realization;
the band's job here is classifying the APQC payload on each handoff against realized work and routing
each ORPHAN to the OWNER domain. Resolves the only agent-executable open item, `B1A-B9D-VERIFY`.
Everything else on DI stays user-gated (the q-DI.md decisions q1-q9). Status remains
`feedback_needed`; `next_action_by` moves from `agent` to `user`.

### Classification (10 boundary tags -> 7 distinct (process, owner) findings)

| verdict | process (pid) | owner | payload(s) | handoff(s) | disposition |
|---|---|---|---|---|---|
| ORPHAN | 8.4.4 Manage business information (277) | DATA-AI-PLAT (unbuilt) | lakehouse_tables | 157 | additive b2 + q written into DATA-AI-PLAT |
| ORPHAN | 8.7.5.9 Triage IT service delivery incidents (1299) | ITSM (unbuilt) | service_incidents | 727 | additive b2 + q written into ITSM |
| ROLL-UP | 8.4.4 Manage business information (277) | DCG | data_assets | 259 | destructive re-point 8.4.4 -> 8.4.4.1, SURFACED for sign-off (not applied) |
| UNOWNED | 8.3.5 IT security/privacy/data protection (270) | (no master anywhere) | source_connectors, sink_connectors | 729, 730 | surfaced on sender DI; carried entity has no master row, not dropped |
| UNOWNED | 8.3.7 IT resilience and continuity (272) | (no master anywhere) | pipeline_runs | 725 | surfaced on sender DI |
| UNOWNED | 8.4.4 Manage business information (277) | (no master anywhere) | pipeline_runs | 728, 726, 725 | surfaced on sender DI |
| UNOWNED | 8.4.2.5 Maintain/evolve enterprise data architecture (1209) | (no master anywhere) | schema_registries | 731 | surfaced on sender DI |

The four UNOWNED findings reflect that DI's payload data_objects (pipeline_runs, source_connectors,
sink_connectors, schema_registries) are NOT yet declared `master` anywhere in `domain_module_data_objects`
because DI has zero modules (the B2-S1 / M-band gate). They are surfaced on DI as unowned dependencies
per the SKILL.md ORPHAN rule (never silently dropped). They will resolve to RESOLVED / ORPHAN-routed
automatically once DI is built (B2-S1 answered, masters migrated to `domain_module_data_objects`).

### Applied (additive, local audit files only; no catalog writes)

- `audits/DATA-AI-PLAT/state.yaml` + `q-DATA-AI-PLAT.md`: added `B2-B9D-OWN-277` (Manage business
  information, payload lakehouse_tables from DI handoff 157) plus the other ORPHANs the resolver found
  on DATA-AI-PLAT's full boundary set (272, 273, 771, 1203 from AIOPS/DCG/MDM). DATA-AI-PLAT's own
  `B1A-B9D-VERIFY` cleared as a result; its `next_action_by` moved to `user`.
- `audits/ITSM/state.yaml` + `q-ITSM.md`: added `B2-B9D-OWN-1299` (Triage IT service delivery
  incidents, payload service_incidents from DI handoff 727) plus the other ITSM-owned ORPHANs the
  resolver surfaced (579, 272 from Test Management / DATA-AI-PLAT).

These owner-domain writes are the explicit B9d cross-domain carve-out (state.yaml hygiene carve-out
(b)): an ORPHAN is recorded as a `b2` in the OWNER's backlog the moment it is found, on whichever
side owns it.

### NOT applied (surfaced for sign-off; Rule #1 / Rule #21)

- ROLL-UP re-point `8.4.4 -> 8.4.4.1` on `handoff_processes` for handoff 259 (DI -> DCG). This edits
  the tag DI authored, so it is a DI-side destructive edit; it needs explicit user sign-off before
  the re-point.
- The 4 UNOWNED dependencies above are review items (they need DI to be built before the carried
  entities have masters); no write is possible or appropriate now.

### Files written this pass

- `audits/DI/history.md` (this section)
- `audits/DI/state.yaml` (removed resolved `B1A-B9D-VERIFY`; `next_action_by: user`; `last_audit` 2026-06-13)
- `audits/DATA-AI-PLAT/*` and `audits/ITSM/*` (additive owner-side b2 + q items, via the resolver)

No DB inserts/updates/deletes. No em-dash characters authored. American English throughout.
