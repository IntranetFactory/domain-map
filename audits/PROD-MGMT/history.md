# PROD-MGMT audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 2 full modules (`PM-DISCOVERY` 130, `PM-ROADMAP-DELIVERY` 131), 0 starter modules, 0 cross-cutting hosted modules. 8 masters: `feature_requests` (406), `customer_feedback_items` (407) in DISCOVERY; `product_lines` (402), `product_features` (403), `product_releases` (404), `product_roadmaps` (405), `product_metrics` (408), `beta_programs` (409) in ROADMAP-DELIVERY. 6 consumer rows (5 in ROADMAP-DELIVERY, 1 in DISCOVERY) + 1 contributor (`value_streams` 249 in ROADMAP-DELIVERY). 13 capabilities (one cross-cutting: `GOAL-MGMT` 25 shared with WORK-MGMT, SEM, TALENT-MGMT). 9 solutions, all `coverage_level='primary'` (Productboard, Aha! Roadmaps, Jira Product Discovery, Pendo Roadmaps, Airfocus, ProductPlan, Roadmunk, Craft.io, Dragonboat). 25 PROD-MGMT-owned trigger_events. 20 outbound + 11 inbound cross-domain handoffs (31 cross-domain total). 0 intra-domain cross-module handoffs. 0 aliases on any of the 8 masters. 31 lifecycle states across 8 masters (7 masters declare states; `product_metrics` is config-shape per its `data_objects.notes`). 2 system skills (`pm_discovery_agent` 201, `pm_roadmap_delivery_agent` 202) + 21 `skill_tools` rows (6 on DISCOVERY skill, 15 on ROADMAP-DELIVERY skill). 0 PROD-MGMT roles / role_modules rows. 0 regulations attached.
- **Vendor-surface basis (Pass 2 flagship enumeration):** Productboard, Aha! Roadmaps, ProductPlan, Roadmunk, Craft.io, Airfocus, Pendo Feedback / Roadmaps, LaunchNotes, Canny, Atlassian Jira Product Discovery, Notion as PM tool, Linear (lightweight PM surface), ProdPad, Savio, Dragonboat. Compliance overlay: none material in the core PROD-MGMT surface (GDPR applies for customer-feedback PII handling, see B3 candidates).
- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 8 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| WORK-MGMT | 5 | 4 | 1 (WORK-MGMT-TASK-EXEC consumer on product_roadmaps, feature_requests, product_releases) | 1 (work_automations mirrors_to product_roadmaps) | 11 | Pairwise (full) |
| CSM | 5 | 0 | 0 | 4 (customer_cases → feedback / impacted_by features / impacted_by releases / tracked_by metrics / monitored_in beta_programs) | 9 | Pairwise (full) |
| CRM | 3 | 0 | 1 (CRM-ACCT-MGT consumer on feature_requests, product_features, product_lines) | 0 | 4 | Pairwise (full) |
| DXP | 3 | 1 | 0 | 0 | 4 | Pairwise (full) |
| CDP | 2 | 0 | 0 | 0 | 2 | Lightweight |
| BPA | 0 | 2 | 0 | 0 | 2 | Lightweight |
| SPM | 0 | 1 | 0 | 1 (SPM roadmap_items consumed by PROD-MGMT) | 2 | Lightweight |
| VSDP | 0 | 1 | 0 | 0 | 1 | Lightweight |
| TEST-MGMT | 0 | 1 | 0 | 1 (requirements_to_test_traceability feeds product_features) | 2 | Lightweight |
| ERP-FIN | 1 | 0 | 0 | 0 | 1 | Lightweight |

**Structural pass bands:** A (domain metadata) PASS, all seven Rule #8 fields populated (crud_percentage=85, business_logic populated, min_org_size, cost_band, certification_required=false, usa_market_size_usd_m=1200, source_year=2024). M1-M7 mostly PASS: every module has ≥1 master, ≥3 capabilities with 2 modules satisfies Rule #14 floor at the structural level (but see B2-S1 below). **B1 (lifecycle states) PASS** for 7 of 8 masters; `product_metrics` declares config-shape exemption via populated `notes` (Rule #15 violation, see B2-S2). **B4 pattern flags:** only `customer_feedback_items.has_personal_content=true`; no `has_submit_lock` on `product_releases` despite published-state semantics (judgment, see B2-S3). **B5 DMDO closure** PARTIAL: handoffs 1322 (work_items 243), 1323/1324 (okr_objectives 245) target PROD-MGMT module 131 but neither 243 nor 245 has a DMDO row in PROD-MGMT (see B1-S6). **B9 (trigger_events.event_category) hard-fail:** 22 of 25 PROD-MGMT-owned trigger_events carry empty `event_category` (Rule #13 enum violation across the board). **B9b (intra-domain cross-module handoffs) hard-fail:** zero intra-domain handoffs across the 2-module domain despite an obvious DISCOVERY → ROADMAP-DELIVERY pipeline (feature_request.accepted → product_feature draft, customer_feedback_item.linked → roadmap update). **B10b report-only:** 14 outbound handoffs carry NULL `target_domain_module_id` (target domains' work); 9 inbound handoffs carry NULL `source_domain_module_id` (source domains' work). **C1-C2 (capability-domain coherence) PARTIAL FAIL:** 6 PMM-flavored capabilities (`LAUNCH-PLANNING` 119, `GTM-LAUNCH-COORDINATION` 120, `MESSAGING-AND-POSITIONING` 121, `SALES-ENABLEMENT-CONTENT` 122, `COMPETITIVE-INTELLIGENCE` 123, `WIN-LOSS-INTERVIEWS` 124) are attached to PROD-MGMT but the PROD-MGMT modules host zero entities, skills, or solutions covering them, the entities belong to a Product Marketing Management market that does not yet exist as a domain (see B3 candidate-domain queue). **D1 (data_object_relationships) PASS** for the 7 rows on PROD-MGMT masters. **E (roles) hard-fail:** zero roles defined for PROD-MGMT, no `role_modules` rows on either module, so no permission bundles, no RBAC layer wired. **F2 (skills 1:1 with modules) PASS** (2 modules, 2 system skills). **F3 (skill_tools floor) PASS** (6 + 15 = 21 tools). **F4 (operation_kind ↔ data_object_id invariants) PASS** (all queries and mutates carry data_object_id, side_effects null). **F5 (Semantius score) approximately 95%** (20 of 21 skill_tools on `coverage_tier='platform'`, the lone external is `notify_team` on the ROADMAP-DELIVERY skill). **H1 (APQC tagging) hard-fail:** 0 of 31 cross-domain handoffs tagged, zero approved, zero agent_curated.

