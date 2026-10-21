# BANK-OPS Phase 0: Vendor Surface (2026-06-08)

Banking Operations is the day-to-day operational backbone of a retail / commercial bank: customer onboarding, deposit account opening, loan origination and servicing, payment processing across rails, dispute / investigation cases, and the BSA/OFAC financial-crime and regulatory-reporting obligations that examiners enforce. This Phase 0 grounds the module-split call (state.yaml B2-1) and the compliance-entity MISSING items (B1B-M1..M4) in named-vendor evidence. Research only; no DB writes.

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| nCino (Bank Operating System) | ncino.com/our-platform | Salesforce-native cloud banking OS: commercial + consumer loan origination, deposit account opening, treasury onboarding, portfolio monitoring, collateral, compliance docs | Currently linked as a BANK-OPS solution; the canonical end-to-end origination + onboarding surface |
| Backbase (Engagement Banking Platform / Banking OS) | backbase.com/engagement-banking-platform | Digital onboarding, origination, servicing, disputes, case management as an orchestration layer over a core | Engagement-banking leader; packages onboarding + origination + servicing + disputes/case mgmt as one workflow plane |
| Mambu (Cloud Banking Platform) | mambu.com/cloud-banking-platform | Composable SaaS core: deposits, lending, payments, product engine, account sub-ledger, audit logs | Core-ledger pure-play; shows the ledger / product-config / sub-ledger substrate beneath the headline masters |
| Thought Machine (Vault Core) | thoughtmachine.net/vault-core | Cloud-native core: real-time immutable double-entry ledger, smart-contract product engine, accounts | Second core pure-play; confirms the append-only-ledger shape of banking_transactions and product-catalog config |
| Temenos (Transact + Financial Crime Mitigation) | temenos.com/products/core-banking | Core banking microservices (accounts/deposits, retail lending, payments) PLUS bundled FCM (watchlist, KYC, AML, fraud) | Suite vendor (1 included per protocol); shows a core that bundles financial crime rather than deferring it |
| Oracle Financial Crime & Compliance Mgmt (FCCM) | oracle.com/financial-services/aml-financial-crime-compliance | KYC/CDD/EDD, AML transaction monitoring, watchlist screening, CTR, SAR/regulatory reporting | Compliance specialist #1 (mandatory for regulated market); CTR + SAR are first-class app modules here |
| NICE Actimize (AML / WL-X / SAM) | niceactimize.com/anti-money-laundering | Suspicious Activity Monitoring, CDD/KYC, watchlist filtering, SAR/STAR, CTR, alert/case management | Compliance specialist #2; SAR + CTR + sanctions screening + financial-crime case management as a standalone market |

Adjacent vendors observed and used as cross-checks (not full columns): Fiserv DNA / FIS / Jack Henry (incumbent cores: deposits + loans + account processing); Encompass by ICE (residential LOS, ~50% origination share); Black Knight MSP (residential loan servicing); Featurespace / Clari5 / Feedzai (transaction fraud); Modern Treasury / Stripe Treasury / Plaid (payment ops rails); Fenergo / Alloy / Trulioo (client lifecycle / KYC onboarding).

## Surface matrix

Vendor columns: NC=nCino, BB=Backbase, MA=Mambu, TM=Thought Machine, TE=Temenos, OR=Oracle FCCM, AC=NICE Actimize. Compliance specialists (OR, AC) are scored only on the financial-crime / regulatory slice; core-banking entities are out of their scope by design (blank, not absent-by-omission).

