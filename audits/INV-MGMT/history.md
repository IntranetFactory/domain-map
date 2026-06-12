# INV-MGMT audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 3 full modules (`INV-CORE-STOCK` 61, `INV-REPLENISHMENT` 62, `INV-KITTING` 63), zero starter modules, zero cross-cutting host junctions. 10 INV-mastered data_objects via DMDO (`inv_stock_items` 785, `inv_stock_locations` 786, `inv_stock_balances` 787, `inv_stock_movements` 788, `inv_stock_transfers` 789, `inv_cycle_counts` 790, `inv_inventory_lots` 791, `inv_serialized_units` 792, `inv_reorder_rules` 793, `inv_kit_definitions` 794), each appearing in exactly one DMDO master row. 8 capabilities (INV-MULTI-LOC-STOCK, INV-LOT-SERIAL-TRACKING, INV-REORDER-RULES, INV-ABC-XYZ-CLASS, INV-CYCLE-COUNTS, INV-STOCK-TRANSFERS, INV-AVAILABLE-TO-PROMISE, INV-KITTING-ASSEMBLY). 16 solutions linked (13 primary, 2 secondary, 1 partial: Cin7 Core, Fishbowl, Katana, Unleashed, inFlow, Fulfil, Linnworks, Brightpearl, Finale, Sortly, SOS Inventory, Zoho Inventory, plus secondary Ordoro, Microsoft Dynamics 365 Business Central, SAP Business One, Oracle NetSuite). 9 trigger_events. 10 outbound + 1 inbound cross-domain handoffs (11 cross-domain total). 0 intra-domain cross-module handoffs on a 3-module domain. 25 lifecycle states across 5 workflow-bearing masters (stock_movements, stock_transfers, cycle_counts, inventory_lots, serialized_units). 25 aliases across 9 of 10 masters. 0 system skills, 0 skill_tools, Semantius score uncomputable. 3 roles (WAREHOUSE-INVENTORY-MANAGER 10025 primary on stock + replenishment, secondary on kitting; SUPPLY-CHAIN-INVENTORY-PLANNER 10026 primary on replenishment, secondary on stock; FINANCE-INVENTORY-ACCOUNTANT 10027 secondary on stock + replenishment). 16 permissions, 7 role_permissions rows. 0 domain_regulations rows.

- **Vendor-surface basis (Pass 2 flagship enumeration):** Cin7 Core (formerly DEAR Systems), Fishbowl Inventory, Katana Cloud Inventory, Unleashed Software, inFlow Inventory, Fulfil, Linnworks, Brightpearl by Sage, Finale Inventory, Sortly, SOS Inventory, Zoho Inventory for the SMB and mid-market pure-play layer; Microsoft Dynamics 365 Business Central, SAP Business One, Oracle NetSuite for the suite-aligned coverage. SkuVault is a category competitor not yet in solutions; ShipBob is a 3PL with embedded inventory rather than a buyable inventory platform. Compliance-specialist coverage missing (no `domain_regulations` rows): FDA 21 CFR Part 211 (pharma stock controls), DEA Schedule II-V (controlled substances), FSMA-204 (food traceability, intersects with FDS), USDA / Title 21 / HAZMAT, plus financial reporting standards that bear on inventory cost layering (ASC 330 inventory valuation, IFRS IAS 2).

- **Bucket 1 (in-scope, agent fixable):** 6 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 5 items.

**Neighbor discovery (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):**

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| OMS | 2 | 0 | 2 (consumer on `inventory_locations` 425 + `order_allocations` 424 in INV; INV-CORE-STOCK embeds 425) | 1 (`inv_stock_balances informs_atp_of order_allocations`) | 5 | Pairwise (full) |
| FIN | 2 | 0 | 0 | 0 | 2 | Lightweight |
| CSM | 3 | 0 | 0 | 0 | 3 | Pairwise (full) |
| S2P | 1 | 0 | 2 (consumer on `purchase_orders` 73 in INV-REPLENISHMENT; consumer on `goods_receipts` 74 in INV-CORE-STOCK) | 1 (`inv_stock_items triggers_po_for purchase_orders`) | 4 | Pairwise (full) |
| B2C-COMM | 1 | 0 | 2 (embedded_master on `commerce_products` 384 in INV-CORE-STOCK; consumer on `commerce_orders` 381 in REPLENISHMENT + KITTING) | 2 (`inv_stock_items mirrors commerce_products`; `inv_serialized_units registers_warranty_against commerce_orders`) | 5 | Pairwise (full) |
| PIM | 0 | 1 | 0 | 1 (PIM `pim_products stocks_as inv_stock_items`) | 2 | Lightweight |
| GRC | 1 | 0 | 0 | 0 | 1 | Lightweight |
| SUP-LIFE | 0 | 0 | 1 (consumer on `suppliers` 206 in INV-REPLENISHMENT, canonical master in SUP-LIFE) | 0 | 1 | Lightweight |
| MDM | 0 | 0 | 1 (suppliers 206 also mastered in MDM via `domain_data_objects` rollup) | 0 | 1 | Lightweight |
| MFG-OPS | 0 | 0 | 1 (consumer on `production_orders` 595 in INV-KITTING, master in MFG-OPS) | 0 | 1 | Lightweight |
| WMS | 0 | 0 | 0 | 0 | 0 (not in catalog) | Candidate domain, see Bucket 3 |
| SCP | 0 | 0 | 0 | 0 | 0 (not in catalog) | Candidate domain, see Bucket 3 |
| FDS | 0 | 0 | 0 | 0 | 0 | Lightweight |

**Structural pass bands:**

