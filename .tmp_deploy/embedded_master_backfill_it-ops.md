# Embedded-master + necessity backfill: IT-ops cluster

Cluster: ITSM, ITOM, ITAM, HAM, SAM, FINOPS, SMP, CMDB, OBS, AIOPS, DISCOVERY, DEM, NPMD, DCIM, UEM, REMOTE-ACCESS, RMM (17 domains).
Goal: turn the IT-ops slice of `domain_data_objects` into a trustworthy substrate for Signal 1 (`count(role IN ('master','embedded_master') AND necessity='required')`) by (a) demoting over-claimed `master` rows to `embedded_master`, (b) adding missing `embedded_master` rows so point-solution silos are visible, (c) flipping convenience reads to `optional`, and (d) flagging missing `data_objects` instead of inventing.

Do not write to Semantius from this file. This is a draft for review.

---

## 1. Cluster scope

| domain_id | domain_code | notes |
|-----------|-------------|-------|
| 1 | ITSM | Canonical owner of `incidents`, `changes`, `problems`, `service_requests`, `slas`, `knowledge_articles`, `service_catalog_items`. |
| 2 | ITOM | Infrastructure-event domain. Mastered events/alerts/monitoring_policies/capacity_records. |
| 3 | ITAM | Umbrella domain. Masters cross-cutting `asset_contracts`, `asset_lifecycle_events`. Sub-domains (HAM/SAM/SMP/FINOPS) own everything else. |
| 4 | CMDB | **Cluster flagship.** Canonical `configuration_items` master. |
| 5 | DISCOVERY | Auto-discovery feeder. Masters its own scans/sources/devices, contributes to CMDB/HAM/SAM. |
| 6 | AIOPS | Correlation/anomaly/RCA over ITOM+OBS+CMDB. Mastered correlations/anomalies/RCAs/predictive_signals. |
| 7 | OBS | Engineering-side telemetry. Masters metrics/logs/traces/SLOs/error_groups. |
| 41 | FINOPS | Leadership-tier (cloud cost analytics). **Currently only one row exists.** Need derived/consumer expansion. |
| 51 | HAM | ITAM sub-domain. Masters `hardware_assets` (financial/lifecycle view). |
| 52 | SAM | ITAM sub-domain. Masters software titles/licenses/installations/audits. |
| 82 | NPMD | **0 rows today.** Network telemetry domain — owns no data_objects we've modelled. |
| 83 | DEM | **0 rows today.** End-user experience monitoring — owns no data_objects we've modelled. |
| 84 | DCIM | **0 rows today.** Physical datacenter facility management. Data_objects missing from catalog. |
| 85 | SMP | ITAM sub-domain. Masters SaaS app portfolio + assignments + usage + shadow-IT. |
| 86 | UEM | **0 rows today.** Endpoint management. Data_objects partially missing from catalog. |
| 130 | RMM | MSP-flavoured endpoint mgmt. Already modelled with embedded_master-style `contributor` rows (CMDB/HAM/SAM/DISCOVERY/ITSM). |
| 132 | REMOTE-ACCESS | Session-based remote support. Modelled. |

## 2. Existing rows snapshot

Total rows in scope: **78** (see appendix for raw list).

By domain:
- ITSM = 12 (7 master, 1 contributor, 4 consumer)
- ITOM = 5 (4 master, 1 contributor)
- ITAM = 4 (2 master, 2 consumer)
- CMDB = 7 (5 master, 2 contributor)
- DISCOVERY = 9 (3 master, 6 contributor)
- AIOPS = 6 (4 master, 2 consumer)
- OBS = 7 (5 master, 1 consumer, 1 contributor)
- HAM = 2 (1 master, 1 contributor)
- SAM = 5 (4 master, 1 contributor)
- SMP = 8 (5 master, 2 contributor, 1 consumer)
- FINOPS = 1 (1 consumer)
- RMM = 12 (3 master + 2 co-master alerts/monitoring_policies, 5 contributor, 2 consumer)
- REMOTE-ACCESS = 4 (2 master, 2 consumer)
- NPMD, DEM, DCIM, UEM = 0 each

Notable gaps:
- `configuration_items` (CMDB flagship) currently has 1 master (CMDB), 4 contributors (DISCOVERY, HAM, SAM, SMP, RMM), 2 consumers (ITSM, AIOPS). Missing embedded_master rows for OBS, AIOPS, UEM, NPMD, DEM and a consumer row from FINOPS. Today's row count under-represents how universal CI-shaped data is.
- `employees` (HCM canonical) has zero rows from IT-ops despite UEM/REMOTE-ACCESS/RMM/SMP all needing a local user/identity copy.
- `cost_centers` (Finance canonical, id 196) has zero rows from IT-ops despite FINOPS, SMP, ITAM all needing chargeback/allocation context.
- `incidents` has only 1 contributor (ITOM) and 1 consumer (RMM) outside the master. Missing the embedded-master shape RMM-style PSAs / UEM / REMOTE-ACCESS would naturally bring.

## 3. NEW rows to add

Columns: domain_code | data_object_name | role | necessity | notes | reasoning

