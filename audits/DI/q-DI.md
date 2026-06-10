# Data Integration (DI): questions waiting for you

## What this domain is
Move data from any source into your warehouse or lakehouse and shape it for use, all from one place. It covers the connectors and change-data-capture streams that pull data in, the runs that execute each load, the transformation jobs that reshape it, the sinks that deliver it onward, the schema registry that governs structure, and the integration flows that orchestrate the whole sequence. It is the substrate other data domains build on, so its handoffs feed your catalog, quality, security, and platform teams.

> Grounding: these recommendations are backed by a fresh vendor-surface study (7 flagship vendors, 2025-2026 product docs) saved at `.tmp_deploy/DI-phase0-2026-06-08.md`. The live domain row draws its own boundary: Data Integration is data MOVEMENT for analytics (ELT/ETL/CDC/replication into the warehouse), explicitly "distinct from iPaaS (transactional app integration)." So this study grounds what Data Integration masters (connectors, runs, transformation jobs, schemas, CDC streams, orchestration flows) versus what it consumes (the warehouse/lakehouse tables and platform pipelines owned by the data-platform domain). App-to-app flows are iPaaS, quality rules are Data Quality, and the lineage/catalog register is Data Catalog and Governance.

---

q1: (answer this first) How should Data Integration be split into modules (the sub-areas of the product)?

- a) Two modules: Ingest and CDC (sources, change-data-capture streams, and the runs that load data in) and Transform and Deliver (transformation jobs, sink connectors, the schema registry, and integration-flow orchestration).
- b) Four modules, one per runtime: Batch ELT, Streaming, CDC, and Transform.
- c) Three modules, split by vendor cluster (connector-style versus streaming-style versus transformation-style).
- d) Hybrid: the two modules in (a) plus a DI-LITE starter for small single-connector deployments.

Recommended: a. The flagship packaging suites divide the surface exactly along this ingest-versus-deliver line. Informatica IDMC ships Cloud Data Ingestion and Replication (CDIR) and Cloud Data Integration (CDI) as two distinct service modules with separate UIs (recently unified into one homepage but still two products); Matillion's Data Productivity Cloud splits its pipelines into orchestration pipelines (load source to warehouse) versus transformation pipelines (reshape in-warehouse). On the ingest side the pure-plays cluster (Fivetran, Airbyte, Confluent Kafka Connect, Qlik Replicate, Striim all master source connectors, sync/replication jobs, and CDC); on the deliver side the transform leaders cluster (dbt, Matillion, Informatica CDI master transformation jobs, sinks, governed schema, orchestration). Option (b)'s per-runtime cut duplicates the same master set across four modules because a pipeline run is a pipeline run whether batch or streaming, doubling authoring cost without a distinct entity surface per module; (c) is vendor-coupled and the clusters overlap (Informatica spans all three). The 2-module split is the most vendor-neutral cut that still matches real product packaging, and it absorbs the deeper additive entities (per-task runs, lineage events, contracts, models, environments) without re-splitting. This choice drives every capability assignment, role bundle, lifecycle state, handoff module link, and load below it, so it unlocks the rest of the build.

a1:

---

q2: Should a published transformation job be frozen once published, so dependent consumers have a stable surface and any change starts a new job? (yes/no)

Recommended: yes. The transform leaders enforce exactly this. dbt's model contracts make dbt verify that a published model's output matches its declared columns or the build fails, giving downstream queriers a stable, predictable surface; in October 2025 Fivetran unified each connector's pre-built dbt-compatible models into a single standardized, documented model precisely so the destination schema is stable for consumers. Freeze-at-published is the standard ELT governance pattern across dbt and Matillion, and any change authors a new version rather than mutating the published one.

a2:

---

q3: Should a transformation job require a single named approver before it can be published? (yes/no)

Recommended: yes, though the vendor evidence here is softer than for the freeze. The flagship transform tools gate publishing through a review step (dbt Cloud builds and validates against CI before a model reaches production; Matillion runs publishing through environment-scoped promotion), but they enforce a review GATE more than a strictly single named approver. A single accountable approver is the common in-warehouse transformation-governance shape and the cleanest way to anchor the workflow-gate permission, so yes is the right default, but treat this as the lower-confidence of the three flag calls; pick no if your transform governance is review-by-any-peer rather than one named owner.

a3:

---

q4: Should a schema registry entry be frozen once versioned, so evolving the schema authors a new version rather than mutating the prior one? (yes/no)

Recommended: yes. Immutable versioning is the explicit contract of the schema-governance leaders. Confluent Schema Registry stores each schema as an immutable versioned subject (a new schema registers as a new version under the subject; prior versions are never mutated) with compatibility rules that protect every consumer pinned to a given version; dbt's model contracts enforce the same "the published shape does not silently change" guarantee on the transform side. Evolving a schema should create a fresh version, which is exactly the freeze-at-versioned behavior this flag captures.

a4:

---

q5: The "pipeline run failed" event that routes to ITSM currently hangs off a platform-owned object (data_pipelines), not the Data Integration run object, even though Data Integration publishes it. How should this be fixed?

- a) Keep the existing attribution and record Data Integration as a contributor on that event.
- b) Author a new Data Integration side "pipeline run failed" event on the pipeline-runs object and re-point the ITSM handoff to it.

