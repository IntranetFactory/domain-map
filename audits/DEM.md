---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 23
---

# DEM, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 5 mastered `data_objects` (endpoint_experience_scores, synthetic_monitoring_results, real_user_sessions, digital_friction_events, endpoint_anomaly_findings), 0 consumer / contributor rows, 5 `trigger_events`, 4 outbound and 1 inbound cross-domain handoffs, 0 `domain_modules`, 0 `domain_module_data_objects`, 0 `data_object_relationships` involving any DEM master, 0 `data_object_lifecycle_states`, 0 `data_object_aliases`, 0 `domain_regulations`, 0 module-anchored system skills (1 legacy domain-level skill `dem-system` at `skills.id=47`), 0 roles in `role_modules` (cannot exist without modules), 0 `capabilities`, 0 `solutions`.
- Vendor-surface basis (flagship vendors enumerated for the semantic pass): Catchpoint, ThousandEyes (Cisco), Splunk Synthetics, Dynatrace DEM (incl. RUM + Synthetic), New Relic Browser + Synthetic, Datadog RUM + Synthetic, Akamai mPulse, AppNeta (Broadcom), Riverbed Aternity. Boundary with the Digital Employee Experience (DEX) category (Nexthink, 1E, ControlUp Edge DX, Lakeside SysTrack, HappySignals) is a genuinely open scope question, see Bucket 2 #2.
- **Bucket 1 (in-scope, agent fixable):** 16 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items.
- Candidates queued in `audits/_missing-domains.md`: 2 new codes (DEX-PLATFORM, APM-MONITORING).

### Pass 1, Structural

#### S-band coverage sweep

**S1, direct FKs to `domains`.**

| Table | FK column | DEM rows | Expected non-zero? |
| --- | --- | --- | --- |
| `domain_data_objects` | `domain_id` | 5 | yes |
| `solution_domains` | `domain_id` | 0 | yes (FAIL, A3) |
| `business_function_domains` | `domain_id` | 2 | yes |
| `capability_domains` | `domain_id` | 0 | yes (FAIL, A2) |
| `domain_regulations` | `domain_id` | 0 | optional |
| `domains.parent_domain_id` | `parent_domain_id` | 0 (no sub-domains) | optional |
| `handoffs.source_domain_id` | `source_domain_id` | 4 | yes |
| `handoffs.target_domain_id` | `target_domain_id` | 1 | yes (typically more) |
| `skills.domain_id` | `domain_id` | 1 (legacy domain-level) | yes (but routes to F1 since `domain_module_id IS NULL`) |
| `domain_modules.domain_id` | `domain_id` | 0 | yes (FAIL, M1, blocking) |
| `domain_module_host_domains.domain_id` | `domain_id` | 0 | only if cross-cutting hosts |
| `domain_aliases.domain_id` | `domain_id` | 0 | optional |

**S2, indirect-table per-module coverage.** Not runnable, no modules exist (M1 blocks).

**S3, per-master indirect coverage.**

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| endpoint_experience_scores (585) | 0 | 1 (677 `endpoint_experience_score.degraded`) | 0 |
| synthetic_monitoring_results (586) | 0 | 1 (678 `synthetic_monitoring_result.failed`) | 0 |
| real_user_sessions (587) | 0 | 1 (679 `real_user_session.poor_experience`) | 0 |
| digital_friction_events (588) | 0 | 1 (680 `digital_friction_event.recorded`, orphan: zero handoffs) | 0 |
| endpoint_anomaly_findings (589) | 0 | 1 (681 `endpoint_anomaly_finding.published`) | 0 |

Per-master sweep flags: zero states across the board (B12 fail), zero aliases (B11 fail), one trigger event per master is the minimum, missing several plausible state-transition events per master (B9 partial fail), and one orphan trigger event (680, no handoff anywhere).

#### Band findings

