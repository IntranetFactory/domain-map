# Workplace and Space Management (IWMS): questions waiting for you

## What this domain is
Book the desk, reserve the room, and prove the space is working.

Run the hybrid workplace end to end: a single registry of sites, buildings, and floors that every booking flow rides on, self-service desk and meeting-room reservations with check-in and no-show recapture, a facilities service desk for workplace tickets, and occupancy analytics that turn badge and booking signals into space-utilization reporting. The payoff is a workplace employees can navigate without friction and a real-estate footprint leaders can right-size with evidence instead of guesswork.

---

q1: (answer this first) Should desk reservations and room reservations stay as two separate modules, or merge into one?

- a) Keep them split (desk booking and room booking as their own modules).
- b) Merge them into a single reservations module.

Recommended: a. Keeping the split is the current shape and works for customers who buy desk booking and room booking separately. This choice drives the cross-module handoff shape behind the rest of the build, so it unlocks the rest of the work.

a1:

---

q2: Which capability should the room-reservation module be linked to?

- a) Link it to the existing space-optimization capability (matches how desk booking and analytics are already linked).
- b) Create a new, more granular meeting-room-management capability and link that instead.
- c) A mix (specify per module).

Recommended: a. Linking to the existing space-optimization capability matches the current pattern and avoids forcing the same new-capability split onto desk booking. Some workplace platforms market desk and room as one workflow, others split them, so this is a judgment call.

a2:

---

q3: Should a desk booking be frozen once the person has checked in, so a checked-in booking cannot be quietly edited? (yes/no)

Recommended: yes. Check-in is the point a booking becomes a real occupancy record, and vendor behavior supports locking it then. This overwrites the current value, so it needs your sign-off.

a3:

---

q4: Should a room reservation be frozen once the person has checked in? (yes/no)

Recommended: yes. Same reasoning as the desk booking: check-in turns the reservation into a real occupancy record. This overwrites the current value, so it needs your sign-off.

a4:

---

q5: Should a workplace service request require a single named approver on its path from triaged to resolved? (yes/no)

Recommended: yes. Vendor evidence supports a single accountable approver on the triage-to-resolve flow. This overwrites the current value, so it needs your sign-off.

a5:

---

q6: Two facilities handoffs (to identity governance and to finance) carry leftover notes saying "target NULL until X is modularized", a phrasing the project has since rescinded. Should I clear those two notes? (yes/no)

Recommended: yes. The phrasing is explicitly forbidden now, so clearing it is the correct fix. Clearing a non-empty note is a destructive write, so it needs your confirmation.

a6:

---

q7: Floor-plan trigger events (created and updated) sit on a floor-plans object that is actually mastered by the real-estate domain. Which audit should own those events going forward?

- a) Leave them under this workplace audit, since they touch a workplace handoff.
- b) Hand their ownership to the real-estate audit.

Recommended: a. The events feed a workplace handoff today, so keeping them here is the simpler default. No data change is required either way; this is purely a tracking decision so future audits know who owns these events.

a7:

---

q11: Core Financial Management forwards workplace service request to Workplace and Space Management to prepare chargeback invoices, but Workplace and Space Management does not yet have anyone assigned to prepare chargeback invoices, so this step has no owner. How should it be handled?
- a) Record it now as work Workplace and Space Management owns, and assign a named owner once Workplace and Space Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Workplace and Space Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a11:

---

## Optional (will not hold up the build)

q8: Flagship workplace platforms model several extra workplace objects that this domain does not yet capture (employee or team move and relocation orders, parking-spot reservations, wayfinding and signage routing records, and raw occupancy-sensor readings). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. If move orders or parking reservations are added, each may also deserve its own module rather than overloading desk booking.

a8:

---

q9: Should I research and add the compliance frameworks that apply to the workplace (workplace safety, employee data protection for booking and sensor data, state privacy, and local building and fire codes)? (yes/no)

Recommended: yes, pending a verification pass. The domain has no compliance tags today. Additive and non-blocking.

a9:

---

q10: A building-management-system market (HVAC control, BACnet and Modbus device integration, occupancy-sensor ingestion, fault detection) sits adjacent to this domain. Should I queue it as a candidate new domain? (yes/no)

Recommended: yes, queue it for review. If it becomes its own domain, the raw occupancy-sensor readings from q8 likely belong there rather than here. Non-blocking.

a10:

---

<!-- agent map, ignore: q1=B2-SPLIT q2=B2-CAP q3=B2-FLAGS.deskbooking q4=B2-FLAGS.roomreservation q5=B2-FLAGS.servicerequest q6=B1A-N15 q7=B2-FLOOR q8=B3-MOVE-ORDERS+B3-PARKING+B3-WAYFINDING+B3-OCC-SENSORS+B3-MODULAR q9=B3-COMPLIANCE q10=B3-BMS q11=B2-B9D-OWN-1371 | domain_id=23 -->
