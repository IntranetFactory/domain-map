---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 38
---

# CDP, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 `domain_modules` rows (full or starter), 0 host-junction modules. CDP exists at the `domains` row level only. 6 masters + 3 consumers + 1 contributor live in the legacy `domain_data_objects` rollup (ids 172, 189, 190, 191, 192, 193 master; 213, 215, 219 consumer; 220 contributor on `crm_contacts`). 9 capabilities linked via `capability_domains` (CDP-INGEST, IDENTITY-RESOLUTION, CDP-UNIFIED-PROFILE, CDP-SEGMENTATION, CDP-ACTIVATION, CDP-CONSENT-PRIV, CDP-PREDICTIVE, CDP-COMPOSABLE-WH, CUSTOMER-360). 15 solutions linked (12 primary, 3 partial). 17 trigger_events anchored on CDP masters. 9 outbound + 14 inbound cross-domain handoffs (23 cross-domain total). 0 intra-domain handoffs (consistent with 0 modules). 2 aliases on `customers` (account, client). 6 lifecycle states on `customers` only; 0 lifecycle states on `customer_events`, `identity_graphs`, `audience_segments`, `customer_attributes`, `customer_journeys`. `data_objects.notes` empty on all 6 masters (clean per Rule #15). Pattern flags: only `customers.has_personal_content=true`; the other 5 masters carry `false` on all three flags.
- **Vendor-surface basis (Pass 2 flagship enumeration):** Twilio Segment, Tealium AudienceStream, mParticle, Treasure Data CDP, BlueConic, Lytics, ActionIQ, Salesforce Data Cloud, Adobe Real-Time CDP, Twilio Engage, RudderStack, Hightouch, Census, Amplitude Audiences, FullStory, Customer.io Journeys, Klaviyo CDP, Microsoft Dynamics 365 Customer Insights, Oracle Unity CDP, Bloomreach Engagement. Compliance-specialist coverage anchored on GDPR (consent + data subject rights), CCPA / CPRA (sale opt-out, sensitive data), LGPD (Brazil), and the IAB TCF v2 transparency framework. No `domain_regulations` rows are loaded for CDP, every regulation in the loaded `regulations` table that touches CDP is owed as a `domain_regulations` link.
- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 13 items.

**Neighbor discovery** (auto-derived from handoffs, ranked by edge weight):

| Neighbor | Out | In | Cross-rels via masters | Weight | Pass shape |
|---|---|---|---|---|---|
| B2C-COMM | 3 | 2 | several via `customers`, `customer_events`, `commerce_products` | 5 | Pairwise (full) |
| MA | 1 | 3 | several via `customers`, `customer_events`, `crm_leads` | 4 | Pairwise (full) |
| CRM | 1 | 2 | several via `customers`, `crm_contacts`, `crm_leads` | 3 | Pairwise (full) |
| MDM | 1 | 2 | several via `customers`, `identity_graphs`, `source_records` | 3 | Pairwise (full) |
| CSM | 1 | 1 | via `customers`, `customer_cases` | 2 | Pairwise (full) |
| PROD-MGMT | 0 | 2 | via `customers`, `product_features`, `beta_programs` | 2 | Lightweight |
| DXP | 0 | 2 | via `customers`, `segments_dxp`, `journey_steps` | 2 | Lightweight |
| LOYALTY | 1 | 0 | via `customers`, `audience_segments` | 1 | Lightweight |
| SALES-ENG | 1 | 0 | via `customers`, `sales_cadences` | 1 | Lightweight |
| SMM | 0 | 1 | via `customers` | 1 | Lightweight |

