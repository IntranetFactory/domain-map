---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 28
---

# ITOM, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 4 mastered `data_objects` (monitoring_events, monitoring_alerts, monitoring_policies, capacity_records) + 1 contributor (service_incidents on ITSM), 7 `trigger_events`, 4 outbound and 9 inbound cross-domain handoffs, 0 `domain_modules`, 0 `domain_module_data_objects`, 1 intra-domain `data_object_relationships` row (none between ITOM masters), 0 `data_object_lifecycle_states`, 0 `data_object_aliases`, 0 `domain_regulations`, 0 `domain_aliases`, 0 module-anchored system skills (1 legacy domain-level skill `itom-system` at `skills.id=74` with 6 `skill_tools` rows), 0 roles in `role_modules` (cannot exist without modules), 6 capability links across `capability_domains`.
- Vendor-surface basis (flagship vendors enumerated for the semantic pass): ServiceNow IT Operations Management (Event Mgmt, Service Mapping, Cloud Insights), BMC Helix Operations Management, Micro Focus / OpenText Operations Bridge (OBM), IBM Tivoli Monitoring / Instana Infra, Datadog Infrastructure Monitoring, BMC Control-M (workload automation reference for the job-sched capability), Rundeck (runbook automation reference). Compliance overlay is light, primary controls overlap with SOC 2 availability and ISO 20000.
- **Bucket 1 (in-scope, agent fixable):** 18 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 5 items.
- Candidates queued in `audits/_missing-domains.md`: 3 new (ITPA, WORKLOAD-AUTO, NPM).

### Pass 1, Structural

#### S-band coverage sweep

**S1, direct FKs to `domains`.**

| Table | FK column | ITOM rows | Expected non-zero? |
| --- | --- | --- | --- |
| `domain_data_objects` | `domain_id` | 5 | yes (PASS) |
| `solution_domains` | `domain_id` | 1 | yes (PASS, but thin, A3 borderline) |
| `business_function_domains` | `domain_id` | 2 | yes (PASS) |
| `capability_domains` | `domain_id` | 6 | yes (PASS) |
| `domain_regulations` | `domain_id` | 0 | optional |
| `domains.parent_domain_id` | `parent_domain_id` | 0 (no sub-domains) | optional |
| `handoffs.source_domain_id` | `source_domain_id` | 4 | yes (PASS) |
| `handoffs.target_domain_id` | `target_domain_id` | 9 | yes (PASS) |
| `skills.domain_id` | `domain_id` | 1 (legacy domain-level) | yes (but routes to F1 fail since module is null) |
| `domain_modules.domain_id` | `domain_id` | 0 | yes (FAIL, M1, BLOCKING) |
| `domain_module_host_domains.domain_id` | `domain_id` | 0 | only if cross-cutting hosts |
| `domain_aliases.domain_id` | `domain_id` | 0 | optional |

**S2, indirect-table per-module coverage.** Not runnable: zero modules exist (M1 blocks). Every per-module FK on `domain_module_data_objects`, `domain_module_capabilities`, `domain_module_host_domains` is therefore zero for ITOM, and all cross-domain handoffs leaving or entering ITOM have null per-module FKs on the ITOM side (B10b).

**S3, per-master indirect coverage.**

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| monitoring_events (84) | 0 | 3 (52, 53, 78) | 0 |
| monitoring_alerts (85) | 0 | 1 (6) | 0 |
| monitoring_policies (86) | 0 | 1 (45) | 0 |
| capacity_records (87) | 0 | 2 (634, 635) | 0 |

Every master has zero lifecycle states (B12 fail across the board) and zero aliases (B11 fail). All four masters have observable transitions whose verbs are not encoded as `data_object_lifecycle_states` rows with `requires_permission=true`.

#### Band-level findings

- **A1 PASS-WITH-DEFECT** for `crud_percentage=60`, `min_org_size=30 m <2500`, `cost_band=$$$$`, `usa_market_size_usd_m=8000`, `market_size_source_year=2025`, `business_logic` populated, `certification_required=false`. **BUT** `business_logic` contains a U+2014 em-dash (CLAUDE.md violation): "Event management, capacity calculations, and topology-aware impact analysis [EM-DASH] engine-led; service-mapping master data is the smaller part." Surface as `B1-S1` PATCH.
- **A2 PASS** 6 `capability_domains` rows: ITOM-INFRA-MON, ITOM-EVENT-MGT, ITOM-LOG, ITOM-JOB-SCHED, ITOM-CAPACITY, ITOM-RUNBOOK.
- **A3 PASS-BORDERLINE** 1 solution (ServiceNow IT Operations Management, primary). The audit recipe expects >=3 solutions with >=1 primary; ITOM has 1. Vendor surface easily supports 3-5: BMC Helix Operations Management, OpenText Operations Bridge, Datadog Infrastructure Monitoring, IBM Instana, Dynatrace Davis. Surface as `B1-S2`.
- **A4 FAIL** both `catalog_tagline` and `catalog_description` are empty strings. Surface as `B1-S3` draft-and-review per Rule #20.
- **A5** not run, vendor refresh opt-in only.
- **M1 FAIL (BLOCKING)** zero `domain_modules` rows. Six capabilities live on the domain with no realizing module, every downstream band is degraded. Surface as `B1-S4` (modularization plan), the most consequential single fix on this audit.
- **M2** with capability count = 6, the >=2 modules floor applies; cannot be checked until M1 lands. Subsumed under `B1-S4`.
- **M4-M7** unrunnable on the module dimension: no modules exist. **BUT** M7 has a catalog-wide hard fail orthogonal to M1 (see below).
- **M7 FAIL (catalog-wide hard fail)** `monitoring_alerts` (id 85) and `monitoring_policies` (id 86) each have a `role='master'` row in `domain_data_objects` for BOTH ITOM (id 2) AND RMM (id 130, Remote Monitoring and Management). Two masters per data_object catalog-wide breaks the deployer / blueprint emitter. RMM has zero `domain_modules` rows of its own, so the conflict is at the legacy-rollup layer only; the fix nonetheless requires picking a canonical owner. Surface as `B2-S1` (judgment call).
- **B1 PASS** 4 master rows.
- **B2 PASS** every master has singular_label and plural_label populated. Note: the labels `Event` / `Alert` are unprefixed even though the data_object names carry the `monitoring_` prefix. Cosmetic only, no rule fails.
- **B3 PASS** every master is prefixed (no bare-word), `is_canonical_bare_word=false`, no rationale required.
- **B4 FAIL** every master has all three pattern flags `false` by default; no positive audit re-evaluation has happened. Plausibly: `monitoring_policies` has `has_submit_lock=true` (policy version commits are typically immutable after activation), `monitoring_alerts` has `has_single_approver=false` (machine-generated, never approved), `capacity_records` has `has_personal_content=false`. Surface as `B2-S2` for the user to evaluate per master.
- **B5 PASS** zero `embedded_master` rows held by ITOM, nothing to validate locally. Cross-check: ITOM-mastered `monitoring_alerts` is `embedded_master` in `ITSM-EVENT-MGMT` (module 42) and `consumer` in `ITSM-INCIDENT-MGMT` (module 38) and `MSP-PSA-SVC-DESK` (module 137), all correctly pointing at ITOM as canonical owner.
- **B6 FAIL** zero `data_object_relationships` edges where both ends are ITOM masters. Implied edges all missing:
  - `monitoring_events spawns monitoring_alerts` (event correlation rolls up to alert),
  - `monitoring_policies governs monitoring_events` (the policy is the rule set generating the event),
  - `monitoring_policies governs monitoring_alerts` (threshold logic in the policy),
  - `capacity_records produces monitoring_events` (capacity exhaustion fires an event),
  - `monitoring_policies governs capacity_records` (capacity thresholds and forecasting horizons in the policy).
  Surface as `B1-S5`.
