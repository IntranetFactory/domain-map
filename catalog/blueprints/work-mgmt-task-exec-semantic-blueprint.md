---
artifact: semantic-blueprint
fact_sheet_version: "2.0"
system_name: WORK-MGMT-TASK-EXEC
system_description: Task and Project Execution
system_slug: work-mgmt-task-exec
domain_modules:
  - work-mgmt-task-exec
domain_code: WORK-MGMT
related_modules: [crm-pipeline-mgt, emp-exp-action-planning, pm-discovery, pm-roadmap-delivery, psa-project-delivery, psa-resource-mgmt, sem-execution-tracking, work-mgmt-goals-okr, wsc-channels-conversations]
created_at: 2026-05-31
---

# Task and Project Execution

## 1. Overview

### 1.1 Analyst overview

Cross-functional task and project execution surface: work items with owners, due dates, dependencies, statuses, and assignments; project containers with timelines, dashboards, and board views; user-authored automation rules that fire on item state changes. The deployable substrate every team-based work-management product orbits.

## 2. Entity summary

| Name | Description |
| --- | --- |
| Approval Chains | Ordered or parallel set of work_approval_steps gating a work_item or work_project transition. Backs the APPROVAL-WORKFLOW capability (cross-cutting; this is the WORK-MGMT realization). |
| Approval Steps | Single approval gate on a work_item or work_project, performed by a designated approver. Belongs to a work_approval_chain. Per-step states: pending / approved / rejected / expired. |
| Custom Field Values | Per-work_item value for a work_custom_field. Junction-style master: tuple (work_item, work_custom_field, value). Monday column_values, Asana custom_field_values, Smartsheet cells. |
| Custom Fields | User-defined field attached to a work_project or workspace, typed (text, number, date, select, etc.). Applies to all work_items in scope. Monday columns / Asana custom fields / ClickUp custom fields / Workfront / Smartsheet column types. |
| Item Attachments | File or external link attached to a work_item. May reference embedded content or platform-managed storage. |
| Item Comments | Threaded comment on a work_item. Asana stories / Monday updates / ClickUp comments / Workfront updates / Smartsheet conversations. May include personal or sensitive content. |
| Item Tag Assignments | Junction master between work_items and work_tags. Carries no qualifier of its own; existence asserts the tag is applied. |
| Milestones | Zero-duration gate within a work_project marking a meaningful transition. Distinct from a regular work_item by gate semantics (passed/missed). Asana, Monday, ClickUp, Workfront, Smartsheet all model. |
| Project Templates | Reusable work_project blueprint with seeded sections, items, custom fields, and automations. Universal across all 5 flagships; central to enterprise rollout patterns. |
| Sections | Container within a work_project that groups work_items for board/list views. Asana sections / Monday groups / ClickUp statuses-as-columns / Workfront statuses / Smartsheet parent rows. |
| Tags | Free-form label attached to work_items for cross-cutting categorization (priority, theme, status). Many-to-many to work_items via work_item_tags. |
| Task Templates | Reusable work_item blueprint with seeded assignee role, due-date offset, subtasks, and custom field defaults. Used for recurring or templated work creation. |
| Work Automations | Trigger-action rule defined per board/project: status change, due date, assignment, form submission as triggers; multi-step actions with conditions, time delays, and external integrations. The user-authored behavior layer on top of the data primitives. |
| Work Dependencies | Typed dependency between two work_items: predecessor/successor with type (FS finish-to-start, SS start-to-start, FF finish-to-finish, SF start-to-finish). Backs the WORK-DEPS-SCHED capability. Modeled by Asana, Monday, ClickUp, Workfront, Smartsheet. |
| Work Items | Atomic primitive in a work-management platform: task / item / card with owner, due date, status, priority, dependencies, subtasks, attachments, and comments. Same shape regardless of platform-specific terminology (task, item, row, card). |
| Work Projects | Container of work_items, regardless of platform-specific terminology (project, board, sheet, space/list). Has timeline, status, owner, members, dashboards, and embedded views. |
| Workloads | Per-user, per-period sum of allocated effort on work_items, with capacity ceiling. Backs the WORK-CAPACITY capability. Continuous-numeric, not state-driven. May expose individual workload. |
| Business Value Assessments | Scoring model for prioritising portfolio items: NPV, strategic alignment, risk, dependencies, resource constraints. Ranked backlog. |
| Engagement Action Plans | Team or manager action commitment in response to engagement_drivers result. Tracked to closure; recurring failure to act is itself an engagement signal. |
| Feature Requests | Customer request for new capability; input to the prioritisation workflow. |
| Opportunities | Active sales deal - stage, amount, close date, probability, products/SKUs, competitor, decision criteria. Drives CPQ quote generation and closed-won triggers downstream subscription activation. |
| Portfolios | Container for strategic initiatives grouped by business unit, product line, or cost center; aggregate KPIs and investment rules. |
| Product Releases | Versioned software release; bundles features and defines delivery date and scope. |
| Product Roadmaps | Timeline view of features grouped by release, product, or theme. Marquee PROD-MGMT capability. |
| Project Assignments | Worker-to-project allocation with role, bill rate, cost rate, planned hours, period. Drives utilisation and resource-availability reporting. |
| Project Tasks | Decomposed unit of work inside a project: scope, dependencies, estimated hours, status. Drives time entry tagging and Earned Value calculation. |
| Strategic Initiatives | Multi-quarter / annual program aligned to corporate strategy; bundles related projects, has executive sponsor and benefits realisation plan. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef consumer fill:#e8def8,stroke:#7b1fa2,color:#3a155d;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  work_items["Work Items"]
  work_projects["Work Projects"]
  work_automations["Work Automations"]
  crm_opportunities["Opportunities"]
  strategic_initiatives["Strategic Initiatives"]
  strategic_portfolios["Portfolios"]
  action_plans["Engagement Action Plans"]
  business_value_assessments["Business Value Assessments"]
  project_tasks["Project Tasks"]
  product_roadmaps["Product Roadmaps"]
  feature_requests["Feature Requests"]
  product_releases["Product Releases"]
  project_assignments["Project Assignments"]
  work_dependencies["Work Dependencies"]
  work_milestones["Milestones"]
  work_approval_steps["Approval Steps"]
  work_approval_chains["Approval Chains"]
  work_user_workloads["Workloads"]
  work_custom_fields["Custom Fields"]
  work_custom_field_values["Custom Field Values"]
  work_sections["Sections"]
  work_project_templates["Project Templates"]
  work_task_templates["Task Templates"]
  work_tags["Tags"]
  work_item_tags["Item Tag Assignments"]
  work_item_comments["Item Comments"]
  work_item_attachments["Item Attachments"]
  users["Users"]
  work_dependencies -->|"blocks"| work_items
  work_milestones -->|"belongs_to"| work_projects
  work_approval_steps -->|"belongs_to"| work_approval_chains
  work_approval_chains -->|"gates (opt)"| work_items
  work_approval_chains -->|"gates_project (opt)"| work_projects
  work_user_workloads -->|"rolls_up"| work_items
  work_custom_fields -->|"applies_to (opt)"| work_projects
  work_custom_field_values -->|"valued_for"| work_custom_fields
  work_custom_field_values -->|"set_on"| work_items
  work_sections -->|"belongs_to"| work_projects
  work_items -->|"placed_in (opt)"| work_sections
  work_project_templates -->|"seeds (opt)"| work_projects
  work_task_templates -->|"seeds_item (opt)"| work_items
  work_item_tags -->|"references_tag"| work_tags
  work_item_tags -->|"tagged_on"| work_items
  work_item_comments -->|"belongs_to"| work_items
  work_item_attachments -->|"belongs_to"| work_items
  action_plans -->|"spawns (opt)"| work_items
  work_items -->|"depends_on (opt)"| work_items
  work_projects -->|"contains"| work_items
  work_automations -->|"drives (opt)"| work_items
  work_automations -->|"applies_to (opt)"| work_projects
  strategic_initiatives -->|"portfolio rollup from (opt)"| work_items
  work_automations -->|"rolls_up_into (opt)"| strategic_portfolios
  work_automations -->|"feeds (opt)"| project_tasks
  work_automations -->|"mirrors_to (opt)"| product_roadmaps
  project_tasks -->|"performed_by (opt)"| project_assignments
  users -->|"owns_milestones (opt)"| work_milestones
  users -->|"approves_steps (opt)"| work_approval_steps
  users -->|"initiated_chains (opt)"| work_approval_chains
  users -->|"created_custom_fields (opt)"| work_custom_fields
  users -->|"created_sections (opt)"| work_sections
  users -->|"authored_project_templates (opt)"| work_project_templates
  users -->|"authored_task_templates (opt)"| work_task_templates
  users -->|"authored_comments (opt)"| work_item_comments
  users -->|"uploaded_attachments (opt)"| work_item_attachments
  users -->|"owns"| action_plans
  action_plans -->|"is_assigned_to (opt)"| users
  users -->|"assigned items (opt)"| work_items
  users -->|"created items"| work_items
  users -->|"owns projects"| work_projects
  users -->|"authored automations"| work_automations
  users -->|"owns"| crm_opportunities
  users -->|"assigned_to (opt)"| project_tasks
  users -->|"staffed_on"| project_assignments
  class work_items master;
  class work_projects master;
  class work_automations master;
  class crm_opportunities consumer;
  class strategic_initiatives consumer;
  class strategic_portfolios consumer;
  class action_plans consumer;
  class business_value_assessments consumer;
  class project_tasks consumer;
  class product_roadmaps consumer;
  class feature_requests consumer;
  class product_releases consumer;
  class project_assignments consumer;
  class work_dependencies master;
  class work_milestones master;
  class work_approval_steps master;
  class work_approval_chains master;
  class work_user_workloads master;
  class work_custom_fields master;
  class work_custom_field_values master;
  class work_sections master;
  class work_project_templates master;
  class work_task_templates master;
  class work_tags master;
  class work_item_tags master;
  class work_item_comments master;
  class work_item_attachments master;
  class users platform_builtin;
  style crm_opportunities stroke-dasharray:5 5;
  style strategic_initiatives stroke-dasharray:5 5;
  style strategic_portfolios stroke-dasharray:5 5;
  style action_plans stroke-dasharray:5 5;
  style business_value_assessments stroke-dasharray:5 5;
  style project_tasks stroke-dasharray:5 5;
  style product_roadmaps stroke-dasharray:5 5;
  style feature_requests stroke-dasharray:5 5;
  style product_releases stroke-dasharray:5 5;
  style project_assignments stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | role | mastered in | label | necessity | pattern flags | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `work_approval_chains` (Approval Chains) | master | - | - | required | - | - |
