# APP-PAAS audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0** `domain_modules` rows (M1 / M2 / M4 / M6 hard-fail), **0** capabilities, **6** `domain_data_objects` masters (`paas_applications` 463, `paas_deployments` 464, `paas_environments` 465, `paas_runtime_instances` 466, `paas_addons` 467, `paas_build_records` 468), **10** solutions (all `coverage_level=primary`), **1** regulation (EU-CRA), 7 trigger_events on APP-PAAS masters, 7 outbound + 3 inbound cross-domain handoffs, **0** intra-domain handoffs, **0** lifecycle states on any master, **0** data_object_relationships involving any APP-PAAS master, **0** data_object_aliases, **0** domain_aliases, **0** roles touching APP-PAAS, 1 legacy `domain_id`-anchored system skill (`app-paas-system`, id 30) with 6 `query_*` skill_tools (all `coverage_tier=platform`), 0 mutate / side_effect / compute tools, 0 `handoff_processes` rows on any APP-PAAS handoff. 2 `business_function_domains` rows (Platform Engineering owner, IT Operations contributor).
- **Vendor-surface basis:** flagship managed-application-runtime vendors enumerated in Pass 2: Heroku (the category-defining 12-factor PaaS), AWS Elastic Beanstalk (AWS-native managed app runtime), Azure App Service (Azure-native), Google App Engine (GCP-native), Vercel (frontend-first edge-aware PaaS), Render (modern Heroku-replacement), Railway (Heroku-replacement with infra-as-code), Fly.io (geo-distributed runtime), DigitalOcean App Platform (mid-market), Netlify (frontend-first edge-aware PaaS). All 10 are already in `solutions` and linked via `solution_domains` (all primary). Surface skew: 6 of the 10 are modern frontend-first or geo-distributed runtimes; only Heroku / AWS / Azure / GCP App Engine / DigitalOcean carry the original backend-monolith PaaS shape. Compliance specialist not separately enumerated (EU-CRA scope applies via product-security obligations, not a vendor archetype).
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO cross-refs | Weight | Pass shape |
|---|---|---|---|---|---|
| KUBE-PLAT | 1 | 1 | 0 | 2 | Lightweight |
| VSDP | 2 | 1 | 0 | 3 | Pairwise (weight >= 3) |
| ITSM | 1 | 0 | 0 | 1 | Lightweight |
| OBS | 1 | 0 | 0 | 1 | Lightweight |
| ITOM | 1 | 0 | 0 | 1 | Lightweight |
| SAM | 1 | 0 | 0 | 1 | Lightweight |
| LCAP | 0 | 1 | 0 | 1 | Lightweight |

Only VSDP reaches edge weight >= 3. The full 5-section pairwise diff is blocked behind M1 (no source / target modules exist on the APP-PAAS side), so the deep dive collapses to a Section 2 / Section 5 sub-pass (NULL FK + missing relationships). Captured in Bucket 1 under "Boundary findings per neighbor".