- **B7 FAIL** zero `users` edges. Expected actors: monitoring engineer (creator on `monitoring_policies`), on-call analyst (assignee on `monitoring_alerts`), capacity planner (creator on `capacity_records`), policy approver (approver on `monitoring_policies`). Surface as `B1-S6`.
- **B8 FAIL** zero outbound cross-domain `data_object_relationships`. The 4 outbound handoffs all carry payloads with clean source-master to target-payload mappings, none has its mirror relationship row:
  - handoff 28 (ITOM->ITSM, monitoring_event.alert_triggered, payload service_incidents): expect `monitoring_events triggers service_incidents`.
  - handoff 53 (ITOM->AIOPS, events.burst_detected, payload event_correlations): expect `monitoring_events feeds event_correlations`.
  - handoff 619 (ITOM->AIOPS, capacity_record.threshold_breached, payload capacity_records): self-payload, recorded as intra-relationship under B6 not B8.
  - handoff 620 (ITOM->SPM, capacity_record.forecast_exhaustion, payload capacity_records): expect `capacity_records informs strategic_initiatives` (or whichever SPM master holds capacity planning forecasts).
  Surface as `B1-S7`.
- **B9 PASS-WITH-DEFECT** 7 trigger events cover the four masters. Defects:
  - Trigger 53 `events.burst_detected` description string is generic ("Fired when a Event is burst detected. Publisher domain owns the state transition...") which is the templated default with poor grammar; PATCH.
  - Trigger 6 `monitoring_alert.threshold_breached` description has the same templated default ("Fired when a Alert is threshold breached..."); PATCH.
  - Trigger 78 `noise.suppression_applied` event_name uses a non-master subject (`noise`, not `monitoring_event`); the convention is `<entity>.<state>`. Rename to `monitoring_event.suppression_applied`; PATCH the description too. Also note the inbound handoff 59 from AIOPS reuses this trigger, which would be fine if the trigger is positioned as an inbound AIOPS-published event (data_object_id should then point at an AIOPS master not at ITOM master 84); see Pass 4 AIOPS reconciliation.
  - Trigger 45 `device.requires_monitoring` description template-default and the subject `device` is not a master; rename to `monitoring_policy.coverage_requested` and re-anchor the inbound handoff (50, DISCOVERY->ITOM) on this revised name. PATCH.
  - Triggers 634 and 635 (`capacity_record.threshold_breached`, `capacity_record.forecast_exhaustion`) both have `event_category=''` (empty string). Per the SKILL.md enum `lifecycle | state_change | threshold | signal`, set 634 to `threshold` and 635 to `signal`. PATCH.
  Surface combined as `B1-S8`.
  Also: no state-change events exist for `monitoring_policies` lifecycle (activated, deprecated, paused) nor for `monitoring_alerts` resolution (acknowledged, suppressed, resolved, closed). These are workflow gates per B12; the events are subsumed under that fix and tracked as `B1-S15` below.
- **B9b** vacuously passes: zero modules means no intra-domain cross-module handoff surface exists. Re-runs after M1 will require this band.
- **B10 REPORT-ONLY** inbound handoff coverage from 9 distinct trigger_events. The fix surface for `target_domain_module_id` lives on ITOM but is blocked by M1; the source-side `source_domain_module_id` derivation lives on the publishing domains.
- **B10b FAIL** all 4 outbound handoffs have `source_domain_module_id=null` (BLOCKED by M1), all 9 inbound handoffs have `target_domain_module_id=null` except handoff 28 (`target_domain_module_id=38`, ITSM-INCIDENT-MGMT, correctly resolved on ITSM side). 13 of 13 ITOM-side per-module FKs are null. Surface as `B1-S9` to PATCH once M1 lands.
- **B11 FAIL** zero `data_object_aliases` rows. Non-self-explanatory masters expected to carry aliases:
  - `monitoring_events` aliases: monitoring event, IT event, infrastructure event, system event,
  - `monitoring_alerts` aliases: alert, notification, threshold breach, observability alert,
  - `monitoring_policies` aliases: monitoring rule, threshold rule, alert policy, detection rule, monitor (Datadog terminology),
  - `capacity_records` aliases: capacity datapoint, utilization record, resource utilization record.
  Surface as `B1-S10`.