- **A1 PASS** all 7 business-metadata fields populated (`crud_percentage=35`, `business_logic` set, `min_org_size='30 m <2500'`, `cost_band='$$$'`, `certification_required=false`, `usa_market_size_usd_m=800`, `market_size_source_year=2025`). But the `business_logic` string contains a U+2014 em-dash, that is a CLAUDE.md violation and goes to Bucket 1 as a STRUCTURAL PATCH (B1-S1 below).
- **A2 FAIL** zero `capability_domains` rows. Vendor surface implies 5 to 7 capabilities for the DEM market.
- **A3 FAIL** zero `solution_domains` rows. Flagship vendors (Catchpoint, ThousandEyes, Dynatrace DEM, New Relic Browser + Synthetic, Datadog RUM + Synthetic, Splunk Synthetics, Akamai mPulse, AppNeta, Riverbed Aternity) are not linked.
- **A4 FAIL** `catalog_tagline=""`, `catalog_description=""`. Both empty; draft is in Bucket 1 (B1-A4).
- **M1 FAIL (BLOCKING)** zero `domain_modules`. Every M-band, every module-anchored B / E / F finding is blocked.
- **M2 through M7** vacuous (M1 blocks), nothing to evaluate yet.
- **B1 PASS** 5 master rows.
- **B2 PASS** every master has `singular_label` and `plural_label` populated.
- **B3 PASS** every master is prefixed (no bare-word), `is_canonical_bare_word=false`, no rationale required.
- **B4 FAIL** every master has all three pattern flags `false` by default; no positive audit re-evaluation has happened. Likely true flips: `has_personal_content=true` on `real_user_sessions` (captures end-user browser session data), `has_personal_content=true` on `digital_friction_events` (per-user friction telemetry), `has_personal_content=true` on `endpoint_experience_scores` (per-user / per-device score). `has_submit_lock` and `has_single_approver` are not expected to flip for any DEM master (machine-generated telemetry, no human author / approval workflow). Surface in Bucket 2 for the user to confirm per master.
- **B5 PASS** zero `embedded_master` rows, nothing to validate.
- **B6 FAIL** zero intra-domain `data_object_relationships`. Plausible edges: `digital_friction_events contributes_to endpoint_experience_scores`, `real_user_sessions contributes_to endpoint_experience_scores`, `synthetic_monitoring_results contributes_to endpoint_experience_scores`, `endpoint_anomaly_findings correlates_with digital_friction_events`. All missing.
- **B7 FAIL** zero `users` edges. DEM masters are largely machine-generated telemetry, but `endpoint_experience_scores` and `real_user_sessions` are per-user-scoped, so the relationship `users observes endpoint_experience_scores` and `users generates real_user_sessions` belong in the catalog per Rule #10. `digital_friction_events` likewise is per-user.
- **B8 FAIL** for outbound, zero cross-domain `data_object_relationships`. The 4 outbound handoffs (664 to ITSM `service_incidents`, 665 to AIOPS `endpoint_anomaly_findings`, 666 to OBS `synthetic_monitoring_results`, 667 to AIOPS `real_user_sessions`) have no mirror relationships.
- **B9 PARTIAL FAIL** every master carries one trigger event. Missing rows:
  - `digital_friction_event.recorded` (680) exists but has zero handoffs anywhere, ORPHAN. Either remove the trigger event or author the missing handoff (most likely DEM to ITSM proactive ticket per the description).
  - Plausible additional state-transition events per master: `endpoint_experience_score.recovered`, `synthetic_monitoring_result.recovered`, `endpoint_anomaly_finding.resolved`, `real_user_session.tagged_critical`. Not authored.
