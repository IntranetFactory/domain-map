# ITSM market surface audit — 2026-06-16

Read-only market audit (Phase 0 regression test) of the ITSM domain (domain_id=1) against current vendor practice. Zero inserts. No commits.

## Current footprint (live PostgREST, 2026-06-16)

8 full modules (ids 38-45). Domain-owned masters (8 distinct entities):

| Module | Domain-owned master(s) |
|---|---|
| ITSM-INCIDENT-MGMT | service_incidents |
| ITSM-SERVICE-REQUEST | service_requests, service_catalog_items |
| ITSM-PROBLEM-MGMT | service_problems |
| ITSM-CHANGE-MGMT | service_changes |
| ITSM-EVENT-MGMT | monitoring_alerts (embedded_master) |
| ITSM-KNOWLEDGE | knowledge_articles |
| ITSM-AGENT-WORKSPACE | (none of its own — only embedded org_units/locations) |
| ITSM-SLA-MGMT | service_slas |

Embedded/consumed (correctly NOT mastered here): configuration_items (CMDB d4), error_groups (OBS), asset_lifecycle_events (HAM), service_level_objectives (consumer), onboarding_tasks, locations/org_units/cost_centers (reference masters).

## Vendors

1. **ServiceNow ITSM** — enterprise market leader; defines the superset (task model, CAB, major incident, walk-up). Canonical surface anchor.
2. **Jira Service Management** — dev-centric/mid-market; strongest on incident + on-call (Opsgenie) and request portal.
3. **Freshservice (Freshworks)** — mid-market specialist (50-250-user sweet spot); clean REST API, strong catalog + workflow automator.
4. **ManageEngine ServiceDesk Plus** — mid-market ITIL specialist; strong procurement/contract/purchase entities.
5. **Halo ITSM** — mid-market ITIL-verified specialist; surfaces approval-process, contract, billing entities explicitly.

Two mid-market specialists (Freshservice, ManageEngine) plus Halo cover the 50-250-user angle. No standalone compliance vendor — ITSM change control is governed by SOX/ISO20000/ISO27001 via the approval + audit-trail entities below, not by a dedicated compliance product.

## Surface matrix (condensed)

Core (all/most vendors, already in footprint): service_incidents, service_requests, service_catalog_items, service_problems, service_changes, knowledge_articles, service_slas, monitoring_alerts.

Core/common but MISSING: ticket_approvals, ticket_state_transitions, agent_groups, incident_tasks, change_tasks, known_errors, escalation_rules, ticket_comments, customer_satisfaction_surveys, knowledge_categories, service_releases, major_incidents, sla_breach_events, service_request_items, fulfillment_tasks, on_call_schedules, operational_level_agreements, change_advisory_boards, approval_policies, maintenance_windows, knowledge_feedback, ticket_priorities, agent_shifts, change_approval_records.

Full per-entity matrix with vendor columns and proposed modules in the JSON file.

## Compliance entities

| Entity | Basis |
|---|---|
| change_approval_records | SOX/ISO20000 change-approval audit trail (who approved, when) |
| ticket_approvals | change/request approval object; segregation-of-duties evidence |
| ticket_state_transitions / ticket_audit_logs | ISO20000/SOX immutable per-ticket activity history |
| sla_breach_events | SLA contractual reporting evidence |
| approval_policies | segregation-of-duties routing config |

## Diff summary counts

| Bucket | Count |
|---|---|
| MISSING | 24 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 (6 boundary objects reviewed, all correct KEEP) |
| MODULARIZATION ISSUES | 0 |

No wrong-ownership and no scope-creep: every embedded/consumed object is correctly NOT mastered by ITSM and sits in the right role per the boundary rules (CMDB/HAM/SAM/SMP/OBS/ITOM). The gap is entirely the workflow substrate inside each module.

## Top 5 most-impactful MISSING entities

1. **ticket_approvals** (ITSM-CHANGE-MGMT) — the spine of change governance; the audit object for SOX/ISO20000 change control. All 5 vendors model it. ITSM owns service_changes but has no approval object at all.
2. **ticket_state_transitions** (ITSM-AGENT-WORKSPACE) — immutable per-ticket history; the ITIL/ISO20000 evidence trail and the source of all MTTR/cycle-time analytics. Universal across vendors.
3. **agent_groups** (ITSM-AGENT-WORKSPACE) — the assignment/queue routing primitive; tickets route to a group before an individual. No support-group object exists (org_units is the HR concept, not a support queue). Also gives AGENT-WORKSPACE its first own master (Rule #14).
4. **incident_tasks** (ITSM-INCIDENT-MGMT) — child-work decomposition under a parent ticket; without it multi-team incident/request work cannot be tracked. Flat masters today.
5. **known_errors** (ITSM-PROBLEM-MGMT) — the Known Error Database, a first-class ITIL object distinct from problems, consumed by incident triage.

## Modularization verdict: COHERENT

The 8-module split maps cleanly onto canonical ITIL practice areas and onto how the flagship vendors package the domain. Every module satisfies Rule #14 except ITSM-AGENT-WORKSPACE, which currently has no domain-owned master of its own (only embedded org_units/locations) — a soft-fail that the MISSING agent_groups / ticket_state_transitions / ticket_comments resolve once added. Two cosmetic notes: AGENT-WORKSPACE needs >=1 own master; CHANGE-MGMT is named "Change and Release Management" but masters only service_changes (service_releases is the missing second master that makes the name honest). No merges, splits, or renames recommended — the fix is filling each module's workflow substrate, not restructuring.
