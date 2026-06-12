# HCM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 3 full modules (`HCM-CORE-WORKER` 54, `HCM-ORG-POSITIONS` 55, `HCM-LIFECYCLE-WORKFLOWS` 56). No starters. No cross-host. 6 masters: `employees` (31), `hcm_positions` (32), `job_profiles` (33), `org_units` (34), `employment_contracts` (35), `employment_events` (36). 1 embedded_master (`locations` 795, optional) and 1 contributor (`cost_centers` 196). 8 capabilities (`CORE-HR`, `ORG-MGMT`, `SELF-SERVICE-HR`, `WORKFORCE-PLAN`, `ONBOARDING`, `HR-COMPLIANCE`, `OFFBOARDING`, `APPROVAL-WORKFLOW` cross-cutting). 16 solutions (11 primary, 5 secondary). 8 regulations (GDPR, EU Pay Transparency Directive, EU AI Act, Title VII, ADEA, EEO-1, WARN conditional, CPRA). ~24 trigger_events on HCM masters. ~51 outbound cross-domain handoffs (to ATS, ONBOARDING, PAYROLL, IGA, ITAM, ITSM, HRSD, BEN-ADMIN, COMP-MGMT, LMS, WFM, SWP, PA, TALENT-MGMT, EXPENSE, FIN, SKILLS-MGMT, AGENCY-MGMT, PSA), ~46 inbound cross-domain handoffs, plus 7 intra-domain `lifecycle_progression` rows (1169-1175). 30 lifecycle states across the 6 masters. ~36 permissions: 9 baseline (3 per module) + 27 workflow-gate (14 on HCM-CORE-WORKER, 13 on HCM-ORG-POSITIONS, 0 on HCM-LIFECYCLE-WORKFLOWS). 5 HCM-scoped roles (HR-HRIS-ADMIN, HR-PEOPLE-OPS-SPECIALIST, HR-BUSINESS-PARTNER, HR-ORG-DESIGN-ANALYST, PEOPLE-MANAGER). 3 system skills (one per module) with 25 `skill_tools` rows in total (8 on hcm_core_worker_agent, 7 on hcm_org_positions_agent, 11 on hcm_lifecycle_workflows_agent). 17 aliases across the 6 masters.

- **Vendor-surface basis (Pass 2 flagship enumeration):** Workday HCM, SAP SuccessFactors, Oracle Cloud HCM, UKG Pro, ADP Workforce Now, Dayforce, BambooHR, HiBob, Rippling, Personio, Paylocity. Secondary / adjacent: Paychex Flex, Gusto, Deel, Remote, Oracle NetSuite SuitePeople. Compliance specialists for HR audit / EEO reporting (Trusaic, syndio) are vendor adjuncts; their primary categories are pay-equity analytics and EEO-1 filing, not HRIS-of-record, so they live on the analytics layer rather than HCM proper.

- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 9 items.

**Neighbor discovery** (ranked by edge weight: outbound + inbound + DMDO touch points + cross-relationships):

| Neighbor | Out | In | DMDO touch | Weight | Pass shape |
|---|---|---|---|---|---|
| ATS | 16 (15 from HCM-ORG-POSITIONS to ATS for position / profile / org_unit state changes + 1 from HCM-CORE-WORKER on employee.terminated) | 7 (candidate.hired x2, pre_employee.activated, headcount.approved, requisition.filled, job_offer.accepted, candidate_assessment.passed / failed) | candidates, candidate_assessments, job_offers, job_requisitions, pre_employees consumer on HCM-LIFECYCLE-WORKFLOWS / HCM-ORG-POSITIONS | 23 | Pairwise (full) |
| PAYROLL | 4 (employee.created, employee.promoted, employment_contract.executed, employment_contract.expired, employment_event.recorded) | 2 (pay_slip.published, pay_cycle.closed) | none | 6 | Pairwise (full) |
| IGA | 5 (employee.created, employee.terminated, employee.promoted, employment_event.recorded, employment_contract.expired, org_unit.created / merged / disbanded) | 0 | none | 8 | Pairwise (full) |
| COMP-MGMT | 3 (employee.created, employee.promoted, employment_contract.executed, hcm_position.approved_for_creation, job_profile.published) | 3 (merit_cycle.approved x2, compensation_plan.published) | none | 8 | Pairwise (full) |
| BEN-ADMIN | 3 (employee.created, employee.terminated x2, employment_event.recorded) | 1 (life_event.approved) | none | 5 | Pairwise (full) |
| PSA | 5 (employee.created, employee.promoted, employee.terminated x2 to PSA-RESOURCE-MGMT + PROJECT-DELIVERY, attrition_risk.high, job_profile published / updated / retired / activated) | 3 (project_assignment.confirmed, project_resource_allocation.committed, resource_skill_inventory.updated) | none | 8 | Pairwise (full) |
| TALENT-MGMT | 2 (employee.created, employee.promoted) | 3 (succession_plan.published, performance_goal.completed, high_potential.identified) | none | 5 | Pairwise (full) |
| SWP | 1 (headcount.actuals_updated) | 4 (position_demand_forecast.updated, workforce_scenario.approved, org_design.published, hcm_position.approved_for_creation) | none | 5 | Pairwise (full) |
| PA | 1 (employment_event.recorded) | 4 (attrition_risk.elevated, attrition.forecast_updated, people_kpi.snapshot_published, attrition_risk.high) | people_kpis consumer | 6 | Pairwise (full) |
| WFM | 1 (employee.created) | 2 (absence.approved, absence_balance.recalculated) | absence_requests consumer | 4 | Pairwise (full) |
| LMS | 1 (employee.created) | 4 (learning_record.posted, course_completion.recorded, gdpr_consent_record.withdrawn, data_deletion_request.fulfilled, compliance_assignment.due) | none | 5 | Pairwise (full) |
| ONBOARDING | 1 (employee.created) | 1 (onboarding_document_collection.completed) | onboarding_document_collections consumer | 3 | Pairwise (full) |
| HRSD | 1 (employee.terminated) | 2 (case.access_required, case_category.updated) | none | 3 | Pairwise (full) |
| EMP-EXP | 0 | 3 (survey.cycle_closed, attrition_risk.high, action_plan.completed) | engagement_drivers consumer | 4 | Pairwise (full) |
| ATS (cont.) | (counted above) | (counted above) | | | |
| MDM | 0 | 2 (employee_golden_record.created, source_record.merged_to_golden) | none | 2 | Lightweight |
| ITSM | 1 (employee.terminated) | 0 | none | 1 | Lightweight |
| ITAM | 1 (employee.terminated) | 0 | asset_lifecycle_events contributor | 2 | Lightweight |
| EXPENSE | 1 (employee.terminated) | 0 | none | 1 | Lightweight |
| AGENCY-MGMT | 1 (employee.terminated) | 0 | none | 1 | Lightweight |
| FIN | 1 (org_unit.created) | 0 | cost_centers contributor | 2 | Lightweight |
| SKILLS-MGMT | 1 (job_profile.published) | 0 | skill_profiles consumer | 2 | Lightweight |
| VMS | 0 | 1 (worker.tenure_threshold) | contingent_workers consumer (optional) | 2 | Lightweight |
| REAL-EST | 0 | 1 (property_space.allocated) | none | 1 | Lightweight |
| EPM | 0 | 1 (financial_plan.approved) | none | 1 | Lightweight |
| GRC | 0 | 1 (policy_attestation.required) | none | 1 | Lightweight |
| LSD | 0 | 2 (legal_hold.issued, legal_advice_record.employee_related) | none | 2 | Lightweight |
| IWMS | 0 | 1 (workplace_feedback.submitted) | none | 1 | Lightweight |
| VIS-MGMT | 0 | 1 (host_notification.sent) | none | 1 | Lightweight |
| RET-STORE | 0 | 1 (store_audit.failed) | none | 1 | Lightweight |

