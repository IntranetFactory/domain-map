---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 24
---

# AIOPS, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 7 mastered `data_objects` (event_correlations, anomaly_detections, root_cause_analyses, predictive_signals, alert_suppression_rules, ml_model_training_records, incident_predictions), 5 consumer/contributor rows, 9 trigger_events, 8 outbound and 16 inbound cross-domain handoffs, 0 `domain_modules`, 0 `domain_module_data_objects`, 0 `data_object_relationships` involving any AIOPS master, 0 `data_object_lifecycle_states`, 0 `data_object_aliases`, 0 `domain_regulations`, 0 module-anchored system skills (1 legacy domain-level skill `aiops-system` at `skills.id=27`), 0 roles in `role_modules` (cannot exist without modules).
- Vendor surface basis (flagship vendors enumerated for the semantic pass): BigPanda AIOps, Moogsoft (Dell AIOps), ServiceNow ITOM Event Management, Splunk IT Service Intelligence, IBM Cloud Pak for AIOps, Dynatrace Davis AI, PagerDuty AIOps, Selector AI, Devo SOAR/AIOps. Compliance overlay is light, ML governance overlaps with the queued AI-GOV candidate.
- **Bucket 1 (in-scope, agent fixable):** 16 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items.
- Candidates queued in `audits/_missing-domains.md`: 2 (MLOPS bumped 1 to 2, AI-GOV bumped 1 to 2). No new candidate codes added.

### Pass 1, Structural

#### S-band coverage sweep

**S1, direct FKs to `domains`.**

| Table | FK column | AIOPS rows | Expected non-zero? |
| --- | --- | --- | --- |
| `domain_data_objects` | `domain_id` | 12 | yes |
| `solution_domains` | `domain_id` | 5 | yes |
| `business_function_domains` | `domain_id` | 2 | yes |
| `capability_domains` | `domain_id` | 0 | yes (FAIL, A2) |
| `domain_regulations` | `domain_id` | 0 | optional |
| `domains.parent_domain_id` | `parent_domain_id` | 0 (no sub-domains) | optional |
| `handoffs.source_domain_id` | `source_domain_id` | 8 | yes |
| `handoffs.target_domain_id` | `target_domain_id` | 16 | yes |
| `skills.domain_id` | `domain_id` | 1 (legacy domain-level) | yes (but routes to F1 fail since module is null) |
| `domain_modules.domain_id` | `domain_id` | 0 | yes (FAIL, M1, blocking) |
| `domain_module_host_domains.domain_id` | `domain_id` | 0 | only if cross-cutting hosts |
| `domain_aliases.domain_id` | `domain_id` | 0 | optional |

**S2, indirect-table per-module coverage.** Not runnable, no modules exist (M1 blocks).

**S3, per-master indirect coverage.**

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| event_correlations (93) | 0 | 2 (39 mis-described, 143 orphaned) | 0 |
| anomaly_detections (94) | 0 | 1 (7) | 0 |
| root_cause_analyses (95) | 0 | 1 (645) | 0 |
| predictive_signals (96) | 0 | 1 (646) | 0 |
| alert_suppression_rules (722) | 0 | 1 (647) | 0 |
| ml_model_training_records (723) | 0 | 2 (648, 649) | 0 |
| incident_predictions (724) | 0 | 1 (650) | 0 |

Every master has zero lifecycle states (B12 fail across the board), zero aliases (B11 fail), and most have observable transitions whose verbs are not encoded as `data_object_lifecycle_states` rows with `requires_permission=true`.

#### Band-level findings

