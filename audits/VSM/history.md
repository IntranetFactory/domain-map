# VSM (Value Stream Management) — audit history

## 2026-06-16 — Initial build (Phase 0 -> A -> B -> C -> S)

New top-level domain created from a Phase 0 vendor-surface decision. User approved
"create both (EAP + VSM), full build (A+B+C+S)" interactively, with the Phase 0 report
(`c:/tmp/VSM-phase0-2026-06-16.md`) as the market-shape grounding.

**Phase 0 verdict.** VSM passes the point-solution-market test: 5+ independent flagships
(Planview Viz, Plutora, Broadcom ValueOps, ServiceNow VSM, Atlassian; Digital.ai, GitLab
behind), its own Gartner (VSM Platforms) and Forrester (VSM Wave Q2 2025) categories, and real
consolidation (Planview/Plutora, Planview/Tasktop, Broadcom/ConnectALL). Distinct from VSDP (the
delivery toolchain that owns and produces artifacts) because VSM measures across tools it does
NOT own; distinct from SPM by altitude (bottom-up observed flow vs top-down planned investment).
Modeled honestly as a **derive/overlay** domain: it masters thin config + computed records and
mirrors/derives everything else from upstream. Owner function: Software Engineering.

**Phase A (market shape).** domain_id=187, crud_percentage=18 (overlay), cost_band=$$$,
min_org_size="30 m <2500", usa_market_size_usd_m=300 (2025). 8 capabilities, 2 full modules
(VSM-CONNECT-MODEL=401, VSM-FLOW-INSIGHTS=402). Solutions: Planview Viz, Plutora, Broadcom
ValueOps, ServiceNow VSM (primary), Digital.ai Agility + GitLab (secondary).

**Phase B (data footprint).** 6 masters: delivery_value_streams, tool_connections,
flow_metric_definitions (catalog config) + flow_measurements, delivery_bottlenecks, dora_metrics
(computed). Naming arbitration: renamed proposed `value_streams` to `delivery_value_streams` —
`value_streams` (249) already exists, mastered by BPA as the business-process concept
(semantically distinct). Derived/mirrored rows on agile_features (EAP) and VSDP pull_requests /
ci_pipeline_runs / software_deployments. No operational_workflow masters -> no lifecycle states
and no workflow gates (correct for an overlay). 6 trigger_events shared with EAP build, intra +
cross-domain handoffs (bottleneck.detected -> EAP, flow_distribution.shifted -> SPM), 21
relationships shared, aliases.

**Phase C (functions).** owner Software Engineering, contributor IT Operations, consumer
Business Operations.

**Phase S (agents).** system skill `vsm-system` (domain-grain), tools authored, domain_module_tools.
Semantius score 12/14 platform = 86%; the two external tools (fetch_toolchain_work_items,
notify_team) are inherent to a tool-agnostic overlay that pulls from external delivery tools.

All rows landed at `record_status='new'`. Nothing approved.

Open at end of build: B2-VSM-PHASE-E (personas deferred; low value for an overlay with no gated
processes — recommend skip).
