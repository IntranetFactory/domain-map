# BANK-OPS audit history

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
- **B8 FAIL (outbound direction).** Of the 7 outbound cross-domain handoffs, only 2 have a `data_object_relationships` row that mirrors the payload (rows 462, 463 against `customer_cases`). Five outbound handoffs have no relationship mirror: `banking_kyc_review.flagged` -> GRC (no edge to GRC compliance entity), `wire_transfer.sanctions_hit` -> GRC, `banking_transaction.suspicious` -> GRC, `loan_disbursement.executed` -> FIN, `wire_transfer.initiated` -> FIN.
- **B9 partial / event_category FAIL.** 10 trigger_events authored (good coverage on the 8 masters). All 10 carry `event_category=""` (empty). Per Rule #13 the enum is `lifecycle | state_change | threshold | signal`. Every event here reads as `state_change` (e.g. `loan_application.submitted`, `wire_transfer.sanctions_hit`); two read as `signal` (`banking_transaction.suspicious`, `banking_kyc_review.flagged`). Cure: PATCH `event_category` per event. Also: 3 of 10 trigger_events have no `handoffs` row at all (`loan_application.submitted`, `loan_application.approved`, `account_application.submitted`) - these are intra-domain progressions and become intra-domain `handoffs` once modules exist (B9b runs only post-modularization).
- **B9b N/A.** Domain has no modules, so the multi-module cross-pair query doesn't apply yet. Re-run B9b after M1 is cured.
- **B10 (inbound, report-only).** Zero inbound handoffs. Since BANK-OPS has zero `embedded_master` / `consumer` / `contributor` rows (because no modules), the discovery procedure has nothing to scan. Inbound publishers from CRM (contacts -> banking_kyc_reviews via customer.created), MDM (party master refresh), HCM (employee.terminated may close access on accounts), SECOPS (incident.escalated could open a banking_case) may be owed once BANK-OPS is modularized, but those are speculative until then. Report-only.
- **B10b.** All 7 outbound handoffs have NULL `source_domain_module_id` AND NULL `target_domain_module_id`. The source-side NULL is legitimate by virtue of M1 (source domain not modularized). The target-side NULL is owed by the target domain's B10b pass (GRC, FIN, CSM) - those rows resolve when those target domains run their own B10b. Report-only on the target side; the source-side resolves automatically once M1 is fixed (re-run the backfill loader after Phase M ships).
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
| FIN (65) | 2 (`loan_disbursement.executed`, `wire_transfer.initiated`) | 0 | 2 | summary only |

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

#### BANK-OPS -> FIN (weight 2, summary)

2 outbound (`loan_disbursement.executed`, `wire_transfer.initiated`). No mirror relationships on BANK-OPS side; FIN B10b owes the target-module attribution.

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
| B1-B3 | B8 outbound - 5 cross-domain handoffs lack mirror `data_object_relationships` (886, 887, 888, 889, 892). Per Pass 4 deltas: 3 to GRC's compliance-alert master, 2 to FIN's journal / payment master. | Author 5 relationship rows; the GRC-side target master needs lookup (GRC has multiple compliance entities; pick the one DMDO consumed at GRC). |
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
| 889 | BANK-OPS -> FIN | loan_disbursement.executed | loan_disbursements | Process payments | 1438 | confident L4 |
| 890 | BANK-OPS -> CSM | account_opening.completed | account_openings | Manage customer service problems, requests, and inquiries | 196 | medium L3 (the trigger is account-provisioning, not service; alternative: punt to L1 customer-service for now and revisit) |
| 891 | BANK-OPS -> CSM | banking_case.opened | banking_cases | Manage financial fraud/dispute cases | 323 | confident L3 |
| 892 | BANK-OPS -> FIN | wire_transfer.initiated | wire_transfers | Process payments | 1438 | confident L4 (alternative: Authorize payment id 945) |

All 7 tagged in this pass. No defers (the PCF cross-industry framework covers all 7 handoff shapes). Author `proposal_source='agent_curated'`, `record_status='new'`. Composed key `(handoff_id, process_id)` prevents duplicates.

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split for BANK-OPS.** The semantic-pass modularization analysis suggests 5-7 modules: BANK-OPS-ORIGINATION / BANK-OPS-ACCOUNT-MGMT / BANK-OPS-KYC-AML / BANK-OPS-PAYMENTS / BANK-OPS-CASES / BANK-OPS-LOAN-SERVICING / BANK-OPS-REGULATORY. Decisions: (a) accept this 7-module shape; (b) collapse KYC-AML and REGULATORY into a single BANK-OPS-COMPLIANCE; (c) collapse ORIGINATION and ACCOUNT-MGMT into BANK-OPS-ONBOARDING; (d) defer KYC-AML out of BANK-OPS entirely if the queued KYC-AML-PLATFORM domain is promoted; (e) some other shape. The decision drives B1-S1, B1-S2, B1-B6, the entire E-band, and the F2-F5 Phase-S work.

2. **`banking_cases` vs CSM `customer_cases`.** B6 rows 462, 463 use the verb `opens`, which reads chained ("account_openings opens customer_cases" - both are nouns naming flows). Two reasonable resolutions: (a) keep `banking_cases` as its own master and rewrite the verb to `triggers` or `spawns`; (b) demote `banking_cases` to `embedded_master` of CSM's `customer_cases` (banking-specific shell over the generic case master). Option (b) collapses one whole module's worth of work.

