---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 25
---

# SKILLS-MGMT - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: 7 master data_objects (skill_taxonomies, skills, competency_models, skill_profiles, skill_assessments, skill_endorsements, skill_inference_runs) + 2 embedded_master (employees, job_profiles) + 4 contributor/consumer (performance_goals, skills_gap_analyses, learner_certifications, course_enrollments) across 2 full modules (SKILLS-MGMT-TAXONOMY, SKILLS-MGMT-PROFILE). 8 capabilities. 12 solutions (5 primary, 7 secondary). 0 regulations. 1 outbound + 11 inbound handoffs. 0 roles. 2 system skills + 29 skill_tools links.
- Vendor-surface basis: Lightcast Open Skills (open ontology specialist), TechWolf Skills Engine (inference specialist), SkyHive Quantum Labor Market (labor-market-data anchored), Reejig Workforce Intelligence (ethics + skills-graph), 365Talents Skills Platform (European inference specialist). Diversified suites referenced as secondary basis only: Workday Skills Cloud, SAP SuccessFactors Talent Intelligence Hub, Cornerstone Skills Graph, Oracle Dynamic Skills, Eightfold, Gloat, Fuel50.
- Domain Semantius score (strict, across both modules): (13 + 14) / (13 + 16) = 27 / 29 = approximately 93.1%. Non-platform tools driving the 2-tool gap: `run_skill_inference` (compute, external, required on SKILLS-MGMT-PROFILE) and `compute_skills_gap` (compute, external, required on SKILLS-MGMT-PROFILE). Inference + gap-compute are the entire reason the module exists as a runtime substrate; both being external is structurally fine for now, but worth tracking as a future platform-coverage target.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 8 items.

Structural pass: A1-A3 / M1-M7 / B1-B8 / B10 / C1-C2 / F1-F5 / F7 pass. A4, B9, B9b, B10b, B11 partial, B12 partial, E1, H1 fail. M7 catalog-wide single-master integrity holds for every SKILLS-MGMT master. The H-band is the largest single finding by item count.

Vendor-surface basis chosen pure-play first (Lightcast, TechWolf, SkyHive, Reejig, 365Talents) so the surface matrix reflects what a buyer evaluating a specialist skills-engine sees, not what a diversified HCM suite bundles. Suite solutions stay as secondary linkage on `solution_domains`.

### Bucket 1 - In-scope confirmed gaps

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap, vendor-confirmed across >= 3 of 5 pure-plays) | 2 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A / B / E band failures) | 6 |
| BOUNDARY (NULL FK or missing handoff) | 2 |
| APQC TAGGING | 1 (covers 8 proposed tags + 3 deferred + 1 DELETE candidate over 12 cross-domain handoffs) |
| MODULARIZATION ISSUES | 0 |

#### MISSING (entity gaps confirmed across pure-play vendor surface)

