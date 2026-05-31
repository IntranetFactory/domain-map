---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 34
---

# NPMD - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint** (live PostgREST):
  - Domain row: NPMD (id 82), parent ITOM (id 2). `domains.description` populated. `domains` business metadata populated (crud_percentage=20, business_logic non-empty, min_org_size `30 m <2500`, cost_band `$$$`, certification_required=false, usa_market_size_usd_m=2000, market_size_source_year=2025).
  - `catalog_tagline`, `catalog_description`: BOTH empty (A4 fail).
  - `capability_domains`: **0 rows** (A2 fail).
  - `solution_domains`: **0 rows** (A3 fail). No NPM-shaped solution rows exist in the catalog at all (Cisco ThousandEyes, Kentik, Catchpoint, NETSCOUT, Broadcom DX NetOps, SolarWinds NPM, LiveAction, Riverbed Aternity Network all absent).
  - `domain_modules`: **0 rows** (M1 hard fail). `domain_module_host_domains`: 0 rows.
  - `domain_data_objects` (legacy rollup): 8 masters, all `master + required`: `network_flow_records`, `network_paths`, `network_performance_metrics`, `network_performance_alerts`, `network_interfaces`, `saas_application_performance`, `network_topology_snapshots`, `network_baseline_thresholds`.
  - `domain_module_data_objects`: **0 rows** (B-band partial: legacy rollup exists but the modularization junction is empty, follows from M1).
  - `data_object_lifecycle_states` for the 8 masters: **0 rows** (B12 fail).
  - `data_object_relationships` (intra-domain, users edges, cross-domain): **0 rows** (B6, B7, B8 fail).
  - `data_object_aliases` on the 8 masters: **0 rows** (B11 fail; `network_flow_records` and `saas_application_performance` are non-self-explanatory).
  - `trigger_events`: 9 rows authored on the 8 masters (one master, `network_interfaces`, carries 2 events; `network_paths` carries 1; `network_baseline_thresholds` carries 1).
  - `handoffs` outbound (source_domain_id=82): 6 rows, all `source_domain_module_id IS NULL` (B10b fail uniformly because M1 leaves nothing to attribute to). Targets: AIOPS (1), OBS (1), DEM (1), CMDB (1, has target_module=109), ITSM (2, both have target_module=38). One trigger event has no handoff at all (`network_path.degraded`, id 657), two events on `network_interfaces` have one handoff for `down` only (`flapping` event 661 has no handoff), one terminal-looking event has no handoff (`network_baseline_threshold.recalculated` 664).
  - `handoffs` inbound (target_domain_id=82): **0 rows**. NPMD declares no consumer/contributor/embedded_master rows so the catalog has no signal that anything is owed to it.
  - `handoff_processes` (APQC tags) on the 6 outbound handoffs: **0 rows** (H1 fail).
  - `business_function_domains`: 1 row (IT Infrastructure as owner; C1 passes).
  - `domain_regulations`: 0 rows. NPMD is largely outside statutory framework but the audit should record this explicitly (no clear regulation gap).
  - `skills`: 1 row, `npmd-system` (id 87), `skill_type='system'`, `domain_module_id IS NULL` (F1 fail - legacy domain-level system skill that needs to be retired once module-level skills exist). 8 `skill_tools` rows, all `query_<entity>` for the 8 masters, all `coverage_tier='platform'`, all `requirement_level='required'`.
  - `roles` / `role_modules` / `role_permissions` for NPMD: 0 / 0 / 0 (E1-E6 vacuously pass while M1 fails, since the 2-module floor blocks role authoring anyway).
  - `domain_aliases`: 0 rows.

- **Vendor-surface basis** (flagship vendors enumerated for the semantic pass): Cisco ThousandEyes (synthetic + BGP + internet path; SaaS performance leader), Kentik (NetFlow at scale, peering and CDN visibility), Catchpoint (synthetic + last-mile DEM, ISP and CDN observability), NETSCOUT nGeniusONE (packet-broker + application-aware NPM, telco-grade), Broadcom DX NetOps (large-enterprise device and flow), LiveAction LiveNX (SD-WAN-aware enterprise NPM). Vendor surface inferred from public product documentation; no formal Phase 0 doc has been run for NPMD.

- **Bucket 1 (in-scope, agent fixable):** 18 items.
- **Bucket 2 (surface-for-user, judgment):** 9 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

Pass-level verdict: NPMD is a stub. The domain row plus 8 masters plus 9 trigger events plus 6 outbound handoffs plus a legacy domain-level system skill exist; everything else (modules, capabilities, solutions, APQC tags, lifecycle, relationships, aliases, regulations, roles) is empty. Phase 0 vendor research was never run. M1 is the structural gate: until at least one full `domain_modules` row exists for NPMD, Phase B / E / F cannot pass and Phase A cannot complete.