| 2 | `work_approval_steps` (Approval Steps) | master | - | - | required | single_approver | - |
| 3 | `work_custom_field_values` (Custom Field Values) | master | - | - | required | - | - |
| 4 | `work_custom_fields` (Custom Fields) | master | - | - | required | - | - |
| 5 | `work_item_attachments` (Item Attachments) | master | - | - | required | - | - |
| 6 | `work_item_comments` (Item Comments) | master | - | - | required | personal_content | - |
| 7 | `work_item_tags` (Item Tag Assignments) | master | - | - | required | - | - |
| 8 | `work_milestones` (Milestones) | master | - | - | required | - | - |
| 9 | `work_project_templates` (Project Templates) | master | - | - | required | - | - |
| 10 | `work_sections` (Sections) | master | - | - | required | - | - |
| 11 | `work_tags` (Tags) | master | - | - | required | - | - |
| 12 | `work_task_templates` (Task Templates) | master | - | - | required | - | - |
| 13 | `work_automations` (Work Automations) | master | - | - | required | - | - |
| 14 | `work_dependencies` (Work Dependencies) | master | - | - | required | - | - |
| 15 | `work_items` (Work Items) | master | - | - | required | - | - |
| 16 | `work_projects` (Work Projects) | master | - | - | required | submit_lock | - |
| 17 | `work_user_workloads` (Workloads) | master | - | - | required | personal_content | - |
| 18 | `business_value_assessments` (Business Value Assessments) | consumer | `SPM` _(domain-level, not modularized)_ | Strategic Portfolio Management | optional | - | - |
| 19 | `action_plans` (Engagement Action Plans) | consumer | `emp-exp-action-planning` | Action Planning | optional | - | - |
| 20 | `feature_requests` (Feature Requests) | consumer | `pm-discovery` | Product Discovery and Prioritization | optional | - | - |
| 21 | `crm_opportunities` (Opportunities) | consumer | `crm-pipeline-mgt` | Opportunity and Pipeline Management | optional | - | - |
| 22 | `strategic_portfolios` (Portfolios) | consumer | `SPM` _(domain-level, not modularized)_ | Strategic Portfolio Management | optional | - | - |
| 23 | `product_releases` (Product Releases) | consumer | `pm-roadmap-delivery` | Roadmap, Release, and Strategy | optional | - | - |
| 24 | `product_roadmaps` (Product Roadmaps) | consumer | `pm-roadmap-delivery` | Roadmap, Release, and Strategy | optional | - | - |
| 25 | `project_assignments` (Project Assignments) | consumer | `psa-resource-mgmt` | Resource Management | optional | - | - |
| 26 | `project_tasks` (Project Tasks) | consumer | `psa-project-delivery` | Project Delivery | optional | - | - |
| 27 | `strategic_initiatives` (Strategic Initiatives) | consumer | `sem-execution-tracking` | Execution Tracking | optional | - | - |

