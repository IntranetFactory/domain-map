# Towing & Recovery Management (TOW-MGMT): questions waiting for you

## What this domain is

Software for towing companies and impound-lot operators: take the call, dispatch a truck, recover the vehicle, and run the storage yard it lands in. It covers the regulated part too, sending the legally-required notices to the vehicle's owner and lienholder, tracking statutory deadlines, and disposing of unclaimed vehicles at auction. The buyer is a tow operator, a private-property-impound company, or a municipal / police impound lot, not a fleet owner.

This domain does not exist in the catalog yet. These decisions settle its shape before anything is built.

---

q1: (answer this first) The market you named is "Auto Towing AND Impound Lot Trackers". Should impound-lot management be a module inside one Towing & Recovery Management domain, or its own separate domain?

- a) One domain, impound-lot management as a module inside it.
- b) Two separate domains: towing/recovery, and a standalone impound domain.

Recommended: a. Towbook, TRAXERO/Autura (TOPS, Dispatch Anywhere), and ProTow all bundle dispatch, impound, and private-property-impound in a single product: a towed vehicle simply becomes an impound record on the same job. VTS Systems leans impound-yard-first but still ships dispatch. No mainstream pure-play impound-only vendor (with no towing surface) exists, so impound is not a standalone market. The one flagship that sells a non-towing product is Auto Data Direct (ADD123), and that product is lien-notice compliance, not impound operations. This is the gate decision: module count, masters, and skills all hang off it.

a1:

---

q2: How many modules should the domain have? Four modules with a dedicated lien/title compliance module, or three by folding lien into impound?

- a) Four modules: Dispatch, Impound, Lien/Compliance, Billing.
- b) Three modules: fold lien into impound.

Recommended: a. Auto Data Direct (ADD123) and TRAXERO's TowLien sell lien / notice / title compliance as a standalone product (ADD123 has no dispatch tool at all), so the slice has its own market. The statutory notice surface is heavy enough to stand alone: owner and lienholder lookups, DPPA permissible-use logging, per-state notice deadlines, certified-mail service records, title transfers, and NMVTIS reporting. Folding it into impound would bury a regulated workflow that one of the five flagships sells on its own.

a2:

---

q3: Should vehicle repossession be in scope for this domain, or kept out as a separate domain? Tow trucks do haul repossessed vehicles, so the operational overlap is real.

- a) Out of scope; open it later as a separate repossession domain.
- b) Include repossession in Towing & Recovery Management.

Recommended: a. Repossession runs on distinct lender and forwarder platforms (Recovery Database Network / Clearplan / Cleardata, MVTRAC, MVConnect) sold to lenders, forwarders, and licensed repo agents under UCC Article 9 and the FDCPA plus state repo licensing, not the abandoned-vehicle statutes that govern towing. No flagship towing vendor (Towbook, TRAXERO/Autura, VTS, ProTow) masters repossession assignments. The skid-tow overlap is operational, not a shared data model, so the markets and buyers are different.

a3:

---

q4: Should the domain master its own customer/account records, or read them from the CRM domain?

- a) Master them locally as an embedded copy, deferring to CRM when a CRM is also deployed.
- b) Read them from CRM only (no local master).

Recommended: a. Every flagship (Towbook, TRAXERO/Autura, VTS, ProTow) ships its own customer/account book as a first-class record because tow operators rarely run a separate CRM. The dominant "customer" is the motor club (AAA, Agero, Allstate, Urgent.ly), a towing-specific dispatch and billing partner with no CRM analogue. An embedded master keeps the domain deployable on its own while still deferring to the canonical CRM record when both are installed.

a4:

---

q5: Should the domain master tow trucks itself, or reference the vehicle from Fleet Management? A towing company's trucks are a vehicle fleet, so Fleet Maintenance could plausibly own the asset.

- a) Master tow trucks locally, with an optional link to Fleet Management for shops that run it.
- b) Read the vehicle asset from Fleet Management.

Recommended: a. Every towing flagship (Towbook, TRAXERO/Autura, VTS, ProTow) masters the tow truck in-product because it is operationally distinct: boom / wheel-lift / rotator / flatbed class, WreckMaster/NSD certification, and live GPS dispatch state that a generic fleet vehicle record does not carry. A towing operator that also runs Fleet Maintenance can keep a reference link for maintenance, but the operational dispatch record stays local.

a5:

---

q6: Which regulations should be tagged onto the domain once the upstream regulation records are seeded? (None of them exist in the catalog yet.)

- a) Floor set only: per-state tow-lien statutes (as a family), DPPA owner-lookup rules, state private-property-impound signage rules, state maximum tow/storage rate caps, and law-enforcement rotation-tow reporting.
- b) Floor set plus a stretch set carried as conditional applicability: NMVTIS disposal reporting, and (only if repossession is ever in scope) UCC Article 9 and the FDCPA.
- c) Custom; you pick per regulation.

Recommended: b. The compliance specialists encode exactly the floor set: Auto Data Direct (ADD123) and TRAXERO's TowLien automate per-state notice deadlines, certified-mail service, DPPA-gated owner lookups, and title/NMVTIS transfer, while the dispatch flagships (Towbook, ProTow) enforce state max-rate caps and impound signage/consent. The floor reflects what these vendors build their compliance engines around; the stretch rounds out NMVTIS and the repo-adjacent statutes for completeness. These can be optional applicability so a single-state operator does not import statutes from other states.

a6:

---

## Optional (will not hold up the build)

q7: If repossession stays out of this domain (q3), should I register Vehicle Repossession Management as a new-domain research candidate? (yes/no)

Recommended: yes, as a research candidate only. The vendor set (Recovery Database Network / Clearplan, MVTRAC, MVConnect, Cleardata) passes the point-solution-market test, but whether to actually stand it up is a separate, non-blocking decision.

a7:

---

<!-- agent map, ignore: q1=B2-IMPOUND-MODULE-VS-DOMAIN q2=B2-LIEN-MODULE-COUNT q3=B2-REPO-SCOPE q4=B2-CUSTOMER-MASTER q5=B2-TRUCK-MASTER q6=B2-REGULATION-SCOPE q7=B3-REPO-DOMAIN | domain_id=pending -->
