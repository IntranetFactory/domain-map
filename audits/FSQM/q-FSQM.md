# Food Safety and Quality Management (FSQM): questions waiting for you

## What this domain is

FSQM is the food-safety and quality management area: it runs HACCP plans and critical control points, captures CCP monitoring measurements, tracks food-safety incidents through to recall, and manages allergen programs, environmental monitoring, and sanitation records. It also leans on supplier certifications, audit findings, and compliance obligations so a food maker can prove it meets FSMA and the GFSI-recognized schemes (SQF, BRC GS, FSSC 22000, IFS Food). The three modules already exist (HACCP and CCP, Hygiene Control, and Audit and Supplier); the questions below settle who owns a few contested entities and sign off the remaining data loads.

---

q1: (answer this first) Who masters food-safety certification audits (the SQF / BRC GS / FSSC certification-audit event itself, not the generic findings)?

- a) FSQM masters them, placing a certification-audit entity in the Audit and Supplier module (which today masters nothing of its own).
- b) The Audit domain keeps mastering audits, and FSQM stays a contributor.
- c) Both: FSQM masters food-safety-specific certification audits, and the Audit domain masters generic internal audits.

Recommended: a. The flagship food vendors (SafetyChain, Safefood 360) lean toward FSQM mastering the certification audit, and it anchors the Audit and Supplier module on its own master rather than borrowed rows. This choice shapes what the Audit and Supplier module is built around, so it unlocks the rest.

a1:

---

q2: How should food fraud (VACCP) and food defense (TACCP) be modeled?

- a) One vulnerability_assessments master with a type field (VACCP or TACCP).
- b) Two separate masters: food_fraud_assessments and food_defense_plans.
- c) Defer entirely (most small and mid-size food makers do not run formal VACCP or TACCP).

Recommended: b. FSMA treats them as statutorily distinct (the Intentional Adulteration Rule mandates a Food Defense Plan; the Preventive Controls Rule mandates a Food Fraud Vulnerability Assessment), and the flagship vendors model them separately. Pick (c) if your buyers are mostly smaller makers without formal programs. This answer also settles the matching research idea, so it is not asked again below.

a2:

---

q3: Should the audit-prep capability be re-pointed away from the broad GRC compliance owner to a more specific sub-function?

- a) Yes, override it to a GRC-Audit sub-function.
- b) Yes, override it to a Quality sub-function under Business Operations.
- c) No, leave it on the GRC default.

Recommended: a. Audit prep maps more precisely to a GRC-Audit sub-function than to the broad GRC compliance owner. Low stakes either way.

a3:

---

q4: For the seven food-safety masters, which of the three pattern flags (holds personal data, locks on submit, single approver) should be turned on?

- a) Apply the audit's likely-true proposals: lock HACCP plans on submit and require a single approver; lock food-safety incidents on submit; require a single approver on allergen programs; leave the rest off.
- b) Author a different per-master set (you specify which flags on which masters).
- c) Leave all three flags off on all seven masters.

Recommended: a. These match how a PCQI signs and locks a HACCP plan on activation, how an incident locks on close, and how QA owns the allergen program. The flag values are master-data judgment, so they are not applied without your sign-off.

a4:

---

q5: Which vendor and statutory synonyms (aliases) should be loaded onto the masters?

- a) Author the full cluster from SafetyChain, TraceGains, Safefood 360, FSMA, and GFSI-scheme terminology (the agent drafts the table for your review).
- b) Author only the statutory anchors (for example "Food Safety Plan", and "EMP" / "PEM" for environmental samples) and defer the vendor-specific synonyms.
- c) Defer entirely.

Recommended: a. The synonyms are real (for example CCP measurements are "Check Records" in SafetyChain, "Monitoring Forms" in Safefood 360, "Quality Records" in TraceGains), and a full alias set makes the catalog match how each vendor names things. Each alias still needs a type and a linked vendor resolved per row before loading.

a5:

---

q6: Fifteen draft cross-domain handoff process tags are sitting unapproved. Which do you want approved? (Two handoffs each carry two overlapping tags and need a de-duplication call.)

- a) Approve all fifteen, treating the two overlapping tags on each duplicated handoff as additive.
- b) Approve the curated layer only and reject the two duplicate tags.
- c) Approve the duplicate layer and delete the original tag on the two affected handoffs.
- d) Reject all fifteen and re-curate later.

Recommended: b. It clears the approval backlog while removing the overlap, and it avoids any deletion. Approving these flips their status from draft, which requires your sign-off; option (c) additionally deletes rows, so it would need explicit approval.

a6:

---

## Optional (will not hold up the build)

q7: Four additive food-safety entities show up consistently across the flagship vendors: corrective action records (CARs that close out a CCP deviation or EMP positive), verification records (the SQF / BRC GS verification log distinct from monitoring), mock recalls (traceback-exercise records), and environmental monitoring programs (the EMP program shell above individual samples). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the contested entities above are settled. All four are first-class in multiple flagship products and fit the existing modules.

a7:

---

q8: FSMA's Preventive Controls Rule mandates a Food Safety Plan that supersedes the legacy HACCP-only contract. How should that be modeled?

- a) Add a new food_safety_plans master above the existing HACCP plans.
- b) Rename the existing HACCP plans master to food_safety_plans.
- c) Leave it as is for now.

Recommended: a. A new umbrella master preserves the existing HACCP plans while capturing the FSMA terminology shift, since one Food Safety Plan can govern several HACCP plans. Additive and non-blocking.

a8:

---

q9: Per-shipment certificates of analysis (COA records) are a distinct workflow from supplier certifications and appear in several flagship food-supplier programs. Should I research and add COA records, including confirming whether FSQM, Food Traceability, or Procurement should own them? (yes/no)

Recommended: yes, pending a quick check of the canonical owner (it may belong in Food Traceability or Procurement rather than FSQM). Additive and non-blocking.

a9:

---

<!-- agent map, ignore: q1=B2-GFSI-AUDITS-MASTERSHIP q2=B2-VACCP-TACCP+B3-VACCP-TACCP q3=B2-AUDIT-PREP-OVERRIDE q4=B2-PATTERN-FLAGS q5=B2-ALIAS-ARBITRATION q6=B2-APQC-APPROVAL q7=B3-CORRECTIVE-ACTION-RECORDS+B3-VERIFICATION-RECORDS+B3-MOCK-RECALLS+B3-EMP-PROGRAMS q8=B3-FOOD-SAFETY-PLANS q9=B3-COA-RECORDS | domain_id=157 -->
