---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 32
---

# TELCO-BSS, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

Current footprint:

- Domain id 42, name "Telecommunications OSS/BSS".
- 0 capabilities (A2 hard fail).
- 0 `domain_modules` rows (M1 hard fail, cascades into M2, M4, M6, F2, B10b, E1).
- 4 solutions all `coverage_level='primary'`: ServiceNow Telecommunications Workflows, Amdocs CES, Netcracker Digital BSS, Blue Planet (A3 passes).
- 7 regulations linked (mandatory): Enhanced 911, GDPR, ISO/IEC 27001, NIS2, CSRD, EU Cyber Resilience Act, EU VAT Directive.
- 7 `domain_data_objects` rows, all `role=master, necessity=required, kind=domain_owned`: `telco_service_catalog`, `telco_service_orders`, `telco_subscriptions`, `service_provisioning_workflows`, `network_inventory_records`, `telco_customer_bills`, `service_trouble_tickets`. All sit in the legacy `domain_data_objects` rollup only, none in `domain_module_data_objects` (because no modules exist).
- 7 outbound `handoffs` rows, 0 inbound. All 7 outbound have `source_domain_module_id=NULL` (B10b fail). Targets: CSM (2 rows, both NULL `target_domain_module_id`), ERP-FIN (2 rows, both NULL target FK), ITSM (3 rows, `target_domain_module_id=38`).
- 9 `trigger_events` rows on the 7 masters. All 9 have `event_category=''` (empty string, B9 sub-defect). Two events (`telco_service_order.submitted`, `telco_service_catalog.updated`) have NO `handoffs` row at all.
- 0 `data_object_lifecycle_states` rows on any of the 7 masters (B12 hard fail).
- 0 `data_object_aliases` rows on any of the 7 masters (B11 fail).
- 2 `data_object_relationships` rows: `telco_subscriptions opens customer_cases` and `telco_service_orders opens customer_cases`. Zero intra-domain edges between the 7 masters (B6 fail). Zero `users` edges (B7 fail).
- 1 legacy `skills` row, `id=111, skill_name='telco-bss-system', skill_type='system', domain_id=42, domain_module_id=NULL`. 8 `skill_tools` rows, all `coverage_tier='platform'` (7 `query_*` + `send_email`). Strict score = 8/8 = 100% on the legacy skill, but uncomputable per module under Rule #17 (F2/F3 fail). Naming uses kebab `telco-bss-system` vs. the snake `_agent` convention.
- 0 `domain_aliases` rows.
- 0 `handoff_processes` rows on any of the 7 outbound handoffs (H1 hard fail).
- C-band: 2 `business_function_domains` rows (`Business Operations` owner, `Finance` contributor). Passes C1.
- A1: domains row carries all 7 business-meta fields: `crud_percentage=50`, `business_logic` populated, `min_org_size='40 l <10000'`, `cost_band='$$$$$'`, `certification_required=true`, `usa_market_size_usd_m=3500`, `market_size_source_year=2025`. Passes structurally; however both `description` and `business_logic` contain em-dash characters (U+2014). See Bucket 2 item B2-1.
- A4: `catalog_tagline` and `catalog_description` both empty strings (A4 fail).
- E1: vacuously passes (no modules ⇒ no role authoring possible until M1 lands).

Vendor-surface basis:

Flagship pure-play vendors enumerated for this market are Amdocs (CES), Netcracker (Digital BSS), Blue Planet (Ciena), Ericsson (Charging System, Order Care), Comarch (BSS Suite), and Optiva (Charging Engine). Compliance specialist for E911 / CPNI / STIR-SHAKEN is best represented by Neustar (now TransUnion) and iconectiv; for revenue assurance Subex (HyperSense) and Mobileum (WeDo). TM Forum's eTOM / SID / ODA frameworks are the substrate the entire market self-organizes against, so the modularization proposal in Bucket 2 aligns to eTOM Level 2 process areas: Order, Catalog, Inventory, Provisioning, Billing, Assurance.

- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 13 items.

### Pass 1, Structural

S-band sweep:

S1 (direct FKs to `domains`, for id 42):

| Table | FK column | TELCO-BSS rows | Expected non-zero? | Status |
| --- | --- | --- | --- | --- |
| `business_function_domains` | `domain_id` | 2 | yes | pass |
| `capability_domains` | `domain_id` | 0 | yes | FAIL (A2) |
| `domain_data_objects` | `domain_id` | 7 | yes | pass |
| `domain_modules` | `domain_id` | 0 | yes | FAIL (M1) |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero | pass |
| `domain_regulations` | `domain_id` | 7 | yes | pass |
| `solution_domains` | `domain_id` | 4 | yes | pass |
| `handoffs` | `source_domain_id` | 7 | yes | pass |
| `handoffs` | `target_domain_id` | 0 | usually non-zero | flagged (Bucket 2, possibly leaf-style market) |
| `skills` | `domain_id` | 1 (legacy) | yes after F2 | partial (F1 / F2) |
| `domains` | `parent_domain_id` | 0 | only when sub-domains exist | pass |
| `domain_aliases` | `domain_id` | 0 | optional | flagged (B1-S11) |