| Entity | Category | NC | BB | MA | TM | TE | OR | AC | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| loan_applications | Master | x | x | x |  | x |  |  | Core | BANK-OPS-ORIGINATION |
| account_applications | Master | x | x | x |  | x |  |  | Core | BANK-OPS-ORIGINATION |
| account_openings | Master | x | x | x | x | x |  |  | Core | BANK-OPS-ACCOUNT-MGMT |
| deposit_accounts | Master | x | x | x | x | x |  |  | Core | BANK-OPS-ACCOUNT-MGMT |
| loan_disbursements | Master | x | x | x | x | x |  |  | Core | BANK-OPS-LOAN-SERVICING |
| loan_servicing_accounts | Master | x | x | x | x | x |  |  | Core | BANK-OPS-LOAN-SERVICING |
| repayment_schedules | Master | x |  | x | x | x |  |  | Core | BANK-OPS-LOAN-SERVICING |
| collateral_records | Master | x | x |  |  | x |  |  | Common | BANK-OPS-ORIGINATION |
| credit_decisions | Master | x | x |  |  | x |  |  | Common | BANK-OPS-ORIGINATION |
| borrower_profiles | Master | x | x |  |  |  |  |  | Common | BANK-OPS-ORIGINATION |
| banking_transactions | Master (ledger) | x | x | x | x | x |  | x | Core | BANK-OPS-PAYMENTS |
| wire_transfers | Master | x | x | x | x | x |  |  | Core | BANK-OPS-PAYMENTS |
| ach_transfers | Master | x | x | x | x | x |  |  | Core | BANK-OPS-PAYMENTS |
| card_authorizations | Master |  | x | x | x | x |  |  | Common | BANK-OPS-PAYMENTS |
| banking_product_catalog_items | Config | x | x | x | x | x |  |  | Core | BANK-OPS-ACCOUNT-MGMT |
| banking_cases | Master | x | x |  |  |  |  | x | Common | BANK-OPS-CASES |
| disputes / chargebacks | Master | x | x |  |  |  |  | x | Common | BANK-OPS-CASES |
| banking_kyc_reviews | Master / Compliance | x | x | x |  | x | x | x | Core | BANK-OPS-KYC-AML |
| beneficial_ownership_records | Compliance | x | x |  |  | x | x | x | Compliance | BANK-OPS-KYC-AML |
| ofac_screening_records | Compliance | x | x |  |  | x | x | x | Compliance | BANK-OPS-KYC-AML |
| aml_alerts (suspicious activity) | Compliance |  | x |  |  | x | x | x | Compliance | BANK-OPS-KYC-AML |
| sar_filings | Compliance |  |  |  |  | x | x | x | Compliance | BANK-OPS-REGULATORY |
| ctr_reports | Compliance |  |  |  |  | x | x | x | Compliance | BANK-OPS-REGULATORY |
| regulatory_reports (FBAR/FATCA/etc.) | Compliance |  |  |  |  | x | x | x | Common | BANK-OPS-REGULATORY |
| audit_logs / sub-ledger | Audit | x | x | x | x | x | x | x | Core (substrate) | every module |

Workflow substrate beneath the headline masters (the engagement / transition / approval layer the headline-noun-only failure mode misses): the immutable double-entry **ledger + account sub-ledger** (Mambu, Thought Machine, Temenos all make this explicit), **product-catalog configuration** that parameterizes deposit/loan/card variants without code (Mambu product engine, Thought Machine smart contracts, Temenos configurable products), **alert + case management** layered over transaction monitoring (NICE Actimize, Oracle FCCM, Backbase case mgmt), **document classification + eligibility + credit decisioning** inside origination (nCino, Backbase "identity, documents, eligibility, credit, disbursement in one journey"), and **dual-control / approval gates** on wire transfers and SAR/CTR filing.

## Compliance entities (non-optional, per protocol Banking row + verified vendor presence)

The protocol's compliance table mandates `kyc_records`, `aml_alerts`, `suspicious_activity_reports` for Banking regardless of vendor count. Each is confirmed first-class in the compliance specialists:

