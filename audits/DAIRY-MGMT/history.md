# DAIRY-MGMT audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 modules, 8 masters, 6 capabilities, 8 solutions, 0 lifecycle states, 0 aliases, 0 data_object_relationships (intra or cross-domain), 0 regulations linked, 8 outbound handoffs, 0 inbound handoffs, 1 legacy `skills` row (`skill_type='system'`, `domain_module_id=null`), 8 `skill_tools` rows (all `query` operation_kind).
- **Vendor-surface basis:** DairyComp 305 (Valley Ag Software), BoviSync, AfiMilk AfiFarm (Afimilk), Lely Horizon, DeLaval DelPro, CowManager, Allflex Livestock Intelligence (MSD), Dairy.com Platform. Catalog already enumerates 7 primary + 1 secondary. The flagship matrix is solid for purposes of the market audit.
- **Bucket 1 (in-scope, agent fixable):** 17 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.
- **Cross-domain handoff count (N):** 8 outbound, 0 inbound. APQC expectation: 4-6 new `agent_curated` tags surfaced in Bucket 1 H1; ~2 deferred to Discover. Currently 0 `handoff_processes` rows exist on any DAIRY-MGMT handoff (0 approved, 0 agent_curated).
- **Structural gate state:** **M1 hard fail** (zero `domain_modules`). Per the audit recipe, the M-band blocks every downstream concern; B/C/E/F findings below are surfaced for completeness, but every Bucket 1 fix is gated behind authoring the module set first.

### Pass 1 - Structural (per-domain completeness checklist)

#### S-band coverage sweep

**S1. FK-to-`domains` coverage for DAIRY-MGMT (id=156).**

| Table | FK column | DAIRY-MGMT rows | Expected non-zero? |
| --- | --- | --- | --- |
| `domain_data_objects` | `domain_id` | 9 (8 master + 1 consumer) | Yes (B1) - pass |
| `solution_domains` | `domain_id` | 8 (7 primary + 1 secondary) | Yes (A3) - pass |
| `business_function_domains` | `domain_id` | 3 (owner + contributor + consumer) | Yes (C1) - pass |
| `capability_domains` | `domain_id` | 6 | Yes (A2) - pass |
| `domain_regulations` | `domain_id` | 0 | Yes (most regulated markets) - **FAIL** |
| `domains.parent_domain_id` | n/a (this row) | n/a | Routinely zero - pass |
| `handoffs.source_domain_id` | `source_domain_id` | 8 | Yes (B9) - pass |
| `handoffs.target_domain_id` | `target_domain_id` | 0 | Usually yes - **anomaly** (no inbound) |
| `skills.domain_id` | `domain_id` | 1 (legacy, `domain_module_id=null`) | F2: exactly one per module - **FAIL** (no modules) |
| `domain_modules.domain_id` | `domain_id` | 0 | Yes (M1) - **HARD FAIL** |
| `domain_module_host_domains.domain_id` | `domain_id` | 0 | Routinely zero - pass |
| `domain_aliases.domain_id` | `domain_id` | 0 | Optional - pass |

**S2. Indirect-table per-module coverage.** N/A (no modules). The zero-module condition makes S2 vacuously empty; routes to M1.

**S3. Per-master indirect-table coverage.**

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| `dairy_cows` | 0 | 1 (`dairy_cow.lifecycle_changed`) | 0 |
| `lactation_records` | 0 | 1 (`lactation_record.opened`) | 0 |
| `milkings` | 0 | 1 (`milking.completed`) | 0 |
| `milk_quality_tests` | 0 | 1 (`milk_quality_test.failed`) | 0 |
| `breeding_events` | 0 | 1 (`breeding_event.recorded`) | 0 |
| `cow_health_events` | 0 | 1 (`cow_health_event.treatment_administered`) | 0 |
| `feed_rations` | 0 | 1 (`feed_ration.changed`) | 0 |
| `bulk_milk_shipments` | 0 | 1 (`bulk_milk_shipment.dispatched`) | 0 |

Every master is at zero states + zero aliases. Routes to B12 (lifecycle), B11 (aliases). Trigger events are reasonably populated (8 events for 8 masters, but `event_category` is empty on 5 of 8 - see B9 finding).

#### A-band - Market shape

