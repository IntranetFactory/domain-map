# Software Asset Management (SAM): questions waiting for you

## What this domain is
Discovery, normalization, entitlement reconciliation, and audit defense for software licenses.

Find every piece of software running across your estate, normalize the raw discovery data into a clean publisher catalog, and reconcile what is installed against what you are entitled to own. Track licenses through their full life (purchase, activation, renewal, retirement), flag over- and under-consumption before it costs you, and stand ready to defend an effective license position when a publisher opens an audit.

---

q1: (answer this first) How should Software Asset Management be split into modules (the sub-areas of the product)?

- a) Keep the landed 3-module shape: Catalog and Discovery (the software catalog plus install discovery), Entitlement Management (licenses, renewals, consumption), and Audit Defense (publisher audit cases).
- b) Re-split toward 6 modules (Catalog, Discovery, Entitlement, Metering, Audit, Renewal) once the 38 net-new market-surface masters in the Optional question land.
- c) A hybrid 4- or 5-module shape.
- d) Push back on the proposed module boundaries (tell me where they are wrong).

Recommended: a. The 3-module shape is correct for today's 6 data objects: no empty modules, all five capabilities placed, every structural check holds. The 6-module shape only becomes non-empty once the extra masters load, so the re-split is a build decision tied to the Optional question below, not a defect today. This choice drives every module mapping, lifecycle owner, and per-module handoff beneath it, so it unlocks the rest of the build.

a1:

---

q2: Should a license audit be locked once its response is submitted to the publisher, so the submitted snapshot cannot be quietly edited? (yes/no)

Recommended: yes. Once an audit response goes to the publisher the snapshot is a fixed artifact, and locking it preserves an accurate record of what was submitted. This flips a pattern flag that currently reads false, so it needs your confirmation.

a2:

---

q3: Should a license audit response require sign-off by one named approver (an IT Asset Management lead or CIO) before it is submitted? (yes/no)

Recommended: yes. A publisher audit response is a high-stakes external commitment, so a single accountable approver is normal practice. This flips a pattern flag that currently reads false, so it needs your confirmation.

a3:

---

q4: How should the software catalog entries and install records be treated for lifecycle purposes?

- a) Both are config-shape (maintained reference tables, edited occasionally), with no formal state machine.
- b) Both get a full lifecycle (titles: active, EOL, retired; installations: detected, verified, licensed, unlicensed, removed).
- c) Titles get a full lifecycle, installations stay config-shape.
- d) Titles stay config-shape, installations get a full lifecycle.

Recommended: c. A full-lifecycle software title makes end-of-life a first-class workflow event with publishers and audit handoffs, while installations behave more like ephemeral discovery rows. Pick (a) if you want the catalog slice kept as a simple maintained reference table. This choice shapes how the Catalog and Discovery module behaves.

a4:

---

q5: Snow Software was acquired by Insight Enterprises in 2024, but the vendor record still reads "Snow Software". How should the catalog reflect this?

- a) Leave the records as is (awareness only, no change).
- b) Update the vendor record to reflect the acquisition.
- c) Add an approved predecessor note to the solution wording (you approve the exact wording).

Recommended: a. This is outside the routine audit scope and is surfaced for awareness only; updating vendor records or solution notes is opt-in. Choose (b) or (c) if you want the acquisition recorded now.

a5:

---

q6: Should an end-of-life software title also notify the Application Portfolio Management domain, not just Governance, Risk and Compliance, so dependent applications get flagged for replacement?

- a) Add Application Portfolio Management as a subscriber (it already consumes software titles via existing relationships).
- b) Keep Governance, Risk and Compliance as the only subscriber.
- c) Defer and let Governance, Risk and Compliance publish the signal downstream itself.

Recommended: a. The handoff is straightforward to load and dependent applications genuinely need the EOL signal; the only real question is whether Governance is the sole legitimate subscriber, and it is not.