| Entity | Regulation / basis | Vendor confirmation | Proposed module |
| --- | --- | --- | --- |
| banking_kyc_reviews (kyc_records) | BSA CIP/CDD; FinCEN CDD Rule 31 CFR 1010.230 | Oracle FCCM KYC app (CDD/EDD/continuous monitoring); NICE Actimize CDD/KYC; Temenos FCM KYC | BANK-OPS-KYC-AML |
| beneficial_ownership_records | FinCEN CDD Rule (UBO 25% + control prong) | nCino + Backbase onboarding; Oracle FCCM CDD; NICE Actimize; Temenos FCM | BANK-OPS-KYC-AML |
| aml_alerts (suspicious activity) | BSA 31 USC 5318(g); transaction monitoring | NICE Actimize SAM; Oracle FCCM AML EE; Temenos FCM | BANK-OPS-KYC-AML |
| ofac_screening_records | OFAC sanctions 50 USC 1701; watchlist screening | NICE Actimize WL-X; Oracle FCCM watchlist; Temenos FCM watchlist screening | BANK-OPS-KYC-AML |
| sar_filings (suspicious_activity_reports) | BSA 31 USC 5318(g); FinCEN filing within 30 days | Oracle FCCM SAR (RR Cloud); NICE Actimize SAR/STAR with GenAI narrative | BANK-OPS-REGULATORY |
| ctr_reports | BSA 31 CFR 1010.311; cash > USD 10k | Oracle FCCM CTR (aggregates branch/ATM/vault, files to FinCEN); NICE Actimize CTR | BANK-OPS-REGULATORY |

## Modularization hypothesis

The vendor surface supports a **7-module split** that mirrors how the market packages product surfaces. The decisive signal is that origination and servicing are *separate marketed markets* (Encompass LOS holds ~50% origination share; Black Knight MSP is a distinct servicing platform; ICE had to build an explicit Encompass-to-MSP bridge), and that financial-crime / KYC-AML is sold as a *standalone specialist market* (Oracle FCCM and NICE Actimize are independent products that integrate WITH a core, not features of it). Proposed modules:

1. **BANK-OPS-ORIGINATION**: loan_applications, account_applications, credit_decisions, collateral_records, borrower_profiles. (nCino + Backbase + Encompass: document/eligibility/credit-decision journey.)
2. **BANK-OPS-ACCOUNT-MGMT**: account_openings, deposit_accounts, banking_product_catalog_items. (Mambu/Thought Machine/Temenos deposit + product-config surface.)
3. **BANK-OPS-KYC-AML**: banking_kyc_reviews, beneficial_ownership_records, ofac_screening_records, aml_alerts. (Oracle FCCM + NICE Actimize + Temenos FCM.)
4. **BANK-OPS-PAYMENTS**: wire_transfers, ach_transfers, card_authorizations, banking_transactions (the ledger). (Distinct rails: Fedwire RTGS irrevocable vs ACH/NACHA returnable vs card auth.)
5. **BANK-OPS-CASES**: banking_cases, disputes/chargebacks. (Backbase disputes/case mgmt; NICE Actimize financial-crime cases; subject to B2-2 CSM reconciliation.)
6. **BANK-OPS-LOAN-SERVICING**: loan_disbursements, loan_servicing_accounts, repayment_schedules. (Distinct from origination per the LOS-vs-MSP market split.)
7. **BANK-OPS-REGULATORY**: sar_filings, ctr_reports, regulatory_reports. (Oracle FCCM RR + NICE Actimize SAR/CTR reporting layer.)

**Where the split could legitimately collapse or defer (the b2 forks):** Temenos and the incumbent cores (Fiserv, FIS) bundle financial crime + regulatory reporting INTO the core rather than splitting them, which supports a 5-module collapse (fold KYC-AML + REGULATORY into one BANK-OPS-COMPLIANCE) for a buyer that wants an all-in-one posture. nCino and Backbase treat onboarding (origination + account opening) as a single journey, which supports a 6-module collapse (fold ORIGINATION + ACCOUNT-MGMT into BANK-OPS-ONBOARDING). And because Oracle FCCM / NICE Actimize sell KYC-AML as a freestanding product, deferring KYC-AML out to a sibling KYC-AML-PLATFORM domain is defensible (option d) but loses the in-platform integration nCino/Backbase/Temenos all ship. The 7-module shape best matches the union of how the leaders carve their product surfaces.
