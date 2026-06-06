# TALENT-MGMT audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 3 full modules (`TALENT-PERFORMANCE-MGMT` 51, `TALENT-SUCCESSION-CAREER` 52, `TALENT-CONTINUOUS-FEEDBACK` 53). 0 starter, 0 cross-cutting host. 7 masters: `performance_reviews` (174), `performance_goals` (175), `talent_calibrations` (177), `succession_plans` (176), `nine_box_placements` (178), `career_aspirations` (179), `feedback_records` (180). 6 capabilities, all linked to ≥1 realizing module (PERF-REVIEW + GOAL-MGMT + TALENT-CALIBRATION ⇒ module 51; SUCCESSION-PLAN + CAREER-DEV ⇒ module 52; CONTINUOUS-FEEDBACK ⇒ module 53). 14 solutions (7 primary, 7 secondary). 1 regulation (EU AI Act, mandatory applicability). 4 `business_function_domains` rows (Talent Development owner, Human Resources + Compensation contributor, Executive consumer). 6 outbound + 17 inbound cross-domain handoffs (23 cross-domain total). 0 intra-domain cross-module handoffs. 8 `trigger_events` on masters. 32 lifecycle states across all 7 masters; 12 with `requires_permission=true`. 25 aliases. 3 system skills + 14 `skill_tools` rows (Semantius score strict approximately 93%, single external is `sign_document`). 9 baseline-tier permissions (3 per module). 3 roles using TALENT-MGMT modules (HR-BUSINESS-PARTNER, PEOPLE-MANAGER, TALENT-DEVELOPMENT-TALENT-MANAGER) with 16 cross-module role_permissions.
- **Vendor-surface basis (Pass 2 flagship enumeration):** Workday Talent Optimization, SAP SuccessFactors Performance and Goals, Oracle Cloud HCM Talent, Cornerstone Performance, Lattice, 15Five, Betterworks, Culture Amp, Leapsome, Eightfold Talent Intelligence Platform. Specialist coverage for continuous-feedback shape via Lattice / 15Five / Leapsome / Culture Amp / Betterworks. Compliance anchor on EU AI Act (mandatory) per the calibration / 9-box / succession decision-support overlay; broader regulatory candidates considered in Bucket 3.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 11 items.

