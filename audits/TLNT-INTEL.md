---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 19
---

# TLNT-INTEL: Audit History

## 2026-05-30: Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 3 full modules (`TLNT-INTEL-MARKETPLACE` id 175, `TLNT-INTEL-MOBILITY` id 176, `TLNT-INTEL-INSIGHTS` id 177); 7 masters (`internal_opportunities`, `opportunity_applications`, `mobility_recommendations`, `fit_scores`, `career_path_suggestions`, `mentorship_engagements`, `match_inference_runs`); 8 capabilities (all linked to a realizing module); 14 solutions (9 primary, 5 secondary); **0 trigger_events**, **0 outbound + 0 inbound handoffs**, **0 APQC tags**; 6 aliases across 2 of 7 masters; 14 lifecycle states across 3 of 7 masters (859, 860, 864); 3 system skills + 35 skill_tools (strict Semantius score 26/35 = 74%; operational score 26/35 = 74%); 0 catalog roles touching the modules (only built-in Administrator `role_id=2` holds the permissions); 16 permissions (9 baseline + 7 workflow-gate).
- **Vendor-surface basis:** Eightfold AI (Talent Intelligence Platform), Workday HiredScore, Gloat (Workforce Agility), Fuel50 (Talent Marketplace), Beamery (Talent Lifecycle), 365Talents (Skills + Mobility), Reejig (Workforce Intelligence), ServiceNow Talent Development, plus secondary: SAP SuccessFactors Opportunity Marketplace, Oracle Dynamic Skills, Phenom Intelligent Talent Experience, TalentGuard Career Pathing, Neobrain. Compliance-specialist coverage is implicit (EEOC-anchored fairness audit surface lives across the AI matching market; no dedicated AI-fairness compliance vendor is loaded as a solution today).
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 3 items.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items.

**Neighbor discovery** (auto-derived from cross-domain DMDO since handoffs are empty; ranked by edge weight = consumed master count + relationship count):

| Neighbor | Consumed masters (TLNT-INTEL role) | Cross-rels in | Cross-rels out | Out handoffs | In handoffs | Weight | Pass shape |
|---|---|---|---|---|---|---|---|
| SKILLS-MGMT | skill_taxonomies (consumer x1), competency_models (consumer x3), skill_profiles (consumer x3) | 2 (skill_profiles -> fit_scores, mobility_recommendations) | 0 | 0 | 0 | 9 | Pairwise (full) |
| HCM | employees (embedded_master x3, via id 31), job_profiles (consumer x1) | 0 | 0 | 0 | 0 | 4 | Pairwise (full) |
| ATS | job_requisitions (consumer x1), job_postings (consumer x1) | 0 | 0 | 0 | 0 | 2 | Pairwise (full) - inbound ATS embed of `internal_opportunities` already declared in ATS-CANDIDATE-CRM |
| TALENT-MGMT | performance_goals (consumer x1, optional), succession_plans (consumer x1, optional), career_aspirations (consumer x1) | 1 (career_aspirations -> career_path_suggestions) | 0 | 0 | 0 | 4 | Pairwise (full) |
| SWP | skills_gap_analyses (consumer x1) | 0 | 0 | 0 | 0 | 1 | Lightweight |

The dominant cross-domain finding is **structural emptiness at the handoff layer**. TLNT-INTEL has seven masters whose entire purpose is to react to upstream state changes (skill profile updates, requisition openings, employee transfers) and to publish back inference results (mobility suggestions, fit scores), yet zero `trigger_events` exist, zero outbound `handoffs` exist, and zero inbound `handoffs` exist. Every neighbor that should publish into TLNT-INTEL is silently doing so via the relationship graph only.

Structural pass bands: A (A1 metadata complete, A2 8 capabilities, A3 14 solutions with primary mix) PASS; M1-M7 PASS (3 modules, capability spread valid, no master conflicts); C1 PASS (Human Resources owner + 3 contributors); F1, F2, F3, F4 PASS (3 system skills 1:1 with modules, operation_kind invariants hold); **B9 hard fail** (zero trigger_events); **B10 hard fail** (zero inbound handoffs); **B10b vacuously passes** (no rows to check FK on, but the underlying gap is the row absence); **B11 partial fail** (5 of 7 masters carry zero aliases); **B12 partial fail** (4 of 7 masters carry zero lifecycle states with no recorded config-shape exemption); **B7 partial fail** (1 of 7 masters has no users edge); **B8 partial fail** (no outbound cross-domain relationship rows from TLNT-INTEL masters to neighbor masters); **B9b vacuously passes** (no intra-domain handoffs but also no published trigger_events to mirror); **E1-E5 hard fail** (zero catalog roles touch any TLNT-INTEL module, only built-in Administrator id 2 holds the permissions); **H1 vacuously hard fail** (zero cross-domain handoffs, so 0 of 0 tagged; the gap is the handoff absence, not the tag absence); **F5 computable** (strict 74%, operational 74%, F7 vacuously passes, only `notify_person` linked, no channel primitives).

