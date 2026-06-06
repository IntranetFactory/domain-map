# PAYROLL audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 4 full modules (`PAYROLL-RUN` id=90, `PAYROLL-TAX-COMPLIANCE` id=91, `PAYROLL-EARNINGS-DEDUCTIONS` id=92, `PAYROLL-EMPLOYEE-PAY-STATEMENTS` id=93). 8 PAYROLL-owned masters (`pay_runs` 138, `pay_slips` 139, `earning_codes` 140, `deduction_codes` 141, `tax_authorities` 142, `tax_filings` 143, `garnishment_orders` 144, `payroll_journal_entries` 145) plus the cross-domain `employees` master (31, mastered by HCM-CORE-WORKER) appearing as `embedded_master + required` on all 4 PAYROLL modules. 5 capabilities (GROSS-TO-NET, TAX-FILING, PAYROLL-GLOBAL, PAY-DISTRIBUTION, GARNISHMENTS), all home to PAYROLL only. 16 solutions (8 primary, 7 secondary, 1 secondary external-connector). 24 trigger_events on PAYROLL masters. 17 outbound + 24 inbound cross-domain handoffs (41 cross-domain total). 7 intra-domain cross-module handoffs. 28 lifecycle states across 5 of 8 masters (pay_runs 7, pay_slips 4, tax_filings 7, garnishment_orders 5, payroll_journal_entries 5). 0 aliases on any PAYROLL master. 1 domain-level legacy `payroll-system` skill (skill id 21, `domain_module_id=null`, transitional from pre-modular era); 0 per-module system skills. 0 PAYROLL-specific roles. 0 catalog-derived permissions on PAYROLL modules. 8 of 41 cross-domain handoffs have APQC tags (all `discovery_substring` or `discovery_override`, zero `agent_curated`, zero `record_status='approved'`).
- **Vendor-surface basis (Pass 2 flagship enumeration):** ADP Workforce Now, ADP Vantage, ADP GlobalView Payroll, Paychex Flex, Gusto, Rippling Payroll, Workday Payroll, SAP SuccessFactors Employee Central Payroll, Oracle HCM Cloud Payroll, UKG Pro Payroll, Ceridian Dayforce Payroll, Paycom, Paylocity, BambooHR Payroll, OnPay, CloudPay, Papaya Global, Deel, Remote, Sequoia One, plus regional specialists (Ramco, Neeyamo, Iris/Cascade UK, DATEV Lohn DE, Sage Payroll, Zellis). Compliance anchor is FLSA (US wage and hour), ACA (US benefits offer), and GDPR (EU personal data). The catalog regulation rows currently cover FLSA + ACA + GDPR only; broader anchors that should sit on PAYROLL include FICA / SECA, FUTA / SUTA, IRC Subtitle C (US federal payroll tax), state-level wage payment laws, EU PWD (Posted Workers Directive), HMRC RTI (UK), CRA T4 (Canada), DSGVO / GoBD (DE), and Finanzamt-class certification rules.
- **Bucket 1 (in-scope, agent fixable):** 12 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO touch | Weight | Pass shape |
|---|---|---|---|---|---|
| HCM | 2 | 5 (employee.*, employment_event, employment_contract.*) | 1 (PAYROLL embeds employees, hcm_positions, org_units from HCM) | 8 | Pairwise (full) |
| BEN-ADMIN | 2 | 3 (enrollment.changed, life_event.approved, open_enrollment.closed) | 1 (PAYROLL consumes benefit_enrollments, benefit_dependents) | 6 | Pairwise (full) |
| ERP-FIN | 4 (pay_run.disbursed, pay_cycle.posted, payroll_journal.reversed, payment_run.executed) | 0 | 0 | 4 | Pairwise (full) |
| COMP-MGMT | 0 | 4 (merit_cycle.approved x2, compensation_plan.published, equity_grant.vested, earning_code.created) | 1 (PAYROLL consumes merit_recommendations) | 5 | Pairwise (full) |
| HCM (pay_slip.published feedback) | 2 | 0 | already counted | -- | (covered above) |
| WFM | 0 | 2 (pay_period.closed, meal_break_record.violated) | 1 (PAYROLL consumes time_entries) | 3 | Pairwise (full) |
| GRC | 2 (tax_filing.submitted, garnishment_order.received) | 0 | 0 | 2 | Lightweight |
| EXPENSE | 2 (pay_run.disbursed expense_reports, expense.reimbursable pay_slips) | 1 (expense_line.approved) | 1 (PAYROLL consumes expense_reports) | 4 | Pairwise (full) |
| PA (People Analytics) | 3 (pay_cycle.closed people_kpis, pay_cycle.closed pay_slips, pay_run.disbursed pay_runs) | 0 | 0 | 3 | Pairwise (full) |
| ATS | 0 | 2 (background_check.cleared, candidate_referral.bonus_earned) | 2 (PAYROLL consumes background_checks, candidate_referrals) | 4 | Pairwise (full) |
| HRSD | 1 (garnishment_order.received) | 1 (hr_case.escalated_to_payroll) | 0 | 2 | Lightweight |
| ONBOARDING | 0 | 2 (journey.day_one_reached, onboarding_document_collection.completed) | 2 (PAYROLL consumes onboarding_journeys, onboarding_document_collections) | 4 | Pairwise (full) |
| VMS | 0 | 1 (contingent_timesheet.approved) | 0 | 1 | Lightweight |

