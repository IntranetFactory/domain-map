# Fleet Management (FLEET-MGMT): questions waiting for you

## What this domain is
Run your whole fleet from one place: every vehicle, every driver, and every fuel dollar, with DOT and IFTA compliance built in.

Know what you own and how hard it works. Track each vehicle from the day you acquire it through every assignment, repair, and resale, and see at a glance which units earn their keep and which are costing you money. Put the right driver in the right vehicle, keep licenses and medical cards current, and stay on top of pre-trip and post-trip inspections so nothing rolls out unsafe. Watch fuel and charging spend in real time, catch exceptions before they add up, and turn raw mileage and fuel data into the DOT, IFTA, and IRP filings auditors ask for. Whether you run delivery vans, service trucks, or heavy rigs, you get one clear view of cost, safety, and compliance across the entire fleet.

---

q1: (answer this first) How should drivers be mastered relative to your HR system?

- a) Keep the current shape: Fleet Management owns the driver record and also contributes to the shared employee record. This fits an operation with a meaningful population of contractors, owner-operators, and carriers who never sit in HR.
- b) Let HR own the person record, have Fleet Management hold a lightweight driver shell, and keep a smaller Fleet-Management-owned driver profile for the CDL, medical, and hours-of-service data.

Recommended: a. It matches the US trucking market, where a non-trivial share of drivers are contractors and owner-operators who never appear in HR. This choice cascades into where the driver-qualification-file and clearinghouse-query entities land, so settling it unblocks the rest.

a1:

---

q2: Which of the five core records should be treated as personal data?

- a) All five (vehicles, drivers, fuel transactions, assignments, inspections), the privacy-strict reading for EU and CCPA-exposed buyers.
- b) Three (drivers, inspections, assignments), treating vehicles and fuel transactions as operational-only.
- c) Some other split.

Recommended: b. Drivers, inspections (driver signatures and photos), and assignments (driver plus time and location) clearly carry personal data, while vehicles and fuel transactions are operational unless you want the strict personal-by-association reading.

a2:

---

q3: How should vehicle inspections be scoped, given the overlap with the telematics domain's DVIR work?

- a) Split driver pre/post-trip inspections (DVIR) out to telematics, and keep mechanic periodic inspections (PMI) here.
- b) Keep both kinds unified here with a kind discriminator.
- c) Move all inspections to telematics.

Recommended: b. Fleetio, the pure-play fleet-ops and maintenance specialist, packages both DVIR (driver pre/post-trip) and PMI (mechanic periodic) as one inspection record that flows into work orders, while the telematics and ELD vendors (Motive with the strongest DVIR posture, plus Samsara, Geotab, and Verizon Connect) emit DVIR inside the driver-app and ELD workflow but never own the mechanic PMI side, so option (c) has no vendor backing. Keeping both unified here with a kind discriminator mirrors the Fleetio specialist shape rather than carving DVIR out to telematics. This is a coordinated call with the telematics audit, so resolving it here also settles their open item.

a3:

---

q4: Six vehicle and driver lifecycle events currently carry a blank event category, which is not allowed. How should they be categorized?

- a) Set all six (vehicle acquired, assigned, reassigned, retired; driver hired, terminated) to "lifecycle".
- b) Use "lifecycle" for acquired, retired, hired, and terminated, and "state_change" for assigned and reassigned.
- c) Some other split.

Recommended: a. All six are canonical lifecycle transitions. Once you pick, the fix is one small update per event.

a4:

---

q5: The legacy fleet skill carries a "sign document" capability with no recorded reason. What workflow does it serve?

- a) Driver onboarding paperwork (keep it, tied to driver operations).
- b) Vehicle purchase, lease, and title documents (keep it, tied to vehicle lifecycle).
- c) Both workflows are real (keep it for both).
- d) None of the above, drop it as vestigial.

Recommended: keep it only if a real workflow uses it; otherwise drop it. Decide which workflow (if any) it belongs to so the tool is either justified or removed cleanly.

a5:

---

q6: Should the catalog model the HR-to-fleet driver-lifecycle handoffs (employee hired triggers driver activation, employee terminated triggers driver separation)?

- a) Yes, both directions.
- b) No, driver-record creation stays manual in the fleet product.
- c) Only the termination direction.

Recommended: a. Auto-deactivating hours-of-service on separation is regulator-relevant, so modeling both directions is worth it. This also creates owed work on the HR side.

a6:

---

q7: When the motor-pool reservation feature is built, where should it live?

- a) Embedded inside driver operations.
- b) As its own separate motor-pool sub-module.

Recommended: a. Embedding keeps the catalog lean. Picking (b) would raise the module count from three to four when the feature is authored.

a7:

---

q8: Which regulations should be tagged onto Fleet Management once the upstream regulation records are seeded?

- a) Floor set only: FMCSA Parts 391, 395, and 396, IFTA, IRP, and the FMCSA Drug-and-Alcohol Clearinghouse (required applicability).
- b) Floor set plus a stretch set carried as conditional applicability: GASB 87 lease accounting, SOX fixed-asset controls, EU Mobility Package, ADR dangerous goods, and Eurovignette.
- c) Custom, you pick per regulation.

