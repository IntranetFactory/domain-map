---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 31
---

# CMDB — Audit History

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- Current footprint: 9 data_objects across 3 modules (CMDB-CORE 108, CMDB-SERVICE-MAPPING 109, CMDB-BASELINES-DRIFT 110) all `module_kind=full`; 7 capabilities; 4 solutions (ServiceNow CMDB primary, Device42 primary, ServiceNow ITOM secondary, BMC Helix Discovery secondary); 0 regulations; 9 trigger_events; 8 outbound + 13 inbound handoffs (2 outbound also intra-domain from CMDB-CORE to SERVICE-MAPPING and BASELINES-DRIFT); 3 roles (IT-INFRA-CMDB-ADMIN, IT-INFRA-DISCOVERY-OPERATOR, IT-INFRA-CMDB-DATA-STEWARD) all anchored on business_function `IT Infrastructure` (id 58); 9 catalog permissions (3 baseline tiers per module) but ZERO workflow-gate permissions despite `configuration_items` carrying `requires_permission=true` lifecycle states; 3 system skills (`cmdb_core_agent`, `cmdb_svc_mapping_agent`, `cmdb_baselines_agent`) with 10 `skill_tools` rows total (all `platform`).
- Market surface basis (agent knowledge, no separate subagent run): ServiceNow CMDB (CSDM 4.0 reference), BMC Helix Discovery, Device42, Ivanti Neurons Discovery, Flexera One IT Asset Management (CMDB module), plus the platform-CMDB feature sets of Atlassian Jira Service Management Assets and Freshservice. Compliance specialist tier is light for CMDB itself: configuration-compliance pressure flows in via SOX-ITGC, PCI 11.5, ISO/IEC 19770-1, and FedRAMP CM-2 / CM-8 control families.
- **Bucket 1 (in-scope, agent fixable):** 12 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 12 items.

Structural pass summary: A1 passes (full 7-field domain metadata present); A4 fails (`catalog_tagline` and `catalog_description` empty); A2 / A3 pass; M1 / M2 / M4 pass (3 full modules cover 7 capabilities, each capability has a realizing module); B1 / B2 / B3 partially fail (state-machine and pattern-flag coverage thin); B11 partially fails (`ci_baselines` has 1 alias, the rest 2+; ok); B12 mostly fails (only 1 of 5 masters has lifecycle states authored); B7 user-edges look complete (rows 242 to 246 cover all 5 masters); F1-F4 pass; C1 passes; **E5 drift suspected**: every role has fewer `role_modules` paths through bundle than expected (IT-INFRA-DISCOVERY-OPERATOR has 2 role_modules but only 2 role_permissions, OK; IT-INFRA-CMDB-DATA-STEWARD has 2 role_modules but only 2 role_permissions, OK). No JWT errors.

Domain Semantius score (strict, across 3 modules): 10/10 = **100%**. All skill_tools are `coverage_tier=platform`. The tools layer is the strongest area of the domain; the gaps are in lifecycle, modularization shape (only one master per module, three of the five masters are config-shape), APQC mapping, and regulation linkage.

### Vendor surface basis

ServiceNow CMDB is the de facto reference schema (CSDM 4.0 carries `cmdb_ci`, `cmdb_rel_ci`, `cmdb_ci_class`, `cmdb_baseline`, `cmdb_business_app` plus dozens of `cmdb_ci_*` class extensions). Device42 covers the hardware-to-virtual-to-application graph end-to-end and surfaces `discovery_runs`, `affinity_groups`, `ip_ranges`, `device_dependencies` as first-class. BMC Helix Discovery (formerly Atrium) anchors the discovery-feed pattern and `reconciliation_rules`. Ivanti Neurons and Flexera carry the lighter mid-market end. Configuration-compliance specialists (Tanium, Qualys CSAM) overlap with ITAM, SAM, DSPM, and CSPM; they inform the data-quality and reconciliation surfaces but are not pure-play CMDB.

