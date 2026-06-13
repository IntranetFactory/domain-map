# IT Service Management (ITSM): questions waiting for you

## What this domain is

Run the full IT service desk: log and resolve incidents, field service requests from a catalog, drive problems to root cause, push changes through CAB approval, and publish knowledge articles, all governed by service-level agreements. It spans eight modules (incident, request, problem, change, configuration, event, knowledge, and SLA management) and is the central place where employees get IT help and where IT keeps services running.

---

q1: (answer this first) Two module data-object rows break module self-containment: asset_lifecycle_events (a contributor on Incident Management, mastered by ITAM) and onboarding_tasks (a required consumer on Service Request, mastered by Onboarding). How should each be fixed? This rewrites existing non-empty rows, so it needs your sign-off.

- a) Embed both as a local embedded_master shell so each module carries its own copy.
- b) Relax both to necessity=optional (presence-conditional) so the cross-domain dependency is no longer required.
- c) Mix: embed one, relax the other (tell me which is which).

Recommended: a. Embedding keeps each module self-contained without weakening the dependency, which matches how the other modules already carry their shared entities. This is a destructive change to existing rows, so nothing is applied without your call.

a1:

---

q2: Should service_incidents be flagged as containing personal content, since incident descriptions routinely carry user PII? (yes/no)

Recommended: yes. Incident descriptions regularly include user-identifying detail, so the PII flag drives the right retention and privacy handling.

a2:

---

q3: Should knowledge_articles be flagged as containing personal content, since some KB articles reference customer cases? (yes/no)

Recommended: yes. Where articles cite real customer cases the flag keeps them inside the privacy rules; decline if your KB is kept strictly generic.

a3:

---

q4: Should service_changes freeze its payload at CAB submission (a submit lock), so the change ticket cannot be quietly edited after it goes to the board? (yes/no)

Recommended: yes. Locking the payload at submission preserves an accurate record of exactly what the board approved.

a4:

---

q5: service_slas is now classified as catalog (config-shape), so it passes without a state machine. Leave it stateless, or author a lifecycle?

- a) Accept config-shape (catalog): no state machine.
- b) Author a state machine, for example draft, published, active, expired, archived, and surface the proposed states for approval.

Recommended: a. The catalog classification already satisfies the lifecycle check, and an SLA is mostly author-once config; pick (b) only if you want to track an SLA's effective period (active versus expired) as real state.

a5:

---

q7: Clinical Device Management forwards incident to IT Service Management to perform preventative asset maintenance, but IT Service Management does not yet have anyone assigned to perform preventative asset maintenance, so this step has no owner. How should it be handled?
- a) Record it now as work IT Service Management owns, and assign a named owner once IT Service Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment IT Service Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a7:

---

q8: Business Intelligence and Analytics forwards incident to IT Service Management to triage IT service delivery incidents, but IT Service Management does not yet have anyone assigned to triage IT service delivery incidents, so this step has no owner. How should it be handled?
- a) Record it now as work IT Service Management owns, and assign a named owner once IT Service Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment IT Service Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a8:

---

q9: Configuration Management Database forwards change to IT Service Management to define IT change or release standards, but IT Service Management does not yet have anyone assigned to define IT change or release standards, so this step has no owner. How should it be handled?
- a) Record it now as work IT Service Management owns, and assign a named owner once IT Service Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment IT Service Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a9:

---

## Optional (will not hold up the build)

q6: I have now run the vendor research (5 flagship ITSM products: ServiceNow, Jira Service Management + Statuspage, BMC Helix, Freshservice, ManageEngine). Seven new entities are confirmed as things real ITSM products model, and all are additive (a new record inside an existing module, no restructure). Should I add all seven? (yes/no)

The seven confirmed, each with the products that model it:

- service_outages: a customer-facing outage / status record separate from the internal incident (ServiceNow Outage records, Atlassian Statuspage, Freshstatus). Goes in Incident Management. Does not collide with the existing utilities grid-outage entity.
- service_releases: a release / deployment record separate from a single change (Freshservice, ManageEngine, BMC, ServiceNow, Ivanti). Goes in Change Management (no separate Release module needed).
- cab_meetings: Change Advisory Board agenda and minutes (ServiceNow CAB Workbench, BMC, Freshservice). Change Management.
- change_collisions: overlapping-change / blackout-window conflict detection (ServiceNow Collision Detector, BMC). Change Management.
- service_offerings: the back-end service definition split from its catalog-item presentation (ServiceNow CSDM, BMC, Freshservice). Service Request.
- virtual_agent_conversations: chatbot / virtual-agent transcripts (ServiceNow, Freshservice Freddy, ManageEngine, Jira SM). Agent Workspace; gives that module a master and backs the Virtual Agent capability.
- walkup_visits: walk-up / onsite check-in record (ServiceNow Walk-Up Experience only, so a niche one). Agent Workspace; backs the Walk-Up capability. I would NOT add a separate walkup_kiosks entity (a kiosk is just a location attribute).

One candidate from the earlier list was dropped: chargeback_invoices. Every product that ships chargeback puts it in IT Financial Management, billing a business service rather than the ticket, so it belongs to a finance domain, not ITSM. The Service-Cost-and-Chargeback capability stays as a cross-domain link.

Recommended: yes, add all seven (or name a subset). They are additive and land at record_status=new for your review, and they fill three capabilities (Virtual Agent, Walk-Up, Release) that currently advertise scope with no backing entity. This is the only item here that touches catalog content, so it can happen independently of the decisions above. Reply "yes", "no", or a subset (e.g. "all but walkup_visits").

a6:

---

<!-- agent map, ignore: q1=B1A-SELF-CONTAIN q2=B2-PATTERN-FLAGS.incidentpii q3=B2-PATTERN-FLAGS.knowledgepii q4=B2-PATTERN-FLAGS.changelock q5=B2-SLA-LIFECYCLE q6=B3-SERVICE-OUTAGES+B3-SERVICE-RELEASES+B3-CAB-MEETINGS+B3-CHANGE-COLLISIONS+B3-SERVICE-OFFERINGS-SPLIT+B3-VIRTUAL-AGENT-CONVERSATIONS+B3-WALKUP-VISITS q7=B2-B9D-OWN-1556 q8=B2-B9D-OWN-1299 q9=B2-B9D-OWN-1241 | domain_id=1 -->
