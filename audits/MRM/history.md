# MRM audit history

## 2026-06-14 - Build

New domain. Built from the Phase 0 vendor-surface report at `.tmp_deploy/MRM-phase0-2026-06-14.md`
(verdict: promote-as-domain, BORDERLINE, scoped tightly to the marketing planning + budget kernel).
Loaded live on tenant adenin (domain_map module 1001) at `record_status='new'` throughout.

### Scope decision (the kernel)

MRM was built scoped tightly to the part of classic Gartner MRM that no existing catalog domain owns:
the **marketing plan hierarchy, plan-line budget allocation, committed/actual spend reconciled to plan,
the marketing calendar, and plan-level performance measurement.** Everything else was referenced, not
re-implemented:

- **Campaign execution** stays in Marketing Automation (MA): MRM consumes `marketing_campaigns`
  (mastered by MA-CAMPAIGN-AUTHORING) and hands off plan-approved campaigns to it.
- **Generic work/task/project management** stays in Work Management (WORK-MGMT): MRM consumes
  `work_items` and `work_projects` (mastered by WORK-MGMT-TASK-EXEC) and hands off scheduled plan lines.
- **Brand/creative asset storage** stays in Digital Asset Management (DAM): MRM references
  `digital_assets` via a `data_object_relationships` edge only (DAM is unbuilt at module grain, so no
  `consumer` DMDO / handoff was authored against it; a consumer row needs a canonical master to defer to).

The fold-into-WORK-MGMT fallback is surfaced as the GATE question (B2-S1) in `q-MRM.md`, grounded in the
named-vendor evidence: Uptempo is the lone clear independent flagship; the work/asset halves are
converging into WORK-MGMT and DAM-led suites.

### Resolved ids

- domain MRM = **173**; modules MRM-PLANNING = **350**, MRM-BUDGET = **351**.
- masters: marketing_plans 1066, marketing_plan_lines 1067, marketing_calendars 1068, marketing_budgets
  1069, marketing_budget_allocations 1070, marketing_spend_records 1071, marketing_performance_metrics 1072.
- system skill mrm-system = 460.
- adjacency ids resolved live: MA 70 (campaign module 197), DAM 92, WORK-MGMT 135 (task module 149),
  AGENCY-MGMT 153. business functions: Marketing 22 (owner), Finance 4 (contributor). users built-in 748.
- vendors reused: Adobe 195, Sitecore 234, Planful 185, Aprimo 319; new: Uptempo. solutions reused:
  Adobe Workfront 617, Aprimo Marketing Productivity 756; new: Uptempo, Planful for Marketing,
  Sitecore Content Hub.
- PCF nodes wired (cross-industry): 3.3 Develop and manage marketing plans (23), 3.3.2 Establish
  marketing budgets (134), 3.3.2.3 Create marketing budget (647), 3.4.2.10 Develop promotional/category
  management calendars (698). The custom-process carve-out did NOT trigger: real cross-industry PCF
  nodes fit the gated marketing-planning/budget processes, so no `processes`/`process_raci` were invented.

### Load summary (record_status='new' on every row; notes empty on every row; no em-dash; no MCP; CLI only)

- Phase A: 1 domain (+ all 7 Rule #8 metadata fields + catalog_tagline + catalog_description),
  5 capabilities + 5 capability_domains, 2 full domain_modules + 5 domain_module_capabilities,
  1 new vendor (Uptempo), 3 new solutions + 5 solution_domains (2 reused solutions linked).
- Phase B: 7 data_objects (masters), 10 domain_module_data_objects (7 master + 3 cross-domain consumer),
  18 data_object_relationships (9 intra-domain + 5 users edges per Rule #10 + 4 cross-domain incl. the
  DAM digital_assets reference), 14 data_object_aliases, 17 data_object_lifecycle_states across the
  4 operational_workflow masters, 6 trigger_events, 4 handoffs (2 cross-domain to MA + WORK-MGMT with
  both module FKs populated, 2 intra-domain lifecycle_progression), 2 handoff_processes (PCF 3.3, 3.4.2.10).
- Phase C: 2 business_function_domains (Marketing owner, Finance contributor).
- Phase S: 1 domain-grain system skill (mrm-system), 14 tools (12 new + notify_person/notify_team
  reused), 16 domain_module_tools. Notifications use the notify_person/notify_team abstractions
  (Rule #17 default), not channel-specific primitives.
- Phase E: 3 personas (MARKETING-MARKETING-OPS-MANAGER, MARKETING-MARKETING-PLANNER cross-functional
  MARKETING-BUDGET-OWNER), each with >=2 role_modules (6 total); 9 process_raci across PCF 3.3 / 3.3.2 /
  3.3.2.3, each carrying >=1 Responsible + >=1 Accountable; 4 gated lifecycle states wired to PCF
  process_id (plans.approved -> 23, budgets.approved -> 134, allocations.approved -> 647,
  spend.reconciled -> 134).

### Audit bands verified this pass (all passing)

- A1 (Rule #8 metadata): PASS - all 7 fields populated, zero-metadata audit returns empty for MRM.
- A2/A3/A4: 5 capabilities, 5 solutions (3 primary, 2 secondary), catalog UX populated. PASS.
- M1/M2: 2 full modules for a 5-capability domain. PASS. M4/M6: every capability has a realizing module
  and every module realizes >=1 capability. M5: every gated state has domain_module_id set. M7:
  single-master integrity catalog-wide - each of the 7 masters has exactly one master row, all in MRM. PASS.
- M8: module-level catalog UX populated on both modules. PASS.
- B1: 7 masters. B2: all have singular/plural labels. B3: all prefixed (`marketing_*`), no bare-word.
  B4: pattern flags considered and set (marketing_plans/budgets/allocations has_single_approver,
  marketing_spend_records has_submit_lock). B5: no orphan embedded_master. B6/B7: intra-domain + users
  edges present. B8: 4 outbound cross-domain edges mirror the handoffs. B11: 14 aliases. B12: every
  operational_workflow master has one initial + >=1 terminal + monotonic unique state_order. B13: zero
  unclassified masters. B14: no statute-prefixed masters (none apply). B15: no pattern flag on
  catalog/junction/computed. PASS.
- C1: 1 owner (Marketing) + 1 contributor (Finance). PASS.
- F2: exactly one domain-grain system skill (mrm-system, domain_module_id NULL). F3: 14 distinct tools
  across the modules. F4: tool operation_kind <-> data_object_id invariant holds on every row. F5:
  Semantius score computable - strict 13/14 (~0.93), the single non-platform tool is notify_team
  (coverage_tier external). PASS.
- E1: 3 personas on a multi-module domain. E2: every persona reaches >=2 modules. E3: interaction_level
  set on every role_modules row. E4: each gated process carries >=1 R + >=1 A. E6: every gated lifecycle
  state has its process_id wired. PASS.

### Naming note (Rule #9)

`marketing_*` prefixing avoided collisions with the existing `financial_budgets` (38) and
`financial_plans` (37) Finance masters and with the existing MA `marketing_campaigns` (116). The
proposed kernel names had zero collisions on the live pre-check.

### Open items -> q-MRM.md

Three b2 forks surfaced for the user (gate B2-S1 narrow-promote vs fold-into-WORK-MGMT;
B2-S2 the DAM/MA/WORK-MGMT boundary; B2-S3 the regulation set), plus three non-blocking b3 ideas
(PMM separate Phase 0, ADV-AD-TECH data-hygiene, deeper MRM substrate entities). The domain ends
`feedback_needed`; `state.yaml` carries only these open items.
