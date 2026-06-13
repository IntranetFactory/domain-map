# EMP-EXP audit history

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 2 full modules (`EMP-EXP-CONTINUOUS-LISTEN` id 64, `EMP-EXP-ACTION-PLANNING` id 65); 5 masters (`survey_campaigns`, `survey_responses`, `engagement_drivers`, `pulse_questions` on module 64; `action_plans` on module 65); 5 capabilities (`ENG-SURVEY`, `PULSE-SURVEY`, `360-FEEDBACK`, `LIFECYCLE-LISTEN`, `ACTION-PLAN`); 10 solutions (5 primary, 5 secondary); 5 trigger_events; 9 outbound + 4 inbound cross-domain handoffs; 0 intra-domain handoffs; 10 aliases; 11 lifecycle states across 3 of 5 masters (3 with `requires_permission=true`); 1 system skill `emp-exp-system` on module 64 only (zero on module 65); 7 skill_tools; 0 roles + 0 role_modules + 0 role_permissions.
- **Vendor-surface basis:** Workday Peakon Employee Voice, Culture Amp, Glint, Qualtrics EmployeeXM, Lattice, 15Five, Leapsome, Microsoft Viva Connections, Firstup, Haiilo. Pure-play engagement / listening specialists plus continuous-performance + intranet adjacency.
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 9 items.
- **Candidates queued to `audits/_missing-domains.md`:** 4 (EMP-LISTENING bumped to 2, PEER-RECOGNITION bumped to 2, EMP-ADVOCACY bumped to 3, INTERNAL-COMMS new).

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO consumers ranked by edge weight):

| Neighbor | Out | In | DMDO (consumes EMP-EXP) | DMDO (EMP-EXP consumes) | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|---|
| PA | 3 | 1 | 2 (`survey_responses` consumer, `engagement_drivers` derived) | 0 | 2 (`feeds people_kpis`) | 8 | Pairwise (full) |
| HCM | 3 | 0 | 1 (`engagement_drivers` consumer) | 1 (`employees` embedded_master ×2) | 0 | 5 | Pairwise (full) |
| ONBOARDING | 0 | 2 | 0 | 1 (`onboarding_journeys` consumer on 64) | 1 (`onboarding_journeys spawns survey_campaigns`) | 4 | Pairwise (full) |
| WORK-MGMT | 2 | 0 | 1 (`action_plans` consumer on WORK-MGMT-TASK-EXEC) | 0 | 1 (`action_plans spawns work_items`) | 4 | Pairwise (full) |
| TALENT-MGMT | 1 | 0 | 1 (`survey_responses` consumer) | 0 | 0 | 2 | Lightweight |
| COMP-MGMT | 0 | 1 | 0 | 0 | 0 | 1 | Lightweight |

