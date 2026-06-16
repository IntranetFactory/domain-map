# Marina Management (MARINA-MGMT): questions waiting for you

## What this domain is
Run your marina end to end: assign slips and storage, take reservations, bill boaters and meter utilities, schedule the boatyard, and sell fuel, all in one place. It maps your docks, slips, moorings, and racks; takes transient and seasonal bookings with a waitlist; keeps boater and vessel records with insurance and registration on file; bills on recurring contracts with metered electric and water; runs haul-outs, launches, and boatyard work orders; and operates the fuel dock and ship store. Built as six modules from a 5-vendor market survey (Dockwa, Molo, DockMaster, Marina Master, MarinaOffice). Everything below is loaded and unapproved, awaiting your review.

---

q1: (answer this first) How should Marina Management be split into modules?

- a) Keep the 6 modules as built: Slip & Storage Inventory, Reservations, Boater & Vessel CRM, Contracts & Billing, Boatyard Service, and Fuel Dock & Ship Store.
- b) 7 modules: split the Fuel Dock apart from the Ship Store / retail point of sale.
- c) 8 modules: add a Gate Access & Security module and a Yacht-Club Membership module.

Recommended: a. All five flagships present marina operations as one integrated product whose core pillars are inventory, reservations, billing, and service. Molo, DockMaster, and MarinaOffice couple fuel and store POS tightly at the dock (MarinaOffice's PureFuel runs fuel and register together), so the combined Fuel-Retail module matches practice; gate access and yacht-club membership are bundled only by Marina Master and MarinaOffice and read as add-ons, better as optional later modules than as core. This is the gate question: it decides where every entity lands and unlocks the per-area decisions below.

a1:

---

q2: Should the boatyard (work orders, estimates, haul-out, launch, pump-out) stay a module inside Marina Management, or become its own domain?

- a) Keep it as the Boatyard Service module inside Marina Management.
- b) Split a separate marine-service domain that Marina Management consumes.

Recommended: a. Molo, Marina Master, and MarinaOffice bundle work orders, haul-out, and launch inside the marina product; only DockMaster treats service as a near-equal ERP pillar, and even then within one suite. Keeping it a standalone-deployable module preserves the service-yard story without fragmenting the domain. Pick (b) only if a pure third-party boatyard market, independent of marinas, is in scope.

a2:

---

q3: Should the fuel dock and ship-store point of sale be mastered here, or consumed from a generic retail/POS system?

- a) Master fuel and POS here: fuel sales, fuel tanks, fuel-inventory reconciliation, and ship-store sales.
- b) Master only fuel-dock specifics here; consume generic store POS from a retail domain.
- c) Consume both fuel and POS from external systems.

Recommended: a. Molo, DockMaster, Marina Master, and MarinaOffice all run fuel and store POS natively (MarinaOffice's PureFuel is a flagship differentiator), and marine fuel carries dock-specific tank reconciliation and pay-at-pump that generic retail POS does not model. Only Dockwa is light here. Choose (b) only if a tenant already runs a separate retail system you must defer to.

a3:

---

q4: Should the boater-facing transient-booking marketplace be its own surface, or do we keep reservations operator-side only?

- a) Keep one operator-side Reservations module (current).
- b) Add a separate transient-marketplace module.
- c) Treat the boater marketplace as a separate marine-travel domain.

Recommended: a. Dockwa and Snag-A-Slip are marketplace-first (a boater app plus cross-marina discovery), but Molo, DockMaster, Marina Master, and MarinaOffice model reservations operator-side only. The marketplace is a distribution channel layered on operator reservations, not a distinct operator capability; defer unless an aggregator or marketplace is actually the product you are building.

a4:

---

q5: Should boaters and vessels stay a marina-local record, or be promoted to a shared master other domains can consume?

- a) Keep boaters and vessels mastered locally in the Boater & Vessel CRM module (current).
- b) Promote boaters and vessels to a shared master.