## 4. Aliases and industry synonyms

_(no industry-scoped aliases or non-synonym alias types loaded for this scope; generic synonyms are omitted as common knowledge.)_

## 5. Relationships

### 5.1 Intra-scope edges

| from | verb | to | cardinality | kind | necessity | owner_side | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `work_dependencies` | blocks | `work_items` | many_to_many | association | required | source | - |
| `work_milestones` | belongs_to | `work_projects` | one_to_many | composition | required | target | - |
| `work_approval_steps` | belongs_to | `work_approval_chains` | one_to_many | composition | required | target | - |
| `work_approval_chains` | gates | `work_items` | many_to_many | reference | optional | source | - |
| `work_approval_chains` | gates_project | `work_projects` | many_to_many | reference | optional | source | - |
| `work_user_workloads` | rolls_up | `work_items` | many_to_many | reference | required | source | - |
| `work_custom_fields` | applies_to | `work_projects` | one_to_many | reference | optional | source | - |
| `work_custom_field_values` | valued_for | `work_custom_fields` | one_to_many | composition | required | target | - |
| `work_custom_field_values` | set_on | `work_items` | one_to_many | composition | required | target | - |
| `work_sections` | belongs_to | `work_projects` | one_to_many | composition | required | target | - |
| `work_items` | placed_in | `work_sections` | one_to_many | reference | optional | target | - |
| `work_project_templates` | seeds | `work_projects` | one_to_many | reference | optional | source | - |
| `work_task_templates` | seeds_item | `work_items` | one_to_many | reference | optional | source | - |
| `work_item_tags` | references_tag | `work_tags` | one_to_many | composition | required | target | - |
| `work_item_tags` | tagged_on | `work_items` | one_to_many | composition | required | target | - |
| `work_item_comments` | belongs_to | `work_items` | one_to_many | composition | required | target | - |
| `work_item_attachments` | belongs_to | `work_items` | one_to_many | composition | required | target | - |
| `action_plans` | spawns | `work_items` | one_to_many | reference | optional | source | - |
| `work_items` | depends_on | `work_items` | many_to_many | association | optional | source | - |
| `work_projects` | contains | `work_items` | one_to_many | composition | required | source | - |
| `work_automations` | drives | `work_items` | one_to_many | reference | optional | source | - |
| `work_automations` | applies_to | `work_projects` | many_to_many | association | optional | target | - |
| `strategic_initiatives` | portfolio rollup from | `work_items` | one_to_many | reference | optional | target | - |
| `work_automations` | rolls_up_into | `strategic_portfolios` | many_to_many | reference | optional | source | - |
| `work_automations` | feeds | `project_tasks` | many_to_many | reference | optional | source | - |
| `work_automations` | mirrors_to | `product_roadmaps` | many_to_many | reference | optional | source | - |
| `project_tasks` | performed_by | `project_assignments` | many_to_many | association | optional | target | - |

### 5.2 Built-in edges (`users` and other platform built-ins)

