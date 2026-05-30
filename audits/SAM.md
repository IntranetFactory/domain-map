---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 14
---

# SAM, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules` rows** (M1 hard-fail; same shape as RMM, DISCOVERY, UEM, APP-PAAS in this corner of the catalog). 5 capabilities (`SAM-DISCOVERY`, `SAM-ENTITLEMENT`, `SAM-AUDIT`, `SAM-METER`, `SAM-RENEWAL`). 4 masters at the domain rollup level (`software_titles` 57, `software_licenses` 58, `software_installations` 59, `license_audits` 60). 1 contributor rollup (`configuration_items` on the ITSM/CMDB axis). 1 `embedded_master` rollup (`org_units` 34, HCM-mastered). 15 solutions (4 primary: ServiceNow SAM Pro, Flexera One, Snow License Manager, USU SAM; 2 secondary: ServiceNow ITAM, Lansweeper; 9 partial across the RMM tooling band). 8 trigger_events on SAM-mastered data_objects (3 with empty `event_category`, 3 of those duplicate-semantics on `software_installations`). 6 outbound + 7 inbound cross-domain handoffs (13 total). 0 intra-domain handoffs (consequence of M1). 0 aliases on any master (B11 fail). 0 `data_object_lifecycle_states` rows on any of the 4 masters (Rule #12 fail). 1 legacy domain-level `system` skill (`sam-system` id 105, `domain_module_id` NULL) with 4 `skill_tools` rows (all `query_*`, all `coverage_tier='platform'`); zero `mutate`, zero `side_effect`, zero workflow-gate tools (downstream of M1). 0 SAM roles defined.
- **Vendor-surface basis (Pass 2 flagship enumeration):** 7 vendors (Flexera, Snow, USU, ServiceNow SAM Pro, Anglepoint, Certero, Eracent). 42 entities surfaced (16 Core, 11 Common, 4 Specialist, 13 Compliance). Pass 2 argues for **6 modules** (vs the 4 in the Bucket-1 hypothesis); supersedes B2-S1.
- **Bucket 1 (in-scope, agent fixable):** 13 items (after adding B1-S12, B1-S13).
- **Bucket 2 (surface-for-user, judgment):** 7 items (B2-S1 superseded by Pass 2 6-module shape; B2-S2 through B2-S8 still open).
- **Bucket 3 (Phase 0, market-surface):** 38 MISSING entities, 0 SCOPE-CREEP, 4 WRONG-OWNERSHIP (the existing rollup masters need re-homing into the proposed 6 modules); see Bucket 3 below.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO rollups; module-FK columns useless because SAM has none, and most neighbors are also unmodularized in this band):

| Neighbor | Out | In | Cross-rollup | Weight | Pass shape |
|---|---|---|---|---|---|
| ITSM | 2 | 0 | 1 (contributor on configuration_items via CMDB) | 3 | Pairwise (full) |
| APM | 0 | 2 | 0 explicit; relationship `enterprise_applications installs/licenses software_titles` (2 rows) implies consumer | 2-3 | Pairwise (full) |
| DISCOVERY | 0 | 2 | 0 explicit | 2 | Pairwise (full) |
| RMM | 0 | 1 | 0 explicit (RMM `software_endpoint.discovered` -> `software_installations`) | 1 | Lightweight |
| VULN-MGMT | 1 | 0 | 0 | 1 | Lightweight |
| S2P | 1 | 0 | 0 | 1 | Lightweight |
| FINOPS | 1 | 0 | 0 | 1 | Lightweight |
| GRC | 1 | 0 | 0 | 1 | Lightweight |
| UEM | 0 | 1 | 0 | 1 | Lightweight |
| APP-PAAS | 0 | 1 | 0 | 1 | Lightweight |
| HCM | 0 | 0 | 1 (embedded_master on org_units, HCM-mastered) | 1 | Lightweight |
| CLM | 0 | 0 | 0 explicit; relationship `legal_contracts activates software_licenses` implies consumer | 0-1 | Lightweight (boundary surfaced) |

**Structural pass bands:** S1-S3 pass at the domain row level (all 7 mandatory `domains` fields populated; A1 PASS). **M1 hard-fails** (0 `domain_modules` rows). M2-M7 cascade-fail or are vacuous. **A2 PASS** (5 capabilities). **A3 PASS** (15 solutions, 4 primary). **A4 N/A** (no regulations rows; SAM has no direct statutory anchor of its own; vendor audit clauses are commercial contracts, not regulations). **B1 PASS** (4 masters). **B2 PASS** (every master has `singular_label` + `plural_label`). **B3 PASS** (4 masters all prefixed `software_*` / `license_*`; no bare-word claims). **B4 partial** (every master has `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`; positive re-evaluation flags `license_audits.has_submit_lock` and `license_audits.has_single_approver` as candidates -- see B2-S2). **B5 PASS** (one embedded_master row, `org_units` 34, has canonical master in HCM 54). **B6 hard-fail** (zero `data_object_relationships` rows among the 4 SAM masters; expected graph below). **B7 hard-fail** (zero `users` edges on any SAM master; `license_audits` should edge to `users` as auditor / assignee; `software_licenses` as license_owner; `software_titles` as catalog_owner). **B8 partial** (1 outbound payload-to-target relationship to non-SAM master implied by handoff payloads: `software_titles → software_installations` is intra-domain B6 not B8; cross-domain B8 candidates: none with clean payload->target mapping among current outbound handoffs since payloads are all SAM masters). **B9 partial-fail** (3 trigger_events on `software_installations` carry empty `event_category` AND are semantic duplicates: 121 `software_endpoint.discovered`, 122 `software_install.detected`, 123 `software.discovered` -- only 122 has an outbound handoff; 121 and 123 are SAM-inbound from RMM and DISCOVERY respectively; the publisher mis-attribution is a B9 defect since the trigger_event's `data_object_id` points at SAM's master but the publisher is the source domain). **B9b N/A** (0 intra-domain handoffs; would be hard-fail post-M1 with multiple expected pairs). **B10b cascade-fail** (all 6 outbound handoffs carry NULL `source_domain_module_id`; 5 of 7 inbound handoffs carry NULL `target_domain_module_id`; 2 inbound have `source_domain_module_id` set from APM side). **B11 hard-fail** (zero aliases on any master; "software entitlement", "software asset record", "license certificate", "ELP / Effective License Position", "DCR / Deployment Compliance Report", "license keys" are real industry synonyms). **B12 hard-fail / Rule #12** (zero lifecycle states on any of 4 masters; `license_audits` has obvious workflow `requested -> evidence_gathering -> submitted -> negotiating -> resolved`; `software_licenses` has `purchased -> active -> expiring -> expired -> renewed | retired`; `software_titles` and `software_installations` may qualify for config-shape exemption -- gated on B2-S3). **C1 PASS** (3 BFD rows: owner = IT Asset Management (function id 84, sub-function under IT Operations 27), contributors = Procurement, Finance). **C2 N/A** (no per-capability function override needed; all 5 SAM capabilities are owned by IT Asset Management). **D1 deferred** (UI spot check is post-fix). **E1-E6 vacuous** (no modules to bundle roles against; no SAM-specific roles exist). **F1 PASS-conditional** (legacy `sam-system` skill 105 with `domain_module_id=NULL` is the canonical transitional state per F1 since no module-level skill exists yet; becomes a retirement target once B1-S1 modules land). **F2-F5 fail** (no module-level system skills; Semantius score uncomputable at the module level; at the legacy level, `sam-system` has 4 required tools, all `coverage_tier='platform'`, so its strict score is 4/4=100%). **F6 N/A**. **F7 N/A** (no channel-primitive tools linked; PASS by absence). **H1 hard-fail** (4 of 13 cross-domain handoffs carry `handoff_processes` rows; all 4 are `discovery_substring`, zero `agent_curated`, zero `human_curated`, zero `record_status='approved'`; **volume expectation per SKILL H1: 0.5N to 0.8N for N=13 -> 7 to 10 agent_curated tags total; current count is 0**; 9 untagged handoffs).

