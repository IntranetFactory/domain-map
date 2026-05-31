---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 24
---

# DCIM, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 10 master data_objects (`dc_racks`, `dc_cabinets`, `dc_power_distribution_units`, `dc_power_circuits`, `dc_uninterruptible_power_supplies`, `dc_cooling_units`, `dc_environmental_readings`, `dc_capacity_plans`, `dc_port_connections`, `dc_cable_connections`); **0 domain_modules**; **0 capabilities**; **0 solutions**; **0 regulations**; 10 trigger_events (all with empty `event_category`); 9 outbound handoffs (all with NULL `source_domain_module_id`); 0 inbound handoffs; 0 lifecycle states; 0 data_object_relationships; 0 aliases; 1 legacy domain-level `system` skill (`dcim-system`, id 46) with no `domain_module_id`.
- Vendor-surface basis (flagship vendors enumerated below): Nlyte (pure-play, broad install base), Sunbird dcTrack (granular asset and connectivity), Schneider Electric EcoStruxure IT (vendor-anchored DCIM with power and cooling depth), Vertiv Environet (cooling and power specialist), Device42 (auto-discovery, hybrid CMDB-DCIM, already in catalog as solution id 46), NetBox (open-source IPAM-DCIM hybrid, IP-address and rack mainstay).
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

This domain is essentially a stub: ten masters were seeded but the surrounding Phase A / M / C / E / F substrate (modules, capabilities, solutions, regulations, lifecycle states, relationships, aliases, system skills, roles) was never authored. The audit therefore reads as a Phase-A through Phase-S backlog rather than a fine-grained gap report. M-band is the structural gate, every downstream band is blocked until the module set lands.

Structural pass: A1 passes, A2 / A3 / A4 fail (zero capabilities, zero solutions, empty `catalog_tagline` and `catalog_description`). M1 / M2 / M4 / M5 / M6 all fail (zero modules). B1 passes (10 masters), B2 partial fail (`dc_power_distribution_units` plural label is `Power Distribution Unit (PDU)s`, an irregular plural that reads oddly), B3 passes (every master is prefixed with `dc_`), B4 fail (all three pattern flags are `false` on every master, no positive re-evaluation), B5 vacuous pass (no embedded_master rows), B6 / B7 fail (zero `data_object_relationships`), B8 fail (no outbound cross-domain relationships though `dc_port_connections changes configuration_items` is the obvious one), B9 fail (every `trigger_events.event_category` is empty string, the enum requires lifecycle / state_change / threshold / signal; and `dc_power_circuit.overload` event 691 has zero handoff rows), B9b vacuous pass (cannot fail without modules), B10 informational (zero inbound, expected), B10b fail (every outbound handoff has NULL `source_domain_module_id`; three rows on the ITSM side also have NULL `target_domain_module_id`), B11 fail (zero aliases), B12 fail (zero lifecycle states). C1 partial pass (owner = IT Infrastructure, contributor = Facilities and Real Estate, sensible), C2 not evaluable until capabilities exist. D1 not evaluable. E1 through E6 fail (zero roles in the function buckets touching DCIM). F1 fail (legacy `dcim-system` skill with `domain_module_id` NULL while no module-level skill exists yet, transitional state acceptable until any module-level skill lands, then F1 hard-fails). F2 / F3 / F4 / F5 vacuous fail (no modules to have system skills against). F7 not evaluable. H1 fail (zero `handoff_processes` rows on 9 cross-domain handoffs, audit owes ~5 to 7 `agent_curated` tags).

### Vendor surface basis

Pure-play DCIM specialists: **Nlyte** (the long-standing reference schema, deep asset and connectivity), **Sunbird dcTrack** (rack-level granularity, change-management workflow), **Schneider EcoStruxure IT** (vendor-anchored, power and cooling focus, dominant in colocation), **Vertiv Environet** (environmental and cooling, strong UPS coverage), **Device42** (already in catalog id 46, auto-discovery slant), **NetBox** (open-source IPAM-DCIM hybrid, mainstay for network-heavy buyers). The first four are pure plays, Device42 and NetBox bring auto-discovery and IPAM adjacency. Union surface (entities seen across at least two vendors): rack and cabinet, PDU and power circuit, UPS and generator, cooling unit, environmental sensor reading, capacity plan, port and cable connection, floor plan, asset (server / network device / patch panel), site / room / row, power-budget reservation, change-request workflow, work order, IP / VLAN allocation (NetBox / Device42 only), discovery scan, audit log.

