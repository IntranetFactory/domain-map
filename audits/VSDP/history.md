# VSDP audit history

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

## 2026-05-31, Continuation: B1 technical fixes (residual)

### Scope

Residual B1 pass: applied the strictly-technical subset of the 2026-05-30 audit, items whose tuples were fully pre-specified and required no judgment or new-entity authoring. Loader at [.tmp_deploy/fix_vsdp_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_vsdp_b1_technical_2026_05_31.ts).

### Fixes applied

| Audit ID | Action | Detail |
|---|---|---|
| B1-S6 | PATCH 13 `trigger_events.event_category` | ids 844-856 backfilled with `lifecycle` / `state_change` / `signal` / `threshold` per audit's Rule #13 mapping. Verified post-write: 0 rows still empty. |
| B1-SC1 | DELETE `solution_domains` row 527 | Pre-check confirmed `solution_id=400` (Jira Product Discovery), `domain_id=80`. Row removed; VSDP solution_domains now empty pending Bucket 2 #2. |
| APQC outbound | INSERT 9 `handoff_processes` rows | One row per outbound handoff (770, 771, 772, 773, 774, 775, 776, 777, 800) with audit's proposed PCF anchors (1262, 1939, 85, 1262, 1265, 281, 281, 85, 1262), `role='implements'`, `proposal_source='agent_curated'`, `record_status` defaulted to `new`. PCF rows verified present pre-insert. None of the (handoff_id, process_id) tuples existed prior; pre-existing rows on handoffs 771 (process 170) and 775 (process 1262) stand alongside as additional `implements` rows. |

### Deferred items (still open in original audit)

Not actioned this pass because they require new-entity creation, user judgment, or are gated on B2-X decisions:

- **B1-S1** (modules): new entities, gated on Bucket 2 #1 module-shape decision.
- **B1-S2** (capabilities): new entities, options 3-5, user picks.
- **B1-S3** (entity edges + user edges): audit names entity pairs and actor types but does NOT pre-specify exact (data_object_id, related_data_object_id, relationship_verb, owner_side, relationship_label) tuples; verb choices need authoring discipline.
- **B1-S4** (roles): new entities, Phase E.
- **B1-S5** (skill rewire): gated on B1-S1 modules.
- **B1-S7** (lifecycle states): gated on B1-S1 modules; plus config-shape exemption decision for `value_stream_metrics` owed to user.
- **B1-B1** (NULL FK backfill on 19 handoffs): mechanically gated on B1-S1 modules existing.
- **Inbound APQC tags** (10 handoffs: 616, 617, 747, 754, 758, 762, 778, 782, 794, 801): owed by source-domain audits per report-only routing rule, listed in original audit's "Report-only follow-ups".
- **Bucket 2** (all 6 items): user judgment.
- **Bucket 3** (15 candidates): Phase 0 vetting required.

Deferred count: 8 audit items + Bucket 2 (6) + Bucket 3 (15) = 29 items still open.

### Verification

```
GET /trigger_events?id=in.(844..856)&select=id,event_category   # all populated
GET /solution_domains?domain_id=eq.80                            # empty
GET /handoff_processes?handoff_id=in.(770..777,800)&proposal_source=eq.agent_curated
```

UI spot-check links:

- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/solution_domains
- https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