**Neighbor discovery** (handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| PA | 0 | 5 | 1 (PA-PREDICTIVE-MODELS derived on performance_reviews) | 0 | 6 | Pairwise (full) |
| HCM | 3 | 2 | 0 (consumes embedded employees / hcm_positions / org_units) | 1 (employees becomes career_aspirations) | 6 | Pairwise (full) |
| COMP-MGMT | 2 | 1 | 1 (COMP-PLANNING consumer on performance_reviews) | 0 | 4 | Pairwise (full) |
| LMS | 0 | 3 | 1 (LMS-PATHS consumer on performance_goals) | 1 (course_enrollments updates career_aspirations) | 5 | Pairwise (full) |
| SKILLS-MGMT | 1 | 1 | 1 (SKILLS-MGMT-PROFILE contributor on performance_goals) | 1 (skill_profiles feeds career_aspirations) | 4 | Pairwise (full) |
| TLNT-INTEL | 0 | 0 | 3 (TLNT-INTEL-MOBILITY consumer on career_aspirations / succession_plans / performance_goals) | 1 (career_aspirations informs career_path_suggestions) | 4 | Pairwise (full) |
| EMP-EXP | 0 | 1 | 0 | 1 (career_aspirations informs survey_responses) | 2 | Lightweight |
| WORK-MGMT | 0 | 2 | 0 (embedded okr_objectives on module 51) | 1 (performance_goals aligns_to okr_objectives) | 3 | Pairwise (full) |
| ATS | 0 | 1 | 0 | 0 | 1 | Lightweight |
| SPM | 0 | 1 | 0 (consumer business_value_assessments on module 51) | 0 | 1 | Lightweight |

**Structural pass bands:** A, B (positive checks except B9 / B9b), C, E (positive checks), F (positive checks except F7) all pass. **M7 hard-fails** (within-domain incoherence on `performance_reviews` and `talent_calibrations`, 3 consumer DMDO rows coexisting with their sibling-module master rows). **B9 partial-fail** (6 of 8 master trigger_events carry empty `event_category`). **B9b hard-fails** (0 intra-domain cross-module handoffs on a 3-module domain whose state machines clearly fan out). **H1 hard-fails** (4 of 23 cross-domain handoffs tagged; 2 `discovery_substring`, 2 `discovery_override`; zero `agent_curated`; zero `record_status='approved'`). **Rule #15 notes-pollution** on all 14 `skill_tools` rows across 3 system skills (auto-populated load-time prose, no per-row user-approved wording recorded). **B4 pattern-flag positive re-evaluation** surfaces 4 candidate flag flips (Bucket 2).

TALENT-MGMT Semantius score (strict): 13 / 14 `skill_tools` rows on `coverage_tier='platform'` (approximately 93%). The single gap is `sign_document` (tool 42, external, optional, linked on the TALENT-PERFORMANCE-MGMT system skill for review-acknowledgement signing in regulated industries). Operational score adds nothing further (no `integration`-tier rows).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 (hard fail), within-domain incoherence** | `performance_reviews` (174) is `role='master'` in TALENT-PERFORMANCE-MGMT (51) AND `role='consumer'` in TALENT-SUCCESSION-CAREER (52, necessity=required) and TALENT-CONTINUOUS-FEEDBACK (53, necessity=optional). `talent_calibrations` (177) is `role='master'` in TALENT-PERFORMANCE-MGMT (51) AND `role='consumer'` in TALENT-SUCCESSION-CAREER (52, necessity=required). M7 rejects master + consumer in sibling modules of the same domain. The agent default is DELETE the 3 sibling consumer rows (Performance-Mgmt is the authoritative home; Succession reads via the canonical reference for 9-box derivation and successor readiness, Continuous-Feedback reads via reference when feedback incorporates a review). The alternative is to promote each sibling `consumer` row to `embedded_master` if every TALENT module must be standalone-deployable. Standalone Succession-Career without Performance-Mgmt has nothing to calibrate or 9-box against, and standalone Continuous-Feedback without Performance-Mgmt has no annual cycle to feed; both embedded paths look weak. Surface the architectural choice as B2-S1; on user approval of DELETE, proceed in Bucket 1. | DELETE 3 `domain_module_data_objects` rows: (52, 174, consumer), (53, 174, consumer), (52, 177, consumer). |
| B1-S2 | **B9 missing event_category** | 6 of 8 `trigger_events` rows on TALENT-MGMT masters carry empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 443 `performance_goal.set`, 444 `performance_goal.completed`, 445 `succession_plan.published`, 446 `talent_calibration.completed`, 447 `nine_box_placement.updated`, 448 `feedback_record.created`. Existing populated rows: 14 `calibration.complete` (state_change), 130 `successor.tagged` (lifecycle). | PATCH: 443 → `lifecycle` (goal-set is a recurring lifecycle entry point), 444 → `state_change` (completed terminal state), 445 → `state_change`, 446 → `state_change`, 447 → `state_change`, 448 → `lifecycle` (feedback creation is the lifecycle entry, share-event is the gate). |
| B1-S3 | **B9b (hard fail), missing intra-domain cross-module handoffs** | A 3-module domain has 0 intra-domain handoff rows. Expected from the master relationship graph (relationships 929, 932, 933, 935, 936) and the published state machines: (a) PERFORMANCE-MGMT → SUCCESSION-CAREER on `talent_calibration.completed` (446) so calibrated ratings update `nine_box_placements`; (b) PERFORMANCE-MGMT → SUCCESSION-CAREER on `performance_review.published` (new event, see B1-S4) for the same 9-box derivation pathway; (c) CONTINUOUS-FEEDBACK → PERFORMANCE-MGMT on `feedback_record.shared` (new event, see B1-S4) so 1-on-1 / 360 feedback feeds the next review cycle; (d) PERFORMANCE-MGMT → SUCCESSION-CAREER on `performance_goal.completed` (444) for the career-development progress signal; (e) SUCCESSION-CAREER → SUCCESSION-CAREER on `nine_box_placement.confirmed` (new event, see B1-S4) when a confirmed placement triggers a new succession_plan revision. | Author 5 intra-domain handoff rows with `source_domain_id=target_domain_id=58`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`. Three of the five lean on existing events (446, 444, plus the published / shared / confirmed events from B1-S4). |
| B1-S4 | **B9, missing trigger_events for workflow-gate states** | Lifecycle states with `requires_permission=true` lack matching `trigger_events`: state 527 `performance_review.submitted`, state 528 `performance_review.calibrated`, state 529 `performance_review.published`, state 547 `succession_plan.reviewed`, state 548 `succession_plan.published` (event 445 exists, OK), state 549 `succession_plan.archived`, state 544 `talent_calibration.ratings_locked`, state 545 `talent_calibration.published`, state 552 `nine_box_placement.confirmed`, state 559 `feedback_record.shared`, state 533 `performance_goal.approved`, state 535 `performance_goal.completed` (event 444 exists, OK), state 536 `performance_goal.cancelled`. 11 missing events confirmed (susbtracting the 2 covered: 535 maps to 444, 548 maps to 445). | Insert 11 `trigger_events` rows, each `event_category='state_change'`, `data_object_id` pointing at the publishing master. The new `performance_review.published`, `feedback_record.shared`, `nine_box_placement.confirmed` events serve as triggers for B1-S3's intra-domain handoffs. |
| B1-S5 | **B10b report-only (outbound NULLs owed by other domains)** | 3 outbound handoffs carry NULL `target_domain_module_id`: 437 (HCM target on `succession_plan.published`), 438 (HCM target on `performance_goal.completed`), 441 (HCM target on `high_potential.identified`; this row also has NULL `source_domain_module_id`, see B1-S10). Per B10b's asymmetry rule the target module is the target domain's audit work. TALENT-MGMT's source FK is populated on every outbound row except 441. | Schedule b1 audits for HCM to derive `target_domain_module_id` per the standard B10b backfill procedure. |
| B1-S6 | **B10b report-only (inbound NULLs owed by source domains)** | 4 inbound handoffs carry NULL `source_domain_module_id` or NULL `target_domain_module_id`: 793 (SPM source, NULL source FK), 1108 (PA → TALENT-MGMT, NULL target FK), 1110 (PA → TALENT-MGMT, NULL target FK), 1113 (PA → TALENT-MGMT, NULL target FK). TALENT-MGMT owes the target FK on 1108 / 1110 / 1113 (this IS this domain's fix when the target side is clearly TALENT-MGMT). PA owes the source FK if any inbound row needs re-anchoring. | TALENT-MGMT side, in-scope mechanical PATCH: route the 3 PA inbounds to a target module on TALENT-MGMT. 1108 (`engagement.declining`, payload `engagement_surveys`) plausibly lands on CONTINUOUS-FEEDBACK (53) since engagement signal drives manager-employee feedback. 1110 (`attrition_risk.elevated`, payload `attrition_forecasts`) and 1113 (`predictive_model.deployed`, payload `predictive_models`) land on SUCCESSION-CAREER (52) since attrition risk drives successor-readiness reassessment and model-deployment notifies the AI-overlaid succession review. 793 owed by SPM (B10b owed). |
| B1-S7 | **B10b mechanical (outbound 441 NULL source)** | Handoff 441 (`high_potential.identified` → HCM workforce_segments) has NULL `source_domain_module_id`. Trigger event 64 fires from the 9-box workflow (it is the canonical `signal`-category event). The realizing module is TALENT-SUCCESSION-CAREER (52). | PATCH handoff 441 set `source_domain_module_id=52`. |
| B1-S8 | **F7 channel-primitive justification (advisory)** | `sign_document` (tool 42, side_effect, external) is linked on the TALENT-PERFORMANCE-MGMT system skill (137) with populated `notes`. Rule #15 forbids auto-populated `skill_tools.notes`, F7 requires the channel-primitive link be justified. Surface to user for decision (B2-S3 in Bucket 2). | Routed to B2-S3, not Bucket 1. Listed here only for traceability. |
| B1-S9 | **APQC TAGGING** | Only 4 of 23 cross-domain handoffs carry `handoff_processes` rows. **All 4 are non-`agent_curated`** (2 `discovery_substring`: 437, 1108; 2 `discovery_override`: 22, 376). Zero `record_status='approved'`. Volume expectation per SKILL H1: 0.5N to 0.8N for N=23 → 12 to 18 `agent_curated` tags. The audit proposes the candidate matrix below; PCF id lookups deferred to fix time per the standard `process_name=ilike.*<term>*` pattern. | INSERT 19 new `agent_curated` rows + REPLACE 2 weak `discovery_substring` rows after PCF lookup (437 keeps 982 "Develop succession plan" with `agent_curated` confirmation; 1108 keeps 250 "Conduct employee engagement surveys" with `agent_curated` confirmation, but the better activity is at L2 "Conduct employee engagement surveys" parent). |
| B1-S10 | **Pairwise consumer DMDOs report-only** | Several TALENT-MGMT-published events imply consumer DMDOs on receiving sides that do not exist: HCM consumes `performance_goals` (handoff 438) and `succession_plans` (437) but no HCM module declares the dependency; COMP-MGMT-COMP-PLANNING already declares `performance_reviews` consumer (clean); the PA inbound trio (1108/1110/1113) implies PA produces signals consumed by TALENT-MGMT, the corresponding `contributor` DMDOs on a TALENT-MGMT module are missing (engagement_surveys, attrition_forecasts, predictive_models). | Each target domain's b1 audit adds the corresponding consumer DMDO row. Not TALENT-MGMT's fix to make. |
| B1-S11 | **Pairwise modularization, missing TLNT-INTEL handoffs** | TLNT-INTEL (170) declares 3 consumer DMDOs on TALENT-MGMT masters (career_aspirations required, succession_plans optional, performance_goals optional) via TLNT-INTEL-MOBILITY (176), but zero handoffs exist between TLNT-INTEL and TALENT-MGMT. The consumer relationship implies at least an inbound from TLNT-INTEL on `career_path_suggestion.generated` informing `career_aspirations` (relationship 1286 `career_aspirations informs career_path_suggestions` exists; the reverse direction is the missing handoff). Surface as a TLNT-INTEL B10 obligation, but report it here. | Schedule b1 audit on TLNT-INTEL to author the inbound handoff. |

#### APQC TAGGING candidate matrix

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | Confidence |
|---|---|---|---|---|---|
| 113 | TALENT-PERFORMANCE-MGMT → COMP-PLANNING | `calibration.complete` | performance_reviews | Manage employee compensation (10543 family) / Reward and retain employees | confident L3 |
| 437 | TALENT-SUCCESSION-CAREER → HCM | `succession_plan.published` | succession_plans | Develop succession plan (10426 L4, already tagged via substring); CONFIRM as agent_curated, the L3 parent "Manage succession planning" is a better cluster home if it exists | confident L4 (parent L3 preferred) |
| 438 | TALENT-PERFORMANCE-MGMT → HCM | `performance_goal.completed` | performance_goals | Manage employee performance (16725 family) / Set goals and measure individual performance | confident L3 |
| 439 | TALENT-SUCCESSION-CAREER → COMP-PLANNING | `nine_box_placement.updated` | nine_box_placements | Manage employee compensation / Evaluate jobs (10544) | medium |
| 440 | TALENT-PERFORMANCE-MGMT → SKILLS-MGMT | `performance_goal.set` | performance_goals | Develop and train employees (20599 family) / Define employee development needs (10458) | confident L3 |
| 441 | TALENT-SUCCESSION-CAREER → HCM | `high_potential.identified` | workforce_segments | Manage succession planning / Identify and assess key successors | confident L3 |
| 793 | SPM → TALENT-PERFORMANCE-MGMT | `business_value_assessment.completed` | business_value_assessments | Develop and manage business strategy (10014 family); the inbound is the link between portfolio-value sign-off and individual performance reward | medium |
| 26 | PA → TALENT-SUCCESSION-CAREER | `high_potential.identified` | workforce_segments | Manage succession planning / Identify high potentials | confident L3 |
| 22 | HCM → TALENT-PERFORMANCE-MGMT | `employee.created` | employees | Manage employee onboarding, training, and development (20599 L2, already tagged; the more specific L3 `Onboard new employees` 10456 is a better cluster home) | medium (re-tag with `agent_curated` plus more-specific L3) |
| 1108 | PA → TALENT-CONTINUOUS-FEEDBACK | `engagement.declining` | engagement_surveys | Conduct employee engagement surveys (16944 L3 already tagged via substring); confirm as `agent_curated` | confident L3 |
| 1110 | PA → TALENT-SUCCESSION-CAREER | `attrition_risk.elevated` | attrition_forecasts | Identify high-potential employees / Manage workforce attrition | medium |
| 1113 | PA → TALENT-SUCCESSION-CAREER | `predictive_model.deployed` | predictive_models | Define HR / talent strategy / Manage workforce planning | medium |
| 430 | LMS → TALENT-SUCCESSION-CAREER | `course_enrollment.completed` | course_enrollments | Develop and train employees / Track learner completion | confident L3 |
| 443 | EMP-EXP → TALENT-SUCCESSION-CAREER | `survey_response.received` | survey_responses | Conduct employee engagement surveys (16944) | confident L3 |
| 432 | SKILLS-MGMT → TALENT-PERFORMANCE-MGMT | `skill_profile.updated` | skill_profiles | Manage employee development planning / Define competencies | medium |
| 450 | PA → TALENT-PERFORMANCE-MGMT | `attrition_risk.high` | employees | Manage workforce attrition / Identify retention risks | confident L3 |
| 111 | LMS → TALENT-PERFORMANCE-MGMT | `learner_certification.earned` | skill_profiles | Develop and train employees / Certify learners | confident L3 |
| 376 | HCM → TALENT-PERFORMANCE-MGMT | `employee.promoted` | employees | Manage employee onboarding, training, and development (20599 L2 already tagged via override); a better L3 child is `Manage employee promotions` if it exists | medium (re-tag with `agent_curated` plus L3 child) |
| 1306 | LMS → TALENT-SUCCESSION-CAREER | `learner_badge.earned` | learner_badges | Develop and train employees / Certify learners (badge tier) | medium |
| 421 | COMP-MGMT → TALENT-SUCCESSION-CAREER | `merit_cycle.closed` | merit_cycles | Manage employee compensation / Process compensation changes | confident L3 |
| 1320 | WORK-MGMT → TALENT-PERFORMANCE-MGMT | `okr_objective.committed` | okr_objectives | Manage employee performance / Set goals and measure individual performance | confident L3 |
| 1321 | WORK-MGMT → TALENT-PERFORMANCE-MGMT | `okr_objective.scored` | okr_objectives | Manage employee performance / Set goals and measure individual performance | confident L3 |
| 1034 | ATS → TALENT-SUCCESSION-CAREER | `candidate_assessment.passed` | candidate_assessments | Recruit, source, and select employees / Validate candidates | medium |

23 candidate APQC tags. Existing tag adjustments: 437 (REPLACE substring with agent_curated, possibly re-anchor to L3 parent), 1108 (REPLACE substring with agent_curated), 22 (REPLACE override with agent_curated at more-specific L3), 376 (REPLACE override with agent_curated at more-specific L3). PCF id lookups deferred to fix-time via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`.

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 (entity gaps routed to Bucket 3 for Phase 0 vetting) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M7 + B9 events + B9b + B10b in-scope) | 7 (S1, S2, S3, S4, S6 in-scope, S7) |
| BOUNDARY (NULL FK or missing handoff, in-scope side) | 0 (S7 covers the one in-scope source-FK; S6 covers 3 target FKs on PA inbounds) |
| APQC TAGGING | 1 bucket item (B1-H1 = S9; covers 23 candidate rows) |
| MODULARIZATION ISSUES | 0 (modularization candidates routed to Bucket 3) |
| Report-only (other domains) | 3 (S5, S10, S11) |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