| from | verb | to | cardinality | necessity | owner_side | notes |
| --- | --- | --- | --- | --- | --- | --- |
| `users` | owns_milestones | `work_milestones` | one_to_many | optional | source | - |
| `users` | approves_steps | `work_approval_steps` | one_to_many | optional | source | - |
| `users` | initiated_chains | `work_approval_chains` | one_to_many | optional | source | - |
| `users` | created_custom_fields | `work_custom_fields` | one_to_many | optional | source | - |
| `users` | created_sections | `work_sections` | one_to_many | optional | source | - |
| `users` | authored_project_templates | `work_project_templates` | one_to_many | optional | source | - |
| `users` | authored_task_templates | `work_task_templates` | one_to_many | optional | source | - |
| `users` | authored_comments | `work_item_comments` | one_to_many | optional | source | - |
| `users` | uploaded_attachments | `work_item_attachments` | one_to_many | optional | source | - |
| `users` | owns | `action_plans` | one_to_many | required | source | - |
| `action_plans` | is_assigned_to | `users` | many_to_many | optional | target | - |
| `users` | assigned items | `work_items` | one_to_many | optional | source | - |
| `users` | created items | `work_items` | one_to_many | required | source | - |
| `users` | owns projects | `work_projects` | one_to_many | required | source | - |
| `users` | authored automations | `work_automations` | one_to_many | required | source | - |
| `users` | owns | `crm_opportunities` | one_to_many | required | source | - |
| `users` | assigned_to | `project_tasks` | many_to_many | optional | target | - |
| `users` | staffed_on | `project_assignments` | one_to_many | required | target | - |

### 5.3 Cross-scope edges

#### 5.3a Outbound from this scope's masters and contributors

_Edges this scope drives: the in-scope endpoint has `role` of `master` or `contributor`._

| from | verb | to | cardinality | necessity | notes |
| --- | --- | --- | --- | --- | --- |
| `test_defects` | spawns | `work_items` | one_to_many | optional | - |
| `work_form_submissions` | converts_to | `work_items` | one_to_many | optional | - |
| `work_forms` | routes_to | `work_projects` | one_to_many | optional | - |
| `okr_objectives` | tracked_by | `work_items` | one_to_many | optional | - |
| `work_projects` | aligned_to | `okr_objectives` | many_to_many | optional | - |
| `work_items` | mirrors_to | `service_requests` | one_to_one | optional | - |
| `work_automations` | propagates_to | `service_requests` | many_to_many | optional | - |
| `work_projects` | closes_into | `service_projects` | one_to_one | optional | - |
| `work_automations` | posts_to | `chat_channels` | many_to_many | optional | - |

#### 5.3b Context edges on embedded shells and consumed entities

_Edges the canonical owner drives, shown for context: the in-scope endpoint has `role` of `embedded_master`, `consumer`, or `derived`._

<details>
<summary>20 context edges</summary>

| from | verb | to | cardinality | necessity | notes |
| --- | --- | --- | --- | --- | --- |
| `customers` | flags_churn_risk_on | `crm_opportunities` | one_to_many | optional | - |
| `crm_opportunities` | is activity context for | `customer_cases` | one_to_many | optional | - |
| `crm_opportunities` | opens | `customer_cases` | one_to_many | optional | - |
| `customers` | impacted_by | `product_releases` | many_to_many | optional | - |
| `legal_contracts` | renewal_warns | `crm_opportunities` | one_to_many | optional | - |
| `okr_objectives` | advanced_by | `strategic_initiatives` | many_to_many | optional | - |
| `strategic_initiatives` | reviewed_in | `operating_reviews` | many_to_many | optional | - |
| `strategy_decisions` | affects | `strategic_initiatives` | many_to_many | optional | - |
| `engagement_drivers` | triggers | `action_plans` | one_to_many | optional | - |
| `org_units` | owns | `action_plans` | one_to_many | optional | - |
| `crm_opportunities` | drafts | `legal_contracts` | one_to_many | optional | - |
| `customers` | has_opportunities | `crm_opportunities` | one_to_many | required | - |
| `crm_opportunities` | converted_from_lead | `crm_leads` | one_to_many | optional | - |
| `pipeline_stages` | tracks | `crm_opportunities` | one_to_many | required | - |
| `crm_opportunities` | involves_contacts | `crm_contacts` | many_to_many | optional | - |
| `crm_opportunities` | has_activities | `sales_activities` | one_to_many | optional | - |
| `service_projects` | contains | `project_tasks` | one_to_many | required | - |
| `service_projects` | staffs | `project_assignments` | one_to_many | required | - |
| `project_assignments` | requires_skills_from | `resource_skill_inventories` | many_to_many | optional | - |
| `project_resource_allocations` | confirms_into | `project_assignments` | one_to_many | optional | - |

</details>

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)

| data_object | other module / domain | role | necessity | notes |
| --- | --- | --- | --- | --- |
| `work_automations` | PM-ROADMAP-DELIVERY (Roadmap, Release, and Strategy) - PROD-MGMT | consumer | optional | - |
| `work_automations` | WSC-CHANNELS-CONVERSATIONS (Channels and Conversations) - WSC | consumer | optional | - |
| `work_items` | PM-ROADMAP-DELIVERY (Roadmap, Release, and Strategy) - PROD-MGMT | consumer | optional | - |
| `work_items` | SPM (Strategic Portfolio Management) | consumer | required | Portfolio dashboards roll up project/work_item completion as input to portfolio status and strategy-execution alignment. |
| `work_items` | WORK-MGMT-GOALS-OKR (Team-Execution Goals and OKRs) - WORK-MGMT | embedded_master | required | - |
| `work_projects` | PSA-PROJECT-DELIVERY (Project Delivery) - PSA | consumer | optional | - |

### 6.2 Outbound handoffs (events this scope publishes)

