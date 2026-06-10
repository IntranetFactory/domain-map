# Banking Operations (BANK-OPS): questions waiting for you

## What this domain is
Run the day-to-day operations of a bank from one place: open accounts, originate and fund loans, move money, and keep every step inside the rules.

Take a customer from application through KYC and AML checks to a live account, underwrite and disburse loans, send and screen wire transfers, post and reconcile transactions, and work disputes and investigation cases. Screen against sanctions and suspicious-activity signals, hand the right alerts to your risk and compliance team, and keep the regulatory filings (SAR, CTR, OFAC) that examiners expect.

> Grounding: these recommendations are backed by a fresh vendor-surface study (7 flagship vendors plus adjacent cross-checks, 2025-2026 product docs) saved at `.tmp_deploy/BANK-OPS-phase0-2026-06-08.md`. Banking is a regulated market, so the BSA/OFAC compliance entities (KYC reviews, beneficial ownership, sanctions screening, AML alerts, SAR, CTR) load into the surface matrix regardless of how many vendors expose them publicly. The decisive market signal: origination and servicing are SEPARATE marketed markets (ICE Encompass holds ~50% of loan origination, Black Knight MSP is a distinct servicing platform, ICE had to build an explicit bridge between them), and financial-crime / KYC-AML is sold as a STANDALONE specialist market (Oracle FCCM and NICE Actimize are independent products that integrate WITH a core, not features baked into it).

---

q1: (answer this first) How should Banking Operations be split into modules (the sub-areas of the product)?

- a) Seven modules: Origination (loan and account applications, credit decisions, collateral, borrower profiles), Account Management (account openings, deposit accounts, product catalog), KYC/AML (due-diligence reviews, beneficial ownership, sanctions screening, AML alerts), Payments (wires, ACH, card auths, the transaction ledger), Cases (disputes and investigations), Loan Servicing (disbursements, servicing accounts, repayment schedules), Regulatory (SAR, CTR, and other filings).

- b) Five modules: same as (a) but fold KYC/AML and Regulatory together into one Compliance module.

- c) Six modules: same as (a) but fold Origination and Account Management together into one Onboarding module.

- d) Defer KYC/AML out of Banking Operations entirely into a separate KYC-AML platform domain, and keep the rest.

- e) Some other shape (describe it).

Recommended: a. The seven-module shape is the union of how the leaders carve their product surfaces, and two market facts make the splits real rather than cosmetic. First, origination and servicing are distinct markets: ICE's Encompass loan-origination system has roughly 50% of originations while Black Knight MSP is a separate servicing platform, and the two needed an explicit integration bridge, so a Loan Servicing module separate from Origination matches reality. Second, KYC/AML is a standalone specialist market: Oracle FCCM (KYC, AML, watchlist, CTR, SAR as discrete apps you can buy together or separately) and NICE Actimize (SAM, WL-X, CDD/KYC, SAR/CTR) are independent products banks bolt onto a core, which is exactly why KYC/AML deserves its own module. The collapse options are each defensible against specific vendors: (b) matches Temenos and the incumbent cores (Fiserv DNA, FIS) that bundle financial-crime mitigation and regulatory reporting INTO the core; (c) matches nCino and Backbase, which treat origination plus account opening as one onboarding journey ("identity, documents, eligibility, credit, disbursement in one journey"); (d) is supported by the fact that Oracle/Actimize sell KYC-AML freestanding, but it forfeits the in-platform integration that nCino, Backbase, and Temenos all ship. This choice drives the whole build (modules, capabilities, lifecycles, roles, and where the compliance entities live), so it unlocks everything below it.

a1:

---

q2: Banking cases (id 606) overlap with the customer cases your CSM domain already owns, and the two existing links use the vague verb "opens". How should that be resolved?

- a) Keep banking cases as their own master and rewrite the verb to "triggers" or "spawns".
- b) Demote banking cases to an embedded master of the CSM customer-cases master (CSM becomes the owner).
- c) Keep both and just disambiguate the verbs.

Recommended: a. The banking-ops vendors model investigation / dispute cases as a first-class object distinct from generic customer service cases: Backbase coordinates "customer operations, disputes, payments, and lending work" with full auditability in its case-management plane, and NICE Actimize ships dedicated financial-crime alert-and-case management (false-positive triage, escalation of true positives) that a generic CSM case shell cannot represent. Card-network disputes and chargebacks add their own time-bounded lifecycle (Visa/MC reason codes, Reg E windows) that does not fit CSM's shape. So keeping banking cases as a first-class master and fixing the misleading "opens" verb is the right cut. Note that options (a) and (b) overwrite or restructure existing rows (462/463), so either one needs your sign-off before it runs.

a2:

---

q3: Banking transactions (id 609) are an append-only ledger record and do not require a lifecycle. Do you still want a state machine on them, and if so which shape?

