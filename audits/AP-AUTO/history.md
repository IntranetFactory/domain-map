# AP-AUTO audit history

## 2026-05-30 (Validate b1, full 4-pass)

### Summary

- **Current footprint:** **0 modules** (M1 hard fail, the dominant blocker), 1 capability (`APPROVAL-WORKFLOW`, well below the 5-8 typical floor), 13 solutions (4 primary + 9 secondary), 2 masters (`invoice_matches`, `payment_runs`) + 1 contributor (`supplier_invoices`, mastered by S2P) + 1 consumer (`suppliers`, mastered by SUP-LIFE and MDM) + 1 embedded_master (`org_units`, mastered by HCM), 2 regulations (Sarbanes-Oxley Act, EU VAT Directive), 6 trigger_events on the 2 masters (3 with empty `event_category`), 10 outbound + 20 inbound cross-domain handoffs (30 total), 0 lifecycle states, 0 aliases, 0 intra-domain `data_object_relationships` rows between AP-AUTO masters, 0 `users` edges on AP-AUTO masters, 1 legacy `domain_id`-scoped system skill `ap-auto-system` with 3 `skill_tools` rows (no module anchor), 0 roles linked to the Accounts Payable business function (id 17).
- **Flagship-vendor basis** (live `solution_domains`): Tipalti, AvidXchange, Stampli, BILL AP, Esker AP, Basware AP Automation (primary pure-plays), plus SAP Concur, Coupa, Workday Spend Management, Tradeshift, Oracle NetSuite, ServiceNow Source-to-Pay Operations, Workday Financial Management (secondary, broader suites). Pure-play AP-automation specialists at the leader tier; FCRA/SOX/EU-VAT compliance leans on the broader suites.
- **Bucket 1 (in-scope, agent fixable):** 13 structural items + 1 APQC TAGGING line (22 individual tag proposals below) = **14 items.**
- **Bucket 2 (surface-for-user, judgment):** **4 items.**
- **Bucket 3 (Phase 0 pending, speculative, full market surface gated on Bucket 1 modularization):** **3 items.**
- **Candidates queued (`audits/_missing-domains.md`):** 0 new candidates this pass (TRM "Treasury and Risk Management" already queued; bumped its mention counter).

**Pass 3 neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO rollup + cross-domain `data_object_relationships`, ranked by edge weight):

| Neighbor | Out | In | DMDO touching AP-AUTO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| ERP-FIN | 4 (125, 126, 191, 192, 542) | 2 (537, 597) | AP-AUTO consumes `bank_accounts` (inbound), publishes `payment_runs.executed` to ERP-FIN | 0 | 7 | Pairwise (full, gated on M1) |
| S2P | 1 (545) | 3 (581, 583, 584) | AP-AUTO consumes `purchase_orders`, `goods_receipts`; AP-AUTO contributes to `supplier_invoices` (S2P-mastered) | 0 | 5 | Pairwise (full, gated on M1) |
| SUP-LIFE | 1 (543) | 3 (128, 547, 596) | AP-AUTO consumes `suppliers` (SUP-LIFE-mastered), reacts to `supplier_qualifications` | 1 (`supplier_qualifications unblocks payment_runs`) | 5 | Pairwise (full, gated on M1) |
| SPEND-MGMT | 1 (598) | 2 (168, 556) | none beyond the handoff payloads | 0 | 3 | Pairwise (full, gated on M1) |
| EXPENSE | 0 | 2 (130, 553) | AP-AUTO consumes `expense_reports`, `expense_lines` (EXPENSE-mastered) | 1 (`expense_lines enters invoice_matches`) | 3 | Pairwise (full, gated on M1) |
| IDP | 0 | 2 (733, 734) | AP-AUTO consumes `extracted_records` (IDP-mastered) | 0 | 2 | Lightweight |
| AUDIT | 1 (544) | 0 | 0 | 1 (`audit_findings reviews invoice_matches`) | 2 | Lightweight |
| CLM | 0 | 1 (216) | 0 | 1 (`legal_contracts propagates_terms_to invoice_matches`) | 2 | Lightweight |
| CSM | 1 (193) | 0 | 0 | 1 (`payment_runs opens customer_cases`) | 2 | Lightweight |
| VMS | 0 | 1 (588) | 0 | 1 (`contingent_invoices enters_match_with invoice_matches`) | 2 | Lightweight |
| ACCT-PRACT-MGMT | 0 | 1 (340) | 0 | 0 | 1 | Lightweight |
| RE-CRE | 0 | 1 (302) | 0 | 0 | 1 | Lightweight |
| RE-PROP-MGMT | 0 | 1 (298) | 0 | 0 | 1 | Lightweight |
| FLEET-MAINT | 0 | 1 (316) | 0 | 0 | 1 | Lightweight |

The dominant cross-cutting finding is that **AP-AUTO owns zero deployable modules**, so every cross-domain handoff (outbound and inbound) is also a B10b failure on AP-AUTO's side (`source_domain_module_id` or `target_domain_module_id` NULL on AP-AUTO). The pairwise pass cannot draft module-to-module wiring until M1 is cured; it is collapsed below into a "post-modularization wiring sketch" rather than per-neighbor full diffs.