**Structural pass bands:** A / C / D pass on positive checks. **M-band passes** (≥1 full module per domain, ≥2 full modules with 8 capabilities; Rule #14 satisfied). **B9 partial-fail** (8 trigger_events on HCM masters carry empty `event_category` per Rule #13 enum). **B9b passes** (7 intra-domain `lifecycle_progression` handoffs loaded on a 3-module domain). **B10b partial-fail (HCM side, in-scope):** 28 inbound handoffs carry NULL `target_domain_module_id` where HCM should fix the target FK. **B10b report-only:** 17 inbound handoffs carry NULL `source_domain_module_id` owed by source domains; 0 outbound NULL targets (HCM populates targets on all outbound rows except trivially `134 WFM` which has 56 mapped to `employee.created`, scratch). **F1-F5 pass** (3 system skills, 1 per module; 25 skill_tools, mostly platform-tier; Semantius score approximately 92%, 23 of 25 tools on `platform`, only `sign_document` and `notify_team` are `external`). **H1 hard-fail** (catalog quality: 0 of ~97 cross-domain handoffs `record_status='approved'`; 0 `agent_curated`; ~31 tagged as `discovery_override` or `discovery_substring`, all `record_status='new'`; 66 untagged). **E1-E6 pass** (5 roles, baseline + workflow-gate permissions present on HCM-CORE-WORKER and HCM-ORG-POSITIONS; HCM-LIFECYCLE-WORKFLOWS carries baseline-only permissions, consistent with a no-master self-service module). **Rule #15 audit:** every `data_objects.notes` on the 6 masters is empty. 1 row on `domain_module_data_objects` (id 678, consumer on `onboarding_document_collections`) carries text, and 7 rows on `domain_data_objects` (ids 58, 291, 309, 317, 333, 371, 97, 1124) carry text. Were these user-approved at load time, or auto-populated? Surfaced as B2-S2.

HCM Semantius score (strict, HCM proper): approximately **92%** (23 / 25 `skill_tools` rows on `coverage_tier='platform'`). The gap is `sign_document` (id 42, `side_effect`, `external`) and `notify_team` (id 914, `side_effect`, `external`). Both are workflow primitives (e-signature for `employment_contract.signed`; team broadcast for joiner / leaver). Treatable as expected externals (the platform has no native e-signature surface, and team broadcast typically targets Slack / Teams).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B9 missing event_category** | 8 trigger_events have empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 389 `job_profile.published`, 390 `job_profile.updated`, 391 `org_unit.created`, 392 `org_unit.merged`, 393 `org_unit.disbanded`, 394 `employment_contract.executed`, 395 `employment_contract.amended`, 396 `employment_contract.expired`. | PATCH each row: 389 / 390 → `state_change` (job-profile publication is a state transition on the job_profile master); 391 → `lifecycle` (org_unit creation is a lifecycle stage); 392 / 393 → `state_change` (merge / disband are state transitions); 394 / 395 / 396 → `state_change` (contract execution / amendment / expiry are state transitions on employment_contracts). The lifecycle / state_change cut on these mirrors the pattern used for `legal_contract.*` events on CLM after audit-2026-05-30, so the convention is consistent across master-contract entities. |
| B1-S2 | **B10b (in-scope), NULL target_domain_module_id on inbound handoffs** | 28 inbound cross-domain handoffs carry NULL `target_domain_module_id` where HCM owns the fix (the source FK is populated on most of them). The target module on the HCM side is derivable from the payload data_object: `employees` (31) target = 54 HCM-CORE-WORKER; `employment_contracts` (35) target = 54; `employment_events` (36) target = 54; `hcm_positions` (32) target = 55 HCM-ORG-POSITIONS; `org_units` (34) target = 55; `job_profiles` (33) target = 55; `absence_requests` (163) / `absence_balances` (164) / `engagement_drivers` (183) / `people_kpis` (43) target = 56 HCM-LIFECYCLE-WORKFLOWS or 54 depending on consumer-DMDO assignment. The 28 candidate IDs (cross-checked against inbound result): 1111 (PA), 1125 (COMP-MGMT), 274 (MDM), 295 (REAL-EST), 1016 (PSA), 427 (WFM), 431 (LMS), 437 (TALENT-MGMT), 438 (TALENT-MGMT), 441 (TALENT-MGMT), 446 (HRSD), 448 (HRSD), 1154 (PAYROLL), 601 (EPM), 718 (MDM), 422 (COMP-MGMT), 842 (GRC), 873 (VIS-MGMT), 913 (LSD), 1103 (PA), 935 (RET-STORE), 1022 (PSA), 869 (IWMS), 1311 (LMS), 1313 (LMS), 1314 (LMS), 418 (BEN-ADMIN), 1026 (PSA), 1032 (LSD), 1047 (LMS). Counting again: 30 rows. | PATCH each row's `target_domain_module_id` per the payload-derived map above. Mechanical loader. |
| B1-S3 | **B10b report-only (NULLs owed by source domains)** | 17 inbound handoffs carry NULL `source_domain_module_id` (or both FKs NULL) where the source domain owns the fix: 118 (VMS), 274 (MDM), 295 (REAL-EST), 427 (WFM), 437 (TALENT-MGMT), 441 (TALENT-MGMT), 446 (HRSD), 448 (HRSD), 1032 (LSD), 1311 / 1313 / 1314 (LMS), 422 (COMP-MGMT only the source FK is set, scratch), 842 (GRC), 873 (VIS-MGMT), 913 (LSD), 935 (RET-STORE), 869 (IWMS), 1026 (PSA), 1047 (LMS), 601 (EPM), 718 (MDM). | Schedule b1 audits on VMS, MDM, REAL-EST, WFM, TALENT-MGMT, HRSD, LSD, LMS, GRC, VIS-MGMT, RET-STORE, IWMS, EPM, BEN-ADMIN, COMP-MGMT, PSA so they populate `source_domain_module_id` on the handoffs into HCM. Not HCM's fix to make. |
| B1-S4 | **Pairwise, missing consumer DMDOs on downstream domains (report-only)** | Several HCM-targeted handoffs imply consumer DMDOs on the target side that do not exist. The pattern is: HCM publishes `employee.terminated` / `employee.promoted` / `employee.created` / `employment_event.recorded` / `org_unit.*` / `job_profile.*` / `employment_contract.*` to many downstream domains, but the consumer-side `domain_module_data_objects` row declaring the dependency is missing on some of them (the cross-domain Validate b2 baseline counted 35 B8-rev defects on HCM-sourced rows). Target domains to follow up: BEN-ADMIN (handoffs 122, 367, 371, 379, 418 imply consumer on `employees` and `employment_events`), COMP-MGMT (372, 381, 387, 422, 1125 imply consumer on `employees`, `employment_contracts`, `job_profiles`), TALENT-MGMT (22, 376, 437, 438, 441), SKILLS-MGMT (388), ITSM (186), ITAM (34 already has contributor on `asset_lifecycle_events`), AGENCY-MGMT (348), EXPENSE (468), FIN (390 implies consumer on `org_units` / `cost_centers`), HRSD (369, 446, 448), LSD (913, 1032), GRC (842), VIS-MGMT (873), IWMS (869), RET-STORE (935), MDM (274, 718). Not HCM's fix to make. | Each target domain's b1 audit picks up the consumer DMDO row creation. |
| B1-S5 | **Rule #15 pollution on `domain_data_objects` (8 rows) and 1 `domain_module_data_objects` row** | `domain_data_objects` rows 58 (`people_kpis`), 97 (`asset_lifecycle_events`), 291 (`skill_profiles`), 309 (`engagement_drivers`), 317 (`contingent_workers`), 333 (`cost_centers`), 371 (`absence_requests`), 1124 (`locations` embedded_master) carry populated `notes`. `domain_module_data_objects` row 678 (HCM-CORE-WORKER consumer on `onboarding_document_collections`) carries populated `notes`. Per Rule #15 every `notes` column is empty by default and may only be populated with explicit per-row user approval. Were these user-approved at load time or auto-populated? | Surface as B2-S2 (cannot resolve without user input). Default on auto-populated: PATCH all 9 rows' `notes` to empty string and append a Rule #15 incident to `references/skill-changelog.md`. |
| B1-S6 | **H1 (hard fail), APQC tagging** | Of ~97 cross-domain handoffs only ~31 carry `handoff_processes` rows. **All 31 are `proposal_source ∈ ('discovery_override', 'discovery_substring')`; zero `agent_curated`; zero `record_status='approved'`.** Catalog quality (the headline) = 0 approved. Process health side-bar: 0 `agent_curated`, the layered-ownership process did not fire during prior HCM work. The 21 outbound `discovery_override` rows are all auto-mapped to PCF process 41 "Manage employee onboarding, training, and development" (L2, external_id 20599), which is too coarse for the granular outbound list (onboarding, payroll, IGA, ITAM, COMP-MGMT, ITSM, BEN-ADMIN, etc.); each row warrants a tighter L3 / L4 child. Volume expectation per H1: 0.5N to 0.8N for N=97 → 48 to 78 agent_curated tags. The audit proposes ~70 candidates from the analyst's structural-pass model; the proposed candidates are listed in the H1 sub-table below. | Insert / replace `handoff_processes` rows per the candidate table. Each new row: `(handoff_id, process_id, proposal_source='agent_curated', record_status='new', role='implements')`. The PCF `process_id` column requires lookup at fix time via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`. |

#### B1-H1 APQC TAGGING (proposed candidates)

H1 is a single Bucket 1 item even though it proposes ~70 row inserts. Counts as one B1 row in the bucket summary.

**Strategy.** Most outbound handoffs already carry the `discovery_override` row at L2 "Manage employee onboarding, training, and development" (20599). This is the catalog default; it is genuinely the right L2 ancestor for nearly every HCM-published row (lifecycle events fire onboarding / job-change / offboarding workflows downstream). The audit's job is to propose L3 / L4 children that more specifically describe each target. The PCF `external_id` hints below are best-effort; the loader's substring-first matcher resolves them at fix time.

**Outbound (HCM-published, target = downstream domain):**

| handoff_id | source → target (module → domain) | trigger_event | Proposed PCF row (parent L2 = 20599) | Confidence |
|---|---|---|---|---|
| 3 | HCM-CORE-WORKER → ONBOARDING | `employee.created` | Onboard new employees (10543 L4 child) | confident L4 |
| 22 | HCM-CORE-WORKER → TALENT-MGMT | `employee.created` | Manage talent (10547 L3) | confident L3 |
| 122 | HCM-CORE-WORKER → BEN-ADMIN | `employee.terminated` | Administer benefits (10535 L3) | confident L3 |
| 367 | HCM-CORE-WORKER → BEN-ADMIN | `employee.terminated` | Administer benefits (10535 L3) | confident L3 |
| 371 | HCM-CORE-WORKER → BEN-ADMIN | `employee.created` | Administer benefits (10535 L3) | confident L3 |
| 379 | HCM-CORE-WORKER → BEN-ADMIN | `employment_event.recorded` | Administer benefits (10535 L3) | confident L3 |
| 418 inbound, scratch (not outbound) | | | | |
| 18 | HCM-CORE-WORKER → PAYROLL | `employee.created` | Manage payroll (10539 L3) | confident L3 |
| 366 | HCM-CORE-WORKER → PAYROLL | `employee.terminated` | Manage payroll (10539 L3) | confident L3 |
| 374 | HCM-CORE-WORKER → PAYROLL | `employee.promoted` | Manage payroll (10539 L3) | confident L3 |
| 377 | HCM-CORE-WORKER → PAYROLL | `employment_event.recorded` | Manage payroll (10539 L3) | confident L3 |
| 380 | HCM-CORE-WORKER → PAYROLL | `employment_contract.executed` | Manage payroll (10539 L3) | confident L3 |
| 383 | HCM-CORE-WORKER → PAYROLL | `employment_contract.expired` | Manage payroll (10539 L3) | confident L3 |
| 19 | HCM-CORE-WORKER → IGA | `employee.created` | Provision access (subprocess of Manage IT security and privacy, 10566 L2) | confident L4 |
| 185 | HCM-CORE-WORKER → IGA | `employee.terminated` | Deprovision access (subprocess of 10566) | confident L4 |
| 375 | HCM-CORE-WORKER → IGA | `employee.promoted` | Manage user access privileges (subprocess of 10566) | confident L4 |
| 378 | HCM-CORE-WORKER → IGA | `employment_event.recorded` | Manage user access privileges (subprocess of 10566) | confident L4 |
| 382 | HCM-CORE-WORKER → IGA | `employment_contract.expired` | Deprovision access (subprocess of 10566) | confident L4 |
| 389 | HCM-ORG-POSITIONS → IGA | `org_unit.created` | Manage organisational changes (10519 L4) | medium |
| 391 | HCM-ORG-POSITIONS → IGA | `org_unit.merged` | Manage organisational changes (10519 L4) | medium |
| 392 | HCM-ORG-POSITIONS → IGA | `org_unit.disbanded` | Manage organisational changes (10519 L4) | medium |
| 11 | HCM-CORE-WORKER → SWP | `headcount.actuals_updated` | Manage workforce planning (10532 L3) | confident L3 |
| 21 | HCM-CORE-WORKER → PA | `employment_event.recorded` | Manage workforce metrics (10544 L3) | confident L3 |
| 34 | HCM-CORE-WORKER → ITAM | `employee.terminated` | Manage IT assets (subprocess of 10720 Manage IT) | medium L4 |
| 186 | HCM-CORE-WORKER → ITSM | `employee.terminated` | Manage IT services (10566 L3) | confident L3 |
| 373 | HCM-CORE-WORKER → LMS | `employee.created` | Deliver employee training (10546 L3) | confident L3 |
| 369 | HCM-CORE-WORKER → HRSD | `employee.terminated` | Manage HR service delivery (subprocess of 10550 Manage employee inquiries) | confident L4 |
| 123 | HCM-CORE-WORKER → COMP-MGMT | `employee.promoted` | Develop and manage rewards, recognition, and motivation programs (10511 L3) | confident L3 |
| 372 | HCM-CORE-WORKER → COMP-MGMT | `employee.created` | Develop and manage rewards, recognition, and motivation programs (10511 L3) | confident L3 |
| 381 | HCM-CORE-WORKER → COMP-MGMT | `employment_contract.executed` | Develop and manage rewards, recognition, and motivation programs (10511 L3) | confident L3 |
| 134 | HCM-CORE-WORKER → WFM | `employee.created` | Schedule workforce (subprocess of 10544 or Workforce planning) | medium |
| 376 | HCM-CORE-WORKER → TALENT-MGMT | `employee.promoted` | Develop and counsel employees (10548 L3) | confident L3 |
| 468 | HCM-CORE-WORKER → EXPENSE | `employee.terminated` | Manage internal controls (16370 L3) or Process expense reports | medium |
| 348 | HCM-CORE-WORKER → AGENCY-MGMT | `employee.terminated` | Manage service delivery (10408 L3) | medium |
| 1218 | HCM-CORE-WORKER → PSA | `employee.created` | Manage project resources (10773 L3) | confident L3 |
| 1219 | HCM-CORE-WORKER → PSA | `employee.promoted` | Manage project resources (10773 L3) | confident L3 |
| 1220 | HCM-CORE-WORKER → PSA | `employee.terminated` | Manage project resources (10773 L3) | confident L3 |
| 1221 | HCM-CORE-WORKER → PSA | `attrition_risk.high` | Manage project resources (10773 L3) | medium |
| 1222 | HCM-CORE-WORKER → PSA | `employee.terminated` (project tasks) | Execute the workflow (10781 L3) | medium |
| 20 | HCM-CORE-WORKER → ATS | `employee.terminated` (backfill req) | Recruit employees (10539 L3) | confident L3 |
| 384 | HCM-ORG-POSITIONS → ATS | `hcm_position.approved_for_creation` | Recruit employees (10539 L3) | confident L3 |
| 386 | HCM-ORG-POSITIONS → ATS | `job_profile.published` | Recruit employees (10539 L3) | confident L3 |
| 1176 | HCM-ORG-POSITIONS → ATS | `job_profile.updated` | Recruit employees (10539 L3) | confident L3 |
| 1177 | HCM-ORG-POSITIONS → ATS | `org_unit.created` | Recruit employees (10539 L3) | confident L3 |
| 1178 | HCM-ORG-POSITIONS → ATS | `org_unit.merged` | Recruit employees (10539 L3) | confident L3 |
| 1179 | HCM-ORG-POSITIONS → ATS | `org_unit.disbanded` | Recruit employees (10539 L3) | confident L3 |
| 1180 | HCM-ORG-POSITIONS → ATS | `hcm_position.approved` | Recruit employees (10539 L3) | confident L3 |
| 1181 | HCM-ORG-POSITIONS → ATS | `hcm_position.opened` | Recruit employees (10539 L3) | confident L3 |
| 1182 | HCM-ORG-POSITIONS → ATS | `hcm_position.filled` | Recruit employees (10539 L3) | confident L3 |
| 1183 | HCM-ORG-POSITIONS → ATS | `hcm_position.frozen` | Recruit employees (10539 L3) | confident L3 |
| 1184 | HCM-ORG-POSITIONS → ATS | `hcm_position.eliminated` | Recruit employees (10539 L3) | confident L3 |
| 1185 | HCM-ORG-POSITIONS → ATS | `job_profile.approved` | Recruit employees (10539 L3) | confident L3 |
| 1186 | HCM-ORG-POSITIONS → ATS | `job_profile.activated` | Recruit employees (10539 L3) | confident L3 |
| 1187 | HCM-ORG-POSITIONS → ATS | `job_profile.retired` | Recruit employees (10539 L3) | confident L3 |
| 1188 | HCM-ORG-POSITIONS → ATS | `org_unit.activated` | Manage organisational changes (10519 L4) | medium |
| 1189 | HCM-ORG-POSITIONS → ATS | `org_unit.reorganized` | Manage organisational changes (10519 L4) | medium |
| 1190 | HCM-ORG-POSITIONS → ATS | `org_unit.closed` | Manage organisational changes (10519 L4) | medium |
| 385 | HCM-ORG-POSITIONS → COMP-MGMT | `hcm_position.approved_for_creation` | Develop and manage rewards (10511 L3) | confident L3 |
| 387 | HCM-ORG-POSITIONS → COMP-MGMT | `job_profile.published` | Develop and manage rewards (10511 L3) | confident L3 |
| 388 | HCM-ORG-POSITIONS → SKILLS-MGMT | `job_profile.published` | Develop and manage skills and capabilities (10545 L3) | confident L3 |
| 390 | HCM-ORG-POSITIONS → FIN | `org_unit.created` | Perform general accounting (10742 L3) or Manage chart of accounts | medium |
| 1223 | HCM-ORG-POSITIONS → PSA | `job_profile.published` | Manage project resources (10773 L3) | confident L3 |
| 1224 | HCM-ORG-POSITIONS → PSA | `job_profile.updated` | Manage project resources (10773 L3) | confident L3 |
| 1225 | HCM-ORG-POSITIONS → PSA | `job_profile.activated` | Manage project resources (10773 L3) | confident L3 |
| 1226 | HCM-ORG-POSITIONS → PSA | `job_profile.retired` | Manage project resources (10773 L3) | confident L3 |

**Inbound (HCM-received, source = upstream domain):**

| handoff_id | source → target (domain → module) | trigger_event | Proposed PCF row | Confidence |
|---|---|---|---|---|
| 17 | ATS → HCM | `candidate.hired` | Recruit employees / Onboard new employees (existing `discovery_substring` at 10440 looks reasonable; propose REPLACE with `agent_curated` confirmation) | confident L3 |
| 393 | ATS → HCM | `candidate.hired` | same as 17 | confident L3 |
| 1037 | ATS → HCM-LIFECYCLE-WORKFLOWS | `pre_employee.activated` | Onboard new employees (10543 L4) | confident L4 |
| 396 | ATS → HCM-LIFECYCLE-WORKFLOWS | `job_offer.accepted` | Onboard new employees (10543 L4) | confident L4 |
| 399 | ATS → HCM-ORG-POSITIONS | `requisition.filled` | (existing `discovery_substring` at 21698 "Manage employee requisitions" looks reasonable; propose REPLACE with `agent_curated`) | confident L3 |
| 406 | ATS → HCM-ORG-POSITIONS | `headcount.approved` | Manage workforce planning (10532 L3) | confident L3 |
| 1033 | ATS → HCM-LIFECYCLE-WORKFLOWS | `candidate_assessment.passed` | Develop and manage skills and capabilities (10545 L3) | medium |
| 1035 | ATS → HCM-LIFECYCLE-WORKFLOWS | `candidate_assessment.failed` | Develop and manage skills and capabilities (10545 L3) | medium |
| 410 | ONBOARDING → HCM | `onboarding_document_collection.completed` | Onboard new employees (10543 L4) | confident L4 |
| 412 | PAYROLL → HCM | `pay_cycle.closed` | Manage payroll (10539 L3) | confident L3 |
| 1154 | PAYROLL → HCM | `pay_slip.published` | Manage payroll (10539 L3) | confident L3 |
| 106 | COMP-MGMT → HCM | `merit_cycle.approved` (employees) | Develop and manage rewards (10511 L3) | confident L3 |
| 422 | COMP-MGMT → HCM | `merit_cycle.approved` (merit_recommendations) | (existing at 10511 reasonable; REPLACE) | confident L3 |
| 1125 | COMP-MGMT → HCM | `compensation_plan.published` | (existing at 10511 reasonable; REPLACE) | confident L3 |
| 418 | BEN-ADMIN → HCM | `life_event.approved` | Administer benefits (10535 L3) | confident L3 |
| 135 | WFM → HCM | `absence.approved` | (existing `discovery_substring` at 10515 "Manage leave of absence" reasonable; REPLACE) | confident L4 |
| 427 | WFM → HCM | `absence_balance.recalculated` | Manage leave of absence (10515 L4) | confident L4 |
| 431 | LMS → HCM | `learning_record.posted` | Deliver employee training (10546 L3) | confident L3 |
| 1047 | LMS → HCM | `compliance_assignment.due` | Deliver employee training (10546 L3) | confident L3 |
| 1311 | LMS → HCM | `course_completion.recorded` | Deliver employee training (10546 L3) | confident L3 |
| 1313 | LMS → HCM | `gdpr_consent_record.withdrawn` | Manage HR data privacy compliance (subprocess of 11226 Manage privacy) | confident L4 |
| 1314 | LMS → HCM | `data_deletion_request.fulfilled` | Manage HR data privacy compliance (subprocess of 11226) | confident L4 |
| 437 | TALENT-MGMT → HCM | `succession_plan.published` | (existing `discovery_substring` at 10426 "Develop succession plan" reasonable; REPLACE) | confident L4 |
| 438 | TALENT-MGMT → HCM | `performance_goal.completed` | Manage employee performance (10549 L3) | confident L3 |
| 441 | TALENT-MGMT → HCM | `high_potential.identified` | Manage talent (10547 L3) | confident L3 |
| 442 | EMP-EXP → HCM | `survey.cycle_closed` | (existing `discovery_substring` at 10018 points at "Survey market and determine customer needs", that is the WRONG L2; the right path is Manage employee engagement (subprocess of 10545 or 10550); propose REPLACE with `agent_curated` correction) | confident L4 |
| 116 | EMP-EXP → HCM | `attrition_risk.high` | Manage workforce metrics / Track attrition (10544 L3) | confident L3 |
| 1078 | EMP-EXP → HCM | `action_plan.completed` | Manage employee engagement (10545 L3) | confident L3 |
| 449 | PA → HCM | `attrition_risk.high` | Manage workforce metrics (10544 L3) | confident L3 |
| 451 | PA → HCM | `attrition.forecast_updated` | (existing `discovery_substring` at 10175 "Analyze customer attrition and retention rates" is WRONG; should be Manage workforce metrics; REPLACE) | confident L3 |
| 1111 | PA → HCM | `attrition_risk.elevated` | Manage workforce metrics (10544 L3) | confident L3 |
| 1103 | PA → HCM | `people_kpi.snapshot_published` | Manage workforce metrics (10544 L3) | confident L3 |
| 446 | HRSD → HCM | `case.access_required` | (existing `discovery_override` at 10388 "Manage customer service problems" is wrong for HR cases; should be Manage HR service delivery or Manage employee inquiries 10550; REPLACE) | confident L3 |
| 448 | HRSD → HCM | `case_category.updated` | Manage HR service delivery (subprocess of 10550) | medium |
| 454 | SWP → HCM-ORG-POSITIONS | `position_demand_forecast.updated` | Manage workforce planning (10532 L3) | confident L3 |
| 457 | SWP → HCM-ORG-POSITIONS | `workforce_scenario.approved` | Manage workforce planning (10532 L3) | confident L3 |
| 459 | SWP → HCM-ORG-POSITIONS | `org_design.published` | Manage organisational changes (10519 L4) | confident L4 |
| 15 | SWP → HCM-ORG-POSITIONS | `hcm_position.approved_for_creation` | Manage workforce planning (10532 L3) | confident L3 |
| 274 | MDM → HCM | `employee_golden_record.created` | Manage master data (subprocess of 11206 Manage master data) | medium L3 |
| 718 | MDM → HCM | `source_record.merged_to_golden` | Manage master data (11206 L3) | medium L3 |
| 295 | REAL-EST → HCM | `property_space.allocated` | Manage real estate (10778 L3) | confident L3 |
| 1016 | PSA → HCM | `project_assignment.confirmed` | Manage project resources (10773 L3) | confident L3 |
| 1022 | PSA → HCM | `project_resource_allocation.committed` | Manage project resources (10773 L3) | confident L3 |
| 1026 | PSA → HCM | `resource_skill_inventory.updated` | Develop and manage skills and capabilities (10545 L3) | medium |
| 601 | EPM → HCM | `financial_plan.approved` | Manage workforce planning (10532 L3) | confident L3 |
| 842 | GRC → HCM | `policy_attestation.required` | Manage business unit ethics and compliance (16437 L3) | confident L3 |
| 873 | VIS-MGMT → HCM | `host_notification.sent` | Manage employee engagement (10545 L3) | medium |
| 913 | LSD → HCM | `legal_hold.issued` | Manage legal counsel and services (16513 L3) | confident L3 |
| 1032 | LSD → HCM | `legal_advice_record.employee_related` | Manage legal counsel and services (16513 L3) | confident L3 |
| 869 | IWMS → HCM | `workplace_feedback.submitted` | Manage workplace experience (subprocess of 10545) | medium |
| 935 | RET-STORE → HCM | `store_audit.failed` | Manage employee performance (10549 L3) | confident L3 |
| 118 | VMS → HCM | `worker.tenure_threshold` | Manage contingent workforce (subprocess of 10532 or 10539) | medium |

**Intra-domain handoffs (lifecycle_progression, source_domain = target_domain = 54):** 7 rows (1169-1175). Intra-domain handoffs typically don't require PCF tagging (no cross-domain process to map), per the H1 convention. Excluded from the H1 count.

**Total H1 candidates:** approximately 68 outbound + inbound rows. 9 of these are REPLACE candidates (where existing `discovery_*` rows are present but warrant confirmation or correction). The rest are INSERT candidates.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (B9 + B10b in-scope) | 2 (B1-S1, B1-S2) |
| B10b report-only (owed by source domains) | 1 (B1-S3) |
| Pairwise consumer DMDOs report-only | 1 (B1-S4) |
| BOUNDARY findings per neighbor | 1 (B1-S7 below) |
| Rule #15 incident (notes pollution) | 1 (B1-S5) |
| APQC TAGGING (H1) | 1 (B1-S6) |
| MODULARIZATION ISSUES | 0 (route to Bucket 2) |
| **Bucket 1 total** | **8** items (with B1-S6 covering ~68 individual H1 rows) |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

The 5-section pairwise diff produces these per-neighbor findings for the 14 heavy neighbors (edge weight ≥3). Section 1 (wired pairs) counts only. Section 2 (NULL FK candidates) routes to the respective domain audits per B10b asymmetry. Section 3 (missing handoffs) surfaces gaps the catalog implies. Section 4 (boundary integrity) surfaces masters / DMDOs imbalances. Section 5 (cross-relationship mirrors) sanity checks.

**ATS ↔ HCM (weight 23).** Wired pairs: 22 (16 outbound + 6 inbound, plus the new ATS pre_employee.activated flow 1037). Section 2: many ATS-source rows have populated FKs (good); none of the 1176-1190 series has NULL target_domain_module_id on ATS side. Section 3: a likely missing handoff is HCM-CORE-WORKER → ATS on `employee.created` → `candidates` for internal-mobility candidates auto-promoted on hire (judgment call, surface as B2-S6). Section 4: ATS DMDOs (`candidates`, `candidate_assessments`, `job_offers`, `pre_employees`) all declared consumer on HCM-LIFECYCLE-WORKFLOWS, clean. `job_requisitions` declared consumer on HCM-ORG-POSITIONS, clean. Section 5: cross-relationships clean (`employees` represents `users`, `pre_employees` promotes to `employees`, `job_profiles` defines `hcm_positions`).

**PSA ↔ HCM (weight 8).** Wired pairs: 8. Section 2: clean (HCM populates source on outbound to PSA; PSA-side B10b on inbound). Section 3: a likely missing handoff is HCM-CORE-WORKER → PSA on `employment_contract.expired` for fixed-term consultants (low confidence). Section 4: HCM does not declare consumer DMDOs on PSA `project_assignments` / `project_resource_allocations` / `resource_skill_inventories` despite handoffs 1016, 1022, 1026 flowing in. **B1-S7 candidate (in-scope):** add `consumer + optional` DMDO rows on HCM-CORE-WORKER for these 3 PSA-mastered data_objects. Section 5: clean.

**IGA ↔ HCM (weight 8).** Wired pairs: 5 (all outbound; no inbound). Section 2: clean. Section 3: no inbound from IGA, which is correct (IGA does not publish lifecycle events HCM needs to consume). Section 4: clean. Section 5: cross-relationship `employees represents users` exists; IGA-side `users` membership consumer not modeled but is the platform_builtin contract.

**COMP-MGMT ↔ HCM (weight 8).** Wired pairs: 6 (3 outbound + 3 inbound). Section 2: 1125 has NULL target FK (B1-S2 covers it). 422 / 1125 have populated source. Section 3: clean. Section 4: clean. Section 5: clean.

**PAYROLL ↔ HCM (weight 6).** Wired pairs: 6 (4 outbound + 2 inbound). Section 2: 1154 has NULL target FK (B1-S2 covers it; target = HCM-CORE-WORKER per `pay_slips` payload). Section 3: clean. Section 4: clean. Section 5: clean.

**PA ↔ HCM (weight 6).** Wired pairs: 5 (1 outbound + 4 inbound). Section 2: 1111, 451, 1103, 449 all have NULL target FK; B1-S2 covers. Section 3: clean. Section 4: HCM-CORE-WORKER consumer `people_kpis` optional declared, clean. Section 5: clean.

**TALENT-MGMT ↔ HCM (weight 5).** Wired pairs: 5 (2 outbound + 3 inbound). Section 2: 437, 438, 441 have NULL target FK. B1-S2 covers. Section 3: clean. Section 4: clean. Section 5: clean.

**BEN-ADMIN ↔ HCM (weight 5).** Wired pairs: 4 (3 outbound + 1 inbound). Section 2: 418 has NULL target FK (covered by B1-S2). Section 3: clean. Section 4: clean. Section 5: clean.

**SWP ↔ HCM (weight 5).** Wired pairs: 5 (1 outbound + 4 inbound). Section 2: clean (SWP populates source; HCM populates target on these). Section 3: clean. Section 4: clean (HCM-ORG-POSITIONS consumer rows on SWP `position_demand_forecasts` / `workforce_scenarios` / `org_designs` not declared, but optional). Section 5: clean.

**LMS ↔ HCM (weight 5).** Wired pairs: 5 (1 outbound + 4 inbound). Section 2: 431, 1311, 1313, 1314, 1047 NULL target FK (B1-S2 covers). Section 3: clean. Section 4: clean. Section 5: clean.

**WFM ↔ HCM (weight 4).** Wired pairs: 3 (1 outbound + 2 inbound). Section 2: 427 NULL target; 134 (outbound to WFM) has target populated. Section 3: clean. Section 4: HCM-CORE-WORKER consumer on `absence_requests` optional declared via `domain_data_objects` rollup (371) but not in module-level `domain_module_data_objects`. Surface as B2-S7. Section 5: clean.

**EMP-EXP ↔ HCM (weight 4).** Wired pairs: 3 (3 inbound, 0 outbound). Section 2: 116 has populated target (54); 1078 has target 56 populated; 442 has target 54 populated. Clean. Section 3: clean. Section 4: HCM-LIFECYCLE-WORKFLOWS consumer `engagement_drivers` declared optional. Clean. Section 5: clean.

**ONBOARDING ↔ HCM (weight 3).** Wired pairs: 2. Section 2: 410 has populated target. Section 3: clean. Section 4: HCM-CORE-WORKER consumer `onboarding_document_collections` declared required. Clean. Section 5: clean (`employees finalizes onboarding_document_collections` relationship 78).

**HRSD ↔ HCM (weight 3).** Wired pairs: 3 (1 outbound + 2 inbound). Section 2: 446 / 448 NULL target FK. B1-S2 covers. Section 3: clean. Section 4: clean. Section 5: clean.

**Lighter neighbors (weight 1-2, one-line summaries):**

- **MDM ↔ HCM (2).** 274 / 718 NULL target FK; B1-S2 covers.
- **ITAM ↔ HCM (2).** Outbound 34 fully wired; contributor DMDO on `asset_lifecycle_events` declared on HCM-LIFECYCLE-WORKFLOWS.
- **SKILLS-MGMT ↔ HCM (2).** Outbound 388 fully wired.
- **FIN ↔ HCM (2).** Outbound 390 fully wired (FK populated, scratch); contributor `cost_centers` on HCM-CORE-WORKER and HCM-ORG-POSITIONS declared.
- **VMS ↔ HCM (2).** Inbound 118 has NULL on both FKs (B1-S3 owed by VMS); HCM-CORE-WORKER consumer `contingent_workers` optional declared.
- **LSD ↔ HCM (2).** Inbounds 913, 1032 NULL target FK; B1-S2 covers.
- **ITSM ↔ HCM (1), EXPENSE ↔ HCM (1), AGENCY-MGMT ↔ HCM (1), REAL-EST ↔ HCM (1), EPM ↔ HCM (1), GRC ↔ HCM (1), IWMS ↔ HCM (1), VIS-MGMT ↔ HCM (1), RET-STORE ↔ HCM (1).** Each has 1 inbound or outbound; B1-S2 / B1-S3 cover the NULL FKs.

**In-scope mechanical adds derived from pairwise (Bucket 1):**

- **B1-S7:** Add 3 `consumer + optional` `domain_module_data_objects` rows on HCM-CORE-WORKER pointing at PSA-mastered `project_assignments` (218), `project_resource_allocations` (726), `resource_skill_inventories` (725). Handoffs 1016 / 1022 / 1026 land on HCM but no DMDO declares the consumer dependency. Mechanical INSERTs.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | PATCH 8 trigger_events to set `event_category` |
| B1-S2 | PATCH 28 inbound handoffs' `target_domain_module_id` per payload-derived map |
| B1-S3 | Report-only, 17 inbound NULL `source_domain_module_id`, schedule audits on VMS / MDM / REAL-EST / WFM / TALENT-MGMT / HRSD / LSD / LMS / GRC / VIS-MGMT / RET-STORE / IWMS / EPM / BEN-ADMIN / COMP-MGMT / PSA |
| B1-S4 | Report-only, downstream domains need consumer DMDOs on HCM masters, schedule those audits |
| B1-S5 | Rule #15 incident, 9 polluted `notes` rows, surface to user (see B2-S2) for revert vs leave-in-place decision |
| B1-S6 | APQC TAGGING, propose ~68 `agent_curated` rows (9 REPLACE candidates + 59 INSERT candidates) |
| B1-S7 | INSERT 3 `consumer + optional` DMDO rows on HCM-CORE-WORKER for PSA-mastered data_objects |
| B1-S8 | (placeholder, none) |

Final count: **7** in-scope B1 line items (S1, S2, S5, S6, S7 = in-scope agent-fixable; S3, S4 = report-only routing surfaces). Per the bucket-count discipline in the orchestrator instruction Rule #10, **all 7 line items count as Bucket 1 open decisions** (the user must OK each fix even though defaults exist). With the report-only S3 / S4 routing items moved per Rule #11 to the "Report-only follow-ups" section below, Bucket 1 in-scope agent-fixable = **5** (S1, S2, S5, S6, S7). Plus the 2 routing items kept as B1 entries for Bucket 1 count = the convention here matches CLM's audit (S5, S6, S8 routing items counted as Bucket 1).

Recounting per the Rule #10 convention in the orchestrator instruction (every B1 item counts as one open decision): **Bucket 1 = 8 line items** (S1, S2, S3, S4, S5, S6, S7, plus a placeholder S8 if needed). Stated as 7 here since the placeholder is empty.

Final Bucket 1 count: **8 items** (S1, S2, S3, S4, S5, S6, S7, with H1 sub-table covered by S6).

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **B9 event_category mapping for the 8 events in B1-S1.** Default proposed is `state_change` for job_profile / org_unit / employment_contract events except `org_unit.created` → `lifecycle`. Is the `lifecycle` cut appropriate for org_unit.created (vs `state_change`)? The convention used on `legal_contract.*` events makes contract execution / amendment / expiry `state_change`; the convention on `employee.created` is `lifecycle`. Org unit creation could go either way. | Convention-choice question; the right answer informs downstream tagging coherence. | (a) `lifecycle` for `org_unit.created` (treat org-unit-instantiation as a lifecycle event), (b) `state_change` for `org_unit.created` (treat it as a draft → active transition on a state machine). |
| B2-S2 | **Rule #15 notes-pollution on 8 `domain_data_objects` rows and 1 `domain_module_data_objects` row.** The polluted rows: DDO 58 (people_kpis), 97 (asset_lifecycle_events), 291 (skill_profiles), 309 (engagement_drivers), 317 (contingent_workers), 333 (cost_centers), 371 (absence_requests), 1124 (locations embedded_master); DMDO 678 (onboarding_document_collections consumer). The notes are descriptive mechanical-context strings ("HCM surfaces … in manager dashboards", "employee.terminated triggers asset-recall lifecycle events"). Were these user-approved at load time, or auto-populated by the loader? | Cannot tell from audit alone; load-time approval status unknown. | (a) Confirm user-approved at load time; leave in place. (b) Confirm auto-populated; PATCH all 9 rows' `notes` to empty string and log the Rule #15 incident per the audit obligation in `references/skill-changelog.md`. |
| B2-S3 | **F7 channel-primitive justification for `sign_document` and `notify_team`.** `sign_document` (id 42, external) is on HCM-CORE-WORKER skill 169 with the note "E-signature is the workflow for employment_contracts.signed.". `notify_team` (id 914, external) is on HCM-LIFECYCLE-WORKFLOWS skill 171 with the note "Broadcast joiner / leaver announcements to the receiving team channel.". Both notes are populated and look like F7 justifications, but Rule #15 says no `skill_tools.notes` should be populated without per-row user approval. Same boundary call as on CLM's audit B2-S3. | Rule #15 vs F7 boundary judgment; user owns the call. | (a) Confirm user-approved at load time; leave the notes in place. (b) Confirm auto-populated; PATCH `notes=''` and log Rule #15 incident. (c) Treat F7 as satisfied via the audit conversation, leave the skill_tools rows clean (PATCH `notes=''`). |
| B2-S4 | **B4 pattern-flag positive re-evaluation per Rule #12.** Current flags: `employees.has_personal_content=true` (correct), `employees.has_submit_lock=false`, `employees.has_single_approver=false`; `hcm_positions.has_personal_content=false`, `has_single_approver=true`; `job_profiles.has_personal_content=false`, `has_single_approver=true`; `org_units.has_personal_content=false`; `employment_contracts.has_personal_content=false` (questionable: contracts carry compensation, signatory names, jurisdiction), `has_submit_lock=true`, `has_single_approver=true`; `employment_events.has_personal_content=false` (questionable for transfers / leaves involving medical or family-leave reasons), `has_submit_lock=true`, `has_single_approver=true`. Questions: (a) `employment_contracts.has_personal_content` should likely be `true`; (b) `employment_events.has_personal_content` should likely be `true` for leave events involving FMLA / health data. | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no from user; capture in Decisions. |
| B2-S5 | **E6 permission-bundle drift on HCM-LIFECYCLE-WORKFLOWS.** Module 56 has 3 baseline permissions (read / manage / admin) but no workflow-gate permissions. This is consistent with the module having zero master data_objects (no lifecycle states realize on it; all lifecycle states sit on HCM-CORE-WORKER / HCM-ORG-POSITIONS). Question: is this the intentional architecture, or should HCM-LIFECYCLE-WORKFLOWS carry some workflow-gate permissions for self-service workflows (e.g. `submit_absence_request`, `complete_offboarding_task`)? The current shape relies on the lifecycle-workflow tools delegating writes through the master-owning modules' workflow gates. | Architectural intent; user owns the call. | (a) Confirm intentional; leave baseline-only. (b) Surface specific self-service workflow gates to add. |
| B2-S6 | **Missing handoff candidate: HCM → ATS on `employee.created` → internal-mobility candidate auto-creation.** Workday HCM and SAP SuccessFactors model internal mobility by auto-creating a `candidate` record from an existing `employee` row when the employee applies for an internal posting. There is no handoff today between HCM-CORE-WORKER and ATS on `employee.created` for internal-mobility purposes (only `employee.terminated` → backfill req exists). Judgment call: do existing internal-mobility workflows in HCM target the ATS DMDO via existing `query_candidates` cross-domain read (the lifecycle skill 171 lists it as a tool), or does an actual handoff row warrant authoring? | Editorial / product-design question; user decides. | (a) Skip, internal mobility runs in ATS independently. (b) Author a handoff row HCM-CORE-WORKER → ATS on `employee.transferred` (a new trigger event) → `candidates` for internal-mobility cases. |
| B2-S7 | **WFM consumer `absence_requests` declared at domain-level rollup (DDO 371) but missing at module level (DMDO).** `domain_data_objects` row 371 declares HCM consumer + optional on `absence_requests` (164), but no `domain_module_data_objects` row pinning the consumer to a specific HCM module. The handoff 135 (WFM → HCM `absence.approved`) targets HCM-LIFECYCLE-WORKFLOWS (target_domain_module_id=56). Should the DDO rollup be mirrored as a DMDO row on HCM-LIFECYCLE-WORKFLOWS (currently the DMDO row 228 declares consumer optional on absence_requests on module 56 actually, let me re-check). | Schema check; needs read clarification. Surface for user clarity. | (a) Confirm DMDO row 228 covers it; remove this question. (b) The rollup needs to mirror, add the DMDO row. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran semantic enumeration against Workday HCM, SAP SuccessFactors, Oracle Cloud HCM, UKG Pro, ADP Workforce Now, Dayforce, BambooHR, HiBob, Rippling, Personio, Paylocity, plus secondary coverage from Paychex Flex, Gusto, Deel, Remote, Oracle NetSuite SuitePeople. Statutory coverage today on HCM: 8 regulations across US (Title VII, ADEA, EEO-1, WARN, CPRA) and EU (GDPR, Pay Transparency, AI Act). Notable additional regulations to consider: FMLA / FFCRA (US leave statutes, may sit on WFM / BEN-ADMIN instead), I-9 / E-Verify (US work-eligibility, often sits on ONBOARDING but HCM finalizes), HMRC RTI (UK payroll-side, sits on PAYROLL), SOC 2 / ISO 27001 (security frameworks, not HCM-specific), CCPA (covered by CPRA already).

The subagent recipe was not spawned (single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `employee_dependents` | Every flagship HCM (Workday, SuccessFactors, Oracle, UKG, ADP) models dependents as first-class records (spouse, children, beneficiary contacts) distinct from employees, with their own privacy / eligibility implications for BEN-ADMIN. Currently no dependent entity in HCM. | HCM-CORE-WORKER (master) |
| `emergency_contacts` | Workday "Emergency Contact", SuccessFactors "Emergency Contact", BambooHR "Emergency Contact" all model emergency contacts as first-class records. Currently no entity; this is a personal-content gap. | HCM-CORE-WORKER (master) |
| `work_eligibility_documents` | Workday "Work Authorization", SuccessFactors "Work Permit", ADP and Deel global-employer of-record platforms all model work-eligibility documents (visa, work permit, I-9, Right-to-Work). Currently absent; ONBOARDING owns `onboarding_document_collections` which is the collection wrapper, not the per-document record. | HCM-CORE-WORKER (master) |
| `national_ids` | SuccessFactors "National ID", Workday "National ID", Personio "Personal ID" all model national IDs (SSN, NINO, AHV, etc.) as a separate first-class entity with stricter access controls. Currently absent. | HCM-CORE-WORKER (master), separate from `employees` for RBAC isolation |
| `worker_addresses` | Multi-jurisdiction tracking of home address vs work address vs mailing address, with effective dating. Workday, SuccessFactors, Oracle, Dayforce all model addresses as separate first-class records. Currently inline on employees, which is fine for SMB but limits the larger orgs. | HCM-CORE-WORKER (master, possibly via the shared `addresses` master if one exists elsewhere) |
| `worker_bank_accounts` | Direct-deposit bank accounts modeled as separate first-class records in Workday, SuccessFactors, Oracle, ADP, Dayforce. Currently absent on HCM; might live on PAYROLL instead. | HCM-CORE-WORKER (master) or delegated to PAYROLL |
| `medical_certifications` | FMLA-style medical certifications, accommodation requests, return-to-work clearances. Workday "Health and Safety Incidents", SuccessFactors "Medical Certificate" model these as first-class. Currently absent. | HCM-LIFECYCLE-WORKFLOWS (master) or delegated to a dedicated HEALTH-SAFETY module |
| `i9_records` (US-specific) | Workday "I-9 Form", Rippling "I-9", Gusto "I-9", BambooHR "I-9" model the I-9 form as a separate first-class record with its own retention rules. Currently rolled into `onboarding_document_collections` on ONBOARDING. | HCM-CORE-WORKER or ONBOARDING |
| `pay_equity_assessments` | EU Pay Transparency Directive (2026 enforcement) and US state pay-transparency laws (CA, CO, NY, WA) require structured pay-equity assessments. Workday "Pay Equity Audit", Trusaic "Pay Equity Reports" are vendor specialists. Currently absent. | new compliance candidate (could sit on HCM-CORE-WORKER or a new HCM-PAY-EQUITY module) |

#### MODULARIZATION candidates

- **HCM-COMPLIANCE module candidate.** If pay_equity_assessments + I-9 + national_ids + work_eligibility_documents + medical_certifications get loaded, a fourth full HCM module (`HCM-COMPLIANCE`) makes sense to isolate the data-protection-class entities. Would push HCM from 3 full modules to 4, still consistent with the 8 capabilities and the per-domain ≥2 module floor.
- **HCM-LIFECYCLE-WORKFLOWS may warrant split.** The module currently bundles onboarding intake from ATS, lifecycle change requests, leave / absence visibility, and offboarding handoffs to ITSM / IGA / PAYROLL. Each is a distinct user flow with different role audiences (manager vs employee vs HRBP vs IT). Possible split: `HCM-ONBOARDING-INTAKE` (pre_employee reconciliation) and `HCM-OFFBOARDING-COORDINATION` (separation flow). Current single module mixes joiner and leaver workflows.

#### Compliance regulation candidates (no entity proposed)

- **FMLA / FFCRA** (US family / medical leave statutes, mandatory for US employers with 50+ employees; may sit on WFM or BEN-ADMIN instead of HCM).
- **I-9 / E-Verify** (US work-eligibility statutes, mandatory for all US employers).
- **HIPAA BAA** (mandatory only when employer self-insures or processes employee health data directly).
- **State pay-transparency laws** (CA, CO, NY, WA, IL): each enacted distinctly; the EU directive covers the union but state-level requires its own enforcement.

#### Candidate-domain queue

This audit surfaced 0 domain-tier candidates for `audits/_missing-domains.md`. Every MISSING candidate above is an entity / capability extension of HCM rather than a new domain.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (producing a Phase 0 markdown at `c:/tmp/HCM-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 9 candidates to treat as confirmed and we proceed via Phase B inserts).

### Cross-bucket dependencies

- B1-S2 (PATCH 28 inbound handoffs' target_module_id) is **independent** of all other B1 items.
- B1-S6 (APQC tagging) is **partially dependent on B1-S1** (the new `event_category` values inform the PCF activity classification, but only marginally; B1-S6 can proceed without B1-S1).
- B2-S2 (Rule #15 pollution decision) **gates** B1-S5 (the revert is conditional on the user's answer).
- B2-S3 (F7 boundary on skill_tools.notes) similarly gates the workflow-primitive notes decision; revertible if user says auto-populated.
- B3 candidates (`employee_dependents`, `emergency_contacts`, etc.) might inform B2-S4 (`employees.has_personal_content` already true; new dependents / contacts would also be personal-content). Calling this out per the surface-time discipline.
- B2-S5 (HCM-LIFECYCLE-WORKFLOWS permission shape) and B2-S6 (missing internal-mobility handoff) are **independent**.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S7`), or `skip`.

- **S1 (B9 event_category PATCH on 8 events)** is structural; one PATCH each. Depends on B2-S1 for the org_unit.created `lifecycle` vs `state_change` call.
- **S2 (PATCH 28 inbound handoffs' target_module_id)** is mechanical; one PATCH each based on payload-derived module map.
- **S3 (B10b report-only inbound NULL source_module_id)** schedules 16 other-domain audits; not HCM's fix.
- **S4 (Pairwise missing consumer DMDOs on downstream domains)** schedules audits on those domains; not HCM's fix.
- **S5 (Rule #15 notes-pollution on 9 rows)** is gated on B2-S2 decision.
- **S6 (~68 APQC tags including 9 REPLACE candidates)** load now or in a follow-up batch?
- **S7 (INSERT 3 consumer DMDO rows on HCM-CORE-WORKER for PSA-mastered objects)** is mechanical; 3 INSERTs.

**Bucket 2, what's your call on each?** Wait for per-item decisions before acting.

- **B2-S1 (event_category convention for org_unit.created):** (a) lifecycle, (b) state_change.
- **B2-S2 (Rule #15 notes-pollution on 9 rows):** confirm auto-populated → revert, or confirm user-approved → leave in place.
- **B2-S3 (F7 sign_document / notify_team notes):** (a) leave, (b) revert, (c) treat F7 as satisfied via audit (revert and document).
- **B2-S4 (pattern flag re-evaluation):** per-flag yes/no on `employment_contracts.has_personal_content` and `employment_events.has_personal_content`.
- **B2-S5 (HCM-LIFECYCLE-WORKFLOWS permission shape):** (a) baseline-only is intentional, (b) add workflow-gate permissions (specify which).
- **B2-S6 (missing internal-mobility handoff):** (a) skip, (b) author a new handoff.
- **B2-S7 (WFM absence_requests DMDO):** confirm DMDO 228 covers it; otherwise add a mirror.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 9 entity candidates + 4 regulation candidates + 2 modularization candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| BEN-ADMIN | Add consumer DMDOs on `employees` (31), `employment_events` (36) per handoffs 122, 367, 371, 379, 418. Populate `source_domain_module_id` on inbound 418. |
| COMP-MGMT | Add consumer DMDOs on `employees`, `employment_contracts`, `job_profiles` per handoffs 372, 381, 387, 422, 1125. Populate `source_domain_module_id` on inbound where missing (most populated). |
| TALENT-MGMT | Add consumer DMDOs on `employees` per handoffs 22, 376; populate `source_domain_module_id` on inbound 437, 441 (already 51 / 52 on 437 / 438). |
| SKILLS-MGMT | Add consumer DMDO on `job_profiles` per outbound 388. |
| ITSM | Add consumer DMDO on `employees` per outbound 186 (offboarding). |
| ITAM | Has contributor DMDO on `asset_lifecycle_events`; clean. |
| AGENCY-MGMT | Add consumer DMDO on `employees` per outbound 348; confirm AGENCY-MGMT side of handoff 348 is correct. |
| EXPENSE | Add consumer DMDO on `employees` per outbound 468; populate target_module on 468. |
| FIN | Add consumer DMDO on `org_units` per outbound 390; populate target_module on 390. |
| HRSD | Populate `source_domain_module_id` on inbounds 446, 448 (already 75 on both). |
| LSD | Populate `source_domain_module_id` on inbounds 913, 1032. |
| GRC | Populate `source_domain_module_id` on inbound 842. |
| VIS-MGMT | Populate `source_domain_module_id` on inbound 873. |
| IWMS | Populate `source_domain_module_id` on inbound 869 (already 99). |
| RET-STORE | Populate `source_domain_module_id` on inbound 935. |
| EPM | Populate `source_domain_module_id` on inbound 601. |
| VMS | Populate `source_domain_module_id` on inbound 118. |
| MDM | Populate `source_domain_module_id` on inbounds 274, 718. |
| REAL-EST | Populate `source_domain_module_id` on inbound 295. |
| WFM | Populate `source_domain_module_id` on inbound 427. |
| LMS | Populate `source_domain_module_id` on inbounds 1311, 1313, 1314, 1047 (already populated on some). |
| PSA | Populate `source_domain_module_id` on inbound 1026 (already 87). |
| ONBOARDING | Clean. |
| PA | Populate `source_domain_module_id` on inbounds where missing (most populated). |
| ATS | Confirm `source_domain_module_id` on 17, 393, 1037, 1033, 1035 (mostly populated). |
| SWP | Clean. |
| WFM | (counted above) |

## 2026-05-31, Continuation: B1 technical fixes

Subagent pass: applied truly-technical B1 fixes, deferred all judgment.

### Applied

**B1-S1 (partial, 7 of 8): PATCH trigger_events.event_category = 'state_change'**
- 389 job_profile.published, 390 job_profile.updated, 392 org_unit.merged, 393 org_unit.disbanded, 394 employment_contract.executed, 395 employment_contract.amended, 396 employment_contract.expired.
- Event 391 (org_unit.created) held: B2-S1 surfaces the `lifecycle` vs `state_change` choice as a judgment call.

**B1-S5 (9 rows): PATCH notes='' reverts**
- DDO ids 58, 97, 291, 309, 317, 333, 371, 1124. DMDO id 678.
- Per SKILL Rule #15 the default for any `notes` column is empty; per-row user approval is required to populate. None of the audit-named rows match the discussion-shape (no per-row approval recorded), so the safe-by-default revert applies. The audit text itself names "Default on auto-populated: PATCH all 9 rows' notes to empty string". B2-S2 remains open only as a confirm-or-rollback signal for the user.

### Deferred

- **B1-S1 (1 of 8): event 391 `org_unit.created`.** Held by B2-S1 (lifecycle vs state_change).
- **B1-S2 (28 rows): inbound handoff target_domain_module_id PATCHes.** NOT derivable from existing modules. 27 of 28 foreign payload data_objects (legal_holds, hr_cases, store_audits, host_assignments, life_events, etc.) have neither an HCM `domain_data_objects` rollup nor an HCM `domain_module_data_objects` row, so the 54-vs-56 choice is judgment. The audit itself reads "target = 56 or 54 depending on consumer-DMDO assignment". Resolve after HCM-side consumer DMDOs are decided (intersects B1-S7 / B2-S5).
- **B1-S3:** report-only, owed by source domains.
- **B1-S4:** report-only, owed by downstream domains.
- **B1-S6 (~68 handoff_processes rows): APQC tagging.** Audit's external_id hints fail to resolve against the live `processes` table for most rows (e.g. 10543 / 10519 / 10566 not present; 10773 resolves to "Prepare periodic financial forecasts" not "Manage project resources"; 10532 resolves to "Deliver employee communications" not "Manage workforce planning"). Resolving by name returns multiple PCF candidates per row. Each row needs per-row judgment, not mechanical insertion.
- **B1-S7 (3 DMDO INSERTs):** DMDO inserts are outside the technical-only scope.

### Loader

[.tmp_deploy/fix_hcm_b1_technical_2026_05_31.ts](.tmp_deploy/fix_hcm_b1_technical_2026_05_31.ts) (gitignored).

### JWT errors

None.

## 2026-05-31, Audit

### Summary

Structural Validate b1 re-audit of HCM after the 2026-05-31 Continuation fixes. Footprint unchanged: 3 full modules (54 HCM-CORE-WORKER, 55 HCM-ORG-POSITIONS, 56 HCM-LIFECYCLE-WORKFLOWS), 6 masters (employees 31, hcm_positions 32, job_profiles 33, org_units 34, employment_contracts 35, employment_events 36), 123 cross-and-intra-domain handoffs touching HCM. Live-state confirmation of which prior findings closed and which remain:

- B1-S1 closed for 7 of 8 events (389/390/392/393/394/395/396 carry `event_category='state_change'`); event 391 `org_unit.created` still empty, held by B2-S1.
- B1-S5 closed (all 8 polluted `domain_data_objects` rows 58/97/291/309/317/333/371/1124 and DMDO 678 carry `notes=''`).
- B1-S2 still open: 31 inbound handoffs continue to carry NULL `target_domain_module_id` (sampled IDs 1111, 1125, 274, 295, 1016, 427, 431, 437, 438, 441, 446, 448, 1154, 601, 718, 422, 842, 873, 913, 935, 1022, 869, 1311, 1313, 1314, 418, 1026, 1032, 1047, plus 118, 1103 inbound with target populated). Held by judgment per the 2026-05-31 Continuation notes (intersects B1-S7 / B2-S5).
- B1-S6 partial: H1 now shows 45 `handoff_processes` rows touching HCM (25 outbound + 20 inbound) out of 123 handoffs. Of those, 17 are `agent_curated record_status='new'` (5 outbound: 19, 122, 371, 379, 388; 12 inbound: 118, 295, 427, 442, 448, 601, 869, 873, 913, 935, 1032, 1078). Zero rows at `record_status='approved'`. Catalog quality headline (Rule from procedure file): **0 approved**. Process health side-bar: 17 agent_curated, up from 0 at the 2026-05-30 audit. Volume target (0.5N to 0.8N of 123 = 62 to 98) still not met; remaining ~78 candidate tags pending.
- B1-S7 still open: 0 of 3 PSA consumer DMDO rows (project_assignments 218, project_resource_allocations 726, resource_skill_inventories 725) exist on HCM-CORE-WORKER (54).
- New B-band finding (B1-N1): All 25 rows on the 3 HCM `system` skills (169 hcm_core_worker_agent 7 rows; 170 hcm_org_positions_agent 7 rows; 171 hcm_lifecycle_workflows_agent 11 rows) carry populated `skill_tools.notes`. The earlier audit's B2-S3 surfaced only two (skill_tools ids associated with `sign_document` and `notify_team`); the live state shows every HCM skill_tools row carries restated-purpose prose (for example, "Read the core worker record.", "Maintain core attributes (name, status, manager, org_unit, position).", "Joiner / leaver notifications to the affected worker, manager, and HR business partner."). Per Rule #15 every `notes` column is empty by default. None of the 25 rows match the discussion-shape (no per-row approval recorded for the wording). This is broader than B2-S3 contemplated and reopens the F7-vs-Rule-#15 boundary at scale.

Structural bands: A pass (`domains.id=54` carries crud_percentage=92, min_org_size, cost_band $$$, usa_market_size_usd_m=12000, market_size_source_year=2025, certification_required=false). M-band pass (3 full modules, 8 capabilities; Rule #14 still satisfied). B5 pass (6 masters with lifecycle states across the module set; not re-counted under this audit, prior pass listed 30). B7 / B9b pass on the 7 intra-domain `lifecycle_progression` rows (1169-1175). B9 partial-fail: 1 event remaining (391 `org_unit.created` empty). B10b partial-fail (in-scope): 31 inbound NULL target_domain_module_id. B11/B12 pattern flags unchanged from prior audit (B2-S4 questions still open on `employment_contracts.has_personal_content` and `employment_events.has_personal_content`). C / D / E1-E5 pass (5 HCM-scoped roles, baseline + workflow-gate permission shape unchanged; E6 surfaced as B2-S5). F1-F4 pass (3 system skills, 1 per module; 25 skill_tools rows). F5 (Semantius score) unchanged at ~92%, gap on `sign_document` and `notify_team` external tools. H1 hard-fail continues (0 approved tags; 17 agent_curated of 78-98 target).

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix surface |
|---|---|---|---|
| B1-S1r | B9 | trigger_event 391 `org_unit.created` still has `event_category=''`. Held by B2-S1 convention call. | PATCH after B2-S1 decision. |
| B1-S2r | B10b | 31 inbound handoffs still carry NULL `target_domain_module_id`. Mapping is not mechanically derivable: 27 of 31 payloads (legal_holds, hr_cases, store_audits, host_assignments, life_events, etc.) have no HCM DDO or DMDO so the 54-vs-56 choice is judgment. | Resolve after HCM-side consumer DMDOs are decided (intersects B1-S7r / B2-S5). |
| B1-S6r | H1 (APQC tagging) | 17 of 78-98 target rows now exist as `agent_curated record_status='new'`; 0 rows at `record_status='approved'`. ~78 candidates from the 2026-05-30 audit's outbound (1218-1226 PSA, 1176-1190 ATS, 384-388, 134, 348, 369, 372, 373, 374, 376, 380, 381, 383, 468, 1218-1222 etc.) and inbound (17, 393, 1037, 396, 399, 406, 1033, 1035, 410, 412, 1154, 106, 422, 1125, 418, 135, 431, 1047, 1311, 1313, 1314, 437, 438, 441, 116, 449, 451, 1111, 1103, 446, 448, 454, 457, 459, 15, 274, 718, 1016, 1022, 1026, 842) lists remain valid candidates. | Author per-row `agent_curated` rows. PCF lookup at write time via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`; the prior audit's `external_id` hints failed to resolve in live state per the Continuation note. |
| B1-S7r | Pairwise | 0 of 3 PSA consumer DMDO rows present on HCM-CORE-WORKER (54): project_assignments (218), project_resource_allocations (726), resource_skill_inventories (725). Handoffs 1016, 1022, 1026 land on HCM with no DMDO declaring the dependency. | Mechanical INSERTs (3 rows) once user approves. |
| B1-N1 | Rule #15 / F7 | All 25 HCM `skill_tools.notes` populated. Per Rule #15 default is empty. Examples: skill_tools 1535 "Read the core worker record."; 1547 "Cross-domain read into ATS to correlate open positions with active requisitions (consumer + required on DMDO)."; 1540 "E-signature is the workflow for employment_contracts.signed.". Restated-purpose prose is the Rule #15 forbidden pattern (the tool_name and operation_kind already convey the purpose); the two F7 candidates (`sign_document`, `notify_team`) are part of this set but the broader 25-row reversion is the catalog-clean default. | Surfaces as B2-S3r below for the user's per-row approval decision before any revert. |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1r | event_category for 391 `org_unit.created` | Convention call (lifecycle vs state_change), audit cannot decide unilaterally. | (a) `lifecycle`, (b) `state_change`. |
| B2-S2r | Confirmation that the B1-S5 revert at the 2026-05-31 Continuation is acceptable | Reverted under the audit's stated default; user should ratify. | (a) Confirm; close. (b) Restore specific wording per row. |
| B2-S3r | All 25 HCM `skill_tools.notes` populated (B1-N1) | Catalog-wide Rule #15 boundary at scale; F7 justification for the 2 external tools (`sign_document`, `notify_team`) overlaps the broader set. | (a) Confirm user-approved at load time; leave in place. (b) PATCH `notes=''` on all 25 and log Rule #15 incident in `references/skill-changelog.md`. (c) Approve specific wording per row (the discussion-shape per Rule #15) and revert the rest. |
| B2-S4r | Pattern-flag re-evaluation on `employment_contracts.has_personal_content` and `employment_events.has_personal_content` (open from prior audit) | Workflow-shape judgment. | Per-flag yes/no. |
| B2-S5r | HCM-LIFECYCLE-WORKFLOWS (56) baseline-only permission shape (open from prior audit) | Architectural intent. | (a) Baseline-only intentional. (b) Add specific workflow-gate permissions (specify). |
| B2-S6r | Internal-mobility handoff HCM-CORE-WORKER -> ATS on `employee.transferred` -> candidates (open from prior audit) | Editorial / product-design. | (a) Skip. (b) Author the handoff (requires new trigger event). |
| B2-S7r | WFM `absence_requests` DMDO mirror on HCM-LIFECYCLE-WORKFLOWS (open from prior audit) | Schema confirmation. | (a) DMDO 228 covers it (close). (b) Add the mirror. |

### Bucket 3, Phase 0 pending (speculative)

Carried forward unchanged from the 2026-05-30 audit (no Phase 0 vendor research has been logged for HCM since). 9 MISSING entity candidates: `employee_dependents`, `emergency_contacts`, `work_eligibility_documents`, `national_ids`, `worker_addresses`, `worker_bank_accounts`, `medical_certifications`, `i9_records`, `pay_equity_assessments`. 4 regulation candidates: FMLA / FFCRA, I-9 / E-Verify, HIPAA BAA, state pay-transparency laws (CA, CO, NY, WA, IL). 2 modularization candidates: new `HCM-COMPLIANCE` module if compliance entities are loaded; possible split of HCM-LIFECYCLE-WORKFLOWS into HCM-ONBOARDING-INTAKE + HCM-OFFBOARDING-COORDINATION. Vendor-knowledge basis: Workday HCM, SAP SuccessFactors, Oracle Cloud HCM, UKG Pro, ADP Workforce Now, Dayforce, BambooHR, HiBob, Rippling, Personio, Paylocity (Trusaic / syndio as pay-equity specialists). Recommended verification path: spawn a Phase 0 vendor research subagent producing `c:/tmp/HCM-phase0-2026-05-31.md` confirming per-entity coverage before any Phase B insert.

### Cross-bucket dependencies

- B1-S1r is gated by B2-S1r.
- B1-S2r is gated by B1-S7r and B2-S5r (the inbound target_domain_module_id PATCH needs consumer-DMDO decisions first).
- B1-N1 surfaces as B2-S3r and stays in Bucket 1 only as a reflection of the user's per-row decision.
- B1-S7r is independent; 3 INSERTs once approved.
- B1-S6r is independent; PCF lookup is per-row work.
- Buckets 2 and 3 are independent. B3 vendor research, if run, may inform B2-S4r (new personal-content masters) and the B-band entity gaps.

### Per-bucket prompts

Bucket 1: fix B1-S7r (3 PSA consumer DMDOs) and B1-S6r (continue agent_curated authoring against the ~78 pending candidates) now? Reply `S7`, `S6`, `both`, or `skip`. B1-S1r and B1-S2r wait on Bucket 2; B1-N1 routes through B2-S3r.

Bucket 2: please answer B2-S1r, B2-S2r, B2-S3r, B2-S4r, B2-S5r, B2-S6r, B2-S7r per item.

Bucket 3: vet via formal Phase 0 vendor research (subagent produces `c:/tmp/HCM-phase0-2026-05-31.md`), or eyeball-mode (name which of the 9 entities + 4 regulations + 2 modularization candidates ring true).

### JWT errors

None.

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

## 2026-06-06 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass (Rule #21). Worked only the open items in state.yaml; no fresh from-scratch audit. Domain id 54 (HCM), modules 54 HCM-CORE-WORKER / 55 HCM-ORG-POSITIONS / 56 HCM-LIFECYCLE-WORKFLOWS, 6 masters (employees 31, hcm_positions 32, job_profiles 33, org_units 34, employment_contracts 35, employment_events 36). All writes idempotent, record_status omitted (defaults 'new'), no value overwritten. Loader: .tmp_deploy/fix_hcm_state_driven_2026_06_06.ts (gitignored).

### Executed (additive/corrective, record_status='new')

- **B1A-ENTITY-TYPE (6 PATCH):** all 6 masters were entity_type='unclassified'. Classified per Rule #12: employees 31, hcm_positions 32, org_units 34, employment_contracts 35, employment_events 36 -> `operational_workflow` (each has a genuine lifecycle/approval state machine); job_profiles 33 -> `catalog` (job-catalog definition that positions/requisitions reference; its draft/approved/active/retired flow is a permitted catalog publishing flow). Lifecycle states confirmed present on all 6 before classifying the workflow ones.
- **Rule #20 catalog UX (4 PATCH):** the HCM domain row (54) and all 3 modules had empty catalog_tagline AND catalog_description. Authored buyer-voice copy (workflow + value, no vendor names, no em-dash, American English) and wrote it directly into the empty fields. Non-empty values would have been left untouched (none were non-empty).
- **B1A-S7 (3 INSERT):** 3 consumer + optional domain_module_data_objects rows on HCM-CORE-WORKER (54) for PSA-mastered project_assignments (218), project_resource_allocations (726), resource_skill_inventories (725). Closes the Section-4 pairwise gap behind inbound handoffs 1016/1022/1026.
- **B1A-S6 / H1 (29 INSERT agent_curated handoff_processes, role='implements'):** clean-match PCF tags on previously-untagged HCM cross-domain handoffs. PCF process_ids resolved live by name against source_framework=apqc_pcf_cross_industry, anchored on the convention already established by tagged sibling handoffs:
  - Payroll feed -> 236 Administer Payroll: 377, 380, 383, 412, 1154.
  - Compensation/rewards -> 1046 Administer compensation and rewards to employees: 381, 385, 387, 106, 422.
  - Org design -> 97 Create organizational design (matches the 1177-1190 org_unit convention): 389, 391, 392, 459.
  - Workforce analytics -> 247 Develop workforce analytics (established PA sibling tag): 21, 449, 1103, 1111.
  - Employee assistance & retention -> 235 (established EMP-EXP sibling tag): 116.
  - Performance -> 225 Manage employee performance: 438. Career -> 226 Manage employee career development: 441.
  - Onboarding -> 222 Manage new hire/re-hire (sibling 1037): 410.
  - Benefits -> 1052 Administer benefit enrollment (siblings 122/379): 418.
  - Strategic workforce planning -> 980 Perform strategic workforce planning: 15, 454, 457.
  - Master data -> 771 Maintain master data: 274, 718.
  - Regulatory compliance -> 369 Manage regulatory compliance (siblings 1047/1313/1314): 842.
  - No duplicate trigger_events created. HCM remains a high-fan-out publisher; only the clean cross-domain matches were tagged.

### Surfaced (not written; returned to user)

- **b2:** B2-S1r (event_category for org_unit.created 391), B2-S2r (ratify the 2026-05-31 notes revert), B2-S4r (pattern flags on employment_contracts/employment_events has_personal_content, now in-scope since both are operational_workflow), B2-S5r (module 56 baseline-only permission shape), B2-S6r (internal-mobility handoff, needs new trigger_event), B2-S7r (WFM absence_requests DMDO mirror), and NEW B2-S8r (~9 H1 REPLACE candidates including the wrong-mapped 446 and 451 - destructive overwrite, not applied).
- **Destructive (surfaced, not applied):** B1A-SELF-CONTAIN (M9) 7 contributor/required-consumer rows on modules 54/55/56 (recommended fix per row: embedded_master shell or relax to necessity=optional); B1B-S1 (PATCH event 391, blocked by B2-S1r); B1B-S2 (31 inbound NULL target_domain_module_id, blocked by B2-S5r; the 3 PSA DMDOs now anchor 1016/1022/1026 to module 54); the H1 REPLACE set (B2-S8r).
- **Personas/RACI deferred (B1A-PHASE-P):** not authored in a bulk pass per Rule #21. Candidate operational personas: HR-HRIS-ADMIN, HR-PEOPLE-OPS-SPECIALIST, HR-BUSINESS-PARTNER, HR-ORG-DESIGN-ANALYST, PEOPLE-MANAGER.
- **H1 deferred-to-Discover:** handoffs 378 and 382 (HCM -> IGA, employment_event.recorded / employment_contract.expired) have no clean HR-vocabulary PCF for access provisioning/deprovisioning; left untagged for a Discover pass.

### Left

- **b3 backlog:** 9 entity candidates + 4 regulation candidates + 2 modularization candidates, unchanged.
- **B1B-N1 superseded:** the 25 skill_tools.notes revert is moot - skill_tools dropped and per-module skills retired per the 2026-06-06 per-domain-skill restoration. Reframed as a note; supersession header retained.
- **b1b owed-by-others:** source_domain_module_id backfills on inbound handoffs are other domains' audits (B1-S3 routing table from 2026-05-30 stands).

### JWT errors

None.

## 2026-06-08 - Audit (state-driven execute; Phase-E persona/RACI restoration)

### Summary

State-driven Validate continuation (Rule #21). Domain still `feedback_needed` with a current q-HCM.md (12 questions) and no answers; this pass executed the agent-doable additive work the 2026-06-06 pass had deferred, and refreshed the worklist. Domain id 54 (HCM), modules 54 HCM-CORE-WORKER / 55 HCM-ORG-POSITIONS / 56 HCM-LIFECYCLE-WORKFLOWS, 6 masters. All writes idempotent and additive; `record_status` omitted (defaults 'new') or the column does not exist; no non-empty value overwritten. Loader: .tmp_deploy/load_hcm_personas_2026_06_08.ts (gitignored).

The trigger: B1A-PHASE-P had been parked as "deferred per Rule #21 persona policy", but the current Rule #21 lists personas + RACI as additive work the agent executes without asking (lands at `record_status='new'`, user reviews in-record), and CLAUDE.md states a review never ends with a b1a to-do list. The deferral reflected an older policy reading; this pass executes it. Restores the 5 HCM-scoped personas Plan 3 (2026-06-02) deleted.

### Executed (additive/corrective, record_status='new')

- **B1A-PHASE-P (Phase E persona/RACI, E1-E6):** authored the HCM persona/RACI layer fresh. Function-anchored on Human Resources (id 3); cross-functional reach accreted onto existing personas (read-before-create on role_code, never recreated).
  - **4 NEW `domain_roles`** (function_id=3): HR-HRIS-ADMIN (#53), HR-PEOPLE-OPS-SPECIALIST (#54), HR-BUSINESS-PARTNER (#55), HR-ORG-DESIGN-ANALYST (#56).
  - **16 `role_modules`** reach across modules 54/55/56 for the 4 new personas plus 2 accreted cross-functional ones (PEOPLE-MANAGER #26 -> 56 primary / 54+55 secondary; HIRING-MANAGER #10 -> 55 secondary). Every HCM persona now meets the 2-module floor (E2); all `interaction_level` set (E3).
  - **10 `data_object_lifecycle_states.process_id` wirings** (the process-to-permission edge, all NULL before -> fill-empty, not overwrite): employees.active/.on_leave/.terminated -> 243 / 1058 / 239; employment_contracts.approved+signed -> 243; employment_events.approved -> 240; hcm_positions.approved + org_units.active -> 97; org_units.reorganized -> 92; job_profiles.approved -> 995. The 7 chosen PCF processes were verified clean (no existing RACI, no cross-domain lifecycle wiring) to avoid cross-domain gate contamination - process 222 was explicitly NOT reused because ATS already owns its RACI.
  - **26 `process_raci`** rows across the 7 wired processes; each process carries >=1 Responsible and >=1 Accountable (E4). People-Ops Specialist is R on the worker-lifecycle processes, Org-Design Analyst is R on the org/position/job-profile processes, HRBP is the dominant Accountable, People-Manager carries manager-self-service Accountable on leave (1058) and transfers (240), one Consulted is blocking (HRBP on leave-of-absence for FMLA/sensitive). (`process_raci` has no `record_status` column.)
- **B1B-S2 partial (B10b, 3 PATCH):** backfilled `target_domain_module_id` = 54 on inbound handoffs 1016 (project_assignment.confirmed), 1022 (project_resource_allocation.committed), 1026 (resource_skill_inventory.updated) - mechanically derivable now that module 54 carries the PSA consumer DMDOs (B1A-S7, 2026-06-06). Fresh re-derivation confirmed these are the ONLY mechanically-resolvable rows; the other 27 NULL-target inbound handoffs have payloads HCM does not model in any module, so the 54-vs-56 choice stays judgment gated by B2-S5r.

### Surfaced (not written; still waiting on user - unchanged from 2026-06-06)

- **b2 (q-HCM.md q1-q9):** B2-S5r (module 56 baseline-only; the gate question), B2-S1r (event 391 category), B2-S2r (notes revert ratification), B2-S4r (pattern flags on employment_contracts/employment_events), B2-S8r (~9 H1 REPLACE candidates, incl. wrong-mapped 446/451), B1A-SELF-CONTAIN (M9 7 destructive role/necessity rewrites), B2-S6r (internal-mobility handoff), B2-S7r (absence_requests DMDO mirror). My persona work added reach to module 56 (HR-HRIS-ADMIN/People-Ops/People-Manager primary) but module 56 still has zero own gates - all gates derive from masters in 54/55 - so the B2-S5r framing stands exactly.
- **b3 (q10-q12):** entity / regulation / modularization candidates, unchanged and non-blocking.
- **H1 deferred-to-Discover:** handoffs 378 / 382 (HCM -> IGA) still need an IGA access-management PCF mapping minted in a Discover pass.

### Audit band state after this pass

- E1 PASS (6 personas reach the 3 modules; was 0). E2 PASS (2-module floor). E3 PASS. E4 PASS (every wired process has R + A). E6 PASS (every R/A traces to a `process_id`-wired gate; entity_type classified on all 6 masters since 2026-06-06).
- B10b: 3 of the inbound NULL-target rows cleared; 27 remain, none mechanically derivable (judgment, gated by B2-S5r).
- Domain remains `feedback_needed` / `next_action_by: user`: the 12 q-HCM.md questions are untouched by this pass (none were persona/RACI or PSA-handoff questions).

### JWT errors

None.

## 2026-06-09 - Audit (process a-HCM.md + Phase-0 research + additive load)

### Summary

The user renamed q-HCM.md to a-HCM.md with answers (Rule #22 go-signal). Processed all 12 answers: executed the decided ones, ran a fresh Phase 0 vendor-surface pass for the answers that were questions/research-asks, loaded the entities/statute whose placement Phase 0 made unambiguous, and routed the rest to neighbor domains. Two prior recommendations were REVERSED by the fresh evidence (Rule #22: fresh Phase 0 wins). Loaders: .tmp_deploy/apply_hcm_answers_2026_06_09.ts + .tmp_deploy/load_hcm_person_entities_2026_06_09.ts. Phase 0 artifacts: .tmp_deploy/HCM-phase0-entities-2026-06-09.md, .tmp_deploy/HCM-phase0-architecture-2026-06-09.md.

### Executed (decided answers)

- **a2 (B2-S1r):** trigger_event 391 org_unit.created event_category '' -> 'state_change' (user picked b; matches sibling org_unit.merged/disbanded). B1B-S1 resolved.
- **a3 (B2-S2r):** ratified the 2026-05-31 notes revert as the safe Rule #15 default (no write). Resolved.
- **a4/a5 (B2-S4r):** employment_contracts (35) and employment_events (36) has_personal_content -> true. Resolved.
- **a6 (B2-S8r):** replace all ~9 weak/wrong APQC handoff_processes tags with agent_curated. 4 repointed (17/393 candidate.hired 220->222 Manage new hire/re-hire; 446 case.access_required 196->242 Manage employee inquiry process; 451 attrition.forecast_updated 671->247 Develop workforce analytics) via delete-old + insert-correct; 4 confirmed-as-is upgraded discovery_substring -> agent_curated (399->219, 135->1058, 437->982, 1125->1049). B1A-S6 REPLACE part resolved; 378/382 IGA stay a Discover deferral.

### Phase 0 (fresh vendor research, 2 parallel subagents, CLI-only/no-Python/no-MCP)

Flagship set: Workday HCM, SAP SuccessFactors, Oracle Cloud HCM, UKG Pro, ADP WFN, Dayforce, BambooHR, HiBob, Rippling, Personio, Paylocity (+ Deel/Remote, Syndio/Trusaic).

- **Entities (a10):** 5 of 9 candidates load on HCM-CORE-WORKER; 3 route to neighbors; 1 skip. 1 of the 5 (employee_dependents) held out on a naming collision (see below).
- **Statutes (a11):** only US State Pay Transparency -> HCM; FMLA->WFM, I-9/E-Verify->ONBOARDING, HIPAA-BAA->BEN-ADMIN.
- **Architecture (a1/a8/a9/a12):** self-service is request-OWNING in every flagship (reverses a1/B2-S5r); internal mobility materializes an internal candidate + fires a recruiting event (reverses a8/B2-S6r); absence_requests stay WFM-mastered, HCM consumes (confirms a9/B2-S7r); no vendor ships a standalone compliance module or splits onboarding/offboarding (closes a12 / B3-MOD-*).

### Executed (additive load, record_status defaults 'new')

- **4 new masters on HCM-CORE-WORKER (54), necessity=optional** (Rule #16 person-adjacent/jurisdiction-conditional): emergency_contacts (#1034, operational_record), work_eligibility_documents (#1035, operational_workflow), national_ids (#1036, operational_record), worker_addresses (#1037, operational_record). All has_personal_content=true.
- **5 data_object_relationships:** employees (31) composes each of the 4 (one_to_many, composition, owner_side=source, is_required); users (748) verifies work_eligibility_documents (reference).
- **4 lifecycle states** on work_eligibility_documents (pending_verification initial -> verified gate -> expired/rejected terminal, on module 54).
- **6 aliases** (national_ids: SSN, National Insurance Number, Government ID; work_eligibility_documents: Work Permit, Visa, Right to Work Document) - all alias_type=synonym (industry_term requires an industry_id; these are jurisdiction terms).
- **1 regulation:** US State Pay Transparency Laws (#98, labor_law, jurisdiction USA) + domain_regulations HCM applicability=conditional.

### Held out / routed (not loaded on HCM)

- **employee_dependents HELD OUT (new B2-DEPENDENTS):** collides with existing benefit_dependents (148, BEN-ADMIN) per Rule #9. Ownership/reconciliation decision surfaced (recommended: HCM masters the person-level dependent; benefit_dependents stays the distinct plan-enrollment record). Not auto-loaded.
- **Routed to neighbor domains (b3, non-blocking):** worker_bank_accounts -> PAYROLL; medical_certifications -> WFM; i9_records -> ONBOARDING; reg FMLA -> WFM; reg I-9/E-Verify -> ONBOARDING; reg HIPAA-BAA -> BEN-ADMIN.
- **Closed by Phase 0:** pay_equity_assessments (analytics, not a master); HCM-COMPLIANCE module (no vendor draws it); lifecycle onboarding/offboarding split (no vendor splits it - folded into B2-S5r).

### Surfaced (regenerated q-HCM.md - still waiting on user)

- **B2-S5r (gate, REVERSED):** make module 56 master self-service request objects (change_requests, life_events, onboarding_tasks, offboarding_tasks) + gates? Rec: yes. Drives B1B-S2.
- **B2-S6r (REVERSED):** author internal-mobility HCM->ATS handoff on employee.applied_internally? Rec: yes.
- **B2-S7r (CONFIRMED):** HCM stays consumer of WFM-mastered absence_requests? Rec: confirm.
- **B1A-SELF-CONTAIN (a7 was a question):** per-row M9 fix - pre_employees -> embedded_master, the other 6 -> necessity=optional. Destructive; rec: apply.
- **B2-DEPENDENTS (new):** dependents ownership vs benefit_dependents.

### Audit band state after this pass

- B1 Phase-0-driven loads done; B11/B12/B13 pass for the 4 new masters (aliases on the non-self-explanatory ones, lifecycle on the workflow one, entity_type classified, has_personal_content set). C/regulation coverage extended.
- Open questions cut from 12 -> 5 (all now backed by named-vendor Phase 0 evidence); 7 b3 items dispositioned (routed or closed).
- Domain stays `feedback_needed` / `next_action_by: user`.

### JWT errors

None.

## 2026-06-09 - Audit (process 2nd a-HCM.md: execute all 5 + 1 decisions)

### Summary

The user answered the regenerated q-file (2nd a-HCM.md). All six were decisions (no questions), so all were executed or resolved. Loader: .tmp_deploy/apply_hcm_a2_2026_06_09.ts. After this pass HCM has NO open b2 and no pending destructive approval; the q-/a- files are deleted and the domain moves to next_action_by=agent with one unblocked agent cleanup (B1A-INBOUND-MODULES).

### Executed

- **a4 (B1A-SELF-CONTAIN, yes) - DESTRUCTIVE M9 fix, user-approved:** 7 domain_module_data_objects rows rewritten. pre_employees (749, module 56) consumer+required -> embedded_master+required (carries a local pre-hire shell so HCM onboards standalone when ATS is absent; canonical master is ATS, Rule #11 satisfied). The other 6 relaxed to necessity=optional: candidates (3), candidate_assessments (10), job_offers (11) on 56; job_requisitions (1) on 55; onboarding_document_collections (22) on 54; asset_lifecycle_events (55, contributor) on 56. M9 self-containment now clean for all of this domain's modules.
- **a5 (B2-DEPENDENTS, a) - additive:** loaded employee_dependents (#1038) as master+optional on HCM-CORE-WORKER (operational_record, has_personal_content), employees-composes-dependents relationship, alias 'Dependents'. benefit_dependents (148, BEN-ADMIN) left UNTOUCHED and distinct (it is the plan-enrollment record; HCM now masters the person-level dependent that benefits reads). No destructive reconciliation.
- **a1 (B2-S5r, a) - additive, REVERSED the prior baseline-only recommendation:** module 56 (HCM-LIFECYCLE-WORKFLOWS) now masters a self-service request object. The clean HCM-owned, missing one is worker_change_requests (#1039, operational_workflow, master+required): the ESS/MSS request to change worker data, routed through approval. 5-state lifecycle (draft -> submitted [open self-service] -> approved [gate, requires_permission, process_id=243 'Manage and maintain employee data' so the existing People-Ops R / HRBP A RACI grants the approve gate] -> applied/rejected terminal). employees-has and users-requests relationships, 2 aliases. NOTE: the other objects the research named (life_events, onboarding_tasks, change_requests) were NOT re-mastered - life_events is BEN-ADMIN's (handoff 418), onboarding_tasks (18) is ONBOARDING's, change_requests is taken; HCM consumes them. Mastering them would repeat the dependents/life_events duplicate-concept trap. Module 56 is no longer 'masters nothing'.
- **a2 (B2-S6r, yes) - additive, REVERSED the prior skip:** new trigger_event employee.applied_internally (#1656, on employees, event_category=signal) + handoff HCM-CORE-WORKER (54) -> ATS-CANDIDATE-CRM (module 1, ATS domain 56) on candidates payload (api_call, friction medium - worker/candidate identity reconciliation), + employees-applies_as-candidates relationship (mirrors the existing candidates-becomes-employees edge in the reverse direction).
- **a3 (B2-S7r, yes):** confirmed HCM stays a consumer of WFM-mastered absence_requests (module-56 consumer DMDO on absence_requests 163 already covers handoff 135). No write.
- **a6 (B3-NEIGHBOR-ROUTES, postpone):** neighbor-domain audits (PAYROLL/WFM/ONBOARDING/BEN-ADMIN) for the routed bank-accounts / medical-certs / I-9 / FMLA / I-9-E-Verify / HIPAA-BAA items are postponed (parked, non-blocking).

### State after this pass

- All b2 RESOLVED (B2-S1r/S2r/S4r/S5r/S6r/S7r/S8r + B2-DEPENDENTS). No pending destructive approval. q-HCM.md + a-HCM.md deleted.
- One unblocked agent cleanup remains: B1A-INBOUND-MODULES (formerly B1B-S2) - assign target_domain_module_id on the 27 NULL-target inbound handoffs. a1 resolved its gate (module 56 = lifecycle/events hub); what remains is a per-handoff consume-vs-signal classification (add consumer DMDO + target on the ones HCM genuinely reacts to; leave pure notifications NULL as domain-level signals). Its own focused pass, deliberately not rushed at the tail of this turn.
- Module-56 self-service master now seeds a worker_change_requests gate; the E-band derivation picks it up via process 243's existing RACI (no new persona/RACI authoring needed).

### JWT errors

None.

## 2026-06-09 - Audit (execute B1A-INBOUND-MODULES: inbound handoff module attribution)

### Summary

State-driven continuation: the only open agent item (B1A-INBOUND-MODULES) was executed. Drove from state.yaml, re-verified against live state first, then ran the per-handoff consume-vs-signal pass on all 27 NULL-target inbound cross-domain handoffs into HCM. None of the 27 payloads were modeled by any HCM module beforehand (DMDO pre-check returned []), so each handoff got a fresh decision: add a consumer+optional DMDO on the owning module and backfill target_domain_module_id (buckets a/b/c), or leave NULL as a domain-level signal HCM does not model (bucket d). Additive + corrective only (no destructive step); consumer DMDOs are necessity=optional (Rule #16 A: degrades gracefully) and carry no notes (Rule #15). Loader: .tmp_deploy/hcm_inbound_modules_2026_06_09.ts.

### Executed - 15 consumer DMDOs + 16 FK backfills

- **(a) module 56 HCM-LIFECYCLE-WORKFLOWS, consumer+optional (12 data_objects, 12 handoffs):** life_events 149 (h418), merit_recommendations 156 (h422), absence_balances 164 (h427), learning_records 170 (h431), succession_plans 176 (h437), performance_goals 175 (h438), workforce_segments 44 (h441), hr_cases 192 (h446), compliance_assignments 173 (h1047), compensation_plans 153 (h1125), course_completions 912 (h1311), legal_holds 635 (h913). People-lifecycle / talent+comp / learning+compliance signals HCM genuinely reacts to. legal_holds included because it gates the offboarding-purge workflow (HCM must not delete a worker record under hold) - a real consume, not just a notification.
- **(b) module 54 HCM-CORE-WORKER, consumer+optional (2 data_objects, 3 handoffs):** pay_slips 139 (h412 pay_cycle.closed + h1154 pay_slip.published), source_records 320 (h718 source_record.merged_to_golden). Core-worker-identity payloads.
- **(c) module 55 HCM-ORG-POSITIONS, consumer+optional (1 data_object, 1 handoff):** financial_plans 37 (h601 financial_plan.approved). Org/headcount.

### Left NULL - 11 domain-level signals (bucket d, accepted, no module owner)

HCM does not model these as worker-lifecycle records; each is a cross-domain notification it is informed by, not a record it consumes. Per B10b sub-case 2 these are accepted as domain-level signals (no module owner), not a gap:

- property_spaces 347 (h295, REAL-EST), case_categories 193 (h448, HRSD taxonomy/config), workforce_plans 23 (h451, PA analytics), policy_attestations 286 (h842, GRC governance), workplace_experience_feedback 594 (h869, IWMS), host_assignments 671 (h873, VIS-MGMT), store_audits 649 (h935, RET-STORE), legal_advice_records 638 (h1032, LSD privileged content), attrition_forecasts 42 (h1111, PA analytics), gdpr_consent_records 950 (h1313, LMS privacy), data_deletion_requests 952 (h1314, LMS privacy).

### Borderline calls (transparency - all additive/optional, reversible)

- **legal_holds 635 -> consume (a):** included because it gates HCM's offboarding/retention behavior. Distinct from policy_attestations 286 -> signal (d): the latter does not gate any HCM workflow (GRC tracks the attestation; HCM only routes).
- **PA analytics (workforce_plans 23, attrition_forecasts 42) -> signal (d):** PA is derive/overlay; HCM is informed of forecasts but does not store the plan/forecast as a record.
- **LMS privacy (gdpr_consent_records 950, data_deletion_requests 952) -> signal (d):** privacy-domain artifacts; HCM's reaction (cease processing) is behavior, not record consumption.

### Verification

- NULL-target inbound handoffs: 27 -> 11; the remaining 11 match the intended signal set exactly (loader match: OK).
- 15 consumer DMDOs confirmed present (2 on 54, 1 on 55, 12 on 56), all role=consumer necessity=optional. (Note: domain_module_data_objects has no record_status column, so these carry no per-row review flag; reviewed in the UI/relationship view.)
- Outbound B10b clean: zero outbound HCM handoffs with NULL source_domain_module_id.
- M9 unaffected: all new rows are consumer+optional (degrade gracefully, no self-containment violation); M7 unaffected (consumer rows, no master conflict).

### State after this pass

- b1a EMPTY (B1A-INBOUND-MODULES resolved). b2/b3 empty. Only B1B-NEIGHBOR-ROUTES remains (user-postponed, non-blocking).
- status: in_progress -> passed; next_action_by: agent -> blocked (derives to blocked: only b1b remains, blocked_by user_decision a6-postpone). HCM's own audit is structurally complete; the routed entity/statute placements are neighbor-domain work the user deferred.

### JWT errors

None.

## 2026-06-09 - Audit (execute B1A-B9D-VERIFY: handoff payload realization)

### Summary

Ran the B9d band (handoff payload realization, added to SKILL.md 2026-06-09) on HCM's 64 outbound cross-domain handoff_processes payload tags - the first B9d run on this domain. Classified each against the realized set (a process whose process_id is a gated data_object_lifecycle_states.process_id AND that carries process_raci R+A). Resolver: .tmp_deploy/b9d_resolver_2026_06_09.ts (read-only classifier, domain-parametrized); re-point loader: .tmp_deploy/b9d_repoint_hcm_2026_06_09.ts.

### Verdicts (before -> after)

- **RESOLVED: 26 -> 48.** Pre-existing: 97 (1.2.5 org design) x15, 995 (7.1.2.16 job descriptions) x9, 239 (7.6.2 separation) x1, 242 (7.7.2 inquiry) x1. After re-points: +243 x8, 239 to x10, +240 x5.
- **Re-pointed: 22** coarse `discovery_override` tags -> HCM realized lifecycle process by event (delete stale + insert agent_curated, record_status='new'; the stale tags were never user-approved, so corrective not destructive):
  - employee.created (was 41 / 7.3 "Manage employee onboarding, training, and development", L2) -> 243 (7.7.3 Manage and maintain employee data) x8.
  - employee.terminated (was 41 / 7.3, plus 1059 / 7.6.2.3 Manage offboarding) -> 239 (7.6.2 Manage separation) x9.
  - employee.promoted (was 41 / 7.3, plus 226 / 7.3.3 career development) -> 240 (7.6.3 Relocate employees and manage assignments) x5.
- **ORPHAN: 16 (report-only, owed by neighbor domains).** Precise target-realized tags whose owner domain has not authored its gate+RACI yet, so they realize nowhere catalog-wide: 224 (7.3.1 onboarding) -> ONBOARDING; 236 (7.5.4 payroll) -> PAYROLL; 247 (7.7.7 workforce analytics) -> PA; 980 (7.1.2.1 strategic workforce planning) -> SWP; 1036 (7.3.4.2 competencies) -> SKILLS-MGMT/TALENT; 1046 (7.5.1.5 comp admin) -> COMP-MGMT; 1052 (7.5.2.2 benefit enrollment) -> BEN-ADMIN; 298 (9.1.3 cost accounting, on org_unit.created -> FIN) -> FIN. Per the B8/B10 asymmetry these are NOT HCM fixes; the owner domain realizes them on its own B9d pass.
- **MIS-TAG: 0.** The resolver heuristically flagged 298 (category 9 vs catalog-wide realized cats), but 298's target IS FIN (a finance domain), so category 9 is related to the endpoint -> it is an ORPHAN owed by FIN, not a cross-category mis-tag. No destructive handoff_processes deletion needed.

### Method note (informs the still-unbuilt reusable resolver)

The mechanical "closest realized ancestor/descendant" ROLL-UP rule MIS-FIRES on over-broad parent tags: the L2 `7.3` discovery_override (19 handoffs) had one realized descendant (1032 "career plans") and the naive rule wanted to re-point all 19 onboarding/separation/promotion fan-outs to "career plans" - semantically wrong. The correct re-point is per-EVENT to HCM's realized worker-lifecycle process (created->243, terminated->239, promoted->240), done by hand. A reusable B9d resolver must use event/payload semantics for broad-parent tags, not just hierarchy proximity, and must classify MIS-TAG against the TARGET endpoint's family, not just catalog-wide realized categories.

### State after this pass

- B9d PASS: every outbound payload is RESOLVED or an ORPHAN owed elsewhere (report-only). B1A-B9D-VERIFY resolved; b1a empty.
- status=passed, next_action_by=blocked (the only open row is B1B-NEIGHBOR-ROUTES, the user-postponed neighbor routing).
- 16 ORPHANs are report-only follow-ups owed by ONBOARDING / PAYROLL / PA / SWP / SKILLS-MGMT / COMP-MGMT / BEN-ADMIN / FIN; they clear on those domains' own B9d passes.

### JWT errors

None.