S2 (per-module coverage): N/A, zero modules.

S3 (per-master indirect coverage):

| data_object | states | events | aliases | Status |
| --- | --- | --- | --- | --- |
| telco_service_catalog | 0 | 1 | 0 | FAIL (B12 + B11) |
| telco_service_orders | 0 | 2 | 0 | FAIL (B12 + B11) |
| telco_subscriptions | 0 | 2 | 0 | FAIL (B12 + B11) |
| service_provisioning_workflows | 0 | 1 | 0 | FAIL (B12 + B11) |
| network_inventory_records | 0 | 1 | 0 | FAIL (B12 + B11) |
| telco_customer_bills | 0 | 1 | 0 | FAIL (B12 + B11) |
| service_trouble_tickets | 0 | 1 | 0 | FAIL (B12 + B11) |

A-band:

- A1 pass (all 7 fields populated). Caveat: em-dashes in `description` and `business_logic`, Bucket 2.
- A2 FAIL (zero `capability_domains` rows).
- A3 pass (4 solutions, all `coverage_level='primary'`).
- A4 FAIL (both catalog UX fields empty).
- A5 skipped (no vendor-ownership refresh requested).

M-band:

- M1 HARD FAIL. Zero `domain_modules` rows; zero cross-cutting hosts. This blocks every downstream concern (B / C-band partial / E / F / H all degrade because there is no module surface to anchor against).
- M2, M4, M6: vacuously cascading. With zero modules and zero capabilities, neither the capability-to-module nor the module-to-capability bipartite check can run.
- M5: vacuous (no lifecycle states, no `requires_permission`).
- M7 (single-master integrity catalog-wide for the 7 masters): pulled, no conflicts. Each of the 7 masters is mastered only here at the legacy `domain_data_objects` level; no other domain claims `role=master` on them.

B-band:

- B1 pass (7 `master` rows in legacy rollup, not a leadership-tier domain).
- B2 pass (every master has `singular_label` and `plural_label` populated).
- B3 partial: every master uses a `telco_*` or `service_*` / `network_*` prefix, no bare-word collisions. `is_canonical_bare_word=false` on all 7; no rationale needed since names are prefixed.
- B4 partial: all 3 pattern flags are default false on all 7 masters. Audit MUST positively re-evaluate (Rule #12). Surface candidates: `telco_customer_bills` is a candidate for `has_submit_lock=true` (an issued bill is immutable once delivered to the customer); `service_trouble_tickets` plausibly has `has_personal_content=true` (customer narratives in ticket descriptions). Flagged as Bucket 2 in B2-2 modularization step (consider as part of the load).
- B5 vacuous (no embedded_master rows yet).
- B6 FAIL. Zero intra-domain `data_object_relationships` between the 7 masters. Expected edges: `telco_service_orders fulfills_via service_provisioning_workflows`, `telco_subscriptions provisioned_by service_provisioning_workflows`, `telco_service_orders results_in telco_subscriptions`, `telco_subscriptions billed_by telco_customer_bills`, `telco_subscriptions occupies network_inventory_records`, `service_trouble_tickets references telco_subscriptions`, `telco_service_catalog defines telco_service_orders`.
- B7 FAIL. Zero edges from any master to `users`. Each of the 7 masters carries at least one user-typed actor (order agent, billing specialist, network engineer, care agent, provisioning specialist).
- B8 partial: 2 outbound cross-domain `data_object_relationships` rows exist (both to `customer_cases` in CSM). Outbound handoffs to ERP-FIN, ITSM have no mirror rows in `data_object_relationships`.
- B9 partial: 9 trigger_events exist; 7 handoffs cover 7 of the 9 events. Two events have no handoff: `telco_service_order.submitted` (id 1060) and `telco_service_catalog.updated` (id 1068). Also: every trigger_event row has `event_category=''` (empty), violating the enum check (allowed: `lifecycle`, `state_change`, `threshold`, `signal`). Fix routes to a small PATCH loader.
- B9b vacuous (zero modules ⇒ no intra-domain cross-module surface).
- B10 (report-only): zero inbound handoffs from any source domain. Discovery: zero `embedded_master` / `contributor` / `consumer` rows in this domain mean no canonical-owner-elsewhere expectation. Inbound surface is genuinely empty at the catalog level. Likely real gap: TPM / HCM / ERP-FIN / CRM should be publishing events into TELCO-BSS (new customer ⇒ account-create; tariff change ⇒ catalog-update; employee-departure ⇒ subscription-cancel). Listed as report-only follow-ups by owing domain below.
- B10b HARD FAIL. 7 of 7 outbound handoffs have `source_domain_module_id=NULL`. Of those 7, 4 also have `target_domain_module_id=NULL` (2 CSM, 2 ERP-FIN); 3 have `target_domain_module_id=38` (ITSM module `ITSM-INCIDENT-MGMT`). Fix on this side requires M1 first (no source module exists to attribute to). The 4 NULL target FKs route as report-only to CSM and ERP-FIN.
- B11 FAIL. Zero aliases on any of 7 masters. Candidates: `telco_service_catalog` ⇔ "Product Offering Catalog" (TM Forum SID), `telco_subscriptions` ⇔ "Customer Bill Inquiry" / "Service Instance" (TM Forum), `telco_customer_bills` ⇔ "Customer Invoice" (TM Forum), `service_trouble_tickets` ⇔ "Trouble Report" (TM Forum SID), `network_inventory_records` ⇔ "Resource Inventory" (TM Forum).
- B12 HARD FAIL. Zero lifecycle states on any of 7 masters. None of these are config-shaped (each has real workflow: orders accepted/provisioned/completed, subscriptions activated/suspended/cancelled, bills issued/paid/disputed, tickets opened/triaged/resolved/closed).

C-band:

- C1 pass. `Business Operations` owner, `Finance` contributor. Consider adding `Customer Service` as contributor and `IT` as consumer once Bucket 2 modularization lands.
- C2 vacuous (no capabilities).

D-band:

- D1 deferred (audit-time only, not a load).

E-band:

- E1 vacuously passes (no modules ⇒ no `role_modules` floor to satisfy ⇒ no role authoring possible). Will become a real check after Bucket 1 modularization lands; expected personas listed in Bucket 2 item B2-4.
- E2 to E6 all vacuous.

F-band:

- F1 FAIL. Legacy `skills` row id 111 (`telco-bss-system`, `domain_id=42`, `domain_module_id=NULL`, `skill_type='system'`) is the only system skill. Rule #17 wants per-module system skills; the legacy row is a migration target. Cannot retire until F2 (per-module system skills) lands.
- F2 FAIL. Zero `domain_modules` ⇒ zero module-level system skills.
- F3 partial (against legacy skill): 8 `skill_tools` rows exist on skill 111.
- F4 pass against the 8 existing rows. All 7 `query_*` rows have `data_object_id` set; `send_email` (operation_kind `side_effect`) has `data_object_id=NULL`. Pairing invariants hold.
- F5 partial. Legacy skill `strict_score = 8/8 = 100%`. Per-module score is uncomputable per Rule #17 until F2 lands.
- F7 pass (no channel-primitive proliferation; `send_email` is the only channel row, justified for issued-bill delivery and order-status confirmations).

H-band:

- H1 HARD FAIL. 7 cross-domain handoffs (3 to ITSM, 2 to CSM, 2 to ERP-FIN), zero `handoff_processes` rows. Volume expectation per the H-band: 4 to 6 NEW `agent_curated` tags + 1 or 2 deferrals. Authored as a single Bucket 1 item B1-H1 with a 7-row sub-table.

### Pass 2, Market audit (semantic)

Findings categories below. Market surface comes from TM Forum eTOM / SID, plus the public schemas / docs of Amdocs CES, Netcracker Digital BSS, and Blue Planet.

MISSING (against TM Forum SID baseline, by category):

- Convergent charging surface: `usage_event_records` (CDR / EDR / IPDR), `mediation_records`, `rating_engine_sessions`, `convergent_charging_balances`. The domain's `business_logic` literally names "rating engine and online charging system" as the substrate not in CRUD, but the entities that carry the rating output are absent.
- Number / identity inventory: `msisdn_inventories` or `number_inventories`, `sim_inventories`, `esim_profiles`, `imei_records`. Required for any mobile or convergent operator; absent.
- Lifecycle workflows: `port_in_requests` and `port_out_requests` (LNP), `equipment_swap_requests` (device upgrade workflow), `service_change_orders` (typed sub-orders for upgrade / downgrade / suspend / restore).
- Commercial surface: `product_offering_bundles`, `tariff_plans`, `promotions`, `customer_quotes`. The single `telco_service_catalog` master collapses what TM Forum splits into Product Offering, Product Specification, Tariff Plan, Promotion.
- Collections and disputes: `dunning_cases`, `bill_dispute_cases`, `payment_arrangements`. Universal across the 4 enumerated solutions.
- Assurance: `qos_kpi_records`, `sla_credit_records`, `network_alarms` (or routed to TELCO-NMS, see candidate in queue).
- Revenue assurance and fraud: `revenue_assurance_alerts`, `fraud_cases`. Routes to candidate TELCO-RAFM if user promotes that domain; otherwise sits inside TELCO-BSS.

Listed as Bucket 3 below since the entire Phase 0 vendor-surface protocol has not been run for this domain. None have been vetted against schema docs; they are vendor-knowledge candidates, not confirmed gaps.

WRONG-OWNERSHIP: none structurally detected. With zero modules, every existing master sits in the legacy `domain_data_objects` rollup. No misplacement is possible until modules land.

SCOPE-CREEP: none. The 7 mastered entities are all genuinely telco-shaped.

MODULARIZATION ISSUES: M1 itself is the modularization issue. TELCO-BSS needs a module set. Bucket 2 item B2-2 proposes a TM Forum eTOM aligned split (ORDER, CATALOG, PROVISIONING, INVENTORY, BILLING, ASSURANCE, SUBSCRIPTIONS).

### Pass 3, Neighbor discovery

Edges discovered via outbound handoffs (no inbound, no cross-domain DMDO yet):

| Neighbor | Edge weight | Direction | Notes |
| --- | --- | --- | --- |
| ITSM (id 1) | 3 | outbound to module 38 | `service_provisioning.failed`, `service_trouble_ticket.opened`, `network_inventory.updated` all route to `service_incidents` in ITSM-INCIDENT-MGMT. |
| CSM (id 30) | 2 | outbound, both NULL target module | `telco_subscription.suspended`, `telco_service_order.completed`. |
| ERP-FIN (id 65) | 2 | outbound, both NULL target module | `telco_subscription.activated`, `telco_customer_bill.issued`. |

Only ITSM clears the weight-3 threshold for a full pairwise pass; CSM and ERP-FIN get one-line summaries.

### Pass 4, Pairwise reconciliation (ITSM at weight 3; CSM, ERP-FIN summary)

ITSM (target_domain_module_id=38, ITSM-INCIDENT-MGMT):

- Leg 1 (producer master + lifecycle state): TELCO-BSS owns `network_inventory_records`, `service_provisioning_workflows`, `service_trouble_tickets` as masters. None have lifecycle states (B12 fail). Provisional pass on master ownership; lifecycle gates absent.
- Leg 2 (trigger event row): `service_provisioning.failed` (1064), `service_trouble_ticket.opened` (1067), `network_inventory.updated` (1065). All point at TELCO-BSS-mastered data_objects. Each carries `event_category=''` which violates the enum.
- Leg 3 (handoff row with module FKs): 3 rows exist, all with `source_domain_module_id=NULL` (B10b fail; no TELCO-BSS module exists yet) and `target_domain_module_id=38` (correctly attributed on the ITSM side).
- Leg 4 (consumer DMDO on ITSM target): ITSM-INCIDENT-MGMT (id 38) must hold a `consumer` or `contributor` row on data_object_id 47 (`service_incidents`). That is the canonical master in ITSM, so the relationship is "TELCO-BSS publishes events that create ITSM incidents". Live state check would confirm but is symmetric (ITSM owns the consumer side).

Section 5 (cross-domain `data_object_relationships`): no rows tying TELCO-BSS masters to ITSM `service_incidents`. Three MISSING-RELATIONSHIP candidates:

- `network_inventory_records triggers service_incidents`
- `service_provisioning_workflows raises service_incidents`
- `service_trouble_tickets escalates_as service_incidents`

CSM (weight 2 summary): `telco_subscriptions` and `telco_service_orders` both already have `opens customer_cases` edges in `data_object_relationships` (the only 2 non-legacy DOR rows that exist). Handoffs are loaded but both have NULL target module attribution (CSM B10b owes the fix). No reverse cross-domain edges from CSM into TELCO-BSS exist.

ERP-FIN (weight 2 summary): both handoffs (`telco_subscription.activated`, `telco_customer_bill.issued`) carry `data_object_id` pointing at TELCO-BSS masters (the payload is the publisher's master, which is the unusual case noted in B10b's sub-case 2 diagnostic: payload and trigger_event data_object match exactly). No `data_object_relationships` row mirrors these handoffs. ERP-FIN must hold a `consumer` row on `telco_subscriptions` and `telco_customer_bills` in whichever ERP-FIN module realizes AR / billing ingest. Both NULL target_domain_module_id values route as report-only to ERP-FIN.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL (S / A / M / B / F band)

| ID | Band | Finding | Proposed fix |
| --- | --- | --- | --- |
| B1-S1 | A2 | Zero `capability_domains` rows. | Author 5 to 8 capabilities aligned to TM Forum eTOM Level 2: `TELCO-ORDER-MGMT`, `TELCO-CATALOG-MGMT`, `TELCO-PROVISIONING`, `TELCO-INVENTORY-MGMT`, `TELCO-BILLING`, `TELCO-ASSURANCE`, `TELCO-SUBSCRIPTION-MGMT`. Apply Cross-cutting capability convention; some (e.g. `BILLING`) may be flagged as cross-cutting if they show up in CPQ / ERP-FIN. Load via Phase A loader. |
| B1-S2 | M1, M2, M4, M6 | Zero `domain_modules` rows. Hard fail; gates every downstream concern. | Author 5 to 7 full modules following the TM Forum eTOM split. Recommended initial set: `TELCO-BSS-ORDER-MGMT`, `TELCO-BSS-CATALOG`, `TELCO-BSS-PROVISIONING`, `TELCO-BSS-INVENTORY`, `TELCO-BSS-BILLING`, `TELCO-BSS-ASSURANCE`, `TELCO-BSS-SUBSCRIPTIONS`. Carry capabilities from B1-S1; place the 7 existing masters per their natural module. Surface to user as a draft before loading (Bucket 2 item B2-2 carries the modularization shape question). |
| B1-S3 | F2, F3 | Zero per-module system skills (Rule #17). | After B1-S2 lands, author one `skill_type='system'` row per module with `domain_module_id` set and `skill_name='<module_code_lower>_agent'`; each gets 5 to 12 `skill_tools` rows including the existing 7 query tools (re-pointed), plus the existing `send_email` row, plus `notify_person` / `notify_team` for generic notifications, plus mutate tools per master, plus workflow gates per Bucket 1 item B1-S4 lifecycle states. |
| B1-S4 | F1 | Retire legacy `skills` row id 111 (`telco-bss-system`, kebab) after per-module skills land. | DELETE row 111 (also retires its 8 `skill_tools` rows via cascade). Order: B1-S3 first, then B1-S4. |
| B1-S5 | A4 | `catalog_tagline` and `catalog_description` are empty strings (Rule #20). | Draft both fields in buyer voice (workflow + value), surface to user for review BEFORE writing per Rule #20. Do NOT auto-write; backfill is allowed only with explicit per-row user approval of the exact wording. |
| B1-S6 | B12 | Zero lifecycle states on the 7 masters. | Author state machines for each: `telco_service_orders` (submitted, validated, in_provisioning, completed, cancelled), `telco_subscriptions` (pending, active, suspended, cancelled), `service_provisioning_workflows` (queued, executing, completed, failed), `service_trouble_tickets` (opened, triaged, in_repair, resolved, closed), `telco_customer_bills` (draft, issued, paid, disputed, written_off), `network_inventory_records` (planned, deployed, decommissioned), `telco_service_catalog` (draft, published, retired). Mark workflow gates with `requires_permission=true` and set `domain_module_id` per B1-S2's module assignment. |
| B1-S7 | B6 | Zero intra-domain edges between the 7 masters. | Author 7 edges per the list in Pass 1 B6 finding: `telco_service_orders fulfills_via service_provisioning_workflows`, `telco_subscriptions provisioned_by service_provisioning_workflows`, `telco_service_orders results_in telco_subscriptions`, `telco_subscriptions billed_by telco_customer_bills`, `telco_subscriptions occupies network_inventory_records`, `service_trouble_tickets references telco_subscriptions`, `telco_service_catalog defines telco_service_orders`. Load via standard relationship loader; each carries `relationship_verb`, `inverse_verb`, `relationship_type`, `relationship_kind`, `is_required`, `owner_side`. |
| B1-S8 | B7 | Zero `users` edges on the 7 masters (Rule #10). | Author 7 edges from `users` to each master: order agent, billing specialist, network engineer, care agent, provisioning specialist, catalog manager, network inventory custodian. Use existing `users` data_object row (`kind='platform_builtin'`). |
| B1-S9 | B11 | Zero aliases on the 7 masters. | Author 5 to 7 aliases per the TM Forum SID mappings listed in B11 finding above. Surface to user for review before loading (some are buyer-facing labels marketing may care about). |
| B1-S10 | B10b | All 7 outbound `handoffs` have `source_domain_module_id=NULL`. | After B1-S2 modules land, derive per the rule (module that holds the trigger event's data_object with strongest role). Patch via a small loader; modelled on `scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts`. Also: 4 of the 7 still need `target_domain_module_id` (2 to CSM modules, 2 to ERP-FIN modules), but those PATCHes belong to CSM / ERP-FIN audits (report-only here). |
| B1-S11 | B9 | Two trigger events have no handoff row: `telco_service_order.submitted` (1060), `telco_service_catalog.updated` (1068). Also: all 9 trigger_events have `event_category=''` (empty string violates the enum). | (a) Author missing handoffs OR explicitly justify as leaf (`order.submitted` plausibly fires only the internal provisioning workflow, not a cross-domain handoff; `catalog.updated` may fire CSM agent-training and CRM offer-sync handoffs). (b) Patch `event_category` on all 9 rows to one of `lifecycle`, `state_change`, `threshold`, `signal`. Most should be `state_change`. |
| B1-S12 | B11 / domain_aliases | Zero `domain_aliases` rows on the domain itself. | Author 3 to 5 aliases that feed catalog search and agent triggers per Rule #20: "telco BSS", "telecom billing systems", "OSS BSS", "communications service provider platform", "convergent charging". Surface to user before loading. |

#### APQC TAGGING

| ID | Finding | Proposed action |
| --- | --- | --- |
| B1-H1 | All 7 cross-domain handoffs lack any `handoff_processes` row (H1 hard fail; 0% APQC coverage). | Author the 7 rows below as `proposal_source='agent_curated', record_status='new'`. |

Per-handoff PCF tagging table:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 927 | TELCO-BSS -> ITSM | service_trouble_ticket.opened | service_incidents | Triage IT service delivery incidents | 1299 (ext 20903) | L4, confident |
| 928 | TELCO-BSS -> ITSM | service_provisioning.failed | service_incidents | Triage IT service delivery incidents | 1299 (ext 20903) | L4, confident |
| 929 | TELCO-BSS -> ERP-FIN | telco_customer_bill.issued | telco_customer_bills | Invoice customer | 302 (ext 10743) | L3, confident |
| 930 | TELCO-BSS -> CSM | telco_subscription.suspended | telco_subscriptions | Manage customer service problems, requests, and inquiries | 196 (ext 10388) | L3, confident |
| 931 | TELCO-BSS -> CSM | telco_service_order.completed | telco_service_orders | Handle sales order inquiries including post-order fulfillment transactions | 740 (ext 10200) | L4, plausible (sales order PCF, telco service order shape) |
| 932 | TELCO-BSS -> ITSM | network_inventory.updated | service_incidents | Maintain IT asset records | 1312 (ext 20918) | L4, confident (network inventory IS IT asset shape) |
| 933 | TELCO-BSS -> ERP-FIN | telco_subscription.activated | telco_subscriptions | Generate customer billing data | 1351 (ext 10795) | L3, confident (subscription activation is the upstream billing-data trigger) |

Deferred-to-Discover: none. All 7 have at least plausible L3/L4 PCF anchors in `apqc_pcf_cross_industry`. The one weak match (931, `handle sales order inquiries`) is the cleanest among the available "order" rows for the post-completion customer notification pattern; if the user disagrees, Discover Pass 3 can re-classify as a custom telco process.

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-1: Em-dashes in `domains.description` and `domains.business_logic` for TELCO-BSS.** Both fields currently contain the U+2014 character. Project rule forbids em-dashes everywhere, including catalog data. Proposed action: rewrite the offending sentences with commas, parentheses, colons, or sentence breaks. Options: (a) user supplies replacement wording, (b) user approves the agent to draft replacements and review per row before PATCH. Independent of other items.

2. **B2-2: Modularization shape.** TELCO-BSS needs modules (M1). Three candidate splits:
   - **eTOM-aligned 7-module split** (recommended): `TELCO-BSS-ORDER-MGMT`, `TELCO-BSS-CATALOG`, `TELCO-BSS-PROVISIONING`, `TELCO-BSS-INVENTORY`, `TELCO-BSS-BILLING`, `TELCO-BSS-ASSURANCE`, `TELCO-BSS-SUBSCRIPTIONS`. Mirrors TM Forum eTOM Level 2 process areas and matches how Amdocs CES / Netcracker / Comarch organize their suites.
   - **5-module commercial-vs-operational split**: collapse provisioning and inventory into one operational module; collapse order and catalog into one commercial module; keep billing, subscriptions, assurance separate.
   - **3-module starter set**: `TELCO-BSS-ORDER-TO-CASH`, `TELCO-BSS-PROVISIONING-AND-INVENTORY`, `TELCO-BSS-ASSURANCE`. Easier to ship; loses internal granularity.

   Sub-question: should the domain be renamed (it currently says "Telecommunications OSS/BSS" but its code is TELCO-BSS, suggesting OSS is in scope)? If the user wants OSS as a separate market with its own modules, promote queued candidate TELCO-NMS from `_missing-domains.md` instead. Decision unlocks B1-S2 and all of B1-S3, B1-S4, B1-S6, B1-S10.

3. **B2-3: Regulation scope review.** Currently 7 mandatory regulations: Enhanced 911, GDPR, ISO/IEC 27001, NIS2, CSRD, EU Cyber Resilience Act, EU VAT Directive. Missing US-side anchors that pure-play telco vendors universally surface:
   - **FCC CPNI** (Customer Proprietary Network Information rules under 47 CFR 64.2001 to 64.2011),
   - **FCC LNP** (Local Number Portability),
   - **STIR / SHAKEN** (caller-ID authentication mandate),
   - **CALEA** (Communications Assistance for Law Enforcement Act),
   - **TCPA** (Telephone Consumer Protection Act for outbound dialing),
   - **SOX** (publicly-traded telco operators).
   Some require new `regulations` rows (FCC CPNI, FCC LNP, STIR / SHAKEN, CALEA, TCPA) since they are not in the catalog today. Decide which to add as mandatory vs. advisory, and surface the new `regulations` rows for user approval.

4. **B2-4: Role personas.** Once B1-S2 modularization lands, expected personas (for E1, which is currently vacuous):
   - `OPERATIONS-ORDER-MANAGER` (Order Mgmt + Provisioning),
   - `OPERATIONS-NETWORK-ENGINEER` (Inventory + Provisioning + Assurance),
   - `CUSTOMER-SERVICE-CARE-AGENT` (Subscriptions + Assurance + cross-domain CSM read),
   - `FINANCE-BILLING-SPECIALIST` (Billing + Subscriptions + cross-domain ERP-FIN),
   - `MARKETING-CATALOG-MANAGER` (Catalog only, possibly cross-cutting with CPQ),
   - `OPERATIONS-PROVISIONING-SPECIALIST` (Provisioning + Inventory).
   Decision: which subset to author in the same load as B1-S2.

5. **B2-5: Pattern flags re-evaluation (B4).** Three candidates surfaced from review:
   - `telco_customer_bills.has_submit_lock = true` (issued bill is immutable once delivered),
   - `service_trouble_tickets.has_personal_content = true` (customer narratives in ticket descriptions),
   - `telco_service_orders.has_submit_lock = true` (submitted order locks before provisioning).
   Decide which to flip during B1-S2 load.

6. **B2-6: Alias wording approval.** B1-S9 proposes 5 to 7 alias rows; per the standing rule, alias wording itself is not freeform notes but is buyer-facing and marketing-aged. Proposed text needs the user's OK before the load: `"Product Offering Catalog (TM Forum SID)"`, `"Service Instance (TM Forum SID)"`, `"Customer Invoice"`, `"Trouble Report"`, `"Resource Inventory"`. Confirm or rewrite.

### Bucket 3, Phase 0 pending (speculative)

Candidate entities surfaced from vendor knowledge; Phase 0 protocol has not been run for this domain. Each needs vetting against schema docs of Amdocs CES, Netcracker Digital BSS, Blue Planet, Ericsson Charging System, Comarch BSS.

| ID | Candidate entity | Proposed module | Vendor evidence basis |
| --- | --- | --- | --- |
| B3-1 | `usage_event_records` (CDR / EDR / IPDR) | TELCO-BSS-BILLING or new TELCO-BSS-MEDIATION | Amdocs CES, Ericsson Charging, Optiva, all rating engines |
| B3-2 | `convergent_charging_sessions` | TELCO-BSS-BILLING | Ericsson OCS, Huawei OCS, Mavenir Charging |
| B3-3 | `mediation_records` | TELCO-BSS-BILLING or TELCO-BSS-MEDIATION | DigitalRoute, Amdocs Mediation, Comarch |
| B3-4 | `product_offering_bundles` | TELCO-BSS-CATALOG | TM Forum SID, Amdocs Catalog, Netcracker Catalog |
| B3-5 | `tariff_plans` (distinct from catalog) | TELCO-BSS-CATALOG | Universal across all 4 enumerated solutions |
| B3-6 | `customer_quotes` | TELCO-BSS-ORDER-MGMT or CPQ-Telco | Amdocs Order Care, Netcracker |
| B3-7 | `msisdn_inventories` / `number_inventories` | TELCO-BSS-INVENTORY | Amdocs, Netcracker, Comarch (mobile operators) |
| B3-8 | `sim_inventories` and `esim_profiles` | TELCO-BSS-INVENTORY | Amdocs, Netcracker, Truphone, Thales eSIM |
| B3-9 | `port_in_requests` / `port_out_requests` (LNP) | TELCO-BSS-ORDER-MGMT | iconectiv / Neustar / TransUnion (LNP admin), Amdocs, Netcracker |
| B3-10 | `equipment_swap_requests` (device upgrade workflow) | TELCO-BSS-ORDER-MGMT | Amdocs, Comarch, mobile-operator standard |
| B3-11 | `dunning_cases` and `payment_arrangements` | TELCO-BSS-BILLING | Amdocs Collections, Netcracker, Comarch |
| B3-12 | `qos_kpi_records` and `sla_credit_records` | TELCO-BSS-ASSURANCE or TELCO-NMS (queued) | Blue Planet, Cisco Crosswork, Nokia NSP |
| B3-13 | `revenue_assurance_alerts` and `fraud_cases` | TELCO-RAFM (queued) or TELCO-BSS-ASSURANCE | Subex HyperSense, Mobileum WeDo, Araxxe |

Candidates queued to `audits/_missing-domains.md`:

- **TELCO-RAFM** (Telecommunications Revenue Assurance and Fraud Management). Evidence: Subex HyperSense, Mobileum WeDo, Araxxe, Neural Technologies. Adjacent to TELCO-BSS, ERP-FIN, GRC.
- **TELCO-NMS** (Telecommunications Network Management Systems). Evidence: IBM Netcool, Cisco Crosswork, Nokia NSP, Ciena Manage Control Plan, VMware Telco Cloud. Adjacent to TELCO-BSS, ITSM, AIOPS.

### Cross-bucket dependencies

- B1-S3 (per-module system skills) and B1-S4 (retire legacy skill 111) are gated by B1-S2 (modules must land first).
- B1-S6 (lifecycle states) requires Bucket 2 item B2-2 (modularization shape) to be answered, because `domain_module_id` on each lifecycle state must point at the realizing module.
- B1-S10 (B10b backfill `source_domain_module_id`) is gated by B1-S2 (modules must land first).
- Bucket 2 item B2-1 (em-dash rewrites in `domains.description` / `business_logic`) is independent of every other item; can be resolved first.
- Bucket 2 item B2-3 (regulation scope) may add 3 to 5 new `regulations` rows + `domain_regulations` links; independent of modularization.
- Bucket 3 items B3-1 through B3-13 are speculative; deciding the modularization shape (B2-2) determines which module each candidate lands in, so resolve B2-2 before vetting Bucket 3.
- If user promotes candidate TELCO-RAFM and / or TELCO-NMS, several Bucket 3 candidates (B3-12, B3-13) route there instead of TELCO-BSS; this re-shapes the modularization plan in B2-2.

### Per-bucket prompts

- **After Bucket 1:** Fix these now? Approve the structural backlog as a single set, or pick a subset. Recommended order: B1-S5 (catalog UX) draft first, B1-S1 + B1-S2 (capabilities + modules) load second since they unblock everything else, then B1-S6 to B1-S12 + B1-H1 in a follow-up wave once the module skeleton exists.
- **After Bucket 2:** What's your call on each? For B2-1 (em-dash rewrites), please supply or approve the exact replacement text. For B2-2 (modularization), pick one of the three candidate splits (7-module eTOM, 5-module, 3-module starter). For B2-3 (regulations), say which of the 5 missing US-side regulations to add. For B2-4 (role personas), confirm the persona list. For B2-5 (pattern flags), confirm which of the 3 candidates to flip. For B2-6 (alias wording), approve or rewrite the 5 proposed alias strings.
- **After Bucket 3:** Vet via Phase 0 research, or eyeball mode? If eyeball, name which candidates ring true so they can become Bucket 1 items in the follow-up pass. Also confirm whether to promote TELCO-RAFM and / or TELCO-NMS from the queue into the catalog before the next TELCO-BSS load (this re-shapes Bucket 3).

### Report-only follow-ups (owed by other domains)

- **CSM B10b** owes `target_domain_module_id` PATCH on handoffs 930 (`telco_subscription.suspended` ⇒ `telco_subscriptions` payload, route to CSM module that consumes telco subscriptions) and 931 (`telco_service_order.completed` ⇒ `telco_service_orders` payload). Both are currently NULL on the target side.
- **ERP-FIN B10b** owes `target_domain_module_id` PATCH on handoffs 929 (`telco_customer_bill.issued`) and 933 (`telco_subscription.activated`). Both currently NULL on the target side.
- **CSM B8 / B10** owes inbound handoffs into TELCO-BSS where a case escalates back (e.g. `customer_case.escalated_for_billing_dispute` ⇒ TELCO-BSS billing). None loaded today; CSM-side audit decides whether the catalog needs the row.
- **ITSM B8 / B10** owes inbound handoffs into TELCO-BSS where an incident resolution closes a trouble ticket back (e.g. `service_incident.resolved` ⇒ TELCO-BSS `service_trouble_tickets`). None loaded today; ITSM-side audit decides.
- **ERP-FIN B8 / B10** owes inbound handoffs for upstream price changes (`tariff_change.effective` ⇒ TELCO-BSS catalog repricing). Currently absent.
- **HCM B10** owes inbound (`employee.terminated` ⇒ TELCO-BSS subscription cancel for employee lines). Currently absent.
- **CRM B10** owes inbound (`account.created` ⇒ TELCO-BSS subscriber-record-create) for B2C / B2B account-creation flow. Currently absent.
- **GRC / DLP B10** owes inbound for CPNI / GDPR data-subject-request workflows feeding into TELCO-BSS subscription / billing records. Surfaces only if user adds CPNI to Bucket 2 item B2-3.