SAM Semantius score: **strict 4/4 = 100% on the legacy `sam-system` skill** (queries only, all platform-tier). **Module-level uncomputable** until B1-S1 lands. Once modules + per-module system skills + tool floors are authored, the score will reflect the real workflow needs (license_audit document submission likely brings `send_email` / `sign_document` channel needs; software_endpoint.discovered ingestion likely brings `receive_webhook` and `notify_team` floor); estimated module-level strict score after Phase A re-author: **80-95% across the 4-5 modules**, with the lowest score on the `SAM-AUDIT-DEFENSE` candidate module (publisher document submission is the canonical external-channel sink).

**Pattern-flag positive re-evaluation (Rule #12 / B4) snapshot:** every one of the 4 master data_objects has all 3 pattern flags at `false`. Surfaced for re-evaluation: `license_audits.has_submit_lock=true` (once an audit response is submitted to the publisher, the snapshot is locked); `license_audits.has_single_approver=true` (the publisher audit response is approved by IT Asset Management lead / CIO before submission). B2-S2.

**Rule #15 notes-pollution audit:** zero populated `notes` columns on SAM's 6 `domain_data_objects` rows. Clean.

**Em-dash audit (CLAUDE.md project rule):** 2 violations.
- `domains.business_logic` on SAM (id 52) contains an em-dash after "metrics)".
- `skills.description` on `sam-system` (id 105) contains an em-dash after "Software Asset Management".
Both are mechanical PATCHes (Bucket 1, B1-S10).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (M / B / E / F cascade off M1)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard fail, zero `domain_modules` rows** | Per Rule #14 every `domains` row MUST have at least 1 `domain_modules` row with `module_kind='full'`. SAM has zero. Per Rule #14 the 5 capabilities also require at least 2 modules. Proposed module shape from the masters + capability + handoff structure (gated on B2-S1 and Pass 2 vendor-surface confirmation): **(a) `SAM-CATALOG`** mastering `software_titles` (57), realizing `SAM-DISCOVERY` (partially, the normalization slice), consuming `enterprise_applications` from APM; publishes `software_title.added_to_catalog`, `software_title.eol_reached`. **(b) `SAM-ENTITLEMENT-MGMT`** mastering `software_licenses` (58), realizing `SAM-ENTITLEMENT` + `SAM-RENEWAL`, consuming `legal_contracts` from CLM; publishes `software_license.over_consumed`, `software_license.under_consumed`, `license.expiry_warning`. **(c) `SAM-DISCOVERY-INVENTORY`** mastering `software_installations` (59), realizing `SAM-DISCOVERY` (the install-side slice) + `SAM-METER`, consuming `configuration_items` from CMDB, `discovery_scans` from DISCOVERY, `enterprise_applications` from APM, `device_app_assignments` from UEM, `paas_addons` from APP-PAAS; publishes `software_install.detected`. **(d) `SAM-AUDIT-DEFENSE`** mastering `license_audits` (60), realizing `SAM-AUDIT`, consuming `software_licenses` + `software_installations` as embedded_masters (or co-deploy contract); publishes `license_audit.required` plus the missing `license_audit.submitted` / `license_audit.resolved` events. Whether `SAM-AUDIT-DEFENSE` is a fourth module or merges into `SAM-ENTITLEMENT-MGMT` is a Bucket 2 (B2-S1) judgment call; the surface enumeration argues for separation since audit defense has a distinct lifecycle, distinct user persona (audit defense team), and distinct compliance shape vs ongoing entitlement reconciliation. Final shape proposed: **4 full modules**. | Phase-A re-author. Surface for user approval of the 4-module shape (gated on B2-S1), then load the 4 modules + their `domain_module_capabilities` + `domain_module_data_objects` rows + 4 system skills + tool floors per Rule #17 + lifecycle states per Rule #12 + role bundles per E-band. |
| B1-S2 | **B9 missing event_category on 3 trigger_events** | Trigger events 121 `software_endpoint.discovered`, 122 `software_install.detected`, 123 `software.discovered` carry empty `event_category` (Rule #13 enum must be one of `lifecycle`, `state_change`, `threshold`, `signal`). Additionally, 617 `software_title.added_to_catalog`, 618 `software_title.eol_reached`, 619 `software_license.over_consumed`, 620 `software_license.under_consumed` also carry empty `event_category` -- 7 trigger_events in total. | PATCH: 121, 122, 123 -> `signal` (discovery events are unsolicited signals); 617 -> `lifecycle` (catalog state addition); 618 -> `lifecycle` (catalog state retirement); 619 -> `threshold` (consumption crossed entitled count); 620 -> `threshold` (consumption fell below allocation threshold). |
| B1-S3 | **B9 duplicate trigger_events on `software_installations`** | Three semantically-identical events fire on `data_object_id=59`: 121 `software_endpoint.discovered` (RMM publishes via inbound handoff 145), 122 `software_install.detected` (SAM publishes outbound to VULN-MGMT via handoff 36), 123 `software.discovered` (DISCOVERY publishes via inbound handoff 33). The trigger-event-ownership rule ("one event, many subscribers") means SAM's `software_installation.discovered` should be ONE event with multiple subscribers; the inbound handoffs from RMM and DISCOVERY are publishing INTO `software_installations` (RMM and DISCOVERY are the sources of discovery signal; SAM is the consumer). The clean shape: keep 122 as SAM's master outbound event renamed to `software_installation.detected_by_sam`, and have inbound handoffs 33 + 145 each fire their own source-side event (`discovery_run.completed` from DISCOVERY, `endpoint_telemetry.collected` from RMM) on the source domain's master, NOT on SAM's `software_installations`. The current shape mis-attributes 121 and 123 to SAM's master at the publisher side. | (1) Re-author 121 to publish from RMM-mastered `discovered_devices` or `rmm_agents`. (2) Re-author 123 to publish from DISCOVERY-mastered `discovery_scans` (81). (3) Repoint inbound handoffs 33 and 145 to reference the source-domain events. (4) Keep 122 as SAM's outbound to VULN-MGMT. Mechanical event re-pointing + handoff PATCH. Owned by SAM since SAM masters `software_installations` and the cleanup affects which trigger_event a SAM data_object owns. |
| B1-S4 | **B9 missing trigger_events for license_audits lifecycle** | The `license_audits` master has 1 trigger_event (71 `license_audit.required`). Once lifecycle states land per B1-S5, the following events are missing: `license_audit.opened`, `license_audit.evidence_gathered`, `license_audit.submitted`, `license_audit.negotiating`, `license_audit.resolved`, `license_audit.closed`. 6 missing events. `software_licenses` similarly missing: `software_license.activated`, `software_license.renewal_due`, `software_license.renewed`, `software_license.retired`. 4 more. Total: 10 missing events. | After B1-S5 lifecycle states land, insert 10 `trigger_events` rows with `event_category='lifecycle'` or `state_change`. Each becomes a candidate publisher for cross-domain handoffs (`license_audit.submitted` -> S2P or Legal; `software_license.renewal_due` -> S2P; `software_license.activated` -> CMDB/ITSM). |
| B1-S5 | **B12 / Rule #12 fail, no lifecycle states on any master** | All 4 SAM masters lack `data_object_lifecycle_states` rows. Per Rule #12: every `master + required` data_object needs lifecycle rows OR a config-shape exemption surfaced to the user (Rule #15 forbids the prior auto-write-to-notes carve-out). Proposed state machines: **`license_audits`**: `requested` (initial) -> `evidence_gathering` -> `submitted` (`requires_permission=true`, verb `submit_audit`, gates submission) -> `negotiating` -> `resolved` (terminal). **`software_licenses`**: `pending_purchase` -> `active` (initial for catalog-side) -> `expiring` (warning state, may not be a separate row) -> `renewing` -> `renewed` (loop back to active) | `expired` | `retired` (terminal). **`software_titles`** and **`software_installations`**: candidate for config-shape exemption (author-once / occasionally-edit), surface in B2-S3 for user judgment. | Author lifecycle rows for 2 confirmed master state machines (`license_audits`, `software_licenses`); gate the other 2 (`software_titles`, `software_installations`) on B2-S3. Each row carries `domain_module_id` pointing at the realizing module from B1-S1. |
| B1-S6 | **B11 hard-fail, zero aliases on any master** | None of the 4 SAM masters have aliases despite real industry synonyms: `software_titles` aliases include "Software Product Catalog Entry", "Publisher Catalog Item" (vendor-side), "Normalized Software Product" (industry); `software_licenses` aliases include "Software Entitlement", "License Certificate", "ELP Record" (Effective License Position); `software_installations` aliases include "Software Deployment", "Install Record", "DCR Record" (Deployment Compliance Report); `license_audits` aliases include "Publisher Audit Case", "Software Audit Engagement", "DCR Submission". | Author 8-12 alias rows across the 4 masters. Industry-standard synonyms (ELP, DCR) come from ITAM Review terminology. Vendor-specific synonyms (e.g. "Asset Configuration" in some Snow contexts) belong here per Rule #18 (commerce-layer carve-out: aliases ARE allowed vendor-name surface). |
| B1-S7 | **B6 hard-fail, zero intra-domain `data_object_relationships`** | Among SAM's 4 masters, zero relationship rows exist. Expected graph: (a) `software_licenses entitles software_titles` (one license entitles one title; cardinality `many_to_one`, owner_side `source`, required); (b) `software_installations is_of software_titles` (cardinality `many_to_one`, owner_side `source`, required); (c) `software_installations consumes software_licenses` (the entitlement-consumption edge, `many_to_one`, owner_side `source`, optional since some installations are unlicensed or trial); (d) `license_audits audits software_titles` (`many_to_many` since one audit can cover several titles; junction `audit_titles` may or may not be needed depending on the scope); (e) `license_audits scrutinizes software_licenses` (`many_to_many`); (f) `license_audits examines software_installations` (`many_to_many`, the deployment evidence). 6 intra-domain edges. | Author 6 `data_object_relationships` rows. Mermaid block in the load draft surfacing the graph before insert (per the Phase B authoring rule). |
| B1-S8 | **B7 hard-fail, zero `users` edges** | None of the 4 masters edge to `users`. Expected: `license_audits` -> `users` as `assigned_to` (audit response coordinator); `software_licenses` -> `users` as `license_owner`; `software_titles` -> `users` as `catalog_owner` (the SAM analyst who maintains the publisher catalog entry); optional: `software_installations` -> `users` as `assigned_to` (the end-user assignee for named-user licenses). 3-4 user edges. | Author 3-4 `data_object_relationships` rows per Rule #10. The `users` row is `kind='platform_builtin'` (canonical at `data_objects.data_object_name='users'`). |
| B1-S9 | **B10b cascade, all 6 outbound + 5 of 7 inbound NULL on the SAM side** | 6 outbound (35, 36, 37, 636, 637, 638) all have NULL `source_domain_module_id`. 5 of 7 inbound (145, 33, 623, 662, 798) have NULL `target_domain_module_id`. SAM owns the fix on all of these once B1-S1 modules land. Likely post-B1-S1 mappings: outbound (35 license.expiry -> `SAM-ENTITLEMENT-MGMT`; 36 install.detected -> `SAM-DISCOVERY-INVENTORY`; 37 audit.required -> `SAM-AUDIT-DEFENSE`; 636 over_consumed -> `SAM-ENTITLEMENT-MGMT`; 637 under_consumed -> `SAM-ENTITLEMENT-MGMT`; 638 eol_reached -> `SAM-CATALOG`); inbound (33 software.discovered -> `SAM-DISCOVERY-INVENTORY`; 145 endpoint.discovered -> `SAM-DISCOVERY-INVENTORY`; 623 discovery_scan.completed -> `SAM-DISCOVERY-INVENTORY`; 662 device_app_assignment.deployed -> `SAM-DISCOVERY-INVENTORY`; 798 paas_addon.provisioned -> `SAM-DISCOVERY-INVENTORY`). | PATCH 6 outbound + 5 inbound post-B1-S1. Mechanical PATCH per row using the master-resolution rule from B10b. |
| B1-S10 | **CLAUDE.md em-dash violations** | `domains.business_logic` on SAM contains an em-dash after "metrics)". `skills.description` on `sam-system` contains an em-dash after "Software Asset Management". | 2 mechanical PATCHes replacing the em-dash with a sentence break or colon. |
| B1-S11 | **B9b would hard-fail post-B1-S1** | A 4-module domain has 0 intra-domain handoff rows. Expected intra-domain handoff candidates from the master relationship graph + cross-module event flow: (a) `SAM-CATALOG` -> `SAM-ENTITLEMENT-MGMT` on `software_title.added_to_catalog` (new title triggers entitlement-tracking setup); (b) `SAM-DISCOVERY-INVENTORY` -> `SAM-ENTITLEMENT-MGMT` on `software_install.detected` (install consumption flows into entitlement reconciliation); (c) `SAM-ENTITLEMENT-MGMT` -> `SAM-AUDIT-DEFENSE` on `license.audit_required` (entitlement deficit detected during reconciliation escalates to audit case opening); (d) `SAM-CATALOG` -> `SAM-AUDIT-DEFENSE` on `software_title.eol_reached` for in-flight audits scoped to retiring products. 4 intra-domain handoff candidates, all `integration_pattern='lifecycle_progression'`, `friction_level='low'`. | After B1-S1 modules land + B1-S4 events authored, insert 4 intra-domain `handoffs` rows with `source_domain_id=target_domain_id=52`. |

#### APQC TAGGING (H1 hard-fail, the SKILL anti-pattern is alive on SAM)

4 of 13 cross-domain handoffs carry `handoff_processes` rows. **All 4 are `discovery_substring`; zero `agent_curated`, zero `human_curated`, zero `record_status='approved'`.** **Volume expectation per SKILL H1: 0.5N to 0.8N for N=13 -> 7 to 10 agent_curated tags total.** The audit proposes the following 9 new candidates from the structural pass (one per untagged cross-domain handoff):

| handoff_id | source -> target | trigger_event | payload | Proposed PCF activity | Confidence |
|---|---|---|---|---|---|
| 36 | SAM -> VULN-MGMT | `software_install.detected` | `software_installations` | Manage IT security risks / Identify vulnerabilities (under 20748 area) | confident L3 |
| 37 | SAM -> ITSM | `license_audit.required` | `service_requests` | Manage IT service requests (under 10408 area) | confident L3 |
| 145 | RMM -> SAM | `software_endpoint.discovered` | `software_installations` | Inventory IT assets / Discover IT assets (under 20838 area) | confident L3 |
| 623 | DISCOVERY -> SAM | `discovery_scan.completed` | `discovery_scans` | Discover IT assets (under 20838 area) | confident L3 |
| 636 | SAM -> S2P | `software_license.over_consumed` | `software_licenses` | Plan and budget IT license usage volumes (20893 area) / Procure software licenses | confident L3 |
| 637 | SAM -> FINOPS | `software_license.under_consumed` | `software_licenses` | Optimize IT spend / Reclaim unused IT assets | confident L3 |
| 638 | SAM -> GRC | `software_title.eol_reached` | `software_titles` | Manage IT security risks / Identify vulnerabilities (EOL = unsupported = vuln risk) | confident L3 |
| 662 | UEM -> SAM | `device_app_assignment.deployed` | `device_app_assignments` | Inventory IT assets / Track software entitlements | confident L3 |
| 798 | APP-PAAS -> SAM | `paas_addon.provisioned` | `paas_addons` | Track software entitlements / Manage cloud cost | medium (PaaS addon licensing is a borderline SAM concern) |

9 candidate APQC tags as INSERTs (the 4 existing `discovery_substring` rows on handoffs 33, 35, 235, 238 also need REPLACE evaluation -- 1290 "Plan and budget IT license usage volumes" on handoff 35 is borderline since the handoff is about an expiring license raising a service request, not about budget planning; surface as REPLACE-candidate in fix loop). PCF id lookups at fix time via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 + B9 events x2 + B9 dedup + B12 lifecycle + B11 aliases + B6 relationships + B7 users + B10b backfill + em-dash + B9b intra) | 11 |
| APQC TAGGING (9 INSERTs + 1 REPLACE evaluation) | 1 H1 rollup item |
| **Bucket 1 total** | **11 items** (S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11 + H1 rollup) |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

**ITSM <-> SAM (weight 3).** Wired pairs: 2 outbound (35 license.expiry_warning, 37 license_audit.required), both targeting ITSM-SERVICE-REQUEST module 39 -- target side already populated. Section 2: both have NULL `source_domain_module_id` (B1-S9, SAM owes once B1-S1 lands; expected target `SAM-ENTITLEMENT-MGMT` for 35, `SAM-AUDIT-DEFENSE` for 37). Section 3: no missing inbound from ITSM to SAM; an unlikely candidate would be `incident.resolved` for a license-related incident triggering an entitlement re-check, but this is rare. Section 4: SAM rolls up contributor on `configuration_items` (76, ITSM/CMDB-mastered) at the domain level -- ITSM/CMDB's audit owes the equivalent embedded_master/contributor rows post-modularization. Section 5: zero cross-domain relationships explicitly between SAM masters and ITSM masters; expected: `service_request fulfills license_request` (where license_request would be a future SAM master if SAM models procurement requests). **Boundary finding (Bucket 1):** B1-S9 covers the mechanical PATCH.

**APM <-> SAM (weight 2-3).** Wired pairs: 2 inbound (235 application.onboarded, 238 application.lifecycle_state_changed), both sourcing from APM-PORTFOLIO-REGISTRY module 103 (source side already populated). Section 2: both have NULL `target_domain_module_id` (B1-S9, SAM owes; expected `SAM-CATALOG` or `SAM-DISCOVERY-INVENTORY` post-B1-S1; depends on whether the application-onboarding signal flows into title-catalog or install-inventory). Section 3: missing outbound from SAM to APM: SAM-detected EOL software titles should fire `software_title.eol_reached` to APM (so APM can flag dependent enterprise_applications); the current outbound 638 fires to GRC only. **Boundary finding (Bucket 2, missing handoff):** B2-S5. Section 4: SAM should declare `enterprise_applications` (267) as `consumer` in DMDO since the inbound handoffs reference it; currently no DMDO row. **Boundary finding (Bucket 1):** B1-S12 (add DMDO consumer row -- see Bucket 1 additions below). Section 5: 2 relationships exist (`enterprise_applications installs software_titles`, `enterprise_applications licenses software_titles`); the inverse direction is implicit. No additional relationships needed.

**DISCOVERY <-> SAM (weight 2).** Wired pairs: 2 inbound (33 software.discovered, 623 discovery_scan.completed). Section 2: both have NULL on both sides (DISCOVERY also has zero modules, so both `source_domain_module_id` and `target_domain_module_id` cascade). Section 3: handoff 33 is part of the duplicate-events problem (B1-S3); the cleanup repoints to a DISCOVERY-mastered event, not a SAM-mastered event. Section 4: SAM should declare `discovery_scans` (81) as `consumer` in DMDO since handoff 623 references it; currently no DMDO row. **Boundary finding (Bucket 1):** B1-S12 (add DMDO consumer row). Section 5: zero relationships between SAM and DISCOVERY masters.

**RMM <-> SAM (weight 1, lightweight).** Wired pair: 1 inbound (145 software_endpoint.discovered). Section 2: NULL on both sides (RMM also has zero modules). Section 3: handoff 145 is part of the duplicate-events problem (B1-S3); the cleanup repoints to an RMM-mastered event. Section 4: no DMDO collisions. Section 5: no relationships.

**UEM <-> SAM (weight 1, lightweight).** Wired pair: 1 inbound (662 device_app_assignment.deployed). Section 2: NULL on both sides. Section 3: clean. Section 4: SAM should declare `device_app_assignments` (560) as `consumer` in DMDO. **Boundary finding (Bucket 1):** B1-S12. Section 5: no relationships.

**APP-PAAS <-> SAM (weight 1, lightweight).** Wired pair: 1 inbound (798 paas_addon.provisioned). Section 2: NULL on both sides. Section 3: PaaS addon licensing is a borderline SAM scope (some addons are billable; others are bundled). Surface in Bucket 2 for scope decision (B2-S6). Section 4: SAM may or may not declare `paas_addons` (467) as consumer depending on B2-S6. Section 5: no relationships.

**VULN-MGMT <-> SAM (weight 1, lightweight).** Wired pair: 1 outbound (36 software_install.detected). Section 2: NULL on both sides (VULN-MGMT is leadership-tier per SKILL, so it may stay no-module-by-design). Section 3: missing outbound from VULN-MGMT to SAM: when a vulnerability is identified on a `software_title`, the title's `license_audits` risk profile should update; but VULN-MGMT publishes against its own derived signals, not SAM masters. Acceptable as-is for a leadership-tier domain. Section 4: clean. Section 5: clean.

**S2P <-> SAM (weight 1, lightweight).** Wired pair: 1 outbound (636 software_license.over_consumed). Section 2: SAM source NULL (B1-S9); S2P target NULL (S2P needs audit independently). Section 3: missing outbound from S2P to SAM: when a software purchase order is approved, the new `software_licenses` row should be auto-created in SAM. The current shape requires SAM to subscribe to S2P's `purchase_order.approved` event. **Boundary finding (Bucket 2, missing handoff):** B2-S7. Section 4: no DMDO collisions. Section 5: no relationships explicit; implicit `purchase_orders entitles software_licenses` candidate.

**FINOPS <-> SAM (weight 1, lightweight).** Wired pair: 1 outbound (637 software_license.under_consumed). Section 2: SAM source NULL (B1-S9); FINOPS is leadership-tier so target NULL is by design. Section 3: clean. Section 4: clean. Section 5: clean.

**GRC <-> SAM (weight 1, lightweight).** Wired pair: 1 outbound (638 software_title.eol_reached). Section 2: SAM source NULL (B1-S9); GRC target NULL (GRC needs audit independently). Section 3: missing outbound from GRC to SAM: a published `vulnerability.published` for a software title could trigger SAM to check the deployment scope. Plausible but not yet authored. **Boundary finding (Bucket 2, missing handoff candidate):** B2-S8. Section 4: clean. Section 5: clean.

**CLM <-> SAM (weight 0-1, lightweight; relationship-implied).** Zero handoffs. The relationship row `legal_contracts activates software_licenses` (id 66 on CLM side -> 58 on SAM side) implies SAM is a downstream consumer of CLM `legal_contracts`. Section 3: missing outbound from CLM to SAM: when a legal_contract is activated/renewed/terminated, the bound `software_licenses` should flip state. The relationship exists but no `handoffs` row captures the event. **Boundary finding (Bucket 1, missing handoff):** B1-S13 (add inbound handoff `contract.activated` CLM -> SAM). Section 4: SAM should declare `legal_contracts` (66) as `consumer` in DMDO. **Boundary finding (Bucket 1):** B1-S12 (extend the consumer DMDO bundle).

**HCM <-> SAM (weight 1, lightweight).** Zero handoffs. `org_units` is `embedded_master + required` in SAM (canonical master in HCM 54). Section 3: missing outbound from HCM to SAM: `org_unit.archived` should propagate to SAM since named-user licenses or installations tied to a retired org_unit need reassignment. Plausible but low volume. Section 4: clean (existing embedded_master row is the right shape). Section 5: zero relationships; one candidate (`org_units assigned_to software_licenses` for named-user/seat licensing).

#### Additional Bucket 1 items surfaced during pairwise

| ID | Finding | Fix |
|---|---|---|
| B1-S12 | **B5/B8 hard-fail, missing DMDO consumer rows for inbound payloads** | SAM has 5 inbound handoffs whose payloads (`enterprise_applications` 267, `discovery_scans` 81, `device_app_assignments` 560, `paas_addons` 467, plus the implicit `legal_contracts` 66) are not declared as `consumer` rows on SAM in `domain_data_objects`. Per Rule #11 and the B5 spirit, every inbound payload that SAM consumes should have an explicit DMDO row. | Author 4-5 `domain_data_objects` rows on SAM (`role='consumer'`, `necessity='required'` for `enterprise_applications`, `discovery_scans`, `device_app_assignments`; `optional` for `paas_addons` and `legal_contracts` pending Bucket 2 decisions). |
| B1-S13 | **B9 missing CLM -> SAM handoff on contract activation** | The relationship `legal_contracts activates software_licenses` implies an event-driven flow but no `handoffs` row captures it. Without this row, the deployer cannot wire the contract lifecycle to license activation; SAM consumes contract data invisibly. | Author 1 inbound `handoffs` row: source CLM, target SAM, payload `software_licenses`, trigger_event `contract.activated` (or `legal_contract.activated`), `integration_pattern='event_stream'`, `friction_level='medium'`. Gated on CLM modules existing for the source-module FK. |

### Bucket 2, Surface for user judgment

| ID | Question | Why this is a judgment call, not a mechanical fix |
|---|---|---|
| B2-S1 | **SUPERSEDED by Pass 2 6-module shape.** | The Phase-1 4-module hypothesis is superseded by the market-audit findings in Bucket 3. The 6-module shape (`SAM-CATALOG`, `SAM-DISCOVERY`, `SAM-ENTITLEMENT`, `SAM-METERING`, `SAM-AUDIT`, `SAM-RENEWAL`) is grounded in the vendor surface enumeration. The user judgment that remains: confirm the 6-module shape is the target, OR push back on specific module boundaries (e.g. collapse `SAM-RENEWAL` into `SAM-ENTITLEMENT`, or split `SAM-AUDIT` into publisher-defense and internal-license). |
| B2-S2 | **`license_audits` pattern flags: `has_submit_lock=true`, `has_single_approver=true`?** | Once a publisher audit response is submitted, the snapshot is locked (cannot edit submitted evidence). The response is typically approved by an IT Asset Management lead / CIO before submission (single-approver workflow). Both flags should likely flip to `true`. Confirm before PATCH. |
| B2-S3 | **`software_titles` and `software_installations` lifecycle: config-shape exemption or full state machine?** | `software_titles` could be config-shape (catalog entry edited occasionally) OR have a real lifecycle (`active`, `eol`, `retired`). `software_installations` similarly: ephemeral discovery records vs `detected`, `verified`, `licensed`, `unlicensed`, `removed`. Decision depends on whether SAM treats these as long-lived records with state OR config-shape lookups. Per Rule #12 / Rule #15, the exemption decision must be surfaced to the user (NOT silently noted on the `data_objects.notes` column). |
| B2-S4 | **Vendor record refresh (Snow Software)?** | Snow Software was acquired by Insight Enterprises (2024). Vendors row says `vendor_name=Snow Software`; this is fine per Rule #18 but the predecessor mention rule (RESCINDED per Rule #15) means any provenance trailer on `solutions.notes` requires explicit user-approved wording. Out of scope for routine audit (A5 is opt-in only). Surfaced for awareness. |
| B2-S5 | **Missing handoff candidate: SAM -> APM on `software_title.eol_reached`?** | Pass-4 boundary finding: SAM publishes `software_title.eol_reached` to GRC but not to APM. APM's enterprise_applications consume software_titles via the existing relationship; an EOL title should propagate to APM so dependent applications get flagged for replacement. Loading the handoff is straightforward; the call is whether GRC is the only legitimate subscriber or whether APM is also a subscriber. Recommendation: add APM as a subscriber (same `trigger_event_id` 618, new handoff row to APM-PORTFOLIO-REGISTRY 103). |
| B2-S6 | **PaaS addon licensing scope: in or out of SAM?** | Handoff 798 brings `paas_addon.provisioned` from APP-PAAS into SAM. Some PaaS addons (database, queue, cache) are billable separately and have entitlement structures; others are bundled. Whether SAM models these as `software_installations` (or a new master `paas_addon_installations`) is a scope decision. Recommendation: stay narrow and treat the inbound as informational (SAM consumes for audit-trail purposes only, does not master the PaaS addons themselves); align with FINOPS which masters cloud-side consumption. |
| B2-S7 | **Missing handoff candidate: S2P -> SAM on `purchase_order.approved` (software-license POs)?** | Pass-4 boundary finding: when S2P approves a software-license PO, the new `software_licenses` row should auto-create in SAM. The current shape requires manual entry or a batch sync. Adding this handoff closes the loop on the purchase-to-entitlement flow. Plausible to add; the call is whether the S2P side already has `purchase_order.approved` published or needs authoring. Schedule S2P audit independently. |
| B2-S8 | **Missing handoff candidate: GRC -> SAM on `vulnerability.published` (CVE on software_title)?** | When GRC publishes a vulnerability finding tied to a software title, SAM could trigger a deployment scope check. Plausible but volume-low (most CVE-to-title mapping happens in VULN-MGMT, not GRC). May be redundant with the existing SAM -> VULN-MGMT handoff 36. Recommendation: defer; not a true boundary gap. |

### Bucket 3, Phase 0 vendor-surface diff (from market-audit subagent)

Source artifacts: `c:/tmp/SAM-market-surface-2026-05-30.md` and `c:/tmp/SAM-market-surface-2026-05-30.json` (vendor-surface enumeration on 7 flagship platforms: Flexera, Snow, USU, ServiceNow SAM Pro, Anglepoint, Certero, Eracent). 42 entities surfaced (16 Core, 11 Common, 4 Specialist, 13 Compliance). **38 MISSING entities**, **0 SCOPE-CREEP**, 4 WRONG-OWNERSHIP (the 4 current masters need re-homing).

#### Module-shape revision (supersedes B1-S1 and B2-S1)

Pass 2 argues for **6 modules**, not 4. The Phase-1 hypothesis (4 modules) collapses `SAM-METERING` and `SAM-RENEWAL` into other modules and ignores the case for a shared catalog substrate. The vendor surface has the catalog substrate (8 entities) consumed by every other module, the metering substrate (8 entities, including the central `effective_license_positions` ELP artifact) separate from both entitlement and audit, and renewal as a distinct workflow with its own quote/lifecycle entities. Proposed:

| Module | Masters (count) | Realizes | Key embedded / consumed |
|---|---|---|---|
| `SAM-CATALOG` | 8: `software_titles`, `software_editions`, `software_versions`, `publishers`, `publisher_product_catalogs`, `software_normalization_rules`, `eol_eosl_calendars`, `software_categories` | SAM-DISCOVERY (normalization slice) | None (substrate consumed by every other SAM module) |
| `SAM-DISCOVERY` | 4: `software_installations`, `discovery_runs`, `discovery_sources`, `swid_tags` | SAM-DISCOVERY (inventory slice) | embeds `configuration_items` (ITSM), `org_units` (HCM); consumes `SAM-CATALOG` |
| `SAM-ENTITLEMENT` | 12: `software_licenses`, `license_contracts`, `license_terms`, `license_metrics`, `license_keys`, `entitlement_pools`, `purchase_orders` (embedded from P2P), `license_allocations`, `named_user_assignments`, `publisher_use_rights`, `downgrade_rights`, `second_use_rights` | SAM-ENTITLEMENT | embeds `org_units`, `users`, `legal_contracts` (CLM, contributor) |
| `SAM-METERING` | 8: `usage_meterings`, `reclamation_requests`, `license_harvest_jobs`, `effective_license_positions`, `compliance_postures`, `oracle_options_packs`, `sap_indirect_access_documents`, `ibm_subcapacity_declarations` | SAM-METER | consumes `SAM-DISCOVERY`, `SAM-ENTITLEMENT` |
| `SAM-AUDIT` | 8: `license_audits`, `publisher_audits`, `audit_evidence_packages`, `audit_findings`, `audit_responses`, `audit_response_letters`, `true_up_events`, `gdpr_processing_records` | SAM-AUDIT | consumes `SAM-METERING` (ELP), `SAM-ENTITLEMENT` (pools) |
| `SAM-RENEWAL` | 3: `renewals`, `renewal_quotes`, `product_lifecycle_states` | SAM-RENEWAL | consumes `SAM-ENTITLEMENT`, `SAM-CATALOG` (EOL) |

**Total: 43 SAM masters** (4 currently loaded + 39 net new after re-homing). B2-S1 should be retired in favor of this 6-module shape unless the user pushes back on specific entries.

#### MISSING entities (38, grouped by destination module)

**Catalog substrate (7 new masters into `SAM-CATALOG`):**
- `software_editions` -- Core. Edition is a separate axis from title (Enterprise vs Standard); often the licensing pivot.
- `software_versions` -- Core. Version matters for downgrade/upgrade rights and EOL scoping.
- `software_categories` -- Common. Org-specific taxonomy (productivity / DBMS / OS / dev-tools).
- `publishers` -- Core. Publishers as distinct catalog rows from generic `vendors` (publishers issue licenses; vendors include resellers, MSPs, etc.).
- `publisher_product_catalogs` -- Core. The Technopedia / Snow DIS / Eracent IT-Pedia equivalent: publisher's authoritative product release record.
- `software_normalization_rules` -- Core. Discovery -> title-and-edition matching rules.
- `eol_eosl_calendars` -- Common. End-of-Life and End-of-Support calendar tied to versions / editions.

**Discovery substrate (3 new masters into `SAM-DISCOVERY`):**
- `discovery_runs` -- Core. Discovery job execution record. Distinct from `discovery_scans` (DISCOVERY domain owns scans; SAM owns the SAM-side run record).
- `discovery_sources` -- Common. Sources contributing to install inventory (agent vs RMM vs SCCM vs cloud-API).
- `swid_tags` -- Specialist (Eracent). ISO 19770-2 software identification tags. Compliance-relevant for ITAM standards.

**Entitlement substrate (11 new masters into `SAM-ENTITLEMENT`):**
- `license_contracts` -- Core. Specialization of CLM `legal_contracts` carrying SAM-specific fields (metric, true-up cadence, ULA period, anniversary date). CLM contributes the legal envelope; SAM masters the licensing-shaped specialization.
- `license_terms` -- Core. Per-metric pricing tier and quantity bracket.
- `license_metrics` -- Core. Metric vocabulary (Named User, Processor, PVU, RVU, MIPS, Document, Concurrent).
- `license_keys` -- Common. License-key vault entry.
- `entitlement_pools` -- Compliance. Pool record for Oracle ULA, MS EA enrollment, IBM ELA.
- `purchase_orders` -- Common (embedded from P2P / S2P). Embedded shell so SAM-ENTITLEMENT is deployable standalone.
- `license_allocations` -- Common. Allocation of license seats to org units / cost centers.
- `named_user_assignments` -- Compliance. Per-user assignment with history (Microsoft M365, Adobe VIP/ETLA, SAP user types).
- `publisher_use_rights` -- Compliance. Publisher T&Cs as structured rows (Microsoft Product Terms, IBM IPLA/ILA, SAP Passport/PSL).
- `downgrade_rights` -- Specialist (Microsoft Product Terms). The right to install N-1 versions under a current entitlement.
- `second_use_rights` -- Specialist (Microsoft Product Terms). Roaming / second-device rights.

**Metering substrate (8 new masters into `SAM-METERING`):**
- `usage_meterings` -- Core. Last-used and frequency-of-use per installation.
- `reclamation_requests` -- Common. Request to uninstall unused software.
- `license_harvest_jobs` -- Specialist. Batched reclamation campaigns.
- `effective_license_positions` -- Core. **The central ELP artifact: net entitlement vs deployment per (publisher, product, metric). Currently absent.** This is the SAM market's flagship reportable artifact.
- `compliance_postures` -- Common. Aggregate compliance state per publisher.
- `oracle_options_packs` -- Compliance. Oracle DB option auto-enablement and accounting.
- `sap_indirect_access_documents` -- Compliance. SAP BIS/DIA counted documents (sales orders, invoices, deliveries).
- `ibm_subcapacity_declarations` -- Compliance. Quarterly ILMT-signed PVU sub-capacity report.

**Audit substrate (7 new masters into `SAM-AUDIT`):**
- `publisher_audits` -- Compliance. Publisher-initiated audit engagement case file (distinct from internal `license_audits`).
- `audit_evidence_packages` -- Compliance. Evidence collation with data-residency tagging.
- `audit_findings` -- Compliance. Publisher's finding per audit.
- `audit_responses` -- Compliance. SAM team's response per finding.
- `audit_response_letters` -- Compliance. Counsel-signed response document.
- `true_up_events` -- Compliance. Annual true-up reconciliation (Microsoft EA, Adobe ETLA, Oracle ULA exit).
- `gdpr_processing_records` -- Compliance. GDPR Article 30 record for telemetry-on-named-users.

**Renewal substrate (3 new masters into `SAM-RENEWAL`):**
- `renewals` -- Core. Renewal pipeline entry per license.
- `renewal_quotes` -- Common. Vendor quotes for renewal cycle.
- `product_lifecycle_states` -- Common. Product lifecycle (GA, mainstream, extended, EOL, EOSL) cross-referencing `eol_eosl_calendars`.

#### Modularization-issues callouts (from market audit, surfaced as Bucket 3 hints)

- **`true_up_events` vs `entitlement_pools` boundary.** Pools (continuously-consumed envelope) live in ENTITLEMENT; true-ups (legal certification artifact at anniversary / ULA exit) live in AUDIT. FK cross-reference, no duplication.
- **`license_contracts` vs CLM `legal_contracts`.** SAM masters `license_contracts` as a specialization with SAM-specific fields (metric, true-up cadence, ULA period); CLM masters the legal envelope (signed_at, counterparty, governing_law). CLM contributes to SAM-ENTITLEMENT via FK. **This implies B1-S13 (CLM -> SAM `contract.activated` handoff) is a substrate-foundational handoff.**
- **Publisher-specific exotica placement.** `oracle_options_packs`, `sap_indirect_access_documents`, `ibm_subcapacity_declarations` are compliance-shaped but produced by metering processes; they belong in SAM-METERING with SAM-AUDIT as consumer.
- **No 7th module.** Audit-defense is sometimes pitched as a separate workflow but the vendor surface (Flexera ELP, Snow audit, USU SAP-compliance, Anglepoint full-service) treats it as one module with high-value entities (publisher_audits, audit_response_letters); splitting publisher-audit-defense from internal-license-audit is not justified.

#### Bucket 3 count summary

| Item | Count |
|---|---|
| New masters to author | 38 |
| Modules implied (revising B1-S1) | 6 |
| Modularization-issues callouts | 4 |
| SCOPE-CREEP findings | 0 |
| WRONG-OWNERSHIP findings | 4 (the current rollup masters needing re-home; mechanical part of B1-S1) |
| **Bucket 3 total work units** | **38 entity-load proposals + module-shape revision** |

### Update plan (priority order)

1. **Phase A re-author** (B1-S1, gated on B2-S1 and Bucket 3) -- author 4 (or 3 if B2-S1 collapses audit) `domain_modules` rows + `domain_module_capabilities` + `domain_module_data_objects` + per-module system skills + tool floors + role bundles. This is the load-bearing fix; everything else cascades off it.
2. **Mechanical PATCHes** (B1-S2 event_categories, B1-S10 em-dashes) -- 9 patches, no module dependency.
3. **Trigger-event cleanup** (B1-S3 dedup + B1-S4 lifecycle events) -- depends on B1-S5 lifecycle states.
4. **Lifecycle states** (B1-S5) -- depends on B1-S1 modules + B2-S2 pattern flags + B2-S3 exemption decisions.
5. **Aliases** (B1-S6) -- independent.
6. **Intra-domain relationships and users edges** (B1-S7, B1-S8) -- independent (B7 and B6).
7. **Inbound DMDO consumer rows** (B1-S12) -- independent.
8. **Intra-domain handoffs** (B1-S11) -- depends on B1-S1 + B1-S4.
9. **CLM -> SAM contract.activated handoff** (B1-S13) -- depends on CLM modularization.
10. **B10b backfill** (B1-S9) -- depends on B1-S1.
11. **APQC tagging** (H1 rollup, 9 INSERTs + REPLACE evaluation) -- independent.

### Re-audit acceptance criterion

This audit passes when:
- M1 satisfied (>=1 `domain_modules` row) + M2 satisfied (>=2 modules given 5 capabilities) + M4/M6 closed (every capability has a realizing module, every module realizes >=1 capability) + M7 holds (no within-domain master + consumer collision).
- B1-B12 all PASS or carry user-approved exemptions.
- C1-C2 unchanged (already PASS).
- E1-E6 PASS with >=2 SAM-specific roles defined and bundle drift A/B agree.
- F2-F5 PASS (one system skill per module, each with >=1 `skill_tools` row, Semantius score computable at module level).
- H1 PASS at the 0.5N-0.8N agent_curated-or-human_curated coverage floor.
- 0 em-dashes anywhere in SAM-touching rows.

Reports-only follow-ups remain open until the source/target domains are independently audited.
