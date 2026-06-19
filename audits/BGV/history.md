# BGV audit history

## 2026-06-19 - a-BGV.md processed: BGV built

Greenfield build of the Background Verification (employment screening) domain plus a
destructive cross-domain mastery promotion out of ATS. All q answered approve
(a1=yes, a2=a, a3=yes, a4=a, a5=empty -> full compliance set, a6=yes, a7=yes, a8=yes).
Loader: `.tmp_deploy/load_bgv_2026_06_19.ts` (idempotent, ran clean after one fix:
dropped the retired `display_label` column from the data_objects insert).

What was built (all rows record_status='new', nothing approved per Rule #1):

- **Domain created: id 191** (`BGV`, "Background Verification"), domain_kind=established_market,
  crud_percentage=80, certification_required=true (FCRA/PBSA), min_org_size="20 s <500",
  cost_band="$$", usa_market_size_usd_m=4500 (2025), full business_logic, q6 catalog
  tagline + description.
- **3 full modules** (buyer-voice copy, Rule #20): BGV-SCREENING-ORDERS (408),
  BGV-ADJUDICATION-COMPLIANCE (409), BGV-CONTINUOUS-IDENTITY (410).
- **Promotion (a3, DESTRUCTIVE, approved):** 11 entities promoted to BGV masters and the
  ATS rows demoted master -> embedded_master:
  10 from ATS-BACKGROUND-CHECKS (mod 7): background_checks (12), background_check_packages (877),
  background_check_components (878), drug_health_screenings (1041),
  background_check_adjudications (880), fcra_disclosures (879), pre_adverse_action_notices (898),
  adverse_action_notices (881), background_check_disputes (882),
  fcra_summary_of_rights_acknowledgements (902); plus right_to_work_verifications (1257)
  from ATS-PRE-EMPLOYEE-RECORD (mod 8). **M7 verified: each of the 11 has exactly ONE
  master (BGV) and an ATS embedded_master row.**
- **22 new masters (a7):** 21 net-new data_objects inserted (entity_type classified, no
  unclassified; pattern flags set where relevant), plus 1 co-master row on the PRE-EXISTING
  `gdpr_consent_records` (950). **Collision the design/a-file missed:** 950 already existed,
  mastered by LMS-CT-GDPR (mod 180, domain 57, learner-training-consent slice). Per Rule #9 BGV
  did NOT mint a duplicate; it co-masters 950 with a distinct screening-consent slice (notes
  record the split). LMS's master row was left untouched. Total BGV masters = 33
  (16 + 10 + 7 across the 3 modules), exactly as designed.
- **8 capabilities** + capability_domains + domain_module_capabilities.
- **Neighbors (a4=a):** added a CWM consumer row on background_checks (VMS-WORKER-SOURCING,
  mod 315). PAYROLL-RUN (90, required) and HRSD-CASE-MGMT (75, optional) consumer rows left
  unchanged: they consume the data_object regardless of which module masters it.
- **Domain skill (id 478):** skill_type='domain', skill_name='bgv', non-empty trigger-shaped
  description + comma-separated trigger_keywords (brand-free). 12 new platform-tier tools +
  3 reused existing (query_background_checks, request_background_check, flag_for_review) +
  notify_person/notify_team. domain_module_tools give each module >=1 query, >=1 mutate, and
  >=1 workflow-gate mutate (complete_background_check / adjudicate_background_check +
  issue_adverse_action_notice / verify_identity).
- **5 domain_aliases:** background screening, employment screening, pre-employment screening,
  background checks, BGS.
- **Canonical bare-word (a8):** background_checks (12) is_canonical_bare_word=true + rationale
  (verified unclaimed catalog-wide before the patch).

Resolved b2 decisions: B2-GATE, B2-MODULES, B2-PROMOTION, B2-NEIGHBORS, B2-COMPLIANCE-SCOPE
all answered approve and executed. Resolved b1b: B1B-COPY-DOMAIN (copy written on the domain
row). Resolved b3: B3-NEW-ENTITIES (built), B3-CANONICAL-BAREWORD (claimed).

Note on compliance scope (a5 full set): the statute-bound *entities* were built
(individualized_assessments, ban_the_box_assessments, candidate_authorizations,
motor_vehicle_record_checks, healthcare_exclusion_screenings, right_to_work_verifications,
international_screenings, gdpr_consent_records). The `regulations` + `domain_regulations`
rows the design floated (FCRA mandatory; EEOC/ban-the-box/I-9/DOT/OIG/GDPR conditional) were
NOT authored this pass and are queued as a b1b follow-up (additive, non-blocking).

Deferred follow-ups (b1b, now unblocked by the build): lifecycle states (B12) on the
operational_workflow masters; regulations + domain_regulations rows for the compliance scope;
outbound/intra handoffs (offer -> screening, screening cleared -> payroll/onboarding,
adjudication -> adverse-action, monitoring alert -> case); personas + RACI (Phase E);
handoff module-FK backfill.

## 2026-06-19 - M7 fix (gdpr_consent_records)

The build "co-mastered" gdpr_consent_records (950), an M7 violation: 2 module-grain masters (LMS-CT-GDPR mod 180 + BGV-CONTINUOUS-IDENTITY mod 410), and the emitter throws on >1. Fixed per Rule #9 (collision -> scope-qualify to a distinct name): created screening_gdpr_consents (id 1317, operational_record), re-pointed BGV's DMDO master row off 950 onto 1317, left LMS's master on 950 untouched. Verified live: 950 has 1 master (LMS), 1317 has 1 master (BGV), BGV still 33 masters. The query/grant/withdraw_gdpr_consent_record tools are LMS-only (mod 180, point at 950) and correctly left alone. So the "22 new masters" reads as 22 net-new data_objects (screening_gdpr_consents replaces the bad co-master row). Loader: .tmp_deploy/fix_bgv_gdpr_m7_2026_06_19.ts.
