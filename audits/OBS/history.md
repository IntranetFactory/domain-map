# OBS audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 `domain_modules`, 0 capabilities, 0 regulations, 5 masters in legacy `domain_data_objects` rollup (`metric_series` 88, `log_entries` 89, `distributed_traces` 90, `service_level_objectives` 91, `error_groups` 92) plus 1 consumer (`service_maps`, mastered by CMDB) and 1 contributor (`monitoring_events`, mastered by ITOM). 5 solutions, all `primary` (ServiceNow Cloud Observability, Datadog Platform, Dynatrace Platform, New Relic One, Splunk Observability Cloud). 14 outbound cross-domain handoffs (targets: ITSM 5, AIOPS 6, ITOM 1, VSDP 2). 8 inbound cross-domain handoffs (sources: AIOPS, NPMD, DEM, APIM, APP-PAAS, KUBE-PLAT, IPAAS, VSDP). 1 system skill (`obs-system`, id 88) with 7 `skill_tools` rows (5 platform query tools + `send_email` + `post_chat_message`); strict Semantius score 6/7 = 86%, operational 6/7 = 86%. 2 business_function_domains rows (SRE owner, IT Operations contributor). 2 `data_object_relationships` rows touching OBS masters, both inbound from ITSM masters; zero intra-OBS edges; zero `users` edges. Zero `data_object_lifecycle_states`. Zero `data_object_aliases`. 9 `trigger_events` on OBS masters (636 to 644), all with empty `event_category`. 1 `handoff_processes` tag total (handoff 55, `agent_curated`, `record_status='new'`).
- **Vendor-surface basis:** Datadog Platform, Dynatrace Platform, New Relic One, Splunk Observability Cloud, Grafana Cloud, Honeycomb (sampled for market-audit; one compliance-leaning specialist via OpenTelemetry-native vendors). ServiceNow Cloud Observability sits in the catalog as the platform-aligned entry.
- **Bucket 1 (in-scope, agent fixable):** 17 items (16 structural / boundary + 1 APQC TAGGING bundle containing 21 candidate rows).
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 2 items (entity-surface gaps + modularization hypothesis).

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO on OBS masters | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| AIOPS | 6 | 1 | 0 (every event published TO AIOPS) | 0 | 7 | Pairwise (full) |
| ITSM | 5 | 0 | 2 (`error_groups` consumer, `service_level_objectives` consumer on module 38 ITSM-INCIDENT-MGMT) | 1 (inbound: `service_incidents correlates_to error_groups`) | 8 | Pairwise (full) |
| VSDP | 2 | 1 | 0 | 0 | 3 | Pairwise (full) |
| ITOM | 1 | 0 | 0 | 0 | 1 | Lightweight |
| NPMD | 0 | 1 | 0 | 0 | 1 | Lightweight |
| DEM | 0 | 1 | 0 | 0 | 1 | Lightweight |
| APIM | 0 | 1 | 0 | 0 | 1 | Lightweight |
| APP-PAAS | 0 | 1 | 0 | 0 | 1 | Lightweight |
| KUBE-PLAT | 0 | 1 | 0 | 0 | 1 | Lightweight |
| IPAAS | 0 | 1 | 0 | 0 | 1 | Lightweight |
| ITSM (svc_slas) | n/a | n/a | n/a | 1 (inbound `service_slas aligns_with service_level_objectives`) | 1 | Lightweight |
| CMDB | n/a | n/a | OBS consumes `service_maps` (CMDB-mastered) | 0 | 1 | Lightweight |
| ITOM (events) | n/a | n/a | OBS contributes to `monitoring_events` (ITOM-mastered) | 0 | 1 | Lightweight |

The structural M-band is a complete blocker: OBS has zero `domain_modules`, so M1 hard-fails, which collapses M2/M4/M5/M6, F2/F3/F5, E1 to E6, B9b, and B10b-source-side into vacuous-pass-pending-M1. Every Phase A / Phase M / Phase E deliverable for this domain is missing or pending the module set landing first. The legacy `domain_data_objects` rollup carries the 5 masters but no module owns them, so downstream B-band checks read structurally green only because there are no modules to validate against, NOT because the catalog has the right shape.

Three separate B9 attribution defects show the master/event ownership boundary has drifted: events 6 (`monitoring_alert.threshold_breached`, points at `monitoring_alerts` id 85, mastered by ITOM/RMM not OBS), 7 (`anomaly_candidate.detected`, points at `anomaly_detections` id 94, mastered by AIOPS not OBS), and 115 (`slo.breached`, points at `service_incidents` id 47, mastered by ITSM not OBS) are loaded on the OBS handoff surface yet their `data_object_id` resolves to other domains' masters. Handoff 611 (`log_entry.error_pattern_matched` to ITSM) carries `data_object_id=47` (service_incidents, the payload) but event 638 publishes on 89 (log_entries, the source), which is the payload-vs-source confusion case from the B10b backfill notes.

H1 fails hard: only 1 of 22 cross-domain handoffs (4.5%) carries any `handoff_processes` row, far below the 50% to 80% volume target. The single existing tag (handoff 55, ITSM `slo.breached`) is `agent_curated`, `record_status='new'`, pointing at "Triage IT service delivery incidents" (PCF 20903 L4).

