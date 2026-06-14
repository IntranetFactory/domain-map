# SOCIAL-ADS audit history

## 2026-06-14 - Build

Promoted the triage candidate SOCIAL-ADS (Paid Social Advertising) from the SMM-audit queue
(mention count 2; vendor evidence Smartly.io, Sprinklr Ads, AdEspresso, Strike Social, Stackla,
Madgicx; adjacency SMM / ADV-AD-TECH / MA / REV-INTEL) to a distinct domain and loaded the full
build live at `record_status='new'`.

### Phase 0 (research + verdict)

Report: [.tmp_deploy/SOCIAL-ADS-phase0-2026-06-14.md](../../.tmp_deploy/SOCIAL-ADS-phase0-2026-06-14.md).

- Live overlap check (CLI, never MCP) confirmed SMM (106, organic publishing), MA (70, lifecycle),
  REV-INTEL (103) exist; **ADV-AD-TECH does NOT exist** in the catalog (the triage adjacency was
  aspirational). No domain currently owns paid social ad management.
- Point-solution-market test: PASSES. Four independent flagship pure-plays whose flagship product is
  paid social ad management: Smartly.io, Madgicx, Strike Social, Adsmurai. Skai (formerly Kenshoo)
  adds an enterprise omnichannel reference. M&A confirming the category is real and consolidating:
  AdEspresso -> Hootsuite (now an SMM-suite paid module), ROI Hunter -> Pattern (Dec 2025, retail
  media), Pencil -> Brandtech (2023, creative tooling). Boundary held: paid (ad accounts, ad sets,
  budget, DCO, conversion events) vs SMM organic publishing.
- **Verdict: promote-as-domain.**

### Phase A (domain + capabilities + modules + vendors + solutions)