| source module | target domain | target module | trigger_event | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WORK-MGMT-TASK-EXEC | SPM | _(domain-level)_ | `work_project.completed` | `work_projects` | api_call | medium | WM work_project completion feeds SPM portfolio rollup (project closure as a milestone in the strategic portfolio). target_domain_module_id NULL because SPM is not yet modularized. |
| WORK-MGMT-TASK-EXEC | SPM | _(domain-level)_ | `work_item.completed` | `work_items` | batch_sync | medium | Work-management platforms publish task-completion data to portfolio dashboards in SPM tools. The portfolio rollup powers strategy-to-execution dashboards and OKR progress (via okr_objectives.key_results linking down to work_items). Nightly sync is the common pattern; richer real-time integrations exist but are vendor-specific. |
| WORK-MGMT-TASK-EXEC | SPM | _(domain-level)_ | `work_automation.triggered` | `work_automations` | batch_sync | medium | Aggregated work-automation outcomes feed SPM portfolio rollup. |
| WORK-MGMT-TASK-EXEC | PSA | PSA-PROJECT-DELIVERY | `work_item.completed` | `work_items` | api_call | low | When WM is the work tracker for a PSA-managed delivery, work_item completion closes the loop on PSA-side time / utilization accounting. Pairs with the existing PSA -> WM project_task.completed inbound for the bidirectional sync pattern. |
| WORK-MGMT-TASK-EXEC | PSA | PSA-PROJECT-DELIVERY | `work_project.completed` | `work_projects` | batch_sync | medium | Services orgs running delivery in WORK-MGMT close a project and need utilization, billable hours, and milestone-based revenue recognition to roll up into PSA. Nightly sync of project status + hours is the common pattern; richer real-time integration exists but is uncommon. |
| WORK-MGMT-TASK-EXEC | PSA | _(domain-level)_ | `work_automation.triggered` | `work_automations` | event_stream | low | Automation-driven task transitions feed PSA for utilization and billable-hour tracking. |
| WORK-MGMT-TASK-EXEC | WSC | WSC-CHANNELS-CONVERSATIONS | `work_automation.triggered` | `work_automations` | api_call | low | Automations post status updates and task notifications into workstream collaboration channels. |
| WORK-MGMT-TASK-EXEC | PROD-MGMT | PM-ROADMAP-DELIVERY | `work_automation.triggered` | `work_automations` | event_stream | medium | Engineering team automations mirror into product-management roadmap tracking. |
| WORK-MGMT-TASK-EXEC | PROD-MGMT | PM-ROADMAP-DELIVERY | `work_automation.disabled` | `work_automations` | event_stream | low | A WORK-MGMT automation rule has been disabled. PROD-MGMT subscribers stop reacting to its downstream effects (e.g. auto-creation of feature_request linkages from incoming work_items). |
| WORK-MGMT-TASK-EXEC | PROD-MGMT | PM-ROADMAP-DELIVERY | `work_item.completed` | `work_items` | api_call | medium | WM work_item completion updates PROD-MGMT roadmap progress when items are linked to feature_requests or product_releases. Most product-mgmt tools (Aha, Productboard, Roadmunk) integrate via this signal but each integration is bespoke - friction is the mapping between work_item id and roadmap_item id. |
| WORK-MGMT-TASK-EXEC | WORK-MGMT | WORK-MGMT-GOALS-OKR | `work_automation.triggered` | `work_automations` | event_stream | low | Automation rules can drive OKR check-in updates or auto-progress KRs based on work_item events. Eventful (out-of-process at runtime) because automation execution decouples from the caller. |
| WORK-MGMT-TASK-EXEC | WORK-MGMT | WORK-MGMT-GOALS-OKR | `work_item.completed` | `work_items` | lifecycle_progression | low | Terminal completion of a work item is the strongest progress signal - drives KR closure recalculation and triggers KR-fully-met evaluations on linked objectives. |
| WORK-MGMT-TASK-EXEC | WORK-MGMT | WORK-MGMT-GOALS-OKR | `work_item.status_changed` | `work_items` | lifecycle_progression | low | Work item status change triggers KR progress recalculation in GOALS-OKR for any objective that has linked the item to a key result. In-process FK + state read; no message moves. |

### 6.3 Inbound handoffs (events this scope reacts to)

