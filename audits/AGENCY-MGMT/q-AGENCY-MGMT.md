# Agency Management (AGENCY-MGMT): questions waiting for you

## What this domain is
Run your agency from estimate to invoice: client jobs, media buying, and creative operations in one place.

Manage your agency's client work end to end. Open jobs and track them through traffic and delivery, capture time against client rate cards, and watch retainers burn down in real time. Plan and buy media by outlet and channel, reconcile spend against publisher invoices, and move creative from brief to approved deliverable, then bill clients on markup or cost-plus terms without re-keying a thing.

---

q1: (answer this first) How should the eight agency records be set up for workflow tracking (lifecycle states)?

- a) Give all eight records full lifecycles (jobs, time entries, retainers, estimates, media plans, insertion orders, creative briefs, creative deliverables). This is the recommended shape and unlocks the bulk of the build below.
- b) Exempt estimates and creative briefs (treat them as author-once, occasionally-edited) and model the other six.
- c) Exempt a different set (tell me which).

Recommended: a. All eight masters carry real, distinct workflows (for example a job runs draft to estimated to active to delivered to invoiced to closed), so none of them is a simple author-once record. This choice drives the lifecycle and workflow-permission build for the whole domain, so it unlocks the rest of the work.

a1:

---

q2: Should the six work-product records lock once submitted, so an approved version cannot be quietly edited afterward (estimates, insertion orders, time entries, media plans, creative briefs, creative deliverables)? (yes/no)

Recommended: yes. A submitted estimate, an issued insertion order, and submitted time entries are commitments and billing evidence, so they should freeze on submission.

a2:

---

q3: Should estimates and insertion orders each require a single named approver to sign off (one account director on the estimate, one media director on the insertion order)? (yes/no)

Recommended: yes. These are the two records that go out to a client or a publisher, so a single accountable sign-off is normal practice.

a3:

---

q4: Should agency time entries stay a distinct record, rather than reusing the project-time-tracking record from the PSA domain? (yes/no)

Recommended: yes. Keeping it distinct (the Workamajig and Function Point shape) preserves the agency-specific rate-card and retainer-burn columns. Answer no only if you would rather have agency time consume the PSA project time record and add the agency-specific columns on top (the Deltek shape).

a4:

---

## Optional (will not hold up the build)

q5: Should I add a dedicated rate-card record, so per-client rate sheets and effective-dated bill rates live as first-class records instead of overrides on time entries? (yes/no)

Recommended: yes. Workamajig, Deltek WorkBook, and Function Point all model rate cards this way, but it is additive and can come after the modules exist.

a5:

---

q6: Should I add a dedicated invoice record that rolls up time, media, and out-of-pocket costs into a single client invoice? (yes/no)

Recommended: yes. Every flagship vendor ships an invoice master; today invoicing is only implied by an event. Additive, can happen later.

a6:

---

q7: Should I add a change-order record to capture scope changes against an estimate (amount delta, narrative, client approval)? (yes/no)

Recommended: yes. Workamajig, Deltek, and Function Point all model change records separate from the original estimate. Additive.

a7:

---

q8: Should I add a media-buys record to hold post-buy actuals, distinct from the media plan (intent) and the insertion order (commitment)? (yes/no)

Recommended: yes. Publisher actuals differ from the plan and drive reconciliation; today they are implicit on insertion orders. Additive.

a8:

---

q9: Should I add a proofing-rounds record so each annotated review round on a deliverable is tracked separately, instead of rolling every round onto one deliverable? (yes/no)

Recommended: yes. Ziflow, Filestage, Approval Studio, and GoVisually all model proofing rounds as distinct records. Additive.

a9:

---

q10: Should media buying be promoted to its own separate domain rather than staying a module inside Agency Management? (yes/no)

Recommended: no for now. Pure-play vendors exist (Mediaocean, Smartly.io, Basis Technologies), but the current module shape is serviceable; revisit only if you want a standalone media-buying product.

a10:

---

q11: Should creative proofing be promoted to its own separate domain rather than staying a module inside Agency Management? (yes/no)

Recommended: no for now. Pure-play proofing vendors exist (Ziflow, Filestage, Approval Studio, GoVisually), but it is fine as a module unless you want a standalone proofing product.

a11:

---

q12: Should Marketing Resource Management (MRM) be tracked as a separate adjacent domain (in-house marketing operations, distinct from external agency delivery)? (yes/no)

Recommended: yes as a future candidate. Aprimo, Workfront for Marketing, Allocadia, and Plannuh serve a different buyer than agency software, so it is worth a separate domain later. Non-blocking.

a12:

---

<!-- agent map, ignore: q1=B2-S5 q2=B2-S3.submitlock q3=B2-S3.singleapprover q4=B2-S6 q5=B3-AGENCY-RATE-CARDS q6=B3-AGENCY-INVOICES q7=B3-AGENCY-CHANGE-ORDERS q8=B3-MEDIA-BUYS q9=B3-PROOFING-ROUNDS q10=B3-DOMAIN-MEDIA-BUY-PLATFORM q11=B3-DOMAIN-CREATIVE-PROOFING q12=B3-DOMAIN-MRM | domain_id=153 -->
