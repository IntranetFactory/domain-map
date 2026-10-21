# Cluster B brief — IT Service & Assets

**Domains in scope (6):** ITSM, APM, CMDB, HAM, ITAM, WSC

**Your job:** for EACH of the 6 domains, author one markdown section following the OUTPUT TEMPLATE below. Write the full set to `.tmp_deploy/cluster_B_draft.md`. Do NOT call semantius or any database tool — drafts only. The draft will be reviewed by the user before any load happens.

---

## Domain details

### ITSM — IT Service Management

**Description:** Workflows for managing IT requests, incidents, problems, changes, and knowledge in support of internal business users.

**Business logic:** Ticket classification, deduplication, and priority routing benefit from ML, but the underlying workflow remains state-machine driven.

**Data objects (12):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `knowledge_articles` | Knowledge Article | Knowledge Articles |
| master | `service_catalog_items` | Service Catalog Item | Service Catalog Items |
| master | `service_changes` | Change | Changes |
| master | `service_incidents` | Incident | Incidents |
| master | `service_problems` | Problem | Problems |
| master | `service_requests` | Service Request | Service Requests |
| master | `service_slas` | SLA | SLAs |
| contributor | `asset_lifecycle_events` | Asset Lifecycle Event | Asset Lifecycle Events |
| consumer | `configuration_items` | Configuration Item | Configuration Items |
| consumer | `error_groups` | Error Group | Error Groups |
| consumer | `monitoring_alerts` | Alert | Alerts |
| consumer | `service_level_objectives` | SLO | SLOs |

### APM — Application Portfolio Management

**Description:** Inventory and rationalisation of the enterprise application landscape, including business capabilities, technology fit, and lifecycle.

**Business logic:** TIME (tolerate/invest/migrate/eliminate) scoring rules over portfolio attributes — a small declarative layer.

**Data objects (11):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `application_costs` | Application Total Cost of Ownership | Application Total Cost of Ownerships |
| master | `application_interfaces` | Application Interface | Application Interfaces |
| master | `application_value_scores` | Application Value Score | Application Value Scores |
| master | `business_capability_maps` | Business Capability Map | Business Capability Maps |
| master | `enterprise_applications` | Enterprise Application | Enterprise Applications |
| master | `technology_fit_assessments` | Technology Fit Assessment | Technology Fit Assessments |
| master | `technology_platforms` | Technology Platform | Technology Platforms |
| consumer | `configuration_items` | Configuration Item | Configuration Items |
| consumer | `data_products` | Data Product | Data Products |
| consumer | `saas_applications` | SaaS Application | SaaS Applications |
| consumer | `software_titles` | Software Title | Software Titles |

### CMDB — Configuration Management Database

**Description:** Authoritative record of configuration items and their relationships, underpinning ITSM and ITOM.

**Data objects (7):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `ci_baselines` | CI Baseline | CI Baselines |
| master | `ci_classes` | CI Class | CI Classes |
| master | `ci_relationships` | CI Relationship | CI Relationships |
| master | `configuration_items` | Configuration Item | Configuration Items |
| master | `service_maps` | Service Map | Service Maps |
| contributor | `hardware_assets` | Hardware Asset | Hardware Assets |
| contributor | `service_changes` | Change | Changes |

### HAM — Hardware Asset Management

**Description:** Inventory, lifecycle, and disposal management of physical IT hardware assets.

**Data objects (6):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `hardware_assets` | Hardware Asset | Hardware Assets |
| master | `hardware_disposal_records` | Hardware Disposal Record | Hardware Disposal Records |
| master | `hardware_models` | Hardware Model | Hardware Models |
| master | `hardware_warranties` | Hardware Warranty | Hardware Warranties |
| master | `spare_parts_inventory` | Spare Part Inventory Item | Spare Part Inventory Items |
| contributor | `configuration_items` | Configuration Item | Configuration Items |

### ITAM — IT Asset Management

**Description:** Umbrella domain covering hardware, software, cloud-cost, and enterprise-asset management.

**Business logic:** Normalisation tables (the same hardware/software model expressed inconsistently across feeds) are the small irreducible kernel — they require maintained reference data, not a runtime engine.

**Data objects (4):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `asset_contracts` | Asset Contract | Asset Contracts |
| master | `asset_lifecycle_events` | Asset Lifecycle Event | Asset Lifecycle Events |
| consumer | `purchase_orders` | Purchase Order | Purchase Orders |
| consumer | `saas_applications` | SaaS Application | SaaS Applications |

### WSC — Workstream Collaboration

**Description:** Persistent channel-based messaging, threaded conversations, voice/video huddles, and external collaboration. Distinct from KMS (knowledge artifacts). Vendors: Slack, Microsoft Teams, Google Chat, Mattermost, Rocket.Chat, Cisco Webex, Zoom Team Chat.

**Business logic:** Message delivery, presence, and search — infrastructure-level, but the application surface (channels, threads, files) is straightforward CRUD.

**Data objects (8):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `channel_file_shares` | Channel File Share | Channel File Shares |
| master | `channel_members` | Channel Member | Channel Members |
| master | `chat_channels` | Chat Channel | Chat Channels |
| master | `chat_huddles` | Chat Huddle | Chat Huddles |
| master | `chat_message_attachments` | Chat Message Attachment | Chat Message Attachments |
| master | `chat_messages` | Chat Message | Chat Messages |
| master | `chat_threads` | Chat Thread | Chat Threads |
| master | `external_guest_invitations` | External Guest Invitation | External Guest Invitations |

---

## Cross-domain handoffs touching this cluster (128)