| target module | source domain | source module | trigger_event | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WORK-MGMT-TASK-EXEC | PROD-MGMT | PM-DISCOVERY | `feature_request.upvoted_threshold` | `feature_requests` | event_stream | medium | Once demand-signal crosses the prioritisation threshold, an engineering work item / epic is created in WORK-MGMT. Many teams still do this by hand. |
| WORK-MGMT-TASK-EXEC | SPM | _(domain-level)_ | `business_value_assessment.completed` | `business_value_assessments` | event_stream | medium | Approved initiatives cascade into team-level work items in WORK-MGMT. |
| WORK-MGMT-TASK-EXEC | PROD-MGMT | PM-ROADMAP-DELIVERY | `product_roadmap.published` | `product_roadmaps` | event_stream | low | A new or updated product roadmap is published in PROD-MGMT. WORK-MGMT subscribers create work_projects or sub-projects representing the new roadmap initiatives so cross-functional teams can begin execution tracking. |
| WORK-MGMT-TASK-EXEC | PROD-MGMT | PM-ROADMAP-DELIVERY | `product_release.planned` | `product_releases` | event_stream | low | WORK-MGMT creates the delivery workstream / release train for the planned release, with the scope and target date hydrated from PROD-MGMT. |
| WORK-MGMT-TASK-EXEC | PSA | PSA-RESOURCE-MGMT | `project_assignment.confirmed` | `project_assignments` | event_stream | low | PSA seeds the WORK-MGMT project board with the newly-assigned resource so day-to-day task tracking can begin. |
| WORK-MGMT-TASK-EXEC | EMP-EXP | EMP-EXP-ACTION-PLANNING | `action_plan.created` | `action_plans` | api_call | medium | Engagement action plans often tracked as work items in WORK-MGMT for execution visibility. |
| WORK-MGMT-TASK-EXEC | PROD-MGMT | PM-ROADMAP-DELIVERY | `product_release.shipped` | `product_releases` | event_stream | low | A product release ships in PROD-MGMT. WORK-MGMT subscribers close the work_items that tracked release-prep tasks and surface release notes against the project board. |
| WORK-MGMT-TASK-EXEC | EMP-EXP | EMP-EXP-ACTION-PLANNING | `action_plan.completed` | `action_plans` | api_call | medium | An engagement action plan transitions to completed in EMP-EXP. Subscribers in WORK-MGMT close the work_items that tracked each action item and roll up completion for reporting. Failure mode: action items may be closed in EMP-EXP without the linked work_items being closed in WORK-MGMT, leaving stale tasks. |
| WORK-MGMT-TASK-EXEC | PSA | PSA-RESOURCE-MGMT | `project_assignment.released` | `project_assignments` | event_stream | low | A project assignment is released in PSA (consultant rolls off or capacity is freed). WORK-MGMT subscribers may close or reassign the work_items that were owned by the released assignee. Failure mode: orphaned work_items if the release event is missed and no reassignment happens. |
| WORK-MGMT-TASK-EXEC | SPM | _(domain-level)_ | `strategic_portfolio.rebalanced` | `strategic_portfolios` | batch_sync | high | Re-prioritisation cascades to project priority updates; high-touch validation. |
| WORK-MGMT-TASK-EXEC | PSA | PSA-PROJECT-DELIVERY | `project_task.completed` | `project_tasks` | event_stream | low | PSA task completion mirrors into the WORK-MGMT board to keep team-level views current. |
| WORK-MGMT-TASK-EXEC | SPM | _(domain-level)_ | `demand_intake.approved` | `strategic_initiatives` | api_call | high | SPM creates work_projects + kickoff work_items for charter and resourcing. |
| WORK-MGMT-TASK-EXEC | CRM | CRM-PIPELINE-MGT | `crm_opportunity.closed_won` | `crm_opportunities` | api_call | high | Sales closes a deal in CRM; delivery / Customer Success spin up a kickoff project in their work-management tool. Custom iPaaS automations or hand-built webhooks bridge the two; payload mapping (opportunity products to project tasks, account stakeholders to project members) is bespoke per org. |
| WORK-MGMT-TASK-EXEC | PROD-MGMT | PM-ROADMAP-DELIVERY | `product_roadmap.item_promoted` | `product_roadmaps` | event_stream | medium | Promoting a roadmap item to now/next must create the corresponding delivery work in WORK-MGMT; manual handoff here is one of the most-cited PROD↔ENG pain points. |
| WORK-MGMT-TASK-EXEC | PROD-MGMT | PM-ROADMAP-DELIVERY | `product_release.rolled_back` | `product_releases` | event_stream | medium | A product release is rolled back in PROD-MGMT (post-ship regression or incident). WORK-MGMT subscribers reopen the work_items that tracked the release and spawn remediation tasks. Failure mode: remediation tasks may not be scoped correctly if the rollback reason isn't propagated. |

### 6.4 Master providers (modules / domains that own masters this scope embeds)

| data_object | role here | necessity | canonical owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `action_plans` | consumer | optional | EMP-EXP-ACTION-PLANNING (EMP-EXP) | - |
| `business_value_assessments` | consumer | optional | SPM (Strategic Portfolio Management) | - |
| `crm_opportunities` | consumer | optional | CRM-PIPELINE-MGT (CRM) | - |
| `feature_requests` | consumer | optional | PM-DISCOVERY (PROD-MGMT) | - |
| `product_releases` | consumer | optional | PM-ROADMAP-DELIVERY (PROD-MGMT) | - |
| `product_roadmaps` | consumer | optional | PM-ROADMAP-DELIVERY (PROD-MGMT) | - |
| `project_assignments` | consumer | optional | PSA-RESOURCE-MGMT (PSA) | - |
| `project_tasks` | consumer | optional | PSA-PROJECT-DELIVERY (PSA) | - |
| `strategic_initiatives` | consumer | optional | SEM-EXECUTION-TRACKING (SEM), SPM (Strategic Portfolio Management) | - |
| `strategic_portfolios` | consumer | optional | SPM (Strategic Portfolio Management) | - |

## 7. Lifecycle states

### `action_plans` (Engagement Action Plan)

_This scope holds `action_plans` as **consumer**; the canonical state machine is owned by `EMP-EXP-ACTION-PLANNING`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | `open` | ✓ | - | - | - | - |
| 20 | `in_progress` | - | - | - | - | - |
| 30 | `completed` | - | ✓ | ✓ | `emp-exp-action-planning:complete_action_plan` | - |
| 40 | `archived` | - | ✓ | - | - | - |

### `crm_opportunities` (Opportunity)

_This scope holds `crm_opportunities` as **consumer**; the canonical state machine is owned by `CRM-PIPELINE-MGT`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `open` | ✓ | - | - | - | Opportunity created and being scoped. |
| 2 | `qualified` | - | - | - | - | Opportunity has passed qualification and entered active pursuit. |
| 3 | `proposal` | - | - | - | - | Proposal or quote has been delivered to the prospect. |
| 4 | `negotiation` | - | - | - | - | Commercial terms are being negotiated with the prospect. |
| 5 | `won` | - | ✓ | ✓ | `crm-pipeline-mgt:close_won` | Deal closed-won; triggers downstream subscription activation. |
| 6 | `lost` | - | ✓ | - | - | Deal closed-lost; opportunity terminated without revenue. |

### `feature_requests` (Feature Request)

