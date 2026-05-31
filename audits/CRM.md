---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 29
---

# CRM, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 5 full modules (`CRM-ACCT-MGT` 46, `CRM-LEAD-MGT` 47, `CRM-PIPELINE-MGT` 48, `CRM-ACTIVITY` 49, `CRM-AI-COPILOT` 50) plus 2 starter modules hosted via `domain_module_host_domains` (`REAL-ESTATE-AGENT` 153 primary host RE-BROKERAGE; `HVAC-SVC-MGMT` 171 primary host FSM). 6 masters (`customers` 97, `crm_contacts` 98, `crm_leads` 99, `crm_opportunities` 100, `pipeline_stages` 101, `sales_activities` 102). 9 capabilities (including cross-cutting `CUSTOMER-360` 310). 25 solution_domains rows (12 primary, 1 secondary, 2 partial across diversified-suite slots of the Salesforce stack plus 11 pure-play primaries). 33 trigger_events. 28 outbound + 49 inbound cross-domain handoffs (77 cross-domain total). 4 intra-domain cross-module handoffs (1191, 1192, 1193, 1194). 12 aliases. 24 lifecycle states across 5 of 6 masters (`pipeline_stages` has 0 states, config-shape exemption noted). 5 CRM-module system skills (157, 158, 159, 160, 161) plus 1 legacy domain-level `crm-system` skill (41) flagged for retirement. 49 `skill_tools` rows in CRM proper (strict Semantius score approximately 84% with 8 `external` tool links concentrated on generative AI, sentiment, transcription, and calendar primitives). 4 CRM roles in Sales function (SALES-AE 10014, SALES-SDR 10015, SALES-MGR 10016, SALES-OPS 10017) plus 3 cross-functional roles (SALES-LISTING-AGENT 10098, SALES-BUYER-AGENT 10099, DESIGNATED-BROKER 10101) that bridge via the REAL-ESTATE-AGENT starter. 2 regulations: GDPR + CPRA.
- **Vendor-surface basis (Pass 2 flagship enumeration):** Salesforce Sales Cloud, HubSpot Sales Hub, Microsoft Dynamics 365 Sales, Zoho CRM, Pipedrive, Freshsales, Oracle Sales Cloud (Fusion), SAP Sales Cloud, SugarCRM, Insightly CRM, Creatio Sales, Copper CRM, Close, Pega Sales Automation, plus Nimble and Capsule on the SMB tier. Compliance-specialist coverage anchored on GDPR and CPRA (loaded) with broader candidates LGPD (Brazil), PIPEDA (Canada), TCPA (US telemarketing on outbound calling), and CAN-SPAM (US bulk-email constraints on the activity layer) surfaced in Bucket 3.
- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 13 items.

