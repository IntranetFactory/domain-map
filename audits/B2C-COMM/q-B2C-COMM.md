# Digital Commerce (B2C-COMM): questions waiting for you

## What this domain is
Run a complete e-commerce business, from the storefront a shopper browses to the order that ships to their door.

Build and publish your product catalog, run the storefront customers shop in, and launch the coupons and promotions that move product. Turn carts into paid orders: capture the cart, run checkout, take payment, and create the order with its line items, then track each order through its lifecycle and handle refunds when needed. Finally, take confirmed orders through fulfillment and shipping so customers know their package is on the way. The runtime an e-commerce site depends on: cart, promotion engine, search and merchandising ranking, and inventory availability.

---

q1: (answer this first) This domain is currently filed as a child of CRM. Digital Commerce platforms (Shopify Plus, BigCommerce, commercetools) sell as standalone markets, not as CRM add-ons. How should the parent link be set?

- a) Clear the parent link, so Digital Commerce stands on its own.
- b) Keep the CRM parent link as a curated affinity or cluster signal only.
- c) Point it at a different parent (no obvious candidate today).

Recommended: a. The point-solution-market test does not treat Digital Commerce as a CRM sub-domain, so a standalone domain is the truer shape.

a1:

---

q2: Should the order and shipping records that hold customer details be marked as containing personal data, so they fall under PCI-DSS and privacy rules?

- a) Mark all three (payment transactions, orders, and checkouts).
- b) Mark payment transactions only.
- c) Leave all three unmarked (treat card data as the payment gateway's responsibility and defer shipping-address privacy to a future addresses entity).

Recommended: a. This flag is structural, and PCI-DSS plus CCPA and GDPR treat cardholder content and shipping addresses as personal data, so all three should carry it.

a2:

---

q3: The B2B commerce capability (account hierarchies, requisition lists, quote-to-order) sits inside this otherwise marketing-owned domain. Who should own it?

- a) Give the B2B capability a Sales-owner / Marketing-contributor override, distinct from the domain default.
- b) Leave the domain-level ownership (Marketing-owner / Sales-contributor) as is.
- c) Split B2B into its own module and let module-level ownership carry the override.

Recommended: a. The B2B capability is Sales-shaped (account hierarchies, requisition lists, quote-to-order), so a Sales-owner override fits it better than the domain default.

a3:

---

q4: Three cross-domain process tags are currently coarse and would need to be deleted and re-inserted to tighten them (the new-customer signup to CRM, the segment-activation feed from CDP, and the delivered-fulfillment feed to loyalty). Should I refine them? (yes/no)

Recommended: yes. The current tags are too broad for what each handoff actually does, and tighter process mappings are more accurate. This deletes and replaces existing rows, so it needs your sign-off.

a4:

---

q9: Customer Data Platform hands work to Digital Commerce, but Digital Commerce has no one assigned to develop customer experience strategy, so that step currently has nobody responsible for it. Who should own it?
- a) The a named owner runs it and approves it.
- b) Someone else you name runs and approves it.
- c) Leave it unassigned for now.

Recommended: a. Digital Commerce already assigns the a named owner to work of this kind, so (a) fills this gap the same way and gives the work a named owner.

a9:

---

q10: Customer Data Platform hands work to Digital Commerce, but Digital Commerce has no one assigned to manage product and service master data, so that step currently has nobody responsible for it. Who should own it?
- a) The a named owner runs it and approves it.
- b) Someone else you name runs and approves it.
- c) Leave it unassigned for now.

Recommended: a. Digital Commerce already assigns the a named owner to work of this kind, so (a) fills this gap the same way and gives the work a named owner.

a10:

---

q11: Core Financial Management hands work to Digital Commerce, but Digital Commerce has no one assigned to determine fulfillment process, so that step currently has nobody responsible for it. Who should own it?
- a) The a named owner runs it and approves it.
- b) Someone else you name runs and approves it.
- c) Leave it unassigned for now.

Recommended: a. Digital Commerce already assigns the a named owner to work of this kind, so (a) fills this gap the same way and gives the work a named owner.

a11:

---

