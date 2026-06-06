# REAL-EST audit history

## 2026-05-30: Validate b1 (full 4-pass)

### Summary

- **Current footprint:** REAL-EST (id 141) has **0 modules** of its own; 7 capabilities (`REAL-PROPERTY-MGMT`, `REAL-SPACE-OPTIM`, `REAL-LEASE-MGMT`, `REAL-MAINTENANCE`, `REAL-OCCUPANCY-ANALYTICS`, `REAL-UTILITY-TRACKING`, `REAL-CAPITAL-PROJECTS`); 12 solutions (7 primary, 5 secondary) across IBM TRIRIGA, Planon, Archibus, MRI OnCore, Yardi, Eptura, Nuvolo, Tango, Officespace, Accruent, Honeywell Forge, Spacewell; 8 domain-owned masters in legacy `domain_data_objects` (`real_estate_properties`, `property_leases`, `floor_plans`, `property_spaces`, `occupancy_records`, `facility_work_orders`, `utility_meter_readings`, `capital_projects`) but **zero `domain_module_data_objects` master rows** across the whole catalog; 16 `trigger_events` on those masters (4 with empty `event_category`); 7 outbound + 2 inbound cross-domain handoffs (FSM, ESG, EAM, HCM, RE-CRE, RE-INVEST, IWMS); 0 intra-domain master-to-master relationships; 0 `users` edges; 0 `data_object_aliases`; 0 `data_object_lifecycle_states`; 1 legacy domain-level `skill_type='system'` row (`real-est-system`, `domain_module_id=null`) with 10 `skill_tools` rows; 0 roles linked to REAL-EST; 0 `business_function_domains`; 0 `domain_regulations`.
- **Sub-domain context:** REAL-EST has two children, `IWMS` (id 23) and `CAFM` (id 142). IWMS carries 5 full modules and 6 masters (`locations`, `desk_bookings`, `room_reservations`, `workplace_service_requests`, `space_utilization_reports`, `workplace_experience_feedback`) plus 4 roles. CAFM is empty (no modules, no DMDO, no masters). All 7 of REAL-EST's own capabilities are realized by IWMS modules via `domain_module_capabilities`, but the REAL-EST domain itself has no deployable surface.
- **Vendor-surface basis:** IBM TRIRIGA (IWMS leader), Planon Workplace, Archibus, MRI OnCore, Yardi Voyager, Eptura Workplace, Nuvolo CMMS, Accruent Resolute, Spacewell, Tango Workplace, Officespace, Honeywell Forge Building Operations. Compliance-relevant adjacencies: lease accounting under ASC 842 / IFRS 16; utility-meter capture as Scope 1+2 emissions source feeding ESG; building safety (fire, ADA, OSHA) handled in adjacent EHS market that is not yet a catalog domain.
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.
- **Candidates queued to `_missing-domains.md`:** 3 (`EHS-MGMT`, `BMS-BAS`, `LEASE-ACCT`).

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO on REAL-EST masters | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| IWMS (sub-domain) | 1 | 1 | 2 (`floor_plans` consumer ×2) | 0 | 4 | Pairwise (full) |
| FSM | 1 | 1 | 0 | 0 | 2 | Lightweight |
| ESG | 1 | 0 | 0 | 0 | 1 | Lightweight |
| EAM | 1 | 0 | 0 | 1 (`capital_projects` commissions `industrial_assets`) | 2 | Lightweight |
| HCM | 1 | 0 | 0 | 0 | 1 | Lightweight |
| RE-CRE | 1 | 0 | 0 | 0 | 1 | Lightweight |
| RE-INVEST | 1 | 0 | 0 | 0 | 1 | Lightweight |

The dominant cross-domain finding from the pairwise pass: every REAL-EST master sits in legacy `domain_data_objects` only. No `domain_module_data_objects` row anywhere in the catalog has `role='master'` on any of the 8 REAL-EST masters. That converts every B-band check downstream into an M-band gate. Resolve M1+M7 first, then re-run B/E/F.

Structural pass bands: **M1 hard fail** (zero modules); **M2 hard fail** (7 capabilities require ≥2 modules); **M4 partial** (capabilities realize in sub-domain IWMS modules, not REAL-EST modules); **M7 hard fail** (catalog-wide: 8 masters have zero `master` DMDO rows); **B4 fail** (zero positive pattern-flag review); **B6 hard fail** (zero intra-domain master-to-master relationships); **B7 hard fail** (zero `users` edges); **B9 partial** (4 events with empty `event_category`); **B9b vacuous** (no modules); **B10b partial** (6 of 7 outbound handoffs with NULL module FKs on this side); **B11 fail** (zero aliases); **B12 hard fail** (zero lifecycle states on any of the 8 masters); **C1 hard fail** (zero `business_function_domains`); **E1 vacuous** (no modules to anchor roles); **F1 fail** (legacy domain-level `skill_type='system'` row that must retire once module-level skills exist); **F7 fail** (legacy skill links `send_email` channel primitive without justification); **H1 hard fail** (3/9 cross-domain handoffs tagged, all `discovery_substring`, zero `agent_curated`).

The REAL-EST domain is in **pre-modular state**. The Phase-A `domain_modules` shape has not yet been authored, despite the 8 masters and 16 trigger_events already being loaded under the legacy domain-level rollup. This audit's Bucket 1 leads with the modularization fix as a hard prerequisite to every downstream B / E / F check.

