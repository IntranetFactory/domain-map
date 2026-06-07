# Manufacturing Operations (MFG-OPS): questions waiting for you

## What this domain is

Run the shop floor: turn released production orders into finished units and keep the line moving. Deliver work instructions to operators, track output and machine downtime for OEE, run in-line quality inspections, handle floor escalations (andon cases), and keep lot-level traceability and genealogy for regulated production. This is the manufacturing execution layer (MES) that sits between your engineering and ERP systems and the actual factory.

---

q1: (answer this first) How should Manufacturing Operations be split into modules (the sub-areas of the product)?

- a) Five modules: Shop-Floor Execution (production orders, work instructions, schedules); OEE and Downtime (produced units, downtime events); In-Line Quality (quality inspections); Floor Case Management (shop-floor cases); Lot Traceability (genealogy view of produced units).
- b) Three modules: Execution; OEE-and-Quality combined; Floor Case Management.
- c) Start with one combined Manufacturing Operations module and split later.
- d) A different shape you propose.

Recommended: a. The five-module split matches how the major MES platforms (Plex, Tulip, Siemens Opcenter) organize the floor, and keeps each workflow ownable on its own. This choice drives the capability set, the per-module catalog text, the lifecycle states, and the role bundles, so it unlocks the rest of the build.

a1:

---

q2: Where should produced units live across the modules (this can collapse the five-module shape to four)?

- a) Master in OEE and Downtime, embedded into Lot Traceability.
- b) Master in Lot Traceability, embedded into OEE and Downtime.
- c) Keep produced units in a single module (collapses one of the proposed modules).

Recommended: a. Most vendors (for example Plex) treat the unit as it is produced and released, then reference it from genealogy; mastering it in OEE and Downtime follows that. Answer this after q1, since it only matters under the five-module split.

a2:

---

q3: The one capability currently linked to this domain (Workforce Scheduling) is actually realized in the field-service dispatch module, not on the shop floor. How should it be handled?

- a) Keep it, treating the capability as spanning manufacturing and workforce management by intent.
- b) Remove it and author a Production Scheduling capability for this domain instead.

Recommended: b. The domain owns production schedules (line and cell sequencing), which is a different concept from labor scheduling; once any module ships, keeping the mismatched link fails the capability-realization check.

a3:

---

q4: Salesforce Manufacturing Cloud is currently linked here, but it is account-based demand forecasting and sales-agreement management, not shop-floor execution. Where does it belong?

- a) Keep it as a secondary link here (some run-rate-versus-commit reporting overlaps).
- b) Move it to CRM only (its primary home).
- c) Move it to a new demand-collaboration domain candidate.

Recommended: b. CRM is the true semantic home for demand-collaboration tooling.

a4:

---

q5: The catalog has Honeywell Forge Building Operations but not the Industrial / Connected Plant variant, which is the actual MES product. Add it?

- a) Add Honeywell Forge Industrial / Connected Plant as a new vendor row and link it here.
- b) Leave it as a noted gap.

Recommended: a. The Connected Plant variant is a real MES entrant and belongs in the manufacturing surface.

a5:

---

q6: Six pure-play MES leaders are missing from the vendor list entirely (Siemens Opcenter, GE Proficy, Aveva MES, Rockwell FactoryTalk Production Centre, Dassault Apriso, iBase-t Solumina). Load them?

- a) Load all six.
- b) Load just the two largest (Siemens Opcenter and GE Proficy).
- c) Defer to a dedicated vendor-refresh pass.

Recommended: a. These are core MES leaders, and a complete vendor surface makes the domain credible. Independent of the module split.

a6:

---

q7: The shop-floor-case escalation currently hands off to IT Service Management (as a service incident). Shop-floor cases are operational, not IT incidents. Keep that target?

- a) Keep the IT Service Management target (matches the ServiceNow product taxonomy).
- b) Reroute the handoff to an internal manufacturing module once the modules exist.
- c) Drop the handoff entirely (shop-floor cases stay in this domain and do not fan out).

Recommended: a or b depending on q1. ServiceNow does model these as cases, but most MES vendors keep them distinct; the outcome decides whether the related cross-domain link to service incidents gets authored.

a7:

---

q8: The four regulations tagged here describe the regulated-product layer (EU Cyber Resilience Act, EU Data Act, Eco-design Regulation, EU Battery Regulation), which is engineering/PLM-shaped, not shop-floor-shaped. The shop floor's audit trail wants standards like ISO 9001, IATF 16949, AS9100, ISO 13485, and FDA 21 CFR Part 11. What should happen?

- a) Load three to five of the missing manufacturing standards as new regulation links.
- b) Move the four existing rows to PLM, where the regulated-product layer lives.
- c) Keep as-is: the shop floor produces the regulated artifact, so these regulations apply.

Recommended: a. Loading the manufacturing-audit standards is additive and fixes the gap without disturbing existing rows. Option (b) deletes/moves existing rows and would need explicit sign-off as a destructive change.

a8:

---

q9: Should a production order be marked as requiring a single named approver (supervisor-gated release, as is standard in regulated industries)? (yes/no)

Recommended: yes. Production-order release is supervisor-gated in regulated manufacturing. This flips a current value, so it needs your confirmation.

a9:

---

q10: Should a work instruction be locked once it is released to the floor, so any revision requires re-approval rather than a quiet edit? (yes/no)

Recommended: yes. A released instruction drives operator behavior, so changes should go through a fresh approval. This flips a current value, so it needs your confirmation.

a10:

---

q11: 23 industry-synonym aliases were authored across the seven masters and are awaiting your sign-off. Should they be approved in-record? (yes/no)

Recommended: yes, if the synonyms read correctly (for example Work Order / Manufacturing Order for production orders, SOP / Build Instruction for work instructions). Approval is a sign-off step, so it is not applied automatically.

a11:

---

## Optional (will not hold up the build)

q12: Seven near-universal manufacturing entities show up across the flagship MES vendors (work centers, production material consumption, OEE rollup records, production genealogy, scrap/rework records, production holds, andon signals). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are universal across the vendor set, though each still wants a verification pass first (some may fold into an existing master or a lifecycle state rather than becoming their own entity).

a12:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-PRODUCED-UNITS-MASTER q3=B2-WORKFORCE-SCHEDULING q4=B2-SALESFORCE-MFG-CLOUD q5=B2-HONEYWELL-FORGE-VARIANT q6=B2-ADJACENT-MES-VENDORS q7=B2-SHOP-FLOOR-CASES-ITSM q8=B2-REGULATIONS-RESCOPE q9=B1A-S13.singleapprover q10=B1A-S13.submitlock q11=B2-ALIAS-TUPLES q12=B3-WORK-CENTERS+B3-PRODUCTION-MATERIAL-CONSUMPTION+B3-PRODUCTION-OEE-RECORDS+B3-PRODUCTION-GENEALOGY+B3-PRODUCTION-SCRAP-RECORDS+B3-PRODUCTION-HOLDS+B3-PRODUCTION-ANDON-SIGNALS | domain_id=47 -->
