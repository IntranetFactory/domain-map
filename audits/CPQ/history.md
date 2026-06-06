# CPQ audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 3 full modules (`CPQ-PRODUCT-CATALOG` 164, `CPQ-QUOTE-BUILDER` 165, `CPQ-APPROVALS-CONTRACTS` 166) + 1 starter hosted via `domain_module_host_domains` (`HVAC-SVC-MGMT` 171, primary host NULL, cross-host to CPQ). 8 domain-owned masters across the 3 full modules (`product_configurations`, `pricing_rules`, `product_bundles`, `sales_quotes`, `quote_lines`, `quote_discounts`, `discount_approvals`, `contract_drafts`). 9 capabilities (1 cross-cutting: `APPROVAL-WORKFLOW`). 10 solutions (8 primary, 1 secondary, 1 partial). 16 trigger_events. 9 outbound + 4 inbound cross-domain handoffs (13 cross-domain total). 0 intra-domain cross-module handoffs. 0 aliases on any CPQ master. 21 lifecycle states across 4 of 8 masters (4 masters carry no lifecycle states). 0 system skills on the 3 full modules (1 system skill on the HVAC-SVC-MGMT starter only). 0 CPQ-specific roles, 0 role_modules, 0 module permissions on the 3 full modules. 3 regulations applicable: PCI-DSS, EU VAT Directive, ASC 606. 1 legacy `domain_data_objects` row exists for `crm_opportunities` (100) as `consumer + required` but no DMDO row mirrors it on any CPQ full module.
- **Vendor-surface basis (Pass 2 flagship enumeration):** Salesforce CPQ (now Revenue Cloud), Conga CPQ (formerly Apttus), Oracle CPQ Cloud, SAP CPQ, DealHub CPQ, Vendavo CPQ, PROS Smart CPQ, Tacton CPQ, Cincom CPQ, IBM Sterling CPQ, Experlogix, Configure One, KBMax, eRep, plus the CPQ modules inside ServiceNow CPQ, Workday Strategic Sourcing, and HubSpot Quotes. Compliance-specialist coverage anchored on PCI-DSS (payment data in quotes), EU VAT Directive (tax calculation), ASC 606 (revenue recognition contract terms), plus emerging GDPR considerations for buyer-personalization data.
- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| CLM | 3 (62, 482, 1014) | 1 (517) | 0 | 4 (sales_quotes drafts legal_contracts, contract_drafts drafts legal_contracts, quote_discounts flows into legal_contracts, contract_templates published_to contract_drafts) | 8 | Pairwise (full) |
| CRM | 3 (204, 483, 1013) | 2 (61, 527) | 1 (legacy DDO consumer on crm_opportunities) | 0 (no DOR rows; coupling lives at handoff level) | 6 | Pairwise (full) |
| ERP-FIN | 2 (484, 1015) | 0 | 0 | 0 | 2 | Lightweight |
| PIM | 0 | 1 (1236) | 0 | 1 (pim_products configured_as product_configurations) | 2 | Lightweight |
| SUB-MGMT | 1 (485) | 0 | 0 | 0 | 1 | Lightweight |

