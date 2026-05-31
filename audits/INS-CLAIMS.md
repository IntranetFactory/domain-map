---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 34
---

# INS-CLAIMS (Insurance Claims Management) , Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 10 master `data_objects` (insurance_claims, insurance_policies, policy_coverages, loss_incidents, claim_adjuster_assignments, claim_settlements, claim_payments, salvage_recovery_records, subrogation_cases, siu_cases) sitting on `domain_data_objects` only. **0 `domain_modules`**, **0 `capabilities`**, **0 `domain_module_data_objects`**, **0 `data_object_lifecycle_states`**, **0 `data_object_aliases`**, 11 `domain_regulations` (mandatory: GDPR, AMLD6, Solvency II, IFRS 17, DORA, SFDR, eIDAS, IDD, GLBA, BSA, FATCA), 5 `solutions` (3 primary: Guidewire ClaimCenter, Duck Creek Claims, Sapiens IDIT; 2 secondary: Salesforce FSC, ServiceNow FSO), 12 `trigger_events`, 7 outbound + 1 inbound `handoffs` (all 8 with NULL module FKs on both sides), 2 `data_object_relationships` (both edges to `customer_cases`), 1 legacy domain-level system skill (`ins-claims-system`, id 71) with 12 `skill_tools` (11 platform + 1 external `execute_payment`). 0 `business_function_capabilities`, 0 roles, 0 `handoff_processes` tags.
- Vendor surface basis (flagship vendors): Guidewire (ClaimCenter), Duck Creek (Claims), Sapiens (IDIT), Insurity, Origami Risk, Snapsheet (P&C digital claims specialist), Shift Technology (fraud-detection specialist, anchors AMLD6 / NAIC Model #880 leg).
- Domain Semantius score (strict, current legacy skill): 11/12 platform = **92%**. The 1 non-platform tool is `execute_payment` (id 43, `coverage_tier=external`, `side_effect`, required). Score becomes uncomputable per-module once the M-band fix lands (zero modules today, so F5 has no module-level denominator).
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 8 items.
- **Bucket 3 (Phase 0 pending, speculative):** 12 items.

**Structural-pass status.** INS-CLAIMS is a structurally incomplete legacy load. The M-band is a hard fail (M1: zero `domain_modules`), which cascades down: A2 fails (zero capabilities), every B-band check that depends on module attribution fails or is vacuously true, B10b is universally NULL across all 8 handoffs (the source side cannot be attributed because INS-CLAIMS has no modules; 3 of the 4 target domains, ERP-FIN / GRC, also lack modules, so the target side cannot be attributed either), B12 fails on every master (zero lifecycle states), B11 fails on every master (zero aliases), F1 keeps the legacy domain-level skill but F2 has no module set to test, H1 fails (zero APQC tags on 8 cross-domain handoffs), and E1 vacuously passes only because there is no module surface to bundle roles against. **Resolve M1 + A2 + Phase B re-load before anything below the M-band can be re-audited cleanly.** This audit lists the structural fixes as Bucket 1 items and queues the larger market-shape decisions (modularization split, full Phase 0 vendor research) into Bucket 2 + Bucket 3.

### Vendor surface basis

P&C and life claims platforms chosen for the flagship enumeration: Guidewire ClaimCenter (industry-leader; Reference schema for Claim, Exposure, Activity, Payment, Recovery, Subrogation, SIU), Duck Creek Claims (mid-market P&C, plug-in to Duck Creek Policy/Billing), Sapiens IDIT Claims (life + P&C breadth), Insurity (legacy P&C and program-business), Snapsheet (digital-FNOL specialist, mobile-first), Shift Technology (fraud-detection specialist; anchors the AMLD6 / state-DOI Model #880 leg). Excludes vertical-shaped CRM overlay platforms (Salesforce FSC, ServiceNow FSO) for the entity surface, but both keep `secondary` rows in `solution_domains` because they are real cross-sell into claims contact-center surfaces. All six pure-plays cover FNOL through closure; Shift anchors the regulated fraud leg.

### Pass 1 , Structural findings

#### S. Coverage sweep

**S1. FKs to `domains`.** Every count uses `domain_id=eq.44`.

| Table | FK column | INS-CLAIMS rows | Expected non-zero? |
|---|---|---|---|
| `business_function_domains` | `domain_id` | 2 | yes (pass) |
| `capability_domains` | `domain_id` | **0** | yes (FAIL, routes to A2 / M4) |
| `domain_data_objects` | `domain_id` | 10 | yes (pass, all master+required) |
| `domain_modules` | `domain_id` | **0** | yes (FAIL, routes to M1) |
| `domain_module_host_domains` | `domain_id` | 0 | optional (pass by exception) |
| `domain_regulations` | `domain_id` | 11 | applicable (pass) |
| `solution_domains` | `domain_id` | 5 | yes (pass) |
| `handoffs.source_domain_id` | `source_domain_id` | 7 | yes (pass) |
| `handoffs.target_domain_id` | `target_domain_id` | 1 | applicable (pass) |
| `skills.domain_id` (legacy) | `domain_id` | 1 | transitional (will fail F2 once modules exist) |

**S2. Per-module coverage.** Vacuous: zero modules.

**S3. Per-master indirect-table coverage.**

| data_object | states | events | aliases |
|---|---|---|---|
| insurance_claims (623) | 0 | 2 (fnol_received, closed) | 0 |
| insurance_policies (624) | 0 | 2 (bound, cancelled) | 0 |
| policy_coverages (625) | 0 | 1 (changed) | 0 |
| loss_incidents (626) | 0 | 1 (reported) | 0 |
| claim_adjuster_assignments (627) | 0 | 1 (assigned) | 0 |
| claim_settlements (628) | 0 | 1 (approved) | 0 |
| claim_payments (629) | 0 | 1 (issued) | 0 |
| salvage_recovery_records (630) | 0 | 1 (posted) | 0 |
| subrogation_cases (631) | 0 | 1 (opened) | 0 |
| siu_cases (632) | 0 | 1 (opened) | 0 |

Every master fails S3 on both states and aliases. Routes to B12 (lifecycle) and B11 (aliases).

#### A. Phase A (market shape)

- **A1 , domain metadata.** All seven business-metadata fields present and plausible (`crud_percentage=70`, `business_logic` populated, `min_org_size=30 m <2500`, `cost_band=$$$$$`, `certification_required=true`, `usa_market_size_usd_m=3500`, `market_size_source_year=2025`). **However**, `domains.business_logic` contains a U+2014 em-dash, violating the project no-em-dash rule. Source text: `"Adjudication rules engine, fraud detection, and reserve calculations , the irreducible insurance kernel; FNOL and case workflow are declarative."` → see B1-A1.
- **A2 , capabilities.** **FAIL.** Zero `capability_domains` rows. Every flagship vendor markets 5 to 8 capabilities for claims (FNOL intake, coverage verification, adjuster assignment, reserve management, settlement adjudication, payment disbursement, salvage and subrogation recovery, SIU and fraud detection). Routes to B1-A2.
- **A3 , solutions.** Pass. 5 rows, 3 `primary` (Guidewire ClaimCenter, Duck Creek Claims, Sapiens IDIT), 2 `secondary` (Salesforce FSC, ServiceNow FSO). Missing flagship coverage for Insurity, Snapsheet, Shift Technology, Origami Risk: surfaced as B1-A3.
- **A4 , catalog UX fields.** Both `catalog_tagline` and `catalog_description` are empty strings. Routes to B1-A4.

#### M. Phase M (modules)

- **M1 , domain has at least one module.** **HARD FAIL.** Zero `domain_modules` rows for `domain_id=44`. The domain is fully un-modularized; every downstream concern (DMDOs, lifecycle prefixing, role bundling, system skill anchoring) is blocked. Routes to B1-M1.
- **M2 / M4 / M5 / M6 / M7.** Vacuous (no modules). M7 catalog-wide check verified: every master (623 to 632) appears only in `domain_data_objects` for INS-CLAIMS; no other domain masters these data_objects. Single-master invariant holds at the catalog level.

#### B. Phase B (data-object footprint)

- **B1 , at least one master.** Pass (10 masters).
- **B2 , singular and plural labels.** Pass on every master.
- **B3 , naming arbitration.** Pass on every master (every name is prefixed: `insurance_*`, `policy_*`, `claim_*`, `loss_*`, `salvage_*`, `subrogation_*`, `siu_*`). No bare-word collisions.
- **B4 , pattern flags considered.** Not re-evaluated for any master. **Likely true** on `siu_cases.has_personal_content` (privacy-sensitive investigative records), `claim_settlements.has_single_approver` (a single approver typically signs off, with override paths), and `claim_payments.has_submit_lock` (issued payment is immutable post-issuance). Routes to B1-B4.
- **B5 , embedded_master integrity.** Vacuous (no embedded_master rows; no DMDOs at all).
- **B6 , intra-domain data_object_relationships.** **FAIL.** Only 2 rows in `data_object_relationships` and both are cross-domain (`insurance_claims opens customer_cases`, `insurance_policies opens customer_cases`). Zero intra-domain edges between INS-CLAIMS masters. Missing minimum graph: `insurance_policies covered_by policy_coverages`, `insurance_policies subject_of loss_incidents`, `loss_incidents reported_as insurance_claims`, `insurance_claims assigned_to claim_adjuster_assignments`, `insurance_claims resolved_by claim_settlements`, `claim_settlements disbursed_via claim_payments`, `insurance_claims investigated_by siu_cases`, `insurance_claims pursues subrogation_cases`, `insurance_claims recovers_via salvage_recovery_records`. Routes to B1-B6.
- **B7 , users edges.** **FAIL.** Zero edges to `users` (id 748). Every master has at least one user-typed actor: `insurance_claims` (claim_owner / submitter), `insurance_policies` (servicing_agent), `loss_incidents` (reporter), `claim_adjuster_assignments` (adjuster), `claim_settlements` (approver), `claim_payments` (issuer), `salvage_recovery_records` (recovery_specialist), `subrogation_cases` (subrogation_specialist), `siu_cases` (investigator). Routes to B1-B7.
- **B8 , outbound cross-domain relationships.** **FAIL.** The 7 outbound handoffs imply payload-to-target relationship rows: `insurance_claims opens customer_cases` (rows 464 and 465 already exist), `claim_payments posts_to journal_entries / gl_postings` on ERP-FIN side (no ERP-FIN payload data_object available; ERP-FIN has no modules yet), `claim_settlements posts_to gl_postings` (same blocker), `salvage_recovery_records posts_to gl_postings` (same blocker), `siu_cases escalates_to investigations` (no GRC payload data_object available; GRC has no modules), `insurance_policies notifies customer_cases` (CSM side). The mappable rows are `insurance_policies cancelled.notifies customer_cases` (CSM CSM-CASE-MGMT). Routes to B1-B8.
- **B9 , outbound trigger_events plus handoffs.** Pass on event coverage (12 trigger_events cover the lifecycle), pass on handoff existence (7 outbound rows), but every row has both `source_domain_module_id` and `target_domain_module_id` NULL. Routes to B10b (the modularization gate; covered in B1-M1 cascade plus B1-B10b note). Trigger event `insurance_policy.bound` (1031), `policy_coverage.changed` (1033), `loss_incident.reported` (1034), `claim_adjuster.assigned` (1035), `subrogation_case.opened` (1039) have zero subscribers. Some are reasonably leaves (`policy_coverage.changed`, `claim_adjuster.assigned` are internal-only events that no other domain subscribes to as of today), but `insurance_policy.bound` ought to fan out to INS-BILLING (not in catalog yet, queued) and possibly REINSURANCE-MGMT (queued). Surface as B1-B9.
- **B9b , intra-domain cross-module handoffs.** Vacuous (no modules; will become a major Phase-B re-load when modules ship).
- **B10 , inbound handoffs (REPORT-ONLY).** 1 row: TELEMATICS `dashcam_event.collision` (event 302) into INS-CLAIMS payload `dashcam_events`. Pass for INS-CLAIMS as a domain (the source domain TELEMATICS owns the publishing edge). The payload `dashcam_events` is itself a TELEMATICS-owned data_object (kind=domain_owned, id 378), not an INS-CLAIMS data_object. INS-CLAIMS has zero consumer / embedded_master rows on `dashcam_events`, so the B10 reading is "I receive an event but the payload is not declared as a dependency on my side". Routes to B1-B10 (loading the consumer DMDO once INS-CLAIMS has a module to host it).
- **B10b , per-module attribution on handoffs.** **FAIL.** All 8 cross-domain handoffs (7 outbound + 1 inbound) have NULL `source_domain_module_id` and NULL `target_domain_module_id`. Outbound side cannot be attributed because INS-CLAIMS has no modules. Of the targets, only CSM has modules; ERP-FIN (id 65), GRC (id 15), and TELEMATICS (id 148) all have zero `domain_modules` rows, so target attribution is blocked on their side too. Routes to B1-M1 plus a cross-domain report-only note for ERP-FIN, GRC, and TELEMATICS.
- **B11 , aliases.** **FAIL** on every master. Industry / vendor terminology spans: `insurance_claims` (Claim, Loss, Notice of Loss), `insurance_policies` (Policy, Contract of Insurance), `policy_coverages` (Coverage, Endorsement Coverage, Insuring Agreement), `loss_incidents` (Loss Event, Incident, Occurrence), `claim_adjuster_assignments` (Adjuster Assignment, Examiner Assignment, Handler Assignment), `claim_settlements` (Settlement, Disposition, Award), `claim_payments` (Indemnity Payment, Loss Payment, Disbursement), `salvage_recovery_records` (Salvage, Recovered Property), `subrogation_cases` (Subrogation File, Recovery Case), `siu_cases` (SIU Case, Special Investigation File, Fraud Case). Routes to B1-B11.
- **B12 , lifecycle states.** **FAIL** on every workflow-bearing master. Zero `data_object_lifecycle_states`. The visible workflow events name the states already: `insurance_claims` should carry at least (Reported, FNOL Received, Assigned, Under Investigation, Settled, Closed, Denied, Withdrawn). `insurance_policies` should carry (Quoted, Bound, In Force, Lapsed, Cancelled, Reinstated, Expired). `claim_settlements` (Drafted, Pending Approval, Approved, Rejected, Issued). `claim_payments` (Pending, Issued, Voided, Reissued). `siu_cases` (Open, Investigating, Substantiated, Unsubstantiated, Referred to Law Enforcement, Closed). `subrogation_cases` (Open, In Recovery, Recovered, Closed Unrecovered). `salvage_recovery_records` is plausibly config-shape (recovery ledger entry, no workflow). Routes to B1-B12.

#### C. Phase C (functional ownership)

- **C1 , at least one owner.** Pass (Business Operations = owner, Finance = contributor). The owner mapping is plausible (Claims falls under Business Operations in many P&C carriers), though Risk and Compliance would be a closer canonical owner in some org shapes. Surface as B2 judgment item.
- **C2 , business_function_capabilities overrides.** Vacuous (zero capabilities).

#### E. Phase E (roles)

- **E1.** Vacuous. Zero modules means the 2-module floor on roles blocks role authoring anyway. Single-module-domain exception applies, except the domain has zero modules, so even the single-module case fails for now.

#### F. Phase F (skill layer)

- **F1 , no legacy domain-level system skills once module-level skills exist.** Transitional pass. One legacy row exists (`ins-claims-system`, id 71, `domain_id=44`, `domain_module_id=null`). Acceptable as a transitional state because no module-level system skill exists for this domain yet. Will fail F2 once modules are authored. Routes to B1-F1.
- **F2 , every module has exactly one `system` skill.** Vacuous (no modules).
- **F3 , every system skill has at least one skill_tool.** Pass (12 skill_tools on the legacy skill).
- **F4 , tool operation_kind to data_object_id invariant.** Pass on every linked tool.
- **F5 , Semantius score computable.** Pass at the domain level (92% strict on the legacy skill); module-level scores not yet definable.
- **F7 , channel primitives only when workflow requires.** **FAIL.** Skill 71 links `send_email` (id 37) directly with `requirement_level=required` and (per Rule #15) no notes. The required channel for claims communications is not voice-specific or email-only (claims communications fan across email, SMS, postal, customer-portal). The right link is `notify_person`. Routes to B1-F7.
- **F6.** Reserved.

#### H. APQC tagging

- **H1.** **FAIL.** Zero `handoff_processes` rows across the 8 cross-domain handoffs. Sub-section below proposes 6 `agent_curated` rows and defers 2. Routes to B1-H1.

### Pass 2 , Market audit (semantic)

The market audit uses the flagship enumeration above as the surface basis. The findings below reflect the gap between the surface and the current catalog footprint, which is severe because the domain has zero modules and zero capabilities.

**MISSING entities** (universal or near-universal across the flagship surface; absent from the catalog):

| ID | Entity | Proposed module | Vendor evidence | Necessity |
|---|---|---|---|---|
| MK-1 | `claim_reserves` | INS-CLAIMS-ADJUDICATION (proposed module split) | Universal (Guidewire, Duck Creek, Sapiens, Insurity, Snapsheet). Tracks case reserves by exposure with reserve change history. | Workflow-required (core actuarial trigger) |
| MK-2 | `claim_exposures` | INS-CLAIMS-ADJUDICATION | Universal. One claim spans multiple exposures (coverage line, vehicle, claimant); reserve and payment hang off the exposure, not the claim. | Workflow-required |
| MK-3 | `claim_activities` | INS-CLAIMS-ADJUDICATION | Universal (Guidewire Activity model is the reference; Duck Creek Tasks; Sapiens Workflow). Adjuster work-list rows. | Workflow-required |
| MK-4 | `coverage_decisions` | INS-CLAIMS-ADJUDICATION | Common (Guidewire, Duck Creek). Typed acceptance/denial-of-coverage decisions distinct from settlements. | Workflow-required |
| MK-5 | `denial_letters` | INS-CLAIMS-ADJUDICATION | Compliance-shaped. State-DOI claim-handling regulations (e.g. NAIC Unfair Claims Settlement Practices Model #900) require typed denial documentation. | Compliance-mandatory |
| MK-6 | `claim_notes` | INS-CLAIMS-INTAKE (proposed module split) | Universal recorder pattern. Adjuster free-text per claim. | Workflow-required |
| MK-7 | `loss_estimates` | INS-CLAIMS-ADJUDICATION | Common (Guidewire estimate model, Mitchell / CCC ONE integrations). Physical damage estimation distinct from settlement. | Workflow-required (auto / property lines) |
| MK-8 | `claim_documents` | INS-CLAIMS-INTAKE | Universal. Claim file is document-heavy; FNOL package, police reports, medical records, photos. | Workflow-required |
| MK-9 | `claim_parties` | INS-CLAIMS-INTAKE | Universal. Claimants, witnesses, third-parties, attorneys, providers. | Workflow-required |
| MK-10 | `regulatory_claim_reports` | INS-CLAIMS-COMPLIANCE (proposed module split) | Compliance-shaped. NAIC Property & Casualty Annual Statement, state-DOI claim-handling reports, OFAC sanctions screening events. | Compliance-mandatory |
| MK-11 | `litigation_files` | INS-CLAIMS-ADJUDICATION | Common (Guidewire, Duck Creek). When a claim escalates to lawsuit; tied to defense panel and reserves. | Workflow-required |
| MK-12 | `recovery_disbursements` | INS-CLAIMS-PAYMENTS (proposed module split) | Common. Recovery proceeds disbursed back to reinsurers, salvage buyers, third-party recoverors. | Workflow-required |

**WRONG-OWNERSHIP** (entity in catalog but in a different domain than flagship-vendor surface implies):

None identified. The existing 10 masters all sit correctly on INS-CLAIMS. The `insurance_policies` and `policy_coverages` masters arguably belong on a future INS-POLICY-ADMIN domain (queued), not on INS-CLAIMS, but until INS-POLICY-ADMIN exists the current placement is the only mappable one. Surface as Bucket 2 judgment item.

**SCOPE-CREEP** (entity in catalog but not in the market surface):

None identified at the master level. Every existing master matches a Guidewire / Duck Creek / Sapiens object. The `policy_coverages` and `insurance_policies` masters being on INS-CLAIMS is more an artifact of "no policy admin domain yet" than scope creep, see WRONG-OWNERSHIP above.

**MODULARIZATION ISSUES**:

INS-CLAIMS is currently a single un-modularized domain. The flagship vendors all carry an internal modularization that maps cleanly to a 4 to 5 module split: Intake / FNOL, Adjudication and Investigation, Settlement and Payment, Compliance and Reporting, and (optionally) Recovery and Subrogation. The proposed module split below is presented as a Bucket 2 design decision; the audit does not pre-commit a shape.

### Pass 3 , Neighbor discovery

Edge weights (handoffs only; INS-CLAIMS has zero cross-domain DMDOs).

| Neighbor | Direction | Edges | Weight |
|---|---|---|---|
| ERP-FIN | outbound | 3 (claim_payment.issued, claim_settlement.approved, salvage_recovery.posted) | 3 |
| CSM | outbound | 3 (insurance_claim.fnol_received, insurance_claim.closed, insurance_policy.cancelled) | 3 |
| GRC | outbound | 1 (siu_case.opened) | 1 |
| TELEMATICS | inbound | 1 (dashcam_event.collision) | 1 |

Pairwise reconciliation deep-dive (Pass 4) runs against neighbors at weight >= 3: **ERP-FIN** and **CSM**. GRC and TELEMATICS get a one-line summary in Pass 4 below.

### Pass 4 , Pairwise reconciliation

**INS-CLAIMS x ERP-FIN (weight 3).** ERP-FIN has zero `domain_modules` rows. None of the four-leg analysis can be completed structurally because the target side cannot be attributed. All three handoffs (claim_payment.issued, claim_settlement.approved, salvage_recovery.posted) carry NULL `target_domain_module_id` and the natural target (a GL-postings / journal-entries module on ERP-FIN) does not exist as a data_object in the catalog either. Verdict: **everything in this boundary is blocked on ERP-FIN's modularization.** Routes to a report-only entry against ERP-FIN. The relationship mirror `claim_payments posts_to journal_entries` is similarly blocked.

**INS-CLAIMS x CSM (weight 3).** CSM has 3 modules (CSM-CASE-MGMT, CSM-ENTITLEMENTS, CSM-KNOWLEDGE). The 3 outbound handoffs target CSM but `target_domain_module_id` is NULL on all of them. Per the B10b derivation rule, the right target module for all three is **CSM-CASE-MGMT** (id 112) because the payload `insurance_claims` and `insurance_policies` is consumed by case management, and `customer_cases` (mastered by CSM-CASE-MGMT) is already referenced in `data_object_relationships` row 464 (`insurance_claims opens customer_cases`) and row 465 (`insurance_policies opens customer_cases`). CSM-CASE-MGMT does not currently declare a `consumer` DMDO on `insurance_claims` (623) or `insurance_policies` (624); that gap is owed by CSM and should be tracked in CSM's audit. Once INS-CLAIMS itself modularizes, the source side can be attributed (probable: INS-CLAIMS-INTAKE for `fnol_received`, INS-CLAIMS-ADJUDICATION for `closed`, and an INS-POLICY-ADMIN module on the queued candidate for `cancelled`). Section diff:

- Section 1 (existing fully wired): zero.
- Section 2 (existing with NULL FK): 3 rows, all source-side blocked on INS-CLAIMS modularization. Target side resolvable in principle to CSM-CASE-MGMT once CSM declares the consumer DMDO. Surface as B1-B10b on INS-CLAIMS plus report-only on CSM.
- Section 3 (missing handoffs): the `insurance_claim.assigned` (no event today) and `insurance_claim.reserve_set` events would normally fan to CSM customer-self-service portals (the customer sees the assigned adjuster and reserve update). Routes to a Bucket 3 candidate.
- Section 4 (boundary integrity): none on this pair.
- Section 5 (cross-domain relationships): the existing 2 rows are the only edges. Missing mirror: `claim_settlements informs customer_cases` (settlement update visible in case portal) is a candidate worth surfacing as Bucket 2.

**INS-CLAIMS x GRC (weight 1).** Single outbound `siu_case.opened` to GRC. GRC has zero modules; target attribution blocked. Routes to report-only against GRC.

**INS-CLAIMS x TELEMATICS (weight 1).** Single inbound `dashcam_event.collision` from TELEMATICS. Payload `dashcam_events` (id 378) is TELEMATICS-owned. INS-CLAIMS should declare a `consumer + optional` DMDO on `dashcam_events` once it has a module (probable: INS-CLAIMS-INTAKE). Routes to B1-B10 in-scope follow-up and a report-only note on TELEMATICS for `target_domain_module_id` resolution.

### Bucket 1 , In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-A1 | A1 | `domains.business_logic` for INS-CLAIMS contains a U+2014 em-dash, violating the no-em-dash project rule. Source text encodes the em-dash between `calculations` and `the irreducible`. | PATCH `business_logic` to: `"Adjudication rules engine, fraud detection, and reserve calculations: the irreducible insurance kernel; FNOL and case workflow are declarative."` (colon replaces em-dash). |
| B1-A2 | A2 | Zero `capability_domains` rows. Every flagship vendor markets 5 to 8 claims capabilities. | Author 8 `capabilities` rows + 8 `capability_domains` rows: `INS-CLAIMS-FNOL`, `INS-CLAIMS-COVERAGE-VERIFICATION`, `INS-CLAIMS-ADJUSTER-WORKLIST`, `INS-CLAIMS-RESERVING`, `INS-CLAIMS-ADJUDICATION`, `INS-CLAIMS-DISBURSEMENT`, `INS-CLAIMS-RECOVERY-SUBROGATION`, `INS-CLAIMS-FRAUD-DETECTION`. Capability names spelled out in the loader draft. |
| B1-A3 | A3 | Missing flagship solutions: Insurity Claims, Snapsheet, Shift Technology, Origami Risk. | Add 4 `solutions` rows (`solution_kind=standard_solution`, vendors resolved by `vendor_name`), 4 `solution_domains` rows (Shift Technology = `partial` for fraud-detection specialist scope; Insurity and Snapsheet = `primary`; Origami Risk = `secondary`). |
| B1-A4 | A4 | `catalog_tagline` and `catalog_description` both empty strings. | Draft buyer-voice copy per Rule #20, surface to user BEFORE writing. Proposed tagline draft: `"Take a claim from first notice of loss through settlement, payment, and recovery in one place, with built-in fraud screening and audit trails."` Proposed description: 2-paragraph buyer voice covering FNOL intake, adjuster work-list, coverage and reserve management, settlement adjudication, payment disbursement, and recovery and subrogation. Hold for user review per Rule #20. |
| B1-M1 | M1 (hard) | Zero `domain_modules` rows. Domain is fully un-modularized; everything below blocks. | Author 4 to 5 `domain_modules` rows (see Bucket 2 #1 for the module-split decision). Default proposal: **INS-CLAIMS-INTAKE** (FNOL, party intake, document upload, dashcam telematics ingest), **INS-CLAIMS-ADJUDICATION** (exposure and reserve management, adjuster work-list, coverage decisions, estimates, litigation), **INS-CLAIMS-PAYMENTS** (settlements, disbursements, recovery disbursements), **INS-CLAIMS-RECOVERY** (subrogation, salvage), **INS-CLAIMS-FRAUD-SIU** (SIU cases, fraud detection, regulatory reporting). Sequence with the Bucket 2 decision (4-module vs 5-module split). |
| B1-B4 | B4 | Pattern flags not re-evaluated on any master. | PATCH: `siu_cases.has_personal_content=true`, `claim_settlements.has_single_approver=true`, `claim_payments.has_submit_lock=true`, `coverage_decisions.has_single_approver=true` (once entity exists). Record consideration outside notes per Rule #15. |
| B1-B6 | B6 | Zero intra-domain `data_object_relationships`. Minimum graph empty. | Author 9 intra-domain edges per § Pass 1.B6 list. Each row carries `relationship_verb`, `inverse_verb`, `relationship_type`, `relationship_kind`, `is_required`, `owner_side`. |
| B1-B7 | B7 (Rule #10) | Zero `users` edges. Every master needs at least one. | Author 9 `users` edges per § Pass 1.B7 list. |
| B1-B8 | B8 | Outbound cross-domain edges not mirrored for CSM-targeted payloads. | Existing rows 464, 465 cover `insurance_claims opens customer_cases` and `insurance_policies opens customer_cases`. Add `insurance_claims notifies customer_cases` (mirror of `insurance_claim.fnol_received`) and `insurance_policies notifies customer_cases` (mirror of `insurance_policy.cancelled`). ERP-FIN, GRC, TELEMATICS mirrors are blocked on their modularization and become report-only. |
| B1-B10 | B10 | INS-CLAIMS receives `dashcam_event.collision` but has no consumer DMDO on `dashcam_events` (378). | Once INS-CLAIMS-INTAKE exists, author 1 `domain_module_data_objects` row: `(INS-CLAIMS-INTAKE, 378, consumer, optional)`. Sequenced after B1-M1. |
| B1-B10b | B10b | All 8 cross-domain handoffs have NULL module FKs on at least one side. | For the 3 CSM-targeted rows, PATCH `target_domain_module_id=112` (CSM-CASE-MGMT) after CSM declares the consumer DMDO. For all 7 outbound, PATCH `source_domain_module_id` after B1-M1 lands and DMDOs are authored. ERP-FIN / GRC sides remain NULL until those domains modularize: report-only. |
| B1-B11 | B11 | Zero `data_object_aliases` on every master. | Author 30 alias rows total per § Pass 1.B11 list (about 3 per master). |
| B1-B12 | B12 | Zero `data_object_lifecycle_states`. | Author state machines for the 5 workflow-bearing masters (`insurance_claims`, `insurance_policies`, `claim_settlements`, `claim_payments`, `siu_cases`, `subrogation_cases`). About 30 to 40 rows total. The 4 config-shaped masters (`policy_coverages`, `loss_incidents`, `claim_adjuster_assignments`, `salvage_recovery_records`) are exempt; surface the exemption to the user per Rule #15 (do not auto-populate `data_objects.notes`). |
| B1-F1 | F1 (cleanup) | Legacy domain-level system skill `ins-claims-system` (id 71, `skill_type=system`, `domain_id=44`, `domain_module_id=null`) is the only system skill. | Sequenced **after** B1-M1: author one `<module_code_lower>_agent` skill per new `domain_modules` row, redistribute the 12 `skill_tools` rows to the right module-level skills, then DELETE skill id 71. |
| B1-F7 | F7 | Skill 71 links `send_email` (id 37) directly as `required`. Claims communications are multi-channel by workflow. | PATCH `skill_tools` row for skill 71 / tool 37 to point at `notify_person` (the abstraction tool). If skill 71 is being retired in B1-F1, fold this rewire into the F1 retirement load: every new module-level system skill links `notify_person`, not `send_email`. |

#### APQC TAGGING (H1)

Two tables: confident `agent_curated` proposals and deferred-to-Discover.

**Agent-curated proposals (6 rows, ship as `proposal_source='agent_curated'`, `record_status='new'`):**

| Handoff id | Source to target | Trigger event | Payload | Proposed process | PCF external_id | Process id | Confidence |
|---|---|---|---|---|---|---|---|
| 904 | INS-CLAIMS to CSM | `insurance_claim.fnol_received` | `insurance_claims` | Receive customer complaints | 10397 | 931 | medium (FNOL is the insurance-shaped analog of complaint intake; the PCF taxonomy does not carry a dedicated FNOL process; this is the closest PCF activity for triage and routing) |
| 905 | INS-CLAIMS to ERP-FIN | `claim_payment.issued` | `claim_payments` | Post AR activity to the general ledger | 10803 | 1359 | medium (claim-payment posting is an AP-side journal entry in practice, but PCF's GL-posting activity is the closest cross-industry tag; high enough for a tag but flag to GL specialist on review) |
| 906 | INS-CLAIMS to ERP-FIN | `claim_settlement.approved` | `claim_settlements` | Post AR activity to the general ledger | 10803 | 1359 | medium (same rationale as 905; settlement approval triggers reserve release plus GL accrual) |
| 907 | INS-CLAIMS to GRC | `siu_case.opened` | `siu_cases` | Investigate fraudulent claims | 20120 | 969 | high (direct PCF match for fraud investigation) |
| 908 | INS-CLAIMS to CSM | `insurance_claim.closed` | `insurance_claims` | Manage customer complaints | 10389 | 197 | medium (closure communications fall under PCF complaint management for cross-industry mapping) |
| 909 | INS-CLAIMS to ERP-FIN | `salvage_recovery.posted` | `salvage_recovery_records` | Post AR activity to the general ledger | 10803 | 1359 | low (salvage recovery posting is a recovery-side journal entry; PCF has no insurance-recovery activity; tag is for completeness but worth a reviewer's eye) |

**Deferred to Discover Pass 3 (2 rows; no clean PCF cross-industry match):**

| Handoff id | Source to target | Trigger event | Defer reason |
|---|---|---|---|
| 910 | INS-CLAIMS to CSM | `insurance_policy.cancelled` | The handoff is policy-admin-shaped, not claims-shaped: when an INS-POLICY-ADMIN domain exists, this row arguably moves to that domain entirely. Defer tagging until the modularization decision (Bucket 2 #1 plus Bucket 3 #1) resolves. |
| 315 | TELEMATICS to INS-CLAIMS | `dashcam_event.collision` | This is an INS-CLAIMS-INTAKE inbound event with no clear cross-industry PCF analog (it is industry-specific telematics-to-insurance integration). Candidate for Discover Pass 3 custom-process creation: `insurance.process_telematics_first_notice_signal`. |

### Bucket 2 , Surface-for-user (judgment calls)

1. **Modularization split.** The current single-domain shape needs to split into 4 or 5 modules. Options:
   - **(4-module)** INS-CLAIMS-INTAKE, INS-CLAIMS-ADJUDICATION (folds reserves, exposures, work-list, coverage decisions), INS-CLAIMS-PAYMENTS (folds settlements, disbursements, recovery disbursements), INS-CLAIMS-COMPLIANCE-AND-FRAUD (folds SIU, regulatory reporting). Clean but stuffs adjudication and compliance.
   - **(5-module)** INS-CLAIMS-INTAKE, INS-CLAIMS-ADJUDICATION, INS-CLAIMS-PAYMENTS, INS-CLAIMS-RECOVERY (subrogation, salvage, recovery disbursements as a coherent recovery family), INS-CLAIMS-FRAUD-SIU. Aligns with Guidewire's internal split and the way carriers staff: separate Special Investigation and Recovery teams.
   - **(5-module variant)** as above, but lift Compliance/Reporting into its own INS-CLAIMS-COMPLIANCE module (regulatory_claim_reports, denial_letters audit trail, NAIC and state-DOI artifacts). Most defensible under DORA / IFRS 17 / NAIC Model #900 scrutiny.
   Recommend the 5-module variant pending user pick. The decision cascades into B1-M1, B1-A2 (capability-to-module mapping), B1-B12 (which module realizes which lifecycle gates), B1-F1, every Bucket 1 fix that needs a module FK.
2. **Policy admin scope.** `insurance_policies` (624) and `policy_coverages` (625) are currently mastered on INS-CLAIMS. Flagship vendors split these into a separate Policy Administration platform (Guidewire PolicyCenter, Duck Creek Policy, Sapiens IDIT Policy). The queue now carries `INS-POLICY-ADMIN`. Options:
   - **(a) keep on INS-CLAIMS** until INS-POLICY-ADMIN ships, then move masters at promotion time. Default. Honest reflection of the current catalog scope.
   - **(b) move now to a stub INS-POLICY-ADMIN** that carries only those 2 masters until the rest is loaded. Cleaner long-term but means the stub domain ships with sparse Phase B.
   - **(c) embed in claims** as embedded_master (recognize the canonical owner is INS-POLICY-ADMIN but ship a local shell). Cleanest under autonomous-deployable-units once INS-POLICY-ADMIN ships and masters them.
3. **Functional ownership review.** Current owner is Business Operations + Finance contributor. Industry RACI for claims more often reads: owner = Claims Operations (a function the catalog has not yet decomposed under Business Operations), contributor = Finance, contributor = Risk and Compliance, consumer = Customer Service. The 20-function spine may need a `Claims Operations` sub-function before this can be re-modeled precisely; for now, options are:
   - **(a) keep current.** Business Operations is plausible at the top-level function spine.
   - **(b) add Risk and Compliance as contributor, Customer Service as consumer.** Lightweight extension that does not require new spine rows.
4. **Compliance regulation scope.** The 11 regulations include some that are broadly applicable to all insurance and finance (GDPR, GLBA, BSA) and some that may or may not fit pure claims scope (eIDAS, FATCA, IFRS 17). **NAIC Unfair Claims Settlement Practices Model #900** (the U.S. state-by-state model regulation for claims handling) is **missing** but is the single most important claims-specific regulation in the U.S. market. Options:
   - **(a) add NAIC Model #900** and keep the 11 existing rows (some of which are at the firm-level scope, not claims-only).
   - **(b) add NAIC Model #900 and prune** the regulations that are firm-level (eIDAS, FATCA, SFDR are not claims-handling regulations even if they apply to insurers). Removes 3 to 4 rows.
5. **APQC tagging strategy.** PCF cross-industry has weak insurance-claims coverage (only `Investigate fraudulent claims` and `Close claim` are direct hits). Options:
   - **(a) tag with closest cross-industry PCF** (proposal above) and surface the weak matches as low-confidence.
   - **(b) defer all tagging** until APQC's insurance-vertical taxonomy (PCF Insurance) is loaded into `processes`, which would give cleaner activities (Process FNOL, Set Reserve, Adjudicate Coverage, etc.).
   - **(c) author custom-process rows** in the `processes` table for insurance-specific activities (`insurance.process_fnol`, `insurance.adjudicate_coverage`, `insurance.set_reserve`) and tag against those.
6. **Lifecycle config-shape exemptions.** Per Rule #12 the audit must positively decide whether `policy_coverages`, `loss_incidents`, `claim_adjuster_assignments`, and `salvage_recovery_records` are config-shaped (no workflow) or workflow-bearing. Surface options:
   - **(a) config-shape exemption confirmed** for all four (current draft assumption).
   - **(b) workflow on `loss_incidents`** (reported, investigated, closed) and `claim_adjuster_assignments` (assigned, accepted, reassigned, completed) which are arguably workflow-bearing; keep the other two as config-shape.
7. **B12 verb override decisions.** Pre-author calls so the loader produces clean permissions:
   - `insurance_claims.closed` -> derives `close_insurance_claim` (clean) or `close_claim` (cleaner)? Vote (b).
   - `claim_settlements.approved` -> derives `approve_claim_settlement` or `approve_settlement`? Vote (b).
   - `claim_payments.issued` -> derives `issue_claim_payment` or `issue_payment`? Vote (b).
   - `siu_cases.substantiated` (if state authored) -> derives `substantiate_siu_case` or `substantiate_fraud_case`? Surface both.
8. **Domain owner ambiguity in the catalog text.** `domains.business_logic` (after the em-dash fix) describes the kernel as `adjudication rules engine, fraud detection, and reserve calculations`. After the modularization split, the description may benefit from a rewrite that points at the module-level shape (intake declarative, adjudication kernel, payments declarative, fraud kernel). Hold for user approval per Rule #20 (description is not the catalog-tagline column, but the analyst-voice rewrite is still a user decision).

### Bucket 3 , Phase 0 pending (speculative; vendor-research vetting needed)

Universal-or-near-universal vendor entities surfaced from the flagship-vendor surface that warrant a formal Phase 0 protocol before loading.

| # | Candidate | Proposed module | Vendor evidence |
|---|---|---|---|
| 1 | `claim_reserves` | INS-CLAIMS-ADJUDICATION | Universal (Guidewire, Duck Creek, Sapiens, Insurity, Snapsheet); core actuarial trigger; reserve change history mandatory for IFRS 17 and NAIC P&C Annual Statement |
| 2 | `claim_exposures` | INS-CLAIMS-ADJUDICATION | Universal; one claim spans multiple exposures (coverage line, vehicle, claimant); reserve and payment hang off the exposure, not the claim |
| 3 | `claim_activities` | INS-CLAIMS-ADJUDICATION | Universal (Guidewire Activity is the reference; Duck Creek Tasks; Sapiens Workflow); adjuster work-list |
| 4 | `coverage_decisions` | INS-CLAIMS-ADJUDICATION | Common (Guidewire, Duck Creek); typed acceptance/denial-of-coverage decisions distinct from settlements |
| 5 | `denial_letters` | INS-CLAIMS-COMPLIANCE | Compliance-shaped; NAIC Model #900 and state-DOI claim-handling regulations require typed denial documentation |
| 6 | `claim_notes` | INS-CLAIMS-INTAKE | Universal recorder pattern; adjuster free-text per claim |
| 7 | `loss_estimates` | INS-CLAIMS-ADJUDICATION | Common (Guidewire estimate model, Mitchell / CCC ONE integrations); physical-damage estimation distinct from settlement |
| 8 | `claim_documents` | INS-CLAIMS-INTAKE | Universal; claim file is document-heavy (FNOL package, police reports, medical records, photos) |
| 9 | `claim_parties` | INS-CLAIMS-INTAKE | Universal; claimants, witnesses, third-parties, attorneys, providers |
| 10 | `regulatory_claim_reports` | INS-CLAIMS-COMPLIANCE | Compliance-shaped; NAIC P&C Annual Statement, state-DOI reports, OFAC sanctions screening |
| 11 | `litigation_files` | INS-CLAIMS-ADJUDICATION | Common (Guidewire, Duck Creek); claim-to-lawsuit escalation tied to defense panel and reserves |
| 12 | `recovery_disbursements` | INS-CLAIMS-PAYMENTS | Common; recovery proceeds disbursed to reinsurers, salvage buyers, third-party recoverors |

### Cross-bucket dependencies

- **B2 #1 (modularization split) is the spine for almost every B1 item.** B1-M1 cannot ship until the 4-module vs 5-module decision lands. B1-A2 (capability-to-module mapping), B1-B12 (lifecycle states' `domain_module_id`), B1-F1 (module-level system skills), B1-B10 (consumer DMDO on `dashcam_events`), and every B1 row that needs `source_domain_module_id` are sequenced after B2 #1.
- **B2 #2 (policy admin scope) is sequenced after B1-M1.** Whether `insurance_policies` and `policy_coverages` stay on INS-CLAIMS or move depends on whether the user wants a Phase-A loader for INS-POLICY-ADMIN now or later.
- **B2 #4 (regulation scope) is independent** and can be resolved alongside the Bucket 1 STRUCTURAL fixes.
- **B2 #5 (APQC tagging strategy) gates the H1 fixes.** If the user picks (b) (defer all tagging), the 6 agent-curated proposals do not load and H1 stays pending; if (a), the 6 proposals + 2 deferrals as drafted.
- **B3 candidates 1 to 12 cascade after B2 #1.** Most slot into INS-CLAIMS-ADJUDICATION and INS-CLAIMS-INTAKE, both of which only exist after the module split.

### Per-bucket prompts

**Bucket 1 prompt:** "I have 14 in-scope structural fixes. The headline is M1 (zero modules) which is a hard fail and cascades into A2, B6, B7, B8, B10, B10b, B11, B12, F1, F7. The Bucket 2 modularization decision (4-module vs 5-module) needs to land first because every M1-dependent fix needs the module set as input. The rest (A1 em-dash, A3 missing solutions, A4 catalog UX copy draft, B4 pattern flags) can ship independently. Approve the independent fixes now? Approve the M1-dependent fixes contingent on B2 #1?"

**Bucket 2 prompt:** "There are 8 judgment calls. The biggest is #1 (4 vs 5 module split), which gates almost every B1 item. #2 (policy admin scope) and #4 (regulation pruning + NAIC Model #900) are next-most-load-bearing. Talk me through each: (1) module split, (2) policy admin, (3) function RACI, (4) regulations, (5) APQC strategy, (6) lifecycle exemptions, (7) verb overrides, (8) description rewrite."

**Bucket 3 prompt:** "12 candidate entities surfaced from the flagship surface (Guidewire / Duck Creek / Sapiens). Want me to run a formal Phase 0 vendor-research protocol against all 12 to confirm which are universal vs specialist, OR eyeball-load the 9 universal-evidence candidates (`claim_reserves`, `claim_exposures`, `claim_activities`, `coverage_decisions`, `claim_notes`, `claim_documents`, `claim_parties`, `regulatory_claim_reports`, `denial_letters`) now and defer the 3 common-evidence (`loss_estimates`, `litigation_files`, `recovery_disbursements`)?"

### Report-only follow-ups (owed by other domains)

- **CSM B8 / B10b owes:** CSM-CASE-MGMT (id 112) should declare `consumer` DMDOs on `insurance_claims` (623) and `insurance_policies` (624). The catalog already carries `data_object_relationships` rows 464 and 465 (`opens customer_cases`) implying the dependency. Without the consumer DMDOs the B10b backfill cannot set `target_domain_module_id` on handoffs 904, 908, 910. Tracks against CSM's next audit.
- **ERP-FIN modularization owed:** ERP-FIN (id 65) has zero `domain_modules` rows. Until ERP-FIN modularizes (and ships at minimum a `GL-POSTINGS` / `journal_entries` module), the 3 ERP-FIN-targeted handoffs (905 claim_payment.issued, 906 claim_settlement.approved, 909 salvage_recovery.posted) cannot have their `target_domain_module_id` resolved, and the cross-domain `data_object_relationships` mirrors (`claim_payments posts_to journal_entries`, `claim_settlements posts_to journal_entries`, `salvage_recovery_records posts_to journal_entries`) cannot be authored.
- **GRC modularization owed:** GRC (id 15) has zero `domain_modules` rows. Until GRC modularizes (probable target: `GRC-INVESTIGATIONS` or similar), handoff 907 `siu_case.opened` cannot have `target_domain_module_id` resolved, and the cross-domain relationship mirror (`siu_cases escalates_to investigations`) cannot be authored.
- **TELEMATICS B10b owes:** TELEMATICS (id 148) has zero `domain_modules` rows. The inbound handoff 315 (`dashcam_event.collision`) has `source_domain_module_id=null`; resolvable on the TELEMATICS side once that domain modularizes.
- **TELEMATICS audit follow-up:** the inbound `dashcam_events` payload would ideally be tagged with a custom PCF process (`insurance.process_telematics_first_notice_signal`) once TELEMATICS audits its outbound boundary.

### Candidate domains queued

Surfaced by this audit, queued via `scripts/analytics/append_missing_domain.ts`:

1. `INS-POLICY-ADMIN` (Insurance Policy Administration) , would master `insurance_policies` and `policy_coverages`; vendor evidence Guidewire PolicyCenter, Duck Creek Policy, Sapiens IDIT Policy, Insurity, EIS Group.
2. `INS-UNDERWRITING` (Insurance Underwriting) , would publish into INS-POLICY-ADMIN at quote-and-bind; vendor evidence Guidewire Underwriting Management, Duck Creek Rating, Sapiens UnderwritingPro, Earnix, Akur8, Cytora, hyperexponential.
3. `INS-BILLING` (Insurance Billing and Premium Accounting) , would consume from INS-POLICY-ADMIN and publish into INS-CLAIMS for premium-collection-blocks-claims rules; vendor evidence Guidewire BillingCenter, Duck Creek Billing, Sapiens BillingPro, Majesco Billing, Insurity Billing.
4. `REINSURANCE-MGMT` (Reinsurance and Ceded Risk Management) , would consume `claim_payments` and `claim_settlements` from INS-CLAIMS for ceded-recoveries; vendor evidence Guidewire ReinsuranceManager, Sapiens ReinsurancePro, SAP Reinsurance Management, Verisk SequelDirect, Tigerlab.

### Decisions

_(Pending user review.)_

### Fixes applied

_(None yet; this is the audit pass only.)_
