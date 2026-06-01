# ATS audit history

## 2026-05-28 — Audit

### Summary

- Current footprint: 47 entities across 9 modules (8 full + 1 starter `HIRING-STARTER`); 7 capabilities; 10 solutions; 9 regulations; 26 trigger events; 38 outbound handoffs + 38 inbound handoffs; 5 roles + 26 role_modules + 34 role_permissions; 9 system skills + ~70 skill_tools links.
- Market surface (subagent): 62 entities suggested.
- Flagship vendors enumerated: Greenhouse, Lever, Ashby, SmartRecruiters, iCIMS, Checkr (Checkr anchors FCRA-regulated background-check leg).
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

Structural pass: A, M, C, E (mostly), F pass; B has partial gaps. M7 passes (no within-domain ownership conflicts). B10b passes (zero NULL module FKs on handoffs touching ATS). E5 surfaces a drift on `HIRING-MANAGER` (Path A != Path B).

Domain Semantius score (strict, across all 9 modules): 62/66 = **94%**. Non-platform tools driving the 4-tool gap: `parse_resume` + `match_candidate_to_jobs` (compute/external, optional on `ats-candidate-crm-system`); `sign_document` (external, required on `ats-offers-system`); `notify_team` (external, optional on `hiring_starter_agent` — cross-catalog anomaly: its sibling `notify_person` is `platform`).

### Vendor surface basis

Pure-play ATS specialists chosen over diversified HCM suites: Greenhouse (Harvest API as reference schema), Lever (CRM-first), Ashby (modern entrant with rich schema), SmartRecruiters (enterprise hiring teams + marketplace), iCIMS (OFCCP/EEOC/FCRA-heavy enterprise), Checkr (FCRA background-check specialist, regulation-mandated). All six are pure-plays; five cover the full lifecycle, Checkr anchors the regulated leg.

### Bucket 1 — In-scope confirmed gaps

#### MISSING (compliance-mandated entities — non-optional regardless of vendor coverage)

| ID | Entity | Proposed module | Regulation | Notes |
|---|---|---|---|---|
| B1-M1 | `pre_adverse_action_notices` | ATS-BACKGROUND-CHECKS | FCRA | FCRA requires a distinct pre-adverse notice + waiting period BEFORE the final notice. Current model conflates the two into `adverse_action_notices` only. |
| B1-M2 | `applicant_flow_records` | ATS-RECRUITMENT-PIPELINE | OFCCP | Federal contractors must log every applicant per Internet Applicant Rule with disposition reason. `eeo_responses` does not cover this. |
| B1-M3 | `application_dispositions` | ATS-RECRUITMENT-PIPELINE | OFCCP | Typed reason-for-non-selection codes; required for OFCCP reporting. `application_stage_transitions` carries the transition but not typed reason. |
| B1-M4 | `data_subject_requests` | ATS-CANDIDATE-CRM | GDPR | Articles 15-22 erasure/access/rectification tracking. Surfaced by Lever, SmartRecruiters, iCIMS. |
| B1-M5 | `fcra_summary_of_rights_acknowledgements` | ATS-BACKGROUND-CHECKS | FCRA | Candidate acknowledgement of FCRA Summary of Rights at consent time. |
| B1-M6 | `voluntary_self_identifications` | ATS-RECRUITMENT-PIPELINE | EEOC | Distinct from `eeo_responses` (the response is voluntary; this is the self-id form/audit trail). |
| B1-M7 | `ofccp_audit_trails` | ATS-RECRUITMENT-PIPELINE | OFCCP | Federal-contractor audit log on every applicant action. |

#### MISSING (universal-vendor entities, non-regulatory)

| ID | Entity | Proposed module | Notes |
|---|---|---|---|
| B1-U1 | `hiring_team_assignments` | ATS-RECRUITMENT-PIPELINE | Per-requisition role-scoped staffing (recruiter, hiring manager, coordinator, interviewer). 5/5 vendors. Cannot be expressed via global RBAC. |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | B7 | Seven masters with user-typed actors lack explicit `→ users` edges in `data_object_relationships`: `candidates` (owning_recruiter), `job_postings` (publisher), `talent_pools` (pool_owner), `candidate_assessments` (invitation_author), `background_checks` (requester), `recruitment_agencies` (relationship_owner), `recruitment_events` (event_coordinator). | Author 7 edges per Rule #10; bundle into a focused loader. |
| B1-S2 | E5 | `HIRING-MANAGER` (10007) has `role_permissions` reaching modules 35 (ONB-JOURNEY-MGMT) and 37 (ONB-WELCOME-EXPERIENCE) via `:read`, but `role_modules` lists only ATS modules 1/4/5/6. Path A != Path B. | Add 2 `role_modules` rows: `HIRING-MANAGER × ONB-JOURNEY-MGMT (secondary)` and `HIRING-MANAGER × ONB-WELCOME-EXPERIENCE (secondary)`. |
| B1-S3 | A2/regulations | FCRA (Fair Credit Reporting Act) regulation is not present in `regulations` at all, despite ATS-BACKGROUND-CHECKS being FCRA-driven (carrying `fcra_disclosures`, `adverse_action_notices`, `background_check_disputes`). OFCCP is similarly absent. | Add 2 `regulations` rows + 2 `domain_regulations` links (mandatory). |
| B1-S4 | F (naming convention) | 8 of 9 ATS system skills use kebab `ats-<module>-system`, the convention per Phase-S is snake `<module_code_lower>_agent`. Only `hiring_starter_agent` follows the convention. | Rename `skills` rows 127-134 (`ats_candidate_crm_agent`, `ats_talent_pools_agent`, …). Pure relabel; skill_tools FKs unaffected. |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | `data_object_relationships` row 833: `candidate_assessments (10) → risk_assessments (291)` "informs" — stale. risk_assessments is GRC/security; no workflow tie to ATS assessments. Likely surviving from a duplicate trigger-event era. | DELETE the relationship row. |