Structural pass bands: **A passes** (5 caps, 10 solutions, all metadata populated); **M passes** (M1 ≥1 module, M2 ≥2 modules for 5 caps, M4 all caps realized, M7 single-master pass); **B partial-fail** (B4 needs positive re-eval, B7 has 2 duplicate user-edge pairs, B9 missing event for `survey_campaign.closed`, B9b zero intra-domain handoffs is a hard fail on a 2-module domain, B10b 3 outbound handoffs to PA with NULL target_domain_module_id even though PA is modularized — these are APM-EXP-style B10b on APM-EXP — i.e. EMP-EXP's own fix); **C passes** (1 owner + 1 consumer business function); **E hard-fail** (zero roles, zero role_modules); **F partial-fail** (F2 module 65 has no system skill, F3 only 7 skill_tools all on skill 55, F7 violations on `send_email` + `sign_document` with empty notes); **H hard-fail** (4 of 13 cross-domain handoffs tagged, all `discovery_substring`, zero `agent_curated`, multiple semantically wrong tags).

Domain Semantius score (strict) across 1 system skill: **6 / 7 = ~86%** platform; one external tool (`sign_document` id 42) brings it under 100%. Operational score same. Module 65 has no skill, so its score is uncomputable (F5 routes back to F2).

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **E1 / E2 / E3 / E4 / E5 (hard fail)** | **Zero roles for the entire domain.** `role_modules?domain_module_id=in.(64,65)` returns 0. Domain has 2 modules and 5 capabilities, so multi-module is true; E1 requires ≥3 roles with the 2-module floor. Typical EMP-EXP personas: `EMPLOYEE-EXPERIENCE-PROGRAM-MANAGER` (owner of listening cycles + action planning), `HR-BUSINESS-PARTNER` (cross-functional, consumes engagement_drivers and runs action planning for their org_unit), `PEOPLE-MANAGER` (cross-functional, owns action_plans for their team). Author 3 roles function-scoped to `business_function_id=79` (Employee Experience) except HIRING/MANAGER pattern for cross-functional. | Author 3 `roles` rows + 6+ `role_modules` rows (both modules each, `primary` on listening for the program manager, `secondary` for HRBP) + 8-12 `role_permissions` rows (tier-level `emp-exp-continuous-listen:manage`, `emp-exp-action-planning:manage` plus the 3 workflow gates `launch_survey_campaign` / `close_survey_campaign` / `complete_action_plan` where the role needs them). |
| B1-S2 | **F2 (hard fail)** | **Module `EMP-EXP-ACTION-PLANNING` (id 65) has no `skill_type='system'` skill.** Module 64 has `emp-exp-system` (id 55) but module 65 has none. Rule #17 says one system skill per `domain_modules` row; the current skill named `emp-exp-system` is mis-shaped as a domain-spanning skill but only attached to module 64. The naming should be per-module: `emp_exp_continuous_listen_agent` for module 64, `emp_exp_action_planning_agent` for module 65. | Insert a new `skills` row `emp_exp_action_planning_agent` (`skill_type='system'`, `domain_module_id=65`). Rename existing skill 55 from `emp-exp-system` to `emp_exp_continuous_listen_agent`. Re-anchor its 7 `skill_tools` rows that belong to the listening surface (campaigns, responses, drivers, pulse_questions, send_email); move `query_action_plans` (tool 444) to the new skill. Author ≥3 skill_tools rows for the new action-planning skill (at minimum `query_action_plans`, `create_action_plan`, `complete_action_plan`, plus `notify_person` for assignee notification). |
| B1-S3 | **F3** | **Skill 55 has only 7 `skill_tools` rows, all `required`, no mutations or `notify_person` abstraction.** Typical Phase-S shape is 5-20 with required + optional mix; the listening surface needs at minimum `create_survey_campaign`, `launch_survey_campaign`, `close_survey_campaign`, `submit_survey_response`, `compute_engagement_score`, plus `notify_person` / `notify_team` for survey invitations + reminders. Today the only outbound capability is `send_email` (raw channel) and `sign_document` (which is the wrong primitive — sign_document is for ESIGN workflows, not engagement surveys). | Extend the Phase-S loader to add the workflow-gate mutations + `notify_person` abstraction; remove `sign_document` (B1-S6 below). |
| B1-S4 | **F7** | **Channel-primitive linkage without workflow-specific justification.** `skill_tools` row links `send_email` (tool 37) on skill 55 with empty `notes`. Per the F7 rule the default for generic survey-invite notifications is `notify_person` (or `notify_team` for broadcast across an org_unit cohort); `send_email` is a channel-specific primitive that should only be linked when the workflow REQUIRES email specifically. EMP-EXP survey invitations are exactly the broadcast pattern; the abstraction handles channel selection at deployment time. | PATCH `skill_tools` row (`skill_id=55, tool_id=37`) to point at `notify_team` (broadcast invitation) and either add a second row for `notify_person` (single-recipient nudges) or, if `notify_person` is already linked elsewhere, accept the broadcast-only model. |
| B1-S5 | **F7 / Rule #17 invariant** | **`sign_document` (tool 42, `operation_kind='side_effect'`) linked on skill 55 is the wrong primitive for engagement surveys.** ESIGN is a totally different workflow class (envelope, party, signature); EMP-EXP does not produce signed documents. The linkage looks like a copy-paste from the ATS / ONBOARDING phase-S authoring. | DELETE the `skill_tools` row (`skill_id=55, tool_id=42`). |
| B1-S6 | **B9 missing trigger_event** | **`survey_campaign.closed` event missing.** Lifecycle state 181/closed has `requires_permission=true` and `permission_verb_override='close_survey_campaign'`, but no matching `trigger_events` row keyed on `survey_campaign.closed` exists. Downstream domains (PA score recomputation, HCM lifecycle closure) cannot subscribe today. | Insert `trigger_events` row: `event_name='survey_campaign.closed'`, `event_category='state_change'`, `data_object_id=181`. Then add outbound handoffs from `EMP-EXP-CONTINUOUS-LISTEN → PA` (analysis trigger) and `→ HCM` (cycle-close signal) once the event exists. |
| B1-S7 | **B9 wrong-attribution trigger_event** | **`trigger_events.id=134 survey.cycle_closed` points at `engagement_drivers` (id 183) instead of `survey_campaigns` (id 181).** The event name is keyed against `survey` (which is the campaign) but `data_object_id` says it fires on the engagement_driver master. Drivers are config-shaped framework definitions; they don't have a "cycle_closed" state. Two downstream handoffs (442 to HCM, 115 to PA) ride this mis-attributed event. The correct semantic is `survey_campaign.closed` (the new event from B1-S6). | After B1-S6, PATCH handoffs 442 and 115 to point at the new `survey_campaign.closed` event; then DELETE the orphaned event 134 (or repurpose by renaming to `engagement_driver.cycle_closed` if cycle-close on driver-level is a real concept — unlikely). |
| B1-S8 | **B9 inbound event mis-attribution** | **Handoff 116 `attrition_risk.high` (trigger_event 10, payload `employees` id 31)** is published by EMP-EXP-CONTINUOUS-LISTEN but the event's `data_object_id` points at `employees` (embedded_master here, canonical master in HCM). Per the B-band write-time rule, EMP-EXP cannot publish a state-change on `employees` because EMP-EXP doesn't master employees. The signal is real (attrition risk inferred from responses + drivers) but the trigger_event should be keyed against an EMP-EXP-mastered entity (e.g. a derived `engagement_signals` or a new attribute on `engagement_drivers`). | Surface to user; either rename + repoint trigger_event 10 to a derived EMP-EXP entity, or reclassify handoff 116 as a `compute`-style signal flow rather than a state-change handoff. May need Bucket 2 follow-up. |
| B1-S9 | **B9b (hard fail)** | **Zero intra-domain cross-module `handoffs` rows for EMP-EXP** despite 2 modules with clear cross-module flow: `engagement_drivers` (mastered by 64) → `action_plans` (mastered by 65). The `data_object_relationships` row 146 (`engagement_drivers triggers action_plans`) names exactly this cross-module event chain; today the catalog has no handoff row for it. Required intra-domain handoff: (a) `64 → 65` on `survey_campaign.closed` so Action Planning picks up newly-available driver scores to plan against, and (b) `64 → 65` on a new `engagement_driver.flagged` event when a driver crosses a threshold (the "trigger" verb on relationship 146). | Author 2 intra-domain handoff rows with `source_domain_id=target_domain_id=62`, `source_domain_module_id=64`, `target_domain_module_id=65`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`. Depends on B1-S6 (the closed event must exist). |
| B1-S10 | **B7 duplicate user-edges** | **2 duplicate-shape `data_object_relationships` rows from `users` (748) → `survey_campaigns` (181).** Row 151 (`owns`) and row 152 (`creates`) both target the same pair with different verbs. The catalog convention is one row per actor-role; if both `owner` and `creator` are needed they go on distinct rows but the verb-shapes here overlap semantically. | Surface to user; either consolidate to `owns` (the more authoritative verb) and DELETE row 152, OR rename row 152 to a non-overlapping actor like `authors`. |
| B1-S11 | **B10b (in-scope)** | **3 outbound handoffs from EMP-EXP carry NULL `target_domain_module_id` even though the target is modularized.** Handoffs 1077 (`action_plan.completed → PA`), 444 (`survey_response.received → PA`), 115 (`survey.cycle_closed → PA`) all target PA (id 63), which IS modularized (e.g. `PA-ENGAGEMENT-SURVEYS` id 82 declares consumer DMDO on `survey_responses` and derived on `engagement_drivers`). Per B10b's derivation: the target module is the one in PA that holds the handoff payload's data_object with the strongest role. For 444 and 115 that's module 82 (consumer / derived on the payload). For 1077 (`action_plans`) PA has no DMDO row on `action_plans` — that's a secondary gap routed to PA's audit (PA owes a consumer DMDO row on action_plans). | PATCH handoffs 444 and 115 to set `target_domain_module_id=82`. Handoff 1077 remains NULL pending PA's B-band fix to declare a consumer DMDO on action_plans; surface to PA audit. Also surface: handoff 1077 has notes "target NULL until PA is modularized" which is a Rule #15 violation (no provenance trailers in `notes` — see B2-S5 below); PATCH notes to empty as part of this fix. |
| B1-S12 | **B10b inbound (in-scope where applicable)** | **2 inbound handoffs from PA + COMP-MGMT to EMP-EXP carry NULL `target_domain_module_id`.** Handoff 1107 (PA `engagement.declining` → EMP-EXP, payload `engagement_surveys` id 45) and handoff 1136 (COMP-MGMT `compensation_statement.issued` → EMP-EXP, payload `compensation_statements` id 157). Per the derivation rule the target module is the EMP-EXP module that holds the payload data_object with strongest role. EMP-EXP has no DMDO row on either `engagement_surveys` (45) or `compensation_statements` (157), so both are "no candidate" sub-case 2 (handoff names a payload this domain doesn't model). | Surface to user; for 1107 add a `consumer` DMDO on EMP-EXP-CONTINUOUS-LISTEN for `engagement_surveys` (or recognize the handoff is mis-mapped — PA's `engagement_surveys` looks like a duplicate of EMP-EXP's `survey_campaigns` and may need consolidation). For 1136 the EMP-EXP module that reads comp data is likely `EMP-EXP-CONTINUOUS-LISTEN` (for total-rewards lifecycle survey integration). |
| B1-S13 | **H1 APQC TAGGING (hard fail — replace + add)** | **Only 4 of 13 cross-domain handoffs carry `handoff_processes` rows; zero `agent_curated`; multiple semantically wrong.** Existing 4 are all `proposal_source='discovery_substring'`: (a) handoff 1107 tagged 16944 `Conduct employee engagement surveys` (L3) — correct, keep; (b) handoff 409 tagged 19965 `Create customer journey maps` (L5) — wrong (this is an onboarding-stage survey, not customer-journey); (c) handoff 442 tagged 10018 `Survey market and determine customer needs and wants` (L3) — wrong (customer-market research, not employee survey); (d) handoff 115 tagged same wrong 10018. Volume expectation per SKILL: 0.5N to 0.8N for N=13 → 7-10 `agent_curated` rows. | Propose 9-10 `agent_curated` rows below; replace the 3 wrong `discovery_substring` rows; defer 2-3 untaggable to Discover Pass 3. |

#### APQC TAGGING proposals (B1-H1)

| handoff_id | source → target | trigger_event | payload | Proposed PCF (process_name / external_id / level) | Confidence |
|---|---|---|---|---|---|
| 442 | EMP-EXP-CONTINUOUS-LISTEN → HCM | `survey.cycle_closed` | `engagement_drivers` | `Manage employee assistance and retention` (21439 L3) — survey cycle closes feed HCM retention motions | confident L3 |
| 443 | EMP-EXP-CONTINUOUS-LISTEN → TALENT-MGMT | `survey_response.received` | `survey_responses` | `Manage employee career development` (21700 L3) — responses inform development planning | confident L3 |
| 444 | EMP-EXP-CONTINUOUS-LISTEN → PA | `survey_response.received` | `survey_responses` | `Review engagement and retention indicators` (10510 L4) — responses feed people analytics | confident L4 (parent L3 `Manage employee assistance and retention` 21439 also acceptable) |
| 1077 | EMP-EXP-ACTION-PLANNING → PA | `action_plan.completed` | `action_plans` | `Review engagement and retention indicators` (10510 L4) | confident L4 |
| 1078 | EMP-EXP-ACTION-PLANNING → HCM | `action_plan.completed` | `action_plans` | `Manage employee assistance and retention` (21439 L3) | confident L3 |
| 445 | EMP-EXP-ACTION-PLANNING → WORK-MGMT | `action_plan.created` | `action_plans` | `Manage employee assistance and retention` (21439 L3) — action plan spawns task tracking | confident L3 |
| 1248 | EMP-EXP-ACTION-PLANNING → WORK-MGMT | `action_plan.completed` | `action_plans` | `Manage employee assistance and retention` (21439 L3) | confident L3 |
| 115 | EMP-EXP-CONTINUOUS-LISTEN → PA | `survey.cycle_closed` | `engagement_drivers` | `Review engagement and retention indicators` (10510 L4) | confident L4 (REPLACES the wrong discovery_substring 10018 row) |
| 116 | EMP-EXP-CONTINUOUS-LISTEN → HCM | `attrition_risk.high` | `employees` | `Manage employee assistance and retention` (21439 L3) — attrition risk feeds retention intervention | confident L3 (depends on resolution of B1-S8) |
| 1107 | PA → EMP-EXP-CONTINUOUS-LISTEN | `engagement.declining` | `engagement_surveys` | KEEP existing `Conduct employee engagement surveys` (16944 L3) — discovery_substring landed the right row | keep, optionally promote to `agent_curated` |
| 1136 | COMP-MGMT → EMP-EXP | `compensation_statement.issued` | `compensation_statements` | `Administer compensation and rewards to employees` (10502 L4) — comp-statement triggers post-issuance pulse | confident L4 (depends on resolution of B1-S12) |
| 409 | ONBOARDING → EMP-EXP-CONTINUOUS-LISTEN | `journey.day_one_reached` | `onboarding_journeys` | `Manage employee onboarding` (10469 L3) — day-one survey is part of onboarding | confident L3 (REPLACES wrong 19965 `Create customer journey maps`) |
| 1231 | ONBOARDING → EMP-EXP-CONTINUOUS-LISTEN | `onboarding_stage.completed` | `onboarding_journeys` | `Manage employee onboarding` (10469 L3) — stage-completion pulse during onboarding | confident L3 |

Deferred-to-Discover: zero rows truly defer for EMP-EXP, the surface is well-covered by PCF 21439 / 10510 / 16944 / 21700 / 10469 / 10502. The replacement-of-wrong-tag pattern is the dominant move (handoffs 442, 115, 409).

#### Bucket 1 sub-categorization

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 (Bucket 3 territory) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (E + F + B9 + B9b + B7 + B10b) | 12 |
| BOUNDARY (B10b in-scope + cross-domain relationship gaps) | 1 (B1-S11; counted in STRUCTURAL above to avoid double-count) |
| APQC TAGGING (per-handoff PCF) | 1 line, 13 underlying rows (9-10 new + 2 replacement + 1 keep + 1 conditional) |
| **Bucket 1 total** | **14** |

### Bucket 2 — Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **B4 pattern flag positive re-evaluation per Rule #12.** Current flags: `survey_campaigns.has_submit_lock=true`, `survey_responses.has_personal_content=true`. Other three masters have all three flags false. Need positive confirmation: should `engagement_drivers.has_submit_lock=true` (driver definitions should freeze once published so historical scores remain comparable)? Should `action_plans.has_personal_content=true` (action plans often reference specific manager-employee conversations)? Should `pulse_questions.has_submit_lock=true` (published questions should be immutable to preserve cross-period comparability)? Should `survey_responses.has_submit_lock=true` (a submitted response should be immutable to preserve audit trail)? Should `action_plans.has_single_approver=true` (manager approval gating)? | Pattern flags are workflow-shape judgments the user owns; the default false doesn't establish review. Per Rule #15, recording the consideration in `notes` is forbidden. | Per-flag yes/no from user; the decisions are captured below. |
| B2-S2 | **Rule #15 notes pollution on `data_objects`.** `engagement_drivers` (183) carries text "Config-shaped framework definitions; no workflow. Edited by program admin; record_status is the only state worth tracking." and `pulse_questions` (185) carries "Config-shaped library entries; published vs draft is the only state worth tracking and is captured by record_status." Rule #15 explicitly RESCINDED the prior Rule #12 license to write the config-shape exemption to `data_objects.notes`. Were these notes user-approved at load time, or were they auto-populated by the loader? | Cannot tell from audit alone; the notes might have been explicitly approved during Phase-B load (in which case they stay) or auto-written (in which case Rule #15 mandates revert + append entry to `references/skill-changelog.md` Incidents). | (a) Confirm user-approved at load time, leave in place. (b) Confirm auto-population; PATCH both rows to empty string and log the Rule-#15 incident. The audit conversation IS the approved persistence surface for the config-shape exemption decision per Rule #15. |
| B2-S3 | **Rule #15 notes pollution on `handoffs`.** Handoff 1077 carries notes "target NULL until PA is modularized" (the exact pattern the Rule #15 RESCINDED license flagged as forbidden). Handoff 116 carries the longer notes "B10b tie resolution: trigger_events.data_object_id=employees is embedded_master on both EMP-EXP modules. attrition_risk.high is derived from survey_responses + engagement_drivers analysis, so CONTINUOUS-LISTEN is the signal publisher." Were these annotations user-approved? | Same as B2-S2 — load-time approval status unknown; the wording shapes look auto-written. | (a) User-approved, leave. (b) Auto-written; PATCH both to empty and record the relevant context (the B1-S8 reclassification question, the B1-S11 PA modularization note) in this audit file or chat instead. |
| B2-S4 | **B1-S8 — `attrition_risk.high` handoff reclassification.** Handoff 116 publishes a derived signal (attrition risk inferred from EMP-EXP analysis) on an event keyed against `employees` (HCM-mastered). Three options to make it well-formed: (a) introduce a new EMP-EXP-mastered derived entity `engagement_signals` and re-key the event; (b) keep `employees` as payload but add a derived data_object_relationship `survey_responses + engagement_drivers → infers → attrition_risk` and let the event's `data_object_id` continue pointing at employees with the understanding it's a downstream-flag signal; (c) reclassify as a `compute` workflow tool output (not a handoff in the catalog at all). | Architectural intent question — depends on how derived signals should be modeled catalog-wide. | (a) New derived entity. (b) Keep as-is, add audit annotation. (c) Reclassify as compute-only. |
| B2-S5 | **B1-S10 — duplicate user-edge resolution.** Rows 151 (`users owns survey_campaigns`) and 152 (`users creates survey_campaigns`) both target the same pair. The catalog convention elsewhere (per the APM B7 finding) was DELETE the legacy noun-phrase form, but here both forms are verb-shaped. | Editorial decision: are `owner` and `creator` semantically distinct actor-roles worth keeping as two rows, or is one redundant? | (a) DELETE 152 (owner subsumes creator). (b) Rename 152's verb to `authors` (distinct lifecycle role). (c) Leave both; the duplication is intentional. |
| B2-S6 | **Existing skill 55 naming + scope** (related to B1-S2). Skill 55 is named `emp-exp-system` (hyphenated, domain-spanning) but anchored only to module 64. Rule #17 prefers per-module naming `<module_code_lower>_agent`. The fix in B1-S2 is to rename + split, but the rename has a UI side-effect: any user-side references to the old skill code break. | UI / RBAC-design judgment: how is the skill discovery surface used today? Renaming is mechanically simple but has downstream effect. | (a) Rename skill 55 in place to `emp_exp_continuous_listen_agent`, create new `emp_exp_action_planning_agent` for module 65. (b) Leave skill 55 as-is, create only the new module 65 skill (accept F2-style drift on module 64). (c) Delete and recreate both. |

### Bucket 3 — Phase 0 pending (speculative; from market-audit semantic pass)

The market-audit semantic pass against Workday Peakon, Culture Amp, Glint, Qualtrics EmployeeXM, Lattice, 15Five, Microsoft Viva Connections, Firstup, Haiilo surfaces the following candidate entity gaps. None of these are vetted by a formal Phase 0 vendor-surface document; they're vendor-knowledge candidates the user can choose to vet or eyeball.

| # | Entity | Proposed module | Vendor knowledge basis | Recommended verification |
|---|---|---|---|---|
| B3-S1 | `survey_templates` | EMP-EXP-CONTINUOUS-LISTEN | Every flagship distinguishes between the question bank (`pulse_questions`) and the reusable campaign template (theme, cadence, target population shape). Culture Amp + Peakon + Glint all surface a Template entity. | Phase 0 vendor docs walkthrough on Culture Amp + Glint template configuration screens. |
| B3-S2 | `engagement_themes` | EMP-EXP-CONTINUOUS-LISTEN | Themes (Belonging, Wellbeing, Manager Effectiveness, Recognition) group drivers and are the unit of cross-time-period reporting. Distinct from drivers — themes are higher-level taxonomy, drivers are individual signals. | Culture Amp's "Themes" surface; Workday Peakon's "Driver Categories". |
| B3-S3 | `survey_invitations` | EMP-EXP-CONTINUOUS-LISTEN | The audience-side row: one invitation per (campaign, employee), captures delivery, open, completion timestamps. Glint and Peakon both model this as a first-class row distinct from `survey_responses` (an invitation exists even before the response). | Workday Peakon API; Glint's invitation status lifecycle. |
| B3-S4 | `sentiment_topics` | EMP-EXP-CONTINUOUS-LISTEN | NLP-derived topics from free-text comments. Culture Amp's "Topic Clustering" and Peakon's "Comment Themes" are the flagship surfaces. | Vendor docs on NLP topic models; check whether the topics table is per-tenant configured or universal. |
| B3-S5 | `manager_action_recommendations` | EMP-EXP-ACTION-PLANNING | The agent-generated suggestion row that precedes a human-approved `action_plans` row. 15Five Predictive Impact and Peakon's "Manager Recommended Actions" treat these as a first-class entity with accept / reject / customize lifecycle. | 15Five docs on Predictive Impact; Lattice Engagement's "Manager Insights". |
| B3-S6 | `360_review_cycles` | EMP-EXP-CONTINUOUS-LISTEN (or new EMP-EXP-360 module) | Capability `360-FEEDBACK` exists but no master entity carries the cycle config (rater pool, anonymity rules, review window). Lattice + Culture Amp + Leapsome master this distinctly from engagement surveys. | Lattice 360 docs; capability split between 360 and engagement. |
| B3-S7 | `recognition_events` | EMP-EXP-CONTINUOUS-LISTEN (or PEER-RECOGNITION if promoted) | Peer-to-peer recognition entries (Bonusly / Kudos / Workhuman model). Adjacent to engagement but distinct workflow; if promoted to its own domain, lives in PEER-RECOGNITION (already in `_missing-domains.md` queue, mention_count now 2). | Decide whether peer recognition is in-domain (capability of EMP-EXP) or its own domain. Vendor evidence (Bonusly, Workhuman, Achievers as pure-plays) argues for separate domain. |
| B3-S8 | `pulse_cohorts` | EMP-EXP-CONTINUOUS-LISTEN | The sampling-cohort entity used by Peakon and Glint to vary pulse frequency by team-rotation (rotate which 1/4 of the company gets surveyed each week). Distinct from `org_units` because cohorts can be ad-hoc. | Peakon docs on pulse rotation strategy. |
| B3-S9 | `engagement_score_snapshots` | EMP-EXP-CONTINUOUS-LISTEN | Time-series score record (per period × org_unit × driver). Today `engagement_drivers` is config-shaped; the actual computed score per period has no home. Glint and Peakon master this as a first-class snapshot row to preserve historical trends. | Vendor docs on score history retention. |

**Bucket 3 prompt:** vet via formal Phase 0 vendor research (a second-pass subagent producing a tighter `c:/tmp/EMP-EXP-phase0-<date>.md` with vendor entity surfaces per row), or eyeball-mode (you name which of the 9 to treat as confirmed and we add them via Phase B to the relevant module)?

The strongest signals are **B3-S3 (survey_invitations)** and **B3-S9 (engagement_score_snapshots)**, both flagship-mastered across Glint and Peakon and both fixing a real catalog gap (no audience-side row, no time-series score row). **B3-S7 (recognition_events)** is the cross-bucket dependency: its disposition depends on the EMP-EXP vs PEER-RECOGNITION domain decision.

### Cross-bucket dependencies

- **B2-S2 + B2-S3 (Rule #15 notes pollution)** are **independent** of Bucket 3 — the question is about load-time approval, not market surface.
- **B2-S4 (attrition_risk reclassification)** is **dependent** on B3-S5 / B3-S9: if `manager_action_recommendations` and `engagement_score_snapshots` get loaded, the derived-signal substrate exists and option (a) for B2-S4 becomes natural.
- **B1-S2 (F2 module 65 needs system skill)** depends on B2-S6 (rename / split decision shapes the new skill code).
- **B1-S1 (E1 / E2 zero roles)** is **independent** but creates substantial role-authoring work; the user may want to batch it with the Bucket 2 pattern-flag decisions since both involve workflow-shape judgments.
- **B1-S11 (PA target_domain_module_id NULL on handoff 1077)** depends on PA's audit declaring a consumer DMDO row on `action_plans` — surface as PA b1 owed work, do not fix from EMP-EXP.
- **B3-S7 (recognition_events)** depends on the PEER-RECOGNITION promote/fold decision in `audits/_missing-domains.md`. If promoted, recognition stays out of EMP-EXP; if folded, B3-S7 becomes an EMP-EXP load.

### Per-bucket prompts

**Bucket 1 — fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S9, H1-all`), or `skip`.