- **A1 PASS** for `domains.crud_percentage=20`, `min_org_size=30 m <2500`, `cost_band=$$$$`, `usa_market_size_usd_m=1500`, `market_size_source_year=2025`, `business_logic` populated, `certification_required=false`. BUT `business_logic` contains a U+2014 em-dash (CLAUDE.md violation), see B1-S1 below.
- **A2 FAIL** zero `capability_domains` rows. AIOPS has zero capabilities anchored.
- **A3 PASS** 5 solutions with coverage_level set (2 primary, 3 secondary).
- **A4 FAIL** both `catalog_tagline` and `catalog_description` are empty strings.
- **A5** not run, vendor refresh opt-in only.
- **M1 FAIL (BLOCKING)** zero `domain_modules` rows. Every downstream band is degraded.
- **M2 FAIL** vacuously, with zero modules and unknown capability count, the floor cannot be checked.
- **M4-M7** unrunnable, no modules.
- **B1 PASS** 7 master rows in legacy `domain_data_objects`.
- **B2 PASS** every master has singular_label and plural_label populated.
- **B3 PASS** every master is prefixed (no bare-word), `is_canonical_bare_word=false`, no rationale required.
- **B4 FAIL** every master has all three pattern flags `false` by default; no positive audit re-evaluation has happened. `ml_model_training_records` plausibly has `has_submit_lock=true` (training run commits are immutable); `incident_predictions` plausibly has `has_single_approver=false` (machine output, not approved). Surface in Bucket 2 for the user to evaluate per master.
- **B5 PASS** zero `embedded_master` rows, nothing to validate.
- **B6 FAIL** zero `data_object_relationships` edges where both ends are AIOPS masters. The implied edges (`event_correlations spawns root_cause_analyses`, `event_correlations contains anomaly_detections`, `root_cause_analyses references event_correlations`, `incident_predictions references predictive_signals`, `ml_model_training_records calibrates anomaly_detections`, `alert_suppression_rules suppresses monitoring_events`, etc.) are all missing.
- **B7 FAIL** zero `users` edges. Expected actors: incident analyst (assignee on RCAs), ML engineer (creator on `ml_model_training_records`), reviewer (approver on `alert_suppression_rules`).
- **B8 FAIL** for outbound, zero cross-domain `data_object_relationships`. Every outbound handoff with a clean payload mapping (8 rows) is missing its mirror relationship row.
- **B9 FAIL** every master has observable state transitions, but only 9 trigger_events exist across the 7 masters and most masters carry only one (no `published`, `resolved`, `expired`, `accepted_feedback`, `auto_remediated` events). `event_correlations` carries trigger 143 (`topology.published`) whose name and description suggest it belongs on `service_maps` (CMDB) or a separate topology entity, this is a B9 data-quality bug. Trigger 39 (`correlation.identified`) has a description string saying "Fired when a Incident is identified" which mis-references the entity, label-text bug, easy PATCH.
- **B9b** vacuously passes (no modules, no intra-domain handoff surface to model).
- **B10 REPORT-ONLY** every inbound handoff has `target_domain_module_id=null`. The fix lives on AIOPS (it is the target side and owes a target module) but is blocked by M1.
- **B10b FAIL** all 8 outbound handoffs have `source_domain_module_id=null` (blocked by M1), all 16 inbound handoffs have `target_domain_module_id=null` (also blocked by M1). One single OBS->AIOPS handoff (id 628 from `service_maps`) has `source_domain_module_id=109` resolved (CMDB-SERVICE-MAPPING). All AIOPS-side per-module FKs are null.
- **B11 FAIL** zero `data_object_aliases` rows. Non-self-explanatory masters expected to carry aliases: `event_correlations` (alert correlation, alert clustering, event grouping), `anomaly_detections` (outlier detection, baseline deviation), `root_cause_analyses` (RCA, probable cause inference), `predictive_signals` (forecast indicators, leading indicators), `incident_predictions` (predicted incidents, proactive incident).
- **B12 FAIL** zero `data_object_lifecycle_states` across all 7 masters. Each master has at least one workflow-gate state: `event_correlations` (open -> investigating -> resolved -> closed), `root_cause_analyses` (draft -> reviewed -> published), `alert_suppression_rules` (proposed -> activated -> expired), `ml_model_training_records` (started -> completed/failed -> deployed), `incident_predictions` (predicted -> confirmed/dismissed -> realized).
- **C1 PASS** 1 owner (`IT Infrastructure`) + 1 contributor (`Software Engineering`).
- **C2 PASS** no overrides recorded, but with zero capabilities the check is vacuous.
- **D1** UI spot-check, none of the data has been loaded with `record_status='approved'` (legacy seed data, all `new` by default).
- **E1-E6 FAIL** vacuously, no modules means no `role_modules` rows can exist. No persona is bundled against AIOPS today.
- **F1 FAIL** legacy domain-level system skill `aiops-system` (id 27, `domain_module_id=null`) exists. Once modules ship, this must retire in favor of per-module system skills.
- **F2 FAIL** module count is 0, expected skills count is 0, current is 1. Cannot satisfy F2 without M1.
- **F3 PASS** the legacy skill has 9 `skill_tools` rows (4 query primitives on the 4 original masters, 4 query primitives on the 3 new masters added later, plus `send_email` and `post_chat_message` channels). Functionally adequate but anchored on the wrong skill (domain-level instead of module-level).
- **F4 PASS** all 9 tools satisfy the `operation_kind` <-> `data_object_id` invariant.
- **F5** computable on the legacy skill, `strict_score = 8/9 = 0.889` (post_chat_message is `external`), `operational_score = 8/9` (no `integration`-tier rows). Will need to be recomputed per module once the M-band lands.
- **F7 FAIL** `send_email` (tool 37) and `post_chat_message` (tool 40) are channel primitives, both `requirement_level=required`, both with empty `notes`. Per the channel-vs-capability authoring rule the default for generic notifications is `notify_person` / `notify_team`. Fix: re-anchor on the abstraction tools unless the user can justify the channel-specific link.
- **H1 FAIL** of 24 cross-domain handoffs (8 outbound + 16 inbound), only 4 have any `handoff_processes` tag (3 of those are `discovery_substring`, 1 is `agent_curated`). 20 are untagged. Coverage 4/24 = 17%, `approved` count 0. Expected throughput from this audit: 12 to 19 new `agent_curated` tags, 5 deferrals. See APQC TAGGING in Bucket 1.

