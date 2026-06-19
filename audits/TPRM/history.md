# TPRM audit history

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- Current footprint: **0 modules, 0 capabilities, 0 mastered entities, 0 outbound handoffs, 0 trigger events, 0 system skills.** TPRM is a phantom domain row (id 19). The only catalog touches are 2 inbound handoffs whose `target_domain_module_id` is NULL because no TPRM module exists, plus 7 `solutions` linked via `solution_domains` (OneTrust TPRM, ProcessUnity, Prevalent, Whistic primary, plus ServiceNow IRM / Archer / MetricStream secondary) and 4 `regulations` (ISO 27001, NIST CSF, NIS2, DORA, all mandatory).
- Adjacent ownership in the live catalog: `suppliers` (id 206, alias "vendor"), `supplier_risk_assessments` (730, alias "TPRM assessment" + "due diligence review"), `supplier_qualifications`, `supplier_certifications`, `supplier_scorecards`, `supplier_onboardings` are all mastered by **SUP-LIFE** (28, no modules either). `risk_assessments` (291), `compliance_risks`, `compliance_controls`, `control_assessments`, `compliance_policies`, `compliance_evidence`, `audit_issues`, `remediation_plans` are mastered by **GRC** (15, no modules). `audit_findings` and the AUDIT cluster are mastered by **AUDIT** (16, no modules). `supplier_esg_assessments` is mastered by **ESG** (21, no modules). `smp_vendor_risk_assessments` (996) is the SaaS Management Platform's own vendor-risk slice.
- Vendor-surface basis (flagship pure-plays): **OneTrust Third-Party Risk**, **ProcessUnity Vendor Risk**, **Prevalent TPRM**, **Whistic** (already linked as `solutions`), plus public docs from **Venminder**, **CyberGRX**, **Aravo**, and the security-ratings adjacent market (**BitSight**, **SecurityScorecard**, **UpGuard**, **RiskRecon**) which TPRM products bundle into.
- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 9 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.
- 2 candidate domains queued in `audits/_missing-domains.md`: `SEC-RATINGS` (Security Ratings and Cyber Risk Intelligence), `KYC-KYB` (KYC and KYB Identity Verification).

Structural pass: **catastrophic M1 failure**. TPRM has zero `domain_modules` rows so every downstream band (M2-M7, B1-B12, C1-C2, D1, E1-E6, F1-F5, H1) is non-evaluable: the per-domain audit blocks at the M-band per Rule #14 and never reaches B-band routing or F-band skill checks. A-band entity-coverage check also fails outright; market footprint is zero. The S-band (`solutions` × `solution_domains` × `regulations`) is the only band that passes, because solutions and regulations attach to the domain id directly without needing a module.

### Vendor surface basis

Pure-play TPRM specialists: OneTrust TPRM and ProcessUnity Vendor Risk are the regulated-enterprise leaders, Prevalent and Whistic the mid-market pure-plays, Venminder the financial-services niche, CyberGRX (acquired by ProcessUnity 2023) the assessment-exchange model, Aravo the global-enterprise procurement-anchored pure-play. The security-ratings sister-market (BitSight, SecurityScorecard, UpGuard, RiskRecon) is an external-attack-surface intelligence overlay that TPRM platforms ingest, and warrants its own `domains` row (queued as `SEC-RATINGS`). KYC / KYB identity verification (Onfido, Persona, Trulioo, Middesk, Alloy, ComplyAdvantage) is the entity-due-diligence overlay TPRM platforms call out to; also queued as `KYC-KYB`.

### Bucket 1 — In-scope confirmed gaps

Bucket 1 is dominated by a single STRUCTURAL gap that cascades to everything else: TPRM has no modules. Until the M-band is cured, none of the entity-level / handoff-level / skill-level fixes can land. The Bucket 1 items below are the minimum scaffold to make the domain auditable on the next Validate run; deeper entity coverage (questionnaires, subprocessors, fourth parties, SBOM consumption, attestations, vendor-tier models) is queued in Bucket 3 because the existing SUP-LIFE / GRC mastery overlaps demand judgment on which entities TPRM canonically owns vs consumes.

