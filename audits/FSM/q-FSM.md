# Field Service Management (FSM): questions waiting for you

## What this domain is
Plan, dispatch, and complete on-site service work, and keep the equipment you service running.

Take in service requests, route the right technician under skill, parts, SLA, and travel constraints, run the visit on a mobile device, and close out the work order. Track the installed base you maintain (equipment, sites, preventive-maintenance schedules) and the service contracts that cover it.

Your last answers were applied: the dispatch module was split into a dispatcher side and a new Mobile Technician module, the pattern flags and the process-tag fixes landed, no cross-domain role was added, and the HVAC starter now hosts on Finance. One question you handed back is below, plus a note on the tag approvals.

---

q1: (answer this first) Installed equipment and customer sites are owned by the installed-base module but also read as consumers inside the dispatch and service-contract modules, which is not allowed within one domain. You asked whether these should be embedded masters. They should. How do you want to resolve it?

- a) Promote all four to embedded masters: dispatch and service-contracts each ship a standalone shell that automatically defers to the installed-base master when both are deployed together. (Recommended, this is the embedded-master option you asked about.)
- b) Delete the four consumer rows: the sibling modules read the installed-base records by reference only.
- c) Mixed: decide per row.

Recommended: a. A standalone dispatch module with no installed base has no equipment to service against, and a standalone service-contract module has nothing to cover, so the embedded shell (not deletion) is what keeps each module independently deployable. The shell demotes to a plain consumer automatically when the installed-base module is co-installed. This rewrites the four existing consumer rows, so it needs your sign-off before I execute it.

a1:

---

> Note on tag approvals (not a question for the a-file): all 17 cross-domain process tags now sit at status "new". Promoting them to "approved" is a sign-off I can never apply from a renamed answer file. If you want them approved, tell me directly in chat, naming the rows ("approve the 17 FSM agent-curated handoff_processes tags"), and I will do exactly that.

---

## Optional (will not hold up the build)

q2: Five entity clusters show up across the flagship field-service vendors that FSM has no home for today: technician time tracking, proof-of-completion artifacts (signatures, photos, mobile devices, which now have a natural home in the new Mobile Technician module), regulated safety inspections, equipment warranties and claims, and pre-work pricing (rate cards, pricing books, quotes). Research and add the ones that hold up? (yes/no)

Recommended: yes, additive and after the modules exist. If warranties come in, a separate warranty module may be worth carving out (decide during the research pass).

a2:

---

q3: FSM has no regulation rows. Add OSHA 1910 (US technician on-site safety) and EPA Section 608 (refrigerant handling, HVAC)? (yes/no)

Recommended: yes for OSHA 1910 as the baseline on-site-safety anchor; EPA 608 only if you keep the HVAC vertical in scope. Additive.

a3:

---

q4: A separate "Trades and Home-Services Field Operations" domain (residential trade contractors, 5-50 techs, a distinct buyer from enterprise field service) keeps surfacing. Open it as a new-domain research candidate? (yes/no)

Recommended: yes as a research candidate only. The vendor set (ServiceTitan, Housecall Pro, Workiz, Jobber, FieldEdge, BigChange) passes the point-solution-market test; whether to spin it out is a separate decision after the research. Non-blocking.

a4:

---

<!-- agent map, ignore: q1=B2-M7 q2=B3-FSM-ENTITIES q3=B3-FSM-REGULATIONS q4=B3-TRADES-SVC | domain_id=31 -->