**PA ↔ TALENT-MGMT (weight 6).** Wired pairs: 5 (PA→TALENT 26 high_potential to SUCCESSION; 1108 engagement.declining to TALENT; 1110 attrition_risk.elevated to TALENT; 1113 predictive_model.deployed to TALENT; 450 attrition_risk.high to TALENT). Section 2: 1108 / 1110 / 1113 have NULL `target_domain_module_id`, that IS TALENT-MGMT's fix per B1-S6 (1108 → 53, 1110 → 52, 1113 → 52). Section 3: outbound from TALENT to PA missing, the calibration outcome (`talent_calibration.completed` 446) plausibly informs PA model retraining; surface as Phase 0. Section 4: PA-PREDICTIVE-MODELS (83) declares `performance_reviews` as `derived + required`, clean architecturally. Section 5: no cross-relationship row directly between TALENT masters and PA masters; B8 work owed in both directions.

**HCM ↔ TALENT-MGMT (weight 6).** Wired pairs: 5 (TALENT→HCM 437, 438, 441; HCM→TALENT 22, 376). Section 2: 437, 438, 441 have NULL `target_domain_module_id` (HCM's B10b); 441 has NULL `source_domain_module_id` (TALENT-MGMT's fix, B1-S7). Section 3: no obvious missing handoff. Section 4: TALENT modules consume embedded shells of HCM masters (employees, hcm_positions, org_units) consistently. Section 5: relationship 39 `employees becomes career_aspirations` exists, clean.

**COMP-MGMT ↔ TALENT-MGMT (weight 4).** Wired pairs: 3 (TALENT→COMP 113 calibration.complete, 439 nine_box_placement.updated; COMP→TALENT 421 merit_cycle.closed). Section 2: all 3 fully populated on both FKs. Section 3: no obvious missing handoff. Section 4: COMP-PLANNING declares `performance_reviews` consumer + required, clean. Section 5: no cross-relationship rows directly between TALENT masters and COMP masters, the merit_cycle pathway runs implicitly. Soft B8 gap, surface to Phase 0.

**LMS ↔ TALENT-MGMT (weight 5).** Wired pairs: 3 (LMS→TALENT 430 course_enrollment.completed; 111 learner_certification.earned; 1306 learner_badge.earned). Section 2: 1306 has NULL `target_domain_module_id`, that IS TALENT-MGMT's fix; plausibly the target module is TALENT-SUCCESSION-CAREER (52) since badges feed career-readiness signals; treat as part of B1-S6's PA-pattern PATCH at fix time and add `target_domain_module_id=52` to 1306 as B1-S6b (consolidate). Section 3: outbound from TALENT to LMS missing, the `performance_goal.set` (443) plausibly seeds LMS learning path recommendations; surface as Phase 0. Section 4: LMS-PATHS declares `performance_goals` consumer + required, clean. Section 5: relationship 112 `course_enrollments updates career_aspirations` exists, clean.