- **B12 FAIL** zero `data_object_lifecycle_states` across all 4 masters. Workflow states expected:
  - `monitoring_events`: ingested -> correlated -> resolved (terminal),
  - `monitoring_alerts`: open (initial) -> acknowledged -> suppressed | resolved (terminal) -> closed (terminal),
  - `monitoring_policies`: draft (initial) -> reviewed -> activated (`requires_permission=true`) -> deprecated (terminal),
  - `capacity_records`: collected (initial) -> baseline_established -> forecast_published -> archived (terminal). Mostly read-only; possibly config-shape but `forecast_published` is a state worth gating.
  Each `requires_permission=true` row derives a `<module>:<verb>_<entity>` permission under Rule #14; the realizing module must be set per M5. Surface as `B1-S11`. None of these masters fit the config-shape exemption cleanly (`monitoring_policies` has a true workflow).
- **C1 PASS** 1 owner (`IT Infrastructure`) + 1 contributor (`Software Engineering`).
- **C2 PASS** no overrides recorded; ITOM-RUNBOOK and ITOM-JOB-SCHED arguably diverge to a Platform Engineering or DataOps contributor function but no override is mandated (the domain-level RACI covers them).
- **D1** UI spot-check, none of the legacy seed data has been loaded with `record_status='approved'` (all default to `new`).
- **E1-E6 FAIL** vacuously: zero modules means no `role_modules` rows can exist. No persona is bundled against ITOM today. Surface combined as `B1-S12` (deferred until M1 lands; routine for cross-cutting roles like NOC Engineer, Site Reliability Engineer, Capacity Planner).
- **F1 FAIL** legacy domain-level system skill `itom-system` (skills.id=74, `domain_module_id=null`) exists. Once modules ship, this must retire in favor of per-module system skills. Surface as `B1-S13`.
- **F2 FAIL** module count = 0, expected `skill_type='system'` rows = 0; current is 1 misanchored (`domain_id=2, domain_module_id=null`). Cannot satisfy F2 without M1.
- **F3 PASS** the legacy skill has 6 `skill_tools` rows: 4 query primitives (`query_events`, `query_alerts`, `query_monitoring_policies`, `query_capacity_records`) plus 2 channel tools (`send_email`, `post_chat_message`). Functionally minimal but anchored on the wrong skill (domain-level instead of module-level).
- **F4 PASS** all 6 tools satisfy the `operation_kind` <-> `data_object_id` invariant.
- **F5** computable on the legacy skill, `strict_score = 5/6 = 0.833` (post_chat_message is `external`), `operational_score = 5/6` (no `integration`-tier rows). Will be recomputed per module once M1 lands.
- **F7 FAIL** `send_email` (tool 37) and `post_chat_message` (tool 40) are channel primitives, both `requirement_level=required`, both with empty `notes`. Per the channel-vs-capability authoring rule the default for generic ITOM notifications (incident dispatch, capacity escalation) is `notify_person` / `notify_team`. The voice-required or webhook-required exception does not apply to ITOM workflows. Surface as `B1-S14` to re-anchor on the abstraction tools once the per-module system skills land in Phase S.
- **H1 FAIL** of 13 cross-domain handoffs (4 outbound + 9 inbound), only 2 carry a `handoff_processes` tag (1 `discovery_substring`, 1 `agent_curated`). 11 untagged. Coverage 2/13 = 15%, `approved` count 0. Expected throughput from this audit: 7-10 NEW `agent_curated` tags + 2-3 deferrals. Surface as `B1-S16` with the per-handoff classification table below.

### Pass 2, Market audit (semantic)

Flagship-vendor surface enumerated independently of the catalog: ServiceNow ITOM (Event Management, Service Mapping, Cloud Insights, Discovery is a sibling DISCOVERY domain), BMC Helix Operations Management, OpenText Operations Bridge, IBM Instana Infrastructure, Datadog Infrastructure Monitoring, Dynatrace Davis (an OBS / AIOPS overlap), Rundeck (runbook), BMC Control-M (workload automation).

Vendor surface matrix (union, snake_case_plural names, classified):

| Entity | Class | Notes |
| --- | --- | --- |
| monitoring_events | Core | Already mastered |
| monitoring_alerts | Core | Already mastered |
| monitoring_policies | Core | Already mastered |
| capacity_records | Core | Already mastered |
| metric_collectors | Common | Polling agents and pull-side collectors (SNMP poller, WMI collector, pushgateway, telegraf-style configs). Distinct from `monitoring_policies` (rule logic) vs the collector (the runtime element that produces the timeseries). MISSING. |
| infra_topology_nodes | Common | Topology graph nodes ITOM constructs from discovery + monitoring; in ServiceNow this is the Service Map / CMDB CI overlay built specifically for ITOM impact analysis. Boundary with DISCOVERY (master) and CMDB (master). Likely SCOPE for ITOM as a `consumer` or `derived` view. MISSING / SCOPE-CREEP-INVERSE. |
| infra_health_scores | Common | Per-CI / per-service rolling health scores ITOM rolls up. BMC Helix scoreCard, ServiceNow Cloud Insights health. MISSING. |
| service_maps | Specialist | Already mastered in CMDB / DISCOVERY (id 79); ITOM should consume. Surface-confirmed dependency. |
| alert_routing_rules | Common | Routing logic from alert -> recipient -> incident channel; distinct from `monitoring_policies` (rule logic) vs `alert_routing_rules` (destination logic). MISSING. |
| runbook_definitions | Specialist | Reusable automation runbooks linked to alert classes. Per Rule #19 / ITPA candidate this likely belongs in the queued ITPA candidate domain. Decision question for B3-S1 (Bucket 3). |
| job_definitions | Specialist | Workload-automation job specs (Control-M cyclic jobs, AutoSys boxes). Likely belongs in the queued WORKLOAD-AUTO candidate. Decision question for B3-S2 (Bucket 3). |
| capacity_forecasts | Common | First-class forecast records distinct from individual `capacity_records` datapoints. Datadog Forecasts, ServiceNow Cloud Insights forecast, BMC TrueSight Capacity Optimization. MISSING. |
| ml_baselines | Specialist | Statistical baselines used in capacity planning, overlaps with AIOPS `anomaly_detections`. Decision question for B3-S3 (Bucket 3). |
| sla_definitions | Specialist | Internal availability SLAs ITOM evaluates against (uptime targets, MTTR targets, capacity headroom). Cross-cutting with ITSM-SLM. Likely belongs in ITSM, scope question for B2-S3. |
| event_correlation_rules | Specialist | Author-time deterministic correlation logic; overlaps with AIOPS `correlation_rules` candidate from the AIOPS audit (Bucket 3 candidate). Scope question for B2-S4. |

