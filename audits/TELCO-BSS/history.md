# TELCO-BSS audit history

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

## 2026-05-31, Continuation: B1 technical fixes

Loader: [.tmp_deploy/fix_telco_bss_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_telco_bss_b1_technical_2026_05_31.ts). Run from project root. Idempotent.

### Applied (technical only)

- **B1-S11(b)**: PATCHed `trigger_events.event_category` from `""` to `state_change` on all 9 TELCO-BSS trigger_events (ids 1060-1068). Allowed enum values: `lifecycle`, `state_change`, `threshold`, `signal`. Every one of the 9 events names a state transition; `state_change` is the uniform technical fit per audit guidance ("Most should be `state_change`"). Empty-event_category count for the 7 masters is now 0.
- **B1-H1**: INSERTed 7 `handoff_processes` rows (ids 458-464) per the audit's pre-specified `handoff_id` -> `process_id` table. All 6 distinct PCF process ids (196, 302, 740, 1299, 1312, 1351) verified to exist in `/processes` before insert. `proposal_source='agent_curated'`; `record_status` omitted (DB default `new` per Rule #1). One-to-one coverage on handoffs 927-933 confirmed in post-flight.

Total writes: 9 PATCHes + 7 INSERTs = 16 rows touched.

### Deferred (out of technical scope or gated)

