# S2P audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 5 masters (`sourcing_events`, `purchase_requisitions`, `purchase_orders`, `goods_receipts`, `supplier_invoices`) + 2 contributors (`saas_subscriptions`, `legal_contracts`) + 2 consumers (`contingent_invoices`, `suppliers`) + 1 embedded_master (`org_units`) recorded **only in the legacy `domain_data_objects` rollup**. **Zero `domain_modules` rows.** Zero `domain_module_data_objects` rows. 1 capability (`APPROVAL-WORKFLOW`, cross-cutting). 11 `solution_domains` rows (9 primary, 2 secondary). 5 regulations linked. 12 outbound handoffs, 17 inbound handoffs. 1 legacy domain-level `skill` (`s2p-system`, id 22) with 14 `skill_tools` rows. Zero `roles` directly linked.
- Vendor-surface basis (flagship vendors, agent-curated from existing `solutions`): SAP Ariba, Coupa Business Spend Management, Oracle Procurement Cloud (via Workday Spend / NetSuite proxy), Ivalua Platform, JAGGAER ONE, Tradeshift, Basware AP Automation. Pure-play S2P suite vendors; the catalog already names Workday Strategic Sourcing + Workday Spend Management + ServiceNow Source-to-Pay Operations under primary coverage.
- **Bucket 1 (in-scope, agent fixable):** 21 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 1 item.
- Candidates queued to `audits/_missing-domains.md`: 1 (TAIL-SPEND-MGMT).