- **B9b** vacuously passes (no modules, no intra-domain handoff surface to model).
- **B10 REPORT-ONLY** the 1 inbound handoff (653 from NPMD on `saas_application_performance.degraded`) has `target_domain_module_id=null`. The fix lives on DEM (target side owes a target module) but is blocked by M1. NPMD source side (`source_domain_module_id=null`) is the NPMD B10b fix.
- **B10b FAIL** all 4 outbound handoffs have `source_domain_module_id=null` (blocked by M1). 1 inbound has `target_domain_module_id=null` (also blocked by M1). One outbound (664 to ITSM) has `target_domain_module_id=38` (ITSM-INCIDENT-MGMT) resolved; the AIOPS / OBS targets are null on both sides.
- **B11 FAIL** zero `data_object_aliases` rows. Non-self-explanatory masters expected to carry aliases: `endpoint_experience_scores` (DEX score, endpoint health score, employee experience score), `synthetic_monitoring_results` (uptime check, synthetic transaction, scripted browser test, robotic monitoring), `real_user_sessions` (RUM session, browser telemetry session, end-user session), `digital_friction_events` (slow event, hung-process event, productivity-blocker event), `endpoint_anomaly_findings` (endpoint anomaly, EUEM finding, DEX anomaly).
- **B12 FAIL** zero `data_object_lifecycle_states` across all 5 masters. The DEM telemetry surface is largely append-only event records (low workflow), but at minimum: `endpoint_anomaly_findings` (detected, acknowledged, resolved / suppressed) has a real workflow with publication semantics. `endpoint_experience_scores` is plausibly config-shaped (rolling computed metric, no per-row lifecycle), as are `real_user_sessions` and `synthetic_monitoring_results`. Bucket 2 covers the config-shape exemption decision.
- **C1 PASS** 1 owner (`IT Infrastructure`) + 1 contributor (`Software Engineering`).
- **C2 PASS** no overrides recorded, but with zero capabilities the check is vacuous.
- **D1** UI spot-check, none of the data has been loaded with `record_status='approved'` (legacy seed data, all `new` by default).
- **E1 through E6 FAIL** vacuously, no modules means no `role_modules` rows can exist. No persona is bundled against DEM today.
- **F1 FAIL** legacy domain-level system skill `dem-system` (id 47, `domain_module_id=null`) exists. Once modules ship, this must retire in favor of per-module system skills.
- **F2 FAIL** module count is 0, expected skills count is 0, current is 1 (legacy). Cannot satisfy F2 without M1.
- **F3 PASS** the legacy skill has 5 `skill_tools` rows (one `query_*` primitive per master). Functionally adequate but anchored on the wrong skill (domain-level instead of module-level).
- **F4 PASS** all 5 tools satisfy the `operation_kind` to `data_object_id` invariant (`query` + `data_object_id` set, `coverage_tier='platform'` across the board).
- **F5** computable on the legacy skill: `strict_score = 5/5 = 1.0`, `operational_score = 5/5 = 1.0`. Will need to be recomputed per module once the M-band lands; tools transfer cleanly.
- **F7 PASS** zero channel primitives linked (no `send_email`, `send_sms`, `post_chat_message`, etc.). Nothing to swap.
- **H1 FAIL** of 5 cross-domain handoffs (4 outbound + 1 inbound), zero have `handoff_processes` rows. Coverage 0 / 5 = 0%, approved count 0. Expected throughput from this audit: 3 to 4 new `agent_curated` tags, 1 deferral. See APQC TAGGING in Bucket 1 (B1-H1).

### Pass 2, Market audit (semantic)

