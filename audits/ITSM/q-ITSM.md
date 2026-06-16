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

<!-- agent map, ignore: q1=B2-PATTERN-FLAGS | domain_id=1 -->
