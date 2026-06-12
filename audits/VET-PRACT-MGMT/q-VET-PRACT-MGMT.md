# Veterinary Practice Management (VET-PRACT-MGMT): questions waiting for you

## What this domain is
The system of record a veterinary clinic runs its day on: animal patients, the clients who own them, vaccinations, lab diagnostics, and the controlled-substance ledger the DEA requires. It ties the clinical record to scheduling, client billing, and drug inventory, and pushes reminders, reorders, and regulatory reports out to the teams and partners that need them.

---

q1: (answer this first) How should Veterinary Practice Management be split into modules (the sub-areas of the product)?

- a) Keep the current 3 modules (Clinical Care, Front Office, Pharmacy and Rx) and grow them in place.
- b) Split to 5 modules once the new entities land: carve Appointments and Invoicing out of Front Office and pull Lab Integration out of Clinical Care.
- c) Split to 6 modules: same as (b) plus a Boarding module.

Recommended: b. Five modules match how the major veterinary platforms (IDEXX Cornerstone, ezyVet, AVImark) present the product, and reshaping is cheap while the modules are still entity-light; deferring past the new-entity load risks a bigger migration. This choice drives the module split, where the new entities land, and every per-module fix below it, so it unlocks the rest of the build.

a1:

---

q2: How should the buyer-voice catalog copy (tagline and description) for the domain and its 3 modules be produced?

- a) Agent drafts all of it and you approve the wording.
- b) You supply the exact wording.
- c) Modules first, then derive the domain summary from them.

Recommended: a. The fields are filled today but carry the unapproved (new) review signal; letting the agent draft and you approve is the fastest path to sign-off, and once approved the copy is protected from silent overwrite.

a2:

---

q3: Should pet owners be flagged as carrying personal data (name, address, payment instrument, ZIP)?

- a) Yes, set the personal-content flag.
- b) No, leave it off.
- c) Defer to a later privacy pass.

Recommended: a. Pet-owner records are human personal data and state consumer-privacy laws (CCPA and similar) apply to veterinary clinics even though HIPAA does not; the flag drives downstream privacy and retention scaffolding and should not sit at false by default.

a3:

---

q4: Should the controlled-substance ledger be made append-only (submit-locked), so a posted entry cannot be edited in place?

- a) Yes, set the submit-lock.
- b) No, leave it editable.
- c) Defer to a later compliance pass.

Recommended: a. DEA 21 CFR 1304 makes the controlled-substance ledger append-only by federal law; corrections require a strikethrough and initialed entry, not edit-in-place, so mis-setting this flag is a regulatory hazard.

a4:

---

q5: Can the agent confirm that all 5 current masters (animal patients, pet owners, vaccinations, lab results, controlled-substance ledger) carry a real workflow and should each get lifecycle states, with none treated as a static config table?

- a) Confirm all 5 get lifecycle states.
- b) Exempt one or more, and name which.

Recommended: a. Each of the five carries an observable workflow (for example deceased or transferred for patients, drawn through reconciled for the ledger), so none qualifies for the config-table exemption. Confirming this unblocks loading the state machines.

a5:

---

q6: Should the agent load capability ownership overrides where a capability's owner differs from the domain owner (Business Operations)?

- a) Add all three: Invoicing to Accounts Receivable, Inventory and Rx to Compliance Operations, Reminder Management to Customer Service.
- b) Add only a subset, and name which.
- c) None, keep the domain-level ownership for all capabilities.

Recommended: a. Each of the three capabilities is functionally owned by a different team than the domain owner, so the overrides record per-capability accountability accurately; this is low-stakes and does not block the build.

a6:

---

q7: For the vaccination-administered event, what integration pattern and friction should the two new outbound handoffs use, and should the reporting handoff to the compliance domain be included now?

- a) Customer-service reminder as a low-friction API call, plus compliance rabies-tag reporting as a medium-friction batch sync.
- b) Customer-service reminder as a low-friction API call only, and defer the compliance handoff.
- c) Customer-service reminder as a low-friction API call, plus compliance reporting as a low-friction event stream.

Recommended: a. The reminder fits an immediate API call and rabies-tag reporting to regulators is typically an end-of-day batch where state law requires it; pick (b) if you would rather hold the compliance leg until the reporting cadence is confirmed.

a7:

---

q8: How should the "Client" alias for pet owners be handled, given that "Client" collides with customer records in other domains?

- a) Industry-synonym only: keep "Client" as a vet-scoped alias, with pet owners staying the canonical name.
- b) Domain-prefixed: use "vet client" as the alias to avoid the collision.
- c) Defer the canonical-name question and decide later.

Recommended: a. "Client" is the near-universal label across IDEXX, ezyVet, and AVImark, so it must be searchable as an alias; scoping it to the veterinary vendors keeps it from colliding with customer records elsewhere.

a8:

---

q9: The one untagged outbound handoff (new-client registration to the finance domain) has no clean cross-industry process match. How should it be classified?

- a) Tag it with "Collect and maintain account information" as the best-available match.
- b) Tag it with the broader "Process accounts receivable" parent.
- c) Defer it to a later custom-process authoring pass.

Recommended: a. It is the closest available standard process even though the trigger is registration rather than billing; tagging it now brings handoff coverage to 6 of 6, and you can refine it later if a custom process is authored.

a9:

---

## Optional (will not hold up the build)

q10: Several vendor-universal entities are missing from the current footprint: appointments, client invoices and payments, prescriptions and drug inventory and DEA reports, exam (SOAP) notes and reminder protocols, lab test orders and a species/breed config table, and boarding reservations. Should the agent research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the module shape is settled. Appointments is the single most load-bearing gap (scheduling has no first-class entity today); boarding is genuinely optional and only matters if you take the 6-module option in q1.

a10:

---

<!-- agent map, ignore: q1=B2-MODULE-RESHAPE-ON-B3 q2=B2-CATALOG-COPY q3=B2-PET-OWNER-PERSONAL-CONTENT q4=B2-CONTROLLED-SUBSTANCE-SUBMIT-LOCK q5=B2-CONFIG-SHAPE-CHECK q6=B2-CAPABILITY-FUNCTION-OVERRIDES q7=B2-VACCINATION-ADMIN-PATTERN q8=B2-CLIENT-ALIAS-POSTURE q9=B2-FIN-APQC q10=B3-VETERINARY-APPOINTMENTS+B3-INVOICES-PAYMENTS+B3-PRESCRIPTIONS-INVENTORY-DEA-REPORTS+B3-EXAM-NOTES-REMINDER-PROTOCOLS+B3-LAB-TEST-ORDERS-SPECIES-BREEDS+B3-BOARDING-RESERVATIONS | domain_id=151 -->