Flagship-vendor surface enumerated independently of the catalog: Catchpoint, ThousandEyes (Cisco), Splunk Synthetics, Dynatrace DEM (RUM + Synthetic), New Relic Browser + Synthetic, Datadog RUM + Synthetic, Akamai mPulse, AppNeta (Broadcom), Riverbed Aternity. Boundary with the Digital Employee Experience (DEX) category is a genuinely open scope question (see Bucket 2 #2): Nexthink, 1E, ControlUp Edge DX, Lakeside SysTrack, HappySignals overlap heavily but sell into a distinct persona (IT Ops vs SRE / web-ops); the DEX category has been queued as a candidate.

Vendor surface matrix (union, snake_case_plural names, classified):

| Entity | Class | Notes |
| --- | --- | --- |
| endpoint_experience_scores | Core | Already mastered |
| synthetic_monitoring_results | Core | Already mastered |
| real_user_sessions | Core | Already mastered |
| digital_friction_events | Core | Already mastered |
| endpoint_anomaly_findings | Core | Already mastered |
| synthetic_monitors | Common | The monitor definitions (script, schedule, locations, target URL), distinct from the per-run results. Catchpoint / ThousandEyes / Datadog / Dynatrace all ship them as separate first-class. MISSING. |
| monitoring_locations | Common | The probe / agent vantage points (POPs, cloud regions, ISPs, last-mile probes). Catchpoint enumerates 700+ nodes. MISSING. |
| page_load_events | Common | Page-level RUM events as a first-class entity sitting between `real_user_sessions` and individual web vital measurements. Dynatrace / New Relic / Datadog all ship it. MISSING. |
| web_vitals | Common | The standardized Core Web Vitals metric records (LCP, FID, CLS, INP). Distinct from raw page loads. MISSING. |
| performance_baselines | Common | The dynamic baselines DEM tools compute and compare scores / sessions / synthetic runs against. MISSING. |
| sla_compliance_records | Specialist | Periodic rollups of uptime / SLO compliance for SaaS reachability. Catchpoint / AppNeta / Akamai mPulse all surface them. MISSING. |
| device_health_summaries | Specialist | Per-device rollups of CPU / memory / GPU / battery / storage health that feed into the experience score. Lakeside SysTrack / Nexthink ship them; overlaps the DEX boundary. MISSING. |
| application_response_traces | Specialist | App-level traces from the endpoint to the SaaS backend (Aternity Network Path Analysis style). Overlaps APM. MISSING. |

#### Findings

- **MISSING entities (Phase 0 pending, vendor-research vetting needed before load):** `synthetic_monitors`, `monitoring_locations`, `page_load_events`, `web_vitals`, `performance_baselines`, `sla_compliance_records`, `device_health_summaries`, `application_response_traces`. All show up in the union surface across the flagship set; they are surfaced in Bucket 3 because Phase 0 has not been formally run for DEM and a couple sit on contested boundaries (DEX, APM, UEM).
- **WRONG-OWNERSHIP:** none in this pass.
- **SCOPE-CREEP:** none; the 5 existing masters all sit cleanly inside the DEM market scope.
- **MODULARIZATION-ISSUE (BLOCKING):** DEM has zero modules. The market shape implies at minimum 2 modules: DEM-ENDPOINT-EXPERIENCE (endpoint_experience_scores, endpoint_anomaly_findings, digital_friction_events, plus device_health_summaries if it loads) and DEM-WEB-EXPERIENCE (synthetic_monitoring_results, real_user_sessions, plus synthetic_monitors, monitoring_locations, page_load_events, web_vitals if they load). A third candidate DEM-SAAS-REACHABILITY (sla_compliance_records, application_response_traces) makes sense once the SaaS-monitoring entities materialize. Surfaced as Bucket 2 #1 (judgment call on the split).

### Pass 3, Neighbor discovery (auto-derived edge weights)

| Neighbor | Outbound handoffs | Inbound handoffs | DMDO dependencies | Edge weight |
| --- | --- | --- | --- | --- |
| AIOPS | 2 | 0 | (none) | 2 |
| OBS | 1 | 0 | (none) | 1 |
| ITSM | 1 | 0 | (none, ITSM target module wired) | 1 |
| NPMD | 0 | 1 | (none) | 1 |

No neighbor reaches edge weight >= 3, so the full four-leg analysis is not triggered. A one-line summary per neighbor is sufficient at this audit's depth.

- **AIOPS (weight 2):** DEM publishes `endpoint_anomaly_finding.published` (665, payload `endpoint_anomaly_findings`) and `real_user_session.poor_experience` (667, payload `real_user_sessions`). Both have `source_domain_module_id=null` (M1 blocks) and `target_domain_module_id=null` (AIOPS M1 blocks, separately audited). No symmetric AIOPS->DEM feedback path modeled (e.g. AIOPS suggesting a sensor / probe tweak); plausible but not flagship-vendor evidenced; not surfaced as a fix.
- **OBS (weight 1):** DEM publishes `synthetic_monitoring_result.failed` (666, payload `synthetic_monitoring_results`) into OBS. Both module FKs are null. OBS aggregates uptime / availability series alongside DEM synthetic; relationship is one-way for now.
- **ITSM (weight 1):** DEM publishes `endpoint_experience_score.degraded` (664) with payload `service_incidents` (id 47, mastered by ITSM). `target_domain_module_id=38` is wired (ITSM-INCIDENT-MGMT), `source_domain_module_id=null` (M1 blocks). Pattern is "DEM degradation auto-creates a proactive ITSM ticket"; consistent with the BigPanda / Nexthink / Aternity vendor patterns.
- **NPMD (weight 1, inbound):** NPMD publishes `saas_application_performance.degraded` (653) with payload `saas_application_performance` (NPMD master). Both module FKs are null. DEM consumes the signal to elevate experience-score anomalies, but no `consumer` DMDO row records the dependency (M1 blocks). Surface as a fix once M1 is cleared.

### Bucket 1, In-scope confirmed gaps

| Item | Type | Description |
| --- | --- | --- |
| B1-S1 | STRUCTURAL (CLAUDE.md violation) | PATCH `domains.business_logic` (id=83) to remove the U+2014 em-dash. Proposed: "Endpoint-agent runtime, synthetic transaction generation, and correlation across user / device / app / network signals: code-dominant data plane." |
| B1-A2 | STRUCTURAL | Author 5 to 7 `capabilities` for DEM and link via `capability_domains`. Proposed codes: DEM-ENDPOINT-EXPERIENCE-SCORING, DEM-SYNTHETIC-MONITORING, DEM-REAL-USER-MONITORING, DEM-DIGITAL-FRICTION-DETECTION, DEM-ENDPOINT-ANOMALY-DETECTION, DEM-SAAS-REACHABILITY-MONITORING. |
| B1-A3 | STRUCTURAL | Author the flagship `solutions` rows and `solution_domains` links with coverage_level: Catchpoint (primary), ThousandEyes (primary), Dynatrace DEM (primary), New Relic Browser + Synthetic (primary), Datadog RUM + Synthetic (primary), Splunk Synthetics (secondary), Akamai mPulse (secondary), AppNeta (secondary), Riverbed Aternity (secondary, overlaps DEX). Reuse existing `vendors` rows where the company is already in the catalog. |
| B1-A4 | STRUCTURAL | Draft `catalog_tagline` and `catalog_description` per Rule #20 (buyer voice). Surface drafts to user before writing. |
| B1-M1 | STRUCTURAL (BLOCKING) | Author at least 2 `domain_modules` rows (the 2+ floor applies once capabilities >= 3): DEM-ENDPOINT-EXPERIENCE and DEM-WEB-EXPERIENCE as the minimal split. Optionally a 3rd DEM-SAAS-REACHABILITY. Every other M-band, B-band module-anchored, E-band, F2 fix depends on this. |
| B1-B4 | STRUCTURAL | Re-evaluate pattern flags on all 5 masters per Rule #12 (per-row positive review). Proposed: set `has_personal_content=true` on `real_user_sessions`, `digital_friction_events`, `endpoint_experience_scores`. `has_submit_lock` and `has_single_approver` remain false across DEM (telemetry, no human authoring / approval workflow). |
| B1-B6 | STRUCTURAL | Author intra-domain `data_object_relationships`: `digital_friction_events contributes_to endpoint_experience_scores`, `real_user_sessions contributes_to endpoint_experience_scores`, `synthetic_monitoring_results contributes_to endpoint_experience_scores`, `endpoint_anomaly_findings correlates_with digital_friction_events`. Approx 4 edges. |
| B1-B7 | STRUCTURAL | Author `users` edges per Rule #10: `users observes endpoint_experience_scores`, `users generates real_user_sessions`, `users experiences digital_friction_events`. 3 rows. |
| B1-B8 | STRUCTURAL | Author outbound cross-domain `data_object_relationships` (mirrors of the 4 outbound handoffs): `endpoint_experience_scores triggers service_incidents` (DEM to ITSM), `endpoint_anomaly_findings published_to endpoint_anomaly_findings` (DEM to AIOPS, same data_object, asymmetric consumer DMDO), `real_user_sessions flagged_to anomaly_detections` (DEM to AIOPS), `synthetic_monitoring_results published_to synthetic_monitoring_results` (DEM to OBS, same data_object). 4 rows. |
| B1-B9 | STRUCTURAL | Resolve trigger event 680 `digital_friction_event.recorded` orphan: either DELETE if the event is not actually published, or author the missing `handoffs` row (most plausible: DEM to ITSM proactive ticket per the event description). Plus add plausible state-transition events: `endpoint_experience_score.recovered`, `synthetic_monitoring_result.recovered`, `endpoint_anomaly_finding.resolved`, `endpoint_anomaly_finding.suppressed`. Approx 4 to 5 new event rows. |
| B1-B10b | STRUCTURAL | After M1 lands, run a B10b backfill to set `source_domain_module_id` on the 4 outbound handoffs and `target_domain_module_id` on the 1 inbound handoff (653 from NPMD). Deterministic derivation per the reference loader [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts). |
| B1-B11 | STRUCTURAL | Author `data_object_aliases` for the 5 non-self-explanatory masters: endpoint_experience_scores (DEX score, endpoint health score, employee experience score), synthetic_monitoring_results (uptime check, scripted browser test, robotic monitoring), real_user_sessions (RUM session, browser telemetry session), digital_friction_events (productivity-blocker event, slow event), endpoint_anomaly_findings (EUEM finding, DEX anomaly). Approx 10 to 12 alias rows. |
| B1-B12 | STRUCTURAL | Author `data_object_lifecycle_states` for `endpoint_anomaly_findings` (detected, acknowledged, resolved, suppressed) with `domain_module_id` set after M1. The other 4 masters are config-shape / append-only telemetry; surface the exemption decision in Bucket 2 (item #4) for user approval rather than auto-writing notes (Rule #15). |
| B1-F1 | STRUCTURAL | Retire the legacy `dem-system` skill row (`skills.id=47`, `domain_module_id=null`) once module-level system skills ship (the 5 `query_*` tools transfer cleanly to the per-module skills). |
| B1-F2 | STRUCTURAL | After M1 lands, author one `skill_type='system'` skill per module (`dem_endpoint_experience_agent`, `dem_web_experience_agent`, optionally `dem_saas_reachability_agent`). Each skill gets the appropriate `query_*` tools (already loaded, `coverage_tier='platform'`). Adds 2 to 3 `skills` rows. |
| B1-H1 | APQC TAGGING | Author 3 to 4 new `handoff_processes` rows with `proposal_source='agent_curated'`, `record_status='new'`. Per-handoff classifications: |

#### B1-H1, APQC TAGGING proposals

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 664 | DEM -> ITSM | endpoint_experience_score.degraded | service_incidents | Triage IT service delivery incidents | 1299 | confident L4 |
| 665 | DEM -> AIOPS | endpoint_anomaly_finding.published | endpoint_anomaly_findings | Operate IT user support | 295 | confident L3 |
| 666 | DEM -> OBS | synthetic_monitoring_result.failed | synthetic_monitoring_results | Select, deploy, and operate IT performance analytics tools | 1137 | confident L4 |
| 667 | DEM -> AIOPS | real_user_session.poor_experience | real_user_sessions | Operate IT user support | 295 | tentative L3, also a Discover candidate (no clean PCF for RUM workflow in cross-industry framework) |
| 653 | NPMD -> DEM (inbound) | saas_application_performance.degraded | saas_application_performance | Select, deploy, and operate IT performance analytics tools | 1137 | confident L4 (NPMD-side ownership; DEM target tag is in scope for this audit since DEM is the consumer recording the inbound signal) |

Deferred to Discover Pass 3: none of the above. Handoff 667 (RUM real-user session to AIOPS) is the only tentative match; the candidate PCF (295 `Operate IT user support`) is a reasonable cross-industry anchor but could be refined when the AIOPS audit revisits the inbound side.

### Bucket 2, Surface-for-user (judgment calls)

1. **Module split.** DEM has 0 modules today. Three candidate splits, ranked by analyst preference:
   - **(a) 2-module split:** DEM-ENDPOINT-EXPERIENCE (endpoint_experience_scores, endpoint_anomaly_findings, digital_friction_events) + DEM-WEB-EXPERIENCE (synthetic_monitoring_results, real_user_sessions).
   - **(b) 3-module split:** add DEM-SAAS-REACHABILITY (housing future `sla_compliance_records`, `application_response_traces`) only after the Bucket 3 SaaS-monitoring entities are confirmed.
   - **(c) Single-module:** keep DEM as one module given that all 5 masters are telemetry of the same conceptual surface (employee / customer digital experience). Rule #14's 2-module floor only applies once capability_count >= 3; since A2 currently shows zero capabilities, the threshold is not yet binding, and a single-module DEM is technically valid until the capabilities land.
   - Question for the user: (a), (b), or (c)? Each has a different downstream Phase B load.

2. **DEX-PLATFORM boundary.** Nexthink, 1E, ControlUp Edge DX, Lakeside SysTrack, HappySignals are commonly positioned as Digital Employee Experience (DEX) tools; Gartner currently treats DEX as distinct from DEM. The catalog has neither today (DEX-PLATFORM has been queued as a candidate in `audits/_missing-domains.md`). Decision: (i) absorb DEX into DEM (treat experience scoring + endpoint anomaly + digital friction as the DEM remit and reject the DEX candidate), or (ii) promote DEX-PLATFORM and migrate `endpoint_experience_scores` + `endpoint_anomaly_findings` + `digital_friction_events` to it (keep DEM scoped to RUM + Synthetic + SaaS reachability), or (iii) keep both with explicit overlap and let `solution_domains` express dual coverage where vendors straddle. The market currently positions DEX vendors as IT-Ops-focused and DEM vendors as SRE / web-ops-focused, suggesting (iii) is closest to vendor reality, but (i) is the smallest change to the catalog.

3. **Pattern flag confirmation.** B4 audit: confirm `has_personal_content=true` on `real_user_sessions`, `digital_friction_events`, `endpoint_experience_scores` (per-user / per-device telemetry containing identifiable usage patterns). `has_submit_lock` and `has_single_approver` stay false across all 5 masters (no human author / approval workflow). User to confirm; no notes column writes per Rule #15.

4. **Lifecycle exemption.** 4 of 5 DEM masters (endpoint_experience_scores, synthetic_monitoring_results, real_user_sessions, digital_friction_events) are append-only telemetry with no per-row workflow lifecycle (the scores / results / sessions roll forward, not transitioning state). `endpoint_anomaly_findings` is the lone master with a real publication / acknowledgement / resolution workflow (B12 fix authors states there). Decision: confirm the 4 config-shape exemptions; record the exemption in the audit / gap report rather than auto-writing `data_objects.notes` (Rule #15). User can later choose to write per-row approved notes if useful.

### Bucket 3, Phase 0 pending (speculative)

1. **Missing market-surface entities** (need a formal Phase 0 vendor-surface document before loading): `synthetic_monitors` (monitor definitions, distinct from per-run results), `monitoring_locations` (probe vantage points), `page_load_events` (page-level RUM, sits between `real_user_sessions` and per-metric records), `web_vitals` (Core Web Vitals LCP / FID / CLS / INP records), `performance_baselines` (dynamic baselines for anomaly detection), `sla_compliance_records` (uptime / SLO rollups for SaaS reachability), `device_health_summaries` (per-device CPU / memory / battery rollups, overlaps DEX), `application_response_traces` (endpoint-to-SaaS traces, overlaps APM-MONITORING). Vendor knowledge basis: Catchpoint, ThousandEyes, Dynatrace DEM, New Relic, Datadog, Splunk, Akamai mPulse, AppNeta, Aternity. Recommended verification: focused Phase 0 pass on DEM category leaders for entity surface; survivors become Bucket 1 in a follow-up audit. `device_health_summaries` and `application_response_traces` should NOT be loaded until Bucket 2 #2 (DEX boundary) and the APM-MONITORING candidate triage are resolved.

2. **DEX-PLATFORM candidate** queued in `audits/_missing-domains.md` (DEX-PLATFORM, new, mention_count 1; vendor evidence: Nexthink, 1E, ControlUp Edge DX, Lakeside SysTrack, HappySignals). Gates Bucket 2 #2. If promoted, gates ownership of `device_health_summaries` (Bucket 3 #1) and possibly of `digital_friction_events` / `endpoint_anomaly_findings` ownership migration from DEM.

3. **APM-MONITORING candidate** queued in `audits/_missing-domains.md` (APM-MONITORING, new, mention_count 1; vendor evidence: Datadog APM, Dynatrace APM, New Relic APM, AppDynamics, Elastic APM, Honeycomb, Instana). Note the existing `APM` domain code in the catalog is Application Portfolio Management (Apptio LeanIX, Ardoq), a different market entirely. APM-MONITORING covers the Application Performance Monitoring category. Gates ownership of `application_response_traces` (Bucket 3 #1).

### Cross-bucket dependencies

- **Bucket 2 #1 (module split) blocks every Bucket 1 fix that needs `domain_module_id` set:** B1-M1 (authoring), B1-B10b (per-module FK backfill), B1-B12 (lifecycle state `domain_module_id`), B1-F1 (legacy skill retirement), B1-F2 (per-module system skills).
- **Bucket 2 #2 (DEX boundary) interacts with Bucket 3 #1 and Bucket 3 #2:** if DEX-PLATFORM is promoted (Bucket 3 #2) and ownership of `device_health_summaries` migrates, the DEM module split (Bucket 2 #1) might collapse to a single module. The decision shape is "promote DEX-PLATFORM first, then re-audit DEM with the right module set" vs "keep DEX inside DEM and load all the surface here".
- **Bucket 3 #3 (APM-MONITORING promotion) gates ownership of `application_response_traces`** but does not block any other current Bucket 1 fix; it only matters once the speculative entity is loaded.
- **Bucket 2 #4 (lifecycle exemption)** interacts with B1-B12: the 4 config-shape exemptions reduce the lifecycle authoring surface from 5 masters to 1 (`endpoint_anomaly_findings` only).

### Per-bucket prompts

**After Bucket 1:** Fix these now? Reply 'all', 'just 1, 3, 5' (cite the B1-XX ids), or 'skip'. Note: B1-M1 is the blocking fix; without it B1-B10b / B1-B12 / B1-F1 / B1-F2 cannot complete cleanly. B1-S1 (em-dash PATCH) is a one-line fix and unblocks a CLAUDE.md violation already in the live catalog.

**After Bucket 2:** What's your call on each? In particular: (item 1) pick (a), (b), or (c) for the module split; (item 2) pick (i), (ii), or (iii) for the DEX boundary, and decide whether to triage the queued DEX-PLATFORM candidate now; (item 3) confirm pattern flag PATCHes per master; (item 4) confirm the 4 config-shape exemptions for B12.

**After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed; named candidates become Bucket 1 in the next pass. Recommend deferring `device_health_summaries` and `application_response_traces` until Bucket 2 #2 and the DEX-PLATFORM / APM-MONITORING triage land.

### Report-only follow-ups (owed by other domains)

- **NPMD B10b** owes per-module attribution on inbound handoff 653 (`source_domain_module_id` currently null). Also owes outbound cross-domain `data_object_relationships` row mirroring its publish into DEM (NPMD-side B8).
- **AIOPS B10b** owes per-module attribution on inbound handoffs 665, 667 (`target_domain_module_id` currently null on the AIOPS side). Also owes inbound cross-domain `data_object_relationships` rows mirroring DEM's publishes (AIOPS-side B8).
- **OBS B10b** owes per-module attribution on inbound handoff 666 (`target_domain_module_id` currently null on the OBS side). Also owes inbound cross-domain `data_object_relationships` row mirroring DEM's publish (OBS-side B8).
- **ITSM B8** owes inbound cross-domain `data_object_relationships` row mirroring DEM's publish on handoff 664 (`endpoint_experience_scores triggers service_incidents`). ITSM's target_domain_module_id is already wired (38 = ITSM-INCIDENT-MGMT), no B10b fix is owed there.
- **NPMD B10b / AIOPS B10b / OBS B10b are blocked on the same M1 gating that DEM faces:** each side cannot complete its `domain_module_id` attribution until its own M-band has at least one module. Where the other side already has modules (AIOPS does not yet; OBS / NPMD status unknown without running their own audits), this is a one-PATCH fix.
