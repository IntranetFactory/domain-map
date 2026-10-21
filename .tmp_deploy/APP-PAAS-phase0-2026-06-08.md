# APP-PAAS Phase 0 - Vendor Surface (2026-06-08)

Research-only artifact for the Rule #22 remediation pass on APP-PAAS (domain_id=76, UNBUILT: 0 modules, 0 capabilities). Grounds the market-shape `b2` calls in q-APP-PAAS.md. No DB writes. Sources: vendor docs queried 2026-06-08 (Heroku Dev Center, Render Docs, Fly.io Docs, Railway Docs, Vercel Docs, Google Cloud App Engine, Azure App Service Learn, AWS Elastic Beanstalk DG, DigitalOcean App Platform Docs).

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| Heroku | devcenter.heroku.com | The category-defining 12-factor PaaS; explicit app/dyno/config-var/add-on/release/pipeline model | Reference shape for the whole market; only vendor with a true add-on marketplace + append-only release ledger |
| Render | render.com/docs | Modern Heroku-replacement; services + projects/environments + environment groups | Mid-market modern pure-play; clean projects/environments model, no add-on marketplace (managed DBs direct) |
| Fly.io | fly.io/docs | Geo-distributed runtime; apps group individually-controllable Machines | The one vendor whose runtime unit (Machine) is individually runnable/controllable, not pure autoscaler-reconciled |
| Railway | docs.railway.com | Modern pure-play; services + environments + shared variables + volumes | Confirms the modern services/deployments/environments/variables convergence; no marketplace |
| AWS Elastic Beanstalk | docs.aws.amazon.com/elasticbeanstalk | AWS-native managed app runtime | Cleanest application / application-version / environment split (version = S3 build artifact, environment = running infra) |
| Google App Engine | cloud.google.com/appengine | GCP-native | Cleanest service / version / instance split (version = deployed code + config; instance = autoscaler-managed runtime) |
| Azure App Service | learn.microsoft.com/azure/app-service | Azure-native | Deployment-slots = environment promotion; app-settings = config; per-slot custom domains; plan-level scale-out |
| Vercel | vercel.com/docs | Frontend-first edge-aware PaaS | Project / deployment / environment / env-var / domain model; deployment = "result of a successful build" |
| DigitalOcean App Platform | docs.digitalocean.com/products/app-platform | Mid-market | Components/apps/deployments/env-vars/domains/buildpacks; launched an add-ons marketplace in 2022 |

## Surface matrix

Columns: Hk=Heroku, Rn=Render, Fl=Fly.io, Rw=Railway, EB=Elastic Beanstalk, GAE=App Engine, AAS=Azure App Service, Vc=Vercel, DO=DigitalOcean. ● = first-class entity; ○ = present but folded into another entity; blank = not modeled as a distinct surface.