- **S1 / S2 / S3** sweep findings: every domain-FK is non-zero except `domain_regulations` (zero rows, surface as Bucket 3 compliance candidate); per-module DMDO coverage rows present on every module (INV-CORE-STOCK 11 rows, INV-REPLENISHMENT 7 rows, INV-KITTING 6 rows); per-master indirect coverage: 5 of 10 masters have lifecycle states (stock_movements, stock_transfers, cycle_counts, inventory_lots, serialized_units), 5 masters declared config-shape exemption in `data_objects.notes` (stock_items, stock_locations, stock_balances, reorder_rules, kit_definitions); aliases populated on 9 of 10 masters (stock_movements has 2 aliases, stock_balances has 3, every master other than stock_locations has at least 2).
- **A1, A2, A3 pass.** Domains row carries all 7 business-metadata fields (crud_percentage 92, min_org_size `20 s <500`, cost_band `$`, certification_required false, usa_market_size_usd_m 1800 / 2024, business_logic populated). 8 capabilities. 16 solutions with coverage_level populated.
- **M1 pass.** 3 full modules.
- **M2 pass.** 8 capabilities, 3 modules; >=2 required.
- **M4 pass.** Every capability has a realizing module (538/539/542/543 to INV-CORE-STOCK, 540/541/544 to INV-REPLENISHMENT, 545 to INV-KITTING).
- **M5 advisory.** All 7 `requires_permission=true` lifecycle states carry `domain_module_id=null`. Acceptable on single-module masters where the gate is always reachable when the master is installed, but `inv_stock_movements` (788) is mastered in INV-CORE-STOCK while INV-KITTING contributes; INV-KITTING's contributions write through the canonical posting gate, so leaving NULL is plausible. Surface as B2-S3 for explicit confirmation.
- **M6 pass.** Each of the 3 modules realizes at least one capability.
- **M7 pass on positive checks.** Every INV master has exactly one DMDO `role='master'` row, catalog-wide (Query 1). Within-domain coherence (Query 2): 788 stock_movements has `master` in INV-CORE-STOCK and `contributor` in INV-KITTING; both rows live in the same domain, but `contributor + master` is not the forbidden `consumer + master` shape; passes. 785 stock_items appears `master` in INV-CORE-STOCK and `consumer` in INV-REPLENISHMENT + INV-KITTING; 787 stock_balances similarly `master` in INV-CORE-STOCK and `consumer` in INV-REPLENISHMENT + INV-KITTING. **M7 within-domain hard fail (Hard fail 2):** `master + consumer` rows on the same data_object across sibling modules of one domain. The same shape the CLM audit caught. See B1-S1.
- **B1 pass.** 10 masters.
- **B2 pass.** Every master carries `singular_label` and `plural_label`.
- **B3 pass.** Every master uses the prefixed `inv_` form except `inv_inventory_lots` and `inv_serialized_units` (both already prefixed); naming arbitration not required.
- **B4 partial.** Pattern flag positive re-evaluation: of 10 masters, 2 carry `has_submit_lock=true` (788 stock_movements, 790 cycle_counts), 1 carries `has_single_approver=true` (790 cycle_counts). None has `has_personal_content=true`. Re-evaluation candidates: 789 stock_transfers (movements posted on receipt are immutable, candidate `has_submit_lock=true`), 791 inventory_lots (`has_submit_lock=true` once posted, recall states are append-only). Surface as B2-S2.
- **B5 hard fail (DMDO scope).** Two `embedded_master` rows in INV-CORE-STOCK point at `commerce_products` (384) and `inventory_locations` (425); neither has a `role='master'` row anywhere in `domain_module_data_objects`, and neither is `kind='platform_builtin'`. Both DO have canonical masters in the legacy `domain_data_objects` rollup (`commerce_products` in B2C-COMM 71, `inventory_locations` in OMS 32), so the catalog itself is not orphaned, but the DMDO graph the deployer reads is broken pointers. See B1-S1.
- **B6 pass.** 16 intra-domain `data_object_relationships` rows; every master participates in at least one in-domain edge. Stock items hub is fully wired (balances, movements, lots, serial units, reorder rules, kit definitions all relate back to stock_items).
- **B7 pass.** 6 `users` edges across 4 masters (movements recorded_by, transfers requested_by + approved_by, cycle_counts counted_by + variance_approved_by, reorder_rules owned_by). Acceptable; stock_balances and stock_locations legitimately have no user actor.
- **B8 pass.** 5 outbound cross-domain relationship rows (mirrors, informs_atp_of, triggers_po_for, may_recall_shipments_of, registers_warranty_against). 1 inbound (PIM `pim_products stocks_as inv_stock_items`). Aligned with the handoff direction.
- **B9 partial.** 9 trigger_events loaded; all carry `event_category`. **Workflow-gate state coverage:** 7 of 22 lifecycle states have `requires_permission=true`. Missing matching `trigger_events`: `stock_movement.posted` and `stock_movement.reversed` on 788 (no events); `stock_transfer.approved` and `stock_transfer.reconciled` on 789 (no events; the existing 1203 `stock_transfer.received` covers the `received` state but not `approved` or `reconciled`); `cycle_count.variance_review` on 790 (only `variance_posted` 1202 exists, which covers terminal `posted`); `inventory_lot.recalled` covered by 1205; `serialized_unit.scrapped` on 792 (no event). Six trigger_event candidates. See B1-S2.
- **B9b hard fail.** 0 intra-domain cross-module handoffs on a 3-module domain. Expected pairs from the master relationship graph and the lifecycle state machine: (a) INV-REPLENISHMENT to INV-CORE-STOCK on `purchase_order.received` propagation into stock_movements posting; reorder_rule firing the `stock_item.below_reorder_point` signal that INV-CORE-STOCK consumes; (b) INV-CORE-STOCK to INV-REPLENISHMENT on `stock_balance.on_hand_changed` so the planner module recalculates reorder candidates; (c) INV-KITTING to INV-CORE-STOCK on `kit.assembled` so component-consumption movements post; (d) INV-CORE-STOCK to INV-KITTING on `stock_balance.allocated` for kit-assembly reservations. 3-5 candidate intra-domain handoffs. See B1-S3.
- **B10 report.** 1 inbound (PIM 1235, both module FKs populated, target_domain_module_id = 61). No further inbound report items.
- **B10b partial.** All 10 outbound handoffs (1050-1059) carry `target_domain_module_id=null` (S2P, OMS, FIN, CSM, GRC, B2C-COMM); per the B10b asymmetry rule this is owed by the target domains' audits, not INV-MGMT's fix. `source_domain_module_id` is populated on every outbound row. See B1-S4 (report-only).
- **B11 pass.** 9 of 10 masters carry aliases; `inv_stock_locations` (786) has zero alias rows, but the masters list aliases like `Stock Location`, `Warehouse`, `Branch`, `Site`, `DC`, `Bin`, `Zone` that vendor docs use distinctly. Surface as advisory (Bucket 2 nit, B2-S5).
- **B12 partial.** 5 masters with lifecycle states, 5 masters declaring `config-shape` exemption via `data_objects.notes`. Per Rule #15 (RESCINDED prior license for config-shape annotation in `notes`), the exemption text in `notes` requires explicit user approval to keep, or revert. See B2-S1.
- **C1 pass.** 1 owner row (Supply Chain), 2 contributor rows (Warehouse Operations, Finance), 1 consumer (Sales Operations).
- **C2 advisory.** Zero `business_function_capabilities` overrides; routinely zero is acceptable for INV-MGMT since every capability sits under Supply Chain. Pass.
- **D1 deferred.** UI spot-check is a user action, not audit-time.
- **E1 pass.** 3-module domain has 3 distinct roles. Multi-module domain threshold (>=3 distinct roles) satisfied.
- **E2 pass.** Every role spans >=2 modules: 10025 spans 3 modules, 10026 spans 2 modules, 10027 spans 2 modules.
- **E3 pass.** Every `role_modules` row carries `interaction_level` (no nulls in the surface).
- **E4 partial.** Roles bundle 2-3 permissions each (7 role_permissions across 3 roles). Per E4 the floor is `>=1 row per role`; passes. Workflow-gate permissions derived from M5 lifecycle states (`post_stock_movement`, `reverse_stock_movement`, `approve_stock_transfer`, `reconcile_stock_transfer`, `approve_cycle_count_variance`, `initiate_lot_recall`, `scrap_serialized_unit`) do not appear as explicit role_permissions on any of the 3 roles; expectation is `permission_hierarchy` expands `:manage` / `:admin` to include them. Surface as B2-S4.
- **E5 / E6 not checked in detail.** Path A and B not cross-checked; surface as audit gap on this run, not a finding.
- **F1 pass.** Zero legacy `domain_id`-only system skills.
- **F2 hard fail.** Zero `skill_type='system'` rows on any of the 3 modules. Rule #17 requires exactly one system skill per `domain_modules` row. See B1-S5.
- **F3 / F4 / F5 N/A.** Cannot evaluate without F2 fixed. Semantius score uncomputable on every INV module.
- **F7 N/A.** No skill_tools rows exist.
- **H1 hard fail.** 0 of 11 cross-domain handoffs carry `handoff_processes` rows; 0 `record_status='approved'`; 0 `agent_curated`. Volume expectation: 0.5N to 0.8N for N=11 means 5-9 agent_curated tags. See B1-H1.