| ID | Entity | Proposed module | Vendor evidence | Notes |
|---|---|---|---|---|
| B1-M1 | `skill_proficiency_levels` | SKILLS-MGMT-TAXONOMY | Lightcast, TechWolf, SkyHive, Reejig, 365Talents (5 / 5) | Controlled vocabulary for proficiency scale (Novice-Expert, 1-5, Beginner-Master). Today `skill_assessments` carries a numeric rating with no row table to anchor the scale or per-taxonomy override. Universal pure-play entity. |
| B1-M2 | `skill_relationships` | SKILLS-MGMT-TAXONOMY | Lightcast (parent / related / equivalent), TechWolf (graph edges), SkyHive (cluster), Reejig (related-to), 365Talents (parent / child / synonym) (5 / 5) | Edge table on the skills ontology itself: parent / child / related / equivalent / merged-into. Today `data_object_relationships` carries an intra-row relationship between `skills` (1268, 1269, 1270) at the conceptual schema layer but no per-row taxonomy edges. Universal pure-play entity; the ontology cannot be navigated without it. |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 | `catalog_tagline` and `catalog_description` are both empty on `domains.id=169`. Rule #20 requires both fields populated in buyer voice (workflow + value), not analyst voice. | Draft both per Rule #20, surface to user for approval BEFORE writing. Buyer-voice draft (proposed, requires user approval): tagline = "Build the worker-skill substrate every other talent system reads from. Curate the ontology, validate per-worker proficiency, and serve gap signals to learning, mobility, and planning." Description per the same voice rule. |
| B1-S2 | B9 | Six published / workflow-bearing lifecycle states have NO matching `trigger_events` row. States missing events: `skill_taxonomies.active` (state_order 2), `skill_taxonomies.deprecated` (3), `competency_models.published` (2), `competency_models.archived` (3), `skill_profiles.validated` (3), `skill_profiles.inactive` (4), plus the `skill_assessments.completed` (state 2) terminal which a downstream consumer (gap analytics, profile refresh) needs as a fire. Today only `skill_profile.updated` (id 440) exists. | Draft 7 missing trigger_events: `skill_taxonomy.activated`, `skill_taxonomy.deprecated`, `competency_model.published`, `competency_model.archived`, `skill_profile.validated`, `skill_profile.deactivated`, `skill_assessment.completed`. Then chain B1-S3 (B9b intra-domain handoffs) on top. |
| B1-S3 | B9b | Zero intra-domain `handoffs` rows between SKILLS-MGMT-TAXONOMY (173) and SKILLS-MGMT-PROFILE (174), despite the cross-module relationship `skill_profiles assessed against competency_models` (row 1275) and the PROFILE module consuming `skill_taxonomies` / `competency_models`. When TAXONOMY publishes a new active taxonomy or a competency-model version, PROFILE has no event signaling it should re-run inference or revalidate profiles against the new substrate. Same for `competency_model.archived` (in-flight profiles need re-mapping or archival). | Once B1-S2 events are loaded, draft 4 intra-domain handoffs: `skill_taxonomy.activated` (173 -> 174), `skill_taxonomy.deprecated` (173 -> 174), `competency_model.published` (173 -> 174), `competency_model.archived` (173 -> 174); all `integration_pattern: lifecycle_progression`, `friction_level: low`, `source_domain_id = target_domain_id = 169`. |
| B1-S4 | B12 | Two `master + required` data_objects have ZERO lifecycle states: `skill_endorsements` (id 856, master in SKILLS-MGMT-PROFILE) and `skill_inference_runs` (id 858, master in SKILLS-MGMT-PROFILE). Endorsements have a real workflow (requested -> issued -> revoked) and inference runs have a job-execution workflow (queued -> running -> completed / failed). Neither is config-shaped. | Draft lifecycle states: `skill_endorsements`: requested (initial) -> issued (workflow-gate `endorse_skill`) -> revoked (workflow-gate `revoke_endorsement`, terminal). `skill_inference_runs`: queued (initial) -> running -> completed (terminal) / failed (terminal). Annotate `domain_module_id = 174` on every gate. |
| B1-S5 | B7 | Three masters with user-typed actors lack explicit `users` edges in `data_object_relationships`: `skill_taxonomies` (curator / publisher), `skills` (created_by / curator on the ontology row), `skill_inference_runs` (initiated_by, when manually triggered). Rule #10 requires these recorded against `users` (id 748). Existing edges cover `skill_profiles`, `skill_assessments`, `skill_endorsements`, `competency_models` only. | Author 3 edges, owner_side=source, kind=reference: users -> skill_taxonomies (verb `curates`), users -> skills (verb `authors`), users -> skill_inference_runs (verb `initiates`). All `is_required=false` (most inference runs are scheduled, not manually initiated). |
| B1-S6 | E1 | Zero roles authored for SKILLS-MGMT despite the domain having 2 modules and 8 capabilities. Multi-module domains under Rule #14 must satisfy E1's >= 3 roles threshold across roles whose `role_modules` touch SKILLS-MGMT modules. Today: 0 rows in `role_modules` for module 173 or 174. | Draft 3 function-scoped roles: `TALENT-DEV-SKILL-ARCHITECT` (touches both modules, owns ontology authoring; primary on 173, secondary on 174), `TALENT-DEV-SKILL-ANALYST` (consumes inference runs and gap analyses; primary on 174), and cross-functional `MANAGER` extension (secondary on 174 for skill-profile validate gate). Each role: >= 2 role_modules entries (already satisfied for SKILL-ARCHITECT and SKILL-ANALYST since both touch 173 / 174). Role bundles: tier-level `:read` and `:manage` per module plus targeted workflow gates (`activate_taxonomy`, `publish_competency_model`, `validate`). |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | Handoff id 1307 (LMS-LEARNER-EXPERIENCE -> SKILLS-MGMT on `learner_badge.earned`, payload `learner_badges` id 934) has `target_domain_module_id = NULL`. The payload `learner_badges` has NO `domain_module_data_objects` row on any SKILLS-MGMT module. The other handoff on the same trigger event id 1334 is row 1295, which DOES carry `target_domain_module_id = 174` and the same source / payload, only differing on `integration_pattern` (1295 lifecycle_progression vs 1307 event_stream). 1307 is almost certainly a duplicate from a pre-modularization era. | Option A (preferred): DELETE handoff 1307 (duplicate of 1295). Option B: load a `consumer` `domain_module_data_objects` row on `learner_badges` for module 174, then PATCH target_domain_module_id = 174 on 1307 and resolve the integration_pattern disagreement. Surface to user; B1-Q2 in Bucket 2 carries the decision question. |
| B1-B2 | The dependency on `course_enrollments` (id 169), `learner_certifications` (id 171), `performance_goals` (id 175) is recorded as `contributor` on SKILLS-MGMT-PROFILE DMDOs, but no equivalent `consumer + optional` DMDO records the embedded shell for SMB / single-source-of-skills deployments. Rule #16 applies (infrastructure-shape masters always `optional` on non-master rows). Today the `necessity` is `required` on all three. PROFILE inference should degrade gracefully if LMS or TALENT-MGMT is not deployed (the assessment-only path). | PATCH `necessity = optional` on DMDO ids 917 (learner_certifications), 918 (course_enrollments). Performance_goals (919) is already optional. Surface for user confirmation since "required" may have been intentional for a particular deployment model. |