**Structural pass bands.** **A1/A2/A3 pass.** **M1 pass** (3 full modules; ≥3 capabilities therefore ≥2 required, met). **M2 pass** (each full module masters at least one data_object). **M7 pass** (no master + consumer collision within domain). **B9 hard-fail** (all 16 CPQ-published trigger_events carry empty `event_category`; Rule #13 requires one of `lifecycle / state_change / threshold / signal`). **B9b advisory** (0 intra-domain cross-module handoffs on a 3-module domain; lifecycle progression CPQ-QUOTE-BUILDER → CPQ-APPROVALS-CONTRACTS on `sales_quote.submitted_for_approval` and `quote_discount.threshold_exceeded` is implied but unmodelled). **B10b partial** (9 of 9 outbound rows carry NULL `source_domain_module_id`; 4 of 4 inbound rows carry NULL `target_domain_module_id`, both CPQ's own gap). **B11 hard-fail** (0 aliases on 8 CPQ masters; market-standard vendor terminology such as `proposals` for `sales_quotes`, `quote_items` for `quote_lines`, `discount_schedules` for `pricing_rules` is unmodelled). **C1/C2 pass** (lifecycle states exist on 4 masters; valid state machines). **D1 pass** (all 8 masters have at least one outbound relationship). **E1 pass** for domain regulations (PCI, VAT, ASC 606). **E2 hard-fail** (0 role_modules linking any CPQ-specific role to any CPQ full module; 0 CPQ-named roles exist). **E3 hard-fail** (0 permissions on `domain_module_id IN (164, 165, 166)`; Rule #14 baseline of 3 permissions per full module is not met, expected 9 baseline permissions plus workflow-gate permissions for the 4 lifecycle states with `requires_permission=true`). **E6 N/A** until E2/E3 are seeded. **F1 pass** for tools shared across the platform. **F2 hard-fail** (0 of 3 full modules have a `skill_type='system'` skill; Rule #17 requires exactly 1 per module). **F3 hard-fail** (no system skills exist for the full modules, therefore 0 `skill_tools` rows; the Semantius score for CPQ proper is uncomputable). **F5 hard-fail** (Semantius score uncomputable). **F7 N/A** until F2 is seeded. **H1 hard-fail** (6 of 13 cross-domain handoffs tagged; 4 `agent_curated` + 2 `discovery_substring`; zero `record_status='approved'`; SKILL volume target is 0.5N to 0.8N agent_curated for N=13 = 7 to 10 tags).

**Pattern-flag check (B4).** `sales_quotes.has_submit_lock=true` and `has_single_approver=true` are set, plausible. `discount_approvals.has_single_approver=true` is set. The other 6 masters carry default `false` on every pattern flag; Pass 2 review surfaces `quote_discounts.has_submit_lock` and `contract_drafts.has_submit_lock` as likely-`true` based on workflow shape, B4 advisory.

**Rule #15 notes-pollution check.** All 8 CPQ `data_objects.notes` are empty (good). Spot-check on `domain_module_data_objects.notes` and `data_object_relationships.notes` returns empty across the CPQ rows pulled (good). No revert work owed on CPQ.

**Operating Semantius score for CPQ proper.** Uncomputable (zero system skills on the 3 full modules). Until F2/F3 land, every market-comparison score for CPQ is `n/a`. The starter `HVAC-SVC-MGMT` does carry a system skill (236, `hvac_svc_mgmt_agent`) but the starter is a separate deployable and does not satisfy F2 for the host domain's full modules.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B9 hard fail, missing event_category on every CPQ trigger_event** | All 16 CPQ-published trigger_events carry empty `event_category` violating Rule #13. Events: 474 `sales_quote.created`, 475 `sales_quote.submitted_for_approval`, 476 `sales_quote.approved`, 477 `sales_quote.sent`, 478 `sales_quote.accepted_by_buyer`, 479 `sales_quote.rejected`, 480 `quote_line.added`, 481 `product_configuration.completed`, 482 `pricing_rule.updated`, 483 `discount_approval.requested`, 484 `discount_approval.granted`, 485 `product_bundle.published`, 486 `contract_draft.generated`, 1158 `quote_discount.applied`, 1159 `quote_discount.approved`, 1160 `quote_discount.threshold_exceeded`. | PATCH 16 rows. Proposed: 474 → `lifecycle`, 475/476/479/481/483/484/485/486/1158/1159 → `state_change`, 477 → `signal`, 478 → `signal`, 482 → `lifecycle`, 480 → `lifecycle`, 1160 → `threshold`. |
| B1-S2 | **F2 + F3 + F5 hard fail, no system skills on any full module** | None of `CPQ-PRODUCT-CATALOG` (164), `CPQ-QUOTE-BUILDER` (165), `CPQ-APPROVALS-CONTRACTS` (166) has a `skill_type='system'` skill, therefore 0 `skill_tools` rows exist for the domain proper, and the Semantius score is uncomputable. Rule #17 requires exactly 1 system skill per `domain_modules` row plus ≥1 `skill_tools` row. | Phase F load: author 3 system skills (`product_catalog_agent` for 164, `quote_builder_agent` for 165, `approvals_contracts_agent` for 166), each with 5-20 `skill_tools` rows. Floor per module: `query_<entity>` for each master plus lifecycle-mutate tools for states with `requires_permission=true` (currently 4 such states across `sales_quotes`, `quote_discounts`, `discount_approvals`). |
| B1-S3 | **E2 + E3 hard fail, no roles or permissions on full modules** | 0 CPQ-named roles, 0 `role_modules` linking any role to 164 / 165 / 166, 0 permissions on `domain_module_id IN (164, 165, 166)`. Baseline of 3 permissions per full module (Rule #14 module-permission derivation) requires 9 rows minimum: `cpq-product-catalog:read`, `:manage`, `:admin`; `cpq-quote-builder:read`, `:manage`, `:admin`; `cpq-approvals-contracts:read`, `:manage`, `:admin`. Workflow-gate permissions derive from the 4 lifecycle states with `requires_permission=true` (sales_quote.submitted_for_approval, sales_quote.approved, quote_discount.approved, discount_approval.approved). | Phase E load: insert 9 baseline permissions + 4 workflow-gate permissions, 3-5 CPQ roles (e.g. SALES-REP, DEAL-DESK-ANALYST, PRICING-MANAGER, CPQ-ADMIN), and the corresponding `role_modules` + `role_permissions` rows. Standard module scaffolding from the semantic-model-deployer skill. |
| B1-S4 | **B11 missing aliases on every CPQ master** | 0 `data_object_aliases` rows exist for any of the 8 CPQ masters. Market terminology that should be aliased: `sales_quotes` ↔ `proposals` (HubSpot, DealHub), `sales_quotes` ↔ `bids` (Tacton, IBM Sterling), `quote_lines` ↔ `quote_items` (Salesforce CPQ), `quote_lines` ↔ `line_items` (Conga CPQ), `pricing_rules` ↔ `discount_schedules` (Salesforce CPQ), `pricing_rules` ↔ `price_books` (Salesforce, Oracle CPQ), `product_bundles` ↔ `bundle_offers` (DealHub), `product_configurations` ↔ `configured_products` (Tacton, Cincom), `discount_approvals` ↔ `approval_steps` (Salesforce CPQ), `contract_drafts` ↔ `quote_contracts` (Salesforce CPQ), `quote_discounts` ↔ `discount_lines` (Conga). | Phase B alias load: insert approximately 12-15 alias rows. Per Rule #18, vendor synonyms belong on `data_object_aliases` (commerce-shaped). |
| B1-S5 | **C1 partial, missing lifecycle states on 4 masters** | Only 4 of 8 masters carry `data_object_lifecycle_states`: `sales_quotes` (7 states), `quote_discounts` (5), `discount_approvals` (3), `contract_drafts` (6). Missing on `quote_lines` (417), `product_configurations` (418), `pricing_rules` (419), `product_bundles` (422). Per Rule #12, every `master + required` data_object needs lifecycle states unless explicitly exempted as config-shape. `pricing_rules` and `product_bundles` plausibly qualify for the config-shape exemption (publish / deprecate is the only workflow); `product_configurations` and `quote_lines` carry observable workflow (configuration validated, line locked when parent quote is locked) and should have states. | Phase B lifecycle load: author state machines for `product_configurations` (draft → validating → valid → invalid) and `quote_lines` (draft → locked → cancelled). Surface the `pricing_rules` and `product_bundles` config-shape exemption claim to the user as B2-S5 below. |
| B1-S6 | **B10b own-side, NULL source_domain_module_id on every outbound** | All 9 outbound cross-domain handoffs carry NULL `source_domain_module_id`: 62 (→ CLM-REPOSITORY on quote.accepted), 204 (→ CRM-PIPELINE-MGT on quote.expired), 482 (→ CLM-AUTHORING on contract_draft.generated), 483 (→ CRM-PIPELINE-MGT on sales_quote.accepted_by_buyer), 484 (→ ERP-FIN on sales_quote.approved), 485 (→ SUB-MGMT on sales_quote.accepted_by_buyer), 1013 (→ CRM-PIPELINE-MGT on quote_discount.applied), 1014 (→ CLM on quote_discount.approved), 1015 (→ ERP-FIN on quote_discount.threshold_exceeded). This is CPQ's own fix per B10b asymmetry. | PATCH 9 rows with `source_domain_module_id` derived from the publishing master's owning module: 62 / 483 / 478-related → 165 (CPQ-QUOTE-BUILDER); 482 / 486 → 166 (CPQ-APPROVALS-CONTRACTS); 1013 / 1014 / 1015 → 165 (publishing master `quote_discounts` lives in CPQ-QUOTE-BUILDER); 484 / 485 / 204 → 165 (publishing master `sales_quotes` lives in CPQ-QUOTE-BUILDER). |
| B1-S7 | **B10b own-side, NULL target_domain_module_id on inbound 527 and 1236** | 2 inbound rows carry NULL `target_domain_module_id` where the CPQ-side receiving module is deterministic: 527 (CRM-ACCT-MGT 46 → CPQ on `account.tier_changed` carrying `customers`) targets pricing logic that lives in CPQ-PRODUCT-CATALOG (164), and 1236 (PIM 143 → CPQ on `pim_product.published` carrying `product_configurations` 418) deterministically lands on CPQ-PRODUCT-CATALOG (164) since 164 masters `product_configurations`. Inbound 61 (CRM 48 → CPQ on `crm_opportunity.requires_quote`) targets CPQ-QUOTE-BUILDER (165) since the workflow surfaces a quote. Inbound 517 (CLM-AUTHORING 125 → CPQ on `contract_template.published`) targets CPQ-APPROVALS-CONTRACTS (166) where contract_drafts live. | PATCH 4 rows: 527 → 164, 1236 → 164, 61 → 165, 517 → 166. |
| B1-S8 | **B10b report-only, NULL source_module on inbound (owed by source domains)** | Inbound rows are otherwise populated on the CPQ side; the source-side NULLs are owed by the source domain audits. Source-side `source_domain_module_id` NULLs already populated on every inbound (61=48, 517=125, 527=46, 1236=143). Clean. No report-only items in this direction. | None for CPQ. |
| B1-S9 | **B10b report-only, NULL target_module on outbound (owed by target domains)** | 4 outbound rows carry NULL `target_domain_module_id` and the target-side module is the target domain's audit work: 484 (ERP-FIN, no modules yet per cross-domain b2 baseline), 485 (SUB-MGMT, target module unknown), 1014 (CLM, candidate CLM-REPOSITORY 127 or CLM-AUTHORING 125), 1015 (ERP-FIN, no modules yet). | Schedule b1 audits for ERP-FIN, SUB-MGMT, CLM (CLM's already ran 2026-05-30, can be re-resolved against the new event_category and the existing tags). Outbound 62 / 204 / 482 / 483 / 1013 already populated. |

#### APQC TAGGING

6 of 13 cross-domain handoffs already carry `handoff_processes` rows: 4 `agent_curated` (62, 482, 1014, 517) and 2 `discovery_substring` (204, 527). Zero `record_status='approved'`. SKILL volume target for N=13: 7 to 10 agent_curated tags. **Proposed work for B1-H1 (in scope):** REPLACE the 2 `discovery_substring` rows with `agent_curated` (or confirm), and INSERT 7 new agent_curated rows for the untagged handoffs.

| ID | handoff_id | source → target | trigger_event | payload | Proposed PCF row | confidence | action |
|---|---|---|---|---|---|---|---|
| H-01 | 62 | CPQ-QUOTE-BUILDER → CLM-REPOSITORY | `quote.accepted` (102) | `legal_contracts` | Develop and manage sales proposals, bids, and quotes (11779 L3) | confident | KEEP (already agent_curated) |
| H-02 | 482 | CPQ-APPROVALS-CONTRACTS → CLM-AUTHORING | `contract_draft.generated` (486) | `contract_drafts` | Develop and manage sales proposals, bids, and quotes (11779 L3) | confident | KEEP (already agent_curated) |
| H-03 | 1014 | CPQ-QUOTE-BUILDER → CLM | `quote_discount.approved` (1159) | `quote_discounts` | Develop and manage sales proposals, bids, and quotes (11779 L3) | confident | KEEP (already agent_curated) |
| H-04 | 517 | CLM-AUTHORING → CPQ-APPROVALS-CONTRACTS | `contract_template.published` (534) | `contract_templates` | Reconcile is in fact a sales-cycle event; current tag at "Resolve customer problems, requests, and inquiries" (10395 L4) looks weak. Better: Develop and manage sales proposals, bids, and quotes (11779 L3) or Develop sales strategy (10003 L3 / child). | medium | REPLACE proposed |
| H-05 | 204 | CPQ-QUOTE-BUILDER → CRM-PIPELINE-MGT | `quote.expired` (164) | `crm_opportunities` | Develop and manage sales proposals, bids, and quotes (11779 L3) | confident | REPLACE: existing row is `discovery_substring` pointed at the same PCF row 149, propose confirm as `agent_curated` |
| H-06 | 527 | CRM-ACCT-MGT → CPQ | `account.tier_changed` (163) | `customers` | Existing tag "Perform planning and management accounting" (10728 L2) is wrong-domain. Better: Manage sales partners and alliances (10402 L3) or Manage sales orders (10399 L3 child price-list-update). | medium | REPLACE proposed |
| H-07 | 483 | CPQ-QUOTE-BUILDER → CRM-PIPELINE-MGT | `sales_quote.accepted_by_buyer` (478) | `sales_quotes` | Develop and manage sales proposals, bids, and quotes (11779 L3) | confident | INSERT |
| H-08 | 484 | CPQ-QUOTE-BUILDER → ERP-FIN | `sales_quote.approved` (476) | `sales_quotes` | Develop and manage sales proposals, bids, and quotes (11779 L3) | confident | INSERT |
| H-09 | 485 | CPQ-QUOTE-BUILDER → SUB-MGMT | `sales_quote.accepted_by_buyer` (478) | `sales_quotes` | Develop and manage sales proposals, bids, and quotes (11779 L3) | confident | INSERT |
| H-10 | 1013 | CPQ-QUOTE-BUILDER → CRM-PIPELINE-MGT | `quote_discount.applied` (1158) | `quote_discounts` | Develop and manage sales proposals, bids, and quotes (11779 L3) | confident | INSERT |
| H-11 | 1015 | CPQ-QUOTE-BUILDER → ERP-FIN | `quote_discount.threshold_exceeded` (1160) | `quote_discounts` | Develop and manage sales proposals, bids, and quotes (11779 L3, deal-desk threshold review) or Manage pricing (10286 L2 child) | confident | INSERT |
| H-12 | 61 | CRM-PIPELINE-MGT → CPQ-QUOTE-BUILDER | `crm_opportunity.requires_quote` (85) | `crm_opportunities` | Develop and manage sales proposals, bids, and quotes (11779 L3) | confident | INSERT |
| H-13 | 1236 | PIM → CPQ-PRODUCT-CATALOG | `pim_product.published` (1274) | `product_configurations` | Manage product master data (10283 L3) or Manage marketing assets (10410.x) | confident | INSERT |

Combined APQC tagging fix volume: 7 INSERT + 2 REPLACE + 1 medium-confidence REPLACE on 517 = 10 row touches, all `proposal_source='agent_curated'`, all `record_status='new'`. Zero deferred-to-Discover items (every CPQ handoff has a plausible PCF home in the sales-proposal or pricing branches of the APQC PCF cross-industry framework).

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (B9 events + B11 aliases + C1 lifecycle + E2/E3 RBAC + F2/F3 skills + B10b own-side) | 7 |
| BOUNDARY (B10b report-only) | 1 |
| **APQC TAGGING** (per-handoff PCF activity classification) | 1 (covers 10 row touches) |
| MODULARIZATION ISSUES | 0 (route to Bucket 2 / 3) |
| **Bucket 1 total** | 9 items |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

For the 2 heavy neighbors (edge weight ≥3) the 5-section pairwise diff produces the per-neighbor findings below. Section 1 (existing handoffs wired) is a sanity check. Section 2 covers NULL FK candidates. Section 3 surfaces missing handoffs the catalog implies. Section 4 surfaces boundary integrity gaps. Section 5 covers cross-domain relationship mirror checks.

**CLM ↔ CPQ (weight 8).** Wired pairs: 4 (CPQ→CLM 62 quote.accepted; CPQ→CLM 482 contract_draft.generated; CPQ→CLM 1014 quote_discount.approved; CLM→CPQ 517 contract_template.published). Section 2: 62 / 482 / 1014 have NULL `source_domain_module_id` (CPQ's B1-S6); 1014 has NULL `target_domain_module_id` (CLM owes); 517 has NULL `target_domain_module_id` (CPQ's B1-S7). Section 3: a likely missing handoff is CPQ-APPROVALS-CONTRACTS → CLM on `discount_approval.granted` (484) since post-discount-approval the contract draft moves into CLM authoring. Bucket 2 candidate (B2-S2). Section 4: clean. Section 5: cross-relationships `sales_quotes drafts legal_contracts` (515), `contract_drafts drafts legal_contracts` (516), `quote_discounts flows into legal_contracts` (517), `contract_templates published_to contract_drafts` (511) all exist. Healthy.

**CRM ↔ CPQ (weight 6).** Wired pairs: 5 (CPQ→CRM 204 quote.expired; CPQ→CRM 483 sales_quote.accepted_by_buyer; CPQ→CRM 1013 quote_discount.applied; CRM→CPQ 61 crm_opportunity.requires_quote; CRM→CPQ 527 account.tier_changed). Section 2: 204 / 483 / 1013 have NULL `source_domain_module_id` (CPQ's B1-S6); 527 has NULL `target_domain_module_id` (CPQ's B1-S7). Section 3: missing handoff CPQ-QUOTE-BUILDER → CRM-PIPELINE-MGT on `sales_quote.rejected` (479) or on `sales_quote.sent` (477) for stage-progression telemetry; one-line B2-S3. Section 4: the legacy `domain_data_objects` rollup row for `crm_opportunities` (100) as `consumer + required` on CPQ has no DMDO mirror; CPQ-QUOTE-BUILDER (165) should declare `crm_opportunities` as `consumer + required` per Rule #14 (the quote is built from the opportunity). **B1-S2-derived candidate**: surface as part of the F2 skill load (the system skill's `query_crm_opportunities` tool implies the DMDO row). Section 5: no DOR cross-rels between CPQ masters and CRM masters; coupling is handoff-mediated only.

**Lighter neighbors (one-line summaries):**

- **ERP-FIN ↔ CPQ (weight 2).** Outbound 484 / 1015 both NULL on both FKs. CPQ side patched in B1-S6 (source → 165). ERP-FIN side awaits ERP-FIN's b1 (and per the cross-domain baseline, ERP-FIN has 0 DMDOs and needs Phase B). No DOR cross-rels.
- **PIM ↔ CPQ (weight 2).** Inbound 1236 has NULL target FK; CPQ side patched in B1-S7 (target → 164). Cross-relationship `pim_products configured_as product_configurations` (1127) exists.
- **SUB-MGMT ↔ CPQ (weight 1).** Outbound 485 has NULL on both FKs. CPQ side patched in B1-S6 (source → 165). SUB-MGMT side awaits SUB-MGMT b1.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **F2 / F3 / E2 / E3 readiness, scope of the Phase E + Phase F catch-up load.** B1-S2 and B1-S3 collectively want a substantial Phase E + Phase F load: 3 system skills with 15-45 tools total, plus 9 baseline permissions + 4 workflow-gate permissions, plus 3-5 CPQ roles and the role_modules / role_permissions junctions. This is roughly a 80-120 row load. The market-vendor scoping is well-known (Salesforce CPQ admin, deal desk analyst, pricing manager, sales rep are standard roles); the question is whether you want to authorize the load now in a single Phase E + Phase F batch, or stage it: (a) author Phase E (roles + permissions) first, audit, then Phase F (skills + tools), (b) author Phase F first since the skill_tools rows imply most of the workflow-gate permission needs, (c) full single-batch load. | Sequencing preference is the user's call; both staging shapes work and the deployer skill prefers (c) for fewer round-trips. | (a) Phase E first, then F. (b) Phase F first, then E. (c) Single combined load. |
| B2-S2 | **Missing handoff CPQ-APPROVALS-CONTRACTS → CLM on `discount_approval.granted`.** Pairwise Section 3 surfaces a likely-missing handoff: when a high-value discount is granted (event 484), the corresponding contract draft is unblocked for CLM authoring. Current catalog uses `contract_draft.generated` (482) as the CLM trigger, which fires regardless of approval state. Surface the design call: do you want to add the second handoff (post-approval gating signal to CLM-AUTHORING), or treat `contract_draft.generated` (482) as a post-approval trigger by definition (the draft is generated only after approval lands)? | Workflow-gate semantics: depends on whether `contract_draft.generated` is the post-approval signal or the upstream draft-creation event. | (a) Add second handoff `discount_approval.granted` → CLM-AUTHORING. (b) Confirm `contract_draft.generated` is the post-approval signal, no second handoff needed. (c) Reshape: rename `contract_draft.generated` to `contract_draft.approved_for_clm` and treat as the post-gate event. |
| B2-S3 | **Missing CRM telemetry handoffs.** Pairwise Section 3 surfaces 2 missing handoffs for stage-progression telemetry to CRM-PIPELINE-MGT: `sales_quote.sent` (477) and `sales_quote.rejected` (479). These would let CRM stage automation react to quote outcomes. Surface as a workflow-coverage question. | Editorial: how much CPQ-side state should CRM observe? Some shops keep all telemetry inside CPQ; others mirror to CRM for pipeline scoring. | (a) Add both handoffs. (b) Add only `sales_quote.rejected` (more decision-relevant). (c) Skip; CRM observes outcomes via opportunity stage updates instead. |
| B2-S4 | **Pattern flags on `quote_discounts` and `contract_drafts`.** Both currently carry `has_submit_lock=false`, but their lifecycle state machines clearly include lock-once-submitted shapes (`quote_discounts`: proposed → pending_approval → approved/rejected; `contract_drafts`: draft → in_review → signed → executed). Should these flip to `true`? Also: `sales_quotes.has_personal_content` is `false`, but quotes typically carry buyer contact info, billing addresses, sometimes signatory names; should this flip to `true`? | Pattern flags are workflow-shape judgments that drive downstream lockout / encryption behavior; the user owns the call. | Per-flag yes/no on (a) `quote_discounts.has_submit_lock`, (b) `contract_drafts.has_submit_lock`, (c) `sales_quotes.has_personal_content`. |
| B2-S5 | **C1 config-shape exemption claim for `pricing_rules` and `product_bundles`.** Per Rule #12, every `master + required` data_object needs lifecycle states unless explicitly exempted as config-shape (author-once / publish / deprecate). `pricing_rules` and `product_bundles` plausibly qualify (they are configuration assets, the workflow is publish or deprecate, no per-instance state machine). Surface the exemption explicitly. | The Rule #12 exemption requires user confirmation per data_object since exempting silently hollows the workflow-gate layer. | (a) Confirm exemption for both `pricing_rules` and `product_bundles`. (b) Author lifecycle states (draft → published → deprecated) for one or both. (c) Mixed (specify per master). |
| B2-S6 | **HVAC-SVC-MGMT starter hosting on CPQ.** The starter `HVAC-SVC-MGMT` (171, `module_kind='starter'`) has `domain_id=NULL` (no primary host) and a single host junction row pointing at CPQ (73). The starter embeds 11 data_objects including CPQ's `sales_quotes` (416). Is CPQ the right cross-host? HVAC service management is primarily an FSM / service-contract domain; the starter's only CPQ touchpoint is `sales_quotes` (one of 11 embedded masters). Cross-hosting on CPQ may make the starter discoverable from a CPQ landing page but it inflates CPQ's M-band footprint. | Editorial / product-discovery decision; the audit can't tell whether the cross-host is intentional discovery surface or stale. | (a) Keep cross-host on CPQ. (b) Remove the host junction and rely on the starter's eventual primary host (FSM or AGENCY-MGMT). (c) Add a second cross-host on the more-appropriate domain instead. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran semantic enumeration against Salesforce CPQ / Revenue Cloud, Conga CPQ, Oracle CPQ, SAP CPQ, DealHub, Vendavo, PROS Smart CPQ, Tacton, Cincom, IBM Sterling, Experlogix, Configure One, KBMax, eRep, plus ServiceNow CPQ and HubSpot Quotes. Compliance anchor is PCI-DSS (payment card data in quotes), EU VAT Directive (tax line calculation), ASC 606 (multi-element-arrangement contract terms). The loaded `domain_regulations` rows cover these three; broader compliance anchors that should be considered include GDPR (buyer personalization data in guided selling), CCPA (US state-level equivalent), and for regulated-industry CPQ flavors FDA Part 11 (life-sciences custom config) and FAR / DFARS (US federal CPQ).

The subagent recipe was not spawned (this is a single-pass audit per orchestrator instruction). The candidates below come from flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `guided_selling_questionnaires` | Salesforce CPQ Guided Selling, DealHub Guided Selling, Tacton Configurator question-flow are first-class persisted entities (saved scripts that route the seller through configuration). Currently the capability `CPQ-GUIDED-SELL` (272) exists but no master entity captures the questionnaire. | CPQ-QUOTE-BUILDER (master) or new CPQ-GUIDED-SELLING module |
| `proposal_templates` (or fold into existing alias) | Conga Composer, DealHub Document Generation, Salesforce CPQ Advanced Quote Templates model template entities distinct from `contract_drafts` and from CLM `contract_templates`. Currently no entity for the proposal-shaped document template (the sell-side narrative + cover page + collateral). | CPQ-QUOTE-BUILDER (master) |
| `price_books` | Salesforce CPQ Price Books, Oracle CPQ Price Lists, SAP CPQ Price Lists model price-book entities distinct from per-rule pricing logic. A price book is an environment grouping (geo, segment, channel) that wraps a set of pricing rules. Currently `pricing_rules` masters everything; the book / list grouping is folded in. | CPQ-PRODUCT-CATALOG (master, sibling to pricing_rules) |
| `deal_scoring_records` or `deal_health_records` | DealHub DealRoom, Salesforce CPQ Deal Hub, Vendavo Deal Guidance model per-quote AI scoring (margin health, win probability, comparable deals). Currently the `CPQ-PRICE-OPTIM` capability (276) exists but no master records the scoring output. | CPQ-QUOTE-BUILDER (master) or new CPQ-DEAL-INTELLIGENCE module |

#### MODULARIZATION candidates

- **CPQ-GUIDED-SELLING module candidate.** If `guided_selling_questionnaires` lands as a master, a fourth full module (`CPQ-GUIDED-SELLING`) makes more sense than overloading CPQ-QUOTE-BUILDER. Would push CPQ from 3 to 4 full modules. Tacton, Cincom, KBMax, Configure One sell standalone guided-selling configurators.
- **CPQ-DEAL-INTELLIGENCE module candidate.** If `deal_scoring_records` and AI-pricing recommendations land, the AI-overlay shape may want a separate module from the quote-construction workflow. DealHub DealRoom and Vendavo Deal Guidance are pure-play deal-intelligence flavors.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **GDPR** applicability (buyer personalization profile, guided-selling session data).
- **CCPA** US state-level equivalent.

#### Candidate-domain queue

This audit surfaced 2 domain-tier candidates and queued them in [audits/_missing-domains.md](_missing-domains.md):

- **PRICING-OPTIM** (Pricing Optimization). Vendor evidence: Pricefx, PROS Pricing, Vendavo Pricing, Zilliant, Competera. These vendors compete in price-optimization independent of full CPQ stacks; PROS and Vendavo offer pricing-only SKUs separate from their CPQ products. Adjacency: CPQ, ERP-FIN, PIM, REV-INTEL.
- **B2B-COMMERCE** (B2B Commerce). Vendor evidence: Salesforce B2B Commerce Cloud, Adobe Commerce, BigCommerce B2B, OroCommerce, SAP Commerce Cloud. Buyer self-serve quote-to-order distinct from seller-facing CPQ. Adjacency: CPQ, OMS, PIM, ERP-FIN, SUB-MGMT.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/CPQ-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which candidates to treat as confirmed and we proceed via Phase B inserts).