INV-MGMT Semantius score: **uncomputable** (F2 has zero system skills; F5 cannot return a number). Operational score same.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 within-domain hard fail + B5 hard fail (DMDO master pointers)** | (a) `inv_stock_items` (785) coexists `master` in INV-CORE-STOCK (61) and `consumer + required` in INV-REPLENISHMENT (62) and INV-KITTING (63); (b) `inv_stock_balances` (787) coexists `master` in INV-CORE-STOCK and `consumer + required` in INV-REPLENISHMENT and INV-KITTING. Four `consumer + master-sibling` DMDO rows in total. The autonomous-deployable-units model accepts this only when the sibling is `embedded_master`, not `consumer`. (c) `commerce_products` (384) is `embedded_master` in INV-CORE-STOCK with NO `role='master'` DMDO row catalog-wide; same for `inventory_locations` (425). Canonical masters exist via the legacy `domain_data_objects` rollup (B2C-COMM owns commerce_products, OMS owns inventory_locations), but the DMDO graph the deployer reads is missing the master row, so the embedded-master pointer is broken. | Two parallel fixes. **(a + b) M7:** the agent default is DELETE the 4 sibling consumer rows (INV-REPLENISHMENT and INV-KITTING read 785 / 787 by reference). The alternative is PROMOTE each to `embedded_master` if the user wants standalone-deployable sibling modules; for stock_items the embedded_master case is plausible (an INV-REPLENISHMENT or INV-KITTING deployment without INV-CORE-STOCK still needs an item shell to attach reorder rules / kit definitions to). Surface as B2-S6 for the architectural choice. **(c) B5:** add `domain_module_data_objects` master rows for `commerce_products` on a B2C-COMM module and `inventory_locations` on an OMS module, both owed by the canonical-owning domain's audit. Report-only from INV-MGMT (B1-S4d, B1-S4e). |
| B1-S2 | **B9 missing trigger_events for workflow-gate states** | 6 `requires_permission=true` lifecycle states have no matching `trigger_events.event_name`: `inv_stock_movement.posted` (state 20 on 788), `inv_stock_movement.reversed` (state 30 on 788), `inv_stock_transfer.approved` (state 20 on 789), `inv_stock_transfer.reconciled` (state 60 on 789), `inv_cycle_count.variance_review` (state 30 on 790), `inv_serialized_unit.scrapped` (state 50 on 792). The existing `inv_inventory_lot.recall_initiated` (1205) covers state 40 on 791. | Insert 6 `trigger_events` rows, each `event_category='state_change'` (for posted, reversed, approved, reconciled, scrapped) or `lifecycle` (for variance_review as a flow stage), `data_object_id` pointing at the publishing master. Use the new `inv_stock_movement.posted` event as the trigger candidate for an intra-domain handoff into INV-REPLENISHMENT (per B1-S3). |
| B1-S3 | **B9b hard fail, missing intra-domain cross-module handoffs** | A 3-module domain has zero `handoffs` rows with `source_domain_id = target_domain_id = 164`. Expected candidates from the master relationship graph and lifecycle state machine: (a) INV-REPLENISHMENT to INV-CORE-STOCK on `purchase_order.received` propagating into a stock_movement post; (b) INV-CORE-STOCK to INV-REPLENISHMENT on `inv_stock_item.below_reorder_point` (which is the existing event 1199 cross-handed to S2P externally but should also flow into REPLENISHMENT internally so the planner can offer an alternative supplier); (c) INV-CORE-STOCK to INV-REPLENISHMENT on `inv_stock_balance.on_hand_changed` so the planner can recompute available-to-promise; (d) INV-KITTING to INV-CORE-STOCK on a new `kit.assembled` event so component-consumption movements post (INV-KITTING is already a `contributor` on stock_movements, so the relationship is wired but the event is missing); (e) INV-CORE-STOCK to INV-KITTING on `inv_stock_balance.allocated` (event 1201) so kit assemblers see component reservations. 4-5 candidate handoffs. | Author 4-5 intra-domain handoff rows with `source_domain_id=target_domain_id=164`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`. Three of them lean on existing events (1199, 1200, 1201); two need new events from B1-S2 (`stock_movement.posted`) and a new `inv_kit.assembled` trigger_event. Closes B9b. |
| B1-S4 | **B10b report-only (outbound NULLs owed by other domains)** | All 10 outbound handoffs carry `target_domain_module_id=null`. Per B10b asymmetry the target module is the target domain's audit work. INV-MGMT's `source_domain_module_id` is populated on every outbound row. | Schedule b1 audits for S2P (handoff 1050), OMS (1051, 1052), FIN (1053, 1054), CSM (1055, 1056, 1058), GRC (1057), B2C-COMM (1059) to populate their `target_domain_module_id` per the standard B10b backfill procedure. |
| B1-S5 | **F2 / F3 / F5 hard fail (Rule #17)** | Zero `skill_type='system'` rows on any of the 3 INV modules. Rule #17 requires exactly one system skill per `domain_modules` row, each with >=1 `skill_tools` rows. Semantius score uncomputable. | Author 3 system skills (`inv_core_stock_agent` on 61, `inv_replenishment_agent` on 62, `inv_kitting_agent` on 63) plus the floor `skill_tools` set per module (typical 5-20 tools mixing query / mutate / workflow-gate primitives). Phase-S work; not a single PATCH. |

#### APQC TAGGING (matches the SKILL anti-pattern: prior INV-MGMT phases shipped 11 cross-domain handoffs and zero APQC mapping)

0 of 11 cross-domain handoffs carry `handoff_processes` rows. Volume expectation per H1 (N=11): 5-9 agent_curated tags. The audit proposes the following candidates from the analyst's structural-pass model:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 1050 | INV-REPLENISHMENT -> S2P | `inv_stock_item.below_reorder_point` | `purchase_orders` | Manage raw material inventory (10310) parent or Manage and track inventory deployment (10353) | 826 or 852 | confident L4 |
| 1051 | INV-CORE-STOCK -> OMS | `inv_stock_balance.on_hand_changed` | `order_allocations` | Track product availability (10355) | 854 | confident L4 |
| 1052 | INV-CORE-STOCK -> OMS | `inv_stock_balance.allocated` | `order_allocations` | Track product availability (10355) | 854 | confident L4 |
| 1053 | INV-CORE-STOCK -> FIN | `inv_cycle_count.variance_posted` | `inv_cycle_counts` | Perform inventory accounting (10774) | 1326 | confident L4 |
| 1054 | INV-CORE-STOCK -> FIN | `inv_stock_transfer.received` | `inv_stock_transfers` | Manage warehouse transfers (20957) or Perform inventory accounting (10774) | 859 or 1326 | confident L4 |
| 1055 | INV-CORE-STOCK -> CSM | `inv_inventory_lot.expiry_warning` | `inv_inventory_lots` | Manage recall related communications (20113) or Manage product recalls and regulatory audits (20110) | 206 or 37 | medium |
| 1056 | INV-CORE-STOCK -> CSM | `inv_inventory_lot.recall_initiated` | `inv_inventory_lots` | Initiate recall (20111) | 204 | confident L3 |
| 1057 | INV-CORE-STOCK -> GRC | `inv_inventory_lot.recall_initiated` | `inv_inventory_lots` | Monitor and audit recall effectiveness (20115) | 208 | confident L3 |
| 1058 | INV-CORE-STOCK -> CSM | `inv_serialized_unit.warranty_activated` | `inv_serialized_units` | Process warranty claims (12669) parent or Define warranty claims (20089) | 201 or 122 | confident L3 |
| 1059 | INV-CORE-STOCK -> B2C-COMM | `inv_stock_item.created` | `commerce_products` | Track product availability (10355) | 854 | confident L4 |
| 1235 | PIM -> INV-CORE-STOCK (inbound) | `pim_product.published` | `inv_stock_items` | Track product availability (10355) | 854 | confident L4 |

11 candidate APQC tags total, all `proposal_source='agent_curated'`, `record_status='new'`. PCF ids verified against `/processes?source_framework=eq.apqc_pcf_cross_industry` during this audit.

#### Pairwise reconciliation (Pass 4) findings per neighbor (edge weight >= 3)

**OMS <-> INV-MGMT (weight 5).** Wired pairs: 2 (INV to OMS 1051 on_hand_changed -> order_allocations; INV to OMS 1052 allocated -> order_allocations). Section 2: both have NULL `target_domain_module_id` (OMS's B10b). Section 3: missing handoff candidates: OMS to INV on `order_allocation.released` (cancellation flow) so INV-CORE-STOCK can free the reservation; OMS to INV on `inventory_location.added` so INV-CORE-STOCK's embedded_master shell stays in sync; OMS to INV on `order_fulfilled` so stock_movements post issue records. Section 4: **B5 OMS audit work:** OMS must declare a `role='master'` DMDO row for `inventory_locations` (425) and `order_allocations` (424), surfaced from this audit as report-only B1-S4. Section 5: cross-relationship `inv_stock_balances informs_atp_of order_allocations` exists; no relationship for inventory_locations to INV's embedded shell.

**B2C-COMM <-> INV-MGMT (weight 5).** Wired pairs: 1 (INV to B2C-COMM 1059 stock_item.created -> commerce_products). Section 2: NULL target_domain_module_id (B2C-COMM's B10b). Section 3: missing handoffs B2C-COMM to INV-MGMT on `commerce_order.placed` for stock reservation (currently the flow goes through OMS); B2C-COMM to INV-MGMT on `commerce_product.updated` for SKU resync. Section 4: **B5 B2C-COMM audit work:** must declare a `role='master'` DMDO row for `commerce_products` (384) on the relevant B2C-COMM module so INV's `embedded_master` shell points at a real canonical owner. Section 5: cross-relationship `inv_stock_items mirrors commerce_products` exists; `inv_serialized_units registers_warranty_against commerce_orders` exists.

**S2P <-> INV-MGMT (weight 4).** Wired pairs: 1 (INV to S2P 1050 below_reorder_point -> purchase_orders). Section 2: NULL target_domain_module_id (S2P's B10b). Section 3: critical missing inbound: S2P to INV-MGMT on `purchase_order.received` so INV-CORE-STOCK can post the `goods_receipt` consumer record and create receiving stock_movements. The catalog has `purchase_orders` and `goods_receipts` as `consumer + required` in INV-MGMT (74, 73) but ZERO inbound handoffs from S2P, which means the receiving flow is unwired. Likely the biggest functional gap in INV-MGMT's boundary surface. Section 4: clean (no relationship gaps). Section 5: `inv_stock_items triggers_po_for purchase_orders` exists.

**CSM <-> INV-MGMT (weight 3).** Wired pairs: 3 (INV to CSM 1055 expiry_warning, 1056 recall_initiated, 1058 warranty_activated). Section 2: all 3 have NULL target_domain_module_id (CSM's B10b). Section 3: missing inbound candidate CSM to INV on `customer_return.received` so the returned serialized_unit posts a return stock_movement and the lot reactivation flow fires. Section 4: clean. Section 5: cross-relationship `inv_inventory_lots may_recall_shipments_of commerce_shipments` exists; `inv_serialized_units registers_warranty_against commerce_orders` exists.

**Lightweight neighbors (weight 1-2, one-line summaries):**

- **FIN <-> INV-MGMT (weight 2).** Outbounds 1053, 1054 have NULL target_domain_module_id (FIN's B10b). No relationship rows; the cost-layer posting flows entirely through stock_movements.
- **PIM <-> INV-MGMT (weight 2).** Inbound 1235 fully populated (both module FKs). Cross-relationship `pim_products stocks_as inv_stock_items` exists. Healthy boundary.
- **GRC <-> INV-MGMT (weight 1).** Outbound 1057 has NULL target_domain_module_id (GRC's B10b). No relationship row; recall evidence chain is implicit.
- **SUP-LIFE <-> INV-MGMT (weight 1).** Zero handoffs. `suppliers` consumed by INV-REPLENISHMENT; SUP-LIFE owns canonical master. Surface as B5 SUP-LIFE audit work: SUP-LIFE must declare a DMDO `role='master'` row on `suppliers` (206). Report-only from INV.
- **MDM <-> INV-MGMT (weight 1).** Zero handoffs. `suppliers` also rollup-mastered in MDM. Surface dual-mastery as a Bucket 2 ambiguity for whoever runs the MDM and SUP-LIFE audits.
- **MFG-OPS <-> INV-MGMT (weight 1).** Zero handoffs. `production_orders` consumed by INV-KITTING. MFG-OPS owes a `production_order.completed` outbound handoff into INV-KITTING so kit-assembly completion posts stock_movements.

#### Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | M7 hard fail (4 sibling consumer DMDOs) + B5 hard fail (2 broken embedded_master pointers); requires B2-S6 architectural choice for the M7 half before fix loads |
| B1-S2 | Insert 6 missing `trigger_events` for workflow-gate states |
| B1-S3 | Author 4-5 new intra-domain cross-module handoff rows (depends on B1-S2 plus 1 new `inv_kit.assembled` event) |
| B1-S4 | Report-only, 10 outbound NULL target_module_id, schedule audits on S2P, OMS, FIN, CSM, GRC, B2C-COMM; also B5 audit work owed by B2C-COMM (commerce_products), OMS (inventory_locations + order_allocations), SUP-LIFE (suppliers) |
| B1-S5 | F2 / F3 / F5 hard fail, author 3 system skills + skill_tools floor on all 3 INV modules |
| B1-H1 | APQC TAGGING, propose 11 `agent_curated` rows across the 11 cross-domain handoffs |

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| MISSING (entity gap, vetted in structural pass) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | 4 (B1-S1, B1-S2, B1-S3, B1-S5) |
| BOUNDARY (NULL FK or missing handoff) report-only | 1 (B1-S4) |
| APQC TAGGING | 1 (B1-H1 spanning 11 handoffs) |
| **Bucket 1 total** | 6 items |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #15 notes-pollution on 7 `data_objects` rows.** `inv_stock_items` (785), `inv_stock_locations` (786), `inv_stock_balances` (787), `inv_reorder_rules` (793), `inv_kit_definitions` (794) carry `notes` declaring the B12 config-shape exemption ("Config-shape master. SKU is created and edited inline through admin UI..." and similar). `inv_stock_movements` (788) carries notes on the `has_submit_lock=true` reasoning. `inv_cycle_counts` (790) carries notes on the `has_single_approver=true` pattern. Rule #15 RESCINDED the prior license for config-shape annotation in `data_objects.notes` and for pattern-flag context. Were these notes user-approved at load time, or auto-populated? | Cannot tell from audit alone; load-time approval status unknown. | (a) Confirm user-approved at load time, leave in place. (b) Confirm auto-populated, PATCH all 7 rows' `notes` to empty string and log the Rule #15 incident in `references/skill-changelog.md`. |
| B2-S2 | **B4 pattern-flag positive re-evaluation per Rule #12.** Current flags: `inv_stock_movements.has_submit_lock=true` (correct, append-only ledger); `inv_cycle_counts.has_submit_lock=true` and `has_single_approver=true`; remaining 8 masters all-false. Re-evaluation candidates: `inv_stock_transfers.has_submit_lock` should likely be `true` once received (the lines are immutable post-receipt); `inv_inventory_lots.has_submit_lock` should likely be `true` once a recall is initiated; `inv_serialized_units.has_submit_lock` should likely be `true` once scrapped (the unit can't return to in_stock); `inv_stock_items.has_personal_content` should remain `false` (SKU master has no PII); `inv_serialized_units.has_personal_content` could be `true` only if buyer registration info is captured on the unit (depends on whether warranty-customer tie lives here or in CSM). | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no from user; capture in Decisions. |
| B2-S3 | **M5 advisory, lifecycle state `domain_module_id` always NULL.** All 7 `requires_permission=true` lifecycle states leave `domain_module_id` NULL. Acceptable when the gate is always reachable when the master is installed, but the permission materialization rule would then prefix every workflow-gate permission with the master's owning module (INV-CORE-STOCK / INV-REPLENISHMENT) automatically. Is the intent that the gates are always reachable when the master is installed, or should specific gates be pinned to a module (e.g. `approve_cycle_count_variance` on INV-CORE-STOCK only since cycle counts are mastered there)? | Permission scope intent the user owns. | (a) Leave NULL, trust the materialization to prefix by master module. (b) PATCH `domain_module_id` per-state to pin the realizing module explicitly. |
| B2-S4 | **E4 / E6 permission-bundle drift.** The 7 workflow-gate permissions implied by lifecycle states (`post_stock_movement`, `reverse_stock_movement`, `approve_stock_transfer`, `reconcile_stock_transfer`, `approve_cycle_count_variance`, `initiate_lot_recall`, `scrap_serialized_unit`) are not enumerated in any of the 3 role bundles. WAREHOUSE-INVENTORY-MANAGER bundles 3 permissions (10121, 10124, 10126), SUPPLY-CHAIN-INVENTORY-PLANNER bundles 2, FINANCE-INVENTORY-ACCOUNTANT bundles 2. The bundles rely entirely on `permission_hierarchy` to expand `:manage` / `:admin` tier permissions to include the gates. Question: is this implicit-grant pattern intentional, or should specific gates be enumerated (e.g. `approve_stock_transfer` on WAREHOUSE-INVENTORY-MANAGER, `approve_cycle_count_variance` on FINANCE-INVENTORY-ACCOUNTANT given the accounting variance review)? | Permission hierarchy seeding state isn't introspected here. | (a) Confirm hierarchy expands gates, leave bundles as-is. (b) Add explicit gate grants for FINANCE-INVENTORY-ACCOUNTANT on `approve_cycle_count_variance` and SUPPLY-CHAIN-INVENTORY-PLANNER on the reorder-related gates. (c) Drift accepted, full hierarchy materialization expected. |
| B2-S5 | **B11 advisory, missing aliases on `inv_stock_locations`.** Zero alias rows. Vendor synonyms in this market are `Warehouse` (NetSuite, Cin7), `Branch` / `Site` (Sage, MS BC), `DC` / `Distribution Center` (enterprise), `Hub`, `Bin` / `Zone` (sub-location granularity). Should the master carry these aliases? | Whether to load these as `synonym` rows or treat the master as self-explanatory. | (a) Load 4-6 alias rows. (b) Accept as self-explanatory; record exemption in this audit. |
| B2-S6 | **M7 architectural choice for INV module deployability.** B1-S1 surfaces 4 sibling consumer DMDO rows that violate M7 within-domain coherence (inv_stock_items consumer in INV-REPLENISHMENT + INV-KITTING; inv_stock_balances consumer in INV-REPLENISHMENT + INV-KITTING). The agent default is DELETE (the rows go away; sibling modules read by reference). The alternative is PROMOTE each row to `embedded_master` so INV-REPLENISHMENT and INV-KITTING are standalone-deployable. **Standalone INV-REPLENISHMENT without INV-CORE-STOCK plausibly needs an item shell** to attach reorder rules to and an aggregate balance shell to drive the threshold check. Same for INV-KITTING: kit definitions need item shells. So PROMOTE looks more market-aligned here than the CLM case where DELETE was clearly right. Recommendation: PROMOTE all 4 to `embedded_master`. | Architectural intent and deployability strategy decision; user's call. | (a) DELETE all 4 sibling consumer rows. (b) PROMOTE all 4 to embedded_master. (c) Mixed (specify per row). |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against Cin7, Fishbowl, Katana, Unleashed, inFlow, Fulfil, Linnworks, Brightpearl, Finale, Sortly, SOS Inventory, Zoho Inventory, plus the suite-aligned coverage in Microsoft Dynamics 365 BC, SAP Business One, Oracle NetSuite. The compliance anchor is currently missing (zero `domain_regulations` rows). Speculative candidates below come from the analyst's flagship-vendor knowledge and are NOT vetted gaps until a Phase 0 subagent pass runs.

#### MISSING (3) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `inv_demand_forecasts` | Cin7 Core, Brightpearl, Fulfil, NetSuite, MS Dynamics 365 BC ship lightweight forecast records distinct from full SCP demand forecasts (rolling 30/60/90-day item-level demand based on sales history, not a full MRP model). Currently the catalog folds forecasting entirely into SCP (which is not yet loaded as a domain). For INV-MGMT's SMB-band scope the embedded forecast is the right surface. | INV-REPLENISHMENT (master) or new INV-FORECASTING module |
| `inv_landed_costs` | Cin7, Fishbowl, Unleashed, Finale, SOS Inventory all model landed-cost records (freight + duty + insurance + handling) as separate from the stock_movement cost layer; the landed cost flows into ASC 330 / IAS 2 inventory valuation. Currently the cost layering is implicit on stock_movements. | INV-CORE-STOCK (master) or a new INV-COSTING module |
| `inv_consignment_stock` | NetSuite, Fishbowl, Brightpearl, Linnworks support consignment-in (supplier-owned stock on premise) and consignment-out (customer-held stock owned by us). Currently no consignment ownership distinction on stock_items. | INV-CORE-STOCK (master) or extension column on stock_items |

#### Compliance regulation candidates (zero `domain_regulations` rows currently)

| Candidate regulation | Why | Coverage in vendors |
|---|---|---|
| FDA 21 CFR Part 211 (cGMP for finished pharmaceuticals) | Lot tracking, segregation, expiry handling, recall. INV-MGMT serves pharma SMBs. | Vendor specialists like SOS Inventory (QuickBooks-aligned), Fishbowl, Cin7. |
| FSMA-204 (Food Traceability Rule) | Lot-to-shipment traceability for designated foods. Intersects with FDS but INV-MGMT carries the lot master. | Brightpearl, Cin7 Core, NetSuite (with Foodbam / etc.). |
| DEA Schedule II-V (Controlled Substances Act) | Serialized unit tracking, two-person variance, ATF-grade audit trail. | Pharma-shape vendors and specialized add-ons. |
| ASC 330 Inventory and IFRS IAS 2 | FIFO / LIFO / weighted-average cost layering; impairment testing; lower-of-cost-or-net-realizable. | Every accounting-integrated solution declares compliance. |
| Hazmat / DOT Title 49 | Hazmat labeling, segregation, recordkeeping for inventory of regulated chemicals. | NetSuite, Microsoft Dynamics 365 BC, SAP Business One. |

#### MODULARIZATION (2) candidates

- **INV-FORECASTING split candidate.** If `inv_demand_forecasts` lands as a master, a 4th module (`INV-FORECASTING`) makes sense given the workflow shape (forecast generation, accuracy tracking, override approval) is distinct from REPLENISHMENT's reorder-rule firing. Would push capability-to-module mapping from 8-to-3 toward 8-to-4.
- **INV-POS-STARTER candidate.** A `module_kind='starter'` for small retail with one location, no kitting, simple reorder. Bundles embedded shells from INV-CORE-STOCK + INV-REPLENISHMENT minus lot / serial / cycle-count complexity. Marketing-aligned with Sortly and inFlow's entry-tier positioning.

#### Candidate-domain queue

This audit surfaced 2 domain-tier candidates for `audits/_missing-domains.md`:

- **WMS (Warehouse Management)** for the pure-play warehouse execution layer (picking, packing, slotting, wave planning, RF / scanner-driven workflows). Vendors: Manhattan WMS, Blue Yonder WMS, Korber One Warehouse, Softeon WMS, HighJump, Logiwa. Adjacent to INV-MGMT (WMS owns location-grain stock movements and bin-management while INV-MGMT owns SKU-level reorder logic and lot accounting). Several handoffs between INV-MGMT and WMS would naturally exist (pick.confirmed -> inv_stock_movement post; receiving completed -> goods_receipt). Currently both flows are folded into INV-CORE-STOCK.
- **SCP (Supply Chain Planning)** for the demand-forecasting / S&OP / MRP-light layer. Vendors: o9, Kinaxis, Anaplan SCP, Blue Yonder Demand, Logility, ToolsGroup. Adjacent to INV-MGMT (SCP owns the demand forecast, INV-MGMT consumes for reorder timing). The 3 INV-MGMT outbound handoffs to OMS / FIN suggest the upstream-planning surface is currently invisible.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces a Phase 0 markdown at `c:/tmp/INV-MGMT-phase0-<date>.md`) or eyeball-mode (user names which of the 3 entities + 5 regulations + 2 modularization candidates to treat as confirmed). The 2 domain candidates (WMS, SCP) follow the standard `append_missing_domain.ts` flow.

### Cross-bucket dependencies

- **B1-S1 is gated on B2-S6**: the DELETE vs PROMOTE choice for the 4 sibling consumer rows must come from the user before the M7 fix loads.
- **B1-S3 partially depends on B1-S2**: the new `inv_stock_movement.posted` event from B1-S2 and a new `inv_kit.assembled` event are used by B1-S3 intra-domain handoffs.
- **B1-S5 is independent** but the system-skill authoring is a sizeable Phase-S workload (3 skills, 30-60 skill_tools rows), not a single PATCH.
- **B2-S1 (Rule #15 notes) is independent** of every other bucket.
- **B2-S2 (pattern flags) is independent** of every other bucket.
- **B2-S4 (permission-bundle drift) is independent** of other buckets.
- **Bucket 3 MISSING entities (`inv_demand_forecasts`, `inv_landed_costs`, `inv_consignment_stock`) might inform Bucket 2 modularization questions and the WMS / SCP candidate-domain decisions.** Calling this out per the surface-time discipline.
- **Buckets 2 and 3 are otherwise independent of each other.** You can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with `all`, or a list (e.g. `S2, S3, S5, H1`), or `skip`.

- **S1 (M7 hard fail + B5 broken pointers)** is gated on B2-S6; resolve that first.
- **S2 (6 new `trigger_events` for workflow-gate states)** is structural; no other dependencies.
- **S3 (4-5 new intra-domain handoffs)** depends on S2 (needs new events first).
- **S4 (B10b report-only outbound + B5 audit work owed)** schedules 6 + 3 = 9 other-domain audits or DMDO inserts; not INV's fix.
- **S5 (F2 / F3 / F5 hard fail, 3 system skills + skill_tools)** is structural; standalone Phase-S authoring task.
- **H1 (11 APQC tags)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (Rule #15 notes-pollution on 7 data_objects):** the audit can revert if you confirm auto-population. If they were approved at load, say so and I leave them.
- **B2-S2 (pattern flag re-evaluation):** per-flag yes/no on `has_submit_lock` for stock_transfers / inventory_lots / serialized_units, and `has_personal_content` for serialized_units.
- **B2-S3 (M5 lifecycle state `domain_module_id` NULL):** keep NULL (option a) or pin per-state (option b)?
- **B2-S4 (permission-bundle drift):** which option (a / b / c)?
- **B2-S5 (`inv_stock_locations` aliases):** load 4-6 alias rows (option a) or accept as self-explanatory (option b)?
- **B2-S6 (M7 architectural choice for 4 rows):** (a) DELETE all 4, (b) PROMOTE all 4 to embedded_master, (c) mixed (specify per row).

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 3 entity candidates + 5 regulation candidates + 2 modularization candidates + 2 domain candidates (WMS, SCP) to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| S2P | B10b: populate `target_domain_module_id` on outbound 1050 (`below_reorder_point` -> `purchase_orders`). **Missing inbound from S2P to INV-MGMT** on `purchase_order.received` so INV-CORE-STOCK posts goods_receipts and receiving stock_movements. Add `consumer + required` DMDO rows on `purchase_orders` (73) and `goods_receipts` (74) for the canonical S2P modules so this domain's `consumer` rows have a counterparty `master`. |
| OMS | B10b: populate `target_domain_module_id` on outbounds 1051, 1052. **B5 OMS audit work:** add `role='master'` DMDO row for `inventory_locations` (425) and `order_allocations` (424) so INV's `embedded_master` shell and `consumer` row point at a real canonical owner. |
| B2C-COMM | B10b: populate `target_domain_module_id` on outbound 1059 (`stock_item.created` -> `commerce_products`). **B5 B2C-COMM audit work:** add `role='master'` DMDO row for `commerce_products` (384). Add `consumer` DMDO on `inv_stock_items` (785) on whichever B2C-COMM module consumes the SKU catalog. |
| FIN | B10b: populate `target_domain_module_id` on outbounds 1053, 1054. Add `consumer` DMDO on `inv_cycle_counts` (790) and `inv_stock_transfers` (789) on the receiving FIN module for the inventory accounting flow. |
| CSM | B10b: populate `target_domain_module_id` on outbounds 1055, 1056, 1058. Add `consumer` DMDO on `inv_inventory_lots` (791) and `inv_serialized_units` (792) on the relevant CSM modules so recall trace and warranty registration land on a typed payload. |
| GRC | B10b: populate `target_domain_module_id` on outbound 1057. Add `consumer` DMDO on `inv_inventory_lots` (791) for the recall evidence chain. |
| SUP-LIFE | B5 SUP-LIFE audit work: add `role='master'` DMDO row for `suppliers` (206) on the canonical SUP-LIFE module so INV-REPLENISHMENT's `consumer` row points at a real DMDO master. |
| MDM | B5 dual-mastery: SUP-LIFE and MDM both rollup-master `suppliers` (206) in legacy `domain_data_objects`. Surface as a master-uniqueness question for the MDM and SUP-LIFE audits. |
| MFG-OPS | Missing outbound MFG-OPS to INV-KITTING on `production_order.completed` so kit-assembly completion posts component-consumption stock_movements. INV-KITTING's `production_orders` consumer is currently dangling. |
| PIM | Inbound 1235 fully wired; no follow-up. |

### Decisions

_(no decisions yet, status: feedback_needed)_

### Fixes applied

_(none yet)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

Subagent pass restricted to truly-technical, audit-pre-specified residual B1 items.
Loader: `.tmp_deploy/fix_inv_mgmt_b1_technical_2026_05_31.ts`.

### Applied (TECHNICAL)

| Item | Action | Result |
|---|---|---|
| B1-S2 | INSERT 6 `trigger_events` for workflow-gate states pre-specified in the audit (publishing master + from_state/to_state derived from `data_object_lifecycle_states`). `event_category` set per audit (5 `state_change`, 1 `lifecycle` for `variance_review`). `record_status` omitted (DB default `new` per Rule #1). | New ids 1478-1483: `inv_stock_movement.posted` (1478), `inv_stock_movement.reversed` (1479), `inv_stock_transfer.approved` (1480), `inv_stock_transfer.reconciled` (1481), `inv_cycle_count.variance_review` (1482), `inv_serialized_unit.scrapped` (1483). |
| B1-H1 (single-PCF subset) | INSERT 5 `handoff_processes` rows for handoffs where the audit specifies a single confident PCF: (1053, 1326), (1056, 204), (1057, 208), (1059, 854), (1235, 854). `role='implements'`, `proposal_source='agent_curated'`, `record_status` omitted. PCF ids verified `source_framework='apqc_pcf_cross_industry'` pre-flight. | 5 new rows inserted. Combined with the 2 pre-existing (1051, 1052 -> 854), 7 of 11 cross-domain handoffs now carry APQC tags. |

### Deferred

| Item | Reason |
|---|---|
| B1-S1 (M7 + B5) | M7 half gated on B2-S6 user pick (DELETE vs PROMOTE the 4 sibling consumer rows on `inv_stock_items` 785 and `inv_stock_balances` 787). B5 half is owed by B2C-COMM (commerce_products 384 master) and OMS (inventory_locations 425 master), report-only from INV-MGMT. |
| B1-S3 (4-5 intra-domain handoffs) | New handoff rows are not in the technical allow-list for residual passes (would create new business connections + requires the not-yet-loaded `inv_kit.assembled` trigger_event). Surface as user-confirm batch. |
| B1-S4 (B10b report-only) | Owed by S2P / OMS / FIN / CSM / GRC / B2C-COMM audits per the B10b asymmetry rule; no INV-MGMT write. |
| B1-S5 (F2/F3/F5: 3 system skills + skill_tools) | Full Phase-S authoring load (3 skills + 30-60 `skill_tools` rows); not a single-PATCH technical fix. |
| B1-H1 multi-PCF rows (4 handoffs) | Audit lists two PCF candidates per row; user picks. Pending: 1050 (PCF 826 or 852, REPLENISHMENT -> S2P), 1054 (PCF 859 or 1326, INV -> FIN on transfer.received), 1055 (PCF 206 or 37, medium confidence, INV -> CSM on expiry_warning), 1058 (PCF 201 or 122, INV -> CSM on warranty_activated). |

### JWT errors

None.

### Open items unchanged

All Bucket 2 items (B2-S1 through B2-S6) and Bucket 3 candidates remain `feedback_needed`. Frontmatter unchanged.

## 2026-05-31, Audit

### Summary

Validate b1 structural pass (A, M, B [B5/B7/B9/B9b/B10b/B11/B12], C, D, E [E1-E5], F [F1-F5], H bands) re-run against live state after the 2026-05-31 continuation. Confirms prior continuation landed: 15 `trigger_events` now on INV masters (was 9; six new 1478-1483 cover all `requires_permission=true` lifecycle states); 9 of 11 cross-domain handoffs carry `handoff_processes` rows (was 0; rows for 1050/1051/1052/1053/1056/1057/1059/1235x2). Net remaining open items unchanged from prior audit's deferred set plus the residual three APQC handoffs the user still owes a multi-PCF pick on.

- Current footprint: 10 INV-mastered data_objects across 3 full modules (24 DMDO rows total: 11 on 61, 7 on 62, 6 on 63). 8 capabilities, 16 solutions, 3 roles, 16 permissions, 7 role_permissions. 25 lifecycle states, 15 trigger_events, 25 aliases on 9 of 10 masters, 0 domain_regulations, 0 system skills, 0 intra-domain handoffs.
- Bucket 1 (in-scope, agent fixable): 4 items.
- Bucket 2 (surface-for-user, judgment): 6 items (unchanged from 2026-05-30).
- Bucket 3 (Phase 0 pending, speculative): 5 categories (unchanged).

### Structural pass bands

- **A1/A2/A3 pass.** Domain row carries all 7 metadata fields (crud_percentage=92, min_org_size `20 s <500`, cost_band `$`, certification_required false, usa_market_size_usd_m=1800/2024, business_logic populated). 8 capabilities. 16 solutions linked with coverage_level.
- **M1/M2/M4/M6 pass.** 3 full modules; 8 capabilities >= 3 so >= 2 modules satisfied; every capability has a realizing module; every module realizes >= 1 capability.
- **M5 advisory.** All 7 `requires_permission=true` lifecycle states leave `domain_module_id=NULL`. Surfaced previously as B2-S3; user pick pending.
- **M7 within-domain hard fail.** Unchanged from prior audit: rows 252 (62 consumer on 785), 258 (63 consumer on 785), 251 (62 consumer on 787), 259 (63 consumer on 787) coexist with `master` rows 239 (61 on 785) and 241 (61 on 787). Gated on B2-S6 architectural choice.
- **B1/B2/B3/B6/B7/B8 pass.** 10 masters, all carry singular_label + plural_label, all use the `inv_` prefix where applicable, intra-domain relationship coverage holds, 6 users edges across 4 masters, 5 outbound + 1 inbound cross-domain relationship rows.
- **B5 hard fail.** DMDO rows 247 (`commerce_products` 384 embedded_master on 61) and 248 (`inventory_locations` 425 embedded_master on 61) point at data_objects with no `role='master'` DMDO row anywhere in the catalog. Fix owed by B2C-COMM and OMS audits (B5 asymmetry).
- **B9 pass after continuation.** All 7 `requires_permission=true` lifecycle states (788 posted/reversed, 789 approved/reconciled, 790 variance_review, 791 recalled, 792 scrapped) now have matching `trigger_events` (1205 covers 791 recalled; 1478-1483 cover the rest).
- **B9b hard fail.** Zero intra-domain handoffs (`source_domain_id=target_domain_id=164`). Unchanged from prior. Author 4-5 candidates per B1-S3.
- **B10b report-only.** 10 outbound handoffs still carry `target_domain_module_id=NULL`. Owed by target domains (S2P, OMS, FIN, CSM, GRC, B2C-COMM).
- **B11 advisory.** `inv_stock_locations` (786) has zero aliases. Surfaced as B2-S5; user pick pending.
- **B12 partial.** 5 workflow-bearing masters carry lifecycle states; 5 config-shape masters (785/786/787/793/794) leave them empty. Rule #12 exemption applies; the `data_objects.notes` annotations recording the exemption violate Rule #15 (RESCINDED license). Surfaced as B2-S1; user pick pending.
- **C1 pass.** 1 owner row (Supply Chain), 2 contributors (Warehouse Ops, Finance), 1 consumer (Sales Ops).
- **C2 advisory.** Zero `business_function_capabilities` overrides; acceptable for INV.
- **D1 deferred.** UI spot-check is a user action.
- **E1 pass.** 3 roles for 3-module domain.
- **E2 pass.** Role 10025 spans 3 modules (61 primary, 62 primary, 63 secondary); 10026 spans 2 modules (62 primary, 61 secondary); 10027 spans 2 modules (61 secondary, 62 secondary).
- **E3 pass.** Every `role_modules` row carries `interaction_level`.
- **E4 partial.** 3 roles bundle 7 `role_permissions` (>= 1 per role floor passed). 7 workflow-gate permissions implied by lifecycle states are not enumerated on any role; reliance on `permission_hierarchy` expansion. Surfaced as B2-S4; user pick pending.
- **E5 not cross-checked.** Audit gap, not a finding.
- **F1 pass.** Zero legacy `domain_id`-only system skills.
- **F2 hard fail.** Zero `skill_type='system'` rows on any of the 3 INV modules. Rule #17 violated. Per B1-S5, requires Phase-S authoring (3 system skills + skill_tools floor).
- **F3/F4/F5 N/A.** Cannot evaluate without F2; Semantius score uncomputable.
- **H1 partial.** 9 of 11 cross-domain handoffs carry `handoff_processes` rows (was 0 before continuation). 0 `record_status='approved'`; 9 `agent_curated`. Remaining 3: 1054 (multi-PCF pick), 1055 (multi-PCF pick), 1058 (multi-PCF pick).

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M7 within-domain hard fail + B5 hard fail | 4 `consumer + master-sibling` DMDO rows (251, 252, 258, 259) on `inv_stock_items` 785 and `inv_stock_balances` 787 between modules 61, 62, 63. 2 `embedded_master` rows (247, 248) with no canonical DMDO master (commerce_products 384, inventory_locations 425). M7 half is gated on B2-S6 (DELETE vs PROMOTE); B5 half is report-only (B2C-COMM and OMS audits own the fix). |
| B1-S3 | B9b hard fail, missing intra-domain handoffs | Zero rows with `source_domain_id=target_domain_id=164` on a 3-module domain. 4-5 candidates: REPLENISHMENT to CORE-STOCK on `inv_stock_movement.posted` (1478); CORE-STOCK to REPLENISHMENT on `inv_stock_item.below_reorder_point` (1199); CORE-STOCK to REPLENISHMENT on `inv_stock_balance.on_hand_changed` (1200); KITTING to CORE-STOCK on a new `inv_kit.assembled` event; CORE-STOCK to KITTING on `inv_stock_balance.allocated` (1201). Includes 1 new trigger_event prerequisite. |
| B1-S5 | F2/F3/F5 hard fail (Rule #17) | Zero `skill_type='system'` rows on any of 3 INV modules. Author 3 system skills (`inv_core_stock_agent` on 61, `inv_replenishment_agent` on 62, `inv_kitting_agent` on 63) plus 5-20 `skill_tools` per module. Phase-S workload. |
| B1-H1 | APQC tagging residual | 3 of 11 cross-domain handoffs untagged (1054 INV to FIN on transfer.received, 1055 INV to CSM on expiry_warning, 1058 INV to CSM on warranty_activated). Each has 2 PCF candidates the user must pick from. |

### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| MISSING | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL | 3 (B1-S1, B1-S3, B1-S5) |
| BOUNDARY (report-only) | 0 (rolled into B1-S1 B5 half) |
| APQC TAGGING | 1 (B1-H1, 3 residual handoffs) |
| Bucket 1 total | 4 items |

### Bucket 2, Surface-for-user (judgment calls)

Unchanged from 2026-05-30 audit. Open: B2-S1 (Rule #15 notes-pollution on 7 data_objects: 785, 786, 787, 788, 790, 793, 794), B2-S2 (pattern-flag re-evaluation), B2-S3 (M5 lifecycle state `domain_module_id` NULL), B2-S4 (E4 permission-bundle drift), B2-S5 (B11 missing aliases on 786), B2-S6 (M7 architectural choice).

### Bucket 3, Phase 0 pending (speculative)

Unchanged from 2026-05-30 audit. Open: 3 entity candidates (`inv_demand_forecasts`, `inv_landed_costs`, `inv_consignment_stock`), 5 regulation candidates (FDA 21 CFR Part 211, FSMA-204, DEA Schedule II-V, ASC 330 / IAS 2, Hazmat / DOT Title 49), 2 modularization candidates (INV-FORECASTING split, INV-POS-STARTER), 2 candidate domains (WMS, SCP).

### JWT errors

None.

### Fixes applied

None this pass (Validate-only). Prior continuation 2026-05-31 already loaded 6 trigger_events (B1-S2 cleared) and 5 single-PCF handoff_processes rows (plus 2 prior + 2 multi-PCF placeholder rows now visible on 1235 and 1050 raising the total to 9 of 11).

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

State-driven Validate pass (Rule #21) over the open items in `audits/INV-MGMT/state.yaml`. Resolved domain 164 + modules INV-CORE-STOCK 61, INV-REPLENISHMENT 62, INV-KITTING 63 against live. Executed every EXECUTE-classified item (entity_type classification, Catalog UX copy, intra-domain handoffs + the prerequisite new trigger_event), surfaced all judgment / destructive / persona items, and left blocked-by-other-domain and backlog items in place. All writes `record_status='new'`; loader re-run confirmed idempotent. No JWT errors. Loader: `.tmp_deploy/fix_inv_mgmt_state_driven_2026_06_07.ts`.

Two live deltas vs the recorded snapshot were picked up on refresh: (1) handoffs 1054 and 1058 now already carry `handoff_processes` rows (1054 -> PCF 1326, 1058 -> PCF 200), so H1 shrank from 3 untagged to 1 (only 1055 remains, a 2-candidate medium-confidence pick); (2) C1 `business_function_domains` is already fully populated (owner Supply Chain 379, contributors Warehouse Ops 380 + Finance 381, consumer Sales Ops 382), so no C1 write was owed.

### Executed (counts)

| Item | Action | Count | Result |
|---|---|---|---|
| B1A-ENTITY-TYPE | PATCH `data_objects.entity_type` from `unclassified` to the Rule #12 enum | 10 | 785/786/793/794 -> `catalog`; 787 -> `computed`; 788/789/790 -> `operational_workflow`; 791/792 -> `operational_record` |
| Catalog UX (Rule #20) | PATCH empty `catalog_tagline` + `catalog_description` (buyer-voice, no vendor names) | 4 rows (1 domain + 3 modules) | domain 164; modules 61, 62, 63 |
| B1A-S3 (new event) | INSERT `trigger_events` row `inv_kit.assembled` (data_object 794, `event_category='lifecycle'`, module 63) | 1 | new id 1549 |
| B1A-S3 (handoffs) | INSERT intra-domain `handoffs` (`source=target=164`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`) | 5 | new ids 1384 (62->61 movement.posted 1478), 1385 (61->62 below_reorder_point 1199), 1386 (61->62 on_hand_changed 1200), 1387 (63->61 kit.assembled 1549), 1388 (61->63 balance.allocated 1201) |

