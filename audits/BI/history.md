# BI audit history

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 modules; 5 masters (`semantic_metrics`, `bi_reports`, `bi_dashboards`, `bi_queries`, `bi_subscriptions`); 0 capabilities; 22 solutions (12 primary, 4 secondary, 6 partial); 9 trigger_events (8 with empty `event_category`); 0 lifecycle states; 0 aliases; 0 intra-domain `data_object_relationships`; 0 cross-domain `data_object_relationships`; 0 user-edge relationships; 5 outbound + 6 inbound cross-domain handoffs (all with NULL module FKs on BI's side); 1 legacy domain-level system skill with 5 platform-covered `skill_tools` rows; 0 roles; 7 `business_function_domains` rows (1 owner = Business Intelligence, 1 contributor = Finance, 5 consumers = Sales, Marketing, HR, Supply Chain, Business Operations); 1 APQC tag (`discovery_substring` on inbound).
- **Vendor-surface basis:** Tableau (Salesforce), Microsoft Power BI, Looker (Google), Qlik Sense, ThoughtSpot, Sigma, MicroStrategy / Strategy One, Sisense, Domo, AWS QuickSight, IBM Cognos Analytics. Plus suite-aligned coverage from Salesforce CRM Analytics, Microsoft Fabric, Palantir Foundry, Databricks, Snowflake, SAP Business Data Cloud.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

**Headline:** BI is in a **Phase-A skipped** state. The domain row carries good metadata (A1 pass), Phase B masters were loaded, 22 solutions are linked, and a single legacy domain-level system skill exists with platform-covered query tools. But Phase A (`capabilities` + `domain_modules` + `domain_module_capabilities`) and Phase E (roles) were never run, and the Phase-B substrate is thin (no lifecycle states, no aliases, no intra-domain relationships, no user edges, no cross-domain relationships). M1 and A2 are hard-fails that block every downstream concern: with zero modules, F2–F5, E1–E6, B10b cure paths, and the per-module DMDO migration are all unworkable. The audit's Bucket 1 captures the structural gates that have to land before the rest of the per-domain checklist can be re-run meaningfully.

Neighbor discovery (auto-derived from handoffs; no module DMDO rows exist, so the cross-DMDO leg is empty):

| Neighbor | Code | Out | In | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| Metrics Layer | METRICS-LAYER | 0 | 4 | 0 | 4 | Pairwise (full) |
| Data Catalog and Governance | DCG | 1 | 1 | 0 | 2 | Pairwise (lite) |
| Data and AI Platform | DATA-AI-PLAT | 0 | 1 | 0 | 1 | Lightweight |
| Data Loss Prevention | DLP | 1 | 0 | 0 | 1 | Lightweight |
| Subscription Management | SUB-MGMT | 1 | 0 | 0 | 1 | Lightweight |
| FinOps | FINOPS | 1 | 0 | 0 | 1 | Lightweight |
| IT Service Management | ITSM | 1 | 0 | 0 | 1 | Lightweight |

Structural-pass band summary: **M1 hard-fail**; **A2 hard-fail**; A1 pass; A3 pass; B1 pass (5 masters); B2 pass; B3 pass (all names are `bi_`-prefixed or `semantic_metrics` which is qualified); B4 needs positive re-evaluation (all flags default-false); B5 vacuous (no embedded_masters); **B6 hard-fail** (zero intra-domain edges); **B7 hard-fail** (zero user-edges); **B8 hard-fail** (zero cross-domain relationships); **B9 enum violations on 8 of 9 events** + 2 published-but-unwired events (`bi_dashboard.published` 708, `bi_subscription.activated` 713) without a `handoffs` row; B9b vacuous (M1 blocks); **B10b BI-side hard-fail** (5 outbound rows with NULL `source_domain_module_id`); B10b target-side NULLs on every outbound (target domain's responsibility, report-only); B11 hard-fail (zero aliases); B12 hard-fail (zero lifecycle states); C1 pass; C2 not needed (no overrides surfaced); D1 deferred (no fixes loaded); E1-E6 vacuous (no modules); F1 pass-with-debt (the legacy id-33 row is acceptable as transitional until module-level skills exist); F2-F5 vacuous; F7 vacuous; **H1 hard-fail** (1 / 11 cross-domain handoffs tagged; 0 `agent_curated`).

Semantius score: uncomputable (F5 vacuous — depends on F2 which depends on M1). Once modules and module-level system skills exist, the existing 5 platform-covered query tools will roll into the first module's score.

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 + A2 (hard fail)** | Zero `domain_modules` rows; zero `capability_domains` rows. BI has 5 masters and a complete commerce surface (22 solutions, 7 business functions, 11 cross-domain handoffs), yet no module exists to host them, no capabilities exist to be realized, and the legacy `domain_data_objects` rollup carries all role attributions. Under Rule #14, BI must have at least 2 full modules once it carries ≥3 capabilities (and flagship coverage clearly suggests ≥3). The natural cut from flagship vendor surfaces is two modules: **BI-CONTENT-AUTHORING** (semantic_metrics + bi_queries + bi_dashboards + bi_reports as the authoring substrate) and **BI-CONSUMPTION-DELIVERY** (bi_subscriptions + the published-and-shared lifecycle for dashboards / reports). An alternative cut is three modules along the standard analyst-platform shape: **BI-SEMANTIC-MODELING** (semantic_metrics + bi_queries), **BI-VISUALIZATION** (bi_dashboards + bi_reports), **BI-DISTRIBUTION** (bi_subscriptions + alerting). User selects the cut; modules then carry `domain_module_capabilities` for 5–8 capability rows derived from the matrix in Bucket 3. | Author `capabilities` (≥5), `capability_domains`, `domain_modules` (≥2, all `module_kind='full'`), `domain_module_capabilities`. Then PATCH every `domain_data_objects` row to a matching `domain_module_data_objects` row anchored at the chosen module (the legacy rollup becomes derived). Phase B per-module loaders follow. |
| B1-S2 | **B9 trigger_events enum violation** | 8 of 9 BI trigger events carry empty `event_category`. Allowed values per Rule #13: `lifecycle`, `state_change`, `threshold`, `signal`. Only event 112 (`semantic_metric.published`) is set (= `lifecycle`). | PATCH: 706 `bi_report.published` → `lifecycle`; 707 `bi_report.failed` → `state_change`; 708 `bi_dashboard.published` → `lifecycle`; 709 `bi_dashboard.shared_externally` → `state_change` (or `signal` — see B2-S1); 710 `bi_query.long_running` → `threshold`; 711 `bi_query.cost_threshold_breached` → `threshold`; 712 `bi_subscription.delivery_failed` → `state_change`; 713 `bi_subscription.activated` → `lifecycle`. |
| B1-S3 | **B9 events without handoff coverage** | 2 trigger_events have zero `handoffs` rows: 708 `bi_dashboard.published` and 713 `bi_subscription.activated`. The first is a publish event that any cross-domain consumer (DCG for catalog, DLP for scoping) ought to receive; the second is intra-domain only (kicks scheduler → delivery worker). With M1 unresolved, intra-domain handoffs cannot be wired yet, but the cross-domain side of 708 → DCG (catalog discovery) is authorable today. | Insert 1 handoff: `bi_dashboard.published` → DCG (target domain 88), `integration_pattern='api_call'`, `friction_level='low'`, payload `bi_dashboards`. Leave 713 deferred until modules exist (B9b). |
| B1-S4 | **B6 zero intra-domain relationships** | Among BI's 5 masters there are no `data_object_relationships` rows at all, despite the obvious in-domain graph: `bi_queries` → `bi_reports` (a saved query becomes the source of one or more reports); `bi_queries` → `bi_dashboards` (multi-tile dashboards bind queries); `bi_reports` → `bi_subscriptions` (subscriptions deliver reports on a cadence); `bi_dashboards` → `bi_subscriptions` (subscriptions can also deliver dashboard snapshots); `semantic_metrics` → `bi_queries` (saved queries reference metrics by name); `semantic_metrics` → `bi_dashboards` (KPI tiles render metrics directly). | Author 6 relationship rows with verb / inverse / cardinality / kind / is_required / owner_side per the standard B6 shape; load via a focused loader. |
| B1-S5 | **B7 zero user-edges** | No `data_object_relationships` rows between `users` (id 748) and any BI master, despite obvious actor roles: `users` author `bi_queries`, `bi_reports`, `bi_dashboards`; `users` own subscriptions (`bi_subscriptions.owner`); `users` certify / steward `semantic_metrics`. Per Rule #10 each owner / author / steward relation needs an explicit edge. | Insert 5 user-edge rows (users → each master, verbs `authors_bi_query` / `authors_bi_report` / `authors_bi_dashboard` / `owns_bi_subscription` / `stewards_semantic_metric`). Cardinality one-to-many on the user side, is_required varies (subscription owner is required; report author should be required; metric steward is required). |
| B1-S6 | **B8 zero cross-domain relationships** | 11 cross-domain handoffs but 0 cross-domain `data_object_relationships`. Outbound directions that should mirror as relationship edges: `bi_reports` → ITSM `service_incidents` on `bi_report.failed` (verb `escalates_to`); `bi_subscriptions` → SUB-MGMT (payload is BI-mastered; verb depends on what SUB-MGMT actually does with delivery failures — `notifies_subscription_owner` is a candidate but needs Bucket-3 vetting); `bi_dashboards` → DLP `dlp_incidents` or similar on `bi_dashboard.shared_externally` (verb `triggers_dlp_review`); `bi_queries` → FINOPS cost objects on `bi_query.cost_threshold_breached` (verb `feeds_cost_allocation` or similar). Inbound: `semantic_metrics` is mastered by BI but the event source is DATA-AI-PLAT — semantic relationship belongs on the DATA-AI-PLAT side under that domain's B8. | Author 4 outbound cross-domain relationship rows (BI → ITSM, BI → DLP, BI → FINOPS, BI → SUB-MGMT) once the target-side master is identified per row. Verbs as proposed above; revisit at fix time if Bucket 3 surfaces a better verb. |
| B1-S7 | **B10b BI-side hard-fail** | Every outbound BI handoff (687, 688, 689, 690, 691) carries NULL `source_domain_module_id`. Cannot be cured until B1-S1 lands and the per-module DMDO rows are seeded. The deterministic derivation per B10b is: `source_domain_module_id` = the BI module that masters the event's `data_object_id` with the strongest role. Once modules exist, the backfill is straightforward. | Block on B1-S1. After modules + DMDOs land, run the standard backfill loader pattern. |
| B1-S8 | **B11 zero aliases** | Zero `data_object_aliases` rows on any BI master, despite obvious vendor-specific labels: `bi_reports` ↔ "View" (Tableau), "Paginated Report" (Power BI), "Look" (Looker), "Story" (Qlik), "Liveboard" (ThoughtSpot, partial overlap); `bi_dashboards` ↔ "Dashboard" (universal), "App" (Qlik), "Liveboard" (ThoughtSpot), "Page" (Sigma); `bi_queries` ↔ "Workbook query" / "Custom SQL" (Tableau), "Dataset query" (Power BI), "Explore" (Looker), "Answer" (ThoughtSpot, partial); `bi_subscriptions` ↔ "Subscription" (universal); `semantic_metrics` ↔ "Measure" (Tableau, Power BI), "Field" (Looker LookML), "Master Item" (Qlik), "Formula" (ThoughtSpot, partial). | Insert 12–18 alias rows with `alias_type='vendor_synonym'` (or `industry_synonym` where applicable); bundle into a focused loader. |
| B1-S9 | **B12 zero lifecycle states** | No `data_object_lifecycle_states` on any BI master. Obvious state machines: `bi_reports` (draft → published → deprecated → archived); `bi_dashboards` (draft → published → shared_externally → archived); `bi_queries` (saved → certified → deprecated); `bi_subscriptions` (active → paused → failed → cancelled); `semantic_metrics` (draft → published → certified → deprecated). Without states, Rule #12 fails and the workflow-gate permissions for each module are unauthorable. Tied to B1-S1: states need `domain_module_id` per Rule #14's permission-prefix policy, so they're authorable only after modules exist. | Block on B1-S1. After modules land, author state rows with `requires_permission=true` on workflow gates (`publish`, `deprecate`, `share_externally`, `certify`). |
| B1-S10 | **APQC TAGGING (H1 hard-fail)** | 1 of 11 cross-domain handoffs carries an APQC tag (handoff 218 inbound, `discovery_substring` row pointing at "Establish baseline metrics" 19954 L4 — a weak match for METRICS-LAYER → BI metric_certified). Volume expectation per SKILL: 0.5N to 0.8N for N=11 → 5–9 `agent_curated` tags. Routine high-confidence tags listed in the H1 sub-table below. | Author the 8 high-confidence tags inline. Defer 3 to Discover Pass 3 (custom processes) — `bi_dashboard.shared_externally` → DLP (no clean PCF DLP activity at L3), `bi_query.cost_threshold_breached` → FINOPS (FinOps is a modern-era discipline poorly represented in PCF cross-industry), `metric_access_policy.changed` (inbound from METRICS-LAYER, governance shape with no clean cross-industry PCF). |

#### APQC TAGGING — high-confidence proposals

| handoff_id | source → target | trigger_event | payload | Proposed PCF | external_id | hierarchy_level | Confidence |
|---|---|---|---|---|---|---|---|
| 687 | BI → SUB-MGMT | `bi_subscription.delivery_failed` | `bi_subscriptions` | Manage information | 20765 | 2 | medium L2 (no clean L3 for failed-delivery; nearest concept) |
| 688 | BI → DCG | `bi_report.published` | `bi_reports` | Manage business information | 20779 | 3 | confident L3 |
| 689 | BI → ITSM | `bi_report.failed` | `service_incidents` | Triage IT service delivery incidents | 20903 | 4 | confident L4 |
| 691 | BI → FINOPS | `bi_query.cost_threshold_breached` | `bi_queries` | DEFER (no clean PCF; FinOps shape) | n/a | n/a | defer to Discover Pass 3 |
| 690 | BI → DLP | `bi_dashboard.shared_externally` | `bi_dashboards` | DEFER (no clean PCF DLP activity) | n/a | n/a | defer to Discover Pass 3 |
| 151 | DATA-AI-PLAT → BI | `semantic_metric.published` | `semantic_metrics` | Define and maintain business information architecture | 20770 | 3 | confident L3 |
| 218 | METRICS-LAYER → BI | `metric.certified` | `metric_definitions` | Manage business information | 20779 | 3 | confident L3 (REPLACES existing discovery_substring row 505 / "Establish baseline metrics" 19954) |
| 692 | METRICS-LAYER → BI | `dimensional_model.published` | `dimensional_models` | Define and maintain business information architecture | 20770 | 3 | confident L3 |
| 695 | METRICS-LAYER → BI | `metric_access_policy.changed` | `metric_access_policies` | DEFER (governance / IAM shape, no clean cross-industry PCF) | n/a | n/a | defer to Discover Pass 3 |
| 696 | METRICS-LAYER → BI | `metric_materialization.refresh_failed` | `metric_materializations` | Triage IT service delivery incidents | 20903 | 4 | confident L4 (delivery / pipeline failure) |
| 711 | DCG → BI | `data_certification.revoked` | `data_certifications` | Manage business information | 20779 | 3 | confident L3 |

8 high-confidence + 3 deferred = 11 covered, matching the 11 cross-domain handoffs. The replacement of handoff-218's existing `discovery_substring` row by the new `agent_curated` "Manage business information" row follows the Discover Pass 1.5 procedure (agent-curated overrides discovery_substring).

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 + A2 + B9 enum + B9 missing + B6 + B7 + B8 + B10b + B11 + B12) | 9 |
| APQC TAGGING (8 high-confidence + 3 deferred = 1 line item per the count convention) | 1 |
| MISSING | 0 (deferred to Bucket 3) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY (NULL FK report-only, see § Report-only follow-ups) | 0 in Bucket 1 |
| **Boundary findings per neighbor** (3 items, see below) | 3 |
| **Bucket 1 total** | 13 |

#### Boundary findings per neighbor (pairwise pass)

For neighbors at edge weight ≥3 (METRICS-LAYER at 4 and DCG at 2) plus the four lightweight neighbors, the full 5-section diff was run mentally and surfaces three items that BI's audit can act on without scheduling other domains' work.

**B1-N1. METRICS-LAYER → BI (inbound, weight 4):** all 4 inbound handoffs (151 `semantic_metric.published`, 218 `metric.certified`, 692 `dimensional_model.published`, 695 `metric_access_policy.changed`, 696 `metric_materialization.refresh_failed`) carry NULL `target_domain_module_id` on BI's side. The standard B10b derivation needs BI modules to exist first (B1-S1); once they do, the target module for every inbound is the same: BI-CONTENT-AUTHORING (or BI-SEMANTIC-MODELING if the 3-module cut is chosen). Same fix: block on B1-S1, then PATCH all 5 in one chunked update. The source-side METRICS-LAYER NULLs (5 rows) are METRICS-LAYER's B10b — surface in this audit's Report-only section. Note also: BI consumes `metric_definitions` (id 252) which has the M7 catalog-wide multi-master collision flagged below.

**B1-N2. DCG → BI (inbound, weight 2):** handoff 711 (`data_certification.revoked`) carries NULL `target_domain_module_id`. Same fix: block on B1-S1 + post-module PATCH. Conversely BI → DCG (handoff 688 `bi_report.published`) has NULL `source_domain_module_id` (BI side); BI also lacks the Section-3 mirror handoff `bi_dashboard.published` → DCG noted in B1-S3. Net: one new outbound (covered by B1-S3) plus a post-module PATCH on both rows.

**B1-N3. Missing consumer DMDOs across all 5 BI-target domains:** Pairwise Section-4. M7 catalog-wide check returned ZERO rows where any non-BI module declares `role IN (consumer, contributor, embedded_master)` on any of BI's 5 masters. Every BI-target (ITSM, SUB-MGMT, DCG, DLP, FINOPS) implicitly depends on `bi_reports` / `bi_dashboards` / `bi_queries` / `bi_subscriptions` through the handoff payload but no module-level DMDO row records the dependency. This is the same shape as APM's B1-S9. Not BI's fix; surface to user so the 5 target audits can pick it up.

### Bucket 2 — Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module cut for BI-S1.** Two natural cuts surface from the flagship matrix: (a) **2-module cut** — BI-CONTENT-AUTHORING (queries / dashboards / reports / metrics, with the publish + certify + deprecate lifecycle gates) + BI-CONSUMPTION-DELIVERY (subscriptions + the shared-externally and delivery-failed flows). (b) **3-module cut** — BI-SEMANTIC-MODELING (semantic_metrics + bi_queries, the "modeling" half) + BI-VISUALIZATION (bi_dashboards + bi_reports + the "publish" lifecycle) + BI-DISTRIBUTION (bi_subscriptions + alerts + delivery). The 3-module cut maps better to ThoughtSpot / Looker LookML separation; the 2-module cut maps better to Tableau / Power BI's "Creator vs Viewer" personas. | Module shape is editorial. The capability count argues for ≥2 modules under Rule #14; either cut clears that floor. | (a) 2-module, (b) 3-module, (c) other split — user names it. |
| B2-S2 | **Rule #15 notes-pollution check.** No BI row in any catalog table currently carries populated `notes` text. Compliant. Confirmed positively to surface this as a healthy baseline that the upcoming Phase-A / Phase-B loader for BI must preserve — Rule #15 says default empty, and BI's current state honors it. No action needed unless the user wants to author a domain-level note about BI's `record_status='new'` (it is; the audit confirms it). | Confirmation question, not a fix request. | (a) acknowledge & move on (b) author user-approved notes wording for a specific row (which row?). |
| B2-S3 | **B4 pattern-flag positive re-evaluation per Rule #12.** All 5 BI masters have `has_personal_content / has_submit_lock / has_single_approver` default-false. The Phase-B substrate for BI hasn't been re-evaluated since load. Specifically: `bi_subscriptions.has_personal_content=true`? (subscriptions carry recipient lists, delivery-address PII). `bi_reports.has_submit_lock=true`? (a published report should freeze its query reference until republished). `bi_dashboards.has_submit_lock=true`? (same logic). `semantic_metrics.has_single_approver=true`? (metric certification is typically a single-data-steward approval). | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no. |
| B2-S4 | **F1 legacy domain-level system skill (id 33 `bi-system`).** A `skill_type='system'` row exists with `domain_id=74` and `domain_module_id=NULL`. Its 5 `skill_tools` rows all point at platform-tier `query_*` tools (semantic_metrics, bi_reports, bi_dashboards, bi_queries, bi_subscriptions). Under Rule #14 and Rule #17, every module gets exactly one system skill; the legacy row is "acceptable transitional state" only while no module-level system skill exists for BI (F1 pass criterion). Once B1-S1 lands and BI's modules each ship a module-level system skill, the legacy id-33 row becomes obsolete and must be DELETEd. The query tools themselves stay — they get re-linked to the new module-level skills. | Editorial — does the user want to (a) preserve the legacy row as the "domain landing skill" intentionally, (b) plan to DELETE it once module skills land, or (c) DELETE it now and rebuild with module skills? | Choose (a / b / c). The SKILL canonical answer is (b): the legacy row is migration debt. |

### Bucket 3 — Phase 0 pending (speculative)

A formal Phase 0 vendor-surface enumeration has not been run for BI. The current footprint of 5 masters covers the artifacts (reports / dashboards / queries / subscriptions / metrics) but misses the workflow substrate flagship vendors universally model. The following candidates surface from the agent's market knowledge of Tableau / Power BI / Looker / Qlik / ThoughtSpot / Sigma / MicroStrategy / Sisense / Domo / QuickSight / Cognos. They are speculative pending a formal Phase 0 subagent pass producing `c:/tmp/BI-phase0-2026-05-30.md` with vendor entity surfaces per row.

| # | Candidate entity | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-1 | `bi_workspaces` (or `bi_projects`) | Universal: Tableau "Project", Power BI "Workspace", Looker "Folder", Qlik "Space", ThoughtSpot "Worksheet group". Container that owns RBAC scope, content versioning, and content lifecycle. | Phase 0: confirm whether this is a first-class master or a derived container (in some vendors it is just a permission scope; in others it is a billing / capacity unit). Likely master. |
| B3-2 | `bi_data_sources` (or `bi_connections`) | Universal: Tableau "Data Source / Connection", Power BI "Dataset connection", Looker "Connection", Qlik "Data connection", QuickSight "Data source". The published, governed link to a warehouse / database / SaaS source. Distinct from `semantic_metrics` (which references columns over a source). | Phase 0: verify whether this collapses into METRICS-LAYER's `dimensional_models` or is a BI-owned artifact at the connection-pool layer. Probably BI-owned. |
| B3-3 | `bi_alerts` (or `bi_alert_rules`) | Universal: Tableau Data-Driven Alerts, Power BI Alerts, Looker Alerts, Qlik Alerting, ThoughtSpot Monitor, Sigma Alerts. Threshold-based push notification distinct from `bi_subscriptions` (recurring delivery on a cadence vs. event-driven). | Phase 0: confirm distinction from subscriptions. Likely master, lifecycle (`active / paused / triggered / acknowledged`). |
| B3-4 | `bi_calculated_fields` (or `bi_calculations`) | Tableau Calculated Field, Power BI Measure (in-report), Sigma Formula, QuickSight Calculated Field. Local-to-report computation distinct from `semantic_metrics` (which is centrally certified). | Phase 0: confirm vs. METRICS-LAYER overlap. Tighter scope = local-to-report = BI-owned. |
| B3-5 | `bi_embed_artifacts` (or `bi_embedded_views`) | Universal embedded-analytics surface: Tableau Embedded Analytics, Power BI Embedded, Looker Embed SDK, Sisense Embed, Qlik Embedded Analytics. Distinct from a published dashboard (carries embed-token policy, host-domain whitelist, branding overrides). | Phase 0: confirm market shape. Embedded analytics is a distinct buying motion (developer-led); could justify its own module (BI-EMBEDDED-ANALYTICS) rather than an entity in BI-DISTRIBUTION. |
| B3-6 | `bi_search_artifacts` (ThoughtSpot Answers, Sigma Ask, Power BI Q&A, Tableau Ask Data) | Search-first analytics is a growing category — natural-language-to-query artifacts that are neither dashboards nor reports but warrant tracking (each is a persisted query result with NLQ provenance). | Phase 0: medium-confidence candidate. May be a sub-feature of `bi_queries` (a query authored via NLQ) rather than a separate master — confirm at vendor surface time. |
| B3-7 | `bi_row_level_security_policies` (or `bi_data_policies`) | Universal: Tableau Data Policies, Power BI Row-Level Security, Looker access_filter, Sigma Workbook Data Permissions, QuickSight Row-Level Security. Distinct from METRICS-LAYER's `metric_access_policies` (which is metric-scoped); BI's RLS is content-scoped (per-report or per-dataset). | Phase 0: confirm whether this collapses into METRICS-LAYER's policies (if vendor-neutral semantic layer is the source of truth) or is BI-owned (if every BI tool carries its own RLS engine). Today flagship vendors all carry their own — likely BI-owned. |

**Module-cut implication of Bucket 3:** if B3-5 (embedded analytics) lands as confirmed, the 3-module cut from B2-S1 grows to 4: BI-SEMANTIC-MODELING, BI-VISUALIZATION, BI-DISTRIBUTION, BI-EMBEDDED-ANALYTICS. If only B3-1 / B3-2 / B3-3 land, the 2-module or 3-module cut still works (workspaces and data_sources sit in BI-CONTENT-AUTHORING or BI-SEMANTIC-MODELING; alerts sit in BI-DISTRIBUTION).

No candidate domain (separate market) was surfaced — every Bucket 3 item is a sub-entity that belongs inside the BI domain. The market-audit semantic pass did not generate any rows for the `audits/_missing-domains.md` queue.

### Cross-bucket dependencies

- **B1-S1 gates B1-S7, B1-S9, B1-N1, B1-N2, B2-S4, and all Bucket 3 modularization decisions.** Modules must land before per-module DMDO migration, B10b backfill, lifecycle states with `domain_module_id`, the module-level system skills that retire the legacy F1 row, and any decision about Bucket 3 entities' module assignment. Resolve B1-S1 first.
- **B2-S1 (module cut) shapes B1-S1.** The 2-module vs 3-module decision is the editorial half of the M1 fix; the agent can author either shape once told which one.
- **B1-S6 (cross-domain relationships) is independent of Bucket 3** but depends on identifying target-side masters (e.g. SUB-MGMT's notification target, DLP's incident target) at fix time.
- **B3-5 (embedded analytics) might shift the module cut from 3 → 4 modules.** If user chooses formal Phase 0 vetting and B3-5 confirms, revisit B2-S1.
- **B2-S2 / B2-S3 / B2-S4** (Rule #15 confirmation / pattern flags / legacy skill) are independent of every other bucket and can be answered in any order.

### Per-bucket prompts

**Bucket 1 — fix these now?** Reply `all`, list (e.g. `S1, S2, H1-top8`), or `skip`. Suggested sequence: **B1-S1 first** (gates everything else), then S2 / S3 / S4 / S5 (B-band substrate), then S6 / S7 / S8 / S9 (cross-domain + aliases + lifecycle once modules exist), then S10 (APQC tagging).

- **B1-S1 (M1 + A2 — author capabilities + modules + capability_domains + domain_module_capabilities, migrate DMDOs):** decide B2-S1 (module cut) first.
- **B1-S2 (B9 enum PATCH on 8 events):** trivial; one PATCH each.
- **B1-S3 (insert 1 missing handoff `bi_dashboard.published` → DCG):** structural; one row.
- **B1-S4 (6 intra-domain B6 edges):** mechanical.
- **B1-S5 (5 user-edge B7 rows):** mechanical.
- **B1-S6 (4 cross-domain B8 relationships):** target masters need identification at fix time.
- **B1-S7 (B10b BI-side backfill on 5 outbound rows):** blocked on B1-S1; queue as a post-module patch.
- **B1-S8 (12–18 alias rows):** focused loader.
- **B1-S9 (lifecycle states):** blocked on B1-S1.
- **B1-S10 (8 APQC tag inserts + 3 Discover deferrals + 1 replacement of the discovery_substring row on handoff 218):** chunked POST, idempotent.
- **B1-N1 / B1-N2 (METRICS-LAYER + DCG B10b NULLs):** blocked on B1-S1.
- **B1-N3 (missing consumer DMDOs on every BI-target domain):** schedule b1 audits for ITSM, SUB-MGMT, DCG, DLP, FINOPS — not BI's fix.

**Bucket 2 — what's your call on each?** I'll wait for per-item decisions.

- **B2-S1 (module cut):** (a) 2-module, (b) 3-module, (c) other.
- **B2-S2 (Rule #15 notes baseline):** confirm the current empty-notes state is the right baseline. Yes / no, plus any per-row notes the user wants to author with explicit wording.
- **B2-S3 (pattern flags):** per-flag yes / no.
- **B2-S4 (F1 legacy skill id 33):** (a) keep, (b) plan-to-delete-after-module-skills, (c) delete-now.

**Bucket 3 — Phase 0 pending — vet via formal Phase 0 research, or eyeball-mode?** If eyeball-mode, name which of the 7 candidates (B3-1 through B3-7) to treat as confirmed; named candidates get loaded once modules exist (B1-S1). If formal Phase 0, the agent will produce a `c:/tmp/BI-phase0-2026-05-30.md` and replay this section against vendor-surface evidence.

### Report-only follow-ups (owed by other domains)

- **METRICS-LAYER B10b** owes `source_domain_module_id` on all 5 inbound handoffs into BI (151, 218, 692, 695, 696). Standard B10b derivation; not BI's fix.
- **METRICS-LAYER + DCG M7 catalog-wide** — `metric_definitions` (id 252) is mastered by BOTH METRICS-LAYER and DCG. This is a Rule #11 / M7 hard fail and the catalog cannot pick a canonical owner. BI consumes this entity but does not master it; the resolution conversation belongs to METRICS-LAYER and DCG.
- **DATA-AI-PLAT B10b** owes `source_domain_module_id` on inbound 151 (`semantic_metric.published`).
- **DCG B10b** owes `source_domain_module_id` on inbound 711 (`data_certification.revoked`).
- **ITSM B10b** — handoff 689 already has `target_domain_module_id=38` (ITSM-INCIDENT-MGMT); fine on ITSM's side. BI side is the gap (B1-S7).
- **SUB-MGMT / DLP / FINOPS B10b** owe `target_domain_module_id` on inbound rows from BI (687, 690, 691). Cannot be derived without their per-module DMDO structure being populated against BI's masters.
- **Missing consumer DMDOs (B1-N3 elaborated):** ITSM, SUB-MGMT, DCG, DLP, FINOPS should each declare `consumer` (or contributor / embedded_master) DMDO rows on the relevant BI masters they receive payloads from. Specifically: ITSM-INCIDENT-MGMT consumes `bi_reports`; SUB-MGMT consumes `bi_subscriptions`; DCG consumes `bi_reports` (and likely `bi_dashboards` if B1-S3 lands); DLP consumes `bi_dashboards`; FINOPS consumes `bi_queries`. Each is a 1-row insert on the respective target domain's audit.

Schedule b1 audits for METRICS-LAYER, DCG, DATA-AI-PLAT, ITSM, SUB-MGMT, DLP, FINOPS to pick up these report-only follow-ups.

## 2026-05-31, Continuation: B1 technical fixes

Applied audit-pre-specified, technical-only B1 fixes via [.tmp_deploy/fix_bi_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_bi_b1_technical_2026_05_31.ts). No user judgment invoked.

### Fixes applied

| Finding | Action | Count |
|---|---|---|
| B1-S2 (trigger_events enum) | PATCH `event_category` on 8 events: 706 lifecycle, 707 state_change, 708 lifecycle, 709 state_change, 710 threshold, 711 threshold, 712 state_change, 713 lifecycle | 8 |
| B1-S3 (missing handoff `bi_dashboard.published` -> DCG) | INSERT 1 row (handoff id 1341): source BI (74), target DCG (88), trigger 708, payload `bi_dashboards` (692), `integration_pattern=api_call`, `friction_level=low`. `source_domain_module_id` left NULL (blocked on B1-S1) | 1 |
| B1-S5 (Rule #10 user-edges) | INSERT 5 `data_object_relationships` rows from `users` (748) to each BI master with `owner_side=target`, `relationship_type=one_to_many`, `relationship_kind=reference`, `is_required=true`. Verbs: `authors` (bi_queries 693, bi_reports 691, bi_dashboards 692), `owns` (bi_subscriptions 694), `stewards` (semantic_metrics 230). New ids 1526-1530 | 5 |
| B1-S10 (APQC tags) | DELETE stale `discovery_substring` row id 124 (handoff 218 -> process 505). INSERT 8 `agent_curated` `handoff_processes` rows on the audit-pre-specified pairs (handoff -> process external_id): 687->20765, 688->20779, 689->20903, 151->20770, 218->20779 (replacement), 692->20770, 696->20903, 711->20779. New ids 280-287 | 9 ops (1 delete + 8 inserts) |

### Deferred (out of technical scope or blocked)

| Finding | Reason for defer |
|---|---|
| B1-S1 (M1 + A2: capabilities + modules + DMDO migration) | Gated on B2-S1 (user picks 2-module vs 3-module cut) |
| B1-S4 (6 intra-domain B6 edges) | Not user-edges (B7); intra-domain `data_object_relationships` are not in the technical-fix list for this continuation |
| B1-S6 (4 cross-domain B8 relationships) | Audit says "target masters need identification at fix time", verbs not pre-specified per row |
| B1-S7 (B10b backfill on 5 outbound) | Blocked on B1-S1 (needs BI per-module DMDOs) |
| B1-S8 (12-18 alias rows) | New alias inserts, not naming renames; not in the technical-PATCH list for this continuation |
| B1-S9 (lifecycle states) | Blocked on B1-S1 (states need `domain_module_id` per Rule #14) |
| B1-S10 deferred subset (handoffs 690, 691, 695) | Audit explicitly defers to Discover Pass 3 (no clean PCF) |
| B1-N1, B1-N2 (METRICS-LAYER + DCG target-side B10b) | Blocked on B1-S1 |
| B1-N3 (consumer DMDOs on 5 BI-target domains) | Not BI's fix; owed by other domains' audits |
| All of Bucket 2 (B2-S1 - B2-S4) | User-judgment calls |
| All of Bucket 3 (B3-1 - B3-7) | Speculative; requires formal Phase 0 vendor-surface pass |

### Loader

[.tmp_deploy/fix_bi_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_bi_b1_technical_2026_05_31.ts)

### Verification spot-checks

- `/trigger_events?id=in.(706,707,708,709,710,711,712,713)&select=id,event_category` — all 8 carry non-empty enum values matching the audit specification.
- `/handoffs?and=(source_domain_id.eq.74,target_domain_id.eq.88,trigger_event_id.eq.708)` returns 1 row (id 1341).
- `/data_object_relationships?data_object_id=eq.748&related_data_object_id=in.(230,691,692,693,694)` returns 5 rows.
- `/handoff_processes?handoff_id=in.(687,688,689,151,218,692,696,711)&select=handoff_id,process_id,proposal_source` returns 8 `agent_curated` rows; the prior id-124 `discovery_substring` row on 218 is gone.

### JWT errors

None encountered during the fix loop.

## 2026-05-31, Audit

Structural Validate b1 pass run after the 2026-05-31 Continuation. Reads live state via `semantius` CLI; no fixes applied in this audit.

### Summary

- Current footprint: 5 masters (`semantic_metrics` 230, `bi_reports` 691, `bi_dashboards` 692, `bi_queries` 693, `bi_subscriptions` 694), 3 consumers (`lakehouse_tables` 226, `data_products` 232, `metric_definitions` 252); 0 modules; 0 capabilities; 23 solutions (13 primary, 5 secondary, 5 partial); 7 `business_function_domains` rows (1 owner Business Intelligence, 1 contributor Finance, 5 consumers Sales, Marketing, HR, Supply Chain, Business Operations); 6 outbound + 6 inbound cross-domain handoffs (12 total cross-domain); 0 intra-domain handoffs; 1 legacy `skill_type='system'` row id 33 (`bi-system`, `domain_module_id` NULL) with 5 platform-tier `query_*` `skill_tools`; 0 lifecycle states; 0 aliases; 0 intra-domain `data_object_relationships`; 5 user-edge `data_object_relationships` from `users` 748 (loaded by 2026-05-31 Continuation); 0 cross-domain `data_object_relationships`; 0 roles in Business Intelligence function (id 66); 9 trigger_events (all carry valid `event_category` after the Continuation PATCH).
- Bucket 1 (in-scope, agent fixable): 11 items.
- Bucket 2 (surface-for-user, judgment): 4 items.
- Bucket 3 (Phase 0 pending, speculative): 7 items.

Headline: BI remains in a **Phase-A skipped** state. The 2026-05-31 Continuation cleared the technical sub-set of Bucket 1 (B1-S2 enum PATCH, B1-S3 missing handoff insert, B1-S5 user-edges, B1-S10 APQC tags + replacement), but the M1 + A2 structural gate is unresolved and continues to block B1-S7 (B10b BI-side backfill), B1-S9 (lifecycle states), B1-N1, B1-N2, and the module-level Phase B/E/F work. APQC coverage rose to 9 of 12 cross-domain handoffs (handoff 691 to FINOPS picked up process 1132 "Monitor and analyze IT financial performance" L4); 690 (DLP), 695 (METRICS-LAYER), and 1341 (the new `bi_dashboard.published` to DCG handoff inserted by the Continuation) remain untagged.

Structural-pass band summary: A1 pass; **A2 hard-fail** (0 `capability_domains`); A3 pass; **A4 hard-fail** (`domains.catalog_tagline` and `catalog_description` both empty); **M1 hard-fail** (0 `domain_modules`); M2-M8 vacuous on M1; B1 pass (5 masters); B2 pass (all masters carry both labels); B3 pass (all names prefixed or qualified); B4 needs positive re-evaluation (all flags still default-false); B5 vacuous (no embedded_masters); **B6 hard-fail** (0 intra-domain edges); B7 pass (5 user-edges loaded by Continuation); **B8 hard-fail** (0 cross-domain `data_object_relationships`); B9 pass (all 9 events now carry valid `event_category`; 1341 has handoff coverage on event 708; 713 remains intra-domain pending modules); B9b vacuous (M1 blocks); **B10b BI-side hard-fail** (6 outbound rows with NULL `source_domain_module_id`; only 689 has a `target_domain_module_id` set — 38 ITSM-INCIDENT-MGMT); **B11 hard-fail** (0 aliases); **B12 hard-fail** (0 lifecycle states); C1 pass; C2 not surfaced; D1 deferred (no fixes loaded in this audit); E1-E6 vacuous (no modules); F1 pass-with-debt (id 33 acceptable while no module-level skill exists); F2-F5 vacuous; F7 vacuous; **H1 hard-fail** (9/12 cross-domain handoffs tagged; 3 untagged — handoffs 690, 695, 1341).

Semantius score: uncomputable (F5 vacuous; F2 vacuous; depends on M1).

Neighbor discovery (auto-derived from `handoffs`; cross-DMDO leg empty since no module DMDO rows exist for BI):

| Neighbor | Code | Out | In | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| Metrics Layer | METRICS-LAYER | 0 | 4 | 0 | 4 | Pairwise (full) |
| Data Catalog and Governance | DCG | 2 | 1 | 0 | 3 | Pairwise (full) |
| Data and AI Platform | DATA-AI-PLAT | 0 | 1 | 0 | 1 | Lightweight |
| Data Loss Prevention | DLP | 1 | 0 | 0 | 1 | Lightweight |
| Subscription Management | SUB-MGMT | 1 | 0 | 0 | 1 | Lightweight |
| FinOps | FINOPS | 1 | 0 | 0 | 1 | Lightweight |
| IT Service Management | ITSM | 1 | 0 | 0 | 1 | Lightweight |

### Bucket 1 — In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 + A2 (hard fail)** | 0 `domain_modules`, 0 `capability_domains`. Gates B1-S7, B1-S9, B1-N1, B1-N2, B2-S4 retirement, and all module-level Phase B/E/F work. Unchanged since 2026-05-30 audit. Two natural cuts (2-module BI-CONTENT-AUTHORING + BI-CONSUMPTION-DELIVERY, or 3-module BI-SEMANTIC-MODELING + BI-VISUALIZATION + BI-DISTRIBUTION) remain candidates pending B2-S1 user pick. | Block on B2-S1; then author capabilities, modules, capability_domains, domain_module_capabilities; migrate `domain_data_objects` rows to `domain_module_data_objects` anchored on chosen modules. |
| B1-S4 | **B6 hard-fail** | 0 intra-domain `data_object_relationships` rows among BI's 5 masters. Expected edges per 2026-05-30 audit: `bi_queries` to `bi_reports`, `bi_queries` to `bi_dashboards`, `bi_reports` to `bi_subscriptions`, `bi_dashboards` to `bi_subscriptions`, `semantic_metrics` to `bi_queries`, `semantic_metrics` to `bi_dashboards`. | Author 6 relationship rows (verb, inverse_verb, relationship_type, relationship_kind, is_required, owner_side) and load via focused loader. |
| B1-S6 | **B8 hard-fail** | 0 outbound cross-domain `data_object_relationships`. 6 outbound cross-domain handoffs imply 4 candidate edges: `bi_reports` to ITSM `service_incidents` on `bi_report.failed`; `bi_subscriptions` to SUB-MGMT (target master pending identification); `bi_dashboards` to DLP on `bi_dashboard.shared_externally`; `bi_queries` to FINOPS on `bi_query.cost_threshold_breached`. The DCG mirror via handoff 688 (`bi_report.published`) and handoff 1341 (`bi_dashboard.published`) adds 2 more candidates against DCG masters. | Identify target-side masters per handoff, author 4-6 outbound cross-domain relationship rows. |
| B1-S7 | **B10b BI-side hard-fail** | 6 outbound handoff rows (687, 688, 689, 690, 691, 1341) carry NULL `source_domain_module_id`. Cannot be cured until B1-S1 lands. Deterministic derivation per B10b: `source_domain_module_id` = the BI module that masters the trigger event's data_object with the strongest role. | Block on B1-S1; then run standard backfill loader. |
| B1-S8 | **B11 hard-fail** | 0 `data_object_aliases` rows on any BI master. Vendor-specific synonyms unchanged from 2026-05-30 audit (Tableau "View"/"Story", Power BI "Paginated Report", Looker "Look", Qlik "App"/"Master Item", ThoughtSpot "Liveboard"/"Answer", Sigma "Page"/"Formula"). | Author 12-18 alias rows with `alias_type='vendor_synonym'`; bundle into focused loader. |
| B1-S9 | **B12 hard-fail** | 0 `data_object_lifecycle_states` on any BI master. Workflow gates need `domain_module_id` per Rule #14 permission-prefix policy, so authorable only after B1-S1. Obvious state machines unchanged from 2026-05-30. | Block on B1-S1; author state rows with `requires_permission=true` on `publish`/`deprecate`/`share_externally`/`certify` gates. |
| B1-S10 | **A4 hard-fail (Rule #20)** | `domains.catalog_tagline` and `domains.catalog_description` are both empty strings on the BI row. Per Rule #20 these are the buyer-facing surface for catalog list cards and detail pages; backfill is allowed on audit when both are empty, draft must be surfaced for user review before write. | Draft buyer-voice tagline (single sentence, workflow plus value) and 1-3 paragraph description; surface to user under B2 for approval BEFORE writing. Surfaces as B2-S5 below. |
| B1-H1 | **H1 hard-fail residual** | 3 of 12 cross-domain handoffs untagged: 690 (BI to DLP on `bi_dashboard.shared_externally`), 695 (METRICS-LAYER to BI on `metric_access_policy.changed`, inbound), 1341 (BI to DCG on `bi_dashboard.published`, new). The first two are 2026-05-30 audit Discover-Pass-3 deferrals (no clean PCF DLP / IAM-shape activity); 1341 is new and warrants a fresh PCF lookup. | Re-attempt PCF lookup on 1341 (candidate: "Manage business information" external_id 20779 L3, same as 688). Confirm 690 and 695 stay as Discover Pass 3 custom-process candidates. |
| B1-N1 | **METRICS-LAYER inbound NULLs** | All 4 inbound METRICS-LAYER handoffs (151, 218, 692, 696) plus the access-policy row (695) carry NULL `target_domain_module_id` on BI's side. Cannot derive until BI modules exist. Pairwise full pass deferred until B1-S1 lands. | Block on B1-S1; then chunked PATCH on 5 rows. |
| B1-N2 | **DCG boundary NULLs** | Outbound 688, 1341 carry NULL `source_domain_module_id`; inbound 711 (`data_certification.revoked`) carries NULL `target_domain_module_id`. Same B10b shape. | Block on B1-S1; then PATCH 3 rows. |
| B1-N3 | **Missing consumer DMDOs across 5 BI-target domains** | Catalog-wide M7 returned ZERO non-BI modules declaring `role IN (consumer, contributor, embedded_master)` on any of BI's 5 masters. Report-only, owed by ITSM, SUB-MGMT, DCG, DLP, FINOPS audits. | Not BI's fix; surface as Report-only. |

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 + A2 + A4 + B6 + B8 + B10b + B11 + B12) | 8 |
| APQC TAGGING (B1-H1) | 1 |
| BOUNDARY (B1-N1 + B1-N2) | 2 |
| MISSING / WRONG-OWNERSHIP / SCOPE-CREEP | 0 (deferred to Bucket 3) |
| **Bucket 1 total** | 11 |

### Bucket 2 — Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | Module cut for B1-S1 (carried forward from 2026-05-30 audit). 2-module (BI-CONTENT-AUTHORING + BI-CONSUMPTION-DELIVERY) vs 3-module (BI-SEMANTIC-MODELING + BI-VISUALIZATION + BI-DISTRIBUTION) vs other. | Module shape is editorial; both clear the Rule #14 floor. | (a) 2-module, (b) 3-module, (c) other split. |
| B2-S3 | B4 pattern-flag positive re-evaluation per Rule #12 (carried forward). All 5 masters still default-false. Specifically: `bi_subscriptions.has_personal_content`? (recipient lists / delivery-address PII); `bi_reports.has_submit_lock`? (published report freezes its query reference); `bi_dashboards.has_submit_lock`? (same); `semantic_metrics.has_single_approver`? (metric certification typically single-data-steward approval). | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no. |
| B2-S4 | F1 legacy domain-level system skill id 33 (`bi-system`) carried forward. While no module-level system skill exists, the row is acceptable transitional state per F1 pass criterion. Once B1-S1 lands and BI's modules each ship a module-level system skill, id 33 must be DELETEd; its 5 query tools re-link to the new module-level skills. | Editorial migration debt. | (a) preserve as domain landing, (b) plan delete after module skills, (c) delete now and rebuild. |
| B2-S5 | A4 catalog UX backfill: draft `catalog_tagline` and `catalog_description` for the BI domain row per Rule #20 buyer voice. Both columns currently empty (Rule #20 permits a backfill draft on audit, but write requires explicit per-row user approval BEFORE the PATCH). | Buyer voice and exact wording are user-owned; the user may also delegate to marketing. | (a) agent drafts and surfaces wording for user review, (b) user supplies wording, (c) defer. |

### Bucket 3 — Phase 0 pending (speculative)

Carried forward from 2026-05-30 audit unchanged; no Phase 0 vendor-surface pass has been run for BI. The 7 candidates remain speculative pending a formal `c:/tmp/BI-phase0-<YYYY-MM-DD>.md` subagent run.

| # | Candidate | Vendor knowledge basis |
|---|---|---|
| B3-1 | `bi_workspaces` (or `bi_projects`) | Universal container: Tableau "Project", Power BI "Workspace", Looker "Folder", Qlik "Space", ThoughtSpot "Worksheet group". |
| B3-2 | `bi_data_sources` (or `bi_connections`) | Tableau "Data Source", Power BI "Dataset connection", Looker "Connection", Qlik "Data connection", QuickSight "Data source". |
| B3-3 | `bi_alerts` (or `bi_alert_rules`) | Tableau Data-Driven Alerts, Power BI Alerts, Looker Alerts, Qlik Alerting, ThoughtSpot Monitor, Sigma Alerts. |
| B3-4 | `bi_calculated_fields` (or `bi_calculations`) | Tableau Calculated Field, Power BI Measure (in-report), Sigma Formula, QuickSight Calculated Field. |
| B3-5 | `bi_embed_artifacts` (or `bi_embedded_views`) | Tableau Embedded Analytics, Power BI Embedded, Looker Embed SDK, Sisense Embed, Qlik Embedded Analytics. Might justify own module. |
| B3-6 | `bi_search_artifacts` | ThoughtSpot Answers, Sigma Ask, Power BI Q&A, Tableau Ask Data. May be a sub-feature of `bi_queries`. |
| B3-7 | `bi_row_level_security_policies` (or `bi_data_policies`) | Tableau Data Policies, Power BI Row-Level Security, Looker access_filter, Sigma Workbook Data Permissions, QuickSight Row-Level Security. |

Module-cut implication: if B3-5 lands as confirmed the 3-module cut becomes 4 (adding BI-EMBEDDED-ANALYTICS).

No new candidate domains surfaced; every Bucket 3 item is a sub-entity inside BI.

### Cross-bucket dependencies

- B1-S1 gates B1-S7, B1-S9, B1-N1, B1-N2, B2-S4 retirement, and all Bucket 3 modularization placement decisions.
- B2-S1 (module cut) shapes B1-S1.
- B1-S6 (B8 cross-domain relationships) is independent of Bucket 3 but depends on identifying target-side masters at fix time.
- B3-5 might shift the cut from 3 to 4 modules; revisit B2-S1 if Phase 0 confirms.
- B2-S3 / B2-S4 / B2-S5 are independent of other buckets and can be answered in any order.

### Report-only follow-ups (owed by other domains)

- METRICS-LAYER B10b owes `source_domain_module_id` on all 5 inbound rows into BI (151, 218, 692, 695, 696).
- METRICS-LAYER + DCG M7 catalog-wide: `metric_definitions` 252 is mastered by BOTH METRICS-LAYER and DCG. Rule #11 / M7 hard fail; resolution belongs to METRICS-LAYER and DCG.
- DATA-AI-PLAT B10b owes `source_domain_module_id` on inbound 151.
- DCG B10b owes `source_domain_module_id` on inbound 711.
- SUB-MGMT / DLP / FINOPS / DCG B10b owe `target_domain_module_id` on outbound rows from BI (687, 690, 691, 688, 1341).
- ITSM 689 already has `target_domain_module_id=38`; only the BI-side gap remains (covered by B1-S7).
- Missing consumer DMDOs (B1-N3): ITSM-INCIDENT-MGMT on `bi_reports`; SUB-MGMT on `bi_subscriptions`; DCG on `bi_reports` and `bi_dashboards`; DLP on `bi_dashboards`; FINOPS on `bi_queries`. Each 1-row insert on the respective target domain's audit.

### Per-bucket prompts

- Bucket 1: fix these now? Suggested sequence: confirm B2-S1 first (gates B1-S1), then B1-S4 (intra-domain B6 edges) + B1-S8 (aliases) + B1-H1 (1341 PCF lookup) in parallel as they do not depend on modules. B1-S6 needs target-master identification at fix time. B1-S7 / B1-S9 / B1-N1 / B1-N2 block on B1-S1.
- Bucket 2: per-item decisions. For B2-S5, indicate whether the agent should draft wording for review or whether marketing will supply.
- Bucket 3: vet via formal Phase 0 research or eyeball-mode? Name confirmed candidates if eyeball.

### JWT errors

None encountered during this audit pass.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
