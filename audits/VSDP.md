---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 31
---

# VSDP, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 8 entities (all `kind=domain_owned`, via the legacy `domain_data_objects` rollup), 0 `domain_modules` rows, 0 `capabilities` linked via `capability_domains`, 0 `domain_regulations`, 1 `solution_domains` row (Jira Product Discovery, `secondary`, suspected scope creep), 13 `trigger_events` (all with empty `event_category`), 9 outbound + 10 inbound cross-domain handoffs, 0 lifecycle states, 0 entity edges among the 8 VSDP data_objects, 0 `users` edges, 1 system skill (`vsdp-system`, `domain_module_id=NULL`) with 8 query tools.
- Catastrophic structural state: the `domains` row exists with all seven required metadata fields populated (crud_percentage 35, business_logic set, cost_band `$$$`, market size 5500 M USD, source year 2025), but the entire downstream Phase A / Phase B / Phase E / Phase F substrate is missing. M1 fails outright (Rule #14 floor of ≥1 full module per domain). Per the audit procedure's "When to skip" guidance, this domain technically warrants Phase 0 first, but this run still documents the gap so the orchestrator can route work.
- Vendor-surface basis (3-5 flagship vendors, mix of broad platforms + pure-plays + compliance specialist): GitLab Ultimate, GitHub Enterprise + GitHub Actions + GitHub Advanced Security, Azure DevOps Services, Atlassian Open DevOps (Bitbucket Pipelines + Bamboo), Plandek (pure-play VSM), LinearB (pure-play engineering metrics). No statutory specialist exists for VSDP, the supply-chain-security and SBOM regulatory leg (NIST SSDF, EO 14028, EU CRA, SLSA) routes through APPSEC-ORCH / SUPPLY-CHAIN-SEC candidates, not directly into VSDP.
- **Bucket 1 (in-scope, agent fixable):** 10 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 15 items.
- Candidates queued via `append_missing_domain.ts`: 5 new (INTERNAL-DEV-PLAT, GITOPS-DELIVERY, ARTIFACT-REGISTRY, APPSEC-ORCH, SUPPLY-CHAIN-SEC) + 1 mention bump (FEATURE-FLAGGING, count 2 to 3).

### Vendor surface basis (detail)

| Vendor | Why included | Mastering scope |
|---|---|---|
| GitLab Ultimate | Broadest single-product DevSecOps coverage: source-control + CI/CD + container registry + SAST/SCA/DAST + value-stream analytics + feature flags + deployments. Reference schema via GitLab GraphQL/REST API docs. | `source_repositories`, `code_commits`, `pull_requests` (merge_requests in GitLab terms), `ci_pipelines`, `ci_pipeline_runs`, `build_artifacts`, `environments`, `software_deployments`, `value_stream_metrics`, `feature_flags`, `runners`, `container_images`. |
| GitHub Enterprise + Actions + Advanced Security | Largest source-control surface globally; Actions + GHAS are the de facto extension surface. Reference schema via GitHub REST/GraphQL. | `source_repositories`, `code_commits`, `pull_requests`, `workflows` (Actions), `workflow_runs`, `jobs`, `runners`, `packages`, `releases`, `branch_protection_rules`, `merge_queues`, `code_scanning_alerts`, `dependabot_alerts`, `secret_scanning_alerts`. |
| Azure DevOps Services | Enterprise reference for tightly-coupled VSDP, owns Boards + Repos + Pipelines + Test Plans + Artifacts as one platform. | `repositories`, `commits`, `pull_requests`, `pipelines`, `pipeline_runs`, `releases`, `artifacts`, `test_plans` (overlaps TEST-MGMT). |
| Atlassian Open DevOps (Bitbucket Pipelines, Bamboo) | Suite-aligned competitor that pairs Jira/Confluence with VSDP. Currently mis-attached: the only `solution_domains` row on VSDP is Jira Product Discovery, which is a PROD-MGMT product, not a VSDP product. Bitbucket and Bamboo are the real Atlassian VSDP surface and are absent from the catalog. | `repositories`, `commits`, `pull_requests`, `pipelines`, `pipeline_runs`, `deployments`. |
| Plandek (pure-play VSM) | Anchors the value-stream-only specialist segment, normalizes data from multiple VSDP backends into DORA + flow metrics. Forces the audit to keep `value_stream_metrics` and the surrounding analytics surface first-class even when a buyer mixes GitLab + Jenkins + Jira. | `value_stream_metrics`, `flow_items`, `dora_metrics`, `cycle_time_breakdown`, `engineering_workflows` (derived). |
| LinearB (pure-play engineering metrics) | Same surface as Plandek, included to verify the pure-play surface is stable across two independent specialists. | `value_stream_metrics`, `engineering_metrics`, `team_workflows`, `release_cycles`. |

Compliance-specialist column is intentionally absent: VSDP itself is not directly regulated. Supply-chain-security obligations (NIST SSDF, EO 14028, EU CRA, SLSA L3) route through APPSEC-ORCH and SUPPLY-CHAIN-SEC, both queued as Phase 0 candidates by this audit.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix surface |
|---|---|---|---|
| B1-S1 | M1, Rule #14 | Zero `domain_modules` rows on `domain_id=80`. The Rule #14 floor of ≥1 `module_kind='full'` per `domains` row is violated outright. Every downstream B-band, E-band, F-band check is dependent on at least one module existing. | Phase A reload: author ≥1 (likely 2 to 4, see Bucket 2 #1) `domain_modules` rows. Pattern from [scripts/loaders/load_research.ts](../scripts/loaders/load_research.ts). |
| B1-S2 | D1, Phase A | Zero `capability_domains` rows. No capabilities authored. Rule #14's threshold of "domains with ≥3 capabilities need ≥2 modules" is unevaluable until capabilities exist. | Author 3 to 5 capabilities (source-control + collaboration, CI/CD pipeline orchestration, build artifact management, release and deployment orchestration, value-stream analytics) + link via `capability_domains`. |
| B1-S3 | B1 (intra-domain edges) + B7 (built-in `users` edges) | Zero `data_object_relationships` rows between the 8 VSDP entities. The only relationships touching VSDP entities come FROM TEST-MGMT's `test_runs` (gates / blocks ci_pipeline_runs) and `test_defects` (surfaces_from ci_pipeline_runs); none of the obvious intra-VSDP edges exist (source_repository to code_commits, source_repository to pull_requests, code_commits to pull_requests, ci_pipeline to ci_pipeline_runs, ci_pipeline_run to build_artifacts, build_artifact to software_deployments, software_deployments and ci_pipeline_runs to value_stream_metrics). Zero `users` edges per Rule #10 (every VSDP entity has user-typed actors: repository owner, commit author, PR reviewer, pipeline triggerer, deployer, etc). | Author ~8 entity edges + ~6 to 8 user edges in a focused loader. |
| B1-S4 | E-band, Phase E | Zero VSDP-scoped roles. The catalog's role list (under `roles.module_id=1001` since this is a master module) contains zero VSDP personas. Flagship vendor surfaces consistently expose: Developer (IC), Release Manager, Platform Engineer (or DevOps Engineer), Site Reliability Engineer (read), Security Reviewer (for SCA/SAST). | Author 4 to 5 roles + `role_modules` + `role_permissions` once Phase A modules land. Defer to Phase E loader. |
| B1-S5 | F2, F3, Rule #17 | `vsdp-system` (skill id 119) has `domain_module_id=NULL`. Rule #17 requires every `domain_modules` row to host exactly one `skill_type='system'` skill with that FK populated. Skill name uses kebab `vsdp-system` rather than snake `<module_code_lower>_agent` (matches the same pattern that earlier hit ATS in B1-S4 of that audit). The 8 attached `skill_tools` are all `query_*` tools, no `mutate_*` (which Phase B requires once lifecycle states are authored). | After modules land: PATCH skill to set `domain_module_id`, rename to `<module>_agent`, add mutate / fetch / side_effect tools per Rule #17's coverage floor. May need to split into one system skill per module if Bucket 2 #1 picks the multi-module shape. |
| B1-S6 | B5, Rule #13 | All 13 VSDP `trigger_events` (ids 844 to 856) carry `event_category=''`. Rule #13 enumerates the allowed values: `lifecycle`, `state_change`, `threshold`, `signal`. | PATCH 13 rows with the right category per event: `source_repository.created` lifecycle, `source_repository.archived` lifecycle, `code_commit.pushed` signal, `pull_request.opened` lifecycle, `pull_request.merged` state_change, `ci_pipeline.created` lifecycle, `ci_pipeline_run.failed` state_change, `ci_pipeline_run.succeeded` state_change, `build_artifact.published` lifecycle, `software_deployment.completed` state_change, `software_deployment.failed` state_change, `value_stream_metric.published` signal, `value_stream_metric.threshold_breached` threshold. |
| B1-S7 | Rule #12, lifecycle | Zero `data_object_lifecycle_states` rows for any of the 8 VSDP masters. At minimum `pull_requests`, `ci_pipeline_runs`, `software_deployments` carry workflow lifecycles (PR: draft to open to review to approved to merged/closed; pipeline_run: queued to running to succeeded/failed/cancelled; deployment: pending to running to succeeded/failed and a rollback path). Config-shape exemption (Rule #12) may apply to `value_stream_metrics` (derived/computed). | Author lifecycle-states rows on workflow-bearing entities once modules land. Surface the exemption candidate for `value_stream_metrics` to the user per Rule #15 (do not auto-populate notes). |
| B1-B1 | B10b, NULL module FKs | Of 9 outbound handoffs, all 9 have `source_domain_module_id=NULL`. Of 10 inbound handoffs, all 10 have `target_domain_module_id=NULL`. This is mechanical: VSDP has no modules, so there is nothing to point at. The fix is resolved by B1-S1 (modules created) + a follow-up PATCH wave. | Sequenced after B1-S1: a small loader that fills the 19 NULL FKs on the VSDP side once modules exist. |

#### SCOPE-CREEP

| ID | Entity | Current state | Proposed fix |
|---|---|---|---|
| B1-SC1 | `solution_domains` row attaching Jira Product Discovery (solution id 400, vendor Atlassian) to VSDP at `coverage_level='secondary'` | Jira Product Discovery is a Product Management (PROD-MGMT) product; it is not a value-stream or CI/CD product. The legitimate Atlassian VSDP surface (Bitbucket, Bitbucket Pipelines, Bamboo) is not catalogued. | DELETE the `solution_domains` row. Optionally, in a separate Phase A pass, add `Bitbucket`, `Bitbucket Pipelines`, `Bamboo` as `solutions` with primary or secondary `solution_domains` rows on VSDP. |

#### APQC tagging

Routine pass per audit procedure: classify each cross-domain handoff against the APQC PCF Cross-Industry framework while the analyst's mental model is fresh. Anchors identified by ilike-search against `/processes?source_framework=eq.apqc_pcf_cross_industry`:

**Outbound handoffs from VSDP (proposed `agent_curated` rows on `handoff_processes`):**

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|
| 770 | VSDP → APP-PAAS (76) | `software_deployment.completed` | software_deployments | Implement software change/release (L4, 20853) | 1262 | confident L4 |
| 771 | VSDP → TEST-MGMT (8) | `ci_pipeline_run.failed` | ci_pipeline_runs | Build and test IT service/solution components (L5, 20812) | 1939 | confident L5 (L3 parent 281 also valid) |
| 772 | VSDP → SPM (9) | `value_stream_metric.published` | value_stream_metrics | Develop, Manage, and Deliver Analytics (L2, 20959) | 85 | confident L2 cluster anchor |
| 773 | VSDP → OBS (7) | `software_deployment.completed` | software_deployments | Implement software change/release (L4, 20853) | 1262 | confident L4 |
| 774 | VSDP → ITSM (1) | `software_deployment.failed` | service_incidents (cross-domain payload) | Verify change/release implementation success (L4, 20856) | 1265 | confident L4 |
| 775 | VSDP → PROD-MGMT (101) | `pull_request.merged` | pull_requests | Execute IT service/solution creation and testing (L3, 20808) | 281 | confident L3 |
| 776 | VSDP → WORK-MGMT (135) | `pull_request.merged` | pull_requests | Execute IT service/solution creation and testing (L3, 20808) | 281 | confident L3 |
| 777 | VSDP → EPM (66) | `value_stream_metric.threshold_breached` | value_stream_metrics | Develop, Manage, and Deliver Analytics (L2, 20959) | 85 | confident L2 cluster anchor (parallel to handoff 772) |
| 800 | VSDP → GRC (15) | `build_artifact.published` | build_artifacts | Implement software change/release (L4, 20853) | 1262 | medium L4 (the SBOM/provenance angle is closer to APPSEC-ORCH which is candidate-queue) |

**Inbound handoffs to VSDP (tag from the inbound side, owed-by-other-domain unless VSDP itself is the implementing actor):**

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence | Side |
|---|---|---|---|---|---|---|---|
| 616 | OBS → VSDP | `error_group.new_signature` | error_groups | Execute IT service/solution creation and testing (L3, 20808) | 281 | medium L3 (the "fix the bug in code" leg) | source-side tag belongs in OBS audit |
| 617 | OBS → VSDP | `error_group.regression_detected` | error_groups | Verify change/release implementation success (L4, 20856) | 1265 | medium L4 | source-side tag belongs in OBS audit |
| 747 | APIM → VSDP | `api_deployment.published` | api_deployments | Implement software change/release (L4, 20853) | 1262 | confident L4 | source-side tag belongs in APIM audit |
| 754 | APP-PAAS → VSDP | `paas_deployment.succeeded` | paas_deployments | Implement software change/release (L4, 20853) | 1262 | confident L4 | source-side tag belongs in APP-PAAS audit |
| 758 | APP-PAAS → VSDP | `paas_build.failed` | paas_build_records | Build and test IT service/solution components (L5, 20812) | 1939 | confident L5 | source-side tag belongs in APP-PAAS audit |
| 762 | KUBE-PLAT → VSDP | `helm_release.deployed` | helm_releases | Implement software change/release (L4, 20853) | 1262 | confident L4 | source-side tag belongs in KUBE-PLAT audit |
| 778 | TEST-MGMT → VSDP | `test_run.completed` | test_runs | Build and test IT service/solution components (L5, 20812) | 1939 | confident L5 | source-side tag belongs in TEST-MGMT audit |
| 782 | TEST-MGMT → VSDP | `test_run.failed` | test_runs | Build and test IT service/solution components (L5, 20812) | 1939 | confident L5 | source-side tag belongs in TEST-MGMT audit |
| 794 | SPM → VSDP | `dependency_chain.identified` | dependency_chains | Define and develop service support strategy (L3, 20873) | 289 | medium L3 (defer, no clean PCF anchor for "we found this dep" semantics) | source-side tag belongs in SPM audit |
| 801 | IPAAS → VSDP | `integration_recipe.published` | integration_recipes | Implement software change/release (L4, 20853) | 1262 | medium L4 | source-side tag belongs in IPAAS audit |

Volume target: 9 outbound + 10 inbound = 19 candidates; 9 outbound proposed at confident L3/L4/L5; inbound 10 are all owed by other domains (per the audit procedure's "report-only routing" rule, Bucket 1 lists only the outbound side proposals; the inbound tags route to the source-side audit). Net Bucket 1 APQC count = 1 (this single item, even though it proposes 9 individual `handoff_processes` rows for outbound, per the COUNT CONVENTIONS rule in the audit prompt).

### Bucket 2, Surface-for-user (judgment calls)

1. **Module shape (M-band scope decision).** Flagship vendors split VSDP coverage 4 ways: source-control (Bitbucket, GitLab Repos, GitHub Repos), CI/CD orchestration (GitLab CI, GitHub Actions, Azure Pipelines, Jenkins-as-a-Service), deployment / release management (Argo CD, Octopus, Harness, Spinnaker; overlaps GITOPS-DELIVERY candidate), value-stream analytics (Plandek, LinearB, Faros AI, Allstacks; pure-play surface). Question: do we want one consolidated `VSDP-PLATFORM` module (matches GitLab Ultimate's positioning), or split into 3 to 4 modules: `VSDP-SOURCE-CONTROL` + `VSDP-CICD` + `VSDP-DEPLOYMENT-MGMT` + `VSDP-VALUE-STREAM-ANALYTICS`? Rule #14: ≥3 capabilities require ≥2 modules, so once capabilities land (B1-S2), the floor is ≥2 modules. Options: (a) 2 modules: `VSDP-DEV-PIPELINE` (source-control + CI/CD + artifacts) + `VSDP-DELIVERY-AND-VSM` (deployment + value-stream analytics); (b) 4 modules as above; (c) 1 monolith `VSDP-PLATFORM` plus a `VSDP-STARTER` (`module_kind='starter'`) for SMB buyers. Dependent on Bucket 3 candidate decisions (GITOPS-DELIVERY may carve out the deployment module).
2. **Vendor surface, solutions inventory.** No legitimate solutions are catalogued; only the mis-attached Jira Product Discovery row (B1-SC1) sits on VSDP. Flagship-vendor solutions to consider authoring once Phase A lands: GitLab Ultimate, GitHub Enterprise (with Actions + Advanced Security as sub-products or as a single rolled-up record), Azure DevOps Services, Atlassian Bitbucket + Bitbucket Pipelines + Bamboo, Jenkins (CloudBees), CircleCI, Buildkite, Harness Continuous Delivery, Argo CD (CNCF), Octopus Deploy, Plandek, LinearB. Question: which to author, what coverage_level for each (primary vs secondary), and whether to author the vendor-specific add-ons (GitHub Advanced Security, Bamboo Specs) as separate solutions or roll up.
3. **Boundary with TEST-MGMT (ci_pipeline_runs vs test_runs).** TEST-MGMT masters `test_runs`, `test_cases`, `test_defects`. VSDP masters `ci_pipeline_runs`. The two inbound handoffs (778, 782) carry `test_runs` payloads; the outbound 771 carries `ci_pipeline_runs`. The boundary holds, BUT vendors like GitLab and Azure DevOps blur this: their pipeline runs include test steps that populate test results within the same record. Question: is the current boundary (CI orchestrates; TEST-MGMT owns assertion authoring + result detail) correct, or should `test_runs` be `embedded_master` in the future VSDP-CICD module with the canonical master staying in TEST-MGMT? Independent of Bucket 1.
4. **Boundary with KUBE-PLAT + APP-PAAS (software_deployments vs helm_releases vs paas_deployments).** VSDP masters `software_deployments` (the abstract release event). KUBE-PLAT masters `helm_releases` (Kubernetes-native realization). APP-PAAS masters `paas_deployments`. The inbound handoffs 754, 758, 762 all surface platform-specific realizations to VSDP for value-stream rollup. Question: is `software_deployments` the umbrella event and the platform-specific entities the realizations (current model), or should `software_deployments` become a derived/computed view over the realizations (matches Plandek's normalization model)? May change the role from `master` to `derived` once decided.
5. **Jira Product Discovery removal.** B1-SC1 proposes DELETE on the only `solution_domains` row. Confirm: delete and leave the solutions inventory at zero pending Bucket 2 #2, or also queue Bitbucket Pipelines / Bamboo as a same-load Phase A addition so VSDP is never empty in the UI?
6. **Regulations scope on VSDP.** `domain_regulations` is empty. Supply-chain regulations (NIST SSDF SP 800-218, EO 14028, EU Cyber Resilience Act, SLSA framework) increasingly apply to VSDP outputs (build_artifacts, SBOMs) but the audit's reading is that they belong to the candidate-queue domain APPSEC-ORCH / SUPPLY-CHAIN-SEC, not on VSDP directly (parallels how OFCCP/FCRA attach to ATS but ATS does not master HR compliance broadly). Question: confirm "no regulations on VSDP" or attach a subset to make build_artifact lifecycle policy enforceable from this domain.

### Bucket 3, Phase 0 pending (speculative, vendor-research vetting needed)

Universal-or-near-universal entities present in 3+ flagship-vendor surfaces (GitLab, GitHub, Azure DevOps, Plandek, Harness, Argo CD, Octopus, JFrog, Atlassian Open DevOps) that are NOT in the current footprint. Phase 0 vetting required before promoting any to Bucket 1.

| # | Candidate entity | Proposed module (pending Bucket 2 #1) | Vendor evidence |
|---|---|---|---|
| B3-1 | `deployment_environments` (snake form to avoid collision with platform `environments` if any) | VSDP-DEPLOYMENT-MGMT or VSDP-PLATFORM | 5/5 vendors; canonical "where a software_deployment lands" master |
| B3-2 | `feature_flags` | (depends on FEATURE-FLAGGING candidate promotion; if promoted, consume from there; if folded, master here) | LaunchDarkly + GitLab + GitHub natively; queued candidate FEATURE-FLAGGING bumped to mention 3 by this audit |
| B3-3 | `secrets` / `secret_scopes` | VSDP-CICD | 5/5 vendors (GitLab CI/CD variables, GitHub Actions secrets, Azure DevOps service connections) |
| B3-4 | `iac_modules` (Terraform / Pulumi / Bicep modules) | VSDP-PLATFORM | 4/5 vendors via partial integration; surfaces as a first-class catalog in HashiCorp Terraform Cloud (out of catalog as a solution) |
| B3-5 | `container_images` | VSDP-PLATFORM or ARTIFACT-REGISTRY candidate | 4/5; overlaps queued ARTIFACT-REGISTRY |
| B3-6 | `sboms` (Software Bill of Materials) | (depends on SUPPLY-CHAIN-SEC candidate promotion) | 3/5; supply-chain-security focal entity |
| B3-7 | `package_registries` / `package_versions` | (depends on ARTIFACT-REGISTRY candidate promotion) | 4/5 (GitHub Packages, GitLab Package Registry, Azure Artifacts, JFrog Artifactory) |
| B3-8 | `runners` / `build_agents` | VSDP-CICD | 5/5 vendors (GitLab runners, GitHub Actions runners, Azure DevOps agents, Jenkins agents) |
| B3-9 | `release_versions` / `release_notes` | VSDP-DEPLOYMENT-MGMT | 4/5 (GitHub Releases, GitLab Releases, Azure DevOps Releases) |
| B3-10 | `branch_protection_rules` | VSDP-SOURCE-CONTROL | 5/5 (every major source-control vendor) |
| B3-11 | `merge_queues` | VSDP-SOURCE-CONTROL | 3/5 (GitHub, GitLab, Bitbucket); newer surface |
| B3-12 | `deployment_strategies` (canary, blue-green, rolling, recreate) | VSDP-DEPLOYMENT-MGMT | 4/5 + Argo Rollouts as separate solution |
| B3-13 | `supply_chain_attestations` / `slsa_provenance` | (depends on SUPPLY-CHAIN-SEC candidate promotion) | 3/5; Sigstore + GitHub Attestations + GitLab Trace Compliance |
| B3-14 | `vulnerability_findings` (SAST / SCA / DAST results) | (depends on APPSEC-ORCH candidate promotion; if folded, master here) | 5/5 via APPSEC-ORCH-style sub-products; queued |
| B3-15 | `engineering_workflows` / `flow_items` (pure-play VSM concept beyond DORA) | VSDP-VALUE-STREAM-ANALYTICS | 3/5 (Plandek, LinearB, Faros AI) |

### Cross-bucket dependencies

- **Bucket 1 is fully unblocked by user approval; B1-S1 (modules) is the gate every other Bucket 1 item depends on (S5 module FK, S7 lifecycle-state module FK, B1 NULL module FKs).** Sequence: capabilities (S2) ⇒ modules (S1) ⇒ entity edges + user edges (S3) ⇒ trigger event categories (S6) ⇒ scope-creep DELETE (SC1) ⇒ lifecycle states (S7) ⇒ system skill rewire (S5) ⇒ NULL FK backfill (B1) ⇒ roles (S4) ⇒ APQC tagging (separate). The APQC tagging item is independent of the module load and can be done in parallel.
- **Bucket 2 #1 (module shape) feeds into B1-S1.** The 1-monolith vs 2-split vs 4-split decision changes the module roster the Phase A loader writes.
- **Bucket 2 #3 (TEST-MGMT boundary) and #4 (KUBE-PLAT boundary) gate B1-S3.** The intra-domain edges between `ci_pipeline_runs` and `test_runs` / between `software_deployments` and `helm_releases` differ depending on whether the foreign entities are embedded_master in VSDP or stay as consumer references.
- **Bucket 3 candidates have heavy dependencies on the candidate-queue domains.** FEATURE-FLAGGING (B3-2), ARTIFACT-REGISTRY (B3-5, B3-7), SUPPLY-CHAIN-SEC (B3-6, B3-13), APPSEC-ORCH (B3-14) need triage decisions on the candidate queue before VSDP can decide whether to master them locally, consume them, or carve them out. If any are promoted as new domains, their entities leave VSDP's surface; if folded into VSDP, they become Bucket 1 once Phase 0 lands.

### Per-bucket prompts

- **After Bucket 1:** Fix these now? Reply `all`, `just <ids>`, or `skip`. Note: B1-S1 (modules) is structurally dependent on Bucket 2 #1 (module shape). The orchestrator may want to approve Bucket 2 #1 first so the Phase A loader has a target roster.
- **After Bucket 2:** What's your call on each of these? I'll wait for your decision per item before acting. Bucket 2 #1 (module shape), #2 (solutions inventory), and #6 (regulations) feed directly into the Phase A loader.
- **After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed. Also: triage the 5 candidate-queue domains added today (INTERNAL-DEV-PLAT, GITOPS-DELIVERY, ARTIFACT-REGISTRY, APPSEC-ORCH, SUPPLY-CHAIN-SEC) and the bumped FEATURE-FLAGGING since several Bucket 3 items resolve to "consume from candidate domain" if those are promoted.

### Report-only follow-ups (owed by other domains)

These items the audit identified but another domain owns. The orchestrator can choose to schedule audits on those domains, or carry the items to the next pass when those domains are next validated.

| Owed by | Item | Detail |
|---|---|---|
| OBS | APQC tags on outbound 616, 617 | Source-side `handoff_processes` row for `error_group.new_signature` → VSDP and `error_group.regression_detected` → VSDP. Proposed PCF anchors above (281 medium, 1265 medium). |
| APIM | APQC tag on outbound 747 | Source-side row for `api_deployment.published` → VSDP. Proposed PCF anchor 1262 (confident L4). |
| APP-PAAS | APQC tags on outbound 754, 758 | Source-side rows for `paas_deployment.succeeded` and `paas_build.failed`. Proposed anchors 1262 + 1939. |
| KUBE-PLAT | APQC tag on outbound 762 | Source-side row for `helm_release.deployed` → VSDP. Proposed anchor 1262. |
| TEST-MGMT | APQC tags on outbound 778, 782 | Source-side rows for `test_run.completed` / `test_run.failed` → VSDP. Proposed anchor 1939. Also: TEST-MGMT B-band check whether the inbound test_runs ↔ VSDP `ci_pipeline_runs` relationships (rows 404, 405, 409) carry the right `owner_side` semantics; currently `test_runs` "gates / blocks" `ci_pipeline_runs` and `test_defects` "surfaces_from" `ci_pipeline_runs` with `owner_side=source` (test_runs row 404, 405) and `owner_side=target` (test_defects row 409). The 409 owner_side flip should be confirmed in TEST-MGMT's next audit. |
| SPM | APQC tag on outbound 794 | Source-side row for `dependency_chain.identified` → VSDP. Defer-to-Discover candidate (no clean PCF anchor; medium L3 best guess at 289). |
| IPAAS | APQC tag on outbound 801 | Source-side row for `integration_recipe.published` → VSDP. Proposed anchor 1262 (medium). |
| Candidate-queue triage | 5 new candidates + 1 mention bump | INTERNAL-DEV-PLAT, GITOPS-DELIVERY, ARTIFACT-REGISTRY, APPSEC-ORCH, SUPPLY-CHAIN-SEC; FEATURE-FLAGGING bumped to mention 3. Decisions need the point-solution-market test per [audits/_missing-domains.md](_missing-domains.md). |

### Pass 3, Neighbor discovery

Edge weights derived from outbound + inbound handoff counts (each direction = 1 weight unit; identical trigger-event/payload pairs across both directions counted once).

| Neighbor domain | Outbound edges | Inbound edges | Edge weight | Notes |
|---|---|---|---|---|
| TEST-MGMT (8) | 1 (handoff 771) | 2 (778, 782) | 3 | Heavy; the ci_pipeline_runs ↔ test_runs / test_defects coupling is the densest cross-edge. Pairwise reconciliation due, blocked by B1-S1 (no VSDP modules to anchor `target_domain_module_id`). |
| APP-PAAS (76) | 1 (770) | 2 (754, 758) | 3 | Heavy; `software_deployments` umbrella over `paas_deployments`. Pairwise reconciliation due. |
| OBS (7) | 1 (773) | 2 (616, 617) | 3 | Heavy; error_groups feedback loop. Pairwise reconciliation due. |
| KUBE-PLAT (81) | 0 | 1 (762) | 1 | Lighter; the `software_deployments` umbrella also covers `helm_releases`. |
| SPM (9) | 1 (772) | 1 (794) | 2 | Lighter; analytics flow + dependency_chains. |
| ITSM (1) | 1 (774) | 0 | 1 | Lighter; deployment-failure incident creation. |
| PROD-MGMT (101) | 1 (775) | 0 | 1 | Lighter; pull_request.merged outbound. |
| WORK-MGMT (135) | 1 (776) | 0 | 1 | Lighter; pull_request.merged outbound. |
| EPM (66) | 1 (777) | 0 | 1 | Lighter; value-stream metric threshold breach. |
| GRC (15) | 1 (800) | 0 | 1 | Lighter; build_artifact published (SBOM / provenance angle). |
| APIM (79) | 0 | 1 (747) | 1 | Lighter; api_deployment.published inbound. |
| IPAAS (36) | 0 | 1 (801) | 1 | Lighter; integration_recipe.published inbound. |

### Pass 4, Pairwise reconciliation per neighbor (edge weight ≥ 3)

For each weight-≥3 neighbor, the 5-section diff per SKILL.md "Pairwise handoff reconciliation". Because VSDP has zero modules, sections 1, 2, 3 collapse on the VSDP side (every existing handoff's VSDP-side module FK is NULL by construction). The proper reconciliation will run once B1-S1 lands. Below is the deferred plan + the structural diff that IS evaluable today (cross-domain `data_object_relationships` mirror check).

#### VSDP ↔ TEST-MGMT (weight 3)

1. Existing handoffs fully wired: 0 (all 3 have VSDP-side NULL FK).
2. Existing handoffs with NULL module FK: 3 (handoffs 771 outbound; 778, 782 inbound). All resolve once VSDP modules exist (B1-S1).
3. Missing handoffs the catalog implies: deferred; revisit once modules exist. Candidate: `ci_pipeline.created` → TEST-MGMT (so test plans can attach to the pipeline) if Bucket 2 #3 confirms TEST-MGMT owns assertion authoring linked to CI pipeline scope.
4. Boundary integrity gaps (B5 routing): n/a until modules exist.
5. Cross-domain `data_object_relationships` mirror check: rows 404 (`test_runs` gates `ci_pipeline_runs`, owner_side=source), 405 (`test_runs` blocks `ci_pipeline_runs`, owner_side=source), 409 (`test_defects` surfaces_from `ci_pipeline_runs`, owner_side=target). The "surfaces_from" verb + owner_side=target on 409 reads oddly: by convention the data_object_id is the source side; if `test_defects` "surface from" pipeline_runs, the lifecycle owner is the pipeline_run (which produced the defect), not the defect itself. Open question for TEST-MGMT's next pairwise pass: should row 409 have `owner_side=source` (defect side owns), or should the verb invert?

#### VSDP ↔ APP-PAAS (weight 3)

1, 2. As above; 3 handoffs all carry NULL VSDP-side FK. Resolve after B1-S1.
3. Missing: none implied beyond what exists; the `paas_deployments` / `software_deployments` overlap is structural (Bucket 2 #4) not a missing edge.
4, 5. Deferred until modules exist.

#### VSDP ↔ OBS (weight 3)

1, 2. As above; 3 handoffs all NULL on VSDP side. Resolve after B1-S1.
3. Missing: `software_deployment.completed` → OBS already exists (handoff 773); reverse direction (OBS errors against pipeline_runs) already exists (616, 617). Candidate addition: `ci_pipeline_run.failed` could also fire to OBS (today it only fires to TEST-MGMT via 771) so OBS can correlate build failures with deploy outages. Defer.
4. n/a until modules exist.
5. `error_groups` is OBS-mastered (legitimate; data_object 92); relationship row to `ci_pipeline_runs` or `software_deployments` (for "this error_group correlated with this deployment") would surface as a B7-style cross-domain relationship. None exists today. Surface as a follow-up for the OBS pairwise audit (report-only).

### Decisions

_pending user; this audit's frontmatter status is `feedback_needed`_

### Fixes applied

_none; this audit is read-only per the mass-audit subagent prompt_

### `domains.notes` pointer (if updated)

_not yet written; will require user-approved wording per Rule #15_
