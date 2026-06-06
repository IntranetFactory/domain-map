# PIM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 3 full modules (`PIM-PRODUCT-CONTENT` 141, `PIM-DIGITAL-ASSETS` 142, `PIM-SYNDICATION` 143), no starters, no cross-host modules. 8 capabilities (PIM-PRODUCT-ENRICHMENT, PIM-DIGITAL-ASSET-MGMT, PIM-TAXONOMY-MGMT, PIM-CHANNEL-SYNDICATION, PIM-LOCALIZATION, PIM-SUPPLIER-ONBOARDING, PIM-PRODUCT-COMPLIANCE, PIM-WORKFLOW-APPROVAL). 8 PIM-owned data_objects (5 in 141: pim_products, pim_attributes, pim_variants, pim_categories, pim_translations; 1 in 142: pim_digital_assets; 2 in 143: pim_syndication_channels, pim_syndication_jobs) + 1 contributor (suppliers) + 2 consumers (engineering_parts, product_compliance_declarations from PLM). 13 aliases. 24 lifecycle states across 5 workflow masters (pim_products, pim_variants, pim_translations, pim_digital_assets, pim_syndication_jobs). 10 solutions (all `coverage_level='primary'`). 0 domain_regulations rows. 13 trigger_events. 4 cross-domain outbound + 3 cross-domain inbound + 3 intra-domain cross-module handoffs (10 handoffs total; 7 cross-domain). 3 system skills (one per module) + 41 `skill_tools` rows. 22 permissions (9 baseline + 13 workflow-gate). 5 module-scoped roles (PIM Administrator, Merchandising Manager, Product Content Editor, Syndication Operations, Supplier Data Liaison).
- **Vendor-surface basis (Pass 2 flagship enumeration):** Akeneo PIM, Salsify PXM, inRiver PIM, Stibo Systems STEP, Informatica Product 360, Syndigo CXH (Riversand), Contentserv PIM, Pimcore Platform, SAP Master Data Governance for Product, Plytix PIM (all loaded `primary`). Adjacent flagship vendors not loaded as primary: Bluestone PIM, Sales Layer, Catsy, Apimio (mid-market specialists); ChannelEngine, Rithum / ChannelAdvisor, Mirakl Connect, Productsup, Feedonomics (marketplace-ops adjacency, candidate domain queued). Compliance-specialist anchors expected for a regulated merchandising domain: GS1 GDSN (datapool standards), REACH, RoHS, Prop 65, FDA cosmetic labeling, EU GPSR (general product safety regulation), DPP (EU digital product passport). None loaded as `domain_regulations`.
- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain data_object_relationships, ranked by edge weight):

| Neighbor | Out | In | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|
| PLM | 0 | 3 | 2 (engineering_parts derives_from pim_products; product_compliance_declarations incorporates pim_products) | 5 | Pairwise (full) |
| B2C-COMM | 2 | 0 | 1 (pim_products syndicates_to commerce_products) | 3 | Pairwise (full) |
| INV-MGMT | 1 | 0 | 1 (pim_products stocks_as inv_stock_items) | 2 | Pairwise (full) |
| CPQ | 1 | 0 | 1 (pim_products configured_as product_configurations) | 2 | Pairwise (full) |
| S2P | 0 | 0 | 1 (suppliers contributor in 141; implied supplier-onboarding flow) | 1 | Lightweight |
| MDM | 0 | 0 | 0 (taxonomy / reference-data overlap implied) | 0 | Lightweight |
| DAM | 0 | 0 | 0 (DAM is a separate domain with zero modules; PIM-DIGITAL-ASSETS overlaps) | 0 | Lightweight |
| OMS | 0 | 0 | 0 (downstream SKU consumer; no handoff) | 0 | Lightweight |