**SKILLS-MGMT ↔ TALENT-MGMT (weight 4).** Wired pairs: 2 (TALENT→SKILLS 440 performance_goal.set; SKILLS→TALENT 432 skill_profile.updated). Section 2: both fully populated on both FKs. Section 3: clean. Section 4: SKILLS-MGMT-PROFILE declares `performance_goals` contributor + optional, clean. Section 5: relationship 111 `skill_profiles feeds career_aspirations` exists, clean.

**TLNT-INTEL ↔ TALENT-MGMT (weight 4).** Wired pairs: 0. Section 2: vacuous. Section 3: **MISSING** handoff TLNT-INTEL → TALENT-MGMT on `career_path_suggestion.generated` (TLNT-INTEL surfaces career-path recommendations that update / inform `career_aspirations`), and possibly `internal_mobility_match.surfaced` informing succession_plans (relationship 1286 confirms the data path). B1-S11 surfaces this as TLNT-INTEL's B10 obligation. Section 4: TLNT-INTEL-MOBILITY declares 3 consumer DMDOs on TALENT masters (career_aspirations required, succession_plans optional, performance_goals optional), the structural side is clean even with zero handoffs. Section 5: relationship 1286 `career_aspirations informs career_path_suggestions` exists, the reverse direction is the missing handoff.

**WORK-MGMT ↔ TALENT-MGMT (weight 3).** Wired pairs: 2 (WORK→TALENT 1320 okr_objective.committed; 1321 okr_objective.scored). Section 2: both fully populated. Section 3: outbound from TALENT to WORK potentially missing, when `performance_goal.completed` (444) lands and the goal aligns with an okr_objective (relationship 937), WORK-MGMT receives no signal. Surface as Phase 0 (could be intentional since OKR scoring is the source of truth, not the reverse). Section 4: TALENT-PERFORMANCE-MGMT declares `okr_objectives` embedded_master + optional, clean. Section 5: relationship 937 `performance_goals aligns_to okr_objectives` exists.

**Lighter neighbors (1-2 weight, one-line summaries):**

