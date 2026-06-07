# Clinical Device Management (CLIN-DEV): questions waiting for you

## What this domain is
Keep every medical device safe, maintained, and ready for patient care.

Run one trustworthy register of the medical equipment in clinical use, from infusion pumps and ventilators to monitors and imaging systems. Schedule and prove preventive maintenance, manage calibration, and validate sterilization so equipment stays accurate and safe at the bedside. When a recall or adverse event hits, isolate affected units fast, drive the response to closure, and produce the evidence accreditors and regulators expect. Clinical engineering teams cut downtime, stay inspection-ready, and protect patients without drowning in paperwork.

---

q1: (answer this first) How should Clinical Device Management be split into modules (the sub-areas of the product)?

- a) Two modules: Inventory (medical devices, maintenance logs, calibration records, sterilization cycles, clinical-engineering work orders) plus Safety and Vigilance (device recalls, device incident reports).
- b) One module covering all seven masters together.
- c) Three modules: same as (a) but pull sterilization cycles into a dedicated Sterile Processing module, for hospitals where the Sterile Processing Department is a separate budget owner.

Recommended: a. The two-module split is the minimal shape that unblocks the build, and it cleanly separates the day-to-day asset work from the regulatory-reporting surface. This choice drives every module, capability, lifecycle owner, and handoff attribution below it, so it unlocks the rest of the build.

a1:

---

q2: The domain's internal business-logic note contains a forbidden em-dash. How should it be fixed?

- a) Replace the em-dash with a comma (the note then reads "...for medical devices, mostly declarative rules over inventory.").
- b) Leave it for now and fold it into a catalog-wide em-dash sweep later.
- c) You supply the exact replacement wording.

Recommended: a. The wording predates the em-dash ban and a comma reads naturally. This overwrites a non-empty field, so it needs your sign-off.

a2:

---

q3: The domain's owning business function is currently set to Research and Development, which reads like a medical-device-manufacturer assumption rather than a hospital one. How should ownership be set?

- a) Repoint to IT Operations (where hospital Clinical Engineering usually reports).
- b) Repoint to Business Operations or Facilities and Real Estate.
- c) Add Governance, Risk and Compliance as an additional owner for the recall and adverse-event surface.
- d) Leave Research and Development and re-scope this catalog entry to medical-device manufacturers.

Recommended: a. Hospital Clinical Engineering most often sits under IT, and that matches the asset-management masters here. Re-pointing the existing owner row is destructive, so it needs your call.

a3:

---

q4: Should device incident reports be treated as carrying personal data, because adverse-event reports include a patient identifier? (yes/no)

Recommended: yes. Adverse-event reports name a patient, so privacy and retention rules apply. This overwrites a current flag, so it needs your confirmation.

a4:

---

q5: Should device incident reports be frozen once filed with a regulator, so a filed report cannot be quietly edited? (yes/no)

Recommended: yes. A report submitted to a regulator should be an immutable record. This overwrites a current flag, so it needs your confirmation.

a5:

---

q6: Should device calibration records be frozen once filed, to preserve audit-trail integrity (21 CFR Part 11)? (yes/no)

Recommended: yes. Calibration evidence is exactly what inspectors expect to be tamper-evident. This overwrites a current flag, so it needs your confirmation.

a6:

---

q7: Should a device recall require a single named recall coordinator to approve its issuance? (yes/no)

Recommended: yes. Issuing a recall is a high-stakes action that warrants one accountable approver. This overwrites a current flag, so it needs your confirmation.

a7:

---

q8: The regulatory list mixes hospital-side rules with manufacturer-only ones (for example FDA 510(k) and QSR 21 CFR 820), while the underlying objects all look hospital-side. How should the scope be handled?

- a) Treat this as hospital-side and remove the manufacturer-only regulations.
- b) Keep all seven regulations and clarify the scope in the catalog description.
- c) Wait for a separate Medical Device QMS domain to be promoted, then re-scope.

Recommended: a, if this entry targets hospital clinical engineering. Removing regulations is destructive, so it needs your sign-off; pick (b) if you want the entry to also cover manufacturer post-market surveillance.

a8:

---

q9: Two work-order and calibration handoffs into ITSM carry an "incident" payload, but the related links point at "service request" instead. Which is correct?

- a) Re-target the two handoffs to service requests (treat clinical-engineering work as a service-desk request).
- b) Re-target the two relationship rows to service incidents (treat the work as an incident).
- c) Split them: the work-order handoff goes to service requests, the overdue-calibration handoff goes to service incidents (the time-critical one).

Recommended: a. Clinical-engineering work arriving in ITSM is normally a service request, not a paged incident. Either fix overwrites existing rows, so it needs your call.

a9:

---

q10: Which process tag should the device-recall handoff to GRC carry? Two candidates were proposed, so this is your pick.

- a) Manage product recalls and regulatory audits (the broader Level 2 process).
- b) Initiate recall (the more specific Level 3 process).
- c) Tag both.
- d) Defer to a later discovery pass.

Recommended: b. "Initiate recall" matches a recall-issued event most precisely; choose (a) if you prefer the broader bucket.

a10:

---

## Optional (will not hold up the build)

q11: Flagship clinical-engineering products carry a few deeper objects that the current model does not: a device model master (the recallable model versus the individual unit), a device location master (room or department, for dispatch and recall isolation), a device service-contract master (warranty and response-SLA), and recall-effectiveness reviews (units accounted for, time-to-isolation). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Each still wants a quick vendor-evidence check first.

a11:

---

<!-- agent map, ignore: q1=B2-S2 q2=B2-S1 q3=B2-S3 q4=B2-S4.incidentpii q5=B2-S4.incidentlock q6=B2-S4.caliblock q7=B2-S4.recallapprover q8=B2-S5 q9=B2-S6 q10=B2-S11b q11=B3-DEVICE-MODELS+B3-DEVICE-LOCATIONS+B3-DEVICE-SERVICE-CONTRACTS+B3-RECALL-EFFECTIVENESS | domain_id=50 -->
