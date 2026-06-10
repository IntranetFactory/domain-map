# LMS audit history

## 2026-05-29, Audit

### Summary

- **Current footprint:** 8 modules (7 full + 1 starter `TRAINING-RECORDS-STARTER`), ~93 `domain_module_data_objects` rows, **63 LMS-owned masters**.
- **Cross-domain handoffs:** 31 outbound + inbound combined (after `source != target` filter). Intra-domain `lifecycle_progression` rows additionally present (counted under B9b, not under H1).
- **Modules realized:** all 8 carry ≥1 capability, all 8 carry one `skill_type='system'` skill.
- **System-skill Semantius coverage:** **100% strict_score on every module.** All 176 `skill_tools` rows resolve to `tools.coverage_tier = 'platform'`. Zero `external`, zero `integration`.
- **Vendor surface basis:** Cornerstone Learning, Docebo, 360Learning, Absorb LMS, KnowBe4 (compliance specialist for PCI DSS 12.6 / NIST CSF / HIPAA security awareness). Subagent JSON + md in `c:/tmp/LMS-market-surface-2026-05-29.{json,md}`.
- **Bucket 1** (in-scope, agent fixable): **52 items**
  - MISSING (vendor-surface + regulatory): 19
  - WRONG-OWNERSHIP: 0
  - SCOPE-CREEP: 0
  - STRUCTURAL (S/A/M/B/C/E/F band failures): 3
  - BOUNDARY (NULL FK on inbound + intra-domain): 1
  - **APQC TAGGING**: 29 untagged cross-domain handoffs (volume target 0.5N to 0.8N = 16 to 25; we propose 21 here, defer 8 to Discover Pass 3)
- **Bucket 2** (judgment calls): **5 items**
- **Bucket 3** (Phase 0 pending, speculative): **0 items.** The market-audit subagent IS the Phase 0 pass for this audit. Every MISSING entity in Bucket 1 is anchored to either a flagship vendor's documented surface or a specific regulation. Nothing speculative was carried over.

### Vendor surface basis

| Vendor | Why included |
|---|---|
| Cornerstone Learning | Enterprise reference; deepest compliance and certification footprint; canonical SCORM/xAPI runtime |
| Docebo | Pure-play LXP leader; AI Discover/Coach/Share, content marketplace, observation checklists |
| 360Learning | Collaborative/peer-led learning; co-authoring patterns |
| Absorb LMS | Mid-market reference; course commerce, multi-portal extended enterprise, SCORM/xAPI runtime |
| KnowBe4 | Security-awareness specialist (PCI DSS 12.6, NIST CSF PR.AT, HIPAA training); simulated phishing |

---

### Bucket 1, In-scope confirmed gaps

#### MISSING entities (19, Phase B inserts)

From the market-surface JSON. Bold rows are top-5 most-impactful.

| Entity | Proposed module | Compliance basis | Rationale |
|---|---|---|---|
| **question_banks** | LMS-COURSE-DELIVERY | - | All 5 flagships expose reusable banks separate from per-assessment questions; required for randomized assessments + recert quizzes |
| **cmi5_assignable_units** | LMS-COURSE-DELIVERY | cmi5 (ADL) | Modern standard supplanting SCORM; supported by Cornerstone and Docebo |
| lrs_statement_endpoints | LMS-COURSE-DELIVERY | xAPI LRS | External LRS routing; specialist |
| observation_checklists | LMS-COURSE-DELIVERY | - | Field-skill assessment (Docebo, Cornerstone); on-the-job competency capture |
| observation_checklist_results | LMS-COURSE-DELIVERY | - | Junction for above |
| training_room_bookings | LMS-ILT-DELIVERY | - | Cross-vendor common; resource reservation for ILT |
| session_rosters | LMS-ILT-DELIVERY | OSHA (attendance proof) | Pre-session enrollment snapshot |
| session_cancellations | LMS-ILT-DELIVERY | - | Cancel/no-show tracking for waitlist promotion |
| skill_targets | LMS-PATHS | - | Path step ↔ skill + proficiency threshold; modern LXP shape |
| learning_recommendations | LMS-PATHS | - | Per-learner AI suggestions (Cornerstone Capabilities, Docebo Coach) |
| credential_verifications | LMS-CREDENTIALS | Open Badges 3.0 | Third-party badge-verification handshakes |
| certification_renewals | LMS-CREDENTIALS | - | Renewal lifecycle distinct from initial issuance |
| **gxp_training_signoffs** | LMS-COMPLIANCE-TRAINING | FDA 21 CFR Part 11 | Witnessed e-signature binding learner + course + version + timestamp; hard blocker for life-sciences |
| phishing_simulations | LMS-COMPLIANCE-TRAINING | PCI DSS 12.6 | KnowBe4 / Proofpoint surface |
| phishing_simulation_results | LMS-COMPLIANCE-TRAINING | PCI DSS 12.6 | Junction for above |
| **dpo_training_acknowledgements** | TRAINING-RECORDS-STARTER | GDPR Art. 39 | Non-optional for EU operators; gap in the otherwise-complete jurisdictional set |
| pci_dss_awareness_records | TRAINING-RECORDS-STARTER | PCI DSS 12.6 | Card-handler training records |
| data_retention_policies | LMS-CT-GDPR | GDPR Art. 5(1)(e) | Policy rows driving deletion automation |
| reminder_schedules | LMS-AUTOMATION | - | Nudge cadence config |

**Fix surface:** Phase B insert per `references/loader-idiom.md`. Recommend one focused loader per module group: (a) course-delivery banks + cmi5 + observation, (b) ILT shells, (c) paths LXP shells, (d) credentials renewal/verification, (e) compliance phishing + GxP, (f) GDPR retention.

#### STRUCTURAL findings (3)

