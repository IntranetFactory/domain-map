# KUBE-PLAT audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 8 master data_objects (kubernetes_clusters, cluster_node_pools, container_workloads, helm_releases, service_meshes, operator_installations, platform_pipelines, container_registries), 0 modules, 0 capabilities, 0 solutions, 0 regulations, 0 lifecycle states, 0 aliases, 0 intra-domain or cross-domain data_object_relationships, 11 trigger_events, 7 outbound + 1 inbound cross-domain handoffs, 1 legacy domain-level system skill (id 78 `kube-plat-system`) with 8 query tools at `platform` coverage tier.
- Parent domain: APP-PAAS (id 76). Business-function ownership: owner Platform Engineering, contributor IT Operations.
- Vendor-surface basis (flagship vendors enumerated, pure-play distribution and platform vendors over diversified clouds): Red Hat OpenShift (production K8s distribution with day-2 ops), Rancher (multi-cluster management, SUSE), VMware Tanzu (enterprise K8s distribution and platform), Mirantis Kubernetes Engine (Docker successor with day-2 tooling), Google Anthos and Azure Arc-enabled Kubernetes and Amazon EKS Anywhere (hybrid and multi-cloud K8s control planes), Cilium and Calico (CNI specialists that ship cluster-level objects). Hyperscaler managed K8s services (GKE, EKS, AKS) are the buyer-side comparison anchor.
- **Bucket 1 (in-scope, agent fixable):** 17 items.
- **Bucket 2 (surface-for-user, judgment):** 9 items.
- **Bucket 3 (Phase 0 pending, speculative):** 10 items.
- Candidates queued to `audits/_missing-domains.md`: 6 (SERVICE-MESH, GITOPS-PLAT, SECRETS-MGMT [bumped to 2], CONT-REG, POLICY-AS-CODE, IDP-INT-DEV-PLAT).

KUBE-PLAT is structurally an early-stage domain: 8 well-named master data_objects and 11 trigger events were loaded, but every Phase-A, Phase-M, Phase-B (states / aliases / relationships), Phase-C, and Phase-E concern is empty. The domain row carries good A1 business metadata but no catalog UX (A4), no modules (M1, blocks every downstream concern), no capabilities (A2), no solutions (A3), no regulations (KUBE-PLAT is not regulated per se but FedRAMP, PCI, HIPAA, SOC2 commonly apply via hosted workload scope, surface that as a Bucket 2 judgment). The cross-domain handoff topology is partially wired (7 outbound, 1 inbound from APP-PAAS) but every cross-domain handoff lacks source_domain_module_id because there is no module to point at.

### Pass 1, Structural

#### S, Coverage sweep

**S1, FK-to-domains coverage table for KUBE-PLAT (id 81):**

