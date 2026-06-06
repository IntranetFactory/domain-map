# FOOD-TRACE audit history

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

## 2026-05-31, Continuation: B1 technical fixes

Loader: `.tmp_deploy/fix_food_trace_b1_technical_2026_05_31.ts`. Run from project root. Idempotent.

### Applied (17 writes)

- **ENUM BACKFILL (3 PATCHes)**: `trigger_events.event_category` from `""` to `"lifecycle"` for ids 1117 (`traceability_lot.created`), 1118 (`critical_tracking_event.recorded`), 1119 (`key_data_element.captured`). Names unambiguously describe lifecycle verbs.
- **B1-S6 user-edges (7 INSERTs)**: `data_object_relationships` from FOOD-TRACE masters to `users` (id 748), `many_to_many reference`, `owner_side=source`, per Rule #10 and the dairy-mgmt precedent. New row ids 1840-1846:
  - 1840 `traceability_lots` is created by users (required)
  - 1841 `critical_tracking_events` is recorded by users (required)
  - 1842 `critical_tracking_events` is verified by users (optional)
  - 1843 `key_data_elements` is captured by users (required)
  - 1844 `recall_events` is initiated by users (required)
  - 1845 `recall_events` is approved by users (required)
  - 1846 `recall_events` is communicated by users (optional)
- **B1-H1 handoff_processes (7 INSERTs)**: `proposal_source=agent_curated`. New row ids 649-655:
  - 649 handoff 359 -> 204 (Initiate recall)
  - 650 handoff 360 -> 37 (Manage product recalls and regulatory audits)
  - 651 handoff 362 -> 815 (Monitor/Manage supplier information)
  - 652 handoff 954 -> 171 (Maintain production records and manage lot traceability)
  - 653 handoff 972 -> 556 (Manage traceability data)
  - 654 handoff 973 -> 1830 (Maintain records for regulatory agencies)
  - 655 handoff 974 -> 1570 (Manage compliance audits)

### Audit-table H1 rows NOT loaded (existing or competing rows already present)

- 351 (171), 353 (171), 356 (204), 361 (805), 955 (171), 976 (37): matching `handoff_processes` row already loaded; skipped as duplicate.
- 971: audit asks process 171, but row 615 already binds 971 -> 818. Rubric does not license PATCH or competing append; skipped.
- 978: audit asks process 37, but row 611 already binds 978 -> 208. Same skip.

### Deferred (NOT applied)