q12: Core Financial Management hands work to Digital Commerce, but Digital Commerce has no one assigned to post AR activity to the general ledger, so that step currently has nobody responsible for it. Who should own it?
- a) The a named owner runs it and approves it.
- b) Someone else you name runs and approves it.
- c) Leave it unassigned for now.

Recommended: a. Digital Commerce already assigns the a named owner to work of this kind, so (a) fills this gap the same way and gives the work a named owner.

a12:

---

q13: Core Financial Management hands work to Digital Commerce, but Digital Commerce has no one assigned to process and distribute payments, so that step currently has nobody responsible for it. Who should own it?
- a) The a named owner runs it and approves it.
- b) Someone else you name runs and approves it.
- c) Leave it unassigned for now.

Recommended: a. Digital Commerce already assigns the a named owner to work of this kind, so (a) fills this gap the same way and gives the work a named owner.

a13:

---

q14: Marketing Automation hands work to Digital Commerce, but Digital Commerce has no one assigned to develop and manage marketing plans, so that step currently has nobody responsible for it. Who should own it?
- a) The a named owner runs it and approves it.
- b) Someone else you name runs and approves it.
- c) Leave it unassigned for now.

Recommended: a. Digital Commerce already assigns the a named owner to work of this kind, so (a) fills this gap the same way and gives the work a named owner.

a14:

---

q15: Order Management hands work to Digital Commerce, but Digital Commerce has no one assigned to accept and validate sales orders, so that step currently has nobody responsible for it. Who should own it?
- a) The a named owner runs it and approves it.
- b) Someone else you name runs and approves it.
- c) Leave it unassigned for now.

Recommended: a. Digital Commerce already assigns the a named owner to work of this kind, so (a) fills this gap the same way and gives the work a named owner.

a15:

---

q16: Product Information Management hands work to Digital Commerce, but Digital Commerce has no one assigned to manage product and service life cycle, so that step currently has nobody responsible for it. Who should own it?
- a) The a named owner runs it and approves it.
- b) Someone else you name runs and approves it.
- c) Leave it unassigned for now.

Recommended: a. Digital Commerce already assigns the a named owner to work of this kind, so (a) fills this gap the same way and gives the work a named owner.

a16:

---

## Optional (will not hold up the build)

q5: Every flagship vendor catalog carries SKU-level rows under products (product variants), a category tree, and a catalog attribute schema, which we do not model yet. Should I research and add this catalog substrate cluster? (yes/no)

Recommended: yes. This is the single biggest gap in the catalog area and shows up in every flagship vendor (Shopify Plus, BigCommerce, commercetools, Adobe Commerce, Saleor). Additive and can happen after the modules exist.

a5:

---

q6: Should I research and add the payments, pricing, and tax cluster (saved payment methods, price books and pricing tiers, tax calculation and rates, gift cards, and shipping methods, zones, and rates)? (yes/no)

Recommended: yes, with a check first. Some of these may belong on adjacent domains (tax on a tax-compliance domain, payment methods on a payments domain), so verify ownership before adding. Additive and non-blocking.

a6:

---

q7: Should I research and add the post-purchase cluster (returns, RMA requests, refund requests, product reviews and ratings, wishlists, and saved carts)? (yes/no)

Recommended: yes, with a check first. Returns may live on an order-management domain and reviews on a separate customer-feedback domain in some architectures, so verify before adding. Additive and non-blocking.

a7:

---

q8: Should I research and add the B2B commerce surface (B2B accounts, buyer groups, quotes, requisition lists, contracts, purchase approvals, and customer addresses)? (yes/no)

Recommended: yes, with a check first. If you later elevate B2B to its own domain, this cluster moves there instead, which also settles the B2B ownership question above. Additive and non-blocking.

a8:

---

<!-- agent map, ignore: q1=B2-S3 q2=B2-S1 q3=B2-S4 q4=B2-S8 q5=B3-S1 q6=B3-S2 q7=B3-S3 q8=B3-S4 q9=B2-B9D-OWN-100 q10=B2-B9D-OWN-115 q11=B2-B9D-OWN-738 q12=B2-B9D-OWN-1359 q13=B2-B9D-OWN-1422 q14=B2-B9D-OWN-23 q15=B2-B9D-OWN-735 q16=B2-B9D-OWN-113 | domain_id=71 -->
