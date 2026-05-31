---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 22
---

# FSM, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 3 full modules (`FSM-DISPATCH-OPS` 161, `FSM-INSTALLED-BASE` 162, `FSM-SERVICE-CONTRACTS` 163) + 1 starter hosted via `domain_module_host_domains` (`HVAC-SVC-MGMT` 171, primary host NULL). 7 masters: `service_work_orders` (740), `field_visits` (261), `dispatch_records` (262), `installed_equipment` (819), `service_pm_schedules` (820), `customer_sites` (821), `service_contracts` (741). 7 capabilities (1 cross-cutting `WORKFORCE-SCHEDULING`, 6 FSM-specific). 8 solutions (5 primary, 2 secondary). 17 trigger_events. 10 outbound + 7 inbound cross-domain handoffs (17 cross-domain total). 6 intra-domain cross-module handoffs (1254-1259). 23 aliases. 35 lifecycle states across 7 masters. 4 system skills (one per full module + 1 starter) + 58 `skill_tools` rows. 3 FSM roles (Field Service Dispatcher, Field Service Technician, Field Service Manager) on 9 `role_modules` rows across the 3 full modules. 12 permissions (9 baseline tier across full modules, 10 workflow-gate, 3 baseline on starter; one full module DISPATCH-OPS has only 1 workflow-gate, INSTALLED-BASE has 7, SERVICE-CONTRACTS has 1, plus 1 deferred `complete_service_work_order` on DISPATCH-OPS).
- **Vendor-surface basis (Pass 2 flagship enumeration):** ServiceNow Field Service Management, Salesforce Field Service, Microsoft Dynamics 365 Field Service, SAP Field Service Management (Coresystems), IFS Cloud Field Service, Oracle Field Service Cloud, PTC ServiceMax, Praxedo, BigChange, ClickSoftware (IFS-acquired). Vertical home-services specialists: ServiceTitan, Housecall Pro, Workiz, Jobber, FieldEdge. Compliance-specialist coverage is light in FSM (no broadly-applicable statutory anchor like HIPAA / SOX); OSHA on technician safety inspections and vertical regulators (EPA refrigerant handling for HVAC, NEC for electrical) are situational. `domain_regulations` rows for FSM: 0.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 5 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain data_object_relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| CSM | 3 | 0 | 0 | 0 | 3 | Pairwise (full) |
| CRM | 2 | 0 | 0 | 0 | 2 | Lightweight |
| FLEET-MGMT | 2 | 0 | 0 | 0 | 2 | Lightweight |
| REAL-EST | 1 | 1 | 0 | 0 | 2 | Lightweight |
| ERP-FIN | 1 | 0 | 0 | 0 | 1 | Lightweight |
| EAM | 1 | 0 | 0 | 0 | 1 | Lightweight |
| RE-CRE | 0 | 1 | 0 | 0 | 1 | Lightweight |
| RE-PROP-MGMT | 0 | 1 | 0 | 0 | 1 | Lightweight |
| UTIL-OPS | 0 | 3 | 0 | 0 | 3 | Pairwise (full) |
| PLM | 0 | 1 | 0 | 0 | 1 | Lightweight |

Pairwise threshold (weight >= 3): CSM, UTIL-OPS.