| Table | FK column | KUBE-PLAT rows | Expected non-zero | Status |
|---|---|---|---|---|
| `domain_data_objects` | `domain_id` | 8 (all master) | yes | pass |
| `domain_modules` | `domain_id` | 0 | yes (Rule #14, M1) | **fail, routes to M1** |
| `domain_module_host_domains` | `domain_id` | 0 | optional | pass |
| `capability_domains` | `domain_id` | 0 | yes (≥3) | **fail, routes to A2** |
| `solution_domains` | `domain_id` | 0 | yes (≥3, ≥1 primary) | **fail, routes to A3** |
| `business_function_domains` | `domain_id` | 2 (owner + contributor) | yes (≥1 owner) | pass |
| `domain_regulations` | `domain_id` | 0 | conditional | **flag for Bucket 2** |
| `domains.parent_domain_id` | `parent_domain_id` | KUBE-PLAT.parent = 76 (APP-PAAS) | optional | pass |
| `handoffs` source | `source_domain_id` | 7 | yes | pass |
| `handoffs` target | `target_domain_id` | 1 | conditional | pass |
| `skills` | `domain_id` | 1 (legacy id 78, `kube-plat-system`, `domain_module_id` null) | yes for F1/F2 | **fail, F1 legacy plus F2 zero per-module skills** |
| `domain_aliases` | `domain_id` | 0 | optional | pass |

**S2, Per-module coverage:** vacuously fails: no modules, so no per-module data_objects or capabilities tally is possible. Every downstream M, B, C, E, F band is blocked on M1.

**S3, Per-master sweep across 8 masters:**

| data_object | states | events | aliases |
|---|---|---|---|
| kubernetes_clusters (448) | 0 | 2 (provisioned, decommissioned) | 0 |
| cluster_node_pools (449) | 0 | 1 (scaled) | 0 |
| container_workloads (450) | 0 | 1 (degraded) | 0 |
| helm_releases (451) | 0 | 2 (deployed, rolled_back) | 0 |
| service_meshes (452) | 0 | 1 (policy_updated) | 0 |
| operator_installations (453) | 0 | 1 (installed) | 0 |
| platform_pipelines (454) | 0 | 1 (completed) | 0 |
| container_registries (455) | 0 | 2 (image_pushed, image.vulnerable) | 0 |

Zero lifecycle states across all 8 masters routes to B12. Zero aliases on every master routes to B11 (most KUBE-PLAT masters are not self-explanatory across vendors, kubernetes_clusters has cross-vendor synonym surface).

#### A, Market shape

- **A1, domains metadata:** pass. `crud_percentage=15`, `business_logic` populated, `min_org_size='30 m <2500'`, `cost_band='$$$'`, `usa_market_size_usd_m=3500`, `market_size_source_year=2025`. CRUD percentage 15 is appropriate for a distributed-systems infrastructure market.
- **A2, capabilities linked:** fail (0 rows, need ≥3). Routes to Bucket 1 STRUCTURAL.
- **A3, solutions linked with coverage_level:** fail (0 rows, need ≥3 with ≥1 primary). Routes to Bucket 1 STRUCTURAL.
- **A4, catalog UX fields:** fail. Both `catalog_tagline` and `catalog_description` are empty strings. Per Rule #20 these need to be drafted in buyer voice, surfaced to user, then written. Routes to Bucket 2 (judgment plus Rule #20 author-then-confirm).
- **A5, vendor records reflect current legal ownership:** skipped per default (opt-in only).

#### M, Modules (gate)

- **M1, ≥1 `domain_modules` row:** fail. Zero modules. Blocks every downstream concern. **The domain has no deployable unit.** Routes to Bucket 1 STRUCTURAL.
- **M2, ≥3 capabilities then ≥2 modules:** vacuously passes (no capabilities), reconsider after A2 fix.
- **M4, every capability has ≥1 realizing module:** vacuously passes (no capabilities).
- **M5, lifecycle states with `requires_permission=true` have `domain_module_id`:** vacuously passes (no lifecycle states yet, but every state authored in B12 will need this once M1 is resolved).
- **M6, every module realizes ≥1 capability:** vacuously passes.
- **M7, single-master integrity:** pass. No DMDO rows exist; the 8 masters are recorded in the legacy `domain_data_objects` rollup but no `domain_module_data_objects` row exists anywhere in the catalog referencing data_objects 448 to 455. No catalog-wide multi-master or within-domain incoherence.

#### B, Data-object footprint

- **B1, ≥1 `master`:** pass (8 masters in `domain_data_objects`). All `role='master'`, `necessity='required'`.
- **B2, labels:** pass. Every master has both `singular_label` and `plural_label`.
- **B3, naming arbitration:** pass. All 8 masters are domain-prefixed or self-evidently compound (`kubernetes_clusters`, `cluster_node_pools`, `container_workloads`, `helm_releases`, `service_meshes`, `operator_installations`, `platform_pipelines`, `container_registries`). No bare-word claims.
- **B4, pattern flags considered:** flags exist at default `false` for all three (`has_personal_content`, `has_submit_lock`, `has_single_approver`). No positive re-evaluation recorded yet; the defaults are correct in this domain (infrastructure objects, no PII, no submit-lock, no single-approver workflow), so this passes once re-evaluated. Routes to Bucket 1 STRUCTURAL for the positive-review confirmation.
- **B5, embedded_master integrity:** pass (no embedded_master rows on this domain).
- **B6, intra-domain `data_object_relationships`:** fail. Zero relationship edges among the 8 masters. Real relationships exist: `kubernetes_clusters has cluster_node_pools`, `kubernetes_clusters runs container_workloads`, `helm_releases installs container_workloads` (or `helm_releases produces container_workloads`), `operator_installations runs_on kubernetes_clusters`, `service_meshes overlays kubernetes_clusters`, `platform_pipelines deploys helm_releases` (or `platform_pipelines deploys container_workloads`), `container_registries supplies container_workloads`. Routes to Bucket 1 STRUCTURAL.
- **B7, `users` edges (Rule #10):** fail. KUBE-PLAT masters have user-typed actors (cluster_admin on kubernetes_clusters, deployer on helm_releases and platform_pipelines, operator_owner on operator_installations, mesh_admin on service_meshes, registry_admin on container_registries). Zero edges to `users` (id 748, kind=platform_builtin) exist. Routes to Bucket 1 STRUCTURAL.
- **B8, outbound cross-domain `data_object_relationships`:** fail. Cross-domain handoffs already exist (7 outbound). The structural mirror, `data_object_relationships` rows linking a KUBE-PLAT master to a non-KUBE-PLAT master, has zero rows. Likely missing rows (one per outbound handoff with a clean payload-to-target mapping where source and target masters live in different domains): the `container_workload.degraded` outbound to ITSM payload `service_incidents` is the clearest candidate, `container_workload.degraded` to APP-PAAS payload `container_workloads` is intra-payload so not a B8 candidate, `helm_release.deployed` to VSDP payload `helm_releases` is intra-payload, `container_image.vulnerable` to GRC payload `container_registries` is intra-payload. The relationship row owed is `container_workloads triggers service_incidents` (ITSM master). Routes to Bucket 1 STRUCTURAL.
- **B9, outbound `trigger_events` + `handoffs` complete:** pass on event side (11 events covering most observable transitions), partial on handoff side. Some events have only one cross-domain subscriber and could fan out (see Bucket 1 APQC TAGGING and STRUCTURAL).
- **B9b, intra-domain cross-module handoffs:** vacuously passes (single-domain landing without modules). Becomes a real check once M1 produces ≥2 modules.
- **B10, inbound handoffs report-only:** 1 inbound only (`paas_deployment.succeeded` from APP-PAAS on `paas_deployments`). Many candidates are inbound from neighbors yet absent. Discovery procedure cannot run cleanly because KUBE-PLAT has no embedded_master, contributor, or consumer rows, so there is no "I depend on X mastered by Y" surface. The absence of dependencies is itself a real gap, KUBE-PLAT realistically consumes `services` from ITSM, `assets` from ITAM, `vulnerabilities` from VULN-MGMT, but none of these are declared. Surfaced as Bucket 2 (judgment: which neighbors should we declare consumer or embedded_master on once modules exist).
- **B10b, per-module attribution on `handoffs`:** fail. All 7 outbound handoffs have `source_domain_module_id=null`, and 5 of 7 outbound also have `target_domain_module_id=null` (ITAM and ITSM resolve target side; the rest do not because the target domain may not have the right module for the payload). For KUBE-PLAT itself the source side is the in-scope half: it is null on every outbound row because no module exists. Becomes fixable once M1 resolves. Routes to Bucket 1 STRUCTURAL (the patch is deterministic once modules are loaded).
- **B11, aliases:** fail. Zero alias rows. KUBE-PLAT masters have cross-vendor synonyms (kubernetes_clusters often shown as "k8s cluster" or "control plane" or vendor brands "OpenShift cluster", "Rancher cluster", "Tanzu cluster"; container_workloads is the umbrella for Pod, Deployment, StatefulSet, DaemonSet, Job). Routes to Bucket 1 STRUCTURAL.
- **B12, lifecycle states:** fail. Zero states for all 8 masters. None of the 8 is config-shape (every one has a real workflow: clusters get provisioned, upgraded, drained, decommissioned; helm_releases get deployed, upgraded, rolled_back; container_workloads run, degrade, fail; operator_installations get installed, upgraded, uninstalled). Routes to Bucket 1 STRUCTURAL.

#### C, Functional ownership

- **C1, business_function_domains owner:** pass. Owner = Platform Engineering, contributor = IT Operations. Both correct for KUBE-PLAT.
- **C2, business_function_capabilities overrides:** vacuously passes (no capabilities yet).

#### D, UI spot-check

- **D1:** read-only audit, no UI mutation performed.

#### E, Roles and permission bundling

- **E1 to E6:** vacuously pass or fail. No `domain_modules` rows means no `role_modules` can exist, no `role_permissions` can target this domain's modules. Capability count is < 3 so E1 vacuously passes once modules exist (single-module domain). Routes to Bucket 2 (judgment): once M1 ships, does this domain need its own roles (cluster_admin, platform_engineer, namespace_owner) or do they inherit from APP-PAAS / generic platform-engineering roles?

#### F, Skill-layer integrity

- **F1, no legacy domain-level system skills remain once module-level skills exist:** ambiguous. One legacy row exists (skill id 78 `kube-plat-system`, `domain_module_id` null, `skill_type='system'`, `skill_name` in kebab-system shape). Per F1 rule, this is acceptable transitional state only when no module-level system skill exists yet, which is currently true. **But once M1 ships and module-level system skills are authored per Rule #17, this legacy row must be retired (DELETE). Tracked for the post-modularization fix-load.** Also: the naming convention is `<module_code_lower>_agent` not `<domain-code-lower>-system`, so even the legacy row is mis-named (the ATS audit hit the same rename pattern). Routes to Bucket 1 STRUCTURAL: rename legacy skill from `kube-plat-system` to a placeholder snake form (or leave as legacy and DELETE on first module-level skill creation). User's call.
- **F2, every `domain_modules` row has exactly one `skill_type='system'` skill:** vacuously fails (no modules). Becomes the canonical authoring task once M1 ships.
- **F3, every module-level system skill has ≥1 `skill_tools`:** vacuously fails (no module-level skills yet).
- **F4, tool `operation_kind` ↔ `data_object_id` invariant:** pass on the legacy skill's 8 query tools: all 8 are `operation_kind='query'` with `data_object_id` set (to 448 to 455 respectively), all at `coverage_tier='platform'`. The eight tools are correctly authored even if they hang off the legacy skill.
- **F5, Semantius score computable:** Currently uncomputable per-module (no modules). On the legacy skill alone: 8/8 = 100% strict score, but the metric is module-scoped per Rule #17, so this number does not roll up to KUBE-PLAT until the legacy is migrated.
- **F7, channel primitives correctly used:** pass (no channel-primitive tools linked).

#### H, Handoff APQC coverage

- **H1:** fail. Zero `handoff_processes` rows on all 8 cross-domain handoffs (7 outbound + 1 inbound). APQC tagging is owed. See Bucket 1 APQC TAGGING table below.

### Pass 2, Market audit (semantic)

Vendor surface (independently named, flagship pure-play distributions and platform vendors over hyperscaler managed K8s services because the audit is on production K8s distributions, not the hyperscaler control-plane consumption side):

1. **Red Hat OpenShift** (full K8s distribution with day-2 ops, OperatorHub, integrated CI/CD via Pipelines).
2. **Rancher (SUSE)** (multi-cluster management, fleet, integrated logging and monitoring).
3. **VMware Tanzu** (enterprise distribution with Tanzu Mission Control multi-cluster).
4. **Mirantis Kubernetes Engine** (Docker Enterprise successor with day-2 tooling).
5. **Google Anthos / Azure Arc-enabled Kubernetes / Amazon EKS Anywhere** (hybrid and multi-cloud K8s control planes layered on top of customer-managed clusters).
6. **Cilium / Calico (Tigera)** as CNI specialists whose cluster-scoped objects (network policies, eBPF maps) commonly ride on top of the K8s control plane.

**MISSING entities the market surface suggests (Bucket 3 pending Phase 0 vetting):**

| Candidate entity | Vendor evidence | Proposed module (post M1) |
|---|---|---|
| `cluster_addons` | OpenShift (cluster operators), Rancher (cluster tools), Anthos (cluster components) | KUBE-PLAT-DISTRIBUTION-OPS |
| `cluster_upgrade_plans` | OpenShift OTA, Rancher (Rancher Upgrade Strategy), Tanzu | KUBE-PLAT-DISTRIBUTION-OPS |
| `cluster_etcd_backups` | OpenShift backup operator, Rancher, Tanzu | KUBE-PLAT-DISTRIBUTION-OPS |
| `cluster_audit_logs` | All distributions (K8s audit log is standard) | KUBE-PLAT-DISTRIBUTION-OPS |
| `cluster_namespaces` | All distributions, multi-tenancy primitive | KUBE-PLAT-WORKLOAD-OPS |
| `cluster_rbac_policies` | All distributions, `Role` / `ClusterRole` resources | KUBE-PLAT-WORKLOAD-OPS |
| `cluster_network_policies` | All distributions (CNI-rendered) | KUBE-PLAT-WORKLOAD-OPS |
| `cluster_storage_classes` | All distributions (CSI-rendered) | KUBE-PLAT-DISTRIBUTION-OPS |
| `cluster_secrets` | All distributions (consumed by workloads, but masters likely live in SECRETS-MGMT, see candidate queue) | KUBE-PLAT-WORKLOAD-OPS (consumer or embedded_master) |
| `cluster_resource_quotas` | All distributions, multi-tenancy primitive | KUBE-PLAT-WORKLOAD-OPS |

**WRONG-OWNERSHIP findings:** none observed. All 8 current masters are appropriately KUBE-PLAT-mastered.

**SCOPE-CREEP findings:** none observed. No current footprint includes entities mastered elsewhere.

**MODULARIZATION-ISSUE findings:** the domain has no modules. The proposed modularization (two modules: `KUBE-PLAT-DISTRIBUTION-OPS` for cluster, control-plane, node-pool, addon, upgrade, registry concerns; `KUBE-PLAT-WORKLOAD-OPS` for container_workloads, helm_releases, namespace, rbac, network_policy, resource_quota concerns) is one option. Single-module `KUBE-PLAT-DISTRIBUTION` covering everything is another. Surface as Bucket 2 modularization decision (depends on capability count: at ≥3 capabilities the ≥2-module rule applies).

**Candidate adjacencies surfaced (queued to `audits/_missing-domains.md`):**

- **SERVICE-MESH** (Istio, Linkerd, Consul Connect, Cilium Service Mesh, Solo.io). `service_meshes` master is currently in KUBE-PLAT but the market has its own specialist vendors; consider promoting once vendor coverage is researched.
- **GITOPS-PLAT** (Argo CD, Flux, Weaveworks GitOps, Codefresh GitOps, Akuity). Currently absorbed under `platform_pipelines`; GitOps is its own established market.
- **SECRETS-MGMT** (HashiCorp Vault, CyberArk Conjur, AWS Secrets Manager). Bumped to mention count 2. KUBE-PLAT consumes secrets but does not master them.
- **CONT-REG** (Harbor, JFrog Artifactory, Docker Hub, GitHub Container Registry, Quay). Currently captured as `container_registries` in KUBE-PLAT, but the registry market has its own specialist vendors and could be promoted.
- **POLICY-AS-CODE** (Open Policy Agent, Kyverno, Styra DAS, HashiCorp Sentinel). KUBE-PLAT consumes admission-control policy; the market has independent vendors.
- **IDP-INT-DEV-PLAT** (Backstage, Port, Cortex, OpsLevel, Humanitec). Adjacent developer-portal market that consumes KUBE-PLAT primitives.

### Pass 3, Neighbor discovery

From cross-domain handoffs and (the absent) DMDO cross-references. KUBE-PLAT publishes to 6 distinct domains and receives from 1.

| Neighbor (code, id) | Outbound rows | Inbound rows | Cross-domain DMDO consumer-or-similar | Edge weight | Pairwise depth |
|---|---|---|---|---|---|
| ITAM (3) | 1 (cluster.provisioned → ITAM) | 0 | 0 | 1 | one-line summary |
| ITOM (2) | 1 (node_pool.scaled → ITOM) | 0 | 0 | 1 | one-line summary |
| OBS (7) | 1 (cluster.provisioned → OBS) | 0 | 0 | 1 | one-line summary |
| VSDP (80) | 1 (helm_release.deployed → VSDP) | 0 | 0 | 1 | one-line summary |
| GRC (15) | 1 (container_image.vulnerable → GRC) | 0 | 0 | 1 | one-line summary |
| ITSM (1) | 1 (container_workload.degraded payload service_incidents) | 0 | 0 | 1 | one-line summary |
| APP-PAAS (76) | 1 (container_workload.degraded → APP-PAAS) | 1 (paas_deployment.succeeded → KUBE-PLAT) | 0 | 2 | one-line summary |

**No neighbor crosses edge weight 3 today.** Per the procedure, neighbors at weight 1 to 2 get a one-line summary in the per-neighbor diff section below; the full 5-section pairwise diff is not run on any neighbor. This is expected given the early stage of the domain; once modules ship and consumer DMDOs are declared (Bucket 2 item below), edge weights will climb.

### Pass 4, Pairwise reconciliation per neighbor (weight ≥3 only)

No neighbor qualifies. **Lighter neighbor one-liners** (rolled into Boundary findings per neighbor in Bucket 1):

- **APP-PAAS (edge weight 2):** bidirectional. Outbound `container_workload.degraded` lacks both module FKs (KUBE-PLAT has no module, APP-PAAS has modules but neither is resolved on this handoff row). Inbound `paas_deployment.succeeded` lacks both module FKs (APP-PAAS owes source_domain_module_id, KUBE-PLAT owes target_domain_module_id once modules ship). Surface as STRUCTURAL B10b for the KUBE-PLAT side, report-only for APP-PAAS.
- **ITAM (weight 1), OBS (1), VSDP (1), GRC (1), ITOM (1), ITSM (1):** all outbound only, all missing source_domain_module_id (KUBE-PLAT side). Target_domain_module_id is resolved on ITAM and ITSM but null on OBS, VSDP, GRC, ITOM. The target-side nulls are report-only for those domains' B10b passes.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL (S, A, M, B, C, E, F band failures)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1, A2, A3 (gate) | Zero `domain_modules`, zero `capability_domains`, zero `solution_domains`. Domain is structurally a placeholder. | Author the Phase-A and Phase-M shape: 1 or 2 modules (Bucket 2 chooses 1 vs 2), 5 to 8 capabilities, ≥3 solutions with ≥1 primary. Default proposal: 2 modules (`KUBE-PLAT-DISTRIBUTION-OPS`, `KUBE-PLAT-WORKLOAD-OPS`) with capabilities such as `KUBE-PLAT-CLUSTER-LIFECYCLE`, `KUBE-PLAT-WORKLOAD-LIFECYCLE`, `KUBE-PLAT-HELM-DELIVERY`, `KUBE-PLAT-OPERATOR-LIFECYCLE`, `KUBE-PLAT-MULTI-CLUSTER-MGMT`, `KUBE-PLAT-CLUSTER-OBSERVABILITY-INTEG`, `KUBE-PLAT-DAY2-OPS`, plus the Phase-A solutions (Red Hat OpenShift, Rancher, Tanzu, Mirantis Kubernetes Engine, plus selected hyperscaler managed K8s as secondary). |
| B1-S2 | A4 (Rule #20) | Both `catalog_tagline` and `catalog_description` are empty. | Draft both in buyer voice, surface to user per Rule #20 before writing. Default tagline draft (for user review, not for direct write): `"Production Kubernetes distributions with day-2 operations and multi-cluster management."` Default description: 2 to 3 paragraphs covering buyer workflow (cluster provisioning, fleet management, day-2 ops, integrated CI/CD), buyer value (production-grade K8s without building a platform team), buyer differentiation versus hyperscaler managed services. **Do NOT write until user reviews per Rule #20.** Routes to Bucket 2 as judgment item too. |
| B1-S3 | B4 | Pattern-flag review. All three flags (`has_personal_content`, `has_submit_lock`, `has_single_approver`) at default `false` on every master. The defaults are likely correct (no PII, no submit-lock, no single-approver), but the audit must positively record the re-evaluation. | Confirm in chat: "all three flags are correctly false on all 8 KUBE-PLAT masters". No notes write per Rule #15. |
| B1-S4 | B6 | Zero intra-domain `data_object_relationships` among the 8 masters. | Author edges: (a) `kubernetes_clusters has cluster_node_pools` (required, owner_side=source, parent), (b) `kubernetes_clusters runs container_workloads` (required, owner_side=source, reference), (c) `helm_releases produces container_workloads` (required, owner_side=source, reference), (d) `operator_installations runs_on kubernetes_clusters` (required, owner_side=target, reference), (e) `service_meshes overlays kubernetes_clusters` (required, owner_side=target, reference), (f) `platform_pipelines deploys helm_releases` (required, owner_side=source, reference), (g) `container_registries supplies container_workloads` (required, owner_side=source, reference). 7 edges. Load via cluster-drafts pattern. |
| B1-S5 | B7 (Rule #10) | Zero `users` edges. KUBE-PLAT masters with user-typed actors: kubernetes_clusters (cluster_admin), helm_releases (deployer), platform_pipelines (pipeline_owner), operator_installations (operator_owner), service_meshes (mesh_admin), container_registries (registry_admin), container_workloads (workload_owner), cluster_node_pools (node_pool_owner). | Author 8 edges to `users` (id 748, kind=platform_builtin), one per master, verb derived per actor role. Load per Rule #10. |
| B1-S6 | B8 | Zero outbound cross-domain `data_object_relationships`. The clean payload-to-target mapping today is `container_workloads triggers service_incidents` for handoff 763 (KUBE-PLAT → ITSM on `container_workload.degraded`, payload = ITSM's `service_incidents`). | Author 1 edge: `container_workloads triggers service_incidents` (owner_side=source, is_required=false). The remaining outbound handoffs have payload = the KUBE-PLAT master itself (intra-payload, not a B8 candidate). |
| B1-S7 | B10b | All 7 outbound handoffs have `source_domain_module_id=null` because KUBE-PLAT has no module. Five of seven also have `target_domain_module_id=null` (the inbound APP-PAAS handoff likewise). | Becomes a deterministic patch once M1 lands. Per-handoff source_domain_module_id resolves to the KUBE-PLAT module that masters the trigger_event's data_object. Target-side nulls (OBS, VSDP, GRC, ITOM, APP-PAAS) are report-only for those domains' B10b passes. |
| B1-S8 | B11 | Zero aliases on 8 masters. Cross-vendor synonyms exist on `kubernetes_clusters` ("k8s cluster", "control plane", "OpenShift cluster", "Rancher cluster", "Tanzu cluster" as solution-name aliases), `container_workloads` ("Pod", "Deployment", "StatefulSet", "DaemonSet", "Job" as primitive aliases), `helm_releases` ("Helm chart release", "Tanzu Application package"), `operator_installations` ("Kubernetes Operator", "OperatorHub install"), `container_registries` ("OCI registry", "image registry"). | Draft ≥1 alias_type row per master where a real synonym exists. Bundle into cluster-drafts pattern. Surface count proposal: ~12 alias rows. |
| B1-S9 | B12 (Rule #12) | Zero lifecycle states across 8 masters. Real workflows: kubernetes_clusters (planned, provisioning, available, upgrading, draining, decommissioned), helm_releases (planned, deploying, deployed, upgrading, rolling_back, uninstalled), container_workloads (pending, running, degraded, failed, succeeded), operator_installations (installing, installed, upgrading, uninstalled), platform_pipelines (queued, running, succeeded, failed), service_meshes (planned, installed, updating), container_registries (registered, scanning, available), cluster_node_pools (planned, scaling, available, draining, removed). | Author state machines for all 8 masters (initial state, terminal states, workflow gates with `requires_permission=true` where appropriate, `permission_verb_override` for non-obvious verbs). M5's `domain_module_id` populated for each state once M1 ships and the realizing module is known. |
| B1-S10 | F1 (legacy skill) | Skill id 78 `kube-plat-system` is a legacy domain-level system skill (`domain_module_id` null, kebab-system naming convention) with 8 platform query tools attached. Acceptable transitional state per F1, but **must be DELETEd once module-level system skills are authored per Rule #17 and F2**. The 8 tools (556 to 563) are correctly typed and stay; re-link to the new module-level skill or two. | Track for the post-modularization fix-load: rename or DELETE skill 78 once new `<module_code_lower>_agent` skill rows exist; relink the 8 query tools via fresh `skill_tools` rows on the new skill or split across two modules. No write in this audit. |

#### MISSING (compliance-mandated entities)

None. KUBE-PLAT itself is not a regulated market in the FCRA, HIPAA, GDPR, SOX sense. Compliance applies via the *workloads* a cluster runs (a HIPAA-bound cluster, a PCI-bound cluster), not via the cluster substrate. The B1 STRUCTURAL S2 item references this in the catalog UX draft.

#### MISSING (universal-vendor entities, non-regulatory)

None ship in this audit's Bucket 1. All vendor-driven entity candidates (cluster_addons, cluster_upgrade_plans, cluster_etcd_backups, cluster_audit_logs, cluster_namespaces, cluster_rbac_policies, cluster_network_policies, cluster_storage_classes, cluster_resource_quotas) are routed to Bucket 3 pending Phase 0 vetting.

#### WRONG-OWNERSHIP

None.

#### SCOPE-CREEP

None.

#### BOUNDARY (per-neighbor)

- See Pass 4 one-liners above. The single in-scope boundary action for KUBE-PLAT is **B1-S7** (all source_domain_module_id null until M1 lands). The cross-side nulls (target_domain_module_id on outbound to OBS / VSDP / GRC / ITOM, source_domain_module_id on the inbound from APP-PAAS) are report-only.

#### APQC TAGGING

`agent_curated` proposals from the audit (8 cross-domain handoffs, ~0.5N to 0.8N expected = 4 to 7 proposed, ~0.2N deferred):

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|
| 799 | KUBE-PLAT → ITAM | kubernetes_cluster.provisioned | kubernetes_clusters | Maintain IT asset records | 1312 (L4 / 20918) | confident L4 |
| 760 | KUBE-PLAT → OBS | kubernetes_cluster.provisioned | kubernetes_clusters | Manage infrastructure performance and capacity | 1304 (L4 / 20909) | confident L4 (OBS baseline rebaselines on cluster) |
| 761 | KUBE-PLAT → ITOM | cluster_node_pool.scaled | cluster_node_pools | Manage infrastructure performance and capacity | 1304 (L4 / 20909) | confident L4 |
| 763 | KUBE-PLAT → ITSM | container_workload.degraded | service_incidents | Triage IT service delivery incidents | 1299 (L4 / 20903) | confident L4 |
| 759 | KUBE-PLAT → APP-PAAS | container_workload.degraded | container_workloads | Respond to unplanned operational issues | 1305 (L4 / 20910) | confident L4 |
| 762 | KUBE-PLAT → VSDP | helm_release.deployed | helm_releases | Implement software change/release | 1262 (L4 / 20853) | confident L4 |
| 764 | KUBE-PLAT → GRC | container_image.vulnerable | container_registries | Monitor IT infrastructure security | 1307 (L4 / 20912) | confident L4 |

Inbound (covered for completeness; APQC tag is owed by the source domain too):

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|
| 753 | APP-PAAS → KUBE-PLAT | paas_deployment.succeeded | paas_deployments | Install/configure/upgrade infrastructure components | 1311 (L4 / 20917) | confident L4 |

**Deferred to Discover Pass 3 (custom-process authoring):** none. All 8 handoffs map cleanly to APQC PCF cross-industry L4 rows. The actual `handoff_processes` INSERTs would carry `proposal_source='agent_curated'`, `record_status='new'`. **Volume:** 8 proposed, 0 deferred; ratio = 8 / 8 = 1.0N. **No write performed in this audit (the audit is report-only); the loads run after user approval per the standard fix-loop.**

### Bucket 2, Surface-for-user (judgment calls)

1. **A4 catalog UX wording (Rule #20).** Both `catalog_tagline` and `catalog_description` are empty. Draft proposals are in B1-S2; user reviews exact wording before any write. Options: (a) approve the draft as-is, (b) rewrite, (c) defer until modularization is decided so the description reflects the chosen module shape.
2. **Modularization decision (1 module vs 2 modules).** Capability count is currently 0; the ≥3-capability rule that forces ≥2 modules has not been triggered yet. Two paths: (a) author 1 module `KUBE-PLAT-DISTRIBUTION` covering the whole 8-master surface (simplest; M1 satisfied with single module since A2 capabilities count will likely land at 5 to 7 and trigger M2 anyway, so this option is unstable), (b) author 2 modules `KUBE-PLAT-DISTRIBUTION-OPS` (cluster, node-pools, addons, upgrades, registries) and `KUBE-PLAT-WORKLOAD-OPS` (workloads, helm-releases, operators, service-meshes, pipelines) which aligns with the natural cluster-vs-workload split most vendors use. This decision drives the F2 system-skill set and the Phase-A capability code prefix.
3. **Regulations in scope.** KUBE-PLAT itself is not directly regulated, but production K8s commonly hosts FedRAMP-bound, PCI-bound, HIPAA-bound, SOC2-bound workloads. Options: (a) load no `domain_regulations` rows (KUBE-PLAT is substrate-only and regulations attach at the workload domain), (b) load advisory rows (FedRAMP, PCI, HIPAA, SOC2) with applicability = `applicable-when-workloads-require` or similar (verify the column shape). The catalog's pattern so far has been "domain regulations apply when the domain's masters are themselves the regulated artifact"; KUBE-PLAT masters do not fit. Recommended default: (a) no rows.
4. **Consumer / embedded_master declarations on neighboring domains.** KUBE-PLAT plausibly consumes (a) `services` from ITSM, (b) `assets` from ITAM, (c) `vulnerabilities` from VULN-MGMT, (d) `secrets` from SECRETS-MGMT (candidate domain), (e) `identity_principals` from IGA, (f) `git_repositories` (if loaded). Options per item: (a) declare as `consumer + optional`, (b) declare as `embedded_master + optional`, (c) leave undeclared. Likely answers: services and assets and vulnerabilities are `consumer + optional`; secrets and identities and git-repos depend on whether the consumed-from domains exist or not.
5. **Roles authoring scope.** Once modules exist, does KUBE-PLAT get its own personas (cluster_admin, platform_engineer, namespace_owner) or do they inherit from APP-PAAS or generic platform-engineering roles in another domain? Single-module domains vacuously pass E1 but 2-module sets need ≥3 roles per the 2-module floor.
6. **Promote SERVICE-MESH to its own domain (queued candidate).** `service_meshes` currently masters here but Istio / Linkerd are pure-play vendors with distinct buyer. Options: (a) promote (DELETE `service_meshes` master row, add to SERVICE-MESH after Phase 0 vets the domain), (b) keep as KUBE-PLAT master with `embedded_master` shells in SERVICE-MESH later, (c) defer until SERVICE-MESH is loaded.
7. **Promote CONT-REG to its own domain (queued candidate).** Same shape: `container_registries` could move to a registry-specialist domain (Harbor, JFrog Artifactory) or stay as a KUBE-PLAT-adjacent cluster artifact.
8. **F1 legacy skill handling.** Skill id 78 `kube-plat-system` is in the transitional state F1 explicitly permits. Options: (a) leave it alone until module-level skills are authored (default; aligns with F1 timing), (b) rename to `kube_plat_agent` now so the naming convention is correct even before modularization (cosmetic), (c) DELETE now and pause until modules ship (creates a temporary regression on the existing 8 platform query tools, which would also need deletion).
9. **Parent domain link.** KUBE-PLAT.parent_domain_id = 76 (APP-PAAS). Verify intent: is APP-PAAS the right parent (K8s is the substrate APP-PAAS sits on), or should the parent be a more-generic "Cloud Native Platform" domain that does not yet exist? Likely keep APP-PAAS.

### Bucket 3, Phase 0 pending (speculative)

Vendor-driven entity candidates surfaced from the market subagent (Red Hat OpenShift, Rancher, VMware Tanzu, Mirantis, Cilium, Calico flagships). Phase 0 vetting would confirm or filter:

| Candidate entity | Vendor evidence | Proposed module (assuming 2-module split) |
|---|---|---|
| `cluster_addons` | All flagship distributions ship a curated addon set (OpenShift cluster operators, Rancher cluster tools) | KUBE-PLAT-DISTRIBUTION-OPS |
| `cluster_upgrade_plans` | OpenShift OTA, Rancher upgrade strategy, Tanzu lifecycle, EKS Anywhere upgrades | KUBE-PLAT-DISTRIBUTION-OPS |
| `cluster_etcd_backups` | OpenShift backup operator, Rancher backup-restore operator, Tanzu | KUBE-PLAT-DISTRIBUTION-OPS |
| `cluster_audit_logs` | All distributions (K8s audit log is standard) | KUBE-PLAT-DISTRIBUTION-OPS |
| `cluster_namespaces` | All distributions, multi-tenancy primitive | KUBE-PLAT-WORKLOAD-OPS |
| `cluster_rbac_policies` | All distributions, `Role` / `ClusterRole` | KUBE-PLAT-WORKLOAD-OPS |
| `cluster_network_policies` | All distributions (CNI-rendered), Cilium / Calico | KUBE-PLAT-WORKLOAD-OPS |
| `cluster_storage_classes` | All distributions (CSI-rendered) | KUBE-PLAT-DISTRIBUTION-OPS |
| `cluster_resource_quotas` | All distributions, multi-tenancy primitive | KUBE-PLAT-WORKLOAD-OPS |
| `cluster_custom_resource_definitions` | OperatorHub, Rancher catalog, Tanzu | KUBE-PLAT-DISTRIBUTION-OPS (or fold into operator_installations as a field) |

Recommended verification path: spawn a `general-purpose` subagent (read-only) to walk OpenShift / Rancher / Tanzu schema docs and confirm whether each candidate is universally present (4 or 5 of 5 flagships), commonly present (3 of 5), specialist (1 or 2 of 5), or absent. Survivors at 4 of 5 or 5 of 5 become Bucket 1 MISSING in a follow-up audit.

### Cross-bucket dependencies

- **Bucket 1 STRUCTURAL B1-S1 (modularization) gates almost everything downstream.** Lifecycle states (B1-S9) need M1 because `data_object_lifecycle_states.domain_module_id` needs to know the realizing module. B10b (B1-S7) cannot patch source_domain_module_id without a module. F2 (per-module skills) needs M1 as a hard prerequisite. The recommended sequencing: Bucket 2 #2 (modularization decision) first, then Bucket 1 in two waves: (Wave 1) M1 / A2 / A3, (Wave 2) B6 / B7 / B8 / B10b / B11 / B12 / F2.
- **Bucket 2 #1 (catalog UX wording) is informed by Bucket 2 #2 (modularization).** If user chooses 2 modules, the catalog description should mirror the two-module narrative. Suggest holding #1 until #2 resolves.
- **Bucket 3 entity vetting is informed by Bucket 2 #6 and #7 (SERVICE-MESH and CONT-REG promotion).** If user promotes those domains, `cluster_network_policies` and `container_image_signing_records` may shift target domains.
- **Bucket 2 #4 (consumer DMDOs) depends on whether SECRETS-MGMT and POLICY-AS-CODE and IDP candidates ever get loaded.** No immediate action; defer until those candidates clear triage.

### Per-bucket prompts

- **After Bucket 1:** *"Approve all in-scope structural fixes? Reply 'all', 'just S1, S2, S5, S6, S7' (the deterministic ones with no dependencies on other Bucket-2 decisions), 'skip', or list specific IDs. Note: B1-S1, B1-S7, B1-S9 cannot ship until Bucket 2 item 2 (modularization) is decided."*
- **After Bucket 2:** *"What's your call on each judgment item? I'll wait for your decision per item before acting. For item 1 (catalog UX), please supply or approve the exact tagline and description wording per Rule #20. For item 2 (1 vs 2 modules), choose so I can proceed with B1-S1. For item 3 (regulations) and item 4 (consumer DMDOs), pick (a), (b), or (c) per item. For item 8 (F1 legacy skill), pick (a) leave, (b) rename now, (c) DELETE now."*
- **After Bucket 3:** *"Vet via Phase 0 research (spawn read-only subagent against the 5 flagships), or eyeball-mode? If eyeball, name which candidates to promote to Bucket 1 immediately. My eyeball pick (high-confidence universal): cluster_namespaces, cluster_rbac_policies, cluster_network_policies, cluster_resource_quotas (all multi-tenancy primitives shipped by every distribution). cluster_addons, cluster_upgrade_plans, cluster_etcd_backups, cluster_audit_logs, cluster_storage_classes are also high-confidence-universal; cluster_custom_resource_definitions is debatable (fold-into-operator vs distinct)."*

### Report-only follow-ups (owed by other domains)

These are NOT in-scope for KUBE-PLAT's fix-load. They are observations the user can act on by scheduling audits of the owing domains.

- **APP-PAAS B10b owes:** `source_domain_module_id` on handoff 753 (`paas_deployment.succeeded` → KUBE-PLAT). Once APP-PAAS modules are loaded that master `paas_deployments`, the patch is deterministic.
- **OBS B10b owes:** `target_domain_module_id` on handoff 760 (KUBE-PLAT → OBS on `kubernetes_cluster.provisioned`). Resolves to the OBS module that consumes cluster baselines.
- **VSDP B10b owes:** `target_domain_module_id` on handoff 762 (KUBE-PLAT → VSDP on `helm_release.deployed`). Resolves to the VSDP module that hosts release attribution.
- **GRC B10b owes:** `target_domain_module_id` on handoff 764 (KUBE-PLAT → GRC on `container_image.vulnerable`). Resolves to the GRC module that hosts the vulnerability-finding consumer.
- **ITOM B10b owes:** `target_domain_module_id` on handoff 761 (KUBE-PLAT → ITOM on `cluster_node_pool.scaled`). Resolves to the ITOM module that consumes capacity / scaling events.
- **ITAM B8 owes (low priority):** the structural mirror relationship `assets has kubernetes_clusters` (or `kubernetes_clusters are_tracked_in assets`) if ITAM masters a relevant asset object. Currently no canonical master path for KUBE-PLAT cluster → ITAM asset is declared.
- **APP-PAAS B8 owes:** structural mirror relationship row for handoff 753 (`paas_deployments runs_on kubernetes_clusters` or equivalent). Surfaces when APP-PAAS is next validated.
- **ITSM B8 owes (inbound side of B1-S6):** if ITSM later adds a `service_incidents triggered_by container_workloads` reverse-direction row, that lives on ITSM's B8 pass, not here.
- **VULN-MGMT B9 candidates:** KUBE-PLAT receives no inbound from VULN-MGMT today, but realistically VULN-MGMT would publish container-image scan results back to KUBE-PLAT for registry-side blocking. Surface when VULN-MGMT is next validated.

### Notes on this audit

- No DB writes performed (read-only audit).
- 6 candidate domains queued to `audits/_missing-domains.md` via `append_missing_domain.ts`: SERVICE-MESH (new), GITOPS-PLAT (new), SECRETS-MGMT (bumped mention count 1 → 2), CONT-REG (new), POLICY-AS-CODE (new), IDP-INT-DEV-PLAT (new).
- APQC PCF mapping at L4 across all 8 cross-domain handoffs; ratio 8 / 8 = 1.0N proposed (above the 0.5N to 0.8N target band; this domain's handoffs all align cleanly with IT-infrastructure-flavor APQC processes, no industry-specific or modern-digital-only handoffs to defer).
- Open-questions count = 17 (Bucket 1) + 9 (Bucket 2) + 10 (Bucket 3) = 36.

## 2026-05-31, Continuation: B1 technical fixes

### Summary

Applied the truly-technical subset of Bucket 1 from the 2026-05-30 audit. Two phases ran via loader `.tmp_deploy/fix_kube_plat_b1_technical_2026_05_31.ts`:

- **Phase R, Rule #10 user-edges (B1-S5).** Inserted 8 `data_object_relationships` rows linking `users` (id 748, `kind=platform_builtin`) to each KUBE-PLAT master with the audit-specified actor verb. All rows: `relationship_type=one_to_many`, `relationship_kind=reference`, `owner_side=source`, `is_required=false`, `record_status=new`. New row ids 1531 to 1538.
  - 1531: users → kubernetes_clusters (administered clusters / is_administered_by)
  - 1532: users → cluster_node_pools (owned node pools / is_owned_by)
  - 1533: users → container_workloads (owned workloads / is_owned_by)
  - 1534: users → helm_releases (deployed releases / is_deployed_by)
  - 1535: users → service_meshes (administered meshes / is_administered_by)
  - 1536: users → operator_installations (owned operator installations / is_owned_by)
  - 1537: users → platform_pipelines (owned pipelines / is_owned_by)
  - 1538: users → container_registries (administered registries / is_administered_by)

- **Phase H1, APQC tagging (Bucket 1 APQC TAGGING).** Inserted 8 `handoff_processes` rows for the 7 outbound and 1 inbound cross-domain handoffs, all with `role=implements`, `proposal_source=agent_curated`, `record_status=new`. New row ids 288 to 295 (one per handoff: 753, 759, 760, 761, 762, 763, 764, 799 mapped to PCF processes 1311, 1305, 1304, 1304, 1262, 1299, 1307, 1312 respectively).

### Deferred (not applied)

Per the subagent prompt's defer rules:

- **B1-S1** (modules, capabilities, solutions): new entities, gated on Bucket 2 #2 modularization decision.
- **B1-S2** (catalog UX wording): Rule #20 author-then-confirm.
- **B1-S3** (pattern flag positive review): chat-surface only, no DB write needed (defaults are correct).
- **B1-S4** (intra-domain `data_object_relationships`): not Rule #10 user-edges; intra-master edges are out of the technical-only fix scope.
- **B1-S6** (outbound cross-domain `data_object_relationships`): not user-edges; same reason as B1-S4.
- **B1-S7** (B10b FK PATCHes for `source_domain_module_id`): not derivable; KUBE-PLAT still has zero `domain_modules` rows. Becomes fixable post B1-S1.
- **B1-S8** (aliases): audit does not pre-specify exact `alias_name` tuples (only approximate string lists). Defer per "bulk data_object_aliases inserts unless audit pre-specifies exact tuples".
- **B1-S9** (lifecycle states): new entities, also gated on M1 for `data_object_lifecycle_states.domain_module_id`.
- **B1-S10** (F1 legacy skill id 78 `kube-plat-system`): explicit user-judgment item (Bucket 2 #8: leave / rename / DELETE).

10 deferred, all surfaced for user judgment in the original Bucket 2 / cross-bucket-dependencies sections of this audit.

### Writes verified

- `data_object_relationships?data_object_id=eq.748&related_data_object_id=in.(448,449,450,451,452,453,454,455)` returns 8 rows.
- `handoff_processes?handoff_id=in.(799,760,761,763,759,762,764,753)` returns 8 rows, all `proposal_source=agent_curated`, `record_status=new`.

No JWT errors. No `notes` writes (Rule #15). No vendor names in any text field (Rule #18).

### UI links

- https://tests.semantius.app/domain_map/data_object_relationships
- https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

Validate b1 structural re-audit covering S, A, M, B (B5/B7/B9/B9b/B10b/B11/B12), C, D, E (E1-E5), F (F1-F5), H. Run after the 2026-05-31 Continuation that closed B1-S5 (Rule #10 users edges, ids 1531-1538) and the H1 APQC tagging pass (ids 288-295). No new Phase 0 work since the 2026-05-30 baseline. Domain remains structurally early-stage: 8 master data_objects, 0 modules, 0 capabilities, 0 solutions, 0 regulations, 0 lifecycle states, 0 aliases, 0 intra-domain or outbound cross-domain `data_object_relationships`, 11 trigger_events, 7 outbound + 1 inbound cross-domain handoffs (all tagged via H1), 1 legacy domain-level system skill (id 78 `kube-plat-system`) with 8 platform-tier query tools.

- **Bucket 1 (agent-fixable, deterministic):** 1 item (B1-EV1, trigger_event categories backfill). Every other 2026-05-30 Bucket 1 STRUCTURAL row is now blocked (b1b) on Bucket 2 #2 (modularization) or on Rule #20 / Rule #15 / Rule #18 author-then-confirm gates.
- **Bucket 2 (user judgment):** 9 items carried forward from 2026-05-30, unchanged.
- **Bucket 3 (Phase 0 pending):** 10 items carried forward from 2026-05-30, unchanged.
- **next_action_by:** agent. B1-EV1 is a deterministic non-gated fix (trigger_event_category backfill via the standard enum). Once that lands, next_action_by escalates to user (Bucket 2).

### Pass 1, Structural

#### S, Coverage sweep

**S1, FK-to-domains coverage (KUBE-PLAT id 81):**

| Table | FK column | Rows | Expected non-zero | Status |
|---|---|---|---|---|
| `domain_data_objects` | `domain_id` | 8 | yes | pass |
| `domain_modules` | `domain_id` | 0 | yes (Rule #14, M1) | fail, routes to M1 |
| `domain_module_host_domains` | `domain_id` | 0 | optional | pass |
| `capability_domains` | `domain_id` | 0 | yes (>=3) | fail, routes to A2 |
| `solution_domains` | `domain_id` | 0 | yes (>=3) | fail, routes to A3 |
| `business_function_domains` | `domain_id` | 2 (owner + contributor) | yes | pass |
| `domain_regulations` | `domain_id` | 0 | conditional | Bucket 2 #3 |
| `handoffs` source | `source_domain_id` | 7 | yes | pass |
| `handoffs` target | `target_domain_id` | 1 | conditional | pass |
| `skills` | `domain_id` | 1 (legacy 78) | conditional | F1 transitional, F2 fails (vacuous on no modules) |

**S2, per-module coverage:** vacuously fails (no modules).

**S3, per-master sweep across the 8 masters:**

| data_object | states | events | aliases |
|---|---|---|---|
| kubernetes_clusters (448) | 0 | 2 (provisioned, decommissioned) | 0 |
| cluster_node_pools (449) | 0 | 1 (scaled) | 0 |
| container_workloads (450) | 0 | 1 (degraded) | 0 |
| helm_releases (451) | 0 | 2 (deployed, rolled_back) | 0 |
| service_meshes (452) | 0 | 1 (policy_updated) | 0 |
| operator_installations (453) | 0 | 1 (installed) | 0 |
| platform_pipelines (454) | 0 | 1 (completed) | 0 |
| container_registries (455) | 0 | 2 (image_pushed, image.vulnerable) | 0 |

Zero states everywhere routes to B12 (gated on M1 for `domain_module_id`). Zero aliases everywhere routes to B11.

New S3 finding: every trigger_event row carries `event_category=""` (empty string). Per Rule #13 the allowed values are `lifecycle | state_change | threshold | signal`. All 11 events should be backfilled to a non-empty value; surfaced as Bucket 1 deterministic fix B1-EV1.

#### A, Market shape

- **A1, domains metadata:** pass. `crud_percentage=15`, `business_logic` populated, `min_org_size='30 m <2500'`, `cost_band='$$$'`, `usa_market_size_usd_m=3500`, `market_size_source_year=2025`.
- **A2, capabilities:** fail (0). Gated on Bucket 2 #2.
- **A3, solutions:** fail (0). Gated on Bucket 2 #2.
- **A4, catalog UX:** fail. `catalog_tagline=""`, `catalog_description=""`. Gated on Bucket 2 #1 (Rule #20 author-then-confirm wording).

#### M, Modules (gate)

- **M1:** fail. Zero `domain_modules`. Gated on Bucket 2 #2 (1-module vs 2-module decision).
- **M2 / M4 / M5 / M6 / M7:** vacuously pass (no modules, no lifecycle states).
- **M8:** vacuously fails (no modules).

#### B, Data-object footprint

- **B1:** pass (8 masters).
- **B2:** pass (every master has both labels).
- **B3:** pass (no bare-word names).
- **B4:** all three flags at default `false` on every master. Positively re-confirmed in this audit: infrastructure objects, no PII, no submit-lock, no single-approver. No notes write per Rule #15. PASS.
- **B5:** pass (no embedded_master rows).
- **B6:** fail (0 intra-domain edges). 7 edges enumerated in 2026-05-30 B1-S4 still owed. Blocked (b1b) on B6 verb-tuple approval (out of technical-only fix scope, edges enumerated but never written without surfacing per Rule #1).
- **B7:** PASS (Rule #10 users edges loaded 2026-05-31, ids 1531-1538, all 8 masters covered).
- **B8:** fail. 0 outbound cross-domain edges. The clean payload-to-target candidate from 2026-05-30 B1-S6 (`container_workloads triggers service_incidents` for handoff 763) still owed. Blocked (b1b) on user approval of the edge.
- **B9:** event side complete (11 events covering observable transitions on every master). Handoff side complete on the source-domain side for every event (each event has >=1 outbound handoff). But every trigger_event row has empty `event_category` (S3 finding) -- routes to B1-EV1.
- **B9b:** vacuously passes (<2 modules so the check does not apply yet).
- **B10:** REPORT-ONLY. 1 inbound (handoff 753, APP-PAAS -> KUBE-PLAT on `paas_deployment.succeeded`, payload 464 `paas_deployments`). No additional inbound candidates derivable: KUBE-PLAT has zero embedded_master / contributor / consumer rows so the two-query inbound-discovery procedure produces no candidate list.
- **B10b:** fail. All 7 outbound handoffs have `source_domain_module_id=null` (KUBE-PLAT side, in-scope) because no module exists. 5 of 7 outbound also have `target_domain_module_id=null` (handoffs 759, 760, 761, 762, 764, target side -- REPORT-ONLY for APP-PAAS / OBS / ITOM / VSDP / GRC). The inbound handoff 753 has both source_domain_module_id null (APP-PAAS owes) and target_domain_module_id null (KUBE-PLAT owes once modules ship). Every in-scope KUBE-PLAT side null is gated on Bucket 2 #2.
- **B11:** fail (0 aliases). ~12 candidates enumerated in 2026-05-30 B1-S8 (k8s cluster, OpenShift cluster, Rancher cluster, Tanzu cluster, Pod, Deployment, StatefulSet, DaemonSet, Job, Helm chart release, Kubernetes Operator, OCI registry, image registry). Blocked (b1b) on Rule #18 review of exact alias tuples (data_object_aliases.alias_name IS a Rule #18 allowed commerce-shaped site for vendor names, but the audit does not pre-specify exact tuples to load).
- **B12:** fail. 0 lifecycle states. State machines drafted in 2026-05-30 B1-S9 still owed. Blocked (b1b) on M1 (every state needs `domain_module_id` per M5 once modules ship).

#### C, Functional ownership

- **C1:** pass (owner Platform Engineering, contributor IT Operations).
- **C2:** vacuously passes (no capabilities).

#### D, UI spot-check

- **D1:** read-only audit, no UI verification performed.

#### E, Roles and permission bundling

- **E1 to E5:** vacuously pass (single-module domain threshold from E1 since capability_count is <3; once Bucket 2 #2 chooses 2 modules and capabilities land at 5-7, E1 escalates to a real check). Blocked (b1b) on Bucket 2 #5 (roles authoring scope) and Bucket 2 #2.

#### F, Skill-layer integrity

- **F1:** transitional state still acceptable (no module-level system skill exists). Skill id 78 `kube-plat-system` carries 8 platform-tier query tools (556-563), all correctly typed (`operation_kind=query`, `data_object_id` set). Blocked (b1b) on Bucket 2 #8 (leave / rename / DELETE).
- **F2 / F3:** vacuously fail (no module-level skills yet). Blocked on M1.
- **F4:** pass on the legacy skill's 8 tools.
- **F5:** uncomputable per-module (no modules). Legacy skill alone: 8/8 = 100% strict.
- **F7:** pass (no channel-primitive tools linked).

#### H, Handoff APQC coverage

- **H1:** PASS. All 8 cross-domain handoffs (7 outbound + 1 inbound) carry `handoff_processes` rows (`agent_curated`, `record_status=new`), loaded 2026-05-31. Headline catalog-quality count (`record_status='approved'`) is still 0 since the user has not yet bulk-approved the agent_curated rows; that's a Bucket 2 follow-up (not a Bucket 1 fix from the agent's side).

### Pass 2, Market audit

No fresh market-surface subagent run in this audit (the 2026-05-30 baseline still applies; no catalog changes have shifted the diff). Carried-over findings:

- **MISSING (Bucket 3 pending Phase 0 vetting):** 10 candidates: cluster_addons, cluster_upgrade_plans, cluster_etcd_backups, cluster_audit_logs, cluster_namespaces, cluster_rbac_policies, cluster_network_policies, cluster_storage_classes, cluster_resource_quotas, cluster_custom_resource_definitions.
- **WRONG-OWNERSHIP:** none.
- **SCOPE-CREEP:** none.
- **MODULARIZATION ISSUE:** the domain has no modules. 1-vs-2 module decision is Bucket 2 #2.

### Pass 3, Neighbor discovery

Re-derived from current `handoffs` rows (unchanged since 2026-05-30):

| Neighbor (code, id) | Outbound | Inbound | Edge weight |
|---|---|---|---|
| ITAM (3) | 1 (handoff 799) | 0 | 1 |
| ITOM (2) | 1 (handoff 761) | 0 | 1 |
| OBS (7) | 1 (handoff 760) | 0 | 1 |
| VSDP (80) | 1 (handoff 762) | 0 | 1 |
| GRC (15) | 1 (handoff 764) | 0 | 1 |
| ITSM (1) | 1 (handoff 763) | 0 | 1 |
| APP-PAAS (76) | 1 (handoff 759) | 1 (handoff 753) | 2 |

No neighbor crosses edge weight 3. Pairwise reconciliation is a one-line summary per neighbor.

### Pass 4, Pairwise reconciliation

No neighbor at edge weight >=3. Lighter neighbors:

- **APP-PAAS (weight 2):** both handoffs (759 outbound, 753 inbound) lack module FKs on both sides. KUBE-PLAT side gated on Bucket 2 #2; APP-PAAS side report-only for APP-PAAS B10b.
- **ITAM, OBS, VSDP, GRC, ITOM, ITSM (weight 1 each):** all outbound only. KUBE-PLAT side missing source_domain_module_id (gated on M1). Target-side nulls on OBS, VSDP, GRC, ITOM are report-only for those domains' B10b passes.

### Bucket 1, In-scope confirmed gaps

#### Deterministic (agent-fixable now)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-EV1 | B9 / Rule #13 | Every one of the 11 trigger_events on KUBE-PLAT masters has `event_category=""`. Allowed enum values: `lifecycle | state_change | threshold | signal`. | PATCH each event_category per the event-name shape. Proposed mapping: `kubernetes_cluster.provisioned` (825), `kubernetes_cluster.decommissioned` (826), `helm_release.deployed` (829), `helm_release.rolled_back` (830), `operator.installed` (832), `platform_pipeline.completed` (833), `container_registry.image_pushed` (834) -> `lifecycle`; `container_workload.degraded` (828), `service_mesh.policy_updated` (831) -> `state_change`; `cluster_node_pool.scaled` (827) -> `threshold`; `container_image.vulnerable` (835) -> `signal`. |

**Bucket 1 deterministic count: 1.**

#### Gated (b1b blocked-fixes)

Every other 2026-05-30 Bucket 1 STRUCTURAL item is now classified `b1b` blocked:

- **B1-S1** (M1 + A2 + A3): blocked on Bucket 2 #2 (modularization decision).
- **B1-S2** (A4 catalog UX): blocked on Bucket 2 #1 (Rule #20 wording approval).
- **B1-S4** (B6 intra-domain edges): blocked on B6 verb-tuple approval.
- **B1-S6** (B8 outbound cross-domain edges): blocked on B6/B8 verb-tuple approval.
- **B1-S7** (B10b source-side FKs): blocked on B1-S1 (no modules exist to target).
- **B1-S8** (B11 aliases): blocked on Rule #18 review of vendor-shaped alias tuples.
- **B1-S9** (B12 lifecycle states): blocked on B1-S1.
- **B1-S10** (F1 legacy skill): blocked on Bucket 2 #8.

### Bucket 2, Surface-for-user (judgment)

Carried forward unchanged from 2026-05-30:

1. **A4 catalog UX wording (Rule #20).** Draft proposals in 2026-05-30 B1-S2. User reviews wording before any write.
2. **Modularization decision (1 vs 2 modules).** Drives A2 capability code prefix, M1 module shape, F2 system-skill set. Default proposal: 2 modules (`KUBE-PLAT-DISTRIBUTION-OPS`, `KUBE-PLAT-WORKLOAD-OPS`).
3. **Regulations in scope.** Recommended default: no `domain_regulations` rows.
4. **Consumer / embedded_master declarations on neighbors.** Candidates: services (ITSM), assets (ITAM), vulnerabilities (VULN-MGMT), secrets (SECRETS-MGMT pending), identity_principals (IGA), git_repositories.
5. **Roles authoring scope.** Once 2 modules exist, author KUBE-PLAT personas or inherit from APP-PAAS?
6. **Promote SERVICE-MESH to its own domain (queued candidate).**
7. **Promote CONT-REG to its own domain (queued candidate).**
8. **F1 legacy skill 78 (`kube-plat-system`) handling.** Leave (default) / rename to `kube_plat_agent` / DELETE.
9. **Parent domain link.** KUBE-PLAT.parent_domain_id=76 (APP-PAAS) confirmed appropriate.

### Bucket 3, Phase 0 pending (speculative)

10 candidate entities from the 2026-05-30 vendor surface, unchanged: cluster_addons, cluster_upgrade_plans, cluster_etcd_backups, cluster_audit_logs, cluster_namespaces, cluster_rbac_policies, cluster_network_policies, cluster_storage_classes, cluster_resource_quotas, cluster_custom_resource_definitions. Vendor evidence basis: Red Hat OpenShift, Rancher, VMware Tanzu, Mirantis Kubernetes Engine, Cilium/Calico. Recommended verification path: spawn read-only `general-purpose` subagent over OpenShift / Rancher / Tanzu schema docs.

### Cross-bucket dependencies

- Bucket 2 #2 (modularization) gates B1-S1, B1-S7, B1-S9, and downstream F2 / F3 / E1 escalation. Resolve first.
- Bucket 2 #1 (catalog UX wording) is informed by Bucket 2 #2. Hold until #2 resolves.
- Bucket 3 vetting is informed by Bucket 2 #6, #7 (SERVICE-MESH, CONT-REG promotion).
- Bucket 2 #4 (consumer DMDOs) depends on whether SECRETS-MGMT / POLICY-AS-CODE / IDP-INT-DEV-PLAT candidates ever get loaded.
- B1-EV1 (trigger_event categories) is independent of every Bucket 2 item.

### Report-only follow-ups (owed by other domains)

Unchanged from 2026-05-30 baseline:

- **APP-PAAS B10b owes** `source_domain_module_id` on handoff 753.
- **OBS B10b owes** `target_domain_module_id` on handoff 760.
- **VSDP B10b owes** `target_domain_module_id` on handoff 762.
- **GRC B10b owes** `target_domain_module_id` on handoff 764.
- **ITOM B10b owes** `target_domain_module_id` on handoff 761.
- **ITAM B8 owes** structural mirror relationship row for handoff 799.
- **APP-PAAS B8 owes** structural mirror relationship row for handoff 753.
- **ITSM B8 owes** reverse-direction row for handoff 763 if added.
- **VULN-MGMT B9 candidate:** publishing scan results back to KUBE-PLAT registries.

### Notes on this audit

- No DB writes performed (read-only structural audit).
- B1-S3 (B4 pattern-flag positive re-evaluation) resolved in chat: all three flags correctly `false` on all 8 KUBE-PLAT masters.
- B1-S5 (Rule #10 users edges) verified loaded in the 2026-05-31 Continuation, ids 1531-1538.
- H1 APQC tagging verified loaded in the 2026-05-31 Continuation, ids 288-295.
- One new deterministic Bucket 1 item surfaced (B1-EV1, trigger_event categories).
- No JWT errors. No notes writes (Rule #15). No vendor names in non-commerce text (Rule #18).

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
