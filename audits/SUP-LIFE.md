---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 23
---

# SUP-LIFE, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules`** (the M-band hard fail that dominates this audit), 0 cross-cutting hosted modules, 0 `domain_module_data_objects` rows. Legacy `domain_data_objects` carries 6 master rows: `suppliers` (206), `supplier_onboardings` (207), `supplier_qualifications` (208), `supplier_scorecards` (209), `supplier_certifications` (498), `supplier_risk_assessments` (730). **0 capabilities** (`capability_domains` empty). 12 alias rows across 5 of the 6 masters (none on 730 wait, actually 730 has 2). 9 solutions linked (HICX primary; SAP Ariba, Coupa, Ivalua, Jaggaer, ServiceNow S2P Ops, Workday Spend / Financial Management, JAGGAER ONE duplicate as secondary). 12 SUP-LIFE-owned `trigger_events`. 10 outbound + 8 inbound cross-domain handoffs (18 cross-domain total). 0 intra-domain handoffs (vacuously fine: zero modules means no intra-domain surface to model). 0 `data_object_lifecycle_states` rows on any of the 6 masters. 1 legacy domain-level `system` skill (`sup-life-system`, id 109, `domain_module_id` NULL, an F1 legacy row) with 8 `skill_tools` rows. 0 SUP-LIFE-prefixed roles / 0 `role_modules` on SUP-LIFE (no SUP-LIFE modules to bind to). 2 regulations linked (6AMLD, Bank Secrecy Act, both `mandatory`). 9 intra-domain `data_object_relationships` between the 6 masters + 8 `users` edges + multiple cross-domain edges.
- **Vendor-surface basis (Pass 2 flagship enumeration, analyst knowledge, no subagent spawn per orchestrator instruction):** HICX Supplier Experience Platform (primary specialist, supplier portal + master + workflows), SAP Ariba SLP (Supplier Lifecycle and Performance), Coupa Supplier Information Management, Ivalua Supplier Management, Jaggaer Supplier Management, Workday Supplier Hub. Risk-overlay specialists: Sphera (riskmethods), Prewave, Resilinc, Interos, Sayari, Everstream Analytics. ESG specialist: EcoVadis. Diversity specialist: SupplierGATEWAY, Tealbook. KYC / sanctions overlay: LSEG World-Check, Refinitiv. Compliance specialist for due-diligence: Exiger, Dun and Bradstreet Compliance.
- **Bucket 1 (in-scope, agent fixable):** 12 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 5 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels (involving SUP-LIFE masters) | Weight | Pass shape |
|---|---|---|---|---|---|---|
| S2P (27) | 4 | 2 | 0 | 2 (suppliers enables sourcing_events; supplier_qualifications gates purchase_orders) | 8 | Pairwise (full) |
| AP-AUTO (29) | 4 | 1 | 0 | 2 (suppliers propagates bank change to payment_runs; invoice_matches signals supplier_scorecards) | 7 | Pairwise (full) |
| GRC (15) | 2 | 0 | 0 | 2 (escalates_to audit_issues from scorecards and risk assessments) | 4 | Pairwise (full) |
| AUDIT (16) | 1 | 0 | 0 | 2 (audit_findings updates suppliers; audit_engagements samples supplier_risk_assessments) | 3 | Pairwise (full) |
| ERP-FIN (65) | 1 | 0 | 0 | 1 (supplier_onboardings creates_vendor_master_in bank_accounts) | 2 | Lightweight |
| MDM (87) | 0 | 1 | 0 | 1 (supplier_golden_records resolves to suppliers) | 2 | Lightweight |
| ESG (21) | 0 | 1 | 0 | 1 (supplier_esg_assessments updates suppliers) | 2 | Lightweight |
| FOOD-TRACE (155) | 0 | 1 | 0 | 0 | 1 | Lightweight |
| VET-PRACT-MGMT (151) | 0 | 1 | 0 | 0 | 1 | Lightweight |
| VMS (64) | 0 | 1 | 0 | 1 (suppliers reconciles staffing_suppliers) | 2 | Lightweight |
| TPRM (19) | 0 | 0 | 0 | 0 inbound cross-domain handoff loaded yet | 0 | Discovery candidate |
| FSQM | 0 | 0 | 0 | (`supplier_certification.expired` fans out to FSQM per trigger description) | 0 | Discovery candidate |
| PIM (110) | 0 | 0 | 0 | 2 (pim_products sourced_from suppliers; suppliers submits product_compliance_declarations) | 2 | Lightweight |