| Band | ID | Finding | Fix |
|---|---|---|---|
| M4 | SKILLS-MGMT capability (id 20) is linked to LMS via `capability_domains` but no LMS module realizes it; only `SKILLS-MGMT-TAXONOMY` (in the `SKILLS-MGMT` domain) realizes it. | Two clean options surfaced as Bucket 2 item #1, not auto-fixable. |
| B12 | Lifecycle states present on **46 of 63** LMS-owned masters (73%). 17 masters carry no `data_object_lifecycle_states` rows. Some are likely config-shape (catalogs, tags, categories, templates); others are workflow-bearing and need states. | Bucket-2 review (item #2) to classify each of the 17 as config-exempt or workflow-bearing; load states for the workflow-bearing subset. |
| E1 (soft) | `TRAINING-RECORDS-STARTER` (module 182) has zero `role_modules` entries. Every other LMS module has ≥1 primary + 2 secondary roles. Per Rule #19 starters are first-class deployable units; per the catalog convention they need a role surface too. | Bucket 2 item #3, name the recommended role(s). |

#### BOUNDARY findings (1)

| ID | Handoff | Defect | Fix |
|---|---|---|---|
| B10b inbound | id=249 (GRC → LMS-COMPLIANCE-TRAINING on `compliance_policy.updated` carrying `policy_attestations`) | `source_domain_module_id` is NULL. GRC is modularized, so this is a B10b defect on the **source side** owed by GRC's audit. | **Report-only here** (owed by GRC B10b). Surface in follow-ups, do not author from LMS pass. |

The HRSD-inbound row (id=1121 on `case_category.updated`) has `target_domain_module_id` NULL. That's LMS's side, but the LMS endpoint for case-category propagation is genuinely ambiguous (could land in LMS-COMPLIANCE-TRAINING or LMS-PATHS). Bucket 2 item #4.

#### APQC TAGGING (29 untagged cross-domain handoffs; 21 agent_curated proposals + 8 deferred-to-Discover)

Existing tags: 2 rows, both `proposal_source='discovery_override'`, `record_status='new'` (handoff_id 8 → PCF 10469 "Manage employee onboarding"; handoff_id 373 → PCF 20599 "Manage employee onboarding, training, and development"). **Headline catalog quality: 0 approved across 31 cross-domain handoffs.**

**Proposed `agent_curated` tags (21 rows). All ship `record_status='new'`, `proposal_source='agent_curated'`.**

| handoff_id | source → target | trigger_event | payload | Proposed PCF | PCF external_id (id) | Confidence |
|---|---|---|---|---|---|---|
| 111 | LMS → TALENT-MGMT | learner_certification.earned | skill_profiles | Manage certifications and skills | 20020 (1873) | L5 confident |
| 430 | LMS → TALENT-MGMT | course_enrollment.completed | course_enrollments | Develop, conduct, and manage employee training programs | 10493 (1039) | L4 confident |
| 431 | LMS → HCM | learning_record.posted | learning_records | Monitor and evaluate learning programs | 21436 (1041) | L4 confident |
| 434 | LMS → GRC | compliance_assignment.overdue | compliance_assignments | Manage regulatory compliance | 16463 (369) | L3 confident |
| 435 | LMS → IGA | compliance_assignment.overdue | compliance_assignments | Manage regulatory compliance | 16463 (369) | L3 confident (IGA-side enforcement) |
| 1047 | LMS → HCM | compliance_assignment.due | compliance_assignments | Manage regulatory compliance | 16463 (369) | L3 confident |
| 1048 | LMS → HRSD | compliance_assignment.due | compliance_assignments | Manage regulatory compliance | 16463 (369) | L3 confident |
| 1049 | LMS → GRC | compliance_assignment.due | compliance_assignments | Manage regulatory compliance | 16463 (369) | L3 confident |
| 1303 | LMS → IGA | learner_certification.revoked | learner_certifications | Manage certifications and skills | 20020 (1873) | L5 confident |
| 1304 | LMS → IGA | learner_certification.expired | learner_certifications | Manage certifications and skills | 20020 (1873) | L5 confident |
| 1305 | LMS → IGA | learner_certification.renewed | learner_certifications | Manage certifications and skills | 20020 (1873) | L5 confident |
| 1306 | LMS → TALENT-MGMT | learner_badge.earned | learner_badges | Align learning programs with competencies and skills | 10491 (1037) | L4 confident |
| 1308 | LMS → GRC | compliance_assignment.completed | compliance_assignments | Manage regulatory compliance | 16463 (369) | L3 confident |
| 1309 | LMS → IGA | compliance_assignment.expired | compliance_assignments | Manage regulatory compliance | 16463 (369) | L3 confident |
| 1310 | LMS → GRC | compliance_assignment.expired | compliance_assignments | Manage regulatory compliance | 16463 (369) | L3 confident |
| 1311 | LMS → HCM | course_completion.recorded | course_completions | Develop, conduct, and manage employee training programs | 10493 (1039) | L4 confident |
| 1312 | LMS → GRC | training_evidence_record.submitted | training_evidence_records | Operate controls and monitor compliance with internal controls policies and procedures | 21574 (325) | L3 confident |
| 1313 | LMS → HCM | gdpr_consent_record.withdrawn | gdpr_consent_records | Manage regulatory compliance | 16463 (369) | L3 confident |
| 1314 | LMS → HCM | data_deletion_request.fulfilled | data_deletion_requests | Manage regulatory compliance | 16463 (369) | L3 confident |
| 8 | ONBOARDING → LMS | task.compliance_training_required | onboarding_tasks | Implement employee onboarding program | 17050 (1025) | L4 confident, REPLACES the existing `discovery_override` row pointing at the broader L3 onboarding row |
| 373 | HCM → LMS | employee.created | employees | Develop, conduct, and manage employee training programs | 10493 (1039) | L4 confident, REPLACES the existing `discovery_override` row pointing at the L2 umbrella |

**Deferred to Discover Pass 3 (8 rows).** No clean cross-industry PCF match; candidates for `source_framework='custom'`.

| handoff_id | source → target | trigger_event | Deferral reason |
|---|---|---|---|
| 249 | GRC → LMS | compliance_policy.updated | Policy-driven attestation cascade, no clean PCF activity, custom shape `CUSTOM-COMPLIANCE-POLICY-ATTESTATION-CASCADE` |
| 1121 | HRSD → LMS | case_category.updated | HR-case taxonomy propagation, no PCF L3/L4 match |
| 1233 | ONBOARDING → LMS | onboarding_cohort.activated | Cohort-level training pre-assignment, PCF onboarding rows are individual-scoped |
| 1079, 1080, 1287, 1288, 1295, 1307, 1315 | LMS → SKILLS-MGMT (various: course_enrollment.completed, learner_certification.earned, course_version.published, course_completion.recorded, learner_badge.earned, course.published) | Skill-graph feeding; SKILLS-MGMT-TAXONOMY downstream pattern; PCF 20051 "Define and manage skills taxonomy" is close at L4 but the source-data signal pattern doesn't map cleanly; defer to Pass-3 review with PCF 20051 as the front candidate |

**Fix surface:** chunked POST to `/handoff_processes`. Natural composed key `(handoff_id, process_id)` prevents duplicates. Existing two `discovery_override` rows get REPLACED (DELETE + INSERT) with the higher-confidence L4 matches per the table above; user approval per row before any write.

---

### Bucket 2, Surface-for-user (judgment calls)

1. **SKILLS-MGMT capability ↔ LMS attribution (M4).** The `SKILLS-MGMT` capability (id 20) is linked to LMS via `capability_domains` but no LMS module realizes it (only `SKILLS-MGMT-TAXONOMY` in the SKILLS-MGMT domain does). Two options:
   - (a) **Drop** `capability_domains` row for LMS×SKILLS-MGMT. The SKILLS-MGMT domain is the proper owner; the capability appears in LMS only because LMS-COURSE-DELIVERY uses `course_tags` for skill tagging, which is downstream consumption.
   - (b) **Add** a realizing LMS module for it, most likely `LMS-PATHS` (which carries `skill_profiles` as consumer and would naturally realize a "skill alignment" capability there once `skill_targets` ships from MISSING #9).
   - Recommendation: (a) is the cleaner interpretation. (b) becomes viable only after the MISSING entity `skill_targets` is loaded.
   - **Independent of Bucket 3 (no Bucket 3 items).**

2. **B12 lifecycle states on 17 of 63 masters are absent.** Some are obviously config-shape (catalogs, tags, categories, templates with author-once / occasional-edit shape); others are workflow-bearing. Names visible in DMDO: `course_tags`, `course_categories`, `course_catalogs`, `course_ratings`, `course_reviews`, `course_discussions`, `notification_templates`, `audiences`, `certificate_templates`, `prerequisite_rules`, `learning_path_steps`, `learning_path_assignments`, `regulator_filing_exports`, `learner_notifications`, `manager_nudges`, `escalation_rules`, plus several jurisdictional record types. Per Rule #15 (RESCINDED auto-population of `data_objects.notes`), the audit cannot annotate the config-shape exemption in `notes` without your exact wording. **Question: should I (a) surface the per-master list with proposed config-vs-workflow classification for your row-by-row call, or (b) ship lifecycle states for everything that looks workflow-bearing and skip the rest silently?**

3. **`TRAINING-RECORDS-STARTER` role coverage (E1 soft).** The starter has zero `role_modules` entries. Likely candidates: `L-AND-D-LEARNING-ADMIN` (primary) and `GRC-COMPLIANCE-TRAINING-MANAGER` (secondary). **Confirm both, or name a different set.** This is a soft E1: the 2-module floor applies per-role, not per-module, so a starter without roles is structurally permissible but functionally hollow.

4. **HRSD → LMS `case_category.updated` (handoff id 1121) target module is ambiguous.** Could be `LMS-COMPLIANCE-TRAINING` (case-category drives compliance-tag inheritance) or `LMS-PATHS` (case-category drives learning-path assignment). **Which?**

5. **`domains.notes` audit pointer.** Per Rule #15 I cannot write `domains.notes` without your exact wording. Suggested template: *"Last validated 2026-05-29. APQC tagging at 0 approved; 21 agent_curated proposals pending. See `audits/LMS.md`."* **Use as-is, edit, or skip?**

Buckets 2 items 1, 3, 4, 5 are independent of each other. Item 2 depends only on your routing preference (a/b), not on other items.

---

### Bucket 3, Phase 0 pending (speculative)

**Empty.** The market-surface subagent ran the Phase 0 pass for this audit; every MISSING entity in Bucket 1 is anchored to a flagship-vendor surface or a specific regulation. No speculative items carry over.

---

### Decisions

*(Pending user response to bucket prompts below.)*

### Fixes applied

*(None yet; pending Bucket 1 approvals.)*

## 2026-05-31, Audit

### Summary

- **Current footprint:** 8 modules (7 full + 1 starter `TRAINING-RECORDS-STARTER`), **64 LMS-owned masters**, 113 DMDO rows, 67 trigger events, 49 aliases, ~167 lifecycle-state rows across 47 masters.
- **Cross-domain handoffs:** 24 outbound (LMS → TALENT-MGMT, HCM, GRC, IGA, SKILLS-MGMT) + 4 inbound (ONBOARDING, GRC, HCM, HRSD) = 28 cross-domain rows. Intra-domain `lifecycle_progression` rows: 12 (visible in B9b section).
- **System skills:** 8 / 8 modules carry exactly one `skill_type='system'` skill. Zero legacy domain-level system skills.
- **Semantius score:** **100% strict_score** on every module (176 / 176 `skill_tools` rows resolve to `tools.coverage_tier='platform'`). Zero `external`, zero `integration`, zero F4 invariant violations, zero channel-primitive links (F7 PASS).
- **APQC coverage:** 8 of 28 cross-domain handoffs tagged (29% coverage). 0 approved. 6 `agent_curated` (handoffs 1048, 1079, 1080, 1121, 1288, 1295), 2 `discovery_override` (handoffs 8, 373). **20 cross-domain handoffs still untagged.**
- **Bucket 1 (b1a, agent-fixable):** **6 items.**
- **Bucket 1 (b1b, blocked):** **6 items.**
- **Bucket 2 (judgment calls):** **6 items.**
- **Bucket 3 (Phase 0 pending, speculative):** **0 items.** The 2026-05-29 market audit IS the Phase 0 anchor for LMS; every MISSING vendor-surface entity from that audit is parked in b2 / pending-deploy queues, not re-surfaced as speculative here.

### Vendor surface basis

Carried verbatim from the 2026-05-29 market-audit pass. Flagships: Cornerstone Learning, Docebo, 360Learning, Absorb LMS, KnowBe4 (security-awareness specialist). Subagent surface lives at `c:/tmp/LMS-market-surface-2026-05-29.{json,md}`. The 19 MISSING entities and 1 BOUNDARY finding from 2026-05-29 remain undeployed; they are carried as Bucket 2 items #1 (architectural sequencing) and #2 (per-master scope) rather than re-asserted as Bucket 1 inserts, because the prior audit explicitly handed both back to the user for routing decisions and those decisions have not been made yet.

### Bucket 1 (b1a), In-scope confirmed gaps (agent-fixable)

#### BOUNDARY findings (1)

| ID | Defect | Fix |
|---|---|---|
| B7 user edges | `data_object_relationships` has **zero** rows in either direction between LMS masters and `users` (data_object id 41). Per Rule #10, every LMS master with a user-typed actor (instructor, learner, assigner, approver, author, reviewer) MUST carry a `data_object_relationships` edge to `users`. Affected masters include `instructors` (instructor user), `course_enrollments` (learner), `assessment_attempts` (learner), `learner_certifications` (learner + issuer), `compliance_assignments` (learner + assigner), `learning_path_assignments` (learner + assigner), `course_versions` / `course_assessments` / `certification_definitions` (author + publisher), `course_reviews` / `course_discussions` (author), `compliance_audit_records` / `training_evidence_records` / `regulator_filing_exports` (signer / submitter), `learner_badges` (learner), `gdpr_consent_records` / `subject_access_requests` / `data_deletion_requests` (subject + fulfiller), `manager_nudges` (manager). | Author the missing `data_object_relationships` rows per Rule #10. Loader pattern from prior cluster-drafts work; pre-flight verifies the `users` row is `kind='platform_builtin'`. |

#### STRUCTURAL findings (3)

| Band | Finding | Fix |
|---|---|---|
| M8 | All 8 LMS modules have empty `catalog_tagline` and empty `catalog_description`. Per Rule #20 backfill is allowed with draft-surface-review loop. | Draft buyer-voice tagline + description per module, surface for review, write. Affected modules: `LMS-COURSE-DELIVERY`, `LMS-COMPLIANCE-TRAINING`, `LMS-PATHS`, `LMS-ILT-DELIVERY`, `LMS-CREDENTIALS`, `LMS-CT-GDPR`, `LMS-AUTOMATION`, `TRAINING-RECORDS-STARTER`. Drafts go in Bucket 2 surface-for-user first (item #3 below) because Rule #20 mandates pre-write user review, so this lives in b1a only as "draft the candidate copy"; the actual writes are blocked on user approval. |
| A4 | LMS domain row (`id=57`) has empty `catalog_tagline` and empty `catalog_description`. Same Rule #20 path as M8. | Draft buyer-voice copy for the domain landing page; surface for review (Bucket 2 item #3 covers this jointly with M8). |
| (S3 hint) | 17 of 64 LMS-owned masters have **zero** `data_object_lifecycle_states` rows: `assessment_questions`, `quiz_responses`, `course_modules`, `lessons`, `xapi_statements`, `course_ratings`, `course_catalogs`, `course_tags`, `course_categories`, `recertification_schedules`, `learning_path_steps`, `prerequisite_rules`, `course_resources`, `continuing_education_credits`, `certificate_templates`, `notification_templates`, `audiences`. Many are config-shape (tags, categories, templates, catalogs, audiences, prerequisite_rules); others (`assessment_questions`, `quiz_responses`, `course_modules`, `lessons`, `learning_path_steps`, `learning_content_assets` child shells) are content-bearing but author-once with no lifecycle gates beyond the parent's. | Carried unchanged from 2026-05-29 as Bucket 2 item #4 (per-master classification). Not auto-fixable. |

#### APQC TAGGING (15 agent_curated proposals)

Existing tags (8 of 28 cross-domain handoffs): handoffs 8 (`discovery_override`, PCF 10469), 373 (`discovery_override`, PCF 20599), 1121 (`agent_curated`, PCF 20599), 1048 (`agent_curated`, PCF 10523), 1079 (`agent_curated`, PCF 17051), 1080 (`agent_curated`, PCF 20020), 1288 (`agent_curated`, PCF 17051), 1295 (`agent_curated`, PCF 20020). **0 approved across all 28 cross-domain handoffs.**

20 untagged cross-domain handoffs. The 2026-05-29 audit proposed 21 `agent_curated` tags; 6 of those landed already (1048, 1079, 1080, 1121, 1288, 1295). The remaining 15 unland; this pass re-issues them ready to insert. All ship `record_status='new'`, `proposal_source='agent_curated'`. Targets (PCF external_id → internal id from /processes lookup): 16463→369, 20020→1873, 10493→1039, 21436→1041, 10491→1037, 21574→325, 17050→1025, 20051→887, 10469→224, 20599→41.

| handoff_id | source → target | trigger_event | payload | Proposed PCF (external_id → id) |
|---|---|---|---|---|
| 111 | LMS → TALENT-MGMT | learner_certification.earned | skill_profiles | Manage certifications and skills (20020 → 1873) |
| 430 | LMS → TALENT-MGMT | course_enrollment.completed | course_enrollments | Develop, conduct, and manage employee training programs (10493 → 1039) |
| 431 | LMS → HCM | learning_record.posted | learning_records | Monitor and evaluate learning programs (21436 → 1041) |
| 434 | LMS → GRC | compliance_assignment.overdue | compliance_assignments | Manage regulatory compliance (16463 → 369) |
| 435 | LMS → IGA | compliance_assignment.overdue | compliance_assignments | Manage regulatory compliance (16463 → 369) |
| 1047 | LMS → HCM | compliance_assignment.due | compliance_assignments | Manage regulatory compliance (16463 → 369) |
| 1049 | LMS → GRC | compliance_assignment.due | compliance_assignments | Manage regulatory compliance (16463 → 369) |
| 1303 | LMS → IGA | learner_certification.revoked | learner_certifications | Manage certifications and skills (20020 → 1873) |
| 1304 | LMS → IGA | learner_certification.expired | learner_certifications | Manage certifications and skills (20020 → 1873) |
| 1305 | LMS → IGA | learner_certification.renewed | learner_certifications | Manage certifications and skills (20020 → 1873) |
| 1306 | LMS → TALENT-MGMT | learner_badge.earned | learner_badges | Align learning programs with competencies and skills (10491 → 1037) |
| 1308 | LMS → GRC | compliance_assignment.completed | compliance_assignments | Manage regulatory compliance (16463 → 369) |
| 1309 | LMS → IGA | compliance_assignment.expired | compliance_assignments | Manage regulatory compliance (16463 → 369) |
| 1310 | LMS → GRC | compliance_assignment.expired | compliance_assignments | Manage regulatory compliance (16463 → 369) |
| 1311 | LMS → HCM | course_completion.recorded | course_completions | Develop, conduct, and manage employee training programs (10493 → 1039) |
| 1312 | LMS → GRC | training_evidence_record.submitted | training_evidence_records | Operate controls and monitor compliance with internal controls policies and procedures (21574 → 325) |
| 1313 | LMS → HCM | gdpr_consent_record.withdrawn | gdpr_consent_records | Manage regulatory compliance (16463 → 369) |
| 1314 | LMS → HCM | data_deletion_request.fulfilled | data_deletion_requests | Manage regulatory compliance (16463 → 369) |

**Deferred to Discover Pass 3 (5 rows).** No clean cross-industry PCF match.

| handoff_id | source → target | trigger_event | Deferral reason |
|---|---|---|---|
| 249 | GRC → LMS | compliance_policy.updated | Policy-driven attestation cascade, no clean PCF activity |
| 1233 | ONBOARDING → LMS | onboarding_cohort.activated | Cohort-level training pre-assignment, PCF onboarding rows are individual-scoped |
| 1307 | LMS → SKILLS-MGMT | learner_badge.earned | Skill-graph feed pattern; PCF 20051 (Define and manage skills taxonomy) close at L4 but signal pattern mismatched; defer to Discover with PCF 887 as front candidate |
| 1287 | LMS → SKILLS-MGMT | course_version.published | Same as 1307 (skill-graph feed) |
| 1315 | LMS → SKILLS-MGMT | course.published | Same as 1307 (skill-graph feed) |

**Volume math:** 28 cross-domain handoffs × (0.5 to 0.8) = 14 to 22 expected agent_curated tags. Existing 6 agent_curated + 15 newly proposed = 21 total. Within range. Deferred 5. Combined 21 + 5 = 26; 2 remain `discovery_override` (handoffs 8 + 373) which the 2026-05-29 audit recommended REPLACING with higher-confidence L4 matches (PCF 17050 = 1025 for handoff 8; PCF 10493 = 1039 for handoff 373) — DELETE + INSERT pattern. Carried as b1a alongside the 15 new inserts.

#### B10b report-only follow-ups (foreign-domain B10b owed back to LMS)

These rows have `target_domain_module_id=null` on the **target side** (LMS as source); the fix lives on the target domain's B10b backfill. Not an LMS gap. 10 rows: 431 (HCM), 434 (GRC), 1307 (SKILLS-MGMT), 1308 (GRC), 1310 (GRC), 1311 (HCM), 1312 (GRC), 1313 (HCM), 1314 (HCM), 1047 (HCM), 1049 (GRC). Surface to user for follow-up audits on GRC, HCM, SKILLS-MGMT.

### Bucket 1 (b1b), Blocked

| ID | Item | Blocked by |
|---|---|---|
| B1B-M4-SKILLS-MGMT | `capability_domains` carries an LMS×SKILLS-MGMT link but no LMS module realizes capability id 20 (SKILLS-MGMT). Either drop the link or add LMS-PATHS as a realizing module after `skill_targets` ships. | Bucket 2 item #1 (user decision: drop vs add). |
| B1B-MISSING-ENTITIES | 19 MISSING entities from 2026-05-29 market audit (top-5: `question_banks`, `cmi5_assignable_units`, `gxp_training_signoffs`, `dpo_training_acknowledgements`, plus `phishing_simulations`, `data_retention_policies`, etc.). | Bucket 2 item #2 (user approves which to load, per loader-group). |
| B1B-A4-M8-COPY | Draft + write `catalog_tagline` + `catalog_description` for 1 domain row + 8 module rows. Buyer voice per Rule #20. | Bucket 2 item #3 (user approves the drafts BEFORE writing per Rule #20). |
| B1B-B12-LIFECYCLE | Load lifecycle states for the workflow-bearing subset of the 17 stateless masters. | Bucket 2 item #4 (user picks per-master config-vs-workflow classification). |
| B1B-E1-STARTER-ROLES | `TRAINING-RECORDS-STARTER` (module 182) has zero `role_modules` entries; every other LMS module has 2-4. | Bucket 2 item #5 (user names which roles the starter inherits). |
| B1B-B10b-INBOUND-1121 | Inbound handoff 1121 (HRSD → LMS, `case_category.updated` → `case_categories`) has `target_domain_module_id=null`. LMS endpoint is ambiguous (LMS-COMPLIANCE-TRAINING vs LMS-PATHS). | Bucket 2 item #6 (user picks the target module). |

### Bucket 2, Surface-for-user (judgment calls)

1. **SKILLS-MGMT capability ↔ LMS attribution (M4).** Carried from 2026-05-29. Options: (a) DELETE `capability_domains` row for LMS × capability id 20 (SKILLS-MGMT is owned by SKILLS-MGMT-TAXONOMY); or (b) add `LMS-PATHS` (module 34) as the realizing module after `skill_targets` (MISSING entity) ships. Recommendation: (a) cleaner; (b) viable after Phase B insert for `skill_targets`. **Independent of Bucket 3 (none).**
2. **2026-05-29 MISSING entity load routing.** 19 vendor-surface entities still undeployed. Recommend grouping into 6 loaders: (a) course-delivery (`question_banks`, `cmi5_assignable_units`, `lrs_statement_endpoints`, `observation_checklists`, `observation_checklist_results`), (b) ILT (`training_room_bookings`, `session_rosters`, `session_cancellations`), (c) paths (`skill_targets`, `learning_recommendations`), (d) credentials (`credential_verifications`, `certification_renewals`), (e) compliance (`gxp_training_signoffs`, `phishing_simulations`, `phishing_simulation_results`, `dpo_training_acknowledgements`, `pci_dss_awareness_records`), (f) GDPR (`data_retention_policies`), (g) automation (`reminder_schedules`). Approve all / approve some / decline.
3. **Catalog UX copy (A4 + M8).** Should I draft buyer-voice `catalog_tagline` and `catalog_description` for 1 LMS domain row plus all 8 modules (`LMS-COURSE-DELIVERY`, `LMS-COMPLIANCE-TRAINING`, `LMS-PATHS`, `LMS-ILT-DELIVERY`, `LMS-CREDENTIALS`, `LMS-CT-GDPR`, `LMS-AUTOMATION`, `TRAINING-RECORDS-STARTER`)? Drafts go to chat for review before any write. Answer: yes / yes for some / draft a single example first.
4. **B12 lifecycle classification on 17 masters.** 17 LMS masters with zero lifecycle states. Likely config-shape (no workflow): `course_tags`, `course_categories`, `course_catalogs`, `audiences`, `notification_templates`, `certificate_templates`, `prerequisite_rules`, `course_resources`, `recertification_schedules` (schedule rule, not record), `learning_path_steps` (sequence row), `continuing_education_credits` (sum-typed ledger). Likely workflow-bearing: `assessment_questions` (draft → published → retired), `quiz_responses` (submitted → graded), `course_modules` / `lessons` (draft → published → retired), `xapi_statements` (recorded → validated). Approve the recommended split (a) row-by-row, or (b) ship lifecycle states for the workflow-bearing subset I named and accept the others as config-shape with no annotation (Rule #15 forbids the prior `data_objects.notes` exemption).
5. **`TRAINING-RECORDS-STARTER` role coverage (soft E1).** Module 182 has zero `role_modules`. Likely candidates: `L-AND-D-LEARNING-ADMIN` (primary), `GRC-COMPLIANCE-TRAINING-MANAGER` (secondary), `MANAGER-AS-LEARNER-MANAGER` (secondary). Confirm or name a different set.
6. **HRSD → LMS handoff 1121 target module.** `case_category.updated` carrying `case_categories` could land in `LMS-COMPLIANCE-TRAINING` (compliance-tag inheritance) or `LMS-PATHS` (learning-path assignment by case category). Pick one.

Buckets 2 items 1, 3, 5, 6 are independent. Item 2 depends only on per-loader-group approval. Item 4 routing (a vs b) is independent.

### Bucket 3, Phase 0 pending (speculative)

**Empty.** The 2026-05-29 market-audit subagent IS the Phase 0 anchor for LMS. Every MISSING entity it surfaced is anchored to either a flagship vendor's documented surface (Cornerstone, Docebo, 360Learning, Absorb, KnowBe4) or a specific regulation (PCI DSS, GDPR, FDA Part 11, OSHA). Nothing speculative carries over to this pass.

### Pairwise reconciliation

No pairwise pass invoked this audit. Neighbor set discovered from handoffs: HCM (5 inbound + 5 outbound), GRC (5 outbound + 1 inbound), IGA (4 outbound), TALENT-MGMT (3 outbound), SKILLS-MGMT (5 outbound, all currently lifecycle_progression intra), HRSD (1 inbound + 1 outbound), ONBOARDING (2 inbound). Heaviest edges (≥3): HCM, GRC, IGA. Pairwise b1 mode 3+4 not run as part of this Validate b1 pass (the audit ran the structural + market-anchor passes only); recommend HCM and GRC pairwise reconciliation as a follow-up.

### Decisions

*(Pending user response to bucket prompts above.)*

### Fixes applied

*(None; this pass is read-only against the live catalog. All proposed inserts/PATCHes await per-bucket approval.)*

## 2026-06-02, Audit

Full 4-pass Validate (structural + market-surface + neighbor discovery + light pairwise). Read-only;
nothing written to the catalog. Market subagent surface at `c:/tmp/LMS-market-surface-2026-06-02.{md,json}`.

### Summary

- **Footprint:** 8 modules (7 full + 1 starter), **64 LMS-owned masters**, 113 DMDO rows, ~67 trigger
  events, ~63 aliases, ~167 lifecycle-state rows across 47 masters, 8 system skills.
- **Semantius score:** **100% strict on every module** (every linked tool `coverage_tier=platform`).
  F1-F5 + F7 all pass.
- **Strong bands:** A1/A2/A3, M1/M2/M5/M6/M7, B1/B2/B5/B6/B6b/B7/B9/B9b/B11, C1/C2, F1-F7.
- **This pass found four issues the prior two audits (2026-05-29, 2026-05-31) missed, corrected one
  false prior finding, and added refactor-level market findings the prior market pass did not surface.**

### Correction to prior audits

- **`B1A-B7-USER-EDGES` was a false finding.** Both prior audits claimed "zero `data_object_relationships`
  between LMS masters and `users` (data_object id 41)". Data_object **41 is `variance_analyses`**, not
  users; the platform `users` built-in is **748**. Querying 748 returns **37 user-to-master edges**
  (users owns/curates/authors courses + learning_paths, enrolls/completes, earns badges/credits,
  signs acknowledgements, files SAR/deletion, etc.). **B7 PASSES.** The prior b1a item is dropped.

### New findings (not in prior audits)

| ID | Band | Finding |
| --- | --- | --- |
| B13 | B13 | **All 64 LMS masters have `entity_type='unclassified'`.** Blocks B12 (lifecycle requirement is gated on entity_type) and the write-tier derivation. Classification is deterministic (operational_workflow / operational_record / catalog / junction / computed). Dominant fix. |
| DDO-DRIFT | (S1 data-quality) | The legacy `domain_data_objects` rollup carries **6 master rows; the `domain_module_data_objects` junction has 64.** The rollup never regenerated after the modules 178-181 + course-delivery expansion. Anything reading the rollup sees ~9% of LMS. Mechanical regen. |
| M9 | M9 (part 1) | **Four `consumer + required` rows on externally-mastered objects break standalone deployability:** COMPLIANCE-TRAINING requires `onboarding_tasks` (ONBOARDING) + `policy_attestations` (GRC); PATHS requires `performance_goals` (TALENT-MGMT) + `skills_gap_analyses` (SKILLS-MGMT). Fix = flip to `optional` (likely) or `embedded_master`. |
| B14 | B14 | `fda_part11_audit_trails` (948) + `bsa_aml_training_records` (949) are `master + required` but sector-bound (life-sciences / banking) -> should be `optional`. **Superseded if Refactor C (shell collapse) is adopted** (those masters get deleted). |

### Market-surface findings (refactor-level; prior market pass reported 0 scope-creep / 0 modularization)

Counts: MISSING 7, SCOPE-CREEP 2, WRONG-OWNERSHIP 2, MODULARIZATION 5. Three refactors planned in
[plans/lms-refactor-2026-06-02.md](../../plans/lms-refactor-2026-06-02.md):

- **Refactor A (cross-domain, HIGH):** dissolve LMS-CT-GDPR (180). DSAR/consent are fragmented across
  ATS (masters `data_subject_requests` 901 + `candidate_consents` 870), LMS (masters 950/951/952), and
  PRIV-MGMT (domain 20, masters none yet). Real fix = consolidate under PRIV-MGMT; ATS + LMS demote.
  Prerequisite: build PRIV-MGMT canonical. Treat as a separate cross-domain initiative; interim
  scope-creep acceptable.
- **Refactor B (trivial, LOW):** collapse `continuing_education_credits` (935) + `ceu_records` (936)
  into one (survivor 936). Verify 935 is not a distinct credit-bank rollup first.
- **Refactor C (HIGH):** collapse 6 per-regulation evidence shells (944/945/946/947/948/949) into
  typed rows of `training_evidence_records` (940) keyed by `regulation_type`. Trade-off: loses
  per-statute install-axis gating (recover via tenant "active regulations" config). Supersedes B14.
- **WRONG-OWNERSHIP (minor):** `course_resources` (930) overlaps `learning_content_assets` (909);
  move to COURSE-DELIVERY when next touched.
- **NEW MISSING (anchored):** `learning_evaluations`/`training_surveys` (Kirkpatrick L1-L3),
  `training_requests` + approvals, `external_training_records`, plus the prior-audit set
  (observation_checklists, gamification, question_banks, cmi5, gxp_training_signoffs, etc.).
- **Vindicated, keep:** `audiences`, `notification_templates`/`manager_nudges`/`escalation_rules`,
  the definition/instance pairs (`*_definitions` vs `learner_*`).

### Carried-forward open items (still valid)

- **APQC tagging (H1):** 8 of 31 cross-domain handoffs tagged (~26%). ~23 untagged; the prior
  agent_curated proposal table still applies (see 2026-05-31 section + state.yaml).
- **A4 + M8:** domain + all 8 modules have empty `catalog_tagline`/`catalog_description`.
- **M4:** `SKILLS-MGMT` capability (20) orphan on LMS (no realizing module).
- **E1:** zero personas reach any LMS module; zero `process_raci`; every lifecycle state has
  `process_id=null`. Multi-module domain with no deployable personas.
- **B10b:** inbound handoff 1121 (HRSD -> LMS, `case_categories`) has null target module + no LMS
  role; peer-domain NULL target/source module FKs owed back by HCM/GRC/SKILLS-MGMT (report-only).
- **B9c (soft):** all LMS `trigger_events` have empty `from_state`/`to_state`.
- **B3 (soft):** bare-word masters `lessons`/`instructors`/`curricula`/`audiences` lack a canonical
  claim or prefix; `domain_regulations` lists only FERPA (missing GDPR + HIPAA/OSHA/SOX given the
  compliance module); `has_single_approver=false` on every master.

### Pairwise reconciliation

Neighbors (by edge weight): HCM, GRC, IGA, SKILLS-MGMT, TALENT-MGMT, ONBOARDING, HRSD. Heaviest:
HCM + GRC + IGA. Light pass only; the cross-domain findings reduce to (a) the peer-owed B10b null
module FKs above and (b) handoff 1121's questionable HRSD->LMS `case_categories` edge. Full HCM /
GRC pairwise deferred.

### Decisions

User (2026-06-02, first pass): decide refactors first, plan them now (not execute), persist the audit.
Refactor plan written to [plans/lms-refactor-2026-06-02.md](../../plans/lms-refactor-2026-06-02.md).

User (2026-06-02, second pass): **"do B2-REFACTOR-B now, postpone other B2, do b1a."**

- **REFACTOR-B DECLINED on inspection.** Verify-before-delete found `continuing_education_credits`
  (935) is a genuine credit-value DEFINITION master ("credit hours, accrediting body, eligible
  courses"), and `ceu_records` (936) is the per-learner earned ledger. They are a definition/instance
  pair (`courses -> yields_credits_via -> 935 -> earned_in -> 936`), exactly like
  certification_definitions/learner_certifications which the market audit said to KEEP. The market
  subagent mis-flagged them as redundant without reading the descriptions. No delete performed; both
  kept and classified (935=catalog, 936=operational_workflow) via the entity_type pass.
- **Other B2 (REFACTOR-A, REFACTOR-C, and the remaining judgment calls) postponed** per the user.

### Fixes applied (2026-06-02, executed + verified)

1. **B13 entity_type — classified all 64 LMS masters** (35 operational_workflow / 9 operational_record
   / 19 catalog / 1 junction). 0 remain unclassified. Loader:
   `.tmp_deploy/lms_entity_type_2026_06_02.ts`.
2. **B12 resolved as a consequence** — every operational_workflow master has lifecycle states; every
   stateless master was classified config-shape (catalog/record/junction). No workflow master lacks
   lifecycle. The prior b1b B12-LIFECYCLE item + B2-B12-CLASSIFICATION are closed.
3. **DDO rollup regenerated** — `domain_data_objects` for domain 57 went 12 -> 77 rows (64 master +
   7 embedded_master + 6 consumer), strongest-role-wins from the module junction; 1 stale necessity
   patched (org_units -> optional). Loader: `.tmp_deploy/lms_ddo_rollup_2026_06_02.ts`.
4. **H1 APQC tags — inserted 18 agent_curated `handoff_processes` rows** (record_status default 'new').
   Cross-domain coverage 8 -> **26 of 31** (24 agent_curated + 2 discovery_override). The 5 remaining
   are SKILLS-MGMT-feed handoffs (1287, 1307, 1315) + 249 + 1233, deferred to Discover Pass 3 (no
   clean PCF match). Loader: `.tmp_deploy/lms_apqc_tags_2026_06_02.ts`.
5. **Peer-owed B10b null module FKs reported** to [audits/_validate-cross-domain.md](../_validate-cross-domain.md)
   (12 rows owed by HCM / GRC / SKILLS-MGMT; report-only, not LMS's fix).

**Correction logged:** the prior `B1A-B7-USER-EDGES` finding was false (it queried data_object 41 =
`variance_analyses`; `users` is 748). B7 passes (37 user-to-master edges). Item dropped.

UI spot-check: https://tests.semantius.app/domain_map/data_objects ,
https://tests.semantius.app/domain_map/handoff_processes ,
https://tests.semantius.app/domain_map/domain_data_objects

## 2026-06-06 - b1a execution

Executed the two agent-solvable b1a items against the live `domain_map` master module
(domain 57, LMS). Loader: `.tmp_deploy/lms_b1a_2026-06-06.ts` (idempotent, read-before-create).

### B1A-SELF-CONTAIN (M9 part 1) - DONE

Flipped the 3 enumerated consumer+required cross-domain DMDO rows to `necessity=optional`
(presence-conditional fix per Rule #16 / M9; the consuming module degrades gracefully without
the external master). Table `domain_module_data_objects`, 3 PATCH rows.

| module | data_object_id | entity | prior | new |
|---|---|---|---|---|
| 33 LMS-COMPLIANCE-TRAINING | 18 | onboarding_tasks (mastered by ONBOARDING) | role=consumer, necessity=required | role=consumer, necessity=**optional** |
| 34 LMS-PATHS | 175 | performance_goals (mastered by TALENT-MGMT) | role=consumer, necessity=required | role=consumer, necessity=**optional** |
| 34 LMS-PATHS | 26 | skills_gap_analyses (mastered by SWP) | role=consumer, necessity=required | role=consumer, necessity=**optional** |

Scope note: `policy_attestations` (286, consumer+required on module 33) was NOT touched - it is
in b1b (B1B-M9-SELF-CONTAINMENT, gated on user_decision B2-M9-DECISION), not in the b1a
`extra_m9_shapes` list. Left as a user-gated item.

### B1A-PHASE-P (Phase E personas + RACI) - DONE

Authored the LMS persona / RACI layer (function-anchored per roles.md sec 7; ATS pilot was the
reference). All personas `record_status='new'` (DB default, Rule #1). No `_core` RBAC tables
written; the permission bundle is derived, not stored.

**`domain_roles` - 5 new personas** (1 existing persona reused by accretion, not recreated):

| id | role_code | role_name | business_function |
|---|---|---|---|
| 22 | LD-LEARNING-ADMIN | Learning Administrator | 11 Learning and Development |
| 23 | LD-INSTRUCTIONAL-DESIGNER | Instructional Designer | 11 Learning and Development |
| 24 | LD-INSTRUCTOR | Instructor | 11 Learning and Development |
| 25 | GRC-COMPLIANCE-TRAINING-MANAGER | Compliance Training Manager | 31 Governance, Risk and Compliance |
| 26 | PEOPLE-MANAGER | People Manager | NULL (cross-functional) |
| 11 | LEGAL-COMPLIANCE-SPECIALIST | Compliance Specialist | 7 Legal (REUSED - existing ATS persona, reach extended) |

**`role_modules` - 27 reach rows** (25 new + the 2 on the reused persona 11). Every persona meets
the 2-module floor: 22 -> 7 modules, 23 -> 4, 24 -> 3, 25 -> 5, 26 -> 4, 11 -> 2 (modules 180
primary, 33 secondary - covers learner-data-privacy DSAR handling).

**`data_object_lifecycle_states.process_id` - 16 gates wired** (all were `process_id=null`; PATCH
sets the process-to-permission edge):

| process_id | APQC process | wired gates (data_object.state) |
|---|---|---|
| 1039 | Develop, conduct, and manage employee training programs | courses.published, course_enrollments.completed |
| 899 | Evaluate training effectiveness | course_assessments.published, assessment_attempts.graded |
| 1037 | Align learning programs with competencies and skills | learning_paths.published, learning_path_assignments.completed |
| 1032 | Develop employee career plans and career paths | learning_plans.active |
| 1829 | Train employees on appropriate regulatory requirements | compliance_assignments.completed, compliance_training_campaigns.scheduled, training_evidence_records.submitted, regulator_filing_exports.filed |
| 895 | Manage training schedule | course_offerings.open_for_enrollment, course_sessions.completed |
| 1040 | Manage examinations and certifications | learner_certifications.issued, ceu_records.filed, certification_definitions.published |

**`process_raci` - 21 new rows** across the 7 wired processes. Each gated process carries >=1
Responsible and >=1 Accountable (E4):

- 1039: R=Instructional Designer, A=Learning Admin, C=Instructor, I=People Manager
- 899: R=Instructional Designer, A=Learning Admin, C=Instructor
- 1037: R=Learning Admin, A=People Manager, C=Instructional Designer
- 1032: R=People Manager, A=Learning Admin
- 1829: R=Compliance Training Manager, A=Compliance Training Manager, C=People Manager, I=Legal-Compliance Specialist
- 895: R=Instructor, A=Learning Admin
- 1040: R=Learning Admin, A=Compliance Training Manager, C=Instructor

### Verification

Re-queried post-write: M9 rows now consumer/optional (3/3); role_modules 27 rows reaching LMS
modules; lifecycle states 16 with process_id set; process_raci 21 rows. E1 now passes (6 personas
reach the 8-module domain where 0 existed). E2 2-module floor holds for every persona.

UI spot-check: https://tests.semantius.app/domain_map/domain_roles ,
https://tests.semantius.app/domain_map/role_modules ,
https://tests.semantius.app/domain_map/process_raci ,
https://tests.semantius.app/domain_map/domain_module_data_objects

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

## 2026-06-07 - a-LMS.md processing

User answered the 2026-06-06 `q-LMS.md` (renamed to `a-LMS.md`). Processed per Rule #22.
Loader: `.tmp_deploy/lms_a_processing_2026-06-07.ts` (idempotent, read-before-write).

### Decisions executed

1. **a3 -> B2-M9-DECISION = "a" (DONE + verified).** Flipped the last remaining M9 consumer+required
   cross-domain row, `policy_attestations` (DMDO id 295, module 33 LMS-COMPLIANCE-TRAINING, payload
   mastered by GRC), to `necessity=optional`. The other 3 (onboarding_tasks 294, performance_goals
   297, skills_gap_analyses 296) were already flipped in the 2026-06-06 b1a pass. All 4 cross-domain
   consumer rows are now `consumer + optional`; **M9 part 1 is clean**. The a-file is the user
   approval. Resolves B2-M9-DECISION + B1B-M9-SELF-CONTAINMENT.

2. **a5 -> B2-CATALOG-COPY (DONE + verified).** The user pushed back ("why do you ask? I expected
   this was already done"). They were right: the q-file's "draft, surface, write only on approval"
   framing predates the current Rule #20/#21, under which **empty catalog UX fields are written
   without a pre-write gate** (record_status=new carries the review signal; the user reviews in-record).
   Confirmed all 9 rows empty live, then authored + wrote buyer-voice `catalog_tagline` +
   `catalog_description` on domain 57 + all 8 modules (32/33/34/178/179/180/181/182). Empty-guard per
   field (no overwrite). **A4 + M8 now pass.** Resolves B2-CATALOG-COPY + B1B-A4-M8-CATALOG-COPY.

3. **a6 -> B2-PERSONAS (already DONE; conceptual question answered).** The personas were authored in
   the 2026-06-06 b1a pass and verified live this pass: 6 personas (LD-LEARNING-ADMIN,
   LD-INSTRUCTIONAL-DESIGNER, LD-INSTRUCTOR, GRC-COMPLIANCE-TRAINING-MANAGER, PEOPLE-MANAGER, +
   reused LEGAL-COMPLIANCE-SPECIALIST) reach the 8 modules; 21 `process_raci` rows across the 7 gated
   processes; E1/E4 pass. The user's "what are personas?" is conceptual, answered in chat (operational
   job-shaped roles spanning >=2 modules; the permission bundle + RACI are derived from reach +
   responsibility, not stored). Resolves B2-PERSONAS + B1B-E1-PERSONAS (stale leftovers cleaned).

4. **a10 -> b3 ideas (user-approved, GATED).** User said "yes" to researching the 4 b3 candidates
   (learning_evaluations/surveys, training_requests, external_training_records, gamification). Recorded
   `user_approved: true` on each b3 item. Best done additively AFTER the module-shape decision (q1 /
   Refactor C) settles; b3 never auto-executes and never blocks "finished".

### Questions answered + carried forward (folded into the regenerated q-LMS.md)

Each `a#` below was a question/request, not a decision, so the item stays open (Rule #22). Answers
folded into the b2 entries (`agent_answer`) and the new q-file.

- **a1 -> B2-REFACTOR-C** ("would one table be sufficient and not bloated? optional entities?").
  Grounded in live descriptions: 944 HIPAA / 945 OSHA / 946 SOX / 947 FERPA / 949 BSA-AML are
  near-identical "training documentation row" shapes (collapse-friendly, NOT bloat); only 948
  fda_part11_audit_trails is structurally different (tamper-evident, retention-locked audit trail).
  New recommended option (b): collapse the 5, keep 948 separate. "Optional entities" = option (c).
- **a2 -> B2-REFACTOR-A** ("how do other vendors handle it? embedded master?"). Vendor norm: LMS
  rarely masters privacy; it is a consumer of HR/identity-suite or central-privacy-tool machinery.
  `embedded_master` is the right target shape (local shell for standalone erasure, defers to a
  canonical PRIV-MGMT master when present) but PRIV-MGMT (domain 20) masters nothing today, so it
  must be built first -> still defer (recommended a). Added option (b) = build PRIV-MGMT + demote.
- **a4 -> B2-SKILLS-MGMT-ATTRIBUTION** ("explain both"). (a) delete the orphan link (clean; SKILLS-MGMT
  owns it); (b) realize capability 20 in LMS-PATHS after skill_targets ships (couples to q8). Both
  explained in the q-file.
- **a7 -> B2-1121-ROUTING** ("explain the options"). (a) COMPLIANCE-TRAINING = compliance-tag
  inheritance; (b) PATHS = learning-path assignment; (c) retire (mis-modeled). Explained in q-file.
- **a8 -> B2-MISSING-ROUTING** ("what are the 19? by area vs by module?"). Confirmed "by area" == "by
  module"; listed all 19 grouped by target module in the q-file.
- **a9 -> B2-DOMAIN-REGULATIONS** ("why separate from q2?"). q2 = structural ownership of privacy
  records (expensive, deferred); q9 = cheap additive scope metadata (which statutes the market
  touches), true regardless of where records live. Can be answered yes today without waiting on q2.

### State

`b1a: []`. b1b reduced to 4 (B14-NECESSITY, M4-SKILLS-MGMT, MISSING-ENTITIES, B10b-INBOUND-1121),
each gated on an open b2. b2 reduced to 6 open (Refactor C, Refactor A, skills-mgmt, 1121, missing,
domain-regs). `status: feedback_needed`, `next_action_by: user`. Regenerated `q-LMS.md`; deleted
`a-LMS.md`. UI spot-check: https://tests.semantius.app/domain_map/domain_modules ,
https://tests.semantius.app/domain_map/domains ,
https://tests.semantius.app/domain_map/domain_module_data_objects

## 2026-06-10 — Review (B9d handoff-payload realization)

Triggered by "review LMS domain". Continued from the existing worklist: the only agent-doable
item open was `B1A-B9D-VERIFY` (B9d had never run on this domain). All other open items are
user-gated decisions sitting in `q-LMS.md`.

### B9d run (scripts/analytics/b9d_resolver.ts LMS, both directions)

28 boundary handoff tags; 14 distinct (process, owner) findings. Verdicts: **7 RESOLVED, 3 ORPHAN,
4 MIS-TAG**.

**RESOLVED (7)** — no action: 7.7.2 compliance_assignments (LMS→HRSD), 7.7.3 employees (HCM→LMS,
inbound), 7.3.4.3 learner_badges (LMS→TALENT-MGMT), 7.3.4.5 case_categories (HRSD→LMS, inbound) +
course_enrollments/completions (LMS→TALENT-MGMT/HCM) + onboarding_cohorts (ONBOARDING→LMS, inbound),
2.1.3.5.1 policy_attestations (GRC→LMS, inbound, no-master).

**ORPHAN (3)** — real missing work (process with no persona). Routed additively, `record_status`
untouched, via the resolver's `--write`:
- `B2-B9D-OWN-1041` 7.3.4.7 "Monitor and evaluate learning programs" (learning_records, handoff 431
  LMS→HCM). Owner = **LMS** (built). Resolver auto-text named no persona ("a named owner" /
  "HR Business Partner" placeholders); corrected from live RACI — the nearest realized LMS sibling
  7.3.4.5 (pid 1039) is Instructional Designer (R) + Learning Administrator (A), so q7 mirrors that
  pairing. Surfaced as q-LMS.md **q7**.
- `B2-B9D-OWN-224` 7.3.1 "Manage employee onboarding" (onboarding_tasks, handoff 8 ONBOARDING→LMS).
  Owner = **ONBOARDING** (unbuilt) → written to `audits/ONBOARDING/` backlog (state.yaml + q9).
- `B2-B9D-OWN-1873` 3.5.5.1.2 "Manage certifications and skills" (skill_profiles, handoff 111
  LMS→TALENT-MGMT). Owner = **SKILLS-MGMT** (unbuilt) → written to `audits/SKILLS-MGMT/` backlog
  (state.yaml + q8).

**MIS-TAG (4)** — wrong/unrealized APQC codes on LMS-source handoffs. Destructive sender edits
(re-point or delete a `handoff_processes` row) → NOT applied; surfaced for sign-off. All 16 affected
rows are `agent_curated` + `record_status='new'`. Re-point targets verified realized:
- 9.8.2 → 2.1.3.5.1 on #1312 (training_evidence_records).
- 11.2.2 → 2.1.3.5.1 on the 7 compliance_assignments handoffs #434,#435,#1047,#1049,#1308,#1309,#1310.
- 7.3.3.3 → 7.3.4.5 on #1079,#1288 (course_enrollments/completions).
- 3.5.5.1.2 → 7.3.4.6 on #1080,#1295,#1303,#1304,#1305 (learner_badges/certifications).
Grouped into `B2-B9D-MISTAG-REPOINT` (the 16 clean re-points, q8). **Split out:** the 2 privacy
handoffs originally lumped under 11.2.2 — #1313 (gdpr_consent_records, gdpr_consent_record.withdrawn,
LMS→HCM) and #1314 (data_deletion_requests, data_deletion_request.fulfilled, LMS→HCM) — are NOT
training and must not be re-pointed to 2.1.3.5.1; their correct process home depends on the q2 privacy
ownership decision. Surfaced separately as `B2-B9D-MISTAG-PRIVACY` (q9, blocked_by B2-REFACTOR-A).

### State

`B1A-B9D-VERIFY` resolved → `b1a: []` (no agent-doable work left; everything remaining is user-gated).
Added 3 new b2 items (B2-B9D-OWN-1041, B2-B9D-MISTAG-REPOINT, B2-B9D-MISTAG-PRIVACY); b2 now 9 open.
b1b unchanged (4, each gated on an open b2). Rewrote `q-LMS.md` with clean numbering: q1–q6 unchanged,
q7/q8/q9 added from the B9d findings, the b3 candidate set renumbered to optional q10. `status:
feedback_needed`, `next_action_by: user`. No catalog writes, no `record_status` changes (Rule #1).

## 2026-06-10 — a-LMS.md processing (2 of 9 answered)

User answered q7 and q8 of the B9d round; q1–q6, q9 (privacy), q10 (optional) left blank → still open.

- **q7 = a (B2-B9D-OWN-1041), additive, EXECUTED.** Authored `process_raci` on process 1041
  "Monitor and evaluate learning programs": R = Instructional Designer (role 23), A = Learning
  Administrator (role 22) — rows 145, 146, label auto-generated. Mirrors the realized sibling 7.3.4.5.
  No `record_status` column on `process_raci`, so Rule #1 is moot here.
  **Residual:** re-running B9d still lists 1041 as ORPHAN. Cause: the strict "realized = gated
  lifecycle state + RACI" test fails because 1041 has no `data_object_lifecycle_states.process_id`
  gate. "Monitor and evaluate learning programs" is a monitoring/analytical activity, not a
  permissioned state transition, so it legitimately carries RACI (responsibility) without a gate.
  Accepted as non-gated; the persona the question asked for is assigned. If we later want the resolver
  fully green, wire `process_id=1041` onto a learning_records lifecycle state (a modeling call, not in
  q7's scope). Decision executed → moved out of open state.

- **q8 = a (B2-B9D-MISTAG-REPOINT), destructive structural — a-file is the sign-off, EXECUTED.**
  Re-pointed 15 `handoff_processes` rows (NOT 16 — the round's q8 headline said "sixteen" but the
  enumerated breakdown was 8+2+5=15; the count was an arithmetic slip, the row set was always the 15
  enumerated). All stayed `record_status='new'` (PATCH of `process_id` only):
    - 9.8.2 (325) → 2.1.3.5.1 (1829): handoff 1312 (training_evidence_records).
    - 11.2.2 (369) → 2.1.3.5.1 (1829): handoffs 434, 435, 1047, 1049, 1308, 1309, 1310 (compliance_assignments).
    - 7.3.3.3 (1033) → 7.3.4.5 (1039): handoffs 1079, 1288 (course_enrollments/completions).
    - 3.5.5.1.2 (1873) → 7.3.4.6 (1040): handoffs 1080, 1295, 1303, 1304, 1305 (learner_badges/certifications).
  Post-fix B9d verdicts: was {ORPHAN:3, MIS-TAG:4, RESOLVED:7} → now {ORPHAN:4, RESOLVED:9}. The 4
  MIS-TAGs cleared; the privacy subset (1313, 1314, still at 11.2.2) re-classified from part-of-a-MIS-TAG
  to a standalone ORPHAN owned by LMS — same 2 rows, still deferred under the privacy question.

- **q9 (B2-B9D-MISTAG-PRIVACY) NOT answered** → stays open, gated on q2. Renumbered to q7 in the
  regenerated q-file. The 2 privacy tags (1313 gdpr_consent_record.withdrawn, 1314
  data_deletion_request.fulfilled, both LMS→HCM) remain at 11.2.2 untouched.

### State

Removed B2-B9D-OWN-1041 + B2-B9D-MISTAG-REPOINT from b2 (both resolved → history). b2 now 7 open
(Refactor C, Refactor A, skills-mgmt, 1121, missing, domain-regs, privacy mis-tags). b1b unchanged (4).
b3 unchanged (4). Deleted `a-LMS.md`; regenerated `q-LMS.md` (q1–q6 unchanged, q7 = privacy mis-tags,
optional q8 = b3). `status: feedback_needed`, `next_action_by: user`. Catalog writes this pass: 2
`process_raci` inserts + 15 `handoff_processes` re-points; no `record_status` changed.
