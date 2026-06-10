# API Management (APIM): questions waiting for you

## What this domain is
Design, secure, publish, and monetize your APIs from one place.

Run the full life of every API: author the contract, version it cleanly, and push it through gateways with the access, authentication, and rate-limit rules you need. Onboard the developers and partners who consume your APIs, give them a self-service portal and keys, and watch real usage with per-consumer call volumes, latency, and error rates. Catch breaking changes before they reach subscribers, hold deprecated versions to a sunset plan, and turn API traffic into a billable, governed product instead of an unmanaged back door.

> Grounding: these recommendations are backed by a fresh vendor-surface study (7 flagship vendors, 2025-2026 product docs) saved at `.tmp_deploy/APIM-phase0-2026-06-08.md`. Framing signal: unlike adjacent channel markets, API Management is converged, not splintering. The 2025 Gartner Magic Quadrant for API Management runs as ONE full-lifecycle market (Leaders: Kong, Google/Apigee, MuleSoft, IBM, Axway, Boomi), so the natural split is INTO modules within one domain, not OUT into sibling domains. No prior recommendation was reversed by the fresh evidence; all four pattern flags and the 4-module shape are confirmed, with one nuance added on PCI-DSS (see q6).

---

q1: (answer this first) How should API Management be split into modules (the sub-areas of the product)?

- a) Four modules: Design and Lifecycle (API contracts and versions); Gateway and Runtime (live gateways, deployments, traffic policies, rate-limit and quota config, backend services); Consumer Management (developers and partners who use the APIs, plus products, subscriptions, plans, app credentials, keys, and usage); Developer Portal (self-service portal and docs).
- b) Three modules: same as (a) but fold the Developer Portal into Design and Lifecycle.
- c) Two modules: Control Plane (everything you configure) versus Data Plane (the live traffic).

Recommended: a. The full-platform leaders package their products along exactly these four surfaces. Apigee separates API proxies/specs (design) from runtime from API Products + Developer Apps + API Keys + rate plans (consumer/monetization) from its Developer Portal; Azure API Management ships APIs (design) plus a runtime gateway plus Products + Subscriptions (consumer) plus a separate Developer Portal product; IBM API Connect splits Products + Plans + Consumer Organizations (consumer) from the Developer Portal from the gateway, with explicit lifecycle stages; Kong Konnect separates Services/Routes/Plugins (runtime) from Konnect API Products from the Dev Portal. The Developer Portal is a first-class, separately-marketed surface across Apigee, Kong, Azure, IBM, and Postman, which is why it earns its own module rather than folding into design. Choice (c) (control vs data plane) is the shape gateway-only vendors use (Kong OSS, AWS API Gateway expose stages/deployments/usage-plans with no first-class portal), so it under-serves the publishing and consumer surfaces APIM already models. This choice drives every module below it, so it unlocks the rest of the build.

a1:

---

q2: Should published API specs be frozen once published, so contract tests can pin to an exact version? (yes/no)

Recommended: yes. The flagship platforms make a published spec immutable and force breaking changes onto a new revision rather than editing in place. AWS API Gateway deployments are immutable snapshots of a stage; IBM API Connect stages a draft Product into a "specific version" of that Product that is no longer editable once staged; the broad market practice (Apigee, Azure, and the contract-testing pattern) is that the published spec IS the contract, and consumer-driven contract tests pin to that exact revision. Freezing on publish is what lets a subscriber's contract test trust the version it pinned to.

a2:

---

q3: Should one named API product owner have to approve any breaking-change checklist? (yes/no)

Recommended: yes. The market's breaking-change discipline is built around a single accountable sign-off: breaking changes are gated behind a NEW revision, documented in one changelog, and announced with a deprecation window (the Apigee/Azure/IBM versioning model and the wider API-versioning best practice). MuleSoft Anypoint makes the approval explicit at the consumption boundary too: an API instance owner approves contract/SLA-tier requests. A single API product owner approving the breaking-change checklist matches how the leaders run version governance.

a3:

---

q4: Should one platform-engineering reviewer have to approve each gateway policy? (yes/no)

Recommended: yes. Gateway policies govern live access (the Apigee policy model, Azure APIM policies, Kong plugins), so a single accountable reviewer per policy is the operating norm for the runtime surface. This is operational discipline rather than a field the vendors model as a typed approver, so the evidence is lighter than for q2/q3, but it is consistent with how every flagship gateway is operated: policy changes affect every consumer at once, so one reviewer owns the change.

a4:

---

q5: Should developer and consumer contact details be treated as personal data (GDPR)? (yes/no)

Recommended: yes. Every flagship developer portal registers a person or org with contact details: Apigee a Developer who owns Apps, IBM API Connect a Consumer Organization, MuleSoft a client-app owner with description and URLs, Azure a portal user with a subscription. Those contact details are personal data, so GDPR retention and erasure rules apply to `api_consumers`. This is the clearest of the four pattern flags.

a5:

---

q6: Which compliance frameworks should be tagged onto API Management?

- a) GDPR plus SOX plus PCI-DSS (broad)
- b) GDPR plus SOX (PCI-DSS only if any API carries card data)
- c) GDPR only
- d) none

Recommended: b. GDPR is always load-bearing because every vendor's developer portal stores developer/consumer PII (Apigee Developer, IBM Consumer Organization, Azure portal user). SOX is load-bearing for public companies because gateway audit logs and breaking-change governance are financial-controls evidence; `api_audit_logs` (gateway access plus admin events) is Core across Apigee, Kong, MuleSoft, Azure, AWS, and IBM. PCI-DSS is genuinely conditional: it applies only when an API actually touches cardholder data, so the honest framing is GDPR plus SOX always, PCI-DSS as the conditional third. Pick (a) if you want PCI-DSS attached up front for payment-heavy estates, or (c) if you have no public-company or payment exposure. Low stakes, does not block the build.

a6:

---

## Optional (will not hold up the build)

q7: The seven API objects modeled today are the headline set. Should I research and add the deeper substrate flagship vendors model? (yes/no)

The missing substrate, confirmed Core across the flagships, is: API products (the developer-facing bundle of specs under one consumption contract: Apigee API Product, Azure Product, IBM Product, Kong Konnect API Product, MuleSoft API Group); subscriptions and plans (Azure Subscription, IBM Plan, MuleSoft Contract plus SLA Tier, Apigee rate plan, AWS usage plan, with an explicit approval workflow on the subscription); OAuth clients and API keys (Apigee App plus API Key, Kong consumer credential, AWS API key); configured developer-portal instances and API documentation (a first-class surface on Apigee, Kong, Azure, IBM, Postman); separable rate-limit and quota config (distinct from broader policies: AWS usage-plan throttle plus quota, Apigee quota, Kong rate-limit plugin); backend or upstream services (Kong Service, Apigee Target Server, Azure Backend); and governed change proposals (Postman API network; Specialist, single-vendor). Audit logs (`api_audit_logs`) are Core and may route to a future API Security domain if that promotes.

Recommended: yes, but additive and can happen after the modules exist. The substrate is real and uniform across vendors; it is non-blocking because the four-module skeleton (q1) can land first and absorb these masters per the surface matrix.

a7:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2.speclock q3=B2-S2.specapprover q4=B2-S2.policyapprover q5=B2-S2.consumerpii q6=B2-S3 q7=B3-S1 | domain_id=79 | phase0=.tmp_deploy/APIM-phase0-2026-06-08.md | reversed: none -->
