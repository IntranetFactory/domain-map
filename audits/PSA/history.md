# PSA audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 4 full modules (`PSA-PROJECT-DELIVERY`, `PSA-RESOURCE-MGMT`, `PSA-TIME-EXPENSE`, `PSA-PROJECT-FINANCIALS`); 0 starters. 6 domain-owned masters (`service_projects` 216, `project_tasks` 217, `project_assignments` 218, `project_billing_milestones` 219, `resource_skill_inventories` 725, `project_resource_allocations` 726). 10 capabilities (3 cross-cutting: `SLA-MGMT`, `TIME-TRACKING`, `REVENUE-RECOG`). 21 solutions (15 primary, 6 secondary). 17 trigger_events on PSA masters + 1 cross-cutting (`revenue.recognised` event 107 on SUB-MGMT-owned `revenue_recognition_records`). 19 outbound + 19 inbound cross-domain handoffs (38 cross-domain total); 5 intra-domain cross-module handoffs (1131-1135). 0 aliases on PSA masters. 28 lifecycle states across PSA masters (`service_projects` 6, `project_tasks` 5, `project_assignments` 4, `project_billing_milestones` 6, `project_resource_allocations` 4, `resource_skill_inventories` 0 config-shape) plus 3 states on `revenue_recognition_records` anchored to PSA module 89 (boundary concern, see B1-S1). 5 PSA roles (`BUSINESS-OPS-DELIVERY-MANAGER`, `BUSINESS-OPS-RESOURCE-MANAGER`, `BUSINESS-OPS-PROJECT-FINANCE-CONTROLLER`, `BUSINESS-OPS-CONSULTANT`, `PROJECT-SPONSOR`). 4 system skills + 63 `skill_tools` rows (strict Semantius score: 62/63 platform = approximately 98%; 1 row `notify_team` on skill 185 is `external`).
- **Vendor-surface basis (Pass 2 flagship enumeration):** Kantata (formerly Mavenlink, primary PSA pure-play), Certinia PS Cloud (formerly FinancialForce PSA, Salesforce-native), Oracle NetSuite OpenAir, Microsoft Dynamics 365 Project Operations, Deltek Vantagepoint (architecture/engineering PSA), BigTime, Replicon Polaris PSA, Rocketlane (modern services-delivery PSA), Projector PSA (now BigTime), Ruddr, Scoro, Productive, Accelo. Diversified suite coverage: Workday Projects, Oracle Fusion Project Management, SAP S/4HANA Professional Services, Unit4 ERP services. MSP-adjacent: ConnectWise PSA, Autotask PSA. Compliance anchors loaded: ASC 606 (revenue recognition).
- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 17 items (12 entities + 2 modularization + 3 regulations).

**Neighbor discovery (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):**

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| HCM | 0 | 8 (1218-1226: employee + job_profile + attrition signal) | 4 (PSA-DELIVERY consumer on `employees`/`job_profiles`; PSA-RESOURCE consumer on `employees`/`job_profiles`) | 0 | 12 | Pairwise (full) |
| WORK-MGMT | 3 (1249, 1024, 1017) | 3 (787, 179, 1325) | 1 (PSA-DELIVERY consumer on `work_projects`) | 2 (work_projects closes_into service_projects 749; work_automations feeds project_tasks 750) | 9 | Pairwise (full) |
| ERP-FIN | 5 (131, 1127, 1128, 1025, 1019) | 0 | 0 | 0 | 5 | Pairwise (full) |
| SWP | 2 (1018, 1027) | 0 | 0 | 0 | 2 | Lightweight |
| CLM | 1 (1020) | 1 (138) | 1 (PSA-DELIVERY consumer + required on `legal_contracts`) | 1 (legal_contracts seeds service_projects 506) | 4 | Pairwise (full) |
| CRM | 1 (1129) | 1 (137) | 1 (PSA-DELIVERY consumer + required on `crm_opportunities`) | 0 | 3 | Pairwise (full) |
| AGENCY-MGMT | 0 | 2 (513, 515) | 1 (PSA-TIME-EXPENSE consumer + optional on `agency_time_entries`) | 0 | 3 | Pairwise (full) |
| WFM | 0 | 2 (104, 428) | 1 (PSA-RESOURCE consumer + optional on `work_schedules`) | 0 | 3 | Pairwise (full) |
| EXPENSE | 0 | 1 (139) | 1 (PSA-TIME-EXPENSE consumer + required on `expense_reports`) | 0 | 2 | Lightweight |
| VMS | 0 | 1 (587) | 1 (PSA-TIME-EXPENSE consumer + optional on `contingent_timesheets`) | 0 | 2 | Lightweight |
| SUB-MGMT | 0 | 0 | 1 (PSA-FINANCIALS contributor + required on `revenue_recognition_records`) | 1 (revenue_recognition_records is SUB-MGMT-mastered, PSA contributes) | 2 | Lightweight (boundary concern at B1-S1) |
| EPM | 1 (1021) | 0 | 0 | 0 | 1 | Lightweight |
| PA | 1 (1130) | 0 | 0 | 0 | 1 | Lightweight |
| S2P | 1 (132) | 0 | 0 | 0 | 1 | Lightweight |
| ATS | 1 (1023) | 0 | 0 | 0 | 1 | Lightweight |

**Structural pass bands:**