### Pass 2, Market audit (semantic)

Flagship-vendor surface enumerated independently of the catalog: BigPanda AIOps, Moogsoft, ServiceNow ITOM Event Management (Workflow), Splunk IT Service Intelligence, IBM Cloud Pak for AIOps, Dynatrace Davis AI, PagerDuty AIOps, Selector AI, Devo SOAR/AIOps.

Vendor surface matrix (union, snake_case_plural names, classified):

| Entity | Class | Notes |
| --- | --- | --- |
| event_correlations | Core | Already mastered |
| anomaly_detections | Core | Already mastered |
| root_cause_analyses | Core | Already mastered |
| predictive_signals | Core | Already mastered |
| alert_suppression_rules | Core | Already mastered |
| ml_model_training_records | Core | Already mastered |
| incident_predictions | Core | Already mastered |
| correlation_rules | Common | Author-time deterministic rule configs (rule-based correlation, complementary to ML); BigPanda, Moogsoft, ServiceNow Event Mgmt all ship it (MISSING) |
| enrichment_pipelines | Common | CMDB / topology enrichment of inbound events (lookup CIs, add service tier, classify env); MISSING |
| service_health_scores | Common | Splunk ITSI service scores, Dynatrace Davis severity, BigPanda environment health; MISSING |
| alert_storms | Common | Storm / flapping detection result records; MISSING |
| feedback_labels | Common | Analyst feedback on correlations to retrain the model (loved by BigPanda, Moogsoft); MISSING |
| change_correlations | Specialist | Linking events to recent change_requests (correlation hint that a change caused the event); MISSING |
| runbook_executions | Specialist | Auto-remediation executions triggered by AIOps; typically routed to SOAR/ITPA, scope question |
| golden_signal_definitions | Specialist | SRE-style signal contracts (latency / errors / saturation / traffic); MISSING |
| model_drift_alerts | Specialist | First-class drift alerts distinct from `ml_model_training_records.drift_detected` event |
| escalation_policies | Specialist | Confidence-based escalation when ML output is below threshold |

#### Findings

