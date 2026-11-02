# ATS (Applicant Tracking and Recruiting): Market Surface Audit

- Domain: ATS (id 56). Audit date: 2026-11-01. Read-only (GET only, zero catalog writes).
- Current state source: live `domain_modules` + `domain_module_data_objects` for domain 56 (91 dmdo rows, 55 masters, 8 full modules + 1 starter, 7 capabilities, 10 regulations).
- Builds on: the 2026-05-28 and 2026-06-02 market passes, the 2026-05-30 Phase 0 vetting, the 2026-06-09 / 2026-06-16 b3 loads, and the 2026-06-19 BGV build (the 2026-05-30 and 2026-06-02 artifacts under c:/tmp are no longer on disk, so this pass reuses only what history.md recorded about them).
- Machine-readable twin: [ATS-market-surface-2026-11-01.json](ATS-market-surface-2026-11-01.json).

## Vendors

| Vendor | Evidence source | Specialist in | Why included |
|---|---|---|---|
| Greenhouse | Harvest API (docs.greenhouse.io/harvest.html) | Structured hiring: jobs, job openings, stages, scorecards, approvals, EEOC + demographic data, email templates | Reference ATS schema |
| Lever | Data API (hire.lever.co/developer/documentation) | CRM-first: opportunities, nurture, feedback templates, EEO + diversity surveys, audit events | Unified candidate-opportunity model |
| Ashby | API index (developers.ashbyhq.com/llms.txt) | ATS + CRM + scheduling: sequences, openings, surveys, notetaker transcripts, audit log, job templates | Richest modern public schema |
| SmartRecruiters | API reference (developers.smartrecruiters.com/reference) | Enterprise hiring: approvals, message templates, event management, self scheduling, audit API, onboarding | Enterprise pure-play |
| iCIMS | Trust-center FAQ + product docs | Enterprise ATS + CRM + onboarding, OFCCP / EEO reporting, per-country GDPR retention | **Compliance-strong flagship** |

Legend: `x` = first-class object in the public API reference (fetched 2026-11-01); `p` = documented product feature, not verified as an API object; `-` = not observed. iCIMS marks are product-level (`p`), except per-country retention, which the trust-center FAQ documents.

## Current footprint (live)

| Module | id | Masters | Embedded / consumer |
|---|---|---|---|
| ATS-CANDIDATE-CRM | 1 | 16 (candidates, consents, documents, emails, engagements, notes, nurture campaigns, data_subject_requests, outreach sequences + steps, recruiter_interactions, event attendances, agencies, events, sources, agency_submissions) | talent_pools, internal_opportunities |
| ATS-TALENT-POOLS | 2 | 6 | candidates |
| ATS-REFERRALS | 3 | 4 | candidates |
| ATS-RECRUITMENT-PIPELINE | 4 | 15 | candidates, hcm_positions, job_profiles, org_units, locations |
| ATS-INTERVIEWS | 5 | 8 | candidates, job_applications |
| ATS-OFFERS | 6 | 5 | candidates, job_applications |
| ATS-BACKGROUND-CHECKS | 7 | **0** | 12 (10 BGV screening entities + candidates + job_offers) |
| ATS-PRE-EMPLOYEE-RECORD | 8 | 1 (pre_employees) | candidates, job_offers, right_to_work_verifications |
| HIRING-STARTER (starter) | 154 | 0 | 7 embedded + users |

## Surface matrix