### Vendor surface basis (semantic pass)

Pure-play NPM specialists chosen over diversified suites: Cisco ThousandEyes (acquired 2020; SaaS / internet path / BGP), Kentik (NetFlow + peering + CDN), Catchpoint (synthetic + last-mile + ISP/CDN observability), NETSCOUT nGeniusONE (packet broker + application-aware, telco-grade), Broadcom DX NetOps (large-enterprise device + flow), LiveAction LiveNX (SD-WAN-aware enterprise NPM with packet capture). Cisco ThousandEyes anchors the SaaS/internet leg, NETSCOUT anchors the packet-broker / telco leg, Kentik anchors the cloud-scale NetFlow leg. SolarWinds NPM and Riverbed Aternity Network are present in the market but the leader quadrant skews toward the six above.

### Pass 1 - Structural findings (per-domain completeness checklist)

#### S. Coverage sweep

| Table | FK column | NPMD rows | Expected non-zero? | Routes to |
| --- | --- | --- | --- | --- |
| `domain_data_objects` | domain_id | 8 | yes | B1 passes |
| `domain_modules` | domain_id | 0 | yes | **M1 hard fail** |
| `domain_module_host_domains` | domain_id | 0 | sometimes | no finding |
| `capability_domains` | domain_id | 0 | yes | **A2 fail** |
| `solution_domains` | domain_id | 0 | yes | **A3 fail** |
| `business_function_domains` | domain_id | 1 | yes | C1 passes |
| `domain_regulations` | domain_id | 0 | sometimes | Bucket 2 question |
| `handoffs` source_domain_id | source | 6 | yes | partial B9 pass |
| `handoffs` target_domain_id | target | 0 | usually | B10 report-only |
| `skills` (legacy domain_id) | domain_id | 1 | no (target = 0) | **F1 fail** |
| `domain_aliases` | domain_id | 0 | sometimes | Bucket 2 |
| `domains.parent_domain_id` | parent | 1 (ITOM) | sometimes | no finding |

**S2 / S3** cannot run meaningfully: S2 requires modules (zero), and S3's lifecycle / event / alias counts are zero across the board for every master (routes to B9, B11, B12 below).

#### A. Phase A - Market shape

- **A1** PASS. All seven `domains` business-metadata fields populated.
- **A2** FAIL. 0 `capability_domains` rows. Target: 5-8 noun-phrase capabilities (e.g. `flow-analysis`, `path-tracing`, `network-baseline`, `synthetic-monitoring`, `bgp-route-monitoring`, `saas-performance`, `network-anomaly-detection`).
- **A3** FAIL. 0 `solution_domains` rows. No NPM-shaped `solutions` exist in the catalog. Phase A needs to add Cisco ThousandEyes, Kentik, Catchpoint, NETSCOUT nGeniusONE, Broadcom DX NetOps, LiveAction LiveNX, plus their `vendors` rows, plus `solution_domains` with coverage_level.
- **A4** FAIL. `catalog_tagline` and `catalog_description` both empty. Draft both fields per Rule #20 voice rule, surface to user before writing.
- **A5** opt-in; not run.

#### M. Phase M - Modules (Rule #14)

- **M1** HARD FAIL. Zero `domain_modules` rows. NPMD has 0 capabilities loaded (A2), so the post-A2 floor is exactly 1 full module; once capabilities are loaded the count may need to rise to >=2 if >=3 capabilities are confirmed.
- **M2 - M7** vacuously fail downstream of M1. M7 catalog-wide single-master check can still be run on the 8 NPMD masters: all 8 appear in `domain_data_objects` only (no DMDO rows anywhere), so no double-mastering hazard exists yet.

Proposed module split (subject to user review under Bucket 2):

| Module code | Module name | Masters | Capabilities realized |
|---|---|---|---|
| `NPMD-FLOW-ANALYSIS` | NetFlow / sFlow / IPFIX flow analysis | `network_flow_records`, `network_interfaces` | flow-analysis, interface-utilisation |
| `NPMD-PATH-TRACING` | Path tracing and topology | `network_paths`, `network_topology_snapshots` | path-tracing, topology-snapshotting, bgp-route-monitoring |
| `NPMD-METRICS-ALERTS` | Performance metrics, baselines, alerts | `network_performance_metrics`, `network_performance_alerts`, `network_baseline_thresholds` | metric-collection, dynamic-baseline, performance-alerting |
| `NPMD-SAAS-INTERNET-PERF` | SaaS and internet performance | `saas_application_performance` | synthetic-monitoring, saas-performance |

#### B. Phase B - Data-object footprint

