# DCIM full-build draft (domain 84, code DCIM)

**Domain one-liner:** Asset, capacity, power, cooling, and floor-plan management for physical data centers and edge sites: the live system of record for racks, the power chain, cooling, environmental telemetry, capacity headroom, and physical connectivity.

This is a research and drafting pass only. Nothing was loaded. Deliverables are `DCIM-build.json` and this file.

## What already exists (reused, not re-proposed)
- 10 masters: dc_racks, dc_cabinets, dc_power_distribution_units, dc_power_circuits, dc_uninterruptible_power_supplies, dc_cooling_units, dc_environmental_readings, dc_capacity_plans, dc_port_connections, dc_cable_connections.
- 10 trigger_events and 9 outbound handoffs (to AIOPS, ITOM, ITSM, SPM, CMDB). Untouched.
- System skill `dcim-system`; ownership by IT Infrastructure (owner) and Facilities and Real Estate (contributor).
- Zero capabilities, modules, solutions, vendors, lifecycle states, tools. Those are the gaps this draft fills.

## Capabilities (7, all domain-scoped, none cross-cutting)
Physical Asset and Space Register, Power Chain Modeling, Cooling and Thermal Management, Environmental Monitoring, Capacity Planning, Physical Connectivity Mapping, Moves/Adds/Changes Workflow.

## Module split (3 full modules; gating decision MODULE-SPLIT, recommend option a)
1. **Asset and Space Management** (DCIM-ASSET-SPACE): dc_racks, dc_cabinets, + new dc_change_requests. Caps: asset register, MAC.
2. **Power and Environmental Monitoring** (DCIM-POWER-ENV): dc_power_distribution_units, dc_power_circuits, dc_uninterruptible_power_supplies, dc_cooling_units, dc_environmental_readings. Caps: power chain, thermal, environmental. This module owns all nine outbound event handoffs.
3. **Capacity and Connectivity Planning** (DCIM-CAP-CONN): dc_capacity_plans, dc_port_connections, dc_cable_connections. Caps: capacity planning, connectivity mapping.

Every existing master is assigned; every capability is realized by at least one module.

## Vendors and solutions (market had ZERO loaded)
Flagship DCIM set, with vendor reuse where the catalog already has the row:
- **Reused vendors:** Schneider Electric, Vertiv, Nlyte Software, Device42.
- **New vendors:** Sunbird Software, FNT Software.
- **Solutions (new):** Sunbird dcTrack (primary), Schneider Electric EcoStruxure IT (primary), Vertiv Environet Alert (primary), Nlyte DCIM Suite (primary), FNT Command (secondary), Device42 DCIM (partial).

Device42 already has a CMDB-scoped solution; its DCIM coverage is `partial` (decision DEVICE42-COVERAGE).

## New data object (1)
**dc_change_requests** (operational_workflow): the data-center moves/adds/changes request. Scope-qualified with the dc_ prefix to avoid colliding with ITSM change_requests. Flags: has_submit_lock=true, has_single_approver=true.

## Lifecycle states (4 workflow masters)
The three existing operational_workflow masters had none: **dc_racks** (planned->installed->active->at_capacity->decommissioning->retired), **dc_power_circuits** (planned->provisioned->energized->overloaded->de_energized->decommissioned), **dc_capacity_plans** (draft->in_review->approved->published->superseded), plus the new **dc_change_requests** (draft->submitted->approved->scheduled->in_progress->completed/rejected). Each has exactly one initial state, at least one terminal, and permission gates on energize/de-energize, approval, and retirement transitions. The seven operational_record masters get no states.

## Tools and personas
17 tools (query_* per master, mutate per workflow master, compute_dc_power_headroom, and notify_team for event fan-out, no channel primitives), wired via 19 module_tools. 4 personas: Data Center Manager and Capacity Planner (IT Infrastructure), Critical Facilities Engineer (Facilities and Real Estate), Data Center Technician (IT Infrastructure).

## Top decisions for the human
1. **MODULE-SPLIT (gating):** 3-way split as above vs 2 broad modules vs 4 (split out connectivity). Recommend 3.
2. **EAM-CMDB-OVERLAP:** keep all 10 masters in DCIM (dc_ prefix + physical-floor scope keep them distinct; topology already handed to CMDB via events). Recommend keep; revisit if EAM is later built.
3. **CHANGE-REQUEST-FLAGS:** freeze submit-lock + single-approver on dc_change_requests; multi-approver CAB belongs to ITSM.