- `domains`: SOCIAL-ADS id **177**, all 7 metadata fields set (crud_percentage 55, business_logic on
  the bid/budget/DCO/attribution decision loops, min_org_size `20 s <500`, cost_band `$$`,
  certification_required false, usa_market_size_usd_m 2200, market_size_source_year 2025). Catalog
  tagline + description authored buyer-voice (Rule #20).
- `capabilities` (6) + `capability_domains` (6): campaign orchestration, DCO, budget reallocation,
  creative versioning, attribution/incrementality, audience management.
- `domain_modules` (2 full, Rule #14): **360** Campaign Orchestration, **361** Creative Optimization,
  both with catalog tagline + description. `domain_module_capabilities` (6) attach each capability to
  its realizing module.
- `vendors` (5, all new): Smartly.io (752), Madgicx (753), Strike Social (754), Adsmurai (755),
  Skai (756). `solutions` (5): Smartly, Madgicx, Strike Social, Adsmurai Marketing Platform, Skai
  Paid Social, all `solution_domains` coverage_level=primary. Predecessor facts (Skai ex-Kenshoo,
  Smartly absorbed Ad-Lib.io) recorded in `description`, never `notes` (Rule #15 rescinds #18 carve-out).

### Phase B (masters + relationships + lifecycle + events + handoffs)

- `data_objects` (13 masters), prefixed to avoid collisions (Rule #9), entity_type on every master,
  pattern flags set explicitly (NOT-NULL): social_ad_accounts (operational_record), social_ad_campaigns
  (operational_workflow, single_approver), social_ad_sets (operational_workflow), social_ads
  (operational_workflow), ad_audiences (operational_record, personal_content), ad_budget_allocations
  (operational_record), social_ad_performance_metrics (computed), ad_conversion_events
  (operational_record), social_ad_creatives (operational_workflow, submit_lock + single_approver),
  creative_variants (operational_record), ad_creative_assets (catalog), dco_rules (catalog),
  ad_product_feeds (catalog).
- `domain_module_data_objects`: 13 master rows (one per master, single-master invariant) + 2 cross-
  module consumer rows. Rule #16 necessity: ad_product_feeds master+optional (vendor/sector-conditional),
  all other masters master+required.
- `data_object_lifecycle_states` (21) on the 4 operational_workflow masters with workflow states
  (campaigns: draft -> in_review -> active -> paused -> completed/archived with gated transitions;
  ad sets; ads; creatives draft -> in_review -> approved -> published -> archived), realizing module set.
- `data_object_relationships` (20): intra-domain structure (campaign/ad_set/ad/creative tree, budget
  pacing, metrics, conversions), 4 `users` edges (Rule #10: manages campaign, authors/approves creative,
  owns budget), and cross-domain edges to SMM (campaign promotes social_posts), CDP/MA (ad_audiences
  syncs from audiences), and conversion edges to customers.
- `data_object_aliases` (11): ad group, campaign tier, custom/lookalike audience, ad creative, etc.
- `trigger_events` (5): social_ad_campaign.launched, ad_conversion.captured, ad_budget.reallocated,
  social_ad_performance.threshold_breached, social_ad_creative.approved.
- `handoffs` (4): conversion data -> REV-INTEL (attribution), conversion -> MA (nurture/suppression),
  campaign launched -> SMM (organic/paid alignment), and an intra-domain creative.approved -> Campaign
  Orchestration (lifecycle_progression across modules).

### Phase C (business function ownership)

- `business_function_domains` (2): Marketing **owner**, Sales consumer.

### Phase S (system skill + tools)

- `tools`: 14 referenced; 12 new + 2 reused (`notify_person`, `notify_team` pre-existing shared
  abstractions, Rule #4). query/mutate platform tools carry data_object_id; fetch tools for the
  external ad-platform Marketing APIs (Meta / TikTok / LinkedIn insights + push + Conversions API) and
  side_effect notify tools carry null data_object_id (invariant holds). coverage_tier set on every tool.
- `skills`: one domain-grain `system` skill `social-ads-system` (id **464**, domain_id=177,
  domain_module_id NULL, Rule #17) deriving its toolset from the modules' domain_module_tools.
- `domain_module_tools` (16): Campaign Orchestration (12) + Creative Optimization (4), requirement_level
  required/optional.

### Phase E (personas + RACI)

- `domain_roles` (3): Paid Social Manager (MARKETING-PAID-SOCIAL-MANAGER), Performance Marketer
  (MARKETING-PERFORMANCE-MARKETER), Creative Strategist (MARKETING-CREATIVE-STRATEGIST), all under
  Marketing.
- `role_modules` (6): every persona reaches both modules (>=2-module floor).
- `process_raci` (6) on real cross-industry PCF nodes (carve-out: no net-new APQC processes):
  3.3 Develop and manage marketing plans (id 23), 3.3.2 Establish marketing budgets (id 134),
  3.3.4.2 Develop marketing messages (id 662). Exactly-one-actor satisfied (actor_role_id set,
  actor_skill_id null).

### Compliance / verification

- Rule #1: every row `record_status='new'`; nothing stamped approved/pending/rejected.
- Rule #15: verified by query that `notes` is empty on every inserted row across data_objects,
  data_object_aliases, data_object_relationships, domain_module_data_objects, domain_module_tools,
  handoffs, role_modules, solution_domains, vendors, solutions.
- No git, no em-dash, American English, no Python, no MCP (all I/O via the semantius CLI).

Loader: [.tmp_deploy/load_social_ads_2026_06_14.ts](../../.tmp_deploy/load_social_ads_2026_06_14.ts) (idempotent, Bun, run from project root).

### Open

- B2-S1 (gate): keep SOCIAL-ADS distinct vs fold into SMM. Recommended: keep distinct (built that way),
  grounded in 4 independent flagship pure-plays.
- B2-S2: approve catalog UX copy + new content for stamping approved.
- B3-S1 (non-blocking): measurement entities attribution_models / incrementality_tests.
- B3-S2 (non-blocking): bid_strategies as a separable config master.