- **Scope**: structural Validate b1 audit only (bands S/A/M/B/C/D/E/F/H). Market audit (semantic pass), neighbor discovery and pairwise reconciliation are NOT in scope for this run.
- **Current footprint vs prior audit**: progress since 2026-05-30 audit + 2026-05-31 technical continuation: B1-S6 (13 trigger_events.event_category populated), B1-SC1 (Jira Product Discovery solution_domains row deleted), outbound APQC tagging (9 handoff_processes rows added). No new modules, capabilities, solutions, lifecycle states, aliases, edges, or roles since prior audit.
- **Live state snapshot**: domain id 80, 0 domain_modules, 0 capability_domains, 0 solution_domains, 0 domain_regulations, 0 domain_aliases, 8 master data_objects (676 source_repositories, 677 code_commits, 678 pull_requests, 679 ci_pipelines, 680 ci_pipeline_runs, 681 build_artifacts, 682 software_deployments, 683 value_stream_metrics), 13 trigger_events (ids 844-856), 9 outbound + 10 inbound cross-domain handoffs (all 9 outbound NULL on source_domain_module_id; 6 of 10 inbound NULL on target_domain_module_id; 4 inbound carry target FK from prior PROD-MGMT/WORK-MGMT/ITSM loads), 0 data_object_lifecycle_states, 3 cross-domain data_object_relationships touching VSDP masters (TEST-MGMT rows 404, 405 and 409; zero intra-VSDP edges, zero users edges), 1 system skill `vsdp-system` (id 119) with `domain_module_id=NULL` and `domain_id=80`, 8 query skill_tools (all coverage_tier=platform). 1 business_function_domains row (Platform Engineering, owner). 17 handoff_processes rows on VSDP handoffs (9 outbound covered 1:1 with the 2026-05-31 continuation load; some handoffs carry an additional substring-discovered row from prior Discover passes; 3 inbound untagged: 616, 617, 794, owed by source-domain audits).
- **Bucket 1 (in-scope, agent fixable, pending)**: 12 items.
- **Bucket 2 (surface-for-user, judgment)**: 7 items.
- **Bucket 3 (Phase 0 pending, speculative)**: 15 items (carried from prior audit, unchanged).

### S-band, structural coverage sweep

**S1, direct FKs to `domains`**

