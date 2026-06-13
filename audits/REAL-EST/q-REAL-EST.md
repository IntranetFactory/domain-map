# Real Estate and Workplace Management (REAL-EST): questions waiting for you

## What this domain is
The umbrella corporate-real-estate, workplace, and facilities domain: properties, leases, spaces, occupancy, maintenance, capital projects, and utility consumption. It runs the full life of your owned and leased portfolio, plans and tracks how people use the space, keeps buildings maintained, and captures meter data that feeds sustainability reporting. It is a horizontal corporate function consumed across every industry, with enterprise (IWMS) and mid-market (CAFM) tiers underneath it.

---

q1: (answer this first) Are REAL-EST `real_estate_properties` and IWMS `locations` the same thing at two levels of detail, or genuinely separate records?

- a) Distinct masters, keep them as they are today.
- b) IWMS `locations` is the canonical layer and REAL-EST `real_estate_properties` becomes an embedded master of it.
- c) The reverse: REAL-EST `real_estate_properties` is canonical and IWMS `locations` embeds it.

Recommended: b. Per Rule #16 the infrastructure-master (the global location registry) is usually the canonical layer that property records embed. Settle this first, since picking (b) or (c) reshapes which module masters the building record and ripples into the portfolio module.

a1:

---

q2: CAFM is an empty sub-domain (a domain row with no modules). What should happen to it?

- a) Build it out as a starter-kit / lite variant of REAL-EST.
- b) Leave it dormant: keep the domain row for discoverability but add no modules.
- c) Merge it into REAL-EST and delete the sub-domain entry.

Recommended: a. CAFM's light-tier mid-market positioning fits a starter-kit variant; this can be scheduled as its own pass once REAL-EST is settled.

a2:

---

q3: Five cross-domain handoffs need a target master on the partner domain before the relationship can be wired (work orders to FSM, meter readings to ESG, spaces to HCM, properties to RE-CRE, and properties to RE-INVEST). Only the EAM link is wired today. Should I surface the target master IDs on each neighbor so the relationship rows can be authored?

- a) Yes, surface the partner target masters now (RE-CRE and RE-INVEST have no masters yet, so those two may need their own audits first).
- b) Wait until each neighbor domain is audited and only wire EAM for now.

Recommended: a. Surfacing the targets now lets the cross-domain edges land as the neighbor masters appear, and flags the RE-CRE / RE-INVEST gaps early.

a3:

---

q4: Three older substring-matched process tags still sit alongside the higher-confidence curated tags on the same handoffs. May I clean them up by deleting two of them (on the capital-project and property-strategy handoffs) and upgrading the third to curated?

- a) All: delete both and upgrade the third.
- b) Selective: tell me which to delete or upgrade.
- c) Skip: leave all three in place.

Recommended: a. The curated tags already carry the correct, higher-confidence mappings, so the leftover substring rows are redundant. Two of these are deletes, so this needs your sign-off before I run it.

a4:

---

q5: Should a property lease freeze its terms once it is signed, so the agreed terms cannot be quietly edited afterward? (yes/no)

Recommended: yes. Signed lease terms are a fixed agreement, so locking them preserves an accurate record. This sets a pattern flag, so it needs your confirmation.

a5:

---

q6: Should a property lease require one named approver to sign it off? (yes/no)

Recommended: yes. A single accountable signing approver per lease is standard practice. This sets a pattern flag, so it needs your confirmation.

a6:

---

q7: Should a capital project freeze its charter once it is approved, so the approved scope cannot be edited in place? (yes/no)

Recommended: yes. The charter is the basis of the funding decision, so freezing it at approval keeps the record honest. This sets a pattern flag, so it needs your confirmation.

a7:

---

q8: Should a capital project require one named approver at its approval gate? (yes/no)

Recommended: yes. Capital spend normally passes a single accountable approval gate. This sets a pattern flag, so it needs your confirmation.

a8:

---

q9: Do facility work orders routinely hold personal data (such as a tenant contact or a technician name), so they should be treated as containing personal content under GDPR? (yes/no)

Recommended: yes. Work orders commonly carry named contacts, which are personal data. This sets a pattern flag, so it needs your confirmation.

a9:

---

q10: Do occupancy records hold personal data (such as badge data or who sat where), so they should be treated as containing personal content under GDPR? (yes/no)

Recommended: yes. Occupancy and badge data identify individuals and is PII under GDPR. This sets a pattern flag, so it needs your confirmation.

a10:

---

q14: Enterprise Asset Management forwards capital project to Real Estate and Workplace Management to measure financial returns on completed capital projects, but Real Estate and Workplace Management does not yet have anyone assigned to measure financial returns on completed capital projects, so this step has no owner. How should it be handled?
- a) Record it now as work Real Estate and Workplace Management owns, and assign a named owner once Real Estate and Workplace Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Real Estate and Workplace Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: ESG Management forwards utility meter reading to Real Estate and Workplace Management to evaluate environmental impact of products, services, and operations, but Real Estate and Workplace Management does not yet have anyone assigned to evaluate environmental impact of products, services, and operations, so this step has no owner. How should it be handled?
- a) Record it now as work Real Estate and Workplace Management owns, and assign a named owner once Real Estate and Workplace Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Real Estate and Workplace Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: Field Service Management forwards facility work order to Real Estate and Workplace Management to request unplanned maintenance, but Real Estate and Workplace Management does not yet have anyone assigned to request unplanned maintenance, so this step has no owner. How should it be handled?
- a) Record it now as work Real Estate and Workplace Management owns, and assign a named owner once Real Estate and Workplace Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Real Estate and Workplace Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

## Optional (will not hold up the build)

q11: Five extra entity candidates show up across the flagship facilities vendors (building systems, preventive maintenance schedules, space classifications, move requests, and chargebacks). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after a vendor-research pass; building systems and move requests also need a collision check against existing assets and desk bookings.

a11:

---

q12: Should visitor management be in scope for REAL-EST at all, or strictly delegated to the dedicated visitor-management domain?

- a) Delegate entirely to VIS-MGMT and consume it from REAL-EST.
- b) Bring some visitor capability into REAL-EST's facility operations.

Recommended: a. A dedicated visitor-management domain already exists, so delegating avoids duplicating the concept; a quick vendor review can confirm.

a12:

---

q13: REAL-EST meter readings should feed an ESG emissions record that probably does not exist yet. Should I surface this as a candidate for the ESG domain to own? (yes/no)

Recommended: yes. The emissions target belongs to ESG, so queuing it there keeps ownership clean; additive and non-blocking.

a13:

---

<!-- agent map, ignore: q1=B2-S5 q2=B2-S4 q3=B2-S6 q4=B2-S7 q5=B2-S3.leaseslock q6=B2-S3.leaseapprover q7=B2-S3.capitalcharter q8=B2-S3.capitalapprover q9=B2-S3.workorderpii q10=B2-S3.occupancypii q11=B3-S1+B3-S2+B3-S3+B3-S4+B3-S5 q12=B3-S7 q13=B3-S6 q14=B2-B9D-OWN-1412 q15=B2-B9D-OWN-1783 q16=B2-B9D-OWN-824 | domain_id=141 -->