- **B1-S1** (capabilities): new entities; defer.
- **B1-S2** (modules, M1 hard fail): new modules; defer (Bucket 2 item B2-2 picks the shape).
- **B1-S3** (per-module system skills, Rule #17): gated on B1-S2.
- **B1-S4** (retire legacy skill 111): gated on B1-S3; deleting the only system skill before per-module skills exist would hollow the domain's agent surface (F2 hard fail).
- **B1-S5** (catalog UX A4): Rule #20 (`catalog_tagline` / `catalog_description`), surface to user; never auto-write.
- **B1-S6** (lifecycle states, B12): gated on B1-S2 (`data_object_lifecycle_states.domain_module_id` FK is required per state).
- **B1-S7** (intra-domain DOR edges, B6): not user-edges; the technical-fix scope for DOR is "user-edges Rule #10 audit pre-specifies" only.
- **B1-S8** (users DOR edges, Rule #10): audit names the actor labels (order agent, billing specialist, network engineer, care agent, provisioning specialist, catalog manager, network inventory custodian) but does not pre-specify the exact `(relationship_verb, inverse_verb, relationship_type, relationship_kind, owner_side, is_required)` tuples per master. Defer per the precedent set by other 2026-05-31 B1 fix loaders.
- **B1-S9** (data_object_aliases bulk, B11): Bucket 2 wording approval (B2-6); the rule forbids bulk `data_object_aliases` inserts unless the audit pre-specifies exact tuples.
- **B1-S10** (B10b backfill `source_domain_module_id`): gated on B1-S2 (no source module exists to attribute to; not derivable today).
- **B1-S11(a)** (2 missing handoffs on events 1060 / 1068): authoring NEW handoffs is surface-for-user judgment (audit asks whether to treat as leaf or add new handoff rows).
- **B1-S12** (`domain_aliases`): per the DEFER list ("new `domain_aliases`").
- **B2-1** (em-dashes in `domains.description` / `domains.business_logic`): wording approval (Bucket 2); even though the project rule forbids em-dashes, the replacement text needs user approval per the audit framing. Defer.
- **B2-2 / B2-3 / B2-4 / B2-5 / B2-6**: Bucket 2 judgment.
- **B3-1 through B3-13**: Phase 0 speculative; need vendor-schema vetting.
- Report-only follow-ups owed by **CSM / ERP-FIN / ITSM / HCM / CRM / GRC**: not TELCO-BSS authoring scope.

### Deferred count

22 of 22 non-applied audit items deferred (B1-S1, B1-S2, B1-S3, B1-S4, B1-S5, B1-S6, B1-S7, B1-S8, B1-S9, B1-S10, B1-S11a, B1-S12; B2-1 through B2-6; B3 omnibus; 7 report-only owed by other domains). The two applied items (B1-S11b enum backfill, B1-H1 PCF tagging) are the only B1 entries that meet the technical-only criteria of the continuation prompt.

### No JWT errors observed.

## 2026-05-31, Audit

### Summary

Structural Validate b1 pass against live state. Re-runs all bands (A, M, B [B5/B7/B9/B9b/B10b/B11/B12], C, D, E [E1-E5], F [F1-F5], H) after the 2026-05-31 B1 technical continuation landed (9 PATCHes on trigger_events + 7 INSERTs on handoff_processes). Current footprint:

- Domain id 42, code TELCO-BSS, name "Telecommunications OSS/BSS".
- 0 capabilities (A2 hard fail, unchanged).
- 0 `domain_modules` rows, 0 `domain_module_host_domains` rows (M1 hard fail, cascades into M2, M4, M5, M6, M8, B9b vacuous, B10b half-fixable, E1-E5 vacuous, F2/F3 fail).
- 4 solutions all `coverage_level='primary'` (A3 pass).
- 7 mandatory regulations linked.
- 7 `domain_data_objects` rows, all `role=master, necessity=required, kind=domain_owned` (B1 pass). No `embedded_master` / `contributor` / `consumer` rows (B5 vacuous, B10 discovery returns nothing owed).
- 7 outbound `handoffs`, 0 inbound. All 7 outbound carry `source_domain_module_id=NULL` (B10b fail, gated on M1). 3 target ITSM module 38; 2 target CSM (NULL target_domain_module_id, owed by CSM); 2 target ERP-FIN (NULL target_domain_module_id, owed by ERP-FIN).
- 9 `trigger_events` on the 7 masters, all `event_category='state_change'` (B1-S11b applied 2026-05-31). 2 events still lack `handoffs` rows (1060 `telco_service_order.submitted`, 1068 `telco_service_catalog.updated`), B1-S11a still pending.
- 0 lifecycle states on any master (B12 hard fail, unchanged).
- 0 aliases on any master (B11 fail, unchanged).
- 0 `domain_aliases` rows on the domain (Rule #20).
- 2 `data_object_relationships` rows (`telco_subscriptions opens customer_cases`, `telco_service_orders opens customer_cases`). Zero intra-domain master-to-master edges (B6 fail). Zero `users` edges (B7 fail).
- 1 legacy `skills` row id 111 (`telco-bss-system`, `domain_module_id=NULL`, kebab name). 8 `skill_tools` rows (7 `query_*` + `send_email`). F1 fail (legacy), F2/F3 fail (no module-level skill). F4 pass on existing rows. F5 strict_score uncomputable per module (F5 reports the F2/F3 gap).
- 7 `handoff_processes` rows on the 7 outbound handoffs, all `proposal_source='agent_curated', record_status='new'` (B1-H1 applied 2026-05-31). H1 coverage = 7/7 = 100% rows tagged; **approved count = 0** (review pending). H1 itself passes coverage; quality measure pending reviewer sign-off.
- C-band: 2 `business_function_domains` rows (`Business Operations` owner, `Finance` contributor). C1 pass.
- A1: all 7 metadata fields populated. Em-dash still present in `business_logic` ("Rating engine and online charging system — high-throughput algorithmic kernel; ..."). Description re-checked, no em-dash currently in `description` field. B2-1 narrows to `business_logic` only.
- A4: `catalog_tagline` and `catalog_description` both empty strings (Rule #20 surface-to-user).

Vendor surface basis (unchanged from 2026-05-30): Amdocs CES, Netcracker Digital BSS, Blue Planet, Ericsson Charging, Comarch BSS, Optiva; TM Forum eTOM/SID/ODA as the substrate. Compliance specialists for E911/CPNI/STIR-SHAKEN, revenue assurance carried forward.

- **Bucket 1 (in-scope, agent fixable):** 12 items (11 structural + 1 APQC sign-off; B1-S11b retired).
- **Bucket 2 (surface-for-user, judgment):** 6 items (carried forward).
- **Bucket 3 (Phase 0 pending, speculative):** 13 items (carried forward).

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
| `handoffs` | `target_domain_id` | 0 | usually non-zero | flagged (B10 inbound owed by HCM/CRM/CSM/ITSM/ERP-FIN/GRC) |
| `skills` | `domain_id` | 1 (legacy) | yes after F2 | partial (F1 / F2 fail) |
| `domains` | `parent_domain_id` | 0 | only with sub-domains | pass |
| `domain_aliases` | `domain_id` | 0 | optional | flagged (B1-S12) |

S2: vacuous (zero modules). S3: every master has 0 states + 0 aliases (B11 + B12 fail across all 7).

A-band:

- A1 pass with caveat (em-dash in `business_logic`). Bucket 2 item.
- A2 FAIL (0 `capability_domains`).
- A3 pass (4 solutions, all `primary`).
- A4 FAIL (`catalog_tagline` and `catalog_description` empty).
- A5 skipped.

M-band:

- M1 HARD FAIL (0 modules). Cascades.
- M2, M4, M6, M8 vacuous on M1.
- M5 vacuous (no lifecycle states, no `requires_permission`).
- M7 catalog-wide check: each of the 7 masters has exactly one `master` row in the legacy `domain_data_objects` rollup (no module-level rows exist). No catalog-wide multi-master conflict on the 7 masters. Pass.

B-band:

- B1 pass (7 masters).
- B2 pass (every master has `singular_label` + `plural_label` populated; spot-checked all 7).
- B3 partial: every master uses prefix or descriptive form; no canonical bare-word claim needed. Pass.
- B4 partial: all 3 pattern flags default-false on all 7. Audit MUST positively re-evaluate (Rule #12). Carried forward as Bucket 2 B2-5 (3 candidates: `telco_customer_bills.has_submit_lock`, `service_trouble_tickets.has_personal_content`, `telco_service_orders.has_submit_lock`).
- B5 vacuous (no embedded_master).
- B6 FAIL. Zero intra-domain `data_object_relationships` between the 7 masters. 7 expected edges (per the 2026-05-30 list).
- B7 FAIL. Zero edges to `users` (data_object id 748). 7 expected edges per the 7 actor roles enumerated in B1-S8.
- B8 partial. 2 outbound DOR rows to CSM `customer_cases` (id 103). ITSM, ERP-FIN have no DOR mirrors of their handoffs. Outbound-direction DOR rows owed: `service_trouble_tickets escalates_as service_incidents`, `service_provisioning_workflows raises service_incidents`, `network_inventory_records triggers service_incidents` (all to ITSM `service_incidents` id 47); `telco_customer_bills posts_to <ERP-FIN AR object>`, `telco_subscriptions provisions_billable_to <ERP-FIN AR object>` (target masters TBD on ERP-FIN side).
- B9 partial. 9 trigger_events exist; 7 of 9 carry ≥1 handoff. 2 events still have no handoff: 1060 `telco_service_order.submitted` and 1068 `telco_service_catalog.updated` (B1-S11a still pending; carried). All 9 carry valid `event_category='state_change'` (B1-S11b applied; PASS on the enum sub-defect).
- B9b vacuous (0 modules; no cross-module surface).
- B10 (report-only, inbound discovery): 0 dependencies (no embedded_master / contributor / consumer). Discovery returns nothing this domain is structurally owed. Likely-real gaps surfaced from the 2026-05-30 review remain report-only follow-ups for HCM / CRM / CSM / ITSM / ERP-FIN / GRC.
- B10b HARD FAIL on the source side. 7 of 7 outbound have `source_domain_module_id=NULL`. Gated on M1 (no source module to attribute to). On the target side: 3 ITSM rows correctly carry `target_domain_module_id=38`; 4 (2 CSM, 2 ERP-FIN) carry NULL `target_domain_module_id`, which is each target domain's B10b to fix (report-only here).
- B11 FAIL. Zero `data_object_aliases` on any of 7 masters. TM Forum SID alias candidates carried from 2026-05-30. Bucket 2 B2-6 wording approval still pending.
- B12 HARD FAIL. Zero `data_object_lifecycle_states` on any master. None of the 7 are config-shape (every one has real workflow). Gated on M1 (lifecycle state `domain_module_id` FK requires modules to exist for proper attribution).

C-band:

- C1 pass (`Business Operations` owner + `Finance` contributor).
- C2 vacuous (0 capabilities).

D-band:

- D1 deferred (audit-time only).

E-band (Roles):

- E1 vacuously passes (single-module floor: 0 modules ⇒ no 2-module floor met ⇒ no roles authorable). Will become a real check after M1 lands; expected personas in B2-4 (6 candidates).
- E2 vacuous (no roles).
- E3 vacuous.
- E4 vacuous.
- E5 vacuous.

F-band (Skills):

- F1 FAIL. Legacy `skills` row id 111 (`telco-bss-system`, kebab, `domain_module_id=NULL`) remains. Retirement is gated on F2 (per-module system skills must exist first; deleting the only system skill before module-level skills exist hollows the agent surface).
- F2 FAIL. 0 `domain_modules` ⇒ 0 module-level system skills. Gated on M1.
- F3 partial. Against the legacy skill, 8 `skill_tools` rows exist (above the ≥1 floor); however Rule #17 requires the module-anchored skill, not the legacy one. F3 fails on the module-anchored definition.
- F4 pass on the 8 existing rows: 7 `query_*` rows have `data_object_id` set; `send_email` (`side_effect`) has `data_object_id=NULL`. Pairing invariants hold.
- F5 partial. Legacy skill strict_score = 8/8 = 100% on `coverage_tier='platform'`. Per-module Semantius score uncomputable per Rule #17 until F2 lands. Reports as "uncomputable, see F2/F3".

H-band:

- H1 coverage PASS. 7 of 7 cross-domain handoffs carry ≥1 `handoff_processes` row (B1-H1 applied 2026-05-31). All 7 tags are `proposal_source='agent_curated', record_status='new'`. Approved-tag count = 0 (review pending). The H1 structural pass succeeds; the catalog-quality side-bar (`record_status='approved'` count) is still 0 until reviewer signs off. Carried as a Bucket 1 sign-off ask (B1-H2).

### Pass 2, Market audit (semantic)

Carried verbatim from 2026-05-30. MISSING list against TM Forum SID baseline unchanged: convergent charging surface (`usage_event_records`, `mediation_records`, `rating_engine_sessions`, `convergent_charging_balances`), number/identity inventory (`msisdn_inventories`, `sim_inventories`, `esim_profiles`, `imei_records`), lifecycle workflows (`port_in_requests`, `port_out_requests`, `equipment_swap_requests`, `service_change_orders`), commercial surface (`product_offering_bundles`, `tariff_plans`, `promotions`, `customer_quotes`), collections (`dunning_cases`, `bill_dispute_cases`, `payment_arrangements`), assurance (`qos_kpi_records`, `sla_credit_records`, `network_alarms`), revenue-assurance (`revenue_assurance_alerts`, `fraud_cases`). All Bucket 3.

WRONG-OWNERSHIP: none structurally detected (no modules to misplace into).
SCOPE-CREEP: none.
MODULARIZATION ISSUES: M1 itself.

### Pass 3, Neighbor discovery

Edges via outbound handoffs (unchanged from 2026-05-30):

| Neighbor | Edge weight | Notes |
| --- | --- | --- |
| ITSM (id 1) | 3 | outbound to module 38 (ITSM-INCIDENT-MGMT) |
| CSM (id 30) | 2 | outbound, both NULL target module |
| ERP-FIN (id 65) | 2 | outbound, both NULL target module |

Only ITSM clears the weight-3 threshold for the full four-leg pass. CSM, ERP-FIN summary below.

### Pass 4, Pairwise reconciliation

ITSM (target_domain_module_id=38, ITSM-INCIDENT-MGMT):

- Leg 1 (producer master + lifecycle): TELCO-BSS masters `network_inventory_records`, `service_provisioning_workflows`, `service_trouble_tickets`. None have lifecycle states (B12 still pending).
- Leg 2 (trigger event row): 1064 `service_provisioning.failed`, 1065 `network_inventory.updated`, 1067 `service_trouble_ticket.opened`. All carry valid `event_category='state_change'` now.
- Leg 3 (handoff row with module FKs): 3 rows (927, 928, 932) all with `source_domain_module_id=NULL` (B10b fail on this side, gated on M1) and `target_domain_module_id=38` (target side correctly attributed).
- Leg 4 (consumer DMDO on ITSM target): symmetric, ITSM owns `service_incidents` (id 47). Not re-queried.

Section 5 (cross-domain DOR): no rows tying TELCO-BSS masters to ITSM `service_incidents`. 3 outbound DOR rows owed from this domain (carried as B1-S8 cross-domain extension; technically a B8 item).

CSM (weight 2 summary): 2 outbound handoffs on `telco_subscriptions` (id 655) and `telco_service_orders` (id 654). DOR rows already exist (both `opens customer_cases`). Both handoffs carry NULL `target_domain_module_id` (CSM B10b owes). No inbound from CSM into TELCO-BSS.

ERP-FIN (weight 2 summary): 2 outbound on `telco_customer_bills` (id 658, handoff 929) and `telco_subscriptions` (id 655, handoff 933, payload `telco_subscriptions`). No mirroring DOR rows. Both handoffs carry NULL `target_domain_module_id` (ERP-FIN B10b owes). No inbound.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL (S / A / M / B / F band)

| ID | Band | Finding | Proposed fix |
| --- | --- | --- | --- |
| B1-S1 | A2 | Zero `capability_domains` rows. | Author 5 to 8 capabilities aligned to TM Forum eTOM Level 2 (carried from 2026-05-30). Load via Phase A loader. |
| B1-S2 | M1, M2, M4, M6 | Zero `domain_modules`. Hard fail; gates every downstream. | Author 5 to 7 full modules per the eTOM-aligned shape; modularization choice itself is Bucket 2 B2-2. |
| B1-S3 | F2, F3 | Zero per-module system skills (Rule #17). | After B1-S2, author one `skill_type='system'` skill per module with `skill_name='<module_code_lower>_agent'`; each gets 5 to 12 `skill_tools` rows. Gated on B1-S2. |
| B1-S4 | F1 | Retire legacy `skills` id 111 (`telco-bss-system`, kebab). | DELETE row 111 + cascade its 8 `skill_tools` rows. Gated on B1-S3. |
| B1-S5 | A4 | `catalog_tagline` + `catalog_description` empty (Rule #20). | Draft both, surface to user BEFORE writing. Do NOT auto-write. |
| B1-S6 | B12 | Zero lifecycle states on the 7 masters. | Author state machines per the 2026-05-30 list; mark workflow gates `requires_permission=true` and set `domain_module_id`. Gated on B1-S2. |
| B1-S7 | B6 | Zero intra-domain master-to-master edges. | Author 7 edges per the 2026-05-30 list (`telco_service_orders fulfills_via service_provisioning_workflows` etc.). Standard relationship loader. |
| B1-S8 | B7 | Zero `users` edges on the 7 masters (Rule #10). | Author 7 user edges (order agent, billing specialist, network engineer, care agent, provisioning specialist, catalog manager, network inventory custodian). |
| B1-S9 | B11 | Zero aliases on the 7 masters. | Author 5 to 7 TM Forum SID aliases; wording approval in B2-6. |
| B1-S10 | B10b | 7/7 outbound have NULL `source_domain_module_id`. | After B1-S2, derive per the rule (module holding the trigger event's data_object with strongest role). PATCH loader. Gated on B1-S2. |
| B1-S11a | B9 | 2 trigger_events lack `handoffs` (1060 `telco_service_order.submitted`, 1068 `telco_service_catalog.updated`). | Decide: leaf (justify) or author cross-domain handoff(s). Surface-for-user (B2-7 candidate). |
| B1-S12 | domain_aliases | Zero `domain_aliases` on the domain (Rule #20 catalog search). | Author 3 to 5 aliases (`telco BSS`, `telecom billing systems`, `OSS BSS`, `communications service provider platform`, `convergent charging`). Surface to user. |

#### APQC TAGGING

| ID | Finding | Proposed action |
| --- | --- | --- |
| B1-H2 | All 7 `handoff_processes` rows sit at `record_status='new'` (catalog quality measure = 0). | Surface to user for review and approval. PATCH `record_status='approved'` per row only after explicit per-row sign-off (Rule #1). No bulk-approve. |

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-1: Em-dash in `domains.business_logic`** (only field still polluted; `description` is clean on re-read). Project rule forbids em-dashes. Options: (a) user supplies replacement wording, (b) user approves agent draft for review per row. Independent.
2. **B2-2: Modularization shape.** 3 candidate splits (carried from 2026-05-30): eTOM-aligned 7-module, 5-module commercial-vs-operational, 3-module starter set. Sub-question: rename to include OSS scope, or promote candidate TELCO-NMS separately. Unlocks B1-S2, B1-S3, B1-S4, B1-S6, B1-S10.
3. **B2-3: Regulation scope.** Missing US-side anchors (FCC CPNI, FCC LNP, STIR/SHAKEN, CALEA, TCPA, SOX). Decide which to add as mandatory vs advisory; new `regulations` rows for FCC CPNI, FCC LNP, STIR/SHAKEN, CALEA, TCPA.
4. **B2-4: Role personas.** 6 candidates carried from 2026-05-30 (`OPERATIONS-ORDER-MANAGER`, `OPERATIONS-NETWORK-ENGINEER`, `CUSTOMER-SERVICE-CARE-AGENT`, `FINANCE-BILLING-SPECIALIST`, `MARKETING-CATALOG-MANAGER`, `OPERATIONS-PROVISIONING-SPECIALIST`). Decide subset to author with B1-S2.
5. **B2-5: Pattern flags re-evaluation (B4).** 3 candidates: `telco_customer_bills.has_submit_lock=true`, `service_trouble_tickets.has_personal_content=true`, `telco_service_orders.has_submit_lock=true`. Decide which to flip during B1-S2.
6. **B2-6: Alias wording approval.** B1-S9 proposes TM Forum SID labels; needs OK before load. Proposed strings: `Product Offering Catalog (TM Forum SID)`, `Service Instance (TM Forum SID)`, `Customer Invoice`, `Trouble Report`, `Resource Inventory`.

### Bucket 3, Phase 0 pending (speculative)

13 candidates carried verbatim from 2026-05-30 (B3-1 through B3-13). Each needs vetting against schema docs of Amdocs CES, Netcracker Digital BSS, Blue Planet, Ericsson Charging System, Comarch BSS. Two queued candidate domains (TELCO-RAFM, TELCO-NMS) sit in `audits/_missing-domains.md`; promoting either re-shapes Bucket 3 routing.

### Cross-bucket dependencies

- B1-S3, B1-S4, B1-S6, B1-S10 gated on B1-S2 (modules must land).
- B2-2 (modularization shape) gates B1-S2; resolving B2-2 unblocks the structural Phase A/B load.
- B2-5 (pattern flags) lands inside the B1-S2 load.
- Bucket 3 routing depends on B2-2 (module-per-candidate map) and on whether TELCO-RAFM / TELCO-NMS get promoted.
- B1-S11a depends on B2-2 (leaf justification or new cross-domain handoffs whose `source_domain_module_id` derives from the chosen module shape).
- B1-S5, B1-S12 (Rule #20 surface-to-user) and B2-1 (em-dash rewrite) are independent.

### Per-bucket prompts

- **After Bucket 1:** Fix these now? Recommended order: B2-1 + B1-S12 + B1-S5 wording first (independent surface-to-user drafts), then B1-S1 + B1-S2 (capabilities + modules) on B2-2 decision, then B1-S6 to B1-S10 in a follow-up wave once modules exist. B1-H2 (PCF tag approval) can run any time; surface the 7 rows for sign-off.
- **After Bucket 2:** What's your call on each? B2-1: supply or approve em-dash replacement. B2-2: pick split (7-module eTOM, 5-module, 3-module starter). B2-3: name regulations to add. B2-4: confirm persona list. B2-5: confirm pattern flag flips. B2-6: approve alias strings.
- **After Bucket 3:** Vet via Phase 0 or eyeball? If eyeball, name candidates. Also confirm whether to promote TELCO-RAFM / TELCO-NMS from queue.

### Report-only follow-ups (owed by other domains)

- **CSM B10b** owes `target_domain_module_id` PATCH on 930 (`telco_subscription.suspended` payload `telco_subscriptions`) and 931 (`telco_service_order.completed` payload `telco_service_orders`).
- **ERP-FIN B10b** owes `target_domain_module_id` PATCH on 929 (`telco_customer_bill.issued`) and 933 (`telco_subscription.activated`).
- **CSM B8 / B10** owes inbound `customer_case.escalated_for_billing_dispute` ⇒ TELCO-BSS.
- **ITSM B8 / B10** owes inbound `service_incident.resolved` ⇒ TELCO-BSS `service_trouble_tickets`.
- **ERP-FIN B8 / B10** owes inbound `tariff_change.effective` ⇒ TELCO-BSS catalog repricing.
- **HCM B10** owes inbound `employee.terminated` ⇒ TELCO-BSS subscription cancel for employee lines.
- **CRM B10** owes inbound `account.created` ⇒ TELCO-BSS subscriber-record-create.
- **GRC / DLP B10** owes inbound for CPNI / GDPR data-subject-request workflows (conditional on B2-3 adding CPNI).

### No JWT errors observed.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