| Entity (catalog name) | Category | Hk | Rn | Fl | Rw | EB | GAE | AAS | Vc | DO | Class | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| paas_applications | Master | ● | ● | ● | ● | ● | ● | ● | ● | ● | Core | RUNTIME |
| paas_environments | Master | ●(pipeline stages) | ● | ○ | ● | ● | ○ | ●(slots) | ● | ○ | Core | RUNTIME |
| paas_deployments | Master | ● | ● | ● | ● | ○ | ● | ● | ● | ● | Core | DELIVERY |
| paas_build_records | Master | ●(build) | ●(build logs) | ●(image build) | ● | ●(app version=artifact) | ○ | ○ | ●(build) | ●(buildpack build) | Core | DELIVERY |
| paas_release_versions | Master/Junction | ●(release ledger) | ○(deploy version) | ●(release) | ○ | ●(application version) | ●(version) | ●(slot/release) | ○(deployment=release) | ○ | Core | DELIVERY |
| paas_runtime_instances | Master/Config | ●(dyno) | ●(instance) | ●(Machine) | ●(replica) | ●(EC2 instance) | ●(instance) | ●(instance) | ○(serverless) | ●(instance) | Core | RUNTIME |
| paas_addons | Master | ●(add-on) | ○(managed DB direct) | ○(managed DB direct) | ○(plugin/DB) | | ○ | ○(connected svc) | ●(integration) | ●(marketplace add-on) | Common | RUNTIME |
| paas_secrets / paas_config_vars | Master | ●(config vars) | ●(env vars + env groups) | ●(secrets) | ●(variables + shared vars) | ●(env properties) | ●(env vars) | ●(app settings) | ●(env vars, encrypted at rest) | ●(env vars, app+component) | Core | RUNTIME |
| paas_log_streams | Master/Consumer | ●(log drains) | ●(logs) | ●(logs) | ●(logs) | ○ | ○ | ○ | ●(build/runtime logs) | ●(logs) | Core | RUNTIME |
| paas_custom_domains | Master | ●(custom domains) | ●(custom domains + TLS) | ●(certificates) | ●(domains) | ○ | ○ | ●(custom domain per slot + TLS) | ●(domains + auto SSL) | ●(custom domain + TLS) | Core | RUNTIME |
| paas_volumes | Master | ○(ephemeral) | ●(disks) | ●(volumes + snapshots) | ●(volumes) | ○ | | | | ○ | Common | RUNTIME (not in scope this pass) |

## Compliance entities (non-optional for the market)

APP-PAAS is lightly regulated relative to ATS/healthcare/finance. No FCRA/HIPAA/GDPR-subject-rights master set is intrinsic. The one in-scope regulatory anchor already on the domain is EU-CRA (Cyber Resilience Act), which lands as product-security obligations, not a vendor-archetype entity. No statute-prefixed master is forced. (If a future deployment is in-scope for SOC 2 / FedRAMP, audit-log entities surface from the platform layer, not from APP-PAAS masters.)

## Key per-decision evidence

**Runtime vs Delivery split (q1).** The "what is running" vs "how it gets built and shipped" separation is vendor-real, not a catalog convenience:
- Beanstalk is the cleanest: an **application version** "points to an Amazon S3 object that contains the deployable code" and is "unique"; an **environment** is the provisioned running infra. Versions are managed independently of environments (you deploy a version *into* an environment).
- App Engine separates a **version** ("a specific set of source code and configuration files") from **instances** ("the basic building blocks ... providing resources to host your application"). Build/deploy produces versions; the autoscaler produces/destroys instances.
- Heroku separates the **build** + **release** (an append-only ledger of build artifact + config vars) from the **dyno** (the running container).
- Fly.io separates `fly deploy` (which "creates a new release ... builds and deposits the image in the registry") from the **Machine** (the running VM).
- Counter-evidence (mild): the modern pure-plays (Render, Railway, Vercel, DO) present a more collapsed "service that auto-builds-and-runs" surface where build, deploy, and run read as one continuous flow. But even they expose deployments and build logs as distinct, inspectable records (Vercel: "a deployment is the result of a successful build"; Render: separate deploys + build logs). The split holds; the modern vendors just market it less prominently.

**Managed-runtime capability sharing with LCAP-MANAGED-RUNTIME (q2).** Both APP-PAAS (code-first) and LCAP (low-code) deliver a managed application runtime where the buyer ships an app and the platform runs it without server management. The runtime abstraction (autoscaling, instance management, zero-server) is identical in shape; the difference is the artifact (code vs visual app). This is genuinely shared. KUBE-PLAT is a third candidate but markets a *cluster/workload* runtime (container orchestration), a different buyer abstraction, so the cross-cutting count is firmly 2 today (LCAP + APP-PAAS), not 3.

