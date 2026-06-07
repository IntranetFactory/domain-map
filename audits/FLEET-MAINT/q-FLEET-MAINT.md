# Fleet Maintenance (FLEET-MAINT): questions waiting for you

## What this domain is
Keep every vehicle on the road and control what each mile costs to maintain.

Run your whole maintenance operation from one place: turn every defect, fault, and driver report into a tracked repair from intake to sign-off; service every vehicle on time by mileage, engine hours, or calendar and let the work orders write themselves; and keep the right parts on hand while claiming every warranty and recall dollar you are owed. See cost per mile and uptime by vehicle so you know when to keep fixing and when to replace.

---

q1: (answer this first) How should vehicle inspections be mastered, given this is coordinated with the Fleet Management audit?

- a) Fleet Management keeps one unified vehicle inspections master with an inspection-kind discriminator (covers both driver DVIR and mechanic periodic inspection).
- b) Fleet Maintenance masters a separate mechanic periodic inspections entity for PMI, leaving DVIR to Fleet Management.

Recommended: a. It matches how Whip Around and Fleetio model inspections and avoids adding a second master; mechanic periodic inspection completion is captured as a work-order outcome instead. This is the build-shape decision the rest of the master set keys off, so it unlocks the rest.

a1:

---

q2: Should completed vehicle work orders be frozen (submit-lock) once finished, so parts, labor, and invoice lines cannot be edited after completion? (yes/no)

Recommended: yes. Freezing on completion keeps the parts and labor totals stable for accounts-payable posting.

a2:

---

q3: Should maintenance defects be flagged as carrying personal data (DVIR photos and driver signatures), so they fall under privacy and retention rules? (yes/no)

Recommended: yes. Driver signatures and inspection photos are personal data, which matters for GDPR and CCPA exposed buyers.

a3:

---

q4: The "preventive maintenance due" event is currently attributed to an upstream telematics handoff, but the event is published on Fleet Maintenance's own schedule master. How should it be attributed?

- a) Introduce a telematics-owned signal (for example "engine hours threshold reached") and redirect the handoff so telematics is the upstream trigger and Fleet Maintenance publishes the PM-due event.
- b) Make it a self-handoff inside Fleet Maintenance (the PM module publishes, the work-order module consumes).
- c) Leave it as it is and treat telematics as an informal upstream signal.

Recommended: a. It cleanly separates the telematics signal from the Fleet Maintenance event that owns the schedule. This re-attributes an existing handoff (a destructive change), so it needs your sign-off.

a4:

---

q5: When a maintenance defect is resolved, which downstream areas should receive that event?

- a) Inside Fleet Maintenance only (the work-order module consumes it).
- b) Also send it to accounts payable for the repair invoice.
- c) Also send it to finance for fixed-asset depreciation.
- d) Also send it to Fleet Management for return-to-service status.
- e) Inside Fleet Maintenance plus accounts payable plus Fleet Management.

Recommended: e. The event currently fires with nothing consuming it; routing it to repair invoicing and return-to-service is the most common shape, and you can add finance later.

a5:

---

q6: Why is the "sign document" capability linked to the legacy maintenance skill, and what should happen to it?

- a) Customer signature on shop completion: keep it and move it to the work-order module's skill.
- b) OEM warranty-claim attestation: keep it and move it to the parts module's skill.
- c) Both are real workflows: keep it on both modules' skills.
- d) Vestigial: delete the link.

Recommended: c, if both signatures are genuinely used; otherwise pick the single real workflow. Option (d), and the related removal of the retired legacy maintenance skill, is a delete, so it needs your sign-off before anything is removed.

a6:

---

q7: Which regulations should Fleet Maintenance be tagged with?

- a) Floor set: FMCSA Part 396, FMCSA Part 393, NHTSA 49 CFR 573, EPA emissions inspection, OSHA 29 CFR 1910.
- b) Floor set plus stretch: add the FTC Magnuson-Moss Warranty Act, RCRA hazardous-waste handling for used oil, tires, and batteries, and state lemon laws as conditional.
- c) A subset (tell me which).