#### B9 trigger-event coverage (review per event; some are leaves)

| ID | Trigger event | Proposed subscriber direction |
|---|---|---|
| B1-T1 | `interview.scheduled` (370) | Calendar/CCAAS subscribers; video-interview platforms. |
| B1-T2 | `interview_scorecard.submitted` (372) | PA dashboards; hiring-manager visibility. |
| B1-T3 | `job_application.rejected` (364) | Talent-pool re-eligibility; rejection-comms motion. |
| B1-T4 | `job_posting.published` (360) | Sourcing channel attribution; MA campaign trigger. |
| B1-T5 | `recruitment_agency.engaged` (376) | S2P fee-tracking; CLM contract attach. |
| B1-T6 | `recruitment_event.held` (377) | Talent-pool ingestion; cost-ledger update. |
| B1-T7 | `talent_pool.candidate_added` (368) | Recruiter outreach pickup; MA nurture seed. |

`background_check.initiated` (373) and `job_posting.closed` (361) are plausibly leaves (analytics finalize); flag for review but acceptable as leaves.

### Bucket 2 — Surface-for-user (judgment calls)

1. **FERPA scoping.** `domain_regulations` lists FERPA (Family Educational Rights and Privacy Act) as mandatory on ATS. FERPA governs student educational records; it applies to ATS only in K-12 / higher-ed recruiting contexts. **Is this intentional sector coverage, or scope creep from an earlier load?** Options: (a) keep — confirms ATS scope includes ed-sector recruiting, (b) remove — FERPA scope-creep, replace with EEO-Tax Credit / SOX if applicable. Independent of Bucket 3.
2. **SCOPE-CREEP in ATS-OFFERS** (3 entities sitting in ATS but with stronger ownership claims elsewhere):
   - `compensation_benchmarks` (192/3?) — currently `consumer + required`. Likely belongs in COMP-MGMT. Decide: keep dangling consumer link (then verify COMP-MGMT masters it) or remove.
   - `salary_bands` (154) — `embedded_master + optional`. Canonical owner = COMP-MGMT or HCM. Keep, demote, or move.
   - `equity_grants` (158) — `embedded_master + optional`. Canonical owner = equity-management. Keep, demote, or fold as field on `offer_versions`.
3. **B12 permission verb overrides.** Two workflow gates have empty `permission_verb_override` and auto-derive awkward verbs:
   - `interview_scorecards.submitted` (state 210) → derives `submit_interview_scorecards`. Intended? Or `submit_scorecard`?
   - `background_checks.completed_consider` (state 191) → derives `consider_background_checks`. Intended? Or `adjudicate_background_check`?
4. **Modularization recommendations (defer/accept):**
   - Rename `ATS-BACKGROUND-CHECKS` → `ATS-PRE-EMPLOYMENT-SCREENING` to also absorb drug screens, MVR, reference checks?
   - Split off `ATS-COMPLIANCE-REPORTING` (would host EEO/OFCCP entities) if Bucket 1 compliance MISSING items push past ~6 entities?
5. **Cross-catalog: `notify_team` coverage_tier.** `notify_team` (id 914) has `coverage_tier='external'` while its sibling `notify_person` (id 913) is `platform`. Both are the abstraction layer for substitutable channels. Is this intentional (does the platform genuinely ship single-recipient outbound but not broadcast?), or catalog inconsistency? Not ATS-specific; surfaces here because `hiring_starter_agent` links the external one and pulls its score from 100% to 94%.
6. **Pairwise reconciliation scope.** ATS has 10 neighbors via handoffs: **HCM (heavy, ~30+ rows)**, **COMP-MGMT (weight 5)**, **SWP (4)**, **ONBOARDING (3)**, **BEN-ADMIN (3)**, **PAYROLL (2)**, **PA (2)**, **TALENT-MGMT (1)**, **HRSD (1)**, **PSA (1)**. Audit procedure says deep dive for weight ≥3. Decide: run pairwise reconciliation now for ATS↔HCM / ATS↔COMP-MGMT / ATS↔SWP / ATS↔ONBOARDING / ATS↔BEN-ADMIN inline, or defer per-neighbor passes as separate Validate runs.

### Bucket 3 — Phase 0 pending (speculative; vendor-research vetting needed)

Universal-or-near-universal vendor entities surfaced by the market subagent. Phase 0 vetting (formal vendor-research protocol) would confirm or filter:

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `candidate_documents` | ATS-CANDIDATE-CRM | Universal (Greenhouse, Lever, Ashby, SmartRecruiters, iCIMS) |
| `candidate_resumes` | ATS-CANDIDATE-CRM | Universal; usually distinct from `candidate_documents` |
| `candidate_notes` | ATS-CANDIDATE-CRM | Universal; recruiter free-text on candidate |
| `candidate_tags` | ATS-TALENT-POOLS | Universal; labeling axis |
| `candidate_email_threads` | ATS-CANDIDATE-CRM | Lever, Greenhouse (inbox-sync) |
| `video_interview_sessions` | ATS-INTERVIEWS | Specialist; not in every flagship (HireVue, Spark Hire integrations) |
| `offer_letter_templates` | ATS-OFFERS | Common (4/5 vendors) |
| `application_archive_reasons` | ATS-RECRUITMENT-PIPELINE | Config table; vendor-shape varies |

### Bucket dependencies

