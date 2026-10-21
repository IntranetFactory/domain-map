# BGV Design (Background Verification) - 2026-06-19

Design for promoting employment background screening into its own domain, BGV, via the
catalog's dual-modeling pattern (the standalone market gets its own domain; ATS keeps an
embedded shell so ATS-BACKGROUND-CHECKS still deploys standalone). Grounded in
`.tmp_deploy/BGV-phase0-2026-06-19.md`. NOTHING here is loaded; this is the design that
the `q-BGV.md` surfaces for sign-off.

## 1. Why BGV is its own domain (Rule #2)

Background screening passes the point-solution-market test cleanly: Checkr, Sterling,
HireRight, First Advantage, Accurate Background, and Certn are all pure-plays whose flagship
product IS background screening. It is not a feature of an HR suite. The promotion driver is
the consume pattern already in the live catalog: `background_checks` (id 12) is mastered by
ATS (module 7, ATS-BACKGROUND-CHECKS) and consumed cross-domain by PAYROLL (PAYROLL-RUN) and
HRSD (HRSD-CASE-MGMT). Add CWM (contingent workers also get screened) and the cross-domain
consume signal is exactly the signal to promote a module to a domain.

This mirrors KMS-the-market vs KNOWLEDGE-MGMT-the-feature: BGV is the standalone screening
market; ATS-BACKGROUND-CHECKS stays as the recruiting-embedded view of it.

## 2. domains metadata (Rule #8)

| Field | Value | Basis |
| --- | --- | --- |
| `domain_code` | `BGV` | user-named |
| `domain_name` | `Background Verification` | |
| `domain_kind` | `established_market` | owns its own masters; 6 pure-play vendors with primary coverage |
| `crud_percentage` | `80` | mostly forms + state workflows + adjudication-matrix rules; the data-aggregation / vendor-feed orchestration and the adjudication rules engine are the non-declarable remainder (matches ATS at 80) |
| `business_logic` | "Adjudication rules engine that evaluates screening results against a configurable eligibility matrix; orchestration of third-party data-source retrieval and result aggregation across criminal, employment, education, and identity sources; continuous-monitoring alert generation against post-hire data feeds." | the part beyond JsonLogic |
| `min_org_size` | `20 s <500` | small firms buy Checkr self-serve; market starts well under 500 |
| `cost_band` | `$$` | per-check pricing; a 500-user org running pre-hire screening lands in the $25k-$100k band |
| `certification_required` | `true` | FCRA-regulated consumer-reporting activity; CRAs operate under FCRA and accreditation regimes (PBSA), so the market cannot be served OOTB without compliance scaffolding |
| `usa_market_size_usd_m` | `4500` | US employment-screening TAM, mid-single-digit-billions; triangulated from pure-play public revenues (First Advantage + Sterling combined ~$1.5B+ revenue, plus Checkr/HireRight/Accurate) and analyst sizing of the US background-check services market ~$4-5B |
| `market_size_source_year` | `2025` | |
| `catalog_tagline` | "Order, track, and adjudicate employment background checks with the FCRA adverse-action chain built in." | buyer voice, Rule #20 |
| `catalog_description` | see below | buyer voice, Rule #20 |