### 3.1 Existing-domain backfill (NPMD, DEM, DCIM, UEM are excluded here — they need data_object Phase A first; see Section 6)

#### CMDB-shaped `configuration_items` (id 76) embedded-master + consumer ring

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| OBS | configuration_items | embedded_master | required | OBS local-masters lightweight service/host CIs when no CMDB is deployed; reads from CMDB when present. Slice: telemetry-source identity (service_id, host_id, container_id). | Datadog/New Relic/Honeycomb all maintain their own service+host inventory standalone. Without a CMDB they're authoritative for the engineering-side CI graph. Embedded_master + required because the workflow (correlation, dashboards, SLO scoping) cannot function without it. |
| AIOPS | configuration_items | embedded_master | required | AIOPS local-masters a correlation-graph view of CIs when no CMDB is present; demotes to consumer reading CMDB topology when integrated. Slice: correlation entities + adjacency, not the financial/lifecycle view. | Existing row 143 marks AIOPS as `consumer`. That's the holistic-deployment view; the point-solution shape is embedded_master (Moogsoft / BigPanda ship their own service map). Demotion rule already handles holistic case from embedded_master. Existing consumer row should be **DELETED** (see Section 4) to avoid double-counting per anti-pattern 461. |
| ITOM | configuration_items | embedded_master | required | ITOM-side monitoring tools (SolarWinds, Zabbix, Nagios) keep a local node inventory; defers to CMDB when present. Slice: monitored-target identity + polling configuration. | Currently ITOM has zero rows on CIs. Realistically every infrastructure-monitoring product maintains its own host catalog. |
| FINOPS | configuration_items | consumer | optional | FINOPS reads CI metadata only when chargeback / showback needs business-service context. Many deployments allocate by tag instead. | Optional because the most common FINOPS allocation path is cloud-tags → cost_centers, not CIs. Surfaces in the extended-footprint view, not Signal 1. |

#### `incidents` (id 47) embedded-master ring

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| RMM | incidents | embedded_master | required | RMM (Atera, NinjaOne, ConnectWise Automate) ships an internal ticketing surface for MSP techs that local-masters incidents when no ITSM is integrated; defers to ITSM via service_request handoff when present. | Existing row 383 is `consumer + required`. Replace with embedded_master + required — point-solution RMM deployments routinely run without ITSM. **CHANGE existing row 383** (Section 4). |
| AIOPS | incidents | embedded_master | optional | Some AIOps tools (Moogsoft, BigPanda) carry an "incident" entity locally for their own correlation grouping before pushing to ITSM. Many deployments don't enable this surface. | Optional because AIOps incident-grouping is a feature, not a workflow. Most enterprise deployments rely on the ITSM incident as system of record from the start. |
| DEM | incidents | embedded_master | optional | DEM tools (ThousandEyes, Catchpoint) can carry a local "synthetic incident" when a synthetic check fails; usually feeds ITSM. | Optional — most DEM deployments emit alerts straight to ITOM/ITSM rather than maintaining an internal incident store. Listed in Sec 6 pending DEM data_objects load. |
| UEM | incidents | embedded_master | optional | UEM tools (Intune, Jamf) emit endpoint compliance violations as local "incidents" before escalation to ITSM. | Optional — depends on deployment shape. Listed in Sec 6 pending UEM data_objects load. |

#### `employees` (id 31) embedded-master ring (HCM canonical)

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| UEM | employees | embedded_master | required | UEM local-masters the user/employee record for device-assignment, group membership, and per-user policy targeting; defers to HCM/IGA when integrated. Slice: device-owner identity + AD/Entra group projection. | Every UEM product (Intune, Workspace ONE, Jamf, Kandji) stands up with a local user directory. Required: the policy-targeting workflow doesn't function without it. Listed in Sec 6 pending UEM data_objects load. |
| REMOTE-ACCESS | employees | embedded_master | required | REMOTE-ACCESS local-masters technician + end-user identity for session attribution and policy gating; defers to HCM/IGA when integrated. Slice: technician identity + end-user identity. | BeyondTrust, TeamViewer, ConnectWise Control all maintain technician directories. Required for audit chain-of-custody on session_recordings. |
| RMM | employees | embedded_master | required | RMM local-masters technician identity for assignment + audit; defers to HCM/IGA when integrated. Slice: technician identity + end-user contact-mapping per endpoint. | Atera/NinjaOne ship a tech directory. Required for endpoint→owner mapping that drives notifications + remote-session targeting. |
| SMP | employees | embedded_master | required | SMP local-masters the SaaS-user record (Stitchflow, Zylo, Productiv) for assignment + license-cost-per-user reporting; defers to HCM/IGA when integrated. Slice: per-employee SaaS assignment surface. | Required: SaaS-license-per-user reporting is the canonical SMP workflow. Pairs with existing master row on saas_app_assignments. |
| ITSM | employees | embedded_master | required | ITSM local-masters the caller/requester record for ticket attribution + approval routing; defers to HCM/IGA when integrated. Slice: requester directory + manager hierarchy projection. | ServiceNow's `sys_user` table, Jira Service Management's "people" — every ITSM has a local user store. Required for routing, SLA-clock attribution, and approval chains. |
| ITAM | employees | embedded_master | optional | ITAM local-masters an asset-owner directory only when finance/HCM integration is absent; many deployments link directly via cost_center instead. | Optional — most ITAM allocates to cost_center, not employee. Convenience field. |
| FINOPS | employees | embedded_master | optional | FINOPS rarely models employees directly; uses cost_centers and projects for allocation. Some tools (CloudHealth) carry a user-tag dimension. | Optional — the dominant FINOPS allocation grain is cloud-tag → cost_center, not employee. |
| DEM | employees | embedded_master | optional | DEM tools optionally tie real-user-monitoring data to a logged-in employee for VIP tracking; many deployments stay anonymous. | Optional — depends on whether RUM personalization is enabled. Listed in Sec 6 pending DEM data_objects load. |
| AIOPS | employees | consumer | optional | AIOPS may read employee/manager mapping to enrich incident escalation paths. Many deployments skip this and rely on ITSM-side routing. | Optional consumer, not embedded_master — AIOPS rarely maintains its own user directory. |