Domain Semantius score: strict 26 platform / 35 total = **74%**; operational identical. The 9 non-platform skill_tools are all `coverage_tier='external'` `compute` tools that wrap ML inference (`compute_fit_score`, `recommend_mobility_moves`, `rank_succession_candidates`, `project_career_paths`, `run_match_inference`, `match_mentor_to_mentee`, `compute_workforce_skills_heatmap`, plus the two on skill 248 / 250 that share the same pattern). Expected for an AI-matching domain; not a Phase-S gap.

### Bucket 1: In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B9 hard fail** | Zero `trigger_events` rows exist for any of TLNT-INTEL's 7 masters, despite 14 published lifecycle states across 3 masters where 7 are `requires_permission=true` and several read like published verbs (`open`, `closed`, `cancelled` on `internal_opportunities`; `accepted`, `rejected` on `opportunity_applications`; `active`, `completed`, `cancelled` on `mentorship_engagements`). Each gated state is by construction an emitter, the lifecycle is documented but the event substrate is missing. | Insert ~10-12 `trigger_events` rows, `event_category='state_change'` for terminal/transition states (`opportunity.opened`, `opportunity.closed`, `opportunity.cancelled`, `opportunity_application.under_review`, `opportunity_application.accepted`, `opportunity_application.rejected`, `mentorship.activated`, `mentorship.completed`), `event_category='lifecycle'` for inference-generated outputs (`fit_score.computed`, `mobility_recommendation.produced`, `career_path.projected`, `match_inference_run.completed`). Each `data_object_id` points at the publishing master. |
| B1-S2 | **B9 hard fail** | Zero outbound `handoffs` rows from TLNT-INTEL, despite a 7-master surface that is functionally a publishing layer. Expected outbound handoffs once events exist (per the relationship + dependency graph): (a) `TLNT-INTEL-MARKETPLACE -> ATS-RECRUITMENT-PIPELINE` on `opportunity_application.accepted` (an internal hire converts to a candidate move in ATS), payload `opportunity_applications`; (b) `TLNT-INTEL-MARKETPLACE -> HCM-CORE-WORKER` on `opportunity_application.accepted` (an internal move triggers a worker reassignment), payload `opportunity_applications`; (c) `TLNT-INTEL-MOBILITY -> ATS-RECRUITMENT-PIPELINE` on `mobility_recommendation.produced` (skills-based-hiring suggestion seeds an ATS sourcing flow), payload `mobility_recommendations`; (d) `TLNT-INTEL-MOBILITY -> TALENT-SUCCESSION-CAREER` on `fit_score.computed` for a successor role (succession ranking input), payload `fit_scores`; (e) `TLNT-INTEL-MOBILITY -> TALENT-SUCCESSION-CAREER` on `career_path.projected` (career path suggestions feed career planning), payload `career_path_suggestions`; (f) `TLNT-INTEL-INSIGHTS -> SWP-DEMAND-FORECAST` on workforce-skills-heatmap recalculation (signal feeds strategic workforce planning), payload to be modeled. | Author 5-6 outbound handoff rows. Each: `integration_pattern='event_stream'` for the AI-matching outputs (real-time signal), `api_call` for the accepted-application worker reassignment, `friction_level='medium'` for the accepted-application transitions (cross-system identity reconciliation), `low` for the inference-signal rows. Set `source_domain_module_id` per master. |
| B1-S3 | **B9b vacuous-but-real** | Zero intra-domain cross-module handoffs even though the cross-module relationship graph shows `match_inference_runs` (mastered by 176 MOBILITY) `produces -> fit_scores` and `produces -> mobility_recommendations`, and `internal_opportunities` (mastered by 175 MARKETPLACE) is `consumer` on module 176 (MOBILITY consumes opportunities to compute fit scores), and `fit_scores` (mastered by 176 MOBILITY) is `consumer` on module 175 (MARKETPLACE consumes the fit ranking to rank opportunity applications). At least three intra-domain handoffs are implied: (a) `175 -> 176` on `opportunity.opened` so MOBILITY recomputes match inferences, (b) `176 -> 175` on `fit_score.computed` so MARKETPLACE can rank applications, (c) `175 -> 176` on `opportunity_application.submitted` so MOBILITY can score the applicant against the role. | Author 3 intra-domain handoff rows with `source_domain_id=target_domain_id=170`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`. Depends on B1-S1 (events must exist first). |
| B1-S4 | **B7 partial fail** | `match_inference_runs` (master 865) has zero `users` edges. The other 6 masters each carry a `users -> <master>` edge (`posts internal_opportunities`, `submits opportunity_applications`, `targeted by mobility_recommendations`, `scored as fit_scores`, `follows career_path_suggestions`, `participates in mentorship_engagements`). Match runs are model-derived and may legitimately have no human actor, OR they should carry a `triggered_by` edge to the user who initiated a manual rerun. | Surface to user. Default recommendation: leave as-is (system-initiated runs are the dominant case). If a `triggered_by_user` field is added, author the `users -> match_inference_runs` edge then. |
| B1-S5 | **B8 partial fail** | Zero outbound cross-domain `data_object_relationships` from TLNT-INTEL masters to neighbor masters. The cross-domain edges currently in place are all inbound: `skill_profiles -> fit_scores` (owner_side=target), `skill_profiles -> mobility_recommendations` (owner_side=target), `career_aspirations -> career_path_suggestions` (owner_side=target). For every outbound handoff in B1-S2 with a clean payload, the matching outbound relationship should exist: (a) `opportunity_applications becomes job_applications` (TLNT-INTEL master -> ATS master id 5 if loaded, verify at fix time) for the accepted-application -> ATS transition; (b) `opportunity_applications spawns hcm_worker_assignments` (TLNT-INTEL master -> HCM master) for the worker-reassignment direction; (c) `mobility_recommendations seeds job_requisitions` for the skills-based-hiring path. | Surface for fix-loop after the B1-S2 outbound handoffs are loaded. Several target-side masters may need verification (ATS `job_applications` id 5, HCM worker-assignment master). |
| B1-S6 | **B11 partial fail** | 5 of 7 masters carry zero aliases: `opportunity_applications`, `fit_scores`, `career_path_suggestions`, `mentorship_engagements`, `match_inference_runs`. Each has at least one well-known cross-vendor synonym: opportunity_applications -> "applications" / "internal applications" (Gloat) / "expressions of interest" (Fuel50); fit_scores -> "match scores" (Eightfold) / "talent scores" (HiredScore) / "fit ratings"; career_path_suggestions -> "career suggestions" / "next move recommendations", already exist as aliases on 861 mobility_recommendations, may belong on 863 instead; mentorship_engagements -> "mentoring pairs" / "mentorship sessions" / "mentor matches"; match_inference_runs -> "inference jobs" / "model runs" / "scoring batches". | Author 10-15 alias rows (2-3 per master). Decide on the 863 vs 861 alias-placement question (the existing two on 861 may have been mis-attributed). |
| B1-S7 | **B12 partial fail** | 4 of 7 masters have zero `data_object_lifecycle_states` rows: `mobility_recommendations` (861), `fit_scores` (862), `career_path_suggestions` (863), `match_inference_runs` (865). These are inference outputs (configuration-shape with a record_status field) and may legitimately be exempt under Rule #12. However, the exemption is undocumented, under Rule #15 the prior license to annotate the exemption in `data_objects.notes` is rescinded; the audit must surface it. Audit conversation IS the approved persistence surface. | Two options per master: (a) confirm config-shape exemption (no states needed; default `record_status` flow only); (b) author a minimal state machine if the master has a `dismissed` / `applied` / `superseded` workflow (a user dismissing a mobility recommendation is a real terminal transition). Recommendation per master: (a) for `fit_scores`, `career_path_suggestions`, `match_inference_runs` (pure inference outputs, no user state); (b) for `mobility_recommendations` (has the `dismissed` / `pursued` / `expired` user flow Eightfold and Gloat both ship). |
| B1-S8 | **H1 vacuously hard fail** | Zero cross-domain handoffs, so 0 of 0 carry APQC tags. The H-band volume expectation (0.5N to 0.8N agent_curated for N cross-domain handoffs) is unmeasurable at N=0. The gap is upstream, B1-S2 must land before H1 can be tagged. Once the 5-6 outbound handoffs from B1-S2 exist, the proposed PCF mapping is: outbound to ATS on `opportunity_application.accepted` -> "Recruit, source, and select employees" (10410 L2) or child "Recruit/Source candidates" (10440 L3); outbound to HCM on `opportunity_application.accepted` -> "Redeploy and retire employees" (10413 L2); outbound to TALENT-SUCCESSION on `fit_score.computed` -> "Establish succession plans" (21701 L4) or "Develop and implement individual succession plans" (21704 L5); outbound to TALENT-SUCCESSION on `career_path.projected` -> "Develop employee career plans and career paths" (10488 L4) under parent "Manage employee career development" (21700 L3); outbound to SWP on workforce-skills-heatmap -> "Perform strategic workforce planning" (21693 L4); intra-domain TLNT-INTEL `opportunity.opened` -> mobility recompute -> "Maintain talent capabilities and competencies" (17507 L5) under parent "Design talent development program" (11622 L4). | Defer until B1-S1 + B1-S2 land. Then author 5-6 `handoff_processes` rows in a follow-up batch, `proposal_source='agent_curated'`, `record_status='new'`. |
| B1-S9 | **E1-E5 hard fail (in-scope)** | Zero catalog roles touch any of TLNT-INTEL's 3 modules. Only the built-in Administrator `role_id=2` (Semantius platform admin) holds the 16 module permissions. The neighbor function spine includes Human Resources (id 3, owner), Talent Development (id 77, contributor), Recruiting (id 37, contributor), Learning and Development (id 11, contributor). Existing function-scoped roles that should plausibly touch TLNT-INTEL modules: `TALENT-DEVELOPMENT-TALENT-MANAGER` (id 10023, owns the marketplace and mobility flow), `HR-BUSINESS-PARTNER` (id 10020, consumes mobility recommendations for talent reviews), `HR-HRIS-ADMIN` (id 10018, admin/config), `RECRUITING-RECRUITER` (id 10006, consumes skills-based-hiring outputs and the marketplace for internal pipeline), `RECRUITING-MANAGER` (id 10010, oversees the skills-based-hiring assist), plus a missing cross-functional `HIRING-MANAGER` role that posts internal opportunities and reviews applications. The 2-module floor is easily met for all these. | Author 5-6 `role_modules` rows extending existing roles to TLNT-INTEL modules; plus 5-6 `role_permissions` rows granting tier-level access per module touched. Open question for the user: should a new `TALENT-DEVELOPMENT-MARKETPLACE-OPS` role be added for the day-to-day marketplace administrator (distinct from the broader Talent Manager), or is the existing `TALENT-DEVELOPMENT-TALENT-MANAGER` enough? |
| B1-S10 | **trigger_events.event_category** | N/A, vacuous, no events exist. Listed for symmetry with B1-S1. | Once B1-S1 events are loaded, validate each row has a valid `event_category` enum value (`lifecycle` / `state_change` / `threshold` / `signal`). |
| B1-S11 | **B4 pattern flag positive re-evaluation** | The flags on the 7 masters: `internal_opportunities.has_submit_lock=true` + `has_single_approver=true` (correct, a posted opportunity should freeze, and a hiring manager approves); `opportunity_applications.has_personal_content=true` + `has_submit_lock=true` (correct, applications carry candidate-side narrative, freeze on submit); `mentorship_engagements.has_personal_content=true` (correct, mentor-mentee notes); all 4 inference-output masters (861, 862, 863, 865) have all three flags false. The audit needs positive confirmation: should `mobility_recommendations.has_submit_lock=true` when a recommendation is acted on (dismissed or pursued)? Should `match_inference_runs.has_submit_lock=true` since a run's output is immutable by definition? Should `career_path_suggestions.has_submit_lock=true` once published to the employee? | Surface for user decision per flag. Recommendations: (a) `match_inference_runs.has_submit_lock=true` (immutable by construction, model output frozen at completion); (b) `mobility_recommendations.has_submit_lock=true` once `dismissed` or `pursued` (depends on B1-S7 lifecycle decision); (c) `career_path_suggestions.has_submit_lock=true` once published to employee (same dependency on B1-S7). |
| B1-S12 | **APQC TAGGING (deferred)** | Same as B1-S8, vacuous at N=0. Once B1-S1 / B1-S2 land, this batch runs to tag the new handoffs. | Combined with B1-S8; one follow-up batch authors all rows together. |
| B1-S13 | **External consumer DMDO is one-sided** | ATS-CANDIDATE-CRM (module 1) declares `embedded_master + optional` on `internal_opportunities` (859), good, ATS owns its embed correctly. But on the reverse side: when `opportunity_application.accepted` fires and the application becomes an ATS candidate move, no ATS module declares `consumer` on `opportunity_applications` (860). And no neighbor module (HCM, SKILLS-MGMT, TALENT-MGMT, SWP) declares `consumer` / `contributor` on any TLNT-INTEL master at all. This mirrors the APM audit's B1-S9 finding: every domain that receives TLNT-INTEL events implicitly depends on its masters but declares no DMDO. | Each target domain's b1 audit should add `consumer` DMDO rows on the relevant TLNT-INTEL masters. Not TLNT-INTEL's fix to make, but worth surfacing here so subsequent audits pick it up. Routed to Report-only follow-ups. |

**Bucket 1 sub-categorization:**

| Finding type | Count |
| --- | --- |
| STRUCTURAL (B9 + B9b + B7 + B11 + B12 + E1-E5) | 8 (B1-S1, B1-S3, B1-S4, B1-S6, B1-S7, B1-S9, B1-S11, plus B1-S5 outbound rel) |
| MISSING (entity gap) | 0 (Bucket 3 covers the speculative MISSING from the market subagent pass, none in B1) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY (outbound handoffs) | 1 (B1-S2) |
| APQC TAGGING (deferred until B1-S1/S2 land) | 2 (B1-S8, B1-S12, combined into one batch at fix time) |
| MODULARIZATION ISSUES | 0 (always 0 in Bucket 1) |
| **Bucket 1 total** | **13** |

(B1-S10 is a placeholder for symmetry, not a separate decision; B1-S13 is report-only and excluded from the in-scope count.)

### Bucket 2: Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-T1 | **Rule #12 config-shape exemption per master** (linked to B1-S7), `fit_scores`, `career_path_suggestions`, `match_inference_runs`, `mobility_recommendations` carry no lifecycle states. The first three look like pure inference outputs (config-shape, `record_status` only). `mobility_recommendations` arguably has a real `proposed -> dismissed | pursued | expired` flow per Eightfold / Gloat. Rule #12 says load states or surface the exemption; Rule #15 says do NOT auto-write the exemption to `data_objects.notes`. The audit conversation is the approved persistence surface. | Editorial judgment: which of the 4 masters get a lifecycle, which are pure inference outputs. | Per-master yes/no on lifecycle authoring. Recommendation: lifecycle on `mobility_recommendations` (3-state `proposed -> dismissed | pursued | expired`); config-shape exemption confirmed for the other 3. |
| B2-T2 | **Role authoring scope** (linked to B1-S9), the audit proposes extending 5 existing roles (`TALENT-DEVELOPMENT-TALENT-MANAGER`, `HR-BUSINESS-PARTNER`, `HR-HRIS-ADMIN`, `RECRUITING-RECRUITER`, `RECRUITING-MANAGER`) plus authoring a missing cross-functional `HIRING-MANAGER` role. Open question: do we also need a `TALENT-DEVELOPMENT-MARKETPLACE-OPS` role for the day-to-day marketplace administrator (program manager who curates opportunities, audits applications, decommissions stale postings), distinct from Talent Manager? Eightfold and Gloat both ship such an admin persona in their RBAC. | Role-shape decision the user owns; depends on whether the deployment shape includes a dedicated marketplace operations function. | (a) Extend existing roles only, `TALENT-DEVELOPMENT-TALENT-MANAGER` absorbs the marketplace-ops scope. (b) Add a new `TALENT-DEVELOPMENT-MARKETPLACE-OPS` role. (c) Defer the marketplace-ops role until a customer asks. |
| B2-T3 | **Inference-output handoff integration_pattern** (linked to B1-S2), `fit_score.computed` and `mobility_recommendation.produced` are signals an upstream consumer (TALENT-SUCCESSION, ATS) reads as state. The integration_pattern enum supports `event_stream`, `api_call`, `batch_sync`. For AI-matching outputs the typical pattern at flagship vendors is hybrid: the inference signal hits an event stream (low-latency notification), but the consuming system reads the full payload via API. The catalog encodes only the firing event, not the payload-read pattern. Should these be `event_stream` (matches the trigger) or `api_call` (matches the consumer's read)? | Catalog-modeling judgment; both readings are defensible. The other domains in this neighborhood use `event_stream` for fire-and-forget signals and `api_call` for orchestrated reads, TLNT-INTEL events read more like `event_stream`. | (a) All inference-output handoffs `event_stream`. (b) Mix `event_stream` for the broadcast signals (fit_score, mobility_recommendation) and `api_call` for the synchronous reads (accepted-application worker move). (c) Other. |

### Bucket 3: Phase 0 pending (speculative; market subagent pass deferred)

This audit did not spawn a separate market-surface subagent (per the mass-audit prompt, the subagent IS the agent here). The Bucket 3 items below come from the agent's own market knowledge of the loaded flagship vendors. They are speculative until vetted in a formal Phase 0 pass against vendor product documentation.

#### MISSING (3): candidate entities from the flagship-vendor surface

| Entity | Proposed module | Rationale | Vendor knowledge basis |
|---|---|---|---|
| `talent_pools` | TLNT-INTEL-MOBILITY | A curated grouping of employees scored against a role family or future bench. Distinct from `succession_plans` (which is per-position). Eightfold, HiredScore, Reejig all ship a Talent Pool master separately. | Eightfold Talent Pools, Workday HiredScore Pools, Reejig Workforce Pools |
| `model_fairness_audits` | new TLNT-INTEL-AI-GOVERNANCE module OR TLNT-INTEL-INSIGHTS | EEOC bias-audit logging, Local Law 144 (NYC) and similar AI-employment regulations require periodic bias audits of the matching model output. Currently absent. Whether this is a TLNT-INTEL concern or routes to AI-GOV (already in the missing-domains queue) is the open question. | NYC Local Law 144 compliance surface across all AI-matching vendors; Eightfold publishes fairness audit reports; HiredScore embeds bias monitoring |
| `skill_inferences` | TLNT-INTEL-INSIGHTS | The audit trail of inferred skills per employee (distinct from `skill_profiles` mastered by SKILLS-MGMT which holds declared skills). Eightfold's "Inferred Skills" surface and Reejig's "Skills Inference Engine" both master this separately. May belong in SKILLS-MGMT under an `inferred_skills` master; cross-domain ownership question. | Eightfold Inferred Skills, Reejig Skills Inference, 365Talents skills-graph layer |

#### WRONG-OWNERSHIP / SCOPE-CREEP (0 each)

The 7 loaded masters all sit in the right module per the flagship-vendor surface. No entity in the current footprint reads as misplaced. No SCOPE-CREEP entities surfaced.

#### MODULARIZATION ISSUES (0)

The 3-module split (`MARKETPLACE`, `MOBILITY`, `INSIGHTS`) cleanly covers the flagship-vendor surface. Marketplace owns the opportunity / application flow; Mobility owns the inference outputs (recommendations, fit scores, career paths) and the model run trail; Insights owns the workforce-wide aggregates. No merge / split / rename recommended at this audit.

The candidate AI-Governance module (B3 item 2) would be a fourth module IF the NYC Local Law 144 surface routes to TLNT-INTEL rather than to a dedicated AI-GOV domain. That decision is upstream of the modularization conversation; defer until Phase 0 vets the boundary.

#### Candidate missing domains (queued)

This audit bumped `MENTORSHIP, Mentorship Program Management` (first surfaced from TALENT-MGMT audit) since `mentorship_engagements` is a TLNT-INTEL master AND a dedicated point-solution market exists (MentorcliQ, Together, PushFar, Chronus, Qooper). Mention count is now 2. No new domain candidates surfaced from this audit.

### Cross-bucket dependencies

- **B1-S3 depends on B1-S1.** Intra-domain handoffs cannot be authored before the trigger_events they reference exist.
- **B1-S2 depends on B1-S1.** Outbound handoffs cite trigger_events.
- **B1-S5 depends on B1-S2.** Cross-domain relationship rows mirror outbound handoffs; load handoffs first.
- **B1-S8 / B1-S12 (APQC tagging) depend on B1-S1 + B1-S2.** No rows to tag until handoffs exist.
- **B1-S7 lifecycle decision feeds B1-S11 pattern flag decision** for `mobility_recommendations`, `career_path_suggestions`, `match_inference_runs`.
- **B2-T1 is identical to part of B1-S7** (config-shape exemption per master), the user's decision on B2-T1 directly determines the B1-S7 fix.
- **B2-T2 shapes B1-S9 scope.** Whether to add a `MARKETPLACE-OPS` role changes the role_modules / role_permissions row count.
- **Bucket 3 item 2 (model_fairness_audits / AI-GOV boundary) is independent of Buckets 1 and 2.** The decision is a Phase 0 vendor-research question.
- **Bucket 3 items 1 + 3 are independent of Buckets 1 and 2.** Adding `talent_pools` and `skill_inferences` is a Phase B insert that doesn't depend on the structural fixes.

### Per-bucket prompts

**Bucket 1: fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S6`), or `skip`.

