# APIM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 `domain_modules`, 0 capabilities, 0 regulations, 7 masters in legacy `domain_data_objects` rollup (`api_versions` 456, `api_specifications` 457, `api_deployments` 458, `api_policies` 459, `api_usage_metrics` 460, `api_gateways` 461, `api_consumers` 462). 0 solutions linked. 7 outbound cross-domain handoffs (targets: VSDP, IPAAS, OBS, SUB-MGMT, TEST-MGMT, GRC, IGA) and 1 inbound (IPAAS). 1 legacy domain-level system skill (`apim-system`, id 29) with 7 `skill_tools` rows, all `query` tools at `coverage_tier='platform'`; strict Semantius score 7/7 = 100% but the skill is `domain_id`-only (`domain_module_id` NULL), so F1 carries it as a transitional row. 2 `business_function_domains` rows (Platform Engineering owner, IT Operations contributor). 1 cross-domain `data_object_relationships` row touching APIM masters (`test_cases is_triggered_by api_specifications`, inbound from TEST-MGMT). Zero intra-APIM edges. Zero `users` edges. Zero `data_object_lifecycle_states`. Zero `data_object_aliases`. 10 `trigger_events` on APIM masters (ids 808 to 817), all with `event_category=''` (Rule #13 violation). 1 cross-module DMDO consumer row (`IGA-AUTO-PROVISIONING` module 148, role consumer, necessity optional, on `api_consumers`). 0 `handoff_processes` tags across all 8 cross-domain handoffs.
- **Vendor-surface basis:** Apigee (Google), Kong (Kong Konnect), MuleSoft Anypiece (Salesforce), Azure API Management, AWS API Gateway, IBM API Connect, Tyk, WSO2 API Manager, Postman API Platform. No regulated-market compliance specialist anchor (APIM is not a regulation-mandated market the way ATS is for FCRA), but API Security adjacency (Salt, Noname, Traceable, Wallarm, 42Crunch) sits next to it and may warrant a separate domain (queued).
- **Bucket 1 (in-scope, agent fixable):** 15 items.
- **Bucket 2 (surface-for-user, judgment):** 3 items.
- **Bucket 3 (Phase 0 pending, speculative):** 1 item.

**Neighbor discovery** (auto-derived from handoffs, cross-domain DMDOs, and `data_object_relationships`, ranked by edge weight):

| Neighbor | Out | In | Cross-DMDO touching APIM masters | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| IPAAS | 1 | 1 | 0 | 0 | 2 | Lightweight |
| IGA | 1 | 0 | 1 (`IGA-AUTO-PROVISIONING` consumer on `api_consumers`) | 0 | 2 | Lightweight |
| TEST-MGMT | 1 | 0 | 0 | 1 (`test_cases is_triggered_by api_specifications`) | 2 | Lightweight |
| VSDP | 1 | 0 | 0 | 0 | 1 | Lightweight |
| OBS | 1 | 0 | 0 | 0 | 1 | Lightweight |
| SUB-MGMT | 1 | 0 | 0 | 0 | 1 | Lightweight |
| GRC | 1 | 0 | 0 | 0 | 1 | Lightweight |

No neighbor reaches edge weight 3, so every neighbor gets a one-line lightweight summary in the per-neighbor section below; no full 5-section pairwise diff is dispatched in this run.

The structural M-band is a complete blocker: APIM has zero `domain_modules`, so M1 hard-fails, which collapses M2 / M4 / M5 / M6, F2 / F3 / F5, E1 to E6, B9b, and B10b-source-side into vacuous-pass-pending-M1. Every Phase A / Phase M / Phase E deliverable for this domain is missing or pending the module set landing first. The legacy `domain_data_objects` rollup carries the 7 masters but no module owns them, so the IGA consumer DMDO (`IGA-AUTO-PROVISIONING` on `api_consumers`) is the only `domain_module_data_objects` row that references APIM masters at all, and that row is from the consumer side, not from APIM.

H1 fails hard: 0 of 8 cross-domain handoffs (0%) carry any `handoff_processes` row, far below the 50% to 80% volume target. The volume target for this audit is 4 to 6 new `agent_curated` rows.

