# ESG and Sustainability (ESG): questions waiting for you

## What this domain is
Measure your carbon footprint, hit your sustainability targets, and file disclosures regulators will accept.

Pull activity data and emission factors into an auditable carbon inventory across Scope 1, 2, and 3, set and track reduction targets, and turn the numbers into the disclosures the major frameworks demand (CSRD, ISSB, GHG Protocol). Score your suppliers on sustainability, keep an evidence trail an external assurance provider can sign off, and stay ahead of the regulatory changes that move the goalposts. This domain is unbuilt today: it has nine shared data masters but no modules or capabilities yet, so the answers below decide how it gets assembled.

---

q1: (answer this first) How should ESG and Sustainability be split into modules (the sub-areas of the product)?

- a) Four modules: Carbon Accounting (emissions, factors, activity data, calculation runs, credits, RECs); Disclosure and Reporting (disclosures, double-materiality, taxonomies, assurance, audit evidence); Performance Management (targets, metrics, initiatives); Supplier Sustainability (supplier ESG assessments and Scope 3 surveys).
- b) Three modules: same as (a) but fold Performance Management into Disclosure and Reporting.
- c) Five modules: same as (a) plus a separate Product Footprint module, if the product-carbon-footprint candidate domain does not get its own home.

Recommended: a. The flagship vendors package this market along all four splits: Watershed and Persefoni lead with carbon accounting (emissions, factors, calculation runs), Workiva and Diligent lead with disclosure and reporting (CSRD/ISSB filings, assurance, taxonomies), while Sphera, IBM Envizi, and Salesforce Net Zero Cloud carry both plus a distinct target/initiative performance layer; supplier sustainability is a standalone packaged area for EcoVadis (supplier ESG ratings as a pure-play) and Sphera Supply Chain, which is why the four-module split, not a three-fold collapse, mirrors the market. This is the blocking decision: modules, capabilities, the new compliance and carbon entities, lifecycle states, pattern flags, and handoff wiring all cascade from it.

a1:

---

q2: Should "carbon accounting" and "ESG disclosure reporting" be modeled as two separate capabilities, or one?

- a) Two capabilities (carbon accounting and disclosure reporting kept distinct).
- b) One capability where carbon accounting subsumes disclosure.
- c) One capability where disclosure subsumes accounting.

Recommended: a. Vendors split along this line (some are accounting-first, some disclosure-first, some do both), and the count drives how the capabilities and module shape are authored.

a2:

---

q3: ESG consumes EPM-owned financial plans as a required input, but nothing publishes that data to ESG in either direction. How should that link be handled?

- a) Keep it, and ask EPM to publish a "financial plan updated" handoff outbound to ESG.
- b) Downgrade it to optional and document it as forward-looking.
- c) Remove it as scope creep.

Recommended: a. The link is real for forward-looking disclosures, but it only works if EPM actually emits the update; keeping it plus requesting the publish closes the loop. Pick (b) if you want a leaner deployability story for smaller tenants.

a3:

---

q4: A handoff sending activity-data records to FINOPS looks mis-targeted, because FINOPS in this catalog is Cloud Financial Operations, not sustainability spend. Where should it go?

- a) Re-target it to EPM (financial planning).
- b) Remove the handoff so the workflow stays internal to ESG.
- c) Keep it, because the catalog's FINOPS scope was deliberately extended.

Recommended: a. Activity data is most naturally consumed by financial planning, not cloud cost management. Note: re-targeting or removing this also overwrites or deletes the existing process-mapping row for that handoff, so it needs your sign-off before the change is applied.

a4:

---

q5: Emission factors are now classified as config-shape reference data (author-once, occasionally edited from sources like EPA, DEFRA, IPCC), which already exempts them from required lifecycle states. Confirm config-shape, or add a 2-state active/superseded lifecycle anyway?

- a) Config-shape (no lifecycle states; the catalog classification already covers it).
- b) Author a 2-state active/superseded lifecycle.

Recommended: a. The catalog classification already exempts emission factors from lifecycle states; the 2-state option only adds value if you want explicit supersession tracking.

a5:

---

q6: Should an ESG disclosure be frozen once it is submitted for assurance, so the version an assurance provider reviews cannot be quietly edited? (yes/no)

Recommended: yes. The disclosure under assurance must stay stable for the engagement walkthrough. This flips a pattern flag that is silently default-off today, so it is a confirm decision rather than an automatic change.

a6:

---

q7: Should an ESG target require a single named executive approver to sign it off? (yes/no)

Recommended: yes. Target sign-off is an accountable executive act, so a single approver is the normal shape. This flips a default-off pattern flag, so it needs your confirmation.

a7:

---

q8: Should facility emissions be frozen once the reporting period is closed, so a locked period cannot be edited after the fact? (yes/no)

Recommended: yes. Period-close immutability is standard for an auditable emissions inventory. This flips a default-off pattern flag, so it needs your confirmation.

a8:

---

q9: Should an assurance engagement (the third-party sign-off record CSRD and the SEC Climate Rule require) carry a single named lead auditor as its approver? (yes/no)

Recommended: yes, assuming the assurance-engagement entity is added as part of the build. A single accountable lead auditor matches how assurance engagements work. This presupposes the new entity exists, so it lands with the build.

a9:

---

q10: A legacy domain-level "esg-system" skill exists from before the modular model. Under the current model each domain keeps exactly one domain-grain system skill that derives its toolset, so this row may simply BE that skill rather than a relic. What should happen to it?

- a) Keep it as the single domain-grain system skill and retire only its old per-tool wiring.
- b) Delete the legacy skill entirely.

Recommended: a. The current model expects one domain-grain system skill per domain, so reusing this row and dropping its obsolete tool wiring is cleaner than deleting and recreating. A delete is destructive and would need your explicit approval either way.

a10:

---

## Optional (will not hold up the build)

q11: Six additional ESG entity candidates show up across the flagship sustainability vendors (biodiversity records, water usage records, waste records, stakeholder engagement records, Scope 3 supplier surveys, product carbon footprints). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules exist. Several are first-class in the regulated surface, though some may instead fold into adjacent candidate domains (an EHS module for water/waste/biodiversity, a product-footprint domain for product carbon, a sustainable-procurement domain for supplier surveys) if those promote, so they want a verification pass first.

a11:

---

<!-- agent map, ignore: q1=B2-4 q2=B2-1 q3=B2-2 q4=B2-5 q5=B2-6 q6=B2-3.disclosurelock q7=B2-3.targetapprover q8=B2-3.facilitylock q9=B2-3.assuranceapprover q10=B1B-S13 q11=B3-1+B3-2+B3-3+B3-4+B3-5+B3-6 | domain_id=21 -->
