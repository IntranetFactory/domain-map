# Food Traceability and Recall Management (FOOD-TRACE): questions waiting for you

## What this domain is
Track every lot from farm to shelf so you can answer a trace request fast and run a clean recall when something goes wrong. Capture the critical tracking events and key data elements that FSMA 204 requires, stitch them into lot genealogy across splits, merges, and transformations, and keep supplier certifications and provenance evidence current. When a problem surfaces, classify the recall, notify the right parties, file with the agencies, and prove the whole chain held up under audit.

---

q1: (answer this first) Which regulations should be linked to Food Traceability, and how deep should the set go?

- a) Minimum set: FSMA 204 (Food Traceability Final Rule), FSMA Preventive Controls Rule, EU 1169/2011, Canada SFCR, USDA FSIS Country of Origin Labeling, FDA Bioterrorism Act recordkeeping.
- b) Extended set: the minimum set plus GS1 EPCIS 2.0 (industry standard, not statute), Codex Alimentarius (international guideline), California Prop 65, and state-level origin labeling.
- c) A custom list you supply.

Recommended: a. These are the statutory anchors that actually drive demand in this market, and most of them still need their underlying regulation records created first. This is the largest remaining structural gap for a regulation-driven domain, so settling scope here unblocks the rest of the regulatory work.

a1:

---

q2: When the supplier-lifecycle domain (SUP-LIFE) later builds its own modules, which side should keep catalog mastership of supplier certifications?

- a) Food Traceability keeps master; SUP-LIFE consumes or embeds the certification when it modularizes.
- b) SUP-LIFE takes master on modularization; Food Traceability demotes its copy to an embedded master.
- c) Split into two records: a procurement-shaped certification (SUP-LIFE master) and a food-safety-shaped variant (Food Traceability master).

Recommended: a. Food Traceability is the only current master, so keeping it avoids a re-home; the SUP-LIFE audit just has to honor this so a second master never appears. Vendor evidence is genuinely split, which is why this is your call.

a2:

---

q3: Should the recall-execution capability point at a function different from the domain's Governance, Risk and Compliance owner?

- a) No override; the domain's existing RACI is sufficient.
- b) Add an override pointing recall execution at a GRC-Crisis function.
- c) Add an override pointing recall execution at a QA-Recall function.

Recommended: a. Keep the domain RACI unless you know recall execution is genuinely owned by a separate crisis or QA function; an override is easy to add later if it is.

a3:

---

q4: There appear to be two near-identical handoffs from the farm-management domain into Food Traceability on the same harvest-record-created event. What is the canonical handling?

- a) Delete the duplicate handoff (and its orphaned trigger event), reverting the matching process-tag row.
- b) Repoint the duplicate to a distinct sub-event (a lot-origin-emitted variant for the Food Traceability side).
- c) Keep both as distinct payload interpretations.

Recommended: a. The two look like a pre-modularization duplicate, and cleaning it up keeps later process tagging accurate. This deletes a record (and cascades through the process tag), so it needs your sign-off.

a4:

---

q5: Should a recall event be frozen once it is initiated, so the record locks on initiation? (yes/no)

Recommended: yes. A recall locks its scope the moment it starts, so the record should not stay freely editable. This sets a flag that is currently off, so it needs your confirmation.

a5:

---

q6: Should a recall event require a single named approver, reflecting the Class I sign-off step? (yes/no)

Recommended: yes. A Class I recall carries a formal sign-off, so a single accountable approver fits. This sets a flag that is currently off, so it needs your confirmation.

a6:

---

q7: Should a traceability lot be frozen once created, so lot identity is immutable after creation? (yes/no)

Recommended: yes. Lot identity is the anchor for every downstream event and should not change once issued. This sets a flag that is currently off, so it needs your confirmation.

a7:

---

q8: Should a supplier certification be frozen once it is in effect, so cert validity locks rather than being quietly edited? (yes/no)

Recommended: yes. A certification's validity window is evidence and should be stable once active. This sets a flag that is currently off, so it needs your confirmation.

a8:

---

q9: Should I load the drafted statutory and vendor synonyms (aliases) for the four Food-Traceability-only masters, using the proposed alias types? (yes/no)

Recommended: yes. The synonyms are well established (CTE and KDE are mandatory FSMA abbreviations), and the drafted starters just need your approval on the alias type and any industry or solution binding before loading.

a9:

---

q12: Core Financial Management forwards recall event to Food Traceability and Provenance to manage product recalls and regulatory audits, but Food Traceability and Provenance does not yet have anyone assigned to manage product recalls and regulatory audits, so this step has no owner. How should it be handled?
- a) Record it now as work Food Traceability and Provenance owns, and assign a named owner once Food Traceability and Provenance sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Food Traceability and Provenance decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

