# Fleet Management (FLEET-MGMT): questions waiting for you

## What this domain is
Run your whole fleet from one place: every vehicle, every driver, and every fuel dollar, with DOT and IFTA compliance built in.

Track each vehicle from acquisition through every assignment, repair, and resale; put the right driver in the right vehicle and keep licenses, medical cards, and inspections current; watch fuel and charging spend and turn mileage and fuel data into the DOT, IFTA, and IRP filings auditors ask for.

Your last answers settled the driver-mastering shape, the personal-data flags, the event categories, the motor-pool placement, and the catalog copy. Five items you turned into questions or requests are below.

---

q1: (answer this first) Vehicle inspections overlap with the telematics domain's DVIR work. You asked whether embedded master would be more flexible. It is the standalone-deployable option, but there is a real trade-off. How should `vehicle_inspections` be scoped?

- a) Keep both DVIR (driver pre/post-trip) and PMI (mechanic periodic) unified here with a kind discriminator.
- b) Embedded master: Fleet keeps a local inspection shell that defers to a Telematics-owned DVIR master when both are deployed (most flexible; lets Fleet and Telematics deploy independently).
- c) Split DVIR out to Telematics, keep PMI here.

Recommended: a or b. Fleetio, the pure-play fleet-ops/maintenance specialist, packages DVIR and PMI as one inspection record that flows into work orders, which backs (a). The telematics/ELD vendors (Motive with the strongest DVIR posture, plus Samsara, Geotab, Verizon Connect) emit DVIR inside the driver app but never own mechanic PMI, so a full move to Telematics (c) has no vendor backing. If you want Fleet and Telematics to be independently deployable, (b) embedded master is the flexible answer you were reaching for; if you want the simplest single record, (a). This is coordinated with the telematics audit.

a1:

---

q2: The legacy fleet skill carries a "sign document" e-signature tool with no recorded reason. You asked what it does. It would serve one of two real fleet workflows: driver onboarding paperwork (W-4, I-9, CDL attestation) or vehicle purchase/lease/title documents. Both are genuine; the tool just has no module home today. Which workflow keeps it?

- a) Driver onboarding paperwork (re-home to driver operations).
- b) Vehicle purchase, lease, and title documents (re-home to vehicle lifecycle).
- c) Both workflows are real (keep it on both).
- d) Drop it as vestigial.

Recommended: keep it only if a real workflow uses it; if neither is in scope, drop it cleanly. Decide which so the tool is either justified to a module or removed.

a2:

---

q3: You asked what the HR-to-fleet driver-lifecycle handoffs do. Today driver records are created and closed by hand in the fleet product. Modeling these handoffs would auto-activate a driver (and their hours-of-service eligibility) when HR marks them hired, and auto-deactivate on separation. The separation direction is regulator-relevant: hours-of-service must stop when a driver is terminated. Should the catalog model them?

- a) Yes, both directions (hire activates, separation deactivates).
- b) Only the termination direction (the regulator-relevant half).
- c) No, driver-record creation stays manual.

Recommended: a. Auto-deactivating hours-of-service on separation is the regulator-relevant win, and the hire direction removes manual driver setup. This also creates owed work on the HR side and sets the hire/separate gate verbs the driver state machine needs.

a3:

---

q4: You asked whether regulations can be optional so EU operators do not import US rules and vice versa. Yes, they can: each regulation link carries its own applicability, so a tenant only imports what applies to its jurisdiction. On that basis, which set should Fleet carry?

- a) Floor plus stretch, all conditional: FMCSA 391/395/396, IFTA, IRP, FMCSA Clearinghouse (US), plus GASB 87, SOX, EU Mobility Package, ADR, Eurovignette (EU/other), each applied only where it applies.
- b) Floor required, stretch conditional.
- c) Floor only.

Recommended: a. With per-region applicability, the full floor-plus-stretch set is the most complete and costs nothing to US-only or EU-only tenants, since they import only their own. A US carrier never sees the EU Mobility Package, and an EU operator never sees FMCSA/IFTA/IRP.

a4:

---

q5: Which vendor-synonym aliases should I load for the five core records? Bulk alias loads are best curated, so pick the ones you actually want canonicalized:

- `fleet_vehicles` -> Asset / Unit / Truck / Power Unit / Tractor
- `fleet_drivers` -> Operator / CDL Holder
- `fuel_transactions` -> Fuel Card Posting / Fueling Event / Charge Session (EV)
- `fleet_assignments` -> Vehicle Assignment / Dispatch / Driver Pairing
- `vehicle_inspections` -> DVIR / Pre-Trip / Walkaround

Recommended: load a curated subset you pick per record (tell me which), rather than all 10-15.

a5:

---

## Optional (will not hold up the build)

q6: Deeper fleet records show up across the flagship vendors but are not modeled yet (driver qualification files, FMCSA clearinghouse queries, vehicle registrations, IFTA quarterly returns, insurance policies, fuel cards, telematics devices, parking/toll citations, lease agreements, driver messaging, accident reports). Research and add the ones that hold up? (yes/no)

Recommended: yes, additive and after the build. A couple (driver messaging, accidents) want an ownership check first (possible TMS / Telematics / Insurance-Claims routing).

a6:

---

q7: Three adjacent markets recur in the fleet handoffs: a Transportation Management System, EV Charging Infrastructure Management, and Freight Audit and Payment. Research and stand these up as their own domains rather than stretching Fleet to cover them? (yes/no)

Recommended: yes, as separate domains (each is a distinct buyer market, already queued). Each goes through its own research and review before it is built. Non-blocking.

a7:

---

<!-- agent map, ignore: q1=B2-VEHICLE-INSPECTIONS-DVIR q2=B2-SIGN-DOCUMENT q3=B2-HCM-DRIVER-LIFECYCLE q4=B2-REGULATION-SCOPE q5=B2-ALIASES q6=B3-DEEPER-FLEET-ENTITIES q7=B3-ADJACENT-DOMAINS | domain_id=147 -->
