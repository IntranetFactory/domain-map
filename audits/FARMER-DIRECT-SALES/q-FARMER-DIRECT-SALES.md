# Farmer Direct Sales (FARMER-DIRECT-SALES): questions waiting for you

## What this domain is
Sell what your farm grows straight to the people who eat it, across every channel you run.

Manage CSA memberships and weekly share packs, an online farm storefront, on-site farmers-market sales, wholesale and food-hub orders, butcher and processing orders, your own delivery routes, and harvest forecasting, all in one place. It is built for the small owner-operator farm that handles direct-to-consumer and local wholesale itself rather than going through a distributor.

---

q1: (answer this first) The five "consumer" links where one Farmer Direct Sales module reads a master that a sibling module owns (for example Delivery Ops reading CSA share packs, wholesale orders, and butcher orders): are they the shape you want, or should they be removed?

- a) Keep all five as accurate cross-module reads, with each module deployable on its own and the data flowing through the existing intra-domain handoffs.
- b) Delete all five and rely only on the owning module plus handoffs (destructive: removes existing rows).
- c) Promote specific ones to embedded copies so certain modules (such as Delivery Ops) can run fully standalone.

Recommended: a. The domain already has nine intra-domain handoffs wiring these flows, so the consumer links are accurate runtime reads rather than redundancy. This choice sets the deployability shape for every module, so it unlocks the rest of the build.

a1:

---

q2: Should Delivery Ops be renamed Fulfillment and registered as a shared cross-cutting module that serves CSA, Wholesale, and Butcher, left as-is, or split into per-channel delivery modules?

- a) Leave as-is (the existing lifecycle handoffs already represent the dependency).
- b) Rename to Fulfillment and add explicit host links to CSA, Wholesale, and Butcher (a rename is restructuring, so it needs your sign-off).
- c) Split delivery into per-channel modules (likely overkill for a small-farm operator).

Recommended: a. Delivery Ops only owns delivery routes but is already the destination of four cross-module handoffs, so the current handoff graph captures the dependency without a disruptive rename.

a2:

---

q3: In the small-farm market, is your CRM the system of record for turning leads into direct-to-consumer buyers, so a "deal won" event should flow from CRM into the Online Store?

- a) Yes, author the inbound CRM to Online Store handoff (payload: customers).
- b) No, the storefront itself is the lead system for small farms, so add no handoff.
- c) Defer until vendor research settles it.

Recommended: b. Small-farm CRM adoption is uneven and many operators use the storefront's built-in customer registry as the lead system, so authoring the handoff risks modeling a flow most operators do not run.

a3:

---

q4: Three outbound events (share-pack delivered, delivery route dispatched, harvest forecast updated) currently land in the CRM pipeline-management module. Is that the right target, or should they move?

- a) Confirm the pipeline-management module is correct (small-farm CRM uses it as a catch-all).
- b) Retarget them to a different CRM module once the CRM audit identifies it (overwrites a populated target, so it needs your call).
- c) Retarget them away from CRM entirely, toward a marketing or notification domain (not loaded yet).

Recommended: b. These are member-facing communications and fulfillment notices, not sales-pipeline events, so the pipeline-management target is probably wrong; the CRM audit will pin the right customer-engagement module. This also unblocks the APQC tagging on those three handoffs.

a4:

---

q5: The 24 workflow-gate permissions rely on the role hierarchy (the manage and admin bundles) to grant them. Is that implicit-grant pattern intended, or should specific gates be granted explicitly on individual farm roles?

- a) Confirm the hierarchy expands the gates and leave the bundles as-is.
- b) Add explicit gate grants on specific roles (Farm Operator, CSA Manager, Wholesale Manager, Delivery Coordinator, Market Cashier).
- c) Leave it and assume the hierarchy covers everything.

Recommended: a. The gates align one-to-one with the permission-bearing lifecycle states and the manage/admin bundles are the normal way to reach them, so explicit per-role grants add maintenance without changing access.

a5:

---

q6: Should the CSA Starter (currently a lite path with four embedded objects: memberships, share packs, pickup locations, customers) also include delivery routes and/or harvest forecasts, or stay minimal?

- a) Keep it minimal at four embeds.
- b) Add both delivery routes and harvest forecasts.
- c) Add only one of the two (tell me which).

Recommended: a. The starter is meant to be the lite on-ramp, and solo CSA farms that need routing or forecasting can graduate to the full modules; keeping it minimal preserves that contrast.

a6:

---

## Optional (will not hold up the build)

q7: Flagship vendors model several entities Farmer Direct Sales does not have yet: per-member share swaps and pauses (CSA), farmers-market day/event records, multi-farm producer payout splits, a partner-producer registry, and cottage-food / sales-tax disclosure records. Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Each is seen across the food-hub and CSA vendor set, though they still want a verification pass first.

a7:

---

q8: Should I stand up a dedicated Compliance module for Farmer Direct Sales if the regulatory entities (FSMA produce-safety records, cottage-food disclosures, organic certifications, sales-tax remittance) turn out to be load-bearing? (yes/no)

Recommended: yes if those entities land, since an eighth module is cleaner than overloading existing ones; this depends on the entity research in q7 first.

a8:

---

q9: No regulations are loaded for this domain yet. Should I seed the compliance anchors (FDA FSMA Produce Safety Rule, USDA National Organic Program, US state cottage-food rules, US state sales-tax remittance, GAP/GHP certification, PCI-DSS)? (yes/no)

Recommended: yes. These are the real regulatory exposures for small direct-sales farms and seeding them is purely additive.

a9:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S3 q3=B2-S4 q4=B2-S5 q5=B2-S6 q6=B2-S7 q7=B3-share_swaps+B3-farmers_market_events+B3-producer_payouts+B3-producers+B3-cottage_food_disclosures q8=B3-fds_compliance_module q9=B3-regulations | domain_id=158 -->