**Structural pass bands:** A / D / F all pass on positive checks. **M7 hard-fails** (within-domain incoherence on 2 masters: `installed_equipment` and `customer_sites` each carry a `master` row AND `consumer` rows in sibling modules; 4 sibling consumer DMDO rows total). **B7 partial-fail** (3 of 7 masters missing from `domain_data_objects` rollup: `installed_equipment` 819, `service_pm_schedules` 820, `customer_sites` 821). **B9 partial-fail** (5 trigger_events with empty `event_category`: 999, 1000, 1001, 1002, 1003). **B10b hard-fail (FSM-side)** (10 of 10 outbound handoffs carry NULL `target_domain_module_id`; FSM also owes its own backfill on 2 inbound rows where the target lands on an FSM module: 292 / 318 / 1094 have NULL `target_domain_module_id` and the target is an FSM module). **B14 hard-fail (notes pollution legacy)** (handoff 1094 carries `notes='target NULL until FSM is modularized'`, the exact forbidden pattern under Rule #15 forbidden-patterns list; one row, but it pre-dates the rule). **E2 advisory** (DISPATCH-OPS workflow-gate count looks light at 2 workflow-gates vs 5 `requires_permission=true` lifecycle states across `service_work_orders` + `field_visits` + `dispatch_records`; 3 missing workflow-gate permissions). **H1 hard-fail** (1 of 17 cross-domain handoffs tagged; the 1 row is `discovery_substring`, `record_status='new'`; zero `agent_curated`; zero `approved`). **Rule #15 (description column) partial-fail** (the domain description on `domains.id=31` contains U+2014 em-dash inside `business_logic`, requires sanitization on the next domain PATCH; same in description body).

FSM Semantius score basis (rough, not strict-loaded since `coverage_tier` column does not exist on `skill_tools`): 58 skill_tools rows, all platform CRUD (`query_*` / `create_*` / `update_*` / `complete_*` / `cancel_*` / `activate_*` / `decommission_*`) plus `notify_person` (side_effect), `optimize_route` (compute), `create_calendar_event` (side_effect). No external-tier tools loaded. Score is therefore high (every tool resolvable on platform). The notable gap relative to flagship vendors is the absence of integration-tier tools for mapping providers (Google Maps Routes API, Mapbox), signature capture (HelloSign, DocuSign embedded signing), and parts-catalog vendor APIs (Trimble, RS Components). Those are Bucket 3 candidates.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 (hard fail), within-domain incoherence** | Two masters carry `role='master'` in their owning module AND `role='consumer'` in sibling FSM modules. `installed_equipment` (819, master in FSM-INSTALLED-BASE 162 via DMDO 831) is `consumer + optional` in FSM-DISPATCH-OPS (DMDO 834) and `consumer + optional` in FSM-SERVICE-CONTRACTS (DMDO 836). `customer_sites` (821, master in FSM-INSTALLED-BASE 162 via DMDO 833) is `consumer + required` in FSM-DISPATCH-OPS (DMDO 835) and `consumer + optional` in FSM-SERVICE-CONTRACTS (DMDO 837). M7 rejects master + consumer in sibling modules of the same domain. Agent default is DELETE the 4 consumer rows (INSTALLED-BASE owns both masters; sibling modules read via canonical reference). The alternative is promote each sibling `consumer` row to `embedded_master` if standalone deployability of DISPATCH-OPS or SERVICE-CONTRACTS without INSTALLED-BASE is intended. Standalone DISPATCH-OPS without INSTALLED-BASE has no installed equipment to service against and no customer sites to dispatch to, so embedded path looks weak. Surface as B2-S1; on user approval of DELETE, proceed in Bucket 1. | DELETE 4 `domain_module_data_objects` rows: 834 (161, 819, consumer), 836 (163, 819, consumer), 835 (161, 821, consumer), 837 (163, 821, consumer). |
| B1-S2 | **B9 missing event_category** | 5 trigger_events carry empty `event_category` (Rule #13 enum required: `lifecycle / state_change / threshold / signal`): 999 `service_work_order.created`, 1000 `service_work_order.assigned`, 1001 `service_work_order.completed`, 1002 `service_contract.activated`, 1003 `service_contract.expired`. | PATCH: 999 → `lifecycle`, 1000 → `state_change`, 1001 → `state_change`, 1002 → `state_change`, 1003 → `lifecycle`. |
| B1-S3 | **B7 missing domain_data_objects rollup** | 3 of 7 FSM masters do not appear in the legacy `domain_data_objects` rollup for `domain_id=31`: `installed_equipment` 819, `service_pm_schedules` 820, `customer_sites` 821. Rollup currently lists only 4 masters (service_work_orders, field_visits, dispatch_records, service_contracts) + 2 infra embedded_masters (org_units, locations). | INSERT 3 `domain_data_objects` rows: (31, 819, master, required), (31, 820, master, required), (31, 821, master, required). |
| B1-S4 | **B10b FSM-side hard fail, missing target_domain_module_id on FSM-mastered handoffs** | 3 inbound handoffs land on FSM masters but carry NULL `target_domain_module_id` (FSM's own side, not the source's): 292 REAL-EST → FSM via `facility_work_order.completed` payload `facility_work_orders` (data_object 349 is foreign so this is read-only into FSM, target module ambiguous), 318 FLEET-MGMT → FSM via `vehicle.dispatched` payload `fleet_assignments` (data_object 373 is FLEET), 1094 PLM → FSM via `cad_drawing.released` payload `cad_drawings` (target should be FSM-INSTALLED-BASE 162 since install techs consume the drawing rev). All three are reads into FSM. | PATCH handoff 1094 set `target_domain_module_id=162` (FSM-INSTALLED-BASE consumes drawings at install). For 292 and 318: those handoffs land on payloads that aren't FSM masters (`facility_work_orders` is REAL-EST, `fleet_assignments` is FLEET). They are inbound-but-non-FSM-payload signals to FSM; the target module is FSM-DISPATCH-OPS (161) since both feed the dispatch loop. PATCH 292 and 318 set `target_domain_module_id=161`. |
| B1-S5 | **B10b report-only (outbound NULLs owed by other domains)** | All 10 outbound FSM handoffs carry NULL `target_domain_module_id` on the receiving domain's side: 229 CSM, 230 CSM, 883 CSM, 884 FLEET-MGMT, 885 ERP-FIN, 1260 EAM, 1261 CRM, 1262 CRM, 292 REAL-EST (FSM is source), 318 FLEET-MGMT (FSM is source). Per B10b asymmetry, target module is the target domain's audit work. FSM's own side (`source_domain_module_id`) is populated on 8 of 10 (229, 230, 883, 884, 885, 1260, 1261, 1262); 292 and 318 have NULL on the source side too (legacy rows pre-modularization). FSM owes its source backfill on 292 and 318 (FSM-DISPATCH-OPS 161 for both, since both originate in the dispatch loop). | PATCH 292 set `source_domain_module_id=161`. PATCH 318 set `source_domain_module_id=161`. Schedule b1 audits on CSM, FLEET-MGMT, ERP-FIN, EAM, CRM, REAL-EST to populate the target side on the remaining 8 outbound rows. |
| B1-S6 | **B10b report-only (inbound NULLs owed by source domains)** | 6 inbound handoffs carry NULL `source_domain_module_id`: 291 REAL-EST, 299 RE-PROP-MGMT, 940 UTIL-OPS, 941 UTIL-OPS, 945 UTIL-OPS, 304 RE-CRE. FSM's `target_domain_module_id` is also NULL on all 6 (the FSM side, which IS FSM's fix). On the FSM side, target is FSM-DISPATCH-OPS (161) for every one (all four signals feed the work-order intake loop). | PATCH 291, 299, 940, 941, 945, 304 set `target_domain_module_id=161`. Schedule b1 audits on REAL-EST, RE-PROP-MGMT, UTIL-OPS, RE-CRE to populate the source side. |
| B1-S7 | **B14 Rule #15 legacy notes pollution** | Handoff 1094 carries `notes='target NULL until FSM is modularized'`. FSM IS now modularized (3 full modules + starter). The notes string is one of Rule #15's forbidden patterns (provenance trailer about why a column is NULL). The same fix as B1-S4 populates the target FK; the notes pollution should be reverted in the same PATCH. | In the B1-S4 PATCH on handoff 1094, also set `notes=''`. |
| B1-S8 | **E2 missing workflow-gate permissions on DISPATCH-OPS** | Lifecycle states with `requires_permission=true` materialize one permission each per Rule #12 / Rule #14. On `service_work_orders` module 161: state 341 `cancelled` produces `fsm-dispatch-ops:cancel_service_work_order` (10592, present); state 338 `completed` produces `fsm-dispatch-ops:complete_service_work_order` (10591, present). On `field_visits` module 161: no `requires_permission=true` states. On `dispatch_records` module 161: no `requires_permission=true` states. INSTALLED-BASE permissions look complete (7 workflow-gates match 5 `requires_permission=true` states on installed_equipment + service_pm_schedules + customer_sites). SERVICE-CONTRACTS has 1 workflow-gate (`activate_service_contract` 10601) matching 1 `requires_permission=true` state on service_contracts (331 `active`). DISPATCH-OPS has 2 workflow-gates matching 2 `requires_permission=true` states. Counts check out, no missing gates. Original draft of this finding was wrong; downgrading from hard fail to clean. | No fix needed. Confirms E-band passes. |
| B1-S9 | **Pairwise (CSM) implicit consumer DMDOs on downstream domains** | CSM receives 3 FSM outbound handoffs (229 `work_order.completed`, 230 `dispatch.failed`, 883 `service_work_order.completed`). CSM should declare `consumer` DMDO on `field_visits` (261), `dispatch_records` (262), and `service_work_orders` (740). None exist in CSM modules today. | Each consumer DMDO add is CSM's audit's work, not FSM's. Report-only. |
| B1-S10 | **Pairwise (UTIL-OPS) implicit consumer DMDOs on FSM** | UTIL-OPS sends 3 inbound handoffs (940 `utility_service_order.dispatched`, 941 `utility_asset.failed`, 945 `meter_read.anomalous`). FSM-DISPATCH-OPS should declare `consumer` DMDO on `utility_service_orders` (666), `utility_assets` (664), `meter_reads` (662). None exist in FSM DMDO today. | INSERT 3 `domain_module_data_objects` rows: (161, 666, consumer, optional), (161, 664, consumer, optional), (161, 662, consumer, optional). |
| B1-S11 | **Rule #15 / Rule #18 description sanitization on `domains.id=31`** | The `domains` row for FSM contains a U+2014 character in `business_logic` (between the words `constraints` and `operations-research`). The em-dash rule is project-wide. No vendor names present, so Rule #18 is not in play; only em-dash sanitization. | PATCH `domains.id=31` set `business_logic` em-dash replaced with comma: `"...travel constraints, operations-research solver at the core."`. Same scan should run on `description` (no em-dash present on second look) and on every `domain_modules.description` for the 3 FSM full modules + starter (none present on second look). |

#### APQC TAGGING (matches the SKILL anti-pattern that 16 of 17 FSM cross-domain handoffs are untagged)

Existing tags: 1 row (handoff 230 → process 777 "Calculate and optimize destination dispatch plan" 10258 L4, `discovery_substring`, `record_status='new'`). H1 hard fail (`record_status='approved'` count = 0; `agent_curated` count = 0). Volume expectation per SKILL H1: 0.5N to 0.8N for N=17 cross-domain handoffs → 9 to 14 `agent_curated` tags. The audit proposes the following 17 candidates from the structural-pass model (one per cross-domain handoff):

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 229 | FSM-DISPATCH-OPS → CSM | `work_order.completed` | `field_visits` | Manage customer service problems, requests, and inquiries (10388 L3) | 196 | confident L3 |
| 230 | FSM-DISPATCH-OPS → CSM | `dispatch.failed` | `dispatch_records` | (existing `discovery_substring` row on 777 "Calculate and optimize destination dispatch plan" 10258 L4; weak as a CSM-side activity, replace with "Manage customer service problems, requests, and inquiries" 10388 L3 since the CSM receives a failure signal it must escalate) | 196 | medium (replace existing) |
| 883 | FSM-DISPATCH-OPS → CSM | `service_work_order.completed` | `service_work_orders` | Manage customer service problems, requests, and inquiries (10388 L3) | 196 | confident L3 |
| 884 | FSM-DISPATCH-OPS → FLEET-MGMT | `service_work_order.assigned` | `service_work_orders` | Manage transportation fleet (10362 L4) | 862 | confident L4 |
| 885 | FSM-DISPATCH-OPS → ERP-FIN | `service_work_order.completed` | `service_work_orders` | Invoice customer (10743 L3) | 302 | confident L3 |
| 1260 | FSM-INSTALLED-BASE → EAM | `installed_equipment.decommissioned` | `installed_equipment` | Perform asset maintenance (19253 L3) | 353 | confident L3 |
| 1261 | FSM-INSTALLED-BASE → CRM | `service_pm_schedule.overdue` | `customers` | Manage customer service problems, requests, and inquiries (10388 L3) | 196 | medium (overdue PM triggers CRM customer-care work) |
| 1262 | FSM-INSTALLED-BASE → CRM | `customer_site.activated` | `customers` | Collect and maintain account information (10195 L4) | 736 | confident L4 |
| 292 | FSM-DISPATCH-OPS → REAL-EST | `facility_work_order.completed` | `facility_work_orders` | Plan facility (10943 L3) | 344 | medium (no strong PCF L3 for facility-side closure; alternative: Manage and Operate Service Delivery System 21634 L2) |
| 318 | FSM-DISPATCH-OPS → FLEET-MGMT | `vehicle.dispatched` | `fleet_assignments` | Manage transportation fleet (10362 L4) | 862 | confident L4 |
| 291 | REAL-EST → FSM-DISPATCH-OPS | `facility_work_order.created` | `facility_work_orders` | Request unplanned maintenance (10316 L4) | 824 | confident L4 |
| 299 | RE-PROP-MGMT → FSM-DISPATCH-OPS | `tenant_maintenance_request.created` | `tenant_maintenance_requests` | Request unplanned maintenance (10316 L4) | 824 | confident L4 |
| 304 | RE-CRE → FSM-DISPATCH-OPS | `tenant_maintenance_request.created` | `tenant_maintenance_requests` | Request unplanned maintenance (10316 L4) | 824 | confident L4 |
| 940 | UTIL-OPS → FSM-DISPATCH-OPS | `utility_service_order.dispatched` | `utility_service_orders` | Report maintenance issues (10319 L4) | 828 | medium (alt: Request unplanned maintenance 10316) |
| 941 | UTIL-OPS → FSM-DISPATCH-OPS | `utility_asset.failed` | `utility_assets` | Report maintenance issues (10319 L4) | 828 | confident L4 |
| 945 | UTIL-OPS → FSM-DISPATCH-OPS | `meter_read.anomalous` | `meter_reads` | Report maintenance issues (10319 L4) | 828 | medium (alt: defer-to-Discover, anomaly detection on meter reads has no clean PCF match) |
| 1094 | PLM → FSM-INSTALLED-BASE | `cad_drawing.released` | `cad_drawings` | Manage drawings (11745 L4) | 552 | confident L4 |

17 candidate APQC tags total. Of these, 16 INSERTs as `agent_curated` and 1 REPLACE on handoff 230 (the existing `discovery_substring` row points at a dispatch-planning activity but the CSM-side receives a service-failure signal; better fit is "Manage customer service problems, requests, and inquiries"). Two medium-confidence candidates (945, 292) could be deferred to Discover Pass 3 if no clean PCF match holds up under closer review; the structural pass proposes a best-fit and notes the alternative.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | 8 (S1 M7, S2 B9, S3 B7, S4 B10b FSM-side, S7 B14 notes, S8 E2 dropped to clean, S10 Pairwise UTIL-OPS DMDO, S11 em-dash sanitization) |
| BOUNDARY (NULL FK or missing handoff) | 3 (S4 / S5 / S6, two of three include FSM-side patches plus report-only on downstream domains) |
| APQC TAGGING | 17 |
| MODULARIZATION ISSUES | 0 (route to Bucket 2) |
| Report-only (downstream consumer DMDOs) | 1 (S9 CSM-side) |
| **Bucket 1 in-scope (excluding report-only)** | 10 mechanical / structural + 17 APQC tags |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

**CSM ↔ FSM (weight 3).** Wired pairs: 3 outbound (229, 230, 883), 0 inbound. Section 2: all 3 outbound have NULL `target_domain_module_id` (CSM's B10b). Section 3: a likely missing inbound is CSM → FSM-DISPATCH-OPS on `customer_case.escalated` if a CSM case triggers a work order (judgment call, Bucket 2). Section 4: CSM should declare `consumer` DMDO on `field_visits`, `dispatch_records`, `service_work_orders`; none exist. Routes to CSM audit (B1-S9 report-only). Section 5: no cross-domain `data_object_relationships` between FSM masters and CSM masters; reasonable since CSM masters cases / interactions and FSM masters work orders / visits with no direct entity relationship.

**UTIL-OPS ↔ FSM (weight 3).** Wired pairs: 0 outbound, 3 inbound (940, 941, 945). Section 2: all 3 have NULL on both FKs; FSM's side (target_domain_module_id=161) is in B1-S6 fix; UTIL-OPS side stays in its own audit. Section 3: no outbound from FSM to UTIL-OPS; likely missing handoff FSM-DISPATCH-OPS → UTIL-OPS on `service_work_order.completed` if utility outages get closed via FSM (judgment call, Bucket 2). Section 4: FSM-DISPATCH-OPS should declare `consumer` DMDO on `utility_service_orders`, `utility_assets`, `meter_reads`; B1-S10 covers. Section 5: no cross-domain relationships.

**Lighter neighbors (one-line summaries):**

- **CRM ↔ FSM (weight 2).** Outbound 1261 / 1262 to CRM. Both have NULL `target_domain_module_id` (CRM's B10b). No cross-relationships.
- **FLEET-MGMT ↔ FSM (weight 2).** Outbound 318 / 884 to FLEET-MGMT. Both have NULL `target_domain_module_id`; 318 also has NULL `source_domain_module_id` (FSM owes, see B1-S5). No cross-relationships.
- **REAL-EST ↔ FSM (weight 2).** One out (292), one in (291). 292 has NULL on both FKs (FSM owes source per B1-S5, REAL-EST owes target). 291 has NULL on both FKs (REAL-EST owes source; FSM-side target=161 covered in B1-S6).
- **RE-PROP-MGMT ↔ FSM (weight 1).** Inbound 299 with NULL on both FKs. Same shape as REAL-EST.
- **RE-CRE ↔ FSM (weight 1).** Inbound 304 with NULL on both FKs. Same shape.
- **ERP-FIN ↔ FSM (weight 1).** Outbound 885 to ERP-FIN with NULL target. No cross-relationship to FSM masters.
- **EAM ↔ FSM (weight 1).** Outbound 1260 to EAM with NULL target. EAM declares no `consumer` DMDO on `installed_equipment` despite receiving its decommission events; routes to EAM audit.
- **PLM ↔ FSM (weight 1).** Inbound 1094 with NULL `target_domain_module_id`; covered in B1-S4 / B1-S7. PLM-side source_module_id is populated (67).

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M7 architectural choice for FSM module deployability.** B1-S1 surfaces 4 sibling consumer DMDO rows that violate M7. Agent default DELETE (4 rows gone; sibling modules read masters by reference). Alternative PROMOTE to `embedded_master` (each sibling module ships a standalone-deployable shell). Standalone DISPATCH-OPS without INSTALLED-BASE has no equipment to service against; standalone SERVICE-CONTRACTS without INSTALLED-BASE has no equipment to cover. Embedded path looks weak for both. Recommendation: DELETE all 4. | Architectural intent + deployability strategy decision; user's call. | (a) DELETE all 4 sibling consumer rows. (b) PROMOTE all 4 to embedded_master. (c) Mixed per row. |
| B2-S2 | **B4 pattern-flag re-evaluation per Rule #12.** Current flags read: 7 masters, only `customers` carries `has_personal_content=true` and only `service_contracts` carries `has_single_approver=true`. Questions: (a) `service_work_orders.has_submit_lock` should arguably be `true` since "completed" is `requires_permission=true` and lock-on-completion is the standard FSM pattern (signed by tech, closed); (b) `field_visits.has_personal_content` could be `true` (signature capture, customer name, on-site photo), (c) `dispatch_records.has_submit_lock` could be `true` once `returned` (terminal state); (d) `installed_equipment.has_personal_content` could be `true` if serial / warranty info qualifies; (e) `service_contracts.has_submit_lock` likely `true` once `active`; (f) `service_pm_schedules` pattern flags are all false; reconsider for `has_submit_lock` post-`completed`. | Pattern flags are workflow-shape judgments the user owns; the audit re-evaluates and proposes, the user decides. | Per-flag yes/no from user, capture in Decisions. |
| B2-S3 | **F2 / F3 starter system skill scope.** Starter `HVAC-SVC-MGMT` system skill (236) carries 23 `skill_tools` rows, including platform CRUD on every embedded master. Rule #19 invariant 6 requires exactly 1 system skill per starter with `skill_tools` covering at minimum `query_<entity>` for each embedded master plus light mutates. Current starter skill includes `create_*` mutates on 8 entities (customers, crm_contacts, customer_sites, installed_equipment, service_work_orders, field_visits, dispatch_records, service_contracts, sales_quotes). That arguably exceeds the "light mutates" floor by including operational create on the FSM masters themselves. Per Rule #19 invariant 4 starters ship only baseline permissions; the starter has only baseline so the platform CRUD writes go through baseline `manage` which is fine, but the **workflow-gate-shaped** state transitions (complete, cancel, activate) are absent. Question: is the starter's "agent does everything except workflow-gate actions" shape correct, or should the starter exclude operational mutates and delegate to the underlying FSM full modules' agents when the starter is co-deployed? | Editorial / product intent question, the audit can't decide between "starter is self-sufficient" and "starter routes operational mutates to full-module agents when present". | (a) Self-sufficient (current shape is correct). (b) Delegate to full-module agents (trim mutates from starter `skill_tools`). |
| B2-S4 | **E5 SALES-TRANSACTION-COORDINATOR cross-domain role.** FSM does not have a cross-domain role bridging to CRM / CLM the way RE-BROKERAGE has SALES-TRANSACTION-COORDINATOR. Question: should an FSM-CUSTOMER-SUCCESS or FSM-OPERATIONS-MANAGER cross-domain role bridge FSM-DISPATCH-OPS + CSM + CRM for the customer-care-around-service-failures workflow (handoffs 229, 230, 883 land in CSM)? Current model treats CSM as a downstream consumer with no shared role. | Editorial / RBAC architecture question. | (a) No cross-domain role needed (CSM owns its own roles). (b) Add cross-domain role FSM-CUSTOMER-SUCCESS bundling on FSM-DISPATCH-OPS + CSM CSM-CASE-MGMT or similar. (c) Leave as-is and revisit with CSM audit. |
| B2-S5 | **Modularization, mobile-tech split.** Capability `FSM-MOBILE-TECH` (617) currently realizes within FSM-DISPATCH-OPS. Flagship vendors (Salesforce Field Service Mobile, ServiceNow Mobile Agent, ServiceMax Go, Praxedo Mobile) ship a distinct mobile module with offline sync, route-of-day, and signature capture. Question: split `FSM-DISPATCH-OPS` into `FSM-DISPATCH-OPS` (dispatcher-side, the desk) and `FSM-MOBILE-TECH` (tech-side, the truck) and renormalize the masters? Today both personas live in the same module which obscures the mobile-specific workflow surface. Bucket 3 has aligned candidate entities (`signature_records`, `service_photos`, `mobile_devices`). | Editorial / modularization design call. | (a) Keep single DISPATCH-OPS module. (b) Split into DISPATCH-OPS + MOBILE-TECH as 2 modules. (c) Defer until Bucket 3 candidates are vetted. |
| B2-S6 | **Vertical home-services starter `HVAC-SVC-MGMT` scope.** The starter currently bundles 11 embedded masters from FSM + CRM (customers, crm_contacts), embeds `sales_quotes` (CPQ-mastered) and `customer_invoices` (ERP-FIN-mastered). Per Rule #19 invariant 2 each `embedded_master` row points at a data_object that has `role='master'` in some full module; that holds. But the starter's host junction is FSM-only (host_domain_id=31 via id 171's hosting on FSM as cross-cutting host). Question: should `HVAC-SVC-MGMT` also list CRM, CPQ, and ERP-FIN as additional `domain_module_host_domains` since it embeds shells of their masters? Today the starter is FSM-only by host metadata, which understates its cross-domain reach. | Editorial / host-junction discipline question. | (a) Add additional host_domain rows on CRM, CPQ, ERP-FIN. (b) Keep FSM-only since the home-services workflow centers there. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 (analyst-driven flagship-vendor enumeration, no subagent spawn per orchestrator instruction) drew on: ServiceNow Field Service Management, Salesforce Field Service, Microsoft Dynamics 365 Field Service, SAP Field Service Management, IFS Cloud Field Service, Oracle Field Service Cloud, PTC ServiceMax, Praxedo, BigChange, ClickSoftware; vertical home-services: ServiceTitan, Housecall Pro, Workiz, Jobber, FieldEdge. No formal Phase 0 document was produced for FSM; the candidates below come from product knowledge, not vetted vendor research. The user picks vetted route or eyeball route.

#### MISSING (5) entity-cluster candidates surfaced by flagship-vendor knowledge

| Candidate cluster | Vendor knowledge basis | Proposed module |
|---|---|---|
| `time_entries` + `time_sheets` + `labor_rates` (technician time tracking, billable hours, rate cards) | Salesforce FS Time Tracker, ServiceTitan TimeSheets, Jobber Time Tracker, Housecall Pro time entries. Currently no FSM master records time spent on a visit / work order; billing relies on free-text on the work order. | new master in FSM-DISPATCH-OPS, or sibling FSM-BILLING module |
| `signature_records` + `service_photos` + `mobile_devices` (proof-of-completion artifacts) | Universal across all flagship FSM products; signature capture and photo upload are core tech mobile workflow. Currently absent in FSM masters. | new masters in FSM-DISPATCH-OPS (or FSM-MOBILE-TECH if B2-S5 splits) |
| `safety_inspections` + `inspection_checklists` (regulated safety, OSHA / industry compliance) | ServiceMax Safety, IFS Cloud FS Safety, ClickSoftware Safety. Specialist verticals (HVAC, electrical, oil-and-gas FSM) lean on OSHA / NEC / EPA inspections. | new master in FSM-INSTALLED-BASE or new FSM-SAFETY module |
| `warranties` + `warranty_claims` (equipment warranty coverage, manufacturer claims) | ServiceMax Warranty, Salesforce FS Warranty, PTC ServiceMax Warranty Management. Currently `service_contracts` conflates customer SLA with manufacturer warranty. | new master in FSM-INSTALLED-BASE (or sibling FSM-WARRANTY) |
| `rate_cards` + `service_pricing_books` + `service_quotes` (pre-work pricing, parts markup) | Jobber Estimates, Housecall Pro Estimates, ServiceTitan Pricebook, FieldEdge Pricing. Currently the starter embeds `sales_quotes` (CPQ-mastered) but pricing books and rate-cards have no first-class home. | new master in new FSM-PRICING module or extension of SERVICE-CONTRACTS |

#### MODULARIZATION (2) candidates

- **FSM-MOBILE-TECH split** (referenced in B2-S5). If the mobile-tech surface gets its own module, masters `field_visits`, `signature_records`, `service_photos`, `mobile_devices` go there.
- **FSM-WARRANTY split** (paired with `warranties` cluster). Separates manufacturer warranty from customer SLA. If loaded, pushes FSM from 3 to 4 full modules; the capability count (7) supports the split per Rule #14.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **OSHA 1910 safety standards** for technician on-site work (US, applicability=mandatory for US workforce). FSM has zero `domain_regulations` rows today; this is the foundational gap.
- **EPA refrigerant handling** (Section 608 for HVAC vertical specifically).

#### Candidate-domain queue

This audit surfaced 1 domain-tier candidate, queued via the helper:

- `TRADES-SVC` (Trades and Home-Services Field Operations), surfaced 2026-05-30. Vendor evidence: ServiceTitan, Housecall Pro, Workiz, Jobber, FieldEdge, BigChange. The point-solution-market test is plausible: each of these vendors competes as a recognized vertical category distinct from horizontal FSM (ServiceNow / Salesforce / IFS / SAP / Oracle / PTC ServiceMax). The buyer profile differs (residential trade contractors with 5-50 techs vs enterprise field-service organizations), the workflow includes consumer-grade invoicing / membership programs / lead generation, and pricing is per-tech-per-month rather than per-user seat. Triage decision deferred to user.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces a Phase 0 markdown at `c:/tmp/FSM-phase0-<date>.md` confirming per-entity vendor coverage), or eyeball-mode (user names which of the 5 entity clusters + 2 modularization candidates + 2 regulation candidates + 1 domain candidate to treat as confirmed). 5 + 2 + 2 + 1 = 10 Bucket 3 atomic candidates; rolled-up count for the summary is 5 (entity clusters drive the Bucket 3 surface; the others are dependents).

### Cross-bucket dependencies

- B1-S1 is **gated on B2-S1**: the DELETE vs PROMOTE choice for the 4 sibling consumer rows must come from the user before the M7 fix loads.
- B1-S4 / B1-S7 are bundled: the PATCH on handoff 1094 fixes target FK and reverts the legacy notes pollution in one statement.
- B1-S8 (originally flagged as E2 missing workflow-gate permissions on DISPATCH-OPS) was downgraded to clean at audit time; no action needed.
- B2-S5 (mobile-tech split) might inform Bucket 3 entity placement (`signature_records`, `service_photos`, `mobile_devices` go to the new module if it splits, otherwise to DISPATCH-OPS). Calling out the dependency: if you choose Bucket 3 entity load + eyeball-mode, defer the module-placement decision on those 3 entities until B2-S5 lands.
- B2-S6 (HVAC starter host scope) is **independent** of Buckets 1 and 3.
- B2-S2 (pattern-flag re-evaluation) is **independent** of all other buckets; per-flag yes/no.
- Bucket 2 items B2-S1 / B2-S5 / B2-S6 are mutually independent.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S3, S4, S5, S6, S7, S10, S11, H1-top10`), or `skip`.

- **S1 (M7 hard fail, DELETE or PROMOTE 4 sibling consumer DMDOs)** is gated on B2-S1; resolve that first.
- **S2 (event_category PATCH on 5 events)** is trivial; one PATCH each.
- **S3 (B7 INSERT 3 domain_data_objects rollup rows)** is structural; no dependencies.
- **S4 (PATCH 3 inbound handoff target FKs)** is mechanical; bundled with S7 for handoff 1094.
- **S5 (PATCH 2 outbound source FKs on 292/318 FSM-owed; report-only on 8 outbound rows for downstream domain audits)** mechanical part is 2 PATCHes; rest schedules other-domain audits.
- **S6 (PATCH 6 inbound target FKs on FSM side; report-only on source side for source-domain audits)** mechanical part is 6 PATCHes; rest schedules other-domain audits.
- **S7 (revert legacy notes pollution on handoff 1094)** bundled with S4.
- **S10 (INSERT 3 consumer DMDOs on FSM-DISPATCH-OPS for UTIL-OPS payloads)** mechanical; one chunked INSERT.
- **S11 (em-dash sanitization in `domains.id=31.business_logic`)** mechanical; one PATCH.
- **H1 (17 APQC tags including 1 REPLACE candidate on handoff 230)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (M7 architectural choice):** (a) DELETE all 4, (b) PROMOTE all 4 to embedded_master, (c) mixed per row.
- **B2-S2 (pattern flag re-evaluation):** per-flag yes/no on the 6 questions raised.
- **B2-S3 (starter system skill scope):** self-sufficient or delegate-to-full-module agents?
- **B2-S4 (cross-domain role bridging FSM + CSM + CRM):** add FSM-CUSTOMER-SUCCESS role, leave as-is, or revisit with CSM audit?
- **B2-S5 (FSM-MOBILE-TECH module split):** keep single DISPATCH-OPS, split into 2 modules, or defer until Bucket 3?
- **B2-S6 (HVAC starter cross-domain host metadata):** add CRM / CPQ / ERP-FIN host rows or keep FSM-only?

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 5 entity clusters + 2 modularization candidates + 2 regulation candidates + 1 domain candidate to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| CSM | B10b: populate `target_domain_module_id` on inbound handoffs 229, 230, 883. Add `consumer + optional` DMDO on `field_visits` (261), `dispatch_records` (262), `service_work_orders` (740) on the CSM case-management module. |
| CRM | B10b: populate `target_domain_module_id` on 1261, 1262. Add `consumer + optional` DMDO on `installed_equipment` (819) on CRM-PIPELINE-MGT or CRM-CONTACTS module since `service_pm_schedule.overdue` and `customer_site.activated` feed CRM customer-care work. |
| FLEET-MGMT | B10b: populate `target_domain_module_id` on 318, 884. Add `consumer + optional` DMDO on `service_work_orders` (740) and `dispatch_records` (262). |
| ERP-FIN | B10b: populate `target_domain_module_id` on 885. Add `consumer + optional` DMDO on `service_work_orders` (740). |
| EAM | B10b: populate `target_domain_module_id` on 1260. Add `consumer + required` DMDO on `installed_equipment` (819) since EAM treats decommissioned units as asset-retirement events. |
| REAL-EST | B10b: populate `source_domain_module_id` on inbound 291 and `target_domain_module_id` on outbound 292. Confirm whether `facility_work_orders` (349) needs an FSM consumer DMDO row when REAL-EST dispatches via FSM. |
| RE-PROP-MGMT | B10b: populate `source_domain_module_id` on inbound 299. |
| RE-CRE | B10b: populate `source_domain_module_id` on inbound 304. |
| UTIL-OPS | B10b: populate `source_domain_module_id` on inbound 940, 941, 945. |
| PLM | B10b: source_module_id on 1094 is already populated (67); confirm the source module is the intended one. |

### Decisions

_(empty, pending user review)_

### Fixes applied

_(none yet; user has not approved any fixes)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

Residual-pass loader applied only the strictly-technical Bucket 1 items from the 2026-05-30 audit. Classification was per the residual rubric (PATCH enum backfills, B10b FK PATCHes derivable from existing modules, PATCH naming/sanitization, PATCH `notes=''` reverts when audit names the row id, INSERT `handoff_processes` only when audit pre-specifies `handoff_id` + resolvable PCF). Loader: `c:/dev/domain-map/.tmp_deploy/fix_fsm_b1_technical_2026_05_31.ts`. No JWT errors. 16 writes ok, 0 fail.

### Technical fixes applied (16)

| ID | Action | Rows |
|---|---|---|
| B1-S2 | PATCH `trigger_events.event_category` enum backfill | 999=lifecycle, 1000/1001/1002=state_change, 1003=lifecycle |
| B1-S4 | PATCH `handoffs.target_domain_module_id` (FSM-side, inbound landing on FSM master) | 1094 -> 162 (FSM-INSTALLED-BASE) |
| B1-S5 | PATCH `handoffs.source_domain_module_id` (FSM-side, outbound) | 292 -> 161, 318 -> 161 |
| B1-S6 | PATCH `handoffs.target_domain_module_id` (FSM-DISPATCH-OPS 161) | 291, 299, 304, 940, 941, 945 |
| B1-S7 | PATCH `handoffs.notes=''` (Rule #15 revert, audit named row id 1094) | 1094 |
| B1-S11 | PATCH `domains.id=31 business_logic` em-dash sanitization + American-English ("optimisation" -> "optimization") | 1 |
| H1 | INSERT `handoff_processes` (agent_curated, confidence=confident only) | 12 rows: 229-196, 883-196, 884-862, 885-302, 1260-353, 1262-736, 318-862, 291-824, 299-824, 304-824, 941-828, 1094-552 |

### Deferred from B1 (not in residual-technical scope)

| ID | Reason |
|---|---|
| B1-S1 | Gated on B2-S1 (user picks DELETE vs PROMOTE for 4 sibling consumer DMDOs). |
| B1-S3 | INSERT 3 `domain_data_objects` rollup rows. New domain-level junctions not in residual-technical allow-list; needs user confirmation. |
| B1-S8 | Already clean at original audit time; no action required. |
| B1-S9 | Report-only (CSM audit). |
| B1-S10 | INSERT 3 `domain_module_data_objects` consumer rows on FSM-DISPATCH-OPS for UTIL-OPS payloads. Same reason as S3. |
| H1 row on handoff 230 | REPLACE of an existing `discovery_substring` row. Destructive change deferred for user judgment. |
| H1 rows on 292, 1261, 940, 945 | Audit-tagged "medium" confidence; deferred per residual-technical rubric ("decide"). |

### Verification

- 12 `handoff_processes` rows confirmed live with `proposal_source='agent_curated'`, `record_status='new'`.
- `domains.id=31 business_logic` reads: "Routing and dispatch optimization under technician skill, parts, SLA, and travel constraints, operations-research solver at the core." (no U+2014).
- `handoffs.id=1094 notes=''` confirmed; legacy "target NULL until FSM is modularized" string removed.
- All five `trigger_events` (999-1003) now carry valid enum `event_category` values.

### Spot-check links

- https://tests.semantius.app/domain_map/handoff_processes?handoff_id=in.(229,291,299,304,318,883,884,885,941,1094,1260,1262)
- https://tests.semantius.app/domain_map/handoffs?id=in.(291,292,299,304,318,940,941,945,1094)
- https://tests.semantius.app/domain_map/trigger_events?id=in.(999,1000,1001,1002,1003)
- https://tests.semantius.app/domain_map/domains?id=eq.31

