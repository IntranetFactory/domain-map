# Embedded-master + necessity backfill — `engineering` cluster

**Cluster scope (12 domains):** KUBE-PLAT (81), APIM (79), APP-PAAS (76), IPAAS (36), LCAP (37), NCDB (134), VSDP (80), TEST-MGMT (8), RPA (38), PROD-MGMT (101), SPM (9), APM (10).

**Status before this draft:** 64 existing `domain_data_objects` rows across 9 of the 12 domains. **VSDP (80), TEST-MGMT (8), RPA (38) have zero rows** — they were never run through Phase B and consequently have no Signal-1 / Signal-1b / Signal-2 footprint at all. That alone is the single biggest gap in this cluster.

This draft is a Phase-2 deep classification per the post-2026-05-22 SKILL.md (new `role='embedded_master'`, new `necessity` enum, demotion path required in `notes`). **Nothing is written to Semantius.**

---

## Section 1 — Existing rows snapshot (per domain)

### SPM (9) — 15 rows. Roles already mixed (4 contributor/consumer, 11 master). Looks healthy on the surface but several "masters" are arguably embedded_master / derived.

| data_object | role | necessity | review verdict |
|---|---|---|---|
| 25 position_demand_forecasts | contributor | required | keep |
| 27 workforce_scenarios | consumer | required | keep |
| 40 financial_scenarios | consumer | required | keep |
| 216 projects | consumer | required | keep (WORK-MGMT-mastered) |
| 243 work_items | consumer | required | keep |
| 245 okr_objectives | master | required | **keep but co-master with other OKR-claimants exists** — note already cites strategic slice |
| 273 portfolios | master | required | keep — SPM canonical |
| 274 strategic_initiatives | master | required | keep |
| 275 roadmap_items | master | required | **review** — PROD-MGMT roadmaps differ, but `roadmap_items` is likely SPM-strategic; PROD-MGMT should be embedded_master/contributor (see Section 2) |
| 276 business_value_assessments | master | required | keep |
| 277 resource_allocations | master | required | keep — though PSA (68) writes its own resource_allocations; consider rename to `portfolio_resource_allocations` later |
| 278 demand_intake_requests | master | required | keep |
| 279 scenario_plans | master | required | keep (composed of EPM+SWP scenarios) |
| 280 dependency_chains | master | required | keep |
| 281 benefits_tracking_records | master | required | keep |

### APM (10) — 11 rows.

| data_object | role | necessity | review verdict |
|---|---|---|---|
| 57 software_titles | consumer | required | keep |
| 61 saas_applications | consumer | required | keep |
| 76 configuration_items | consumer | required | keep |
| 232 data_products | consumer | required | keep |
| 248 business_capability_maps | master | required | keep (co-master with BPA per note) |
| 267 enterprise_applications | master | required | keep — **APM is canonical**, this is the cluster flagship for Signal-1 embedded_master fan-out |
| 268 application_costs | master | required | keep |
| 269 technology_platforms | master | required | keep |
| 270 technology_fit_assessments | master | required | keep |
| 271 application_interfaces | master | required | keep |
| 272 application_value_scores | master | required | keep — but this is genuinely a **derived** projection over `enterprise_applications` (TIME score, business-fit score) — see Section 3 |

### KUBE-PLAT (81) — 8 rows, all `master`/`required`, all "Phase-B Lite batch 1 — agent-derived" with empty slice notes. **Every row needs a real note (anti-pattern: empty notes on multi-master-eligible rows).** No embedded_master / consumer rows exist at all → KUBE-PLAT is currently a Signal-1 island.

| data_object | role | review verdict |
|---|---|---|
| 448 kubernetes_clusters | master | keep — KUBE-PLAT canonical, add slice note |
| 449 cluster_node_pools | master | keep |
| 450 container_workloads | master | keep, but **container_workloads is a runtime manifestation of an enterprise_application** — add embedded_master link to 267 (see Section 2) |
| 451 helm_releases | master | keep |
| 452 service_meshes | master | keep |
| 453 operator_installations | master | keep |
| 454 platform_pipelines | master | keep — note: platform_pipelines is the KUBE-PLAT slice; VSDP `delivery_pipelines` (MISSING from catalog, see Section 6) is the VSDP-side artifact |
| 455 container_registries | master | keep |

