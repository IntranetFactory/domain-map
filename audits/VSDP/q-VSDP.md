# Value Stream Delivery Platform (VSDP): questions waiting for you

## What this domain is
The single platform that carries software from source code to live release, then measures how fast and reliably that flow runs. It covers source control and code review, CI/CD pipeline orchestration, build and artifact management, deployment and release orchestration, and value-stream analytics (DORA and flow metrics). It is the home for the engineering delivery pipeline and the data that shows where that pipeline speeds up or stalls.

---

q1: (answer this first) How should the Value Stream Delivery Platform be split into modules (the sub-areas of the product)?

- a) One consolidated VSDP-Platform module (everything in one place, matches GitLab Ultimate's positioning).
- b) Two modules: Dev Pipeline (source control plus CI/CD plus artifacts) and Delivery and Value Stream (deployment plus value-stream analytics).
- c) Four modules: Source Control, CI/CD, Deployment Management, and Value Stream Analytics.
- d) A VSDP-Platform monolith plus a smaller VSDP-Starter kit for SMB buyers.

Recommended: b. The one seam every modular vendor agrees on is upstream-build versus downstream-deliver-and-measure: Atlassian splits Bitbucket Pipelines (build) from Bamboo (deploy), Harness sells CI and CD as separate priced modules, Octopus and Argo CD are deploy-only products, and Plandek and LinearB sell only the measurement slice. GitLab Ultimate sells the whole thing as one consolidated tiered product, which argues against fragmenting more than necessary and rules out the four-way split at build time. Azure DevOps (Repos / Pipelines / Artifacts / Test Plans / Boards) proves a finer split is possible later, but it bundles artifacts with the build side, which is why artifacts go in the Dev Pipeline module here. The 2-split is the only shape that is both faithful to the seam all vendors share and minimal enough to match the consolidated sellers. It is the build gate: it sets the module roster the loader writes and unblocks capabilities, edges, lifecycle states, roles, and every per-module item below.

a1:

---

q2: Which flagship vendors should be authored as solutions on this domain, and at what coverage?

- a) Primary tier only: GitLab Ultimate, GitHub Enterprise (Actions and Advanced Security rolled up), Azure DevOps Services.
- b) Primary tier plus secondary CI/CD and delivery specialists: Jenkins (CloudBees), CircleCI, Buildkite, Harness CD, Argo CD, Octopus Deploy.
- c) Everything in (b) plus the pure-play VSM specialists Plandek and LinearB.

Recommended: c. GitLab Ultimate, GitHub Enterprise, and Azure DevOps Services are the primary tier: broad platforms that span repos through analytics and define the consolidated-platform shape. Jenkins/CloudBees, CircleCI, Buildkite, Harness CD, Argo CD, Octopus Deploy, and the Atlassian surface (Bitbucket, Bitbucket Pipelines, Bamboo) validate the sub-slices as secondary coverage. Plandek and LinearB are non-optional: they are pure-play VSM vendors that master no repos or pipelines and sell only the analytics slice, so without them value_stream_metrics reads as a GitLab/Azure feature rather than a market with standalone vendors. This choice also unlocks the vendor-terminology aliases, which need a solution row to point at.

a2:

---

q3: Where should test runs be mastered relative to this domain and the Test Management domain?

- a) Keep Test Management as the canonical owner of test runs, with no embedded copy here.
- b) Let a VSDP CI/CD module hold test runs as an embedded master while Test Management stays canonical.
- c) Make no change here, and only flag the test-defects relationship owner-side for the Test Management team's own next pass.

Recommended: a. The flagship vendors do not blur pipeline runs and test runs into one record. Azure DevOps keeps Test Plans a separate named service from Pipelines, with test runs and results as first-class objects that a pipeline run merely references via the publish-test-results task. GitLab keeps the CI job distinct from the JUnit test reports it ingests, and CircleCI/Jenkins treat test results as artifacts attached to a run, not as the run itself. So CI/CD orchestrates and references test execution while assertion authoring and result detail are a separate mastery: keep Test Management canonical and have the VSDP CI/CD module link to test_runs rather than embed them.

a3:

---

q4: Is a software deployment the umbrella event over platform-specific realizations, or a derived view computed from them?