**Structural pass bands:** **A1 fail** (em-dash in `domains.business_logic`). **A2/A3** pass. **M1/M2/M4/M6** pass; **M7 hard-fails** (within-domain incoherence: 7 sibling masters appear as `role='consumer'` on `PAYROLL-RUN` while being `role='master'` in their own sibling module, plus 1 `master + consumer` cross-module pair on `pay_runs`). **B1/B2/B3** pass on PAYROLL-owned masters. **B4** pattern-flag re-evaluation surfaces 3 candidates. **B5** passes (no orphan embedded_master). **B6 partial-fail** (only 1 intra-PAYROLL master-to-master relationship exists between PAYROLL masters; 6+ expected). **B7 hard-fail** (zero edges between PAYROLL masters and `users` 748). **B9 partial-fail** (11 trigger_events with empty `event_category`). **B9b** passes (7 intra-domain handoffs cover the 4-module spine). **B10b** surfaces 13 outbound and 4 inbound NULL FKs (PAYROLL owes 10 inbound target_module_id + 1 outbound source_module_id, the rest owed by other domains). **C1** passes. **E-band hard-fail** (zero PAYROLL roles, zero PAYROLL-prefixed permissions, the entire role + permission layer is absent). **F1/F2/F3/F4/F5 hard-fail** (1 legacy domain-level system skill instead of 4 per-module skills per Rule #17, zero `skill_tools`, Semantius score is uncomputable). **H1 hard-fail** (8 of 41 cross-domain handoffs tagged, zero `agent_curated`, zero `record_status='approved'`).

PAYROLL Semantius score: **uncomputable** until F2 (per-module system skills) and F3 (skill_tools) are loaded.

### Vendor surface basis

Flagship US-payroll vendors (ADP, Paychex, Gusto, Rippling, Workday Payroll, Paylocity, UKG, Dayforce, Paycom, OnPay, BambooHR) anchor the per-state US tax and disbursement surface plus W2/W4/1099 statement generation, garnishment processing, and ACA reporting. Global flagship vendors (ADP GlobalView, Workday Payroll, SAP SuccessFactors ECP, Oracle HCM Payroll, CloudPay, Papaya Global, Deel, Remote, Ramco, Neeyamo, Iris/Cascade, DATEV) anchor multi-country tax-engine kernels, EOR (Employer-of-Record) workflows, contractor pay, and cross-jurisdiction statutory filings. Compliance specialists (Sequoia One, Justworks, TriNet PEO) supply PEO co-employment surfaces. The flagship set surfaces three workflow substrates the current PAYROLL catalog mostly captures (pay run, statement, tax filing, garnishment) and three it misses outright (year-end reporting forms as a master, retro-pay corrections, EOR / contractor-pay multi-jurisdiction surface). Phase 0 was clearly run for the core PAYROLL load; the missing surface is concentrated in the year-end / retro / EOR slice that flagship vendors all expose distinctly.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **A1 fail, em-dash in `domains.business_logic`** | `domains.business_logic` on PAYROLL contains a U+2014 em-dash, forbidden project-wide per CLAUDE.md. Current text: `Tax tables, gross-to-net calculation, garnishment logic, statutory filings, and country-specific compliance kernels [em-dash] irreducible and continuously updated.` | PATCH `domains.id=55` `business_logic` to replace the em-dash with a comma or colon. Proposed: `Tax tables, gross-to-net calculation, garnishment logic, statutory filings, and country-specific compliance kernels: irreducible and continuously updated.` |
| B1-S2 | **M7 (hard fail), within-domain incoherence** | 7 PAYROLL-owned masters appear with `role='consumer' + necessity='required'` on `PAYROLL-RUN` (90) while also being `role='master'` in their own sibling PAYROLL module. The conflicting rows: (90, 140, consumer), (90, 141, consumer), (90, 142, consumer), (90, 144, consumer), (90, 139, consumer) -- these data_objects are mastered in PAYROLL-EARNINGS-DEDUCTIONS / PAYROLL-TAX-COMPLIANCE / PAYROLL-EMPLOYEE-PAY-STATEMENTS. Additionally `pay_runs` (138, mastered in PAYROLL-RUN itself) is `consumer + required` on PAYROLL-TAX-COMPLIANCE (91) and PAYROLL-EMPLOYEE-PAY-STATEMENTS (93), and `payroll_journal_entries` (145, mastered in PAYROLL-RUN) is `consumer + required` on PAYROLL-TAX-COMPLIANCE (91). M7 rejects master + consumer in sibling modules of the same domain. Agent default: DELETE the 8 sibling consumer rows on PAYROLL-RUN that point at masters held by 91/92/93; convert the 3 reverse rows (pay_runs / payroll_journal_entries consumed by sibling modules) to a deployability choice (DELETE or PROMOTE to `embedded_master`). Surface the architectural choice as B2-S1. | DELETE 5 DMDO rows: (90, 140, consumer), (90, 141, consumer), (90, 142, consumer), (90, 144, consumer), (90, 139, consumer). Pending B2-S1, DELETE or PROMOTE: (91, 138, consumer), (93, 138, consumer), (91, 145, consumer). Total 8 rows in scope for B2-S1. |
| B1-S3 | **B9 missing event_category** | 11 trigger_events carry empty `event_category` (Rule #13 enum must be `lifecycle / state_change / threshold / signal`): 402 `pay_run.opened`, 403 `pay_run.calculated`, 404 `pay_run.approved`, 405 `pay_run.disbursed`, 406 `earning_code.created`, 407 `deduction_code.updated`, 408 `tax_authority.rate_changed`, 409 `tax_filing.submitted`, 410 `tax_filing.accepted`, 411 `garnishment_order.received`, 412 `garnishment_order.released`. | PATCH each. Proposed: 402 -> `lifecycle`, 403 -> `state_change`, 404 -> `state_change`, 405 -> `state_change`, 406 -> `lifecycle`, 407 -> `state_change`, 408 -> `state_change`, 409 -> `state_change`, 410 -> `state_change`, 411 -> `lifecycle`, 412 -> `state_change`. |
| B1-S4 | **B6 intra-domain relationship gap** | Only 1 PAYROLL-master-to-PAYROLL-master `data_object_relationships` row exists (row 140 `benefit_enrollments posts_to payroll_journal_entries`, but `benefit_enrollments` is BEN-ADMIN-owned). The PAYROLL spine is essentially un-modeled at the relationship layer. Expected edges from the lifecycle and module DMDO graph: `pay_runs produces pay_slips` (one-to-many, required), `pay_runs books payroll_journal_entries` (one-to-many, required), `pay_runs feeds tax_filings` (one-to-many, required), `tax_authorities scopes tax_filings` (one-to-many, required), `earning_codes contributes_to pay_slips` (many-to-many, required), `deduction_codes contributes_to pay_slips` (many-to-many, required), `garnishment_orders deducts_via pay_runs` (one-to-many, required), `pay_slips evidences payroll_journal_entries` (one-to-one, optional). | Author 8 `data_object_relationships` rows with verbs above. Load via cluster-drafts loader. |
| B1-S5 | **B7 user-edge hard fail (Rule #10)** | Zero `data_object_relationships` rows tie PAYROLL masters to `users` (748). Every workflow-bearing master has a user-typed actor: `pay_runs` (calculated_by, approved_by, paid_by), `pay_slips` (employee=user, published_to), `tax_filings` (filed_by, approved_by), `garnishment_orders` (assigned_processor), `payroll_journal_entries` (approver, reverser), `earning_codes`/`deduction_codes` (created_by, deactivated_by). Architect agents cannot infer these from naming alone. | Author 6+ edges (users 748) -> pay_runs (manages), pay_runs -> users (approved_by, optional inverse), users -> tax_filings (approves), users -> garnishment_orders (processes), users -> payroll_journal_entries (approves), users -> pay_slips (recipient), users -> earning_codes / deduction_codes (manages). |
| B1-S6 | **B10b PAYROLL owes (10 inbound + 1 outbound NULL FKs)** | PAYROLL is the receiving side and has not declared which PAYROLL module catches the event on 10 inbound handoffs: 105 (COMP-MGMT merit_cycle.approved -> merit_recommendations), 1118 (HRSD hr_case.escalated_to_payroll -> hr_cases), 426 (WFM meal_break_record.violated -> meal_break_records), 590 (VMS contingent_timesheet.approved -> contingent_timesheets), 599 (EXPENSE expense_line.approved -> expense_lines), 1126 (COMP-MGMT compensation_plan.published -> compensation_plans), 108 (BEN-ADMIN enrollment.changed -> benefit_enrollments), 110 (BEN-ADMIN benefit_open_enrollment.closed -> benefit_enrollments), 417 (BEN-ADMIN life_event.approved -> life_events), 423 (COMP-MGMT equity_grant.vested -> equity_grants). PAYROLL also has 1 outbound with NULL `source_domain_module_id`: 414 (payment_run.executed -> ERP-FIN, payload `payment_runs`). | PATCH `target_domain_module_id` per handoff. Proposed: 105 -> 92 (PAYROLL-EARNINGS-DEDUCTIONS, merit deltas land on earning codes), 1118 -> 90 (PAYROLL-RUN, exception payroll), 426 -> 90 (PAYROLL-RUN, premium-time recalc), 590 -> 90 (PAYROLL-RUN, contingent earnings), 599 -> 90 (PAYROLL-RUN, reimbursable expense lines), 1126 -> 92 (PAYROLL-EARNINGS-DEDUCTIONS, comp-plan-published reshapes earning codes), 108 -> 92 (PAYROLL-EARNINGS-DEDUCTIONS, enrollment changes drive deductions), 110 -> 92 (same reasoning), 417 -> 92 (life-event reshapes deductions), 423 -> 92 (equity_grant.vested books a deduction or earning). For 414, the `payment_run` entity is not currently a PAYROLL master and `source_domain_module_id` should resolve to PAYROLL-RUN (90) since `pay_run.disbursed` is the surrogate for this event. Confirm or surface as Bucket 2. |
| B1-S7 | **B10b report-only (outbound NULL targets owed by other domains)** | 13 outbound handoffs carry NULL `target_domain_module_id`; the target domain owns the fix per B10b asymmetry: 25, 102, 1155 (PA), 99, 1151, 1152, 414 (ERP-FIN), 101, 1157 (EXPENSE), 1153 (GRC), 1154, 412 (HCM), 415 (GRC). | Schedule b1 audits on PA, ERP-FIN, EXPENSE, GRC, HCM. |
| B1-S8 | **B10b report-only (inbound NULL sources owed by source domains)** | 4 inbound handoffs carry NULL `source_domain_module_id` per the source domain: 103 (WFM pay_period.closed), 426 (WFM meal_break_record.violated), 590 (VMS contingent_timesheet.approved), 599 (EXPENSE expense_line.approved). | Schedule b1 audits on WFM, VMS, EXPENSE. |
| B1-S9 | **E-band hard fail, zero PAYROLL roles + permissions** | No `roles` rows reference PAYROLL modules; no `role_modules` rows on 90/91/92/93; no `permissions.domain_module_id in (90,91,92,93)`. Flagship-vendor coverage names at minimum: `PAYROLL-ADMINISTRATOR` (cross-module, owns PAYROLL-RUN and PAYROLL-EARNINGS-DEDUCTIONS), `PAYROLL-MANAGER` (admin across all 4), `TAX-COMPLIANCE-OFFICER` (PAYROLL-TAX-COMPLIANCE + ERP-FIN read), `GARNISHMENT-SPECIALIST` (PAYROLL-EARNINGS-DEDUCTIONS + HRSD case-read), and the cross-functional `HR-PARTNER` (PAYROLL-RUN read, BEN-ADMIN secondary). Permission tier baseline rows (`<module>:read`, `:manage`, `:admin` x 4 modules = 12 baseline permissions) plus workflow-gate permissions derived from the 21 lifecycle states with `requires_permission=true` (`approve_pay_run`, `pay_pay_run` already encoded as override on state 47, `cancel_pay_run`, `publish_pay_slip`, `amend_pay_slip`, `archive_pay_slip`, `submit_tax_filing`, `approve_tax_filing`, `file_tax_filing`, `amend_tax_filing`, `activate_garnishment_order`, `suspend_garnishment_order`, `release_garnishment_order`, `submit_payroll_journal_entry`, `post_payroll_journal_entry`, `reverse_payroll_journal_entry`, `reject_payroll_journal_entry`). | Author 5 roles with role_modules + role_permissions; insert 12 baseline + ~17 workflow-gate permissions. This is a non-trivial load and should be staged through the standard Phase E loader, not a one-shot CLI block. |
| B1-S10 | **F2/F3/F5 hard fail, zero per-module system skills** | 1 legacy `payroll-system` skill (id 21) at `domain_id=55, domain_module_id=null` survives from the pre-modular era. Rule #17 requires exactly one `skill_type='system'` skill per `domain_modules` row with >=1 `skill_tools` row. Need 4 new system skills (`payroll_run_agent`, `payroll_tax_compliance_agent`, `payroll_earnings_deductions_agent`, `payroll_pay_statements_agent`), each linked to its module, each with the standard CRUD + lifecycle-gate + notify tools (typically 6-12 `skill_tools` per skill). The transitional `payroll-system` skill should be marked for sunset after the 4 per-module skills land. | Author 4 system skills + 4 sets of `skill_tools` (estimate 30-40 rows across the 4 skills, factoring in reuse of `query_<entity>`, `create_<entity>`, `update_<entity>`, `notify_person`, `notify_team`, plus workflow-gate-specific tools). Standard Phase S loader pattern. |
| B1-S11 | **F6 zero `data_object_aliases` on every PAYROLL master** | All 8 PAYROLL masters carry zero aliases. Vendor terminology surfaces ready to ship: `pay_runs` (`payroll runs`, `pay cycles`, `payroll cycles`, ADP `payroll batches`), `pay_slips` (`paystubs`, `pay statements`, `paychecks`, `wage statements`, UK `payslips`), `earning_codes` (`pay codes`, `earnings types`, Workday `compensation elements`), `deduction_codes` (`benefit deduction codes`, `pre-tax deductions`, `post-tax deductions`), `tax_authorities` (`taxing authorities`, `tax jurisdictions`, `revenue agencies`), `tax_filings` (`statutory filings`, `941`, `W2`, `1099`, `T4`, `RTI submissions`), `garnishment_orders` (`wage garnishments`, `wage attachments`, `court orders`, UK `attachment of earnings orders`), `payroll_journal_entries` (`payroll journals`, `payroll GL entries`, `payroll postings`). | Author 24+ alias rows. Vendor-specific aliases (e.g. `Workday Compensation Element`) belong on `data_object_aliases.alias_name` with the right `solution_id`. |
| B1-S12 | **C1 advisory, HR is missing as a contributor business_function** | `business_function_domains` for PAYROLL has 3 rows (Payroll owner, Accounting contributor, Finance contributor). Flagship vendors all model `Human Resources` as a contributor function to PAYROLL (HR maintains employee/comp data that drives pay) and `IT` as a consumer (integration ownership). Subtle but the current spine is too narrow. | Author 2 rows: business_function `Human Resources` (id=3) as `contributor` and `Information Technology` as `consumer`. |

#### APQC TAGGING

Only 8 of 41 cross-domain handoffs carry `handoff_processes` rows: 188 (BEN-ADMIN -> PAYROLL, discovery_substring), 108 (BEN-ADMIN -> PAYROLL, discovery_substring), 101 (PAYROLL -> EXPENSE, discovery_substring), 1126 (COMP-MGMT -> PAYROLL, discovery_substring), 7 (ONBOARDING -> PAYROLL, discovery_substring at L5 looks weak), 374/18/366 (HCM -> PAYROLL, discovery_override at L2). **All 8 are non-`agent_curated`; zero `record_status='approved'`.** Volume expectation per SKILL H1: 0.5N to 0.8N for N=41 -> 21 to 33 agent_curated tags. The audit proposes the following candidates from the analyst's structural-pass model:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | confidence |
|---|---|---|---|---|---|
| 18 | HCM-CORE-WORKER -> PAYROLL-RUN | employee.created | employees | Manage employee onboarding, training, and development (20599) or Pay employees (10522) | confident L3 (Pay employees more specific) |
| 366 | HCM-CORE-WORKER -> PAYROLL-RUN | employee.terminated | employees | Manage employee termination process or Pay employees (10522) | confident L3 |
| 374 | HCM-CORE-WORKER -> PAYROLL-RUN | employee.promoted | employees | Develop and manage compensation, rewards, and benefits (10510) | confident L3 |
| 377 | HCM-CORE-WORKER -> PAYROLL-RUN | employment_event.recorded | employment_events | Pay employees (10522) | confident L3 |
| 380 | HCM-CORE-WORKER -> PAYROLL-EARNINGS-DEDUCTIONS | employment_contract.executed | employment_contracts | Pay employees (10522) or Develop and manage compensation | confident L3 |
| 383 | HCM-CORE-WORKER -> PAYROLL-EARNINGS-DEDUCTIONS | employment_contract.expired | employment_contracts | Pay employees (10522) | confident L3 |
| 411 | ONBOARDING -> PAYROLL-RUN | onboarding_document_collection.completed | onboarding_document_collections | Manage employee onboarding (20599) | confident L3 |
| 401 | ATS -> PAYROLL-RUN | background_check.cleared | background_checks | Recruit, source, and select employees (10464) | confident L3 |
| 404 | ATS -> PAYROLL-EARNINGS-DEDUCTIONS | candidate_referral.bonus_earned | candidate_referrals | Pay employees (10522) or Reward and retain employees (10517) | confident L3 |
| 187 | COMP-MGMT -> PAYROLL-EMPLOYEE-PAY-STATEMENTS | merit_cycle.approved | pay_slips | Manage employee compensation (10511) | confident L3 |
| 105 | COMP-MGMT -> PAYROLL | merit_cycle.approved | merit_recommendations | Manage employee compensation (10511) | confident L3 |
| 1126 | COMP-MGMT -> PAYROLL | compensation_plan.published | compensation_plans | Develop and manage compensation, rewards, and benefits (10510) | confident L3 (replace existing `discovery_substring`) |
| 423 | COMP-MGMT -> PAYROLL | equity_grant.vested | equity_grants | Manage employee compensation (10511) | confident L3 |
| 103 | WFM -> PAYROLL-RUN | pay_period.closed | time_entries | Pay employees (10522) - time-export step | confident L3 |
| 426 | WFM -> PAYROLL | meal_break_record.violated | meal_break_records | Pay employees (10522) compliance step | confident L3 |
| 590 | VMS -> PAYROLL | contingent_timesheet.approved | contingent_timesheets | Manage and process contractor payments (10733 child) | confident L3 |
| 599 | EXPENSE -> PAYROLL | expense_line.approved | expense_lines | Process accounts payable and expense reimbursements (10733) | confident L3 (replace existing on 101) |
| 188 | BEN-ADMIN -> PAYROLL-RUN | enrollment.changed | payroll_journal_entries | Administer benefit enrollment (10505) | confident L4 (keeps existing) |
| 108 | BEN-ADMIN -> PAYROLL | enrollment.changed | benefit_enrollments | Administer benefit enrollment (10505) | confident L4 (keeps existing) |
| 110 | BEN-ADMIN -> PAYROLL | benefit_open_enrollment.closed | benefit_enrollments | Administer benefit enrollment (10505) | confident L4 |
| 417 | BEN-ADMIN -> PAYROLL | life_event.approved | life_events | Administer benefit enrollment (10505) | confident L4 |
| 1140 | COMP-MGMT -> PAYROLL-EARNINGS-DEDUCTIONS | earning_code.created | earning_codes | Develop and manage compensation (10510) | confident L3 |
| 7 | ONBOARDING -> PAYROLL-RUN | journey.day_one_reached | onboarding_journeys | Manage employee onboarding (20599) - replace weak L5 customer-journey-maps match | confident L3 |
| 1118 | HRSD -> PAYROLL | hr_case.escalated_to_payroll | hr_cases | Manage employee inquiries (10520 or child) | medium |
| 25 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> PA | pay_cycle.closed | people_kpis | Analyze workforce performance and HR metrics | confident L3 |
| 102 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> PA | pay_cycle.closed | pay_slips | Analyze workforce performance and HR metrics | confident L3 |
| 100 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> BEN-ADMIN | pay_cycle.closed | benefit_enrollments | Administer benefit enrollment (10505) | confident L3 |
| 99 | PAYROLL-RUN -> ERP-FIN | pay_cycle.posted | payroll_journal_entries | Process general accounting (10728 or child) | confident L3 |
| 101 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> EXPENSE | expense.reimbursable | pay_slips | Process accounts payable and expense reimbursements (10733) | confident L3 (already tagged at L2, propose L3 replacement) |
| 1151 | PAYROLL-RUN -> ERP-FIN | pay_run.disbursed | payroll_journal_entries | Process general accounting (10728) | confident L3 |
| 1152 | PAYROLL-RUN -> ERP-FIN | payroll_journal.reversed | payroll_journal_entries | Process general accounting (10728) | confident L3 |
| 1153 | PAYROLL-EARNINGS-DEDUCTIONS -> GRC | garnishment_order.received | garnishment_orders | Manage business unit ethics and compliance (16437) | confident L3 |
| 1154 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> HCM | pay_slip.published | pay_slips | Pay employees (10522) or Manage employee data | medium |
| 1155 | PAYROLL-RUN -> PA | pay_run.disbursed | pay_runs | Analyze workforce performance and HR metrics | confident L3 |
| 1156 | PAYROLL-RUN -> BEN-ADMIN | payroll_journal.reversed | benefit_enrollments | Administer benefit enrollment (10505) | confident L3 |
| 1157 | PAYROLL-RUN -> EXPENSE | pay_run.disbursed | expense_reports | Process accounts payable and expense reimbursements (10733) | confident L3 |
| 412 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> HCM | pay_cycle.closed | pay_slips | Pay employees (10522) | confident L3 |
| 415 | PAYROLL-TAX-COMPLIANCE -> GRC | tax_filing.submitted | tax_filings | Manage business unit ethics and compliance (16437) | confident L3 |
| 414 | PAYROLL -> ERP-FIN | payment_run.executed | payment_runs | Process accounts payable and expense reimbursements (10733) | medium |
| 413 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> BEN-ADMIN | pay_cycle.closed | pay_slips | Administer benefit enrollment (10505) | confident L3 |
| 416 | PAYROLL-EARNINGS-DEDUCTIONS -> HRSD | garnishment_order.received | garnishment_orders | Manage employee inquiries / HR cases | medium |

41 candidate APQC tags total. The 8 existing rows: 188 + 108 + 110-equivalent (existing only on 188/108) are L4 matches and likely correct (`Administer benefit enrollment` 10505); recommend FLIP `proposal_source` to `agent_curated`. 101 currently L2 (10733), propose REPLACE with the same node but agent_curated. 1126 at L4 `Review compensation plan` looks like a sibling of the more apt `Develop and manage compensation` parent, recommend REPLACE. 7 currently at L5 `Create customer journey maps` is clearly wrong, REPLACE. 374/18/366 at L2 `Manage employee onboarding, training, and development` is a `discovery_override` value and reasonable; recommend FLIP to `agent_curated` and possibly narrow to `Pay employees` L3 for the termination row (366) and the promoted row (374).

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A/M/B/C/E/F band failures) | 12 |
| BOUNDARY (NULL FK or missing handoff) | included in B1-S6 to S8 |
| APQC TAGGING | 1 (B1-H1, sub-table with 41 individual tag proposals) |
| MODULARIZATION ISSUES | 0 (refactor conversations route to Bucket 2) |
| **Bucket 1 total in-scope line items** | 12 |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation, edge weight >=3)

Cross-domain `data_object_relationships` mirror checks pulled from the structural pass. Section 1 (wired-pair counts) shown inline. Section 2 (NULL FK candidates) routed to B1-S6 / S7 / S8. Section 3 (missing handoffs) called out below. Section 4 (boundary integrity). Section 5 (cross-rel mirrors).

**HCM <-> PAYROLL (weight 8).** Wired pairs: 7 (HCM->PAYROLL: 18, 366, 374, 377, 380, 383; PAYROLL->HCM: 412, 1154). Section 2: 412 has NULL target_module_id (HCM owes), 1154 same; HCM-source rows all have source_module_id populated. Section 3: missing handoff PAYROLL-EARNINGS-DEDUCTIONS -> HCM on `garnishment_order.received` to update employee compliance flags. Section 4: HCM masters `employees`, `hcm_positions`, `org_units`; PAYROLL embeds all three at `embedded_master + required` on PAYROLL-RUN (and embeds `employees` on PAYROLL-TAX-COMPLIANCE, PAYROLL-EARNINGS-DEDUCTIONS, PAYROLL-EMPLOYEE-PAY-STATEMENTS). Embed shape is clean. Section 5: cross-relationship `employees triggers pay_runs` (32), `employment_events feeds pay_runs` (33), `employment_contracts feeds pay_runs` (34) exist. No `employees -> pay_slips` row even though `pay_slips` has employee as a column. Add: `employees receives pay_slips` (one-to-many, required, owner_side=target).

**BEN-ADMIN <-> PAYROLL (weight 6).** Wired pairs: 5 (BEN->PAYROLL: 108, 110, 188, 417, plus 423 equity; PAYROLL->BEN: 100, 413, 1156). Section 2: 108, 110, 417 have NULL target_module_id (PAYROLL owes per B1-S6). Section 3: missing handoff PAYROLL-EMPLOYEE-PAY-STATEMENTS -> BEN-ADMIN on `pay_slip.published` for 401k contribution updates (more granular than batch_sync 413). Section 4: PAYROLL consumes `benefit_enrollments`, `benefit_dependents`; both `consumer + required/optional`, no master conflict. Section 5: `benefit_enrollments adjusts pay_runs` (138), `benefit_enrollments posts_to payroll_journal_entries` (140) exist.

**ERP-FIN <-> PAYROLL (weight 4).** Wired pairs: 4 outbound from PAYROLL (99, 1151, 1152, 414). Section 2: all 4 have NULL target_module_id (ERP-FIN owes). Section 3: missing handoff ERP-FIN -> PAYROLL on `bank_acknowledgement.received` (NACHA / SEPA ack for disbursement). Section 4: clean. Section 5: no cross-relationships between PAYROLL masters and ERP-FIN masters; expected `payroll_journal_entries posts_to journal_entries` (or wherever ERP-FIN masters them) is missing.

**COMP-MGMT <-> PAYROLL (weight 5).** Wired pairs: 5 (COMP->PAYROLL: 105, 187, 1126, 1140, 423). Section 2: 105, 1126, 423 have NULL target_module_id (PAYROLL owes per B1-S6). Section 3: missing handoff PAYROLL -> COMP-MGMT on `pay_run.disbursed` for ETL into comp analytics (currently only flows to PA). Section 4: COMP-MGMT masters `compensation_plans`, `merit_recommendations`, `equity_grants`; PAYROLL embeds `merit_recommendations` (consumer + optional). Section 5: no cross-relationships exist between PAYROLL masters and COMP-MGMT masters; `merit_recommendations adjusts pay_runs` is missing.

**EXPENSE <-> PAYROLL (weight 4).** Wired pairs: 3 (PAYROLL->EXPENSE: 101, 1157; EXPENSE->PAYROLL: 599). Section 2: 101 and 1157 have NULL target_module_id (EXPENSE owes); 599 has NULL source_module_id (EXPENSE owes). Section 3: clean. Section 4: PAYROLL-RUN consumes `expense_reports` (optional); `expense_lines.feeds.pay_runs` (727) cross-relationship exists. Section 5: clean.

**PA <-> PAYROLL (weight 3).** Wired pairs: 3 outbound (25, 102, 1155). Section 2: all 3 have NULL target_module_id (PA owes). Section 3: clean. Section 4: clean. Section 5: no cross-relationships; expected `pay_runs flows_into people_kpis` is missing.

**ATS <-> PAYROLL (weight 4).** Wired pairs: 2 inbound (401, 404). Section 2: both have source_module_id populated. Section 3: clean. Section 4: PAYROLL-RUN consumes `background_checks` and PAYROLL-EARNINGS-DEDUCTIONS consumes `candidate_referrals`. Section 5: no cross-relationships exist; expected `background_checks gates pay_runs` and `candidate_referrals triggers pay_runs` (for the bonus) are missing.

**ONBOARDING <-> PAYROLL (weight 4).** Wired pairs: 2 inbound (7, 411). Section 2: both source-populated, both target-NULL (PAYROLL owes per B1-S6 for 411; 7 has target_module_id populated to 90). Wait re-check: handoff 7 has target_module_id=90 so it is wired; handoff 411 target_module_id=90 also wired. Both have target_module_id populated. Section 3: clean. Section 4: PAYROLL-RUN consumes `onboarding_journeys`, `onboarding_document_collections`. Section 5: cross-relationship `pay_runs activated by onboarding_journeys` (79), `pay_runs finalized by onboarding_document_collections` (80) exist.

**WFM <-> PAYROLL (weight 3).** Wired pairs: 2 inbound (103, 426). Section 2: both have NULL source_module_id (WFM owes per B1-S8). Section 3: missing outbound PAYROLL -> WFM on `pay_run.calculated` to confirm hours accepted. Section 4: PAYROLL-RUN consumes `time_entries`, `absence_requests`. Section 5: no cross-relationship `time_entries feeds pay_runs` exists; should be added.

**Lighter neighbors:**

- **GRC <-> PAYROLL (weight 2).** Outbound 1153 and 415 have NULL target_module_id (GRC owes). No inbound. Cross-rels: none.
- **HRSD <-> PAYROLL (weight 2).** Outbound 416 wired (target=75); inbound 1118 has NULL target_module_id (PAYROLL owes per B1-S6). Cross-rels: none.
- **VMS <-> PAYROLL (weight 1).** Inbound 590 has NULL source and target module_id (both owed). Cross-rels: none.

**In-scope mechanical PATCH from pairwise (Bucket 1):** all covered in B1-S6, no additional mechanical patches surfaced.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | PATCH `domains.business_logic` to remove em-dash |
| B1-S2 | M7 hard fail, DELETE 5 sibling consumer DMDOs on PAYROLL-RUN, DELETE-or-PROMOTE 3 sibling consumer DMDOs on 91/93 (gated on B2-S1) |
| B1-S3 | PATCH 11 trigger_events to set `event_category` |
| B1-S4 | Author 8 new intra-PAYROLL `data_object_relationships` edges |
| B1-S5 | Author 6+ `users`-edge relationships |
| B1-S6 | PATCH 10 inbound + 1 outbound NULL FKs that PAYROLL owes |
| B1-S7 | Report-only, 13 outbound NULL target_module_id, schedule audits on PA / ERP-FIN / EXPENSE / GRC / HCM |
| B1-S8 | Report-only, 4 inbound NULL source_module_id, schedule audits on WFM / VMS / EXPENSE |
| B1-S9 | E-band, author 5 PAYROLL roles + 12 baseline + ~17 workflow-gate permissions + role_modules + role_permissions |
| B1-S10 | F-band, author 4 per-module system skills + ~30-40 skill_tools, retire legacy `payroll-system` skill 21 |
| B1-S11 | F6, author 24+ `data_object_aliases` rows on PAYROLL masters |
| B1-S12 | C1 advisory, add HR (3) as contributor + IT as consumer on `business_function_domains` |
| B1-H1 | APQC TAGGING, propose 41 `agent_curated` rows (FLIP 8 existing + INSERT 33 new) |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M7 architectural choice for PAYROLL module deployability.** B1-S2 surfaces 8 sibling consumer DMDO rows that violate M7 within-domain incoherence. 5 of them (on PAYROLL-RUN) clearly route to DELETE since PAYROLL-RUN is the consumer-of-many-masters runtime, not a deployable shell. The other 3 (`pay_runs` consumed by PAYROLL-TAX-COMPLIANCE / PAYROLL-EMPLOYEE-PAY-STATEMENTS, `payroll_journal_entries` consumed by PAYROLL-TAX-COMPLIANCE) raise a real question: can a customer deploy PAYROLL-TAX-COMPLIANCE standalone without PAYROLL-RUN? Flagship vendors all bundle tax compliance with pay run execution; standalone tax-compliance is implausible. Similarly standalone PAYROLL-EMPLOYEE-PAY-STATEMENTS without PAYROLL-RUN has nothing to publish. Recommendation: DELETE all 8 rows; sibling modules read by reference, not via local shells. | Architectural intent + deployability strategy decision; user's call. | (a) DELETE all 8 sibling consumer rows. (b) PROMOTE 3 sibling consumers (`pay_runs` on 91 + 93, `payroll_journal_entries` on 91) to `embedded_master` for standalone deployment story. (c) Mixed (specify per row). |
| B2-S2 | **Pay-run approver pattern flag.** `pay_runs.has_single_approver` is currently `true`. Flagship vendors actually model pay-run approval as a multi-approver chain in larger orgs (Pay-Comp -> Manager -> Finance). Should the flag be flipped to `false`? Conversely `payroll_journal_entries.has_single_approver` is `false` but financial controls typically demand a single named approver per journal. Should it be `true`? Also `pay_slips.has_personal_content` is `true` (correct), but the matching `pay_runs.has_personal_content` is `false` even though the entity carries employee-pay tax detail; reconsider. Specifically: (a) `pay_runs.has_single_approver` -> false?, (b) `payroll_journal_entries.has_single_approver` -> true?, (c) `pay_runs.has_personal_content` -> true? | Pattern flags are workflow-shape judgments. | Per-flag yes / no from user. |
| B2-S3 | **Regulation coverage scope.** Loaded `domain_regulations` covers FLSA + ACA + GDPR. The flagship vendor surface implies the regulation list should also include: FICA / SECA, FUTA / SUTA, IRC Subtitle C (US federal payroll tax), state wage payment laws, HMRC RTI (UK), CRA T4 (Canada), DSGVO / GoBD (DE), KSA WPS (Saudi), Singapore CPF, EU PWD. Add now, or surface as Bucket 3 candidates for vendor verification first? | Regulation surface depends on the catalog's policy on geographic breadth vs. US-centric. | (a) Add the listed regulations now as Bucket 1 fixes; (b) Defer to Bucket 3 / Phase 0 for vendor verification; (c) Add only the US federal anchors (FICA/SECA/FUTA/SUTA/IRC) and defer non-US to a later geo-expansion pass. |
| B2-S4 | **Year-end statements as a distinct entity vs. attribute on pay_slips.** Flagship vendors (ADP, Paychex, Workday, Gusto) model W2 / 1099 / T4 / P60 / Lohnsteuerbescheinigung / Form 16 as a distinct entity from `pay_slips` (different lifecycle, different statutory rules, different distribution). Currently the catalog has zero year-end statement entities. Should `year_end_statements` be a new master in PAYROLL-EMPLOYEE-PAY-STATEMENTS? | The entity boundary is a modularization judgment. | (a) Yes, add `year_end_statements` master in PAYROLL-EMPLOYEE-PAY-STATEMENTS, surface as Bucket 1 once approved; (b) No, year-end is a `pay_slips` subtype; (c) Defer to Bucket 3 for Phase 0. |
| B2-S5 | **Multi-jurisdiction tax engine modelization.** The capability `PAYROLL-GLOBAL` is linked to PAYROLL-RUN + PAYROLL-TAX-COMPLIANCE but no entity captures the per-country / per-jurisdiction tax kernel as a structured catalog row. Flagship global payroll vendors (CloudPay, Papaya, ADP GlobalView, Deel, Remote) model `country_payroll_engines` or `jurisdiction_tax_configs` as a first-class entity. Add now, or defer to Phase 0? | Modularization judgment, will likely produce a new module CLOUDPAY-class. | (a) Add `jurisdiction_tax_configs` master under PAYROLL-TAX-COMPLIANCE; (b) Defer to Bucket 3 / Phase 0; (c) Reject as out-of-scope (the catalog is US-centric by intent). |
| B2-S6 | **`domains.notes` pointer policy.** PAYROLL `notes` is empty. Should it be updated post-audit with the standard one-line pointer to this audit file per `audits/README.md` (e.g. "Last validated 2026-05-30. M7 hard-fail, E and F bands missing. See `audits/PAYROLL.md`.")? Rule #15 requires explicit user-approved wording. | The notes-pointer policy is optional and the wording requires explicit approval. | (a) Supply user-approved wording for the pointer. (b) Skip the pointer for now. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against the flagship-vendor list above. The compliance and entity-surface candidates below come from the analyst's flagship-vendor knowledge; they are candidates for Phase 0 verification, not vetted findings.

#### MISSING entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `year_end_statements` | ADP, Paychex, Workday, Gusto, Paylocity all model W2 / W2c / 1099 / 1099-NEC / T4 / P60 / Lohnsteuerbescheinigung / Form 16 as a distinct entity from `pay_slips` (different lifecycle: generated -> furnished -> corrected -> filed, different statutory rules, separate distribution channel). | new master in PAYROLL-EMPLOYEE-PAY-STATEMENTS or new module PAYROLL-YEAR-END |
| `retro_pay_adjustments` | Every flagship US vendor models retroactive pay corrections as a structured record (effective-date-back-dated change that produces a delta on the next pay_run). Currently no entity. | new master in PAYROLL-RUN or PAYROLL-EARNINGS-DEDUCTIONS |
| `jurisdiction_tax_configs` (or `country_payroll_engines`) | CloudPay, Papaya, ADP GlobalView, Deel, Remote model per-country statutory kernels as first-class records (rate tables, calendar rules, statutory-filing schemas). PAYROLL-GLOBAL capability has no entity-level representation. | new master in PAYROLL-TAX-COMPLIANCE or new module PAYROLL-GLOBAL |
| `bank_payment_files` (or `direct_deposit_files`) | NACHA / ACH file generation (US), BACS / Faster Payments (UK), SEPA (EU) is a first-class artifact in every flagship vendor. Currently `pay_run.disbursed` event implies the file exists but no entity captures it. | new master in PAYROLL-RUN |

#### MODULARIZATION candidates

- **PAYROLL-YEAR-END as a new module.** If `year_end_statements` is loaded, it warrants its own module: distinct lifecycle, distinct compliance windows, distinct employee-facing UX. Would push PAYROLL from 4 to 5 modules.
- **PAYROLL-GLOBAL as a new module.** If `jurisdiction_tax_configs` is loaded, the multi-country capability could be a separate module masters the country-engine catalog and embeds `pay_runs` / `tax_filings`. Would push PAYROLL to 5-6 modules.

#### Compliance regulation candidates

- **FICA / SECA (US federal social-insurance tax)** -- mandatory.
- **FUTA / SUTA (US unemployment tax)** -- mandatory.
- **IRC Subtitle C (US federal payroll tax)** -- mandatory.
- **HMRC RTI (UK Real-Time Information)** -- mandatory for UK payroll.
- **CRA T4 (Canada)** -- mandatory for Canadian payroll.
- **DSGVO / GoBD (Germany)** -- mandatory for German payroll storage.

#### Candidate-domain queue

This audit surfaced 0 domain-tier candidates for `audits/_missing-domains.md`; every MISSING candidate above is an entity / capability extension of PAYROLL rather than a new domain.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces `c:/tmp/PAYROLL-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 4 entity candidates + 6 regulation candidates + 2 modularization candidates to treat as confirmed).

### Cross-bucket dependencies

- **B1-S2 is gated on B2-S1**: the DELETE vs PROMOTE choice for the 3 deployability-borderline sibling consumer rows must come from the user before the M7 fix loads. The 5 PAYROLL-RUN-side rows can execute immediately as DELETEs.
- **B1-S4** (intra-domain relationships) is independent of all other Bucket 1 items.
- **B1-S5** (users-edges) is independent.
- **B1-S9** (E-band roles + permissions) partially depends on **B1-S3** since workflow-gate permission verbs derive from lifecycle states; the events must carry proper `event_category` first. Also depends on B1-S10 (per-module system skills) being authored at the same load wave so the role bundles can grant the right scopes.
- **B1-S10** (per-module system skills) is partially gated on **B1-S4** + **B1-S5**: skill tools should not be authored against masters that have no relationship graph because the tool surface (`query_<entity>`, `update_<entity>`) requires the right joins to be discoverable.
- **B1-H1** (APQC TAGGING) is independent.
- **B3 MISSING entities** would inform **B2-S2/S4/S5** (pattern flags on year_end_statements, etc.) and would likely add ~10-15 more APQC tag rows. Calling this out per the surface-time discipline.
- **B2-S3** (regulation coverage) is independent of Bucket 1 but informs Bucket 3 (#5/#6 regulation candidates).
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S3, S6, S11, H1-top20`), or `skip`.