- **MISSING entities (in-scope, agent fixable):** `correlation_rules`, `enrichment_pipelines`, `service_health_scores`, `alert_storms`, `feedback_labels`, `change_correlations`, `model_drift_alerts`, `escalation_policies`, `golden_signal_definitions`. These are all common to the flagship vendor set and not in the current catalog. Surfaced as Bucket 3 (speculative) because Phase 0 has not been formally run, even though the analyst is confident on several.
- **WRONG-OWNERSHIP:** trigger `topology.published` (id 143) currently anchored on `event_correlations` (93) but the event name / description point at service topology, which CMDB masters via `service_maps`. Surface for re-attribution. The event has zero handoffs using it, deletion is also an option.
- **SCOPE-CREEP:** none currently in scope. The 5 consumer/contributor rows (`configuration_items`, `monitoring_events`, `monitoring_alerts`, `distributed_traces`, `data_pipelines`) are all legitimate dependencies for AIOps.
- **MODULARIZATION-ISSUE (BLOCKING):** AIOPS has zero modules. The market shape implies at minimum 2 modules: AIOPS-EVENT-CORRELATION (event_correlations, correlation_rules, alert_suppression_rules, alert_storms, enrichment_pipelines) and AIOPS-PREDICTIVE-INTELLIGENCE (anomaly_detections, predictive_signals, incident_predictions, root_cause_analyses, ml_model_training_records, model_drift_alerts, feedback_labels). Possibly a third AIOPS-SERVICE-HEALTH (service_health_scores, golden_signal_definitions, escalation_policies). Surfaced as Bucket 2 (judgment call on the split).

### Pass 3, Neighbor discovery (auto-derived edge weights)

| Neighbor | Outbound handoffs | Inbound handoffs | DMDO dependencies | Edge weight |
| --- | --- | --- | --- | --- |
| OBS | 1 | 6 | distributed_traces (consumer) | 8 |
| ITOM | 3 | 2 | monitoring_events (consumer), monitoring_alerts (contributor) | 7 |
| ITSM | 4 | 0 | (incident payload) | 4 |
| DEM | 0 | 2 | (none) | 2 |
| CMDB | 0 | 1 | configuration_items (consumer) | 2 |
| RMM | 0 | 1 | monitoring_alerts (contributor, shared master) | 2 |
| DATA-AI-PLAT | 0 | 1 | data_pipelines (consumer) | 2 |
| DCIM | 0 | 1 | (none) | 1 |
| NPMD | 0 | 1 | (none) | 1 |

Heavy neighbors (edge >= 3): OBS, ITOM, ITSM. Pass 4 runs the four-leg analysis against each.

### Pass 4, Pairwise reconciliation per neighbor (edge weight >= 3)

#### AIOPS <-> OBS (weight 8)

- **Section 1, fully wired:** none, every AIOPS-side row is null on the per-module FK.
- **Section 2, NULL module FKs:** handoffs 56, 608, 609, 610, 612, 613 (OBS to AIOPS) and 606, 605 (AIOPS to OBS). Both sides need per-module attribution. AIOPS side blocked by M1. OBS side: needs to nominate the OBS module that masters `metric_series`, `log_entries`, `distributed_traces`, `anomaly_candidate.detected` source. Report-only on OBS side.
- **Section 3, missing handoffs:** OBS publishes `metric_series.threshold_breached`, `metric_series.anomaly_detected`, `log_entry.error_pattern_matched`, `distributed_trace.slow_path_detected`, `distributed_trace.error_spike` into AIOPS, but the symmetric "AIOPS publishes a feedback signal back to OBS to dial down a noisy threshold" is not modeled. Surface as Bucket 3.
- **Section 4, B5 integrity:** none, all consumer / contributor data_objects are catalog-mastered.
- **Section 5, cross-domain `data_object_relationships`:** zero rows in either direction. Every OBS->AIOPS handoff and every AIOPS->OBS handoff should have a mirror relationship. Missing 9 relationship rows.

#### AIOPS <-> ITOM (weight 7)

- **Section 1, fully wired:** none.
- **Section 2, NULL FKs:** handoffs 59, 605, 607 (AIOPS to ITOM), 53, 619 (ITOM to AIOPS). AIOPS side blocked by M1. ITOM side needs ITOM module nominations.
- **Section 3, missing handoffs:** the AIOPS to ITOM direction is captured for monitoring_events and predictive_signals; consider adding `alert_storm.detected` (ITOM applies blast-radius reduction), Bucket 3.
- **Section 4, B5:** none.
- **Section 5, relationships:** zero rows. 5 cross-domain relationship rows missing.

#### AIOPS <-> ITSM (weight 4)