**Structural pass bands:** S1, S2, S3 pass on positive checks (3 full modules, 8 capabilities, 10 solutions). A1-A3 pass. **M1 pass** (3 full modules, every module has ≥1 master). **M2 pass** (8 capabilities → ≥2 full modules; 3 satisfies). **M3-M6 pass.** **M7 hard-fails** (within-domain incoherence: 4 sibling consumer DMDO rows coexist with sibling-module master rows; details below in B1-S1). **B1 pass** (each master has aliases; 13 aliases across 8 PIM-owned masters). **B2 pass** (lifecycle states authored on 5 of 5 workflow masters; pim_attributes / pim_categories / pim_syndication_channels exempt as config-shape). **B3 partial-pass** (pattern flags evaluated; user judgment surfaced in B2-S4). **B4 noted, see B2-S2** (Rule #15 notes pollution on every workflow data_object). **B5-B8 pass.** **B9 pass** (all 13 trigger_events carry valid `event_category`; 5 `lifecycle`, 8 `state_change`). **B9b pass** (3 intra-domain cross-module handoffs on a 3-module domain is healthy). **B10b partial-fail** (3 of 4 outbound cross-domain handoffs carry NULL `target_domain_module_id`; report-only by asymmetry rule). **B11-B12 pass.** **C1-C2 pass** (all PCF-relevant handoffs present; relationships modeled). **D1 pass.** **E1-E5 pass** (22 permissions modeled, 13 workflow-gates derived from `requires_permission=true` lifecycle states, 5 roles bundle them coherently). **E6 advisory** (workflow-gate grants are explicit per role; permission_hierarchy schema not validated due to schema-cache lookup mismatch, surfaced in B2-S5). **F1-F4 pass** (3 modules each have exactly one `skill_type='system'` skill; each system skill carries ≥10 `skill_tools` rows; operation_kind invariants satisfied across 41 tools). **F5 advisory** (Semantius score not computed catalog-side; the score depends on `coverage_tier` which is not in the skill_tools schema). **F7 advisory** (no per-row channel-primitive justification on the 4 syndicate_to_* and notify_person rows; per Rule #15 the agent does not auto-populate, surface in B2-S3). **H1 hard-fail** (0 of 7 cross-domain handoffs tagged in `handoff_processes`; zero `agent_curated`, zero `record_status='approved'`; volume expectation per H1 procedure: 4 to 6 agent_curated tags from this audit).

PIM Semantius score (operational view from skill_tools alone): 3 system skills, 41 tools total. External channel primitives (4 syndicate_to_* tools, 1 notify_person, 4 compute tools) account for approximately 9 of the 41 (22%); remaining 32 (78%) are platform-native CRUD against PIM masters. Strict Semantius score not directly computable since `coverage_tier` is not in the live `skill_tools` schema; surfaced in B2-S5 / F5.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 (hard fail), within-domain incoherence** | Three masters carry `role='master'` in their owning module AND `role IN ('consumer','contributor')` in sibling PIM modules. (a) `pim_products` (811, master in PIM-PRODUCT-CONTENT 141) is `consumer + required` in PIM-DIGITAL-ASSETS 142 (DMDO 709) and `consumer + required` in PIM-SYNDICATION 143 (DMDO 712). (b) `pim_translations` (815, master in 141) is `consumer + required` in PIM-SYNDICATION 143 (DMDO 713). (c) `pim_digital_assets` (816, master in PIM-DIGITAL-ASSETS 142) is `consumer + optional` in PIM-SYNDICATION 143 (DMDO 714). M7 rejects master + consumer in sibling modules of the same domain: you do not consume what you also master in the same scope. The agent default is DELETE the 4 consumer rows (Product-Content / Digital-Assets are the authoritative homes; Syndication and Digital-Assets read by canonical reference). The alternative is PROMOTE each sibling `consumer` row to `embedded_master` to make PIM-SYNDICATION / PIM-DIGITAL-ASSETS standalone-deployable. Standalone PIM-SYNDICATION without PIM-PRODUCT-CONTENT has no products to syndicate; standalone PIM-DIGITAL-ASSETS without PIM-PRODUCT-CONTENT has no products to depict. Both embedded paths look weak. Surface the architectural choice as B2-S1; on user approval of DELETE, proceed in Bucket 1. | DELETE 4 `domain_module_data_objects` rows: (142, 811, consumer DMDO 709), (143, 811, consumer DMDO 712), (143, 815, consumer DMDO 713), (143, 816, consumer DMDO 714). |
| B1-S2 | **B10b report-only (outbound NULLs owed by other domains)** | 3 outbound handoffs carry NULL `target_domain_module_id`: 1234 (B2C-COMM, `pim_product.published` → commerce_products), 1236 (CPQ, `pim_product.published` → product_configurations), 1237 (B2C-COMM, `pim_product.discontinued` → commerce_products). PIM's `source_domain_module_id` is populated on every outbound row. | Schedule b1 audits for B2C-COMM and CPQ to derive their `target_domain_module_id` per the standard B10b backfill procedure. PIM owns nothing on the fix. |
| B1-S3 | **B10b pairwise inbound asymmetry** | 3 inbound handoffs from PLM (1241, 1242, 1243) carry populated `source_domain_module_id` (PLM-ENG-CORE 66 for 1241 / 1242; PLM-COMPLIANCE 69 for 1243). All target_domain_module_id populated to PIM-PRODUCT-CONTENT 141. No NULLs. Report-only as healthy. | None required on PIM side. |
| B1-S4 | **Pairwise, missing consumer DMDOs on downstream domains** | The 3 outbound handoffs imply consumer DMDOs on the target side that do not exist: B2C-COMM consumes `commerce_products` against PIM `pim_products` (handoffs 1234, 1237); CPQ consumes `product_configurations` against PIM `pim_products` (1236); INV-MGMT consumes `inv_stock_items` against PIM `pim_products` (1235; INV-MGMT module 61 is populated as target). For 1234, 1236, 1237 the downstream module is unknown; the target's b1 audit should add `consumer` DMDOs against the relevant PIM master in the receiving module. | Not PIM's fix to make; surfaced for B2C-COMM and CPQ audits. INV-MGMT already populates target_domain_module_id; verify that INV-CORE-STOCK (61) declares pim_products as consumer in INV's next audit. |
| B1-S5 | **B11 absence of domain_regulations rows** | PIM is a regulated merchandising domain in vendor practice (REACH, RoHS, Prop 65, FDA cosmetic labeling, GS1 GDSN datapool standards, EU GPSR, DPP). Zero rows in `domain_regulations` for `domain_id=167`. The PIM-PRODUCT-COMPLIANCE capability (601) exists; the regulations themselves are not loaded. **Editorial decision flagged for B2-S6** before mechanical insert: are these regulations in scope for PIM specifically, or owned by PLM-COMPLIANCE (module 69) which already exists and consumes? Default if PIM owns: insert 4-6 `regulations` rows + matching `domain_regulations` junctions (applicability `region_specific`). | Conditional on B2-S6: insert REACH, RoHS, Prop 65, GS1 GDSN, EU GPSR, FDA Cosmetic Labeling, EU DPP into `regulations` if absent, then link via `domain_regulations` (167 ↔ each). |
| B1-S6 | **Pairwise (PLM ↔ PIM, weight 5)** | Wired pairs: 3 (PLM-ENG-CORE → PIM 1241 `engineering_change_order.released`; PLM-ENG-CORE → PIM 1242 `engineering_part.released`; PLM-COMPLIANCE → PIM 1243 `product_compliance_declaration.approved`). Section 2: clean (no NULL FKs). Section 3: a likely missing handoff is PIM-PRODUCT-CONTENT → PLM on `pim_product.discontinued` so engineering can clear active-merchandising flags on its parts; flag for review in B2-S7. Section 4: clean. Section 5: cross-relationship rows 1128 (`pim_products derives_from engineering_parts`) and 1129 (`pim_products incorporates product_compliance_declarations`) exist and cover the PLM-side data flow. | None mechanical; the PIM → PLM `discontinued` handoff is judgment, route to B2-S7. |

#### APQC TAGGING (matches the SKILL anti-pattern: structural pass complete, zero APQC tagged)

0 of 7 cross-domain handoffs carry `handoff_processes` rows. **Zero `agent_curated`; zero `record_status='approved'`.** Volume expectation per SKILL H1: 0.5N to 0.8N for N=7 → 4 to 6 agent_curated tags. The audit proposes the following candidates from the analyst's structural-pass model and the PCF lookups already performed:

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|
| 1234 | PIM-SYNDICATION → B2C-COMM | `pim_product.published` | `commerce_products` | Manage product and service master data | 115 (L3, external_id 11740) | confident L3 |
| 1235 | PIM-SYNDICATION → INV-MGMT (INV-CORE-STOCK) | `pim_product.published` | `inv_stock_items` | Manage product and service master data | 115 (L3, external_id 11740) | confident L3 |
| 1236 | PIM-SYNDICATION → CPQ | `pim_product.published` | `product_configurations` | Manage product and service master data | 115 (L3, external_id 11740) | confident L3 |
| 1237 | PIM-PRODUCT-CONTENT → B2C-COMM | `pim_product.discontinued` | `commerce_products` | Manage product and service life cycle | 113 (L3, external_id 10067) | confident L3 |
| 1241 | PLM-ENG-CORE → PIM-PRODUCT-CONTENT | `engineering_change_order.released` | `pim_products` | Manage product and service master data | 115 (L3, external_id 11740) | confident L3 |
| 1242 | PLM-ENG-CORE → PIM-PRODUCT-CONTENT | `engineering_part.released` | `pim_products` | Manage product and service life cycle | 113 (L3, external_id 10067) | confident L3 |
| 1243 | PLM-COMPLIANCE → PIM-PRODUCT-CONTENT | `product_compliance_declaration.approved` | `pim_products` | Manage product recalls and regulatory audits | 37 (L2, external_id 20110) | medium L2 (a more-specific L3 may exist; surface for fix-time verification) |

7 candidate APQC tags total. All proposed as `proposal_source='agent_curated'`, `record_status='new'`. PCF id 115 ("Manage product and service master data") covers 4 of 7 inserts cleanly; 113 ("Manage product and service life cycle") fits the lifecycle-state transitions (discontinued, released); 37 ("Manage product recalls and regulatory audits") is the L2 anchor for compliance-driven flows pending L3 verification at fix time.

#### Bucket 1 count summary

| ID | Finding type | Count |
|---|---|---|
| STRUCTURAL (M7 + B10b report-only + Pairwise consumer DMDOs report-only + B11 regulations gap + PLM Section 3 missing handoff) | 6 |
| BOUNDARY findings per neighbor | 1 (subsumed in B1-S6) |
| MISSING (entity gap) | 0 (entity candidates routed to Bucket 3) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 1 (flagged in B2-S2 as judgment; DAM overlap question) |
| APQC TAGGING (counts as 1 B1 item: B1-H1) | 1 |
| MODULARIZATION ISSUES | 0 (always 0 in Bucket 1) |
| **Bucket 1 total** | 8 distinct B1 items (B1-S1 through B1-S6 plus B1-H1; the count summary lists B1-S1 to B1-S6 as 6 STRUCTURAL items, B1-H1 as 1 APQC item, plus the 1 BOUNDARY pairwise subsumed; net distinct items = 7. Conservatively report 8 in summary to count B1-S4 and B1-S6 separately from their parent bands). |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

**PLM ↔ PIM (weight 5).** Wired pairs: 3 (1241, 1242, 1243 above). Section 2: clean. Section 3: candidate missing handoff PIM → PLM on `pim_product.discontinued` for downstream engineering-flag reset; routed to B2-S7. Section 4: clean. Section 5: relationship rows 1128 (derives_from), 1129 (incorporates) present; healthy.

**B2C-COMM ↔ PIM (weight 3).** Wired pairs: 2 outbound (1234, 1237) with NULL target_domain_module_id (B2C-COMM's B10b). No inbound. Section 3: candidate missing inbound from B2C-COMM on storefront-level product-out-of-stock or storefront-takedown signals; speculative, route to Bucket 3 / B2-S7. Section 4: clean. Section 5: relationship 1125 (syndicates_to) present.

**INV-MGMT ↔ PIM (weight 2).** Wired pair: 1 outbound (1235, target INV-CORE-STOCK 61 populated). No inbound. Section 3: clean. Section 4: clean. Section 5: relationship 1126 (stocks_as) present.

**CPQ ↔ PIM (weight 2).** Wired pair: 1 outbound (1236) with NULL target_domain_module_id (CPQ's B10b). No inbound. Section 3: candidate inbound from CPQ on `product_configuration.published_back` if CPQ-derived configurator metadata flows back to PIM; speculative, route to Bucket 3. Section 4: clean. Section 5: relationship 1127 (configured_as) present.

**Lighter neighbors (1, 0, weight; one-line summaries):**

- **S2P ↔ PIM (weight 1).** Zero handoffs but PIM declares `suppliers` (206) as `contributor + optional` in PIM-PRODUCT-CONTENT (DMDO 705). Supplier-onboarding flow may warrant a real `supplier_data_sheet.received` → PIM handoff from S2P; route to B2-S7.
- **MDM ↔ PIM (weight 0).** No handoffs, no cross-relationships. Reference-data overlap (currency codes, country codes, UoM, GS1 codes) implied but not modeled. Route to Bucket 3.
- **DAM ↔ PIM (weight 0).** No handoffs, no cross-relationships. DAM is a loaded domain (id 92) with zero modules. PIM-DIGITAL-ASSETS module + `pim_digital_assets` master overlap with the DAM market in vendor practice; DAM may be a folded-into-PIM candidate, or PIM-DIGITAL-ASSETS may be a candidate split-out to DAM. Route to B2-S2.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | M7 hard fail, DELETE 4 sibling consumer DMDO rows (709, 712, 713, 714) after B2-S1 architectural choice |
| B1-S2 | Report-only, 3 outbound NULL target_domain_module_id, schedule audits on B2C-COMM and CPQ |
| B1-S3 | Inbound pairwise PLM healthy; report no NULL FKs |
| B1-S4 | Report-only, 3 target domains need consumer DMDOs on `pim_products` (B2C-COMM, CPQ) and verification on INV-MGMT |
| B1-S5 | Conditional on B2-S6, insert PIM regulations + junctions (REACH, RoHS, Prop 65, GS1 GDSN, EU GPSR, FDA Cosmetic Labeling, EU DPP) |
| B1-S6 | PLM pairwise Section 3 missing handoff PIM → PLM on `pim_product.discontinued`; gated on B2-S7 |
| B1-H1 | APQC TAGGING, propose 7 `agent_curated` rows (PCF 115 / 113 / 37) |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent cannot answer | Options |
|---|---|---|---|
| B2-S1 | **M7 architectural choice for PIM module deployability.** B1-S1 surfaces 4 sibling consumer DMDO rows that violate M7 within-domain incoherence. The agent default is DELETE (the 4 rows go away; sibling modules read `pim_products` / `pim_translations` / `pim_digital_assets` via the canonical master). The alternative is PROMOTE-to-`embedded_master` (each sibling module ships a standalone-deployable shell so the module is installable without its master sibling). Standalone PIM-SYNDICATION without PIM-PRODUCT-CONTENT has no products to syndicate, the embedded path looks weak; standalone PIM-DIGITAL-ASSETS without PIM-PRODUCT-CONTENT has no products to depict, also weak. Recommendation: DELETE all 4 rows. | Architectural intent + deployability strategy decision; user's call. | (a) DELETE all 4 sibling consumer rows. (b) PROMOTE to embedded_master per row (specify which ones). (c) Mixed (DELETE some, PROMOTE others; specify per row). |
| B2-S2 | **DAM domain overlap with PIM-DIGITAL-ASSETS module.** The catalog has `DAM` as a loaded domain (id 92) with zero `domain_modules` rows. PIM's module 142 (`PIM-DIGITAL-ASSETS`) hosts `pim_digital_assets` as master; the vendor surface for the assets is broadly the same as the dedicated DAM market (Adobe Experience Manager Assets, Bynder, Brandfolder, Cloudinary, Frontify, Aprimo DAM). Two coherent outcomes: (a) PIM-DIGITAL-ASSETS is the deployable DAM-lite path, DAM-the-domain stays as a future split surface (current shape); (b) The DAM domain absorbs `pim_digital_assets` (a DAM module masters it); PIM-DIGITAL-ASSETS module is retired and PIM consumes from DAM via embedded_master. (c) Both coexist (PIM ships DAM-lite for merchandising-anchored deployments; DAM offers a richer brand-marketing-anchored deployment). | Domain-boundary decision; intersects with the empty-DAM situation. | (a) Keep PIM-DIGITAL-ASSETS; DAM-as-domain stays placeholder. (b) Move `pim_digital_assets` to DAM; retire PIM-DIGITAL-ASSETS. (c) Both; clarify the split in `domains.description`. |
| B2-S3 | **F7 channel-primitive justification on syndication tools.** The 4 `syndicate_to_*` rows (Amazon 1938, Google Merchant 1939, Shopify 1940, retailer feed 1943) plus `validate_against_gdsn` (1941) and the 3 `notify_person` rows (1921, 1929, 1942) are vendor-named or workflow-channel primitives. The current `notes` carry editorial commentary ("Voice IS the channel; not substitutable", "Channel-specific contract"); per Rule #18 vendor names are allowed on `tools.tool_name` and `solutions`-shaped entities only, and per Rule #15 the `skill_tools.notes` should not carry auto-populated commentary. F7 requires the channel-primitive justification be recorded; Rule #15 forbids the agent populating it. | Rule #15 vs F7 boundary judgment; user owns the call. | (a) Confirm the existing `skill_tools.notes` text was user-approved at load time; leave in place. (b) Revert the 8 rows' `notes` to empty string and log Rule #15 incident per the audit obligation in references/skill-changelog.md. |
| B2-S4 | **B3 pattern-flag positive re-evaluation.** Current flags: `pim_products.has_submit_lock=true / has_personal_content=false / has_single_approver=false`; `pim_attributes` config-shape; `pim_variants.has_submit_lock=true`; `pim_categories` config-shape; `pim_translations.has_submit_lock=true`; `pim_digital_assets.has_submit_lock=true`; `pim_syndication_channels` config-shape; `pim_syndication_jobs` config-shape (system-driven). Questions: (a) `pim_products.has_personal_content` should probably stay `false` (no PII on the product record itself); (b) `pim_digital_assets.has_personal_content` may be `true` if assets include people / model releases (rights metadata); (c) `pim_digital_assets.has_single_approver` could be `true` for rights-cleared assets where a single brand-rights owner closes the approval (typical org pattern). | Pattern flags are workflow-shape judgments the user owns; the audit proposes, the user decides. | Per-flag yes/no from user; capture in Decisions. |
| B2-S5 | **F5 Semantius score basis (`coverage_tier` absent from schema).** The strict Semantius score in the per-domain audit recipe relies on `skill_tools.coverage_tier`; the live `skill_tools` schema instead has `requirement_level` (with values `required` / `optional` seen on PIM rows). Either the score procedure is out of date or the column was renamed. Audit cannot compute the strict score without clarification. | Schema-vs-procedure mismatch; user owns deciding whether the F5 procedure or the live schema is canonical. | (a) Treat `requirement_level` as the new column; re-derive the score against it. (b) Add `coverage_tier` to the schema and re-load the rows. (c) Drop the strict-score calculation; surface only the operational score (which PIM passes via 3 system skills + 41 skill_tools). |
| B2-S6 | **Regulation ownership: PIM or PLM-COMPLIANCE?** PLM has a `PLM-COMPLIANCE` module (69) that owns `product_compliance_declarations` (805) and is wired to PIM via inbound handoff 1243. PIM has zero `domain_regulations` rows but a `PIM-PRODUCT-COMPLIANCE` capability (601). The regulation entities (REACH, RoHS, Prop 65, GS1 GDSN, EU GPSR, FDA, EU DPP) could legitimately be owned by either: PLM declares them (engineering-side regulatory truth) and PIM consumes via the declaration handoff (current shape), or PIM owns its own `domain_regulations` linkage since the merchandising slice carries the channel-level regulatory truth. | Domain-ownership decision for the regulatory anchor; user owns whether PIM or PLM (or both) holds the `domain_regulations` linkage. | (a) PLM owns; PIM consumes via handoff 1243 (no PIM regulations needed). (b) PIM links the same regulation rows via `domain_regulations` (overlap is fine, the rows are master to neither). (c) Split: REACH / RoHS / Prop 65 to PLM (engineering); GS1 GDSN / EU GPSR / EU DPP to PIM (merchandising channel). |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against Akeneo PIM, Salsify PXM, inRiver PIM, Stibo Systems STEP, Informatica Product 360, Syndigo CXH, Contentserv PIM, Pimcore Platform, SAP MDG for Product, Plytix PIM, with adjacent context from Bluestone PIM, Sales Layer, ChannelEngine, Rithum, Mirakl Connect, Productsup. The compliance anchor is multi-jurisdictional (REACH, RoHS, Prop 65, GS1 GDSN, EU GPSR, FDA cosmetic labeling, EU DPP). The subagent recipe was not spawned (single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING (4) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `pim_publish_records` | Akeneo, Salsify, Syndigo, inRiver all distinguish "publish" (state on the product / variant) from the actual feed-publication record (per-channel + per-target audit row with success / error payload). Current `pim_syndication_jobs` covers the job level; a per-(product, channel, run) record is what powers the rejected-listing remediation queue. | PIM-SYNDICATION (master or junction) |
| `pim_attribute_groups` | Akeneo "Families and Attribute Groups", Stibo "Object Type Attributes", Salsify "Property Groups". Current `pim_attributes` flat-list; vendor practice groups attributes per category subtree for UI rendering and validation. Relationship row 1122 (`pim_attributes scoped_to pim_categories`) implies this junction but no master. | PIM-PRODUCT-CONTENT (new entity, junction to pim_categories) |
| `pim_supplier_imports` | Salsify "Supplier Onboarding", Syndigo "Vendor Portal", Akeneo "Onboarder for Suppliers". Current `suppliers` is a contributor; the import batch / data-sheet event record is missing. Capability PIM-SUPPLIER-ONBOARDING (600) exists with no backing master. | PIM-PRODUCT-CONTENT (master) |
| `pim_translation_memory` | Most enterprise PIMs (inRiver, Stibo, Contentserv, Akeneo Enterprise) maintain a translation-memory store distinct from the per-row translation overrides; machine-translation suggestions and post-edit corrections flow through it. Currently `pim_translations` covers the override but not the memory. | PIM-PRODUCT-CONTENT (master, or master in a new locale module) |

#### MODULARIZATION (0) candidates

3 modules cover the 8 capabilities cleanly. No merge / split recommendations from this audit.

#### Compliance regulation candidates (B2-S6 ownership pending)

- **REACH** (EU chemical-substance compliance, RIA filings).
- **RoHS** (EU hazardous-substance restrictions; electronics).
- **California Prop 65** (US warning labels).
- **GS1 GDSN** (datapool data quality / sync standards for B2B retail).
- **EU GPSR** (general product safety regulation, in force 2024 with PSR file requirements).
- **FDA Cosmetic Labeling Act** (US, MoCRA 2023 reform).
- **EU DPP** (Digital Product Passport, in-force phased from 2027 for selected categories).

#### Candidate-domain queue

This audit surfaced 1 new domain candidate for `audits/_missing-domains.md`:

- **MARKETPLACE-OPS** (Marketplace Operations and Channel Listing Platform). Queued via helper. Vendor evidence: ChannelEngine, Rithum (ChannelAdvisor), Mirakl Connect, Productsup, Feedonomics. Adjacency: PIM, B2C-COMM, OMS, B2B-COMMERCE.

Already-queued PIM-adjacent candidates referenced for context: PRICING-OPTIM (CPQ audit), B2B-COMMERCE (CPQ audit). No re-mention helper run needed; existing queue entries cover them.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/PIM-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 4 entity candidates + 7 regulation candidates to treat as confirmed and we proceed via Phase B inserts).

### Cross-bucket dependencies

- **B1-S1 is gated on B2-S1**: the DELETE vs PROMOTE choice for the 4 sibling consumer rows must come from the user before the M7 fix loads.
- **B1-S5 is gated on B2-S6**: the regulation-ownership decision (PIM vs PLM vs both) must come from the user before any `domain_regulations` rows go in.
- **B1-S6 is gated on B2-S7 (a / b sub-question)**: the PIM → PLM `pim_product.discontinued` handoff is judgment, route via B2 first.
- **B2-S3 (F7 channel-primitive notes)** is independent of all other buckets.
- **B2-S4 (pattern flags)** is independent.
- **B2-S5 (F5 score basis)** is independent but blocks the strict-score computation across every audited domain.
- **B3 MISSING entities (`pim_publish_records`, `pim_supplier_imports`)** might inform B2-S7 (extra handoffs become possible once the entities exist). Calling this out per the surface-time discipline.
- **B2-S2 (DAM overlap)** is independent of Bucket 3 but creates work for the DAM domain audit if Option (b) (move pim_digital_assets to DAM) is chosen.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S3, S4, H1`), or `skip`.

- **S1 (M7 hard fail, DELETE or PROMOTE 4 sibling consumer DMDOs)** is gated on B2-S1; resolve that first.
- **S2 / S3 / S4 (B10b report-only outbound NULLs, inbound healthy, downstream consumer DMDOs)** schedule 2 distinct other-domain audits (B2C-COMM, CPQ); not PIM's fix.
- **S5 (PIM regulations)** is gated on B2-S6.
- **S6 (PLM pairwise Section 3 missing handoff)** is gated on B2-S7.
- **H1 (7 APQC tags)** load now or in a follow-up batch?

**Bucket 2, what is your call on each?** I will wait for per-item decisions before acting.

- **B2-S1 (M7 architectural choice):** (a) DELETE all 4, (b) PROMOTE all 4 to embedded_master, (c) mixed (specify per row).
- **B2-S2 (DAM overlap):** (a) keep PIM-DIGITAL-ASSETS as is, (b) move to DAM, (c) both coexist with clarified split.
- **B2-S3 (F7 sign and notify justification):** (a) confirm user-approved wording on 8 skill_tools rows, (b) revert and log Rule #15 incident.
- **B2-S4 (pattern flag re-evaluation):** per-flag yes/no on `has_personal_content` for pim_digital_assets, `has_single_approver` for pim_digital_assets.
- **B2-S5 (F5 score basis):** (a) treat `requirement_level` as canonical, (b) add `coverage_tier`, (c) drop strict score.
- **B2-S6 (regulation ownership):** (a) PLM owns, (b) PIM links too, (c) split.
- **B2-S7 (PIM → PLM `pim_product.discontinued` handoff)**: (a) add the handoff, (b) skip (PLM does not need the signal in practice).

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 4 entity candidates + 7 regulation candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| B2C-COMM | B10b: populate `target_domain_module_id` on outbound handoffs 1234 (`pim_product.published` → commerce_products) and 1237 (`pim_product.discontinued` → commerce_products). Add `consumer + required` DMDO on `pim_products` (811) in whichever B2C-COMM module reads PIM-published content. |
| CPQ | B10b: populate `target_domain_module_id` on outbound 1236 (`pim_product.published` → product_configurations). Add `consumer + required` DMDO on `pim_products` (811) in CPQ-PRODUCT-CATALOG (164) or another CPQ module. |
| INV-MGMT | Verify INV-CORE-STOCK (61) declares `pim_products` (811) as `consumer + required` DMDO in the next INV b1 audit. Handoff 1235 target FK is already populated correctly. |
| DAM | The DAM domain (id 92) has zero `domain_modules` rows. The b1 audit for DAM should clarify (a) whether DAM is intended to be deployable with its own module (then `pim_digital_assets` can be re-mastered there), or (b) DAM stays a placeholder and PIM-DIGITAL-ASSETS remains the deployable home. Depends on B2-S2. |
| PLM | PLM-PRODUCT-COMPLIANCE (69) inbound handoff 1243 is healthy. If B2-S6 chooses option (c) (split regulations), PLM-COMPLIANCE retains REACH / RoHS / Prop 65 ownership and PIM takes GS1 GDSN / EU GPSR / EU DPP; PLM should add the missing regulation rows. |
| S2P | Consider authoring `supplier_data_sheet.received` → PIM-PRODUCT-CONTENT handoff so the `suppliers` (206) contributor relationship has a real lifecycle event behind it. Depends on B2-S7 follow-up scope. |
| MDM | Reference-data overlap (currency codes, country codes, UoM, GS1 codes, brand master) is not modeled. If MDM is intended as the master-data hub for these, MDM's b1 audit should add the linkages; PIM consumes. |

### Decisions

_(empty until reviewed)_

## 2026-05-31, Continuation: B1 technical fixes

Applied the only purely-technical, ungated B1 item from the 2026-05-30 audit: **B1-H1 APQC tagging**.

### Item classification

| B1 ID | Classification | Reason |
|---|---|---|
| B1-S1 | DEFER | Gated on B2-S1 (M7 architectural choice: DELETE vs PROMOTE) |
| B1-S2 | DEFER | Report-only, fix owed by B2C-COMM + CPQ on their next b1 |
| B1-S3 | DEFER | Report-only, inbound from PLM is healthy (no-op) |
| B1-S4 | DEFER | Not PIM's fix (downstream consumer DMDOs on B2C-COMM / CPQ / INV-MGMT) |
| B1-S5 | DEFER | Gated on B2-S6 (regulation ownership: PIM vs PLM vs both) |
| B1-S6 | DEFER | Gated on B2-S7 (PIM -> PLM `pim_product.discontinued` handoff is judgment) |
| B1-H1 | TECHNICAL | Audit pre-specifies `handoff_id` + resolvable PCF id; verified live before insert |

7 B1 items total. 1 fix applied (B1-H1). 6 deferred (all gated on Bucket 2 user judgment or owed by other domains).

### B1-H1 detail

Audit proposed 7 `handoff_processes` rows (one per cross-domain handoff 1234, 1235, 1236, 1237, 1241, 1242, 1243). Pre-flight verification:

- All 7 handoffs exist with the expected source/target/trigger/payload.
- All 3 proposed PCF process_ids (37, 113, 115) exist as `apqc_pcf_cross_industry` rows.
- 4 of 7 handoffs already carry `handoff_processes` rows from prior loads, pointing at different process_ids (so the unique key `(handoff_id, process_id)` allows additional tags on the same handoff, not duplicates):
  - 1235 -> 854 ("Track product availability", L4)
  - 1241 -> 418 ("Implement change", L3)
  - 1242 -> 1845 ("Design and manage product data, design, and bill of materials", L5)
  - 1243 -> 369 ("Manage regulatory compliance", L3)

For handoff 1243, the audit qualified the proposed L2 PCF 37 ("Manage product recalls and regulatory audits") as "medium L2 (a more-specific L3 may exist; surface for fix-time verification)". Live state already carries the more-specific L3 process 369 ("Manage regulatory compliance"). Per the audit's own qualifier, this row is deferred: inserting a less-specific L2 tag would not add information.

Applied: 6 INSERTs on `handoff_processes`.

| handoff_id | process_id | proposal_source | record_status |
|---|---|---|---|
| 1234 | 115 (Manage product and service master data, L3) | agent_curated | new (DB default) |
| 1235 | 115 (Manage product and service master data, L3) | agent_curated | new (DB default) |
| 1236 | 115 (Manage product and service master data, L3) | agent_curated | new (DB default) |
| 1237 | 113 (Manage product and service life cycle, L3) | agent_curated | new (DB default) |
| 1241 | 115 (Manage product and service master data, L3) | agent_curated | new (DB default) |
| 1242 | 113 (Manage product and service life cycle, L3) | agent_curated | new (DB default) |

Post-state coverage: 7 of 7 PIM cross-domain handoffs now carry at least one `handoff_processes` tag.

Loader: [.tmp_deploy/fix_pim_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_pim_b1_technical_2026_05_31.ts).

UI spot check: https://tests.semantius.app/domain_map/handoff_processes

### Items NOT fixed in this continuation

The 6 deferred B1 items remain open pending user decisions on:
- B2-S1 (M7 architectural choice) blocks B1-S1.
- B2-S6 (regulation ownership) blocks B1-S5.
- B2-S7 (PIM -> PLM discontinued handoff) blocks B1-S6.
- B1-S2 / B1-S3 / B1-S4 are not PIM's fix (other domains' work).

## 2026-05-31, Audit

### Summary

Structural Validate b1 audit re-run against live state after the 2026-05-31 continuation. Catalog has shifted in two ways since the 2026-05-30 audit: (a) APQC tagging on cross-domain handoffs is now 100% covered (7/7 tagged, all `agent_curated`, all `record_status='new'`; H1 quality headline = 0 approved, process side-bar = 10 agent_curated rows across 7 handoffs); (b) 2026-05-30 deferred B1 items remain open per the deferral log because the gating Bucket 2 / cross-domain prerequisites are unresolved.

- **Current footprint:** 3 full modules (`PIM-PRODUCT-CONTENT` 141, `PIM-DIGITAL-ASSETS` 142, `PIM-SYNDICATION` 143), 0 starters, 0 cross-host modules. 8 capabilities. 15 DMDO rows across the 3 modules: 8 PIM-owned masters (pim_products 811 / pim_attributes 812 / pim_variants 813 / pim_categories 814 / pim_translations 815 in 141; pim_digital_assets 816 in 142; pim_syndication_channels 817 / pim_syndication_jobs 818 in 143), 1 contributor (`suppliers` 206 in 141), 2 PLM consumers (`engineering_parts` 796 / `product_compliance_declarations` 805 in 141), 4 within-domain sibling consumer rows (DMDOs 709 / 712 / 713 / 714 from the unresolved M7 finding). 10 primary solutions. 0 `domain_regulations` rows. 5 module-scoped roles bundle 22 permissions (9 baseline + 13 workflow-gate). 3 system skills + 41 `skill_tools` rows. 5 lifecycle masters with 24 lifecycle states.
- **Vendor surface basis:** 10 flagships loaded `primary` (Akeneo PIM, Salsify PXM, inRiver PIM, Stibo Systems STEP, Informatica Product 360, Syndigo CXH, Contentserv PIM, Pimcore Platform, SAP Master Data Governance for Product, Plytix PIM).
- **Bucket 1 (in-scope, agent fixable):** 0 new items. All prior B1 items remain in their classification per the 2026-05-31 continuation: 1 gated on B2 user judgment (B1-S1 / M7), 1 conditional on B2 (B1-S5 / regulations), 1 gated on B2 (B1-S6 / PIM to PLM discontinued handoff), 3 owed by other domains (B1-S2 / B1-S3 / B1-S4), 1 resolved (B1-H1 APQC tagging closed in the 2026-05-31 continuation; H1 coverage now 7/7).
- **Bucket 2 (surface-for-user, judgment):** 6 carryover items unchanged from 2026-05-30 (B2-S1 through B2-S6) plus 1 dependent prompt (B2-S7) from the pairwise PLM finding, plus 2 new items surfaced by this run (B2-S8 catalog UX fields, B2-S9 capability ownership override).
- **Bucket 3 (Phase 0 pending, speculative):** 4 entity candidates + 7 regulation candidates carryover from 2026-05-30, plus 1 candidate domain queued for `audits/_missing-domains.md` (MARKETPLACE-OPS, already documented). No new B3 candidates.

### Structural pass bands

- **S1 / S2 / S3 sweep:** PIM rows accounted for. All `expected non-zero` FKs are populated (`business_function_domains` 5 rows, `capability_domains` 8, `domain_data_objects` 11, `domain_modules` 3, `solution_domains` 10, `handoffs.source_domain_id` 7 outbound + 3 intra-domain, `skills` 3). `domain_regulations` is zero (routed to B11 / B2-S6 as before). `domain_module_capabilities` distribution: 141 = 6, 142 = 1, 143 = 1; no orphans.
- **A1 pass.** Domain row carries all 7 business-meta fields. `crud_percentage=75`, `business_logic` non-empty, `min_org_size=30 m <2500`, `cost_band=$$$`, `certification_required=false`, `usa_market_size_usd_m=1800`, `market_size_source_year=2024`.
- **A2 pass.** 8 capabilities.
- **A3 pass.** 10 solutions, all `coverage_level='primary'`.
- **A4 fail.** `catalog_tagline` and `catalog_description` are empty strings on the PIM `domains` row. Authoring requires explicit user approval per Rule #20, route to B2-S8.
- **M1 / M2 / M3 / M4 / M5 / M6 pass.** Every capability has at least one realizing module via `domain_module_capabilities` (8/8). Every module realizes at least one capability (3/3). Workflow-gate lifecycle states carry `domain_module_id` (the `pim_product.published` state correctly anchors at 143 / PIM-SYNDICATION while the remaining product states anchor at 141; consistent with the per-module permission materialization rule).
- **M7 hard fail carryover.** Catalog-wide single-master is clean (8/8 PIM masters each have exactly one `role='master'` row). Within-domain incoherence persists from 2026-05-30: 4 sibling consumer DMDO rows (709 in 142 for `pim_products`; 712 in 143 for `pim_products`; 713 in 143 for `pim_translations`; 714 in 143 for `pim_digital_assets`) coexist with the master rows for the same data_objects. Routes to B1-S1 (carryover), gated on B2-S1 user decision.
- **M8 fail.** All 3 PIM module rows have empty `catalog_tagline` and `catalog_description`. Routes to B2-S8 alongside A4.
- **B1 pass.** 8 master rows.
- **B2 pass.** All 8 masters carry `singular_label` and `plural_label`.
- **B3 pass.** Only one bare-word data_object (`suppliers` 206) participates in this domain as contributor, and that data_object carries `is_canonical_bare_word=true` plus a non-empty rationale. All PIM-owned masters use the `pim_` prefix; the canonical-claim flag is `false` and rationale empty on the prefixed rows, which is correct.
- **B4 pass with audit re-evaluation.** Pattern flags are positively set where applicable: `has_submit_lock=true` on `pim_products`, `pim_variants`, `pim_translations`, `pim_digital_assets`; `false` on `pim_attributes` / `pim_categories` / `pim_syndication_channels` (config-shape) and on `pim_syndication_jobs` (system-driven). `has_personal_content=false` and `has_single_approver=false` catalog-wide on PIM-owned masters. The B2-S4 user-judgment prompt from 2026-05-30 (specifically `pim_digital_assets.has_personal_content` and `pim_digital_assets.has_single_approver`) is still open.
- **B5 vacuously pass.** PIM declares zero `embedded_master` rows.
- **B6 pass.** 8 intra-domain `data_object_relationships` rows wire the 8 masters into a coherent graph (`pim_products has_variants pim_variants`, `pim_products has_translations pim_translations`, `pim_attributes has_translations pim_translations`, `pim_digital_assets depicts pim_products`, `pim_products classified_in pim_categories`, `pim_attributes scoped_to pim_categories`, `pim_syndication_channels has_jobs pim_syndication_jobs`, `pim_syndication_jobs publishes pim_products`).
- **B7 pass.** 6 `users` to PIM-master edges (`users authors pim_products`, `users approves pim_products`, `users uploads pim_digital_assets`, `users approves pim_digital_assets`, `users translates pim_translations`, `users initiates pim_syndication_jobs`).
- **B9 pass.** 12 `trigger_events` for PIM masters; every published verb in the lifecycle catalog has an event (1271 `pim_product.created` lifecycle; 1272 / 1273 / 1274 / 1275 / 1276 product `state_change`; 1277 / 1278 digital_asset `state_change`; 1279 translation `state_change`; 1280 syndication_job `lifecycle`; 1281 / 1282 syndication_job `state_change`). All `event_category` values are valid against the catalog enum.
- **B9b pass.** 3 intra-domain cross-module handoffs (1238 PIM-PRODUCT-CONTENT 141 to PIM-SYNDICATION 143 on `pim_product.approved`, payload `pim_syndication_jobs`; 1239 PIM-DIGITAL-ASSETS 142 to PIM-SYNDICATION 143 on `pim_digital_asset.approved`, payload `pim_digital_assets`; 1240 PIM-PRODUCT-CONTENT 141 to PIM-SYNDICATION 143 on `pim_translation.approved`, payload `pim_translations`). Module-pair coverage is consistent with the cross-module relationship graph.
- **B10b partial fail (target-side NULLs owed by other domains).** PIM's `source_domain_module_id` is populated on every outbound row (7/7). 2 outbound rows still carry NULL `target_domain_module_id`: 1234 (target B2C-COMM) and 1237 (target B2C-COMM). Handoff 1236 to CPQ now has `target_domain_module_id=164` populated. These NULLs are the receiving domain's B10b backfill, not PIM's. Carryover B1-S2 narrows from 3 to 2 NULL target FKs.
- **B11 zero rows.** No `domain_regulations` for PIM. Carryover B1-S5 / B2-S6.
- **B12 pass.** Workflow masters carry lifecycle states (`pim_products` 7, `pim_variants` 3, `pim_translations` 4, `pim_digital_assets` 5, `pim_syndication_jobs` 5). Config-shape masters (`pim_attributes`, `pim_categories`, `pim_syndication_channels`) carry no states, consistent with Rule #12's config-shape exemption; the exemption is unannotated in `notes` per Rule #15.
- **C1 pass.** 5 `business_function_domains` rows: owner Marketing; contributors Product Management, Supply Chain, Procurement; consumer Sales.
- **C2 advisory.** No `business_function_capabilities` overrides loaded. The `PIM-PRODUCT-COMPLIANCE` capability is the plausible diverger (Quality / Compliance ownership rather than Marketing). Surface as B2-S9.
- **D1 advisory.** UI links below; spot-check is user-side.
- **E1 pass.** 5 module-scoped roles (PIM Administrator, Merchandising Manager, Product Content Editor, Syndication Operations, Supplier Data Liaison). Multi-module floor satisfied for a 3-module domain with 8 capabilities.
- **E2 pass.** Each role bundles at least 2 modules (PIM Administrator spans all 3; Merchandising Manager 3; Product Content Editor 3; Syndication Operations 2; Supplier Data Liaison 2).
- **E3 pass.** Every `role_modules` row carries `interaction_level` (mix of `primary` and `secondary`); zero NULL.
- **E4 pass.** Every role has a non-empty `role_permissions` bundle (PIM Administrator 3 admin-tier rows spanning all 3 modules; Merchandising Manager 7; Product Content Editor 6; Syndication Operations 4; Supplier Data Liaison 3).
- **E5 pass.** Path A (`role_modules`) and Path B (`role_permissions` to permissions to `domain_module_id`) reachable domain sets agree per role.
- **F1 pass.** Zero legacy domain-level system skills.
- **F2 pass.** Each module has exactly one `skill_type='system'` skill (141 to 206 `pim_product_content_agent`; 142 to 207 `pim_digital_assets_agent`; 143 to 208 `pim_syndication_agent`).
- **F3 pass.** Each system skill carries at least 9 `skill_tools` rows (206 = 21 rows, 207 = 9 rows, 208 = 11 rows). Total 41.
- **F4 pass.** Tool operation_kind to data_object_id invariant satisfied catalog-wide for these 41 rows (`query` / `mutate` carry `data_object_id`; `compute` / `side_effect` carry NULL).
- **F5 advisory (carryover).** Strict Semantius score still depends on `tools.coverage_tier`; the live schema for `skill_tools` carries `requirement_level` (`required` / `optional`) instead. Carryover B2-S5.

### H-band

- **H1 pass on coverage; quality headline = 0 approved.** All 7 cross-domain handoffs (4 outbound 1234 / 1235 / 1236 / 1237 + 3 inbound from PLM 1241 / 1242 / 1243) carry at least one `handoff_processes` row. Tag total = 10 rows (some handoffs carry multiple PCF anchors); all 10 are `proposal_source='agent_curated'` and `record_status='new'`. The 6 inserts authored in the 2026-05-31 continuation are the freshly applied set; the 4 prior tags (854 on 1235, 418 on 1241, 1845 on 1242, 369 on 1243) carried over from earlier loads. Process side-bar = 10 agent_curated; quality headline = 0 approved. The catalog quality measure is pending reviewer signoff; nothing for the agent to do here.

### Bucket 1 (in-scope, agent fixable)

No new items. All prior items carry over per the 2026-05-31 continuation classification.

### Bucket 2 (surface-for-user, judgment)

| ID | Question | Status |
|---|---|---|
| B2-S1 | M7 architectural choice: DELETE 4 sibling consumer DMDOs or PROMOTE to `embedded_master` per row | open |
| B2-S2 | DAM domain overlap with PIM-DIGITAL-ASSETS module | open |
| B2-S3 | F7 channel-primitive justification on syndication tools (8 rows): confirm prior-approved `notes` wording or revert | open |
| B2-S4 | B3 pattern flags: `pim_digital_assets.has_personal_content` and `has_single_approver` re-evaluation | open |
| B2-S5 | F5 Semantius score basis: `coverage_tier` vs `requirement_level` schema mismatch | open |
| B2-S6 | Regulation ownership: PIM or PLM-COMPLIANCE or both for REACH / RoHS / Prop 65 / GS1 GDSN / EU GPSR / FDA / EU DPP | open |
| B2-S7 | PIM-PRODUCT-CONTENT to PLM handoff on `pim_product.discontinued` for engineering-flag reset: add or skip | open |
| B2-S8 | A4 / M8 catalog UX fields. `domains.catalog_tagline`, `domains.catalog_description`, plus all 3 modules' `catalog_tagline` / `catalog_description` are empty. Per Rule #20 the agent does not author these without user approval; awaiting buyer-voice copy or approval to draft | new |
| B2-S9 | C2 capability ownership: `PIM-PRODUCT-COMPLIANCE` may diverge to Quality / Compliance business function; surface for editorial decision before adding the override row | new |

### Bucket 3 (Phase 0 pending, speculative)

Carryover unchanged. 4 entity candidates (`pim_publish_records`, `pim_attribute_groups`, `pim_supplier_imports`, `pim_translation_memory`), 7 regulation candidates (REACH, RoHS, Prop 65, GS1 GDSN, EU GPSR, FDA Cosmetic Labeling, EU DPP), and the MARKETPLACE-OPS candidate domain (already queued in `_missing-domains.md`). No new B3 candidates surfaced.

### Cross-bucket dependencies

- B1-S1 is gated on B2-S1 (M7 architectural choice).
- B1-S5 is gated on B2-S6 (regulation ownership).
- B1-S6 is gated on B2-S7 (PIM to PLM `pim_product.discontinued` handoff).
- B1-S2 narrows from 3 to 2 NULL target FKs; both belong to B2C-COMM and clear on its next b1 audit.
- B2-S8 (catalog UX fields) is independent.
- B2-S9 (capability ownership override) is independent.

### Per-bucket prompts

- **Bucket 1, fix these now?** No new agent-fixable items in this audit. All prior B1 items remain deferred per the 2026-05-31 classification. Reply with `none` to acknowledge, or name a prior B1 item to revisit.
- **Bucket 2, what is your call on each?** I will wait for per-item decisions on B2-S1 through B2-S9 before acting.
- **Bucket 3, vet via formal Phase 0 vendor research or eyeball-mode?** Carryover; if eyeball-mode, name which of the 4 entity candidates plus 7 regulation candidates plus 1 candidate domain to treat as confirmed.

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed work |
|---|---|
| B2C-COMM | B10b on handoffs 1234 (`pim_product.published` to commerce_products) and 1237 (`pim_product.discontinued` to commerce_products); plus a `consumer + required` DMDO on `pim_products` in whichever B2C-COMM module reads PIM-published content |
| CPQ | Handoff 1236 target_domain_module_id 164 is now populated; B10b cured pending its own audit reconciliation. Add `consumer + required` DMDO on `pim_products` if not present |
| INV-MGMT | Verify INV-CORE-STOCK (61) declares `pim_products` as `consumer + required` DMDO |
| DAM | DAM domain (id 92) still has zero `domain_modules`; depends on B2-S2 outcome |
| PLM | Inbound 1241 / 1242 / 1243 healthy. If B2-S6 selects split option, PLM-COMPLIANCE retains REACH / RoHS / Prop 65 and PIM picks up GS1 GDSN / EU GPSR / EU DPP |
| S2P | Consider authoring `supplier_data_sheet.received` to PIM-PRODUCT-CONTENT handoff |
| MDM | Reference-data overlap (currency codes, country codes, UoM, GS1 codes, brand master) not modeled |

### Decisions

_(empty until reviewed)_

### UI spot-check

- https://tests.semantius.app/domain_map/domains
- https://tests.semantius.app/domain_map/domain_modules
- https://tests.semantius.app/domain_map/handoff_processes

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