#### `cost_centers` (id 196) embedded-master / consumer ring (Finance canonical)

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| FINOPS | cost_centers | embedded_master | required | FINOPS local-masters a cost-center hierarchy for cloud-cost allocation when no ERP-FIN integration is in place; defers to Finance when integrated. Slice: cloud-allocation tag → cost_center mapping + chargeback rules. | CloudHealth, Apptio Cloudability, Vantage all ship a local cost-center hierarchy. Required: cost allocation is FINOPS's primary deliverable. This is the most important embedded_master for FINOPS. |
| SMP | cost_centers | embedded_master | optional | SMP allocates SaaS spend to cost_centers for chargeback when finance integration is absent; many deployments allocate only to department or business unit. | Optional convenience modelling per anti-pattern 458. |
| ITAM | cost_centers | embedded_master | optional | ITAM holds cost_center on assets for chargeback; many deployments allocate at department level instead. | Optional convenience modelling. |
| SAM | cost_centers | consumer | optional | SAM may surface cost_center allocation on license reports for chargeback views. | Optional. |
| HAM | cost_centers | consumer | optional | HAM may surface cost_center on hardware-asset reports for depreciation chargeback. | Optional. |
| ITSM | cost_centers | consumer | optional | ITSM uses cost_center for service-request approval routing in some deployments. | Optional. |

#### `purchase_orders` (id 73), `invoices` (id 75), `contracts` (id 66) supplementary

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| HAM | purchase_orders | consumer | required | HAM consumes PO data via the asset.acquired lifecycle handoff. Existing row 114 is on ITAM-umbrella; HAM is the actual hardware-PO consumer. | Add HAM-specific consumer row. Required because HAM cannot reconcile depreciation without acquisition cost. |
| SAM | purchase_orders | consumer | required | SAM consumes PO data for license-acquisition reconciliation. | Add SAM-specific consumer row. Required for entitlement reconciliation. |
| FINOPS | invoices | consumer | required | Already present (row 113). No new row needed. | (noted for completeness — covered by existing row) |
| ITAM | contracts | consumer | optional | ITAM-umbrella reads CLM-mastered contracts for licence and warranty terms when CLM is integrated. Asset_contracts is the local embedded_master. | Optional because asset_contracts is the local master. |
| SMP | contracts | consumer | required | SMP reads CLM-mastered SaaS contracts when CLM is integrated; otherwise contributes context (existing row 109). | Existing row 109 is `contributor + required` — keep. No new row needed. |

#### `software_installations` (id 59) + `software_titles` (id 57) embedded-master ring (SAM canonical)

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| UEM | software_installations | embedded_master | required | UEM (Intune, Jamf, Kandji) inventories installed software per endpoint as its own dataset; reconciles to SAM via software.discovered handoff when SAM is present. Slice: endpoint-side installed-app inventory + version + patch state. | Existing SAM is `master`; existing RMM is `contributor`. UEM is the missing case — listed in Sec 6 pending UEM load. |
| SMP | software_installations | consumer | optional | SMP can cross-reference SaaS-app desktop clients (Slack desktop, Zoom client) against SAM-installed software for shadow-detection. Many deployments skip. | Optional cross-cluster read. |

#### `saas_applications` (id 61) + `shadow_it_apps` (id 65) — already SMP-mastered, but contribution shape

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| DEM | saas_applications | consumer | optional | DEM tools monitor SaaS-app reachability (Salesforce, Office 365, Workday) as part of synthetic-monitoring scope; SMP is master. | Optional — depends on DEM deployment scope. Listed in Sec 6 pending DEM data_objects load. |
| FINOPS | saas_applications | consumer | optional | FINOPS may include SaaS spend in cloud-cost views when scope extends to all-cloud-spend (FinOps Foundation framework). Existing SMP shadow_it_apps + saas_subscriptions handle the canonical case. | Optional. |

