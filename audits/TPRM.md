---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 23
---

# TPRM — Audit History

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
