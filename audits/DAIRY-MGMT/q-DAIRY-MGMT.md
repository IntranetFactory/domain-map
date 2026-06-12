# Dairy Herd Management (DAIRY-MGMT): questions waiting for you

## What this domain is
Run the operational record-keeping for a dairy herd, from individual cows through the milking parlor to the bulk tank. Track each cow's lactation, breeding, and health events; capture every milking and the milk-quality test results behind it; manage feed rations; and stage finished milk for pickup. The data feeds traceability, food-safety, finance, and compliance downstream.

---

q1: For lactation records, which actor verb should link them to users (the other seven masters already carry a users edge, and this is the only one without)?

- a) "is recorded by" (treat it like milkings, attributed to the operator who records it).
- b) "is opened by" (system attribution, since a lactation cycle opens from cow state rather than a discrete operator action).
- c) Accept the absence and document it as a deliberate, system-opened omission.

Recommended: c. The finding notes no clean single-actor verb exists, so documenting the deliberate omission is the honest call; pick (a) or (b) only if an operator truly owns the record.

a1:

---

q2: For the milkings master, which is flagged as the canonical bare-word "milking" but has an empty rationale, should you author the missing naming-authority rationale now (anchored in the parlor module) rather than leave it blank?

- a) Author the rationale now, claiming canonical authority for DAIRY-MGMT.
- b) Defer and leave the rationale empty for now.

Recommended: a. The row is already flagged canonical, so filling in why keeps the naming authority defensible; this overwrites an empty field, so it needs your wording.

a2:

---

q3: Should cow health events be flagged as containing personal content, given they hold drug-withdrawal data that touches FDA AMDUCA and state veterinary practice rules? (yes/no)

Recommended: no (keep it false). Cows are not persons, so strictly the personal-content flag does not apply; set it true only if you want the data treated with PII-grade handling because it is veterinary-PII adjacent.

a3:

---

q4: Should the milk-quality capability be owned by a Quality / Compliance business function instead of Business Operations?

- a) Load the override so Quality / Compliance owns it.
- b) Keep Business Operations as the canonical owner.

Recommended: a. The milk-quality area sits closer to Quality / Compliance than to general Operations, so the override reflects how the work is actually governed.

a4:

---

q5: (answer this first) Should the six agent-drafted cross-domain handoff process mappings be approved, so the catalog-quality score can move off zero?

- a) Approve all six (milk-quality-test-failed to quality testing; cow-health-treatment to compliance management; bulk-shipment-dispatched and milking-completed to production-record and lot traceability; breeding-event-recorded and feed-ration-changed to traceability data).
- b) Approve only a subset (name which).
- c) Decline.

Recommended: a, if you agree the process mappings are correct. The catalog-quality headline is the approved count, so approving these is what unblocks the 0% quality gate; only you can flip them to approved.

a5:

---

q6: Should you load the dairy regulations now (FDA Grade A Pasteurized Milk Ordinance, the FARM animal-care program, DHIA testing standards, and state agriculture dairy-inspection rules), given the domain currently has none linked?

- a) Load them now as new regulation rows plus domain links.
- b) Defer until a specific capability needs them.

Recommended: a. This is a heavily regulated market and the links are currently empty, so loading the headline rules closes a real gap; defer only if you would rather wait for the bulk-tank and somatic-cell-count entities to land first.

a6:

---

## Optional (will not hold up the build)

q7: Across the flagship herd-record and parlor vendors, several extra first-class entities recur (cow groups / pens, heat detections and pregnancy checks, bulk tanks and milk-meter readings, feed ingredients and TMR batches, somatic cell counts and withdrawal-period holds, and cow-lifecycle events like dry-offs, calvings, and culling decisions). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the current build settles. Some of these (bulk tanks, somatic cell counts) also inform the regulations decision above.

a7:

---

q8: Two FIN handoffs (lactation-record opened, feed-ration changed) plus the newer cow-lifecycle-changed handoff have no clean cross-industry process match and need custom dairy-specific process authoring (feed-cost-per-liter and dairy KPI rollups). Should I author those custom process mappings in a later research pass? (yes/no)

Recommended: yes, but additive and non-blocking; these are dairy-specific KPIs with no off-the-shelf classification, so they wait for a dedicated authoring pass.

a8:

---

<!-- agent map, ignore: q1=B1A-S11 q2=B2-3 q3=B2-4 q4=B2-6 q5=B2-8 q6=B2-7 q7=B3-1+B3-2+B3-3+B3-4+B3-5+B3-6 q8=B3-7+B3-8 | domain_id=156 -->
