# Farmer Direct Sales (FARMER-DIRECT-SALES): questions waiting for you

## What this domain is
Sell what your farm grows straight to the people who eat it, across every channel you run.

Manage CSA memberships and weekly share packs, an online farm storefront, on-site farmers-market sales, wholesale and food-hub orders, butcher and processing orders, your own delivery routes, and harvest forecasting, all in one place. Built for the small owner-operator farm that handles direct-to-consumer and local wholesale itself.

Your last answers settled the Delivery Ops shape, the no-CRM-handoff call, the permission hierarchy, the minimal CSA starter, and the customer-boundary tag fix. The B9d owner items and the CRM-pipeline retarget are recorded as work that proceeds once the persona layer and the CRM audit land. One question you handed back is below.

---

q1: (answer this first) Five "consumer" links let one module read a master a sibling module owns (for example Delivery Ops reading CSA share packs, wholesale orders, and butcher orders). You asked whether embedded master would be better. It is, for any module you want to deploy on its own. How should these be shaped?

- a) Promote the ones that should run standalone to embedded master (Delivery Ops is the clearest: it reads four sibling masters, so an embedded shell lets it ship without the CSA, Wholesale, and Butcher modules and defer to them when they are installed). Tell me which.
- b) Keep all five as accurate cross-module reads (valid if you do not need per-module standalone deploy; the nine intra-domain handoffs already wire the flows).
- c) Delete all five and rely only on the owning module plus handoffs.

Recommended: a, for Delivery Ops at minimum. Embedded master is the standalone-deployable answer you were reaching for: the module carries a local shell and demotes to a plain consumer when the owning module is co-installed, so nothing is duplicated in a full deployment. Promoting (or deleting) rewrites the existing rows, so it needs your sign-off. This sets the deployability shape for every module.

a1:

---

## Optional (will not hold up the build)

q2: Flagship vendors model several entities Farmer Direct Sales does not have yet: per-member share swaps and pauses, farmers-market day records, multi-farm producer payout splits, a partner-producer registry, and cottage-food / sales-tax disclosure records. Research and add the ones that hold up? (yes/no)

Recommended: yes, additive and after a verification pass. Each is seen across the food-hub and CSA vendor set.

a2:

---

q3: Should I stand up a dedicated Compliance module if the regulatory entities (FSMA produce-safety records, cottage-food disclosures, organic certifications, sales-tax remittance) turn out to be load-bearing? (yes/no)

Recommended: yes if those entities land, an eighth module is cleaner than overloading existing ones. Depends on the entity research above.

a3:

---

q4: No regulations are loaded yet. Seed the compliance anchors (FDA FSMA Produce Safety Rule, USDA National Organic Program, US state cottage-food rules, US state sales-tax remittance, GAP/GHP certification, PCI-DSS)? (yes/no)

Recommended: yes. These are the real regulatory exposures for small direct-sales farms; seeding them is purely additive.

a4:

---

<!-- agent map, ignore: q1=B2-S1 q2=B3-FDS-ENTITIES q3=B3-FDS-COMPLIANCE-MODULE q4=B3-FDS-REGULATIONS | domain_id=158 -->
