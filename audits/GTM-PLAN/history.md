# GTM-PLAN audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 0 entities, 0 modules, 7 capabilities, 7 solutions (4 primary, 3 secondary), 0 regulations, 0 trigger_events, 0 outbound handoffs, 0 inbound handoffs, 0 system skills, 0 roles, 0 `domain_data_objects` rows, 0 `domain_module_data_objects` rows.
- Domain metadata: A1 passes (crud_percentage 65, business_logic populated, min_org_size `30 m <2500`, cost_band `$$$`, usa_market_size_usd_m 600, source year 2024). A4 fails: both `catalog_tagline` and `catalog_description` are empty.
- Leadership-tier domain (listed in SKILL.md B1 exception list alongside REV-INTEL, SALES-PERF, ACCT-PLAN, PRM, etc.): masters are expected to be zero, but module count is not exempt under Rule #14. The whole M-band is failed and gates every B / E / F band.
- Vendor-surface basis: 4 pure-play GTM / sales-planning specialists (Anaplan Sales Planning, Pigment, Fullcast, Salesforce Sales Planning) plus 3 financial-planning-tier vendors that cover the planning end (Board, Varicent Plan, Xactly Plan). ICP / account-scoring side is dominated by ABM platforms (Demandbase, 6sense, RollWorks, Madison Logic). PMM-flavored launch orchestration sits in Klue / Crayon / Aha! adjacent space.
- **Bucket 1 (in-scope, agent fixable):** 6 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.
- Candidates queued to `audits/_missing-domains.md`: 3 (`SALES-PLANNING-PLATFORM` bumped to 2 mentions, `PMM` bumped to 2 mentions, `ABM-PLATFORM` new).

Structural pass: A1 passes, A2 passes (7 capabilities), A3 passes (7 solutions with coverage_level set, 4 primary), A4 FAILS (empty catalog UX fields). M-band FAILS catastrophically: zero modules on a leadership-tier domain that still requires at least one full module per Rule #14. With no modules the entire B-band collapses (B1 exempt as leadership-tier; B2 through B12 vacuous), C passes (owner Sales Operations, contributors Marketing and Product Management), E-band cannot apply, F-band cannot apply, H-band has zero handoffs of any kind so there is no APQC surface to tag inside GTM-PLAN itself.

### Vendor surface basis

The market is one of the catalog's most cross-functional "planning shell" domains: Sales-Ops owns the artifact (the GTM plan), Marketing-Ops contributes segmentation and ABM target lists, Product owns segment-launch timing, Finance / EPM partners on the capacity-to-revenue model. The flagship pure-plays are Anaplan Sales Planning (territory carving, capacity modeling, what-if scenarios; the canonical incumbent), Pigment (modern multi-dimensional planning surface with rev-ops use cases), Fullcast (CRM-native territory and capacity ops, lives next to Salesforce), and Salesforce Sales Planning (newer entrant, native to Sales Cloud). On the ABM / account-scoring side, Demandbase and 6sense market the ICP-definition and account-tiering surface as a distinct platform; RollWorks, Madison Logic, and Terminus round out the ABM tier. On the launch-orchestration side, PMM-flavored tools (Klue, Crayon, Aha! Roadmaps Create, Highspot, Seismic) cover launch readiness, messaging, and competitive intelligence but anchor to a different buyer (PMM, not Sales-Ops). All four pure-play planning vendors agree on the core entity surface: `gtm_plans`, `target_segments`, `target_account_lists`, `ideal_customer_profiles`, `territories` (handed to SALES-PERF), `quotas` (handed to SALES-PERF), `capacity_models`, `channel_mix_allocations`, `launch_plans`, `scenario_plans`, `gtm_milestones`.

### Pass 1, Structural sweep

#### S1, Direct FKs to `domains` for GTM-PLAN (id 104)