#### Findings

- **MISSING**: `metric_collectors`, `infra_topology_nodes` (could be `consumer`), `infra_health_scores`, `alert_routing_rules`, `capacity_forecasts`. Surfaced in Bucket 1 (`B1-S17`) and Bucket 3.
- **WRONG-OWNERSHIP**: M7 catalog conflict on `monitoring_alerts` and `monitoring_policies` (mastered in BOTH ITOM and RMM). Surfaced as `B2-S1`.
- **SCOPE-CREEP**: none flagged; the contributor row on `service_incidents` is correct (ITOM contributes incident-trigger context, ITSM masters).
- **MODULARIZATION-ISSUE**: M1 missing modules and 6 capabilities argues for >=3 modules; the most natural split is:
  - ITOM-INFRA-MON (Infrastructure Monitoring + Event Management + Log Aggregation): masters `monitoring_events`, `monitoring_alerts`, `monitoring_policies`,
  - ITOM-CAPACITY (Capacity Planning): masters `capacity_records` (+ planned `capacity_forecasts`),
  - ITOM-RUNBOOK-AUTO (Runbook Automation, optionally splits to the queued ITPA candidate domain): would master `runbook_definitions` if kept in ITOM.
  - ITOM-JOB-SCHED (Job Scheduling, optionally splits to the queued WORKLOAD-AUTO candidate domain): would master `job_definitions` if kept in ITOM.
  Recommendation surfaced as `B1-S4` for the structural split; the runbook/job-sched split-out is Bucket 2 (`B2-S5`).

### Pass 3, Neighbor discovery

Auto-discovered from `handoffs` source + target edges plus the M7 catalog conflict.

| Neighbor | Outbound | Inbound | DMDO cross-refs | Edge weight | Notes |
| --- | --- | --- | --- | --- | --- |
| AIOPS | 2 | 3 | 1 (event_correlations payload, mastered in AIOPS) | 5 | Heavy; reconcile (Pass 4). |
| ITSM | 1 | 0 | 1 (service_incidents contributor) | 2 | Reconcile (Pass 4, lighter pass). |
| RMM | 0 | 0 | 2 catalog-wide master conflicts on monitoring_alerts + monitoring_policies | 2 | Pure M7 conflict, no handoff edges. Surfaced as `B2-S1`. |
| DCIM | 0 | 2 | 0 | 2 | Light, one-line summary. |
| DISCOVERY | 0 | 1 | 1 (DISCOVERY masters service_maps that ITOM consumes implicitly) | 2 | Light. |
| OBS | 0 | 1 | 0 | 1 | Light. |
| SPM | 1 | 0 | 0 | 1 | Light. |
| APP-PAAS | 0 | 1 | 0 | 1 | Light. |
| KUBE-PLAT | 0 | 1 | 0 | 1 | Light. |

### Pass 4, Pairwise reconciliation

Run the 5-section diff against neighbors with edge weight >= 3 (AIOPS only). ITSM gets a lighter pass because of structural importance even though edge weight is 2. RMM gets a structural-only pass because the conflict is M7-shaped not handoff-shaped. Other neighbors at weight 1-2 are summarized inline.

#### Boundary findings per neighbor

##### AIOPS (edge weight 5)

1. **Existing handoffs, fully wired.** Zero. The two existing outbounds (53, 619) and three existing inbounds (59, 605, 607) have `source_domain_module_id=null` and `target_domain_module_id=null` on the ITOM side because ITOM has no modules (M1 blocks). AIOPS also has no modules per its own audit (M1 blocks symmetrically). Section is empty, but the upstream gap is M1 on both sides.
2. **Existing handoffs with NULL module FK.** All 5 are in this bucket. PATCHable only once both sides modularize. Surfaced as `B1-S9` for ITOM-side once M1 lands.
3. **Missing handoffs the catalog implies should exist.** Per AIOPS audit Bucket 3, the AIOPS market surface includes `change_correlations` (linking events to change_requests) which would publish a handoff into ITSM via Change Mgmt, not back to ITOM. Within the ITOM<->AIOPS boundary specifically: AIOPS publishes `monitoring_event.suppressed` (existing handoff 59 mis-named under trigger 78 `noise.suppression_applied`). After the trigger 78 rename to `monitoring_event.suppression_applied`, that handoff's `data_object_id` should re-point at the AIOPS-mastered `alert_suppression_rules` payload (id 722) instead of `monitoring_events` (id 84), because AIOPS owns the suppression logic and ITOM consumes the suppression decision. Surface as `B1-S8` extension under the trigger 78 PATCH.
4. **Boundary integrity gaps.** Handoff 53 payload `event_correlations` (id 93) is correctly AIOPS-mastered. Handoff 59 payload `monitoring_events` (id 84) is correctly ITOM-mastered. No B5 integrity defects.
5. **Cross-domain `data_object_relationships` mirror check.** Zero rows exist on either side of the AIOPS<->ITOM boundary. Expected:
  - `monitoring_events feeds event_correlations` (ITOM->AIOPS, owner_side=target),
  - `capacity_records informs predictive_signals` (ITOM->AIOPS, owner_side=target),
  - `alert_suppression_rules suppresses monitoring_events` (AIOPS->ITOM, owner_side=source).
  ITOM owes rows 1 and 2 under `B1-S7`; AIOPS owes row 3 under its own B8.

##### ITSM (edge weight 2, structural importance)