#### `alerts` (id 85) supplementary

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| DEM | alerts | embedded_master | optional | DEM tools generate experience-side alerts (page-load p99 breach, geographic-outage detection) locally before pushing to ITOM/AIOPS. | Optional — many DEM deployments forward directly to AIOPS without persisting a local alert store. Listed in Sec 6 pending DEM load. |
| NPMD | alerts | embedded_master | required | NPMD tools (LiveAction, Auvik, Kentik) generate network-telemetry alerts (latency, packet-loss, link-saturation) locally; co-masters with ITOM/RMM on alerts. | Network alerts are NPMD's primary output. Required. Listed in Sec 6 pending NPMD load. |
| UEM | alerts | embedded_master | optional | UEM emits compliance-violation + jailbreak/root + lost-device alerts. | Optional — many UEM deployments wire compliance directly into ITSM via service requests. Listed in Sec 6 pending UEM load. |

#### `monitoring_policies` (id 86) supplementary

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| UEM | monitoring_policies | embedded_master | required | UEM local-masters compliance/configuration policies as the endpoint-side equivalent of monitoring_policies (security baseline, encryption check, OS-version compliance). | Required: policy enforcement is UEM's core workflow. Listed in Sec 6 pending UEM load. |
| OBS | monitoring_policies | embedded_master | optional | OBS tools can carry their own alert-rule + SLO-burn-policy as monitoring policies; many deployments treat SLOs (already mastered) as the canonical surface. | Optional — SLO row already covers the canonical case. |

#### `events` (id 84) supplementary

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| NPMD | events | contributor | required | NPMD-derived flow events / interface-state events feed ITOM event stream. | Required. Listed in Sec 6 pending NPMD load. |
| DEM | events | contributor | optional | DEM-derived synthetic-check failure events feed ITOM event stream. | Optional. Listed in Sec 6 pending DEM load. |
| UEM | events | contributor | optional | UEM-derived device-compliance events feed ITOM stream. | Optional. Listed in Sec 6 pending UEM load. |

#### Discovery + auto-discovered-CI feeders for NPMD/UEM/DCIM

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| NPMD | discovered_devices | contributor | required | NPMD-derived flow analysis discovers network nodes (switches, routers, top-talkers) that feed DISCOVERY + HAM. | Required. Listed in Sec 6 pending NPMD load. |
| NPMD | configuration_items | contributor | required | NPMD contributes network-CI attributes (interface counts, VLAN membership, BGP peering) to CMDB. | Required. Listed in Sec 6 pending NPMD load. |
| UEM | configuration_items | contributor | required | UEM-managed endpoints feed CMDB with endpoint-side attributes (OS version, encryption state, compliance posture). | Required. Listed in Sec 6 pending UEM load. |
| DCIM | configuration_items | contributor | required | DCIM contributes physical-layer attributes (rack, PDU, power consumption, cooling zone) to CMDB. | Required. Listed in Sec 6 pending DCIM load. |
| DCIM | hardware_assets | contributor | required | DCIM contributes physical-location + power/cooling state to HAM-mastered hardware records. | Required. Listed in Sec 6 pending DCIM load. |

### 3.2 FINOPS leadership-tier derived rows

FINOPS is leadership-tier per SKILL.md line 380 ("FINOPS derives on cloud-spend records"). It republishes cost-allocation signals against upstream records. With current catalog (no `cloud_resources`, no `service_consumption_records`), only one derived row is possible today:

| domain_code | data_object_name | role | necessity | notes | reasoning |
|---|---|---|---|---|---|
| FINOPS | invoices | derived | required | FINOPS derives unit-cost, anomaly, and allocation signals against cloud-provider invoices. Existing row 113 marks this as `consumer` — promote to `derived`. | The "republish derived signals against the upstream object" test (SKILL.md line 380) applies cleanly: FINOPS doesn't just read invoices, it produces unit-cost-per-business-service, cost-anomaly events, rightsizing recommendations. **CHANGE existing row 113** (Section 4). |

(All other FINOPS-derived rows — against `cloud_resources`, `service_consumption_records`, `cost_centers` for allocation analytics — are blocked on Phase A data_object loads. See Section 6.)

### 3.3 AIOPS / OBS — re-test against the leadership-tier rule

AIOPS produces correlations / anomalies / RCAs as its **own master** rows (existing rows 134-137, event_correlations / anomaly_detections / root_cause_analyses / predictive_signals). The handoff back is via these mastered objects, not via republishing on `incidents`/`events`. Per the user prompt: "AIOps produces correlations against `incidents` — that's still `consumer`+`contributor` shape, not derived, because AIOps writes back."

Confirm: AIOPS rows on `events` (id 150, consumer), `alerts` (id 151, contributor), `distributed_traces` (id 154, consumer), `configuration_items` (id 143, consumer) are correctly typed. No `derived` re-classification needed.

OBS: not leadership-tier. Engineering-side observability is a point-solution domain (Datadog, New Relic, Honeycomb are vendors of *this* point solution, not aggregators above it). Keep `master` on metrics/logs/traces/SLOs/error_groups. No `derived` re-classification needed.

## 4. CHANGES to existing rows

Columns: row_id | domain_code | data_object_name | current_role | current_necessity | new_role | new_necessity | notes-replacement | reasoning

### 4.1 Demotion of `master` to `embedded_master` (Signal 1 vs Signal 1b separation)