The market lacks a regulated-specialist tier in the way ATS has Checkr; the compliance anchors are statutory (SOX-ITGC, PCI 11.5, ISO 19770, FedRAMP) carried via control-mapping modules rather than dedicated vendors.

### Bucket 1 — In-scope confirmed gaps

#### MISSING (universal-vendor entities, non-regulatory)

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-M1 | `ci_reconciliation_rules` | CMDB-CORE | ServiceNow CMDB (Identification & Reconciliation Engine, IRE); BMC Helix `reconciliation_rules`; Device42 `dedupe_rules`. Reconciliation logic is the load-bearing differentiator across all flagships and is not modeled anywhere in the current footprint. |
| B1-M2 | `ci_attestations` | CMDB-CORE | ServiceNow CMDB Data Foundations attestation tasks; BMC Helix data-steward review cycles; Device42 verification queue. CI owner periodic attestation is a primary data-quality control. |
| B1-M3 | `discovery_credentials` | CMDB-CORE (consumer from DISCOVERY when modularized) | All 5 flagships ship credential vaults specifically for discovery scans (vCenter / cloud-tenant / AD / SSH credentials). Even if the canonical master lives in DISCOVERY when that domain is modularized, CMDB needs the consumer link. |
| B1-M4 | `ci_audit_log` | CMDB-CORE | Universal: every flagship exposes a CI history audit table separate from generic record-history. SOX-ITGC evidence depends on it. |

#### MISSING (statutory / control-framework anchors)

| ID | Entity | Proposed module | Control framework |
|---|---|---|---|
| B1-M5 | regulation row `SOX-ITGC` plus `domain_regulations` link | (regulations + domain_regulations) | SOX Section 404 IT General Controls; CMDB is the substrate that change-management and access-recertification controls audit against. Domain currently has zero regulations. |
| B1-M6 | regulation row `PCI-DSS-11.5` plus `domain_regulations` link | (regulations + domain_regulations) | PCI-DSS v4 requirement 11.5 requires baseline change-detection; the only catalog domain that natively models baselines is CMDB. |
| B1-M7 | regulation row `ISO-19770-1` plus `domain_regulations` link | (regulations + domain_regulations) | ISO/IEC 19770-1 IT asset management process framework; touches CMDB as the CI substrate ITAM/SAM build on. |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 | `domains.catalog_tagline` and `domains.catalog_description` are empty strings; Rule #20 requires both populated in buyer voice before the domain is catalog-ready. | Draft both per Rule #20 voice rules; surface for user approval before INSERT (Rule #20's draft-then-review loop). Recommended tagline: "Keep an authoritative record of every server, app, database, and the wiring between them, so changes and incidents can be reasoned about in minutes, not days." |
| B1-S2 | B12 / Rule #12 | `ci_relationships` (77), `ci_classes` (78), `service_maps` (79), `ci_baselines` (80) all have ZERO rows in `data_object_lifecycle_states`. Of these, `ci_classes` is plausibly config-shape (Rule #12 exemption candidate); the other three carry real lifecycle. | Author lifecycle states for `ci_relationships` (proposed: `discovered`, `confirmed`, `obsolete`), `service_maps` (proposed: `draft`, `published`, `stale`, `archived`), `ci_baselines` (proposed: `captured`, `validated`, `superseded`, `retired`). Surface config-shape exemption proposal for `ci_classes` to user (do NOT auto-populate `data_objects.notes` per Rule #15). |
| B1-S3 | Rule #12 | Lifecycle states 272, 274, 275 (`configuration_items.registered / retired / archived`) carry `requires_permission=true` with verb overrides (`register_ci`, `retire_ci`, `archive_ci`), but the corresponding workflow-gate permissions are NOT materialized in `permissions` (only 3 baseline tiers exist on `cmdb-core`). The states reference permissions that do not exist. | INSERT 3 `permissions` rows under `domain_module_id=108`: `cmdb-core:register_ci`, `cmdb-core:retire_ci`, `cmdb-core:archive_ci`, all with `tier=workflow-gate`. Each is then auto-includable in `cmdb-core:manage` and `cmdb-core:admin` via `permission_hierarchy`. |
| B1-S4 | B9 | Trigger event `ci.unauthorized_change_detected` (id 30) has a single subscriber (ITSM 51), but the same event should plausibly also fan out to GRC (SOX evidence) and SECOPS (potential intrusion signal). Five inbound discovery handoffs (48, 49, 621, 625, 146) carry `source_domain_module_id=null` because DISCOVERY and RMM are unmodularized. Two outbound (1199 to DISCOVERY, 628 to AIOPS) carry `target_domain_module_id=null` for the same reason. The CMDB side is correct as far as it can go; the NULL FKs route to other domains. | The B9 fan-out for `ci.unauthorized_change_detected` is in-scope for CMDB (add GRC + SECOPS subscribers when those domains are next reviewed). The NULL-FK B10b items are report-only (see bottom). |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | Handoff 51 (CMDB-CORE outbound, `ci.unauthorized_change_detected` to ITSM target_domain_module_id=38) uses payload `service_incidents` (id 47), but the actual payload is the CI that was tampered with (id 76 `configuration_items`). The current shape implies CMDB creates an incident; the real shape is CMDB raises an event ITSM may convert into an incident. | PATCH handoff 51: `data_object_id=76` (configuration_items). The relationship row 247 (`configuration_items → service_incidents` "triggers") already mirrors the corrected shape. |

