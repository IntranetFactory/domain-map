# Healthcare Patient Operations (HC-PATIENT): questions waiting for you

## What this domain is
The clinician-facing front-of-house of healthcare delivery: scheduling, encounter capture, care coordination, ordering, and clinical documentation. It runs the day-to-day patient workflow across six record types (appointments, clinical encounters, care plans, referrals, clinical orders, and clinical notes), and hands signals off to billing, customer service, and clinical-device safety. Every record here holds protected health information, so the domain sits squarely under HIPAA.

---

q1: (answer this first) How should Healthcare Patient Operations be split into modules (the sub-areas of the product)?

- a) Two modules: Scheduling (patient appointments and referrals) and Clinical (encounters, care plans, clinical orders, clinical notes).
- b) Four modules: Scheduling, Orders, Clinical Documentation, and Care Coordination, for finer-grained deployability for smaller ambulatory practices.
- c) Other (specify).

Recommended: a. The two-module split is the audit's default proposal and the minimal shape that unblocks the build today; the four-module split only pays off for smaller practices that want to ship the pieces separately. This choice drives the build, the capability count, every per-module handoff wiring, and the lifecycle-state attribution below it, so it unlocks the rest of the build.

a1:

---

q2: Which business function should own this domain? It is currently attributed to Business Operations, which is a weak fit for a clinical-workflow product.

- a) Keep Business Operations as a generic placeholder.
- b) Add a new top-level Clinical Operations business function (sets a precedent for industry-specific functions on the standard 20-function spine).
- c) Re-attribute to Customer Service (unusual framing, providers as a service).

Recommended: b. Healthcare delivery is owned by clinical operations (providers, nurses, care coordinators), so a dedicated function is the most accurate, with the caveat that it sets a precedent. Re-attribution overwrites an existing owner row, so it needs your call.

a2:

---

q3: A handoff currently routes a placed clinical order to the IT incident system, which is semantically wrong (orders go to lab, imaging, or pharmacy fulfillment, not IT incidents). How should it be handled?

- a) Keep it as a degraded interim model until real fulfillment domains (EHR, pharmacy, lab) ship.
- b) Delete it now and let the later module backfill reconstruct the correct wiring.
- c) Re-author it to target a future healthcare fulfillment domain.

Recommended: b. Deleting it removes the wrong shape cleanly; the correct source-module wiring gets reconstructed when the domain is built. This is a destructive change, so it needs your sign-off.

a3:

---

q4: The yearly cost band is currently set to the top tier ($500k to $2M). Scoped as patient operations only (no full EHR, no revenue cycle, no payer side), a lower band may be more accurate. Adjust it?

- a) Keep the top tier.
- b) Drop one tier ($100k to $500k), matching an ambulatory practice without full EHR.
- c) Split it when modules ship (a lighter small-practice module versus the full suite).

Recommended: b. As scoped here the domain is closer to an ambulatory-practice footprint than a full hospital EHR. Changing the band overwrites an existing value, so it needs your confirmation.

a4:

---

q5: Should this domain own the central `patients` demographic record now, or wait until a dedicated EHR domain exists?

- a) Own `patients` here now (preempts a future EHR domain).
- b) Wait until EHR is loaded, then consume and embed `patients` from it.
- c) Load `patients` here now as a placeholder and flag it for re-attribution when EHR ships.

Recommended: b. Owning it here now risks a later move once EHR lands; embedding it from EHR keeps the boundary clean. Note that this answer also gates several of the optional clinical-record candidates below, which all reference `patients`.

a5:

---

q6: Two outbound handoffs (a no-show and a new referral) currently flow into the customer-service case queue. Is the CRM the right patient-engagement layer here?

- a) Keep the current customer-service routing (correct when the CRM is the patient-engagement layer, as in Salesforce Health Cloud deployments).
- b) Re-target them to a new patient-intake module with its own patient-inquiry record.
- c) Defer the decision until EHR and telehealth domains land.

