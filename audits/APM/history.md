# APM audit history

## 2026-05-29 — Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 2 full modules (`APM-PORTFOLIO-REGISTRY`, `APM-RATIONALIZATION`); 7 masters (`enterprise_applications`, `application_interfaces`, `technology_platforms`, `business_capability_maps`, `application_costs`, `application_value_scores`, `technology_fit_assessments`); 7 capabilities; 10 solutions (8 primary, 2 secondary); 9 trigger_events; 12 outbound + 2 inbound cross-domain handoffs; 12 aliases; 17 lifecycle states across 5 of 7 masters; 2 system skills + 20 skill_tools rows (strict Semantius score 100%); 3 roles + 6 role_modules + 8 role_permissions.
- **Bucket 1 (in-scope, agent fixable):** 9 structural items + 10-11 APQC tags = ~19-20.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 / market surface):** **16 MISSING entities, 2 WRONG-OWNERSHIP, 0 SCOPE-CREEP, 3 MODULARIZATION** (technology-layer collapse + missing APM-TECH-RISK module + orphan REFERENCE-FRAME-LIBRARY capability).

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| CMDB | 3 | 0 | 1 (configuration_items consumer) | 2 | 6 | Pairwise (full) |
| SAM | 2 | 0 | 1 (software_titles consumer) | 2 | 5 | Pairwise (full) |
| GRC | 2 | 0 | 0 | 1 (retires_to compliance_risks) | 3 | Pairwise (full) |
| BPA | 0 | 2 | 1 (business_process_models consumer) | 0 | 3 | Pairwise (full) |
| ITAM | 1 | 0 | 0 | 1 | 2 | Lightweight |
| ITSM | 1 | 0 | 0 | 1 | 2 | Lightweight |
| SMP | 0 | 0 | 1 (saas_applications consumer) | 1 | 2 | Lightweight |
| DCG | 0 | 0 | 1 (data_products consumer) | 0 | 1 | Lightweight |
| FINOPS | 1 | 0 | 0 | 0 | 1 | Lightweight |
| EPM | 1 | 0 | 0 | 0 | 1 | Lightweight |
| SPM | 1 | 0 | 0 | 0 | 1 | Lightweight |

The dominant cross-domain finding from the pairwise pass is **B1-S9**: zero non-APM module declares `consumer / contributor / embedded_master` on any of the 7 APM masters. Every APM-target domain (SAM, CMDB, GRC, ITSM, ITAM, FINOPS, EPM, SPM) is implicitly consuming via the handoff payload without declaring the DMDO dependency. That's a single rule replicated across 8 domains, captured once below rather than per-neighbor.

Structural pass bands: A / C / E / F (incl. F5 / F7) pass; **M7 hard-fails** (within-domain incoherence on 2 masters); **B9 partial-fail** (missing event rows for 6 workflow-gate states); **B7 partial-fail** (6 duplicate user-edge pairs + 1 wrong-shape lone row); **B9b hard-fail** (zero intra-domain cross-module handoffs); **H1 hard-fail** (4/14 cross-domain handoffs tagged, zero `agent_curated`); event-category invalid on 3 events.