Recommended: a. The floor set covers the core maintenance recordkeeping, parts, recall, emissions, and shop-safety mandates; add the stretch set if warranty and hazardous-waste exposure matter to you. The underlying regulation records do not exist yet, so answering this also seeds that upstream addition.

a7:

---

q8: Where should vehicle recall campaigns live?

- a) Embed them in the parts module (warranty and recall coverage already live there).
- b) Split them into their own recall sub-module.
- c) Promote a standalone Vehicle Recall Management domain after a research pass.

Recommended: a. Embedding keeps the catalog lean and sits next to the existing warranty coverage; the standalone-domain option is worth a later research pass only if you want a dedicated recall journey.

a8:

---

q9: How should repair shops be modeled?

- a) Fleet Maintenance masters a shops entity (bay capacity, mechanic roster, certification scope) with a link to locations.
- b) Leave shop attributes on the generic locations entity and skip a shops master.
- c) Let the workplace-management domain master shops and have Fleet Maintenance consume it.

Recommended: a. Shop metadata (bay capacity, mechanic roster, certification scope) is maintenance-specific and more detailed than a generic location, so a dedicated master fits.

a9:

---

q10: The "a defect triggers a revision of a preventive-maintenance schedule" link cannot be stored as written because the relationship type many-to-one is not an allowed value. How should it be encoded?

- a) Flip the direction so the schedule is the source (one schedule revised via many defects, one-to-many, verb "revised via").
- b) Keep the original verb direction but store it as one-to-many anyway (logically inverted from the intent).
- c) Drop the relationship.

Recommended: a. Flipping the direction expresses the same fact with a valid one-to-many type and reads correctly from the schedule side.

a10:

---

q11: The buyer-voice catalog copy (taglines and descriptions) has already been written into the domain and its three modules and is awaiting your review. How do you want to handle it?

- a) Accept the written copy as-is (mark the records approved when you have reviewed them).
- b) Request a specific rewrite per row.

Recommended: a. The copy was authored in buyer voice for the domain and all three modules; review it in place and request a rewrite only where a string needs adjusting.

a11:

---

## Optional (will not hold up the build)

q12: Beyond the four masters modeled today, the flagship vendors expose several deeper maintenance master entities. Should I research and add the ones that hold up (vendor parts orders, OEM warranty claims, per-mechanic labor entries, a service-task catalog with parts and labor defaults, mechanic certifications, and meter readings)? (yes/no)

Recommended: yes, but additive and can happen after the gate decisions land. Several are common across Fleetio, AssetWorks FleetFocus, and Trimble TMT, though each still wants a verification pass (including whether service tasks belong as their own master and whether informal skills are tracked separately from certifications).

a12:

---

q13: Three adjacent buyer journeys keep showing up next to fleet maintenance. Should I research whether any deserves its own domain or should fold in here: fleet tire management, vehicle recall management, and EV charging and high-voltage maintenance? (yes/no)

Recommended: yes for a research pass, non-blocking. Tire management and recall management look like real adjacent domains with pure-play vendors; EV maintenance partly routes through an EV-charging domain and partly stays here.

a13:

---

q14: A few sub-feature shapes need a quick verification pass: a diagnostic trouble code dictionary (versus telematics-owned occurrences), separate lubrication and fluids programs versus a parts-kind discriminator, and mobile-mechanic dispatch overlap with field service management. Should I research and resolve these? (yes/no)

Recommended: yes, but additive and non-blocking. Each is a small placement call that can be settled after the modules and masters are firm.

a14:

---

<!-- agent map, ignore: q1=B2-3 q2=B2-2.submitlock q3=B2-2.pii q4=B2-4 q5=B2-5 q6=B2-6 q7=B2-7 q8=B2-8 q9=B2-9 q10=B2-10 q11=B2-CATALOG-COPY q12=B3-M1+B3-M2+B3-M4+B3-M5+B3-M6+B3-M8+B3-4+B3-6 q13=B3-1+B3-2+B3-3 q14=B3-5+B3-7+B3-8 | domain_id=149 -->