B9 event_category is empty on every APIM trigger event (Rule #13 violation, the enum requires one of `lifecycle / state_change / threshold / signal`). B10b NULL `source_domain_module_id` is the rule on every outbound, vacuous until M1 lands. The single non-NULL `target_domain_module_id` on the catalog is handoff 751 (`api_consumer.revoked` to IGA), where the IGA side already wired up `IGA-AUTO-PROVISIONING` (148); every other handoff has NULL on both module FKs.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail, blocker)** | APIM has **zero `domain_modules` rows** (neither as `domain_id=79` primary host nor via `domain_module_host_domains`). Rule #14 makes this an audit blocker. Every downstream M / F / E check is vacuously pending; the legacy `domain_data_objects` rollup carries 7 masters but no module owns them. `IGA-AUTO-PROVISIONING` (module 148) already declares `api_consumers` as a consumer DMDO, proving the deploy contract surface is being used downstream even though the source domain has no modular split. | Author the APIM module set. Recommended shape (subject to B2-S1 user decision): four full modules covering design and lifecycle (`APIM-DESIGN-LIFECYCLE` housing `api_versions`, `api_specifications`), gateway runtime (`APIM-GATEWAY-RUNTIME` housing `api_gateways`, `api_deployments`, `api_policies`), monetization and consumer access (`APIM-CONSUMER-MGMT` housing `api_consumers`, `api_usage_metrics`), and developer portal (`APIM-DEVELOPER-PORTAL`, a thinner module covering portal artifacts surfaced as Phase 0 candidates in B3-S1). Capabilities (B1-S2) get attached to whichever module realizes them. Once modules exist, S6 to S14 below become loadable. |
| B1-S2 | **A2 zero capabilities** | `capability_domains` for APIM returns 0 rows. Phase A expectation is 5 to 8 capabilities per market. | Draft 6 to 8 capabilities (suggestions: `APIM-DESIGN-FIRST-AUTHORING`, `APIM-API-VERSIONING`, `APIM-GATEWAY-POLICY-ENFORCEMENT`, `APIM-RATE-LIMITING-AND-QUOTAS`, `APIM-DEVELOPER-PORTAL-PUBLISHING`, `APIM-CONSUMER-ONBOARDING`, `APIM-API-MONETIZATION`, `APIM-API-USAGE-ANALYTICS`) and link via `capability_domains` plus `domain_module_capabilities` once modules land. |
| B1-S3 | **A3 zero solutions linked** | `solution_domains?domain_id=eq.79` returns 0 rows. The market has well-known flagship vendors but none are linked. | Add `solutions` rows where missing and `solution_domains` rows with `coverage_level` (`primary` for Apigee, Kong, MuleSoft Anypiece, Azure API Management, AWS API Gateway, IBM API Connect, Tyk, WSO2 API Manager, Postman API Platform). Reuse existing `vendors` rows by `vendor_name` per Rule #4. |
| B1-S4 | **A4 catalog UX fields empty** | `catalog_tagline` and `catalog_description` are both empty strings. Rule #20 requires a buyer-voice draft, surfaced to user before write. | Draft tagline plus 1 to 3 paragraph description in buyer voice (workflow plus value: design, publish, secure, and monetize APIs from one place; route traffic through gateways with policy enforcement, rate limits, and consumer-level analytics). Surface BEFORE writing. |
| B1-S5 | **B9 event_category invalid on 10 trigger events** | All 10 APIM `trigger_events` (ids 808 to 817) have `event_category=''`. Per Rule #13 the enum must be one of `lifecycle / state_change / threshold / signal`. Proposed mapping: 808 `api_version.published` to `lifecycle`, 809 `api_version.deprecated` to `lifecycle`, 810 `api_specification.updated` to `state_change`, 811 `api_deployment.published` to `lifecycle`, 812 `api_deployment.rolled_back` to `state_change`, 813 `api_policy.updated` to `state_change`, 814 `api_usage.quota_breached` to `threshold`, 815 `api_consumer.onboarded` to `lifecycle`, 816 `api_consumer.revoked` to `state_change`, 817 `api_gateway.health_degraded` to `signal`. | PATCH 10 rows with the categorization above. |
| B1-S6 | **B6 zero intra-domain `data_object_relationships`** | No edges between any two APIM masters. Expected: `api_versions belongs_to api_specifications`, `api_deployments runs api_versions`, `api_deployments targets api_gateways`, `api_policies applies_to api_deployments` (or `api_gateways`), `api_usage_metrics measures api_deployments`, `api_consumers consumes api_deployments` (via subscription), `api_consumers attributed_to api_usage_metrics`. Without these, the APIM subgraph in fact sheets and architect views is hollow. | Draft 6 to 8 intra-domain edges (verb plus inverse_verb plus relationship_type plus relationship_kind plus is_required plus owner_side) and load. |
| B1-S7 | **B7 zero `users` edges (Rule #10)** | No `data_object_relationships` rows between the 7 APIM masters and `users` (748). Every workflow-bearing APIM master has a user actor: API product owner on `api_specifications`, deployment approver on `api_deployments`, policy author on `api_policies`, gateway operator on `api_gateways`, consumer-onboarding reviewer on `api_consumers`. | Draft 5 to 7 user edges (`users owns api_specifications`, `users approves api_deployments`, `users authors api_policies`, `users operates api_gateways`, `users onboards api_consumers`). |
| B1-S8 | **B8 missing cross-domain relationships** | 7 outbound plus 1 inbound cross-domain handoffs; only 1 cross-domain `data_object_relationships` row touches APIM masters (`test_cases is_triggered_by api_specifications`, inbound from TEST-MGMT). Missing payload-target edges that mirror the published handoffs: `api_specifications informs contract_tests` (IPAAS / TEST-MGMT target on 748, 752), `api_deployments triggers releases` (VSDP target on 747), `api_gateways feeds telemetry_streams` (OBS target on 749), `api_usage_metrics feeds subscription_meters` (SUB-MGMT target on 750), `api_consumers governs identity_grants` (IGA target on 751), `api_policies aligns_with control_policies` (GRC target on 797). | Draft 6 outbound cross-domain edges per the B6/B8 shape. Some rows may defer pending neighbor master ownership confirmation (especially TEST-MGMT-side `contract_tests` master and OBS-side `telemetry_streams` master). |
| B1-S9 | **B11 zero `data_object_aliases`** | None of the 7 APIM masters carry alias rows. Vendor synonyms exist: `api_specifications` to Apigee "API Proxy", Kong "Service plus Route", MuleSoft "API Asset", Azure APIM "API"; `api_consumers` to Apigee "App and Developer", Kong "Consumer", Azure APIM "Subscription Owner"; `api_deployments` to Apigee "Revision and Environment", Kong "Workspace", Azure APIM "API Version Set deployment"; `api_gateways` to Kong "Gateway", AWS "API Gateway", Apigee "Runtime"; `api_policies` to Apigee "Policy", Kong "Plugin", Azure APIM "Policy". | Draft 8 to 12 alias rows; load via cluster-drafts pattern. |
| B1-S10 | **B12 zero `data_object_lifecycle_states` (Rule #12)** | None of the 7 masters carry lifecycle states. `api_versions` (`draft` to `published` to `deprecated` to `retired`), `api_deployments` (`pending` to `published` to `rolled_back`), `api_specifications` (`draft` to `reviewed` to `approved` to `published`), `api_consumers` (`pending` to `onboarded` to `revoked`), `api_policies` (`draft` to `active` to `superseded`) are workflow-bearing. `api_usage_metrics` and `api_gateways` are config or telemetry shape (exemption candidates per Rule #12; surface in audit, do NOT auto-populate `data_objects.notes`). | For the 5 workflow-bearing masters, author state machines with `requires_permission` flags plus `domain_module_id` on the realizing module (depends on B1-S1 module set). For `api_usage_metrics` and `api_gateways`, surface the config-shape exemption in this audit per Rule #15. |
| B1-S11 | **B4 pattern flags positive re-evaluation per Rule #12** | All 7 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Re-evaluate explicitly: `api_specifications.has_submit_lock=true` (published specs should freeze so contract tests pin against an immutable revision), `api_specifications.has_single_approver=true` (one API product owner per spec), `api_policies.has_single_approver=true` (one platform-engineering approver per policy), `api_consumers.has_personal_content=true` (developer contact details are personal data subject to GDPR access and erasure). | Decisions captured in Bucket 2 B2-S2; positive flags get a PATCH. |
| B1-S12 | **F1 legacy domain-level system skill (Rule #17)** | Skill 29 (`apim-system`) carries `domain_id=79, domain_module_id=NULL`. Per F1 the legacy domain-level shape is a transitional state; per Rule #17 every `domain_modules` row needs exactly one `skill_type='system'` skill with `domain_module_id` set, and per Phase-S naming the skill_name should be `<module_code_lower>_agent` (snake plus `_agent`), not `<code>-system` (kebab plus `-system`). Once B1-S1 modules land, this skill needs to be retired or migrated to one of the new modules, with new per-module skills authored for each module. | After B1-S1 modules land: re-author one `skills` row per `domain_modules` row with `skill_name='<module_code_lower>_agent'`, link the 7 existing `skill_tools` query rows to the appropriate per-module skill (`query_api_versions` and `query_api_specifications` to APIM-DESIGN-LIFECYCLE, `query_api_deployments` plus `query_api_policies` plus `query_api_gateways` to APIM-GATEWAY-RUNTIME, `query_api_consumers` plus `query_api_usage_metrics` to APIM-CONSUMER-MGMT), then DELETE the legacy skill 29. |
| B1-S13 | **F3 missing mutate, fetch, side_effect, compute, and gate tools** | Skill 29 links 7 tools, all `operation_kind='query'`. No `mutate_*` (create / update lifecycles), no `side_effect` (e.g., `publish_api_deployment`, `apply_api_policy`, `revoke_api_consumer`), no notification primitives (`notify_person` for breaking-change alerts to subscribers, `notify_team` for gateway-degradation broadcasts). The required floor per Rule #17 is at least one query plus one mutate plus one workflow gate. | After modules land (B1-S1): author per-module mutate tools (`create_api_version`, `publish_api_deployment`, `update_api_policy`, `onboard_api_consumer`, `revoke_api_consumer`) plus the `notify_person` and `notify_team` abstraction rows for breaking-change and quota-breach communication. Link with `requirement_level='required'` for the workflow-gate tools and `optional` for the notifications. |
| B1-S14 | **B10b NULL `source_domain_module_id` on every outbound (vacuous until M1)** | All 7 outbound APIM handoffs (747, 748, 749, 750, 751, 752, 797) carry `source_domain_module_id=NULL`. The 1 inbound row (767) also carries `target_domain_module_id=NULL`. Until B1-S1 modules land, this is vacuous; once they do, run the backfill loader per [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts). | Backfill via the standard pattern after B1-S1. Handoff 751 already has `target_domain_module_id=148` (IGA-AUTO-PROVISIONING) on the IGA side; the others stay NULL on the target until each target domain ships its own modules (already done for IGA and ITSM but not for VSDP / OBS / SUB-MGMT / TEST-MGMT / GRC at the per-handoff level here). |
| B1-S15 | **C1 contributor not consumer for IT Operations** | C1 passes structurally (1 owner row, Platform Engineering), but the secondary row tags IT Operations as `contributor`. For a gateway-runtime-heavy market the better RACI is IT Operations as `consumer` of dashboards plus alerts and Security as `contributor` on the policy / consumer-revocation slice. Currently no Security row exists. | Add `business_function_domains` row for Information Security as `contributor` (policy authoring, consumer access governance), and PATCH IT Operations from `contributor` to `consumer` (matches the operate-the-runtime RACI, not the build-the-runtime RACI which belongs to Platform Engineering). |

#### APQC TAGGING

8 cross-domain handoffs total (7 outbound, 1 inbound), 0 tagged. Coverage: 0/8 = 0%. Volume target for this audit: 4 to 6 new `agent_curated` rows. Headline catalog quality (`record_status='approved'`): 0/8.

Routine high-confidence tags to author at fix time:

| handoff_id | source to target | trigger_event | payload data_object | Proposed PCF (process_name / external_id) | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 747 | APIM to VSDP | `api_deployment.published` | `api_deployments` | Deploy services/solutions (20824 L2) | 52 | confident L2 |
| 748 | APIM to IPAAS | `api_specification.updated` | `api_specifications` | Develop and manage service/solution deployment strategy (20825 L3) | 283 | medium L3 |
| 749 | APIM to OBS | `api_gateway.health_degraded` | `api_gateways` | Monitor IT infrastructure security (20912 L4) | 1307 | medium L4 (better candidate may be "Manage IT events and incidents" once authored upstream) |
| 750 | APIM to SUB-MGMT | `api_usage.quota_breached` | `api_usage_metrics` | Monitor performance against baselines (19984 L4) | 523 | medium L4 |
| 751 | APIM to IGA | `api_consumer.revoked` | `api_consumers` | Manage IT user authorization (20759 L4) | 1196 | confident L4 |
| 752 | APIM to TEST-MGMT | `api_specification.updated` | `api_specifications` | Build and test IT service/solution components (20812 L5) | 1939 | medium L5 (defer-to-parent L4 candidate preferred if "Manage IT service/solution development" lands) |
| 767 | IPAAS to APIM (inbound) | `integration_connector.credential_expired` | `integration_connectors` | Manage IT user identity and authorization (20756 L3) | 273 | medium L3 |
| 797 | APIM to GRC | `api_policy.updated` | `api_policies` | Manage corporate governance policies (11045 L3) | 391 | confident L3 |

Per the constraint #10 counting convention this is **one** Bucket 1 item (`B1-H1`); the table proposes 8 candidate rows (no deferrals this run, all 8 have at least a medium-confidence PCF match).

#### Bucket 1 finding-type counts

| Finding type | Count |
|---|---|
| STRUCTURAL (S1 to S4, S15) | 5 |
| BOUNDARY (S5 to S10, S14) | 7 |
| Phase-S authoring (S11 to S13 cover pattern flags plus skill migration plus tools floor) | 2 |
| APQC TAGGING bundle (B1-H1; 8 candidate rows inside) | 1 |
| **Bucket 1 total line items** | **15** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module split shape for APIM** | The catalog has no module set today (B1-S1). Three plausible shapes: (a) **4 modules**: `APIM-DESIGN-LIFECYCLE` (api_versions, api_specifications, design-first artifacts), `APIM-GATEWAY-RUNTIME` (api_gateways, api_deployments, api_policies), `APIM-CONSUMER-MGMT` (api_consumers, api_usage_metrics, api_subscriptions if loaded), `APIM-DEVELOPER-PORTAL` (developer_portals, api_documentation, api_products if loaded as Phase 0 candidates). (b) **3 modules**: collapse design plus portal into `APIM-DESIGN-AND-PORTAL`, keep gateway-runtime and consumer-mgmt distinct. (c) **2 modules**: `APIM-CONTROL-PLANE` (everything design-portal-policy) plus `APIM-DATA-PLANE` (gateways plus deployments plus runtime telemetry). With 6 to 8 capabilities expected (B1-S2) the M2 rule requires at least 2 full modules under any shape; (a) mirrors how Apigee, Kong Konnect, and Azure APIM market their product surfaces (design vs runtime vs consumer/monetization vs portal), (c) collapses to the control / data plane abstraction common in gateway-only vendors (Kong OSS, Tyk). | Editorial / product-shape decision. (a) 4 modules recommended (mirrors flagship Apigee / Kong Konnect / Azure APIM); (b) 3 modules; (c) 2 modules. |
| B2-S2 | **B4 pattern flag positive re-evaluation per Rule #12** | The agent can propose but the workflow-shape decision is the user's. Specific proposals: `api_specifications.has_submit_lock=true` (published specs should freeze so contract tests pin to an immutable revision), `api_specifications.has_single_approver=true` (one API product owner approves the breaking-change checklist), `api_policies.has_single_approver=true` (one platform-engineering reviewer per policy), `api_consumers.has_personal_content=true` (developer contact details are personal data subject to GDPR). `api_versions`, `api_deployments`, `api_usage_metrics`, `api_gateways` proposed to stay false. | Pattern flags are workflow-shape judgments owned by the user; per Rule #15 recording the consideration in `notes` is forbidden. Per-flag yes/no from user; decisions are captured in this audit file (the approved persistence surface per Rule #15). |
| B2-S3 | **Regulations applicable to APIM (A2 / domain_regulations gap)** | `domain_regulations` returns 0 rows for APIM. APIM as a category is not a regulation-anchored market the way ATS is for FCRA, but consumer-facing APIs and developer-portal personal data fall under GDPR (Articles 15 to 22), and policy / audit logs on gateways are SOX / PCI-DSS load-bearing for regulated industries. Universal vendor surface confirms `api_audit_logs` plus consumer-data-access workflows. | Decide which regulations to attach: (a) GDPR plus SOX plus PCI-DSS (broad); (b) GDPR only (developer-personal-data anchor); (c) leave empty (regulation-light market). Recommendation: (a) so the developer-portal personal-data workflows have a `domain_regulations` row to hang on. |

### Bucket 3, Phase 0 pending (speculative)

The market-audit subagent was NOT spawned for this run (per the validate b1 prompt the analyst does flagship vendor research themselves; this section reflects the analyst's own pattern-matching against Apigee, Kong Konnect, MuleSoft Anypiece, Azure API Management, AWS API Gateway, IBM API Connect, Tyk, WSO2 API Manager, Postman API Platform).

| ID | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-S1 | **Missing APIM substrate entities (vendor-surface candidates).** Likely missing masters that flagship API management vendors model: `api_products` (Apigee API Product, Kong Service-bundle, Azure APIM Product, IBM Product, MuleSoft API Group, the developer-facing SKU bundling 1+ specs under one consumption contract), `api_subscriptions` and `api_plans` (Apigee API Plan, Azure APIM Subscription, IBM Plan, MuleSoft Contract; pairs consumer to product with rate plan), `api_keys` (universal; distinct from broader `oauth_clients`), `oauth_clients` (Apigee Developer App, Kong OAuth2 Plugin app, Azure APIM AAD-app), `developer_portals` (configured developer portal instance, distinct per environment), `api_documentation` (rendered docs and SDKs; some vendors store as separate artifact from spec), `api_audit_logs` (gateway access plus admin events, regulation-load-bearing), `api_rate_limits` (separable config from broader `api_policies`), `api_quotas` (separable from rate limits; quotas are per-period plus per-consumer), `backends` or `upstream_services` (origin services the gateway routes to; Kong "Service", Apigee "Target Server", Azure APIM "Backend"), `api_categories` or `api_taxonomies` (portal-side discoverability), `api_change_proposals` (governed change-management around breaking changes; Apigee Hub, Postman API Network), `contract_tests` (could route to TEST-MGMT instead; some vendors keep these in APIM as schema-conformance probes). The 7 currently-loaded masters (api_versions, api_specifications, api_deployments, api_policies, api_usage_metrics, api_gateways, api_consumers) are the **headline-noun set**; the workflow-substrate (products, subscriptions, keys, oauth_clients, portals, docs, audit_logs, separated rate-limits / quotas, backends, change_proposals) is largely absent. | Spawn a Phase 0 vendor-research subagent against Apigee, Kong Konnect, MuleSoft Anypiece, Azure APIM, AWS API Gateway, IBM API Connect, output to `c:/tmp/APIM-phase0-2026-05-30.md`. Cross-check against the API-SEC and EVENT-BROKER candidates queued in `_missing-domains.md` this run: if API-SEC promotes, `api_audit_logs` plus `api_threat_signals` may route to API-SEC instead. If EVENT-BROKER promotes, async-API artifacts (`event_streams`, `subscriptions` of streaming-topic flavor) route there rather than into APIM. |

### Cross-bucket dependencies

- B1-S1 (M1 module set) blocks B1-S12 (F1 system skill migration), B1-S13 (Phase-S tools floor), B1-S10 (lifecycle states need `domain_module_id`), B1-S14 (B10b backfill), and the M2 / M4 / M5 / M6 cascade. Resolve B1-S1 first; the remaining structural items either gate on it or are mechanical PATCHes that can ship in parallel.
- B1-S2 (capabilities) depends on B2-S1 (module shape) because each capability gets attached to its realizing module via `domain_module_capabilities`.
- B3-S1 (Phase 0 missing entities) cascades into B1-S1 (module shape) and B1-S6 (intra-domain relationships). If the user wants to defer the substrate-expansion until Phase 0 vendor research lands, B1-S1 should choose a conservative shape (3 modules, easier to refactor later) over (a) which prematurely commits to a separate developer-portal module before its data_objects are loaded.
- B2-S3 (regulations) cascades into B1-S6 / B1-S11 (regulations adjusts which masters need `has_personal_content=true` and where compliance entities sit). GDPR confirmation makes `api_consumers.has_personal_content=true` (B2-S2) more clearly correct.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with `all`, list (e.g. `S1, S2, S5, H1`), or `skip`.

- **S1 (M1 module set):** the structural blocker. Decide B2-S1 module shape first; S1 is the load step.
- **S2 (capabilities):** ships alongside S1.
- **S3 (solutions):** mechanical; can ship any time but reads best after S1 because `solution_domains.coverage_level` is per-domain not per-module.
- **S4 (catalog UX fields):** Rule #20 draft-then-surface flow; can ship after the module set.
- **S5 (event_category PATCH on 10 trigger_events):** trivial; mechanical PATCHes.
- **S6 (intra-domain relationships):** ships after S1 / S2.
- **S7 (`users` edges):** mechanical; ships any time.
- **S8 (cross-domain relationships):** partly gated on Bucket 3 (Phase 0 vendor research may reshape the target masters in TEST-MGMT, OBS, SUB-MGMT).
- **S9 (aliases):** mechanical; ships any time.
- **S10 (lifecycle states):** ships after S1.
- **S11 (pattern flags):** decided in B2-S2; PATCH after.
- **S12 (F1 legacy skill migration):** depends on S1.
- **S13 (Phase-S tools floor):** depends on S1 plus S12.
- **S14 (B10b backfill):** runs after S1 lands.
- **S15 (C1 RACI adjust):** mechanical; ships any time. No dependency on S1.
- **H1 (APQC tagging, 8 candidate rows):** load all-at-once.

**Bucket 2, what's your call on each?** I will wait for per-item decisions before acting.

- **B2-S1 (module split shape):** (a) 4 modules, (b) 3 modules, or (c) 2 modules?
- **B2-S2 (pattern flags):** per-flag yes / no (5 proposed positive flags).
- **B2-S3 (regulations):** (a) GDPR plus SOX plus PCI-DSS, (b) GDPR only, or (c) leave empty?

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball, name which candidate entities to treat as confirmed; if vetted, the subagent runs against Apigee / Kong Konnect / MuleSoft / Azure APIM / AWS API Gateway / IBM API Connect.

### Pass 3, Neighbor discovery (auto-derived)

Already surfaced in the Summary table. Seven neighbors total, all at edge weight at most 2; every neighbor gets the lightweight one-line summary below rather than the full 5-section pairwise diff.

| Neighbor | Lightweight summary |
|---|---|
| IPAAS (weight 2) | 1 outbound (`api_specification.updated` to IPAAS) plus 1 inbound (`integration_connector.credential_expired` from IPAAS). Both NULL on every module FK column except IGA-side handoff 751. The inbound's payload (`integration_connectors`, IPAAS-mastered) has no APIM-side DMDO declaring `consumer` / `contributor`; report-only against IPAAS for the source-side B10b. |
| IGA (weight 2) | 1 outbound (`api_consumer.revoked` to IGA, handoff 751, `target_domain_module_id=148`). 1 cross-module DMDO consumer (`IGA-AUTO-PROVISIONING` on `api_consumers`). The DMDO row is wired correctly from IGA's side; APIM owes no symmetric row. The relationship mirror `api_consumers governs identity_grants` (B1-S8) is the outstanding cross-rel edge. |
| TEST-MGMT (weight 2) | 1 outbound (`api_specification.updated` to TEST-MGMT, handoff 752). 1 inbound cross-domain relationship (`test_cases is_triggered_by api_specifications`, id 408). The relationship is structurally well-formed. Handoff 752 carries NULL on both module FK columns; report-only TEST-MGMT side once a TEST-MGMT module masters `test_cases`. |
| VSDP (weight 1) | 1 outbound (`api_deployment.published` to VSDP). No DMDO and no cross-rel. The expected mirror `api_deployments triggers releases` is in B1-S8. |
| OBS (weight 1) | 1 outbound (`api_gateway.health_degraded` to OBS, handoff 749). OBS module FKs are NULL; report-only against OBS (the OBS audit RO-5 already lists this handoff). |
| SUB-MGMT (weight 1) | 1 outbound (`api_usage.quota_breached` to SUB-MGMT). Both module FKs NULL; report-only against SUB-MGMT. |
| GRC (weight 1) | 1 outbound (`api_policy.updated` to GRC, handoff 797). Both module FKs NULL; report-only against GRC. |

### Pass 4, Pairwise reconciliation per neighbor

No neighbor at weight at least 3 in this run; the lightweight summaries above replace the full 5-section diff. If the user upgrades any to a full pairwise pass after Phase 0 reshapes the cross-rel substrate, IPAAS and IGA are the strongest candidates (both already at weight 2 with module-FK gaps to chase).

### Report-only follow-ups (owed by other domains)

These items the audit identifies but other domains own. They do NOT block APIM's green status; the user can choose to schedule audits on the named domains.

| ID | Owing domain | Finding | Routed to |
|---|---|---|---|
| RO-1 | IPAAS | Inbound handoff 767 (`integration_connector.credential_expired`) carries NULL `source_domain_module_id`. Source side is IPAAS's B10b. Once both APIM and IPAAS ship modules, the row needs the backfill on each side. | IPAAS b1 audit, B10b source side. |
| RO-2 | IPAAS | Outbound handoff 748 (`api_specification.updated` to IPAAS) carries NULL `target_domain_module_id`; IPAAS's modules already exist (IPAAS-AGENT-DESIGNER, IPAAS-PIPELINE-RUNTIME, etc., per the IPAAS audit) so this is a determinate backfill on the IPAAS side once the audit is run there. | IPAAS b1 audit, B10b target side. |
| RO-3 | TEST-MGMT | Outbound handoff 752 (`api_specification.updated` to TEST-MGMT) carries NULL `target_domain_module_id`. If TEST-MGMT has shipped a module that masters `test_cases` (e.g., TEST-MGMT-TEST-AUTHORING), backfill is determinate; otherwise the NULL persists until TEST-MGMT is modularized. | TEST-MGMT b1 audit, B10b target side plus M1. |
| RO-4 | OBS | Outbound handoff 749 (`api_gateway.health_degraded` to OBS) carries NULL `target_domain_module_id`. Per the OBS audit, OBS has no modules yet (OBS B1-S1); both APIM-side and OBS-side stay NULL until both audits ship their fix. | OBS b1 audit, B10b target side plus M1 (already known). |
| RO-5 | SUB-MGMT | Outbound handoff 750 (`api_usage.quota_breached` to SUB-MGMT) carries NULL `target_domain_module_id`. Depends on SUB-MGMT module shape; report-only there. | SUB-MGMT b1 audit, B10b target side. |
| RO-6 | GRC | Outbound handoff 797 (`api_policy.updated` to GRC) carries NULL `target_domain_module_id`. | GRC b1 audit, B10b target side. |
| RO-7 | VSDP | Outbound handoff 747 (`api_deployment.published` to VSDP) carries NULL `target_domain_module_id`. | VSDP b1 audit, B10b target side. |
| RO-8 | IGA | Outbound handoff 751 (`api_consumer.revoked` to IGA) has `target_domain_module_id=148` (IGA-AUTO-PROVISIONING) correctly wired; this is a positive sanity check, no follow-up owed. | IGA b1 audit (informational only). |

Candidates queued in `audits/_missing-domains.md` this run: **API-SEC** (new), **EVENT-BROKER** (bumped 1 to 2), **SERVICE-MESH** (bumped 1 to 2). Total: 3 entries touched.

## 2026-05-31, Continuation: B1 technical fixes

Subagent under domain-map-analyst applied the truly-technical subset of the 2026-05-30 Bucket 1 list per the project's defer-judgment rules. All work landed via [.tmp_deploy/fix_apim_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_apim_b1_technical_2026_05_31.ts), one Bun loader, idempotent, run from project root.

### Applied (22 writes total)

- **B1-S5** (10 PATCHes). `trigger_events` ids 808 to 817 backfilled `event_category` per the audit's pre-specified Rule #13 mapping. All 10 rows were `event_category=''` pre-run.
  - 808 `api_version.published` -> `lifecycle`
  - 809 `api_version.deprecated` -> `lifecycle`
  - 810 `api_specification.updated` -> `state_change`
  - 811 `api_deployment.published` -> `lifecycle`
  - 812 `api_deployment.rolled_back` -> `state_change`
  - 813 `api_policy.updated` -> `state_change`
  - 814 `api_usage.quota_breached` -> `threshold`
  - 815 `api_consumer.onboarded` -> `lifecycle`
  - 816 `api_consumer.revoked` -> `state_change`
  - 817 `api_gateway.health_degraded` -> `signal`
- **B1-S7** (5 INSERTs into `data_object_relationships`). Rule #10 user-edges from `users` (748) to the 5 workflow-bearing APIM masters. Pre-run query confirmed zero existing user-edges to any APIM master. Each row: `relationship_type='one_to_many'`, `relationship_kind='reference'`, `owner_side='source'`, `is_required=false`.
  - `users owns api specifications` -> 457 (inverse `is_owned_by`)
  - `users approves api deployments` -> 458 (inverse `is_approved_by`)
  - `users authors api policies` -> 459 (inverse `is_authored_by`)
  - `users operates api gateways` -> 461 (inverse `is_operated_by`)
  - `users onboards api consumers` -> 462 (inverse `is_onboarded_by`)
- **B1-S15 (partial)**, 1 PATCH. `business_function_domains` id 92 (IT Operations on APIM) `responsibility_type` flipped `contributor` -> `consumer` per the audit's operate-the-runtime RACI. The Information Security INSERT half of B1-S15 was NOT applied (new BFD contributor row is a deferred class per the prompt's defer list).
- **B1-H1** (6 INSERTs into `handoff_processes`). Audit pre-specified handoff_id + PCF for all 8 handoffs; pre-run query found 2 already tagged (id 349: 752 -> process 1670, id 481: 767 -> process 273). The remaining 6 were inserted with `role='implements'`, `proposal_source='agent_curated'`, `record_status` defaulted to `new`. All 6 PCFs verified live by id before insert.
  - 747 -> process 52 "Deploy services/solutions" (key 747.52, new id 498)
  - 748 -> process 283 "Develop and manage service/solution deployment strategy" (key 748.283, new id 499)
  - 749 -> process 1307 "Monitor IT infrastructure security" (key 749.1307, new id 500)
  - 750 -> process 523 "Monitor performance against baselines" (key 750.523, new id 501)
  - 751 -> process 1196 "Manage IT user authorization" (key 751.1196, new id 502)
  - 797 -> process 391 "Manage corporate governance policies" (key 797.391, new id 503)

### Deferred (11 items, plus the BFD-INSERT half of S15)

| ID | Reason for defer |
|---|---|
| B1-S1 (module set) | Gated on B2-S1 user decision on module split shape (2/3/4 modules). |
| B1-S2 (capabilities) | Gated on B2-S1 (each capability attaches to its realizing module). |
| B1-S3 (solutions linkage) | New entities (solutions + solution_domains) outside the prompt's apply list; reads best after S1 anyway. |
| B1-S4 (catalog_tagline / catalog_description) | Rule #20: buyer-voice draft requires surface-to-user before write. |
| B1-S6 (intra-domain rel edges) | Edges not pre-specified by audit as Rule-#10-style user edges; require draft + verb/cardinality decisions. |
| B1-S8 (cross-domain rel edges) | Partly gated on Bucket 3 vendor research (TEST-MGMT, OBS, SUB-MGMT target masters may change); not pre-specified mechanical inserts. |
| B1-S9 (data_object_aliases) | Audit does not pre-specify the exact 8 to 12 tuples (alias_name, vendor context), and the prompt's defer list explicitly excludes bulk alias inserts. |
| B1-S10 (lifecycle states) | Gated on B1-S1: `data_object_lifecycle_states.domain_module_id` cannot be set until modules exist. |
| B1-S11 (pattern flag flips) | Defer per the prompt's "pattern flag flips" defer; the 4 proposed positive flips are queued in B2-S2 for user decision. |
| B1-S12 (F1 legacy skill migration) | Depends on B1-S1; new skills are new entities. |
| B1-S13 (F3 tools floor) | Depends on B1-S1 + B1-S12. |
| B1-S14 (B10b backfill) | Vacuous until B1-S1; no module FKs to backfill against. |
| B1-S15 (Information Security INSERT) | New BFD contributor row is in the prompt's defer list; only the IT Operations PATCH half applied. |
| B2-S1, B2-S2, B2-S3 | Judgment items, surface-to-user. |
| B3-S1 | Phase 0 substrate; new entities. |

### JWT errors

None. All 22 writes succeeded on first attempt against tenant `ma@adenin.com`.

### Loader

[.tmp_deploy/fix_apim_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_apim_b1_technical_2026_05_31.ts)

## 2026-05-31, Audit (Validate b1, structural re-pass)

### Summary

- **Current footprint:** 0 `domain_modules` (M1 still hard-fails), 0 capabilities, 0 solutions, 0 regulations, 7 masters in legacy `domain_data_objects` rollup (`api_versions` 456, `api_specifications` 457, `api_deployments` 458, `api_policies` 459, `api_usage_metrics` 460, `api_gateways` 461, `api_consumers` 462). 7 outbound cross-domain handoffs (747 VSDP, 748 IPAAS, 749 OBS, 750 SUB-MGMT, 751 IGA, 752 TEST-MGMT, 797 GRC) and 1 inbound (767 IPAAS). 10 `trigger_events` on APIM masters (ids 808 to 817) now all carry valid `event_category` per the 2026-05-31 continuation (Rule #13 satisfied). 5 user-edges from `users` (748) to APIM masters loaded (B7 satisfied). 1 cross-domain rel edge inbound (`test_cases is_triggered_by api_specifications`, id 572 to 457). 1 cross-module DMDO consumer row (`IGA-AUTO-PROVISIONING` module 148 on `api_consumers`). 2 `business_function_domains` rows (Platform Engineering owner 91, IT Operations consumer 92 per the continuation flip). 1 legacy domain-level `system` skill (`apim-system`, id 29) with 7 query `skill_tools` rows, all at `coverage_tier='platform'`; `domain_module_id=NULL` so F1 carries it as a transitional row. 0 `data_object_lifecycle_states`. 0 `data_object_aliases`. 0 intra-domain `data_object_relationships`. 8 of 8 cross-domain handoffs now carry `handoff_processes` rows, all `agent_curated`, all `record_status='new'`. Catalog tagline/description empty (A4 fails). `catalog_tagline` / `catalog_description` empty per A4 / M8.
- **Bucket 1 (in-scope, agent fixable):** 10 items.
- **Bucket 2 (surface-for-user, judgment):** 3 items.
- **Bucket 3 (Phase 0 pending, speculative):** 1 item.

The M1 hard fail remains the gating blocker: APIM still has zero `domain_modules` rows. M2 / M4 / M5 / M6 / M7 / M8, F2 / F3 / F4 / F5, E1 to E6, B9b, and the B10b source-side backfill all cascade behind it.

### Band-by-band findings

| Band | Status | Note |
|---|---|---|
| S1 | gated | Indirect-table sweep blocked by M1 (no modules to count DMDOs / capabilities against). |
| S2 | vacuous | No modules. |
| S3 | flags | 7 masters, 0 lifecycle_states (B12), 10 events ok (B9 events), 0 aliases (B11). |
| A1 | pass | All 7 business-metadata fields populated on domain 79. |
| A2 | fail | 0 capabilities (B1-S2). |
| A3 | fail | 0 solutions linked (B1-S3). |
| A4 | fail | Both catalog UX fields empty (B1-S4, Rule #20). |
| M1 | hard fail | 0 `domain_modules` rows; primary host + host-junction both empty (B1-S1). |
| M2 / M4 / M5 / M6 / M7 / M8 | vacuous pending M1 | No modules. |
| B1 | pass | 7 master DOs in legacy rollup. |
| B2 | pass | Every master has singular/plural labels. |
| B3 | pass | All names are prefixed (`api_*`); no bare-word naming arbitration needed. |
| B4 | fail | All 7 masters have all three pattern flags false; per Rule #12 a positive re-evaluation is owed. B2-S2 surfaces the 4 proposed positive flips. |
| B5 | vacuous | No `embedded_master` rows owned by APIM. |
| B6 | fail | 0 intra-domain `data_object_relationships` edges. |
| B7 | pass | 5 user-edges loaded by continuation. |
| B8 | fail | Only 1 cross-domain rel edge touches APIM masters (inbound `test_cases is_triggered_by api_specifications` 572). 7 outbound handoffs lack mirror payload-target edges (B1-S8). |
| B9 | pass | 10 events, all categorized. 7 outbound handoffs published. |
| B9b | vacuous | Single-module-or-less; skip pre-check satisfied (0 modules <2). |
| B10 | report-only | 1 inbound from IPAAS (767). |
| B10b | gated | Every outbound has NULL `source_domain_module_id`; vacuous until M1 lands. |
| B11 | fail | 0 aliases across 7 masters; vendor synonyms missing (B1-S9). |
| B12 | fail | 0 lifecycle states across 5 workflow-bearing masters (Rule #12). `api_usage_metrics` and `api_gateways` candidate config-shape exemptions to surface (Rule #15 wording approval). |
| C1 | pass | Owner row (Platform Engineering 91) + consumer row (IT Operations 92, post-continuation flip). The audit also recommends adding a Information Security `contributor` row (B1-S15 INSERT half still owed). |
| C2 | vacuous | No capabilities. |
| D1 | n/a | UI spot-check deferred until M1 lands. |
| E1 to E6 | vacuous | No modules, no roles. |
| F1 | fail | Legacy domain-level `system` skill (id 29, `apim-system`) remains with `domain_module_id=NULL`. Stays acceptable transitional until any module-level system skill exists; once any does, this becomes a deletion. |
| F2 / F3 / F4 / F5 | vacuous pending M1 | No modules. |
| H1 | pass | All 8 cross-domain handoffs (7 outbound + 1 inbound) carry `agent_curated` `handoff_processes` rows; coverage 8/8 = 100% by provenance. **Headline catalog quality: 0/8 `record_status='approved'`** (user has not approved any of the agent_curated tags). |

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 (hard fail, blocker) | APIM has 0 `domain_modules` rows; no primary host nor host-junction. The legacy `domain_data_objects` rollup carries the 7 masters but no module owns them. `IGA-AUTO-PROVISIONING` (148) already declares `api_consumers` as a consumer DMDO. | Hand-author the APIM module set per B2-S1 user decision. |
| B1-S2 | A2 | 0 capabilities for APIM. | Draft 6 to 8 capabilities (`APIM-DESIGN-FIRST-AUTHORING`, `APIM-API-VERSIONING`, `APIM-GATEWAY-POLICY-ENFORCEMENT`, `APIM-RATE-LIMITING-AND-QUOTAS`, `APIM-DEVELOPER-PORTAL-PUBLISHING`, `APIM-CONSUMER-ONBOARDING`, `APIM-API-MONETIZATION`, `APIM-API-USAGE-ANALYTICS`) and link via `capability_domains` + `domain_module_capabilities`. Depends on B1-S1 + B2-S1. |
| B1-S3 | A3 | 0 `solution_domains` rows; flagship vendor list is unlinked. | Add `solutions` rows where missing and `solution_domains` rows with `coverage_level` for Apigee, Kong, MuleSoft Anypoint, Azure API Management, AWS API Gateway, IBM API Connect, Tyk, WSO2 API Manager, Postman API Platform. Reuse existing `vendors` rows. |
| B1-S4 | A4 (Rule #20) | `catalog_tagline` and `catalog_description` both empty. | Draft buyer-voice tagline + 1 to 3 paragraph description (workflow + value: design, publish, secure, monetize APIs from one place with gateways, policy enforcement, rate limits, consumer-level analytics). Surface BEFORE writing per Rule #20. |
| B1-S6 | B6 | 0 intra-domain `data_object_relationships` edges. Expected: `api_versions belongs_to api_specifications`, `api_deployments runs api_versions`, `api_deployments targets api_gateways`, `api_policies applies_to api_deployments`, `api_usage_metrics measures api_deployments`, `api_consumers consumes api_deployments`, `api_consumers attributed_to api_usage_metrics`. | Draft 6 to 8 intra-domain edges (verb + inverse + relationship_type + relationship_kind + is_required + owner_side) and load. |
| B1-S8 | B8 | 7 outbound + 1 inbound handoffs; only 1 cross-domain rel edge exists (inbound `test_cases is_triggered_by api_specifications`). Missing outbound payload-target edges mirroring published handoffs to VSDP / IPAAS / OBS / SUB-MGMT / IGA / TEST-MGMT / GRC. | Draft 6 outbound cross-domain edges; some may defer pending neighbor master ownership. |
| B1-S9 | B11 | 0 aliases across 7 masters. Vendor synonyms available for `api_specifications`, `api_consumers`, `api_deployments`, `api_gateways`, `api_policies`. | Draft 8 to 12 alias rows; load via cluster-drafts pattern. |
| B1-S10 | B12 (Rule #12) | 0 lifecycle states across 5 workflow-bearing masters. `api_versions`, `api_deployments`, `api_specifications`, `api_consumers`, `api_policies` need state machines with `domain_module_id` on realizing module. `api_usage_metrics` + `api_gateways` candidate config-shape exemptions (surface to user, do NOT auto-populate `data_objects.notes`). | Author state machines after B1-S1; gated on module shape decision (B2-S1). |
| B1-S12 | F1 (Rule #17) | Skill 29 (`apim-system`) remains `domain_id=79, domain_module_id=NULL`. Acceptable transitional until any per-module system skill exists; once one does, this row needs deletion + per-module skill rebuild. | After B1-S1: author one `<module_code_lower>_agent` skill per module, re-link the 7 `skill_tools` query rows to the right module skills, then DELETE skill 29. |
| B1-S13 | F3 / Phase-S floor | Skill 29 only carries 7 `query` tools. No mutate / side_effect / compute primitives, no notification abstractions. Required floor per Rule #17 is at least 1 query + 1 mutate + 1 workflow gate per module skill. | After B1-S1 + B1-S12: author per-module mutate tools (`create_api_version`, `publish_api_deployment`, `update_api_policy`, `onboard_api_consumer`, `revoke_api_consumer`), `notify_person` / `notify_team` abstractions for breaking-change + quota-breach broadcasts. |
| B1-S14 | C1 Information Security INSERT (partial S15 carryover) | The IT Operations PATCH half landed on 2026-05-31; the Information Security `contributor` INSERT half is still owed. | Insert `business_function_domains` row for Information Security with `responsibility_type='contributor'`, scope = policy authoring + consumer access governance. |

Note: prior B1-S5 (event_category PATCHes), B1-S7 (user edges), B1-S15 partial (IT Ops flip), and B1-H1 (APQC tagging on 6 of 8 handoffs; the remaining 2 already existed) all closed on the 2026-05-31 continuation and are NOT carried forward.

Bucket 1 finding-type counts:

| Finding type | Count |
|---|---|
| STRUCTURAL (S1 to S4, S14) | 5 |
| BOUNDARY (S6, S8) | 2 |
| Phase-S authoring (S9, S10, S12, S13) | 4 |
| APQC TAGGING | 0 (all 8 already tagged in continuation) |
| **Bucket 1 total** | **10** |

### Bucket 1 dependency chain

- B1-S1 (M1) is the hard blocker. B1-S2, B1-S10, B1-S12, B1-S13 all gate on it.
- B1-S2 (capabilities) depends on B2-S1 (module shape).
- B1-S10 (lifecycle states) depends on B1-S1 (each state's `domain_module_id`).
- B1-S12 / B1-S13 depend on B1-S1 first, then on B1-S12 sequencing.
- B1-S3, B1-S4, B1-S6, B1-S8, B1-S9, B1-S14 are independent of M1 and can ship in parallel (subject to Bucket 2 + Bucket 3 dependencies noted on the rows).

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | Module split shape for APIM | The catalog has no module set today. Three plausible shapes: (a) 4 modules (`APIM-DESIGN-LIFECYCLE`, `APIM-GATEWAY-RUNTIME`, `APIM-CONSUMER-MGMT`, `APIM-DEVELOPER-PORTAL`); (b) 3 modules (collapse design + portal); (c) 2 modules (control-plane vs data-plane). With 6 to 8 capabilities expected (B1-S2) M2 requires at least 2 full modules under any shape; (a) mirrors how Apigee, Kong Konnect, and Azure APIM market their product surfaces. | Editorial / product-shape decision: (a) 4 modules, (b) 3 modules, (c) 2 modules. |
| B2-S2 | B4 pattern flag positive re-evaluation per Rule #12 | The workflow-shape decision is the user's. Proposed positive flips: `api_specifications.has_submit_lock=true` (published specs freeze so contract tests pin to immutable revision), `api_specifications.has_single_approver=true` (one API product owner per spec), `api_policies.has_single_approver=true` (one platform-engineering reviewer per policy), `api_consumers.has_personal_content=true` (developer contact details are personal data subject to GDPR). `api_versions`, `api_deployments`, `api_usage_metrics`, `api_gateways` stay false. | Per-flag yes/no on the 4 proposed positives. |
| B2-S3 | Regulations applicable to APIM (A2 / `domain_regulations` gap) | `domain_regulations` returns 0 rows for APIM. Consumer-facing APIs + developer-portal personal data fall under GDPR; policy / audit logs on gateways are SOX / PCI-DSS load-bearing for regulated industries. | (a) GDPR + SOX + PCI-DSS; (b) GDPR only; (c) leave empty. |

### Bucket 3, Phase 0 pending (speculative)

| ID | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-S1 | Missing APIM substrate entities | Flagship vendor patterns: `api_products` (Apigee, Kong, Azure APIM, IBM, MuleSoft), `api_subscriptions` + `api_plans`, `api_keys`, `oauth_clients`, `developer_portals`, `api_documentation`, `api_audit_logs`, `api_rate_limits`, `api_quotas`, `backends` / `upstream_services` (Kong "Service", Apigee "Target Server"), `api_categories` / `api_taxonomies`, `api_change_proposals`. The 7 currently-loaded masters are the headline-noun set; the workflow-substrate is largely absent. | Phase 0 vendor research against Apigee, Kong Konnect, MuleSoft Anypoint, Azure APIM, AWS API Gateway, IBM API Connect. Cross-check against API-SEC + EVENT-BROKER candidates queued in `_missing-domains.md`: if API-SEC promotes, `api_audit_logs` + `api_threat_signals` may route there; if EVENT-BROKER promotes, async-API artifacts route there. |

### Cross-bucket dependencies

- B1-S1 depends on B2-S1 (module shape) before it can be loaded.
- B1-S2 depends on B2-S1 (each capability attaches to its realizing module).
- B1-S10 cascades on B2-S2 (pattern flags inform some state machines) and on B1-S1 (module FKs).
- B1-S8 partly cascades on B3-S1 vendor research (TEST-MGMT, OBS, SUB-MGMT target masters may shift).
- B2-S3 (regulations) informs B2-S2, GDPR confirmation makes `api_consumers.has_personal_content=true` more clearly correct.

### Report-only follow-ups (owed by other domains)

| ID | Owing domain | Finding |
|---|---|---|
| RO-1 | IPAAS | Inbound handoff 767 (`integration_connector.credential_expired`) carries NULL `source_domain_module_id`; source side is IPAAS's B10b. |
| RO-2 | IPAAS | Outbound handoff 748 (`api_specification.updated`) carries NULL `target_domain_module_id`; backfill determinate on IPAAS side. |
| RO-3 | TEST-MGMT | Outbound handoff 752 (`api_specification.updated`) carries NULL `target_domain_module_id`; gated on TEST-MGMT modularization. |
| RO-4 | OBS | Outbound handoff 749 (`api_gateway.health_degraded`) carries NULL `target_domain_module_id`; OBS still has no modules per OBS audit. |
| RO-5 | SUB-MGMT | Outbound handoff 750 (`api_usage.quota_breached`) carries NULL `target_domain_module_id`. |
| RO-6 | GRC | Outbound handoff 797 (`api_policy.updated`) carries NULL `target_domain_module_id`. |
| RO-7 | VSDP | Outbound handoff 747 (`api_deployment.published`) carries NULL `target_domain_module_id`. |
| RO-8 | IGA | Outbound handoff 751 (`api_consumer.revoked`) has `target_domain_module_id=148` (IGA-AUTO-PROVISIONING) correctly wired; informational only. |

### JWT errors

None encountered in this audit pass.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass (SKILL.md Rule #21) over the open items in `audits/APIM/state.yaml`. APIM (domain 79) is still UNBUILT (0 `domain_modules`, 0 `capability_domains`); per the state-driven contract the build (B1A-BUILD) and its cascade are SURFACED, not scaffolded. Only build-independent additive/corrective items were executed. All writes landed `record_status='new'`; nothing was approved. One loader, idempotent, run from project root via `bun run`: [.tmp_deploy/2026-06-07_apim_state_driven_execute.ts](../../.tmp_deploy/2026-06-07_apim_state_driven_execute.ts). No JWT errors.

### Executed (28 writes total)

- **entity_type classification (Rule #12), 7 PATCHes.** All 7 masters were `unclassified`. Set deterministically from descriptions + the state file's workflow analysis: 456 api_versions, 457 api_specifications, 458 api_deployments, 459 api_policies, 462 api_consumers → `operational_workflow`; 460 api_usage_metrics → `computed` (aggregate call counts / latency / error rates); 461 api_gateways → `catalog` (gateway infra config). Closes the B13 gap and reframes B1B-S10 (only the 5 workflow masters owe lifecycle states; 460/461 pass B12 with no notes write).
- **Catalog UX (Rule #20 / A4), 1 PATCH.** Domain 79 had empty `catalog_tagline` and `catalog_description`; authored buyer-voice copy (workflow + value, no vendor names, no em-dash, American English) straight into the empty fields. No `domain_modules` exist, so module-level catalog UX (M8) is N/A this pass. Closes B1A-S4.
- **business_function_domains (C1), 1 INSERT.** Added the Information Security contributor row owed since the 2026-05-30 B1-S15 split. Canonical 20-function-spine name is **Security** (function id 28; description covers InfoSec policy, security operations, IAM). Row: `domain_id=79, business_function_id=28, responsibility_type=contributor`. Closes B1A-S14. APIM now has owner (Platform Engineering 91), consumer (IT Operations 92), contributor (Security 419).
- **data_object_aliases (B11), 11 INSERTs.** Generic cross-vendor synonyms (`alias_type='synonym'`, no `industry_id` available): api_specifications (API Proxy, API Definition, API Contract); api_consumers (API Subscriber, API Client App); api_deployments (API Revision, API Environment Deployment); api_gateways (API Runtime, API Proxy Gateway); api_policies (Gateway Plugin, Traffic Policy). Closes B1A-S9.
- **data_object_relationships intra-domain (B6), 7 INSERTs.** Edges between the 7 masters (valid enums: `relationship_kind` ∈ association/composition/reference, `relationship_type` ∈ one_to_one/one_to_many/many_to_many): api_specifications has versions api_versions (composition, one_to_many); api_versions is run by api_deployments; api_gateways hosts api_deployments; api_policies applies to api_deployments (many_to_many); api_deployments is measured by api_usage_metrics; api_deployments is consumed by api_consumers (many_to_many); api_consumers attributed to api_usage_metrics. Closes B1A-S6.
- **solutions + solution_domains (A3), 1 vendor + 8 solutions + 9 links.** Created WSO2 vendor (731). Created 8 flagship solutions reusing existing vendors by name: Apigee (Google), Kong Konnect (Kong), Azure API Management (Microsoft), Amazon API Gateway (AWS), IBM API Connect (IBM), Tyk, WSO2 API Manager, Postman API Platform; MuleSoft Anypoint Platform (173) already existed. Linked all 9 to domain 79 via `solution_domains` at `coverage_level='primary'`. Solution descriptions carry no em-dashes; descriptions are factual market positioning. Closes B1A-S3.

### Surfaced (not written; user decisions / destructive)

- **B2-S1** module split shape (2 / 3 / 4 modules): editorial, gates B1A-BUILD + B1B-S1/S2/S10.
- **B2-S2** B4 pattern-flag positive flips on 4 masters (api_specifications.has_submit_lock, api_specifications.has_single_approver, api_policies.has_single_approver, api_consumers.has_personal_content): these PATCH non-default values onto existing master rows; workflow-shape judgments, surfaced not applied.
- **B2-S3** regulation set for APIM (GDPR+SOX+PCI-DSS / GDPR only / leave empty).

### Left (blocked / superseded / backlog)

- **B1A-BUILD + B1B-S1/S2/S10** blocked on B2-S1 (module shape) and the unbuilt status; build is surfaced, the cascade is left.
- **B1B-S8** outbound cross-domain relationship mirrors: blocked on B3-S1 vendor research (TEST-MGMT, OBS target masters may shift).
- **B1B-S12 / B1B-S13** (per-module system skill migration + per-module tools floor): RETIRED per the 2026-06-06 per-domain-skill supersession; reframed as a note in state.yaml, not carried as open items.
- **B3-S1** Phase 0 substrate-entity research: backlog idea, non-blocking.

### Personas / RACI

Phase P is deferred (B1A-PHASE-P): no personas authored. Candidate personas once the module set lands: API Product Owner (owns specs + breaking-change approval), Platform Engineer (gateway + policy operator), Developer-Portal Manager (consumer onboarding + portal publishing), API Consumer / Subscriber (external developer). Not written this pass.

## 2026-06-08 - Phase 0 + q-file regeneration (Rule #22 remediation)

### Why this pass ran

APIM is UNBUILT (0 `domain_modules`, 0 capabilities) with the whole build gated on market-shape `b2` calls (B2-S1 module split, B2-S2 pattern flags, B2-S3 regulations). The q-file written in earlier passes SKIPPED Phase 0: its recommendations leaned on generic "matches how the major API platforms (Apigee, Kong, Azure API Management) present their product" reasoning with no named-vendor specifics and no Phase 0 report. Rule #22 (forcing step, skill-changelog 2026-06-08) requires every market-shape recommendation to be backed by a CURRENT Phase 0 vendor-surface report produced THIS pass, with the named-vendor evidence embedded INLINE. This pass mirrors the PRM 2026-06-08 remediation. Research + file-authoring only: no DB inserts / updates / deletes; the build stays gated.

### Vendor study

Studied 7 flagship API-management vendors against their 2025-2026 product docs: Apigee (Google), Kong Konnect, MuleSoft Anypoint, Azure API Management, AWS API Gateway, IBM API Connect, Postman API Platform. Report saved to [.tmp_deploy/APIM-phase0-2026-06-08.md](../../.tmp_deploy/APIM-phase0-2026-06-08.md) (flagship-vendor table, surface matrix, compliance entities, per-decision verdicts, modularization hypothesis). Diversity met: pure-play gateway specialist (Kong), design-first specialist (Postman), cloud-native runtime (AWS), three full-lifecycle suites (Apigee, Azure, IBM, MuleSoft). No single compliance specialist anchor (APIM is not a regulation-mandated market like ATS is for FCRA); GDPR + SOX are the load-bearing regimes and apply across vendors.

### Surface-matrix highlights

- **The 7 loaded masters are the headline-noun set.** The consumption substrate (`api_products`, `api_subscriptions`, `api_plans`/rate plans, `oauth_clients`/developer apps, `api_keys`), the publishing substrate (`developer_portals`, `api_documentation`), the separable runtime config (`api_rate_limits`, `api_quotas`), and `backends`/upstream services are ALL Core (>=3 vendors) and currently absent. This is exactly the B3-S1 enumeration, now vendor-confirmed.
- **`api_products` is Core across all full-platform vendors** (Apigee API Product, Azure Product, IBM Product, Kong Konnect API Product, MuleSoft API Group); it is the developer-facing bundle that anchors consumption and monetization.
- **The subscription/contract carries an explicit approval workflow** in MuleSoft (API instance owner approves SLA-tier requests) and IBM (subscription request approval), confirming `api_subscriptions` is workflow-bearing, not just a config row.
- **Published specs are immutable** in AWS (deployments are immutable stage snapshots) and IBM (staged Products become a non-editable specific version); breaking changes are gated onto a new revision across the market. This is the direct evidence for the q2 spec-freeze flag.
- **Vendor packaging maps cleanly to four marketed surfaces** (design/lifecycle, gateway/runtime, consumer/access, developer portal) across Apigee, Azure, Kong Konnect, and IBM, which is the direct evidence for the 4-module split.

### Per-decision verdicts

- **B2-S1 (module split, the gate):** recommend 4 modules (a). Apigee, Azure APIM, Kong Konnect, and IBM API Connect all separate design/lifecycle from gateway/runtime from consumer/access from a first-class Developer Portal. The 2-module control/data-plane shape (c) is the gateway-only-vendor model (Kong OSS, AWS API Gateway) and under-serves APIM's portal + consumer surfaces. Framing signal: the 2025 Gartner MQ for API Management runs as ONE full-lifecycle market (Leaders: Kong, Google/Apigee, MuleSoft, IBM, Axway, Boomi), so APIM splits INTO modules within one domain, not OUT into siblings.
- **B2-S2 (pattern flags):** all four proposed positive flips CONFIRMED. `api_specifications.has_submit_lock=true` (AWS immutable deployments, IBM staged-version non-editability, published-spec-is-the-contract pattern); `api_specifications.has_single_approver=true` (single-owner breaking-change governance, MuleSoft instance-owner contract approval); `api_policies.has_single_approver=true` (policies govern live access; single accountable reviewer is the runtime operating norm; lighter evidence, operational discipline not a vendor-modeled field); `api_consumers.has_personal_content=true` (every developer portal stores PII: Apigee Developer, IBM Consumer Organization, Azure portal user; clearest of the four).
- **B2-S3 (regulations):** recommend GDPR + SOX always, PCI-DSS conditional (q6 option b). GDPR is load-bearing for developer PII; SOX for gateway audit logs + change control at public companies (`api_audit_logs` is Core across all six runtime vendors); PCI-DSS applies ONLY when an API touches card data. This refines the prior flat GDPR+SOX+PCI-DSS recommendation.
- **B3-S1 (substrate entities):** the surface matrix IS the answer. Additive, non-blocking; load per the matrix once modules exist.

### Reversals

None. The fresh evidence CONFIRMED all four pattern flags and the 4-module shape. The only substantive change is the B2-S3 framing nuance: PCI-DSS is now flagged conditional (recommended set GDPR + SOX always, PCI-DSS for payment estates) rather than a flat broad GDPR+SOX+PCI-DSS, and q6 gained a fourth option (b: GDPR + SOX with PCI-DSS conditional) which is now the recommended pick.

### Files written

- [.tmp_deploy/APIM-phase0-2026-06-08.md](../../.tmp_deploy/APIM-phase0-2026-06-08.md) (new Phase 0 report)
- [audits/APIM/q-APIM.md](q-APIM.md) (regenerated with inline named-vendor evidence + Grounding block)
- [audits/APIM/state.yaml](state.yaml) (dated Phase 0 note block at top; B2-S3 options + why updated for the PCI-DSS-conditional nuance; `last_audit` -> 2026-06-08; status stays feedback_needed / next_action_by user)
- [audits/APIM/history.md](history.md) (this section)

No DB writes. No `record_status` stamping. No JWT errors (read-only verification only).

## 2026-06-13 — Agent pass (B9d verification)

Ran the single agent-actionable open item, B1A-B9D-VERIFY (B9d had never run on APIM since the band was added 2026-06-09). Executed `scripts/analytics/b9d_resolver.ts APIM --dry-run` over all 8 cross-domain handoff payloads in BOTH directions (7 outbound: 747 VSDP / 748 IPAAS / 749 OBS / 750 SUB-MGMT / 751 IGA / 752 TEST-MGMT / 797 GRC; 1 inbound: 767 IPAAS->APIM `integration_connectors`). Verdicts: 1 RESOLVED (`api_deployments` pid 52 -> VSDP), 7 UNOWNED (no-master). Zero ORPHAN / MIS-TAG / ROLL-UP; resolver reported "INTENDED OWNER-FILE EDITS (none)" and no destructive proposals, so nothing additive to author into any neighbor and nothing destructive to surface. The 7 UNOWNED-no-master findings are a direct symptom of APIM being unbuilt (masters live only in the legacy `domain_data_objects` rollup; no `domain_module_data_objects` master row exists), and auto-resolve once the module set lands (B1B-S1), so they are subsumed by B1A-BUILD / B1B-S1 and get no separate state item. B1A-B9D-VERIFY resolved and removed from `state.yaml`.

No other corrective-additive work was executable: the 7 masters already carry singular/plural labels and classified `entity_type` (456/457/458/459/462 operational_workflow, 460 computed, 461 catalog); pattern-flag flips are B2-S2, regulations are B2-S3, and the whole build is gated on B2-S1, all user decisions. `next_action_by` flips agent -> user; status stays `feedback_needed`. q-APIM.md re-verified current, unchanged. No DB writes, no `record_status` stamping, no JWT errors (read-only verification only).