Recommended: b. The floor set covers the mandatory US DOT and fuel-tax obligations, and the stretch set rounds out catalog completeness for lease accounting, public-company controls, and EU operators.

a8:

---

q9: Buyer-voice catalog copy (tagline and description) is now written for the domain and its three modules and is awaiting your sign-off. Do you approve the text as written? (yes/no)

Recommended: yes. The copy is workflow-and-value voice with no vendor names, and it sits at "new" awaiting only your approval. Answer no if you want it rewritten.

a9:

---

q10: Should vendor-synonym aliases be loaded for the five core records (for example Asset / Unit / Power Unit for vehicles, Operator / CDL Holder for drivers, DVIR / Pre-Trip for inspections)?

- a) Load all the enumerated options (roughly 10 to 15 aliases).
- b) Load a subset you pick per record.
- c) Defer.

Recommended: b. Bulk alias loads are best curated so you only canonicalize the vendor synonyms you actually want.

a10:

---

q13: Core Financial Management forwards fuel transaction to Fleet Management to process accounts payable (AP), but Fleet Management does not yet have anyone assigned to process accounts payable (AP), so this step has no owner. How should it be handled?
- a) Record it now as work Fleet Management owns, and assign a named owner once Fleet Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Fleet Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Core Financial Management forwards vehicle to Fleet Management to process and record fixed-asset additions and retires, but Fleet Management does not yet have anyone assigned to process and record fixed-asset additions and retires, so this step has no owner. How should it be handled?
- a) Record it now as work Fleet Management owns, and assign a named owner once Fleet Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Fleet Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: Fleet Maintenance Management forwards vehicle inspection to Fleet Management to manage asset maintenance, but Fleet Management does not yet have anyone assigned to manage asset maintenance, so this step has no owner. How should it be handled?
- a) Record it now as work Fleet Management owns, and assign a named owner once Fleet Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Fleet Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: Vehicle Telematics forwards vehicle to Fleet Management to analyze assets and predict maintenance requirements, but Fleet Management does not yet have anyone assigned to analyze assets and predict maintenance requirements, so this step has no owner. How should it be handled?
- a) Record it now as work Fleet Management owns, and assign a named owner once Fleet Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Fleet Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

q17: Field Service Management forwards fleet assignment to Fleet Management to manage transportation fleet, but Fleet Management does not yet have anyone assigned to manage transportation fleet, so this step has no owner. How should it be handled?
- a) Record it now as work Fleet Management owns, and assign a named owner once Fleet Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Fleet Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

## Optional (will not hold up the build)

q11: Several deeper fleet records show up across the flagship vendors but are not modeled yet (driver qualification files, FMCSA clearinghouse queries, vehicle registrations, IFTA quarterly returns, vehicle insurance policies, fuel cards, vehicle telematics devices, parking and toll citations, vehicle lease agreements, driver-app messaging, accident and incident reports). Should I research these and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the build. Most are well-supported by the vendor set, though a couple (driver messaging, accidents) want an ownership check first.

a11:

---

q12: Three adjacent markets keep surfacing in the fleet handoffs (a Transportation Management System, EV Charging Infrastructure Management, and Freight Audit and Payment). Should I research and stand these up as their own domains rather than stretching Fleet Management to cover them? (yes/no)

Recommended: yes, as separate domains. Flagship vendors treat each as a distinct buyer market, and all three are already queued as domain candidates. Additive and non-blocking.

a12:

---

<!-- agent map, ignore: q1=B2-DRIVERS-VS-EMPLOYEES q2=B2-PATTERN-FLAGS q3=B2-VEHICLE-INSPECTIONS-DVIR q4=B2-EVENT-CATEGORIES q5=B2-SIGN-DOCUMENT q6=B2-HCM-DRIVER-LIFECYCLE q7=B2-MOTOR-POOL q8=B2-REGULATION-SCOPE q9=B2-CATALOG-COPY q10=B2-ALIASES q11=B3-DRIVER-QUALIFICATION-FILES+B3-DRIVER-CLEARINGHOUSE-QUERIES+B3-VEHICLE-REGISTRATIONS+B3-IFTA-QUARTERLY-RETURNS+B3-VEHICLE-INSURANCE-POLICIES+B3-FUEL-CARDS+B3-VEHICLE-TELEMATICS-DEVICES-OWNERSHIP+B3-PARKING-TOLL-ASSIGNMENTS+B3-VEHICLE-LEASE-AGREEMENTS+B3-DRIVER-MESSAGES+B3-ACCIDENTS q12=B3-TMS+B3-EV-CHARGING-MGMT+B3-FREIGHT-AUDIT q13=B2-B9D-OWN-315 q14=B2-B9D-OWN-1389 q15=B2-B9D-OWN-352 q16=B2-B9D-OWN-1543 q17=B2-B9D-OWN-862 | domain_id=147 -->
