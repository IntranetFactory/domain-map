# Application Platform as a Service (APP-PAAS): questions waiting for you

## What this domain is
Ship code-first apps to a managed runtime without running the servers yourself.

Deploy web apps, APIs, and workers to a platform that builds on every commit, auto-scales, and provisions databases, caches, and queues as add-ons. Promote releases across environments, watch each deployment, and roll back a failed one without touching infrastructure. This covers the full path from a build to a running, scaled application: applications, environments, deployments, build records, runtime instances, and add-ons.

> Grounding: these recommendations are backed by a fresh vendor-surface study (9 flagship code-first managed-runtime vendors, 2025-2026 product docs) saved at `.tmp_deploy/APP-PAAS-phase0-2026-06-08.md`. The study confirmed the build-vs-runtime split is vendor-real, reversed the add-on-marketplace framing (a marketplace is a Heroku/DigitalOcean specialty, not a market-wide surface; the universal capability is attaching a managed backing service), and confirmed all four substrate entities (config vars, log streams, custom domains, release versions) as Core across the vendor set.

---

q1: (answer this first) How should Application Platform as a Service be split into modules (the sub-areas of the product)?

- a) Two modules: Runtime (applications, environments, running instances, and add-ons) and Delivery (the build pipeline and deployments/releases).
- b) A single module covering everything.
- c) An alternative split you specify.

Recommended: a. AWS Elastic Beanstalk separates an application version (an S3-backed deployable) from the environment it deploys into, Google App Engine separates a version from its instances, Heroku separates the build-plus-release ledger from the dyno that runs it, and Fly.io separates `fly deploy` (which builds and deposits an image in the registry) from the Machine that runs, so the build-vs-runtime split is vendor-real across the incumbents (the phase-0 study confirmed it). The modern pure-plays (Render, Railway, Vercel, DigitalOcean) market it more collapsed but still expose deployments and build logs as distinct records, so the split holds across the set, and it drives every module, capability, lifecycle owner, and per-module link below it.

a1:

---

q2: For the managed-runtime capability, how should it be named and linked?

- a) Link Application Platform as a Service to the existing shared capability LCAP-MANAGED-RUNTIME (id 333).
- b) Author a parallel capability named just for this domain (APP-PAAS-MANAGED-RUNTIME).
- c) Rename the existing capability to MANAGED-RUNTIME (drop the LCAP prefix) and link both domains to it.

Recommended: a. The managed-runtime abstraction (the platform runs your app, autoscales it, and manages instances with no server management) is identical in shape between code-first PaaS and low-code (LCAP); only the artifact differs (code vs a visual app). Across the PaaS vendors this is exactly what App Engine ("your application can be running on one or many instances"), Heroku (dynos), Azure App Service (plan-level scale-out), and Fly.io (Machines) all sell, and it is the same runtime LCAP platforms wrap around a no-code builder. Reusing LCAP-MANAGED-RUNTIME avoids a duplicate. Renaming to a neutral MANAGED-RUNTIME only earns its keep once a third domain shares it; the natural third candidate, KUBE-PLAT, markets a cluster/workload runtime (container orchestration), a different buyer abstraction, so the shared count is firmly 2 today, below the >=3-domain threshold for the neutral name. Hold the rename for now.

a2:

---

q3: Add-ons are universal (every PaaS lets you attach a database, cache, or queue), but a branded add-on marketplace is not. Should the add-on capability be modeled as its own top-level capability, and named for the marketplace or for managed-service attachment?

- a) Keep it as its own top-level capability, named for managed-service / backing-service attachment (not "marketplace"), since attaching a managed database/cache/queue is universal across the vendor set.
- b) Keep it as its own top-level capability named for the add-on marketplace surface.
- c) Fold it into environment management, since add-ons attach to environments.

Recommended: a. REVERSED from the prior recommendation after the vendor check. The prior call kept "add-on marketplace" as its own capability on the premise it was "a distinct buyer-recognizable capability across the vendor set." The fresh evidence shows the marketplace surface is a minority: Heroku markets the Elements Marketplace (elements.heroku.com, 200+ partner-maintained add-ons) and DigitalOcean launched an add-ons marketplace in 2022, but Render, Fly.io, Railway, and Vercel run no marketplace at all, they provision managed databases/caches/queues directly (Render managed Postgres, Fly.io managed databases, Railway plugins). So the universal capability is "attach a managed backing service," and the marketplace is a Heroku/DigitalOcean packaging of it. Keep the capability as its own line (provisioning a backing service is a distinct workflow from environment configuration, so do not fold it into environment management per option c), but name it for the universal shape rather than the marketplace, so the capability reads true for the whole vendor set, not just two vendors.

