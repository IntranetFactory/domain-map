# METRICS-LAYER audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules` rows** (M1 hard fail, cascades through M-band, F-band, B10b, E-band); 5 masters (`metric_definitions`, `dimensional_models`, `metric_materializations`, `query_lineage_records`, `metric_access_policies`) loaded only in legacy `domain_data_objects` rollup (no `domain_module_data_objects` rows because no modules exist); 8 capabilities linked (`METRICS-DEF`, `METRICS-DIMENSIONAL-MODEL`, `METRICS-GOVERNANCE`, `METRICS-QUERY-FEDERATION`, `METRICS-CACHE-OPT`, `METRICS-API-DELIVERY`, `METRICS-AI-CONSUMPTION`, `SEMANTIC-MODELING`); 7 solutions linked (6 primary, 1 secondary - Looker); 8 `trigger_events` on the 5 masters (3 with `event_category='lifecycle'`, 5 with empty `event_category`); 7 outbound + 1 inbound cross-domain handoffs (8 total); 0 intra-domain handoffs; 0 lifecycle states; 0 aliases; 0 `users` edges; 0 intra-domain `data_object_relationships`; 0 outbound cross-domain `data_object_relationships`; 0 inbound cross-domain `data_object_relationships`; 1 legacy domain-level system skill `metrics-layer-system` with 5 query tools (zero mutate, zero side_effect, zero workflow gates) and `domain_module_id=null`; 0 roles; 0 regulations linked. `catalog_tagline` and `catalog_description` both empty (A4 fail). The seven A1 fields are populated (`crud_percentage=60`, `business_logic` non-empty, `min_org_size='30 m <2500'`, `cost_band='$$'`, `usa_market_size_usd_m=300`, `market_size_source_year=2025`).
- **Vendor-surface basis:** flagship vendors enumerated below.
- **Bucket 1 (in-scope, agent fixable):** 12 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| BI | 4 | 0 | 0 | 0 | 4 | Pairwise (full) |
| DATA-AI-PLAT | 2 | 0 | 0 | 0 | 2 | Lightweight |
| DCG | 1 | 1 | 0 | 0 | 2 | Lightweight |

The dominant finding across every neighbor pass: **METRICS-LAYER has zero modules**, so every cross-domain edge has a NULL `source_domain_module_id` (or `target_domain_module_id` when METRICS-LAYER is the receiver) by structural necessity. Pairwise reconciliation cannot legitimately diff Section 2 (NULL module FKs) or Section 3 (missing handoffs from a module split) until B1-S1 is cured. The neighbor section below records what each neighbor relationship currently looks like; the deep diff defers to a re-audit after modules ship. Additionally, zero `data_object_relationships` rows exist in either direction across the catalog for these masters, so Section 5 (cross-domain `data_object_relationships` mirror check) also blocks on B1-S8.

Structural pass bands: A1 / A2 / A3 / C1 pass; **A4 hard-fail** (catalog_tagline + catalog_description empty); **M1 / M2 / M4 / M5 / M6 hard-fail** (zero modules); **B6 / B7 / B11 / B12 hard-fail** (zero intra-domain relationships between masters, zero `users` edges, zero aliases, zero lifecycle states); **B4 hard-fail** (all five masters have all three pattern flags false-by-default, no positive re-evaluation recorded); **B8 hard-fail** (zero outbound cross-domain relationship rows mirroring the 7 outbound handoffs); **B9 partial-fail** (8 events exist but 5 have empty `event_category` enum); **B9b vacuously passes** (zero intra-domain handoffs but also zero modules to host them); **B10b hard-fail** (every outbound and inbound handoff has NULL `source_domain_module_id` and `target_domain_module_id` on the METRICS-LAYER side, cascade of M1); **F1 / F2 / F3 hard-fail** (one legacy domain-level system skill with five `query` tools, no module-anchored skill, no mutate / side_effect / workflow-gate tools); **H1 partial-fail** (3 of 8 handoffs carry `discovery_substring` tags pointing at the same generic `Establish baseline metrics` PCF row, which is a low-relevance match; 5 of 8 handoffs carry zero tags, no `agent_curated` rows anywhere); **E1 / E2 / E3 / E4 / E5** vacuously pass (single-module-equivalent shape because there are zero modules; no roles authored); **C2** passes (no overrides needed; data and analytics function owns the domain and every capability).

Semantius score is **uncomputable** for METRICS-LAYER because F2 fails (no module-anchored system skill). The legacy `metrics-layer-system` skill scores `strict=5/5=100%` and `operational=5/5=100%` against its own five `skill_tools` rows, but per the Semantius score definition this score is module-anchored and the catalog rule prefers module-level skills over the legacy domain-level skill.

### Vendor surface basis

Flagship vendors enumerated for the market audit pass:

- **Cube (Cube Cloud)** - anchors the dev-first headless-BI shape (YAML / SQL semantic models, REST + SQL + GraphQL + MDX delivery, pre-aggregations).
- **AtScale** - anchors the enterprise BI-augmentation shape (universal semantic layer over Snowflake / Databricks, MDX for Excel and Power BI, autonomous aggregates).
- **dbt Semantic Layer** - anchors the transformation-coupled headless-metric shape (MetricFlow, JDBC delivery, dbt project as the source of truth).
- **Lightdash** - anchors the open-source dbt-coupled metric exposure with a thin BI surface (the metric definition is the contract; the UI is incidental).
- **Honeydew** - anchors the AI-agent-coupled metric shape (semantic layer plus business-question-to-metric translation).
- **GoodData.CN** - anchors the embedded-analytics metric layer (logical data model, MAQL, multi-tenant delivery for SaaS embedding).
- **Google Looker (LookML)** - the canonical predecessor; sits in the catalog as a secondary solution because Looker bundles a BI dashboard surface and is now owned by Google as part of the Looker / Looker Studio family. LookML itself remains the most-cited reference for "what a metrics layer looks like."