Domain Semantius score (strict) across 2 system skills: **100%** (20 platform / 20 total skill_tools). Operational score also 100%. No channel-primitive linkage (F7 vacuously passes).

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 (hard fail)** | **Within-domain incoherence.** `enterprise_applications` (id 267) and `technology_platforms` (id 269) carry `role='master'` in APM-PORTFOLIO-REGISTRY (103) AND `role='consumer' + necessity='required'` in APM-RATIONALIZATION (104). The M7 rule rejects master+consumer in sibling modules of the same domain: "you don't consume what you also master in the same scope." Two options: (a) Rationalization is meant to be standalone-deployable → promote the two `consumer` rows to `embedded_master` (matches the autonomous-deployable-units pass case in M7), or (b) Rationalization assumes Registry is always co-installed → DELETE the two consumer rows (the master row in 103 is authoritative for the whole domain). Recommendation: (b), because Rationalization's whole purpose is to score what Registry inventories; standalone Rationalization without Registry has nothing to score. | DELETE the two `domain_module_data_objects` rows: (`domain_module_id=104, data_object_id=267, role='consumer'`) and (`domain_module_id=104, data_object_id=269, role='consumer'`). |
| B1-S2 | **B9 missing events** | 6 lifecycle states have `requires_permission=true` but no matching `trigger_events` row. Missing events: `business_capability_map.published` (state 248/published), `enterprise_application.sunsetting` (state 267/sunsetting — current `application.lifecycle_state_changed` is too generic), `technology_platform.declining` + `technology_platform.retired` (states 269/declining, 269/retired), `technology_fit.approved` (state 270/approved), `application_interface.deprecated` + `application_interface.retired` (states 271/deprecated, 271/retired). | Insert 7 `trigger_events` rows, each `event_category='state_change'`, `data_object_id` pointing at the publishing master. Re-target existing handoffs that currently piggyback on `application.lifecycle_state_changed` (handoffs 238, 237) once the focused `enterprise_application.sunsetting` event exists. |
| B1-S3 | **trigger_events.event_category** | 3 events have empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 357 `capability_map.updated`, 936 `technology_platform.registered`, 937 `technology_platform.sunset`. | PATCH: 357 → `state_change`; 936 → `lifecycle`; 937 → `state_change`. |
| B1-S4 | **B7 duplicate user-edges** | 6 pairs of duplicate rows in `data_object_relationships` between `users` (748) and each APM master. Each pair carries a noun-phrase form (`owned applications`) AND a verb-shape form (`owns_application`). Plus one lone noun-phrase row (`recorded costs` users→268). The verb-shape rows are the correct shape per the catalog's other domains; the noun-phrase rows are legacy and conflict at the cardinality level (two rows where one belongs). | DELETE the 6 noun-phrase rows (users→{267,269,271,248,272,270}). Rename the lone `recorded costs` row's `relationship_verb` to `records_application_cost` (or insert a new properly-shaped row and DELETE the legacy). |
| B1-S5 | **B9b (hard fail)** | **Zero intra-domain cross-module `handoffs` rows for APM** despite 2 modules with obvious cross-module flows. Expected rows from `data_object_relationships` between cross-module masters: `enterprise_applications` (mastered by 103) → `application_costs` / `application_value_scores` / `technology_fit_assessments` (mastered by 104); `technology_platforms` (103) → `technology_fit_assessments` (104). Each names a cross-module event chain that today is invisible to the catalog. Required intra-domain handoffs: (a) `103 → 104` on `enterprise_application.onboarded` so Rationalization picks up new apps to score, (b) `103 → 104` on `technology_platform.registered` so Rationalization picks up new platforms to fit-assess, (c) `104 → 103` on `application_value.recalculated` so Registry can drive sunset decisions, (d) `104 → 103` on `technology_fit.assessment_completed` so Registry can drive decline/retire on platforms. | Author 4 intra-domain handoff rows with `source_domain_id=target_domain_id=10`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`. |
| B1-S6 | **B8 missing cross-domain relationships** | 12 outbound handoffs but only 9 cross-domain `data_object_relationships` rows. Missing edges (per handoff payload → target master): handoff 1195 (`technology_fit.assessment_completed` → GRC, payload `technology_fit_assessments`) → no relationship to a GRC-mastered target; handoffs 1196/1197 (`application_cost.updated` → FINOPS/EPM, payload `application_costs`) → no relationship to a cost/budget target; handoff 1198 (`application_value.recalculated` → SPM, payload `application_value_scores`) → no relationship to an SPM-mastered target. Proposed verbs: `informs_compliance_assessment`, `feeds_cost_allocation`, `informs_portfolio_review`. Resolution may need to defer if the target-side master rows aren't loaded yet. | Surface to user; load the 4 missing relationship rows once target-side masters are identified. |
| B1-S7 | **B10b report-only** | 7 outbound handoffs (235, 238, 855, 1195, 1196, 1197, 1198) carry NULL `target_domain_module_id`. Targets: SAM (×2), GRC (×2), FINOPS, EPM, SPM. Per B10b's asymmetry rule the NULL is the target domain's B10b — not APM's to fix. APM's own side (`source_domain_module_id`) is populated on every outbound row. | Schedule b1 audits for SAM, GRC, FINOPS, EPM, SPM to derive their `target_domain_module_id` per the standard B10b backfill procedure. |
| B1-S8 | **B10b report-only** | 2 inbound handoffs from BPA (181, 182) carry NULL `source_domain_module_id`. BPA owns this fix in its own b1 audit. APM's `target_domain_module_id` is populated (both rows → 103). | Schedule a BPA b1 audit. |
| B1-S9 | **Pairwise — missing consumer DMDOs on every APM-target domain** | M7 catalog-wide check returned ZERO rows where any non-APM module declares `role IN (consumer, contributor, embedded_master)` on the 7 APM masters. Every domain that receives APM events (SAM, CMDB, GRC, ITSM, ITAM, FINOPS, EPM, SPM) implicitly depends on `enterprise_applications` / `technology_platforms` / `application_costs` / `application_value_scores` / `technology_fit_assessments` but does not declare the dependency at the module layer. This is the reverse-direction Section-4 finding from pairwise reconciliation. The Section-3 mirror — missing handoff rows for declared consumers — is harder to surface because there are no declared consumers to mirror. | Each target domain's b1 audit should add a `consumer` DMDO row on the relevant APM master where the receiving module actually reads the payload. Not APM's fix to make; surface in this audit so the target audits can pick it up. |

#### APQC TAGGING (matches the SKILL anti-pattern: prior audits ship structural fixes but zero tags)

Only 4 of 14 cross-domain handoffs carry `handoff_processes` rows. **All 4 are `proposal_source='discovery_substring'`; zero `agent_curated`.** All 4 point at the same PCF row: "Review and monitor application security controls" (20740 L4). That's a substring match on "application" — a weak fit. Volume expectation per SKILL: 0.5N to 0.8N for N=14 → 7-11 agent_curated tags.

Routine high-confidence tags to author at audit time:

| handoff_id | source → target | trigger_event | payload | Proposed PCF (process_name / external_id) | Confidence |
|---|---|---|---|---|---|
| 853 | APM-PORTFOLIO-REGISTRY → ITAM | `technology_platform.registered` | `technology_platforms` | Manage IT assets (10568 L3 or child) — verify | confident L3 |
| 235, 236 | APM-PORTFOLIO-REGISTRY → SAM / CMDB | `application.onboarded` | `enterprise_applications` | Manage IT change (10567 L3) OR Develop and manage IT architecture (10566.x) | needs PCF lookup at fix time |
| 237, 238 | APM-PORTFOLIO-REGISTRY → CMDB / SAM | `application.lifecycle_state_changed` | `enterprise_applications` | Manage IT change (10567) | confident L3 |
| 239 | APM-PORTFOLIO-REGISTRY → ITSM | `application_interface.broken` | `service_incidents` | Manage IT operations (10566) — incident creation flow | confident L3 |
| 854, 855 | APM-PORTFOLIO-REGISTRY → CMDB / GRC | `technology_platform.sunset` | `technology_platforms` | Manage IT change (10567 — retirement) | confident L3 |
| 1195 | APM-RATIONALIZATION → GRC | `technology_fit.assessment_completed` | `technology_fit_assessments` | Manage IT risk (10570 or child) | confident L3 |
| 1196, 1197 | APM-RATIONALIZATION → FINOPS / EPM | `application_cost.updated` | `application_costs` | Manage business unit / corporate accounting (10737 or 10741) | needs PCF lookup |
| 1198 | APM-RATIONALIZATION → SPM | `application_value.recalculated` | `application_value_scores` | Develop business strategy / Manage strategic initiatives | needs PCF lookup |
| 181 | BPA → APM-PORTFOLIO-REGISTRY | `capability_map.updated` | `business_capability_maps` | Develop and manage business capabilities (10006 L3) | confident L3 |
| 182 | BPA → APM-PORTFOLIO-REGISTRY | `process_model.published` | `business_process_models` | Develop and manage processes / Manage business process management (10031 or child) | confident L3 |

The 4 existing `discovery_substring` rows on handoffs 235/236/237/238 all point at "Review and monitor application security controls" (20740 L4), which is a security-controls leaf — a wrong PCF for a portfolio-management onboarding event. The candidate tag should likely REPLACE the discovery substring row (per Discover Pass 1.5 procedure: human-curated / agent-curated override discovery_substring).

| ID | Finding type | Count |
|---|---|---|
| STRUCTURAL (M7 + B9 + B9b + B7 + event_category + report-only) | 9 |
| APQC TAGGING (high-confidence) | 10-11 |
| **Bucket 1 total** | ~19-20 |

### Bucket 2 — Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #15 notes-pollution on `skill_tools`** — all 20 `skill_tools` rows for APM's two system skills (155, 156) carry populated `notes` fields with descriptive workflow text ("Maintain interface records; drive deprecated/retired transitions.", "Architect-of-record approval workflow gate.", etc.). Rule #15 mandates `notes` columns are empty by default and only ever populated with explicit per-row user-approved wording. The audit obligation when Rule #15 has been violated is "revert the polluting writes" + append an entry to `references/skill-changelog.md` Incidents section. Were these notes user-approved at load time, or were they auto-populated by the loader? | Cannot tell from audit alone; the notes might have been explicitly approved during the Phase-S load (in which case they stay) or auto-written (in which case Rule #15 mandates revert). | (a) Confirm these were user-approved; leave in place. (b) Confirm auto-population; PATCH all 20 rows to empty string and log the Rule-#15 incident. |
| B2-S2 | **Rule #15 notes-pollution on `data_objects`** — `application_costs` (268) and `application_value_scores` (272) carry populated `notes` text recording the Rule-#12 config-shape exemption ("Config-shape master: time-series cost snapshots, no per-state permissions needed. ... Lifecycle states intentionally omitted per Rule #12 exemption."). Rule #15 specifically rescinded the prior Rule #12 license to write the config-shape exemption to `data_objects.notes`. Same audit obligation as B2-S1. | Same — load-time approval status unknown. | (a) User-approved at load time, leave. (b) Auto-written; PATCH to empty string and record the decisions in this audit file instead (audit conversation IS the approved persistence surface per Rule #15). |
| B2-S3 | **B4 pattern flag positive re-evaluation per Rule #12** — current flags: `technology_fit_assessments.has_single_approver=true`. Every other master has all three flags false. Audit needs positive confirmation that the false-by-default is the right answer. Specifically: should `business_capability_maps.has_submit_lock=true` (capability maps should freeze at `published` so dependents have a stable surface)? Should `application_value_scores.has_submit_lock=true` (a quarterly score snapshot should be immutable once recorded)? Should `enterprise_applications.has_personal_content=true` (application records often carry technical-owner contact info)? | Pattern flags are workflow-shape judgments the user owns; the default false doesn't establish review. Per Rule #15, recording the consideration in `notes` is forbidden. | Per-flag yes/no from user; the decisions are captured below. |
| B2-S4 | **E6 permission-bundle drift hint** — `ENTERPRISE-ARCHITECT` (id 10049) has `apm-portfolio-registry:manage` (tier `baseline-manage`) but is separately granted `publish_business_capability_map` (one workflow gate in 103). The other 4 workflow gates in 103 (`sunset_application`, `decline_technology_platform`, `retire_technology_platform`, `deprecate_application_interface`, `retire_application_interface`) are NOT in the bundle. Either rely on Semantius `permission_hierarchy` to auto-include them under `:manage` (and drop the explicit `publish_business_capability_map` grant as redundant), or grant the missing gates explicitly. | Editorial / RBAC-design decision. Hierarchy behavior depends on what `permission_hierarchy` rules are seeded; the audit doesn't introspect those. | (a) Drop explicit `publish_business_capability_map`, rely on hierarchy. (b) Add the 5 missing workflow gates to EA's bundle explicitly. (c) Leave drift — EA approves capability map publishes but the other lifecycle gates belong to a different role (e.g. Application Owner). |

### Bucket 3 — Phase 0 pending (speculative; from market-audit subagent)

Market-audit subagent ran the semantic pass against LeanIX, ServiceNow APM, MEGA HOPEX, Ardoq, and Apptio. Full surface matrix at `c:/tmp/APM-market-surface-2026-05-29.md`. Headline counts: **MISSING 16, WRONG-OWNERSHIP 2, SCOPE-CREEP 0, MODULARIZATION 3.**

The substrate finding: the loaded footprint covers application + capability + interface + cost + value well, but the **technology layer is collapsed onto one master** (`technology_platforms`). All four flagships split it three ways: products (catalog), services (DB/OS/queue), platforms (hosting). The risk/compliance surface (vulnerabilities, application risks, lifecycles, standards, controls, obligations) has no home and would overload either existing module if added directly. The market subagent recommends a third module **APM-TECH-RISK**.

#### MISSING (16) — proposed module assignment

| Entity | Proposed module | Rationale |
|---|---|---|
| `application_modules` | APM-PORTFOLIO-REGISTRY | Sub-application deployed units (microservice / instance level). Every flagship distinguishes from the application master. |
| `technology_products` | APM-PORTFOLIO-REGISTRY | Master product catalog (Software Model / Tech Product). Currently absent; `technology_platforms` is only the hosting layer. |
| `technology_services` | APM-PORTFOLIO-REGISTRY | Infra services (DB, OS, queue). Layer between application and platform. |
| `data_stores` | APM-PORTFOLIO-REGISTRY | Persistent dataset / database instance. Common across flagships. |
| `technology_lifecycles` | APM-RATIONALIZATION or new APM-TECH-RISK | Vendor lifecycle dates per product/version. Source of TPM risk. |
| `technology_standards` | APM-RATIONALIZATION | Approved / Restricted / Retired classification driving rationalization. |
| `technical_vulnerabilities` | new APM-TECH-RISK (Compliance) | CVE-style records tied to products. ServiceNow `sn_vul_vulnerability`, Ardoq Vulnerability. |
| `application_risks` | APM-RATIONALIZATION or new APM-TECH-RISK | Aggregated risk score per application, distinct from per-product vulnerability. |
| `application_assessments` | APM-RATIONALIZATION | Indicator / survey instance behind every score. The missing plumbing. |
| `application_lifecycles` | APM-PORTFOLIO-REGISTRY | Phase rows per application (Plan / Active / Sunset). Distinct from `enterprise_applications` itself. |
| `application_user_groups` | APM-PORTFOLIO-REGISTRY | M:N user / group consumption mapping. |
| `providers` | master / APM-PORTFOLIO-REGISTRY | Vendor of product or app. Today implicit via `saas_applications` consumer link. |
| `application_contracts` | APM-RATIONALIZATION | Contract governing app or product. May promote existing `contracts` master rather than new entity. |
| `reference_architecture_models` | APM-PORTFOLIO-REGISTRY | Backing entity for the orphan REFERENCE-FRAME-LIBRARY capability. |
| `application_capabilities_realization` | APM-PORTFOLIO-REGISTRY | M:N join between `enterprise_applications` and `business_capability_maps`. The single most-queried relationship in flagship APM. |
| `application_to_process_support` | APM-PORTFOLIO-REGISTRY | M:N join between `enterprise_applications` and `business_process_models`. |
| `compliance_obligations` | new APM-TECH-RISK | DORA / GDPR application-level compliance. |
| `application_controls` | new APM-TECH-RISK | Control mapped to application. |

(Some entities may collapse onto pure `data_object_relationships` rather than first-class masters — the subagent's "M:N realization" rows are good candidates. To be decided per-entity at fix time.)

#### WRONG-OWNERSHIP (2)

- **`technology_platforms` is the hosting layer, not the catalog.** Keep it in APM-PORTFOLIO-REGISTRY but add `technology_products` and `technology_services` alongside as separate masters. Reshape relationships accordingly: `enterprise_applications.runs_on` → `technology_platforms` stays, but the new `application_modules` would point at `technology_products` / `technology_services`.
- **`application_costs` vs `cloud_subscriptions` split.** Apptio + ServiceNow model per-subscription cloud cost as a separate concept. Consider whether `cloud_subscriptions` should sit in Portfolio Registry while costs roll up to Rationalization. Decision needed.

#### MODULARIZATION ISSUE (3)

- **APM-TECH-RISK as a third module** owning `technology_lifecycles`, `technology_standards`, `technical_vulnerabilities`, `application_risks`, `compliance_obligations`, `application_controls`. Mirrors the ServiceNow TPM/GRC split. Would push APM from a 7-capability / 2-module shape (current M2 floor satisfied) to a 9-or-10-capability / 3-module shape, well above floor. New capabilities likely: `APM-TECH-RISK-ASSESS`, `APM-TECH-VULN-MGMT`.
- **`application_assessments` as shared plumbing.** Keep as master in APM-RATIONALIZATION; APM-TECH-RISK consumes it for risk scoring.
- **REFERENCE-FRAME-LIBRARY capability has no backing entity.** Either add `reference_architecture_models` (preferred), or retire the dangling capability.

**Bucket 3 prompt:** vet via formal Phase 0 vendor research (a second-pass subagent producing a tighter `c:/tmp/APM-phase0-<date>.md` with vendor entity surfaces per row), or eyeball-mode (you name which of the 16 to treat as confirmed and we add them via Phase B to the relevant module — with the APM-TECH-RISK third module created in Phase A first)?

The strongest signal in the diff is the technology-layer collapse (`technology_products` + `technology_services` + `technology_lifecycles` are all Core class and all missing). If you only commit to part of the work, that's the highest-leverage cluster.

### Cross-bucket dependencies

- B2-S1 / B2-S2 (Rule #15 notes pollution) are **independent** of Bucket 3 — the question is about load-time approval, not market surface.
- B1-S6 (missing B8 cross-domain relationships) is **dependent** on Bucket 3: until the market subagent surfaces what FINOPS / EPM / SPM canonically master, we can't author the relationship's target end deterministically.
- B1-S9 (pairwise — missing consumer DMDOs on every APM-target) is **independent** of Bucket 3 but creates work for 8 other domains' audits.

### Per-bucket prompts

**Bucket 1 — fix these now?** Reply with: `all`, or list (e.g. `S1, S2, H1-top10`), or `skip`.

- **S1 (M7 hard fail — DELETE 2 consumer DMDO rows in module 104, or promote to `embedded_master`):** decide DELETE vs. promote first.
- **S2 (B9 — insert 7 missing trigger_events, re-target 2 handoffs):** structural; no other dependencies.
- **S3 (event_category PATCH on 3 events):** trivial; one PATCH each.
- **S4 (B7 — DELETE 6 duplicate user-edges + rename 1 lone noun-phrase verb):** mechanical.
- **S5 (B9b — insert 4 intra-domain cross-module handoff rows):** depends on S1 (the M7 outcome shapes how Rationalization sees Registry's masters).
- **S6 (B8 missing cross-domain relationships):** gated on Bucket 3 (need target-side masters).
- **S7 / S8 (B10b report-only):** schedule audits for the 5 + 1 target / source domains; not APM's fix.
- **S9 (Pairwise missing consumer DMDOs):** schedule b1 audits for 8 target domains.
- **H1 (APQC tagging — 10-11 high-confidence rows above, optionally replacing the 4 discovery_substring rows):** load now or in a follow-up batch?

**Bucket 2 — what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 / B2-S2 (Rule #15 notes):** the audit can revert if you confirm auto-population. If they were approved, say so and I leave them.
- **B2-S3 (pattern flags):** per-flag yes/no.
- **B2-S4 (EA permission bundle drift):** which option (a/b/c)?

**Bucket 3 — Phase 0 pending — vet via formal Phase 0 vendor research or eyeball-mode?** Will surface candidates when the subagent returns.

## 2026-05-31, Continuation: B1 technical fixes

Subagent pass applied truly-technical B1 fixes that the original audit pre-specified with concrete IDs, values, or operations. Judgment items (user picks, gated, surface-for-user) deferred for the main thread.

### Fixes applied

| ID | Type | Operation | Rows touched |
|---|---|---|---|
| B1-S3 | PATCH enum backfill | `trigger_events.event_category` set to audit-specified values | 3 (ids 357 → `state_change`, 936 → `lifecycle`, 937 → `state_change`) |
| B1-S4 | DELETE stale rows + PATCH naming rename | DELETE 6 noun-phrase duplicate user-edges; PATCH 1 lone user-edge's `relationship_verb` to verb-shape | 7 (DELETE ids 223, 224, 225, 226, 227, 228; PATCH id 229 `relationship_verb` to `records_application_cost`) |

UI spot-check:
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/data_object_relationships

### Deferred

| ID | Reason |
|---|---|
| B1-S1 (M7 hard fail) | Audit offers two options (DELETE vs. promote to `embedded_master`) with explicit "decide" prompt; user picks. |
| B1-S2 (B9 missing events) | INSERT new `trigger_events` rows. Creating new lifecycle / state-change event rows is a new-entity authoring step, not one of the truly-technical apply types in this pass. Also depends on the publishing-master state machine being authored coherently. |
| B1-S5 (B9b intra-domain handoffs) | INSERT 4 new `handoffs` rows. New entity authoring; explicitly "depends on S1" outcome. |
| B1-S6 (B8 cross-domain relationships) | Audit text says "Surface to user; load the 4 missing relationship rows once target-side masters are identified." Gated on Bucket 3 target-side master existence. |
| B1-S7 (B10b SAM/GRC/FINOPS/EPM/SPM) | Report-only per audit; "not APM's to fix" — belongs in those domains' own B1 audits. |
| B1-S8 (B10b BPA) | Report-only per audit; BPA owns the fix in its own b1 audit. |
| B1-S9 (Pairwise missing consumer DMDOs) | Report-only per audit; "Not APM's fix to make" — each of 8 target domains owns its own DMDO addition. |
| APQC tagging (10-11 rows) | Audit pre-specifies external_ids (10006, 10566, 10567, 10568, 10570) that do NOT resolve in our live `processes` table; only 10031 / 10737 / 10741 exist and none match the audit's intended PCFs by name. Per the technical rule "INSERT `handoff_processes` ONLY when audit pre-specifies `handoff_id` + resolvable PCF," no rows qualify. Re-querying APQC by name to pick a substitute PCF crosses into judgment territory (the same shape as the existing `discovery_substring` rows the audit wants replaced with confident tags), so the entire APQC block defers to the main thread for PCF reconciliation or a Discover-pass refresh of the `processes` table. |

### Counts

- Total B1 items in original audit: 9 structural (S1–S9) + 10–11 APQC = 19–20.
- Technical fixes applied: 2 IDs (B1-S3, B1-S4), 10 row writes (3 PATCH + 6 DELETE + 1 PATCH).
- Deferred: 7 structural IDs + 10–11 APQC = 17–18 items.

### Loader

No loader needed; all writes fit in ≤3 ops per fix. Direct `semantius call crud postgrestRequest` invocations from project root (`c:/dev/domain-map`). If the deferred items get unlocked in the main thread, a loader at `c:/dev/domain-map/.tmp_deploy/fix_apm_b1_phase2_2026_05_31.ts` would be the staging slot.

### No JWT errors during this pass.

## 2026-05-31 — Audit (Validate b1, structural)

### Summary

Structural-only Validate b1 audit (A / M / B / C / E / F / H bands). Re-checks the open items from the 2026-05-29 audit after the 2026-05-31 continuation applied B1-S3 (3 PATCH on `trigger_events.event_category`) and B1-S4 (6 DELETE + 1 PATCH on `data_object_relationships`). Findings below carry forward open items, plus two new bands (A4 + M8 catalog UX backfill under Rule #20) and confirm continuation of the Rule #15 notes-pollution finding.

- Current footprint: 2 full modules (`APM-PORTFOLIO-REGISTRY` id=103, `APM-RATIONALIZATION` id=104), 7 capabilities, 10 solutions (8 primary, 2 secondary), 7 masters (`enterprise_applications` 267, `application_interfaces` 271, `technology_platforms` 269, `business_capability_maps` 248, `application_costs` 268, `application_value_scores` 272, `technology_fit_assessments` 270), 5 consumer DMDOs on 103 (saas_applications, software_titles, configuration_items, data_products, business_process_models), 2 consumer-required DMDOs on 104 (267, 269 — the M7 finding), 9 trigger events, 14 cross-domain handoffs (12 out, 2 in), 0 intra-domain handoffs, 17 lifecycle states across 5 of 7 masters, 12 aliases, 2 system skills + 20 skill_tools (strict Semantius score 100%), 3 roles + 6 role_modules + 13 permissions, 9/14 handoffs APQC-tagged.
- Bucket 1 (b1a + b1b): 4 b1a, 5 b1b. Bucket 2: 3 items. Bucket 3: 1 carry-over.

### Band pass/fail

| Band | Status | Detail |
|---|---|---|
| A1 (domain meta) | PASS | 7 business-meta fields populated. |
| A2 (capabilities) | PASS | 7 caps via capability_domains. |
| A3 (solutions) | PASS | 10 solutions, 8 `primary`, 2 `secondary`. |
| **A4 (catalog UX, Rule #20)** | **FAIL** | `domains.catalog_tagline` and `catalog_description` both empty. Draft + surface to user. |
| M1 (≥1 module) | PASS | 2 full modules. |
| M2 (≥3 caps ⇒ ≥2 mods) | PASS | 7 caps / 2 mods. |
| M4 (cap ↦ ≥1 module) | PASS | 7/7 caps realized. |
| M5 (perm states have module_id) | PASS | all 5 workflow-gate states carry `domain_module_id`. |
| M6 (mod ↦ ≥1 cap) | PASS | 103 realizes 5, 104 realizes 2. |
| **M7 (within-domain coherence)** | **FAIL (carry from 2026-05-29 B1-S1)** | data_objects 267 + 269 carry `role='master'` in 103 AND `role='consumer' + necessity='required'` in 104. Within-domain incoherence per M7 rule. Two options remain: DELETE the consumer rows (Rationalization assumes Registry is co-installed) OR promote to `embedded_master` (autonomous-deployable Rationalization). Recommendation in 2026-05-29 audit stands: DELETE. User picks. |
| **M8 (per-module catalog UX)** | **FAIL** | Both modules carry empty `catalog_tagline` + `catalog_description`. Draft + surface to user. |
| B5/B7 (relationship shape) | PASS | 24 rows across the 7 masters; user-edges normalized (B1-S4 continuation removed 6 noun-phrase duplicates + renamed lone row to `records_application_cost`). |
| **B9 (events for perm-required states)** | **PARTIAL (carry B1-S2)** | 9 events present. Missing focused events for: `business_capability_map.published` (state 248/published), `enterprise_application.sunsetting` (267/sunsetting — currently piggybacks on generic `application.lifecycle_state_changed`), `technology_platform.declining` (269/declining), `technology_platform.retired` (269/retired), `technology_fit.approved` (270/approved), `application_interface.deprecated` (271/deprecated), `application_interface.retired` (271/retired). 7 missing event rows. |
| **B9b (intra-domain handoffs)** | **FAIL (carry B1-S5)** | Zero rows with source_domain_id=target_domain_id=10. Four expected lifecycle_progression edges: 103→104 on `enterprise_application.onboarded`, 103→104 on `technology_platform.registered`, 104→103 on `application_value.recalculated`, 104→103 on `technology_fit.assessment_completed`. Authoring depends on M7 outcome (B1-S1). |
| B10b (target/source NULL FK report-only) | PASS-for-APM | 7 outbound handoffs with NULL `target_domain_module_id` (targets: SAM ×2, GRC ×2, FINOPS, EPM, SPM); 2 inbound from BPA with NULL `source_domain_module_id`. Each is the partner domain's b1 audit fix, not APM's. Carry as cross-domain blocker only. |
| B11 (aliases) | PASS | 12 aliases across the 7 masters; every master has ≥1 alias. |
| B12 (lifecycle states) | PASS | 17 states across 5 of 7 masters. `application_costs` (268) and `application_value_scores` (272) are config-shape (no workflow) — confirmed by audit pattern; tracked under B2-S2 below per Rule #15 (notes prose forbidden). |
| C1 (function coverage) | PASS | 2 rows: `IT Infrastructure` owner, `Software Engineering` contributor. |
| E (roles + permissions) | PASS | 3 roles (`ENTERPRISE-ARCHITECT`, `IT-INFRA-APPLICATION-OWNER`, `IT-INFRA-PORTFOLIO-MANAGER`), 6 role_modules, 13 permissions (6 baseline + 7 workflow-gate). |
| F2 (system skills) | PASS | Exactly 2: `apm_portfolio_registry_agent` (155) on 103, `apm_rationalization_agent` (156) on 104. |
| F3 (skill_tools ≥1 per skill) | PASS | 11 rows on skill 155, 9 rows on skill 156, total 20. |
| F4 (operation_kind ↔ data_object_id pairing) | PASS | All 20 tools are `query`/`mutate` with `data_object_id` populated, `coverage_tier='platform'`. |
| F5 (Semantius score computable) | PASS | Strict 20/20 = 100%, operational 100%. |
| **H1 (APQC tagging)** | **PARTIAL (carry from 2026-05-29)** | 9/14 handoffs tagged: 5 `agent_curated` (853, 854, 181, 182, 1196) + 4 stale `discovery_substring` pointing at PCF 20740 "Review and monitor application security controls" (handoffs 235, 236, 237, 238 — wrong PCF for a portfolio-onboarding event). Untagged: 5 (239, 855, 1195, 1197, 1198). The continuation deferred the H-block citing unresolvable external_ids (10006/10566/10567/10568/10570 not in `processes`). Re-tag now using available APQC PCFs (verified resolvable in continuation: 10031, 10737, 10741; 13/78/1132/1312 confirmed by query). Plus replace the 4 stale `discovery_substring` rows with focused `agent_curated` rows. |

### Bucket 1 — In-scope confirmed gaps

#### b1a (agent-solvable, no cross-domain blocker)

| ID | Band | Finding | Action |
|---|---|---|---|
| B1A-A4 | A4 | `domains.catalog_tagline` and `catalog_description` are empty on the APM row (id=10). Rule #20 backfill-with-surface allowed. | Draft both fields in buyer voice (workflow + value), surface to user for review BEFORE PATCH. |
| B1A-M8 | M8 | `domain_modules.catalog_tagline` + `catalog_description` empty on both 103 + 104. | Draft per module, surface to user for review BEFORE PATCH. |
| B1A-B9 | B9 | 7 missing `trigger_events` rows for permission-required lifecycle states (`business_capability_map.published`, `enterprise_application.sunsetting`, `technology_platform.declining`, `technology_platform.retired`, `technology_fit.approved`, `application_interface.deprecated`, `application_interface.retired`). | Insert 7 `trigger_events` rows, each `event_category='state_change'`, `data_object_id` pointing at the publishing master. Re-target handoffs 238/237 to consume the focused `enterprise_application.sunsetting` event once it exists. |
| B1A-H1-REPLACE | H1 | Replace 4 stale `discovery_substring` `handoff_processes` rows (handoffs 235/236/237/238 → PCF 20740) with focused `agent_curated` rows pointing at PCF 10031 "Manage business processes" (handoff 237/238 lifecycle_state_changed) and re-tag handoffs 235/236 to a portfolio-onboarding PCF (lookup at fix time). Plus add new `agent_curated` rows for handoffs 239 (interface broken → ITSM, PCF lookup needed), 855 (technology_platform.sunset → GRC), 1195 (technology_fit.assessment_completed → GRC), 1197 (application_cost.updated → EPM, reuse PCF 1132), 1198 (application_value.recalculated → SPM). | INSERT rows where PCF resolvable; defer remainder. |

#### b1b (blocked on cross-domain partners)

| ID | Band | Finding | Blocker |
|---|---|---|---|
| B1B-M7 | M7 | DELETE-or-promote decision on DMDO rows (104, 267, consumer) and (104, 269, consumer). | Bucket 2 (B2-M7-OPTION) — user decision required before write. |
| B1B-B9b | B9b | 4 intra-domain handoffs to author (103↔104 lifecycle_progression edges). | Depends on B1B-M7 outcome (shape of cross-module dependency drives whether handoffs ship). |
| B1B-B10b-OUT | B10b | 7 outbound APM handoffs carry NULL `target_domain_module_id`: 235 → SAM (52), 855 → GRC (15), 1195 → GRC (15), 1196 → FINOPS (41), 1197 → EPM (66), 1198 → SPM (9), 238 → SAM (52). | Each is the target-domain b1 audit's B10b fix; not APM's to write. Audits needed: SAM, GRC, FINOPS, EPM, SPM. |
| B1B-B10b-IN | B10b | 2 inbound handoffs from BPA (136) carry NULL `source_domain_module_id`: 181, 182. | BPA b1 audit owns the fix. |
| B1B-S9 | Pairwise (catalog-wide) | Zero non-APM modules declare `role IN (consumer, contributor, embedded_master)` on any of the 7 APM masters, yet every APM-target domain (SAM, CMDB, GRC, ITSM, ITAM, FINOPS, EPM, SPM) implicitly consumes APM payloads via handoffs. | Each target domain's b1 audit must add the consumer DMDO row. Not APM's fix. |

### Bucket 2 — Surface-for-user (judgment calls)

1. **B2-M7-OPTION** — M7 within-domain incoherence on (267, 269) in module 104. Two options:
   - (a) DELETE the two consumer-required DMDO rows in 104. Rationalization assumes Portfolio Registry is always co-installed (the deployability default for sibling modules in this domain).
   - (b) Promote both to `embedded_master`. Rationalization is meant to be standalone-deployable; ships its own shells of enterprise_applications + technology_platforms.
   - 2026-05-29 recommendation: (a). Rationalization's purpose is to score what Registry inventories; standalone Rationalization has nothing to score.
2. **B2-NOTES-POLLUTION** — Rule #15 violation carries from 2026-05-29 B2-S1 + B2-S2. All 20 `skill_tools` rows on skills 155 + 156 carry populated `notes` (workflow narration: "Maintain interface records; drive deprecated/retired transitions.", "Architect-of-record approval workflow gate.", etc.). `data_objects.notes` populated on 268 ("Config-shape master: time-series cost snapshots, no per-state permissions needed.") and 272 (similar text). Per Rule #15 the only valid state for these columns is empty; the prior carve-out for the Rule #12 config-shape exemption is RESCINDED. Was the wording explicitly user-approved at load time? Options: (a) confirm approved → leave; (b) confirm auto-populated → PATCH all 22 rows to empty string + append Incident entry to `references/skill-changelog.md`.
3. **B2-PATTERN-FLAGS** — Pattern-flag positive re-evaluation (Rule #12). All masters have `has_personal_content`/`has_submit_lock`/`has_single_approver=false` except `technology_fit_assessments` (270) which has `has_single_approver=true`. Should `business_capability_maps.has_submit_lock=true` (capability maps freeze at `published`)? Should `application_value_scores.has_submit_lock=true` (quarterly snapshots immutable once recorded)? Should `enterprise_applications.has_personal_content=true` (technical-owner contact data on the row)? Per-flag yes/no from user.

### Bucket 3 — Phase 0 pending (speculative)

The full 2026-05-29 market-audit subagent pass produced 16 MISSING / 2 WRONG-OWNERSHIP / 3 MODULARIZATION findings against LeanIX, ServiceNow APM, MEGA HOPEX, Ardoq, and Apptio (see prior history section). That candidate set carries forward unchanged into this audit. The technology-layer collapse (single `technology_platforms` master vs. flagships' three-way products/services/platforms split) plus the missing APM-TECH-RISK module remain the highest-leverage cluster.

1. **B3-APM-MARKET-SURFACE** — 16 candidate MISSING entities (`application_modules`, `technology_products`, `technology_services`, `data_stores`, `technology_lifecycles`, `technology_standards`, `technical_vulnerabilities`, `application_risks`, `application_assessments`, `application_lifecycles`, `application_user_groups`, `providers`, `application_contracts`, `reference_architecture_models`, `application_capabilities_realization`, `application_to_process_support`, `compliance_obligations`, `application_controls`) + 2 WRONG-OWNERSHIP (technology layer split + cloud_subscriptions question) + 3 MODULARIZATION (new APM-TECH-RISK module, `application_assessments` shared plumbing, REFERENCE-FRAME-LIBRARY backing entity). Recommended path: vetted Phase 0 vendor research before any inserts, OR eyeball-mode where user names which to treat as confirmed.

### Cross-bucket dependencies

- B2-NOTES-POLLUTION + B2-PATTERN-FLAGS are independent of Bucket 3.
- B1B-M7 is blocked by B2-M7-OPTION (user picks DELETE vs. promote).
- B1B-B9b depends on B1B-M7 resolution.
- B1A-H1-REPLACE is independent.
- B1B-S9 affects 8 partner audits but does not block APM's own state.

### No JWT errors during this pass.