Convert each row to a cross-domain relationship edge (section 4 of each domain's draft) where there is a clean payload→target mapping. The payload's data_object is the **from** side; pick a natural recipient in the target_domain as the **to** side.

| source_domain | payload (data_object) | trigger_event | target_domain | integration_pattern | friction | description |
|---|---|---|---|---|---|---|
| ITSM | `asset_lifecycle_events` | `service_incident.asset_failure` | ITAM | api_call | medium | Incident resolved by replacing or retiring an asset generates a lifecycle event in ITAM. Friction sits in the asset-id resolution (incidents are filed against users or symptoms, as |
| ITSM | `service_changes` | `service_change.completed` | CMDB | api_call | medium | Completed change in ITSM updates the affected CIs in CMDB (software version, configuration state, relationship topology). Friction is medium — most ITSM/CMDB pairs are same-vendor  |
| ITSM | `knowledge_articles` | `knowledge_article.published` | KMS | api_call | medium | Published ITSM knowledge articles sync to the broader KMS knowledge base. |
| ITSM | `service_catalog_items` | `service_catalog_item.published` | IGA | api_call | medium | New catalog items expose entitlements that IGA wires into access requests. |
| ITSM | `rmm_agents` | `rmm_ticket.escalated` | RMM | manual_handoff | medium | A tier-1 ITSM ticket is escalated to tier-2 with a remote-session need; the technician opens the RMM console to launch diagnostics scripts or a remote-control session against the a |
| ITSM | `rmm_agents` | `ticket.resolved` | RMM | api_call | low | ITSM ticket resolution back-references RMM to acknowledge/clear the originating alert and stop further escalation. Lowest-friction handoff in the cluster — well-supported in same-v |
| ITOM | `service_incidents` | `monitoring_event.alert_triggered` | ITSM | event_stream | high | Monitoring/alerting events from ITOM auto-create incidents in ITSM when severity and correlation rules match. High friction in practice — alert storms create incident floods, corre |
| ITAM | `asset_contracts` | `asset_contract.expired` | GRC | event_stream | medium | Expired support contracts feed GRC risk register. |
| ITAM | `asset_lifecycle_events` | `asset.retired_for_disposal` | HAM | event_stream | low | Retired assets hand off to HAM disposal workflow. |
| ITAM | `asset_lifecycle_events` | `asset_lifecycle_event.recorded` | ERP-FIN | event_stream | medium | Asset lifecycle events update the ERP-FIN fixed-asset register and depreciation. |
| ITAM | `asset_contracts` | `asset_contract.renewed` | ERP-FIN | event_stream | medium | Renewed ITAM contracts update ERP-FIN accruals and PO commitments. |
| CMDB | `service_incidents` | `ci.unauthorized_change_detected` | ITSM | api_call | medium | Configuration drift against a CI baseline (or change without a CAB-approved change record) creates a compliance / security incident in ITSM. Friction is medium — false positives fr |
| CMDB | `service_maps` | `service_map.updated` | ITSM | api_call | low | Updated CMDB service maps refresh ITSM impact analysis on incidents and changes. |
| CMDB | `ci_baselines` | `ci_baseline.deviation_detected` | ITSM | event_stream | medium | CI baseline deviations auto-create ITSM unauthorized-change investigations. |
| CMDB | `event_correlations` | `topology.published` | AIOPS | batch_sync | medium | Periodic CMDB topology export feeds AIOPS's correlation graph. The latency between CMDB updates and AIOPS topology refresh is a quality lever — stale topology in AIOPS produces mis |
| CMDB | `service_maps` | `service_map.updated` | AIOPS | event_stream | low | CMDB topology updates feed AIOPS correlation graphs. |
| DISCOVERY | `discovery_scans` | `discovery_scan.failed` | ITSM | api_call | medium | Failed DISCOVERY scans open ITSM tickets for the discovery owner. |
| DISCOVERY | `discovery_sources` | `discovery_source.disconnected` | ITSM | api_call | medium | DISCOVERY source outages auto-ticket ITSM to restore visibility. |
| DISCOVERY | `configuration_items` | `ci.discovered` | CMDB | event_stream | low | Discovered devices reconcile against the existing CMDB and either match (update existing CI), promote (create new CI), or queue for manual review (ambiguous match). Low friction wh |
| DISCOVERY | `ci_relationships` | `relationship.discovered` | CMDB | event_stream | medium | Discovered relationships (network flows, dependencies, k8s service-mesh edges) feed the CI relationship graph. Friction is medium — relationship discovery is noisier than device di |
| DISCOVERY | `discovery_scans` | `discovery_scan.completed` | CMDB | event_stream | low | Completed DISCOVERY scans publish CI deltas to CMDB reconciliation. |
| DISCOVERY | `discovery_sources` | `discovery_source.connected` | CMDB | event_stream | low | Newly connected DISCOVERY sources begin populating CMDB CI tables. |
| DISCOVERY | `hardware_assets` | `device.discovered` | HAM | event_stream | low | Auto-discovered devices (laptops, network gear, servers) flow to HAM as new hardware_assets candidates. Low friction when the discovery and HAM tool are same-vendor; medium when se |
| DISCOVERY | `discovery_scans` | `discovery_scan.completed` | HAM | event_stream | medium | Hardware findings from DISCOVERY scans enrich HAM asset records. |
| AIOPS | `service_problems` | `root_cause.identified` | ITSM | api_call | medium | Confirmed RCA seeds an ITSM problem record (the long-lived root-cause artifact) and links it to the incident(s) that triggered it. Friction sits in the human-in-the-loop confirmati |
| AIOPS | `service_incidents` | `correlation.identified` | ITSM | event_stream | high | A correlated alert cluster surfaces as ONE incident in ITSM instead of N. The defining noise-reduction promise of AIOps — and the hardest integration to land cleanly, because suppr |
| AIOPS | `root_cause_analyses` | `root_cause_analysis.published` | ITSM | event_stream | low | AIOPS RCA conclusion lands on the linked ITSM incident/problem as resolution context. |
| AIOPS | `incident_predictions` | `incident_prediction.high_confidence` | ITSM | event_stream | low | Predicted incidents auto-open proactive ITSM tickets ahead of impact. |
| OBS | `service_incidents` | `slo.breached` | ITSM | event_stream | high | SLO breach (error budget exhausted, burn-rate spike) creates an incident in ITSM. High friction in practice — the routing from a Datadog/Honeycomb SLO-breach event to a correctly a |
| OBS | `log_entries` | `log_entry.error_pattern_matched` | ITSM | api_call | medium | Critical log patterns auto-open ITSM tickets for technician triage. |
| OBS | `service_level_objectives` | `service_level_objective.burn_rate_high` | ITSM | api_call | medium | OBS SLO burn-rate alerts trigger ITSM major-incident workflow. |
| OBS | `service_level_objectives` | `service_level_objective.budget_exhausted` | ITSM | api_call | medium | Exhausted SLO error budget escalates to ITSM and triggers change/release controls. |
| OBS | `error_groups` | `error_group.regression_detected` | ITSM | api_call | medium | OBS regression on resolved error reopens ITSM problem record. |
| TEST-MGMT | `test_defects` | `test_defect.created` | ITSM | api_call | medium | Customer-impacting defects in production-pathing tests escalate to ITSM tickets. |
| APM | `application_interfaces` | `application_interface.broken` | ITSM | event_stream | high | Integration failure escalates to incident; detection lag; true-positive rate varies. |
| APM | `technology_platforms` | `technology_platform.registered` | ITAM | event_stream | medium | APM registers app; ITAM tracks as IT asset. |
| APM | `enterprise_applications` | `application.onboarded` | CMDB | api_call | medium | App onboard creates CMDB CI; multi-vendor stacks need bespoke sync. |
| APM | `enterprise_applications` | `application.lifecycle_state_changed` | CMDB | batch_sync | medium | Sunset triggers CMDB CI retirement; decom timeline coordination. |
| APM | `technology_platforms` | `technology_platform.sunset` | CMDB | manual_handoff | high | Platform retirement triggers CI cleanup in CMDB. |
| APM | `technology_platforms` | `technology_platform.sunset` | GRC | event_stream | medium | Platform sunset shrinks compliance scope. |
| APM | `enterprise_applications` | `application.lifecycle_state_changed` | SAM | batch_sync | medium | Sunset triggers license termination and reinstall-base cleanup. |
| APM | `enterprise_applications` | `application.onboarded` | SAM | api_call | medium | New app triggers SAM software-title sync; identity reconciliation (app name vs software title) can lag. |
| GRC | `remediation_plans` | `control.failed` | ITSM | api_call | high | Failed IT control → ITSM ticket; no feedback when ITSM closes ticket on GRC SLA. |
| GRC | `remediation_plans` | `remediation_plan.created` | ITSM | event_stream | medium | Remediation ticket created in ITSM. |
| AUDIT | `audit_engagements` | `audit_engagement.completed` | ITSM | manual_handoff | high | IT audit outcomes trigger ITSM actions; requires human interpretation of scope/findings. |
| HRSD | `service_requests` | `case.it_assistance_required` | ITSM | api_call | medium | HR case that needs IT action (lost laptop replacement, app access for a new role, account lockout) routes a service request into ITSM. Friction sits in the case-to-SR field mapping |
| IGA | `iga_provisioning_events` | `iga_provisioning_event.completed` | ITSM | event_stream | medium | Provisioning event drives ITSM fulfillment-task closure where access tickets exist. |
| IGA | `iga_provisioning_events` | `iga_provisioning_event.failed` | ITSM | api_call | high | Failed provisioning becomes ITSM incident/request for manual completion. Alert-without-feedback-loop friction shape. |
| IGA | `iga_access_requests` | `iga_access_request.approved` | ITSM | api_call | medium | Approved access requests with manual-fulfillment steps route to ITSM. |
| IGA | `iga_provisioning_events` | `iga_provisioning_event.completed` | ITAM | event_stream | medium | Account/entitlement changes correlate with software-license consumption and asset assignment. |
| IPAAS | `integration_runs` | `integration_run.failed` | ITSM | api_call | high | iPaaS run failures often surface as ITSM tickets — the failed integration usually has business impact (missed orders, stalled provisioning). |
| LCAP | `extend_apps` | `extend_app.deployment_failed` | ITSM | api_call | medium | Deployment failure opens incident for platform team. |
| RPA | `rpa_executions` | `rpa_execution.failed` | ITSM | api_call | high | Bot execution failure opens incident for bot owner; target system change often the root cause. |
| RPA | `rpa_bot_credentials` | `rpa_bot_credentials.expiring` | ITSM | api_call | medium | Expiring bot credentials open a service request for IT rotation. |
| TELCO-BSS | `service_trouble_tickets` | `service_trouble_ticket.opened` | ITSM | event_stream | medium | Telco trouble ticket routes to ITSM for network ops resolution. |
| TELCO-BSS | `service_provisioning_workflows` | `service_provisioning.failed` | ITSM | event_stream | high | Provisioning failures escalate to ITSM for network/IT diagnosis. |
| TELCO-BSS | `network_inventory_records` | `network_inventory.updated` | ITSM | batch_sync | low | Network inventory updates sync to ITSM CMDB-adjacent inventory. |
| HC-PATIENT | `clinical_orders` | `clinical_order.placed` | ITSM | api_call | low | Order routing relies on ITSM-managed integration with lab/imaging systems. |
| MFG-OPS | `shop_floor_cases` | `shop_floor_case.opened` | ITSM | api_call | medium | Shop-floor case with IT/MES root cause is routed to ITSM for incident management. |
| UTIL-OPS | `utility_assets` | `utility_asset.failed` | ITSM | api_call | medium | Failure of IT-dependent grid/SCADA asset raises an ITSM incident for dependent technology stack. |
| CLIN-DEV | `clinical_engineering_work_orders` | `clinical_engineering_work_order.opened` | ITSM | api_call | medium | Clinical engineering work order surfaces in ITSM when shared with IT for connected-device support. |
| CLIN-DEV | `device_calibration_records` | `device_calibration.due` | ITSM | batch_sync | low | Calibration scheduling visible to ITSM when biomed device is shared infrastructure. |
| HAM | `hardware_models` | `hardware_model.eol_announced` | SPM | event_stream | medium | Hardware EOL announcements feed SPM tech-refresh planning. |
| HAM | `hardware_disposal_records` | `hardware_disposal_record.completed` | GRC | event_stream | medium | Disposal records satisfy GRC data-destruction evidence requirements. |
| HAM | `spare_parts_inventory` | `spare_parts_inventory.low_threshold` | S2P | api_call | medium | Low spare-parts levels trigger S2P replenishment requisitions. |
| HAM | `hardware_warranties` | `hardware_warranty.expiring` | S2P | event_stream | medium | Expiring HAM warranties cue procurement extension renewals. |
| HAM | `hardware_disposal_records` | `hardware_disposal_record.completed` | ERP-FIN | event_stream | medium | Completed HAM disposals write off ERP-FIN fixed assets and book gains/losses. |
| HAM | `rmm_agents` | `asset.retired` | RMM | api_call | high | A hardware asset retired/disposed in HAM should trigger RMM agent uninstall and license release to avoid orphaned agents continuing to phone home and consume seats. Failure modes:  |
| SAM | `service_requests` | `license.expiry_warning` | ITSM | api_call | low | Upcoming license expiry creates a renewal-action service request in ITSM. Low friction because the trigger is calendar-based and well-defined; routing to the right owner is the onl |
| SAM | `service_requests` | `license_audit.required` | ITSM | api_call | medium | Vendor-initiated audit or proactive internal review triggers an audit workflow service request. Friction sits in evidence collection across SAM + CLM + S2P data. |
| EAM | `eam_work_orders` | `eam_work_order.created` | ITSM | event_stream | medium | Critical equipment failures escalated to IT incidents. |
| HCM | `service_requests` | `employee.terminated` | ITSM | api_call | medium | Termination in HCM creates a fan-out of offboarding service requests in ITSM: workspace cleanup, mail-forwarding setup, equipment-return tracking, exit-interview scheduling. Failur |
| HCM | `asset_lifecycle_events` | `employee.terminated` | ITAM | api_call | high | Employee termination triggers asset-recall events: assigned laptops, mobile devices, badges, software licences must be reclaimed. High friction — recall rates rarely hit 100%, and  |
| HCM | `employees` | `employee.terminated` | ITAM | api_call | high | Termination triggers asset-recall workflow (laptop, badge, hardware tokens). Leaver-recall friction shape; assets in remote-work era frequently missing. |
| BI | `bi_reports` | `bi_report.failed` | ITSM | api_call | medium | Scheduled report failure files an ITSM ticket for the BI platform team to investigate. |
| WSC | `chat_threads` | `chat_thread.escalated_to_ticket` | ITSM | api_call | low | WSC IT-support threads are converted into ITSM tickets so the SLA clock starts and the transcript becomes incident context. |
| WSC | `external_guest_invitations` | `external_guest.invited` | IGA | api_call | high | External guest invitations require IGA approval for cross-tenant access; high friction because policy varies by tenant and sensitivity. |
| WSC | `channel_members` | `channel_member.added` | IGA | event_stream | medium | Membership changes in sensitive channels are reconciled in IGA so role-attestation and SoD checks stay accurate. |
| WSC | `external_guest_invitations` | `external_guest.access_revoked` | IGA | event_stream | low | Guest-access revocation cascades through IGA to remove downstream grants and ECM/DAM link access. |
| WSC | `chat_message_attachments` | `chat_attachment.shared` | ECM | event_stream | medium | WSC attachments in regulated channels are captured to ECM for retention and discoverability. |
| WSC | `chat_channels` | `chat_channel.archived` | ECM | batch_sync | medium | Archiving a WSC channel triggers a final ECM capture pass of messages and attachments for record-keeping. |
| WSC | `chat_threads` | `chat_thread.escalated_to_ticket` | CCAAS | api_call | medium | Customer-facing chat threads escalated for live assist hand off to CCAAS with full transcript context. |
| WSC | `chat_messages` | `msp_ticket.from_chat` | MSP-PSA | api_call | medium | An MSP customer's chat message is materialized as an MSP-PSA ticket with the channel context attached for billing and SLA. |
| WSC | `chat_messages` | `chat_message.posted` | DLP | event_stream | low | Posted messages are streamed to DLP for content inspection and policy enforcement. |
| APP-PAAS | `paas_deployments` | `paas_deployment.failed` | ITSM | api_call | medium | Failed deployments raise incidents in ITSM for triage. |
| VSDP | `software_deployments` | `software_deployment.failed` | ITSM | api_call | medium | Failed deployments raise incidents for change-management and operations triage. |
| KUBE-PLAT | `container_workloads` | `container_workload.degraded` | ITSM | api_call | medium | Persistent workload degradation creates ITSM incidents for platform-team triage. |
| KUBE-PLAT | `kubernetes_clusters` | `kubernetes_cluster.provisioned` | ITAM | batch_sync | medium | New clusters become tracked IT assets for lifecycle and cost management. |
| NPMD | `network_performance_alerts` | `network_performance_alert.raised` | ITSM | api_call | medium | NPMD performance alerts auto-open ITSM network tickets. |
| NPMD | `network_interfaces` | `network_interface.down` | ITSM | api_call | low | Interface-down events auto-create ITSM tickets for the responsible team. |
| NPMD | `network_topology_snapshots` | `network_topology_snapshot.updated` | CMDB | batch_sync | medium | NPMD topology snapshots reconcile network CIs and relationships in CMDB. |
| DEM | `endpoint_experience_scores` | `endpoint_experience_score.degraded` | ITSM | event_stream | medium | Degraded DEM endpoint experience opens proactive ITSM tickets for the user. |
| DCIM | `dc_cabinets` | `dc_cabinet.environmental_alert` | ITSM | api_call | medium | DCIM cabinet environmental alerts auto-create facility ITSM tickets. |
| DCIM | `dc_power_distribution_units` | `dc_power_distribution_unit.failure` | ITSM | event_stream | high | DCIM PDU failures trigger ITSM major-incident workflow. |
| DCIM | `dc_uninterruptible_power_supplies` | `dc_uninterruptible_power_supply.failover` | ITSM | event_stream | high | DCIM UPS failovers escalate to ITSM major-incident workflow. |
| DCIM | `dc_cooling_units` | `dc_cooling_unit.failure` | ITSM | event_stream | high | DCIM cooling failures trigger emergency ITSM workflow. |
| DCIM | `dc_port_connections` | `dc_port_connection.changed` | CMDB | event_stream | medium | DCIM port connection changes update CMDB physical topology. |
| SMP | `saas_applications` | `saas_application.deprovisioned` | ITSM | event_stream | medium | SaaS app deprovisioning closes related ITSM tickets and access requests. |
| UEM | `enrolled_devices` | `enrolled_device.enrolled` | ITSM | event_stream | low | Newly enrolled UEM devices auto-link to onboarding ITSM tickets. |
| UEM | `device_compliance_results` | `device_compliance_result.non_compliant` | ITSM | api_call | medium | Non-compliant UEM devices auto-ticket ITSM for remediation. |
| UEM | `device_configuration_profiles` | `device_configuration_profile.drift_detected` | ITSM | api_call | medium | UEM configuration drift opens ITSM remediation tickets. |
| UEM | `enrolled_devices` | `enrolled_device.retired` | HAM | event_stream | low | Retired UEM devices propagate to HAM for disposal tracking. |
| DI | `pipeline_runs` | `pipeline_run.failed` | ITSM | api_call | high | Pipeline failure opens incident for the data-platform on-call. |
| DQ | `quality_incidents` | `quality_rule.breach` | ITSM | event_stream | medium | Severity ≥ HIGH or breach > SLA threshold → ITSM incident. Dedup on (asset_id, rule_id). |
| DQ | `quality_incidents` | `dq_scorecard.breached` | ITSM | api_call | medium | Scorecard SLA breach → ITSM escalation ticket. |
| DQ | `dq_sla_definitions` | `dq_sla_definition.breached` | ITSM | api_call | high | Data SLA breach creates incident for the producing pipeline's owning team. |
| ONBOARDING | `onboarding_tasks` | `task.it_provisioning_required` | ITSM | api_call | medium | Onboarding emits the IT-provisioning task for a new hire (laptop, peripherals, baseline software access). ITSM creates the corresponding service request(s); ITSM masters the fulfil |
| ONBOARDING | `onboarding_tasks` | `task.workplace_setup_required` | ITSM | api_call | medium | Workspace, desk, badge requests fulfilled by ITSM/IWMS. |
| DATA-AI-PLAT | `ml_models` | `ml_model.drift_detected` | ITSM | event_stream | high | Drift detected on production model; ITSM incident created for MLOps team to triage retraining. |
| DATA-AI-PLAT | `ml_models` | `ml_model.evaluation_failed` | ITSM | api_call | medium | Failed evaluation creates an incident for MLOps; deployment blocked until remediated. |
| RMM | `service_incidents` | `monitoring_alert.threshold_breached` | ITSM | api_call | high | RMM agent telemetry breaches a monitoring policy threshold and the alert is forwarded to ITSM to auto-create an incident with affected endpoint, telemetry snapshot, and severity. F |
| RMM | `service_changes` | `patch_job.completed` | ITSM | api_call | medium | Patch job completion updates the corresponding ITSM change record with per-endpoint execution result and closes it. Failure modes: partial-failure handling differs between tools; r |
| RMM | `service_changes` | `patch_job.scheduled` | ITSM | api_call | medium | A scheduled patch job in RMM creates a corresponding change record in ITSM for CAB approval and audit trail. Failure modes: approval delays in ITSM don't gate RMM execution; emerge |
| RMM | `automation_scripts` | `automation_script.failed` | ITSM | api_call | low | Failed RMM script executions auto-create ITSM tickets. |
| RMM | `automation_scripts` | `automation_script.executed` | ITAM | event_stream | low | RMM script executions update ITAM asset inventory and patch state. |
| RMM | `configuration_items` | `ci_endpoint.discovered` | CMDB | api_call | high | RMM contributes CI attributes (OS, installed services, network config) to the CMDB. Failure modes: CMDB receives the same logical CI from multiple discovery sources (RMM, AD, agent |
| RMM | `hardware_assets` | `hardware_endpoint.discovered` | HAM | batch_sync | medium | RMM agent installation on a new endpoint syncs hardware specs (CPU, RAM, disk, serial, BIOS) to the HAM asset register. Failure modes: identity reconciliation across RMM agent-id,  |
| MSP-PSA | `hardware_assets` | `ticket.created` | HAM | api_call | low | New MSP ticket references a specific customer-owned asset; HAM (or the MSP's asset register equivalent) provides device metadata, warranty status, and asset history. Low-friction i |
| REMOTE-ACCESS | `service_incidents` | `support_session.completed` | ITSM | api_call | medium | Completed remote session writes a session summary (duration, technician, actions taken, recording link) back to the originating ITSM incident as a work-note. Failure modes: ticket- |
| REMOTE-ACCESS | `remote_sessions` | `remote_session.ended` | ITSM | event_stream | low | Completed remote sessions append worklog and timer to the linked ITSM ticket. |
| NCDB | `nocode_automations` | `nocode_automation.failed` | ITSM | api_call | medium | Automation failure that the citizen owner cannot resolve escalates to IT support. |
| WORK-MGMT | `work_items` | `work_item.status_changed` | ITSM | api_call | high | Cross-functional WORK-MGMT items intersect with IT support requests: a marketing project task ('IT-provision new SaaS') needs to be linked to a ServiceNow request, with status mirr |
| WORK-MGMT | `work_automations` | `work_automation.triggered` | ITSM | event_stream | low | Work-item automations linked to IT tickets propagate status changes to ITSM. |
| WORK-MGMT | `work_automations` | `work_automation.triggered` | WSC | api_call | low | Automations post status updates and task notifications into workstream collaboration channels. |
| BPA | `business_process_models` | `process_model.published` | APM | api_call | medium | BPA tool publishes a process; EA tool maps applications that support it for TIME scoring. Payload: process metadata + linked capabilities. Failure modes: process owner mapping lags |
| BPA | `business_capability_maps` | `capability_map.updated` | APM | api_call | high | Capability map changes invalidate APM application-to-capability heatmaps. Co-master friction: the same map exists on both sides with different lineage. Failure modes: out-of-sync v |
| DLP | `dlp_incidents` | `dlp_incident.blocked` | ITSM | event_stream | medium | DLP block creates security incident in ITSM. |
| FLEET-MAINT | `maintenance_defects` | `maintenance_defect.reported` | ITSM | event_stream | medium | In-vehicle IT defects escalated to IT tickets. |

---

## Cross-cluster reference (data_objects in OTHER clusters that handoffs reach into)

Use these names when authoring section 4 (cross-domain edges) of any domain in this cluster.

- **DATA-AI-PLAT** (Data and AI Platform): `lakehouse_tables`, `data_pipelines`, `ml_models`, `feature_sets`, `semantic_metrics`, `ai_agents`, `data_products`, `ontologies`, `knowledge_graph_entities`
- **RMM** (Remote Monitoring and Management): `rmm_agents`, `patch_jobs`, `automation_scripts`, `monitoring_policies`, `monitoring_alerts`
- **MSP-PSA** (MSP Professional Services Automation): `msp_tickets`, `msp_contracts`, `msp_time_entries`, `msp_invoices`, `msp_clients`
- **REMOTE-ACCESS** (Remote Access and Support): `remote_sessions`, `session_recordings`
- **NCDB** (No-Code Database): `nocode_bases`, `nocode_record_definitions`, `nocode_forms`, `nocode_views`, `nocode_automations`
- **WORK-MGMT** (Work Management): `work_items`, `work_projects`, `work_automations`, `okr_objectives`
- **BPA** (Business Process Architecture): `business_process_models`, `business_capability_maps`, `value_streams`, `process_simulation_runs`
- **DLP** (Data Loss Prevention): `dlp_incidents`, `dlp_policies`, `data_exfiltration_attempts`, `dlp_quarantine_items`, `dlp_exceptions`, `dlp_user_activity_logs`
- **FLEET-MAINT** (Fleet Maintenance Management): `vehicle_work_orders`, `preventive_maintenance_schedules`, `vehicle_parts_inventory`, `maintenance_defects`
- **GRC** (Governance, Risk and Compliance): `compliance_risks`, `compliance_controls`, `control_assessments`, `compliance_policies`, `policy_attestations`, `compliance_obligations`, `compliance_evidence`, `audit_issues`, `remediation_plans`, `risk_assessments`
- **AUDIT** (Audit Management): `audit_plans`, `audit_engagements`, `audit_findings`, `work_papers`, `control_tests`, `audit_recommendations`, `audit_reports`, `follow_up_actions`
- **ITOM** (IT Operations Management): `monitoring_events`, `monitoring_alerts`, `monitoring_policies`, `capacity_records`
- **HRSD** (HR Service Delivery): `hr_cases`, `case_categories`
- **S2P** (Source-to-Pay): `sourcing_events`, `purchase_requisitions`, `purchase_orders`, `goods_receipts`, `supplier_invoices`
- **KMS** (Knowledge Management): `knowledge_base_articles`, `knowledge_categories`, `article_revisions`, `article_feedback`, `knowledge_search_queries`, `knowledge_collections`
- **IGA** (Identity Governance and Administration): `employees`, `saas_app_assignments`, `iga_access_requests`, `iga_access_certifications`, `iga_entitlement_definitions`, `iga_sod_violations`, `iga_provisioning_events`
- **IPAAS** (Integration Platform as a Service): `integration_recipes`, `integration_runs`, `integration_connectors`, `webhook_subscriptions`, `integration_triggers`, `integration_data_mappings`
- **LCAP** (Low-Code Application Platform): `extend_apps`, `extend_business_objects`, `extend_workflows`, `extend_pages`, `extend_data_sources`
- **RPA** (Robotic Process Automation): `rpa_bots`, `rpa_executions`, `rpa_schedules`, `rpa_activities`, `rpa_activity_logs`, `rpa_bot_credentials`, `rpa_deployment_packages`
- **TELCO-BSS** (Telecommunications OSS/BSS): `telco_service_catalog`, `telco_service_orders`, `telco_subscriptions`, `service_provisioning_workflows`, `network_inventory_records`, `telco_customer_bills`, `service_trouble_tickets`
- **HC-PATIENT** (Healthcare Patient Operations): `patient_appointments`, `clinical_encounters`, `care_plans`, `patient_referrals`, `clinical_orders`, `clinical_notes`
- **MFG-OPS** (Manufacturing Connected Operations): `production_orders`, `work_instructions`, `production_schedules`, `produced_units`, `production_downtime_events`, `production_quality_inspections`, `shop_floor_cases`
- **UTIL-OPS** (Utilities Operations): `utility_customer_accounts`, `utility_meters`, `meter_reads`, `service_connections`, `utility_assets`, `outage_events`, `utility_service_orders`, `utility_bills`
- **DISCOVERY** (Discovery and Service Mapping): `discovery_scans`, `discovered_devices`, `discovery_sources`
- **CLIN-DEV** (Clinical Device Management): `medical_devices`, `device_maintenance_logs`, `device_recalls`, `clinical_engineering_work_orders`, `device_calibration_records`, `device_incident_reports`, `sterilization_cycles`
- **SAM** (Software Asset Management): `software_titles`, `software_licenses`, `software_installations`, `license_audits`
- **EAM** (Enterprise Asset Management): `industrial_assets`, `eam_work_orders`, `equipment_pm_schedules`
- **HCM** (Human Capital Management): `employees`, `hcm_positions`, `job_profiles`, `org_units`, `employment_contracts`, `employment_events`
- **AIOPS** (AIOps): `event_correlations`, `anomaly_detections`, `root_cause_analyses`, `predictive_signals`, `alert_suppression_rules`, `ml_model_training_records`, `incident_predictions`
- **ERP-FIN** (Core ERP Financial Management): `journal_entries`, `general_ledger_accounts`, `cost_centers`, `legal_entities`, `accounting_periods`, `bank_accounts`, `cash_transactions`, `fixed_assets`, `asset_depreciation_schedules`, `intercompany_transactions`, `revenue_recognition_records`
- **OBS** (Observability): `metric_series`, `log_entries`, `distributed_traces`, `service_level_objectives`, `error_groups`
- **BI** (Business Intelligence and Analytics): `semantic_metrics`, `bi_subscriptions`, `bi_reports`, `bi_dashboards`, `bi_queries`
- **APP-PAAS** (Application Platform-as-a-Service): `paas_applications`, `paas_deployments`, `paas_environments`, `paas_runtime_instances`, `paas_addons`, `paas_build_records`
- **TEST-MGMT** (Test Management): `test_cases`, `test_suites`, `test_plans`, `test_runs`, `test_defects`, `test_environments`, `requirements_to_test_traceability`, `automation_scripts`
- **VSDP** (Value Stream Delivery Platform): `source_repositories`, `code_commits`, `pull_requests`, `ci_pipelines`, `ci_pipeline_runs`, `build_artifacts`, `software_deployments`, `value_stream_metrics`
- **KUBE-PLAT** (Kubernetes and Container Platforms): `kubernetes_clusters`, `cluster_node_pools`, `container_workloads`, `helm_releases`, `service_meshes`, `operator_installations`, `platform_pipelines`, `container_registries`
- **NPMD** (Network Performance Monitoring and Diagnostics): `network_flow_records`, `network_paths`, `network_performance_metrics`, `network_performance_alerts`, `network_interfaces`, `saas_application_performance`, `network_topology_snapshots`, `network_baseline_thresholds`
- **DEM** (Digital Experience Monitoring): `endpoint_experience_scores`, `synthetic_monitoring_results`, `real_user_sessions`, `digital_friction_events`, `endpoint_anomaly_findings`
- **DCIM** (Data Center Infrastructure Management): `dc_racks`, `dc_cabinets`, `dc_power_distribution_units`, `dc_power_circuits`, `dc_uninterruptible_power_supplies`, `dc_cooling_units`, `dc_environmental_readings`, `dc_capacity_plans`, `dc_port_connections`, `dc_cable_connections`
- **SMP** (SaaS Management Platforms): `saas_applications`, `saas_subscriptions`, `saas_app_assignments`, `saas_usage_metrics`, `shadow_it_apps`
- **UEM** (Unified Endpoint Management): `enrolled_devices`, `device_configuration_profiles`, `device_compliance_policies`, `mobile_app_packages`, `device_app_assignments`, `enrollment_tokens`, `device_deployment_results`, `device_compliance_results`
- **DI** (Data Integration): `pipeline_runs`, `source_connectors`, `sink_connectors`, `transformation_jobs`, `schema_registries`, `change_data_capture_streams`, `integration_flows`
- **SPM** (Strategic Portfolio Management): `okr_objectives`, `strategic_portfolios`, `strategic_initiatives`, `roadmap_items`, `business_value_assessments`, `resource_allocations`, `demand_intake_requests`, `scenario_plans`, `dependency_chains`, `benefits_tracking_records`
- **DQ** (Data Quality): `quality_rules`, `quality_incidents`, `profile_results`, `dq_dimensions`, `dq_scorecards`, `dq_sla_definitions`, `anomaly_detections`
- **ECM** (Enterprise Content Management): `content_documents`, `document_versions`, `document_folders`, `document_classifications`, `records_retention_policies`
- **CCAAS** (Contact Center as a Service): `support_sessions`, `contact_records`, `queue_statistics`, `ccaas_call_recordings`, `agent_states`, `disposition_codes`
- **ONBOARDING** (Employee Onboarding): `onboarding_plans`, `onboarding_journeys`, `onboarding_stages`, `onboarding_tasks`, `buddy_assignments`, `onboarding_cohorts`, `welcome_communications`, `onboarding_document_collections`, `hcm_positions`, `org_units`, `employees`

---

## Platform built-in

Reference `users` (data_object_id=748, kind=platform_builtin) for any assignee / owner / approver / creator relationship. Always section 3.

---

## OUTPUT TEMPLATE — repeat once per domain (replace the example rows)

## Domain: <DOMAIN_CODE> — <Domain Name>

### 1. Mermaid graph (intra-domain only — visualize the entity-cluster shape)

```mermaid
graph LR
  %% use snake_case data_object_name for every node; use --|verb|--> for edges
  job_postings -->|publishes| job_applications
```

### 2. Intra-domain relationships

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_postings | publishes | job_applications | one_to_many | composition | true | source | is published from | each application belongs to one posting |

### 3. Users edges (platform_builtin)

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_applications | assigned_to | users | many_to_one | reference | false | target | hiring manager for | recruiter ownership |

### 4. Cross-domain edges (clean payload→target only)

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_offers | becomes | employees | one_to_one | reference | false | target | onboarded from | only when offer accepted |

### 5. Aliases (≥1 per non-self-explanatory master)

| data_object | alias_name | alias_type | is_preferred | notes |
|---|---|---|---|---|
| job_applications | application | synonym | false | common short form |
| job_applications | candidate submission | industry_term | false | HR vendor terminology |


---

## Schema reference

### data_object_relationships schema

| Column | Type / values | Notes |
|---|---|---|
| data_object_id | reference→data_objects | The **source / subject** side. Use the data_object_name (the loader will resolve to id). |
| related_data_object_id | reference→data_objects | The **target / object** side. |
| relationship_verb | text | Parent-voice verb. Conventions: `owns`, `manages`, `schedules`, `places`, `is_assigned_to`, `extends`, `groups`, `contains`, `triggers`, `approves`, `fulfills`, `closes`, `spawns`, `becomes`. Use snake_case. |
| inverse_verb | text | Reverse phrasing for navigation: `is owned by`, `reports to`, `is scheduled by`. Natural prose, no snake_case required. |
| relationship_type | enum | `one_to_one` / `one_to_many` / `many_to_many` |
| relationship_kind | enum | `composition` (parent owns child, cascade), `reference` (loose link, no cascade), `association` (peer-to-peer M:N), `inheritance` (subtype / IS-A) |
| owner_side | enum | `source` = the row identified by data_object_id cascades into the related object on delete; `target` = the related object owns the lifecycle. Drives delete-mode derivation downstream. |
| is_required | boolean | true if mandatory in typical implementations (every Order has a Customer); false if optional. |
| notes | text | Free-form. |

### data_object_aliases schema

| Column | Type / values | Notes |
|---|---|---|
| data_object_id | reference→data_objects | The aliased entity (by data_object_name). |
| alias_name | text | The alternative term. |
| alias_type | enum | `synonym` (general alt term), `industry_term` (specific to an industry — set industry_id), `solution_term` (specific to a vendor product — set solution_id). For Step 5 only `synonym` and `industry_term` are expected; `industry_term` rows without an industry_id will be skipped by the loader. |
| is_preferred | boolean | True if this alias is more common than the canonical name in its context. Usually false. |

### Guardrails

1. **Use data_object_name (snake_case) everywhere in tables**, not labels. Loader resolves names → ids.
2. **Only reference data_objects that exist** in your cluster's domain list OR `users` (the only platform_builtin) OR data_objects that belong to other domains shown in the **cross-cluster reference list** below. Do not invent new entity names.
3. **Intra-domain edges**: every edge's both ends are data_objects belonging to a single domain in this cluster (could be the same domain). Aim for completeness — every master/embedded_master should have at least one edge unless it is a true root entity.
4. **Users edges**: cover assignee / owner / created_by / approver style relationships. Every entity that has any user-shaped role gets a users edge. Use distinct verbs (`is_owned_by`, `is_assigned_to`, `is_created_by`, `is_approved_by`).
5. **Cross-domain edges**: ONLY include where there is a clean, deterministic payload→target mapping (e.g. `candidates → becomes → employees` when a hire happens, `job_offers → spawns → onboarding_journeys`). Do NOT speculate. The cross_domain_handoffs in your brief are an existing source of truth; convert each row to a relationship edge where the payload (data_object_id) is the **from** side and the target_domain has a master data_object that is the natural recipient.
6. **Aliases**: focus on non-self-explanatory masters. A master named `hcm_employees` doesn't need an alias for "employee" because the singular is obvious. But `itsm_incidents` could alias to "ticket"; `crm_opportunities` to "deal"; `cmdb_configuration_items` to "CI". 1-3 aliases per master that benefits, none for those that don't.
7. **Avoid duplicate edges**: do not author both A→B and B→A; pick the natural source side (the side that *owns the action* in the verb). E.g. for "publishes" the publisher is source; for "is_assigned_to" the assignee-holder is source.
8. **Use `composition` sparingly**: only when delete-cascade is the obvious correct behavior (an order_line cannot exist without its order). Most edges are `reference`.
9. **`owner_side='source'`** is the right answer when the source row's lifecycle drives the related row (composition pattern). **`owner_side='target'`** is correct for "reference upward" relationships (a job_application references a job_posting; the posting is the lifecycle owner).
10. **Output is markdown only.** Do NOT call semantius or PostgREST. Write the draft to the path your prompt specifies.