**Structural pass bands:**
- **S band (sweep)**: zero-row anomalies on `domain_modules` (M1), `capability_domains` (A2), `domain_module_capabilities` (M6 vacuous), `data_object_lifecycle_states` (B12), `data_object_aliases` (B11), `data_object_relationships` (B6 / B7 / B8), `roles` (E1 vacuously blocked by M1), `domain_aliases` (A4 alias surface). S2 vacuous (no modules). S3 hard-fail (every master has zero states + zero aliases; trigger events partial: 7 events shared across 6 masters, but `paas_environments`, `paas_applications`, and `paas_build_records` each carry only one or two events).
- **A band**: A1 passes (all 7 domain metadata fields populated: crud=20, min_org_size, cost_band $$$, certification_required=false, USA TAM 8000 / 2025, business_logic non-empty). A2 hard-fails (zero capabilities). A3 passes (10 solutions, all primary). A4 hard-fails (`catalog_tagline` empty, `catalog_description` empty). A5 skipped (not requested). Pre-existing U+2014 em-dash in `domains.description` is flagged for the catalog-wide em-dash sweep (report-only, not part of this audit's writes).
- **M band**: **M1 / M2 / M4 / M6 hard-fail**. Zero modules. With zero capabilities the M2 floor (>= 2 modules when capability_count >= 3) is vacuously satisfied, but the M1 floor (>= 1 module per domain) is unconditional and hard-fails. M4 / M6 are vacuous given no modules and no capabilities; both unblock the moment M1 is cured.
- **B band**: B1 passes (6 masters). B2 passes (every master has singular + plural labels). B3 passes (all 6 names are `paas_<noun>` prefixed; bare-word arbitration not invoked). B4 hard-fail (every pattern flag is the false default with zero positive re-evaluation: candidates listed below). B5 vacuously passes (no `embedded_master` rows). **B6 hard-fail** (zero intra-domain `data_object_relationships`; 6 masters that obviously edge to each other). **B7 hard-fail** (zero `users` edges; every PaaS master has obvious user-typed actors: deployer, owner, configurator). **B8 hard-fail** (7 outbound handoffs but zero cross-domain `data_object_relationships` from APP-PAAS masters to target-domain masters). **B9 partial-fail** (7 trigger_events; `event_category` not checked in this pass but the events themselves are coherent). B9b vacuous (no modules; no intra-domain pairs to verify). **B10b hard-fail** (6 of 7 outbound handoffs have NULL `source_domain_module_id` AND NULL `target_domain_module_id`; handoff 757 has NULL source and target_module_id=38, see B1-S9 / Bucket 2 item B2-S2 for the cross-payload anomaly on that row; all 3 inbound handoffs have NULL on both module FKs). **B11 hard-fail** (zero aliases on any master; obvious vendor synonyms exist: Heroku "app" / "release" / "dyno" / "addon", Vercel "project" / "deployment" / "preview" / "edge function", Render "service" / "deploy", Fly.io "app" / "machine" / "release"). **B12 hard-fail** (zero lifecycle states; every master has an obvious workflow: `paas_applications` is provisioned -> active -> archived; `paas_deployments` queued -> building -> deploying -> succeeded / failed -> rolled_back; `paas_environments` configured -> active -> promoted -> archived; `paas_runtime_instances` starting -> running -> scaling -> draining -> stopped; `paas_addons` provisioning -> active -> degraded -> deprovisioned; `paas_build_records` queued -> building -> tested -> ready / failed).
- **C band**: C1 passes (2 rows, Platform Engineering owner + IT Operations contributor; both names match the canonical 20-function spine). C2 vacuous (no capabilities loaded).
- **D band**: D1 not exercised (no fresh load).
- **E band**: E1 vacuous (M1 blocks role authoring; the 2-module floor cannot be met until modules exist).
- **F band**: **F1 hard-fail-pending** (legacy `domain_id`-anchored `system` skill `app-paas-system` id 30; the F1 threshold only hard-fails once any module-level system skill is authored, but Rule #17 sets target state as one system skill per module). **F2 hard-fail** (zero `domain_module_id`-anchored system skills, vacuously blocked by M1). F3 passes against the legacy skill (6 `query_*` tools linked). F4 passes (all 6 tools are `operation_kind=query` with `data_object_id` set). F5 strict_score against the legacy skill is 6/6 = 100%, but the headline number is meaningless until per-module system skills exist and mutate / workflow-gate tools are added. F7 vacuous (no channel primitives linked).
- **H band**: **H1 hard-fail**. 10 cross-domain handoffs (7 out + 3 in); zero `handoff_processes` rows; zero agent_curated tags; zero deferrals recorded. Volume target for this audit: ~5 to 8 agent_curated tags proposed (0.5N to 0.8N for N=10). Audit proposes 8 below.

**The headline finding:** APP-PAAS is a marketing-tier row in roughly the same shape LCAP was (see [audits/LCAP.md](LCAP.md) 2026-05-30): `domains` metadata + 10 vendor solutions + 6 mastered `data_objects` with descriptions + 7 trigger events + 1 legacy domain-level system skill + 6 query-only tools, but the M / B / C-capability / E / F-module / H layers are essentially empty. There are no `domain_modules`, no `capabilities`, no `data_object_relationships`, no lifecycle states, no aliases, no roles, no APQC tags. The deployable surface is zero. Every downstream concern (per-module attribution on handoffs, role bundling, system-skill derivation, Semantius score at module granularity, fact-sheet emission) is uncomputable until M1 / A2 cure.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 / M2 / M4 / M6 hard fail + A2 hard fail** | Zero `domain_modules`, zero `capabilities`. Rule #14 requires >= 1 full module per domain. Vendor surface implies a 2-module split: **APP-PAAS-RUNTIME** (managed-runtime, autoscaler, environment lifecycle, addon attachment; realizes capabilities `APP-PAAS-MANAGED-RUNTIME`, `APP-PAAS-AUTOSCALE`, `APP-PAAS-ENV-MGMT`, cross-cutting `LCAP-MANAGED-RUNTIME` already in catalog; masters `paas_applications`, `paas_environments`, `paas_runtime_instances`, `paas_addons`) and **APP-PAAS-DELIVERY** (build pipeline, deployment, release; realizes capabilities `APP-PAAS-BUILD-PIPELINE`, `APP-PAAS-DEPLOY-RELEASE`; masters `paas_deployments`, `paas_build_records`). Capability split goes to Bucket 2 (B2-S1) because the cross-cutting linkage choice is the user's call. Once modules exist, every M-band check curates. | Author 2 `domain_modules` rows + 5-7 `capabilities` rows + `capability_domains` links + `domain_module_capabilities` links + 6 `domain_module_data_objects` master rows. Pending Bucket 2 B2-S1 decision on the split. |
| B1-S2 | **A4 hard fail - empty catalog UX fields** | `catalog_tagline` and `catalog_description` are both empty strings. Rule #20 requires both populated in buyer voice for any domain with a vendor surface. APP-PAAS is a buyer-facing market (10 solutions in `solution_domains`). | Draft both fields per Rule #20 voice rule (workflow + value, not market position + handoffs), surface to user for review BEFORE writing. Sample tagline: "Ship code-first apps without managing servers." Sample description: "Deploy web apps, APIs, and workers to a managed runtime that auto-scales, builds on every commit, and provisions databases and queues as addons. Promote across environments, monitor releases, and roll back failed deployments without touching infrastructure." User must approve exact wording. |
| B1-S3 | **B4 pattern flag re-evaluation (Rule #12)** | Every master has all three flags `false` (default). Audit needs positive re-evaluation. Candidate flips: `paas_deployments.has_submit_lock=true` (once a deployment succeeds, the deployed artifact is immutable; rollback creates a new deployment, never mutates the prior one); `paas_build_records.has_submit_lock=true` (build artifact immutable once complete); `paas_addons.has_personal_content=true` (database / cache addons usually carry connection strings or credentials at provisioning). Other masters: `paas_applications` (no flag flips), `paas_environments` (no flag flips), `paas_runtime_instances` (no flag flips; instance state is reconciled continuously). | Surface as Bucket 2 (B2-S3) because pattern flags are workflow-shape judgments the user owns. |
| B1-S4 | **B6 hard fail - zero intra-domain `data_object_relationships`** | APP-PAAS has 6 masters that all participate in a single workflow chain. Minimum coherent edge set: `paas_applications` has_environments `paas_environments` (1:N, owner_side=paas_applications, is_required=true); `paas_applications` has_deployments `paas_deployments` (1:N); `paas_applications` has_addons `paas_addons` (1:N); `paas_deployments` produces `paas_runtime_instances` (1:N; runtime instances belong to a specific deployment of a specific app); `paas_deployments` consumes `paas_build_records` (N:1, owner_side=paas_build_records); `paas_environments` hosts `paas_runtime_instances` (1:N); `paas_environments` scopes `paas_deployments` (1:N; each deployment targets one environment). | Author 7 `data_object_relationships` rows via the cluster-drafts pattern in [scripts/loaders/load_cluster_drafts.ts](../scripts/loaders/load_cluster_drafts.ts). Draft block goes through Bucket 1 approval before loading. |
| B1-S5 | **B7 hard fail - zero `users` edges (Rule #10)** | APP-PAAS masters have obvious user-typed actors but no edge to the platform built-in `users` data_object. Minimum edge set: users `owns` paas_applications; users `deploys` paas_deployments (deployer); users `triggers` paas_build_records (committer); users `configures` paas_addons; users `manages` paas_environments (env_owner). | Insert 5 `data_object_relationships` rows from the platform built-in `users` row to each APP-PAAS master with a user actor. Bundle with B1-S4 in the same cluster-drafts load. |
| B1-S6 | **B11 hard fail - zero `data_object_aliases`** | APP-PAAS masters carry strong vendor-specific synonyms across the 10 solutions: Heroku "app" / "release" / "dyno" / "addon", Vercel "project" / "deployment" / "preview" / "edge function", Render "service" / "deploy", Fly.io "app" / "machine" / "release", Railway "service" / "deployment", Netlify "site" / "deploy" / "function", AWS Beanstalk "application" / "environment" / "version", Azure App Service "web app" / "deployment slot" / "release", Google App Engine "service" / "version" / "instance". Without aliases the architect agent can't bridge vendor terminology into the catalog's canonical names. | Draft alias rows (6 masters x ~3-5 aliases = ~20 rows) and load via the cluster-drafts pattern. |
| B1-S7 | **B12 hard fail - zero `data_object_lifecycle_states` (Rule #12)** | Every APP-PAAS master has an obvious state machine. Proposed states (5 masters with workflow + 1 config-shape candidate to be decided in B2-S4): `paas_applications` (provisioned -> active -> archived; `archived` has `requires_permission=true`); `paas_deployments` (queued -> building -> deploying -> succeeded / failed -> rolled_back; `deploying`, `succeeded`, `failed`, `rolled_back` all have `requires_permission=true`); `paas_environments` (configured -> active -> promoted -> archived; `promoted` has `requires_permission=true` since promotion to production is a gate); `paas_runtime_instances` (starting -> running -> scaling -> draining -> stopped; reconciled-continuously shape suggests this is config-shape on a state column rather than an explicit workflow, see B2-S4); `paas_addons` (provisioning -> active -> degraded -> deprovisioned; `deprovisioned` has `requires_permission=true`); `paas_build_records` (queued -> building -> tested -> ready / failed; `ready` and `failed` have `requires_permission=true`). `domain_module_id` on each lifecycle row must point at the realizing module (M5), so this load depends on B1-S1 having authored the modules first. | Draft state machines (5 to 6 masters x ~4-5 states = ~22-30 rows) and load via a focused loader. Sequence behind B1-S1. |
| B1-S8 | **F1 hard fail - legacy domain-level system skill** | `skills` row id 30 (`app-paas-system`, `skill_type=system`, `domain_id=76`, `domain_module_id=NULL`) is the legacy shape Rule #17 forbids once any module-level system skill exists. F1 currently sits in vacuous transitional state because no module-level skill has been authored. Once B1-S1 lands and module-level system skills are authored, F1 hard-fails until the legacy row is retired. The 6 linked `query_*` `skill_tools` (310-315) should be re-anchored to the new per-module skills: query_paas_applications + query_paas_environments + query_paas_runtime_instances + query_paas_addons -> APP-PAAS-RUNTIME skill; query_paas_deployments + query_paas_build_records -> APP-PAAS-DELIVERY skill. Also, the skill_name uses kebab `app-paas-system` against the snake `<module_code_lower>_agent` convention. | After B1-S1: author 2 new module-anchored system skills (e.g. `app_paas_runtime_agent`, `app_paas_delivery_agent`), move the 6 `skill_tools` to the new skills, then DELETE the legacy skill 30. Plus add mutate + workflow-gate tools per Rule #17 (typical floor 5-20 per skill; current 6 query-only is below the floor). |
| B1-S9 | **B10b hard fail - NULL module FKs on every cross-domain handoff** | All 7 outbound handoffs (753, 754, 755, 756, 757, 758, 798) have NULL `source_domain_module_id`, blocked behind M1. After B1-S1 lands and the 6 masters are attributed to modules, `source_domain_module_id` derives cleanly per the B10b backfill rule: handoffs 753 / 754 / 756 (`paas_deployment.succeeded`) and 758 (`paas_build.failed`) -> APP-PAAS-DELIVERY (masters `paas_deployments` and `paas_build_records`); handoff 755 (`paas_runtime.scaled`) -> APP-PAAS-RUNTIME (masters `paas_runtime_instances`); handoff 798 (`paas_addon.provisioned`) -> APP-PAAS-RUNTIME (masters `paas_addons`). Handoff 757 (`paas_deployment.failed`) is anomalous: `trigger_event.data_object_id=464` (paas_deployments) but `handoffs.data_object_id=47` (service_incidents, ITSM-mastered) and `target_domain_module_id=38` already set. The split-payload shape suggests source is APP-PAAS-DELIVERY (event on `paas_deployments`) while target is the ITSM incident module (already attributed). Inbound 704 (LCAP -> APP-PAAS) carries `data_object_id=220` (extend_apps, LCAP-mastered) with both module FKs NULL; 759 (KUBE-PLAT, container_workloads) NULL; 770 (VSDP, software_deployments) NULL. Source-side NULLs on inbound rows are report-only (the source domain owes the backfill); target-side NULLs need a paas-module attribution which depends on B1-S1. | Single PATCH pass on 7 outbound rows + target_module backfill on 3 inbound rows after B1-S1 lands. Reference: [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts). The 3 inbound rows also need a consumer DMDO on the receiving APP-PAAS module declaring `extend_apps` (220), `container_workloads` (450), and `software_deployments` (682) as `consumer` or `embedded_master`, since APP-PAAS does not currently model them anywhere. |
| B1-S10 | **B8 outbound - missing cross-domain `data_object_relationships`** | 7 outbound APP-PAAS handoffs but zero cross-domain `data_object_relationships` exist where APP-PAAS masters edge to the target domain's masters. Proposed verbs: handoff 753 (`paas_deployment.succeeded` -> KUBE-PLAT) maps to `paas_deployments runs_on container_workloads` (target master `container_workloads` 450 confirmed); handoff 754 / 770-inverse (`paas_deployment.succeeded` -> VSDP) maps to `paas_deployments records_in software_deployments` (target master `software_deployments` 682 confirmed); handoff 755 (`paas_runtime.scaled` -> ITOM, target master TBD; ITOM contains monitoring / capacity entities); handoff 756 (`paas_deployment.succeeded` -> OBS, target master TBD - candidate `observability_baselines` or similar); handoff 757 (`paas_deployment.failed` -> ITSM) maps to `paas_deployments opens service_incidents` (target master `service_incidents` 47 confirmed); handoff 758 (`paas_build.failed` -> VSDP) maps to `paas_build_records signals software_deployments` (or a more specific build-record entity if VSDP models one); handoff 798 (`paas_addon.provisioned` -> SAM, target master TBD - candidate `software_licenses` or `it_assets`). | Author the outbound `data_object_relationships` rows after B1-S4 / B1-S5 land; 3 rows (753, 754, 757) are directly resolvable now; 4 rows (755, 756, 758, 798) need a one-query check of the target domain's current masters before authoring. |
| B1-S11 | **B9b hard fail (vacuous) - intra-domain handoffs blocked by M1** | After B1-S1 lands and the 7 intra-domain `data_object_relationships` from B1-S4 are loaded, the cross-module pairs derive: `paas_build_records.ready` fires APP-PAAS-DELIVERY (produces) -> APP-PAAS-DELIVERY (consumes via `paas_deployments` queued state); `paas_deployment.succeeded` fires APP-PAAS-DELIVERY -> APP-PAAS-RUNTIME (produces `paas_runtime_instances`); `paas_environment.promoted` fires APP-PAAS-RUNTIME -> APP-PAAS-DELIVERY (subsequent deployments now target promoted env); `paas_addon.provisioned` fires APP-PAAS-RUNTIME -> APP-PAAS-RUNTIME (intra-module, drop). Net: 2 cross-module intra-domain handoff rows. | Author 2 intra-domain `handoffs` rows after B1-S1 + B1-S4 + lifecycle states from B1-S7. `source_domain_id = target_domain_id = 76`, `integration_pattern: lifecycle_progression`, `friction_level: low`. |
| B1-S12 | **A2 - missing capabilities (covered in B1-S1 fix)** | Zero `capability_domains` rows. APP-PAAS as a market has ~5-7 buyer-recognizable capabilities: managed application runtime (already exists as cross-cutting `LCAP-MANAGED-RUNTIME` id 333; link APP-PAAS to it via `capability_domains`), autoscaling, environment / promotion management, build pipeline, deployment / release management, addon marketplace, application observability hooks. Capability code shape is Bucket 2 (B2-S1) because the cross-cutting decision (link to existing `LCAP-MANAGED-RUNTIME`, or author parallel `APP-PAAS-MANAGED-RUNTIME`?) is a Rule #18 cross-cutting-capability-convention call. | Surface 5-7 candidates in Bucket 2 B2-S1 for the cross-cutting decision; then load via the focused `capabilities` + `capability_domains` + `domain_module_capabilities` loader pattern. |
| B1-H1 | **APQC TAGGING** | APP-PAAS cross-domain handoffs have zero `handoff_processes` tags. Volume target 0.5N to 0.8N (N=10) is 5 to 8 tags. Audit proposes 8 high-confidence tags below + 2 deferred. | INSERT into `handoff_processes` with `proposal_source='agent_curated'`, `record_status='new'`. |

##### B1-H1 detail - proposed APQC tags

| handoff_id | source -> target | trigger_event | payload | Proposed PCF | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 753 | APP-PAAS -> KUBE-PLAT | paas_deployment.succeeded | paas_deployments | Deploy services/solutions | 52 (L2, ext 20824) | confident L2 |
| 754 | APP-PAAS -> VSDP | paas_deployment.succeeded | paas_deployments | Implement software change/release | 1262 (L4, ext 20853) | confident L4 |
| 755 | APP-PAAS -> ITOM | paas_runtime.scaled | paas_runtime_instances | Manage infrastructure performance and capacity | 1304 (L4, ext 20909) | confident L4 |
| 756 | APP-PAAS -> OBS | paas_deployment.succeeded | paas_deployments | Verify change/release implementation success | 1265 (L4, ext 20856) | confident L4 |
| 757 | APP-PAAS -> ITSM | paas_deployment.failed | service_incidents | Triage IT service delivery incidents | 1299 (L4, ext 20903) | confident L4 |
| 758 | APP-PAAS -> VSDP | paas_build.failed | paas_build_records | Build and test IT service/solution components | 1939 (L5, ext 20812) | medium L5 (prefer L3 parent if it exists; verify) |
| 798 | APP-PAAS -> SAM | paas_addon.provisioned | paas_addons | Administer IT licenses/user agreements | 1313 (L4, ext 20919) | medium L4 |
| 704 (inbound) | LCAP -> APP-PAAS | extend_app.published | extend_apps | Deploy services/solutions | 52 (L2, ext 20824) | confident L2 |

Deferred-to-Discover-Pass-3 (no clean cross-industry PCF match):
- handoff 759 (KUBE-PLAT -> APP-PAAS, `container_workload.degraded`): the closest PCF candidates are L4 incident triage / capacity management but the semantic intent is `runtime container degraded -> autoscaler reacts` which sits between IT-infra triage and IT-service-availability. Defer.
- handoff 770 (VSDP -> APP-PAAS, `software_deployment.completed`): in-domain VSDP semantics overlap with handoff 754 inverse; if VSDP's outbound on `software_deployment.completed` to APP-PAAS is genuinely distinct from APP-PAAS's own outbound on `paas_deployment.succeeded` to VSDP, the L4 `Implement software change/release` (1262) tag applies; if not, this is a duplicate handoff to be merged. Defer to the VSDP audit or to a B8 reconciliation pass.

#### Boundary findings per neighbor

**APP-PAAS <-> VSDP (weight 3, edge weight passes deep-dive threshold; deep dive collapsed because M1 hard-fails on APP-PAAS side):**

| Section | Finding | Routing |
|---|---|---|
| Section 1 - existing handoffs fully wired | None (every cross-edge has NULL module FK on APP-PAAS side because M1 fails) | Blocked behind B1-S1 |
| Section 2 - existing handoffs with NULL module FK | 3 rows (754, 758, 770) need `source_domain_module_id` / `target_domain_module_id` backfill on the APP-PAAS side post-B1-S1 | In-scope under B1-S9 |
| Section 3 - missing handoffs | None identified; both sides already publish their respective deployment.completed / paas_deployment.succeeded | Pass |
| Section 4 - boundary integrity | VSDP's `software_deployments` (682) is not declared as `consumer` or `embedded_master` on any APP-PAAS module (because no modules exist). After B1-S1, decide: declare `software_deployments` as `consumer` on APP-PAAS-DELIVERY (preferred, captures the VSDP -> APP-PAAS deployment-record cross-link) or accept that this dependency is domain-level only. | Bucket 2 (B2-S5) |
| Section 5 - cross-domain `data_object_relationships` | 0 rows exist. Proposed mirrors: `paas_deployments records_in software_deployments` (mirrors handoff 754); `paas_build_records signals software_deployments` (mirrors handoff 758); inverse for inbound 770. | In-scope under B1-S10 |

**APP-PAAS <-> KUBE-PLAT (weight 2):** 1 out (753) + 1 in (759). Out is wired correctly at the catalog level (KUBE-PLAT's `container_workloads` is the right target master); in is the `container_workload.degraded` -> APP-PAAS autoscaler signal. Section-5 mirror proposed in B1-S10 (`paas_deployments runs_on container_workloads`). Boundary integrity: KUBE-PLAT's `container_workloads` is not declared on any APP-PAAS module (blocked behind M1); APP-PAAS masters are not declared on any KUBE-PLAT module (KUBE-PLAT also has zero modules per audit cross-reference, so this is mirrored on the KUBE-PLAT side). KUBE-PLAT's audit will surface its own M1 gap.

**APP-PAAS <-> ITSM (weight 1):** Handoff 757 (`paas_deployment.failed` -> ITSM) already has `target_domain_module_id=38` (ITSM-INCIDENT-MGMT, confirmed). One-line summary: target side wired correctly; source side blocked behind B1-S1. No deep dive.

**APP-PAAS <-> OBS / ITOM / SAM / LCAP (weight 1 each):** One-line summaries: each has 1 cross-edge with NULL module FK on the APP-PAAS side; all backfill cleanly post-B1-S1. No deep dive.

### Bucket 2 - Surface-for-user (judgment calls)

1. **B2-S1 - Module split + capability shape decision.** Proposed 2-module split: **APP-PAAS-RUNTIME** (runtime, autoscale, environments, addons; masters `paas_applications`, `paas_environments`, `paas_runtime_instances`, `paas_addons`) and **APP-PAAS-DELIVERY** (build pipeline, deployment, release; masters `paas_deployments`, `paas_build_records`). Capability set: `APP-PAAS-MANAGED-RUNTIME` (or link to existing cross-cutting `LCAP-MANAGED-RUNTIME` id 333; the Rule #18 cross-cutting convention says >=3 domains warrants domain-neutral, LCAP and APP-PAAS clearly share managed-runtime), `APP-PAAS-AUTOSCALE`, `APP-PAAS-ENV-MGMT`, `APP-PAAS-ADDON-MARKETPLACE` on the RUNTIME module; `APP-PAAS-BUILD-PIPELINE`, `APP-PAAS-DEPLOY-RELEASE` on the DELIVERY module. **Decisions needed:** (a) approve the 2-module split, or propose alternative? (b) link to existing `LCAP-MANAGED-RUNTIME` or author parallel `APP-PAAS-MANAGED-RUNTIME`? (c) is `APP-PAAS-ADDON-MARKETPLACE` worth a top-level capability, or fold into `APP-PAAS-ENV-MGMT` since addons attach to environments? Independent of Bucket 3.
2. **B2-S2 - Catalog UX field wording (Rule #20).** Draft tagline + description proposed in B1-S2. User must approve exact wording; sample is a starting point only. Marketing voice required (buyer workflow + value, not analyst voice). Independent.
3. **B2-S3 - B4 pattern flag flips.** Proposed flips listed in B1-S3 (`paas_deployments.has_submit_lock=true`, `paas_build_records.has_submit_lock=true`, `paas_addons.has_personal_content=true`). User confirms each or rewrites. Independent.
4. **B2-S4 - `paas_runtime_instances` lifecycle shape.** The other 5 masters have obvious workflow state machines, but runtime instances are reconciled-continuously by the autoscaler; states transition without user action. Two design options: (a) load the 5-state machine anyway (`starting -> running -> scaling -> draining -> stopped`) with all states `requires_permission=false` since they fire from the autoscaler not the user, OR (b) treat `paas_runtime_instances` as config-shape on a state column (per Rule #12 exemption), surface to user, do not auto-populate `data_objects.notes`. Note: surfacing the config-shape decision in chat is Rule #15-compliant; writing it to `notes` is not. Independent.
5. **B2-S5 - VSDP `software_deployments` consumer declaration.** APP-PAAS-DELIVERY plausibly consumes VSDP's `software_deployments` (records the canonical deployment-tracker entry per software release). Decide: declare as `consumer + optional` on APP-PAAS-DELIVERY (captures the dependency in the catalog), OR accept that the handoff is domain-level only (no DMDO row). Same call for KUBE-PLAT's `container_workloads` against APP-PAAS-RUNTIME and LCAP's `extend_apps` against APP-PAAS-RUNTIME (3 inbound payload entities, 3 consumer-declaration decisions). Depends on B1-S1 module shape.
6. **B2-S6 - Cross-cutting capability membership for `LCAP-MANAGED-RUNTIME`.** Per Rule #18 cross-cutting convention, `LCAP-MANAGED-RUNTIME` (id 333) currently links only to LCAP. Once APP-PAAS adopts it, the capability now spans 2 domains (LCAP + APP-PAAS). For >=3-domain status the cross-cutting test would also need KUBE-PLAT linkage. Decide: rename to `MANAGED-RUNTIME` (drop the LCAP prefix to reflect cross-cutting status), or hold at 2-domain link until KUBE-PLAT is audited and confirms shared shape? Depends on B2-S1.

### Bucket 3 - Phase 0 pending (speculative; vendor-research vetting needed)

Universal-or-near-universal vendor entities surfaced by the audit pass. Phase 0 vetting (formal vendor-research protocol) would confirm or filter:

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `paas_release_versions` | APP-PAAS-DELIVERY | Heroku "release", Vercel "deployment version", Render "deploy version", Azure App Service "deployment slot version" - distinct from a deployment in that a release names the immutable version; some vendors collapse this into `paas_deployments`, others split |
| `paas_secrets` / `paas_config_vars` | APP-PAAS-RUNTIME | Universal: Heroku config vars, Vercel environment variables, Render environment groups, Fly.io secrets. Possibly an embedded_master on a separate `secrets-mgmt` domain when one exists |
| `paas_log_streams` | APP-PAAS-RUNTIME | Universal: Heroku log drains, Vercel logs, Render logs. Or consumer-only against OBS masters? |
| `paas_custom_domains` | APP-PAAS-RUNTIME | Universal: Heroku custom domains, Vercel domains, Render custom domains, Netlify domains, Fly.io certificates. SSL / TLS cert lifecycle implied |

### Cross-bucket dependencies

- **Bucket 2 B2-S6 depends on B2-S1** (the capability-naming decision lands when modules + capabilities are authored).
- **Bucket 2 B2-S5 depends on B2-S1** (consumer DMDO requires module FK).
- **Bucket 2 B2-S4 (`paas_runtime_instances` lifecycle shape) depends on Bucket 3** (if Phase 0 confirms `paas_log_streams` and `paas_secrets`, they may belong on the same module as `paas_runtime_instances` and inform the workflow-vs-config call for the instances master itself).
- **Bucket 1 B1-S7, B1-S8, B1-S9, B1-S10, B1-S11 all depend on B1-S1.** Standard ordering: M1 (modules + capabilities) first, then DMDO master attribution, then everything else.
- Buckets 1, 2, 3 are otherwise independent of each other and the user can resolve in any order.

### Per-bucket prompts

- **After Bucket 1 surface:** "Fix these now? Reply 'all' (load all 13 in-scope items in sequence: B1-S1 + B1-S12 first, then B1-S4 / B1-S5 / B1-S6, then B1-S7 / B1-S8 / B1-S9 / B1-S10 / B1-S11, then B1-H1), 'just <IDs>', or 'skip'. Note: B1-S2 (catalog UX fields) and B1-S3 / B1-S7 / B1-S8 require Bucket 2 sign-offs before the loader runs, so 'all' triggers the per-bucket review loop in order."
- **After Bucket 2 surface:** "What's your call on each of B2-S1 through B2-S6? I'll wait for your decision per item before acting. For B2-S2 (catalog UX field wording), please supply your exact text (Rule #20). For B2-S3 (pattern flag flips), confirm or rewrite each proposed flip. For B2-S4 (runtime instance lifecycle), pick option (a) load the 5-state machine, or (b) config-shape exemption."
- **After Bucket 3 surface:** "Vet via Phase 0 research (formal vendor-surface enumeration against Heroku / Vercel / Render / Fly.io / Beanstalk / App Service / App Engine / DigitalOcean / Railway / Netlify), or eyeball-mode? If eyeball, name which of `paas_release_versions`, `paas_secrets`, `paas_log_streams`, `paas_custom_domains` ring true; named candidates become Bucket 1 items immediately."

### Report-only follow-ups (owed by other domains)

These items the APP-PAAS audit identified but the fix lives on another domain. They are observations the user can schedule audits for; they do not block APP-PAAS's pass.

- **LCAP B10b owes:** handoff 704 (`extend_app.published` -> APP-PAAS) has NULL `source_domain_module_id` on the LCAP side because LCAP has no modules (per the LCAP audit 2026-05-30; same M1 gap). Re-surfaces when LCAP is re-audited post-M1 fix.
- **KUBE-PLAT B10b owes:** handoff 759 (`container_workload.degraded` -> APP-PAAS) has NULL `source_domain_module_id` on the KUBE-PLAT side because KUBE-PLAT has no modules (catalog cross-check shows KUBE-PLAT in the same M1-hard-fail shape). Re-surfaces when KUBE-PLAT is audited.
- **VSDP B10b owes:** handoff 770 (`software_deployment.completed` -> APP-PAAS) has NULL `source_domain_module_id`. Needs VSDP's module attribution. Re-surfaces when VSDP is audited.
- **LCAP B8 owes:** the structural mirror for handoff 704 (`extend_app.published`). LCAP needs an outbound `data_object_relationships` row `extend_apps deploys_to <paas_master>` once APP-PAAS modules + masters cure on this side (this is also called out in LCAP's audit B1-S14).
- **KUBE-PLAT B8 / B9 owes:** the structural mirror for handoff 759. KUBE-PLAT needs `container_workloads signals <paas_runtime_instances>` once both sides have masters wired.
- **VSDP B8 owes:** structural mirror for handoff 770 (`software_deployments completes <paas_deployments>` or similar).
- **Pre-existing em-dash in `domains.description`:** the U+2014 em-dash between "(low-code)" and "IPAAS (integration)" predates this audit (loaded in an earlier wave) and is not fixed here. Route to the catalog-wide em-dash cleanup sweep.

### Candidates queued to `audits/_missing-domains.md`

The audit surfaced 2 candidate domains that may warrant their own `domains` row pending point-solution-market triage. Both queued via the standard helper:

- **INT-DEV-PLAT** (Internal Developer Platform). Vendor evidence: Backstage, Port, OpsLevel, Cortex, Humanitec. Adjacency: APP-PAAS, KUBE-PLAT, VSDP, ITSM. Candidate capabilities: service catalog, software template scaffolding, golden paths, developer portal, scorecards. The IDP market overlaps APP-PAAS in the "deploy code" workflow but the IDP buyer-shape is "platform-engineering wraps a developer portal AROUND any underlying runtime"; this is genuinely orthogonal to "what runtime do I ship to". Whether IDP passes the point-solution-market test is a triage call.
- **EDGE-RUNTIME** (Edge Runtime and Functions). Vendor evidence: Cloudflare Workers, Fastly Compute, AWS Lambda@Edge, Deno Deploy, Vercel Edge Functions. Adjacency: APP-PAAS, KUBE-PLAT, OBS. Candidate capabilities: edge function deployment, geo-replicated execution, KV store at edge, request middleware, cold-start-free runtime. The edge-runtime market shares "deploy code" surface with APP-PAAS but the buyer evaluation criteria (P99 latency, geo distribution, V8-isolate vs container) are distinct enough to plausibly warrant its own market. Vercel and Netlify straddle both markets, which is part of why the call is tricky.

### Decisions

_(empty until the user reviews)_

### Fixes applied

_(empty until the user approves Bucket 1 items)_

### `domains.notes` pointer (if updated)

_not yet written; will require user-approved wording per Rule #15_

## 2026-05-31, Continuation: B1 technical fixes (residual)

### Scope

Residual-pass over Bucket 1 of the 2026-05-30 audit, applying ONLY items
that are truly technical (deterministic from audit-pre-specified tuples,
no judgment calls, no schema additions). Loader:
[.tmp_deploy/fix_app_paas_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_app_paas_b1_technical_2026_05_31.ts).

### Applied

| ID | Fix | Rows | IDs |
|---|---|---|---|
| B1-S5 | INSERT user-edges (Rule #10) from `users` (748) to APP-PAAS masters | 5 | data_object_relationships 1617 (users owns paas_applications), 1618 (users deploys paas_deployments), 1619 (users triggers paas_build_records), 1620 (users configures paas_addons), 1621 (users manages paas_environments) |
| B1-H1 | INSERT agent_curated APQC tags on cross-domain handoffs | 7 | handoff_processes 412 (754->1262), 413 (755->1304), 414 (756->1265), 415 (757->1299), 416 (758->1939), 417 (798->1313), 418 (704->52) |

Handoff 753 was skipped: an existing `handoff_processes` row (id 295,
process 1311 `Install/configure/upgrade infrastructure components`)
already tags it. The audit's proposed PCF 52 would create a different
tag on the same handoff; user judgment is required to decide whether
to keep, replace, or co-tag, so this stays in the residual queue.

All inserts used `proposal_source='agent_curated'`. `record_status`
defaulted to `new` per Rule #1. No `notes` written (Rule #15).

### Deferred

| ID | Reason |
|---|---|
| B1-S1, B1-S12 | New `domain_modules` + `capabilities` rows. Out of scope per parent prompt's defer list (new entities/modules); also depends on Bucket 2 B2-S1 module-split decision. |
| B1-S2 | Rule #20 catalog_tagline / catalog_description deferred per parent prompt. |
| B1-S3 | Pattern flag flips deferred per parent prompt; Bucket 2 judgment call (B2-S3). |
| B1-S4 | Intra-domain `data_object_relationships` are not user-edges (Rule #10); 7 rows of business-graph relationships need cluster-drafts authoring, not in technical scope. |
| B1-S6 | `data_object_aliases` (~20 rows) not pre-specified as exact tuples in the audit; per parent prompt, no bulk alias inserts without pre-specified tuples. |
| B1-S7 | Lifecycle states blocked behind B1-S1 (need `domain_module_id`) and B2-S4 (config-shape vs workflow decision for `paas_runtime_instances`). |
| B1-S8 | Legacy skill retirement requires new module-anchored system skills first (blocked behind B1-S1). |
| B1-S9 | B10b handoff FK backfill: NO source `domain_modules` exist for APP-PAAS, so `source_domain_module_id` is not derivable from existing modules. Handoff 757 already has `target_domain_module_id=38` set; remaining target backfills also depend on B1-S1. |
| B1-S10 | Cross-domain `data_object_relationships`: out-of-scope (not user-edges); also some target masters unresolved without one-query check per audit. |
| B1-S11 | Intra-domain handoffs blocked behind B1-S1 + B1-S4 + B1-S7. |

### Verification

- Live read confirmed zero pre-existing user-edges across APP-PAAS masters before insert; 5 inserted, idempotency safe on re-run via preflight skip set.
- Live read confirmed zero pre-existing `handoff_processes` rows for handoffs 704, 754, 755, 756, 757, 758, 798 before insert; pre-existing row 295 on handoff 753 caused that single row to be skipped.
- All 7 PCF process IDs verified to exist in `processes` before insert (52, 1262, 1265, 1299, 1304, 1313, 1939).
- All 6 APP-PAAS master IDs verified live (463-468); `users` builtin verified at id 748.

### UI spot-checks

- https://tests.semantius.app/domain_map/data_object_relationships (filter `data_object_id=eq.748`)
- https://tests.semantius.app/domain_map/handoff_processes (filter `proposal_source=eq.agent_curated`)

## 2026-05-31, Audit

### Summary

- Current footprint: 6 masters (`paas_applications` 463, `paas_deployments` 464, `paas_environments` 465, `paas_runtime_instances` 466, `paas_addons` 467, `paas_build_records` 468) under `domain_data_objects` only. 0 `domain_modules`, 0 `domain_module_host_domains`, 0 capabilities, 0 `domain_module_data_objects`. 10 solutions (all `coverage_level=primary`). 2 `business_function_domains` (Platform Engineering owner, IT Operations contributor). 7 trigger_events covering 6 masters, all `event_category=""`. 7 outbound + 3 inbound cross-domain handoffs (10 total). 0 intra-domain handoffs. 5 `users`-edges (1617-1621, from prior continuation). 0 master-master `data_object_relationships`. 0 cross-domain `data_object_relationships`. 0 `data_object_aliases`. 0 `data_object_lifecycle_states`. 1 legacy `domain_id`-anchored system skill (`app-paas-system` id 30) with 6 `query_*` skill_tools (all coverage_tier=platform). 0 mutate/side_effect/compute tools. 10 of 10 cross-domain handoffs carry `handoff_processes` tags (9 agent_curated `record_status=new` from 2026-05-31 residual + handoff 753 pre-existing). 0 roles touch APP-PAAS.
- Bucket 1 (in-scope, agent fixable): 11 items.
- Bucket 2 (surface-for-user, judgment): 6 items.
- Bucket 3 (Phase 0 pending, speculative): 4 items.

### Structural pass bands

- **S band:** zero-row anomalies on `domain_modules` (M1), `capability_domains` (A2), `domain_module_capabilities` (M6 vacuous), `domain_module_data_objects` (B1 module-grain vacuous), `data_object_lifecycle_states` (B12), `data_object_aliases` (B11), intra-domain master-master `data_object_relationships` (B6), cross-domain `data_object_relationships` from APP-PAAS masters (B8 outbound), `roles` touching APP-PAAS (E1 vacuously blocked), `domain_aliases` (A4 alias surface). S2 vacuous (no modules). S3 hard-fail (every master has zero states + zero aliases; 7 events shared across 6 masters; events lack `event_category`).
- **A band:** A1 passes (all 7 metadata fields populated: crud=20, min_org_size, cost_band $$$, certification_required=false, USA TAM 8000 / 2025, business_logic non-empty). A2 hard-fails (zero capabilities). A3 passes (10 solutions, all primary). A4 hard-fails (`catalog_tagline` empty, `catalog_description` empty). A5 skipped.
- **M band:** **M1 / M2 / M4 / M6 hard-fail.** Zero modules; zero capabilities; M2 vacuously satisfied since cap_count<3. M5 / M7 / M8 vacuous on zero modules.
- **B band:** B1 passes (6 masters). B2 passes (all labels populated). B3 passes (all `paas_<noun>` prefixed). B4 hard-fail (every pattern flag false-default; positive re-evaluation pending). B5 vacuously passes (no `embedded_master` rows). **B6 hard-fail** (zero master-master intra-domain edges; only the 5 `users`-edges exist). **B7 partial pass** (5 `users`-edges loaded for paas_applications, paas_deployments, paas_build_records, paas_addons, paas_environments; `paas_runtime_instances` 466 lacks a users-edge but the master is autoscaler-reconciled so this may be acceptable). **B8 hard-fail** (7 outbound handoffs from APP-PAAS masters, zero cross-domain `data_object_relationships` from APP-PAAS masters to target-domain masters). **B9 partial-fail** (7 trigger_events exist; all 7 have empty `event_category`, Rule #13 violation). B9b vacuous (no modules). **B10b hard-fail** (6 of 7 outbound handoffs have NULL both module FKs; handoff 757 has `target_domain_module_id=38` set, NULL source; all 3 inbound handoffs have NULL on both module FKs). **B11 hard-fail** (zero aliases). **B12 hard-fail** (zero lifecycle states).
- **C band:** C1 passes (2 rows, Platform Engineering owner + IT Operations contributor). C2 vacuous.
- **D band:** D1 not exercised.
- **E band:** E1 vacuous (M1 blocks role authoring).
- **F band:** F1 hard-fail-pending (legacy `domain_id`-only system skill id 30 remains; F1 hardens once any module-level system skill exists). F2 hard-fail vacuous on M1. F3 passes against legacy skill (6 `query_*` tools). F4 passes (all 6 tools are `query` with `data_object_id` set). F5 strict_score on legacy skill is 6/6=100% but uncomputable at module granularity until M1 cures. F7 vacuous.
- **H band:** **H1 passes.** All 10 cross-domain handoffs (7 out + 3 in) have `handoff_processes` rows. 9 are `proposal_source=agent_curated`, `record_status=new`; handoff 753 also carries a `proposal_source=agent_curated record_status=new` row (1311, `Install/configure/upgrade infrastructure components` L4). Coverage-quality headline 0 approved (catalog quality still pending review per Rule #1); process-health side-bar 10/10 agent_curated. No deferrals. The 2026-05-30 audit's deferral notes for 759 / 770 are now superseded: 759 tagged 1305 (`Respond to unplanned operational issues` L4), 770 tagged 1262 (`Implement software change/release` L4). The duplicate-tag concern on handoff 753 (audit proposed PCF 52 vs existing 1311) routes to Bucket 2 B2-H1.

### Bucket 1 - In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1/M2/M4/M6 + A2 | Zero `domain_modules`, zero `capabilities`. Proposed 2-module split (APP-PAAS-RUNTIME + APP-PAAS-DELIVERY) + ~5-7 capabilities. Blocked behind B2-S1 module-split decision. | Author 2 `domain_modules` rows + 5-7 capabilities + capability_domains + domain_module_capabilities + 6 `domain_module_data_objects` master rows. |
| B1-S2 | A4 | Empty `catalog_tagline` and `catalog_description` (Rule #20). | Draft both in buyer voice; surface to user; await exact wording per B2-S2 before write. |
| B1-S3 | B4 | All three pattern flags false-default on all 6 masters; positive re-evaluation pending. Candidate flips: `paas_deployments.has_submit_lock=true`, `paas_build_records.has_submit_lock=true`, `paas_addons.has_personal_content=true`. | Surfaced as B2-S3 (user judgment). PATCH after user confirms each flip. |
| B1-S4 | B6 | Zero intra-domain master-master `data_object_relationships`. Minimum coherent edge set of 7 rows (paas_applications has_environments paas_environments; paas_applications has_deployments paas_deployments; paas_applications has_addons paas_addons; paas_deployments produces paas_runtime_instances; paas_deployments consumes paas_build_records; paas_environments hosts paas_runtime_instances; paas_environments scopes paas_deployments). | Author 7 `data_object_relationships` rows via cluster-drafts pattern. Draft block goes through Bucket 1 approval. |
| B1-S6 | B11 | Zero aliases. Strong vendor synonyms exist across all 10 solutions (Heroku app/release/dyno/addon, Vercel project/deployment/preview/edge function, Render service/deploy, Fly.io app/machine/release, Railway service/deployment, Netlify site/deploy/function, AWS Beanstalk application/environment/version, Azure App Service web app/deployment slot/release, Google App Engine service/version/instance). | Draft ~20 alias rows (6 masters x ~3-5 aliases) per Rule #18 (commerce-shaped entity, vendor names allowed); load via cluster-drafts. Pre-specified tuples required per loader-prompt scope. |
| B1-S7 | B12 | Zero lifecycle states. 5 masters with workflow + 1 config-shape candidate. Proposed states: paas_applications (provisioned->active->archived), paas_deployments (queued->building->deploying->succeeded/failed->rolled_back), paas_environments (configured->active->promoted->archived), paas_runtime_instances (B2-S4 decides workflow vs config-shape), paas_addons (provisioning->active->degraded->deprovisioned), paas_build_records (queued->building->tested->ready/failed). `domain_module_id` on each row depends on B1-S1. | Draft state machines (~22-30 rows) and load via focused loader. Sequence behind B1-S1 + B2-S4. |
| B1-S8 | F1/F2 | Legacy `app-paas-system` skill (id 30, `domain_module_id=null`) remains. F2 vacuous-fail until B1-S1 lands; once B1-S1 lands, F1 hardens and the legacy row must be retired. Skill_name uses kebab vs the snake `<module_code_lower>_agent` convention. The 6 `query_*` skill_tools (310-315) re-anchor to the new per-module skills (query_paas_applications/environments/runtime_instances/addons -> APP-PAAS-RUNTIME; query_paas_deployments/build_records -> APP-PAAS-DELIVERY). | After B1-S1: author 2 new module-anchored system skills, move the 6 skill_tools, then DELETE legacy skill 30. Also add mutate + workflow-gate tools per Rule #17 floor. |
| B1-S9 | B10b | All 7 outbound handoffs have NULL `source_domain_module_id`; 6 of 7 also NULL `target_domain_module_id` (handoff 757 carries `target_domain_module_id=38` set already). All 3 inbound (704/759/770) NULL on both. Source-side derivation blocked behind B1-S1. | Single PATCH pass on 7 outbound rows + target_module backfill on 3 inbound rows after B1-S1. Inbound rows also need a consumer DMDO on the receiving APP-PAAS module declaring `lcap_apps` (220, payload of handoff 704), `container_workloads` (450, handoff 759), and `software_deployments` (682, handoff 770). |
| B1-S10 | B8 | 7 outbound handoffs but zero cross-domain `data_object_relationships` from APP-PAAS masters. Proposed verbs: 753 (paas_deployments runs_on container_workloads 450); 754 (paas_deployments records_in software_deployments 682); 757 (paas_deployments opens service_incidents 47); 755/756/758/798 need a one-query check of ITOM/OBS/VSDP/SAM masters before authoring. | Author the 3 fully-resolved rows first; 4 rows defer pending target-domain master verification. |
| B1-S11 | B9b | Vacuous behind M1 + B1-S4. After B1-S1 + B1-S4 + lifecycle states from B1-S7, the cross-module pairs derive: paas_build_records.ready (DELIVERY) -> paas_deployments.queued (DELIVERY) intra-module dropped; paas_deployment.succeeded (DELIVERY) -> paas_runtime_instances (RUNTIME) inter-module = 1 row; paas_environment.promoted (RUNTIME) -> paas_deployments (DELIVERY) inter-module = 1 row. Net 2 intra-domain handoffs. | Author 2 intra-domain `handoffs` rows after B1-S1 + B1-S4 + B1-S7. `integration_pattern: lifecycle_progression`, `friction_level: low`. |
| B1-S13 | B9 | All 7 APP-PAAS trigger_events (818-824) have `event_category=""` violating Rule #13 enum (lifecycle / state_change / threshold / signal). Proposed mapping: 818 (paas_application.created) lifecycle; 819 (paas_deployment.succeeded) state_change; 820 (paas_deployment.failed) state_change; 821 (paas_environment.promoted) state_change; 822 (paas_runtime.scaled) state_change; 823 (paas_addon.provisioned) lifecycle; 824 (paas_build.failed) state_change. Deterministic from Rule #13 vocabulary modulo the lifecycle/state_change split which involves the same kind of judgment as the ATS analogue. | PATCH `trigger_events.event_category` per the mapping above; verify with user before PATCH on the lifecycle/state_change split. |

#### B1-H1 status

H1 passed. 10 of 10 cross-domain handoffs carry `handoff_processes` rows. No new APQC tags proposed in this audit. The 2026-05-30 deferrals on handoffs 759 and 770 are resolved (1305 and 1262 respectively). Quality headline 0 approved; process-health side-bar 10/10 agent_curated.

### Bucket 2 - Surface-for-user (judgment calls)

1. **B2-S1 - Module split + capability shape.** Proposed 2-module split: APP-PAAS-RUNTIME (masters paas_applications, paas_environments, paas_runtime_instances, paas_addons) and APP-PAAS-DELIVERY (masters paas_deployments, paas_build_records). Capability questions: (a) approve the 2-module split, (b) link to existing cross-cutting `LCAP-MANAGED-RUNTIME` (id 333) or author parallel `APP-PAAS-MANAGED-RUNTIME`, (c) is `APP-PAAS-ADDON-MARKETPLACE` worth its own top-level capability or fold into env-mgmt. Independent of Bucket 3.
2. **B2-S2 - Catalog UX field wording (Rule #20).** Marketing voice required (buyer workflow + value). User must supply exact text.
3. **B2-S3 - B4 pattern flag flips.** Proposed flips: paas_deployments.has_submit_lock=true, paas_build_records.has_submit_lock=true, paas_addons.has_personal_content=true. User confirms each.
4. **B2-S4 - paas_runtime_instances lifecycle shape.** Choose: (a) load 5-state machine (starting->running->scaling->draining->stopped) all `requires_permission=false`, or (b) treat as config-shape on a state column (Rule #12 exemption); surface decision in chat, do not write to `notes` (Rule #15).
5. **B2-S5 - Consumer DMDO declarations for inbound payloads.** APP-PAAS-DELIVERY plausibly consumes VSDP `software_deployments` (682); APP-PAAS-RUNTIME plausibly consumes KUBE-PLAT `container_workloads` (450) and LCAP `lcap_apps` (220). For each: declare `consumer + optional` on the receiving module, or accept as domain-level only (no DMDO row). Depends on B1-S1.
6. **B2-H1 - APQC tag duplication on handoff 753.** Handoff 753 (`paas_deployment.succeeded` -> KUBE-PLAT) currently carries 1311 (`Install/configure/upgrade infrastructure components` L4). The 2026-05-30 audit also proposed 52 (`Deploy services/solutions` L2). Decide: keep 1311 only, replace with 52, or co-tag both. Independent.

### Bucket 3 - Phase 0 pending (speculative)

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `paas_release_versions` | APP-PAAS-DELIVERY | Heroku "release", Vercel "deployment version", Render "deploy version", Azure App Service "deployment slot version" |
| `paas_secrets` / `paas_config_vars` | APP-PAAS-RUNTIME | Universal across Heroku, Vercel, Render, Fly.io |
| `paas_log_streams` | APP-PAAS-RUNTIME | Heroku log drains, Vercel logs, Render logs (or consumer-only against OBS masters) |
| `paas_custom_domains` | APP-PAAS-RUNTIME | Heroku, Vercel, Render, Netlify, Fly.io custom domains + TLS cert lifecycle |

### Cross-bucket dependencies

- B2-S5 depends on B1-S1 (consumer DMDO requires module FK).
- B2-S4 may be informed by Bucket 3 (if Phase 0 confirms log_streams / secrets, they may share lifecycle with runtime_instances).
- B1-S7, B1-S8, B1-S9, B1-S10, B1-S11 all depend on B1-S1.

### Report-only follow-ups (owed by other domains)

- **LCAP B10b owes** source_domain_module_id on handoff 704 (NULL because LCAP M1 also fails).
- **KUBE-PLAT B10b owes** source_domain_module_id on handoff 759.
- **VSDP B10b owes** source_domain_module_id on handoff 770.
- **LCAP B8 owes** mirror `lcap_apps deploys_to <paas_master>` after APP-PAAS modules + masters cure.
- **KUBE-PLAT B8 / B9 owes** mirror `container_workloads signals paas_runtime_instances`.
- **VSDP B8 owes** mirror `software_deployments completes paas_deployments`.
- Pre-existing U+2014 em-dash in `domains.description` between "(low-code)" and "IPAAS (integration)" routes to the catalog-wide em-dash sweep.

### Decisions

_(empty until user reviews)_

### Fixes applied

_(empty until user approves Bucket 1 items)_