- **B1-S1 (B9, author 10-12 trigger_events):** structural; no other dependencies. Start here.
- **B1-S2 (B9 outbound, 5-6 handoffs):** depends on S1.
- **B1-S3 (B9b intra-domain, 3 handoffs):** depends on S1.
- **B1-S4 (B7, users edge on `match_inference_runs`):** trivial PATCH; default is no edge (system-initiated).
- **B1-S5 (B8 outbound cross-domain rels):** depends on S2 and on verifying ATS / HCM target masters exist.
- **B1-S6 (B11 aliases, 10-15 rows on 5 masters):** independent.
- **B1-S7 (B12 lifecycle states, 4 masters):** depends on B2-T1 decision.
- **B1-S8 / B1-S12 (APQC tagging, defer to follow-up batch):** depends on S1 + S2.
- **B1-S9 (E1-E5 roles, 5-6 role_modules + role_permissions):** depends on B2-T2 decision on `MARKETPLACE-OPS` role.
- **B1-S11 (B4 pattern flags, PATCH 3 masters):** depends on B1-S7 lifecycle decision (S11 = pattern flag positive re-eval).

**Bucket 2: what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-T1 (config-shape exemption per master):** which of the 4 inference outputs get a lifecycle, which are pure config-shape?
- **B2-T2 (`MARKETPLACE-OPS` role yes/no):** add a new role for marketplace-ops, or absorb into Talent Manager?
- **B2-T3 (inference-output handoff `integration_pattern`):** event_stream vs api_call vs mix?