| Table | FK column | GTM-PLAN rows | Expected non-zero? |
| --- | --- | --- | --- |
| `business_function_domains` | `domain_id` | 3 (owner Sales Operations, contributors Marketing and Product Management) | yes, pass |
| `capability_domains` | `domain_id` | 7 | yes, pass |
| `domain_data_objects` | `domain_id` | 0 | exempt (leadership-tier per B1) |
| `domain_modules` | `domain_id` | 0 | yes, FAIL (Rule #14 M1) |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero, OK |
| `domain_regulations` | `domain_id` | 0 | optional, see Bucket 2 (low signal in this market) |
| `handoffs.source_domain_id` | source | 0 | yes for any non-leaf, FAIL (see B9) |
| `handoffs.target_domain_id` | target | 0 | yes for non-leadership, anomalous for a planning hub, see B10 |
| `skills` | `domain_id` | 0 | yes (Rule #17 F2), FAIL once modules exist; vacuous until then |
| `solution_domains` | `domain_id` | 7 | yes, pass |
| `domains.parent_domain_id` | self | NULL | routinely zero, OK |
| `domain_aliases` | `domain_id` | 0 | optional, see Bucket 2 |

#### S2, Per-module coverage

Vacuous (zero modules).

#### S3, Per-master indirect-table coverage

Vacuous (zero masters; B1 leadership-tier exemption).

#### A-band

- **A1, domains metadata.** Pass. All 7 business-meaningful columns populated and within enum bands: `crud_percentage=65`, `business_logic` non-empty (territory carving optimization, quota distribution, capacity modeling), `min_org_size='30 m <2500'`, `cost_band='$$$'`, `certification_required=false`, `usa_market_size_usd_m=600`, `market_size_source_year=2024`.
- **A2, capabilities linked.** Pass. 7 capabilities: `MARKET-SEGMENTATION`, `TERRITORY-CARVING-PLAN`, `ACCOUNT-SCORING`, `GTM-CAPACITY-PLANNING`, `CHANNEL-MIX-PLANNING`, `LAUNCH-ORCHESTRATION`, `GTM-SCENARIO-MODELING`, `PLAN-TO-EXECUTION-HANDOFF` (8 listed in the query result; tally is 8, not 7; updated below).
- **A2 correction.** Capability count is **8** (`MARKET-SEGMENTATION`, `TERRITORY-CARVING-PLAN`, `ACCOUNT-SCORING`, `GTM-CAPACITY-PLANNING`, `CHANNEL-MIX-PLANNING`, `LAUNCH-ORCHESTRATION`, `GTM-SCENARIO-MODELING`, `PLAN-TO-EXECUTION-HANDOFF`). The Summary's "7 capabilities" was an undercount; the correct number is 8. Doesn't change any pass criterion; M2 ("at least 3 capabilities implies at least 2 modules") still applies the same way.
- **A3, solutions linked.** Pass. 7 solutions, all with coverage_level set, 4 primary (Anaplan Sales Planning, Fullcast, Salesforce Sales Planning, Pigment) plus 3 secondary (Varicent SPM, Xactly Incent, Board). The 3 secondary are SPM-tier solutions that bleed into planning; the 4 primary are the pure-play GTM planning surface.
- **A4, catalog UX fields.** FAIL. Both `catalog_tagline` and `catalog_description` are empty strings. See Bucket 1 `B1-A1`.
- **A5, vendor ownership refresh.** Skipped (opt-in, not requested). Notable potential refresh: Fullcast.io rebranded from "Fullcast" in 2023; Salesforce Sales Planning is the rebrand of acquired Atrium and Salesforce native planning tooling. Surface to user if vendor-ownership pass is requested.

#### M-band

- **M1, at least 1 `domain_modules` row.** FAIL. Zero rows. Leadership-tier domains still require at least one module per Rule #14 (the rule carries no leadership-tier exemption; only B1 carries one). See Bucket 1 `B1-M1`.
- **M2, at least 3 capabilities implies at least 2 modules.** Implicitly FAIL (8 capabilities, 0 modules). Resolved by `B1-M1`.
- **M4, every capability has at least 1 realizing module.** FAIL by construction (no modules to realize anything). All 8 capabilities are orphans pending `B1-M1`.
- **M5, lifecycle states have `domain_module_id` when module-scoped.** Vacuous.
- **M6, every module realizes at least 1 capability.** Vacuous.
- **M7, single-master and within-domain coherence.** Vacuous (no masters).

#### B-band

- **B1, at least 1 master.** Vacuous (leadership-tier exemption per SKILL.md: REV-INTEL / SALES-PERF / GTM-PLAN / ACCT-PLAN / PRM / OP-RES / BCM / SECOPS / SOAR / THREAT-INTEL / TPRM / VULN-MGMT / PRIV-MGMT / FINOPS / INTRANET / COLLAB-GOV).
- **B2 through B7.** Vacuous (zero masters).
- **B8 outbound `data_object_relationships`.** Vacuous (no masters to source verbs from).
- **B9 outbound `trigger_events` and `handoffs`.** Vacuous (no masters, no events). The expected outbound surface once modules and masters exist is the PLAN-TO-EXECUTION-HANDOFF capability's actual artifact: `gtm_plan.approved` fires to SALES-PERF (territories), CRM (target accounts), MA (campaigns by segment), EPM (capacity numbers). All zero today.
- **B9b intra-domain cross-module handoffs.** Vacuous (zero modules, no cross-module surface).
- **B10 inbound handoffs (report only).** Zero rows. Anomalous for a planning hub: GTM-PLAN should be downstream of PROD-MGMT (`product.launch_scheduled` informs launch orchestration), upstream of SALES-PERF (territory carving feeds SALES-PERF's TERRITORY-DESIGN), and adjacent to ACCT-PLAN, CRM, MA, EPM. None of these neighbors today publishes any handoff into GTM-PLAN, which means either GTM-PLAN is a write-only blackbox in the catalog or, more likely, the catalog has not yet modeled GTM-PLAN's consumer role on `product.launch_scheduled` / `account.tier_changed` / `forecast.published` events. Cannot author from this side; report-only for PROD-MGMT / CRM / EPM B9 passes.
- **B10b per-module attribution on `handoffs`.** Vacuous (zero rows on both directions).
- **B11, aliases for non-self-explanatory masters.** Vacuous.
- **B12, lifecycle states.** Vacuous.

#### C-band

- **C1, at least 1 `business_function_domains` owner.** Pass. Owner = Sales Operations; contributors = Marketing, Product Management. RACI matches the cross-functional planning shell shape.
- **C2, capability-level RACI overrides.** No override rows found. Acceptable inheritance for `MARKET-SEGMENTATION`, `ACCOUNT-SCORING`, `TERRITORY-CARVING-PLAN`, `GTM-CAPACITY-PLANNING`, `GTM-SCENARIO-MODELING`, `PLAN-TO-EXECUTION-HANDOFF`. See Bucket 2 `B2-C1` for whether `LAUNCH-ORCHESTRATION` should override to Product Management (or to a new PMM function once that domain is promoted) and whether `CHANNEL-MIX-PLANNING` should override to Marketing.

#### D-band

- **D1, UI spot-check.** Deferred until after fix loads land.

#### E-band

Vacuous: no modules, no role-modules surface, no role authoring possible. Will become applicable once `B1-M1` resolves and at least 2 modules ship. The natural personas (Head of Sales Ops, Head of RevOps, Marketing Ops Lead, PMM lead, Finance Partner) all span multiple modules and would satisfy the 2-module floor.

#### F-band

Vacuous: no modules and zero system skills. Will become applicable once `B1-M1` resolves; Rule #17 requires exactly one `skill_type='system'` skill per `domain_modules` row.

#### H-band, APQC coverage

No handoffs of any kind, inbound or outbound, on this domain. The H-band is vacuous with zero handoffs to tag. The volume target (0.5N to 0.8N agent_curated rows on N cross-domain handoffs) is satisfied vacuously by N=0. Once `B1-M1` lands and the expected outbound handoffs to SALES-PERF / CRM / MA / EPM / ACCT-PLAN are authored, APQC tagging becomes a real surface; until then, H1 ticks green by exemption.

### Pass 2, Market audit (semantic)

The market surface for GTM-PLAN, across the 4 pure-play planning vendors (Anaplan Sales Planning, Pigment, Fullcast, Salesforce Sales Planning) and 3 financial-planning-tier adjacents (Board, Varicent Plan, Xactly Plan) plus the ABM platforms (Demandbase, 6sense, RollWorks) and the PMM-flavored launch tier (Klue, Crayon, Aha! Roadmaps Create), is unusually composite: no single vendor masters every entity in the surface, and the buyer is itself cross-functional. The union entity surface is:

**Master records (segmentation and targeting side):**
- `ideal_customer_profiles` (ICP definitions: firmographic, technographic, behavioral signals)
- `target_segments` (named segments derived from ICPs, with sizing and prioritization)
- `target_account_lists` (named account lists per segment, ABM-style)
- `account_scores` (per-account propensity / fit / intent scores, time-series-ish)
- `account_tiers` (Tier 1 / 2 / 3 designation; canonical owner candidate)
- `white_space_maps` (segment x product gap analysis)

**Master records (territory and capacity planning side):**
- `gtm_plans` (the parent artifact: a versioned, period-aligned go-to-market plan)
- `territories_proposed` (territory drafts before handoff to SALES-PERF)
- `quotas_proposed` (quota drafts before handoff to SALES-PERF)
- `capacity_models` (heads-per-segment / heads-per-region modeling)
- `coverage_models` (territories x roles x heads matrix)
- `ramp_assumptions` (per-role ramp curves driving capacity-to-pipeline math)

**Master records (channel and launch side):**
- `channel_mix_allocations` (direct / partner / digital / PLG revenue and pipeline targets per segment)
- `launch_plans` (per-product or per-segment launch sequencing)
- `launch_milestones` (readiness gates: pricing, packaging, enablement, content)
- `gtm_milestones` (cross-functional milestone tracking against the plan)

**Master records (scenario and what-if side):**
- `scenario_plans` (downturn, segment pivot, geography expansion, channel-mix-shift scenarios)
- `scenario_inputs` (parameter sets per scenario: growth rate, attrition, ramp)
- `plan_versions` (versioned plan snapshots for compare-and-revert)

**Junctions, transitions, audit:**
- `plan_approvals` (plan sign-off workflow: Sales Ops, Marketing, Finance, Product)
- `plan_change_requests` (mid-period adjustments)
- `plan_change_audit_trails`
- `segment_account_assignments` (account x segment over time)
- `coverage_assignments` (role x segment x heads-needed)

**Configuration / templates:**
- `icp_templates`, `segmentation_frameworks`, `scenario_templates`
- `firmographic_attributes`, `technographic_attributes`, `intent_signal_sources`

**Compliance / regulation:**
Effectively none. GTM-PLAN is a planning artifact; PII risk is downstream when the plan lands in CRM / MA. GDPR exposure exists if `account_scores` is computed on EU-resident contacts, but the regulation applies to the consuming system, not the planning shell. Bucket 2 `B2-R1` asks whether to add any regulations at all.

**Modularization hypothesis (proposed module set):**

| Module code | Scope | Capabilities |
|---|---|---|
| `GTM-PLAN-ICP-SEGMENT` | ICPs, target segments, white-space maps, segmentation frameworks, firmographic and technographic attributes | `MARKET-SEGMENTATION` |
| `GTM-PLAN-ACCOUNT-TARGETING` | target account lists, account scores, account tiers, intent signal sources, segment-account assignments | `ACCOUNT-SCORING` |
| `GTM-PLAN-TERRITORY` | proposed territories, coverage models, coverage assignments (drafts that hand off to SALES-PERF on plan lock) | `TERRITORY-CARVING-PLAN` |
| `GTM-PLAN-CAPACITY` | capacity models, ramp assumptions, heads-per-segment math, headcount-to-coverage modeling | `GTM-CAPACITY-PLANNING` |
| `GTM-PLAN-CHANNEL-MIX` | channel mix allocations across direct / partner / digital / PLG, channel-conflict policy modeling | `CHANNEL-MIX-PLANNING` |
| `GTM-PLAN-LAUNCH-ORCH` | launch plans, launch milestones, cross-functional readiness gating | `LAUNCH-ORCHESTRATION` |
| `GTM-PLAN-SCENARIO` | scenario plans, scenario inputs, plan versions, what-if modeling | `GTM-SCENARIO-MODELING` |
| `GTM-PLAN-EXEC-HANDOFF` | plan approvals, plan-to-execution lock, downstream artifact push (territories to SALES-PERF, target accounts to CRM/MA, capacity to EPM) | `PLAN-TO-EXECUTION-HANDOFF` |

8 modules cleanly maps onto the 8 capabilities. Alternative consolidations: collapse to 5 modules (PLANNING-CORE for ICP+ACCOUNT+TERRITORY, CAPACITY+CHANNEL together, LAUNCH-ORCH, SCENARIO, EXEC-HANDOFF) or 3 modules (PLAN-DESIGN / SCENARIO-MODELING / PLAN-LOCK-AND-PUSH). The 8-module split is granular and may over-fragment for an unmodularized starting point; Bucket 2 `B2-M1` surfaces the trade-off.

**Findings categories:**

- **MISSING entities:** ALL of the surface entities listed above. Since GTM-PLAN has zero masters and zero modules, every entity in the market surface is missing. This is the dominant finding type.
- **WRONG-OWNERSHIP:** N/A (no entities currently owned).
- **SCOPE-CREEP:** N/A (no entities currently owned).
- **MODULARIZATION ISSUE:** the existing capability set (8 capabilities) is sound, but no modules exist to realize them. The hypothesis above proposes 8 modules. This is a structural recommendation, not a Bucket 1 fix; goes to Bucket 2 `B2-M1`. Also flagged: the LAUNCH-ORCHESTRATION capability sits in scope-ambiguity with the queued PMM candidate domain (mention count 2 after this audit). If PMM is promoted, GTM-PLAN-LAUNCH-ORCH may relocate.

### Pass 3, Neighbor discovery

Cross-edges with other domains, ranked by edge weight (handoff count plus DMDO dependency count). Zero handoffs in either direction today, so edge weight is derived from semantic adjacency only.

| Neighbor | Outbound handoffs | Inbound handoffs | DMDO deps | Edge weight | Notes |
|---|---|---|---|---|---|
| SALES-PERF | 0 | 0 | n/a (no DMDO surface yet on either side) | 0 today, semantic 5+ | Largest semantic edge: GTM-PLAN-TERRITORY hands `territories_proposed` to SALES-PERF on plan lock. SALES-PERF itself has zero modules (its own audit's `B1-M1`). Pairwise reconciliation is blocked on both sides until both modularize. |
| CRM | 0 | 0 | n/a | 0 today, semantic 3+ | GTM-PLAN-ACCOUNT-TARGETING hands `target_account_lists` to CRM (named accounts seed CRM segmentation); CRM publishes `account.tier_changed` and `account.created` that GTM-PLAN should consume on plan refresh. None loaded. |
| MA | 0 | 0 | n/a | 0 today, semantic 2+ | GTM-PLAN-CHANNEL-MIX informs MA campaign budget allocation; GTM-PLAN-ACCOUNT-TARGETING seeds ABM audiences in MA. None loaded. |
| EPM | 0 | 0 | n/a | 0 today, semantic 2+ | GTM-PLAN-CAPACITY hands capacity numbers to EPM for headcount budget close. EPM's `forecast.published` and `budget.locked` events should inform GTM-PLAN scenario inputs. None loaded. |
| ACCT-PLAN | 0 | 0 | n/a | 0 today, semantic 2+ | Strategic account planning sits adjacent to ACCOUNT-SCORING / target-account-lists. ACCT-PLAN is itself unmodularized (id 105, expected to be a peer-leadership-tier domain). Mutual blocker. |
| PROD-MGMT | 0 | 0 | n/a | 0 today, semantic 2+ | `product.launch_scheduled` is the expected inbound trigger for LAUNCH-ORCHESTRATION; not loaded. |
| SWP | 0 | 0 | n/a | 0 today, semantic 1+ | Workforce planning shares capacity-planning concepts; SWP is HR-led and feeds GTM-PLAN-CAPACITY ramp assumptions. |
| REV-INTEL | 0 | 0 | n/a | 0 today, semantic 1+ | Plan-vs-actual scenarios in GTM-PLAN-SCENARIO consume REV-INTEL pipeline signals. Both unmodularized. |

Default deep-dive threshold (edge weight at least 3) is not met for any neighbor based on actual catalog edges. All eight neighbors are semantically meaningful at edge weight 1 to 5+ but currently zero on the wire. The reconciliation surface is gated on `B1-M1` resolving on this side, plus the peer-leadership-tier neighbors (SALES-PERF, REV-INTEL, ACCT-PLAN) modularizing too.

### Pass 4, Pairwise reconciliation per neighbor

Skipped on all 8 neighbors. Every neighbor has zero existing edges to GTM-PLAN; pairwise diff requires module FKs on both sides, and GTM-PLAN has none. Even the strongest semantic neighbors (SALES-PERF, CRM, EPM) cannot reconcile until at least GTM-PLAN modularizes. Recorded as a "re-run after `B1-M1` lands" follow-up; will become meaningful once GTM-PLAN ships modules and the expected outbound handoffs to SALES-PERF / CRM / MA / EPM are drafted.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (S1, A4, M1, M2, M4)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-M1 | M1 / M2 / M4 | Zero `domain_modules` rows on a leadership-tier planning domain with 8 capabilities. Blocks the entire B / E / F surface and the expected outbound handoffs to SALES-PERF / CRM / MA / EPM. The market hypothesis in Pass 2 proposes 8 modules (one per capability). | Author 8 `domain_modules` rows with the codes proposed in Pass 2's modularization table. Each carries `module_kind='full'`. Bundle with the corresponding `domain_module_capabilities` rows so every capability has at least 1 realizing module. Alternative 5-module / 3-module shapes surface in Bucket 2 `B2-M1`. |
| B1-A1 | A4 | Empty `catalog_tagline` and `catalog_description`. Per Rule #20 the audit may draft both; surface to user for review BEFORE writing. | Drafts authored below; user approves wording, then PATCH. |

Drafts for `B1-A1` (per Rule #20 voice rule, buyer voice, workflow plus value):
- `catalog_tagline` draft: "Plan your year. Decide where to play, how much capacity to invest, and which segments to lead with, then push the locked plan to Sales, Marketing, and Finance."
- `catalog_description` draft (3 short paragraphs):
  - "Go-to-Market Planning runs the cross-functional planning that decides how you enter and grow markets. Define your ICP, carve segments, score and tier accounts, draft territories and quotas, and model capacity-to-coverage against your revenue targets."
  - "Run what-if scenarios across geographies, channels, and segments. Layer launch orchestration on top: sequence product launches, gate on readiness, and coordinate the cross-functional motion from PMM through Sales, Marketing, Support, and Success."
  - "When the plan locks, push the artifacts downstream: territories to Sales Performance Management, target accounts to CRM and Marketing Automation, capacity numbers to Finance and EPM. Built for Sales Ops and RevOps teams who own the annual GTM motion, partnering with Marketing Ops, Product, and Finance."

#### MISSING (vendor-surface entities, all gated on `B1-M1`)

These are placeholder entries. Every entity in Pass 2's market surface is missing because zero masters exist. Loading requires `B1-M1` to land first and the modularization shape (`B2-M1`) to be picked. The audit lists the top 4 most-impactful candidates here so the user has a per-entity decision surface; the full set goes to Bucket 3 pending Phase 0 vetting.

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-V1 | `gtm_plans` | GTM-PLAN-EXEC-HANDOFF (or a dedicated GTM-PLAN-CORE) | 4 of 4 pure-play planning vendors (Anaplan Sales Planning, Pigment, Fullcast, Salesforce Sales Planning); the parent artifact |
| B1-V2 | `ideal_customer_profiles` | GTM-PLAN-ICP-SEGMENT | Demandbase, 6sense, RollWorks; canonical ABM-platform entity |
| B1-V3 | `target_account_lists` | GTM-PLAN-ACCOUNT-TARGETING | Demandbase, 6sense, Madison Logic, RollWorks; the headline ABM artifact |
| B1-V4 | `capacity_models` | GTM-PLAN-CAPACITY | Anaplan Sales Planning, Pigment, Fullcast; capacity-to-coverage is the planning-vendor headline |

Bucket 3 carries the full speculative list (territories_proposed, quotas_proposed, channel_mix_allocations, launch_plans, scenario_plans, etc.) since the modularization-shape decision in `B2-M1` rewrites the `proposed_module` column for them.

#### APQC TAGGING

Vacuous. Zero handoffs in either direction on GTM-PLAN today; H1 has nothing to tag. Becomes a real surface once `B1-M1` lands and the expected outbound handoffs to SALES-PERF / CRM / MA / EPM are drafted, at which point a follow-up audit pass should produce roughly 0.5N to 0.8N `agent_curated` rows on N new handoffs.

#### BOUNDARY findings per neighbor

Skipped (Pass 4 pairwise is blocked on `B1-M1` and on the peer-leadership-tier neighbors also modularizing).

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-M1, Modularization hypothesis.** Pass 2 proposes 8 modules for the 8 capabilities. Plausible alternatives: (a) 8-module split as proposed (granular per capability, mirrors the breadth of cross-functional ownership); (b) 5-module shape: PLAN-CORE (ICP plus ACCOUNT plus TERRITORY plus CHANNEL-MIX as one planning surface), CAPACITY, LAUNCH-ORCH, SCENARIO, EXEC-HANDOFF; (c) 3-module shape: PLAN-DESIGN / SCENARIO-MODELING / PLAN-LOCK-AND-PUSH (collapses the most). Anaplan and Pigment tilt toward the 8-module granular view (each capability is a tab in their plan-modeling UI); Fullcast and Salesforce Sales Planning tilt toward a 3-to-5-module CRM-centric view. Decide before authoring masters. Has a Bucket 3 dependency: candidate #1 (LAUNCH-ORCH relocation to PMM if PMM is promoted) and candidate #2 (ABM-PLATFORM carve-out) could pull modules out of GTM-PLAN entirely.

2. **B2-C1, Capability-level RACI override on LAUNCH-ORCHESTRATION and CHANNEL-MIX-PLANNING.** The 8 capabilities all inherit Sales Operations ownership at the domain level. LAUNCH-ORCHESTRATION is more naturally PMM-owned (Product Marketing leads launch readiness and messaging) and CHANNEL-MIX-PLANNING is more naturally Marketing-Ops-owned. Should these two carry `business_function_capabilities` overrides? Options: (a) add overrides for both (LAUNCH-ORCH to Product Management, CHANNEL-MIX to Marketing), (b) leave inherited (Sales Ops owns the whole cross-functional shell, period), (c) add LAUNCH-ORCH override only (more defensible) and leave CHANNEL-MIX inherited, (d) wait until PMM is promoted as a domain and then relocate LAUNCH-ORCH there. Bucket 3 dependency on (d): PMM is queued in `_missing-domains.md` at mention count 2 after this audit.

3. **B2-R1, Regulation coverage.** Zero `domain_regulations` rows. Genuine question whether GTM-PLAN warrants any. GDPR applies if `account_scores` includes EU-resident contact-level intent data (Demandbase and 6sense both surface contact-level intent). CCPA / CPRA apply for the US consumer-facing case. SOX may apply if `gtm_plans` feeds revenue-related disclosures (rare). Options: (a) none (GTM-PLAN is a planning shell, regulations apply to consumers downstream), (b) GDPR only (intent-data exposure), (c) GDPR plus CCPA (US plus EU intent-data coverage), (d) GDPR plus CCPA plus SOX (full conservative set). Independent of Bucket 3.

4. **B2-S1, Promote PMM and relocate LAUNCH-ORCH.** PMM (Product Marketing Management) is queued in `_missing-domains.md` at mention count 2 (PROD-MGMT plus GTM-PLAN). If promoted, GTM-PLAN's LAUNCH-ORCHESTRATION capability and the corresponding `GTM-PLAN-LAUNCH-ORCH` module proposed in `B1-M1` should relocate to PMM. Options: (a) promote PMM and relocate (cleanest market shape, matches Klue / Crayon / Aha! Roadmaps Create vendor boundary), (b) keep LAUNCH-ORCH in GTM-PLAN and let PMM be the launch-readiness consumer downstream, (c) wait until PMM mention count grows past 3 (cross-domain blast radius). Has a strong cross-dependency with `B2-M1`.

5. **B2-S2, Promote ABM-PLATFORM and split ICP / ACCOUNT-TARGETING out.** ABM-PLATFORM (Demandbase, 6sense, RollWorks, Madison Logic, Terminus, Mutiny) is queued newly by this audit at mention count 1. If promoted as its own domain, `MARKET-SEGMENTATION` and `ACCOUNT-SCORING` capabilities and the `GTM-PLAN-ICP-SEGMENT` plus `GTM-PLAN-ACCOUNT-TARGETING` modules proposed in `B1-M1` would relocate. Options: (a) promote ABM-PLATFORM and relocate the two modules and capabilities (Gartner has consistently treated ABM as a distinct platform market with its own buyer, marketing ops), (b) keep ICP and account targeting in GTM-PLAN as the sales-ops-owned side and let ABM-PLATFORM be the marketing-ops-owned engagement platform downstream (the Demandbase plus 6sense models split: planning-side stays in GTM-PLAN, engagement-side goes to ABM-PLATFORM), (c) defer until ABM-PLATFORM mention count grows. Strong dependency on Bucket 3 candidate #2.

6. **B2-D1, Domain description scope-creep risk.** The current `domains.description` reads: "Cross-functional planning of how to enter and grow markets, ICP and segmentation, territory carving, account scoring, channel mix, sales capacity modeling, and launch orchestration. Sits across Sales Ops, Marketing Ops, and Customer Success Ops. Distinct from SALES-PERF (which executes the territory/quota design once decided), EPM (finance-led), and SWP (workforce-led)." This is broad. If `B2-S1` (PMM) and `B2-S2` (ABM-PLATFORM) both resolve to "promote and relocate", the GTM-PLAN description needs a rewrite to narrow scope to the territory plus quota plus capacity plus scenario planning core. Defer until `B2-S1` and `B2-S2` are answered. Per Rule #20 / Rule #18, the new description goes through user review with the structured columns (min_org_size, cost_band) carrying the buyer-side signal.

7. **B2-P1, Pairwise reconciliation timing.** Pass 4 is blocked on `B1-M1` plus the peer-leadership-tier neighbors (SALES-PERF, REV-INTEL, ACCT-PLAN) also modularizing. When GTM-PLAN, SALES-PERF, CRM, MA, EPM, and PROD-MGMT all have modules, the pairwise diffs become meaningful. Options: (a) schedule pairwise passes against each non-leadership-tier neighbor (CRM, MA, EPM, PROD-MGMT) immediately after `B1-M1` lands, (b) wait for the full leadership-tier wave (GTM-PLAN plus SALES-PERF plus REV-INTEL plus ACCT-PLAN plus PRM) to settle and then run all bilateral diffs in one campaign, (c) only run the highest-priority pair (GTM-PLAN to SALES-PERF, since territory drafts hand off cleanly). Independent of Bucket 3 except in the LAUNCH-ORCH relocation case.

### Bucket 3, Phase 0 pending (speculative)

| # | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| 1 | PMM (Product Marketing Management) as its own domain, absorbing GTM-PLAN's LAUNCH-ORCHESTRATION capability | Klue, Crayon (competitive intelligence pure-plays), Aha! Roadmaps Create (PMM-flavored launch planning), Highspot, Showpad, Seismic (sales enablement that PMM owns the content for), Pendo Adopt, Reprise. The buyer (PMM lead) is distinct from Sales Ops / RevOps. Already queued at mention count 2 after this audit. | Phase 0 against Klue and Crayon competitive intelligence schemas, Aha! launch templates, Highspot sales enablement entities; confirm vendor consensus on the entity surface (launches, positioning, messaging, win-loss interviews, persona-management) and whether GTM-PLAN's LAUNCH-ORCH cleanly relocates. |
| 2 | ABM-PLATFORM as its own domain, absorbing GTM-PLAN's MARKET-SEGMENTATION and ACCOUNT-SCORING capabilities | Demandbase, 6sense, RollWorks, Madison Logic, Terminus, Mutiny. Buyer is Marketing Ops; the engagement-side (ads, web personalization, intent-data orchestration) is distinct from the planning-side (ICP modeling, target account list authoring) that GTM-PLAN owns. Newly queued by this audit at mention count 1. | Phase 0 against Demandbase platform docs, 6sense Revenue AI schema, RollWorks ABM entity model; test whether ICP and account-list authoring sit on the GTM-PLAN side or the ABM-PLATFORM side. The defensible cut is: GTM-PLAN authors ICPs and named account lists once per planning cycle; ABM-PLATFORM ingests those lists and runs engagement (intent scoring, ad targeting, web personalization). If verified, GTM-PLAN keeps ICP and target_account_lists masters, ABM-PLATFORM masters account_scores and intent-data orchestration. |
| 3 | SALES-PLANNING-PLATFORM as its own domain, absorbing GTM-PLAN's TERRITORY-CARVING-PLAN, QUOTA-related, GTM-CAPACITY-PLANNING, and GTM-SCENARIO-MODELING capabilities | Anaplan Sales Planning, Pigment, Board, Fullcast, Salesforce Sales Planning, Varicent. Already queued at mention count 2 (SALES-PERF plus GTM-PLAN). The platform-market test is whether these vendors compete on a buyer (RevOps Strategy lead) distinct from both SALES-PERF's commissions buyer and GTM-PLAN's cross-functional Sales-Ops buyer. Gartner has begun calling out "Sales Planning Platforms" as a category in 2024 to 2025; the call is whether to follow. | Phase 0 against Anaplan Sales Planning vs Pigment vs Fullcast docs, plus the Salesforce native Sales Planning surface; test whether the planning surface and the commission surface have one buyer or two. If two, promote SALES-PLANNING-PLATFORM, relocate the heavy planning capabilities from GTM-PLAN (potentially leaving only LAUNCH-ORCH plus CHANNEL-MIX which then become PMM / Marketing surfaces). This is the most consequential Bucket 3 item: if SALES-PLANNING-PLATFORM is promoted, GTM-PLAN may shrink to a thin Sales-Ops shell or merge into the new platform. |
| 4 | Channel-mix-planning as a sales-ops-owned vs marketing-ops-owned vs cross-functional concern | Anaplan and Pigment model channel-mix inline with plan modeling (sales-ops view); Demandbase and 6sense model it as ABM-platform engagement allocation (marketing-ops view); HubSpot Marketing Hub and Salesforce Marketing Cloud Account Engagement (formerly Pardot) carry channel-mix as part of marketing-automation budget allocation. No clean pure-play. | Phase 0 against Anaplan plus Demandbase plus HubSpot for channel-mix entity shape; decide whether `CHANNEL-MIX-PLANNING` stays in GTM-PLAN, relocates to MA, or splits across both. Less urgent than candidates 1 to 3. |

### Cross-bucket dependencies

- `B1-A1` (catalog UX drafts) is independent of all other items and can land first. The drafted prose is hedged broad enough to survive `B2-D1`'s potential narrowing once `B2-S1` and `B2-S2` resolve.
- `B1-M1` (8 modules) is the load-bearing decision: it gates `B1-V1` through `B1-V4` (master loads), every B-band-and-below check, all Pass 4 pairwise work, and the F-band's positive-existence checks. It is also informed by `B2-M1` (which module shape), `B2-S1` (PMM relocation), `B2-S2` (ABM-PLATFORM relocation), and Bucket 3 candidates #1, #2, #3. If any of those promote-as-domain decisions land, the module set authored under `B1-M1` shrinks.
- `B2-M1` (modularization shape) is mutually informed by `B2-S1`, `B2-S2`, and Bucket 3 candidates #1, #2, #3. Resolve those first; `B2-M1`'s module count drops as candidates promote.
- `B2-C1` (RACI overrides) is independent of `B1-M1` but informed by `B2-S1` (if PMM is promoted, LAUNCH-ORCH override becomes moot since the capability leaves GTM-PLAN entirely).
- `B2-R1` (regulations) is independent of all other items.
- `B2-D1` (description rewrite) is downstream of `B2-S1`, `B2-S2`, and `B2-M1`. Wait until those settle.
- `B2-P1` (pairwise timing) is independent of the module decisions but blocked on `B1-M1` plus the leadership-tier neighbors also modularizing.
- Bucket 3 candidates 1 and 2 are independent of each other; both inform `B2-S1` / `B2-S2` and `B2-M1`.
- Bucket 3 candidate 3 (SALES-PLANNING-PLATFORM) has the largest blast radius: if promoted, it pulls 4 of GTM-PLAN's 8 capabilities out, potentially leaving GTM-PLAN as a thin Sales-Ops planning shell. Decide before `B1-M1` if the user is inclined to promote.

### Per-bucket prompts

**After Bucket 1 (6 items: 2 STRUCTURAL surfaces with drafts ready, plus 4 MISSING-candidate placeholders gated on `B1-M1`):**

> Bucket 1 has 6 surfaces: `B1-A1` (catalog UX drafts, can apply now after user reviews the wording), `B1-M1` (8 modules per the proposed shape, blocking everything else, but conditioned on `B2-M1` and the Bucket 3 promote-as-domain calls), `B1-V1` through `B1-V4` (top 4 missing masters, must follow `B1-M1` plus `B2-M1`). Fix these now? Reply 'all' (drives `B1-M1` with the 8-module shape and the 4 masters, plus the UX-fields draft), 'just A1' (UX drafts only, no module decisions yet), 'just M1 with shape X' (where X is 8 / 5 / 3 per `B2-M1`), or 'skip until Bucket 2 and Bucket 3 resolve'.

**After Bucket 2 (7 items):**

> Bucket 2 has 7 judgment calls: B2-M1 (which module shape: 8 / 5 / 3, conditioned on the Bucket 3 promote calls), B2-C1 (RACI overrides on LAUNCH-ORCH and CHANNEL-MIX), B2-R1 (which regulations, if any), B2-S1 (promote PMM and relocate LAUNCH-ORCH), B2-S2 (promote ABM-PLATFORM and relocate ICP plus ACCOUNT-TARGETING), B2-D1 (rewrite domain description after S1 and S2 settle), B2-P1 (when to schedule pairwise reconciliation). What is your call on each? I will wait for your decision per item before acting. Consider resolving B2-S1, B2-S2, and Bucket 3 candidate #3 together since they jointly rewrite the module set.

**After Bucket 3 (4 items):**

> Bucket 3 has 4 candidates. Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed. Candidate #1 (PMM) is at mention count 2 already; candidate #2 (ABM-PLATFORM) is at mention count 1 (queued by this audit); candidate #3 (SALES-PLANNING-PLATFORM) is at mention count 2 already and is the most consequential, potentially pulling 4 of 8 GTM-PLAN capabilities out. Candidate #4 (channel-mix scope) is the least urgent.

### Report-only follow-ups (owed by other domains)

- **PROD-MGMT B9 owes outbound on `product.launch_scheduled` to GTM-PLAN.** Surfaces when PROD-MGMT is next validated (PROD-MGMT.md exists with a 2026-05-30 audit; this is not in its Report-only list yet, so a re-audit on PROD-MGMT would catch it once GTM-PLAN ships a LAUNCH-ORCH module). Today: cannot author because GTM-PLAN has no master to point at.
- **CRM B9 owes outbound on `account.tier_changed` and `account.created` to GTM-PLAN.** Already partially modeled (handoff 203 fires `account.tier_changed` from CRM to SALES-PERF; the GTM-PLAN consumer side is missing). Surfaces when CRM is next validated. Today: blocked on GTM-PLAN modularization.
- **EPM B9 owes outbound on `forecast.published` and `budget.locked` to GTM-PLAN.** Surfaces when EPM is next validated. EPM.md exists; this is not in its Report-only list yet.
- **SALES-PERF B9 candidate (the symmetric `data_object_relationships` row for the future plan-to-execution handoff):** when GTM-PLAN masters `territories_proposed` and `quotas_proposed`, SALES-PERF should carry a relationship `territories_proposed materializes_to territories` (or the inverse). Today: cannot author because GTM-PLAN has no master. Will surface on the next SALES-PERF audit pass.
- **ACCT-PLAN M-band cross-check (informational):** ACCT-PLAN is a leadership-tier domain at id 105 with its own unmodularized state. The GTM-PLAN to ACCT-PLAN edge (target_account_lists overlapping strategic account lists) will only land when both sides modularize. Routine, not a blocker.
- **PMM as a candidate domain** (mention count 2 after this audit's bump). If promoted, GTM-PLAN's LAUNCH-ORCHESTRATION capability and the proposed `GTM-PLAN-LAUNCH-ORCH` module relocate. Surfaces in the next PMM triage decision.
- **ABM-PLATFORM as a candidate domain** (mention count 1, newly queued by this audit). If promoted, GTM-PLAN's MARKET-SEGMENTATION and ACCOUNT-SCORING capabilities and the proposed `GTM-PLAN-ICP-SEGMENT` plus `GTM-PLAN-ACCOUNT-TARGETING` modules relocate. Surfaces in the next ABM-PLATFORM triage decision.
- **SALES-PLANNING-PLATFORM as a candidate domain** (mention count 2 after this audit's bump). If promoted, GTM-PLAN's TERRITORY-CARVING-PLAN, GTM-CAPACITY-PLANNING, and GTM-SCENARIO-MODELING capabilities and the proposed `GTM-PLAN-TERRITORY`, `GTM-PLAN-CAPACITY`, `GTM-PLAN-SCENARIO` modules relocate. The largest blast radius of any candidate; surfaces in the next SALES-PLANNING-PLATFORM triage decision.

## 2026-05-31, Continuation: B1 technical fixes

### Triage

The B1 surface in the 2026-05-30 audit lists 6 in-scope items (`B1-A1`, `B1-M1`, `B1-V1`, `B1-V2`, `B1-V3`, `B1-V4`). Classified against the truly-technical vs deferred criteria for this continuation pass, every item is deferred. The domain has 0 masters, 0 modules, 0 handoffs in either direction, 0 trigger_events, 0 lifecycle_states, 0 system skills, 0 roles, 0 `domain_regulations`, 0 `domain_aliases`. Live state was re-verified (`/domain_modules?domain_id=eq.104`, `/handoffs?or=(source_domain_id.eq.104,target_domain_id.eq.104)`, `/domain_data_objects?domain_id=eq.104`, `/domain_regulations?domain_id=eq.104` all return `[]`). With no masters and no modules, none of the technical fix categories (enum backfills, B10b FK backfills on existing handoff rows, naming-convention renames, `data_object_relationships` user-edges, `permission_verb_override`, `handoff_processes` APQC tagging) has any source rows to act on, and the audit pre-specifies none of them anyway.

### Fixes applied

| B1 ID | Action | Row counts |
|---|---|---|
| (none) | No technical fixes applied. | 0 inserts / 0 PATCHes / 0 deletes |

### Deferred B1 items

| B1 ID | Why deferred |
|---|---|
| B1-A1 | `catalog_tagline` and `catalog_description` writes are explicitly excluded from technical-fix scope (Rule #20: drafts require user approval before PATCH). |
| B1-M1 | New `domain_modules` rows are explicitly excluded from technical-fix scope. Also gated on `B2-M1` (which of 8 / 5 / 3-module shape), `B2-S1` (PMM promotion), `B2-S2` (ABM-PLATFORM promotion), and Bucket 3 candidates 1, 2, 3 (any of which would shrink the module set). |
| B1-V1 | `gtm_plans` master: new `data_objects` / `domain_module_data_objects` masters are excluded from technical-fix scope and gated on `B1-M1`. |
| B1-V2 | `ideal_customer_profiles` master: same as B1-V1; additionally gated on `B2-S2` / Bucket 3 candidate 2 (ABM-PLATFORM may take the ICP surface). |
| B1-V3 | `target_account_lists` master: same as B1-V1; additionally gated on `B2-S2` / Bucket 3 candidate 2 (ABM-PLATFORM may take this surface). |
| B1-V4 | `capacity_models` master: same as B1-V1; additionally gated on Bucket 3 candidate 3 (SALES-PLANNING-PLATFORM may take the planning-core surface). |

### UI spot-checks

No writes were applied, so no spot-check links are warranted. For reference, the canonical paths once `B1-M1` lands will be:

- https://tests.semantius.app/domain_map/domain_modules
- https://tests.semantius.app/domain_map/domain_data_objects
- https://tests.semantius.app/domain_map/domains

### Loader

No loader written. The pass intentionally ended at the triage step because the B1 surface contains no technical action items for this domain.

## 2026-05-31, Audit

### Summary

- Current footprint: 0 entities, 0 modules, 8 capabilities, 7 solutions (4 primary, 3 secondary), 0 regulations, 0 trigger_events, 0 outbound handoffs, 0 inbound handoffs, 0 system skills, 0 roles, 0 `domain_data_objects` rows, 0 `domain_module_data_objects` rows, 0 `domain_module_host_domains` rows, 0 lifecycle states.
- Re-verified live: `/domain_modules?domain_id=eq.104`, `/domain_data_objects?domain_id=eq.104`, `/handoffs?or=(source_domain_id.eq.104,target_domain_id.eq.104)`, `/trigger_events?domain_id=eq.104`, `/domain_regulations?domain_id=eq.104`, `/skills?domain_id=eq.104`, `/domain_module_host_domains?domain_id=eq.104` all return `[]`. Domain metadata: id=104, A1 passes; `catalog_tagline` and `catalog_description` are both empty strings.
- Schema_version 2 first-run pass. State has not changed since the 2026-05-30 Validate b1 (full 4-pass) audit and the 2026-05-31 technical-fix continuation. Findings carry forward, scoped to the schema v2 bucket model.
- Bucket 1 (in-scope, agent fixable): 6 items (1 A-band catalog UX draft pending user approval; 1 M-band module-author task gated on B2 / B3 decisions; 4 master-load placeholders gated on `B1-M1`).
- Bucket 2 (surface-for-user, judgment): 7 items (modularization shape, RACI overrides, regulations, PMM promotion, ABM-PLATFORM promotion, description rewrite, pairwise timing).
- Bucket 3 (Phase 0 pending, speculative): 4 items (PMM, ABM-PLATFORM, SALES-PLANNING-PLATFORM, channel-mix scope).

### Vendor surface basis

No new vendor research this pass. Carries the 2026-05-30 surface: 4 pure-play planning vendors (Anaplan Sales Planning, Pigment, Fullcast, Salesforce Sales Planning), 3 financial-planning-tier adjacents (Board, Varicent Plan, Xactly Plan), ABM tier (Demandbase, 6sense, RollWorks, Madison Logic, Terminus), PMM-flavored launch tier (Klue, Crayon, Aha! Roadmaps Create, Highspot, Seismic). Compliance specialists do not apply, the planning shell carries no statutory anchor of its own; regulation exposure is downstream when the plan lands in CRM / MA.

### Structural pass (re-verified, deltas only)

- **A1.** Pass. All 7 business-meaningful columns populated within enum bands.
- **A2.** Pass, 8 capabilities (corrected count from 2026-05-30 Summary).
- **A3.** Pass, 7 solutions with `coverage_level` set, 4 primary.
- **A4.** FAIL. Both `catalog_tagline` and `catalog_description` are empty strings. Carries forward as `B1A-A1` (drafts ready, pending user approval per Rule #20).
- **M1 / M2 / M4.** FAIL. Zero `domain_modules`, 8 orphan capabilities. Rule #14 obliges at least 1 full module; with 8 capabilities, at least 2 full modules. Carries forward as `B1A-M1`.
- **B-band (B1 / B5 / B7 / B9 / B9b / B10b / B11 / B12).** B1 vacuous under the leadership-tier exemption (GTM-PLAN is on the explicit exemption list). B5, B7, B9, B9b, B10b, B11, B12 all vacuous, gated on `B1A-M1` and at least one master.
- **B10 inbound handoffs (report-only).** Zero rows. Anomalous for a planning hub. Report-only follow-ups owed by PROD-MGMT (`product.launch_scheduled`), CRM (`account.tier_changed`, `account.created`), EPM (`forecast.published`, `budget.locked`), and SALES-PERF (symmetric `data_object_relationships`) carry forward unchanged.
- **C1.** Pass. Owner Sales Operations, contributors Marketing and Product Management.
- **C2.** No capability-level RACI overrides. LAUNCH-ORCHESTRATION (PMM candidate) and CHANNEL-MIX-PLANNING (Marketing candidate) flagged for user judgment as `B2-C1`.
- **D1.** Deferred until after fix loads.
- **E1 through E5.** Vacuous (no modules, no role-modules surface). Becomes applicable once `B1A-M1` lands.
- **F1 through F5.** Vacuous. Once at least 2 modules ship, each requires exactly one `skill_type='system'` skill with at least 1 `skill_tools` row (Rule #17), and `operation_kind` invariants must hold. All blocked on `B1A-M1`.
- **H-band, APQC coverage.** Vacuous (0 handoffs). Volume target 0.5N to 0.8N is satisfied vacuously at N=0. Becomes a real surface once `B1A-M1` lands and the outbound handoffs to SALES-PERF / CRM / MA / EPM are authored.

### Bucket 1, In-scope confirmed gaps

Counts by finding type:

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 4 (V1 through V4, all gated on M1) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A / M band failures) | 2 (A1 catalog UX, M1 module author) |
| BOUNDARY | 0 (Pass 4 pairwise blocked on M1 plus neighbor modularization) |
| APQC TAGGING | 0 (vacuous, N=0 handoffs) |
| MODULARIZATION ISSUES | 0 in Bucket 1 (routes to Bucket 2 `B2-M1`) |

All 6 items map to the same b1a / b1b structure carried from the 2026-05-30 audit, none has been resolved since. `B1A-A1` is the only item independent of every other decision (drafts hedged broad enough to survive a later narrowing). `B1A-M1` is the load-bearing decision that gates V1 through V4 and every downstream band.

### Bucket 2, Surface-for-user (judgment calls)

Seven items carry forward unchanged from the 2026-05-30 audit: B2-M1 (8 / 5 / 3 module shape), B2-C1 (RACI overrides on LAUNCH-ORCH and CHANNEL-MIX), B2-R1 (regulation coverage), B2-S1 (promote PMM and relocate LAUNCH-ORCH), B2-S2 (promote ABM-PLATFORM and relocate ICP plus ACCOUNT-TARGETING), B2-D1 (rewrite description after S1 / S2 settle), B2-P1 (pairwise reconciliation timing).

### Bucket 3, Phase 0 pending (speculative)

Four candidates carry forward: PMM (mention count 2), ABM-PLATFORM (mention count 1), SALES-PLANNING-PLATFORM (mention count 2, the largest blast radius, potentially pulling 4 of 8 capabilities out of GTM-PLAN), channel-mix-planning scope.

### Cross-bucket dependencies

- `B1A-A1` is independent and may land first.
- `B1A-M1` is informed by `B2-M1`, `B2-S1`, `B2-S2`, and Bucket 3 candidates 1, 2, 3. Any "promote as domain" call shrinks the module set.
- `B2-M1`, `B2-S1`, `B2-S2`, `B2-D1` are mutually informed and should be resolved together.
- `B2-R1` is independent.
- `B2-P1` is blocked on `B1A-M1` plus the leadership-tier neighbors modularizing.
- `B1B-V1` through `B1B-V4` blocked on `B1A-M1` plus their respective Bucket 2 / Bucket 3 promotion outcomes.

### Decisions

None this pass. The audit is a structural re-verification, no user decisions were requested or supplied.

### Fixes applied

None. The pass surfaces the carry-forward state without applying any writes, mirroring the 2026-05-31 continuation triage.

### Files written

- `audits/GTM-PLAN/history.md` (this section appended)
- `audits/GTM-PLAN/state.yaml` (rewritten schema_version 2)

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

### Summary

State-driven Validate (Rule #21) over GTM-PLAN's open state items only; no fresh from-scratch
audit. Live re-verify (`/domains?domain_code=eq.GTM-PLAN`, `/domain_modules?domain_id=eq.104`,
`/capability_domains?domain_id=eq.104`, `/domain_module_data_objects`, `/domain_data_objects`,
`/business_function_domains?domain_id=eq.104`, `/handoffs?or=(...)`, `/domain_regulations`,
`/domain_aliases`, `/skills`) confirms GTM-PLAN (id 104) is still fully UNBUILT: 0 domain_modules,
0 masters in either junction, 0 handoffs in either direction, 0 trigger_events, 0 skills,
0 domain_regulations, 0 domain_aliases, 8 capability_domains (capability ids 104-111).
business_function_domains (C1) is already complete: owner Sales Operations (bf 52), contributors
Marketing (bf 22) and Product Management (bf 25), all at record_status='new'. The overlay test
holds (B1A-RECLASS): GTM-PLAN is master-bearing and needs a full build, not a scaffold. Per the
unbuilt-domain rule, the build is surfaced and the cascade left; no interim module set was
scaffolded ahead of the b2 / b3 shape and promotion decisions.

### Executed

| Item | Action | Rows |
|---|---|---|
| B1B-A1 (catalog UX) | PATCH `/domains?id=eq.104`: backfilled the two empty fields `catalog_tagline` and `catalog_description` with buyer-voice copy (workflow plus value, no vendor names, no em-dash, American English). The "surface-before-write" gate was the stale Rule #20 gate the state-driven contract instructs to ignore for empty fields. record_status stayed 'new'; no non-empty value overwritten. | 1 PATCH |

No other executable surface existed: entity_type PATCH (0 masters), APQC handoff tags (0 handoffs),
aliases (0 masters, none enumerated), business_function_domains (already complete), intra-domain
handoffs / NULL module-FK backfills / event_category backfills (no module or trigger rows) all N/A
on an unbuilt domain.

Loader: `.tmp_deploy/2026-06-07_gtm_plan_catalog_ux.ts` (idempotent: GETs the row, PATCHes only
empty fields, guards against em-dash).

### Surfaced (for user; not written)

- **B2-M1** (module shape: 8 per-capability vs 5-module consolidation vs 3-module collapse). Gates the build.
- **B2-C1** (capability RACI overrides: LAUNCH-ORCH to Product Management, CHANNEL-MIX to Marketing, vs leave inherited under Sales Ops).
- **B2-R1** (regulations: none vs GDPR vs GDPR+CCPA vs GDPR+CCPA+SOX).
- **B2-S1** (promote PMM, relocate LAUNCH-ORCH).
- **B2-S2** (promote ABM-PLATFORM, relocate ICP-SEGMENT and ACCOUNT-TARGETING).
- **B2-D1** (rewrite domains.description, deferred until B2-S1 / B2-S2 settle).
- **B2-P1** (pairwise reconciliation timing).
- **B1A-BUILD / B1B-M1** (the full build itself): unbuilt domain, surfaced not scaffolded; blocked on the b2 / b3 decisions above.
- Personas / RACI (Phase P): deferred, not authored. Candidate personas once the domain is built: Head of Sales Ops, Head of RevOps, Marketing Ops Lead, PMM Lead, Finance Partner.

### Left

- **B1B-V1 through B1B-V4** (gtm_plans, ideal_customer_profiles, target_account_lists, capacity_models masters): blocked on B1B-M1 (the build) plus their respective b2 / b3 promotion outcomes.
- **B3-PMM, B3-ABM-PLATFORM, B3-SALES-PLANNING-PLATFORM, B3-CHANNEL-MIX-SCOPE**: backlog candidates (Phase 0 pending), non-blocking ideas.
- Supersession header (2026-06-06 per-domain-skill restoration) preserved: no per-module skill authoring; the future build gives GTM-PLAN exactly one domain-grain system skill and no per-FULL-module skills.

### UI links

- https://tests.semantius.app/domain_map/domains (the PATCHed catalog UX row, id 104)

## 2026-06-13 - Audit (state-driven execute: B9d + Phase 0 forcing step)

### Summary

State-driven Validate (Rule #21) over GTM-PLAN's open agent-executable surface. Live re-verify
(`/domains?domain_code=eq.GTM-PLAN`, `/domain_modules?domain_id=eq.104`,
`/handoffs?or=(source_domain_id.eq.104,target_domain_id.eq.104)`) confirms GTM-PLAN (id 104) is
still fully UNBUILT: 0 domain_modules, 0 masters, 0 handoffs in either direction. Catalog UX
(tagline + description) is populated and untouched. Two agent-executable items were outstanding:
B1A-B9D-VERIFY (run B9d) and the Rule #22 forcing step (Phase 0 must run before the market-shape
q-file is surfaced). Both executed this pass; no catalog writes (unbuilt domain).

### Executed

| Item | Action | Result |
|---|---|---|
| B1A-B9D-VERIFY | Ran `scripts/analytics/b9d_resolver.ts GTM-PLAN` (dry-run then --write), both directions. | 0 boundary tags, 0 (process,owner) findings, 0 owner-file edits. B9d passes vacuously (0 handoffs on any boundary). Item resolved; removed from state.yaml. |
| Rule #22 Phase 0 | Ran Phase 0 vendor-surface research (general-purpose subagent); saved `.tmp_deploy/GTM-PLAN-phase0-2026-06-13.md` (flagship-vendor table, union surface matrix, modularization hypothesis, per-decision verdicts D1-D5). | Fresh evidence CONTRADICTED three q-file recommendations; reversed them (Rule #22 "fresh evidence wins") and regenerated `q-GTM-PLAN.md`. |

### Phase 0 verdicts (now driving the q-file recommendations)

- **D1 / B2-M1 (module shape): 5 modules**, reversing the prior "8". Anaplan ships discrete apps
  (Account Segmentation; Territory and Quota; Sales Capacity; Crediting; Incentive Comp), proving
  territory+quota are one surface and capacity another, but does NOT split segmentation/ICP/scoring
  into three products; Salesforce Sales Planning and Fullcast collapse further. 8 over-splits,
  3 under-splits. Recommended shape: PLANNING-CORE + TERRITORY-QUOTA + CAPACITY + SCENARIO +
  EXEC-HANDOFF (channel-mix and launch-orch decided by B3-CHANNEL-MIX-SCOPE and B2-S1).
- **D2 / B2-S1 (PMM): promote, relocate LAUNCH-ORCH.** No GTM-planning vendor masters launch plans /
  milestones / checklists / battlecards; Klue, Crayon, Aha! do, with a distinct PMM/PM buyer.
- **D3 / B2-S2 (ABM-PLATFORM): promote as downstream engagement consumer; keep ICP + target lists +
  planning-grade scoring in GTM-PLAN.** Demandbase / 6sense differentiate on intent / ad targeting /
  web personalization (engagement-only); the planning side is native to the GTM planners too.
- **D4 / B3-SALES-PLANNING-PLATFORM: do NOT promote**, reversing the prior promote-leaning stance.
  The Gartner "Sales Planning Platforms" category could not be verified (territory/quota live inside
  the SPM Market Guide; Anaplan sits in xP&A). Keep TERRITORY / CAPACITY / SCENARIO in GTM-PLAN.
- **D5 / B3-CHANNEL-MIX-SCOPE: split.** Keep the strategic channel-mix master in GTM-PLAN; relocate
  paid-media / campaign budget allocation downstream to MA / ABM-PLATFORM.
- **Compliance / B2-R1: none.** GTM-PLAN masters cohort-level data, not contact-level PII; the
  GDPR/CCPA-triggering intent surface lives downstream in Demandbase / 6sense (ABM-PLATFORM).

### Left (all user decisions; nothing agent-executable remains)

- B2-M1, B2-C1, B2-R1, B2-S1, B2-S2, B2-D1, B2-P1: the build (B1A-BUILD / B1B-M1, B1B-V1..V4) is
  gated on these. q-GTM-PLAN.md surfaces all of them with Phase-0-grounded recommendations.
- B3-PMM, B3-ABM-PLATFORM, B3-SALES-PLANNING-PLATFORM, B3-CHANNEL-MIX-SCOPE: Phase 0 now executed on
  all four; surfaced as q8 / q9 (the two non-blocking ones) with verdicts. PMM and ABM-PLATFORM
  ride their B2-S1 / B2-S2 twins.
- B1A-RECLASS: classification settled (master-bearing), recorded only; the build is B1B-M1.

### Files written

- `audits/GTM-PLAN/q-GTM-PLAN.md` (regenerated from Phase 0 evidence; q1/q8 recommendations reversed)
- `audits/GTM-PLAN/state.yaml` (removed resolved B1A-B9D-VERIFY; folded Phase 0 verdicts +
  recommended answers into B2-M1 / B2-R1 / B2-S1 / B2-S2 / B3-* via extra_phase0 / extra_recommended;
  next_action_by agent -> user; last_audit 2026-06-13)
- `audits/GTM-PLAN/history.md` (this section)
- `.tmp_deploy/GTM-PLAN-phase0-2026-06-13.md` (Phase 0 report, ephemeral)

### UI links

- https://tests.semantius.app/domain_map/domains (catalog UX row, id 104, unchanged this pass)