- **Section 1, fully wired:** none on AIOPS side; ITSM target_domain_module_id IS populated (38 = ITSM-INCIDENT-MGMT, 40 = ITSM-PROBLEM-MGMT). Asymmetric drift: ITSM has done its B10b backfill on these inbound rows, AIOPS has not.
- **Section 2, NULL FKs:** all 4 outbound AIOPS to ITSM rows have `source_domain_module_id=null`. Blocked by M1.
- **Section 3, missing handoffs:** consider AIOPS->ITSM auto-close suggestions when an `incident_prediction` is dismissed (Bucket 3).
- **Section 4, B5:** ITSM payload data_objects (`service_incidents` id 47, `service_problems` id 49) are correctly mastered by ITSM.
- **Section 5, relationships:** zero rows. Missing 4 cross-domain relationship rows of the shape `root_cause_analyses informs service_problems`, `event_correlations triggers service_incidents`, `incident_predictions forecasts service_incidents`.

### Bucket 1, In-scope confirmed gaps

| Item | Type | Description |
| --- | --- | --- |
| B1-S1 | STRUCTURAL (CLAUDE.md violation) | PATCH `domains.business_logic` (id=6) to remove the U+2014 em-dash. Proposed: "Event correlation, deduplication, anomaly detection, and root-cause analysis: ML and statistical algorithms across high-volume telemetry." |
| B1-A2 | STRUCTURAL | Author 5 to 7 `capabilities` for AIOPS and link via `capability_domains`. Proposed codes: AIOPS-EVENT-CORRELATION, AIOPS-ANOMALY-DETECTION, AIOPS-ROOT-CAUSE-ANALYSIS, AIOPS-PREDICTIVE-INSIGHTS, AIOPS-ALERT-NOISE-REDUCTION, AIOPS-ML-MODEL-OPS, AIOPS-SERVICE-HEALTH-SCORING. |
| B1-A4 | STRUCTURAL | Draft `catalog_tagline` and `catalog_description` per Rule #20 (buyer voice). Surface drafts to user before writing. |
| B1-M1 | STRUCTURAL (BLOCKING) | Author at least 2 `domain_modules` rows (the 2+ floor applies once capabilities >= 3): AIOPS-EVENT-CORRELATION and AIOPS-PREDICTIVE-INTELLIGENCE as the minimal split. Optionally a 3rd AIOPS-SERVICE-HEALTH. Every other M-band, B-band module-anchored, E-band, F2 fix depends on this. |
| B1-B4 | STRUCTURAL | Re-evaluate pattern flags on all 7 masters. Author proposal: set `has_submit_lock=true` on `ml_model_training_records`, `root_cause_analyses` (when published, immutable), `alert_suppression_rules` (once activated). |
| B1-B6 | STRUCTURAL | Author intra-domain `data_object_relationships`: `event_correlations contains anomaly_detections`, `event_correlations spawns root_cause_analyses`, `root_cause_analyses references event_correlations`, `incident_predictions references predictive_signals`, `ml_model_training_records calibrates anomaly_detections`, `alert_suppression_rules suppresses event_correlations`, `feedback_labels improves anomaly_detections` (once feedback_labels exists). Approx 7 edges. |
| B1-B7 | STRUCTURAL | Author users edges per Rule #10. Expected: `users authors root_cause_analyses`, `users reviews alert_suppression_rules`, `users creates ml_model_training_records`, `users acknowledges incident_predictions`. 4+ rows. |
| B1-B8 | STRUCTURAL | Author outbound cross-domain `data_object_relationships` (mirrors of the 8 outbound handoffs). Examples: `event_correlations triggers service_incidents`, `root_cause_analyses informs service_problems`, `predictive_signals warns service_incidents`, `incident_predictions forecasts service_incidents`, `alert_suppression_rules suppresses monitoring_events`. 8 rows. |
| B1-B9 | STRUCTURAL | Add missing trigger_events on each master to cover the published lifecycle. Expected new rows: `event_correlation.published`, `event_correlation.resolved`, `anomaly_detection.confirmed`, `anomaly_detection.dismissed`, `root_cause_analysis.reviewed`, `predictive_signal.expired`, `incident_prediction.realized`, `incident_prediction.dismissed`. Also: PATCH trigger 39 description (no "Incident" word, replace with "Event Correlation"); DELETE or re-attribute trigger 143 `topology.published` on event_correlations (likely re-anchor to a CMDB or SRE entity, see Bucket 2). |
| B1-B10b | STRUCTURAL | After M1 lands, run a B10b backfill to set `source_domain_module_id` on the 8 outbound handoffs and `target_domain_module_id` on the 16 inbound handoffs. Deterministic derivation per the reference loader [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts). |
| B1-B11 | STRUCTURAL | Author `data_object_aliases` for the 5 non-self-explanatory masters: event_correlations (alert clustering, event grouping), anomaly_detections (outlier detection, baseline deviation), root_cause_analyses (RCA, probable cause inference), predictive_signals (leading indicator, forecast indicator), incident_predictions (proactive incident, predicted incident). ~10 alias rows. |
| B1-B12 | STRUCTURAL | Author `data_object_lifecycle_states` per master, with `domain_module_id` set after M1: event_correlations (open / investigating / resolved / closed), root_cause_analyses (draft / reviewed / published), alert_suppression_rules (proposed / activated / expired), ml_model_training_records (started / completed / failed / deployed), incident_predictions (predicted / confirmed / dismissed / realized), anomaly_detections (detected / confirmed / dismissed), predictive_signals (active / expired). Approx 24 state rows. |
| B1-F1 | STRUCTURAL | Retire the legacy `aiops-system` skill row (`skills.id=27`, `domain_module_id=null`) once module-level system skills ship. |
| B1-F7 | STRUCTURAL | Re-anchor `send_email` (tool_id=37) and `post_chat_message` (tool_id=40) `skill_tools` rows to `notify_person` (or `notify_team` for broadcasts) on whichever module-level skill ships. Both channel-specific links lack workflow-specific justification. |
| B1-H1 | APQC TAGGING | Author 12 to 19 new `handoff_processes` rows with `proposal_source='agent_curated'`, `record_status='new'`. Per-handoff classifications: |