- a) Keep it as a master: the umbrella release event that platform-specific records (Helm releases, PaaS deployments) realize.
- b) Flip it to a derived/computed view rolled up from the platform-specific masters (matches the pure-play VSM normalization model).

Recommended: a. The deployment-owning vendors all persist it as a first-class master record: Octopus records each deployment of a release to an environment, Argo CD reconciles desired state into an actual sync/deployment record, and Harness CD tracks each deployment with its own lifecycle (queued, in-progress, succeeded, rolled-back). Only Plandek and LinearB treat deployment as a derived/computed event, and they do so precisely because they normalize signals pulled from those underlying tools rather than owning the deployment. Keep software_deployments as the umbrella master so a single canonical release event anchors the cross-domain handoffs (incident, change, observability); the derived shape only pays off once a normalization layer over multiple platform masters actually exists, which VSDP does not yet have.

a4:

---

q5: Should Atlassian Bitbucket, Bitbucket Pipelines, and Bamboo be added as solutions in the same load that creates the modules?

- a) Same load (added alongside the other solutions).
- b) Separate later load.
- c) Skip them.

Recommended: a. Atlassian is a real flagship in this market (Bitbucket for SCM and pull requests, Bitbucket Pipelines for cloud CI/CD, Bamboo for server-side deployment), so adding its delivery surface in the same pass keeps the solutions inventory complete from the start and avoids a second loader run.

a5:

---

q6: Which compliance frameworks should be attached to this domain, if any?

- a) None on VSDP: keep supply-chain regulation on the candidate AppSec and supply-chain-security domains (current state).
- b) Attach the build-artifact-relevant subset (SLSA plus NIST SSDF) to VSDP.
- c) Attach all four (NIST SSDF SP 800-218, EO 14028, EU Cyber Resilience Act, SLSA) to VSDP.

Recommended: a. The flagship platforms surface supply-chain-security signals but do not carry the frameworks as their own subject. GitHub Advanced Security provides SAST, secret scanning, dependency review, artifact attestations, and SBOM export that map to SLSA and NIST SSDF but are sold as a security add-on; GitLab Ultimate surfaces security dashboards and compliance pipelines as a tier capability over the pipeline. Neither models NIST SSDF, EO 14028, the EU Cyber Resilience Act, or SLSA as governed framework objects; those are the subject matter of dedicated AppSec and supply-chain-security domains (where Snyk, Chainguard, Sigstore, and JFrog Xray live). VSDP consumes and enforces policy (build gates, attestation requirements) but is not the regulation's home, the way employment law attaches to hiring rather than to the delivery pipeline that enforces a gate. Pick (b) only if you want build-artifact lifecycle policy enforceable from this domain directly.

a6:

---

q7: Should build artifacts be locked as immutable once published, so a published artifact can never be edited (its provenance attestation is the lock)? (yes/no)

Recommended: yes. A published artifact is a fixed, attested object; locking it preserves an accurate record of what shipped. This sets a structured flag on the entity, so it needs your confirmation.

a7:

---

q8: Should software deployments require a single named approver, to match regulated (SOX/GxP-grade) change windows? (yes/no)

Recommended: yes. A regulated deploy normally has one accountable change approver per request. This sets a structured flag on the entity, so it needs your confirmation.

a8:

---

## Optional (will not hold up the build)

q9: Fifteen extra entity candidates show up across the flagship vendors (deployment environments, feature flags, secrets, IaC modules, container images, SBOMs, package registries, runners, release versions, branch protection rules, merge queues, deployment strategies, supply-chain attestations, vulnerability findings, engineering workflows). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules exist. Several are near-universal across the vendor set; a few resolve to "consume from a candidate-queue domain" (feature flags, artifact registry, supply-chain security, AppSec) depending on whether those domains get promoted, so they still want a verification pass first.

a9:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B2-4 q5=B2-5 q6=B2-6 q7=B2-7.submitlock q8=B2-7.singleapprover q9=B3-1+B3-2+B3-3+B3-4+B3-5+B3-6+B3-7+B3-8+B3-9+B3-10+B3-11+B3-12+B3-13+B3-14+B3-15 | domain_id=80 -->