- **EMP-EXP ↔ TALENT-MGMT (weight 2).** Inbound 443 fully populated. Cross-relationship 160 `career_aspirations informs survey_responses` exists; clean.
- **ATS ↔ TALENT-MGMT (weight 1).** Inbound 1034 fully populated. No cross-relationship rows; the `candidate_assessments` → `succession_plans` consumer DMDO on module 52 exists, the relationship between them isn't recorded. Soft B8 gap, low priority.
- **SPM ↔ TALENT-MGMT (weight 1).** Inbound 793 has NULL `source_domain_module_id` (SPM's B10b). The TALENT-PERFORMANCE-MGMT consumer on `business_value_assessments` (276) is structurally clean; the SPM-to-TALENT flow ties portfolio-value sign-off to individual performance impact, an unusual but real pattern.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M7 architectural choice for TALENT-MGMT module deployability.** B1-S1 surfaces 3 sibling consumer DMDO rows that violate M7 within-domain incoherence (52 × 174, 53 × 174, 52 × 177). The agent default is DELETE (the 3 rows go away; sibling modules read `performance_reviews` and `talent_calibrations` via the canonical master on PERFORMANCE-MGMT). The alternative is PROMOTE-to-`embedded_master` (each sibling ships a shell for standalone deployment). Standalone SUCCESSION-CAREER without PERFORMANCE-MGMT has no calibrated review to derive a 9-box from; standalone CONTINUOUS-FEEDBACK without PERFORMANCE-MGMT has no review cycle to feed; embedded path looks weak. Recommendation: DELETE all 3. | Architectural intent + deployability strategy; user's call. | (a) DELETE all 3 sibling consumer rows. (b) PROMOTE to embedded_master per row (specify which). (c) Mixed. |
| B2-S2 | **Rule #15 notes-pollution on every `skill_tools` row.** All 14 `skill_tools` rows across the 3 system skills (137, 138, 139) carry populated `notes`. Examples: "Read performance reviews this module masters." (skill 137 × tool 147), "Cycle-open / calibration-invite / publish notifications." (137 × 37 send_email), "Acknowledgement signing on published reviews in regulated industries." (137 × 42 sign_document). Rule #15 forbids auto-populated notes; were these notes user-approved at load time, or were they auto-populated by the loader? If auto-populated, the audit obligation is to revert (PATCH all 14 to empty string) and log the incident per the Rule #15 audit obligation. | Cannot tell from audit alone; load-time approval status unknown. | (a) Confirm user-approved at load time; leave in place. (b) Confirm auto-populated; PATCH all 14 to empty string and log incident in references/skill-changelog.md. |
| B2-S3 | **F7 channel-primitive justification on `sign_document`.** `sign_document` (tool 42, side_effect, external) is linked to the TALENT-PERFORMANCE-MGMT system skill (137) as `requirement_level=optional`, with `notes='Acknowledgement signing on published reviews in regulated industries.'`. F7 expects the channel-primitive link be justified somewhere; Rule #15 forbids auto-populated `skill_tools.notes`. Two routes: (a) confirm the link IS the workflow for regulated industries (acknowledgement signing on published reviews IS the workflow for FINRA / SEC / banking / healthcare review processes) and supply exact user-approved wording for the notes column, or (b) treat F7 as satisfied via this audit (self-evident workflow, clean the notes column to empty string). | Rule #15 vs F7 boundary; user owns the call. | (a) Supply user-approved `notes` text. (b) Treat F7 as satisfied via audit conversation; clean the notes column. |
| B2-S4 | **B4 pattern-flag positive re-evaluation per Rule #12.** Current flags on the 7 masters: `performance_reviews` all 3 flags true; `performance_goals` only `has_personal_content=true`; `succession_plans` personal + submit_lock; `talent_calibrations` personal + submit_lock; `nine_box_placements` only personal; `career_aspirations` only personal; `feedback_records` only personal. Candidate flips: (a) `nine_box_placements.has_submit_lock` should plausibly be `true` (the catalog has terminal state `confirmed` with `requires_permission=true`); (b) `career_aspirations.has_submit_lock` plausibly `true` (terminal states `fulfilled` / `withdrawn` should lock); (c) `feedback_records.has_submit_lock` plausibly `true` (terminal `acknowledged` locks the record from edits); (d) `talent_calibrations.has_single_approver` plausibly `false` is correct (multi-approver calibration committee); (e) `succession_plans.has_single_approver` plausibly `true` (CHRO or business-unit head approves). | Pattern flags are workflow-shape judgments; user owns the call. | Per-flag yes/no for each of the 5 candidates above; capture in Decisions. |
| B2-S5 | **E6 permission-bundle drift.** Current bundles look tier-level coherent: TALENT-DEVELOPMENT-TALENT-MANAGER has `:admin` on all 3 TALENT modules; PEOPLE-MANAGER has `:manage` on 51 / 52, `:manage` on 53; HR-BUSINESS-PARTNER has `:manage` on 51 / 52, `:read` on 53. None of the workflow-gate permissions derived from lifecycle states (12 gates including `calibrate_performance_review`, `publish_performance_review`, `lock_talent_calibration`, `publish_talent_calibration`, `confirm_nine_box_placement`, `review_succession_plan`, `publish_succession_plan`, `archive_succession_plan`, `approve_performance_goal`, `complete_performance_goal`, `cancel_performance_goal`, `share_feedback_record`) is explicitly granted, the bundles rely on `permission_hierarchy` to expand `:manage` / `:admin` to include gates. Question: intentional implicit-grant pattern, or should specific gates be enumerated (e.g. `calibrate_performance_review` on HR-BUSINESS-PARTNER even though they already have `:manage`)? | Hierarchy seeding state isn't introspected here. | (a) Confirm hierarchy expands gates, leave bundles as-is. (b) Add explicit gate grants where the IC-tier gap is real. (c) Leave drift. |
| B2-S6 | **HR-BUSINESS-PARTNER read-only on CONTINUOUS-FEEDBACK is intentional or gap?** HR-BUSINESS-PARTNER has `role_modules` entry on module 53 (interaction_level=secondary) but `role_permissions` only at `:read` tier. The pattern is consistent (a secondary touch is read-only) but raises a question for the workflow: when a continuous-feedback record involves HR (e.g. interpersonal-conflict-shaped feedback the HRBP needs to track and possibly intervene on), the HRBP cannot share or manage. Is this intentional (HRBP runs the formal review process, line manager runs the feedback flow) or a gap? | Workflow-intent question; user owns the call. | (a) Read-only is intentional; leave. (b) Upgrade to `:manage` on module 53 for HRBP. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against the orchestrator-supplied flagship list (Workday Talent Optimization, SAP SuccessFactors Performance and Goals, Oracle Cloud HCM Talent, Cornerstone Performance, Lattice, 15Five, Betterworks, Culture Amp, Leapsome, Eightfold) plus the also-considered specialists (SumTotal / Saba Cloud, ClearCompany, Engagedly, Reflektive/PeopleFluent, Beamery). Compliance anchor is EU AI Act (loaded, mandatory) per the AI-assisted calibration / 9-box / succession decision-support overlay vendors increasingly ship. Broader regulatory anchors that should be considered for TALENT-MGMT include US EEOC adverse-impact testing (mandatory for hiring + promotion + comp decisions in US), AI-related state laws (NYC Local Law 144 for AEDT, Illinois HB 3773), GDPR (mandatory for EU-employee performance / succession data with cross-border transfer), Colorado AI Act (when in force), and HIPAA where employee health-related comments surface in 360 feedback. Loaded `domain_regulations` cover only EU AI Act, narrower than the surface suggests.

The subagent recipe was not spawned (this is a single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING (10) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `competencies` / `competency_models` | Workday, SAP SuccessFactors, Cornerstone, Lattice, Leapsome model competency frameworks as first-class records distinct from `skill_profiles` (a competency is a definition; a skill_profile is an individual's holdings). The catalog has `skill_profiles` via SKILLS-MGMT but no competency-definition master in TALENT-MGMT or SKILLS-MGMT. Required for evaluative review templates. | TALENT-PERFORMANCE-MGMT (master) or SKILLS-MGMT extension |
| `peer_review_invitations` | Lattice, Leapsome, Workday, 15Five model the multi-rater orchestration as distinct from the review record itself (invitations have their own lifecycle: sent → received → completed → expired). Current catalog folds peer review under `feedback_records`. | TALENT-PERFORMANCE-MGMT (master) |
| `development_plans` / `individual_development_plans` | Workday, SAP, Cornerstone, Lattice ship IDPs as first-class records distinct from `career_aspirations` (an IDP is an action plan with steps, deadlines, accountability; an aspiration is a stated preference). Currently `career_aspirations` aliases include "Individual Development Plan" but the entity may warrant its own master. | TALENT-SUCCESSION-CAREER (master), promote alias to entity |
| `succession_candidates` | Workday, SAP, Cornerstone model succession_candidates as a junction-with-payload (one succession_plan has many candidates with readiness rating, time-to-ready, risk score). Currently `succession_plans` has no junction; the candidate list lives implicitly via the `users is_successor_in succession_plans` relationship (945), which loses the readiness-rating per-candidate payload. | TALENT-SUCCESSION-CAREER (master or junction) |
| `recognition_badges` / `peer_recognitions` (separate from feedback_records) | Bonusly, Kudos, Workhuman, Achievers run peer recognition as a distinct flow with points / badges / a reward catalog. Lattice "Praise" and 15Five "High Fives" share the surface but are simpler. The catalog folds these into `feedback_records` (alias includes "Praise" and "Kudos") but the redemption / points-balance / catalog dimension is missing. See Bucket-3 modularization (new PEER-RECOGNITION candidate domain). | new PEER-RECOGNITION domain (queued) |
| `mentorship_pairings` / `mentorship_programs` | MentorcliQ, Chronus, Together, PushFar, Qooper specialize in mentorship orchestration; SAP, Cornerstone, Workday have mentorship modules. Current TALENT-MGMT has no mentorship entity. See Bucket-3 modularization (new MENTORSHIP candidate domain). | new MENTORSHIP domain (queued) |
| `performance_improvement_plans` / `pips` | Workday, SAP, Cornerstone, Lattice, Leapsome model PIPs as a formal HR process distinct from the review cycle (PIP has its own goals, check-ins, milestones, escalation gates). Currently no PIP entity. | TALENT-PERFORMANCE-MGMT (master) |
| `goal_check_ins` | Betterworks weekly check-ins, 15Five Pulses, Lattice Updates model recurring goal-progress signals as a first-class log distinct from the goal itself. Currently `performance_goals` has no check-in master; progress is implicit on the goal record. | TALENT-PERFORMANCE-MGMT (master) |
| `1on1_meetings` | Lattice 1:1s, 15Five 1-on-1s, Leapsome 1:1s structure recurring manager-employee meeting records (agenda, talking points, action items, history). Currently no 1:1 entity; the catalog has `feedback_records` alias including "1-on-1 Note" but the meeting-scaffold itself is missing. | TALENT-CONTINUOUS-FEEDBACK (master) |
| `calibration_committees` / `calibration_sessions` (split from talent_calibrations) | Workday, SAP, Cornerstone separate the standing committee (members, charter, frequency) from individual sessions (scheduled date, participants, outcomes). Currently `talent_calibrations` conflates the two; "Calibration Session" is an alias but the parent committee is missing. | TALENT-PERFORMANCE-MGMT (potential split) |

#### MODULARIZATION (2) candidates

- **PEER-RECOGNITION as a candidate domain (queued).** Bonusly + Kudos + Workhuman + Achievers + Nectar are independent point-solution vendors competing in peer recognition + reward catalog. Engagedly and Lattice ship lightweight versions; Workday and SAP bundle it. Passes the point-solution-market test; queued in `_missing-domains.md`.
- **MENTORSHIP as a candidate domain (queued).** MentorcliQ + Together + Chronus + PushFar + Qooper are independent point-solution vendors. SAP, Workday, Cornerstone have built-in modules but the standalone market is substantial. Passes the test; queued in `_missing-domains.md`.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **US EEOC adverse-impact testing** (mandatory for US hiring + promotion + comp; promotion decisions sourced from succession + 9-box may trigger 4/5ths rule scrutiny).
- **NYC Local Law 144 (AEDT)** (mandatory for AI-assisted employment decisions including AI-overlaid talent calibration / succession scoring).
- **Illinois HB 3773** (AI-assisted employment decisions disclosure).
- **GDPR** (mandatory for EU-employee performance / succession / personal-content data with cross-border transfer; the current `has_personal_content=true` flag is the structural anchor but no regulation row records the legal applicability).
- **HIPAA BAA** (situationally applicable when 360 feedback surfaces health-related content; treat as a soft / situational anchor, not a routine applicability).

#### Candidate-domain queue updates

This audit added 2 candidate domains to `audits/_missing-domains.md` via the helper:

- **MENTORSHIP, Mentorship Program Management** (5 vendors enumerated; capabilities: mentor-mentee matching, mentorship program orchestration, session tracking, mentorship outcome measurement, group mentoring).
- **PEER-RECOGNITION, Peer Recognition and Rewards Platform** (6 vendors enumerated; capabilities: peer-to-peer recognition, points-based rewards, reward catalog, social recognition feeds, milestone celebrations, recognition analytics).

The TALENT-INTEL-PLATFORM candidate previously surfaced by the PA audit IS the loaded `TLNT-INTEL` (id 170), already in the catalog under domain_code TLNT-INTEL. No new queue entry needed; recommend the candidate-queue triage routes that pending-review row to the `## Folded` section with target `TLNT-INTEL`.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces `c:/tmp/TALENT-MGMT-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 10 entity candidates + 5 regulation candidates + 2 modularization candidates to treat as confirmed).

### Cross-bucket dependencies

- **B1-S1 is gated on B2-S1**: the DELETE vs PROMOTE choice for the 3 sibling consumer rows must come from the user before the M7 fix loads.
- **B1-S3 (intra-domain handoffs) depends on B1-S4** (the new `performance_review.published`, `feedback_record.shared`, and `nine_box_placement.confirmed` events from B1-S4 are used by B1-S3 handoffs).
- **B1-S6 in-scope PATCH (PA inbound 1108/1110/1113 target FK) is independent** of every other Bucket 1 fix.
- **B1-S7 (handoff 441 source FK) is independent.**
- **B1-S8 / B2-S3 are linked** (the F7 advisory routes to B2-S3 for the notes-vs-self-evident judgment).
- **B2-S2 (Rule #15 notes-pollution audit on 14 skill_tools rows) is independent** of Bucket 1 fixes.
- **B2-S5 (permission-bundle drift) is independent** of all other buckets.
- **B3 MISSING entities** (`competencies`, `peer_review_invitations`, `development_plans`, `performance_improvement_plans`, `goal_check_ins`, `1on1_meetings`) might inform B2-S4 (pattern-flag re-evaluation, especially `has_submit_lock` on new PIP / check-in records) and B2-S5 (new entities mean new workflow gates that change permission bundles). Calling this out per the surface-time discipline.
- **B3 MODULARIZATION candidates (MENTORSHIP, PEER-RECOGNITION) are independent** of the rest of Bucket 3.
- Buckets 2 and 3 are otherwise independent; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S4, S6, S7, S9`), or `skip`.

- **S1 (M7 hard fail, DELETE or PROMOTE 3 sibling consumer DMDOs)** is gated on B2-S1; resolve that first.
- **S2 (event_category PATCH on 6 events)** is trivial; one PATCH each.
- **S3 (5 new intra-domain handoffs)** depends on S4 (needs 3 new events first).
- **S4 (11 missing `trigger_events`)** is structural; no other dependencies.
- **S5 (B10b report-only outbound NULL target FK, owed by HCM)** schedules HCM audit; not TALENT-MGMT's fix.
- **S6 (PA inbound 1108/1110/1113 target FK PATCH on TALENT side, plus LMS 1306 target FK PATCH)** is mechanical; 4 PATCHes.
- **S7 (handoff 441 source FK PATCH)** is mechanical; one PATCH.
- **S8 (F7 advisory)** routes to B2-S3.
- **S9 / H1 (23 APQC tags: 19 new INSERTs + 4 REPLACEs)** load now or in a follow-up batch?
- **S10 / S11 (Pairwise consumer-DMDO and TLNT-INTEL handoff report-only)** schedules other-domain audits.

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (M7 architectural choice):** (a) DELETE all 3, (b) PROMOTE all 3 to embedded_master, (c) mixed.
- **B2-S2 (Rule #15 notes-pollution on 14 skill_tools rows):** the audit can revert if you confirm auto-population. If they were user-approved at load time, say so and I leave them.
- **B2-S3 (F7 sign_document justification):** (a) supply user-approved wording for the skill_tools row, (b) treat F7 as satisfied via audit conversation and clean to empty string.
- **B2-S4 (pattern flag re-evaluation):** yes/no per-flag on the 5 candidate flips (nine_box submit_lock, career_aspirations submit_lock, feedback_records submit_lock, talent_calibrations single_approver, succession_plans single_approver).
- **B2-S5 (permission-bundle drift):** which option (a / b / c)?
- **B2-S6 (HRBP read-only on CONTINUOUS-FEEDBACK):** intentional, or upgrade to `:manage`?

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** Will surface candidates when a Phase 0 subagent returns. If eyeball-mode, name which of the 10 entity candidates + 5 regulation candidates + 2 modularization candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| HCM | B10b: populate `target_domain_module_id` on outbound handoffs 437 (`succession_plan.published` → HCM), 438 (`performance_goal.completed` → HCM), 441 (`high_potential.identified` → HCM workforce_segments). Add consumer DMDO rows on `performance_goals` and `succession_plans` in whichever HCM module subscribes. |
| SPM | B10b: populate `source_domain_module_id` on inbound handoff 793 (`business_value_assessment.completed` → TALENT-MGMT). |
| PA | B10b: confirm `source_domain_module_id` on inbound 1108 (currently 82), 1110 (currently 83), 1113 (currently 83), 26 (currently 81), 450 (currently 83) are the right source modules; verify against PA's current module split. Add contributor DMDO rows on TALENT-MGMT for `engagement_surveys`, `attrition_forecasts`, `predictive_models` (B1-S10). |
| TLNT-INTEL | B10b: author the missing handoff TLNT-INTEL → TALENT-MGMT on `career_path_suggestion.generated` informing `career_aspirations` (and possibly succession_plans). Three consumer DMDOs are already declared but with zero handoffs the data path is silent. |
| LMS | B10b: confirm 1306 (`learner_badge.earned`) target module is 52 (TALENT-SUCCESSION-CAREER); B1-S6 patches it from this side as the in-scope mechanical PATCH, but LMS's audit may want to confirm the routing. |
| WORK-MGMT | B10b: confirm outbound from TALENT-MGMT to WORK-MGMT is intentionally absent (`performance_goal.completed` 444 does not signal back to WORK-MGMT when the goal aligns with an okr_objective). Surface as Phase 0 follow-up. |
| COMP-MGMT | No B10b owed; coverage is complete on the handoff side. Soft B8 gap on the absence of a direct cross-domain relationship row between `performance_reviews` and a COMP master (the merit-cycle flow runs implicitly). |

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-technical subset of Bucket-1 via `.tmp_deploy/fix_talent_mgmt_b1_technical_2026_05_31.ts`, run from project root. Loader is idempotent (pre-flight on each row).

**Applied (11 rows):**

- **B1-S2 (6 PATCHes)** trigger_events `event_category` backfill: 443 → `lifecycle`, 444 → `state_change`, 445 → `state_change`, 446 → `state_change`, 447 → `state_change`, 448 → `lifecycle`. All 6 rows previously empty-string; Rule #13 enum now satisfied.
- **B1-S6 (4 PATCHes)** inbound handoff `target_domain_module_id` backfill (TALENT-MGMT-owed side of the B10b asymmetry): 1108 → 53 (CONTINUOUS-FEEDBACK), 1110 → 52 (SUCCESSION-CAREER), 1113 → 52 (SUCCESSION-CAREER), 1306 → 52 (SUCCESSION-CAREER). All four rows previously NULL on target FK.
- **B1-S7 (1 PATCH)** handoff 441 `source_domain_module_id` NULL → 52 (TALENT-SUCCESSION-CAREER). Target FK on 441 remains NULL (HCM-owed per B1-S5 report-only).

**Deferred (8 items):**

- **B1-S1** (M7 sibling consumer DMDO rows): gated on B2-S1 architectural choice (DELETE vs PROMOTE), user judgment.
- **B1-S3** (5 new intra-domain handoffs): new-entity inserts, also depends on B1-S4's new trigger_events.
- **B1-S4** (11 new `trigger_events` rows): new-entity inserts beyond enum backfill; defer list bars new entities.
- **B1-S5 / S10 / S11** (report-only, owed by HCM / PA / TLNT-INTEL / other domains): not TALENT-MGMT's fix.
- **B1-S8** (F7 channel-primitive justification on `sign_document`): routed to B2-S3 (Rule #15 vs F7 judgment).
- **B1-S9 / H1** (23 APQC `handoff_processes` tags + 4 REPLACEs): audit gives PCF prose names only, no resolved `process_id` tuples; several candidate rows are flagged `medium` confidence pending parent-vs-child anchoring judgment (e.g. 437 / 22 / 376 reroute decisions, 793 portfolio-value framing). Defer rule "INSERT handoff_processes ONLY when audit pre-specifies handoff_id + resolvable PCF (verify before insert)" not satisfied for any of the 23 candidates.

**No JWT errors.**

**Loader:** `c:/dev/domain-map/.tmp_deploy/fix_talent_mgmt_b1_technical_2026_05_31.ts`

## 2026-05-31, Audit

### Summary
- Current footprint: 3 full modules (51 TALENT-PERFORMANCE-MGMT, 52 TALENT-SUCCESSION-CAREER, 53 TALENT-CONTINUOUS-FEEDBACK). 7 masters (174 performance_reviews, 175 performance_goals, 176 succession_plans, 177 talent_calibrations, 178 nine_box_placements, 179 career_aspirations, 180 feedback_records). 6 capabilities all linked to ≥1 realizing module. 14 solutions (7 primary, 7 secondary). 1 regulation (EU AI Act, mandatory). 4 `business_function_domains` rows. 6 outbound + 17 inbound cross-domain handoffs (23 cross-domain total). 0 intra-domain handoffs. 8 master `trigger_events`. 32 lifecycle states, 12 with `requires_permission=true`. 25 aliases. 3 system skills + 14 `skill_tools` rows. 3 roles (HR-BUSINESS-PARTNER 10020, PEOPLE-MANAGER 10022, TALENT-DEVELOPMENT-TALENT-MANAGER 10023) with 16 cross-module role_permissions.
- Bucket 1 (in-scope, agent fixable): 7 items.
- Bucket 2 (surface-for-user): 6 items.
- Bucket 3 (Phase 0 pending): same 13 candidates as prior audit, unchanged scope.
- Status delta from 2026-05-30 audit + 2026-05-31 continuation: B1-S2 (event_category 6 PATCHes), B1-S6 (3 PA inbound target FKs + 1 LMS), and B1-S7 (handoff 441 source FK) confirmed live. M7 hard-fail and B9b hard-fail persist (gated on B2-S1 architectural choice and on B1-S4 new events). Newly surfaced: A4 / M8 catalog UX field gaps; B10b new TALENT-side target FK NULL on inbound 450 (PA → TALENT, `attrition_risk.high` payload `employees`); H1 picked up 3 additional `agent_curated` rows (432, 440, 443) but volume still under floor.

### Structural pass band summary

- A1 pass; A2 pass; A3 pass; A4 fail (empty catalog_tagline + catalog_description on domain row 58).
- M1 pass; M2 pass; M4 pass; M5 pass; M6 pass; M7 hard fail (3 sibling consumer DMDOs still present); M8 fail (empty catalog UX fields on all 3 modules).
- B1 pass; B2 pass; B3 pass; B5 pass; B6 pass; B7 pass; B9 pass; B9b hard fail (0 intra-domain handoffs); B10 report-only; B10b in-scope: 1 new TALENT-owed target FK (handoff 450 → ?), plus the 4 prior items already fixed; B11 pass; B12 pass.
- C1 pass; C2 not surfaced.
- E1 pass; E2 pass; E3 pass; E4 pass; E5 pass (Path A vs B agree on domain 58).
- F1 pass; F2 pass; F3 pass; F4 pass; F5 computable, strict 13/14 = 92.9% on the union across modules 51/52/53. F7 advisory on `sign_document` still pending B2-S3.
- H1 fail (7 of 23 cross-domain handoffs tagged: 3 `agent_curated`, 2 `discovery_substring`, 2 `discovery_override`; zero `approved`; volume still below H1 0.5N floor of 12).

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M7 hard fail | `performance_reviews` (174) is `role='master'` in module 51 AND `role='consumer'` in modules 52 (necessity required) and 53 (necessity optional). `talent_calibrations` (177) is `role='master'` in 51 AND `role='consumer'` in 52 (necessity required). Persists from prior audit; gated on B2-S1. | DELETE 3 DMDO rows (52,174,consumer), (53,174,consumer), (52,177,consumer); OR PROMOTE each to `embedded_master`. Architectural choice owned by B2-S1. |
| B1-S2 | A4 catalog UX | `domains.id=58` row has empty `catalog_tagline` AND empty `catalog_description` (Rule #20). | Draft buyer-voice tagline + 1-3 paragraph description for the TALENT-MGMT market, surface to user before any PATCH (Rule #20 forbids loading without per-row approval; even backfill of empties needs surface). |
| B1-S3 | M8 catalog UX | All 3 modules (51, 52, 53) have empty `catalog_tagline` AND empty `catalog_description`. | Draft per-module buyer-voice fields, surface to user before any PATCH. |
| B1-S4 | B9b hard fail | 0 intra-domain handoffs on a 3-module domain whose state machines clearly fan out across modules (calibrated reviews land in 9-box, completed goals roll into succession readiness, shared feedback feeds review cycles, confirmed 9-box placements trigger succession-plan revisions). Persists from prior audit; depends on B1-S5's new trigger_events. | Author 5 intra-domain handoffs after B1-S5 lands the missing events. `source_domain_id=target_domain_id=58`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`. Pairs: 51→52 on `talent_calibration.completed` (446); 51→52 on `performance_review.published` (new); 53→51 on `feedback_record.shared` (new); 51→52 on `performance_goal.completed` (444); 52→52 on `nine_box_placement.confirmed` (new). |
| B1-S5 | B9 missing trigger_events for workflow-gate states | 11 lifecycle states with `requires_permission=true` lack matching `trigger_events` (525 self_assessment, 526 manager_assessment, 527 submitted, 528 calibrated, 529 published, 533 approved_goal, 536 cancelled_goal, 544 ratings_locked, 545 calibration_published, 547 reviewed_succession, 549 archived_succession, 552 confirmed_placement, 559 shared_feedback). Subtracting the 2 already-covered (535 complete_goal maps to 444, 548 publish_succession maps to 445) leaves 11 missing. | Insert 11 `trigger_events` rows each with `event_category='state_change'` (or `lifecycle` where the state name reads as an entry), `data_object_id` on the publishing master. Three of these (`performance_review.published`, `feedback_record.shared`, `nine_box_placement.confirmed`) seed B1-S4 handoffs. |
| B1-S6 | B10b in-scope target FK | Handoff 450 (PA → TALENT-MGMT, `attrition_risk.high` payload `employees`) carries NULL `target_domain_module_id`. TALENT-MGMT side: derive via DMDO master-rule on `employees` (id 31). Employees is embedded_master in all 3 TALENT modules (51, 52, 53) at equal strongest role; tie. Per B10b tie rule leave NULL unless user picks. Plausible target module is 52 (SUCCESSION-CAREER) since attrition risk drives successor-readiness reassessment. | PATCH `handoffs.id=450 set target_domain_module_id=52` on user confirmation (B2-S5). |
| B1-S7 | H1 APQC tagging | 7 of 23 cross-domain handoffs carry `handoff_processes` rows (3 `agent_curated`: 432, 440, 443; 2 `discovery_substring`: 1108, 437; 2 `discovery_override`: 22, 376). Zero `approved`. H1 floor is 12-18 `agent_curated` for N=23. 16 cross-domain handoffs still untagged: 113, 438, 439, 441, 793, 26, 1110, 1113, 430, 450, 111, 1306, 421, 1320, 1321, 1034. Plus 4 weak rows warrant `agent_curated` upgrade (1108, 437, 22, 376). | Per-handoff PCF candidate matrix preserved from 2026-05-30 audit Bucket-1 table. Lookup pattern: `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`. Author rows `proposal_source='agent_curated'`, `record_status='new'`. INSERT 16 + REPLACE 4 = 20 rows when resolved process_id tuples are confirmed in fix time. |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | M7 architectural choice (DELETE vs PROMOTE 3 sibling consumer DMDOs on 174 and 177). | Standalone-deployability intent for sibling modules; the DELETE route makes 52 and 53 depend on 51's canonical master, the PROMOTE route ships local shells per module. | (a) DELETE all 3. (b) PROMOTE all 3 to `embedded_master`. (c) Mixed. |
| B2-S2 | Rule #15 notes-pollution on every `skill_tools` row (14 of 14). | Cannot tell from audit whether the notes were user-approved at load time. Sample notes: "Read performance reviews this module masters.", "Cycle-open / calibration-invite / publish notifications.", "Acknowledgement signing on published reviews in regulated industries." (skill_tools ids 1305-1318). | (a) Confirm user-approved, leave. (b) Confirm auto-populated, PATCH all 14 to empty string and log incident in references/skill-changelog.md. |
| B2-S3 | F7 channel-primitive justification on `sign_document` (tool 42 on skill_tool 1310). | Rule #15 forbids auto-populated `skill_tools.notes`; F7 expects justification. Combined with B2-S2 (same notes column). | (a) Supply user-approved wording. (b) Clean notes to empty + accept F7 as self-evident via audit transcript. (c) DELETE the skill_tools row if `sign_document` is not actually needed. |
| B2-S4 | B4 pattern-flag re-evaluation per Rule #12. Current state: `nine_box_placements` (178) has `has_personal_content=true` only; lifecycle includes terminal `confirmed` with `requires_permission`. `career_aspirations` (179) has personal only; terminal `fulfilled`/`withdrawn` exist. `feedback_records` (180) has personal only; terminal `acknowledged`. `succession_plans` (176) has personal + submit_lock; no single_approver flag. `talent_calibrations` (177) has personal + submit_lock; multi-approver pattern. Candidate flips: (a) 178 submit_lock true; (b) 179 submit_lock true; (c) 180 submit_lock true; (d) 176 single_approver true (CHRO sign-off); (e) 177 single_approver remains false. | Pattern flags are workflow-shape judgments. | Per-flag yes/no on the 5 candidates. |
| B2-S5 | Handoff 450 target module assignment (B1-S6 fix tie). | DMDO master role for `employees` (31) on TALENT side is `embedded_master` in all 3 modules; no per-module disambiguator. | (a) Target = 52 (SUCCESSION-CAREER, attrition driver). (b) Target = 51 (PERFORMANCE-MGMT). (c) Target = 53 (CONTINUOUS-FEEDBACK). (d) Leave NULL pending PA-side re-modeling. |
| B2-S6 | E6 permission-bundle drift / HR-BUSINESS-PARTNER read-only on CONTINUOUS-FEEDBACK. HR-BUSINESS-PARTNER (10020) carries `:read` on module 53 only (rest `:manage`); none of the workflow-gate permissions derived from the 12 lifecycle gates are explicitly enumerated, the bundle relies on `permission_hierarchy` expansion of `:manage`/`:admin`. | Hierarchy seeding state not introspected here. | (a) Confirm hierarchy expands gates, leave bundles. (b) Add explicit gate grants where IC-tier gap is real. (c) Upgrade HRBP from `:read` to `:manage` on 53. |

### Bucket 3, Phase 0 pending (speculative)

Bucket 3 candidates unchanged from 2026-05-30 audit; same 10 entity candidates (`competencies`, `peer_review_invitations`, `development_plans`, `succession_candidates`, `recognition_badges`, `mentorship_pairings`, `performance_improvement_plans`, `goal_check_ins`, `1on1_meetings`, `calibration_committees`), 5 compliance regulation candidates (US EEOC, NYC Local Law 144, Illinois HB 3773, GDPR, HIPAA BAA), and 2 candidate domains (PEER-RECOGNITION, MENTORSHIP) already queued in `_missing-domains.md`. No new Phase 0 work in this audit pass. Verification path remains: vet via formal Phase 0 vendor research, or eyeball-mode (user names which to confirm).

### Cross-bucket dependencies

- B1-S1 gated on B2-S1 (architectural DELETE vs PROMOTE choice).
- B1-S4 depends on B1-S5 (new events `performance_review.published`, `feedback_record.shared`, `nine_box_placement.confirmed` referenced by 3 of the 5 intra-domain handoffs).
- B1-S6 gated on B2-S5 (target module tie).
- B1-S2 and B1-S3 (A4 / M8 catalog UX) require user review before write per Rule #20; treat as draft-then-surface.
- B1-S7 (H1 APQC tagging) is independent of all other Bucket 1 items.
- B2-S2 and B2-S3 share the `skill_tools.notes` column; resolving B2-S2 (revert vs keep) constrains B2-S3 options.
- B3 candidates may inform B2-S4 (new PIP / check-in records would change `has_submit_lock` evaluation) and B2-S6 (new workflow gates change bundle composition).

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed work |
|---|---|
| HCM | B10b: populate `target_domain_module_id` on outbound handoffs 437 (`succession_plan.published`), 438 (`performance_goal.completed`), 441 (`high_potential.identified`). Add consumer DMDO rows on `performance_goals` / `succession_plans` in subscribing HCM module. |
| SPM | B10b: populate `source_domain_module_id` on inbound 793 (`business_value_assessment.completed` → TALENT-PERFORMANCE-MGMT 51). |
| PA | B9 attribution review: trigger_event 64 (`high_potential.identified`, data_object_id=44 `workforce_segments`) is published by handoff 26 from PA module 81 (PA-PROFILES) into TALENT-SUCCESSION-CAREER, and also re-published by TALENT 441 in the outbound direction. PA owes the master role on `workforce_segments` to confirm authoritative publisher. Plus PA owes contributor DMDOs on TALENT side for `engagement_surveys`, `attrition_forecasts`, `predictive_models`. |
| TLNT-INTEL | B10b: missing handoff TLNT-INTEL → TALENT-MGMT on `career_path_suggestion.generated` informing `career_aspirations`. Three consumer DMDOs declared, zero handoffs. |
| WORK-MGMT | Verify intentional absence of outbound from TALENT-MGMT to WORK-MGMT (`performance_goal.completed` 444 does not signal back when the goal aligns with an okr_objective). |

### JWT errors

None.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