1. **Existing handoffs, fully wired.** Handoff 28 (ITOM->ITSM, monitoring_event.alert_triggered -> service_incidents, target_module=38 ITSM-INCIDENT-MGMT). Source module on ITOM side is null pending M1. Otherwise clean.
2. **NULL module FK on source side.** Handoff 28 needs `source_domain_module_id` set to the (yet to be created) ITOM-INFRA-MON module. PATCHable post-M1; surfaced as `B1-S9`.
3. **Missing handoffs.** None obvious from the current footprint. The `service_incidents` -> `monitoring_alerts` correlation (`relationship 193` already exists) represents a different relationship (ITSM->ITOM acknowledgment / correlation lookup), not a handoff. The reverse direction (ITSM->ITOM) carrying `incident.resolved -> mark monitoring_alert as resolved` could exist if the catalog wants to model ITSM-driven alert auto-resolution; surface as a Bucket 3 candidate `B3-S4`.
4. **Boundary integrity gaps.** None.
5. **Cross-domain `data_object_relationships` mirror check.** Relationship 193 (`service_incidents correlates_to monitoring_alerts`, owner_side=target) exists. Mirror direction (`monitoring_alerts triggered incident`) is captured by the existing inverse_verb. The handoff 28 payload mapping `monitoring_events -> service_incidents` is NOT mirrored as a relationship row; expected `monitoring_events triggers service_incidents` under B8; surfaced as `B1-S7`.

##### Lighter neighbors (edge weight 1-2, one-line summaries)

- **RMM (catalog conflict, no edges):** ITOM and RMM both `master` rows on `monitoring_alerts` and `monitoring_policies` in legacy `domain_data_objects`. RMM has zero modules. Decision in `B2-S1`: ITOM is the canonical owner (larger market, broader vendor surface); RMM should demote both rows to `embedded_master` (or DELETE if RMM later master-ships a distinctly-shaped `rmm_monitoring_alerts`). The decision affects the eventual RMM audit; surface as report-only for RMM.
- **DCIM (2 inbound):** Handoffs 673 (`dc_environmental_reading.threshold_breached`) and 681 (`dc_rack.capacity_threshold_breached`) carry DCIM-owned payloads into ITOM. Both have `target_domain_module_id=null` (M1 blocks). DCIM owes nothing further; the receiving DMDO row on `dc_environmental_readings` (552) and `dc_racks` (546) does not exist on ITOM either - ITOM would need a `consumer` DMDO row once M1 lands. Surface as `B1-S18` (consumer DMDO authoring as part of the M1 module bring-up).
- **DISCOVERY (1 inbound):** Handoff 50 (`device.requires_monitoring` -> monitoring_policies) is fine in shape, but trigger 45 needs the rename per `B1-S8`. After rename, the inbound payload mapping stays clean.
- **OBS (1 inbound):** Handoff 54 (`monitoring_alert.threshold_breached`) carries an ITOM-mastered payload but with OBS as source. This is structurally odd: OBS is observability-platform (Prometheus / Grafana / Honeycomb / Lightstep style); the threshold breach happens in OBS but the payload entity is ITOM's `monitoring_alerts`. Probable intended shape: OBS-published trigger should fire on an OBS-mastered entity (likely `observability_alerts` or `obs_alerts`), and the handoff payload then becomes the OBS entity that ITOM consumes as a contributor. Surface as `B2-S3` for the user to decide whether trigger 6's `data_object_id` should re-anchor on the OBS side.
- **SPM (1 outbound):** Handoff 620 (`capacity_record.forecast_exhaustion` -> capacity_records) is structurally OK but no relationship mirror exists (`B1-S7`).
- **APP-PAAS (1 inbound):** Handoff 755 (`paas_runtime.scaled` -> paas_runtime_instances) is structurally fine; APP-PAAS owns the entity, ITOM observes the scale event. Receiving DMDO row absent on ITOM (subsumed under `B1-S18`).
- **KUBE-PLAT (1 inbound):** Handoff 761 (`cluster_node_pool.scaled` -> cluster_node_pools) is structurally fine, same pattern as APP-PAAS. Receiving DMDO row absent on ITOM (subsumed under `B1-S18`).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL

| ID | Finding | Current | Proposed fix |
| --- | --- | --- | --- |
| B1-S1 | A1, `domains.business_logic` contains a U+2014 em-dash | "...impact analysis [EM-DASH] engine-led..." | PATCH to replace em-dash with comma or sentence break |
| B1-S2 | A3, only 1 solution linked (ServiceNow) | 1 solution | Extend `solution_domains` with BMC Helix Operations Management, OpenText Operations Bridge, IBM Instana Infrastructure, Datadog Infrastructure Monitoring; coverage_level per vendor |
| B1-S3 | A4, `catalog_tagline` and `catalog_description` empty | both empty | Draft per Rule #20 buyer-voice, surface to user BEFORE writing |
| B1-S4 | M1 / M2 / M4, zero `domain_modules` | 0 modules | Author >=3 full modules: ITOM-INFRA-MON (events + alerts + policies), ITOM-CAPACITY (capacity_records + capacity_forecasts), ITOM-LOG-AGG (log aggregation if kept, otherwise fold into ITOM-INFRA-MON); plus consider ITOM-RUNBOOK-AUTO and ITOM-JOB-SCHED unless promoted to the queued ITPA / WORKLOAD-AUTO candidate domains (see `B2-S5`) |
| B1-S5 | B6, zero intra-domain `data_object_relationships` | 0 edges between ITOM masters | Author 5 edges (events->alerts, policies->events, policies->alerts, capacity->events, policies->capacity) |
| B1-S6 | B7, zero `users` edges from ITOM masters | 0 user edges | Author monitoring_policy.author, monitoring_policy.approver, monitoring_alert.assignee, capacity_record.collected_by |
| B1-S7 | B8, zero outbound cross-domain relationships | 0 edges | Author 3 mirror rows for handoffs 28, 53, 620 |
| B1-S8 | B9, trigger event description / naming defects | 5 events affected | PATCH descriptions for triggers 6, 53; rename trigger 45 (`device.requires_monitoring` -> `monitoring_policy.coverage_requested`); rename trigger 78 (`noise.suppression_applied` -> `monitoring_event.suppression_applied`) AND re-anchor `data_object_id` on the AIOPS side per Pass 4 AIOPS Section 3; set `event_category` for triggers 634 (`threshold`), 635 (`signal`) |
| B1-S9 | B10b, all ITOM-side per-module FKs null | 13 of 13 | PATCH via the deterministic backfill helper once M1 lands |
| B1-S10 | B11, zero aliases | 0 alias rows | Author 4-5 aliases per master (see B11 list above) |
| B1-S11 | B12, zero lifecycle states | 0 states | Author state machines per B12 above; flag `requires_permission=true` on monitoring_policy.activated, capacity_record.forecast_published |
| B1-S12 | E1-E6, no roles bundled | 0 role_modules | Author NOC Engineer, Site Reliability Engineer, Capacity Planner once M1 lands; cross-functional, no business_function_id required for SRE |
| B1-S13 | F1, retire legacy domain-level `itom-system` skill | 1 row | DELETE after per-module system skills exist |
| B1-S14 | F7, channel primitives used as defaults | send_email + post_chat_message both `required` | Re-anchor on `notify_person` (and `notify_team` for broadcast) once per-module Phase S authoring lands |
| B1-S15 | B9 subsumed, missing state-change events on policy / alert lifecycle | several missing | Author trigger_events for monitoring_policy.activated, monitoring_policy.deprecated, monitoring_alert.acknowledged, monitoring_alert.resolved, capacity_record.forecast_published as part of B12 |