- **S1 (em-dash in business_logic)** is trivial; one PATCH.
- **S2 (M7 hard fail)** is gated on B2-S1; resolve that first.
- **S3 (event_category PATCH on 11 events)** is trivial; one PATCH each.
- **S4 (8 new intra-PAYROLL relationships)** structural; no other dependencies.
- **S5 (users-edges)** structural; no dependencies.
- **S6 (PATCH 11 NULL FKs that PAYROLL owes)** mechanical; one PATCH each.
- **S7 / S8 (B10b report-only)** schedules audits on PA / ERP-FIN / EXPENSE / GRC / HCM / WFM / VMS; not PAYROLL's fix.
- **S9 (E-band roles + permissions)** non-trivial; ~5 roles + ~29 permissions + ~25-35 junction rows. Stage through Phase E loader; depends on S10.
- **S10 (F-band per-module system skills)** non-trivial; ~4 skills + ~30-40 `skill_tools`. Stage through Phase S loader; depends on S4/S5.
- **S11 (24+ aliases)** mechanical; standard alias loader.
- **S12 (C1 advisory, +HR contributor +IT consumer)** trivial; 2 inserts.
- **H1 (41 APQC tags including 8 FLIP + 33 new)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (M7 architectural choice):** (a) DELETE all 8, (b) PROMOTE 3 to embedded_master, (c) mixed (specify per row).
- **B2-S2 (pattern flag re-evaluation):** per-flag yes / no on (a) `pay_runs.has_single_approver` -> false, (b) `payroll_journal_entries.has_single_approver` -> true, (c) `pay_runs.has_personal_content` -> true.
- **B2-S3 (regulation coverage):** (a) Add all listed now; (b) Defer to Bucket 3; (c) Add US federal only.
- **B2-S4 (year_end_statements as distinct entity):** (a) Yes new master; (b) No, attribute; (c) Defer to Bucket 3.
- **B2-S5 (jurisdiction tax engine entity):** (a) Add `jurisdiction_tax_configs`; (b) Defer; (c) Reject.
- **B2-S6 (domains.notes pointer):** (a) Supply user-approved wording; (b) Skip.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 4 entity candidates + 6 regulation candidates + 2 modularization candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| HCM | B10b: populate `target_domain_module_id` on outbound handoffs 412 (`pay_cycle.closed` -> HCM, payload pay_slips), 1154 (`pay_slip.published` -> HCM). |
| PA (People Analytics) | B10b: populate `target_domain_module_id` on outbound 25, 102, 1155 (all PAYROLL -> PA). Add `consumer + required` DMDO on `pay_runs` (138), `pay_slips` (139), `people_kpis` on the receiving PA module. |
| ERP-FIN | B10b: populate `target_domain_module_id` on outbound 99, 1151, 1152, 414. Add `consumer + required` DMDO on `payroll_journal_entries` (145) and `payment_runs` (205) on the receiving ERP-FIN module. |
| EXPENSE | B10b: populate `target_domain_module_id` on outbound 101 and 1157; populate `source_domain_module_id` on inbound 599. Add `consumer + required` DMDO on `pay_slips` on the receiving EXPENSE module. |
| GRC | B10b: populate `target_domain_module_id` on outbound 1153 (garnishment_order.received) and 415 (tax_filing.submitted). Add `consumer + required` DMDO on `garnishment_orders` (144) and `tax_filings` (143). |
| WFM | B10b: populate `source_domain_module_id` on inbound 103 (pay_period.closed) and 426 (meal_break_record.violated). |
| VMS | B10b: populate `source_domain_module_id` on inbound 590 (contingent_timesheet.approved). |
| ATS | Confirm `source_domain_module_id` on 401 (background_check.cleared) and 404 (candidate_referral.bonus_earned) point at the right ATS modules. |
| HRSD | Confirm `source_domain_module_id` on 1118 (hr_case.escalated_to_payroll). |
| BEN-ADMIN | Confirm `source_domain_module_id` on 108 / 110 / 188 / 417 / 423. |
| COMP-MGMT | Confirm `source_domain_module_id` on 105 / 187 / 1126 / 1140. |
| ONBOARDING | Confirm `source_domain_module_id` on 7 and 411. |

