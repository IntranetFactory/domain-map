# Workplace Experience and Workspace Booking (WORKPLACE-EXP): questions waiting for you

## What this domain is

Give employees one app to plan and run their day in a hybrid office: book a desk, room, parking spot or piece of equipment, see who from their team is coming in and pick a day to match, check in on arrival, find their way to the right neighborhood, and stay inside the company's return-to-office rules, while the workplace team gets occupancy analytics out the back.

This is a NEW domain, just promoted from the candidate queue. You confirmed it should be a third sub-domain of REAL-EST alongside IWMS and CAFM. Nothing is loaded yet, and it has to coexist with IWMS, which already owns the underlying desk/room booking and floor-plan/occupancy records. These four questions decide its shape; once you answer (rename this file to `a-WORKPLACE-EXP.md`), I run the build (Phase 0 vendor research is already done at `.tmp_deploy/WORKPLACE-EXP-phase0-2026-06-19.md`).

---

q1: Who owns the actual booking records? (answer this first)

- a) WEX is the employee front-end over IWMS: it embeds IWMS's existing `desk_bookings` and `room_reservations` (IWMS stays the single master).
- b) WEX re-masters bookings, demoting IWMS to an embedded copy.

Recommended: a. IWMS already masters `desk_bookings` (590) and `room_reservations` (591), and the single-master rule forbids a second master, so option b is a destructive demotion of an existing domain. The vendor topology supports embed: Eptura's Engage employee app is exactly an employee front-end over an IWMS booking core, which option a mirrors. Robin/Kadence/Tactic are the booking system of record in a greenfield WEX-led deployment, but in this catalog IWMS already owns bookings, and WEX still masters everything around them (check-ins, amenity/parking/locker bookings, booking rules, neighborhoods) plus the entire attendance-coordination layer, so it is not a thin viewer. Option b only makes sense if you want WEX to supersede IWMS as the booking owner, which cuts against making it a sub-domain of REAL-EST.

a1:

---

q2: How many modules should WORKPLACE-EXP ship as?

- a) Two modules: space booking (desk/room/amenity reservation, resource types, booking rules, check-ins, neighborhoods) and attendance coordination (hybrid attendance, RTO policy, team presence, wayfinding, occupancy analytics).
- b) One combined module.

Recommended: a. The pure-plays productize two separable surfaces: space booking is Robin's and Tactic's core, while attendance coordination ("who's in," AI nudges, RTO rules) is Kadence's center of gravity and a strong Robin/Tactic surface. Both modules carry their own net-new masters (space booking masters amenity bookings, resource types, booking rules, check-ins and neighborhoods even though it embeds IWMS's desk/room bookings; attendance coordination masters the attendance/coworking/wayfinding set), so the two-module split is real and clears the minimum-master floor. A single combined module (option b) is fine for a thin first release but loses the deployability split the vendors sell.

a2:

---

q3: Should WEX run its own workplace communications, or use the comms domains we already have?

- a) Consume INTRANET / EMP-EXP and fire notifications through the shared notify abstraction; WEX masters no communications surface.
- b) WEX masters its own `office_announcements` (workplace-scoped messaging, e.g. closures and capacity changes).

Recommended: a. Robin/Kadence/Tactic carry only light in-app announcements, and employee communications is already owned in this catalog by INTRANET (targeted employee comms), EMP-EXP (engagement), and FRONTLINE-COMMS (deskless broadcast). Option a keeps WEX a workplace-operations app that sends notifications through the shared abstraction and defers messaging to those domains, avoiding a fourth overlapping comms surface. Option b only pays off if WEX must own building-scoped announcements (closures, capacity changes) that the comms domains will not carry.

a3:

---

q4: Which business function owns WORKPLACE-EXP?

- a) Facilities and Real Estate (owner), with HR and IT as contributors.
- b) HR / People (owner), with Facilities and IT as contributors.

Recommended: a. WEX has a split buyer: the booking/space surface is bought by Facilities/Workplace teams (Robin, Tactic, Eptura position there), while the hybrid-attendance/RTO surface is increasingly bought by HR/People Ops (Kadence positions to people leaders). As a sub-domain of REAL-EST, Facilities owner is structurally consistent and matches the space-management spine, with HR contributing the attendance/RTO layer. Option b (HR owner) fits orgs where return-to-office is an HR mandate but understates the real-estate nature that anchors WEX under REAL-EST.

a4:

---

<!-- agent map, ignore: q1=B2-WEX-BOOKING-OWNERSHIP q2=B2-WEX-MODULES q3=B2-WEX-COMMS-BOUNDARY q4=B2-WEX-OWNER-FN | domain_id=new (unbuilt) | phase0=.tmp_deploy/WORKPLACE-EXP-phase0-2026-06-19.md -->
