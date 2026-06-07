# Data Integration (DI): questions waiting for you

## What this domain is
Move data from any source into your warehouse or lakehouse and shape it for use, all from one place. It covers the connectors and change-data-capture streams that pull data in, the runs that execute each load, the transformation jobs that reshape it, the sinks that deliver it onward, the schema registry that governs structure, and the integration flows that orchestrate the whole sequence. It is the substrate other data domains build on, so its handoffs feed your catalog, quality, security, and platform teams.

---

q1: (answer this first) How should Data Integration be split into modules (the sub-areas of the product)?

- a) Two modules: Ingest and CDC (sources, change-data-capture streams, and the runs that load data in) and Transform and Deliver (transformation jobs, sink connectors, the schema registry, and integration-flow orchestration).
- b) Four modules, one per runtime: Batch ELT, Streaming, CDC, and Transform.
- c) Three modules, split by vendor cluster (connector-style versus streaming-style versus transformation-style).
- d) Hybrid: the two modules in (a) plus a DI-LITE starter for small single-connector deployments.

Recommended: a. The ingest-versus-deliver split is vendor-neutral, satisfies the two-module floor with headroom for the seven masters and eight planned capabilities, and absorbs later additions without re-splitting. This choice drives every capability assignment, role bundle, lifecycle state, handoff module link, and load below it, so it unlocks the rest of the build.

a1:

---

q2: Should a published transformation job be frozen once published, so dependent consumers have a stable surface and any change starts a new job? (yes/no)

Recommended: yes. Freezing at published is standard ELT governance and keeps downstream consumers from breaking under it.

a2:

---

q3: Should a transformation job require a single named approver before it can be published? (yes/no)

Recommended: yes. A single accountable approver is the common pattern for in-warehouse transformation governance.

a3:

---

q4: Should a schema registry entry be frozen once versioned, so evolving the schema authors a new version rather than mutating the prior one? (yes/no)

Recommended: yes. Immutable schema versions protect every consumer pinned to a given version; evolution should create a fresh version.

a4:

---

q5: The "pipeline run failed" event that routes to ITSM currently hangs off a platform-owned object (data_pipelines), not the Data Integration run object, even though Data Integration publishes it. How should this be fixed?

- a) Keep the existing attribution and record Data Integration as a contributor on that event.
- b) Author a new Data Integration side "pipeline run failed" event on the pipeline-runs object and re-point the ITSM handoff to it.

Recommended: b. Anchoring the failure event on the pipeline-runs object Data Integration actually owns puts the lifecycle state and the failure surface on the right side. Re-pointing the handoff is a structural change, so it needs your call.

a5:

---

q6: The "replication load completed" event that flows to the platform domain is anchored on the platform-owned table object, not the Data Integration run object, even though Data Integration publishes it. How should this be fixed?

- a) Keep the platform attribution and record Data Integration as a contributor on the event.
- b) Author a parallel Data Integration side "pipeline run completed load" event on the pipeline-runs object.
- c) Replace the event entirely with a Data Integration side event pointing at the pipeline-runs object.

Recommended: b. A parallel Data Integration side event keeps the platform-side event intact while giving Data Integration its own lifecycle anchor; flagship runtimes differ on whether the event fires on the table or the connector run, so the parallel approach hedges that. This changes event ownership, so it needs your call.

a6:

---

q7: What regulatory scope should Data Integration carry?

- a) In scope for GDPR, HIPAA, and SOX (three regulation rows): GDPR for cross-border source and sink transfers, HIPAA for ePHI in CDC streams, SOX for financial-data CDC into the warehouse.
- b) Only HIPAA and SOX in scope (the CDC streams that carry health and financial state).
- c) None in scope: Data Integration is substrate-only and the regulations attach downstream on the data-loss-prevention, posture, and governance domains.

Recommended: a. Data Integration is the control surface where international and regulated data movement is actually configured, so tagging all three (indirect applicability) reflects real exposure. Pick (c) only if you want the regulations to sit purely downstream. This also decides whether the matching regulation candidates in Optional load.

a7:

---

q8: The business-logic text on the Data Integration domain record contains one em-dash, which the project no-em-dash rule forbids. Should I replace it with a comma? (yes/no)

Recommended: yes. It is a one-character compliance fix on a single field. Because it overwrites an existing value, it needs your sign-off before I make it.

a8:

---

## Optional (will not hold up the build)

q9: Ten deeper entity candidates show up across the flagship Data Integration vendors (per-task connector executions, lineage event records, data contracts, stream topics, connection credentials, transformation models distinct from runs, a connector catalog, deployment environments, data incidents, and data-contract tests). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules exist. The runtime trio (per-task executions, lineage events, stream topics) and the contract layer are the strongest signals; all want a verification pass first.

a9:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2.txjlock q3=B2-S2.txjapprover q4=B2-S2.schemalock q5=B2-S3 q6=B2-S5 q7=B2-S4 q8=B1A-EMDASH-BL q9=B3-CONNECTOR-TASKS+B3-DATA-LINEAGE-EVENTS+B3-DATA-CONTRACTS+B3-STREAM-TOPICS+B3-CONNECTION-CREDENTIALS+B3-DBT-MODELS+B3-CONNECTOR-CATALOG-ENTRIES+B3-DEPLOYMENT-ENVIRONMENTS+B3-DATA-INCIDENTS+B3-DATA-CONTRACT-TESTS | domain_id=89 -->