#### APQC TAGGING

Six handoffs already tagged (3 `discovery_substring`, 1 `agent_curated`, 0 `approved`; the substring matches on 48/49/51 are wildly wrong: `Manage Financial Resources` 17058 and `Manage External Relationships` 10012 are L1 framework headers, not implementing activities). 13 untagged. The 19 cross-domain handoffs the domain participates in plus 2 intra-domain (1211, 1212) need tagging or deferral.

Agent-curated proposals (this audit run):

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id (external_id) | Confidence |
|---|---|---|---|---|---|---|
| 48 | DISCOVERY → CMDB-CORE | `ci.discovered` | configuration_items | Manage infrastructure configuration | 1309 (20915) | confident L4; REPLACES the `discovery_substring` row tagged 9 (Manage Financial Resources) which is incorrect |
| 49 | DISCOVERY → CMDB-CORE | `relationship.discovered` | ci_relationships | Manage infrastructure configuration | 1309 (20915) | confident L4; REPLACES discovery_substring row tagged 12 (incorrect) |
| 51 | CMDB-CORE → ITSM | `ci.unauthorized_change_detected` | configuration_items (after B1-B1 fix) | Triage IT service delivery incidents | 1299 (20903) | confident L4; REPLACES discovery_substring row tagged 9 (incorrect) |
| 146 | RMM → CMDB-CORE | `ci_endpoint.discovered` | configuration_items | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 621 | DISCOVERY → CMDB-CORE | `discovery_scan.completed` | discovery_scans | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 625 | DISCOVERY → CMDB-CORE | `discovery_source.connected` | discovery_sources | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 627 | CMDB-SERVICE-MAPPING → ITSM | `service_map.updated` | service_maps | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 628 | CMDB-SERVICE-MAPPING → AIOPS | `service_map.updated` | service_maps | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 629 | CMDB-BASELINES-DRIFT → ITSM | `ci_baseline.deviation_detected` | ci_baselines | Triage IT service delivery incidents | 1299 (20903) | confident L4 |
| 654 | NPMD → CMDB-SERVICE-MAPPING | `network_topology_snapshot.updated` | network_topology_snapshots | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 679 | DCIM → CMDB-CORE | `dc_port_connection.changed` | dc_port_connections | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 1199 | CMDB-CORE → DISCOVERY | `ci_class.published` | ci_classes | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 1200 | CMDB-BASELINES-DRIFT → ITSM | `ci_baseline.captured` | ci_baselines | Implement and enforce change control procedures | 1190 (20752) | confident L4; baseline capture is the precondition for change-control enforcement |
| 236 | APM → CMDB-CORE | `application.onboarded` | enterprise_applications | Maintain IT asset records | 1312 (20918) | confident L4; REPLACES discovery_substring row tagged 1180 (Review and monitor application security controls), which is plausible but APM-onboard-to-CMDB is asset-record-maintenance, not security-review |
| 237 | APM → CMDB-CORE | `application.lifecycle_state_changed` | enterprise_applications | Maintain IT asset records | 1312 (20918) | confident L4; REPLACES discovery_substring row tagged 1180 (same as 236) |
| 854 | APM → CMDB-CORE | `technology_platform.sunset` | technology_platforms | Maintain IT asset records | 1312 (20918) | confident L4 |
| 1211 | CMDB-CORE → CMDB-SERVICE-MAPPING (intra) | `ci.registered` | service_maps | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 1212 | CMDB-CORE → CMDB-BASELINES-DRIFT (intra) | `ci.registered` | ci_baselines | Manage infrastructure configuration | 1309 (20915) | confident L4 |