#### APQC TAGGING

For 12 cross-domain handoffs (1 outbound + 11 inbound), today: zero `handoff_processes` rows (catalog quality = 0% approved, process health = 0% agent_curated). Volume expectation per the H-band is 0.5N to 0.8N new `agent_curated` rows in this audit (6 to 10 for N=12). Audit proposes 8 confident L3 / L4 / L5 PCF rows + 3 deferred + 1 covered-by-DELETE.

**B1-H1 (agent_curated proposals, all `record_status='new', proposal_source='agent_curated'`):**

| handoff_id | source -> target | trigger_event | payload | Proposed PCF process_name | process_id | external_id | hierarchy_level | confidence |
|---|---|---|---|---|---|---|---|---|
| 388 | HCM -> SKILLS-MGMT | job_profile.published | job_profiles | Define employees competencies and skills | 1036 | 16940 | L4 | confident |
| 432 | SKILLS-MGMT -> TALENT-MGMT | skill_profile.updated | skill_profiles | Manage employee skill and competency development | 1033 | 17051 | L4 | confident |
| 440 | TALENT-MGMT -> SKILLS-MGMT | performance_goal.set | performance_goals | Manage employee career development | 226 | 21700 | L3 | confident |
| 456 | SWP -> SKILLS-MGMT | skills_gap_analysis.completed | skills_gap_analyses | Establish training needs by analysis of required and available skills | 1038 | 10492 | L4 | confident |
| 1079 | LMS -> SKILLS-MGMT | course_enrollment.completed | course_enrollments | Manage employee skill and competency development | 1033 | 17051 | L4 | confident |
| 1080 | LMS -> SKILLS-MGMT | learner_certification.earned | learner_certifications | Manage certifications and skills | 1873 | 20020 | L5 | confident |
| 1106 | PA -> SKILLS-MGMT | skill_gap.identified | workforce_segments | Establish training needs by analysis of required and available skills | 1038 | 10492 | L4 | confident |
| 1288 | LMS -> SKILLS-MGMT | course_completion.recorded | course_completions | Manage employee skill and competency development | 1033 | 17051 | L4 | confident |
| 1295 | LMS -> SKILLS-MGMT | learner_badge.earned | learner_badges | Manage certifications and skills | 1873 | 20020 | L5 | confident |