- **B1-S1 (E1/E2 zero roles — author 3 roles + role_modules + role_permissions):** large structural fix; needs role-design decision.
- **B1-S2 (F2 module 65 has no system skill — split + rename existing skill 55):** depends on B2-S6.
- **B1-S3 (F3 thin skill_tools — add mutations + notify_person):** structural; bundle with B1-S2.
- **B1-S4 (F7 send_email channel violation — repoint to notify_team):** mechanical PATCH.
- **B1-S5 (F7 wrong primitive sign_document — DELETE):** mechanical DELETE.
- **B1-S6 (B9 missing survey_campaign.closed event — INSERT):** trivial.
- **B1-S7 (B9 wrong-attribution survey.cycle_closed event — re-point handoffs, DELETE or rename event 134):** depends on S6.
- **B1-S8 (B9 attrition_risk.high reclassification — depends on B2-S4):** gated on B2.
- **B1-S9 (B9b zero intra-domain handoffs — INSERT 2 rows):** depends on B1-S6 (closed event must exist).
- **B1-S10 (B7 duplicate user-edges — depends on B2-S5):** gated on B2.
- **B1-S11 (B10b NULL target on PA handoffs 444, 115 — PATCH to module 82; handoff 1077 owed by PA):** mechanical PATCH for 2/3.
- **B1-S12 (B10b inbound NULL — surface to user + add EMP-EXP DMDO for engagement_surveys / compensation_statements):** depends on user disposition.
- **B1-S13 (H1 APQC TAGGING — load 10 new agent_curated rows + replace 3 wrong discovery_substring rows):** load now or in a follow-up batch?