| Entity | Cat | GH | LV | AS | SR | IC | Class | Module | Status |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| candidates | master | x | x | x | x | p | core | CANDIDATE-CRM | present |
| job_requisitions | master | x | x | x | x | p | core | RECRUITMENT-PIPELINE | present |
| job_openings (headcount slots) | master | x | p | x | p | p | core | RECRUITMENT-PIPELINE | covered by hcm_positions shell |
| job_postings | master | x | x | x | x | p | core | RECRUITMENT-PIPELINE | present |
| job_posting_distributions | junction | p | p | x | x | p | core | RECRUITMENT-PIPELINE | present |
| job_applications | master | x | x | x | x | p | core | RECRUITMENT-PIPELINE | present |
| application_stages | config | x | x | x | x | p | core | RECRUITMENT-PIPELINE | present |
| application_stage_transitions | junction | p | p | p | x | p | core | RECRUITMENT-PIPELINE | present |
| application_dispositions | config | x | x | x | x | p | core | RECRUITMENT-PIPELINE | present |
| application_screening_questions | config | p | x | x | p | p | core | RECRUITMENT-PIPELINE | present |
| hiring_team_assignments | junction | p | p | x | p | p | core | RECRUITMENT-PIPELINE | present |
| requisition_approvals | junction | x | p | x | x | p | core | RECRUITMENT-PIPELINE | present |
| interviews | master | x | x | x | x | p | core | INTERVIEWS | present |
| interview_panels | junction | p | x | x | p | p | common | INTERVIEWS | present |
| interview_kits (+ questions) | config | p | x | x | x | p | core | INTERVIEWS | present |
| interview_scorecards | master | x | x | x | x | p | core | INTERVIEWS | present |
| interviewer_availability_slots | master | p | - | x | x | p | common | INTERVIEWS | present |
| candidate_assessments (+ templates) | master | p | - | x | x | p | core | INTERVIEWS | present |
| job_offers | master | x | x | x | x | p | core | OFFERS | present |
| offer_versions | junction | p | - | x | p | p | common | OFFERS | present |
| offer_approvals | junction | x | p | x | x | p | core | OFFERS | present |
| offer_letter_templates (+ documents) | config | p | p | p | p | p | core | OFFERS | present |
| candidate_referrals | master | p | x | x | p | p | core | REFERRALS | present |
| recruitment_sources | config | x | x | x | x | p | core | CANDIDATE-CRM | present |
| recruitment_agencies (+ agency_submissions) | master | p | p | - | p | p | common | CANDIDATE-CRM | present |
| talent_pools (+ memberships) | master | x | p | x | p | p | core | TALENT-POOLS | present |
| candidate_tags (+ assignments) | config | x | x | x | p | p | core | TALENT-POOLS | present |
| recruitment_events (+ attendances) | master | p | - | - | x | p | common | CANDIDATE-CRM | present |
| candidate_engagements | engagement | x | p | p | x | p | core | CANDIDATE-CRM | present |
| candidate_emails | engagement | p | p | x | x | p | core | CANDIDATE-CRM | present |
| candidate_notes | engagement | p | x | p | p | p | core | CANDIDATE-CRM | present; **duplicated by recruiter_interactions (S1)** |
| outreach_sequences (+ steps) | engagement | p | p | x | p | p | core | CANDIDATE-CRM | present; **duplicated by candidate_nurture_campaigns (S2)** |
| candidate_message_templates | config | x | p | x | x | p | core | CANDIDATE-CRM | **MISSING (M1)** |
| candidate_documents | master | p | x | x | p | p | core | CANDIDATE-CRM | present |
| candidate education / employment history | master | x | p | - | p | p | common | CANDIDATE-CRM | MISSING (M8, b3) |
| candidate_experience_surveys | engagement | p | - | x | - | p | common | CANDIDATE-CRM | MISSING (M5, b3) |
| job_templates | config | p | - | x | p | p | common | RECRUITMENT-PIPELINE | MISSING (M6, b3) |
| interview_transcripts | engagement | - | - | x | - | - | specialist | INTERVIEWS | MISSING (M7, b3) |
| recruiting_audit_events | compliance | p | x | x | x | p | core | platform-level | MISSING (M9, b3) |
| fit_scores shell (candidate match score) | master | p | - | p | p | p | core | CANDIDATE-CRM | **MISSING (M3)** |
| match_inference_runs shell (AI decision log) | compliance | - | - | - | - | - | compliance (EU AI Act Art. 12 / 26(6)) | CANDIDATE-CRM | **MISSING (M3)** |
| automated_screening_notices | compliance | - | - | - | - | - | compliance (NYC LL144, EU AI Act 26(11), IL AIVIA, CO AI Act) | RECRUITMENT-PIPELINE | **MISSING (M4)** |
| ai_screening_bias_audits | compliance | - | - | - | - | - | compliance (NYC LL144) | RECRUITMENT-PIPELINE | **MISSING (M4)** |
| eeo_responses | compliance | x | x | p | p | p | compliance (EEO-1) | RECRUITMENT-PIPELINE | present |
| voluntary_self_identifications | compliance | x | x | p | p | p | compliance (503 / VEVRAA) | RECRUITMENT-PIPELINE | present |
| applicant_flow_records, ofccp_audit_trails | compliance | - | - | - | - | p | compliance (503 / VEVRAA) | RECRUITMENT-PIPELINE | present (optional) |
| candidate_consents | compliance | p | p | p | p | p | compliance (GDPR / CCPA) | CANDIDATE-CRM | present |
| data_subject_requests | compliance | p | p | p | p | p | compliance (GDPR 15-22) | PRIV-MGMT canonical | **WRONG-OWNERSHIP (W1)** |
| records_retention_policies (consume) | compliance | p | p | p | p | x | compliance (GDPR 5(1)(e)) | CANDIDATE-CRM | **MISSING consumer (M2)** |
| salary_bands (consume) | compliance | p | x | x | p | p | compliance (EU-PAY-TRANS) | OFFERS + PIPELINE | **MISSING consumer (M10)** |
| background_checks + 9 screening entities, right_to_work_verifications | compliance | p | p | p | p | p | compliance (FCRA, I-9) | BGV canonical | embedded (correct) |
| pre_employees | master | - | - | - | p | p | specialist | PRE-EMPLOYEE-RECORD | present |