Closes B9b (intra-domain handoff hard fail) and B13 (entity_type) for INV-MGMT.

### Surfaced (user decision / destructive / deferred)

- **B2-S1** (destructive): Rule #15 notes-pollution on 7 `data_objects` (785, 786, 787, 788, 790, 793, 794). Confirm load-time approval (leave) or auto-populated (revert to empty + log incident). Not reverted unapproved.
- **B2-S2** (destructive): pattern-flag flips overwriting non-empty values: `has_submit_lock` on stock_transfers / inventory_lots / serialized_units; `has_personal_content` on serialized_units. Per-flag yes/no.
- **B2-S3**: M5 lifecycle-state `domain_module_id` NULL vs pin-per-state.
- **B2-S4**: E4 permission-bundle drift, implicit-grant vs enumerate gate permissions.
- **B2-S5**: B11 aliases on inv_stock_locations (786, zero aliases) load vs accept-as-self-explanatory.
- **B2-S6** (destructive, gates B1B-S1-M7): DELETE vs PROMOTE the 4 sibling consumer DMDO rows (251, 252, 258, 259).
- **B1B-H1** (user pick): 1 residual untagged handoff 1055 (INV -> CSM on `inv_inventory_lot.expiry_warning`), 2 PCF candidates 206 vs 37, medium confidence, no clean single match.
- **B1A-PHASE-P** (deferred): personas / RACI not authored by state-driven execute. Candidate personas recorded in state.yaml (WAREHOUSE-INVENTORY-MANAGER, SUPPLY-CHAIN-INVENTORY-PLANNER, FINANCE-INVENTORY-ACCOUNTANT).

### Left

- **B1B-S1-M7** (blocked on B2-S6 user pick), **B1B-S1-B5** (blocked on B2C-COMM + OMS DMDO-master declarations), **B1B-S4-B10b** (10 outbound NULL `target_domain_module_id` owed by S2P / OMS / FIN / CSM / GRC / B2C-COMM audits): all unchanged.
- **B1B-S5** (per-module system skills + skill_tools): RETIRED per the supersession header (Plan 3). Reframed as a note; removed as an active item. Domain-grain toolset work tracked in `audits/_modularization-backlog.md`.
- **b3** backlog (6 candidates: inv_demand_forecasts, inv_landed_costs, inv_consignment_stock, compliance regulations, INV-FORECASTING / INV-POS-STARTER modularization, WMS / SCP candidate domains): unchanged, non-blocking.

### JWT errors

None.

### Fixes applied

entity_type (10 PATCH), Catalog UX (4 PATCH), 1 trigger_event + 5 intra-domain handoffs inserted. All `record_status='new'`.
