# Embedded-master backfill — Finance / Procurement cluster

**Cluster scope (10 domains):** ERP-FIN (65), EPM (66), AP-AUTO (29), EXPENSE (67), SPEND-MGMT (133), S2P (27), SUP-LIFE (28), VMS (64), CLM (26), SUB-MGMT (97).

**New axes on `domain_data_objects`:**
- `role` ∈ {`master`, `embedded_master`, `contributor`, `consumer`, `derived`}
- `necessity` ∈ {`required` (default), `optional`}
- Signal 1 = `count(role ∈ {'master','embedded_master'} AND necessity='required')` per data_object.

This draft is a proposed delta. Nothing here is written to Semantius. Snake_case_plural names throughout. Reasoning is given per row.

---

## Section 1 — Cluster shape and authority decisions

The cluster has three structurally different "data gravity wells", and this draft is calibrated to keep them separated:

1. **GL / financial-book authority (ERP-FIN)** — masters the book-of-record: `journal_entries`, `general_ledger_accounts`, `cost_centers`, `legal_entities`, `accounting_periods`, `bank_accounts`, `cash_transactions`, `fixed_assets`, `intercompany_transactions`, `projects`, plus revenue-recognition (currently held at id 109 on ERP-FIN side). Every other finance/procurement domain ultimately reads or writes against this book. Many of them also keep a *local copy* of the foundational records (`cost_centers`, `gl_accounts`, `vendors`) when deployed standalone — that is exactly what `embedded_master` is for.
2. **Supplier-master authority (SUP-LIFE)** — the canonical supplier record (`suppliers`, `supplier_onboardings`, `supplier_qualifications`, `supplier_scorecards`). S2P already correctly consumes it (id 343). The current draft does **not** propose to demote SUP-LIFE on `suppliers`; it is the right canonical master. What needs fixing is that several other cluster domains either consume or local-master `suppliers` and the catalog doesn't yet say so.
3. **Customer/AR authority (SUB-MGMT, co-mastered with CRM/CSM/CDP outside cluster)** — `customers` (id 97), `customer_subscriptions`, `customer_invoices`, `usage_records`, `revenue_recognition_records`, `dunning_events`. Already populated correctly; just needs the consumer reads from ERP-FIN to close the GL/AR loop.

**EPM treatment (partial leadership-tier exception):** SKILL.md flags EPM as a leadership/aggregation tier that "often masters nothing of their own", but the current catalog has EPM mastering `financial_plans` / `budgets` / `forecasts` / `financial_scenarios` / `variance_analyses` (ids 37–41). The user prompt confirms this is the intended partial exception: EPM **does** master forecasts/budgets/scenarios because no upstream domain owns those planning artifacts; it reads ERP-FIN actuals and SWP projections derivatively. This draft therefore: (a) keeps EPM's five existing masters, (b) adds EPM `derived` rows on the upstream actuals (`journal_entries`, `payroll_journal_entries`, `workforce_cost_projections`), (c) adds `consumer` rows for the foundational records it has to read to plan (`cost_centers`, `general_ledger_accounts`, `accounting_periods`, `legal_entities`).

**SUB-MGMT treatment:** SUB-MGMT is operational, not leadership; it stays a `master` on its existing AR-side records. It does need to be wired up as a `consumer` on ERP-FIN's foundational records (`cost_centers` for the rev-rec posting, `customers` co-master is already in place, `accounting_periods` for closing rev-rec to a period).

**Slice decomposition for `suppliers` (id 206) — three legitimate slices, only one canonical master:**
- SUP-LIFE `master` (already correct) — lifecycle: onboarding, qualification, risk, scorecards, segmentation.
- S2P — already a `consumer` (id 343, correct). S2P does not local-master suppliers; in real S2P-only deployments, S2P owns a supplier table that *would* be `embedded_master`. **This draft proposes to upgrade S2P from `consumer` to `embedded_master+required` on id 206.** Reasoning: the consumer label assumes a SUP-LIFE is deployed; in point-solution S2P deployments without SUP-LIFE, S2P is the supplier master. That's exactly the embedded_master demotion pattern.
- AP-AUTO — already a `consumer` (id 344). Same argument: AP-AUTO standalone (Tipalti, Stampli, MineralTree without an upstream SUP-LIFE) local-masters a supplier/payee record (banking, payment terms, 1099 attributes). **Propose upgrade to `embedded_master+required`.**
- ERP-FIN — currently has NO row on `suppliers`. ERP-FIN absolutely keeps a supplier sub-ledger (the AP-master in NetSuite, SAP, D365). **Propose NEW `embedded_master+required` row on id 206 for ERP-FIN.**
- VMS — also has NO row on `suppliers`. VMS does maintain a staffing-supplier record (`staffing_suppliers` id 188 — currently its own data_object), which is a slice of suppliers. The catalog has chosen to model that slice as a separate `data_object` rather than as an embedded_master on id 206 — that's a defensible Phase-2 modelling choice. Leave VMS off id 206 to avoid double-modelling.
- SPEND-MGMT — already `consumer+required` (id 421, correct phrasing in notes). In a Brex/Ramp/Airbase deployment with no SUP-LIFE upstream, SPEND-MGMT genuinely local-masters payees. **Propose upgrade to `embedded_master+required`.** Notes already correctly state "SUP-LIFE remains master" — the upgrade just makes the point-solution demotion explicit.
- CLM — no row currently. CLM does index counterparties (a contract has a vendor party). Most CLM tools (Ironclad, Docusign CLM, Agiloft) keep a counterparty list that is a slice of suppliers + customers. **Propose `consumer+required` row on id 206** (CLM reads the supplier master to resolve party-on-contract). Not `embedded_master` because CLM's counterparty record is typically a soft pointer to a master in another system; the contract itself is the master record, not the counterparty.

