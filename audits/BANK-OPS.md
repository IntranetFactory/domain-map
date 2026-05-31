---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 37
---

# BANK-OPS - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: 8 masters via legacy `domain_data_objects` (loan_applications, account_applications, account_openings, banking_kyc_reviews, banking_cases, wire_transfers, loan_disbursements, banking_transactions). **0 modules, 0 capabilities, 0 lifecycle states, 0 aliases.** 4 solutions, 16 regulations, 10 trigger_events, 7 outbound cross-domain handoffs, 0 inbound. 1 legacy domain-level system skill (`bank-ops-system`, id 31, `domain_module_id=null`) with 10 `skill_tools` rows (8 query + send_email + sign_document). 1 owner business function (Business Operations), 1 contributor (Finance).
- Vendor-surface basis (analyst pass, no subagent dispatched per mass-audit rules): nCino (Bank Operating System), Backbase Engagement Banking, ServiceNow Financial Services Operations, Salesforce Financial Services Cloud (currently linked), plus Mambu / Thought Machine / 10x Banking (core-ledger pure-plays), Fenergo (client lifecycle), Alloy / Trulioo / Persona (KYC), NICE Actimize / Featurespace (transaction monitoring), Modern Treasury / Stripe Treasury / Plaid (payment ops, open banking). The point-solution layer suggests several adjacent markets are missing from the catalog (queued in `audits/_missing-domains.md`).
- **Bucket 1 (in-scope, agent fixable):** 17 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 13 items.
- Candidates queued: 8 (KYC-AML-PLATFORM, TRANSACTION-MONITORING, PAYMENT-OPS, OPEN-BANKING, BAAS-PLATFORM, BANK-FRAUD-DETECT, LOAN-ORIGINATION, CORE-BANKING).

**Structural verdict.** The M-band is hard-failed (M1: zero `domain_modules` rows). Per Rule #14 every `domains` row MUST have at least one `module_kind='full'` row, and this cascades: F2 / F5 can't run, E1 / E2 / E3 / E4 / E5 / E6 can't run, B9b can't run (single-module domain by absence), B10b NULL on outbound `source_domain_module_id` is legitimate-by-virtue-of-no-modules but blocks the catalog from per-module fact-sheet rendering. The single biggest in-scope fix is authoring the module set; everything else downstream cascades from it.

### Pass 1 - Structural findings (S / A / M / B / C / E / F / H bands)

#### S-band sweep

S1 FK coverage on `domains` (rows where this domain is referenced):

| Table | FK column | BANK-OPS rows | Expected non-zero? |
| --- | --- | --- | --- |
| `domain_data_objects` | `domain_id` | 8 | yes (pass) |
| `solution_domains` | `domain_id` | 4 | yes (pass) |
| `business_function_domains` | `domain_id` | 2 | yes (pass) |
| `capability_domains` | `domain_id` | **0** | yes (FAIL, routes to A2) |
| `domain_regulations` | `domain_id` | 16 | yes (pass) |
| `handoffs` (source) | `source_domain_id` | 7 | yes (pass) |
| `handoffs` (target) | `target_domain_id` | **0** | usually yes (FAIL, report-only - other domains owe BANK-OPS inbound publishes) |
| `skills` | `domain_id` | 1 (legacy) | per F2 not directly (routes to F1 / F2) |
| `domain_modules` | `domain_id` | **0** | yes (FAIL, routes to M1) |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero (pass) |
| `domain_aliases` | `domain_id` | **0** | non-blocking (informational; routes to a new B1 item below) |
| `domains` | `parent_domain_id` | 0 | routinely zero (pass) |

S2 per-module coverage: **not applicable** (no modules).
S3 per-master coverage: every master returns 0 lifecycle states, 0 aliases, and trigger_events as below. Reported per-master in B12 / B11 / B9.

| data_object | states | trigger_events | aliases |
| --- | --- | --- | --- |
| loan_applications | 0 | 2 (submitted, approved) | 0 |
| account_applications | 0 | 1 (submitted) | 0 |
| account_openings | 0 | 1 (completed) | 0 |
| banking_kyc_reviews | 0 | 1 (flagged) | 0 |
| banking_cases | 0 | 1 (opened) | 0 |
| wire_transfers | 0 | 2 (initiated, sanctions_hit) | 0 |
| loan_disbursements | 0 | 1 (executed) | 0 |
| banking_transactions | 0 | 1 (suspicious) | 0 |

#### A-band