Recommended: b. Across the ingest flagships the failure signal fires on the RUN object, not the destination table: Fivetran surfaces failures on connector sync runs, Airbyte on sync-job attempts, Qlik Replicate and Striim on the replication task (Striim explicitly matches source and target transactions and alerts on missing ones at the task level). Data Integration owns the pipeline-runs object, so anchoring the failure event there puts the lifecycle state and the failure surface on the side that actually detects and owns it; the platform-owned table object is the wrong publisher for a run failure. Re-pointing the handoff is a structural change, so it needs your call.

a5:

---

q6: The "replication load completed" event that flows to the platform domain is anchored on the platform-owned table object, not the Data Integration run object, even though Data Integration publishes it. How should this be fixed?

- a) Keep the platform attribution and record Data Integration as a contributor on the event.
- b) Author a parallel Data Integration side "pipeline run completed load" event on the pipeline-runs object.
- c) Replace the event entirely with a Data Integration side event pointing at the pipeline-runs object.

Recommended: b. The flagships genuinely split on where the completion event fires, which is why a parallel event (rather than a replacement) is the safe call. The run-centric vendors fire completion on the connector run (Fivetran on the sync run, Airbyte on the sync job, Qlik Replicate on the replication task), while warehouse-native load mechanisms fire on the TABLE (Snowflake Snowpipe fires when a table receives a new load). Both readings are real: a pipeline run completed (Data Integration's view) AND a lakehouse table received new data (the platform's view). Keeping the platform-side event intact while adding a Data Integration side event on pipeline-runs hedges that genuine vendor split and gives Data Integration its own lifecycle anchor without breaking the platform domain's existing subscriber. This changes event ownership, so it needs your call.

a6:

---

q7: What regulatory scope should Data Integration carry?

- a) In scope for GDPR, HIPAA, and SOX (three regulation rows): GDPR for cross-border source and sink transfers, HIPAA for ePHI in CDC streams, SOX for financial-data CDC into the warehouse.
- b) Only HIPAA and SOX in scope (the CDC streams that carry health and financial state).
- c) None in scope: Data Integration is substrate-only and the regulations attach downstream on the data-loss-prevention, posture, and governance domains.

Recommended: a, with indirect applicability on every row. The regulated-CDC specialists compete specifically on this surface: Qlik Replicate integrates with Qlik Catalog to auto-catalog every replicated asset and track end-to-end lineage explicitly "to improve compliance, governance, and trust," and Striim's transaction-matching audit trail exists to prove sensitive data moved correctly. Data Integration is the control surface where international and regulated data movement is actually configured (cross-border source/sink endpoints, ePHI CDC streams, financial-data replication into the warehouse), so tagging GDPR/HIPAA/SOX reflects real exposure. The applicability is INDIRECT, though: Data Integration is the carrier, not the data owner (the data subject is identified in CRM, HCM, EHR, claims, or the GL, not here), so no statute-prefixed master entities belong in Data Integration. Pick (c) only if you want the regulations to sit purely on the downstream data-loss-prevention, posture, and governance domains. This also decides whether the matching regulation candidates in Optional load.

a7:

---

q8: The business-logic text on the Data Integration domain record contains one em-dash, which the project no-em-dash rule forbids. Should I replace it with a comma? (yes/no)

Recommended: yes. It is a one-character compliance fix on a single field. Because it overwrites an existing value, it needs your sign-off before I make it.

a8:

---

## Optional (will not hold up the build)

q9: Ten deeper entity candidates show up across the flagship Data Integration vendors. The strongest, by vendor count in the fresh study: per-task connector runs (Fivetran sync tasks, Airbyte job attempts, Confluent Connect tasks), lineage event records (OpenLineage RunEvents, dbt Discovery API metadata, Qlik/Striim lineage), governed connection credentials (every flagship), and a connector catalog of supported source/sink types. Softer signals: data contracts (dbt model contracts, plus contract-shaped audit in Qlik/Striim), transformation models distinct from runs (dbt models, Matillion transformation pipelines), stream topics (Confluent-only, which may instead argue for a separate streaming-platform domain), deployment environments (dbt, Matillion, Informatica), data incidents (an observability-domain concern), and data-contract tests. Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules exist. The runtime trio (per-task runs, lineage events, connection credentials) is the strongest signal in the study (3+ flagships each) and the contract/model layer is the next tier; stream topics and data incidents likely belong in sibling domains (streaming-platform and data-observability respectively) rather than Data Integration. All want a verification pass first.

a9:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2.txjlock q3=B2-S2.txjapprover q4=B2-S2.schemalock q5=B2-S3 q6=B2-S5 q7=B2-S4 q8=B1A-EMDASH-BL q9=B3-CONNECTOR-TASKS+B3-DATA-LINEAGE-EVENTS+B3-DATA-CONTRACTS+B3-STREAM-TOPICS+B3-CONNECTION-CREDENTIALS+B3-DBT-MODELS+B3-CONNECTOR-CATALOG-ENTRIES+B3-DEPLOYMENT-ENVIRONMENTS+B3-DATA-INCIDENTS+B3-DATA-CONTRACT-TESTS | domain_id=89 | phase0=.tmp_deploy/DI-phase0-2026-06-08.md | reversed: none (Phase 0 confirmed all prior recommendations; q3 and q6 reasons re-grounded in named-vendor evidence with confidence noted) -->