- Buckets 2 and 3 are mostly independent; user can resolve in any order.
- **Dependency:** Bucket 2 item 4 (modularization) becomes load-bearing if Bucket 1 compliance MISSING items grow past ~6 — if user wants OFCCP/EEO entities, decide first whether they land in ATS-RECRUITMENT-PIPELINE or in a new ATS-COMPLIANCE-REPORTING module.

### Decisions

- **Bucket 1:** approved `all` — 14 items applied (E5 turned out to be a false positive; HIRING-MANAGER already has `role_modules` rows for ONB-JOURNEY-MGMT and ONB-WELCOME-EXPERIENCE — the earlier audit query was scoped to ATS module IDs only and missed them).
- **Bucket 2:**
  1. FERPA removed (not intentional sector coverage).
  2. SCOPE-CREEP in ATS-OFFERS — all three removed (`compensation_benchmarks`, `salary_bands`, `equity_grants` DMDOs deleted; legacy `salary_bands` rollup row also cleaned).
  3. B12 verb overrides — both fixed (`submit_scorecard`, `adjudicate_background_check`).
  4. Modularization — declined; keep current 8-full-module shape.
  5. `notify_team` coverage_tier — accepted as-is.
  6. Pairwise reconciliation — run now (HCM, COMP-MGMT, SWP, ONBOARDING, BEN-ADMIN).
- **Bucket 3:** pending user choice (vetted Phase 0 vs eyeball).

### Fixes applied

Loader: [.tmp_deploy/fix_ats_audit_2026_05_28.ts](../.tmp_deploy/fix_ats_audit_2026_05_28.ts).

| Phase | Action | Row counts |
|---|---|---|
| 1 | INSERT `regulations` | 2 (FCRA id 84, OFCCP id 85) |
| 2 | INSERT `data_objects` | 8 (pre_adverse_action_notices, applicant_flow_records, application_dispositions, data_subject_requests, fcra_summary_of_rights_acknowledgements, voluntary_self_identifications, ofccp_audit_trails, hiring_team_assignments) |
| 3 | INSERT `domain_module_data_objects` | 8 master rows across modules 1 / 4 / 7 |
| 4 | INSERT `domain_regulations` | 2 (ATS×FCRA, ATS×OFCCP, mandatory) |
| 5 | INSERT `data_object_relationships` (new-entity wiring) | 10 |
| 6 | INSERT `data_object_relationships` (B7 user-edges) | 7 |
| 7 | E5 — no-op (rows already present; my earlier audit query missed them) | 0 |
| 8 | PATCH lifecycle states 210 + 191 verb overrides | 2 |
| 9 | PATCH skill names (kebab+system → snake+agent) on skill ids 127-134 | 8 |
| 10 | DELETE stale `data_object_relationships` row 833 | 1 |
| 11 | DELETE SCOPE-CREEP DMDOs (23, 983, 517) + legacy rollup row 271 | 4 |
| 12 | DELETE `domain_regulations` row 174 (FERPA on ATS) | 1 |
| 13 | INSERT `handoffs` (B9 trigger fan-out, 5 confident) | 5 |

**B9 fan-out deferred (2 events, need target-domain clarity):**
- `interview.scheduled` (370) — calendar / video-interview platform; depends whether the platform is modeled as CCAAS, an external solution, or out-of-scope.
- `recruitment_agency.engaged` (376) — S2P fee-tracking and CLM contract attach; verify both target domains exist before loading.

UI spot-checks:
- https://tests.semantius.app/domain_map/data_objects (8 new rows, `record_status=new`)
- https://tests.semantius.app/domain_map/domain_module_data_objects (new master rows)
- https://tests.semantius.app/domain_map/domain_regulations (FCRA + OFCCP added; FERPA removed)
- https://tests.semantius.app/domain_map/handoffs (5 new B9 rows)

### Pairwise handoff reconciliation (passes 3 + 4)

Read-only, run via subagent. Full artifacts: [c:/tmp/ATS-pairwise-recon-2026-05-28.md](c:/tmp/ATS-pairwise-recon-2026-05-28.md), [.json](c:/tmp/ATS-pairwise-recon-2026-05-28.json).

| Pair | null_fk | missing_handoffs | boundary | missing_rels | orphan_rels | Verdict |
|---|---|---|---|---|---|---|
| ATS ↔ HCM | 0 | 1 candidate | 0 | 1 | 0 | One real gap + one candidate. |
| ATS ↔ COMP-MGMT | 0 | 1 candidate | 0 | 0 | 0 | Candidate now defunct (see below). |
| ATS ↔ SWP | 0 | 0 | 0 | 0 | 0 | Clean. |
| ATS ↔ ONBOARDING | 0 | 0 | 0 | 0 | 0 | Clean. |
| ATS ↔ BEN-ADMIN | 0 | 0 | 0 | 0 | 0 | Clean. |

**Findings (in-scope for ATS audit):** none — every gap is owed by the other side.

**Report-only follow-ups:**

- **HCM B8 owes:** `data_object_relationships` row `employees → job_requisitions` (verb `triggers` or `spawns`, owner_side=source, is_required=false) — the structural mirror of handoff 20 (`employee.terminated` → ATS re-open requisition). Surfaces when HCM is next validated.
- **HCM B9 candidate (user confirmation needed):** `job_offer.rescinded` → `HCM-LIFECYCLE-WORKFLOWS` on `employment_contracts`. The rescind already fires to ONB, BEN, COMP but not HCM, even though `job_offer.accepted` does. If HCM authors the contract pre-rescind, the cancel feed is owed.
- **COMP-MGMT B9 candidate now voided:** the subagent proposed `equity_grant.approved → ATS-OFFERS` on `equity_grants`, but ATS-OFFERS no longer holds `equity_grants` after Bucket 2 #2. Drop from the follow-up list.