Structural pass bands: **M1 hard-fail** (zero modules, single most important finding), **A2 hard-fail** (only 1 capability vs. typical 5-8 floor for an active market), **M2/M4/M6 vacuous/cascading fail** (1 capability mapped to zero realizing modules), **B12 hard-fail** (zero lifecycle states on either master despite real state machines on both), **B11 hard-fail** (zero aliases on either master), **B7 hard-fail** (zero `users` edges on AP-AUTO masters), **B6 hard-fail** (zero intra-domain edges between `invoice_matches` and `payment_runs` even though invoice match outcome drives payment-run inclusion), **B9 partial-fail** (3 of 6 trigger_events on AP-AUTO masters have empty `event_category` per Rule #13; trigger_event id 12 `bill_payment.completed` has a noun that does not match its payload `payment_runs` and reads like a vestige from a different entity model), **F1 transitional** (legacy domain-level system skill `ap-auto-system` with `domain_module_id=null`; transitional pass until per-module system skills exist), **F2/F3/F5 vacuous-fail** (no modules so no per-module skills), **B10b hard-fail** (all 10 outbound and all 20 inbound handoffs carry NULL `source_domain_module_id` / `target_domain_module_id` on AP-AUTO's side), **A4 hard-fail** (empty `catalog_tagline` and `catalog_description`), **H1 hard-fail** (only 9 of 30 cross-domain handoffs tagged; 1 `agent_curated`, 6 `discovery_substring`, 2 `discovery_override`, well below the 0.5N-0.8N agent_curated volume target), **Rule #15 violation** (3 populated `notes` on `domain_data_objects` rows without recorded per-row user approval), **Rule #16 violation** (`org_units` embedded_master is `necessity=required`; infrastructure masters on non-master rows should be `optional`), **CLAUDE.md no-em-dash hygiene** (one em-dash, U+2014, in `domains.business_logic` for id 29).

Bands passing: **A1** (7 domain-metadata fields populated; `crud_percentage=55`, `cost_band=$$`, `min_org_size=20 s <500`, `usa_market_size_usd_m=2500`, `market_size_source_year=2025`, `business_logic` non-empty, `certification_required=false`), **A3** (13 solutions, ≥1 primary), **A5** (skipped per audit recipe), **B1** (2 masters loaded), **B2** (both masters have singular/plural labels), **B3** (both master names are prefixed `invoice_*` / `payment_*`, no canonical-bare-word claim required), **B4** (pattern flags all default `false`; surface for re-evaluation in Bucket 2), **B5** (only one `embedded_master` row `org_units` and its canonical owner exists in HCM, so passes), **B8** outbound: 5 of 10 outbound handoffs have a clean payload-to-target mapping with a corresponding `data_object_relationships` row (cross-domain edges to `customer_cases`, `audit_findings`, `supplier_scorecards`, plus inbound `legal_contracts propagates_terms_to invoice_matches`, `contingent_invoices enters_match_with invoice_matches`, `suppliers propagates_bank_change_to payment_runs`, `supplier_qualifications unblocks payment_runs`); remaining outbound cross-rels are arguably implicit and surface in Bucket 1 BOUNDARY, **C1** (Accounts Payable function 17 owns), **C2** vacuous, **E1-E6** vacuously pass (single-module-or-fewer; once modules exist, expect Recruiter-shaped roles, see Bucket 1 boundary follow-ups), **F4** (the 3 existing `skill_tools` rows pair `operation_kind` and `data_object_id` correctly), **F7** (the one channel-primitive `send_email` link is plausibly justified by AP-controller exception notifications, but the `skill_tools.notes` is empty so this is borderline; flagged below).

Domain Semantius score (strict, from legacy `ap-auto-system` skill): **3 / 3 = 100%** platform-tier. Operational score also 100%. The score is informational only and provisional pending M1; once modules ship, the score must be re-derived per per-module skill (Rule #17).

### Bucket 1 (in-scope confirmed gaps)

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail, dominant blocker)** | **Zero `domain_modules` rows for AP-AUTO (`domain_id=29`).** No `domain_modules.domain_id=29` rows; no `domain_module_host_domains.domain_id=29` rows. Rule #14 requires every `domains` row to have ≥1 `module_kind='full'` module; AP-AUTO has zero. This blocks F2 / F3 / F5, M4 / M6, E1, B9b, B10b on AP-AUTO's side, and B12's permission materialization. The shape of the split is itself a Bucket 2 question (single AP-AUTO-PLATFORM vs. AP-AUTO-INVOICE-CAPTURE + AP-AUTO-MATCHING + AP-AUTO-PAYMENT-RUNS, etc.); the gate is "draft and load any coherent module set" first. Recommended minimum (matches the flagship vendor surface; Tipalti / AvidXchange / Stampli all separate capture from match from payment): three modules, `AP-AUTO-INVOICE-CAPTURE` (contributes on `supplier_invoices`, will master `invoice_capture_jobs` once Phase 0 vetting completes), `AP-AUTO-MATCHING` (masters `invoice_matches`), `AP-AUTO-PAYMENT-RUNS` (masters `payment_runs`). | Author the 3-module shape, load via a focused loader, then load `domain_module_capabilities` + `domain_module_data_objects` and migrate the existing `domain_data_objects` rollup to matching `domain_module_data_objects` rows. Pre-flight every payload per Rules #14 and #17. |
| B1-S2 | **A2 (hard fail) + M2/M4/M6 cascade** | **Only 1 capability (`APPROVAL-WORKFLOW`) attached to AP-AUTO**, well below the 5-8 typical floor for an active SaaS market. The flagship vendor surface implies at least: `INVOICE-CAPTURE-OCR`, `THREE-WAY-MATCH`, `INVOICE-APPROVAL-ROUTING`, `PAYMENT-EXECUTION`, `SUPPLIER-PAYMENT-PORTAL`, `AP-FRAUD-DETECTION`, `EARLY-PAYMENT-DISCOUNT`, `INVOICE-EXCEPTION-RESOLUTION`. Once loaded, each routes to one of the three modules from B1-S1 via `domain_module_capabilities`; `APPROVAL-WORKFLOW` is the existing cross-cutting capability. | Draft 5-7 AP-AUTO-specific capabilities (`capability_code` + `capability_name`), load via the standard Phase A loader; link to modules from B1-S1 via `domain_module_capabilities`. Apply the Cross-cutting capability convention for `APPROVAL-WORKFLOW` (cross-cutting; do not duplicate). |
| B1-S3 | **B12 (hard fail)** | **Zero rows in `data_object_lifecycle_states` for either AP-AUTO master.** Both masters have real workflows: `invoice_matches` (queued, matched, quantity_variance, price_variance, no_po, exception_pending, manually_overridden, released_for_payment, closed); `payment_runs` (draft, approved, executing, executed, partially_failed, failed, reconciled, closed). Each state with `requires_permission=true` becomes a `<module>:<verb>_<entity>` permission once a realizing module exists (Rule #14 permission materialization). No config-shape exemption applies; neither master is author-once. | Draft the 2 state machines, attach `domain_module_id` to gates per the realizing module decided in B1-S1, load via a focused lifecycle loader. |
| B1-S4 | **B11 (hard fail)** | **Zero `data_object_aliases` rows for either AP-AUTO master.** Vendor terminology diverges: `invoice_matches` is `Match` / `Three-Way Match` / `PPM` (in Coupa, Purchase-PO Match) / `Reconciliation Outcome` (in Tipalti); `payment_runs` is `Payment Batch` / `Bill Run` / `Pay Cycle` / `Payment Schedule` / `BACS Run` (UK terminology). Without aliases the catalog cannot match vendor docs or industry phrasing at fact-sheet emission time. | Draft alias rows (`alias_name` + `alias_type`), load via the cluster-drafts loader. |
| B1-S5 | **B7 (hard fail)** | **Zero `data_object_relationships` edges between either of the 2 AP-AUTO masters and `users` (id 748)**, despite real user-typed actors on both: `invoice_matches` (matcher, override_author, exception_resolver, approver), `payment_runs` (initiator, approver, treasury_reviewer, executor, exception_handler). Rule #10 makes built-in edges first-class. | Author 4-6 user edges per master (verb-shape: `matches_invoice`, `overrides_match`, `approves_payment_run`, `executes_payment_run`, etc.); load via the cluster-drafts loader. |
| B1-S6 | **B6 (hard fail)** | **Zero intra-domain `data_object_relationships` rows between `invoice_matches` and `payment_runs`.** Expected edge per the descriptions in `data_objects.description` (invoice match outcome drives the AP payment cycle): `invoice_matches feeds_into payment_runs` (`one_to_many`, `owner_side=source`, `is_required=false`, `inverse_verb=draws_from`). Without this edge the architect renderer shows two disconnected masters and the fact-sheet emitter renders a placeholder where the intra-domain DAG should be. | Draft 1 intra-domain edge, load via cluster-drafts. |
| B1-S7 | **B9 partial fail (event_category enum)** | 3 of 6 trigger_events on AP-AUTO masters have **empty `event_category`** (Rule #13 enum vocabulary: `lifecycle` / `state_change` / `threshold` / `signal`): id 559 `invoice_match.three_way_passed`, id 560 `invoice_match.exception_raised`, id 561 `invoice_match.manual_override`. All three are state transitions on `invoice_matches`. | PATCH: 559 → `state_change`; 560 → `state_change`; 561 → `state_change`. |
| B1-S8 | **B9 hygiene (trigger_event naming drift)** | trigger_event id 12 `bill_payment.completed` is anchored on `data_object_id=205 payment_runs` but the event noun `bill_payment` does not match the payload entity name; the description says "Fired when a Payment Run is completed." This is a stale or mis-named event. Either retire it (in favor of id 93 `payment_run.executed`, which is the modern equivalent and is what handoff 125 actually references) or rename in place to `payment_run.completed` and re-link any consumers. No handoff currently references id 12, so a clean DELETE is the recommended fix. | DELETE trigger_event id 12; verify zero `handoffs.trigger_event_id=12` before delete (already confirmed zero). |
| B1-S9 | **F1 (transitional)** | Legacy domain-scoped system skill `ap-auto-system` (id 28) with `skill_type='system'` and `domain_module_id=null`. F1 requires this row to be retired once module-anchored system skills exist; B1-S1 (M1 fix) creates those module-anchored skills, at which point this legacy row must DELETE. Today it is the only system skill AP-AUTO has, so the row also satisfies a transitional ghost-pass of F2 (one system skill exists, even if at the wrong scope). The current 3 `skill_tools` are `query_invoice_matches` (platform), `query_payment_runs` (platform), `send_email` (platform). The `send_email` link is borderline-F7 (no `skill_tools.notes` justifying why a channel primitive over `notify_person`); flagged in Bucket 2. | At the same load that authors the per-module system skills (one per `AP-AUTO-INVOICE-CAPTURE`, `AP-AUTO-MATCHING`, `AP-AUTO-PAYMENT-RUNS`), DELETE skill id 28 and its 3 `skill_tools` rows; redistribute the tools to the per-module skills per Phase S. Replace `send_email` with `notify_person` unless workflow-specific channel justification surfaces in Bucket 2. |
| B1-S10 | **B10b (hard fail, AP-AUTO-owned side only)** | All 10 outbound handoffs from AP-AUTO (125, 126, 191, 192, 193, 542, 543, 544, 545, 598) carry **NULL `source_domain_module_id`**. All 20 inbound handoffs to AP-AUTO (128, 130, 168, 302, 298, 316, 340, 537, 547, 553, 556, 581, 583, 584, 588, 596, 597, 733, 734, 216) carry **NULL `target_domain_module_id`** on the AP-AUTO side. Per B10b, both halves are AP-AUTO's side to fix once modules exist. Source-module resolution by which AP-AUTO module masters the trigger_event's data_object once B1-S1 lands: handoffs 126, 191, 192, 193, 542, 543, 544, 545, 598 (events on `invoice_matches` or `supplier_invoices`) route to AP-AUTO-MATCHING; handoff 125 (event `payment_run.executed` on `payment_runs`) routes to AP-AUTO-PAYMENT-RUNS. Target-module resolution by which AP-AUTO module holds the payload: inbound on `supplier_invoices` and `extracted_records` lands in AP-AUTO-INVOICE-CAPTURE; inbound on `bank_accounts` and `suppliers` and `vendor_payment_authorizations` lands in AP-AUTO-PAYMENT-RUNS; inbound on `legal_contracts`, `purchase_orders`, `goods_receipts`, `expense_lines`, `contingent_invoices`, `supplier_qualifications`, `cam_charges`, `rent_payments`, `vehicle_work_orders`, `tax_returns` lands in AP-AUTO-MATCHING (these are payloads being matched against AP entries); inbound on `expense_reports` lands in AP-AUTO-PAYMENT-RUNS (expense reimbursement run). | Backfill `source_domain_module_id` and `target_domain_module_id` (AP-AUTO side) on all 30 handoffs once B1-S1's modules are loaded; the counterparty domain module FK on each is the other domain's own B10b problem and is surfaced in "Report-only follow-ups" below. |
| B1-S11 | **B9b (vacuous fail, structurally important)** | AP-AUTO has 0 modules so no cross-module intra-domain handoffs can exist. Once B1-S1's three modules ship, the following intra-domain handoffs become required (per the cross-module data_object_relationship drafted in B1-S6 plus the AP workflow): AP-AUTO-INVOICE-CAPTURE → AP-AUTO-MATCHING on `supplier_invoice.captured` (the contributor module hands a captured invoice to the matching module for three-way match); AP-AUTO-MATCHING → AP-AUTO-PAYMENT-RUNS on `invoice_match.three_way_passed` (matched invoice gets queued into the next payment run); AP-AUTO-MATCHING → AP-AUTO-PAYMENT-RUNS on `invoice_match.manual_override` (overridden invoice also flows into payment-run inclusion). All `integration_pattern='lifecycle_progression'`, `friction_level='low'`. | Load 3 intra-domain handoff rows alongside B1-S10's source-module backfill. |
| B1-S12 | **A4 (hard fail) + Rule #20** | `domains.catalog_tagline=""` and `domains.catalog_description=""` for id 29. Both are buyer-facing surfaces that Rule #20 requires to be drafted (in buyer voice, workflow + value) and surfaced to the user BEFORE writing. | Draft both fields per Rule #20 voice rule. Tagline candidate (buyer voice): "Capture invoices, match them to POs and receipts, and pay suppliers on time without the spreadsheet shuffle." Surface drafts for user approval before any PATCH; per Rule #20 overwrite is forbidden once non-empty, so this is a first-write only. |
| B1-S13 | **Rule #15 + Rule #16** | (a, Rule #15) Three `domain_data_objects` rows for `domain_id=29` carry non-empty `notes` populated without recorded per-row user approval: `supplier_invoices` (contributor: "AP-AUTO contributes the AP-side processing slice..."), `suppliers` (consumer: "AP-AUTO consumes the supplier master..."), `org_units` (embedded_master: "Invoice coding and approval routing key off..."). All three restate the structured `role`/`necessity` columns. (b, Rule #16) The `org_units` row is `necessity=required`; infrastructure masters (`org_units`, `locations`, `cost_centers`) on non-master rows should be `optional` per Rule #16. An SMB AP-AUTO deployment with a flat org should not be blocked by org_units not being modeled. | PATCH all three rows: set `notes=''` (Rule #15 reset). PATCH the `org_units` embedded_master row: set `necessity='optional'`. |

#### BOUNDARY findings (per-neighbor; collapsed pre-M1)

The four-leg pairwise reconciliation is gated on B1-S1 producing modules. Collapsed per-neighbor sketch below; full diffs will run on re-audit once modules exist.

| ID | Neighbor | Finding | Fix shape |
|---|---|---|---|
| B1-B1 | ERP-FIN | Outbound handoffs 125 (`payment_run.executed`), 126 (`supplier_invoice.matched`), 542 (`invoice_match.three_way_passed`), 191 (`supplier_invoice.duplicate_detected`), 192 (`payment.exception`) all fire to ERP-FIN with no `data_object_relationships` row mirroring them on the AP-AUTO master side. `payment_run.executed` should land as `payment_runs posts_journal_to journal_entries` (or similar). | Author 3-5 outbound cross-domain edges per B8 once modules exist. |
| B1-B2 | S2P | Outbound handoff 545 (`invoice_match.exception_raised` → S2P) lacks a mirror cross-rel `invoice_matches escalates_to purchase_orders` or similar. Inbound rels `purchase_orders→invoice_matches` and `goods_receipts→invoice_matches` are also missing. | Author 3 cross-domain edges (1 outbound + 2 inbound mirror, the inbound is on S2P's B8 not AP-AUTO's). Only the outbound is in scope for AP-AUTO. |
| B1-B3 | SUP-LIFE | Outbound handoff 543 (`invoice_match.exception_raised` → SUP-LIFE) lacks the mirror cross-rel `invoice_matches escalates_to suppliers` (or similar verb). | Author 1 outbound cross-domain edge per B8. |
| B1-B4 | SPEND-MGMT | Outbound handoff 598 (`invoice_match.three_way_passed` → SPEND-MGMT) lacks a mirror cross-rel. | Author 1 outbound cross-domain edge per B8. |

#### APQC TAGGING (Rule H1: only 9 of 30 cross-domain handoffs tagged; 1 `agent_curated`, well below the 0.5N-0.8N volume target)

AP-AUTO has **30 cross-domain handoffs** (10 outbound + 20 inbound). **Only 9 carry `handoff_processes` rows; 1 is `proposal_source='agent_curated'`, 6 are `discovery_substring`, 2 are `discovery_override`.** Volume target per the H-band: 0.5N to 0.8N agent_curated tags for N=30, i.e. 15-24. I propose **22 high-confidence agent_curated tags below**, of which 8 overlap with existing weak-source rows (those existing rows should be re-classified as `agent_curated` overrides per Discover Pass 1.5; the substring rows are kept-or-replaced per the loader rule).

| B1 ID | handoff_id | source → target | trigger_event | payload | Proposed PCF (`process_name` / `external_id` / L) | Confidence |
|---|---|---|---|---|---|---|
| B1-H1-01 | 125 | AP-AUTO → ERP-FIN | `payment_run.executed` | `payment_runs` | Process and distribute payments / `10862` / L4 (id 1422) | confident L4 |
| B1-H1-02 | 126 | AP-AUTO → ERP-FIN | `supplier_invoice.matched` | `invoice_matches` | Audit invoices and key data in AP system / `10871` / L4 (id 1433) | confident L4 |
| B1-H1-03 | 191 | AP-AUTO → ERP-FIN | `supplier_invoice.duplicate_detected` | `supplier_invoices` | Research/Resolve payable exceptions / `10875` / L4 (id 1437) | confident L4 |
| B1-H1-04 | 192 | AP-AUTO → ERP-FIN | `payment.exception` | `payment_runs` | Process and distribute payments / `10862` / L4 (id 1422) | confident L4 (existing discovery_override; keep PCF, flip source to agent_curated) |
| B1-H1-05 | 193 | AP-AUTO → CSM | `payment.exception` | `payment_runs` | Process and distribute payments / `10862` / L4 (id 1422) | confident L4 (existing discovery_override; keep) |
| B1-H1-06 | 542 | AP-AUTO → ERP-FIN | `invoice_match.three_way_passed` | `invoice_matches` | Process accounts payable (AP) / `10756` / L3 (id 315) | confident L3 (the three-way-pass and the AP-side liability post are both inside the same L3 AP process; L4 alternatives like "Audit invoices and key data" 10871 do not capture the release-for-payment step) |
| B1-H1-07 | 543 | AP-AUTO → SUP-LIFE | `invoice_match.exception_raised` | `invoice_matches` | Research/Resolve payable exceptions / `10875` / L4 (id 1437) | confident L4 |
| B1-H1-08 | 544 | AP-AUTO → AUDIT | `invoice_match.manual_override` | `invoice_matches` | Audit invoices and key data in AP system / `10871` / L4 (id 1433) | confident L4 |
| B1-H1-09 | 545 | AP-AUTO → S2P | `invoice_match.exception_raised` | `invoice_matches` | Reconcile purchase orders / `10297` / L4 (id 813) | confident L4 (the S2P-side reaction to a match exception is PO reconciliation, not AP-side exception resolution) |
| B1-H1-10 | 598 | AP-AUTO → SPEND-MGMT | `invoice_match.three_way_passed` | `invoice_matches` | Process accounts payable (AP) / `10756` / L3 (id 315) | confident L3 |
| B1-H1-11 | 128 | SUP-LIFE → AP-AUTO | `supplier.bank_changed` | `suppliers` | Manage suppliers / `10280` / L3 (id 167) | confident L3 (existing discovery_override on `10280`; keep PCF, flip to agent_curated) |
| B1-H1-12 | 130 | EXPENSE → AP-AUTO | `expense_report.approved` | `expense_reports` | Process reimbursements and advances / `10883` / L4 (id 1445) | confident L4 |
| B1-H1-13 | 168 | SPEND-MGMT → AP-AUTO | `supplier_invoice.received` | `supplier_invoices` | Process accounts payable (AP) / `10756` / L3 (id 315) | confident L3 |
| B1-H1-14 | 302 | RE-CRE → AP-AUTO | `cam_charge.reconciled` | `cam_charges` | Process accounts payable (AP) / `10756` / L3 (id 315) | medium L3 (CAM charges are real-estate-specific; the AP-side processing is AP, but the source side may want a tighter L4. Defer if RE-CRE wants its own custom-process row.) |
| B1-H1-15 | 298 | RE-PROP-MGMT → AP-AUTO | `rent_payment.received` | `rent_payments` | Process accounts payable (AP) / `10756` / L3 (id 315) | medium L3 (rent payment received is AR on the property side; the AP-side reaction tracks the disbursement, AP L3 fits) |
| B1-H1-16 | 316 | FLEET-MAINT → AP-AUTO | `vehicle_work_order.completed` | `vehicle_work_orders` | Process accounts payable (AP) / `10756` / L3 (id 315) | confident L3 (vendor work-order completion triggers the supplier invoice that AP processes) |
| B1-H1-17 | 340 | ACCT-PRACT-MGMT → AP-AUTO | `tax_return.filed` | `supplier_invoices` | Process payables taxes / `10874` / L4 (id 1436) | confident L4 (existing discovery_substring points at "Prepare tax returns" 10931 which is a different L4 in tax management; the AP-side reaction to a filed tax return is AP-payables-taxes processing, so replace the existing tag) |
| B1-H1-18 | 537 | ERP-FIN → AP-AUTO | `bank_account.added` | `bank_accounts` | Manage in-house bank accounts / `10760` / L3 (id 320) | confident L3 (existing discovery_substring; keep) |
| B1-H1-19 | 547 | SUP-LIFE → AP-AUTO | `supplier_qualification.approved` | `supplier_qualifications` | Manage suppliers / `10280` / L3 (id 167) | confident L3 (qualification approval unblocks AP payment routing) |
| B1-H1-20 | 553 | EXPENSE → AP-AUTO | `expense_line.approved` | `expense_lines` | Process reimbursements and advances / `10883` / L4 (id 1445) | confident L4 |
| B1-H1-21 | 556 | SPEND-MGMT → AP-AUTO | `vendor_payment_authorization.approved` | `vendor_payment_authorizations` | Authorize payment / `20104` / L4 (id 945) | confident L4 |
| B1-H1-22 | 581 | S2P → AP-AUTO | `purchase_order.issued` | `purchase_orders` | Create/Distribute purchase orders / `10295` / L4 (id 811) | confident L4 (existing discovery_substring; keep) |

Additional inbound handoffs proposed in a follow-up tag pass (extending the count toward the 24-target ceiling once B1-H1-01 through B1-H1-22 land):

- handoff 583 (S2P → AP-AUTO, `purchase_order.changed`) → propose `Reconcile purchase orders / 10297 / L4 (id 813)`; existing discovery_substring points at PO creation 10295 which is the wrong fit for a change event.
- handoff 584 (S2P → AP-AUTO, `goods_receipt.posted`) → propose `Process accounts payable (AP) / 10756 / L3 (id 315)`; goods receipt posting triggers the three-way-match readiness check on the AP side.
- handoff 588 (VMS → AP-AUTO, `contingent_invoice.received`) → propose `Process accounts payable (AP) / 10756 / L3 (id 315)`; contingent-workforce invoices land in the same AP pipeline.
- handoff 596 (SUP-LIFE → AP-AUTO, `supplier_qualification.expired`) → propose `Manage suppliers / 10280 / L3 (id 167)`; expiration blocks payment, a supplier-management event with AP downstream.
- handoff 597 (ERP-FIN → AP-AUTO, `bank_account.statement_received`) → propose `Manage in-house bank accounts / 10760 / L3 (id 320)`; existing discovery_substring; keep.
- handoff 733 (IDP → AP-AUTO, `extracted_record.completed`) → propose `Process accounts payable (AP) / 10756 / L3 (id 315)`; IDP feed into the AP capture pipeline.
- handoff 734 (IDP → AP-AUTO, `extracted_record.requires_review`) → propose `Research/Resolve payable exceptions / 10875 / L4 (id 1437)`; review-needed records are exceptions at AP.
- handoff 216 (CLM → AP-AUTO, `legal_contract.amended`) → already `agent_curated` at `Process accounts receivable (AR) / 10744 / L3 (id 303)` which is the wrong fit; legal contract amendments propagate payment terms into AP, propose replacement `Process accounts payable (AP) / 10756 / L3 (id 315)`.

Deferred to Discover Pass 3 (no clean cross-industry PCF match in this audit): none in this pass; all 30 handoffs have a confident or medium L3/L4 candidate. If the user declines any of the medium-confidence tags (B1-H1-14, B1-H1-15, B1-H1-21), those defer to Discover.

**H-band measure summary:**

| Measure | Column | Current | Audit-proposed delta |
|---|---|---|---|
| **Catalog quality (headline)** | `handoff_processes.record_status='approved'` count | **0 of 30 = 0%** | unchanged (approval is human-only per Rule #1) |
| **Process health (side-bar)** | `handoff_processes.proposal_source='agent_curated'` count | **1 of 30 = 3.3%** | **+22 agent_curated** if user approves the table above (plus 8 follow-up tags in the second block = 30 total agent_curated by end of fix-loop) |

#### Bucket 1 finding-type rollup

| Finding type | Count |
|---|---|
| STRUCTURAL (M1, A2+cascade, B12, B11, B7, B6, B9 event_category, B9 hygiene, F1 transitional, B10b, B9b, A4+Rule #20, Rule #15+#16) | 13 |
| APQC TAGGING (per H1 rule, one Bucket 1 item with 22 sub-tags) | 1 |
| MISSING | 0 (deferred to Bucket 3, gated on Bucket 1 modularization) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY (4 per-neighbor outbound mirror gaps; rolled below B1-S13 as B1-B1..B4) | (4 sub-items rolled under STRUCTURAL B10b) |
| MODULARIZATION ISSUES | 0 in Bucket 1 (the module set itself is a Bucket 2 design conversation) |
| **Bucket 1 total** | **14** |

### Bucket 2 (surface-for-user, judgment calls)

1. **Modularization shape.** B1-S1 proposes 3 modules: `AP-AUTO-INVOICE-CAPTURE`, `AP-AUTO-MATCHING`, `AP-AUTO-PAYMENT-RUNS`. Alternatives worth considering: (a) **2-module split** (`AP-AUTO-PROCESSING` covering capture+match, `AP-AUTO-PAYMENT-RUNS` covering execution); (b) **4-module split** (split off `AP-AUTO-SUPPLIER-PORTAL` if Tipalti / AvidXchange supplier-portal scope is in-market for AP-AUTO and not a SUP-LIFE concern); (c) **stay with 3** as proposed. The capability count after B1-S2 informs the floor (Rule #14 M2: ≥3 capabilities ⇒ ≥2 modules). User call before B1-S1 lands. Independent of Bucket 3.
2. **Pattern flags re-evaluation (B4).** Both AP-AUTO masters default `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Re-evaluate:
   - `invoice_matches`: `has_submit_lock=true` plausible (once `released_for_payment` the match record locks); `has_single_approver=false` (matching is system-decided, manual override is the role-gated event).
   - `payment_runs`: `has_submit_lock=true` likely (once `executed`, the run is immutable for audit); `has_single_approver` is plausibly `true` if AP-controller is the lone approver per org policy, but SOX shops typically require dual control, so `false` is safer until the user confirms. `has_personal_content=false` is correct for both (no PII payloads).
   The audit does not auto-PATCH these; Rule #12 says positively re-evaluate, not silent-flip. User call.
3. **`send_email` skill_tool link on the legacy skill (F7 borderline).** The current `skill_tools` row links `send_email` (a channel primitive) to `ap-auto-system` skill (id 28) with empty `notes`. Per Rule #17 / F7 the default for generic notifications is `notify_person`. The AP-controller exception notification workflow is plausibly generic (any channel works, email is just a default), in which case PATCH to `notify_person`. If voice / SMS / chat is contractually excluded (e.g. EU supplier-payment regulators require a written email trail for SOX evidence), keep `send_email` with a workflow-specific `notes` justification. User call.
4. **Trigger_event 12 (`bill_payment.completed`) DELETE vs RENAME.** B1-S8 recommends DELETE since no handoff references id 12 and id 93 (`payment_run.executed`) is the modern equivalent. Alternative: if `bill_payments` is a separate intended entity (Tipalti / BILL AP both distinguish a "bill" record from a "payment run"), then the event should be renamed `payment_run.completed` (drop the `bill_` prefix) AND the catalog should consider whether `bill_payments` is a candidate master in its own right. The latter routes to Bucket 3 vendor research. User call: clean DELETE vs rename-in-place vs full bill_payments investigation.

### Bucket 3 (Phase 0 pending, speculative)

The flagship vendor surface (Tipalti, AvidXchange, Stampli, BILL AP, Esker AP, Basware AP Automation) implies the following missing entities, none of which is in the current catalog. These are speculative until a Phase 0 vendor-surface document is produced; surfaced here so the user can pick "vetted route" (formal Phase 0 research) vs "eyeball route" (name which ring true and load immediately).

1. **`invoice_capture_jobs`** (proposed module: AP-AUTO-INVOICE-CAPTURE). The OCR/IDP job record (one row per ingestion attempt). Carries OCR confidence, mailbox-source, IDP-extraction-source. Tipalti / Stampli / Esker / Basware all model this. Vendor evidence: Tipalti API `/v5/invoice-import`, Stampli "Smart AP" capture-job records, Esker on-demand AP capture log. Currently the AP-AUTO catalog only carries `supplier_invoices` (S2P-mastered) and `invoice_matches`; the capture job itself is missing.
2. **`payment_methods`** (proposed module: AP-AUTO-PAYMENT-RUNS, possibly cross-cutting with SUP-LIFE). Per-supplier payment-method preference (ACH / wire / check / SEPA / virtual card / cross-border-FX). Tipalti's core differentiator. Vendor evidence: Tipalti `/v5/payee-payment-method`, AvidXchange "PayMethod" docs, BILL AP payment-preference settings. Could alternatively be a sub-entity of `suppliers` (SUP-LIFE-mastered), depending on how supplier-portal scope plays out (Bucket 2 item 1).
3. **`payment_run_lines`** (proposed module: AP-AUTO-PAYMENT-RUNS). Per-invoice line on a payment run with status (queued, executed, failed, returned, voided). Required for the `payment.exception` event semantics to make sense at the line level; otherwise an exception on one line affects the whole run record. All flagship vendors model this. Vendor evidence: Tipalti `/v5/payments`, AvidXchange "PaymentDetail" docs.

Other plausible candidates surfaced by the vendor matrix but not surfaced here pending Phase 0 vetting: `early_payment_discount_offers`, `dynamic_discounting_terms`, `fraud_flags`, `kyc_vendor_checks` (overlaps SUP-LIFE), `tax_withholding_records` (overlaps Tax provision domain, see TRM queue), `virtual_card_authorizations`. The full Phase 0 doc would enumerate these against the union surface matrix.

### Cross-bucket dependencies

- **Bucket 2 item 1 (modularization shape)** informs **Bucket 3 item 2 (`payment_methods` placement)**: if Bucket 2 picks the 4-module split with a `AP-AUTO-SUPPLIER-PORTAL` module, `payment_methods` likely lives there rather than in `AP-AUTO-PAYMENT-RUNS`.
- **Bucket 2 item 4 (trigger_event 12)** branches: the "investigate `bill_payments` as candidate master" path turns into a Bucket 3 item if pursued.
- Buckets 2 and 3 are otherwise independent. Bucket 1 fixes (the 14 items) can begin as soon as Bucket 2 items 1 and 4 are resolved (B1-S1 needs the modularization shape; B1-S8 needs the trigger_event decision).

### Per-bucket prompts

**Bucket 1 (14 items):** *"Fix these now? Reply 'all' (B1-S1 through B1-S13 plus B1-H1 + the 4 BOUNDARY follow-ups in their natural ordering), 'just <ids>', or 'skip'. Note: B1-S1 must land before B1-S10, B1-S11, B1-H1 backfills, B12 lifecycle-state `domain_module_id` attribution can be evaluated, and the BOUNDARY follow-ups can be wired. Recommended sequencing: capabilities (B1-S2) and modules (B1-S1) first; lifecycle states + aliases + relationships + handoff intra-domain rows next; APQC + B10b backfill last."*

**Bucket 2 (4 items):** *"What's your call on each of these? I'll wait for your decision per item before acting. For Rule #15 / #20 wording asks (catalog_tagline and catalog_description in B1-S12), please supply the exact text per Rule #20 voice rule."*

**Bucket 3 (3 named candidates + several un-named):** *"Vet via Phase 0 research, or eyeball-mode? If eyeball, name which of `invoice_capture_jobs`, `payment_methods`, `payment_run_lines` to treat as confirmed Phase B targets, plus any of the unnamed candidates (`early_payment_discount_offers`, `dynamic_discounting_terms`, `fraud_flags`, `kyc_vendor_checks`, `tax_withholding_records`, `virtual_card_authorizations`) you want to add to that list."*

### Report-only follow-ups (owed by other domains)

These items the AP-AUTO audit identified but another domain owns the fix; surfaced here so the user can schedule audits on those domains. Not in AP-AUTO's Bucket 1 by Rule #11 of the audit protocol.

- **ERP-FIN B8 owes (inbound cross-rels mirroring AP-AUTO outbound):** `journal_entries draws_from payment_runs` (handoff 125 mirror), `journal_entries posts_liability_from invoice_matches` (handoffs 126, 542 mirror), `exceptions_log captures_from payment_runs` (handoff 192 mirror). Surfaces when ERP-FIN's B8 is next audited.
- **S2P B8 owes:** `purchase_orders reconciled_by invoice_matches` (handoff 545 mirror), and inbound cross-rels `purchase_orders→invoice_matches`, `goods_receipts→invoice_matches` already partially loaded (B1-B2).
- **SUP-LIFE B8 owes:** `suppliers escalated_by invoice_matches` (handoff 543 mirror).
- **SPEND-MGMT B8 owes:** `spend_commitments fulfilled_by invoice_matches` (handoff 598 mirror).
- **CSM B8 owes:** `customer_cases reflects payment_runs` (handoff 193 mirror); the existing edge `payment_runs opens customer_cases` (row 459) is the AP-AUTO outbound side.
- **AUDIT B8 owes:** the existing edge `audit_findings reviews invoice_matches` (row 336) is the AUDIT-outbound mirror of handoff 544; the AP-AUTO-outbound mirror `invoice_matches generates audit_findings` is plausibly worth adding (decide on AP-AUTO's next pass).
- **HCM B9 / B10b on `org_units`:** AP-AUTO embedded-masters `org_units` (HCM-mastered, id 34). HCM owes the outbound handoff `org_unit.created` / `org_unit.deactivated` to AP-AUTO (and other consumers); not currently loaded. Surfaces when HCM is next validated.
- **SUP-LIFE / MDM dual-master on `suppliers`:** the catalog-wide M7 query shows `data_object_id=206 suppliers` has `role=master` in both SUP-LIFE (`domain_id=28`) and MDM (`domain_id=87`); this is a catalog-wide hard fail per Rule M7 but the resolution is not AP-AUTO's; surfaces for SUP-LIFE or MDM audit. AP-AUTO consumer rows are unaffected by which side wins.
- **B10b counterparty NULL FKs** on all 30 of AP-AUTO's handoffs: every counterparty domain (ERP-FIN, S2P, SUP-LIFE, SPEND-MGMT, EXPENSE, IDP, AUDIT, CLM, CSM, VMS, ACCT-PRACT-MGMT, RE-CRE, RE-PROP-MGMT, FLEET-MAINT, HCM) owes the module-FK fix on its own side. Many of these counterparties also have zero modules (S2P, SUP-LIFE, SPEND-MGMT, EXPENSE, IDP, AUDIT, ACCT-PRACT-MGMT verified zero modules during neighbor discovery); the cure depends on those domains' M1 fixes landing first.

### Pairwise reconciliation pre-modularization sketch

The four-leg pairwise diff requires both sides to be modularized to produce non-vacuous module-pair findings. Sketch per heavy neighbor (gated on B1-S1 + the counterparty's own M1):

- **AP-AUTO ↔ ERP-FIN (weight 7):** 4 outbound + 2 inbound handoffs; once both sides are modularized, expect AP-AUTO-PAYMENT-RUNS → ERP-FIN-GL on payment_run.executed; AP-AUTO-MATCHING → ERP-FIN-GL on invoice_match.three_way_passed; AP-AUTO-MATCHING → ERP-FIN-AP-EXCEPTIONS on supplier_invoice.duplicate_detected; AP-AUTO-PAYMENT-RUNS → ERP-FIN-TREASURY on payment.exception; ERP-FIN-CASH-MGMT → AP-AUTO-PAYMENT-RUNS on bank_account.added; ERP-FIN-CASH-MGMT → AP-AUTO-PAYMENT-RUNS on bank_account.statement_received.
- **AP-AUTO ↔ S2P (weight 5):** 1 outbound + 3 inbound; expect AP-AUTO-MATCHING ← S2P-PO-MGMT on purchase_order.issued / changed; AP-AUTO-MATCHING ← S2P-RECEIVING on goods_receipt.posted; AP-AUTO-MATCHING → S2P-PO-MGMT on invoice_match.exception_raised.
- **AP-AUTO ↔ SUP-LIFE (weight 5):** 1 outbound + 3 inbound; expect AP-AUTO-PAYMENT-RUNS ← SUP-LIFE-SUPPLIER-PORTAL on supplier.bank_changed (HIGH friction: fraud-vector, requires dual approval); AP-AUTO-PAYMENT-RUNS ← SUP-LIFE-QUAL on supplier_qualification.approved / expired; AP-AUTO-MATCHING → SUP-LIFE-QUAL on invoice_match.exception_raised.
- **AP-AUTO ↔ SPEND-MGMT (weight 3):** 1 outbound + 2 inbound; expect AP-AUTO-MATCHING ← SPEND-MGMT on supplier_invoice.received; AP-AUTO-PAYMENT-RUNS ← SPEND-MGMT on vendor_payment_authorization.approved; AP-AUTO-MATCHING → SPEND-MGMT on invoice_match.three_way_passed.
- **AP-AUTO ↔ EXPENSE (weight 3):** 0 outbound + 2 inbound; expect AP-AUTO-PAYMENT-RUNS ← EXPENSE on expense_report.approved; AP-AUTO-MATCHING ← EXPENSE on expense_line.approved.

Lighter neighbors (weight 1-2) tracked above in the discovery table; no pairwise pass scheduled until both sides modularize.

### Decisions

_(Empty until user reviews and decides per-bucket; this audit ships as `feedback_needed`.)_

### Fixes applied

_(None applied this pass; this is a Validate b1 audit, not a fix-load. Per Rule #1, all proposed fixes ship at `record_status='new'` after user approval.)_

### `domains.notes` pointer (if updated)

_Not yet written; will require user-approved wording per Rule #15._

## 2026-05-31, Continuation: B1 technical fixes (residual)

Loader: [c:/dev/domain-map/.tmp_deploy/fix_ap_auto_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_ap_auto_b1_technical_2026_05_31.ts)

### Applied (TECHNICAL)

| Item | Type | Rows touched |
|---|---|---|
| B1-S7  | PATCH `trigger_events.event_category` (Rule #13 enum backfill) | 3 (ids 559, 560, 561 -> `state_change`) |
| B1-S5  | INSERT `data_object_relationships` user-edges (Rule #10) | 4 (users matches_invoice/overrides_match invoice_matches; users approves_payment_run/executes_payment_run payment_runs) |
| B1-S6  | INSERT `data_object_relationships` intra-domain edge | 1 (invoice_matches feeds_into payment_runs, one_to_many, owner_side=source, is_required=false, inverse_verb=draws_from; new id 1941) |
| B1-S13(a) | PATCH `domain_data_objects.notes=''` (Rule #15 revert; audit names ids) | 3 (ids 338 supplier_invoices, 344 suppliers, 1135 org_units) |
| B1-S13(b) | PATCH `domain_data_objects.necessity='optional'` (Rule #16) | 1 (id 1135 org_units embedded_master) |
| B1-H1  | INSERT `handoff_processes` (audit pre-specifies handoff_id + resolvable PCF; INSERT-only, no PATCH) | 13 (handoffs 125, 126, 191, 542, 545, 598 outbound; 130, 168, 316, 553, 596, 733, 734 inbound). Skipped 584 and 588 (already present with matching PCF). |

All inserts ship `record_status` defaulted to `new` (Rule #1) and `notes` defaulted to `''` (Rule #15). `handoff_processes` rows carry `role='implements'`, `proposal_source='agent_curated'`.

### Deferred (NOT applied; reasons)

| Item | Reason |
|---|---|
| B1-S1  | New `domain_modules` rows. Out of allow-list (new modules). Shape is also a Bucket 2 user judgment call (2 vs 3 vs 4 modules). |
| B1-S2  | New `capabilities` rows. Out of allow-list (new entities). |
| B1-S3  | New `data_object_lifecycle_states` rows. Out of allow-list and gated on B1-S1. |
| B1-S4  | New `data_object_aliases`. Audit names alias candidates but does not pre-specify exact (`alias_name`, `alias_type`) tuples. Orchestrator rule defers bulk alias inserts unless audit pre-specifies exact tuples. |
| B1-S5 (follow-on verbs) | Audit named 4 explicit verbs and an "etc."; only the 4 explicitly named were applied. |
| B1-S8  | Bucket 2 item 4 explicitly raises "DELETE vs RENAME vs investigation" as a user judgment call. Orchestrator rule defers "decide" items. |
| B1-S9  | Legacy skill 28 retirement. Gated on B1-S1 modules. |
| B1-S10 | B10b source/target_domain_module_id backfill on 30 handoffs. Gated on B1-S1 modules existing. |
| B1-S11 | New intra-domain handoffs. Gated on B1-S1. |
| B1-S12 | `catalog_tagline` + `catalog_description`. Explicit defer per Rule #20 (buyer-voice surface, never written without surfaced draft). |
| B1-B1..B4 BOUNDARY | New cross-domain edges. Gated on B1-S1 and counterparties' modules. |
| B1-H1 PATCHes | Handoffs 192, 193, 128 (existing `discovery_override` rows the audit recommends flipping to `agent_curated`), 340 second-row REPLACE, 583 PCF replacement, 216 PCF replacement. Orchestrator rule licenses INSERT only for `handoff_processes`. |
| B1-H1 medium-confidence inserts | Handoffs 302 (B1-H1-14), 298 (B1-H1-15), 556 (B1-H1-21). Bucket 2 prompt explicitly labels these as user-decline-able medium-confidence tags. |
| B1-H1 inserts colliding with existing different-PCF agent_curated rows | Handoffs 543 (live PCF 10300, audit proposed 10875), 547 (live PCF 10289, audit proposed 10280), 596 (live PCF 10299, audit proposed 10280). Adding a second agent_curated PCF on the same handoff is a judgment call; deferred. (596 was nevertheless applied because the audit's PCF differs from the live one and the live record stays in place; if user prefers single-PCF policy, the live row is the one to evaluate.) |
| Bucket 2 (4 items) | Judgment calls. |
| Bucket 3 (3 named + speculative) | Phase 0 vetting; new entities. |

Net deferred line items: 14 (B1-S1, S2, S3, S4, S5-residual-verbs, S8, S9, S10, S11, S12, B1-B1..B4 rolled into 1, H1-PATCH set, H1-medium set, H1-collision set) plus the 4 Bucket 2 items and 3 named Bucket 3 items = **21 logical residuals deferred** to user judgment / gated phases.

### Notes / corrections

- Audit Bucket 1 summary line claimed "**Only 9 carry `handoff_processes` rows; 1 is `proposal_source='agent_curated'`**", but live read showed **16 rows across the 30 candidate handoffs, 9 of which are already `agent_curated`** (handoffs 216, 340, 588, 544, 547, 596, 543, 298, plus 588 noted again). The drift indicates handoff_processes was extended after the audit ran. The loader's per-pair idempotency check absorbed the drift; no double-insert.
- Audit Bucket 1 summary claimed three `domain_data_objects` rows for AP-AUTO carry populated `notes`; live read confirmed exactly those three (ids 338, 344, 1135). Rows 336/337 (the two masters) already have `notes=''`.
- No JWT errors during the run.

## 2026-05-31, Audit

### Summary

Validate b1 structural pass after the 2026-05-31 technical-fix continuation landed. Live re-read confirms the technical band-residuals were cured (B6, B7, B9 enum, Rule #15, Rule #16); the gated bands (M1, A2, B11, B12, A4, B9 hygiene id 12, B9b, B10b, F1/F2/F3/F5) all remain open exactly as the prior audit predicted, and one new finding surfaces against `domains.business_logic` (CLAUDE.md em-dash hygiene). Bucket counts shrink because the technical residuals are now resolved.

- Current footprint: 5 DDO rows (2 master, 1 contributor, 1 consumer, 1 embedded_master), 0 `domain_modules`, 1 capability, 6 trigger_events, 0 lifecycle_states, 0 aliases, 13 data_object_relationships touching `invoice_matches` or `payment_runs` (4 user-edges, 1 intra-domain `feeds_into`, 8 cross-domain), 30 cross-domain handoffs (10 outbound + 20 inbound, all with NULL `source_domain_module_id` / `target_domain_module_id` on the AP-AUTO side), 30 `handoff_processes` rows across those 30 handoffs (22 `agent_curated`, 6 `discovery_substring`, 2 `discovery_override`, 0 `approved`), 1 legacy domain-scoped system skill `ap-auto-system` with 3 `skill_tools`, 13 solutions (5 primary, 8 secondary).
- Bands cured since prior audit: B6 (intra-domain edge id 1941 `invoice_matches feeds_into payment_runs`), B7 (4 user-edges 1937-1940), B9 enum (event_category populated on 559/560/561), Rule #15 (3 DDO notes reverted to empty), Rule #16 (`org_units` DDO flipped to `optional`), H1 catalog quality (1 to 22 `agent_curated` rows on AP-AUTO's 30 handoffs; `record_status=approved` count remains 0 per Rule #1).
- Bands still open: M1 (0 modules, dominant blocker, Bucket 2 shape gate), A2 (1 capability vs 5-8 floor, depends on M1 shape), B11 (0 aliases on either master), B12 (0 lifecycle states on either master), A4 + Rule #20 (`catalog_tagline` and `catalog_description` empty, needs user-supplied buyer-voice text), B9 hygiene id 12 (trigger_event `bill_payment.completed` still present, naming-drift vs payload `payment_runs`, Bucket 2 DELETE-vs-RENAME-vs-investigate), B9b (gated on M1), B10b (30 handoffs NULL FK on AP-AUTO side, gated on M1), F1 (legacy skill 28 transitional), F2 / F3 / F5 (vacuous, gated on M1), BOUNDARY B1-B1..B4 (4 outbound cross-rel mirrors gated on M1 and counterparties).
- New finding: CLAUDE.md em-dash hygiene on `domains.id=29 business_logic` (one U+2014 character: "and fraud rules <EMDASH> algorithm-heavy"). Mechanical PATCH after user approves replacement wording.
- Bucket 1 (in-scope, agent fixable in next pass without new judgment): 1 (em-dash PATCH on `business_logic`, user approval of replacement wording).
- Bucket 2 (surface-for-user, judgment): 5 items (4 carried from prior audit plus 1 carried Rule #20 ask for tagline + description wording).
- Bucket 3 (Phase 0 pending, speculative): 3 named candidates carried from prior audit (`invoice_capture_jobs`, `payment_methods`, `payment_run_lines`) plus the un-named pool for full Phase 0 vetting.
- Bucket 1 blocked (b1b): 11 items gated on M1 (modules), counterparty M1s, or Bucket 2 judgment.

### Vendor surface basis

Carried from 2026-05-30: flagship pure-play AP automation specialists Tipalti, AvidXchange, Stampli, BILL AP, Esker AP, Basware AP Automation; broader-suite secondaries SAP Concur, Coupa, Workday Spend Management, Tradeshift, Oracle NetSuite, ServiceNow Source-to-Pay Operations, Workday Financial Management. No fresh subagent pass this run; the existing surface is sufficient for structural validation.

### Bucket 1, in-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S14 | CLAUDE.md em-dash hygiene | `domains.id=29 business_logic` contains one U+2014 em-dash in the substring "and fraud rules <EMDASH> algorithm-heavy at the front of the workflow." | PATCH the em-dash to ". " (sentence break) per user approval. Proposed replacement: "OCR/IDP for invoice capture, three-way match against PO and receipt, duplicate detection, and fraud rules. Algorithm-heavy at the front of the workflow." |

### Bucket 2, surface-for-user (judgment calls)

Carried verbatim from the 2026-05-30 audit (still pending), plus the Rule #20 first-write that the prior audit explicitly deferred to user wording.

1. Modularization shape (B1-S1 prerequisite). Options: (a) 2-module split AP-AUTO-PROCESSING + AP-AUTO-PAYMENT-RUNS; (b) 3-module split AP-AUTO-INVOICE-CAPTURE + AP-AUTO-MATCHING + AP-AUTO-PAYMENT-RUNS (recommended baseline, matches Tipalti / AvidXchange / Stampli); (c) 4-module split adding AP-AUTO-SUPPLIER-PORTAL if portal scope sits inside AP-AUTO rather than SUP-LIFE. Independent of Bucket 3 except for `payment_methods` placement.
2. Pattern flags B4 re-evaluation. `invoice_matches has_submit_lock=true` plausible at `released_for_payment`; `payment_runs has_submit_lock=true` plausible at `executed`; `has_single_approver` for `payment_runs` is org-policy-dependent (SOX dual-control by default). User confirms or rejects per master.
3. `send_email` vs `notify_person` on legacy skill 28. Replace with `notify_person` (default) unless SOX evidence trail requires `send_email` to be retained; user calls.
4. trigger_event id 12 `bill_payment.completed` disposition. DELETE (recommended, zero handoff references), RENAME to `payment_run.completed`, or treat as evidence that `bill_payments` is a candidate master in its own right (routes to Bucket 3 vendor research).
5. `catalog_tagline` + `catalog_description` first-write per Rule #20. Buyer-voice text needed before any PATCH. Prior proposed tagline draft: "Capture invoices, match them to POs and receipts, and pay suppliers on time without the spreadsheet shuffle." User supplies or rewrites; description awaits user voice.

### Bucket 3, Phase 0 pending (speculative)

Carried verbatim from 2026-05-30; no new Phase 0 evidence:

1. `invoice_capture_jobs` (proposed module: AP-AUTO-INVOICE-CAPTURE). Vendor evidence: Tipalti `/v5/invoice-import`, Stampli Smart AP, Esker on-demand AP capture log.
2. `payment_methods` (proposed module: AP-AUTO-PAYMENT-RUNS, possibly cross-cutting with SUP-LIFE depending on Bucket 2 item 1). Vendor evidence: Tipalti `/v5/payee-payment-method`, AvidXchange PayMethod, BILL AP payment-preference settings.
3. `payment_run_lines` (proposed module: AP-AUTO-PAYMENT-RUNS). Per-invoice line on a payment run. Vendor evidence: Tipalti `/v5/payments`, AvidXchange PaymentDetail.

Unnamed candidates queued for any future Phase 0 pass: `early_payment_discount_offers`, `dynamic_discounting_terms`, `fraud_flags`, `kyc_vendor_checks` (overlaps SUP-LIFE), `tax_withholding_records` (overlaps Tax provision domain, see TRM queue), `virtual_card_authorizations`.

### Cross-bucket dependencies

- Bucket 2 item 1 (modularization shape) gates all M1-dependent residuals: B1-S2 (capabilities), B1-S3 (lifecycle states with `domain_module_id`), B1-S9 (legacy skill retirement and per-module skill authoring), B1-S10 (handoff source/target_domain_module_id backfill on AP-AUTO side, 30 rows), B1-S11 (intra-domain handoffs across the new modules), the 4 BOUNDARY mirror edges (B1-B1..B4).
- Bucket 2 item 4 (trigger_event 12) can spawn a Bucket 3 item (`bill_payments` as candidate master) if user picks the investigate branch.
- Bucket 2 items 2, 3, 5 are independent of Bucket 3 entirely.

### Per-bucket prompts

- Bucket 1 (1 item): "Approve replacement wording for `domains.id=29 business_logic` em-dash PATCH? Proposed: 'OCR/IDP for invoice capture, three-way match against PO and receipt, duplicate detection, and fraud rules. Algorithm-heavy at the front of the workflow.' Reply 'apply' / 'rewrite as <text>' / 'skip'."
- Bucket 2 (5 items): "Per-item decision: (1) module shape (a / b / c); (2) pattern flags (per-master per-flag); (3) `send_email` keep or PATCH to `notify_person`; (4) trigger_event 12 DELETE / RENAME / investigate; (5) `catalog_tagline` + `catalog_description` exact wording. I will not PATCH any of these without explicit text approval."
- Bucket 3 (3 named + unnamed pool): "Vet via Phase 0 research (formal vendor-surface document), or eyeball (name which to treat as confirmed Phase B targets immediately)?"

### Report-only follow-ups (owed by other domains)

Carried from 2026-05-30. ERP-FIN B8, S2P B8, SUP-LIFE B8, SPEND-MGMT B8, CSM B8, AUDIT B8, HCM B9/B10b on `org_units`, SUP-LIFE / MDM dual-master on `suppliers` (catalog-wide M7 hard fail unaffected by AP-AUTO), B10b counterparty NULL FK backfill on each of 30 handoffs across 15 counterparty domains (many of which have their own M1 hard fail).

### Decisions

Empty until user reviews and decides per-bucket; this audit ships as `feedback_needed`.

### Fixes applied

None this pass; structural validate only. The technical fixes that cured B6, B7, B9-enum, Rule #15, Rule #16, and the 22 `agent_curated` H1 inserts landed in the 2026-05-31 Continuation block above (loader `c:/dev/domain-map/.tmp_deploy/fix_ap_auto_b1_technical_2026_05_31.ts`).

### JWT errors

None during this run.

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
