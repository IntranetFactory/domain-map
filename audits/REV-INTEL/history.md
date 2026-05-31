# REV-INTEL audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 0 entities, 0 modules, 7 capabilities, 8 solutions (all primary), 0 regulations, 0 trigger_events authored as REV-INTEL-sourced, 2 outbound handoffs, 5 inbound handoffs, 0 system skills, 0 roles, 0 `domain_data_objects` rows, 0 `domain_module_data_objects` rows.
- Domain metadata: A1 passes (crud_percentage 35, business_logic populated, min_org_size `20 s <500`, cost_band `$$$`, usa_market_size_usd_m 1500, source year 2024). A4 fails: both `catalog_tagline` and `catalog_description` are empty.
- Leadership-tier domain (listed in SKILL.md B1 exception): masters are expected to be zero, but module count is not exempt under Rule #14. The whole M-band is failed and gates every B / E / F band.
- Vendor-surface basis: 6 pure-play conversation-intelligence and revenue-intelligence specialists (Gong, Clari, Chorus by ZoomInfo, People.ai, BoostUp.ai, Aviso AI); 1 CRM-suite incumbent (Salesforce Einstein Conversation Insights); 1 sales-analytics adjacency (Atrium). All 8 solutions are coverage_level `primary`.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.
- Candidates queued to `audits/_missing-domains.md`: 0 (no new candidate domains surfaced; the closest adjacency, sales enablement, is already queued by other audits and conversation-intelligence vs revenue-intelligence is a within-domain modularization question, not a domain candidate).

Structural pass: A1 passes, A2 passes (7 capabilities), A3 passes (8 solutions with coverage_level set, all primary), A4 FAILS (empty catalog UX fields). M-band FAILS catastrophically: zero modules. With no modules the entire B-band collapses (B1 exempt as leadership-tier, but B5/B6/B7/B8/B9/B11/B12 are all vacuous), C passes (owner=Sales Operations), E-band cannot apply (no modules, no 2-module floor), F-band cannot apply (no modules to anchor system skills against), H1 produces 7 cross-domain handoffs of which zero carry any tag.

Two structural anomalies surfaced beyond the usual M1 gap: (1) handoffs 207 and 528 share `trigger_event_id=167` (`deal_risk.escalated`) but point in opposite directions (REV-INTEL → CRM in row 207, CRM → REV-INTEL in row 528); per the semantics, REV-INTEL is the detector and CRM the consumer, so handoff 528 is mis-attributed. (2) `conversation_intelligence_records` (id 124) is mastered by SALES-ENG, but the REV-INTEL capability `CONVERSATION-INTEL` (id 97) is named after exactly that entity; this is a deep ownership question between SALES-ENG (engagement / recording surface) and REV-INTEL (analytics / insight surface).

### Vendor surface basis