**Structural pass bands:** **M1 hard-fail** (zero `domain_modules` rows on a 9-capability domain; per Rule #14, ≥3 capabilities require ≥2 full modules; CDP has 9 capabilities and 0). Every downstream M-band check, B-band check, C-band check, E-band check, F-band check is skipped as moot: with zero modules, there is no `domain_module_data_objects`, no `skills` (system or starter), no `role_modules`, no `permissions` to derive, no `skill_tools` to score against. Semantius operational score for CDP is **uncomputable** until M1 is cured. **B9 partial-fail** (4 trigger_events 470 `identity_graph.updated`, 471 `customer_attributes.refreshed`, 472 `customer_journey.stage_entered`, 473 `customer_journey.exited` carry empty `event_category`). **B9b** is not applicable (intra-domain handoffs require modules). **B10b (CDP-owed side)**: all 9 outbound handoffs have `source_domain_module_id=NULL` because CDP has no modules to point at; same for 13 of 14 inbound handoffs on `target_domain_module_id` (handoff 68 from CDP to CRM carries `target_domain_module_id=46` on the CRM side, which is owed by CRM not CDP; CDP's side stays NULL). **H1 hard-fail** (only 6 of 23 cross-domain handoffs tagged; all 6 are `discovery_substring` or `discovery_override`; zero `agent_curated`; zero `record_status='approved'`). Rule #15 audit: every `notes` column on all 6 masters is empty, this is the only audit since the directory was created where the notes layer is clean from the start, do not lose this property in any subsequent load.

CDP Semantius score: **uncomputable** until M1 is cured (no modules → no `system` skills → no `skill_tools` rows → no coverage tier rollup possible). The Pass-A obligation per Rule #14 + Rule #17 is to load `domain_modules` rows simultaneously with `domains` + `capabilities` + `solutions`; this domain shipped without that step. The fix surface is a full Phase A / Phase M / Phase B / Phase E / Phase F / Phase S load (treated as B1-S1 below).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail), zero modules on a 9-capability domain** | Per Rule #14, every `domains` row needs ≥1 `module_kind='full'` `domain_modules` row; a domain with ≥3 capabilities needs ≥2 full modules. CDP has 9 capabilities and 0 modules. Every downstream band check, the entire DMDO graph, system skills + tools, permissions, role bundles, and the Semantius score, blocks on this. The audit cannot proceed past M1 in any meaningful way until the modules are authored. Proposed modularization based on the loaded capabilities and flagship vendor surface (Twilio Segment, Tealium, mParticle, Treasure Data, Adobe RT-CDP, Salesforce Data Cloud, Hightouch, BlueConic, ActionIQ, Microsoft Customer Insights): (a) **CDP-INGEST** (sources, connectors, event ingestion) hosting masters `customer_events`, `data_sources` (Phase 0), `event_sinks` (Phase 0); (b) **CDP-IDENTITY** (deterministic + probabilistic resolution) hosting masters `identity_graphs`, `identity_rules` (Phase 0), `merge_decisions` (Phase 0); (c) **CDP-UNIFIED-PROFILE** (the resolved profile + the attribute layer) hosting masters `customers`, `customer_attributes`; (d) **CDP-SEGMENTATION** (segment authoring + evaluation) hosting masters `audience_segments`, `segment_definitions` (Phase 0); (e) **CDP-ACTIVATION** (downstream syndication + destination management) hosting masters `activation_destinations` (Phase 0), `activation_runs` (Phase 0); (f) **CDP-JOURNEYS** (observed journey progression + analytics) hosting master `customer_journeys`. Six-module split mirrors the canonical CDP layering (ingest → identity → profile → segment → activation, with journeys as the observed-history overlay) and aligns with the vendor surface. | Phase A / M / B / E / F / S full load: 6 modules + ≥1 system skill per module + ≥1 `skill_tools` per skill + module-scoped permissions + role bundles. Estimated load size: 6 `domain_modules` rows, 6 `system` skills, approximately 40-60 `tools` + `skill_tools` rows, approximately 30-40 `domain_module_data_objects` rows (lifting the 10 existing legacy `domain_data_objects` rows into per-module DMDO rows + new masters from Bucket 3), approximately 12-18 `permissions` rows, approximately 5-7 `roles` + `role_modules` + `role_permissions` rows. This is a substantial multi-phase load; surface for user direction before drafting the loader. |
| B1-S2 | **B9 missing event_category** | 4 trigger_events carry empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 470 `identity_graph.updated` → propose `state_change`, 471 `customer_attributes.refreshed` → propose `state_change`, 472 `customer_journey.stage_entered` → propose `state_change`, 473 `customer_journey.exited` → propose `lifecycle` (journey-exit is the terminal lifecycle event on the journey master). | PATCH 4 `trigger_events` rows to set `event_category` per the proposal. Mechanical fix; independent of M1. |
| B1-S3 | **B10b report-only (CDP-owed side, blocked on B1-S1)** | All 9 outbound CDP handoffs have `source_domain_module_id=NULL`; 13 of 14 inbound CDP handoffs have `target_domain_module_id=NULL`. Every one of these is owed by CDP itself (the CDP-side FK), and every one is blocked on B1-S1 (no modules exist to point at). Until M1 is cured, no B10b PATCH is possible on the CDP side. The CRM-side `target_domain_module_id=46` populated on handoff 68 is correct and stays. | Defer until B1-S1 produces module rows; then PATCH 9 + 13 = 22 FK columns per the modularization map in B1-S1. |
| B1-S4 | **B10b report-only (owed by other domains)** | 4 inbound handoffs have `source_domain_module_id=NULL` on the source side (the other domain's side): 69 (MA), 74 (MA), 75 (B2C-COMM), 77 (CSM), 89 (SMM), 508 (MA), 504 (B2C-COMM), 717 (MDM), 809 (DXP), 810 (DXP), 272 (MDM). Re-counted: 11 inbounds with NULL source FK on the source side. Per B10b asymmetry, the source module is the source domain's audit work. | Schedule b1 audits for MA, B2C-COMM, CSM, SMM, MDM, DXP to derive their `source_domain_module_id` per the standard B10b backfill procedure. |
| B1-S5 | **Lifecycle states gap on 5 of 6 masters** | Per Rule #12, every `master + required` data_object MUST have rows in `data_object_lifecycle_states`. `customers` has 6 states (302-305, 395, 396). `customer_events`, `identity_graphs`, `audience_segments`, `customer_attributes`, `customer_journeys` have **zero** lifecycle states. Half of these are arguably config-shape (Rule #12 exemption candidates): `customer_events` is an append-only event stream (no state machine, only `record_status`), `customer_attributes` is a derived materialization (no state machine, refreshed on schedule). The other half need real lifecycles: `audience_segments` (draft / active / paused / archived), `customer_journeys` (active / completed / abandoned), `identity_graphs` (resolution as a per-edge confidence state, separate concern). | Author lifecycle states for `audience_segments`, `customer_journeys`. Surface `customer_events`, `customer_attributes`, `identity_graphs` to the user as Rule #12 exemption candidates (config-shape, no state machine warranted), per Rule #15 do NOT auto-populate `notes` on the exemption, surface for tracking outside the notes column. This work depends on B1-S1 (lifecycle states want module attribution via `domain_module_id`). |
| B1-S6 | **Domain regulations missing** | CDP loaded zero `domain_regulations` rows. Flagship CDP vendors uniformly market against GDPR (Articles 6, 7, 17, 20 consent + portability + erasure), CCPA / CPRA (sale opt-out + sensitive personal data), LGPD (Brazil), Quebec Law 25, IAB TCF v2 (transparency and consent framework for ad-tech vendors). Loaded `regulations` table content needs verification at fix time; the linkage rows are missing regardless of which regulations exist as rows. | Insert `domain_regulations` rows linking CDP to the existing `regulations` rows for GDPR, CCPA, CPRA, LGPD, IAB TCF. Trivial PATCH-shape inserts once the regulation `id` values are looked up. |
| B1-S7 | **`customer_events.has_personal_content` flag re-evaluation** | The description says: "every customer interaction across web, mobile, email, in-product, sales-engagement, support" yet the flag is `false`. Customer events routinely carry IP addresses, device fingerprints, email opens, in-app screen recordings: these are personal data under GDPR Article 4. Recommend flipping to `true`. Same evaluation for `identity_graphs` (literally maps emails to devices to logins, every record is personal data), `customer_journeys` (per-customer journey traces). | Surface in Bucket 2 (B2-S2) for user pattern-flag re-evaluation. The audit cannot self-author these flips per Rule #15 boundary on data_objects metadata. |
| B1-S8 | **APQC TAGGING (substring rows are weak, no agent_curated, no approved)** | 6 of 23 cross-domain handoffs tagged: 68 → 797 ("Analyze organization's spend profile" L4, **WRONG**, spend-profile is procurement-side, not CDP profile lifecycle), 78 → 133 ("Establish goals, objectives and measures for products/services by channel/segment" L3, **WRONG**, segment.activated is downstream activation not goal-setting), 80 → 133 (same wrong row), 478 → 133 (same wrong row), 480 → 1814 ("Create customer journey maps" L5, **plausible** but L5 narrower than the L3 parent we want, mark for REPLACE with the L3 parent), 77 → 196 ("Manage customer service problems, requests and inquiries" L3, **plausible** for the case-created inbound). The audit proposes the following candidates from the analyst's structural-pass model. PCF id lookups deferred to load time; the proposed-row column carries the analyst's classification. |

#### APQC TAGGING candidates (volume target per H1: 12-18 `agent_curated` rows for 23 cross-domain handoffs)

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | Confidence | Action |
|---|---|---|---|---|---|---|
| 68 | CDP → CRM (CRM-ACCT-MGT) | profile.lifecycle_changed | customers | Manage customer accounts and relationships (parent L3) | confident L3 | REPLACE the wrong substring row (797) |
| 78 | CDP → LOYALTY | segment.activated | audience_segments | Develop and manage customer loyalty programs (10402 or L3 child) | confident L3 | REPLACE the wrong substring row (133) |
| 79 | CDP → SALES-ENG | high_intent_signal.detected | sales_cadences | Develop sales strategy / Sell products and services (10004 or L3 child) | medium | INSERT |
| 80 | CDP → B2C-COMM | segment.activated | customers | Manage commerce experience (digital storefronts L3) | confident L3 | REPLACE the wrong substring row (133) |
| 478 | CDP → LOYALTY | segment.activated | audience_segments | Develop and manage customer loyalty programs (10402 or L3 child) | confident L3 | REPLACE the wrong substring row (133) |
| 479 | CDP → CSM | customer_attributes.refreshed | customer_attributes | Manage customer service requests / Service quality (10408 or L3 child) | medium | INSERT |
| 480 | CDP → B2C-COMM | customer_journey.stage_entered | customer_journeys | Manage customer experience (10005 L3) | confident L3 | REPLACE the L5 substring row (1814) with the L3 parent |
| 481 | CDP → MDM | identity_graph.updated | identity_graphs | Manage master data (10566 L2) or Manage data integrity L3 | confident L3 | INSERT |
| 529 | CDP → B2C-COMM | customer_attributes.refreshed | customer_attributes | Manage customer experience (10005 L3) or Customer personalization L4 | medium | INSERT |
| 69 | MA → CDP | marketing_campaign.engagement_recorded | customers | Develop and manage marketing campaigns (10101 L3) | confident L3 | INSERT |
| 74 | MA → CDP | marketing_campaign.event_recorded | customer_events | Develop and manage marketing campaigns (10101 L3) | confident L3 | INSERT |
| 75 | B2C-COMM → CDP | storefront.interaction | customer_events | Manage commerce experience (digital storefronts L3) | confident L3 | INSERT |
| 76 | CRM (CRM-PIPELINE-MGT) → CDP | crm_opportunity.stage_changed | customer_events | Manage sales orders / Pipeline management (L3) | confident L3 | INSERT |
| 77 | CSM → CDP | case.created | customer_events | Manage customer service problems, requests, and inquiries (10388 L3) | confident L3 | FLIP discovery_override → agent_curated, the row is correct |
| 89 | SMM → CDP | social_engagement.recorded | customers | Manage social media presence and engagement (L3) | medium | INSERT |
| 997 | PROD-MGMT (PM-ROADMAP-DELIVERY) → CDP | beta_program.launched | beta_programs | Develop products and services (10063 L2) or product launch L3 | medium | INSERT |
| 508 | MA → CDP | marketing_form.submitted | crm_leads | Develop and manage marketing campaigns (10101 L3) | confident L3 | INSERT |
| 504 | B2C-COMM → CDP | commerce_product.published | commerce_products | Manage commerce experience (digital storefronts L3) | medium | INSERT |
| 717 | MDM → CDP | source_record.merged_to_golden | source_records | Manage master data (10566 L2) | confident L3 | INSERT |
| 809 | DXP → CDP | segment_dxp.published | segments_dxp | Manage customer experience (10005 L3) | confident L3 | INSERT |
| 810 | DXP → CDP | journey_step.entered | journey_steps | Manage customer experience (10005 L3) | confident L3 | INSERT |
| 272 | MDM → CDP | customer_golden_record.updated | customers | Manage master data (10566 L2) | confident L3 | INSERT |
| 1004 | PROD-MGMT (PM-ROADMAP-DELIVERY) → CDP | product_feature.adoption_threshold_reached | product_features | Develop products and services (10063 L2) or product adoption L3 | medium | INSERT |

23 candidate APQC tags total (3 REPLACE the wrong substring rows + 1 FLIP the override → curated + 19 INSERT new). All `proposal_source='agent_curated'`, `record_status='new'`. PCF id lookups via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` at load time.

#### Bucket 1 count summary

| ID | Finding type | Count |
|---|---|---|
| STRUCTURAL (M1 + B9 events + B10b report-only x2) | 4 |
| LIFECYCLE STATES gap | 1 |
| MISSING regulations | 1 |
| Pattern flag re-evaluation (routes to B2) | 1 |
| APQC TAGGING (high-confidence) | 1 |
| **Bucket 1 total** | 8 in-scope items (M1 is the load-bearing one; carries the entire Phase A / M / B / E / F / S re-load) |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation, abbreviated due to M1)

Pairwise reconciliation is blocked on B1-S1 (no modules to attach to). The pairs below get a structural sanity check rather than the full 5-section diff; the proper diff runs after M1 is cured.

**B2C-COMM ↔ CDP (weight 5).** 5 handoffs (80, 480, 529, 75, 504), all NULL on CDP side. Section 5: cross-relationship `customer_events emits` (433 via customers) exists. After M1, the activation handoffs (80, 480, 529) should target a B2C-COMM module like `B2C-COMM-PERSONALIZATION`; the ingest handoffs (75, 504) should source from `B2C-COMM-STOREFRONT`.

**MA ↔ CDP (weight 4).** 4 handoffs (78, 69, 74, 508), all NULL on CDP side; MA-side also NULL on 69, 74, 508. Section 5: no specific cross-relationship rows linking `audience_segments` to MA campaigns yet, this is a Bucket 3 modularization gap (CDP-segment → MA-campaign_audience is the canonical activation pattern). After M1, CDP-side modules should target MA's `MA-CAMPAIGN-MGT` for activation; MA's `MA-LEAD-CAPTURE` should source the lead-submission handoff (508).

**CRM ↔ CDP (weight 3).** 3 handoffs (68, 76, 272 via MDM). 68 has CRM-side populated (target 46 CRM-ACCT-MGT, healthy). 76 has CRM-side populated (source 48 CRM-PIPELINE-MGT, healthy). Section 5: `customers has_contacts crm_contacts` (914), `customers has_opportunities crm_opportunities` (915), `customers converted_from_lead crm_leads` (916), `customers has_activities crm_activities` (921) all exist. Healthy boundary on cross-relationships.

**MDM ↔ CDP (weight 3).** 3 handoffs (481 CDP → MDM `identity_graph.updated`, 717 MDM → CDP `source_record.merged_to_golden`, 272 MDM → CDP `customer_golden_record.updated`). All NULL on CDP side; MDM-side also NULL on 717, 272. Section 3: the boundary is canonical (CDP and MDM share the identity-resolution surface); under future Phase 0, decide whether `identity_graphs` is mastered in CDP or MDM (currently CDP-mastered; MDM has `source_records` 320 and a "golden record" pattern). Bucket 2 candidate.

**CSM ↔ CDP (weight 2).** 2 handoffs (479 CDP → CSM, 77 CSM → CDP). Section 5: no specific CSM-CDP cross-relationship rows surfaced in the Pass-1 query; verify post-M1.

**PROD-MGMT (weight 2).** 2 inbound (997, 1004). Both NULL on CDP side; PROD-MGMT-side populated (131 PM-ROADMAP-DELIVERY). Healthy on source side.

**DXP (weight 2).** 2 inbound (809, 810). Both NULL on both sides; DXP audit owes the source FK. Cross-relationships not yet authored; CDP-DXP integration is a known activation channel.

**Lighter neighbors (one-line summaries):**

- **LOYALTY (weight 1).** 1 outbound (78), NULL on both sides. After M1, target a LOYALTY module like `LOYALTY-PROGRAM-MGMT`.
- **SALES-ENG (weight 1).** 1 outbound (79), NULL on both sides. After M1, target the SALES-ENG module hosting `sales_cadences` (likely `SALES-ENG-CADENCE`).
- **SMM (weight 1).** 1 inbound (89), NULL on both sides. SMM audit owes the source FK.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Phase-A re-do shape and timing.** B1-S1 surfaces a 6-module modularization (CDP-INGEST, CDP-IDENTITY, CDP-UNIFIED-PROFILE, CDP-SEGMENTATION, CDP-ACTIVATION, CDP-JOURNEYS). Confirm or revise the split before drafting the loader. Alternatives that should be considered: (a) collapse JOURNEYS into UNIFIED-PROFILE (4 vs 6 capabilities split into 5 modules); (b) split IDENTITY into IDENTITY-RESOLUTION (the graph) + CONSENT-PRIV (the per-data-subject consent ledger, which is a regulated workflow surface); (c) add CDP-COMPOSABLE-WH as a sixth module representing warehouse-native (zero-copy) deployments distinct from SaaS-native CDP. Also: should `customers` master here, in MDM, or in CRM? The catalog has `customers` mastered in CDP per the current rollup, but the description says "the catalog's most multi-mastered row: CRM masters the sales view, CSM the service view, SUB-MGMT the financial view, CDP the unified resolved profile." This is a multi-master architectural choice that needs explicit decision before B1-S1 can land. | Architectural product decision; user's call. The skill's Rule #14 says the modules ship in the same Phase A as the domain; this is post-hoc structural recovery. | (a) Accept the 6-module split as proposed. (b) Counter-propose. (c) Pre-decision: confirm `customers` master ownership (CDP vs MDM vs CRM) under the existing multi-master pattern. |
| B2-S2 | **Pattern flag re-evaluation per Rule #12.** Current flags: only `customers.has_personal_content=true`. The audit recommends: `customer_events.has_personal_content=true` (event payloads carry IPs, device fingerprints, email-open content), `identity_graphs.has_personal_content=true` (literally the email-to-device-to-cookie map, every row is personal), `customer_journeys.has_personal_content=true` (per-customer journey traces). `customer_attributes` is borderline (derived signals, not raw PII, but contains LTV/churn-likelihood at the per-customer level). `audience_segments` is borderline (segment definitions are abstract, but segment membership rosters are personal). `has_submit_lock` and `has_single_approver` look correctly `false` across all 6 masters (none has a publishable-then-locked workflow). | Pattern flags are workflow-shape judgments the user owns; the audit re-evaluates and proposes, the user decides. | Per-flag yes/no from user; capture in Decisions. |
| B2-S3 | **Lifecycle-state authoring + Rule #12 exemption per master.** 5 of 6 masters have zero lifecycle states. The audit's proposal: author for `audience_segments` (draft / active / paused / archived) and `customer_journeys` (active / completed / abandoned). Treat `customer_events`, `customer_attributes`, `identity_graphs` as config-shape exemptions (append-only stream; derived materialization; resolution-as-state-overlay). Confirm the split. | Workflow-shape decisions are user-owned; the audit proposes. Rule #12 exemption itself requires user acknowledgement (Rule #15 forbids auto-populating notes about it). | (a) Accept the split: 2 author + 3 exempt. (b) Different split (specify which masters get lifecycles). (c) All 5 get lifecycles (specify the state lists). |
| B2-S4 | **Regulations to link via `domain_regulations`.** B1-S6 proposes GDPR, CCPA, CPRA, LGPD, IAB TCF v2 (5 regulations). Quebec Law 25, the EU AI Act (since CDP propensity scoring may trip the high-risk classifier), and POPIA (South Africa) are candidates. | Regulatory scope is jurisdictional + product-strategy specific; the audit proposes, the user confirms. | Per-regulation yes/no; capture in Decisions. |
| B2-S5 | **`customers` multi-master architecture decision.** The catalog's `customers.description` says CDP masters the unified resolved profile while CRM, CSM, SUB-MGMT master domain-specific views. The current loaded state has `customers` mastered in CDP only (domain_data_object id 172, role=master). Either: (a) this is correct and the description is aspirational, in which case CRM/CSM/SUB-MGMT need `consumer` or `contributor` DMDOs; or (b) `customers` should be a `kind='platform_builtin'`-like master in a master module (CRM-MASTER-DATA, CDP-UNIFIED-PROFILE, etc.) with each domain embedding via `role='embedded_master'`. This is upstream of B1-S1. | Architectural choice the audit cannot make alone; collides with the `users` platform-builtin pattern. | (a) CDP keeps single-master; CRM/CSM/SUB-MGMT add consumer DMDOs at their next audit. (b) Promote `customers` to a master in a CDP-UNIFIED-PROFILE module and let others embed. (c) Adopt the multi-master `domain_data_objects.notes`-style decomposition the description hints at. |
| B2-S6 | **Composable CDP capability mapping.** `CDP-COMPOSABLE-WH` (warehouse-native CDP, Hightouch / Census / RudderStack Reverse-ETL) is a market segment with a fundamentally different deployment model (zero-copy, no SaaS data store, transformations live in the warehouse). It is loaded as a capability under CDP, but architecturally these are reverse-ETL vendors that don't master `customer_events` or `identity_graphs` (they read from the warehouse). Should composable-CDP be: (a) a capability inside CDP (current); (b) a separate domain `REVERSE-ETL` with point-solution vendors (Hightouch, Census)? | Domain vs capability is a Rule #2 judgment call (the point-solution-market test). Hightouch, Census, RudderStack Reverse-ETL all have flagship products, this passes the 3-vendor test. | (a) Keep as CDP capability. (b) Split into a separate `REVERSE-ETL` domain, surface to candidate queue. (c) Treat as a CDP module (`CDP-COMPOSABLE`) but not a separate domain. |
| B2-S7 | **B9 trigger_event 473 `customer_journey.exited` semantics.** The audit proposed `lifecycle` for 473, but the existing 472 `customer_journey.stage_entered` (state_change candidate) is the move between stages; exit could be a terminal state-change or a true lifecycle event. The semantic differs by vendor (Adobe and Tealium model "journey end" as a state termination; Segment models it as a lifecycle off-ramp tied to goal-attainment). | Vendor-semantic judgment call. | (a) `lifecycle` (the journey ends, irreversible). (b) `state_change` (just another step transition). |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against Twilio Segment, Tealium AudienceStream, mParticle, Treasure Data, BlueConic, Lytics, ActionIQ, Salesforce Data Cloud, Adobe Real-Time CDP, Twilio Engage, RudderStack, Hightouch, Census, Amplitude Audiences, FullStory, Customer.io Journeys, Klaviyo CDP, Microsoft Customer Insights, Oracle Unity CDP, Bloomreach Engagement. The compliance anchor is GDPR + CCPA + CPRA + LGPD + IAB TCF v2; broader regulatory anchors that could apply include Quebec Law 25, POPIA, EU AI Act (for predictive scoring), and HIPAA (when health data flows through the CDP, BAA-class deployments). Loaded `regulations` rows for CDP-applicable frameworks need verification, the linkage rows are missing regardless.

The subagent JSON-output recipe was not spawned (single-pass audit per orchestrator). The candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING (11) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `data_sources` | Segment "Sources", mParticle "Inputs", Tealium "Tag Configurations", Treasure Data "Connectors". First-class sources catalog (a web SDK, a mobile SDK, a Kafka topic, a Snowflake table, a Stripe webhook). Currently no entity. | CDP-INGEST (master) |
| `event_sinks` (or `destinations`) | Segment "Destinations", mParticle "Outputs", Hightouch "Destinations", Twilio Engage activations. The downstream activation targets (a Mailchimp account, a Facebook Ads audience, a Salesforce campaign, a Slack webhook). | CDP-ACTIVATION (master) |
| `activation_runs` (or `sync_runs`) | Hightouch "Syncs", Census "Sync runs". Per-run status/throughput/error log of a destination sync, the operational backbone of activation. | CDP-ACTIVATION (master) |
| `identity_rules` | Tealium "ID merge rules", Segment "Identity Resolution Settings", mParticle "Identity Strategy". The configuration that drives identity_graph stitching (which IDs are deterministic, which are probabilistic, which are blocked). | CDP-IDENTITY (master) |
| `merge_decisions` | Tealium "Merge Audit Log", mParticle "Identity History". The audit trail of identity stitches (which two records merged, when, by which rule, with what confidence). Compliance-relevant for GDPR Article 17 (right to erasure: which downstream profiles inherited the merged record). | CDP-IDENTITY (master, compliance-anchored) |
| `consent_records` | OneTrust integration in every flagship CDP, Adobe RT-CDP "Consent and Preferences", Tealium "Consent Management". Per-data-subject consent state, with grant/revoke timestamps and per-purpose scoping (TCF v2 purposes 1-10). | CDP-CONSENT-PRIV (master, new module candidate) |
| `data_subject_requests` | GDPR Article 15 (access), Article 17 (erasure), Article 20 (portability) request records. Salesforce Data Cloud "Consumer Data Requests", Adobe RT-CDP "Privacy Service Requests", mParticle "DSR Workbench". Compliance-mandatory. | CDP-CONSENT-PRIV (master, new module candidate) |
| `segment_definitions` | Distinct from `audience_segments` (which is the materialized roster) vs the query/rule that defines the segment. Segment "Audience SQL", BlueConic "Segments", Treasure Data "Audience definitions". | CDP-SEGMENTATION (master, may collapse with `audience_segments` per vendor model) |
| `predictive_models` | Adobe RT-CDP "AI Service models", Salesforce Data Cloud "Einstein Models", BlueConic "AI Workbench", Lytics "ML scoring". Per-model definitions (LTV, churn-risk, propensity-to-buy). | CDP-PREDICTIVE (potential master, capability already loaded) |
| `model_predictions` | Per-customer per-model output, often updated daily. Salesforce "Predictions" entities, Adobe "AI Scores". | CDP-PREDICTIVE (master) |
| `journey_definitions` | Distinct from `customer_journeys` (observed) vs the configured definition of journey stages. Adobe Journey Optimizer "Journeys", Salesforce Marketing Cloud "Journey Builder canvases". | CDP-JOURNEYS (master) |

#### MODULARIZATION (3) candidates

- **CDP-CONSENT-PRIV module.** Currently `CDP-CONSENT-PRIV` is loaded only as a `capabilities` row. The volume and regulatory weight of consent + DSR + privacy artifacts justifies a separate module rather than folding into CDP-UNIFIED-PROFILE. Promote to module.
- **CDP-PREDICTIVE module split.** Currently a capability; vendors with significant AI/ML positioning (Adobe Sensei, Salesforce Einstein, Lytics) ship distinct UX surfaces and roles. If `predictive_models` and `model_predictions` become entities, the module is warranted.
- **REVERSE-ETL domain candidate** (cross-references B2-S6). Hightouch, Census, RudderStack Reverse-ETL pass the 3-vendor test for a separate domain. The current modeling overloads CDP with these; consider splitting.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **GDPR** applicability (mandatory for EU data subjects).
- **CCPA / CPRA** (mandatory for California residents).
- **LGPD** (Brazil).
- **Quebec Law 25** (Quebec).
- **IAB TCF v2** (ad-tech transparency framework for any vendor passing consent strings).
- **EU AI Act** (predictive scoring may trigger Annex III high-risk classification if used for credit, employment, public-service eligibility).
- **POPIA** (South Africa).
- **HIPAA** (BAA-class deployments where PHI flows through CDP).

#### Candidate-domain queue (Pass 2)

This audit surfaces 1 domain-tier candidate for `audits/_missing-domains.md`:

- **REVERSE-ETL** (Reverse-ETL / Warehouse-Activation). Hightouch, Census, RudderStack Reverse-ETL, Polytomic, Grouparoo. Adjacent to CDP (current `CDP-COMPOSABLE-WH` capability), DBT-like data-platform tooling, and the activation half of CDP. Pass-2 candidate; surfaced by this audit.

The helper run for the REVERSE-ETL candidate is queued in the run plan below. The helper writes only to `audits/_missing-domains.md`, not to the live catalog.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/CDP-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which candidates to treat as confirmed and the catalog adds them via Phase B inserts after B1-S1 lands modules to host them).

### Cross-bucket dependencies

- **B1-S1 (M1) is the load-bearing item for nearly everything.** B1-S3 (B10b CDP-side), B1-S5 (lifecycle states, want module attribution), B1-S6 (regulations, want domain_regulation rows), B1-S8 (APQC tags, want module-aware handoff targets), all of these tighten under post-M1 state. The user may want to apply B1-S2 (event_category PATCH), B1-S4 (other-domain audit kickoff), and a first cut of B1-S8 (APQC) before M1, leaving the rest until the modularization lands.
- **B2-S1 gates B1-S1.** The modularization shape is the agent's proposal; the user owns the call before the loader runs.
- **B2-S5 may gate B2-S1.** If `customers` master ownership moves out of CDP, the CDP-UNIFIED-PROFILE module's scope and primary master change.
- **B2-S6 informs the candidate queue (REVERSE-ETL).** If the user accepts a CDP-internal capability mapping, the candidate queue entry can be retracted.
- **B3 MISSING entities (`consent_records`, `data_subject_requests`, `identity_rules`) inform B2-S4 (regulations).** If consent and DSR entities land, the GDPR / CCPA / TCF linkages get teeth via DMDO `regulation_id` tagging.
- **B2-S2 (pattern flags) is independent.** Pattern flag re-evaluation is mechanical PATCHes on `data_objects`; no other bucket gates it.
- **B2-S3 (lifecycle states) partially depends on B1-S1.** Lifecycle states' `domain_module_id` column wants modules.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S4, S8-INSERT-only`), or `skip`.

- **S1 (M1 hard fail, 6-module Phase A re-do)** is the load-bearing item; gated on B2-S1 (modularization shape) and possibly B2-S5 (customers master ownership). Don't proceed without those answers.
- **S2 (event_category PATCH on 4 events)** is trivial; one PATCH each. Independent of M1.
- **S3 (B10b CDP-side NULL FKs)** is blocked on B1-S1.
- **S4 (B10b other-domain side)** schedules audits on MA, B2C-COMM, CSM, SMM, MDM, DXP.
- **S5 (lifecycle states gap on 5 masters)** depends on B2-S3 (split decision) and B1-S1 (module attribution).
- **S6 (domain_regulations missing)** depends on B2-S4 (regulation scope).
- **S7 (pattern flag re-evaluation, routes to B2-S2)**, not a B1 item, see B2.
- **S8 (APQC tagging, 23 candidates: 19 INSERT + 3 REPLACE + 1 FLIP)** can land now, all the inbound and outbound classifications stand independently of the CDP modularization, since the analyst classified the activity by trigger_event semantics, not by module attribution.

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (Phase-A re-do shape):** (a) accept the 6-module split, (b) counter-propose, (c) confirm `customers` ownership first.
- **B2-S2 (pattern flag re-evaluation):** per-flag yes/no on `has_personal_content` for customer_events / identity_graphs / customer_journeys / customer_attributes / audience_segments.
- **B2-S3 (lifecycle state split):** (a) author 2 + exempt 3, (b) different split, (c) all 5 get lifecycles.
- **B2-S4 (regulation scope):** per-regulation yes/no on the 8 candidates.
- **B2-S5 (`customers` multi-master):** (a) single-master CDP, (b) promote to master module, (c) multi-master decomposition.
- **B2-S6 (composable-CDP / reverse-ETL):** (a) keep as CDP capability, (b) split as REVERSE-ETL domain, (c) keep as CDP module not domain.
- **B2-S7 (trigger_event 473 category):** (a) lifecycle, (b) state_change.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 11 entity candidates + 3 modularization candidates + 8 regulation candidates + 1 candidate-domain (REVERSE-ETL) to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| MA | B10b: populate `source_domain_module_id` on inbound 69, 74, 508. Add `consumer` or `contributor` DMDO on `customers`, `customer_events`, and (if relevant) `crm_leads` in whichever MA module subscribes. APQC tag candidates: 69, 74, 508 (all classified Develop and manage marketing campaigns L3). |
| B2C-COMM | B10b: populate `source_domain_module_id` on inbound 75, 504. Add `consumer` DMDO on `customer_events`, `commerce_products` (already mastered in B2C-COMM, this is fine; the CDP side wants the consumer mirror). APQC tag candidates: 75, 504. |
| CSM | B10b: populate `source_domain_module_id` on inbound 77. Outbound 479 (CDP → CSM, customer_attributes.refreshed) needs CSM-side `target_domain_module_id`. APQC tag candidate: 77 (FLIP discovery_override → agent_curated since the row is correct). |
| SMM | B10b: populate `source_domain_module_id` on inbound 89. APQC tag candidate: 89 (Manage social media presence and engagement L3). |
| MDM | B10b: populate `source_domain_module_id` on inbound 717, 272. Outbound 481 (CDP → MDM, identity_graph.updated) needs MDM-side `target_domain_module_id`. Consider whether `identity_graphs` should master in CDP or MDM under the joint identity-resolution surface. APQC tag candidates: 481, 717, 272 (all classified Manage master data L2/L3). |
| DXP | B10b: populate `source_domain_module_id` on inbound 809, 810. APQC tag candidates: 809, 810 (Manage customer experience L3). |
| PROD-MGMT | Inbound 997, 1004 have `source_domain_module_id` populated (131 PM-ROADMAP-DELIVERY); confirm this is the intended source module. APQC tag candidates: 997, 1004. |
| LOYALTY | Outbound 78 (CDP → LOYALTY) needs LOYALTY-side `target_domain_module_id`. APQC tag candidate: 78 (Develop and manage customer loyalty programs L3). |
| SALES-ENG | Outbound 79 (CDP → SALES-ENG) needs SALES-ENG-side `target_domain_module_id`. APQC tag candidate: 79. |
| CRM | Inbound 76 source is populated (48 CRM-PIPELINE-MGT). Outbound 68 target is populated (46 CRM-ACCT-MGT). Healthy boundary; no FK fixes owed. Consider adding a consumer DMDO on `customers` in CRM-ACCT-MGT if not present (verify at CRM's next audit). |

### Candidate-domain queue helper run

The REVERSE-ETL candidate is queued via the helper writing to `audits/_missing-domains.md`. Helper invocation:

```bash
bun run "C:/dev/domain-map/scripts/analytics/append_missing_domain.ts" \
  --code REVERSE-ETL \
  --name "Reverse-ETL / Warehouse-Activation" \
  --surfaced-by "CDP audit 2026-05-30" \
  --evidence "Hightouch, Census, RudderStack Reverse-ETL, Polytomic, Grouparoo" \
  --adjacency "CDP, B2C-COMM, MA" \
  --capabilities "warehouse-native activation, reverse-ETL sync, zero-copy CDP"
```

### Decisions

(awaiting user input per the Per-bucket prompts)

## 2026-05-31, Continuation: B1 technical fixes

Subagent run scoped to truly-technical B1 items only (per orchestrator). Loader at [.tmp_deploy/fix_cdp_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_cdp_b1_technical_2026_05_31.ts).

### Fixes applied

| ID | Action | Table | Rows | Detail |
|---|---|---|---|---|
| B1-S2 | PATCH | `trigger_events` | 3 | 470 `identity_graph.updated` `'' -> 'state_change'`; 472 `customer_journey.stage_entered` `'' -> 'state_change'`; 473 `customer_journey.exited` `'' -> 'lifecycle'`. B9 trigger_event gap cleared. |

### No-ops on pre-flight (drift vs original audit)

| ID | Item | Live state | Action |
|---|---|---|---|
| B1-S2 / 471 | `customer_attributes.refreshed.event_category` | `'signal'` (NOT empty as the 2026-05-30 audit reported) | Skipped; audit drift. The live `'signal'` value is plausible (computed-attribute refresh is observational rather than a state machine transition); not patched without user direction. |
| B1-S6 | CDP `domain_regulations` | 4 rows already present: GDPR (id=1), CCPA/CPRA (id=3), EU-AI-ACT (id=33), COPPA (id=55) | Verified read-only; no inserts. Original audit reported "zero rows loaded" which was stale. |

### Deferred (NOT applied), with reason

| ID | Reason category | Why deferred |
|---|---|---|
| B1-S1 | Judgment (huge multi-phase load) | 6-module Phase A/M/B/E/F/S re-do is gated on B2-S1 (modularization shape) and B2-S5 (`customers` master ownership). Not in truly-technical scope. |
| B1-S3 | Blocked on B1-S1 | All 22 CDP-side B10b FKs require modules to point at. |
| B1-S4 | Owed by other domains | MA, B2C-COMM, CSM, SMM, MDM, DXP audits own these `source_domain_module_id` backfills. |
| B1-S5 | Judgment + blocked on B1-S1 | Lifecycle state authoring on 5 masters depends on B2-S3 split decision and on modules existing for `domain_module_id` attribution. |
| B1-S6 (LGPD, IAB TCF v2, Quebec Law 25, POPIA) | Judgment (new `regulations` rows) | All 4 missing from the `regulations` table. Creating new master-regulation rows is its own judgment call, deferred. |
| B1-S7 | Routed to B2-S2 | Pattern flag flips on `customer_events`, `identity_graphs`, `customer_journeys` are Rule #15 boundary on data_objects metadata; user owns. |
| B1-S8 | Judgment (DELETE+INSERT or medium-confidence) | The 3 REPLACE rows require DELETE+INSERT against rows the analyst flagged as "wrong" (judgment per orchestrator). The 19 INSERT rows mix `confident L3` and `medium`; without per-row PCF id resolution and confidence acceptance, treating any as truly-technical would smuggle judgment past the screen. |

### Verification

```
GET /trigger_events?id=in.(470,471,472,473)&select=id,event_name,event_category
```

| id | event_name | event_category |
|---|---|---|
| 470 | identity_graph.updated | state_change |
| 471 | customer_attributes.refreshed | signal |
| 472 | customer_journey.stage_entered | state_change |
| 473 | customer_journey.exited | lifecycle |

All four trigger_events now carry a non-empty enum value; B9 partial-fail is cleared.

CDP domain_regulations re-read confirms 4 existing rows (regulation_ids 1, 3, 33, 55).

### UI spot-check links

- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/domain_regulations