Adjacent vendors deliberately NOT in the metrics-layer set: Power BI Semantic Models (a BI feature), Tableau Pulse Metrics (a BI feature), Snowflake Semantic Views (a data-and-AI-platform feature), Databricks Unity Catalog Metrics (a data-and-AI-platform feature). These are tracked under their parent platform's domain per Rule #2.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 / M2 / M4 / M5 / M6 (hard fail)** | **Zero `domain_modules` rows** for METRICS-LAYER (`/domain_modules?domain_id=eq.137` returns `[]`; `/domain_module_host_domains?domain_id=eq.137` also empty). 8 capabilities are linked via `capability_domains`, so the >=3 -> >=2 modules rule under M2 applies. Every other M / F / B-band failure is a downstream cascade of this one: no module to attribute lifecycle states to (M5), no module to realize capabilities (M4 / M6), no module to anchor a system skill (F2), no module to populate `source_domain_module_id` / `target_domain_module_id` on the 8 handoffs (B10b), no module to write DMDO rows against (M7 catalog-wide passes by accident, only the legacy `domain_data_objects` rollup carries the master rows). | Propose a 3-module split before any other fix loads (open to B2-1 decision): **`METRICS-LAYER-DEFINITIONS`** (`metric_definitions`, `dimensional_models` masters; capabilities `METRICS-DEF`, `METRICS-DIMENSIONAL-MODEL`, `SEMANTIC-MODELING`, `METRICS-GOVERNANCE`), **`METRICS-LAYER-COMPUTE`** (`metric_materializations`, `query_lineage_records` masters; capabilities `METRICS-QUERY-FEDERATION`, `METRICS-CACHE-OPT`), **`METRICS-LAYER-DELIVERY`** (`metric_access_policies` master; capabilities `METRICS-API-DELIVERY`, `METRICS-AI-CONSUMPTION`). All three are `module_kind='full'`. Each gets the required `domain_module_capabilities` rows plus a `domain_module_data_objects` row per master at `role='master', necessity='required'`. Cross-module embedded shells: `metric_definitions` is `embedded_master` on `METRICS-LAYER-COMPUTE` and `METRICS-LAYER-DELIVERY` (both need to render the metric they materialize / deliver, and either may deploy standalone). `metric_access_policies` is `embedded_master` on `METRICS-LAYER-DELIVERY` only (the canonical master) and `consumer` on the other two. |
| B1-S2 | **B12 (hard fail)** | **Zero `data_object_lifecycle_states` for all 5 masters.** Each carries an obvious workflow ladder in flagship vendor docs. `metric_definitions`: draft -> in_review -> certified -> deprecated -> retired (Cube / dbt / AtScale all have this exact ladder). `dimensional_models`: draft -> published -> deprecated -> retired. `metric_materializations`: scheduled -> refreshing -> refreshed -> stale -> failed (state machine on every Cube pre-aggregation and AtScale aggregate). `query_lineage_records`: captured -> processed -> archived (largely audit-record shape, but workflow exists). `metric_access_policies`: draft -> active -> superseded -> retired. Without lifecycle states no workflow-gate permissions are derivable. Per Rule #12 every `master + required` data_object needs lifecycle states unless it is genuinely config-shape (`query_lineage_records` is borderline config-shape but the other four clearly carry workflows). | Author lifecycle state rows for the 5 masters; mark `requires_permission=true` on the certification / deprecation / retirement / activate / supersede transitions; set `domain_module_id` to the realizing module from B1-S1. Load via a focused loader after B1-S1 lands. |
| B1-S3 | **B4 (hard fail)** | **Pattern flags false-by-default across all 5 masters.** No positive re-evaluation recorded. Specifically: should `metric_definitions.has_submit_lock=true` (a certified metric is immutable until re-drafted; Cube and dbt both enforce this)? Should `metric_definitions.has_single_approver=true` (metric certification is typically gated on a single approver, the data-product owner)? Should `metric_access_policies.has_single_approver=true` (policy activation usually needs single approval)? Should `dimensional_models.has_submit_lock=true` (a published model is immutable while live consumers point at it)? | Per-flag PATCH from B2-2 answers. Do NOT auto-populate `data_objects.notes` to explain the flags (Rule #15). |
| B1-S4 | **B7 (hard fail)** | **Zero `users` edges** between any METRICS-LAYER master and the `users` built-in (id=748). Each of the 5 masters has user-typed actors (metric definition author, metric certifier, model owner, materialization owner, access-policy approver, lineage record subject); none are captured as `data_object_relationships` rows. The relationship graph rendered for METRICS-LAYER today shows zero human actors. | Author 8-to-10 user-edge `data_object_relationships` rows: `users authors metric_definitions`, `users certifies metric_definitions`, `users authors dimensional_models`, `users owns metric_materializations`, `users authors metric_access_policies`, `users approves metric_access_policies`, `users initiated query_lineage_records` (subject of the query), `users authors metric_materializations` (refresh-schedule author). Each row carries the standard `relationship_verb` / `inverse_verb` / `relationship_type='many_to_many'` / `relationship_kind='reference'` / `is_required=false` / `owner_side='target'` shape per Rule #10. |
| B1-S5 | **B6 (hard fail)** | **Zero intra-domain `data_object_relationships` between METRICS-LAYER masters.** Query `/data_object_relationships?and=(data_object_id.in.(252,253,709,710,711),related_data_object_id.in.(252,253,709,710,711))` returns empty. Expected edges (every flagship vendor's schema carries these): `metric_definitions belongs_to dimensional_models` (many-to-one; a metric is defined inside a semantic model / cube), `metric_materializations precomputes metric_definitions` (many-to-many; a materialization caches one or more metrics by dimension grain), `query_lineage_records traces metric_definitions` (many-to-many; lineage record names the metrics it touches), `query_lineage_records traces dimensional_models` (many-to-many; lineage also names the dimensional model it queried), `metric_access_policies governs metric_definitions` (many-to-many; policy targets specific metrics), `metric_access_policies governs dimensional_models` (many-to-many; policy may target a whole model). | Author 6 intra-domain relationship rows after B1-S1 and B1-S2 land (so the rows can carry meaningful `is_required` against the lifecycle state shapes). |
| B1-S6 | **B11 (hard fail)** | **Zero `data_object_aliases` across all 5 masters.** Flagship vendors use clearly different terminology that the architect view cannot render today. `metric_definitions` -> Measure (Cube, AtScale, GoodData MAQL), Metric (dbt MetricFlow, Lightdash), KPI (BI-vendor-neutral), Calculation (Looker, Power BI). `dimensional_models` -> Cube (Cube, Honeydew), Semantic Model (dbt Semantic Layer), Logical Data Model (GoodData), Universe (legacy Business Objects), Explore (Looker LookML). `metric_materializations` -> Pre-Aggregation (Cube), Aggregate (AtScale), Materialized View (Snowflake / generic SQL), Cache (generic). `query_lineage_records` -> Query Log (Snowflake / Databricks), Audit Record (BI-vendor-neutral), Query History (DCG-adjacent). `metric_access_policies` -> Row-Level Security Policy (generic SQL), Cell-Level Policy (Snowflake), Access Grant (Looker LookML access_grants), Data Permission (AtScale). | Author 18-to-25 alias rows after B1-S1. |
| B1-S7 | **B9 (Rule #13 enum violation)** | **5 of 8 `trigger_events` for METRICS-LAYER masters have empty `event_category`** (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`). Event ids with empty category: 714 `dimensional_model.published`, 715 `dimensional_model.deprecated`, 716 `metric_materialization.refreshed`, 717 `metric_materialization.refresh_failed`, 718 `query_lineage.captured`, 719 `metric_access_policy.changed`. Events 193 `metric.certified` and 194 `metric.deprecated` already carry `lifecycle`. | PATCH each row: 714 / 715 / 719 -> `state_change` (published / deprecated / policy change are master-state transitions); 716 -> `state_change` (refreshed is a successful state); 717 -> `signal` (refresh_failed is a signal subscribers react to rather than a master state); 718 -> `signal` (lineage capture is an observational signal, not a master state). |
| B1-S8 | **B8 (hard fail)** | **Zero outbound cross-domain `data_object_relationships` rows from METRICS-LAYER masters.** Query `/data_object_relationships?and=(data_object_id.in.(252,253,709,710,711),related_data_object_id.not.in.(252,253,709,710,711))` returns empty. The 7 outbound handoffs imply 7 corresponding payload-target relationship rows. The targets are mostly soft-consumed (BI dashboards consume metric definitions but BI does not master `metric_definitions` rows of its own; the cross-domain rel is from METRICS-LAYER master to a BI consumer entity if one exists). After scanning BI / DATA-AI-PLAT / DCG master sets: BI's `bi_dashboards` (if loaded) consumes `metric_definitions`; DATA-AI-PLAT's `feature_store_features` consumes `metric_definitions`; DCG's `lineage_assets` consumes `query_lineage_records`. Some target-side masters may not yet be loaded; defer those rows until target identification is confirmed. | Surface to user; load the cross-domain relationship rows whose target-side masters are already in the catalog; defer the rest as Bucket 2 / Bucket 3 follow-ups. |
| B1-S9 | **B10b (hard fail)** | **All 8 handoffs have NULL `source_domain_module_id` AND `target_domain_module_id` on the METRICS-LAYER side.** Direct cascade of B1-S1: there are no METRICS-LAYER modules to attribute them to. Outbound handoff ids: 218, 219, 220 (`metric.certified` / `metric.deprecated` on `metric_definitions`), 692 (`dimensional_model.published` on `dimensional_models`), 693 (`metric_materialization.refreshed` on `metric_materializations`), 694 (`query_lineage.captured` on `query_lineage_records`), 695 (`metric_access_policy.changed` on `metric_access_policies`), 696 (`metric_materialization.refresh_failed` on `metric_materializations`). After B1-S1 lands, derive `source_domain_module_id` per the master's realizing module (per Rule B10b's deterministic-derivation rule); for 220 (inbound from DCG), derive `target_domain_module_id` from the METRICS-LAYER module that masters `metric_definitions`. | Run [backfill loader pattern](../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts) after B1-S1 lands. |
| B1-S10 | **F1 / F2 / F3 (hard fail)** | **Legacy domain-level system skill only, no module-anchored skill.** `skills.id=83, skill_name='metrics-layer-system', skill_type='system', domain_id=137, domain_module_id=NULL`. Carries 5 `skill_tools` rows, all `query_*` shape (`query_metric_definitions`, `query_dimensional_models`, `query_metric_materializations`, `query_query_lineage_records`, `query_metric_access_policies`), all `coverage_tier='platform'`. **Zero mutate tools, zero workflow-gate tools, zero side_effect / compute tools, zero fetch tools.** Per Rule #17 every module needs exactly one `skill_type='system'` skill with `domain_module_id` set and >=1 `skill_tools` row; the legacy domain-level skill is the migration target, not the target state. The mutate / workflow-gate floor (Rule #17 sub-invariant on F3, typically >=3 required tools per system skill) is unmet. | After B1-S1 lands, author one system skill per new module with `skill_type='system'` and `domain_module_id` set. Authoring floor per module: **`metrics_layer_definitions_agent`** with `query_metric_definitions`, `query_dimensional_models`, `create_metric_definition`, `certify_metric_definition`, `deprecate_metric_definition`, `publish_dimensional_model`, `validate_metric_compilation` (compute), `translate_question_to_metric` (compute, the AI-agent surface). **`metrics_layer_compute_agent`** with `query_metric_materializations`, `query_query_lineage_records`, `schedule_materialization_refresh`, `refresh_materialization_now` (side_effect), `capture_query_lineage`, `analyze_query_cost` (compute). **`metrics_layer_delivery_agent`** with `query_metric_access_policies`, `create_metric_access_policy`, `activate_metric_access_policy`, `deliver_metric_query` (compute), `serve_metric_via_sql_endpoint` (side_effect), `serve_metric_via_rest_endpoint` (side_effect). Once module-anchored skills ship, DELETE the legacy `metrics-layer-system` row (F1). |
| B1-S11 | **A4 (hard fail)** | **`catalog_tagline` and `catalog_description` both empty** on `/domains?id=eq.137`. Rule #20 requires both populated in buyer voice (workflow + value), not analyst voice (market position + handoffs). | Draft both fields, surface for user review before writing. Proposed tagline (open to B2-3): "Define your business metrics once and serve them to every dashboard, agent, and app." Proposed description (3 paragraphs): paragraph 1 problem (metrics drift across BI tools; numbers in two dashboards disagree because two definitions exist); paragraph 2 the metrics-layer surface (a single declarative layer where measures, dimensions, joins, and access rules live; SQL / REST / GraphQL / MDX delivery so every consumer reads the same numbers); paragraph 3 buyer value (faster trusted analytics; AI agents that quote correct numbers; governed access without duplicating work in every BI tool). |
| B1-H1 | **H1 (partial fail)** | **3 of 8 cross-domain handoffs have `discovery_substring` tags, all pointing at the same generic PCF row 505 `Establish baseline metrics` (external_id 19954, hierarchy_level 4).** That row is a strategic-planning-stage metric definition activity ("first set up a baseline"), not the operational handoffs we publish (a certified metric flowing to BI, an access policy change flowing to consumers). The match is a substring false positive on the word "metric." 5 of 8 handoffs carry zero tags. Volume expectation per SKILL.md: 0.5N to 0.8N -> 4 to 6 `agent_curated` tags + ~2 deferrals. APQC PCF Cross-Industry has thin direct coverage for headless-BI semantic-layer operations (most of the table reflects pre-headless-BI processes), so a higher-than-average deferral rate is expected. Authoring proposals: |

##### APQC TAGGING proposals (B1-H1 detail)

| handoff_id | source -> target | trigger_event | payload | Proposed PCF (process_name / external_id / hierarchy_level) | Confidence |
|---|---|---|---|---|---|
| 218 | METRICS-LAYER -> BI | `metric.certified` | `metric_definitions` | `Develop, Manage, and Deliver Analytics` (external_id 20959, L2) - the closest L2 match for "a certified metric becomes available to analytics consumers" | confident L2; defer L3 lookup |
| 219 | METRICS-LAYER -> DATA-AI-PLAT | `metric.certified` | `metric_definitions` | Same family as 218 (`Develop, Manage, and Deliver Analytics`); DATA-AI-PLAT is the embedded / ML consumer | confident L2 |
| 220 | DCG -> METRICS-LAYER | `metric.deprecated` | `metric_definitions` | Inbound; better mapping is to `Manage business data lifecycle` family (lineage / catalog-driven deprecation). Existing `Establish baseline metrics` tag (proposal_source `discovery_substring`, record_status `new`) is a false positive; recommend PATCHing to `record_status='rejected'` (per Rule #1, only on explicit user instruction) and proposing a new `agent_curated` tag | defer; remove false-positive first |
| 692 | METRICS-LAYER -> BI | `dimensional_model.published` | `dimensional_models` | `Define business information and analytics strategy` (external_id 20766, L3) - publishing a dimensional model is downstream of strategy but no cleaner L4 leaf exists in APQC PCF | possibly defer to Discover Pass 3 |
| 693 | METRICS-LAYER -> DATA-AI-PLAT | `metric_materialization.refreshed` | `metric_materializations` | No clean APQC mapping (cache refresh is operations-layer plumbing not modeled in APQC PCF) | defer to Discover Pass 3 |
| 694 | METRICS-LAYER -> DCG | `query_lineage.captured` | `query_lineage_records` | `Manage business data lifecycle` family (lineage is a data-lifecycle output) - L4 leaf TBD | confident family; defer L4 lookup |
| 695 | METRICS-LAYER -> BI | `metric_access_policy.changed` | `metric_access_policies` | `Develop, Manage, and Deliver Analytics` (external_id 20959, L2) plus possibly `Manage IT compliance` cross-tag (access policy changes feed compliance evidence) | confident L2 |
| 696 | METRICS-LAYER -> BI | `metric_materialization.refresh_failed` | `metric_materializations` | No clean APQC mapping (failure signal; same as 693) | defer to Discover Pass 3 |

Bucket 1 finding-type rollup:

| Finding type | Count |
| --- | --- |
| STRUCTURAL (A / M / B / F bands) | 11 |
| APQC TAGGING (single sub-section) | 1 |
| WRONG-OWNERSHIP | 0 (deferred to Bucket 2 / 3) |
| SCOPE-CREEP | 0 |
| BOUNDARY findings per neighbor | 0 (every neighbor diff blocks on B1-S1 / B1-S8 / B1-S9) |
| MISSING | 0 (deferred to Bucket 3) |

**Total Bucket 1: 12 items.**

#### Boundary findings per neighbor

Pairwise reconciliation is blocked on B1-S1 (zero modules) and B1-S8 (zero cross-domain `data_object_relationships`) across every neighbor. After B1-S1 + B1-S8 + B1-S9 land, re-run the 5-section diff for each weight-3-or-more neighbor (BI is the only one; DATA-AI-PLAT and DCG are weight 2 each). What can be observed in the current state per neighbor:

- **BI (4 handoffs out, 0 in).** Catalog says BI is a primary consumer of `metric_definitions`, `dimensional_models`, `metric_materializations` (failure signal), `metric_access_policies`. Missing direction the other way (BI publishes nothing back to METRICS-LAYER) is consistent with how the markets work: BI tools consume metrics, they don't author them in this architecture. No inbound handoff is owed.
- **DATA-AI-PLAT (2 handoffs out, 0 in).** Two outbound handoffs (`metric.certified`, `metric_materialization.refreshed`). DATA-AI-PLAT consumes metrics into feature stores / agent-tool registries. Inbound would only exist if the data platform owns metric definitions itself; in the headless-BI shape it does not, the metrics layer is upstream. No inbound owed.
- **DCG (1 handoff out, 1 in).** Outbound `query_lineage.captured` -> DCG (lineage feeds the catalog). Inbound `metric.deprecated` from DCG (catalog-driven deprecation closes the loop). The inbound is the only cross-domain handoff METRICS-LAYER receives; its APQC tag (handoff 220) is a `discovery_substring` false positive (see B1-H1).

### Bucket 2 - Surface-for-user (judgment calls)

1. **B2-1: Module split shape.** Recommended 3-module split in B1-S1 (DEFINITIONS / COMPUTE / DELIVERY). Alternatives the user might prefer:
   - **2-module split:** `METRICS-LAYER-CORE` (definitions + dimensional models + governance + materializations + lineage) plus `METRICS-LAYER-DELIVERY` (multi-protocol delivery + access policies + AI consumption). Simpler; aligns more closely with the vendor pattern where Cube and dbt ship "the semantic layer" as one unit and "the delivery / activation layer" as a sidecar.
   - **4-module split:** add `METRICS-LAYER-GOVERNANCE` as its own module (governance + access policies + lineage) leaving COMPUTE focused on materializations. Cleanest match to enterprise-buyer org charts (separate data-governance team) but produces a fourth module whose surface is narrow.
   - The recommended 3-split balances vendor-shape vs. enterprise-buyer-shape and keeps each module's capability set non-trivial. Decision blocks every downstream B / F fix.

2. **B2-2: Pattern flag values per master.** B1-S3 lists four candidate flips (`metric_definitions.has_submit_lock`, `metric_definitions.has_single_approver`, `metric_access_policies.has_single_approver`, `dimensional_models.has_submit_lock`). User confirms per flag; defaults to false otherwise. Recommend: all four true based on flagship-vendor behavior. No notes write either way (Rule #15).

3. **B2-3: A4 catalog tagline / catalog description wording.** B1-S11 surfaces draft text; user approves wording or revises before write (Rule #20 says never overwrite an existing non-empty value without per-row approval).

4. **B2-4: Naming arbitration for the 5 masters under Rule #9.** All five names are already prefixed-style (`metric_definitions`, `dimensional_models`, `metric_materializations`, `query_lineage_records`, `metric_access_policies`) and `is_canonical_bare_word=false`. No bare-word collision risk against the catalog. However the noun `metric_definitions` collides in concept with anything a downstream BI tool might call `metrics`. Three options: (a) keep as is (recommended; the prefix `_definitions` keeps the bare word free for any future BI-owned `metrics` table); (b) rename to bare `metrics` and claim `is_canonical_bare_word=true` (risky; BI / DATA-AI-PLAT may want the bare word for an aggregated-table master); (c) rename to `semantic_metric_definitions` (lengthens for no gain). Recommend (a).

5. **B2-5: Looker reclassification.** Looker (solution id 352, vendor Google) is linked at `coverage_level='secondary'` to METRICS-LAYER. Looker pioneered LookML, which is the canonical reference for what a metrics layer looks like; but Looker the product is also a full BI dashboard surface. Two views: (a) keep at `secondary` because Looker is sold and bought primarily as a BI tool, with LookML as one feature (current state, recommended); (b) promote to `primary` because LookML IS the metrics-layer surface and Looker happens to bundle a BI surface on top. Decision affects how the catalog ranks Looker against the dedicated headless-BI vendors in BI / METRICS-LAYER cross-references. Recommend keeping at `secondary`.

6. **B2-6: Inbound `metric.deprecated` from DCG (handoff 220) APQC tag handling.** The `discovery_substring` tag on row 505 `Establish baseline metrics` is a false positive (B1-H1). Two options: (a) leave the tag at `record_status='new'` so a reviewer can mark it `rejected` later; (b) the user explicitly approves PATCHing it to `rejected` now and proposing a new `agent_curated` tag in its place. Rule #1 forbids any `record_status` flip without explicit user instruction; (a) is the default. Recommend (b) with explicit per-row approval.

### Bucket 3 - Phase 0 pending (speculative)

Candidates surfaced from flagship-vendor research that need vendor-vetting before any catalog write:

1. **B3-1: `metric_views` master.** Cube and dbt MetricFlow both ship a "metric view" or "saved query" concept (a named pre-bundled metric + dimension + filter combo a consumer asks for by name). It is distinct from `metric_definitions` (which defines the formula) and from `metric_materializations` (which precomputes a grain). Probably belongs as a separate master under METRICS-LAYER-DELIVERY. Vendor verification: confirm Cube `views` and dbt `saved_queries` are operationally distinct from `metric_definitions` in their respective schemas.

2. **B3-2: `metric_consumers` master.** AtScale and Cube both track registered downstream consumers (BI dashboards, agents, embed clients) so the metrics layer can fan out cache invalidations and emit consumer-specific access logs. Probably belongs under METRICS-LAYER-DELIVERY. Vendor verification: confirm this is a first-class concept and not merely an OAuth-client list.

3. **B3-3: `metric_assertion_rules` (data-quality / metric-quality tests).** dbt MetricFlow and Cube both support assertion rules (`accepted_values`, `freshness`, `relative_change`) attached to metrics. Probably belongs under METRICS-LAYER-DEFINITIONS but may be a `consumer` from DATA-OBSERVABILITY (queued separately, see candidate domains queue). Vendor verification: confirm scope distinction between metrics-layer-native assertions and DATA-OBSERVABILITY-platform monitors.

4. **B3-4: `metric_change_proposals` (Slack / PR-driven metric workflow).** dbt Semantic Layer and Cube Cloud both surface a metric-change-as-PR workflow (a metric edit goes through a code review before merging to certified state). This may already be implicit in B1-S2's `metric_definitions` lifecycle (the `in_review` state) and not warrant its own master; vendor verification needed.

5. **B3-5: Modularization candidate split of `METRICS-LAYER-DELIVERY`.** The delivery module bundles three protocol families: BI-native (SQL / JDBC / MDX), web-native (REST / GraphQL), and AI-native (MCP / tool-use). In a future audit the surface may grow large enough to split into `METRICS-LAYER-BI-DELIVERY` and `METRICS-LAYER-AI-DELIVERY`. Re-audit when a sixth or seventh delivery-related capability lands.

6. **B3-6: Regulation tagging.** Zero `domain_regulations` rows today. Candidate regulations whose tagging needs vendor / market verification: **SOX** (metric definitions backing financial reporting are SOX-controlled), **GDPR** / **CCPA** (access policies must enforce data-subject restrictions on metric outputs), **HIPAA** (when metrics aggregate over PHI). Verification needed: are these tagged on the metrics layer itself or on the BI layer that consumes the metrics? Vendor positioning (e.g. AtScale's compliance posture) plus EU AI Act adjacency may push toward tagging on the metrics layer because the layer is where the access decisions are enforced.

### Cross-bucket dependencies

- B2-1 (module split shape) gates B1-S1, B1-S2, B1-S4, B1-S5, B1-S7, B1-S8, B1-S9, B1-S10. Resolve B2-1 first, then the entire downstream chain loads cleanly.
- B1-S2 (lifecycle states) gates B1-S7's missing-event additions and B1-S10's workflow-gate tool additions.
- B2-3 (catalog A4 wording) is independent and can ship in parallel with B1-S1.
- B2-2 (pattern flags) is independent and can ship in parallel.
- B3-1 / B3-2 / B3-3 / B3-4 (new candidate masters) MUST defer until after B1-S1 lands. Loading them now would require choosing modules that don't exist yet.
- B3-5 (further delivery split) depends on B3-1 / B3-2 outcomes.

### Per-bucket prompts

- **Bucket 1 prompt (orchestrator reads back to user):** "Bucket 1 has 12 items: 11 STRUCTURAL (A / M / B / F band) plus 1 APQC TAGGING. The structural items cure 1 hard fail in A-band (catalog UX text), 5 in M-band (zero modules cascade), 4 in B-band (relationships / aliases / lifecycle / pattern flags / events / handoff module FKs), and 3 in F-band (legacy skill -> module-anchored skills). APQC tagging produces 4-to-6 `agent_curated` proposals plus ~2 deferrals against a sparse APQC catalog. All Bucket 1 items recommend 'approve and load.' OK to proceed module-split-first (B1-S1) then everything else?"
- **Bucket 2 prompt:** "Bucket 2 has 6 judgment calls. B2-1 (module split shape) is the gating decision: 2-split vs. 3-split (recommended) vs. 4-split. B2-2 sets 4 pattern flags. B2-3 is the A4 catalog tagline + description wording. B2-4 confirms naming stays as is. B2-5 is whether to promote Looker from secondary to primary. B2-6 is whether to reject and replace the false-positive APQC tag on handoff 220. What is your call on each?"
- **Bucket 3 prompt:** "Bucket 3 has 6 speculative items. 4 are candidate new masters (`metric_views`, `metric_consumers`, `metric_assertion_rules`, `metric_change_proposals`). 1 is a future-split candidate for delivery. 1 is regulation tagging (SOX / GDPR / HIPAA). Vet via Phase 0 vendor research or eyeball-mode based on your familiarity with Cube / dbt Semantic Layer / AtScale?"

### Report-only follow-ups (owed by other domains)

- **B10 inbound coverage** (`/handoffs?target_domain_id=eq.137`): 1 row, handoff id 220, DCG -> METRICS-LAYER on `metric.deprecated`. The row exists; the source side (DCG B9 on `metric_deprecation_decisions` or similar master) is the source domain's audit concern. Surface as: "DCG B9 owns the outbound side of handoff 220." Not blocking for METRICS-LAYER.
- **B10b NULL counterparty FKs on neighbor side.** All 8 handoffs have NULL `source_domain_module_id` AND NULL `target_domain_module_id`. The METRICS-LAYER side is in B1-S9 (in-scope this audit). The other side: BI has zero modules itself per its own audit; DATA-AI-PLAT and DCG may or may not (status unverified here). Surface as: "BI B10b inbound module attribution; DATA-AI-PLAT B10b inbound; DCG B10b inbound / outbound."
- **B8 inbound mirror.** The inbound `metric.deprecated` from DCG should have a corresponding `data_object_relationships` row from a DCG master to `metric_definitions`. Owed by DCG B8 (outbound side from DCG's perspective).
- **Cross-domain `data_object_relationships` mirror check (pairwise diff Section 5).** Zero rows exist in either direction for METRICS-LAYER masters paired with any neighbor master. The outbound side is B1-S8 (this audit); the inbound side from each neighbor is owed by that neighbor's B8.

### Candidates surfaced and queued

The following candidate markets were surfaced during the semantic pass and queued to `audits/_missing-domains.md` via `append_missing_domain.ts`. Neither is being loaded into `domains` from this audit.

- **REVERSE-ETL** (bumped from mention_count 2 to 3): Hightouch, Census, Polytomic, Grouparoo. The metrics layer is upstream of reverse-ETL; both metric definitions and dimensional models feed warehouse-activation tools that push metrics into operational SaaS. Adjacent but distinct market.
- **DATA-OBSERVABILITY** (bumped from mention_count 1 to 2): Monte Carlo, Bigeye, Sifflet, Acceldata, Lightup, Metaplane, Anomalo. Data observability monitors freshness / volume / schema / anomaly on the underlying data; the metrics layer is its primary consumer (anomalies on a metric trigger consumer warnings). Distinct from APQC OBS (which is APM-style application observability). Adjacent but distinct market.

Candidates queued: **2**.

## 2026-05-31, Continuation: B1 technical fixes

Applied via [.tmp_deploy/fix_metrics_layer_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_metrics_layer_b1_technical_2026_05_31.ts). Scope limited to TECHNICAL-clause items (enum backfills, Rule #10 user-edge inserts).

### Applied (14 writes)

**B1-S7 (6 PATCHes on `trigger_events.event_category`):**

| id | event_name | event_category (new) |
| --- | --- | --- |
| 714 | dimensional_model.published | state_change |
| 715 | dimensional_model.deprecated | state_change |
| 716 | metric_materialization.refreshed | state_change |
| 717 | metric_materialization.refresh_failed | signal |
| 718 | query_lineage.captured | signal |
| 719 | metric_access_policy.changed | state_change |

**B1-S4 (8 INSERTs into `data_object_relationships`, Rule #10 shape: many_to_many / reference / is_required=false / owner_side=target, source=users id 748):**

| new id | edge |
| --- | --- |
| 1587 | users authors metric_definitions (252) |
| 1588 | users certifies metric_definitions (252) |
| 1589 | users authors dimensional_models (253) |
| 1590 | users owns metric_materializations (709) |
| 1591 | users authors metric_materializations (709) |
| 1592 | users authors metric_access_policies (711) |
| 1593 | users approves metric_access_policies (711) |
| 1594 | users initiated query_lineage_records (710) |

### Deferred

- **B1-S1, B1-S2, B1-S10**: new modules / lifecycle states / module-anchored skills + tools. New entities; gated on B2-1 (module split decision).
- **B1-S3**: pattern flag flips (explicit defer per task rules).
- **B1-S5**: intra-domain `data_object_relationships` (6 edges). TECHNICAL clause licenses only user-edge inserts.
- **B1-S6**: aliases. Audit specifies a range (18 to 25 rows) and per-master vendor terminology lists, not exact tuples; bulk insert deferred.
- **B1-S8**: cross-domain `data_object_relationships`. Audit defers ("surface to user"); target masters in neighbor domains may not be loaded.
- **B1-S9**: B10b handoff module FK backfill on the 8 handoffs. Cannot be derived because METRICS-LAYER has zero `domain_modules`; gated on B1-S1.
- **B1-S11**: A4 `catalog_tagline` / `catalog_description` (Rule #20 user-approval-of-wording defer).
- **B1-H1**: APQC `handoff_processes` tagging. Audit pre-specifies only a single L2 family for most handoffs ("defer to Discover Pass 3" for L3/L4) and the handoff-220 `discovery_substring` reject is blocked by Rule #1.
- **All Bucket 2 and Bucket 3 items**: judgment / Phase 0.

### Audit status unchanged

Frontmatter remains `status: feedback_needed`. The hard fails on M-band, B6, B7 (now partially cured by B1-S4), B8, B11, B12, B4, F1-F3, A4 are still open pending B2-1 (module split decision).

## 2026-05-31, Audit

### Summary

- Current footprint: 0 `domain_modules` rows (M1 still hard fail); 5 masters (`metric_definitions` 252, `dimensional_models` 253, `metric_materializations` 709, `query_lineage_records` 710, `metric_access_policies` 711) live only in legacy `domain_data_objects` rollup; 0 `domain_module_data_objects` rows catalog-wide for any of the 5 masters; 8 capabilities linked (`METRICS-DEF`, `METRICS-DIMENSIONAL-MODEL`, `METRICS-GOVERNANCE`, `METRICS-QUERY-FEDERATION`, `METRICS-CACHE-OPT`, `METRICS-API-DELIVERY`, `METRICS-AI-CONSUMPTION`, `SEMANTIC-MODELING`); 7 solutions linked (6 primary, 1 secondary Looker); 8 `trigger_events` on the 5 masters (every event has `event_category` populated post the 2026-05-31 continuation: 2 `lifecycle`, 4 `state_change`, 2 `signal`); 7 outbound + 1 inbound cross-domain handoffs (8 total); 0 intra-domain handoffs; 0 lifecycle states; 0 aliases; 8 `users` edges (B7 cured in the 2026-05-31 continuation); 0 intra-domain master-to-master `data_object_relationships`; 0 outbound cross-domain `data_object_relationships`; 0 inbound cross-domain `data_object_relationships`; 1 legacy domain-level system skill `metrics-layer-system` (id 83) with 5 query tools (zero mutate, zero side_effect, zero workflow gates) and `domain_module_id=null`; 0 roles tied to Data and Analytics function (id 29); 0 regulations linked; 0 `domain_aliases`. `catalog_tagline` and `catalog_description` both empty on the `domains` row (A4 still fail). A1 fields populated (`crud_percentage=60`, `business_logic` non-empty, `min_org_size='30 m <2500'`, `cost_band='$$'`, `usa_market_size_usd_m=300`, `market_size_source_year=2025`).
- Bucket 1 (in-scope, agent fixable): 10 items.
- Bucket 2 (surface-for-user, judgment): 6 items (carried; B2-1 still gates the chain).
- Bucket 3 (Phase 0 pending, speculative): 6 items (carried; defer per Rule #1).

### Changes since 2026-05-30 audit

The 2026-05-31 continuation landed the TECHNICAL-clause fixes:

- **B1-S7 cured.** All 8 `trigger_events` for METRICS-LAYER masters now carry a non-empty `event_category` (events 714 / 715 / 716 / 719 -> `state_change`; 717 / 718 -> `signal`; 193 / 194 already `lifecycle`).
- **B1-S4 cured.** 8 `users` edges (ids 1587-1594) now wire `users` (748) to the 5 masters as `authors` / `certifies` / `owns` / `approves` / `initiated`. Rule #10 satisfied for METRICS-LAYER masters.
- **H1 partially advanced.** 4 of 8 handoffs now carry `agent_curated` `handoff_processes` rows (218 -> 277 `Manage business information`, 692 -> 275 `Define and maintain business information architecture`, 694 -> 1208 `Establish data ownership and stewardship responsibilities`, 696 -> 1299 `Triage IT service delivery incidents`). 2 of 8 (219, 220) still carry `discovery_substring` rows pointing at the same false-positive process 505 `Establish baseline metrics`. 2 of 8 (693, 695) carry zero tags.

The 2026-05-30 deferred items (B1-S1, B1-S2, B1-S3, B1-S5, B1-S6, B1-S8, B1-S9, B1-S10, B1-S11) remain open. B2-1 (module split decision) is still the upstream gate for the whole structural chain.

### Structural pass band-by-band (post-2026-05-31-continuation state)

| Band | Result | Detail |
| --- | --- | --- |
| S1 | partial fail | FKs to `domains` swept: `domain_data_objects` 5, `solution_domains` 7, `business_function_domains` 4, `capability_domains` 8, `domain_regulations` 0 (B3-6 candidate), `handoffs.source_domain_id` 7, `handoffs.target_domain_id` 1, `skills` 1 (legacy), **`domain_modules` 0 (hard fail, cascades)**, `domain_module_host_domains` 0, `domain_aliases` 0, `domains.parent_domain_id` 0 (acceptable, no sub-domains) |
| S2 | not applicable | Zero modules to sweep |
| S3 | per-master fail | `metric_definitions`: 0 states / 2 events / 0 aliases. `dimensional_models`: 0 states / 2 events / 0 aliases. `metric_materializations`: 0 states / 2 events / 0 aliases. `query_lineage_records`: 0 states / 1 event / 0 aliases. `metric_access_policies`: 0 states / 1 event / 0 aliases. Aliases all-zero across the 5 masters is the consistent B11 fail. |
| A1 | pass | Seven A1 fields populated. |
| A2 | pass | 8 capabilities linked (>=3). |
| A3 | pass | 7 solutions linked (6 primary, 1 secondary). |
| A4 | **hard fail** | `catalog_tagline` and `catalog_description` both empty. (Open as B1A-A4.) |
| M1 | **hard fail** | Zero `domain_modules` rows. (Open as B1A-M1.) |
| M2 | **hard fail** | 8 capabilities, 0 modules; the >=3 -> >=2 modules rule cannot be satisfied. (Open as B1A-M1.) |
| M4 | **hard fail** | Zero modules; every capability is orphan. (Open as B1A-M1.) |
| M5 | not applicable | No lifecycle states to attribute. |
| M6 | **hard fail** | No modules to realize capabilities; converse of M4. (Open as B1A-M1.) |
| M7 | vacuously passes | No DMDO rows catalog-wide; legacy single-master rollup safe. Re-check after B1A-M1 lands. |
| M8 | **hard fail** | Zero modules to populate `catalog_tagline` / `catalog_description` on. (Open as B1A-M1.) |
| B1 | pass | 5 masters exist. |
| B2 | pass | Every master has `singular_label` and `plural_label`. |
| B3 | pass | Every master is prefixed (no bare-word); `is_canonical_bare_word=false` correct. |
| B4 | **hard fail** | All 5 masters carry all three pattern flags `false`; no positive re-evaluation recorded. (Open as B2-2.) |
| B5 | vacuously passes | No `embedded_master` rows for METRICS-LAYER yet. |
| B6 | **hard fail** | Zero master-to-master intra-domain `data_object_relationships`. (Open as B1A-B6.) |
| B7 | pass | 8 `users` edges now in place (cured by 2026-05-31 continuation). |
| B8 | **hard fail** | Zero outbound cross-domain `data_object_relationships` mirroring the 7 outbound handoffs. (Open as B1A-B8.) |
| B9 | pass | All 8 events have `event_category` populated; every event has >=1 handoff. |
| B9b | vacuously passes | Zero modules so no intra-domain cross-module surface; will re-evaluate once B1A-M1 lands. |
| B10b | **hard fail** | All 8 handoffs have NULL `source_domain_module_id` and `target_domain_module_id` on the METRICS-LAYER side. (Open as B1A-B10b, blocked on B1A-M1.) |
| B11 | **hard fail** | Zero `data_object_aliases` across all 5 masters. (Open as B1A-B11.) |
| B12 | **hard fail** | Zero `data_object_lifecycle_states` across all 5 masters. (Open as B1A-B12, blocked on B1A-M1 for `domain_module_id` attribution.) |
| C1 | pass | Data and Analytics owner, Business Intelligence + Data Engineering contributors, AI and Machine Learning consumer. |
| C2 | pass | No capability-level divergences (every capability inherits the domain-level RACI). |
| E1-E6 | vacuously passes | Zero modules so the 2-module floor blocks role authoring; E re-evaluates after B1A-M1. |
| F1 | **hard fail** | Legacy `metrics-layer-system` skill 83 with `domain_module_id=NULL` remains. (Open as B1A-F1.) |
| F2 | **hard fail** | Zero module-anchored system skills (cascade of M1). (Open as B1A-F2, blocked on B1A-M1.) |
| F3 | **hard fail** | No module-anchored skill, so no module-anchored `skill_tools`. (Cascade of B1A-F2.) |
| F4 | pass on legacy | Five `query` tools each have `data_object_id` set; pairing invariant holds. |
| F5 | uncomputable | No module-anchored skill so per-module Semantius score is uncomputable. |
| F7 | not applicable | No channel primitives linked. |
| H1 | partial fail | 4 of 8 handoffs `agent_curated`; 2 of 8 still `discovery_substring` false-positive (process 505); 2 of 8 untagged. (Open as B1A-H1.) |

### Bucket 1 - In-scope confirmed gaps

| ID | Band | Finding | Action |
| --- | --- | --- | --- |
| B1A-M1 | M1 / M2 / M4 / M6 / M8 | Zero `domain_modules` rows for METRICS-LAYER. 8 capabilities linked but no module realizes them; no DMDO rows catalog-wide; no module-attribution path for lifecycle states (B12), handoff module FKs (B10b), system skills (F2). Cascades through every downstream band. Recommended 3-module split (carry from 2026-05-30 B1-S1): `METRICS-LAYER-DEFINITIONS` (masters 252, 253; capabilities 345, 346, 197, 347), `METRICS-LAYER-COMPUTE` (masters 709, 710; capabilities 348, 349), `METRICS-LAYER-DELIVERY` (master 711; capabilities 350, 351). All `module_kind='full'`. | Author 3 modules + `domain_module_capabilities` rows + `domain_module_data_objects` rows (master + embedded_master + consumer shells per the 2026-05-30 spec). Gated on B2-1 user decision on split shape. |
| B1A-A4 | A4 (Rule #20) | `domains.catalog_tagline` and `domains.catalog_description` empty on id 137. | Draft both fields in buyer voice, surface to user for wording approval per Rule #20 (gated on B2-3). Independent of B1A-M1, can ship in parallel. |
| B1A-B6 | B6 | Zero intra-domain master-to-master `data_object_relationships` rows. Expected edges from flagship vendor schemas: `metric_definitions belongs_to dimensional_models`, `metric_materializations precomputes metric_definitions`, `query_lineage_records traces metric_definitions`, `query_lineage_records traces dimensional_models`, `metric_access_policies governs metric_definitions`, `metric_access_policies governs dimensional_models`. | Author 6 intra-domain relationship rows with `relationship_verb` / `inverse_verb` / `relationship_type` / `relationship_kind` / `is_required` / `owner_side`. Can ship before B1A-M1 (rows are master-to-master, module-independent). |
| B1A-B8 | B8 | Zero outbound cross-domain `data_object_relationships` rows mirroring the 7 outbound handoffs. Target-side masters in BI / DATA-AI-PLAT / DCG may not be loaded yet; scan before authoring. | Surface candidate target masters to user; load rows whose target masters exist; defer the rest as report-only follow-ups against neighbor domains. |
| B1A-B10b | B10b | All 8 handoffs (218, 219, 220, 692, 693, 694, 695, 696) have NULL `source_domain_module_id` and `target_domain_module_id` on the METRICS-LAYER side. | After B1A-M1 lands, derive each handoff's METRICS-LAYER module FK per the master-resolution rule and PATCH. Use [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts) as the pattern. Blocked on B1A-M1. |
| B1A-B11 | B11 | Zero `data_object_aliases` across all 5 masters. Flagship vendor terminology differs sharply (Measure / Metric / KPI / Calculation; Cube / Semantic Model / Logical Data Model / Universe / Explore; Pre-Aggregation / Aggregate / Materialized View / Cache; Query Log / Audit Record / Query History; Row-Level Security Policy / Cell-Level Policy / Access Grant / Data Permission). | Author 18 to 25 alias rows per master with `alias_type` per the catalog enum. Can ship before B1A-M1 (aliases attach to data_objects, not modules). |
| B1A-B12 | B12 | Zero `data_object_lifecycle_states` across all 5 masters. Each carries a workflow shape from flagship vendor docs (draft / in_review / certified / deprecated / retired for `metric_definitions`; draft / published / deprecated / retired for `dimensional_models`; scheduled / refreshing / refreshed / stale / failed for `metric_materializations`; captured / processed / archived for `query_lineage_records`; draft / active / superseded / retired for `metric_access_policies`). | Author state rows with `requires_permission=true` on certification / deprecation / retirement / activate / supersede transitions; set `domain_module_id` per the module attribution from B1A-M1. Blocked on B1A-M1. |
| B1A-F1 | F1 | Legacy domain-level skill `metrics-layer-system` (id 83) remains. F1 requires DELETE once a module-anchored system skill exists. | After B1A-M1 + module-anchored skill landings (B1A-F2), DELETE skill id 83. Blocked on B1A-F2. |
| B1A-F2 | F2 / F3 | Zero module-anchored system skills (cascade of M1). Author per-module skills `metrics_layer_definitions_agent`, `metrics_layer_compute_agent`, `metrics_layer_delivery_agent` with the tool floors specified in the 2026-05-30 audit B1-S10. | Author 3 system skills + per-module tools + `skill_tools` rows. Blocked on B1A-M1. |
| B1A-H1 | H1 | 2 of 8 handoffs (219, 220) carry a `discovery_substring` false-positive tag (process 505 `Establish baseline metrics`); 2 of 8 (693, 695) carry zero tags. APQC PCF has thin coverage for headless-BI semantic-layer operations. | For 219: author `agent_curated` row matching handoff 218's process 277 `Manage business information` (same trigger event, similar target context). For 220: per Rule #1 do NOT flip 505 to `rejected` without explicit user instruction; surface as B2-6 user decision. For 693 (`metric_materialization.refreshed` -> DATA-AI-PLAT) and 695 (`metric_access_policy.changed` -> BI): both candidates for Discover Pass 3 (no clean PCF for cache refresh signal or for policy change broadcast). |

Bucket 1 finding-type rollup:

| Finding type | Count |
| --- | --- |
| STRUCTURAL (A / M / B / F bands) | 9 |
| APQC TAGGING | 1 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY findings per neighbor | 0 (still blocked on B1A-M1) |
| MISSING | 0 (deferred to Bucket 3) |

**Total Bucket 1: 10 items.**

### Bucket 2 - Surface-for-user (judgment calls)

All six Bucket 2 items from the 2026-05-30 audit remain open. Re-stated for self-containment:

1. **B2-1 module split shape.** Recommended 3-module split (DEFINITIONS / COMPUTE / DELIVERY). Alternatives: 2-module (CORE + DELIVERY) or 4-module (split GOVERNANCE off). Gates B1A-M1, B1A-B10b, B1A-B12, B1A-F2.
2. **B2-2 pattern flag flips.** Per Rule #12 / B4, candidate flips: `metric_definitions.has_submit_lock=true`, `metric_definitions.has_single_approver=true`, `metric_access_policies.has_single_approver=true`, `dimensional_models.has_submit_lock=true`. Defaults to false otherwise. No notes write either way (Rule #15).
3. **B2-3 A4 wording.** User approves catalog_tagline / catalog_description wording before write (Rule #20). Independent of B2-1.
4. **B2-4 naming arbitration confirmation.** Recommend keeping the 5 prefixed names as is (option a in the 2026-05-30 audit). Decision lives only in audit; no notes write.
5. **B2-5 Looker reclassification.** Keep at `secondary` (recommended) or promote to `primary` because LookML IS the metrics-layer surface.
6. **B2-6 handoff 220 false-positive APQC tag.** Rule #1 forbids flipping `record_status='rejected'` without explicit user instruction; user decides whether to (a) leave at `record_status='new'` for reviewer or (b) explicitly approve PATCH to `rejected` and re-author with `agent_curated`.

### Bucket 3 - Phase 0 pending (speculative)

All six Bucket 3 candidates from the 2026-05-30 audit carry forward unchanged:

1. **B3-1 `metric_views` master** (Cube views / dbt saved queries).
2. **B3-2 `metric_consumers` master** (AtScale / Cube registered downstream consumers).
3. **B3-3 `metric_assertion_rules` master** (dbt / Cube assertion tests).
4. **B3-4 `metric_change_proposals` master** (Slack / PR-driven metric workflow).
5. **B3-5 future split of `METRICS-LAYER-DELIVERY`** into BI-native vs AI-native delivery sub-modules.
6. **B3-6 regulation tagging** (SOX, GDPR / CCPA, HIPAA against the metrics layer vs the BI layer).

### Cross-bucket dependencies

- B2-1 (module split shape) gates B1A-M1, B1A-B10b, B1A-B12, B1A-F1, B1A-F2.
- B1A-B12 (lifecycle states) gates the workflow-gate tool authoring inside B1A-F2.
- B1A-A4 / B1A-B6 / B1A-B11 / B1A-H1 can ship independently of B1A-M1.
- B3-1 / B3-2 / B3-3 / B3-4 (new candidate masters) MUST defer until after B1A-M1 lands.
- B3-5 depends on B3-1 / B3-2 outcomes.
- B2-3 is independent (parallel with B1A-M1).

### Boundary findings per neighbor

Neighbor discovery (unchanged from 2026-05-30):

| Neighbor | Out | In | Weight | Pairwise pass shape |
| --- | --- | --- | --- | --- |
| BI (74) | 4 | 0 | 4 | Pairwise (full) once B1A-M1 lands |
| DATA-AI-PLAT (129) | 2 | 0 | 2 | Lightweight |
| DCG (88) | 1 | 1 | 2 | Lightweight |

Every neighbor pass blocks on B1A-M1 (METRICS-LAYER has no modules to attribute either side of the handoffs to) and on B1A-B8 (no cross-domain relationship rows to diff against Section 5). After B1A-M1 + B1A-B8 land, re-run the 5-section diff for BI first. BI itself has zero modules per its own audit, so the pairwise re-run also requires BI's modularization to complete.

### Report-only follow-ups (owed by other domains)

- **B10 inbound coverage.** Handoff 220 (DCG -> METRICS-LAYER on `metric.deprecated`) exists; its outbound side belongs to DCG B9. Surface: "DCG B9 owns the outbound side of handoff 220." Not blocking.
- **B10b NULL counterparty FKs.** All 8 handoffs have NULL on both sides. BI (zero modules), DATA-AI-PLAT, and DCG each own their inbound / outbound `target_domain_module_id` / `source_domain_module_id` per their own B10b passes. Surface for those domains.
- **B8 inbound mirror.** Inbound `metric.deprecated` from DCG should have a corresponding `data_object_relationships` row from a DCG master to `metric_definitions`. Owed by DCG B8.
- **Cross-domain `data_object_relationships` mirror check (pairwise diff Section 5).** Zero rows exist in either direction for METRICS-LAYER masters paired with any neighbor. The outbound side is B1A-B8 (this audit); the inbound side from each neighbor is owed by that neighbor's B8.

### Per-bucket prompts

- **Bucket 1 prompt:** "Bucket 1 has 10 items: 9 STRUCTURAL plus 1 APQC TAGGING. Six of nine are blocked on B2-1 (module split decision); four (B1A-A4, B1A-B6, B1A-B11, B1A-H1) can ship independently. Approve the four independents now? Approve B1A-M1 once B2-1 is resolved?"
- **Bucket 2 prompt:** "Bucket 2 has 6 carried judgment calls (B2-1 to B2-6). B2-1 is the gating decision: 2-split vs. 3-split (recommended) vs. 4-split. What is your call on each item?"
- **Bucket 3 prompt:** "Bucket 3 has 6 carried speculative items (B3-1 to B3-6). Vet via Phase 0 vendor research or eyeball-mode?"