a3:

---

q4: Should a deployment be frozen once it succeeds, so a successful deployment is immutable and a rollback creates a new deployment rather than editing the old one? (yes/no)

Recommended: yes. The vendor set treats a shipped deployment/release as an immutable record. Heroku releases are "an append-only ledger of your app's build artifact and config vars, automatically persisted," so any change creates a new release rather than editing one. AWS Elastic Beanstalk states "each application version is unique," and rollback means deploying a prior version, not editing the current one. Google App Engine creates "additional versions" on each deploy and rolls back by routing traffic to a prior version. Locking a succeeded deployment matches all three. This overwrites a current value, so it needs your confirmation.

a4:

---

q5: Should a build record be frozen once the build completes, so the build artifact is immutable? (yes/no)

Recommended: yes. Build artifacts in the vendor set are content-addressed, immutable outputs: the S3 WAR object behind a Beanstalk application version, the registry image Fly.io "deposits in the registry" on deploy, and the buildpack output Heroku and DigitalOcean produce. A completed build is a fixed artifact, and locking it keeps an accurate record of what was built and what a release points at. This overwrites a current value, so it needs your confirmation.

a5:

---

q6: Should add-ons be treated as carrying sensitive content, since database and cache add-ons hold connection strings or credentials at provisioning? (yes/no)

Recommended: yes. Provisioning a backing service routinely materializes a credential across the vendor set. Heroku says "a release extends your build artifact and includes config vars and add-ons," and provisioning Heroku Postgres or Redis attaches a connection string as a config var. DigitalOcean uses environment variables for "secrets, API keys, and connection details for an external database." Render environment groups and Fly.io secrets are the same shape. Flagging the add-on master as sensitive is appropriate. This overwrites a current value, so it needs your confirmation.

a6:

---

q7: How should a running instance's lifecycle be modeled?

- a) A five-state workflow (starting, running, scaling, draining, stopped), with transitions firing from the autoscaler rather than a person.
- b) Config-shape on a state column, with no explicit lifecycle states, since the autoscaler reconciles instances continuously.

Recommended: b. The dominant shape across the vendor set is autoscaler-reconciled, not a human workflow. Google App Engine instances are created and destroyed by the scaling configuration ("at any given time, your application can be running on one or many instances"), Azure App Service scales out and in per autoscale rules where "all apps in an App Service plan scale together," and Heroku dynos scale via `ps:scale` with a process-managed lifecycle. Treating instance state as config-shape avoids cluttering the workflow surface with reconciliation states, and the other five masters keep their explicit workflows. Honest caveat: Fly.io is the exception, its Machines are "individually runnable and controllable," so one vendor does expose a user-controllable instance lifecycle. That is a minority power-user shape, so config-shape is the right market-wide default, but if you want to model the Fly.io-style controllable instance, option a captures it.

a7:

---

q8: Three entities arrive from neighbor domains (published apps from low-code, container workloads from the Kubernetes platform, and software deployments from value-stream delivery). Should each be declared as a consumed, optional dependency on the receiving module, or left as domain-level only?

- a) Declare all three as consumer plus optional on the receiving module.
- b) Declare only a subset (you name which).
- c) Leave all three as domain-level only (no per-module dependency row).

Recommended: a. None of these three is mastered by a PaaS vendor; they originate upstream and a PaaS consumes them (a low-code app gets deployed to a runtime, a container workload is what runs, a software-deployment record tracks a release elsewhere). That is precisely why declaring them consumer plus optional is the accurate model: the PaaS reads them, it does not own them. Doing so captures the cross-domain links in the catalog rather than leaving them implicit. The receiving module follows from the q1 split (Runtime receives published apps and container workloads; Delivery receives software deployments).

a8:

---

q9: One outbound handoff (a successful deployment notifying the Kubernetes platform) is tagged with the process "Install/configure/upgrade infrastructure components." An earlier audit proposed "Deploy services/solutions" instead. Which tagging should it carry?

- a) Keep the existing tag only.
- b) Replace it with "Deploy services/solutions" (removes the existing tag and inserts the new one).
- c) Co-tag both (additive insert, keep both).