**Deferred to Discover Pass 3 (no clean cross-industry PCF match):**

| handoff_id | source -> target | trigger_event | reason |
|---|---|---|---|
| 1287 | LMS -> SKILLS-MGMT | course_version.published | Content-versioning event has no L3 / L4 home in cross-industry PCF; relates to learning content lifecycle, not skill management proper. Candidate custom process: "Publish learning content version". |
| 1315 | LMS -> SKILLS-MGMT | course.published | Same: content publication event, not a skill-substrate transition. Candidate custom process: "Publish learning course". |
| 1307 | LMS -> SKILLS-MGMT | learner_badge.earned (NULL target_module) | Covered by B1-B1 (DELETE candidate). If the user approves DELETE, no tag is needed; if PATCH-and-keep, mirror 1295's tag (process 1873). |

Provenance note: every confident row above uses `proposal_source='agent_curated'`. `human_curated` is reserved for explicit user-typed tag instructions and is not used in this audit.

### Bucket 2 - Surface-for-user (judgment calls)

1. **A4 catalog UX wording.** Rule #20 forbids overwrite of an existing non-empty value, but `catalog_tagline` and `catalog_description` are currently empty (initial draft permitted). The agent has drafts ready under B1-S1; the user should approve / rewrite the exact buyer-voice text before any PATCH. This is independent of Bucket 3 (the wording does not depend on additional vendor research).

2. **Workflow-gate permission prefix inconsistency.** Module SKILLS-MGMT-PROFILE (id 174) realizes two workflow-gate permissions whose prefix is the domain code `skills-mgmt`, not the module code `skills-mgmt-profile`: `skills-mgmt:validate_skill_profile` and `skills-mgmt:deactivate_skill_profile`. Module SKILLS-MGMT-TAXONOMY (id 173) correctly uses `skills-mgmt-taxonomy:*` (e.g. `skills-mgmt-taxonomy:publish_competency_model`). Rule #14's permission materialization rule says workflow-gate permissions are prefixed with the realizing module's `domain_module_code`, not the domain code. Options: (a) rename the two permissions to `skills-mgmt-profile:validate_skill_profile` / `skills-mgmt-profile:deactivate_skill_profile` to match the rule; (b) accept the asymmetry as legacy and document. Recommendation: rename, since downstream role-bundle authoring will be confused by the prefix divergence when E1 roles are loaded. Independent of Bucket 3.

3. **Handoff 1307 disposition** (DELETE vs PATCH-and-keep). Identical trigger_event_id (1334) to row 1295, identical source / payload, only differing on `integration_pattern` (event_stream vs lifecycle_progression) and target_domain_module_id (NULL vs 174). Strong evidence of duplicate from pre-modularization. User picks: (a) DELETE 1307 (clean), (b) keep both and load a consumer DMDO on `learner_badges` for module 174 + PATCH the NULL FK (treats LMS as broadcasting on two channels). Recommendation: (a). Independent of Bucket 3.

4. **Embedded-master + consumer optional necessity flip (B1-B2).** `course_enrollments` (DMDO 918) and `learner_certifications` (DMDO 917) are today `contributor + required` on SKILLS-MGMT-PROFILE. Rule #16 says infrastructure-shape externals stay `optional` on non-master rows. PROFILE can degrade to assessment-only (no LMS feed) for SMBs. User picks: (a) flip both to `optional` (consistent with rule), (b) keep `required` because the inference pipeline is documented to require an LMS feed for any meaningful skill rollup (today's likely intent). Independent of Bucket 3.

