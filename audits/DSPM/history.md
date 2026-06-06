# DSPM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 modules** (no `domain_modules` row, no `domain_module_host_domains` row). 7 capabilities (`DSPM-DATA-DISCOVERY`, `DSPM-CLASSIFICATION`, `DSPM-ACCESS-AUDIT`, `DSPM-LINEAGE`, `DSPM-RISK-SCORING`, `DSPM-REMEDIATION`, `DSPM-SHADOW-DATA`). 8 masters declared at the `domain_data_objects` rollup layer (`cloud_storage_buckets`, `cloud_databases`, `data_warehouses`, `saas_app_instances`, `iam_access_policies`, `sensitive_data_incidents`, `data_risk_scores`, `shadow_data_findings`), 2 contributor rows (`data_assets` mastered by DCG, `data_classifications` mastered by DCG), 1 consumer row (`data_lineage_relationships` mastered by DCG). 12 solutions (4 primary, 8 secondary). 0 regulations linked. 9 trigger_events (3 with empty `event_category`). 10 outbound + 3 inbound cross-domain handoffs (13 total). 0 intra-domain handoffs (no modules to host any). 0 `data_object_aliases`. 1 `data_object_relationships` row touches DSPM masters (an inbound `reviews` edge from `data_assets` 294 onto `cloud_databases` 337). 0 `data_object_lifecycle_states` across all 8 masters. 0 `business_function_domains`. 0 system skills, 0 `skill_tools`, 0 `role_modules`. Semantius score: **uncomputable** (no skills, no modules).
- **Vendor-surface basis (Pass 2 flagship enumeration):** Cyera Platform, Wiz DSPM, Dig Security (Palo Alto Prisma Cloud Data Security), Sentra DSPM, Securiti Platform, Normalyze, Symmetry Systems DataGuard, Concentric AI Toucan, BigID, OneTrust Data Discovery, Varonis Data Security Platform, IBM Guardium Insights, Polar Security (acquired by IBM), Eureka Security, Theom, Laminar (acquired by Rubrik), Mineral. Compliance-specialist coverage anchored on GDPR (Articles 30, 32, 35), CCPA / CPRA (consumer data inventories), HIPAA (PHI discovery), PCI-DSS 4.0 (cardholder-data scope reduction), and US state breach-notification laws (incident reporting on sensitive-data exposure).
- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 8 items.
- **Bucket 3 (Phase 0 pending, speculative):** 11 items.
- **Candidate-domain queue:** 4 new candidates appended to `audits/_missing-domains.md` (CSPM, CIEM, DDR, AI-SPM).

**Neighbor discovery (auto-derived from handoffs + cross-domain DDO ownership, ranked by edge weight):**

| Neighbor | Out | In | Cross-rels | DDO overlap | Weight | Pass shape |
|---|---|---|---|---|---|---|
| DCG | 2 (285, 846) | 2 (261, 712) | 0 | DCG masters `data_assets`, `data_lineage_relationships`, `data_classifications`, `data_usage_metrics`; DSPM contributes / consumes 3 of these | 7 | Pairwise (full) |
| SECOPS | 2 (287, 290) | 0 | 0 | 0 | 2 | Pairwise (full) |
| IGA | 2 (286, 289) | 0 | 0 | 0 | 2 | Pairwise (full) |
| DLP | 1 (847) | 0 | 0 | both contribute to `data_classifications` (DCG-mastered) | 2 | Pairwise (full) |
| GRC | 1 (848) | 0 | 0 | 0 | 1 | Lightweight |
| AUDIT | 1 (849) | 0 | 0 | 0 | 1 | Lightweight |
| PRIV-MGMT | 1 (288) | 0 | 0 | 0 | 1 | Lightweight |
| DI | 0 | 1 (729) | 0 | DI masters `source_connectors` consumed at DSPM connector layer | 2 | Lightweight |

**Structural pass bands (results, blocking failures first):**