Already correctly tagged (keep, no action):
- 30 (ITSM → CMDB-CORE `service_change.completed`, agent_curated 1241 `Define IT change/release standards`). Confident L4, keep as-is.

Deferred to Discover Pass 3 (no clean PCF match):
- None. Every cross-domain CMDB handoff lands cleanly under either `Manage infrastructure configuration` (20915), `Triage IT service delivery incidents` (20903), `Maintain IT asset records` (20918), `Implement and enforce change control procedures` (20752), or `Define IT change/release standards` (20829).

Single APQC TAGGING line for the Bucket 1 count (per audit constraint #10): the entire block above is **B1-H1** (one Bucket 1 item proposing 18 new or replacing tags across 18 handoffs).

#### Boundary findings per neighbor (Pass 4)

CMDB neighbor weights (count of cross-domain handoffs with this domain on either side):

| Neighbor | Outbound | Inbound | Weight | Pass-4 status |
|---|---|---|---|---|
| ITSM (1) | 4 (51, 627, 629, 1200) | 1 (30) | 5 | Full pairwise pending Bucket 1 closure (see B1-Pair-ITSM below) |
| DISCOVERY (5) | 1 (1199) | 4 (48, 49, 621, 625) | 5 | Pairwise: every inbound has null source_domain_module_id (B10b, DISCOVERY's gap, report-only); outbound 1199 has null target_domain_module_id (same root cause, also DISCOVERY's gap). |
| APM (10) | 0 | 3 (236, 237, 854) | 3 | Pairwise: all three inbound handoffs were mis-tagged by discovery_substring; APQC fix is in B1-H1. No structural gap on APM's side. |
| AIOPS (6) | 1 (628) | 0 | 1 | One-line: outbound `service_map.updated` lands on AIOPS topology layer. Target module FK null because AIOPS is unmodularized. Report-only. |
| RMM (130) | 0 | 1 (146) | 1 | One-line: inbound `ci_endpoint.discovered` carries null source_domain_module_id; RMM unmodularized. Report-only. |
| NPMD (82) | 0 | 1 (654) | 1 | One-line: inbound `network_topology_snapshot.updated` carries null source_domain_module_id; NPMD unmodularized. Report-only. |
| DCIM (84) | 0 | 1 (679) | 1 | One-line: inbound `dc_port_connection.changed` carries null source_domain_module_id; DCIM unmodularized. Report-only. |

| ID | Pair | Finding | Fix |
|---|---|---|---|
| B1-Pair-ITSM-1 | ITSM ↔ CMDB | Missing relationship mirror: handoff 1200 (`ci_baseline.captured` from CMDB-BASELINES-DRIFT to ITSM module 41) implies the change-control workflow reads baselines as a precondition, but `data_object_relationships` has no edge between `ci_baselines` (80) and `service_changes` (50). | Author `service_changes (50) →references→ ci_baselines (80)`, verb `references`, inverse `referenced_by_change`, cardinality many_to_many, kind reference, is_required false, owner_side target. |

### Bucket 2 — Surface-for-user (judgment calls)

1. **B12 config-shape exemption for `ci_classes`.** `ci_classes` carries no workflow (class taxonomy is authored once and edited rarely); per Rule #12 it qualifies for the lifecycle exemption. Rule #15 forbids auto-populating `data_objects.notes` to record this. Options: (a) accept the exemption as a tracked decision here in the audit only; (b) approve a specific notes wording the user authors; (c) author a minimal `defined / active / deprecated` lifecycle to keep the surface uniform. **Independent.**
2. **Pattern flags across all 5 masters.** All masters carry `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. The `configuration_items.registered` workflow gate (state 272, requires_permission=true) plausibly implies `has_submit_lock=true` on `configuration_items`: once a CI is registered with reconciliation rules applied, the canonical record is locked against unscoped edits. Decide: (a) flip `configuration_items.has_submit_lock=true`; (b) leave as-is and surface a note about the gate-without-flag pattern; (c) author the flag plus user-approved notes wording. **Independent.**
3. **Service map ownership boundary with DISCOVERY.** ServiceNow ships Service Mapping as a Discovery add-on; in the current catalog, `service_maps` (79) masters in CMDB-SERVICE-MAPPING (module 109) but the canonical discovery source is DISCOVERY (domain 5). When DISCOVERY is modularized (Bucket 3 candidate, but the domain row already exists), should `service_maps` move to a DISCOVERY-SERVICE-MAP module and CMDB-SERVICE-MAPPING become a consumer? Options: (a) keep CMDB as master (current); (b) move to DISCOVERY; (c) split (CMDB masters business-service projection, DISCOVERY masters raw topology). **Dependent on Bucket 3 #4** (DISCOVERY modularization). 
4. **Relationship row 220 vs 232 duplication.** `enterprise_applications (267) → configuration_items (76)` appears twice: row 220 (`mapped_to`, many_to_many) and row 232 (`onboards_into`, one_to_one). The semantics are different (mapping vs onboarding) but the same FK pair triggers ambiguity in label rendering. Options: (a) keep both (they encode distinct edges); (b) collapse to row 220 (mapping is the persistent edge; onboarding is a one-time transition captured better as a trigger event, which it already is via 208 `application.onboarded`); (c) drop row 232 only. **Independent.**
5. **Roles function-scope.** All 3 CMDB roles use `IT-INFRA-` prefix and anchor on `business_function_id=58`. None have `business_function_id=null` (cross-functional). The Hard-invariant in role-layer rules requires `<FUNCTION-CODE>-<ROLE-NAME>` formatting, but the current codes have an additional `CMDB-` infix (`IT-INFRA-CMDB-ADMIN` vs the cleaner `IT-INFRA-CONFIG-ADMIN`). Decide: (a) keep current names (CMDB-specific personas, easier to find in UI); (b) rename to drop the CMDB infix (cleaner function-scoping); (c) demote to per-module tier permissions and delete the cross-module roles. **Independent.**
6. **B9 fan-out target for `ci.unauthorized_change_detected`.** Beyond ITSM (currently the only subscriber), the event plausibly fans out to GRC (SOX-ITGC evidence stream) and SECOPS (potential indicator of compromise). Options: (a) add both; (b) GRC only; (c) SECOPS only; (d) keep ITSM-only. Decision shape depends on whether SECOPS is wired to receive infrastructure-anomaly signals or only authentication-anomaly signals. **Independent of Bucket 3.**
7. **Pairwise reconciliation scope.** Five neighbors at weight >=3 (ITSM 5, DISCOVERY 5, APM 3). DISCOVERY and APM each generated all their gap traffic from null-FK source modules (the other-side modularization gap). Decide: (a) run the full 5-section pairwise diff inline for ITSM only (the only neighbor with a concrete pairwise gap), defer DISCOVERY/APM until they are modularized; (b) run the inline diff for all three but flag the diff outputs as "blocked on neighbor modularization" where applicable; (c) defer all three to follow-up Validate runs once neighbors land. **Independent.**

### Bucket 3 — Phase 0 pending (speculative)

Universal-or-near-universal vendor entities the agent surfaced from vendor-knowledge (no separate subagent run); Phase 0 protocol vetting would confirm or filter. Domain-candidate items (rows 4 and onward) get queued via `append_missing_domain.ts`.

#### Entity / capability candidates (within CMDB)

| ID | Candidate | Proposed module | Vendor evidence |
|---|---|---|---|
| B3-E1 | `ci_views` | CMDB-CORE | ServiceNow CMDB Performance Analytics views, Device42 saved searches. Curated subsets of the CI graph; not a full master but heavy enough to warrant Phase 0 vetting. |
| B3-E2 | `service_health_indicators` | CMDB-SERVICE-MAPPING | Universal in service-mapping flagships (ServiceNow Service Operations Workspace, BMC Helix Service Resolution). Could equally live in AIOPS or OBS once those are modularized. |
| B3-E3 | `change_blackout_windows` | CMDB-BASELINES-DRIFT | ServiceNow CMDB freeze windows, BMC Helix change calendars. Could live in ITSM-CHANGE-MGMT instead; modularization-issue candidate. |
| B3-E4 | `software_install_records` | CMDB-CORE (or SAM consumer) | Universal in discovery vendors (Device42, Ivanti). Almost certainly belongs in SAM proper, not CMDB; surfaces here because flagships ship it inside CMDB UIs. |
| B3-E5 | `ci_health_scores` | CMDB-CORE | ServiceNow CMDB Health Dashboard scores (completeness, correctness, compliance). The substrate for the data-quality governance capability. |
| B3-E6 | `ci_decommission_requests` | CMDB-CORE | Universal: every flagship has a decommission workflow that flips the CI lifecycle from `retired` to `archived`. Maps to existing `archive_ci` workflow gate but the request entity itself is missing. |
| B3-E7 | regulation row `FedRAMP CM-2` and `FedRAMP CM-8` | (regulations) | NIST 800-53 Configuration Management family; for federal-government CMDB deployments. Lower confidence than SOX/PCI/ISO (B1-M5..7); Phase 0 vetting would confirm catalog scope. |
| B3-E8 | `ci_certification_evidence` | CMDB-CORE | SOX-ITGC, FedRAMP, and PCI audits all hit CMDB asking for evidence packets. Specialist entity; not universal. |

#### Domain candidates (queued to `audits/_missing-domains.md`)

| ID | Proposed code | Proposed name | Rationale |
|---|---|---|---|
| B3-D1 | CLOUD-ASSET-INVENTORY | Cloud Asset Inventory | JupiterOne, Steampipe, Faros AI, Wiz inventory side, Orca inventory side, AWS Config + Azure Resource Graph as platform-native. Distinct from CMDB (cloud-native, real-time, identity-centric), distinct from CSPM (no posture / compliance focus), distinct from DSPM (no data-classification focus). Possible new domain or a CMDB sub-domain depending on classification. |
| B3-D2 | CONFIG-COMPLIANCE | Configuration Compliance | Tanium, Qualys CSAM, Red Hat Insights Compliance. Continuous configuration-against-baseline compliance scoring; overlaps CMDB-BASELINES-DRIFT and GRC. Possibly folds into one of those. |
| B3-D3 | CMDB-FEDERATION | CMDB Federation / Data Fabric | ServiceNow CMDB Identification and Reconciliation Engine extended to multi-CMDB federations, BMC TrueSight Reconciliation. Probably folds back into CMDB as a capability rather than a domain. |
| B3-D4 | DISCOVERY-MODULARIZATION (decision queued, not a new domain) | (modularization decision for existing domain `DISCOVERY`) | DISCOVERY (domain 5) is a `domains` row with ZERO `domain_modules` (M1 failure on DISCOVERY's side). Five inbound CMDB handoffs carry null `source_domain_module_id` as a result. Not a domain-queue candidate (the domain exists); recorded here so the next DISCOVERY audit surfaces it. |

### Cross-bucket dependencies

- **Bucket 2 #3 (service-map ownership)** is dependent on **Bucket 3 #B3-D4** (DISCOVERY modularization): if DISCOVERY ships a module that masters `service_maps`, then CMDB-SERVICE-MAPPING demotes to consumer. Resolve B3-D4 first or hold #3.
- **Bucket 2 #6 (B9 fan-out target)** is loosely dependent on whether GRC and SECOPS audit pre-load `ci.unauthorized_change_detected` subscribers; can be resolved independently.
- **Buckets 1 #B1-S2 (lifecycle states) and Bucket 2 #1 (config-shape exemption for ci_classes) are linked**: resolving #B1-S2 requires the user's call on Bucket 2 #1 first (do we author lifecycle for `ci_classes` or take the exemption).
- Everything else is independent.

### Per-bucket prompts

- **Bucket 1:** *"Approve and apply these 12 in-scope fixes (B1-M1..M7, B1-S1..S4, B1-B1, B1-H1, B1-Pair-ITSM-1)? Reply 'all', 'just N, M, K' (by ID), or 'skip'. Note: B1-S2 needs Bucket 2 #1 (config-shape exemption for ci_classes) decided first."*
- **Bucket 2:** *"What's your call on each of these 7 judgment items? I will wait for your decision per item before acting; item #1 gates the lifecycle states load."*
- **Bucket 3:** *"Vet via Phase 0 vendor research (focused on ServiceNow CSDM, Device42 docs, BMC Helix Discovery schema), or eyeball-mode? If eyeball, name which of the 8 entity candidates and 3 domain candidates to treat as confirmed. The DISCOVERY modularization (B3-D4) is independent of this choice; it surfaces on DISCOVERY's next audit."*

### Report-only follow-ups (owed by other domains)

These are surfaced for tracking; not in CMDB's fix scope. The orchestrator can schedule audits on the owing domains.

- **DISCOVERY (domain 5) owes M1 (modularization) and B10b (NULL source_domain_module_id on handoffs 48, 49, 621, 625, 1199):** DISCOVERY has zero `domain_modules`. Five CMDB-adjacent handoffs cannot resolve their source-side FK until DISCOVERY ships at least one module. Likely needs CMDB-SERVICE-MAPPING ownership question (Bucket 2 #3) resolved in parallel.
- **AIOPS (domain 6) owes M1 and B10b (NULL target_domain_module_id on handoff 628):** AIOPS has zero `domain_modules`. Outbound `service_map.updated` cannot resolve target-side FK.
- **APM (domain 10) owes B8 inbound mirror for handoffs 236, 237, 854:** APM masters `enterprise_applications` (267) and `technology_platforms` (269). The relationship rows mirroring the lifecycle progression into the CMDB CI graph are partially present (rows 220, 232 cover one direction) but the `technology_platforms → configuration_items` mirror is missing. Surfaces on APM's next audit.
- **ITSM (domain 1) owes B8 inbound mirror for handoff 30 plus B9 fan-out subscribers for `ci.unauthorized_change_detected` (handoff 51), if Bucket 2 #6 lands on `add GRC + SECOPS`:** ITSM module 41 (`ITSM-CHANGE-MGMT`) needs to confirm it consumes `ci_baselines` once the relationship from B1-Pair-ITSM-1 lands. The change-management module's own audit should pick this up.
- **RMM (domain 130) owes M1 and B10b (NULL source_domain_module_id on handoff 146):** RMM unmodularized.
- **NPMD (domain 82) owes M1 and B10b (NULL source_domain_module_id on handoff 654):** NPMD unmodularized.
- **DCIM (domain 84) owes M1 and B10b (NULL source_domain_module_id on handoff 679):** DCIM unmodularized.
- **Substring-tagged APQC rows on other domains' handoffs** (read-only impact for CMDB): the `discovery_substring` mis-tags on handoffs 48 / 49 / 51 / 236 / 237 will be replaced by the CMDB load if Bucket 1 #B1-H1 is approved. No write needed on other domains.

### Decisions

_pending user review_

### Fixes applied

_none yet; awaiting Bucket 1 / 2 / 3 decisions_
