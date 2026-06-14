# Field Service Management (FSM): questions waiting for you

## What this domain is
Plan, dispatch, and complete on-site service work, and keep the equipment you service running.

Take in service requests, route the right technician to the right job under skill, parts, SLA, and travel constraints, run the visit on a mobile device, and close out the work order. Track the installed base you maintain (equipment, customer sites, preventive-maintenance schedules) and the service contracts that cover it, so every dispatch, repair, and renewal stays connected to the asset it serves.

---

q1: (answer this first) Two masters (installed equipment and customer sites) are owned by the installed-base module but also appear as consumer entities inside the dispatch and service-contract modules, which is not allowed within one domain. How should this be resolved?

- a) Remove the four duplicate consumer entries, so the dispatch and service-contract modules just read the equipment and site records by reference.
- b) Promote all four to embedded copies, so each module can ship and run on its own without the installed-base module.
- c) Mixed: decide per entry.

Recommended: a. A standalone dispatch module with no installed base has no equipment to service against, and a standalone service-contract module has nothing to cover, so the embedded path is weak. This is the build-shape decision that unblocks the rest. Both paths change existing rows, so it needs your sign-off.

a1:

---

q2: One dispatch-to-customer-service handoff (the "dispatch failed" signal) is tagged with a dispatch-planning process, which is the sending side's verb, not what the customer-service side actually does on receipt. Should the tag be replaced with "Manage customer service problems, requests, and inquiries"?

- a) Replace it (delete the old tag, add the better-fit one).
- b) Keep the existing tag.

Recommended: a. The receiving side gets a service-failure signal it must escalate, which the customer-service process describes far better. This deletes and rewrites an existing tag, so it needs your approval.

a2:

---

q3: All 17 cross-domain handoffs now carry process tags at "new" status, but none are "approved" yet (the agent never self-approves). How should they be signed off?

- a) Approve all the agent-curated tags in bulk.
- b) Review and approve per row.
- c) Defer.

Recommended: a, if you are comfortable the process mappings are correct. Promotion to approved is a human sign-off step, so it is never applied automatically.

a3:

---

q4: The mobile-technician capability currently lives inside the dispatch module. Flagship products ship a distinct mobile module (offline sync, route-of-day, signature capture). Should the dispatch module be split into a dispatcher-side module and a separate mobile-technician module?

- a) Keep a single dispatch module.
- b) Split into dispatcher-side and mobile-technician modules.
- c) Defer until the optional mobile entities are vetted.

Recommended: b. Every flagship packages the truck as its own module separate from the desk: Salesforce ships Field Service Mobile, ServiceMax ships ServiceMax Go, Praxedo ships Praxedo Mobile, ServiceNow ships Mobile Agent, and ServiceTitan and IFS field a dedicated technician mobile app, each carrying the offline-sync, route-of-day, and signature-capture surface the dispatcher console does not. None of them fold the tech persona into the dispatch board, so the split follows the market shape, and it also decides where the mobile-specific entities (signature records, service photos, mobile devices) land.

a4:

---

q5: There is no role that spans field service and customer service for the failure-escalation workflow (the failed-dispatch and completed-work-order signals land in customer service). Should a cross-domain role be added?

- a) No cross-domain role; let customer service own its own roles.
- b) Add a field-service-customer-success role bundling the dispatch module with the customer-service case module.
- c) Defer to the customer-service audit.

Recommended: a. Customer service owning its own roles is the simplest split unless you specifically want one accountable person bridging both sides.

a5:

---

q6: The HVAC home-services starter embeds shells from CRM (customers, contacts), CPQ (quotes), and finance (invoices) but lists only field service as its host domain. Should host rows be added for CRM, CPQ, and finance so the catalog reflects its true cross-domain reach?

- a) Add host rows for CRM, CPQ, and finance.
- b) Keep it field-service-only since the home-services workflow centers there.

Recommended: a. The starter genuinely embeds those domains' entities, so the host metadata should say so. Low stakes, editorial.

a6:

---

q7: Should a service work order be frozen once it is completed, so a closed-and-signed job cannot be quietly edited? (yes/no)

Recommended: yes. Lock-on-completion is the standard field-service pattern (signed by the tech, then closed). This sets a flag that overwrites the current value, so it needs your confirmation.

a7:

---

q8: Should a field visit be treated as holding personal data (it captures a customer signature, customer name, and on-site photos)? (yes/no)

Recommended: yes. Those are personal data and bring the visit record under privacy and retention rules. This overwrites the current value, so it needs your confirmation.

a8:

---

q9: Should a dispatch record be frozen once it reaches its returned (terminal) state? (yes/no)

Recommended: yes. Once a dispatch is returned it is final, so locking it preserves an accurate record. This overwrites the current value, so it needs your confirmation.

a9:

---