**Bucket 3: Phase 0 pending, vet via formal Phase 0 vendor research, or eyeball-mode?** If eyeball, name which of the 3 candidates (`talent_pools`, `model_fairness_audits`, `skill_inferences`) to treat as confirmed.

The strongest signal in the diff is `talent_pools`: every flagship vendor in this market ships it as a first-class master, and the current footprint has no obvious workaround. If you commit to only part of the work, that's the highest-leverage entry.

### Report-only follow-ups (owed by other domains)

These items are flagged for the named domain's own b1 audit. They are NOT in TLNT-INTEL's Bucket 1 (which is what this domain's next fix-load touches).

- **B1-S13 (consumer DMDOs owed by ATS / HCM / TALENT-MGMT / SWP):** every domain that receives TLNT-INTEL events implicitly depends on the TLNT-INTEL masters (`opportunity_applications`, `fit_scores`, `mobility_recommendations`, `career_path_suggestions`, `match_inference_runs`) but declares no `consumer` / `contributor` DMDO. The fix is on each consumer domain's b1 audit:
  - **ATS:** add `consumer` on `opportunity_applications` (the accepted-application -> ATS candidate move) and `mobility_recommendations` (skills-based-hiring suggestion).
  - **HCM:** add `consumer` on `opportunity_applications` (the accepted-application -> worker reassignment).
  - **TALENT-MGMT (TALENT-SUCCESSION-CAREER module):** add `consumer` on `fit_scores` (succession ranking input) and `career_path_suggestions` (career planning input).
  - **SWP:** add `consumer` on the workforce-skills-heatmap output once modeled (B3 item, currently no master for this in TLNT-INTEL).
- **Inbound handoffs owed by upstream domains.** Today every neighbor publishes into TLNT-INTEL implicitly via the relationship graph (`skill_profiles -> fit_scores`, `skill_profiles -> mobility_recommendations`, `career_aspirations -> career_path_suggestions`), but no actual `handoffs` rows exist on the upstream side:
  - **SKILLS-MGMT B9 owes outbound** on `skill_profile.updated` -> TLNT-INTEL (consumer + required on skill_profiles in MARKETPLACE + MOBILITY + INSIGHTS).
  - **SKILLS-MGMT B9 owes outbound** on `competency_model.published` -> TLNT-INTEL (consumer + required on competency_models in MOBILITY + INSIGHTS).
  - **HCM B9 owes outbound** on `employee.transferred` and `employee.terminated` -> TLNT-INTEL (embedded_master on employees across all 3 modules; transfers reshape opportunity matches; terminations close out marketplace participation).
  - **HCM B9 owes outbound** on `job_profile.updated` -> TLNT-INTEL-MOBILITY (consumer on job_profiles).
  - **ATS B9 owes outbound** on `job_requisition.opened` and `job_posting.published` -> TLNT-INTEL-MOBILITY (consumer on requisitions and postings for skills-based-hiring assist).
  - **TALENT-MGMT B9 owes outbound** on `career_aspiration.updated` -> TLNT-INTEL-MOBILITY (consumer on career_aspirations); on `performance_goal.completed` -> TLNT-INTEL-MOBILITY (consumer + optional); on `succession_plan.updated` -> TLNT-INTEL-MOBILITY (consumer + optional).
  - **SWP B9 owes outbound** on `skills_gap_analysis.published` -> TLNT-INTEL-INSIGHTS (consumer on skills_gap_analyses).

These are not blockers for TLNT-INTEL's own pass, they are observations the user can act on by scheduling b1 audits on the source domains. Surfacing here keeps the boundary state legible.

## 2026-05-31, Continuation: B1 technical fixes

Classified all 13 Bucket 1 items against the truly-technical apply list (enum backfills audit pre-specifies, B10b FK PATCHes derivable from existing modules, INSERT `domain_regulations` to existing rows, DELETE stale rows audit names with IDs, naming renames, Rule #10 user-edge `data_object_relationships` audit pre-specifies, `permission_verb_override` audit names state+verb, `handoff_processes` ONLY when audit pre-specifies `handoff_id` + resolvable PCF).

**Result: 0 technical fixes applied. All 13 B1 items deferred.**

| Item | Defer reason |
|---|---|
| B1-S1 | New `trigger_events` inserts (not in technical apply list, new entity creation). |
| B1-S2 | New `handoffs` inserts (not in technical apply list); also depends on S1 and on B2-T3 `integration_pattern` user decision. |
| B1-S3 | New intra-domain `handoffs` inserts; depends on S1. |
| B1-S4 | Audit explicitly says "Surface to user. Default recommendation: leave as-is". Not pre-specified Rule #10 edge. |
| B1-S5 | New cross-domain `data_object_relationships`; depends on S2 (B2-T2 type questions), and audit says targets need verification, not pre-specified. |
| B1-S6 | New `data_object_aliases` inserts (not in technical apply list); also has open 863-vs-861 placement question. |
| B1-S7 | New lifecycle states; depends on B2-T1 per-master config-shape exemption user decision. |
| B1-S8 | APQC `handoff_processes` cannot be applied: no `handoff_id` exists yet (S2 deferred); explicitly defer until S1+S2 land. |
| B1-S9 | New `role_modules` / `role_permissions` rows; depends on B2-T2 `MARKETPLACE-OPS` role user decision. |
| B1-S10 | Placeholder for symmetry; vacuous until B1-S1 lands. |
| B1-S11 | "Pattern flag flips" explicitly DEFER per prompt; also depends on B1-S7. |
| B1-S12 | Same as B1-S8 (APQC tagging follow-up batch). |
| B1-S13 | Report-only follow-up owed by other domains (ATS / HCM / TALENT-MGMT / SWP), not actionable on TLNT-INTEL. |

No PATCH enum backfills, B10b FK PATCHes, `domain_regulations` inserts, stale-row DELETEs, naming renames, pre-specified Rule #10 user-edges, `permission_verb_override` PATCHes, or applicable `handoff_processes` rows were named in the audit. No loader was authored (would have been empty).

No JWT errors encountered (no Semantius writes attempted).

Audit remains in `status: feedback_needed`; all 13 B1 items still require user input per the bucket prompts above before any work can proceed.
