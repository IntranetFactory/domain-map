# API Management (APIM): questions waiting for you

## What this domain is
Design, secure, publish, and monetize your APIs from one place.

Run the full life of every API: author the contract, version it cleanly, and push it through gateways with the access, authentication, and rate-limit rules you need. Onboard the developers and partners who consume your APIs, give them a self-service portal and keys, and watch real usage (per-consumer call volumes, latency, error rates). Catch breaking changes before they reach subscribers, hold deprecated versions to a sunset plan, and turn API traffic into a billable, governed product.

---

q1: (answer this first) How should API Management be split into modules (the sub-areas of the product)?

- a) Four modules: Design and Lifecycle (API contracts and versions); Gateway and Runtime (live gateways, deployments, traffic policies); Consumer Management (developers and partners who use the APIs, plus their usage data); Developer Portal (self-service portal and docs).
- b) Three modules: same as (a) but fold the Developer Portal into Design.
- c) Two modules: Control Plane (everything you configure) versus Data Plane (the live traffic).

Recommended: a. Matches how the major API platforms (Apigee, Kong, Azure API Management) present their product, and keeps each area small enough to own cleanly. This choice drives every module below it, so it unlocks the rest of the build.

a1:

---

q2: Should published API specs be frozen once published, so contract tests can pin to an exact version? (yes/no)

Recommended: yes. Standard API-platform practice.

a2:

---

q3: Should one named API product owner have to approve any breaking-change checklist? (yes/no)

Recommended: yes. Keeps breaking changes from slipping through.

a3:

---

q4: Should one platform-engineering reviewer have to approve each gateway policy? (yes/no)

Recommended: yes. Policies control live access, so a single accountable approver is normal.

a4:

---

q5: Should developer and consumer contact details be treated as personal data (GDPR)? (yes/no)

Recommended: yes. They are personal data and fall under retention and privacy rules.

a5:

---

q6: Which compliance frameworks should be tagged onto API Management?

- a) GDPR plus SOX plus PCI-DSS (broad)
- b) GDPR only
- c) none

Recommended: a. GDPR covers developer personal data, SOX covers gateway audit logs and change control for public companies, PCI-DSS applies if any API touches card data. Pick (b) if you have no payment APIs and want it lean. Low stakes, does not block the build.

a6:

---

## Optional (will not hold up the build)

q7: The seven API objects modeled today are the headline set. Should I research and add the deeper substrate flagship vendors model (API products, subscriptions and plans, OAuth clients and API keys, configured developer-portal instances, audit logs, separate rate-limit and quota config, backend services, governed change proposals)? (yes/no)

Recommended: yes, but additive and can happen after the modules exist.

a7:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2.speclock q3=B2-S2.specapprover q4=B2-S2.policyapprover q5=B2-S2.consumerpii q6=B2-S3 q7=B3-S1 | domain_id=79 -->