**Structural pass bands.** A-band (domain metadata) PARTIAL FAIL: A1 hard-fail on `business_logic` (em-dash byte sequence 0xE2 0x80 0x94 at "rolls-ups, weighted ratings) U+2014 a calc layer over CRUD records" violates CLAUDE.md no-em-dash rule); A4 hard fail (both `catalog_tagline` and `catalog_description` empty); A2/A3 fine for solutions but A2 hard fail (zero `capability_domains` rows). **M-band (modules) HARD FAIL across the board: M1 fail (zero modules), M2 vacuously passes (M1 dominates), M4 vacuous (no capabilities anyway), M5/M6/M7 vacuous (no modules).** **B1 PASS** (6 masters under legacy `domain_data_objects`). **B2 PASS** (singular/plural set on all 6). **B3 PARTIAL**: `suppliers` is the only bare-word master with `is_canonical_bare_word=true` plus rationale; the other 5 are prefixed-correctly. **B4 hard fail**: every pattern flag (`has_personal_content`, `has_submit_lock`, `has_single_approver`) is `false` on all 6 masters; an audit MUST positively re-evaluate per Rule #12 (e.g. `supplier_qualifications.has_submit_lock` should likely be true once the qualification record is `approved`; `supplier_certifications.has_submit_lock` similar; `supplier_risk_assessments.has_single_approver` if a designated GRC reviewer approves). **B5 PASS** (no `embedded_master` rows in SUP-LIFE at all, vacuous). **B6 PASS** (9 intra-master relationships wire the 6 masters into a coherent graph rooted at `suppliers`). **B7 PASS** (8 `users` edges loaded per Rule #10). **B8 PARTIAL**: 5 outbound cross-domain relationship rows exist (`suppliers → bank_accounts` / `payment_runs` / `sourcing_events`; `supplier_onboardings → bank_accounts`; `supplier_qualifications → purchase_orders`; `supplier_certifications → supplier_qualifications`); inbound cross-domain rows exist (5 from MDM / ESG / AP-AUTO / FOOD-TRACE / VET-PRACT-MGMT / VMS / S2P / PIM / AUDIT). Some outbounds with no relationship: handoff 214 (supplier.risk_elevated to GRC) and 549 (risk_assessment.elevated to GRC) have no `data_object_relationships` row joining `supplier_scorecards` / `supplier_risk_assessments` to GRC's `audit_issues` (the existing 560 / 561 escalates_to audit_issues are intra-row but those audit_issues are 289 which is AUDIT, not GRC); B8 audit owes ~3 cross-domain edges. **B9 HARD FAIL**: 6 of 12 SUP-LIFE-owned trigger_events (`supplier_qualification.initiated/approved/rejected/expired`, `supplier_risk_assessment.completed/elevated`) carry empty `event_category` (Rule #13 enum violation; allowed values `lifecycle / state_change / threshold / signal`). The remaining 6 are populated. **B9b vacuously passes** (zero modules, no cross-module surface). **B10 (inbound report-only) PARTIAL**: 8 inbound handoffs cover MDM, ESG, S2P, AP-AUTO, VMS, VET-PRACT-MGMT, FOOD-TRACE; missing inbound: TPRM owes outbound on tprm assessments / risk findings (TPRM is the canonical owner of third-party risk, B10 report-only). **B10b HARD FAIL on the SUP-LIFE side and report-only on every counterparty**: ALL 18 cross-domain handoffs touching SUP-LIFE have NULL on the SUP-LIFE side (because SUP-LIFE has zero modules so there is nothing to point at). The counterparty side is mostly NULL too. Until M1 is fixed, B10b cannot be cured. **B11 PASS** (12 aliases across the 6 masters; every non-self-explanatory master has at least one). **B12 HARD FAIL across all 6 masters**: zero `data_object_lifecycle_states` rows. Every master ships qualifying / approval / scoring workflows (suppliers state machine of "prospect, qualified, approved, suspended, blocked", supplier_onboardings of "initiated, in-review, approved, rejected", supplier_qualifications of "draft, submitted, approved, expired, revoked", supplier_certifications of "valid, expiring, expired, revoked", supplier_risk_assessments of "scheduled, in-progress, completed, elevated", supplier_scorecards of "draft, periodic, finalized"). None are loaded. The B9 trigger events (e.g. `supplier_qualification.approved` 563, `supplier.approved` 131, `supplier_risk_assessment.elevated` 567) presuppose lifecycle states that do not exist. **C1 PASS** (3 `business_function_domains` rows, Procurement owner + Legal contributor + GRC contributor). **C2 vacuous** (no capabilities to override). **D1 not in scope as a standalone item.** **E-band HARD FAIL across the board** (zero SUP-LIFE roles + zero `role_modules` + zero `role_permissions`; M1 dominates: without modules there is no surface to bundle roles against). **F1 hard fail (legacy domain-level system skill 109 sits with `domain_module_id=null`).** **F2 vacuous** (zero modules). **F3 PASS in spirit** (the legacy skill has 8 `skill_tools`, but they all belong to a soon-to-retire skill row). **F4 PASS on the 8 linked tools** (4 queries with `data_object_id` set, 2 side_effects with `data_object_id` NULL, all invariants honored). **F5 uncomputable** (no modules to score). **F7 PARTIAL**: skill 109 links `send_email` (a channel primitive) without `skill_tools.notes` justification; per the channel-vs-capability rule this should be `notify_person` unless email IS the workflow (supplier portal communications might require email specifically, see B2-S5). **H1 PARTIAL**: 4 of 18 cross-domain handoffs carry `handoff_processes` rows, ALL `proposal_source='discovery_override'`, ALL `record_status='new'`. Zero `approved`, zero `agent_curated`. Volume expectation per H1 with N=18 cross-domain handoffs: 0.5N to 0.8N = 9 to 14 NEW `agent_curated` proposals. The audit proposes 14 (see Bucket 1 APQC TAGGING).