Recommended: c. The deployment-succeeded handoff plausibly fits both processes, so co-tagging is additive and loses nothing. Replacing removes an existing tag, so that option needs your call.

a9:

---

q10: Should I draft and load vendor-brand alias tuples for the masters, each tied to the vendor it belongs to? (yes/no)

Recommended: yes, once you confirm the exact (master, vendor, label) tuples. The vendor docs give clean, vendor-specific labels for the same canonical masters: Heroku "dyno" (runtime instance), "config vars" (secrets), "log drains" (log streams), "release" (release version); Fly.io "Machine" (runtime instance), "secrets"; Google App Engine "version" (release version), "instance" (runtime instance); AWS Elastic Beanstalk "application version" (build record / release), "environment"; Azure App Service "deployment slot" (environment / release), "app settings" (secrets); Vercel "project" (application), "integration" (add-on); Render "service" (application), "environment group" (secrets). The generic synonyms are already loaded; these vendor-anchored tuples carry a solution_id so the catalog records which vendor uses which label, and need your sign-off on the exact list before the bulk insert.

a10:

---

## Optional (will not hold up the build)

q11: Should I add a release-versions master, separate from a deployment, to name the immutable released version? (yes/no)

Recommended: yes. The vendor surface puts a named, immutable version distinct from the deploy action at Core level: Heroku's append-only "release" ledger, Google App Engine's "version" ("a specific set of source code and configuration files" that you switch between for rollback), AWS Elastic Beanstalk's "application version" (unique, S3-backed), and Azure App Service's slot/release. The modern pure-plays collapse it (Vercel's "deployment is the result of a successful build" doubles as the version), but the incumbents split it cleanly, and a separate version master backs the rollback workflow more cleanly than a deployment alone. It would sit on the Delivery module. Additive and non-blocking.

a11:

---

q12: Should I add a secrets / config-vars master? (yes/no)

Recommended: yes. This is the most uniformly Core entity in the matrix: every one of the nine vendors models it as a first-class surface, Heroku "config vars," Render "environment variables" plus shareable "environment groups," Fly.io "secrets," Railway "variables" plus "shared variables," AWS Elastic Beanstalk "environment properties," Google App Engine env vars, Azure App Service "app settings," Vercel env vars (encrypted at rest), and DigitalOcean app-level and component-level env vars. It would sit on the Runtime module. If a dedicated secrets-management domain is later authored, it can embed this instead. Additive and non-blocking.

a12:

---

q13: Should I add a log-streams master, or leave logs to be consumed from the observability domain? (yes/no)

Recommended: yes, mastered here. Several vendors expose the log surface directly through the PaaS, not only through an external observability tool: Heroku "log drains," Vercel build and runtime logs, Render logs, Railway logs, Fly.io logs, DigitalOcean logs. Because the PaaS owns the log-stream attachment and routing surface (Heroku log drains in particular are a canonical PaaS concept), it is a defensible Runtime-module master rather than a pure consumer of the observability domain. Additive and non-blocking.

a13:

---

q14: Should I add a custom-domains master covering domain attachment and TLS certificate lifecycle? (yes/no)

Recommended: yes. Custom domains plus automatic TLS are Core across the set: Render "custom domains" with TLS, Vercel "domains" with auto-provisioned SSL, Heroku custom domains, Fly.io certificates, Netlify domains, DigitalOcean custom domains with TLS, and Azure App Service per-slot custom domains with certificates. It is a distinct workflow from environments (a single environment can attach several custom domains, and Azure even associates domains per deployment slot). It would sit on the Runtime module. Additive and non-blocking.

a14:

---

<!-- agent map, ignore: q1=B2-S1.split q2=B2-S1.capability q3=B2-S1.addonmarketplace q4=B2-S3.deployments q5=B2-S3.buildrecords q6=B2-S3.addons q7=B2-S4 q8=B2-S5 q9=B2-H1 q10=B2-ALIASES q11=B3-RELEASE-VERSIONS q12=B3-SECRETS q13=B3-LOG-STREAMS q14=B3-CUSTOM-DOMAINS | domain_id=76 | phase0=.tmp_deploy/APP-PAAS-phase0-2026-06-08.md | reversed: B2-S1.addonmarketplace marketplace-framing -> managed-service-attachment framing (a kept as own capability but renamed) -->