**Slice decomposition for `customers` (id 97) — already has multi-master across CRM cluster; finance side additions:**
- SUB-MGMT already `master+required` (id 171, financial view: recurring revenue relationship).
- ERP-FIN — no row currently. ERP-FIN has an AR sub-ledger / customer-master slice (credit limits, payment terms, AR aging). **Propose NEW `embedded_master+required` row on id 97 for ERP-FIN.** Reasoning: ERP-FIN standalone (no Salesforce, no SUB-MGMT) keeps a customer ledger with billing-address and AR terms. Demotion path: when CRM or SUB-MGMT is present, ERP-FIN's slice narrows to AR attributes.
- AP-AUTO — no row, correctly. AP-AUTO is supplier-side, not customer-side. Skip.
- CLM — no row currently. CLM contracts can be sell-side too; CLM standalone keeps a customer-party record. **Propose `consumer+required` row on id 97.**

**Slice decomposition for `cost_centers` (id 196) — prototype embedded_master flagship per SKILL.md:**
- ERP-FIN already `master+required` (id 324, with correct slice notes).
- EPM already `contributor+required` (id 334, planning-dimension alignment) — keep as-is, it's a slice contribution not a local master.
- **Every other finance/procurement domain that needs cost_center on a transaction should be `embedded_master+required` (point-solution local copy) or `consumer+required` (deferred read).** Proposed pattern:
  - AP-AUTO — `embedded_master+required`: standalone AP-AUTO products keep their own cost-center list for invoice coding. Demotion: defers to ERP-FIN when integrated.
  - EXPENSE — `embedded_master+required`: standalone EXPENSE products (Concur, Expensify standalone) keep cost-center pick lists for line coding. Demotion: defers to ERP-FIN when integrated.
  - SPEND-MGMT — `embedded_master+required`: Brex/Ramp/Airbase all keep their own GL-coding / cost-center pick list for card-auth-time policy and bill-pay coding.
  - S2P — `embedded_master+required`: standalone S2P (Coupa, Ivalua) keeps cost-center on PR/PO lines for budget checking.
  - EPM is already covered as `contributor` (planning slice).
  - SUB-MGMT — `consumer+required`: rev-rec posting needs the cost-center to credit; the record is not local-mastered in SUB-MGMT.
  - VMS — `embedded_master+optional`: many VMS deployments do allocate contingent spend to cost-centers, but a meaningful fraction of vendor-management work happens at supplier-level without per-CC allocation.
  - CLM — `consumer+optional`: contracts sometimes carry a default cost-center for accrual purposes, but most CLM tools don't model it. Optional.
  - SUP-LIFE — no row. Supplier master doesn't carry a cost-center.

**Slice decomposition for `general_ledger_accounts` (id 195) — same pattern as cost_centers but tighter:**
- ERP-FIN already `master+required` (id 323).
- AP-AUTO — `embedded_master+required`: invoice line coding requires a GL pick list.
- EXPENSE — `embedded_master+required`: expense category → GL account mapping is core to expense tools.
- SPEND-MGMT — `embedded_master+required`: same as AP-AUTO for non-PO bills + cards.
- S2P — `embedded_master+required`: PR/PO line coding.
- EPM — `consumer+required`: budgets and forecasts are built against the GL account hierarchy.
- SUB-MGMT — `consumer+required`: rev-rec posting needs the GL revenue accounts.
- VMS — `embedded_master+optional`: many VMS deployments pre-code contingent invoices to a GL account; some leave it for AP-AUTO downstream.
- CLM — no row. CLM doesn't typically model GL codes.

**Slice decomposition for `accounting_periods` (id 198) — period-close coupling, narrower fan-out:**
- ERP-FIN already `master+required` (id 326).
- EPM — `consumer+required`: forecasts and variance reports are period-aligned.
- AP-AUTO — `consumer+required`: payment runs respect open/closed periods.
- SUB-MGMT — `consumer+required`: rev-rec must close to the open period.
- EXPENSE, SPEND-MGMT, S2P — `consumer+optional`: post-submission these tools tag transactions with a posting period for ERP-FIN to absorb; some tools defer this entirely to ERP-FIN.

