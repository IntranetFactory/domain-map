# Farm Management Information System (FMIS): questions waiting for you

## What this domain is
Records, plans, and analyzes farm operations across fields, crops, plantings, applications, harvests, inputs, prescriptions, and machinery telemetry. Unlike generic ERP, the work is weather, soil, and season bound and leans on satellite-imagery, IoT-sensor, and machinery-telemetry feeds (ISOBUS, CAN-bus, vendor-API integrations). The domain is split into four modules: Field and Crop Planning, Field Ops Records, Precision Ag, and Input Inventory and Analytics.

---

q1: (answer this first) Should field-application records freeze once recorded, so a recorded chemical or fertilizer application cannot be quietly edited? (yes/no)

Recommended: yes. Application records are statutory evidence, so once recorded they should freeze and any change should go through an explicit amendment workflow. This flips a flag that is currently false (and the pattern-flag calls here decide which lifecycle states get workflow gates), so it needs your confirmation.

a1:

---

q2: Should harvest records freeze once recorded, so completed yield records stay stable for the traceability lots they feed? (yes/no)

Recommended: yes. Yield records feed traceability lots and direct-sales availability, so they are evidence-bearing and should not change silently. This flips a flag that is currently false, so it needs your confirmation.

a2:

---

q3: Should a crop plan require a single named approver, so organic-certified operations have an accountable agronomist signing off the plan? (yes/no)

Recommended: yes. Organic-certified operations need an approving agronomist on the plan, and a single accountable approver is the normal shape. This flips a flag that is currently false, so it needs your confirmation.

a3:

---

q4: The eight farm-data objects each carry a notes line (for example "Geographic field boundary records owned by the FMIS.", "Per-season crop plan per field; rotation history."). Were those notes approved when the data was loaded, or auto-written by the loader?

- a) Approved at load time; leave all eight in place.
- b) Auto-written; clear all eight notes to empty and log the cleanup.
- c) Mixed; review each of the eight individually.

Recommended: b. The strings read as mechanical restatement of what each object is, which Rule #15 treats as auto-population rather than approved wording. Clearing a populated value is a destructive overwrite, so it needs your sign-off.

a4:

---

q5: Two handoff records (349 and 350) carry notes describing cross-vendor integration friction ("Cross-vendor stack: production-side and sales-side are virtually always separate vendors..."). Were those notes approved at load time, or auto-written?

- a) Approved at load time; leave them in place.
- b) Auto-written; clear them to empty.

Recommended: a. Both texts read as substantive editorial commentary rather than mechanical schema restatement, so they can legitimately stay if you remember approving the wording. Pick (b) only if they were auto-written, since clearing them is a destructive overwrite.

a5:

---

q6: The domain description and business-logic text both name "John Deere Operations Center API", a specific vendor product that Rule #18 does not allow there. How should they be rewritten?

- a) Strip the vendor reference and re-anchor on the open standards (ISOBUS, CAN-bus) plus generic "vendor-API integrations".
- b) Same as (a), and add a changelog entry naming the original load that introduced the violation.
- c) You propose the exact replacement wording for both fields.

Recommended: a. ISOBUS and CAN-bus are open standards and stay; only the John Deere product name is the violation, and Rule #18 grants no exception for it today. Rewriting non-empty prose is a destructive overwrite, so it needs your sign-off. Pick (b) if you also want an audit-trail entry.

a6:

---

q9: Farmer-Direct Sales Platform forwards harvest record to Farm Management Information System to maintain production records and manage lot traceability, but Farm Management Information System does not yet have anyone assigned to maintain production records and manage lot traceability, so this step has no owner. How should it be handled?
- a) Record it now as work Farm Management Information System owns, and assign a named owner once Farm Management Information System sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Farm Management Information System decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a9:

---

q10: Core Financial Management forwards crop plan to Farm Management Information System to create materials plan, but Farm Management Information System does not yet have anyone assigned to create materials plan, so this step has no owner. How should it be handled?
- a) Record it now as work Farm Management Information System owns, and assign a named owner once Farm Management Information System sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Farm Management Information System decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a10:

---

q11: Core Financial Management forwards ag input inventory to Farm Management Information System to order materials and services, but Farm Management Information System does not yet have anyone assigned to order materials and services, so this step has no owner. How should it be handled?
- a) Record it now as work Farm Management Information System owns, and assign a named owner once Farm Management Information System sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Farm Management Information System decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a11:

---

## Optional (will not hold up the build)

q7: Three missing data layers show up across the precision-ag and agronomy flagships: soil zones and soil-test results, field-level weather observations, and agronomic recommendations (planting-window, spray-window, and soil-zone advice). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Each is first-class in vendors like Climate FieldView, Trimble Ag Software, and Granular, though they still want a verification pass first; the agronomy surface may land as a fifth module later without rework.

a7:

---

q8: Today FMIS reads as crop-only (all four modules are tagged Crop Production), but one flagship vendor is primarily a livestock platform. How should livestock and grazing be handled?

- a) Keep FMIS crop-focused and queue a separate LIVESTOCK-MGMT domain for paddocks, mob movements, and animal records.
- b) Bring livestock into FMIS by adding livestock-records, pasture-assignment, and animal-movement masters (would need a livestock module).
- c) Drop the livestock-heavy vendor to a lower coverage level to reflect that FMIS does not cover livestock today.

Recommended: a. The four modules are already tagged Crop Production, so keeping FMIS crop-focused and queuing livestock as its own domain matches the current shape. Additive and non-blocking.

a8:

---

<!-- agent map, ignore: q1=B2-S4.fieldapps_submitlock q2=B2-S4.harvest_submitlock q3=B2-S4.cropplans_approver q4=B2-S1 q5=B2-S2 q6=B2-S3 q7=B3-MASTER-SOIL-ZONES+B3-MASTER-WEATHER-OBS+B3-S2 q8=B3-S3 q9=B2-B9D-OWN-171 q10=B2-B9D-OWN-157 q11=B2-B9D-OWN-166 | domain_id=154 -->
