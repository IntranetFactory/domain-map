---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 22
---

# FOOD-TRACE (Food Traceability and Provenance) audit history

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- **Domain id:** 155. **Owner business function:** Governance, Risk and Compliance (contributors: Supply Chain, Procurement; consumer: Executive).
- **Current footprint counts.** 4 FOOD-TRACE-owned master data_objects (`traceability_lots`, `critical_tracking_events`, `key_data_elements`, `recall_events`), 1 catalog-conflict master (`supplier_certifications`, also mastered by SUP-LIFE), 1 contributor (`compliance_obligations`), 3 consumers (`harvest_records`, `bulk_milk_shipments`, `suppliers`). 6 capabilities. 7 solutions (6 primary, 1 secondary). **0 modules**, **0 lifecycle states**, **0 aliases on the 4 FOOD-TRACE-owned masters** (2 aliases on the co-mastered `supplier_certifications`), **0 regulations**, **0 users edges**, **0 intra-domain `data_object_relationships`**, **0 outbound cross-domain `data_object_relationships`** (2 inbound rows from `audit_findings` exist). 8 outbound + 12 inbound cross-domain handoffs (20 total); all but 1 carry NULL module FKs on both sides. 1 legacy system skill at the `domain_id`-only anchor (id 62), no module-anchored skill; 6 `skill_tools` (5 query + 1 send_email). **0 `handoff_processes`** coverage (H1 fail).
- **Vendor-surface basis.** Flagship vendors enumerated for the semantic pass: Trustwell (formerly Genesis Foods Connect), TraceGains, IBM Food Trust, Provenance, Wholechain, iTradeNetwork (all in catalog as solutions), plus FoodLogiQ Connect, ReposiTrak Traceability Network, Ripe.io, Bext360 (positioned as commodity-specific provenance specialists), and the GS1 EPCIS 2.0 / GS1 Digital Link standard as the data-exchange anchor. Statutory anchors: FSMA 204 (21 CFR 1 Subpart S, Food Traceability Final Rule, Jan 2026 enforcement on the Food Traceability List), FSMA Preventive Controls Rule (21 CFR 117), Reportable Food Registry (21 CFR 1417), EU 1169/2011 (food information), EU 2018/775 (origin of primary ingredient), Canada SFCR (Safe Food for Canadians Regulations), USDA FSIS Country of Origin Labeling, FDA Bioterrorism Act recordkeeping, GS1 EPCIS 2.0 (industry standard, not statute).
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.

### Pass 1 — Structural findings (per-domain completeness checklist)

S-band sweep first, then per-band routing.

#### S1. Direct FKs to `domains` (FOOD-TRACE = id 155)

| Table | FK column | FOOD-TRACE rows | Expected non-zero? | Status |
| --- | --- | --- | --- | --- |
| `domain_modules` | `domain_id` | 0 | yes | **FAIL (M1)** |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero | pass |
| `capability_domains` | `domain_id` | 6 | yes | pass |
| `solution_domains` | `domain_id` | 7 | yes | pass |
| `business_function_domains` | `domain_id` | 4 | yes | pass |
| `domain_data_objects` | `domain_id` | 9 | yes | pass |
| `domain_regulations` | `domain_id` | 0 | usually non-zero (highly regulated market) | **FAIL (Bucket 1 STRUCTURAL, regulations gap)** |
| `handoffs.source_domain_id` | n/a | 8 | yes | pass on count, fails B10b |
| `handoffs.target_domain_id` | n/a | 12 | usually non-zero | pass on count, fails B10b |
| `skills.domain_id` | n/a | 1 (legacy) | obsolete once M1 cured | **F1 transitional** |
| `domains.parent_domain_id` | n/a | 0 | routinely zero | pass |

#### S2. Indirect per-module coverage

No `domain_modules` rows; coverage table empty. Every module-anchored check (S2 / M2 / M4 / M5 / M6 / M7 within-domain / B10b per-module attribution / F2 / F3 / F4 / F5) cascades from M1.

#### S3. Per-master indirect coverage

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| `traceability_lots` | 0 | 1 (`traceability_lot.created`) | 0 |
| `critical_tracking_events` | 0 | 1 (`critical_tracking_event.recorded`) | 0 |
| `key_data_elements` | 0 | 1 (`key_data_element.captured`) | 0 |
| `recall_events` | 0 | 1 (`recall_event.initiated`) | 0 |
| `supplier_certifications` (co-mastered) | 0 | 1 (`supplier_certification.expired`) | 2 (`compliance certificate`, `ISO certification`) |

Every master has at least one event but zero lifecycle states (B12 fail) and zero aliases on the 4 FOOD-TRACE-owned masters (B11 fail). Each master also publishes only its single most-prominent event; the broader event vocabulary (verify_completed, shipped, received, transformed, query_response, evidence_attached, terminated, etc.) is unloaded.

#### Per-band classification