SUP-LIFE Semantius score (strict, today): **uncomputable** (F5 hard-fail because zero modules ⇒ zero system skills meeting Rule #17). Of the 8 `skill_tools` on the legacy skill 109, 7 are `coverage_tier='platform'` and 1 is `external` (`sign_document` for DocuSign-style supplier-contract signature). A post-M1 score would be approximately 88% strict on the legacy skill's surface; the actual Phase-S system skills authored against the new modules will rescore from scratch.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard fail, zero `domain_modules`** | SUP-LIFE has 6 legacy masters in `domain_data_objects` but zero `domain_modules` rows. Per Rule #14 every `domains` row MUST have at least one full module; per the per-domain checklist M1 is a structural gate that blocks every downstream check (B, C, D, E, F all depend on having modules to bind to). Proposed module set, informed by flagship-vendor surface practice (HICX, Ariba SLP, Coupa SIM, Ivalua, Jaggaer): (a) **SUP-LIFE-MASTER** mastering `suppliers` (the core supplier-record / supplier-portal surface), (b) **SUP-LIFE-ONBOARDING-QUAL** mastering `supplier_onboardings` + `supplier_qualifications` + `supplier_certifications` (the gating workflow set: KYC, banking, sanctions, ISO, SOC), (c) **SUP-LIFE-PERFORMANCE** mastering `supplier_scorecards` (the KPI roll-up surface), (d) **SUP-LIFE-RISK** mastering `supplier_risk_assessments` (the risk-overlay surface, distinct from TPRM's third-party-wide assessments). 4 modules satisfies Rule #14 floor; an alternative 3-module split folds SUP-LIFE-RISK into SUP-LIFE-PERFORMANCE, see B2-S1. | Hand-author 4 `domain_modules` rows + 4 `domain_module_data_objects` master rows + relevant embedded_master / consumer rows on the other modules. Phase A loader. |
| B1-S2 | **A2 hard fail, zero `capability_domains`** | `/capability_domains?domain_id=eq.28` returns empty. Pass criterion: at least 3 rows (typical 5 to 8). Proposed capability set: `SUP-LIFE-MASTER` (supplier master data and self-service portal), `SUP-LIFE-ONBOARDING` (supplier onboarding workflow), `SUP-LIFE-QUALIFICATION` (RFI / questionnaire / due diligence), `SUP-LIFE-CERTIFICATION-TRACKING` (cert expiry monitoring), `SUP-LIFE-PERFORMANCE` (scorecards, SLA monitoring), `SUP-LIFE-RISK-OVERLAY` (risk scoring, alerting), `SUP-LIFE-COMMS` (supplier portal communications), and the cross-cutting `KNOWLEDGE-MGMT` (supplier knowledge base, FAQs). | Phase A loader, 7 to 8 `capabilities` rows + matching `capability_domains` rows + `domain_module_capabilities` rows linking each capability to its realizing module. |
| B1-S3 | **A1 partial fail, em-dash in `domains.business_logic`** | The em-dash character U+2014 (byte sequence `342 200 224` confirmed via `od -c`) appears in `domains.business_logic`: "Supplier scorecard math (KPI roll-ups, weighted ratings) [U+2014] a calc layer over CRUD records." Per CLAUDE.md no em-dash rule, this is forbidden in any catalog text field. | PATCH `domains.business_logic` to replace the em-dash with a comma or semicolon: "Supplier scorecard math (KPI roll-ups, weighted ratings), a calc layer over CRUD records." |
| B1-S4 | **A4 hard fail, empty catalog_tagline and catalog_description** | Both columns are empty strings. Per Rule #20 backfill is allowed with user surface; the loader pre-flight surfaces drafts for user approval BEFORE writing. Draft tagline (buyer voice, workflow + value): "Onboard new suppliers, qualify them against your standards, and monitor performance and risk on one supplier record." Draft description (buyer voice, 1 to 3 paragraphs): paragraph 1, "Run supplier onboarding from invite through KYC, banking, tax, and sanctions checks. Capture insurance, ISO, and SOC certifications with automatic expiry alerts so renewals never lapse." Paragraph 2, "Score supplier performance against delivery, quality, and SLA targets. Roll KPIs into tiered scorecards your category managers and finance teams share." Paragraph 3, "Assess supplier risk on financial, ESG, cyber, and operational axes. Escalate elevated scores to GRC and procurement for re-qualification or replacement." | Per Rule #20, draft and surface to user BEFORE writing. This audit captures the proposed text; user approves verbatim or rewrites. |
| B1-S5 | **B9 hard fail, missing `event_category` on 6 trigger_events** | 6 of 12 SUP-LIFE-owned `trigger_events` have empty `event_category` (Rule #13 enum violation; allowed `lifecycle / state_change / threshold / signal`). Inventory: 562 `supplier_qualification.initiated` is `lifecycle`; 563 `supplier_qualification.approved` is `state_change`; 564 `supplier_qualification.rejected` is `state_change`; 565 `supplier_qualification.expired` is `threshold` (calendar/expiry trigger); 566 `supplier_risk_assessment.completed` is `lifecycle`; 567 `supplier_risk_assessment.elevated` is `threshold`. The remaining 6 (131, 132, 145, 173, 174, 352) are already populated. | PATCH 6 `trigger_events` rows to set `event_category` per the inventory. |
| B1-S6 | **B12 hard fail, zero lifecycle states on all 6 masters** | Every master ships a real workflow (per its trigger_events), but `data_object_lifecycle_states` is empty across all 6 data_object ids (206, 207, 208, 209, 498, 730). Proposed state machines (initial → terminal): `suppliers` (prospect, qualified, approved, suspended, blocked, archived), `supplier_onboardings` (initiated, in_review, approved, rejected, abandoned), `supplier_qualifications` (draft, submitted, approved, rejected, expired, revoked), `supplier_certifications` (valid, expiring_soon, expired, revoked), `supplier_risk_assessments` (scheduled, in_progress, completed, elevated, mitigated, accepted), `supplier_scorecards` (draft, in_period, finalized, disputed). Each state with `requires_permission=true` derives a workflow-gate permission once modules exist (per Rule #14 permission materialization). | Phase B loader, ~30 to 36 lifecycle state rows across the 6 masters, all anchored to the relevant module from B1-S1 once M1 is cured. |
| B1-S7 | **B4 hard fail, pattern-flag re-evaluation** | Per Rule #12 every master MUST be positively re-evaluated for `has_personal_content`, `has_submit_lock`, `has_single_approver`. Proposed: `suppliers.has_personal_content = true` (supplier contacts include people's names and emails); `supplier_qualifications.has_submit_lock = true` (once approved, the questionnaire body should not silently mutate); `supplier_qualifications.has_single_approver = true` (one Procurement / Compliance approver per qualification); `supplier_certifications.has_submit_lock = true` (the certification document is immutable post-upload); `supplier_risk_assessments.has_single_approver = true` (a designated GRC reviewer approves the score). Surface for user confirmation per Rule #12 (no auto-write of notes). | PATCH 6 `data_objects` rows to set the proposed boolean flags. |
| B1-S8 | **B10b hard fail on the SUP-LIFE side, ALL 18 cross-domain handoffs NULL on `source_domain_module_id` and / or `target_domain_module_id`** | Every handoff touching SUP-LIFE has NULL on its SUP-LIFE-side module FK (because zero modules exist). Once B1-S1 lands the new modules, B10b backfill derives the FK from the trigger_event's `data_object_id` (source side) or the handoff payload (target side) using the master-resolution rule. Outbound rows whose source side is SUP-LIFE (10 rows: 127, 128, 213, 214, 546, 547, 548, 549, 550, 596) become resolvable when SUP-LIFE has modules mastering each trigger_event's data_object. Inbound rows whose target side is SUP-LIFE (8 rows: 273, 277, 336, 362, 543, 565, 586, 591) become resolvable when SUP-LIFE has modules mastering or consuming each handoff's payload data_object. | After B1-S1 lands, run a backfill loader analogous to `scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts` to PATCH `source_domain_module_id` on the 10 outbound rows and `target_domain_module_id` on the 8 inbound rows. |
| B1-S9 | **F1 hard fail, legacy domain-level system skill** | `skills.id=109` (`sup-life-system`) has `domain_id=28` and `domain_module_id=null`, the F1 anti-pattern. Once Phase A authors the 4 modules and Phase S authors module-anchored system skills (one per module per Rule #17), this legacy skill is obsolete and the 8 `skill_tools` rows on it migrate to the per-module skills. | After B1-S1 / Phase S, DELETE the legacy `skills` row 109 plus its 8 `skill_tools` rows; re-author per-module system skills with module-anchored `skill_tools`. |
| B1-S10 | **B8 partial, missing cross-domain `data_object_relationships` outbound from SUP-LIFE masters** | Outbound handoffs 214 (`supplier.risk_elevated` to GRC, payload `supplier_scorecards`) and 549 (`supplier_risk_assessment.elevated` to GRC, payload `supplier_risk_assessments`) have no corresponding `data_object_relationships` row joining the SUP-LIFE master to a GRC-mastered payload. Per B8 outbound asymmetry, this is SUP-LIFE's responsibility. Proposed rows: (a) `supplier_scorecards risk_elevated_to grc_issues` (verb on SUP-LIFE side, target GRC); (b) `supplier_risk_assessments elevates_to grc_issues`; (c) `supplier_certifications expires_into fsqm_supplier_risk_events` (per the trigger 352 description fan-out to FSQM). | Load 3 `data_object_relationships` rows after Phase A modules and GRC's matching payload data_objects are confirmed. |
| B1-S11 | **C1 partial fail, missing capability-level RACI overrides** | Once the proposed capabilities land, several diverge from the domain's Procurement-owner RACI: SUP-LIFE-RISK-OVERLAY is jointly owned by Procurement and GRC (GRC is the canonical risk owner); SUP-LIFE-CERTIFICATION-TRACKING for FSQM / FDA / Part 11 work is owned by Quality / Compliance, not Procurement. | Phase C loader: ~2 `business_function_capabilities` override rows per the divergence. Depends on B1-S2 (capabilities) landing first. |
| B1-S12 | **E-band hard fail, zero RBAC layer** | Per E1 to E6 every multi-module domain needs at least 3 distinct roles, each with at least 2 `role_modules` entries and at least 1 `role_permissions` bundle row. SUP-LIFE has zero. Proposed roles, function-scoped per the `role_code = <FUNCTION>-<ROLE>` pattern: `PROCUREMENT-SUPPLIER-RM` (Supplier Relationship Manager, primary on SUP-LIFE-MASTER and SUP-LIFE-PERFORMANCE), `PROCUREMENT-SUPPLIER-ONBOARDING-SPEC` (primary on SUP-LIFE-ONBOARDING-QUAL), `GRC-SUPPLIER-RISK-ANALYST` (primary on SUP-LIFE-RISK, secondary on SUP-LIFE-PERFORMANCE), `COMPLIANCE-SUPPLIER-DUE-DILIGENCE` (primary on SUP-LIFE-ONBOARDING-QUAL, secondary on SUP-LIFE-RISK), and the existing catalog role `PROCUREMENT-PIM-SUPPLIER-LIAISON` (10092) gets at least `role_modules` rows tying it to SUP-LIFE-MASTER. Workflow-gate permissions derive from B1-S6 lifecycle states with `requires_permission=true`. | Phase E loader, ~5 roles + ~10 role_modules + ~12 baseline permissions + ~18 workflow-gate permissions + permission_hierarchy edges. Depends on B1-S1 + B1-S2 + B1-S6 landing first. |

#### APQC TAGGING (Bucket 1, H1 hard-fail closure)

4 of 18 cross-domain handoffs already carry `handoff_processes` rows, ALL `proposal_source='discovery_override'`, ALL `record_status='new'`. The existing tags all point at PCF 167 "Manage suppliers" (external_id 10280, L3): handoffs 127, 128, 213, 214. The remaining 14 cross-domain handoffs have zero APQC coverage. Volume expectation 0.5N to 0.8N for N=18 is 9 to 14, the audit proposes 14 `agent_curated` rows (covering all 14 untagged plus 2 more-specific replacements for the existing PCF 167 generic tags).

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 127 | SUP-LIFE → S2P | `supplier.approved` | `suppliers` | Certify and validate suppliers | 805 | confident L4 (more specific than existing PCF 167) |
| 128 | SUP-LIFE → AP-AUTO | `supplier.bank_changed` | `suppliers` | Monitor/Manage supplier information | 815 | confident L4 (more specific than existing PCF 167) |
| 213 | SUP-LIFE → ERP-FIN | `supplier.onboarded` | `supplier_onboardings` | Monitor/Manage supplier information | 815 | confident L4 |
| 214 | SUP-LIFE → GRC | `supplier.risk_elevated` | `supplier_scorecards` | Prepare/Analyze procurement and supplier performance | 816 | confident L4 |
| 546 | SUP-LIFE → S2P | `supplier_qualification.approved` | `supplier_qualifications` | Certify and validate suppliers | 805 | confident L4 |
| 547 | SUP-LIFE → AP-AUTO | `supplier_qualification.approved` | `supplier_qualifications` | Certify and validate suppliers | 805 | confident L4 |
| 548 | SUP-LIFE → S2P | `supplier_qualification.expired` | `supplier_qualifications` | Monitor/Manage supplier information | 815 | confident L4 |
| 596 | SUP-LIFE → AP-AUTO | `supplier_qualification.expired` | `supplier_qualifications` | Monitor/Manage supplier information | 815 | confident L4 |
| 549 | SUP-LIFE → GRC | `supplier_risk_assessment.elevated` | `supplier_risk_assessments` | Prepare/Analyze procurement and supplier performance | 816 | confident L4 |
| 550 | SUP-LIFE → AUDIT | `supplier_risk_assessment.completed` | `supplier_risk_assessments` | Perform due-diligence | 473 | confident L4 |
| 273 | MDM → SUP-LIFE | `supplier_golden_record.updated` | `suppliers` | Monitor/Manage supplier information | 815 | confident L4 |
| 277 | ESG → SUP-LIFE | `supplier_esg_assessment.score_updated` | `supplier_esg_assessments` | Prepare/Analyze procurement and supplier performance | 816 | medium (ESG flavor) |
| 336 | VET-PRACT-MGMT → SUP-LIFE | `controlled_substance.dispensed` | `controlled_substance_ledger_entries` | Monitor/Manage supplier information | 815 | medium (industry-specific) |
| 362 | FOOD-TRACE → SUP-LIFE | `supplier_certification.expired` | `supplier_certifications` | Monitor/Manage supplier information | 815 | confident L4 |
| 543 | AP-AUTO → SUP-LIFE | `invoice_match.exception_raised` | `invoice_matches` | Prepare/Analyze procurement and supplier performance | 816 | confident L4 |
| 565 | S2P → SUP-LIFE | `sourcing_event.awarded` | `sourcing_events` | Select suppliers | 804 | confident L4 |
| 586 | S2P → SUP-LIFE | `goods_receipt.quantity_variance` | `goods_receipts` | Prepare/Analyze procurement and supplier performance | 816 | confident L4 |
| 591 | VMS → SUP-LIFE | `staffing_supplier.activated` | `staffing_suppliers` | Monitor/Manage supplier information | 815 | medium (staffing flavor) |

14 deduplicated proposed PCF activities (PCFs 167, 473, 804, 805, 815, 816 plus per-handoff specificity), proposed as `proposal_source='agent_curated'`, `record_status='new'`. Per Rule #10 counting convention this rolls up as **one** Bucket 1 APQC-TAGGING item (B1-H1) regardless of the 18-row sub-table. The existing 4 `discovery_override` tags on PCF 167 should be reviewed: PCF 167 ("Manage suppliers", L3) is the parent of the more-specific L4 rows above; the user picks whether to keep the L3 parent tags AND add L4 children, or DELETE the parent tags in favor of the children.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 / A1 / A2 / A4 / B9 / B12 / B4 / F1 / E) | 9 |
| BOUNDARY (B10b + B8 + C2-overrides) | 2 |
| APQC TAGGING (B1-H1, single item per Rule #10) | 1 |
| **Bucket 1 total** | **12 in-scope items** |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

For the heavy neighbors (edge weight at least 3) the 5-section pairwise diff produced the following per-neighbor findings.

**S2P (weight 8) [pairwise full].** Wired pairs: 6 (4 outbound, 2 inbound). Section 1 (existing fully wired): zero, because every cross-domain handoff touching SUP-LIFE has NULL on the SUP-LIFE module FK (M1 dominates). Section 2 (NULL FK candidates): all 6 once SUP-LIFE has modules; SUP-LIFE-side derivation per B1-S8. Section 3 (implied missing): possible inbound `purchase_order.first_received` to update `supplier_scorecards` on-time delivery KPI; possible inbound `sourcing_event.awarded` already exists (565). Section 4 (B5 integrity): clean, both sides agree on `suppliers` / `supplier_qualifications` ownership. Section 5 (cross-domain relationship mirrors): `suppliers enables sourcing_events` (563) exists; `supplier_qualifications gates purchase_orders` (564) exists; the mirror direction (S2P-side relationships pointing back to SUP-LIFE masters) is not loaded but the verb is one-directional so this is fine.

**AP-AUTO (weight 7) [pairwise full].** Wired pairs: 5 (4 outbound, 1 inbound). Section 1: zero (M1 dominates same as S2P). Section 2: 5 PATCHable once SUP-LIFE modules exist; AP-AUTO's `target_domain_module_id` (on outbound) and `source_domain_module_id` (on inbound 543) are also NULL, AP-AUTO B10b report-only. Section 3: clean, the AP-AUTO surface is fully wired symmetrically. Section 4: clean. Section 5: `suppliers propagates_bank_change_to payment_runs` (565), `invoice_matches signals supplier_scorecards` (570) both exist. Healthy.

**GRC (weight 4) [pairwise full].** Wired pairs: 2 outbound (214 risk_elevated, 549 risk_assessment.elevated). Section 1: zero (M1). Section 2: SUP-LIFE side NULL on both; GRC side also NULL, GRC B10b report-only. Section 3: missing inbound from GRC such as `grc_finding.opened` on a supplier topic could feed back to SUP-LIFE risk assessments, not currently loaded. Section 4: clean. Section 5: `supplier_scorecards escalates_to audit_issues` (560) and `supplier_risk_assessments escalates_to audit_issues` (561) exist but `audit_issues` (289) is mastered by AUDIT, not GRC; per B8 these are the AUDIT-direction edges. The GRC-direction relationship rows are MISSING (covered by B1-S10).

**AUDIT (weight 3) [pairwise full].** Wired pairs: 1 outbound (550 risk_assessment.completed). Section 1: zero (M1). Section 2: PATCHable once SUP-LIFE modules; AUDIT side NULL too. Section 3: missing inbound from AUDIT like `audit_finding.opened` on a supplier topic, AUDIT audits supplier_master records. Section 4: clean. Section 5: `audit_findings updates suppliers` (327, owner_side target), `audit_engagements samples supplier_risk_assessments` (335) exist. Healthy substrate.

**Lighter neighbors (weight 1 to 2, one-line summaries):**

- **ERP-FIN (weight 2).** 1 outbound (213, supplier.onboarded), creates ERP vendor master. Cross-relationship `supplier_onboardings creates_vendor_master_in bank_accounts` (567) exists. NULL on both module FKs.
- **MDM (weight 2).** 1 inbound (273, supplier_golden_record.updated). Cross-relationship `supplier_golden_records resolves_to suppliers` (568) exists. NULL on both module FKs.
- **ESG (weight 2).** 1 inbound (277, supplier_esg_assessment.score_updated). Cross-relationship 327 (supplier_esg_assessments updates suppliers, owner_side target) exists. NULL on both module FKs.
- **VMS (weight 2).** 1 inbound (591, staffing_supplier.activated). Cross-relationship `suppliers reconciles staffing_suppliers` (542) exists. NULL on both module FKs.
- **PIM (weight 2).** Zero handoffs but `pim_products sourced_from suppliers` (1130, 1004) and `suppliers submits product_compliance_declarations` (1005) cross-relationships exist. No event-driven realization yet; possible MISSING-HANDOFF candidate but probably the relationships are intentional reference-only links (B5 PIM consumes supplier master). Light recommendation: surface in B2.
- **FOOD-TRACE (weight 1).** 1 inbound (362, supplier_certification.expired). NULL on both module FKs.
- **VET-PRACT-MGMT (weight 1).** 1 inbound (336, controlled_substance.dispensed). NULL on both module FKs. The relationship between `controlled_substance_ledger_entries` and `suppliers` is the supplier of the substance, narrow scope.
- **TPRM (weight 0 today).** No SUP-LIFE handoff to or from TPRM, but TPRM canonically masters third-party risk assessments. If TPRM masters a `tprm_assessments` data_object, SUP-LIFE-RISK should consume / embedded_master that and there should be a TPRM → SUP-LIFE handoff on `tprm_assessment.completed`. This is **TPRM's B9 / B10 to author**, see report-only follow-ups.

**In-scope mechanical fixes derived from pairwise (Bucket 1):** B1-S10 captures the 3 missing outbound `data_object_relationships` rows. All remaining pairwise findings route to other domains' audits (B1-S8 covers the B10b SUP-LIFE side; counterparty B10b is report-only).

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | Phase A bootstrap: author 4 `domain_modules` for SUP-LIFE plus `domain_module_data_objects` mastering each of the 6 existing data_objects |
| B1-S2 | Phase A bootstrap: author 7 to 8 capabilities + capability_domains + domain_module_capabilities |
| B1-S3 | PATCH `domains.business_logic` to remove the em-dash (Rule violation) |
| B1-S4 | PATCH `domains.catalog_tagline` and `catalog_description` after user approves the drafted text |
| B1-S5 | PATCH 6 trigger_events rows to set `event_category` (Rule #13 enum) |
| B1-S6 | Phase B: author ~30 to 36 `data_object_lifecycle_states` rows across all 6 masters |
| B1-S7 | PATCH 6 `data_objects` rows to set the proposed B4 pattern flags after user approval |
| B1-S8 | After B1-S1 lands, run backfill loader to PATCH 10 outbound + 8 inbound handoffs with the SUP-LIFE-side module FK |
| B1-S9 | After B1-S1 / Phase S, DELETE legacy skill 109 plus its 8 skill_tools rows; re-author per-module |
| B1-S10 | Load 3 missing cross-domain `data_object_relationships` (B8 outbound owed by SUP-LIFE to GRC + FSQM) |
| B1-S11 | After B1-S2 lands, ~2 `business_function_capabilities` override rows for capability-level RACI divergence |
| B1-S12 | Phase E bootstrap: ~5 roles + ~10 role_modules + ~12 baseline + ~18 workflow-gate permissions + permission_hierarchy edges |
| B1-H1 | APQC TAGGING, propose 14 `agent_curated` rows on cross-domain handoffs (the 14 currently-untagged plus 4 more-specific L4 replacements for the existing PCF 167 generic tags) |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module split granularity: 3 or 4 SUP-LIFE modules?** B1-S1 proposes 4 (MASTER, ONBOARDING-QUAL, PERFORMANCE, RISK). A 3-module alternative folds RISK into PERFORMANCE (rationale: both are KPI/score-based on existing supplier records; fewer modules = simpler deploy). A 5-module variant promotes SUP-LIFE-CERTIFICATION-TRACKING out of ONBOARDING-QUAL (rationale: certification lifecycle is a long-running calendar workflow distinct from initial qualification). | Module boundary is editorial / deployability judgment; agent has no opinion stronger than the structural floor (Rule #14: at least 2 modules at 3+ capabilities). | (a) 4-module split as proposed. (b) 3-module fold RISK into PERFORMANCE. (c) 5-module split CERTIFICATION-TRACKING out. (d) Specify your own boundaries. |
| B2-S2 | **B4 pattern-flag confirmations per Rule #12.** Proposed in B1-S7: `suppliers.has_personal_content=true`; `supplier_qualifications.has_submit_lock=true` + `has_single_approver=true`; `supplier_certifications.has_submit_lock=true`; `supplier_risk_assessments.has_single_approver=true`. The agent's reasoning is workflow-shape inference (approval signals are "submit-lock"; named-approver signals are "single approver"; PII presence is "personal content"). | Pattern flags are workflow-shape judgments owned by the user. | Per-flag yes/no, captured in Decisions. |
| B2-S3 | **catalog_tagline and catalog_description final wording (Rule #20).** Drafts in B1-S4. Marketing voice (workflow + value), 1-sentence tagline, 3-paragraph description. | Rule #20 forbids unapproved writes to non-empty values; both are empty so backfill is allowed, but the wording itself needs user sign-off before writing. | (a) Approve drafts verbatim. (b) Rewrite tagline/description with your text. (c) Skip the backfill and load empty (acceptable per Rule #20 since empty is the current state). |
| B2-S4 | **SCRM (Supply Chain Risk Management) as a separate domain candidate.** Queued via `append_missing_domain.ts` during this audit. Vendors Resilinc, Interos, Sphera, Prewave, Everstream Analytics, Sayari focus on n-tier supply chain visibility, disruption alerting, geopolitical risk scoring, which is adjacent to but distinct from SUP-LIFE (supplier-record-centric) and TPRM (any-third-party-centric, including vendors who are not procurement suppliers). | Domain promotion is market-boundary judgment; the helper queues, the user triages. | (a) Promote SCRM as new domain. (b) Fold into SUP-LIFE-RISK as a sub-feature. (c) Fold into TPRM. (d) Reject (existing SUP-LIFE-RISK + TPRM cover it). |
| B2-S5 | **F7 channel-vs-capability on the legacy skill 109's `send_email` tool.** Skill 109 links `send_email` (channel primitive) without `skill_tools.notes` justification. Once Phase S authors per-module system skills, should they link `send_email` (because supplier-portal communications are predominantly email by industry practice) or `notify_person` (the abstraction; deployment chooses)? HICX and Ariba both heavily prefer email for supplier-portal notifications; multi-channel (email + SMS for urgent expiry alerts) is also common. | Channel decision is workflow-specific. | (a) Use `notify_person` (the abstraction; default per the channel-vs-capability rule). (b) Keep `send_email` (specific channel; would need `skill_tools.notes` justification "supplier portal communications are email-anchored"). (c) Use both with broadcast semantics (email + SMS for expiry). |
| B2-S6 | **PIM cross-relationships imply a missing handoff: PIM → SUP-LIFE on `pim_product.sourced_from_supplier_changed`?** `pim_products sourced_from suppliers` (1130, 1004) and `suppliers submits product_compliance_declarations` (1005) exist as reference relationships but there is zero PIM → SUP-LIFE event-driven handoff. Should there be one (e.g. when a product's source supplier changes, SUP-LIFE side updates supplier-product affiliation), or are the relationships intentionally reference-only? | Edge-versus-link distinction; PIM may legitimately consume supplier master without firing events back. | (a) Author a PIM → SUP-LIFE handoff on `pim_product.source_supplier_changed` (PIM's B9, route to PIM audit). (b) Confirm reference-only; no handoff needed. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran a semantic enumeration against HICX, SAP Ariba SLP, Coupa SIM, Ivalua, Jaggaer, Workday Supplier Hub, plus risk-overlay specialists (Sphera/riskmethods, Prewave, Resilinc, Interos, Sayari, Everstream), ESG specialist EcoVadis, diversity specialists SupplierGATEWAY/Tealbook, KYC specialists LSEG World-Check/Refinitiv. The subagent recipe was not spawned (single-pass audit per orchestrator instruction); candidates below come from the analyst's flagship-vendor knowledge.

#### MISSING entity candidates (5)

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `supplier_contacts` | HICX Supplier Experience Platform, Ariba SLP, Coupa SIM all model per-supplier contact rosters (procurement contact, AP contact, legal contact, certification contact) as a structured collection separate from the supplier record. Currently the catalog has no `supplier_contacts` master and contact info lives implicitly in `suppliers.has_personal_content` once flipped. | SUP-LIFE-MASTER |
| `supplier_questionnaires` / `qualification_surveys` | HICX (Surveys), Ariba SLP (Qualifications Questionnaires), Coupa SIM (RFI Forms), Ivalua (Questionnaire library) all model the questionnaire-instance as a first-class object separate from the qualification (a qualification may carry N questionnaires across categories: insurance, security, ESG, financial). Currently `supplier_qualifications` conflates the workflow with its survey content. | SUP-LIFE-ONBOARDING-QUAL |
| `supplier_sanctions_screenings` | LSEG World-Check, Refinitiv, Dow Jones Risk Center, Exiger as KYC/AML vendors model per-supplier sanctions screening events as time-stamped records (PEP screen, OFAC, EU consolidated, UK HM Treasury). 6AMLD and Bank Secrecy Act (both already in `domain_regulations` for SUP-LIFE) mandate periodic re-screening with audit trails. Currently no entity. | SUP-LIFE-ONBOARDING-QUAL (or a new SUP-LIFE-COMPLIANCE module) |
| `supplier_diversity_classifications` | SupplierGATEWAY, Tealbook, Coupa Diversity, ConnXus model supplier diversity (MBE, WBE, VBE, 8(a), HUBZone, LGBTBE, etc.) as structured classifications with cert expiry. Tier-1 / Tier-2 spend reporting in US public-procurement contexts depends on this. Currently no entity, the concept lives implicitly in supplier_certifications. | SUP-LIFE-MASTER (or fold into supplier_certifications via a `classification_type` discriminator) |
| `supplier_audits` / `supplier_audit_findings` | HICX, Ariba SLP, Coupa SIM model supplier-side audits (a procurement audit performed against the supplier, distinct from the AUDIT domain's internal audit engagements). Findings drive corrective-action plans (CAPAs). Currently no entity; the AUDIT domain's `audit_engagements` and `audit_findings` are the wrong-shape semantic neighbor (internal audit). | SUP-LIFE-PERFORMANCE or a new SUP-LIFE-CAPA module |

#### MODULARIZATION candidates (1)

- **Promote SUP-LIFE-COMPLIANCE as a fifth module** if `supplier_sanctions_screenings` and `supplier_audits` land. Together with `supplier_certifications` (today in ONBOARDING-QUAL), these form a distinct compliance-evidence surface that vendors carve out separately (Exiger Compliance, Sayari, LSEG World-Check). Decision: if the user picks B2-S1 option (c) (5-module split), this becomes the 5th; otherwise fold into SUP-LIFE-ONBOARDING-QUAL.

#### Candidate-domain queue

This audit surfaces **1 candidate domain**:

1. **SCRM (Supply Chain Risk Management)**. Vendors: Resilinc, Interos, Sphera (riskmethods), Prewave, Everstream Analytics, Sayari. Adjacency: SUP-LIFE, TPRM, GRC, S2P. Capabilities: n-tier supply chain mapping, supplier risk monitoring, disruption alerting, sub-tier risk discovery, geopolitical risk scoring. Passes the point-solution-market test (independent pure-play vendors). Queued via `append_missing_domain.ts` during this audit.

#### Compliance / regulation candidates

- **CTPAT / AEO** (trusted-trader programs for cross-border supply chains) potentially applicable to SUP-LIFE-RISK certifications. Not currently linked.
- **UFLPA (Uyghur Forced Labor Prevention Act)** and **CSDDD (EU Corporate Sustainability Due Diligence Directive)** are 2024/2025 regulations driving supplier due-diligence requirements. Likely should be added to `domain_regulations` if relevant in the catalog scope.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces a Phase 0 markdown at `c:/tmp/SUP-LIFE-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 5 entity candidates + 1 modularization + 1 domain candidate + 2 regulation candidates to treat as confirmed).

### Cross-bucket dependencies

- **B1-S1 (modules) gates B1-S2 (capabilities), B1-S6 (lifecycle states), B1-S8 (B10b backfill), B1-S9 (skill retire), B1-S11 (C2 overrides), B1-S12 (Phase E roles).** M1 is the structural gate; nothing downstream is loadable until SUP-LIFE has modules. Recommend B1-S1 ships in its own load before any other Bucket 1 fix.
- **B1-S2 (capabilities) gates B1-S11 (C2 overrides).** Capabilities must exist before capability-level RACI overrides can target them.
- **B1-S6 (lifecycle states) gates the workflow-gate permission portion of B1-S12.** Without states no workflow-gate permissions exist.
- **B2-S1 (module count) directly shapes B1-S1, B1-S6 anchoring, B1-S12 role / permission count.** Resolve B2-S1 BEFORE loading B1-S1.
- **B2-S5 (channel-vs-capability decision) shapes B1-S9 Phase-S authoring.** Resolve before re-authoring per-module skills.
- **Bucket 3 SCRM promotion is independent of all Bucket 1 / 2 items** (queueing only creates a `_missing-domains.md` entry; the actual load is downstream once user triages the queue).
- **B3 missing entities (supplier_contacts, supplier_questionnaires, sanctions_screenings, diversity, audits) are independent of M-band fixes** (each can be loaded later as Phase B extensions once modules exist), but recommend deferring until B1-S1 lands so the new entities can be anchored at insert time.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S3, H1`), or `skip`. Note: B1-S1 is the structural gate; nothing else loads cleanly without it. Recommended order: B2-S1 (decide module count), then B1-S1, B1-S2, B1-S3, B1-S4, B1-S5, B1-S7, B1-H1 in one wave; then after B1-S1 lands: B1-S6, B1-S8, B1-S9, B1-S10, B1-S11, B1-S12.

**Bucket 2, what's your call on each?** Six judgment items, please answer per-item. For B2-S1 (module split), pick `(a) 4-module / (b) 3-module / (c) 5-module / (d) custom`. For B2-S2 (pattern flags), per-flag yes/no. For B2-S3 (catalog UX wording), `(a) verbatim / (b) rewrite / (c) skip`. For B2-S4 (SCRM domain), `(a) promote / (b) fold-into SUP-LIFE-RISK / (c) fold into TPRM / (d) reject`. For B2-S5 (channel decision), `(a) notify_person / (b) send_email / (c) both broadcast`. For B2-S6 (PIM handoff), `(a) author handoff / (b) reference-only confirmed`.

**Bucket 3, vet via Phase 0 research, or eyeball-mode?** If eyeball, name which of the 5 entity candidates + 1 modularization + 1 domain candidate (SCRM) + 2 regulation candidates (UFLPA, CSDDD) ring true. If Phase 0, the agent will spawn a focused vendor-research pass and produce `c:/tmp/SUP-LIFE-phase0-<date>.md`.

### Report-only follow-ups (owed by other domains)

These are findings the SUP-LIFE audit surfaced but which sit on other domains; route to those domains' next b1 audit. SUP-LIFE does NOT load fixes for these.

| Owing domain | Check | Detail |
|---|---|---|
| S2P (27) | B10b | source_domain_module_id NULL on handoff 565 (`sourcing_event.awarded` to SUP-LIFE), 586 (`goods_receipt.quantity_variance`); target_domain_module_id NULL on 127, 546, 548 once SUP-LIFE has modules |
| AP-AUTO (29) | B10b | source_domain_module_id NULL on 543 (`invoice_match.exception_raised`); target_domain_module_id NULL on 128, 547, 596 once SUP-LIFE has modules |
| GRC (15) | B10b | target_domain_module_id NULL on 214, 549 once SUP-LIFE has modules |
| AUDIT (16) | B10b | target_domain_module_id NULL on 550 once SUP-LIFE has modules |
| ERP-FIN (65) | B10b | target_domain_module_id NULL on 213 once SUP-LIFE has modules |
| MDM (87) | B10b | source_domain_module_id NULL on 273 (`supplier_golden_record.updated`) |
| ESG (21) | B10b | source_domain_module_id NULL on 277 (`supplier_esg_assessment.score_updated`) |
| VMS (64) | B10b | source_domain_module_id NULL on 591 (`staffing_supplier.activated`) |
| FOOD-TRACE (155) | B10b | source_domain_module_id NULL on 362 (`supplier_certification.expired`) |
| VET-PRACT-MGMT (151) | B10b | source_domain_module_id NULL on 336 (`controlled_substance.dispensed`) |
| TPRM (19) | B9 | TPRM owes outbound to SUP-LIFE on `tprm_assessment.completed` when TPRM masters a `tprm_assessments` data_object (currently no SUP-LIFE inbound from TPRM despite TPRM being the canonical third-party-risk domain) |
| FSQM | B9 / B10 | trigger 352 (`supplier_certification.expired`) description says it fans out to FSQM; if FSQM is the loaded code for Food Safety Quality Management, that domain should declare a consumer DMDO on `supplier_certifications` |
| GRC (15) | B8 outbound | GRC's canonical `grc_issues` / risk-finding data_object should carry a relationship row joining back from SUP-LIFE's `supplier_risk_assessments` / `supplier_scorecards` |
| PIM (110) | B9 candidate | possible missing PIM → SUP-LIFE handoff on `pim_product.source_supplier_changed` (see B2-S6) |
| All neighbors with NULL FKs | DMDO consumer | once SUP-LIFE has modules, each neighbor should declare `consumer + optional` on the SUP-LIFE master they receive in handoff payloads (S2P on `suppliers`, AP-AUTO on `suppliers`, etc.) |

## 2026-05-31, Continuation: B1 technical fixes

Applied the strictly-technical, audit-pre-specified slice of Bucket 1 that does not require new entities, modules, capabilities, lifecycle states, pattern-flag flips, catalog text, or user judgment. Loader: `.tmp_deploy/fix_sup_life_b1_technical_2026_05_31.ts`.

### Applied (3 of 12)

- **B1-S3 done.** PATCHed `domains.business_logic` on SUP-LIFE (id 28) to replace the U+2014 em-dash with a comma. After: "Supplier scorecard math (KPI roll-ups, weighted ratings), a calc layer over CRUD records." CLAUDE.md no-em-dash rule satisfied.
- **B1-S5 done.** PATCHed `event_category` on 6 trigger_events: 562 `supplier_qualification.initiated` → `lifecycle`, 563 `supplier_qualification.approved` → `state_change`, 564 `supplier_qualification.rejected` → `state_change`, 565 `supplier_qualification.expired` → `threshold`, 566 `supplier_risk_assessment.completed` → `lifecycle`, 567 `supplier_risk_assessment.elevated` → `threshold`. Rule #13 enum violations cured.
- **B1-H1 partial (10 of 14 proposed) done.** INSERTed 10 `handoff_processes` rows (`proposal_source='agent_curated'`, `record_status='new'`) for the 10 cross-domain handoffs that today carried zero APQC coverage: 546→805, 547→805, 548→815, 549→816, 596→815, 273→815, 543→816, 565→804, 586→816, 336→815. New row ids 738–747. The 4 PCF-167-tagged handoffs (127, 128, 213, 214) and the 4 already-`agent_curated` handoffs (277, 362, 550, 591) were skipped: those decisions (keep parent PCF + add L4 child vs replace; modifying an existing curated tag) are user judgment.

### Deferred (9 of 12) and why

| ID | Reason for deferral |
|---|---|
| B1-S1 | New `domain_modules` + DMDO rows (4 modules + masters); prompt defers new entities/modules. Gated on B2-S1 (module-count choice). |
| B1-S2 | New `capabilities` + `capability_domains` + `domain_module_capabilities` (7 to 8 rows); prompt defers new entities. |
| B1-S4 | `catalog_tagline` + `catalog_description` backfill; Rule #20 defers catalog text. |
| B1-S6 | New `data_object_lifecycle_states` rows (~30 to 36); prompt defers new entities and B1-S6 is gated on B1-S1 (no modules to anchor to). |
| B1-S7 | Pattern flag flips on 6 masters; prompt explicitly defers pattern flag flips. |
| B1-S8 | B10b FK PATCH on 18 handoffs; SUP-LIFE has zero `domain_modules`, so the SUP-LIFE-side FK is not derivable from existing modules. Gated on B1-S1. |
| B1-S9 | DELETE legacy skill 109 + 8 `skill_tools`; gated on Phase A/S re-author of per-module system skills. |
| B1-S10 | INSERT 3 cross-domain `data_object_relationships`; targets `grc_issues` and `fsqm_supplier_risk_events` do not exist in `data_objects` (pre-flight returned zero rows). Cannot resolve target FK. |
| B1-S11 | Capability-level RACI overrides; gated on B1-S2. |
| B1-S12 | Phase E roles + role_modules + permissions; full Phase E load, prompt defers. Gated on B1-S1, B1-S2, B1-S6. |

### Verification

- `/domains?domain_code=eq.SUP-LIFE` → `business_logic` em-dash-free.
- `/trigger_events?id=in.(562,563,564,565,566,567)` → all 6 carry an allowed `event_category` value.
- `/handoff_processes?handoff_id=in.(273,336,543,546,547,548,549,565,586,596)` → 10 new agent_curated rows present, ids 738 to 747.

### JWT errors

None.