`catalog_description` (buyer voice, no vendor names, Rule #18/#20):
> Run employment background checks end to end. Build screening packages from criminal,
> employment, education, identity, driving, and drug components, then invite candidates to a
> portal to give consent and complete their checks. Adjudicate results against a configurable
> eligibility matrix, and when a result is disqualifying, walk the full pre-adverse and adverse
> action chain with disclosures, authorizations, summary-of-rights acknowledgements, and dispute
> handling. Keep workers cleared after hire with continuous monitoring, rescreening, identity
> verification, and right-to-work checks.

## 3. Module split (Rule #14): RECOMMEND 3 modules

Phase 0 found 6 capabilities-worth of surface, so >=2 modules is mandatory (Rule #14).
Recommended split is **3 modules** because every flagship sells post-hire monitoring as a
separately-named, separately-priced product, and adjudication is exposed as named tooling
distinct from ordering.

- **BGV-SCREENING-ORDERS** (Screening Orders & Packages): the order, the subject, the
  orderable catalog, the concrete searches, and candidate-facing engagement.
- **BGV-ADJUDICATION-COMPLIANCE** (Adjudication & Compliance): the decision + the FCRA/EEOC
  paperwork chain.
- **BGV-CONTINUOUS-IDENTITY** (Continuous & Identity): post-hire monitoring, rescreening,
  identity, right-to-work, international/GDPR.

Alternative (surfaced as a q-file option, not recommended): a 2-module split folding
Continuous & Identity into Orders. Defensible only if module count must be minimized; it
buries a layer every vendor prices separately.

Vendor packaging evidence (copied into the q-file evidence field): Checkr packages
post-hire as "Continuous Check"/"Continuous Crim" + Subscriptions, contrasted with
point-in-time reports; Sterling sells "Sterling Monitoring"; First Advantage sells
"Criminal Records Monitoring" + RightID identity; HireRight runs continuous programs on
separate feeds; Accurate frames continuous monitoring as the alternative to re-running
packages; Certn leads with OneID identity + ongoing monitoring. Adjudication is named tooling:
HireRight "Adjudication" service, Sterling adjudication + individualized-assessment tools,
First Advantage "enterprise adjudication engine".

## 4. Promotion / demotion plan (the destructive structural move - needs sign-off)

### 4a. EXISTING ATS masters promoted to BGV (mastery MOVES from module 7 to BGV)

These 10 are currently `master` in ATS-BACKGROUND-CHECKS (module 7). Under the plan they
become BGV masters; ATS keeps each as `embedded_master` so ATS-BACKGROUND-CHECKS still
deploys standalone (Rule #11 embedded-master integrity). Necessity per Rule #16.

| id | entity | BGV module | BGV necessity | Rule #16 basis |
| --- | --- | --- | --- | --- |
| 12 | background_checks | BGV-SCREENING-ORDERS | required | D: workflow halts without the order |
| 877 | background_check_packages | BGV-SCREENING-ORDERS | required | catalog all 6 vendors model |
| 878 | background_check_components | BGV-SCREENING-ORDERS | required | core, all 6 vendors |
| 1041 | drug_health_screenings | BGV-SCREENING-ORDERS | optional | C: Certn omits; role/sector-bound (DOT) |
| 880 | background_check_adjudications | BGV-ADJUDICATION-COMPLIANCE | required | core decision, all 6 |
| 879 | fcra_disclosures | BGV-ADJUDICATION-COMPLIANCE | optional | B: `fcra_`-prefixed, US-statute-bound |
| 898 | pre_adverse_action_notices | BGV-ADJUDICATION-COMPLIANCE | optional | B: FCRA 604/615, US-statute-bound |
| 881 | adverse_action_notices | BGV-ADJUDICATION-COMPLIANCE | optional | B: FCRA 615, US-statute-bound |
| 882 | background_check_disputes | BGV-ADJUDICATION-COMPLIANCE | optional | B: FCRA 611 reinvestigation, US-bound |
| 902 | fcra_summary_of_rights_acknowledgements | BGV-ADJUDICATION-COMPLIANCE | optional | B: `fcra_`-prefixed, US-statute-bound |

Note: `background_checks` (12) is `is_canonical_bare_word=false`. As the screening market's
canonical home, BGV is the natural place to claim the canonical bare-word for it; flagged as a
secondary q-file consideration (not gating). For now the promotion preserves the existing flag.

Also consider promoting `right_to_work_verifications` (1257), currently mastered by
ATS-PRE-EMPLOYEE-RECORD (module 8). It is part of the Continuous & Identity surface (Phase 0
maps it to module C). Move to BGV-CONTINUOUS-IDENTITY as `embedded_master` in ATS-PRE-EMPLOYEE-RECORD.
This is part of the q3 promotion decision.

### 4b. NEW entities BGV adds (build-on-approval, never written before the a-file)

22 new `data_objects` from Phase 0 (none collide with existing names; verified live). Necessity per Rule #16.

**BGV-SCREENING-ORDERS (new):**
- screening_candidates - required (the subject of the order; all 6 vendors)
- criminal_record_searches - required (core component, all 6)
- employment_verifications - required (core, all 6)
- education_verifications - required (core, all 6)
- motor_vehicle_record_checks - optional (B/sector: DOT/FMCSA driving roles)
- credential_license_verifications - optional (C: Checkr omits as 1st-class)
- global_watchlist_searches - required (core, all 6)
- healthcare_exclusion_screenings - optional (B: OIG-LEIE/SAM, healthcare sector only)
- background_check_statuses - optional (junction/status history; some vendors inline status as an attribute)
- candidate_invitations - optional (C: engagement, organizational choice)
- candidate_portal_sessions - optional (C: engagement)
- screening_notifications - optional (C: engagement)

**BGV-ADJUDICATION-COMPLIANCE (new):**
- adjudication_matrices - required (the rule set; 5 of 6 vendors expose it as named config)
- candidate_authorizations - optional (B: FCRA written-consent, US-statute-bound)
- individualized_assessments - optional (B: EEOC Green-factors, US-bound)
- ban_the_box_assessments - optional (B: state/local fair-chance, jurisdiction-bound)

**BGV-CONTINUOUS-IDENTITY (new):**
- identity_verifications - required (core, all 6 vendors; standalone identity products)
- continuous_monitoring_subscriptions - required (core post-hire, all 6)
- criminal_records_monitoring_alerts - required (the alert stream off a subscription, all 6)
- rescreenings - optional (C: some run continuous instead of periodic rescreen)
- international_screenings - optional (B: GDPR-bound, non-US)
- gdpr_consent_records - optional (B: GDPR, non-US data subjects)

Master count: **10 promoted-from-ATS + 22 new + 1 promoted-from-ATS-PRE-EMPLOYEE-RECORD
(right_to_work_verifications) = 33 BGV masters** across 3 modules. (right_to_work counted in
the promotion bucket.)

## 5. Consume / embed relationships back to BGV (Rule #16)

After promotion, the neighbors relate to BGV's `background_checks` (id 12) master:

| Domain | Module | Role on background_checks | Necessity | Rationale |
| --- | --- | --- | --- | --- |
| ATS | ATS-BACKGROUND-CHECKS (7) | embedded_master | optional | keeps standalone deploy; recruiting embeds the screening shell |
| CWM | VMS-WORKER-SOURCING (315) | consumer | optional | contingent workers get screened pre-assignment |
| PAYROLL | PAYROLL-RUN (90) | consumer | required (unchanged) | already a consumer; pay gated on cleared check |
| HRSD | HRSD-CASE-MGMT (75) | consumer | optional (unchanged) | already a consumer; HR cases reference checks |

The 10 promoted masters: ATS-BACKGROUND-CHECKS holds the recruiting-relevant subset as
`embedded_master` (background_checks, packages, components, adjudications, the FCRA chain) so
the recruiting flow still works standalone. CWM consumes `background_checks` only (it does not
re-master the screening machinery). PAYROLL and HRSD keep their existing consumer rows
pointed at BGV's master (the master moved, the consumer FK target follows).

Whether ATS embeds the full 10 or just `background_checks`, and whether CWM consumes vs
embedded_masters, is the q4 decision.

## 6. Capabilities (5-8)

| capability_code | name |
| --- | --- |
| BGV-SCREENING-ORDERS | Screening order management |
| BGV-PACKAGE-CONFIG | Screening package configuration |
| BGV-COMPONENT-SEARCH | Component search execution (criminal, employment, education, MVR, drug) |
| BGV-ADJUDICATION | Adjudication against eligibility matrix |
| BGV-ADVERSE-ACTION | FCRA adverse-action workflow |
| BGV-CANDIDATE-PORTAL | Candidate consent and portal engagement |
| BGV-CONTINUOUS-MONITORING | Post-hire continuous monitoring and rescreening |
| BGV-IDENTITY-RTW | Identity and right-to-work verification |

8 capabilities >= 3, so >=2 modules required - satisfied by the 3-module split.

## 7. Domain skill (Rule #17)

One `skill_type='domain'` skill, `skill_name='bgv'`, `domain_id=<new BGV id>`. Derives its
toolset (union of the 3 modules' `domain_module_tools`): order/query/mutate tools on
background_checks + components, the adjudication-gate mutation, the adverse-action chain
mutations, candidate-portal notify tools, continuous-monitoring query, identity-verification
fetch. trigger_keywords: background check, screening, pre-employment screening, FCRA, adverse
action, adjudication, criminal check, drug screening, continuous monitoring, identity
verification, right to work. (Authored in the build pass, not before the a-file.)

## 8. Compliance scope (q5)

Always: **FCRA** (the core US consumer-report regime driving disclosures, authorizations,
pre-adverse/adverse notices, disputes, summary-of-rights). Add (each statute-prefixed entity
ships master+optional, Rule #16 case B):
- **EEOC** Green-factors -> individualized_assessments
- **State ban-the-box / fair-chance** -> ban_the_box_assessments
- **I-9 / E-Verify** -> right_to_work_verifications
- **DOT / FMCSA** (driving roles) -> motor_vehicle_record_checks
- **OIG-LEIE / SAM** (healthcare) -> healthcare_exclusion_screenings
- **GDPR** (non-US) -> international_screenings, gdpr_consent_records

`regulations` rows + `domain_regulations` (FCRA mandatory; EEOC/ban-the-box/I-9/DOT/OIG/GDPR
conditional) are net-new structure: authored in the build, surfaced for the q5 scope decision.