- **S1 / S2 / S3 coverage sweep:** PSA has FKs populated to `domains` on `capability_domains` (10), `solution_domains` (21), `domain_data_objects` (14 rollup), `domain_modules` (4), `domain_regulations` (1), `business_function_domains` (3). `handoffs` source side 19; target side 19. S2 per-module: all 4 modules have >=1 DMDO row and >=1 `domain_module_capabilities` row. S3 per-master: every `master + required` data_object has lifecycle states + trigger events; `resource_skill_inventories` is config-shape (no states, justified by current notes annotation; see B1-S6 for Rule #15 cleanup). 0 aliases across all PSA masters (B11 finding, see B1-S7).
- **A pass:** All 7 business-metadata fields populated on the `domains` row (`crud_percentage=78`, `min_org_size=20 s <500`, `cost_band=$$$`, `usa_market_size_usd_m=2500`, `market_size_source_year=2025`, `business_logic` populated, `certification_required=false`).
- **M pass:** M1 pass (4 modules), M2 pass (10 capabilities >= 3, 4 modules >= 2), M4 pass (every capability has a realizing `domain_module_capabilities` row), M6 pass (every module has >=1 capability). **M5 partial fail:** lifecycle states 402/403/404 on `revenue_recognition_records` (109) carry `domain_module_id=89` (PSA-PROJECT-FINANCIALS) but the data_object is mastered by SUB-MGMT-SUBSCRIPTIONS (167). PSA holds the data_object as `contributor + required`; lifecycle ownership belongs to the master per Rule #12. **M7 within-domain check pass** (no master coexists with consumer/contributor on the same data_object inside PSA), but **M7 boundary concern surfaces on `revenue_recognition_records`:** PSA realizes the state machine on a foreign master. See B1-S1.
- **B pass:** B1 pass (6 masters), B2 pass (all masters have `singular_label` / `plural_label`), B3 pass (no bare-word names; no `is_canonical_bare_word=true` needed), **B4 partial concern** (all flags `false`; pattern-flag re-evaluation needed per Rule #12, surfaced as B2-S2). **B5 pass** (no `embedded_master` rows on PSA modules). **B6 pass** (rich intra-domain master graph: rows 1066-1078 cover `service_projects` to `project_tasks`, `project_assignments`, `project_billing_milestones`, `project_resource_allocations`; plus `project_tasks performed_by project_assignments`, `project_assignments requires_skills_from resource_skill_inventories`, `project_resource_allocations confirms_into project_assignments`). **B7 pass** (rows 1073-1078: `users` to each PSA master). **B8 outbound:** mixed coverage (rows 749, 750 are inbound from WORK-MGMT side; row 540 contingent_timesheets posts_to project_billing_milestones; row 521 project_billing_milestones updates contract_obligations; row 506 legal_contracts seeds service_projects); no obvious PSA-outbound relationship rows for the ERP-FIN, EPM, HCM, ATS, CRM, WORK-MGMT, PA targets. **B9 pass** (every trigger event has at least one handoff). **B9b partial fail** (5 intra-domain handoffs on a 4-module domain, but 3+ candidate intra-domain pairs uncovered, see B1-S3). **B10b in-scope fail:** PSA owns the fix on 2 inbound handoffs with NULL `target_domain_module_id` whose payload is not declared in any PSA module (787 `work_automations` 246; 515 `creative_briefs` 483); the payload has no consumer DMDO row in PSA. See B1-S4. **B10b report-only:** 9 outbound handoffs with NULL `target_domain_module_id` are the receiving domains' B10b; 5 inbound with NULL `source_domain_module_id` are the source domains' B10b. **B11 fail** (zero `data_object_aliases` rows across all PSA masters; flagship PSA vendors use diverse naming: Kantata "Project", Certinia "PSA Project", Workday "Project Plan", Deltek "Engagement", ConnectWise "Service Ticket / Project", D365 PO "Project Quote / Project Contract"). See B1-S7. **B12 pass with note** (5 of 6 masters carry workflow lifecycle states; `resource_skill_inventories` is config-shape with notes annotation that needs Rule #15 review, see B2-S1).
- **C pass:** C1 pass (`Business Operations` owner, `Finance` and `Accounting` contributors). C2 vacuous (no capability override rows; `REVENUE-RECOG` overlaps Finance, `TIME-TRACKING` overlaps HR Workforce-Mgmt, neither has a `business_function_capabilities` row that diverges; this is acceptable since the spine RACI already covers them via consumer paths, see B2-S4).
- **E pass:** E1 pass (5 roles), E2 pass (every role on >=2 modules: 10072 on 86/89, 10073 on 86/87, 10074 on 86/88/89, 10075 on 86/88, 10076 on 86/89), E3 pass (every `role_modules` row has `interaction_level`), E4 pass (every role has >=1 `role_permissions` row, range 2-4 rows). **E5 advisory** (Path A: 10072 reaches modules 86+89, Path B: 10072 reaches 86+89, consistent; every role consistent). **E6 advisory** (drift candidate: BUSINESS-OPS-RESOURCE-MANAGER 10073 has `psa-resource-mgmt:admin` which should expand `confirm_project_assignment`, `release_project_assignment`, `commit_project_resource_allocation`, `cancel_project_resource_allocation` via permission_hierarchy; verify hierarchy exists. BUSINESS-OPS-PROJECT-FINANCE-CONTROLLER 10074 has `psa-project-financials:admin` should cover all 6 milestone workflow-gates).
- **F pass:** F1 pass (no legacy domain-level system skills with NULL `domain_module_id`). F2 pass (4 modules, 4 system skills, exactly one per module: 185-188). F3 pass (each skill carries 14-19 `skill_tools` rows). F4 pass (every `skill_tools` row obeys the `operation_kind` -> `data_object_id` invariant: queries/mutates carry data_object_id; compute/side_effect carry NULL). F5 computable: 62/63 = approximately 98% platform; 1 external row (`notify_team` on skill 185). F7 pass (no raw channel primitives linked; `notify_person` / `notify_team` abstraction used throughout).
- **H pass H1 hard fail:** 38 cross-domain handoffs; **7 carry `handoff_processes` rows (139, 1128, 132, 1129, 131 are `discovery_substring`; 1020, 138 are `agent_curated`); 31 untagged; 0 `record_status='approved'`.** Volume expectation 0.5N to 0.8N for N=38, expect 19-30 new `agent_curated` rows from this audit. See B1-H1.

PSA Semantius score (strict, PSA proper): approximately **98%** (62/63 `skill_tools` rows at `coverage_tier='platform'`). The 1 external row is `notify_team` (id 914) on `psa_project_delivery_agent`. Operational score adds the same external row at the `integration` tier if/when `notify_team` is promoted, otherwise unchanged.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M5 / M7 boundary, `revenue_recognition_records` lifecycle ownership** | Data_object 109 (`revenue_recognition_records`) is mastered by SUB-MGMT-SUBSCRIPTIONS (module 167, domain 97). PSA-PROJECT-FINANCIALS (module 89) holds `role=contributor + necessity=required`. However, the 3 lifecycle states on this data_object (402 `pending`, 403 `recognized`, 404 `reversed`) all carry `domain_module_id=89` (PSA-FINANCIALS). Per Rule #12 + Rule #14, lifecycle states are the canonical master's contract; permission materialization derives from `domain_module_code`. With states anchored to PSA, the workflow-gate permission `recognize_revenue_recognition_record` materializes under `psa-project-financials:recognize_revenue_recognition_record` (which IS what we see: nothing currently materialized, but the permission would prefix wrong; PSA has the `recognize_project_revenue` tool 1035 on skill 188 pointing at data_object 109). This is a B12 ownership inversion: PSA workflow-codes a state machine on a foreign master. Two valid fixes: **(a) PATCH** lifecycle states 402/403/404 `domain_module_id` to a SUB-MGMT module (167 or a SUB-MGMT-REVREC sibling if one exists), and PATCH PSA's `recognize_project_revenue` tool to a `compute` operation that proposes the rev-rec record for SUB-MGMT to record. **(b) PROMOTE** PSA to co-master (Rule allows multi-master with slice decomposition; PSA owns the project-revenue slice while SUB-MGMT owns the subscription-revenue slice). B1-S1 surfaces the gap; the choice is B2-S3. | After B2-S3 resolution: PATCH 3 `data_object_lifecycle_states` rows OR INSERT a second `domain_module_data_objects` row on a PSA module with `role=master` and slice ownership recorded in the audit. |
| B1-S2 | **B9b partial fail, missing intra-domain cross-module handoffs** | 4-module domain has only 5 intra-domain handoffs loaded (1131 RESOURCE -> DELIVERY on `project_assignment.confirmed`; 1132 TIME-EXPENSE -> FINANCIALS on `time_entry.approved`; 1133 TIME-EXPENSE -> FINANCIALS on `expense.approved`; 1134 DELIVERY -> FINANCIALS on `project_billing_milestone.reached`; 1135 DELIVERY -> RESOURCE on `service_project.staffing_required`). Candidate intra-domain pairs implied by master relationship graph + lifecycle states: (a) DELIVERY -> FINANCIALS on `project_task.completed` (1170) for percentage-of-completion rev-rec calculations (`project_tasks` 217 master in 86, but FINANCIALS' `compute_project_revenue_recognition` tool reads tasks for POC); (b) RESOURCE -> FINANCIALS on `project_resource_allocation.committed` (1167) for committed-cost ahead-of-actuals (`compute_project_revenue_recognition` references allocations); (c) FINANCIALS -> DELIVERY on `project_billing_milestone.slipped` (1166) so DELIVERY surfaces the slip on the project plan; (d) RESOURCE -> DELIVERY on `project_assignment.released` (1162) so DELIVERY can re-assign or close open tasks held by the released resource; (e) DELIVERY -> RESOURCE on `service_project.completed` (1229) so RESOURCE returns booked capacity to bench. 5 missing intra-domain handoffs identified. | Author 5 `handoffs` rows with `source_domain_id=target_domain_id=68`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`, and the source/target module FKs per the implied module pairs. All 5 reuse existing trigger_events (1170, 1167, 1166, 1162, 1229). |
| B1-S3 | **B10b in-scope, NULL `target_domain_module_id` on inbound handoffs whose payload PSA does not master** | 2 inbound handoffs land in PSA with NULL `target_domain_module_id` because PSA has no DMDO row for the payload: (a) handoff 787 (WORK-MGMT -> PSA on `work_automation.triggered`, payload data_object 246 `work_automations`); (b) handoff 515 (AGENCY-MGMT -> PSA on `creative_brief.approved`, payload data_object 483 `creative_briefs`). Each is one of the two sub-cases in B10b: handoff names a payload the target domain doesn't model. The pre-existing `notes` field on 787 reads `target NULL: no PSA module holds data_object 246`; on 515 reads `target NULL: no PSA module holds data_object 483`. Both notes are Rule #15 forbidden mechanical annotations, separately covered by B1-S6. Two fix paths per row: **(a)** load a `consumer + optional` DMDO row on PSA-PROJECT-DELIVERY (86) for each payload and PATCH `target_domain_module_id=86`; **(b)** decide the handoff itself is mis-modeled and DELETE it. Recommended (a) for both: a PSA delivery agent receiving an automation-driven status change from WORK-MGMT, or kicking off a creative-team engagement from an approved brief, is a legitimate consumer relationship in a holistic deployment. | PATCH 2 handoff rows after the user picks (a) or (b). If (a): INSERT 2 `domain_module_data_objects` rows + PATCH 2 `handoffs` rows. |
| B1-S4 | **B11 missing aliases on every PSA master** | Zero `data_object_aliases` rows across all 6 PSA masters. PSA flagship vendors use heterogeneous terminology: `service_projects` -> Kantata "Project" / Certinia "PSA Project" / Workday "Project Plan" / Deltek "Engagement" / D365 PO "Project Contract" / ConnectWise "Service Ticket+Project". `project_tasks` -> Microsoft Project / Workday Project Task / Mavenlink Task / "Activity" (industry-specific). `project_assignments` -> Kantata "Resource Assignment" / Certinia "Resource Request" / NetSuite OpenAir "Booking" / Workday "Resource Assignment". `project_billing_milestones` -> Kantata "Billing Schedule Line" / Certinia "Milestone" / D365 "Invoice Schedule" / "Deliverable Billing Event". `project_resource_allocations` -> Kantata "Soft Booking / Hard Booking" / Replicon "Allocation". `resource_skill_inventories` -> Kantata "Skills Catalog" / Workday "Talent Profile" / Certinia "Resource Skills Profile". | INSERT approximately 15-20 `data_object_aliases` rows (3-4 per master), `alias_type='vendor_specific'`. |
| B1-S5 | **B10b report-only (outbound NULLs owed by other domains)** | 9 outbound handoffs from PSA carry NULL `target_domain_module_id`, the receiving domain owes the fix: 131, 1127, 1128, 1025, 1019 (ERP-FIN); 1130 (PA); 1016, 1022, 1026 (HCM); 132 (S2P); 1021 (EPM). PSA's `source_domain_module_id` is populated on every outbound row. | Schedule b1 audits for ERP-FIN, PA, HCM, S2P, EPM to derive their `target_domain_module_id` per the standard B10b backfill procedure. |
| B1-S6 | **B10b report-only (inbound NULLs owed by source domains)** | 5 inbound handoffs to PSA carry NULL `source_domain_module_id`: 104, 428 (WFM); 139 (EXPENSE); 587 (VMS); 515 (AGENCY-MGMT). PSA's `target_domain_module_id` is populated on every one where the payload is modeled (i.e., not the 2 B1-S3 cases). | Schedule b1 audits for WFM, EXPENSE, VMS, AGENCY-MGMT to populate their `source_domain_module_id` on the relevant handoffs. |
| B1-S7 | **Rule #15 notes-pollution sweep, multi-table** | The following `notes` columns are populated with auto-generated prose that violates Rule #15 (RESCINDED license, mechanical annotations): (i) **handoffs.notes** on 12 rows: 132 (`target NULL until S2P declares consumer DMDO on purchase_requisitions`), 1127 / 1128 / 1019 (`target NULL until ERP-FIN declares consumer DMDO on X`), 1130 (`PA`), 1016 / 1022 / 1026 (`HCM`), 787 (`no PSA module holds data_object 246`), 515 (`no PSA module holds data_object 483`), 1024 (`WORK-MGMT`), 1021 (`EPM`), 131 (`ERP-FIN`), 1025 (`ERP-FIN`), 1020 (`CLM`). Also 179 (WORK-MGMT -> PSA) carries judgment prose `Medium friction. Stable integration...`. (ii) **data_objects.notes** on 5 of 6 PSA masters (216, 217, 218, 219, 726): pattern-flag rationale `Pattern flags considered (2026-05-26 audit)...`. Plus 725 carries pattern-flag prose AND a config-shape exemption paragraph. (iii) **domain_module_data_objects.notes** on 3 rows: 635 (PSA-RESOURCE on `work_schedules`), 633 (PSA-TIME-EXPENSE on `contingent_timesheets`), 634 (PSA-TIME-EXPENSE on `agency_time_entries`). Each carries optional-rationale prose. All of these are explicit Rule #15 forbidden patterns (`until X is modularized` / `until X declares consumer DMDO` / pattern-flag context / cardinality narration). Per Rule #15 audit obligation, agent default is **revert** (PATCH to empty string) unless the user confirms a row was approved at load time. | After B2-S1 confirmation: PATCH approximately 20 rows' `notes` columns to empty string. Track row count in fix log. |
| B1-S8 | **F4 advisory clean, recognize_project_revenue boundary** | Tool 1035 `recognize_project_revenue` (skill 188, PSA-FINANCIALS) is `operation_kind=mutate` with `data_object_id=109` (`revenue_recognition_records`). Per F4 the invariant is satisfied (mutate requires data_object_id). However, since SUB-MGMT canonically masters 109 (B1-S1), this means PSA's agent writes into a SUB-MGMT-owned table. Two reads: (a) PSA contributes specific fields on a multi-contributor record (consistent with `contributor + required` DMDO), tool is correct; (b) PSA should not directly mutate; the rev-rec record should be proposed via a `compute` operation and SUB-MGMT records it. Gated on B2-S3. | Per B2-S3 outcome: if (a) keep tool; if (b) PATCH tool 1035 to `operation_kind=compute`, `data_object_id=NULL`. |

#### APQC TAGGING

26 of 38 cross-domain handoffs currently untagged. Volume expectation per H1: 0.5N to 0.8N for N=38, i.e. 19-30 new `agent_curated` rows in this audit. The audit proposes the following from the analyst's structural-pass model. PCF id column requires `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` lookups at fix time.

**Existing tags (7 rows; quality side-bar):** 139 (EXPENSE -> PSA-TIME-EXPENSE) tagged process 59 L2 "Process accounts payable and expense reimbursements" `discovery_substring`; 1128 (PSA-TIME-EXPENSE -> ERP-FIN on `expense.approved`) same; 132 (PSA-PROJECT-DELIVERY -> S2P) tagged process 569 L4 "Assign resources to product/service project" `discovery_substring`, **weak match** (target is procurement of contingent staff, not internal resource assignment); 1129 (PSA-PROJECT-DELIVERY -> CRM on `service_project.completed`) same process 569 also **weak match** (CRM cares about renewal-trigger, not resource assignment); 131 (PSA-PROJECT-FINANCIALS -> ERP-FIN on `revenue.recognised`) process 55 L2 "Perform revenue accounting" `discovery_substring`, **reasonable**. Plus 2 prior `agent_curated`: 1020 (PSA-FINANCIALS -> CLM on milestone reached) process 1324 L4; 138 (CLM-REPOSITORY -> PSA on `legal_contract.signed`) process 1661 L4. Recommend REPLACE 132 + 1129 with better-matched `agent_curated` rows; keep 139 / 1128 / 131 / 1020 / 138 as-is.

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | Confidence |
|---|---|---|---|---|---|
| 1127 | PSA-TIME-EXPENSE -> ERP-FIN | `time_entry.approved` | `time_entries` | Process payroll OR Manage project finances (10773) | confident L3 |
| 1130 | PSA-RESOURCE-MGMT -> PA | `project_assignment.utilization_low` | `project_assignments` | Manage employee performance OR Develop workforce analytics | confident L3 |
| 1016 | PSA-RESOURCE-MGMT -> HCM | `project_assignment.confirmed` | `project_assignments` | Manage employee deployment OR Manage workforce | confident L3 |
| 1249 | PSA-RESOURCE-MGMT -> WORK-MGMT | `project_assignment.released` | `project_assignments` | Manage project work OR Plan and manage work | confident L3 |
| 1025 | PSA-PROJECT-DELIVERY -> ERP-FIN | `project_task.completed` | `project_tasks` | Manage project finances (10773) / Process invoices | confident L3 |
| 1023 | PSA-RESOURCE-MGMT -> ATS | `project_resource_allocation.demand_unmet` | `project_resource_allocations` | Recruit, source and select employees (10211) | confident L3 |
| 1024 | PSA-PROJECT-DELIVERY -> WORK-MGMT | `project_task.completed` | `project_tasks` | Manage project work OR Plan and manage work | confident L3 |
| 1021 | PSA-PROJECT-FINANCIALS -> EPM | `project_billing_milestone.slipped` | `project_billing_milestones` | Prepare periodic financial forecasts (10773) | confident L3 |
| 1022 | PSA-RESOURCE-MGMT -> HCM | `project_resource_allocation.committed` | `project_resource_allocations` | Manage employee deployment / Manage workforce | confident L3 |
| 1019 | PSA-PROJECT-FINANCIALS -> ERP-FIN | `project_billing_milestone.reached` | `project_billing_milestones` | Process customer invoicing (10778 or child) | confident L3 |
| 1026 | PSA-RESOURCE-MGMT -> HCM | `resource_skill_inventory.updated` | `resource_skill_inventories` | Manage talent profile / Develop workforce competencies | confident L3 |
| 1017 | PSA-RESOURCE-MGMT -> WORK-MGMT | `project_assignment.confirmed` | `project_assignments` | Manage project work / Set up project work plan | confident L3 |
| 1018 | PSA-RESOURCE-MGMT -> SWP | `project_assignment.released` | `project_assignments` | Plan and source talent supply | medium |
| 1027 | PSA-RESOURCE-MGMT -> SWP | `resource_skill_inventory.gap_identified` | `resource_skill_inventories` | Plan strategic workforce capability | confident L3 |
| 132 | PSA-PROJECT-DELIVERY -> S2P | `service_project.staffing_required` | `purchase_requisitions` | Order materials and services (10218 or child) | confident L3 (REPLACE existing weak 569 match) |
| 1129 | PSA-PROJECT-DELIVERY -> CRM | `service_project.completed` | `service_projects` | Manage customer accounts (10401 or child) | confident L3 (REPLACE existing weak 569 match) |
| 104 | WFM -> PSA-TIME-EXPENSE | `time_entry.approved` | `time_entries` | Time and attendance / Manage project finances | confident L3 |
| 137 | CRM -> PSA-PROJECT-DELIVERY | `crm_opportunity.closed_won` | `crm_opportunities` | Sell products and services (10004 child) / Develop and manage sales proposals | confident L3 |
| 587 | VMS -> PSA-TIME-EXPENSE | `contingent_timesheet.approved` | `contingent_timesheets` | Manage contingent workforce / Process time-and-labor | confident L3 |
| 787 | WORK-MGMT -> PSA | `work_automation.triggered` | `work_automations` | Plan and manage work (no clean PCF for automation events) | defer to Discover (no clean L3) |
| 428 | WFM -> PSA-RESOURCE-MGMT | `work_schedule.published` | `work_schedules` | Plan workforce schedules / Time and attendance | confident L3 |
| 515 | AGENCY-MGMT -> PSA | `creative_brief.approved` | `creative_briefs` | Develop creative concepts / Manage marketing program | medium (depends on AGENCY-MGMT PCF mapping) |
| 513 | AGENCY-MGMT -> PSA-TIME-EXPENSE | `agency_time_entry.submitted` | `agency_time_entries` | Time and attendance / Manage contingent workforce | medium |
| 179 | WORK-MGMT -> PSA-PROJECT-DELIVERY | `work_project.completed` | `work_projects` | Plan and manage work / Close project | confident L3 |
| 1218 | HCM -> PSA-RESOURCE-MGMT | `employee.created` | `employees` | Manage employee onboarding (10434) | confident L3 |
| 1219 | HCM -> PSA-RESOURCE-MGMT | `employee.promoted` | `employees` | Manage career development / Compensation | confident L3 |
| 1220 | HCM -> PSA-RESOURCE-MGMT | `employee.terminated` | `employees` | Manage employee offboarding (10436) | confident L3 |
| 1221 | HCM -> PSA-RESOURCE-MGMT | `attrition_risk.high` | `employees` | Develop workforce analytics / Retain talent | medium |
| 1222 | HCM -> PSA-PROJECT-DELIVERY | `employee.terminated` | `employees` | Manage employee offboarding | confident L3 |
| 1225 | HCM -> PSA-RESOURCE-MGMT | `job_profile.activated` | `job_profiles` | Define job roles / Manage workforce design | confident L3 |
| 1223 | HCM -> PSA-RESOURCE-MGMT | `job_profile.published` | `job_profiles` | Define job roles / Manage workforce design | confident L3 |
| 1224 | HCM -> PSA-RESOURCE-MGMT | `job_profile.updated` | `job_profiles` | Define job roles | confident L3 |
| 1226 | HCM -> PSA-RESOURCE-MGMT | `job_profile.retired` | `job_profiles` | Define job roles | confident L3 |
| 1325 | WORK-MGMT -> PSA-PROJECT-DELIVERY | `work_item.completed` | `work_items` | Plan and manage work / Close project | confident L3 |

31 candidate APQC tags total (28 INSERT new + 2 REPLACE existing weak matches + 1 defer to Discover). Plus 5 existing rows kept as-is (139, 1128, 131, 1020, 138).

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M5/M7 + B9b + B10b in-scope + B11 + Rule #15 + F4 advisory) | 8 |
| BOUNDARY (NULL FK or missing handoff per pairwise) | 1 |
| APQC TAGGING (high-confidence) | 1 sub-table (31 candidates) |
| MODULARIZATION ISSUES | 0 (route to Bucket 2 if needed) |
| **Bucket 1 total** | 9 items + 31 APQC tags (volume-heavy) |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

**HCM <-> PSA (weight 12).** Wired pairs: 8 inbound (1218-1226) covering employee + job_profile + attrition signals, 3 outbound (1016, 1022, 1026). Section 1: 11 handoffs. Section 2: 3 outbound to HCM have NULL `target_domain_module_id` (HCM's B10b). Section 3: candidate missing handoff PSA-PROJECT-DELIVERY -> HCM on `service_project.completed` for performance review / utilization rollup is a judgment call (HCM may already get this via the existing `project_assignment.released` event). Section 4: clean (PSA consumers `employees` and `job_profiles` properly declared). Section 5: cross-relationships, none load-bearing between PSA masters and HCM masters in `data_object_relationships` (PSA reads via tool layer; this is acceptable since `employees` and `job_profiles` are HCM masters and the edges via `data_object_id=748 users` substitute for direct master-master edges).

**WORK-MGMT <-> PSA (weight 9).** Wired pairs: 6. Section 1: 6 handoffs. Section 2: 1024 has NULL `target_domain_module_id` on WORK-MGMT side; 787 has NULL `target_domain_module_id` on PSA side (B1-S3 in-scope); 1325 fully wired. Section 3: candidate missing handoff PSA-PROJECT-DELIVERY -> WORK-MGMT on `service_project.completed` for board archival is implicit in the existing 1024 pair, judgment call. Section 4: PSA-PROJECT-DELIVERY declares `work_projects` consumer + optional (row 383); clean. Section 5: cross-relationships row 749 `work_projects closes_into service_projects` and row 750 `work_automations feeds project_tasks` exist; healthy.

**ERP-FIN <-> PSA (weight 5).** Wired pairs: 5 outbound, 0 inbound. Section 1: 5 handoffs (131, 1127, 1128, 1025, 1019). Section 2: every outbound has NULL `target_domain_module_id` (ERP-FIN's B10b). Section 3: candidate missing inbound ERP-FIN -> PSA on `customer_payment.received` to mark milestone paid; this is implied by tool 1032 `mark_project_billing_milestone_paid`. Section 4: clean. Section 5: no cross-relationship rows between PSA masters and ERP-FIN masters; the integration is event-stream, not data-object-mirror.

**CLM <-> PSA (weight 4).** Wired pairs: 2. Section 1: 138 (inbound, fully wired), 1020 (outbound, fully wired). Section 2: clean. Section 3: clean. Section 4: PSA-PROJECT-DELIVERY consumes `legal_contracts` (66) consumer + required; clean. Section 5: cross-relationship row 506 `legal_contracts seeds service_projects` exists; healthy.

**CRM <-> PSA (weight 3).** Wired pairs: 2. Section 1: 137 (CRM -> PSA-DELIVERY on `crm_opportunity.closed_won`, fully wired) and 1129 (PSA-DELIVERY -> CRM on `service_project.completed`, fully wired). Section 2: clean. Section 3: candidate missing inbound CRM -> PSA on `crm_renewal_opportunity.created` for repeat engagements is plausible; judgment call (B2-S5). Section 4: PSA-PROJECT-DELIVERY consumes `crm_opportunities` (100) consumer + required; clean. Section 5: no cross-relationship row between `crm_opportunities` and `service_projects` other than via the handoff; consider authoring `crm_opportunities seeds service_projects` as a structural mirror.

**AGENCY-MGMT <-> PSA (weight 3).** Wired pairs: 2 inbound. Section 1: 513 (`agency_time_entry.submitted` -> PSA-TIME-EXPENSE, fully wired). Section 2: 513 has NULL `source_domain_module_id` (AGENCY-MGMT's B10b); 515 has NULL on BOTH sides (PSA's B1-S3 in-scope + AGENCY-MGMT's B10b). Section 3: clean. Section 4: PSA-TIME-EXPENSE consumes `agency_time_entries` (479) consumer + optional; clean. Section 5: no cross-relationship rows; acceptable for an optional consumption.

**WFM <-> PSA (weight 3).** Wired pairs: 2 inbound (104 `time_entry.approved`, 428 `work_schedule.published`). Section 1: 2 handoffs. Section 2: both have NULL `source_domain_module_id` (WFM's B10b). Section 3: clean. Section 4: PSA-TIME-EXPENSE consumes `time_entries` (162) consumer + required; PSA-RESOURCE consumes `work_schedules` (160) consumer + optional; clean. Section 5: no cross-relationship rows; acceptable.

**Lighter neighbors (1-2 weight, one-line summaries):**

- **SUB-MGMT <-> PSA (weight 2, boundary concern).** No handoffs in either direction. PSA contributor + required on `revenue_recognition_records`; SUB-MGMT masters it. Lifecycle anchored to PSA module 89 is the B1-S1 hard finding. Section 5: no cross-relationship row between PSA masters and `revenue_recognition_records`; if PSA stays a contributor, this is acceptable, but a `service_projects feeds_revrec_in revenue_recognition_records` row would mirror the workflow.
- **SWP <-> PSA (weight 2).** Both outbound (1018, 1027) fully wired. No SWP -> PSA inbound, judgment whether SWP demand-plan should publish to PSA-RESOURCE.
- **EXPENSE <-> PSA (weight 2).** Inbound 139 has NULL source_module (EXPENSE's B10b). Cross-relationship row 730 `service_projects project T&E rollup from expense_reports` exists (verb name carries spaces and reads oddly, consider re-author to a clean snake-case verb at next refactor pass).
- **VMS <-> PSA (weight 2).** Inbound 587 fully wired (PSA target side); NULL source_module (VMS's B10b). Cross-relationship row 540 `contingent_timesheets posts_to project_billing_milestones` exists.
- **EPM <-> PSA (weight 1).** Outbound 1021 has NULL target (EPM's B10b). No cross-relationship row.
- **PA <-> PSA (weight 1).** Outbound 1130 has NULL target (PA's B10b). No cross-relationship row.
- **S2P <-> PSA (weight 1).** Outbound 132 has NULL target (S2P's B10b). No cross-relationship row.
- **ATS <-> PSA (weight 1).** Outbound 1023 fully wired (manual handoff, high friction). Resource demand -> requisition draft. Healthy boundary.

**No in-scope mechanical PATCH from pairwise (Bucket 1)** beyond those already captured in B1-S1 to B1-S8.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | M5/M7 boundary: `revenue_recognition_records` lifecycle states anchored to PSA module 89 vs SUB-MGMT master. Gated on B2-S3. |
| B1-S2 | B9b: Author 5 new intra-domain cross-module handoffs (DELIVERY <-> FINANCIALS, RESOURCE <-> DELIVERY, RESOURCE <-> FINANCIALS). |
| B1-S3 | B10b in-scope: 2 inbound handoffs (787, 515) with NULL target_module_id; PSA needs to either declare consumer DMDOs on `work_automations` / `creative_briefs` and PATCH, or DELETE. Gated on B2-S4. |
| B1-S4 | B11: INSERT approximately 15-20 `data_object_aliases` rows across 6 PSA masters. |
| B1-S5 | Report-only: 9 outbound NULL target_module_id; schedule ERP-FIN, PA, HCM, S2P, EPM audits. |
| B1-S6 | Report-only: 5 inbound NULL source_module_id; schedule WFM, EXPENSE, VMS, AGENCY-MGMT audits. |
| B1-S7 | Rule #15 sweep: revert approximately 20 notes-pollution rows across `handoffs`, `data_objects`, `domain_module_data_objects`. Gated on B2-S1. |
| B1-S8 | F4 advisory: `recognize_project_revenue` tool 1035 (mutate on SUB-MGMT-mastered table). Gated on B2-S3. |
| B1-H1 | APQC TAGGING: propose 28 INSERT + 2 REPLACE + 1 defer = 31 candidates. |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #15 notes-pollution sweep** (B1-S7). The audit identified approximately 20 rows with auto-populated `notes` text matching forbidden patterns (`target NULL until X`, pattern-flag context, config-shape exemption prose, cardinality narration). Were these notes user-approved at load time, or were they auto-populated by the loader? | Cannot tell from audit alone; load-time approval status unknown. The notes contain dated tags like `Pattern flags considered (2026-05-26 audit)` suggesting auto-population. | (a) Confirm user-approved at load time; leave in place. (b) Confirm auto-populated; PATCH all approximately 20 rows' `notes` to empty string and log the Rule #15 incident per the audit obligation in references/skill-changelog.md. (c) Per-row review (specify which to keep, which to revert). |
| B2-S2 | **B4 pattern-flag positive re-evaluation per Rule #12.** Current flags read all `false` on all 6 PSA masters. Questions: (a) `project_assignments.has_personal_content` could be `true` since assignments reference consultant identity, billable rates (sometimes PII-adjacent), client name. (b) `resource_skill_inventories.has_personal_content` could be `true` since the inventory carries individual-named competencies, certifications, possibly performance ratings. (c) `project_billing_milestones.has_submit_lock` could be `true` once milestone is marked `reached` (state 780) since rev-rec depends on it. (d) `service_projects.has_single_approver` could be `true` for the customer sponsor closing the engagement. None has `has_personal_content=true` or `has_single_approver=true` currently. | Pattern flags are workflow-shape judgments the user owns; the audit re-evaluates and proposes, the user decides. | Per-flag yes/no from user; capture in Decisions. |
| B2-S3 | **M5/M7 boundary: `revenue_recognition_records` lifecycle ownership.** Lifecycle states 402-404 on data_object 109 carry `domain_module_id=89` (PSA-FINANCIALS), but SUB-MGMT-SUBSCRIPTIONS (module 167) masters the data_object. Two architectural readings: **(a)** PSA is a contributor that proposes rev-rec records; SUB-MGMT records them. Fix: PATCH lifecycle states 402-404 `domain_module_id` to a SUB-MGMT module (or NULL if always-reachable from the master). PATCH tool 1035 `recognize_project_revenue` to `operation_kind=compute` with `data_object_id=NULL`. **(b)** PSA co-masters the project-revenue slice; SUB-MGMT masters subscription-revenue slice. Multi-master pattern (Rule #18 allows; Phase 2 multi-master). Fix: INSERT second `domain_module_data_objects` row on module 89 with `role=master + slice=project-revenue`; record slice decomposition in audit chat (not in notes per Rule #15). | Architectural intent question, the audit can't decide whether the original load intended PSA to materialize the workflow on a foreign master or whether the lifecycle states were anchored to PSA by mistake. | (a), (b), or (c) leave as-is and accept that workflow-gate permissions on `revenue_recognition_records` will materialize under the PSA module-prefix. |
| B2-S4 | **B1-S3 handling for 2 mis-modeled inbound handoffs.** Handoff 787 (WORK-MGMT -> PSA on `work_automations`) and 515 (AGENCY-MGMT -> PSA on `creative_briefs`) land in PSA with payloads PSA does not model. Three reads: (a) PSA legitimately receives both and should add `consumer + optional` DMDO rows on PSA-PROJECT-DELIVERY; the handoffs become first-class with `target_domain_module_id=86`. (b) The handoff is mis-modeled and should be DELETEd (in which case the source domain published a signal PSA never actually consumes). (c) The payload belongs in a different PSA module (e.g. `creative_briefs` -> PSA-PROJECT-DELIVERY since creative agencies use PSA for engagement delivery). | Editorial / product intent question, the audit can't decide whether PSA receives these signals in real PSA deployments. | (a), (b), or (c) per row. |
| B2-S5 | **CRM -> PSA renewal inbound (Pairwise CRM Section 3 candidate).** Pairwise reconciliation surfaced a candidate inbound handoff CRM -> PSA on `crm_renewal_opportunity.created` (or similar) for repeat engagements (existing customer comes back with a new SOW). Does the catalog need this handoff? It overlaps with the existing 137 (`crm_opportunity.closed_won`) since renewals close-won like any other opportunity, so this may be redundant. | Modeling judgment: are renewal-opportunities a distinct event in CRM or just `closed_won` on a renewal-flagged opportunity? | (a) Treat as same shape as 137; no new handoff. (b) Author a separate `crm_renewal_opportunity.created` handoff with PSA-PROJECT-DELIVERY as target. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran semantic enumeration against Kantata (Mavenlink), Certinia PS Cloud (FinancialForce PSA), Oracle NetSuite OpenAir, Microsoft Dynamics 365 Project Operations, Deltek Vantagepoint, BigTime, Replicon Polaris PSA, Rocketlane, Projector PSA, Ruddr, Scoro, Productive, Accelo, plus the integrated PSA modules in Workday Projects, Oracle Fusion Project Management, SAP S/4HANA Professional Services, Unit4 ERP Services, ConnectWise PSA, Autotask PSA. The compliance anchor is ASC 606; broader anchors that PSA touches include DCAA (US gov contractor T&M billing rules), SOX (significant-engagement attestation for public companies), GDPR (consultant PII in skill profiles + project-level personal data), eIDAS (engagement signature workflows pre-handoff to CLM), and industry-specific certifications (architecture/engineering PSAs follow AIA / ACEC billing standards). The loaded `domain_regulations` rows cover only ASC 606, narrower than the flagship vendor surface suggests.

The subagent semantic-enumeration JSON pass was not spawned (this is a single-pass agent audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `engagement_quotes` (or `services_estimates`) | Certinia ASP "Project Estimator", Kantata "Project Pricing", Deltek "Pursuit / Estimate", D365 PO "Project Quote". The ENGAGE-CPQ capability (245) is realized on PSA-PROJECT-DELIVERY but no master entity exists. Most PSA flagships model the estimate as a distinct record from the project (different lifecycle: drafted, sent, approved, won, lost). | PSA-PROJECT-DELIVERY (new master) or new PSA-ENGAGEMENT-QUOTING module |
| `project_change_requests` | All flagship PSAs (Kantata, Certinia, Deltek, OpenAir, NetSuite, D365 PO) model change orders / change requests as first-class records modifying scope, schedule, budget. Distinct from `project_tasks` and from contract amendments. | PSA-PROJECT-DELIVERY (new master) |
| `project_risks` (or `risk_register_items`) | Kantata Risk Register, Certinia Risk Management, Deltek (architecture/engineering vertical), D365 PO Risk. First-class risk records with mitigation plans. | PSA-PROJECT-DELIVERY (new master) |
| `project_status_reports` | Kantata Status Reports, Certinia Project Status, Rocketlane Customer-Facing Status Updates. Distinct from ad-hoc notifications; recurring report records. | PSA-PROJECT-DELIVERY (new master) |
| `project_deliverables` | D365 PO Project Deliverables, Workday Projects Deliverables, Deltek. Distinct from `project_tasks` and from `project_billing_milestones` (deliverables are the artifact; milestones are the billing trigger; a deliverable may or may not be tied to a milestone). | PSA-PROJECT-DELIVERY (new master) |
| `billing_rate_cards` (or `rate_cards`) | Every PSA flagship has rate-card management as a first-class entity (effective dates, currency, role-level, customer-level overrides). The existing tool layer `compute_project_revenue_recognition` and the financials skill imply rate-card consumption but no master entity exists. | PSA-PROJECT-FINANCIALS (new master) |
| `project_budgets` | Kantata Project Budget, Certinia Project Plan, Workday Projects Budget Plan, NetSuite Project Budgets. Distinct from `project_billing_milestones` (budget is plan; milestones are billing schedule). Often versioned. | PSA-PROJECT-FINANCIALS (new master) |
| `project_invoices` (staged) | Kantata Invoice Workbench, Certinia Bill Run, NetSuite Project Invoice, BigTime Invoice. Staged PSA-side invoice record before push to ERP-FIN's AR module. ERP-FIN masters `invoices` canonically; PSA may need an `embedded_master` or boundary `project_invoices` (boundary-object pattern, see SKILL.md). | PSA-PROJECT-FINANCIALS (new entity, possibly `embedded_master` on `invoices` or `master` on `project_invoices`) |
| `staffing_requests` | Kantata Resource Request, Certinia Resource Request, Deltek Resource Request, D365 PO Resource Request. Distinct from `project_assignments` (request is a demand record; assignment is fulfillment). Currently the request -> assignment flow is implicit via `service_project.staffing_required` event with no request entity. | PSA-RESOURCE-MGMT (new master) |
| `capacity_plans` | Kantata Capacity Planning, Certinia Resource Forecast, BigTime Resource Forecast, Replicon Polaris Capacity. Aggregated forward-looking capacity by skill / role / region. Distinct from `project_resource_allocations` (allocations are per-project; capacity is aggregate). | PSA-RESOURCE-MGMT (new master, or boundary with SWP) |
| `utilization_reports` (or `utilization_records`) | UTILIZATION capability is loaded (81 on PSA-RESOURCE-MGMT) but no master entity captures the utilization record itself. Every PSA flagship has utilization tracking as a first-class record (period, resource, billable hours, target, actual, variance). | PSA-RESOURCE-MGMT (new master) |
| `project_profitability_records` | Certinia Project Profitability, Kantata Margin Tracker, Deltek Project Profitability, D365 PO Project Profitability. Distinct from rev-rec; the running-profit calculation per project (revenue minus cost minus admin). | PSA-PROJECT-FINANCIALS (new master) |

12 entity candidates total.

#### MODULARIZATION candidates

- **PSA-ENGAGEMENT-QUOTING module candidate.** If `engagement_quotes`, `services_estimates`, rate-card management, and pursuit-tracking are loaded, a 5th module (`PSA-ENGAGEMENT-QUOTING`) makes more sense than overloading PSA-PROJECT-DELIVERY. Capability count would grow from 10 to 12+, comfortably above the 3-capability floor for the 5-module shape. ENGAGE-CPQ (capability 245) would move to this new module.
- **PSA-PROFITABILITY-ANALYTICS module candidate.** Project profitability + utilization analytics could split from PSA-PROJECT-FINANCIALS (which keeps the billing + rev-rec workflow). Mirrors the Kantata / Certinia split between "Billing" and "Analytics".

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **DCAA** applicability (mandatory for US government contractor T&M billing).
- **SOX** significant-engagement attestation (mandatory for US publicly-listed companies with material services contracts).
- **GDPR** (mandatory for EU consultant PII in skill profiles).

#### Candidate-domain queue

This audit surfaced 0 domain-tier candidates for `audits/_missing-domains.md`; every MISSING candidate above is an entity / capability extension of PSA rather than a new domain.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/PSA-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 12 entity candidates + 3 regulation candidates + 2 modularization candidates to treat as confirmed and we proceed via Phase B inserts).

### Cross-bucket dependencies

- **B1-S1 (M5/M7) is gated on B2-S3** (architectural choice between contributor + PATCH-lifecycle and co-master + slice decomposition).
- **B1-S3 (2 inbound NULL target_module_id) is gated on B2-S4** (per-row read of whether 787 / 515 are legitimate PSA consumption or mis-modeled).
- **B1-S7 (Rule #15 notes sweep) is gated on B2-S1** (whether the existing notes were user-approved at load time).
- **B1-S8 (tool 1035 boundary) is gated on B2-S3** (same architectural choice as B1-S1).
- **B1-S5 / B1-S6 (B10b report-only)** schedules audits on 9 other domains (ERP-FIN, PA, HCM, S2P, EPM, WFM, EXPENSE, VMS, AGENCY-MGMT); not PSA's load.
- **B1-S2 (intra-domain handoffs) is independent** of all other items.
- **B1-S4 (aliases) is independent** of all other items.
- **B1-H1 (APQC tagging)** depends on Bucket 1 ordering only insofar as 132 / 1129 REPLACE may differ if S2P / CRM are re-routed elsewhere; otherwise independent.
- **B3 candidates `engagement_quotes`, `rate_cards`, `project_budgets`** might inform B2-S5 (CRM renewal handoff question) and B2-S3 (rev-rec slice decomposition). Calling this out per the surface-time discipline.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S4, S5-S6 (route-only), S7-after-B2-S1, H1-top20`), or `skip`.

- **S1 (M5/M7 boundary)** is gated on B2-S3; resolve that first.
- **S2 (5 new intra-domain handoffs)** is mechanical; reuses existing trigger_events.
- **S3 (2 inbound NULL target_module_id)** is gated on B2-S4.
- **S4 (approximately 15-20 alias rows)** can land any time.
- **S5 / S6 (B10b report-only)** schedules 9 distinct other-domain audits; not PSA's fix.
- **S7 (Rule #15 sweep, approximately 20 rows)** is gated on B2-S1.
- **S8 (tool 1035 boundary)** is gated on B2-S3.
- **H1 (31 APQC candidates including 2 REPLACE)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** Per-item decisions before any acting.

- **B2-S1 (Rule #15 notes sweep):** confirm auto-populated -> revert, or confirm approved at load -> leave, or specify per-row.
- **B2-S2 (pattern flag re-evaluation):** per-flag yes/no on `has_personal_content` for `project_assignments` / `resource_skill_inventories`, `has_submit_lock` for `project_billing_milestones`, `has_single_approver` for `service_projects`.
- **B2-S3 (M5/M7 rev-rec architecture):** (a) contributor + PATCH lifecycle to SUB-MGMT side, (b) PSA co-masters with slice decomposition, (c) leave as-is with wrong-prefix permissions.
- **B2-S4 (B1-S3 handling):** (a) consumer DMDOs + PATCH, (b) DELETE handoffs, (c) per-row.
- **B2-S5 (CRM renewal inbound):** (a) covered by existing 137, no new handoff. (b) author distinct renewal handoff.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 12 entity candidates + 3 regulation candidates + 2 modularization candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| ERP-FIN | B10b: populate `target_domain_module_id` on outbound handoffs 131, 1127, 1128, 1025, 1019. Add `consumer + required` DMDO on each relevant payload (`revenue_recognition_records` 109, `time_entries` 162, `expense_reports` 210, `project_tasks` 217, `project_billing_milestones` 219) in whichever ERP-FIN module receives. Note: 109 is SUB-MGMT-mastered, so ERP-FIN consumption joins the PSA contributor side as a secondary consumer. |
| HCM | B10b: populate `target_domain_module_id` on outbound handoffs 1016, 1022, 1026. Add `consumer + optional` DMDO on `project_assignments` (218) and `project_resource_allocations` (726) and `resource_skill_inventories` (725) on whichever HCM module subscribes (likely HCM Talent Profile / HCM Workforce). |
| PA | B10b: populate `target_domain_module_id` on outbound 1130 (`project_assignment.utilization_low`). Add `consumer + optional` DMDO on `project_assignments` (218) in whichever PA module subscribes. |
| EPM | B10b: populate `target_domain_module_id` on outbound 1021 (`project_billing_milestone.slipped`). Add `consumer + optional` DMDO on `project_billing_milestones` (219). |
| S2P | B10b: populate `target_domain_module_id` on outbound 132 (`service_project.staffing_required`). Add `consumer + optional` DMDO on `purchase_requisitions` (72) in whichever S2P module subscribes. |
| WFM | B10b: populate `source_domain_module_id` on inbound 104 (`time_entry.approved`) and 428 (`work_schedule.published`). |
| EXPENSE | B10b: populate `source_domain_module_id` on inbound 139 (`expense.approved`). |
| VMS | B10b: populate `source_domain_module_id` on inbound 587 (`contingent_timesheet.approved`). |
| AGENCY-MGMT | B10b: populate `source_domain_module_id` on inbound 513 (`agency_time_entry.submitted`) and 515 (`creative_brief.approved`). |
| WORK-MGMT | B10b: populate `target_domain_module_id` on outbound 1024 (`project_task.completed` -> WORK-MGMT side). |
| SUB-MGMT | If B2-S3 lands as option (a) PATCH PSA lifecycle states to a SUB-MGMT module, confirm whether SUB-MGMT-SUBSCRIPTIONS (167) or a new SUB-MGMT-REVREC sibling module owns the `revenue_recognition_records` workflow. |
| CLM | If B2-S5 lands as option (b), confirm whether `legal_contract.amended` event should publish to PSA-PROJECT-DELIVERY for SOW changes. |

## 2026-05-31, Continuation: B1 technical fixes

Subagent application of Bucket 1 items that are truly technical (no judgment, no Bucket 2 gates, no Rule #15 / Rule #18 ambiguity). Loader: [`.tmp_deploy/fix_psa_b1_technical_2026_05_31.ts`](../.tmp_deploy/fix_psa_b1_technical_2026_05_31.ts).

### Applied

- **B1-S2 (5 intra-PSA cross-module handoffs):** Inserted handoff rows 1336-1340, all `lifecycle_progression` / `friction_level=low` / `record_status=new`. Reuses existing trigger_events 1170, 1167, 1166, 1162, 1229 (verified live before insert). Tuples (source_module -> target_module / trigger_event):
  - 1336: DELIVERY (86) -> FINANCIALS (89) / `project_task.completed` (1170)
  - 1337: RESOURCE (87) -> FINANCIALS (89) / `project_resource_allocation.committed` (1167)
  - 1338: FINANCIALS (89) -> DELIVERY (86) / `project_billing_milestone.slipped` (1166)
  - 1339: RESOURCE (87) -> DELIVERY (86) / `project_assignment.released` (1162)
  - 1340: DELIVERY (86) -> RESOURCE (87) / `service_project.completed` (1229)
- **B1-S4 (data_object_aliases on PSA masters):** Inserted 21 alias rows 944-964 across all 6 PSA masters. `alias_type='solution_term'` with `solution_id` resolved per vendor (the `data_object_aliases.alias_type` enum has no `vendor_specific` value; flagship-vendor terminology is solution-specific by construction and Rule #18 explicitly licenses vendor names on `data_object_aliases`). Coverage: `service_projects` 5, `project_tasks` 3, `project_assignments` 4, `project_billing_milestones` 3, `resource_skill_inventories` 3, `project_resource_allocations` 3. All `record_status=new`. The audit's `Replicon Polaris PSA` candidate resolved to `Replicon` (id 254) which is the only matching catalog row.

### Deferred (with reasons)

- **B1-S1 / B1-S8** (`revenue_recognition_records` lifecycle ownership + tool 1035 boundary): gated on B2-S3 architectural choice (PSA contributor + PATCH lifecycle vs. PSA co-master with slice decomposition vs. leave-as-is). User decision required.
- **B1-S3** (2 inbound NULL `target_domain_module_id`, handoffs 787 / 515): gated on B2-S4 (per-row read of legitimate consumption vs. mis-modeled handoff). User decision required.
- **B1-S7** (Rule #15 notes-pollution sweep, approximately 20 rows): gated on B2-S1 (whether existing notes were user-approved at load time or auto-populated). User decision required before any PATCH-to-empty.
- **B1-H1** (31 APQC tagging candidates): the audit pre-specifies PCF rows by description only ("Process payroll OR Manage project finances", "Manage employee deployment OR Manage workforce", etc.), not by resolvable `process_id`. Per task constraint, `handoff_processes` rows insert only when audit pre-specifies `handoff_id` + resolvable PCF. Per-handoff PCF lookup + best-match selection is judgment work, deferred.
- **B1-S5 / B1-S6** (report-only): owed by ERP-FIN, PA, HCM, S2P, EPM, WFM, EXPENSE, VMS, AGENCY-MGMT, WORK-MGMT. Not PSA's load.

### JWT errors

None encountered.

### Frontmatter

Status remains `feedback_needed`. Bucket 2 (5 items: S1-S5) and Bucket 3 (12 entity + 3 regulation + 2 modularization candidates) still owe the user. Bucket 1 outstanding: S1, S3, S5, S6, S7, S8, H1.

## 2026-05-31, Audit

Fresh Validate b1 structural pass against live catalog. Re-verifies every band post the 2026-05-31 Continuation (intra-domain handoffs 1336-1340 + 21 alias rows 944-964). Two new findings (A4 + M8 catalog UX fields, Rule #20) plus continuations from the 2026-05-30 audit that remain user-gated.

### Summary

- Current footprint: 4 modules (`PSA-PROJECT-DELIVERY` 86, `PSA-RESOURCE-MGMT` 87, `PSA-TIME-EXPENSE` 88, `PSA-PROJECT-FINANCIALS` 89), 0 starters. 6 domain-owned masters: `service_projects` 216, `project_tasks` 217, `project_assignments` 218, `project_billing_milestones` 219, `resource_skill_inventories` 725, `project_resource_allocations` 726. 1 contributor (`revenue_recognition_records` 109 mastered by SUB-MGMT module 167). 10 capabilities. 21 solutions (14 primary, 7 secondary). 17 trigger_events across PSA masters plus 1 cross-cutting (`revenue.recognised` 107 on 109). 19 outbound + 19 inbound cross-domain handoffs (38 cross-domain total); 10 intra-domain cross-module handoffs (1131-1135, 1336-1340). 21 `data_object_aliases` rows on PSA masters. 28 lifecycle states across PSA masters plus 3 on 109 (states 402-404, of which 403 carries `domain_module_id=89` and `requires_permission=true`). 5 PSA roles. 4 system skills + 63 `skill_tools` rows.
- Bucket 1 (in-scope, agent fixable): 4 items.
- Bucket 2 (surface-for-user, judgment): 7 items.
- Bucket 3 (Phase 0 pending, speculative): carries forward 17 items from 2026-05-30 (12 entities + 2 modularization + 3 regulations); 0 new this audit.

### Structural pass bands

- **S1 / S2 / S3 sweep:** FKs to `domains` populated on `capability_domains` (10), `solution_domains` (21), `domain_modules` (4), `domain_data_objects` (14 rollup), `domain_regulations` (1), `business_function_domains` (3). `handoffs.source_domain_id` 19; `handoffs.target_domain_id` 19. `domain_module_host_domains` 0 (no cross-cutting modules host on PSA, acceptable). S2 per-module: every module has >=1 `domain_module_data_objects` AND >=1 `domain_module_capabilities` row (DMC counts: 86=3, 87=2, 88=2, 89=3). S3 per-master: states + events + aliases populated on 5 of 6 masters; `resource_skill_inventories` 725 has 0 states (config-shape exemption, see B12 + B2-NEW1).
- **A pass:** A1 pass (all 7 business-metadata fields populated). A2 pass (10 capabilities). A3 pass (21 solutions, multiple primary). **A4 hard fail (Rule #20):** `domains.catalog_tagline` and `domains.catalog_description` both empty on the PSA domain row.
- **M pass:** M1 pass (4 modules). M2 pass (10 capabilities, 4 modules). M4 pass (every capability has a realizing `domain_module_capabilities` row). M6 pass (every module realizes >=1 capability). **M5 partial fail (continuation):** lifecycle state 403 (`recognized`) on `revenue_recognition_records` (109) carries `requires_permission=true` AND `domain_module_id=89` (PSA-PROJECT-FINANCIALS), but 109 is mastered by SUB-MGMT-SUBSCRIPTIONS (167). Workflow-gate permission would prefix `psa-project-financials:recognize_revenue_recognition_record` on a foreign master. Continuation of B1-S1 / B2-S3 from 2026-05-30. **M7 catalog-wide single-master pass** (109 has exactly one `role=master` row, in module 167); **M7 within-domain pass** (no master coexists with consumer/contributor on the same data_object inside PSA); M7 boundary concern surfaces as the M5 finding. **M8 hard fail (Rule #20):** all 4 PSA modules have empty `catalog_tagline` AND empty `catalog_description`.
- **B pass:** B1 pass (6 masters). B2 pass (every master has `singular_label` + `plural_label`). B3 pass (no bare-word names among PSA masters). **B4 pass with continuation:** all flags `false` on all 6 masters; positive re-evaluation per Rule #12 still owed (continuation of B2-S2 from 2026-05-30). B5 pass (zero `embedded_master` rows on PSA modules). B6 pass (intra-domain master graph rows 1066-1072 cover `service_projects -> project_tasks`, `service_projects -> project_assignments`, `service_projects -> project_billing_milestones`, `service_projects -> project_resource_allocations`, `project_tasks performed_by project_assignments`, `project_assignments requires_skills_from resource_skill_inventories`, `project_resource_allocations confirms_into project_assignments`). B7 pass (rows 1073-1078: `users` edges to each PSA master). B8 outbound: mixed coverage retained from prior; outbound cross-domain relationship rows exist for `project_billing_milestones updates invoices` (521); inbound mirrors via 749 (`work_projects closes_into service_projects`) and 750 (`work_automations feeds project_tasks`); legacy 730 (`service_projects project T&E rollup from expense_reports` with verb-space-noise) acceptable as-is per Rule #15 (no auto-rewrite). B9 pass (every trigger_event has >=1 handoff). **B9b pass (CLOSED from 2026-05-30 B1-S2):** 4-module domain now has 10 intra-domain handoffs across all candidate pairs (1131-1135 original + 1336-1340 from the 2026-05-31 continuation). **B10b in-scope partial fail (continuation):** 2 inbound handoffs retain NULL `target_domain_module_id` (787 `work_automations` from WORK-MGMT; 515 `creative_briefs` from AGENCY-MGMT); payload not declared in any PSA module; resolution still gated on B2-S4. **B10b report-only:** 9 outbound NULLs on `target_domain_module_id` and 5 inbound NULLs on `source_domain_module_id` owed by ERP-FIN (131, 1127, 1128, 1025, 1019), PA (1130), HCM (1016, 1022, 1026), S2P (132), EPM (1021), WFM (104, 428), EXPENSE (139), VMS (587), AGENCY-MGMT (513), WORK-MGMT (1024). **B11 pass (CLOSED from 2026-05-30 B1-S4):** 21 `data_object_aliases` rows present (944-964), covering all 6 PSA masters with flagship-vendor terminology. **B12 pass with exemption:** 5 of 6 masters carry workflow lifecycle states; `resource_skill_inventories` is config-shape. The `data_objects.notes` row for 725 carries config-shape exemption prose; per Rule #15 this is RESCINDED license and is part of the continuation B1-S7 / B2-S1 notes-pollution sweep.
- **C pass:** C1 pass (`Business Operations` owner, `Finance` + `Accounting` contributors, 3 rows). C2 vacuous (no `business_function_capabilities` rows; capability overlaps with Finance + HR-Workforce covered implicitly by spine RACI; acceptable per prior audit).
- **E pass:** E1 pass (5 roles: 10072-10076). E2 pass (every role has >=2 `role_modules` entries: 10072 on 86+89, 10073 on 86+87, 10074 on 86+88+89, 10075 on 86+88, 10076 on 86+89). E3 pass (every `role_modules` row has `interaction_level` set). E4 pass (every role has >=1 `role_permissions` row, range 2-7). E5 pass (Path A and Path B agree per role on the domain footprint).
- **F pass:** F1 pass (zero legacy domain-level system skills). F2 pass (4 modules, 4 system skills, exactly one per module: 185-188). F3 pass (skill_tools counts 185=20, 186=17, 187=10, 188=16). F4 pass (every `skill_tools` row obeys `operation_kind ↔ data_object_id` invariant). F5 computable: 62/63 platform = approximately 98% strict; 1 external row `notify_team` 914 on skill 185. F7 pass (only `notify_person` 913 + `notify_team` 914 used).
- **H pass H1 hard fail (continuation):** 38 cross-domain handoffs; 12 carry `handoff_processes` rows (5 `discovery_substring`: 139, 1128, 132, 1129, 131; 7 `agent_curated`: 1020, 138, 515, 104, 428, 587, 132). 0 `record_status=approved`. 26 cross-domain handoffs still untagged. Continuation of 2026-05-30 B1-H1.

PSA Semantius score (strict, PSA proper): approximately 98% (62/63 platform). Operational tier unchanged absent the external `notify_team` promotion.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-A4 | **A4 catalog UX fields on `domains` (Rule #20)** | `domains.catalog_tagline` and `domains.catalog_description` both empty on the PSA row (id 68). Buyer-voice copy required (workflow + value, NOT analyst-voice market positioning, no vendor names per Rule #18). | Draft both fields per Rule #20, surface to user for review BEFORE writing. Route through Bucket 2 (B2-NEW2) since the drafted text needs explicit per-row approval before any PATCH. |
| B1-M8 | **M8 catalog UX fields on each `domain_modules` row (Rule #20)** | All 4 PSA modules (86 PSA-PROJECT-DELIVERY, 87 PSA-RESOURCE-MGMT, 88 PSA-TIME-EXPENSE, 89 PSA-PROJECT-FINANCIALS) have empty `catalog_tagline` AND empty `catalog_description`. | Draft both fields per Rule #20, surface to user for review BEFORE writing. Route through Bucket 2 (B2-NEW2) since the drafted text needs explicit per-row approval before any PATCH. |
| B1-B10b-IN | **B10b in-scope (continuation)** | 2 inbound handoffs (787 WORK-MGMT->PSA on `work_automations`; 515 AGENCY-MGMT->PSA on `creative_briefs`) retain NULL `target_domain_module_id`. PSA holds no DMDO row for either payload. Continuation of 2026-05-30 B1-S3. Gated on B2-S4 (legitimate consumer vs mis-modeled handoff). | Per B2-S4 outcome: (a) INSERT 2 `consumer + optional` DMDO rows on PSA-PROJECT-DELIVERY (86) + PATCH 2 handoff rows; OR (b) DELETE handoffs 787 + 515. |
| B1-H1 | **H1 APQC tagging (continuation)** | 26 of 38 cross-domain handoffs untagged; 0 approved. 2026-05-30 audit identified 28 INSERT + 2 REPLACE + 1 defer candidates with PCF descriptions (not resolvable process_ids); the 2026-05-31 Continuation deferred this work as judgment-heavy per-handoff PCF lookup. Carries forward unresolved. | Per-handoff PCF lookup against `/processes?source_framework=eq.apqc_pcf_cross_industry&process_name=ilike.*<term>*` to resolve `process_id`, then INSERT `handoff_processes` rows with `proposal_source=agent_curated`, `record_status=new`. Volume target 19-30 new rows. |

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A4 + M8 + B10b in-scope + H1) | 4 |
| BOUNDARY (NULL FK on cross-domain handoff) | 0 net new (B10b in-scope above already covers) |
| APQC TAGGING (high-confidence) | nested under H1 |
| MODULARIZATION ISSUES | 0 (route to Bucket 2 if needed) |
| **Bucket 1 total** | 4 items |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 (carry) | **Rule #15 notes-pollution sweep.** ~20 rows across `handoffs.notes` (131, 132, 515, 787, 1016, 1019, 1020, 1021, 1022, 1024, 1025, 1026, 1127, 1128, 1130, 179), `data_objects.notes` on 5 of 6 PSA masters (216, 217, 218, 219, 725, 726), `domain_data_objects.notes` (162, 109, 31, 33, 100, 66, 210, 244 ad-hoc consumer prose), `domain_module_data_objects.notes` (633, 634, 635) carry auto-generated prose matching forbidden patterns. Carries forward unresolved from 2026-05-30 B2-S1. | Cannot tell from audit alone whether notes were user-approved at load time. Auto-population is the working assumption per Rule #15 audit obligation (revert as default). | (a) Confirm auto-populated; PATCH all ~20 rows' `notes` to empty string and log Rule #15 incident in `references/skill-changelog.md`. (b) Confirm user-approved at load; leave in place. (c) Per-row review. |
| B2-S2 (carry) | **B4 pattern-flag positive re-evaluation per Rule #12.** All flags `false` on all 6 PSA masters. Candidates from prior audit: (a) `project_assignments.has_personal_content=true` (assignment references consultant identity + billable rate). (b) `resource_skill_inventories.has_personal_content=true` (individual-named competencies + certifications). (c) `project_billing_milestones.has_submit_lock=true` once `reached` state hit (rev-rec depends). (d) `service_projects.has_single_approver=true` for customer-sponsor closeout. | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no. |
| B2-S3 (carry) | **M5/M7 boundary: `revenue_recognition_records` lifecycle ownership.** State 403 `recognized` carries `domain_module_id=89` (PSA), but 109 is SUB-MGMT-mastered (module 167). Workflow-gate permission would prefix `psa-project-financials:recognize_*` on a foreign master. | Architectural intent question. | (a) PSA contributes; PATCH state 403 `domain_module_id` to a SUB-MGMT module (or NULL if always-reachable), PATCH tool 1035 `recognize_project_revenue` to `operation_kind=compute` with `data_object_id=NULL`. (b) PSA co-masters the project-revenue slice (multi-master with slice decomposition); INSERT a second `role=master` DMDO row on module 89 for 109. (c) Leave as-is and accept wrong-prefix permission materialization. |
| B2-S4 (carry) | **B1-S3 handling for handoffs 787 + 515.** PSA receives `work_automation.triggered` (787) and `creative_brief.approved` (515) but holds no DMDO row for either payload. Continuation of 2026-05-30 B2-S4. | Editorial / product-intent question. | (a) INSERT `consumer + optional` DMDO rows on PSA-PROJECT-DELIVERY (86) for both payloads + PATCH handoff `target_domain_module_id=86`. (b) DELETE handoffs as mis-modeled. (c) Per-row read. |
| B2-S5 (carry) | **CRM -> PSA renewal inbound.** Pairwise reconciliation flagged a candidate inbound CRM -> PSA on `crm_renewal_opportunity.created`. Existing handoff 137 already covers `crm_opportunity.closed_won`. Overlap or distinct? | Modeling judgment: is a renewal-opportunity a distinct event or just `closed_won` on a renewal-flagged opportunity? | (a) Treat as same shape as 137; no new handoff. (b) Author a distinct renewal handoff to PSA-PROJECT-DELIVERY (86). |
| B2-NEW1 | **`resource_skill_inventories` config-shape exemption (Rule #12).** Master 725 has zero `data_object_lifecycle_states` rows; current `data_objects.notes` carries "Config-shaped master; no workflow." This is the config-shape exemption pattern (Rule #12 + Rule #15: license to write the exemption to `notes` is RESCINDED). The exemption claim itself stands; the recording mechanism needs to move off `notes`. | Where the exemption should be tracked once notes are clean. | (a) Confirm exemption stands; record it in this audit narrative (already covered by this sentence). On B2-S1 cleanup, PATCH the notes to empty without further action; the exemption claim lives in `history.md`. (b) Reject the exemption; load a state machine for 725. |
| B2-NEW2 | **A4 + M8 catalog UX copy (Rule #20).** Domain 68 + 4 modules (86, 87, 88, 89) need `catalog_tagline` (one buyer-voice sentence) and `catalog_description` (1-3 buyer-voice paragraphs) drafted. Per Rule #20, drafts must be surfaced for explicit user approval BEFORE any PATCH. Per Rule #18, copy must not name vendors or products (PSA buyers are services-org leadership, copy stays domain-neutral). | The user owns marketing voice and signoff; auto-population would lock in agent-voice text the user has to undo. | (a) Agent drafts 5 tagline + description pairs in a follow-up Bucket-2 turn and surfaces them per-row for approval / rewrite / decline. (b) User supplies copy directly. (c) Defer to a marketing pass; leave fields empty for now. |

### Bucket 3, Phase 0 pending (speculative)

Carries forward from 2026-05-30 unchanged: 12 entity candidates (`engagement_quotes`, `project_change_requests`, `project_risks`, `project_status_reports`, `project_deliverables`, `billing_rate_cards`, `project_budgets`, `project_invoices`, `staffing_requests`, `capacity_plans`, `utilization_reports`, `project_profitability_records`), 2 modularization candidates (`PSA-ENGAGEMENT-QUOTING`, `PSA-PROFITABILITY-ANALYTICS`), 3 regulation candidates (DCAA, SOX significant-engagement, GDPR consultant PII). No new Bucket 3 surfaced this audit.

### Cross-bucket dependencies

- **B1-B10b-IN gated on B2-S4.** Same dependency as 2026-05-30 B1-S3 -> B2-S4.
- **B1-A4 + B1-M8 gated on B2-NEW2** (drafted copy needs per-row user approval before PATCH).
- **B2-NEW1 (config-shape exemption recording) depends on B2-S1** (when notes are cleaned, the exemption claim needs an authoritative home; this audit narrative serves that purpose).
- **B2-S3 (rev-rec ownership) carries forward unchanged**; resolution unblocks the carried B1-S1 + B1-S8 from 2026-05-30 (state 403 PATCH + tool 1035 PATCH).
- Buckets 2 and 3 otherwise independent of each other.

### Carry-forward map (from 2026-05-30 / 2026-05-31 Continuation)

| Prior ID | Current status |
|---|---|
| B1-S1 (M5/M7 boundary, state 403 anchor on foreign master) | Open; gated on B2-S3. State 403 still `domain_module_id=89`. |
| B1-S2 (5 missing intra-domain handoffs) | **CLOSED** by 2026-05-31 Continuation (rows 1336-1340 verified live). |
| B1-S3 (2 inbound NULL target_module_id) | Open as B1-B10b-IN; gated on B2-S4. |
| B1-S4 (B11 aliases) | **CLOSED** by 2026-05-31 Continuation (21 alias rows 944-964 verified live). |
| B1-S5 (9 outbound NULL target_module, report-only) | Still owed by ERP-FIN / PA / HCM / S2P / EPM. Routed below. |
| B1-S6 (5 inbound NULL source_module, report-only) | Still owed by WFM / EXPENSE / VMS / AGENCY-MGMT. Routed below. |
| B1-S7 (Rule #15 notes-pollution sweep) | Open; gated on B2-S1. ~20 rows still carry forbidden-pattern notes. |
| B1-S8 (tool 1035 boundary) | Open; gated on B2-S3 (same architectural choice as B1-S1). |
| B1-H1 (31 APQC candidates) | Open as B1-H1 above. PCF lookup work still pending. |
| B2-S1 / B2-S2 / B2-S3 / B2-S4 / B2-S5 | All open, no user resolution received. |
| Bucket 3 (12 entities + 2 modularization + 3 regulations) | All open, no user direction received. |

### Report-only follow-ups (owed by other domains)

Unchanged from 2026-05-30. Listed by owing domain.

| Owing domain | Owed work |
|---|---|
| ERP-FIN | B10b: populate `target_domain_module_id` on outbound handoffs 131, 1127, 1128, 1025, 1019. |
| HCM | B10b: populate `target_domain_module_id` on outbound 1016, 1022, 1026. |
| PA | B10b: populate `target_domain_module_id` on outbound 1130. |
| EPM | B10b: populate `target_domain_module_id` on outbound 1021. |
| S2P | B10b: populate `target_domain_module_id` on outbound 132. |
| WFM | B10b: populate `source_domain_module_id` on inbound 104 + 428. |
| EXPENSE | B10b: populate `source_domain_module_id` on inbound 139. |
| VMS | B10b: populate `source_domain_module_id` on inbound 587. |
| AGENCY-MGMT | B10b: populate `source_domain_module_id` on inbound 513 + 515. |
| WORK-MGMT | B10b: populate `target_domain_module_id` on outbound 1024. |
| SUB-MGMT | If B2-S3 lands as option (a), confirm whether SUB-MGMT-SUBSCRIPTIONS (167) or a SUB-MGMT-REVREC sibling owns the rev-rec workflow. |

### JWT errors

None encountered during this audit.

### Frontmatter

Status `feedback_needed`. Bucket 1 open: A4, M8, B10b-IN, H1 (plus carry-forward S1, S3, S5, S6, S7, S8, H1). Bucket 2 open: S1, S2, S3, S4, S5, NEW1, NEW2. Bucket 3 carries forward unchanged (12 entities + 2 modularization + 3 regulations).

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