#### B1-H1, APQC TAGGING proposals

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 57 | AIOPS -> ITSM | correlation.identified | service_incidents | Triage IT service delivery incidents | 1299 | already agent_curated |
| 58 | AIOPS -> ITSM | root_cause.identified | service_problems | Perform root cause analysis | 837 | already discovery_substring (upgrade to agent_curated on re-approval) |
| 603 | AIOPS -> ITSM | root_cause_analysis.published | service_incidents | Perform root cause analysis | 837 | already discovery_substring |
| 604 | AIOPS -> ITSM | incident_prediction.high_confidence | service_incidents | Triage IT service delivery incidents | 1299 | confident L4 |
| 605 | AIOPS -> ITOM | predictive_signal.elevated | predictive_signals | Manage infrastructure performance and capacity | 1304 | confident L4 |
| 606 | AIOPS -> OBS | alert_suppression_rule.activated | alert_suppression_rules | Operate and monitor online systems | 1301 | confident L4 |
| 607 | AIOPS -> ITOM | alert_suppression_rule.activated | alert_suppression_rules | Operate and monitor online systems | 1301 | confident L4 |
| 59 | AIOPS -> ITOM | noise.suppression_applied | monitoring_events | Operate and monitor online systems | 1301 | confident L4 |
| 53 | ITOM -> AIOPS | events.burst_detected | event_correlations | Monitor and report events influencing factors | 629 | already discovery_substring |
| 56 | OBS -> AIOPS | anomaly_candidate.detected | anomaly_detections | Monitor and report IT performance | 1128 | confident L4 |
| 608 | OBS -> AIOPS | metric_series.threshold_breached | metric_series | Monitor and report IT performance | 1128 | confident L4 |
| 609 | OBS -> AIOPS | metric_series.anomaly_detected | metric_series | Monitor and report IT performance | 1128 | confident L4 |
| 610 | OBS -> AIOPS | log_entry.error_pattern_matched | log_entries | Monitor and report IT performance | 1128 | confident L4 |
| 612 | OBS -> AIOPS | distributed_trace.slow_path_detected | distributed_traces | Monitor and report IT performance | 1128 | confident L4 |
| 613 | OBS -> AIOPS | distributed_trace.error_spike | distributed_traces | Monitor and report IT performance | 1128 | confident L4 |
| 619 | ITOM -> AIOPS | capacity_record.threshold_breached | capacity_records | Manage infrastructure performance and capacity | 1304 | confident L4 |
| 141 | RMM -> AIOPS | monitoring_alert.threshold_breached | monitoring_alerts | Operate and monitor online systems | 1301 | confident L4 |
| 154 | DATA-AI-PLAT -> AIOPS | pipeline_run.failed | data_pipelines | Run and monitor batch job schedule | 1302 | confident L4 |
| 628 | CMDB -> AIOPS | service_map.updated | service_maps | Manage infrastructure configuration | 1309 | confident L4 |
| 649 | NPMD -> AIOPS | network_flow_record.anomalous_pattern | network_flow_records | Monitor IT infrastructure security | 1307 | tentative, deferred to Discover Pass 3 (security overlap) |
| 665 | DEM -> AIOPS | endpoint_anomaly_finding.published | endpoint_anomaly_findings | Monitor and report IT performance | 1128 | confident L4 |
| 667 | DEM -> AIOPS | real_user_session.poor_experience | real_user_sessions | Monitor and report IT performance | 1128 | confident L4 |
| 676 | DCIM -> AIOPS | dc_power_distribution_unit.failure | dc_power_distribution_units | Operate and monitor online systems | 1301 | tentative, also a candidate for Discover custom-process |