3. **`banking_transactions` lifecycle.** B12 needs states only when the master carries a workflow. `banking_transactions` is closer to an append-only ledger entry (pending / posted / reconciled), which is config-shape-adjacent. Decide: (a) load 3 states with `requires_permission=false` (no workflow gates); (b) skip the master from B12; (c) load full states including dispute / reverse gates.

4. **`notify_team` for fan-out.** The legacy `bank-ops-system` skill carries `notify_person` not at all. For events like `wire_transfer.sanctions_hit` (compliance team + originator + manager), is the right pattern `notify_team` (broadcast) or two `notify_person` rows? Decide before Phase S re-author.

5. **Verb override decisions for B12 workflow gates.** Once lifecycle states land, four states have ambiguous auto-derived verbs: `loan_applications.approved` -> `approve_loan_application` (likely correct); `wire_transfers.approved` -> `approve_wire_transfer` (correct, but verify OFAC vs dual-approval semantics); `banking_kyc_reviews.cleared` -> auto-derives `clear_banking_kyc_reviews` (consider `clear_kyc_review` or `disposition_kyc_review`); `banking_cases.resolved` -> `resolve_banking_cases` (consider `close_case`). User picks the wording.

6. **Risk / Compliance C-band contributor.** C1 has Business Operations (owner) and Finance (contributor). The risk/compliance function (GRC owner) is clearly a co-contributor on BANK-OPS but doesn't appear. Add a third contributor row? Depends on the function spine naming; surface for user.

7. **Pairwise reconciliation scope.** Only GRC crosses the weight-3 threshold. Decide: (a) defer GRC pairwise until M1 is cured (most legs are blocked on module attribution); (b) run lightweight GRC pairwise now to surface the GRC-side missing-handoff candidates; (c) run pairwise on CSM and FIN as well despite weight 2.

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
- **FIN B10b owes** target-module attribution on the 2 BANK-OPS -> FIN handoffs (889, 892). Likely FIN-AP-AR or FIN-LEDGER.
- **Inbound publishers BANK-OPS may be owed once modularized:** CRM (`customer.created` -> kicks `banking_kyc_reviews`), MDM (party master refresh -> KYC re-screen), HCM (`employee.terminated` -> close internal accounts), SECOPS (`incident.escalated` -> open banking_case for account compromise). Speculative until BANK-OPS is modularized.
- **All 7 outbound `handoffs` rows carry NULL `source_domain_module_id`.** This is correctly NULL until M1 is cured, but the catalog-wide B10b sweep (mode b2) will flag them. After Phase M ships on BANK-OPS, re-run the backfill loader to resolve source-side module attribution.

## 2026-05-31, Continuation: B1 technical fixes

Subagent applied the truly-technical subset of Bucket 1 via `.tmp_deploy/fix_bank_ops_b1_technical_2026_05_31.ts`. Total B1 = 17 items; 4 applied, 13 deferred.

### Applied (4 items, 47 writes)

