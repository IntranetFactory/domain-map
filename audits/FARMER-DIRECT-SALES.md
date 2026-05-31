---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 21
---

# FARMER-DIRECT-SALES, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 7 full modules (`FDS-CSA-MGMT`, `FDS-ONLINE-STORE`, `FDS-DELIVERY-OPS`, `FDS-MARKET-POS`, `FDS-WHOLESALE`, `FDS-BUTCHER`, `FDS-HARVEST-PLANNING`) + 1 starter (`CSA-STARTER`). 9 domain-owned masters (`csa_memberships`, `csa_share_packs`, `farmers_market_sales`, `wholesale_orders`, `delivery_routes`, `pickup_locations`, `butcher_orders`, `harvest_forecasts`, `farm_storefronts`) + 1 contributor (`customers`, shared with CRM) + 1 consumer (`harvest_records`, mastered by FMIS). 13 capabilities (single domain ownership; no cross-domain capabilities loaded). 7 primary solutions (Barn2Door, Local Line, GrazeCart, Harvie, Open Food Network, CSAware, Local Food Marketplace). 12 trigger_events, all with `event_category` populated. 8 cross-domain outbound handoffs (4 to CRM, 3 to ERP-FIN, 1 to FOOD-TRACE). 6 cross-domain inbound handoffs (5 from CRM customer-lifecycle events, 1 from FMIS harvest_records). 9 intra-domain cross-module handoffs (strong intra connectivity). 28 data_object_relationships including 11 platform_builtin `users` edges (Rule #10 satisfied). 20 aliases across the 9 masters. 42 lifecycle states across all masters, 24 with `requires_permission=true`. 8 system skills (1 per module, F2 pass) with 53 `skill_tools` rows. 21 baseline + 24 workflow-gate permissions (45 total) plus 3 starter baselines. 6 FDS-specific roles (Farm Operator, CSA Manager, Wholesale Manager, Delivery Coordinator, Market Cashier, plus reuse of the global role pool).
- **Vendor-surface basis (Pass 2 flagship enumeration):** Barn2Door (loaded), Local Line (loaded), GrazeCart (loaded), Harvie (loaded), Open Food Network (loaded), CSAware / Small Farm Central (loaded), Local Food Marketplace (loaded), Eatfromfarms / Crop.com / GrownBy / FoodKonnekt / Goosechase (not loaded as solutions). The loaded vendor set covers the small-farm DTC and food-hub specialist surface well. The missing names overlap heavily with the loaded set on capabilities; the gap is more about regulation and missing entities than missing solutions.
- **Bucket 1 (in-scope, agent fixable):** 7 items (plus 1 H1 APQC TAGGING tranche of approximately 11 candidate rows).
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| CRM | 4 | 5 | 1 (`customers` contributor on FDS-CSA-MGMT, FDS-ONLINE-STORE, FDS-WHOLESALE, FDS-BUTCHER) | 2 (customer relationships) | 12 | Pairwise (full) |
| ERP-FIN | 3 | 0 | 0 | 0 (no revenue / AR entity wired) | 3 | Pairwise (full) |
| FMIS | 0 | 1 | 1 (FDS consumes `harvest_records`) | 1 (`harvest_forecasts is_informed_by harvest_records`) | 3 | Pairwise (full) |
| FOOD-TRACE | 1 | 0 | 0 | 0 | 1 | Lightweight |

**Structural pass bands** (S1-S3, A1-A3, M1-M7, B1-B12, C1-C2, D1, E1-E6, F1-F5, F7, H1):