- **A1 pass.** All 7 metadata fields populated (`crud_percentage=78`, `min_org_size='30 m <2500'`, `cost_band='$$$$$'`, `certification_required=true`, `usa_market_size_usd_m=5000`, `market_size_source_year=2025`, `business_logic` present).
- **A2 FAIL.** Zero `capability_domains` rows. Phase A never shipped capabilities. The market has at least 5-8 obvious shapes (loan origination, deposit account opening, KYC/AML, transaction processing, case management, wire-transfer ops, regulatory reporting).
- **A3 pass.** 4 solutions linked (3 primary, 1 secondary).
- **A4 FAIL.** Both `catalog_tagline` and `catalog_description` are empty strings.
- A5 skipped (opt-in only).

#### M-band

- **M1 HARD FAIL.** Zero `domain_modules` rows for BANK-OPS. No host-junction rows either. The domain is undeployable.
- M2 / M4 / M5 / M6 / M7: not applicable until M1 is cured.

#### B-band

- **B1 pass.** 8 `master` rows via legacy `domain_data_objects` (rollup-shaped because no modules exist yet). Once modules ship, the rollup is derived from `domain_module_data_objects`.
- **B2 pass.** Every master has `singular_label` and `plural_label`.
- **B3 pass.** All 8 names are prefixed forms (`loan_applications`, `account_applications`, ...); no bare-word claims need `is_canonical_bare_word=true`.
- **B4 FAIL (consider-and-flip).** All three pattern flags default `false` on every master. Per Rule #12, B4 requires positive re-evaluation. Several masters clearly carry personal content (loan_applications, account_applications carry PII; banking_kyc_reviews stores beneficial-ownership / PEP screening output) and several should carry `has_submit_lock` / `has_single_approver` (wire_transfers OFAC approval, loan_applications underwriting decision).
- **B5 N/A.** No `embedded_master` rows exist on BANK-OPS (since no modules).
- **B6 FAIL.** Zero intra-domain edges among the 8 masters in `data_object_relationships`. The only two rows on BANK-OPS masters point cross-domain (rows 462, 463: `account_openings opens customer_cases` and `banking_cases opens customer_cases`). The verb `opens` for both is suspect (account_openings doesn't open CSM customer_cases, it creates an account; banking_cases is itself a case shell, so "opens customer_cases" reads as a chain rather than a verb). Intra-domain edges that should exist by workflow: `loan_applications spawns loan_disbursements`, `account_applications spawns account_openings`, `loan_applications requires banking_kyc_reviews`, `account_applications requires banking_kyc_reviews`, `wire_transfers logs banking_transactions`, `loan_disbursements logs banking_transactions`, `banking_cases references banking_transactions`.
- **B7 FAIL.** Zero `users` edges (related_data_object_id=748). Every master has user-typed actors: loan_applications (originator, underwriter), account_applications (owner, KYC officer), banking_kyc_reviews (reviewer), banking_cases (case_owner, escalation_manager), wire_transfers (initiator, approver), banking_transactions (poster), loan_disbursements (funder), account_openings (relationship_manager).
- **B8 FAIL (outbound direction).** Of the 7 outbound cross-domain handoffs, only 2 have a `data_object_relationships` row that mirrors the payload (rows 462, 463 against `customer_cases`). Five outbound handoffs have no relationship mirror: `banking_kyc_review.flagged` -> GRC (no edge to GRC compliance entity), `wire_transfer.sanctions_hit` -> GRC, `banking_transaction.suspicious` -> GRC, `loan_disbursement.executed` -> ERP-FIN, `wire_transfer.initiated` -> ERP-FIN.
- **B9 partial / event_category FAIL.** 10 trigger_events authored (good coverage on the 8 masters). All 10 carry `event_category=""` (empty). Per Rule #13 the enum is `lifecycle | state_change | threshold | signal`. Every event here reads as `state_change` (e.g. `loan_application.submitted`, `wire_transfer.sanctions_hit`); two read as `signal` (`banking_transaction.suspicious`, `banking_kyc_review.flagged`). Cure: PATCH `event_category` per event. Also: 3 of 10 trigger_events have no `handoffs` row at all (`loan_application.submitted`, `loan_application.approved`, `account_application.submitted`) - these are intra-domain progressions and become intra-domain `handoffs` once modules exist (B9b runs only post-modularization).
- **B9b N/A.** Domain has no modules, so the multi-module cross-pair query doesn't apply yet. Re-run B9b after M1 is cured.
- **B10 (inbound, report-only).** Zero inbound handoffs. Since BANK-OPS has zero `embedded_master` / `consumer` / `contributor` rows (because no modules), the discovery procedure has nothing to scan. Inbound publishers from CRM (contacts -> banking_kyc_reviews via customer.created), MDM (party master refresh), HCM (employee.terminated may close access on accounts), SECOPS (incident.escalated could open a banking_case) may be owed once BANK-OPS is modularized, but those are speculative until then. Report-only.
- **B10b.** All 7 outbound handoffs have NULL `source_domain_module_id` AND NULL `target_domain_module_id`. The source-side NULL is legitimate by virtue of M1 (source domain not modularized). The target-side NULL is owed by the target domain's B10b pass (GRC, ERP-FIN, CSM) - those rows resolve when those target domains run their own B10b. Report-only on the target side; the source-side resolves automatically once M1 is fixed (re-run the backfill loader after Phase M ships).
- **B11 FAIL.** Zero aliases. Non-self-explanatory masters: `banking_kyc_reviews` (aliases: AML review, EDD review, CDD review, BSA review, due-diligence file), `banking_cases` (aliases: dispute case, bank dispute, complaint, regulatory case), `wire_transfers` (aliases: SWIFT, MT103, Fedwire, RTGS transfer), `banking_transactions` (aliases: posting, ledger entry, account movement).
- **B12 FAIL.** Zero `data_object_lifecycle_states` rows for any master. Workflow-bearing masters needing state machines: `loan_applications` (draft / submitted / under_review / approved / declined / funded / archived), `account_applications` (submitted / kyc_pending / approved / declined / converted_to_opening), `account_openings` (provisioning / active / dormant / closed), `banking_kyc_reviews` (queued / in_review / flagged / cleared / escalated / closed), `banking_cases` (open / triaged / investigating / escalated / resolved / closed), `wire_transfers` (initiated / screening / approved / sent / settled / returned / rejected), `loan_disbursements` (scheduled / authorized / executed / reversed), `banking_transactions` (pending / posted / reconciled / disputed / reversed - though this may be config-shaped because most rows are append-only ledger entries).

#### C-band

- **C1 pass.** 1 owner (Business Operations), 1 contributor (Finance). A second contributor for Risk / Compliance (if that function exists in the spine) would be a refinement, not a failure.
- **C2 pass / not-applicable.** No capabilities to override.

#### D-band

- Not run mid-audit; UI spot-check happens after fixes load.

#### E-band

- **E1 N/A (blocked by M1).** Roles require ≥2 modules per role (the 2-module floor). Once BANK-OPS has ≥2 modules, expected roles: BANK-LOAN-OFFICER, BANK-KYC-ANALYST, BANK-OPS-MANAGER, BANK-COMPLIANCE-OFFICER, BANK-CASE-AGENT, BANK-TELLER (cross-functional or under FINANCE).
- E2-E6 cascade from E1.

#### F-band

- **F1 FAIL.** Legacy domain-level system skill `bank-ops-system` (id 31, `domain_id=43`, `domain_module_id=null`) exists with 10 `skill_tools` rows. Per the F1 rule this remains acceptable only while no module-level system skill exists; once Phase S ships per-module skills the legacy row is retired. Currently it is the only skill, so it's accepting transitional. The skill-name itself uses the deprecated `<code>-system` kebab form (snake `<module>_agent` is the convention). Rename happens at migration time.
- **F2 N/A.** No modules to anchor a system skill yet.
- **F3 (legacy skill).** 10 `skill_tools` rows: 8 `query_*` (one per master) + `send_email` + `sign_document`. Coverage_tier: 9 of 10 are `platform`, 1 is `external` (sign_document). Computable strict score = 9/10 = 90% for the legacy skill.
- **F4 pass.** All 10 tools satisfy the `operation_kind` <-> `data_object_id` invariant.
- **F5 N/A (per-module).** Computable only after modules ship.
- **F7 FAIL.** `send_email` (channel primitive) is linked on `bank-ops-system` for generic notifications (no workflow-specific justification - email is not load-bearing for banking ops where SMS / push / portal-message are often substitutable). Per the channel-vs-capability rule, `notify_person` is the right abstraction.

#### H-band (APQC tagging)

- **H1 FAIL.** Zero `handoff_processes` rows on any of the 7 outbound cross-domain handoffs. Per the volume expectation (0.5N - 0.8N agent_curated, ~0.2N defer), the audit should propose roughly 4-6 new `agent_curated` tags. PCF candidates are below in Bucket 1 B1-H1.

### Pass 2 - Market audit (semantic, analyst-pass)

Per mass-audit rules I'm not spawning a market-surface subagent. The flagship-vendor surface I'm reasoning against (nCino, Backbase, Mambu, Thought Machine, Fenergo, Alloy, NICE Actimize, Featurespace, Modern Treasury, Plaid, Unit, Treasury Prime, Salesforce FSC, ServiceNow FSO) yields these qualitative findings:

- **MISSING (workflow substrate, beyond compliance):** borrower profiles / customer credit profiles (Fenergo, nCino), collateral records (nCino LOS, Encompass, Blend), loan servicing accounts (Mambu, Thought Machine), credit / underwriting decisions (Blend, nCino), beneficial ownership records (UBO records - Fenergo, Alloy, mandated by BSA Customer Due Diligence Rule), SAR / STR filings (NICE Actimize, ComplyAdvantage), adverse media screenings (ComplyAdvantage, Refinitiv World-Check), chargebacks / disputes (Featurespace, Marqeta), ACH transfers (distinct from wire_transfers - different rails, NACHA rules), card authorization records (Marqeta, Lithic), correspondent bank relationships (Backbase, SWIFT GPI), bank product catalog items (deposit / loan product configurations - Mambu, Thought Machine), regulatory reports (CTR / SAR / BSA / OFAC reports - SAS AML, Oracle FCC).

- **MODULARIZATION ISSUE.** The domain has no modules at all, so the question is "what's the right module split for an 8-master + ~12-candidate-master domain?" Candidate shapes the analyst can suggest, but the user picks:
  - **BANK-OPS-ORIGINATION** (loan_applications, account_applications, credit_decisions, collateral_records)
  - **BANK-OPS-ACCOUNT-MGMT** (account_openings, account_servicing_records, banking_product_catalog_items)
  - **BANK-OPS-KYC-AML** (banking_kyc_reviews, beneficial_ownership_records, adverse_media_screenings, sar_filings) - or punted to a KYC-AML-PLATFORM domain (queued)
  - **BANK-OPS-PAYMENTS** (wire_transfers, ach_transfers, banking_transactions, payment_orders) - or punted to a PAYMENT-OPS domain (queued)
  - **BANK-OPS-CASES** (banking_cases, dispute_records, chargebacks)
  - **BANK-OPS-LOAN-SERVICING** (loan_disbursements, loan_servicing_accounts, repayment_schedules)
  - **BANK-OPS-REGULATORY** (regulatory_reports, sar_filings, ctr_reports, ofac_screenings)

- **WRONG-OWNERSHIP candidate.** `banking_cases` overlaps CSM's `customer_cases`. Two reasonable resolutions: (a) keep both - banking_cases is finance/operations-specific (dispute, fraud-claim, account-error) while customer_cases is generic CSM; (b) demote `banking_cases` to an `embedded_master` of `customer_cases` (CSM-owned). Surface in Bucket 2.

- **SCOPE-CREEP** evaluation: none obvious. The 8 masters are all clearly banking-shaped.

### Pass 3 - Neighbor discovery

Edge weights derived from `handoffs` (source = BANK-OPS) - inbound is zero. DMDO cross-references not derivable (BANK-OPS has no DMDO rows since no modules).

| Neighbor | Outbound handoffs | Inbound handoffs | Weight | Deep dive? |
| --- | --- | --- | --- | --- |
| GRC (15) | 3 (`banking_kyc_review.flagged`, `wire_transfer.sanctions_hit`, `banking_transaction.suspicious`) | 0 | 3 | yes |
| CSM (30) | 2 (`account_opening.completed`, `banking_case.opened`) | 0 | 2 | summary only |
| ERP-FIN (65) | 2 (`loan_disbursement.executed`, `wire_transfer.initiated`) | 0 | 2 | summary only |

### Pass 4 - Pairwise reconciliation per neighbor (weight >= 3)

Only **GRC** clears the weight-3 threshold; the other two get one-line summaries.

#### BANK-OPS <-> GRC (weight 3)

All four legs evaluated against GRC's catalog state at audit time. GRC has modules (e.g. `GRC-RISK-REG`, `GRC-COMPLIANCE-OPS`, etc.); the 3 outbound handoffs from BANK-OPS to GRC currently have NULL on both `source_domain_module_id` (legitimate: BANK-OPS has no modules) and `target_domain_module_id` (GRC's B10b owes resolution).