- **B1** PASS (8 masters exist).
- **B2** PASS. All 8 masters have `singular_label` and `plural_label` populated. Note: `saas_application_performance` carries plural `SaaS Application Performances`, which reads awkwardly (the bare-noun is mass / abstract); Bucket 2 item.
- **B3** FAIL. None of the 8 masters has been arbitrated against Rule #9 collisions. All 8 are `<prefix>_<noun>` shapes so the prefix path is open, but `is_canonical_bare_word=false` and `naming_authority_rationale=''` are the database defaults (i.e. no positive review). Specifically: `network_interfaces` collides on the bare word `interfaces` (likely a software/UI concept elsewhere); `saas_application_performance` overlaps `application_performance` which is the APM domain headline. Surface to user before any rename.
- **B4** FAIL (audit obligation). All three pattern flags are false on all 8 masters; flags must be positively re-evaluated, not left at default. None of these masters appear to carry personal content, submit locks, or single-approver workflow (they are signal streams), so the expected post-review state is `false` across all three on all 8 - but the audit needs to record the positive review.
- **B5** PASS (no `embedded_master` rows exist - 0/0).
- **B6** FAIL. 0 intra-domain `data_object_relationships` rows. Expected edges: `network_paths` traverses `network_interfaces`; `network_performance_alerts` raised_from `network_performance_metrics`; `network_performance_metrics` derived_from `network_flow_records`; `network_baseline_thresholds` applies_to `network_performance_metrics`; `network_topology_snapshots` contains `network_interfaces`; `saas_application_performance` correlated_with `network_paths`.
- **B7** FAIL. 0 `users` edges. Expected (per Rule #10): `network_performance_alerts` -> `users` (alert_acknowledger, owner), `network_baseline_thresholds` -> `users` (threshold_owner), `saas_application_performance` -> `users` (saas_application_owner, in this catalog's `users` only).
- **B8** FAIL (outbound only). Six outbound `handoffs` exist; zero corresponding `data_object_relationships` rows. Cross-domain payload edges expected:
  - `network_flow_records spawns aiops_signals` (NPMD -> AIOPS)
  - `network_performance_metrics emits telemetry_streams` (NPMD -> OBS)
  - `saas_application_performance degrades digital_experience_sessions` (NPMD -> DEM)
  - `network_topology_snapshots reconciles configuration_items` (NPMD -> CMDB)
  - `network_performance_alerts triggers service_incidents` (NPMD -> ITSM, x2 events)
- **B9** PARTIAL. 9 trigger events authored, 6 handoffs exist. Missing: `network_path.degraded` (657) has no handoff; `network_interface.flapping` (661) has no handoff; `network_baseline_threshold.recalculated` (664) has no handoff (likely terminal / leaf - acceptable as leaf).
- **B9b** vacuously not applicable: <2 modules to draw intra-domain handoffs across. Once modules ship (M1 fix), B9b becomes load-bearing: every cross-master event chain between proposed modules NPMD-FLOW-ANALYSIS -> NPMD-METRICS-ALERTS -> NPMD-PATH-TRACING needs an intra-domain handoff row.
- **B10** REPORT-ONLY. 0 inbound handoffs and no consumer/contributor/embedded_master dependencies on NPMD, so the discovery query yields zero owed inbound rows. (NPMD does not depend on anyone else's masters; it is a signal producer.)
- **B10b** FAIL. All 6 outbound handoffs have `source_domain_module_id IS NULL` because no NPMD modules exist (cured by M1 fix + per-master attribution). The two ITSM-bound handoffs (649, 652) and the CMDB-bound (654) carry `target_domain_module_id` filled; AIOPS (649 wait, 649 is to AIOPS), OBS (651), and DEM (653) targets all have `target_domain_module_id IS NULL` because none of AIOPS / OBS / DEM has modules yet (report-only to those domains' M1 backlog).
- **B11** FAIL. 0 aliases. Targets for alias rows: `network_flow_records` (synonyms `flow records`, `NetFlow records`, `IPFIX records`, `sFlow samples`), `network_paths` (`L3 paths`, `routing paths`, `hop traces`), `network_performance_metrics` (`KPIs`, `telemetry`, `network telemetry`), `saas_application_performance` (`SaaS DEM`, `SaaS health`, `internet performance`), `network_topology_snapshots` (`network maps`, `topology maps`, `discovery snapshots`), `network_baseline_thresholds` (`baselines`, `dynamic thresholds`, `anomaly bounds`).
- **B12** FAIL. 0 lifecycle states for all 8 masters. Most NPMD masters are signal-shaped (flow records, metrics, baselines) - they are config-shaped or write-once / stream-shaped and likely exempt under the config-shape carve-out. `network_performance_alerts` is the exception: it has a real lifecycle (`open -> acknowledged -> resolved -> closed`, with `requires_permission=true` on `acknowledge` and `resolve`). Surface exemption decisions to user (Rule #15 forbids auto-annotating the exemption in `notes`).

#### C. Phase C - Functional ownership

- **C1** PASS. `IT Infrastructure` is owner. Likely needs `IT Operations / NOC` as a contributor and `Security` as a consumer (NDR / threat-hunting use of NetFlow); surface to user.
- **C2** vacuously passes (no capabilities loaded; routes to A2).

#### D. UI spot-check

Not run as part of this audit pass; agent only loads after user approval.

#### E. Roles and permission bundling

All E1-E6 vacuously pass because M1 fail blocks role authoring (2-module floor). Once modules ship, expected roles: `NETWORK-OPS-NOC-ENGINEER` (`role_modules` across all NPMD modules), `NETWORK-OPS-NETWORK-ARCHITECT` (primary on `NPMD-PATH-TRACING` and `NPMD-METRICS-ALERTS`).

#### F. Skill-layer integrity

- **F1** FAIL. Legacy `npmd-system` (id 87) exists with `domain_id=82, domain_module_id IS NULL`. Per Rule #17 the target state is one `skill_type='system'` skill per `domain_modules` row; once modules ship and per-module system skills are authored, the legacy row needs to be retired.
- **F2-F5** vacuously fail downstream of M1. Per-module system skills cannot be authored without modules; the F-band cannot pass.
- **F7** vacuously passes (8 existing `skill_tools` are all `query_<entity>`, no channel primitives).

#### H. APQC tagging

- **H1** FAIL. 0 `handoff_processes` rows across the 6 outbound handoffs. Volume expectation: 0.5N to 0.8N = 3-5 agent_curated tags for NPMD's 6 outbound handoffs. Proposed tags below in Bucket 1.

### Pass 2 - Market audit findings

Vendor surface union across Cisco ThousandEyes / Kentik / Catchpoint / NETSCOUT / Broadcom DX NetOps / LiveAction, snake_case_plural:

| Entity | Category | Status |
| --- | --- | --- |
| `network_flow_records` | master | present |
| `network_paths` | master | present |
| `network_performance_metrics` | master | present |
| `network_performance_alerts` | master | present |
| `network_interfaces` | master | present |
| `saas_application_performance` | master | present |
| `network_topology_snapshots` | master | present |
| `network_baseline_thresholds` | master | present |
| `synthetic_tests` | master | **MISSING** (Cisco ThousandEyes, Catchpoint, NETSCOUT - all flagship vendors master this) |
| `synthetic_test_runs` | master | **MISSING** (results per scheduled probe) |
| `bgp_route_observations` | master | **MISSING** (ThousandEyes Internet Insights, Kentik) |
| `network_devices` | master / embedded_master | **MISSING** (catalog has `assets` and CMDB CIs but no network-device row dedicated to NPM's view, where SNMP credentials and polling profiles attach; could be consumer of CMDB `configuration_items`) |
| `network_probes` | master | **MISSING** (the synthetic agents themselves: cloud-PoP vs on-prem appliance vs endpoint) |
| `packet_captures` | master | **MISSING** (NETSCOUT / LiveAction; conditional capture artifacts) |
| `network_sites` | master / embedded_master | **MISSING** (location grouping for SD-WAN edge correlation; likely embedded_master from `locations`) |
| `wan_circuits` | master | **MISSING** (carrier circuit IDs, MPLS / DIA / broadband mapping; tightly coupled to SD-WAN orchestration which doesn't exist as a domain yet) |
| `cloud_provider_regions` | embedded_master | **MISSING** (ThousandEyes Cloud and ISP data; Kentik cloud peering) |
| `traffic_classifications` | master | **MISSING** (application identification, QoS classes; especially LiveAction / NETSCOUT) |
| `network_kpi_definitions` | master | **MISSING** (named KPI definitions distinct from raw metric series) |

#### Vendor surface findings

- **MISSING**: see table above (10 entities suggested). Highest-confidence: `synthetic_tests` + `synthetic_test_runs` (every flagship), `bgp_route_observations` (Cisco ThousandEyes Internet Insights signature surface), `packet_captures` (NETSCOUT / LiveAction; differentiates packet-broker NPM from flow-only).
- **WRONG-OWNERSHIP**: none observable yet (modularization not started, no entity has been mis-assigned because nothing has been assigned).
- **SCOPE-CREEP**: `saas_application_performance` partially overlaps DEM (id 83). Question: is this the NPMD master (network-side perspective: latency / loss to SaaS endpoint) or the DEM master (endpoint perspective: page-load, user transactions)? Surface to user.
- **MODULARIZATION-ISSUE**: modularization has not happened. Proposed 4-module split is in Bucket 2.

### Pass 3 - Neighbor discovery

Edge weights via outbound handoffs (inbound is 0):

| Neighbor | Edge weight | Source |
| --- | --- | --- |
| ITSM | 2 | handoffs 650 (`network_performance_alert.raised`), 652 (`network_interface.down`) - both -> ITSM-INCIDENT-MGMT |
| AIOPS | 1 | handoff 649 (`network_flow_record.anomalous_pattern`) |
| OBS | 1 | handoff 651 (`network_performance_metric.threshold_breached`) |
| CMDB | 1 | handoff 654 (`network_topology_snapshot.updated`) -> CMDB-SERVICE-MAPPING (id 109) |
| DEM | 1 | handoff 653 (`saas_application_performance.degraded`) |

No neighbor reaches edge weight >= 3; per the audit procedure, all five neighbors get one-line summaries rather than full 5-section diffs.

#### Pairwise summaries (weight 1-2)

- **NPMD -> ITSM** (weight 2): both handoffs target `ITSM-INCIDENT-MGMT` (id 38); payload is `service_incidents` (id 47); integration_pattern `api_call`. Source_domain_module_id NULL (cured by M1 fix); target_domain_module_id populated. Cross-domain relationship row missing (`network_performance_alerts triggers service_incidents`, `network_interfaces triggers service_incidents`). B8 outbound finding.
- **NPMD -> AIOPS** (weight 1): event_stream, low friction. Target module NULL because AIOPS has no modules. Cross-domain relationship row missing.
- **NPMD -> OBS** (weight 1): event_stream, low friction. Target module NULL because OBS has no modules. Cross-domain relationship row missing.
- **NPMD -> CMDB** (weight 1): batch_sync, medium friction, target_module 109 (CMDB-SERVICE-MAPPING) populated. Cross-domain relationship row missing.
- **NPMD -> DEM** (weight 1): event_stream, medium friction. Target module NULL because DEM has no modules. Cross-domain relationship row missing.

### Pass 4 - Pairwise reconciliation

No neighbor at weight >= 3; full 5-section diff skipped per procedure.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL (band failures)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | Zero `domain_modules` rows. Until modules exist, M2-M7, B-band DMDO writes, B9b, E1-E6, F2-F5 cannot pass. | Author 4-module split (`NPMD-FLOW-ANALYSIS`, `NPMD-PATH-TRACING`, `NPMD-METRICS-ALERTS`, `NPMD-SAAS-INTERNET-PERF`) and load via a Phase-A loader. Default to 4 modules pending Bucket 2 decision. |
| B1-S2 | A2 | Zero `capability_domains` rows. | Author 5-8 capabilities (`flow-analysis`, `path-tracing`, `bgp-route-monitoring`, `metric-collection`, `dynamic-baseline`, `performance-alerting`, `synthetic-monitoring`, `saas-performance`) and link via `capability_domains` + `domain_module_capabilities`. |
| B1-S3 | A3 | Zero `solution_domains` rows; no NPM solutions in the catalog. | Add `vendors` + `solutions` for Cisco ThousandEyes, Kentik, Catchpoint, NETSCOUT nGeniusONE, Broadcom DX NetOps, LiveAction LiveNX, plus `solution_domains` with coverage_level. |
| B1-S4 | A4 | `catalog_tagline` and `catalog_description` empty. | Draft both per Rule #20 buyer voice. Surface to user before write. |
| B1-S5 | B3 | None of 8 masters has been arbitrated under Rule #9. `network_interfaces` and `saas_application_performance` have collision risk (bare-word `interfaces` and overlap with APM, respectively). | Decide per master: prefix is already in place, just stamp `is_canonical_bare_word=false` after positive review and capture per-master review evidence outside `notes` (Rule #15). |
| B1-S6 | B4 | Pattern flags `has_personal_content`, `has_submit_lock`, `has_single_approver` are default-false on all 8 masters with no positive review. | Record positive review per master; expected post-review state is `false` across all flags on all 8 (signal-stream masters have none of these patterns). |
| B1-S7 | B6 | 0 intra-domain `data_object_relationships` edges. | Author 6 edges: `network_paths traverses network_interfaces`, `network_performance_alerts raised_from network_performance_metrics`, `network_performance_metrics derived_from network_flow_records`, `network_baseline_thresholds applies_to network_performance_metrics`, `network_topology_snapshots contains network_interfaces`, `saas_application_performance correlated_with network_paths`. Cardinality and required-side per draft loader. |
| B1-S8 | B7 | 0 `users` edges (Rule #10). | Author 3 edges: `network_performance_alerts -> users` (alert_acknowledger), `network_baseline_thresholds -> users` (threshold_owner), `saas_application_performance -> users` (application_owner). |
| B1-S9 | B8 | 0 cross-domain (outbound) `data_object_relationships` for 6 outbound handoffs. | Author 5 edges (`network_flow_records spawns aiops_signals`, `network_performance_metrics emits telemetry_streams`, `saas_application_performance degrades digital_experience_sessions`, `network_topology_snapshots reconciles configuration_items`, `network_performance_alerts triggers service_incidents`, `network_interfaces triggers service_incidents`). NOTE: some target masters (`aiops_signals`, `telemetry_streams`, `digital_experience_sessions`) may not exist; gate the load on existence and route missing targets to the right domain's audit. |
| B1-S10 | B9 | 2 trigger events without `handoffs` rows: `network_path.degraded` (657) and `network_interface.flapping` (661). | Author both: `network_path.degraded` -> AIOPS + ITSM (event_stream + api_call); `network_interface.flapping` -> ITSM (api_call). `network_baseline_threshold.recalculated` (664) acceptable as leaf (no subscriber). |
| B1-S11 | B10b | All 6 outbound handoffs have `source_domain_module_id IS NULL`. Three (AIOPS, OBS, DEM) also have target NULL because those domains have no modules. | After M1 fix, run module-attribution backfill per `backfill_ats_handoff_modules_2026_05_23.ts` pattern. Source attribution maps event data_object -> NPMD module (per proposed split). Target NULLs for AIOPS / OBS / DEM are report-only on those domains. |
| B1-S12 | B11 | 0 `data_object_aliases` for 8 masters. | Author 12+ alias rows per the entity list in B11. |
| B1-S13 | B12 | 0 `data_object_lifecycle_states`. Only `network_performance_alerts` has a real workflow (`open -> acknowledged -> resolved -> closed`); other 7 are signal-stream / config-shape. | Load lifecycle states for `network_performance_alerts` (4 states, `requires_permission=true` on `acknowledge` and `resolve`). For other 7 masters, the audit records the config-shape exemption decision (surfaced to user; not auto-annotated). |
| B1-S14 | F1 | Legacy `npmd-system` skill (id 87) with `domain_module_id IS NULL` will become obsolete once per-module skills exist. | DELETE row 87 after authoring per-module system skills `npmd_flow_analysis_agent`, `npmd_path_tracing_agent`, `npmd_metrics_alerts_agent`, `npmd_saas_internet_perf_agent`. Migrate the 8 existing `skill_tools` rows to the per-module skills based on which master they target. |
| B1-S15 | F2/F3 | Once 4 modules ship, each needs exactly 1 `skill_type='system'` skill with >=1 `skill_tools`. | Author 4 per-module system skills (see B1-S14). Floor: `query_<entity>` for each module's masters plus `acknowledge_network_performance_alert` and `resolve_network_performance_alert` (workflow gates) on `npmd_metrics_alerts_agent`. |

#### APQC TAGGING

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|
| 649 | NPMD -> AIOPS | network_flow_record.anomalous_pattern | network_flow_records | Manage infrastructure performance and capacity | 20909 (id 1304) | confident L4 |
| 650 | NPMD -> ITSM | network_performance_alert.raised | service_incidents | Triage IT service delivery incidents | 20903 (id 1299) | confident L4 |
| 651 | NPMD -> OBS | network_performance_metric.threshold_breached | network_performance_metrics | Manage infrastructure performance and capacity | 20909 (id 1304) | confident L4 |
| 652 | NPMD -> ITSM | network_interface.down | service_incidents | Triage IT service delivery incidents | 20903 (id 1299) | confident L4 |
| 653 | NPMD -> DEM | saas_application_performance.degraded | saas_application_performance | Manage infrastructure performance and capacity | 20909 (id 1304) | L4 (or defer; SaaS-from-user-perspective is closer to DEM) |
| 654 | NPMD -> CMDB | network_topology_snapshot.updated | configuration_items | Manage infrastructure performance and capacity | 20909 (id 1304) | weak L4 - alt: defer to Discover (no clean PCF match for topology reconciliation) |

5 confident tags + 1 borderline. Volume target 3-5 confident: PASS.

### Bucket 2 - Surface-for-user (judgment calls)

1. **Modularization split.** Proposed 4-module split (NPMD-FLOW-ANALYSIS / NPMD-PATH-TRACING / NPMD-METRICS-ALERTS / NPMD-SAAS-INTERNET-PERF) or merge into 2 (`NPMD-CORE` carrying flow + path + metrics + alerts + baselines + topology + interfaces; `NPMD-SAAS-INTERNET-PERF` standalone)? 4-module split better reflects vendor surface (flow-vs-path-vs-metric-vs-SaaS-internet is a real product taxonomy across the leader quadrant) but adds 4 system skills, 4 capability junctions, 4 host rows. Independent of Bucket 3.
2. **`saas_application_performance` scope vs DEM.** This entity sits in NPMD today. Does it stay (network-side view: latency / loss to SaaS endpoint, ISP-PoP routing) or move to DEM (endpoint-side view: page-load times, user transactions)? Options: (a) keep in NPMD, NPMD's view is network-path-to-SaaS, DEM authors a parallel `digital_experience_sessions` for endpoint view; (b) move to DEM, NPMD becomes a contributor; (c) split into `network_path_to_saas_performance` (NPMD) and `saas_user_experience_sessions` (DEM). Affects Bucket 1 B1-S9 (which target master to relate to) and Bucket 3 vendor research.
3. **`network_devices` master.** ThousandEyes / NETSCOUT / Kentik all carry a network-device entity (router, switch, firewall, SD-WAN edge, packet broker) distinct from CMDB `configuration_items`. Options: (a) NPMD masters `network_devices` outright; (b) NPMD `embedded_master`s `network_devices` and lets CMDB master it later if CMDB adds device discovery; (c) NPMD consumes CMDB's existing `configuration_items` (id?) directly via filter. Decision affects whether `synthetic_tests` and `network_paths` reference a NPMD-owned device row or a CMDB row.
4. **B12 config-shape exemption for 7 of 8 masters.** `network_flow_records`, `network_paths`, `network_performance_metrics`, `network_interfaces`, `saas_application_performance`, `network_topology_snapshots`, `network_baseline_thresholds` are all stream / sampled / write-once. They have no acknowledge / resolve / close workflow. Confirm exemption decision (audit surfaces the decision; agent does not auto-annotate). Only `network_performance_alerts` carries a real lifecycle.
5. **Aliases - approve list.** Drafted aliases in B1-S12: 12+ rows across 6 masters. Bucket 2 because alias_name is a freeform string the user may want to refine (e.g. `network_flow_records` -> `flow records` vs `NetFlow records` vs `IPFIX records`).
6. **Catalog-tagline / catalog-description voice.** Per Rule #20: agent drafts, user approves before write. Draft proposal:
   - tagline: "Watch traffic, paths, and SaaS performance end-to-end across your network, so you spot trouble before users do."
   - description (3 paragraphs): paragraph 1 (workflow: collect flow records and path traces, baseline performance, raise alerts), paragraph 2 (SaaS / internet leg: track third-party performance from your users' perspective), paragraph 3 (handoffs: ticket on ITSM, signal AIOPS / OBS, reconcile CMDB topology).
7. **Regulations - intentional zero?** NPMD currently has zero `domain_regulations`. Most NPM tools are not directly regulated, but FedRAMP and PCI-DSS scope-of-monitoring obligations apply when NPMD covers payment-card traffic or federal-cloud workloads. Options: (a) leave at zero (NPM is regulation-adjacent, not regulation-driven), (b) add PCI-DSS scope-of-monitoring as an applicable regulation. Independent.
8. **F1 legacy skill (id 87, `npmd-system`) - migrate or delete outright.** The 8 existing `skill_tools` rows on id 87 are all `query_<entity>` and all `coverage_tier='platform'`. Options: (a) delete id 87 after authoring 4 per-module skills (B1-S14 default), (b) keep id 87 as a transitional domain-level skill while gradually authoring per-module skills. Bucket 1 currently assumes (a).
9. **C1 contributors / consumers.** `IT Infrastructure` is owner. Add `IT Operations / NOC` as contributor? Add `Security` as consumer (NDR / threat-hunting on NetFlow)? Functional spine already has both functions; question is whether to record the link.

### Bucket 3 - Phase 0 pending (speculative)

Universal vendor entities surfaced by the semantic-pass vendor enumeration; Phase 0 vetting would confirm or filter:

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `synthetic_tests` | NPMD-SAAS-INTERNET-PERF (or new NPMD-SYNTHETIC) | Universal (ThousandEyes, Catchpoint, NETSCOUT, Kentik) |
| `synthetic_test_runs` | NPMD-SAAS-INTERNET-PERF | Universal (per-run result records) |
| `bgp_route_observations` | NPMD-PATH-TRACING | ThousandEyes Internet Insights, Kentik peering |
| `packet_captures` | NPMD-FLOW-ANALYSIS or new NPMD-PACKET-CAPTURE | NETSCOUT, LiveAction, Riverbed |
| `network_probes` | NPMD-SAAS-INTERNET-PERF | ThousandEyes Enterprise / Cloud / Endpoint agents, Catchpoint nodes |
| `traffic_classifications` | NPMD-FLOW-ANALYSIS | LiveAction, NETSCOUT, Cisco (DPI / NBAR-based) |
| `network_kpi_definitions` | NPMD-METRICS-ALERTS | Broadcom DX NetOps, NETSCOUT (named KPIs distinct from raw metrics) |

Phase 0 vendor research would also clarify how synthetic_tests relate to DEM `digital_experience_sessions` (Bucket 2 #2). Catchpoint markets aggressively into both NPM and DEM; the boundary is fuzzy.

### Cross-bucket dependencies

- **Bucket 2 #2 (saas_application_performance vs DEM)** depends on Bucket 3 vendor research (which view does each flagship vendor's primary product master?). If user picks the **vetted route** for Bucket 3, hold this Bucket 2 item until research lands. If user picks **eyeball** or skips, Bucket 2 #2 is independent.
- **Bucket 1 B1-S9 (cross-domain relationships)** depends on Bucket 2 #2 (which target master the SaaS-degradation edge points at).
- **Bucket 1 B1-S1 (M1 fix - modularization)** depends on Bucket 2 #1 (4-module vs 2-module split). Default in Bucket 1 is 4-module; user can rebalance.
- **Bucket 1 B1-S15 (F2/F3 per-module system skills)** depends on Bucket 1 B1-S1 settling (modules must exist first).
- **Bucket 1 B1-S2 / B1-S3 (capabilities, solutions)** are independent of each other and of Bucket 2 / 3.
- **Bucket 1 B1-S11 (B10b NULL FK fix)** depends on Bucket 1 B1-S1 settling AND on AIOPS / OBS / DEM authoring their own modules (report-only side - tracked separately).

### Per-bucket prompts

- **Bucket 1 (18 items):** "Fix these now? Reply 'all', 'just S1, S5, S10-12' (subset), or 'skip'. Note that B1-S1 (M1 fix) and B1-S2 / B1-S3 (Phase A capabilities + solutions) are the spine - approving them as a package unblocks B1-S11, B1-S14, B1-S15 in a follow-up loader pass."
- **Bucket 2 (9 items):** "What's your call on each? I'll wait for per-item decisions before acting. Specifically for items 5 and 6 I need exact text for aliases / catalog_tagline / catalog_description before writing (Rule #15 / Rule #20)."
- **Bucket 3 (7 items):** "Vet via Phase 0 research (recommended for `synthetic_tests`, `synthetic_test_runs`, `bgp_route_observations` which are vendor-confirmed-universal but no formal Phase 0 has run for NPMD), or eyeball-mode? If eyeball, name which candidates to treat as confirmed."

### Report-only follow-ups (owed by other domains)

- **AIOPS M1** (id 6) owes a `domain_modules` row + `target_domain_module_id` backfill on handoff 649 (`network_flow_record.anomalous_pattern`). Likely target module: an AIOPS-CORRELATION or AIOPS-ANOMALY-DETECTION module once authored.
- **OBS M1** (id 7) owes a `domain_modules` row + `target_domain_module_id` backfill on handoff 651 (`network_performance_metric.threshold_breached`). Likely target module: an OBS-METRICS module.
- **DEM M1** (id 83) owes a `domain_modules` row + `target_domain_module_id` backfill on handoff 653 (`saas_application_performance.degraded`). Tightly coupled to Bucket 2 #2 (NPMD <-> DEM scope question).
- **AIOPS B8 / B10b inbound** (id 6) owes a `data_object_relationship` row on the AIOPS side of the `network_flow_records -> aiops_signals` edge once authored on NPMD's side. (Standard symmetric B8 pattern; tracked under AIOPS's own audit.)
- **OBS B8 / B10b inbound** (id 7) owes the symmetric on `telemetry_streams`.
- **DEM B8 / B10b inbound** (id 83) owes the symmetric on `digital_experience_sessions` (or whatever target master is settled in Bucket 2 #2).
- **CMDB B8 inbound** (id 4) - handoff 654 -> CMDB-SERVICE-MAPPING already has target module; CMDB's audit owes the symmetric relationship row `configuration_items reconciled_by network_topology_snapshots`.
- **ITSM B8 inbound** (id 1) - handoffs 650 / 652 -> ITSM-INCIDENT-MGMT already have target module; ITSM's audit owes 2 symmetric relationship rows.

### Candidate domains queued

Surfaced by NPMD audit 2026-05-30 (helper writes to `audits/_missing-domains.md`):

- `NCCM` (Network Configuration and Change Management): BackBox, NetBrain, SolarWinds NCM, Cisco DNA Center, Itential, Gluware. Adjacent to NPMD / CMDB / ITSM-CHANGE-MGMT.
- `SDWAN-ORCH` (SD-WAN Orchestration and Observability): Cisco Catalyst SD-WAN (Viptela), VMware VeloCloud, Fortinet, Versa, Aruba EdgeConnect, Cato Networks. Adjacent to NPMD / SECOPS / OBS.
- `IPAM-DDI` (IP Address Management and DDI; pre-existing, mention_count bumped to 2): Infoblox, BlueCat, EfficientIP, ApplianSys, NetBox, Men&Mice. Adjacent to DCIM / CMDB / NPMD.
- `NETSEC-VIS` (NDR / Network Detection and Response): Darktrace, ExtraHop Reveal(x), Vectra AI, Corelight, Arista NDR (Awake), Cisco Stealthwatch. Adjacent to NPMD / SECOPS / SIEM / AIOPS.