- a) Full workflow with dispute and reverse gates (pending, posted, reconciled, disputed, reversed).
- b) Slim three-state machine (pending, posted, reconciled) with no permission gates.
- c) Leave them stateless as a pure ledger record.

Recommended: c. The core vendors are explicit that the transaction ledger is append-only and immutable: Thought Machine's Vault Core "maintains a real-time, immutable, append-only ledger built on proven double-entry bookkeeping" where every transaction posts balanced debit/credit entries, and Mambu and Temenos run the same double-entry sub-ledger model. In that model you do not mutate a posted entry; a dispute or reversal is a NEW correcting entry (and the dispute itself lives on the banking-cases master, q2), not a state change on the original. The entity is already classified as an operational record and passes validation without states, so leaving it stateless matches how the ledger actually works rather than overlaying a workflow the vendors do not.

a3:

---

q4: For the loan-application approval gate, should the permission be named "approve_loan_application"? (yes/no)

Recommended: yes. It is the clear, conventional verb for that gate, and origination is genuinely an approve/decline workflow in every origination vendor (nCino, Backbase, Encompass all gate the underwriting decision).

a4:

---

q5: For the wire-transfer approval gate, should the permission be named "approve_wire_transfer" (after you confirm whether approval is single-approver or dual-approval above a threshold)? (yes/no)

Recommended: yes. The verb is correct; just confirm the single-versus-dual approval semantics so the gate matches your OFAC controls. Wires are irrevocable once settled on Fedwire, so most institutions run dual control plus a sanctions-screening hold above a threshold (the wire passes through screening before it can be approved and sent), which is why this gate is load-bearing.

a5:

---

q6: For the KYC review disposition gate, which permission wording do you prefer?

- a) clear_kyc_review
- b) disposition_kyc_review

Recommended: b. The vendors treat a KYC review as a multi-outcome decision, not a binary clear: Oracle FCCM runs Due Diligence, Enhanced Due Diligence, and continuous monitoring, and NICE Actimize alert management escalates true positives rather than simply clearing them. "Disposition" covers cleared, flagged, and escalated outcomes, so it reads more accurately for the review gate than "clear".

a6:

---

q7: For the banking-case closeout gate, which permission wording do you prefer?

- a) resolve_banking_case
- b) close_case

Recommended: a. It keeps the verb specific to banking cases and avoids colliding with the generic CSM "close case" action, which matters because q2 keeps banking cases as their own master distinct from CSM customer cases.

a7:

---

q8: For the GRC pairwise reconciliation (GRC is the heaviest neighbor), how should the timing be handled?

- a) Defer it until the modules exist, since most legs are blocked on module attribution.
- b) Run a lightweight GRC pairwise now to surface candidate missing handoffs from the GRC side.
- c) Run CSM and ERP-FIN pairwise too, even though they are lighter-weight neighbors.

Recommended: a. Most reconciliation legs cannot be wired until the module split lands (the source-side module attribution on the three BANK-OPS to GRC handoffs is null until BANK-OPS has modules), so deferring avoids rework. This is a process-sequencing call, not a market-shape one.

a8:

---

q9: The seven cross-domain process tags on the outbound handoffs are present but still marked provisional (record_status "new"). How should they be approved?

- a) Approve all seven.
- b) Approve all except the account-opening to CSM tag (890/196), which carries a "medium confidence" note.
- c) Review each row one by one.
- d) Leave them all as provisional for now.

Recommended: a. Coverage is complete and verified; only the approval stamp is owed. Approving is a record_status flip the agent never does on its own, so it needs your call. Pick (b) if you want to re-check the account-opening tag first.

a9:

---

## Optional (will not hold up the build)

q10: Beyond the eight masters modeled today, the flagship banking-ops vendors point to deeper objects. Should I research and add the ones that hold up? (yes/no)

The fresh vendor study elevated several of these from "discretionary extras" to Core or Common in the surface matrix, so they are stronger candidates than before:

- Core (3+ vendors): deposit_accounts, loan_servicing_accounts, repayment_schedules, ach_transfers, banking_product_catalog_items (Mambu, Thought Machine, Temenos, nCino, Backbase model these as first-class).
- Common (2 vendors): credit_decisions, collateral_records, borrower_profiles, card_authorizations, disputes/chargebacks.
- Still discretionary: correspondent_bank_relationships, adverse_media_screenings, pep_screenings, regulatory_reports (beyond SAR/CTR).

Recommended: yes, but additive and after the modules exist. Several are now Core in the vendor surface (especially the loan-servicing trio and the deposit/product-catalog pair), so they are genuine workflow substrate rather than nice-to-haves; they still want a verification pass per candidate before loading.

a10:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B2-5.loan q5=B2-5.wire q6=B2-5.kyc q7=B2-5.case q8=B2-7 q9=B2-8 q10=B3 | domain_id=43 | phase0=.tmp_deploy/BANK-OPS-phase0-2026-06-08.md | reversed: none (fresh Phase 0 confirms the 7-module shape and all prior market-shape recommendations) -->