### Bucket 1: In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 + M2 + M7 (hard fail)** | REAL-EST has 0 `domain_modules` despite 7 capabilities, 8 domain-owned masters, 16 trigger_events, and 9 cross-domain handoffs. Per Rule #14 every `domains` row needs ≥1 full module; with ≥3 capabilities the floor is ≥2 full modules. M7 catalog-wide: not a single module in the catalog masters any of the 8 REAL-EST masters. Proposed module shape, by capability cluster: (a) **REAL-EST-PORTFOLIO** , masters `real_estate_properties`, `property_leases`, `floor_plans`, realizing `REAL-PROPERTY-MGMT` + `REAL-LEASE-MGMT`; (b) **REAL-EST-SPACE-OPS** , masters `property_spaces`, `occupancy_records`, realizing `REAL-SPACE-OPTIM` + `REAL-OCCUPANCY-ANALYTICS`; (c) **REAL-EST-FACILITY-OPS** , masters `facility_work_orders`, `utility_meter_readings`, realizing `REAL-MAINTENANCE` + `REAL-UTILITY-TRACKING`; (d) **REAL-EST-CAPITAL-PROJECTS** , masters `capital_projects`, realizing `REAL-CAPITAL-PROJECTS`. Decision needed on the boundary between REAL-EST modules and the existing IWMS sub-domain modules (which today realize REAL-EST capabilities). | Author the 4 `domain_modules` rows, 8 master `domain_module_data_objects` rows, 7 `domain_module_capabilities` rows. Reassign `capability_domains` to REAL-EST modules where IWMS currently realizes them. Surface module split first so the user can adjust before any insert. |
| B1-S2 | **B6 (hard fail)** | Zero intra-domain master-to-master `data_object_relationships`. Required edges between REAL-EST's 8 masters: `real_estate_properties has_many floor_plans`, `floor_plans has_many property_spaces`, `property_spaces has_many occupancy_records`, `real_estate_properties has_many property_leases`, `real_estate_properties has_many utility_meter_readings`, `real_estate_properties has_many facility_work_orders`, `real_estate_properties has_many capital_projects`, `property_spaces has_many facility_work_orders` (location of repair). | Author the 8 relationship rows: source master, target master, `relationship_verb`, `inverse_verb`, `relationship_type` (typically `one_to_many`), `is_required`, `owner_side='source'`. Load via the cluster-drafts loader pattern. |
| B1-S3 | **B7 (hard fail): `users` edges per Rule #10** | Zero `data_object_relationships` between `users` (id 748, `kind='platform_builtin'`) and any of the 8 REAL-EST masters. Each master has at least one user-typed actor: properties have `property_owner`; leases have `lease_signer` + `lease_approver`; floor_plans have `architect_author`; property_spaces have `occupant` + `space_planner`; occupancy_records have `recorded_by`; facility_work_orders have `requestor` + `assignee` + `approver`; utility_meter_readings have `reader`; capital_projects have `project_manager` + `approver`. | Author ≥1 `users → master` edge per master (typically multiple); apply Rule #10 (built-in edges are first-class). |
| B1-S4 | **B9: `trigger_events.event_category` invalid empty value** | 4 of 16 events carry empty `event_category` strings (Rule #13 enum: `lifecycle` / `state_change` / `threshold` / `signal`). Affected events: 938 `property.listed`, 939 `property.updated`, 940 `floor_plan.created`, 941 `floor_plan.updated`. | PATCH: 938 → `lifecycle`; 939 → `state_change`; 940 → `lifecycle`; 941 → `state_change`. |
| B1-S5 | **B10b: NULL `source_domain_module_id` on outbound** | 6 of 7 outbound handoffs (291, 293, 294, 295, 856, 857) carry NULL `source_domain_module_id`. Once B1-S1 lands the 4 REAL-EST modules, derive source module via the strongest-role rule (B10b , the module mastering the trigger event's `data_object_id`). Handoff 858 (target IWMS, target_module 102) already has the target side filled; source side still NULL because REAL-EST has no source module. | PATCH each row's `source_domain_module_id` after Bucket 1 module load completes. |
| B1-S6 | **B10b: NULL `target_domain_module_id` on inbound** | Inbound handoff 292 (FSM → REAL-EST on `facility_work_order.completed`) carries NULL `target_domain_module_id`. The handoff's payload (`facility_work_orders`) will be mastered by `REAL-EST-FACILITY-OPS` once B1-S1 lands. Inbound handoff 870 (IWMS → REAL-EST on `space_utilization.measured`) carries NULL target module; the payload (`space_utilization_reports` id 593) is IWMS-mastered, and REAL-EST does not declare any DMDO consumer on it; either author a `consumer` DMDO row on a REAL-EST module (preferred , captures the dependency) or accept that the handoff has no module owner on this side. | PATCH the target module on 292 after B1-S1; surface 870 separately as it needs a design decision. |
| B1-S7 | **B11 (fail)** | Zero `data_object_aliases` on any of the 8 masters despite each having clear cross-vendor synonyms: `real_estate_properties` → `Buildings` (Archibus, Planon) / `Real Property` (TRIRIGA); `property_leases` → `Lease Contracts` (LeaseQuery) / `Real Estate Leases` (CoStar); `property_spaces` → `Rooms and Areas` (Archibus) / `Spaces` (Eptura); `facility_work_orders` → `Maintenance Tickets` (Nuvolo) / `Service Requests` (TRIRIGA); `utility_meter_readings` → `Sub-Meter Readings` (Spacewell) / `Energy Consumption Records` (Honeywell). | Author ≥1 alias row per non-self-explanatory master (industry synonyms and/or vendor-specific labels). |
| B1-S8 | **B12 (hard fail)** | Zero `data_object_lifecycle_states` on any of the 8 masters. Required states (Rule #12): `property_leases` , `draft` → `active` → `renewal_pending` → `renewed`/`expired`/`terminated` (workflow gates on `renewed`, `terminated`); `facility_work_orders` , `created` → `assigned` → `dispatched` → `in_progress` → `completed` → `closed` (gates on `dispatched`, `completed`); `capital_projects` , `planning` → `approved` → `in_progress` → `completed`/`cancelled` (gates on `approved`, `completed`); `property_spaces` , `available` → `allocated` → `released` (gates on `allocated`, `released`); `occupancy_records` , point-in-time, exempt under config-shape per Rule #12 unless validation workflow exists; `real_estate_properties` , `in_portfolio` → `active` → `divested` (gate on `divested`); `utility_meter_readings` , `recorded` → `validated` → `published` (gate on `published`); `floor_plans` , `draft` → `published` → `superseded` (gate on `published`). | Draft state machines per master with `is_initial`, `is_terminal`, `requires_permission`, `permission_verb_override` (e.g. `divested → divest_property`), and `domain_module_id` (set after B1-S1). Author exemption surface for `occupancy_records` if user agrees it is config-shape. |
| B1-S9 | **B4 (re-eval)** | All 8 masters have all three pattern flags (`has_personal_content`, `has_submit_lock`, `has_single_approver`) false-by-default. Positive re-evaluation needed (Rule #12 , false-by-default is not the same as false-after-review). Likely true flags: `property_leases.has_single_approver=true` (one signing approver per lease); `property_leases.has_submit_lock=true` (terms freeze after signing); `capital_projects.has_single_approver=true` (capital approval gate); `capital_projects.has_submit_lock=true` (charter freezes after approval); `facility_work_orders.has_personal_content=true` (often contains tenant contact, technician name); `occupancy_records.has_personal_content=true` (badge data / employee location is PII under GDPR). | PATCH true flags after user confirms in Bucket 2 (see B2-S3). The audit conversation, not `notes`, captures the considered-false outcomes (Rule #15). |
| B1-S10 | **C1 (hard fail)** | Zero `business_function_domains` rows for REAL-EST. The sub-domain IWMS (id 23) has owner=`Facilities and Real Estate` + contributor=`Human Resources`; REAL-EST itself should mirror at minimum: owner=`Facilities and Real Estate`, contributor=`Finance` (lease accounting / capital project budgeting), consumer=`Human Resources` (workplace allocation) and consumer=`ESG and Sustainability` (utility data). | Author 4 `business_function_domains` rows linking REAL-EST (141) to the four functions with the respective `responsibility_type`. |
| B1-S11 | **F1 (fail)** | Legacy `skill_type='system'` row (`real-est-system`, id 99) carries `domain_id=141` and `domain_module_id=null`. Per F1, once any module-level system skill is authored for REAL-EST, the legacy row must retire (DELETE). The four modules from B1-S1 each need their own `skill_type='system'` skill row (Rule #17), with `skill_tools` rebound from the legacy 10 rows. | Author 4 module-level system skills (`real_est_portfolio_agent`, `real_est_space_ops_agent`, `real_est_facility_ops_agent`, `real_est_capital_projects_agent`), rebind / split the 10 legacy `skill_tools` rows across the four new skills, then DELETE the legacy skill row 99. |
| B1-S12 | **F7 (fail)** | Legacy skill 99 links `send_email` (id 37, channel primitive, `operation_kind='side_effect'`) with empty `notes`. Per F7 / channel-vs-capability rule, the default for generic notifications is `notify_person`. The REAL-EST workflow (lease expiry alerts, work-order assignments, capital project approvals) is exactly the substitutable-channel pattern: deployment chooses email vs SMS vs push. | Rebind the `skill_tools` row to point at `notify_person` (or `notify_team` for broadcast such as facility outage notifications) instead of `send_email`. Apply during the F1 retirement load. |

#### APQC TAGGING

H1 finding: 3 of 9 cross-domain handoffs carry `handoff_processes` rows, all `proposal_source='discovery_substring'`, zero `agent_curated`. Volume expectation per SKILL: 0.5N to 0.8N → 5-7 agent_curated tags. Proposals below.

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 291 | REAL-EST → FSM | `facility_work_order.created` | `facility_work_orders` | Request unplanned maintenance | 10316 | confident L4 |
| 292 (inbound) | FSM → REAL-EST | `facility_work_order.completed` | `facility_work_orders` | Perform asset maintenance | 19253 | confident L3 |
| 293 | REAL-EST → ESG | `utility_meter_reading.published` | `utility_meter_readings` | Evaluate environmental impact of products, services, and operations | 11186 | confident L4 |
| 294 | REAL-EST → EAM | `capital_project.completed` | `capital_projects` | Measure financial returns on completed capital projects | 10852 | confident L4 (replaces current `discovery_substring` row to 311 `Perform capital project accounting`) |
| 295 | REAL-EST → HCM | `property_space.allocated` | `property_spaces` | Provide workspace and facilities | 10944 | confident L3 |
| 856 | REAL-EST → RE-CRE | `property.listed` | `real_estate_properties` | Confirm alignment of property requirements with business strategy | 10955 | confident L4 (replaces current substring row to 343) |
| 857 | REAL-EST → RE-INVEST | `property.updated` | `real_estate_properties` | Develop property strategy and long term vision | 10941 | keep current substring row (already a confident L3 match) and promote to `agent_curated` |
| 858 | REAL-EST → IWMS | `floor_plan.updated` | `floor_plans` | Plan facility | 10943 | confident L3 |
| 870 (inbound) | IWMS → REAL-EST | `space_utilization.measured` | `space_utilization_reports` | Provide workspace and facilities | 10944 | confident L3 |

Deferred to Discover Pass 3: none , every cross-domain handoff has a clean PCF candidate. Composed key `(handoff_id, process_id)` already exists for 294, 856, 857; for 294 and 856 the agent recommends REPLACING the existing substring rows with the curated rows (DELETE + INSERT) so the audit ships the higher-confidence mapping. For 857 the existing substring row is itself a correct L3 match, so PROMOTE: insert a new `(857, 343, proposal_source='agent_curated', record_status='new')` while leaving the existing substring row in place.

#### Bucket 1 sub-category counts

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M1+M2+M7, B6, B7, B9, B10b, B11, B12, B4, C1, F1, F7) | 12 |
| APQC TAGGING (9 rows proposed, 2 replacements + 1 promotion + 6 new) | 1 (H1 line item, 9 rows) |
| MISSING (deferred to Bucket 3 for vetted vendor research) | 0 |
| WRONG-OWNERSHIP / SCOPE-CREEP | 0 |
| BOUNDARY (separately) | 1 (B1-S6 covers the routable inbound side) |
| **Bucket 1 total** | 14 |

#### Boundary findings per neighbor (Pass 4: pairwise reconciliation)

| Neighbor | Direction | Section 1 (wired) | Section 2 (NULL FK) | Section 3 (missing handoffs) | Section 4 (boundary integrity) | Section 5 (cross-domain relationships) |
|---|---|---|---|---|---|---|
| IWMS | REAL-EST → IWMS | 0 | 858 (NULL source_module , fixed by B1-S5 after modules land) | None obvious | OK (`floor_plans` consumed in IWMS) | Missing: `real_estate_properties contains property_spaces` cross-cuts to IWMS `locations`? Decision needed in B2-S5. |
| IWMS | IWMS → REAL-EST | 0 | 870 (NULL target_module , needs REAL-EST DMDO consumer on `space_utilization_reports` or accept domain-level signal) | None obvious | Either consumer DMDO row needed (B1-S6) or design-decision | None today |
| FSM | REAL-EST → FSM | 0 | 291 (NULL source_module , fixed by B1-S5) | None obvious; payload + trigger event well-wired | OK | Missing: `facility_work_orders.dispatches_to field_service_orders` (or whatever FSM masters). Surface to user under B2-S6. |
| FSM | FSM → REAL-EST | 0 | 292 (NULL on both ends , fixed by B1-S5 + B1-S6) | None obvious | OK | Same as above (mirror direction) |
| EAM | REAL-EST → EAM | 0 | 294 (NULL source_module) | None obvious | OK (`industrial_assets` mastered in EAM) | EXISTS: `capital_projects commissions industrial_assets` (id 351 → 475). Section 1 sanity check passes. |
| ESG | REAL-EST → ESG | 0 | 293 (NULL source_module) | None obvious | OK | Missing: `utility_meter_readings feeds emissions_records` (ESG payload TBD; route to B3-S6 for ESG masters discovery). |
| HCM | REAL-EST → HCM | 0 | 295 (NULL source_module) | None obvious | OK (`employees` is a REAL-EST consumer at the legacy domain level) | Missing: `property_spaces allocated_to employees`. Author edge during B1-S2 or B8 pass. |
| RE-CRE | REAL-EST → RE-CRE | 0 | 856 (NULL source_module) | None obvious | RE-CRE masters TBD; report-only | None today (RE-CRE Phase B not yet audited from this end). |
| RE-INVEST | REAL-EST → RE-INVEST | 0 | 857 (NULL source_module) | None obvious | RE-INVEST masters TBD; report-only | None today |

Aggregate: 7 boundary findings reduce to "fix B1-S5 + B1-S6 once modules land" plus 4 missing cross-domain relationships routed to B8 (covered by B1-S2 follow-on or surfaced as standalone B8 work after module load).

### Bucket 2: Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module split shape** , proposed 4 modules in B1-S1 (`REAL-EST-PORTFOLIO`, `REAL-EST-SPACE-OPS`, `REAL-EST-FACILITY-OPS`, `REAL-EST-CAPITAL-PROJECTS`). Alternative shapes: (a) 2 modules (Portfolio + Operations) , fewer cross-module handoffs but coarser RBAC; (b) 3 modules collapsing Space-Ops into Portfolio; (c) 4-module split as proposed; (d) 5 modules adding a separate `REAL-EST-LEASE-MGMT` for ASC 842 compliance scope. | This is an architectural decision the agent cannot make alone; module shape drives downstream lifecycle states, permissions, roles, and handoff attribution. | Pick (a), (b), (c), or (d). User may add or rename modules. |
| B2-S2 | **Relationship to IWMS sub-domain** , IWMS today realizes all 7 of REAL-EST's capabilities via `domain_module_capabilities`. Two reconciliations: (a) REAL-EST is an umbrella with no deployable surface; reassign the 8 masters to IWMS modules and convert REAL-EST to a leadership-tier landing domain with 1 derived-signals module; (b) REAL-EST and IWMS are peer markets that overlap on capabilities; keep both, REAL-EST masters its 8 entities in 4 new modules, IWMS keeps its 6 (desk_bookings, room_reservations, etc.), and `capability_domains` rows split realization. The current state is incoherent because REAL-EST has masters but no modules. | Either reading is plausible; the user's product intent governs. | (a) Leadership-tier collapse; (b) peer-market split; (c) merge REAL-EST and IWMS into a single domain (rejects the parent_domain_id hierarchy). |
| B2-S3 | **B4 pattern-flag positive review** , per B1-S9, likely-true flags: `property_leases.has_single_approver`, `property_leases.has_submit_lock`, `capital_projects.has_single_approver`, `capital_projects.has_submit_lock`, `facility_work_orders.has_personal_content`, `occupancy_records.has_personal_content`. Confirm each. | Pattern flags are workflow-shape judgments the user owns; the false-by-default doesn't establish review. Rule #15 forbids notes commentary on flag decisions; user decisions land in this audit conversation. | Per-flag yes/no per master. |
| B2-S4 | **CAFM sub-domain** is empty (no modules, no DMDO, no masters). Three options: (a) populate CAFM as a starter-kit / lite variant of REAL-EST per Rule #19; (b) leave CAFM dormant , domain row exists for SEO but no modules; (c) merge CAFM into REAL-EST and delete the sub-domain entry. CAFM's description (light-tier mid-market) suggests (a) is the intent. | This is a Phase 0 / strategy decision orthogonal to REAL-EST's modularization. | Pick path; defer to a separate audit if (a). |
| B2-S5 | **`real_estate_properties contains property_spaces` vs IWMS `locations contains rooms_and_areas`** , IWMS masters `locations` (id 795). REAL-EST masters `real_estate_properties` (id 344) and `property_spaces` (id 347). Are these the same concept rendered at two granularities, or distinct masters (REAL-EST `real_estate_properties` = a building or facility leased/owned; IWMS `locations` = the entry in a global address registry the platform side-services use)? If the same, one becomes `embedded_master` of the other. | Naming arbitration question Rule #9 / Rule #16 applies to. Cross-domain master collision risk. | (a) Distinct masters; (b) IWMS `locations` is the canonical infrastructure-master, REAL-EST `real_estate_properties` becomes `embedded_master`; (c) reverse. |
| B2-S6 | **Cross-domain relationships missing for 4 handoff payloads** , `facility_work_orders` (handoff 291 → FSM), `property_spaces` (295 → HCM), `utility_meter_readings` (293 → ESG), `real_estate_properties` (856 → RE-CRE, 857 → RE-INVEST). Each needs a target-side master; only EAM is wired today (351 → 475 `industrial_assets`). | Each target master must be discovered or authored on the target side before the relationship row can be written; some target masters (RE-CRE, RE-INVEST) may not exist yet. | Surface target-master IDs for each; the audit can author the relationship rows once IDs are known. |

### Bucket 3: Phase 0 pending (speculative)

Without a Phase 0 vendor-surface artifact for REAL-EST, the following candidates are eyeball-mode proposals from vendor knowledge (IBM TRIRIGA, Planon, Archibus, MRI OnCore, Eptura, Spacewell, Accruent). Each needs vendor research vetting before becoming a Phase B insert.

| ID | Candidate entity | Vendor evidence | Proposed module | Recommended verification |
|---|---|---|---|---|
| B3-S1 | `building_systems` | TRIRIGA Asset, Planon Building Operations, Honeywell Forge , HVAC, lighting, fire panels per building. | REAL-EST-FACILITY-OPS | Phase 0 lookup in Planon and TRIRIGA docs; collision check against `industrial_assets` (EAM). |
| B3-S2 | `preventive_maintenance_schedules` | Every CMMS (Nuvolo, Accruent, TRIRIGA) ships scheduled PM as a first-class master, distinct from `facility_work_orders` (which is the instance). | REAL-EST-FACILITY-OPS | Phase 0 vendor docs on PM scheduling. |
| B3-S3 | `space_classifications` | Archibus Space Catalog, Eptura Workspace, Planon , space type / category taxonomy (office, meeting, support, retail). | REAL-EST-SPACE-OPS | Vendor schema docs (Archibus rooms_categories, Eptura space_categories). |
| B3-S4 | `move_requests` | TRIRIGA Move Manager, Archibus Move Mgmt , formal employee/team relocation workflow distinct from `property_space.allocated`. | REAL-EST-SPACE-OPS | Phase 0 vendor docs; collision check against IWMS `desk_bookings`. |
| B3-S5 | `chargebacks` / `space_chargebacks` | TRIRIGA Charge Back, Planon Cost Management , internal cost allocation of leased / owned space to business units. | REAL-EST-PORTFOLIO | Phase 0 vendor docs on chargeback configurations. |
| B3-S6 | `emission_factors` / `emission_records` (target-side master for handoff 293) | ESG-domain. Per Section 5 of pairwise pass with ESG, the REAL-EST → ESG handoff payload `utility_meter_readings` feeds into an ESG-mastered emissions record that probably does not exist yet. | (cross-domain , ESG owns) | Surface for ESG audit; possibly queue an ESG candidate. |
| B3-S7 | `visitor_passes` overlap with VIS-MGMT (id 24) | VIS-MGMT exists. Decide whether visitor management is in scope for REAL-EST modules at all, or strictly delegated to VIS-MGMT via consumer DMDO. | (cross-domain , VIS-MGMT owns) | Phase 0 review of TRIRIGA / Eptura visitor capabilities. |

### Candidate domains queued to `_missing-domains.md`

- **EHS-MGMT** , Environmental, Health and Safety Management. Distinct from ESG (which is reporting / disclosure) and FSQM (food-specific). Vendor evidence: Cority, Intelex, Sphera, Enablon, VelocityEHS, Gensuite, ETQ Reliance. Bordering REAL-EST through OSHA / building-safety inspection workflow.
- **BMS-BAS** , Building Management and Automation Systems. Vendor evidence: Siemens Desigo, Johnson Controls Metasys, Honeywell Niagara, Schneider EcoStruxure, ABB Ability. Adjacent to REAL-EST-FACILITY-OPS but distinct (operational technology, not business systems).
- **LEASE-ACCT** , Lease Accounting and Administration. Vendor evidence: LeaseQuery, Visual Lease, CoStar Real Estate Manager, Lucernex, Nakisa. ASC 842 / IFRS 16 specialist market that REAL-EST partly covers via `property_leases`; may be a peer domain or a sub-feature depending on point-solution-market test.

All three queued via `scripts/analytics/append_missing_domain.ts`.

### Cross-bucket dependencies

- **B1-S1 (module split) is the master prerequisite.** Every other Bucket 1 fix downstream (B1-S2 master relationships, B1-S3 user edges, B1-S5 NULL source-module FKs, B1-S6 NULL target-module FK on 292, B1-S8 lifecycle states with `domain_module_id`, B1-S11 module-level system skills) needs the modules to exist first. Hold B1-S2 through B1-S12 until the module shape (Bucket 2 B2-S1, B2-S2) is decided.
- **B2-S1 + B2-S2 are tightly coupled.** Module split (B2-S1) cannot be answered without first deciding REAL-EST's relationship to IWMS (B2-S2). Resolve B2-S2 first.
- **B2-S5 (real_estate_properties vs locations collision) may rewrite B1-S1's master assignment.** If `locations` is canonical infrastructure-master, `real_estate_properties` becomes `embedded_master` and the REAL-EST-PORTFOLIO module shrinks.
- **B3 candidates are independent of Bucket 1 / 2.** Vetted-route Phase 0 research can run in parallel with module load.
- **APQC TAGGING (H1) is independent of the module load.** All 9 cross-domain handoff IDs already exist; tagging only needs `(handoff_id, process_id)` rows. Can ship before the modules land.

### Per-bucket prompts

**Bucket 1: fix these now?** Reply with: `all`, or list (e.g. `S1, S2, H1-top5`), or `skip`.

- **S1 (module split):** depends on B2-S1 + B2-S2 answers. Recommend resolving Bucket 2 first.
- **S2-S12 (master relationships, user edges, event_category, NULL FKs, aliases, lifecycle states, pattern flags, function ownership, system skills, channel-vs-capability):** all gated on S1. Once modules land, batch S2 through S12 in one fix-load.
- **H1 (APQC tagging , 9 row proposals including 2 replacements):** load now or in a follow-up batch? No module dependency.

**Bucket 2 , what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (module split):** pick (a / b / c / d).
- **B2-S2 (REAL-EST vs IWMS relationship):** pick (a / b / c).
- **B2-S3 (pattern flags):** per-flag yes/no.
- **B2-S4 (CAFM disposition):** pick (a / b / c).
- **B2-S5 (real_estate_properties vs locations collision):** pick (a / b / c).
- **B2-S6 (cross-domain target masters):** surface target IDs.

**Bucket 3 , Phase 0 pending , vet via formal Phase 0 vendor research, or eyeball-mode?** If eyeball, name which of the 7 candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

- **IWMS audit (B9b + B10b)** , handoff 858 (`floor_plan.updated`) source module NULL needs the REAL-EST module to land first; IWMS already has `target_domain_module_id=102`. Handoff 870 (`space_utilization.measured`) needs REAL-EST to declare consumer DMDO on `space_utilization_reports` once REAL-EST has a module to anchor it.
- **FSM audit (B10b)** , handoff 291 needs FSM to derive `target_domain_module_id` from its own modules. Handoff 292 (inbound) needs FSM to derive `source_domain_module_id`.
- **ESG audit (B5 + B8)** , handoff 293 payload `utility_meter_readings` needs an ESG consumer DMDO row; the corresponding cross-domain relationship `utility_meter_readings feeds emission_records` needs an ESG target master that may not yet exist (B3-S6).
- **EAM audit (B10b)** , handoff 294 needs EAM `target_domain_module_id`. The existing relationship `capital_projects commissions industrial_assets` (351 → 475) is correct on the REAL-EST side; EAM owns the symmetric inbound check.
- **HCM audit (B8)** , handoff 295 payload `property_spaces` needs an HCM consumer DMDO row or HCM accepts the handoff as domain-level signal. Cross-domain relationship `property_spaces allocated_to employees` needs author.
- **RE-CRE audit (full Phase A/B)** , handoff 856 target module NULL. RE-CRE has no Phase B loaded; ID 145 exists in `domains` but no masters / no modules. Schedule full b1 audit.
- **RE-INVEST audit (full Phase A/B)** , handoff 857 target module NULL. Same as RE-CRE; schedule.
- **VIS-MGMT audit** , B3-S7 raises whether visitor passes overlap with REAL-EST's facility-ops or sit purely in VIS-MGMT.
- **CAFM** , if B2-S4 picks (a) starter-kit, schedule a CAFM audit after REAL-EST modules land.

## 2026-05-31, Continuation: B1 technical fixes

Loader: `.tmp_deploy/fix_real_est_b1_technical_2026_05_31.ts`. Tenant verified ma@adenin.com, module 1001 in scope, no JWT errors.

### Applied

- **B1-S4 (B9 event_category enum backfill).** PATCH 4 rows: 938 `property.listed` -> `lifecycle`, 939 `property.updated` -> `state_change`, 940 `floor_plan.created` -> `lifecycle`, 941 `floor_plan.updated` -> `state_change`. All four verified live.
- **B1-S3 (B7 user-edges, Rule #10).** INSERT 13 `data_object_relationships` rows from `users` (id 748, `kind=platform_builtin`) to the 8 REAL-EST masters using the actor list pre-specified in the audit: properties (owns), leases (signs + approves), floor_plans (authors), property_spaces (occupies + plans), occupancy_records (records), facility_work_orders (requests + is assigned to + approves), utility_meter_readings (reads), capital_projects (manages + approves). `owner_side='target'` (master owns lifecycle), `relationship_type='one_to_many'`, `relationship_kind='reference'`. Record IDs 1600-1612.
- **H1 (handoff_processes inserts).** INSERT 7 `agent_curated` rows after resolving each audit-proposed PCF by `process_name` (the audit's literal IDs were stale; resolved names matched live process ids 353, 1783, 1412, 345, 1511, 344, 345): (292, 353), (293, 1783), (294, 1412), (295, 345), (856, 1511), (858, 344), (870, 345). Handoff 291 already had `agent_curated` row 367 (process 824 `Request unplanned maintenance`); no insert. Handoff 857 promote-only (existing substring row 169 on process 343, which is the same PCF the audit promotes) requires PATCH of `proposal_source` on an existing row, not in this run's technical-only scope; surfacing as gap below.

### Deferred (with reasons)

| ID | Reason |
|---|---|
| B1-S1 (module split) | Architectural decision; gated on B2-S1 + B2-S2 user picks. |
| B1-S2 (master-to-master relationships) | Not in technical scope (technical user-edges only per Rule #10); also B6 master-to-master edges typically follow module shape. |
| B1-S5 (NULL source_module_id on 6 outbound handoffs) | Gated on B1-S1; no source modules exist yet. |
| B1-S6 (NULL target_module on 292 + 870) | Gated on B1-S1 for 292; 870 also gated on B2-S2 design decision. |
| B1-S7 (data_object_aliases) | Bulk aliases not pre-specified as exact tuples; aliases also implicate vendor names that need Rule #18 scan and user approval per tuple. |
| B1-S8 (lifecycle states) | Needs `domain_module_id` from B1-S1; permission_verb_override states+verbs partly specified but module FK is the blocker. |
| B1-S9 (B4 pattern flags) | Gated on B2-S3 per-flag user confirmation. |
| B1-S10 (business_function_domains contributors/consumers) | Explicit DEFER per spec (no new business_function_domains contributors/consumers without user confirmation). |
| B1-S11 (system skill retirement + module-level rebind) | Gated on B1-S1 (new modules required first). |
| B1-S12 (channel rebind from `send_email` to `notify_person`) | Gated on B1-S11 sequencing; also a `tool_id` rebind on `skill_tools` is not on the in-scope PATCH operation list. |
| H1 handoff 857 promote (substring -> agent_curated) | Requires PATCH of `proposal_source` on row 169; not in technical-only PATCH allowlist (renames + permission_verb_override + enum backfills only). Surface to user. |
| H1 handoff 294/856 replace (DELETE existing substring rows 136 / 168) | Audit identifies by composed key, not row id; spec requires audit to name row IDs for DELETE. Both handoffs now carry both rows (substring + agent_curated); user can DELETE 136 and 168 explicitly if desired. |

### Gap surfaces for the user

- Handoff 857: existing row 169 (handoff 857, process 343, `discovery_substring`) is the same PCF the audit promotes. Approve a PATCH to set `proposal_source='agent_curated'` on row 169?
- Handoff 294: existing row 136 (process 311 `Perform capital project accounting`) now sits alongside the new agent_curated row 398 (process 1412 `Measure financial returns...`). Confirm DELETE row 136 to ship the audit's replacement intent?
- Handoff 856: same shape, existing row 168 (process 343 `Develop property strategy and long term vision`) alongside new row 400 (process 1511 `Confirm alignment of property...`). Confirm DELETE row 168?

## 2026-05-31, Audit

### Summary

- **Current footprint:** REAL-EST (id 141) holds 7 capabilities, 12 solutions, 8 domain-owned masters plus 3 cross-domain DMDO rows (`employees` consumer, `configuration_items` consumer, `locations` contributor) in legacy `domain_data_objects`, **still 0 `domain_modules`**, 16 `trigger_events` (all 4 prior empty `event_category` rows backfilled), 7 outbound + 2 inbound cross-domain handoffs, 1 cross-domain master-to-master relationship (`capital_projects` 351 commissions `industrial_assets` 475), 13 `users` edges across all 8 masters (loaded prior pass), 0 intra-domain master-to-master relationships, 0 `data_object_aliases`, 0 `data_object_lifecycle_states`, 0 `business_function_domains`, 0 `domain_regulations`, 12 `handoff_processes` rows (10 `agent_curated`, 2 surviving `discovery_substring` duplicates on handoffs 294 and 856 plus the still-unpromoted substring row 169 on 857), and the legacy `real-est-system` skill (id 99) still domain-level (`domain_module_id=null`) with 10 `skill_tools` (8 platform queries + `send_email` platform + `sign_document` external).
- **Sub-domain context:** REAL-EST has two children, `IWMS` (id 23) with 5 full modules and 6 masters, and `CAFM` (id 142) confirmed empty (0 modules). All 7 of REAL-EST's own capabilities still realize via IWMS modules, never in REAL-EST itself.
- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

Structural pass bands: A1 pass; A2 pass (7 capabilities); A3 pass (12 solutions, 6 primary); **A4 fail** (empty catalog_tagline + catalog_description); **M1 hard fail** (0 modules); **M2 hard fail** (7 capabilities require >=2 modules); **M4 hard fail** (every capability unrealized in REAL-EST); **M7 hard fail** (catalog-wide: 8 masters have 0 master DMDO rows); M8 vacuous; **B5 pass** (no embedded_master rows); **B6 fail** (1 cross-domain rel, 0 intra-domain master-to-master edges); **B7 pass** (13 users edges); **B9 pass** (all 16 events carry valid event_category); B9b vacuous; **B10b partial** (NULL source_module on 291/293/294/295/856/857/858; NULL target_module on 292/293/294/295/856/857/870); **B11 fail** (0 aliases); **B12 hard fail** (0 lifecycle states); **C1 hard fail** (0 business_function_domains); E1-E5 vacuous (no modules; 0 REAL-EST roles); **F1 fail** (legacy skill 99 not yet retired); F2 vacuous; F3 partial (legacy skill carries 10 skill_tools, OK count but bound to a non-module-level skill); F4 pass (operation_kind invariants hold on all 10 rows); F5 uncomputable per-module; legacy aggregate strict_score 9/10.

### Bucket 1, in-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 + M2 + M4 + M7 (hard fail) | REAL-EST still has 0 `domain_modules`; 7 capabilities are unrealized; 8 domain-owned masters carry 0 catalog-wide `role=master` DMDO rows. Per Rule #14 every `domains` row needs at least 1 full module; with 7 capabilities the floor is 2 full modules. The prior audit proposed 4 modules (REAL-EST-PORTFOLIO, REAL-EST-SPACE-OPS, REAL-EST-FACILITY-OPS, REAL-EST-CAPITAL-PROJECTS); decision still pending under B2-S1. | Author the chosen `domain_modules` set, 8 master `domain_module_data_objects` rows, 7 `domain_module_capabilities` rows. Reassign `capability_domains` away from IWMS where REAL-EST modules will realize. Gated on B2-S1 + B2-S2 user choices. |
| B1-S2 | A4 (fail) | `domains.catalog_tagline` and `domains.catalog_description` are empty on REAL-EST. Per Rule #20 these are buyer-voice copy (workflow + value), not analyst voice. Once non-empty the value is never overwritten without explicit per-row approval. | Draft both fields and surface to the user before writing. Skipped this pass per Rule #20 draft-then-approve discipline. |
| B1-S3 | B6 (fail) | 0 intra-domain `data_object_relationships` between REAL-EST's 8 masters. Required edges: `real_estate_properties has_many floor_plans`, `floor_plans has_many property_spaces`, `property_spaces has_many occupancy_records`, `real_estate_properties has_many property_leases`, `real_estate_properties has_many utility_meter_readings`, `real_estate_properties has_many facility_work_orders`, `real_estate_properties has_many capital_projects`, `property_spaces has_many facility_work_orders` (location of repair). | Author 8 relationship rows with verb / inverse_verb / cardinality / `owner_side='source'`. Not gated on modules; can load now. |
| B1-S4 | B10b (partial) | NULL `source_domain_module_id` on outbound handoffs 291, 293, 294, 295, 856, 857, 858; NULL `target_domain_module_id` on 292, 293, 294, 295, 856, 857, 870. Only 291 (target=161 FSM) and 858 (target=102 IWMS) are wired on the counter-party side. | Gated on B1-S1. PATCH per the strongest-role rule once REAL-EST modules exist; 292/870 also depend on B2-S2 architectural decision. |
| B1-S5 | B11 (fail) | 0 `data_object_aliases` on any of the 8 masters. Cross-vendor synonyms exist for every master (industry terms and vendor labels, allowed in `data_object_aliases` per Rule #18). | Draft a working set per master and surface to user for tuple approval before insert. |
| B1-S6 | B12 (hard fail) | 0 `data_object_lifecycle_states` on any of 8 masters. Required state machines per master: leases (draft, active, renewal_pending, renewed, expired, terminated); facility_work_orders (created, assigned, dispatched, in_progress, completed, closed); capital_projects (planning, approved, in_progress, completed, cancelled); property_spaces (available, allocated, released); real_estate_properties (in_portfolio, active, divested); utility_meter_readings (recorded, validated, published); floor_plans (draft, published, superseded); occupancy_records likely config-shape exempt. | Gated on B1-S1 for `domain_module_id` resolution. Author once modules land. |
| B1-S7 | B4 (re-eval) | All 8 masters carry the three pattern flags false-by-default. Positive review still required on: `property_leases.has_single_approver`, `property_leases.has_submit_lock`, `capital_projects.has_single_approver`, `capital_projects.has_submit_lock`, `facility_work_orders.has_personal_content`, `occupancy_records.has_personal_content`. | Gated on B2-S3 per-flag user confirmation. |
| B1-S8 | C1 (hard fail) | 0 `business_function_domains` rows for REAL-EST. Baseline shape: owner=`Facilities and Real Estate`, contributor=`Finance` (lease accounting, capital budgeting), consumer=`Human Resources` (workplace allocation), consumer=`ESG and Sustainability` (utility data). | Surface row set for user confirmation, then INSERT. Owner row is uncontested; the 3 contributor/consumer rows need user yes per prior B2 deferral. |
| B1-S9 | H1 (gap surface) | 3 `discovery_substring` rows still coexist with the higher-confidence `agent_curated` rows on the same handoffs: row 136 (handoff 294, process 311), row 168 (handoff 856, process 343), row 169 (handoff 857, process 343). Audit promise was: DELETE 136 and 168 (replacements), PATCH 169 to `proposal_source='agent_curated'` (promotion). | Approve DELETE+DELETE+PATCH (or selectively), then apply. Gated on B2-S7. |

#### Bucket 1 sub-category counts

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M1+M2+M4+M7, A4, B6, B10b, B11, B12, B4, C1) | 8 |
| APQC TAGGING (cleanup: DELETE + PATCH on substring rows) | 1 |
| MISSING / WRONG-OWNERSHIP / SCOPE-CREEP | 0 |
| BOUNDARY | 0 (subsumed under B1-S4 module FK fix) |
| **Bucket 1 total** | 9 |

### Bucket 2, surface-for-user (judgment calls)

| ID | Question | Why agent cannot answer | Options |
|---|---|---|---|
| B2-S1 | Module split shape for REAL-EST (still open from prior audit). Proposed 4 modules (REAL-EST-PORTFOLIO, REAL-EST-SPACE-OPS, REAL-EST-FACILITY-OPS, REAL-EST-CAPITAL-PROJECTS). Alternatives: 2-module collapse, 3-module collapsing space-ops into portfolio, 5-module split adding REAL-EST-LEASE-MGMT. | Architectural decision; drives lifecycle states, permissions, roles, handoff attribution. | (a / b / c / d) per prior audit. |
| B2-S2 | REAL-EST vs IWMS relationship (still open). Sub-domain IWMS today realizes all 7 REAL-EST capabilities. Either REAL-EST is leadership-tier (collapse capabilities into IWMS modules), peer market (4 new REAL-EST modules + IWMS keeps 6 masters), or merge the two domains. | Product intent governs; agent cannot decide alone. | (a / b / c) per prior audit. |
| B2-S3 | B4 pattern-flag positive review on 6 likely-true flags across `property_leases`, `capital_projects`, `facility_work_orders`, `occupancy_records`. | Pattern flags are workflow-shape judgments the user owns. Rule #15 forbids notes commentary on the decision. | Per-flag yes/no. |
| B2-S4 | CAFM disposition (sub-domain 142, confirmed empty: 0 modules). Same options as prior audit: starter-kit / lite variant of REAL-EST per Rule #19, leave dormant, or merge into REAL-EST. | Strategy decision orthogonal to REAL-EST modularization. | (a / b / c). |
| B2-S5 | `real_estate_properties` (REAL-EST master 344) vs `locations` (IWMS master 795) collision. Same buildings rendered at two granularities, or distinct masters? Per Rule #16, infrastructure-masters (locations) are typically the canonical layer and consumer entities `embedded_master` them. | Naming arbitration question (Rule #9, Rule #16); cross-domain master collision risk. | (a) Distinct masters; (b) IWMS `locations` canonical, REAL-EST `real_estate_properties` becomes embedded_master; (c) reverse. |
| B2-S6 | Cross-domain target masters for handoff payloads 291 (FSM `facility_work_orders`), 293 (ESG `utility_meter_readings`), 295 (HCM `property_spaces`), 856 (RE-CRE `real_estate_properties`), 857 (RE-INVEST `real_estate_properties`). Only the EAM target (351 commissions 475) is wired. | Each target master must exist on the other domain before the relationship row writes. RE-CRE and RE-INVEST have no masters today. | Surface target master IDs per neighbor; audit then authors the relationship rows. |
| B2-S7 | H1 cleanup intent confirmation. Three `discovery_substring` rows (136, 168, 169) still coexist with the curated rows the prior audit shipped. The audit-of-record intent was DELETE 136 + DELETE 168 + PATCH 169 (`proposal_source='agent_curated'`). | Each is a deliberate decision: DELETE removes an alternative-PCF claim; PATCH lifts confidence on the same row. The prior continuation explicitly surfaced these as gap surfaces. | Approve DELETE+DELETE+PATCH (full cleanup), selectively approve, or skip. |

### Bucket 3, Phase 0 pending (speculative)

Same as prior audit; vendor-research vetting still owed. Carried forward verbatim per the file-as-canonical-record rule.

| ID | Candidate entity | Vendor evidence | Proposed module | Verification |
|---|---|---|---|---|
| B3-S1 | `building_systems` | IWMS leaders ship building-system inventory distinct from `industrial_assets` (EAM). | REAL-EST-FACILITY-OPS | Phase 0 vendor docs; collision check vs `industrial_assets`. |
| B3-S2 | `preventive_maintenance_schedules` | Every CMMS ships scheduled PM as a first-class master, distinct from `facility_work_orders` (instance). | REAL-EST-FACILITY-OPS | Phase 0 vendor docs on PM scheduling. |
| B3-S3 | `space_classifications` | Space-type / category taxonomy (office, meeting, support, retail) shipped by every leader. | REAL-EST-SPACE-OPS | Vendor schema docs on room categories. |
| B3-S4 | `move_requests` | Move management workflow distinct from `property_space.allocated`. | REAL-EST-SPACE-OPS | Phase 0 vendor docs; collision check vs IWMS `desk_bookings`. |
| B3-S5 | `chargebacks` / `space_chargebacks` | Internal cost allocation of leased / owned space to business units. | REAL-EST-PORTFOLIO | Phase 0 vendor docs on chargeback configurations. |
| B3-S6 | `emission_factors` / `emission_records` (target-side for handoff 293) | ESG-domain. REAL-EST utility_meter_readings feeds an ESG emissions record that likely does not exist yet. | (cross-domain, ESG owns) | Surface for ESG audit; queue candidate. |
| B3-S7 | `visitor_passes` overlap with VIS-MGMT (id 24) | Decide whether REAL-EST consumes VIS-MGMT or owns visitor management. | (cross-domain, VIS-MGMT owns) | Phase 0 review of TRIRIGA / Eptura visitor capabilities. |

### Pairwise reconciliation (Pass 4 carry-forward)

Recomputed: IWMS still primary neighbor (weight 4), no new cross-domain DMDO since prior audit. Boundary findings collapse into B1-S4 (NULL FK module fixes once B1-S1 lands) plus the 4 missing cross-domain relationships routed under B2-S6.

### Continuation: not applied this pass

Structural-only Validate b1 run. No PATCH or INSERT writes. All 9 Bucket 1 items either need user gating (B1-S1 module split, B1-S2 catalog UX copy, B1-S5 alias tuples, B1-S7 pattern flags, B1-S8 business-function rows, B1-S9 H1 cleanup) or are gated on B1-S1 (B1-S4, B1-S6). B1-S3 (intra-domain master-to-master relationships) is the one technical item not gated on modules; surfaced for next pass.

## 2026-06-02 Audit (modularization)

Loader: `.tmp_deploy/modularize_real_est_2026-06-02.ts` (idempotent, safe to re-run). Scope: modules + entity assignment only (reuse existing entities). No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created.

### What REAL-EST is

REAL-EST (id 141, "Real Estate and Workplace Management") is the umbrella corporate-real-estate / workplace / facilities domain: properties, leases, spaces, occupancy, maintenance, capital projects, and utility consumption (Scope 1+2 emissions source for ESG). It carries two market-tier sub-domains via `parent_domain_id` (IWMS enterprise, CAFM mid-market). This is a horizontal corporate-function domain consumed across every industry vertical (IWMS/CAFM serve all sectors), not the real-estate-services industry itself; `domain_modules.industry_id` left null on all 4 modules (no single-industry binding; the clean `Real Estate` industry row id=15, NAICS 531000, denotes the vertical market, not this corporate-function umbrella).

### Modules created (4 full)

Resolves the long-open B2-S1 (module split) on option (c) and B2-S2 on option (b) peer-market split: REAL-EST now masters its 8 entities in its own modules; IWMS keeps its 6.

| Module id | Code | Capabilities | Masters | Borrowed (role/necessity) |
|---|---|---|---|---|
| 288 | REAL-EST-PORTFOLIO | REAL-PROPERTY-MGMT (373), REAL-LEASE-MGMT (375) | real_estate_properties (344), property_leases (345), floor_plans (346) | locations (795 contributor/optional), configuration_items (76 consumer/required) |
| 289 | REAL-EST-SPACE-OPS | REAL-SPACE-OPTIM (374), REAL-OCCUPANCY-ANALYTICS (377) | property_spaces (347), occupancy_records (348) | employees (31 consumer/required) |
| 290 | REAL-EST-FACILITY-OPS | REAL-MAINTENANCE (376), REAL-UTILITY-TRACKING (378) | facility_work_orders (349), utility_meter_readings (350) | — |
| 291 | REAL-EST-CAPITAL-PROJECTS | REAL-CAPITAL-PROJECTS (379) | capital_projects (351) | — |

### Verification (live)

- M1/M2 pass: 4 full modules for 7 capabilities (floor of 2 met).
- M4 pass: all 7 capabilities placed in exactly one REAL-EST module each; none orphaned.
- M6 / no-empty-module pass: every module has >=1 capability and >=1 data_object.
- M7 pass (in-domain AND catalog-wide): all 8 masters (344-351) appear exactly once, each in one REAL-EST module. Pre-check query found zero pre-existing `role=master` rows on any of the 8 ids catalog-wide; no demotions to embedded_master were required.
- Borrowed roles preserved: locations contributor/optional, configuration_items consumer/required, employees consumer/required (unchanged from legacy `domain_data_objects`).
- DMDO + DMC `notes` empty (R15); no `record_status` on any insert (R1); no vendor/product names in module names/descriptions (R18).

### Demotions via pre-check

None. All 8 intended masters were unclaimed catalog-wide.

### Deferred / unchanged this pass (carried into state.yaml)

Out of modularization scope per the job: B1A-S3 (8 intra-domain master-to-master relationships, ungated, now loadable), lifecycle states (B12, now have a `domain_module_id` to anchor), per-module system skills + legacy skill 99 retirement (F1/F2/F3, Rule #17), catalog UX copy (A4 / M8 catalog_tagline + catalog_description), aliases (B11), pattern-flag positive review (B4), business_function_domains (C1), NULL handoff module FKs (B10b, now derivable from the 4 module ids), H1 substring-row cleanup, and the 7 Phase-0 vendor candidates (b3). The B2 architectural questions B2-S1/B2-S2 are now resolved by this build; B2-S4 (CAFM), B2-S5 (real_estate_properties vs locations collision), B2-S6 (cross-domain target masters), B2-S7 (H1 cleanup) remain user-owned.

## 2026-06-06 - b1a execution

Loader: `.tmp_deploy/fix_real_est_b1a_2026-06-06.ts` (idempotent, safe to re-run). Tenant verified `ma@adenin.com` / org `adenin`, module 1001 in scope, no JWT errors. record_status omitted on every insert (DB default `new`, Rule #1). No `notes` column written anywhere (Rule #15). No vendor/product names in any authored field (Rule #18).

### B1A-S3 (B6) - DONE

INSERT 8 intra-domain master-to-master `data_object_relationships` rows (ids 2056-2063). All `relationship_type=one_to_many`, `relationship_kind=reference`, `owner_side=source`, `is_required=false`, with verb/inverse_verb:

| id | edge | verb / inverse |
|---|---|---|
| 2056 | real_estate_properties 344 -> floor_plans 346 | has / belongs to |
| 2057 | floor_plans 346 -> property_spaces 347 | subdivides into / is part of |
| 2058 | property_spaces 347 -> occupancy_records 348 | has / records occupancy for |
| 2059 | real_estate_properties 344 -> property_leases 345 | is leased under / covers |
| 2060 | real_estate_properties 344 -> utility_meter_readings 350 | is metered by / meters |
| 2061 | real_estate_properties 344 -> facility_work_orders 349 | has / is raised against |
| 2062 | real_estate_properties 344 -> capital_projects 351 | undergoes / is performed on |
| 2063 | property_spaces 347 -> facility_work_orders 349 | has / is located in |

### B1A-LIFECYCLE (B12) - DONE (7 of 8 masters; occupancy_records surfaced)

Prerequisite PATCH (Rule #12 / B13): `data_objects.entity_type` was `unclassified` on all 8 masters; lifecycle states are only coherent on `operational_workflow` entities, so the 7 workflow masters were classified first. PATCH `entity_type` `unclassified` -> `operational_workflow` on 344, 345, 346, 347, 349, 350, 351 (prior value on each: `unclassified`). occupancy_records (348) left `unclassified` (config-shape exemption candidate, user decision per the b1a finding) and given no lifecycle states.

INSERT 29 `data_object_lifecycle_states` rows, module-anchored per the action:

- real_estate_properties 344 (module 288): in_portfolio(initial) -> active -> divested(terminal, gate `divest_property`).
- property_leases 345 (module 288): draft(initial) -> active(gate `activate_lease`) -> renewal_pending -> renewed(terminal, gate `renew_lease`) / expired(terminal) / terminated(terminal, gate `terminate_lease`).
- floor_plans 346 (module 288): draft(initial) -> published(gate `publish_floor_plan`) -> superseded(terminal).
- property_spaces 347 (module 289): available(initial) -> allocated(gate `allocate_space`) -> released(terminal, gate `release_space`).
- facility_work_orders 349 (module 290): created(initial) -> assigned -> dispatched(gate `dispatch_work_order`) -> in_progress -> completed(gate `complete_work_order`) -> closed(terminal).
- utility_meter_readings 350 (module 290): recorded(initial) -> validated -> published(terminal, gate `publish_meter_reading`).
- capital_projects 351 (module 291): planning(initial) -> approved(gate `approve_capital_project`) -> in_progress -> completed(terminal, gate `complete_capital_project`) / cancelled(terminal).

Each machine has exactly one initial, >=1 terminal, monotonic unique state_order (M4 shape pass). `description` populated factually (not a `notes` column).

### B1A-HANDOFF-FK (B10b) - DONE (8 patched; 870 skipped)

All prior values were NULL on the patched side (snapshot from pre-run query). PATCH `source_domain_module_id`: 291->290, 293->290, 294->291, 295->289, 856->288, 857->288, 858->288. PATCH `target_domain_module_id`: 292->290. Handoff 870 (IWMS -> REAL-EST, payload `space_utilization_reports` 593) SKIPPED: needs a consumer-DMDO design decision on a REAL-EST module (B2-S5 / design), per the b1a finding. Remaining NULL `target_domain_module_id` on 293/294/295/856 are the target domains' (ESG/EAM/HCM/RE-CRE) B10b responsibility (report-only, B10b asymmetry), not REAL-EST's.

### B1A-SYS-SKILLS (F1/F2/F3/F7) - DONE

INSERT 4 module-level `skill_type='system'` skills (one per module, `domain_module_id` set; `domain_id=141` also set to satisfy the live `domain_required_when_skill_type_is_system` check constraint, which still requires `domain_id` on system skills):

| skill id | skill_name | module |
|---|---|---|
| 329 | real_est_portfolio_agent | 288 |
| 330 | real_est_space_ops_agent | 289 |
| 331 | real_est_facility_ops_agent | 290 |
| 332 | real_est_capital_projects_agent | 291 |

INSERT 13 `skill_tools` rows distributing the legacy 10 tools across the 4 module skills by mastered entity, with `send_email` (37) rebound to `notify_person` (913) per F7 / channel-vs-capability rule (all `required`):
- 329 portfolio: query_real_estate_properties(664), query_leases(665), query_floor_plans(666), sign_document(42), notify_person(913).
- 330 space-ops: query_spaces(667), query_occupancy_records(668), notify_person(913).
- 331 facility-ops: query_facility_work_orders(669), query_utility_meter_readings(670), notify_person(913).
- 332 capital-projects: query_capital_projects(671), notify_person(913).

DELETE legacy domain-level system skill 99 (`real-est-system`, `domain_id=141`, `domain_module_id=null`) and its 10 `skill_tools` rows (prior ids 781-790, linking tools 664-671 + send_email 37 + sign_document 42, all `required`). The shared catalog `tools` rows (including send_email 37, sign_document 42) were NOT deleted; only the skill_tools links and the skill row were removed.

### Verification (live re-query)

- `data_object_relationships` intra-domain: 8 rows (2056-2063).
- `data_object_lifecycle_states` on masters: 29 rows; each of the 7 machines has exactly one initial and >=1 terminal.
- `data_objects.entity_type`: 7 masters `operational_workflow`, occupancy_records (348) `unclassified`.
- `skills` for REAL-EST: 4 module system skills (329-332); legacy skill 99 gone.
- `skill_tools` on 329-332: 13 rows; notify_person present, send_email absent, F4 invariant holds.
- `handoffs` module FKs: 291/293/294/295/856/857/858 source set, 292 target set, 870 still NULL on target (intentional skip).

### Skipped / not executed

- Handoff 870 target module FK: user design decision (consumer DMDO on a REAL-EST module).
- All b1b items (B1B-S2 catalog UX, B1B-S5 aliases, B1B-S7 pattern flags, B1B-S8 business_function_domains, B1B-S9 H1 cleanup): each carries a `blocked_by: user_decision`; not executed (out of scope for this b1a run). No empty catalog UX field appeared in a b1a item, so revised Rule #20 backfill did not apply this run.

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