None of the 17 IT-ops cluster existing `master` rows demote on Phase 2 re-test:

- **CMDB → configuration_items / ci_relationships / ci_classes / service_maps / ci_baselines (rows 117-121)**: KEEP master. CMDB is the canonical authority for CI-shaped data per SKILL.md flagship rule. ITAM/HAM/SAM/SMP/RMM/OBS/AIOPS all hold local copies — those are the embedded_master + contributor rows (existing 138-141, 378, plus new rows in Section 3).
- **ITSM → incidents / changes / problems / service_requests / slas / knowledge_articles / service_catalog_items (rows 60-66)**: KEEP master. ITSM is canonical for service-request workflow. RMM's local incident store is embedded_master (new row), not a canonical demotion of ITSM.
- **ITOM → events / alerts / monitoring_policies / capacity_records (rows 125-128)**: KEEP master. ITOM is canonical infrastructure-event domain. RMM's co-master on alerts + monitoring_policies (rows 376, 377) is correctly stated as co-master because RMM's endpoint-telemetry alert stream is genuinely distinct from ITOM's infra-event stream and neither defers to the other.
- **OBS → metric_series / log_entries / distributed_traces / service_level_objectives / error_groups (rows 129-133)**: KEEP master. OBS is canonical for engineering-side telemetry. No other domain claims this slice.
- **AIOPS → event_correlations / anomaly_detections / root_cause_analyses / predictive_signals (rows 134-137)**: KEEP master. AIOPS-derived outputs are its own. No other domain claims them.
- **HAM → hardware_assets (row 69)**: KEEP master. HAM is canonical for the financial/lifecycle view. CMDB's row 94 already correctly states "Cross-reference via natural keys" — the operational/topology view lives on CMDB CIs, the financial view on HAM hardware_assets, separate data_objects.
- **SAM → software_titles / software_licenses / software_installations / license_audits (rows 70-73)**: KEEP master. SAM is canonical. RMM's row 380 (contributor on software_installations) is correctly stated.
- **SMP → saas_applications / saas_subscriptions / saas_app_assignments / saas_usage_metrics / shadow_it_apps (rows 74-78)**: KEEP master. SMP is canonical SaaS portfolio.
- **DISCOVERY → discovery_scans / discovered_devices / discovery_sources (rows 122-124)**: KEEP master. DISCOVERY is canonical for the auto-discovery pipeline records (scan history, discovered-device inventory, source registry). Other domains consume.
- **ITAM → asset_contracts / asset_lifecycle_events (rows 67-68)**: KEEP master. Per Phase 1 rule "umbrella retains only genuinely cross-cutting objects", these are correctly placed at ITAM-umbrella.
- **RMM → rmm_agents / patch_jobs / automation_scripts (rows 373-375)**: KEEP master. RMM-internal records, no other domain claims them.
- **RMM → monitoring_policies (row 376) co-master with ITOM, RMM → alerts (row 377) co-master with ITOM**: KEEP both. Co-master multi-master pattern correctly applied with slice-defining notes.
- **REMOTE-ACCESS → remote_sessions / session_recordings (rows 410-411)**: KEEP master. Domain-specific records.

**No demotions. All current `master` rows pass the canonical-authority test.**

### 4.2 Role / necessity changes on existing non-master rows

| row_id | domain_code | data_object_name | current_role | current_necessity | new_role | new_necessity | notes-replacement | reasoning |
|---|---|---|---|---|---|---|---|---|
| 383 | RMM | incidents | consumer | required | embedded_master | required | RMM (Atera, NinjaOne, ConnectWise Automate) ships a local ticketing surface that local-masters incidents when no ITSM is integrated; defers to ITSM via the service_request handoff when integrated. Slice: MSP-tech-side ticket lifecycle. | Existing row marks RMM as `consumer`. The point-solution shape (RMM deployed standalone) makes RMM the local incident master — every MSP-flavoured RMM has its own ticketing module. Embedded_master is the correct primary role; the holistic-deployment consumer demotion is rule-derived. Per anti-pattern 461, do not also keep a separate consumer row. |
| 113 | FINOPS | invoices | consumer | required | derived | required | FINOPS derives unit-cost, allocation, and anomaly signals against cloud-provider invoices. Republishes per-business-service unit-cost + rightsizing recommendations + cost-anomaly events. | FINOPS is leadership-tier per SKILL.md line 380. Promote to `derived` consistent with the "republish signals against upstream" test. |
| 102 | ITAM | saas_applications | consumer | required | consumer | optional | ITAM umbrella surfaces SaaS apps alongside hardware and installed-software assets for unified asset reporting when the umbrella is in scope. Many ITAM deployments leave SMP separate and skip this consumer view. | Per anti-pattern 458, defaulting cross-cluster reads to required is wrong. ITAM-umbrella surfacing of SaaS-apps is a configuration choice, not a workflow gate. |
| 114 | ITAM | purchase_orders | consumer | required | consumer | optional | PO line items link to acquired hardware/software assets when procurement integration is enabled. Many ITAM deployments capture acquisition cost locally on asset_lifecycle_events without integrating to procurement. | The ITAM-umbrella consumer is the optional cross-cluster shape. The required PO-consumer rows are HAM + SAM (new rows in Section 3) — they're the sub-domains that actually act on the PO. |