5. **MISSING entities scope split.** The two confirmed MISSING entities (`skill_proficiency_levels`, `skill_relationships`) clearly belong in SKILLS-MGMT-TAXONOMY. The Bucket 3 speculative list adds 6 more potential entities; if the user approves Bucket 1 MISSING items and Bucket 3 vetting later produces 3-4 additional masters, SKILLS-MGMT-TAXONOMY could end up holding 6 to 8 masters and warrant a sub-module split (e.g. `SKILLS-MGMT-ONTOLOGY-VERSIONING` for taxonomy / model versioning). Decide now: keep 2-module shape, or pre-commit to a potential third module shaped around taxonomy versioning + ontology edges? Has a Bucket 3 dependency: the splitting decision is informed by which speculative entities land.

6. **Alias gap on bare-ontology masters.** `skill_taxonomies`, `skills`, `skill_assessments`, `skill_endorsements`, `skill_inference_runs` have no `data_object_aliases` rows. The bare-noun masters (`skills`) and assessment-shaped masters (`skill_assessments`) are reasonably self-explanatory; `skill_taxonomies` has industry synonyms (`skills ontology`, `competency framework`). User picks which (if any) to alias. Recommended: `skill_taxonomies` -> alias `skills ontology`, alias_type `synonym`; rest stay un-aliased. Independent of Bucket 3.

### Bucket 3 - Phase 0 pending (speculative; vendor-research vetting needed)

Candidate masters / contributors surfaced from the pure-play vendor surface (Lightcast, TechWolf, SkyHive, Reejig, 365Talents) but not yet anchored in a formal Phase 0 document for SKILLS-MGMT. Each candidate carries the vendor whose docs surfaced it.

| ID | Candidate entity | Proposed module | Vendor evidence | Recommended verification |
|---|---|---|---|---|
| B3-1 | `skill_taxonomy_versions` | SKILLS-MGMT-TAXONOMY | Lightcast (Open Skills versions), TechWolf (taxonomy snapshots), 365Talents (release-pinned profiles) | Check whether each pure-play exposes a version-pinned API surface and whether the version is a first-class business entity or an audit-log artifact. If first-class on >= 3 of 5 pure-plays, promote. |
| B3-2 | `skill_demand_signals` | SKILLS-MGMT-PROFILE (or a new sub-module) | Lightcast (job-posting demand), SkyHive (Quantum Labor Market), Reejig (external supply / demand) | This sits at the boundary with the queued LABOR-MARKET-INTEL candidate (see `audits/_missing-domains.md`). If LABOR-MARKET-INTEL is approved as a domain, demand signals master there and SKILLS-MGMT consumes; if not, they master here. Defer until the candidate is triaged. |
| B3-3 | `skill_supply_metrics` | SKILLS-MGMT-PROFILE | Reejig (workforce inventory), Gloat (internal supply), 365Talents (organizational skill heatmap) | Rolled-up derived metric (count of profiles holding each skill at each proficiency). May fit better as a `derived` DMDO rather than a master. |
| B3-4 | `skill_extraction_sources` | SKILLS-MGMT-PROFILE | TechWolf (source provenance for inferred skills), Reejig (audit trail of source documents) | Tracks which document / event fed each inferred skill on a profile. Important for the ethics / auditability story. Verify vendor surface: is this a first-class entity or a join-table on `skill_inference_runs`? |
| B3-5 | `skill_gap_recommendations` | SKILLS-MGMT-PROFILE | Reejig (action recommendations), Fuel50 (learning suggestions), 365Talents (gap closure suggestions) | Boundary check vs TLNT-INTEL's `mobility_recommendations` (already mastered in TLNT-INTEL-MOBILITY). If TLNT-INTEL covers learning recommendations too, this is scope creep; if TLNT-INTEL only does role / mobility recommendations, this is a real SKILLS-MGMT gap. |
| B3-6 | `peer_validation_requests` | SKILLS-MGMT-PROFILE | 365Talents (request -> validation flow), Workday (validation request workflow), SuccessFactors (talent calibration request) | Today `skill_endorsements` is master but no "request" entity exists; the workflow is implicit. Workday and 365Talents both ship a request-level row. May be a real workflow gap. |
| B3-7 | `skill_inference_models` | SKILLS-MGMT-PROFILE | TechWolf (model versioning), Reejig (model audit trail), SkyHive (model governance) | Config / governance entity for the ML models used by inference runs. Important for the EU AI Act / explainability story for any 2026+ deployment. |
| B3-8 | `skill_governance_policies` | SKILLS-MGMT-TAXONOMY | Reejig (ethical-AI policies), 365Talents (taxonomy curation policies), Lightcast (open-data governance) | Captures who can add / merge / deprecate skills and competency models, as governance config. Today implicit via permissions. Promote if vendors ship as a first-class entity. |