Deferred to Discover Pass 3: handoffs 649 (NPMD network flow anomaly, security overlap), 676 (DCIM power distribution failure, no clean cross-industry PCF for physical data-center incident).

### Bucket 2, Surface-for-user (judgment calls)

1. **Module split.** AIOPS has 0 modules today. Three candidate splits, ranked by analyst preference:
   - **(a) 2-module split:** AIOPS-EVENT-CORRELATION (event_correlations, correlation_rules, alert_suppression_rules, alert_storms, enrichment_pipelines, change_correlations) + AIOPS-PREDICTIVE-INTELLIGENCE (anomaly_detections, predictive_signals, incident_predictions, root_cause_analyses, ml_model_training_records, model_drift_alerts, feedback_labels).
   - **(b) 3-module split:** add AIOPS-SERVICE-HEALTH (service_health_scores, golden_signal_definitions, escalation_policies) when Bucket 3's service-health entities are confirmed.
   - **(c) 4-module split:** further isolate AIOPS-ML-MODEL-OPS (ml_model_training_records, model_drift_alerts, feedback_labels) from AIOPS-PREDICTIVE-INTELLIGENCE, this is the boundary between MLOps-for-AIOPS and the runtime prediction layer. Note: this overlap is exactly the queued MLOPS candidate, the decision here gates the MLOPS triage.
   - Question for the user: (a), (b), or (c)? Each has a different downstream Phase B load.

2. **Trigger 143 `topology.published` re-attribution.** Currently anchored on `event_correlations` (93). The event name and description suggest service topology, which is CMDB territory (`service_maps`, id 79). Options: (i) DELETE the row (no handoff uses it); (ii) PATCH `data_object_id=79` and move it to CMDB ownership; (iii) keep but PATCH the description if there is a real AIOPS-side topology view. Plus PATCH trigger 39 description ("Incident is identified" should read "Event Correlation is identified"). Awaiting user call.

3. **MLOPS demarcation.** AIOPS currently owns `ml_model_training_records`. The queued MLOPS candidate (mention_count now 2, see `audits/_missing-domains.md`) would own the cross-domain ML platform layer; AIOPS-specific ML models stay here. Question: do we keep `ml_model_training_records` as an AIOPS master and have MLOPS embedded_master it, or move the canonical master to MLOPS and demote AIOPS to consumer/embedded_master?

4. **Pattern flags per master.** B4 audit: confirm `has_submit_lock=true` on `ml_model_training_records` (training runs are immutable artifacts), `root_cause_analyses` (published RCAs are immutable), `alert_suppression_rules` (once activated, change requires a new rule). User to confirm, no notes column writes per Rule #15.

5. **Channel primitives on the system skill.** F7 finding: `send_email` and `post_chat_message` are linked as required tools on `aiops-system`. Are these workflow-specific (the user can name the workflow) or generic notifications (default to `notify_person` / `notify_team`)? If generic, the fix is a swap.

### Bucket 3, Phase 0 pending (speculative)