Recommended: a. The existing relationship rows already back this routing and it is a valid pattern when the CRM is the engagement layer, so keeping it avoids destructive rework. Pick (b) or (c) only if you do not run the CRM as your patient-engagement front end.

a6:

---

q7: When the modules ship, should the six master records be migrated to the module-level mapping in a single load, or staged across two loads?

- a) Author the module-level mapping for all six masters in the same load that creates the modules (default).
- b) Stage it in two loads: modules first, mapping second.

Recommended: a. The rollup is derived from the module-level mapping once modules exist, so doing both in one load keeps them consistent. Low stakes, technical only.

a7:

---

q8: Should all six record types be marked as holding personal data (PHI), so they fall under HIPAA retention and privacy handling? (yes/no)

Recommended: yes. Every record here holds protected health information. This flips an existing value, so it needs your confirmation.

a8:

---

q9: Should clinical orders and clinical notes be frozen once placed and signed, so they cannot be retroactively edited and any change requires a new record? (yes/no)

Recommended: yes. A placed order and a signed note are fixed clinical artifacts that downstream teams rely on. This flips an existing value, so it needs your confirmation.

a9:

---

q10: Should a clinical note require a single signing provider to approve it? (yes/no)

Recommended: yes. A clinical note is signed by one responsible provider, which is the standard single-approver shape. This flips an existing value, so it needs your confirmation.

a10:

---

q11: The "appointment scheduled" event currently has no subscriber, so its publish leg is orphaned. How should it be handled?

- a) Keep the event and author its outbound handoff later, once a downstream target (telehealth or EHR) exists.
- b) Delete the event now.

Recommended: a. The scheduled event is the canonical signal for patient communication, calendar holds, eligibility checks, and care-team notification, so it is worth keeping and wiring up once a target domain lands. Deleting it is destructive and would lose that signal, so option (b) needs your sign-off.

a11:

---

## Optional (will not hold up the build)

q12: Beyond the six records modeled today, flagship EHR vendors carry a deeper clinical substrate (problem list, allergies, active medications, immunizations, vitals, coded diagnoses, coded procedures, patient consents, care-team assignments, patient communications, lab and imaging results, prior authorizations, charge captures or superbills, and appointment-slot templates). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and best done after the modules exist and after the `patients` boundary in q5 is settled, since most of these reference the patient record.

a12:

---

q13: Should I add a patient self-service portal as a starter module (online appointment booking, secure messaging, viewing results)? (yes/no)

Recommended: yes, but additive. As a starter it would never master records, only embed and consume them.

a13:

---

q14: Should I tag the additional US federal healthcare regulations onto this domain (substance-use-disorder record confidentiality under 42 CFR Part 2, the 21st Century Cures Act information-blocking rule, and the CMS Interoperability and Patient Access rule)? (yes/no)

Recommended: yes. All three are mandatory federal rules for most US patient-operations deployments. Additive and non-blocking.

a14:

---

<!-- agent map, ignore: q1=B2-1-MODULE-SPLIT+B3-M1 q2=B2-2-OWNER-FUNCTION q3=B2-3-HANDOFF-901 q4=B2-4-COST-BAND q5=B2-5-PATIENTS-MASTER+B3-E1 q6=B2-6-CUSTOMER-CASES-PAYLOAD q7=B2-7-DMDO-MIGRATION q8=B1A-B4-PATTERN-FLAGS.pii q9=B1A-B4-PATTERN-FLAGS.submitlock q10=B1A-B4-PATTERN-FLAGS.singleapprover q11=B1A-B9-ORPHAN-EVENT q12=B3-E2+B3-E3+B3-E4+B3-E5+B3-E6+B3-E7+B3-E8+B3-E9+B3-E10+B3-E11+B3-E12+B3-E13+B3-E14+B3-E15 q13=B3-M2 q14=B3-R1+B3-R2+B3-R3 | domain_id=45 -->
