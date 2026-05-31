# BEN-ADMIN audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 4 full modules (`BEN-PLAN-DESIGN` id=71, `BEN-ENROLLMENT` id=72, `BEN-CARRIER-INTEG` id=73, `BEN-ACA-COMPLIANCE` id=74). 0 starter modules. 7 BEN-ADMIN-owned masters: `benefit_plans` (146), `benefit_open_enrollments` (150) in BEN-PLAN-DESIGN; `benefit_enrollments` (147), `benefit_dependents` (148), `life_events` (149) in BEN-ENROLLMENT; `benefit_carriers` (151), `carrier_feeds` (152) in BEN-CARRIER-INTEG. BEN-ACA-COMPLIANCE masters zero entities. Embedded / contributor / consumer footprint: `employees` (31, HCM-mastered, embedded_master on BEN-ENROLLMENT, consumer on BEN-ACA-COMPLIANCE), `employment_events` (36, HCM-mastered, consumer on BEN-ENROLLMENT), `org_units` (34, HCM-mastered, embedded_master on BEN-PLAN-DESIGN and BEN-ENROLLMENT), `deduction_codes` (141, PAYROLL-mastered, contributor on BEN-PLAN-DESIGN), `legal_entities` (197, ERP-FIN-domain-mastered with no module master, consumer on BEN-PLAN-DESIGN and BEN-ACA-COMPLIANCE), `pay_slips` (139, PAYROLL-mastered, consumer on BEN-ACA-COMPLIANCE), `candidates` (3, ATS-mastered, consumer on BEN-ENROLLMENT), `hr_cases` (192, HRSD-mastered, consumer on BEN-ENROLLMENT). 5 capabilities (BENEFITS-ENROLL, BENEFITS-LIFE-EVENT, CARRIER-CONNECT, ACA-COMPLIANCE, BEN-DECISION). 9 solutions linked (5 primary, 3 secondary, 1 additional primary). 27 lifecycle states across 7 masters (benefit_plans 3, benefit_enrollments 5, benefit_dependents 4, life_events 5, benefit_open_enrollments 4, benefit_carriers 5, carrier_feeds 5). 11 trigger_events on BEN-ADMIN masters (1 with populated `event_category`, 10 with empty `event_category`). 8 intra-domain cross-module handoffs covering 5 of the 6 possible source-target pairs across the 4 modules. 8 outbound cross-domain handoffs to PAYROLL (4: 108, 110, 188, 417), ERP-FIN (2: 109, 419), HCM (1: 418), HRSD (1: 420). 11 inbound cross-domain handoffs from PAYROLL (3: 100, 413, 1156), ATS (3: 120, 395, 1075), HCM (3: 367, 371, 122), HRSD (1: 1119), plus the duplicate 122. Existing APQC tags: 7 of 19 cross-domain handoffs carry one or more `handoff_processes` rows; all 7 are `discovery_substring` or `discovery_override`; zero `agent_curated`; zero `record_status='approved'`. 4 per-module system skills (177-180) with 50 `skill_tools` rows total. 4 Benefits-business-function-scoped roles (10065 BENEFITS-BENEFITS-ADMIN, 10066 BENEFITS-PLAN-MANAGER, 10067 BENEFITS-ENROLLMENT-SPECIALIST, 10068 BENEFITS-COMPLIANCE-ANALYST). 32 BEN-ADMIN-prefixed permissions (12 baseline + 20 workflow-gate). 15 role_permissions rows. 5 regulations (ACA, ERISA, HIPAA, COBRA, GINA).
- **Vendor-surface basis (Pass 2 flagship enumeration):** Workday Benefits, ADP Benefits, Empyrean Benefit Solutions, Benefitfocus, Businessolver Benefitsolver, bswift, PlanSource, Selerix, Sequoia One, Maxwell Health / Sun Life, Alegeus, WEX Health, Discovery Benefits, Nava Benefits, Forma. Decision-support specialists: Jellyvision ALEX, Picwell, Nayya. ACA / compliance specialists: Health-e(fx), Equifax Workforce, OutSolve, Trusaic. Voluntary / supplemental benefits specialists: Aflac, Unum, Colonial Life with their broker portals. COBRA administration specialists: WEX Health (acquired Discovery Benefits TPA), BCC, P&A Group. Statutory anchors: ACA (1094-C / 1095-C), ERISA (plan documents, summary plan descriptions, fiduciary requirements), HIPAA (Privacy Rule for plan-administration data), COBRA (continuation coverage notices), GINA, ADA, FMLA, USERRA, Section 125 cafeteria-plan rules, IRS Form 5500, state-level paid family / medical leave laws (CA PFL, NY PFL, NJ TDB, WA PFML, CO FAMLI). The catalog regulation set covers ACA, ERISA, HIPAA, COBRA, GINA (broad core US anchors are present); missing: Section 125 (cafeteria plans), Form 5500 (annual ERISA filing), ADA (reasonable accommodation), FMLA (job-protected leave), USERRA (uniformed-services reemployment), state-level paid leave laws, and non-US anchors (UK auto-enrolment, Canadian provincial benefits, EU statutory benefits).
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 16 items (7 entity candidates + 3 modularization candidates + 6 regulation candidates).

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO touch | Weight | Pass shape |
|---|---|---|---|---|---|
| PAYROLL | 4 (108, 110, 188, 417) | 3 (100, 413, 1156) | 2 (`deduction_codes` contributor, `pay_slips` consumer) | 9 | Pairwise (full) |
| HCM | 1 (418) | 3 (122, 367, 371, 379) | 3 (`employees` embedded, `employment_events` consumer, `org_units` embedded) | 8 | Pairwise (full) |
| ATS | 0 | 3 (120, 395, 1075) | 1 (`candidates` consumer, flagged scope-creep) | 4 | Pairwise (full) |
| ERP-FIN | 2 (109, 419) | 0 | 1 (`legal_entities` consumer) | 3 | Pairwise (full) |
| HRSD | 1 (420) | 1 (1119) | 1 (`hr_cases` consumer, flagged scope-creep) | 3 | Pairwise (full) |

No additional cross-domain neighbors with weight >=3 surfaced.