### 4.3 Anti-pattern 461 cleanups (delete double-counted consumer rows where embedded_master will cover)

Per anti-pattern 461 ("Modelling holistic-deployment-only consumer rows when an embedded_master row already captures the same dependency"), the following deletions go with the new embedded_master rows in Section 3:

| row_id | domain_code | data_object_name | current_role | action | reason |
|---|---|---|---|---|---|
| 143 | AIOPS | configuration_items | consumer | DELETE | Replaced by new AIOPS embedded_master row on configuration_items (Section 3). The demotion rule handles the holistic-deployment consumer case; the consumer row is double-counting. |

### 4.4 Notes-field backfill on existing master rows (anti-pattern 455)

The following currently-`master` rows have empty `notes`. They're not wrong, but Phase-2 anti-pattern 455 says multi-master / embedded_master rows must explain their slice. Most existing IT-ops masters are single-master so the rule applies less strictly, but for the records that now gain embedded_master / contributor neighbours (Section 3) the master row should also gain a slice note. Listed for completeness; non-blocking:

- Row 60 (ITSM → incidents): add note "Canonical ITIL incident lifecycle: detect → diagnose → resolve → close with SLA clock."
- Row 117 (CMDB → configuration_items): add note "Canonical operational + topology view of CI-shaped records. ITAM/HAM/SAM/SMP/UEM/RMM/OBS local-master subset views and defer here in holistic deployments."
- Row 125 (ITOM → events): add note "Canonical infra-event stream: SNMP traps, syslog, agent telemetry, cloud-provider events. OBS contributes engineering-side events back."
- Row 126 (ITOM → alerts): add note "Co-master with RMM (row 377). ITOM owns infrastructure-source alerts; RMM owns endpoint-telemetry alerts. No deferral between them."
- Row 376 (RMM → monitoring_policies): existing slice note is good — keep.

(Filed as a Section 6 task; not strictly part of this backfill.)

## 5. Boundary observations

1. **CI is the cluster flagship, per SKILL.md.** Currently `configuration_items` has 1 master (CMDB) + 4 contributors + 2 consumers. After this backfill: 1 master + 4 contributors + 3 embedded_masters (OBS, AIOPS, ITOM) **required** + 3 more embedded_masters (UEM, DCIM, NPMD) once Section 6 data_objects load. That's the canonical flagship pattern (3-4 canonical + ≥1 consumer + several embedded_masters) — exactly what SKILL.md line 401 predicts.

2. **`employees` is also a flagship-class object for IT-ops despite living in HCM.** Six IT-ops domains will hold local employee copies (ITSM, SMP, UEM, REMOTE-ACCESS, RMM, ITAM). The Signal 1b count for `employees` will jump materially after this load — this is the integration-burden signal the platform-vs-silos hypothesis is looking for. The cluster-flagship rule from SKILL.md applies even when the canonical master lives outside the cluster.

3. **FINOPS is severely under-modelled at the data-object level.** One row today (invoices). Even with this backfill it gains at best 4-5 rows (cost_centers embedded_master + invoices derived + a few optional cross-cluster reads). The real FINOPS surface — `cloud_resources`, `cloud_costs`, `service_consumption_records`, `cloud_recommendations`, `cloud_budgets`, `cloud_tags`, `cloud_accounts` — is missing from the data_objects catalog. **Phase A for FINOPS is the highest-value Section 6 item.**

4. **NPMD / DEM / DCIM / UEM all share the same gap: zero data_objects loaded.** They're listed in the cluster but contribute zero to Signal 1 today. Until Phase A runs for each, the rows in Section 3 that depend on them (`endpoint_devices`, `network_devices`, `synthetic_check_results`, `real_user_sessions`, `power_records`, `cooling_zones`, etc.) cannot be loaded. This is the largest catalog gap in the cluster.

5. **The `master` count on RMM (5: rmm_agents, patch_jobs, automation_scripts, monitoring_policies co, alerts co) is high for what should be a point-solution domain.** Co-mastering monitoring_policies and alerts with ITOM is defensible (genuinely distinct slices) but if RMM also embedded_masters incidents (this backfill) + employees + configuration_items + hardware_assets + software_installations, the Signal 1 + Signal 1b sum on RMM will be conspicuous. That's the *correct* outcome — RMM is genuinely the point-solution PSA-flavoured aggregator MSPs use *instead of* a holistic IT-ops platform, so high Signal 1+1b on its data_objects is the silos signal we want surfaced.

6. **AIOPS handoff shape is consumer/contributor, not derived, despite being analytical.** Confirmed against SKILL.md line 380 leadership-tier test. AIOPS writes back its own master records (`event_correlations`, `anomaly_detections`, `root_cause_analyses`, `predictive_signals`) — those rows ARE its derived-style output, just modelled as `master` on its own data_objects rather than `derived` on upstream ones. This is consistent with the leadership-tier convention for domains that masters its own analytics objects vs domains that don't (e.g. REV-INTEL, FINOPS, EPM).