### Pass 3, Neighbor discovery

Edge weights by outbound handoff (DCIM has zero inbound, so neighbors are publish-only from this side):

| Neighbor | Domain code | Outbound edges | DMDO cross-refs | Total |
| --- | --- | ---: | ---: | ---: |
| ITSM | 1 | 4 | 0 | 4 |
| ITOM | 2 | 2 | 0 | 2 |
| AIOPS | 6 | 1 | 0 | 1 |
| CMDB | 4 | 1 | 0 | 1 |
| SPM | 9 | 1 | 0 | 1 |

Only ITSM crosses the weight-3 threshold for full pairwise reconciliation. ITOM at weight 2 gets a one-line summary. The remaining three (AIOPS, CMDB, SPM) at weight 1 each are noted under per-neighbor lighter-touch follow-ups.

### Pass 4, Pairwise reconciliation per neighbor

**DCIM, ITSM (weight 4).** All four outbound rows publish into ITSM-INCIDENT-MGMT (module 38): `dc_cabinet.environmental_alert`, `dc_power_distribution_unit.failure`, `dc_uninterruptible_power_supply.failover`, `dc_cooling_unit.failure`, payload `service_incidents` (47). Section 1 (fully wired): zero, because every row has NULL `source_domain_module_id`. Section 2 (NULL module FK PATCH candidates): all four rows are PATCH candidates on the **DCIM side** as soon as DCIM has the `DCIM-POWER-COOLING` (or similar) module that masters the source data_objects. ITSM side `target_domain_module_id=38` is already set on all four. Section 3 (missing handoffs implied): `dc_environmental_reading.threshold_breached` (event 694) currently publishes to ITOM (2) but the same trigger plausibly also belongs in ITSM-INCIDENT-MGMT, surface as Bucket 2 #3. Section 4 (boundary integrity): clean, DCIM cleanly owns the masters, ITSM cleanly owns `service_incidents`. Section 5 (relationship mirror): no `data_object_relationships` exist yet on either side for these handoffs, captured as B1-B3 below.

**DCIM, ITOM (weight 2).** `dc_environmental_reading.threshold_breached` (694) and `dc_power_distribution_unit.failure` (690) publish into ITOM. Both rows have NULL `target_domain_module_id`, this is **ITOM's B10b** to resolve, not DCIM's. Captured in report-only follow-ups.