## Diff summary counts

| Finding type | Count | Agent-loadable additive | b2 (decision) | b3 (idea) | Owed by another domain |
|---|---|---|---|---|---|
| MISSING | 10 (13 entities, 5 compliance) | 1 (M2) | 4 (M1, M3, M4, M10) | 5 (M5-M9) | 0 |
| WRONG-OWNERSHIP | 2 | 0 | 0 | 0 | 2 (PRIV-MGMT B2-1) |
| SCOPE-CREEP | 5 | 0 | 4 (S1, S2, S3, S4) | 0 | S3's handoff edit is PA's |
| MODULARIZATION | 3 | 0 | 1 (Mo1) | 2 (Mo2, Mo3) | 0 |

## Top 5 most-impactful findings

1. **Mo1: ATS-BACKGROUND-CHECKS masters nothing** since the 2026-06-19 BGV promotion. It still carries the two gates (states 190 / 191) that seven ATS boundary payloads resolve through, and there is no ATS-to-BGV handoff at all. Decide keep / fold into ATS-OFFERS / rename.
2. **M3 + S3: the "AI-Driven Matching and Screening" capability has no entity.** Reuse TLNT-INTEL `fit_scores` (862) and `match_inference_runs` (865) as optional shells, and keep PA's per-employee `predictive_models` out of ATS.
3. **M4: no AI-screening compliance substrate** even though EU-AI-ACT is a mandatory ATS regulation: candidate notice and bias audit (NYC LL144, Colorado AI Act, Illinois AIVIA).
4. **M10: pay transparency.** EU-PAY-TRANS is mandatory on ATS and the vendors carry pay ranges on postings, but `salary_bands` was removed from ATS on 2026-05-28. Inbound handoff 425 now has no consumer.
5. **S1 + S2: two duplicate pairs in ATS-CANDIDATE-CRM** (recruiter_interactions = candidate_notes; candidate_nurture_campaigns = outreach_sequences).

## Modularization commentary

**Verdict: partial.** The eight-module split still reads clearly to a first-time deployer (pipeline, interviews, offers, referrals, pools, CRM, pre-employee), but it has two defects:

- **(a)** ATS-BACKGROUND-CHECKS is now a full module of shells only (Mo1).
- **(b)** ATS-CANDIDATE-CRM carries two duplicate pairs (S1, S2).

ATS-PRE-EMPLOYEE-RECORD is thin (one master) but coherent. No WRONG-OWNERSHIP sits inside ATS: the only ownership move is the cross-domain DSAR re-home, which PRIV-MGMT already tracks.

## What changed since the last market pass (2026-06-02)

- BGV now masters 11 former ATS entities (ATS rows demoted to `embedded_master`, user-approved 2026-06-19).
- Six b3 entities were loaded (candidate_emails, drug_health_screenings, right_to_work_verifications, agency_submissions, outreach_sequences, outreach_sequence_steps). The outreach_sequences load introduced the S2 duplicate.
- The 2026-06-09 skip of `candidate_data_retention_policies` relied on "ATS consumes records_retention_policies (433)", but that consumer row was never written (M2).
- The OFCCP basis has narrowed. EO 11246 was revoked on 2025-01-21 (EO 14173); Section 503 and VEVRAA remain. The OFCCP entities are already `master + optional`, so no row change is needed.
- New AI-in-hiring obligations have no catalog entity (M4).