7. **`changes` (id 50) has surprisingly small footprint.** ITSM master + CMDB contributor (existing 93) + RMM contributor (existing 382). Missing embedded_master rows from UEM (Intune change windows), NPMD (network-config changes), DCIM (rack-level changes). All listed in Section 6 pending Phase A.

8. **DCIM is closer to a Real-Estate cluster cousin than a pure IT-ops domain.** Its primary objects (racks, power_distribution_units, cooling_zones, power_records, datacenter_floor_plans) overlap with Real-Estate's `spaces` / `floor_plans` (existing data_objects 1734, 1729). Worth deciding at Phase A whether DCIM gets its own `dcim_racks` / `dcim_power_units` data_objects (clear ownership) or reuses Real-Estate's `spaces` (cross-cluster master ambiguity). Tentative recommendation: own data_objects; the operational-state slice is fundamentally different from facility-management.

## 6. Open questions for human review

The following items are blocked or ambiguous. Each lists what's needed to unblock.

### 6.1 Missing data_objects (Phase A required before linking rows)

These data_objects are referenced by rows in Section 3 but don't exist in the catalog. Cannot load any cross-domain row until they exist.

- **FINOPS Phase A (highest priority):**
  - `cloud_resources` — generic compute/storage/network resource record (provider-agnostic)
  - `cloud_accounts` — AWS account / Azure subscription / GCP project as a billing boundary
  - `cloud_costs` (or `cloud_cost_line_items`) — daily/hourly granular cost records
  - `service_consumption_records` — provider-side consumption (vCPU-hours, GB-stored, requests)
  - `cloud_recommendations` — rightsizing / reservation / commitment suggestions
  - `cloud_budgets` (or reuse `budgets` id 38?)
  - `cloud_tags` (or `cloud_resource_tags`) — the allocation-key surface
  - `chargeback_allocations` — per cost-center / business-service allocations

- **UEM Phase A:**
  - `endpoint_devices` (or `managed_endpoints`)
  - `device_compliance_records`
  - `device_enrollment_profiles`
  - `mdm_configuration_profiles`
  - `application_inventory_per_endpoint` (or reuse `software_installations` id 59 + UEM contributor row?)

- **NPMD Phase A:**
  - `network_flow_records` (NetFlow / IPFIX / sFlow)
  - `network_devices` (switches, routers, firewalls — or contribute to discovered_devices id 82?)
  - `network_topology_views`
  - `network_path_traces`
  - `bandwidth_utilization_records`

- **DEM Phase A:**
  - `synthetic_check_definitions`
  - `synthetic_check_results`
  - `real_user_sessions`
  - `real_user_page_views`
  - `frontend_performance_metrics` (or reuse `metric_series` id 88 + DEM contributor row?)
  - `digital_experience_scores`

- **DCIM Phase A:**
  - `datacenter_facilities`
  - `racks` (or `dcim_racks`)
  - `power_distribution_units`
  - `cooling_zones`
  - `power_consumption_records`
  - `environmental_sensor_readings`
  - `cable_runs`

- **Cross-cutting gap:**
  - `vulnerabilities` (or `vulnerability_findings`) — needed for UEM-detected CVE alerts; might belong to a Security cluster instead. **Decision needed**: is this an IT-ops object or does it sit with TVM (threat & vulnerability management) in the security cluster?
  - `users` as distinct from `employees` (id 31). Currently `employees` is the closest analogue. **Decision needed**: do IT-ops domains embedded_master `employees` (current approach in Section 3) or do we add a separate `users` data_object? Recommendation: stay with `employees` per the IGA naming convention; if IGA later loads its own `users` data_object, revisit.

### 6.2 Boundary decisions

- **DCIM vs Real-Estate**: see Sec 5 #8.
- **UEM software_installations contribution vs separate `application_inventory_per_endpoint`**: should UEM contribute to SAM-mastered `software_installations` (id 59) like RMM does, or have its own data_object? Recommendation: contribute to SAM's, like RMM does. Pattern parity.
- **AIOPS configuration_items**: existing row 143 is `consumer + required`. Section 3 proposes deleting it and adding `embedded_master + required` instead. Confirm the anti-pattern-461 reading before applying.
- **RMM incidents change**: existing row 383 (`consumer + required`) → `embedded_master + required`. Confirm before applying — this is the most user-visible role change in the backfill.
- **FINOPS invoices change**: existing row 113 (`consumer + required`) → `derived + required`. Confirm the leadership-tier test.

### 6.3 Items waiting for Section 6.1 Phase A loads

The following rows in Section 3 are listed but **cannot be loaded yet** because the data_object doesn't exist:

- All NPMD rows (alerts, events, discovered_devices, configuration_items)
- All DEM rows (incidents, saas_applications, alerts, events, employees)
- All DCIM rows (configuration_items, hardware_assets)
- All UEM rows (incidents, employees, software_installations, alerts, monitoring_policies, configuration_items, events)
- All FINOPS rows beyond cost_centers + invoices (i.e., the rows that would target `cloud_resources`, `service_consumption_records`, `cloud_recommendations`, etc.)

