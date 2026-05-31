---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 27
---

# CSM — Audit History

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- Current footprint: 3 full modules (CSM-CASE-MGMT id 112, CSM-ENTITLEMENTS id 113, CSM-KNOWLEDGE id 114); 3 catalog masters (customer_cases, customer_entitlements, csat_responses); 14 DMDO rows total; 3 capabilities (all cross-cutting: AI-TRIAGE-CLASSIFICATION, SLA-MGMT, KNOWLEDGE-MGMT); 6 solutions (4 primary + 1 secondary + 1 partial); 3 regulations (DSA, TCPA, ADA); 6 trigger events on CSM masters; 10 outbound + 53 inbound cross-domain handoffs (63 total); 0 intra-domain handoffs; 4 roles (3 Customer-Service-scoped + 1 cross-functional Customer-Success); 3 system skills + 25 skill_tools links.
- Vendor-surface basis: Zendesk, Salesforce Service Cloud, ServiceNow CSM, Freshdesk, Intercom (5 pure-plays / suite-aligned leaders). All currently linked in `solution_domains`.
- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 11 items.
- Structural pass: A1 passes (all 7 metadata fields populated). A2 passes (3 capabilities, all cross-cutting). A3 passes (6 solutions, coverage_level set on every row, 4 primary). **A4 fails** (catalog_tagline and catalog_description both empty). M1-M7 pass except M-band semantic concerns surfaced in Bucket 2. B1-B7 pass; **B9 has a mis-attributed trigger event** (id 94 `payment.failed` bound to customer_cases); **B10b fails hard** (10/10 outbound rows + ~53 inbound rows have NULL module FKs); B9b not applicable (no expected cross-module progressions). C1 passes minimum bar (1 owner row, no contributors). E1-E5 pass. F1-F5 pass. F7 passes (notify_person used, no channel-primitive misuse). **H1 partial** (15 of 63 cross-domain handoffs carry APQC tags ~ 24% coverage; many high-value rows untagged).
- Domain Semantius score (strict): 23/25 = **92%**. Gap: 2 external compute tools on csm_case_mgmt_agent (`classify_text` id 53, `detect_sentiment` id 55), both optional.

### Vendor-surface basis

Pure-play and suite-aligned leaders chosen to cover the full case-management lifecycle plus omnichannel engagement and knowledge: Zendesk (pure-play SaaS; canonical case/ticket schema, omnichannel inbox, satisfaction ratings, macros, triggers); Salesforce Service Cloud (suite-aligned; entitlements, milestones, service contracts, swarming, knowledge); ServiceNow CSM (enterprise B2B case management; install base, special handling notes, major-issue management); Freshdesk (mid-market; tickets, solutions/KB, automations, agent groups); Intercom (conversational support; live conversations, inbox, custom workflows). All five are already loaded in `solution_domains`. Ada (secondary) and Salesforce Agentforce (partial) round out the AI/automation surface.

### Pass 3 — Neighbor discovery

Auto-derived from `handoffs` rows on either side (source or target = CSM) and cross-domain DMDOs.

