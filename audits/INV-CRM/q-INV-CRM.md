# Investment CRM (INV-CRM): questions waiting for you

## What this domain is
Relationship-intelligence CRM and deal pipeline for venture, private equity, and family-office investors.

Map the warm-relationship network and route introductions to the people who can open a door, then run every deal from sourcing through diligence, investment-committee memos, and close. Keep limited-partner outreach and fundraising on the same backbone, so the same firm and contact data drives deal flow, portfolio awareness, and investor relations.

---

q1: (answer this first) How should Investment CRM be split into modules (the sub-areas of the product)?

- a) Keep the current three modules: Deal Pipeline, Relationship Graph, and LP-CRM.
- b) Split identity resolution out of Relationship Graph into its own Identity Recon module.
- c) Split portfolio awareness out of LP-CRM into its own Portfolio Awareness module.
- d) Do both splits (Identity Recon and Portfolio Awareness).

Recommended: a. The current three-module split is coherent against the vendor surface, and the two candidate splits only pay off if LP-CRM scope grows materially (which depends on the optional funds and signal entities below). This choice drives every module below it, so it unlocks the rest of the build.

a1:

---

q2: Today relationship records and investor contacts have no lifecycle of their own (one is a computed score, the other is a directory record). Should either also get minimal directory states (active / archived / merged)?

- a) Confirm both as config-shape with no lifecycle states (current state).
- b) Add directory states to investor contacts only; leave relationship records as-is.
- c) Add directory states to both.

Recommended: a. The structural exemption is already in place via their entity types, so this is purely whether optional directory states add value; neither needs them to pass the build.

a2:

---

q3: Which regulations are in scope for Investment CRM and should be linked? CAN-SPAM is already linked.

- a) All four: add GDPR, CCPA, and SEC Investment Advisers Act (Rule 204-2), and keep CAN-SPAM.
- b) Keep GDPR, CCPA, and SEC IAA, but drop CAN-SPAM as out of scope.
- c) Keep CAN-SPAM and SEC IAA, but drop firm-level privacy (GDPR / CCPA) as out of scope of the CRM itself.
- d) Keep only CAN-SPAM (current state).

Recommended: a. The CRM holds personal data on founders, executives, and LPs (GDPR / CCPA), and registered advisers use it as a books-and-records system (SEC Rule 204-2), so all four apply.

a3:

---

q4: What should the four personas be named?

- a) Approve as proposed: Deal Partner, Investment Associate, IR Lead, Platform Admin.
- b) Approve with the Partner rename (drop the Deal prefix, since Partner is the canonical VC title).
- c) Add a Principal persona between Partner and Associate.
- d) Provide a custom persona list.

Recommended: a. The proposed four cover deal leadership, diligence support, LP fundraising, and cross-module admin; the role layer is empty today, so this naming unblocks the persona build.

a4:

---

q5: Should the two adjacent domains be scheduled as their own full audit runs next?

- a) Schedule both FUND-ADMIN and PORT-MONIT.
- b) Schedule FUND-ADMIN only (PORT-MONIT defers).
- c) Defer both.

Recommended: a. FUND-ADMIN carries the heaviest edge weight (3) and PORT-MONIT the next (2), and both were only covered inline or in light summary so far, so each warrants a dedicated pass.

a5:

---

## Optional (will not hold up the build)

q6: Seven extra entities show up across the flagship VC and PE specialists (email threads, free-text CRM notes, signal alerts, allocation mandates, deal-attached documents, per-record activity logs, and a funds consumer or embedded master on the LP-CRM side). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are near-universal across the vendor set; each still wants a verification pass first, and the funds outcome may feed back into the module-split call above.

a6:

---

<!-- agent map, ignore: q1=B2-MODULARIZATION-STABILITY q2=B2-CONFIG-SHAPE q3=B2-REGULATION-SCOPE q4=B2-ROLE-NAMING q5=B2-PAIRWISE-AUDIT-SCHEDULE q6=B3-EMAIL-THREADS+B3-NOTES+B3-SIGNAL-ALERTS+B3-MANDATES+B3-DOCUMENTS+B3-ACTIVITY-LOGS+B3-FUNDS | domain_id=159 -->