### Cross-bucket dependencies

- **Bucket 2 item 5 (potential 3rd module split)** depends on Bucket 3 vetting outcome. If Bucket 3 produces 4+ additional masters (B3-1, B3-2 if local, B3-7, B3-8), the module count case for splitting strengthens. Recommendation: hold the split decision until Bucket 3 is vetted.
- **Bucket 3 item B3-2 (skill_demand_signals)** depends on Bucket 2 disposition of the queued `LABOR-MARKET-INTEL` candidate. If the user promotes LABOR-MARKET-INTEL as its own domain, B3-2 masters there and SKILLS-MGMT becomes a consumer; otherwise B3-2 is in scope here.
- **Bucket 3 item B3-5 (skill_gap_recommendations)** depends on a boundary check against TLNT-INTEL-MOBILITY's existing `mobility_recommendations` master. Run the boundary check before any load.
- Buckets 1 (excluding B1-Q items already routed to Bucket 2) and the other Bucket 2 items are independent of Bucket 3.

### Per-bucket prompts

- **Bucket 1:** Fix these now? Reply "all", "just IDs <a, b, c>", or "skip". Note: B1-S1 (catalog UX wording) requires explicit user-approved text per Rule #20 before any PATCH; the agent will surface the draft for approval rather than auto-write. B1-S3 (intra-domain handoffs) depends on B1-S2 (trigger events) being loaded first.
- **Bucket 2:** What's your call on each of these? I'll wait for your decision per item before acting. Items 1 (catalog UX wording) and 2 (permission prefix rename) need exact text or yes / no; item 3 (handoff 1307) is one decision (DELETE vs PATCH); items 4, 5, 6 are policy calls.
- **Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates (B3-1 through B3-8) to treat as confirmed and I'll fold them into Bucket 1 in a follow-up pass.

### Report-only follow-ups (owed by other domains)

These are NOT this domain's audit blockers. They surface during this pass so the user can decide whether to schedule audits on the source domains.

- **HCM B9 owes outbound on `employees` -> SKILLS-MGMT.** When a worker is hired, role-changed, or terminated, SKILLS-MGMT-PROFILE has no trigger event firing into it. Today the relationship `employees holds skill_profiles` (id 10) exists structurally but no `employee.hired` -> SKILLS-MGMT-PROFILE handoff is loaded. HCM's B9 audit owes this.
- **HCM B9 owes outbound on `employees.role_changed`** -> SKILLS-MGMT-PROFILE (refresh competency baseline against the new role). Same provenance.
- **TLNT-INTEL B8 owes** the data_object_relationships row `fit_scores compares skill_profiles` from the TLNT-INTEL side (today row 1284 has owner_side=target with TLNT-INTEL's master compared against SKILLS-MGMT's), so the row is correctly authored on the SKILLS-MGMT side as inbound. Verify TLNT-INTEL's next audit retains symmetry.
- **LMS B10b owes module attribution clarification** on handoff 1307 (NULL target_domain_module_id). If the SKILLS-MGMT decision is DELETE (Bucket 2 item 3), no follow-up needed on LMS. If PATCH-and-keep, LMS may need to fix the duplicate-event publication shape on its side.

### Pass 3 - Neighbor discovery

Neighbor set auto-discovered from `handoffs` (in / out) and cross-domain DMDO + relationship edges. Ranked by combined edge weight (handoffs + dependencies).

