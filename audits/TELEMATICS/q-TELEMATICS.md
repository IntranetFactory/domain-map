# Vehicle Telematics (TELEMATICS): questions waiting for you

## What this domain is
Live vehicle tracking, hours-of-service compliance, and driver-safety telemetry from one connected fleet platform.

This is the connectivity-and-data layer beneath fleet operations: GPS tracking and trip segmentation, ELD (electronic logging device) compliance for FMCSA hours-of-service rules, driver-behavior monitoring (harsh braking, speeding, cornering), video telematics from dashcams, geofencing, and engine and vehicle sensor data. It feeds utilization analytics, maintenance triggers, and incident-claims evidence, and it sits below the fleet-management workflow layer while staying distinct from generic IoT platforms.

---

q1: (answer this first) Who should own driver vehicle inspection reports (DVIR), the FMCSA pre/post-trip driver inspection workflow?

- a) Create a new `dvir_inspections` entity under TELEMATICS Compliance and Safety, and leave FLEET-MGMT `vehicle_inspections` for periodic mechanic inspections (PMI).
- b) Extend the existing FLEET-MGMT `vehicle_inspections` entity with a `kind` discriminator to cover both DVIR and PMI.
- c) Move ownership of `vehicle_inspections` from FLEET-MGMT to TELEMATICS.

Recommended: a. Vendor practice treats DVIR (driver pre/post-trip) and PMI (mechanic-completed) as distinct workflows, so a separate entity is the cleanest fit. This shapes the entity set and unlocks the missing-compliance-entity load below it.

a1:

---

q2: Where should the personal-data flag apply across the telemetry entities, for GDPR and CCPA?

- a) All 8 entities (strict privacy reading: position telemetry is personal-by-association when tied to an identified driver).
- b) Only the 4 driver-attributed entities (driver-behavior events, ELD logs, dashcam events, safety scorecards).
- c) Only the dashcam and driver-behavior pair (narrow operational reading).

Recommended: a or b. Position telemetry is personal data under GDPR and CCPA when tied to an identified driver; pick (a) for the strict reading or (b) if you want only the clearly driver-attributed entities flagged.

a2:

---

q3: Are the 4 position-telemetry entities (vehicle trips, GPS waypoints, idle events, geofence events) append-only telemetry that may skip lifecycle states (a config-shape exemption), leaving only the 4 compliance-and-safety entities to carry state machines? (yes/no)

Recommended: yes. These four are append-only telemetry with no real workflow, so the config-shape exemption fits and only the workflow-bearing compliance entities need state machines.

a3:

---

q4: The 5 event-category values written in the last pass (GPS waypoint recorded = lifecycle; idle event detected = threshold; geofence crossed = threshold; safety scorecard updated = state_change; vehicle mileage milestone reached = threshold). Should they stand as written? (yes/no)

Recommended: yes. The values were applied from the prior audit's mapping; confirming closes the loop, otherwise a reverse-PATCH amends the named rows.

a4:

---

q5: A cross-catalog blocker: the platform-versus-external classification of the notify-team and notify-person abstractions (their coverage tier) is unresolved, and it gates skill authoring for the TELEMATICS modules. How should we proceed?

- a) Confirm the current coverage-tier state as-is and proceed.
- b) Escalate to the platform team for a catalog-wide classification.

Recommended: b. This is the same catalog-wide blocker flagged elsewhere; resolving it centrally is cleaner than deciding it per domain.

a5:

---

q6: Two inbound handoffs from the farm-management domain (FMIS) carry agricultural payloads (variable-rate prescriptions and machinery telemetry) that land on TELEMATICS with no declared role. How should they be routed?

- a) Drop both as mis-routed (the FMIS subscriber likely meant a separate agricultural-telematics sibling, not vehicle telematics).
- b) Add consumer dependency rows on the TELEMATICS modules so the cross-vertical dependency is captured.
- c) Queue a new Agricultural Telematics (AG-TELEMATICS) candidate domain and route them there.

Recommended: c, pending research. Agricultural-machinery telemetry sits between agronomy/FMIS and a likely AG-TELEMATICS sibling; queuing the candidate captures the real owner. Option (a) is destructive (drops live handoffs), so it needs your sign-off.

a6:

---

q7: Handoff 312 fires on `preventive_maintenance.due` over a preventive-maintenance-schedule payload that FLEET-MAINT owns and TELEMATICS does not model (likely modeling debt from a pre-modular load). What should happen to it?

- a) Delete handoff 312 and its trigger event (the intended signal, vehicle mileage milestone reached, is already covered by another handoff).
- b) Re-point the trigger event to a TELEMATICS-owned entity.
- c) Leave it in place with a debt flag.

Recommended: a. The payload belongs to FLEET-MAINT and the intended signal is already covered elsewhere, so this looks like stale debt. Deletion is destructive, so it needs your sign-off.

a7:

---

q10: Fleet Management forwards driver behavior event to Vehicle Telematics to manage transportation fleet, but Vehicle Telematics does not yet have anyone assigned to manage transportation fleet, so this step has no owner. How should it be handled?
- a) Record it now as work Vehicle Telematics owns, and assign a named owner once Vehicle Telematics sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Vehicle Telematics decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a10:

---

q11: Governance, Risk and Compliance forwards eld log to Vehicle Telematics to compile and communicate internal and regulatory compliance reports, but Vehicle Telematics does not yet have anyone assigned to compile and communicate internal and regulatory compliance reports, so this step has no owner. How should it be handled?
- a) Record it now as work Vehicle Telematics owns, and assign a named owner once Vehicle Telematics sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Vehicle Telematics decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a11:

---

## Optional (will not hold up the build)

q8: Five compliance and FMCSA-mandated entities are missing and are first-class across all flagship vendors: DVIR inspections, HOS certifications, driver-coaching sessions (all on Compliance and Safety), plus IFTA jurisdiction summaries and engine fault codes (on Fleet Tracking). Should I add the ones that hold up once the DVIR ownership call in q1 lands? (yes/no)

Recommended: yes, additive and can follow the ownership decision. All five are mandated or first-class vendor surfaces; the DVIR entity additionally depends on q1.

a8:

---

q9: Three further market-surface candidates appear across the flagship vendors but may belong in sibling domains rather than TELEMATICS: driver dispatch messaging (possibly a fleet-dispatch/TMS domain), cargo/environmental IoT sensors (cold-chain, door, trailer), and planned-versus-actual route reconciliation. Should I research these and add the ones that genuinely belong here? (yes/no)

Recommended: yes, but research first; each may resolve to a separate module or sibling domain rather than a TELEMATICS entity. Additive and non-blocking.

a9:

---

<!-- agent map, ignore: q1=B2-DVIR-OWNERSHIP q2=B2-PERSONAL-CONTENT-SCOPE q3=B2-LIFECYCLE-EXEMPTIONS q4=B2-EVENT-CATEGORY-CONFIRMATION q5=B2-NOTIFY-TEAM-COVERAGE-TIER q6=B2-FMIS-INBOUND-ROUTING+B3-AG-TELEMATICS q7=B2-HANDOFF-312-FATE q8=B1B-M1-MISSING-ENTITIES+B3-IFTA-JURISDICTION-SUMMARIES+B3-FAULT-CODES+B3-DRIVER-COACHING-SESSIONS+B3-HOS-CERTIFICATIONS q9=B3-DRIVER-MESSAGES+B3-VEHICLE-ENV-SENSORS+B3-ROUTE-EXECUTIONS q10=B2-B9D-OWN-862 q11=B2-B9D-OWN-1607 | domain_id=148 -->