_This scope holds `feature_requests` as **consumer**; the canonical state machine is owned by `PM-DISCOVERY`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `new` | ✓ | - | - | - | Feature request just captured; awaiting triage. |
| 2 | `triaged` | - | - | - | - | Request has been reviewed and deemed in-scope for the product. |
| 3 | `prioritized` | - | - | - | - | Request has been ranked relative to other backlog items. |
| 4 | `accepted` | - | ✓ | ✓ | `pm-discovery:accepted_feature_request` | Request has been accepted; converted to a product_feature row. |
| 5 | `rejected` | - | ✓ | ✓ | `pm-discovery:rejected_feature_request` | Request will not be built; rationale captured. |
| 6 | `archived` | - | ✓ | - | - | Old or duplicate request; out of consideration for filtering. |

### `product_releases` (Product Release)

_This scope holds `product_releases` as **consumer**; the canonical state machine is owned by `PM-ROADMAP-DELIVERY`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `planned` | ✓ | - | - | - | Release plan exists with target date and feature set. |
| 2 | `in_progress` | - | - | - | - | Release work in flight; features merging in. |
| 3 | `shipped` | - | ✓ | ✓ | `pm-roadmap-delivery:shipped_product_release` | Release has gone live to the target audience. |
| 4 | `rolled_back` | - | ✓ | ✓ | `pm-roadmap-delivery:rolled_back_product_release` | Release was pulled after shipping due to defects or business reasons. |
| 5 | `cancelled` | - | ✓ | ✓ | `pm-roadmap-delivery:cancelled_product_release` | Release was cancelled before shipping. |

### `product_roadmaps` (Product Roadmap)

_This scope holds `product_roadmaps` as **consumer**; the canonical state machine is owned by `PM-ROADMAP-DELIVERY`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Roadmap is being authored; not visible to wider audiences. |
| 2 | `published` | - | - | ✓ | `pm-roadmap-delivery:published_product_roadmap` | Roadmap version is published; visible to the configured audience. |
| 3 | `archived` | - | ✓ | - | - | Roadmap version is superseded; kept for historical reference. |

### `project_assignments` (Project Assignment)

_This scope holds `project_assignments` as **consumer**; the canonical state machine is owned by `PSA-RESOURCE-MGMT`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `proposed` | ✓ | - | - | - | Resource manager has nominated a consultant for a role on the project; awaiting confirmation. |
| 2 | `confirmed` | - | - | ✓ | `psa-resource-mgmt:confirm_project_assignment` | Resource committed to the project at a stated allocation; HCM capacity decremented; WORK-MGMT seat created. |
| 3 | `active` | - | - | - | - | Resource is actively delivering on the assignment; hours flowing through time entries. |
| 4 | `released` | - | ✓ | ✓ | `psa-resource-mgmt:release_project_assignment` | Resource has rolled off (planned end, early release, scope change). Capacity returned to HCM bench. |

### `project_tasks` (Project Task)

_This scope holds `project_tasks` as **consumer**; the canonical state machine is owned by `PSA-PROJECT-DELIVERY`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `not_started` | ✓ | - | - | - | Task created on the project plan; not yet picked up. |
| 2 | `in_progress` | - | - | ✓ | `psa-project-delivery:start_project_task` | Assignee has begun work on the task. |
| 3 | `blocked` | - | - | ✓ | `psa-project-delivery:block_project_task` | Task cannot proceed: upstream dependency, approval, or external input outstanding. |
| 4 | `completed` | - | ✓ | ✓ | `psa-project-delivery:complete_project_task` | Task delivered; rolls into milestone progress. |
| 5 | `cancelled` | - | ✓ | ✓ | `psa-project-delivery:cancel_project_task` | Task abandoned (scope change, descope, redundancy). |

### `strategic_initiatives` (Strategic Initiative)

_This scope holds `strategic_initiatives` as **consumer**; the canonical state machine is owned by `SEM-EXECUTION-TRACKING`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `proposed` | ✓ | - | - | - | Initiative is drafted by a strategy-office contributor; not yet funded or scheduled. |
| 2 | `approved` | - | - | ✓ | `sem-execution-tracking:approve_strategic_initiative` | Initiative cleared by the operating-rhythm review; budget and owner confirmed. Publishes strategic_initiative.approved. |
| 3 | `in_progress` | - | - | - | - | Execution underway; status, milestones, and benefits realisation updated against the initiative. |
| 4 | `cancelled` | - | ✓ | ✓ | `sem-execution-tracking:cancel_strategic_initiative` | Initiative withdrawn before completion (deprioritised, blocked, or rolled into another initiative). Publishes strategic_initiative.cancelled. |
| 4 | `completed` | - | ✓ | ✓ | `sem-execution-tracking:complete_strategic_initiative` | Benefits realised or scope fully delivered. Publishes strategic_initiative.completed. |

### `work_approval_chains` (Approval Chain)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `initiated` | ✓ | - | - | - | - |
| 2 | `in_progress` | - | - | - | - | - |
| 3 | `approved` | - | ✓ | ✓ | `work-mgmt-task-exec:approve_chain` | - |
| 4 | `rejected` | - | ✓ | ✓ | `work-mgmt-task-exec:reject_chain` | - |
| 5 | `cancelled` | - | ✓ | ✓ | `work-mgmt-task-exec:cancel_approval_chain` | - |

### `work_approval_steps` (Approval Step)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `pending` | ✓ | - | - | - | - |
| 2 | `approved` | - | ✓ | ✓ | `work-mgmt-task-exec:approve_step` | - |
| 3 | `rejected` | - | ✓ | ✓ | `work-mgmt-task-exec:reject_step` | - |
| 4 | `expired` | - | ✓ | - | - | - |