### APIM (79) — 7 rows, all `master`/`required`, all "Phase-B Lite batch 1" with empty slice notes. Same issue as KUBE-PLAT.

| data_object | role | review verdict |
|---|---|---|
| 456 api_versions | master | keep |
| 457 api_specifications | master | keep |
| 458 api_deployments | master | keep |
| 459 api_policies | master | keep |
| 460 api_usage_metrics | master | keep |
| 461 api_gateways | master | keep |
| 462 api_consumers | master | keep |

### APP-PAAS (76) — 6 rows, all `master`/`required`, all "Phase-B Lite batch 1" with empty slice notes. Same pattern.

| data_object | role | review verdict |
|---|---|---|
| 463 paas_applications | master | keep — but `paas_applications` is the runtime view of an `enterprise_application` → embedded_master link to 267 needed (Section 2) |
| 464 paas_deployments | master | keep |
| 465 paas_environments | master | keep |
| 466 paas_runtime_instances | master | keep |
| 467 paas_addons | master | keep |
| 468 paas_build_records | master | keep |

### IPAAS (36) — 6 rows, all `master`/`required`, all "Phase-B Lite batch 1".

| data_object | role | review verdict |
|---|---|---|
| 469 integration_recipes | master | keep |
| 470 integration_runs | master | keep |
| 471 connectors | master | keep |
| 472 webhook_subscriptions | master | keep |
| 473 integration_triggers | master | keep |
| 474 integration_data_mappings | master | keep |

### LCAP (37) — 3 rows, all `master`/`required`, all with **empty notes**.

| data_object | role | review verdict |
|---|---|---|
| 220 extend_apps | master | keep — LCAP canonical for citizen-developed/extension apps. Add slice note. Apps built on LCAP are still tracked as `enterprise_applications` in APM → consider embedded_master link from LCAP to 267 (Section 2). |
| 221 extend_business_objects | master | keep |
| 222 extend_workflows | master | keep |

### NCDB (134) — 2 rows. Notes are good.

| data_object | role | review verdict |
|---|---|---|
| 241 nocode_bases | master | keep |
| 242 nocode_record_definitions | master | keep |

### PROD-MGMT (101) — 9 rows.

| data_object | role | review verdict |
|---|---|---|
| 249 value_streams | contributor | keep — BPA (136) masters Lean view; PROD-MGMT contributes DevOps/Agile flow-metric slice |
| 402 product_lines | master | keep — empty notes, fix |
| 403 product_features | master | keep — empty notes |
| 404 product_releases | master | keep — empty notes |
| 405 product_roadmaps | master | keep — empty notes; SPM `roadmap_items` (275) is the strategic slice, PROD-MGMT roadmaps are product-level — these are distinct artefacts (good) but cross-link needed (see Section 2) |
| 406 feature_requests | master | keep |
| 407 customer_feedback_items | master | **review** — this is contested ownership: CSM (30) typically masters customer voice; PROD-MGMT mastering feedback is defensible (product-side ingestion: Productboard, Aha!, Pendo) but the **canonical authority is debatable**. Recommend keeping PROD-MGMT as master + flagging CSM co-master in Section 4. |
| 408 product_metrics | master | keep |
| 409 beta_programs | master | keep |

### VSDP (80), TEST-MGMT (8), RPA (38) — **0 rows. Full Phase-B run required.** See Section 6 for the missing data_objects that block this.

---

## Section 2 — NEW rows to add

Reasoning per row is included. Roles encoded as `M`=master, `EM`=embedded_master, `C`=contributor, `K`=consumer, `D`=derived. Necessity `R`/`O` for required/optional.

### A. `enterprise_applications` (267) — APM canonical. Add embedded_master rows from every domain that runs a runtime-side view of an app.

The user prompt is explicit: "KUBE-PLAT/APP-PAAS/APIM/LCAP/VSDP all run apps, but APM owns the cross-portfolio view; the platform domains hold their own runtime-side `applications` records → embedded_master deferring to APM."