### `domains.notes` pointer (if updated)

_not yet written; will require user-approved wording per Rule #15_

## 2026-05-30 — Continuation: deferred-item decisions

### B9 fan-out (deferred)

The two deferred B9 fan-out events from the 2026-05-28 load are deferred to a later audit pass, recorded here so they surface when CCAAS / video-platform / S2P / CLM are next reviewed:

| Trigger event id | Trigger event | Open question | Defer reason |
|---|---|---|---|
| 370 | `interview.scheduled` | Subscriber: CCAAS modules vs out-of-catalog video platforms (HireVue, Spark Hire, Zoom)? | Target-domain ambiguity. The right subscriber depends on whether the video-interview platform is modeled as a sub-module of CCAAS, an external integration solution only, or genuinely out of scope. Decision belongs to the CCAAS audit pass. |
| 376 | `recruitment_agency.engaged` | Subscriber: S2P (fee-tracking) and / or CLM (contract attach)? | Both target domains exist in the catalog, but the fan-out shape (one or both, with what payload) needs to be drafted against the S2P + CLM module footprints. Decision belongs to whichever of those two domains is next validated. |

No `handoffs` rows added in this pass; both events remain published-with-no-subscriber. Re-surface on the next CCAAS / S2P / CLM Validate run.

### HCM B9 rescind candidate (declined)

The pairwise reconciliation surfaced a candidate handoff `job_offer.rescinded → HCM-LIFECYCLE-WORKFLOWS` on `employment_contracts`, parallel to the existing ONB / BEN / COMP fan-out. User decision: **No, do not author.** HCM only sees the employee on `offer.accepted` proper; the rescind has nothing to roll back from HCM's side. The HCM B9 follow-up entry in the 2026-05-28 pairwise section is now considered resolved (declined, not pending).

### Bucket 3 — Phase 0 vendor research outcome

The 8 candidates were vetted against the five flagship vendor surfaces (Greenhouse, Lever, Ashby, SmartRecruiters, iCIMS). Full report at [c:/tmp/ATS-phase0-2026-05-30.md](c:/tmp/ATS-phase0-2026-05-30.md). Verdict counts: **LOAD x4 + LOAD-with-scope-question x1 + MERGE x2 + DEFER x1 + SKIP x0**. After user decisions on the four scope questions, the load shape resolved to **5 new entities + 2 MERGE actions** (the LOAD-with-scope-question candidate `candidate_email_threads` was downgraded to SKIP).

#### Verdict + user decision per candidate

| # | Candidate | Phase 0 verdict | User decision | Resolution |
|---|---|---|---|---|
| 1 | `candidate_documents` | LOAD (5/5 vendors) | LOAD | New master in ATS-CANDIDATE-CRM, `document_type` enum subsumes `candidate_resumes`. |
| 2 | `candidate_resumes` | MERGE into `candidate_documents` | MERGE | No new entity; resume is one enum value on `candidate_documents.document_type`. |
| 3 | `candidate_notes` | LOAD (5/5 vendors) | LOAD | New master in ATS-CANDIDATE-CRM, distinct from `candidate_engagements` (touchpoint-level). |
| 4 | `candidate_tags` | LOAD (5/5 vendors) | LOAD | New master in ATS-TALENT-POOLS, free-form labeling axis distinct from talent pools. |
| 5 | `candidate_email_threads` | LOAD-with-scope-question | SKIP | User chose to skip the thread entity; conversations stay implicit. Engagements remain the only email-related entity. |
| 6 | `video_interview_sessions` | DEFER (0/5 first-class) | DEFER | Revisit if HireVue / Spark Hire / Willo enter scope as solutions. |
| 7 | `offer_letter_templates` | LOAD (4/5 strong, 5/5 broad) | LOAD | New master in ATS-OFFERS; closes the dangling `template_id` FK on `offer_letter_documents`. |
| 8 | `application_archive_reasons` | MERGE into `application_dispositions` (id 900) | MERGE | No new entity; 3 alias rows on entity 900 (`Archive Reason`, `Rejection Reason`, `Disposition Reason`). |

Plus one structurally-implied addition surfaced during the scope-question pass: **`candidate_tag_assignments`** as a first-class M:N junction (consistent with how `talent_pool_memberships` is modeled). The user picked "First-class data_object" over "inline junction".

#### Other Phase 0 scope decisions