**Structural pass bands:** **S1/S2/S3** all return coverage tables; surface zero-row anomalies routed below. **A1 fail** (British spelling `enrolment` in `domains.description` and in capability_name `BENEFITS-ENROLL`). **A2** pass (5 capabilities, > 3). **A3** pass (9 solutions, 5 primary). **M1/M2/M4/M6/M7** pass (4 modules, all capabilities realized, M7 within-domain coherence clean: no `master + consumer` sibling conflict, no catalog-wide multi-master). **M5** pass (every requires_permission lifecycle state carries `domain_module_id`). **B1/B2/B3** pass on BEN-ADMIN-owned masters. **B4** pattern-flag re-evaluation surfaces 3 candidates (see Bucket 2). **B5 partial-fail** (`legal_entities` 197 is consumed but has zero `domain_module_data_objects` master rows; canonical master sits only at `domain_data_objects` level on ERP-FIN; sub-case 1 in B10b terminology, surface to user as it routes to ERP-FIN). **B6** pass (8 intra-domain `data_object_relationships` rows cover the BEN-ADMIN spine: `benefit_plans → benefit_enrollments`, `benefit_open_enrollments → benefit_plans`, `benefit_open_enrollments → benefit_enrollments`, `benefit_enrollments → benefit_dependents`, `life_events → benefit_enrollments`, `benefit_carriers → benefit_plans`, `benefit_carriers → carrier_feeds`, `benefit_plans → deduction_codes`). **B7 partial-fail** (zero outbound user-edges from BEN-ADMIN masters to `users`; the inbound `users → BEN-ADMIN-masters` direction has 6 edges, so the user-actor relationship layer is half-modeled; Rule #10 wants both directions when an actor performs distinct verbs). **B8** pass (cross-domain outbound payload edges modeled: `benefit_enrollments → payroll_journal_entries` 140, `benefit_enrollments → pay_runs` 138, `benefit_enrollments → journal_entries` 194, `carrier_feeds → journal_entries` 142, `carrier_feeds → hr_cases` 135). **B9 hard-fail** (10 trigger_events with empty `event_category`; Rule #13 enum requires `lifecycle / state_change / threshold / signal`). **B9b** pass (8 intra-domain handoff rows cover 5 of 6 possible cross-module pairs; only BEN-CARRIER-INTEG → BEN-ENROLLMENT is unmodeled which is acceptable since the only cross-module event from CARRIER-INTEG is carrier_feed.reconciled which fans out to HRSD externally). **B10b partial-fail** (BEN-ADMIN owes ZERO target_module_id patches: all 6 outbound to PAYROLL / ERP-FIN / HCM carry NULL `target_domain_module_id` but the OWNING SIDE is the target domain; BEN-ADMIN's own source_domain_module_id is populated on every outbound row). All inbound rows carry populated `target_domain_module_id` (72 or 74) and populated `source_domain_module_id`. **B10b report-only**: 6 outbound NULL target_module_ids owed by PAYROLL (108, 110, 417), ERP-FIN (109, 419), HCM (418). **B11** pass (14 alias rows cover all 7 BEN-ADMIN-owned masters; >= 2 aliases each). **B12** pass (27 lifecycle states across 7 masters; benefit_plans / benefit_open_enrollments / benefit_enrollments / benefit_dependents / life_events / benefit_carriers / carrier_feeds all carry full state machines). **C1** pass (1 owner row, Benefits Administration function 39). **C2** not applicable (no capability-divergent ownership). **D1** UI link surfaced; spot-check is a manual step. **E1/E2/E3/E4** pass (4 roles each spanning >= 2 modules with `interaction_level` set; non-empty bundles). **E5** partial-fail (BENEFITS-PLAN-MANAGER 10066 has `role_modules` on 71 + 73 + 74 implicitly via the cross-cutting nature of plan management, but `role_permissions` only touches 71 + 73; need to confirm whether 74 module access is intentional; similar for BENEFITS-ENROLLMENT-SPECIALIST 10067 with no permissions on 73 or 74). **E6** partial-fail (workflow-gate permissions on BEN-ENROLLMENT module 72 like `elect_benefit_enrollment`, `activate_benefit_enrollment`, `terminate_benefit_enrollment`, `submit_life_event`, `reject_life_event`, `process_life_event`, `deactivate_benefit_dependent` are NOT in any role bundle; BENEFITS-BENEFITS-ADMIN 10065 takes the `admin` tier on every module which hierarchy-expands to cover them, but no specialist role explicitly bundles the workflow gates; surface as design review). **F1/F2/F3/F4/F5** pass (zero legacy domain-level system skills, every module has exactly one system skill, every system skill has >= 1 skill_tools, operation_kind invariants hold, Semantius score computable). **F7** pass (zero channel-primitive `skill_tools` rows; all notify_* abstractions). **H1 partial-fail** (7 of 19 cross-domain handoffs carry tags; zero `agent_curated`; zero `record_status='approved'`; Rule H1 volume expectation is 0.5N to 0.8N agent_curated tags for N = 19 cross-domain handoffs, target 10-15 NEW + 4 deferrals; current tag set is `discovery_substring` / `discovery_override` only).

BEN-ADMIN Semantius score: **computable**. Strict score: 41 of 50 skill_tools rows are coverage_tier=platform (the 9 external rows are `notify_team`, `sign_document`, `generate_1094c_form`, `generate_1095c_form`, `file_aca_returns` plus a few `notify_team` reuses). Strict = 0.82, Operational ≈ 0.82 (no `integration`-tier tools linked).

### Vendor surface basis

Flagship US benefits-administration vendors split into three tiers:

- **HCM-suite benefits modules** (Workday Benefits, Oracle HCM Benefits, SAP SuccessFactors Benefits, ADP Workforce Now Benefits, Paychex Flex Benefits, UKG Pro Benefits, Dayforce Benefits, Paylocity Benefits, Paycom Benefits, BambooHR Benefits, Rippling Benefits, Gusto Benefits, Justworks PEO). These cover the master surface BEN-ADMIN currently models: plan catalog, open enrollment, life events, carrier connectivity, basic ACA reporting.
- **Pure-play benefits-administration platforms** (Empyrean, Benefitfocus, Businessolver Benefitsolver, bswift, PlanSource, Selerix, Sequoia One, Maxwell Health / Sun Life, Nava Benefits, Forma). These typically expose the master surface BEN-ADMIN has PLUS: COBRA event tracking, EOI (evidence of insurability) workflows, dependent eligibility audits, voluntary / supplemental benefit elections, life-cycle messaging (decision support), broker-portal eligibility files. The pure-plays distinguish themselves on the COBRA + dependent-audit + decision-support surface.
- **Compliance / niche specialists** (Alegeus and WEX Health for HSA / FSA / commuter benefit ledgers; Health-e(fx) and Trusaic for ACA reporting kernel; ADP Health Compliance; Jellyvision ALEX, Picwell, Nayya for decision support; BCC and P&A for COBRA TPA).

Phase 0 was clearly run for the BEN-ADMIN core load: plan / enrollment / dependent / life event / carrier feed cleanly mirror the flagship pure-play surface. Missing surface concentrates in the COBRA / FSA-HSA-commuter ledger / ACA filings-as-entity / dependent-eligibility-audit / EOI slice that pure-play vendors expose distinctly. BEN-ACA-COMPLIANCE masters zero entities even though every flagship ACA specialist masters `aca_filings` (the 1094-C / 1095-C transmittal record) and `affordability_snapshots` as first-class records; this is the single biggest module-internal gap.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **A1 partial, British spelling in `domains.description` and capability_name** | `domains.description` for BEN-ADMIN (id=61) reads `Open enrolment, life-event handling, carrier connectivity, ACA compliance, and benefits decision support.` Project rule (CLAUDE.md) mandates American English; "enrolment" is British. The capability_name `Annual Benefits Enrolment` on capability_code BENEFITS-ENROLL (id=40) has the same issue. | PATCH `domains.id=61.description` to `Open enrollment, life-event handling, carrier connectivity, ACA compliance, and benefits decision support.` PATCH `capabilities.id=40.capability_name` to `Annual Benefits Enrollment`. `capability_code` stays as `BENEFITS-ENROLL`. |
| B1-S2 | **B9 missing event_category on 10 trigger_events** | 10 trigger_events on BEN-ADMIN masters carry empty `event_category` (Rule #13 enum: `lifecycle / state_change / threshold / signal`). Only event 51 (`enrollment.changed`) is populated as `state_change`. Empty: 413 `benefit_plan.published`, 414 `benefit_plan.deprecated`, 415 `benefit_dependent.added`, 416 `benefit_dependent.aged_out`, 417 `life_event.reported`, 418 `life_event.approved`, 419 `benefit_open_enrollment.opened`, 420 `benefit_open_enrollment.closed`, 421 `carrier_feed.transmitted`, 422 `carrier_feed.reconciled`. | PATCH each. Proposed: 413 -> `state_change` (lifecycle moves to active), 414 -> `state_change` (deprecation transition), 415 -> `lifecycle` (new dependent record), 416 -> `threshold` (age limit crossed), 417 -> `lifecycle` (new life event declared), 418 -> `state_change` (approval), 419 -> `state_change` (opened), 420 -> `state_change` (closed), 421 -> `state_change` (feed file emitted), 422 -> `state_change` (carrier ack processed). |
| B1-S3 | **SCOPE-CREEP on BEN-ENROLLMENT, `candidates` consumed without spine relationship** | BEN-ENROLLMENT (72) declares `candidates` (3, mastered by ATS) as `consumer + required`. Zero `data_object_relationships` rows connect `candidates` to any BEN-ADMIN master. Skill_tools row for skill 178 carries the note `Pre-hire enrollment setup (offer-accept → enrollment)` for `query_candidates`. Flagship vendors model pre-hire benefits-portal access via `benefit_enrollments` keyed off `employees` rather than the candidate row; the inbound handoff that warrants the dependency is `job_offer.accepted` (120) which already updates `benefit_enrollments`. The candidate row itself is not consumed by any BEN-ADMIN workflow. | DELETE the DMDO row (72, 3, consumer, required). DELETE skill_tool row linking skill 178 to tool 14 (query_candidates). The inbound handoff 120 (`job_offer.accepted` from ATS) is the integration surface; no candidate-record consumption needed downstream. |
| B1-S4 | **SCOPE-CREEP on BEN-ENROLLMENT, `hr_cases` consumed without spine relationship** | BEN-ENROLLMENT (72) declares `hr_cases` (192, mastered by HRSD) as `consumer + required`. Zero `data_object_relationships` rows connect `hr_cases` to any BEN-ADMIN master. The skill_tools row for skill 178 says `HRSD-escalated benefits questions land here`. The legitimate HRSD-to-BEN-ADMIN handoff is the inbound 1119 (`hr_case.escalated_to_benefits` from HRSD with payload `hr_cases`); the case lifecycle is owned by HRSD, BEN-ADMIN only needs to acknowledge the escalation, not consume the case row as a required dependency. | Downgrade `(72, 192, consumer, required)` to `consumer + optional`, OR DELETE entirely and rely on the inbound handoff. Surface as Bucket 2 since the policy choice (defer to HRSD vs embed read-only case-view) is architectural. Default proposal: downgrade to `optional`. The skill_tool row for `query_hr_cases` can stay (it's a read-only query an enrollment specialist may legitimately need to triage an escalation). Recorded as B2-S1 below. |
| B1-S5 | **B7 missing outbound user-edges from BEN-ADMIN masters** | Zero `data_object_relationships` rows go FROM a BEN-ADMIN master TO `users` (748). The inbound direction (`users → benefit_enrollments`, `users → life_events`, `users → benefit_plans`, etc.) has 6 edges, but the inverse / event-payload direction is empty. Per Rule #10, when a master has user-typed actors performing distinct verbs (created_by, approved_by, last_modified_by, processed_by, transmitted_by), the outbound edge captures that actor for the architect agent. Masters needing the outbound edge: `benefit_plans` (created_by, deactivated_by), `benefit_open_enrollments` (opened_by, closed_by, processed_by), `benefit_enrollments` (elected_by, approved_by), `life_events` (submitter, approver, processor), `benefit_dependents` (declared_by, verified_by), `benefit_carriers` (contract_owner, suspended_by), `carrier_feeds` (transmitted_by, owner). | Author 7+ outbound user-edges via `data_object_relationships`. Source = each master, related_data_object_id = 748, relationship_verb describing the actor role (e.g. `benefit_plans created_by users`). Load via cluster-drafts loader. |
| B1-S6 | **B5 partial, `legal_entities` (197) consumed but missing module-layer master** | `legal_entities` 197 is consumed by BEN-PLAN-DESIGN (71) and BEN-ACA-COMPLIANCE (74) as `consumer + required`. The catalog's `domain_data_objects` has an ERP-FIN master row but `domain_module_data_objects` has ZERO `role=master` rows for 197 anywhere. The blueprint emitter cannot resolve the canonical owning module at deploy time. Report-only: the fix belongs to ERP-FIN's b1 audit (a B-band Phase-2 gap on ERP-FIN). | Schedule ERP-FIN b1 audit; surface as report-only follow-up. BEN-ADMIN's own consumer rows are correctly authored, no action needed here. |
| B1-S7 | **B10b report-only, 6 outbound NULL target_module_id owed by target domains** | 6 of BEN-ADMIN's outbound handoffs carry NULL `target_domain_module_id`: 108 (PAYROLL `enrollment.changed` → `benefit_enrollments`), 110 (PAYROLL `benefit_open_enrollment.closed` → `benefit_enrollments`), 417 (PAYROLL `life_event.approved` → `life_events`), 109 (ERP-FIN `enrollment.changed` → `payroll_journal_entries`), 419 (ERP-FIN `carrier_feed.transmitted` → `carrier_feeds`), 418 (HCM `life_event.approved` → `life_events`). Target-domain attribution is the receiving side's responsibility per the B10b asymmetry rule. | Schedule b1 audits on PAYROLL (3 owed), ERP-FIN (2 owed), HCM (1 owed). PAYROLL audit on 2026-05-30 already surfaced 108, 110, 417 in its B1-S6. |
| B1-S8 | **H1, APQC tagging gap on 12 untagged + 5 weak existing tags** | 12 of 19 cross-domain handoffs are untagged: 110 (BEN-PLAN-DESIGN → PAYROLL, `benefit_open_enrollment.closed` / `benefit_enrollments`), 417 (BEN-ENROLLMENT → PAYROLL, `life_event.approved` / `life_events`), 418 (BEN-ENROLLMENT → HCM, `life_event.approved` / `life_events`), 419 (BEN-CARRIER-INTEG → ERP-FIN, `carrier_feed.transmitted` / `carrier_feeds`), 420 (BEN-CARRIER-INTEG → HRSD, `carrier_feed.reconciled` / `carrier_feeds`), 100 (PAYROLL → BEN-ENROLLMENT, `pay_cycle.closed` / `benefit_enrollments`), 120 (ATS → BEN-ENROLLMENT, `job_offer.accepted` / `benefit_enrollments`), 413 (PAYROLL → BEN-ACA-COMPLIANCE, `pay_cycle.closed` / `pay_slips`), 1075 (ATS → BEN-ENROLLMENT, `job_offer.rescinded` / `benefit_enrollments`), 1119 (HRSD → BEN-ENROLLMENT, `hr_case.escalated_to_benefits` / `hr_cases`), 1156 (PAYROLL → BEN-ENROLLMENT, `payroll_journal.reversed` / `benefit_enrollments`), 379 (HCM → BEN-ENROLLMENT, `employment_event.recorded` / `employment_events`). Existing tags (109, 122, 188, 108, 367, 371, 395) are all `discovery_substring` or `discovery_override`. Zero `agent_curated`, zero `record_status='approved'`. Volume target for N=19: 10-15 new agent_curated rows + ~4 deferrals. | Author 12 new agent_curated rows + FLIP the 7 existing tags from `discovery_*` to `agent_curated` where the existing PCF row is correct. Per-handoff classification in the table below. |
| B1-S9 | **E6 workflow-gate permissions not bundled into BEN-ENROLLMENT specialist roles** | BENEFITS-ENROLLMENT-SPECIALIST (10067) holds `ben-enrollment:manage` (which expands to baseline-read + baseline-manage via permission_hierarchy) plus the specific workflow gates `verify_benefit_dependent` and `approve_life_event`. The remaining BEN-ENROLLMENT workflow-gate permissions (`elect_benefit_enrollment`, `activate_benefit_enrollment`, `terminate_benefit_enrollment`, `submit_life_event`, `reject_life_event`, `process_life_event`, `deactivate_benefit_dependent`) sit unbundled. The flagship-vendor enrollment specialist persona performs all of these in a typical day. BENEFITS-BENEFITS-ADMIN (10065) holds `:admin` on every module which hierarchy-expands to cover them, so no permission is genuinely orphaned; the gap is that the specialist persona has to be impersonated as the admin to perform routine work. | Add 7 `role_permissions` rows: 10067 ↔ each of the 7 unbundled BEN-ENROLLMENT workflow gates. Similar review pass for BENEFITS-PLAN-MANAGER 10066: should pick up `open_benefit_open_enrollment`, `close_benefit_open_enrollment`, `process_benefit_open_enrollment` on module 71. Surface as design review in Bucket 2 for the per-permission yes/no calls. Recorded as B2-S5. |
| B1-S10 | **F2 BEN-ACA-COMPLIANCE has no mastered entity** | BEN-ACA-COMPLIANCE (74) consumes `employees`, `legal_entities`, `pay_slips`, `benefit_enrollments` (via inbound handoffs) but masters zero entities. The skill_tools layer carries 3 compute / side_effect tools (`generate_1094c_form`, `generate_1095c_form`, `file_aca_returns`) that produce artifacts, but those artifacts are not catalog rows. Every flagship ACA specialist (Health-e(fx), Trusaic, ADP Health Compliance, Workday ACA, bswift ACA) masters `aca_filings` (1094-C / 1095-C transmittal record with lifecycle: draft → submitted → accepted / rejected → corrected) and `affordability_snapshots` (monthly per-employee record) as first-class entities. Without these, the module's workflow gates (already missing, only baseline-read / manage / admin permissions exist) and audit trail are unmodeled. | Author 2 new masters: `aca_filings` (master + required on 74) with lifecycle states (draft, validated, submitted, accepted, rejected, corrected) and `affordability_snapshots` (master + required on 74) with lifecycle states (draft, finalized, superseded). Author trigger_events `aca_filing.submitted`, `aca_filing.accepted`, `aca_filing.rejected`, `affordability_snapshot.finalized`. Author workflow-gate permissions `validate_aca_filing`, `submit_aca_filing`, `correct_aca_filing`. Surface to user as Bucket 2 since this changes the M-band shape of the module. Recorded as B2-S4. |
| B1-S11 | **C1 advisory, missing HR contributor + Payroll contributor + Finance / Accounting consumer business_function** | `business_function_domains` for BEN-ADMIN has 1 row (Benefits Administration owner). Flagship vendors all model Human Resources as a contributor (employee data maintenance), Payroll as a contributor (deduction code maintenance), and Finance / Accounting as a consumer (GL impact of benefit costs and ACA penalty exposure). Currently the function spine is too narrow. | Author 3 rows: business_function `Human Resources` as `contributor`, `Payroll` as `contributor`, `Finance` (or `Accounting`) as `consumer` on domain 61. |

#### APQC TAGGING (B1-S8 detail)

The table below proposes 19 `agent_curated` rows: 12 new INSERTs + 7 REPLACE / FLIP of existing `discovery_*` rows. PCF references are the APQC Cross-Industry PCF v7.5.

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | external_id | confidence |
|---|---|---|---|---|---|---|
| 108 | BEN-ENROLLMENT → PAYROLL | enrollment.changed | benefit_enrollments | Administer benefit enrollment | 10505 | confident L4, FLIP existing |
| 109 | BEN-ENROLLMENT → ERP-FIN | enrollment.changed | payroll_journal_entries | Administer benefit enrollment | 10505 | confident L4, FLIP existing |
| 110 | BEN-PLAN-DESIGN → PAYROLL | benefit_open_enrollment.closed | benefit_enrollments | Administer benefit enrollment | 10505 | confident L4, INSERT |
| 188 | BEN-ENROLLMENT → PAYROLL-RUN | enrollment.changed | payroll_journal_entries | Administer benefit enrollment | 10505 | confident L4, FLIP existing |
| 417 | BEN-ENROLLMENT → PAYROLL | life_event.approved | life_events | Administer benefit enrollment | 10505 | confident L4, INSERT |
| 418 | BEN-ENROLLMENT → HCM | life_event.approved | life_events | Manage employee data | (APQC L3 child of 10510) | confident L3, INSERT |
| 419 | BEN-CARRIER-INTEG → ERP-FIN | carrier_feed.transmitted | carrier_feeds | Process accounts payable and expense reimbursements | 10733 | confident L3, INSERT |
| 420 | BEN-CARRIER-INTEG → HRSD | carrier_feed.reconciled | carrier_feeds | Manage employee inquiries | (APQC L4 under 10520) | medium L4, INSERT |
| 100 | PAYROLL → BEN-ENROLLMENT | pay_cycle.closed | benefit_enrollments | Administer benefit enrollment | 10505 | confident L4, INSERT |
| 120 | ATS → BEN-ENROLLMENT | job_offer.accepted | benefit_enrollments | Manage employee onboarding, training, and development | 20599 | confident L2, INSERT |
| 122 | HCM → BEN-ENROLLMENT | employee.terminated | benefit_enrollments | Administer benefit enrollment | 10505 | confident L4, REPLACE current 20599 |
| 367 | HCM → BEN-ENROLLMENT | employee.terminated | employees | Manage employee termination process | (APQC L3 child of 10517) | confident L3, REPLACE current 20599 |
| 371 | HCM → BEN-ENROLLMENT | employee.created | employees | Manage employee onboarding, training, and development | 20599 | confident L2, FLIP existing |
| 379 | HCM → BEN-ENROLLMENT | employment_event.recorded | employment_events | Administer benefit enrollment | 10505 | confident L4, INSERT |
| 395 | ATS → BEN-ENROLLMENT | candidate.hired | candidates | Manage employee onboarding, training, and development | 20599 | confident L2, REPLACE current 10440 (Recruit/Source) |
| 413 | PAYROLL → BEN-ACA-COMPLIANCE | pay_cycle.closed | pay_slips | Develop and manage compensation, rewards, and benefits | 10510 | confident L3, INSERT (affordability calc input) |
| 1075 | ATS → BEN-ENROLLMENT | job_offer.rescinded | benefit_enrollments | Administer benefit enrollment | 10505 | medium L4, INSERT |
| 1119 | HRSD → BEN-ENROLLMENT | hr_case.escalated_to_benefits | hr_cases | Manage employee inquiries | (APQC L4 under 10520) | medium L4, INSERT |
| 1156 | PAYROLL → BEN-ENROLLMENT | payroll_journal.reversed | benefit_enrollments | Administer benefit enrollment | 10505 | medium L4, INSERT |

19 candidate APQC tags total (12 INSERT, 4 FLIP existing source to `agent_curated`, 3 REPLACE existing with better PCF node). No deferrals to Discover Pass 3 (every cross-domain BEN-ADMIN handoff has a confident or medium PCF match within `Administer benefit enrollment` 10505, `Manage employee onboarding` 20599, `Process accounts payable` 10733, `Develop and manage compensation, rewards, and benefits` 10510, or `Manage employee inquiries` 10520 subtree).

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 (entity gaps surfaced as Bucket 2/3 since they need user judgment on module placement) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 2 (B1-S3 `candidates`, B1-S4 `hr_cases`) |
| STRUCTURAL (A/M/B/C/E/F band failures) | 7 (S1, S2, S5, S6 report-only, S7 report-only, S9, S11) |
| BOUNDARY (NULL FK or missing handoff) | included in B1-S6 and B1-S7 (report-only) |
| APQC TAGGING | 1 (B1-S8, sub-table of 19 individual tag proposals) |
| MODULARIZATION ISSUES | 1 (B1-S10 routes to Bucket 2 as design choice) |
| **Bucket 1 total in-scope line items** | 11 |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation, edge weight >= 3)

Cross-domain `data_object_relationships` mirror checks pulled from the structural pass. Section 1 (wired-pair counts) shown inline. Section 2 (NULL FK candidates) routed to B1-S7. Section 3 (missing handoffs) called out below. Section 4 (boundary integrity). Section 5 (cross-rel mirrors).

**PAYROLL <-> BEN-ADMIN (weight 9).** Wired pairs: 7 (BEN→PAYROLL: 108, 109, 110, 188, 417; PAYROLL→BEN: 100, 413, 1156). Section 2: 108, 110, 417 carry NULL target_module_id on the PAYROLL side (PAYROLL owes per its own B1-S6). 109 NULL ERP-FIN owes (see below). Section 3: no missing handoffs detected; the spine `enrollment.changed`, `benefit_open_enrollment.closed`, `life_event.approved` covers the deduction-side flow. Section 4: PAYROLL masters `deduction_codes` (141) which BEN-PLAN-DESIGN consumes as `contributor + required`; PAYROLL masters `pay_slips` (139) which BEN-ACA-COMPLIANCE consumes. Both clean. Section 5: cross-relationships `benefit_enrollments adjusts pay_runs` (138), `benefit_enrollments posts_to payroll_journal_entries` (140), `benefit_enrollments posts_to journal_entries` (194), `life_events adjusts pay_runs` (139), `benefit_carriers triggers pay_runs` (137) exist. Missing: no `pay_slips ↔ aca_filings` cross-rel; would be authored when B1-S10 lands.

**HCM <-> BEN-ADMIN (weight 8).** Wired pairs: 4 (HCM→BEN: 122, 367, 371, 379; BEN→HCM: 418). Section 2: 418 NULL target_module_id (HCM owes). Section 3: missing outbound BEN-ENROLLMENT → HCM on `benefit_dependent.added` to update HRIS dependent record (medium urgency since most flagship vendors do this); add to Bucket 2 as a design question. Section 4: HCM masters `employees`, `employment_events`, `org_units`; BEN-ADMIN embeds `employees` on BEN-ENROLLMENT (embedded_master + required) and `org_units` on BEN-PLAN-DESIGN + BEN-ENROLLMENT (embedded_master + optional); `employment_events` consumed on BEN-ENROLLMENT. All clean per Rule #16 (infrastructure-master treatment for org_units = optional, behavioral-master treatment for employees = required). Section 5: cross-relationships `employees enrolls_in benefit_enrollments` (122), `employees triggers benefit_enrollments` (44), `employment_events triggers benefit_enrollments` (45), `employees declares life_events` (123), `employees updated by life_events` (136), `org_units sponsors benefit_plans` (124) exist.

**ATS <-> BEN-ADMIN (weight 4).** Wired pairs: 3 inbound (120, 395, 1075). Section 2: all 3 source_module populated (ATS-OFFERS-pre-employee for 120/1075, ATS-CANDIDATE-CRM for 395). Section 3: clean. Section 4: BEN-ENROLLMENT consumes `candidates` (B1-S3 SCOPE-CREEP, fix by DELETE). Section 5: cross-relationship `job_offers (11) triggers benefit_enrollments` (828) exists. Once B1-S3 lands, the relationship is sufficient to model the dependency without the SCOPE-CREEP consumer row.

**ERP-FIN <-> BEN-ADMIN (weight 3).** Wired pairs: 2 outbound (109, 419). Section 2: both NULL target_module_id (ERP-FIN owes). Section 3: missing inbound ERP-FIN → BEN-PLAN-DESIGN on `cost_center.updated` (when GL accounting changes affect benefit-plan deduction posting). Section 4: BEN-PLAN-DESIGN consumes `legal_entities` (197, B1-S6 partial fail because ERP-FIN module-master is missing); BEN-ACA-COMPLIANCE also consumes `legal_entities`. Section 5: no cross-relationships between BEN-ADMIN masters and ERP-FIN masters beyond the `posts_to journal_entries` rows mentioned above.

**HRSD <-> BEN-ADMIN (weight 3).** Wired pairs: 2 (BEN→HRSD: 420; HRSD→BEN: 1119). Section 2: both module-populated. Section 3: clean. Section 4: BEN-ENROLLMENT consumes `hr_cases` (B1-S4 SCOPE-CREEP, fix by downgrade to optional or DELETE). Section 5: cross-relationship `carrier_feeds spawns hr_cases` (135) exists; that captures the reconciliation-to-case spawn. After B1-S4 lands the catalog still expresses the dependency through the relationship without the SCOPE-CREEP consumer row.

**Lighter neighbors:** None with weight >= 3 beyond the above.

**In-scope mechanical PATCH from pairwise (Bucket 1):** all covered by B1-S1 through B1-S11. No additional mechanical patches surfaced.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | PATCH `domains.description` and `capabilities.capability_name` to remove British spelling |
| B1-S2 | PATCH 10 trigger_events to set `event_category` |
| B1-S3 | SCOPE-CREEP: DELETE `(72, 3, consumer, required)` plus `skill_tools (178, query_candidates)` |
| B1-S4 | SCOPE-CREEP: downgrade or DELETE `(72, 192, consumer, required)` per B2-S1 |
| B1-S5 | Author 7+ outbound user-edges from BEN-ADMIN masters to `users` |
| B1-S6 | Report-only: ERP-FIN owes a module-layer `master` row on `legal_entities` (197) |
| B1-S7 | Report-only: 6 outbound NULL target_module_id owed by PAYROLL (3), ERP-FIN (2), HCM (1) |
| B1-S8 | APQC TAGGING: 19 `agent_curated` rows (12 INSERT, 4 FLIP, 3 REPLACE) |
| B1-S9 | E6: bundle 7+ workflow-gate permissions into BENEFITS-ENROLLMENT-SPECIALIST and BENEFITS-PLAN-MANAGER (gated on B2-S5) |
| B1-S10 | M-band design: author `aca_filings` + `affordability_snapshots` masters on BEN-ACA-COMPLIANCE (gated on B2-S4) |
| B1-S11 | C1: add HR contributor + Payroll contributor + Finance consumer `business_function_domains` |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **`hr_cases` dependency strength on BEN-ENROLLMENT.** Currently `consumer + required` despite zero structural relationships into BEN-ADMIN masters (B1-S4). The HRSD-escalation handoff 1119 + the existing `carrier_feeds spawns hr_cases` cross-relationship already capture the dependency. Should the DMDO row be downgraded to `optional`, DELETED outright (preferred under "deploy-time minimum") or kept as `required` (preferred when reading HRSD case history during enrollment troubleshooting is in-flow)? | Architectural intent + deployability strategy decision. | (a) Downgrade to `consumer + optional`. (b) DELETE entirely; rely on the inbound handoff + cross-relationship. (c) Keep `consumer + required`; document the in-flow read use case. |
| B2-S2 | **Pattern flag re-evaluation across BEN-ADMIN masters.** (a) `benefit_plans.has_personal_content=false` is correct (catalog data). (b) `benefit_open_enrollments.has_personal_content=false` is correct. (c) `benefit_enrollments.has_personal_content=true` correct, but `has_single_approver=false`, flagship enrollment workflows actually DO route to a single approver (HR ops manager / benefits administrator) for QLE-triggered changes; reconsider. (d) `benefit_dependents.has_personal_content=true` correct, but `has_submit_lock=false`, vendor behavior locks the dependent record once verified; reconsider. (e) `life_events.has_single_approver=true` correct, `has_submit_lock=true` correct. (f) `benefit_carriers.has_personal_content=false` correct. (g) `carrier_feeds` flags all false (typically no personal content (payload IS personal data but the feed row is metadata), no submit-lock, no single-approver; correct. | Workflow-shape judgment. | Per-flag yes / no on (c) `benefit_enrollments.has_single_approver` → true?, (d) `benefit_dependents.has_submit_lock` → true? |
| B2-S3 | **Regulation coverage scope.** Currently 5 regulations (ACA, ERISA, HIPAA, COBRA, GINA). Flagship vendor surface implies the list should also include: Section 125 (cafeteria-plan rules, IRC), Form 5500 (annual ERISA filing), ADA (reasonable accommodation), FMLA (job-protected leave), USERRA (uniformed-services reemployment), state paid-leave laws (CA PFL, NY PFL, NJ TDB, WA PFML, CO FAMLI). Add now, or surface as Bucket 3 candidates for vendor verification first? International anchors (UK auto-enrolment, Canadian provincial benefits, EU statutory benefits) are a geo-expansion question. | Depends on the catalog's policy on regulatory-breadth scope and geographic coverage. | (a) Add Section 125 + Form 5500 + ADA + FMLA + USERRA now as Bucket 1 fixes; (b) Defer to Bucket 3 / Phase 0 for vendor verification; (c) Add only the federal anchors (Section 125, Form 5500, FMLA) and defer state-level and non-US to a later geo-expansion pass. |
| B2-S4 | **BEN-ACA-COMPLIANCE master surface.** B1-S10 surfaces the module's zero-master state. Should `aca_filings` and `affordability_snapshots` be authored as new masters on BEN-ACA-COMPLIANCE (yes per flagship vendor practice), or should BEN-ACA-COMPLIANCE be redesignated as a derived-signals / reporting module per the Rule #14 leadership-tier exception? Flagship vendors uniformly model these as catalog rows with lifecycles, so the "derived-signals only" alternative would diverge from the flagship surface. | Modularization judgment; affects whether new workflow-gate permissions, lifecycle states, and trigger_events get authored alongside the masters. | (a) Yes, author `aca_filings` master (lifecycle: draft → validated → submitted → accepted / rejected → corrected) and `affordability_snapshots` master (lifecycle: draft → finalized → superseded). Author corresponding workflow-gate permissions and trigger_events. (b) No, treat BEN-ACA-COMPLIANCE as derived-signals only; document the divergence from flagship-vendor practice. (c) Defer to Bucket 3 (Phase 0 on `aca_filings` to verify per-vendor lifecycle). |
| B2-S5 | **Workflow-gate permissions on enrollment specialist + plan manager roles.** B1-S9 surfaces 7+ unbundled workflow-gate permissions on BEN-ENROLLMENT and 3 unbundled gates on BEN-PLAN-DESIGN. Currently BENEFITS-BENEFITS-ADMIN (10065) covers them via `:admin` tier expansion; specialists rely on impersonation. Add the gates to specialist bundles, or keep specialists at `:manage` and require admin escalation for terminal-state transitions? | Persona design judgment. The default for benefits-administration vendors is to grant the enrollment specialist all enrollment-lifecycle gates and require admin only for plan-design and carrier-contract gates; the plan manager covers all plan-design and carrier-relationship gates including activate / deactivate. | (a) Add all 7 BEN-ENROLLMENT workflow gates to 10067 (`elect_benefit_enrollment`, `activate_benefit_enrollment`, `terminate_benefit_enrollment`, `submit_life_event`, `reject_life_event`, `process_life_event`, `deactivate_benefit_dependent`) and 3 BEN-PLAN-DESIGN gates to 10066 (`open_benefit_open_enrollment`, `close_benefit_open_enrollment`, `process_benefit_open_enrollment`). (b) Add a subset (specify per gate). (c) Keep current bundles; rely on admin escalation. |
| B2-S6 | **`domains.notes` pointer policy.** BEN-ADMIN `notes` is empty. Update post-audit with the standard one-line pointer to this audit file per `audits/README.md`? Rule #15 requires explicit user-approved wording. | The notes-pointer policy is optional and the wording requires explicit approval. | (a) Supply user-approved wording for the pointer. (b) Skip the pointer for now. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against the flagship-vendor list above. The compliance and entity-surface candidates below come from the analyst's flagship-vendor knowledge; they are candidates for Phase 0 verification, not vetted findings.

#### MISSING entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `cobra_events` (or `cobra_qualifying_events`) | WEX Health, BCC, P&A Group, Businessolver Benefitsolver, Empyrean all master COBRA qualifying-event records as first-class catalog rows with their own lifecycle (notice generated → election period open → elected / waived / expired) distinct from `life_events`. Currently no entity captures the COBRA notice / continuation-coverage workflow. | new master in BEN-ENROLLMENT or new module BEN-COBRA |
| `aca_filings` + `affordability_snapshots` | Already surfaced as B1-S10 / B2-S4. Listed here for completeness as the Phase-0 verification target if B2-S4 is deferred. | new masters in BEN-ACA-COMPLIANCE |
| `dependent_eligibility_verifications` | Empyrean, Benefitfocus, Businessolver, bswift, Forma run dependent-eligibility audits as a distinct workflow (employee submits documentation → vendor reviews → dependent verified or de-enrolled). Currently `benefit_dependents.state=verified` flattens this; flagship vendors keep an audit-record entity with its own lifecycle. | new master in BEN-ENROLLMENT |
| `eoi_requests` (evidence of insurability) | Workday Benefits, Empyrean, bswift, Lincoln Financial, Unum, Sun Life Maxwell Health model EOI requests for life / disability / voluntary benefits as a distinct entity (carrier responds with approved / declined / pending information request) that gates `benefit_enrollments` finalization. Currently absent. | new master in BEN-ENROLLMENT or BEN-CARRIER-INTEG |
| `fsa_hsa_commuter_claims` (or split into 3 entities) | Alegeus, WEX Health, HealthEquity, Discovery Benefits, P&A Group master claims against FSA / HSA / commuter benefit accounts as a distinct ledger entity (claim submitted → adjudicated → paid or rejected). The PAYROLL `deduction_codes` connection captures the contribution side; the claim / disbursement side has no entity. | new module BEN-SPENDING-ACCOUNTS or new masters in BEN-ENROLLMENT |
| `voluntary_benefit_elections` | Aflac, Unum, Colonial Life broker-portal style voluntary / supplemental benefit elections (accident, critical-illness, hospital indemnity, legal, identity-protection) are typically modeled as a distinct election entity with its own carrier-by-carrier enrollment path. Could fold into `benefit_enrollments` with a type discriminator or be promoted to its own master. | extension of `benefit_enrollments` or new master |
| `qualified_default_investment_alternatives` (`qdias` or `qdia_designations`) | 401(k) record-keepers (Fidelity, Empower, Vanguard, T. Rowe Price, Principal) model QDIA designations as a first-class catalog entity tied to the 401(k) plan; PEP/MEP arrangements add complexity. Currently absent from `benefit_plans`. | extension of `benefit_plans` (subtype) or new entity |

#### MODULARIZATION candidates

- **BEN-COBRA as a new module.** If `cobra_events` is loaded, it warrants its own module: distinct lifecycle, distinct statutory windows (60-day election, 18 / 29 / 36-month continuation), distinct disbursement, distinct vendor (typically a third-party administrator). Would push BEN-ADMIN from 4 to 5 modules.
- **BEN-SPENDING-ACCOUNTS as a new module.** If FSA / HSA / commuter claims are loaded, the spending-account surface could be a separate module owning the claims ledger and embedding `benefit_enrollments` (for the contribution side). The Alegeus / WEX Health / HealthEquity vendor cluster operates as a distinct point-solution market.
- **BEN-COMPLIANCE as a renaming of BEN-ACA-COMPLIANCE.** If Section 125 / Form 5500 / ADA accommodation tracking lands (B2-S3 option a or c), the module could widen from ACA-only to a broader compliance scope, masters `aca_filings`, `form_5500_filings`, `cafeteria_plan_documents`, `summary_plan_descriptions`.

#### Compliance regulation candidates (Phase-0 verification target)

- **Section 125 (Cafeteria Plans, IRC)** -- mandatory for pretax benefits elections.
- **Form 5500 (Annual ERISA filing)** -- mandatory for plans subject to ERISA.
- **ADA (reasonable accommodation)** -- relevant for benefits leave-coordination workflows.
- **FMLA (Family and Medical Leave Act)** -- mandatory leave-of-absence anchor.
- **USERRA (Uniformed Services Employment and Reemployment Rights Act)** -- mandatory.
- **State paid-leave laws (CA PFL, NY PFL, NJ TDB, WA PFML, CO FAMLI, MA PFML)** -- mandatory by jurisdiction; if loaded, joins `jurisdictions` × `regulations`.

#### Candidate-domain queue

This audit surfaced 0 domain-tier candidates for `audits/_missing-domains.md`. Every MISSING candidate above is an entity / capability / sub-module extension of BEN-ADMIN rather than a new market. The COBRA-TPA market and the FSA / HSA / commuter-claims market are arguably point-solution markets in their own right (specialist vendors like WEX Health, Alegeus, HealthEquity, P&A Group), but they conventionally sit inside the BEN-ADMIN umbrella in flagship-vendor and analyst (Gartner, Forrester) market taxonomy. If the user wants to promote them, queue via `append_missing_domain.ts` with codes like `COBRA-ADMIN` and `SPENDING-ACCT-ADMIN`.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces `c:/tmp/BEN-ADMIN-phase0-<date>.md` confirming per-entity vendor coverage), or eyeball-mode (user names which of the 7 entity candidates + 6 regulation candidates + 3 modularization candidates to treat as confirmed).

### Cross-bucket dependencies

- **B1-S4 is gated on B2-S1** (the SCOPE-CREEP fix for `hr_cases` depends on the policy choice).
- **B1-S9 is gated on B2-S5** (which workflow-gate permissions to bundle).
- **B1-S10 is gated on B2-S4** (whether to author `aca_filings` and `affordability_snapshots` masters or leave the module derived-only).
- **B1-S3** (SCOPE-CREEP on `candidates`) is independent; can execute immediately.
- **B1-S5** (outbound user-edges) is independent.
- **B1-S1 / B1-S2 / B1-S8 / B1-S11** are independent.
- **B1-S6 / B1-S7** are report-only follow-ups; not BEN-ADMIN's fix.
- **B2-S2** (pattern flag re-evaluation) is independent.
- **B2-S3** (regulation coverage) is independent of Bucket 1 but informs Bucket 3 (#1, #4, #5 regulation candidates).
- **B3 missing entities** (cobra_events, fsa_hsa_commuter_claims, eoi_requests, dependent_eligibility_verifications, qdias) would inform **B2-S2** (pattern flags on the new entities) and would add roughly 5-8 more APQC tag rows if loaded.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S3, S5, S8, S11`), or `skip`.

- **S1 (British spelling)** is trivial; 2 PATCHes.
- **S2 (event_category PATCH on 10 events)** is trivial; one PATCH each.
- **S3 (DELETE `candidates` scope-creep)** straightforward; 1 DMDO DELETE + 1 skill_tool DELETE.
- **S4 (downgrade or DELETE `hr_cases`)** is gated on B2-S1.
- **S5 (7+ outbound user-edges)** structural; no dependencies.
- **S6 / S7 (report-only)** schedules audits on PAYROLL / ERP-FIN / HCM; not BEN-ADMIN's fix.
- **S8 (APQC TAGGING: 19 rows)** load now or in a follow-up batch?
- **S9 (E6 workflow-gate bundles)** depends on B2-S5.
- **S10 (BEN-ACA-COMPLIANCE masters)** depends on B2-S4.
- **S11 (HR + Payroll + Finance business_function_domains)** trivial; 3 inserts.

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (`hr_cases` dependency strength):** (a) downgrade to optional, (b) DELETE entirely, (c) keep required.
- **B2-S2 (pattern flag re-evaluation):** per-flag yes / no on (c) `benefit_enrollments.has_single_approver` → true, (d) `benefit_dependents.has_submit_lock` → true.
- **B2-S3 (regulation coverage):** (a) Add Section 125 + Form 5500 + ADA + FMLA + USERRA now; (b) Defer to Bucket 3; (c) Add federal core only.
- **B2-S4 (BEN-ACA-COMPLIANCE master surface):** (a) Yes, author `aca_filings` + `affordability_snapshots`; (b) No, treat as derived-signals only; (c) Defer to Bucket 3.
- **B2-S5 (workflow-gate permission bundling):** (a) Add all to specialists; (b) Add subset (specify); (c) Keep current; rely on admin escalation.
- **B2-S6 (domains.notes pointer):** (a) Supply user-approved wording; (b) Skip.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 7 entity candidates + 6 regulation candidates + 3 modularization candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| PAYROLL | B10b: populate `target_domain_module_id` on inbound handoffs 108 (`enrollment.changed` from BEN-ENROLLMENT, payload `benefit_enrollments`), 110 (`benefit_open_enrollment.closed` from BEN-PLAN-DESIGN), 417 (`life_event.approved` from BEN-ENROLLMENT). Already surfaced in PAYROLL audit 2026-05-30 B1-S6. |
| ERP-FIN | B10b: populate `target_domain_module_id` on inbound handoffs 109 (`enrollment.changed` from BEN-ENROLLMENT, payload `payroll_journal_entries`), 419 (`carrier_feed.transmitted` from BEN-CARRIER-INTEG, payload `carrier_feeds`). Also: author module-layer `master` row on `legal_entities` (197) in the relevant ERP-FIN module so BEN-ADMIN's `consumer` dependency resolves cleanly (B5 partial-fail). |
| HCM | B10b: populate `target_domain_module_id` on inbound 418 (`life_event.approved` from BEN-ENROLLMENT, payload `life_events`). |
| ATS | Confirm `source_domain_module_id` on inbound handoffs 120 (`job_offer.accepted`, currently → module 6), 395 (`candidate.hired`, currently → module 1), 1075 (`job_offer.rescinded`, currently → module 6) are pointing at the right ATS modules in the post-2026-05 ATS modular layout. |
| HRSD | Confirm `source_domain_module_id` on inbound 1119 (`hr_case.escalated_to_benefits`, currently → module 75) is the right HRSD module. |

### Decisions

_(awaiting user feedback per the explicit-prompt discipline above)_

## 2026-05-31, Continuation: B1 technical fixes

Applied truly-technical B1 items via [.tmp_deploy/fix_ben_admin_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_ben_admin_b1_technical_2026_05_31.ts). Loader is idempotent (re-reads before each write); ran from project root `c:/dev/domain-map`.

### Applied

- **B1-S1** (British spelling, 2 PATCHes): `domains.id=61.description` "enrolment" -> "enrollment"; `capabilities.id=40.capability_name` "Annual Benefits Enrolment" -> "Annual Benefits Enrollment". `capability_code` unchanged.
- **B1-S2** (event_category backfill, 10 PATCHes): trigger_events 413/414/418/419/420/421/422 -> `state_change`; 415/417 -> `lifecycle`; 416 -> `threshold`. Mapping taken verbatim from the audit's pre-specified table.
- **B1-S3** (SCOPE-CREEP DELETEs, 2 rows): `domain_module_data_objects.id=518` (candidates consumer on BEN-ENROLLMENT) and `skill_tools.id=1638` (skill 178 -> tool 14 query_candidates).
- **B1-S5** (outbound user-edges, 16 INSERTs): authored one row per actor verb per master into `data_object_relationships` (master -> users 748). Shape: `many_to_many` / `reference` / `owner_side=source`, verbs taken from the audit's per-master parenthetical list. Per Rule #10 the actor surface is now bidirectional on every BEN-ADMIN master.
- **B1-S8** (APQC tagging, 14 of 19 audit rows): 4 FLIPs (handoffs 108, 109, 188, 371; existing `discovery_*` rows retagged `agent_curated` with the same process_id), 2 REPLACEs (handoffs 122 -> process 1052, 395 -> process 41; existing rows pointed at the wrong PCF), 8 INSERTs (handoffs 110, 417, 419, 100, 120, 379, 1075, 1156). All rows ship with `proposal_source='agent_curated'` and `record_status='new'` per Rule #1.

### Holdbacks under B1-S8 (deferred to user)

- **handoff 418** (BEN-ENROLLMENT -> HCM `life_event.approved`): audit cites "APQC L3 child of 10510" with no specific external_id. Unresolvable.
- **handoff 367** (HCM -> BEN-ENROLLMENT `employee.terminated` / `employees`): audit cites "APQC L3 child of 10517". Unresolvable.
- **handoff 420** (BEN-CARRIER-INTEG -> HRSD `carrier_feed.reconciled`): audit cites "APQC L4 under 10520" (unresolvable; also live external_id 10520 resolves to "Manage expatriates", not the audit's "Manage employee inquiries"). Row 230 already carries an `agent_curated` tag pointing at process_id 1051 (10504 "Deliver employee benefits program") from a prior pass; left in place.
- **handoff 1119** (HRSD -> BEN-ENROLLMENT `hr_case.escalated_to_benefits`): same unresolvable placeholder. Row 219 already `agent_curated` -> 1051; left in place.
- **handoff 413** (PAYROLL -> BEN-ACA-COMPLIANCE `pay_cycle.closed` / `pay_slips`): audit cites external_id 10510 with process_name "Develop and manage compensation, rewards, and benefits"; live 10510 resolves to "Review engagement and retention indicators". The external_id resolves but the intent does not, so the audit's cite is wrong. Defer until user confirms the intended PCF node.

### Deferred (out of technical-only scope, per task)

- **B1-S4** (downgrade/DELETE `hr_cases` DMDO 598): gated on B2-S1 (architectural judgment).
- **B1-S6** (`legal_entities` 197 missing module-layer master): report-only; ERP-FIN owes.
- **B1-S7** (6 outbound NULL `target_domain_module_id` rows): report-only; PAYROLL (108, 110, 417), ERP-FIN (109, 419), HCM (418) own per the B10b asymmetry rule. Not patched here.
- **B1-S9** (workflow-gate role bundling on BENEFITS-ENROLLMENT-SPECIALIST + BENEFITS-PLAN-MANAGER): gated on B2-S5.
- **B1-S10** (new `aca_filings` + `affordability_snapshots` masters on BEN-ACA-COMPLIANCE): new entities + lifecycle + permissions; gated on B2-S4 and out of technical-only scope.
- **B1-S11** (HR contributor + Payroll contributor + Finance consumer `business_function_domains`): new contributor/consumer rows are out of technical-only scope per the continuation task spec; defer to user.

No `notes` writes anywhere (Rule #15). No `record_status` other than the default `new` (Rule #1). No vendor names in any text payload (Rule #18). No `permission_verb_override` PATCHes (audit pre-specifies none). DMDO 598 (`hr_cases`) carries a notes annotation in violation of Rule #15 but the audit does not pre-specify a row-ID revert, so it is left for the B1-S4 / B2-S1 follow-up.

### Verification queries (post-load)

- `trigger_events?id=in.(413..422)&select=event_category` -> all populated per the table above.
- `data_object_relationships?and=(data_object_id.in.(146,147,148,149,150,151,152),related_data_object_id.eq.748)` -> 16 outbound rows present (IDs 1863-1878).
- `handoff_processes?handoff_id=in.(108,109,110,188,417,419,100,120,122,371,379,395,1075,1156)&select=handoff_id,process_id,proposal_source` -> 14 rows all `agent_curated` with the expected `process_id`.

UI spot-check: https://tests.semantius.app/domain_map/trigger_events (and the matching tables for `domain_module_data_objects`, `skill_tools`, `data_object_relationships`, `handoff_processes`, `domains`, `capabilities`).

## 2026-05-31, Audit

### Summary

Fresh structural Validate b1 audit re-run after the 2026-05-31 technical-fix continuation. Most B1 items from 2026-05-30 now pass live; only the items gated on user judgment (B1-S4, B1-S9, B1-S10), the catalog-extension item (B1-S11), and the report-only target-domain owings remain open. Bucket 3 candidates (COBRA, FSA/HSA, EOI, dependent-eligibility audits, voluntary benefits, QDIA) and the regulation backfill (Section 125, Form 5500, FMLA, USERRA, state paid-leave) remain Phase-0 pending.

- Current footprint: 4 full modules (BEN-PLAN-DESIGN 71, BEN-ENROLLMENT 72, BEN-CARRIER-INTEG 73, BEN-ACA-COMPLIANCE 74). 17 DMDO rows. 7 BEN-ADMIN-owned masters across 71/72/73. BEN-ACA-COMPLIANCE 74 still masters zero entities. 1 business_function_domains row (owner only). 4 roles, 11 role_modules, 15 role_permissions. 32 BEN-ADMIN permissions (12 baseline + 20 workflow-gate). 16 outbound user-edges to data_object_id=748 (IDs 1863-1878). 14 aliases across 7 masters. 29 lifecycle states. 11 trigger_events on BEN-ADMIN masters, all event_category populated.
- 19 cross-domain handoffs; 17 carry agent_curated handoff_processes; 2 untagged holdbacks (413, 418). 8 intra-domain cross-module handoffs (1095-1102). 6 outbound cross-domain handoffs (108 PAYROLL, 109 ERP-FIN, 110 PAYROLL, 188 PAYROLL-RUN, 417 PAYROLL, 418 HCM, 419 ERP-FIN, 420 HRSD); 108/110/188/417 now carry populated `target_domain_module_id`; 3 outbound rows still NULL (109 ERP-FIN, 418 HCM, 419 ERP-FIN), owed by target domains.
- Bucket 1 (in-scope, agent fixable): 6 items.
- Bucket 2 (surface-for-user, judgment): 6 items (carried from 2026-05-30).
- Bucket 3 (Phase 0 pending, speculative): 16 items (carried from 2026-05-30, unchanged).

### Pass-band status against 2026-05-30 baseline

- **A1** PASS (description and capability_name remediated by B1-S1 fix).
- **A2 / A3** PASS (5 capabilities, 9 solutions).
- **M1 / M2 / M4 / M5 / M6 / M7** PASS (4 full modules, every requires_permission lifecycle state carries `domain_module_id`).
- **B1 / B2 / B3** PASS on BEN-ADMIN-owned masters.
- **B5** PARTIAL-FAIL (legal_entities 197 consumed but missing any module-layer master row catalog-wide; owed by ERP-FIN).
- **B6** PASS (8 intra-domain `data_object_relationships` spine intact).
- **B7** PASS (16 outbound user-edges authored, IDs 1863-1878, both directions modeled per Rule #10).
- **B8** PASS (cross-domain payload edges modeled).
- **B9** PASS (all 11 trigger_events on BEN-ADMIN masters carry valid `event_category`).
- **B9b** PASS (intra-domain handoff coverage 1095-1102).
- **B10b** PARTIAL-FAIL (3 outbound rows still NULL `target_domain_module_id`: 109 ERP-FIN, 418 HCM, 419 ERP-FIN; report-only, target domains owe).
- **B11** PASS (14 aliases across 7 masters, >=2 each).
- **B12** PASS (29 lifecycle states across 7 masters).
- **C1** narrow (1 row, owner only; B1A-S11 candidate now in-scope, no longer task-scope-deferred).
- **D1** pass (UI link rendered).
- **E1 / E2 / E3 / E4** PASS (4 roles, all role_modules carry `interaction_level`).
- **E5** PASS (each role spans >=2 modules; 10065 spans all 4, 10066 spans 71+73, 10067 spans 71+72, 10068 spans 71+72+74).
- **E6** PARTIAL-FAIL (12 workflow-gate permissions unbundled into specialist roles: 7 on BEN-ENROLLMENT for 10067, 5 on BEN-PLAN-DESIGN for 10066; blocked on B2-S5).
- **F1 / F2 / F3 / F4 / F5** PASS (4 system skills 177-180, 50 skill_tools rows, every operation_kind ↔ data_object_id pairing valid, Semantius score computable).
- **H1** PARTIAL-FAIL (17 of 19 cross-domain handoffs tagged `agent_curated`; 2 holdbacks (413, 418) unresolved pending user-confirmed PCF nodes).

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1A-S11 | C1 narrow business_function_domains | Only 1 `business_function_domains` row exists (id 8, business_function 39 Benefits Administration, responsibility_type=owner). The contributor / consumer slots (HR, Payroll, Finance) from 2026-05-30 B1-S11 are still unauthored; the continuation explicitly deferred the inserts to the user. Flagship benefits-administration vendors all model HR as contributor (employee maintenance), Payroll as contributor (deduction maintenance), Finance / Accounting as consumer (GL impact and ACA penalty exposure). | INSERT 3 rows on domain_id=61: contributor / contributor / consumer for the Human Resources, Payroll, Finance `business_functions.id` values. |
| B1A-RULE15-598 | Rule #15 revert | DMDO 598 (hr_cases consumer on BEN-ENROLLMENT 72) still carries an unapproved notes string ("BEN-ENROLLMENT consumes hr_cases when HRSD escalates a benefits question (escalated_to_benefits). Receiving side of handoff 1119."). The 2026-05-31 continuation flagged this as a Rule #15 violation but did not revert. Independent of the row-level B1B-S4 question. | PATCH `domain_module_data_objects.id=598.notes=""`. |
| B1B-S4 | SCOPE-CREEP: hr_cases consumer on 72 | DMDO 598 carries no spine `data_object_relationships` into any BEN-ADMIN master; inbound handoff 1119 plus existing `carrier_feeds spawns hr_cases` (135) already capture the dependency. Blocked on B2-S1 (architectural intent). | Apply B2-S1: (a) PATCH necessity=optional, (b) DELETE DMDO 598, or (c) leave required. |
| B1B-S9 | E6 workflow-gate bundling | 10067 (Enrollment Specialist) bundles only ben-enrollment:manage (10324), :verify_benefit_dependent (10329), :approve_life_event (10332), ben-plan-design:read (10315). 7 enrollment workflow gates (10326 elect, 10327 activate, 10328 terminate, 10330 deactivate_benefit_dependent, 10331 submit_life_event, 10333 process_life_event, 10334 reject_life_event) unbundled. 10066 (Plan Manager) bundles only ben-plan-design:admin (10317), ben-carrier-integ:manage (10336), :contract_benefit_carrier (10338), :activate_benefit_carrier (10339); 5 plan-design gates (10318 activate, 10319 deactivate plan; 10320 open, 10321 close, 10322 process open_enrollment) unbundled. Blocked on B2-S5. | Apply B2-S5: (a) INSERT 7 role_permissions on 10067 + 5 on 10066, (b) subset, or (c) keep current (admin escalation). |
| B1B-S10 | F2 BEN-ACA-COMPLIANCE masters zero entities | Module 74 still consumes employees (31), legal_entities (197), pay_slips (139), receives benefit_enrollments (intra-domain handoff 1100), and produces compute / side_effect artifacts (generate_1094c_form, generate_1095c_form, file_aca_returns). Zero `role=master` DMDO rows. Flagship ACA specialists master `aca_filings` and `affordability_snapshots` as first-class records with their own lifecycles. Blocked on B2-S4. | Apply B2-S4: (a) author both masters with lifecycle states, trigger_events, workflow-gate permissions, role bundles; (b) document derived-signals designation; (c) defer to Phase 0. |
| B1B-RPT | Report-only: target-domain owings | (1) ERP-FIN owes module-layer `role=master` DMDO on `legal_entities` 197 (catalog-wide zero `master` rows confirmed; BEN-PLAN-DESIGN and BEN-ACA-COMPLIANCE both consume). (2) ERP-FIN owes `target_domain_module_id` patches on inbound handoffs 109 (`enrollment.changed` / payroll_journal_entries) and 419 (`carrier_feed.transmitted` / carrier_feeds). (3) HCM owes `target_domain_module_id` on inbound 418 (`life_event.approved` / life_events). (4) Two cross-domain handoffs (413, 418) carry zero `handoff_processes` rows pending resolved APQC `external_id` citations from the 2026-05-30 B1-S8 holdback. | Schedule b1 audits on ERP-FIN, HCM. The 2 holdback APQC tags surface for user when the PCF candidate is resolved. |

### Bucket 2, Surface-for-user (judgment calls) (carried)

| ID | Question | Why agent cannot answer | Options |
|---|---|---|---|
| B2-S1 | `hr_cases` dependency strength on BEN-ENROLLMENT (DMDO 598). Downgrade to optional, DELETE entirely, or keep required? | Architectural intent + deployability strategy. | (a) Downgrade to `consumer + optional`; (b) DELETE DMDO 598; (c) Keep `consumer + required`. |
| B2-S2 | Pattern flag re-evaluation. `benefit_enrollments.has_single_approver` (currently false; flagship QLE-driven changes route to a single benefits-admin approver) and `benefit_dependents.has_submit_lock` (currently false; vendors typically lock once verified). | Workflow-shape judgment per master. | Per-flag yes / no. |
| B2-S3 | Regulation coverage scope. Add Section 125, Form 5500, FMLA, USERRA, state paid-leave laws (CA PFL / NY PFL / NJ TDB / WA PFML / CO FAMLI) now, or defer to Bucket 3 verification, or federal core only? | Catalog policy on regulatory breadth and geographic scope. | (a) Add federal-plus-state now; (b) Defer to Bucket 3; (c) Federal core only. |
| B2-S4 | BEN-ACA-COMPLIANCE master surface. Author `aca_filings` and `affordability_snapshots` as new masters on 74, redesignate the module as derived-signals only, or defer to Phase 0? | Modularization judgment. Drives whether workflow-gate permissions, lifecycle states, trigger_events are authored alongside. | (a) Author both; (b) Derived-signals only; (c) Defer to Phase 0. |
| B2-S5 | Workflow-gate permission bundling on enrollment specialist + plan manager. Add all 7+5 gates to specialists, partial subset, or keep current admin-escalation pattern? | Persona design judgment. Flagship vendors typically grant specialists their full lifecycle gate. | (a) Add all; (b) Subset; (c) Keep current. |
| B2-S6 | `domains.notes` pointer policy. Update with a one-line audit pointer per `audits/README.md` (Rule #15 wording approval required)? | Optional, wording requires approval. | (a) Supply user wording; (b) Skip. |

### Bucket 3, Phase 0 pending (carried)

Carried unchanged from 2026-05-30:

- **Entity candidates (7):** `cobra_events`, `aca_filings` + `affordability_snapshots` (also B1B-S10 / B2-S4), `dependent_eligibility_verifications`, `eoi_requests`, `fsa_hsa_commuter_claims`, `voluntary_benefit_elections`, `qdia_designations`.
- **Modularization candidates (3):** BEN-COBRA new module, BEN-SPENDING-ACCOUNTS new module, BEN-COMPLIANCE rename of BEN-ACA-COMPLIANCE.
- **Regulation candidates (6):** Section 125, Form 5500, ADA, FMLA, USERRA, state paid-leave laws (CA PFL, NY PFL, NJ TDB, WA PFML, CO FAMLI).

Vendor knowledge basis and proposed-module placement are documented in the 2026-05-30 Bucket 3 tables; no changes this pass.

### Cross-bucket dependencies

- B1B-S4 gated on B2-S1.
- B1B-S9 gated on B2-S5.
- B1B-S10 gated on B2-S4 (and partially informed by Bucket 3 if user picks the defer path).
- B1A-S11, B1A-RULE15-598 are agent-solvable and independent; can execute immediately on approval.
- B2-S3 informs Bucket 3 regulation candidates; B2-S4 informs Bucket 3 entity candidates.

### Decisions

_(awaiting user input on B2-S1 through B2-S6; B1B items remain blocked until resolved)._

### UI spot-check

- https://tests.semantius.app/domain_map/business_function_domains (B1A-S11)
- https://tests.semantius.app/domain_map/domain_module_data_objects (B1A-RULE15-598, B1B-S4)
- https://tests.semantius.app/domain_map/role_permissions (B1B-S9)
- https://tests.semantius.app/domain_map/domain_modules (B1B-S10)