**Lighter neighbors:** AIOPS (1 row, `dc_power_distribution_unit.failure` 690, NULL target module, AIOPS B10b), CMDB (1 row, `dc_port_connection.changed` 696, CMDB-CORE 108 is the target but **no consumer DMDO row exists** linking CMDB-CORE to `dc_port_connections` 554, CMDB's B-band gap), SPM (1 row, `dc_capacity_plan.refreshed` 695, NULL target module, SPM B10b).

### Bucket 1, In-scope confirmed gaps

#### MISSING (Phase A / M backlog, structural)

| ID | Item | Pass | Notes |
| --- | --- | --- | --- |
| B1-S1 | Author `domain_modules` for DCIM | M1 / M2 | Recommended split (3 modules): `DCIM-ASSET-CAPACITY` (racks, cabinets, port_connections, cable_connections, capacity_plans), `DCIM-POWER-COOLING` (PDUs, power_circuits, UPSes, cooling_units, environmental_readings), `DCIM-FLOORPLAN-SITE` optional starter. Module count 2 or 3 satisfies M2 once capabilities are at 3 or more. |
| B1-S2 | Author DCIM `capabilities` and `capability_domains` | A2 / M4 | Floor of 3, target 5 to 8. Proposed: `DCIM-ASSET-REGISTER`, `DCIM-CAPACITY-PLAN`, `DCIM-POWER-MGMT`, `DCIM-COOLING-MGMT`, `DCIM-CONNECTIVITY-MAP`, `DCIM-ENV-MONITORING`, `DCIM-FLOOR-PLAN`. Wire to the modules from B1-S1. |
| B1-S3 | Author DCIM `solutions` and `solution_domains` | A3 | Floor 3 with at least 1 `primary`. Proposed primaries: Nlyte, Sunbird dcTrack, Schneider EcoStruxure IT, Vertiv Environet. Secondaries: Device42 (id 46 already exists, link with `coverage_level=secondary`), NetBox. |
| B1-S4 | Populate domain `catalog_tagline` and `catalog_description` | A4 | Both fields are empty strings. Draft per Rule #20 buyer voice, surface for user review BEFORE writing. Never overwrite once non-empty. |
| B1-S5 | Author 1 system skill per module | F2 / F3 / Phase S | Names `dcim_asset_capacity_agent`, `dcim_power_cooling_agent`, etc. Each needs at least 1 `skill_tools` row. Retire legacy `dcim-system` skill id 46 once any module-level skill lands (F1). |
| B1-S6 | Author DCIM `roles` and `role_modules` and `role_permissions` | E1 / E2 / E3 / E4 / E5 | Once at least 2 modules exist, target roles: `IT-INFRA-DC-OPERATOR` (primary: power, cooling and asset modules), `IT-INFRA-CAPACITY-PLANNER` (primary: capacity, secondary: asset), `FACILITIES-DC-FACILITIES-LEAD` (primary on the cooling and floor-plan modules, secondary on the others). Function-scoped prefixes per Rule. |

#### STRUCTURAL (band failures fixable without modules)

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| B1-T1 | B9 | `trigger_events.event_category` is an empty string on every one of the 10 DCIM events (688 to 697). The enum requires `lifecycle`, `state_change`, `threshold`, or `signal`. | PATCH each row. Recommended values: `dc_rack.capacity_threshold_breached` 688 = `threshold`, `dc_cabinet.environmental_alert` 689 = `threshold`, `dc_power_distribution_unit.failure` 690 = `state_change`, `dc_power_circuit.overload` 691 = `threshold`, `dc_uninterruptible_power_supply.failover` 692 = `state_change`, `dc_cooling_unit.failure` 693 = `state_change`, `dc_environmental_reading.threshold_breached` 694 = `threshold`, `dc_capacity_plan.refreshed` 695 = `lifecycle`, `dc_port_connection.changed` 696 = `state_change`, `dc_cable_connection.added` 697 = `lifecycle`. |
| B1-T2 | B9 | `dc_power_circuit.overload` (event 691) has **zero** handoff rows, the only DCIM event without a downstream subscriber. | Author a handoff into ITSM-INCIDENT-MGMT (module 38, payload `service_incidents` 47), `integration_pattern: event_stream`, `friction_level: high`. Source module FK is part of B1-S1. |
| B1-T3 | B2 | `dc_power_distribution_units.plural_label` = `Power Distribution Unit (PDU)s` reads as `PDU)s` with the stray closing-paren-s. | PATCH `plural_label` to `Power Distribution Units (PDUs)`. |
| B1-T4 | B4 | All three pattern flags (`has_personal_content`, `has_submit_lock`, `has_single_approver`) sit at `false` default on every DCIM master with zero recorded re-evaluation. | Run the consideration in the audit: every master is **infrastructure asset data**, not user-content, so `has_personal_content=false` is the correct positive answer everywhere. `has_submit_lock` and `has_single_approver` are workflow-shaped and depend on B1-S7 lifecycle authoring, defer the answer until then. Record the consideration in the audit transcript, not in `notes` (Rule #15). |
| B1-T5 | B6 / B7 / B8 | Zero `data_object_relationships` rows exist. Required edges: intra-domain (`dc_racks contains dc_cabinets`, `dc_cabinets contains dc_power_distribution_units`, `dc_power_distribution_units feeds dc_power_circuits`, `dc_power_circuits powers dc_cabinets`, `dc_uninterruptible_power_supplies backs dc_power_distribution_units`, `dc_cooling_units serves dc_cabinets`, `dc_environmental_readings sampled_at dc_cabinets`, `dc_capacity_plans plans dc_racks`, `dc_port_connections connects dc_cable_connections`); user edges per Rule #10 (`users owns dc_racks`, `users authors dc_capacity_plans`, `users approves dc_capacity_plans`, `users inspects dc_environmental_readings`); cross-domain edges (`dc_port_connections updates configuration_items` for CMDB outbound, `dc_capacity_plans informs financial_plans` or similar for SPM). | Draft and load as a focused relationships loader once B1-S1 modules exist (some edges resolve cleanly without modules, but they belong in the same load). |
| B1-T6 | B11 | Zero aliases on every master. Industry synonyms exist for several: `dc_racks` = `rack`, `dc_cabinets` = `cabinet`, `dc_power_distribution_units` = `PDU`, `dc_uninterruptible_power_supplies` = `UPS`, `dc_environmental_readings` = `sensor reading`, `dc_port_connections` = `patch port`, `dc_cable_connections` = `patch cable`. | Author 7 alias rows of `alias_type='industry'`. |
| B1-T7 | B12 | Zero lifecycle states on every DCIM master. Workflow-bearing masters need state machines: `dc_capacity_plans` (draft, in-review, approved, archived), `dc_power_circuits` (provisioned, energised, deenergised, decommissioned), `dc_racks` (planned, installed, active, retired). Pure-sensor masters (`dc_environmental_readings`, `dc_port_connections`, `dc_cable_connections`) are arguably config-shape; surface the exemption explicitly to the user (Bucket 2 #4), do NOT auto-populate `notes` (Rule #15). | Draft state machines for the workflow masters, surface the config-shape exemption decision for the read-only ones. Module FK on each state row is part of B1-S1. |
| B1-H1 | H1 / APQC | All 9 outbound handoffs are untagged. The agent built the mental model while reading them; tag now per the volume expectation of 0.5N to 0.8N (~5 to 7 tags on 9 handoffs). | Author `handoff_processes` rows with `proposal_source='agent_curated'`, `record_status='new'`. Proposed mapping below in the APQC TAGGING sub-table. |

#### BOUNDARY

| ID | Finding | Fix |
| --- | --- | --- |
| B1-B1 | All 9 outbound handoffs have NULL `source_domain_module_id` (B10b sub-case 1, no module exists yet). | Becomes a deterministic PATCH the moment B1-S1 modules land, the strongest-role module that holds the source data_object wins. |
| B1-B2 | Handoff 681 (`dc_rack.capacity_threshold_breached` to ITOM target 2, NULL `target_domain_module_id`) and handoff 673 (`dc_environmental_reading.threshold_breached` to ITOM target 2, NULL `target_domain_module_id`) and handoff 676 (`dc_power_distribution_unit.failure` to AIOPS target 6, NULL `target_domain_module_id`) and handoff 680 (`dc_capacity_plan.refreshed` to SPM target 9, NULL `target_domain_module_id`) need target-module resolution. | These are **report-only follow-ups** on the receiving domains (ITOM B10b, AIOPS B10b, SPM B10b). Listed below; do not author from DCIM's pass. |
| B1-B3 | CMDB-CORE (module 108) is named as the target on handoff 679 (`dc_port_connection.changed` to CMDB) but no `domain_module_data_objects` row links module 108 to `dc_port_connections` (554) as `consumer` or `contributor`. | **CMDB's B-band gap**, report-only on the CMDB side. DCIM cannot author the consumer row on CMDB's behalf. |

#### APQC TAGGING (agent_curated proposals, all `record_status='new'`)

| Handoff id | Source to Target, event | Payload | Proposed APQC PCF (id, external_id, hierarchy) | Confidence |
| ---: | --- | --- | --- | --- |
| 674 | DCIM, ITSM, `dc_cabinet.environmental_alert` | `service_incidents` | 1299, Triage IT service delivery incidents (ext 20903 L4) | high |
| 675 | DCIM, ITSM, `dc_power_distribution_unit.failure` | `service_incidents` | 1299, Triage IT service delivery incidents (ext 20903 L4) | high |
| 677 | DCIM, ITSM, `dc_uninterruptible_power_supply.failover` | `service_incidents` | 1299, Triage IT service delivery incidents (ext 20903 L4) | high |
| 678 | DCIM, ITSM, `dc_cooling_unit.failure` | `service_incidents` | 1299, Triage IT service delivery incidents (ext 20903 L4) | high |
| 681 | DCIM, ITOM, `dc_rack.capacity_threshold_breached` | `dc_racks` | 1304, Manage infrastructure performance and capacity (ext 20909 L4) | high |
| 673 | DCIM, ITOM, `dc_environmental_reading.threshold_breached` | `dc_environmental_readings` | 1304, Manage infrastructure performance and capacity (ext 20909 L4) | medium |
| 676 | DCIM, AIOPS, `dc_power_distribution_unit.failure` | `dc_power_distribution_units` | 1304, Manage infrastructure performance and capacity (ext 20909 L4) | medium |
| 680 | DCIM, SPM, `dc_capacity_plan.refreshed` | `dc_capacity_plans` | 291, Develop and manage infrastructure resource planning (ext 20888 L3) | high |
| 679 | DCIM, CMDB, `dc_port_connection.changed` | `dc_port_connections` | 1309, Manage infrastructure configuration (ext 20915 L4) | high |

All 9 handoffs tagged, zero deferrals.

### Bucket 2, Surface-for-user (judgment calls)

1. **Module split.** Recommended is 3 modules (`DCIM-ASSET-CAPACITY`, `DCIM-POWER-COOLING`, optional `DCIM-FLOORPLAN-SITE`). Decisions: (a) approve 3-module split, (b) collapse to 2 (`DCIM-PHYSICAL` + `DCIM-POWER-COOLING`), (c) start with 1 full module (`DCIM-CORE`) and the optional starter, (d) propose a different split. The module FK on every B-band fix depends on this answer.
2. **Capability set.** Recommended seven capability codes above (B1-S2). User confirms which land and whether any should fold into existing cross-cutting codes (e.g. `ITOM-CAPACITY` 227 already exists, should DCIM capacity be a separate `DCIM-CAPACITY-PLAN` or a `domain_module_capabilities` link to the existing one? Cross-cutting capability convention applies.).
3. **`dc_environmental_reading.threshold_breached` fan-out.** Currently publishes only to ITOM. ITSM-INCIDENT-MGMT plausibly also subscribes (an environmental threshold breach is a major-incident trigger). Add a second outbound handoff DCIM to ITSM on the same trigger event? (a) yes, fan out, (b) no, ITOM correlates and re-publishes to ITSM, (c) defer.
4. **Lifecycle state authoring scope.** Workflow-bearing masters (`dc_capacity_plans`, `dc_power_circuits`, `dc_racks`) get state machines, that is uncontroversial. The sensor-shape masters (`dc_environmental_readings`, `dc_port_connections`, `dc_cable_connections`) are config-shape, no real state machine. Rule #12 exempts them but the prior license to record the exemption in `data_objects.notes` is rescinded (Rule #15). User decides whether to: (a) accept the exemption silently (tracked in this audit only), (b) author the user-approved exact `notes` wording for each exempt master.

### Bucket 3, Phase 0 pending (speculative, vendor-research vetting needed)

Universal-vendor entities surfaced by the flagship-vendor scan that did NOT make Bucket 1 because they need formal Phase 0 confirmation, multiple flagship vendors carry them but module placement and ownership warrant the vetting pass:

| Candidate | Proposed module | Vendor evidence |
| --- | --- | --- |
| `dc_floor_plans` | DCIM-FLOORPLAN-SITE | Nlyte, Sunbird, Schneider, NetBox |
| `dc_sites` (site / data-hall master) | DCIM-ASSET-CAPACITY | Nlyte, Sunbird, Schneider, Device42 |
| `dc_change_requests` | DCIM-POWER-COOLING (cross-module, may demote to ITSM `change_requests` consumer) | Nlyte, Sunbird, dcTrack (rack-move workflow) |
| `dc_power_reservations` | DCIM-POWER-COOLING | Sunbird, Schneider, Nlyte |
| `dc_audit_trails` | cross-cutting | Nlyte, Sunbird, regulatory-shaped (SOC 2 evidence) |
| `dc_discovery_scans` | DCIM-ASSET-CAPACITY | Device42 (primary), Nlyte, Sunbird |

### Cross-bucket dependencies

- **Bucket 1 modules (B1-S1) gate everything downstream.** B1-S5, B1-S6, every B-band relationships and lifecycle authoring, every APQC handoff_process row that needs a source module FK, and every B10b PATCH on existing handoffs depends on the module set landing first.
- **Bucket 2 #1 (module split) gates Bucket 1 module-FK choices.** Three modules versus two changes which master sits where, which changes every DMDO authoring and every B10b PATCH.
- **Bucket 2 #2 (capability set) interacts with B1-S2 and M4.** A capability that folds into an existing cross-cutting code reduces the new-capability count by one but adds a `capability_domains` link instead.
- **Bucket 3 candidates are independent of Bucket 1 fixes** but candidate `dc_floor_plans` and `dc_sites` would alter the recommended module split in Bucket 2 #1 (a 3-module split with FLOORPLAN-SITE makes more sense once floor_plans and sites land).
- **B1-T4 pattern flags depend on B1-T7 lifecycle authoring** for the `has_submit_lock` and `has_single_approver` answers.

### Per-bucket prompts

- **Bucket 1:** "Approve the 14 in-scope items? Recommend approving B1-T1, B1-T3, B1-T6 as standalone PATCHes that don't depend on Bucket 2 #1 (module split), then approving B1-S1 through B1-S6 + B1-T2 + B1-T5 + B1-T7 + B1-H1 + B1-B1 as a bundle once Bucket 2 #1 is decided. B1-T4 (pattern-flag re-eval) records as an audit-transcript decision, not a write."
- **Bucket 2:** "Four open judgment calls. Bucket 2 #1 (module split) is the gating decision, every other Bucket 1 fix waits on it. Recommend 3 modules (`DCIM-ASSET-CAPACITY`, `DCIM-POWER-COOLING`, optional `DCIM-FLOORPLAN-SITE`) if Bucket 3 floor_plans and sites are vetted in, otherwise 2 modules. What's your call on each?"
- **Bucket 3:** "Six speculative candidates from the flagship vendor scan. Vet via formal Phase 0 vendor-research protocol, or eyeball-mode trust given the high overlap? `dc_floor_plans`, `dc_sites`, `dc_change_requests`, `dc_power_reservations` are very high-confidence cross-vendor. `dc_audit_trails` is a regulatory shape (SOC 2 evidence). `dc_discovery_scans` is Device42-skewed; vet for non-Device42 buyers."

### Report-only follow-ups (owed by other domains)

| Owed by | Check | Detail |
| --- | --- | --- |
| ITOM B10b | `handoffs.target_domain_module_id` NULL on rows 681 (`dc_rack.capacity_threshold_breached`) and 673 (`dc_environmental_reading.threshold_breached`) | ITOM owes the consumer DMDO row and the B10b backfill on whichever ITOM module subscribes to capacity and environmental signals (likely `ITOM-MONITORING` or `ITOM-CAPACITY`). |
| AIOPS B10b | `handoffs.target_domain_module_id` NULL on row 676 (`dc_power_distribution_unit.failure`) | AIOPS owes the consumer DMDO row and the B10b backfill on the correlator module. |
| SPM B10b | `handoffs.target_domain_module_id` NULL on row 680 (`dc_capacity_plan.refreshed`) | SPM owes the consumer DMDO row on whichever SPM module reads capacity plans into the build-out portfolio. |
| CMDB B-band | No `domain_module_data_objects` row exists linking CMDB-CORE (108) to `dc_port_connections` (554) as `consumer`, yet handoff 679 names CMDB-CORE as the target_domain_module_id. | CMDB owes a consumer DMDO row on `dc_port_connections` (and arguably on `dc_cable_connections` for completeness). |
| ITOM B8 (inbound) | When DCIM authors the `dc_environmental_readings` outbound, ITOM should mirror the `data_object_relationships` row on its side (`monitoring_signals receives dc_environmental_readings` or similar). | Audited on ITOM's pass. |

### Candidates queued

- **IPAM-DDI**, IP Address Management and DDI: Infoblox, BlueCat, EfficientIP, ApplianSys, NetBox, Men&Mice; adjacency DCIM, CMDB, NPMD, ITOM. Surfaced by the NetBox / Device42 overlap on the DCIM vendor surface: rack-and-cable mapping overlaps with subnet, VLAN, and DHCP allocation in those vendor schemas. Queued via `scripts/analytics/append_missing_domain.ts`. Total candidates queued from this audit: 1.