q13: Food Safety and Quality Management forwards recall event to Food Traceability and Provenance to initiate recall, but Food Traceability and Provenance does not yet have anyone assigned to initiate recall, so this step has no owner. How should it be handled?
- a) Record it now as work Food Traceability and Provenance owns, and assign a named owner once Food Traceability and Provenance sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Food Traceability and Provenance decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Governance, Risk and Compliance forwards critical tracking event to Food Traceability and Provenance to manage traceability data, but Food Traceability and Provenance does not yet have anyone assigned to manage traceability data, so this step has no owner. How should it be handled?
- a) Record it now as work Food Traceability and Provenance owns, and assign a named owner once Food Traceability and Provenance sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Food Traceability and Provenance decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: Food Safety and Quality Management forwards supplier certification to Food Traceability and Provenance to certify and validate suppliers, but Food Traceability and Provenance does not yet have anyone assigned to certify and validate suppliers, so this step has no owner. How should it be handled?
- a) Record it now as work Food Traceability and Provenance owns, and assign a named owner once Food Traceability and Provenance sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Food Traceability and Provenance decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: Supplier Lifecycle Management forwards supplier certification to Food Traceability and Provenance to monitor or Manage supplier information, but Food Traceability and Provenance does not yet have anyone assigned to monitor or Manage supplier information, so this step has no owner. How should it be handled?
- a) Record it now as work Food Traceability and Provenance owns, and assign a named owner once Food Traceability and Provenance sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Food Traceability and Provenance decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

q17: Food Safety and Quality Management forwards traceability lot to Food Traceability and Provenance to monitor quality of product delivered, but Food Traceability and Provenance does not yet have anyone assigned to monitor quality of product delivered, so this step has no owner. How should it be handled?
- a) Record it now as work Food Traceability and Provenance owns, and assign a named owner once Food Traceability and Provenance sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Food Traceability and Provenance decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

q18: Audit Management forwards critical tracking event to Food Traceability and Provenance to manage compliance audits, but Food Traceability and Provenance does not yet have anyone assigned to manage compliance audits, so this step has no owner. How should it be handled?
- a) Record it now as work Food Traceability and Provenance owns, and assign a named owner once Food Traceability and Provenance sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Food Traceability and Provenance decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a18:

---

q19: Audit Management forwards key data element to Food Traceability and Provenance to maintain records for regulatory agencies, but Food Traceability and Provenance does not yet have anyone assigned to maintain records for regulatory agencies, so this step has no owner. How should it be handled?
- a) Record it now as work Food Traceability and Provenance owns, and assign a named owner once Food Traceability and Provenance sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Food Traceability and Provenance decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a19:

---

## Optional (will not hold up the build)

q10: Six extra objects show up across the flagship Food Traceability vendors (trace-request queries, chain-of-custody records, provenance attestations, recall communications logs, regulatory filings, and traceback or mock-trace exercises). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are common across the vendor set, though each wants a verification pass first.

a10:

---

q11: Four objects sit on a domain boundary and need a mastership or scope call (GS1 identifiers, FSMA Food Traceability List classifications, consumer-facing provenance certificates, and per-shipment certificates of analysis). Should I research whether each belongs in Food Traceability or in a neighboring domain (PIM/MDM, FSQM, or a separate consumer-storytelling market)? (yes/no)

Recommended: yes, but additive and non-blocking. Each is first-class in some vendors and deferred to another system in others, so the boundary call is worth confirming before any load.

a11:

---

<!-- agent map, ignore: q1=B2-3 q2=B2-2 q3=B2-4 q4=B2-5 q5=B2-pattern-flag-review.recall_lock q6=B2-pattern-flag-review.recall_approver q7=B2-pattern-flag-review.lot_lock q8=B2-pattern-flag-review.cert_lock q9=B2-alias-tuple-binding q10=B3-M1-TRACEABILITY-QUERIES+B3-M2-CHAIN-OF-CUSTODY+B3-M3-PROVENANCE-ATTESTATIONS+B3-M4-RECALL-COMMUNICATIONS+B3-M5-REGULATORY-FILINGS+B3-M6-TRACEBACK-EXERCISES q11=B3-gs1-identifiers+B3-ftl-classifications+B3-provenance-certificates+B3-coa-records q12=B2-B9D-OWN-37 q13=B2-B9D-OWN-204 q14=B2-B9D-OWN-556 q15=B2-B9D-OWN-805 q16=B2-B9D-OWN-815 q17=B2-B9D-OWN-818 q18=B2-B9D-OWN-1570 q19=B2-B9D-OWN-1830 | domain_id=155 -->