- **B1-B4 (10 PATCH).** `trigger_events.event_category` enum backfill on ids 1004-1013: 8 `state_change` + 2 `signal` per Rule #13 vocabulary.
- **B1-B2 (14 INSERT).** `data_object_relationships` user-edges (Rule #10) for all 8 BANK-OPS masters; multi-actor masters (loan_applications, account_applications, account_openings, banking_kyc_reviews, banking_cases, wire_transfers) got 2 rows each; loan_disbursements + banking_transactions got 1 each. owner_side=source, relationship_type=one_to_many, relationship_kind=reference, is_required=false.
- **B1-B5 (16 INSERT).** `data_object_aliases` on the 4 audit-named masters: banking_kyc_reviews (5), banking_cases (4), wire_transfers (4: SWIFT/MT103/Fedwire/RTGS, all interbank-standards bodies, permitted under Rule #18 statutory exception), banking_transactions (3). All `alias_type='synonym'`.
- **B1-H1 (7 INSERT).** `handoff_processes` for all 7 outbound BANK-OPS handoffs (886-892). All 5 distinct PCFs (70, 196, 323, 945, 1438) verified resolvable in `apqc_pcf_cross_industry` before insert. `proposal_source='agent_curated'`, `role='implements'`. Handoff 890 (account_opening.completed -> CSM, PCF 196) accepted per audit's pre-specified tuple despite "medium L3" confidence note; flagged here so user can downgrade or re-target later if desired.

### Deferred (13 items)

- **B1-S1, B1-S2, B1-S3, B1-M1, B1-M2, B1-M3, B1-M4, B1-B6.** Each creates new entities (modules / capabilities / data_objects / lifecycle states / catalog_tagline / catalog_description). Outside technical scope; B1-S1 + B1-S2 + B1-S3 also gated on B2 #1 (module-split decision) and Rule #20 (user-review for tagline/description). B1-B6 also gated on B1-S1 (lifecycle states need realizing `domain_module_id`).
- **B1-S4.** Skill rename gated on M1 (per-module skills do not exist yet); send_email -> notify_person channel swap is user judgment (B2 #4).
- **B1-B1.** Intra-domain `data_object_relationships` (7 rows) pre-specified by audit but outside the task scope, which only licenses user-edges per Rule #10.
- **B1-B3.** Cross-domain mirror relationships (5 rows): requires lookup of GRC's compliance-alert master and judgment on which FIN entity to mirror against; defer to user.
- **B1-B7.** Pattern flag flips (`has_personal_content`, `has_submit_lock`, `has_single_approver`) explicitly deferred in task scope.
- **B1-B8.** New `domain_aliases` for BANK-OPS explicitly deferred in task scope.

### Errors

None. No JWT-audience errors.

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_bank_ops_b1_technical_2026_05_31.ts` (run from project root). Idempotent on re-run (skips by natural keys).

## 2026-05-31, Audit

### Summary

- Current footprint: 8 masters via legacy `domain_data_objects` (loan_applications, account_applications, account_openings, banking_kyc_reviews, banking_cases, wire_transfers, loan_disbursements, banking_transactions). **0 `domain_modules`, 0 capabilities, 0 lifecycle states.** 4 solutions, 7 outbound + 0 inbound cross-domain handoffs, 10 trigger_events (all categorized), 16 data_object_aliases on 4 masters, 16 data_object_relationships touching BANK-OPS masters (2 legacy cross-domain `opens customer_cases` + 14 user-edges per Rule #10), 1 legacy domain-level system skill (`bank-ops-system`, id 31, `domain_module_id=null`) with 10 `skill_tools`, 7/7 outbound handoffs APQC-tagged at `record_status='new'`, 0 `record_status='approved'`. 1 owner + 1 contributor business_function_domains.
- This is the second Validate b1 audit on BANK-OPS. The prior run (2026-05-30) authored 17 Bucket 1 items; the 2026-05-31 Continuation applied 4 technical subsets (B1-B2, B1-B4, B1-B5, B1-H1; 47 writes) and deferred 13. This audit confirms the applied writes landed and re-classifies the 13 deferred items against the latest module-split discussion.
- Bucket 1 (in-scope, agent fixable, technical only): 1 item (B1-B1 intra-domain edges; was deferred from prior pass as outside user-edge license, now re-licensed as deterministic).
- Bucket 2 (surface-for-user, judgment): 7 items unchanged from prior pass (still open).
- Bucket 3 (Phase 0 pending, speculative): 13 items unchanged (vendor-research vetting still open).
- All other Bucket 1 items from the prior pass are either applied (B1-B2, B1-B4, B1-B5, B1-H1) or remain blocked on Bucket 2 #1 (module-split decision), making them b1b (blocked) rather than b1a.

**Structural verdict.** M1 remains HARD FAIL: zero `domain_modules` rows. Per Rule #14 every `domains` row MUST have at least one `module_kind='full'` row, and this cascades, F2 / F5 / E1-E6 / B9b are still all blocked. The single biggest in-scope fix remains authoring the module set, which is a Bucket 2 #1 conversation, not a Bucket 1 fix.

### Pass 1, Structural findings (delta-from-2026-05-30)

#### A-band

- A1 pass (unchanged). 7 metadata fields populated.
- A2 FAIL (unchanged). Zero `capability_domains` rows.
- A3 pass (unchanged). 4 solutions linked (3 primary, 1 secondary).
- A4 FAIL (unchanged). `catalog_tagline=""`, `catalog_description=""`. Rule #20 gates writes pending user-supplied wording.

#### M-band

- M1 HARD FAIL (unchanged). Zero `domain_modules` rows.
- M2-M7 N/A until M1.

#### B-band

- B1 pass (8 masters via legacy DDO rollup). Once modules ship, rollup is derived from DMDO.
- B2 pass. Every master has labels.
- B3 pass.
- B4 FAIL (unchanged). All three pattern flags `false` on every master. B1-B7 (proposed PATCH plan: 5 masters with non-default flags) was deferred in the 2026-05-31 Continuation and is still pending; reclassified as b1b because the optimal flag pattern depends on the lifecycle states (B12), which depends on the module split (B2 #1).
- B5 N/A.
- B6 partial. 14 user-edges landed (Rule #10, B1-B2). Zero intra-domain edges among the 8 BANK-OPS masters still exist. The 7-edge intra-domain plan (loan_applications spawns loan_disbursements, account_applications spawns account_openings, etc.) is deterministic now (no module dependency, all edges are master-to-master); reclassified as b1a (B1A-B1).
- B7 PASS (was FAIL). 14 `users` -> master edges via the 2026-05-31 Continuation cover all 8 masters with multi-actor verbs (originator + underwriter, opener + KYC reviewer, etc.).
- B8 FAIL outbound (unchanged). 5 of 7 cross-domain handoffs still lack mirror `data_object_relationships`: 886 (banking_kyc_review.flagged -> GRC), 887 (wire_transfer.sanctions_hit -> GRC), 888 (banking_transaction.suspicious -> GRC), 889 (loan_disbursement.executed -> FIN), 892 (wire_transfer.initiated -> FIN). The 2 existing edges (462, 463) point at CSM customer_cases. B1-B3 deferred from prior pass; remains blocked on GRC compliance-alert-master + FIN journal-master lookups.
- B9 PASS (was FAIL). All 10 trigger_events carry `event_category` (8 `state_change` + 2 `signal`) per the 2026-05-31 Continuation B1-B4 patch.
- B9b N/A. No modules.
- B10 (inbound, report-only). Zero inbound handoffs. Speculative until M1.
- B10b. All 7 outbound handoffs still NULL on both `source_domain_module_id` (legitimate, awaits M1) and `target_domain_module_id` (target B10b owes attribution; GRC, FIN, CSM each owe per-module FK on their inbound side).
- B11 PASS (was FAIL). 16 aliases on the 4 non-self-explanatory masters per the 2026-05-31 Continuation B1-B5 patch.
- B12 FAIL (unchanged). Zero `data_object_lifecycle_states` rows for any master. Workflow-bearing masters (loan_applications, account_applications, account_openings, banking_kyc_reviews, banking_cases, wire_transfers, loan_disbursements) need state machines; `banking_transactions` is borderline config-shape (Bucket 2 #3). B1-B6 from prior pass; remains b1b (lifecycle states need realizing `domain_module_id` which depends on Bucket 2 #1).

#### C-band

- C1 pass (1 owner: Business Operations, 1 contributor: Finance). Bucket 2 #6 (add Risk/Compliance contributor) still open.
- C2 N/A no capabilities.

#### E-band

- E1-E6 N/A blocked by M1.

#### F-band

- F1 (transitional). Legacy `bank-ops-system` (id 31) is still the only skill on BANK-OPS. Acceptable transitional state per F1 rule until per-module skills ship.
- F2 / F5 N/A. No modules to anchor module-level system skills.
- F3 (legacy skill). 10 `skill_tools`: 8 `query_<master>` (each with valid `data_object_id`) + `send_email` (id 37) + `sign_document` (id 42). All 10 rows `requirement_level='required'`.
- F4 PASS. All 10 tools satisfy the `operation_kind` <-> `data_object_id` invariant (query needs DO id, side_effect needs NULL).
- F7 FAIL (unchanged). `send_email` channel primitive still linked on `bank-ops-system`. Rule says replace with `notify_person` capability. B1-S4 deferred (gated on Bucket 2 #4 dual-or-fanout decision).

#### H-band (APQC tagging)

- H1 process-health PASS (was FAIL). 7/7 outbound handoffs have `agent_curated` `handoff_processes` rows per the 2026-05-31 Continuation B1-H1 patch. PCFs: 70 (Manage compliance) on 886/887, 323 (Manage financial fraud/dispute cases) on 888/891, 1438 (Process payments) on 889/892, 196 (Manage customer service problems, requests, and inquiries) on 890.
- H1 catalog-quality (headline) FAIL. 0 of 7 rows are `record_status='approved'`. Per the audit-procedure rule that the headline measure is approved-count (not agent_curated-count), the quality bar requires user review and explicit `approved` stamping on each. Per Rule #1, agent cannot self-approve. Surface as a Bucket 2 item.

### Pass 2 / 3 / 4

No re-run of market scan, neighbor discovery, or pairwise reconciliation in this Validate pass. The 2026-05-30 audit's Pass 2-4 findings remain authoritative (no new neighbor handoffs landed and the modularization analysis remains the open Bucket 2 #1 conversation). If the user wants a refreshed market surface for BANK-OPS, that is a separate pass.

### Bucket 1, In-scope confirmed gaps (technical, agent-fixable now)

#### BOUNDARY

| ID | Finding | Fix surface |
| --- | --- | --- |
| B1A-B1 | B6 intra-domain edges. Zero intra-domain `data_object_relationships` among 8 BANK-OPS masters. The 7-edge plan from the 2026-05-30 audit B1-B1 (loan_applications spawns loan_disbursements 1:1 required; account_applications spawns account_openings 1:1 required; loan_applications requires banking_kyc_reviews many_to_one required; account_applications requires banking_kyc_reviews many_to_one required; wire_transfers logs banking_transactions 1:M required; loan_disbursements logs banking_transactions 1:1 required; banking_cases references banking_transactions many_to_many optional) does not need modules to land, both endpoints are domain masters. Reclassified from deferred to b1a. | Focused .ts loader. INSERT 7 rows on `data_object_relationships` with `owner_side='source'`, `relationship_kind='reference'`. |

### Bucket 2, Surface-for-user (judgment calls)

All 7 items from the 2026-05-30 pass remain open. No new B2 items in this audit. Item summaries:

1. **Module split for BANK-OPS.** Pick a shape from 5-7 candidate modules (ORIGINATION / ACCOUNT-MGMT / KYC-AML / PAYMENTS / CASES / LOAN-SERVICING / REGULATORY) or collapse / defer to queued KYC-AML-PLATFORM. Gates B1-S1, B1-S2, B1-B6, the entire E-band, F2-F5.
2. **`banking_cases` vs CSM `customer_cases`.** Resolve verb ambiguity on rows 462/463 or demote `banking_cases` to `embedded_master` of CSM's `customer_cases`.
3. **`banking_transactions` lifecycle shape.** Full workflow with dispute/reverse gates, slim 3-state pending/posted/reconciled, or skip B12 entirely.
4. **`notify_team` vs paired `notify_person`** for compliance fan-out (sanctions_hit, suspicious). Drives the F7 fix shape.
5. **Verb override decisions** for 4 ambiguous auto-derived workflow-gate verbs (loan_applications.approved, wire_transfers.approved, banking_kyc_reviews.cleared, banking_cases.resolved).
6. **Risk / Compliance C-band contributor.** Add as a third business_function_domains row?
7. **Pairwise reconciliation scope.** GRC pairwise now (weight 3) or defer until M1 cured.
8. **NEW: H1 catalog-quality approvals.** 7 agent_curated `handoff_processes` rows are at `record_status='new'`. Per Rule #1, the agent cannot self-approve. The user reviews and stamps `approved` per row (handoff_id, process_id pairs: 886/70, 887/70, 888/323, 889/1438, 890/196, 891/323, 892/1438). Optional batch decision possible.

### Bucket 3, Phase 0 pending (speculative)

All 13 candidate entities from the 2026-05-30 pass remain open. No new B3 items. Vendor evidence summary unchanged: borrower_profiles, collateral_records, credit_decisions (nCino / Blend / Encompass / Roostify); loan_servicing_accounts, repayment_schedules (Mambu / Thought Machine / Black Knight MSP); adverse_media_screenings, pep_screenings (ComplyAdvantage / Refinitiv World-Check / Dow Jones); chargebacks (Featurespace / Marqeta / Stripe Issuing); ach_transfers, card_authorizations, correspondent_bank_relationships (Modern Treasury / Stripe Treasury / Plaid / NACHA / Marqeta / Lithic / Backbase / SWIFT GPI); banking_product_catalog_items (Mambu / Thought Machine / FIS Core / Finastra); regulatory_reports (SAS AML / Oracle FCC / Fiserv).

### Cross-bucket dependencies

- **Bucket 2 #1 (module split) gates** B1B-S1, B1B-S2, B1B-S4, B1B-B6, B1B-B7, B1B-M1, B1B-M2, B1B-M3, B1B-M4, the entire E-band, F2-F5. Resolving #1 unblocks 10+ items in one decision.
- **Bucket 2 #3 (banking_transactions lifecycle)** is independent.
- **Bucket 2 #4 (channel pattern)** gates B1B-S4.
- **Bucket 2 #8 (H1 approvals)** is independent.
- **B1A-B1 (intra-domain edges)** is independent and immediately actionable.
- **B1B-B3 (cross-domain B8 mirrors)** is independent of M1 in principle but depends on GRC compliance-alert-master and FIN journal-master lookups (b3-shaped sub-task), so it is parked as b1b with `blocked_by[]` pointing at catalog_addition triggers.
- **B3 (13 candidates)** is partly informed by Bucket 2 #1 (proposed module placements re-home if shape changes).

### Per-bucket prompts

- **After Bucket 1:** *"Apply B1A-B1 (7 intra-domain edges) now? Reply 'yes' or 'skip'."*
- **After Bucket 2:** *"What's your call on items 1-8? I'll wait per item. #1 is load-bearing for ~10 b1b items."*
- **After Bucket 3:** *"Vet via Phase 0 research (full subagent pass), or eyeball-mode? If eyeball, name which of the 13 candidates ring true."*

### Report-only follow-ups (unchanged from prior audit)

- GRC B10b owes target-module attribution on 886, 887, 888.
- GRC B8 inbound owes consumer DMDO coverage on banking_kyc_reviews, wire_transfers, banking_transactions.
- CSM B10b owes target-module attribution on 890, 891.
- FIN B10b owes target-module attribution on 889, 892.
- Inbound publishers BANK-OPS may be owed (CRM / MDM / HCM / SECOPS) speculative until modularized.
- All 7 outbound handoffs carry NULL `source_domain_module_id` (cured by re-running backfill loader after Phase M ships).

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

---

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass over the open BANK-OPS state items (no fresh from-scratch audit). Live re-verify on 2026-06-07 confirmed BANK-OPS is still UNBUILT: domain_id=43 has 0 domain_modules (M1 HARD FAIL) and 0 capability_domains (A2 FAIL). Per the build-leave discipline the agent did NOT scaffold modules / capabilities / lifecycle states; it surfaced the build and executed every open item that is independent of it. All writes landed at record_status='new'. Loader: `.tmp_deploy/fix_bank_ops_state_2026_06_07.ts` (idempotent), plus one direct INSERT for the GRC C-band row.

Notable correction vs the stale snapshot: C1 already had 2 business_function_domains rows (owner Business Operations id 34, contributor Finance id 4) at the time of this pass, so the prior "1 owner + 1 contributor" baseline held; this pass added GRC as a third (contributor).

### Executed (5 write types, 24 writes)

- **entity_type classification (Rule #12 / band B13), 8 PATCH.** All 8 masters were `unclassified`. Classified deterministically from descriptions: loan_applications, account_applications, account_openings, banking_kyc_reviews, banking_cases, wire_transfers, loan_disbursements -> `operational_workflow` (each carries an approval/review/execution lifecycle); banking_transactions -> `operational_record` (append-only posted ledger entry with reconciliation status, no approval gate; lifecycle states not required, so B12 now passes for it regardless). This unblocks the write-tier derivation and removes the B13 fail.
- **Catalog UX (Rule #20 / A4), 2 fields on domains.id=43.** Both `catalog_tagline` and `catalog_description` were empty, so buyer-voice copy was authored and written straight in (no chat gate, no overwrite of any non-empty value). Workflow + value voice, no vendor/product names, no em-dash, American English. This cures A4 and closes former B1B-S3 + B2-tagline-text.
- **Intra-domain data_object_relationships (B1A-B1 / band B6), 7 INSERT.** Master-to-master edges, owner_side=source, relationship_kind=reference, idempotent on (data_object_id, related_data_object_id, relationship_verb): loan_applications spawns loan_disbursements (1:1, req); account_applications spawns account_openings (1:1, req); loan_applications requires banking_kyc_reviews (1:1, req); account_applications requires banking_kyc_reviews (1:1, req); wire_transfers logs banking_transactions (1:M, req); loan_disbursements logs banking_transactions (1:1, req); banking_cases references banking_transactions (M:M, optional). The two "requires banking_kyc_reviews" edges were modeled 1:1 because the relationship_type enum has no many_to_one (each application carries its own review); direction preserved via verb + owner_side.
- **domain_aliases (B1B-B8), 6 INSERT.** Generic banking synonyms, alias_type=synonym: banking operations, retail banking ops, commercial banking ops, deposit operations, core banking ops, bank back-office. These are clearly-enumerated generic synonyms (the stale B2-aliases-text confirm gate was overridden per the execute contract); closes former B1B-B8 + B2-aliases-text.
- **business_function_domains (C1 / former B2-6), 1 INSERT.** GRC (Governance, Risk and Compliance, business_function_id=31) added as a `contributor` on BANK-OPS (row id 427). Clearly-correct for a banking domain that performs KYC/AML, sanctions screening, and suspicious-activity detection and fires those signals to GRC. Resolves B2-6 by execution.

### Surfaced (b2 + destructive + deferred, owed to user)

- **B2-1 (module split, load-bearing).** Pick the BANK-OPS module shape (7-module / 5-module COMPLIANCE collapse / 6-module ONBOARDING collapse / defer KYC-AML to KYC-AML-PLATFORM / other). Gates the build (B1A-BUILD) and ~9 b1b items.
- **B2-2 (banking_cases vs CSM customer_cases).** Rewrite the suspect 'opens' verb, demote banking_cases to embedded_master of customer_cases, or disambiguate. Options (a)/(b) overwrite/restructure existing rows (462/463) -> destructive, needs sign-off; not applied.
- **B2-3 (banking_transactions lifecycle).** Now classified operational_record (states optional). Decide: full dispute/reverse machine, slim 3-state, or leave stateless.
- **B2-5 (verb override wording).** Pick permission-code verbs for loan_applications.approved, wire_transfers.approved, banking_kyc_reviews.cleared, banking_cases.resolved (drives B1B-B6).
- **B2-7 (GRC pairwise timing).** Defer until M1 cured, run lightweight GRC pairwise now, or run CSM + FIN too.
- **B2-8 (H1 catalog-quality approvals), DESTRUCTIVE.** All 7 agent_curated handoff_processes rows (886/70, 887/70, 888/323, 889/1438, 890/196, 891/323, 892/1438) verified present at record_status='new'; coverage is complete. Stamping `approved` is a record_status flip the agent never does (Rule #1) -> user decision. Pair 890/196 carries a 'medium L3 confidence' note.
- **Personas / RACI (Phase P).** DEFERRED: the domain is unbuilt (single-module-by-absence), so Phase P does not apply yet. No personas authored. Candidate personas once built and multi-module: Loan Officer, KYC/AML Analyst, Compliance Officer, Banking Operations Manager, Case Agent, Teller.

### Left (untouched)

- **B1A-BUILD + b1b (B1B-S1, B1B-S2, B1B-M1..M4, B1B-B6, B1B-B7).** Blocked on the build / on B2-1 (module split). B1B-B6 also gated on B2-3 + B2-5; B1B-B7 gated on B1B-B6. Not scaffolded per the unbuilt-leave rule.
- **B1B-B3 (5 cross-domain mirror relationships).** Blocked on GRC compliance-alert master + FIN payment/journal master lookups (owed by those domains' audits).
- **Former B1B-S4 + B2-4 (send_email -> notify_person on bank-ops-system skill_tools; channel fan-out pattern).** RETIRED by the 2026-06-06 per-domain-skill supersession (skill_tools / per-module-skill model dropped). Reframed as a note in the state header; not acted on.
- **b3 (13 candidate masters).** Backlog; vendor-research vetting still open.

### Errors

None. No JWT-audience errors.

### UI links (tables written)

- https://tests.semantius.app/domain_map/data_objects?id=in.(602,603,604,605,606,607,608,609)
- https://tests.semantius.app/domain_map/domains?id=eq.43
- https://tests.semantius.app/domain_map/data_object_relationships
- https://tests.semantius.app/domain_map/domain_aliases?domain_id=eq.43
- https://tests.semantius.app/domain_map/business_function_domains?domain_id=eq.43

---

## 2026-06-08 - Phase 0 + q-file regeneration (Rule #22 remediation)

### Why this pass ran

The 2026-06-07 pass surfaced the BANK-OPS market-shape `b2` calls (module split, banking_cases ownership, transaction lifecycle) without a current Phase 0 vendor-surface report. Their recommendations leaned on generic "mirrors how the major banking-ops platforms present their product" reasoning with no named-vendor specifics. Rule #22 (the forcing step, skill-changelog 2026-06-08) requires every market-shape recommendation to be backed by a CURRENT Phase 0 report produced THIS pass, with named-vendor evidence embedded INLINE in each recommendation. This pass ran Phase 0 first, then regenerated the q-file from its evidence. Research + file-authoring only; no DB writes; the build stays gated on the user's answers.

### Vendor study

Live re-verify 2026-06-08: BANK-OPS (domain_id=43) still has 0 domain_modules (M1 hard fail) and 8 masters via legacy domain_data_objects. Still UNBUILT; the build is surfaced, not scaffolded.

Flagship vendors studied (7 full columns): nCino (Bank Operating System), Backbase (Engagement Banking Platform / Banking OS), Mambu (Cloud Banking Platform), Thought Machine (Vault Core), Temenos (Transact + Financial Crime Mitigation, the one suite vendor per protocol), Oracle Financial Crime & Compliance Mgmt (FCCM), NICE Actimize (compliance specialists #1 and #2). Adjacent cross-checks (not full columns): Fiserv DNA / FIS / Jack Henry (incumbent cores), ICE Encompass (LOS) + Black Knight MSP (servicing), Featurespace / Clari5 / Feedzai (transaction fraud), Modern Treasury / Stripe Treasury / Plaid (payment rails), Fenergo / Alloy / Trulioo (KYC onboarding).

Banking is a regulated market, so per the protocol's compliance table kyc_records, aml_alerts, and suspicious_activity_reports loaded into the surface matrix regardless of vendor presence; both financial-crime specialists (Oracle FCCM, NICE Actimize) are included. Report saved to `.tmp_deploy/BANK-OPS-phase0-2026-06-08.md` (flagship table, entities x 7-vendor surface matrix, compliance entities, modularization hypothesis).

### Surface-matrix highlights

- **Origination vs servicing are SEPARATE marketed markets.** ICE Encompass holds ~50% of loan originations; Black Knight MSP is a distinct servicing platform; ICE had to build an explicit Encompass-to-MSP bridge. This grounds keeping BANK-OPS-ORIGINATION and BANK-OPS-LOAN-SERVICING as separate modules.
- **KYC-AML is a STANDALONE specialist market.** Oracle FCCM (KYC, AML EE, watchlist, CTR, SAR as discrete apps bought together or separately) and NICE Actimize (SAM, WL-X, CDD/KYC, SAR/STAR, CTR, alert/case mgmt) are independent products that integrate WITH a core, not features of it. Grounds a dedicated KYC-AML module (and makes option d, deferring it out to a sibling domain, defensible).
- **The transaction ledger is append-only / immutable across the core vendors.** Thought Machine Vault Core "maintains a real-time, immutable, append-only ledger built on proven double-entry bookkeeping"; Mambu and Temenos run the same double-entry sub-ledger. Grounds leaving banking_transactions stateless (B2-3=c).
- **Financial crime + regulatory reporting are bundled into the core by suite vendors but split out by specialists.** Temenos FCM and the incumbent cores (Fiserv DNA, FIS) bundle watchlist/KYC/AML/fraud and reporting INTO the core; Oracle/Actimize unbundle them. This is exactly the b2 fork (7-module split vs 5-module COMPLIANCE collapse).
- **Investigation / dispute cases are first-class and distinct from generic CSM cases.** Backbase coordinates "disputes, payments, and lending work" with full auditability; NICE Actimize ships dedicated financial-crime alert-and-case management; card-network disputes/chargebacks carry their own reason-code + Reg E lifecycle. Grounds keeping banking_cases as its own master (B2-2=a).
- **Compliance entities confirmed first-class in the specialists.** beneficial_ownership_records (FinCEN CDD Rule, UBO 25% + control prong), ofac_screening_records (OFAC watchlist), aml_alerts, sar_filings (FinCEN 30-day), ctr_reports (cash > USD 10k) are all discrete app modules in Oracle FCCM / NICE Actimize, validating the B1B-M1..M4 MISSING items.

### Per-decision verdicts (q-file recommendations, now vendor-grounded inline)

- **q1 / B2-1 (module split): Recommended (a) 7-module.** Grounded in the origination-vs-servicing and KYC-AML-standalone-market facts above; the b/c/d collapses each tied to a named vendor (b=Temenos/Fiserv/FIS bundle; c=nCino/Backbase one-journey onboarding; d=Oracle/Actimize freestanding specialist).
- **q2 / B2-2 (banking_cases vs CSM): Recommended (a) keep own master + rewrite verb.** Grounded in Backbase / NICE Actimize first-class case management. Destructive (rewrites rows 462/463), surfaced for sign-off, not executed.
- **q3 / B2-3 (banking_transactions lifecycle): Recommended (c) leave stateless.** Grounded in the immutable double-entry ledger evidence (Thought Machine / Mambu / Temenos).
- **q4-q7 / B2-5 (verb wording): non-market.** Permission-code naming; grounded in real workflow practice (origination approve/decline; wire dual-control + sanctions hold; KYC multi-outcome disposition; banking-case-specific resolve verb). Left as-is.
- **q8 / B2-7 (GRC pairwise timing): non-market** process-sequencing call; recommended (a) defer until modules exist. Left as-is.
- **q9 / B2-8 (H1 approvals): destructive approval gate;** recommended (a) approve all. Left for the user (record_status flip the agent never does).
- **q10 / B3 (deeper masters): Optional.** Phase 0 ELEVATED several former b3 candidates to Core/Common in the surface matrix (deposit_accounts, loan_servicing_accounts, repayment_schedules, ach_transfers, banking_product_catalog_items = Core; credit_decisions, collateral_records, borrower_profiles, card_authorizations, disputes/chargebacks = Common). Still b3 (additive, after the build) but reframed as genuine workflow substrate. q10 framing updated.

### Reversals

None. Unlike the PRM 2026-06-08 pass (which reversed two recommendations), the fresh BANK-OPS Phase 0 CONFIRMS every prior market/workflow-shape recommendation rather than overturning it. The 7-module shape, banking_cases as own master, and stateless transaction ledger all survive the vendor check and are now grounded in named-vendor evidence instead of generic framing.

### Files written / edited

- `.tmp_deploy/BANK-OPS-phase0-2026-06-08.md` (new: Phase 0 report)
- `audits/BANK-OPS/q-BANK-OPS.md` (regenerated: inline vendor evidence on every recommendation, `> Grounding:` block, phase0 + reversed footer notes)
- `audits/BANK-OPS/state.yaml` (added 2026-06-08 Phase 0 note block after the SUPERSEDED header; last_audit -> 2026-06-08; vendor grounding added to B2-1 / B2-2 / B2-3 `why`; status stays feedback_needed / next_action_by user)
- `audits/BANK-OPS/history.md` (this section)

### Errors

None. No JWT-audience errors. No DB inserts / updates / deletes.

## 2026-06-13 - Audit (B9d verification, the one agent-actionable item)

Ran the per-domain audit. BANK-OPS is still UNBUILT (live: 0 `domain_modules`, 0 `capability_domains`), so the entire build cascade (B1A-BUILD and the B1B-* items) stays correctly gated on the user decision B2-1 (module split), which is a genuine market-shape `b2` already backed by the fresh 2026-06-08 Phase 0 report. The only agent-actionable open item was `B1A-B9D-VERIFY`; this pass executed it.

### B9d (handoff payload realization, both directions) - RESOLVES B1A-B9D-VERIFY

Ran `bun run scripts/analytics/b9d_resolver.ts BANK-OPS` (`--dry-run` then `--write`).

- **Inbound:** 0 handoffs target BANK-OPS (`target_domain_id=eq.43` is empty), so the inbound half is empty by construction. The outbound boundary is 7 handoffs: BANK-OPS to GRC (886/887/888), to CSM (890/891), to FIN (889/892).
- **Classification:** all 7 boundary tags resolve to 4 distinct `(process, owner)` findings, all **UNOWNED**:
  - 11.2 "Manage compliance" (pid 70) -> banking_kyc_reviews, wire_transfers (886, 887)
  - 6.2.2 "Manage customer service problems/requests/inquiries" (pid 196) -> account_openings (890)
  - 9.7.6 "Manage financial fraud/dispute cases" (pid 323) -> banking_transactions, banking_cases (888, 891)
  - 9.6.1.8 "Process payments" (pid 1438) -> loan_disbursements, wire_transfers (889, 892)
- **Why UNOWNED is the unbuilt artifact, not a real gap:** BANK-OPS masters every one of these payloads (id 604-609) via legacy `domain_data_objects` role=master rows, but has ZERO `domain_module_data_objects` master rows because there are no modules yet. The resolver reads ownership at module grain, finds no master DMDO row, and reports UNOWNED. The owner of every payload IS BANK-OPS itself.
- **No agent-actionable output:** no RESOLVED (nothing is realized yet, no lifecycle process gates), no ROLL-UP to re-point, no MIS-TAG (all 4 APQC categories fit their boundaries), no neighbor-routable ORPHAN (the owner is this domain, not a neighbor). `--write` applied no additive owner-file edits and wrote nothing to any audit file or to the catalog. The 4 UNOWNED items are owner-side-blocked on B1A-BUILD (gated on B2-1); B9d will RESOLVE them automatically once the build authors module-grain masters, lifecycle `process_id` gates, and `process_raci`.

`B1A-B9D-VERIFY` is removed from `state.yaml` (resolved); `next_action_by` flipped agent -> user; `last_audit` -> 2026-06-13. Everything else still open is a user `b2` decision (B2-1, B2-2, B2-3, B2-5, B2-7, B2-8) surfaced in the existing `q-BANK-OPS.md`, or a `b1b` blocked on those decisions / the build.

### Files written / edited

- `audits/BANK-OPS/state.yaml` (removed resolved B1A-B9D-VERIFY; next_action_by agent -> user; last_audit -> 2026-06-13; added 2026-06-13 B9d note block)
- `audits/BANK-OPS/history.md` (this section)

### Errors

None. No JWT-audience errors. No DB inserts / updates / deletes. No `record_status` changes (Rule #1).
