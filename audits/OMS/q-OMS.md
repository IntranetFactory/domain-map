# Order Management System (OMS): questions waiting for you

## What this domain is

Capture orders from any channel, route each one to the right inventory node, and orchestrate everything from sourcing through fulfillment to returns in one place.

OMS sits between your storefronts and your inventory network. It allocates stock to orders, runs the sourcing and rate-shop decisions that pick which location ships each line, computes what you can promise a customer, and handles store pickup (BOPIS, ship-from-store, curbside) and returns. It is operations-research heavy: inventory allocation, sourcing and fulfillment rules, and split-shipment optimization all live here.

---

q1: (answer this first) How should Order Management be split into modules, and how many capabilities should it carry?

- a) 5 to 8 capabilities with a 4-module split: Order Orchestration (order allocations and sourcing decisions), Returns (return authorizations), Store Pickup (store pickup orders), and Locations (inventory locations as a configuration module).
- b) 3 capabilities with a 2-module split: Core Orchestration and Returns-and-Pickup.
- c) 8-plus capabilities with a 4 to 5 module split, adding available-to-promise and post-purchase tracking.

Recommended: a. Salesforce Order Management, IBM Sterling, Manhattan Active Omni, and Fluent Commerce all package OMS as several distinct surfaces rather than one: order orchestration plus sourcing/routing (Sterling's allocation plans, Salesforce's fulfillment plans), a separate returns/RMA surface, and a separate store-pickup/BOPIS surface, with inventory nodes/locations carried as configuration rather than a workflow. That four-way packaging is exactly option (a)'s split (Order Orchestration, Returns, Store Pickup, Locations) at 5 to 8 capabilities; available-to-promise and post-purchase tracking (option c) show up across these vendors as additive surfaces layered on top, not as the baseline shape, and a 2-module compaction (option b) collapses returns and store pickup that every flagship keeps apart.

a1:

---

q2: Should OMS be the canonical owner of inventory locations (the inventory nodes / facilities / stores in your fulfillment network)?

- a) OMS canonically masters inventory locations.
- b) Defer mastery to a future Warehouse Management System (WMS) domain once it lands (long lead time).
- c) Treat it as IWMS-canonical with OMS holding an embedded reference (unlikely; IWMS owns the abstract office/site concept, not the inventory node).

Recommended: a. OMS sources from inventory locations and owns the full workflow around them, and this also clears a broken pointer that the inventory domain currently has against this master.

a2:

---

q3: Inventory locations have no workflow lifecycle and were classified as a configuration ("catalog") entity. Confirm this matches intent: locations are authored once and edited inline by ops admins, and the open / capacity-breach signals are events on the location rather than transitions of the location itself. (yes/no)

Recommended: yes. The configuration shape is a structural pass; authoring open/close states would be a low-value re-classification.

a3:

---

q4: Once OMS is built and gets its single domain-grain system skill, what happens to the legacy domain-level "oms-system" skill?

- a) Re-use it as the single domain-grain system skill (rename, repoint, derive its toolset from the module tools).
- b) Delete it and author a fresh domain-grain system skill at build time.
- c) Keep it as-is until build and decide at build time.

Recommended: a. Re-using the existing skill avoids a destructive delete and carries no downside, since the new model already calls for exactly one domain-grain system skill. Option (b) is a delete, so it needs your sign-off.

a4:

---

q5: The domain description and business-logic text use British spellings ("fulfilment", "optimisation"), against the American-English project rule. Should I correct them to "fulfillment" and "optimization"? (yes/no)

Recommended: yes. This aligns with the project rule. Both fields are non-empty, so overwriting them needs your confirmation.

a5:

---

q6: The return-authorization plural label is currently "Return Authorization (RMA)s", which pluralizes an inline acronym awkwardly. How should it read?

- a) "Return Authorizations", relying on the RMA synonym that already exists as an alias.
- b) "RMAs" as the plural label.
- c) Leave as-is.

Recommended: a. Cleanest long-form, and the RMA term is already carried as an alias. This overwrites a non-empty label, so it needs your call.

a6:

---

q7: Should return authorizations be frozen once received, so the RMA lines stay immutable for refund-eligibility computation? (yes/no)

Recommended: yes. A received return is a fixed basis for the refund calculation. This flips an existing flag value, so it needs your sign-off.

a7:

---

q8: Should order allocations be frozen once released (the terminal state), so a released allocation cannot be quietly edited? (yes/no)

Recommended: yes. A released allocation is a completed handoff and should stay stable. This flips an existing flag value, so it needs your sign-off.

a8:

---

q9: Should sourcing decisions be frozen once fulfilled, so the sourcing trail is immutable for audit? (yes/no)

Recommended: yes. The sourcing trail is an audit record once the order ships. This flips an existing flag value, so it needs your sign-off.

a9:

---

q10: Does the order-allocation row store a shipping address or buyer contact (making it carry personal data)? (yes/no)

Recommended: answer from your storage shape. Say yes only if identity actually lives on the allocation row rather than on the parent order shell. This flips an existing flag value, so it needs your sign-off.

a10:

---

q11: Does a return authorization capture customer-written return-reason text (making it carry personal data)? (yes/no)

Recommended: answer from your storage shape. Say yes if free-text customer reasons are stored on the return. This flips an existing flag value, so it needs your sign-off.

a11:

---

## Optional (will not hold up the build)

q12: Four extra entity candidates show up across the flagship OMS vendors (order holds with a hold-reason taxonomy and SLA timers; order promises / delivery promises as a customer-facing commitment separate from the sourcing decision; fulfillment-instruction records that may belong to OMS rather than the commerce domain that masters them today; and an order audit / history log distinct from generic system audit). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules exist. The fulfillments candidate also implies a possible ownership migration away from the commerce domain, which I would confirm before moving.

a12:

---

q13: Five compliance candidates surface for OMS (GDPR for customer personal data on orders; CCPA / CPRA for California consumers; Section 321 / Type 86 de minimis filings for cross-border DTC; EU Omnibus Directive for refund and consumer-rights timelines on returns; DAC7 for marketplace seller reporting). Should I research and tag the ones that apply? (yes/no)

Recommended: yes for GDPR and CCPA / CPRA at minimum; the cross-border, returns, and marketplace ones depend on whether your deployment touches those flows. Additive and non-blocking.

a13:

---

q14: Several adjacent build-out ideas show up (a dedicated sourcing-engine sub-module if delivery promises become their own master; a thinner returns module once a Returns Management domain lands; and four candidate domains: Returns Management, Carrier / Rate-Shop, Post-Purchase Tracking, and Warehouse Management). Should I run these through the missing-domains and modularization triage? (yes/no)

Recommended: yes, as triage only. These are non-blocking ideas, not build gates, and the module-split decision in q1 stands on its own.

a14:

---

<!-- agent map, ignore: q1=B2-S4 q2=B2-S6 q3=B2-S5 q4=B2-S1 q5=B2-LANG q6=B2-S3 q7=B2-S2.ra_submitlock q8=B2-S2.alloc_submitlock q9=B2-S2.sourcing_submitlock q10=B2-S2.alloc_pii q11=B2-S2.ra_pii q12=B3-S1+B3-S2+B3-S3+B3-S4 q13=B3-R1+B3-R2+B3-R3+B3-R4+B3-R5 q14=B3-M1+B3-M2+B3-D1+B3-D2+B3-D3+B3-D4 | domain_id=32 -->