q10: Should installed-equipment records be treated as holding personal data (serial and warranty information tied to a customer)? (yes/no)

Recommended: no, unless your equipment records routinely carry customer-identifying detail; serial and warranty data alone are usually not personal data. This overwrites the current value, so it is your call.

a10:

---

q11: Should a service contract be frozen once it is active, so changes go through a new contract rather than editing the live one? (yes/no)

Recommended: yes. A live contract sets the coverage terms, so changes should be auditable. This overwrites the current value, so it needs your confirmation.

a11:

---

q12: Should a preventive-maintenance schedule be frozen once its run is completed? (yes/no)

Recommended: yes. A completed PM run is a fixed record of what was serviced. This overwrites the current value, so it needs your confirmation.

a12:

---

q16: Enterprise Asset Management forwards installed equipment unit to Field Service Management to perform asset maintenance, but Field Service Management does not yet have anyone assigned to perform asset maintenance, so this step has no owner. How should it be handled?
- a) Record it now as work Field Service Management owns, and assign a named owner once Field Service Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Field Service Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

q17: Enterprise Asset Management forwards installed equipment unit to Field Service Management to decommission productive assets, but Field Service Management does not yet have anyone assigned to decommission productive assets, so this step has no owner. How should it be handled?
- a) Record it now as work Field Service Management owns, and assign a named owner once Field Service Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Field Service Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

q18: Fleet Management forwards service work order to Field Service Management to manage transportation fleet, but Field Service Management does not yet have anyone assigned to manage transportation fleet, so this step has no owner. How should it be handled?
- a) Record it now as work Field Service Management owns, and assign a named owner once Field Service Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Field Service Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a18:

---

q19: Customer Service Management forwards dispatch record to Field Service Management to calculate and optimize destination dispatch plan, but Field Service Management does not yet have anyone assigned to calculate and optimize destination dispatch plan, so this step has no owner. How should it be handled?
- a) Record it now as work Field Service Management owns, and assign a named owner once Field Service Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Field Service Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a19:

---

q20: Three outbound process tags are coarse and a more precise process exists for the same record. Should they be re-pointed to the better-fit process? This replaces existing tags.

- a) Re-point all three: the customer-record handoff to "Collect and maintain account information", the two customer-service handoffs to "Manage transportation fleet", and the facility-work-order handoff to "Request unplanned maintenance".
- b) Keep the existing tags.
- c) Decide per handoff.

Recommended: a. Each target process describes the same record at a finer grain than the current coarse tag. This deletes and rewrites existing tags, so it needs your approval.

a20:

---

## Optional (will not hold up the build)

q13: Five entity clusters show up across the flagship field-service vendors that FSM has no home for today: technician time tracking (time entries, timesheets, labor rates), proof-of-completion artifacts (signatures, service photos, mobile devices), regulated safety (safety inspections, checklists), equipment warranties and claims (today conflated with service contracts), and pre-work pricing (rate cards, pricing books, service quotes). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules exist. If warranties come in, a separate warranty module may be worth carving out; that can be decided during the research pass.

a13:

---

q14: FSM has no regulation rows today. Should I add the foundational ones: OSHA 1910 (US technician on-site safety) and EPA Section 608 (refrigerant handling, for the HVAC vertical)? (yes/no)

Recommended: yes for OSHA 1910 as the baseline on-site-safety anchor; EPA 608 only if you keep the HVAC vertical in scope. Additive and non-blocking.

a14:

---

q15: A separate "Trades and Home-Services Field Operations" domain candidate (TRADES-SVC) keeps surfacing: residential trade contractors (5 to 50 techs) with consumer-grade invoicing, membership programs, and lead generation, a distinct buyer from enterprise field service. Should I open it as a new-domain candidate for research? (yes/no)

Recommended: yes as a research candidate only; the vendor set (ServiceTitan, Housecall Pro, Workiz, Jobber, FieldEdge, BigChange) passes the point-solution-market test, but whether to spin it out is a separate decision. Non-blocking.

a15:

---

<!-- agent map, ignore: q1=B2-M7 q2=B1A-V4 q3=H1-review q4=B2-MOBILE-TECH-SPLIT q5=B2-CROSS-DOMAIN-ROLE q6=B2-STARTER-HOST-SCOPE q7=B2-FLAGS.swolock q8=B2-FLAGS.fvpii q9=B2-FLAGS.drlock q10=B2-FLAGS.iepii q11=B2-FLAGS.sclock q12=B2-FLAGS.pmlock q13=B3-V1+B3-V2+B3-V3+B3-V4+B3-V5+B3-V7 q14=B3-V8+B3-V9 q15=B3-V10 q16=B2-B9D-OWN-353 q17=B2-B9D-OWN-355 q18=B2-B9D-OWN-862 q19=B2-B9D-OWN-777 q20=B1A-B9D-RETAG | domain_id=31 -->
