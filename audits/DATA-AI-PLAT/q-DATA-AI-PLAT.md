# Data and AI Platform (DATA-AI-PLAT): questions waiting for you

## What this domain is
The unified platform where your data, analytics, machine-learning, and AI-agent work all live in one place: a governed lakehouse, the pipelines that feed it, a semantic layer of certified metrics and ontologies, the full model lifecycle, and the LLM agents built on top. It maps the major data-and-AI platforms (Databricks, Snowflake, Microsoft Fabric, Palantir Foundry, and peers) so the catalog can position any of them. The domain is already split into four modules (Lakehouse and Pipeline Engineering, Semantic Layer and Governance, Machine Learning Lifecycle, and LLM Orchestration and AI Agents).

---

q1: (answer this first) How should the lifecycle (the states each master record moves through) be authored for the nine core objects (lakehouse tables, data pipelines, ML models, feature sets, semantic metrics, AI agents, data products, ontologies, knowledge graph entities)?

- a) Author the proposed default state machine on each one (for example ML models go registered, then staging, then production, then archived).
- b) Author the workflow states only where there is a clear workflow, and document a "no lifecycle needed" exemption for the two config-style objects (lakehouse tables and knowledge graph entities).
- c) Skip lifecycle authoring this round and re-surface it at the next audit.

Recommended: a. Each object carries a real workflow that vendors agree on, and authoring the states is what unblocks the rest of the build (the personas, responsibility assignments, and process wiring all wait on this single decision).

a1:

---

q2: Should the nine proposed vendor naming aliases be loaded onto the core objects, so the same concept resolves across vendors (for example "Tables" / "Objects" / "Datasets" for lakehouse tables, "Agents" / "Assistants" / "Bots" / "Copilots" for AI agents)?

- a) Load all nine proposed aliases.
- b) Load only a subset you name.
- c) Defer alias loading to a later follow-up.

Recommended: a. The naming varies widely across the ten flagship vendors, and aliases are the surface that reconciles it; the proposed set maps cleanly to known vendor terminology.

a2:

---

## Optional (will not hold up the build)

q3: Eight extra AI and ML objects show up across the flagship vendors (model experiments, model endpoints, vector indexes, prompt templates, agent tools, RAG retrievers, data contracts, lineage events). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the lifecycle decision lands. Each is a first-class object in several vendor platforms, though they still want a verification pass first.

a3:

---

q4: The Notebook Analytics capability has no backing object today. Should I add a `notebooks` master (versioned, scheduled, parameter-bound, as every flagship models it), or retire the dangling capability?

- a) Add a `notebooks` master.
- b) Retire the Notebook Analytics capability.

Recommended: a. Databricks, Hex, Foundry, Snowflake, and Vertex all model the notebook as a first-class object, so adding it is the cleaner fix than dropping the capability.

a4:

---

q5: There are zero compliance regulations tagged on this domain. Should I research and add the candidate AI and data regulations (EU AI Act, NIST AI RMF, ISO/IEC 42001, SR 11-7, GDPR Article 22, HIPAA for protected-data slices)? (yes/no)

Recommended: yes. AI platforms sit squarely under the EU AI Act and related frameworks; this is additive and independent of the other decisions.

a5:

---

q6: Two market-boundary calls only become real once the new AI and ML objects above land: whether the ML work (experiments, endpoints) should become its own MLOps domain rather than stay a module here, and whether the AI Agents module should later split into an agent-runtime piece and a retrieval (RAG) piece. Should I revisit both once those objects exist? (yes/no)

Recommended: yes, but defer; both are premature until the underlying objects in q3 actually land, so there is nothing to decide yet.

a6:

---

q7: Five inbound cross-domain handoffs carry payloads this domain does not yet declare a role on, and four older handoffs are tagged with deferred or non-standard process anchors. Should I finish wiring these residual handoff items (author the consumer roles and finalize the process tags)? (yes/no)

Recommended: yes, but additive and non-blocking; some of these are modern-AI events that need a custom process anchor, so they want a verification pass first.

a7:

---

<!-- agent map, ignore: q1=B2-LIFECYCLE-SHAPE q2=B2-S3 q3=B3-ENT-MODEL-EXPERIMENTS+B3-ENT-MODEL-ENDPOINTS+B3-ENT-VECTOR-INDEXES+B3-ENT-PROMPT-TEMPLATES+B3-ENT-AGENT-TOOLS+B3-ENT-RAG-RETRIEVERS+B3-ENT-DATA-CONTRACTS+B3-ENT-LINEAGE-EVENTS q4=B3-MISSING-MASTER-NOTEBOOKS q5=B3-REG-CANDIDATES q6=B3-MOD-MLOPS-DOMAIN+B3-MOD-AGENTS-SPLIT q7=B3-INBOUND-DMDO+B3-H1R-DEFERRED | domain_id=129 -->