| ID | Result | Routing |
| --- | --- | --- |
| A1 | pass (all 7 metadata fields populated) | n/a |
| A2 | pass (6 capabilities) | n/a |
| A3 | pass (7 solutions, 6 primary) | n/a |
| A4 | FAIL: `catalog_tagline = ""`, `catalog_description = ""` | Bucket 1 STRUCTURAL |
| Regulations | FAIL: 0 `domain_regulations` rows for a market whose entire demand driver is regulatory (FSMA 204 enforcement Jan 2026). Should at minimum link FSMA 204, FSMA Preventive Controls Rule, EU 1169/2011, Canada SFCR, USDA COOL, FDA Bioterrorism Act recordkeeping | Bucket 1 STRUCTURAL |
| M1 | FAIL: 0 modules (GATING) for a 6-capability domain. Rule #14 requires >=2 `module_kind='full'` modules | **Bucket 1 STRUCTURAL (gating)** |
| M2 / M4 / M5 / M6 | n/a until M1 cured | cascade |
| M7 | FAIL (catalog-wide): `supplier_certifications` (id 498) has a legacy `domain_data_objects.role='master'` row in BOTH SUP-LIFE (id 28) AND FOOD-TRACE (id 155). Single-master rule violated. No `domain_module_data_objects` rows exist (cascade of M1) so the within-domain check is vacuous, but the catalog-wide hard fail stands | Bucket 2 (mastership arbitration) + report-only for SUP-LIFE side |
| B1 | pass (4 FOOD-TRACE-only masters + 1 co-mastered) | n/a |
| B2 | pass (all 5 masters carry singular + plural labels) | n/a |
| B3 | pass (every master is a domain-prefixed or compound name; `supplier_certifications` is prefixed by `supplier_`; no bare-word claim needed) | n/a |
| B4 | FAIL: every master has all three pattern flags = false. Per Rule #12 a positive consideration is required; defaults are not the same as reviewed. Likely true cases: `recall_events.has_submit_lock=true` (recall locks on initiation), `recall_events.has_single_approver=true` (Class I recall sign-off), `traceability_lots.has_submit_lock=true` (lot identity is immutable once created), `supplier_certifications.has_submit_lock=true` (certificate validity locks) | Bucket 1 STRUCTURAL (per-flag PATCH after user confirms per row, no notes annotation per Rule #15) |
| B5 | pass (no `embedded_master` rows in this domain) | n/a |
| B6 | FAIL: 0 intra-domain `data_object_relationships`. Expected verbs: `traceability_lots originates critical_tracking_events`, `critical_tracking_events carries key_data_elements`, `recall_events targets traceability_lots`, `supplier_certifications authorizes traceability_lots` (provenance basis), `traceability_lots derived_from traceability_lots` (lot genealogy self-edge for split / merge / transform) | Bucket 1 STRUCTURAL |
| B7 | FAIL: 0 `users` edges on any of the 4 FOOD-TRACE-only masters. (1 edge exists: `users uploads supplier_certifications`, but the FOOD-TRACE-only masters carry none.) Per Rule #10 missing: `users -> traceability_lots (created_by:warehouse_op)`, `users -> critical_tracking_events (recorded_by:operator, verified_by:qa_manager)`, `users -> key_data_elements (captured_by:any_operator)`, `users -> recall_events (initiated_by:qa_manager, approved_by:vp_quality, communicated_by:regulatory_affairs)` | Bucket 1 STRUCTURAL |
| B8 | FAIL (outbound): 0 outbound cross-domain `data_object_relationships`. For 8 outbound handoffs, expected mirrors: `recall_events triggers compliance_obligations` (target GRC), `recall_events triggers inventory_holds` or equivalent (target ERP-FIN), `supplier_certifications updates suppliers` (target SUP-LIFE), `traceability_lots evidence_for audit_findings` (target AUDIT). Inbound edges from `audit_findings` to `key_data_elements` and `critical_tracking_events` already exist (AUDIT-side authorship); FOOD-TRACE has no outbound counterparts | Bucket 1 STRUCTURAL |
| B9 | partial: 5 events for 5 masters; only the most-prominent event per master is loaded. Missing: `recall_event.classified`, `recall_event.notification_sent`, `recall_event.consolidated`, `recall_event.reconciled`, `recall_event.terminated`, `recall_event.effectiveness_verified` (FDA Reportable Food Registry-mandated stages), `traceability_lot.split`, `traceability_lot.merged`, `traceability_lot.transformed`, `traceability_lot.consumed`, `critical_tracking_event.amended` (FSMA 204 amendment shape), `key_data_element.validated`, `key_data_element.flagged_for_review`, `supplier_certification.uploaded`, `supplier_certification.renewed`, `supplier_certification.revoked` | Bucket 1 STRUCTURAL |
| B9b | n/a until M1 cured. Once modules exist, every multi-master cross-module edge below in Bucket 2 #1 needs `lifecycle_progression` intra-domain handoffs | cascade |
| B10 (inbound) | FAIL: 12 inbound rows exist (from FMIS, DAIRY-MGMT, FSQM, MFG-OPS, FARMER-DIRECT-SALES) but every row except 1 (handoff 963 has `source_domain_module_id=123` from FARMER-DIRECT-SALES side) has NULL `target_domain_module_id` (cascade of M1). 1 row carries the FDS source-module attribution; 11 rows carry no module attribution at all | Report-only follow-ups + cascade |
| B10b | FAIL: every outbound row in `handoffs` has NULL `source_domain_module_id` (cascade of M1); every inbound row has NULL `target_domain_module_id` (cascade) except handoff 963 (partially attributed on source side). 0 trigger-event mis-attribution defects observed (every `trigger_events.data_object_id` points at a FOOD-TRACE-mastered or co-mastered data_object) | Bucket 1 STRUCTURAL cascade from M1 |
| B11 | FAIL: 0 aliases on the 4 FOOD-TRACE-owned masters. Vendor-specific synonyms: `traceability_lots` ↔ "lot" / "batch" / "production lot" / "GS1 SSCC" / "EPCIS-aggregation" (varies by GS1 EPCIS profile); `critical_tracking_events` ↔ "CTE" (FSMA abbreviation, mandatory) / "EPCIS-event" / "supply-chain event"; `key_data_elements` ↔ "KDE" (FSMA abbreviation, mandatory) / "trace attribute" / "lot attribute"; `recall_events` ↔ "withdrawal" / "market withdrawal" (non-statutory FDA category, distinct from recall) / "FSMA Reportable Food filing" | Bucket 1 STRUCTURAL |
| B12 | FAIL: 0 lifecycle states on any of the 5 masters. All carry real workflows: `traceability_lots` (created -> active -> split / merged / transformed -> consumed -> archived; recalled branch), `critical_tracking_events` (recorded -> validated -> amended -> closed), `key_data_elements` (captured -> validated -> flagged -> resolved), `recall_events` (initiated -> classified -> notification_sent -> consolidating -> reconciling -> effectiveness_verified -> terminated; class branches I / II / III), `supplier_certifications` (uploaded -> verified -> active -> expiring -> expired -> renewed -> revoked). Mark workflow-gate states `requires_permission=true` and set `domain_module_id` per realizing module once M1 cured | Bucket 1 STRUCTURAL |
| C1 | pass (1 owner + 2 contributors + 1 consumer) | n/a |
| C2 | pass (no obvious capability divergence; `FOOD-TRACE-RECALL-EXECUTION` could plausibly map to GRC-Crisis or QA-Recall sub-functions but that's a Bucket 2 review) | Bucket 2 (capability function-divergence review) |
| D1 | UI spot-check deferred until after fix loads | n/a |
| E1-E6 | E1 vacuously fails because M1 fails (no modules to anchor `role_modules` on); cascade. Once modules land, expect personas: Recall Coordinator (cross-module FOOD-TRACE + GRC + ERP-FIN), Traceability Analyst (FOOD-TRACE + AUDIT + GRC), Supplier Quality Manager (FOOD-TRACE + SUP-LIFE + FSQM) | cascade from M1 |
| F1 | FAIL: legacy `skills.id=62` (`food-trace-system`) at `domain_id=155`, `domain_module_id=null`. Per Rule #14 + F1, this becomes obsolete once module-level system skills are authored, but **must not be deleted before** the module set lands | Bucket 1 STRUCTURAL (sequenced after M1) |
| F2 / F3 / F4 / F5 | cascade from M1. F4 sub-finding: legacy skill 62's 6 tools pass operation-kind invariants (5 `query_*` tools have `data_object_id` set on the right master; `send_email` has NULL `data_object_id`, valid for `side_effect`). F7 sub-finding: the `send_email` link is unjustified channel-pinning for recall notifications, supplier-cert-expiry alerts, CTE deviation pages, etc., most of which should use `notify_person` or `notify_team` unless contractually email-only (Reportable Food Registry filings to FDA are an HTTPS API today, not email) | Bucket 1 STRUCTURAL (F7 specifically); rest cascade from M1 |
| H1 | FAIL: 20 cross-domain handoffs (8 outbound + 12 inbound); 0 `handoff_processes` rows. Per H1 volume expectation `0.5N to 0.8N` agent-curated tags = 10-16; this audit proposes APQC tags below | Bucket 1 APQC TAGGING |

### Pass 2 — Market audit (semantic) findings

Flagship vendor surface for FOOD-TRACE: Trustwell, TraceGains, IBM Food Trust, Provenance, Wholechain, iTradeNetwork, FoodLogiQ Connect, ReposiTrak Traceability Network, Ripe.io, Bext360.

#### MISSING entities

| Proposed master | Vendor evidence | Notes |
| --- | --- | --- |
| `traceability_queries` (regulator and partner trace-request workflow) | FoodLogiQ, TraceGains, Trustwell carry "trace request" as a first-class workflow; FSMA 204 requires response within 24 hours of an FDA request | Bucket 1 MISSING; payload of inbound queries from regulators and trading partners. Tracks request, scope, deadline, response, and audit trail. |
| `chain_of_custody_records` (CoC handoffs between trading partners with attestation) | IBM Food Trust, Wholechain, Provenance model CoC as the cross-organization edge; GS1 EPCIS encodes it natively | Bucket 1 MISSING |
| `provenance_attestations` (signed claims about origin, growing method, certifications) | Provenance, Bext360, IBM Food Trust master attestation as a separate first-class noun from supplier certifications (vendor-issued vs producer-claimed) | Bucket 1 MISSING |
| `recall_communications` (per-recipient communications log: FDA, state agencies, distributors, retailers, consumers) | Trustwell, FoodLogiQ explicitly model recall comms as a separate ledger from the recall event itself for audit defense | Bucket 1 MISSING |
| `food_traceability_list_classifications` (per-product FTL classification: is this SKU subject to FSMA 204 enhanced traceability) | TraceGains, Trustwell carry an explicit FTL/non-FTL classification per product because FSMA 204 only applies to FTL items | Bucket 2 (could fold into `products` extension on PIM side or stay FOOD-TRACE master) |
| `gs1_identifiers` (GTIN, SSCC, GLN registry; per-lot serialization) | GS1 EPCIS-compliant platforms (IBM Food Trust, Wholechain) master the GS1 identifier graph as the substrate for every event | Bucket 2 (could be FOOD-TRACE master OR live in PIM / MDM) |
| `traceback_exercises` / `mock_traces` | Trustwell, FoodLogiQ run scheduled traceback exercises against historical CTEs to validate retrieval-time SLAs | Bucket 1 MISSING |
| `regulatory_filings` (FDA Reportable Food Registry submissions, USDA FSIS notifications) | Trustwell, ReposiTrak carry the filing as a distinct artifact from the recall event (one recall, many filings to different agencies) | Bucket 1 MISSING |
| `provenance_certificates` (blockchain-anchored or paper-trail certificates issued from this domain for downstream consumer storytelling) | Provenance, Wholechain, IBM Food Trust generate consumer-facing QR / NFC certificates as a deliverable distinct from `supplier_certifications` | Bucket 3 (depends on whether catalog promotes consumer-storytelling as in-scope for FOOD-TRACE or routes to a new PROVENANCE-PLATFORM market) |
| `coa_records` / `certificates_of_analysis` | TraceGains, Trustwell, FoodLogiQ master per-shipment COA workflows distinct from supplier certifications (recurring per lot, not per supplier) | Bucket 2 (FOOD-TRACE vs FSQM vs SUP-LIFE mastership) |

#### WRONG-OWNERSHIP

| Entity | Current owner | Suggested owner | Vendor evidence |
| --- | --- | --- | --- |
| `supplier_certifications` (id 498) | dual-mastered FOOD-TRACE + SUP-LIFE | one canonical owner. Vendor evidence is split: SUP-LIFE-shape vendors (Coupa, Ivalu, SAP Ariba supplier modules) master cert; food-trace-shape vendors (Trustwell, TraceGains, FoodLogiQ) master cert because cert governs lot-level traceability. Recommendation: SUP-LIFE keeps master, FOOD-TRACE demotes to `embedded_master` once both sides modularize | catalog-wide M7 hard fail per Rule #11 / Rule #14; deferral surface = catalog-wide single-master constraint |

#### SCOPE-CREEP

None observed on the FOOD-TRACE-mastered surface. The 3 consumer rows (`harvest_records`, `bulk_milk_shipments`, `suppliers`) and 1 contributor (`compliance_obligations`) are all coherent inbound edges from FMIS, DAIRY-MGMT, MDM, GRC respectively. No foreign masters squatting on FOOD-TRACE territory.

#### MODULARIZATION ISSUES

FOOD-TRACE has 6 capabilities and 0 modules. Per Rule #14, >=2 `module_kind='full'` modules are required. Recommended module split (Bucket 2):

| Proposed module code | Scope | Masters it would anchor |
| --- | --- | --- |
| `FOOD-TRACE-LOT-GENEALOGY` | Lot identity, split / merge / transform / consumption, parent-child graph, EPCIS aggregation | `traceability_lots`, plus the proposed `gs1_identifiers` if FOOD-TRACE-mastered |
| `FOOD-TRACE-CTE-CAPTURE` | FSMA 204 CTE event capture (receive / transform / ship), KDE attachment, EPCIS event recording | `critical_tracking_events`, `key_data_elements` |
| `FOOD-TRACE-RECALL` | Recall initiation, classification, communications, consolidation, reconciliation, effectiveness verification, regulatory filings | `recall_events`, plus the proposed `recall_communications`, `regulatory_filings` |
| `FOOD-TRACE-SUPPLIER-DOCS` | Supplier certification ingest, OCR, expiry tracking, COA per-shipment workflow | `supplier_certifications` (embedded_master if SUP-LIFE keeps catalog-wide master), plus the proposed `coa_records` if FOOD-TRACE-mastered |
| `FOOD-TRACE-PROVENANCE` | Origin verification, attestation, chain-of-custody, consumer-facing certificates | `provenance_attestations`, `chain_of_custody_records`, plus the proposed `provenance_certificates` if in scope |
| `FOOD-TRACE-QUERY` | Trace-request workflow, regulator and partner traceback, mock-trace exercises, retrieval-time SLA monitoring | `traceability_queries`, `traceback_exercises` |

A 6-module split is heavy. A 3-module starter (`LOT-GENEALOGY`, `CTE-CAPTURE`, `RECALL`) plus a single `FOOD-TRACE-CORE` covering supplier-docs / provenance / query is the lighter alternative. Decide in Bucket 2 #1.

### Pass 3 — Neighbor discovery (cross-edges)

Neighbor set derived from `handoffs` (outbound + inbound) and contributor / consumer DMDO cross-references.

| Neighbor | Outbound handoffs (FOOD-TRACE -> neighbor) | Inbound handoffs (neighbor -> FOOD-TRACE) | DMDO edges | Edge weight | Pairwise depth |
| --- | --- | --- | --- | --- | --- |
| FSQM (157) | 2 (`supplier_certification.expired`, `traceability_lot.created`) | 4 (`food_safety_incident.escalated`, `critical_control_point.deviation`, `environmental_monitoring_sample.positive`, plus `recall_events` contributor edges) | FSQM contributor on `recall_events`, FSQM contributor on `supplier_certifications` | 8 | full 5-section |
| FMIS (154) | 0 | 4 (`harvest_record.created`, `field_application.recorded`, `planting_record.completed`, `farm_field.boundary_updated`) | FOOD-TRACE consumer on `harvest_records` (FMIS-mastered) | 5 | full 5-section |
| AUDIT (16) | 2 (`critical_tracking_event.recorded`, `key_data_element.captured`) | 0 (but 2 inbound `data_object_relationships`: `audit_findings reviews key_data_elements`, `audit_findings samples critical_tracking_events`) | none observed | 4 | full 5-section |
| GRC (15) | 2 (`recall_event.initiated`, `critical_tracking_event.recorded`) | 0 | FOOD-TRACE contributor on `compliance_obligations` (GRC-mastered) | 3 | full 5-section |
| DAIRY-MGMT (156) | 0 | 3 (`bulk_milk_shipment.dispatched`, `milking.completed`, `feed_ration.changed`) | FOOD-TRACE consumer on `bulk_milk_shipments` (DAIRY-MGMT-mastered) | 4 | full 5-section |
| SUP-LIFE (28) | 1 (`supplier_certification.expired`) | 0 | catalog-wide M7 conflict on `supplier_certifications`; FOOD-TRACE consumer on `suppliers` (SUP-LIFE / MDM dual-mastered) | 3 | full 5-section |
| ERP-FIN (65) | 1 (`recall_event.initiated`) | 0 | none observed | 1 | one-line |
| MFG-OPS (47) | 0 | 1 (`produced_unit.completed`) | none observed | 1 | one-line |
| FARMER-DIRECT-SALES (158) | 0 | 1 (`butcher_order.ready` from FDS-BUTCHER module 123) | none observed | 1 | one-line |

### Pass 4 — Pairwise reconciliation (edge weight >= 3)

#### Neighbor: FSQM (weight 8)

1. **Existing handoffs, fully wired** - 0. Every cross-edge with FSQM has NULL module FKs on both sides (cascade of FSQM M1 fail AND FOOD-TRACE M1 fail). Pass: nothing to confirm.
2. **Existing handoffs with NULL module FK** - 2 outbound + 4 inbound, all NULL on both sides. Resolution blocked on M1 here. Once FOOD-TRACE modules land, `supplier_certification.expired -> FSQM` should source-map to `FOOD-TRACE-SUPPLIER-DOCS`; `traceability_lot.created -> FSQM` to `FOOD-TRACE-LOT-GENEALOGY`. Inbound `food_safety_incident.escalated -> FOOD-TRACE.recall_events` should target-map to `FOOD-TRACE-RECALL`; `environmental_monitoring_sample.positive -> FOOD-TRACE` to `FOOD-TRACE-RECALL` (potential trigger) or `FOOD-TRACE-LOT-GENEALOGY` (lot-quarantine).
3. **Missing handoffs catalog implies** - likely missing: `recall_event.classified -> FSQM` (FSQM owns the corrective-action follow-up), `recall_event.effectiveness_verified -> FSQM` (closure attestation), `traceability_query.received -> FSQM` (if a query needs supporting QMS records, FSQM should know). Bucket 1 once Bucket 2 modularization lands.
4. **Boundary integrity gaps** - FSQM contributor on `recall_events` is valid. FSQM contributor on `supplier_certifications` is valid for the SUP-LIFE master, but the catalog-wide M7 conflict on `supplier_certifications` is upstream and not FOOD-TRACE's to resolve unilaterally.
5. **Cross-domain `data_object_relationships` mirror** - 0 cross-domain rows from FOOD-TRACE masters to FSQM masters. Expected: `recall_events triggered_by food_safety_incidents` (owner_side=target, FSQM publishes), `traceability_lots monitored_by critical_control_points` (owner_side=target). MISSING-RELATIONSHIP. Bucket 1.

#### Neighbor: FMIS (weight 5)

1. Existing fully-wired - 0 (NULL module FKs).
2. NULL FKs - 4 inbound, all NULL on both sides. After M1 cured, `harvest_record.created -> FOOD-TRACE` should target-map to `FOOD-TRACE-LOT-GENEALOGY` (harvest is a CTE-origin event); same for `field_application.recorded` (pesticide / fertilizer KDE), `planting_record.completed` (provenance), `farm_field.boundary_updated` (origin verification metadata).
3. Missing handoffs - likely missing: `recall_event.initiated -> FMIS` (when a recall traces back to a specific harvest, FMIS owes a lot-hold action), `traceability_query.received -> FMIS` (regulator queries about farm-side data). Bucket 1.
4. Boundary integrity - FOOD-TRACE consumer on `harvest_records` is valid (FMIS-mastered). No conflicts.
5. Relationships mirror - 0 cross-domain rows from FOOD-TRACE masters to FMIS masters. Expected: `traceability_lots originates_from harvest_records` (owner_side=source, owns the lot identity). MISSING-RELATIONSHIP. Bucket 1.

#### Neighbor: AUDIT (weight 4)

1. Existing fully-wired - 0 (NULL module FKs).
2. NULL FKs - 2 outbound. After M1 cured, `critical_tracking_event.recorded -> AUDIT` should source-map to `FOOD-TRACE-CTE-CAPTURE`; `key_data_element.captured -> AUDIT` same.
3. Missing handoffs - `traceability_query.received -> AUDIT` (every regulator query is an audit trigger), `recall_event.effectiveness_verified -> AUDIT` (closure attestation). Bucket 1.
4. Boundary integrity - inbound `data_object_relationships` from `audit_findings` to `key_data_elements` and `critical_tracking_events` exist (AUDIT-authored, valid). FOOD-TRACE owes no edge in the reverse direction (audit findings are AUDIT's to raise).
5. Relationships mirror - 0 cross-domain rows from FOOD-TRACE masters to AUDIT masters. The 2 inbound rows (AUDIT -> FOOD-TRACE) are AUDIT's responsibility, already loaded. FOOD-TRACE side owes nothing; pass.

#### Neighbor: GRC (weight 3)

1. Existing fully-wired - 0 (NULL module FKs).
2. NULL FKs - 2 outbound. After M1 cured, `recall_event.initiated -> GRC` should source-map to `FOOD-TRACE-RECALL`; `critical_tracking_event.recorded -> GRC` to `FOOD-TRACE-CTE-CAPTURE`.
3. Missing handoffs - `recall_event.classified -> GRC` (Class I = mandatory regulatory filing), `regulatory_filing.submitted -> GRC` (if FOOD-TRACE masters `regulatory_filings`), `traceability_query.received -> GRC` (regulator-originated queries trigger compliance obligations). Bucket 1.
4. Boundary integrity - FOOD-TRACE contributor on `compliance_obligations` is valid. No conflicts.
5. Relationships mirror - 0 cross-domain rows from FOOD-TRACE masters to GRC masters. Expected: `recall_events triggers compliance_obligations`, `critical_tracking_events satisfies compliance_obligations` (FSMA 204 retention obligation). MISSING-RELATIONSHIP. Bucket 1.

#### Neighbor: DAIRY-MGMT (weight 4)

1. Existing fully-wired - 0 (NULL module FKs).
2. NULL FKs - 3 inbound. After M1 cured, `bulk_milk_shipment.dispatched -> FOOD-TRACE` should target-map to `FOOD-TRACE-LOT-GENEALOGY` (lot origin event); `milking.completed -> FOOD-TRACE` same; `feed_ration.changed -> FOOD-TRACE` to `FOOD-TRACE-PROVENANCE` (feed-source provenance for organic / grass-fed claims).
3. Missing handoffs - `recall_event.initiated -> DAIRY-MGMT` (when recall traces to a specific milking batch, dairy operations owe a tank-hold), `traceability_query.received -> DAIRY-MGMT`. Bucket 1.
4. Boundary integrity - FOOD-TRACE consumer on `bulk_milk_shipments` is valid (DAIRY-MGMT-mastered). No conflicts.
5. Relationships mirror - 0 cross-domain rows from FOOD-TRACE masters to DAIRY-MGMT masters. Expected: `traceability_lots aggregates milkings`, `traceability_lots derived_from bulk_milk_shipments`. MISSING-RELATIONSHIP. Bucket 1.

#### Neighbor: SUP-LIFE (weight 3)

1. Existing fully-wired - 0 (NULL module FKs).
2. NULL FKs - 1 outbound. After M1 cured, `supplier_certification.expired -> SUP-LIFE` source maps to `FOOD-TRACE-SUPPLIER-DOCS`. Note: the M7 conflict on `supplier_certifications` makes the source ambiguous; under "SUP-LIFE wins master" arbitration the event should actually be emitted from SUP-LIFE, not FOOD-TRACE.
3. Missing handoffs - `supplier_certification.uploaded -> SUP-LIFE` (cross-system sync), `supplier_certification.revoked -> SUP-LIFE` (block new POs). Bucket 1 if FOOD-TRACE keeps mastering or contributing.
4. Boundary integrity - catalog-wide M7 hard fail on `supplier_certifications` (dual master). Decision route in Bucket 2 #2: SUP-LIFE keeps master, FOOD-TRACE demotes to `embedded_master`. Also report-only on the SUP-LIFE side.
5. Relationships mirror - 1 existing edge (`suppliers holds supplier_certifications`) on the SUP-LIFE side. After arbitration FOOD-TRACE may need to embed-shell the relationship locally; no outbound new edges from FOOD-TRACE side.

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL (cascading from M1)

| ID | Finding | Recommended fix |
| --- | --- | --- |
| B1-S1 | A4 fail: `catalog_tagline` and `catalog_description` are empty | Draft both per Rule #20 (buyer voice, workflow + value; not analyst voice). Surface drafts before writing per Rule #20. |
| B1-S2 | M1 fail (GATING): 0 `domain_modules` rows for a 6-capability domain. Rule #14 requires >=2 `module_kind='full'` modules | Author the module set per Bucket 2 #1 selected shape. Default recommendation: 4 modules (`FOOD-TRACE-LOT-GENEALOGY`, `FOOD-TRACE-CTE-CAPTURE`, `FOOD-TRACE-RECALL`, `FOOD-TRACE-CORE` covering supplier-docs / provenance / query). |
| B1-S3 | Regulations gap: 0 `domain_regulations` rows for a market whose primary demand driver is regulatory (FSMA 204 enforcement Jan 2026) | Load `domain_regulations` rows for at minimum: FSMA 204 (Food Traceability Final Rule), FSMA Preventive Controls Rule, EU 1169/2011, Canada SFCR, USDA FSIS COOL, FDA Bioterrorism Act recordkeeping. Likely several of these are not yet `regulations` rows either, run pre-flight against `/regulations`. |
| B1-S4 | B4 fail: pattern flags on every master are default false with no audit confirmation. Per Rule #12, positive consideration is required | Re-evaluate per master. Likely true cases: `recall_events.has_submit_lock=true` (recall locks on initiation), `recall_events.has_single_approver=true` (Class I sign-off), `traceability_lots.has_submit_lock=true` (lot identity immutable post-creation), `supplier_certifications.has_submit_lock=true` (cert validity locks). Apply via PATCH after per-row user confirmation (no notes annotation per Rule #15). |
| B1-S5 | B6 fail: 0 intra-domain `data_object_relationships` | Load the cluster: `traceability_lots originates critical_tracking_events`, `critical_tracking_events carries key_data_elements`, `recall_events targets traceability_lots` (many-to-many: one recall hits many lots), `supplier_certifications authorizes traceability_lots` (provenance basis), `traceability_lots derived_from traceability_lots` (self-edge for lot split / merge / transform genealogy). |
| B1-S6 | B7 fail: 0 `users` edges on the 4 FOOD-TRACE-only masters | Author Rule #10 edges: `users -> traceability_lots (created_by:warehouse_op)`, `users -> critical_tracking_events (recorded_by:operator, verified_by:qa_manager)`, `users -> key_data_elements (captured_by:any_operator)`, `users -> recall_events (initiated_by:qa_manager, approved_by:vp_quality, communicated_by:regulatory_affairs)`. Per Rule #10, both directions where applicable. |
| B1-S7 | B8 fail (outbound): 8 outbound `handoffs` rows but 0 corresponding outbound cross-domain `data_object_relationships`. Per Rule §B8, FOOD-TRACE owes the outbound mirror | Author `recall_events triggers compliance_obligations` (target GRC), `recall_events triggers_inventory_hold` (target ERP-FIN, payload to confirm), `traceability_lots originates_from harvest_records` (target FMIS, owner_side=source), `traceability_lots aggregates milkings` (target DAIRY-MGMT), `critical_tracking_events evidence_for audit_findings` (target AUDIT, owner_side=target so AUDIT may author; confirm direction). One row per cleanly-mapped outbound handoff payload. |
| B1-S8 | B9 partial: 5 events published, missing lifecycle and side-channel events. Specifically `recall_event.classified` (Class I/II/III determines filing path), `recall_event.notification_sent`, `recall_event.consolidated`, `recall_event.effectiveness_verified`, `recall_event.terminated`, `traceability_lot.split` / `.merged` / `.transformed` / `.consumed`, `critical_tracking_event.amended`, `key_data_element.validated`, `supplier_certification.uploaded` / `.renewed` / `.revoked` | Author the missing events; pair each with at least one cross-domain or intra-domain handoff per § B9 once modules land. |
| B1-S9 | B11 fail: 0 aliases on the 4 FOOD-TRACE-only masters. Statutory and vendor-specific synonyms are abundant in this market | Author cross-vendor and statutory alias rows: `traceability_lots` -> "lot", "batch", "production lot", "GS1 SSCC", "EPCIS aggregation"; `critical_tracking_events` -> "CTE" (FSMA abbreviation, mandatory), "EPCIS event", "supply chain event"; `key_data_elements` -> "KDE" (FSMA abbreviation, mandatory), "trace attribute", "lot attribute"; `recall_events` -> "withdrawal", "market withdrawal", "FSMA Reportable Food filing". Bundle into a cluster-drafts load. |
| B1-S10 | B12 fail: 0 lifecycle states on any of the 5 masters. Per Rule #12 every `master + required` data_object needs states; only config-shape exemption applies and none of these qualify | Author state machines per the per-master shapes in the B12 row above. Mark workflow-gate states `requires_permission=true` and set `domain_module_id` per realizing module once M1 cured. |
| B1-S11 | F1 + F7 fail: legacy `skills.id=62` (`food-trace-system`) at `domain_id=155`, `domain_module_id=null`. Once module-level system skills are authored (per F2 after M1), this becomes obsolete. F7 sub-finding: the `send_email` linkage is unjustified channel-pinning for recall notifications, supplier-cert-expiry alerts, CTE deviation pages | Sequenced: (1) author module-level system skills, (2) link channel abstractions (`notify_person` / `notify_team`) on the per-module skills, (3) DELETE legacy skill 62. Do not delete legacy before per-module skills exist. |
| B1-S12 | C2 review: `FOOD-TRACE-RECALL-EXECUTION` capability may diverge from the domain's GRC-Compliance owner toward GRC-Crisis or QA-Recall sub-functions | Bucket 2 review (whether to add a `business_function_capabilities` override). |

#### MISSING (data-object surface gaps)

| ID | Finding | Recommended fix |
| --- | --- | --- |
| B1-M1 | MISSING master: `traceability_queries` (regulator and partner trace-request workflow, FSMA 204 24-hour response SLA) | Load as FOOD-TRACE master under `FOOD-TRACE-QUERY` (or `FOOD-TRACE-CORE` in the 4-module split). |
| B1-M2 | MISSING master: `chain_of_custody_records` (cross-organization handoff attestation, EPCIS-native) | Load as FOOD-TRACE master under `FOOD-TRACE-LOT-GENEALOGY` or `FOOD-TRACE-PROVENANCE`. |
| B1-M3 | MISSING master: `provenance_attestations` (signed origin / method / certification claims, distinct from supplier certifications) | Load as FOOD-TRACE master under `FOOD-TRACE-PROVENANCE`. |
| B1-M4 | MISSING master: `recall_communications` (per-recipient communications log for FDA, distributors, retailers, consumers) | Load as FOOD-TRACE master under `FOOD-TRACE-RECALL`. |
| B1-M5 | MISSING master: `regulatory_filings` (FDA Reportable Food Registry submissions, USDA FSIS notifications, distinct from `recall_events`) | Load as FOOD-TRACE master under `FOOD-TRACE-RECALL`. |
| B1-M6 | MISSING master: `traceback_exercises` / `mock_traces` (scheduled traceback drills against historical CTEs to validate retrieval SLAs) | Load as FOOD-TRACE master under `FOOD-TRACE-QUERY` / `FOOD-TRACE-CORE`. |

#### APQC TAGGING

20 cross-domain handoffs total (8 outbound + 12 inbound). Existing tags: 0. H1 volume expectation: 10-16 agent_curated rows + 0-4 deferrals.

| ID | Finding | Recommended fix |
| --- | --- | --- |
| B1-H1 | APQC tagging for 20 cross-domain handoffs. Proposed `agent_curated` rows (record_status: `new`): | Load via the standard APQC tagging shape (see references/domain-audit-procedure.md § APQC TAGGING). |

Proposed agent-curated tags (15 high / medium confidence + 5 deferred):

| handoff_id | source -> target | trigger_event | payload | proposed APQC | external_id | level | confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 359 | FOOD-TRACE -> GRC | recall_event.initiated | recall_events | Initiate recall | 20111 | 3 | high |
| 360 | FOOD-TRACE -> ERP-FIN | recall_event.initiated | recall_events | Manage product recalls and regulatory audits | 20110 | 2 | medium |
| 361 | FOOD-TRACE -> FSQM | supplier_certification.expired | supplier_certifications | Certify and validate suppliers | 10289 | 4 | high |
| 362 | FOOD-TRACE -> SUP-LIFE | supplier_certification.expired | supplier_certifications | Monitor/Manage supplier information | 10299 | 4 | high |
| 971 | FOOD-TRACE -> FSQM | traceability_lot.created | traceability_lots | Maintain production records and manage lot traceability | 10370 | 3 | high |
| 972 | FOOD-TRACE -> GRC | critical_tracking_event.recorded | critical_tracking_events | Manage traceability data | 11749 | 4 | high |
| 973 | FOOD-TRACE -> AUDIT | key_data_element.captured | key_data_elements | Maintain records for regulatory agencies | 12773 | 5 | high |
| 974 | FOOD-TRACE -> AUDIT | critical_tracking_event.recorded | critical_tracking_events | Manage compliance audits | 12183 | 4 | medium |
| 351 | FMIS -> FOOD-TRACE | harvest_record.created | harvest_records | Maintain production records and manage lot traceability | 10370 | 3 | high |
| 356 | FSQM -> FOOD-TRACE | food_safety_incident.escalated | recall_events | Initiate recall | 20111 | 3 | high |
| 353 | DAIRY-MGMT -> FOOD-TRACE | bulk_milk_shipment.dispatched | bulk_milk_shipments | Maintain production records and manage lot traceability | 10370 | 3 | medium |
| 954 | MFG-OPS -> FOOD-TRACE | produced_unit.completed | produced_units | Maintain production records and manage lot traceability | 10370 | 3 | high |
| 955 | DAIRY-MGMT -> FOOD-TRACE | milking.completed | milkings | Maintain production records and manage lot traceability | 10370 | 3 | medium |
| 976 | FSQM -> FOOD-TRACE | critical_control_point.deviation | critical_control_points | Manage product recalls and regulatory audits | 20110 | 2 | medium |
| 978 | FSQM -> FOOD-TRACE | environmental_monitoring_sample.positive | environmental_monitoring_samples | Manage product recalls and regulatory audits | 20110 | 2 | medium |

Deferred to Discover Pass 3 (no clean cross-industry PCF match):

| handoff_id | source -> target | trigger_event | payload | Deferral reason |
| --- | --- | --- | --- | --- |
| 349 | FMIS -> FOOD-TRACE | harvest_record.created | harvest_records | Agriculture-specific harvest event has no cross-industry PCF activity; route to custom process (`agriculture.harvest_to_lot_origin` or similar) in Discover Pass 3. (Two FMIS rows on `harvest_records`, 349 and 351; treating 349 as the duplicate / older row and tagging 351 as the canonical above.) |
| 959 | DAIRY-MGMT -> FOOD-TRACE | feed_ration.changed | feed_rations | Feed traceability for organic / grass-fed claims has no cross-industry PCF; route to a custom `agriculture.feed_provenance` process. |
| 963 | FARMER-DIRECT-SALES -> FOOD-TRACE | butcher_order.ready | butcher_orders | Whole-animal direct-sales workflow is industry-specific; route to a custom process. |
| 965 | FMIS -> FOOD-TRACE | planting_record.completed | planting_records | Planting-origin event has no cross-industry PCF; route to custom `agriculture.planting_to_lot_provenance`. |
| 969 | FMIS -> FOOD-TRACE | farm_field.boundary_updated | farm_fields | Geo-origin metadata change has no cross-industry PCF; route to custom process. |

Note on handoff 349: appears to duplicate 351 (both FMIS -> FOOD-TRACE on `harvest_records`, both on event `harvest_record.created` with id 343 vs 1117, but the 1117 event is actually `traceability_lot.created` on data_object 494). 349 carries trigger_event 343 which is also `harvest_record.created`. Surface as a possible duplicate / mis-attribution for cleanup (see Bucket 2 #5).

### Bucket 2 — Surface-for-user (judgment calls)

1. **Module split shape.** Recommended default: 4 modules (`FOOD-TRACE-LOT-GENEALOGY`, `FOOD-TRACE-CTE-CAPTURE`, `FOOD-TRACE-RECALL`, `FOOD-TRACE-CORE` covering supplier-docs / provenance / query). Alternatives: (a) 6 modules per the larger enumeration in Pass 2; (b) 3-module starter (`LOT-GENEALOGY`, `CTE-CAPTURE`, `RECALL`); (c) 2 full modules (`LOT-GENEALOGY-AND-CTE`, `RECALL-AND-COMPLIANCE`) plus a single `FOOD-TRACE-LITE` starter. Decision unlocks every cascade (M2, M4, M5, M6, M7 within-domain, B9b, B10b, E1-E6, F2-F5). **Decision needed.**
2. **`supplier_certifications` mastership arbitration.** Catalog-wide M7 hard fail (dual-mastered by SUP-LIFE id 28 and FOOD-TRACE id 155). Vendor evidence is split: SUP-LIFE-shape vendors (Coupa, SAP Ariba, Ivalua) treat the cert as supplier-mastered; FOOD-TRACE-shape vendors (Trustwell, TraceGains, FoodLogiQ) treat it as cert-mastered because cert governs lot-level traceability under FSMA 204. Recommendation: SUP-LIFE keeps the catalog-wide master, FOOD-TRACE demotes to `embedded_master` once both sides modularize. Alternative: split into two data_objects (`supplier_certifications` mastered by SUP-LIFE for procurement-shape cert, `food_supplier_certifications` mastered by FOOD-TRACE for food-safety-shape cert). **Decision needed.**
3. **Regulations scope and depth.** Which regulations to link via `domain_regulations`: minimum set (FSMA 204, FSMA Preventive Controls, EU 1169/2011, Canada SFCR, USDA FSIS COOL, FDA Bioterrorism Act recordkeeping), or extended set including GS1 EPCIS 2.0 (industry standard, not statute), Codex Alimentarius (international guideline), state-level (California Prop 65, NY origin labeling). And how to handle FSMA 204 specifically (currently no `regulations` row may exist at all). **Decision needed.**
4. **`business_function_capabilities` override for `FOOD-TRACE-RECALL-EXECUTION`.** The capability's owning function may diverge from the domain's GRC-Compliance owner toward GRC-Crisis or QA-Recall sub-functions. **Decision needed.**
5. **Trigger-event 343 (`harvest_record.created` from FMIS, handoff 349) cleanup.** Appears to duplicate the more recent handoff 351 on the same payload / event. Likely a pre-modularization-era legacy row. Either DELETE handoff 349 (and trigger_event 343 if orphaned), or PATCH to a distinct sub-event (`harvest_record.lot_origin_emitted` for the FOOD-TRACE side). Confirm with FMIS audit findings. **Decision needed.**

### Bucket 3 — Phase 0 pending (speculative)

1. **`gs1_identifiers` mastership.** Whether FOOD-TRACE masters the GS1 GTIN / SSCC / GLN registry or whether it lives in PIM / MDM. IBM Food Trust and Wholechain treat GS1 identifiers as the substrate of every event; ReposiTrak and FoodLogiQ rely on external PIM. Vet via Phase 0 vendor research, weighing GS1 EPCIS 2.0 adoption depth in flagship vendor schemas.
2. **`food_traceability_list_classifications` mastership.** Whether the FTL (FSMA 204 Food Traceability List) classification per product is a FOOD-TRACE-mastered noun or a PIM column. TraceGains and Trustwell carry it as a first-class entity because FTL status drives the entire workflow gate; lighter products treat it as a boolean on product. Phase 0 worth confirming.
3. **`provenance_certificates` (consumer-facing) in scope or out.** Whether FOOD-TRACE generates QR / NFC consumer-facing provenance certificates (Provenance, Wholechain, Bext360 do this as flagship feature) or whether that belongs in a separate consumer-storytelling market (the new candidate `PROVENANCE-PLATFORM` queued in this audit). Phase 0 vet whether the consumer-storytelling slice is large enough to warrant a separate domain.
4. **`coa_records` / `certificates_of_analysis` mastership.** Per-shipment COAs differ from supplier-level certifications (recurring per lot, not per supplier). TraceGains and FoodLogiQ master COAs in food-trace; FSQM-shape platforms (SafetyChain, Safefood 360) master COAs in QMS. Vet via vendor research which mastership shape aligns with the catalog's broader QMS-vs-traceability split.

### Candidate domains queued (separate file)

Queued via `scripts/analytics/append_missing_domain.ts`:

- **PROVENANCE-PLATFORM** (Multi-Industry Provenance and Blockchain Traceability Platform) - NEW. Surfaced because pure-play provenance vendors (Provenance Ltd, Wholechain, Everledger for diamonds, Circularise for plastics, TextileGenesis for fashion) operate across food / fashion / electronics / minerals industries. Capabilities cover blockchain anchoring, cross-org chain-of-custody, NFC and QR consumer storytelling, sustainability claim verification. Distinct from FOOD-TRACE in that the demand driver is consumer trust and brand storytelling rather than regulatory CTE / KDE capture.
- **FOOD-LCA** (Food Lifecycle Carbon and Sustainability Accounting) - NEW. Surfaced because food-specific carbon accounting vendors (HowGood, CarbonCloud, Persefoni Food, Trace One Sustainability, Foodsteps, Vaayu Food) carry ingredient-level emissions models, farm-gate Scope 3 ingest, and on-pack carbon labels distinct from generic ESG platforms. Adjacent to FOOD-TRACE because both rely on the same lot / provenance substrate but answer different questions (where did this come from vs how much carbon did it emit).

### Cross-bucket dependencies

- **Bucket 1 fixes cascade through Bucket 2 #1.** All STRUCTURAL Bucket 1 items (M-band, B9b, B10b, E-band, F2-F5) and most MISSING items (B1-M1..M6 need a target module) cannot complete until the module split is decided. Sequence: Bucket 2 #1 first, then Bucket 1 module load, then the rest of Bucket 1.
- **Bucket 1 B1-S2 (M1 module load) is upstream of Bucket 2 #2.** The `supplier_certifications` arbitration depends on knowing which FOOD-TRACE module would host it (e.g., `FOOD-TRACE-SUPPLIER-DOCS` makes embedded_master coherent; if no such module exists, the answer changes).
- **Bucket 3 #1 (gs1_identifiers) and #2 (FTL classification) inform Bucket 2 #1** by adjusting which module hosts which noun. If both are FOOD-TRACE-mastered, `FOOD-TRACE-LOT-GENEALOGY` grows substantially; if both live in PIM / MDM, the module stays thin.
- **Bucket 3 #3 (consumer-facing provenance) interacts with the PROVENANCE-PLATFORM candidate.** If the candidate is promoted, the speculative `provenance_certificates` master likely moves there; if rejected, it lands in FOOD-TRACE.
- **Bucket 2 #5 (handoff 349 cleanup) blocks the APQC tag on handoff 349** (the duplicate row is excluded from B1-H1's curated tags; tagging it would propagate the duplication into APQC coverage). Resolve before any APQC TAGGING work touches handoff 349.

### Per-bucket prompts

- **Bucket 1 (13 STRUCTURAL + MISSING + APQC items).** *"Approve Bucket 1 items B1-S1..S12, B1-M1..M6, B1-H1 for fix loads? Recommended order: (1) author Bucket 2 #1 module split, (2) load modules + lifecycle states + pattern-flag review + intra-domain relationships + users edges + aliases + regulations, (3) clean up handoff 349 per Bucket 2 #5, (4) load APQC tags (excluding the deferred-to-Discover rows), (5) load missing masters M1..M6, (6) re-attribute or DELETE legacy skill 62 only after per-module skills exist. Confirm per-item approve / decline."*
- **Bucket 2 (5 judgment items).** *"Decisions needed: (1) module split shape (recommended: 4 modules LOT-GENEALOGY / CTE-CAPTURE / RECALL / CORE; alternatives: 6-module, 3-module starter, 2 full + 1 starter); (2) `supplier_certifications` mastership (SUP-LIFE keeps master with FOOD-TRACE demote to embedded_master, vs split into two data_objects); (3) regulations scope (minimum set: FSMA 204, FSMA Preventive Controls, EU 1169/2011, Canada SFCR, USDA COOL, FDA Bioterrorism Act; or extended); (4) `FOOD-TRACE-RECALL-EXECUTION` capability function-divergence override (yes / no); (5) handoff 349 cleanup (DELETE duplicate, PATCH to distinct sub-event, or keep). What's your call on each?"*
- **Bucket 3 (4 Phase-0 candidates).** *"Vet via Phase 0 vendor research, or eyeball-mode? Candidates: `gs1_identifiers` mastership (FOOD-TRACE vs PIM / MDM), `food_traceability_list_classifications` mastership (FOOD-TRACE vs PIM), `provenance_certificates` consumer-facing scope (FOOD-TRACE vs new PROVENANCE-PLATFORM candidate), `coa_records` mastership (FOOD-TRACE vs FSQM vs SUP-LIFE). Eyeball-mode recommendation: `gs1_identifiers` rings true as FOOD-TRACE-mastered for any vendor doing EPCIS, but lighter-weight platforms defer to PIM; FTL classification belongs in FOOD-TRACE because it gates the workflow; `provenance_certificates` defer pending PROVENANCE-PLATFORM triage; `coa_records` lean FOOD-TRACE in this catalog because the per-lot frequency matches the trace-event substrate better than the per-supplier QMS pattern."*

### Report-only follow-ups (owed by other domains)

| Owed by | Finding |
| --- | --- |
| SUP-LIFE M7 / B-band | Catalog-wide single-master conflict on `supplier_certifications` (id 498), dual-mastered by SUP-LIFE (28) AND FOOD-TRACE (155). Per Bucket 2 #2 recommendation, SUP-LIFE keeps master; FOOD-TRACE demotes. The cleanup load happens on whichever side surrenders the master; the surviving side then keeps its master row authoritative. Surface to SUP-LIFE audit. |
| MDM / SUP-LIFE catalog-wide M7 | `suppliers` (id 206) marked canonical bare-word for SUP-LIFE in the existing `naming_authority_rationale` ("multi-master is a metadata reality, SUP-LIFE lifecycle + MDM master record"). The bare-word claim is documented but the dual-mastership still violates M7's catalog-wide single-master rule until one side formally demotes. FOOD-TRACE is a consumer; conflict is upstream. |
| FSQM B10b | `target_domain_module_id` NULL on the 2 outbound rows FSQM -> FOOD-TRACE on `recall_events` payload (handoff 356) and other inbound rows. Cascade until FSQM modularizes. |
| FSQM B-band | `food_safety_incident.escalated -> FOOD-TRACE.recall_events` payload mismatch: trigger_event 348 has `data_object_id=510` (`food_safety_incidents`, FSQM-mastered) while handoff 356's payload is `recall_events` (FOOD-TRACE-mastered). Cross-domain spawn is correct (FSQM publishes the escalation event, payload lands on FOOD-TRACE's master), confirmed valid in FSQM audit. Already on FSQM's report. |
| FMIS B10b | `source_domain_module_id` NULL on all 4 outbound rows FMIS -> FOOD-TRACE (`harvest_record.created`, `field_application.recorded`, `planting_record.completed`, `farm_field.boundary_updated`). Cascade until FMIS modularizes. |
| FMIS B-band | Possible duplicate handoff 349 / 351 (both FMIS -> FOOD-TRACE on `harvest_records` payload, different trigger_event ids 343 vs 1117). Surface to FMIS audit to decide which is canonical. |
| AUDIT B10b | `target_domain_module_id` NULL on the 2 outbound rows FOOD-TRACE -> AUDIT. Once AUDIT modularizes, those should target-map to AUDIT's evidence-retention module. |
| DAIRY-MGMT B10b | `source_domain_module_id` NULL on the 3 outbound rows DAIRY-MGMT -> FOOD-TRACE (`bulk_milk_shipment.dispatched`, `milking.completed`, `feed_ration.changed`). Cascade until DAIRY-MGMT modularizes. |
| ERP-FIN B10b | `target_domain_module_id` NULL on the 1 inbound row FOOD-TRACE -> ERP-FIN (`recall_event.initiated`). Cascade until ERP-FIN modularizes the receiving module (likely inventory write-off / cost-recovery). |
| GRC B10b | `target_domain_module_id` NULL on the 2 outbound rows FOOD-TRACE -> GRC (`recall_event.initiated`, `critical_tracking_event.recorded`). Cascade until GRC modularizes. |
| MFG-OPS B10b | `source_domain_module_id` NULL on the 1 outbound row MFG-OPS -> FOOD-TRACE (`produced_unit.completed`). Cascade. |
| FARMER-DIRECT-SALES B10b | `target_domain_module_id` NULL on the 1 inbound row from FDS-BUTCHER module 123 (`butcher_order.ready`). Partial attribution: source side attributed, target side awaiting FOOD-TRACE M1. |

These items NEVER block FOOD-TRACE's audit closure; they surface so the user can decide whether to also schedule audits on the source domains.
