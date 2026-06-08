# Data Center Infrastructure Management (DCIM): questions waiting for you

## What this domain is
Track and run the physical layer of the data center: racks and cabinets, power distribution and UPS, cooling, environmental sensors, capacity plans, and the port and cable connections that wire it all together. It gives infrastructure and facilities teams one place to see what is installed where, how much power and cooling each area draws, and when a rack, circuit, or sensor crosses a threshold. The masters exist, but the domain has not been built into modules yet, so the questions below shape that build.

---

q1: (answer this first) How should DCIM be split into modules? The build adopted a 3-module split: Asset and Space Management (dc_racks, dc_cabinets, dc_change_requests), Power and Environmental Monitoring (PDUs, power_circuits, UPSes, cooling_units, environmental_readings), and Capacity and Connectivity Planning (capacity_plans, port_connections, cable_connections).

- a) Three modules: Asset and Space Management + Power and Environmental Monitoring + Capacity and Connectivity Planning.
- b) Two modules: fold connectivity into the asset register (Asset, Space and Connectivity + Power, Cooling and Capacity).
- c) Four modules: split Connectivity (ports, cables) out of Capacity into its own module.

Recommended: a. The DCIM pure-plays converge on exactly these three surfaces. Sunbird sells dcTrack (asset, change, connectivity) alongside Power IQ (power and environmental monitoring); Schneider EcoStruxure IT splits IT Asset management from the Power/Cooling DCIM and a separate capacity/what-if modeling tier; Vertiv Environet separates asset/floor management, power-and-thermal monitoring, and capacity planning; Nlyte separates its asset register, energy/power monitoring, and capacity/what-if modeling. The genuine judgment call is where the connectivity map sits: I put ports and cables with capacity planning (Sunbird and Nlyte keep connectivity inside the same asset suite as planning), but a connectivity-led shop could follow FNT Command, the cabling/OSP specialist that treats physical connectivity as a standalone first-class surface, and take (c). Avoid (b): no flagship folds connectivity into the asset register as its headline split.

a1:

---

q2: Should DCIM keep all of its physical masters, or cede some to CMDB or a future enterprise asset domain?

- a) Keep all masters in DCIM; the dc_* scope keeps them distinct from CMDB configuration items, and DCIM publishes topology to CMDB rather than ceding ownership.
- b) Move dc_port_connections and dc_cable_connections to a CMDB-owned or cabling domain, leaving DCIM to consume them.
- c) Promote dc_racks and dc_cabinets to an enterprise-asset-owned physical-asset master that DCIM consumes.

Recommended: a. The DCIM flagships are the system of record for physical placement, power, and cooling and publish topology to the CMDB rather than handing it over. Device42 is the clearest case: it ships both a CMDB/discovery product and a DCIM product, and its DCIM module owns racks, power units, and physical cabling while feeding the logical CI graph. The built dc_port_connection.changed and dc_cable_connection.added handoffs to CMDB already model that publish-not-own pattern. Sunbird, Schneider, Vertiv, and Nlyte all keep racks, cabinets, and physical connectivity inside the DCIM register. Take (b) or (c) only if an incumbent CMDB or enterprise asset system already double-registers physical hardware. Moving a master between domains is destructive restructuring, so it needs your call.

a2:

---

q3: Should a data center change request (a move, add, or change) lock when it is submitted, so the request cannot be quietly edited after it goes for approval? (yes/no)

Recommended: yes. The moves-adds-changes workflow in Sunbird dcTrack, Nlyte work items, and Vertiv moves/adds/changes freezes the request once it is submitted and scheduled, so the as-built record stays trustworthy. This sets a flag on the new master, so it needs your confirmation.

a3:

---

q4: Should a data center change request route to a single critical-facilities approver, rather than a multi-approver change-advisory board? (yes/no)

Recommended: yes. Sunbird, Nlyte, and Vertiv gate a physical install, decommission, or relocation behind one facilities sign-off before equipment is energized or de-energized. The heavyweight multi-approver change-advisory board belongs to ITSM, which already receives DCIM's major-incident handoffs. This sets a flag on the new master, so it needs your confirmation.

a4:

---

q5: What coverage level should the Device42 DCIM solution carry, given Device42 also has a CMDB-scoped solution?

- a) partial: Device42 models racks, power, and connectivity but markets primarily as discovery and CMDB, so its DCIM surface is secondary to the pure-plays.
- b) secondary: treat its DCIM coverage on par with the pure-plays.
- c) Drop the DCIM solution; keep only Device42's CMDB row.

Recommended: a. Device42 leads with agentless discovery and CMDB, with DCIM (racks, power units, cabling, impact charts) as an attached surface, whereas Sunbird, Schneider EcoStruxure IT, Vertiv, and Nlyte lead with DCIM as the flagship. partial records that asymmetry honestly without overstating Device42's DCIM depth or erasing its real rack, power, and connectivity modeling. Changing a published coverage level overwrites a value, so it needs your call.

a5:

---

q6: Today an environmental sensor reading that crosses its alarm threshold publishes only to ITOM. Should it also publish to ITSM, so a sustained breach can trigger a major incident directly? (yes/no)

Recommended: yes. Schneider EcoStruxure IT and Vertiv Environet route sustained environmental-threshold alarms straight to an incident or ticketing workflow, not solely through a correlation layer, because a water-leak or over-temperature alarm is itself a candidate major incident. The cabinet-level environmental alert already fans out to ITSM; the sensor-reading event arguably should too. Leaving it to ITOM preserves single-source-of-event semantics but depends on an ITOM correlator existing. This adds a new cross-domain publish, so it needs your sign-off.

a6:

---

## Optional (will not hold up the build)

q7: Five extra market-surface objects show up across the flagship DCIM vendors but are absent from DCIM: floor plans (visual rack layout), sites (the location parent above racks), power reservations (reserved kW headroom), audit trails (SOC-2-shaped change log), and discovery scans (collector scan records). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules are confirmed. dc_floor_plans and dc_sites are near-universal (Sunbird, Schneider, Vertiv, Nlyte, Device42, FNT all model them) and are the strongest candidates; the rest want a verification pass first. dc_audit_trails may resolve to a cross-cutting platform log rather than a DCIM-local master.

a7:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-EAM-CMDB-OVERLAP q3=B2-CHANGE-REQUEST-FLAGS.submit_lock q4=B2-CHANGE-REQUEST-FLAGS.single_approver q5=B2-DEVICE42-COVERAGE q6=B2-ENV-READING-FAN-OUT q7=B3-MARKET-SURFACE | domain_id=84 -->