1. **Missing market-surface entities** (need a formal Phase 0 vendor-surface document before loading): `correlation_rules` (rule-based correlation, complementary to ML), `enrichment_pipelines` (CMDB / topology enrichment of inbound events), `service_health_scores` (Splunk ITSI, Dynatrace Davis severity), `alert_storms` (storm / flapping detection result records), `feedback_labels` (analyst feedback for retraining), `change_correlations` (linking events to recent change_requests), `model_drift_alerts` (first-class drift alerts distinct from training-record events), `escalation_policies` (confidence-based escalation), `golden_signal_definitions` (SRE-style latency / errors / saturation / traffic). Vendor knowledge basis: BigPanda, Moogsoft, ServiceNow ITOM Event Mgmt, Splunk ITSI, Dynatrace Davis, PagerDuty AIOps. Recommended verification: focused Phase 0 pass on AIOps category leaders for entity surface; survivors become Bucket 1 in a follow-up audit.

2. **Symmetric AIOPS -> OBS feedback handoff.** The OBS -> AIOPS direction is heavily modeled (6 inbound). The reverse direction (AIOPS feeds back a threshold recommendation to OBS, e.g. "raise this alert threshold to reduce noise") is not modeled. Worth checking whether any flagship vendor publishes this back-pressure event. Discovery, not certainty.

3. **AIOPS -> SOAR or AIOPS -> ITPA runbook execution.** When an AIOPS root cause is high-confidence and a runbook exists, vendors auto-trigger remediation. The catalog has a SOAR domain (id 12, security focus). General IT runbook execution may or may not warrant a separate ITPA domain. Worth a Phase 0 check, do not queue as candidate yet.

### Cross-bucket dependencies

- Bucket 2 item #1 (module split) blocks every Bucket 1 fix that needs `domain_module_id` set (B1-M1, B1-B10b, B1-B12, B1-F1, B1-F7). All deferred-to-Discover and DMDO authoring waits on the user's pick of (a) / (b) / (c).
- Bucket 2 item #3 (MLOPS demarcation) interacts with Bucket 3 item #1's `model_drift_alerts` and `feedback_labels` candidates: if MLOPS becomes a domain that masters the ML model layer, those candidates move there rather than into AIOPS-PREDICTIVE-INTELLIGENCE.
- Bucket 3 item #1 informs Bucket 2 #1 (c): the 4-module split only makes sense if at least 3 of the speculative entities materialize.

### Per-bucket prompts

**After Bucket 1:** Fix these now? Reply 'all', 'just 1, 3, 5' (cite the B1-XX ids), or 'skip'. Note: B1-M1 is the blocking fix; without it B1-B10b / B1-B12 / B1-F1 / B1-F7 cannot complete cleanly.

**After Bucket 2:** What's your call on each? In particular: (item 1) pick (a), (b), or (c) for the module split; (item 2) DELETE or PATCH trigger 143; (item 3) keep MLOPS embedded_master pattern or transfer the master; (item 4) confirm pattern flag PATCHes per master; (item 5) confirm channel-vs-abstraction swap.

**After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed; named candidates become Bucket 1 in the next pass.

### Report-only follow-ups (owed by other domains)

- **OBS B9** owes outbound module attribution on handoffs 56, 608, 609, 610, 612, 613 (`source_domain_module_id` currently null). Once OBS modularization lands (or if OBS already has modules, run B10b backfill against AIOPS as target).
- **ITOM B10b** owes per-module attribution on handoffs 53, 619 (ITOM -> AIOPS) and on its receive side of 59, 605, 607.
- **RMM B10b** owes `source_domain_module_id` on handoff 141.
- **DATA-AI-PLAT B10b** owes `source_domain_module_id` on handoff 154.
- **DCIM B9** owes a per-module attribution on handoff 676 (currently null source side).
- **NPMD B9** owes a per-module attribution on handoff 649.
- **DEM B10b** owes per-module attribution on handoffs 665, 667.
- **OBS / ITOM / ITSM B8** owe inbound cross-domain `data_object_relationships` mirroring AIOPS's outbound publishes. Will be audited on each of those domains' next B8 passes; AIOPS does not author them.
- **CMDB**: trigger 628 (`service_map.updated`) already has `source_domain_module_id=109` resolved on the CMDB side, no follow-up.
- **Catalog-wide**: the existing 3 `discovery_substring` rows on handoffs 53, 58, 603 are review candidates for promotion to `record_status='approved'` once the user agrees they map correctly. None of those are AIOPS-side fixes, they are reviewer decisions.