The market is Revenue Intelligence, a recognized point-solution category since roughly 2018 (Gong was the canonical entrant). Pure-play specialists chosen over diversified suites: Gong (Gartner Leader, category-defining conversation intelligence + deal intelligence), Clari (Gartner Leader, revenue cadence and forecast accuracy, recent Wingman acquisition added conversation intel), Chorus by ZoomInfo (formerly Chorus.ai, conversation intelligence + deal warnings, acquired into ZoomInfo's go-to-market suite), People.ai (auto-activity-capture pioneer, deep CRM hygiene plus account intelligence), BoostUp.ai (forecasting and deal-risk specialist, ML-first), Aviso AI (forecasting and pipeline science, finance-grade roll-ups). CRM-suite incumbent: Salesforce Einstein Conversation Insights (folded into Sales Cloud, lower coverage but installed base). Adjacent: Atrium (sales activity analytics, mid-market simplicity). All vendors agree on the core entity surface: call recordings, transcripts, deal-risk scores, forecast snapshots, pipeline-stage diagnostics, rep activity rolls, opportunity coaching alerts. Gong and Clari diverge on whether the deal-management surface (next-step recommendations, deal rooms) sits in revenue intelligence or stays in CRM.

### Pass 1, Structural sweep

#### S1, Direct FKs to `domains` for REV-INTEL (id 103)

| Table | FK column | REV-INTEL rows | Expected non-zero? |
| --- | --- | --- | --- |
| `business_function_domains` | `domain_id` | 1 (owner Sales Operations) | yes, pass |
| `capability_domains` | `domain_id` | 7 | yes, pass |
| `domain_data_objects` | `domain_id` | 0 | exempt (leadership-tier) |
| `domain_modules` | `domain_id` | 0 | yes, FAIL (Rule #14 M1) |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero, OK |
| `domain_regulations` | `domain_id` | 0 | optional, see Bucket 2 |
| `handoffs.source_domain_id` | source | 2 | yes for non-leaf, partial pass |
| `handoffs.target_domain_id` | target | 5 | yes for non-leadership, passes informationally |
| `skills` | `domain_id` | 0 | yes (Rule #17 F2), FAIL once modules exist; vacuous until then |
| `solution_domains` | `domain_id` | 8 | yes, pass |
| `domains.parent_domain_id` | self | NULL | routinely zero, OK |

#### S2, Per-module coverage

Vacuous (zero modules).

#### S3, Per-master indirect-table coverage

Vacuous (zero masters; B1 exemption).

#### A-band

- **A1, domains metadata.** Pass. All 7 business-meaningful columns populated and within enum bands (crud_percentage 35 reflects the ML-heavy nature of the market).
- **A2, capabilities linked.** Pass. 7 capabilities: `CONVERSATION-INTEL`, `DEAL-SCORING`, `REVENUE-FORECASTING`, `PIPELINE-INSPECTION`, `COACHING-CALL-REVIEW`, `ACTIVITY-CAPTURE`, `MARKET-SIGNAL-EXTRACTION`.
- **A3, solutions linked.** Pass. 8 solutions, all with coverage_level set, all primary.
- **A4, catalog UX fields.** FAIL. Both `catalog_tagline` and `catalog_description` are empty strings. See Bucket 1 `B1-A1`.
- **A5, vendor ownership refresh.** Skipped (opt-in, not requested). Worth noting: Chorus by ZoomInfo (formerly Chorus.ai) is correctly named in the catalog as a ZoomInfo-vended solution.

#### M-band

- **M1, ≥1 `domain_modules` row.** FAIL. Zero rows. Leadership-tier domains still require ≥1 module per Rule #14 (the rule has no leadership-tier exemption; only B1 carries one). See Bucket 1 `B1-M1`.
- **M2, ≥3 capabilities implies ≥2 modules.** Implicitly FAIL (7 capabilities, 0 modules). Resolved by `B1-M1`.
- **M4, every capability has ≥1 realizing module.** FAIL by construction (no modules to realize anything). All 7 capabilities are orphans pending `B1-M1`.
- **M5, lifecycle states have `domain_module_id` when module-scoped.** Vacuous.
- **M6, every module realizes ≥1 capability.** Vacuous.
- **M7, single-master and within-domain coherence.** Vacuous internally, but the catalog-wide single-master rule surfaces a cross-domain question: SALES-ENG masters `conversation_intelligence_records` (id 124), which is the headline entity for REV-INTEL's `CONVERSATION-INTEL` capability. See Bucket 2 `B2-O1` for the wrong-ownership decision.

#### B-band

- **B1, ≥1 master.** Vacuous (leadership-tier exemption per SKILL.md).
- **B2 through B7.** Vacuous (zero masters).
- **B8 outbound `data_object_relationships`.** Vacuous.
- **B9 outbound `trigger_events` and `handoffs`.** REV-INTEL publishes 2 outbound handoffs (207 to CRM, 208 to SALES-PERF) but owns zero `trigger_events` rows: the events fire on payloads (`crm_opportunities`) mastered by CRM, so the events live with CRM by the Phase D rule (one event per publisher's master). This is structurally consistent but it means REV-INTEL has no event vocabulary of its own. Bucket 2 `B2-T1` raises the question of whether REV-INTEL should master analytics-side events (`deal_risk.score_changed`, `forecast.recalculated`, `coaching_alert.fired`) with their own data_objects (`deal_risk_scores`, `revenue_forecasts`, `coaching_alerts`).
- **B9b intra-domain cross-module handoffs.** Vacuous (zero modules, no cross-module surface).
- **B10 inbound handoffs (report only).** 5 rows. Listed in Pass 4; no fix from this domain's pass.
- **B10b per-module attribution on `handoffs`.** Outbound query returns 2 rows with `source_domain_module_id=NULL` because REV-INTEL has zero modules. Inbound query returns 5 rows with `target_domain_module_id=NULL` for the same reason. The fix is upstream: load modules first (`B1-M1`), then re-run the B10b backfill. See Bucket 1 `B1-S1`.
- **B11, aliases for non-self-explanatory masters.** Vacuous.
- **B12, lifecycle states.** Vacuous.

#### C-band

- **C1, ≥1 `business_function_domains` owner.** Pass. Owner = Sales Operations. No contributors or consumers loaded. Worth noting: the buyer is increasingly RevOps (a distinct function from Sales Ops) at larger orgs; this is a function-spine question, not a domain-audit blocker. See Bucket 2 `B2-C1`.
- **C2, capability-level RACI overrides.** No override rows found. Acceptable: the 7 capabilities all sit cleanly with Sales Operations. `COACHING-CALL-REVIEW` arguably has a Sales Enablement / L&D overlap (the coach reviewing calls is often an enablement role, not a Sales Ops role); whether that warrants an override goes to Bucket 2.

#### D-band

- **D1, UI spot-check.** Deferred until after fix loads land.

#### E-band

Vacuous: no modules, no role-modules surface, no role authoring possible. Will become applicable once `B1-M1` resolves and at least 2 modules ship. Note: `SALES-OPS` exists as a role (id 10017, business_function_id 21); no `REVOPS` or `REVENUE-INTELLIGENCE-ANALYST` role found.

#### F-band

Vacuous: no modules and zero system skills. Will become applicable once `B1-M1` resolves; Rule #17 requires exactly one `skill_type='system'` skill per `domain_modules` row.

#### H-band, APQC coverage

7 cross-domain handoffs (2 outbound + 5 inbound). Zero `handoff_processes` rows exist for any of the 7 handoffs. Volume target per the H-band rule (0.5N to 0.8N agent_curated proposals where N=7) suggests 4 to 6 new agent_curated rows from this audit. Per the asymmetry rule, for inbound handoffs the substantive PCF activity is the source-domain's publishing process; REV-INTEL can still author consumer-side tags where the consumer activity has a clean PCF match.

| handoff_id | direction | source → target | trigger_event | payload | Existing tag |
|---|---|---|---|---|---|
| 207 | outbound | REV-INTEL → CRM | deal_risk.escalated | crm_opportunities | (none) |
| 208 | outbound | REV-INTEL → SALES-PERF | pipeline_health.degraded | crm_opportunities | (none) |
| 201 | inbound | CRM → REV-INTEL | crm_opportunity.closed_lost | crm_opportunities | (none) |
| 473 | inbound | CRM → REV-INTEL | crm_opportunity.stage_changed | crm_opportunities | (none) |
| 528 | inbound | CRM → REV-INTEL | deal_risk.escalated | crm_opportunities | (none) |
| 477 | inbound | SALES-ENG → REV-INTEL | high_intent_signal.detected | crm_opportunities | (none) |
| 476 | inbound | SALES-ENG → REV-INTEL | conversation_intelligence.insight_published | conversation_intelligence_records | (none) |

Bucket 1 `B1-H1` proposes agent_curated tags for each. Handoff 528 is also flagged in Bucket 2 `B2-D1` as a duplicate-direction defect (the same trigger_event_id is used for both 207 and 528 going opposite ways).

### Pass 2, Market audit (semantic)

The Revenue Intelligence market has a recognizable union surface across Gong, Clari, Chorus, People.ai, BoostUp, Aviso, Einstein Conversation Insights, and Atrium. Headline entities:

**Master records (conversation side):**
- `call_recordings` (already mastered by SALES-ENG, id 122)
- `call_transcripts` (transcribed text, speaker-diarized)
- `conversation_intelligence_records` (already mastered by SALES-ENG, id 124 - the insight rollup per call/email)
- `conversation_topics` (extracted topic mentions: competitor, pricing, objection, next-step, churn risk)
- `conversation_action_items` (commitments and follow-ups extracted from conversations)

**Master records (deal-intelligence side):**
- `deal_risk_scores` (per-opportunity ML-derived risk grade with feature contributions)
- `deal_warnings` (named risk patterns: no-decision-maker, no-next-step, no-multi-thread)
- `deal_signals` (per-opportunity activity signal aggregates: response latency, sentiment drift)
- `opportunity_coaching_alerts` (rep-targeted alerts for one deal)
- `next_step_recommendations` (ML-suggested next actions per deal)

**Master records (forecast side):**
- `revenue_forecasts` (snapshot per period, per segment, per roll-up)
- `forecast_categories` (commit / best-case / pipeline / closed-won, vendor-specific)
- `forecast_submissions` (rep-submitted forecasts per period)
- `forecast_adjustments` (manager overrides with rationale)
- `forecast_accuracy_records` (historical actuals vs. submitted, used by ML)

**Master records (activity capture side):**
- `captured_activities` (auto-captured emails, calls, meetings, attached to opportunities and accounts)
- `activity_attribution_rules` (which activities count toward which opportunity)
- `engagement_scores` (per-account or per-contact rollup of activity intensity)
- `rep_activity_rolls` (per-rep period-aggregated activity counts and outcomes)

**Master records (coaching side):**
- `coaching_sessions` (1-on-1 reviews, often around a recorded call)
- `coaching_scorecards` (manager evaluation of a call against a scorecard rubric)
- `call_review_comments` (timestamped annotations on a recording)
- `playbook_compliance_records` (did the rep follow the talk-track on this call)

**Master records (market signal side, MARKET-SIGNAL-EXTRACTION):**
- `market_signals` (competitor mentions, pricing signals, churn-risk signals extracted across calls)
- `competitor_mentions` (specific competitor named in conversation, with context)
- `objection_records` (objection raised, by what category)

**Junctions, transitions, audit:**
- `forecast_submission_audit_trails`
- `deal_risk_score_history` (score-changed events feed CRM and SALES-PERF)
- `coaching_session_audit_trails`
- `activity_capture_audit_trails`

**Compliance / regulation:**
- `call_recording_consents` (GDPR/CCPA, two-party consent jurisdictions: California, all EU member states, Florida, Illinois, Maryland, Massachusetts, Montana, Nevada, New Hampshire, Pennsylvania, Washington, plus 11 more)
- `recording_retention_policies` (period of retention by jurisdiction)
- `pii_redaction_records` (audit of automated PII removal on transcripts)

**Configuration / templates:**
- `forecast_period_definitions` (per-segment fiscal calendars)
- `scoring_models` (ML model versions and training metadata)
- `coaching_rubrics` (talk-track templates, scorecards)
- `activity_attribution_models` (configurable rules for the auto-capture engine)

**Modularization hypothesis (proposed module set):**

| Module code | Scope | Capabilities |
|---|---|---|
| `REV-INTEL-CONVERSATION` | Call transcripts, conversation intelligence records, topics, action items, market signals, competitor mentions, objection records. Owns the ML rollup over recordings (but not the recordings themselves if `call_recordings` stays in SALES-ENG). | `CONVERSATION-INTEL`, `MARKET-SIGNAL-EXTRACTION` |
| `REV-INTEL-DEAL-SCORING` | Deal risk scores, deal warnings, deal signals, coaching alerts, next-step recommendations, score history. | `DEAL-SCORING` |
| `REV-INTEL-FORECAST` | Revenue forecasts, forecast categories, forecast submissions, adjustments, accuracy records, submission audit trails. | `REVENUE-FORECASTING` |
| `REV-INTEL-PIPELINE-INSPECTION` | Pipeline inspection dashboards, stage diagnostics, deal warnings rollup, pipeline-health derived signals. Distinct from DEAL-SCORING because it is the manager-level review surface, not the per-deal score primitive. | `PIPELINE-INSPECTION` |
| `REV-INTEL-COACHING` | Coaching sessions, scorecards, call review comments, playbook compliance, coaching rubrics. | `COACHING-CALL-REVIEW` |
| `REV-INTEL-ACTIVITY-CAPTURE` | Captured activities, activity attribution rules, engagement scores, rep activity rolls. Distinct from REV-INTEL-CONVERSATION because activity capture works without conversation intelligence (People.ai is the canonical activity-capture-only deployment). | `ACTIVITY-CAPTURE` |

6 modules cleanly map onto the 7 capabilities (CONVERSATION-INTEL and MARKET-SIGNAL-EXTRACTION pair under one module because both read from the same conversation corpus). The market split is reasonably canonical: Gong and Chorus group CONVERSATION + DEAL-SCORING + COACHING tightly; Clari and BoostUp separate FORECAST as a distinct product; People.ai is the canonical ACTIVITY-CAPTURE pure-play; Aviso emphasizes FORECAST and PIPELINE-INSPECTION.

**Findings categories:**

- **MISSING entities:** ALL surface entities listed above except `call_recordings` and `conversation_intelligence_records` (mastered by SALES-ENG). Since REV-INTEL has zero masters and zero modules, every other entity in the market surface is missing. This is the dominant finding type.
- **WRONG-OWNERSHIP:** SALES-ENG masters `conversation_intelligence_records` (id 124) and `call_recordings` (id 122). The capability `CONVERSATION-INTEL` is on REV-INTEL but the master sits in SALES-ENG. Two interpretations are plausible (recording-as-engagement-substrate vs. insight-as-analytics-substrate); both have flagship-vendor support. See Bucket 2 `B2-O1`.
- **SCOPE-CREEP:** N/A (no entities currently owned by REV-INTEL; nothing to scope-creep).
- **MODULARIZATION ISSUE:** the existing capability set (7 capabilities) is sound, but no modules exist to realize them. The hypothesis above proposes 6 modules. Goes to Bucket 2 `B2-M1`.

### Pass 3, Neighbor discovery

Cross-edges with other domains, ranked by edge weight (handoff count + DMDO dependency count):

| Neighbor | Outbound handoffs | Inbound handoffs | DMDO deps | Edge weight | Notes |
|---|---|---|---|---|---|
| CRM | 1 (207) | 3 (201, 473, 528) | n/a (no DMDO surface yet) | 4 | Heaviest neighbor. Deal-risk + pipeline-health analytics over CRM opportunities is the canonical REV-INTEL ↔ CRM boundary. |
| SALES-ENG | 0 | 2 (476, 477) | n/a | 2 | Conversation-intelligence ownership question lives here. |
| SALES-PERF | 1 (208) | 0 | n/a | 1 | Pipeline-health degradation feeds capacity rebalance. |
| BI | 0 | 0 | n/a | 0 | Forecasts feed downstream BI; not loaded yet. |
| CDP | 0 | 0 | n/a | 0 | Conceptual: customer-level engagement scores could inform CDP enrichment; not loaded. |
| EPM | 0 | 0 | n/a | 0 | Revenue forecasts feed the EPM close cycle; not loaded. |

Default deep-dive threshold (edge weight ≥ 3) is met only for CRM. Per the prompt, lighter neighbors get a one-line summary instead of the full 5-section diff. All pairwise diffs are also gated on `B1-M1` resolving (both module FKs on every handoff are NULL today).

### Pass 4, Pairwise reconciliation per neighbor

**CRM (edge weight 4):** Both sides' module FKs are missing for REV-INTEL (zero modules); the CRM side is fully modularized. The 4 handoffs share the same payload (`crm_opportunities`) and span 4 distinct trigger_events:

1. **Section 1, Existing handoffs fully wired.** Zero rows. None of the 4 REV-INTEL ↔ CRM handoffs has all four module FKs resolved.
2. **Section 2, Existing handoffs with NULL module FK.** All 4 rows. Handoff 207 (REV-INTEL → CRM on `deal_risk.escalated`) has `source_domain_module_id=NULL` (REV-INTEL side) and `target_domain_module_id=48` (CRM-PIPELINE-MGT). Handoff 528 (CRM → REV-INTEL on the same trigger event) has the inverse and is also a suspected duplicate-direction defect (`B2-D1`). Handoffs 201 and 473 (CRM → REV-INTEL on closed_lost and stage_changed) have `source_domain_module_id=48` resolved and `target_domain_module_id=NULL`. Once REV-INTEL ships modules per `B1-M1`, the target module on 201 / 473 / 528 attributes to `REV-INTEL-DEAL-SCORING` (deal-risk scoring consumes opportunity-stage events) or `REV-INTEL-PIPELINE-INSPECTION` (depending on which way the modularization decision lands in `B2-M1`).
3. **Section 3, Missing handoffs the catalog implies should exist.** The CRM side does not yet author any `data_object_relationships` row mirroring handoff 207 (REV-INTEL → CRM). Once REV-INTEL has a master `deal_risk_scores` (or `crm_opportunities` carries a `deal_risk_score_id` FK), a relationship `crm_opportunities scored_by deal_risk_scores` would mirror the handoff. Report-only on CRM's side.
4. **Section 4, Boundary integrity gaps (B5 routing).** REV-INTEL declares no `embedded_master` or `consumer` rows on `crm_opportunities`. The platform-vs-silos analysis (Signal 2) cannot read this boundary correctly until REV-INTEL ships at least a `consumer + optional` DMDO on `crm_opportunities` in `REV-INTEL-DEAL-SCORING` and `REV-INTEL-PIPELINE-INSPECTION`. Gated on `B1-M1`.
5. **Section 5, Cross-domain `data_object_relationships` mirror check.** Zero rows in either direction. Once REV-INTEL has masters, edges `deal_risk_scores scores crm_opportunities` and `revenue_forecasts forecasts crm_opportunities` are expected. Gated on `B1-M1`.

**SALES-ENG (edge weight 2):** One-line summary. Pairwise blocked: SALES-ENG itself has zero modules (separate audit, SALES-ENG.md). Both handoffs (476, 477) leave REV-INTEL's `target_domain_module_id` NULL and SALES-ENG's `source_domain_module_id` NULL. Pairwise reconciliation surfaces the `conversation_intelligence_records` master-ownership question (Bucket 2 `B2-O1`) but cannot proceed until both sides modularize.

**SALES-PERF (edge weight 1):** One-line summary. Pairwise blocked: SALES-PERF also has zero modules (already audited 2026-05-30). Handoff 208 has both module FKs NULL; resolution requires both REV-INTEL and SALES-PERF to ship modules first.

**BI, CDP, EPM (edge weight 0):** No pairwise to run. Surfaces as expected-future-edges in Bucket 3.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (A4, M1, M2, M4)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-A1 | A4 | Empty `catalog_tagline` and `catalog_description`. Per Rule #20 the audit may draft both, surface to the user for review BEFORE writing. | Drafts authored below; user approves wording, then PATCH. |
| B1-M1 | M1 / M2 / M4 | Zero `domain_modules` rows on a domain with 7 capabilities. Blocks the entire B / E / F surface. The market hypothesis in Pass 2 proposes 6 modules. | Author 6 `domain_modules` rows with the codes proposed in Pass 2's modularization table. Each carries `module_kind='full'`. Bundle with the corresponding `domain_module_capabilities` rows so every capability has ≥1 realizing module. |
| B1-S1 | B10b | 2 outbound handoffs have `source_domain_module_id=NULL` and 5 inbound have `target_domain_module_id=NULL` because REV-INTEL has zero modules. Cannot resolve until `B1-M1` lands. | Re-run B10b backfill against new modules once `B1-M1` is applied; expected attribution: 207 (deal_risk.escalated outbound to CRM) → `REV-INTEL-DEAL-SCORING`; 208 (pipeline_health.degraded outbound to SALES-PERF) → `REV-INTEL-PIPELINE-INSPECTION`; inbound 201, 473, 528 (CRM opportunity events) → `REV-INTEL-DEAL-SCORING` or `REV-INTEL-PIPELINE-INSPECTION` per `B2-M1`; inbound 476 (conversation_intelligence.insight_published) → `REV-INTEL-CONVERSATION`; inbound 477 (high_intent_signal.detected) → `REV-INTEL-DEAL-SCORING`. |

Drafts for `B1-A1` (per Rule #20 buyer-voice rule):

- `catalog_tagline` draft: "See every deal the way your best rep would. AI-driven pipeline analysis, deal scoring, and revenue forecasts from your team's calls, emails, and CRM activity."
- `catalog_description` draft (3 short paragraphs):
  - "Revenue Intelligence reads the signals your sales team generates every day, calls, emails, meetings, opportunity updates, and turns them into deal-level risk scores and an accurate roll-up forecast. Instead of reps hand-rolling pipeline reports, the system tells managers which deals are slipping, which are progressing on schedule, and where coaching attention pays off."
  - "Conversation intelligence transcribes and tags every recorded call, surfacing competitor mentions, pricing objections, and next-step commitments. Auto-activity-capture removes the data-entry tax on reps and keeps the CRM clean. Coaching workflows close the loop, replaying calls against your playbook so enablement can spot patterns across the team."
  - "Built for sales managers, RevOps, and enablement, sitting alongside your CRM rather than replacing it. Forecast accuracy is the headline metric; deal-coverage ratios and rep ramp velocity follow."

#### MISSING (vendor-surface entities, all gated on `B1-M1`)

These are placeholder entries: every entity in Pass 2's market surface is missing because zero masters exist. Loading them requires `B1-M1` to land first. The audit lists the top 7 most-impactful candidates here so the user has a per-entity decision surface; the full set goes to Bucket 3 pending Phase 0 vetting.

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-V1 | `deal_risk_scores` | REV-INTEL-DEAL-SCORING | 8 of 8 vendors (the headline RI master after conversation intelligence) |
| B1-V2 | `revenue_forecasts` | REV-INTEL-FORECAST | 8 of 8 (Clari, BoostUp, Aviso make it their headline) |
| B1-V3 | `forecast_submissions` | REV-INTEL-FORECAST | 8 of 8 (per-rep submission cycle) |
| B1-V4 | `captured_activities` | REV-INTEL-ACTIVITY-CAPTURE | 8 of 8 (People.ai's whole product is this) |
| B1-V5 | `conversation_topics` | REV-INTEL-CONVERSATION | 7 of 8 (Atrium does not extract topics) |
| B1-V6 | `coaching_sessions` | REV-INTEL-COACHING | 7 of 8 (Salesforce Einstein omits) |
| B1-V7 | `deal_warnings` | REV-INTEL-DEAL-SCORING | 6 of 8 (Gong "Deal Warnings", Clari "Mood", BoostUp "Risk Flags") |

#### APQC TAGGING

7 cross-domain handoffs. Per H1, the audit ships agent_curated proposals for every handoff where a confident PCF match exists. For inbound handoffs, the substantive source-side PCF tag belongs to the source domain's H1 (report-only here); REV-INTEL still proposes a consumer-side tag where one applies.

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|
| 207 | REV-INTEL → CRM | deal_risk.escalated | crm_opportunities | Manage opportunity pipeline (deal-risk escalation is a pipeline-management activity) | 712 | confident L4 |
| 208 | REV-INTEL → SALES-PERF | pipeline_health.degraded | crm_opportunities | Manage opportunity pipeline (pipeline-health signal informs sales-capacity rebalance on the consumer side) | 712 | medium L4 |
| 201 | CRM → REV-INTEL | crm_opportunity.closed_lost | crm_opportunities | Analyze sales trends and patterns (consumer-side: closed-lost feeds ML model retraining and deal-risk model improvement) | 686 | confident L4 |
| 473 | CRM → REV-INTEL | crm_opportunity.stage_changed | crm_opportunities | Manage opportunity pipeline (consumer-side: stage change feeds risk recalculation) | 712 | confident L4 |
| 528 | CRM → REV-INTEL | deal_risk.escalated | crm_opportunities | (DEFER, this row is a suspected duplicate-direction defect; see Bucket 2 `B2-D1`. Do not author a tag until the duplicate question is resolved.) | n/a | defer |
| 476 | SALES-ENG → REV-INTEL | conversation_intelligence.insight_published | conversation_intelligence_records | Analyze sales trends and patterns (consumer-side: insight publication feeds REV-INTEL ML and coaching surfaces) | 686 | medium L4 |
| 477 | SALES-ENG → REV-INTEL | high_intent_signal.detected | crm_opportunities | Manage opportunity pipeline (consumer-side: intent signal informs deal scoring) | 712 | medium L4 |

Deferred to Discover: 1 (handoff 528, pending Bucket 2 resolution).

| ID | Action | Note |
|---|---|---|
| B1-H1 | INSERT 6 `handoff_processes` rows for handoffs 207, 208, 201, 473, 476, 477 mapping to PCF rows above. Each carries `proposal_source='agent_curated'`, `record_status='new'`. Handoff 528 deferred pending `B2-D1`. | Coverage rises from 0 of 7 to 6 of 7 (one deferred). |

#### BOUNDARY findings per neighbor

Skipped (Pass 4 pairwise gated on `B1-M1` for the CRM neighbor; SALES-ENG and SALES-PERF gated on the partner's own M1 too).

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-M1, Modularization hypothesis.** Pass 2 proposes 6 modules. The split is plausible but other shapes exist: (a) collapse DEAL-SCORING and PIPELINE-INSPECTION into a single `REV-INTEL-DEAL-INTEL` module (mirrors Gong / Chorus); (b) the proposed 6-module shape, granular per capability; (c) a 4-module shape: `REV-INTEL-CONVERSATION` (conversation + signals) / `REV-INTEL-DEAL-INTEL` (scoring + pipeline + coaching) / `REV-INTEL-FORECAST` (forecast only) / `REV-INTEL-ACTIVITY-CAPTURE` (auto-capture, distinct buyer). Decide before loading masters. Affects every `B1-V*` entity placement. Independent of Bucket 3.

2. **B2-O1, Conversation-intelligence ownership.** `conversation_intelligence_records` (id 124) and `call_recordings` (id 122) are mastered by SALES-ENG today. The REV-INTEL capability `CONVERSATION-INTEL` is named after exactly the first entity, so the catalog has a master in one domain and the capability in another. The market evidence is split: Gong and Chorus treat conversation intelligence as the whole product (= revenue intelligence is conversation intelligence plus deal scoring); Clari, BoostUp, and Aviso keep conversation intelligence as a thin layer over the call-recording substrate and emphasize deal / forecast / pipeline science as the analytics layer. Options: (a) leave the masters with SALES-ENG and have REV-INTEL `embedded_master` or `consumer` them in `REV-INTEL-CONVERSATION` (the substrate-vs-analytics split, defensible per Clari / BoostUp / Aviso); (b) move both masters to REV-INTEL (the Gong / Chorus interpretation), which means SALES-ENG `embedded_master`s them; (c) split: keep `call_recordings` in SALES-ENG (recording IS the engagement substrate), move `conversation_intelligence_records` to REV-INTEL (the insight IS the analytics substrate). Dependency: Bucket 3 candidate #1 (whether Gong / Chorus's product packaging is a market signal or a vendor-specific bundling) informs this. Suggest holding B2-O1 until Bucket 3 candidate #1 lands if the user chooses the vetted route on Bucket 3.

3. **B2-T1, Analytics-side trigger events.** REV-INTEL today publishes events (`deal_risk.escalated`, `pipeline_health.degraded`) that fire on `crm_opportunities` (a CRM-mastered data_object). Per the Phase D rule, trigger_events live with the publishing master, so these events sit with CRM today. When REV-INTEL ships `deal_risk_scores`, `revenue_forecasts`, and `coaching_alerts` as masters per `B1-V*`, the analytics-side events (`deal_risk_score.changed`, `forecast.recalculated`, `coaching_alert.fired`) should move to those masters and fire from REV-INTEL. Options: (a) wait for `B1-V*` to land, then add the new events anchored to the new masters and migrate the existing 2 outbound handoffs to point at the new events (cleanest); (b) keep `deal_risk.escalated` and `pipeline_health.degraded` as CRM-owned events even after REV-INTEL has masters (consistent with current model but ducks the question); (c) add the new events now anchored to a placeholder `deal_risk_score_signals` master without loading the full surface (interim). Dependency on `B1-M1` and `B1-V*`.

4. **B2-D1, Handoff 528 duplicate-direction defect.** Handoffs 207 and 528 share `trigger_event_id=167` (`deal_risk.escalated`) but point in opposite directions. The trigger event fires on a CRM-mastered data_object (`crm_opportunities`), but the semantic is "REV-INTEL has detected risk on this opportunity and is escalating it back to CRM" (the analytic detects, the system of record receives). Handoff 207 (REV-INTEL → CRM) carries the correct direction. Handoff 528 (CRM → REV-INTEL) is suspected mis-attribution: either the publishing of the event was logged twice with inverted source/target, or the original intent was different. Options: (a) DELETE handoff 528 (the cleanest interpretation, REV-INTEL publishes deal_risk.escalated and CRM consumes), (b) reclassify handoff 528 to a different trigger event (e.g. CRM publishes `crm_opportunity.flagged_for_review` and REV-INTEL consumes for retraining), (c) keep both because the bidirectional pattern is real (CRM-side flagging and REV-INTEL-side escalation are different events on the same noun, conflated into one trigger_event). Independent of Bucket 3 but informs `B1-H1` (whether handoff 528 gets a tag at all).

5. **B2-C1, RevOps function-spine question.** Today only `Sales Operations` is recorded as the owner. Many of the flagship REV-INTEL deployments are owned by a distinct "Revenue Operations" or "RevOps" function that consolidates Sales Ops, Marketing Ops, and Customer Success Ops. Options: (a) add a `Revenue Operations` business_function and re-anchor REV-INTEL ownership to it (function-spine extension), (b) add RevOps as a sub-function under Sales Operations (hierarchy extension on the existing spine), (c) add RevOps as a contributor on the existing Sales Operations owner row (additive, lower risk), (d) leave as-is and capture the buyer evolution via `min_org_size` or `cost_band` shifts. Decision is function-spine-shaped and may affect SALES-ENG, SALES-PERF, GTM-PLAN, ACCT-PLAN too. Independent of Bucket 3.

### Bucket 3, Phase 0 pending (speculative)

| # | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| 1 | Conversation intelligence as a SALES-ENG substrate vs. a REV-INTEL master. The B2-O1 decision turns on whether the Gong / Chorus product packaging (conversation intelligence IS the product) is the canonical market shape or a vendor-specific bundling. | Gong markets conversation intelligence as the centerpiece; Clari treats it as an enrichment over call recordings; Chorus (ZoomInfo) folded it into the engagement substrate after acquisition; BoostUp positions conversation as one of several signal feeds. The interpretation affects whether REV-INTEL or SALES-ENG masters `conversation_intelligence_records`. | Phase 0 against Gong product docs + Clari Wingman acquisition rationale + ZoomInfo Chorus integration whitepaper. Confirm the substrate-vs-analytics split or pivot to Gong-shaped bundling. |
| 2 | Coaching as a REV-INTEL module vs. a LMS / SALES-ENABLEMENT module. Gong-style coaching workflows (replay-a-call, score against rubric) overlap with sales-enablement coaching (talk-track training, certification). | Gong "Coach" surface, Chorus "Coaching", Clari "Copilot Coach" all sit inside the RI product. Sales enablement vendors (Mindtickle, Highspot, Allego, Showpad) ship parallel coaching surfaces. The question is whether `coaching_sessions` is a REV-INTEL master or shared between REV-INTEL and a (queued) SALES-ENABLEMENT domain. | Phase 0 on Mindtickle + Allego coaching docs + Gong Coach docs. Decide whether `coaching_sessions` is REV-INTEL-mastered with SALES-ENABLEMENT consumer, or vice versa. |
| 3 | Forecast roll-up as a REV-INTEL module vs. an EPM Sales-Planning module. Clari and Aviso emphasize forecast as the headline value; finance-grade EPM platforms (Anaplan, Pigment, Board) also ship forecast modules with stronger close-cycle anchoring. | Anaplan Sales Planning, Pigment RevOps, Board cubes all compete with Clari and Aviso at the planning end. The buyer separation (RevOps vs. FP&A) may justify a separate `REVENUE-PLANNING-PLATFORM` domain queued to candidates. | Phase 0 on Anaplan Sales Planning + Pigment RevOps + Aviso forecasting whitepapers; confirm or queue a new domain candidate. |
| 4 | Activity capture as a separate domain. People.ai is a pure-play in this space and treats it as a horizontal data layer feeding multiple downstream consumers (CRM hygiene, deal intelligence, attribution). | People.ai positions itself as "the data foundation" rather than a revenue-intelligence product. Salesforce Einstein Activity Capture and Microsoft Sales Copilot also ship activity capture independently of revenue-intelligence features. | Phase 0 on People.ai + Salesforce Einstein Activity Capture + Microsoft Sales Copilot docs. Test whether activity capture is its own market or always bundled. |
| 5 | Market and competitive signal extraction as a PMM module. The capability `MARKET-SIGNAL-EXTRACTION` overlaps with Product Marketing Management (Klue, Crayon ship competitive intelligence as their headline product). | Klue and Crayon are competitive-intelligence specialists; Gong "Smart Trackers" and Chorus "Themes" extract competitor mentions from sales calls. The cross-pollination is real: Klue ingests Gong transcripts as a source. The question is whether MARKET-SIGNAL-EXTRACTION belongs in REV-INTEL or PMM (which is queued as a candidate from PROD-MGMT audit 2026-05-30). | Phase 0 on Klue + Crayon + Gong Smart Trackers + Chorus Themes docs. May fold MARKET-SIGNAL-EXTRACTION into PMM if it ships as a domain. |
| 6 | RevOps tooling overlap with CRM AI Copilot. CRM-suite incumbents (Salesforce Einstein, HubSpot AI, Microsoft Sales Copilot) ship revenue-intelligence-shaped features inside the CRM module. Catalog has `CRM-AI-COPILOT` module already. | Salesforce Einstein Conversation Insights is loaded as a REV-INTEL solution; the same vendor's broader Einstein-in-CRM offering sits under `CRM-AI-COPILOT`. The boundary between "AI features inside CRM" and "REV-INTEL as a separate domain" is a real market question. | Phase 0 on Salesforce Einstein product positioning + HubSpot AI + Microsoft Sales Copilot. May refine the REV-INTEL module boundaries to avoid overlap with `CRM-AI-COPILOT`. |

### Cross-bucket dependencies

- `B1-A1` (catalog UX drafts) is independent of all other items; can land first.
- `B1-M1` (modules) gates `B1-S1` (B10b re-backfill), `B1-V1` through `B1-V7` (master loads), all Pass 4 pairwise work, `B2-T1` (analytics-side trigger events), and the F-band's positive-existence checks (system skills can only attach once modules exist). It is the single most load-bearing decision in this audit.
- `B1-H1` (6 APQC tags) is independent of `B1-M1`. Can land without modules.
- `B2-M1` (modularization shape decision) informs `B1-V1` through `B1-V7` (which module each master lands in). The 6-module / 4-module choice rewrites the proposed_module column on every `B1-V*` row.
- `B2-O1` (conversation-intelligence ownership) is informed by Bucket 3 candidate #1. If user chooses the vetted route on Bucket 3, hold B2-O1 until research lands.
- `B2-T1` (analytics-side trigger events) depends on `B1-M1` and `B1-V*`. Cannot land before masters exist.
- `B2-D1` (handoff 528 duplicate) is independent of all other items; can resolve now and informs whether handoff 528 gets a `B1-H1` tag.
- `B2-C1` (RevOps function-spine) is independent of all other items.
- Bucket 3 candidate #2 (coaching ownership) and candidate #5 (market-signal ownership) are informed by `B2-M1`: if the user chooses the 4-module shape that collapses coaching into deal-intel, candidate #2 partly answers itself.
- Bucket 3 candidate #3 (forecast ownership) and candidate #6 (CRM AI Copilot overlap) interact with `B2-M1`: both shape what REV-INTEL's module boundary looks like vs. adjacent domains.

### Per-bucket prompts

**After Bucket 1 (7 items: 3 STRUCTURAL, 7 MISSING-candidate placeholders gated on `B1-M1` counted as one entry per row but a single logical decision, 1 APQC TAGGING; for surface clarity each is listed separately, total 11 line-items but 7 distinct fix surfaces, A1 / M1 / S1 / V1-V7 placeholder block / H1):**

> Bucket 1 has 3 unblocked fix surfaces (`B1-A1` catalog UX drafts, `B1-H1` 6 APQC tags, `B2-D1` resolution) and 1 blocking fix surface (`B1-M1` 6 modules) that gates `B1-S1` (B10b re-backfill) and `B1-V1` through `B1-V7` (top 7 missing masters). Fix these now? Reply 'all', 'just A1 + H1' (unblocked subset), 'just A1', 'just M1 with the 6-module shape', or 'skip'.

**After Bucket 2 (5 items):**

> Bucket 2 has 5 judgment calls: B2-M1 (which module shape, 6 / 4 / collapsed), B2-O1 (conversation-intelligence ownership, SALES-ENG vs. REV-INTEL vs. split), B2-T1 (analytics-side trigger events authoring approach), B2-D1 (handoff 528 duplicate-direction resolution), B2-C1 (RevOps function-spine treatment). What is your call on each? I will wait for your decision per item before acting. For B2-O1, consider running Bucket 3 candidate #1 first if you want a vendor-grounded answer; for B2-M1, candidates #2, #3, #5, #6 in Bucket 3 partly inform the modularization.

**After Bucket 3 (6 items):**

> Bucket 3 has 6 candidates, most of which influence the modularization decision in B2-M1. Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed. Candidate #1 (conversation-intelligence ownership) and #3 (forecast vs. EPM Sales Planning) are the most consequential; #4 (activity capture as separate domain) would queue a new domain candidate if confirmed; #5 (market signal extraction in PMM) folds a REV-INTEL capability out if confirmed.

### Report-only follow-ups (owed by other domains)

- **CRM B9 owes source-side APQC tagging on handoffs 201, 473, 528.** The substantive PCF activity on the publishing side is a CRM activity (opportunity-pipeline management for 473, customer revenue / opportunity-loss analysis for 201). Surfaces when CRM is next validated. The agent_curated tags proposed in `B1-H1` are the consumer-side reception activity; the source-side publishing activity is CRM's job. Handoff 528 deferred pending `B2-D1`.
- **SALES-ENG B9 owes source-side APQC tagging on handoffs 476 and 477.** SALES-ENG also has zero modules; its M1 will fail when audited, paralleling REV-INTEL here.
- **CRM B10b owes target_domain_module_id on handoff 207.** Once REV-INTEL ships modules per `B1-M1`, the CRM side already has its `target_domain_module_id=48` (CRM-PIPELINE-MGT) resolved on 207; the source-side `source_domain_module_id` on REV-INTEL's side resolves at the same time. Symmetric with REV-INTEL's `B1-S1`.
- **SALES-PERF B10b owes target_domain_module_id on handoff 208.** SALES-PERF has zero modules (already audited 2026-05-30, queued as `B1-M1` there). Resolves when SALES-PERF modularizes.
- **SALES-ENG B10b owes source_domain_module_id on handoffs 476 and 477.** SALES-ENG has zero modules; resolves when SALES-ENG modularizes.
- **CRM, SALES-ENG, SALES-PERF cross-domain `data_object_relationships` mirrors.** Once REV-INTEL masters `deal_risk_scores`, `revenue_forecasts`, and `captured_activities`, each of those neighbors should carry mirror edges (`crm_opportunities scored_by deal_risk_scores`, `crm_opportunities forecast_by revenue_forecasts`, `customers engaged_via captured_activities`). Surfaces when each neighbor is next validated. Today: cannot author because REV-INTEL has no master to point at.
- **SALES-ENG B2-O1 mirror.** If `B2-O1` resolves to option (b) or (c) (REV-INTEL masters `conversation_intelligence_records` or both), SALES-ENG's own audit will need a parallel DMDO refactor on its side. Routine, blocked on B2-O1 decision.
- **PMM domain candidate.** If Bucket 3 candidate #5 lands and MARKET-SIGNAL-EXTRACTION folds into PMM, the candidate-queue entry `PMM` (already pending review from the PROD-MGMT audit 2026-05-30) updates with REV-INTEL as an adjacency.

## 2026-05-31, Continuation: B1 technical fixes

Applied truly-technical B1 fixes only; all judgment items deferred per the continuation prompt.

### Applied (1 fix surface, 6 INSERTs)

- **B1-H1: 6 `handoff_processes` rows inserted** (loader `.tmp_deploy/fix_rev_intel_b1_technical_2026_05_31.ts`). Each tuple was pre-specified by the 2026-05-30 audit table; pre-flight verified all 6 handoff ids exist and touch REV-INTEL, and both PCF rows (686, 712) exist as `apqc_pcf_cross_industry` L4. `proposal_source='agent_curated'` on each; `record_status` omitted (DB default `new` per Rule #1). All 6 insertions succeeded:

  | handoff_id | direction | trigger_event | process_id | inserted id |
  |---|---|---|---|---|
  | 207 | REV-INTEL → CRM | deal_risk.escalated | 712 (Manage opportunity pipeline) | 385 |
  | 208 | REV-INTEL → SALES-PERF | pipeline_health.degraded | 712 (Manage opportunity pipeline) | 386 |
  | 201 | CRM → REV-INTEL | crm_opportunity.closed_lost | 686 (Analyze sales trends and patterns) | 387 |
  | 473 | CRM → REV-INTEL | crm_opportunity.stage_changed | 712 (Manage opportunity pipeline) | 388 |
  | 476 | SALES-ENG → REV-INTEL | conversation_intelligence.insight_published | 686 (Analyze sales trends and patterns) | 389 |
  | 477 | SALES-ENG → REV-INTEL | high_intent_signal.detected | 712 (Manage opportunity pipeline) | 395 |

  Coverage: 6 of 7 cross-domain handoffs now carry an APQC tag. The remaining handoff (528) is deferred as the 2026-05-30 audit instructed.

### Deferred (no writes; reasons recorded)

- **B1-A1, catalog_tagline + catalog_description.** Rule #20 catalog UX text. The 2026-05-30 audit drafted both; surfacing-to-user is required before any write. Continuation prompt explicitly forbids `catalog_tagline` / `catalog_description` writes from a technical pass.
- **B1-M1, 6 `domain_modules` rows.** New modules are out of scope for the technical pass (continuation prompt: "no new entities/DMDOs/modules"). Also gated on user judgment B2-M1 (6 vs 4 vs collapsed module shape, plus the related B2-O1 / B2-T1 ownership questions).
- **B1-S1, B10b `handoffs.source_domain_module_id` / `target_domain_module_id` backfill.** B10b derivation requires REV-INTEL modules to exist; with `domain_modules` deferred, there is nothing to attribute to. Becomes derivable once B1-M1 lands.
- **B1-V1 through B1-V7, top 7 missing masters** (`deal_risk_scores`, `revenue_forecasts`, `forecast_submissions`, `captured_activities`, `conversation_topics`, `coaching_sessions`, `deal_warnings`). New entities; gated on B1-M1 and B2-M1.
- **B1-H1, handoff 528 tag.** Deferred by the 2026-05-30 audit itself (suspected duplicate-direction defect; do not author a tag until B2-D1 resolves).
- **B1-H1 source-side tags on inbound handoffs (201, 473, 476, 477).** Owed by neighbor domains (CRM and SALES-ENG); recorded as report-only follow-ups in the 2026-05-30 audit's "Report-only follow-ups" section. Not in scope for this audit's continuation.

### Bucket 2 and Bucket 3 (all deferred, judgment)

- **B2-M1, B2-O1, B2-T1, B2-D1, B2-C1.** All 5 are judgment calls per the continuation prompt's deferral rules ("user picks", "options:", "decide", "surface to user"). No action.
- **Bucket 3 candidates #1 to #6.** All Phase 0 speculative; no Phase 0 in this continuation.

### Idempotency and verification

The loader is per-row idempotent (checks `(handoff_id, process_id)` existence before each insert). Post-flight verified 6 expected rows present. Re-running is safe and a no-op.

- Loader: `.tmp_deploy/fix_rev_intel_b1_technical_2026_05_31.ts`
- UI spot-check: https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

- Current footprint: 0 masters, 0 modules, 7 capabilities, 8 solutions (all primary), 0 regulations, 0 domain-owned trigger_events, 2 outbound handoffs, 5 inbound handoffs, 0 system skills, 0 roles, 0 `domain_data_objects` rows, 0 `domain_module_data_objects` rows.
- Domain metadata (A1) passes; A4 still FAILS (`catalog_tagline` and `catalog_description` empty).
- M1 / M2 / M4 / M6 FAIL: zero `domain_modules` rows. Leadership-tier exemption applies to B1 only, NOT to Rule #14 module floor.
- B1 vacuously passes (leadership-tier). B2 / B3 / B4 / B5 / B7 / B8 / B11 / B12 vacuous (no masters). B9 vacuous (no domain-owned trigger_events). B9b vacuous (no modules). B10 report-only. B10b FAILS: 2 outbound with `source_domain_module_id=NULL`, 5 inbound with `target_domain_module_id=NULL`.
- C1 passes (owner = Sales Operations). C2 acceptable (no override required at current granularity).
- D1 deferred until M-band fixes land.
- E-band vacuous (no modules). F-band vacuous (no modules, zero skills).
- H1: 6 of 7 cross-domain handoffs carry a `handoff_processes` row; handoff 528 remains untagged pending B2-D1. Coverage by `record_status='approved'` is 0 of 7. Provenance: 7 `agent_curated` rows across 6 distinct handoffs (handoff 208 carries two tags: 712 and 713).
- Bucket 1 (in-scope, agent fixable): 3 distinct fix surfaces (B1-A1 catalog UX drafts, B1-M1 module set, B1-S1 B10b backfill gated on M1). Plus 7 placeholder MISSING-master rows (B1-V1 to B1-V7) gated on M1 and B2-M1.
- Bucket 2 (surface-for-user, judgment): 5 items carried forward unchanged.
- Bucket 3 (Phase 0 pending, speculative): 6 candidates carried forward unchanged.

### Delta vs 2026-05-30 + 2026-05-31 continuation

- `B1-H1` is now CLOSED: 6 distinct handoffs (207, 208, 201, 473, 476, 477) carry `agent_curated` tags. Verified live. Handoff 208 carries a second tag (process 713 "Determine sales resource allocation") in addition to 712, recorded here for completeness; both rows are `agent_curated` `new`. Handoff 528 is still untagged, deferred to B2-D1.
- All other prior items remain open. No structural state changed since the continuation (no modules, no catalog UX text, no masters loaded). The B1 / B2 / B3 backlog this audit publishes is the 2026-05-30 backlog minus H1.

### Vendor surface basis

Unchanged from 2026-05-30. Six pure-play revenue-intelligence specialists (Gong, Clari, Chorus by ZoomInfo, People.ai, BoostUp.ai, Aviso AI) plus one CRM-suite incumbent (Salesforce Einstein Conversation Insights) and one sales-analytics adjacency (Atrium). All 8 solutions are `coverage_level=primary`. No new flagship surfaced this pass.

### Structural pass (A / M / B / C / D / E / F / H)

#### A-band
- A1: PASS. crud_percentage=35, business_logic populated, min_org_size `20 s <500`, cost_band `$$$`, certification_required=false, usa_market_size_usd_m=1500, market_size_source_year=2024.
- A2: PASS. 7 capabilities linked (CONVERSATION-INTEL, DEAL-SCORING, REVENUE-FORECASTING, PIPELINE-INSPECTION, COACHING-CALL-REVIEW, ACTIVITY-CAPTURE, MARKET-SIGNAL-EXTRACTION).
- A3: PASS. 8 solutions, all coverage_level=primary.
- A4: FAIL. Both catalog_tagline and catalog_description are empty strings. See B1-A1.

#### M-band
- M1: FAIL. Zero `domain_modules` rows (primary host) and zero `domain_module_host_domains` rows. Leadership-tier exemption applies only to B1, NOT to Rule #14 module floor.
- M2: FAIL (vacuously, 7 capabilities, 0 modules).
- M4: FAIL (vacuously, all 7 capabilities orphaned with no realizing module).
- M5: vacuous (no modules, no lifecycle states).
- M6: vacuous (no modules).
- M7: vacuous within REV-INTEL. Cross-domain ownership question on `conversation_intelligence_records` (id 124) and `call_recordings` (id 122) stays in B2-O1.
- M8: vacuous (no modules).

#### B-band (in-scope items only: B5, B7, B9, B9b, B10b, B11, B12)
- B5: vacuous. No `embedded_master` rows for REV-INTEL.
- B7: vacuous. No domain-owned masters to attach `users` edges to.
- B9: vacuous. REV-INTEL publishes 2 outbound handoffs (207, 208) but owns zero `trigger_events`. The events fire on `crm_opportunities` (CRM-mastered) and live on CRM by Phase D. B2-T1 covers the analytics-side events question for when masters land.
- B9b: vacuous. Zero modules, no intra-domain cross-module surface.
- B10b: FAIL.
  - Outbound rows with `source_domain_module_id=NULL`: 2 (handoffs 207, 208).
  - Inbound rows with `target_domain_module_id=NULL`: 5 (handoffs 201, 473, 476, 477, 528).
  - All 7 nulls are on the REV-INTEL side and gated on B1-M1. See B1-S1.
- B11: vacuous (no masters).
- B12: vacuous (no masters with workflow to author lifecycle states on).

#### C-band
- C1: PASS. 1 owner row (Sales Operations).
- C2: PASS (no diverging capability needs an override at current spine granularity). RevOps vs Sales Ops conversation remains in B2-C1.

#### D-band
- D1: DEFER. UI spot-check meaningful only after M-band fixes land.

#### E-band (E1 to E5)
- E1: vacuous. 0 modules, capability_count=7 keeps the multi-module path open once M1 resolves. No roles authored for REV-INTEL today (SALES-OPS id 10017 is the only related role).
- E2: vacuous.
- E3: vacuous.
- E4: vacuous.
- E5: vacuous.

#### F-band (F1 to F5)
- F1: PASS. Zero legacy domain-level system skills.
- F2: vacuous. Zero modules, zero system skills. Will become applicable on M1 resolution.
- F3: vacuous.
- F4: vacuous.
- F5: F5 cannot fail independently. Semantius score is uncomputable for REV-INTEL because F2 has no skill to score. Cured by M1 + Phase S authoring.

#### H-band
H1 measures across 7 cross-domain handoffs (2 outbound + 5 inbound).

| handoff_id | direction | source -> target | trigger_event | payload | tag(s) | status |
|---|---|---|---|---|---|---|
| 207 | outbound | REV-INTEL -> CRM | deal_risk.escalated | crm_opportunities | 712 Manage opportunity pipeline | agent_curated new |
| 208 | outbound | REV-INTEL -> SALES-PERF | pipeline_health.degraded | crm_opportunities | 712 Manage opportunity pipeline; 713 Determine sales resource allocation | agent_curated new (both) |
| 201 | inbound | CRM -> REV-INTEL | crm_opportunity.closed_lost | crm_opportunities | 686 Analyze sales trends and patterns | agent_curated new |
| 473 | inbound | CRM -> REV-INTEL | crm_opportunity.stage_changed | crm_opportunities | 712 Manage opportunity pipeline | agent_curated new |
| 476 | inbound | SALES-ENG -> REV-INTEL | conversation_intelligence.insight_published | conversation_intelligence_records | 686 Analyze sales trends and patterns | agent_curated new |
| 477 | inbound | SALES-ENG -> REV-INTEL | high_intent_signal.detected | crm_opportunities | 712 Manage opportunity pipeline | agent_curated new |
| 528 | inbound | CRM -> REV-INTEL | deal_risk.escalated | crm_opportunities | (none) | deferred to B2-D1 |

- H1 quality headline: 0 of 7 handoffs are `approved` (Rule #1, all tags are `new`).
- H1 provenance side-bar: 7 `agent_curated` rows across 6 distinct handoffs; 1 handoff deferred. Coverage 6 of 7. Within the audit's H1 volume target (0.5N to 0.8N = 4 to 6 new agent_curated rows for N=7), the 2026-05-31 continuation hit 6; this audit adds zero new rows (continuation already shipped the floor) and continues to defer handoff 528 pending B2-D1.

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-A1 | A4 | catalog_tagline and catalog_description still empty. Drafts authored in 2026-05-30 audit; user approval required before PATCH (Rule #20). | Surface drafts (carried forward verbatim from 2026-05-30); on approval, PATCH `/domains` row 103. |
| B1-M1 | M1 / M2 / M4 / M6 | Zero `domain_modules` rows on a domain with 7 capabilities. Blocks B / E / F surface and gates B1-S1, B1-V1 to B1-V7, B2-T1. | Author the 6-module set proposed 2026-05-30 (REV-INTEL-CONVERSATION, REV-INTEL-DEAL-SCORING, REV-INTEL-FORECAST, REV-INTEL-PIPELINE-INSPECTION, REV-INTEL-COACHING, REV-INTEL-ACTIVITY-CAPTURE), each `module_kind='full'`, alongside `domain_module_capabilities` realizing all 7 capabilities. Gated on B2-M1 modularization-shape decision. |
| B1-S1 | B10b | 7 handoff rows carry NULL module FKs on the REV-INTEL side. Deterministic backfill once B1-M1 lands. | After B1-M1: outbound 207 -> REV-INTEL-DEAL-SCORING; outbound 208 -> REV-INTEL-PIPELINE-INSPECTION; inbound 201, 473 -> REV-INTEL-DEAL-SCORING or REV-INTEL-PIPELINE-INSPECTION per B2-M1; inbound 476 -> REV-INTEL-CONVERSATION; inbound 477 -> REV-INTEL-DEAL-SCORING; inbound 528 conditional on B2-D1. |

Top 7 most-impactful MISSING masters (placeholder entries gated on B1-M1 + B2-M1, carried forward unchanged from 2026-05-30):

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-V1 | deal_risk_scores | REV-INTEL-DEAL-SCORING | 8 of 8 vendors |
| B1-V2 | revenue_forecasts | REV-INTEL-FORECAST | 8 of 8 |
| B1-V3 | forecast_submissions | REV-INTEL-FORECAST | 8 of 8 |
| B1-V4 | captured_activities | REV-INTEL-ACTIVITY-CAPTURE | 8 of 8 |
| B1-V5 | conversation_topics | REV-INTEL-CONVERSATION | 7 of 8 |
| B1-V6 | coaching_sessions | REV-INTEL-COACHING | 7 of 8 |
| B1-V7 | deal_warnings | REV-INTEL-DEAL-SCORING | 6 of 8 |

APQC TAGGING bucket: no new rows this audit. Handoff 528 still deferred (single open candidate pending B2-D1).

### Bucket 2, Surface-for-user (judgment calls)

Carried forward from 2026-05-30 unchanged. No user decision recorded since.

1. B2-M1: Modularization hypothesis (6 modules per Pass 2, or 4-module collapsed shape, or other).
2. B2-O1: Conversation-intelligence ownership (`conversation_intelligence_records` and `call_recordings` mastered by SALES-ENG, REV-INTEL capability CONVERSATION-INTEL named after the first).
3. B2-T1: Analytics-side trigger events authoring approach once REV-INTEL ships masters.
4. B2-D1: Handoff 528 duplicate-direction defect (trigger_event_id 167 shared with 207 in opposite directions).
5. B2-C1: RevOps function-spine question vs current Sales Operations owner.

### Bucket 3, Phase 0 pending (speculative)

Carried forward from 2026-05-30 unchanged. No vetting work performed since.

1. Conversation intelligence as SALES-ENG substrate vs REV-INTEL master.
2. Coaching as REV-INTEL vs LMS / sales-enablement module.
3. Forecast roll-up as REV-INTEL vs EPM sales-planning module.
4. Activity capture as a separate domain.
5. Market-signal extraction as a PMM module.
6. RevOps tooling overlap with CRM AI Copilot.

### Cross-bucket dependencies

- B1-A1 independent; can land first on approval.
- B1-M1 gates B1-S1, B1-V1 to B1-V7, all Pass-4 pairwise reconciliation work, B2-T1, and the F-band positive-existence checks. Also depends on B2-M1 shape decision.
- B1-S1 gated on B1-M1.
- B2-O1 informed by Bucket 3 candidate 1.
- B2-T1 gated on B1-M1 and B1-V*.
- B2-D1 independent; resolution determines whether handoff 528 gets a tag in Bucket 1.
- B2-C1 independent.
- Bucket 3 candidates 2, 3, 5, 6 interact with B2-M1.

### Report-only follow-ups (owed by other domains)

- CRM B9 owes source-side APQC tagging on handoffs 201, 473, 528 (handoff 528 deferred pending B2-D1).
- SALES-ENG B9 owes source-side APQC tagging on handoffs 476, 477. SALES-ENG itself has zero modules.
- CRM B10b owes `target_domain_module_id` resolution mirror once REV-INTEL modularizes.
- SALES-PERF B10b owes `target_domain_module_id` on handoff 208 (SALES-PERF has zero modules).
- SALES-ENG B10b owes `source_domain_module_id` on handoffs 476, 477.
- Cross-domain `data_object_relationships` mirrors from CRM, SALES-ENG, SALES-PERF blocked on REV-INTEL masters not yet existing.
- SALES-ENG B2-O1 mirror: triggers downstream DMDO refactor if B2-O1 resolves to options (b) or (c).
- PMM domain candidate (already queued from PROD-MGMT 2026-05-30) updates with REV-INTEL adjacency if Bucket 3 candidate 5 lands.

### Per-bucket prompts

- Bucket 1: 3 unblocked or blocking fix surfaces. Approve B1-A1 wording, B1-M1 module set + shape (or pick B2-M1 option first), or skip. Reply `all` (gated on B2-M1 decision for B1-M1), `just A1`, `just M1 with the 6-module shape`, or `skip`.
- Bucket 2: 5 judgment calls. Decide per item; B2-M1 and B2-O1 are the most consequential.
- Bucket 3: vet via Phase 0 research or eyeball-mode. Candidates 1 and 3 are most consequential. If eyeball, name which to treat as confirmed.
