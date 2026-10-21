# AIOps (AIOPS) full-build draft

**One-liner.** ML-driven event correlation, anomaly detection, noise reduction, root-cause analysis, and incident prediction across high-volume IT telemetry: cut alert noise and surface root-caused issues before users feel impact.

This is a research-and-draft pass only. Nothing is loaded.

## What the footprint already has (reused, not re-proposed)
- 5 solutions across 4 vendors (ServiceNow, Datadog, Dynatrace, BigPanda), so no new vendors or solutions are needed.
- 7 mastered data_objects: event_correlations, anomaly_detections, root_cause_analyses (the only operational_workflow), predictive_signals, alert_suppression_rules, ml_model_training_records, incident_predictions.
- 5 consumer/contributor objects owned elsewhere (configuration_items/CMDB, monitoring_events + monitoring_alerts + distributed_traces/OBS-RMM, data_pipelines/DATA-AI-PLAT): kept as consumer/contributor, never re-mastered.
- 9 trigger_events, 24 cross-domain handoffs, business-function ownership (IT Infrastructure owner, Software Engineering contributor), and the domain-grain system skill `aiops-system`.
- All 7 `query_*` tools (ids 297-300, 797-799) and `notify_person` / `notify_team` (913/914) already exist and are reused.

## Deltas drafted
- **Capabilities (0 -> 6):** Event Correlation, Anomaly Detection, Alert Noise Reduction, Root Cause Analysis, Predictive Insights, Detection Model Operations.
- **Modules (0 -> 2), the gating decision:** a 2-module split.
  - **AIOPS-EVENT-CORRELATION** (Event Correlation): masters event_correlations, anomaly_detections, alert_suppression_rules; consumes monitoring_events, monitoring_alerts, distributed_traces, configuration_items. Realizes Event Correlation + Anomaly Detection + Alert Noise Reduction.
  - **AIOPS-PREDICTIVE-INTELLIGENCE** (Predictive Intelligence): masters predictive_signals, incident_predictions, root_cause_analyses, ml_model_training_records; consumes event_correlations, anomaly_detections, data_pipelines, configuration_items. Realizes Predictive Insights + Root Cause Analysis + Detection Model Operations.
- Every existing master is assigned to exactly one module; every capability is realized by >=1 module.
- **Lifecycle states** for root_cause_analyses (the only operational_workflow master with none): investigating (initial) -> draft -> reviewed (gated) -> published (gated, terminal); dismissed (terminal). The other masters are computed/catalog/operational_record, so no lifecycle per Rule #12.
- **Tools:** 7 existing queries reused + 4 new representative mutates (activate_alert_suppression_rule, publish_root_cause_analysis, record_ml_model_training_run, acknowledge_incident_prediction) + reused notify_person/notify_team. 13 `module_tools` rows wire these per module, so `aiops-system` derives its toolset by rollup. No new skill.
- **Personas (4):** SRE and NOC/Incident Analyst (IT Infrastructure), IT Operations Manager (IT Infrastructure), AIOps ML Engineer (Software Engineering). Each touches both modules.

## New vs reused, at a glance
- **New:** 6 capabilities, 2 modules, all module->capability and module->data_object links, 5 RCA lifecycle states, 4 mutate tools, 13 module_tools, 4 personas.
- **Reused:** all vendors/solutions, all 7 masters, all consumer/contributor links, 7 query tools, notify_person/notify_team, the system skill.
- **No new data_objects** (the 9 market-surface candidates from the audit are a non-gating additive follow-up).

## Top decisions for you
1. **MODULE-SPLIT (gating).** Adopt the 2-module split (drafted). Three over four: it is the minimal shape that unblocks the build; the 3- and 4-module options need objects that do not yet exist, and the 4-module option overlaps the queued MLOPS domain.
2. **TRIGGER-TOPOLOGY-PUBLISHED (destructive).** topology.published (id 143) on event_correlations looks like a CMDB service-topology concept and nothing uses it. Recommended: re-attribute to CMDB service_maps (delete is acceptable). Needs sign-off.
3. **PATTERN-FLAG-FREEZES + MLOPS-OWNERSHIP + CHANNEL-SWAP.** Recommended: freeze ml_model_training_records / root_cause_analyses / alert_suppression_rules (value overwrites, confirm each); keep ml_model_training_records AIOPS-owned (MLOPS embeds later); swap the two channel primitives on the skill for notify_person / notify_team.
