# Utility Operations (UTIL-OPS): questions waiting for you

## What this domain is
Run meter-to-cash, outage response, and field work for electric, gas, and water utilities from one operational backbone.

This is the operational core for a utility provider: open and manage customer accounts, install and read meters, validate consumption and produce bills, declare and restore outages, and dispatch the field crews and service orders that keep the network running. The eight things it tracks today (customer accounts, meters, meter reads, service connections, network assets, outage events, service orders, and bills) span customer billing, advanced metering, asset and work management, and outage management.

---

q1: (answer this first) Is Utility Operations the right single domain, or should the queued utility markets become separate domains that absorb its data?

- a) Keep Utility Operations as the umbrella and build it into four modules: meter-to-cash (customer accounts, meters, reads, service connections, bills), outage management (outage events), work and asset management (assets, service orders), and optionally a separate metering operations module.
- b) Demote Utility Operations to a leadership-tier landing domain (no data of its own, just cross-domain utility KPIs like SAIDI and SAIFI), and promote four separate domains that take the data over: a utility customer information system, advanced metering and meter data management, an outage management system, and utility work and asset management.
- c) Hybrid: keep Utility Operations but pull only the customer information system out as its own domain.

Recommended: a. Oracle Utilities ships exactly these four as one suite (Customer Care and Billing, the NMS outage front office, Work and Asset Management, and Opower), and Schneider Electric ArcFM / EcoStruxure ADMS treats outage, distribution control, and asset-network as distinct modules, so the four-module umbrella maps onto how the broadest utility vendors package meter-to-cash, outage, and work-and-asset together; the promote path (b) only pays off if you confirm each is bought as a standalone product in its own right. This choice drives the entire build, every module assignment, and whether the optional candidates below even apply, so it unlocks the rest of the build.

a1:

---

q2: Which of the eight tracked records should be flagged as carrying personal data (GDPR)?

- a) Four of eight: customer accounts, meter reads, service connections, and bills (the records that obviously identify a customer).
- b) All eight (the conservative reading: meter serials are personal-by-association under EU smart-meter case law, assets carry crew names, outage events carry affected-customer lists, and service orders carry customer identifiers).
- c) A different subset you specify.

Recommended: a. The four customer-facing records are clearly personal data; the other four are device, equipment, or event shaped where the personal-by-association argument is weaker. Pick (b) if you want the conservative GDPR posture. This flips a current value, so it needs your sign-off.

a2:

---

q3: The outage-to-customer-service handoff carries the outage record as its payload, but a separate relationship says an outage opens a customer case. Which shape do we keep?

- a) Keep the handoff carrying the outage record (customer service consumes the outage and creates its own case on its side).
- b) Change the handoff to carry the customer case instead.
- c) Add a second handoff so both shapes coexist.

Recommended: a. Letting customer service own its own case creation keeps each domain responsible for its own records and matches how the existing relationship is already modeled.

a3:

---

q4: Does Utility Operations really send raw meter reads to the finance system, or only the posted bill?

- a) Delete the raw-meter-reads-to-finance handoff (raw reads should flow into metering and billing, and finance should only receive the posted bill).
- b) Repoint it to a future advanced-metering / meter-data-management domain, if that domain gets promoted in q1.
- c) Keep it as is.

Recommended: a, unless q1 lands on promoting a separate metering domain, in which case (b). In flagship architectures finance receives only the billed amount, not raw AMI data, so this handoff looks like a modeling error. Option (a) deletes a row, so it needs your sign-off.

a4:

---

q5: The "asset failed" event currently fires two handoffs at once: one to field service (to dispatch a crew) and one to IT service management (to open an IT incident). Is that real, or cross-wiring?

- a) Keep both: declare it a real fan-out where an asset failure has both an operational-technology response and an IT response.
- b) Remove the IT-incident handoff and route asset failure only to field service (the operational path).
- c) Split the trigger into two distinct events, one for operational-technology asset failure and one for IT asset failure, so each routes cleanly.

Recommended: c. Utility network assets (substations, feeders, transformers) belong on the operational dispatch path, while IT incidents are for IT systems; splitting the trigger fixes the cross-wiring without losing either path. Options (b) and (c) change existing wiring, so they need your sign-off.

a5:

---

q6: The four clean responsibility (RACI) rows are authored, but a proposed Engineering / Asset Management contributor has no clean match in the standard 20-function list. How should it be handled?

- a) Map it to a specific existing function that you name.
- b) Skip it and leave the responsibility matrix at five rows (owner plus two contributors plus two consumers).

Recommended: b, unless you can name the function. There is no generic Engineering or Asset Management function in the spine, and the closest software-engineering entry is the wrong operational-technology context.

a6:

---

## Optional (will not hold up the build)

q7: Beyond the four utility markets in q1, two adjacent green-field markets show up across flagship vendors: distributed energy resource management (grid-edge solar, storage, and EV) and a utility geographic information system (the network connectivity model that outage and distribution systems consume). Should I research and add the ones that hold up as new domains? (yes/no)

Recommended: yes, but additive and can happen after the build. These are genuinely new markets, not relocations of existing data, so they do not depend on the q1 decision; they still want a Phase 0 vendor-surface check first.

a7:

---

<!-- agent map, ignore: q1=B2-5 q2=B2-1 q3=B2-2 q4=B2-3 q5=B2-4 q6=B2-RACI-ENG q7=B3-UTIL-DERMS+B3-UTIL-GIS | domain_id=49 -->