**Headline:** S2P is structurally pre-modular. M1 fails outright (zero `domain_modules`), which cascades into M2 / M4 / M5 / M6 / M7 / F2 / F3 / F5 / E1 / A4. Every B-band and H1 finding is gated on the M-band fix. The five masters, their lifecycle states, trigger events, and 14 skill_tools are real catalog content; they just lack the module shell that Rule #14 makes mandatory. The audit's primary recommendation is a Phase A + Phase M re-load that splits S2P into a coherent module set (proposal in Bucket 2 #1), after which the existing footprint can be re-anchored through `domain_module_data_objects` rows.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (S / A / M)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | S1 | `domain_modules` row count for `domain_id=27` is 0. Every downstream `domain_module_*` table is therefore empty for S2P. | Author the S2P module set per Bucket 2 #1 (split decision), then INSERT `domain_modules` rows. |
| B1-S2 | S2 | N/A while M1 fails: no modules to sweep `domain_module_data_objects` / `domain_module_capabilities` against. | Re-run S2 after M1 clears. |
| B1-S3 | S3 | All 5 masters have lifecycle states loaded but `domain_module_id` is NULL on every row (28 rows total across the 5 masters). Aliases: zero on every master. Trigger events: 13 rows exist across all 5 masters (good). | Re-anchor lifecycle states to realizing modules (M5) once modules exist. Load aliases per B11. |
| B1-A1 | A1 | `domains` row has the 7 metadata fields populated correctly (crud=78, $$$$, m, 7000, 2025, business_logic present). PASS. | None. |
| B1-A2 | A2 | `capability_domains` has only 1 row, the cross-cutting `APPROVAL-WORKFLOW`. Rule #14 expects 5 to 8 market-specific capabilities (e.g. `S2P-SOURCING`, `S2P-REQ-TO-PO`, `S2P-RECEIVING`, `S2P-INVOICE-MATCHING`, `S2P-CATALOG-MGMT`, `S2P-SAVINGS-TRACKING`). | Author 5 to 8 `capabilities` + `capability_domains` rows per Phase A. |
| B1-A3 | A3 | 11 `solution_domains` rows, 9 primary, mix of pure-plays and adjacents. PASS, with one cleanup: `Jaggaer ONE` (id 129) and `JAGGAER ONE` (id 518) are duplicates differing only in casing. | DELETE one of the two `solutions` rows and re-point its `solution_domains` row to the survivor (Bucket 2 #2 picks which). |
| B1-A4 | A4 | `catalog_tagline` empty, `catalog_description` empty. Rule #20 fail. | Draft both fields in buyer voice, surface to user before write (Rule #20 backfill path). Drafts proposed in Bucket 2 #3. |
| B1-M1 | M1 | Zero `domain_modules` rows for `domain_id=27`. Hard structural fail blocking M2 to M7, B-band, E-band, F2 to F5. | Author the proposed S2P module set (Bucket 2 #1) and load via a focused Phase M loader. |
| B1-M2 | M2 | Vacuous on capability_count=1 today, but the Bucket 1 A2 fix will push capability_count past 3, at which point M2 requires >= 2 modules. The proposed split in Bucket 2 #1 already satisfies this. | Tied to M1 + A2 fix. |
| B1-M4 | M4 | The single `APPROVAL-WORKFLOW` capability has zero realizing modules in `domain_module_capabilities`. Will resolve once M1 + Bucket 1 A2 capabilities land. | Add `domain_module_capabilities` rows linking each capability to its realizing module. |
| B1-M5 | M5 | 4 lifecycle states across 4 masters carry `requires_permission=true` (`sourcing_event.awarded` id 71 / state `awarded`; `purchase_requisitions` state `approved`; `purchase_orders` state `issued`; `supplier_invoices` state `approved`). All four have `domain_module_id=NULL`. | PATCH each to its realizing module once modules exist. |
| B1-M6 | M6 | Vacuous while modules are zero; will need the converse check after M1. | Re-run after M1 clears. |
| B1-M7 | M7 | At the DMDO layer (the authoritative single-master layer) S2P's 5 masters have **zero** DMDO master rows, so no within-domain conflict can be detected yet. At the legacy `domain_data_objects` layer, `suppliers` (id 206) carries two master rows (`SUP-LIFE` id 28 AND `MDM` id 87). Catalog-wide duplicate-master smell, surfaced for the SUP-LIFE / MDM audit. | Report-only (owed by SUP-LIFE and MDM); see Report-only follow-ups. |

#### STRUCTURAL band failures (E / F)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S4 | E1 | Zero `roles` linked to S2P (no rows with `business_function_id=19` Procurement; no `role_modules` rows touching S2P modules because no modules exist). | After M1 + Phase E, author at least 3 roles (Buyer / Sourcing Manager / AP Specialist / CPO) with the function-scoped naming `PROCUREMENT-BUYER`, `PROCUREMENT-SOURCING-MGR`, `FINANCE-AP-SPECIALIST`, `PROCUREMENT-CPO`. |
| B1-S5 | F1 | Legacy domain-level system skill present: `s2p-system` (id 22), `skill_type=system`, `domain_id=27`, `domain_module_id=null`, 14 `skill_tools` rows. Per Rule #17 / F1, the legacy row retires once module-level system skills exist. | After M1 + Phase S, author one system skill per S2P module (`<module_code_lower>_agent` per Phase-S convention), redistribute the 14 skill_tools rows across the per-module skills, then DELETE skill id 22. |
| B1-S6 | F2 | Zero module-level system skills (F2 fail trivially while modules are zero). | Bundle with the S5 fix once modules land. |
| B1-S7 | F4 | Skill 22's `skill_tools` rows already pass F4 invariants (`query` / `mutate` rows carry `data_object_id`; `send_email` / `sign_document` / `extract_entities` have `data_object_id=NULL`). PASS structurally. | None. |
| B1-S8 | F7 | Skill 22 links `send_email` (id 37, `platform`, `side_effect`) without a workflow-specific justification. Per Rule's Channel vs Capability rule, generic notifications should use `notify_person` / `notify_team`. | When re-authoring per-module skills (S5 fix), replace `send_email` with `notify_person` unless a specific workflow demands email (e.g. supplier-facing PO dispatch where email IS the contract; surface in Bucket 2 #4). |

#### STRUCTURAL band failures (B)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S9 | B2 | All 5 masters have non-empty `singular_label` + `plural_label`. PASS. | None. |
| B1-S10 | B3 | None of the 5 masters are bare-word names (all are `<noun>_<noun>` or `<adj>_<noun>`). PASS. | None. |
| B1-S11 | B4 | Pattern flags considered, with hits on `purchase_requisitions` (submit_lock + single_approver) and `supplier_invoices` (single_approver). The other 3 masters carry all-false (default). Audit re-evaluation: `purchase_orders` likely should be `has_submit_lock=true` once issued (a buyer cannot edit an issued PO without a change order). `sourcing_events` likely should be `has_submit_lock=true` once published. | PATCH `has_submit_lock=true` on `purchase_orders` (id 73) and `sourcing_events` (id 71); surface to user for confirmation. |
| B1-S12 | B6 | Intra-domain `data_object_relationships` cover the requisition to PO to GR to invoice chain, plus the sourcing-event to PO leg via CLM contracts. PASS on present edges, but missing the direct `purchase_requisitions to purchase_orders` edge: today the link is mediated through `legal_contracts` (id 66) via rows 503 + 502. | Add `purchase_requisitions becomes purchase_order` (verb `becomes` / inverse `originates_from`, one_to_many, owner_side=source, is_required=false). Surface for user approval. |
| B1-S13 | B7 | Zero edges from any S2P master to `users` (id 748). Every master has user-typed actors (requester on `purchase_requisitions`, buyer / approver on `purchase_orders`, receiver on `goods_receipts`, AP-clerk on `supplier_invoices`, sourcing-manager on `sourcing_events`). | Author 5 `data_object_relationships` rows per Rule #10 (one per master to `users`), with the right relationship verb per actor role. |
| B1-S14 | B9 | Outbound trigger events are mostly covered (13 events across 5 masters). One stale-shaped event: `po.saas_subscription_created` (id 97) reads as an embedded handoff payload rather than a `purchase_order` state transition. Already used by handoff 42 (S2P to SMP). Acceptable as-is; flag only. | None (review only). |
| B1-S15 | B9b | Skip; precondition `>= 2 modules` not met. | Re-run after M1. |
| B1-S16 | B10b | 10 of 12 outbound handoffs have `source_domain_module_id=NULL` (only handoffs 602, 40, 42 carry a target_domain_module_id; none carry source). All 17 inbound handoffs have `target_domain_module_id=NULL` (3 carry `source_domain_module_id`). | The source side cannot be backfilled until S2P is modularized (M1). The target side on inbound handoffs is owed by S2P's own M1 fix. Re-run B10b after M1 + DMDO re-anchor. |
| B1-S17 | B11 | Zero `data_object_aliases` rows on any of the 5 S2P masters. `purchase_requisitions` (Coupa: Request; Ariba: PR), `purchase_orders` (Ariba: PO; Workday: Purchase Order; SAP: Bestellung), `sourcing_events` (Ariba: RFP / RFI / Reverse Auction), `goods_receipts` (Ariba: GR; SAP: Warenbewegung), `supplier_invoices` (Coupa: Invoice; SAP: Lieferantenrechnung) all warrant 2 to 4 aliases each. | Author roughly 15 alias rows per Phase B; bundle as cluster-drafts. |
| B1-S18 | B12 | Lifecycle states loaded for all 5 masters (28 rows). PASS on presence. However `domain_module_id` is NULL on every row (see M5). Also: the `permission_verb_override` on `sourcing_events.awarded` is `award_event` (awkward, reads like a row-class rather than a verb), and `supplier_invoices.approved` is `approve_invoice` (clean). | PATCH `sourcing_events.awarded` verb override to `award_sourcing_event` (surface for user confirmation). |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | `data_object_relationships` row 270 (`data_object 54` (`work_orders` MWO / FSM) `fulfilled_by` `purchase_orders`) carries `owner_side=target`. The S2P side is the target of this verb. Acceptable as cross-domain; just flag it remains a cross-domain edge. No fix needed. | None (informational). |
| B1-B2 | `data_object_relationships` row 715 (`supplier_invoices reimbursed via invoice expense_reports`) verb is freeform string with spaces; convention is single underscore-or-spaceless verb (`reimburses_via`). | PATCH the verb to `reimburses_via` (surface to user). |

#### APQC TAGGING

S2P has 29 cross-domain handoffs total (12 outbound + 17 inbound). 11 already carry `handoff_processes` rows (mix of `discovery_substring`, `discovery_override`, `agent_curated`). 18 untagged. Per the volume target (0.5N to 0.8N agent_curated rows), expect 9 to 14 new agent_curated proposals from this audit. Below are confident L2 / L3 / L4 proposals for the untagged set, plus deferrals.

**Confident agent_curated proposals (untagged cross-domain handoffs):**

| handoff_id | source to target | trigger_event | payload | Proposed PCF | PCF id | hierarchy_level | Confidence |
|---|---|---|---|---|---|---|---|
| 347 | S2P to AGENCY-MGMT | vendor_invoice.received | (482) | Process accounts payable (AP) | 315 | 3 | confident L3 |
| 565 | S2P to SUP-LIFE | sourcing_event.awarded | sourcing_events | Select suppliers and develop/maintain contracts | 165 | 3 | confident L3 |
| 583 | S2P to AP-AUTO | purchase_order.changed | purchase_orders | Create/Distribute purchase orders | 811 | 4 | confident L4 |
| 584 | S2P to AP-AUTO | goods_receipt.posted | goods_receipts | Process accounts payable (AP) | 315 | 3 | confident L3 |
| 585 | S2P to ERP-FIN | goods_receipt.posted | goods_receipts | Process accounts payable (AP) | 315 | 3 | confident L3 |
| 586 | S2P to SUP-LIFE | goods_receipt.quantity_variance | goods_receipts | Manage suppliers | 167 | 3 | confident L3 |
| 117 | MWO inbound to S2P | pm_work_order.invoiced | contingent_invoices | Process accounts payable (AP) | 315 | 3 | confident L3 |
| 198 | FINOPS inbound to S2P | cloud_spend.threshold_breached | supplier_invoices | Process accounts payable (AP) | 315 | 3 | confident L3 |
| 545 | AP-AUTO inbound to S2P | invoice_match.exception_raised | (204) | Research/Resolve payable exceptions | 1437 | 4 | confident L4 |
| 546 | SUP-LIFE inbound to S2P | supplier_qualification.approved | (208) | Certify and validate suppliers | 805 | 4 | confident L4 |
| 548 | SUP-LIFE inbound to S2P | supplier_qualification.expired | (208) | Certify and validate suppliers | 805 | 4 | confident L4 |
| 560 | SPEND-MGMT inbound to S2P | spend_policy.updated | (747) | Develop procurement plan | 793 | 4 | confident L4 |
| 636 | SAM inbound to S2P | software_license.over_consumed | (58) | Approve requisitions | 809 | 4 | confident L4 |
| 668 | HAM inbound to S2P | spare_parts_inventory.low_threshold | (698) | Process/Review requisitions | 808 | 4 | confident L4 |
| 669 | HAM inbound to S2P | hardware_warranty.expiring | (696) | Process/Review requisitions | 808 | 4 | confident L4 |
| 39 | SMP inbound to S2P | shadow_app.requires_sanctioning | purchase_requisitions | Process/Review requisitions | 808 | 4 | confident L4 |
| 45 | SMP inbound to S2P | seat_demand.exceeded | purchase_requisitions | Process/Review requisitions | 808 | 4 | confident L4 |
| 1050 | INV-MGMT inbound to S2P | inv_stock_item.below_reorder_point | purchase_orders | Create/Distribute purchase orders | 811 | 4 | confident L4 |
| 1089 | PLM inbound to S2P | engineering_change_order.released | (796) | Modify job requisitions (no clean PO-change L4); see deferral | n/a | n/a | DEFER |
| 132 | PSA inbound to S2P | service_project.staffing_required | purchase_requisitions | Process/Review requisitions | 808 | 4 | confident L4 |

**Deferred (no clean PCF):**

| handoff_id | Reason |
|---|---|
| 1089 | `engineering_change_order.released` is a PLM-side event; the S2P-side receipt has no clean `purchase_order_changed` PCF L4. Closest L4 (`Modify job requisitions`, id 1004) is HR-recruiting-scoped. Route to Discover Pass 3 custom-process authoring. |

Counting convention: APQC TAGGING is **one** Bucket 1 item (B1-H1) per Rule #10 with the table above as the sub-table.

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-H1 | H1 | 18 untagged cross-domain handoffs (29 total minus 11 tagged). 19 confident agent_curated proposals + 1 deferral above. | INSERT 19 `handoff_processes` rows (`proposal_source='agent_curated'`, `record_status='new'`). |

#### Boundary findings per neighbor (Pass 4 pairwise, weight >= 3)

S2P's edge weights to neighbors (outbound + inbound count):

| Neighbor | Code | Outbound | Inbound | Total |
|---|---|---|---|---|
| AP-AUTO | 29 | 3 | 1 | 4 |
| ERP-FIN | 65 | 2 | 0 | 2 |
| SUP-LIFE | 28 | 2 | 3 | 5 |
| CLM | 26 | 2 | 2 | 4 |
| SMP | 85 | 1 | 2 | 3 |
| MWO/FSM (id 64) | 64 | 0 | 1 | 1 |
| AGENCY-MGMT | 153 | 1 | 0 | 1 |
| SPEND-MGMT | 133 | 1 | 1 | 2 |
| FINOPS | 41 | 0 | 1 | 1 |
| SAM | 52 | 0 | 1 | 1 |
| HAM | 51 | 0 | 2 | 2 |
| INV-MGMT | 164 | 0 | 1 | 1 |
| PLM | 165 | 0 | 1 | 1 |
| PSA | 68 | 0 | 1 | 1 |
| VMS | 64 | 1 | 0 | 1 |

Neighbors at weight >= 3: SUP-LIFE (5), AP-AUTO (4), CLM (4), SMP (3).

**Pairwise reconciliation is structurally blocked by M1.** With zero S2P modules, every cross-domain handoff carries `source_domain_module_id=NULL` (outbound) or `target_domain_module_id=NULL` (inbound). Section 1 (fully wired): 0 rows for any pair. Section 2 (NULL FK PATCH candidates): every outbound handoff; PATCH only resolvable once S2P has modules. Section 3 (missing handoffs): cannot be derived without DMDO coverage on the S2P side. Section 4 (boundary integrity): zero issues found in the cursory pass (consumer DMDO rows on `suppliers` etc. are accounted for legacy-side). Section 5 (cross-domain relationships): the relationship rows for sourcing_events to legal_contracts and legal_contracts to purchase_orders are present; the goods_receipts to supplier_invoices three-way-match relationship is implicit through the `flows_into` row on contingent_invoices but the direct `goods_receipts confirms supplier_invoices` (or similar) is missing.

| ID | Pair | Finding | Fix |
|---|---|---|---|
| B1-N1 | SUP-LIFE | All 5 outbound + 3 inbound handoffs carry NULL module FKs on the S2P side. Section 2 PATCH candidates blocked by M1. | Re-run pairwise after M1 + DMDO re-anchor. |
| B1-N2 | AP-AUTO | All 3 outbound + 1 inbound carry NULL on S2P side. Section 5: missing `goods_receipts to supplier_invoices` three-way-match relationship row. | Author the missing relationship; PATCH attribution after M1. |
| B1-N3 | CLM | 2 outbound + 2 inbound; CLM side already carries `source_domain_module_id=127` (CLM-REPOSITORY) on inbound handoffs 40 + 41 + 215. The S2P side is NULL on all 4. | PATCH after M1. |
| B1-N4 | SMP | 1 outbound + 2 inbound; SMP side carries source / target module attribution (modules 30, 31). S2P side NULL on all 3. | PATCH after M1. |

### Bucket 2, Surface-for-user (judgment calls)

1. **Module split decision (the headline question).** Proposed S2P module set, based on the vendor surface and the existing master / capability footprint:
   - `S2P-SOURCING` (masters: `sourcing_events`; capability: `S2P-SOURCING`; ~SAP Ariba Sourcing / Coupa Sourcing). RFx, auctions, bid evaluation, award.
   - `S2P-REQ-TO-PO` (masters: `purchase_requisitions`, `purchase_orders`; capability: `S2P-REQ-TO-PO`; ~Ariba Buying, Coupa Procure). Requisition entry, approval, PO creation, change orders.
   - `S2P-RECEIVING` (masters: `goods_receipts`; capability: `S2P-RECEIVING`; ~Ariba Receiving, Coupa Receiving). GR posting, three-way match readiness.
   - `S2P-INVOICE-MATCHING` (masters: `supplier_invoices`; capability: `S2P-INVOICE-MATCHING`; ~Ariba Invoice, Basware). Supplier invoice ingestion, three-way match, exception routing. **(Boundary question with AP-AUTO: AP-AUTO already exists as a separate domain. Decide: does S2P own the invoice-matching policy and hand-off to AP-AUTO at `invoice.approved`, or does AP-AUTO absorb the matching and S2P stops at GR? Today the split is muddy.)**
   - `S2P-CATALOG-MGMT` (no current master, would master `procurement_catalogs` / `catalog_items`; capability: `S2P-CATALOG-MGMT`). Punch-out catalog management, hosted catalogs, item-master integration.
   - **Question:** approve the 5-module split, propose alternative shape, or defer Phase A re-load? **Dependency:** Bucket 1 A2 capability authoring depends on this answer.

2. **`Jaggaer ONE` duplicate (`solutions` id 129 vs id 518).** Two rows differing only in casing of "Jaggaer" vs "JAGGAER". Decide: keep id 129 (older, lowercase form), or keep id 518 (newer ALL-CAPS form matching the vendor's current marketing), or merge under a hand-picked form. Then DELETE the loser and re-point its `solution_domains` row. **Independent.**

3. **`catalog_tagline` + `catalog_description` proposed drafts (Rule #20 backfill).** Surface for user review before write:
   - Proposed `catalog_tagline`: *"Run procurement end to end: source suppliers, raise requisitions, issue POs, receive goods, and match invoices in one workflow."*
   - Proposed `catalog_description` paragraph 1: *"S2P (Source-to-Pay) is the operational backbone of corporate buying. From the first RFx through final invoice payment, S2P tracks the requisition, the purchase order, the goods receipt, and the supplier invoice as a single chain of business records, with controls (approvals, three-way match, savings tracking) layered on top. The market is dominated by suite vendors (SAP Ariba, Coupa, Oracle Procurement Cloud, Ivalua) and specialists (JAGGAER, Tradeshift, Basware)."*
   - Proposed `catalog_description` paragraph 2: *"Buyers run requisitions through approval workflows, sourcing managers run RFx events and award contracts, receivers post goods receipts against open POs, and AP specialists match invoices to POs and receipts before releasing payment. Spend categories drive routing (direct, indirect, services, tail), and savings against negotiated contract prices are tracked at line-item granularity."*
   - **Question:** approve text as-is, request edits, or defer? **Independent.**

4. **F7 channel-vs-capability question for the re-authored per-module skills.** The current legacy skill links `send_email` (`platform`) without justification. Per the abstraction rule, the default replacement is `notify_person` / `notify_team`. But in S2P specifically, supplier-facing PO dispatch is often email-as-contract (the PO email IS the order to the supplier in many B2B flows). **Question:** keep `send_email` on the `S2P-REQ-TO-PO` skill with a workflow-specific justification ("PO dispatch email is the supplier-facing contract artifact"), or move to `notify_person` and let the deployment pick the channel? Same question applies to invoice receipt confirmations on `S2P-INVOICE-MATCHING`. **Independent.**

5. **`supplier_invoices` pattern flag refinement.** `has_personal_content=false` is correct (B2B invoices), but consider: in jurisdictions with mandatory e-invoicing (Italy SdI, France Chorus, Mexico CFDI), the invoice IS a regulated document with personal data on it (the supplier's tax id + legal address). **Question:** does the catalog treat tax-personal data the same as employee-personal-data for the `has_personal_content` flag, or only the latter? **Independent.** (Editorial note: leans no, but worth confirming.)

6. **Pairwise reconciliation timing.** The four weight->=3 neighbors (SUP-LIFE, AP-AUTO, CLM, SMP) all have structural reconciliation work waiting on M1. **Question:** wait for the M1 fix-load to land and re-run pairwise inline, or schedule pairwise as separate Validate runs on each neighbor after S2P is modularized? **Independent.**

### Bucket 3, Phase 0 pending (speculative)

1. **`procurement_catalogs` + `catalog_items` masters** (proposed home: `S2P-CATALOG-MGMT` module). Vendor evidence: SAP Ariba Catalog, Coupa Catalog, Jaggaer Catalog all master both entities; punch-out and hosted catalog are standard surfaces. Verification path: confirm against Ariba's `CatalogMaster` API and Coupa's catalog API endpoints. Recommended: Phase 0 vendor research to enumerate the entity surface (catalog versions, item attributes, supplier-content vs buyer-content, item-master sync to ERP) before authoring.

### Cross-bucket dependencies

- **Bucket 1 (most items) <- Bucket 2 #1.** M1 / M2 / M4 / M5 / M6 / B10b / E1 / F2 / F3 / F5 / B9b / pairwise reconciliation all depend on the module-split decision in Bucket 2 #1. Until the user picks the module shape, the Bucket 1 fixes are blocked at a structural gate.
- **Bucket 1 B1-A2 <- Bucket 2 #1.** Capability authoring depends on which modules each capability realizes.
- **Bucket 3 #1 <- Bucket 2 #1.** Whether `procurement_catalogs` becomes a master in `S2P-CATALOG-MGMT` depends on whether that module is approved.
- Bucket 2 #2 (Jaggaer duplicate), #3 (catalog UX text), #5 (e-invoice personal data), #6 (pairwise timing) are **independent** of each other and of Bucket 3.
- Bucket 2 #4 (F7 channel question) depends on Bucket 2 #1 (per-module skill targets must exist before deciding what channels each links).

### Per-bucket prompts

- **After Bucket 1:** *"21 in-scope structural / boundary / APQC findings. The headline is M1: S2P has zero modules. Approve the proposed 5-module split in Bucket 2 #1 first (it unblocks 13 of the 21 Bucket 1 items). Then: fix all remaining Bucket 1 items now? Reply 'all', 'just N, M, K', or 'defer'."*
- **After Bucket 2:** *"Six judgment-call questions. The headline (#1) gates most of Bucket 1. Please answer each: (1) approve the 5-module split, propose alternative, or defer; (2) keep Jaggaer id 129 or 518; (3) approve catalog UX drafts as-is or request edits; (4) `send_email` keep-or-replace decision; (5) e-invoice personal-data flag; (6) pairwise timing."*
- **After Bucket 3:** *"One Phase 0 candidate: `procurement_catalogs` + `catalog_items` masters for a possible `S2P-CATALOG-MGMT` module. Vet via Phase 0 research, or eyeball-mode (you name whether to load directly)?"*

### Report-only follow-ups (owed by other domains)

- **SUP-LIFE / MDM B1 / M7 conflict on `suppliers` (id 206).** Both SUP-LIFE (id 28) and MDM (id 87) carry a legacy `domain_data_objects.role='master'` row for `suppliers`. The catalog can only have one canonical master per data_object. Surface for the next SUP-LIFE or MDM audit; the user picks which domain owns canonical mastery, the other demotes to `embedded_master`. (S2P consumes `suppliers`, does not master it; resolves from S2P's perspective independently of this conflict.)
- **AGENCY-MGMT B10b owes target attribution on inbound handoff 347** (`vendor_invoice.received`, payload `contingent_invoices` id 191). AGENCY-MGMT's audit (or VMS's, since VMS canonically masters `contingent_invoices` id 191) owes the target-side module FK on this handoff once their modules exist.
- **CLM B9 owes mid-stream PO-creation event acknowledgement.** Handoffs 40 + 41 fire from CLM (`legal_contract.signed` / `sourcing.contract_drafted`) into S2P. Once S2P modularizes, the CLM side should carry `target_domain_module_id=<S2P-REQ-TO-PO>`. CLM already carries source attribution (module 127); the target attribution is owed by S2P's M1 fix (in-scope), but the verification of the CLM-side wiring is a CLM-audit concern.
- **SMP B9 wiring (handoffs 39, 45) source-side reads as `shadow_app.requires_sanctioning` and `seat_demand.exceeded`** firing from SMP modules 30 + 31 into S2P. Both carry valid `source_domain_module_id`. The S2P-side target attribution is in-scope (B1-N4). The verification of whether these are the right SMP source modules is an SMP-audit concern.
- **INV-MGMT / PLM / HAM / SAM / FINOPS B10b inbound source-side attribution.** Inbound handoffs 1050 (INV-MGMT), 1089 (PLM), 668 + 669 (HAM), 636 (SAM), 198 (FINOPS) into S2P. All carry NULL source-side module FK except 1089 (`engineering_change_order.released` carries source_domain_module_id=66). When each of those domains is next audited, their outbound source-side attribution should be PATCHed.
- **PSA B10b on inbound handoff 132** (`service_project.staffing_required`, payload `purchase_requisitions`). PSA module 86 is already the source; S2P side target attribution is in-scope (B1-N4 / M1 cascade).
- **MWO/FSM B10b on inbound handoff 117** (`pm_work_order.invoiced`, payload `contingent_invoices`). MWO side carries `source_domain_id=64` but no module FK; owes attribution at MWO's next audit.

### Candidate domains queued

- `TAIL-SPEND-MGMT` (Tail Spend Management), queued via `scripts/analytics/append_missing_domain.ts`. Specialist market separate from broad S2P (Fairmarkit, Globality, ORO Labs, Una, Vroozi). Adjacencies: S2P, SPEND-MGMT, SUP-LIFE.

## 2026-05-31, Continuation: B1 technical fixes

Loader: [`.tmp_deploy/fix_s2p_b1_technical_2026_05_31.ts`](../.tmp_deploy/fix_s2p_b1_technical_2026_05_31.ts).

### Applied (25 writes)

- **B1-S13 (B7), 6 INSERTs into `data_object_relationships`** (Rule #10 user-edges). All six audit-pre-specified actor roles authored, including the two distinct actors on `purchase_orders` (approver + buyer, mirroring the hardware_assets precedent at rows 256 + 257):
  - users `requests purchase requisitions` -> 72
  - users `approves purchase orders` -> 73
  - users `places purchase orders` -> 73
  - users `posts goods receipts` -> 74
  - users `processes supplier invoices` -> 75
  - users `manages sourcing events` -> 71
- **B1-S18 (B12), 1 PATCH** on `data_object_lifecycle_states` id 427 (`sourcing_events.awarded`): `permission_verb_override` `award_event` -> `award_sourcing_event`.
- **B1-B2, 1 PATCH** on `data_object_relationships` id 715 (`supplier_invoices` -> `expense_reports`): `relationship_verb` `reimbursed via invoice` -> `reimburses_via`.
- **B1-H1, 17 INSERTs into `handoff_processes`** (`proposal_source='agent_curated'`, `role='implements'`). All 17 audit-pre-specified (handoff_id, process_id) pairs with PCFs verified live (315, 165, 167, 793, 805, 808, 809, 811, 1437). New rows ids 792-808.

### Skipped during apply (idempotency / verification)

- B1-H1 audit candidates already present, exact-pair match: handoff 583 -> process 811 (row 159, `discovery_substring`); handoff 546 -> process 805 (row 738, `agent_curated`). Both left untouched.
- B1-H1 audit explicit DEFER: handoff 1089 (`engineering_change_order.released`, no clean L4 PCF). Not in this load.

### Deferred from B1 (out of technical scope)

Gated on M1 module-split (Bucket 2 #1), or judgment, or out-of-scope categories per the technical-fix procedure:

- **Module / structural (gated on Bucket 2 #1):** B1-S1, B1-S2, B1-M1, B1-M2, B1-M4, B1-M5, B1-M6, B1-M7, B1-S3, B1-S15 (B9b), B1-S16 (B10b), B1-S4 (E1), B1-S5 (F1), B1-S6 (F2), B1-S8 (F7), B1-N1..B1-N4. All require new `domain_modules` rows before any FK PATCH or per-module skill / role authoring can proceed.
- **New capabilities (gated on Bucket 2 #1):** B1-A2 (5..8 new `capabilities` + `capability_domains` rows).
- **User-pick judgment:** B1-A3 (Jaggaer duplicate DELETE: user picks survivor id 129 vs 518, Bucket 2 #2).
- **Catalog UX text (Rule #20 backfill, defer per prompt):** B1-A4 (`catalog_tagline` + `catalog_description`).
- **Pattern flag flips (defer per prompt):** B1-S11 (B4) on `purchase_orders` + `sourcing_events` `has_submit_lock`.
- **Cross-master relationship (surface for user per audit text):** B1-S12 (B6) `purchase_requisitions` `becomes` `purchase_order` edge. Not a Rule #10 user-edge.
- **Bulk aliases without exact tuples (defer per prompt):** B1-S17 (B11) ~15 `data_object_aliases`. Audit gives counts + vendor examples; not exact (alias_name, data_object_id) tuples.
- **PASS / informational (no fix needed):** B1-A1, B1-S7 (F4), B1-S9 (B2), B1-S10 (B3), B1-S14 (B9), B1-B1.

### JWT-audience errors

None. Tenant `ma@adenin.com` throughout.

## 2026-05-31, Audit

### Summary

- Re-audit of S2P after the 2026-05-31 B1 technical continuation load. The technical-scope fixes from that run (6 user-edge `data_object_relationships`, 1 `sourcing_events.awarded` verb PATCH, 1 `reimburses_via` verb PATCH, 17 `handoff_processes` rows) are confirmed present and not re-flagged below.
- **Structural footprint unchanged from the 2026-05-30 run.** Zero `domain_modules`. Zero `domain_module_data_objects`. Zero `domain_module_capabilities`. Five masters (`sourcing_events`, `purchase_requisitions`, `purchase_orders`, `goods_receipts`, `supplier_invoices`) + 2 contributors + 2 consumers + 1 embedded_master still recorded only in legacy `domain_data_objects`. One capability (`APPROVAL-WORKFLOW`, cross-cutting). 11 `solution_domains` (9 primary, 2 secondary). 5 regulations. 12 outbound handoffs (170, 347, 565, 581, 582, 583, 584, 585, 586, 602, 40, 42). 17 inbound handoffs (1050, 45, 117, 127, 132, 198, 545, 546, 548, 560, 636, 668, 669, 215, 41, 39, 1089). 29 cross-domain handoffs total. One legacy domain-level system skill (id 22, `s2p-system`) with 14 `skill_tools`. Zero `roles` linked (the 3 Procurement-function roles in the catalog, `PROCUREMENT-NEGOTIATOR`, `PROCUREMENT-PIM-SUPPLIER-LIAISON`, `PROCUREMENT-SAAS-RENEWAL-OWNER`, touch CLM, MDM, SMP modules; none touch any S2P module because none exist).
- **Headline unchanged.** M1 fail (zero `domain_modules`) cascades into M2 / M4 / M5 / M6 / B9b / B10b / E1 / E2 / E3 / E4 / E5 / F2 / F3 / F5 / pairwise reconciliation. The 5-module split proposed in the 2026-05-30 history.md Bucket 2 #1 (`S2P-SOURCING`, `S2P-REQ-TO-PO`, `S2P-RECEIVING`, `S2P-INVOICE-MATCHING`, `S2P-CATALOG-MGMT`) remains the proposed unblocker but is still awaiting user decision.
- **Vendor evidence basis** (carried forward; same flagship set since no module structure changed): SAP Ariba, Coupa Business Spend Management, Oracle Procurement Cloud (via Workday Spend / NetSuite), Ivalua Platform, JAGGAER ONE, Tradeshift, Basware AP Automation.
- Bucket 1 (in-scope, agent fixable): 5 items (4 PASS confirmations not surfaced; 5 still-open technical/content fixes).
- Bucket 2 (surface-for-user, judgment): 6 items (5 carried forward, 1 unchanged).
- Bucket 3 (Phase 0 pending, speculative): 1 item (carried forward).
- **H1 coverage check**: 29 / 29 cross-domain handoffs have at least one `handoff_processes` row (1 explicit DEFER on handoff 1089 was logged in prior audit; live state shows it tagged at process_id 588). 0 rows at `record_status='approved'`. Headline catalog-quality measure is 0 approved tags; provenance side-bar is 23 `agent_curated` + 6 `discovery_*` (substring / override). H1 coverage gate satisfied; review queue is the gap.

### Vendor surface basis

Carried forward from 2026-05-30 (no module-set additions or splits since). The agent-curated flagship set remains: SAP Ariba (Sourcing / Buying / Invoice / Catalog), Coupa Business Spend Management (Sourcing / Procure / Receiving / Invoice / Catalog), Oracle Procurement Cloud, Ivalua Platform, JAGGAER ONE, Tradeshift (network), Basware (AP / e-invoice). Compliance-specialist coverage is satisfied via the Tradeshift / SAP / Coupa e-invoice surfaces against the 5 EU regulations linked (SOX, EU VAT Directive, Eco-design Sustainable Products, EU Battery Regulation, Carbon Border Adjustment Mechanism).

### S-band structural sweep

| Table | FK column | S2P rows | Expected non-zero | Status |
|---|---|---|---|---|
| `business_function_domains` | `domain_id` | 2 | yes | PASS |
| `capability_domains` | `domain_id` | 1 | yes (>=3 typical) | THIN, routes to A2 |
| `domain_data_objects` | `domain_id` | 10 | yes | PASS |
| `domain_modules` | `domain_id` | 0 | yes | FAIL, routes to M1 |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero | PASS |
| `solution_domains` | `domain_id` | 11 | yes | PASS |
| `handoffs.source_domain_id` | `domain_id` | 12 | yes | PASS |
| `handoffs.target_domain_id` | `domain_id` | 17 | yes | PASS |
| `domain_regulations` | `domain_id` | 5 | yes | PASS |
| `skills.domain_id` | `domain_id` | 1 (legacy) | F2 wants 1 per module | FAIL, routes to F2 (vacuous at module_count=0) |

S2: cannot run (zero modules). S3 per-master (5 masters): all carry lifecycle states (sourcing_events 6, purchase_requisitions 7, purchase_orders 7, goods_receipts 4, supplier_invoices 6 = 30 rows) + trigger events (sourcing_events 2, purchase_requisitions 0, purchase_orders 4, goods_receipts 2, supplier_invoices 4 = 12 rows). Zero aliases on every master. Per-master coverage:

| data_object | states | events | aliases |
|---|---|---|---|
| sourcing_events | 6 | 2 | 0 |
| purchase_requisitions | 7 | 0 | 0 |
| purchase_orders | 7 | 4 | 0 |
| goods_receipts | 4 | 2 | 0 |
| supplier_invoices | 6 | 4 | 0 |

`purchase_requisitions` has zero trigger events even though states `approved`, `po_created`, `closed`, `rejected`, `cancelled` are all published verb shapes. Likely B9 gap: the `purchase_requisition.submitted` / `.approved` events that fire toward `S2P-REQ-TO-PO` lifecycle progression are absent.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (carried-forward, gated on Bucket 2 #1)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-M1 | M1 | Zero `domain_modules` rows for `domain_id=27`. Hard structural fail. Confirmed unchanged from 2026-05-30. | Author the proposed 5-module set (Bucket 2 #1) and load via a focused Phase M loader. |

All other M / E / F structural gaps (M2, M4, M5, M6, M7-within-S2P, B9b, B10b, E1-E5, F2, F3, F5) are derivative of M1: they cannot be evaluated meaningfully while modules are zero. They are tracked in `state.yaml` as `b1b` (blocked) under `B1B-S2P-MODULE-SPLIT`, not duplicated as separate Bucket 1 items here.

#### Still-open technical/content fixes (Bucket 1)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-A2 | A2 | `capability_domains` has 1 row (`APPROVAL-WORKFLOW`). Rule #14 expects 5 to 8 market-specific capabilities. | Author 5 to 8 `capabilities` + `capability_domains` rows (e.g. `S2P-SOURCING`, `S2P-REQ-TO-PO`, `S2P-RECEIVING`, `S2P-INVOICE-MATCHING`, `S2P-CATALOG-MGMT`, `S2P-SAVINGS-TRACKING`). Gated on Bucket 2 #1 module-shape decision. |
| B1-S11 | B4 | Pattern flags partially considered: `purchase_orders` likely needs `has_submit_lock=true` once issued; `sourcing_events` likely needs `has_submit_lock=true` once published. Carried forward from 2026-05-30. | Surface to user for confirmation; PATCH `data_objects.has_submit_lock=true` on ids 71, 73 on approval. |
| B1-S12 | B6 | Direct `purchase_requisitions becomes purchase_order` intra-master relationship absent. Today the link is mediated through `legal_contracts` rows 502 + 503. Confirmed via `data_object_relationships?and=(data_object_id.eq.72,related_data_object_id.eq.73)` returning empty. | Surface to user; on approval INSERT `data_object_relationships` row (verb `becomes` / inverse `originates_from`, one_to_many, owner_side=source, is_required=false). |
| B1-S17 | B11 | Zero `data_object_aliases` rows on any of the 5 masters. Carried forward; vendor-term coverage authoring still owed. | Author ~15 alias rows per Phase B; bundle into cluster-drafts. |
| B1-N2-REL | Section 5 | Cross-domain `data_object_relationships`: direct `goods_receipts confirms supplier_invoices` three-way-match relationship row still missing (the link is mediated via `contingent_invoices flows_into supplier_invoices` row 536). Same finding as 2026-05-30 B1-N2 Section 5. | Author the row on approval; verb `confirms` / inverse `confirmed_by`, one_to_many, owner_side=source. |

#### PASS confirmations (re-verified live, no fix needed)

- B1-A1 (A1): `domains.crud_percentage=78`, `cost_band=$$$$`, `min_org_size=30 m <2500`, `usa_market_size_usd_m=7000`, `market_size_source_year=2025`, `business_logic` non-empty, `certification_required=false`. PASS.
- B1-S13 (B7): All 6 user-edge `data_object_relationships` rows (1924 to 1929) present. PASS.
- B1-S18 (B12): `data_object_lifecycle_states` id 427 (`sourcing_events.awarded`) verb override `award_sourcing_event` present. PASS.
- B1-B2: `data_object_relationships` id 715 verb `reimburses_via` present. PASS.

#### APQC TAGGING (H1)

29 / 29 cross-domain handoffs covered. The 17 INSERTs from the 2026-05-31 technical-fixes load are live: handoff_processes row coverage spans handoffs 347 (315, 1433), 565 (165, 804), 583 (811), 584 (315), 585 (315), 586 (167, 816), 117 (315), 198 (315, 1132), 545 (813, 1437), 546 (805), 548 (805, 815), 560 (793), 636 (809), 668 (808), 669 (808), 39 (808), 45 (808), 1050 (811), 132 (808, 569), 40 (163), 41 (203), 42 (53), 127 (167), 170 (1010), 215 (156), 581 (811), 582 (811), 602 (163), 1089 (588). No untagged outbound or inbound rows remain.

Headline catalog-quality measure: 0 / 29 at `record_status='approved'`. Process side-bar: 23 `agent_curated` + 6 `discovery_*`. Open Bucket 2 item is whether the user wants to approve any of these; the audit produces no new tags this pass.

### Bucket 2, Surface-for-user (judgment calls)

Five of the six judgment-call questions from the 2026-05-30 audit remain open (carried forward verbatim by reference). One new H1 review-queue question is added.

1. **Module split decision** (carried forward from 2026-05-30 Bucket 2 #1). Proposed 5-module split: `S2P-SOURCING`, `S2P-REQ-TO-PO`, `S2P-RECEIVING`, `S2P-INVOICE-MATCHING`, `S2P-CATALOG-MGMT`. Boundary question with AP-AUTO on invoice-matching ownership remains open. **Gates: Bucket 1 B1-A2 + all `b1b` blocked items.**
2. **`Jaggaer ONE` duplicate** (`solutions` id 129 vs id 518). Both rows still present in live `solution_domains` queries. Decide survivor. Independent.
3. **`catalog_tagline` + `catalog_description` drafts** (Rule #20 backfill). Both still empty (`catalog_tagline=""`, `catalog_description=""` confirmed). Drafts proposed in 2026-05-30 Bucket 2 #3 remain available for review. Independent.
4. **F7 `send_email` channel decision** for re-authored per-module skills. Same question as 2026-05-30 Bucket 2 #4. Gated on Bucket 2 #1 (module-set decision determines per-module skill targets).
5. **`supplier_invoices.has_personal_content` for jurisdictions with mandatory e-invoicing.** Same as 2026-05-30 Bucket 2 #5. Independent.
6. **Pairwise reconciliation timing.** Same as 2026-05-30 Bucket 2 #6. Independent.
7. **H1 review-queue (new).** 29 `handoff_processes` rows on S2P handoffs sit at `record_status='new'`. The audit headline number is the approved count (0). **Question:** does the user want to sweep-approve the 17 `agent_curated` rows the 2026-05-31 technical fix loaded, leave them for normal review, or surgically approve a subset? Independent of all other items.

### Bucket 3, Phase 0 pending (speculative)

1. **`procurement_catalogs` + `catalog_items` masters** (carried forward from 2026-05-30 Bucket 3 #1). Proposed home: a possible `S2P-CATALOG-MGMT` module. Vendor evidence: SAP Ariba Catalog, Coupa Catalog, Jaggaer Catalog. Verification path: Ariba `CatalogMaster` API + Coupa catalog API. **Gated on Bucket 2 #1** (whether `S2P-CATALOG-MGMT` is approved as a module determines whether to vet).

### Cross-bucket dependencies

- **Most `b1b` blocked items + B1-A2 + Bucket 3 #1 <- Bucket 2 #1** (module-split decision). Same gate structure as the 2026-05-30 audit.
- **Bucket 2 #4 <- Bucket 2 #1** (per-module skill targets must exist).
- Bucket 2 #2 / #3 / #5 / #6 / #7 are mutually independent and independent of #1.

### Per-bucket prompts

- **After Bucket 1:** *"5 still-open in-scope items (B1-A2, B1-S11, B1-S12, B1-S17, B1-N2-REL). B1-A2 is gated on the module-split decision; the other 4 are agent-actionable on user confirmation of pattern flags / cluster-drafts. Fix the non-gated 4 now? Reply 'all', 'just B1-S11, B1-S12, B1-N2-REL', or 'defer'."*
- **After Bucket 2:** *"Seven judgment-call questions. #1 still gates the bulk of structural fixes. Please answer each: (1) approve 5-module split or alternative; (2) Jaggaer survivor; (3) catalog UX drafts; (4) `send_email` keep-or-replace; (5) e-invoice personal-data flag; (6) pairwise timing; (7) H1 approval-sweep decision."*
- **After Bucket 3:** *"One Phase 0 candidate (procurement catalogs). Vet via Phase 0 research, or eyeball-mode? Gated on Bucket 2 #1."*

### Report-only follow-ups (owed by other domains)

Carried forward from 2026-05-30 (none of these resolved in the technical fix pass since each is owed by a sibling domain's audit):

- **SUP-LIFE / MDM B1 / M7 conflict on `suppliers`** (id 206). Still two legacy `domain_data_objects.role='master'` rows. Surface for SUP-LIFE or MDM audit.
- **AGENCY-MGMT B10b** owes target attribution on inbound handoff 347 (`vendor_invoice.received`, payload `contingent_invoices`).
- **CLM B9 / B10b** owes target attribution on outbound handoffs 40 + 41 + 215 (`legal_contract.signed` etc.) once S2P modularizes; CLM source attribution already present (module 127).
- **SMP B9 / B10b** on handoffs 39 + 45 (`shadow_app.requires_sanctioning`, `seat_demand.exceeded`). SMP source attribution present (modules 30 + 31); S2P target NULL pending M1.
- **INV-MGMT / PLM / HAM / SAM / FINOPS B10b** inbound source-side attribution. Handoffs 1050, 1089, 668, 669, 636, 198 mostly carry NULL source FK (1089 is the exception, source_domain_module_id=66 present).
- **PSA B10b** on handoff 132 (`service_project.staffing_required`). PSA source attribution present (module 86); S2P target NULL pending M1.
- **MWO / FSM B10b** on handoff 117 (`pm_work_order.invoiced`). MWO source attribution NULL.

### JWT-audience errors

None. Tenant `ma@adenin.com` throughout.

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

Loader: [`.tmp_deploy/fix_s2p_state_execute_2026_06_07.ts`](../../.tmp_deploy/fix_s2p_state_execute_2026_06_07.ts).

### Summary

State-driven Validate (Rule #21) over the open S2P `state.yaml` items only; no fresh from-scratch
audit. Each recorded item was re-verified live, then classified EXECUTE / SURFACE / LEAVE.
Tenant `ma@adenin.com` throughout; no JWT-audience errors. All writes landed at
`record_status='new'`; idempotent re-run skipped every row (0 across the board). The domain
remains UNBUILT (0 `domain_modules`); the build itself is the b2 module-split decision and was
not scaffolded.

### Executed (36 writes)

- **entity_type (B13 / Rule #12), 5 PATCH** on `data_objects`: all 5 masters `unclassified` ->
  `operational_workflow` (each carries a multi-state lifecycle, so the classification is
  deterministic). ids 71 sourcing_events, 72 purchase_requisitions, 73 purchase_orders,
  74 goods_receipts, 75 supplier_invoices.
- **Catalog UX (Rule #20), 2 fields** on `domains` id 27: authored `catalog_tagline` +
  `catalog_description` (both were empty) in buyer voice, workflow + value, no vendor/product names
  (Rule #18), American English, no em-dash. This resolves and retires the stale B1B-CATALOG-UX /
  B2-CATALOG-UX surface-before-write gate.
- **Aliases (B1A-ALIASES / B11), 16 INSERT** into `data_object_aliases` (`alias_type='synonym'`),
  generic procurement terms + standard abbreviations only (RFP/RFI/RFQ/Reverse Auction/Sourcing
  Event on 71; PR/Purchase Request/Requisition on 72; PO/Purchase Order on 73; GR/Goods Receipt
  Note/GRN on 74; Supplier Invoice/Vendor Invoice/AP Invoice on 75). No vendor product names used
  as alias values.
- **trigger_event category backfill, 7 PATCH** on `trigger_events` (filled EMPTY `event_category`
  on S2P-owned events): 588 sourcing_event.launched, 589 sourcing_event.awarded, 590
  purchase_order.issued, 591 purchase_order.changed, 592 purchase_order.closed, 593
  goods_receipt.posted -> `state_change`; 594 goods_receipt.quantity_variance -> `signal`.
- **B1A-PR-EVENTS, 4 INSERT** into `trigger_events` (data_object_id=72): purchase_requisition
  .submitted / .approved / .po_created / .rejected, all `event_category='state_change'`.
- **B1A-PR-PO-RELATION + B1A-GR-INV-RELATION, 2 INSERT** into `data_object_relationships`:
  purchase_requisitions `becomes` purchase_orders (72->73, id 2107) and goods_receipts `confirms`
  supplier_invoices (74->75, id 2108); both one_to_many, owner_side=source, is_required=false.

### Surfaced (no write; returned to user)

- **B2-MODULE-SPLIT** (headline; UNBUILT domain build decision; gates the whole b1b cascade).
- **B2-JAGGAER** (destructive DELETE of duplicate Jaggaer ONE solutions row 129 vs 518).
- **B2-PATTERN-FLAGS** (was B1A-PATTERN-FLAGS): flip `has_submit_lock=true` on purchase_orders 73
  and sourcing_events 71 is a judgment flip of an already-set boolean, surfaced not auto-applied.
- **B2-SEND-EMAIL** (F7 channel decision, gated on the split).
- **B2-EINVOICE-PII** (tax-personal-data flag on supplier_invoices).
- **B2-PAIRWISE-TIMING** (when to run pairwise reconciliation vs the >=3-weight neighbors).
- **B2-H1-APPROVAL** (approve agent_curated handoff_processes; flipping to approved is destructive).
- Personas / RACI: deferred (B1A-PHASE-P not authored). Candidate personas would map to the
  Procurement function roles once modules exist; cannot be authored on an unbuilt domain.

### Left (untouched)

- **b1b** all blocked on B2-MODULE-SPLIT (B1B-S2P-MODULE-SPLIT, B1B-A2-CAPABILITIES) or B2-JAGGAER
  (B1B-JAGGAER-DEDUP). B1B-CATALOG-UX dropped (executed above).
- **b3** B3-CATALOGS (procurement_catalogs + catalog_items) parked, gated on the split.
- **Skill-grain items** governed by the 2026-06-06 supersession header (per-module system skill /
  skill_tools / legacy skill 22 retirement): reframed as a note; no skill_tools work owed.
- **H1 coverage**: 29/29 cross-domain handoffs already tagged (36 handoff_processes rows live); no
  untagged handoff with a clean PCF remained, so no new agent_curated inserts were owed this pass.
- **business_function_domains (C1)**: already satisfied (owner Procurement fn 19, contributor
  Finance fn 4); no write needed.

### Post-fix status

`next_action_by: user`. All agent-doable additive/corrective work is executed at
`record_status='new'`. S2P is now waiting on the user for the module-split build decision plus the
surfaced judgment / destructive items above.
