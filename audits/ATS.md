# ATS — Audit History

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