a6:

---

q7: How far should SAM go in licensing PaaS add-ons (databases, queues, caches) that arrive from the platform domain?

- a) Stay narrow: keep the inbound add-on signal informational only.
- b) Extend SAM to fully master PaaS add-on licensing (a new add-on entitlement master).
- c) Align it with the FinOps consumption master instead.

Recommended: a. Some PaaS add-ons are billable with their own entitlements and some are bundled, so a narrow, informational stance keeps scope tight today; this also decides whether the inbound add-on consumer row is optional (recommended) or a required new master.

a7:

---

q8: When the source-to-pay domain approves a software-license purchase order, should an approved license auto-create in SAM to close the purchase-to-entitlement loop?

- a) Add the handoff after the source-to-pay domain is audited.
- b) Defer until the source-to-pay domain is audited.
- c) Skip it.

Recommended: a. It is a plausible and valuable loop to close, but the source side may first need its purchase-order-approved event authored, so schedule the source-to-pay audit independently before wiring it.

a8:

---

q9: When Governance, Risk and Compliance publishes a vulnerability finding tied to a software title, should SAM trigger a deployment scope check? (yes/no)

Recommended: no, defer. Most CVE-to-title mapping happens in the vulnerability-management domain, not in Governance, and this would likely duplicate the existing SAM to vulnerability-management handoff, so it is not a true boundary gap.

a9:

---

q11: Discovery and Service Mapping forwards software installation to Software Asset Management to confirm hardware or software operational status, but Software Asset Management does not yet have anyone assigned to confirm hardware or software operational status, so this step has no owner. How should it be handled?
- a) Record it now as work Software Asset Management owns, and assign a named owner once Software Asset Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Software Asset Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a11:

---

q12: Cloud Financial Operations forwards software license to Software Asset Management to optimize IT resource allocation, but Software Asset Management does not yet have anyone assigned to optimize IT resource allocation, so this step has no owner. How should it be handled?
- a) Record it now as work Software Asset Management owns, and assign a named owner once Software Asset Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Software Asset Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

q13: Remote Monitoring and Management forwards software installation to Software Asset Management to maintain IT asset records, but Software Asset Management does not yet have anyone assigned to maintain IT asset records, so this step has no owner. How should it be handled?
- a) Record it now as work Software Asset Management owns, and assign a named owner once Software Asset Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Software Asset Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Source-to-Pay forwards software license to Software Asset Management to approve requisitions, but Software Asset Management does not yet have anyone assigned to approve requisitions, so this step has no owner. How should it be handled?
- a) Record it now as work Software Asset Management owns, and assign a named owner once Software Asset Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Software Asset Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

## Optional (will not hold up the build)

q10: The four master objects modeled today are the headline set. Should I research and add the deeper vendor-surface substrate (38 net-new masters seen across Flexera, Snow, USU, ServiceNow SAM Pro, Anglepoint, Certero, and Eracent), covering catalog and discovery detail (editions, versions, publishers, normalization rules, EOL calendars, discovery runs, SWID tags), entitlement depth (license contracts, terms, metrics, keys, entitlement pools, use rights), metering and compliance positions (usage metering, reclamation, effective license positions, Oracle and SAP and IBM exotica), audit evidence and findings, and renewals? Loading these is what would trigger the re-split to 6 modules in q1. (yes/no)

Recommended: yes, but additive and after the modules exist. The set is first-class across the flagship vendors, though it still wants a verification pass and the q1 shape decision first.

a10:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2.submitlock q3=B2-S2.singleapprover q4=B2-S3 q5=B2-S4 q6=B2-S5 q7=B2-S6 q8=B2-S7 q9=B2-S8 q10=B3-S1 q11=B2-B9D-OWN-1258 q12=B2-B9D-OWN-1134 q13=B2-B9D-OWN-1312 q14=B2-B9D-OWN-809 | domain_id=52 -->
