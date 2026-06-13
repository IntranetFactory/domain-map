# ACCT-PLAN audit history

## 2026-06-13 - Audit (state-driven, B9d verification pass)

### Summary

State-driven Validate pass (Rule #21) continuing from `state.yaml`, which carried `next_action_by: agent` solely because of the open B1A-B9D-VERIFY item (run the B9d handoff-payload-realization band, which had never run on this domain). Live re-verification (domain id 105): still 0 `domain_modules` (M1 hard fail), 0 masters, 0 skills, 7 `capability_domains`, 1 owner `business_function_domains` row (Sales), catalog UX + 4 aliases already in place from the 2026-06-07 pass. The domain remains master-bearing-but-UNBUILT; the entire build cascade stays surfaced (gated on user b2 decisions), never scaffolded.

The only genuinely agent-actionable item (B1A-B9D-VERIFY) was executed this pass. Everything else is either expansive net-new market structure gated behind the open b2 decisions (Rule #21 research carve-out: never written before the q-file is answered) or destructive and gated. After B9d there is no ACCT-PLAN-owned additive write left, so `next_action_by` flips agent -> user.

### Executed

| Item | Action | Result |
|---|---|---|
| B1A-B9D-VERIFY | Ran `scripts/analytics/b9d_resolver.ts ACCT-PLAN --dry-run`, classifying both boundary handoffs in BOTH directions. | Resolved; moved here. |

B9d classification (2 boundary tags, 2 distinct (process,owner) findings):

- **ORPHAN** - handoff 210 (ACCT-PLAN -> SALES-ENG, payload `customers`), process `6.2.2.5` / pid 929 "Identify and capture upsell/cross-sell opportunities". Owner = **CRM** (it masters `customers`; CRM is itself unbuilt). The resolver would write an additive `b2` (`B2-B9D-OWN-929`) + a q into **CRM's** audit files. Per this task's hard scope guardrail (edit only `audits/ACCT-PLAN/` + ACCT-PLAN-owned catalog content), I did NOT write into CRM's files. **Routed to CRM** (recorded here so it is not lost); CRM owns the realization, and CRM is already in `feedback_needed` with its own `q-CRM.md`. No ACCT-PLAN-owned action.
- **RE-TAG** - handoff 209 (ACCT-PLAN -> CSM, payload `customers`), existing tag process 148 "Manage customers and accounts" (L3). The resolver recommends re-pointing to the sharper L4 process 929 (same `customers` entity; the same code handoff 210 already carries). This supersedes the prior 2026-05-31 process-717 proposal. **Destructive** (overwrites a non-empty tag) and gated on B2-T1, so it stays surfaced as B1B-H1-209-REFINE (now updated to 148 -> 929); NOT executed.

No `record_status` touched (Rule #1). No live writes this pass.

### Surfaced / unchanged (await user)

All open `b2` decisions (B2-L1, B2-M1, B2-T1, B2-D1, B2-K1, B2-C1, B2-E1, B2-V1), the destructive B1B-H1-209-REFINE re-point, and the build cascade (B1A-BUILD / B1B-M1-MODULES / B1B-V1..V7 / B1B-S1) remain gated exactly as before. The existing `q-ACCT-PLAN.md` already projects all of these for the user and is current. `status` stays `feedback_needed`; `next_action_by` now `user`.

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass (SKILL.md Rule #21) over the open items in `audits/ACCT-PLAN/state.yaml`. No fresh from-scratch audit. Live verification (domain id 105, adenin tenant): 0 `domain_modules` (M1 hard fail), 7 `capability_domains`, 0 masters, both `catalog_tagline` and `catalog_description` empty, 0 `domain_aliases`, 1 `business_function_domains` owner row (Sales, id 21). Overlay test: ACCT-PLAN persists real records (account_plans, mutual_action_plans, relationship_maps, white_space_maps), so it is master-bearing, not overlay. It is UNBUILT, so per the UNBUILT clause the build cascade is surfaced, not scaffolded; only the two build-independent additive items were executed.

Notable live delta vs the snapshot: handoff 209 now already carries an `agent_curated` APQC tag (handoff_processes id 1073, process 148 "Manage customers and accounts", L3, record_status new), added since the last audit. The H1 gap on handoff 209 is therefore already closed (cross-domain handoff coverage is 2 of 2). The state's proposed sharper tag (process 717 "Manage sales/key account plan", L4) would REPLACE the existing non-empty tag, which is destructive and gated on B2-T1; it is reframed as a surfaced item (B1B-H1-209-REFINE), not executed.

### Executed (counts)

| Item | Action | Count |
|---|---|---|
| Catalog UX (Rule #20, was B1B-A1-PATCH) | PATCH `/domains?id=eq.105`: authored buyer-voice `catalog_tagline` + `catalog_description` into the two empty fields. No vendor names, no em-dash, American English. record_status stays 'new'. | 1 domain row (2 fields) |
| Aliases (B11 / B2-A1) | INSERT 4 generic synonyms into `domain_aliases` (KAM, key account management, strategic account management, account planning); `alias_type='synonym'`, record_status default 'new', `notes` not written (Rule #15). | 4 rows |

Loader: [.tmp_deploy/2026-06-07_acct_plan_state_driven_execute.ts](../../.tmp_deploy/2026-06-07_acct_plan_state_driven_execute.ts). Run from project root. Idempotent (re-reads live, skips done work). Both writes verified live after the run.

UI links:
- https://tests.semantius.app/domain_map/domains?id=eq.105
- https://tests.semantius.app/domain_map/domain_aliases?domain_id=eq.105

### Surfaced (no write; user decision / destructive)

- **B1A-BUILD (the build):** ACCT-PLAN is UNBUILT (0 modules, 0 masters). The full build (modules, masters B1B-V1..V7, roles, system skills) is gated on B2-L1 + B2-M1 + B2-K1 + B2-T1 and is the headline next step. Not scaffolded per the UNBUILT clause.
- **B2-L1** (leadership-tier classification: reclassify normal Phase-B / keep overlay / hybrid). Classification is effectively settled toward master-bearing (B1A-RECLASS); user confirms (a) vs (c).
- **B2-M1** (module shape: 6 / 4 / 3).
- **B2-T1** (trigger-event publisher attribution for events 169, 170: move to ACCT-PLAN masters / keep on CRM customers / derived-signal events).
- **B2-D1** (duplicate event 197 health_score.declined vs 169 account_health.declined: consolidate+DELETE / distinguish / accept). Option (a) is destructive and CRM-owned.
- **B2-K1** (key_accounts shape: separate master / enum on customers / junction).
- **B2-C1** (function-spine contributors: add Customer Success + Sales Operations / only CS / leave). b2 judgment; not auto-added.
- **B2-E1** (KAM roles: 4 / 2 / defer; gated on the build).
- **B2-V1** (Salesforce Industries Cloud positioning: add secondary solution / keep pure-play / industry-conditional). Market-shape write left to user.
- **B1B-H1-209-REFINE (destructive):** handoff 209 already tagged (id 1073, process 148, L3). Refining to process 717 (L4) means replacing a non-empty tag; gated on B2-T1. Recommended fix surfaced, not applied.

### Left (untouched)

- **b1b blocked on the build / user decisions:** B1B-M1-MODULES, B1B-S1-B10B-BACKFILL, B1B-V1..V7 (all gated on B1B-M1 + B2-M1, several also on B2-K1 / B2-T1).
- **b3 backlog (7):** ABM-Planning surface, sales-methodology overlays, digital sales rooms, tier-promotion lifecycle, team-assignment shape, QBR-ownership boundary, predictive whitespace.
- **Report-only owed by other domains** (unchanged): CRM B9 enum hygiene / attribution (events 169, 197), CRM B8 cross-domain data_object_relationships (after masters land), CSM B10 inbound DMDO (handoff 209), SALES-ENG B10 inbound DMDO (handoff 210), FARMER-DIRECT-SALES + FINOPS event-197 receipt.

### Post-fix status

`next_action_by: user` (the build is the gating next step; all remaining items are b2 judgment, destructive, blocked on the build, or b3 backlog). `last_audit: 2026-06-07`.

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 0 entities, 0 modules, 7 capabilities, 5 solutions (all primary), 0 regulations, 0 system skills, 0 roles, 1 business_function_domains row (Sales owner), 2 outbound handoffs (both `customers` payload, both with NULL module FKs and both citing CRM-owned trigger events), 0 inbound handoffs, 0 `domain_aliases`, 0 `domain_data_objects`, 0 `domain_module_data_objects`.
- Domain metadata: A1 passes (crud_percentage 80, business_logic populated, min_org_size `20 s <500`, cost_band `$$$`, usa_market_size_usd_m 400, source_year 2024, certification_required false). A4 FAILS: both `catalog_tagline` and `catalog_description` are empty strings.
- ACCT-PLAN is listed in SKILL.md B1's leadership-tier exception (REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN, ...) so zero masters is structurally tolerated. However, the flagship-vendor surface (Altify, Revegy, DemandFarm, Prolifiq, Demandbase Account Planning) shows that ACCT-PLAN is a real point-solution market with its own masters (account plans, mutual action plans, white-space maps, relationship maps, QBRs). The leadership-tier classification therefore looks misapplied; surfaced in Bucket 2 as B2-L1.
- Vendor-surface basis: 5 pure-play account-planning specialists (Upland Altify, Revegy, DemandFarm, Prolifiq CRUSH, Demandbase Account Planning). All 5 are already loaded as `coverage_level=primary` solutions. ABM-platform crossover (Demandbase, 6sense) and CRM-suite incumbents (Salesforce Sales Cloud Account Plans, Salesforce Strategic Account Plans by Industries Cloud) considered; the CRM-suite layer is not a separate solution per Rule #18.
- **Bucket 1 (in-scope, agent fixable):** 7 items.
- **Bucket 2 (surface-for-user, judgment):** 9 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.
- Candidates queued to `audits/_missing-domains.md`: 0 (no new candidate domains surfaced; the nearest adjacency, ABM, overlaps with MA / CRM rather than naming a fresh point-solution market; PRM and GTM-PLAN already exist).

Structural pass: A1 passes, A2 passes (7 capabilities), A3 passes (5 primary solutions), A4 FAILS (empty catalog UX fields). M-band FAILS catastrophically: zero modules. With no modules the entire B-band collapses (B1 exempt per the leadership-tier list, but B5 / B6 / B7 / B8 / B9b / B11 / B12 are all vacuous; B9 has 2 outbound rows but both fail B10b on `source_domain_module_id=NULL`; B10 has 0 inbound rows, expected for a publisher-shaped domain). C passes (Sales owner; CSM / Sales Operations contributors not loaded yet). E-band cannot apply (no modules, no 2-module floor). F-band cannot apply (no modules to anchor system skills against). H1 produces 2 cross-domain handoffs of which zero carry any tag, plus a structural attribution defect on both rows (the events live with CRM's `customers` master, not ACCT-PLAN's).

### Vendor surface basis

The Strategic Account Planning market is a recognized point-solution category, anchored by pure-plays that built dedicated account-planning surfaces on top of CRM-of-record substrates. Pure-play specialists chosen over diversified CRM suites: Upland Altify (mature enterprise pure-play, Cisco / IBM / Hitachi reference deployments, formerly TAS Group methodology), Revegy (relationship and white-space pure-play, Microsoft / Cisco / GE reference deployments), DemandFarm (org-chart and white-space pure-play, account-planning-as-collaboration), Prolifiq CRUSH (Salesforce-native account planning, lighter mid-market shape), Demandbase Account Planning (Demandbase Engagement Platform's planning module, ABM-anchored). All 5 are pure-plays on the Strategic Account Planning surface and already loaded as `coverage_level=primary`. Salesforce Sales Cloud Account Plans is the CRM-suite incumbent; it is captured implicitly through CRM (not as a separate ACCT-PLAN solution) since the Account Plans object in Sales Cloud is a thin record-keeping layer rather than a competing point-solution surface; the heavier industry-cloud-based Strategic Account Plans (Manufacturing Cloud, Consumer Goods Cloud) blur the boundary and are surfaced in Bucket 2 B2-V1.

The flagship vendors agree on the union surface: account_plans, mutual_action_plans (a.k.a. mutual close plans, joint success plans), white_space_maps (product-by-business-unit grid), relationship_maps (org charts with influence and sentiment), key_account_metrics (account health rollups), qbr_decks (quarterly business review templates and instances), and stakeholder_records (named decision-makers with role, influence, sentiment). Methodology overlays (TAS, Miller Heiman, Strategic Selling, GAP) are vendor-bundled but the underlying record types converge.

### Pass 1, Structural sweep

#### S1, Direct FKs to `domains` for ACCT-PLAN (id 105)

| Table | FK column | ACCT-PLAN rows | Expected non-zero? |
| --- | --- | --- | --- |
| `business_function_domains` | `domain_id` | 1 (owner Sales) | yes, pass |
| `capability_domains` | `domain_id` | 7 | yes, pass |
| `domain_data_objects` | `domain_id` | 0 | exempt (leadership-tier in B1), but see Bucket 2 B2-L1 |
| `domain_modules` | `domain_id` | 0 | yes, FAIL (Rule #14 M1) |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero, OK |
| `domain_regulations` | `domain_id` | 0 | optional; ACCT-PLAN inherits PII obligations via the `customers` substrate but has no regulation directly bearing on the planning surface |
| `handoffs.source_domain_id` | source | 2 | yes for a publisher domain, pass |
| `handoffs.target_domain_id` | target | 0 | acceptable for a publisher-shaped domain (planning surface informs others; inbound is sparse) |
| `skills` | `domain_id` | 0 | yes (Rule #17 F2), FAIL once modules exist; vacuous until then |
| `solution_domains` | `domain_id` | 5 | yes, pass |
| `domains.parent_domain_id` | self | NULL | routinely zero, OK |
| `domain_aliases` | `domain_id` | 0 | non-blocking; surfaced as B2-A1 (the market has alias-worthy synonyms: KAM, key account management, strategic account management, ABM-planning) |

Routing of S1 failures: M1 routes to B1-M1; A4 routes to B1-A1; B10b NULL on both outbound rows routes to B1-S1; aliases gap routes to Bucket 2.

#### S2, Per-module coverage

Vacuous (zero modules).

#### S3, Per-master indirect-table coverage

Vacuous (zero masters; B1 leadership-tier exemption).

#### A-band

- **A1, domains metadata.** Pass. All 7 business-meaningful columns populated; crud_percentage 80 reflects the form-and-workflow shape of the market (org charts, white-space grids, mutual action plans, QBR templates), with the remaining 20% being graph rollups (account hierarchies, influence chains) and matching algorithms (product-by-account whitespace scoring) that need procedural compute.
- **A2, capabilities linked.** Pass. 7 capabilities: `RELATIONSHIP-MAPPING`, `WHITESPACE-MAPPING`, `ACCOUNT-PLAN-AUTHORING`, `MUTUAL-ACTION-PLANS`, `QBR-AUTOMATION`, `KEY-ACCOUNT-METRICS`, `POLITICAL-MAP-VISUALIZATION`.
- **A3, solutions linked.** Pass. 5 solutions, all coverage_level set, all primary. Vendor names current and correct (Upland Altify, Revegy, DemandFarm, Prolifiq CRUSH, Demandbase Account Planning).
- **A4, catalog UX fields.** FAIL. Both `catalog_tagline` and `catalog_description` are empty strings. See Bucket 1 B1-A1 for drafts (Rule #20 buyer-voice; surfaced for user approval before any PATCH).
- **A5, vendor ownership refresh.** Skipped (opt-in, not requested).

#### M-band

- **M1, ≥1 `domain_modules` row.** FAIL. Zero rows. Leadership-tier domains still require ≥1 module per Rule #14 (the rule has no leadership-tier exemption; only B1 carries one). See Bucket 1 B1-M1.
- **M2, ≥3 capabilities implies ≥2 modules.** Implicitly FAIL (7 capabilities, 0 modules). Resolved by B1-M1.
- **M4, every capability has ≥1 realizing module.** FAIL by construction (no modules to realize anything). All 7 capabilities are orphans pending B1-M1.
- **M5, lifecycle states have `domain_module_id` when module-scoped.** Vacuous.
- **M6, every module realizes ≥1 capability.** Vacuous.
- **M7, single-master and within-domain coherence.** Vacuous internally. Catalog-wide single-master check on the proposed masters (Pass 2): `action_plans` (id 184) is mastered by EMP-EXP, so the ACCT-PLAN proposal `mutual_action_plans` MUST be prefix-disambiguated per Rule #9 (`mutual_action_plans` is the safe form, the EMP-EXP entity stays as the canonical bare-word; alternatively ACCT-PLAN could claim canonical bare-word on `action_plans` but EMP-EXP's prior load argues against that). No other proposed master collides with an existing row.

#### B-band

- **B1, ≥1 master.** Vacuous (leadership-tier exemption per SKILL.md). Whether the exemption should apply is itself a Bucket 2 question (B2-L1): the vendor surface argues ACCT-PLAN masters real entities and the leadership-tier classification is a relic of the early Phase A load that named the seven sales-leadership domains before their modularization had been thought through.
- **B2 through B7.** Vacuous (zero masters).
- **B8 outbound `data_object_relationships`.** Vacuous (zero ACCT-PLAN masters). Once Bucket 2 B2-L1 resolves in favor of loading masters (B1-V*), B8 becomes the outbound mirror surface for handoffs 209 and 210 plus any new cross-domain handoffs surfaced in the audit.
- **B9 outbound `trigger_events` and `handoffs`.** Two outbound handoffs exist (209 to CSM, 210 to SALES-ENG), both citing `customers` (id 97) as payload. ACCT-PLAN owns zero `trigger_events` rows. The two events cited are 169 (`account_health.declined`) and 170 (`whitespace.identified`); both fire on `customers`, a CRM-mastered data_object, so under the Phase D rule the events live with CRM by current attribution. Event 169 (`account_health.declined`) is also published by CRM (handoff 1216 fires CRM → FARMER-DIRECT-SALES on the same event_id), confirming the events sit on CRM's `customers` master. There is also event 197 (`health_score.declined`) on `customers`, a near-duplicate of 169; surfaced as B2-T1 alongside the analytics-side trigger event question. Net: B9 publishes 2 outbound handoffs whose events are not ACCT-PLAN-mastered — see B1-S2.
- **B9b intra-domain cross-module handoffs.** Vacuous (zero modules, no cross-module surface).
- **B10 inbound handoffs (report only).** 0 rows. Acceptable for a publisher-shaped domain: account-planning is the analytics / planning side that *informs* CSM, SALES-ENG, REV-INTEL, CRM, but is not itself the subscriber to most workflow events. Once ACCT-PLAN owns masters (B2-L1 / B1-V*), one expected inbound is `crm_opportunity.closed_won` → ACCT-PLAN to refresh the account plan; surfaced in Bucket 3 as a candidate cross-domain edge.
- **B10b per-module attribution on `handoffs`.** Outbound query returns 2 rows with `source_domain_module_id=NULL` because ACCT-PLAN has zero modules. Inbound query returns 0 rows. The fix is upstream (load modules first via B1-M1, then re-run the B10b backfill). See Bucket 1 B1-S1.
- **B11, aliases for non-self-explanatory masters.** Vacuous (no masters yet).
- **B12, lifecycle states.** Vacuous (no masters yet). Once `account_plans`, `mutual_action_plans`, `qbr_instances` ship as masters, each has a real workflow with `requires_permission=true` states (`approved`, `executed`, `closed`, `archived` for plans; `scheduled`, `held`, `actioned` for QBRs).

#### C-band

- **C1, ≥1 `business_function_domains` owner.** Pass. Owner = Sales (id 21). No contributors or consumers loaded. The flagship vendor base argues that Customer Success (id 23) is a routine contributor (CSMs author and run account plans for installed-base growth) and Sales Operations (id 52) is the operations layer; surfaced as Bucket 2 B2-C1.
- **C2, capability-level RACI overrides.** No override rows found. Acceptable when contributors are loaded at the domain level; if B2-C1 resolves toward adding Customer Success as a contributor, no per-capability override is needed for any of the 7 capabilities (they all sit with the Sales / CSM / SalesOps cluster).

#### D-band

- **D1, UI spot-check.** Deferred until after fix loads land.

#### E-band

Vacuous: no modules, no role-modules surface, no role authoring possible. Will become applicable once B1-M1 resolves and at least 2 modules ship. Likely role candidates once the role layer is authored: Strategic Account Manager (cross-functional, business_function_id NULL — touches Sales and CSM), Key Account Director (Sales), Customer Success Account Manager (Customer Success), Sales Operations Analyst (Sales Operations). No KAM-shaped role exists in the catalog today; tracked as Bucket 2 B2-E1.

#### F-band

Vacuous: no modules and zero system skills. Will become applicable once B1-M1 resolves; Rule #17 requires exactly one `skill_type='system'` skill per `domain_modules` row.

#### H-band, APQC coverage

2 cross-domain handoffs (2 outbound + 0 inbound). Zero `handoff_processes` rows exist for either of the 2 handoffs. Volume target per the H-band rule (0.5N to 0.8N agent_curated proposals where N=2) suggests 1 to 2 new agent_curated rows from this audit. Both handoffs have an attribution caveat: each cites a CRM-owned trigger_event, so per the asymmetry rule a strict reading puts the source-side substantive activity on CRM, not ACCT-PLAN. The H-band agent-curated proposal below treats ACCT-PLAN as the de-facto detection surface (the planning workflow is what flags `whitespace.identified`, the rollup workflow is what flags `account_health.declined`) and tags the activities accordingly; the trigger-event attribution defect itself routes to B2-T1.

| handoff_id | direction | source → target | trigger_event | payload | Existing tag |
|---|---|---|---|---|---|
| 209 | outbound | ACCT-PLAN → CSM | account_health.declined | customers | (none) |
| 210 | outbound | ACCT-PLAN → SALES-ENG | whitespace.identified | customers | (none) |

Bucket 1 B1-H1 proposes agent_curated tags for both.

### Pass 2, Market audit (semantic)

The Strategic Account Planning market has a stable union surface across Upland Altify, Revegy, DemandFarm, Prolifiq CRUSH, and Demandbase Account Planning. The market split into "what does an account team plan, run, review against a strategic account" with the following headline entity groups.

**Master records, account-plan side:**
- `account_plans` (the per-account planning surface, parent for white-space + relationship + objectives)
- `account_plan_objectives` (named annual / quarterly goals on a plan)
- `account_plan_strategies` (the named approaches to reach an objective; methodology-overlay carrier)
- `key_accounts` (the curated subset of `customers` flagged for strategic treatment, with tier, segment, and assigned team)

**Master records, mutual-action-plan side:**
- `mutual_action_plans` (a.k.a. mutual close plans, joint success plans, shared roadmaps; a buyer-shared plan attached to an opportunity or an installed-base expansion)
- `mutual_action_plan_milestones` (named milestones with owner role on either side)
- `mutual_action_plan_acknowledgements` (buyer-side e-signed acknowledgement of plan progress)

**Master records, relationship-map side:**
- `relationship_maps` (the per-account org chart with influence and sentiment)
- `stakeholder_records` (named decision-makers, roles, influence, sentiment, last-touched)
- `stakeholder_relationships` (the edges: reports_to, influenced_by, blocked_by, championed_by)
- `political_maps` (the influence overlay over the org chart, often a derived view)

**Master records, white-space side:**
- `white_space_maps` (the product-by-business-unit grid per account; cells = bought / not-bought)
- `white_space_opportunities` (named cross-sell / upsell targets surfaced from a white-space cell)
- `product_coverage_records` (per-product penetration into an account's business units)

**Master records, QBR side:**
- `qbr_decks` (template + instance for quarterly business reviews)
- `qbr_meetings` (the scheduled / held QBR session, with attendees and outcomes)
- `qbr_action_items` (commitments captured during a QBR)

**Master records, key-account-metric side:**
- `account_health_scores` (composite health rollup per account, with feature contributions; analytics-side master)
- `account_growth_metrics` (per-period growth measures: ARR delta, product adoption, NPS)
- `account_engagement_metrics` (per-period engagement: meetings, exec-touches, support interactions)
- `key_account_segments` (named segments and tiers used to classify accounts strategically)

**Junctions, transitions, audit:**
- `account_plan_audit_trails` (every edit to a plan, version-controlled, who-what-when)
- `qbr_audit_trails` (commitments tracked across QBRs)
- `mutual_action_plan_audit_trails`
- `key_account_team_assignments` (per-account role-scoped staffing: account director, CSM, sales engineer, executive sponsor)

**Compliance / regulation:**
- The Strategic Account Planning market does not carry a market-specific regulation. PII obligations apply via the `customers` substrate (CRM's master, governed by GDPR / CCPA in CRM's regulation scope). Buyer-shared mutual action plans surface a marginal data-processing-agreement question that is handled at the CLM level when the plan is contractualized.

**Configuration / templates:**
- `account_plan_templates` (per-segment / per-tier planning shells)
- `qbr_templates`
- `mutual_action_plan_templates`
- `white_space_grids` (the per-segment list of product / BU axes used in white-space maps)
- `account_scoring_models` (ML / rule configurations for `account_health_scores`)

**Modularization hypothesis (proposed module set):**

| Module code | Scope | Capabilities |
|---|---|---|
| `ACCT-PLAN-CORE` | `account_plans` + `account_plan_objectives` + `account_plan_strategies` + `account_plan_templates` + `key_accounts` + `key_account_segments`. The planning surface plus the curated subset of accounts the plans are written against. | `ACCOUNT-PLAN-AUTHORING` |
| `ACCT-PLAN-MUTUAL-ACTION` | `mutual_action_plans` + `mutual_action_plan_milestones` + `mutual_action_plan_acknowledgements` + `mutual_action_plan_templates`. The buyer-shared plan surface, distinct because it has a separate workflow (buyer e-sign, shared milestone owner roles). | `MUTUAL-ACTION-PLANS` |
| `ACCT-PLAN-RELATIONSHIP` | `relationship_maps` + `stakeholder_records` + `stakeholder_relationships` + `political_maps`. The org-chart and influence surface; Revegy / DemandFarm anchor here. | `RELATIONSHIP-MAPPING`, `POLITICAL-MAP-VISUALIZATION` |
| `ACCT-PLAN-WHITESPACE` | `white_space_maps` + `white_space_opportunities` + `product_coverage_records` + `white_space_grids`. The cross-sell / upsell substrate; this is where ACCT-PLAN's outbound `whitespace.identified` event fires from. | `WHITESPACE-MAPPING` |
| `ACCT-PLAN-QBR` | `qbr_decks` + `qbr_meetings` + `qbr_action_items` + `qbr_audit_trails` + `qbr_templates`. The quarterly review surface, distinct workflow with its own meeting cadence and action-item carryover. | `QBR-AUTOMATION` |
| `ACCT-PLAN-METRICS` | `account_health_scores` + `account_growth_metrics` + `account_engagement_metrics` + `account_scoring_models`. The analytics-side master surface that fires `account_health.declined` once authored. | `KEY-ACCOUNT-METRICS` |

6 modules cleanly map onto the 7 capabilities (RELATIONSHIP-MAPPING and POLITICAL-MAP-VISUALIZATION pair under one module because both work over the same stakeholder substrate). The market split is reasonably canonical: Altify and Revegy lead on the relationship / political map; DemandFarm leads on white-space; Prolifiq and Demandbase position around the unified planning surface. Bucket 2 B2-M1 surfaces a leaner 4-module alternative.

**Findings categories:**

- **MISSING entities:** ALL surface entities listed above. Since ACCT-PLAN has zero masters and zero modules, every entity in the market surface is missing. This is the dominant finding type. Loading them is gated on Bucket 2 B2-L1 (the leadership-tier classification question) and Bucket 1 B1-M1 (load the modules first).
- **WRONG-OWNERSHIP:** None within ACCT-PLAN (no current masters to mis-place). One cross-domain question: `customers` (id 97) is mastered by CRM, and ACCT-PLAN should `consumer` or `embedded_master` it once modules ship; the substrate question (whether ACCT-PLAN treats `key_accounts` as a separate master or as a flag on `customers`) is in Bucket 2 B2-K1.
- **SCOPE-CREEP:** N/A (no entities currently owned by ACCT-PLAN; nothing to scope-creep).
- **MODULARIZATION ISSUE:** the existing capability set (7 capabilities) is sound, but no modules exist to realize them. The hypothesis above proposes 6 modules. Goes to Bucket 2 B2-M1.

### Pass 3, Neighbor discovery

Cross-edges with other domains, ranked by edge weight (handoff count + DMDO dependency count). No DMDO surface exists yet (zero modules), so this reduces to handoff count for now:

| Neighbor | Outbound handoffs | Inbound handoffs | DMDO deps | Edge weight | Notes |
|---|---|---|---|---|---|
| CSM | 1 (209) | 0 | n/a (no DMDO surface yet) | 1 | `account_health.declined` is the planning-side flag that hands off to CSM for retention engagement. |
| SALES-ENG | 1 (210) | 0 | n/a | 1 | `whitespace.identified` hands off to SALES-ENG for outbound prospecting against the opportunity. |
| CRM | 0 | 0 | n/a (no DMDO; will be heavy once `customers` consumer DMDO ships) | 0 | The substrate neighbor. Every proposed ACCT-PLAN master references `customers` directly or transitively. Once modules ship, CRM is the heaviest pairwise neighbor by DMDO weight, not by handoff weight. |
| SALES-PERF | 0 | 0 | n/a | 0 | Conceptual: account-tier changes feed quota allocation. Not loaded; surfaced as Bucket 3 candidate cross-domain edge. |
| REV-INTEL | 0 | 0 | n/a | 0 | Conceptual: account health is the planning-side analytic that aligns with REV-INTEL's deal-side analytic, distinct buyer surface (account team vs. rep). |
| CLM | 0 | 0 | n/a | 0 | Conceptual: `mutual_action_plans` cross to CLM when contractualized; not modeled today. |
| ABM (no domain) | 0 | 0 | n/a | 0 | Demandbase Account Planning has heavy ABM integration; no ABM domain in the catalog (closest is MA + CDP + segments). Bucket 3 candidate cross-domain edge. |
| GTM-PLAN | 0 | 0 | n/a | 0 | Conceptual: ICP and segmentation from GTM-PLAN feed `key_account_segments`. Not loaded. |

Default deep-dive threshold (edge weight ≥ 3) is not met for any neighbor. Per the prompt, lighter neighbors (weight 1-2) get a one-line summary instead of the full 5-section diff. Pairwise diffs are also gated on B1-M1 resolving (both module FKs on every handoff are NULL today).

### Pass 4, Pairwise reconciliation per neighbor

**CSM (edge weight 1):** One-line summary. Handoff 209 (`account_health.declined`) leaves ACCT-PLAN's `source_domain_module_id` NULL and the CSM side's `target_domain_module_id` NULL (the CSM modules exist; the target attribution is the next pairwise question). The substantive PCF activity on the source side is "Manage customer relationships" (PCF id 718) since account-health detection IS the relationship-management activity surfacing a need. The trigger event is CRM-attributed (event 169 lives on `customers`, a CRM master), so the canonical publisher is CRM and ACCT-PLAN is forwarding a derived signal; surfaced in B2-T1. Section-by-section work blocked until B1-M1 and the B2-T1 attribution decision.

**SALES-ENG (edge weight 1):** One-line summary. Handoff 210 (`whitespace.identified`) leaves both module FKs NULL. Once B1-M1 lands and ACCT-PLAN ships `ACCT-PLAN-WHITESPACE`, the source FK attributes to that module; SALES-ENG's `SALES-ENG-OUTBOUND-CADENCE` (or its actual module name; resolve at backfill time) is the target. Again the trigger event lives on CRM's `customers` master per Phase D, so the publisher-vs-detector tension repeats; B2-T1 covers the broader question.

**CRM (edge weight 0 today, will be heavy once modules ship):** Pairwise blocked. CRM is the substrate-mastering neighbor: every ACCT-PLAN master will reference `customers` (CRM-mastered, id 97), and several will reference `crm_opportunities` (id 100, CRM-mastered) and `crm_contacts` (id 98, CRM-mastered). Once B1-M1 lands and ACCT-PLAN ships 6 modules, each module's `domain_module_data_objects` will carry `consumer + required` (or `embedded_master + optional` for a deployment-detached starter) rows on `customers`. The pairwise diff will then surface: which CRM-published events ACCT-PLAN should subscribe to (`crm_opportunity.closed_won`, `account.tier_changed`, `customer.signed_up`), and which ACCT-PLAN-published events CRM should subscribe to in the reverse direction (planning-surface promotions to `key_accounts`, strategic-tier flags).

**No other neighbors at edge weight ≥ 1.** SALES-PERF, REV-INTEL, CLM, GTM-PLAN, MA / CDP (ABM substitute), KAM (no domain in catalog) are all expected future neighbors once the master surface ships; surfaced as Bucket 3 cross-domain edge candidates.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (A4, M1, M2, M4, B10b)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-A1 | A4 | Empty `catalog_tagline` and `catalog_description`. Per Rule #20 the audit may draft both, surface to the user for review BEFORE writing. | Drafts authored below; user approves wording, then PATCH. |
| B1-M1 | M1 / M2 / M4 | Zero `domain_modules` rows on a domain with 7 capabilities. Blocks the entire B / E / F surface and the per-module attribution on the two existing outbound handoffs (B1-S1). The market hypothesis in Pass 2 proposes 6 modules. | Author 6 `domain_modules` rows with the codes proposed in Pass 2's modularization table. Each `module_kind='full'`. Bundle with the corresponding `domain_module_capabilities` rows so every capability has ≥1 realizing module. Gated on Bucket 2 B2-L1 (the leadership-tier classification) and B2-M1 (the 6-module vs. 4-module choice). |
| B1-S1 | B10b | 2 outbound handoffs (209, 210) have `source_domain_module_id=NULL` because ACCT-PLAN has zero modules. Inbound query returns 0 rows so no `target_domain_module_id=NULL` rows surface here; if the source-side attribution resolves with the trigger-event question (B2-T1) such that ACCT-PLAN keeps the publisher role, the attribution backfills to `ACCT-PLAN-METRICS` (handoff 209) and `ACCT-PLAN-WHITESPACE` (handoff 210). If B2-T1 reassigns the publisher to CRM, the rows route differently. | Re-run B10b backfill against new modules once B1-M1 is applied and B2-T1 has resolved. |

Drafts for B1-A1 (per Rule #20 buyer-voice rule):

- `catalog_tagline` draft: "Plan, run, and review your strategic accounts the way the best account teams do. Map relationships, find white space, write joint plans, and close on QBR commitments, all in one place."
- `catalog_description` draft (3 short paragraphs):
  - "Strategic Account Planning gives account teams a structured surface to plan against named key accounts: who decides, who buys today, and where the next opportunity sits. Relationship maps make the org chart and the political reality visible. White-space maps show every product the account hasn't bought yet, on a per-business-unit grid. Account plans hold the named objectives and strategies the team will pursue this year."
  - "Mutual action plans extend the planning surface to the buyer: the named milestones both sides commit to, owned roles on either side, and signed acknowledgements as the plan progresses. QBR templates and meeting workflows close the loop on every quarterly review: actions logged, commitments tracked, and last quarter's promises checked against this quarter's progress."
  - "Built for strategic account managers, customer success directors, and sales operations, sitting on top of your CRM and CSM systems rather than replacing them. Account health and growth metrics roll up across the portfolio; key-account-team assignments make staffing legible. Whitespace identified by the planning workflow flows to sales engagement; account-health decline flows to customer success."

#### MISSING (vendor-surface entities, all gated on B1-M1 and B2-L1)

These are placeholder entries: every entity in Pass 2's market surface is missing because zero masters exist. Loading them requires both B1-M1 (modules) and B2-L1 (leadership-tier reclassification decision) to land first. The audit lists the top 7 most-impactful candidates here so the user has a per-entity decision surface; the full set goes to Bucket 3 pending Phase 0 vetting.

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-V1 | `account_plans` | ACCT-PLAN-CORE | 5 of 5 vendors (the headline master) |
| B1-V2 | `mutual_action_plans` | ACCT-PLAN-MUTUAL-ACTION | 5 of 5 (a.k.a. joint success plans, mutual close plans). Name-collision with EMP-EXP's `action_plans` (id 184); prefix per Rule #9. |
| B1-V3 | `relationship_maps` | ACCT-PLAN-RELATIONSHIP | 5 of 5 (Altify, Revegy, DemandFarm anchor the org-chart + influence surface) |
| B1-V4 | `white_space_maps` | ACCT-PLAN-WHITESPACE | 5 of 5 (DemandFarm headlines the product-by-BU grid; all others ship it) |
| B1-V5 | `key_accounts` | ACCT-PLAN-CORE | 5 of 5 (the curated subset of `customers` flagged for strategic treatment) |
| B1-V6 | `qbr_meetings` | ACCT-PLAN-QBR | 5 of 5 (the per-quarter review surface with attendees and outcomes) |
| B1-V7 | `account_health_scores` | ACCT-PLAN-METRICS | 5 of 5 (composite rollup; the master the outbound `account_health.declined` event should fire from) |

#### APQC TAGGING

2 cross-domain handoffs. Per H1, the audit ships agent_curated proposals for both. The B2-T1 attribution caveat (trigger events live on a CRM master) is recorded in Bucket 2 but does not block tagging the ACCT-PLAN handoffs against the planning-side activities.

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|
| 209 | ACCT-PLAN → CSM | account_health.declined | customers | Manage sales/key account plan (account-health rollup is a key-account-plan management activity surfacing a need for CSM action) | 717 | confident L4 |
| 210 | ACCT-PLAN → SALES-ENG | whitespace.identified | customers | Identify and capture upsell/cross-sell opportunities (white-space identification IS upsell/cross-sell opportunity identification) | 929 | confident L4 |

Deferred to Discover: 0.

| ID | Action | Note |
|---|---|---|
| B1-H1 | INSERT 2 `handoff_processes` rows for handoffs 209, 210 mapping to PCF rows 717 and 929. Each carries `proposal_source='agent_curated'`, `record_status='new'`. | Coverage rises from 0 of 2 to 2 of 2. |

#### BOUNDARY findings per neighbor

Skipped (no neighbor at edge weight ≥ 3; the two weight-1 neighbors are summarized in Pass 4 above). Will become applicable once B1-M1 + B1-V* land and CRM becomes the heavy DMDO-side neighbor.

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-L1, Leadership-tier classification.** ACCT-PLAN is currently listed in SKILL.md B1's leadership-tier exception (with REV-INTEL, SALES-PERF, GTM-PLAN, PRM, OP-RES, BCM, SECOPS, SOAR, THREAT-INTEL, TPRM, VULN-MGMT, PRIV-MGMT, FINOPS, INTRANET, COLLAB-GOV). The leadership-tier label implies "zero masters expected; the domain is a derived-signals / overlay surface that reads from other domains and computes." But the flagship-vendor surface (Altify, Revegy, DemandFarm, Prolifiq, Demandbase Account Planning) shows ACCT-PLAN masters real entities: `account_plans`, `mutual_action_plans`, `relationship_maps`, `white_space_maps`, `qbr_decks`, `key_account_metrics`. These are not derived from `customers` or `crm_opportunities`; they are independently authored records that reference the substrate. Options: (a) reclassify ACCT-PLAN as a normal Phase-B domain (remove from the leadership-tier list in SKILL.md B1 and load the full master surface in B1-V1 through B1-V*), (b) keep the leadership-tier classification and treat ACCT-PLAN as a pure-overlay domain (in which case the proposed B1-V* masters move to a queued ABM-Planning or KAM domain candidate, and the existing solutions are repositioned as solutions over the overlay rather than masters), (c) split: keep `account_health_scores` and `account_growth_metrics` as derived-signals (consistent with leadership-tier) and load `account_plans`, `mutual_action_plans`, `relationship_maps`, `white_space_maps`, `qbr_decks` as normal masters (the hybrid). Independent of Bucket 3; dependency on B2-M1 (if (a) chosen).

2. **B2-M1, Modularization hypothesis.** Pass 2 proposes 6 modules. The split is plausible but other shapes exist: (a) the proposed 6-module shape, granular per capability cluster, (b) a 4-module shape: `ACCT-PLAN-CORE` (plans + objectives + strategies + key_accounts + segments) / `ACCT-PLAN-RELATIONSHIP-WHITESPACE` (relationship_maps + stakeholder_records + white_space_maps + white_space_opportunities, all the visualization surfaces) / `ACCT-PLAN-EXECUTION` (mutual_action_plans + qbr_meetings + qbr_action_items, the buyer-shared and review surfaces) / `ACCT-PLAN-METRICS` (account_health_scores + growth + engagement, the analytics surface), (c) a 3-module shape: `ACCT-PLAN-CORE` / `ACCT-PLAN-EXECUTION` / `ACCT-PLAN-METRICS`, collapsing relationship + white-space into core (more pragmatic for smaller deployers). Decide before loading masters. Affects every B1-V* entity placement. Independent of Bucket 3; dependency on B2-L1.

3. **B2-T1, Trigger-event publisher attribution.** Both ACCT-PLAN outbound handoffs (209, 210) cite trigger events that live on `customers` (a CRM-mastered data_object) per Phase D. Event 169 (`account_health.declined`) is published by ACCT-PLAN to CSM (handoff 209) AND by CRM to FARMER-DIRECT-SALES (handoff 1216): same event, two publishers, which is structurally inconsistent (one trigger_event = one publishing master). There is also a near-duplicate event 197 (`health_score.declined`) firing CRM → FARMER-DIRECT-SALES on `customers` (handoff 1217). Options: (a) move event 169 to be ACCT-PLAN-mastered (anchored to a new `account_health_scores` master once B1-V7 ships), then re-attribute CRM's handoff 1216 to subscribe to ACCT-PLAN's publication; same treatment for event 170 (`whitespace.identified`) anchored to `white_space_maps` after B1-V4; (b) keep the events anchored to `customers` (CRM-published) and treat ACCT-PLAN's handoffs 209, 210 as mis-attributed (the substantive publisher is CRM and ACCT-PLAN should be the consumer, not the source); (c) introduce derived-signal trigger events that carry their own publisher independent of the underlying master (catalog-level shape change, larger scope). Option (a) is cleanest once B1-V* lands; option (b) is simplest pre-load. Dependency on B1-V7 if (a); decision needed before B1-H1 PCF tags are committed because handoff 209's tag inherits the answer.

4. **B2-D1, Duplicate trigger event `health_score.declined` (197) vs. `account_health.declined` (169).** Both live on `customers`, both describe an account/customer-health decline. Event 169 is used by handoffs 209 (ACCT-PLAN → CSM) and 1216 (CRM → FARMER-DIRECT-SALES); event 197 is used by handoff 1217 (CRM → FARMER-DIRECT-SALES). Options: (a) consolidate on event 169 and DELETE event 197 + re-point handoff 1217 to 169 (cleanest if both names describe the same signal), (b) keep both because `health_score.declined` is the analytics-side signal (CRM's score going down) and `account_health.declined` is the planning-side detection (ACCT-PLAN flagging an action need; subset semantics), (c) keep both as a known catalog redundancy. Independent of B2-T1 but together they expose the same root cause (CRM substrate-vs-ACCT-PLAN-overlay attribution question). Cross-catalog: surfaces in the next CRM or FARMER-DIRECT-SALES audit.

5. **B2-K1, `key_accounts` vs. flag on `customers`.** Strategic Account Planning treats key accounts as a curated subset of customers with extra structure (tier, segment, assigned team). Two shapes: (a) `key_accounts` as a separate master in `ACCT-PLAN-CORE` referencing `customers` (the proposal in Pass 2), (b) `customers` gains a `key_account_tier` enum field and an `assigned_account_team` JSON column (no new master, CRM extension), (c) a new junction `key_account_designations` on (`customers`, `key_account_segments`) without elevating to a full master. The flagship vendors split on this: Altify and Revegy treat key accounts as a separate first-class record; DemandFarm and Demandbase keep them as an enriched customer attribute. Option (a) is cleanest for the cross-domain edge (CSM and SALES-PERF want to filter by `key_account_tier` and the structured master makes that legible); (b) is the lower-touch shape that piggybacks on CRM. Independent of Bucket 3.

6. **B2-C1, Function-spine: contributors and consumers.** Only Sales is loaded as owner. The vendor base argues that Customer Success (id 23) and Sales Operations (id 52) are routine contributors. The buyer / persona footprint at flagship deployments is Sales (account director, KAM, strategic account manager), Customer Success (CSM owning installed-base growth on the same account), and Sales Operations (rolling up account plans into pipeline forecasts and quota assignments). Options: (a) add Customer Success and Sales Operations as `contributor` rows, (b) add only Customer Success (KAM-CSM is the most reliable cross-functional pattern), (c) leave as-is and revisit when E-band gets authored. Independent of Bucket 3.

7. **B2-E1, KAM-shaped role authoring.** No KAM-shaped role exists in the catalog today. Once B1-M1 lands and modules are authored, role candidates: Strategic Account Manager (cross-functional, business_function_id NULL — touches Sales and CSM modules), Key Account Director (Sales), Customer Success Account Manager (CSM modules touched via cross-module role), Sales Operations Analyst (Sales Operations, touches ACCT-PLAN-METRICS plus SALES-PERF). Options: (a) author the 4 roles above with the 2-module floor satisfied (Strategic Account Manager touches ACCT-PLAN-CORE + ACCT-PLAN-RELATIONSHIP + ACCT-PLAN-WHITESPACE + ACCT-PLAN-MUTUAL-ACTION + ACCT-PLAN-QBR, qualifies as multi-module), (b) author only Strategic Account Manager + Customer Success Account Manager (the two highest-traffic roles), (c) defer until E-band gets a dedicated authoring pass. Dependency on B1-M1.

8. **B2-A1, Domain aliases.** No `domain_aliases` rows exist. The market has well-known synonyms: KAM (key account management), key account management, strategic account management, ABM-planning (Demandbase / 6sense framing). Options: (a) author 4 alias rows (KAM, key account management, strategic account management, account planning), (b) author the 2 most important (KAM, key account management), (c) defer until a separate aliases pass. The aliases feed both the catalog search index and the per-domain skill trigger phrases per Rule #20. Independent of Bucket 3.

9. **B2-V1, Salesforce Industries Cloud Strategic Account Plans positioning.** Industries Cloud (Manufacturing Cloud, Consumer Goods Cloud, Financial Services Cloud) ships an industry-flavored Strategic Account Plans surface that overlaps both CRM (Sales Cloud) and the pure-play ACCT-PLAN solutions. Options: (a) add Salesforce Sales Cloud or Industries Cloud as a `coverage_level=secondary` ACCT-PLAN solution (acknowledges the suite-incumbent and the industry-flavored shape), (b) keep the 5-solution pure-play list and treat the CRM-suite competition as a per-industry concern handled in industry-domain audits, (c) split: add a single Salesforce solution row at `coverage_level=secondary` only if a pure-play solution map shows missing coverage on industry-flavored deployments. Independent of Bucket 3.

### Bucket 3, Phase 0 pending (speculative)

Speculative gaps the market-audit pass surfaced from vendor knowledge but which weren't anchored to a formal Phase 0 vendor-surface document. These are candidate gaps, not vetted gaps; Phase 0 vendor research would confirm or filter.

| # | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| 1 | ABM-Planning surface as a separate domain or as part of ACCT-PLAN. Demandbase Account Planning blurs the boundary between ABM (which targets net-new accounts via marketing channels) and strategic account planning (which deepens engagement with named existing accounts). | Demandbase, 6sense, Madison Logic, Terminus all ship ABM platforms with planning surfaces; some specifically call them "account planning". The question is whether ABM planning is a sub-surface of ACCT-PLAN, a sub-surface of MA, or its own domain candidate. | Phase 0 on Demandbase + 6sense + Terminus product docs. May queue ABM-PLAT to `audits/_missing-domains.md` if the surface diverges enough from both MA and ACCT-PLAN. |
| 2 | Methodology overlays (TAS, Miller Heiman, Strategic Selling, GAP) as catalog primitives. Altify, Revegy, Prolifiq, and Salesforce Sales Methodology all ship methodology overlays as a configurable layer on top of account plans. | Altify TAS, Revegy Miller Heiman, Prolifiq Strategic Selling, Salesforce Sales Methodology, and Korn Ferry GAP all overlay the same underlying record types. The question is whether `sales_methodologies` is a configuration master (a row per methodology, referenced by `account_plan_strategies`) or whether the methodology is a vendor-internal concern not modeled in the catalog. | Phase 0 on Altify TAS + Revegy Miller Heiman + Prolifiq Strategic Selling docs. Decide whether methodology becomes a catalog master or stays vendor-internal. |
| 3 | Buyer enablement / digital sales room overlap with `mutual_action_plans`. Vendors like GetAccept, Recapped, Aligned, and Trumpet ship "digital sales rooms" that wrap a mutual-close plan with an interactive buyer-shared workspace. The boundary between MAP and DSR is fuzzy. | GetAccept, Recapped, Aligned, Trumpet are pure-play DSR vendors. The shape: shared workspace + chat + e-sign + content sharing + mutual-close milestone tracking. The question is whether DSR is its own domain candidate or whether the DSR functionality folds into `mutual_action_plans` as enrichment. | Phase 0 on GetAccept + Recapped + Aligned + Trumpet docs. May queue DIGITAL-SALES-ROOM to `audits/_missing-domains.md`. |
| 4 | Account-tier promotion / demotion lifecycle as a workflow gate vs. configuration. When `customers` gets promoted to `key_accounts` (tier change), some vendors require an approval workflow (the strategic-tier promotion has revenue implications, comp implications, and customer-success implications). | Altify and Revegy ship explicit promotion workflows; DemandFarm treats tier as a manual setting. The question is whether the promotion is a lifecycle state on `key_accounts` (with `requires_permission=true`) or a configuration edit (no workflow). | Phase 0 on Altify + Revegy tier-promotion docs. Decide before B1-V5 lifecycle is authored. |
| 5 | Account-team assignments as a separate master vs. per-role columns on `key_accounts`. Some vendors carry `key_account_team_assignments` as a junction with role types (account director, CSM, sales engineer, executive sponsor); others embed them as named columns. The shape affects whether role-based RBAC over the planning surface uses the team junction or generic permissions. | Altify and Revegy carry the junction; Prolifiq embeds as columns. The buyer use-case ("who can edit this account's plan?") favors the junction shape because it lets RBAC read team-level membership rather than account-level role columns. | Phase 0 on Altify + Revegy team-assignment docs. Decide the master vs. column shape before B1 role authoring (B2-E1). |
| 6 | QBR as ACCT-PLAN-mastered vs. shared with CSM. Quarterly business reviews are run by either account teams (ACCT-PLAN ownership) or customer success teams (CSM ownership) depending on the org. Some vendors (Gainsight, Totango, ChurnZero) ship QBR surfaces inside CSM platforms. | Gainsight EBR / QBR Composer, Totango QBR module, ChurnZero QBR templates all live in CSM platforms. Altify, Revegy, DemandFarm all ship QBR surfaces in account planning. The cross-domain question is who masters `qbr_meetings`. | Phase 0 on Gainsight EBR + Totango QBR + Altify QBR docs. May reshape the proposed `ACCT-PLAN-QBR` module into a shared master with CSM as `embedded_master`. |
| 7 | Predictive whitespace scoring vs. configuration-driven whitespace. Some vendors (DemandFarm, Demandbase) ship ML models that predict the next-best whitespace opportunity per account; others (Altify, Revegy) treat whitespace as a manually-filled grid. The shape affects whether `white_space_opportunities` is a model output or a hand-authored entity. | DemandFarm AI, Demandbase Intent + Engagement Score, Altify static grid, Revegy static grid. The 5-vendor surface splits 2:3 on predictive vs. manual. | Phase 0 on DemandFarm AI + Demandbase Intent docs. Decide whether `account_scoring_models` covers whitespace prediction too, or whether a separate `whitespace_scoring_models` master is warranted. |

### Cross-bucket dependencies

- B1-A1 (catalog UX drafts) is independent of all other items; can land first.
- B1-M1 (modules) is gated on B2-L1 (the leadership-tier reclassification decision: if (b) holds, no modules are authored and B1-V* drops). Once B2-L1 resolves in favor of (a) or (c), B1-M1 ships, which in turn gates B1-S1 (B10b re-backfill), B1-V1 through B1-V7 (master loads), all Pass 4 pairwise work, and the F-band's positive-existence checks.
- B1-H1 (2 APQC tags) depends on B2-T1 for handoff 209's tag attribution; handoff 210's tag is independent. If B2-T1 resolves toward attribution to CRM (option b), handoff 209's tag belongs on the CRM side and the agent_curated row should not be authored on the ACCT-PLAN side.
- B2-L1 → B2-M1: only run B2-M1 if B2-L1 resolves toward (a) or (c). If (b) (keep leadership-tier, no masters), B2-M1 is vacuous.
- B2-M1 (modularization shape decision) informs B1-V1 through B1-V7 (which module each master lands in). The 6-module / 4-module / 3-module choice rewrites the proposed_module column on every B1-V* row.
- B2-T1 (trigger-event attribution) and B2-D1 (event 197 duplicate) interact: resolving B2-D1 by consolidating on event 169 also constrains B2-T1 because handoff 1216's CRM publisher gets re-attributed in the same operation.
- B2-K1 (key_accounts shape) affects B1-V5: if (b) (no separate master, just an enum on `customers`), B1-V5 drops from Bucket 1 and the catalog gains a CRM extension PATCH instead.
- B2-C1 (function-spine contributors) is independent; can be applied any time.
- B2-E1 (KAM roles) is gated on B1-M1 and on B2-M1 (role-modules can only attribute to the modules that ultimately ship).
- B2-A1 (domain aliases) is independent.
- B2-V1 (Salesforce Industries Cloud) is independent.
- Bucket 3 candidates #1 (ABM-PLAN), #3 (DSR), #6 (QBR ownership) inform B2-M1 and B2-L1 if the user runs vetted Phase 0 research. Bucket 3 #2 (methodology), #4 (tier promotion lifecycle), #5 (team assignments), #7 (predictive whitespace) inform downstream loading decisions but not the structural shape of the audit.

### Per-bucket prompts

**After Bucket 1 (7 items: B1-A1, B1-M1, B1-S1, B1-V1 through B1-V7 listed as one logical decision counted as 1 line-item placeholder block here counted as 4 entries already enumerated, plus B1-H1; total 7 distinct fix surfaces — 1 catalog-UX draft, 1 modules-load, 1 backfill, 4 master-load surfaces gated on B1-M1, 1 APQC tag set):**

> Bucket 1 has 2 unblocked fix surfaces (B1-A1 catalog UX drafts, B1-H1 2 APQC tags) and 1 blocking fix surface (B1-M1 6 modules) that gates B1-S1 (B10b re-backfill) and B1-V1 through B1-V7 (top 7 missing masters). B1-M1 is itself gated on B2-L1 (the leadership-tier reclassification). Fix these now? Reply 'all' (which means resolve B2-L1 first then proceed), 'just A1 + H1' (unblocked subset), 'just A1', 'just M1 with the 6-module shape' (implies B2-L1 = option (a) or (c)), or 'skip'.

**After Bucket 2 (9 items):**

> Bucket 2 has 9 judgment calls: B2-L1 (leadership-tier classification: reclassify, keep, or split), B2-M1 (module shape: 6 / 4 / 3), B2-T1 (trigger-event publisher attribution: move to ACCT-PLAN, keep on CRM, derived-signal events), B2-D1 (event 197 duplicate: consolidate, distinguish, keep), B2-K1 (key_accounts: separate master / enum on customers / junction), B2-C1 (contributors: add CS + SalesOps / add CS only / leave), B2-E1 (KAM roles: 4 roles / 2 roles / defer), B2-A1 (domain aliases: 4 / 2 / defer), B2-V1 (Salesforce Industries Cloud: add secondary / keep pure-play / industry-conditional). What is your call on each? I will wait for your decision per item before acting. For B2-L1 and B2-M1, consider running Bucket 3 candidates #1, #3, #6 first if you want a vendor-grounded answer; for B2-T1 and B2-D1, those are catalog-internal decisions and Bucket 3 does not inform them.

**After Bucket 3 (7 items):**

> Bucket 3 has 7 speculative candidates surfaced from vendor knowledge but not anchored to formal Phase 0 research: ABM-Planning surface, methodology overlays, digital sales rooms (DSR), tier-promotion lifecycle, team-assignment shape, QBR ownership, predictive whitespace. Vet via Phase 0 research (subagent over Altify + Revegy + DemandFarm + Demandbase + DSR vendors + Gainsight + Totango docs), or eyeball-mode? If eyeball, name which candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These are observations the audit identified but another domain owns the fix. They are NEVER blockers for this domain's pass; the user can choose to schedule audits on the owing domains.

- **CRM B9 / catalog enum hygiene:** event 197 (`health_score.declined`) on `customers` is a near-duplicate of event 169 (`account_health.declined`). Surfaces on the next CRM audit (or on whichever audit chooses to clean catalog-wide trigger event duplicates). Reference B2-D1 of this audit.
- **CRM B9 attribution:** event 169 (`account_health.declined`) is published from both ACCT-PLAN (handoff 209) and CRM (handoff 1216), which violates the one-event-one-publisher rule. The canonical publisher decision is part of B2-T1; the CRM side either re-subscribes to ACCT-PLAN's publication (option a) or keeps the CRM publication and the ACCT-PLAN handoff is re-attributed (option b). Surfaces on the next CRM audit.
- **CRM B8 / cross-domain `data_object_relationships`:** once ACCT-PLAN ships masters (B1-V*), CRM owes outbound `data_object_relationships` rows mirroring whichever ACCT-PLAN masters reference `customers` (e.g. `customers contains key_accounts`, `customers covered_by white_space_maps`, `customers visualized_in relationship_maps`). The B8 asymmetry rule puts the outbound on CRM's side because `customers` is the source-of-the-verb. Surfaces on the next CRM audit, after ACCT-PLAN masters land.
- **CSM B10 / inbound DMDO:** handoff 209 (`account_health.declined` → CSM) implies CSM should declare a `consumer + required` or `consumer + optional` DMDO row on the payload (`customers`, already CRM-mastered) on whichever CSM module reads the alert. CSM's next B10 pass surfaces this.
- **SALES-ENG B10 / inbound DMDO:** handoff 210 (`whitespace.identified` → SALES-ENG) implies SALES-ENG should declare a `consumer + optional` DMDO row on `customers` on whichever SALES-ENG module ingests the cross-sell prospect. SALES-ENG's next B10 pass surfaces this.
- **FARMER-DIRECT-SALES B9 receipt:** FARMER-DIRECT-SALES receives event 169 from CRM (handoff 1216) and event 197 (handoff 1217); the receiving domain owes B10 / B10b coverage on those rows. If B2-D1 consolidates events 169 and 197, handoff 1217 needs re-pointing. Surfaces on the next FARMER-DIRECT-SALES audit.
- **SKILL.md change request (cross-cutting, no domain owner):** B2-L1's resolution may also include editing the SKILL.md B1 leadership-tier list to remove ACCT-PLAN. This is a documentation change, not a catalog change; surfaces here so the orchestrator can route the SKILL.md edit alongside whatever loader handles B1-M1.

## 2026-05-31, Continuation: B1 technical fixes

Scope of this pass: apply only truly-technical Bucket 1 fixes that do not require user judgment. All judgment-bearing fixes (catalog UX drafts per Rule #20, new modules, new entities, contributors, role authoring, alias decisions, modularization shape, trigger-event attribution, etc.) remain deferred to the prior buckets.

### Applied

| ID | Action | Result |
|---|---|---|
| B1-H1 (handoff 210) | INSERT `handoff_processes` row (handoff_id=210, process_id=929, proposal_source='agent_curated', record_status default 'new'). Maps the ACCT-PLAN -> SALES-ENG `whitespace.identified` handoff to APQC PCF L4 "Identify and capture upsell/cross-sell opportunities" (external_id 16928). | Inserted as id 377, key=`210.929`. |

Loader: [.tmp_deploy/fix_acct_plan_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_acct_plan_b1_technical_2026_05_31.ts). Run from project root.

Pre-flight verifications (all passed before the insert):
- handoff 210 exists, source_domain_id=105 (ACCT-PLAN), target_domain_id=95 (SALES-ENG).
- process 929 exists, source_framework=`apqc_pcf_cross_industry`, hierarchy_level 4.
- no existing `handoff_processes` row for handoff_id=210.

H-band coverage after this pass: handoff 209 still untagged (deferred, see below); handoff 210 tagged. Coverage of cross-domain handoffs rises from 0 of 2 to 1 of 2.

### Deferred (and why)

| ID | Reason for deferral |
|---|---|
| B1-H1 (handoff 209) | Gated on B2-T1 (trigger-event publisher attribution). Per the cross-bucket dependency note, if B2-T1 resolves toward option (b) the agent_curated row should NOT be authored on the ACCT-PLAN side — the canonical publisher is CRM and the tag would belong on CRM's outbound handoff instead. Waiting for the B2-T1 decision before touching this. |
| B1-A1 | Catalog UX fields. Rule #20 forbids auto-write of `catalog_tagline` / `catalog_description`. Drafts are already in the 2026-05-30 audit awaiting user approval. |
| B1-M1 | New `domain_modules` rows. Out of scope for technical fixes (new entities); also gated on B2-L1 (leadership-tier reclassification) and B2-M1 (6 / 4 / 3 module shape). |
| B1-S1 | B10b backfill. Gated on B1-M1 (no modules exist yet to attribute the existing two outbound handoffs to). |
| B1-V1 .. B1-V7 | New master `data_objects` and supporting rows. Out of scope (new entities), gated on B1-M1 and B2-L1. |

### Not applicable to this pass

The TECHNICAL surface in the prompt also covers: enum backfills (no enum gaps named in the audit), B10b FK PATCHes derivable from existing modules (none — ACCT-PLAN has zero modules), inserts to `domain_regulations` (none — ACCT-PLAN has no regulation directly bearing per the audit), stale-row DELETEs with named IDs (none named), naming renames (none named), `data_object_relationships` user-edges (no ACCT-PLAN masters yet, so no Rule #10 user-edges to author), `permission_verb_override` PATCHes (no lifecycle states exist), `notes=''` reverts (no specific row IDs flagged for revert in the audit), and bulk `data_object_aliases` inserts (B2-A1 is a judgment call, no pre-specified tuples).

Status frontmatter left as-is; the audit is still in `feedback_needed` pending Buckets 2 and 3 decisions.

## 2026-05-31, Audit

### Summary

- Current footprint: 0 entities, 0 modules, 7 capabilities, 5 solutions (all primary), 0 regulations, 0 system skills, 0 roles, 0 `domain_aliases`, 1 `business_function_domains` owner row (Sales), 2 outbound handoffs (both `customers` payload), 0 inbound handoffs.
- Delta vs 2026-05-30: handoff 210 now carries an `agent_curated` `handoff_processes` row (id 377, process 929 "Identify and capture upsell/cross-sell opportunities", PCF L4 16928, `record_status='new'`) from the 2026-05-31 technical continuation. Every other structural finding is unchanged.
- Domain metadata: A1 passes (crud_percentage 80, business_logic populated, min_org_size `20 s <500`, cost_band `$$$`, usa_market_size_usd_m 400, source_year 2024, certification_required false). A4 still FAILS: both `catalog_tagline` and `catalog_description` are empty strings; the 2026-05-30 drafts remain queued for user approval per Rule #20.
- Vendor surface basis (unchanged from 2026-05-30): 5 flagship pure-play specialists (Upland Altify, Revegy, DemandFarm, Prolifiq CRUSH, Demandbase Account Planning), all loaded as `coverage_level=primary`. Surface entities: account_plans, mutual_action_plans (collision with EMP-EXP `action_plans` id 184, prefix required), white_space_maps, relationship_maps, stakeholder_records, key_accounts, qbr_meetings, qbr_action_items, account_health_scores, account_growth_metrics, account_plan_objectives, account_plan_strategies, key_account_segments, white_space_opportunities, mutual_action_plan_milestones.
- **Bucket 1 (in-scope, agent fixable): 4 items** (B1-A1, B1-M1, B1-S1, B1-H1-209). B1-V1 through B1-V7 are also Bucket-1-shaped but every one is gated on Bucket 2 (B2-L1, B2-M1, B2-K1), so they live under b1b (blocked).
- **Bucket 2 (surface-for-user, judgment): 9 items** (B2-L1 leadership-tier classification, B2-M1 module shape, B2-T1 trigger-event publisher attribution, B2-D1 event 197 duplicate, B2-K1 key_accounts shape, B2-C1 contributors, B2-E1 KAM roles, B2-A1 domain aliases, B2-V1 Salesforce Industries Cloud).
- **Bucket 3 (Phase 0 pending, speculative): 7 items** (ABM-Planning surface, methodology overlays, digital sales rooms, tier-promotion lifecycle, team-assignment shape, QBR ownership, predictive whitespace).

### Structural pass

A1 passes; A2 passes (7 capabilities); A3 passes (5 primary solutions); A4 FAILS (empty catalog UX fields).

M-band FAILS catastrophically: M1 fails (zero `domain_modules` rows); M2 implicitly fails (7 capabilities, 0 modules); M4 fails (every capability is orphaned); M5, M6 vacuous. M7 catalog-wide single-master check on proposed masters: `action_plans` (id 184) is mastered by EMP-EXP, so the ACCT-PLAN `mutual_action_plans` proposal must stay prefix-disambiguated per Rule #9.

B-band: B1 vacuous (SKILL.md leadership-tier exemption; itself questioned in B2-L1). B2 through B7 vacuous (no masters). B8 vacuous outbound (no ACCT-PLAN masters). B9: 2 outbound handoffs (209, 210); ACCT-PLAN owns zero `trigger_events` rows. Event 169 (`account_health.declined`) is dual-published (handoff 209 ACCT-PLAN to CSM and handoff 1216 CRM to FARMER-DIRECT-SALES); event 170 (`whitespace.identified`) is single-published (handoff 210 ACCT-PLAN to SALES-ENG). Both events sit on `customers` (id 97, CRM-mastered). Near-duplicate event 197 (`health_score.declined`) still exists (handoffs 224 CRM-to-FINOPS, 486 CRM-to-CRM, 1217 CRM-to-FARMER-DIRECT-SALES). B9b vacuous (no modules). B10: 0 inbound, acceptable for a publisher-shaped domain. B10b: 2 outbound rows with `source_domain_module_id=NULL`; gated on B1-M1. B11, B12 vacuous (no masters yet).

C-band: C1 passes (Sales owner via row id 133, responsibility_type='owner', business_function_id 21). No contributors or consumers loaded; surfaced as B2-C1. C2 vacuous (no override rows; OK if domain-level cluster suffices).

D-band: D1 deferred until after fix loads.

E-band: vacuous (no modules, no role surface). Tracked as B2-E1 once modules ship.

F-band: vacuous. F1 through F5 cannot apply (no modules to anchor skills against; Rule #17 floor uncomputable).

H-band: 2 cross-domain handoffs, 1 of 2 tagged (handoff 210, agent_curated, record_status='new'). Quality headline (`record_status='approved'`): 0 of 2. Process side-bar (`proposal_source='agent_curated'`): 1 of 2. Handoff 209 still untagged, gated on B2-T1.

### Vendor surface basis

Strategic Account Planning is a recognized point-solution category anchored by pure-play specialists: Upland Altify (mature enterprise pure-play, formerly TAS Group methodology), Revegy (relationship and white-space pure-play), DemandFarm (org-chart and white-space pure-play), Prolifiq CRUSH (Salesforce-native, mid-market), Demandbase Account Planning (ABM-anchored). The 5 flagships agree on the union surface: account-plan, mutual-action-plan, relationship-map, white-space-map, QBR, and key-account-metrics groups. Methodology overlays (TAS, Miller Heiman, Strategic Selling, GAP) are vendor-bundled but converge on the same underlying record types. No compliance specialist is needed; PII obligations inherit via CRM's `customers` substrate.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-A1 | A4 | Empty `catalog_tagline` and `catalog_description` on the `domains` row. Drafts authored 2026-05-30; per Rule #20 the agent waits for user-approved wording before any PATCH. | User reviews / edits / approves the 2026-05-30 drafts, then PATCH `/domains?id=eq.105`. |
| B1-M1 | M1, M2, M4 | Zero `domain_modules` rows on a domain with 7 capabilities. Blocks the entire B / E / F surface and the per-module FK attribution on handoffs 209 and 210. The 2026-05-30 hypothesis proposes 6 modules (ACCT-PLAN-CORE, MUTUAL-ACTION, RELATIONSHIP, WHITESPACE, QBR, METRICS); B2-M1 carries 4-module and 3-module alternatives. Gated on B2-L1 (leadership-tier classification) and B2-M1 (module shape). | Author the chosen module set as `module_kind='full'` rows plus `domain_module_capabilities` so every capability has a realizer. |
| B1-S1 | B10b | Outbound handoffs 209 (target CSM) and 210 (target SALES-ENG) carry `source_domain_module_id=NULL` because ACCT-PLAN has zero modules. Inbound has no rows. Gated on B1-M1; further gated on B2-T1 for handoff 209 (which may re-attribute the publisher to CRM). | Re-run the B10b backfill against the new modules once B1-M1 lands and B2-T1 has resolved. |

#### APQC TAGGING

| ID | Action |
|---|---|
| B1-H1-209 | Handoff 209 (ACCT-PLAN to CSM, `account_health.declined`, payload `customers`) is still untagged. Proposed PCF row: 717 ("Manage sales/key account plan", L4). Authoring is gated on B2-T1: if the publisher attribution moves to CRM the tag belongs on CRM's side instead. |

Handoff 210 already tagged in the 2026-05-31 technical continuation (handoff_processes id 377, process 929, agent_curated, record_status='new').

#### BOUNDARY findings

Skipped (no neighbor at edge weight >= 3). The two weight-1 neighbors (CSM, SALES-ENG) get one-line summaries in the 2026-05-30 narrative. CRM will be the heaviest pairwise neighbor by DMDO weight once B1-M1 plus B1-V* land.

### Bucket 2, Surface-for-user (judgment calls)

All 9 items from 2026-05-30 remain open; none have been resolved.

1. **B2-L1, Leadership-tier classification.** ACCT-PLAN is in SKILL.md B1's leadership-tier exception, but the flagship vendor surface shows it masters real entities. Options: (a) reclassify as normal Phase-B and load full masters, (b) keep leadership-tier and treat as pure-overlay (masters move to a queued ABM-Planning or KAM domain), (c) hybrid (keep account_health_scores / growth metrics as derived-signals; load account_plans, MAPs, relationship_maps, white_space_maps, QBRs as masters). Independent of Bucket 3; gates B2-M1, B1-M1, B1-V*.
2. **B2-M1, Modularization shape.** Choose 6-module (granular per cluster), 4-module (CORE / RELATIONSHIP-WHITESPACE / EXECUTION / METRICS), or 3-module (CORE / EXECUTION / METRICS). Gates B1-M1 and the proposed_module column on B1-V*.
3. **B2-T1, Trigger-event publisher attribution.** Event 169 has two publishers (ACCT-PLAN handoff 209 and CRM handoff 1216), violating one-event-one-publisher. Options: (a) move event 169 to be ACCT-PLAN-mastered (anchored to `account_health_scores` after B1-V7) and re-attribute CRM's handoff 1216 to subscribe; same treatment for event 170 anchored to `white_space_maps`. (b) Keep events on `customers` (CRM-published) and treat ACCT-PLAN's handoffs 209, 210 as mis-attributed. (c) Introduce derived-signal events with own publisher independent of master (catalog-wide shape change). Gates B1-H1-209 and ultimately B1-S1.
4. **B2-D1, Duplicate event `health_score.declined` (197) vs. `account_health.declined` (169).** Both on `customers`. Event 197 still has 3 handoff users (224, 486, 1217). Options: (a) consolidate on 169, DELETE 197, re-point handoffs 224, 486, 1217; (b) keep both with distinct semantics (analytics-side vs. planning-side); (c) keep as known redundancy. Interacts with B2-T1.
5. **B2-K1, `key_accounts` shape.** (a) separate master, (b) enum field on `customers`, (c) junction `key_account_designations`. Vendor split: Altify/Revegy favor (a); DemandFarm/Demandbase favor (b). Affects B1-V5.
6. **B2-C1, Function-spine contributors.** Add Customer Success (id 23) and Sales Operations (id 52) as `contributor` rows, or only Customer Success, or leave. Independent.
7. **B2-E1, KAM-shaped role authoring.** Candidates: Strategic Account Manager (cross-functional), Key Account Director, Customer Success Account Manager, Sales Operations Analyst. Gated on B1-M1.
8. **B2-A1, Domain aliases.** 0 `domain_aliases` rows. Synonyms: KAM, key account management, strategic account management, account planning, ABM-planning. Choose 4 / 2 / defer. Independent.
9. **B2-V1, Salesforce Industries Cloud Strategic Account Plans positioning.** Add Sales Cloud or Industries Cloud as `coverage_level=secondary` solution, keep 5-flagship pure-play list, or industry-conditional. Independent.

### Bucket 3, Phase 0 pending (speculative)

Unchanged from 2026-05-30. Seven candidates: ABM-Planning surface (Demandbase / 6sense / Terminus / Madison Logic), methodology overlays as catalog primitives (TAS / Miller Heiman / Strategic Selling / GAP), digital sales room overlap with `mutual_action_plans` (GetAccept / Recapped / Aligned / Trumpet), account-tier promotion lifecycle as workflow vs. configuration, account-team assignments shape (junction vs. columns), QBR ownership boundary with CSM platforms (Gainsight EBR / Totango QBR / ChurnZero), predictive whitespace scoring vs. configuration-driven (DemandFarm AI / Demandbase Intent vs. Altify / Revegy static grids).

### Cross-bucket dependencies

- B1-A1 independent; ready as soon as user approves wording.
- B1-M1 gates B1-S1 and B1-V1 through B1-V7; itself gated on B2-L1 (and B2-M1 for shape).
- B1-H1-209 gates on B2-T1.
- B2-L1 gates B2-M1, B1-M1, B1-V*. If (b) holds, B2-M1 is vacuous and B1-V* drops.
- B2-M1 informs every B1-V* proposed_module placement.
- B2-T1 interacts with B2-D1 (event 197 cleanup).
- B2-K1 affects B1-V5 (key_accounts).
- B2-E1 gates on B1-M1 and B2-M1.
- Bucket 3 candidates 1 (ABM-PLAN), 3 (DSR), 6 (QBR ownership) inform B2-M1 and B2-L1 if vetted.
- Buckets 2 and 3 are otherwise independent of each other (the user can resolve them in any order).

### Per-bucket prompts

**After Bucket 1 (4 items):** B1-A1 (catalog UX, needs your approved wording), B1-H1-209 (1 APQC tag, needs B2-T1 first), B1-M1 (6 modules, needs B2-L1 plus B2-M1), B1-S1 (B10b backfill, needs B1-M1). Reply 'all' (resolve B2-L1 plus B2-M1 plus B2-T1 first, then proceed), 'just A1' (waiting on you for wording), or 'skip'.

**After Bucket 2 (9 items):** B2-L1, B2-M1, B2-T1, B2-D1, B2-K1, B2-C1, B2-E1, B2-A1, B2-V1. What is your call on each? I will wait for your decision per item before acting. For B2-L1 and B2-M1, consider running Bucket 3 candidates 1, 3, 6 first if you want a vendor-grounded answer.

**After Bucket 3 (7 items):** Vet via Phase 0 research (subagent over Altify / Revegy / DemandFarm / Demandbase / GetAccept / Recapped / Gainsight / Totango docs), or eyeball-mode? If eyeball, name which candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

- **CRM B9 / catalog enum hygiene:** event 197 (`health_score.declined`) on `customers` is a near-duplicate of event 169 (`account_health.declined`). Surfaces on the next CRM audit. Reference B2-D1.
- **CRM B9 attribution:** event 169 is dual-published (ACCT-PLAN handoff 209, CRM handoff 1216), violating one-event-one-publisher. Resolution part of B2-T1. Surfaces on the next CRM audit.
- **CRM B8 / cross-domain `data_object_relationships`:** once ACCT-PLAN ships masters (B1-V*), CRM owes outbound `data_object_relationships` rows mirroring whichever ACCT-PLAN masters reference `customers`. The B8 asymmetry rule puts the outbound on CRM. Surfaces on the next CRM audit, after ACCT-PLAN masters land.
- **CSM B10 / inbound DMDO:** handoff 209 (`account_health.declined` to CSM) implies CSM should declare a `consumer + required` or `consumer + optional` DMDO row on `customers` on whichever CSM module reads the alert.
- **SALES-ENG B10 / inbound DMDO:** handoff 210 (`whitespace.identified` to SALES-ENG) implies SALES-ENG should declare a `consumer + optional` DMDO row on `customers`.
- **FARMER-DIRECT-SALES B9 receipt:** receives event 169 (handoff 1216) and event 197 (handoff 1217). If B2-D1 consolidates 169 and 197, handoff 1217 needs re-pointing.
- **FINOPS B10 / inbound receipt of event 197:** handoff 224 (CRM to FINOPS) receives event 197. Same B2-D1 implication.
- **SKILL.md change request (cross-cutting):** B2-L1's resolution may also include editing SKILL.md B1's leadership-tier list to remove ACCT-PLAN.

### Decisions

None this run; the audit re-confirms the open buckets from 2026-05-30 with the single delta that handoff 210 is now tagged (recorded under "Fixes applied" in the 2026-05-31 continuation, not here).

### Fixes applied

None this run. Refer to the 2026-05-31 technical continuation for the single B1-H1 partial application on handoff 210.