**Slice decomposition for `legal_entities` (id 197):**
- ERP-FIN already `master+required` (id 325).
- All other cluster domains that segment data by entity (multi-entity deployments) consume this. AP-AUTO, EXPENSE, SPEND-MGMT, S2P, SUB-MGMT — `consumer+optional` (single-entity deployments don't need it).
- SUP-LIFE — `consumer+optional`: supplier records sometimes carry an "approved-for-entity" matrix.
- CLM — `consumer+required`: contract party-side is always a specific legal entity; this is workflow-critical, not optional.

**Slice decomposition for `projects` (id 216):**
- ERP-FIN already `consumer+required` (id 358) — note this is a slightly unusual choice; the catalog appears to have ERP-FIN as a project-code consumer but no domain currently masters `projects`. **Flag in Section 6 as a missing master.** Likely PSA (professional services automation) should own this; until a PSA domain ships, ERP-FIN's `consumer` row is a placeholder.
- AP-AUTO, EXPENSE, SPEND-MGMT, S2P — `consumer+optional`: project-tagging on invoices/expenses/POs is real but project-based-accounting is a minority deployment shape.
- EPM — `consumer+optional`: project-tier budgeting exists, not universal.

---

## Section 2 — Existing rows snapshot (finance/procurement cluster)

86 existing `domain_data_objects` rows across the 10 cluster domains. Roles distribution (current):
- `master`: 53 rows (most foundational records single-mastered correctly; finance-cluster flagship behaviors mostly already correct).
- `contributor`: 11 rows (CLM↔SaaS, S2P↔contracts, EPM↔cost_centers/org_units, AP-AUTO↔invoices, SPEND-MGMT↔invoices/payment_runs/card_transactions/expense_reports).
- `consumer`: 22 rows (mostly correct; ERP-FIN reading payroll, benefits, expenses, projects; EPM reading ERP-FIN actuals; SUB-MGMT reading opportunities and customer_cases; CLM reading sourcing_events; S2P/AP-AUTO/SPEND-MGMT reading suppliers).
- `derived`: 0 rows — none anywhere. This draft proposes the first ones for EPM.
- `embedded_master`: 0 rows — none anywhere. This draft proposes ~25 new embedded_master rows.

All `necessity` values are currently `required` (the default). This draft proposes flipping a small handful to `optional` for genuinely deployment-shape-dependent dependencies.

**Notable structural gaps in current state:**
- ERP-FIN has NO row on `suppliers` (id 206) — major omission, since ERP-FIN runs the AP supplier sub-ledger. Same for `customers` (id 97) — major omission for AR sub-ledger.
- EPM has only 2 reads on ERP-FIN actuals (id 335 on `journal_entries`, id 334 on `cost_centers`). It should also read `general_ledger_accounts`, `accounting_periods`, `legal_entities`, `workforce_cost_projections`, `payroll_journal_entries`, and `forecasts`-related projections.
- AP-AUTO, EXPENSE, SPEND-MGMT, S2P collectively have zero embedded_master rows on the foundational ERP records (`cost_centers`, `gl_accounts`, `customers`, `suppliers`). This is precisely the Signal 1b silos footprint the new `embedded_master` role exists to capture.

---

## Section 3 — Master → embedded_master demotions

Per SKILL.md anti-pattern: "Using `master` when the domain only holds a local copy that defers to a canonical owner." Reviewing the 53 existing `master` rows in this cluster:

**No demotions proposed.** Every existing `master` row in the finance cluster passes the canonical-authority test:

- **CLM (id 26) on `contracts`, `contract_obligations`, `contract_clauses`, `contract_templates`, `signature_records`** (ids 79–83) — canonical. No other domain has a stronger ownership claim. Keep `master+required`.
- **S2P (id 27) on `sourcing_events`, `purchase_requisitions`, `purchase_orders`, `goods_receipts`, `invoices`** (ids 84–88) — canonical. AP-AUTO contributes the processing slice on invoices (correctly modelled as `contributor` id 338); S2P stays canonical for the invoice record itself. Keep `master+required`.
- **SUP-LIFE (id 28) on `suppliers`, `supplier_onboardings`, `supplier_qualifications`, `supplier_scorecards`** (ids 339–342) — canonical. The supplier-lifecycle slice is unambiguously SUP-LIFE's. Keep `master+required`. (S2P, AP-AUTO, ERP-FIN, SPEND-MGMT get `embedded_master` rows on `suppliers` in Section 4, not co-master rows.)
- **AP-AUTO (id 29) on `invoice_matches`, `payment_runs`** (ids 336, 337) — canonical. Three-way-match and payment-run records are AP-AUTO's purpose. Keep `master+required`.
- **VMS (id 64) on `contingent_workers`, `work_orders`, `staffing_suppliers`, `rate_cards`, `contingent_timesheets`, `contingent_invoices`** (ids 310–315) — canonical for the staff-augmentation slice. Note `staffing_suppliers` (188) is deliberately modelled as a separate data_object from `suppliers` (206) per the SKILL.md scope-qualified-naming rule; this is correct. Keep `master+required`.
- **ERP-FIN (id 65) on `revenue_recognition_records` (109), `journal_entries` (194), `general_ledger_accounts` (195), `cost_centers` (196), `legal_entities` (197), `accounting_periods` (198), `bank_accounts` (199), `cash_transactions` (200), `fixed_assets` (201), `asset_depreciation_schedules` (202), `intercompany_transactions` (203)** (ids 332, 322–331) — all canonical. Note id 332 (`revenue_recognition_records`) is shared with SUB-MGMT id 169; review: SUB-MGMT owns the operational rev-rec scheduling and recognition events (ASC-606 lifecycle), ERP-FIN owns the posting of recognized revenue to the GL. Both legitimate; this is a multi-master row by design. **Action: enrich notes on both ids 169 and 332** to state the slice split explicitly. No role change.
- **EPM (id 66) on `financial_plans`, `budgets`, `forecasts`, `financial_scenarios`, `variance_analyses`** (ids 38–42) — canonical despite EPM being leadership-tier-ish. Per user prompt: "EPM DOES master forecasts/budgets/scenarios". No upstream domain owns planning artifacts. Keep `master+required`. (Section 5 adds EPM's `derived` rows on upstream actuals.)
- **EXPENSE (id 67) on `expense_reports`, `expense_lines`, `corporate_cards`, `card_transactions`, `expense_policies`, `travel_bookings`** (ids 345–350) — canonical for the legacy expense-management slice. Note: SPEND-MGMT (133) holds `master` rows on `corporate_cards` (id 415) and `card_transactions` (id 416) too — this is a deliberate two-master split per the existing notes (legacy vs network-native), reflecting the genuine vendor-stack distinction between Concur/Expensify and Brex/Ramp. Keep `master+required` on both sides.
- **SUB-MGMT (id 97) on `customers` (id 171), `customer_subscriptions`, `customer_invoices`, `usage_records`, `revenue_recognition_records`, `dunning_events`** (ids 165–169, 171) — canonical for the financial/AR view. Keep `master+required`.
- **SPEND-MGMT (id 133) on `corporate_cards` (id 415), `card_transactions` (id 416), `spend_requests` (id 414)** — canonical for the network-native modern-card slice and the pre-spend-approval workflow. Keep `master+required`.

**Why no demotions:** The cluster's `master` rows were authored on the right side of the canonical/embedded boundary the first time. The drift this backfill needs to fix is in the *missing* rows (Section 4) and the *unfilled local-master coverage* on foundational records — not in mis-classified canonical masters.

---

## Section 4 — NEW `embedded_master` rows (point-solution local masters)

Each row is `<domain> on <data_object> as embedded_master + <necessity>` with reasoning and a notes-column draft including demotion path.

### Foundational ERP records — cost_centers (id 196), gl_accounts (id 195)

**4.1. AP-AUTO embedded_master cost_centers — required.** Standalone AP-AUTO (Tipalti, Stampli, MineralTree without an ERP-FIN behind them) keeps its own cost-center pick list for invoice-line coding and approval routing. Demotion path: when ERP-FIN is integrated, AP-AUTO syncs from ERP-FIN. Notes draft: *"AP-AUTO local-masters cost_centers when no ERP-FIN sync is configured; reads from ERP-FIN when integrated. Cost-center is required on every invoice line for approval routing."*

**4.2. AP-AUTO embedded_master general_ledger_accounts — required.** Same reasoning as 4.1 — invoice line coding requires GL accounts. Demotion path identical. Notes: *"AP-AUTO local-masters GL accounts when no ERP-FIN sync; reads from ERP-FIN when integrated."*

**4.3. EXPENSE embedded_master cost_centers — required.** Concur/Expensify standalone keep cost-center pick lists for expense-line coding. Notes: *"EXPENSE local-masters cost_centers for line coding; reads from ERP-FIN when integrated."*

**4.4. EXPENSE embedded_master general_ledger_accounts — required.** Expense-category → GL mapping is core to legacy expense tools. Notes: *"EXPENSE local-masters GL accounts mapped to expense categories; reads from ERP-FIN when integrated."*

**4.5. SPEND-MGMT embedded_master cost_centers — required.** Brex/Ramp/Airbase all carry their own GL-coding pick list for card-auth-time policy and bill-pay line coding. Notes: *"SPEND-MGMT local-masters cost_centers for card-auth policy and bill coding; reads from ERP-FIN when integrated."*

**4.6. SPEND-MGMT embedded_master general_ledger_accounts — required.** Same as 4.5. Notes: *"SPEND-MGMT local-masters GL accounts; reads from ERP-FIN when integrated."*

**4.7. S2P embedded_master cost_centers — required.** Coupa, Ivalua, Jaggaer all carry their own cost-center hierarchy for PR/PO budget checking and line coding. Notes: *"S2P local-masters cost_centers for PR/PO line coding and budget-check; reads from ERP-FIN when integrated."*

**4.8. S2P embedded_master general_ledger_accounts — required.** PR/PO line coding requires GL accounts. Notes: *"S2P local-masters GL accounts for PR/PO line coding; reads from ERP-FIN when integrated."*

**4.9. VMS embedded_master cost_centers — optional.** A meaningful fraction of VMS deployments don't allocate contingent spend to cost-centers (supplier-level pooling); many do. Marking optional. Notes: *"VMS local-masters cost_centers when contingent spend is allocated per-CC; many deployments skip and pool at supplier-level. Defers to ERP-FIN when integrated."*

**4.10. VMS embedded_master general_ledger_accounts — optional.** Many VMS deployments pre-code contingent invoices to GL; some leave it for AP-AUTO downstream. Notes: *"VMS local-masters GL accounts when contingent invoices are pre-coded; some deployments defer GL coding to AP-AUTO/ERP-FIN."*

### Supplier-master local copies — suppliers (id 206)

**4.11. ERP-FIN embedded_master suppliers — required.** ERP-FIN runs the AP supplier sub-ledger: payment terms, banking, 1099/tax attributes, default GL/CC for the supplier. Demotion path: when SUP-LIFE is deployed, SUP-LIFE owns the lifecycle slice (onboarding, qualification, risk); ERP-FIN's slice narrows to AP-master attributes. This is the major missing row in the current catalog. Notes: *"ERP-FIN local-masters suppliers for the AP-master slice (payment terms, banking, tax/1099, default coding); SUP-LIFE remains canonical for lifecycle, onboarding, qualification, and risk when deployed."*

**4.12. AP-AUTO upgrade from `consumer` to `embedded_master` on suppliers — required.** Currently id 344 = `consumer+required`. AP-AUTO standalone (no SUP-LIFE, no ERP-FIN upstream) local-masters payee records. Notes draft: *"AP-AUTO local-masters suppliers/payees (banking, payment terms, 1099) when deployed standalone; defers to ERP-FIN's AP-master or SUP-LIFE's lifecycle when integrated."* **This is a CHANGE row, not a NEW row** — listed here for completeness.

**4.13. S2P upgrade from `consumer` to `embedded_master` on suppliers — required.** Currently id 343 = `consumer+required`. Coupa/Ivalua standalone deployments local-master suppliers for sourcing and PO addressing. Notes: *"S2P local-masters suppliers for the transactional slice (sourcing, PO addressing, supplier-portal credentials); SUP-LIFE remains canonical for the lifecycle slice when deployed."* **CHANGE row.**

**4.14. SPEND-MGMT upgrade from `consumer` to `embedded_master` on suppliers — required.** Currently id 421 = `consumer+required`. Brex/Ramp/Airbase local-master payees for bill-pay. Notes already correctly state "SUP-LIFE remains master" — the upgrade just makes the point-solution demotion explicit. Draft notes: *"SPEND-MGMT local-masters payees for bill-pay (vendor + banking + payment terms); defers to SUP-LIFE when canonical supplier master is deployed."* **CHANGE row.**

### Customer-master local copies — customers (id 97)

**4.15. ERP-FIN embedded_master customers — required.** ERP-FIN runs the AR customer sub-ledger: credit limits, payment terms, billing/shipping addresses, AR aging. Major missing row. Demotion path: when SUB-MGMT/CRM are deployed, ERP-FIN's slice narrows to AR attributes (the CRM/CDP/SUB-MGMT chain owns the relationship). Notes: *"ERP-FIN local-masters customers for the AR-master slice (credit limit, payment terms, billing address, AR aging); SUB-MGMT/CRM remain canonical for the recurring-revenue and demand-side relationship when deployed."*

---

## Section 5 — NEW `consumer`, `contributor`, and `derived` rows (required reads + EPM derivations)

### EPM derived rows on upstream actuals (per SKILL.md leadership-tier guidance)

**5.1. EPM derived on journal_entries (id 194) — required.** EPM republishes variance signals against actuals. The current id 335 row is `consumer+required` on the same data_object — **propose CHANGE id 335 from `consumer` to `derived`**, since EPM's purpose with journal_entries is variance/forecast republishing, not raw consumption. Notes: *"EPM derives variance and forecast-projection signals against ERP-FIN actuals (journal_entries) and publishes forecast.refreshed / variance.threshold_breached events."*

**5.2. EPM derived on payroll_journal_entries (id 145) — required.** EPM forecasts personnel cost against actual pay runs. Notes: *"EPM derives personnel-cost forecast signals against payroll_journal_entries (ERP-FIN consumes for posting; EPM consumes for forecasting)."*

**5.3. EPM derived on workforce_cost_projections (id 30) — required.** Per SKILL.md: "EPM consumed `workforce_cost_projections` (SWP-mastered)". EPM is the explicit downstream of the SWP→EPM boundary object. Notes: *"EPM derives consolidated workforce-cost lines for the budget build against SWP's projections; the boundary object SKILL.md describes."*

### EPM consumer rows on foundational records

**5.4. EPM consumer on general_ledger_accounts (id 195) — required.** Budgets and forecasts are built against the GL account hierarchy. Notes: *"EPM consumes the GL account hierarchy as the planning dimension for budgets and forecasts."*

**5.5. EPM consumer on accounting_periods (id 198) — required.** Forecasts and variance reports are period-aligned; period-close coupling per SKILL.md Phase 3 friction pattern. Notes: *"EPM consumes accounting_periods to align variance reporting to the GL close cadence."*

**5.6. EPM consumer on legal_entities (id 197) — required.** Multi-entity consolidation requires the entity dimension. Notes: *"EPM consumes legal_entities for consolidation and intercompany elimination in the budget build."*

### AP-AUTO consumer rows

**5.7. AP-AUTO consumer on general_ledger_accounts (id 195) — required.** Already covered as embedded_master in 4.2. **Choose embedded_master over consumer per SKILL.md anti-pattern: "Don't double-count."** Use 4.2; skip a separate consumer row.

**5.8. AP-AUTO consumer on cost_centers (id 196) — required.** Same. Use 4.1 (embedded_master), skip consumer row.

**5.9. AP-AUTO consumer on accounting_periods (id 198) — required.** Payment runs must respect the open accounting period; backdated payments cascade per SKILL.md period-close-coupling friction pattern. Notes: *"AP-AUTO consumes accounting_periods to gate payment_run posting against the open GL period."*

**5.10. AP-AUTO consumer on legal_entities (id 197) — optional.** Multi-entity AP routing needs this; single-entity deployments don't. Notes: *"AP-AUTO consumes legal_entities in multi-entity deployments for entity-correct payment routing; single-entity deployments tolerate absence."*

### EXPENSE consumer rows

**5.11. EXPENSE consumer on employees (id 31) — required.** Expense reports require an employee submitter. Notes: *"EXPENSE consumes employees as expense-report submitters (HCM canonical when deployed; many EXPENSE products carry a local roster otherwise — but the relationship is functionally a read, and the local roster is captured at the auth-provider layer, not as an embedded_master of employees)."* (Could be argued as embedded_master+optional, but the dominant pattern is SSO-resolved with no local employee record beyond a thin pointer; modelling as consumer.)

**5.12. EXPENSE consumer on accounting_periods (id 198) — optional.** Post-submission tagging exists in some tools (Concur), absent in others (Expensify-classic). Notes: *"EXPENSE consumes accounting_periods to tag posting period in some deployments; many tools defer period assignment to ERP-FIN."*

**5.13. EXPENSE consumer on legal_entities (id 197) — optional.** Multi-entity expense routing in some deployments. Notes: *"EXPENSE consumes legal_entities in multi-entity deployments for entity-correct expense routing."*

### SPEND-MGMT consumer rows

**5.14. SPEND-MGMT consumer on accounting_periods (id 198) — optional.** Same period-tagging logic as EXPENSE. Notes: *"SPEND-MGMT consumes accounting_periods to tag posting period; many deployments defer to ERP-FIN."*

**5.15. SPEND-MGMT consumer on legal_entities (id 197) — optional.** Multi-entity card programs. Notes: *"SPEND-MGMT consumes legal_entities in multi-entity card-program deployments."*

### S2P consumer rows

**5.16. S2P consumer on accounting_periods (id 198) — optional.** PO commitments and accruals are period-aware in some deployments. Notes: *"S2P consumes accounting_periods for commitment-accounting / accrual posting in deployments that run encumbrance accounting; many S2P deployments do not."*

**5.17. S2P consumer on legal_entities (id 197) — optional.** Multi-entity PO routing. Notes: *"S2P consumes legal_entities in multi-entity deployments for entity-correct PO issuance."*

### SUB-MGMT consumer rows

**5.18. SUB-MGMT consumer on cost_centers (id 196) — required.** Rev-rec posting needs the cost-center to credit. Notes: *"SUB-MGMT consumes cost_centers to dimension revenue-recognition postings; ERP-FIN canonical."*

**5.19. SUB-MGMT consumer on general_ledger_accounts (id 195) — required.** Rev-rec posting needs revenue GL accounts. Notes: *"SUB-MGMT consumes GL revenue accounts for rev-rec posting."*

**5.20. SUB-MGMT consumer on accounting_periods (id 198) — required.** Rev-rec must close to an open period; ASC-606 timing is period-critical. Notes: *"SUB-MGMT consumes accounting_periods to gate rev-rec posting against the open GL period; period-close coupling per Phase-3 friction pattern."*

**5.21. SUB-MGMT consumer on legal_entities (id 197) — optional.** Multi-entity billing. Notes: *"SUB-MGMT consumes legal_entities in multi-entity billing deployments."*

### CLM consumer rows

**5.22. CLM consumer on suppliers (id 206) — required.** Contracts resolve a counterparty against the supplier master. Notes: *"CLM consumes suppliers to resolve vendor-party on contracts; SUP-LIFE canonical."*

**5.23. CLM consumer on customers (id 97) — required.** Sell-side contracts resolve customer-party. Notes: *"CLM consumes customers to resolve customer-party on sell-side contracts; CRM/SUB-MGMT canonical."*

**5.24. CLM consumer on legal_entities (id 197) — required.** Every contract party-side is a specific legal entity; not optional. Notes: *"CLM consumes legal_entities for the company-party on every contract; required for entity-correct execution."*

---

## Section 6 — `necessity = optional` flips and observations

### Recommended flips on existing rows

**6.1. ERP-FIN consumer on projects (id 358) — flip from `required` to `optional`.** Current row says `consumer+required`. Project-tier cost allocation is a real-but-minority deployment pattern; many ERP-FIN deployments don't run project accounting. **Caveat:** if a future PSA domain ships as master of `projects`, this needs revisiting. Optional captures the reality better. Notes update: *"ERP-FIN consumes project codes for cost allocation in deployments running project accounting; many ERP-FIN deployments do not run project accounting and tolerate absence."*

**6.2. EXPENSE consumer on saas_subscriptions (id 105, data_object 62) — keep `required` but reconsider.** Notes correctly describe shadow-SaaS reconciliation. This is a deployment-shape feature (only relevant when both EXPENSE and SMP are deployed). Could be argued as `optional`. **Recommendation: leave as required** — the reconciliation is part of EXPENSE's modern feature set; flipping to optional understates the integration debt.

**6.3. EXPENSE consumer on invoices (id 112, data_object 75) — keep `required` but reconsider.** Same shadow-procurement reconciliation logic. **Recommendation: leave as required.**

### NEW optional rows (extended footprint, not Signal 1)

**6.4. EXPENSE consumer on travel_bookings external (id 215) — N/A, already mastered by EXPENSE.** EXPENSE already masters travel_bookings (id 350). No external travel-platform integration row needed unless a separate TRAVEL domain ships.

**6.5. CLM consumer on supplier_scorecards (id 209) — optional.** Some CLM tools surface vendor-risk scores on contract renewals (Ironclad integration with risk platforms); many don't. Notes: *"CLM consumes supplier_scorecards in deployments where vendor-risk surfacing at renewal is enabled; many CLM deployments do not integrate risk scoring."*

**6.6. CLM consumer on supplier_qualifications (id 208) — optional.** Same pattern as 6.5. Notes: *"CLM consumes supplier_qualifications to gate contract execution against qualification status in integrated GRC stacks; many CLM deployments do not."*

**6.7. EXPENSE embedded_master employees — N/A.** As discussed in 5.11, the dominant deployment pattern is SSO-resolved; modelled as consumer not embedded_master. Skip.

### Missing data_objects flagged

- **`projects` master is unfilled.** ERP-FIN is `consumer+required` (now `consumer+optional` per 6.1), but no domain currently masters `projects`. The natural master would be a PSA (Professional Services Automation) domain — Kantata, Mavenlink, Certinia. Not in current catalog scope; flag for future loading. Until then, treat `projects` as a polyglot record with no canonical owner.
- **`vendor_contracts` / `customer_contracts` — intentionally absent.** Per SKILL.md "Buyer-side vs seller-side" rule, both flavors collapse into `contracts` (id 66) with multi-domain contributors. Confirmed correct.
- **`saas_contracts` — absent.** No SMP-domain-specific contract data_object; SaaS contract slice rolls into `contracts` (id 66) with SMP and CLM as contributors. Confirmed correct.
- **`vendor_banking` / `payment_terms` / `tax_codes` — absent as standalone data_objects.** All carried as columns on `suppliers` (id 206). Defensible: these are attributes, not records. No action.
- **`employees` is HCM-mastered (id 31, outside cluster).** Already exists in catalog. Finance-cluster embedded_master rows on employees are NOT proposed in this draft — finance tools typically resolve employees via SSO/auth-layer rather than maintaining a local employee record beyond a thin pointer. If a future workflow review surfaces a finance tool that genuinely local-masters employee rosters (e.g., a private-company EXPENSE deployment without HCM), revisit.
- **`pay_cycles` / `merit_cycles` — exist (id 155 = merit_cycles).** Cross-cluster; no proposed finance-side reads in this draft (pay cycle is consumed by ERP-FIN through `payroll_journal_entries` id 145, which is already wired as `consumer`).
- **`spend_requests` (id 240, SPEND-MGMT master, id 414) — no proposed consumer rows.** SPEND-MGMT's pre-spend-approval is internal to the spend-management workflow; cross-domain handoffs are Section-Phase-3 territory, not domain_data_objects.
- **`invoice_matches` (id 204) — AP-AUTO master only.** ERP-FIN consumes this conceptually but the row isn't in the catalog. Low value to add — three-way-match outcomes are typically reflected in the `invoices` record state, not consumed as a separate object by ERP-FIN.

---

## Section 7 — Open questions for human review

1. **Should ERP-FIN be elevated to `master+required` on `customers` (id 97) instead of `embedded_master`?** The AR sub-ledger is genuinely authoritative for AR attributes (credit limit, payment terms). The current draft proposes `embedded_master+required` because SUB-MGMT already holds `master+required` on `customers` (id 171, financial view) — making both `master` would be a co-master pattern that may or may not be the intended modelling. **Recommendation: embedded_master, because SUB-MGMT's "financial view" notes (id 171) already cover the recurring-revenue/AR-event slice, and ERP-FIN's slice is genuinely a local AR-attributes copy that defers when SUB-MGMT runs the relationship.** Confirm before load.

2. **Same question on `suppliers` (id 206) for ERP-FIN.** Same logic, same recommendation: `embedded_master+required` for ERP-FIN's AP-master slice. SUP-LIFE keeps the canonical lifecycle. Confirm.

3. **AP-AUTO and S2P on `suppliers`: consumer → embedded_master upgrades (4.12, 4.13, 4.14).** Are we comfortable changing existing rows in place (id 343, 344, 421) rather than adding new rows? Per the existing schema, `domain_id + data_object_id` is presumably unique; the only way to upgrade is to UPDATE the role on the existing row. Confirm the deployer can do in-place role changes.

4. **`projects` (id 216) master is missing.** Recommend leaving ERP-FIN as `consumer+optional` (6.1) and flagging PSA as a future-load domain. Alternative: declare ERP-FIN `master+required` on `projects` for now (the "project code on a GL transaction" is genuinely ERP-FIN-owned in the absence of PSA). **Recommendation: keep ERP-FIN as consumer; do not promote.** Confirm.

5. **EPM `consumer` → `derived` change on `journal_entries` (id 335, 5.1).** SKILL.md is explicit that leadership-tier domains "republish derived signals against the upstream object". Confirm the relabelling from `consumer` to `derived` matches the intended semantics, and that id 334 (EPM contributor on cost_centers) stays as `contributor` (it's a planning-dimension alignment contribution, not a derived republish).

6. **Multi-master notes enrichment on id 169 / id 332 (`revenue_recognition_records`).** Both ERP-FIN and SUB-MGMT master this. Per SKILL.md anti-pattern: "Filling `domain_data_objects.notes` with nothing on multi-master rows" is forbidden. Both rows currently have empty notes. **Action: write slice-decomposition notes on both before any further load** — SUB-MGMT owns ASC-606 scheduling and recognition events; ERP-FIN owns posting of recognized revenue to the GL. Confirm.

7. **`travel_bookings` (id 215) optional consumers.** Should any other cluster domain (e.g., EXPENSE-adjacent corporate travel modules in SPEND-MGMT, or AP-AUTO when invoicing TMC charges) carry an optional consumer row? **Recommendation: no, leave as EXPENSE-only master.** Confirm.

8. **Are `consumer` rows on foundational ERP records (5.4–5.6 EPM consumers, 5.9 AP-AUTO accounting_periods, 5.18–5.20 SUB-MGMT) the right call vs `embedded_master+optional`?** The argument for `consumer`: these tools genuinely don't local-master `accounting_periods` or `legal_entities` even in standalone deployments — they're auth-provider-resolved or single-instance configuration, not a local record. The argument for `embedded_master+optional`: some standalone deployments do carry their own. **Recommendation: keep as `consumer`.** Confirm.

---

## Summary of proposed changes

- **NEW rows (24 total):**
  - 10 NEW `embedded_master+required`: ERP-FIN×2 (suppliers, customers), AP-AUTO×2, EXPENSE×2, SPEND-MGMT×2, S2P×2 (cost_centers and gl_accounts each).
  - 2 NEW `embedded_master+optional`: VMS×2 (cost_centers, gl_accounts).
  - 3 NEW EPM `derived+required` (or 1 CHANGE + 2 NEW): payroll_journal_entries, workforce_cost_projections, (and id 335 changed from consumer to derived).
  - 3 NEW EPM `consumer+required`: general_ledger_accounts, accounting_periods, legal_entities.
  - 1 NEW AP-AUTO `consumer+required`: accounting_periods.
  - 1 NEW AP-AUTO `consumer+optional`: legal_entities.
  - 2 NEW EXPENSE `consumer+optional`: accounting_periods, legal_entities; 1 NEW EXPENSE `consumer+required`: employees.
  - 2 NEW SPEND-MGMT `consumer+optional`: accounting_periods, legal_entities.
  - 2 NEW S2P `consumer+optional`: accounting_periods, legal_entities.
  - 3 NEW SUB-MGMT `consumer+required`: cost_centers, gl_accounts, accounting_periods; 1 NEW SUB-MGMT `consumer+optional`: legal_entities.
  - 3 NEW CLM `consumer+required`: suppliers, customers, legal_entities.
  - 2 NEW CLM `consumer+optional`: supplier_scorecards, supplier_qualifications.

- **CHANGE rows (5 total):**
  - id 343 (S2P↔suppliers): `consumer` → `embedded_master`.
  - id 344 (AP-AUTO↔suppliers): `consumer` → `embedded_master`.
  - id 421 (SPEND-MGMT↔suppliers): `consumer` → `embedded_master`.
  - id 335 (EPM↔journal_entries): `consumer` → `derived`.
  - id 358 (ERP-FIN↔projects): `required` → `optional`.

- **Notes enrichment (2 rows):** id 169 and id 332 on `revenue_recognition_records` need slice-decomposition notes before next load.

- **Demotions master → embedded_master:** zero. The cluster's `master` rows are all canonical.

- **Missing master flagged:** `projects` (id 216) has no master; flag PSA as a future cluster.

End of draft. Awaiting human review before any Semantius write.