- **A1.** `domains` row has all 7 business-metadata fields populated. `crud_percentage=70`, `business_logic` non-empty, `min_org_size='20 s <500'`, `cost_band='$$'`, `usa_market_size_usd_m=950`, `market_size_source_year=2024`. PASS.
- **A2.** 6 capabilities linked. PASS (>=3 floor).
- **A3.** 8 solutions linked, 7 `primary` + 1 `secondary`. All `coverage_level` non-null. PASS.
- **A4.** `catalog_tagline` and `catalog_description` are both empty. **FAIL** - Bucket 2 (Rule #20 requires user-approved buyer-voice wording before write).
- **A5.** Skip per default (not requested).

#### M-band - Modules (Rule #14) - STRUCTURAL GATE

- **M1.** Zero `domain_modules` rows for `domain_id=156`. **HARD FAIL.** This is the dominant structural gate. With 6 capabilities, M2 requires >=2 modules. The 8 masters cluster cleanly into module candidates (see Bucket 1 / Bucket 2 below).
- **M2.** Vacuous (no modules). Would require >=2 once modules are loaded.
- **M4-M7.** All vacuous until M1 is cured.

#### B-band - Data-object footprint

- **B1.** 8 master rows. PASS.
- **B2.** Every master has `singular_label` and `plural_label`. PASS.
- **B3.** `milkings` has `is_canonical_bare_word=true` but `naming_authority_rationale` was not pulled (column not in default select). One bare-word master worth re-checking; surfaced to Bucket 2. `suppliers` (consumer row, id=206) is also a bare-word - its canonical-authority rationale lives in its owning domain (MDM or SUP-LIFE - see M7 finding below), not DAIRY-MGMT.
- **B4.** All 8 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. The flags are false-by-default; the audit positively confirms: dairy cows, lactations, milkings, milk quality tests, breeding events, cow health events, feed rations, bulk milk shipments. Most are operational records without personal content. `cow_health_events` includes drug-withdrawal-period data that could plausibly be regulated; surfaced to Bucket 2.
- **B5.** No `embedded_master` rows for this domain. PASS (vacuously).
- **B6.** Zero intra-domain `data_object_relationships`. **FAIL.** Workflow ties are absent: `dairy_cows -> lactation_records`, `lactation_records -> milkings`, `milkings -> bulk_milk_shipments`, `dairy_cows -> breeding_events`, `dairy_cows -> cow_health_events`, `feed_rations -> dairy_cows` (or via cow groups), `milkings -> milk_quality_tests`. All eight masters are catalog-isolated. Bucket 1.
- **B7.** Zero `users` edges (no relationships at all). **FAIL.** Expected user-actor edges: `dairy_cows.assigned_herdsman`, `milkings.recorded_by`, `milk_quality_tests.sampled_by`, `breeding_events.technician`, `cow_health_events.veterinarian` (with veterinarian role), `feed_rations.formulated_by`, `bulk_milk_shipments.dispatched_by`. Bucket 1.
- **B8.** Zero outbound cross-domain `data_object_relationships`. **FAIL.** Eight cross-domain handoffs are loaded (see B9) but no payload->target relationship rows mirror them. Bucket 1.
- **B9.** 8 outbound `trigger_events` + 8 `handoffs` rows. Every master has at least one event. Of the 8 events, 5 carry `event_category=''` (empty string). The valid enum values are `lifecycle`, `state_change`, `threshold`, `signal`. Bucket 1 (PATCH the missing `event_category` values).

  Outbound table:

  | event_name | data_object | target | pattern | friction | source_module_FK | target_module_FK |
  | --- | --- | --- | --- | --- | --- | --- |
  | `milk_quality_test.failed` | `milk_quality_tests` | FSQM | event_stream | high | NULL | NULL |
  | `cow_health_event.treatment_administered` | `cow_health_events` | FSQM | batch_sync | medium | NULL | NULL |
  | `bulk_milk_shipment.dispatched` | `bulk_milk_shipments` | FOOD-TRACE | api_call | high | NULL | NULL |
  | `milking.completed` | `milkings` | FOOD-TRACE | event_stream | low | NULL | NULL |
  | `lactation_record.opened` | `lactation_records` | FIN | batch_sync | low | NULL | NULL |
  | `breeding_event.recorded` | `breeding_events` | GRC | batch_sync | low | NULL | NULL |
  | `feed_ration.changed` | `feed_rations` | FIN | api_call | low | NULL | NULL |
  | `feed_ration.changed` | `feed_rations` | FOOD-TRACE | event_stream | low | NULL | NULL |

  Missing event: `dairy_cow.lifecycle_changed` (id=1099) has NO `handoffs` row. FIN fixed-asset valuation depends on cow lifecycle transitions per the event's own description. Bucket 1.

- **B9b.** Skipped (no modules; <2 module floor). When modules are authored, intra-domain cross-module handoffs need to be drafted.
- **B10.** Inbound report-only. The catalog suggests at minimum one inbound dependency: DAIRY-MGMT consumes `suppliers` (id=206; `role=consumer`, `necessity=required`). Canonical `suppliers` master is split across SUP-LIFE (id=28) and MDM (id=87) - a separate M7 catalog-wide finding owned by neither DAIRY-MGMT's audit. Inbound handoffs from SUP-LIFE on supplier lifecycle changes would land naturally on DAIRY-MGMT's feed/genetics supplier records once a target module exists. Report-only.
- **B10b.** Every handoff in B9 has `source_domain_module_id=NULL` AND `target_domain_module_id=NULL`. Source side is owed by THIS domain once M1 is cured; target side is owed by FOOD-TRACE / FSQM / FIN / GRC (all also unmodularized today per spot-check). Bucket 1 (source side); Report-only (target side per each partner's B10b).
- **B11.** Zero aliases. Several masters likely need cross-vendor synonyms (`dairy_cows` <-> "cow", "animal"; `milkings` <-> "parlor session", "milk event"; `milk_quality_tests` <-> "DHIA test", "lab result"; `lactation_records` <-> "lactation cycle"; `bulk_milk_shipments` <-> "milk pickup", "tanker load"). Bucket 1.
- **B12.** Zero `data_object_lifecycle_states` across all 8 masters. **FAIL.** Most have observable state machines: `dairy_cows` (heifer / pregnant / lactating / dry / culled), `lactation_records` (open / peak / declining / closed), `milkings` (in-progress / completed / reconciled), `milk_quality_tests` (sampled / submitted / pass / fail / appealed), `breeding_events` (inseminated / confirmed / failed), `cow_health_events` (treatment-administered / withdrawal-active / cleared), `bulk_milk_shipments` (scheduled / loaded / dispatched / accepted / rejected). `feed_rations` is config-shaped (formulated / active / superseded) and may qualify for the config-shape exemption (surface to user under Rule #12 / Rule #15). Bucket 1.

#### C-band - Functional ownership

- **C1.** 3 `business_function_domains` rows: owner=`Business Operations` (id=34), contributor=`Supply Chain` (id=30), consumer=`Finance` (id=4). PASS.
- **C2.** Zero `business_function_capabilities` overrides. Most capabilities are owned by Business Operations (consistent with C1). One plausible override: `DAIRY-MGMT-MILK-QUALITY` is closer to a Quality / Compliance function than pure Operations. Surfaced to Bucket 2.

#### D-band - UI spot-check

- **D1.** Not run as part of this audit pass. Standard URL pattern: `https://tests.semantius.app/domain_map/<table>`.

#### E-band - Roles and permission bundling

- **E1-E6.** All vacuous until M1 is cured. Single-module domains pass E1 vacuously; >=2-module domains need >=3 roles. DAIRY-MGMT's typical personas: Dairy Herdsman, Dairy Operations Manager, Milk-Quality Lab Tech, Reproduction Specialist, Veterinarian (cross-domain role), Feed Nutritionist. To be authored after modules.

#### F-band - Skill-layer integrity

- **F1.** 1 legacy `skills` row (`dairy-mgmt-system`, id=43) with `domain_module_id=null`. Acceptable transitional state ONLY because no module-level skill exists yet. Once modules are authored, this legacy row must be retired (DELETE) or split into module-level skills (one `<module_code_lower>_agent` per module). Bucket 1.
- **F2.** Zero module-level system skills (vacuous: no modules). **FAIL** (gated by M1).
- **F3.** Legacy skill `dairy-mgmt-system` has 8 `skill_tools` rows (all `query` ops on the 8 masters). Once modules are split, these tools must be redistributed across per-module skills. The tool set itself is thin: zero `mutate`, zero workflow gates, zero `side_effect` / `fetch` / `compute` / `inbound`. Bucket 1.
- **F4.** All 8 linked tools are `operation_kind='query'` with `data_object_id` set. PASS on the invariant.
- **F5.** Semantius score uncomputable (no modules). Routes to F2 + F3.
- **F7.** No channel-primitive (send_email / send_sms / post_chat_message) tools linked. PASS by vacuity.

#### H-band - APQC coverage

- **H1.** Zero `handoff_processes` rows on any DAIRY-MGMT handoff. **FAIL.** Eight cross-domain handoffs need APQC PCF activity classification. Bucket 1 (see APQC TAGGING table below).

  Catalog-quality headline: 0 of 8 handoffs carry an `approved` tag (0% coverage). Process-health side-bar: 0 `agent_curated` rows exist; this audit proposes 6 new ones below.

### Pass 2 - Market audit (semantic)

Vendor surface enumerated from flagship-vendor knowledge plus the 8 already-loaded solutions. DAIRY-MGMT is a stable, well-defined market: herd-record + parlor-integration + reproduction + milk-quality. Vendors strongly cluster around three buying axes: (1) herd-record systems (DairyComp 305, BoviSync, Lely Horizon), (2) parlor / robotic milking system integration (DeLaval DelPro, Lely, AfiMilk), (3) sensor-driven herd health (CowManager, Allflex / MSD, Afimilk Tags). Compliance specialists (FDA Grade A Pasteurized Milk Ordinance compliance, FARM Program, dairy cooperative quality programs) are typically embedded in the herd-record systems, not separate vendors.

**MISSING entities** (in market surface, not in catalog footprint):

| entity | category | flagship evidence | proposed cluster | compliance basis |
| --- | --- | --- | --- | --- |
| `cow_groups` | master | DairyComp pens/groups, AfiFarm groups, Lely Horizon groups | DAIRY-MGMT-COW-LIFECYCLE | - |
| `parlor_sessions` | master | DeLaval parlor reports, Lely robot-session logs, AfiMilk session data | DAIRY-MGMT-PARLOR | - |
| `dry_off_events` | master | DairyComp dry-off list, BoviSync dry-off workflow | DAIRY-MGMT-COW-LIFECYCLE | - |
| `culling_decisions` | master | DairyComp cull list, BoviSync removal records | DAIRY-MGMT-COW-LIFECYCLE | - |
| `bulk_tanks` | master | DeLaval bulk tank monitoring, AfiMilk bulk-tank module | DAIRY-MGMT-PARLOR | FDA PMO Grade A (bulk-tank temp logs) |
| `somatic_cell_counts` | junction/master | DHIA test ingest in DairyComp, Allflex SCC sensors | DAIRY-MGMT-MILK-QUALITY | DHIA / Grade A |
| `withdrawal_period_holds` | junction | DairyComp withdrawal flag, Allflex treatment-to-tank gate | DAIRY-MGMT-MILK-QUALITY | FDA AMDUCA / Grade A |
| `heat_detections` | junction | CowManager heat alerts, Allflex SenseTime heats, Afimilk Pedometer | DAIRY-MGMT-REPRODUCTION | - |
| `pregnancy_checks` | junction | DairyComp preg-check workflow, BoviSync repro events | DAIRY-MGMT-REPRODUCTION | - |
| `calvings` | junction | DairyComp calving events, BoviSync dystocia logs | DAIRY-MGMT-COW-LIFECYCLE | - |
| `feed_ingredients` | master | DairyComp / AMTS feed-ingredient library, Lely feed-kitchen | DAIRY-MGMT-FEED-RATIONING | - |
| `tmr_batches` | junction | DairyComp / Feed Watch TMR-mix records | DAIRY-MGMT-FEED-RATIONING | - |
| `milk_meter_readings` | junction | DeLaval / Lely / Afimilk per-quarter milk-meter data | DAIRY-MGMT-PARLOR | - |
| `cow_locations` | junction | RFID-tag / position-sensor pen movements | DAIRY-MGMT-COW-LIFECYCLE | - |

**WRONG-OWNERSHIP** - none identified (zero modules means nothing is wrongly assigned yet; categorize at module authoring time).

**SCOPE-CREEP** - none identified in the masters. `suppliers` (consumer) is correctly DAIRY-MGMT-consumed from SUP-LIFE/MDM.

**MODULARIZATION-ISSUE** - zero modules. The 6 capabilities already map to 6 natural modules. The recommendation is a 4-5 module split (consolidating COW-LIFECYCLE + HERD-HEALTH; keeping PARLOR + MILK-QUALITY + REPRODUCTION + FEED-RATIONING as four):

| module candidate | masters | covered capabilities |
| --- | --- | --- |
| DAIRY-MGMT-HERD | dairy_cows, lactation_records, breeding_events, cow_health_events, cow_groups, dry_off_events, culling_decisions, calvings, heat_detections, pregnancy_checks, cow_locations | DAIRY-MGMT-COW-LIFECYCLE, DAIRY-MGMT-REPRODUCTION, DAIRY-MGMT-HERD-HEALTH |
| DAIRY-MGMT-PARLOR | milkings, parlor_sessions, milk_meter_readings, bulk_tanks, bulk_milk_shipments | DAIRY-MGMT-PARLOR-INTEGRATION |
| DAIRY-MGMT-MILK-QUALITY | milk_quality_tests, somatic_cell_counts, withdrawal_period_holds | DAIRY-MGMT-MILK-QUALITY |
| DAIRY-MGMT-FEED | feed_rations, feed_ingredients, tmr_batches | DAIRY-MGMT-FEED-RATIONING |

This is a Bucket 2 architectural decision; surfaced for user judgment.

### Pass 3 - Neighbor discovery

Edge weights derived from outbound `handoffs` (B9 table) and `suppliers` consumer dependency:

| neighbor | edge weight | outbound events | inbound | dependencies | notes |
| --- | --- | --- | --- | --- | --- |
| FOOD-TRACE | 3 | `milking.completed`, `bulk_milk_shipment.dispatched`, `feed_ration.changed` | 0 | - | traceability layer for milk + ingredients |
| FSQM | 2 | `milk_quality_test.failed`, `cow_health_event.treatment_administered` | 0 | - | food-safety incidents from quality + withdrawal |
| FIN | 2 | `lactation_record.opened`, `feed_ration.changed` | 0 | - | herd KPIs and feed-cost-per-litre |
| GRC | 1 | `breeding_event.recorded` | 0 | - | traceability obligation |
| SUP-LIFE | 1 | - | (implied) | `suppliers` consumer | feed / semen / vet-drug suppliers |
| MDM | 0 | - | - | `suppliers` co-master (catalog-wide M7) | report-only |

Edge weights >=3 trigger the full 5-section diff (FOOD-TRACE only); FSQM (2) and FIN (2) get the one-line summary per recipe.

### Pass 4 - Pairwise reconciliation per neighbor

#### FOOD-TRACE (edge weight 3) - full 5-section diff

1. **Existing handoffs, fully wired:** 0. Three handoffs exist (ids 353, 955, 959), but all have `source_domain_module_id=NULL` AND `target_domain_module_id=NULL` (neither side modularized).
2. **Existing handoffs with NULL module FK:** 3 (ids 353, 955, 959). Source-side fix is owed by DAIRY-MGMT once M1 is cured (B10b). Target-side fix is owed by FOOD-TRACE's own B10b.
3. **Missing handoffs the catalog implies should exist:** `dairy_cow.lifecycle_changed` (id=1099) has no FOOD-TRACE subscription, but cow-lifecycle transitions are not naturally a FOOD-TRACE concern (more FIN fixed-asset). No FOOD-TRACE miss.
4. **Boundary integrity gaps (B5):** none on DAIRY-MGMT side (no embedded_master rows here).
5. **Cross-domain `data_object_relationships` mirror check:** none of the three handoffs has a corresponding `data_object_relationships` row. Expected mirrors:
   - `milkings rolls_into bulk_milk_shipments` (intra-domain - covered by B6 fix above), then `bulk_milk_shipments creates_lot_in food_trace_lots` (cross-domain - owed by DAIRY-MGMT B8).
   - `feed_rations links_to ingredient_lots` (cross-domain - owed by DAIRY-MGMT B8 once FOOD-TRACE's `ingredient_lots` master exists).

Boundary findings -> Bucket 1 under "boundary findings per neighbor" (in the source-side B10b fix once modules exist) + B8 mirror writes.

#### FSQM (edge weight 2) - one-line summary

Two outbound handoffs, both with NULL module FKs. No B8 mirror rows. FSQM is FOOD-SAFETY-AND-QUALITY-MGMT (id=157); `incidents` and `food_safety_incidents` masters expected on FSQM side as handoff payloads (verify on FSQM's own audit). Source-side fix owed by DAIRY-MGMT (Bucket 1 B10b once modules exist).

#### FIN (edge weight 2) - one-line summary

Two outbound handoffs (`lactation_record.opened`, `feed_ration.changed`), both with NULL module FKs. FIN is the consumer of herd-economic signals (fixed-asset valuation on dairy cows, feed-cost-per-litre rollups). Expected FIN-side payload masters: `fixed_assets` (for dairy_cows as productive assets), `cost_centers` or similar. Bucket 1 source-side B10b.

#### GRC (edge weight 1) - lighter neighbor

One outbound (`breeding_event.recorded`). GRC traceability obligation per the event's description. Source-side B10b.

#### SUP-LIFE / MDM (edge weight 1 each, dependency-only) - report-only

`suppliers` (id=206) has TWO `role='master'` rows: SUP-LIFE (id=28) and MDM (id=87). This is a **catalog-wide M7 hard fail** that is **not owned by DAIRY-MGMT's audit**; report-only follow-up for SUP-LIFE and MDM to reconcile canonical authority.

### Bucket 1 - In-scope confirmed gaps

**Bucket 1 sub-categorization** (17 line items by finding type):

| finding type | count |
| --- | --- |
| MISSING (entity gap, in scope at module-authoring time) | 0 (deferred to Bucket 3 per audit recipe) |
| STRUCTURAL | 10 |
| BOUNDARY | 6 |
| APQC TAGGING | 1 (covers 6 proposed rows + 2 deferred) |

#### STRUCTURAL findings

| # | id | finding | proposed fix |
| --- | --- | --- | --- |
| B1-S1 | M1 | Zero `domain_modules` rows | Author the 4-module set (DAIRY-MGMT-HERD, DAIRY-MGMT-PARLOR, DAIRY-MGMT-MILK-QUALITY, DAIRY-MGMT-FEED) per Pass-2 modularization. Bucket 2 confirms shape first. |
| B1-S2 | A4 | `catalog_tagline` and `catalog_description` empty | Draft both in buyer voice per Rule #20; surface to user for approval (Bucket 2). |
| B1-S3 | B6 | Zero intra-domain `data_object_relationships` | Draft ~8 edges: dairy_cows<->lactation_records, lactation_records->milkings, milkings->bulk_milk_shipments, milkings->milk_quality_tests, dairy_cows->breeding_events, dairy_cows->cow_health_events, feed_rations->dairy_cows (via group), breeding_events->lactation_records. Load via cluster-drafts pattern. |
| B1-S4 | B7 | Zero `users` edges | Draft ~7 edges: dairy_cows.assigned_herdsman, milkings.recorded_by, milk_quality_tests.sampled_by, breeding_events.technician, cow_health_events.veterinarian, feed_rations.formulated_by, bulk_milk_shipments.dispatched_by. |
| B1-S5 | B9 (events with empty category) | 5 of 8 `trigger_events` have `event_category=''` (empty string, not a valid enum) | PATCH event_category: dairy_cow.lifecycle_changed -> `lifecycle`; lactation_record.opened -> `lifecycle`; milking.completed -> `lifecycle`; breeding_event.recorded -> `lifecycle`; feed_ration.changed -> `lifecycle` (or `state_change` per author). |
| B1-S6 | B9 (missing handoff) | `dairy_cow.lifecycle_changed` (id=1099) has zero `handoffs` rows | Add handoff dairy_cow.lifecycle_changed -> FIN (fixed-asset valuation on culling / new-lactating). |
| B1-S7 | B11 | Zero aliases on any master | Draft ~10-15 alias rows: dairy_cows<->cow / animal / head; milkings<->parlor session / milk event; lactation_records<->lactation cycle / DIM record; milk_quality_tests<->DHIA test / lab result; bulk_milk_shipments<->milk pickup / tanker load; breeding_events<->insemination / service. |
| B1-S8 | B12 | Zero `data_object_lifecycle_states` across all 8 masters | Author state machines per masters list above. Feed_rations may qualify for config-shape exemption (Bucket 2 confirms). |
| B1-S9 | F1 | Legacy `dairy-mgmt-system` skill (id=43, `domain_module_id=null`) | Retire (DELETE) once module-level skills are authored under Phase S. |
| B1-S10 | F3 (sub) | Tool set is `query`-only; no mutate / workflow-gate / fetch tools | Phase-S authoring extends per-module tools: mutate_dairy_cow_cull, mutate_lactation_record_close, mutate_milking_complete, side_effect_dispatch_bulk_milk_shipment, fetch_dhia_test_result, etc. |

#### BOUNDARY findings (per neighbor)

| # | id | finding | proposed fix |
| --- | --- | --- | --- |
| B1-B1 | B10b (outbound) | All 8 outbound handoffs have `source_domain_module_id=NULL` | Backfill once DAIRY-MGMT modules exist: route each event to its master's module (parlor events -> DAIRY-MGMT-PARLOR; milk-quality events -> DAIRY-MGMT-MILK-QUALITY; cow / lactation / breeding / cow-health events -> DAIRY-MGMT-HERD; feed-ration events -> DAIRY-MGMT-FEED). |
| B1-B2 | B8 (FOOD-TRACE mirror) | No outbound `data_object_relationships` for `milkings -> FOOD-TRACE`, `bulk_milk_shipments -> FOOD-TRACE`, `feed_rations -> FOOD-TRACE` payloads | Author cross-domain relationship rows once FOOD-TRACE's payload masters are identified. |
| B1-B3 | B8 (FSQM mirror) | No outbound `data_object_relationships` for `milk_quality_tests -> FSQM`, `cow_health_events -> FSQM` payloads | Same pattern as B1-B2. |
| B1-B4 | B8 (FIN mirror) | No outbound `data_object_relationships` for `lactation_records -> FIN`, `feed_rations -> FIN`, `dairy_cows -> FIN` payloads | FIN fixed-asset and herd-KPI mirrors. |
| B1-B5 | B8 (GRC mirror) | No outbound `data_object_relationships` for `breeding_events -> GRC` | Single edge for traceability obligation. |
| B1-B6 | B9 (cross-cutting feed-ration handoff) | `feed_ration.changed` (id=1103) fans out to FIN AND FOOD-TRACE (two handoff rows, ids 958+959) - structurally correct (one event, many subscribers) but worth a positive callout that the fan-out is intentional | No fix; positive structural finding. |

#### APQC TAGGING

| # | id | finding | proposed fix |
| --- | --- | --- | --- |
| B1-H1 | H1 | Zero `handoff_processes` rows across 8 outbound handoffs | Author 6 `agent_curated` rows + 2 deferred per table below. |

**B1-H1 proposed tags** (`proposal_source='agent_curated'`, `record_status='new'`):

| handoff_id | source -> target | trigger_event | payload | proposed PCF row | PCF id | external_id | confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 354 | DAIRY-MGMT -> FSQM | milk_quality_test.failed | milk_quality_tests | Perform quality testing | 170 | 10369 | confident L3 |
| 355 | DAIRY-MGMT -> FSQM | cow_health_event.treatment_administered | cow_health_events | Manage compliance | 70 | 17467 | confident L2 |
| 353 | DAIRY-MGMT -> FOOD-TRACE | bulk_milk_shipment.dispatched | bulk_milk_shipments | Maintain production records and manage lot traceability | 171 | 10370 | confident L3 |
| 955 | DAIRY-MGMT -> FOOD-TRACE | milking.completed | milkings | Maintain production records and manage lot traceability | 171 | 10370 | confident L3 |
| 957 | DAIRY-MGMT -> GRC | breeding_event.recorded | breeding_events | Manage traceability data | 556 | 11749 | confident L4 |
| 959 | DAIRY-MGMT -> FOOD-TRACE | feed_ration.changed | feed_rations | Manage traceability data | 556 | 11749 | confident L4 |

**Deferred to Discover Pass 3** (no clean cross-industry PCF match):

| handoff_id | source -> target | trigger_event | payload | deferral reason |
| --- | --- | --- | --- | --- |
| 956 | DAIRY-MGMT -> FIN | lactation_record.opened | lactation_records | "Manage fixed-asset master data files" (id=1388) is the closest PCF L4 but lactation-record opening is operational, not master-data maintenance. Industry-specific dairy KPI rollup; route to custom process. |
| 958 | DAIRY-MGMT -> FIN | feed_ration.changed | feed_rations | Same: feed-cost-per-litre is a dairy-specific KPI without a clean APQC L3/L4 match. Defer to custom process authoring. |

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module shape confirmation.** The Pass-2 4-module split (HERD + PARLOR + MILK-QUALITY + FEED) merges three capabilities (COW-LIFECYCLE, REPRODUCTION, HERD-HEALTH) into one HERD module. Alternative is 5 or 6 modules. Decision shape: name the module set before B1-S1 can proceed. Options: (a) 4-module split as proposed; (b) 5-module split keeping REPRODUCTION separate (rationale: heat detection / pregnancy check workflows are heavily sensor-driven and may want their own deployable); (c) 6-module split matching capabilities 1:1.
2. **`catalog_tagline` and `catalog_description` wording (A4 + Rule #20).** Per Rule #15 / Rule #20, the agent does NOT auto-draft these; the user authors or approves a buyer-voice tagline + 1-3 paragraph description. Agent can propose drafts but cannot write without approval.
3. **`milkings` canonical-bare-word rationale (B3).** `is_canonical_bare_word=true` is set but the `naming_authority_rationale` value was not pulled. If empty, the user authors the rationale or the loader claims canonical authority for DAIRY-MGMT. Independent.
4. **`cow_health_events` pattern flags (B4).** `cow_health_events` includes drug-withdrawal-period data. Veterinary-treatment records may be regulated under FDA AMDUCA / state veterinary practice acts. Decision: should `has_personal_content=true` be set? (Strictly, cows aren't persons but the data is veterinary-PII-adjacent.) Likely false; surfaced for explicit confirmation.
5. **`feed_rations` lifecycle-states config-shape exemption (B12 + Rule #12).** Feed rations may be author-once-and-supersede records with no state machine. Decision: load lifecycle states OR record the config-shape exemption (Rule #15 forbids auto-populating `notes`; the user authors any wording).
6. **`DAIRY-MGMT-MILK-QUALITY` business-function override (C2).** Plausible override: Quality / Compliance owns milk-quality capability instead of Business Operations. Decision: load override `business_function_capabilities` row, or accept Operations as canonical.
7. **Regulations - zero `domain_regulations` rows (S1).** FDA Grade A Pasteurized Milk Ordinance, the FARM Animal Care program, the DHIA testing standards, and state Department of Agriculture dairy inspection rules are all in-scope for typical buyers. None of these are in `regulations` catalog today (recent regulations are FDA 21 CFR Part 11, FDA 510(k), FDA QSR - all medical-device, not dairy). Decision shape: (a) load new `regulations` rows + `domain_regulations` links (typical Phase A workflow); (b) defer until regulations are needed for a specific Bucket 2 / Bucket 3 capability. Independent.

### Bucket 3 - Phase 0 pending (speculative)

Vendor-knowledge-based candidates from Pass 2 MISSING entities, not yet anchored to a formal Phase 0 vendor surface document. Each candidate names the flagship source.

1. **`cow_groups` / pens** (DairyComp pens, AfiFarm groups, Lely Horizon groups). Vendor-near-universal. Phase 0 verification: confirm cow-group is a first-class entity vs. an attribute on `dairy_cows`. Recommended cluster: DAIRY-MGMT-HERD.
2. **`heat_detections` + `pregnancy_checks`** (CowManager, Allflex SenseTime, Afimilk Pedometer, DairyComp PreCheck). Bucket 3: sensor-driven reproduction signals could be their own master or junction rows on `breeding_events`. Vendor surface treats both as separate entities. Recommended cluster: DAIRY-MGMT-HERD (or DAIRY-MGMT-REPRODUCTION if 5-module split).
3. **`bulk_tanks` + `milk_meter_readings`** (DeLaval / Lely / AfiMilk parlor telemetry). Bucket 3: parlor-physical-asset entities; bulk_tanks is FDA Grade A regulated (temperature logs). Recommended cluster: DAIRY-MGMT-PARLOR.
4. **`feed_ingredients` + `tmr_batches`** (DairyComp / AMTS / FeedWatch feed-kitchen module). Bucket 3: feed ingredient library underpins ration formulation. Recommended cluster: DAIRY-MGMT-FEED.
5. **`somatic_cell_counts` + `withdrawal_period_holds`** (DairyComp + Allflex + DHIA labs). Bucket 3: SCC is the dominant milk-quality KPI; withdrawal holds gate milk shipment. Recommended cluster: DAIRY-MGMT-MILK-QUALITY.
6. **`dry_off_events` + `calvings` + `culling_decisions`** (DairyComp / BoviSync transitional events). Bucket 3: cow-lifecycle transitions; could be junction rows on `dairy_cows` or first-class events. Recommended cluster: DAIRY-MGMT-HERD.

### Cross-bucket dependencies

- Bucket 2 item 1 (module shape) gates every Bucket 1 STRUCTURAL fix that references modules (B1-S1, B1-S5 source-module backfill, B1-B1, F2, F3, E-band). User resolves Bucket 2.1 first; Bucket 1 fixes follow.
- Bucket 3 items 1-6 (MISSING entities) inform Bucket 2 item 1 (module shape) IF the user adopts a 5-or-6-module split that needs the new masters to make the per-module data-object counts non-trivial. Recommendation: resolve Bucket 2.1 first with the existing 8 masters; let Bucket 3 vetting drive subsequent loads.
- Bucket 2 item 7 (regulations) is informed by Bucket 3 items 3 + 5 (bulk_tanks and SCC entities are the direct subjects of FDA Grade A PMO).
- Bucket 2 item 5 (feed_rations lifecycle config-shape) is independent.
- Bucket 2 item 6 (capability business-function override) is independent.

### Per-bucket prompts

**Bucket 1:** "Fix these 17 items? Bucket 1 is gated on Bucket 2 item 1 (module shape). Reply 'after Bucket 2.1', 'approve all the non-gated items now' (B1-S2 / A4 wording will still need your approval per Rule #20, B1-S7 aliases + B1-H1 APQC tagging are non-gated), or 'just B1-S5 + B1-S6' (trigger-event PATCHes)."

**Bucket 2:** "Decisions needed on 7 items. Item 1 (module shape) is the structural gate; please answer first. Items 2 (catalog_tagline / description wording per Rule #20), 3 (milkings canonical rationale), 4 (cow_health pattern flags), 5 (feed_rations lifecycle exemption), 6 (milk-quality business-function override), 7 (load FDA Grade A PMO / FARM / DHIA regulations) can be resolved in any order. Reply per item."

**Bucket 3:** "Vet via Phase 0 research, or eyeball-mode? If eyeball, name which of the 6 candidates ring true (cow_groups, heat_detections, bulk_tanks, feed_ingredients, somatic_cell_counts, dry_off events) and they'll move to Bucket 1 in the next pass."

### Report-only follow-ups (owed by other domains)

- **FOOD-TRACE B10b owes target-side module FK** on handoffs 353, 955, 959 (`bulk_milk_shipment.dispatched`, `milking.completed`, `feed_ration.changed`). FOOD-TRACE has zero modules per spot-check; the fix lands when FOOD-TRACE is modularized.
- **FSQM B10b owes target-side module FK** on handoffs 354, 355 (`milk_quality_test.failed`, `cow_health_event.treatment_administered`). FSQM has zero modules per spot-check.
- **FIN B10b owes target-side module FK** on handoffs 956, 958 (`lactation_record.opened`, `feed_ration.changed`).
- **GRC B10b owes target-side module FK** on handoff 957 (`breeding_event.recorded`).
- **FOOD-TRACE B8** owes inbound `data_object_relationships` rows mirroring the three DAIRY-MGMT outbound handoffs (`milkings -> food_trace_lots`, `bulk_milk_shipments -> food_trace_lots`, `feed_rations -> ingredient_lots` once that master exists).
- **FSQM B8** owes inbound `data_object_relationships` rows mirroring `milk_quality_test.failed -> food_safety_incidents` and `cow_health_event.treatment_administered -> withdrawal_holds` (or analogous FSQM payload).
- **FIN B8** owes inbound mirrors for fixed-asset and herd-KPI handoffs.
- **GRC B8** owes inbound mirror for `breeding_event.recorded` traceability.
- **Catalog-wide M7 hard fail (suppliers, id=206):** `suppliers` has `role='master'` in BOTH SUP-LIFE (id=28) AND MDM (id=87). One owner must demote to `embedded_master` (preserving standalone-deploy story) or `consumer`. Decision is which domain canonically masters suppliers; both partners would consume DAIRY-MGMT's `suppliers` linkage. Owed by SUP-LIFE / MDM audit.
- **Partner-domain module sparsity (informational):** spot-checks of FOOD-TRACE, FSQM, FIN, GRC returned zero `domain_modules` for each. M-band hard fail on all four partners; auditing them would be a high-leverage follow-up given DAIRY-MGMT depends on all four for outbound handoff target-module FKs.

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-technical subset of Bucket 1 via loader `c:/dev/domain-map/.tmp_deploy/fix_dairy_mgmt_b1_technical_2026_05_31.ts`. No new entities, no judgment calls, no notes writes. Idempotent.

### Applied (18 writes total)

- **B1-S5 (PATCH event_category, 5 rows).** trigger_events ids 1099, 1100, 1101, 1102, 1103 each backfilled from `""` to `"lifecycle"`. The fifth (`feed_ration.changed`) could plausibly be `state_change` per the audit's parenthetical; pick the conservative `lifecycle` and surface the alternative for user revision if needed.
- **B1-S4 (INSERT 7 user-edges, Rule #10).** All seven masters now carry a many_to_many `reference` edge to `users` (id=748). New `data_object_relationships` ids 1775-1781. `record_status` defaults to `new`; `notes` left empty per Rule #15.
- **B1-H1 (INSERT 6 handoff_processes, agent_curated).** Pre-flight verified each `(handoff_id, process_id)` pair: source_domain_id = 156, process external_id matches audit cell. New `handoff_processes` ids 573-578. `record_status` defaults to `new`; `proposal_source = 'agent_curated'`. The two deferred rows (handoff_id 956 and 958, lactation_record.opened + feed_ration.changed -> FIN) were NOT inserted per the audit's deferral.

### Deferred (still owed)

- **B1-S1, S6, S8, S9, S10, B1.** All gated on M1 module authoring (Bucket 2 item 1, user picks the 4 vs 5 vs 6 module shape).
- **B1-S2.** A4 catalog_tagline / catalog_description gated on Rule #20 user wording.
- **B1-S3.** B6 intra-domain `data_object_relationships`. Audit lists candidate edges informally but they are NOT user-edges, and the truly-technical scope is limited to Rule #10 built-ins per this continuation's instructions.
- **B1-S7.** B11 aliases. Audit gives suggestive synonym lists; no exact insertable tuples pre-specified.
- **B1-B2..B5.** B8 cross-domain relationship mirrors. Gated on each neighbor's payload masters being identified.
- **B1-H1 (2 of 8).** handoff_processes for handoff_id 956, 958 explicitly deferred to Discover Pass 3 by the audit.

### Live state after this continuation

- `event_category` on all 8 DAIRY-MGMT trigger_events is now a valid enum value (3 pre-existing + 5 backfilled today).
- `data_object_relationships` for the 8 DAIRY-MGMT masters: 7 user-edges (was 0). Intra-domain and cross-domain mirrors still at 0.
- `handoff_processes` coverage on the 8 outbound handoffs: 6 of 8 tagged (was 0 of 8 = 0%); now 6 of 8 = 75%, all `agent_curated`, `record_status='new'`.
- No `notes` columns were written.

### Updated bucket counts

- Bucket 1: was 17 items. 4 items fully cleared (B1-S5, S4, partial H1 = the 6 non-deferred rows), B1-H1's 2 deferred rows reclassified to Bucket 3 (Discover Pass 3). Remaining: ~12 items, all gated on Bucket 2 item 1 (module shape) or Rule #20 (catalog UX wording) or neighbor-side audits.
- Bucket 2 and Bucket 3 unchanged.

## 2026-05-31, Audit

### Summary

- **Current footprint:** 0 modules, 8 domain-owned masters + 1 consumer (`suppliers`), 6 capabilities, 8 solutions (7 primary + 1 secondary), 0 lifecycle states, 0 aliases, 0 intra-domain `data_object_relationships`, 7 of 8 master `users` edges, 0 cross-domain mirror relationships, 0 regulations, 8 outbound handoffs (0 inbound), 1 legacy `skills` row (`dairy-mgmt-system`, id=43, `domain_module_id=null`), 8 `skill_tools` rows (all `query`).
- **Structural gate state:** **M1 hard fail** (zero `domain_modules`). Same dominant gate as the 2026-05-30 audit. All downstream M / E / F band findings remain blocked behind module authoring.
- **Carried over from prior audit:** B1-S1 (M1), B1-S2 (A4 wording), B1-S3 (B6 intra-domain edges), B1-S6 (missing `dairy_cow.lifecycle_changed` handoff), B1-S7 (B11 aliases), B1-S8 (B12 lifecycle states), B1-S9 (F1 legacy skill retire), B1-S10 (F3 tool-set extension), B1-B1..B5 (B10b + B8 mirrors), B2 items 1-7, B3 items 1-6.
- **Newly surfaced this audit:** B1-S11 (`lactation_records` lacks `users` edge despite 2026-05-31 continuation backfilling 7 others), B1-H2 (zero `approved` APQC tags; catalog-quality headline is 0%).
- **Bucket 1 (in-scope, agent fixable, pending):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items (carry-over).
- **Bucket 3 (Phase 0 pending, speculative):** 8 items (6 carry-over MISSING entity candidates + 2 reclassified FIN APQC handoffs from prior continuation).

### Pass 1, Structural (per-domain completeness checklist)

#### A-band

- **A1.** All 7 business-meta fields populated. PASS.
- **A2.** 6 capabilities. PASS.
- **A3.** 8 solutions, all `coverage_level` set. PASS.
- **A4.** `catalog_tagline` and `catalog_description` empty. Bucket 2.2 carry-over (Rule #20 requires user wording).

#### M-band

- **M1.** Zero `domain_modules` for `domain_id=156`. **HARD FAIL**. Blocks E1-E6, F2, F5, M2-M7.

#### B-band

- **B1.** 8 master rows. PASS.
- **B2.** Singular / plural labels on all 8. PASS.
- **B3.** `milkings.is_canonical_bare_word=true`; `naming_authority_rationale` not pulled in this pass. Carry-over to Bucket 2.3.
- **B4.** Pattern flags all false. `cow_health_events` carry-over to Bucket 2.4.
- **B5.** No `embedded_master` rows. PASS (vacuous).
- **B6.** Zero intra-domain `data_object_relationships`. **FAIL**. Carry-over B1-S3.
- **B7.** 7 of 8 masters carry a `users` edge (rows 1775-1781 from 2026-05-31 continuation). `lactation_records` (id=500) does NOT have a `users` edge — gap in the prior backfill. **NEW** B1-S11.
- **B8.** Zero cross-domain mirror `data_object_relationships`. **FAIL**. Carry-over B1-B2..B5.
- **B9.** 8 trigger events; every `event_category` now a valid enum value (3 pre-existing + 5 backfilled to `lifecycle` on 2026-05-31). PASS on the enum invariant.
- **B9 (missing handoff).** `dairy_cow.lifecycle_changed` (id=1099) still has NO `handoffs` row. Carry-over B1-S6.
- **B9b.** Vacuous (no modules).
- **B10.** Inbound report-only; carry-over (catalog-wide `suppliers` M7 unresolved, not owned by this domain).
- **B10b.** All 8 outbound handoffs have `source_domain_module_id=NULL` AND `target_domain_module_id=NULL`. Source side carry-over B1-B1; target side owed by FOOD-TRACE / FSQM / FIN / GRC.
- **B11.** Zero aliases. Carry-over B1-S7.
- **B12.** Zero lifecycle states across all 8 masters. **FAIL**. Carry-over B1-S8.

#### C-band

- **C1.** 3 `business_function_domains` rows (owner=Business Operations, contributor=Supply Chain, consumer=Finance). PASS.

#### D-band

- Not run.

#### E-band

- **E1-E5.** All vacuous behind M1. **FAIL** (gated).

#### F-band

- **F1.** 1 legacy `dairy-mgmt-system` skill (id=43, `domain_module_id=null`). Acceptable transitional only because M1 still fails; once modules land it must retire. Carry-over B1-S9.
- **F2.** Zero module-level system skills. **FAIL** (gated).
- **F3.** 8 `query` tools on the legacy skill; no `mutate`, no workflow-gate, no `side_effect` / `fetch` / `compute` / `inbound`. Carry-over B1-S10.
- **F4.** All 8 tools `operation_kind='query'` with `data_object_id` set. PASS on the invariant.
- **F5.** Semantius score uncomputable. **FAIL** (gated on F2).

#### H-band

- **H1.** `handoff_processes` row count: 6 of 8 outbound handoffs tagged (75% coverage), all `agent_curated`, all `record_status='new'`. **Catalog-quality headline: 0 of 8 approved (0%)**. Process-health side-bar: 6 of 8 `agent_curated`. 2 handoffs (ids 956, 958) deferred to Discover Pass 3 per prior audit. **NEW** B1-H2: reviewer approval of the 6 `agent_curated` rows is the path from 0% to 75% quality coverage; tracked as a user-judgment item routed via Bucket 2.

### Bucket 1, In-scope confirmed gaps (pending)

Sub-categorization (13 line items):

| finding type | count |
| --- | --- |
| MISSING | 0 (deferred to Bucket 3) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL | 7 |
| BOUNDARY | 5 |
| APQC TAGGING | 1 (review-approval routing) |

Carry-over from 2026-05-30 (all still pending, all unchanged in scope):

| id | finding | blocked_by |
| --- | --- | --- |
| B1-S1 | M1 zero modules — author 4 or 5 or 6 module set per Bucket 2.1 | B2-1 module shape |
| B1-S2 | A4 catalog UX wording empty | Rule #20 user wording |
| B1-S3 | B6 zero intra-domain `data_object_relationships` | B2-1 module shape (target_module routing) |
| B1-S6 | `dairy_cow.lifecycle_changed` (id=1099) has no `handoffs` row to FIN | B2-1 module shape (source_module FK) |
| B1-S7 | B11 zero aliases | none (executable now once tuples drafted) |
| B1-S8 | B12 zero lifecycle states | B2-5 (`feed_rations` config-shape decision) |
| B1-S9 | F1 legacy `dairy-mgmt-system` skill retire | B1-S1 (need replacement skills first) |
| B1-S10 | F3 tool set is `query`-only; extend per module | B1-S1 |
| B1-B1 | B10b source_module_id NULL on all 8 outbound handoffs | B1-S1 |
| B1-B2 | B8 FOOD-TRACE outbound mirror rows | FOOD-TRACE payload masters not identified |
| B1-B3 | B8 FSQM outbound mirror rows | FSQM payload masters not identified |
| B1-B4 | B8 FIN outbound mirror rows | FIN payload masters not identified |
| B1-B5 | B8 GRC outbound mirror row | GRC payload masters not identified |

Newly surfaced this audit:

| id | finding | blocked_by |
| --- | --- | --- |
| B1-S11 | `lactation_records` (id=500) lacks a `users` many_to_many `reference` edge to `users` (id=748). 2026-05-31 continuation backfilled 7 of 8 masters; lactation_records was skipped. Likely no clean single user-actor verb (lactation cycle opens via system / cow state, not a discrete operator). Decision is whether to author a `lactation_recorded_by` edge (parallel to milkings) or accept the absence and document as system-opened. | none (executable; needs proposed verb) |
| B1-H2 | All 6 existing `handoff_processes` rows are `record_status='new'`; reviewer signoff is the only path to a non-zero catalog-quality headline | B2-8 reviewer approval (NEW Bucket 2 item) |

### Bucket 2, Surface-for-user (judgment, pending)

Carry-over (items 1-7 from 2026-05-30):

1. **Module shape.** 4 vs 5 vs 6 module split for HERD / PARLOR / MILK-QUALITY / FEED / REPRODUCTION / HERD-HEALTH. Gates B1-S1 and downstream STRUCTURAL fixes.
2. **A4 catalog UX wording.** `catalog_tagline` and `catalog_description` per Rule #20.
3. **`milkings` canonical-bare-word rationale.** `naming_authority_rationale` may be unset.
4. **`cow_health_events` pattern flags.** Confirm `has_personal_content=false` (vet-PII adjacency under FDA AMDUCA).
5. **`feed_rations` config-shape exemption.** Lifecycle states or exemption (no `notes` auto-write per Rule #15).
6. **`DAIRY-MGMT-MILK-QUALITY` business-function override.** Quality / Compliance vs Operations.
7. **Regulations load.** FDA Grade A PMO, FARM Animal Care, DHIA testing, state Dept of Agriculture dairy inspection rules; none in `regulations` catalog yet.

Newly surfaced:

8. **Approve the 6 `agent_curated` `handoff_processes` rows.** All six PCF mappings (354→Perform quality testing, 355→Manage compliance, 353+955→Maintain production records and manage lot traceability, 957+959→Manage traceability data) carry `record_status='new'`. Catalog-quality headline is the `approved` count, not the `agent_curated` count. Decision: approve all six, approve a subset, decline. Independent of other Bucket 2 items.

### Bucket 3, Phase 0 pending (speculative)

Carry-over MISSING-entity candidates (6 items from 2026-05-30): `cow_groups`, `heat_detections` / `pregnancy_checks`, `bulk_tanks` / `milk_meter_readings`, `feed_ingredients` / `tmr_batches`, `somatic_cell_counts` / `withdrawal_period_holds`, `dry_off_events` / `calvings` / `culling_decisions`. Vendor evidence: DairyComp 305, BoviSync, AfiMilk AfiFarm, Lely Horizon, DeLaval DelPro, CowManager, Allflex Livestock Intelligence (the 7 primary solutions).

Reclassified from B1-H1 (per 2026-05-31 continuation's defer):

7. **`lactation_record.opened` → FIN (handoff_id=956) APQC mapping.** No clean cross-industry PCF match; closest is "Manage fixed-asset master data files" (PCF id=1388) but operational not master-data. Custom-process authoring in Discover Pass 3.
8. **`feed_ration.changed` → FIN (handoff_id=958) APQC mapping.** Feed-cost-per-litre is a dairy-specific KPI. Custom-process authoring in Discover Pass 3.

### Cross-bucket dependencies

- B2-1 (module shape) gates B1-S1, B1-S3, B1-S6, B1-S9, B1-S10, B1-B1.
- B2-5 (`feed_rations` config-shape) gates B1-S8 only for that one master; the other 7 are unblocked.
- B2-8 (APQC approval) gates B1-H2.
- B1-B2..B5 (cross-domain mirrors) are blocked on each neighbor's modularization / payload-master identification; report-only on this domain's side until neighbors land.
- B3 items 1-6 (MISSING entities) inform B2-1 (module shape) only if user adopts a 5-or-6-module split.
- B2-7 (regulations) is informed by B3-3 + B3-5 (bulk_tanks and SCC entities directly subject to FDA Grade A PMO).

### Report-only follow-ups (owed by other domains)

- FOOD-TRACE B10b target-side module FK on handoffs 353, 955, 959; FOOD-TRACE B8 inbound mirrors.
- FSQM B10b target-side module FK on handoffs 354, 355; FSQM B8 inbound mirrors.
- FIN B10b target-side module FK on handoffs 956, 958; FIN B8 inbound mirrors.
- GRC B10b target-side module FK on handoff 957; GRC B8 inbound mirror.
- Catalog-wide M7 hard fail on `suppliers` (id=206): co-mastered in SUP-LIFE (id=28) AND MDM (id=87). Owed by SUP-LIFE / MDM audit.

### Decisions

(none recorded this audit; awaiting user.)

### Fixes applied

(none this audit; Validate b1 is a structural audit, not a fix pass.)

## 2026-06-02 Audit (modularization)

### Summary

DAIRY-MGMT was modularized for the first time, curing the dominant M1 hard fail that had blocked the E / F band and most of the B band across the two prior audits. Scope was deliberately narrow: `domain_modules` + `domain_module_capabilities` + `domain_module_data_objects` only. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. All existing roles and necessities were preserved.

Four `full` modules were authored, adopting the prior audits' Pass-2 4-module proposal (B2-1 option a: HERD + PARLOR + MILK-QUALITY + FEED), which merges the three animal-centric capabilities (COW-LIFECYCLE, REPRODUCTION, HERD-HEALTH) into a single HERD module. All four modules carry `industry_id=26` (industries row `Dairy`, NAICS 1121, child of Animal Production and Aquaculture), which is the single clear industry match for this industry-specific domain.

Loader: `c:/dev/domain-map/.tmp_deploy/modularize_dairy_mgmt_2026-06-02.ts`, idempotent (re-run inserts nothing), keyed on `domain_module_code` for modules, `(domain_module_id, capability_id)` for capability links, and `(domain_module_id, data_object_id)` for DMDO rows. Module ids re-read after insert (never hard-coded).

### Module split

| module (id) | capabilities | data_objects (role / necessity) |
| --- | --- | --- |
| DAIRY-MGMT-HERD (227) | DAIRY-MGMT-COW-LIFECYCLE (461), DAIRY-MGMT-REPRODUCTION (464), DAIRY-MGMT-HERD-HEALTH (466) | dairy_cows (499, master/required), lactation_records (500, master/required), breeding_events (503, master/required), cow_health_events (504, master/required), suppliers (206, consumer/required) |
| DAIRY-MGMT-PARLOR (228) | DAIRY-MGMT-PARLOR-INTEGRATION (462) | milkings (501, master/required), bulk_milk_shipments (506, master/required) |
| DAIRY-MGMT-MILK-QUALITY (229) | DAIRY-MGMT-MILK-QUALITY (463) | milk_quality_tests (502, master/required) |
| DAIRY-MGMT-FEED (230) | DAIRY-MGMT-FEED-RATIONING (465) | feed_rations (505, master/required) |

`suppliers` (206) is mastered elsewhere (SUP-LIFE id=28 / MDM id=87, the unresolved catalog-wide M7); it was kept at its existing `consumer` / `required` role and placed on HERD (vet-drug, semen, and feed-input supplier relationships are the dominant operational supplier ties). It is the only non-master assignment.

### Counts

- domain_modules: 0 -> 4 (all `module_kind=full`, all `industry_id=26`, all `record_status=new`).
- domain_module_capabilities: 0 -> 6 (all 6 capabilities placed exactly once; M4 satisfied).
- domain_module_data_objects: 0 -> 9 (8 domain-owned masters each in exactly one module as `master`; M7 satisfied; 1 consumer row for `suppliers`).
- Every module realizes >=1 capability (M6) and holds >=1 data_object (no empty module). Rule #14 satisfied (4 >= 2 full modules for a 6-capability domain).

### Structural-rule verification (live re-query)

- M4: all 6 capability_domains rows (461-466) appear in exactly one domain_module_capabilities row. PASS.
- M6: each of the 4 modules has >=1 capability link. PASS.
- M7 single-master: each of the 8 domain-owned masters (499, 500, 501, 502, 503, 504, 505, 506) is `role=master` in exactly one module. PASS.
- No empty module: each module has >=1 DMDO row. PASS.
- Preserved roles: all 8 masters kept master/required; suppliers kept consumer/required. No promotion. PASS.
- R1: every inserted row has `record_status=new` (omitted on insert). R15: all DMC and DMDO `notes` empty. R18: module names/descriptions describe capability shape, no vendor/product names. PASS.

### Deferred gaps (now owed, post-modularization)

- **A4 / M8 catalog UX backfill (now b1b -> still user-gated B2-2):** `catalog_tagline` and `catalog_description` left empty on all 4 modules per instructions (Rule #20 requires user-authored buyer-voice wording). Now owed at the per-module grain, not just the domain grain.
- **Per-module system skills (Rule #17 -> F2 / F3, new b1a):** 4 modules now exist with zero module-level `skills` rows. The legacy `dairy-mgmt-system` skill (id=43, `domain_module_id=null`) and its 8 `query`-only `skill_tools` must be retired and split into one `<module_code_lower>_agent` system skill per module (`dairy_mgmt_herd_agent`, `dairy_mgmt_parlor_agent`, `dairy_mgmt_milk_quality_agent`, `dairy_mgmt_feed_agent`). This is the new agent-solvable next action.
- **B10b source_domain_module_id backfill (now unblocked by module shape, b1a):** all 8 outbound handoffs (353, 354, 355, 955, 956, 957, 958, 959) still have `source_domain_module_id=NULL`. Routing is now determinable: parlor/milking events (955 milking.completed, 353 bulk_milk_shipment.dispatched) -> PARLOR (228); milk-quality event (354) -> MILK-QUALITY (229); feed-ration events (958, 959 feed_ration.changed) -> FEED (230); cow / lactation / breeding / cow-health events (956 lactation_record.opened, 957 breeding_event.recorded, 355 cow_health_event.treatment_administered, plus the still-missing dairy_cow.lifecycle_changed handoff) -> HERD (227). Out of scope this pass (handoff edits not part of modularization scope) but now technically executable.
- **Missing-master candidates (b3 carry-over):** the 6 Phase-0 vendor-research candidates (cow_groups, heat_detections/pregnancy_checks, bulk_tanks/milk_meter_readings, feed_ingredients/tmr_batches, somatic_cell_counts/withdrawal_period_holds, dry_off_events/calvings/culling_decisions) now have concrete target modules per the realized split.
- **Carry-over from prior audits (unchanged, not in scope this pass):** B11 aliases (B1A-S7), lactation_records users edge (B1A-S11), B6 intra-domain relationships, B12 lifecycle states, B8 cross-domain mirrors (gated on neighbor audits), B2 user-judgment items 2-8.

### Decisions

- B2-1 (module shape) resolved as **option (a) 4-module split** per the standing Pass-2 recommendation in this domain's prior audits. REPRODUCTION and HERD-HEALTH fold into HERD rather than standing alone; revisit only if Phase-0 candidate masters (heat_detections, pregnancy_checks) land and inflate the HERD data-object count enough to justify a REPRODUCTION split.
- industry_id set to 26 (Dairy) on all 4 modules: single unambiguous industry row, consistent with the domain's own description ("workflows are fundamentally different from beef / swine").

## 2026-06-05 - b1a execution

Executed the agent-solvable b1a items against the live `domain_map` module (1001). All inserts landed with `record_status` defaulted to `new`; no `notes` columns written.

### B1A-SKILLS - DONE

Authored one `system` skill per module, redistributed the 8 existing query tools to the owning module's skill, added module-scoped mutate / side_effect / fetch tools, and retired the legacy domain-level skill.

- `skills` (4 inserted): `dairy_mgmt_herd_agent` id=274 (module 227), `dairy_mgmt_parlor_agent` id=275 (module 228), `dairy_mgmt_milk_quality_agent` id=276 (module 229), `dairy_mgmt_feed_agent` id=277 (module 230).
- `tools` (5 inserted, deduped by tool_name catalog-wide; none pre-existed): `cull_dairy_cow` (mutate, do_id=499, platform), `close_lactation` (mutate, do_id=500, platform), `complete_milking` (mutate, do_id=501, platform), `dispatch_bulk_milk_shipment` (side_effect, do_id=NULL, external), `fetch_dhia_test_result` (fetch, do_id=NULL, external). The 8 existing query tools (ids 372-379) were reused, not re-created.
- `skill_tools` (13 inserted): HERD id=274 -> query_dairy_cows, query_lactation_records, query_breeding_events, query_cow_health_events, cull_dairy_cow, close_lactation (6). PARLOR id=275 -> query_milkings, query_bulk_milk_shipments, complete_milking, dispatch_bulk_milk_shipment (4). MILK-QUALITY id=276 -> query_milk_quality_tests, fetch_dhia_test_result (2). FEED id=277 -> query_feed_rations (1). All `requirement_level=required`.
- DELETE (snapshot before delete): legacy `skill_tools` rows 435-442 (skill_id=43, all `requirement_level=required`, linking tools 372-379) DELETEd, then legacy `skills` row id=43 (`skill_name=dairy-mgmt-system`, `skill_type=system`, `domain_id=156`, `domain_module_id=NULL`) DELETEd. The 8 `tools` rows themselves were preserved (only the junction rows and the skill were removed).
- Result: F2 passes (exactly 1 system skill per module 227-230), F3 passes (>=1 skill_tool each), F4 holds (operation_kind <-> data_object_id invariant), F1 passes (legacy domain-level system skill gone).
- Note: FEED skill carries only `query_feed_rations` (1 tool). The action scoped new mutates to cull/close_lactation/complete_milking and did not specify a feed mutate; feed_rations' write-shape is still an open user-judgment (B2-5 config-shape exemption), so no un-asked-for feed mutate was authored. Satisfies the F3 floor (>=1).
- Loader: `.tmp_deploy/dairy_mgmt_b1a_skills_2026_06_05.ts` (gitignored).

### B1A-B10B - DONE

PATCHed `source_domain_module_id` on all 8 outbound handoffs. Prior value on every row: `source_domain_module_id=NULL`. Derivation per B10b = module mastering the trigger_event's data_object (strongest role = master); matches the action mapping exactly.

- 353 (bulk_milk_shipment.dispatched, event do_id=506): NULL -> 228 (PARLOR).
- 955 (milking.completed, event do_id=501): NULL -> 228 (PARLOR).
- 354 (milk_quality_test.failed, event do_id=502): NULL -> 229 (MILK-QUALITY).
- 355 (cow_health_event.treatment_administered, event do_id=504): NULL -> 227 (HERD).
- 956 (lactation_record.opened, event do_id=500): NULL -> 227 (HERD).
- 957 (breeding_event.recorded, event do_id=503): NULL -> 227 (HERD).
- 958 (feed_ration.changed, event do_id=505): NULL -> 230 (FEED).
- 959 (feed_ration.changed, event do_id=505): NULL -> 230 (FEED).
- `target_domain_module_id` left NULL on all 8 (owed by each neighbor's B10b - FOOD-TRACE / FSQM / FIN / GRC - not this domain's scope). No `handoffs.notes` written. Verify: `/handoffs?source_domain_id=eq.156&source_domain_module_id=is.null` returns zero rows.

### B1A-S7 - DONE

Inserted 13 `data_object_aliases` rows (all `alias_type=synonym`, `record_status=new`, `is_preferred=false`, `notes` empty, no industry_id/solution_id). Ids 1085-1097.

- dairy_cows (499): "cow" (1085), "animal" (1086).
- lactation_records (500): "lactation cycle" (1087), "DIM record" (1088).
- milkings (501): "parlor session" (1089), "milk event" (1090).
- milk_quality_tests (502): "DHIA test" (1091), "milk test" (1092).
- breeding_events (503): "insemination" (1093).
- cow_health_events (504): "treatment record" (1094).
- feed_rations (505): "TMR ration" (1095).
- bulk_milk_shipments (506): "milk pickup" (1096), "tanker load" (1097).
- All 10 action-named tuples loaded, plus 3 standard industry synonyms (milk test, treatment record, TMR ration) to reach the 10-15 target and give every master >=1 alias. DHIA / DIM are industry-standard initialisms, not vendor trademarks, so classified `synonym` (the `industry_term` type requires an `industry_id` FK with no clean target). B11 now passes.
- Loader: `.tmp_deploy/dairy_mgmt_b1a_aliases_2026_06_05.ts` (gitignored).

### B1A-S11 - SKIPPED

`lactation_records` (500) users-edge. The action is explicitly conditional on a user decision ("Surface proposed verb ... If user approves, INSERT ... If user declines, document"), and the finding itself states no clean single-actor verb exists (choice between `is recorded by` vs `is opened by` / system-attribution). This is master-data judgment beyond the action text; skipped per the conservative-on-master-data rule. lactation_records remains the only DAIRY-MGMT master without a `users` many_to_many edge (the other 7 carry rows 1775-1781). Kept as open b1a for an explicit user verb decision.

### Not in scope this pass

- Catalog UX (A4 / M8) `catalog_tagline` / `catalog_description` remain empty on the domain and all 4 modules. This is tracked under b1b B1B-S2, blocked by user_decision B2-2; not a b1a item, so not written here.

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

---

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass (Rule #21) over DAIRY-MGMT's open state.yaml items. Worked only the
open items, classified each EXECUTE / SURFACE / LEAVE, and ran every additive/corrective fix the
agent can do. All writes landed `record_status='new'`; no `notes` column written; no existing
non-empty value overwritten; no `approved` stamped. The stale "surface-before-write" gate on the
catalog UX item (B1B-S2 / B2-2) was ignored per the Rule #20 catalog-UX execute instruction.
Loader: `.tmp_deploy/2026-06-07_dairy_mgmt_state_driven_execute.ts` (gitignored), idempotent.

### Executed

- **entity_type classification (Rule #12, 8 PATCH).** All 8 masters were `unclassified`. Set
  dairy_cows (499), lactation_records (500), milkings (501), milk_quality_tests (502),
  breeding_events (503), cow_health_events (504), bulk_milk_shipments (506) ->
  `operational_workflow` (each has an observable state machine, B12). feed_rations (505) ->
  `catalog` (author-once-and-supersede TMR config shape). This settles the B2-5 config-shape
  question structurally via the typed column (Rule #12: the notes-based exemption is rescinded;
  classify and move on). B13 now passes.
- **Catalog UX (Rule #20, 5 PATCH).** catalog_tagline + catalog_description were EMPTY on the
  domain row (156) and all 4 modules (227-230). Authored buyer-voice copy (workflow + value, no
  vendor/product names, no em-dash, American English) and wrote it into all five. This clears the
  prior B1B-S2 / A4 / M8 gap.
- **B1B-S6 missing handoff (1 INSERT).** `dairy_cow.lifecycle_changed` (trigger_event 1099,
  data_object 499) had zero `handoffs` rows despite the event's own description mandating an
  FIN fixed-asset-valuation dependency. Inserted handoff id=1403: source 156 / module 227
  (HERD), target 65 (FIN), integration_pattern=batch_sync, friction_level=low (mirrors
  sibling lifecycle handoff 956). target_domain_module_id left NULL (owed by FIN's B10b).
  DAIRY-MGMT now has 9 outbound handoffs; every one carries source_domain_module_id.

### Surfaced (user decisions / non-empty-value or approval judgments; not written)

- **B1A-S11** lactation_records (500) users-edge: still the only DAIRY-MGMT master without a
  `users` many_to_many edge. No clean single-actor verb; needs a user verb decision
  (`is recorded by` vs `is opened by` / system-attribution) or an explicit "accept absence".
- **B2-3** milkings `naming_authority_rationale` is empty on a row flagged
  `is_canonical_bare_word=true`; authoring rationale is a non-empty-value judgment.
- **B2-4** cow_health_events `has_personal_content` flag (vet-PII adjacency under FDA AMDUCA).
- **B2-6** DAIRY-MGMT-MILK-QUALITY business-function override (Quality/Compliance vs Operations).
- **B2-7** load FDA Grade A PMO / FARM / DHIA / state dairy `regulations` + `domain_regulations`
  (new-row authoring, currently zero; deferred as a discretionary catalog expansion).
- **B2-8 / B1B-H2** reviewer approval of the 6 `agent_curated` handoff_processes (573-578); only
  the user can flip `record_status` to `approved` (Rule #1).

### Left (blocked / not in execute allow-list / backlog)

- **B1B-S3** intra-domain `data_object_relationships`: relationship-verb / cardinality / owner_side
  judgment with a required mermaid preview; not a mechanical execute. Next substrate pass.
- **B1B-S8** lifecycle states for the 7 `operational_workflow` masters: state-machine design
  (initial/terminal/order + gates), not in the execute allow-list. feed_rations is now exempt
  (entity_type=catalog).
- **B1B-B2..B5** cross-domain `data_object_relationships` mirrors: blocked on each neighbor's
  payload-master identification (FOOD-TRACE, FSQM, FIN, GRC). The new handoff 1403 adds a
  third FIN mirror owed under B1B-B4.
- **b3 backlog** (B3-1..B3-8): Phase-0 missing-master candidates + 2 FIN custom-process APQC
  items (now joined by the new 1403, same no-clean-PCF profile).
- **Superseded per-module skill-grain / skill_tools items**: retired per the 2026-06-06
  supersession header; not reworked.

### Post-fix status

next_action_by: **user** (all remaining open items are user decisions, neighbor-blocked, or
backlog). Aliases (B1A-S7) and source_domain_module_id (B1A-B10B) were already complete from the
2026-06-05 pass and were not re-touched.

---

## 2026-06-13 - Audit (B9d handoff-payload realization pass)

### Summary

Continued from the open state.yaml worklist. The one purely agent-executable open item was
B1A-B9D-VERIFY (B9d had never run on this domain). Ran it via
`scripts/analytics/b9d_resolver.ts DAIRY-MGMT --dry-run` ONLY (NOT --write, per the run-safety
note: the resolver's --write has a catalog-wide cascade defect that rewrote ~144 unrelated audit
files and deleted q-files in a prior run). All B9d findings recorded BY HAND into DAIRY-MGMT's
own audit files. No neighbor files touched (every ORPHAN owner is DAIRY-MGMT itself). Verified
with git status that only DAIRY-MGMT/{state.yaml,q-DAIRY-MGMT.md,history.md} changed.

### B9d classification (both directions, all 6 boundary payload tags)

4 distinct (process, owner) findings, ALL classified ORPHAN, every one owned by DAIRY-MGMT (the
domain that masters the carried entity). No ROLL-UP (no re-point needed), no MIS-TAG (every
payload's APQC category fits dairy production: quality 4.3.x, compliance 11.2, traceability
2.1.4.9). DAIRY-MGMT is persona-cold-start: zero domain_roles on its modules (227-230), zero
gated lifecycle states wiring process_id for {70,170,171,556}, zero process_raci. Confirmed live.
So each ORPHAN is real missing work with no persona, and the owning persona is itself part of the
question (cold-start case the B9d band calls out).

- ORPHAN 11.2 "Manage compliance" (pid 70): inbound handoff 355 (FSQM->DAIRY-MGMT,
  cow_health_event.treatment_administered, payload cow_health_events).
- ORPHAN 4.3.3 "Perform quality testing" (pid 170): inbound handoff 354 (FSQM->DAIRY-MGMT,
  milk_quality_test.failed, payload milk_quality_tests).
- ORPHAN 4.3.4 "Maintain production records and manage lot traceability" (pid 171): inbound
  handoffs 353 + 955 (FOOD-TRACE->DAIRY-MGMT, bulk_milk_shipment.dispatched / milking.completed,
  payloads bulk_milk_shipments, milkings).
- ORPHAN 2.1.4.9 "Manage traceability data" (pid 556): inbound handoffs 957 (GRC->DAIRY-MGMT,
  breeding_event.recorded) + 959 (FOOD-TRACE->DAIRY-MGMT, feed_ration.changed), payloads
  breeding_events, feed_rations.

### Executed (recorded by hand)

- Resolved B1A-B9D-VERIFY (removed from b1a; this entry is its disposition note).
- Added 4 durable b2 items to state.yaml: B2-B9D-OWN-70 / -170 / -171 / -556 (owner = DAIRY-MGMT;
  modeled as b2 per the B9d contract, not b1b, since a b1b-backed q is illegal under the q-file
  content rule, and the owner must decide who does the work). Each item is "record now + name a
  persona once Phase E personas land, or leave off".
- Added the 4 questions to q-DAIRY-MGMT.md as q9-q12 (plain-language, owner-decision), updated the
  agent-map footer. They sit in the main (blocking) question list; q7/q8 stay in the Optional
  section.

### Other bands spot-verified (no change)

- B13: zero unclassified masters (all 8 classified; passes).
- B15: zero pattern flags on catalog/junction/computed masters (passes; feed_rations is catalog,
  carries no stray flag).
- B14: the 8 master+required rows are all universal dairy workflow entities (no statute-prefix /
  sector binding), so required is correct.

### Not executed this pass (unchanged from prior state)

- All q-file decisions (B1A-S11, B2-3, B2-4, B2-6, B2-7, B2-8) remain user-owned; no a-file present.
- b1b mirrors (B1B-S3 intra-domain relationships, B1B-S8 lifecycle states, B1B-B2..B5 cross-domain
  mirrors blocked on neighbor payload masters, B1B-H2 gated on B2-8 approval).
- b3 backlog (B3-1..B3-8) non-blocking.
- No record_status flips (Rule #1); no notes written (Rule #15); no non-empty value overwritten;
  no approved stamped.

### Post-fix status

next_action_by: **user**. The domain stays feedback_needed: all remaining open items are user
decisions (q1-q12 in the q-file), neighbor-blocked b1b mirrors, b1b authoring items (relationships,
lifecycle states), or non-blocking b3. The B9d band is now run and recorded for this domain in both
directions.