| Neighbor | Outbound | Inbound | Edge weight | Pairwise depth |
|---|---:|---:|---:|---|
| SUB-MGMT | 5 | 7 | 12 | full 5-section diff |
| CRM | 4 | 2 | 6 | full 5-section diff |
| PROD-MGMT | 0 | 5 | 5 | summary |
| SMM | 0 | 3 | 3 | summary |
| OMS | 0 | 3 | 3 | summary |
| FSM | 0 | 3 | 3 | summary |
| CCAAS | 0 | 2 | 2 | one-line |
| CDP | 1 | 1 | 2 | one-line |
| INS-CLAIMS | 0 | 3 | 3 | summary |
| HC-PATIENT | 0 | 2 | 2 | one-line |
| BANK-OPS, TELCO-BSS, INV-MGMT, PS-LIC, VET-PRACT-MGMT, KMS, CONV-AI, MDM, B2C-COMM, UTIL-OPS, RE-PROP-MGMT, MSP-PSA, CLM, AP-AUTO, ACCT-PLAN | mixed | 1 each | 1 | one-line |

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 | `domains.catalog_tagline` and `catalog_description` are both empty on the CSM row (id 30). | Draft both fields per Rule #20 buyer voice (workflow + value), surface to user BEFORE writing. Single sentence tagline + 1-3 short paragraphs describing case capture, omnichannel triage, knowledge-assisted resolution, and entitlement-bound SLA. |
| B1-S2 | B4 | Pattern-flag re-evaluation owed on `customer_entitlements` (104), `csat_responses` (105), `customer_events` (111). 104 has all three flags `false`; 105 has only `has_personal_content=true`; pattern fit suggests 104 likely has `has_single_approver=true` for activation/suspension, 105 likely has `has_submit_lock=true` (responses are immutable once captured). | Re-evaluate each master against the three flags. Where the audit answers `true`, PATCH the flag. Where the answer is `false`-after-review, record the answer in this audit (not in `notes` per Rule #15). |
| B1-S3 | B11 | `customer_subscriptions` (106) and `customer_events` (111) have zero alias rows despite being non-self-explanatory in the support context. customer_subscriptions has vendor synonyms (`service contract`, `support entitlement contract`); customer_events has synonyms (`case timeline event`, `interaction event`). | Author 4 aliases (2 per data_object), bundle into a focused loader. |
| B1-S4 | B12 | `customer_cases.resolved` (workflow-gate, requires_permission=true) and `customer_cases.closed` (workflow-gate) both have empty `permission_verb_override`. Auto-derive will produce `resolve_customer_cases` and `close_customer_cases` (plural-verbs against the entity name). The actual permissions in the catalog already use the singular form (`csm-case-mgmt:resolve_customer_case`, `csm-case-mgmt:close_customer_case` per the loaded permissions). | PATCH `permission_verb_override='resolve_customer_case'` on state id-for-resolved and `permission_verb_override='close_customer_case'` on state id-for-closed so re-derivation stays consistent. |
| B1-S5 | C1 | `business_function_domains` has exactly 1 row for CSM (Customer Service / owner). No contributor or consumer rows despite the heavy cross-functional touch points (IT owns KB authoring tooling and platform; Sales/Customer Success consumes case-health signals and entitlement metadata). | Add `Information Technology` (contributor: platform admin, knowledge authoring tooling), `Customer Success` (consumer: health-score signal, churn-risk feed). |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | `trigger_events` row 94 (`event_name='payment.failed'`) has `data_object_id=103` (customer_cases). The event name is payment-shaped; the publishing master is on SUB-MGMT's side (likely customer_invoices id 107 or a payment-specific entity). The single handoff using this event (id 72, SUB-MGMT to CSM, payload customer_cases) is symptomatic: source side fires `payment.failed` to open a CSM case. Two distinct concepts collapsed into one row. | Either (a) PATCH `trigger_events.data_object_id` to point at the publisher master (customer_invoices id 107 on SUB-MGMT side) and rename for clarity, or (b) split into a publisher event (`customer_invoice.payment_failed` keyed on SUB-MGMT master) plus optionally a CSM-side `customer_case.payment_dispute_opened` if there is a distinct CSM lifecycle gate. Affects B9 (source attribution) and B10b (resolves source_module_id derivation for handoff 72). |
| B1-B2 | B10b: 10 of 10 outbound CSM handoff rows have NULL `source_domain_module_id` (rows 70, 73, 77, 224, 233, 234, 486, 487, 488, 489). CSM has 3 modules; the NULL is a backfill defect, not a legitimate "not yet modularized" state. | Run the B10b derivation per the SKILL.md spec: the source module is the CSM module that holds `trigger_events.data_object_id` with the strongest role. customer_cases-keyed events route to CSM-CASE-MGMT (id 112); customer_entitlements-keyed events route to CSM-ENTITLEMENTS (id 113). Pattern after [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts). |
| B1-B3 | B10b inbound (CSM's own target_module_id derivation): every inbound handoff with payload `customer_cases` should route target_module_id to CSM-CASE-MGMT (id 112); inbound with payload `customer_entitlements` to CSM-ENTITLEMENTS (id 113). Same NULL-everywhere shape (~53 rows). | Same loader extends to the target side. Rows are derived deterministically from `handoffs.data_object_id` against CSM DMDO masters. |

#### APQC TAGGING

CSM's cross-domain handoff set is large (63 total: 10 outbound + 53 inbound). Existing APQC coverage: 15 tags across the set (~24%), composed of 5 `agent_curated`/`discovery_override` rows on outbound and ~10 on inbound vertical-industry "opens case" handoffs. Per the H-band volume target (0.5N to 0.8N new `agent_curated` tags), 30+ new tags would be expected. Tagging the full set across 53+ inbound handoffs is more work than a single audit should carry; this entry collapses the action under one B1 line and asks the user whether to (a) tag the heaviest neighbors now (SUB-MGMT pair + CRM pair), (b) tag everything, or (c) defer to Discover.

| ID | Action | Scope |
|---|---|---|
| B1-H1 | Author `agent_curated` `handoff_processes` rows for untagged CSM cross-domain handoffs. Recommended PCF anchor for case-routing rows is process_id=196 (`Manage customer service problems, requests, and inquiries`, external_id 10388, L3); for entitlement / health-decline rows process_id=6 (`Manage Customer Service`, external_id 20085, L1) or its L3 children. Industry-specific "opens case" rows (insurance_claim → customer_case, patient_appointment → customer_case, banking_case → customer_case, etc.) cluster under process 196 with vertical-specific L4 children where they exist. | Subject to Bucket 2 #4 scoping decision; default proposed: tag the 12 SUB-MGMT-pair rows + 6 CRM-pair rows + the 10 outbound rows = 28 new tags in this loop. |

#### Boundary findings per neighbor (pairwise reconciliation)

##### SUB-MGMT (edge weight 12, full 5-section diff)

CSM masters: customer_cases (103), customer_entitlements (104), csat_responses (105). SUB-MGMT masters customer_subscriptions (106), customer_invoices (107), usage_records (108), dunning_events (110). CSM consumes customer_subscriptions (required, both CSM-CASE-MGMT and CSM-ENTITLEMENTS); SUB-MGMT consumes customer_entitlements via handoff payload on row 489.

| Section | Finding |
|---|---|
| 1. Existing handoffs fully wired | Zero. Every existing row has NULL on at least one module FK side (B10b defect, covered by B1-B2/B1-B3). |
| 2. Existing handoffs with NULL module FK | All 12 rows in this pair (CSM→SUB-MGMT: 224, 233, 234, 489; SUB-MGMT→CSM: 65, 72, 193, 194, 195, 493, 494, 496). Per the deterministic derivation, every CSM-side outbound on customer_entitlements payload (489) routes source_module_id to CSM-ENTITLEMENTS (113); customers-payload rows (224, 233, 234) route to whichever CSM module masters `customers`. **Problem**: no CSM module masters `customers` (customers is mastered in CRM-ACCT-MGT id 46); CSM only consumes it. Per B10b sub-case 1 the rows then route to the CSM module that holds the strongest role on customers (consumer + required in both CSM-CASE-MGMT and CSM-ENTITLEMENTS). The tie breaks NULL per the spec; ambiguity surfaces here as a B1 BOUNDARY finding the user must resolve (pick one). |
| 3. Missing handoffs the catalog implies | Two candidates: (a) SUB-MGMT publishes `customer_entitlement.depleted` (event 488) outbound to CSM is already covered; however, SUB-MGMT should also subscribe to CSM's `csat_response.detractor` (event 491) for churn-risk feeding into the renewal motion, no row exists. (b) SUB-MGMT should subscribe to CSM's `customer_entitlement.expired` (event 489) symmetrically. The current set has CSM publishing to SUB-MGMT on customer_entitlements but no symmetric subscription back from SUB-MGMT for the cancel-and-replace flow. |
| 4. Boundary integrity | No B5 defects; every cross-referenced data_object has a canonical master (customer_subscriptions in SUB-MGMT-SUBSCRIPTIONS id 167; customers in CRM-ACCT-MGT id 46). |
| 5. Cross-domain `data_object_relationships` | Existing: row 448 (`customer_subscriptions provisions customer_entitlements`). MISSING-RELATIONSHIP candidate: `customer_invoices opens customer_cases` (mirror of handoff 72 once trigger_event 94 is fixed) — row already exists at id 449 (`customer_invoices opens customer_cases`). MISSING-RELATIONSHIP candidate: `customer_subscriptions cancels customer_entitlements` mirror for SUB-MGMT cancel events; no row found. |

Verdict: 1 ambiguous B10b case (customers-payload outbound) needs user pick; 2 missing-handoff candidates; 1 missing-relationship candidate.

##### CRM (edge weight 6, full 5-section diff)

CRM masters customers (97), crm_opportunities (100), customer_attributes (114). CSM consumes customers in 2 modules; CRM is also a target for CSM-published events (4 outbound rows targeting CRM).

| Section | Finding |
|---|---|
| 1. Existing handoffs fully wired | 1 row partially wired: row 70 (CSM→CRM on customers via `case.critical_health_drop` event 24), `target_domain_module_id=46` (CRM-ACCT-MGT), `source_domain_module_id=null`. |
| 2. Existing handoffs with NULL module FK | CSM→CRM rows 70, 486, 487, 488 all NULL on source. Per B10b: event-keyed routing for customer_case events to CSM-CASE-MGMT; for customer/health-score events the same `customers`-not-mastered-in-CSM ambiguity as the SUB-MGMT pair. **CRM→CSM inbound (rows 70, 71, 470)** all have NULL target_module_id; payload customer_entitlements routes to CSM-ENTITLEMENTS (113); payload crm_opportunities (row 470) has no CSM module mastering crm_opportunities, so the target should be whichever CSM module declares a `consumer` role on crm_opportunities. No such DMDO row exists today (CSM does not consume crm_opportunities in any module's DMDO set). This is a B5 boundary integrity gap: handoff 470 has no receiving DMDO; either author the consumer row on CSM-CASE-MGMT (typical: opportunity won spawns onboarding case) or drop the handoff. |
| 3. Missing handoffs | One candidate: `csat_response.detractor` (event 491) outbound to CRM-ACCT-MGT for account-health update. The CRM side typically captures CSAT signals into the account-360 view. |
| 4. Boundary integrity | B5 defect on handoff 470 (crm_opportunities payload landing on CSM with no consumer DMDO). |
| 5. Cross-domain `data_object_relationships` | row 429 (`customers raises customer_cases`) already present. row 446 (`crm_opportunities is activity context for customer_cases`) present. row 430 (`customers holds customer_entitlements`) present. No missing-relationship candidate; CRM-side relationships are well covered. |

Verdict: 1 B5 boundary gap (handoff 470), 1 missing-handoff candidate, plus the source-NULL ambiguity from the SUB-MGMT pair.

##### Lighter neighbors (summary)

| Neighbor | Verdict |
|---|---|
| PROD-MGMT (weight 5) | All 5 inbound rows have NULL target_module_id (B10b). No missing-handoff candidate; product-feedback flowing into CSM cases is well-mapped. Subscriber side: payloads `product_features`, `product_releases`, `beta_programs`, `customer_feedback_items`, `product_metrics`. None of these are CSM masters; consumer DMDOs would need to be authored on CSM-CASE-MGMT if any are workflow-bearing. Surface as Bucket 2 question. |
| SMM (weight 3) | 3 inbound (social_messages, social_mentions) opening customer_cases. NULL target_module_id on all 3. Routing target = CSM-CASE-MGMT (deterministic). |
| OMS (weight 3) | 3 inbound (order_allocations, return_authorizations, sourcing_decisions) opening customer_cases. Same routing fix; same per-row APQC L3 anchor (process 196). |
| FSM (weight 3) | 3 inbound (dispatch_records, field_visits, service_work_orders) opening customer_cases. Routes to CSM-CASE-MGMT. |
| INS-CLAIMS (weight 3) | 3 inbound, vertical-specific. All open customer_cases. Routes to CSM-CASE-MGMT. APQC anchor: process 196 plus an INS-specific L4 child if present. |
| CCAAS (weight 2) | 2 inbound (support_sessions escalating into customer_cases). Routes to CSM-CASE-MGMT. Worth noting: support_sessions is mastered in CCAAS; CSM has no consumer DMDO on support_sessions today, so B5 ambiguity recurs. |
| CDP (weight 2) | 1 outbound + 1 inbound. Outbound: `case.created` → CDP-customer_events junction. Inbound: customer_attributes refresh. |
| All other weight-1 neighbors (BANK-OPS, TELCO-BSS, KMS, CONV-AI, MDM, B2C-COMM, HC-PATIENT, PS-LIC, UTIL-OPS, RE-PROP-MGMT, MSP-PSA, CLM, AP-AUTO, ACCT-PLAN, INV-MGMT, VET-PRACT-MGMT) | All inbound rows open customer_cases on the CSM side; deterministic routing target = CSM-CASE-MGMT. No per-neighbor diff worth surfacing beyond the B10b backfill action. |

### Bucket 2 — Surface-for-user (judgment calls)

1. **`customers`-payload handoffs source_module_id ambiguity.** Rows 224, 233, 234 (CSM → SUB-MGMT on customers payload) and rows 486, 487, 488 (CSM → CRM on customers payload) carry events keyed against `customers` (a data_object CSM does not master, only consumes). The deterministic B10b derivation breaks at the "no candidate" sub-case. Options: (a) leave NULL and accept that customer-keyed outbound rows from CSM have no clean source module attribution, (b) pick CSM-CASE-MGMT as the canonical source by convention because the outbound event reflects case-driven health signals, (c) introduce a `customer_health_signals` data_object mastered in CSM-CASE-MGMT and re-key the trigger events to it. Independent of Bucket 3.

2. **B5 cross-domain integrity (handoff 470, CRM crm_opportunities → CSM).** Handoff 470 (CRM → CSM on `crm_opportunity.closed_won` carrying crm_opportunities payload) lands on a CSM that has no consumer DMDO for crm_opportunities. Options: (a) author the consumer DMDO row on CSM-CASE-MGMT (typical pattern: closed-won spawns onboarding case in CSM), (b) move the handoff target to CRM-internal or to ACCT-PLAN, (c) drop the handoff. Same shape for handoff 226 (CCAAS support_sessions escalating into CSM with no CSM consumer DMDO on support_sessions) and the 5 PROD-MGMT inbound rows.

3. **Cross-cutting capability missing.** CSM has 3 cross-cutting capabilities (AI-TRIAGE-CLASSIFICATION, SLA-MGMT, KNOWLEDGE-MGMT) and zero domain-specific. Every CSM solution explicitly markets case-capture-and-routing, omnichannel-engagement, CSAT-capture, and agent-assist as flagship features. Today these are implicit in the modules (CSM-CASE-MGMT covers them) but unrepresented at the capability layer. Options: (a) add CSM-CASE-MGMT-ROUTING, CSM-OMNICHANNEL-ENGAGEMENT, CSM-AGENT-ASSIST as domain-prefixed capabilities, (b) accept that the cross-cutting capabilities adequately represent CSM's surface, (c) introduce one or two new cross-cutting capabilities (`OMNICHANNEL-ENGAGEMENT`, `CSAT-NPS`) that would also light up CCAAS, CRM, and Marketing automation domains.

4. **APQC tagging scope.** Bucket 1 H1 lists 28 candidate `agent_curated` rows (SUB-MGMT + CRM + outbound) as the recommended default. Options: (a) tag those 28 rows now, (b) tag the full 48-row gap (every untagged cross-domain handoff touching CSM), (c) defer to Discover. The default fit's the per-audit volume target (0.5N to 0.8N of N=63).

5. **CSM-KNOWLEDGE module has no master.** CSM-KNOWLEDGE (114) holds knowledge_articles as `contributor + required` and customer_cases as `consumer + optional`. No DMDO with `role=master`. Per Rule #14 the module-without-master is allowed only for leadership-tier domains; CSM is not leadership-tier. Options: (a) accept as-is and document the rationale (CSM-KNOWLEDGE is editorial / authoring view onto ITSM-mastered knowledge_articles, a thin module by design), (b) demote CSM-KNOWLEDGE to `module_kind='starter'` so it's not counted toward the M-band floor (lossy: capability KNOWLEDGE-MGMT would lose its sole realizing module), (c) introduce a CSM-specific master like `customer_knowledge_articles` (audience-filtered editions of ITSM articles) and re-anchor the module. Note: M-band passes today on a structural read, but the semantic shape is unusual.

6. **Pattern flag re-evaluation outcomes (B4).** Working set: customer_entitlements (104), csat_responses (105), customer_events (111). Likely answers: (a) 104 has `has_single_approver=true` for activation/upgrade (specific support ops persona signs off) — flip to true; (b) 105 has `has_submit_lock=true` (responses are immutable once captured) — flip to true; (c) 111 has all three `false` — accept as-is. User to confirm before B1-S2 PATCH lands.

7. **Pairwise reconciliation scheduling.** Five neighbors at edge weight ≥3 (SUB-MGMT, CRM, PROD-MGMT, SMM, OMS, FSM, INS-CLAIMS) were summarized inline (the heaviest two with the full 5-section diff). Options: (a) accept the inline summary, (b) schedule full reconciliation passes on SUB-MGMT and CRM as separate Validate runs with corresponding audit-section appends on those domains' files.

### Bucket 3 — Phase 0 pending (speculative; vendor-research vetting needed)

| # | Candidate entity | Proposed module | Vendor evidence |
|---|---|---|---|
| 1 | `case_comments` | CSM-CASE-MGMT | Universal (Zendesk: ticket_comments, Salesforce: case_comments, ServiceNow: customer_communications, Freshdesk: ticket_conversations, Intercom: conversation_parts). |
| 2 | `case_attachments` | CSM-CASE-MGMT | Universal across all five vendors. |
| 3 | `installed_products` | CSM-ENTITLEMENTS | ServiceNow CSM install_base, Salesforce Service Cloud assets. Anchors product-specific entitlement scope. |
| 4 | `service_contracts` | CSM-ENTITLEMENTS | Salesforce service_contracts (distinct from entitlements: a contract aggregates many entitlements). ServiceNow has explicit support_contracts. May overlap legal_contracts already consumed; vetting needed. |
| 5 | `sla_definitions` (and `sla_milestones`) | CSM-ENTITLEMENTS | Salesforce milestones, ServiceNow sla_definitions/sla_clocks. SLA configuration distinct from entitlement scope. Currently SLA-MGMT capability has no first-class data_object. |
| 6 | `macros` (or `agent_quick_replies`) | CSM-CASE-MGMT | Zendesk macros, Salesforce quick_text, Intercom macros. Agent productivity primitive. |
| 7 | `escalation_rules` | CSM-CASE-MGMT | Salesforce escalation_rules, ServiceNow escalation_definitions, Freshdesk SLA-based escalations. Declarative routing. |
| 8 | `support_queues` (or `agent_groups`) | CSM-CASE-MGMT | Universal: Zendesk groups, Salesforce queues, ServiceNow assignment_groups, Freshdesk groups. |
| 9 | `service_calendars` (or `support_business_hours`) | CSM-ENTITLEMENTS | Universal: Zendesk business_hours, Salesforce business_hours, ServiceNow schedules. Anchors SLA clock pause/resume. |
| 10 | `csat_surveys` (the survey config, distinct from `csat_responses`) | CSM-CASE-MGMT | Salesforce surveys, Zendesk satisfaction_surveys. The response is the run; the survey is the template. |
| 11 | `omnichannel_sessions` (CSM-side consumer of CCAAS support_sessions) | CSM-CASE-MGMT | Salesforce Service Cloud Voice / Digital Engagement, Zendesk Talk + Chat + Messaging, Intercom inbox. Today CSM has no consumer DMDO on CCAAS-mastered support_sessions (Bucket 2 #2 boundary concern). Authoring this consumer DMDO would close the B5 gap. |

### Cross-bucket dependencies

- **Bucket 2 #1 (customers source-module ambiguity)** depends on Bucket 3 #11 (omnichannel_sessions). Choosing option (c) on Bucket 2 #1 (introduce `customer_health_signals` as a CSM master) would change the source-module derivation for the affected rows; this overlaps modeling territory with omnichannel_sessions consumer. Resolve Bucket 3 #11 first if going down that path.
- **Bucket 2 #2 (B5 integrity)** is partially resolved if Bucket 3 #11 lands (CSM consumer DMDO on support_sessions closes handoff 226). Bucket 3 #11 should be resolved before Bucket 2 #2 final disposition.
- **Bucket 2 #3 (capability shape)** is independent of Bucket 3 but affects M6's coverage breadth: adding `OMNICHANNEL-ENGAGEMENT` as a cross-cutting capability would surface CCAAS-CSM-CRM linkage at the capability layer.
- **Bucket 2 #5 (CSM-KNOWLEDGE master)** depends on Bucket 3 #1, #6, #8 (case_comments, macros, support_queues could re-anchor CSM-CASE-MGMT and indirectly free CSM-KNOWLEDGE to demote without losing capability coverage).
- **Bucket 2 #4 (APQC scope)** is independent of Bucket 3; orthogonal to entity work.
- Bucket 1 items are independent of Buckets 2 and 3 except B1-B1 (trigger_event 94 fix), which the Bucket 2 #1 decision may inform if the user picks option (c).

### Per-bucket prompts

- **After Bucket 1:** "Apply these 9 fixes now? Reply `all`, a comma-separated subset (e.g. `1, 3, 5`), or `skip`. Note: B1-S1 (catalog UX) and B1-H1 (APQC tagging) need user input before the loader runs; the rest are deterministic."
- **After Bucket 2:** "What's your call on each of 1 through 7? I'll wait for a per-item decision before authoring."
- **After Bucket 3:** "Vet Bucket 3 via formal Phase 0 vendor research, or eyeball-mode? If eyeball, name which candidates ring true and they become Bucket 1 items in the next pass."

### Report-only follow-ups (owed by other domains)

| Owing domain | Check | Detail |
|---|---|---|
| CRM | B10b inbound (target_module_id on CRM's side for CSM-published rows 70, 486, 487, 488) | CRM is the target; deriving target_domain_module_id = CRM-ACCT-MGT (46) per the strongest-role rule (CRM masters customers in module 46). Surfaces on CRM's next audit. |
| SUB-MGMT | B10b inbound (target_module_id on SUB-MGMT for CSM-published rows 224, 233, 234, 489) | target_domain_module_id = SUB-MGMT-SUBSCRIPTIONS (167) for customer_subscriptions / customer_entitlements payloads. Surfaces on SUB-MGMT's audit. |
| PROD-MGMT | B8 outbound relationships | 5 inbound handoffs from PROD-MGMT (rows 992, 996, 998, 1003, 1007, 1010) to CSM. PROD-MGMT owes the outbound relationship rows (PROD-MGMT master "alerts" CSM customer_cases). Verify on PROD-MGMT's next audit. |
| CCAAS | B8 outbound relationship + handoff 226 boundary | CCAAS publishes support_sessions escalations into CSM; relationships already exist (rows 450); but support_sessions has no consumer DMDO on CSM side (Bucket 2 #2). |
| SUB-MGMT | trigger_event 94 ownership | If B1-B1 is fixed by re-anchoring `payment.failed` to a SUB-MGMT master (customer_invoices or payment), SUB-MGMT may need a corresponding lifecycle state on that master. SUB-MGMT audit pass will catch it. |
| CRM | B9 candidate (`csat_response.detractor` to CRM-ACCT-MGT) | Surfaces as missing outbound from CSM in the pairwise diff; CRM's audit may confirm desire to subscribe. Author on CSM side after CRM confirms. |
| SUB-MGMT | B9 candidates (subscribe to csat_response.detractor and customer_entitlement.expired) | Surfaces in CSM pairwise diff with SUB-MGMT. SUB-MGMT decides whether to author the consumer DMDOs that would close these. |
| All weight-1 vertical neighbors (BANK-OPS, TELCO-BSS, INS-CLAIMS, HC-PATIENT, PS-LIC, UTIL-OPS, RE-PROP-MGMT, MSP-PSA, INV-MGMT, VET-PRACT-MGMT) | B10b on each side's outbound source_module_id | These inbound rows all need source_module_id derived on the source side (each vertical's audit). They will be obvious from the source domain's outbound view because every row sets `data_object_id` equal to the source master. |

### `domains.notes` pointer (if updated)

_not yet written; will require user-approved wording per Rule #15_