**Addon marketplace as a top-level surface (q3).** Split evidence. Heroku markets the **Elements Marketplace** (elements.heroku.com, 200+ add-ons, partner-maintained, install from dashboard/CLI, centralized billing) as a distinct, named buyer surface. DigitalOcean launched an **add-ons marketplace** in 2022. BUT Render, Fly.io, Railway, Vercel do NOT run a marketplace: they offer managed databases/caches/queues directly as platform-provisioned resources (Render managed Postgres, Fly.io managed DBs, Railway plugins/DBs). So "provision a backing service" is universal; the "marketplace as a recognizable catalog surface" is a Heroku/DO specialty, not a market-wide line. The capability that IS market-wide is "attach a managed backing service (database/cache/queue)", which is broader than "marketplace".

**Deployment/build immutability (q4/q5).** Strong, multi-vendor:
- Heroku: releases are "an append-only ledger of your app's build artifact and config vars ... automatically persisted." Append-only = immutable; a new config/build creates a NEW release.
- Beanstalk: "each application version is unique"; rollback is deploying a *different* (prior) version, not editing one.
- App Engine: versions are "a specific set of source code and configuration files"; deploying again "creates additional versions" rather than mutating one; rollback = route traffic to a prior version.
- Build artifacts (the S3 WAR in Beanstalk, the registry image in Fly.io, the buildpack output in DO/Heroku) are content-addressed build outputs, immutable once produced.

**Addons carry credentials at provisioning (q6).** Heroku: provisioning an add-on injects config vars ("a release extends your build artifact and includes config vars and add-ons"; Heroku Postgres/Redis attach connection strings). DigitalOcean: env vars hold "secrets, API keys ... connection details for an external database." Render env groups + Fly.io secrets are the same shape. Provisioning a backing service routinely materializes a connection string / credential. Grounded.

**Runtime-instance lifecycle shape (q7).** The dominant pattern is autoscaler-reconciled, not user-driven:
- App Engine: "At any given time, your application can be running on one or many instances"; instances are created/destroyed by the scaling configuration (automatic/manual/basic), not by a user workflow.
- Azure: "All apps in an App Service plan scale together"; scale-out adds/removes instances per autoscale rules.
- Heroku dynos scale via `heroku ps:scale`; the dyno lifecycle (starting/up/crashed/restarting) is process-managed, not a human approval chain.
- Genuine counter-evidence: Fly.io **Machines** are "individually runnable and controllable" (a user CAN start/stop a specific Machine), so one vendor exposes a user-controllable instance lifecycle. This is a minority shape. The market-wide reading is config-shape (a state column reconciled continuously), with Fly.io as the exception that proves a workflow exists for the power-user case.

**Consumer DMDO inbound payloads (q8).** APP-PAAS receives published apps from LCAP (lcap_apps), container workloads from KUBE-PLAT (container_workloads), and software deployments from VSDP (software_deployments). None of these are mastered by a PaaS vendor; they are upstream artifacts a PaaS consumes (a low-code app gets deployed *to* a runtime; a container workload is *what* runs; a software-deployment record *tracks* the release). Declaring them consumer+optional captures the dependency; vendors don't master these because they originate elsewhere.

## Modularization hypothesis

**APP-PAAS-RUNTIME** scopes "what is running and the resources it needs": paas_applications (the app entity), paas_environments (staging/prod isolation), paas_runtime_instances (dynos/machines/instances), paas_addons (attached backing services), and the substrate masters paas_secrets/config_vars, paas_log_streams, paas_custom_domains. This is the operational surface a buyer manages day-to-day after shipping.

**APP-PAAS-DELIVERY** scopes "how code becomes a running release": paas_build_records (the build artifact), paas_deployments (the deploy action targeting an environment), and paas_release_versions (the immutable version the deploy produces, if split from deployment). This is the CI/CD-shaped surface that fires on every commit.

The split mirrors the Beanstalk application-version-vs-environment and App-Engine-version-vs-instance separations directly: build/version/deploy on one side, app/environment/instance/addon on the other. The two modules wire together via two intra-domain handoffs (deployment.succeeded DELIVERY→RUNTIME produces instances; environment.promoted RUNTIME→DELIVERY redirects subsequent deploys).