| domain | role | necess. | reasoning |
|---|---|---|---|
| KUBE-PLAT (81) | EM | R | KUBE-PLAT holds the *runtime workload* view of an enterprise application (container_workloads/helm_releases ARE the deployed form of an enterprise_application). Standalone deployment has no APM; the cluster operator's namespace + label conventions act as the local app-of-record. Demotion path: when APM is present, runtime workloads cross-reference enterprise_applications by app_id label and APM is authoritative for portfolio metadata. |
| APP-PAAS (76) | EM | R | `paas_applications` IS the platform's local app entity (Heroku app, Cloud Foundry org/space app). Standalone PaaS deployments have no separate APM. Demotion path: paas_applications.app_id ↔ enterprise_applications.id when APM is integrated. |
| APIM (79) | EM | O | APIM's `api_consumers` and producer-side metadata reference owning applications. Many APIM deployments use a free-text app field with no app registry — hence `optional`: the embedding is real but many APIM deployments skip it. Demotion path: api_consumers.application_id → enterprise_applications when APM exists. |
| LCAP (37) | EM | R | LCAP's `extend_apps` ARE applications from a portfolio-management perspective (OutSystems apps, Mendix apps appear in any APM rationalisation exercise). Standalone LCAP shop = LCAP is the only app catalog. Demotion: extend_apps surface as enterprise_applications in APM-integrated deployments. |
| VSDP (80) | EM | R | VSDP defines `applications` to associate repositories/pipelines with the deployable unit (GitLab's "application", Harness's "service"). Standalone VSDP holds the local app entity. Demotion: VSDP applications reconcile to enterprise_applications when APM is integrated. (Cannot be loaded until VSDP's own data_objects exist — see Section 6.) |
| FINOPS (52)* | (already C/derived elsewhere) | — | not in scope — listed for context |

\* Existing FINOPS-style cost rows are already on `application_costs`/`saas_applications`, not enterprise_applications directly.

### B. `applications` (id 4) — this is ATS job-applications, NOT runtime apps. **Do not add engineering rows here.** Anti-pattern guard: an analyst seeing the bare name "applications" might be tempted to attach platform domains to it. The correct target for runtime apps is `enterprise_applications` (267).

### C. `configuration_items` (76) — CMDB canonical. Add consumer/embedded_master rows from platform domains that materially read CI data.

| domain | role | necess. | reasoning |
|---|---|---|---|
| KUBE-PLAT (81) | EM | O | KUBE-PLAT holds its own resource inventory (clusters, namespaces, pods are first-class). In CMDB-integrated shops these surface as CIs; standalone they don't. Many K8s shops skip CMDB integration entirely → `optional`. Demotion: cluster/workload records flow to CMDB as CIs when CMDB is integrated. |
| APP-PAAS (76) | EM | O | Same shape — PaaS apps/dynos/instances surface as CIs when CMDB is present, skipped otherwise. |
| APM (10) | K | R | Already exists (row 470). Keep. |

### D. `business_capability_maps` (248) — APM master, BPA co-master.

| domain | role | necess. | reasoning |
|---|---|---|---|
| SPM (9) | K | R | SPM rolls capabilities up to strategic portfolio scoring. Read-only — does not author capabilities. (Optional argument: some SPM tools embedded_master capabilities when no EA tool exists; making this `O` is defensible. Recommend `K + R` for the common case.) |

### E. `enterprise_applications` (267) — additional consumer rows for analytics-side domains.

| domain | role | necess. | reasoning |
|---|---|---|---|
| SPM (9) | K | R | Portfolio decisions explicitly reference applications (rationalisation, modernisation candidates). Required for SPM-portfolio scoring workflow. |

### F. `application_value_scores` (272) — currently APM `master`. **Re-classify as `derived`** (see Section 3). No NEW row needed; this is a CHANGE.

### G. `okr_objectives` (245) — SPM master. Add cross-cluster consumer rows.

| domain | role | necess. | reasoning |
|---|---|---|---|
| PROD-MGMT (101) | K | O | Product teams reference org-OKRs to align roadmap. Optional because many PROD-MGMT deployments run their own OKR tool (Productboard objectives) and never connect to SPM's. |

### H. `roadmap_items` (275) — SPM master. PROD-MGMT relationship.

The existing SPM row notes: "Strategic / portfolio roadmap items; PROD-MGMT consumes for product-roadmap." But there's no PROD-MGMT row recording the consumption. Add:

| domain | role | necess. | reasoning |
|---|---|---|---|
| PROD-MGMT (101) | K | O | PROD-MGMT's own `product_roadmaps` (405) is the product-level artefact; reads strategic roadmap_items for alignment. Optional because many PROD-MGMT shops do not integrate with SPM. |

### I. `customer_feedback_items` (407) — PROD-MGMT master. Add consumer rows.

| domain | role | necess. | reasoning |
|---|---|---|---|
| CSM (30)* | C | R | CSM is the field-collection source (success-manager call notes, tickets escalated as feedback). Contributor — writes voice-of-customer notes into the product-feedback hopper. CSM-side row goes in the customer cluster's draft, not here, but flagging the dependency. (CROSS-CLUSTER — leave to customer-cluster analyst.) |

(See Section 4 boundary note on customer-feedback ownership.)

### J. `opportunities` (100) — CRM master. Add cross-cluster consumer for PROD-MGMT.

| domain | role | necess. | reasoning |
|---|---|---|---|
| PROD-MGMT (101) | K | O | Some PROD-MGMT shops feed `opportunities` (deal-driven feature requests) into prioritisation. Optional — many B2C products never consume CRM opps; many B2B PMs absolutely do. Cross-cluster — flag for customer-cluster review. |

### K. `customers` (97) — CRM/CSM/SUB-MGMT/CDP multi-master. PROD-MGMT:

| domain | role | necess. | reasoning |
|---|---|---|---|
| PROD-MGMT (101) | K | O | Reads customer profiles when persona-segmenting feature requests / beta-program participants. Optional — many PMs prefer anonymised cohorts. Cross-cluster — flag. |

### L. VSDP (80) — full Phase-B set BLOCKED on missing data_objects (Section 6).

Once `repositories`, `commits`, `pull_requests`, `code_reviews`, `delivery_pipelines`, `builds`, `deployments`, `releases`, `environments` exist (or whatever subset the analyst confirms), proposed rows:

| data_object | role | necess. | reasoning |
|---|---|---|---|
| repositories (MISSING) | M | R | VSDP canonical — git repo registry, branch policies, repo metadata. |
| commits (MISSING) | M | R | Commits anchored in VSDP repos. |
| pull_requests (MISSING) | M | R | VSDP-canonical PR/MR lifecycle. |
| delivery_pipelines (MISSING) | M | R | CI/CD pipelines (VSDP is the value-stream orchestrator). |
| builds (MISSING) | M | R | Build records. |
| deployments (MISSING) | M | R | Deployment records (distinct from APP-PAAS `paas_deployments` which is PaaS-internal). |
| releases (MISSING) | M | R | Release records. |
| environments (MISSING) | M | R | Environment registry (dev/stage/prod logical envs that pipelines target). |
| 243 work_items | K | R | VSDP pulls work_items (issues/stories) from WORK-MGMT to associate with commits/PRs. Required — value-stream traceability hinges on it. |
| 267 enterprise_applications | EM | R | See section A. |
| 76 configuration_items | EM | O | Same shape as KUBE-PLAT — runtime app instances may surface as CIs. |

### M. TEST-MGMT (8) — BLOCKED on missing `test_cases`, `test_plans`, `test_runs`, `defects` data_objects (Section 6).

Once present:

| data_object | role | necess. | reasoning |
|---|---|---|---|
| test_cases (MISSING) | M | R | TEST-MGMT canonical. |
| test_plans (MISSING) | M | R | TEST-MGMT canonical. |
| test_runs (MISSING) | M | R | TEST-MGMT canonical. |
| defects (MISSING) | M | R | Defect/bug tracking artefact — note: some shops put bugs in WORK-MGMT (`work_items`) instead. Recommend defects as TEST-MGMT-mastered with WORK-MGMT contributor when integrated. |
| 243 work_items | K | O | TEST-MGMT pulls user stories from WORK-MGMT when integrated; many shops keep test-mgmt fully isolated. Optional per user-prompt example: "TEST-MGMT might or might not integrate with VSDP work_items." |
| 267 enterprise_applications | K | R | Tests target an application — required. |
| repositories (MISSING) | K | O | When tests are stored in the codebase, TEST-MGMT references repos; legacy TEST-MGMT (HP ALM / Tricentis) does not. |

### N. RPA (38) — BLOCKED on missing `automation_bots`, `bot_runs` data_objects (Section 6).

Once present:

| data_object | role | necess. | reasoning |
|---|---|---|---|
| automation_bots (MISSING) | M | R | RPA canonical — bot registry, design-time artefacts. |
| bot_runs (MISSING) | M | R | RPA canonical — execution log per bot. |
| 31 employees | K | O | When attended automations run under a user's session, RPA references the employee. Optional — unattended bots don't need this. (User prompt: "RPA might or might not consume CRM/ERP data — yes for ops bots, no for standalone IT automation.") |
| 97 customers | K | O | Customer-data automations (data-entry bots into CRM). Optional. |
| 76 configuration_items | EM | O | RPA bots are themselves CIs in CMDB-integrated shops. |
| 267 enterprise_applications | K | R | Bots automate against applications — required (an RPA bot without a target app is meaningless). |

---

## Section 3 — CHANGES to existing rows

### Demotions `master` → `embedded_master`

None within engineering cluster's *currently-loaded* rows. The standalone-vs-holistic frame applies most strongly to `enterprise_applications` (which the engineering domains do not currently link to at all — this is a NEW-row issue, not a demotion issue). KUBE-PLAT/APP-PAAS/APIM/LCAP each remain the canonical master of their own native artefacts (kubernetes_clusters, paas_deployments, api_specifications, extend_apps).

### Demotions `master` → `derived`

| row | data_object | from | to | reasoning |
|---|---|---|---|---|
| 467 | 272 application_value_scores | M/R | **D/R** | Application value scores are TIME-scoring and business-fit projections computed *over* enterprise_applications + application_costs + technology_fit_assessments. APM produces them but they are by definition a derived analytic, not an authored artefact. Aligns with SKILL.md: "APM itself produces app-portfolio scores… some rows likely derived." |

### `necessity` flips `required` → `optional`

| row | data_object | reasoning |
|---|---|---|
| 481 | SPM↔40 financial_scenarios (K/R) | **Keep required** — SPM scenario_plans (279) branch EPM financial_scenarios; you cannot run portfolio scenario planning without them. No flip. |
| 484 | SPM↔216 projects (K/R) | **Keep required** — portfolio rollups depend on projects. No flip. |

Candidates that look like they should flip but on review stay `required`. **Only these proposed flips:**

| row | data_object | from | to | reasoning |
|---|---|---|---|---|
| 482 | SPM↔27 workforce_scenarios (K/R) | R | **O** | Many SPM tools do strategic scenario modelling without an SWP integration (Planview's portfolio scenarios can run on internal headcount fields). The relationship is valuable but not load-bearing for the SPM core workflow. |
| 469 | APM↔57 software_titles (K/R) | R | **O** | APM-without-SAM is a real deployment (LeanIX standalone). Software-title visibility enriches APM but is not load-bearing for the portfolio. |
| 471 | APM↔232 data_products (K/R) | R | **O** | APM rationalising data products is a newer pattern; older APM deployments ignore data_products entirely. |

### Slice-note fills

**24 existing rows have empty `notes`** — these are anti-pattern hits per SKILL.md ("Filling `domain_data_objects.notes` with nothing on multi-master or embedded_master rows" and the related rule that ALL Phase-B Lite batch-1 rows have generic agent-derived placeholders rather than real slice descriptions). Recommend a follow-up pass to populate notes per row. The most important ones (where multi-master / embedded_master fan-out makes slice-ownership ambiguous):

- APIM rows 705–711 (api_versions, api_specifications, api_deployments, api_policies, api_usage_metrics, api_gateways, api_consumers): each needs a one-liner.
- KUBE-PLAT rows 697–704: same.
- APP-PAAS rows 712–717: same.
- IPAAS rows 718–723: same.
- LCAP rows 359–361: same.
- PROD-MGMT rows 651–658: same.

Not blocking the embedded_master backfill but should be addressed in the same wave.

---

## Section 4 — Boundary observations (cross-cluster authority sharing)

1. **`enterprise_applications` (267) is the cluster's flagship Signal-1b candidate.** Once embedded_master rows from KUBE-PLAT, APP-PAAS, APIM, LCAP, VSDP are loaded, this data_object will have 1 canonical master (APM) + 4-5 embedded_masters → high silos signal, matching the "many point solutions would also hold this record locally" prototype from SKILL.md.

2. **`configuration_items` (76) extends into the engineering cluster.** It's already an IT-ops cluster flagship; engineering platform domains (KUBE-PLAT, APP-PAAS, plus RPA's bots) materially write/contribute to it in CMDB-integrated deployments. These should be optional embedded_master, not required — most engineering platform deployments today bypass CMDB.

3. **`customer_feedback_items` (407) sits at the engineering↔customer cluster boundary.** PROD-MGMT currently masters it; CSM (30, customer cluster) is the field-collection source. This deserves explicit cross-cluster co-master treatment: PROD-MGMT masters the prioritisation/triage slice (Productboard/Aha! lens), CSM masters the field-capture slice (Gainsight call notes, ticket escalations). Flag for customer-cluster analyst — do NOT add the CSM row from this draft.

4. **`opportunities` (100), `customers` (97), `okr_objectives` (245)** all cross from customer/strategy clusters into PROD-MGMT as optional consumer reads. None of these are PROD-MGMT-mastered; the engineering cluster's role is purely consumer. Consistent with PROD-MGMT being a bridge domain.

5. **`value_streams` (249) co-mastership** — BPA (Lean view) and PROD-MGMT (DevOps/Agile view) is already modelled (row 437) and is a good Signal-1 example. No change.

6. **VSDP-vs-APP-PAAS overlap** — VSDP `delivery_pipelines` (missing) and APP-PAAS `paas_build_records` (468) describe overlapping concepts. When both are loaded, expect a contributor relationship: PaaS build records contribute to the VSDP pipeline-run view. Worth modelling explicitly once VSDP's data_objects exist.

7. **KUBE-PLAT vs APP-PAAS** — both can run an `enterprise_application`. In an organisation that runs both (rare but real: K8s for stateful workloads, Cloud Foundry / Heroku for stateless web apps), one `enterprise_applications` row in APM can have embedded_master copies in BOTH KUBE-PLAT and APP-PAAS. The schema allows this (`embedded_master` is many-per-data_object); the runtime is not multi-master in conflict — they're describing different deployment targets. Acceptable.

---

## Section 5 — Other observations / patterns

- **The Phase-B Lite batch 1 rows (rows 651–658, 697–723) dominate the engineering-cluster footprint and ALL have placeholder notes.** This is mechanical drift, not classification drift — the rows are correctly `master` for the most part, but the notes do not surface the slice ownership the catalog needs. Recommend treating note-population as a sibling task to the embedded_master backfill, executed in the same load wave.

- **APM has the strongest Signal-1 candidacy in the cluster** once `enterprise_applications` embedded_masters are loaded. Pre-backfill: 1 canonical master, 0 embedded_masters. Post-backfill: 1 canonical + ~4-5 embedded → Signal-1b score 5-6, integration-burden top decile.

- **KUBE-PLAT and APP-PAAS are 100% master-only islands today** (8 / 6 rows respectively, all master). Post-backfill they'll have 1-2 embedded_master + 1 optional embedded_master rows pointing at APM/CMDB. Still master-heavy but no longer islands.

- **SPM is healthier** — already has 4 consumer rows + 1 contributor. Adding `business_capability_maps` consumer + `enterprise_applications` consumer rounds out its analytical-tier shape. SPM is correctly behaving as a "leadership-layer / aggregation-tier domain" per SKILL.md.

- **APM is on the edge of being a leadership-layer domain that masters nothing of its own** (per SKILL.md: REV-INTEL / EPM / SALES-PERF pattern). It *does* master enterprise_applications and related — but `application_value_scores` is genuinely derived, and `application_costs` is arguably derived too (composed from FINOPS + SMP + AP-AUTO inputs). Worth re-examining in a follow-up pass whether more APM rows should be `derived` rather than `master`.

---

## Section 6 — Missing data_objects (BLOCKERS)

The following data_objects do NOT exist in the catalog. They block VSDP, TEST-MGMT, and RPA Phase-B loads entirely, and block several engineering-cluster embedded_master rows.

### VSDP-blocking

| candidate name | display | rationale | scope-qualified? |
|---|---|---|---|
| `repositories` | Repository | Git/SCM repo registry. Anchors commits, PRs, branches. | OK — distinct from any other domain's repo concept (no collisions). |
| `commits` | Commit | Git commit. Anchored in repository. | OK. |
| `pull_requests` | Pull Request | PR/MR lifecycle. | OK. |
| `code_reviews` | Code Review | Optional — could collapse into PR comments. Recommend skipping unless analyst confirms enough vendors model it as a first-class concept. | OK |
| `delivery_pipelines` | Delivery Pipeline | **scope-qualified naming critical** — already collides with `data_pipelines` (227, DI cluster) and `platform_pipelines` (454, KUBE-PLAT). `delivery_pipelines` or `cicd_pipelines` is the safe name; bare `pipelines` would be ambiguous. |
| `pipeline_runs` | Pipeline Run | **already exists (id 434)** but owned by domain 89 (likely DI / DCG / data cluster). Whether the same row can serve VSDP CI/CD pipeline runs OR whether VSDP needs its own `delivery_pipeline_runs` is a Section-7 open question. |
| `builds` | Build | CI build artefact. Distinct from APP-PAAS `paas_build_records` (PaaS-specific). |
| `deployments` | Deployment | CD deployment record. Distinct from APP-PAAS `paas_deployments`, KUBE-PLAT `container_workloads`, APIM `api_deployments`. |
| `releases` | Release | Semantic release artefact (tag → packaged build → released). Distinct from KUBE-PLAT `helm_releases` (operator-flavoured) and HCMS `content_releases` (133, content). |
| `environments` | Environment | Logical environment (dev/stage/prod) that pipelines deploy to. Distinct from KUBE-PLAT `kubernetes_clusters` (physical), APP-PAAS `paas_environments` (PaaS-specific), HCMS `content_environments` (content). Likely best scope-qualified as `delivery_environments` to avoid collision. |

### TEST-MGMT-blocking

| candidate name | display | rationale |
|---|---|---|
| `test_cases` | Test Case | TEST-MGMT canonical. |
| `test_plans` | Test Plan | TEST-MGMT canonical. |
| `test_runs` / `test_executions` | Test Run | TEST-MGMT canonical — pick one name. Recommend `test_runs` for symmetry with existing pattern (`pipeline_runs`, `integration_runs`, `bot_runs`). |
| `defects` | Defect | OPTIONAL — some shops use WORK-MGMT `work_items` with type=bug; others use a dedicated defects table. Whether `defects` is its own data_object or a WORK-MGMT slice is an open question. |

### RPA-blocking

| candidate name | display | rationale |
|---|---|---|
| `automation_bots` | Automation Bot | RPA canonical — distinct from existing `automation_scripts` (225, RMM/IT-automation). Scope-qualify clearly: `automation_scripts` is operational-scripting (Ansible, PowerShell); `automation_bots` is RPA (UiPath, Automation Anywhere, Blue Prism). Both data_objects should coexist. |
| `bot_runs` | Bot Run | RPA-canonical execution log. |

### Cross-cluster note

- `services` (microservices) — NOT proposed for now. Microservice catalogues (Backstage's component catalog) blur with `service_catalog_items` (52, ITSM-mastered) and `enterprise_applications`. Recommend deferring until a clear engineering-side ownership pattern emerges.
- `features` (standalone) — NOT proposed. `product_features` (403) covers PROD-MGMT's needs; a bare `features` would invite collision.
- `users` (engineering-developer-as-distinct-from-employee) — NOT proposed. Existing `employees` (31, HCM master) + IGA's identity slice cover developer identity. RPA's edge case of attended-bot-runs-as-user can use `employees`.

---

## Section 7 — Open questions for human review

1. **Should `pipeline_runs` (434) be repurposed for VSDP CI/CD runs, or should VSDP get its own `delivery_pipeline_runs`?** Current owner is domain 89. Need to confirm 89's slice before reusing. Recommendation: create `delivery_pipeline_runs` distinct from data-pipeline runs, even though it adds a row.

2. **Is `application_value_scores` (272) demotion master→derived correct?** This re-classifies one APM row. Alternative: keep as master but add a parallel `derived` row from APM (semantically odd — same domain in two roles). Recommendation: demote to `derived`.

3. **Is `customer_feedback_items` (407) correctly PROD-MGMT-mastered, or should it be co-mastered with CSM?** Affects both clusters. Defer to customer-cluster analyst's pass; placeholder retained as PROD-MGMT-master here.

4. **`extend_apps` (220) → embedded_master against `enterprise_applications` (267)** — is the catalog comfortable claiming LCAP-built apps are *the same thing* as enterprise-application portfolio items? Most APM tools (LeanIX, Ardoq) treat them as such; some shops insist LCAP apps are a separate "low-code estate." Recommendation: load embedded_master + required with a note explaining the equivalence.

5. **TEST-MGMT `defects` vs WORK-MGMT `work_items`** — should `defects` be a separate data_object, or modelled as a TEST-MGMT contributor row on `work_items`? Recommendation: separate data_object — vendor ecosystems (Tricentis qTest, Xray, TestRail) treat defects as first-class.

6. **RPA's optional `customers` (97) consumer row** — does the catalog want to track that automations sometimes touch CRM, or is this too granular? The `optional` necessity already implies "many deployments skip" — leaving it in surfaces the platform-vs-silos signal correctly.

7. **Should KUBE-PLAT have an embedded_master row on `configuration_items` (76) as `O` or skip it entirely?** Argument for skipping: most modern K8s shops bypass CMDB, treating K8s native catalogue as authoritative. Argument for including with `optional`: catalog accuracy demands surfacing the relationship. Recommendation: include with `optional`.

8. **APP-PAAS `paas_build_records` (468) vs hypothetical VSDP `builds`** — overlap is real. Should one of them become a contributor on the other? Defer until VSDP `builds` is loaded.

9. **SPM `resource_allocations` (277)** — collides semantically with PSA's resource staffing concept. Currently both domains use this name; PSA has not been audited here. Watch for collision when PSA cluster runs through the same exercise. Possible future rename to `portfolio_resource_allocations`.

10. **Note-population task** — should the 24 placeholder notes be addressed in the same load wave as the embedded_master backfill, or as a separate cleanup pass? Recommendation: same wave — drafting a one-line slice description per row is cheap and consistent with SKILL.md anti-pattern guidance.

---

## Summary counts

- **Existing rows reviewed:** 64 (across SPM=15, APM=11, KUBE-PLAT=8, APIM=7, APP-PAAS=6, IPAAS=6, LCAP=3, NCDB=2, PROD-MGMT=9; VSDP/TEST-MGMT/RPA=0).
- **NEW rows proposed (loadable now):** ~10 (enterprise_applications embedded_masters from KUBE-PLAT/APP-PAAS/APIM/LCAP = 4; configuration_items embedded_masters from KUBE-PLAT/APP-PAAS = 2; business_capability_maps consumer from SPM = 1; enterprise_applications consumer from SPM = 1; okr_objectives consumer from PROD-MGMT = 1; roadmap_items consumer from PROD-MGMT = 1).
- **NEW rows proposed (BLOCKED by missing data_objects):** ~15-20 (VSDP=~11, TEST-MGMT=~6, RPA=~6).
- **CHANGES — role demotions:** 1 (APM↔application_value_scores: master → derived).
- **CHANGES — necessity flips R→O:** 3 (SPM↔workforce_scenarios, APM↔software_titles, APM↔data_products).
- **Anti-pattern note-fills needed:** 24 rows with empty / Phase-B-Lite-placeholder notes.
- **Missing data_objects (BLOCKERS):** 14 (10 VSDP, 4 TEST-MGMT) + 2 RPA = ~16 candidate data_objects to create before VSDP/TEST-MGMT/RPA can be loaded.
- **Cross-cluster handoffs flagged for other analysts:** 3 (CSM↔customer_feedback_items, CRM↔opportunities→PROD-MGMT, customers→PROD-MGMT).