#### MISSING (entity gap)

| ID | Finding | Proposed module | Vendor evidence |
| --- | --- | --- | --- |
| B1-S17 | MISSING entities from vendor surface | ITOM-INFRA-MON or ITOM-CAPACITY | metric_collectors (telegraf, snmp), alert_routing_rules (routing destinations), capacity_forecasts (vendor-standard first-class forecast). All four MISSING. infra_health_scores deferred to Bucket 3 (`B3-S5`) pending vendor verification of whether the ITOM market consistently surfaces this as a first-class entity. infra_topology_nodes deferred (overlap with CMDB / DISCOVERY masters). |

#### BOUNDARY

| ID | Finding | Owner | Proposed fix |
| --- | --- | --- | --- |
| B1-S18 | Receiving DMDO rows absent on ITOM for inbound payloads | ITOM (post-M1) | Author `consumer` rows for `dc_environmental_readings` (552), `dc_racks` (546), `paas_runtime_instances` (466), `cluster_node_pools` (449), `service_maps` (79), `event_correlations` (93), `alert_suppression_rules` (722), `predictive_signals` (96) on the appropriate ITOM module post-M1 |

#### APQC TAGGING

| ID | Finding |
| --- | --- |
| B1-S16 | of 13 cross-domain handoffs, 11 are untagged. Coverage 2/13 = 15%, `approved` count 0. Propose 8 new `agent_curated` rows + 3 deferrals. |

