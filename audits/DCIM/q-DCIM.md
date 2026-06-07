# Data Center Infrastructure Management (DCIM): questions waiting for you

## What this domain is
Track and run the physical layer of the data center: racks and cabinets, power distribution and UPS, cooling, environmental sensors, capacity plans, and the port and cable connections that wire it all together. It gives infrastructure and facilities teams one place to see what is installed where, how much power and cooling each area draws, and when a rack, circuit, or sensor crosses a threshold. The masters exist, but the domain has not been built into modules yet, so the questions below shape that build.

---

q1: (answer this first) How should Data Center Infrastructure Management be split into modules (the sub-areas of the product)?

- a) Three modules: DCIM-ASSET-CAPACITY (racks, cabinets, port and cable connections, capacity plans), DCIM-POWER-COOLING (PDUs, power circuits, UPSes, cooling units, environmental readings), plus an optional DCIM-FLOORPLAN-SITE starter.
- b) Two modules: DCIM-PHYSICAL plus DCIM-POWER-COOLING.
- c) One full module plus one starter: DCIM-CORE plus DCIM-LITE.
- d) A different split (please specify).

Recommended: a. The three-module split lines up with the floor-plan and site research below, and keeps each area small enough to own cleanly. This choice gates every other build item (capabilities, roles, lifecycle states, module wiring on the handoffs), so it unlocks the rest of the build.

a1:

---

q2: Which of the seven proposed capability codes should land, and should capacity planning fold into the existing cross-cutting capability rather than getting its own code?

- a) All seven new (DCIM-ASSET-REGISTER, DCIM-CAPACITY-PLAN, DCIM-POWER-MGMT, DCIM-COOLING-MGMT, DCIM-CONNECTIVITY-MAP, DCIM-ENV-MONITORING, DCIM-FLOOR-PLAN).
- b) Six new, with capacity planning folding into the existing cross-cutting ITOM-CAPACITY capability via a link instead of a new DCIM-CAPACITY-PLAN code.
- c) Fewer (specify which).

Recommended: b. Folding capacity into the existing cross-cutting capability avoids a duplicate, and the build needs at least three capabilities either way. Low stakes, but the fold-in needs your explicit confirmation.

a2:

---

q3: Currently an environmental-reading threshold breach is published only to IT operations. Should it also fan out a second notice to the incident-management area for major-incident triggering?

- a) Fan out from DCIM: add a new handoff to incident management.
- b) Leave it to IT operations to correlate and re-publish.
- c) Defer.

Recommended: a. An environmental threshold breach is a plausible major-incident trigger, and adding the handoff at DCIM is cheaper than waiting on an IT operations correlator that may not exist. Pick (b) if you want to keep a single source for the event.

a3:

---

## Optional (will not hold up the build)

q4: Six extra entities show up across the flagship DCIM vendors (floor plans, sites or data halls, change requests for rack moves and power changes, reserved power-budget allocations, audit trails for SOC 2 evidence, and discovery scans). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Floor plans and sites in particular would reinforce the three-module split in q1; the rest still want a verification pass first.

a4:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-CAPABILITY-SET q3=B2-ENV-READING-FAN-OUT q4=B3-FLOOR-PLANS+B3-SITES+B3-CHANGE-REQUESTS+B3-POWER-RESERVATIONS+B3-AUDIT-TRAILS+B3-DISCOVERY-SCANS | domain_id=84 -->