### Decisions

_(awaiting user feedback per the explicit-prompt discipline above)_

## 2026-05-31, Continuation: B1 technical fixes

Subagent applied the truly-mechanical subset of B1 items per the technical-fix scope (PATCH enum backfills, B10b FK PATCHes derivable from existing modules, INSERT user-edge `data_object_relationships` Rule #10). All other B1 items deferred to user judgment for the reasons below.

Loader: [`.tmp_deploy/fix_payroll_b1_technical_2026_05_31.ts`](../.tmp_deploy/fix_payroll_b1_technical_2026_05_31.ts).

### Applied (29 writes total)

- **B1-S1** PATCH `domains.id=55` `business_logic`: em-dash replaced with colon. New value: `Tax tables, gross-to-net calculation, garnishment logic, statutory filings, and country-specific compliance kernels: irreducible and continuously updated.`
- **B1-S3** PATCH 11 `trigger_events.event_category` (ids 402..412), per the audit's pre-specified per-row enum (`lifecycle` for 402/406/411, `state_change` for the other 8).
- **B1-S5** INSERT 7 user-edge `data_object_relationships` from users (748) to PAYROLL masters: pay_runs / tax_filings / garnishment_orders / payroll_journal_entries / pay_slips / earning_codes / deduction_codes. Owner_side=source, type=one_to_many, kind=reference, is_required=false. `record_status` omitted (DB default `new`). Inserted row ids 1879..1885. The audit's hedged `pay_runs -> users (approved_by, optional inverse)` was held.
- **B1-S6** PATCH 10 inbound handoffs `target_domain_module_id` (ids 105, 108, 110, 417, 423, 426, 590, 599, 1118, 1126). Routes to module 90 (PAYROLL-RUN) for ops events and module 92 (PAYROLL-EARNINGS-DEDUCTIONS) for comp / benefit / equity events per the audit's per-row mapping. Handoff 414 (`payment_run.executed` outbound `source_domain_module_id`) held: audit text reads "Confirm or surface as Bucket 2".

### Deferred

- **B1-S2 (M7 DELETEs)**: Per-bucket prompt gates entire S2 on B2-S1 architectural choice. Even the 5 PAYROLL-RUN-side rows the cross-bucket-dependencies block calls "immediately executable" were held since the per-bucket prompt explicitly says "resolve B2-S1 first".
- **B1-S4 (8 intra-domain `data_object_relationships`)**: Not user-edges. The technical-fix scope only licenses Rule #10 user-edges; intra-domain master-to-master relationships are outside scope.
- **B1-S6 row 414**: audit hedge ("Confirm or surface as Bucket 2"), see Applied above.
- **B1-S7 / S8**: report-only, owed by other domains.
- **B1-S9 (E-band roles + permissions)**: full Phase E load; audit explicitly says "non-trivial load, stage through the standard Phase E loader, not a one-shot CLI block".
- **B1-S10 (F-band per-module system skills + skill_tools)**: full Phase S load; explicitly deferred.
- **B1-S11 (24+ aliases)**: bulk `data_object_aliases` inserts without per-row (`alias_name`, `data_object_id`, `solution_id`) tuples are deferred. Vendor-tagged aliases would also require `solution_id` resolution that the audit does not pre-specify.
- **B1-S12 (`business_function_domains` HR contributor + IT consumer)**: explicitly deferred per the technical-scope rules ("no new business_function_domains contributors/consumers").
- **B1-H1 (41 APQC tags)**: NOT cleanly resolvable. The audit's `external_id` references resolve to different `process_name` values in the live `processes` table than the audit's textual labels: 10522 -> `Manage reporting processes` (audit said "Pay employees"), 10510 -> `Review engagement and retention indicators` (audit said "Develop and manage compensation"), 10511 -> `Review compensation plan` (audit said "Manage employee compensation"), 10728 -> `Perform planning and management accounting` (audit said "Process general accounting"), 10464 -> `Negotiate offer` (audit said "Recruit, source, and select employees"), 10520 -> `Manage expatriates` (audit said "Manage employee inquiries"), 16437 -> `Manage Enterprise Risk, Compliance, Remediation, and Resiliency` (audit said "Manage business unit ethics and compliance"). The PCF specifications fail the "resolvable PCF (verify before insert)" technical gate. Also: 5 handoffs (103, 426, 590, 1118, 416) already carry `agent_curated` `handoff_processes` rows loaded since the audit was written, so the proposed FLIP/INSERT counts are stale. User judgment required.

### Verification

Post-apply GETs confirmed all 29 writes landed: domain 55 business_logic clean (no em-dash), 11 trigger_events carry the new `event_category` values, 7 user-edge `data_object_relationships` exist with `record_status='new'` (ids 1879..1885), 10 handoffs now have `target_domain_module_id` populated (5 to module 90, 5 to module 92).

No JWT-audience errors during the run.

## 2026-05-31, Audit

Structural Validate b1 audit, fresh pass against live catalog. Focus bands: A, M, B (B5/B7/B9/B9b/B10b/B11/B12), C, D, E (E1-E5), F (F1-F5), H.

### Summary

- **Current footprint:** 4 full modules (PAYROLL-RUN 90, PAYROLL-TAX-COMPLIANCE 91, PAYROLL-EARNINGS-DEDUCTIONS 92, PAYROLL-EMPLOYEE-PAY-STATEMENTS 93). 8 PAYROLL-owned masters (`pay_runs` 138, `pay_slips` 139, `earning_codes` 140, `deduction_codes` 141, `tax_authorities` 142, `tax_filings` 143, `garnishment_orders` 144, `payroll_journal_entries` 145) plus `employees` (31, HCM-mastered) as `embedded_master + required` on all 4 modules and `hcm_positions` (32) / `org_units` (34) / `cost_centers` (196) as `embedded_master` on PAYROLL-RUN. 5 capabilities (GROSS-TO-NET, TAX-FILING, PAYROLL-GLOBAL, PAY-DISTRIBUTION, GARNISHMENTS). 16 solutions (8 primary, 7 secondary, 1 secondary). 24 trigger_events on PAYROLL masters (all carry `event_category` after 2026-05-31 continuation fix). 17 outbound + 24 inbound cross-domain handoffs (41 cross-domain). 7 intra-domain handoffs. 28 lifecycle states across 5 of 8 masters. 7 `data_object_relationships` user-edges (users 748 -> PAYROLL masters, ids 1879-1885, `record_status=new`). 0 aliases on PAYROLL masters. 1 legacy `payroll-system` skill (id 21, `domain_module_id=null`) with 14 `skill_tools` (9 query + 3 mutate + 2 side_effect). 0 PAYROLL-prefixed roles, role_modules, or permissions. 17 of 41 cross-domain handoffs carry `handoff_processes` rows (9 `agent_curated`, 5 `discovery_substring`/`discovery_override`, 3 broad L2 override).
- **Structural pass bands:**
  - **A1 pass** (no em-dash in `domains.business_logic` after 2026-05-31 fix).
  - **A2/A3 pass** (domain metadata complete: crud_percentage=30, min_org_size populated, cost_band=$$$, certification_required=true, usa_market_size_usd_m=8000, market_size_source_year=2025; description has no vendor names).
  - **M1/M2/M4/M6 pass** (4 full modules for 5 capabilities, well above Rule #14 floor; cross-cutting host junctions cover all 4 modules).
  - **M7 hard-fail unchanged from prior audit:** 8 sibling `master + consumer` DMDO rows still violate within-domain coherence (DMDO ids 461, 462, 463, 464, 465 on PAYROLL-RUN; 470, 471 on PAYROLL-TAX-COMPLIANCE; 482 on PAYROLL-EMPLOYEE-PAY-STATEMENTS). Gated on B2-S1 from prior audit.
  - **B5 pass** (every `embedded_master` data_object has a `master` row somewhere: `employees` mastered by HCM-CORE-WORKER 54, `hcm_positions` / `org_units` mastered by HCM, `cost_centers` mastered by ERP-FIN).
  - **B7 status updated:** 7 user-edge `data_object_relationships` rows now exist (ids 1879..1885) for pay_runs / tax_filings / garnishment_orders / payroll_journal_entries / pay_slips / earning_codes / deduction_codes. Two refinements pending: (a) no `users` DMDO row on PAYROLL modules even though the relationships point at `users` 748; deploy correctness needs `domain_module_data_objects` rows for `users` as `consumer + required` on each PAYROLL module per Rule #10's edge-and-DMDO pairing; (b) the audit hedge `pay_runs -> users (approved_by inverse)` remains unauthored.
  - **B9 pass** (all 24 `trigger_events` on PAYROLL masters carry a valid `event_category` value after prior fix; spot check of ids 402..412, 1240..1248 confirms `lifecycle` or `state_change`).
  - **B9b pass** (7 intra-domain handoffs cover the 4-module spine: 92->90 for earning/deduction/garnishment lifecycle; 90->93 for pay_run.calculated/disbursed -> pay_slips; 90->91 for pay_run.approved -> tax_filings; 91->90 for tax_authority.rate_changed -> pay_runs).
  - **B10b status updated:** PAYROLL-owed FK gap closed for the 10 inbound rows the prior audit identified (target_module_id now populated on 105/108/110/417/423/426/590/599/1118/1126, routed to modules 90 or 92). Remaining gaps: outbound handoffs 25/102/1155 (target=PA, NULL target_module_id) and 99/1151/1152/414/101/1157/1153/1154/412/415 (NULL target_module_id, owed by PA, ERP-FIN, EXPENSE, GRC, HCM). Inbound 103/426/590/599 (NULL source_module_id, owed by WFM, VMS, EXPENSE). Outbound 414 still has NULL `source_domain_module_id` (PAYROLL owes; hedged in prior audit).
  - **B11 pass** for `embedded_master` integrity (all 4 embedded_master shells have a canonical master elsewhere). No starter modules to evaluate Rule #19.
  - **B12 partial-fail:** Lifecycle states present for 5 of 8 PAYROLL-owned masters (`pay_runs`, `pay_slips`, `tax_filings`, `garnishment_orders`, `payroll_journal_entries`). Missing on `earning_codes` (140), `deduction_codes` (141), `tax_authorities` (142). These are config-shape masters (Rule #12 exemption candidates: author-once, occasionally-edit reference tables; `record_status` is the only meaningful state). Two of the three masters carry deactivation events (`earning_code.deactivated` 1247, `deduction_code.deactivated` 1248), so they have at least an `active -> deactivated` arc that is currently unmodeled. Lifecycle should be authored or the config-shape exemption should be surfaced to the user.
  - **C1 status unchanged from prior audit:** Only Payroll (owner), Accounting (contributor), Finance (contributor) on `business_function_domains`; Human Resources contributor + Information Technology consumer remain missing.
  - **D pass** on regulation breadth at the chosen US scope (FLSA / ACA / GDPR). Broader regulation coverage queue (FICA/SECA, FUTA/SUTA, IRC Subtitle C, HMRC RTI, CRA T4, DSGVO/GoBD) remains in Bucket 3 per prior audit.
  - **E-band hard-fail unchanged:** 0 PAYROLL-prefixed permissions (`permissions.domain_module_id in (90,91,92,93)` returns empty). 0 `role_modules` rows on PAYROLL modules. No `permission_name=ilike.PAYROLL*` rows anywhere. Entire role + permission layer is absent. 21 lifecycle states carry `requires_permission=true` and would materialize `<module>:<verb>_<entity>` permissions; one explicit override on state 47 (`pay_pay_run`) confirms the schema is wired but no permissions exist.
  - **F1/F2/F3/F4/F5 hard-fail unchanged:** Skill 21 (`payroll-system`, `skill_type=system`, `domain_module_id=null`) is the only PAYROLL system skill and remains from pre-modular era. Rule #17 requires exactly one `skill_type=system` skill per `domain_modules` row, so PAYROLL needs 4 per-module system skills (PAYROLL-RUN, PAYROLL-TAX-COMPLIANCE, PAYROLL-EARNINGS-DEDUCTIONS, PAYROLL-EMPLOYEE-PAY-STATEMENTS). The legacy skill's 14 tool surface (9 query + 3 mutate + 2 side_effect: query_pay_runs/pay_slips/pjes/tax_filings/employees/earning_codes/deduction_codes/garnishment_orders/tax_authorities, create_pay_run, generate_pay_slips, file_tax_return, execute_payment, send_email) covers the union surface and can be redistributed cleanly. F4 invariants (operation_kind <-> data_object_id) all check on the existing tool rows. F5 (Semantius score) remains uncomputable.
  - **H1 partial-progress** (catalog quality headline): 17 of 41 cross-domain handoffs carry `handoff_processes` rows (~41%). Of those 17: 9 `agent_curated` (100/108/110/188/417/1156/103/590/1118/416/426 - 11 rows actually), 5 `discovery_substring`/`discovery_override` (374/18/366 at L2 broad, 1126/101 at L2/L4, 7 at L5 mis-match `Create customer journey maps`). Zero rows at `record_status=approved`. 24 cross-domain handoffs remain completely untagged (411 ONBOARDING; 7 ONBOARDING weakly tagged at L5; 377/380/383 HCM employment_event/contract handoffs; 401/404 ATS background_check/candidate_referral; 25/102/1155 PAYROLL->PA; 1151/1152/99 PAYROLL->ERP-FIN; 415/1153 PAYROLL->GRC; 412/1154 PAYROLL->HCM; 1157/101 PAYROLL->EXPENSE second-pass; 187/423/105 COMP-MGMT->PAYROLL; 1140 COMP-MGMT->PAYROLL earning_code.created; 413 PAYROLL->BEN). Volume target per H1 (0.5N to 0.8N for N=41) = 21 to 33 `agent_curated` tags. Currently at 11 `agent_curated`, so the gap is 10 to 22 more rows.

PAYROLL Semantius score: **uncomputable** until F2 / F3 land.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S2 | **M7 hard-fail unchanged** | 8 sibling `master + consumer` DMDO rows: ids 461 (90,140), 462 (90,141), 463 (90,144), 464 (90,142), 465 (90,139), 470 (91,138), 471 (91,145), 482 (93,138). 5 PAYROLL-RUN-side rows are clean DELETEs (PAYROLL-RUN is the cross-master runtime consumer, not a deployable shell). 3 rows on 91/93 (pay_runs/payroll_journal_entries consumed by sibling modules) carry the open architectural choice (DELETE vs PROMOTE to `embedded_master` for standalone deployability story). | Per-bucket prompt gates entire B1-S2 on B2-S1 architectural decision. |
| B1-S4 | **B6 intra-domain relationships missing** | Only 4 `data_object_relationships` rows tie PAYROLL masters to each other (via the BEN/COMP/WFM consumers; no direct PAYROLL-master-to-PAYROLL-master edges exist beyond row 121 `garnishment_orders deducts_via deduction_codes` and id 140 `benefit_enrollments posts_to payroll_journal_entries`). Expected intra-PAYROLL spine: `pay_runs produces pay_slips` (1:N required), `pay_runs books payroll_journal_entries` (1:N required), `pay_runs feeds tax_filings` (1:N required), `tax_authorities scopes tax_filings` (1:N required), `earning_codes contributes_to pay_slips` (M:N required), `deduction_codes contributes_to pay_slips` (M:N required), `garnishment_orders deducts_via pay_runs` (1:N required), `pay_slips evidences payroll_journal_entries` (1:1 optional). | Author 8 `data_object_relationships` rows via cluster-drafts loader. |
| B1-S6r | **B10b PAYROLL still owes handoff 414** | Outbound 414 (`payment_run.executed` -> ERP-FIN, payload `payment_runs`) has NULL `source_domain_module_id` and NULL `target_domain_module_id`. Source side is PAYROLL's debt; target side is ERP-FIN's. The audit hedged in prior pass and surfaced for user. Proposed `source_domain_module_id=90` (PAYROLL-RUN; `pay_run.disbursed` 405 is the proximate cause of `payment_run.executed`). | PATCH handoff 414 `source_domain_module_id=90`. ERP-FIN-side target_module_id remains its B10b debt. |
| B1-S7 | **B10b report-only outbound (owed by other domains)** | 10 outbound handoffs with NULL `target_domain_module_id`: 25/102/1155 (PA), 99/1151/1152/414 (ERP-FIN), 101/1157 (EXPENSE), 1153 (GRC), 1154/412 (HCM), 415 (GRC). | Schedule b1 audits on PA, ERP-FIN, EXPENSE, GRC, HCM. |
| B1-S8 | **B10b report-only inbound (owed by source domains)** | 4 inbound with NULL `source_domain_module_id`: 103/426 (WFM), 590 (VMS), 599 (EXPENSE). | Schedule b1 audits on WFM, VMS, EXPENSE. |
| B1-S9 | **E-band hard-fail unchanged** | 0 PAYROLL roles, 0 role_modules on 90..93, 0 permissions on 90..93. Need 5 roles (PAYROLL-ADMINISTRATOR, PAYROLL-MANAGER, TAX-COMPLIANCE-OFFICER, GARNISHMENT-SPECIALIST, HR-PARTNER), 12 baseline permissions (`<module>:read/manage/admin` x 4), ~17 workflow-gate permissions derived from lifecycle states with `requires_permission=true` (calculating/calculated/approved/paid/closed/cancelled on pay_runs, published/amended/archived on pay_slips, submitted/approved/filed/accepted/rejected/amended on tax_filings, active/suspended/released/exhausted on garnishment_orders, submitted/posted/reversed/rejected on payroll_journal_entries; minus the 1 explicit override on state 47 already encoded as `pay_pay_run`). | Stage through Phase E loader. Partially depends on B1-S10. |
| B1-S10 | **F2/F3/F5 hard-fail unchanged** | 1 legacy `payroll-system` skill (id 21, domain_module_id=null) with 14 skill_tools. Need 4 per-module system skills, each with skill_tools covering query + mutate (+ side_effect/notify where applicable). Estimate ~30-40 skill_tools across the 4 skills after redistribution of the legacy skill's surface. Sunset legacy skill 21 after the 4 per-module skills land. | Stage through Phase S loader. Depends on B1-S4 / B1-S5 / Rule #10 users DMDO. |
| B1-S11 | **F6 zero `data_object_aliases` on every PAYROLL master** | All 8 PAYROLL masters carry zero aliases. Vendor-terminology surface ready: pay_runs (`payroll runs`, `pay cycles`), pay_slips (`paystubs`, `pay statements`, `paychecks`, `wage statements`, UK `payslips`), earning_codes (`pay codes`, `earnings types`), deduction_codes (`benefit deduction codes`, `pre-tax deductions`, `post-tax deductions`), tax_authorities (`taxing authorities`, `tax jurisdictions`, `revenue agencies`), tax_filings (`statutory filings`, `941`, `W2`, `1099`, `T4`, `RTI submissions`), garnishment_orders (`wage garnishments`, `wage attachments`, `court orders`, UK `attachment of earnings orders`), payroll_journal_entries (`payroll journals`, `payroll GL entries`, `payroll postings`). | Author ~24 alias rows via aliases loader. |
| B1-S12 | **C1 advisory unchanged** | `business_function_domains` for PAYROLL has 3 rows (Payroll owner, Accounting contributor, Finance contributor). Human Resources contributor and Information Technology consumer remain to be added. | Author 2 rows. |
| B1-S13 | **B7 Rule #10 follow-on: `users` DMDO rows missing on PAYROLL modules** | The 7 user-edge `data_object_relationships` (1879..1885) exist, but `users` (748) has no `domain_module_data_objects` row on PAYROLL-RUN (90), PAYROLL-TAX-COMPLIANCE (91), PAYROLL-EARNINGS-DEDUCTIONS (92), or PAYROLL-EMPLOYEE-PAY-STATEMENTS (93). Rule #10 expects both the edge AND the DMDO `consumer` row so the platform-builtin master is reachable from each module's deploy surface. | INSERT 4 DMDO rows: (90,748,consumer,required), (91,748,consumer,required), (92,748,consumer,required), (93,748,consumer,required). |
| B1-S14 | **B12 lifecycle decision for config-shape masters** | `earning_codes` (140), `deduction_codes` (141), `tax_authorities` (142) have no lifecycle states. Rule #12 config-shape exemption applies if these are author-once / occasionally-edit reference tables. But 1247 (`earning_code.deactivated`) and 1248 (`deduction_code.deactivated`) trigger events exist, implying at minimum an `active -> deactivated` arc. Author lifecycle states or surface the exemption to the user (Rule #15 forbids `notes` auto-population). | Author lifecycle states (per master: `draft -> active -> deactivated`) or surface to user as Bucket 2 follow-on. |

#### APQC TAGGING

11 cross-domain handoffs already carry `agent_curated` rows from prior loads (100, 108, 110, 188, 417, 1156, 103, 416, 426, 590, 1118; all `record_status=new`). 6 carry `discovery_*` rows (374, 18, 366 at L2 override; 101, 1126 at L2/L4 substring; 7 at L5 mis-match). The audit proposes a single fix path per remaining gap:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | confidence |
|---|---|---|---|---|---|
| 7 | ONBOARDING -> PAYROLL-RUN | journey.day_one_reached | onboarding_journeys | REPLACE existing L5 customer-journey-maps with `Manage employee onboarding, training, and development` (20599) | confident L2 |
| 411 | ONBOARDING -> PAYROLL-RUN | onboarding_document_collection.completed | onboarding_document_collections | `Manage employee onboarding, training, and development` (20599) | confident L2 |
| 377 | HCM-CORE-WORKER -> PAYROLL-RUN | employment_event.recorded | employment_events | `Pay employees` (live PCF row id 1418 `Enter employee time worked into payroll system` is too narrow; the lifecycle event is `Manage and process payroll` parent) | medium |
| 380 | HCM-CORE-WORKER -> PAYROLL-EARNINGS-DEDUCTIONS | employment_contract.executed | employment_contracts | `Develop and manage compensation, rewards, and benefits` (10510 L2) or `Manage employee onboarding...` (20599) | medium |
| 383 | HCM-CORE-WORKER -> PAYROLL-EARNINGS-DEDUCTIONS | employment_contract.expired | employment_contracts | `Manage employee termination` (PCF id lookup pending) | medium |
| 401 | ATS -> PAYROLL-RUN | background_check.cleared | background_checks | `Recruit, source, and select employees` (10464 L2) | medium |
| 404 | ATS -> PAYROLL-EARNINGS-DEDUCTIONS | candidate_referral.bonus_earned | candidate_referrals | `Reward and retain employees` or `Pay employees` (PCF id lookup pending) | medium |
| 105 | COMP-MGMT -> PAYROLL-EARNINGS-DEDUCTIONS | merit_cycle.approved | merit_recommendations | `Develop and manage compensation` (10510 L2) | confident L2 |
| 187 | COMP-MGMT -> PAYROLL-EMPLOYEE-PAY-STATEMENTS | merit_cycle.approved | pay_slips | `Develop and manage compensation` (10510 L2) | confident L2 |
| 1126 | COMP-MGMT -> PAYROLL-EARNINGS-DEDUCTIONS | compensation_plan.published | compensation_plans | REPLACE existing `discovery_substring` with `Develop and manage compensation` (10510 L2) | confident L2 |
| 1140 | COMP-MGMT -> PAYROLL-EARNINGS-DEDUCTIONS | earning_code.created | earning_codes | `Develop and manage compensation` (10510 L2) | confident L2 |
| 423 | COMP-MGMT -> PAYROLL-EARNINGS-DEDUCTIONS | equity_grant.vested | equity_grants | `Develop and manage compensation` (10510 L2) | medium |
| 25 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> PA | pay_cycle.closed | people_kpis | `Analyze workforce performance and HR metrics` (PCF id lookup pending) | medium |
| 102 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> PA | pay_cycle.closed | pay_slips | `Analyze workforce performance and HR metrics` | medium |
| 1155 | PAYROLL-RUN -> PA | pay_run.disbursed | pay_runs | `Analyze workforce performance and HR metrics` | medium |
| 99 | PAYROLL-RUN -> ERP-FIN | pay_cycle.posted | payroll_journal_entries | `Process general accounting` (10728 L2 family) | confident L2 |
| 1151 | PAYROLL-RUN -> ERP-FIN | pay_run.disbursed | payroll_journal_entries | `Process general accounting` | confident L2 |
| 1152 | PAYROLL-RUN -> ERP-FIN | payroll_journal.reversed | payroll_journal_entries | `Process general accounting` | confident L2 |
| 414 | PAYROLL -> ERP-FIN | payment_run.executed | payment_runs | `Process accounts payable and expense reimbursements` (10733) | medium |
| 1157 | PAYROLL-RUN -> EXPENSE | pay_run.disbursed | expense_reports | `Process accounts payable and expense reimbursements` (10733) | confident L2 |
| 1153 | PAYROLL-EARNINGS-DEDUCTIONS -> GRC | garnishment_order.received | garnishment_orders | `Manage business unit compliance` (PCF id lookup pending) | medium |
| 415 | PAYROLL-TAX-COMPLIANCE -> GRC | tax_filing.submitted | tax_filings | `Manage tax planning and strategy` (PCF id lookup pending; may also be 16437 family) | medium |
| 412 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> HCM | pay_cycle.closed | pay_slips | `Pay employees` family | medium |
| 1154 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> HCM | pay_slip.published | pay_slips | `Pay employees` family | medium |
| 413 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> BEN-ADMIN | pay_cycle.closed | pay_slips | `Administer benefit enrollment` (10505 L4, existing pattern) | confident L4 |
| 18 | HCM-CORE-WORKER -> PAYROLL-RUN | employee.created | employees | KEEP existing L2 override `Manage employee onboarding...` (20599) or flip `agent_curated` after review | discovery_override existing |
| 366 | HCM-CORE-WORKER -> PAYROLL-RUN | employee.terminated | employees | KEEP existing L2 override or REPLACE with `Manage employee termination` (PCF lookup pending) | discovery_override existing |
| 374 | HCM-CORE-WORKER -> PAYROLL-RUN | employee.promoted | employees | KEEP existing L2 override or REPLACE with `Develop and manage compensation` | discovery_override existing |
| 101 | PAYROLL-EMPLOYEE-PAY-STATEMENTS -> EXPENSE | expense.reimbursable | pay_slips | KEEP existing `discovery_substring` L2 `Process accounts payable...` (10733) or FLIP to `agent_curated` after confirmation | existing |

The PCF `process_id` resolution for the `medium`-confidence rows requires a focused live lookup pass against `/processes` with the proposed `process_name` strings (prior audit attempted but several `external_id` values resolved to different node names in the live table, per the 2026-05-31 continuation defer note). Best handled as a small follow-on script that searches by `process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` for each row, lets the analyst pick from the result, and inserts `agent_curated` rows in chunked batches.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A/M/B/C/E/F band failures) | 10 (S2 gated, S4, S6r, S9, S10, S11, S12, S13, S14, H1-tagging) |
| BOUNDARY (NULL FK or missing handoff) | included in S6r/S7/S8 |
| APQC TAGGING | 1 line item (H1, ~24 individual tag proposals + 3 review flips) |
| MODULARIZATION ISSUES | 0 in Bucket 1 |
| **Bucket 1 total line items** | 10 |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 (carried) | M7 architectural choice for the 3 deployability-borderline sibling consumers: `pay_runs` (138) on 91 + 93, `payroll_journal_entries` (145) on 91. DELETE all (sibling modules read by reference, never deployed standalone) vs PROMOTE to `embedded_master` (standalone deploy story). Flagship vendors all bundle tax compliance with pay run execution, suggesting DELETE; statements-only deployments are also implausible. Recommendation: DELETE all 8. | Architectural intent + deployability strategy. | (a) DELETE all 8 (sibling reads via FK only); (b) PROMOTE the 3 borderline rows to `embedded_master`; (c) Mixed (specify per row). |
| B2-S2 (carried) | Pattern flag re-evaluation: (a) `pay_runs.has_single_approver` -> false?, (b) `payroll_journal_entries.has_single_approver` -> true?, (c) `pay_runs.has_personal_content` -> true? | Workflow-shape judgments. | Per-flag yes / no. |
| B2-S3 (carried) | Regulation coverage scope: add FICA / SECA / FUTA / SUTA / IRC Subtitle C / state wage payment / HMRC RTI / CRA T4 / DSGVO-GoBD / KSA WPS / Singapore CPF / EU PWD now as Bucket 1 fixes, or defer to Bucket 3 for vendor verification first? | Geographic breadth policy. | (a) Add all now; (b) Defer to Bucket 3; (c) Add US federal only (FICA/SECA/FUTA/SUTA/IRC). |
| B2-S4 (carried) | `year_end_statements` as a distinct master in PAYROLL-EMPLOYEE-PAY-STATEMENTS (W2/W2c/1099/1099-NEC/T4/P60/Lohnsteuerbescheinigung/Form 16), or attribute on pay_slips, or defer? | Entity boundary judgment. | (a) Add `year_end_statements` master; (b) Subtype on pay_slips; (c) Defer to Bucket 3. |
| B2-S5 (carried) | `jurisdiction_tax_configs` (or `country_payroll_engines`) as first-class master under PAYROLL-TAX-COMPLIANCE, given the PAYROLL-GLOBAL capability has no entity-level representation? | Modularization judgment. | (a) Add master; (b) Defer to Bucket 3; (c) Reject (US-centric by intent). |
| B2-S6 (carried) | `domains.notes` pointer policy: supply user-approved wording per Rule #15 to record the pointer to this audit file, or skip? | Rule #15 requires explicit text approval. | (a) Supply wording; (b) Skip. |
| B2-S7 (new) | Config-shape lifecycle decision for `earning_codes`, `deduction_codes`, `tax_authorities`. The 1247/1248 deactivation triggers imply at minimum an `active -> deactivated` arc. Author 3-state lifecycles (`draft -> active -> deactivated`), or accept the Rule #12 config-shape exemption (record_status is sufficient state). | Workflow-shape judgment about how strictly the catalog should model code-table lifecycle. | (a) Author 3-state lifecycle on each; (b) Accept config-shape exemption (no states); (c) Mixed (lifecycle on earning/deduction, exemption on tax_authorities). |
| B2-S8 (new) | E-band role-list scope. Prior audit proposed 5 roles (PAYROLL-ADMINISTRATOR, PAYROLL-MANAGER, TAX-COMPLIANCE-OFFICER, GARNISHMENT-SPECIALIST, HR-PARTNER). Is this the right scope, or should it be tighter (3 roles: admin/manager/specialist) or wider (add PAYROLL-AUDITOR / PAYROLL-DATA-STEWARD)? | Role decomposition is a deployment-policy decision. | (a) Use the proposed 5 roles; (b) Tighter 3-role set; (c) Wider 6+ role set (specify). |

### Bucket 3, Phase 0 pending (speculative)

All Bucket 3 candidates from the 2026-05-30 audit remain unresolved:

- `year_end_statements` master.
- `retro_pay_adjustments` master.
- `jurisdiction_tax_configs` / `country_payroll_engines` master.
- `bank_payment_files` / `direct_deposit_files` master.
- PAYROLL-YEAR-END as a new module (gated on the year_end_statements decision).
- PAYROLL-GLOBAL as a new module (gated on the jurisdiction_tax_configs decision).
- Regulation candidates: FICA/SECA, FUTA/SUTA, IRC Subtitle C, HMRC RTI, CRA T4, DSGVO/GoBD.

Bucket 3 verification path unchanged: vetted Phase 0 vendor research or eyeball-mode.

### Cross-bucket dependencies

- **B1-S2** gated on **B2-S1** (carried from prior audit).
- **B1-S9** depends on **B1-S10** (role bundles cite per-module system skills) and on **B2-S8** (role list scope).
- **B1-S10** depends on **B1-S4** (relationship graph drives tool discoverability) and **B1-S13** (users DMDO presence on each module is required for `query_user`-type tools).
- **B1-S14** is informed by **B2-S7** (user picks lifecycle vs exemption).
- **B1-S6r** (handoff 414 source) is independent of Bucket 2/3.
- **B1-H1** (APQC tagging) is independent of Bucket 2/3 but partial completion is gated on the PCF `process_id` lookup pass (analyst-driven `/processes` search per row).
- Bucket 2/3 are otherwise independent.

### Per-bucket prompts

- **Bucket 1, fix these now?** Reply: `all`, or list (e.g. `S4, S6r, S11, S12, S13, H1`), or `skip`.
- **Bucket 2, what's your call on each?** Per-item answer; B2-S1 gates B1-S2.
- **Bucket 3, Phase 0 pending: vet via formal Phase 0 vendor research, or eyeball-mode?**

### Report-only follow-ups (owed by other domains)

Unchanged from prior audit; routing table preserved for cross-domain visibility.

| Owing domain | Owed work |
|---|---|
| HCM | B10b populate `target_domain_module_id` on outbound 412 (`pay_cycle.closed` -> HCM, pay_slips), 1154 (`pay_slip.published` -> HCM, pay_slips). |
| PA | B10b populate `target_domain_module_id` on outbound 25, 102, 1155. Add `consumer + required` DMDO on `pay_runs` (138), `pay_slips` (139). |
| ERP-FIN | B10b populate `target_domain_module_id` on outbound 99, 1151, 1152, 414. Add `consumer + required` DMDO on `payroll_journal_entries` (145) and `payment_runs` (205). |
| EXPENSE | B10b populate `target_domain_module_id` on outbound 101 and 1157; populate `source_domain_module_id` on inbound 599. Add `consumer + required` DMDO on `pay_slips` on the EXPENSE module. |
| GRC | B10b populate `target_domain_module_id` on outbound 1153 (garnishment_order.received) and 415 (tax_filing.submitted). |
| WFM | B10b populate `source_domain_module_id` on inbound 103 (pay_period.closed) and 426 (meal_break_record.violated). |
| VMS | B10b populate `source_domain_module_id` on inbound 590 (contingent_timesheet.approved). |

### JWT errors

None during this audit pass. Every `semantius call crud postgrestRequest` returned cleanly.

### Decisions

_(awaiting user feedback per the explicit-prompt discipline)_

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
