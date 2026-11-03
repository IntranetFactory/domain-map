# IT Service Management (ITSM): questions waiting for you

## What this domain is

Run the full IT service desk: log and resolve incidents, field service requests from a catalog, drive problems to root cause, push changes through CAB approval, and publish knowledge articles, all governed by service-level agreements. It spans eight modules (incident, request, problem, change, configuration, event, knowledge, and SLA management) and is the central place where employees get IT help and where IT keeps services running.

---

q1: Should knowledge_articles be flagged as containing personal content? (yes/no)

You asked how others handle this, and whether a good knowledge base should ever contain personal data at all. The short answer: a well-run knowledge base is deliberately kept generic, so most articles carry no personal data. The flagship products lean the same way. ServiceNow, Zendesk Guide, and Freshservice all treat the knowledge base as reusable, audience-targeted content (public, internal, or role-scoped) and steer authors away from putting customer-identifying detail in an article; the place for case-specific personal data is the incident or case record, not the reusable article. So in the ideal, the answer to "should a good KB contain personal data?" is no.

The reason the flag is still worth considering is that real knowledge bases drift from that ideal: a troubleshooting article quotes a real ticket, a screenshot shows a user's name or email, an internal runbook names the affected employee. Vendors handle that residual risk two ways, not by assuming the KB is clean: ServiceNow and Zendesk apply the same data-classification, retention, and access controls to KB articles that they apply to other records, and ServiceNow's knowledge workflow adds review/approval gates precisely so a human catches stray personal data before publish. Setting has_personal_content=true here mirrors that posture: it keeps knowledge_articles inside the privacy rules (retention, access, redaction review) as a safety net, even though good authoring should keep most articles clean.

- a) Flip it to true: treat the knowledge base as in-scope for privacy handling, as a safety net for the cases where an article does carry personal data.
- b) Leave it false: you keep the knowledge base strictly generic and scrub personal data at authoring time, so the privacy controls are not needed on the article record.

Recommended: a. A good KB should indeed avoid personal data, but in practice articles drift, and the flagship vendors apply privacy controls to KB content rather than assume it is clean. Flagging it true keeps the safety net on. Pick (b) only if you are confident your KB is and will stay strictly scrubbed.

a1:

---

q2: Service requests are described as "catalog-driven", but the IT Service Desk Starter can leave the service catalog out, and the IT Operations Starter does not carry it at all. Reword this text so it stays true without a catalog? (yes/no)

- Catalog description, now: "Planned, catalog-driven requests for access, hardware, software, or information, distinct from reactive incidents."
- Catalog description, new: "Planned requests for access, hardware, software, or information, distinct from reactive incidents."
- Analyst description, new: "Planned request: access, hardware, software, information. Distinct from incidents: incidents are reactive, service requests are proactive. The fulfillment for many requests crosses domains (provisioning ↔ IGA, asset assignment ↔ ITAM, HR exception ↔ HRSD)."
- State `submitted`, now: "Requester has submitted the catalog request."
- State `submitted`, new: "Requester has submitted the request."

Recommended: yes. The new wording stays true everywhere this text shows, including ONB-JOURNEY-MGMT, ITSM-SERVICE-REQUEST, HRSD-EMPLOYEE-PORTAL and RMM-MONITORING. Those modules lose the word "catalog-driven", but the relationship from a service request to its catalog item stays in the catalog. It needs your sign-off because it overwrites existing text.

a2:

---

q3: A closed incident is described as "SLA clock stopped", but the IT Service Desk Starter can leave service-level agreements out, and the IT Operations Starter does not carry them. Reword this state so it stays true without them? (yes/no)

- State `closed`, now: "Resolution confirmed; incident archived and SLA clock stopped."
- State `closed`, new: "Resolution confirmed; incident archived."

Recommended: yes. Every module holding incidents gets the shorter text, and the eight modules that do track service levels lose only the mention of the clock, not the relationship to the agreement. It needs your sign-off because it overwrites existing text.

a3:

---

<!-- agent map, ignore: q1=B2-PATTERN-FLAGS q2=B2-SUBSET-TEXT-SERVICE-REQUESTS q3=B2-SUBSET-TEXT-SERVICE-INCIDENTS | domain_id=1 -->