Recommended: a. Every flagship (Dockwa, Molo, DockMaster, Marina Master, MarinaOffice) masters boaters and vessels inside the marina product, and no adjacent loaded domain needs to consume them. Marina-local mastering matches vendor reality and the self-contained build; promote only if a sibling marine domain later needs the same records.

a5:

---

q6: Is boat sales / dealership in scope for Marina Management?

- a) Out of scope: keep it to a separate boat-dealer domain (current).
- b) Add a thin in-scope dealership module.

Recommended: a. Only DockMaster bundles boat-sales deals and dealership inventory; Dockwa, Molo, Marina Master, and MarinaOffice do not. Boat retail and dealer management is a distinct market with its own inventory, F&I, and manufacturer-flooring concerns, better modeled as its own domain than as a marina module.

a6:

---

q7: Can the agent confirm the entity-type classifications, so the right entities get workflow state machines and the rest stay as plain records, config, or links?

- a) Confirm: the 9 workflow entities (slips, reservations, waitlist, contracts, dockage invoices, work orders, estimates, haul-outs, dry-stack launches) carry lifecycle states; meters, readings, boaters, vessels, registrations, and fuel/store records stay records; slip-size classes are config; slip assignments are a link table.
- b) Change one or more, and name which.

Recommended: a. Each of the nine carries an observable workflow (a reservation moves inquiry to confirmed to checked-in to checked-out; a contract goes draft to active to expired), while meters, registrations, and fuel tickets are static records. As part of this build the shared "utility meters" entity was reclassified from a workflow to a record (it had been mis-set as a workflow with no states, a gap predating this load); say so if you would rather meters carry a lifecycle.

a7:

---

q8: How should the buyer-voice catalog copy (the domain plus all six module taglines and descriptions) be produced?

- a) Agent drafted all of it and you approve the wording.
- b) You supply the exact wording.
- c) Have marketing rewrite it from the analyst descriptions.

Recommended: a. The fields are filled today but carry the unapproved (new) review signal; letting the agent draft and you approve is the fastest path to sign-off, and once approved the copy is protected from silent overwrite.

a8:

---

## Optional (will not hold up the build)

q9: Phase 0 surfaced several vendor-common entities trimmed from the initial build. Should the agent research and add the ones that hold up, after the module shape is settled? (yes/no)

- Gate access control: gate credentials and access-event logs (Molo, DockMaster, Marina Master, MarinaOffice), which would seed the optional Access module if you pick q1 option c.
- Compliance docs: SPCC spill-prevention plans, liveaboard permits, and voluntary Clean Marina certifications (jurisdiction-conditional).
- Boatyard depth: service technicians, parts inventory, and labor time entries (Molo, DockMaster, MarinaOffice).
- E-signature records on contracts (the build links a sign-document tool but stores no signature record).
- Dock-walk logs and vessel-movement audit trails (DockMaster, Marina Master, MarinaOffice).
- Peripheral records: ship-store product catalog, individual fuel dispensers, and a boater messaging inbox.

Recommended: yes, but additive and after the q1 module shape is settled. Gate access and the boatyard-depth entities are the most load-bearing if you run a full-service yard or controlled-access docks; the compliance docs matter only in regulated or grant-funded marinas; the rest are convenience records.

a9:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-BOATYARD-SVC-SCOPE q3=B2-FUEL-POS-SCOPE q4=B2-TRANSIENT-MARKETPLACE q5=B2-CRM-OWNERSHIP q6=B2-BOAT-DEALER-SCOPE q7=B2-ENTITY-TYPE-CONFIRM q8=B2-CATALOG-COPY q9=B3-ACCESS-CONTROL+B3-COMPLIANCE-DOCS+B3-BOATYARD-DEPTH+B3-ESIGNATURE+B3-DOCK-WALK-MOVEMENTS+B3-PERIPHERAL-RECORDS | domain_id=183 -->