#### STRUCTURAL band failures (M-band cascade)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | TPRM has **0 `domain_modules` rows** at all (`module_kind='full'` floor not met). Domain row exists but is unloadable: no deploy target for any data_object, lifecycle state, role, or skill. Per Rule #14 this is an audit blocker for every band below M. | Author at minimum 1 `module_kind='full'` row. Proposed default: a single module `TPRM-VENDOR-RISK-MGMT` covering inherent assessment, ongoing monitoring, and remediation orchestration. If the user decides ≥3 capabilities are intended (see B1-S2 / Bucket 2 #1), split into 2 full modules per Rule #14 floor (proposed: `TPRM-VENDOR-DUE-DILIGENCE` + `TPRM-VENDOR-ONGOING-MONITORING`). |
| B1-S2 | A1 | TPRM has **0 `capabilities` linked via `capability_domains`**. No capability surface attaches to the domain, so the marketing-layer surface is empty too. | Author the minimum capability set after the user picks single vs split modularization (see Bucket 2 #1). Conservative baseline: `vendor-onboarding`, `vendor-due-diligence`, `vendor-tier-classification`, `continuous-monitoring`, `vendor-issue-management`. If ≥3 capabilities land, Rule #14 forces the 2-module split. |
| B1-S3 | F2/F3 (downstream of S1) | Zero `domain_modules` ⇒ zero `system` skills ⇒ Semantius score uncomputable. Auto-fails F2 (one-system-skill-per-module floor) and F3 (≥1 `skill_tools` floor) trivially. | Cured by curing S1: each new module needs its `system` skill + ≥1 `skill_tools` row per Rule #17, shipped in the same load. |

#### BOUNDARY (inbound NULL FK on the TPRM side — owed by TPRM after S1 is cured)

These 2 handoffs target TPRM but have `target_domain_module_id=NULL` because no TPRM module exists. They are valid inbound flows; the NULL FK is mechanical, not a routing question. Once a TPRM module exists, B10b becomes fixable in-domain (PATCH the FK).

| ID | Finding | Source | Payload | Fix |
|---|---|---|---|---|
| B1-B1 | handoff 258 `finding.remediated` AUDIT (16) → TPRM (19): `target_domain_module_id=NULL`. | AUDIT | `audit_findings` (294) | PATCH `target_domain_module_id` to the TPRM module that consumes audit findings (after B1-S1 lands the module). |
| B1-B2 | handoff 278 `supplier_esg_assessment.score_updated` ESG (21) → TPRM (19): `target_domain_module_id=NULL`, `friction_level=high`. | ESG | `supplier_esg_assessments` (327) | PATCH `target_domain_module_id` to the TPRM ongoing-monitoring module (after B1-S1). |

#### APQC TAGGING — proposed `handoff_processes` rows

Both inbound handoffs already have one substring-match tag on the source side. Curing them with confident L3 PCF picks while the model is fresh:

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence | record_status |
|---|---|---|---|---|---|---|---|
| B1-H1 (258) | AUDIT → TPRM | `finding.remediated` | `audit_findings` | "Oversee and coordinate enterprise risk management activities" (cross-industry 16445) | 366 | confident L3 | new |
| B1-H2 (278) | ESG → TPRM | `supplier_esg_assessment.score_updated` | `supplier_esg_assessments` | "Manage suppliers" (cross-industry 10280) | 167 | confident L3 | new |

Note: handoff 258 already carries process_id 389 ("Report audit findings", L3) as `discovery_substring`. The proposed agent-curated tag above is additive (TPRM-side framing — the receiver runs the risk-management workflow), not a replacement.

#### Per-bucket-1 finding-type rollup

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 (deferred to Bucket 3 pending Bucket 2 ownership decisions) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M / A / F-band cascade) | 3 |
| BOUNDARY (NULL FK on TPRM-side handoffs) | 2 |
| APQC TAGGING | 2 |
| MODULARIZATION ISSUES | 1 (B1-M1 listed in Bucket 2 #1 — the split-or-single question is a refactor conversation, not a direct fix) |
| **Total Bucket 1 items (S* + B* + H*)** | **8** |

### Bucket 2 — Surface-for-user (judgment calls)

1. **Single module vs split.** TPRM market splits roughly into two phases: **inherent due diligence at onboarding** (questionnaires, document collection, tier classification, contract attach) and **ongoing monitoring + issue management** (re-assessment cadence, security-rating delta alerts, breach-intelligence triage, remediation tracking). Flagship pure-plays expose this split (OneTrust TPRM, ProcessUnity, Prevalent all carry separate Onboarding vs Continuous Monitoring product lines). Decision: (a) single module `TPRM-VENDOR-RISK-MGMT` (simpler, defers split until capability count forces it), (b) split into `TPRM-VENDOR-DUE-DILIGENCE` + `TPRM-VENDOR-ONGOING-MONITORING` (matches pure-play product split, satisfies Rule #14 ≥2-module floor pre-emptively). This decision is the load-bearing one — every subsequent ownership question hangs off it.

2. **`risk_assessments` ownership boundary vs GRC.** GRC (15) currently masters `risk_assessments` (291). TPRM market exists because vendor risk is a **distinct workflow** from enterprise risk (different inputs: questionnaires + security ratings vs internal control testing; different reviewers: procurement / infosec vs internal audit). Decision: (a) TPRM masters a new `vendor_risk_assessments` entity (its own data_object, distinct from GRC's `risk_assessments`), (b) TPRM consumes GRC's `risk_assessments` with `subject_type='vendor'` discriminator (leaner, but flattens the vendor-specific fields, security-rating delta, questionnaire-response join), (c) TPRM consumes SUP-LIFE's `supplier_risk_assessments` (730) instead and the TPRM domain row is folded into SUP-LIFE entirely.

3. **`suppliers` vs `vendors` collision (Rule #9).** SUP-LIFE masters `suppliers` (206) with alias "vendor". TPRM market specialists (OneTrust, ProcessUnity, Whistic) operate on a **vendor** master that includes non-supplier counterparties (SaaS providers, data processors, IT vendors that may or may not also be invoiced suppliers). Decision: (a) TPRM consumes SUP-LIFE's `suppliers` (single master across the org, the cleaner Rule #2 outcome), (b) TPRM masters a separate `third_parties` entity scoped to risk-managed counterparties only (matches the pure-play product boundary, but introduces a known overlap with `suppliers` that needs alias / relationship mapping), (c) introduce a new `MDM`-tier master `counterparties` that both SUP-LIFE and TPRM consume. Note Rule #9 collision: any TPRM proposal of `vendors` or `third_parties` triggers naming arbitration against existing `suppliers` aliases.

4. **`supplier_risk_assessments` (730) — TPRM canonical or SUP-LIFE canonical?** This entity carries the aliases "TPRM assessment" and "due diligence review", clearly TPRM-coded, yet is mastered by SUP-LIFE. Decision: (a) move mastery to TPRM (data_object stays; only the DMDO mastery row moves once TPRM has a module), (b) keep SUP-LIFE mastery and TPRM consumes (matches procurement-anchored deployment where SUP-LIFE runs the workflow), (c) rename to `vendor_risk_assessments`, move mastery to TPRM, leave SUP-LIFE with a vendor-risk-aware variant if needed.

5. **Scope vs SUP-LIFE more broadly.** SUP-LIFE masters `supplier_onboardings`, `supplier_qualifications`, `supplier_certifications`, `supplier_scorecards`. TPRM specialists' "vendor onboarding", "questionnaires", "certification tracking" overlap each of these. Decision: (a) preserve SUP-LIFE mastery, TPRM consumes everything (TPRM becomes a thin overlay domain, almost an analytics layer), (b) TPRM masters its own assessment + remediation entities and consumes the SUP-LIFE master records as `kind='consumer'` only, (c) the two domains are duplicative and TPRM should be folded into SUP-LIFE with a `SUP-LIFE-RISK` module — promote-as-domain decision reversed.

6. **`compliance_risks` (282) vs vendor-risk overlap.** GRC's `compliance_risks` is general regulatory exposure tracking; vendor risks are a distinct subtype with vendor-FK shape. Decision: (a) vendor risk gets its own master (e.g. `vendor_risk_findings`), (b) TPRM consumes GRC's `compliance_risks` with a vendor discriminator. Relates to #2.

7. **`audit_findings` (294) consumed by TPRM.** AUDIT sends `finding.remediated` → TPRM (handoff 258). What workflow does TPRM run when it receives this? Today there is no model; the handoff is the only signal. Decision: (a) TPRM consumes `audit_findings` (`role=consumer`, `necessity=optional` per Rule #16) and ties to its vendor-remediation entity, (b) the handoff is mis-routed and should target GRC (15) or AUDIT (16) itself, (c) the handoff is correct and TPRM needs a `vendor_audit_findings` master distinct from the general AUDIT one.

8. **DORA scope coverage.** DORA (Digital Operational Resilience Act) is one of TPRM's 4 mandatory regulations. DORA introduces specific TPRM-side artifacts (Information Register of ICT third-party service providers, ICT-risk concentration analyses, sub-contractor mapping). None of these have entity shape in the catalog yet. Decision: (a) add `ict_third_party_registers`, `ict_concentration_assessments`, `subcontractor_chains` as MISSING in Bucket 1 of a follow-up audit once the modules exist, (b) treat DORA as scope-creep on this domain row and remove the `domain_regulations` link, (c) keep the regulation linked but defer entity authoring to a dedicated DORA-compliance audit.

9. **`smp_vendor_risk_assessments` (996) — duplicate of TPRM scope?** SaaS Management Platform's vendor-risk slice has its own data_object, lifecycle, triggers. Decision: (a) keep separate (SMP is SaaS-app-specific; TPRM is generic vendor-risk), (b) deprecate `smp_vendor_risk_assessments` and SMP consumes TPRM's vendor-risk master once it exists, (c) keep both with a documented overlap and a TPRM `consumer` role on `smp_vendor_risk_assessments`.

### Bucket 3 — Phase 0 pending (speculative; vendor-research vetting needed)

Universal-or-near-universal vendor entities surfaced from flagship pure-play knowledge (OneTrust TPRM, ProcessUnity, Prevalent, Whistic, Venminder, CyberGRX, Aravo). Phase 0 vetting would confirm scope and necessity; all are blocked until Bucket 2 #1 (modularization) is resolved.

| ID | Candidate entity | Proposed module (single-module path) | Vendor evidence |
|---|---|---|---|
| B3-1 | `vendor_questionnaires` | TPRM-VENDOR-RISK-MGMT | Universal: SIG / SIG-Lite / CAIQ / VSAQ instances; all 7 vendors author these |
| B3-2 | `vendor_questionnaire_responses` | TPRM-VENDOR-RISK-MGMT | Universal; the response artifact distinct from the template |
| B3-3 | `vendor_tier_classifications` | TPRM-VENDOR-RISK-MGMT | Universal: critical / high / moderate / low tiering drives re-assessment cadence |
| B3-4 | `vendor_remediations` / `vendor_remediation_plans` | TPRM-VENDOR-RISK-MGMT | Universal; distinct from GRC's `remediation_plans` (vendor-scoped, often time-boxed at contract renewal) |
| B3-5 | `subprocessors` (and `subprocessor_chains` for DORA) | TPRM-VENDOR-RISK-MGMT | Specialist but mandated: OneTrust + Prevalent expose; DORA Art. 28 requires the chain |
| B3-6 | `vendor_security_ratings_snapshots` | TPRM-VENDOR-RISK-MGMT | Specialist (BitSight / SecurityScorecard / UpGuard ingest); separate from the SEC-RATINGS candidate domain — this is the consumer side that lands the score on the TPRM vendor record |

Adjacent: `vendor_attestations`, `vendor_contracts` (vs CLM's `contracts`), `vendor_certifications` (vs SUP-LIFE's `supplier_certifications` 498), `vendor_incidents`, `vendor_sla_breaches`, `vendor_breach_notifications` were considered but defer to a second-pass Phase 0 once the SUP-LIFE / GRC ownership boundary in Bucket 2 #2-5 is set; their proposed mastery hinges on that boundary.

### Cross-bucket dependencies

- **All of Bucket 1 below the M-band depends on Bucket 2 #1** (single-module vs split). The B1-S1 fix shape changes (1 module vs 2 modules), and B1-S2 capabilities count plus B1-S3 system-skills count cascade off that decision.
- **All of Bucket 3 depends on Bucket 2 #2 / #3 / #4 / #5.** Until the user decides the GRC / SUP-LIFE ownership boundary, the B3 candidate entities cannot be assigned to a module owner (some land in TPRM as masters, some land in SUP-LIFE as masters with TPRM consuming, some collapse into existing GRC entities).
- **Bucket 1 B-band (B1-B1, B1-B2) cannot fix until B1-S1 lands** — there is no `target_domain_module_id` to PATCH to without a TPRM module.
- **Bucket 1 APQC tagging (B1-H1, B1-H2) is independent** — handoff_processes inserts only need handoff_id, which already exists; no module dependency.
- **Bucket 2 #8 (DORA) is independent of #1-#7** — the answer applies regardless of the modularization shape.
- **Bucket 2 #9 (SMP overlap) is independent** — answer applies regardless of TPRM module decisions.

### Per-bucket prompts

**Bucket 1 prompt:** *"Bucket 1 has 8 items, all gating the next audit pass. Approve B1-H1 and B1-H2 (APQC tagging — independent of all other fixes) directly? For B1-S1, B1-S2, B1-S3, B1-B1, B1-B2 (the module scaffold cascade) I need your Bucket 2 #1 decision (single module vs split) before I can shape the fix. Reply 'tag now' to apply the 2 APQC rows immediately, plus your answer to Bucket 2 #1 for the rest."*

**Bucket 2 prompt:** *"What's your call on each of 1-9? Item #1 is load-bearing for half of Bucket 1 and most of Bucket 3 — please answer that first if you want me to draft a follow-up fix load. For items #2-#5 (ownership boundary with SUP-LIFE / GRC), the cleanest answer is also the largest-cascade one: you can answer them as a group, e.g. 'TPRM masters its own vendor_risk_assessments and consumes everything else from SUP-LIFE / GRC' would resolve all four at once."*

**Bucket 3 prompt:** *"Vet via Phase 0 vendor research (I run a focused pull against OneTrust TPRM / ProcessUnity / Prevalent / Whistic docs and confirm the 6 candidates with vendor citations) or eyeball-mode (name which of the 6 ring true and they become Bucket 1 items in the next load)? Note this requires Bucket 2 #2-#5 to be answered first so I know which module owns each candidate."*

### Report-only follow-ups (owed by other domains)

- **SUP-LIFE (28) owes M1.** SUP-LIFE has zero `domain_modules` despite mastering 6 data_objects (suppliers, supplier_onboardings, supplier_qualifications, supplier_scorecards, supplier_risk_assessments, supplier_certifications). Same M1 cascade as TPRM. Surfaces when SUP-LIFE is next validated. The Bucket 2 #2 / #4 ownership decisions for TPRM cannot land cleanly until SUP-LIFE has modules to host the alternative-mastery proposals.
- **GRC (15) owes M1.** GRC masters 10 entities and has zero modules. Surfaces when GRC is next validated. Bucket 2 #2 (TPRM vs GRC for `risk_assessments`) is blocked on GRC having a module to compare module-level scope with.
- **AUDIT (16) owes M1.** Mastership of 8 audit-cluster entities with zero modules. The B1-H1 APQC tag we propose stands regardless; AUDIT-side audit owes its own structural cure.
- **ESG (21) owes M1.** Mastership of 9 ESG entities with zero modules. B1-H2 stands regardless.
- **AUDIT B9 candidate handoff.** AUDIT's `finding.remediated` (handoff 258) currently fires to TPRM only. Once TPRM has remediation entities (B3-4), the symmetric back-channel `vendor_remediation.completed` from TPRM → AUDIT (audit closure signal) is the candidate inbound on the AUDIT side. Surfaces in the AUDIT audit.
- **ESG B9 candidate handoff.** ESG's `supplier_esg_assessment.score_updated` flow already targets TPRM; the symmetric back-channel `vendor_risk_assessment.completed` from TPRM → ESG (so ESG knows when the vendor's overall risk profile shifted) is a candidate. Surfaces in ESG's audit.
- **SUP-LIFE B9.** SUP-LIFE already publishes `supplier_risk_assessment.completed` to AUDIT (handoff 550) and `supplier_risk_assessment.elevated` to GRC (handoff 549). If TPRM ends up consuming `supplier_risk_assessments` (Bucket 2 #4 option b), a third fan-out to TPRM is the candidate. Surfaces in SUP-LIFE's audit.
- **MDM (87) `supplier_golden_record.updated` handoff (273) → SUP-LIFE.** Already wired. No TPRM impact; mentioned for context, since any decision on Bucket 2 #3 to introduce a `counterparties` MDM master would route through this same MDM lane.

## 2026-05-31, Continuation: B1 technical fixes

Subagent pass to apply the truly-technical Bucket 1 fixes for TPRM (domain id 19) where the audit pre-specified the targets. Judgment items (module scaffold, capability surface, ownership boundaries) remain deferred per the original Bucket 2 prompt.

### Fixes applied

| ID | Type | Action | Result |
|---|---|---|---|
| B1-H1 | APQC TAGGING | INSERT `handoff_processes` (handoff_id=258, process_id=366, role=`implements`, proposal_source=`agent_curated`, record_status defaulted to `new`) | id 253. Tags AUDIT→TPRM `finding.remediated` to "Oversee and coordinate enterprise risk management activities" (PCF 11.1.2, cross-industry 16445). Additive to the existing `discovery_substring` tag on PCF 12.3.2 "Report audit findings" (id 120). |
| B1-H2 | APQC TAGGING | INSERT `handoff_processes` (handoff_id=278, process_id=167, role=`implements`, proposal_source=`agent_curated`, record_status defaulted to `new`) | id 254. Tags ESG→TPRM `supplier_esg_assessment.score_updated` to "Manage suppliers" (PCF 4.2.5, cross-industry 10280). First tag on this handoff. |

Both inserts went via direct `semantius call crud postgrestRequest` POST (≤3 PATCH/INSERT budget; no loader needed). No JWT-audience errors. Total writes: 2 INSERTs into `handoff_processes`.

Verification (post-load read of `/handoff_processes?handoff_id=in.(258,278)`): 3 rows total for the two handoffs (the new 253 + 254 plus the pre-existing 120). All carry `record_status='new'` per Rule #1.

### Deferred

| ID | Type | Reason for defer |
|---|---|---|
| B1-S1 | STRUCTURAL (new `domain_modules`) | Gated on Bucket 2 #1 (user picks single module vs split). Not technically derivable from existing rows. |
| B1-S2 | STRUCTURAL (new `capabilities` + `capability_domains`) | Capability count cascades off B1-S1. User judgment required. |
| B1-S3 | STRUCTURAL (new system skills + `skill_tools`) | Downstream of B1-S1; no module to attach a skill to. |
| B1-B1 | BOUNDARY (PATCH handoff 258 `target_domain_module_id`) | FK not derivable: TPRM has zero `domain_modules` (verified live: `/domain_modules?domain_id=eq.19` returned `[]`). Becomes technical after B1-S1 lands. |
| B1-B2 | BOUNDARY (PATCH handoff 278 `target_domain_module_id`) | Same as B1-B1. No TPRM module to PATCH the FK to. |
| Modularization shape | MODULARIZATION ISSUES | Listed in Bucket 2 #1; explicitly a refactor conversation, not a direct fix. |

Total deferred: 6 of 8 Bucket 1 items (all gated on Bucket 2 #1 module-shape decision or B1-S1 landing first).

### UI spot-checks

- https://tests.semantius.app/domain_map/handoff_processes (filter handoff_id 258 or 278 to see the new `agent_curated` tags)
- https://tests.semantius.app/domain_map/handoffs (rows 258, 278 still carry `target_domain_module_id=NULL`, expected until B1-S1)
- https://tests.semantius.app/domain_map/domain_modules (filter domain_id=19 still empty, as designed; B1-S1 deferred)

## 2026-05-31, Audit

### Summary

- Current footprint: **0 modules, 0 capabilities, 0 mastered entities, 0 outbound handoffs, 0 trigger events, 0 system skills, 0 roles.** 2 inbound handoffs (258 AUDIT to TPRM, 278 ESG to TPRM), 7 solutions, 4 mandatory regulations, 3 business-function ownership rows (GRC owner, Procurement and Security contributors).
- Domain row metadata: A1 PASSES (all 7 business-meta fields populated: crud_percentage=92, business_logic non-empty, min_org_size="20 s <500", cost_band="$$$", certification_required=false, usa_market_size_usd_m=1000, market_size_source_year=2025).
- Catalog UX fields (A4 / M8): A4 FAILS (catalog_tagline and catalog_description both empty strings); M8 vacuous (zero modules).
- Structural verdict: **catastrophic M1 cascade unchanged from 2026-05-30**. M1 / M2 / M4 / M5 / M6 / M8 fail; M7 vacuous. B-band largely vacuous (B1 passes by leadership-tier exception per SKILL.md B1; B2 / B3 / B4 / B5 / B6 / B7 / B9 / B9b / B11 / B12 vacuous in absence of masters and multi-module surface). B10b FAILS on 2 inbound rows (258, 278) still carrying `target_domain_module_id=NULL`. C1 passes. D1 not blocking. E1 vacuous (no modules to author roles against). F1 passes (no legacy domain-only system skills); F2 / F3 / F5 fail trivially (no `domain_modules`).
- H1 inbound coverage: 2 of 2 cross-domain handoffs tagged in `handoff_processes`. New observation since the 2026-05-31 continuation: handoff 278 now carries a SECOND `agent_curated` row at PCF L4 ("Monitor/Manage supplier information", external_id 10299, process_id 815) in addition to the L3 "Manage suppliers" (process_id 167) recorded in the prior continuation. Author unknown; no other domain audit since 2026-05-31 has touched TPRM. Surfaced as a Bucket 2 question for the user (B2-H1).
- H1 coverage headline (catalog quality): **0 of 4 handoff_processes rows at `record_status='approved'`** across the 2 inbound handoffs. Provenance side-bar (process health): 3 `agent_curated` + 1 `discovery_substring` = 4 tagged rows.
- Bucket 1 (in-scope, agent fixable): 1 item.
- Bucket 2 (surface-for-user, judgment): 10 items (9 carried forward from 2026-05-30 plus B2-H1 on the unexplained PCF 815 row).
- Bucket 3 (Phase 0 pending, speculative): 6 items (unchanged from 2026-05-30).

### Vendor surface basis

No fresh subagent vendor pass run; this Validate b1 is a structural-only re-audit per scope. Vendor basis carries forward from 2026-05-30 (OneTrust TPRM, ProcessUnity, Prevalent, Whistic as flagship pure-plays; Venminder, CyberGRX, Aravo as adjacent; security-ratings overlay BitSight / SecurityScorecard / UpGuard tracked as the `SEC-RATINGS` candidate domain). Two candidate domains remain queued in `audits/_missing-domains.md`: `SEC-RATINGS`, `KYC-KYB`.

### S-band coverage sweep

**S1. Direct FKs to `domains` for id=19:**

| Table | FK column | TPRM rows | Expected non-zero? | Verdict |
| --- | --- | --- | --- | --- |
| `domain_modules` | `domain_id` | 0 | Yes (M1) | FAIL |
| `domain_module_host_domains` | `domain_id` | 0 | No (only if cross-cutting) | pass-vacuous |
| `capability_domains` | `domain_id` | 0 | Yes (A2) | FAIL |
| `solution_domains` | `domain_id` | 7 | Yes (A3) | PASS |
| `domain_regulations` | `domain_id` | 4 | When applicable | PASS |
| `business_function_domains` | `domain_id` | 3 | Yes (C1) | PASS |
| `domain_data_objects` | `domain_id` | 0 | Yes unless leadership tier (B1 exception) | pass-by-exception |
| `handoffs.source_domain_id` | `source_domain_id` | 0 | Yes for any non-leaf | FAIL (deferred; leadership-tier with no masters cannot publish) |
| `handoffs.target_domain_id` | `target_domain_id` | 2 | Yes when applicable | PASS |
| `skills` | `domain_id` | 0 | Yes (F2) | FAIL |

**S2. Per-module coverage:** N/A. No `domain_modules` rows.

**S3. Per-master coverage:** N/A. No `master + required` data_objects.

### Band-level findings

| Band | ID | Verdict | Note |
| --- | --- | --- | --- |
| A | A1 | PASS | All 7 business-meta fields populated. |
| A | A2 | FAIL | 0 `capability_domains`. Gated on Bucket 2 #1 module shape per 2026-05-30. |
| A | A3 | PASS | 7 solutions, 4 primary (OneTrust, ProcessUnity, Prevalent, Whistic). |
| A | A4 | FAIL | `catalog_tagline` and `catalog_description` both empty. Rule #20 says do NOT auto-draft without user approval, so this is a Bucket 2 surface. |
| M | M1 | FAIL | 0 modules. Cascades to M2, M4, M5, M6, M8, F2, F3, F5, B10b cure, B-band fix surface. |
| M | M2 | not-evaluable | Module count 0; capability count 0. |
| M | M4 | vacuous | 0 capabilities to orphan. |
| M | M5 | vacuous | 0 lifecycle states to attribute. |
| M | M6 | vacuous | 0 modules to orphan. |
| M | M7 | PASS-vacuous | 0 masters to clash. |
| M | M8 | FAIL-vacuous | 0 modules; catalog UX fields cannot exist. |
| B | B1 | PASS-by-exception | TPRM is on the SKILL.md B1 leadership-tier exception list. |
| B | B2-B7 | vacuous | No masters. |
| B | B9 | vacuous-by-leadership | 0 outbound handoffs; TPRM publishes nothing because it masters nothing. |
| B | B9b | vacuous | <2 modules. |
| B | B10b | FAIL | Both inbound rows 258, 278 still carry `target_domain_module_id=NULL`. Cure gated on M1. |
| B | B11 | vacuous | No masters. |
| B | B12 | vacuous | No masters. |
| C | C1 | PASS | 1 owner (GRC) + 2 contributors (Procurement, Security). |
| C | C2 | PASS-default | No capabilities; no override rows possible. |
| D | D1 | not-blocking | Domain renders; modules and roles tables empty by construction. |
| E | E1-E5 | vacuous | E1 single-module rule, but the actual module count is zero so role authoring is not yet possible. Cure gated on M1. |
| F | F1 | PASS | No legacy domain-only system skills exist. |
| F | F2 | FAIL | 0 modules and 0 module-level system skills. |
| F | F3 | FAIL | 0 `skill_tools` rows can exist without F2. |
| F | F4 | vacuous | No tool rows to invariant-check. |
| F | F5 | FAIL-uncomputable | Semantius score uncomputable while F2 / F3 are red. |
| H | H1 | PASS-coverage / FAIL-quality | Coverage: 2 of 2 inbound handoffs have at least 1 `handoff_processes` row; outbound coverage N/A (0 outbound). Quality headline: 0 of 4 rows at `record_status='approved'`. |

### Bucket 1 — In-scope confirmed gaps

The only purely-technical fix surface this pass is the prior continuation's residual deferred work, all of which is gated on Bucket 2 #1. There is therefore **only one Bucket 1 item this run**, and it is the one fix the agent can apply without a module decision.

#### Per-bucket-1 finding-type rollup

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 (deferred to Bucket 3 pending Bucket 2 ownership decisions) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M / A / F-band cascade) | 0 in Bucket 1 (all routed to Bucket 2 #1 dependency chain) |
| BOUNDARY (NULL FK on TPRM-side handoffs) | 0 in Bucket 1 (both rows blocked on M1) |
| APQC TAGGING | 1 (push 4 existing rows to `record_status='approved'` is a user decision, not Bucket 1; see Bucket 2 B2-H2) |
| MODULARIZATION ISSUES | 0 (Bucket 2) |
| Catalog UX (Rule #20 author guards) | 0 in Bucket 1 (routes to Bucket 2 #11 since both fields are blank and Rule #20 forbids draft-without-approval) |
| **Total Bucket 1 items** | **1** |

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-H3 | H1 | Handoff 278 has TWO `agent_curated` rows now (PCF 167 L3 "Manage suppliers" and PCF 815 L4 "Monitor/Manage supplier information"). The 2026-05-31 continuation recorded loading only PCF 167. PCF 815 (L4 child of L3 "Manage supplier information / partnerships" cluster) is a finer-grained correct-shape child of the same L3 cluster; per the SKILL.md guidance ("Confident only at L4/L5 with an obvious L2/L3 parent, prefer the parent"), having both is acceptable but the L4 is the redundant row. Recommended action: DELETE the L4 row (process_id 815) to keep the cleaner L3 framing in place. Alternative: keep both. This is borderline-Bucket-1 because the action is deterministic given the rule, but the row's provenance is unknown (the prior continuation did not log it), so surfacing it as B2-H1 first is safer. Listing here as the candidate B1 action for once the user confirms. | DELETE `handoff_processes?id=eq.<id>` for the L4 row, after confirming with user. |

### Bucket 2 — Surface-for-user (judgment calls)

Items 1 through 9 carry forward verbatim from the 2026-05-30 audit (no user response recorded between then and now). Items 10 and 11 are new this pass.

1. **Single module vs split.** (Carry-forward from 2026-05-30 B2-#1.) TPRM market splits roughly into inherent due diligence at onboarding vs ongoing monitoring + issue management. Decision: (a) single `TPRM-VENDOR-RISK-MGMT`, (b) split into `TPRM-VENDOR-DUE-DILIGENCE` + `TPRM-VENDOR-ONGOING-MONITORING`. Load-bearing for B1-S1, A2 capability count, F2 / F3 surfaces, B10b cures, and all of Bucket 3 routing.
2. **`risk_assessments` ownership boundary vs GRC.** (Carry-forward.) GRC masters `risk_assessments` (291). Decision: (a) TPRM masters a new `vendor_risk_assessments`, (b) TPRM consumes GRC's `risk_assessments` with `subject_type='vendor'`, (c) TPRM consumes SUP-LIFE's `supplier_risk_assessments` and the TPRM domain is folded into SUP-LIFE.
3. **`suppliers` vs `vendors` collision (Rule #9).** (Carry-forward.) SUP-LIFE masters `suppliers` (206) with alias "vendor". Decision: (a) TPRM consumes SUP-LIFE's `suppliers`, (b) TPRM masters a separate `third_parties` entity, (c) introduce a `counterparties` MDM master.
4. **`supplier_risk_assessments` (730) ownership — TPRM canonical or SUP-LIFE canonical?** (Carry-forward.) Aliases "TPRM assessment" and "due diligence review" are TPRM-coded but the master sits on SUP-LIFE. Decision: (a) move mastery to TPRM, (b) keep SUP-LIFE mastery and TPRM consumes, (c) rename to `vendor_risk_assessments` and move.
5. **Scope vs SUP-LIFE broadly.** (Carry-forward.) `supplier_onboardings`, `supplier_qualifications`, `supplier_certifications`, `supplier_scorecards` all overlap TPRM specialist surfaces. Decision: (a) SUP-LIFE keeps mastery, TPRM consumes everything (TPRM is a thin overlay), (b) TPRM masters its own assessment + remediation entities and consumes SUP-LIFE masters as `consumer`, (c) fold TPRM into SUP-LIFE with a `SUP-LIFE-RISK` module.
6. **`compliance_risks` (282) vs vendor-risk overlap.** (Carry-forward.) Decision: (a) vendor risk gets its own master `vendor_risk_findings`, (b) TPRM consumes GRC's `compliance_risks` with a vendor discriminator.
7. **`audit_findings` (294) consumed by TPRM.** (Carry-forward.) Handoff 258 fires AUDIT to TPRM with `finding.remediated`. Decision: (a) TPRM consumes `audit_findings` (role=consumer, necessity=optional per Rule #16), (b) handoff is mis-routed and should target GRC or AUDIT itself, (c) handoff is correct and TPRM masters a distinct `vendor_audit_findings`.
8. **DORA scope coverage.** (Carry-forward.) Decision: (a) add `ict_third_party_registers`, `ict_concentration_assessments`, `subcontractor_chains`, (b) treat DORA as scope-creep and drop the `domain_regulations` link, (c) keep regulation linked and defer entities to a dedicated DORA-compliance audit.
9. **`smp_vendor_risk_assessments` (996) duplicate scope vs TPRM.** (Carry-forward.) Decision: (a) keep separate (SMP is SaaS-app-specific), (b) deprecate `smp_vendor_risk_assessments` once TPRM masters vendor-risk, (c) keep both with a documented `consumer` role on TPRM side.
10. **B2-H1 — Handoff 278's unexplained second APQC tag.** The 2026-05-31 continuation logged inserting `agent_curated` rows tagging handoff 258 to PCF 366 ("Oversee and coordinate enterprise risk management activities") and handoff 278 to PCF 167 ("Manage suppliers"). Live state now shows handoff 278 ALSO carrying an `agent_curated` row at PCF 815 ("Monitor/Manage supplier information", L4). The prior continuation did NOT record this load and no intervening session has touched TPRM in `history.md`. Decision: (a) keep both rows (L3 parent and L4 child are mutually consistent), (b) DELETE the L4 row to align with the SKILL.md guidance "prefer the parent for clustering quality", (c) approve both and bump `record_status='approved'` on the cleaner pair (process_id 366 on 258 + process_id 167 on 278) and either drop or also approve PCF 815. Why surface: unexplained provenance + the SKILL.md preference are in mild tension; user picks the resolution.
11. **B2-A4 — Author `catalog_tagline` and `catalog_description` for the TPRM domain row.** Both fields are currently empty strings. Rule #20 forbids drafting these without user approval. Decision: (a) user supplies the wording verbatim, (b) agent drafts a buyer-voice proposal and surfaces for user approval before any PATCH, (c) defer until after Bucket 2 #1 (module shape) lands so the tagline can name the module split correctly. The Rule #20 default is "no auto-draft", so this stays parked until the user gives the green light.

### Bucket 3 — Phase 0 pending (speculative)

Carries forward unchanged from 2026-05-30. All six candidate entities remain blocked until Bucket 2 #1 (module shape) and #2 / #3 / #4 / #5 (ownership boundary with SUP-LIFE and GRC) are resolved.

| ID | Candidate entity | Proposed module (single-module path) | Vendor evidence |
|---|---|---|---|
| B3-1 | `vendor_questionnaires` | TPRM-VENDOR-RISK-MGMT | Universal across OneTrust, ProcessUnity, Prevalent, Whistic, Venminder, CyberGRX, Aravo (SIG / SIG-Lite / CAIQ / VSAQ instances). |
| B3-2 | `vendor_questionnaire_responses` | TPRM-VENDOR-RISK-MGMT | Universal; response artifact distinct from the template. |
| B3-3 | `vendor_tier_classifications` | TPRM-VENDOR-RISK-MGMT | Universal: critical / high / moderate / low tiering drives re-assessment cadence. |
| B3-4 | `vendor_remediations` (or `vendor_remediation_plans`) | TPRM-VENDOR-RISK-MGMT | Universal; distinct from GRC's `remediation_plans` (vendor-scoped, contract-renewal-anchored). |
| B3-5 | `subprocessors` (and `subprocessor_chains` for DORA) | TPRM-VENDOR-RISK-MGMT | Specialist but DORA-mandated (Art. 28); OneTrust + Prevalent expose. |
| B3-6 | `vendor_security_ratings_snapshots` | TPRM-VENDOR-RISK-MGMT | BitSight / SecurityScorecard / UpGuard ingest; distinct from the SEC-RATINGS candidate domain. |

Adjacent candidates parked: `vendor_attestations`, `vendor_contracts` (vs CLM's `contracts`), `vendor_certifications` (vs SUP-LIFE's `supplier_certifications` 498), `vendor_incidents`, `vendor_sla_breaches`, `vendor_breach_notifications`. Defer to a second-pass Phase 0 once the SUP-LIFE / GRC ownership boundary in Bucket 2 #2 to #5 is set.

### Cross-bucket dependencies

- **Bucket 1 B1-H3 is independent.** DELETE of a duplicate APQC tag has no module dependency. The dependency is on user judgment via Bucket 2 #10 (B2-H1) — once that lands, B1-H3 either becomes a definite action or is reclassified as resolved-without-fix.
- **All structural-cure routes (M1, A2, B10b, F2, F3, F5)** remain gated on Bucket 2 #1 (single module vs split).
- **All of Bucket 3** remains gated on Bucket 2 #2 to #5 (ownership boundary with SUP-LIFE / GRC). B3 cannot be moved into Bucket 1 without those answers.
- **Bucket 2 #8 (DORA)** is independent of #1 to #7.
- **Bucket 2 #9 (SMP overlap)** is independent.
- **Bucket 2 #10 (B2-H1)** is independent. Resolves either as B1-H3 fix or as keep-both.
- **Bucket 2 #11 (B2-A4 catalog UX)** has a soft dependency on Bucket 2 #1: the tagline shape changes if the user picks the 2-module split vs the single module. Suggest answering #1 first.

### Per-bucket prompts

**Bucket 1 prompt:** *"Bucket 1 has 1 item this pass (B1-H3, DELETE the L4 APQC tag on handoff 278). Approve? Reply 'apply B1-H3' to delete, or 'skip' to leave both tags in place pending Bucket 2 #10. Note: B1-H3 is contingent on Bucket 2 #10 (the unexplained-provenance question on the same row), so the safer order is to answer #10 first; I have not applied any fix unilaterally."*

**Bucket 2 prompt:** *"What's your call on each of 1 through 11? Items #1 through #9 are unchanged from 2026-05-30 and still parked. Item #1 (single module vs split) remains load-bearing for B1-S1, A2 capabilities, F2/F3 system skills, B10b inbound cures, and the routing for all of Bucket 3. Item #10 (B2-H1) is independent and resolves quickly. Item #11 (B2-A4 catalog UX) only resolves cleanly once #1 lands. If you want a minimum-cost path, answer #1 first, then #10, then everything else cascades."*

**Bucket 3 prompt:** *"Vet via Phase 0 vendor research (focused pull against OneTrust TPRM, ProcessUnity, Prevalent, Whistic docs and confirm the 6 candidates with citations) or eyeball-mode (name which ring true)? Note this requires Bucket 2 #2 to #5 answered first so the agent knows which module owns each candidate."*

### Report-only follow-ups (owed by other domains)

These are blockers for resolution rather than affected-by lists. Each blocking_by entry is a single audit on the partner domain; none of them produce direct catalog rows in this audit.

- **SUP-LIFE (28) owes M1.** Carry-forward. Blocks Bucket 2 #2 / #4 cleanly landing because alternative-mastery proposals need SUP-LIFE modules to host against.
- **GRC (15) owes M1.** Carry-forward. Blocks Bucket 2 #2 (TPRM vs GRC for `risk_assessments`).
- **AUDIT (16) owes M1.** Carry-forward. The B1-H1 APQC tag we proposed stands regardless; AUDIT itself still owes its structural cure for B10b on the producer side of handoff 258.
- **ESG (21) owes M1.** Carry-forward. B1-H2 stands regardless. ESG also owes B10b producer-side on handoff 278.
- **AUDIT B9 candidate handoff.** Symmetric back-channel `vendor_remediation.completed` TPRM to AUDIT once TPRM has remediation entities (B3-4). Surfaces in the AUDIT audit.
- **ESG B9 candidate handoff.** Symmetric back-channel `vendor_risk_assessment.completed` TPRM to ESG. Surfaces in ESG's audit.
- **SUP-LIFE B9.** If TPRM consumes `supplier_risk_assessments` (Bucket 2 #4 option b), a third fan-out from SUP-LIFE's existing `supplier_risk_assessment.completed` to TPRM is the candidate. Surfaces in SUP-LIFE's audit.

### UI spot-checks

- https://tests.semantius.app/domain_map/domains (id 19 — confirm `catalog_tagline` and `catalog_description` are empty)
- https://tests.semantius.app/domain_map/domain_modules (filter domain_id=19, still empty; M1 unresolved)
- https://tests.semantius.app/domain_map/capability_domains (filter domain_id=19, still empty; A2 unresolved)
- https://tests.semantius.app/domain_map/handoffs (rows 258, 278 still carry `target_domain_module_id=NULL`, B10b unresolved; expected until M1 is cured)
- https://tests.semantius.app/domain_map/handoff_processes (filter handoff_id 278 to see the extra PCF 815 row that triggers B2-H1)
- https://tests.semantius.app/domain_map/solutions (TPRM-linked solutions 16, 87, 88, 98, 99, 100, 101 unchanged)

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

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass (Rule #21) over TPRM's open state items. No fresh from-scratch audit.
Live verification 2026-06-07 (domain id 19) confirmed the snapshot: TPRM is still UNBUILT
(0 `domain_modules`, 0 `capability_domains`, 0 TPRM-mastered `data_objects`, 0 `skills`). The only
catalog footprint remains 2 inbound handoffs (258 AUDIT to TPRM, 278 ESG to TPRM, both still
`target_domain_module_id=NULL`), each already carrying `agent_curated` APQC tags, plus the prior
solutions / regulations / business-function rows. C1 is already satisfied (3
`business_function_domains` rows: owner Governance/Risk/Compliance bf31, contributors Procurement
bf19 and Security bf28), so no C1 insert was owed. Per the UNBUILT LEAVE rule the build is surfaced
(it is the B2-1 user decision), not scaffolded, and the whole b1b M-band cascade is left blocked.

### Executed (agent-finished, record_status preserved)

| Type | Table | Count | Detail |
|---|---|---|---|
| Catalog UX (Rule #20, was B2-A4) | `domains` | 1 PATCH | Authored buyer-voice `catalog_tagline` + `catalog_description` on the empty TPRM domain row (id 19). Empty-guard + em-dash-guard in the loader; never overwrote a non-empty value. No vendor/product names (Rule #18); DORA referenced as an allowed statutory framework. `record_status='new'` unchanged. Loader: `.tmp_deploy/2026-06-07_tprm_catalog_ux.ts`. |

The former B2-A4 "surface-before-write" gate was overridden per the Rule #21 catalog-UX directive
(author and write empty catalog copy directly). No modules exist, so no module-grain catalog copy
was owed.

### Surfaced (not written; user decision or destructive)

- **B2-1** (load-bearing): single `TPRM-VENDOR-RISK-MGMT` vs split into `TPRM-VENDOR-DUE-DILIGENCE`
  + `TPRM-VENDOR-ONGOING-MONITORING`. Gates the whole build and every b1b cure.
- **B2-2..B2-7**: ownership-boundary calls against GRC (`risk_assessments`, `compliance_risks`),
  SUP-LIFE (`suppliers`, `supplier_risk_assessments`, broad overlap), and AUDIT (`audit_findings`
  routing for handoff 258, which gates B1B-B10b-258).
- **B2-8** (DORA scope), **B2-9** (`smp_vendor_risk_assessments` overlap): independent decisions.
- **B2-H1 (DESTRUCTIVE)**: handoff 278 carries a second `agent_curated` APQC tag (PCF 815, L4,
  `handoff_processes` id 705) on top of the documented L3 tag (PCF 167, id 254). Unknown provenance.
  SKILL-preferred shape is to DELETE id 705 (keep the cleaner L3), but the DELETE is destructive and
  the surprise provenance warrants explicit sign-off, so it was NOT executed. This subsumes the
  former B1A-H3 (the DELETE action).
- **Personas / RACI (Phase P)**: DEFERRED. UNBUILT (0 modules), so no module surface to author
  against. Candidate personas once built: Vendor Risk Analyst, Third-Party Risk Manager,
  Procurement Risk Reviewer, InfoSec Vendor Assessor.

### Left (untouched)

- **b1b** (S1 build, A2 capabilities, B10b-258, B10b-278): all blocked on B2-1 / on B1B-S1 landing
  first. UNBUILT cascade left in place, not scaffolded.
- **B1A-BUILD**: surfaced as the build decision (= B2-1 + ownership boundary); not auto-built.
- **b3** (B3-1..B3-6 candidate entities): Phase 0 backlog, blocked on B2-1 and the ownership
  boundary; non-blocking, never gates finished.
- Supersession header (per-domain-skill restoration, 2026-06-06): preserved in both state.yaml and
  this file. Retired skill-grain / `skill_tools` / per-module-skill items are not re-opened.

### UI spot-checks

- https://tests.semantius.app/domain_map/domains (id 19 - `catalog_tagline` + `catalog_description` now populated)
- https://tests.semantius.app/domain_map/domain_modules (filter domain_id=19, still empty; build deferred to B2-1)
- https://tests.semantius.app/domain_map/handoff_processes (filter handoff_id=278 to see PCF 167 id 254 + the surfaced PCF 815 id 705)
- https://tests.semantius.app/domain_map/handoffs (rows 258, 278 still `target_domain_module_id=NULL`, expected until M1)

### Post-fix status

`next_action_by: user`. The agent has executed everything it can on an UNBUILT domain (catalog UX
copy). All remaining progress is gated on the B2-1 module-shape decision and the B2-2..B2-7
ownership-boundary calls; B2-H1 awaits a destructive-DELETE sign-off.

## 2026-06-13 - B9d verify executed (B1A-B9D-VERIFY resolved)

Ran the single open agent-executable item, B1A-B9D-VERIFY, via
`bun run scripts/analytics/b9d_resolver.ts TPRM` (dry-run then `--write`). The resolver classifies
every handoff payload on every boundary in BOTH directions. TPRM is a leaf consumer (UNBUILT: 0
modules, masters nothing, publishes nothing), so its only boundaries are the two inbound handoffs.

### Resolver output (both directions, both boundaries)

- boundary tags: 4 | distinct (process, owner) findings: 4 | verdicts: 4 UNOWNED.

| Boundary | Payload | PCF tags | Owner (legacy DDO master) | Verdict |
|---|---|---|---|---|
| 258 AUDIT (16) -> TPRM (19) | `audit_findings` (294) | 11.1.2 "Oversee enterprise risk mgmt" (pid 366); 12.3.2 "Report audit findings" (pid 389) | AUDIT (16), UNBUILT | UNOWNED (symptom of unbuilt owner) |
| 278 ESG (21) -> TPRM (19) | `supplier_esg_assessments` (327) | 4.2.5 "Manage suppliers" (pid 167); 4.2.5.1 "Monitor/Manage supplier information" L4 (pid 815) | ESG (21), UNBUILT | UNOWNED (symptom of unbuilt owner) |

### Why UNOWNED, not ORPHAN, and why no owner-side b2 was written

The resolver reads ownership from the module-grain `domain_module_data_objects` junction only. Both
carried entities DO have a canonical `master` row, but at the legacy `domain_data_objects` grain
(`audit_findings` -> AUDIT 16; `supplier_esg_assessments` -> ESG 21, both verified live). Both owners
are UNBUILT (0 `domain_modules`, hence 0 DMDO master rows), so the resolver reports "no master".
This is a symptom of the unbuilt owners, NOT a coverage gap on TPRM: each payload resolves to
RESOLVED/owned automatically once its owner builds.

Both owners have ALREADY dispositioned these exact payloads in their own 2026-06-13 B9d passes:
- **AUDIT** (state.yaml, 2026-06-13): "The UNOWNED findings on AUDIT-owned payloads (audit_findings,
  ...) are a symptom of the unbuilt state, already covered by B1A-BUILD / B1B-MOD1."
- **ESG** (history.md, 2026-06-13): "5 UNOWNED ... PCF 167 ... 815 carry ESG's own entities
  (supplier_esg_assessments ...). These read as 'no master row anywhere' ONLY because ESG is unbuilt
  ... All five resolve to RESOLVED/owned automatically once ESG is built ... left for the build."

So no new `B2-B9D-OWN-*` item is owed on either owner (each has folded these into its own build), and
writing duplicates would conflict with their finalized (`next_action_by: user`) state. The `--write`
run applied ZERO owner-file edits and ZERO catalog writes (intended owner-file edits: "(none)"). No
ROLL-UP re-point and no MIS-TAG delete arose from B9d: the PCF-815 L4 tag stays the separate,
already-surfaced destructive user decision B2-H1, not a B9d finding. No `record_status` touched
(Rule #1).

### Other bands

TPRM remains UNBUILT (verified live 2026-06-13: `/domain_modules?domain_id=eq.19` -> `[]`). The M1
cascade is unchanged; every band below M stays non-evaluable and the build is surfaced (B2-1), not
scaffolded, per the Rule #21 LEAVE rule for unbuilt domains. No fresh from-scratch audit was run;
this was a state-driven execute pass over the one open agent-executable item.

### JWT / PGRST errors

None. No schema-cache refresh needed.

### Post-fix status

`next_action_by: user`. B1A-B9D-VERIFY is resolved and removed from `state.yaml`. The agent has now
executed everything it can on this UNBUILT domain. All remaining work is the B2-1 module-shape
decision, the B2-2..B2-9 ownership-boundary calls, and the destructive B2-H1 (PCF-815 DELETE)
sign-off, plus the b3 backlog. None are agent-executable while UNBUILT. The current `q-TPRM.md`
(q1..q11) covers all of them and is unchanged.

## 2026-06-19 - Phase 0 (module-shape reversal)

Fresh vendor-surface study of 7 flagships (Prevalent, OneTrust, ServiceNow VRM/TPRM, Venminder, ProcessUnity/CyberGRX, BitSight/SecurityScorecard/UpGuard, Archer) saved at .tmp_deploy/TPRM-phase0-2026-06-19.md. REVERSED B2-1 module shape from single / 2-module to a 5-module recommendation (Onboarding & Intake, Due Diligence & Assessment, Continuous Monitoring, Remediation & Issue Management, Supply-Chain / Nth-Party Risk) with named-vendor evidence; the 2-module and single options retained. Confirmed (no reversal) B2-2=a, B2-3=b (broad third_parties master that consumes SRM suppliers), B2-5=b; enriched B2-8 (DORA ict_provider_registers + subcontracting_chains are genuine TPRM masters in the supply-chain module). M7 naming guards: third_party_assessments, third_party_remediation_plans, monitoring_signals. Proposed master count 28. q-TPRM.md q1 regenerated. Still feedback_needed; build gated on B2-1.

## 2026-06-19 - a-TPRM.md processed

Processed the answered companion file (Rule #22). ZERO catalog writes; deleted nothing in the catalog. TPRM still UNBUILT (verified live this pass: 0 domain_modules, 0 mastered data_objects, 0 capability_domains for domain_id=19).

- **a1 = a DECIDED (former B2-1 resolved -> moved here).** Five modules: TPRM-ONBOARDING-INTAKE, TPRM-DUE-DILIGENCE, TPRM-CONTINUOUS-MONITORING, TPRM-REMEDIATION, TPRM-SUPPLY-CHAIN-RISK. No catalog write (unbuilt); the build proceeds once the boundary cluster is settled. B2-1 removed from state.yaml.
- **Boundary questions researched + kept OPEN (a2/a3/a5/a6/a9 were questions, not decisions -> Rule #22 keeps them open).** They are facets of ONE entangled SRM/TPRM/vendor/supplier/third-party boundary decision. Resolved the user's core confusion with named-vendor evidence: vendors and suppliers OVERLAP but are NOT identical; a supplier is a procurement counterparty (PO/AP record), a third party is ANY external risk-introducing party, so suppliers are a SUBSET of third parties (Panorays "TPRM is the umbrella, VRM/SRM the procurement-anchored subset"; ProcessUnity "third-party is the catch-all"; Archer/OneTrust/CyberGRX key inventory on the broad third party; SAP Ariba/Coupa/Ivalua risk-manage the procurement SUPPLIER = the SRM lane). Folded into the b2 cluster, each item now carries the named-vendor evidence in its `evidence:` field. Recommendations: B2-2=a (own third_party_assessments), B2-3=b (master broad third_parties, CONSUME SRM suppliers), B2-5=b (peer-master, NOT fold-into-SRM; reassured a5 that c was never recommended), B2-6=a (own third_party_risk_findings), B2-9=c (SMP embedded_masters TPRM third_parties identity but keeps its app-specific slice).
- **a4 = a recorded as a LEANING, NOT executed.** Moving `supplier_risk_assessments` (730) mastery out of SRM-RISK-COMPLIANCE would undo part of the just-built SRM and cannot run while TPRM has no module. B2-4 kept open; the recommended call is b (SRM keeps 730, TPRM masters its own distinct third_party_assessments). Noted explicitly that a move needs confirmation in the full boundary context.
- **a10 EMPTY -> B2-H1 NOT deleted.** An empty answer is not an explicit yes to a destructive DELETE. Kept B2-H1 open (handoff_processes id 705, process_id 815, L4 on handoff 278; verified live still present at record_status='new' alongside the L3 row id 254 / process_id 167). Re-surfaced in the q-file as an explicit yes/no.
- **a7 = a, a8 = a: DECIDED-but-DEFERRED build steps.** Recorded as b1b items (B1B-A7-AUDIT-FINDINGS-CONSUME: TPRM consumes audit_findings tied to remediation; B1B-A8-DORA-ENTITIES: author DORA records). Former B2-7 and B2-8 removed from state.yaml. Both deferred until a module exists. Handoff routing now decided: 258 -> TPRM-REMEDIATION, 278 -> TPRM-CONTINUOUS-MONITORING.
- **a11 = yes: build draft produced.** `.tmp_deploy/TPRM-phaseB-draft-2026-06-19.md` maps the 5 modules + 28 masters to modules with role + necessity (Rule #16: statute-prefixed/sector-bound -> optional) + one-line purpose, marking the masters whose ownership is CONTINGENT on the boundary decision (third_party_assessments, third_parties, third_party_risk_findings, the 730 move). b3 candidates remapped to their real modules/master names; loaded during the build, not now (draft-don't-load).
- Deleted a-TPRM.md and the now-stale q-TPRM.md projection; regenerated a fresh q-TPRM.md (taxonomy clarification first, then the boundary cluster re-posed with vendor-grounded Recommended lines, then the B2-H1 delete yes/no, then the build-on-approval summary under Optional). Ran qfile_grounding_lint.ts TPRM (clean). Status stays feedback_needed / user.

## 2026-06-19 - a-TPRM.md processed: TPRM built

Processed the answered companion file (Rule #22). TPRM (domain id 19) is now BUILT: the boundary cluster is settled and the full build landed. Loader: `.tmp_deploy/load_tprm_2026_06_19.ts` (idempotent). No `record_status` touched (Rule #1); no vendor names (Rule #18); no em-dashes; all `notes` left empty (Rule #15).

### Boundary settled

- **a1 = b**: TPRM masters a broad `third_parties` record and CONSUMES SRM `suppliers` (suppliers are a subtype/source, not a re-master). 5-module shape (former B2-1) was already decided.
- **a2 = a**: TPRM masters its own `third_party_assessments`, distinct from GRC `risk_assessments` and SRM `supplier_risk_assessments`.
- **a3 = b**: SRM keeps `supplier_risk_assessments` (730, still SRM master, verified live); TPRM masters its own distinct `third_party_assessments`. No move.
- **a4 = a (leaning) NOT executed**: moving 730 mastery to TPRM would undo part of the just-built SRM-RISK-COMPLIANCE; the recommended call b prevailed (SRM keeps 730). The 730 move is a fresh destructive decision if the user ever wants it; not done.
- **a6 = yes**: DELETED `handoff_processes` id 705 (handoff_id=278, process_id=815, the L4 PCF tag) after verifying it matched. The L3 row id 254 (process_id 167) is intact.
- **a7 = yes**: built the 5-module domain from the draft.

### Built (all agent-finished, record_status='new')

| Item | Detail |
|---|---|
| 5 full modules | TPRM-ONBOARDING-INTAKE (411), TPRM-DUE-DILIGENCE (412), TPRM-CONTINUOUS-MONITORING (413), TPRM-REMEDIATION (414), TPRM-SUPPLY-CHAIN-RISK (415); each with buyer-voice catalog_tagline + catalog_description (Rule #20). |
| 28 TPRM masters | data_object ids 1318-1345. Per-module master counts: 411=7, 412=10, 413=3, 414=3, 415=5. All M7-clean (each has exactly one master row, in TPRM; verified catalog-wide). entity_type classified on all 28 (B13 clean; no unclassified). necessity per Rule #16 (statute/sector-bound DORA/HIPAA/GDPR/PCI/financial-regulator masters -> optional). Pattern flags: risk_acceptances has_single_approver, third_party_contacts has_personal_content. |
| 7 consumer rows | suppliers (206) on ONBOARDING-INTAKE + SUPPLY-CHAIN-RISK; compliance_controls (283) + control_assessments (284) on DUE-DILIGENCE; audit_findings (294) + compliance_risks (282) on REMEDIATION; supplier_esg_assessments (327) on CONTINUOUS-MONITORING. All role=consumer, never master (M7 holds: each of these is mastered elsewhere or by an unbuilt owner). |
| 8 capabilities | + capability_domains (8) + domain_module_capabilities (8). |
| Domain skill | id 479, skill_name='tprm', skill_type='domain', domain_id=19, non-empty description + trigger_keywords (Rule #17). |
| Tools | 18 tools + 23 domain_module_tools; each module carries >=1 query + >=1 mutate + >=1 workflow-gate, plus notify_person/notify_team. |
| 5 aliases | "third party risk", "vendor risk management", "VRM", "supplier risk", "TPRM". |
| Inbound handoff FKs | PATCHed 258 target_domain_module_id -> 414 (TPRM-REMEDIATION, audit_findings); 278 -> 413 (TPRM-CONTINUOUS-MONITORING, supplier_esg_assessments). Both record_status untouched. |

Domain metadata (Rule #8) + catalog copy were already complete from the 2026-06-07 pass, so NO domain PATCH and NO catalog-copy confirmation block was owed. DORA (regulation 19) is already linked via domain_regulations (plus ISO 27001, NIST CSF, NIS2), so no missing regulation rows.

### Notes on consumed entities whose owners are unbuilt

`audit_findings` (AUDIT), `supplier_esg_assessments` (ESG), `compliance_controls` / `control_assessments` / `compliance_risks` (GRC) currently have NO master row in `domain_module_data_objects` (their owner domains are unbuilt). TPRM adds only `consumer` rows for them, which is valid (consumer does not require a present master) and M7-coherent (TPRM never masters what it consumes). `contracts` and `risk_categories` do NOT exist as `data_objects` at all (CLM unbuilt; no GRC risk-taxonomy object), so no consumer row could be authored for them; the loader skipped them and logged it. When those owners build, the consumer rows resolve to RESOLVED/owned automatically.

### Resolved -> history (removed from state.yaml)

B1A-BUILD, B1B-S1, B1B-A2, B1B-A7-AUDIT-FINDINGS-CONSUME, B1B-A8-DORA-ENTITIES, B1B-B10b-258, B1B-B10b-278, B2-2, B2-3, B2-4, B2-5, B2-6, B2-H1, and all b3 candidates (built into the 28 masters).

### Kept OPEN

**B2-9** (SMP relationship). a5/a9 asked "when both are installed would I have one table or two, and which domain owns it?" Answered in the regenerated q-file and state.yaml: with the embedded_master shape (option c, recommended) there is ONE logical `third_parties` table mastered by TPRM; SMP's local shell defers to TPRM when both are installed; you get two only if SMP is installed without TPRM. The assessment slices stay separate (TPRM's `third_party_assessments` vs SMP's `smp_vendor_risk_assessments`). It is an SMP-side embedded_master row addable after this build; non-blocking for TPRM. Status stays feedback_needed for it.

### Queued b1b follow-ups (non-blocking, next audit)

B1B-LIFECYCLE-STATES (author data_object_lifecycle_states on the 9 operational_workflow masters; B12), B1B-PERSONAS-RACI (Phase E/P personas: Vendor Risk Analyst, Third-Party Risk Manager, Procurement Risk Reviewer, InfoSec Vendor Assessor), B1B-OUTBOUND-HANDOFFS (B9 symmetric back-channels: vendor_remediation.completed -> AUDIT, vendor_risk_assessment.completed -> ESG).

### Closeout

Deleted a-TPRM.md. Regenerated a fresh q-TPRM.md carrying ONLY B2-9 (with a5's answer folded into the Recommended line). Ran `qfile_grounding_lint.ts TPRM` (clean). Status: feedback_needed / user (B2-9 open).
