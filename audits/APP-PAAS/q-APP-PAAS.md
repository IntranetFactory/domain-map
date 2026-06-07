# Application Platform as a Service (APP-PAAS): questions waiting for you

## What this domain is
Ship code-first apps to a managed runtime without running the servers yourself.

Deploy web apps, APIs, and workers to a platform that builds on every commit, auto-scales, and provisions databases, caches, and queues as add-ons. Promote releases across environments, watch each deployment, and roll back a failed one without touching infrastructure. This covers the full path from a build to a running, scaled application: applications, environments, deployments, build records, runtime instances, and add-ons.

---

q1: (answer this first) How should Application Platform as a Service be split into modules (the sub-areas of the product)?

- a) Two modules: Runtime (applications, environments, running instances, and add-ons) and Delivery (the build pipeline and deployments/releases).
- b) A single module covering everything.
- c) An alternative split you specify.

Recommended: a. The two-module split (Runtime plus Delivery) cleanly separates "what is running" from "how it gets built and shipped," and matches how the flagship PaaS vendors present their product. This choice drives every module, capability, lifecycle owner, and per-module link below it, so it unlocks the rest of the build.

a1:

---

q2: For the managed-runtime capability, how should it be named and linked?

- a) Link Application Platform as a Service to the existing shared capability LCAP-MANAGED-RUNTIME (id 333).
- b) Author a parallel capability named just for this domain (APP-PAAS-MANAGED-RUNTIME).
- c) Rename the existing capability to MANAGED-RUNTIME (drop the LCAP prefix) and link both domains to it.

Recommended: a. The low-code domain already links to LCAP-MANAGED-RUNTIME and clearly shares the managed-runtime shape, so reusing it avoids a duplicate. Renaming to a neutral MANAGED-RUNTIME only earns its keep once a third domain shares it, so hold the rename for now.

a2:

---

q3: Should add-on marketplace be its own top-level capability, or folded into environment management?

- a) Keep add-on marketplace as its own top-level capability.
- b) Fold it into environment management, since add-ons attach to environments.

Recommended: a. Provisioning databases, caches, and queues from a marketplace is a distinct buyer-recognizable capability across the vendor set, so it reads more clearly as its own line.

a3:

---

q4: Should a deployment be frozen once it succeeds, so a successful deployment is immutable and a rollback creates a new deployment rather than editing the old one? (yes/no)

Recommended: yes. A succeeded deployment is a fixed record of what shipped; rollback should produce a fresh deployment. This overwrites a current value, so it needs your confirmation.

a4:

---

q5: Should a build record be frozen once the build completes, so the build artifact is immutable? (yes/no)

Recommended: yes. A completed build is a fixed artifact and locking it keeps an accurate record of what was built. This overwrites a current value, so it needs your confirmation.

a5:

---

q6: Should add-ons be treated as carrying sensitive content, since database and cache add-ons hold connection strings or credentials at provisioning? (yes/no)

Recommended: yes. Add-on provisioning routinely surfaces credentials, so flagging the master as sensitive is appropriate. This overwrites a current value, so it needs your confirmation.

a6:

---

q7: How should a running instance's lifecycle be modeled?

- a) A five-state workflow (starting, running, scaling, draining, stopped), with transitions firing from the autoscaler rather than a person.
- b) Config-shape on a state column, with no explicit lifecycle states, since the autoscaler reconciles instances continuously.

Recommended: b. Running instances are reconciled continuously by the autoscaler, so treating the state as config-shape avoids cluttering the workflow surface with reconciliation states. The other five masters keep their explicit workflows.

a7:

---

q8: Three entities arrive from neighbor domains (published apps from low-code, container workloads from the Kubernetes platform, and software deployments from value-stream delivery). Should each be declared as a consumed, optional dependency on the receiving module, or left as domain-level only?

- a) Declare all three as consumer plus optional on the receiving module.
- b) Declare only a subset (you name which).
- c) Leave all three as domain-level only (no per-module dependency row).

Recommended: a. Declaring them as consumed dependencies captures the cross-domain links in the catalog, which is the cleaner record. The receiving module follows from the q1 split.

a8:

---

q9: One outbound handoff (a successful deployment notifying the Kubernetes platform) is tagged with the process "Install/configure/upgrade infrastructure components." An earlier audit proposed "Deploy services/solutions" instead. Which tagging should it carry?

- a) Keep the existing tag only.
- b) Replace it with "Deploy services/solutions" (removes the existing tag and inserts the new one).
- c) Co-tag both (additive insert, keep both).

Recommended: c. The deployment-succeeded handoff plausibly fits both processes, so co-tagging is additive and loses nothing. Replacing removes an existing tag, so that option needs your call.

a9:

---

q10: Should I draft and load vendor-brand alias tuples for the masters (for example Heroku "dyno" and "config vars," Fly.io "machine," App Engine "version," Azure App Service "deployment slot"), each tied to the vendor it belongs to? (yes/no)

Recommended: yes, once you confirm the exact (master, vendor, label) tuples. The generic synonyms are already loaded; these vendor-anchored tuples need your sign-off on the exact list before the bulk insert.

a10:

---

## Optional (will not hold up the build)

q11: Should I research and add a release-versions master, separate from a deployment, to name the immutable released version (some vendors split this from the deployment, others collapse it)? (yes/no)

Recommended: yes if vendor research confirms the split holds up; it would sit on the Delivery module and back the rollback workflow more cleanly. Additive and non-blocking.

a11:

---

q12: Should I add a secrets / config-vars master (Heroku config vars, Vercel environment variables, Render environment groups, Fly.io secrets)? (yes/no)

Recommended: yes; it is near-universal across modern PaaS and would sit on the Runtime module. If a dedicated secrets-management domain is later authored, it can embed this instead. Additive and non-blocking.

a12:

---

q13: Should I add a log-streams master (Heroku log drains, Vercel logs, Render logs), or leave logs to be consumed from the observability domain? (yes/no)

Recommended: yes if you want it mastered here; several vendors expose log surfaces directly through the PaaS API, so it is a defensible Runtime-module entity. Additive and non-blocking.

a13:

---

q14: Should I add a custom-domains master covering domain attachment and TLS certificate lifecycle (Heroku, Vercel, Render, Netlify, Fly.io)? (yes/no)

Recommended: yes; it is universal and a distinct workflow from environments, since one environment can attach several custom domains. It would sit on the Runtime module. Additive and non-blocking.

a14:

---

<!-- agent map, ignore: q1=B2-S1.split q2=B2-S1.capability q3=B2-S1.addonmarketplace q4=B2-S3.deployments q5=B2-S3.buildrecords q6=B2-S3.addons q7=B2-S4 q8=B2-S5 q9=B2-H1 q10=B2-ALIASES q11=B3-RELEASE-VERSIONS q12=B3-SECRETS q13=B3-LOG-STREAMS q14=B3-CUSTOM-DOMAINS | domain_id=76 -->