- **S1-S3** pass (domain row complete: crud_percentage=85, business_logic populated, min_org_size=`10 xs <50`, cost_band=`$`, usa_market_size_usd_m=140, market_size_source_year=2024, certification_required=false). Rule #8 metadata fully populated.
- **A1-A3** pass on capabilities (13 capabilities loaded, all FDS-domain). A2 capability-to-module mapping: 13 capabilities mapped to modules via `domain_module_capabilities` (17 mappings; CSA-STARTER realizes 4). A3 capability descriptions present.
- **M1** pass (>=1 full module). **M2 pass** (13 capabilities, 7 full modules > 2-floor). **M3** pass on naming convention. **M4** pass on `domain_module_data_objects` (every full module has >=1 master row). **M5** pass on per-module skill cardinality (handled in F2). **M6** pass on permissions structure. **M7 partial-fail (5 consumer-in-sibling rows; lifecycle_progression handoffs exist between siblings, so this is the architectural-intent question of Bucket 2)**. See B2-S1 below.
- **B1-B4** pass (data_objects loaded; Rule #18 vendor-name scan on names / descriptions clean). **B5** pass (lifecycle states loaded on every master; Rule #12 satisfied). **B6** pass (built-in `users` edges present on 11 rows; Rule #10 satisfied). **B7** pass (relationships loaded). **B8** pass (aliases loaded). **B9** pass on `event_category` (all 12 events categorized; Rule #13 enum compliance). **B9b** pass (9 intra-domain cross-module handoffs across the 7-module domain, healthy connectivity). **B10b report-only**: 6 outbound handoffs carry NULL `target_domain_module_id` (364, 960, 961, 963 to ERP-FIN and FOOD-TRACE; 962, 964 partially populated as 46 (CRM-PIPELINE)). Owed by target domains. **B11** pass (cross-domain DMDO declared on `customers`). **B12** pass (no master-row pollution detected).
- **C1-C2** pass on solutions (7 primary solutions loaded with vendor links; `solution_domains.coverage_level` set). Vendor-name placement check (Rule #18) clean: vendor names only on `vendors` and `solutions` rows.
- **D1** pass (no industry junction; D1 not applicable to this catalog state).
- **E1** pass on RBAC structure (3 baseline tiers per module: read / manage / admin; correct module-prefix naming). **E2** advisory clean (no duplicate role_modules detected for FDS modules). **E3** pass on role assignments (6 FDS-specific roles linked to modules with `interaction_level` populated). **E4** pass on workflow-gate permissions (24 gates derived from 24 `requires_permission=true` lifecycle states; 1:1 alignment). **E5** pass on permission hierarchy assumption. **E6 advisory**: workflow-gate permissions exist but explicit role bindings to gates were not enumerated in this pass; relies on permission_hierarchy expansion. See B2-S6.
- **F1** pass (system skills exist for every module). **F2 pass** (exactly 1 `skill_type='system'` skill per module; 7 full + 1 starter = 8 system skills). **F3 pass** (every system skill has >=1 `skill_tools` row; lowest is `fds_harvest_planning_agent` at 3 tools, highest is `fds_csa_mgmt_agent` at 10). **F4 pass** (every tool's `operation_kind` ↔ `data_object_id` invariant respected: `query` and `mutate` carry data_object_id, `side_effect` and `inbound` carry NULL where expected). **F5 pass** (Semantius score computable; see footprint sidebar below). **F7 partial-fail (channel-primitive justification)**: `execute_payment` and `notify_person` and `receive_webhook` are linked to multiple system skills with mixed notes population. Some rows carry workflow-justification prose in `skill_tools.notes` (Rule #15 violation, see B2-S2); other channel-primitive rows are clean. F7 itself is satisfied substantively (the workflow IS to execute payment / notify / receive callbacks for each module); the issue is Rule #15 pollution overlapping with the F7 surface.
- **H1 hard-fail**: 0 of 14 cross-domain handoffs carry `handoff_processes` rows. 0 `agent_curated`, 0 `discovery_substring`, 0 `record_status='approved'`. Volume target per SKILL: 7-11 agent_curated tags for N=14. The audit proposes 11 candidate tags below (B1-H1).

**FDS Semantius score (strict, FDS proper).** Approximately 90% (approximately 47 / 53 `skill_tools` rows on `coverage_tier='platform'`). The gap is concentrated on the `execute_payment` tool, which is `external` (Stripe / Square / payment gateway), linked across 5 of the 8 skills (189, 190, 192, 194, 237). All other tools are `platform`. Operational score remains the strict figure since none of the externals carry `integration`-tier delivery wiring.

### Vendor surface basis

Pass 2 flagship enumeration drew on the seven loaded solutions (Barn2Door, Local Line, GrazeCart, Harvie, Open Food Network, CSAware, Local Food Marketplace) plus general knowledge of Eatfromfarms, Crop.com, GrownBy (Foodshed Capital backed), FoodKonnekt, and Goosechase. Compliance-specialist coverage in this market is anchored on the FDA Food Safety Modernization Act (FSMA) Produce Safety Rule, USDA National Organic Program (NOP, for certified organic operations), and US state cottage food regulations and farmers-market sales-tax remittance regimes. No regulation rows are currently loaded for FARMER-DIRECT-SALES; this is the single biggest gap surfaced by Pass 2 (see Bucket 1 B1-S6 and Bucket 3).

The loaded vendor set is representative of the small-farm DTC and food-hub specialist surface. The competitor names missing from the catalog (Eatfromfarms, Crop.com, GrownBy, FoodKonnekt, Goosechase) overlap heavily on capabilities and would be additive coverage rather than structurally different. No flagship vendor whose product surface would change the entity model materially was identified; the structural gaps below come from regulatory anchors, not from vendor differentiation.

### Bucket 1, In-scope confirmed gaps

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | 4 |
| BOUNDARY (NULL FK or missing handoff) | 2 |
| **APQC TAGGING** (per-handoff PCF activity classification) | 1 tranche (approximately 11 candidate rows) |
| MODULARIZATION ISSUES | 0 (one merge candidate routes to Bucket 2 B2-S3, refactor conversation) |
| **Bucket 1 total** | 7 in-scope items + 1 H1 APQC tranche |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B10b report-only (outbound NULLs owed by target domains)** | 6 outbound handoffs carry NULL `target_domain_module_id`: 364 (ERP-FIN, `csa_subscription.charged`), 960 (ERP-FIN, `farmers_market_sale.recorded`), 961 (ERP-FIN, `wholesale_order.confirmed`), 963 (FOOD-TRACE, `butcher_order.ready`), and judgment calls for 365 / 962 / 964 (CRM, all populated as `target_domain_module_id=46` CRM-PIPELINE-MGT, which is probably wrong; see B2-S5 for that judgment). Strict NULL count is 4. | Schedule b1 audits for ERP-FIN and FOOD-TRACE to populate `target_domain_module_id` per the standard B10b backfill procedure. |
| B1-S2 | **B10b report-only (inbound NULLs owed by source domains)** | 1 inbound handoff carries NULL `source_domain_module_id`: 350 (FMIS, `harvest_record.created`, manual_handoff, friction_level=high). FDS's `target_domain_module_id` is populated to 124 FDS-HARVEST-PLANNING; source owed by FMIS. | Schedule b1 audit for FMIS to populate `source_domain_module_id`. |
| B1-S3 | **F7 / Rule #15 mechanical revert (notes pollution on data_objects)** | 5 of 9 FDS masters carry populated `data_objects.notes`: 514 csa_memberships ("Holds member contact, address, dietary preferences..."), 516 farmers_market_sales ("End-of-market reconciliation locks..."), 517 wholesale_orders ("Submit-lock: confirmed wholesale orders..."), 520 butcher_orders ("Single-approver pattern: farmer/butcher..."), 521 harvest_forecasts ("Published forecasts ... lock to a revision..."). The Rule #12 carve-out for pattern-flag context in `data_objects.notes` is RESCINDED per Rule #15. These rows were either auto-populated by the loader or pre-Rule-#15 user choices. The agent default is REVERT to empty string and log the incident per Rule #15 audit obligation. Surfaces to user as B2-S2 architectural question. | Pending B2-S2 user choice. If REVERT: PATCH 5 `data_objects.notes` to empty string; append incident entry to `references/skill-changelog.md`. If APPROVE-AS-WRITTEN: user supplies the exact text per row (Rule #15 discussion shape). |
| B1-S4 | **Rule #15 mechanical revert (notes pollution on skill_tools)** | Approximately 12-15 `skill_tools.notes` rows carry workflow-context prose (e.g., "Pickup reminders, swap-deadline nudges, billing receipts." on skill 189 → notify_person; "Subscription charge (full-season pre-pay or instalment)." on skill 189 → execute_payment; "Card / mobile-pay capture at the stall." on skill 192 → execute_payment; "Inbound channel for storefront payment-gateway callbacks." on skill 190 → receive_webhook; "Buyer (chef / restaurant / food-hub) account read." on skill 193 → query_customers; etc.). Per Rule #15 forbidden patterns table, "Channel-justification prose on skill_tools rows" is explicitly forbidden. Surfaces to user as B2-S2 (same architectural question as B1-S3). | Pending B2-S2 user choice. If REVERT: PATCH the affected `skill_tools.notes` rows to empty string. If APPROVE-PER-ROW: user supplies the exact wording per row. |

#### BOUNDARY findings (per neighbor; see Pass 4 below)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S5 | **Missing handoff (CRM → FDS for member portal sign-in or DTC purchase intent)** | The 5 CRM-inbound handoffs (1213 churn, 1214 signed_up, 1215 tier_changed, 1216 account_health.declined, 1217 health_score.declined) seed and update CSA member identity, but no inbound handoff covers a CRM-side purchase intent reaching FDS-ONLINE-STORE for storefront-driven DTC sales. If CRM is the system of record for prospect-to-buyer conversion in the small-farm context, a `crm_opportunity.closed_won` or `crm_contact.purchase_signal` → FDS-ONLINE-STORE handoff is the likely shape. Surface as candidate, low-confidence (small-farm CRM coverage is uneven; CRM may not be the source in this market). | Surface as B2-S4 for user confirmation before authoring. |
| B1-S6 | **Missing handoff (FDS → ERP-FIN at module-level)** | 3 of 3 ERP-FIN outbound handoffs (364, 960, 961) carry NULL `target_domain_module_id`. This is B10b report-only on the ERP-FIN side (covered by B1-S1) but additionally the trio implies a single revenue / AR landing module on ERP-FIN. ERP-FIN's b1 audit will determine the receiving module(s). No structural fix on FDS's side. | Covered by B1-S1 scheduling. |

#### APQC TAGGING (H1 hard-fail tranche)

Zero of 14 cross-domain handoffs carry `handoff_processes` rows. Per SKILL anti-pattern guidance, the prior FDS phase shipped structural fixes but no APQC tagging. The audit proposes the following candidate `agent_curated` rows from the analyst's structural-pass model. The PCF id column requires `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` lookups at fix time; the structural pass produced the proposed-row names and confidence ratings.

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id (lookup needed) | Confidence |
|---|---|---|---|---|---|---|
| 363 | FDS-CSA-MGMT → CRM | `csa_membership.activated` | `customers` | Manage customer accounts / Establish customer relationship | needs PCF lookup | confident L3 |
| 364 | FDS-CSA-MGMT → ERP-FIN | `csa_subscription.charged` | `csa_memberships` | Process accounts receivable / Process customer payments | needs PCF lookup | confident L3 |
| 365 | FDS-CSA-MGMT → CRM | `csa_share_pack.delivered` | `csa_share_packs` | Manage customer service requests / Service delivery (10408) | needs PCF lookup | medium (target probably wrong, see B2-S5) |
| 960 | FDS-MARKET-POS → ERP-FIN | `farmers_market_sale.recorded` | `farmers_market_sales` | Process revenue accounting / Record cash receipts | needs PCF lookup | confident L3 |
| 961 | FDS-WHOLESALE → ERP-FIN | `wholesale_order.confirmed` | `wholesale_orders` | Process accounts receivable / Generate invoices | needs PCF lookup | confident L3 |
| 962 | FDS-DELIVERY-OPS → CRM | `delivery_route.dispatched` | `delivery_routes` | Manage customer service requests / Service quality | needs PCF lookup | medium (target probably wrong, see B2-S5) |
| 963 | FDS-BUTCHER → FOOD-TRACE | `butcher_order.ready` | `butcher_orders` | Manage product / service quality (16448 family) | needs PCF lookup | confident L3 |
| 964 | FDS-HARVEST-PLANNING → CRM | `harvest_forecast.updated` | `harvest_forecasts` | Communicate with customers (10112 family) | needs PCF lookup | medium (target probably wrong, see B2-S5) |
| 350 | FMIS → FDS-HARVEST-PLANNING | `harvest_record.created` | `harvest_records` | Plan and align supply chain resources (10219 family) | needs PCF lookup | confident L3 |
| 1213 | CRM → FDS-CSA-MGMT | `customer.churn_confirmed` | `customers` | Manage customer accounts / Process customer cancellation | needs PCF lookup | confident L3 |
| 1214 | CRM → FDS-CSA-MGMT | `customer.signed_up` | `customers` | Manage customer accounts / Establish customer relationship | needs PCF lookup | confident L3 |
| 1215 | CRM → FDS-WHOLESALE | `account.tier_changed` | `customers` | Manage customer accounts / Update customer profile | needs PCF lookup | confident L3 |
| 1216 | CRM → FDS-CSA-MGMT | `account_health.declined` | `customers` | Manage customer relationships / Retention (10387 family) | needs PCF lookup | confident L3 |
| 1217 | CRM → FDS-CSA-MGMT | `health_score.declined` | `customers` | Manage customer relationships / Retention (10387 family) | needs PCF lookup | confident L3 |

14 candidate APQC tags total (one per cross-domain handoff). Within the SKILL H1 volume target (7 to 11), the higher-confidence 11 are the structural-pass core: 363, 364, 960, 961, 963, 350, 1213, 1214, 1215, 1216, 1217. The remaining 3 (365, 962, 964) depend on the B2-S5 CRM-target-module judgment.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | Report-only, 4 outbound NULL target_module_id, schedule audits on ERP-FIN and FOOD-TRACE |
| B1-S2 | Report-only, 1 inbound NULL source_module_id, schedule audit on FMIS |
| B1-S3 | Rule #15 revert: 5 `data_objects.notes` rows polluted (pending B2-S2 choice) |
| B1-S4 | Rule #15 revert: approximately 12-15 `skill_tools.notes` rows polluted (pending B2-S2 choice) |
| B1-S5 | Missing handoff candidate: CRM purchase signal → FDS-ONLINE-STORE (pending B2-S4) |
| B1-S6 | Report-only, ERP-FIN landing module unresolved (covered by B1-S1 scheduling) |
| B1-H1 | APQC TAGGING, propose 11 high-confidence `agent_curated` rows (plus 3 pending B2-S5 target-module judgment) |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M7 architectural choice for FDS module deployability.** 5 consumer-in-sibling DMDO rows exist: `csa_share_packs` (515) consumer in FDS-DELIVERY-OPS (120, mastered by FDS-CSA-MGMT 118); `wholesale_orders` (517) consumer in FDS-DELIVERY-OPS (120, mastered by FDS-WHOLESALE 122); `delivery_routes` (518) consumer in FDS-CSA-MGMT (118) and FDS-WHOLESALE (122, mastered by FDS-DELIVERY-OPS 120); `pickup_locations` (519) consumer in FDS-CSA-MGMT (118, mastered by FDS-ONLINE-STORE 119); `butcher_orders` (520) consumer in FDS-DELIVERY-OPS (120, mastered by FDS-BUTCHER 123). Strict M7 reads these as within-domain incoherence (don't consume what a sibling masters in the same scope). HOWEVER, FDS already has 9 intra-domain `lifecycle_progression` handoffs wiring these flows (1272-1280), so the consumer DMDOs are accurate runtime declarations of cross-module reads on the shared masters, not redundancy. The architectural intent appears to be: each FDS module is a separate deployable, but masters flow via handoffs (e.g., DELIVERY-OPS reads packs to route them, reads wholesale orders to dispatch them, reads butcher orders to deliver them). The alternative interpretation is to DELETE the consumer rows and rely solely on master + handoff (typical M7 cure). | Architectural intent + deployability strategy decision; user's call. | (a) KEEP all 5 consumer rows as accurate runtime cross-module read declarations (mark M7 as satisfied by-design for this domain). (b) DELETE all 5 sibling consumer rows (rely on handoffs + master canonical reference). (c) PROMOTE specific rows to `embedded_master` if certain modules should be standalone-deployable (e.g., FDS-DELIVERY-OPS without FDS-CSA-MGMT, FDS-WHOLESALE, or FDS-BUTCHER). |
| B2-S2 | **Rule #15 notes-pollution scope and revert authorization.** B1-S3 and B1-S4 surface populated `notes` on 5 `data_objects` rows and approximately 12-15 `skill_tools` rows. None of these texts is the load-bearing prose Rule #15 contemplates (they restate pattern flags, narrate workflow context, or label channel justifications, all of which Rule #15 explicitly forbids). The decision shape per Rule #15: revert, log incident, or user provides per-row exact wording. | Cannot proceed without user authorization per Rule #15 audit obligation. | (a) REVERT all polluted rows to empty string and log the incident per `references/skill-changelog.md`. (b) APPROVE the existing text retroactively per row (user supplies exact wording confirmation for each). (c) MIXED: revert some, approve others. |
| B2-S3 | **MODULARIZATION consideration: FDS-DELIVERY-OPS as cross-cutting module.** FDS-DELIVERY-OPS masters only `delivery_routes` but consumes 4 sibling masters (csa_share_packs, wholesale_orders, butcher_orders, customers) and is the destination of 4 cross-module lifecycle handoffs. The intra-domain handoff graph already treats it as a shared fulfillment module across CSA, wholesale, and butcher channels. Alternative shape: rename to `FDS-FULFILLMENT` and treat as a cross-cutting module hosting on FDS-CSA-MGMT, FDS-WHOLESALE, and FDS-BUTCHER via `domain_module_host_domains` (currently zero rows). This would make the cross-channel routing explicit at the module level rather than implicit in the handoff graph. | Module refactor (not a direct fix); judgment call on whether FDS-DELIVERY-OPS deserves the explicit cross-cutting model. | (a) Leave as-is (lifecycle handoffs adequately represent the dependency). (b) Rename to FDS-FULFILLMENT and add explicit host junctions to the 3 source channels. (c) Split delivery into per-channel modules (probably overkill for the small-farm operator). |
| B2-S4 | **B1-S5 missing handoff: should CRM seed DTC online-store purchase intent?** Small-farm CRM coverage is uneven: some operators run no CRM and use the storefront's built-in customer registry; others run HubSpot / Mailchimp / Klaviyo as the lead system and convert in FDS. If CRM is the system of record for top-of-funnel in this market, an inbound handoff (`crm_opportunity.closed_won` or `marketing_subscriber.purchased`) → FDS-ONLINE-STORE should exist. If the small-farm reality is that the storefront IS the lead system, no such handoff should be authored. | Market-shape judgment on small-farm CRM adoption; agent does not have authoritative evidence. | (a) Author the inbound CRM → FDS-ONLINE-STORE handoff (`crm_opportunity.closed_won` payload `customers`). (b) Skip (small-farm reality is storefront-as-CRM, no inbound needed). (c) Defer to Bucket 3 vendor research. |
| B2-S5 | **CRM target-module accuracy on 3 outbound handoffs.** 365 (csa_share_pack.delivered), 962 (delivery_route.dispatched), and 964 (harvest_forecast.updated) all carry `target_domain_module_id=46` CRM-PIPELINE-MGT. The payload + event suggests these are notifications about fulfillment events, member-facing communications, and harvest previews, none of which obviously belong in a pipeline management module. The correct CRM target is probably a customer-marketing or customer-engagement module, or these events should retarget away from CRM entirely (toward a marketing-automation or notification domain). | CRM module shape question; depends on how CRM models customer marketing vs pipeline management. | (a) Confirm CRM-PIPELINE-MGT is the correct landing (the small-farm CRM uses pipeline-mgmt as a catch-all). (b) Retarget to a different CRM module (CRM b1 audit will identify the correct module). (c) Retarget away from CRM entirely (toward MARKETING-AUTO or similar; currently not loaded). |
| B2-S6 | **E6 permission-bundle drift check.** 24 workflow-gate permissions are loaded, 1:1 with the 24 `requires_permission=true` lifecycle states. Role bindings to these gates were not enumerated in this pass; the audit assumes `permission_hierarchy` expands `:manage` and `:admin` to include the gates. Is the implicit-grant pattern intentional, or should specific gates be enumerated on FDS-specific roles (e.g., `fds-csa-mgmt:cancel_membership` explicitly granted to CSA Manager even though they already have `fds-csa-mgmt:admin`)? | Hierarchy seeding state isn't introspected here; the audit can't tell whether `permission_hierarchy` already expands the gates for FDS. | (a) Confirm hierarchy expands gates, leave bundles as-is. (b) Add explicit gate grants on specific FDS roles. (c) Leave drift, expectation is `permission_hierarchy` covers everything. |
| B2-S7 | **CSA-STARTER deployability confirmation per Rule #19.** Starter `CSA-STARTER` (172) carries 4 embedded_master rows (csa_memberships, csa_share_packs, pickup_locations, customers) plus 1 platform_builtin consumer (users). Per Rule #19 invariant 1 the role restriction is satisfied (embedded_master + consumer-on-platform-builtin only). The 10-tool system skill (`csa_starter_agent`, id 237) is comprehensive (matches Rule #19 invariant 6). Question: should the starter additionally embed `delivery_routes` (since solo CSA farms often do their own deliveries) and `harvest_forecasts` (since CSA share composition is forecast-driven)? Or is the starter intentionally minimal at 4 embeds with the assumption that delivery and forecasting need the full modules? | Editorial / product intent question; agent can't decide whether the starter's lite path is correct. | (a) Starter intentionally minimal; leave at 4 embeds. (b) Add embedded_master rows for delivery_routes and harvest_forecasts to the starter. (c) Add only one of the two (specify). |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against the seven loaded solutions plus knowledge of Eatfromfarms, Crop.com, GrownBy, FoodKonnekt, Goosechase, and the small-farm wholesale food-hub niche. The compliance anchor surface is broader than the loaded `domain_regulations` (which contains zero rows). The subagent recipe was not spawned (single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING (5) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `share_swaps` (or `share_customizations`) | Harvie, Barn2Door, Local Line all model per-week member swap / pause / dietary substitution as a structured record distinct from the share pack itself. Currently `csa_share_packs` likely conflates the share composition with the per-member customization. A `share_swaps` master would track member-specific deviation from the canonical week's pack (substitution requests, pause windows, dietary flags). | FDS-CSA-MGMT (master) |
| `farmers_market_events` | Open Food Network, Local Line, FoodKonnekt model individual farmers-market days / events as structured records (which market, which date, which booth, which vendors). Currently `farmers_market_sales` records sales but no parent event entity exists, so cross-market reporting and recurring market-day scheduling lose context. | FDS-MARKET-POS (master) |
| `producer_payouts` | Open Food Network, Local Food Marketplace, GrownBy model the food-hub multi-farm split as structured payout records per producer per fulfillment cycle. Currently the wholesale module has no payout-split entity; multi-farm aggregation is described in capability text but not materialized. | FDS-WHOLESALE (master) |
| `producers` (or `aggregator_partners`) | Food-hub aggregators (Open Food Network, Local Food Marketplace) model partner producers as a first-class entity distinct from `customers` or `vendors`. Currently no producer master, so multi-farm aggregation has no participant registry. | FDS-WHOLESALE (master), or master-module promotion |
| `cottage_food_disclosures` (or `regulatory_disclosures`) | State cottage-food regulations (US) and farmers-market sales-tax remittance regimes require disclosure records (label-required statements, gross-receipts thresholds, exemption notices). Currently no disclosure entity; regulatory exposure is implicit. | FDS-MARKET-POS or new FDS-COMPLIANCE module candidate |

#### MODULARIZATION (1) candidate

- **FDS-COMPLIANCE module candidate.** If FSMA Produce Safety records, cottage food disclosures, USDA organic certifications, and sales-tax remittance entities get loaded, an eighth module (`FDS-COMPLIANCE`) makes more sense than overloading existing modules. Would push FDS from 7 full modules to 8. Pending Bucket 3 Phase 0 verification on which compliance entities are actually market-load-bearing for small farms.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

The loaded `domain_regulations` set is empty. Pass 2 enumeration suggests:

- **FDA FSMA Produce Safety Rule** (mandatory for farms with US$25k+ produce sales, sets water testing, hygiene, biological soil amendment rules).
- **USDA National Organic Program (NOP)** (applicable to certified-organic operations; record-keeping rules on inputs, soil amendments, harvest tracking).
- **US state cottage food regulations** (varies by state; controls what can be sold at farmers markets without commercial-kitchen processing).
- **US state retail sales tax remittance** (farmers-market sales attract per-jurisdiction sales tax in many US states; remittance is operator-owed).
- **GAP / GHP certification** (Good Agricultural Practices, Good Handling Practices; voluntary but increasingly required by wholesale buyers).
- **PCI-DSS** (applicable to any operator capturing card payment at market POS or DTC checkout; vendor-mediated via Stripe / Square but the merchant of record still owes baseline compliance).

### Bucket 3 candidates to queue via append_missing_domain helper

No candidate that warrants a new top-level `domains` row was surfaced in this pass. The market gaps are entities and regulations within FARMER-DIRECT-SALES, not adjacent markets. Two candidate adjacencies were noted but should be folded into existing domains:

- **CSA-management as a standalone domain?** No, fold under FDS-CSA-MGMT module (already exists). The existing module captures the surface adequately.
- **FOOD-HUB-AGGREGATION as a standalone domain?** Currently a capability within FDS (FDS-FOODHUB-AGGREGATION on FDS-WHOLESALE). Open Food Network is the flagship multi-farm food-hub vendor. The question is whether food-hub aggregation has enough independent vendor surface to warrant a separate domain. Defer to formal Phase 0; the loaded FDS coverage is probably adequate for now.

### Cross-bucket dependencies

- **B2-S2 is upstream of B1-S3 and B1-S4** (the Rule #15 revert authorization). B1-S3 and B1-S4 cannot proceed without B2-S2 user choice.
- **B2-S5 is upstream of B1-H1** (3 of the 14 APQC tag candidates depend on whether CRM-PIPELINE-MGT is the correct target module). The 11 high-confidence tags are independent.
- **B2-S1 (M7) is independent** of Buckets 2 and 3 otherwise; the architectural choice does not affect APQC tagging or other findings.
- **Bucket 3 is independent** of Bucket 1 and (mostly) Bucket 2. Bucket 3 Phase 0 verification might surface compliance entities that change the FDS-COMPLIANCE module question, but the loaded findings stand independently.

### Per-bucket prompts

- **After Bucket 1:** Fix these now? Reply `all`, `just 1, 3, 5`, or `skip`. Note that B1-S3 and B1-S4 require the B2-S2 decision first; B1-H1 high-confidence tranche (11 rows) can proceed standalone; B1-H1 low-confidence tranche (3 rows) requires B2-S5.
- **After Bucket 2:** What's your call on each of these? I'll wait for your decision per item before acting. For B2-S2 the Rule #15 revert wording is the agent default; for any per-row approval please supply the exact text (Rule #15 discussion shape).
- **After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed. The compliance regulation list (FSMA, NOP, cottage food, sales tax, GAP, PCI-DSS) is the highest-impact item; loading these regs is structurally additive regardless of entity decisions.

### Report-only follow-ups (owed by other domains)

These items are out-of-scope for FDS to fix; surface in target-domain audits.

| Owed by | What | Why |
|---|---|---|
| ERP-FIN audit | Populate `target_domain_module_id` on outbound handoffs 364 (`csa_subscription.charged`), 960 (`farmers_market_sale.recorded`), 961 (`wholesale_order.confirmed`). Likely lands in an ERP-FIN revenue / AR module. | B1-S1 |
| FOOD-TRACE audit | Populate `target_domain_module_id` on outbound handoff 963 (`butcher_order.ready`). Likely lands in the FOOD-TRACE product / lot tracking module. | B1-S1 |
| FMIS audit | Populate `source_domain_module_id` on inbound handoff 350 (`harvest_record.created`). FDS's `target_domain_module_id=124` FDS-HARVEST-PLANNING is populated. | B1-S2 |
| CRM audit | (a) Verify `target_domain_module_id=46` CRM-PIPELINE-MGT is the correct landing for handoffs 363, 365, 962, 964 (probably wrong for 365 / 962 / 964; see B2-S5). (b) Confirm whether CRM should publish a purchase-intent / lead-conversion event to FDS-ONLINE-STORE (see B2-S4). (c) Optional: declare FDS data_object consumer DMDO on CRM modules if any CRM workflow reads FDS masters (currently none surfaced). | B2-S4, B2-S5 |
| ERP-FIN audit | Optional: declare `consumer` DMDO on FDS masters if ERP-FIN's revenue / AR module reads FDS payment / order records beyond the event payload. | Pairwise downstream |

### Pass 4, Pairwise reconciliation (per-neighbor 5-section diff)

**CRM ↔ FDS (weight 12).** Wired pairs: 9 (4 outbound: 363, 365, 962, 964; 5 inbound: 1213, 1214, 1215, 1216, 1217). Section 2: 3 of the 4 outbound rows (365, 962, 964) have `target_domain_module_id=46`, which is probably wrong for these payloads (B2-S5). All 5 inbound rows have both FKs populated. Section 3: missing CRM → FDS-ONLINE-STORE on `crm_opportunity.closed_won` if CRM is the system of record for DTC lead conversion (B2-S4). Section 4: clean (no orphaned cross-domain edges). Section 5: cross-relationships: `customers subscribes_via csa_memberships` (1101) exists; `customers buys_at farmers_market_sales` (1104) exists; `customers places wholesale_orders` (1102) exists; `customers places butcher_orders` (1103) exists. Healthy.

**ERP-FIN ↔ FDS (weight 3).** Wired pairs: 3 (outbound only: 364, 960, 961). Section 2: all 3 outbound rows have NULL `target_domain_module_id` (ERP-FIN's B10b). Section 3: missing inbound from ERP-FIN to FDS could include: refund event on subscription cancellation that would update CSA membership state; payout-completion event for wholesale orders. Defer to ERP-FIN audit. Section 4: clean. Section 5: no cross-domain `data_object_relationships` between FDS and ERP-FIN entities (no `customer_payments` or `invoices` etc. linked to FDS masters at the relationship layer). This is probably a gap; ERP-FIN's audit will catch it.

**FMIS ↔ FDS (weight 3).** Wired pairs: 1 (inbound: 350 `harvest_record.created`). Section 2: 350 has NULL `source_domain_module_id` (FMIS's B10b); target is populated to 124. Section 3: missing outbound from FDS to FMIS could include `harvest_forecast.published` (124 publishes forecasts FMIS could consume as a planning signal). Section 4: clean. Section 5: cross-relationship `harvest_forecasts is_informed_by harvest_records` (1106) exists. Healthy at the relationship layer.

**FOOD-TRACE ↔ FDS (weight 1, lightweight).** Wired pairs: 1 (outbound: 963 `butcher_order.ready`). Section 2: 963 has NULL `target_domain_module_id` (FOOD-TRACE's B10b). Section 5: no cross-domain `data_object_relationships`. Likely missing: meat traceability for butcher_orders would relate to FOOD-TRACE entities (slaughter records, processor lot records).

### Decisions

_(none yet, pending user review)_

### Fixes applied

_(none yet, pending user review)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

### Scope

Residual B1 technical pass. Applied agent-fixable items where the original audit pre-specified row IDs and the fix mechanics are deterministic (no judgment call). Loader: `c:/dev/domain-map/.tmp_deploy/fix_farmer_direct_sales_b1_technical_2026_05_31.ts`. Idempotent (pre-flights every write).

### Fixes applied

| ID | Type | Action | Rows |
|---|---|---|---|
| B1-S3 | Rule #15 notes revert | PATCH `data_objects.notes` to `''` on IDs 514, 516, 517, 520, 521. Audit named IDs; Rule #15 default is revert when the prior carve-out for pattern-flag context is RESCINDED. | 5 PATCHes |
| B1-H1 | APQC handoff_processes (high-confidence subset) | INSERT `handoff_processes` rows with `proposal_source='agent_curated'`, `record_status='new'` (default), `role='implements'` (default). PCF IDs resolved via live `/processes` lookups. | 9 INSERTs |

H1 PCF mapping applied (process_id ← external_id):
- 363 csa_membership.activated → 148 (10183 Manage customers and accounts)
- 364 csa_subscription.charged → 1356 (10800 Receive/Deposit customer payments)
- 960 farmers_market_sale.recorded → 55 (10729 Perform revenue accounting)
- 961 wholesale_order.confirmed → 302 (10743 Invoice customer)
- 1213 customer.churn_confirmed → 718 (11174 Manage customer relationships)
- 1214 customer.signed_up → 148 (10183 Manage customers and accounts)
- 1215 account.tier_changed → 148 (10183 Manage customers and accounts)
- 1216 account_health.declined → 718 (11174 Manage customer relationships)
- 1217 health_score.declined → 718 (11174 Manage customer relationships)

### Deferred

- **B1-S1, B1-S2, B1-S6** (B10b NULL FK backfills): owed by ERP-FIN, FOOD-TRACE, FMIS audits; not derivable from FDS-side modules.
- **B1-S4** (Rule #15 skill_tools.notes revert): audit gives "approx 12-15 rows" with no exact IDs pre-specified; per prompt criterion, notes reverts apply only when audit pre-specifies row IDs.
- **B1-S5** (missing CRM purchase-intent handoff): gated on B2-S4 user judgment.
- **B1-H1 partial**: 365, 962, 964 deferred (gated on B2-S5 CRM target-module judgment); 963 deferred (audit-suggested PCF family 16448 resolves to unrelated risk-management process, no clean alternative without further analyst judgment); 350 already tagged (process 171, pre-existing).
- **All Bucket 2 items** (B2-S1 through B2-S7): user-judgment surface.
- **All Bucket 3 items**: speculative entities, regulations, and modularization candidates pending Phase 0 verification.

### Verification

Post-load summary (from loader):
- `data_objects` IDs 514, 516, 517, 520, 521: `notes=''` confirmed.
- `handoff_processes` 9 new rows present with `proposal_source=agent_curated`, `record_status=new` for handoffs 363, 364, 960, 961, 1213, 1214, 1215, 1216, 1217.

UI: https://tests.semantius.app/domain_map/handoff_processes and https://tests.semantius.app/domain_map/data_objects