**Neighbor discovery** (auto-derived from outbound + inbound handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| SALES-ENG | 2 | 6 | 0 | 0 | 8 | Pairwise (full) |
| FARMER-DIRECT-SALES | 5 | 2 | 0 | 4 (csa_memberships, wholesale_orders, butcher_orders, farmers_market_sales) | 11 | Pairwise (full) |
| CSM | 3 | 3 | 1 (customer_entitlements) | 1 (subscriptions adjusts dunning) | 8 | Pairwise (full) |
| MA | 1 | 4 | 0 | 0 | 5 | Pairwise (full) |
| CPQ | 2 | 2 | 1 (sales_quotes consumer on CRM-PIPELINE) | 1 (drafts legal_contracts) | 6 | Pairwise (full) |
| SUB-MGMT | 1 | 3 | 1 (customer_subscriptions consumer on CRM-ACCT-MGT) | 1 (adjusts dunning) | 6 | Pairwise (full) |
| B2C-COMM | 2 | 3 | 0 | 0 | 5 | Pairwise (full) |
| REV-INTEL | 3 | 1 | 0 | 0 | 4 | Pairwise (full) |
| PROD-MGMT | 0 | 3 | 1 (product_features consumer on CRM-ACCT-MGT) | 4 (impacted_by product_features / product_releases / tracked_by product_metrics / monitored_in beta_programs) | 8 | Pairwise (full) |
| CLM | 1 | 1 | 1 (legal_contracts consumer on CRM-PIPELINE) | 2 (drafts, renewal_warns) | 5 | Pairwise (full) |
| CDP | 1 | 1 | 1 (audience_segments consumer on CRM-ACCT-MGT) | 0 | 3 | Pairwise (full) |
| CCAAS | 0 | 2 | 1 (contact_records consumer on CRM-ACCT-MGT) | 0 | 3 | Pairwise (full) |
| MDM | 0 | 2 | 2 (customer_golden_records + merge_rules consumer on CRM-ACCT-MGT) | 1 (resolves to customers) | 5 | Pairwise (full) |
| FSM | 0 | 2 | 0 | 2 (customer_sites, service_contracts via HVAC starter) | 4 | Pairwise (full) |
| PRM | 0 | 2 | 0 | 0 | 2 | Lightweight |
| OMS | 0 | 2 | 2 (return_authorizations + store_pickup_orders consumer on CRM-ACCT-MGT) | 0 | 4 | Pairwise (full) |
| AGENCY-MGMT | 1 | 1 | 1 (agency_retainers consumer on CRM-ACCT-MGT) | 0 | 3 | Pairwise (full) |
| PSA | 1 | 1 | 1 (service_projects consumer on CRM-ACCT-MGT) | 0 | 3 | Pairwise (full) |
| SALES-PERF | 2 | 0 | 0 | 0 | 2 | Lightweight |
| SMM | 0 | 2 | 0 | 0 | 2 | Lightweight |
| LOYALTY | 0 | 1 | 1 (loyalty_tiers consumer on CRM-ACCT-MGT) | 0 | 2 | Lightweight |
| CONV-AI | 0 | 1 | 1 (intent_detections consumer on CRM-LEAD-MGT) | 0 | 2 | Lightweight |
| WORK-MGMT | 1 | 0 | 0 | 0 | 1 | Lightweight |
| ERP-FIN | 1 | 0 | 0 | 0 | 1 | Lightweight |
| RE-BROKERAGE | 0 | 1 | 0 (starter host only) | 0 | 1 | Lightweight |
| RET-STORE | 0 | 1 | 1 (mystery_shopper_records consumer on CRM-ACCT-MGT) | 0 | 2 | Lightweight |

**Structural pass bands:** A passes (A1 has all 7 metadata fields populated, A2 has 9 capabilities, A3 has 25 solutions with coverage_level on every row). S1 catches one anomaly (no `business_function_capabilities` overrides loaded; vacuously passes since no capability diverges from the Sales owner). **M7 hard-fails within-domain** (`CRM-AI-COPILOT` carries `contributor + required` rows on 6 of the 6 CRM masters that are mastered in sibling modules; M7 rejects master-coexisting-with-contributor in the same domain). M1, M2, M4, M5, M6 pass (capability CUSTOMER-360 realized by CRM-ACCT-MGT per the module description; assumed). **B9 partial-fail** (trigger_event 462 `pipeline_stage.configured` carries empty `event_category`). **B9b partial-fail** (only 4 intra-domain handoff rows on a 5-module domain; CRM-AI-COPILOT consumes 6 sibling-mastered masters and AI-COPILOT-targeted intra-domain handoffs are likely under-modeled, see B1-S3). **B10b partial-fail** (17 outbound rows have NULL `target_domain_module_id` plus 38 inbound rows have NULL `source_domain_module_id`, the latter belongs to source-domain audits per asymmetry rule). **B11 PASS** (every master has aliases except those obviously self-explanatory; 12 alias rows across all masters). **B12 partial-fail** (`sales_activities` has 5 lifecycle states loaded while `data_objects.notes` says config-shape exemption with no per-row workflow, the note and the loaded states contradict). **E2 advisory** (5 duplicate `role_modules` rows for SALES-LISTING-AGENT, SALES-BUYER-AGENT, and DESIGNATED-BROKER on CRM-ACCT-MGT and CRM-LEAD-MGT, likely from the REAL-ESTATE-AGENT starter load). **E3 PASS** (no NULL `interaction_level`). **F1 hard-fail** (legacy domain-level `crm-system` skill 41 with `domain_id=69, domain_module_id=null` remains alongside the 5 module-level skills, Rule #17 says retire). **F2, F3, F4 PASS** (each of 5 modules has exactly 1 system skill with ≥1 skill_tools, all tool `operation_kind` ↔ `data_object_id` pairings valid). **F7 partial-fail** (CRM-ACTIVITY skill 160 links `send_email` as `required` with empty `notes` and `create_calendar_event` as `required` with empty notes; per F7 generic notification-shaped links must justify why `notify_person` cannot substitute or PATCH to the abstraction). **H1 hard-fail** (14 of 77 cross-domain handoffs tagged: 8 `discovery_substring`, 3 `discovery_override`, 3 `agent_curated`; **zero `record_status='approved'`**; 63 untagged; volume target 38, 62 agent_curated proposals). Rule #15 notes-pollution exists on 2 data_objects (`pipeline_stages` 101 explains the B12 config-shape exemption; `sales_activities` 102 explains an exemption while still carrying 5 lifecycle states); both notes were auto-populated at load time, B2-S2 surfaces the user choice.

CRM Semantius score (strict, CRM proper): approximately **84%** (approximately 41 / 49 `skill_tools` on `coverage_tier='platform'`). The gap is concentrated in 8 external tools across the 5 module skills: `classify_text` (158 + 161), `detect_sentiment` (159 + 161), `generate_text` (159 + 161), `transcribe_audio` (160), `create_calendar_event` (160). Operational score lifts to roughly **84%** still since none of the externals are at `integration` tier yet (every external is `external`).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 (hard fail), within-domain incoherence** | `CRM-AI-COPILOT` (50) declares `role='contributor', necessity='required'` on the 6 CRM masters that are mastered in sibling CRM modules: customers (97, master in 46), crm_contacts (98, master in 46), crm_leads (99, master in 47), crm_opportunities (100, master in 48), pipeline_stages (101, master in 48), sales_activities (102, master in 49). M7's within-domain incoherence test: same `data_object_id` has `role='master'` in module A AND `role IN ('consumer','contributor')` in module B of this domain = hard fail. AI-COPILOT is an orchestration / overlay surface; it operates **on top of** the canonical masters rather than mastering shells of them. The agent default is DELETE the 6 contributor rows: AI-COPILOT consumes the canonical master via the platform's reference resolution; it does not need separate DMDO contributor rows for orchestration tools. The alternative is PROMOTE each contributor row to `embedded_master` (if the user wants CRM-AI-COPILOT to be standalone-deployable without the rest of the CRM module set). The embedded-master path is weak for AI-COPILOT specifically: a standalone AI copilot with no opportunities to act on does not have a workflow story. Surface as B2-S1 for architectural choice; on user approval of DELETE, proceed in Bucket 1. | DELETE 6 `domain_module_data_objects` rows on `(domain_module_id=50, role='contributor')`: (50, 97), (50, 98), (50, 99), (50, 100), (50, 101), (50, 102). |
| B1-S2 | **B9 missing event_category** | trigger_event 462 `pipeline_stage.configured` carries empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`). Description says "stage definition created or modified", so the correct category is `signal` (configuration emission to downstream consumers) or `state_change` (the stage record itself transitions). Stages are config-shaped and "configured" reads as a configuration emission, not a per-record state machine. | PATCH trigger_event 462 `event_category` = `signal`. |
| B1-S3 | **B9b partial fail, missing intra-domain cross-module handoffs** | A 5-module domain has only 4 intra-domain handoffs loaded, and all 4 fire on `crm_lead.converted` (1191, 1192, 1193) and `crm_opportunity.closed_won` (1194). Expected from the master relationship graph and the lifecycle state machine: (a) CRM-PIPELINE-MGT → CRM-ACTIVITY on `crm_opportunity.created` (162) since each new opportunity seeds an activity log entry, (b) CRM-LEAD-MGT → CRM-ACTIVITY on `crm_lead.qualified` (70) or `crm_lead.scored_above_threshold` (160) since lead qualification produces follow-up activity, (c) CRM-PIPELINE-MGT → CRM-ACCT-MGT on `crm_opportunity.stage_changed` (86) updating customer health, (d) CRM-PIPELINE-MGT → CRM-ACTIVITY on `crm_opportunity.requires_quote` (85) which triggers an outreach activity, (e) CRM-ACTIVITY → CRM-PIPELINE-MGT on `meeting.no_show` (166) which may bump the opportunity back a stage. **CRM-AI-COPILOT is intentionally excluded from intra-domain handoffs** because the AI orchestration layer subscribes to module events rather than firing its own (per the standard AI-copilot architecture). | Author 5 intra-domain handoff rows with `source_domain_id=target_domain_id=69`, `integration_pattern='lifecycle_progression'` for (a), (b), (c); `integration_pattern='event_stream'` for (d) and (e); `friction_level='low'`. All 5 use existing trigger_event ids (162, 70 or 160, 86, 85, 166). |
| B1-S4 | **B12 contradiction on sales_activities** | `sales_activities` (102) has 5 lifecycle states loaded (`scheduled`, `in_progress`, `completed`, `no_show`, `cancelled`) while `data_objects.notes` says "Config-shaped; intra-row state ... is a single status field and does not justify a permission gate." The note contradicts the loaded state machine: 5 states with workflow-meaningful transitions is not config-shape. Either the states are correct and the note is wrong (the activity master IS workflow-bearing) or the states should be retired into a single status field. Recommend keeping the states (matches market practice: activity has real lifecycle for cadence / dialer / SLA tooling) and reverting the note per Rule #15. The current note is auto-populated and contradicts the loaded data, so the catalog's primary signal is the state machine, not the note. | PATCH `data_objects.notes` for id 102 to empty string; preserves the 5 lifecycle states; remove the false config-shape claim. (See B2-S2 for `pipeline_stages` 101 separately, that note may genuinely reflect a config-shape exemption.) |
| B1-S5 | **B10b in-scope (CRM owns the source side on these outbound NULLs)** | 17 outbound handoffs from CRM publish to a target domain with NULL `target_domain_module_id` (target-side gap, owed by the target domain's audit per asymmetry rule). CRM's own `source_domain_module_id` is populated on every outbound row (CRM-ACCT-MGT 46, CRM-LEAD-MGT 47, CRM-PIPELINE-MGT 48). The 17 rows: 61 (CPQ), 71 (CSM customer_entitlements), 76 (CDP customer_events), 81 (SALES-ENG sales_cadences), 85 (MA crm_contacts), 200 (SALES-ENG), 201 (REV-INTEL), 202 (SALES-PERF), 203 (SALES-PERF), 341 (AGENCY-MGMT), 469 (CLM), 470 (CSM crm_opportunities), 471 (SUB-MGMT), 472 (ERP-FIN), 473 (REV-INTEL), 527 (CPQ), 528 (REV-INTEL). | Report-only routing, see "Report-only follow-ups". No in-scope fix from CRM. |
| B1-S6 | **B10b in-scope (CRM owns the target side on these inbound NULLs)** | 38 inbound handoffs into CRM have CRM-side `target_domain_module_id` populated correctly on every row (CRM's B10b target side is clean). The 38 rows with NULL `source_domain_module_id` are the source domains' B10b gap, not CRM's. | Report-only routing, see "Report-only follow-ups". No in-scope fix from CRM. |
| B1-S7 | **E2 advisory, duplicate role_modules rows (5 duplicates)** | 5 duplicate `role_modules` rows on CRM-ACCT-MGT (46) and CRM-LEAD-MGT (47), both at `interaction_level='secondary'`: SALES-LISTING-AGENT (10098) twice on 46 and twice on 47; SALES-BUYER-AGENT (10099) twice on 46 and twice on 47; DESIGNATED-BROKER (10101) twice on 46. Likely a duplicate insert during the REAL-ESTATE-AGENT starter load (the same three roles are linked through the starter's host junction; the bridging rows on the CRM full modules duplicated). | DELETE one of each duplicate pair. 5 surgical DELETEs by `(role_id, domain_module_id)` pair where multiple rows exist; preserve a single row per pair. |
| B1-S8 | **F1 hard-fail, legacy domain-level system skill** | `crm-system` skill (41) sits at `domain_id=69, domain_module_id=null, skill_type=system`. Per Rule #17 the per-module skills (157, 158, 159, 160, 161) are the catalog target; the legacy `crm-system` row predates the modularization and is obsolete. | DELETE skill 41 (and any orphan `skill_tools` rows that depend on it; verify first). |
| B1-S9 | **F7 partial fail, channel-primitive justification missing** | CRM-ACTIVITY skill (160) links `send_email` as `required` (tool 11) and `create_calendar_event` as `required` (tool 24) both with empty `notes`. Per F7: rows with empty notes on channel primitives fail; the row either needs a workflow-specific justification (e.g. "tracked email sends are the activity record's data" for send_email) or must be PATCHed to `notify_person`. For CRM-ACTIVITY specifically the email IS the workflow: sales_emails (123) is a contributor on the module, and the activity record captures the email itself as a structured payload. Calendar events: a sales meeting IS a calendar event from a workflow-shape standpoint. Recommend per-row B2-S3 wording approval to capture the F7 justification on both rows. | Either route: (a) supply user-approved `skill_tools.notes` for the 2 rows (B2-S3) recording the channel-as-workflow rationale, or (b) PATCH `tool_id` on both rows to `notify_person`. Recommendation: keep send_email + create_calendar_event with user-approved notes; the activity-log workflow is built around them. |

#### APQC TAGGING (Bucket 1, high-confidence proposals from the structural pass)

Only 14 of 77 cross-domain handoffs carry `handoff_processes` rows (8 `discovery_substring`, 3 `discovery_override`, 3 `agent_curated`). **Zero `record_status='approved'`.** Volume expectation per H1: 0.5N to 0.8N for N=77 → 38 to 62 agent_curated tags. The audit proposes the following candidates from the structural pass mental model. PCF lookups are needed at fix time; the candidate row names and confidence ratings are the structural-pass output.

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | confidence |
|---|---|---|---|---|---|
| 61 | CRM-PIPELINE → CPQ | `crm_opportunity.requires_quote` | `crm_opportunities` | Develop and manage sales proposals, bids, and quotes (11779 L3) | confident L3 |
| 71 | CRM-PIPELINE → CSM | `crm_opportunity.closed_won` | `customer_entitlements` | Develop and manage customer accounts (10003 or child) | confident L3 |
| 76 | CRM-PIPELINE → CDP | `crm_opportunity.stage_changed` | `customer_events` | Manage customer experience / Develop and manage customer accounts | medium |
| 81 | CRM-PIPELINE → SALES-ENG | `crm_opportunity.assigned` | `sales_cadences` | Sell products and services (10004 child) | confident L3 |
| 85 | CRM-ACCT-MGT → MA | `crm_contact.synced` | `crm_contacts` | Develop and manage marketing plans (10101 child) | confident L3 |
| 137 | CRM-PIPELINE → PSA | `crm_opportunity.closed_won` | `crm_opportunities` | Manage projects (10101) or Initiate engagement | confident L3 |
| 175 | CRM-PIPELINE → WORK-MGMT | `crm_opportunity.closed_won` | `crm_opportunities` | Manage projects (child) | medium |
| 200 | CRM-LEAD-MGT → SALES-ENG | `crm_lead.scored_above_threshold` | `crm_leads` | Validate and qualify leads/opportunities (18115 L4) - parent L3 likely "Develop and manage sales partners" or "Sell products" | confident L3 |
| 201 | CRM-PIPELINE → REV-INTEL | `crm_opportunity.closed_lost` | `crm_opportunities` | Analyze sales performance (child of 10006) | confident L3 |
| 202 | CRM-PIPELINE → SALES-PERF | `crm_opportunity.created` | `crm_opportunities` | Forecast sales (child of 10005) or pipeline tracking | confident L3 |
| 203 | CRM-ACCT-MGT → SALES-PERF | `account.tier_changed` | `customers` | Establish territories and quotas (child of 10005) | confident L3 |
| 341 | CRM-PIPELINE → AGENCY-MGMT | `crm_opportunity.won` | `agency_jobs` | Sell products and services / Initiate engagement | confident L3 |
| 469 | CRM-PIPELINE → CLM | `crm_opportunity.closed_won` | `crm_opportunities` | (existing `agent_curated` row at 10004 L1 "Market and Sell Products and Services"; promote to L3) | confident L3 |
| 470 | CRM-PIPELINE → CSM | `crm_opportunity.closed_won` | `crm_opportunities` | Develop and manage customer accounts (10003 child) | confident L3 |
| 471 | CRM-PIPELINE → SUB-MGMT | `crm_opportunity.closed_won` | `crm_opportunities` | Process customer orders / Manage subscriptions | confident L3 |
| 472 | CRM-PIPELINE → ERP-FIN | `crm_opportunity.closed_won` | `crm_opportunities` | Process revenue accounting (10796 or child) | confident L3 |
| 473 | CRM-PIPELINE → REV-INTEL | `crm_opportunity.stage_changed` | `crm_opportunities` | Analyze sales pipeline / Forecast revenue | confident L3 |
| 527 | CRM-ACCT-MGT → CPQ | `account.tier_changed` | `customers` | Set sales territory rules / pricing (child of 10005) | medium |
| 528 | CRM-PIPELINE → REV-INTEL | `deal_risk.escalated` | `crm_opportunities` | Analyze sales performance / Risk surfacing | confident L3 |
| 1213 | CRM-ACCT-MGT → FARMER-DIRECT-SALES | `customer.churn_confirmed` | `customers` | Manage customer accounts (child of 10003) | confident L3 |
| 1214 | CRM-ACCT-MGT → FARMER-DIRECT-SALES | `customer.signed_up` | `customers` | Develop and manage customer accounts (10003) | confident L3 |
| 1215 | CRM-ACCT-MGT → FARMER-DIRECT-SALES | `account.tier_changed` | `customers` | Develop and manage customer accounts (10003) | confident L3 |
| 1216 | CRM-ACCT-MGT → FARMER-DIRECT-SALES | `account_health.declined` | `customers` | Manage customer service problems, requests, and inquiries (10388) | confident L3 |
| 1217 | CRM-ACCT-MGT → FARMER-DIRECT-SALES | `health_score.declined` | `customers` | Manage customer service problems, requests, and inquiries (10388) | confident L3 |
| 60 | MA → CRM-LEAD-MGT | `crm_lead.qualified` | `crm_leads` | Validate and qualify leads/opportunities (18115) | confident L3 |
| 64 | SUB-MGMT → CRM-ACCT-MGT | `subscription.activated` | `customers` | Manage customer accounts (10003 child) | confident L3 |
| 66 | B2C-COMM → CRM-ACCT-MGT | `customer.signed_up` | `customers` | Develop and manage customer accounts (10003) | confident L3 |
| 68 | CDP → CRM-ACCT-MGT | `profile.lifecycle_changed` | `customers` | (existing `discovery_substring` at 10285 spend profile, mismatch; REPLACE with Develop and manage customer accounts L3) | medium |
| 70 | CSM → CRM-ACCT-MGT | `case.critical_health_drop` | `customers` | (existing `discovery_override` at 10388 L3 "Manage customer service problems" looks reasonable; keep, promote to `agent_curated`) | confident L3 |
| 82 | SALES-ENG → CRM-ACTIVITY | `call.completed` | `sales_activities` | (existing `discovery_substring` at 20110 product recalls, mismatch; REPLACE with Sell products and services / Activity tracking) | medium |
| 83 | SALES-ENG → CRM-PIPELINE | `deal_insight.captured` | `crm_opportunities` | Sell products and services / Capture sales intelligence | medium |
| 84 | MA → CRM-LEAD-MGT | `nurture.completed` | `crm_leads` | Develop and manage marketing plans (10101 child) | confident L3 |
| 88 | SMM → CRM-LEAD-MGT | `social_lead.captured` | `crm_leads` | Develop and manage marketing plans (child) | confident L3 |
| 196 | SUB-MGMT → CRM-ACCT-MGT | `subscription.downgraded` | `customer_subscriptions` | Manage customer accounts (10003 child) | confident L3 |
| 204 | CPQ → CRM-PIPELINE | `quote.expired` | `crm_opportunities` | (existing `discovery_substring` at 11779 L3 "Develop and manage sales proposals" looks reasonable; keep, promote to `agent_curated`) | confident L3 |
| 205 | SALES-ENG → CRM-ACTIVITY | `sales_cadence.completed` | `sales_cadences` | Sell products and services / Manage outreach cadences | confident L3 |
| 206 | SALES-ENG → CRM-ACTIVITY | `meeting.no_show` | `sales_activities` | (existing `discovery_substring` at 12878 "Plan and manage meetings", reasonable; promote to `agent_curated`) | confident L3 |
| 207 | REV-INTEL → CRM-PIPELINE | `deal_risk.escalated` | `crm_opportunities` | Analyze sales performance / Risk surfacing | confident L3 |
| 211 | PRM → CRM-PIPELINE | `co_sell.opportunity_created` | `crm_opportunities` | Develop and manage sales partners (10401 or child) | confident L3 |
| 212 | PRM → CRM-LEAD-MGT | `partner_referral.qualified` | `crm_leads` | Develop and manage sales partners (child) | confident L3 |
| 227 | CONV-AI → CRM-LEAD-MGT | `intent.identified` | `intent_detections` | Identify and manage prospects (child of 10004) | medium |
| 231 | LOYALTY → CRM-ACCT-MGT | `tier.upgraded` | `loyalty_tiers` | Manage customer loyalty programs (child of 10003) | confident L3 |
| 269 | MDM → CRM-ACCT-MGT | `customer_golden_record.created` | `customers` | Master data management / Customer accounts (10003) | confident L3 |
| 308 | RE-BROKERAGE → CRM-LEAD-MGT | `real_estate_listing.qualified` | `crm_leads` | (existing `agent_curated` at 18115 L4 "Validate and qualify leads/opportunities"; keep as-is) | confident L4 (parent 18115) |
| 323 | B2C-COMM → CRM-ACCT-MGT | `commerce_order.placed` | `commerce_orders` | Process customer orders (child of 10004) | confident L3 |
| 329 | B2C-COMM → CRM-ACCT-MGT | `payment.declined` | `payment_transactions` | (existing `discovery_override` at 10862 L4 "Process and distribute payments"; promote to `agent_curated`) | confident L4 |
| 363 | FARMER-DIRECT-SALES → CRM-ACCT-MGT | `csa_membership.activated` | `customers` | Develop and manage customer accounts (10003) | confident L3 |
| 365 | FARMER-DIRECT-SALES → CRM-ACCT-MGT | `csa_share_pack.delivered` | `csa_share_packs` | Deliver products and services / Order fulfillment | medium |
| 474 | SALES-ENG → CRM-ACTIVITY | `sales_email.replied` | `sales_emails` | Sell products and services / Manage outreach cadences | confident L3 |
| 475 | SALES-ENG → CRM-ACTIVITY | `call_recording.transcribed` | `call_recordings` | Sell products and services / Capture sales intelligence | confident L3 |
| 483 | CPQ → CRM-PIPELINE | `sales_quote.accepted_by_buyer` | `sales_quotes` | Develop and manage sales proposals (11779) | confident L3 |
| 486 | CSM → CRM-ACCT-MGT | `health_score.declined` | `customers` | Manage customer service problems (10388) | confident L3 |
| 487 | CSM → CRM-ACCT-MGT | `case.created` | `customer_cases` | (existing `discovery_override` at 10388; promote to `agent_curated`) | confident L3 |
| 488 | CSM → CRM-ACCT-MGT | `subscription.expansion_requested` | `customers` | Develop and manage customer accounts (10003 child) | confident L3 |
| 490 | SUB-MGMT → CRM-ACCT-MGT | `subscription.upgraded` | `customer_subscriptions` | Process customer orders / Manage subscriptions | confident L3 |
| 501 | CCAAS → CRM-ACCT-MGT | `contact_record.captured` | `contact_records` | Manage customer service (10388 or child) | confident L3 |
| 507 | MA → CRM-LEAD-MGT | `crm_lead.scored_above_threshold` | `crm_leads` | Validate and qualify leads/opportunities (18115) | confident L3 |
| 509 | MA → CRM-LEAD-MGT | `nurture_journey.completed` | `crm_leads` | Develop and manage marketing plans (child) | confident L3 |
| 512 | SMM → CRM-ACCT-MGT | `social_engagement.recorded` | `customers` | Develop and manage marketing plans (10101 child) | confident L3 |
| 514 | AGENCY-MGMT → CRM-ACCT-MGT | `agency_retainer.depleted` | `agency_retainers` | Develop and manage customer accounts (10003) | medium |
| 522 | CLM → CRM-PIPELINE | `renewal.30_day_warning` | `legal_contracts` | (existing `agent_curated` at 10401 L3 "Measure customer satisfaction" looks weak; REPLACE with Manage sales partners / Renewal motion) | medium |
| 530 | CCAAS → CRM-ACCT-MGT | `intent.identified` | `contact_records` | Manage customer service (10388 child) | confident L3 |
| 716 | MDM → CRM-ACCT-MGT | `merge_rule.published` | `merge_rules` | Master data management / Customer accounts | confident L3 |
| 936 | RET-STORE → CRM-ACCT-MGT | `mystery_shopper_record.submitted` | `mystery_shopper_records` | Measure customer satisfaction (10401 child) | medium |
| 962 | FARMER-DIRECT-SALES → CRM-ACCT-MGT | `delivery_route.dispatched` | `delivery_routes` | Deliver products / Order fulfillment | medium |
| 964 | FARMER-DIRECT-SALES → CRM-ACCT-MGT | `harvest_forecast.updated` | `harvest_forecasts` | Plan and manage supply chain | medium |
| 989 | OMS → CRM-ACCT-MGT | `return_authorization.received` | `return_authorizations` | Manage returns / Process customer orders | confident L3 |
| 994 | OMS → CRM-ACCT-MGT | `store_pickup_order.created` | `store_pickup_orders` | Process customer orders | confident L3 |
| 1000 | PROD-MGMT → CRM-ACCT-MGT | `feature_request.shipped` | `feature_requests` | Develop and manage products / Capture feedback | confident L3 |
| 1002 | PROD-MGMT → CRM-ACCT-MGT | `product_feature.released` | `product_features` | Develop and manage products / Capture feedback | confident L3 |
| 1005 | PROD-MGMT → CRM-ACCT-MGT | `product_line.launched` | `product_lines` | Develop and manage products / Marketing handoff | confident L3 |
| 1013 | CPQ → CRM-PIPELINE | `quote_discount.applied` | `quote_discounts` | Develop and manage sales proposals (11779) | confident L3 |
| 1129 | PSA → CRM-ACCT-MGT | `service_project.completed` | `service_projects` | (existing `discovery_substring` at 10083 L4 "Assign resources" likely wrong; REPLACE with Manage customer accounts) | medium |
| 1261 | FSM → CRM-ACCT-MGT | `service_pm_schedule.overdue` | `customers` | Manage service delivery / Maintenance | medium |
| 1262 | FSM → CRM-ACCT-MGT | `customer_site.activated` | `customers` | Manage service delivery / Customer site lifecycle | confident L3 |

75 candidate APQC tags total (63 net NEW + 6 REPLACE candidates + 6 KEEP-and-promote of `discovery_*` to `agent_curated`). The PCF id column requires `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` lookups at fix time; the structural pass produced the proposed-row names and confidence ratings. None loaded in this audit, all surface for B1-H1 batch loading on approval.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M7 + B9 events + B9b + B12 contradiction + E2 + F1 + F7) | 8 (B1-S1, B1-S2, B1-S3, B1-S4, B1-S7, B1-S8, B1-S9; B1-S5 and B1-S6 are report-only summary lines) |
| BOUNDARY findings per neighbor (see Pass 4) | 0 in-scope mechanical PATCHes derived from pairwise; the deltas all route to other-domain audits |
| APQC TAGGING (H1, high-confidence) | 1 (B1-H1 collapses 75 proposed tags into one APQC tagging line per skill convention) |
| **Bucket 1 total in-scope items** | 9 |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

For each of the 13 heavy neighbors (edge weight ≥3) the 5-section pairwise diff produced the following per-neighbor findings. Section 1 (existing handoffs fully wired) is a sanity check, reported as counts only. Section 2 covers NULL FK candidates (deferred to other domains' audits per B10b asymmetry). Section 3 surfaces missing handoffs the catalog implies. Section 4 surfaces boundary integrity gaps. Section 5 covers cross-domain relationship mirror checks.

**SALES-ENG ↔ CRM (weight 8).** Wired pairs: 8 (CRM→SALES-ENG 81, 200; SALES-ENG→CRM 82, 83, 205, 206, 474, 475). Section 2: 81 and 200 have NULL `target_domain_module_id` (SALES-ENG's B10b); all 6 inbound have NULL `source_domain_module_id` (SALES-ENG's B10b). Section 3: missing handoff candidate CRM-ACTIVITY → SALES-ENG on `sales_email.sent` (no event row yet) for cadence-step completion. Section 4: clean. Section 5: no DMDO between CRM and SALES-ENG today; the activity / cadence boundary may benefit from DMDO consumer rows on either side. Recommend SALES-ENG audit to add `consumer` rows on `sales_activities` (102) and `sales_emails` (123) on the cadence-mastering module.

**FARMER-DIRECT-SALES ↔ CRM (weight 11).** Wired pairs: 7 (CRM→FARMER-DIRECT 1213-1217; FARMER-DIRECT→CRM 363, 365, 962, 964). Section 2: all 5 outbound rows have target_module_id populated (118 or 122); inbound 363, 365 have source_module_id populated (118); inbound 962, 964 populated. Section 3: this is a strong cluster fitting because FARMER-DIRECT-SALES is itself a cluster-domain that aggregates farm-to-table commerce. The 5-out, 4-in saturation is exceptional; no obvious missing rows. Section 4: 4 cross-relationships exist (csa_memberships subscribes_via, wholesale_orders places, butcher_orders places, farmers_market_sales buys_at) all from customers (97). Section 5: clean.

**CSM ↔ CRM (weight 8).** Wired pairs: 6 (CRM→CSM 71, 470; CSM→CRM 70, 486, 487, 488). Section 2: 71 + 470 NULL target_module_id (CSM's B10b); 70, 486, 487, 488 NULL source_module_id (CSM's B10b). Section 3: missing candidate CRM-PIPELINE → CSM on `crm_opportunity.closed_lost` (161) for win-loss handoff to retention motion. Section 4: customer_entitlements (104) is consumer on CRM-PIPELINE; CSM masters it; check entitlements DMDO is healthy (it is). Section 5: clean (subscription dunning relationship 447 exists).

**MA ↔ CRM (weight 5).** Wired pairs: 5 (CRM→MA 85; MA→CRM 60, 84, 507, 509). Section 2: 85 NULL target_module_id (MA's B10b); 60, 84, 507, 509 NULL source_module_id (MA's B10b). Section 3: missing candidate CRM-ACCT-MGT → MA on `customer.churn_confirmed` (206) so suppression rules update marketing audiences. Section 4: no MA DMDO into CRM today; recommend MA audit add consumer DMDO on `customer_subscriptions` (106) or `customers` (97) for the suppression flow. Section 5: clean.

**CPQ ↔ CRM (weight 6).** Wired pairs: 4 (CRM→CPQ 61, 527; CPQ→CRM 204, 483, 1013). Section 2: all 5 rows have at least one NULL side (CPQ's B10b). Section 3: clean (the quote-revision boundary is covered). Section 4: sales_quotes (416) consumer on CRM-PIPELINE; clean. Section 5: cross-rels 514 (drafts legal_contracts) exists; clean.

**SUB-MGMT ↔ CRM (weight 6).** Wired pairs: 4 (CRM→SUB-MGMT 471; SUB-MGMT→CRM 64, 196, 490). Section 2: 471 NULL target_module_id (SUB-MGMT's B10b); inbound 64, 196, 490 NULL source_module_id (SUB-MGMT's B10b). Section 3: missing candidate CRM-PIPELINE → SUB-MGMT on `crm_opportunity.closed_won` (already covered by 471 generically; recommend reviewing whether 471's payload should be `customer_subscriptions` instead of `crm_opportunities`). Section 4: customer_subscriptions (106) consumer on CRM-ACCT-MGT; clean. Section 5: cross-rel 447 exists.

**B2C-COMM ↔ CRM (weight 5).** Wired pairs: 5 (CRM→B2C-COMM 0; B2C-COMM→CRM 66, 323, 329; no outbound, but the B2C-COMM cluster reaches into CRM only inbound). Section 2: 66, 323, 329 all NULL source_module_id (B2C-COMM's B10b). Section 3: missing candidate CRM-ACCT-MGT → B2C-COMM on `customer.churn_confirmed` (206) for marketing-suppression / personalization shutdown. Section 4: commerce_orders (381), payment_transactions (387) consumer on CRM-ACCT-MGT; clean. Section 5: clean.

**REV-INTEL ↔ CRM (weight 4).** Wired pairs: 4 (CRM→REV-INTEL 201, 473, 528; REV-INTEL→CRM 207). Section 2: all 4 NULL (REV-INTEL's B10b on both sides; 207 NULL source). Section 3: missing candidate CRM-PIPELINE → REV-INTEL on `pipeline_health.degraded` (168) for forecast triangulation. Section 4: clean. Section 5: clean.

**PROD-MGMT ↔ CRM (weight 8).** Wired pairs: 3 (PROD-MGMT→CRM 1000, 1002, 1005 inbound only). Section 2: all 3 source_module_id values are populated (130, 131); clean on CRM side. Section 3: missing candidate CRM-ACCT-MGT → PROD-MGMT on `account_health.declined` (169) for product-team escalation when a major customer disengages. Section 4: product_features (403), product_lines (402), feature_requests (406) are all consumer on CRM-ACCT-MGT; clean. Section 5: 4 cross-rels (482, 483, 484, 485) exist (impacted_by, tracked_by, monitored_in).

**CLM ↔ CRM (weight 5).** Wired pairs: 2 (CRM→CLM 469; CLM→CRM 522). Section 2: 469 NULL target_module_id (CLM's B10b, already in CLM's audit per the CLM 2026-05-30 audit's report-only); 522 fully populated on both sides. Section 3: missing candidate CRM-PIPELINE → CLM on `crm_opportunity.requires_quote` (85) for early-stage NDA / MSA seeding. Section 4: legal_contracts (66) consumer on CRM-PIPELINE; clean. Section 5: cross-rel 514 (drafts) and 507 (renewal_warns) exist.

**CDP ↔ CRM (weight 3).** Wired pairs: 2 (CRM→CDP 76; CDP→CRM 68). Section 2: both NULL on the opposite side (CDP's B10b). Section 3: clean. Section 4: audience_segments (113) consumer on CRM-ACCT-MGT; clean. Section 5: clean.

**CCAAS ↔ CRM (weight 3).** Wired pairs: 2 (CCAAS→CRM 501, 530 inbound only). Section 2: both NULL source_module_id (CCAAS's B10b). Section 3: missing candidate CRM-ACTIVITY → CCAAS on `call.completed` (15) for call disposition mirroring. Section 4: contact_records (257) consumer on CRM-ACCT-MGT; clean. Section 5: clean.

**MDM ↔ CRM (weight 5).** Wired pairs: 2 (MDM→CRM 269, 716 inbound only). Section 2: both NULL source_module_id (MDM's B10b). Section 3: missing candidate CRM-ACCT-MGT → MDM on `crm_lead.converted` (1263) so the golden-record cluster sees the merge. Section 4: customer_golden_records (315), merge_rules (319) consumer on CRM-ACCT-MGT; clean. Section 5: cross-rel 480 (resolves to) exists.

**OMS ↔ CRM (weight 4).** Wired pairs: 2 (OMS→CRM 989, 994 inbound only). Section 2: both NULL source_module_id (OMS's B10b). Section 3: missing candidate CRM-ACCT-MGT → OMS on `account.tier_changed` (163) for tier-based fulfillment overrides. Section 4: return_authorizations (427), store_pickup_orders (428) consumer on CRM-ACCT-MGT; clean. Section 5: clean.

**FSM ↔ CRM (weight 4).** Wired pairs: 2 (FSM→CRM 1261, 1262 inbound only). Section 2: 1261 NULL target_module_id (CRM's gap, needs fix; the payload is `customers` 97 which is mastered in module 46, propose patching target_module_id=46); 1262 same. **B1-S10 candidate (in-scope mechanical PATCH):** PATCH handoffs 1261 and 1262 set `target_domain_module_id=46`. Section 3: clean. Section 4: clean. Section 5: customer_sites (821), service_contracts (741) are referenced in the HVAC starter relationships; cross-rels 1219, 1220 exist.

**AGENCY-MGMT ↔ CRM (weight 3).** Wired pairs: 2 (CRM→AGENCY 341; AGENCY→CRM 514). Section 2: 341 NULL target_module_id (AGENCY's B10b); 514 NULL source_module_id (AGENCY's B10b). Section 3: clean. Section 4: agency_retainers (480) consumer on CRM-ACCT-MGT; clean. Section 5: clean.

**PSA ↔ CRM (weight 3).** Wired pairs: 2 (CRM→PSA 137; PSA→CRM 1129). Section 2: 137 fully populated; 1129 fully populated. Section 3: clean. Section 4: service_projects (216) consumer on CRM-ACCT-MGT; clean. Section 5: clean. This is the healthiest boundary in the entire CRM neighbor set.

**Lighter neighbors (weight 1-2, one-line summaries):**

- **PRM ↔ CRM (weight 2).** 2 inbound (211, 212). Both NULL source_module_id (PRM's B10b). Cross-relationship missing for crm_leads ↔ partner_referral_records; consider PRM audit add cross-rel.
- **SALES-PERF ↔ CRM (weight 2).** 2 outbound (202, 203). Both NULL target_module_id (SALES-PERF's B10b). Pipeline-quota relationship implicit, candidate for explicit cross-rel.
- **SMM ↔ CRM (weight 2).** 2 inbound (88, 512). Both NULL source_module_id. Clean otherwise.
- **LOYALTY ↔ CRM (weight 2).** 1 inbound (231). NULL source_module_id (LOYALTY's B10b). loyalty_tiers (265) consumer on CRM-ACCT-MGT; clean.
- **CONV-AI ↔ CRM (weight 2).** 1 inbound (227). NULL source_module_id (CONV-AI's B10b). intent_detections (260) consumer on CRM-LEAD-MGT; clean.
- **WORK-MGMT ↔ CRM (weight 1).** 1 outbound (175). Fully populated. Clean.
- **ERP-FIN ↔ CRM (weight 1).** 1 outbound (472). NULL target_module_id (ERP-FIN's B10b, already known from baseline b2 audit, Phase B never run on ERP-FIN).
- **RE-BROKERAGE ↔ CRM (weight 1).** Starter `REAL-ESTATE-AGENT` hosts on CRM via host junction (primary host RE-BROKERAGE). Inbound 308 fully populated. Relationship is the starter dependency.
- **RET-STORE ↔ CRM (weight 2).** 1 inbound (936). NULL source_module_id (RET-STORE's B10b). mystery_shopper_records (650) consumer on CRM-ACCT-MGT; clean.

**In-scope mechanical PATCH derived from pairwise (Bucket 1):**

- **B1-S10:** PATCH handoffs 1261 and 1262 set `target_domain_module_id=46` (CRM-ACCT-MGT). FSM publishes both events with payload `customers` (97), which is mastered in CRM-ACCT-MGT; CRM's target FK is the in-scope fix. Pairwise Section 2 finding, deterministic patch.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | M7 hard fail, DELETE 6 contributor DMDO rows on CRM-AI-COPILOT (gated on B2-S1 architectural choice) |
| B1-S2 | PATCH trigger_event 462 set `event_category='signal'` |
| B1-S3 | Author 5 new intra-domain cross-module handoff rows |
| B1-S4 | PATCH `data_objects.notes` for id 102 sales_activities to empty (contradicts loaded state machine) |
| B1-S7 | DELETE 5 duplicate role_modules rows |
| B1-S8 | DELETE legacy domain-level system skill `crm-system` (id 41) |
| B1-S9 | F7 fix on CRM-ACTIVITY (send_email + create_calendar_event channel justification, gated on B2-S3) |
| B1-S10 | PATCH handoffs 1261, 1262 set `target_domain_module_id=46` |
| B1-H1 | APQC TAGGING, propose 75 `agent_curated` rows (REPLACE 4 weak `discovery_substring` / `discovery_override` rows, promote 4 reasonable `discovery_*` rows to `agent_curated`, INSERT 67 new) |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M7 architectural choice for CRM-AI-COPILOT deployability.** B1-S1 surfaces 6 contributor DMDO rows on CRM-AI-COPILOT that violate M7. The agent default is DELETE (the 6 rows go away; AI-COPILOT reads via the canonical master references at runtime). The alternative is PROMOTE-to-`embedded_master` (CRM-AI-COPILOT ships standalone-deployable shells of customers, contacts, leads, opportunities, pipeline_stages, sales_activities so the AI copilot is installable without the rest of CRM). The choice depends on whether CRM-AI-COPILOT is intended as a standalone AI offering or strictly as an overlay on existing CRM modules. Market practice (Salesforce Einstein, HubSpot Breeze, Microsoft Copilot for Sales, Zoho Zia) all ship the AI as an overlay tier on a host CRM, not as a standalone product, which argues for DELETE. | Architectural intent + deployability strategy decision; user's call. | (a) DELETE all 6 contributor rows (AI-COPILOT remains a pure overlay). (b) PROMOTE all 6 to embedded_master (standalone AI-copilot story). (c) Mixed (specify per row). |
| B2-S2 | **Rule #15 notes-pollution on `pipeline_stages` (101).** The note "Config-shaped; admin-edited stage definitions, no per-record workflow ..." records the B12 exemption decision. Rule #15 forbids auto-populated notes; the prior Rule #12 license for exemption rationale in `data_objects.notes` is RESCINDED per the current SKILL.md. Was this note user-approved at load time, or was it auto-populated by the loader? If auto-populated, PATCH to empty and surface the exemption decision in this audit file instead. | Cannot tell from audit alone; load-time approval status unknown. | (a) Confirm user-approved at load time, leave in place. (b) Confirm auto-populated, PATCH note to empty string and record the B12 exemption decision in this audit file's Decisions section. |
| B2-S3 | **F7 channel-primitive justification for CRM-ACTIVITY.** `send_email` (tool 11) and `create_calendar_event` (tool 24) are linked on CRM-ACTIVITY skill 160 as `required` with empty `notes`. F7 requires per-row workflow justification or PATCH to `notify_person`. For CRM-ACTIVITY both channels arguably ARE the workflow (the sales email and the sales meeting are themselves activity records). Two routes: (a) supply user-approved wording for `skill_tools.notes` to record the justification, or (b) accept the F7 audit conversation as the record and leave skill_tools clean. | Rule #15 vs F7 boundary judgment; user owns the call. | (a) Supply user-approved `notes` text per the 2 rows. (b) Treat F7 as satisfied via this audit conversation (record decision here, leave skill_tools rows clean). |
| B2-S4 | **B4 pattern-flag positive re-evaluation per Rule #12.** Current flags: customers / crm_contacts / crm_leads have `has_personal_content=true`; crm_opportunities, pipeline_stages, sales_activities all `false`. None has `has_submit_lock=true` or `has_single_approver=true`. Re-eval questions: (a) `crm_opportunities.has_personal_content` should probably be `true` since opportunities can carry deal-specific contact details, negotiation notes, sensitive personal correspondence; (b) `crm_opportunities.has_single_approver` could be `true` for closed-won (one rep / one manager closes the deal), though pipeline approvals are typically multi-stage; (c) `sales_activities.has_personal_content` could be `true` since activities log call recordings and email content; (d) `crm_leads.has_submit_lock` may apply if leads convert to a locked stage. | Pattern flags are workflow-shape judgments the user owns; the audit re-evaluates and proposes, user decides. | Per-flag yes/no from user; capture in Decisions. |
| B2-S5 | **E6 permission-bundle drift.** Current bundles look tier-level coherent: SALES-MGR has `:admin` on all 4 sales modules + `:manage` on AI-COPILOT; SALES-OPS has `:admin` on CRM-ACCT-MGT + CRM-AI-COPILOT and `:manage` on PIPELINE / ACTIVITY / LEAD-MGT. The 2 workflow-gate permissions `crm-pipeline-mgt:close_won` (granted to SALES-AE) and `crm-lead-mgt:convert_lead` (granted to SALES-SDR) are explicitly bundled. None of the implicit `:admin`-expansion gates from `permission_hierarchy` are enumerated. Question: is the implicit-grant pattern intentional for the workflow gates, or should specific gates be explicit on each role (e.g. `close_won` on SALES-MGR is implied by `crm-pipeline-mgt:admin` but not explicit)? | Hierarchy seeding state isn't introspected here; the audit can't tell whether `permission_hierarchy` already expands the gates. | (a) Confirm hierarchy expands gates, leave bundles as-is. (b) Add explicit gate grants. (c) Leave drift as expectation that `permission_hierarchy` covers everything. |
| B2-S6 | **REAL-ESTATE-AGENT and HVAC-SVC-MGMT starter intent on CRM masters.** Per Rule #19 invariant 1, both starters carry CRM-mastered data_objects as `embedded_master`: REAL-ESTATE-AGENT (153) embeds crm_contacts (98), crm_leads (99); HVAC-SVC-MGMT (171) embeds customers (97), crm_contacts (98). The invariant is satisfied (each has a canonical master in a CRM full module). The audit should confirm that the embedded-master path is intentional: should the real-estate agent's contact list integrate with CRM-ACCT-MGT when both are deployed (the demotion path), or is the starter's lite flow intended to remain standalone even when CRM-ACCT-MGT is co-installed? Same question for HVAC. | Editorial / product intent question, the audit can't decide whether the embedded path is intentional or whether the starter should consume the full module. | (a) Starters intentionally embed and the demotion path activates when CRM-ACCT-MGT is co-deployed (standard Rule #19 shape). (b) Starters should consume the full CRM-ACCT-MGT rather than embedded_master (refactor needed). |
| B2-S7 | **Cross-cutting capability CUSTOMER-360 (id 310) ownership.** CUSTOMER-360 is loaded as a capability on CRM (capability_domains row exists), but per the SKILL the cross-cutting-capability convention may want explicit cross-cutting marking. The capability lives in CRM but its semantic spans CRM + CSM + CDP + MDM + MA. Should CUSTOMER-360 be marked as cross-cutting and linked to CRM, CSM, CDP, MDM, MA, or kept CRM-only with downstream domains realizing via their own capabilities? The capability is realized today by CRM-ACCT-MGT (assumed from module description). | Cross-cutting capability convention is a multi-domain authoring choice; the audit can't decide unilaterally. | (a) Promote CUSTOMER-360 to cross-cutting and link to 4-5 domains. (b) Keep CRM-only and let downstream domains author their own capability (CDP's identity-resolution capability, etc.). |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against Salesforce Sales Cloud, HubSpot Sales Hub, Microsoft Dynamics 365 Sales, Zoho CRM, Pipedrive, Freshsales, Oracle Sales Cloud, SAP Sales Cloud, SugarCRM, Insightly, Creatio Sales, Copper, Close, Pega Sales Automation, Nimble, and Capsule. The compliance anchor is GDPR + CPRA (loaded); broader regulatory anchors that should be considered for CRM include LGPD (Brazil), PIPEDA (Canada), TCPA (US telemarketing on outbound calling), CAN-SPAM (US bulk-email constraints), DPDP Act 2023 (India), and CCPA-style state laws like Virginia VCDPA, Colorado CPA. The loaded `domain_regulations` rows cover only GDPR + CPRA, narrower than the flagship vendor surface suggests.

The subagent recipe was not spawned (this is a single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING (10) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `sales_territories` | Salesforce Sales Cloud, Microsoft Dynamics 365, Oracle Sales Cloud, SAP Sales Cloud all model territories as first-class records (named geographies / account segments with assignment rules). Currently no territory master in CRM. Boundary question: SALES-PERF may own territories at the planning layer; CRM owns the operational membership. | CRM-ACCT-MGT (master) or SALES-PERF (master) with CRM consumer |
| `sales_quotas` | Salesforce, Microsoft, Pipedrive, Close all model per-rep quotas distinct from forecasting. Likely owned by SALES-PERF; CRM consumer at most. | SALES-PERF (master), CRM-PIPELINE-MGT consumer |
| `sales_forecasts` | Distinct entity from `pipeline_stages` and `crm_opportunities` aggregates. Salesforce Forecasting and Microsoft Forecasting model forecast records (per-rep, per-period, with adjustment factors). Currently the forecasting capability (CRM-FORECAST) exists but no forecast record entity. | CRM-PIPELINE-MGT (master) |
| `sales_playbooks` | Salesforce Sales Cloud "Playbooks", HubSpot "Playbooks", Outreach "Playbooks" model playbook records as structured guides for sales reps. Currently no playbook entity. | CRM-AI-COPILOT (master) or new module |
| `competitors` | Salesforce Sales Cloud, HubSpot, Pipedrive all support competitor records linked to opportunities. Currently no competitor entity. | CRM-PIPELINE-MGT (master) |
| `competitor_intelligence` | Distinct from competitors (the analysis records vs. the entities). Salesforce CRM Analytics, HubSpot Sales Hub maintain competitor intelligence as structured records. | CRM-PIPELINE-MGT (master) |
| `lead_assignment_rules` | Salesforce, Microsoft, Pipedrive, Zoho all model lead-assignment rules as first-class records (criteria → owner). Currently no rules entity. | CRM-LEAD-MGT (master, config-shape) |
| `account_hierarchies` | Salesforce account hierarchies, Microsoft parent-child accounts, SAP customer hierarchies all model parent-subsidiary relationships as first-class records. Currently no hierarchy entity (a simple parent_account_id on customers might suffice, but the structured tree is the market practice). | CRM-ACCT-MGT (master or junction) |
| `partner_relationships` (CRM-scoped) | Distinct from PRM-mastered partner records. CRM ships the contact-to-partner-rep links and the opportunity-co-sell records. PRM domain may already master these; the boundary needs clarification. | PRM (master), CRM consumer |
| `commission_records` | Distinct from `sales_quotas`. SAP CallidusCloud, Xactly, Varicent, Salesforce Spiff all model commission records as a master. Likely a separate domain (COMM-MGMT or under SALES-PERF). | SALES-PERF (master) or new domain candidate |

#### MODULARIZATION (2) candidates

- **CRM-FORECAST module candidate.** Currently the CRM-FORECAST capability (249) is folded into CRM-PIPELINE-MGT (48). Salesforce Forecasting, Microsoft Forecasting ship as distinct UX surfaces. If `sales_forecasts` + `sales_quotas` get loaded, a sixth full module (`CRM-FORECAST`) makes more sense than overloading CRM-PIPELINE-MGT. Would push CRM from 5 to 6 full modules.
- **CRM-MARKETING-LIST module candidate.** Many CRM tools (HubSpot, Zoho, Freshsales) ship a marketing-list / segment-management surface that overlaps with CDP's audience_segments. The boundary between CRM-ACCT-MGT consumer on audience_segments and a dedicated CRM marketing-list module is fuzzy; surface to user.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **LGPD (Brazil)** applicability (mandatory for Brazilian data subjects).
- **PIPEDA (Canada)** applicability (mandatory for Canadian commercial relationships).
- **TCPA (US telemarketing)** applicability (mandatory for outbound calling; relevant to CRM-ACTIVITY).
- **CAN-SPAM (US bulk email)** applicability (mandatory for marketing emails; relevant to CRM-ACTIVITY and the MA boundary).
- **DPDP Act 2023 (India)** applicability (mandatory for Indian data subjects).
- **Virginia VCDPA + Colorado CPA + Connecticut CTDPA + Utah UCPA** (state-level US privacy regimes parallel to CPRA).

#### Candidate-domain queue

This audit surfaced 0 domain-tier candidates for `audits/_missing-domains.md`; every MISSING candidate above is an entity / capability extension of CRM (or routes to adjacent domains SALES-PERF, PRM, MA) rather than a new domain.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/CRM-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the candidates to treat as confirmed and we proceed via Phase B inserts).

### Cross-bucket dependencies

- B1-S1 (M7 fix) is **gated on B2-S1**: the DELETE vs PROMOTE choice for the 6 AI-COPILOT contributor rows must come from the user before the M7 fix loads.
- B1-S4 (sales_activities note revert) is **partially gated on B2-S2**: the user's call on whether the note was user-approved at load time. The B1-S4 fix is mechanical, but the B2-S2 answer might reframe whether the revert is needed for both rows or just for the contradictory sales_activities row.
- B1-S9 (F7 channel-primitive) is **gated on B2-S3**: the channel-as-workflow wording the user chooses determines whether B1-S9 is a notes-patch or a tool-PATCH.
- B3 MISSING entities (`sales_forecasts`, `sales_quotas`, `sales_territories`) might inform B2-S7 (CUSTOMER-360 ownership) and reshape the CRM-FORECAST modularization candidate. Calling out per surface-time discipline.
- B2-S6 (starter intent) is **independent** of other buckets but creates work for the RE-BROKERAGE and FSM domain audits if starters need refactoring.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S3, S7, S8, S10, H1-top20`), or `skip`.

- **S1 (M7 hard fail, DELETE or PROMOTE 6 AI-COPILOT contributor rows)** is gated on B2-S1; resolve that first.
- **S2 (event_category PATCH on trigger_event 462)** is trivial; one PATCH.
- **S3 (5 new intra-domain handoffs)** is structural; no other dependencies.
- **S4 (PATCH sales_activities note to empty)** is partially gated on B2-S2.
- **S7 (DELETE 5 duplicate role_modules rows)** is mechanical; 5 surgical DELETEs.
- **S8 (DELETE legacy crm-system skill 41)** is mechanical; verify no orphan skill_tools first.
- **S9 (F7 channel-primitive justification)** is gated on B2-S3.
- **S10 (PATCH handoffs 1261, 1262 set target_module_id=46)** is mechanical; 2 PATCHes.
- **H1 (75 APQC tags including 6 REPLACE and 4 promote candidates)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (M7 architectural choice for AI-COPILOT):** (a) DELETE all 6, (b) PROMOTE all 6 to embedded_master, (c) mixed (specify).
- **B2-S2 (Rule #15 notes-pollution on pipeline_stages):** confirm user-approved at load time or auto-populated; the audit reverts if auto.
- **B2-S3 (F7 send_email and create_calendar_event justification):** (a) supply user-approved wording for 2 skill_tools rows, (b) treat F7 as satisfied via this audit conversation.
- **B2-S4 (pattern flag re-evaluation):** per-flag yes/no on `has_personal_content` for crm_opportunities / sales_activities and `has_single_approver` for crm_opportunities and `has_submit_lock` for crm_leads.
- **B2-S5 (permission-bundle drift):** which option (a / b / c)?
- **B2-S6 (Starter intent):** REAL-ESTATE-AGENT and HVAC-SVC-MGMT embedded path accepted, or refactor?
- **B2-S7 (CUSTOMER-360 cross-cutting):** (a) promote to cross-cutting and link 4-5 domains, (b) keep CRM-only.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** Will surface candidates when the subagent returns. If eyeball-mode, name which of the 10 entity candidates + 6 regulation candidates + 2 modularization candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| SALES-ENG | B10b: populate `target_domain_module_id` on outbound 81, 200; populate `source_domain_module_id` on inbound 82, 83, 205, 206, 474, 475. Add `consumer` DMDOs on `sales_activities` (102), `sales_emails` (123) on the cadence-mastering SALES-ENG module. |
| MA | B10b: populate `target_domain_module_id` on 85; populate `source_domain_module_id` on 60, 84, 507, 509. Consider `consumer` DMDO on `customers` (97) or `customer_subscriptions` (106) for suppression flow. |
| CSM | B10b: populate `target_domain_module_id` on 71, 470; populate `source_domain_module_id` on 70, 486, 487, 488. |
| CPQ | B10b: populate `target_domain_module_id` on 61, 527; populate `source_domain_module_id` on 204, 483, 1013. |
| SUB-MGMT | B10b: populate `target_domain_module_id` on 471; populate `source_domain_module_id` on 64, 196, 490. Verify whether handoff 471 payload should be `customer_subscriptions` (106) instead of `crm_opportunities` (100). |
| B2C-COMM | B10b: populate `source_domain_module_id` on 66, 323, 329. |
| REV-INTEL | B10b: populate `target_domain_module_id` on 201, 473, 528; populate `source_domain_module_id` on 207. |
| PROD-MGMT | B10b: populate `source_domain_module_id` on 1000, 1002, 1005 (CRM side clean). |
| CLM | B10b: populate `target_domain_module_id` on 469 (already known per CLM 2026-05-30 audit's B1-S5 list). |
| CDP | B10b: populate `target_domain_module_id` on 76; populate `source_domain_module_id` on 68. |
| CCAAS | B10b: populate `source_domain_module_id` on 501, 530. |
| MDM | B10b: populate `source_domain_module_id` on 269, 716. |
| OMS | B10b: populate `source_domain_module_id` on 989, 994. |
| FSM | B10b: populate `source_domain_module_id` on 1261, 1262 (CRM-side target_module_id PATCH is in scope via B1-S10). |
| AGENCY-MGMT | B10b: populate `target_domain_module_id` on 341; populate `source_domain_module_id` on 514. |
| PSA | Clean B10b on both 137 and 1129. Healthiest CRM neighbor. |
| PRM | B10b: populate `source_domain_module_id` on 211, 212. |
| SALES-PERF | B10b: populate `target_domain_module_id` on 202, 203. |
| SMM | B10b: populate `source_domain_module_id` on 88, 512. |
| LOYALTY | B10b: populate `source_domain_module_id` on 231. |
| CONV-AI | B10b: populate `source_domain_module_id` on 227. |
| ERP-FIN | B10b: populate `target_domain_module_id` on 472. Phase B may still be pending per the 2026-05-29 b2 baseline audit (no DMDO data). |
| WORK-MGMT | B10b clean on 175. |
| RET-STORE | B10b: populate `source_domain_module_id` on 936. |

## 2026-05-31, Continuation: B1 technical fixes

Subagent pass applying the deterministic, no-judgment subset of Bucket 1 per the standing technical-only filter (PATCH enum backfills, deterministic FK PATCHes, audit-named DELETEs, Rule #15 notes reverts on audit-named rows). Loader: `c:/dev/domain-map/.tmp_deploy/fix_crm_b1_technical_2026_05_31.ts` (executed from project root).

### Applied (5 of 9 B1 items)

| ID | Action | Result |
|---|---|---|
| B1-S2 | PATCH `trigger_events` id=462 set `event_category='signal'` | done; before `''`, after `'signal'` |
| B1-S4 | PATCH `data_objects` id=102 (sales_activities) `notes=''` (Rule #15 revert; audit named the row id and flagged the note as contradictory) | done; before 217 chars, after empty |
| B1-S7 | DELETE 5 duplicate `role_modules` rows (ids 388, 389, 390, 391, 393), keeping the primary or first secondary per pair | done; 5 rows deleted, the 5 keep-rows (287, 288, 291, 290, 297) remain |
| B1-S8 | DELETE legacy domain-level `crm-system` skill (id 41) plus its 7 dependent `skill_tools` rows (423-429) | done; 7 skill_tools + 1 skill removed; no orphan rows |
| B1-S10 | PATCH `handoffs` ids 1261, 1262 set `target_domain_module_id=46` (FSM publishes both events with payload `customers` (97), mastered in CRM-ACCT-MGT) | done; both rows now point at module 46 |

### Deferred (4 of 9 B1 items)

| ID | Reason for deferral |
|---|---|
| B1-S1 | Gated on B2-S1: user must choose DELETE vs PROMOTE for the 6 CRM-AI-COPILOT contributor DMDO rows. Architectural call, not technical. |
| B1-S3 | Audit pre-specifies 5 intra-domain handoff rows but row (b) carries an "or" choice (`crm_lead.qualified` 70 vs `crm_lead.scored_above_threshold` 160). Event-pick is judgment; the whole batch surfaces for user disambiguation. |
| B1-S9 | Gated on B2-S3: user must choose between supplying approved `skill_tools.notes` wording for `send_email` + `create_calendar_event` on CRM-ACTIVITY, or PATCHing both tool_ids to `notify_person`. |
| B1-H1 | 75 APQC tagging candidates; none of the proposed rows pre-specify a resolvable PCF id. Picking among multiple PCF L3/L4 candidates per handoff requires lookup + judgment. Deferred to a dedicated APQC tagging pass. |

B1-S5 and B1-S6 are report-only routing entries (B10b owed by other domains); no CRM-side fix exists for them. They remain in the Report-only follow-ups table above.

No JWT errors during the run. Tenant verified as `ma@adenin.com` / module 1001 before any write.