| Section | Finding |
| --- | --- |
| 1. Existing handoffs, fully wired | None (all 3 have NULL on both module FKs). |
| 2. Existing handoffs with NULL module FK | 3 rows: 886 (`banking_kyc_review.flagged`), 887 (`wire_transfer.sanctions_hit`), 888 (`banking_transaction.suspicious`). Source side NULL = wait for M1. Target side NULL = GRC owes the per-module attribution to the right GRC module (likely `GRC-COMPLIANCE-CASES` or equivalent). |
| 3. Missing handoffs the catalog implies | None obvious from existing lifecycle states (BANK-OPS has none). Once B12 lands and `banking_kyc_review` carries a `flagged`/`cleared`/`escalated` state machine, additional candidates may surface. |
| 4. Boundary integrity gaps | None (no DMDO rows on either side referencing the other's masters yet). |
| 5. Cross-domain `data_object_relationships` mirror | All 3 handoffs lack mirror relationship rows on the BANK-OPS side (B8 outbound). Proposed: `banking_kyc_reviews -> flags -> compliance_alerts` (or whatever GRC names the alert master); `wire_transfers -> flags -> compliance_alerts`; `banking_transactions -> flags -> compliance_alerts`. Owner_side=source, is_required=false. Author from BANK-OPS Phase B. |

#### BANK-OPS -> CSM (weight 2, summary)

2 outbound (`account_opening.completed`, `banking_case.opened`). Mirror relationships rows 462 / 463 exist (`account_openings opens customer_cases`, `banking_cases opens customer_cases`) but the verb `opens` is suspect (see B1-S3). No null-FK fixes possible on source side until M1.

#### BANK-OPS -> ERP-FIN (weight 2, summary)

2 outbound (`loan_disbursement.executed`, `wire_transfer.initiated`). No mirror relationships on BANK-OPS side; ERP-FIN B10b owes the target-module attribution.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (M-band cascade is the big one)

| ID | Band | Finding | Fix surface |
| --- | --- | --- | --- |
| B1-S1 | M1 | Zero `domain_modules` rows for BANK-OPS. The whole M-band, E-band, F2-F5 cascade depends on this. Recommended starting split per the modularization analysis in Pass 2: at least 2 (single-module domain has zero capabilities so M2 is vacuous, but ≥3 capabilities once A2 lands forces ≥2 full modules). | Phase A loader, hand-authored. Recommended skeleton: BANK-OPS-ORIGINATION + BANK-OPS-SERVICING + BANK-OPS-PAYMENTS + BANK-OPS-CASES + BANK-OPS-KYC-AML. Final shape depends on Bucket 2 #1. |
| B1-S2 | A2 | Zero `capability_domains` rows. Author at minimum: `BANK-ORIGINATION`, `BANK-DEPOSIT-OPS`, `BANK-KYC-AML`, `BANK-PAYMENT-OPS`, `BANK-CASE-MGMT`, `BANK-LOAN-SERVICING`, `BANK-REGULATORY-REPORTING`. Apply the cross-cutting test: most are domain-prefixed; `KYC-AML` may rise to domain-neutral if it spans the queued KYC-AML-PLATFORM, INS-CARRIER, BAAS-PLATFORM. | Phase A loader (capabilities + capability_domains + domain_module_capabilities after modules ship). |
| B1-S3 | A4 | `catalog_tagline` and `catalog_description` are empty. Draft both in buyer voice (Rule #20). Surface drafts to user for review BEFORE writing. | Loader PATCH after user-approved drafts. |
| B1-S4 | F1 / F7 | Rename `bank-ops-system` (id 31) at migration time to `<module>_agent` snake-form once per-module skills ship. Currently the only skill (transitional acceptable). Separately: `send_email` (tool id 37) link on this skill carries no workflow-specific justification - replace with `notify_person` per the channel-vs-capability rule, or PATCH+approve a notes justification on the existing row. | PATCH `skill_tools.tool_id` (or DELETE + INSERT if `notify_person` is already linked elsewhere). |

#### MISSING (compliance-mandated and universal-vendor entities)

These are not Phase 0 speculative because they are statute-mandated for any banking-ops vendor in scope of BSA / OFAC / FCRA / GLBA / CDD Rule. (Universal-vendor non-regulatory entities are deferred to Bucket 3 for vendor-research vetting.)

| ID | Entity | Proposed module (Bucket 2 #1 decides) | Regulation / basis | Notes |
| --- | --- | --- | --- | --- |
| B1-M1 | `beneficial_ownership_records` | BANK-OPS-KYC-AML | BSA Customer Due Diligence Rule (FinCEN 31 CFR 1010.230) | UBO 25%-threshold owners + control-prong individual. Mandatory at account opening for legal entity customers; not currently in the catalog. |
| B1-M2 | `sar_filings` | BANK-OPS-REGULATORY (or KYC-AML) | BSA 31 USC 5318(g) | Suspicious Activity Reports; mandatory within 30 days of detection. |
| B1-M3 | `ctr_reports` | BANK-OPS-REGULATORY | BSA 31 CFR 1010.311 | Currency Transaction Reports for cash transactions > $10k. |
| B1-M4 | `ofac_screening_records` | BANK-OPS-KYC-AML | OFAC sanctions program (50 USC 1701) | Screening result records (audit-trail for sanctions hits beyond just `wire_transfer.sanctions_hit` events). |

#### BOUNDARY (structural fixes the agent can apply)

| ID | Finding | Fix |
| --- | --- | --- |
| B1-B1 | B6 - Zero intra-domain `data_object_relationships` among 8 masters. Author at minimum: `loan_applications spawns loan_disbursements` (1:1, required), `account_applications spawns account_openings` (1:1, required), `loan_applications requires banking_kyc_reviews` (many_to_one, required), `account_applications requires banking_kyc_reviews` (many_to_one, required), `wire_transfers logs banking_transactions` (1:M, required), `loan_disbursements logs banking_transactions` (1:1, required), `banking_cases references banking_transactions` (many_to_many, optional). | Author 7 edges. Loader pattern: focused .ts loader. |
| B1-B2 | B7 - Zero `users` edges. Author 8 edges (one per master) per Rule #10. Edge verbs: loan_applications {originated_by, underwritten_by}, account_applications {opened_by, kyc_reviewed_by}, account_openings {provisioned_by, relationship_manager}, banking_kyc_reviews {reviewed_by, escalation_to}, banking_cases {assigned_to, escalated_to}, wire_transfers {initiated_by, approved_by}, loan_disbursements {funded_by}, banking_transactions {posted_by}. | Author 8 (or more, multi-actor) edges. Loader pattern: same as B1-B1. |
| B1-B3 | B8 outbound - 5 cross-domain handoffs lack mirror `data_object_relationships` (886, 887, 888, 889, 892). Per Pass 4 deltas: 3 to GRC's compliance-alert master, 2 to ERP-FIN's journal / payment master. | Author 5 relationship rows; the GRC-side target master needs lookup (GRC has multiple compliance entities; pick the one DMDO consumed at GRC). |
| B1-B4 | B9 - 10 trigger_events have `event_category=""`. PATCH each row to the right enum: 8 are `state_change` (loan_application.submitted, .approved, account_application.submitted, account_opening.completed, banking_case.opened, wire_transfer.initiated, loan_disbursement.executed, banking_kyc_review.flagged), 2 are `signal` (banking_transaction.suspicious, wire_transfer.sanctions_hit). | PATCH-loop on `trigger_events`. |
| B1-B5 | B11 - Zero aliases on non-self-explanatory masters. Author at minimum: banking_kyc_reviews (AML review, EDD review, CDD review, BSA review, due-diligence file), banking_cases (dispute case, bank dispute, complaint, regulatory case), wire_transfers (SWIFT, MT103, Fedwire, RTGS transfer), banking_transactions (posting, ledger entry, account movement). | Phase B aliases loader. |
| B1-B6 | B12 - Zero lifecycle states. Author state machines for 7 workflow-bearing masters (banking_transactions is borderline config-shape; surface in Bucket 2). State-by-state shape proposed under B-band B12 above; load with `requires_permission=true` on workflow-gate states + `permission_verb_override` where the verb is non-obvious (e.g. wire_transfers.approved -> `approve_wire_transfer`). `domain_module_id` populated per the module split chosen in Bucket 2 #1. | Phase B lifecycle loader; depends on M1 modules existing. |
| B1-B7 | B4 - PATCH pattern flags on 5 masters per the workflow shape: loan_applications {has_personal_content=true, has_submit_lock=true, has_single_approver=true (underwriter)}, account_applications {has_personal_content=true, has_submit_lock=true}, banking_kyc_reviews {has_personal_content=true}, banking_cases {has_personal_content=true (may carry PII)}, wire_transfers {has_submit_lock=true, has_single_approver=true (OFAC approver) when amount > threshold}. | PATCH `data_objects`. No notes annotation (Rule #15). |
| B1-B8 | Author `domain_aliases` for BANK-OPS: `banking operations`, `retail banking ops`, `commercial banking ops`, `deposit operations`, `core banking ops`, `bank back-office`. Per Rule #20 these feed catalog search and skill triggers; the current `domain_aliases` set is zero. | Loader INSERT on `domain_aliases`. |

#### APQC TAGGING (H1 - per-handoff PCF activity)

7 cross-domain handoffs analyzed against APQC PCF cross-industry. Volume target: 4-6 `agent_curated` tags + 1-2 defers. Proposed assignments below.

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 886 | BANK-OPS -> GRC | banking_kyc_review.flagged | banking_kyc_reviews | Manage compliance | 70 | confident L2 |
| 887 | BANK-OPS -> GRC | wire_transfer.sanctions_hit | wire_transfers | Manage compliance | 70 | confident L2 |
| 888 | BANK-OPS -> GRC | banking_transaction.suspicious | banking_transactions | Manage financial fraud/dispute cases | 323 | confident L3 |
| 889 | BANK-OPS -> ERP-FIN | loan_disbursement.executed | loan_disbursements | Process payments | 1438 | confident L4 |
| 890 | BANK-OPS -> CSM | account_opening.completed | account_openings | Manage customer service problems, requests, and inquiries | 196 | medium L3 (the trigger is account-provisioning, not service; alternative: punt to L1 customer-service for now and revisit) |
| 891 | BANK-OPS -> CSM | banking_case.opened | banking_cases | Manage financial fraud/dispute cases | 323 | confident L3 |
| 892 | BANK-OPS -> ERP-FIN | wire_transfer.initiated | wire_transfers | Process payments | 1438 | confident L4 (alternative: Authorize payment id 945) |

All 7 tagged in this pass. No defers (the PCF cross-industry framework covers all 7 handoff shapes). Author `proposal_source='agent_curated'`, `record_status='new'`. Composed key `(handoff_id, process_id)` prevents duplicates.

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split for BANK-OPS.** The semantic-pass modularization analysis suggests 5-7 modules: BANK-OPS-ORIGINATION / BANK-OPS-ACCOUNT-MGMT / BANK-OPS-KYC-AML / BANK-OPS-PAYMENTS / BANK-OPS-CASES / BANK-OPS-LOAN-SERVICING / BANK-OPS-REGULATORY. Decisions: (a) accept this 7-module shape; (b) collapse KYC-AML and REGULATORY into a single BANK-OPS-COMPLIANCE; (c) collapse ORIGINATION and ACCOUNT-MGMT into BANK-OPS-ONBOARDING; (d) defer KYC-AML out of BANK-OPS entirely if the queued KYC-AML-PLATFORM domain is promoted; (e) some other shape. The decision drives B1-S1, B1-S2, B1-B6, the entire E-band, and the F2-F5 Phase-S work.

2. **`banking_cases` vs CSM `customer_cases`.** B6 rows 462, 463 use the verb `opens`, which reads chained ("account_openings opens customer_cases" - both are nouns naming flows). Two reasonable resolutions: (a) keep `banking_cases` as its own master and rewrite the verb to `triggers` or `spawns`; (b) demote `banking_cases` to `embedded_master` of CSM's `customer_cases` (banking-specific shell over the generic case master). Option (b) collapses one whole module's worth of work.

3. **`banking_transactions` lifecycle.** B12 needs states only when the master carries a workflow. `banking_transactions` is closer to an append-only ledger entry (pending / posted / reconciled), which is config-shape-adjacent. Decide: (a) load 3 states with `requires_permission=false` (no workflow gates); (b) skip the master from B12; (c) load full states including dispute / reverse gates.

4. **`notify_team` for fan-out.** The legacy `bank-ops-system` skill carries `notify_person` not at all. For events like `wire_transfer.sanctions_hit` (compliance team + originator + manager), is the right pattern `notify_team` (broadcast) or two `notify_person` rows? Decide before Phase S re-author.

5. **Verb override decisions for B12 workflow gates.** Once lifecycle states land, four states have ambiguous auto-derived verbs: `loan_applications.approved` -> `approve_loan_application` (likely correct); `wire_transfers.approved` -> `approve_wire_transfer` (correct, but verify OFAC vs dual-approval semantics); `banking_kyc_reviews.cleared` -> auto-derives `clear_banking_kyc_reviews` (consider `clear_kyc_review` or `disposition_kyc_review`); `banking_cases.resolved` -> `resolve_banking_cases` (consider `close_case`). User picks the wording.

6. **Risk / Compliance C-band contributor.** C1 has Business Operations (owner) and Finance (contributor). The risk/compliance function (GRC owner) is clearly a co-contributor on BANK-OPS but doesn't appear. Add a third contributor row? Depends on the function spine naming; surface for user.

7. **Pairwise reconciliation scope.** Only GRC crosses the weight-3 threshold. Decide: (a) defer GRC pairwise until M1 is cured (most legs are blocked on module attribution); (b) run lightweight GRC pairwise now to surface the GRC-side missing-handoff candidates; (c) run pairwise on CSM and ERP-FIN as well despite weight 2.

### Bucket 3 - Phase 0 pending (speculative; vendor-research vetting needed)

Universal-or-near-universal vendor entities surfaced by the analyst-side market scan. Phase 0 vetting would confirm or filter. These are candidate B-band MISSING items conditional on user approval to vet.

| Candidate | Proposed module (after B2 #1) | Vendor evidence | Notes |
| --- | --- | --- | --- |
| `borrower_profiles` | BANK-OPS-ORIGINATION | nCino, Blend, Encompass, Mortgage Cadence | Distinct from generic CRM contacts; carries credit-profile / FICO snapshots. |
| `collateral_records` | BANK-OPS-ORIGINATION | nCino, Encompass, Baker Hill | Mortgage / auto / commercial collateral; valuation history, perfection status. |
| `credit_decisions` | BANK-OPS-ORIGINATION | nCino, Blend, Roostify | Underwriting decision artifact (score, decline reasons, conditions). |
| `loan_servicing_accounts` | BANK-OPS-LOAN-SERVICING | Mambu, Thought Machine, Black Knight MSP | Post-disbursement servicing record (balance, escrow, payment schedule). |
| `repayment_schedules` | BANK-OPS-LOAN-SERVICING | Mambu, Thought Machine | Amortization rows by period. |
| `adverse_media_screenings` | BANK-OPS-KYC-AML | ComplyAdvantage, Refinitiv World-Check, LSEG | Negative-news matches separate from sanctions; needed under FATF guidance. |
| `pep_screenings` | BANK-OPS-KYC-AML | ComplyAdvantage, Dow Jones, Refinitiv | Politically Exposed Person screening history. |
| `chargebacks` | BANK-OPS-CASES | Featurespace, Marqeta, Stripe Issuing | Card-network dispute records; different lifecycle from `banking_cases`. |
| `ach_transfers` | BANK-OPS-PAYMENTS | Modern Treasury, Stripe Treasury, Plaid Transfer, NACHA | Distinct from wire_transfers (different rail, NACHA rules, return windows). |
| `card_authorizations` | BANK-OPS-PAYMENTS | Marqeta, Lithic, Stripe Issuing | Real-time card auth records. |
| `correspondent_bank_relationships` | BANK-OPS-PAYMENTS | Backbase, SWIFT GPI, Wise Platform | Nostro / vostro accounts; international payment routing. |
| `banking_product_catalog_items` | BANK-OPS-ACCOUNT-MGMT | Mambu, Thought Machine, FIS Core, Finastra | Configurable product templates (deposit/loan/card variants). |
| `regulatory_reports` | BANK-OPS-REGULATORY | SAS AML, Oracle FCC, Fiserv | Generic regulatory-report master beyond SAR/CTR specifically (FBAR, FATCA, BCBS, CRR/CRD). |

### Cross-bucket dependencies

- **Bucket 1 B1-S1 (module split) unblocks the bulk of Bucket 1's downstream items.** B1-S2 (capabilities link to modules), B1-B6 (lifecycle `domain_module_id` per state), B1-B7 / B1-B3 (relationships use whichever entity ends up canonical), the whole E-band, and F2-F5 all need the modules. Recommended order: resolve Bucket 2 #1 (module split decision) first.
- **Bucket 2 #1 informs Bucket 2 #2.** If user picks (d) (defer KYC-AML out to KYC-AML-PLATFORM if promoted), several Bucket 1 compliance MISSING items (B1-M1, B1-M4) move out of BANK-OPS' scope into the new domain.
- **Bucket 3 is informed by Bucket 2 #1 (proposed module placement).** If module shape changes, several Bucket 3 candidates re-home.
- **Bucket 1 B1-S4 (F7 channel fix) is independent of all others.** Can ship in any pass.

### Per-bucket prompts

- **After Bucket 1:** *"Fix these now? Reply 'all', 'just N, M, ...', or 'skip'. Note B1-S1 (module split) needs Bucket 2 #1 resolved first."*
- **After Bucket 2:** *"What's your call on each of these 7? I'll wait per item before acting. Bucket 2 #1 is the load-bearing one - it gates Bucket 1's B1-S1, B1-B6, and the E-band."*
- **After Bucket 3:** *"Vet via Phase 0 research (full subagent pass), or eyeball-mode? If eyeball, name which of the 13 candidates ring true."*

### Report-only follow-ups (owed by other domains)

- **GRC B10b owes** target-module attribution on the 3 BANK-OPS -> GRC handoffs (886, 887, 888). The right GRC module is likely GRC-COMPLIANCE-OPS / GRC-COMPLIANCE-CASES (whichever currently masters the compliance-alert entity). Surfaces when GRC is next audited.
- **GRC B8 inbound owes** consumer DMDO coverage on `banking_kyc_reviews`, `wire_transfers`, `banking_transactions` (so the 3 outbound handoffs have a target-side consumer to attach to). GRC's B10b sub-case-2 may trigger this.
- **CSM B10b owes** target-module attribution on the 2 BANK-OPS -> CSM handoffs (890, 891). Likely CSM-CASE-MGMT or CSM-RETAIL-DESK.
- **ERP-FIN B10b owes** target-module attribution on the 2 BANK-OPS -> ERP-FIN handoffs (889, 892). Likely ERP-FIN-AP-AR or ERP-FIN-LEDGER.
- **Inbound publishers BANK-OPS may be owed once modularized:** CRM (`customer.created` -> kicks `banking_kyc_reviews`), MDM (party master refresh -> KYC re-screen), HCM (`employee.terminated` -> close internal accounts), SECOPS (`incident.escalated` -> open banking_case for account compromise). Speculative until BANK-OPS is modularized.
- **All 7 outbound `handoffs` rows carry NULL `source_domain_module_id`.** This is correctly NULL until M1 is cured, but the catalog-wide B10b sweep (mode b2) will flag them. After Phase M ships on BANK-OPS, re-run the backfill loader to resolve source-side module attribution.
