---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 5
---

# LMS, Audit History

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