- **M1 hard-fail (Rule #14).** DSPM has **zero** `domain_modules` rows of any `module_kind` and **zero** `domain_module_host_domains` rows. The floor is `>=1 module_kind='full'` regardless of capability count; the 7-capability surface mandates `>=2 module_kind='full'` rows. Every downstream module-keyed band (M2-M7, B1-B8, B10-B11, C, D, E, F) is uncomputable until M1 is fixed. The audit accordingly degrades each downstream band to "blocked on M1" with one exception: H1 is computable (handoffs are domain-keyed, not module-keyed) and is worked below.
- **C1 (blocked-by-context).** 0 `business_function_domains` rows. C1 normally checks `>=1` row mapping the domain to its owning business function. Surfaced here for completeness; the fix runs in the same load as M1 once the user confirms which `business_functions.id` should own DSPM (almost certainly "Information Security" or "IT Risk").
- **B9 partial-fail.** 9 `trigger_events` declared on DSPM masters; 3 carry empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 930 `cloud_database.discovered`, 931 `data_warehouse.classified`, 932 `saas_app_instance.detected`.
- **B12 hard-fail (Rule #12).** 0 `data_object_lifecycle_states` across all 8 masters. Workflow-bearing entities like `sensitive_data_incidents` (open / investigating / resolved / false_positive) and `iam_access_policies` (allowed / flagged_for_review / blocked) plainly need state machines; the static / config-shape exemption does not credibly apply across the whole master set. Pattern flags on all 8 data_objects sit at default `false` for `has_personal_content`, `has_submit_lock`, `has_single_approver`, which is also implausible given the data_object semantics (`sensitive_data_incidents` plainly has personal content; `iam_access_policies` plausibly has `has_submit_lock=true` when changes are signed by a remediation reviewer).
- **B10b (report-only x2).** All 10 outbound handoffs have NULL `source_domain_module_id` (DSPM owes the fix, but it is blocked by M1: there is no DSPM module to point at). 8 of 10 outbound have NULL `target_domain_module_id` (the targets' B10b: DCG, SECOPS, PRIV-MGMT, DLP, GRC, AUDIT). 2 of 10 outbound are partly populated: 286 and 289 point at IGA target_module=146 already. All 3 inbound have NULL on both FKs.
- **H1 hard-fail (Rule on APQC tagging).** 0 of 13 cross-domain handoffs carry a `handoff_processes` row. The structural-pass volume target is 0.5N to 0.8N → 6 to 10 agent_curated proposals.
- **A1-A3 pass.** `domains.id=140` carries full metadata: `crud_percentage=60`, `business_logic` populated with concrete external-computation prose, `min_org_size='30 m <2500'`, `cost_band='$$'`, `certification_required=false`, `usa_market_size_usd_m=750`, `market_size_source_year=2024`. Rule #18 trademark check on `description` and `business_logic` is clean (no vendor names in prose).
- **S1-S3 pass.** Domain row exists with sensible scope description and a sensible distinction from DLP ("Discovers and secures at rest; DLP enforces at egress").
- **Rule #15 notes-pollution check, clean.** Every DSPM master `data_objects.notes` is empty string. No catalog-side notes pollution to revert.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard fail (Rule #14)** | DSPM has 0 modules. With 7 capabilities the rule mandates >=2 `module_kind='full'` rows. The 8 declared masters cluster into 4 obvious modules from the vendor-surface evidence: **DSPM-DISCOVERY-INVENTORY** (masters: `cloud_storage_buckets`, `cloud_databases`, `data_warehouses`, `saas_app_instances`, `shadow_data_findings`; covers the data-store inventory and shadow-data capabilities, lines up with capabilities `DSPM-DATA-DISCOVERY` + `DSPM-SHADOW-DATA`), **DSPM-CLASSIFICATION-LINEAGE** (contributors: `data_assets`, `data_classifications`; consumer: `data_lineage_relationships`; covers `DSPM-CLASSIFICATION` + `DSPM-LINEAGE` capabilities, all backed by DCG masters), **DSPM-ACCESS-RISK** (masters: `iam_access_policies`, `data_risk_scores`; covers `DSPM-ACCESS-AUDIT` + `DSPM-RISK-SCORING`, this is the over-privilege / toxic-combination engine), **DSPM-INCIDENT-REMEDIATION** (master: `sensitive_data_incidents`; covers `DSPM-REMEDIATION`, the workflow surface for triage / containment / remediation playbooks). Surface the module split to the user (B2-S1) before loading. | INSERT 4 `domain_modules` rows + 4 `domain_module_capabilities` mappings (one capability per module bar DSPM-DISCOVERY which gets two) + migrate the existing 11 DDO rows into 11+ DMDO rows in the right modules + INSERT placeholder `embedded_master` rows where modules need them. Loader path: `.tmp_deploy/fix_dspm_m1_modules.ts`. **Gated on B2-S1** (user must confirm the split). |
| B1-S2 | **B9 partial-fail, missing event_category** | 3 trigger_events carry empty `event_category` (Rule #13): 930 `cloud_database.discovered`, 931 `data_warehouse.classified`, 932 `saas_app_instance.detected`. | PATCH: 930 → `lifecycle` (discovery is the first observation of the resource), 931 → `state_change` (classification flips the warehouse from unclassified to classified), 932 → `lifecycle` (detection of a previously-unknown SaaS app instance, same shape as discovery). |
| B1-S3 | **B12 hard-fail (Rule #12), missing lifecycle states** | 0 lifecycle states on 8 masters. Workflow-bearing masters need state machines: `sensitive_data_incidents` (states: `detected` -> `triaged` -> `investigating` -> `contained` -> `resolved` / `false_positive`, `requires_permission=true` on `triaged`, `contained`, `resolved`); `iam_access_policies` (states: `observed` -> `flagged_for_review` -> `under_remediation` -> `corrected` / `accepted_risk`, gates on `flagged_for_review`, `under_remediation`); `data_risk_scores` (states: `pending_calculation` -> `current` -> `stale`, no permission gates, recomputation is automated); `shadow_data_findings` (states: `detected` -> `triaged` -> `assigned_to_owner` -> `resolved` / `accepted_risk`, gates on `triaged`, `assigned_to_owner`); `cloud_storage_buckets` / `cloud_databases` / `data_warehouses` / `saas_app_instances` (config-shape masters with simple `discovered` -> `inventoried` -> `decommissioned` arcs, no permission gates, candidates for the static-shape audit-surface in B2-S2). | INSERT `data_object_lifecycle_states` rows: ~5 for sensitive_data_incidents, ~5 for iam_access_policies, ~3 for data_risk_scores, ~5 for shadow_data_findings, ~3 each for the 4 cloud-store masters = approximately 30 lifecycle-state rows. Each row's `domain_module_id` set to the realizing module from B1-S1. **Gated on B1-S1** (modules must exist first). |
| B1-S4 | **C1 missing, business_function_domains** | DSPM has 0 `business_function_domains` rows. Surface DSPM under Information Security / IT Risk. | INSERT 1 `business_function_domains` row pointing at the Information Security business function (id TBD at fix time via `/business_functions?function_label=ilike.*security*`). |
| B1-S5 | **Anomalous outbound handoff direction** | Handoff 285 (DSPM -> DCG, trigger `data_asset.classified` event 236, payload `data_assets` 300) inverts the canonical ownership: event 236 is owned by data_object 300 which is DCG-mastered, and the inbound handoff 261 (DCG -> DSPM on the same event 236 with the same payload) already wires the canonical direction. Outbound 285 looks like a duplicate-but-reversed insert from an earlier batch. The DSPM-emitted event in this neighborhood is plausibly `data_asset.contributed_classification` (DSPM enriches a DCG-mastered data_asset with its sensitivity tag, DCG re-emits as `data_asset.classified`). | DELETE handoff 285. If DSPM-to-DCG enrichment needs explicit modeling, INSERT a new trigger event `data_asset.contributed_classification` owned by DSPM contributors view + a new handoff using it. Surface as B2-S3 since the choice is editorial. |
| B1-S6 | **Anomalous outbound handoff direction** | Handoff 288 (DSPM -> PRIV-MGMT, trigger `data_classification.sensitivity_elevated` event 273, payload `data_assets` 300) uses an event 273 owned by `data_classifications` (303, DCG-mastered) but carries `data_assets` as payload. The event-source-and-payload coupling is incoherent: either the trigger event should be DSPM-owned (because DSPM is the one elevating sensitivity), or the payload should be `data_classifications` rather than `data_assets`. | Two paths: (a) PATCH handoff 288 `data_object_id` to 303 (`data_classifications`) to align with the event's owning data_object; (b) INSERT a new DSPM-owned trigger event `data_asset.sensitivity_reclassified_by_dspm` and PATCH the handoff to use it. Surface as B2-S4. |
| B1-S7 | **B10b symmetric, DSPM-owed source_domain_module_id on partly-populated outbounds** | Handoffs 286 (DSPM -> IGA, target_module=146) and 289 (DSPM -> IGA, target_module=146) have populated `target_domain_module_id` but NULL `source_domain_module_id`. Once B1-S1 lands the DSPM-INCIDENT-REMEDIATION module 286 publishes from, and the DSPM-ACCESS-RISK module 289 publishes from, are known. The remaining 8 outbound NULL `target_domain_module_id` rows and all inbound NULL FKs are owed by other domains and listed under Report-only follow-ups (NOT duplicated here). | PATCH 286 set `source_domain_module_id=<DSPM-INCIDENT-REMEDIATION.id>`; PATCH 289 set `source_domain_module_id=<DSPM-ACCESS-RISK.id>`. **Gated on B1-S1**. Also PATCH the remaining 8 outbound rows' `source_domain_module_id` (285, 287, 288, 290, 846, 847, 848, 849) once the DSPM modules exist; this side is always DSPM's regardless of the target. |

#### APQC TAGGING (B1-H1)

0 of 13 cross-domain handoffs carry `handoff_processes` rows. Volume target: 6 to 10 agent_curated proposals. The structural-pass analysis produced the following candidate tags. PCF id lookups deferred to fix time (`/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`).

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | Confidence |
|---|---|---|---|---|---|
| 287 | DSPM -> SECOPS | `sensitive_data_incident.detected` | `sensitive_data_incidents` | "Manage IT security, privacy, and data protection" L2 (16435 family) or child "Detect and respond to security incidents" | confident L3 |
| 290 | DSPM -> SECOPS | `sensitive_data_incident.resolved` | `sensitive_data_incidents` | Same family as 287, closure leg under "Detect and respond to security incidents" | confident L3 |
| 286 | DSPM -> IGA | `sensitive_data_incident.detected` | `iam_access_policies` | "Manage identities and access" L3 (under 16435 family) or "Manage entitlements" | confident L3 |
| 289 | DSPM -> IGA | `iam_access_policy.permission_escalation_detected` | `iam_access_policies` | "Manage entitlements" or "Conduct entitlement reviews" | confident L3 |
| 288 | DSPM -> PRIV-MGMT | `data_classification.sensitivity_elevated` | `data_assets` | "Manage compliance with regulations" L3 (under 16437 family) or "Maintain privacy" | confident L3 |
| 846 | DSPM -> DCG | `cloud_database.discovered` | `cloud_databases` | "Manage business information and analytics" L3 or "Establish data governance" | confident L3 |
| 847 | DSPM -> DLP | `data_warehouse.classified` | `data_warehouses` | "Manage IT security, privacy, and data protection" L3, data-protection leg | confident L3 |
| 848 | DSPM -> GRC | `saas_app_instance.detected` | `saas_app_instances` | "Manage compliance with regulations" L3 (16437 family) | medium |
| 849 | DSPM -> AUDIT | `cloud_database.discovered` | `cloud_databases` | "Manage internal audit" L3 (under 16437 family) | medium |
| 285 | DSPM -> DCG | `data_asset.classified` | `data_assets` | (recommended DELETE per B1-S5; do not tag) | n/a |
| 261 | DCG -> DSPM (inbound) | `data_asset.classified` | `data_assets` | "Establish data governance" L3 leg | confident L3 |
| 712 | DCG -> DSPM (inbound) | `data_usage_metric.spike_detected` | `data_usage_metrics` | "Manage information assets and content" L3 or "Monitor data quality" | medium |
| 729 | DI -> DSPM (inbound) | `source_connector.added` | `source_connectors` | Deferred to Discover Pass 3 (no clean cross-industry PCF match for connector lifecycle; modern data-ops concept) | defer |

12 candidate `agent_curated` proposals (one DELETE candidate, one deferral). Each insert: `(handoff_id, process_id, proposal_source='agent_curated', record_status='new', role='implements')`.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 + B9 events + B12 lifecycle + C1) | 4 |
| BOUNDARY / handoff direction (B1-S5, B1-S6) | 2 |
| B10b DSPM-owed source_module_id PATCHes (B1-S7) | 1 |
| APQC TAGGING (high-confidence, B1-H1, 12 candidate rows) | 1 |
| MODULARIZATION ISSUES | 0 (routed to Bucket 2 per the band convention) |
| **Bucket 1 total** | **8 items** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **DSPM module split.** B1-S1 proposes 4 modules: DSPM-DISCOVERY-INVENTORY, DSPM-CLASSIFICATION-LINEAGE, DSPM-ACCESS-RISK, DSPM-INCIDENT-REMEDIATION. Vendor evidence (Wiz, Cyera, Sentra, Securiti) supports this split because every flagship UI separates "Inventory" / "Classification" / "Risk and Access" / "Incidents and Remediation" tabs. Alternative splits include: (alt-a) collapse to 2 modules DSPM-DISCOVERY-RISK + DSPM-INCIDENT-REMEDIATION (matches Wiz's tighter UI); (alt-b) split DSPM-INCIDENT-REMEDIATION further into DSPM-INCIDENT and DSPM-REMEDIATION-PLAYBOOKS if the remediation surface is large; (alt-c) collapse DSPM-CLASSIFICATION-LINEAGE into DSPM-DISCOVERY-INVENTORY since lineage is a thin slice. Recommendation: 4-module split as drafted. | Architectural intent + deployability strategy decision. | (a) 4-module split as drafted. (b) Different module count / split. (c) Defer load, do additional Phase 0 vendor research first. |
| B2-S2 | **Static-shape exemption for the 4 cloud-store masters.** B1-S3 proposes 3-state lifecycles for `cloud_storage_buckets`, `cloud_databases`, `data_warehouses`, `saas_app_instances` (`discovered` -> `inventoried` -> `decommissioned`). These are inventory records; they have no user-workflow gates. The 3 states might be more honestly modeled as a single `discovery_status` enum on the master with no lifecycle-state rows at all (the static-shape exemption from Rule #12). Choosing the exemption requires explicit acceptance because the audit will check it. | Exemption-shape question per Rule #12; user decision. | (a) Author the 3-state lifecycles. (b) Apply the static-shape exemption (no lifecycle rows on these 4 masters, surface decision in this audit log). (c) Mixed (specify per master). |
| B2-S3 | **Outbound handoff 285 direction.** B1-S5 proposes DELETE for the inverted handoff. Alternative is to keep it as a real second leg with a new DSPM-owned trigger event modeling "DSPM contributed a classification to a DCG-mastered data_asset." Which is true to the workflow? | Editorial / workflow-shape question; user decision. | (a) DELETE handoff 285 as duplicate. (b) Keep 285 but PATCH to a new DSPM-owned trigger event (specify the event name). |
| B2-S4 | **Outbound handoff 288 event-payload mismatch.** B1-S6 proposes 2 paths: PATCH payload to `data_classifications` (303), or INSERT a new DSPM-owned event and re-target the handoff. Which path? | Editorial; user decision. | (a) PATCH payload to `data_classifications`. (b) INSERT new DSPM-owned event and re-target. (c) Treat handoff 288 as misconceived and DELETE; the DSPM -> PRIV-MGMT signal is already covered by the SECOPS handoffs. |
| B2-S5 | **Pattern flag re-evaluation (Rule #12) on the 8 masters.** Defaults all read false. Likely true: `sensitive_data_incidents.has_personal_content=true` (incidents reference PII exposures, signer identities, owner emails); `iam_access_policies.has_submit_lock=true` (a remediation review locks the policy from further edits until a human accepts the change); `shadow_data_findings.has_personal_content=true` when the finding is itself a PII discovery; `iam_access_policies.has_single_approver=true` for one-off "accept risk" approvals by the security-team approver. Other 4 masters (`cloud_storage_buckets` etc.) plausibly stay all-false (static-shape inventory). | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no per master from user; capture in Decisions. |
| B2-S6 | **C1 business_function ownership.** The most natural owner is "Information Security" but DSPM could plausibly sit under "IT Risk Management" or "Privacy and Data Protection" depending on the org's business-function taxonomy. | Editorial; user decision; lookup needed at fix time. | (a) Information Security. (b) IT Risk Management. (c) Privacy and Data Protection. (d) Multiple business_function_domains rows (specify). |
| B2-S7 | **Compliance regulation coverage.** DSPM has 0 `domain_regulations` rows. Flagship-vendor evidence makes 5 regulations plainly in scope: GDPR (Art. 30 records of processing, Art. 32 security-of-processing, Art. 35 DPIAs), CCPA / CPRA (consumer data inventories and right-to-know reporting), HIPAA (PHI discovery and access auditing), PCI-DSS 4.0 (cardholder-data scope reduction), US state breach-notification laws (incident reporting on sensitive-data exposure). | Editorial / scope; the audit cannot decide unilaterally which to load. | Per-regulation yes/no with `applicability` (`mandatory` / `recommended` / `optional` per Rule #3); capture in Decisions. |
| B2-S8 | **F-band feasibility once M1 lands.** F2-F5 require >=1 `skills.skill_type='system'` per `domain_modules` row plus `skill_tools` per skill (Rule #17). For a 4-module split that is 4 system skills + ~20-40 skill_tools rows authored alongside the module load. Should the audit treat the F-band as a same-load obligation (Phase-A) or schedule a follow-on F-band-only load? | Scope of the M1 fix; user decision. | (a) Same load: author 4 system skills + tools in the same `.tmp_deploy/fix_dspm_m1_modules.ts`. (b) Separate F-band load after B1-S1 to lighten the first PR. |

### Bucket 3, Phase 0 pending (speculative)

Pass 2 ran the flagship-vendor enumeration against Cyera, Wiz DSPM, Dig Security (Palo Alto Prisma), Sentra, Securiti, Normalyze, Symmetry Systems, Concentric AI, BigID, OneTrust Data Discovery, Varonis, IBM Guardium Insights, Polar Security, Eureka Security, Theom, Laminar (Rubrik). The compliance anchor is GDPR + CCPA + HIPAA + PCI-DSS + US breach-notification laws. The subagent recipe was not spawned (single-pass audit per orchestrator instruction); the candidates below come from analyst flagship-vendor knowledge.

#### MISSING (4) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `data_access_paths` | Cyera, Wiz, Sentra surface "Who can access this data and how" as first-class queryable paths (identity -> role -> permission -> resource). Currently the audit walks the join graph at query time, no master record. Could be a denormalized helper master. | DSPM-ACCESS-RISK |
| `remediation_playbooks` | Cyera, Securiti, Wiz ship parameterized remediation playbooks as first-class records (bucket-public-access-revoke, IAM-overpermission-trim, KMS-key-rotate). Currently the catalog assumes ad-hoc remediation; no playbook master. | DSPM-INCIDENT-REMEDIATION |
| `data_perimeters` | BigID, Securiti, Concentric AI model "data perimeters" as the union of stores subject to a single policy / regulation. Distinct from data_classifications (which tags individual records). | DSPM-DISCOVERY-INVENTORY or a new DSPM-POLICY-PERIMETERS module |
| `toxic_combinations` | Wiz "toxic combinations" feature treats specific multi-factor risk patterns (PII + public-exposure + over-permissive IAM) as first-class findings distinct from `data_risk_scores`. | DSPM-ACCESS-RISK (sibling to `data_risk_scores`) |

#### MODULARIZATION (2) candidates

- **Split DSPM-INCIDENT-REMEDIATION into DSPM-INCIDENT and DSPM-REMEDIATION-PLAYBOOKS.** If `remediation_playbooks` and `sensitive_data_incidents` both warrant module-level scope (Cyera and Securiti split them in the UI), 4 modules become 5.
- **New DSPM-POLICY-PERIMETERS module.** If `data_perimeters` lands as a first-class master with its own policy-mapping and reporting workflow, it warrants its own module (BigID Discovery splits policy-perimeter management from store inventory).

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **GDPR Articles 30, 32, 35** (mandatory for any EU-data-subject footprint).
- **CCPA / CPRA** (mandatory for any California-consumer footprint).
- **HIPAA Security Rule** (mandatory for any US-PHI footprint).
- **PCI-DSS 4.0** (mandatory for any cardholder-data footprint).
- **US state breach-notification laws** (mandatory for any US-resident sensitive-data footprint; jurisdiction-grained applicability).

#### Candidate-domain queue (appended to `audits/_missing-domains.md`)

The audit surfaced 4 adjacent markets where the catalog has no `domains` row but flagship-vendor research suggests a real point-solution market. Queued via `append_missing_domain.ts`:

- **CSPM**, Cloud Security Posture Management (Wiz, Palo Alto Prisma Cloud, Orca Security, Lacework, Check Point CloudGuard, Microsoft Defender for Cloud).
- **CIEM**, Cloud Infrastructure Entitlement Management (Sonrai Security, Saviynt, Ermetic (Tenable), Microsoft Entra Permissions Management, Britive, Authomize (Delinea)).
- **DDR**, Data Detection and Response (Cyera DDR, Dig (Palo Alto), Sentra DDR, Symmetry Systems DataGuard, Varonis DatAlert). Evolving market; DDR is the runtime-response sibling of DSPM's at-rest posture.
- **AI-SPM**, AI Security Posture Management (Wiz AI-SPM, Prisma AIRS (Palo Alto), Lasso Security, Protect AI, HiddenLayer, CalypsoAI). New / emerging market; some flagship DSPM vendors are bolting AI-SPM onto their existing posture engine.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces a Phase 0 markdown at `c:/tmp/DSPM-phase0-<date>.md` confirming per-entity vendor coverage), or eyeball-mode (user names which of the candidates to treat as confirmed and we proceed via Phase B inserts after B1-S1 lands).

### Cross-bucket dependencies

- **B1-S1 (M1) is the bottleneck.** B1-S3 (lifecycle states), B1-S4 (business_function_domains, already mostly independent but the module-permission derivation depends on M1), B1-S7 (partly-populated outbound source_module_id PATCHes), and every Bucket 3 entity candidate gate on B1-S1 landing first. Bucket 2 questions B2-S1, B2-S2, B2-S5, B2-S6, B2-S7, B2-S8 all feed B1-S1 directly.
- **B2-S1 gates B1-S1.** The module split must be confirmed before the loader runs.
- **B2-S5 (pattern flags) and B2-S2 (static-shape exemption) feed B1-S3.** Lifecycle state authoring depends on these decisions.
- **B2-S3 and B2-S4 feed B1-S5 / B1-S6.** Direction-corrections for handoffs 285 and 288 wait on the user's editorial call.
- **B1-H1 (APQC tagging) is independent** of M1 (handoffs are domain-keyed, not module-keyed), but it operates on 13 handoffs whose direction is partly contested by B1-S5 / B1-S6. Recommendation: resolve B2-S3 and B2-S4 first, then tag the corrected handoff set.
- **B3 entity candidates depend on B1-S1.** No new entities load until the modules exist to host them.
- **Bucket 3 regulation candidates are independent** of M1; `domain_regulations` rows can load immediately once B2-S7 is resolved.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order subject to the M1 gating above.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S5, S7, H1`), or `skip`.

- **B1-S1 (M1, 4-module split)** is gated on B2-S1; resolve that first.
- **B1-S2 (event_category PATCH on 3 events)** is trivial; one PATCH each, no gating.
- **B1-S3 (lifecycle states on 8 masters)** is gated on B1-S1 and on B2-S2 / B2-S5.
- **B1-S4 (business_function_domains)** is gated on B2-S6.
- **B1-S5 / B1-S6 (handoff direction fixes)** are gated on B2-S3 / B2-S4.
- **B1-S7 (DSPM-owed source_module_id PATCH on 10 outbounds)** is gated on B1-S1.
- **B1-H1 (12 APQC tags)** is independent of M1 but should run after B2-S3 / B2-S4 to avoid tagging a handoff that is about to be deleted (handoff 285).

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (module split):** (a) 4-module split as drafted, (b) alt-a / alt-b / alt-c per the table, (c) defer.
- **B2-S2 (static-shape exemption for cloud-store masters):** (a) author 3-state lifecycles, (b) apply exemption, (c) mixed.
- **B2-S3 (handoff 285):** (a) DELETE, (b) keep + new event.
- **B2-S4 (handoff 288):** (a) PATCH payload, (b) new DSPM event, (c) DELETE.
- **B2-S5 (pattern flags):** per-flag yes/no on the 4 plausible-true pairs.
- **B2-S6 (business_function ownership):** which business function (and id).
- **B2-S7 (regulations):** per-regulation yes/no + `applicability` value.
- **B2-S8 (F-band scope):** (a) same load, (b) separate F-band load.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 4 entity candidates + 5 regulation candidates + 2 modularization candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit.

| Owing domain | Owed work |
|---|---|
| DCG | B10b: populate `target_domain_module_id` on outbound 285 (also DELETE candidate per B1-S5) and 846 (`cloud_database.discovered`). Populate `source_domain_module_id` on inbound 261 and 712. PATCH event 744 `data_usage_metric.spike_detected` `event_category` (Rule #13). Consider whether DSPM-emitted contributions to `data_assets` and `data_classifications` warrant a DCG-side acknowledgement (handoff 285 review per B1-S5). |
| SECOPS | B10b: populate `target_domain_module_id` on 287 and 290 (`sensitive_data_incident.detected` / `.resolved`). Add `consumer + required` DMDO on `sensitive_data_incidents` (341) in whichever SECOPS module subscribes to the DSPM incident feed. |
| IGA | B10b: 286 and 289 already pointed at IGA module 146 on the target side. Verify 146 is the right module; if so, also add a `consumer + required` DMDO on `iam_access_policies` (340) and / or `sensitive_data_incidents` (341) in IGA module 146 to mirror the inbound expectation. |
| PRIV-MGMT | B10b: populate `target_domain_module_id` on 288 (also direction-contested per B1-S6). Add `consumer` DMDO if the payload settles. |
| DLP | B10b: populate `target_domain_module_id` on 847. Add `consumer` DMDO on `data_warehouses` (338) or treat the handoff as a classification-feed and adjust. DLP and DSPM both contribute to `data_classifications` (303, DCG-mastered); confirm the DSPM -> DLP signal is DLP-side at all (`data_warehouse.classified` might be more naturally a DCG-side event, surface to DLP audit). |
| GRC | B10b: populate `target_domain_module_id` on 848. Add `consumer` DMDO on `saas_app_instances` (339) for the SaaS-inventory governance flow. |
| AUDIT | B10b: populate `target_domain_module_id` on 849. Add `consumer` DMDO on `cloud_databases` (337) for the database-audit-evidence flow. |
| DI | B10b: populate `source_domain_module_id` on inbound 729. PATCH event 765 `source_connector.added` `event_category` (Rule #13). |

### Decisions

_(empty until reviewed)_

### Fixes applied

_(empty; this is a read-only audit pass; no writes were made to the catalog)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

### Residual B1 classification

The 2026-05-30 pass left **all 8 Bucket 1 items** unfixed (the prior Fixes-applied section was empty). Classifying each residual against the truly-technical criteria:

| ID | Classification | Reason |
|---|---|---|
| B1-S1 | DEFER | New `domain_modules`; explicitly gated on B2-S1 module-split judgment. |
| B1-S2 | TECHNICAL | Enum backfill on 3 `trigger_events`; audit fully specifies the target `event_category` value per row. |
| B1-S3 | DEFER | ~30 new `data_object_lifecycle_states`; gated on B1-S1 (modules) and B2-S2 / B2-S5. |
| B1-S4 | DEFER | New `business_function_domains`; gated on B2-S6 (user picks owner). |
| B1-S5 | DEFER | DELETE of handoff 285 explicitly routed to B2-S3 as an editorial choice. |
| B1-S6 | DEFER | PATCH of handoff 288 offers two paths; gated on B2-S4. |
| B1-S7 | DEFER | B10b FKs derivable only after DSPM modules exist; gated on B1-S1. |
| B1-H1 | DEFER | APQC `handoff_processes`; audit names candidate PCF rows by description only, no resolved `process_id`s; instructions require pre-specified resolvable PCF. |

### Fixes applied (technical, this pass)

| ID | Action | Result |
|---|---|---|
| B1-S2 | PATCH `trigger_events` id=930 (`cloud_database.discovered`) set `event_category='lifecycle'` | applied |
| B1-S2 | PATCH `trigger_events` id=931 (`data_warehouse.classified`) set `event_category='state_change'` | applied |
| B1-S2 | PATCH `trigger_events` id=932 (`saas_app_instance.detected`) set `event_category='lifecycle'` | applied |

3 PATCHes applied via direct CLI (≤3, no loader needed per Rule #6). No JWT-audience errors. No loader path used.

### Deferred (7 of 8 residual B1 items)

| ID | Deferred because |
|---|---|
| B1-S1 | Gated on B2-S1 (user must confirm 4-module split). |
| B1-S3 | Gated on B1-S1 + B2-S2 + B2-S5. |
| B1-S4 | Gated on B2-S6 (user picks business function). |
| B1-S5 | Gated on B2-S3 (DELETE vs new event is editorial). |
| B1-S6 | Gated on B2-S4 (PATCH path is editorial). |
| B1-S7 | Gated on B1-S1 (no DSPM modules exist yet). |
| B1-H1 | PCF `process_id`s not pre-resolved in the audit; lookups deferred to fix time. |

### UI spot-checks

- https://tests.semantius.app/domain_map/trigger_events (filter id in 930, 931, 932; confirm `event_category` populated per Rule #13)

### Verification

`GET /trigger_events?id=in.(930,931,932)` returned the 3 rows with their new `event_category` values; all match the audit's prescribed assignments. No other catalog rows touched this pass.

## 2026-05-31, Audit

### Summary

- **Current footprint:** 0 `domain_modules` (M1 still hard-fails). 7 capabilities unchanged (`DSPM-DATA-DISCOVERY`, `DSPM-CLASSIFICATION`, `DSPM-ACCESS-AUDIT`, `DSPM-LINEAGE`, `DSPM-RISK-SCORING`, `DSPM-REMEDIATION`, `DSPM-SHADOW-DATA`). 11 `domain_data_objects` rows (8 master, 2 contributor, 1 consumer). 12 solutions. 9 `trigger_events` (all 9 now carry `event_category` per the 2026-05-31 Continuation: 930=lifecycle, 931=state_change, 932=lifecycle). 13 cross-domain `handoffs` (10 outbound, 3 inbound). 0 intra-domain handoffs. 0 `data_object_lifecycle_states`. 0 `business_function_domains`. 0 `domain_regulations`. 0 `data_object_aliases`. 1 orphan `skills` row (id=51, `dspm-system`, `skill_type='system'`, `domain_module_id=NULL`). 0 `skill_tools`. 7 of 13 handoffs now carry `handoff_processes` rows (`agent_curated`, `record_status='new'`): 261, 285, 287, 290, 712, 729, 846. 6 handoffs still untagged: 286, 288, 289, 847, 848, 849.
- **Bucket 1 (in-scope, agent fixable):** 4 items.
- **Bucket 2 (surface-for-user, judgment):** 8 items (carried).
- **Bucket 3 (Phase 0 pending, speculative):** 11 items (carried).

### Structural pass bands (results)

- **S1-S3 pass.** Domain row id=140 carries full metadata. Rule #18 prose clean.
- **A1-A3 pass.** `domains.id=140` has all 7 required fields populated.
- **M1 hard-fail (Rule #14).** Still 0 `domain_modules` rows of any `module_kind` and 0 `domain_module_host_domains`. Gates every downstream module-keyed band. With 7 capabilities the floor is >=2 `module_kind='full'`. Carried from 2026-05-30.
- **B5 (`data_object_aliases`).** 0 aliases on 8 masters. Not a hard-fail since aliases are vendor-synonym layer; flagged for B3 follow-up if user wants vendor-terminology surface.
- **B7 (`data_object_relationships`).** Single inbound `reviews` edge from `data_assets` 300 onto `cloud_databases` 337 carried from prior. No new intra-domain edges since 0 modules.
- **B9 pass.** All 9 `trigger_events` now carry `event_category` (per 2026-05-31 Continuation fix). Previously partial-fail.
- **B9b (event-payload coherence).** Handoffs 285 (DSPM->DCG, event 236, payload `data_assets`) and 288 (DSPM->PRIV-MGMT, event 273 owned by `data_classifications` 303, payload `data_assets` 300) carry over the direction/payload mismatches flagged on 2026-05-30. Editorial; routed to B2.
- **B10b (handoff module FKs).** All 13 handoffs still have NULL `source_domain_module_id` (gated on M1). 11 of 13 have NULL `target_domain_module_id`; only 286 and 289 carry `target_domain_module_id=146` (IGA). DSPM-owed source FK PATCH on 10 outbounds (285, 286, 287, 288, 289, 290, 846, 847, 848, 849) is gated on M1.
- **B11 (`data_object_lifecycle_states`).** 0 rows across 8 masters. Carried from 2026-05-30. Hard-fail (Rule #12). Workflow-bearing masters (`sensitive_data_incidents`, `iam_access_policies`, `shadow_data_findings`, `data_risk_scores`) plainly need state machines. Gated on M1 (states' `domain_module_id` references the realizing module).
- **B12 (pattern flags).** All 8 masters default-false on `has_personal_content`, `has_submit_lock`, `has_single_approver`. Implausible for `sensitive_data_incidents`, `iam_access_policies`, `shadow_data_findings`. Surface-for-user (B2-S5 carried).
- **C1 (`business_function_domains`).** 0 rows. Carried from 2026-05-30. B2-S6 picks the owner.
- **D bands (`domain_regulations`).** 0 rows. Carried as B2-S7 (5 candidate regulations).
- **E1-E5 (roles / `role_modules`).** All E-band checks uncomputable: zero modules means zero role_module rows possible. Gated on M1.
- **F1-F5 (skills / tools / Semantius score).** F1: 1 orphan `dspm-system` skill exists with `domain_module_id=NULL`. F2: 0 of 0 modules carry a `system` skill (vacuous); the orphan skill cannot satisfy F2 without a module to bind to. F3-F4: 0 `skill_tools` rows. F5: Semantius score uncomputable. All gated on M1. The orphan skill is a new finding requiring user decision (delete vs reuse during M1 fix).
- **H1 partial-fail.** 7 of 13 cross-domain handoffs tagged via `handoff_processes` (54%). Volume target is 0.5N to 0.8N (6.5 to 10.4 rows), so the current 7 sits at the bottom of the target band. 6 handoffs untagged (286, 288, 289, 847, 848, 849). Tagging on 285 should be reconsidered if B2-S3 leads to DELETE.
- **Rule #15 notes check.** `domain_data_objects.notes` on DSPM has 6 populated rows ("Security-posture lens (distinct from CMDB CI topology lens)", "Infrastructure IAM artifact (distinct from DCG data_access_policies)", "DSPM remediation trigger", "Shadow-data discovery output", "DCG-mastered; DSPM enriches with security-posture context", "Applies classifications via at-rest scans (DCG masters)", "DCG-mastered; DSPM consumes for risk-context enrichment"). These appear to predate Rule #15. Surface as B2 carry (not auto-revert).

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-H1-RESIDUAL | H1 partial | 6 of 13 cross-domain handoffs still untagged with `handoff_processes`: 286 (DSPM->IGA, `sensitive_data_incident.detected`, `iam_access_policies`), 288 (DSPM->PRIV-MGMT, `data_classification.sensitivity_elevated`, `data_assets`), 289 (DSPM->IGA, `iam_access_policy.permission_escalation_detected`, `iam_access_policies`), 847 (DSPM->DLP, `data_warehouse.classified`, `data_warehouses`), 848 (DSPM->GRC, `saas_app_instance.detected`, `saas_app_instances`), 849 (DSPM->AUDIT, `cloud_database.discovered`, `cloud_databases`). 286 + 289 implementing PCF should be in "Manage identities and access" / "Manage entitlements" family. 288 implicates "Manage compliance with regulations" but its event-payload mismatch (B2-S4) blocks tagging until resolved. 847 implicates "Manage IT security, privacy, and data protection". 848 implicates "Manage compliance with regulations". 849 implicates "Manage internal audit". | Resolve B2-S4 first (handoff 288 path), then INSERT 5-6 `handoff_processes` rows via direct CLI per handoff (PCF `process_id` lookups required at fix time via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`). |

The 7 prior Bucket 1 items (B1-S1, B1-S3, B1-S4, B1-S5, B1-S6, B1-S7, and the un-tagged subset of B1-H1) remain DEFERRED per the 2026-05-31 Continuation classification: each is gated on either M1 (B1-S1) or on a Bucket 2 user decision. They are NOT re-listed as Bucket 1 here because the audit can't act on them this pass without user input. They appear in `state.yaml` under `b1b` (blocked) with `blocked_by[]` pointing at the gating item.

### Bucket 2, Surface-for-user (judgment calls)

B2-S1 through B2-S8 carry forward unchanged from 2026-05-30. The user has not yet ruled on any of them. One new item:

- **B2-S9.** Orphan `skills` row id=51 (`dspm-system`, `skill_type='system'`, `domain_module_id=NULL`, 0 `skill_tools`). It was created without a host module. When the M1 fix lands and DSPM modules exist, options are: (a) bind id=51 to one of the new modules (which one?) and author its skill_tools; (b) DELETE id=51 and author a fresh `system` skill per module under B1-S1's loader (Rule #17 requires one `system` skill per module, so the 4-module split means 4 skills, not one); (c) treat id=51 as a placeholder that the M1 loader cleans up. Recommendation: (b), since the 4-module split makes one cross-cutting skill incoherent with Rule #17.

### Bucket 3, Phase 0 pending (speculative)

Carried unchanged from 2026-05-30: 4 entity candidates (`data_access_paths`, `remediation_playbooks`, `data_perimeters`, `toxic_combinations`), 2 modularization candidates (DSPM-INCIDENT vs DSPM-REMEDIATION-PLAYBOOKS split; new DSPM-POLICY-PERIMETERS module), 5 regulation candidates (GDPR Art. 30/32/35; CCPA/CPRA; HIPAA Security Rule; PCI-DSS 4.0; US state breach-notification laws). The `audits/_missing-domains.md` queue carries CSPM, CIEM, DDR, AI-SPM.

### Cross-bucket dependencies

- **B1-S1 (M1) is still the bottleneck** for every downstream module-keyed obligation.
- **B1-H1-RESIDUAL is gated on B2-S4** (handoff 288 path decision changes whether 288 even gets tagged).
- **B2-S9 (orphan skill) is informed by B2-S1** (module split decides skill binding).
- Bucket 2 and Bucket 3 are otherwise mutually independent.

### Per-bucket prompts

- **Bucket 1:** B1-H1-RESIDUAL has 5 immediately-actionable handoff tags (286, 289, 847, 848, 849); handoff 288 holds until B2-S4 resolves. Reply `all`, `just 286, 289, 847, 848, 849`, or `skip`.
- **Bucket 2:** Per-item decisions still owed on B2-S1 through B2-S8 (from 2026-05-30) plus the new B2-S9 (orphan skill).
- **Bucket 3:** Vet via formal Phase 0 vendor research or eyeball-mode.

### Report-only follow-ups (owed by other domains)

Carried unchanged from 2026-05-30 (DCG, SECOPS, IGA, PRIV-MGMT, DLP, GRC, AUDIT, DI). No new entries; no other domain has acted on its DSPM-touching items since the prior audit.

### Decisions

_(empty until reviewed)_

### Fixes applied

_(empty; this is a read-only audit pass; no writes were made to the catalog)_


## 2026-06-02 Audit (modularization)

### Summary

DSPM was modularized from 0 modules to 3 `full` modules, resolving the long-standing M1 hard-fail (Rule #14) that gated every downstream module-keyed band. Scope was modules + entity assignment ONLY: existing capabilities were linked, existing data_objects were assigned at their existing role and necessity, and no new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created.

The prior audit (2026-05-30 / 2026-05-31) drafted a 4-module split pending B2-S1. This pass executed the 3-module variant (the audit own alt-c: collapse classification-lineage into discovery-inventory), which is the coherent 3-module shape: one discovery-and-classification surface, one access-and-risk engine, one incident-and-remediation workflow. All 7 capabilities and all 11 domain_data_objects were placed; no module is empty.

### Modules created

| id | code | module_kind | capabilities | data_objects |
|---|---|---|---|---|
| 233 | DSPM-DISCOVERY-CLASSIFICATION | full | 366 DSPM-DATA-DISCOVERY, 367 DSPM-CLASSIFICATION, 369 DSPM-LINEAGE, 372 DSPM-SHADOW-DATA | masters: 336 cloud_storage_buckets, 337 cloud_databases, 338 data_warehouses, 339 saas_app_instances, 343 shadow_data_findings; contributors: 300 data_assets, 303 data_classifications; consumer: 301 data_lineage_relationships |
| 234 | DSPM-ACCESS-RISK | full | 368 DSPM-ACCESS-AUDIT, 370 DSPM-RISK-SCORING | masters: 340 iam_access_policies, 342 data_risk_scores |
| 235 | DSPM-INCIDENT-REMEDIATION | full | 371 DSPM-REMEDIATION | master: 341 sensitive_data_incidents |

7 `domain_module_capabilities` rows (4 + 2 + 1). 11 `domain_module_data_objects` rows (8 + 2 + 1).

### Master assignment (catalog-wide pre-check)

The mandatory catalog-wide master pre-check ran before any `role='master'` write: `GET /domain_module_data_objects?data_object_id=in.(336,337,338,339,340,341,342,343,300,303,301)&role=eq.master`. It returned ZERO rows, so none of the candidates were mastered by any module catalog-wide. All 8 native masters (336-343) were therefore assigned `master` in DSPM without conflict. No demotions to `embedded_master` were required this pass.

The 3 borrowed entities kept their existing legacy roles (DCG masters all three): 300 data_assets (contributor / required), 303 data_classifications (contributor / required), 301 data_lineage_relationships (consumer / required). None was promoted.

Master-to-module mapping (each master in exactly one module, in-domain and catalog-wide):
- cloud_storage_buckets 336, cloud_databases 337, data_warehouses 338, saas_app_instances 339, shadow_data_findings 343 -> DSPM-DISCOVERY-CLASSIFICATION (233)
- iam_access_policies 340, data_risk_scores 342 -> DSPM-ACCESS-RISK (234)
- sensitive_data_incidents 341 -> DSPM-INCIDENT-REMEDIATION (235)

### Verification

- All 7 capabilities placed exactly once (M4): 366/367/369/372 -> 233, 368/370 -> 234, 371 -> 235.
- Each of the 8 native masters mastered exactly once, all rows in DSPM modules (M7 in-domain and catalog-wide; re-queried post-insert).
- No empty module (M6 / no-empty-module: 8 / 2 / 1 DMDO rows; every module has >=1 capability and >=1 data_object).
- Rule #14: 3 `full` modules for a 7-capability domain (floor is >=2). Pass.
- Rule #15: `notes` left empty on every DMC and DMDO row. Rule #18: no vendor or product names in any module name or description. R1: `record_status` omitted on all inserts.

### Loader

`.tmp_deploy/modularize_dspm_2026-06-02.ts` (idempotent; re-reads modules after insert for the code->id map; guards with a catalog-wide master pre-check that aborts on any foreign master; safe to re-run).

### Out of scope this pass (deferred, see state.yaml)

Per-module system skills + skill_tools (Rule #17 / F2-F3), catalog UX taglines and descriptions (M8 / A4), lifecycle states on workflow-bearing masters (B11), pattern-flag re-evaluation, business_function ownership, regulations, handoff direction fixes, and DSPM-owed source_domain_module_id back-fill on the 10 outbound handoffs all remain open. The B3 vendor-research candidates (data_access_paths, remediation_playbooks, data_perimeters, toxic_combinations) carry forward unchanged.

## 2026-06-05 - b1a execution

Executed both b1a items in `state.yaml` (Phase S / Rule #17 and catalog UX / Rule #20). Tenant confirmed `adenin` / module 1001 before any write. Both items FULLY RESOLVED and removed from `b1a` (now empty). No JWT-audience errors; no ambiguity skips.

### B1A-SKILLS-PER-MODULE (DONE)

Loader: `.tmp_deploy/fix_dspm_skills.ts` (idempotent; dedup by natural key). Note: the `state.yaml` finding said orphan skill 51 carried "0 skill_tools"; live state showed it carried 8 (ids 484-491). Snapshotted below before delete.

**DELETE (snapshot for reversibility):**

- `skills` id=51: `{skill_name: "dspm-system", skill_type: "system", domain_id: 140, domain_module_id: null, role_id: null, process_id: null, record_status: "new", description: "System skill for Data Security Posture Management — runtime workflows over the domain's master data, derived from masters + cross-domain handoffs."}` (deleted per b1a action + B2-SKILL-ORPHAN recommendation (a)).
- `skill_tools` ids 484-491 (all `skill_id=51`, `requirement_level=required`, `notes=""`, `record_status=new`): tool_id 418 (query_cloud_storage_buckets), 419 (query_cloud_databases), 420 (query_data_warehouses), 421 (query_saas_app_instances), 422 (query_iam_access_policies), 423 (query_sensitive_data_incidents), 424 (query_data_risk_scores), 425 (query_shadow_data_findings). Deleted ahead of the skill row. The 8 `tools` rows themselves were NOT deleted (catalog-wide, reused below).

**INSERT `tools` (12 new domain-specific mutate / workflow-gate primitives, all `coverage_tier=platform`, `record_status=new`):** ids 1616 update_cloud_storage_bucket (336), 1617 update_cloud_database (337), 1618 update_data_warehouse (338), 1619 update_saas_app_instance (339), 1620 triage_shadow_data_finding (343), 1621 assign_shadow_data_finding (343), 1622 flag_iam_access_policy (340), 1623 remediate_iam_access_policy (340), 1624 recalculate_data_risk_score (342), 1625 triage_sensitive_data_incident (341), 1626 contain_sensitive_data_incident (341), 1627 resolve_sensitive_data_incident (341). Existing generic tools reused, not recreated: query_* 100/101/103/418-425, mutates 171 classify_data_asset / 172 certify_data_asset, abstraction 913 notify_person.

**INSERT `skills` (3 system skills, `skill_type=system`, `domain_id=140`, `record_status=new`):** id 285 dspm_discovery_classification_agent -> module 233; id 286 dspm_access_risk_agent -> module 234; id 287 dspm_incident_remediation_agent -> module 235.

**INSERT `skill_tools` (34 rows, `record_status=new`, `notes=""`):** skill 285 = 17 rows (10 required, 7 optional); skill 286 = 9 rows (5 required, 4 optional); skill 287 = 8 rows (6 required, 2 optional). Each skill carries at least one query, one mutate, and one workflow gate of its module's own masters; optional rows cover cross-module reads. Only the `notify_person` abstraction is linked (no channel primitives), so F7 needs no channel-justification notes.

**Verification:** F2 every module 233/234/235 has exactly one system skill; F3 every skill >=1 skill_tools; F4 invariant holds (all query/mutate tools have data_object_id set, notify_person side_effect has data_object_id null); F1 orphan check `/skills?domain_id=eq.140&skill_type=eq.system&domain_module_id=is.null` returns 0.

### B1A-CATALOG-UX (DONE)

Loader: `.tmp_deploy/fix_dspm_catalog_ux.ts` (empty-guard per field; writes only where current value is empty; never overwrites). All three modules had empty `catalog_tagline` and `catalog_description` before this pass.

**PATCH `domain_modules` (buyer-voice copy written straight into the empty fields per revised Rule #20; record_status carries the review signal; no vendor names, no em-dashes, American English):**

- 233 DSPM-DISCOVERY-CLASSIFICATION: catalog_tagline (80 chars) + catalog_description (581 chars).
- 234 DSPM-ACCESS-RISK: catalog_tagline (80 chars) + catalog_description (559 chars).
- 235 DSPM-INCIDENT-REMEDIATION: catalog_tagline (92 chars) + catalog_description (559 chars).

No prior values overwritten (all fields were empty). Em-dash scan on the written copy: clean.

### State change

`b1a` is now empty (both items fully resolved). `next_action_by` recomputed to `user` (b1a empty; b2 non-empty with `user_decision` items B2-MODULE-SPLIT-NOTE / B2-SKILL-ORPHAN / B2-S2..S7). `last_audit` set to 2026-06-05. `b1b` items (lifecycle states, business_function_domains, handoff direction/module-FK back-fill, residual H1 tagging) remain blocked on their respective `user_decision` refs and were not executed.

### UI spot-checks

- https://tests.semantius.app/domain_map/skills (ids 285, 286, 287)
- https://tests.semantius.app/domain_map/skill_tools (skill_id in 285, 286, 287)
- https://tests.semantius.app/domain_map/tools (ids 1616-1627)
- https://tests.semantius.app/domain_map/domain_modules (ids 233, 234, 235; catalog_tagline / catalog_description)

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