| Neighbor | Inbound handoffs | Outbound handoffs | DMDO / relationship edges | Edge weight | Pass 4 depth |
|---|---|---|---|---|---|
| LMS | 7 (1079, 1080, 1287, 1288, 1295, 1307, 1315) | 0 | course_enrollments / learner_certifications contributor; LMS-PATHS consumes skill_profiles | 9 | full 4-leg |
| HCM | 1 (388) | 0 | employees / job_profiles embedded_master; HCM-LIFECYCLE-WORKFLOWS consumes skill_profiles | 5 | full 4-leg |
| TALENT-MGMT | 1 (440) | 1 (432) | performance_goals contributor; career_aspirations relationship; TALENT-PERFORMANCE-MGMT contributor on skill_profiles | 5 | full 4-leg |
| TLNT-INTEL | 0 | 0 | 3 consumer DMDOs (skill_profiles, competency_models, skill_taxonomies) + 2 relationship rows (mobility_recommendations, fit_scores) | 5 | full 4-leg |
| SWP | 1 (456) | 0 | none beyond the handoff | 1 | summary only |
| PA | 1 (1106) | 0 | none beyond the handoff | 1 | summary only |
| ATS | 0 | 0 | 1 relationship (skill_profiles feeds candidates) | 1 | summary only |

### Pass 4 - Pairwise reconciliation per neighbor (edge weight >= 3)

#### SKILLS-MGMT <-> LMS (edge weight 9)

1. **Existing handoffs, fully wired.** 1079, 1080, 1287, 1288, 1295, 1315 (6 rows). All carry both module FKs. Sanity check pass.
2. **Existing handoffs with NULL module FK.** 1307 — see B1-B1 / Bucket 2 item 3 (DELETE candidate).
3. **Missing handoffs the catalog implies should exist.** None outbound (SKILLS-MGMT does not produce content events). Inbound coverage is dense.
4. **Boundary integrity.** Clean. Every LMS-mastered consumer dependency on SKILLS-MGMT-PROFILE has a corresponding inbound handoff.
5. **Cross-domain `data_object_relationships` mirror.** `skill_profiles updated_by learner_certifications` (id 88), `skill_profiles updated_by course_enrollments` (id 89) — both authored. Symmetric coverage on the LMS side should appear on LMS's B8.

Verdict: clean except handoff 1307 (Bucket 2 item 3).

#### SKILLS-MGMT <-> HCM (edge weight 5)

1. **Existing handoffs, fully wired.** 388 (HCM job_profile.published -> SKILLS-MGMT-PROFILE). Sanity-check pass.
2. **Existing handoffs with NULL module FK.** None.
3. **Missing handoffs the catalog implies should exist.** Yes: `employee.hired`, `employee.role_changed`, `employee.terminated` -> SKILLS-MGMT-PROFILE. HCM masters `employees` and `skill_profiles` is `embedded_master` on the SKILLS-MGMT side; every workflow-bearing transition on `employees` should refresh / archive the corresponding `skill_profile`. Today none loaded. **Owed by HCM's B9** (HCM's outbound, not SKILLS-MGMT's). Report-only.
4. **Boundary integrity.** SKILLS-MGMT correctly embedded_masters `employees` (DMDO 916) and `job_profiles` (DMDO 910). Clean on this side.
5. **Cross-domain `data_object_relationships` mirror.** `employees holds skill_profiles` (id 10) and `job_profiles maps_to skill_profiles` / `job_profiles expects skill_profiles` (ids 14, 93) all present. Symmetric.

Verdict: clean on SKILLS-MGMT's side. HCM has 3 outbound handoff gaps (`employee.hired / role_changed / terminated`) reported above.

#### SKILLS-MGMT <-> TALENT-MGMT (edge weight 5)

1. **Existing handoffs, fully wired.** 432 (SKILLS-MGMT -> TALENT-MGMT skill_profile.updated), 440 (TALENT-MGMT -> SKILLS-MGMT performance_goal.set). Both wired.
2. **Existing handoffs with NULL module FK.** None.
3. **Missing handoffs.** Possibly `succession_plan.committed` -> SKILLS-MGMT-PROFILE (refresh profile against succession-target competency model) if TALENT-MGMT publishes succession events. Surface to TALENT-MGMT's audit (report-only). `performance_review.completed` -> SKILLS-MGMT-PROFILE could be a candidate; depends on TALENT-MGMT's lifecycle definitions.
4. **Boundary integrity.** Clean; TALENT-PERFORMANCE-MGMT contributes to skill_profiles (DMDO row noted earlier). Symmetric coverage looks consistent.
5. **Cross-domain `data_object_relationships` mirror.** `skill_profiles feeds career_aspirations` (id 111) on SKILLS-MGMT side; TALENT-SUCCESSION-CAREER side carries career_aspirations. Verify TALENT-MGMT's B8 has the mirror.