### Cross-bucket dependencies

- **B1-S2 (F2/F3 system skills) is gated on B1-S3 (E2/E3 roles + permissions)** in the strict reading of the deployer skill, since `skill_tools` rows want to bind to module permissions. In practice the loader can author both atomically; B2-S1 asks the sequencing question.
- **B1-S5 (lifecycle states on 4 masters) is partially gated on B2-S5** (`pricing_rules` / `product_bundles` exemption call); the answer to B2-S5 determines whether 0, 1, or 2 of those masters need lifecycle authoring.
- **B1-S6 (NULL source_domain_module_id PATCHes) is independent** and can be applied immediately.
- **B1-S7 (NULL target_domain_module_id PATCHes on inbound) is independent** and can be applied immediately.
- **B1-H1 (APQC tagging) is independent** but the 2 medium-confidence REPLACEs (517, 527) might warrant a brief user sanity-check before commit.
- **B3 entity candidates (`guided_selling_questionnaires`, `proposal_templates`, `price_books`, `deal_scoring_records`) might inform B1-S2** (the system skills should include tools for these entities if they land), so resolving Bucket 3 before scheduling Bucket 1's F2/F3 load reduces re-work.
- **B2-S6 (HVAC-SVC-MGMT host junction) is independent** of all other items.
- **PRICING-OPTIM / B2B-COMMERCE domain candidates** are independent of CPQ structural work; their triage lives in the candidate queue.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S4, S6, S7, H1-INSERTs`), or `skip`.

- **S1 (event_category PATCH on 16 events)** is trivial; one PATCH per row.
- **S2 (F2/F3 system skills load)** is the largest single item; gated on B2-S1 sequencing answer.
- **S3 (E2/E3 RBAC scaffolding)** companion to S2; both questions share B2-S1.
- **S4 (B11 alias load)** is independent; approximately 12-15 rows.
- **S5 (lifecycle states on `product_configurations` and `quote_lines`)** depends on B2-S5 for the other two masters.
- **S6 (B10b own-side source_module PATCHes on 9 outbounds)** is mechanical.
- **S7 (B10b own-side target_module PATCHes on 4 inbounds)** is mechanical.
- **S8 (no work for CPQ)**.
- **S9 (B10b report-only target_module on 4 outbounds, schedule audits on ERP-FIN, SUB-MGMT, CLM)** is not CPQ's load.
- **H1 (APQC tagging, 10 row touches)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (E + F sequencing):** (a / b / c).
- **B2-S2 (discount_approval.granted → CLM handoff):** (a / b / c).
- **B2-S3 (sales_quote.sent / rejected to CRM):** (a / b / c).
- **B2-S4 (pattern flags):** per-flag yes/no on 3 candidates.
- **B2-S5 (config-shape exemption on pricing_rules / product_bundles):** (a / b / c).
- **B2-S6 (HVAC-SVC-MGMT host on CPQ):** (a / b / c).

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 4 entity candidates + 2 modularization candidates + 2 compliance regulation candidates to treat as confirmed. The 2 domain candidates (PRICING-OPTIM, B2B-COMMERCE) live in the queue file and triage there separately.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| ERP-FIN | B10b: populate `target_domain_module_id` on outbound CPQ handoffs 484 (`sales_quote.approved` → ERP-FIN) and 1015 (`quote_discount.threshold_exceeded` → ERP-FIN). Cross-domain baseline notes ERP-FIN has 0 DMDOs (Phase B never run); ERP-FIN's b1 first needs Phase B. Add `consumer + required` DMDO on `sales_quotes` (416) and `quote_discounts` (420) in whichever ERP-FIN module subscribes (presumably revenue-recognition / order-management). |
| SUB-MGMT | B10b: populate `target_domain_module_id` on outbound 485 (`sales_quote.accepted_by_buyer` → SUB-MGMT). Add `consumer + required` DMDO on `sales_quotes` (416) in the SUB-MGMT subscription-creation module. |
| CLM | B10b: populate `target_domain_module_id` on outbound 1014 (`quote_discount.approved` → CLM); candidate target is CLM-REPOSITORY (127) or CLM-AUTHORING (125). CLM's b1 (2026-05-30) can be re-resolved against this. |

### Decisions

_(none yet)_

## 2026-05-31, Continuation: B1 technical fixes

Applied the orchestrator's technical-allow-list slice of the 2026-05-30 audit. Loader: [.tmp_deploy/fix_cpq_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_cpq_b1_technical_2026_05_31.ts). Run from project root.

### Fixes applied

| Audit ID | Type | Volume | Result |
|---|---|---|---|
| B1-S1 | PATCH `trigger_events.event_category` enum backfill on 16 CPQ events (Rule #13) | 16 PATCHes | patched=16, verified: every CPQ-published trigger_event now carries a valid `lifecycle / state_change / threshold / signal` value |
| B1-S6 | PATCH `handoffs.source_domain_module_id` own-side B10b backfill (publishing master's owning module) on 9 outbound handoffs | 9 PATCHes | patched=9, verified: 62/204/483/484/485/1013/1014/1015 -> 165 (CPQ-QUOTE-BUILDER), 482 -> 166 (CPQ-APPROVALS-CONTRACTS) |
| B1-S7 | PATCH `handoffs.target_domain_module_id` own-side B10b backfill (receiving master's owning module) on 4 inbound handoffs | 4 PATCHes | patched=4, verified: 61 -> 165, 517 -> 166, 527 -> 164, 1236 -> 164 |
| B1-H1 | INSERT `handoff_processes` APQC tags (`proposal_source='agent_curated'`, `record_status='new'`) for 6 untagged handoffs the audit confidently maps to PCF 149 ("Develop and manage sales proposals, bids, and quotes") | 6 INSERTs | inserted 6: handoffs 61, 483, 484, 485, 1013, 1015 all -> process 149 |

Total writes: 29 PATCH + 6 INSERT = 35.

### Deferred (out of orchestrator's technical allow-list)

| Audit ID | Reason for deferral |
|---|---|
| B1-S2 (F2/F3/F5 system skills, 3 modules, ~15-45 tools) | New entities; not in apply list. Also gated on B2-S1 (Phase E + Phase F sequencing). |
| B1-S3 (E2/E3 RBAC: 9 baseline + 4 workflow-gate permissions, 3-5 roles, role_modules/role_permissions) | New permissions/roles; not in apply list. Gated on B2-S1. |
| B1-S4 (B11 aliases, ~12-15 rows on 8 CPQ masters) | New `data_object_aliases` rows; not in the orchestrator's technical apply list. |
| B1-S5 (C1 lifecycle states on `product_configurations`, `quote_lines`) | New `data_object_lifecycle_states` authoring; not in apply list. Partially gated on B2-S5 (config-shape exemption for `pricing_rules` / `product_bundles`). |
| B1-S8 | No work owed for CPQ. |
| B1-S9 (4 NULL target_module on outbounds to ERP-FIN / SUB-MGMT / CLM) | Report-only; owed by target-domain audits, not CPQ. |
| B1-H1 H-04 (517 REPLACE) | Medium-confidence PCF re-target; defer to user. |
| B1-H1 H-05 (204 confirm `discovery_substring` -> `agent_curated`) | Orchestrator licenses INSERT only on `handoff_processes`; PATCH/REPLACE on existing row is out of scope. |
| B1-H1 H-06 (527 REPLACE) | Medium-confidence PCF re-target; defer to user. |
| B1-H1 H-13 (1236 INSERT) | Audit PCF proposal "10283 or 10410.x" is not uniquely resolvable to a single `processes.id`. |
| All B2-* (judgment calls) | User decision required. |
| All B3-* (Phase 0 speculative) | Phase 0 pending. |

### JWT errors

None.

### UI spot-check links

- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/handoffs
- https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

- Re-run validates the 2026-05-31 continuation slice and re-scopes residual PENDING items into schema_version: 2 state.yaml.
- Current footprint: 3 full modules (164 `CPQ-PRODUCT-CATALOG`, 165 `CPQ-QUOTE-BUILDER`, 166 `CPQ-APPROVALS-CONTRACTS`) plus starter `HVAC-SVC-MGMT` (171) cross-hosted via `domain_module_host_domains`. 8 domain-owned masters across the 3 full modules. 9 capabilities including cross-cutting `APPROVAL-WORKFLOW`. 13 cross-domain handoffs (9 outbound, 4 inbound). 3 regulations applicable (PCI-DSS 16, EU VAT Directive 39, ASC 606 57).
- Bucket 1 (in-scope, agent fixable): 6 items.
- Bucket 2 (surface-for-user, judgment): 6 items.
- Bucket 3 (Phase 0 pending, speculative): 4 items.

### Structural pass results

- **A1/A2/A3 pass.** Domain row 73 carries full metadata (crud_percentage=40, min_org_size=`20 s <500`, cost_band=`$$$`, usa_market_size_usd_m=2000, market_size_source_year=2025, certification_required=false).
- **M1 pass.** 3 full modules; 9 capabilities therefore ≥2 full modules required, met.
- **B5/B7 unchanged.** No new boundary findings beyond the 2026-05-30 baseline.
- **B9 PASS.** All 16 CPQ trigger_events now carry valid `event_category` per Rule #13 (verified). Continuation B1-S1 closed.
- **B9b advisory unchanged.** 0 intra-domain cross-module handoffs on a 3-module domain. Lifecycle progression CPQ-QUOTE-BUILDER -> CPQ-APPROVALS-CONTRACTS on `sales_quote.submitted_for_approval` and `quote_discount.threshold_exceeded` remains implied but unmodelled. Carry forward.
- **B10b own-side PASS.** All 9 outbound handoffs have non-NULL `source_domain_module_id`. 4 inbound handoffs have non-NULL `target_domain_module_id` (61, 517, 527, 1236). Continuation B1-S6 and B1-S7 closed.
- **B10b report-only OPEN.** 4 outbound rows still carry NULL `target_domain_module_id`: 484 (ERP-FIN), 485 (SUB-MGMT), 1014 (CLM), 1015 (ERP-FIN). Owed by target-domain audits.
- **B11 hard-fail unchanged.** 0 `data_object_aliases` rows for any of the 8 CPQ masters (verified empty).
- **B12 N/A** (no module hierarchy splits owed).
- **C1 partial unchanged.** 4 of 8 masters carry lifecycle states (`sales_quotes` 416 = 7 states, `quote_discounts` 420 = 5 states, `discount_approvals` 421 = 3 states, `contract_drafts` 423 = 6 states). Missing on `quote_lines` 417, `product_configurations` 418, `pricing_rules` 419, `product_bundles` 422 (verified empty). C1 carries forward; pricing_rules and product_bundles are config-shape exemption candidates pending B2-S5.
- **D1 pass** (8 masters have outbound relationships).
- **E1 pass** (3 regulations applicable: PCI-DSS, EU VAT, ASC 606).
- **E2 + E3 + E4 + E5 hard-fail unchanged.** `permissions?domain_module_id=in.(164,165,166)` returns []. `role_modules?domain_module_id=in.(164,165,166)` returns []. No CPQ-named roles. Baseline of 9 module permissions + workflow-gate permissions still owed.
- **F1 pass.** Cross-platform tools fine.
- **F2 + F3 + F5 hard-fail unchanged.** `skills?domain_module_id=in.(164,165,166)` returns []. 0 system skills across 3 full modules. Semantius score uncomputable. The starter (171) carries its own system skill (236) per the 2026-05-30 audit; does not satisfy F2 for the host domain's full modules.
- **F4 N/A** until F2/F3 land.
- **H band.** 13 cross-domain handoffs all carry `handoff_processes` rows. 11 `agent_curated` + 2 `discovery_substring` (204 -> 149, 527 -> 54). Zero `record_status='approved'`. SKILL volume target met on agent_curated count (11/13 > 0.8N). Catalog quality headline remains 0 approved.

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S2 | **F2 + F3 + F5 hard fail** | 0 system skills across 164/165/166; Semantius score uncomputable. Rule #17 requires exactly 1 `skill_type='system'` skill per full module with ≥1 `skill_tools` row. | Phase F load: author `product_catalog_agent` (164), `quote_builder_agent` (165), `approvals_contracts_agent` (166). Each gets 5-20 `skill_tools` rows. Floor per module: `query_<entity>` per master plus lifecycle-mutate tools for the 4 states with `requires_permission=true`. Gated on B2-S1 sequencing. |
| B1-S3 | **E2 + E3 + E4 + E5 hard fail** | 0 permissions on full modules, 0 role_modules, 0 CPQ-named roles. | Phase E load: 9 baseline permissions (`cpq-product-catalog:read/manage/admin`, `cpq-quote-builder:read/manage/admin`, `cpq-approvals-contracts:read/manage/admin`), 4 workflow-gate permissions (from the 4 `requires_permission=true` lifecycle states), 3-5 CPQ roles (SALES-REP, DEAL-DESK-ANALYST, PRICING-MANAGER, CPQ-ADMIN), plus role_modules and role_permissions junctions. Gated on B2-S1. |
| B1-S4 | **B11 hard fail** | 0 `data_object_aliases` rows on any of the 8 CPQ masters. Market terminology unmodelled. | Phase B alias load: approximately 12-15 alias rows per the 2026-05-30 list (proposals/bids for sales_quotes, quote_items/line_items for quote_lines, discount_schedules/price_books for pricing_rules, bundle_offers for product_bundles, configured_products for product_configurations, approval_steps for discount_approvals, quote_contracts for contract_drafts, discount_lines for quote_discounts). Independent. |
| B1-S5 | **C1 partial** | Missing lifecycle states on `product_configurations` (418) and `quote_lines` (417). `pricing_rules` (419) and `product_bundles` (422) plausibly exempt; gated on B2-S5. | Phase B lifecycle load: author state machines for `product_configurations` (draft -> validating -> valid -> invalid) and `quote_lines` (draft -> locked -> cancelled). Defer 419/422 to B2-S5 outcome. |
| B1-S9 | **B10b report-only** | 4 outbound rows still carry NULL `target_domain_module_id`: 484 (ERP-FIN), 485 (SUB-MGMT), 1014 (CLM), 1015 (ERP-FIN). | Report-only; resolved by target-domain audits. Schedule b1 on ERP-FIN, SUB-MGMT; re-resolve CLM against the new event_category values. |
| B1-H1r | **APQC tagging residue** | Continuation closed 6 INSERTs at process 149. 2 `discovery_substring` rows remain (204 -> 149 correct PCF; 527 -> 54 likely wrong-domain). 1 medium-confidence agent_curated row (517 -> 927) flagged for review. 1 inserted at a fallback PCF (1236 -> 115 instead of audit-proposed 10283/10410.x). | Mixed: PATCH 204 `proposal_source` to `agent_curated` (PCF correct); PATCH 527 `process_id` to a sales-cycle PCF and switch source to `agent_curated`; review 517 retarget call; review 1236 retarget. The 204 promotion is the only mechanical agent fix; the others surface to user. |

### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (B11 aliases + C1 lifecycle + E2/E3/E4/E5 RBAC + F2/F3/F5 skills) | 4 |
| BOUNDARY (B10b report-only) | 1 |
| **APQC TAGGING** (per-handoff PCF tagging residue) | 1 |
| MODULARIZATION ISSUES | 0 |
| **Bucket 1 total** | 6 items |

### Bucket 2, Surface-for-user (judgment calls)

Carried forward from the 2026-05-30 audit; no new questions surfaced this pass.

- **B2-S1** Phase E + Phase F sequencing (a/b/c).
- **B2-S2** Missing handoff CPQ-APPROVALS-CONTRACTS -> CLM on `discount_approval.granted` (a/b/c).
- **B2-S3** Missing CRM telemetry handoffs on `sales_quote.sent` / `sales_quote.rejected` (a/b/c).
- **B2-S4** Pattern flags on `quote_discounts.has_submit_lock`, `contract_drafts.has_submit_lock`, `sales_quotes.has_personal_content`.
- **B2-S5** C1 config-shape exemption claim for `pricing_rules` and `product_bundles` (a/b/c).
- **B2-S6** HVAC-SVC-MGMT (171) host junction on CPQ (a/b/c).

### Bucket 3, Phase 0 pending (speculative)

Carried forward from the 2026-05-30 audit.

- **B3-E1** `guided_selling_questionnaires` candidate entity. Salesforce CPQ Guided Selling, DealHub, Tacton evidence.
- **B3-E2** `proposal_templates` candidate entity. Conga Composer, DealHub Document Generation, Salesforce CPQ Advanced Quote Templates evidence.
- **B3-E3** `price_books` candidate entity. Salesforce CPQ Price Books, Oracle CPQ Price Lists, SAP CPQ Price Lists evidence.
- **B3-E4** `deal_scoring_records` candidate entity. DealHub DealRoom, Salesforce CPQ Deal Hub, Vendavo Deal Guidance evidence.

Compliance regulation candidates noted but not promoted: GDPR (buyer personalization data in guided selling), CCPA. Domain-tier candidates `PRICING-OPTIM` and `B2B-COMMERCE` already queued in `audits/_missing-domains.md`.

### Cross-bucket dependencies

- B1-S2 (system skills) coupled with B1-S3 (RBAC) under B2-S1 sequencing question.
- B1-S5 partially gated by B2-S5 (config-shape exemption on pricing_rules and product_bundles).
- B1-H1r 204 promotion is independent; the 517, 527, 1236 retargets are user-judgment.
- B3 entity candidates may inform B1-S2 (tool surface).
- B1-S9 belongs to other-domain audits, not CPQ.

### Decisions

_(none yet)_

### Fixes applied

_(none this pass; previously applied items live in the 2026-05-31 Continuation section above)_

### JWT errors

None.

### UI spot-check links

- https://tests.semantius.app/domain_map/skills
- https://tests.semantius.app/domain_map/permissions
- https://tests.semantius.app/domain_map/data_object_aliases
- https://tests.semantius.app/domain_map/data_object_lifecycle_states
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