| Q | Decision |
|---|---|
| `offer_letter_templates` approval lifecycle | **Single approver** (`has_single_approver=true`). Jurisdiction-specific templates handled via separate versions, not paired approvers. |
| `candidate_documents` regulated docs (I-9, right-to-work) | **Enum value** on `document_type`, not separate regulated entity. ATS hands off to ONBOARDING / HCM at `offer.accepted`; if ATS later owns I-9 collection, revisit. |
| Config-shape lifecycle exemption (Rule #12) | 4 of 5 new entities qualify (`candidate_documents`, `candidate_notes`, `candidate_tags`, `candidate_tag_assignments`) as config-shape masters with no workflow. Recorded here per Rule #15 (the prior `data_objects.notes` license is rescinded). |

### Bucket 3 fixes applied

Loader: [.tmp_deploy/fix_ats_bucket3_2026_05_30.ts](../.tmp_deploy/fix_ats_bucket3_2026_05_30.ts).

| Phase | Action | Row counts |
|---|---|---|
| 1 | INSERT `data_objects` | 5 (candidate_documents 1000, candidate_notes 1001, candidate_tags 1002, candidate_tag_assignments 1003, offer_letter_templates 1004) |
| 2 | INSERT `domain_module_data_objects` | 5 master rows (modules 1 / 2 / 6) |
| 3 | INSERT `data_object_relationships` | 10 (5 entity edges + 5 user edges per Rule #10) |
| 4 | INSERT `data_object_lifecycle_states` on offer_letter_templates | 6 (draft, in_review, approved, active, superseded, retired) |
| 5 | INSERT `data_object_aliases` on application_dispositions | 3 (synonym type) |

All inserts ship `record_status='new'` (Rule #1). No `notes` populated (Rule #15). No vendor names in descriptions (Rule #18).

UI spot-checks:
- https://tests.semantius.app/domain_map/data_objects (5 new rows, ids 1000-1004)
- https://tests.semantius.app/domain_map/domain_module_data_objects (5 new master rows)
- https://tests.semantius.app/domain_map/data_object_relationships (10 new rows)
- https://tests.semantius.app/domain_map/data_object_lifecycle_states (6 new rows on entity 1004)
- https://tests.semantius.app/domain_map/data_object_aliases (3 new rows on entity 900)

### Status

All open questions resolved (Bucket 1, Bucket 2, Bucket 3, B9 fan-out, HCM rescind). Status flipped to `passed`. Future structural changes (e.g. CCAAS / S2P / CLM coming online to subscribe to deferred B9 events) will be tracked on those domains' audits, not reopened here.

## 2026-05-31 — Audit

### Summary

- Current footprint: 87 data_objects across 9 modules (8 full + 1 starter `HIRING-STARTER`); 7 capabilities; 10 regulations (incl. FCRA + OFCCP added 2026-05-28); 51 trigger events relevant to ATS data_objects; 26 outbound cross-domain handoffs + 22 inbound cross-domain handoffs + ~15 intra-domain handoffs (B9b layer); 5 ATS roles + 26 role_modules; 49 ATS permissions + 53 role_permissions (incl. a SYSTEM role_id=2 mass-assignment); 9 system skills (1 per module, snake-case convention); ~70 skill_tools.
- Market surface basis: no new vendor-surface subagent pass this audit; structural-only Validate b1 against the snapshot left after the 2026-05-30 Phase 0 close-out (5 flagships Greenhouse, Lever, Ashby, SmartRecruiters, iCIMS plus Checkr for FCRA).
- Bucket 1a (agent-solvable): 6 items.
- Bucket 1b (blocked): 1 item.
- Bucket 2 (user judgment): 4 items.
- Bucket 3 (Phase 0 pending): 0 items.

Structural pass: A-band passes (all 7 metadata fields populated, FCRA + OFCCP linked). M-band passes (8 full + 1 starter, all module_kind invariants honored, no host-domain conflicts). B10b passes (zero NULL source/target_domain_module_id on ATS-touching handoffs). E1-E5 mostly pass (HIRING-MANAGER E5 false positive already resolved on 2026-05-28). F1-F5 pass (9 system skills 1:1 with modules, snake convention applied, ≥1 skill_tool per skill). H-band gap (12 of ~48 cross-domain handoffs tagged with handoff_processes, 0 approved). B-band has residue from B12 work and event_category fill-in.

### Vendor surface basis

No new subagent pass this audit (the 2026-05-30 Phase 0 vetting closed Bucket 3). Structural Validate against the existing snapshot; vendor surface unchanged from prior runs (Greenhouse, Lever, Ashby, SmartRecruiters, iCIMS plus Checkr).

### Bucket 1a — Agent-solvable confirmed gaps

#### B-band: 18 ATS-owned trigger events have empty `event_category`

Per Rule #13 the allowed values are `lifecycle`, `state_change`, `threshold`, `signal`. Background-style events (`background_check.cleared/.flagged/.initiated`, `candidate_assessment.passed/.failed`) are `lifecycle`; lifecycle-progression events along the requisition→posting→application→interview→offer chain (`job_posting.published/.closed`, `job_application.submitted/.advanced/.rejected`, `talent_pool.candidate_added/.activated`, `candidate_referral.submitted/.bonus_earned`, `interview.completed`, `interview_scorecard.submitted`, `recruitment_source.attributed`, `recruitment_event.held`, `recruitment_agency.engaged`) split between `state_change` and `lifecycle`. `interview.scheduled` (370) is plausibly `lifecycle` (creation). `org_unit.created` (391) is HCM-owned and out of scope here. Deterministic PATCH per event after a final mapping pass.

Affected event ids and current/proposed categories enumerated in state.yaml under `B1A-EVT-CATEGORIES`.

#### B12: 2 workflow-gate permissions are derived from `state_name` instead of `permission_verb_override`

The 2026-05-28 fix updated the lifecycle states' `permission_verb_override` columns but did not regenerate the materialized permissions:

| permission_id | current name | should be | state ref |
|---|---|---|---|
| 10030 | `ats-interviews:submitted_interview_scorecard` (workflow-gate) | `ats-interviews:submit_scorecard` | state 210 verb `submit_scorecard` |
| 10045 | `ats-background-checks:completed_consider_background_check` (workflow-gate) | `ats-background-checks:adjudicate_background_check` | state 191 verb `adjudicate_background_check` |

The intended-verb permissions (`ats-interviews:submit_scorecard`, `ats-background-checks:adjudicate_background_check`) do not yet exist as rows. Action: PATCH the two existing permission names to the intended values (single role_permission row each via role_id=2 system); the stale `submit_interview_scorecard`/`submit_background_check` override-tier rows (10033, 10048) are unrelated overrides per a separate convention and stay as-is.

#### B11: 3 aliases on `application_dispositions` (id 900) violate convention

The 2026-05-30 load wrote `Archive Reason`, `Rejection Reason`, `Disposition Reason` (Title Case with spaces) as `alias_type='synonym'`. Other aliases in the catalog are mixed case but most aliases here follow the same shape; the existing aliases on data_objects 1-14 / 749 are also Title Case so this is consistent — NOT a violation. Re-classify as no-op; remove from b1a.

(Surfaced during the scan; resolved at audit-time.)

#### B7 user-edge gaps on later-added masters

39 ATS masters added since the original load (ids 866-905, 1000-1004) but only `hiring_team_assignments` (905) has an edge to `users` (748). Many of these carry user-typed actors per the column shapes (e.g. `recruiter_interactions.recruiter`, `candidate_consents.granted_by`, `recruiter_saved_searches.owner`, `requisition_approvals.approver`, `offer_approvals.approver`, `background_check_adjudications.adjudicator`, `data_subject_requests.requested_by/handled_by`, `applicant_flow_records.disposition_actor`, `ofccp_audit_trails.actor`, `candidate_notes.author`, `candidate_documents.uploaded_by`). Need a focused pass to enumerate the user-typed fields per entity and author the Rule #10 edges.

Action: subagent-driven enumeration pass per entity → batch `data_object_relationships` insert (owner_side='source', is_required by column nullability).

#### H-band: APQC handoff_processes coverage thin

12 of ~48 ATS cross-domain handoffs have `handoff_processes` rows; 0 are `record_status='approved'`. Per the H-band procedure (Step 3 in `domain-audit-procedure.md`), each cross-domain handoff should be classified to an APQC PCF activity at audit time. The current 36-handoff gap is a deferred-tagging issue, not a tagging-correctness issue. Most of the remaining handoffs are HCM-owned upstream events (`hcm_position.approved/opened/filled/frozen/eliminated`, `job_profile.approved/activated/retired`, `org_unit.activated/reorganized/closed`, `position_demand_forecast.updated`), `requisition.filled` fan-out to PA/SWP, `job_offer.rescinded` fan-out (4 subscribers), `job_offer.accepted` fan-out, `job_offer.signed` to COMP, `recruitment_source.attributed`/`candidate_referral.bonus_earned` to PA/PAYROLL, `candidate_assessment.passed/failed` to HCM/TALENT-MGMT, `interview_scorecard.submitted` to PA, `pre_employee.activated` to HCM, `background_check.cleared/flagged` to ONBOARDING/COMPLIANCE.

Action: agent-curated `handoff_processes` insertion pass for the ~36 untagged handoffs against APQC PCF cross-industry framework (`Manage employee requisitions`, `Recruit/Source candidates`, `Manage employee onboarding`, `Manage workforce strategic planning`, `Administer benefit enrollment`, etc.). Target: ≥0.5N coverage (~24 new rows), `proposal_source='agent_curated'`, `record_status='new'`.

#### M-band: ATS-CANDIDATE-CRM has an unexpected `consumer` row

DMDO row 950: `talent_pools` (id 7) is `consumer + required` in ATS-CANDIDATE-CRM (module 1). Talent pools are mastered in ATS-TALENT-POOLS (module 2). A consumer linkage from CANDIDATE-CRM to talent_pools is plausible (recruiters reference pools while editing candidates) but `required` means CANDIDATE-CRM cannot deploy without ATS-TALENT-POOLS — which contradicts the modular split since CANDIDATE-CRM is meant to be installable standalone. Action: PATCH the row to `necessity='optional'` (deterministic, follows Rule #16 spirit for non-master rows).

### Bucket 1b — Blocked

#### Regulation codes empty on FCRA + OFCCP

`regulations` rows 84 (Fair Credit Reporting Act) and 85 (Federal Contract Compliance Programs Regulations) were inserted 2026-05-28 with `regulation_code=""`. Other regulations in the catalog carry codes (GDPR, CCPA, ADA, TITLE-VII, ADEA, EEO-1, EU-PAY-TRANS, EU-AI-ACT). Standard short codes would be `FCRA` and `OFCCP`. Blocked on: regulations is a catalog-wide shared table; PATCH affects every domain that links to those rows. Owner: regulations master / cross-domain governance. Mark for cross-domain Validate.

### Bucket 2 — Surface-for-user (judgment calls)

1. **Lifecycle states audit on the 21 masters with no lifecycle rows.** The 2026-05-30 close-out recorded 4 entities (`candidate_documents`, `candidate_notes`, `candidate_tags`, `candidate_tag_assignments`) as config-shape exempt per Rule #12. But 17 other masters lack lifecycle states with mixed shapes: clear config-shape (`application_stages`, `interview_questions`, `application_screening_questions`, `recruiter_saved_searches`, `referral_rewards`, `background_check_packages`) vs workflow-bearing (`requisition_approvals` has lifecycle; but `pre_adverse_action_notices`, `applicant_flow_records`, `data_subject_requests`, `fcra_summary_of_rights_acknowledgements`, `voluntary_self_identifications`, `ofccp_audit_trails`, `hiring_team_assignments`, `application_dispositions` plausibly carry workflow). Each needs the user's call: config-exempt vs author lifecycle. Cannot be answered without user input on FCRA/OFCCP/GDPR workflow intent.

2. **`offer_letter_templates` (1004) lifecycle gates have orphan verb_overrides.** States 1496 (`in_review`), 1497 (`approved`), 1498 (`active`), 1500 (`retired`) have `requires_permission=true` and verbs (`submit_offer_letter_template_for_review`, `approve_offer_letter_template`, `activate_offer_letter_template`, `retire_offer_letter_template`) but no matching workflow-gate permissions exist in ATS-OFFERS. Either (a) materialize the 4 workflow-gate permissions, (b) flip those `requires_permission` to false (config-shape master, only `record_status` matters), or (c) keep states as-is and accept the permission gap. Needs user judgment because the prior decision was `has_single_approver=true` (single approver, single verb shape) and 4 separate verbs may be more than intended.

3. **9 newer masters with `requires_permission=true` but empty `permission_verb_override`.** Lifecycle states on `candidate_nurture_campaigns` (state 1152 `active`), `candidate_consents` (1160 `withdrawn`), `referral_payouts` (1170/1171/1172 `approved/paid/clawed_back`), `referral_campaigns` (1175 `active`), `background_check_adjudications` (1187/1188/1189 `clear/engaged/declined`), `adverse_action_notices` (1193 `post_adverse_sent`), `requisition_approvals` (1200/1201 `approved/rejected`), `offer_approvals` (1230/1231 `approved/rejected`) all have `requires_permission=true` but `permission_verb_override=""`. Auto-deriving from state_name reproduces the B12 problem (state-verb mismatch). Options: (a) author the 14 verb_overrides explicitly (need names per state), (b) flip the `requires_permission` flags to false where the workflow is auto-progressed by the platform vs human-gated. Need user judgment per state.

4. **role_id=2 (system) blanket-assignment**. All 49 ATS permissions are assigned to `role_id=2` (role_code empty — the system/admin role bundling pattern). This is consistent with how built-ins behave but worth flagging: if `role_id=2` is a tenant-installed superuser, it inflates the admin surface materially. If it's the platform-internal system bot, it's fine. Confirm intent.

### Bucket 3 — Phase 0 pending (speculative)

None this pass. Bucket 3 was closed-out 2026-05-30 with formal Phase 0 vetting; no new candidate entities surfaced from the structural-only pass.

### Bucket dependencies

- Bucket 2 item 2 (`offer_letter_templates` lifecycle verbs) and Bucket 2 item 3 (newer masters with empty verb_overrides) share the same shape; user may want to resolve them together.
- Bucket 1a item B7 user-edges depends on whether Bucket 2 item 1 (config-exempt vs workflow-bearing) reduces the entity count. Run user pass first, then enumerate.
- H-band APQC tagging (Bucket 1a) is independent of Bucket 2.

### Decisions

_pending_

### Fixes applied

_none this pass; structural Validate is read-only until user decisions on Bucket 2._

### `domains.notes` pointer (if updated)

_not yet written_

## 2026-06-01 — Continuation: Bucket 2 close-out + catalog-wide drift fix

### Bucket 2 decisions

| Item | Decision |
|---|---|
| B2-OLT-VERBS | (c) Keep 2 gates (approve_offer_letter_template + retire_offer_letter_template), flip 2 (in_review + active → requires_permission=false). |
| B2-LFC-MASTERS-WITH-NO-STATES | Scope corrected from 17 to 5: only 5 of the 17 listed entities were actually `operational_workflow` without lifecycle states; the rest already passed B12 by `entity_type` classification (`catalog` / `operational_record` / `junction`). The 5 are FCRA / OFCCP / GDPR / EEOC compliance entities. Decision: flip all 5 to `master + optional` (sector-conditional); demote `fcra_summary_of_rights_acknowledgements` (902) + `voluntary_self_identifications` (903) to `entity_type='operational_record'` (no lifecycle authored — pure audit-trail acks). Author lifecycle on the 3 with real human gates: `pre_adverse_action_notices` (898), `applicant_flow_records` (899), `data_subject_requests` (901). |
| B2-LFC-EMPTY-VERB-OVERRIDES | (c) Mixed mapping approved: 11 explicit verb_overrides on human gates + 3 flips to `requires_permission=false` on auto-progressed states. |
| B2-ROLE-2-MASS-ASSIGNMENT | Left untouched at user direction. Pollution scope confirmed catalog-wide (881 → 900 role_permissions after this load); 895 of role 2's 900 grants are domain perms; **only 5 are legitimate platform grants**. Subsequently re-framed as a platform-layer architectural finding (see § Role / permission catalog extraction). |

### Fixes applied

Loader: [.tmp_deploy/fix_ats_audit_2026_06_01.ts](../.tmp_deploy/fix_ats_audit_2026_06_01.ts).

| Phase | Action | Row counts |
|---|---|---|
| 1 | PATCH `domain_module_data_objects` necessity → optional (898/899/901/902/903) | 5 |
| 2 | PATCH `data_objects` entity_type → operational_record (902, 903) | 2 |
| 3 | INSERT compliance lifecycle states on 898 (6), 899 (4), 901 (6) | 16 |
| 4 | PATCH 14 existing lifecycle states (11 verb_override + 3 flip) | 14 |
| 5 | PATCH 2 OLT lifecycle states (1496 in_review, 1498 active → flip) | 2 |
| 6 | PATCH 20 trigger_events.event_category (B1A-EVT-CATEGORIES) | 20 |
| 7 | PATCH 2 permission names (B1A-B12-PERM-RESIDUE) | 2 |
| 8 | PATCH DMDO 950 (talent_pools consumer in ATS-CANDIDATE-CRM) → optional | 1 |
| 9 | INSERT 19 workflow-gate permissions across modules 1 / 3 / 4 / 6 / 7 | 19 |
| 10 | INSERT role_permissions for role 2 (auto-granted at INSERT-time by platform mechanism; loader's idempotent check found them already present) | 19 |

### FCRA consistency fix + catalog-wide drift audit

Triggered by a user observation while reviewing the regenerated `ats-background-checks` blueprint: `fcra_disclosures` (879) and `adverse_action_notices` (881) had been left as `master + required` while their sibling FCRA entities (898, 902) had just been flipped to `master + optional`. Same statute (FCRA), same module, inconsistent necessity.

Cause: the 2026-06-01 loader only scoped to the 5 Bucket-2 compliance entities; the pre-existing FCRA entities 879 + 881 were not reviewed under the same sector-conditional test.

**Fix on the ATS scope:**
- PATCH DMDO 964 (`fcra_disclosures` master in ATS-BACKGROUND-CHECKS) → `optional`
- PATCH DMDO 966 (`adverse_action_notices` master in ATS-BACKGROUND-CHECKS) → `optional`

**Catalog-wide audit follow-up.** A search for regulator-named masters currently `required` surfaced 10 more candidates outside ATS. All flipped to `master + optional` after user confirmation:

| DMDO | Entity | Module | Statute / scope |
|---|---|---|---|
| 775 | disclosure_documents | RE-BROK-AGENT-OPS | US state-level RE disclosures |
| 955 | candidate_consents | ATS-CANDIDATE-CRM | GDPR/CCPA-shaped consent record |
| 986 | application_dispositions | ATS-RECRUITMENT-PIPELINE | OFCCP typed reason codes |
| 990 | ofccp_audit_trails | ATS-RECRUITMENT-PIPELINE | OFCCP US federal contractor |
| 1028 | finra_ce_records | LMS-CREDENTIALS | FINRA US securities CE |
| 1039 | hipaa_training_records | LMS-COMPLIANCE-TRAINING | HIPAA US healthcare |
| 1040 | osha_training_records | LMS-COMPLIANCE-TRAINING | OSHA US workplace safety |
| 1041 | sox_training_evidence | LMS-COMPLIANCE-TRAINING | SOX US public companies |
| 1042 | ferpa_training_records | LMS-COMPLIANCE-TRAINING | FERPA US education |
| 1046 | gdpr_consent_records | LMS-CT-GDPR | GDPR EU |

Total this pass: **12 DMDO rows flipped to `master + optional`** (2 FCRA consistency + 10 catalog-wide drift).

### Blueprints regenerated

5 existing blueprints regenerated in place against post-flip catalog state:
- ats-background-checks
- ats-candidate-crm
- ats-recruitment-pipeline
- lms-compliance-training
- re-brok-agent-ops

Plus the prior 17-blueprint baseline regeneration that established the pre-migration snapshot (Phase A7 of [plans/extract-role-permission-catalog.md](../plans/extract-role-permission-catalog.md)).

### SKILL.md updates

Three edits to [.claude/skills/domain-map-analyst/SKILL.md](../.claude/skills/domain-map-analyst/SKILL.md):

- **Rule #16 rewritten** to cover three classes of `optional` rows: (A) non-master rows on infrastructure masters (original rule); (B) `master + optional` when sector / jurisdiction-conditional (FCRA, OFCCP, HIPAA, SOX, FERPA, FINRA, GDPR, CCPA, EEO); (C) `master + optional` when ≥1 flagship vendor's schema lacks the entity AND the workflow degrades gracefully without it. Added four-question authoring summary at insert time.
- **B14 added to the per-domain audit checklist** — a positive scan for `master + required` rows that should be flagged optional under Rule #16 cases B + C. References the canonical query that surfaced today's 12 flips.
- **Phase B step #2 updated** — explicit reference to Rule #16 at insert time for every new `master` row.

### Role / permission catalog extraction (out of scope for this audit)

While investigating the role 2 mass-assignment (B2-ROLE-2), an architectural finding surfaced: the catalog has been writing role / permission / role_permission / permission_hierarchy rows into the `_core` platform module's RBAC tables for weeks, rather than into Domain Map catalog entities (none of which exist for these concepts today). Live counts:

- `_core.roles`: 121 total. Legitimate: 2 origin=`system` + 15 origin=`user` (tenant test accounts). Polluting: 104 origin=`model`/`model_master` (catalog content).
- `_core.permissions`: 901 total. Legitimate: 6 (no domain_module_id). Polluting: 895 (every domain-prefixed perm).
- `_core.role_permissions`: 1386 total. Legitimate: ~10. Polluting: ~1376.

Auto-grant mechanism: every INSERT into `_core.permissions` triggers a `role_permission` row for role 2 (Administrator) with `granted_by=null` and `granted_at` matching the permission's `created_at` to the microsecond. Not documented in `use-semantius`; lives in the platform layer.

Detailed migration plan written to [plans/extract-role-permission-catalog.md](../plans/extract-role-permission-catalog.md). Phases A (inventory) through G (DELETE polluting rows after user approval), with byte-identical blueprint regeneration as a hard gate. Other skills (`semantic-model-deployer`, `semantic-model-optimizer`, `semantic-model-analyst`, `semantius-skill-maker`, `semantius-agent-maker`, `semantius-deploy-test-maker`, `use-semantius`) are NOT touched — they consume blueprint artifacts only, and the contract is that blueprints regenerate byte-identical post-migration.

### Status

**ATS audit not yet closed.** Open items deferred until role / permission catalog extraction completes:
- B1A-B7-USER-EDGES-NEWER (~25-35 user edges on later-added masters)
- B1A-H-APQC-COVERAGE (~24 handoff_processes rows)
- B1B-REG-CODES-EMPTY (FCRA / OFCCP regulation_code; awaits cross-domain regulations Validate)
- Audit final close-out / `state.yaml` flip to `passed`

UI spot-checks:
- https://tests.semantius.app/domain_map/data_object_lifecycle_states (16 new compliance rows)
- https://tests.semantius.app/domain_map/data_object_relationships (no change this pass)
- https://tests.semantius.app/domain_map/domain_module_data_objects (12 necessity flips today + 5 flips in Phase 1)
- https://tests.semantius.app/domain_map/trigger_events (20 event_category PATCHes)
- https://tests.semantius.app/domain_map/permissions (19 new workflow-gate rows in `_core.permissions` — note: pollution per the migration plan, will move to `domain_permissions` post-extraction)