`agent_curated` proposals:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 28 | ITOM -> ITSM | monitoring_event.alert_triggered | service_incidents | Triage IT service delivery incidents | 1299 (20903) | confident L4 (also already tagged) |
| 53 | ITOM -> AIOPS | events.burst_detected | event_correlations | Operate and monitor online systems | 1301 (20906) | confident L4 |
| 619 | ITOM -> AIOPS | capacity_record.threshold_breached | capacity_records | Operate and monitor online systems | 1301 (20906) | confident L4 |
| 620 | ITOM -> SPM | capacity_record.forecast_exhaustion | capacity_records | Plan operational activities for IT service delivery | 1285 (20881) | confident L4 |
| 50 | DISCOVERY -> ITOM | device.requires_monitoring | monitoring_policies | Operate and monitor online systems | 1301 (20906) | medium L4 (the publishing side is DISCOVERY's job to tag) |
| 54 | OBS -> ITOM | monitoring_alert.threshold_breached | monitoring_alerts | Operate and monitor online systems | 1301 (20906) | confident L4 |
| 59 | AIOPS -> ITOM | noise.suppression_applied | monitoring_events | Operate and monitor online systems | 1301 (20906) | medium L4 |
| 605 | AIOPS -> ITOM | predictive_signal.elevated | predictive_signals | Monitor IT service support performance | 1300 (20904) | confident L4 |
| 607 | AIOPS -> ITOM | alert_suppression_rule.activated | alert_suppression_rules | Operate and monitor online systems | 1301 (20906) | confident L4 |
| 673 | DCIM -> ITOM | dc_environmental_reading.threshold_breached | dc_environmental_readings | Perform infrastructure component maintenance | 1310 (20916) | medium L4 |
| 681 | DCIM -> ITOM | dc_rack.capacity_threshold_breached | dc_racks | Manage capacity utilization | 782 (10263) | confident L4 |
| 755 | APP-PAAS -> ITOM | paas_runtime.scaled | paas_runtime_instances | Operate and monitor online systems | 1301 (20906) | confident L4 |
| 761 | KUBE-PLAT -> ITOM | cluster_node_pool.scaled | cluster_node_pools | Operate and monitor online systems | 1301 (20906) | confident L4 |

Deferred-to-Discover items (no clean PCF match): none. All 13 land on the IT-ops / IT service delivery slice cleanly.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent cannot decide | Options | Dependency |
| --- | --- | --- | --- | --- |
| B2-S1 | M7 catalog conflict: ITOM and RMM both master `monitoring_alerts` (id 85) and `monitoring_policies` (id 86). Who is canonical? | RMM has zero modules; ITOM is the broader market. Likely ITOM wins, RMM demotes to `embedded_master` (preserving standalone deploy story for a small MSP) or `consumer` (defers entirely). But "RMM as a distinct point-solution market" implies it has its own monitoring shapes that may diverge over time. | (a) ITOM canonical, RMM demotes to `embedded_master` on both, (b) ITOM canonical, RMM demotes to `consumer`, (c) split into ITOM-mastered general monitoring + RMM-mastered `rmm_monitoring_alerts` / `rmm_monitoring_policies` shapes | Independent |
| B2-S2 | B4 pattern flag re-evaluation per master | Need positive audit re-evaluation: machine-generated alerts vs human-authored policies vs immutable capacity datapoints have different shapes | Per master: monitoring_policies: has_submit_lock? has_single_approver? monitoring_events: has_submit_lock? capacity_records: has_submit_lock? | Independent |
| B2-S3 | Handoff 54 (OBS -> ITOM) carries ITOM-mastered payload `monitoring_alerts` but is published from OBS. Should the trigger 6 re-anchor on an OBS-mastered entity instead? | OBS is observability-platform; semantically the alert may be mastered there too (depending on how the OBS / ITOM boundary is intended). | (a) Leave as-is (OBS publishes into ITOM's alert master), (b) Add `obs_alerts` / `observability_alerts` to OBS and re-anchor the trigger, (c) Define OBS-published triggers as inbound-events on ITOM masters by exception | Independent |
| B2-S4 | `event_correlation_rules` vs AIOPS-candidate `correlation_rules`: distinct entities (deterministic rule configs vs ML-correlations) or rename of the same concept? | The shape of "author-time correlation rule" is what AIOPS's Bucket 3 named `correlation_rules`. ITOM event-management vendors ship a similar concept. Two entries or one cross-cutting? | (a) Distinct: ITOM-mastered `event_correlation_rules`, AIOPS-mastered `correlation_rules` (ML-driven), (b) Single AIOPS-mastered `correlation_rules` consumed by ITOM as embedded_master, (c) Single ITOM-mastered `event_correlation_rules` consumed by AIOPS | Depends on Bucket 3 outcome of AIOPS audit |
| B2-S5 | Should ITOM-RUNBOOK and ITOM-JOB-SCHED capabilities migrate to the queued ITPA + WORKLOAD-AUTO candidate domains, or stay as ITOM modules? | Both runbook automation and workload automation are point-solution markets in their own right (Rundeck, Resolve, Stonebranch); but historically ITOM platforms have bundled them. Rule #2 (point-solution market test) favors splitting them out. | (a) Promote ITPA + WORKLOAD-AUTO from candidates to domains, migrate capabilities (b) Keep both as ITOM capabilities + modules (c) Promote one, keep the other | Independent of Bucket 1 module split; if promoted, ITOM keeps 4 capabilities + ~3 modules |

### Bucket 3, Phase 0 pending (speculative)

| ID | Candidate | Vendor knowledge basis | Recommended verification |
| --- | --- | --- | --- |
| B3-S1 | `runbook_definitions` as an entity (if ITOM-RUNBOOK stays in ITOM and is not migrated to the queued ITPA candidate) | Rundeck, BMC TrueSight Orchestration, ServiceNow Runbook | Verify in Rundeck OSS schema, ServiceNow Runbook table list |
| B3-S2 | `job_definitions` as an entity (if ITOM-JOB-SCHED stays in ITOM and is not migrated to the queued WORKLOAD-AUTO candidate) | Control-M, AutoSys, Tidal, Stonebranch UAC | Verify in BMC Control-M Definition Language docs and AutoSys JIL schema |
| B3-S3 | `ml_baselines` as a master, distinct from AIOPS `anomaly_detections` | ServiceNow Cloud Insights baseline, Datadog Forecasts, BMC TrueSight Capacity Optimization | Compare baseline-as-entity treatment in BMC TrueSight CO docs vs the AIOPS `ml_model_training_records` shape; may collapse into ITOM-CAPACITY or AIOPS |
| B3-S4 | Reverse-direction ITSM -> ITOM handoff: `incident.resolved` -> mark `monitoring_alerts` as auto-resolved | ServiceNow ITSM auto-close monitoring rules, BMC Helix policy-based auto-close | Verify whether vendors generally model this as a publish-subscribe or as an internal rule on the alert |
| B3-S5 | `infra_health_scores` as a first-class master vs derived view | ServiceNow Cloud Insights health rollups, BMC Helix scorecards, Dynatrace severity | Verify whether the market consistently surfaces this as a master (vendors compute it differently); may stay as a derived view rather than a master |

### Cross-bucket dependencies

- `B2-S4` (event_correlation_rules) depends on AIOPS's Bucket 3 outcome: if AIOPS authors a master `correlation_rules`, ITOM's choice collapses to consumer / embedded_master.
- `B2-S5` (ITPA / WORKLOAD-AUTO migration) depends on triage decisions on the queued candidates (`audits/_missing-domains.md` review). If promoted, ITOM's `B1-S4` module list collapses to 3 (ITOM-INFRA-MON, ITOM-CAPACITY, ITOM-LOG-AGG); if not, ITOM stays at 5 modules.
- `B3-S1`, `B3-S2` depend on `B2-S5`.

### Per-bucket prompts

- **After Bucket 1:** Fix these now? Reply "all", "just S1, S2, S4, S5, S7, S8", or "skip the M1-blocked items". Note: B1-S9, B1-S12, B1-S14, B1-S18 are all blocked behind B1-S4 (M1 modules) and will run after the module bring-up.
- **After Bucket 2:** What is your call on each of these? B2-S1 needs a canonical-owner decision; B2-S2 needs per-master flag values; B2-S3 needs an OBS<->ITOM boundary call; B2-S4 depends on AIOPS Bucket 3; B2-S5 depends on the ITPA / WORKLOAD-AUTO triage. I will wait for your decision per item.
- **After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true.

### Report-only follow-ups (owed by other domains)

- **AIOPS B9 owes outbound on `alert_suppression_rules` -> ITOM**: handoff 607 exists but no `data_object_relationships` mirror in AIOPS's B8 (suppression -> monitoring_events).
- **AIOPS B9 owes outbound on `predictive_signals` -> ITOM**: handoff 605 exists but no mirror.
- **DISCOVERY B9 owes outbound on `monitoring_policies`**: handoff 50 exists. The fix on DISCOVERY side after `B1-S8` rename completes: re-anchor trigger 45 (`monitoring_policy.coverage_requested`) at a DISCOVERY-mastered subject if the rename loses the DISCOVERY entity binding. Note that `device.requires_monitoring`'s `data_object_id` currently points at monitoring_policies (ITOM master) which is structurally odd for a DISCOVERY-published event; surface for DISCOVERY's own audit.
- **OBS B9 owes outbound on `monitoring_alerts`**: handoff 54 exists; trigger 6's `data_object_id` re-anchor question (see `B2-S3`) routes to OBS once the user decides.
- **DCIM B9 owes outbound on `dc_environmental_readings` and `dc_racks`**: handoffs 673, 681 exist; mirror relationships absent on DCIM side.
- **APP-PAAS B9 owes outbound on `paas_runtime_instances`**: handoff 755 exists; mirror relationship absent.
- **KUBE-PLAT B9 owes outbound on `cluster_node_pools`**: handoff 761 exists; mirror relationship absent.
- **RMM M7 demotion** (depends on `B2-S1`): once the canonical owner is set to ITOM, RMM owes a PATCH on its legacy `domain_data_objects` rows for `monitoring_alerts` and `monitoring_policies` to demote them to `embedded_master` or `consumer` per the decision.
- **ITSM B10b** receives the source-side fix `B1-S9` on ITOM, but `target_domain_module_id=38` is already set for handoff 28, so no ITSM action required.
- **SPM B10b** owes `target_domain_module_id` on handoff 620 once SPM has the relevant module.

## 2026-05-31, Continuation: B1 technical fixes

Applied the deterministic B1 items from the 2026-05-30 audit that do not require modules, vendor research, lifecycle authoring, or judgment-call rewordings. Loader: `.tmp_deploy/fix_itom_b1_technical_2026_05_31.ts` (idempotent, TS + Bun, run from project root).

### Applied

- **B1-S1** PATCH `domains.business_logic` on ITOM (id=2): replaced the U+2014 em-dash with a comma (CLAUDE.md violation). Manual follow-up PATCH removed the double-space artifact from the em-dash's surrounding spaces. Final value: `Event management, capacity calculations, and topology-aware impact analysis, engine-led; service-mapping master data is the smaller part.`
- **B1-S6** INSERT 4 `data_object_relationships` user-edges (Rule #10) from `users` (id 748) to ITOM masters:
  - `users` -[authored_monitoring_policies]-> `monitoring_policies` (86)
  - `users` -[approved_monitoring_policies]-> `monitoring_policies` (86)
  - `users` -[assigned_monitoring_alerts]-> `monitoring_alerts` (85)
  - `users` -[collected_capacity_records]-> `capacity_records` (87)
  All `owner_side='source'`, `relationship_type='one_to_many'`, `relationship_kind='reference'`, `is_required=false`, matching the live convention sampled from existing user-edges.
- **B1-S8** PATCH 6 `trigger_events` rows:
  - 6 `monitoring_alert.threshold_breached`: description rewritten (templated default replaced).
  - 45: RENAME `device.requires_monitoring` -> `monitoring_policy.coverage_requested`; description rewritten.
  - 53 `events.burst_detected`: description rewritten.
  - 78: RENAME `noise.suppression_applied` -> `monitoring_event.suppression_applied`; description rewritten. **Deferred**: re-anchoring `data_object_id` to an AIOPS master per Pass 4 AIOPS Section 3 (requires picking the AIOPS-owned suppression entity).
  - 634 `capacity_record.threshold_breached`: `event_category='' -> 'threshold'`.
  - 635 `capacity_record.forecast_exhaustion`: `event_category='' -> 'signal'`.
- **B1-S10** INSERT 16 `data_object_aliases` rows across the 4 ITOM masters per the B11 list (4 for monitoring_events, 4 for monitoring_alerts, 5 for monitoring_policies, 3 for capacity_records), all `alias_type='synonym'`. The "monitor" alias on `monitoring_policies` was authored without the Datadog parenthetical (the audit text used the parenthetical as provenance commentary, not as the alias name itself).
- **B1-S16** INSERT 3 `handoff_processes` tags (the 3 of 13 ITOM-touching cross-domain handoffs that lacked any tag at audit time):
  - handoff 50 (DISCOVERY -> ITOM, `monitoring_policy.coverage_requested`) -> process 1301 (`Operate and monitor online systems`, PCF 20906).
  - handoff 54 (OBS -> ITOM, `monitoring_alert.threshold_breached`) -> process 1301.
  - handoff 620 (ITOM -> SPM, `capacity_record.forecast_exhaustion`) -> process 1285 (`Plan operational activities for IT service delivery`, PCF 20881).
  All three written with `proposal_source='agent_curated'`, `record_status` defaulted to `'new'` per Rule #1.

### Deferred (and why)

- **B1-S2** (additional vendor `solution_domains`): requires vendor research and new `solutions`/`vendors` rows, not in technical-apply scope.
- **B1-S3** (catalog_tagline / catalog_description): Rule #20 explicitly requires draft + user review before write.
- **B1-S4** (author >=3 `domain_modules`): new modules deferred; structural authoring outside technical scope.
- **B1-S5** (5 intra-domain master-master relationships): audit lists pairs and verbs informally but does not pre-specify the full `(relationship_verb, inverse_verb, relationship_type, relationship_kind, is_required, owner_side)` tuples needed for an unambiguous insert.
- **B1-S7** (3 outbound cross-domain mirror relationships): same gap as B1-S5; verb / cardinality / owner_side not pre-specified.
- **B1-S9** (per-module FK backfill on 13 handoffs): blocked behind B1-S4 (no ITOM modules exist to assign).
- **B1-S11** (lifecycle states across 4 masters): full Phase-B authoring with state machines + `requires_permission` + `permission_verb_override`; not pre-specified at the field level.
- **B1-S12** (NOC / SRE / Capacity Planner roles): blocked behind B1-S4.
- **B1-S13** (DELETE legacy `itom-system` skill id 74): per F1, only retire after per-module system skills exist; blocked behind B1-S4 + Phase S.
- **B1-S14** (re-anchor `send_email` / `post_chat_message` on `notify_person` / `notify_team`): blocked behind per-module Phase-S authoring.
- **B1-S15** (state-change trigger_events for policy / alert / capacity lifecycle): subsumed under B1-S11 (lifecycle states); each event needs paired `event_category` plus `data_object_id` derivation, not deterministic without the lifecycle authoring.
- **B1-S17** (MISSING entities: `metric_collectors`, `alert_routing_rules`, `capacity_forecasts`, `infra_health_scores`, `infra_topology_nodes`): new `data_objects` deferred.
- **B1-S18** (consumer DMDO rows for inbound payloads): blocked behind B1-S4.
- **Trigger 78 `data_object_id` re-anchor** to an AIOPS master (Pass 4 AIOPS Section 3): user picks the AIOPS-owned suppression entity; deferred.

### JWT errors

None.

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_itom_b1_technical_2026_05_31.ts`