Verdict: clean on SKILLS-MGMT's side. 1-2 TALENT-MGMT outbound candidates reported above.

#### SKILLS-MGMT <-> TLNT-INTEL (edge weight 5)

1. **Existing handoffs, fully wired.** ZERO handoff rows in either direction, despite TLNT-INTEL holding three `consumer + required` DMDOs on skill_profiles / competency_models / skill_taxonomies. **This is the most material pairwise finding.**
2. **Existing handoffs with NULL module FK.** N/A.
3. **Missing handoffs the catalog implies should exist.** Yes, multiple:
   - SKILLS-MGMT-PROFILE -> TLNT-INTEL-MOBILITY on `skill_profile.updated` (refresh fit_scores / mobility_recommendations against the new profile). Probably already covered by the existing 432 row that targets TALENT-MGMT — needs fan-out, see Bucket 2 candidate below.
   - SKILLS-MGMT-PROFILE -> TLNT-INTEL-MOBILITY on `skill_profile.validated` (validated profile is a stronger signal for mobility recommendations).
   - SKILLS-MGMT-TAXONOMY -> TLNT-INTEL-MOBILITY / -INSIGHTS on `competency_model.published` (publish a new role profile -> recompute fit_scores).
   - SKILLS-MGMT-TAXONOMY -> TLNT-INTEL-MOBILITY on `skill_taxonomy.activated` (new active taxonomy means TLNT-INTEL must re-key inferences).
   Surface as Bucket 1 follow-up after B1-S2 events ship (the trigger events have to exist first). **Captured here as a pairwise observation only — the load action is consolidated into B1-S2 + B1-S3 + an outbound fan-out to TLNT-INTEL.**
4. **Boundary integrity.** Clean DMDO declarations; just missing the event substrate.
5. **Cross-domain `data_object_relationships` mirror.** `skill_profiles compared via fit_scores` (id 1284) and `skill_profiles feeds mobility_recommendations` (id 1285) — both authored on the SKILLS-MGMT side with owner_side=target (TLNT-INTEL is the source-of-owner). Symmetric.

Verdict: the SKILLS-MGMT-TAXONOMY -> TLNT-INTEL handoff fan-out is the most consequential single Pass 4 finding. It is downstream of B1-S2 (trigger events have to ship first), so it folds naturally into the B1-S2 + B1-S3 follow-up load. Not separately surfaced as a Bucket 1 ID to avoid double-counting; will be loaded in the same pass as B1-S2 / B1-S3.

#### Lighter neighbors (summary)

- **SWP** (weight 1): existing inbound 456 (skills_gap_analysis.completed). No further pairwise findings.
- **PA** (weight 1): existing inbound 1106 (skill_gap.identified, payload `workforce_segments`). Payload is PA-mastered, not SKILLS-MGMT's concern. No further findings.
- **ATS** (weight 1): no handoffs, only the relationship `skill_profiles feeds candidates` (id 110). ATS consumes the substrate; no pairwise event gap apparent without a deeper ATS-side check. Surface to ATS audit if a follow-up is scheduled.

### Candidates queued to `audits/_missing-domains.md`

| code | name | mention_count after this run |
|---|---|---|
| LABOR-MARKET-INTEL | Labor Market Intelligence | 1 (first surfaced) |
| TALENT-INTEL-PLATFORM | Talent Intelligence Platform | 2 (bumped from 1) |

Helper: `bun run "C:/dev/domain-map/scripts/analytics/append_missing_domain.ts" --code <CODE> --name "<Name>" --surfaced-by "SKILLS-MGMT audit 2026-05-30" --evidence "..." --adjacency "..." --capabilities "..."` was run for both.

### `domains.notes` pointer

_not yet written; will require user-approved wording per Rule #15_