### `work_automations` (Work Automation)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `drafted` | ✓ | - | - | - | - |
| 2 | `enabled` | - | - | ✓ | `work-mgmt-task-exec:enable_work_automation` | - |
| 3 | `disabled` | - | - | ✓ | `work-mgmt-task-exec:disable_work_automation` | - |
| 4 | `archived` | - | ✓ | - | - | - |

### `work_items` (Work Item)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `open` | ✓ | - | - | - | - |
| 2 | `in_progress` | - | - | - | - | - |
| 3 | `blocked` | - | - | - | - | - |
| 4 | `done` | - | ✓ | - | - | - |
| 5 | `cancelled` | - | ✓ | ✓ | `work-mgmt-task-exec:cancel_work_item` | - |

### `work_milestones` (Milestone)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `open` | ✓ | - | - | - | - |
| 2 | `reached` | - | ✓ | ✓ | `work-mgmt-task-exec:reach_work_milestone` | - |
| 3 | `missed` | - | ✓ | ✓ | `work-mgmt-task-exec:miss_work_milestone` | - |

### `work_project_templates` (Project Template)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `drafted` | ✓ | - | - | - | - |
| 2 | `published` | - | - | ✓ | `work-mgmt-task-exec:publish_project_template` | - |
| 3 | `archived` | - | ✓ | - | - | - |

### `work_projects` (Work Project)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `planning` | ✓ | - | - | - | - |
| 2 | `active` | - | - | - | - | - |
| 3 | `on_hold` | - | - | - | - | - |
| 4 | `completed` | - | ✓ | ✓ | `work-mgmt-task-exec:complete_work_project` | - |
| 5 | `archived` | - | ✓ | - | - | - |

### `work_task_templates` (Task Template)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `drafted` | ✓ | - | - | - | - |
| 2 | `published` | - | - | ✓ | `work-mgmt-task-exec:publish_task_template` | - |
| 3 | `archived` | - | ✓ | - | - | - |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `work-mgmt-task-exec:read` | baseline-read | Read access to every entity in the module | ✓ |
| `work-mgmt-task-exec:manage` | baseline-manage | Edit operational records | ✓ |
| `work-mgmt-task-exec:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `work-mgmt-task-exec:cancel_work_item` | workflow-gate (lifecycle) | Transition `work_items` into state `cancelled` | ✓ |
| `work-mgmt-task-exec:complete_work_project` | workflow-gate (lifecycle) | Transition `work_projects` into state `completed` | ✓ |
| `work-mgmt-task-exec:enable_work_automation` | workflow-gate (lifecycle) | Transition `work_automations` into state `enabled` | ✓ |
| `work-mgmt-task-exec:disable_work_automation` | workflow-gate (lifecycle) | Transition `work_automations` into state `disabled` | ✓ |
| `work-mgmt-task-exec:reach_work_milestone` | workflow-gate (lifecycle) | Transition `work_milestones` into state `reached` | ✓ |
| `work-mgmt-task-exec:miss_work_milestone` | workflow-gate (lifecycle) | Transition `work_milestones` into state `missed` | ✓ |
| `work-mgmt-task-exec:approve_step` | workflow-gate (lifecycle) | Transition `work_approval_steps` into state `approved` | ✓ |
| `work-mgmt-task-exec:reject_step` | workflow-gate (lifecycle) | Transition `work_approval_steps` into state `rejected` | ✓ |
| `work-mgmt-task-exec:approve_chain` | workflow-gate (lifecycle) | Transition `work_approval_chains` into state `approved` | ✓ |
| `work-mgmt-task-exec:reject_chain` | workflow-gate (lifecycle) | Transition `work_approval_chains` into state `rejected` | ✓ |
| `work-mgmt-task-exec:cancel_approval_chain` | workflow-gate (lifecycle) | Transition `work_approval_chains` into state `cancelled` | ✓ |
| `work-mgmt-task-exec:publish_project_template` | workflow-gate (lifecycle) | Transition `work_project_templates` into state `published` | ✓ |
| `work-mgmt-task-exec:publish_task_template` | workflow-gate (lifecycle) | Transition `work_task_templates` into state `published` | ✓ |
| `work-mgmt-task-exec:submit_work_project` | override (submit_lock) | Submit and lock a `work_projects` row (post-submit edits gated) | ✓ |
| `work-mgmt-task-exec:view_all_workloads` | override (personal_content) | View all `work_user_workloads` rows beyond row-scope | ✓ |
| `work-mgmt-task-exec:manage_all_workloads` | override (personal_content) | Manage all `work_user_workloads` rows beyond row-scope | ✓ |
| `work-mgmt-task-exec:view_all_item_comments` | override (personal_content) | View all `work_item_comments` rows beyond row-scope | ✓ |
| `work-mgmt-task-exec:manage_all_item_comments` | override (personal_content) | Manage all `work_item_comments` rows beyond row-scope | ✓ |

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `submit_restricted_to_work_project_owner` | `work_projects` | has_submit_lock | Only the row's authoring user can submit; post-submit the row is read-only except via `work-mgmt-task-exec:manage_all_work_projects` |
| `approve_approval_step_requires_approver` | `work_approval_steps` | has_single_approver | Exactly one explicit approver required; uses the module's approval gate (`work-mgmt-task-exec:approve_approval_step` if surfaced as a lifecycle workflow gate). |
| `workload_edit_scope` | `work_user_workloads` | has_personal_content | Row-scope by default; override via `work-mgmt-task-exec:view_all_workloads` / `work-mgmt-task-exec:manage_all_workloads` |
| `item_comment_edit_scope` | `work_item_comments` | has_personal_content | Row-scope by default; override via `work-mgmt-task-exec:view_all_item_comments` / `work-mgmt-task-exec:manage_all_item_comments` |
