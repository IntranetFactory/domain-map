# Master Data Management (MDM): questions waiting for you

## What this domain is
The single trusted source for your most reused business records: customers, suppliers, and employees.

MDM pulls in overlapping records from every system, matches and deduplicates them, and survives the best fields into one clean golden record. It runs the match and merge rules, routes the hard calls to a data steward, and publishes the resulting golden records out to the systems that consume them. It sits alongside your systems of record (CRM, HCM, supplier management), not in place of them.

---

q1: (answer this first) How should Master Data Management be split into modules (the sub-areas of the product)?

- a) One module: MDM-Golden-Record-Management, mastering all six MDM-owned objects (the three golden-record types plus match rules, merge rules, and source records).
- b) Two modules: MDM-Golden-Records (the golden records and source records) and MDM-Match-and-Merge-Engine (the match and merge rules plus the stewardship workflow).
- c) A larger split (three or more modules), separating stewardship workflow, data quality, and hierarchy management into their own modules.

Recommended: a. MDM has only two capabilities, below the threshold that forces a split, so the single-module floor is the cleanest start; you can split out the match-merge engine later if its workflow diverges. This choice gates the whole build (modules, lifecycle states, permissions, user edges, and handoff attribution all hang off it), so it unlocks everything below.

a1:

---

q2: How should the master-ownership conflict on customers, suppliers, and employees be resolved? Today CRM masters customers and HCM masters employees, while the legacy rollup also claims all three for MDM.

- a) MDM becomes the canonical master and CRM and HCM demote to embedded copies.
- b) MDM consumes customers, suppliers, and employees from CRM, HCM, and supplier management, and masters only the golden records, source records, match rules, and merge rules.
- c) Mixed: decide per object.

Recommended: b. It matches how the real MDM products (Informatica, Reltio, Profisee, Stibo, Semarchy) work, sitting alongside the source-of-record systems rather than replacing them. Realizing this means deleting or demoting the legacy master rows, which is a destructive change, so it needs your sign-off.

a2:

---

q3: The domain's business-logic text contains a forbidden em-dash. Should I apply this exact replacement: "Matching and survivorship algorithms (deterministic + probabilistic), hierarchy management, and stewardship workflows, the irreducible kernel beneath any MDM hub."? (yes/no)

Recommended: yes. It removes the em-dash with a comma and keeps the meaning. This overwrites a non-empty value and the exact wording is yours to own, so it needs your approval; reply with alternative wording if you prefer.

a3:

---

q4: Three MDM objects use bare-word names (match_rules, merge_rules, source_records). How should they be named?

- a) Claim all three as canonical bare words (MDM is the natural authority for match and merge terminology).
- b) Rename all three with an mdm_ prefix.
- c) Mixed: keep match_rules and merge_rules as canonical, but rename source_records (it collides with system-of-record terminology used elsewhere).

Recommended: c. MDM is the natural home for match and merge terms, but source_records is ambiguous against other domains, so prefixing only that one avoids a collision. A rename is a destructive restructure, so it needs your call.

a4:

---

q5: Both capabilities (Identity Resolution and Customer 360) sit under MDM, but CDP also touches both. Is this dual ownership intentional, or should a capability move?

- a) Both stay with MDM (MDM masters, CDP operationalizes).
- b) Move Identity Resolution to CDP.
- c) Move Customer 360 to CDP.
- d) Host both jointly across MDM and CDP.

Recommended: a. MDM is the system that masters the records; CDP consuming and operationalizing them is the normal division of labor, so keeping both under MDM reflects ownership correctly.

a5:

---

q6: Should I author the proposed lifecycle state machines for the workflow-bearing masters: golden records run "proposed candidate / pending steward / merged / golden / retired", and source records run "ingested / matched / merged to golden / quarantined / rejected"? (yes/no)

Recommended: yes. These states drive the workflow-gate permissions and match how stewardship hubs move records to a golden state. Reply with alternative state names if you want different wording.

a6:

---

q7: What shape should the stewardship personas take?

- a) A unified data-steward persona plus match-curator, merge-approver, and mdm-admin.
- b) A separate steward per master (three steward personas).
- c) A different shape (describe it).

Recommended: a. A single steward role with the specialized curator, approver, and admin roles around it is the common MDM pattern and keeps the persona set small. This drives the later persona pass and the user-edge wiring.

a7:

---

q8: Which compliance frameworks should be tagged onto Master Data Management?

- a) All four: GDPR, CCPA/CPRA, KYC/AML, and DCAM.
- b) A subset (say which).
- c) Defer to a dedicated compliance pass.

Recommended: a. GDPR is the canonical MDM touch-point (right-to-erasure cascades from the golden record), CCPA/CPRA covers consumer rights, KYC/AML applies to financial-services customer mastering, and DCAM is the data-management standards anchor. Pick a subset if any do not apply to you. This also informs whether erasure events are required or optional.

a8:

---

q9: The MDM-owned masters carry no vendor synonyms. Should I load a small generic alias set per master (for example "Golden Record", "Best Record", "Master Object"), or skip them as self-explanatory?

- a) Load one or two aliases per master.
- b) Skip: the masters are self-explanatory.

Recommended: b. These masters are largely self-explanatory and the synonyms are vendor-specific editorial choices, so skipping is acceptable. Low stakes, does not block the build.

a9:

---

## Optional (will not hold up the build)

q10: Beyond the six objects modeled today, the flagship MDM vendors model a deeper substrate (match candidates, stewardship task queues, per-attribute survivorship rules, data-quality rules, and parent-child golden-record hierarchies, each suggesting its own module: stewardship workflow, data quality, hierarchy management). Should I research and add the ones that hold up across the vendor set? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are first-class across Informatica, Reltio, Profisee, and Stibo, though they still want a verification pass first.

a10:

---

q11: Reference Data Management (managing code lists like currencies, countries, and GL accounts, plus cross-reference mapping) looks like a distinct point-solution market from MDM, with pure-play vendors (Semarchy, TIBCO EBX, Stibo, Collibra, Informatica). Should I queue it as a separate new-domain candidate? (yes/no)

Recommended: yes. It passes the point-solution-market test (at least three independent flagships with RDM-named offerings), so it belongs on the missing-domains list. Additive and non-blocking.

a11:

---

<!-- agent map, ignore: q1=B2-S2 q2=B2-S1 q3=B2-S3 q4=B2-S8 q5=B2-S4 q6=B2-S5 q7=B2-S6 q8=B2-S7+B3-R1+B3-R2+B3-R3+B3-R4 q9=B2-B11 q10=B3-E1+B3-E2+B3-E3+B3-E4+B3-E5+B3-M1+B3-M2+B3-M3 q11=B3-D1 | domain_id=87 -->
