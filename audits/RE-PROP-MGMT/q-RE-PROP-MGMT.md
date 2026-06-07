# Residential Property Management (RE-PROP-MGMT): questions waiting for you

## What this domain is
Collect rent, screen tenants, dispatch maintenance, and account for each property, all in one residential-management platform.

Run a residential portfolio (single-family rentals, multifamily buildings, condo associations) end to end. Market vacant units to listing sites, screen applicants against credit, criminal, and eviction history, draft and sign leases, collect rent (with prorations, late fees, and security-deposit accounting), and handle maintenance requests with vendor or in-house teams. Per-property general ledger feeds owner distributions and investor reporting, with built-in compliance for the Fair Housing Act, FCRA-regulated screening, and state-by-state landlord-tenant statutes.

---

q1: (answer this first) How should state landlord-tenant law be modeled? Each state has its own act (California, New York, Texas, Florida and the rest) with different security-deposit holding periods, eviction notice timing, and required disclosures.

- a) Add one umbrella regulation (state landlord-tenant statutes) and link it to this domain now.
- b) Defer to per-jurisdiction modeling once a jurisdictions rollup exists.

Recommended: a. A single umbrella regulation is the minimal step that lets the security-deposit and eviction entities link to a regulation today, without waiting on a jurisdictions rollup. This choice shapes how those compliance entities attach, so it unlocks the rest of that work.

a1:

---

q2: For the Fair Housing Act, how broadly does it apply? It covers nearly every residential landlord, with rare exemptions (owner-occupied small properties, religious housing).

- a) mandatory (applies to everyone, catalog-wide)
- b) mandatory with exemptions (applies to nearly everyone, but record the carve-outs)

Recommended: b. The statute itself carries the named exemptions, so "mandatory with exemptions" is the precise value.

a2:

---

q3: Should rental applications be flagged as holding personal content, so the platform treats them as sensitive (they carry Social Security numbers and credit data)? (yes/no)

Recommended: yes. They hold SSN and credit data, which is exactly what the personal-content flag is for.

a3:

---

q4: Should a rental lease lock after signing, so the signed record cannot be quietly edited? (yes/no)

Recommended: yes. A signed lease is a fixed contract; locking it keeps the executed record stable.

a4:

---

q5: How should supplier invoices sit on this domain? They are canonically owned by the procurement domain and are currently marked contributor and required here, but this domain reads the paid status rather than writing supplier invoices.

- a) keep contributor and required
- b) demote to consumer and optional
- c) remove from this domain and rely on the accounts-payable handoff only

Recommended: b. This domain reads the AP-paid status rather than writing supplier invoices, so consumer and optional matches what it actually does. Pick (c) only once a local vendor work-order ledger lands.

a5:

---

q6: Now that this domain has its modules in place, should I re-run the neighbor-by-neighbor reconciliation against the investment and brokerage domains?

- a) yes, schedule it for the next validation pass
- b) defer until those partner domains are also audited

Recommended: a. The deep dive is only meaningful once modules exist on this side, which they now do, and it is independent of the entity backlog.

a6:

---

q7: An existing relationship row says a rental unit "opens" a customer case, but that looks mis-pointed: a unit comes under management from a closed sale, so the target should be the real-estate transaction. How should it be handled?

- a) Repoint it to the real-estate transaction (keep it as the property-handover edge from a closed sale).
- b) Delete the row (drop the property-handover edge).

Recommended: a. Repointing preserves the intended "unit comes under management from a closed sale" edge. This overwrites or deletes a master-data relationship row, so it needs your sign-off.

a7:

---

q8: Should all six core records (units, tenants, applications, rent payments, maintenance requests, leases) be classified as operational workflows? They each now carry a full workflow lifecycle, but they are still marked unclassified, which keeps a downstream check from reading those lifecycles. (yes/no)

Recommended: yes. All six carry full operational lifecycles, so the classification is clearly correct, and it unblocks the lifecycle and classification checks. This overwrites a master-data value on all six, so it needs your confirmation.

a8:

---

q9: When a brokerage closes a sale, should the leasing pipeline actually consume (store) the closed-sale record so the new unit can be brought under management, or does it only react to the event without keeping the upstream record?

- a) Consume it: store the closed-sale record on leasing, then wire the inbound handoff to that module.
- b) React only: leasing acts on the event but does not persist the upstream record.

Recommended: a. Bringing a unit under management normally reads the closed-sale record, so consuming it lets the inbound handoff resolve cleanly to the leasing module.

a9:

---

## Optional (will not hold up the build)

q10: Beyond the six core records, the flagship residential-management vendors model a deeper set of objects (owner distributions, property owners, owner statements, tenant screening reports, FCRA adverse-action notices, security deposits, eviction cases, fair-housing inquiries, lease charges, late-fee assessments, move-in and move-out inspections, rental listings, vendor work orders, lease renewal offers, pet profiles, renters-insurance certificates, resident-portal messages, and stored payment methods). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the current questions are settled. Several are compliance-driven (screening reports, adverse-action notices, security deposits, eviction cases, fair-housing inquiries) and several are universal across the vendor set, though each still wants a verification pass first.

a10:

---

<!-- agent map, ignore: q1=B2-STATE-LANDLORD-TENANT q2=B2-FHA-APPLICABILITY q3=B2-PATTERN-FLAGS.haspersonalcontent q4=B2-PATTERN-FLAGS.hassubmitlock q5=B2-SUPPLIER-INVOICES-ROLE q6=B2-PAIRWISE-RERUN q7=B1A-REL-473 q8=B1B-ENTITY-TYPE-UNCLASSIFIED q9=B1A-HANDOFF-296-TARGET q10=B3-OWNER-DISTRIBUTIONS+B3-PROPERTY-OWNERS+B3-OWNER-STATEMENTS+B3-TENANT-SCREENING-REPORTS+B3-FCRA-ADVERSE-ACTION+B3-SECURITY-DEPOSITS+B3-EVICTION-CASES+B3-FAIR-HOUSING-INQUIRIES+B3-LEASE-CHARGES+B3-LATE-FEE-ASSESSMENTS+B3-MOVE-IN-INSPECTIONS+B3-MOVE-OUT-INSPECTIONS+B3-RENTAL-LISTINGS+B3-VENDOR-WORK-ORDERS+B3-LEASE-RENEWAL-OFFERS+B3-PET-PROFILES+B3-RENTERS-INSURANCE+B3-RESIDENT-PORTAL-MESSAGES+B3-PAYMENT-METHODS | domain_id=144 -->