PROD-MGMT Semantius score (strict, PROD-MGMT proper): approximately **95%** (20 / 21 `skill_tools` rows on `coverage_tier='platform'`).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B9 hard-fail, missing event_category on 22 trigger_events** | All 22 PROD-MGMT-owned events carry empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`). Inventory by category: `lifecycle` (master-state lifecycle progression) covers 1138 `beta_program.launched`, 1145 `feature_request.shipped`, 1146 `product_feature.released`, 1147 `product_feature.deprecated`, 1149 `product_line.launched`, 1153 `product_release.planned`, 1154 `product_release.shipped`, 1156 `product_roadmap.published`. `state_change` (one-shot transitions) covers 1142 `customer_feedback_item.linked_to_feature`, 1155 `product_release.rolled_back`, 1157 `product_roadmap.item_promoted`, plus the proposed new events from B1-S2. `threshold` covers 1144 `feature_request.upvoted_threshold`, 1148 `product_feature.adoption_threshold_reached`, 1151 `product_metric.threshold_breached`. `signal` covers external derived events such as bottleneck identifications. Additional events not in PROD-MGMT-owned list but used by PROD-MGMT consumers (359, 866, 868, 870, 871, 882, 848) are other domains' fix (B10b report-only, see B1-S3 / B1-S4). | PATCH 22 `trigger_events` rows to set `event_category` per the inventory above. |
| B1-S2 | **B9b hard-fail, zero intra-domain cross-module handoffs** | The DISCOVERY (130) → ROADMAP-DELIVERY (131) pipeline is the single most important workflow in PROD-MGMT (feedback / requests get triaged in DISCOVERY, accepted ones flow into the roadmap and become product_features in ROADMAP-DELIVERY) and the catalog has zero intra-domain handoff rows wiring that pipeline. Expected minimum: (a) DISCOVERY → ROADMAP-DELIVERY on `feature_request.accepted` (state 4 of `feature_requests`, `requires_permission=true`) producing a `product_features` row; (b) DISCOVERY → ROADMAP-DELIVERY on `customer_feedback_item.linked` (state 3) updating the linked feature; (c) ROADMAP-DELIVERY → DISCOVERY on `product_feature.released` (1146) updating the originating `feature_request` (closing the loop). | Author 3 intra-domain handoff rows with `source_domain_id=target_domain_id=101`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`. Requires 1 new `trigger_events` row for `feature_request.accepted` (the accepted lifecycle state has no event row); the other two reuse existing events 1142 and 1146. |
| B1-S3 | **B5 partial-fail, missing DMDO closure for inbound payloads** | Three inbound handoffs reference data_objects that have no DMDO row in PROD-MGMT: 1322 `work_item.completed` (payload data_object 243 `work_items`, source WORK-MGMT-TASK-EXEC), 1323 `okr_objective.committed` (payload 245 `okr_objectives`, source WORK-MGMT-GOALS-OKR), 1324 `okr_objective.scored` (same). DMDO closure requires the receiving module to declare `consumer + optional` on the inbound payload's data_object. | INSERT 2 `domain_module_data_objects` rows on PM-ROADMAP-DELIVERY (131): (131, 243, consumer, optional), (131, 245, consumer, optional). Both are infrastructure-master-shaped (Rule #16), `optional` is correct. |
| B1-S4 | **E (RBAC) hard-fail, zero roles defined for PROD-MGMT** | Per the per-domain audit checklist E1-E6 every loaded domain must have at least one role, one role_module binding, and the three baseline permissions per module (`<module>:read`, `:manage`, `:admin`). Currently PROD-MGMT has zero roles and zero role_modules rows. Catalog standard PM role bundle: `PRODUCT-MANAGER` (admin on PM-DISCOVERY, manage on PM-ROADMAP-DELIVERY), `HEAD-OF-PRODUCT` (admin on both), `PRODUCT-OPS-ANALYST` (manage on PM-DISCOVERY, read on PM-ROADMAP-DELIVERY), `ENGINEERING-LEAD` (read on PM-DISCOVERY, manage on PM-ROADMAP-DELIVERY for release windows). Workflow-gate permissions derived from the 19 lifecycle states with `requires_permission=true` (per Rule #14's permission materialization scope) span `accept_feature_request`, `reject_feature_request`, `release_product_feature`, `deprecate_product_feature`, `ship_product_release`, `rollback_product_release`, `cancel_product_release`, `publish_product_roadmap`, `launch_product_line`, `sunset_product_line`, `retire_product_line`, `activate_beta_program`, `close_beta_program`, `cancel_beta_program`. | Phase-E load: 4 roles, 6 role_modules, 6 baseline permissions, 14 workflow-gate permissions, permission_hierarchy edges. Loader pattern from prior CLM Phase-E work. |
| B1-S5 | **Report-only (outbound NULLs owed by other domains, B10b asymmetry)** | 14 outbound PROD-MGMT handoffs carry NULL `target_domain_module_id`: 996 (CSM, beta_program.launched), 997 (CDP, beta_program.launched), 998 (CSM, customer_feedback_item.linked_to_feature), 1001 (DXP, product_feature.released), 1003 (CSM, product_feature.deprecated), 1004 (CDP, product_feature.adoption_threshold_reached), 1006 (ERP-FIN, product_line.launched), 1007 (CSM, product_metric.threshold_breached), 1009 (DXP, product_release.shipped), 1010 (CSM, product_release.rolled_back), 1011 (DXP, product_roadmap.published). 1000 (CRM), 1002 (CRM), 1005 (CRM) and the WORK-MGMT outbounds are populated. CLM's own side (`source_domain_module_id`) is populated on every outbound row. | Schedule b1 audits for CSM, CDP, DXP, ERP-FIN to derive their `target_domain_module_id` per the standard B10b backfill procedure. |
| B1-S6 | **Report-only (inbound NULLs owed by source domains, B10b asymmetry)** | 9 inbound PROD-MGMT handoffs carry NULL `source_domain_module_id`: 813 (DXP, ab_test.completed), 184 (BPA, value_stream.bottleneck_identified), 243 (SPM, roadmap_item.released), 775 (VSDP, pull_request.merged), 784 (BPA, process_simulation_run.bottleneck_identified), 781 (TEST-MGMT, requirements_to_test_traceability.linked). WORK-MGMT inbounds (791, 1253, 1322, 1323, 1324) are populated. PROD-MGMT's `target_domain_module_id` is populated on every inbound. | Schedule b1 audits for DXP, BPA, SPM, VSDP, TEST-MGMT to populate their `source_domain_module_id` on the listed handoffs. |
| B1-S7 | **Pairwise, missing consumer DMDOs on downstream domains** | Several PROD-MGMT-targeted handoffs imply consumer DMDOs on the target side that do not exist: CSM consumes `beta_programs` (996), `customer_feedback_items` (998), `product_features` (1003), `product_metrics` (1007), `product_releases` (1010) but no CSM module declares the dependencies; CDP consumes `beta_programs` (997), `product_features` (1004); DXP consumes `product_features` (1001), `product_releases` (1009), `product_roadmaps` (1011); ERP-FIN consumes `product_lines` (1006); CRM consumes `feature_requests` (1000), `product_features` (1002), `product_lines` (1005), already declared on CRM-ACCT-MGT (46), only the explicit `consumer + optional` rows for the three feature-request / feature / line objects are present, but `feature_requests` is OK. Surface the gaps for the receiving-side audits. | Each target domain's b1 audit adds the relevant `consumer` DMDO rows. Not PROD-MGMT's fix. |

#### APQC TAGGING (Bucket 1, H1 hard-fail closure)

0 of 31 cross-domain handoffs carry `handoff_processes` rows. **0 `discovery_substring`, 0 `agent_curated`, 0 `record_status='approved'`.** Volume expectation per SKILL H1: 0.5N to 0.8N for N=31, that is 16 to 25 `agent_curated` tags. The audit proposes the following candidates from the analyst's structural-pass model:

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id (lookup needed) | Confidence |
|---|---|---|---|---|---|---|
| 996 | PM-ROADMAP-DELIVERY → CSM | `beta_program.launched` | `beta_programs` | Develop products and services (10062) child, "Pilot production and evaluate feasibility of production process" (19992) | needs lookup at fix time | confident L4 |
| 997 | PM-ROADMAP-DELIVERY → CDP | `beta_program.launched` | `beta_programs` | Manage customer information / Customer insights | needs PCF lookup | medium |
| 998 | PM-DISCOVERY → CSM | `customer_feedback_item.linked_to_feature` | `customer_feedback_items` | Provide customer feedback to product management on customer service experience (18126 L4) | 956 | confident L4 |
| 999 | PM-DISCOVERY → WORK-MGMT-TASK-EXEC | `feature_request.upvoted_threshold` | `feature_requests` | Prioritize and manage incoming feedback (20953 L4) | 530 | confident L4 |
| 1000 | PM-DISCOVERY → CRM-ACCT-MGT | `feature_request.shipped` | `feature_requests` | Provide feedback and insights to appropriate teams (11241 L4) | 964 | confident L4 |
| 1001 | PM-ROADMAP-DELIVERY → DXP | `product_feature.released` | `product_features` | Manage releases (Develop products and services 10062 L2 child) | needs lookup | medium |
| 1002 | PM-ROADMAP-DELIVERY → CRM-ACCT-MGT | `product_feature.released` | `product_features` | Develop and manage sales partner / channel relationships (10401 child) | needs lookup | medium |
| 1003 | PM-ROADMAP-DELIVERY → CSM | `product_feature.deprecated` | `product_features` | Manage customer service requests | needs lookup | medium |
| 1004 | PM-ROADMAP-DELIVERY → CDP | `product_feature.adoption_threshold_reached` | `product_features` | Develop customer insights | needs lookup | medium |
| 1005 | PM-ROADMAP-DELIVERY → CRM-ACCT-MGT | `product_line.launched` | `product_lines` | Develop and manage sales account relationships | needs lookup | medium |
| 1006 | PM-ROADMAP-DELIVERY → ERP-FIN | `product_line.launched` | `product_lines` | Manage chart of accounts / Maintain item master (Process AR / Manage product master) | needs lookup | medium |
| 1007 | PM-ROADMAP-DELIVERY → CSM | `product_metric.threshold_breached` | `product_metrics` | Manage customer service problems, requests, and inquiries | needs lookup | medium |
| 1008 | PM-ROADMAP-DELIVERY → WORK-MGMT | `product_release.planned` | `product_releases` | Develop products and services / Plan delivery | needs lookup | confident L3 |
| 1009 | PM-ROADMAP-DELIVERY → DXP | `product_release.shipped` | `product_releases` | Implement software change/release (20853 L4) | 1262 | confident L4 |
| 1010 | PM-ROADMAP-DELIVERY → CSM | `product_release.rolled_back` | `product_releases` | Verify change/release implementation success (20856) | 1265 | confident L4 |
| 1011 | PM-ROADMAP-DELIVERY → DXP | `product_roadmap.published` | `product_roadmaps` | Develop and manage execution roadmap (20005 L4) | 625 | confident L4 |
| 1012 | PM-ROADMAP-DELIVERY → WORK-MGMT | `product_roadmap.item_promoted` | `product_roadmaps` | Prioritize and manage incoming feedback / Develop product portfolio | 530 | medium |
| 1250 | PM-ROADMAP-DELIVERY → WORK-MGMT-TASK-EXEC | `product_release.shipped` | `product_releases` | Implement software change/release (20853) | 1262 | confident L4 |
| 1251 | PM-ROADMAP-DELIVERY → WORK-MGMT-TASK-EXEC | `product_release.rolled_back` | `product_releases` | Verify change/release implementation success (20856) | 1265 | confident L4 |
| 1252 | PM-ROADMAP-DELIVERY → WORK-MGMT-TASK-EXEC | `product_roadmap.published` | `product_roadmaps` | Develop and manage execution roadmap (20005) | 625 | confident L4 |
| 184 | BPA → PM-ROADMAP-DELIVERY | `value_stream.bottleneck_identified` | `value_streams` | Manage business process performance (Develop and manage business resilience) | needs lookup | medium |
| 243 | SPM → PM-ROADMAP-DELIVERY | `roadmap_item.released` | `roadmap_items` | Develop and manage execution roadmap (20005) | 625 | confident L4 |
| 775 | VSDP → PM-ROADMAP-DELIVERY | `pull_request.merged` | `pull_requests` | Implement software change/release (20853) | 1262 | confident L4 |
| 781 | TEST-MGMT → PM-ROADMAP-DELIVERY | `requirements_to_test_traceability.linked` | `requirements_to_test_traceability` | Develop product/service design specifications (10085) | 571 | confident L4 |
| 784 | BPA → PM-ROADMAP-DELIVERY | `process_simulation_run.bottleneck_identified` | `process_simulation_runs` | Analyze business process performance | needs lookup | medium |
| 791 | WORK-MGMT-TASK-EXEC → PM-ROADMAP-DELIVERY | `work_automation.triggered` | `work_automations` | Manage IT operations / Workflow automation | needs lookup | medium |
| 813 | DXP → PM-DISCOVERY | `ab_test.completed` | `ab_tests` | Generate new product/service concepts / Confirm alignment with strategy | needs lookup | medium |
| 1253 | WORK-MGMT-TASK-EXEC → PM-ROADMAP-DELIVERY | `work_automation.disabled` | `work_automations` | Manage IT operations / Workflow automation | needs lookup | medium |
| 1322 | WORK-MGMT-TASK-EXEC → PM-ROADMAP-DELIVERY | `work_item.completed` | `work_items` | Develop and manage execution roadmap (20005) | 625 | medium |
| 1323 | WORK-MGMT-GOALS-OKR → PM-ROADMAP-DELIVERY | `okr_objective.committed` | `okr_objectives` | Develop business strategy / Establish strategic direction | needs lookup | medium |
| 1324 | WORK-MGMT-GOALS-OKR → PM-ROADMAP-DELIVERY | `okr_objective.scored` | `okr_objectives` | Measure and report business performance (17052) | needs lookup | medium |

31 candidate APQC tags, all proposed as `proposal_source='agent_curated'`, `record_status='new'` (one tagging item per Rule #10's counting convention; the 31 candidates roll up under B1-H1). The PCF id column requires `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` lookups at fix time for the rows marked "needs lookup"; the structural pass produced the proposed-row names and confidence ratings.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (B9 events + B9b + B5 closure) | 3 |
| STRUCTURAL (E hard-fail RBAC bootstrap) | 1 |
| BOUNDARY / Pairwise per-neighbor in-scope | 0 |
| APQC TAGGING (B1-H1, single item per Rule #10) | 1 |
| Report-only (B10b outbound + inbound + Pairwise) | 3 |
| **Bucket 1 total** | 8 in-scope items |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

For the heavy neighbors (edge weight ≥3) the 5-section pairwise diff produced the following per-neighbor findings.

**WORK-MGMT ↔ PROD-MGMT (weight 11).** Wired pairs: 9 (5 outbound to WORK-MGMT-TASK-EXEC, 4 inbound from WORK-MGMT). Section 2: all 9 fully populated on both module FKs. Section 3: a likely missing handoff is PM-ROADMAP-DELIVERY → WORK-MGMT on `product_feature.in_delivery` (the feature-state transition where engineering scheduling actually kicks off), and a possible PM-DISCOVERY → WORK-MGMT on `feature_request.accepted` if WORK-MGMT picks up new work from feature acceptance. Section 4: clean. Section 5: cross-relationship `work_automations mirrors_to product_roadmaps` (752) exists; reverse mirror is not loaded but the verb is one-directional so this is fine. **B1 candidate B1-S3 closure depends on adding the work_items and okr_objectives consumer DMDOs.**

**CSM ↔ PROD-MGMT (weight 9).** Wired pairs: 5 outbound (CSM is heavy consumer of customer-facing PM events). Section 2: ALL 5 outbounds carry NULL `target_domain_module_id` (CSM's B10b). Section 3: missing inbound from CSM to PROD-MGMT on `customer_case.themes_aggregated` if CSM aggregates case themes and routes to PM-DISCOVERY as feedback; this is a high-value handoff that would close the discovery loop. Section 4: PROD-MGMT side populated; CSM side empty. Section 5: cross-relationships exist (`customer_cases feedback_routed_from customer_feedback_items` 481, `customer_cases impacted_by product_features` 482, etc.). Healthy substrate.

**CRM ↔ PROD-MGMT (weight 4).** Wired pairs: 3 outbound to CRM-ACCT-MGT (46), all `target_domain_module_id` populated. Section 2: clean. Section 3: missing handoffs CRM → PROD-MGMT, none surfaces from the structural pass; CRM-typical events like `crm_opportunity.feature_requested` would be valuable but the data_object is not loaded. Section 4: CRM-ACCT-MGT (46) declares `consumer + optional` for `product_lines`, `product_features`, `feature_requests`, matches the outbound payloads. Clean. Section 5: zero cross-relationships, which is consistent with CRM only consuming reference data.

**DXP ↔ PROD-MGMT (weight 4).** Wired pairs: 3 outbound + 1 inbound. Section 2: ALL 3 outbounds carry NULL `target_domain_module_id` (DXP's B10b); inbound 813 carries NULL `source_domain_module_id` (DXP's B10b). Section 3: clean structurally. Section 4: DXP-side DMDO presence unknown from PROD-MGMT vantage; likely missing. Section 5: no cross-relationships, expected for a release-publishing relationship.

**Lighter neighbors (1-2 weight, one-line summaries):**

- **CDP ↔ PROD-MGMT (weight 2).** 2 outbounds (996 beta launch, 1004 adoption threshold), both NULL `target_domain_module_id` (CDP's B10b). No cross-relationships.
- **BPA ↔ PROD-MGMT (weight 2).** 2 inbounds (184, 784) both NULL `source_domain_module_id` (BPA's B10b). No cross-relationships, value_streams DMDO exists in PROD-MGMT as contributor.
- **SPM ↔ PROD-MGMT (weight 2).** 1 inbound (243 roadmap_item.released) NULL source. `roadmap_items` (275) is consumed by PROD-MGMT but there is no apparent master in any module, see B2-S4.
- **VSDP ↔ PROD-MGMT (weight 1).** Inbound 775 (pull_request.merged) NULL source. PR data feeds the release pipeline.
- **TEST-MGMT ↔ PROD-MGMT (weight 2).** Inbound 781 (requirements_to_test_traceability.linked) NULL source. Cross-relationship `requirements_to_test_traceability feeds product_features` (406) exists.
- **ERP-FIN ↔ PROD-MGMT (weight 1).** 1 outbound (1006 product_line.launched) NULL target. Reasonable, ERP needs to set up item master / product master.

**In-scope mechanical fixes derived from pairwise (Bucket 1):** none. The pairwise pass surfaced report-only NULL-FK work owed by 6 neighbor domains (B1-S5 + B1-S6) and 5 receiving-side DMDO gaps (B1-S7), all routed to those domains' audits.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | PATCH 22 PROD-MGMT-owned trigger_events to set `event_category` |
| B1-S2 | Author 3 intra-domain DISCOVERY ↔ ROADMAP-DELIVERY handoffs + 1 new `feature_request.accepted` trigger_event |
| B1-S3 | INSERT 2 consumer DMDO rows on PM-ROADMAP-DELIVERY (work_items 243, okr_objectives 245) |
| B1-S4 | Phase-E bootstrap: 4 PROD-MGMT roles + 6 role_modules + 6 baseline permissions + 14 workflow-gate permissions + permission_hierarchy edges |
| B1-S5 | Report-only, 14 outbound NULL target_module_id, schedule audits on CSM / CDP / DXP / ERP-FIN |
| B1-S6 | Report-only, 9 inbound NULL source_module_id, schedule audits on DXP / BPA / SPM / VSDP / TEST-MGMT |
| B1-S7 | Report-only, 4 downstream domains need consumer DMDOs on PROD-MGMT masters, schedule those audits |
| B1-H1 | APQC TAGGING, propose 31 `agent_curated` rows on cross-domain handoffs |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **C1-C2 capability scope: do the 6 PMM-flavored capabilities belong on PROD-MGMT?** Capabilities `LAUNCH-PLANNING` (119), `GTM-LAUNCH-COORDINATION` (120), `MESSAGING-AND-POSITIONING` (121), `SALES-ENABLEMENT-CONTENT` (122), `COMPETITIVE-INTELLIGENCE` (123), `WIN-LOSS-INTERVIEWS` (124) are attached to PROD-MGMT (`capability_domains` rows). None of these have masters, skills, or solutions in PROD-MGMT's modules, the flagship vendors (Productboard, Aha!, Jira PD) do not cover this surface; instead Product Marketing Management (PMM) is a distinct market (Highspot, Showpad, Seismic, Klue for CI, Crayon for CI, Aha! Create, Productboard's "Insights" overlay). Per Rule #2 (point-solution market test) PMM passes: Klue, Crayon, Highspot, Showpad, Seismic, Aha! Roadmaps Create, Pendo Adopt are all independent vendors. Recommendation: split PMM into a new domain, move all 6 capability_domains rows to that new domain. See B3 candidate `PMM`. | Capability ownership is editorial / market-boundary judgment, the agent can propose but cannot move. | (a) Approve PMM as a new domain candidate (queue to `_missing-domains.md`, move all 6 capability_domains rows on PMM promotion). (b) Leave the 6 capabilities on PROD-MGMT as the "future PMM surface", load Phase B masters within PROD-MGMT under a new module `PM-MARKETING`. (c) Move some capabilities to existing GTM-PLAN (104) and others to a new PMM, specify per capability. |
| B2-S2 | **Rule #15 notes-pollution on `product_metrics` (408).** `notes` is populated with: "Config-shaped; no workflow. Time-series measurement records (adoption, usage, quality, business KPIs) linked to features and releases. Status is derivable from threshold breaches via computed_fields; no per-state permissions needed." Per Rule #15 the prior Rule #12 license for config-shape exemption in `data_objects.notes` is RESCINDED. Was this user-approved at load time, or auto-populated? | Cannot tell from audit alone; load-time approval status unknown. | (a) Confirm user-approved at load time, leave in place. (b) Confirm auto-populated, PATCH `notes` to empty string and log the Rule #15 incident per the audit obligation in `references/skill-changelog.md`. |
| B2-S3 | **B4 pattern-flag positive re-evaluation per Rule #12.** Current flags: only `customer_feedback_items.has_personal_content=true`. Audit proposes: (a) `feature_requests.has_personal_content` could be `true` since requests often carry submitter contact info and verbatim quotes; (b) `product_releases.has_submit_lock` should likely be `true` since a release transitions to `shipped` (state 3, `requires_permission=true`) and after shipping no further mutations should silently occur; (c) `product_roadmaps.has_submit_lock` likely `true` once `published` (state 2, `requires_permission=true`) since published roadmaps are external-facing commitments; (d) `product_lines.has_submit_lock` likely `false` (long-lived strategic asset). | Pattern flags are workflow-shape judgments, the user owns the call. | Per-flag yes/no, capture in Decisions. |
| B2-S4 | **`roadmap_items` (275) is consumed by PM-ROADMAP-DELIVERY but has no master in any module.** Description says "Drives PROD-MGMT consumption" but the entity is a phantom: zero master DMDO row catalog-wide. SPM trigger_event 218 (`roadmap_item.released`) emits payloads typed against this orphan. Two paths: (a) Promote `roadmap_items` to `master` somewhere (it logically belongs in SPM's portfolio-roadmap layer; SPM is the source-domain on handoff 243); SPM owns this fix, route to SPM b1 audit. (b) DELETE the consumer DMDO row (131, 275, consumer) and recast handoff 243's payload to `product_roadmaps` (405). | Two competing models: SPM owns a portfolio-level roadmap_items master that PROD-MGMT consumes (the cleaner model, both domains have their own roadmap layer), or `roadmap_items` is a redundant alias for `product_roadmaps`. | (a) Schedule SPM audit and let them master `roadmap_items`. (b) DELETE the orphan consumer, recast handoff 243 payload to `product_roadmaps`. |
| B2-S5 | **F5 Semantius score gap: `notify_team` is `external`.** `notify_team` (ROADMAP-DELIVERY skill 202) has `coverage_tier='external'`, the only non-platform tool on PROD-MGMT. Should it be promoted to platform (a generic platform notification primitive) or migrated to `integration` (typed Slack / email connector)? Compare with CLM's `notify_person` which is platform. Likely a load-time inconsistency: both skills (201 and 202) should use the same primitive, `notify_person` is platform on skill 201, the divergence on skill 202 looks unintentional. | F5 decision: which canonical name and tier. | (a) Replace `notify_team` (external) with `notify_person` (platform) on skill 202, drop the divergent tool. (b) Promote `notify_team` to platform. (c) Leave as-is and accept the 95% Semantius score. |
| B2-S6 | **D1/Rule #10 platform-builtin edge audit.** All 8 PROD-MGMT masters reference `users` for ownership / assignment / submitter, but zero `data_object_relationships` rows reference data_object 748 (the platform `users` row). Per Rule #10 each domain-owned master with an FK to a built-in must record the relationship on `data_object_relationships`. Default propose: 8 new rows (one per master), `relationship_kind='reference'`, `relationship_verb='owned_by'` / `assigned_to` / `submitted_by` (per master semantics), `record_status='new'`. Surface for user to confirm the verb per row before authoring. | Rule #10 mandates the edge; the specific verb per master is editorial. | (a) Approve the standard set of 8 edges with default verbs (`product_lines.owned_by`, `product_features.assigned_to`, `product_releases.owned_by`, `product_roadmaps.owned_by`, `feature_requests.submitted_by`, `customer_feedback_items.submitted_by`, `product_metrics.recorded_by`, `beta_programs.owned_by`). (b) Specify per-row verb overrides. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran semantic enumeration against Productboard, Aha! Roadmaps, ProductPlan, Roadmunk, Craft.io, Airfocus, Pendo Feedback / Roadmaps, LaunchNotes, Canny, Jira Product Discovery, Linear (lightweight), ProdPad, Savio, Dragonboat. The subagent recipe was not spawned (single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING (8) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `product_opportunities` | Productboard "Opportunities" tab, Aha! "Opportunities" object, Jira PD "Ideas + insights"; opportunity-solution-tree pattern (Teresa Torres) is a first-class object distinct from `feature_requests` (an opportunity is a customer problem framing; feature requests are proposed solutions). Currently the catalog conflates them inside `feature_requests`. | PM-DISCOVERY (master) |
| `product_themes` / `strategic_initiatives` | Aha! "Initiatives", Productboard "Themes", Roadmunk "Themes", Dragonboat "Strategic objectives"; multi-quarter strategic groupings above features and below product strategy. Distinct from OKRs (which are measurable). Currently no theme entity, the concept lives implicitly in `product_lines`. | PM-ROADMAP-DELIVERY (master) or new PM-STRATEGY module |
| `prioritization_scores` | Productboard "Scores", Aha! "Custom score columns", Airfocus "Scoring framework", Dragonboat "Strategy alignment score"; RICE / WSJF / value-vs-effort scores as structured records per feature with framework provenance. Currently no scoring entity, the value lives inside `feature_requests.notes` if at all. | PM-DISCOVERY (master) |
| `release_notes` / `changelog_entries` | LaunchNotes (entire product), Productboard "Portal" changelog, Aha! "Notebooks", Jira PD "Insights publish", Canny "Changelog"; external-facing release notes as managed entities (drafts, approvals, customer-segment targeting, embed surface). Currently no entity, despite being a primary deliverable. | PM-ROADMAP-DELIVERY (master) or a new PM-COMMS module |
| `feature_flag_records` | Statsig, LaunchDarkly, Flagsmith, Optimizely; feature-flag entities for gradual rollout, A/B test cohort assignment, kill-switch operations. Adjacent to `product_releases` but distinct lifecycle. Productboard / Aha! integrate with these vendors. Possibly belongs in a separate `FEATURE-FLAGGING` domain. | new domain candidate (see below) |
| `user_research_sessions` | Productboard "Research", Dovetail, UserTesting, Maze; structured interview / usability-session records with transcripts and tags. Currently no entity, customer_feedback_items conflates session output with one-off feedback. | PM-DISCOVERY (master) |
| `release_milestones` | Aha! "Release Phases", Productboard "Release Plan", Roadmunk "Milestones"; date-driven checkpoints inside a release (code-complete, RC1, GA). Currently `product_releases` carries a single state machine, no milestone granularity. | PM-ROADMAP-DELIVERY (master) |
| `competitor_intelligence_records` | Klue, Crayon, Kompyte, Aha! "Competitor field"; structured competitor / product-comparison records. Likely belongs in a new PMM domain rather than PROD-MGMT (see B2-S1). | candidate PMM domain |

#### MODULARIZATION (2) candidates

- **Promote PM-STRATEGY as a third module.** If `product_themes`, `prioritization_scores`, and a future OKR-linkage entity get loaded, a third module (`PM-STRATEGY`) makes more sense than overloading PM-ROADMAP-DELIVERY. Would push PROD-MGMT from 2 modules to 3, consistent with the 13-capability count (after PMM split).
- **Promote PM-COMMS / PM-RELEASE-NOTES as a fourth module.** `release_notes`, `changelog_entries`, `release_milestones` form a coherent comms-and-rollout surface adjacent to but separable from delivery scheduling. LaunchNotes / Canny carve this out as their entire product.

#### Candidate-domain queue

This audit surfaces **2 candidate domains** for `audits/_missing-domains.md`:

1. **PMM (Product Marketing Management)** - Klue, Crayon, Highspot, Showpad, Seismic, Aha! Roadmaps Create, Pendo Adopt, Productboard's "Insights" overlay, Reprise. Adjacency: PROD-MGMT, CRM, GTM-PLAN, REV-INTEL. Capabilities: launch planning, GTM coordination, messaging / positioning, sales enablement content, competitive intelligence, win/loss interviews, product launch readiness checklist, persona management. This passes the point-solution market test: independent vendors compete in this category. Will queue via append_missing_domain.ts.

2. **FEATURE-FLAGGING / EXPERIMENTATION** - LaunchDarkly, Statsig, Optimizely Web Experimentation, Flagsmith, Split.io, Eppo, GrowthBook, Amplitude Experiment, ConfigCat. Adjacency: PROD-MGMT, DXP, VSDP, SPM. Capabilities: feature-flag management, experimentation orchestration, A/B test cohort assignment, kill-switch operations, gradual rollout. Passes the point-solution market test. Will queue via append_missing_domain.ts.

#### Compliance / regulation candidates

- **GDPR / CPRA** applicability for `customer_feedback_items` (carries personal content per the existing flag, but the GDPR linkage is not recorded in `domain_regulations`).
- **Section 508 / ADA / EAA** for product accessibility checkpoints, may apply to roadmap planning rather than as core PM domain regulation.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/PROD-MGMT-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 8 entity candidates + 2 modularization candidates + 2 domain candidates + 2 regulation candidates to treat as confirmed).

### Cross-bucket dependencies

- **B2-S1 (PMM split) gates B3 item 8 (`competitor_intelligence_records`).** If PMM gets promoted as a new domain, the competitor entity lands there rather than in PROD-MGMT. Recommend resolving B2-S1 before deciding B3 item 8.
- **B2-S4 (`roadmap_items` orphan) gates SPM audit kickoff.** If user picks option (a), schedule SPM b1 audit so SPM can master the entity. If option (b), the PROD-MGMT-side fix is a DELETE + handoff recast.
- **B1-S4 (Phase-E RBAC bootstrap) is independent** of all other items; recommended to load early so role_modules can be reused by future module additions (PM-STRATEGY, PM-COMMS).
- **B1-S2 (intra-domain handoffs) depends on creating the new `feature_request.accepted` trigger_event** (state 4 has no event row), 1 INSERT + 3 handoff INSERTs.
- **B3 candidate-domain queuing (PMM, FEATURE-FLAGGING) is independent.** Queueing just creates entries in `_missing-domains.md`; the actual promotion / load is downstream.
- **Buckets 1 and 2 are otherwise independent of Bucket 3.**

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S3, H1`), or `skip`.

- **S1 (B9 PATCH 22 events)** is mechanical, low-risk.
- **S2 (B9b 3 new intra-domain handoffs + 1 new trigger_event)** is mechanical, depends on the new event row.
- **S3 (2 new consumer DMDOs for work_items / okr_objectives)** is trivial.
- **S4 (Phase-E RBAC bootstrap)** is bigger: 4 roles + 6 role_modules + 20 permissions + permission_hierarchy edges. Loadable now or split into a follow-up.
- **S5 / S6 (B10b report-only)** schedules other-domain audits.
- **S7 (Pairwise consumer DMDOs report-only)** schedules other-domain audits.
- **H1 (31 APQC tags)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** I will wait for per-item decisions before acting.

- **B2-S1 (6 PMM-flavored capabilities):** (a) promote PMM, (b) leave on PROD-MGMT, (c) split between PMM and GTM-PLAN.
- **B2-S2 (Rule #15 product_metrics notes):** revert if auto-populated; confirm if approved.
- **B2-S3 (pattern-flag re-evaluation):** per-flag yes/no.
- **B2-S4 (roadmap_items orphan):** (a) SPM masters, (b) DELETE + recast.
- **B2-S5 (notify_team external):** (a) replace with notify_person platform, (b) promote to platform, (c) leave.
- **B2-S6 (Rule #10 users edges):** (a) approve default 8 edges, (b) specify per-row verbs.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 8 entity candidates + 2 modularization candidates + 2 domain candidates + 2 regulation candidates to treat as confirmed. Also confirm whether to queue PMM and FEATURE-FLAGGING to `_missing-domains.md` now (recommended regardless).

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| CSM | B10b: populate `target_domain_module_id` on inbound handoffs 996, 998, 1003, 1007, 1010 (5 NULL targets). Add `consumer + optional` DMDOs on `beta_programs`, `customer_feedback_items`, `product_features`, `product_metrics`, `product_releases` in whichever CSM modules subscribe. Section 3 candidate: missing CSM → PROD-MGMT handoff on `customer_case.themes_aggregated` to close the discovery loop. |
| CDP | B10b: populate `target_domain_module_id` on 997, 1004. Add `consumer + optional` DMDOs on `beta_programs`, `product_features`. |
| DXP | B10b: populate `target_domain_module_id` on outbound 1001, 1009, 1011 and `source_domain_module_id` on inbound 813. Add `consumer + optional` DMDOs on `product_features`, `product_releases`, `product_roadmaps`; verify `ab_tests` master is owned by DXP. |
| ERP-FIN | B10b: populate `target_domain_module_id` on 1006. Add `consumer + optional` DMDO on `product_lines` in whichever ERP-FIN module manages item master / product master. |
| CRM | Confirm whether the 3 PROD-MGMT-source outbounds (1000, 1002, 1005) should also have a parallel CRM → PROD-MGMT inbound (e.g., `crm_opportunity.feature_requested`). |
| BPA | B10b: populate `source_domain_module_id` on 184, 784 (`value_stream.bottleneck_identified`, `process_simulation_run.bottleneck_identified`). |
| SPM | B10b: populate `source_domain_module_id` on 243 (`roadmap_item.released`). Resolve `roadmap_items` (275) orphan per B2-S4 option (a): master in SPM's portfolio-roadmap module. |
| VSDP | B10b: populate `source_domain_module_id` on 775 (`pull_request.merged`). |
| TEST-MGMT | B10b: populate `source_domain_module_id` on 781 (`requirements_to_test_traceability.linked`). |
| WORK-MGMT | Confirm whether outbound `feature_request.upvoted_threshold` and inbound `work_automation.triggered` have matching DMDO declarations on the WORK-MGMT side; the audit found 5 PROD-MGMT-to-WORK-MGMT-TASK-EXEC and 4 inbounds already wired with populated FKs. |
| (new) PMM | If promoted: receive 6 capability_domains rows (B2-S1) and `competitor_intelligence_records` from B3 item 8. |
| (new) FEATURE-FLAGGING | If promoted: receive `feature_flag_records` from B3 item 5. |

### Decisions

_(none yet, awaiting user feedback per buckets above)_

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-mechanical subset of Bucket 1 per the orchestrator's technical-fix rules. Loader: `.tmp_deploy/fix_prod_mgmt_b1_technical_2026_05_31.ts`.

### Applied (3 of 8 B1 items, partial in two cases)

- **B1-S1 (partial):** PATCHed `trigger_events.event_category` on the 14 PROD-MGMT-owned events the audit pre-specifies a category for (8 `lifecycle`: 1138, 1145, 1146, 1147, 1149, 1153, 1154, 1156; 3 `state_change`: 1142, 1155, 1157; 3 `threshold`: 1144, 1148, 1151). The remaining 6 PROD-MGMT-owned events with empty `event_category` (1139 `beta_program.feedback_collected`, 1140 `beta_program.closed`, 1141 `customer_feedback_item.received`, 1143 `feature_request.submitted`, 1150 `product_line.retired`, 1152 `product_metric.refreshed`) were NOT covered by the audit's inventory and are left at empty until a follow-up audit pre-specifies their categories.
- **B1-S3:** INSERTed 2 consumer DMDO rows on PM-ROADMAP-DELIVERY (131): `(131, 243, consumer, optional)` for `work_items` and `(131, 245, consumer, optional)` for `okr_objectives`. Closes the B5 DMDO gap for inbound handoffs 1322, 1323, 1324.
- **B1-H1 (partial):** INSERTed 12 `handoff_processes` rows for the audit-pre-specified pairings whose PCF `process_id` was already resolved in the audit table: 998 -> 956, 999 -> 530, 1000 -> 964, 1009 -> 1262, 1010 -> 1265, 1011 -> 625, 1250 -> 1262, 1251 -> 1265, 1252 -> 625, 243 -> 625, 775 -> 1262, 1322 -> 625. All inserted as `role='implements'`, `proposal_source='agent_curated'`, `record_status` defaulted to `new` (Rule #1). Skipped handoff 781 (pre-specified PCF 571 contradicts an already-loaded row at 781 -> 413). The remaining 18 H1 candidates marked "needs PCF lookup" in the audit table were not pre-specified with a resolvable PCF id and are deferred.

### Deferred (5 of 8 B1 items, plus the 6 + 18 partial deferrals above)

- **B1-S2:** Authoring 3 intra-domain handoffs + 1 new `feature_request.accepted` trigger_event is new-entity creation; not in the technical scope.
- **B1-S4:** Full Phase-E RBAC bootstrap (4 roles + 6 role_modules + 20 permissions + permission_hierarchy edges) is a full Phase-E load; deferred to a Phase-E pass.
- **B1-S5, B1-S6, B1-S7:** Report-only items owed by CSM, CDP, DXP, ERP-FIN, BPA, SPM, VSDP, TEST-MGMT, CRM. Not PROD-MGMT's fix; routed to those domains' b1 audits.

### Bucket 2 / Bucket 3

Untouched. All judgment-bearing items remain open for user decision per the per-bucket prompts above.

## 2026-05-31, Audit

### Summary

Fresh Validate b1 structural pass against live state, scope A / M / B (B5, B7, B9, B9b, B10b, B11, B12) / C / D / E (E1-E5) / F (F1-F5) / H. Deltas vs the 2026-05-30 Validate run and 2026-05-31 technical-fix continuation are captured per band.

- Current footprint: 8 PROD-MGMT-mastered data_objects (402-409), 2 full modules (PM-DISCOVERY 130, PM-ROADMAP-DELIVERY 131), 0 starter modules, 0 cross-cutting hosted modules, 9 consumer DMDOs (7 on 131, 1 on 130, plus the 2 newly-added work_items 243 + okr_objectives 245 on 131 from the 2026-05-31 continuation), 1 contributor (value_streams 249 on 131), 9 solutions (all coverage_level='primary'), 13 capabilities (6 PMM-flavored carry-overs still attached, see Bucket 2), 20 PROD-MGMT-owned trigger_events, 20 outbound + 11 inbound cross-domain handoffs (31 cross-domain total), 0 intra-domain handoffs, 0 regulations, 2 system skills (201 pm_discovery_agent, 202 pm_roadmap_delivery_agent) + 21 skill_tools, 31 lifecycle states across 7 of 8 masters (product_metrics 408 still config-shape per its data_objects.notes pollution).
- Vendor-surface basis (carried forward from 2026-05-30 enumeration; no fresh subagent pass this audit): Productboard, Aha! Roadmaps, ProductPlan, Roadmunk, Craft.io, Airfocus, Pendo Feedback / Roadmaps, LaunchNotes, Canny, Jira Product Discovery, ProdPad, Savio, Dragonboat. Compliance overlay: GDPR / CPRA on customer_feedback PII handling, not yet attached.
- Bucket 1 (in-scope, agent fixable): 6 items.
- Bucket 2 (surface-for-user, judgment): 7 items.
- Bucket 3 (Phase 0 pending, speculative): 8 items (unchanged from 2026-05-30).

### Structural pass bands

- **A (domain metadata): PASS.** All seven Rule #8 fields populated (crud_percentage=85, business_logic populated, min_org_size='10 xs <50', cost_band='$$', certification_required=false, usa_market_size_usd_m=1200, market_size_source_year=2024). catalog_tagline / catalog_description empty (Rule #20 default).
- **M1-M7: PASS.** Every module has >=1 master; 13 capabilities with 2 full modules satisfies Rule #14 floor. (Note: 6 PMM-flavored capabilities attached but not realized by any module's surface, Bucket 2 item B2-31-1 carry-over.)
- **B5 (DMDO closure on handoff payloads): PASS (NEW since 2026-05-30).** work_items (243) and okr_objectives (245) consumer DMDOs now on PM-ROADMAP-DELIVERY (131) closing the inbound payload gap for handoffs 1322, 1323, 1324.
- **B7 (data_object_aliases): EMPTY.** Zero aliases on any of the 8 PROD-MGMT masters. Not a structural failure (aliases are optional), but vendor-terminology alignment (e.g. Aha!'s "initiatives", Productboard's "themes") is unrecorded. Report-only, not in Bucket 1.
- **B9 (trigger_events.event_category): PARTIAL FAIL.** 14 of 20 PROD-MGMT-owned events now carry event_category (post-continuation). 6 events still empty: 1139 beta_program.feedback_collected, 1140 beta_program.closed, 1141 customer_feedback_item.received, 1143 feature_request.submitted, 1150 product_line.retired, 1152 product_metric.refreshed.
- **B9b (intra-domain cross-module handoffs): HARD FAIL.** Still 0 intra-domain handoffs across the DISCOVERY (130) -> ROADMAP-DELIVERY (131) pipeline. Carries forward unchanged from 2026-05-30.
- **B10b (handoff FK asymmetry): REPORT-ONLY.** 14 outbound NULL target_domain_module_id (rows 996, 997, 998, 1001, 1003, 1004, 1006, 1007, 1009, 1010, 1011) + 9 inbound NULL source_domain_module_id (184, 243, 775, 781, 784, 813). PROD-MGMT's own FKs are populated on every handoff. Routed to neighbor audits (CSM, CDP, DXP, ERP-FIN, BPA, SPM, VSDP, TEST-MGMT).
- **B11 (data_object_relationships.owner_side / cardinality semantics): PASS.** 7 cross-relationships involving PROD-MGMT masters (406, 481-485, 752), all carry owner_side and verbs. No collisions on relationship_verb / inverse_verb.
- **B12 (built-in users edges per Rule #10): HARD FAIL.** Zero data_object_relationships rows reference both a PROD-MGMT master (402-409) and the users built-in (748). All 8 PROD-MGMT masters reference users (ownership / submitter / assignee semantics) but the platform-builtin edges are unrecorded. Bucket 2 B2-31-6 carry-over.
- **C1-C2 (capability-domain coherence): PARTIAL FAIL (carry-over).** 6 PMM-flavored capabilities (119-124) attached to PROD-MGMT but no PROD-MGMT module hosts entities / skills / solutions covering them. See B2-31-1.
- **D1 (data_object_relationships): PASS** for the 7 rows on PROD-MGMT masters.
- **E1 (>=1 role per domain): HARD FAIL.** Zero rows in roles linked to PROD-MGMT modules.
- **E2 (>=1 role_modules per module): HARD FAIL.** 0 role_modules rows on 130 / 131.
- **E3 (baseline triple per module): HARD FAIL.** Zero permissions on domain_module_id 130 or 131 (no baseline-read / baseline-manage / baseline-admin per module).
- **E4 (workflow-gate permissions from requires_permission lifecycle states): HARD FAIL.** Zero workflow-gate permissions despite 14 lifecycle states with requires_permission=true (product_lines active/sunset/retired, product_features released/deprecated, product_releases shipped/rolled_back/cancelled, product_roadmaps published, feature_requests accepted/rejected, beta_programs active/closed/cancelled).
- **E5 (permission_hierarchy edges): HARD FAIL.** Zero edges (impossible until E3 / E4 are loaded).
- **F1 (system skill exists per module): PASS.** Skills 201 + 202 are skill_type='system' with the right domain_module_id wiring.
- **F2 (1:1 skill <-> module): PASS.** Exactly one system skill per module.
- **F3 (>=1 skill_tools per system skill): PASS.** Skill 201 = 6 tools, skill 202 = 15 tools.
- **F4 (operation_kind / data_object_id invariants): PASS.** All 19 query+mutate tools carry data_object_id; both side_effects (notify_person 913, notify_team 914) carry NULL data_object_id. No fetch / inbound / compute tools.
- **F5 (Semantius score): 20 of 21 = ~95% platform.** Single external is notify_team (914) on skill 202 (carry-over from prior audit).
- **H1 (APQC tagging catalog quality - record_status='approved' count): HARD FAIL.** 0 of 31 cross-domain handoffs have an approved handoff_processes row.
- **H1 (APQC tagging process side-bar - proposal_source='agent_curated' count): 15 of 31 handoffs tagged (16 rows total; handoff 775 has 2 candidate PCF rows: 281 + 1262, both agent_curated/new).** Untagged remainder = 16 handoffs (996, 997, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1012, 791, 813, 1253, 1323, 1324).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix surface |
|---|---|---|---|
| B1-31-S1 | B9 partial-fail residual | 6 PROD-MGMT-owned events still carry empty event_category: 1139 beta_program.feedback_collected, 1140 beta_program.closed, 1141 customer_feedback_item.received, 1143 feature_request.submitted, 1150 product_line.retired, 1152 product_metric.refreshed. Proposed categories: 1139 signal (feedback collection is observational, no state transition on the program itself), 1140 lifecycle (program closes = terminal), 1141 lifecycle (feedback item created), 1143 lifecycle (request created), 1150 lifecycle (line retires = terminal), 1152 signal (metric refresh is data observation, not state transition). | PATCH 6 trigger_events rows. |
| B1-31-S2 | B9b hard-fail (carry-over) | Zero intra-domain DISCOVERY -> ROADMAP-DELIVERY handoffs. Expected minimum 3 (feature_request.accepted -> product_features draft; customer_feedback_item.linked -> roadmap update; product_feature.released -> originating feature_request close). Requires 1 new trigger_event row for feature_request.accepted (state 4 of 406 has no event row). | Author 1 trigger_event + 3 handoff rows with integration_pattern='lifecycle_progression', friction_level='low'. |
| B1-31-S3 | E hard-fail (RBAC bootstrap, carry-over) | Phase-E layer entirely missing: 0 roles, 0 role_modules, 0 baseline permissions, 0 workflow-gate permissions, 0 permission_hierarchy edges. Standard PROD-MGMT bundle proposed: 4 roles (PRODUCT-MANAGER, HEAD-OF-PRODUCT, PRODUCT-OPS-ANALYST, ENGINEERING-LEAD) + 6 role_modules + 6 baseline permissions (3 per module) + 14 workflow-gate permissions derived from the 14 requires_permission lifecycle states + permission_hierarchy edges. | Phase-E loader pass. |
| B1-31-H1 | APQC tagging residual | 16 of 31 cross-domain handoffs untagged. Proposed PCF mappings carry over from 2026-05-30 audit table for the "needs lookup" rows (996, 997, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1012, 791, 813, 1253, 1323, 1324). Also: 0 of the 16 already-tagged rows have record_status='approved'; quality-headline metric is still 0 / 31. | INSERT remaining 16 agent_curated handoff_processes rows + reviewer pass to approve the 16 already loaded. |

#### APQC TAGGING residual table (Bucket 1, B1-31-H1)

| handoff_id | source -> target | trigger_event | payload | Proposed PCF | PCF id | confidence |
|---|---|---|---|---|---|---|
| 996 | PM-ROADMAP-DELIVERY -> CSM | beta_program.launched | beta_programs | Pilot production and evaluate feasibility | needs lookup | medium |
| 997 | PM-ROADMAP-DELIVERY -> CDP | beta_program.launched | beta_programs | Develop customer insights | needs lookup | medium |
| 1001 | PM-ROADMAP-DELIVERY -> DXP | product_feature.released | product_features | Implement software change/release | 1262 | confident L4 |
| 1002 | PM-ROADMAP-DELIVERY -> CRM-ACCT-MGT | product_feature.released | product_features | Manage product master / channel | needs lookup | medium |
| 1003 | PM-ROADMAP-DELIVERY -> CSM | product_feature.deprecated | product_features | Manage customer service problems | needs lookup | medium |
| 1004 | PM-ROADMAP-DELIVERY -> CDP | product_feature.adoption_threshold_reached | product_features | Develop customer insights | needs lookup | medium |
| 1005 | PM-ROADMAP-DELIVERY -> CRM-ACCT-MGT | product_line.launched | product_lines | Develop and manage sales account relationships | needs lookup | medium |
| 1006 | PM-ROADMAP-DELIVERY -> ERP-FIN | product_line.launched | product_lines | Manage item master / product master | needs lookup | medium |
| 1007 | PM-ROADMAP-DELIVERY -> CSM | product_metric.threshold_breached | product_metrics | Manage customer service problems | needs lookup | medium |
| 1008 | PM-ROADMAP-DELIVERY -> WORK-MGMT | product_release.planned | product_releases | Develop and manage execution roadmap | 625 | confident L4 |
| 1012 | PM-ROADMAP-DELIVERY -> WORK-MGMT | product_roadmap.item_promoted | product_roadmaps | Prioritize and manage incoming feedback | 530 | medium |
| 791 | WORK-MGMT-TASK-EXEC -> PM-ROADMAP-DELIVERY | work_automation.triggered | work_automations | Workflow automation / Manage IT ops | needs lookup | medium |
| 813 | DXP -> PM-DISCOVERY | ab_test.completed | ab_tests | Generate new product/service concepts | needs lookup | medium |
| 1253 | WORK-MGMT-TASK-EXEC -> PM-ROADMAP-DELIVERY | work_automation.disabled | work_automations | Workflow automation / Manage IT ops | needs lookup | medium |
| 1323 | WORK-MGMT-GOALS-OKR -> PM-ROADMAP-DELIVERY | okr_objective.committed | okr_objectives | Establish strategic direction | needs lookup | medium |
| 1324 | WORK-MGMT-GOALS-OKR -> PM-ROADMAP-DELIVERY | okr_objective.scored | okr_objectives | Measure and report business performance | needs lookup | medium |

#### Report-only outbound NULL target_domain_module_id (B1-31-S4)

11 outbound handoffs (996, 997, 998, 1001, 1003, 1004, 1006, 1007, 1009, 1010, 1011) carry NULL target_domain_module_id. Owing domains: CSM (5: 996, 998, 1003, 1007, 1010), CDP (2: 997, 1004), DXP (3: 1001, 1009, 1011), ERP-FIN (1: 1006).

#### Report-only inbound NULL source_domain_module_id (B1-31-S5)

6 inbound handoffs (184, 243, 775, 781, 784, 813) carry NULL source_domain_module_id. Owing domains: BPA (2: 184, 784), SPM (1: 243), VSDP (1: 775), TEST-MGMT (1: 781), DXP (1: 813).

#### Report-only downstream consumer DMDOs (B1-31-S6)

CSM consumes beta_programs / customer_feedback_items / product_features / product_metrics / product_releases (per outbound payloads to CSM); CDP consumes beta_programs / product_features; DXP consumes product_features / product_releases / product_roadmaps; ERP-FIN consumes product_lines. None of these consumer DMDOs exist on the receiving-side modules. Routed to those domains' audits.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (B9 events + B9b + E bootstrap) | 3 |
| APQC TAGGING (residual H1) | 1 |
| Report-only (B10b outbound + inbound + downstream DMDOs) | 3 (S4, S5, S6) |
| MISSING (entity gap) | 0 (deferred to Bucket 3) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 (capability PMM split is Bucket 2) |
| BOUNDARY | 0 |
| MODULARIZATION ISSUES | 0 |
| **Bucket 1 total** | 6 |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent cannot answer alone | Options |
|---|---|---|---|
| B2-31-1 | (carry-over) Do the 6 PMM-flavored capabilities (LAUNCH-PLANNING 119, GTM-LAUNCH-COORDINATION 120, MESSAGING-AND-POSITIONING 121, SALES-ENABLEMENT-CONTENT 122, COMPETITIVE-INTELLIGENCE 123, WIN-LOSS-INTERVIEWS 124) belong on PROD-MGMT, or split into a new PMM domain (Bucket 3 candidate)? | Editorial market-boundary judgment. | (a) Promote PMM as new domain candidate, move 6 capability_domains rows. (b) Leave on PROD-MGMT, build PM-MARKETING module. (c) Split per-capability between PMM and GTM-PLAN. |
| B2-31-2 | (carry-over) Rule #15 violation on data_objects.notes for product_metrics (408). Config-shape exemption note was populated; Rule #12 license RESCINDED per Rule #15. Was the wording user-approved at original load, or auto-populated? | Audit cannot tell load-time approval status. | (a) Confirm approved, leave. (b) Confirm auto-populated, PATCH notes='' and log Rule #15 incident in skill-changelog.md. |
| B2-31-3 | (carry-over) B4 pattern-flag re-evaluation: (a) feature_requests.has_personal_content (submitter contact + verbatim quotes); (b) product_releases.has_submit_lock (shipped is terminal, no silent mutations); (c) product_roadmaps.has_submit_lock (published is external commitment); (d) product_lines.has_submit_lock probably false. | Workflow-shape judgment. | Per-flag yes/no. |
| B2-31-4 | (carry-over) roadmap_items (275) is consumed by PM-ROADMAP-DELIVERY but no module catalog-wide masters it. SPM emits handoff 243 with this payload but SPM has no master row either. Two paths: (a) SPM masters it in portfolio-roadmap module, (b) DELETE the orphan consumer DMDO and recast handoff 243 payload to product_roadmaps (405). | Two competing models. | (a) Schedule SPM audit. (b) DELETE + recast. |
| B2-31-5 | (carry-over) F5 Semantius score: notify_team (914) on skill 202 is coverage_tier='external' but notify_person (913) on skill 201 is platform. Looks like load-time inconsistency. | Which canonical primitive / tier. | (a) Replace notify_team with notify_person on skill 202. (b) Promote notify_team to platform. (c) Leave at 95%. |
| B2-31-6 | (carry-over) Rule #10 platform-builtin users edges: zero data_object_relationships rows wire any of the 8 PROD-MGMT masters to the users built-in (748) despite all 8 referencing users (ownership / submitter / assignee). Default verbs proposed: product_lines.owned_by, product_features.assigned_to, product_releases.owned_by, product_roadmaps.owned_by, feature_requests.submitted_by, customer_feedback_items.submitted_by, product_metrics.recorded_by, beta_programs.owned_by. | Per-row verb editorial. | (a) Approve 8 default edges. (b) Specify per-row overrides. |
| B2-31-7 | (NEW) Rule #15 violation on domain_data_objects.notes across all 9 PROD-MGMT DMDOs in the legacy rollup (data_object_id 402-409 carry "Phase-B Lite batch 1, agent-derived; trigger_events + handoffs deferred to follow-up audit pass"; data_object_id 249 / value_streams carries a vantage-point description). All written in legacy load with em-dashes (project also forbids em-dashes). Pure system-mutation history + restated structured columns; both forbidden patterns per Rule #15. The 2026-05-30 audit did not call this out. | Per audit obligation in Rule #15 the polluting writes should be reverted and an Incidents entry appended to skill-changelog.md. User confirmation needed before PATCH. | (a) PATCH 9 domain_data_objects.notes to '' and append Rule #15 incident entry to skill-changelog.md. (b) Approve current wording (requires Rule #15 carve-out justification). |

### Bucket 3, Phase 0 pending (speculative, carry-over from 2026-05-30)

8 candidate entities (product_opportunities, product_themes / strategic_initiatives, prioritization_scores, release_notes / changelog_entries, feature_flag_records, user_research_sessions, release_milestones, competitor_intelligence_records). 2 candidate modules (PM-STRATEGY, PM-COMMS). 2 candidate domains (PMM, FEATURE-FLAGGING) for _missing-domains.md. 2 candidate regulations (GDPR / CPRA on customer_feedback_items, Section 508 / ADA / EAA on product roadmap planning). Vendor-evidence basis: Productboard, Aha! Roadmaps, ProductPlan, Roadmunk, Craft.io, Airfocus, Pendo, LaunchNotes, Canny, Jira Product Discovery, ProdPad, Savio, Dragonboat, Klue, Crayon, Highspot, LaunchDarkly, Statsig, Optimizely, Flagsmith, Split.io. No fresh Phase 0 markdown produced this audit.

### Cross-bucket dependencies

- B2-31-1 (PMM split) still gates Bucket 3 item 8 (competitor_intelligence_records).
- B2-31-4 (roadmap_items orphan) still gates SPM audit kickoff.
- B2-31-7 (legacy notes pollution) is independent of all other items.
- B1-31-S2 (intra-domain handoffs) depends on creating 1 new feature_request.accepted trigger_event.
- B1-31-S3 (Phase-E bootstrap) is independent.
- Bucket 1 and Bucket 3 are otherwise independent.

### Decisions

_(none yet, awaiting user feedback per buckets above)_

### Fixes applied

_(none in this audit run; this is a Validate-only pass)_

### `domains.notes` pointer

`domains.notes` is empty on PROD-MGMT. No update proposed in this audit.

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

---

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate execute pass (SKILL.md Rule #21) over PROD-MGMT (domain 101, modules PM-DISCOVERY 130 + PM-ROADMAP-DELIVERY 131). Worked only the open state.yaml items, classified into EXECUTE / SURFACE / LEAVE per the orchestrator contract. Live re-verification first: domain id and module ids confirmed, all 8 masters live-confirmed `unclassified`, all 6 residual trigger_events live-confirmed empty `event_category`, all three catalog UX fields (domain + both modules) live-confirmed empty. The APQC snapshot was stale: of the 16 handoffs the snapshot listed as untagged, 10 already carry agent_curated `handoff_processes` rows on live. Loader: `.tmp_deploy/fix_prod_mgmt_state_driven_2026_06_07.ts` (idempotent; reads live, inserts only missing, never overwrites a non-empty value).

### Executed (additive/corrective, record_status='new')

- **B1A-ENTITY-TYPE:** PATCHed `data_objects.entity_type` on all 8 masters (was `unclassified`). 402 product_lines, 403 product_features, 404 product_releases, 405 product_roadmaps, 406 feature_requests, 407 customer_feedback_items, 409 beta_programs -> `operational_workflow` (each carries a requires_permission lifecycle state machine). 408 product_metrics -> `computed` (time-series KPI projection of upstream usage/quality data; no workflow). This typed column now carries the config-shape signal previously parked in `data_objects.notes` (see open b2 B2-31-2). 8 rows.
- **B1A-EVENT-CATEGORY-RESIDUAL:** PATCHed empty `event_category` on 6 PROD-MGMT-owned trigger_events. 1139 beta_program.feedback_collected -> signal; 1140 beta_program.closed -> lifecycle; 1141 customer_feedback_item.received -> lifecycle; 1143 feature_request.submitted -> lifecycle; 1150 product_line.retired -> lifecycle; 1152 product_metric.refreshed -> signal. 6 rows.
- **B1A-INTRA-DOMAIN-HANDOFFS:** Created 1 trigger_event `feature_request.accepted` (id 1550; data_object 406, event_category state_change, to_state accepted, from_state prioritized, domain_module 130). INSERTed 3 intra-domain handoffs (source=target=101, integration_pattern lifecycle_progression, friction low): 130->131 product_features on feature_request.accepted (id 1389); 130->131 product_features on customer_feedback_item.linked_to_feature 1142 (id 1390); 131->130 feature_requests on product_feature.released 1146 (id 1391). 1 event + 3 handoffs.
- **Catalog UX (Rule #20):** authored and wrote buyer-voice catalog_tagline + catalog_description into the 3 empty rows: domain 101 (PROD-MGMT), module 130 (PM-DISCOVERY), module 131 (PM-ROADMAP-DELIVERY). Empty-guarded per field; no non-empty value overwritten. 3 rows (6 fields).
- **B1A-APQC-TAGGING (partial):** INSERTed 1 agent_curated `handoff_processes` row for the single untagged handoff with a clean L4 PCF match: handoff 1002 (product_feature.released -> CRM) -> PCF 1350 "Maintain customer/product master files" (external_id 10794, hierarchy_level 4). proposal_source agent_curated, role implements, record_status defaulted to new. 1 row.

### Surfaced (returned to user; NOT executed)

- **b2 decisions (7):** B2-31-1 (PMM capability split), B2-31-2 (product_metrics.notes Rule #15 revert - now also redundant since entity_type='computed'), B2-31-3 (4 pattern-flag re-evaluations), B2-31-4 (roadmap_items orphan: SPM-master vs DELETE+recast), B2-31-5 (notify_team external vs platform; may be mooted by skill_tools retirement), B2-31-6 (8 users built-in edge verbs), B2-31-7 (9 domain_data_objects.notes Rule #15 revert - rows slated for deletion under ddo retirement anyway).
- **Destructive (surfaced):** the record_status='approved' reviewer pass on the agent_curated handoff_processes rows still at 'new' (new b1a B1A-APQC-APPROVAL-PASS); plus the destructive halves embedded in b2 items 2, 4, 5, 7 (notes overwrites, the roadmap_items DELETE+recast, the notify_team replace/promote).
- **Personas deferred (B1A-PHASE-P):** persona/RACI layer (domain_roles + role_modules reach + process_raci + lifecycle.process_id) NOT authored, per orchestrator deferral. Candidate personas noted: PRODUCT-MANAGER, HEAD-OF-PRODUCT, PRODUCT-OPS-ANALYST, ENGINEERING-LEAD.
- **APQC defer-to-Discover:** 5 untagged handoffs (996, 1005, 1007, 791, 1253) had no clean L4 PCF match on live; deferred to a PCF-research/Discover pass rather than forced onto a loose L3/medium match (new b1a B1A-APQC-DISCOVER-RESIDUAL).

### Left (not touched)

- **B1A-PHASE-E-BOOTSTRAP -> RETIRED:** reframed as B1A-PHASE-E-RBAC-RETIRED. The 4-roles + 6-role_modules + 6-baseline-permissions + 14-workflow-gate-permissions + permission_hierarchy bootstrap targets the catalog RBAC store Plan 3 (2026-06-02) DELETED. The catalog now stores no derived permissions and no permission_hierarchy; the emitter derives them from entity_type + requires_permission lifecycle states + domain_roles/process_raci, and the deployer materializes them. Authoring those rows would re-introduce the deleted `_core` pollution. Successor is B1A-PHASE-P (deferred). The 14 requires_permission lifecycle states already carry domain_module_id (130/131), so gate derivation has its inputs.
- **b1b (3 items):** report-only B10b NULL-FK asymmetries + downstream consumer DMDOs, blocked on neighbor audits (CSM, CDP, DXP, ERP-FIN, BPA, SPM, VSDP, TEST-MGMT). Clear automatically as those domains are finished.
- **b3 (8 candidates) + candidate domains/regulations:** discretionary backlog, untouched.

### Decisions

_(none yet; b2 forks + destructive steps awaiting user)_