- B1-S1 catalog_tagline / catalog_description (Rule #20).
- B1-S2 M1 zero modules (new entities; gated on Bucket 2 #1).
- B1-S3 regulations: zero matching `regulations` rows exist in catalog (FSMA, EU 1169/2011, SFCR, COOL, Bioterrorism Act, Reportable Food all absent); cannot INSERT `domain_regulations` without first creating new `regulations` rows, which is judgment work.
- B1-S4 pattern flag flips (deferred per rubric).
- B1-S5 B6 intra-domain `data_object_relationships` (not Rule #10 user-edges; verb selection is judgment).
- B1-S7 B8 outbound cross-domain DOR mirrors (judgment per neighbor, gated on payload owner identification).
- B1-S8 B9 missing events (new entities).
- B1-S9 B11 aliases (audit pre-specifies alias strings but not `alias_type` or industry_id / solution_id binding; bulk aliases without exact tuples deferred per rubric).
- B1-S10 B12 lifecycle states (gated on M1 modules for workflow-gate realizing-module attribution).
- B1-S11 F1 legacy skill 62 cleanup (sequenced after M1 module skills).
- B1-S12 C2 capability function-divergence (Bucket 2).
- B1-M1..M6 new master data_objects (new entities, gated on Bucket 2 #1).
- B10b FK PATCHes: cascade from M1 (no FOOD-TRACE modules exist to derive `source_domain_module_id` / `target_domain_module_id` from).
- Handoff 349 cleanup (Bucket 2 #5).

### Notes

- Status frontmatter left unchanged. Open questions (22) untouched; the deferred items remain on the Bucket 1 / Bucket 2 / Bucket 3 surfaces above.
- Per Rule #15, no `notes` columns populated on any of the 17 writes.
- Per Rule #1, `record_status` omitted on every insert; defaults to `new`.


## 2026-05-31, Audit

Structural Validate b1 pass (bands A, M, B5/B7/B9/B9b/B10b/B11/B12, C, D, E1-E5, F1-F5, H). Live state queried via `semantius` CLI (rule #0). Domain id 155.

### Summary

- **Current footprint.** 9 `domain_data_objects` rows: 5 masters (`traceability_lots` 494, `critical_tracking_events` 495, `key_data_elements` 496, `recall_events` 497, `supplier_certifications` 498 dual-mastered with SUP-LIFE), 1 contributor (`compliance_obligations` 287), 3 consumers (`harvest_records` 490, `bulk_milk_shipments` 506, `suppliers` 206). 6 capabilities. 7 solutions (6 primary, 1 secondary). **0 modules.** **0 regulations.** A4 catalog_tagline / catalog_description still empty. B7 users-edges loaded (7 rows from 2026-05-31 fix). B6 intra-domain `data_object_relationships` still 0. B8 outbound cross-domain DOR is 1 (`supplier_certifications updates suppliers` id 569). B11 aliases on the 4 FOOD-TRACE-only masters still 0 (2 aliases on co-mastered `supplier_certifications`). B12 lifecycle states still 0. F1 legacy `skills.id=62` still present, no module-anchored skills. **H1 APQC coverage is 19 of 20 cross-domain handoffs tagged `agent_curated` / `record_status=new`** (only handoff 963 from FARMER-DIRECT-SALES on `butcher_orders` remains untagged, per the 2026-05-30 deferral list).
- **Bucket 1 still open:** 12 items (S/A/M/B/F structural). Most are gated on Bucket 2 #1 (module split) or Bucket 2 #2 (`supplier_certifications` arbitration).
- **Bucket 2:** 5 judgment items carry over from 2026-05-30.
- **Bucket 3:** 4 Phase 0 candidates carry over.

### Pass 1, Structural diff vs 2026-05-30

S-band sweep rerun. Routing unchanged on every band except H1 (now mostly cured) and B7 (cured 2026-05-31).

| ID | Result | Routing |
| --- | --- | --- |
| A1 | pass | n/a |
| A2 | pass (6 capabilities) | n/a |
| A3 | pass (7 solutions) | n/a |
| A4 | FAIL: catalog_tagline / catalog_description still empty | Bucket 1 STRUCTURAL (B1-S1) |
| Regulations | FAIL: 0 `domain_regulations` rows | Bucket 1 STRUCTURAL (B1-S3) |
| M1 | FAIL (GATING): 0 `domain_modules` | Bucket 1 STRUCTURAL (B1-S2) |
| M2 / M4 / M5 / M6 | cascade from M1 | cascade |
| M7 | FAIL (catalog-wide): `supplier_certifications` id 498 has `role=master` rows in BOTH FOOD-TRACE (155) AND SUP-LIFE (28). Verified live | Bucket 2 #2 + report-only SUP-LIFE |
| M8 | cascade from M1 | cascade |
| B1 | pass (4 FOOD-TRACE-only masters plus 1 co-mastered) | n/a |
| B2 | pass | n/a |
| B3 | pass | n/a |
| B4 | FAIL: every master row still has all three pattern flags = false. Rule #12 requires positive consideration. Not auto-flipped | Bucket 1 STRUCTURAL (B1-S4) |
| B5 | pass (no `embedded_master` rows) | n/a |
| B6 | FAIL: 0 intra-domain `data_object_relationships` rows on masters 494/495/496/497/498 | Bucket 1 STRUCTURAL (B1-S5) |
| B7 | pass (7 users-edges loaded ids 1840-1846 on 2026-05-31) | n/a |
| B8 (outbound) | FAIL: only 1 outbound row (`supplier_certifications updates suppliers` id 569). 8 outbound handoffs expect roughly 6-8 mirror DOR rows | Bucket 1 STRUCTURAL (B1-S7) |
| B9 | partial: 5 trigger_events loaded for the 5 masters, each only the most-prominent verb; missing lifecycle and side-channel events per the 2026-05-30 enumeration | Bucket 1 STRUCTURAL (B1-S8) |
| B9b | n/a (M1 not cured) | cascade |
| B10b | FAIL: 19 of 20 cross-domain handoffs carry NULL `source_domain_module_id` and / or NULL `target_domain_module_id`. Only handoff 963 carries a partial source attribution (FDS module 123) | cascade from M1, plus report-only on every neighbor's B10b |
| B11 | FAIL: 0 aliases on the 4 FOOD-TRACE-only masters | Bucket 1 STRUCTURAL (B1-S9) |
| B12 | FAIL: 0 lifecycle states | Bucket 1 STRUCTURAL (B1-S10) |
| C1 | pass (1 owner, 2 contributors, 1 consumer) | n/a |
| C2 | judgment carry-over | Bucket 2 #4 |
| D1 | deferred until after fix loads | n/a |
| E1-E5 | cascade from M1 | cascade |
| F1 | FAIL: legacy `skills.id=62` at `domain_id=155`, `domain_module_id=null`. Sequenced after M1 | Bucket 1 STRUCTURAL (B1-S11) |
| F2-F5 | cascade from M1 | cascade |
| H1 | 19 of 20 tagged (`agent_curated`, `new`). Handoff 963 (FDS, `butcher_order.ready`) intentionally deferred to Discover Pass 3. H1 effectively closed for this audit pass | minor follow-up (Bucket 1 H, optional) |

### Pass 2, Market audit semantic findings

Carry-over from 2026-05-30. No new vendor research run this pass; the 6 MISSING masters (B1-M1 traceability_queries, B1-M2 chain_of_custody_records, B1-M3 provenance_attestations, B1-M4 recall_communications, B1-M5 regulatory_filings, B1-M6 traceback_exercises) remain gated on Bucket 2 #1 (target module). The WRONG-OWNERSHIP finding on `supplier_certifications` is the catalog-wide M7 hard fail and routes to Bucket 2 #2. No scope-creep. Modularization remains a Bucket 2 question.

### Pass 3, Neighbor discovery

Neighbor set unchanged from 2026-05-30 (FSQM, FMIS, AUDIT, GRC, DAIRY-MGMT, SUP-LIFE, ERP-FIN, MFG-OPS, FARMER-DIRECT-SALES). Edge weights unchanged. No new cross-domain handoffs loaded between audits.

### Pass 4, Pairwise reconciliation

No new pairwise findings beyond 2026-05-30. Every cross-domain handoff sits behind M1 (NULL FKs both sides for most rows). MISSING-RELATIONSHIP findings persist for FSQM, FMIS, GRC, DAIRY-MGMT neighbors (catalog-wide cross-domain `data_object_relationships` for FOOD-TRACE masters to neighbor masters still 0 outbound except the supplier-side `updates` row). Route as cascade items inside B1-S7.

### Bucket 1, In-scope confirmed gaps still open

| ID | Finding | Gating |
| --- | --- | --- |
| B1-S1 | A4: empty `catalog_tagline` and `catalog_description`. Draft per Rule #20 buyer voice, surface drafts before write | Rule #20 user approval |
| B1-S2 | M1: 0 modules. Recommended default 4 modules (LOT-GENEALOGY, CTE-CAPTURE, RECALL, CORE) | Bucket 2 #1 |
| B1-S3 | 0 `domain_regulations`. Minimum set FSMA 204, FSMA Preventive Controls, EU 1169/2011, Canada SFCR, USDA FSIS COOL, FDA Bioterrorism Act. Most underlying `regulations` rows likely missing too, run pre-flight against `/regulations` | Bucket 2 #3 |
| B1-S4 | Pattern flags all false, no positive review. Per Rule #12 a positive consideration is required. Per-row user confirmation needed before PATCH | user per-row approval |
| B1-S5 | B6: 0 intra-domain DOR. Cluster draft `traceability_lots originates critical_tracking_events`, `critical_tracking_events carries key_data_elements`, `recall_events targets traceability_lots`, `supplier_certifications authorizes traceability_lots`, `traceability_lots derived_from traceability_lots` | none, agent-solvable |
| B1-S7 | B8 outbound mirrors for 8 outbound handoffs. Only 1 row loaded today (id 569) | requires per-neighbor payload owner identification, partial agent-solvable |
| B1-S8 | B9 missing events. See 2026-05-30 enumeration | none structurally, agent-solvable |
| B1-S9 | B11: 0 aliases on 4 FT-only masters. Alias strings drafted on 2026-05-30 but lacked `alias_type` and industry / solution binding tuples | needs user tuple decisions |
| B1-S10 | B12: 0 lifecycle states. Workflow-gate states need `domain_module_id` once modules exist | Bucket 2 #1 module split |
| B1-S11 | F1 legacy skill 62 retire. Sequenced after module-level system skills | Bucket 2 #1 module split |
| B1-S12 | C2 capability-divergence override for `FOOD-TRACE-RECALL-EXECUTION` | Bucket 2 #4 |
| B1-M1 to B1-M6 | 6 new masters (`traceability_queries`, `chain_of_custody_records`, `provenance_attestations`, `recall_communications`, `regulatory_filings`, `traceback_exercises`) | Bucket 2 #1 module split |
| B1-H residual | Handoff 963 (FDS to FOOD-TRACE on `butcher_orders`) untagged; deferred to Discover Pass 3 per 2026-05-30 plan | research |

### Bucket 2, Surface-for-user judgment calls still open

Unchanged from 2026-05-30:

1. **Module split shape.** Recommended 4 modules (LOT-GENEALOGY, CTE-CAPTURE, RECALL, CORE). Alternatives 6-module, 3-module starter, 2-full plus 1 starter. Decision unlocks every M / B9b / B10b / E / F cascade.
2. **`supplier_certifications` mastership arbitration.** Catalog-wide M7 hard fail (SUP-LIFE id 28 plus FOOD-TRACE id 155 both `role=master`). Recommendation: SUP-LIFE keeps master, FOOD-TRACE demotes to `embedded_master`. Alternative: split into two data_objects.
3. **Regulations scope and depth.** Minimum set vs extended (GS1 EPCIS, Codex Alimentarius, state-level). And whether each underlying `regulations` row needs creating first.
4. **`business_function_capabilities` override** for `FOOD-TRACE-RECALL-EXECUTION` (GRC-Compliance vs GRC-Crisis vs QA-Recall).
5. **Handoff 349 cleanup.** Appears duplicate / older against 351 on `harvest_records`. DELETE or PATCH to distinct sub-event. (Note: 349 is currently tagged in `handoff_processes` since 2026-05-31; tag will need to follow whatever cleanup decision lands.)

### Bucket 3, Phase 0 pending speculative

Carry-over: `gs1_identifiers` mastership, `food_traceability_list_classifications` mastership, `provenance_certificates` scope, `coa_records` mastership. Plus candidate domains queued (`PROVENANCE-PLATFORM`, `FOOD-LCA`).

### Cross-bucket dependencies

Same as 2026-05-30: Bucket 1 STRUCTURAL items (M-band, B-band cascade, E, F2-F5) gated on Bucket 2 #1. Bucket 1 B1-M1 to B1-M6 also gated on Bucket 2 #1. Bucket 2 #2 gated on Bucket 2 #1 (need to know which FOOD-TRACE module would host the embedded shell). Bucket 3 #1 and #2 inform Bucket 2 #1 (whether modules grow or stay thin).

### Per-bucket prompts

- **Bucket 1:** *"12 STRUCTURAL plus 6 MISSING items remain. Most are gated on Bucket 2 #1 (module split) or Bucket 2 #2 (`supplier_certifications` arbitration). Can decide Bucket 2 first or approve the ungated Bucket 1 subset now (B1-S1 catalog UX drafting, B1-S5 intra-domain DOR cluster, B1-S8 trigger_events, B1-S9 aliases pending tuple decisions, B1-S12 capability-divergence)."*
- **Bucket 2 (5 judgment items):** identical to 2026-05-30.
- **Bucket 3 (4 Phase 0 candidates):** identical to 2026-05-30.

### Fixes applied this audit pass

None. Read-only audit. The 2026-05-31 continuation already applied the 17 write surfaces it could without judgment input.

### Report-only follow-ups owed by other domains

Carry-over from 2026-05-30: SUP-LIFE M7 / B-band (single-master conflict on `supplier_certifications`), MDM / SUP-LIFE catalog-wide M7 on `suppliers`, FSQM B10b plus B-band (`food_safety_incident.escalated` payload edge), FMIS B10b plus B-band (handoff 349 / 351 duplication), AUDIT B10b, DAIRY-MGMT B10b, ERP-FIN B10b, GRC B10b, MFG-OPS B10b, FARMER-DIRECT-SALES B10b (partial). None block FOOD-TRACE's audit closure.

### Status frontmatter

`feedback_needed` (Bucket 2 module split + supplier_certifications arbitration + regulations scope are gating). `next_action_by: user`.

## 2026-06-02 Audit (modularization)

### Summary

FOOD-TRACE was an unbuilt domain (0 `domain_modules`, M1 fail) with 6 capabilities and 9 assigned data_objects (5 master, 3 consumer, 1 contributor). This pass built the structural module set per Rule #14 without waiting on the B2-1 user decision, picking a coherent 3-module split that places every capability and every data_object. Scope was strictly modules plus entity assignment: no new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. The prior B2-1 question (2-to-6 module options) is now resolved in practice by the 3-full-module shape loaded here; the deferred MISSING masters (B1B-M1 to M6) and B3 candidates remain parked for a later research / build pass.

### Modules built (all module_kind=full, domain_id=155, industry_id=24 Food and Beverage Manufacturing)

- **FOOD-TRACE-TRACEABILITY-EVENTS** (id 256): capabilities CTE-CAPTURE (455), KDE-REPORTING (456), LOT-GENEALOGY (459). Masters traceability_lots (494), critical_tracking_events (495), key_data_elements (496). Consumers harvest_records (490), bulk_milk_shipments (506).
- **FOOD-TRACE-RECALL-MGMT** (id 257): capability RECALL-EXECUTION (458). Master recall_events (497). Contributor compliance_obligations (287).
- **FOOD-TRACE-SUPPLIER-PROVENANCE** (id 258): capabilities SUPPLIER-DOCS (457), PROVENANCE-VERIF (460). Master supplier_certifications (498). Consumer suppliers (206).

Totals: 3 modules, 6 DMC rows (every capability placed once, M4 satisfied), 9 DMDO rows. No empty module (each has at least 1 capability and at least 1 data_object).

### Industry attribution

Set `domain_modules.industry_id = 24` (Food and Beverage Manufacturing, NAICS 311-312) on all 3 modules. The domain description names the food manufacturer / distributor / grower-shipper subject to FSMA 204 as the buyer; id 24 is the single cleanest fit over Agriculture (20) or the retail / food-service rows.

### M7 catalog-wide master pre-check

Pre-check ran on all 5 candidate masters (494, 495, 496, 497, 498). Zero pre-existing `domain_module_data_objects` master rows for any of them, so all 5 are mastered in FOOD-TRACE. No demotions were required.

Note on B2-2: the prior audit flagged `supplier_certifications` (498) as a catalog-wide M7 hard fail because legacy `domain_data_objects` listed it as master in both SUP-LIFE and FOOD-TRACE. The authoritative DMDO junction tells a different story: 498 had NO master DMDO row anywhere before this pass (SUP-LIFE has not modularized). After this pass 498 has exactly one master DMDO row (FOOD-TRACE module 258) plus one contributor row (FSQM-AUDIT-SUPPLIER, module 264). M7 is satisfied today. B2-2 is retained as a forward-looking reconciliation: when SUP-LIFE modularizes it must NOT also master 498 (it should consume / embed), or the two sides must agree which keeps catalog mastership.

### Verification

- `domain_module_capabilities` for modules 256/257/258: 6 rows, all 6 capabilities placed exactly once.
- `domain_module_data_objects`: 9 rows; non-master roles and necessity preserved from legacy `domain_data_objects` (harvest_records / bulk_milk_shipments / suppliers = consumer/required; compliance_obligations = contributor/required).
- Each of the 5 masters appears exactly once catalog-wide and in-domain.
- No empty module.

### Fixes applied this audit pass

Loaded 3 `domain_modules`, 6 `domain_module_capabilities`, 9 `domain_module_data_objects` via `.tmp_deploy/modularize_food_trace_2026-06-02.ts` (idempotent). No other writes.

### Items unblocked by this build

M1 is now satisfied, so the following prerequisite-gated items move from b1b to actionable next pass: per-module system skills under Rule #17 / F2 / F3 (was B1B-S11, gated on B1B-S2), per-master lifecycle states with realizing module FK (B1B-S10), and cross-domain handoff module-FK backfill (B1B-B10b). The legacy domain-level system skill `skills.id=62` (food-trace-system, domain_module_id null) should be replaced by 3 per-module system skills and then deleted.

### Status frontmatter

`feedback_needed`. `next_action_by: agent` (b1a now holds the per-module system skill build plus the still-open catalog UX draft).

## 2026-06-06 - b1a execution

Executed all 5 `b1a` items against live `domain_map` (domain 155, modules 256/257/258, masters 494-498). All loaders idempotent, run from project root via `bun run`, record_status omitted (default `new`) on every insert, no `notes` columns written (Rule #15). Loaders in `.tmp_deploy/food_trace_*_2026_06_06.ts`.

### B1A-CATALOG-UX (DONE) - Rule #20 buyer-voice copy written into EMPTY catalog fields

Empty-guard confirmed all 8 fields were `""` before write; none overwritten. PATCHed:
- `domains` id 155: `catalog_tagline` + `catalog_description`.
- `domain_modules` id 256 (FOOD-TRACE-TRACEABILITY-EVENTS): `catalog_tagline` + `catalog_description`.
- `domain_modules` id 257 (FOOD-TRACE-RECALL-MGMT): `catalog_tagline` + `catalog_description`.
- `domain_modules` id 258 (FOOD-TRACE-SUPPLIER-PROVENANCE): `catalog_tagline` + `catalog_description`.

Buyer voice (workflow + value), no vendor/product names, anchored on FSMA-204 readiness, recall execution, lot genealogy, supplier-document ingest, provenance verification. Review signal carried by each row's `record_status`.

### B1A-S8 (DONE) - 16 trigger_events inserted on the 5 masters

All `event_category=lifecycle` (every name is a state verb; the only threshold-shaped event, `supplier_certification.expired`, already existed). `domain_module_id` set to the realizing module. New ids 1505-1520:
- recall_events (497, mod 257): 1505 `recall_event.classified`, 1506 `.notification_sent`, 1507 `.consolidated`, 1508 `.reconciled`, 1509 `.effectiveness_verified`, 1510 `.terminated`.
- traceability_lots (494, mod 256): 1511 `.split`, 1512 `.merged`, 1513 `.transformed`, 1514 `.consumed`.
- critical_tracking_events (495, mod 256): 1515 `.amended`.
- key_data_elements (496, mod 256): 1516 `.validated`, 1517 `.flagged_for_review`.
- supplier_certifications (498, mod 258): 1518 `.uploaded`, 1519 `.renewed`, 1520 `.revoked`.

trigger_events on FOOD-TRACE masters: 5 -> 21.

### B1A-S5 (DONE) - 5 intra-domain data_object_relationships (ids 2084-2088)

One row per verb plus inverse; `owner_side=source` on all; `relationship_kind=reference` for the 1:N master-to-master links (independent lifecycles; no cascade composition asserted on masters), `association` for the m2m links.
- 2084 `traceability_lots originates critical_tracking_events` (one_to_many, is_required=true).
- 2085 `critical_tracking_events carries key_data_elements` (one_to_many, is_required=true).
- 2086 `recall_events targets traceability_lots` (many_to_many, is_required=false).
- 2087 `supplier_certifications authorizes traceability_lots` (many_to_many, is_required=false, provenance basis).
- 2088 `traceability_lots derived_from traceability_lots` (many_to_many self-edge, is_required=false, split/merge/transform genealogy).

intra-domain DOR (both ends in masters): 0 -> 5.

### B1A-S10 (DONE) - entity_type classification + 30 lifecycle states

Prerequisite per Rule #12: PATCHed `data_objects.entity_type` on all 5 masters from `unclassified` -> `operational_workflow` (prior value `unclassified` on 494/495/496/497/498; all carry real workflows per the action and module descriptions). Without this the lifecycle states would be orphaned by the entity_type gate (B12/B13).

30 `data_object_lifecycle_states` rows authored; each master has exactly one `is_initial`, one `is_terminal`, unique monotonic `state_order`, and `domain_module_id` = realizing module. Workflow-gate states marked `requires_permission=true`:
- traceability_lots (494, mod 256): 8 states created/active/split/merged/transformed/recalled/consumed/archived; gates split, merged, transformed, recalled (`permission_verb_override=recall_lot`).
- critical_tracking_events (495, mod 256): 4 states recorded/validated/amended/closed; gates validated, amended.
- key_data_elements (496, mod 256): 4 states captured/validated/flagged/resolved; gates validated, resolved.
- recall_events (497, mod 257): 7 states initiated/classified/notification_sent/consolidating/reconciling/effectiveness_verified/terminated; gates initiated, classified, effectiveness_verified (`permission_verb_override=verify_effectiveness`), terminated. The Class I/II/III branches are captured as the `classified` state plus a record-level discriminator, not as three parallel lifecycle states (keeps single-initial / single-terminal / monotonic shape).
- supplier_certifications (498, mod 258): 7 states uploaded/verified/active/expiring/expired/renewed/revoked; gates verified, revoked.

lifecycle states on masters: 0 -> 30.

### B1A-SYS-SKILLS (DONE) - 3 per-module system skills, tools, skill_tools; legacy skill 62 retired

Re-read `tools` by natural key before creating (Rule #9, catalog-wide shared table). Reused existing rows: query_traceability_lots (485), query_critical_tracking_events (486), query_key_data_elements (487), query_recall_events (488), query_supplier_certifications (489), notify_person (913), notify_team (914), receive_webhook (896).

Created 7 new domain-specific `mutate` tools (`operation_kind=mutate`, `data_object_id` set, `coverage_tier=platform`): create_traceability_lot, record_critical_tracking_event, capture_key_data_element, initiate_recall, update_recall_event, create_supplier_certification, update_supplier_certification.

Created 3 `skill_type=system` skills (each `domain_id=155` per the `system` check constraint + matching the catalog-wide ATS pattern, plus `domain_module_id`):
- 369 `food_trace_traceability_events_agent` (mod 256): 7 tools (6 required), strict_score 0.86.
- 370 `food_trace_recall_mgmt_agent` (mod 257): 7 tools (5 required), strict_score 0.86.
- 371 `food_trace_supplier_provenance_agent` (mod 258): 4 tools (4 required), strict_score 1.00.

18 `skill_tools` rows. Per F7 / Channel-vs-capability rule, notifications link `notify_person` / `notify_team` abstractions only; NO `send_email` linked anywhere.

Then DELETEd legacy skill 62 (`food-trace-system`, `domain_id=155`, `domain_module_id=null`) and its 6 `skill_tools` rows (ids 563-568), only after confirming the 3 module system skills existed. Prior skill-62 tool links snapshot: query_traceability_lots(485), query_critical_tracking_events(486), query_key_data_elements(487), query_recall_events(488), query_supplier_certifications(489), send_email(37) - all `required`. F1 now passes (no `domain_id`-only system skill remains); F2 passes (exactly one system skill per module).

### Skipped / not executed

None of the 5 b1a items were skipped. b1b items (B1B-S3, B1B-S4, B1B-S7, B1B-S9, B1B-S12, B1B-B10b) and b2 items were left untouched per the rubric. The b2 `user_decision` items remain open and now drive `next_action_by: user`.

### Verification (live re-query)

trigger_events on masters: 21. lifecycle_states on masters: 30. intra-domain DOR: 5. masters with entity_type=operational_workflow: 5. FOOD-TRACE system skills: 3 (369/370/371, all module-anchored). Legacy skill 62: gone (0 rows).

### Status frontmatter

`feedback_needed`. `next_action_by: user` (b1a fully resolved and removed; b2 user-decision items B2-2/B2-3/B2-4/B2-5 are the highest open priority).

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