F7 fails: `obs-system` (skill 88) links `send_email` (37) and `post_chat_message` (40) as `required` channel primitives with empty `notes`. Per the channel-vs-capability rule these should be `notify_person` or `notify_team`. `post_chat_message.coverage_tier='external'` is the only reason the strict Semantius score is below 100%; replacing with the abstraction will likely flip the score if the abstraction is platform-covered.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail, blocker)** | OBS has **zero `domain_modules` rows** (both as `domain_id=7` primary host AND via `domain_module_host_domains`). Rule #14 makes this an audit blocker. Every downstream M / F / E check is vacuously pending; the legacy `domain_data_objects` rollup carries 5 masters but no module owns them. ITSM-INCIDENT-MGMT module 38 already declares OBS masters as consumers (`error_groups`, `service_level_objectives`), proving the deploy contract surface is being used downstream even though the source domain has no modular split. | Author the OBS module set. Recommended shape (subject to B2-S1 user decision): three full modules covering metrics + traces ("OBS-APM"), log analytics ("OBS-LOG-ANALYTICS"), and SLO + error tracking ("OBS-SLO-RELIABILITY"). Capabilities (B1-S2) get attached to whichever module realizes them. The 5 existing masters get `role='master'` rows on their respective modules. Once modules exist, S6 to S14 below become loadable. |
| B1-S2 | **A2 zero capabilities** | `capability_domains` for OBS returns 0 rows. Phase A expectation is 5 to 8 capabilities per market. | Draft 5 to 7 capabilities (suggestions: `OBS-METRIC-COLLECTION`, `OBS-LOG-INDEXING`, `OBS-DISTRIBUTED-TRACING`, `OBS-SLO-TRACKING`, `OBS-ERROR-TRACKING`, `OBS-DASHBOARDING`, `OBS-AUTO-INSTRUMENTATION`) and link via `capability_domains` + `domain_module_capabilities` once modules land. |
| B1-S3 | **A4 catalog UX fields empty** | `catalog_tagline` and `catalog_description` are both empty strings. Rule #20 requires a buyer-voice draft, surfaced to user before write. | Draft tagline + 1 to 3 paragraph description in buyer voice (workflow + value: "See what's happening across every service in production. Track metrics, logs, and traces in one place, with SLOs, error tracking, and ready-to-page alerts wired up.") then surface BEFORE writing. |
| B1-S4 | **B9 event_category invalid on 9 events** | All 9 OBS `trigger_events` (ids 636 to 644) have `event_category=''`. Per Rule #13 the enum must be one of `lifecycle / state_change / threshold / signal`. Proposed mapping: 636 `metric_series.threshold_breached` to `threshold`, 637 `metric_series.anomaly_detected` to `signal`, 638 `log_entry.error_pattern_matched` to `signal`, 639 `distributed_trace.slow_path_detected` to `signal`, 640 `distributed_trace.error_spike` to `signal`, 641 `service_level_objective.burn_rate_high` to `threshold`, 642 `service_level_objective.budget_exhausted` to `state_change`, 643 `error_group.new_signature` to `signal`, 644 `error_group.regression_detected` to `signal`. | PATCH 9 rows with the categorization above. |
| B1-S5 | **B9 attribution defects (2 events, source-not-OBS)** | Events 6 (`monitoring_alert.threshold_breached`, `data_object_id=85` monitoring_alerts, mastered by ITOM and RMM) and 7 (`anomaly_candidate.detected`, `data_object_id=94` anomaly_detections, mastered by AIOPS) sit on OBS outbound handoffs (54, 56) but their publishing master lives outside OBS. Either the handoffs are mis-attributed (real publisher is ITOM/AIOPS), or OBS owes the master rows. | Decision needed (Bucket 2 B2-S2): if the handoffs are ITOM's / AIOPS' to publish, DELETE handoffs 54 and 56 from OBS. If OBS legitimately publishes derived alerts/anomalies, master the entities here and DELETE the conflicting masters elsewhere (less likely since AIOPS canonically owns anomaly detection). |
| B1-S6 | **B9 attribution defect (event 115, slo.breached)** | Event 115 `slo.breached` carries `data_object_id=47` (service_incidents, ITSM-mastered) but the event is published from OBS handoff 55. SLO breach is OBS-published; the data_object should be 91 (`service_level_objectives`). | PATCH event 115 to `data_object_id=91`, and verify handoff 55's `data_object_id` (currently 47 service_incidents) carries the correct payload-side master (likely should be service_incidents on the target if ITSM auto-tickets, or 91 if the payload is the SLO itself). |
| B1-S7 | **B9 / B10b payload-vs-source confusion (handoff 611)** | Handoff 611 publishes `log_entry.error_pattern_matched` (event 638, `data_object_id=89` log_entries) into ITSM but the handoff's `data_object_id=47` (service_incidents). The trigger is OBS-side, the payload is ITSM-side: this is the catalog's documented payload-vs-source case (B10b sub-case). The current row is internally consistent (source data_object on the event, target data_object on the handoff) but mirrors a relationship row OBS does not carry. | Confirm the pattern is intentional, or PATCH `data_object_id` to 89 if the payload is meant to be the log entry itself. Coordinate with B1-S10 (cross-domain relationship `log_entries causes service_incidents`). |
| B1-S8 | **B6 zero intra-domain `data_object_relationships`** | No edges between any two OBS masters. Expected: `metric_series correlates_to error_groups`, `distributed_traces correlates_to error_groups`, `metric_series tracks service_level_objectives`, `log_entries surfaces error_groups`, `distributed_traces produces log_entries`, `metric_series feeds service_level_objectives`. Without these, the OBS subgraph in fact sheets and architect views is hollow. | Draft 6 intra-domain edges (verb + inverse_verb + relationship_type + relationship_kind + is_required + owner_side) and load. |
| B1-S9 | **B7 zero `users` edges (Rule #10)** | No `data_object_relationships` rows between the 5 OBS masters and `users` (748). Every workflow-bearing OBS master has a user actor: SLO owner, error_group assignee, monitoring runbook author, log saved-search owner, dashboard author. | Draft 5+ user edges (e.g. `users defines service_level_objectives`, `users assigns error_groups`, `users authors log_search_queries`, `users owns dashboards`). |
| B1-S10 | **B8 missing cross-domain relationships** | 14 outbound + 8 inbound cross-domain handoffs; only 2 cross-domain `data_object_relationships` rows touch OBS masters (both inbound from ITSM). Missing payload-target edges: `error_groups creates service_incidents` (ITSM target on handoffs 616, 617, 618), `service_level_objectives spawns service_incidents` (ITSM target on handoffs 614, 615), `log_entries triggers service_incidents` (ITSM target on handoff 611, see B1-S7), `error_groups correlates_to releases` (VSDP target on 616, 617), `metric_series feeds anomaly_detections` (AIOPS target on 608, 609, partly already implicit), `distributed_traces feeds anomaly_detections` (AIOPS target on 612, 613). | Draft 6 outbound cross-domain edges; loader pattern is the standard B6/B8 shape. Some rows may defer pending AIOPS/VSDP master ownership confirmation. |
| B1-S11 | **B11 zero `data_object_aliases`** | None of the 5 OBS masters carry alias rows. Vendor synonyms exist (`metric_series` to Datadog "metric", Prometheus "time series", New Relic "metric event"; `log_entries` to Splunk "event", Sumo "message"; `distributed_traces` to Honeycomb "event chain", Datadog "trace span"; `service_level_objectives` to Honeycomb "SLO", Nobl9 "SLI"; `error_groups` to Sentry "issue", Rollbar "item", Datadog "error issue"). | Draft 8 to 12 alias rows; load via cluster-drafts pattern. |
| B1-S12 | **B12 zero `data_object_lifecycle_states` (Rule #12)** | None of the 5 masters carry lifecycle states. `service_level_objectives` (`draft` → `active` → `archived`), `error_groups` (`new` → `triaging` → `resolved` → `regressed`), `metric_series` and `log_entries` are config-shape (write-once / time-series, exemption candidates per Rule #12), `distributed_traces` similarly time-series. The decision per master is required, not the exemption inline note (Rule #15 rescinded that license). | For SLOs and error_groups, author state machines with `requires_permission` flags + `domain_module_id` on the realizing module (depends on B1-S1 module set). For the three time-series masters, surface the config-shape exemption in this audit (not in `data_objects.notes`). |
| B1-S13 | **B4 pattern flags positive re-evaluation per Rule #12** | All 5 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Re-evaluate explicitly: `service_level_objectives.has_submit_lock=true` (published SLOs should freeze so error budgets are auditable), `service_level_objectives.has_single_approver=true` (one SRE owner per SLO is common), `error_groups.has_single_approver=true` (one on-call owner per active error group). | Decisions captured in Bucket 2 B2-S4; positive flags get a PATCH. |
| B1-S14 | **F2 legacy domain-level system skill (Rule #17)** | Skill 88 (`obs-system`) carries `domain_id=7, domain_module_id=NULL`. Per F1 the legacy domain-level shape is a transitional state; per Rule #17 every `domain_modules` row needs exactly one `skill_type='system'` skill with `domain_module_id` set. Once B1-S1 modules land, this skill needs to be retired or migrated to one of the new modules (most plausibly OBS-APM as the headline module), with new per-module skills authored for the other modules. | After B1-S1 modules land: re-author one `skills` row per `domain_modules` row with `skill_name='<module_code_lower>_agent'`, link the 7 existing `skill_tools` rows to the appropriate module's skill, then DELETE the legacy skill 88. |
| B1-S15 | **F7 channel primitives without justification** | `skill_tools` rows for skill 88 link `send_email` (tool 37, side_effect) and `post_chat_message` (tool 40, side_effect) as `required` with empty `notes`. Per the channel-vs-capability authoring rule the generic-notification case routes to `notify_person` or `notify_team`. The strict Semantius score drag is entirely on `post_chat_message.coverage_tier='external'` (`send_email` is platform-covered). | PATCH the two `skill_tools` rows to link `notify_person` (single recipient, e.g. SLO owner) and/or `notify_team` (broadcast, e.g. on-call channel). If `notify_person/team` are platform-covered, this also fixes the F5 score gap. If the platform doesn't yet ship the abstraction tools, escalate as a catalog-wide tools gap. |
| B1-S16 | **B10b NULL `source_domain_module_id` on every outbound** | All 14 outbound OBS handoffs carry `source_domain_module_id=NULL` because OBS has no modules (B1-S1). This is a vacuous fail until B1-S1 lands. Once modules exist, backfill via the [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../../../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts) pattern. Inbound rows' `target_domain_module_id` is also NULL for all 8 inbound rows for the same reason. | Run the backfill loader after B1-S1 modules land. 9 of 14 outbound also carry NULL `target_domain_module_id`, but those NULLs are report-only against the target domains (AIOPS, ITOM, VSDP), not OBS's fix. |

#### APQC TAGGING

22 cross-domain handoffs total (14 outbound + 8 inbound), 1 tagged (handoff 55 → ITSM, `agent_curated`, `record_status='new'`, PCF 20903 "Triage IT service delivery incidents"). Coverage: 1/22 = 4.5%. Volume target for this audit: 11 to 18 new `agent_curated` rows. Headline catalog quality (`record_status='approved'`): 0/22.

Routine high-confidence tags to author at fix time:

| handoff_id | source → target | trigger_event | payload data_object | Proposed PCF (process_name / external_id) | Confidence |
|---|---|---|---|---|---|
| 54 | OBS → ITOM | `monitoring_alert.threshold_breached` | `monitoring_alerts` | Manage IT infrastructure operations (10566 child) | medium (see B1-S5) |
| 56 | OBS → AIOPS | `anomaly_candidate.detected` | `anomaly_detections` | Manage IT events and incidents (10567 child) | medium (see B1-S5) |
| 608 | OBS → AIOPS | `metric_series.threshold_breached` | `metric_series` | Manage IT events and incidents (10567.x event detection) | confident L4 |
| 609 | OBS → AIOPS | `metric_series.anomaly_detected` | `metric_series` | Manage IT events and incidents | confident L4 |
| 610 | OBS → AIOPS | `log_entry.error_pattern_matched` | `log_entries` | Manage IT events and incidents | confident L4 |
| 611 | OBS → ITSM | `log_entry.error_pattern_matched` | `service_incidents` | Triage IT service delivery incidents (20903 L4) | confident L4 |
| 612 | OBS → AIOPS | `distributed_trace.slow_path_detected` | `distributed_traces` | Manage IT events and incidents | confident L4 |
| 613 | OBS → AIOPS | `distributed_trace.error_spike` | `distributed_traces` | Manage IT events and incidents | confident L4 |
| 614 | OBS → ITSM | `service_level_objective.burn_rate_high` | `service_level_objectives` | Manage service levels and resolve operational issues (10570 or child) | confident L3 |
| 615 | OBS → ITSM | `service_level_objective.budget_exhausted` | `service_level_objectives` | Manage service levels and resolve operational issues | confident L3 |
| 616 | OBS → VSDP | `error_group.new_signature` | `error_groups` | Manage software development and deployment (10577 child for hotfix) | needs PCF lookup |
| 617 | OBS → VSDP | `error_group.regression_detected` | `error_groups` | Manage software development and deployment (regression-handling child) | confident L4 |
| 618 | OBS → ITSM | `error_group.regression_detected` | `error_groups` | Triage IT service delivery incidents (20903 L4) | confident L4 |
| 55 | OBS → ITSM | `slo.breached` | `service_incidents` | Already tagged: Triage IT service delivery incidents (20903 L4), agent_curated, new | already loaded |
| 606 | AIOPS → OBS (inbound) | `alert_suppression_rule.activated` | `alert_suppression_rules` | Manage IT events and incidents | medium |
| 651 | NPMD → OBS (inbound) | `network_performance_metric.threshold_breached` | `network_performance_metrics` | Manage IT infrastructure operations | medium |
| 666 | DEM → OBS (inbound) | `synthetic_monitoring_result.failed` | `synthetic_monitoring_results` | Manage IT events and incidents | medium |
| 749 | APIM → OBS (inbound) | `api_gateway.health_degraded` | `api_gateways` | Manage IT events and incidents | medium |
| 756 | APP-PAAS → OBS (inbound) | `paas_deployment.succeeded` | `paas_deployments` | Manage software releases (10577 child) | medium |
| 760 | KUBE-PLAT → OBS (inbound) | `kubernetes_cluster.provisioned` | `kubernetes_clusters` | Manage IT infrastructure operations | medium |
| 766 | IPAAS → OBS (inbound) | `integration_run.failed` | `integration_runs` | Manage IT events and incidents | medium |
| 773 | VSDP → OBS (inbound) | `software_deployment.completed` | `software_deployments` | Manage software releases | medium |

Per the constraint #10 counting convention this is **one** Bucket 1 item (B1-H1), the table proposes 21 new candidates + acknowledges 1 already loaded.

| Finding type | Count |
|---|---|
| STRUCTURAL + BOUNDARY (B1-S1 to B1-S16) | 16 |
| APQC TAGGING bundle (B1-H1; 21 candidate rows inside) | 1 |
| **Bucket 1 total line items** | **17** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module split shape for OBS** | The catalog has no module set today (B1-S1). Three plausible shapes: (a) **3 modules**: OBS-APM (metrics + traces + dashboards), OBS-LOG-ANALYTICS (log_entries + saved searches + log retention), OBS-SLO-RELIABILITY (SLOs + error tracking + on-call hooks). (b) **2 modules**: OBS-TELEMETRY-PIPELINE (collection / indexing across metrics + logs + traces) + OBS-RELIABILITY-INSIGHTS (SLOs + error tracking + dashboards). (c) **1 module**: OBS-PLATFORM bundles everything. With 5 to 7 capabilities expected (B1-S2) the M2 rule requires ≥2 full modules under shape (a) and (b); (c) is a Rule #14 violation if capability_count ≥ 3. Vendor flagships (Datadog, Dynatrace, New Relic) market all three pillars (APM + log analytics + SLO) as distinct products with shared backplane, suggesting (a). Splunk markets logs as a separate product (Splunk Cloud Platform, LOG-MGMT candidate queued in `_missing-domains.md`). | Editorial / product-shape decision. | (a) 3 modules (recommended; mirrors flagship Datadog / Dynatrace / New Relic split). (b) 2 modules (telemetry vs reliability split). (c) 1 module (likely violates M2). |
| B2-S2 | **B9 attribution defects on events 6, 7, 115** | Three trigger_events whose `data_object_id` points at non-OBS masters are loaded on OBS outbound handoffs. Options below assume the handoffs are real OBS publishers (otherwise they'd be deleted altogether). | (a) DELETE handoffs 54, 56 from OBS; the publishers are ITOM (for `monitoring_alerts`) and AIOPS (for `anomaly_detections`). Event 115 `slo.breached` PATCH `data_object_id` from 47 → 91 (B1-S6). (b) OBS legitimately publishes derived alerts/anomalies; master the entities locally and demote the existing masters elsewhere to `embedded_master` (less likely). (c) Leave events as-is; tolerate the attribution defect (NOT recommended, fails Mode b2 substrate check). |
| B2-S3 | **B4 pattern flag positive re-evaluation per Rule #12** | The agent can propose but the workflow-shape decision is the user's. Specific proposals: `service_level_objectives.has_submit_lock=true` (published SLOs should freeze so error budgets aren't retroactively rewritten), `service_level_objectives.has_single_approver=true` (one SRE per SLO), `error_groups.has_single_approver=true` (one on-call per active group). `log_entries`, `metric_series`, `distributed_traces` are write-once telemetry; all three stay false. Should any of `error_groups.has_personal_content` be true if log_entries can carry user PII? | Pattern flags are workflow-shape judgments owned by the user; per Rule #15 recording the consideration in `notes` is forbidden. | Per-flag yes/no from user; the decisions are captured in this audit file (the approved persistence surface per Rule #15). |
| B2-S4 | **Rule #15 `skill_tools.notes` baseline confirmation** | The 7 existing `skill_tools` rows for skill 88 all carry `notes=''` (empty string). This is the Rule #15 default and matches policy. No action needed unless the user wants positive confirmation in this audit. | n/a (positive finding) | Confirm or note; no change required. |

### Bucket 3, Phase 0 pending (speculative)

The market-audit subagent was NOT spawned for this run (per the validate b1 prompt the analyst does flagship vendor research themselves; this section reflects the analyst's own pattern-matching against Datadog / Dynatrace / New Relic / Splunk Observability Cloud / Grafana / Honeycomb).

| ID | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-S1 | **Missing observability entities (vendor-surface candidates).** Likely missing masters that flagship observability vendors model: `dashboards` (Grafana, Datadog dashboards, New Relic dashboards as first-class), `monitors` (Datadog Monitor, New Relic Alert Policy as the configured rule, distinct from a fired alert), `synthetic_tests` (Datadog Synthetics, New Relic Synthetics; could route to DEM instead), `notification_policies` (escalation / paging routing, distinct from the channel; could route to IRM candidate), `service_inventory` (Datadog Service Catalog, the registered service-side metadata, distinct from CMDB service_maps), `runbooks` (PagerDuty / Datadog runbook annotations, could route to IRM), `incidents` (`obs_incidents` distinct from ITSM service_incidents; could route to IRM), `postmortems` (could route to IRM), `correlation_groups` (Datadog Correlated Incidents; partial overlap with AIOPS). The 5 currently-loaded masters (metric_series, log_entries, distributed_traces, SLOs, error_groups) are the **telemetry + reliability headline-noun set**; the workflow-substrate (configured rules, runbooks, incidents, postmortems, notifications, dashboards) is largely absent. | Spawn a Phase 0 vendor-research subagent against Datadog, Dynatrace, New Relic, Splunk Observability Cloud, Grafana Cloud, Honeycomb, output to `c:/tmp/OBS-phase0-2026-05-30.md`. Cross-check against the LOG-MGMT, IRM, and RUM candidates queued in `_missing-domains.md`: if those promote, several of the entities above route to those new markets instead of OBS. |
| B3-S2 | **Modularization hypothesis: split log analytics into LOG-MGMT, on-call/IRM/runbooks into IRM, real-user monitoring into RUM.** Splunk Cloud Platform, Sumo Logic, Elastic, Graylog all sell standalone log management as a category. PagerDuty, Opsgenie, incident.io sell on-call and incident response as a market. Datadog RUM, New Relic Browser, Akamai mPulse sell front-end real-user monitoring as distinct from server-side APM. The current OBS catalog risks bundling 3 to 4 markets into one if these splits aren't made. | Promote LOG-MGMT, IRM, RUM via human triage (candidates queued in `_missing-domains.md` this run). After promotion, repartition: log_entries master stays in OBS for tracing-attached logs but log retention / SIEM-style indexing moves to LOG-MGMT; incidents / postmortems / on-call_schedules / runbooks route to IRM; session_replays / page_loads route to RUM. |

### Cross-bucket dependencies

- B1-S1 (M1 module set) blocks B1-S14 (F2 system skill migration), B1-S16 (B10b backfill), and the M2/M4/M5/M6 cascade. Resolve B1-S1 first; the remaining structural items either gate on it or are mechanical PATCHes that can ship in parallel.
- B1-S2 (capabilities) depends on B2-S1 (module shape) because each capability gets attached to its realizing module via `domain_module_capabilities`.
- B1-S5 / B1-S6 / B1-S7 (B9 attribution defects) are independent of B2-S1 but depend on B2-S2 (the keep / delete / re-master decision).
- B1-S11 (aliases) and B1-S12 (lifecycle states) are independent of Bucket 3 but partially redundant if B3-S2 promotes LOG-MGMT / IRM / RUM (alias rows on `log_entries` and lifecycle on `error_groups` may move to those markets).
- B3-S2 (modularization hypothesis) cascades into B1-S1 (module shape) and B1-S10 (cross-domain relationships). If the user wants to defer the split until LOG-MGMT / IRM / RUM are promoted, B1-S1 should choose the conservative shape (1 to 2 modules, easier to refactor later) over (a) which prematurely splits inside OBS.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S2, H1-top10`), or `skip`.

- **S1 (M1 module set):** the structural blocker. Decide B2-S1 module shape first; S1 is the load step.
- **S2 (capabilities):** ships alongside S1.
- **S3 (catalog UX fields):** Rule #20 draft-then-surface flow; can ship after the module set.
- **S4 (event_category PATCH on 9 trigger_events):** trivial; mechanical PATCHes.
- **S5, S6, S7 (B9 attribution defects):** gated on B2-S2.
- **S8 (intra-domain relationships):** ships after S1 / S2 (modules give the lifecycle context).
- **S9 (`users` edges):** mechanical; ships any time.
- **S10 (cross-domain relationships):** partly gated on Bucket 3 (LOG-MGMT / IRM / RUM promotions reshape targets).
- **S11 (aliases):** mechanical; ships any time.
- **S12 (lifecycle states):** ships after S1 (states need `domain_module_id`).
- **S13 (pattern flags):** decided in B2-S3; PATCH after.
- **S14 (F2 legacy skill migration):** depends on S1.
- **S15 (F7 channel-vs-capability):** mechanical; ships any time.
- **S16 (B10b backfill):** runs after S1 lands.
- **H1 (APQC tagging, 21 candidate rows):** load all-at-once or in two batches (high-confidence first 14 + lower-confidence inbound 7)?

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (module split shape):** (a), (b), or (c)?
- **B2-S2 (B9 attribution defects on 3 events):** (a), (b), or (c)?
- **B2-S3 (pattern flags):** per-flag yes/no.
- **B2-S4 (Rule #15 skill_tools.notes confirmation):** confirm or pass.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** Will surface candidates when the subagent returns (if approved). Cross-cuts with `_missing-domains.md` triage of LOG-MGMT, IRM, RUM.

### Report-only follow-ups (owed by other domains)

These items the audit identifies but other domains own. They do NOT block OBS' green status; the user can choose to schedule audits on the named domains.

| ID | Owing domain | Finding | Routed to |
|---|---|---|---|
| RO-1 | AIOPS | 6 outbound OBS handoffs target AIOPS (608, 609, 610, 612, 613) plus inbound 606 (`alert_suppression_rule.activated`). AIOPS module-level `target_domain_module_id` is NULL on every row. | AIOPS b1 audit, B10b target side. |
| RO-2 | ITSM | 5 OBS to ITSM handoffs (55, 611, 614, 615, 618) plus the 2 ITSM-INCIDENT-MGMT DMDO consumer rows on OBS masters (already correct). Inbound `service_incidents correlates_to error_groups` (rel 194) and `service_slas aligns_with service_level_objectives` (rel 195) are ITSM's outbound B8 rows; OBS does not author them. | ITSM b1 audit, B8 outbound + B10b. |
| RO-3 | VSDP | 2 OBS to VSDP handoffs (616, 617). VSDP `target_domain_module_id` NULL. Inbound `software_deployment.completed` (handoff 773). | VSDP b1 audit, B10b target side + B8 outbound. |
| RO-4 | ITOM | OBS handoff 54 targets ITOM with NULL target module FK. Also OBS contributor edge on `monitoring_events` (ITOM-mastered) implies ITOM module needs to declare contributor/consumer awareness. | ITOM b1 audit, B10b + DMDO declaration. |
| RO-5 | NPMD, DEM, APIM, APP-PAAS, KUBE-PLAT, IPAAS | Each domain has 1 inbound handoff into OBS (651, 666, 749, 756, 760, 766). Each carries NULL `source_domain_module_id` AND NULL `target_domain_module_id`. Source side is each respective domain's B10b. Target side waits on OBS modules (B1-S1). | Each domain's b1 audit, B10b source side. |
| RO-6 | CMDB | OBS legacy `domain_data_objects` row declares `service_maps` (CMDB-mastered) as `consumer + required`. Once OBS modules exist (B1-S1), the consumer row migrates to `domain_module_data_objects` on the appropriate OBS module. CMDB's B10/M7 cross-cutting check should pick this up. | CMDB b1 audit, M7 within-domain (read-only, OBS is consumer not master). |
| RO-7 | ITSM (rels) | The 2 ITSM-published cross-domain relationships into OBS masters (rels 194 `service_incidents correlates_to error_groups`, 195 `service_slas aligns_with service_level_objectives`) are well-shaped. ITSM's B8 owns the outbound side; OBS does not duplicate them. | ITSM b1 audit (informational). |

Candidates queued in `audits/_missing-domains.md` this run: **LOG-MGMT**, **IRM** (bumped from 1 → 2), **RUM**. Total: 3 entries touched.

## 2026-05-31, Continuation: B1 technical fixes

Applied truly-technical Bucket-1 items where the audit pre-specified everything needed; deferred judgment calls and dependency-gated items.

### Applied

- **B1-S4 (B9 event_category enum backfill).** PATCHed `event_category` on all 9 OBS `trigger_events` (ids 636 to 644) per the explicit mapping in the prior audit and Rule #13 enum. Live verification confirms all 9 rows now carry the intended values (`threshold` x2, `signal` x6, `state_change` x1). Loader: [`.tmp_deploy/fix_obs_b1_technical_2026_05_31.ts`](../.tmp_deploy/fix_obs_b1_technical_2026_05_31.ts).
- **B1-H1 subset (APQC tagging, confident L4 only).** INSERTed 2 new `handoff_processes` rows for handoffs 611 and 618, both pointing at PCF 20903 "Triage IT service delivery incidents" (process_id 1299, single resolvable match). Both were pre-specified in the prior audit as `confident L4` with an explicit PCF external_id. Inserted with `role='implements'` (column default), `proposal_source='agent_curated'`, `record_status='new'` (Rule #1). New row ids: 561, 562. The 19 other candidate rows in the H1 bundle are NOT inserted, see "Deferred" below.

### Deferred

| Item | Reason |
|---|---|
| B1-S1 (module set) | New entities + modules; needs B2-S1 user decision on module-split shape. |
| B1-S2 (capabilities) | New entities, gated on B2-S1 (each capability attaches to its realizing module). |
| B1-S3 (catalog UX fields) | Rule #20 draft-then-surface flow; needs user review of buyer-voice text before write. |
| B1-S5 (event 6, 7 attribution defects) | Gated on B2-S2 user decision: delete handoffs vs re-master entities locally vs tolerate. |
| B1-S6 (event 115 attribution) | Same gating as B1-S5; the audit explicitly says "decision needed (Bucket 2 B2-S2)". |
| B1-S7 (handoff 611 payload-vs-source) | Audit says "Confirm the pattern is intentional, or PATCH"; user confirmation required. |
| B1-S8 (intra-domain `data_object_relationships`) | Audit names 6 candidate verbs but not the full edge tuples (`inverse_verb`, `relationship_type`, `relationship_kind`, `is_required`, `owner_side`); also gated on the B1-S1 module set for downstream context. |
| B1-S9 (`users` edges, Rule #10) | Audit lists 5 candidate verbs but not the full edge tuples; prompt requires user-edges Rule #10 to be pre-specified. |
| B1-S10 (cross-domain rels) | Partly gated on Bucket 3 (LOG-MGMT / IRM / RUM promotions) and on AIOPS / VSDP master-ownership confirmation. |
| B1-S11 (data_object_aliases) | Bulk vendor-alias inserts not pre-specified as exact tuples; the audit lists vendor synonyms but not the full row shape per alias. Prompt defer rule applies. |
| B1-S12 (lifecycle states) | Depends on B1-S1 modules (states need `domain_module_id`); per-master config-shape exemption is a user-surface decision per Rule #12. |
| B1-S13 (pattern flags) | B2-S3 is explicit-user-decision territory; the audit hands the flag flips to the user. |
| B1-S14 (legacy skill 88 migration) | Depends on B1-S1 modules existing first. |
| B1-S15 (F7 channel primitives) | User picks `notify_person` vs `notify_team` per row; audit lists both options. |
| B1-S16 (B10b backfill) | Vacuous until B1-S1 modules land. |
| B1-H1 remainder (19 of 21 candidate rows) | Either `medium` confidence in the audit (rows 54, 56, 606, 651, 666, 749, 756, 760, 766, 773), or the named PCF does not resolve to a single existing `processes` row by name (`Manage IT events and incidents`, `Manage IT infrastructure operations`, `Manage service levels and resolve operational issues`, `Manage software releases`, `Manage software development and deployment` all return zero matches when queried by exact name). Only the two `confident L4 + PCF 20903` rows met the prompt's "pre-specified `handoff_id` + resolvable PCF" bar. |

### Verification

- `GET /trigger_events?id=in.(636..644)`: 9 rows, all `event_category` now populated with the mapped enum values.
- `GET /handoff_processes?handoff_id=in.(611,618)`: 2 new rows (ids 561, 562), `process_id=1299`, `role='implements'`, `proposal_source='agent_curated'`, `record_status='new'`.

No JWT errors during the run.

UI spot-check:
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

- **Current footprint:** 0 `domain_modules`, 0 capabilities (A2), 0 regulations. 5 masters in legacy `domain_data_objects` rollup (88 `metric_series`, 89 `log_entries`, 90 `distributed_traces`, 91 `service_level_objectives`, 92 `error_groups`) + 1 consumer (`service_maps`, CMDB-mastered) + 1 contributor (`monitoring_events`, ITOM-mastered). 5 `solution_domains` rows, all `coverage_level=primary` (ServiceNow Cloud Observability, Datadog Platform, Dynatrace Platform, New Relic One, Splunk Observability Cloud). 14 outbound cross-domain handoffs (targets: AIOPS 6, ITSM 5, VSDP 2, ITOM 1) + 8 inbound (sources: AIOPS, NPMD, DEM, APIM, APP-PAAS, KUBE-PLAT, IPAAS, VSDP) = 22 cross-domain handoffs total. 1 legacy `skills` row `obs-system` (id 88) with `domain_id=7`, `domain_module_id=NULL`, 7 `skill_tools` rows (5 platform `query` + `send_email` platform + `post_chat_message` external); strict Semantius score 6/7 = 86%, operational identical. 2 `business_function_domains` (SRE owner, IT Operations contributor). 2 `data_object_relationships` rows touching OBS masters, both inbound (rel 194 `service_incidents correlates_to error_groups` ex-ITSM, rel 195 `service_slas aligns_with service_level_objectives` ex-ITSM); zero intra-OBS edges, zero `users` edges, zero outbound cross-domain edges. Zero `data_object_lifecycle_states`, zero `data_object_aliases`. 9 OBS `trigger_events` (ids 636 to 644), all with `event_category` populated by the 2026-05-31 Continuation (B9 enum hygiene now passes). 18 `handoff_processes` rows across 18 of the 22 cross-domain handoffs (4 untagged: 614, 615, 616, 617). All 18 tagged rows are `proposal_source=agent_curated`, `record_status=new`; zero `approved`.
- **Vendor-surface basis:** Datadog Platform, Dynatrace Platform, New Relic One, Splunk Observability Cloud, Grafana Cloud, Honeycomb. The set anchors the analyst's pattern-matching against the 2026-05-30 audit's flagship surface. No subagent spawn this run (this is the structural Validate b1 pass).
- **Bucket 1 (in-scope, agent fixable):** 16 items (15 structural / boundary + 1 APQC TAGGING bundle covering the 4 untagged handoffs).
- **Bucket 2 (surface-for-user, judgment):** 4 items (all carried forward from 2026-05-30 unresolved).
- **Bucket 3 (Phase 0 pending, speculative):** 2 items (entity-surface gaps + modularization hypothesis, both carried forward).

**Pass-by-pass band table.**

| Band | ID | Result |
|---|---|---|
| A | A1 | PASS (`crud_percentage=15`, `business_logic` set, `min_org_size`, `cost_band=$$$$`, market size 8000m / 2025) |
| A | A2 | FAIL (0 `capability_domains` rows) |
| A | A3 | PASS (5 solutions, all primary) |
| A | A4 | FAIL (`catalog_tagline=""`, `catalog_description=""`) |
| A | A5 | SKIP (opt-in only) |
| M | M1 | FAIL HARD (0 `domain_modules`; blocker, collapses M2 / M4 / M5 / M6 / M8, F2 / F3 / F5, E1 to E6, B9b, B10b-source side) |
| M | M2 | VACUOUS (M1 blocks) |
| M | M4 | VACUOUS (M1 blocks) |
| M | M5 | VACUOUS (no lifecycle states authored) |
| M | M6 | VACUOUS (M1 blocks) |
| M | M7 | PASS (5 OBS masters have exactly one `master` row each; no within-domain incoherence because there are no modules) |
| M | M8 | VACUOUS (M1 blocks) |
| B | B5 | PASS (no `embedded_master` rows owed by OBS; the 1 consumer + 1 contributor reference foreign masters that exist) |
| B | B7 | FAIL (0 `users` edges on the 5 OBS masters; Rule #10 violation. SLO owner, error_group assignee, dashboard author, runbook owner missing) |
| B | B9 | PARTIAL FAIL (9 events with valid `event_category` per 2026-05-31 Continuation, BUT 3 trigger_events on OBS-published handoffs still attribute to non-OBS masters: event 6 → `monitoring_alerts` 85, event 7 → `anomaly_detections` 94, event 115 → `service_incidents` 47) |
| B | B9b | VACUOUS (M1 blocks, no cross-module surface) |
| B | B10b | FAIL (every one of the 22 cross-domain handoffs has `source_domain_module_id=NULL`; 9 of 14 outbound carry NULL `target_domain_module_id`; 8 of 8 inbound have NULL `target_domain_module_id` because OBS has no modules) |
| B | B11 | FAIL (0 `data_object_aliases` rows on the 5 OBS masters) |
| B | B12 | FAIL (0 `data_object_lifecycle_states` for all 5 OBS masters; per Rule #12 a positive decision is required per master — SLO + error_groups workflow-bearing, 3 time-series config-shape) |
| C | C1 | PASS (1 owner SRE + 1 contributor IT Operations) |
| C | C2 | PASS (no diverging capabilities to override) |
| D | D1 | PASS (the live state surfaced here matches the link target the audit will append at the bottom) |
| E | E1 | VACUOUS (M1 blocks; no modules to bundle into roles) |
| E | E2 | VACUOUS (M1 blocks) |
| E | E3 | VACUOUS (M1 blocks) |
| E | E4 | VACUOUS (M1 blocks) |
| E | E5 | VACUOUS (M1 blocks) |
| F | F1 | FAIL (legacy `obs-system` skill 88 lives at domain grain; per Rule #17 every `domain_modules` row needs exactly one `skill_type=system`. F1 is transitional-acceptable ONLY when no module-level system skill exists, which is the current state, BUT M1 blocks authoring the module-level replacements) |
| F | F2 | VACUOUS (M1 blocks) |
| F | F3 | VACUOUS (no module-level skill yet; the legacy skill 88 has 7 `skill_tools` rows so would pass numerically) |
| F | F4 | PASS (the 7 linked tools have valid `operation_kind` ↔ `data_object_id` pairings: 5 `query` rows with `data_object_id` set, 2 `side_effect` rows with `data_object_id=NULL`) |
| F | F5 | UNCOMPUTABLE per-module (F2 vacuous); legacy domain-grain skill has strict 6/7 = 86%, operational 6/7 = 86%, gap entirely on `post_chat_message.coverage_tier=external` |
| F | F7 | FAIL (`send_email` + `post_chat_message` linked as required channel primitives with empty `notes`; per § "Channel vs capability authoring rule" the generic-notification case routes to `notify_person` / `notify_team`) |
| H | H1 | PARTIAL FAIL (provenance: 18/22 = 82% `agent_curated` coverage, above the 0.5N to 0.8N target band; quality: 0/22 `approved`. Untagged: 614 / 615 / 616 / 617) |

### Delta since 2026-05-30 + 2026-05-31 Continuation

- B9 enum hygiene: from 9/9 invalid to 9/9 valid (resolved by 2026-05-31 Continuation; previously B1-S4).
- H1 coverage: from 1/22 = 4.5% to 18/22 = 82% `agent_curated`. The deferred-19 from the Continuation was largely closed by later loaders (16 of the 19 picked up tags this audit reads). Remaining: 614, 615, 616, 617.
- Nothing else changed: the structural M-band / B-band / F-band gaps from 2026-05-30 are unchanged. M1 still blocks.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 (blocker) | OBS has zero `domain_modules` rows (both as primary host AND via `domain_module_host_domains`). Blocks M2/M4/M5/M6/M8, F2/F3/F5, E1 to E6, B9b, B10b-source side. ITSM-INCIDENT-MGMT module 38 already declares 91 + 92 as consumers on OBS masters, proving the deploy contract surface is being consumed downstream. | Author the OBS module set after B2-S1 decision lands. The 5 existing masters get `role=master` rows on their respective new modules. Then S6 to S14 below become unblocked. |
| B1-S2 | A2 (0 capabilities) | `capability_domains` is empty for domain_id=7. Phase A expectation is 5 to 8. | Draft 5 to 7 capabilities (e.g. metric collection, log indexing, distributed tracing, SLO tracking, error tracking, dashboarding, auto-instrumentation), link via `capability_domains` + `domain_module_capabilities` once modules exist. |
| B1-S3 | A4 (catalog UX empty) | `domains.catalog_tagline` and `domains.catalog_description` are empty strings. Rule #20 requires buyer-voice draft, surfaced to user BEFORE write. | Draft tagline + 1 to 3 paragraph description in buyer voice, surface for approval, then PATCH. |
| B1-S4 | B9 attribution defect (event 6, monitoring_alert.threshold_breached) | Trigger event 6 publishes via OBS handoff 54 but its `data_object_id=85` (monitoring_alerts, ITOM-mastered). Source-not-OBS. | Decision per B2-S2. Most likely: DELETE handoff 54 from OBS (ITOM owes the outbound) OR re-master `monitoring_alerts` locally on OBS. |
| B1-S5 | B9 attribution defect (event 7, anomaly_candidate.detected) | Trigger event 7 publishes via OBS handoff 56 but its `data_object_id=94` (anomaly_detections, AIOPS-mastered). Source-not-OBS. | Decision per B2-S2. Most likely: DELETE handoff 56 (AIOPS owes the outbound). |
| B1-S6 | B9 attribution defect (event 115, slo.breached) | Trigger event 115 publishes via OBS handoff 55 with `data_object_id=47` (service_incidents, ITSM-mastered). The SLO breach is OBS-published; the event should attribute to 91 (`service_level_objectives`). The handoff payload itself (creating a service incident on the ITSM side) may be legitimate. | PATCH `trigger_events.id=115` `data_object_id=47 to 91`. Keep handoff 55 as-is (the handoff payload IS the service_incident on the target). |
| B1-S7 | B10b NULL `source_domain_module_id` on every cross-domain handoff | All 14 outbound + 8 inbound cross-domain handoffs carry `source_domain_module_id=NULL` on OBS' side (14 outbound = OBS-owed). Vacuous until B1-S1 modules land. | After B1-S1: backfill via the standard pattern, deriving source module from `trigger_events.data_object_id` ↦ strongest `domain_module_data_objects.role` match. |
| B1-S8 | B6 zero intra-domain `data_object_relationships` | No edges among 88/89/90/91/92. Expected: `metric_series correlates_to error_groups`, `distributed_traces correlates_to error_groups`, `metric_series tracks service_level_objectives`, `log_entries surfaces error_groups`, `distributed_traces produces log_entries`, `metric_series feeds service_level_objectives`. | Draft 6 intra-domain edges (verb / inverse_verb / relationship_type / relationship_kind / is_required / owner_side); load via cluster-drafts pattern. Edge tuples NOT pre-specified — surface to user for review before insert. |
| B1-S9 | B7 zero `users` edges (Rule #10) | No edges between 88/89/90/91/92 and `users` (id 748). Every workflow-bearing master has a user actor (SLO owner, error_group assignee, dashboard author, runbook owner, saved-search owner). | Draft 5+ edges; load. Edge tuples NOT pre-specified. |
| B1-S10 | B8 missing cross-domain `data_object_relationships` (outbound) | 14 outbound cross-domain handoffs, 0 outbound `data_object_relationships` rows. Missing: `error_groups creates service_incidents` (handoffs 618, 611), `service_level_objectives spawns service_incidents` (614, 615, 55), `error_groups correlates_to releases` (616, 617 to VSDP), `metric_series feeds anomaly_detections` (608, 609 if AIOPS owns), `distributed_traces feeds anomaly_detections` (612, 613). | Draft 6 outbound edges; load. Some rows partly gated on Bucket 3 modularization-shape outcome. |
| B1-S11 | B11 zero `data_object_aliases` | None of the 5 OBS masters carry aliases. Vendor synonyms: `metric_series ↔ Datadog metric / Prometheus time series / New Relic metric event`, `log_entries ↔ Splunk event / Sumo message`, `distributed_traces ↔ Honeycomb event chain / Datadog trace span`, `service_level_objectives ↔ Honeycomb SLO / Nobl9 SLI`, `error_groups ↔ Sentry issue / Rollbar item / Datadog error issue`. | Draft 8 to 12 alias rows. Tuples NOT pre-specified. |
| B1-S12 | B12 zero `data_object_lifecycle_states` (Rule #12) | None of the 5 OBS masters carry lifecycle states. Per-master expected: `service_level_objectives` (draft / active / archived), `error_groups` (new / triaging / resolved / regressed). `metric_series` / `log_entries` / `distributed_traces` are config-shape time-series and may exempt per Rule #12. | After B1-S1 modules land (states need `domain_module_id`): author SLO + error_groups state machines with `requires_permission` flags. For the 3 time-series masters surface the config-shape exemption in this audit (Rule #15 forbids `data_objects.notes` annotation). |
| B1-S13 | B4 pattern flags re-evaluation per Rule #12 | All 5 masters at `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Per-master proposals: `service_level_objectives.has_submit_lock=true` (published SLOs should freeze so error budgets are auditable), `service_level_objectives.has_single_approver=true` (one SRE owner), `error_groups.has_single_approver=true` (one on-call owner per active group). | B2-S3 picks per flag. PATCH after. |
| B1-S14 | F1 legacy domain-grain system skill (Rule #17) | Skill 88 `obs-system` carries `domain_id=7`, `domain_module_id=NULL`. Per Rule #17 every `domain_modules` row needs exactly one `skill_type=system`. Vacuous until B1-S1 modules land; then the legacy skill is retired or migrated. | After B1-S1: re-author one `skills` row per `domain_modules` row with `skill_name=<module_code_lower>_agent`, link the 7 existing `skill_tools` rows to the appropriate module's skill, DELETE legacy skill 88. |
| B1-S15 | F7 channel primitives without justification | `skill_tools` rows for skill 88 link `send_email` (37) and `post_chat_message` (40) as `required` with empty `notes`. Per the channel-vs-capability authoring rule the generic-notification case routes to `notify_person` / `notify_team`. Strict Semantius score drag is entirely on `post_chat_message.coverage_tier=external`; `send_email` is platform-covered. | PATCH the two `skill_tools` rows to point at `notify_person` (single recipient, e.g. SLO owner alert) and/or `notify_team` (broadcast on-call channel). If the abstraction tools are platform-covered, this also flips F5 to 100%. |

#### APQC TAGGING

22 cross-domain handoffs total. Coverage as queried this run: 18 tagged (provenance: 18 `agent_curated`, 0 `human_curated`, 0 `discovery_substring`; quality: 0 `approved`, 18 `new`). Volume above the 0.5N to 0.8N target band. **Untagged: 4 handoffs (614, 615, 616, 617).**

| handoff_id | source → target | trigger_event | payload | Proposed PCF (process_name / external_id / id) | Confidence |
|---|---|---|---|---|---|
| 614 | OBS → ITSM | `service_level_objective.burn_rate_high` | `service_level_objectives` | "Develop and manage IT service levels" (20632 / id 256, L3) OR "Triage IT service delivery incidents" (20903 / id 1299, L4) | medium L3 / confident L4 (depending on whether burn-rate is service-level review or incident triage). Lean L4 — the burn-rate alert triggers an incident on ITSM. |
| 615 | OBS → ITSM | `service_level_objective.budget_exhausted` | `service_level_objectives` | "Triage IT service delivery incidents" (20903 / id 1299, L4) | confident L4 (mirrors handoff 55 already tagged 1299). |
| 616 | OBS → VSDP | `error_group.new_signature` | `error_groups` | "Implement software change/release" (20853 / id 1262, L4) — same as inbound 773 — OR a hotfix-flavored child if one resolves | medium L4. New error signature triggers a hotfix change/release on VSDP. |
| 617 | OBS → VSDP | `error_group.regression_detected` | `error_groups` | "Implement software change/release" (20853 / id 1262, L4) | medium L4 — regression triggers a hotfix change. |

Per the counting convention this is ONE Bucket 1 item (B1-H1) covering 4 candidate rows.

| Finding type | Count |
|---|---|
| STRUCTURAL + BOUNDARY (B1-S1 to B1-S15) | 15 |
| APQC TAGGING bundle (B1-H1; 4 candidate rows inside) | 1 |
| **Bucket 1 total line items** | **16** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | Module split shape for OBS | The catalog has no module set today. Three plausible shapes carried forward from 2026-05-30: (a) 3 modules (OBS-APM, OBS-LOG-ANALYTICS, OBS-SLO-RELIABILITY; mirrors flagship Datadog / Dynatrace / New Relic split), (b) 2 modules (OBS-TELEMETRY-PIPELINE + OBS-RELIABILITY-INSIGHTS), (c) 1 module (likely violates M2 if capability_count ≥ 3). Editorial / product-shape decision. | (a) 3 modules, (b) 2 modules, (c) 1 module. |
| B2-S2 | B9 attribution defects on events 6, 7, 115 | Three trigger_events on OBS-published handoffs attribute to non-OBS masters. | (a) DELETE handoffs 54 (event 6, monitoring_alerts ITOM-owned) and 56 (event 7, anomaly_detections AIOPS-owned); PATCH event 115 `data_object_id` 47 → 91 (keep handoff 55, payload is the resulting incident). (b) Master `monitoring_alerts` and/or `anomaly_detections` locally on OBS, demote the existing masters elsewhere to `embedded_master` (unlikely). (c) Leave as-is (NOT recommended; fails substrate sanity). |
| B2-S3 | B4 pattern flag positive re-evaluation per Rule #12 | Workflow-shape decision belongs to user. Proposals: `service_level_objectives.has_submit_lock=true`, `service_level_objectives.has_single_approver=true`, `error_groups.has_single_approver=true`. `log_entries` / `metric_series` / `distributed_traces` stay false (write-once telemetry). Open question: should any of `log_entries.has_personal_content` be true if log_entries can carry user PII? | Per-flag yes / no from user, captured in this audit per Rule #15. |
| B2-S4 | Rule #15 baseline confirmation on `skill_tools.notes` | The 7 existing `skill_tools` rows for skill 88 carry `notes=''` (default, matches policy). Positive finding. | Confirm or pass; no change required. |

### Bucket 3, Phase 0 pending (speculative)

No subagent spawn this run. The candidate set is carried forward verbatim from 2026-05-30.

| ID | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-S1 | Missing observability entities (vendor-surface candidates): `dashboards`, `monitors`, `synthetic_tests`, `notification_policies`, `service_inventory`, `runbooks`, `obs_incidents`, `postmortems`, `correlation_groups`. The 5 currently-loaded masters are the telemetry + reliability headline-noun set; the workflow substrate (configured rules, runbooks, incidents, postmortems, notifications, dashboards) is largely absent. | Datadog Platform, Dynatrace Platform, New Relic One, Splunk Observability Cloud, Grafana Cloud, Honeycomb | Spawn Phase 0 subagent against flagships, output to `c:/tmp/OBS-phase0-2026-05-31.md`. Cross-check against LOG-MGMT / IRM / RUM candidates in `_missing-domains.md`: if those promote, several entities route to those new markets. |
| B3-S2 | Modularization hypothesis: split log analytics into LOG-MGMT (Splunk Cloud Platform, Sumo Logic, Elastic, Graylog), incident response into IRM (PagerDuty, Opsgenie, incident.io), real-user monitoring into RUM (Datadog RUM, New Relic Browser, Akamai mPulse). The current catalog risks bundling 3 to 4 markets if these splits aren't made. | Same flagship set + standalone market leaders for each split | Promote LOG-MGMT / IRM / RUM via human triage from `_missing-domains.md`. After promotion repartition: log_entries master stays in OBS for tracing-attached logs but indexing / SIEM-style retention moves to LOG-MGMT; incidents / postmortems / on-call_schedules / runbooks route to IRM; session_replays / page_loads route to RUM. |

### Cross-bucket dependencies

- B1-S1 (module set) blocks B1-S7 (B10b backfill), B1-S12 (lifecycle states need `domain_module_id`), B1-S14 (F1 legacy skill migration). Cascade: M2 / M4 / M5 / M6 / M8 / F2 / F3 / F5 / E1 to E6.
- B1-S2 (capabilities) depends on B2-S1 (each capability attaches to its realizing module via `domain_module_capabilities`).
- B1-S4 / B1-S5 / B1-S6 (B9 attribution defects on events 6 / 7 / 115) gate on B2-S2.
- B1-S10 (outbound cross-domain rels) partly gated on B3-S2 (LOG-MGMT / IRM / RUM promotions may reshape targets).
- B1-S11 (aliases) and B1-S12 (lifecycle states) partially redundant if B3-S2 promotes new markets (alias rows on `log_entries` may migrate to LOG-MGMT; lifecycle on `error_groups` may migrate to IRM).
- B3-S2 (modularization hypothesis) cascades into B1-S1 (module shape) — the user may want to defer B1-S1 until LOG-MGMT / IRM / RUM are promoted, OR pick the conservative 1- to 2-module shape so refactor cost stays low.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with `all`, list (e.g. `S6, H1`), or `skip`.

- S1 (M1 module set): structural blocker. Decide B2-S1 first; S1 is the load step.
- S2 (capabilities): ships alongside S1.
- S3 (catalog UX): Rule #20 draft-then-surface flow.
- S4 / S5 / S6 (B9 attribution defects on events 6 / 7 / 115): gated on B2-S2. S6 is the only one with a fully pre-specified PATCH (`data_object_id` 47 → 91).
- S7 (B10b backfill): vacuous until S1.
- S8 (intra-domain rels): ships after S1; edge tuples need user surface first.
- S9 (`users` edges): mechanical; ships any time after edge tuples are confirmed.
- S10 (outbound cross-domain rels): partly gated on Bucket 3.
- S11 (aliases): mechanical; bulk insert after user confirms alias surface.
- S12 (lifecycle states): after S1.
- S13 (pattern flags): decided in B2-S3; PATCH after.
- S14 (F1 legacy skill migration): after S1.
- S15 (F7 channel primitives): mechanical; ships any time. Pick `notify_person` vs `notify_team` per row.
- H1 (4 untagged handoffs): load 615 immediately (confident L4 mirrors 55); 614 / 616 / 617 surface for user confirmation on the PCF choice.

**Bucket 2, what's your call on each?** Per-item answer required before B1-S1 / B1-S4 / B1-S5 / B1-S6 / B1-S13 unblock.

**Bucket 3, vet via Phase 0 research or eyeball-mode?** Will spawn the subagent only on user approval. Cross-cuts with `_missing-domains.md` triage of LOG-MGMT / IRM / RUM.

### Report-only follow-ups (owed by other domains)

| ID | Owing domain | Finding | Routed to |
|---|---|---|---|
| RO-1 | AIOPS | 6 outbound OBS to AIOPS handoffs (608, 609, 610, 612, 613) + inbound 606 (`alert_suppression_rule.activated`). Every row has NULL `source_domain_module_id` (OBS-owed) AND NULL `target_domain_module_id` (AIOPS-owed). | AIOPS b1, B10b target side. |
| RO-2 | ITSM | 5 OBS to ITSM handoffs (55, 611, 614, 615, 618). The 2 ITSM-INCIDENT-MGMT DMDO consumer rows on OBS masters (91, 92) are already correct. Inbound rel 194 (`service_incidents correlates_to error_groups`) and rel 195 (`service_slas aligns_with service_level_objectives`) are ITSM's B8 outbound rows; OBS does not author them. | ITSM b1, B10b + B8 outbound (already passes). |
| RO-3 | VSDP | 2 OBS to VSDP handoffs (616, 617); VSDP `target_domain_module_id` NULL. Inbound 773 (`software_deployment.completed`). | VSDP b1, B10b target side + B8 outbound. |
| RO-4 | ITOM | OBS handoff 54 targets ITOM with NULL `target_domain_module_id`. OBS contributor edge on `monitoring_events` (ITOM-mastered) implies ITOM module needs to declare contributor / consumer awareness. | ITOM b1, B10b + DMDO declaration. |
| RO-5 | NPMD / DEM / APIM / APP-PAAS / KUBE-PLAT / IPAAS | Each has 1 inbound handoff into OBS (651 / 666 / 749 / 756 / 760 / 766) with NULL `source_domain_module_id` (each domain's B10b source side). Target side waits on OBS modules (B1-S1). | Each domain's b1, B10b source side. |
| RO-6 | CMDB | OBS legacy `domain_data_objects` row declares `service_maps` (CMDB-mastered) as `consumer + required`. Once OBS modules exist the row migrates to `domain_module_data_objects` on the appropriate OBS module. | CMDB b1, M7 within-domain (informational; OBS is consumer). |

JWT errors during the run: none.

UI spot-check:
- https://tests.semantius.app/domain_map/domain_modules (verify OBS still has zero rows)
- https://tests.semantius.app/domain_map/capability_domains (verify zero for domain_id=7)
- https://tests.semantius.app/domain_map/handoff_processes (verify 18 OBS-touching rows)
- https://tests.semantius.app/domain_map/trigger_events (verify 9 OBS events with valid `event_category`)

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

State-driven Validate-mode pass over the OBS state.yaml open items only (no fresh
from-scratch audit). Live re-verification (domain id=7) confirmed OBS is still
UNBUILT: 0 `domain_modules` (M1 hard fail), 0 `capability_domains`. Per the unbuilt
rule the agent did NOT scaffold the module set; the build is surfaced as B2-S1 and
the entire module-dependent cascade is left until it lands. Agent-doable
additive/corrective work that is NOT module-dependent was executed. The snapshot was
stale on two counts, corrected here: handoffs 614 and 615 are now already tagged
(`handoff_processes` rows 1152, 1153 -> PCF 1299), so B1A-H1-S615 and the 614 half of
B1B-H1 are done; and `business_function_domains` already carries 2 rows (owner = Site
Reliability Engineering bf 61, contributor = IT Operations bf 27), so C1 needs nothing.

### Executed (additive/corrective, all rows record_status='new')

- **entity_type classification (5 masters).** All 5 OBS masters were `unclassified`.
  PATCHed per Rule #12 enum, deterministic from workflow shape: `metric_series` (88),
  `log_entries` (89), `distributed_traces` (90) -> `operational_record` (append-only,
  write-once time-series telemetry, no workflow); `service_level_objectives` (91),
  `error_groups` (92) -> `operational_workflow` (real-world objects with lifecycles).
  Loader: `.tmp_deploy/fix_obs_state_driven_2026_06_07.ts`.
- **Catalog UX backfill (Rule #20), domains row.** `domains.catalog_tagline` and
  `domains.catalog_description` were both empty; authored buyer-voice copy (workflow +
  value, no vendor names, no em-dash, American English) and wrote both straight into
  the empty columns. No module-grain catalog copy was written because OBS has 0
  `domain_modules`. Same loader.
- **Aliases / B11 (7 rows).** Inserted clearly-generic synonyms (`alias_type='synonym'`,
  `notes` omitted per Rule #15, no vendor/product names per Rule #18) on the 3 masters
  that stay in OBS regardless of the B3-S2 promotion outcome: `metric_series` 88
  ("time series", "metric"); `distributed_traces` 90 ("trace", "span");
  `service_level_objectives` 91 ("SLO", "service level indicator", "SLI"). Aliases on
  `log_entries` (89, -> LOG-MGMT risk) and `error_groups` (92, -> IRM risk) were
  DEFERRED because their B3-S2 migration dependency makes them potentially misplaced
  work today. Loader: `.tmp_deploy/fix_obs_aliases_2026_06_07.ts`. New row ids 1528-1534.

### Surfaced (returned to user; not executed)

- **B2-S1 (BUILD / module split shape).** OBS is unbuilt; this decision gates the
  whole build and its cascade (capabilities, lifecycle states, B10b backfill,
  relationships, the domain-grain system skill toolset, Phase P personas + RACI).
- **B2-S2 (B9 attribution defects, events 6 / 7 / 115).** DESTRUCTIVE: recommended fix
  DELETEs handoffs 54 and 56 and re-attributes trigger_event 115 (`data_object_id`
  47 -> 91). Recommended only; not applied.
- **B2-S3 (pattern flags).** DESTRUCTIVE: flipping a flag overwrites an existing false
  on the two workflow masters (91, 92). Recommended values surfaced; not applied.
- **B2-APQC-616-617 (APQC tag for the last 2 untagged cross-domain handoffs).** 616 and
  617 (both OBS -> VSDP) are the only 2 of 22 still untagged; candidate PCF 1262
  "Implement software change/release" is medium-confidence, held for the user's PCF pick.
- **Personas / RACI (Phase P).** DEFERRED; not authored. Folds into the B2-S1 build
  (only applies if the build is multi-module). Candidate personas: SRE / on-call
  engineer (SLO owner, error_group assignee), platform / observability engineer.

### Left (untouched)

- **Unbuilt cascade:** module set, capabilities, lifecycle states, B10b handoff-module
  backfill, intra/cross-domain + users relationships, domain-grain system skill toolset.
  All left until B2-S1 build lands (do-not-scaffold rule).
- **B1B-S11 remainder:** `log_entries` (89) and `error_groups` (92) aliases deferred
  pending B3-S2 (LOG-MGMT / IRM promotion may relocate them).
- **Superseded (2026-06-06 / Plan 3):** B1B-S14, B1B-S15, B2-S4 (per-module skill grain
  + `skill_tools` model). CANCELED; `skill_tools` is dropped. No action.
- **b3 backlog:** B3-S1 (missing observability substrate entities), B3-S2
  (modularization hypothesis; reclassified as informing the B2-S1 shape).
- **Report-only owed by other domains:** RO-1..RO-6 (AIOPS, ITSM, VSDP, ITOM, the 6
  inbound-source domains, CMDB). Do not block OBS.

### Verification

- `GET /data_objects?id=in.(88,89,90,91,92)`: all 5 `entity_type` populated as intended.
- `GET /domains?id=eq.7`: `catalog_tagline` + `catalog_description` non-empty, `record_status='new'`.
- `GET /data_object_aliases?data_object_id=in.(88,89,90,91,92)`: 7 rows, `alias_type='synonym'`, `record_status='new'`.

No JWT errors during the run.

UI spot-check:
- https://tests.semantius.app/domain_map/data_objects (entity_type on the 5 OBS masters)
- https://tests.semantius.app/domain_map/domains (OBS catalog_tagline + catalog_description)
- https://tests.semantius.app/domain_map/data_object_aliases (7 new OBS synonym rows)