| Table | FK column | VSDP rows | Expected non-zero? |
|---|---|---|---|
| `domain_data_objects` | `domain_id` | 8 | yes (B1) pass |
| `solution_domains` | `domain_id` | 0 | yes (A3) fail |
| `business_function_domains` | `domain_id` | 1 | yes (C1) pass |
| `capability_domains` | `domain_id` | 0 | yes (A2) fail |
| `domain_regulations` | `domain_id` | 0 | when applicable; intentionally empty (see Bucket 2 #6 carryover) |
| `domains.parent_domain_id` | `parent_domain_id` | 0 | routinely zero |
| `handoffs.source_domain_id` | `source_domain_id` | 9 | yes pass |
| `handoffs.target_domain_id` | `target_domain_id` | 10 | yes pass |
| `skills` | `domain_id` | 1 | per F-band fail (legacy row, see F1) |
| `domain_modules` | `domain_id` | 0 | yes (M1) fail |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero |
| `domain_aliases` | `domain_id` | 0 | per B11-rollup; no domain-level aliases either |

**S2, indirect-table per-module coverage**: not evaluable (0 modules; routes back to M1).

**S3, per-master indirect-table coverage**

| data_object | states | events | aliases |
|---|---|---|---|
| source_repositories (676) | 0 | 2 | 0 |
| code_commits (677) | 0 | 1 | 0 |
| pull_requests (678) | 0 | 2 | 0 |
| ci_pipelines (679) | 0 | 1 | 0 |
| ci_pipeline_runs (680) | 0 | 2 | 0 |
| build_artifacts (681) | 0 | 1 | 0 |
| software_deployments (682) | 0 | 3 | 0 |
| value_stream_metrics (683) | 0 | 2 | 0 |

All 8 masters have zero lifecycle states (route to B12); 8/8 carry zero aliases (route to B11; `pull_requests` carries the Pull/Merge dual surface in its singular_label, an obvious alias candidate).

### Band-by-band results

**A1, A4**: A1 pass (all 7 metadata fields populated). A4 fail (catalog_tagline and catalog_description both empty per Rule #20 fresh-backfill draft path).

**A2**: fail (0 capabilities). Carries from 2026-05-30 as B1-S2.

**A3**: fail (0 solutions). Carries from 2026-05-30 Bucket 2 #2.

**A5**: not run.

**M1**: fail (0 `domain_modules` rows). Carries from 2026-05-30 as B1-S1. Rule #14 floor violation. Blocks M2-M8, F2-F5, B9b, B10b targeting source side, B12 module attribution, E1-E5.

**M2-M8**: not evaluable (M1 gate).

**B1, B2, B3**: pass.

**B4**: fail. All 8 masters carry false-by-default pattern flags. Per the checklist, an audit MUST positively re-evaluate. Candidates worth raising (Rule #15 forbids notes annotation, so the consideration record stays in this audit narrative):
- `pull_requests` has author/reviewer linkage but no submit_lock semantics, no single-approver semantics; flags stay false.
- `build_artifacts` may be immutable post-publish (an analogue of submit_lock); the SLSA provenance attestation is the lock semantics; surface to user (see Bucket 2 #7).
- `software_deployments` may carry a single-approver semantics in regulated environments (change approver); SOX/GxP-grade deploys; surface to user (Bucket 2 #7).
- `value_stream_metrics` derived/aggregated, no personal content. Flags stay false.
- `source_repositories`, `code_commits`, `ci_pipelines`, `ci_pipeline_runs`: no personal_content (no PII intrinsic), no submit_lock, no single_approver. Flags stay false.

The remaining open question (build_artifacts immutability / software_deployments approver) routes to Bucket 2.

**B5**: not applicable (0 `embedded_master` rows on VSDP, since 0 DMDO rows on VSDP modules).

**B6**: fail. Zero intra-VSDP `data_object_relationships` rows between the 8 masters. Carries from 2026-05-30 as B1-S3 entity-edge half. Expected edges per the prior audit (8 edges): source_repositories to code_commits, source_repositories to pull_requests, code_commits to pull_requests, ci_pipelines to ci_pipeline_runs, ci_pipeline_runs to build_artifacts, build_artifacts to software_deployments, ci_pipeline_runs to value_stream_metrics, software_deployments to value_stream_metrics.

**B7**: fail. Zero `data_object_relationships` rows from any of the 8 VSDP masters to `users` (id 748) per Rule #10. Carries from 2026-05-30 as B1-S3 users-edge half.

**B8**: outbound cross-domain `data_object_relationships`: 0 rows from VSDP masters into other domains. For every outbound handoff with a clean payload-to-target mapping (770, 773 publishing software_deployments to APP-PAAS/OBS as the deployment marker; 775, 776 publishing pull_requests merged into PROD-MGMT/WORK-MGMT; etc.), no relationship row exists. Fail.

**B9**: trigger_events pass (13 rows across 8 masters; every event has a categorized state_change or lifecycle or signal or threshold value). Outbound handoffs pass (9 rows; each refers to a valid trigger_event). The check is structurally pass. However: the "every workflow gate state has a matching event" sub-test is not evaluable since B12 lifecycle states are absent.

**B9b**: skip (multi-module precondition; VSDP has 0 modules).

**B10b**: fail (handoff per-module attribution).
- Outbound: 9/9 carry `source_domain_module_id=NULL`. Carries from 2026-05-30 as B1-B1. Gated on M1.
- Inbound: 10/10 carry `target_domain_module_id=NULL` on the VSDP side (the target module FK lives on VSDP). The 4 non-NULL target_module_id values seen in the outbound query are on outbound handoffs (target side is foreign: ITSM 38, PROD-MGMT 131, WORK-MGMT 149) where the target domain already modularized; the VSDP-owed FK is the `source_domain_module_id` on outbound + `target_domain_module_id` on inbound, all NULL. Gated on M1.

**B11**: fail. Zero `data_object_aliases` rows for any of the 8 masters. `pull_requests` (Pull / Merge Request, with `merge_requests` as GitLab alias) is the clearest case; `ci_pipelines` carries Pipelines/Workflows/Builds in vendor terminology; `value_stream_metrics` carries DORA Metrics / Flow Metrics as industry synonym.

**B12**: fail. Zero `data_object_lifecycle_states` rows for any of the 8 masters. Workflow-bearing masters that MUST have lifecycle states: `pull_requests`, `ci_pipeline_runs`, `software_deployments`. Config-shape candidates that may take the exemption (Rule #12, surface to user, do NOT auto-populate notes): `value_stream_metrics` (derived), `source_repositories` (created/archived only), `build_artifacts` (publish-once immutable), `ci_pipelines` (configuration entity, runs are the workflow surface), `code_commits` (event entity, not a workflow). Surface candidates to user per Bucket 2 #7.

**C1**: pass. Platform Engineering owner row exists (business_function_id=60).

**C2**: not evaluable (no capabilities to assess for divergence from domain RACI).

**D1**: UI links accessible:
- https://tests.semantius.app/domain_map/domains
- https://tests.semantius.app/domain_map/domain_modules
- https://tests.semantius.app/domain_map/data_objects
- https://tests.semantius.app/domain_map/handoffs

**E1, E2, E3, E4, E5**: fail. Zero roles tied to VSDP modules (no modules to tie to) and zero roles under business_function_id=60 (Platform Engineering). The multi-module-domain qualifier applies once M1 lands, and that brings the role authoring obligation along with it. Carries from 2026-05-30 as B1-S4.

**F1**: fail. Legacy domain-level system skill `vsdp-system` (id 119) carries `domain_id=80`, `domain_module_id=NULL`. Rule #17 requires module-level. Carries from 2026-05-30 as B1-S5 (rename + rewire). Gated on M1.

**F2, F3, F4, F5**: not evaluable (F2 requires modules per F1 cleanup). F4 sanity check: the 8 `query_*` tools attached to skill 119 all carry `operation_kind='query'` with `data_object_id` set (676-683) and `coverage_tier='platform'`, the invariant holds individually.

**F7**: pass. No channel primitives (`send_email`, `post_chat_message`, etc.) are linked from skill 119.

**H1, APQC coverage**:
- Outbound, 9/9 handoffs carry at least one `handoff_processes` row (770 to 1262; 771 to 170 + 1939; 772 to 85; 773 to 1262; 774 to 1265; 775 to 1262 + 281; 776 to 281; 777 to 85; 800 to 1262). 9/9 coverage; all `proposal_source='agent_curated'`, `record_status='new'`.
- Inbound, 7/10 carry at least one row (747 to 52; 754 to 1262; 758 to 1939; 762 to 1262; 778 to 170; 782 to 170; 801 to 1262). 3 untagged (616, 617, 794) are owed by source domains (OBS, OBS, SPM) per the inbound-routing rule of the audit procedure, NOT VSDP findings.
- H1 pass on outbound; inbound gaps are report-only routing items.
- H-band numbers: Coverage (record_status='approved') = 0 across all 19 handoffs (every tag is `new`). Provenance (agent_curated + human_curated) = 17. Headline read: APQC mapping authored but unreviewed; awaiting reviewer approval to flip to `approved`. Not a quality finding for this audit, a side-bar process indicator.

### Bucket 1, in-scope confirmed gaps (pending)

| ID | Band | Finding | Fix surface |
|---|---|---|---|
| B1-S1 | M1, Rule #14 | 0 `domain_modules` rows. Carries from 2026-05-30. Gated on Bucket 2 #1 (module-shape decision). | Phase A loader once shape decided. |
| B1-S2 | A2 / D1 | 0 `capability_domains` rows. Carries. | Author 3-5 capabilities + capability_domains rows. |
| B1-S3 | B6 + B7, Rule #10 | 0 intra-VSDP entity edges + 0 users edges. Carries. Tuple authoring still owed (verb, cardinality, owner_side per relationship). | Focused loader with explicit tuples. |
| B1-S4 | E1-E5, Phase E | 0 VSDP roles. Carries. Gated on M1. | Phase E loader after Phase A. |
| B1-S5 | F1, Rule #17 | Legacy `vsdp-system` skill (domain_id=80, domain_module_id=NULL) plus kebab naming. Carries. Gated on M1 + Bucket 2 #1. | DELETE + reauthor module-level system skill(s) per module. |
| B1-S7 | B12, Rule #12 | 0 lifecycle states. Carries. Gated on M1 (for `domain_module_id` attribution) and Bucket 2 #7 (config-shape exemption candidates). | Author lifecycle-states rows for workflow-bearing masters; surface config-shape exemptions, do not auto-populate notes (Rule #15). |
| B1-B1 | B10b, NULL outbound source FK | 9 outbound handoffs carry `source_domain_module_id=NULL`. Carries. Gated on M1. | PATCH after modules land. |
| B1-B2 | B10b, NULL inbound target FK | 10 inbound handoffs carry `target_domain_module_id=NULL` on the VSDP side. New explicit ID this audit; the prior 2026-05-30 audit captured only the outbound half under B1-B1. Gated on M1. | PATCH after modules land. |
| B1-B3 | B11 | 0 aliases on 8 masters. New explicit ID this audit. Clear cases: `pull_requests` to `merge_requests` (GitLab), `ci_pipelines` to `pipelines`/`workflows`/`builds`, `value_stream_metrics` to `dora_metrics`/`flow_metrics`. | Author alias rows; bundle into cluster-drafts pattern. Surface exemptions for self-explanatory cases (Rule #15: no `notes` annotation). |
| B1-B4 | B8 outbound | 0 cross-domain `data_object_relationships` rows from VSDP masters into other domains. Pair with each outbound handoff that has a clean payload mapping. | Author per outbound handoff (e.g. `software_deployments` reaches `deployment_environments` if PaaS owns environments; `pull_requests` realizes `work_items` for the WORK-MGMT outbound). Gated on partial Bucket 2 #4 (KUBE-PLAT / APP-PAAS boundary). |
| B1-A4 | A4, M8, Rule #20 | `domains.catalog_tagline` and `domains.catalog_description` empty. M8 not evaluable (0 modules) but will inherit once modules land. | Draft per Rule #20 buyer-voice rules, surface to user for review BEFORE write; never overwrite a populated value without per-row approval. |
| B1-B5 | B4 | Pattern flags considered, not yet positively recorded for `build_artifacts` (immutability post-publish) and `software_deployments` (single-approver in regulated change windows). Recorded in this audit narrative per Rule #15 (notes off-limits). | Surface candidates to user via Bucket 2 #7; PATCH only on user confirmation. |

Bucket 1 sub-categorization:

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 (all gaps route via STRUCTURAL bands) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 (B1-SC1 resolved on 2026-05-31) |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | 12 |
| BOUNDARY (NULL FK or missing handoff) | 0 unique (counted under B1-B1, B1-B2 above) |
| APQC TAGGING | 0 new outbound (already applied in 2026-05-31 continuation); inbound tags route as report-only follow-ups |
| MODULARIZATION ISSUES | 0 (routes to Bucket 2 #1 by design) |

### Bucket 2, surface-for-user (judgment calls)

1. **Module shape (carries from 2026-05-30 #1)**: 1 monolith vs 2-split vs 4-split vs starter+full combination. Independent of Bucket 3 module-shape candidates only if user chooses eyeball-mode on candidate-queue domains (INTERNAL-DEV-PLAT, GITOPS-DELIVERY, ARTIFACT-REGISTRY, APPSEC-ORCH, SUPPLY-CHAIN-SEC) since splitting deployment-management into a separate module changes if GITOPS-DELIVERY gets promoted.
2. **Solutions inventory (carries from 2026-05-30 #2)**: which flagship vendors to author (GitLab Ultimate, GitHub Enterprise, Azure DevOps, Atlassian Bitbucket suite, Jenkins, CircleCI, Buildkite, Harness, Argo CD, Octopus Deploy, Plandek, LinearB) and at what coverage_level. Independent.
3. **TEST-MGMT boundary (carries from 2026-05-30 #3)**: is `test_runs` ever `embedded_master` in a future VSDP-CICD module, or does TEST-MGMT canonically master? Plus the `data_object_relationships` row 409 owner_side question for TEST-MGMT's next audit.
4. **KUBE-PLAT + APP-PAAS boundary (carries from 2026-05-30 #4)**: is `software_deployments` the umbrella (current) or a derived/computed view over realizations (Plandek normalization model)?
5. **Bitbucket / Bamboo authoring (carries from 2026-05-30 #5)**: queue Atlassian VSDP solutions as a same-load addition, or wait?
6. **Regulations scope on VSDP (carries from 2026-05-30 #6)**: confirm "no regulations on VSDP" or attach NIST SSDF / EO 14028 / EU CRA / SLSA subset.
7. **Pattern flag confirmation (new)**: confirm or reject the immutability flag on `build_artifacts` (a submit_lock analog: published-once, never edited; the SLSA provenance is the cryptographic lock) and the single-approver flag on `software_deployments` (in SOX/GxP-grade change windows the approver per change request is single). Rule #15: this is the structured-column write; the per-row narrative stays here, in the audit, and any notes wording requires explicit per-row approval.

Cross-bucket dependency callouts:
- Bucket 2 #1 (module shape) gates Bucket 1 items B1-S1, B1-S5, B1-S7, B1-B1, B1-B2.
- Bucket 2 #3 + #4 (TEST-MGMT, KUBE-PLAT, APP-PAAS boundaries) inform Bucket 1 B1-B4 (cross-domain data_object_relationships).
- Bucket 2 #7 (pattern flags) is independent of all other buckets.
- Bucket 3 (candidate-queue domains) interacts with Bucket 2 #1: if GITOPS-DELIVERY, ARTIFACT-REGISTRY, APPSEC-ORCH, or SUPPLY-CHAIN-SEC are promoted, their entities leave VSDP's planned surface and the module shape proposal shrinks accordingly. The orchestrator may want to triage Bucket 3 candidate decisions before committing to Bucket 2 #1.

### Bucket 3, Phase 0 pending (speculative)

Carried verbatim from 2026-05-30 audit, unchanged: B3-1 (`deployment_environments`) through B3-15 (`engineering_workflows` / `flow_items`). 15 candidates. See 2026-05-30 audit section for the vendor-evidence detail per candidate. Each remains tied to its candidate-queue domain promotion decision per the 2026-05-30 cross-bucket dependency block.

### Per-bucket prompts

- **After Bucket 1**: 12 items. Most are blocked on Bucket 2 #1 module shape (B1-S1, B1-S5, B1-S7, B1-B1, B1-B2) or downstream of structural authoring decisions (B1-S3 verb tuples, B1-B3 alias selection, B1-B4 cross-domain relationships). B1-S2 (capabilities), B1-A4 (catalog UX draft + surface), B1-B5 (pattern flag confirmation) can move independently. Fix these now? Reply `all`, `just <ids>`, or `skip`.
- **After Bucket 2**: 7 items. #1 module shape is the gate. #2 solutions, #5 Bitbucket, #6 regulations are independent. #3 + #4 inform Bucket 1 B1-B4. #7 is independent.
- **After Bucket 3**: 15 candidates. Vet via Phase 0 research, or eyeball-mode? Also triage the 5 candidate-queue domains added in the 2026-05-30 audit since several Bucket 3 items resolve via candidate-domain promotion.

### Report-only follow-ups (owed by other domains)

| Owed by | Item | Detail |
|---|---|---|
| OBS | APQC tag on inbound 616 (`error_group.new_signature` to VSDP) | Source-side `handoff_processes` row. Audit's prior proposed PCF anchor 281 medium L3. |
| OBS | APQC tag on inbound 617 (`error_group.regression_detected` to VSDP) | Source-side row. Audit's prior proposed PCF anchor 1265 medium L4. |
| SPM | APQC tag on inbound 794 (`dependency_chain.identified` to VSDP) | Source-side row. Defer-to-Discover candidate (no clean PCF anchor; medium L3 best guess 289 from prior audit). |
| APIM, APP-PAAS, KUBE-PLAT, TEST-MGMT, IPAAS | Inbound `target_domain_module_id` PATCH | These 7 inbound handoffs (747, 754, 758, 762, 778, 782, 801) carry NULL `target_domain_module_id` on the VSDP side; the fix lives on VSDP (gated on M1, captured as B1-B2 here), but each source domain may also want to flag the symmetric source-side B10b state in its own audit. |
| Candidate-queue triage | 5 candidate-queue domains | INTERNAL-DEV-PLAT, GITOPS-DELIVERY, ARTIFACT-REGISTRY, APPSEC-ORCH, SUPPLY-CHAIN-SEC. Plus FEATURE-FLAGGING mention bump. See 2026-05-30 audit section for the rationale. |

### Decisions

_pending user; this audit's state.yaml status is `feedback_needed`._

### Fixes applied

_none; this audit is read-only._

### `domains.notes` pointer (if updated)

_not yet written; requires user-approved wording per Rule #15._

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
