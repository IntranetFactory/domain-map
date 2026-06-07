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

## Optional (will not hold up the build)

q6: Seven entities that flagship ITSM vendors model do not yet exist in the catalog: a customer-facing outage record (service_outages), overlapping-change detection (change_collisions), Change Advisory Board agenda and minutes (cab_meetings), a service-offering versus catalog-item split (service_offerings), walk-up support visits (walkup_visits), virtual-agent conversations (virtual_agent_conversations), and chargeback invoices (chargeback_invoices). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the open decisions above are settled. Several map to real flagship features and to capabilities that currently have no backing master, though they still want a verification pass first.

a6:

---

<!-- agent map, ignore: q1=B1A-SELF-CONTAIN q2=B2-PATTERN-FLAGS.incidentpii q3=B2-PATTERN-FLAGS.knowledgepii q4=B2-PATTERN-FLAGS.changelock q5=B2-SLA-LIFECYCLE q6=B3-SERVICE-OUTAGES+B3-CHANGE-COLLISIONS+B3-CAB-MEETINGS+B3-SERVICE-OFFERINGS-SPLIT+B3-WALKUP-VISITS+B3-VIRTUAL-AGENT-CONVERSATIONS+B3-CHARGEBACK-INVOICES | domain_id=1 -->