**Bucket 2 — what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (pattern flags):** per-flag yes/no for the 5 candidates above.
- **B2-S2 (Rule #15 notes on engagement_drivers + pulse_questions):** user-approved or revert?
- **B2-S3 (Rule #15 notes on handoffs 1077 + 116):** user-approved or revert?
- **B2-S4 (attrition_risk handoff reclassification):** option (a) / (b) / (c)?
- **B2-S5 (duplicate user-edge resolution):** option (a) / (b) / (c)?
- **B2-S6 (skill 55 rename + split):** option (a) / (b) / (c)?

**Bucket 3 — Phase 0 pending — vet via formal Phase 0 vendor research, or eyeball-mode? If eyeball, name which of the 9 to treat as confirmed.**

Also: 4 candidate domains were queued to `audits/_missing-domains.md`: EMP-LISTENING (now mention_count 2), PEER-RECOGNITION (2), EMP-ADVOCACY (3), INTERNAL-COMMS (1, new). Triage decisions on those are orthogonal to this audit but B3-S7's disposition depends on PEER-RECOGNITION's fate.

### Report-only follow-ups (owed by other domains)

- **PA b1 owes** a consumer DMDO row on `action_plans` (id 184) so handoff 1077's `target_domain_module_id` can be derived. Also surface: PA's `engagement_surveys` (id 45) looks like a duplicate of EMP-EXP's `survey_campaigns` (id 181); a PA audit should reconcile whether 45 should be retired in favor of consuming EMP-EXP's 181, or whether they're legitimately distinct concepts (PA's score-substrate vs EMP-EXP's authoring-substrate).
- **PA b1 owes** B9b / B10b cleanup on handoff 1107 (`engagement.declining` → EMP-EXP NULL target_module): EMP-EXP would accept this on `EMP-EXP-CONTINUOUS-LISTEN` (id 64) once we add a consumer DMDO on the payload, but the source side (PA-ENGAGEMENT-SURVEYS source_domain_module_id 82) is set correctly already.
- **COMP-MGMT b1 owes** clarification on handoff 1136 (`compensation_statement.issued` → EMP-EXP): is the target legitimately EMP-EXP-CONTINUOUS-LISTEN (post-comp pulse survey), or is the handoff mis-mapped? Surface during COMP-MGMT's audit.
- **HCM b1 owes** B10b on handoffs 442, 1078, 116 (all → HCM); EMP-EXP's source side is populated, HCM should validate / populate target module from its side.
- **TALENT-MGMT b1** has consumer DMDO on `survey_responses` already (module 52); no work owed there.
- **WORK-MGMT b1** has consumer DMDO on `action_plans` on module 149 already; no work owed.
- **ONBOARDING b1** owes confirmation that handoffs 409, 1231 source_domain_module_id=35 is the correct ONBOARDING module — already set, this is informational.
- **Cross-domain `data_object_relationships` mirror check** (B8 inbound direction): rows 161 (`engagement_drivers feeds people_kpis`) and 162 (`survey_responses feeds people_kpis`) are owned by EMP-EXP (source side) and target PA's `people_kpis` (id 43). PA's B8 should mirror-validate these on its own audit pass.

## 2026-05-31, Continuation: B1 technical fixes

Loader: [.tmp_deploy/fix_emp_exp_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_emp_exp_b1_technical_2026_05_31.ts), run from project root.

### Applied (truly-technical B1 only)

- **B1-S5** — DELETE `skill_tools` row id 514 (`skill_id=55, tool_id=42`, `sign_document` wrong primitive on emp-exp listening skill). Verified empty post-run.
- **B1-S11** — PATCH `handoffs.id=1077 notes=''` (Rule #15 revert of "target NULL until PA is modularized" provenance trailer). Note: live re-check showed `handoffs.id=444` and `handoffs.id=115` already carried `target_domain_module_id=82` from a prior backfill, so no FK PATCH was needed on those rows.
- **B1-S13** — APQC TAGGING:
  - DELETE 3 wrong `discovery_substring` rows (handoff_processes ids 150 [handoff 409 → `Create customer journey maps`], 173 [handoff 442 → `Survey market…`], 174 [handoff 115 → `Survey market…`]).
  - INSERT 11 new `agent_curated` rows (handoff_processes ids 468–478) per the audit's pre-specified handoff_id + PCF external_id table, all `record_status='new'` (DB default per Rule #1). Covers handoffs 442, 443, 444, 445, 1077, 1078, 1248, 115, 1136, 409, 1231. Skipped handoff 116 (gated on B2-S4) and handoff 1107 (kept existing correct `discovery_substring` row id 86 per audit). EMP-EXP cross-domain handoff APQC coverage is now 12 of 13 rows.

### Deferred B1 items (require user judgment or are gated)

- **B1-S1** — zero roles for the domain; persona authoring requires user direction.
- **B1-S2** — F2 module 65 needs a new `system` skill plus rename / split of skill 55; gated on B2-S6 disposition.
- **B1-S3** — F3 thin `skill_tools`; new mutation + abstraction tools require authoring decisions.
- **B1-S4** — F7 `send_email` repoint to `notify_team`; `skill_tools.tool_id` swap not on the technical allowlist (essentially row replacement, not a naming PATCH).
- **B1-S6** — INSERT `survey_campaign.closed` `trigger_events` row; new entity authoring deferred.
- **B1-S7** — re-point handoffs 442 / 115 to the new event and DELETE / repurpose event 134; gated on B1-S6.
- **B1-S8** — reclassification of handoff 116 / trigger_event 10 (`attrition_risk.high`); audit explicitly surfaces to user (option (a) / (b) / (c) under B2-S4).
- **B1-S9** — INSERT 2 intra-domain `handoffs` rows; new handoff authoring deferred (also depends on B1-S6).
- **B1-S10** — duplicate user-edges (`data_object_relationships` rows 151 / 152); audit lists options (a) / (b) / (c) under B2-S5.
- **B1-S12** — B10b inbound NULL on handoffs 1107 / 1136 to EMP-EXP; audit pre-specifies "surface to user" plus new DMDO authoring not on technical allowlist.

No JWT-audience errors during this pass.

## 2026-05-31, Audit

### Summary

Re-run of Validate b1 against live state after the 2026-05-31 Continuation. Footprint unchanged at the entity level (2 modules id 64 / 65, 5 capabilities, 10 solutions, 5 domain-owned masters plus `employees` + `org_units` + `onboarding_journeys` as embedded / consumer DMDOs). Cross-domain handoffs steady at 9 outbound + 4 inbound = 13 total. Intra-domain handoffs still zero. Lifecycle states present on 3 of 5 masters (`survey_campaigns` 4 states, `survey_responses` 3 states, `action_plans` 4 states); `engagement_drivers` + `pulse_questions` remain config-shaped without states. APQC coverage jumped to 12 of 13 cross-domain handoffs (handoff 116 deferred per B2-S4 gate); 11 of the 12 are `agent_curated record_status='new'`, 1 (`handoff 1107`) is the prior `discovery_substring` row kept per audit. Zero rows currently `record_status='approved'`, so the H1 catalog-quality headline remains 0%.

- Bucket 1 (in-scope, agent fixable): 9 items pending (B1-S1, B1-S2, B1-S3, B1-S4, B1-S6, B1-S7, B1-S9, B1-S11-residual, B1-S13-residual).
- Bucket 2 (surface-for-user, judgment): 6 items pending (B2-S1 through B2-S6 unchanged from 2026-05-30).
- Bucket 3 (Phase 0 pending, speculative): 9 items pending (B3-S1 through B3-S9 unchanged).

### Structural band re-check

- **A**: passes. `domains` row 62 fully populated (`crud_percentage=95`, `cost_band=$$`, `min_org_size=20 s <500`, `usa_market_size_usd_m=1500`, `market_size_source_year=2025`, `certification_required=false`, `business_logic=""` accepted because `crud_percentage >= 95`).
- **M**: passes. M1 (>=1 full module) and M2 (>=2 full modules for >=3 caps) hold; M4 all 5 caps realized via `domain_module_capabilities` (4 on module 64, 1 on module 65); M7 single-master pass confirmed by reading DMDO rows.
- **B5**: passes (lifecycle states present on the workflow-bearing masters).
- **B7**: HARD-FAIL persists. `data_object_relationships` rows 151 and 152 both connect `users` (748) to `survey_campaigns` (181) with overlapping `owns` / `creates` verbs; the prior audit's B1-S10 / B2-S5 question is unresolved.
- **B9**: HARD-FAIL persists. `trigger_events` set still missing `survey_campaign.closed` (id 449 `survey_campaign.launched` exists; close event absent). Event 134 `survey.cycle_closed` still keyed at `engagement_drivers` (183) which is wrong-attribution; handoffs 442 and 115 still ride event 134. Event 10 `attrition_risk.high` still keyed at `employees` (31); handoff 116 publishes on it (gated on B2-S4).
- **B9b**: HARD-FAIL persists. Zero intra-domain `handoffs` rows between modules 64 and 65 despite `data_object_relationships` row 146 (`engagement_drivers triggers action_plans`) naming exactly this cross-module flow.
- **B10b**: PARTIAL. Outbound NULL targets on handoffs 444, 115 were resolved during the Continuation (both now point at PA module 82). Inbound NULL targets persist on handoffs 1107 (PA `engagement.declining` payload `engagement_surveys` id 45) and 1136 (COMP-MGMT `compensation_statement.issued` payload `compensation_statements` id 157) because EMP-EXP holds no DMDO row on either payload. Outbound handoff 1077 (`action_plan.completed` -> PA) still NULL pending PA's own audit declaring a consumer DMDO on `action_plans`.
- **B11 / B12**: pass. Module-host junctions are empty (no cross-domain module hosting today, both modules belong solely to EMP-EXP); kind-discriminator usage on DMDOs is consistent with each master being `kind='domain_owned'`.
- **C**: HARD-FAIL. `business_function_capabilities` returns 0 rows for capability ids 45-49. The Employee Experience business function (id 79) exists but no capability is wired to it, so neither owner nor consumer attribution is recorded for the domain.
- **D**: passes (10 `data_object_aliases` rows across the 5 masters).
- **E1-E5**: HARD-FAIL persists. Zero `role_modules` rows on modules 64 / 65; zero `roles` for the domain; zero `role_permissions`. Persona authoring still requires user direction.
- **F1**: pass.
- **F2**: HARD-FAIL persists. Module 64 still hosts the lone `skill_type='system'` skill 55 (`emp-exp-system`). Module 65 has zero system skills. Per Rule #17 each `domain_modules` row needs exactly one system skill.
- **F3**: PARTIAL. Skill 55 now carries 6 `skill_tools` rows (down from 7 after the B1-S5 DELETE removed `sign_document`). 5 are `query_*` reads (one per master); the only side_effect tool is `send_email` (id 37). Floor of "required mutations + notify abstraction" still not met.
- **F4**: pass (`operation_kind` invariants hold across the 6 rows; `send_email` is `side_effect` with `data_object_id` null, the 5 query tools have `data_object_id` set).
- **F5**: Semantius score uncomputable on module 65 (no system skill). On module 64 the score is degraded by the single channel-primitive (`send_email`); the F7 finding below addresses it.
- **F7**: HARD-FAIL persists. `skill_tools` row id 513 still links `send_email` (channel-specific) with empty `notes`; the F7 rule wants `notify_team` for broadcast survey invitations or a workflow-specific justification.
- **H**: PARTIAL after Continuation. 12 of 13 cross-domain handoffs carry `handoff_processes` rows; 11 are `agent_curated record_status='new'`, 1 is the kept `discovery_substring` row. Zero `record_status='approved'`, so the catalog-quality headline stays 0% pending reviewer sign-off; the process side-bar is healthy at ~85% `agent_curated`. Handoff 116 still untagged (gated on B2-S4 reclassification).

### Bucket 1 - In-scope confirmed gaps (pending after Continuation)

| ID | Band | Pending action |
|---|---|---|
| B1-S1 | E1 / E2 / E3 / E4 / E5 | Author 3 roles (`EMPLOYEE-EXPERIENCE-PROGRAM-MANAGER`, `HR-BUSINESS-PARTNER`, `PEOPLE-MANAGER`), 6+ `role_modules` rows, 8-12 `role_permissions` rows. Gated on user role-design direction. |
| B1-S2 | F2 / Rule #17 | Insert new `skills` row for module 65 (`emp_exp_action_planning_agent`), rename skill 55 to `emp_exp_continuous_listen_agent`, re-anchor `query_action_plans` (tool 444) from skill 55 to the new skill, author >=3 `skill_tools` rows for the new skill. Gated on B2-S6. |
| B1-S3 | F3 | Extend Phase-S toolset with workflow-gate mutates (`launch_survey_campaign`, `close_survey_campaign`, `submit_survey_response`, `create_action_plan`, `complete_action_plan`) plus `notify_person` / `notify_team` abstractions. Bundle with B1-S2. |
| B1-S4 | F7 | PATCH `skill_tools` row 513 to repoint at `notify_team` (id 914) for the broadcast invitation pattern; optionally add a second row pointing at `notify_person` (id 913) for single-recipient nudges. Mechanical row replacement once authoring shape is agreed. |
| B1-S6 | B9 missing event | Insert `trigger_events` row `survey_campaign.closed` (`event_category='state_change'`, `data_object_id=181`). Prerequisite for B1-S7 and B1-S9. |
| B1-S7 | B9 wrong-attribution | After B1-S6 lands, PATCH handoffs 442 and 115 from `trigger_event_id=134` to the new `survey_campaign.closed` event id; DELETE or rename event 134 (`survey.cycle_closed` keyed at `engagement_drivers` is wrong substrate). |
| B1-S9 | B9b | Author 2 intra-domain `handoffs` rows (both `source_domain_id=target_domain_id=62, source_domain_module_id=64, target_domain_module_id=65`): one on `survey_campaign.closed` (after B1-S6) feeding Action Planning, one on a new `engagement_driver.flagged` threshold event so driver-level signals spawn action plans (mirroring `data_object_relationships.id=146`). |
| B1-S11-residual | B10b | Outbound handoffs 444 and 115 already PATCHed to PA module 82 during the Continuation. Outbound handoff 1077 still NULL pending PA's audit declaring a consumer DMDO on `action_plans` (id 184) so its `target_domain_module_id` can be derived. No EMP-EXP-side action; surfaced to PA. |
| B1-S13-residual | H1 catalog quality | 11 `agent_curated` rows are `record_status='new'`; the H1 catalog-quality headline reads 0% until a reviewer signs off. Plus handoff 116 still untagged (gated on B2-S4). |

### Bucket 2 - Surface-for-user (judgment, all unchanged from 2026-05-30)

| ID | Question |
|---|---|
| B2-S1 | Pattern-flag positive re-eval per Rule #12 for `engagement_drivers.has_submit_lock`, `pulse_questions.has_submit_lock`, `survey_responses.has_submit_lock`, `action_plans.has_personal_content`, `action_plans.has_single_approver`. |
| B2-S2 | Rule #15 notes on `engagement_drivers` (id 183) and `pulse_questions` (id 185) still carry the config-shape exemption prose. Confirm user-approved at load time or revert + log incident. |
| B2-S3 | Rule #15 notes on handoff 116 (`B10b tie resolution: ...`) and handoff 1231 (`Stage completion (pre-board, day-one, week-one, 30-day) fires onboarding milestone surveys via EMP-EXP continuous-listen.`) still in place. Handoff 1077's notes were cleared in the Continuation. Confirm or revert. |
| B2-S4 | Reclassify handoff 116 `attrition_risk.high`: (a) new EMP-EXP-mastered derived entity (`engagement_signals`), (b) keep `employees` payload with annotation, or (c) reclassify as compute-only (not a handoff). |
| B2-S5 | Duplicate user-edge: `data_object_relationships` rows 151 (`users owns survey_campaigns`) and 152 (`users creates survey_campaigns`). (a) DELETE 152, (b) rename 152 to `authors`, or (c) keep both. |
| B2-S6 | Skill 55 rename + split into per-module skills, including new system skill for module 65 (gates B1-S2). |

### Bucket 3 - Phase 0 pending (unchanged)

B3-S1 through B3-S9 carry forward as on 2026-05-30: `survey_templates`, `engagement_themes`, `survey_invitations`, `sentiment_topics`, `manager_action_recommendations`, `360_review_cycles`, `recognition_events`, `pulse_cohorts`, `engagement_score_snapshots`. Strongest signals remain B3-S3 (`survey_invitations`) and B3-S9 (`engagement_score_snapshots`); B3-S7 (`recognition_events`) still depends on the PEER-RECOGNITION domain-promotion decision in `audits/_missing-domains.md`.

### Cross-bucket dependencies

- B1-S6 -> B1-S7 -> B1-S9 (the missing close event must exist before the wrong-attribution handoffs can be re-pointed and before the intra-domain handoffs can be authored).
- B1-S2 / B1-S3 / B1-S4 depend on B2-S6 (the rename / split decision determines per-module skill codes and tool placements).
- B1-S8 (the attrition_risk reclassification) is folded into B2-S4 and remains the gate for fully tagging handoff 116 under H1.
- B1-S1 (zero roles) is independent of every other pending item but the user may want to batch it with B2-S1 pattern-flag decisions since both shape workflow.
- B1-S11-residual is blocked on PA's audit (PA owes a consumer DMDO on `action_plans`).
- B3-S7 depends on the PEER-RECOGNITION promote-vs-fold decision.

### JWT errors

None.

### Report-only follow-ups (unchanged ownership)

- PA b1: declare consumer DMDO on `action_plans` (id 184) so handoff 1077's target module derives. Also reconcile whether PA `engagement_surveys` (id 45) is a duplicate of EMP-EXP `survey_campaigns` (id 181) or legitimately distinct (PA's score substrate vs EMP-EXP's authoring substrate). PA b1 also owes the inbound side of handoff 1107.
- COMP-MGMT b1: clarify handoff 1136 (`compensation_statement.issued` -> EMP-EXP) target intent (post-comp pulse-survey trigger vs mis-map).
- HCM b1: validate target-module population on handoffs 442, 1078, 116 from HCM's side.
- TALENT-MGMT and WORK-MGMT: no work owed (their consumer DMDOs on `survey_responses` and `action_plans` are already in place).
- ONBOARDING b1: source_domain_module_id=35 confirmed for handoffs 409, 1231; informational only.
- PA b1 (B8 mirror): `data_object_relationships` rows 161 (`engagement_drivers feeds people_kpis`) and 162 (`survey_responses feeds people_kpis`) should be reflected on the PA side.

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

---

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass against the open EMP-EXP state.yaml items (no fresh from-scratch audit). Domain 62 confirmed live (parent_domain_id=54, crud_percentage=95). 2 full modules (64 CONTINUOUS-LISTEN, 65 ACTION-PLANNING); 5 masters (survey_campaigns 181, survey_responses 182, engagement_drivers 183, action_plans 184, pulse_questions 185). Every open item classified EXECUTE / SURFACE / LEAVE per Rule #21. Loader: [.tmp_deploy/emp_exp_state_execute_2026_06_07.ts](../../.tmp_deploy/emp_exp_state_execute_2026_06_07.ts), run from project root. No JWT-audience errors.

Re-check note: handoff 116 (attrition_risk.high -> HCM), previously flagged untagged under B1A-S13-RES, is now tagged (handoff_processes id 1112, proposal_source='agent_curated', record_status='new') by a post-2026-05-31 pass. All 13 cross-domain EMP-EXP handoffs now carry a handoff_processes row.

### Executed (all writes record_status='new' / DB default per Rule #1)

- **B1A-ENTITY-TYPE (B13)** - PATCH entity_type on all 5 masters (all were 'unclassified'): survey_campaigns 181 -> operational_workflow, survey_responses 182 -> operational_record, engagement_drivers 183 -> computed, action_plans 184 -> operational_workflow, pulse_questions 185 -> catalog. 5 rows.
- **Catalog UX (Rule #20, A4 + M8)** - authored and wrote buyer-voice catalog_tagline + catalog_description (both were empty) on the domain row (62) and both modules (64, 65). 3 taglines + 3 descriptions = 6 column writes across 3 rows. No vendor names, no em-dashes, American English; empty-guard applied (only empty columns written).
- **B1A-S6 (B9)** - INSERT trigger_events survey_campaign.closed (event_category='state_change', data_object_id=181) -> new id 1551. Backs the close-survey gate on lifecycle state 585.
- **B1A-S9 (B9b)** - INSERT new threshold event engagement_driver.flagged (data_object_id=183) -> id 1552; plus 2 intra-domain handoffs 64 -> 65 (source_domain_id=target_domain_id=62, integration_pattern='lifecycle_progression', friction_level='low'): handoff 1404 on survey_campaign.closed (1551), handoff 1405 on engagement_driver.flagged (1552). Closes the B9b zero-intra-domain-handoff hard-fail. 1 event + 2 handoffs.
- **B1A-C (C-band)** - INSERT 5 business_function_capabilities rows (caps 45-49 owner of business_function_id=79 Employee Experience) -> ids 7-11. Closes the C-band owner-attribution hard-fail. (business_function_domains already carries owner 79 + consumer 32, so C1 needed no work. notes column omitted per Rule #15.)

Aliases (B11): no work - all 5 masters already carry 2 synonym aliases each (10 rows total). business_function_domains (C1): no work - owner + consumer already present.

### Surfaced (NOT written - destructive or judgment; user decision required)

- **B1A-S7 (DESTRUCTIVE)** - re-point handoffs 442 and 115 from wrong-attribution event 134 (survey.cycle_closed, keyed at engagement_drivers) to the new survey_campaign.closed (id 1551), then DELETE/rename event 134. Overwrites non-null trigger_event_id on existing rows + DELETE = needs sign-off.
- **B1A-S13-RES** - 12 agent_curated handoff_processes rows on the EMP-EXP surface remain record_status='new'; H1 headline 0% until reviewer promotes to 'approved'. Rule #1 forbids the agent promoting.
- **B1A-SELF-CONTAIN (M9, DESTRUCTIVE)** - DMDO row 293 (module 64, consumer/required on onboarding_journeys id 16, mastered by ONBOARDING) violates self-containment. Fix is embed-as-embedded_master OR set necessity='optional'; rewrites role/necessity on an existing row = needs sign-off.
- **B1A-PHASE-P (DEFER)** - 0 personas on a 2-module domain (E1 fail). Personas deferred per Rule #21. Candidate personas: EMPLOYEE-EXPERIENCE-PROGRAM-MANAGER, HR-BUSINESS-PARTNER, PEOPLE-MANAGER.
- **B2-S1** - pattern-flag positive re-eval (5 candidates). engagement_drivers is now 'computed' and pulse_questions 'catalog', so flags primarily matter on survey_campaigns 181 + action_plans 184.
- **B2-S2** - Rule #15 notes on data_objects 183, 185 (config-shape exemption prose; intent now structural via entity_type). user-approved vs PATCH-to-empty (destructive).
- **B2-S3** - Rule #15 notes on handoffs 116, 1231. user-approved vs PATCH-to-empty (destructive).
- **B2-S4** - reclassify handoff 116 attrition_risk.high (event keyed at HCM-mastered employees). Architectural intent; no longer gates 116 tagging.
- **B2-S5** - duplicate user-edges data_object_relationships 151 (owns) + 152 (creates) on (users, survey_campaigns). DELETE/rename is destructive.

### Left (no action)

- **b1b**: B1B-S1 (3 roles + role_modules + role_permissions) blocked on user role-design direction; B1B-S11-RES (handoff 1077 target module) blocked on PA audit declaring a consumer DMDO on action_plans.
- **Superseded (per-domain-skill restoration 2026-06-06)**: original B1B-S2/S3/S4 (per-module system skill for module 65 + skill 55 rename/split + skill_tools) and B2-S6 (skill 55 rename/split) are CANCELED under the new ONE-domain-grain-system-skill model. Per-module tool re-authoring tracked in audits/_modularization-backlog.md. Kept only as supersession markers.
- **b3 backlog**: B3-S1 through B3-S9 (survey_templates, engagement_themes, survey_invitations, sentiment_topics, manager_action_recommendations, 360_review_cycles, recognition_events, pulse_cohorts, engagement_score_snapshots). Strongest signals remain B3-S3 and B3-S9. B3-S7 depends on the PEER-RECOGNITION promote-vs-fold decision.

## 2026-06-13 - Audit (B9d execution, state-driven)

State-driven pass to close the one agent-executable open item, B1A-B9D-VERIFY (B9d had never run on this domain). Ran the committed resolver `scripts/analytics/b9d_resolver.ts EMP-EXP` in BOTH directions (`--dry-run` then `--write`). 13 boundary tags, 7 distinct (process, owner) findings: 4 ORPHAN, 2 RE-TAG (ROLL-UP), 1 MIS-TAG. No catalog writes; only local audit files touched. No JWT-audience errors.

### Executed (additive owner-side, local audit files only)

- **B1A-B9D-VERIFY resolved** and deleted from state.yaml (B9d has now run in both directions).
- **4 ORPHAN findings routed to owners** via the resolver `--write` (the B9d cross-domain carve-out: writing a b2 + q into the OWNER domain's audit files):
  - `B2-B9D-OWN-1048` "Review engagement and retention indicators" (owner EMP-EXP, unbuilt) - added to THIS domain's state.yaml b2 + q-EMP-EXP.md q15. Carried entities: action_plans, survey_responses, engagement_drivers (handoffs 1077/444/115 -> PA).
  - `B2-B9D-OWN-224` "Manage employee onboarding" (owner ONBOARDING) - resolver found ONBOARDING already carried it (q9); no duplicate added. Payload onboarding_journeys (handoffs 1231/409).
  - `B2-B9D-OWN-250` "Conduct employee engagement surveys" (owner PA) - added to audits/PA/state.yaml + q-PA.md q15. Payload engagement_surveys (handoff 1107).
  - `B2-B9D-OWN-1046` "Administer compensation and rewards to employees" (owner COMP-MGMT) - resolver found COMP-MGMT already carried it (q15); no duplicate added. Payload compensation_statements (handoff 1136).

### Surfaced (DESTRUCTIVE - sign-off required; new B2-B9D-RETAG item + q16)

B9d found 3 EMP-EXP-authored handoff_processes tags pointing at a coarser/wrong PCF code than the realized work. Re-pointing overwrites process_id on existing rows (and the MIS-TAG option may delete a row), so all surfaced, not executed:

- **RE-TAG (ROLL-UP)** handoff 443 (-> TALENT-MGMT, survey_responses): 7.3.3 "Manage employee career development" -> more specific 7.5.1.7 "Review engagement and retention indicators".
- **RE-TAG (ROLL-UP)** handoffs 1078 (-> HCM), 445/1248 (-> WORK-MGMT), 442 (-> HCM) on action_plans/engagement_drivers: 7.5.3 "Manage employee assistance and retention" -> 7.5.1.7.
- **MIS-TAG** handoff 116 (-> HCM, payload employees, HCM-mastered): 7.5.3 -> realized under 7.6.2 "Manage separation"; re-point or delete.

### State after this pass

No agent-executable work remains. status=feedback_needed, next_action_by=user. q-EMP-EXP.md refreshed (q15 ORPHAN owner, q16 RE-TAG/MIS-TAG sign-off added; footer agent-map updated). Open items are all user-gated: B1A-S7 (destructive re-point/delete), B1A-S13-RES (record_status approval, out of band per Rule #1), B1A-SELF-CONTAIN (M9 destructive rewrite), B2-S1/S2/S3/S4/S5 + B2-B9D-OWN-1048 + B2-B9D-RETAG (judgment/destructive); deferred: B1A-PHASE-P (personas); blocked-on-other-domain: B1B-S1 (role direction), B1B-S11-RES (PA owes consumer DMDO on action_plans); b3 backlog unchanged.

Cross-domain files edited by the resolver (sanctioned B9d carve-out): audits/PA/state.yaml + q-PA.md, audits/ONBOARDING (already had the item), audits/COMP-MGMT (already had the item).