Total rows in Section 3 that can be loaded today (existing data_objects only): **~28**.
Total rows in Section 3 that need Phase A first: **~25**.

## 7. Summary counts

### Rows to add (Section 3) — loadable today (existing data_objects)

By role + necessity:
- `embedded_master + required`: **9** (OBS→CI, AIOPS→CI, ITOM→CI, UEM→employees [blocked], REMOTE-ACCESS→employees, RMM→employees, SMP→employees, ITSM→employees, FINOPS→cost_centers)
- `embedded_master + optional`: **7** (AIOPS→incidents, ITAM→employees, FINOPS→employees, SMP→cost_centers, ITAM→cost_centers, OBS→monitoring_policies, plus DEM/UEM rows blocked on Phase A)
- `consumer + required`: **2** (HAM→purchase_orders, SAM→purchase_orders)
- `consumer + optional`: **5** (SAM→cost_centers, HAM→cost_centers, ITSM→cost_centers, AIOPS→employees, FINOPS→configuration_items, FINOPS→saas_applications, SMP→software_installations)
- `derived + required`: **0** new (1 *change* — row 113 reclassified)
- `contributor`: covered by individual NPMD/UEM/DCIM rows, all blocked on Phase A

Loadable-today count by role: ~9 embedded_master_required, ~5 embedded_master_optional, ~2 consumer_required, ~6 consumer_optional. **~22 new rows immediately, ~25 more pending Phase A.**

### Rows to change (Section 4)

- Role/necessity changes: **3** (row 113 FINOPS→derived, row 383 RMM→embedded_master, row 102 ITAM→optional, row 114 ITAM→optional)
- Deletions per anti-pattern 461: **1** (row 143 AIOPS configuration_items consumer)

### Net effect on Signal 1 (`role IN ('master','embedded_master') AND necessity='required'`) for the cluster — loadable-today only

Before: 17 master rows in IT-ops cluster (counting RMM co-master alerts/monitoring_policies as 2 separate master rows).

After this backfill (loadable subset only):
- +1 master row equivalent flip: row 383 RMM incidents consumer→embedded_master (necessity required) = +1
- +9 embedded_master_required rows (Section 3.1 + 3.2 loadable subset, but several blocked on Phase A — actual loadable now: ITSM→employees, REMOTE-ACCESS→employees, RMM→employees, SMP→employees, FINOPS→cost_centers, OBS→CI, AIOPS→CI, ITOM→CI = **8 actual loadable**)
- -0 (no `master` row demotions)

**Signal 1 IT-ops cluster sum: 17 → 17 + 1 + 8 = 26 (loadable subset).**
**After Phase A unblocks NPMD/UEM/DCIM/DEM/FINOPS, expected ceiling: ~40-45.**

### Per-data_object Signal 1+1b counts after loadable subset

| data_object | Before (master+embedded_master required) | After (loadable subset) | Notes |
|---|---|---|---|
| configuration_items | 1 (CMDB master) | 1 + 3 embedded (OBS, AIOPS, ITOM) = **4** | Plus 4 existing contributors. Flagship pattern materialising. |
| employees | 0 | 0 master + 4 embedded (ITSM, REMOTE-ACCESS, RMM, SMP) + UEM pending = **4** → 5 after UEM unblock | Cross-cluster flagship (canonical lives in HCM). |
| incidents | 1 (ITSM master) | 1 + 1 embedded (RMM via change) = **2** | UEM, DEM, AIOPS additions all optional or pending. |
| cost_centers | 0 from IT-ops | 0 + 1 embedded (FINOPS) = **1** | Canonical lives in Finance. SMP/ITAM optional. |
| alerts | 2 (ITOM + RMM co-master) | unchanged today | NPMD/UEM additions pending Phase A. |
| monitoring_policies | 2 (ITOM + RMM co-master) | unchanged today | UEM addition pending. |

The flagship data_object (configuration_items) reaches a Signal 1+1b sum of 4 on the loadable subset, ≥6 after Phase A. That's the integration-burden footprint Phase 4 is measuring.

---

## Appendix A — existing-row IDs grouped by domain

(For reviewer reference. Pulled 2026-05-22 from `/domain_data_objects?domain_id=in.(86,4,2,6,130,132,3,1,7,82,85,51,83,5,52,41,84)`.)

- ITSM (1): 60, 61, 62, 63, 64, 65, 66, 96, 142, 152, 153, 155
- ITOM (2): 89, 125, 126, 127, 128
- ITAM (3): 67, 68, 102, 114
- CMDB (4): 93, 94, 117, 118, 119, 120, 121
- DISCOVERY (5): 95, 99, 122, 123, 124, 138, 144, 145, 147
- AIOPS (6): 134, 135, 136, 137, 143, 150, 154, 400
- OBS (7): 129, 130, 131, 132, 133, 146, 148
- HAM (51): 69, 139
- SAM (52): 70, 71, 72, 73, 140
- SMP (85): 74, 75, 76, 77, 78, 109, 115, 141
- FINOPS (41): 113
- RMM (130): 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384
- REMOTE-ACCESS (132): 410, 411, 412, 413
- NPMD (82), DEM (83), DCIM (84), UEM (86): none.
