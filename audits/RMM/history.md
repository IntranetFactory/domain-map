# RMM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules` rows** (M1 hard-fail). 8 capabilities (`RMM-EPM`, `RMM-PATCH`, `RMM-SCRIPT`, `RMM-DISC`, `RMM-INV`, `RMM-ALERT`, `RMM-MT`, `RMM-AI`). 5 masters at the domain rollup level (`rmm_agents` 223, `patch_jobs` 224, `automation_scripts` 225, `monitoring_policies` 86, `monitoring_alerts` 85; the latter two are multi-mastered with ITOM, see Pass 4). 4 contributor rollups (`configuration_items`, `hardware_assets`, `software_installations`, `discovered_devices`) and 1 contributor + 2 consumer ITSM rollups (`service_changes`, `service_incidents`, `service_requests`). 12 solutions (11 primary, 1 secondary). 9 trigger_events on RMM-mastered data_objects (2 with empty `event_category`). 10 outbound + 1 inbound cross-domain handoffs (11 cross-domain total). 0 intra-domain handoffs (consequence of M1). 2 aliases on `automation_scripts`. 0 `data_object_lifecycle_states` rows on any of the 5 masters (Rule #12 fail). 0 system skills / 0 `skill_tools` (F2/F3/F5 fail, downstream of M1). 0 RMM roles defined.
- **Vendor-surface basis (Pass 2 flagship enumeration):** NinjaOne, ConnectWise Automate plus ConnectWise RMM, Datto RMM (Kaseya), Kaseya VSA, N-able N-central plus N-sight, Atera, Syncro, Pulseway, Action1, SuperOps, ManageEngine Endpoint Central. Compliance surface is light (no statutory anchor specific to RMM; the regulated overlap is SOC 2 attestation on the MSP side and HIPAA/PCI/CMMC pass-through obligations when the MSP serves regulated customers). Adjacent specialist surface that landed in Pass 3 candidate queue: EDR (CrowdStrike, SentinelOne, Defender for Endpoint), Vulnerability Management (Tenable, Qualys, Rapid7), MSP Billing (ConnectWise Manage, Kaseya BMS, HaloPSA, Autotask).
- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 9 items.
- **Bucket 3 (Phase 0 pending, speculative):** 9 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO rollups; module-FK columns useless because RMM has none):

| Neighbor | Out | In | Cross-rollup | Weight | Pass shape |
|---|---|---|---|---|---|
| ITSM | 3 | 0 | 3 (consumer on service_incidents, service_requests; contributor on service_changes) | 6 | Pairwise (full) |
| ITOM | 0 | 0 | 2 (multi-master collision on monitoring_alerts + monitoring_policies) | 2 | Pairwise (full) |
| MSP-PSA | 1 | 0 | 2 (consumer on rmm_agents + monitoring_alerts in MSP-PSA-SVC-DESK; rmm_agents in MSP-PSA-DISPATCH) | 3 | Pairwise (full) |
| CMDB | 1 | 0 | 1 (contributor on configuration_items) | 2 | Pairwise (full) |
| HAM | 1 | 1 | 1 (contributor on hardware_assets) | 3 | Pairwise (full) |
| SAM | 1 | 0 | 1 (contributor on software_installations) | 2 | Pairwise (full) |
| DISCOVERY | 1 | 0 | 1 (contributor on discovered_devices; DISCOVERY also contributes to monitoring_policies) | 2 | Pairwise (full) |
| AIOPS | 1 | 0 | 1 (contributor on monitoring_alerts) | 2 | Pairwise (full) |
| ITAM | 1 | 0 | 0 | 1 | Lightweight |
| REMOTE-ACCESS | 0 | 0 | 1 (consumer on rmm_agents) | 1 | Lightweight |
| TEST-MGMT | 0 | 0 | 1 (multi-master collision on automation_scripts) | 1 | Pairwise (full, collision warrants it) |

**Structural pass bands:** S1-S3 pass (domain row populated, 7 mandatory `domains` fields all set). **M1 hard-fails** (0 `domain_modules` rows). M2-M7 cascade-fail by definition (no modules to evaluate). **B1-B12 mostly inapplicable** until M1 cleared, but the audit identifies expected module shape from capabilities + masters (see B1-S1). **B9 partial-fail** (2 of 9 trigger_events on RMM masters carry empty `event_category`: 651 `automation_script.executed`, 652 `automation_script.failed`). **B10b cascade** (all 10 outbound + 1 inbound cross-domain handoffs have NULL `source_domain_module_id` (outbounds) or NULL `target_domain_module_id` (inbounds) on the RMM side, because RMM has no modules to point at; these are RMM's fix, not the counter-party's, once M1 lands). **B12 fail** (Rule #12 mandates `data_object_lifecycle_states` rows on every `master + required` data_object; RMM has 0 such rows for 5 masters). **C1-C2** advisory: capability rows exist but `capability_domains` ties them to RMM at the domain level; once modules land, `domain_module_capabilities` rows are needed to surface which module realizes which capability. **D1 pass** (12 solutions, 11 primary). **E1-E6 fail** (no `role_modules` rows possible without modules; no roles defined for RMM). **F1-F5 fail** (no system skill; no `skill_tools`; Semantius score uncomputable). **F7** N/A until F2 satisfied. **H1 hard-fail** (3 of 11 cross-domain handoffs tagged; 2 `agent_curated`, 1 `discovery_substring`; zero `record_status='approved'`).

RMM Semantius score: **uncomputable** (no skills, no tools, no modules). Once Phase A bootstraps the modules + system skills + tools per Rule #17, baseline floor of ~70% looks achievable (most of the workflow is CRUD plus threshold-rule evaluation; the platform tier should cover the bulk, with external channel primitives for `execute_script_on_endpoint` and `send_remote_command` being the obvious side-effect leakage).

**Pattern-flag positive re-evaluation (Rule #12 / B4) snapshot:** every one of the 5 master data_objects has `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false` (one exception: `service_changes` has `has_single_approver=true` at the platform-level row). Surfaced for re-evaluation in B2-S5 below.

**Rule #15 notes-pollution audit:** every one of the 12 `domain_data_objects` rows on RMM has a populated `notes` field, narrating the mastering-vs-contributing dynamic ("Co-master with ITOM, which owns ...", "HAM remains master of the financial/lifecycle record; RMM feeds the live operational view", etc.). Rule #15 forbids auto-populated notes; this is a load-time pollution incident (B2-S2). Authoring discipline says: surface for user-approved wording, do not silently retain.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (M / B / E / F cascade off M1)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard fail, zero `domain_modules` rows** | Per Rule #14 every `domains` row MUST have at least 1 `domain_modules` row with `module_kind='full'`. RMM has zero. Per Rule #14 the 8 capabilities also require at least 2 modules (>=3 capabilities threshold). Expected module shape from the master + capability + handoff structure: **(a) `RMM-MONITORING`** mastering `monitoring_policies` (86) + `monitoring_alerts` (85), realizing `RMM-EPM` + `RMM-ALERT`, consuming `configuration_items`; **(b) `RMM-PATCH-MGMT`** mastering `patch_jobs` (224), realizing `RMM-PATCH`, consuming `software_installations` + `service_changes` (contributes back), publishing `patch_job.scheduled` and `patch_job.completed` events; **(c) `RMM-AUTOMATION`** mastering `automation_scripts` (225), realizing `RMM-SCRIPT`, publishing `automation_script.executed` + `automation_script.failed`; **(d) `RMM-AGENT-MGMT`** mastering `rmm_agents` (223), realizing `RMM-EPM` + `RMM-MT`, consuming all the contributor masters (CIs, hardware_assets, software_installations, discovered_devices). The `RMM-DISC` capability ("Network Discovery") could live in `RMM-AGENT-MGMT` or in a fifth module `RMM-DISCOVERY`; recommendation is to consolidate into `RMM-AGENT-MGMT` since the agent IS the discovery mechanism. The `RMM-MT` (multi-tenant) and `RMM-AI` (AI-assisted) capabilities are cross-cutting; assign `RMM-MT` to `RMM-AGENT-MGMT` and `RMM-AI` to `RMM-MONITORING` (anomaly detection on alerts is the primary AI surface). Final shape: **4 full modules** (`RMM-MONITORING`, `RMM-PATCH-MGMT`, `RMM-AUTOMATION`, `RMM-AGENT-MGMT`). | This is a Phase-A re-author, not a one-line fix. Surface for user approval of the 4-module shape, then load the 4 modules + their `domain_module_capabilities` + `domain_module_data_objects` rows + 4 system skills + tool floors per Rule #17 + lifecycle states per Rule #12 + 4 `role_modules` baselines per E-band. Gated on B2-S1 (architectural module-split confirmation). |
| B1-S2 | **B9 missing event_category** | 2 trigger_events carry empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 651 `automation_script.executed`, 652 `automation_script.failed`. | PATCH: 651 -> `state_change` (script completed its run); 652 -> `state_change` (script entered failed terminal state). |
| B1-S3 | **B9, missing trigger_events for workflow-gate states** | Several lifecycle states implied by the 5 masters' workflows have no `trigger_events` row: `rmm_agent.installed`, `rmm_agent.offline`, `rmm_agent.uninstalled`, `monitoring_policy.published`, `monitoring_policy.deprecated`, `monitoring_alert.acknowledged`, `monitoring_alert.resolved`, `monitoring_alert.suppressed`, `patch_job.failed`, `patch_job.rolled_back`, `automation_script.approved`, `automation_script.deprecated`. 12 missing events. | After B12 lifecycle-states landing in B1-S5, insert 12 `trigger_events` rows, each `event_category='lifecycle'` or `'state_change'` per the state machine. Several of these will become the trigger for cross-domain handoffs (`patch_job.failed` -> ITSM incident, `monitoring_alert.acknowledged` -> MSP-PSA ticket update). |
| B1-S4 | **B12 / Rule #12 fail, no lifecycle states on any master** | All 5 RMM masters lack `data_object_lifecycle_states` rows. Per Rule #12 every `master + required` data_object must have lifecycle rows OR be a config-shape exemption. Likely state machines: `rmm_agents` (`pending`, `installed`, `online`, `offline`, `uninstalled`); `monitoring_policies` (`draft`, `active`, `deprecated`); `monitoring_alerts` (`open`, `acknowledged`, `resolved`, `suppressed`, `closed`); `patch_jobs` (`scheduled`, `running`, `succeeded`, `failed`, `rolled_back`); `automation_scripts` (`draft`, `approved`, `published`, `deprecated`). `monitoring_policies` and `automation_scripts` might qualify for the config-shape exemption (author-once / occasionally-edit), surface in B2 for user judgment. | Author lifecycle rows for 3 confirmed master states (`rmm_agents`, `monitoring_alerts`, `patch_jobs`); gate the other 2 (`monitoring_policies`, `automation_scripts`) on B2-S6. Each row carries `domain_module_id` pointing at the realizing module (per Rule #14 permission-materialization-scope), so this depends on B1-S1 modules landing first. |
| B1-S5 | **B10b cascade, all 10 outbound handoffs carry NULL `source_domain_module_id`** | 10 outbound rows (140, 141, 142, 143, 144, 145, 146, 147, 159, 644, 645) all have NULL `source_domain_module_id`. This is RMM's fix once modules land, not the counter-party's. Per B10b's "source is owned by the source domain" rule, the RMM audit owns the backfill. Likely mappings post-B1-S1: 140 (alert -> ITSM) -> `RMM-MONITORING`; 141 (alert -> AIOPS) -> `RMM-MONITORING`; 142 (patch.scheduled -> ITSM) -> `RMM-PATCH-MGMT`; 143 (patch.completed -> ITSM) -> `RMM-PATCH-MGMT`; 144 (hardware.discovered -> HAM) -> `RMM-AGENT-MGMT`; 145 (software.discovered -> SAM) -> `RMM-AGENT-MGMT`; 146 (ci.discovered -> CMDB) -> `RMM-AGENT-MGMT`; 147 (network.discovered -> DISCOVERY) -> `RMM-AGENT-MGMT`; 159 (alert -> MSP-PSA) -> `RMM-MONITORING`; 644 (script.failed -> ITSM) -> `RMM-AUTOMATION`; 645 (script.executed -> ITAM) -> `RMM-AUTOMATION`. | PATCH 10 handoffs to set `source_domain_module_id` post B1-S1. Mechanical PATCH per row. |
| B1-S6 | **B10b cascade, 1 inbound handoff has NULL `target_domain_module_id`** | Handoff 150 (HAM `asset.retired` -> RMM `rmm_agents`) has NULL `target_domain_module_id`. Post-B1-S1 this points at `RMM-AGENT-MGMT`. | PATCH handoff 150 set `target_domain_module_id` = `RMM-AGENT-MGMT.id`. |
| B1-S7 | **B10b report-only (4 outbound NULLs on the target side, owed by other domains)** | 4 outbound handoffs carry NULL `target_domain_module_id`: 141 (AIOPS), 144 (HAM), 145 (SAM), 147 (DISCOVERY). These are the target domains' fix. | Schedule b1 audits on AIOPS, HAM, SAM, DISCOVERY to populate `target_domain_module_id`. |
| B1-S8 | **B10b report-only (1 inbound NULL on the source side)** | Handoff 150 has NULL `source_domain_module_id`; HAM owns the backfill. | Schedule HAM b1 audit. |
| B1-S9 | **B9b N/A, would be hard-fail after B1-S1** | A 4-module domain has 0 intra-domain handoff rows. Expected from the master relationship graph: (a) `RMM-MONITORING` -> `RMM-PATCH-MGMT` on `monitoring_alert.threshold_breached` when the policy says "auto-patch on this CVE alert"; (b) `RMM-MONITORING` -> `RMM-AUTOMATION` on `monitoring_alert.threshold_breached` for remediation scripts; (c) `RMM-AGENT-MGMT` -> `RMM-MONITORING` on `rmm_agent.installed` so the new agent enrolls in default monitoring policies; (d) `RMM-AGENT-MGMT` -> `RMM-PATCH-MGMT` on `rmm_agent.installed` so the new agent enters patch scope; (e) `RMM-PATCH-MGMT` -> `RMM-AUTOMATION` on `patch_job.failed` so the failure-handling script runs. 5 intra-domain handoff candidates. | After B1-S1 modules land + B1-S3 events authored, insert 5 intra-domain `handoffs` rows with `source_domain_id=target_domain_id=130`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`. |

#### APQC TAGGING (H1 hard-fail; SKILL anti-pattern is alive on RMM)

3 of 11 cross-domain handoffs carry `handoff_processes` rows. **2 are `agent_curated` (handoffs 142, 143, both at L4); 1 is `discovery_substring` (handoff 150, anchored on L1 "Acquire, Construct, and Manage Assets" which is a weak L1 catch-all)**. Zero `record_status='approved'`. **Volume expectation per SKILL H1: 0.5N to 0.8N for N=11 -> 6 to 9 agent_curated tags total; current count is 2.** The audit proposes the following 8 new + 1 REPLACE candidates from the structural pass:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id (lookup needed) | Confidence |
|---|---|---|---|---|---|---|
| 140 | RMM -> ITSM | `monitoring_alert.threshold_breached` | `service_incidents` | Resolve customer service issues / Manage IT service requests (10408 or child) | needs PCF lookup | confident L3 |
| 141 | RMM -> AIOPS | `monitoring_alert.threshold_breached` | `monitoring_alerts` | Detect, analyze and respond to IT events (20772 or child) | needs PCF lookup | confident L3 |
| 144 | RMM -> HAM | `hardware_endpoint.discovered` | `hardware_assets` | Manage IT infrastructure / Acquire, construct, and manage assets (10218 or child) | needs PCF lookup | confident L3 |
| 145 | RMM -> SAM | `software_endpoint.discovered` | `software_installations` | Manage IT assets / Track software entitlements (20840 area) | needs PCF lookup | confident L3 |
| 146 | RMM -> CMDB | `ci_endpoint.discovered` | `configuration_items` | Manage IT configuration (20835 or child) | needs PCF lookup | confident L3 |
| 147 | RMM -> DISCOVERY | `network_device.discovered` | `discovered_devices` | Manage IT infrastructure / Discover IT assets | needs PCF lookup | confident L3 |
| 159 | RMM -> MSP-PSA | `monitoring_alert.threshold_breached` | `msp_tickets` | Resolve customer service issues (10408 or child) | needs PCF lookup | confident L3 |
| 644 | RMM -> ITSM | `automation_script.failed` | `service_incidents` | Resolve customer service issues (10408 or child) | needs PCF lookup | confident L3 |
| 645 | RMM -> ITAM | `automation_script.executed` | `automation_scripts` | Manage IT assets / Maintain IT assets (20838 area) | needs PCF lookup | medium |
| 150 | HAM -> RMM | `asset.retired` | `rmm_agents` | Manage IT assets / Retire IT assets (currently mapped to L1 19207 which is too broad; propose REPLACE) | needs PCF lookup | confident L2/L3 |

10 candidate APQC tags (9 INSERTs + 1 REPLACE on handoff 150). Lookups at fix time via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`. The existing L1 row on 150 should be downgraded by REPLACE to a tighter L3 ("Retire IT assets" or similar).

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 + B9 events + B12 lifecycle + B10b backfill x2 + B9b intra) | 6 |
| Report-only (B10b counter-party x2) | 2 |
| Boundary findings per neighbor (see Pass 4) | 1 |
| APQC TAGGING (high-confidence + 1 REPLACE) | 1 (counted as a single B1-H1 item per SKILL counting rule) |
| **Bucket 1 total** | **9 items** (S1, S2, S3, S4, S5, S6, S7, S8, S9 + H1) |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

**ITSM <-> RMM (weight 6).** Wired pairs: 4 outbound (140, 142, 143, 644). Section 2: 142, 143, 644 already point at ITSM module 41 (CHANGE) and 38 (INCIDENT), populated; 140 also points at ITSM-INCIDENT-MGMT 38. Section 3: missing inbound: ITSM has no handoff to RMM, but a likely candidate is `service_request.approved` for "deploy software via RMM" -> RMM-AUTOMATION. Section 4: ITSM-EVENT-MGMT (42) holds `monitoring_alerts` as `embedded_master + required`; ITSM-INCIDENT-MGMT (38) holds `monitoring_alerts` as `consumer + optional`. ITOM (the canonical master per the rollup) embeds in ITSM, RMM also masters at the rollup. Multi-master collision (see B2-S3). Section 5: cross-relationship `service_incidents correlates_to monitoring_alerts` (193) exists. **Boundary finding (Bucket 1):** B1-B1 (boundary) -- ITSM-EVENT-MGMT module 42 should be `consumer + required` on RMM-mastered `monitoring_alerts` (or use the ITOM rollup as the canonical master with both ITSM and RMM as contributor / co-master); the current `embedded_master` shape contradicts the rollup. Surface for user judgment per B2-S3.

**ITOM <-> RMM (weight 2).** Zero handoffs. **Critical Pass 4 finding:** `monitoring_alerts` (85) is `role='master'` in BOTH ITOM (domain 2) and RMM (domain 130). `monitoring_policies` (86) similarly. Multi-master at the domain rollup level. ITOM positions monitoring_alerts as full-stack infrastructure-event source; RMM positions monitoring_alerts as endpoint-telemetry source (the `domain_data_objects.notes` on RMM's row reads "Co-master with ITOM, which owns infrastructure-event alerts from APM/log/event sources"). Either (a) the two markets genuinely co-master and the catalog needs to model this as a `data_objects.kind='multi_mastered'` discriminator with explicit slice rules, or (b) one of them should be `contributor` not `master`. RMM masters the agent-emitted alerts; ITOM masters the broader APM/log alerts. Recommendation: split into two distinct data_objects (`endpoint_alerts` for RMM, keep `monitoring_alerts` as ITOM's broader master). Pass 4 finding for B2-S3 (architectural, not mechanical).

**MSP-PSA <-> RMM (weight 3).** Wired pairs: 1 outbound (159, alert -> msp_tickets). Section 2: 159 has NULL `source_domain_module_id` (B1-S5); `target_domain_module_id=137` (MSP-PSA-SVC-DESK) populated. Section 3: clean. Section 4: MSP-PSA-SVC-DESK (137) and MSP-PSA-DISPATCH (140) both consume `rmm_agents` and `monitoring_alerts`. Section 5: no cross-relationship rows on RMM masters; MSP-PSA likely needs a `msp_ticket originates_from monitoring_alert` row.

**CMDB <-> RMM (weight 2).** Wired pairs: 1 (146 ci.discovered). Section 2: 146 points at CMDB module 108 (target), source NULL (B1-S5). Section 3: clean. Section 4: clean. Section 5: cross-relationship `configuration_items triggers rmm_agents` (267) exists.

**HAM <-> RMM (weight 3).** Wired pairs: 2 (144 outbound, 150 inbound). Section 2: 144 has NULL target (B1-S7 owed by HAM); 150 has NULL source (B1-S8 owed by HAM) AND NULL target (B1-S6 owed by RMM, mechanical). Section 3: clean. Section 4: clean. Section 5: clean.

**SAM <-> RMM (weight 2).** Wired pairs: 1 (145). Section 2: 145 has NULL target (B1-S7 owed by SAM); source NULL (B1-S5). Section 3: clean. Section 4: clean. Section 5: clean.

**DISCOVERY <-> RMM (weight 2).** Wired pairs: 1 (147). Section 2: 147 has NULL target (B1-S7 owed by DISCOVERY); source NULL (B1-S5). Section 3: clean. Section 4: DISCOVERY contributes to `monitoring_policies`; RMM also masters `monitoring_policies`. Likely co-master pattern needs reconciliation with ITOM rollup (see B2-S3). Section 5: clean.

**AIOPS <-> RMM (weight 2).** Wired pairs: 1 (141). Section 2: 141 has NULL target (B1-S7 owed by AIOPS); source NULL (B1-S5). Section 3: clean. Section 4: AIOPS contributes to `monitoring_alerts` per rollup. Section 5: clean.

**TEST-MGMT <-> RMM (weight 1, pairwise warranted due to collision).** Zero handoffs. **Multi-master collision** on `automation_scripts` (225): TEST-MGMT (domain 8) and RMM (domain 130) both have `role='master'`. The two markets address different surfaces (TEST-MGMT owns test-automation scripts in a Selenium / Playwright sense; RMM owns endpoint-automation scripts in a PowerShell / Bash sense), but the data_object name is shared. Recommendation: rename one side or split into two distinct data_objects (`test_automation_scripts` for TEST-MGMT, keep `automation_scripts` for RMM, or vice versa). Pass 4 finding for B2-S4.

**Lighter neighbors:**
- **ITAM <-> RMM (weight 1).** Handoff 645 (script.executed) wired but source NULL (B1-S5). No DMDO collisions.
- **REMOTE-ACCESS <-> RMM (weight 1).** Zero handoffs. REMOTE-ACCESS consumes `rmm_agents` per rollup; no specific handoff exists yet, but the inverse direction is plausible (`remote_session.requested` on an RMM-managed agent). Defer to REMOTE-ACCESS audit.

**Final Bucket 1 inventory:**

| ID | Description |
|---|---|
| B1-S1 | M1 hard-fail, author 4 `domain_modules` per the proposed split (gated on B2-S1) |
| B1-S2 | PATCH 2 trigger_events to set `event_category` |
| B1-S3 | Insert 12 missing `trigger_events` after B1-S1 modules land |
| B1-S4 | Author lifecycle states on 3 confirmed masters (B12 / Rule #12) after B1-S1 |
| B1-S5 | PATCH 10 outbound handoffs `source_domain_module_id` after B1-S1 |
| B1-S6 | PATCH handoff 150 `target_domain_module_id` after B1-S1 |
| B1-S7 | Report-only, 4 outbound NULL target FKs owed by AIOPS, HAM, SAM, DISCOVERY |
| B1-S8 | Report-only, 1 inbound NULL source FK owed by HAM |
| B1-S9 | Author 5 intra-domain cross-module handoffs after B1-S1 |
| B1-H1 | APQC TAGGING, propose 9 `agent_curated` INSERTs + 1 REPLACE on handoff 150 |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M1 architectural choice, module split.** B1-S1 proposes 4 full modules (`RMM-MONITORING`, `RMM-PATCH-MGMT`, `RMM-AUTOMATION`, `RMM-AGENT-MGMT`). Alternative splits exist: (a) collapse to 2 modules (`RMM-AGENT-OPS` and `RMM-WORKFLOW-AUTOMATION`) -- simpler but loses the patch / script distinction in tooling; (b) split to 5 modules (separate `RMM-DISCOVERY` from `RMM-AGENT-MGMT`) -- arguably overweighted given `RMM-AGENT-MGMT` already consumes the discovery surface; (c) the proposed 4. Recommendation is (c). Also unresolved: is there a separate `RMM-REPORTING` or `RMM-CUSTOMER-PORTAL` module worth authoring (MSP customer-facing dashboards live in NinjaOne, ConnectWise, etc.)? | Architectural intent + product-positioning decision; user's call. | (a) 2-module collapse, (b) 5-module split, (c) the proposed 4, (d) propose alternative shape. |
| B2-S2 | **Rule #15 notes-pollution on every `domain_data_objects` row.** All 12 RMM `domain_data_objects` rows carry populated `notes` narrating mastering-vs-contributing dynamics ("Co-master with ITOM, which owns ...", "HAM remains master of the financial/lifecycle record; RMM feeds the live operational view", "Contributes agent-collected hardware specs ..."). These look auto-generated. Per Rule #15 the agent cannot retain these without explicit per-row user-approved wording; the prior license for "co-master context" prose is RESCINDED. | Auto-generated vs user-typed status unknown from audit. | (a) Confirm user-typed at load time; leave in place. (b) Confirm auto-populated; PATCH all 12 rows' `notes` to empty string and log Rule #15 incident per references/skill-changelog.md. |
| B2-S3 | **Multi-master collision on `monitoring_alerts` (85) and `monitoring_policies` (86) between RMM and ITOM.** Both domains have `role='master'`. The two markets address overlapping but distinct telemetry surfaces (RMM = agent-emitted endpoint telemetry; ITOM = full-stack infrastructure including APM, logs, events). Options: (a) Split into two distinct data_objects (`endpoint_alerts` for RMM-mastered subset, keep `monitoring_alerts` as ITOM's broader master, mirror for policies). (b) Keep shared data_object but model as a `contributor` relationship (RMM downgrades to `contributor`; ITOM keeps `master`). (c) Genuine co-master, formalize with a slice discriminator (likely requires a catalog enhancement; current model has no `master_scope` column). Recommendation: (a) split, since the two telemetry surfaces have very different ingestion patterns and lifecycle. | Architectural intent; downstream blast radius for splitting versus keeping a shared master. | (a) Split into endpoint-specific data_objects. (b) RMM downgrades to contributor. (c) Hold off on this audit; address in a follow-up architecture pass. |
| B2-S4 | **Multi-master collision on `automation_scripts` (225) between RMM and TEST-MGMT.** TEST-MGMT masters test-automation scripts (Selenium, Playwright, JUnit); RMM masters endpoint-automation scripts (PowerShell, Bash, Python). Same data_object name, very different surfaces. Two aliases on the entity (`automated test`, `test automation`) bias toward the TEST-MGMT interpretation. Options: (a) Split into `test_automation_scripts` (TEST-MGMT) and keep `automation_scripts` for RMM. (b) Split the other way: keep `automation_scripts` for TEST-MGMT (matches the aliases) and rename RMM master to `endpoint_automation_scripts`. (c) Genuine co-master with slice discriminator. Recommendation: (b) because the aliases already favor TEST-MGMT's positioning, and RMM's surface is more specific. | Naming-arbitration call per Rule #9 plus architectural intent. | (a) split (b) split the other way (c) keep shared (d) defer to architecture pass. |
| B2-S5 | **B4 pattern-flag positive re-evaluation per Rule #12.** Current flags: every master at `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Questions: (a) `rmm_agents.has_personal_content` should probably be `true` (agent telemetry includes hostname, logged-in username, possibly screenshots from remote-control sessions, network info, all PII-adjacent on user workstations); (b) `monitoring_alerts.has_personal_content` could be `true` (alert payloads include event-log entries with usernames, file paths, process names); (c) `patch_jobs.has_submit_lock` should be `true` (once a patch job is in_flight or completed, the schedule should not be re-editable; immutable execution record); (d) `automation_scripts.has_submit_lock` could be `true` once the script is "approved and published" (version-locked); (e) `monitoring_policies.has_submit_lock` could be `true` once active (any change creates a new version). | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no from user. |
| B2-S6 | **Rule #12 config-shape exemption candidates.** `monitoring_policies` and `automation_scripts` arguably fit the config-shape exemption (author-once / occasionally-edit / `record_status` is the only state worth tracking). Versus `rmm_agents`, `monitoring_alerts`, `patch_jobs` which clearly need full lifecycle. Exemption applies, or full lifecycle for all 5? | Config-shape exemption is a workflow judgment. Rule #15 rescinded the prior license to record exemption rationale in `data_objects.notes`. | (a) Both exempted (no lifecycle states). (b) Only `monitoring_policies` exempted. (c) Only `automation_scripts` exempted. (d) All 5 get full lifecycle. |
| B2-S7 | **Module-permission scope.** Once B1-S1 lands 4 modules, the workflow-gate permissions derived from B1-S4 lifecycle states (`approve_patch_job`, `rollback_patch_job`, `acknowledge_monitoring_alert`, `resolve_monitoring_alert`, `suppress_monitoring_alert`, `approve_automation_script`, `deprecate_automation_script`, `install_rmm_agent`, `uninstall_rmm_agent`) need bundling onto roles. Likely roles: `RMM-OPERATOR` (front-line monitoring), `RMM-PATCH-MANAGER`, `RMM-AUTOMATION-AUTHOR`, `RMM-ADMIN`. Names and split unknown without user input. | RBAC design is user's call. | Confirm role names + bundle shape. |
| B2-S8 | **Cross-cutting modules from neighbor audits.** Should any RMM module be hosted via `domain_module_host_domains` on other domains (e.g. `RMM-MONITORING` could host on ITOM since ITOM consumes monitoring alerts)? Or should RMM stay primary-host-only and let ITOM declare consumer DMDOs explicitly? Recommendation is primary-host-only; cross-host adds installation coupling that's better expressed as DMDO. | Editorial / product intent. | (a) Primary-host-only. (b) Host RMM-MONITORING on ITOM. (c) Host RMM-AGENT-MGMT on UEM (UEM also manages endpoint agents). |
| B2-S9 | **System-skill scope per module.** Once B1-S1 lands, each module needs exactly one `skill_type='system'` skill with >=1 `skill_tools` rows (Rule #17). The tool floor per module looks like: `RMM-MONITORING` (10-15 tools: query, mutate alerts, ack/resolve/suppress, threshold evaluation primitives, send_notification external, anomaly_score external); `RMM-PATCH-MGMT` (8-12 tools: list_available_patches external CVE feed, schedule_patch_job, execute_patch external, rollback_patch external, query/mutate jobs); `RMM-AUTOMATION` (6-10 tools: query scripts, mutate scripts, execute_script_on_endpoint external, approve_script gate); `RMM-AGENT-MGMT` (8-12 tools: install_agent external, uninstall_agent external, list_endpoints query, mutate config). Confirm scope. | Skill / tool design is product-shape call. | (a) Match proposed scope. (b) Larger tool surface. (c) Smaller tool surface. (d) Defer to Phase A authoring discussion. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against NinjaOne, ConnectWise RMM, Datto RMM, Kaseya VSA, N-able N-central, Atera, Syncro, Pulseway, Action1, SuperOps, ManageEngine Endpoint Central. Adjacent markets surfaced from flagship-vendor analysis (now queued in `audits/_missing-domains.md` via helper):

#### MISSING entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `agent_groups` | NinjaOne, Datto RMM, ConnectWise RMM all model endpoint groups (often `device_groups` or `client_groups`) as a first-class master distinct from agents. Used for bulk policy assignment and reporting. | RMM-AGENT-MGMT (master) |
| `monitoring_thresholds` | Distinct from `monitoring_policies` in NinjaOne, ManageEngine (a policy bundles many thresholds; threshold is per-metric). Currently the catalog folds thresholds into policies. | RMM-MONITORING (master or junction) |
| `patch_approval_policies` | Kaseya, Datto, ManageEngine model patch-approval policies as first-class records (which CVE classes auto-approve, which need manual approval per customer tier). | RMM-PATCH-MGMT (master) |
| `maintenance_windows` | NinjaOne, ConnectWise, N-able model maintenance windows distinct from `monitoring_policies`. Patch jobs and scripts honor maintenance windows. | RMM-PATCH-MGMT or RMM-AGENT-MGMT (master) |
| `remote_sessions` | NinjaOne, Datto, ConnectWise embed remote-control session records distinct from RMM agents (TeamViewer, Splashtop, native). REMOTE-ACCESS domain may own this; possibly overlap with `rmm_agents`. | RMM-AGENT-MGMT or REMOTE-ACCESS (master) |
| `script_runs` | Distinct from `automation_scripts` in NinjaOne, Atera, Action1. Script = definition; script_run = execution event. Currently the events 651/652 are the only record of script execution. | RMM-AUTOMATION (master, separate from automation_scripts) |
| `compliance_baselines` | Action1, ManageEngine, N-able model security baselines (CIS, NIST) distinct from `monitoring_policies`. Drift detection runs against the baseline. | RMM-MONITORING or new RMM-COMPLIANCE module |
| `customer_tenants` | All MSP-RMM vendors model the customer tenant (the MSP client organization) as a first-class master separate from `organizations`. Multi-tenant data isolation depends on this. Likely MSP-PSA territory. | MSP-PSA or new master-data module |
| `agent_install_packages` | NinjaOne, Action1, Atera ship installer-package records (per-OS, per-architecture, signed binaries). Distinct from `automation_scripts` and `rmm_agents`. | RMM-AGENT-MGMT (master) |

#### MODULARIZATION candidates

- **`RMM-COMPLIANCE` candidate.** If `compliance_baselines` + `patch_approval_policies` + drift-detection records get loaded, a fifth module makes more sense than overloading `RMM-MONITORING`. Would push RMM from 4 to 5 full modules.
- **`RMM-REPORTING` / customer-portal split.** MSP-RMM vendors all ship customer-facing dashboard + scheduled report surfaces (NinjaOne client portal, ConnectWise client portal). If RMM is to model the customer-facing surface, a separate module fits cleanly.

#### Adjacent-domain candidates (queued in `audits/_missing-domains.md` via helper)

- **EDR** queued. Behavior-based threat detection, endpoint isolation, EDR telemetry. CrowdStrike Falcon, SentinelOne, Defender for Endpoint. Adjacent to RMM but distinct market.
- **VULN-MGT** queued. Tenable, Qualys, Rapid7. Adjacent to RMM (patches consume vulnerability inputs) but distinct market.
- **MSP-BILLING** queued. ConnectWise Manage Billing, Kaseya BMS, HaloPSA. Adjacent to MSP-PSA but billing-specific.

#### Compliance regulation candidates (no entity proposed)

- **SOC 2 attestation** applicability (MSPs serve regulated customers and inherit SOC 2 obligations on access logging, change tracking).
- **HIPAA pass-through** applicability (MSPs serving healthcare customers).
- **CMMC** applicability (MSPs serving US DoD contractors; Level 2 / Level 3 mandates).
- **NIS2** applicability (EU MSPs as critical-infrastructure suppliers).

#### Candidate-domain queue impact

3 candidates queued in `audits/_missing-domains.md` (EDR, VULN-MGT, MSP-BILLING). All 3 with `mention_count=1` (first surfacing this audit).

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces a Phase 0 markdown at `c:/tmp/RMM-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 9 entity candidates + 2 modularization candidates + 4 regulation candidates to treat as confirmed and proceed via Phase B inserts).

### Cross-bucket dependencies

- **B1-S1 (M1 module authoring) is gated on B2-S1** (architectural choice). Nothing else in Bucket 1 unblocks until S1 lands: S3, S4, S5, S6, S9 all need modules to point at.
- **B1-S4 (lifecycle states) depends on B2-S6** (config-shape exemption for `monitoring_policies` and/or `automation_scripts`).
- **B1-S5 / S6 / S7 / S8 (handoff FK backfills)** depend on B1-S1.
- **B1-S9 (intra-domain handoffs) depends on B1-S1 + B1-S3** (needs modules + events).
- **B3 MISSING entities (`agent_groups`, `patch_approval_policies`, `maintenance_windows`, `script_runs`)** would inform B2-S1's module split (e.g. a separate `RMM-COMPLIANCE` module changes the 4-module count). Surface as Bucket 2 / Bucket 3 dependency: hold B2-S1 decision until Bucket 3 verification path is chosen if user wants to maximize forward-looking module shape.
- **B2-S3 (multi-master `monitoring_alerts`)** has blast radius on ITOM, AIOPS, MSP-PSA, ITSM-EVENT-MGMT; the resolution should ideally be coordinated with an ITOM b1 audit run.
- **B2-S4 (multi-master `automation_scripts`)** has blast radius on TEST-MGMT; coordinate with a TEST-MGMT b1 audit run.
- **B2-S5 (pattern flags) and B2-S7 (RBAC) are independent** of Bucket 3.
- Buckets 2 and 3 are otherwise independent of each other.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, H1`), or `skip`.

- **S1 (M1 hard-fail, author 4 modules)** is gated on B2-S1; resolve that first.
- **S2 (event_category PATCH on 2 events)** is trivial; one PATCH each.
- **S3 (12 missing `trigger_events`)** depends on S1.
- **S4 (lifecycle states on 3 masters)** depends on S1 + B2-S6 outcome.
- **S5 / S6 (handoff FK backfills on RMM side)** depend on S1.
- **S7 / S8 (B10b report-only)** schedules 4 + 1 = 5 distinct other-domain audits; not RMM's fix.
- **S9 (5 intra-domain handoffs)** depends on S1 + S3.
- **H1 (10 APQC tags including 1 REPLACE)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (module split):** (a) 2-module collapse, (b) 5-module split, (c) the proposed 4, (d) alternative.
- **B2-S2 (Rule #15 notes-pollution on 12 DMDO rows):** auto-populated revert, or user-typed retain?
- **B2-S3 (multi-master collision on monitoring_alerts/policies vs ITOM):** (a) split into endpoint-specific, (b) RMM downgrades to contributor, (c) defer to architecture pass.
- **B2-S4 (multi-master collision on automation_scripts vs TEST-MGMT):** (a) split, (b) other-direction split, (c) keep shared, (d) defer.
- **B2-S5 (pattern flags):** per-flag yes/no on `has_personal_content` for rmm_agents + monitoring_alerts; `has_submit_lock` for patch_jobs, automation_scripts, monitoring_policies.
- **B2-S6 (config-shape exemption):** which subset gets the exemption?
- **B2-S7 (RBAC):** confirm role names + bundle shape.
- **B2-S8 (cross-cutting modules):** primary-host-only or cross-host?
- **B2-S9 (system-skill scope):** proposed scope per module accepted?

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 9 entity candidates + 2 modularization candidates + 4 regulation candidates + 3 queued adjacent-domain candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain.

| Owing domain | Owed work |
|---|---|
| AIOPS | B10b: populate `target_domain_module_id` on outbound handoff 141 (RMM `monitoring_alert.threshold_breached` -> AIOPS). |
| HAM | B10b: populate `target_domain_module_id` on outbound handoff 144 (RMM `hardware_endpoint.discovered` -> HAM `hardware_assets`); populate `source_domain_module_id` on inbound handoff 150 (HAM `asset.retired` -> RMM `rmm_agents`). |
| SAM | B10b: populate `target_domain_module_id` on outbound handoff 145 (RMM `software_endpoint.discovered` -> SAM `software_installations`). |
| DISCOVERY | B10b: populate `target_domain_module_id` on outbound handoff 147 (RMM `network_device.discovered` -> DISCOVERY `discovered_devices`). |
| ITSM | Confirm: should ITSM have an outbound to RMM-AUTOMATION on `service_request.approved` for software-install requests routed via RMM? Currently no such handoff exists. ITSM-EVENT-MGMT module 42 currently holds `monitoring_alerts` as `embedded_master + required`; reconciliation with the RMM master rollup is needed (depends on B2-S3 resolution). |
| ITOM | Multi-master collision on `monitoring_alerts` (85) and `monitoring_policies` (86); ITOM and RMM both `role='master'`. Reconciliation per B2-S3. |
| MSP-PSA | Cross-relationship `msp_ticket originates_from monitoring_alert` missing; MSP-PSA b1 audit should add. |
| TEST-MGMT | Multi-master collision on `automation_scripts` (225). Reconciliation per B2-S4. |
| REMOTE-ACCESS | Confirm whether REMOTE-ACCESS should add an outbound handoff to RMM-AGENT-MGMT on `remote_session.requested` so the RMM agent kicks off the remote session. |

### Decisions

(none yet, awaiting user)

## 2026-05-31, Continuation: B1 technical fixes

### Classification

| ID | Decision | Reason |
|---|---|---|
| B1-S1 | DEFER | New `domain_modules` rows; gated on B2-S1 (user picks the module split). |
| B1-S2 | APPLY (no-op) | Enum backfill, audit names IDs 651 and 652 with target `state_change`. Live state already has both rows at `event_category='state_change'`; no PATCH required. |
| B1-S3 | DEFER | New `trigger_events`; depends on B1-S1 modules + B1-S4 lifecycle states. |
| B1-S4 | DEFER | New `data_object_lifecycle_states`; depends on B1-S1 (modules to FK to) and B2-S6 (config-shape exemption decision). |
| B1-S5 | DEFER | PATCH derivable from existing modules per Rule #10, but the source modules do not exist yet (M1 hard-fail). Depends on B1-S1. |
| B1-S6 | DEFER | Same shape as S5: target module does not exist yet. Depends on B1-S1. |
| B1-S7 | DEFER | Report-only; not RMM's fix. |
| B1-S8 | DEFER | Report-only; not RMM's fix. |
| B1-S9 | DEFER | New intra-domain handoffs; depends on B1-S1 + B1-S3. |
| B1-H1 | DEFER | Every proposed APQC tag row carries `PCF id: needs PCF lookup`; no pre-specified `handoff_id` + resolvable PCF tuple is in the audit. |

### Applied

- **B1-S2:** Verified via GET `/trigger_events?id=in.(651,652)` that both rows already have `event_category='state_change'`. The audit-reported B9 gap is closed; no write needed. Surfacing here so a re-audit does not re-open the same item.

### Not applied

- **B2-S2 (notes pollution on 12 DMDO rows):** Reverts to `notes=''` would be a pre-specified row-IDs revert, but the audit explicitly classifies this as a Bucket 2 judgment call (option (a) retain vs (b) revert), so the user owns the decision per scope rules. Not applied.
- All other items deferred per the table above.

### Loader path

No loader written this continuation. The single in-scope item (B1-S2) was already cured live; no batch warranted creating `.tmp_deploy/fix_rmm_b1_technical_2026_05_31.ts`.

### JWT errors

None.

## 2026-05-31, Audit

### Summary

- **Current footprint:** **0 `domain_modules` rows still (M1 hard-fail persists).** 8 capabilities (`RMM-EPM`, `RMM-PATCH`, `RMM-SCRIPT`, `RMM-DISC`, `RMM-INV`, `RMM-ALERT`, `RMM-MT`, `RMM-AI`). 5 masters at the domain rollup level (`rmm_agents` 223, `patch_jobs` 224, `automation_scripts` 225, `monitoring_policies` 86, `monitoring_alerts` 85; the latter two co-master with ITOM, `automation_scripts` co-masters with TEST-MGMT). 4 contributor rollups (`configuration_items`, `hardware_assets`, `software_installations`, `discovered_devices`) plus 1 contributor + 2 consumer ITSM rollups (`service_changes`, `service_incidents`, `service_requests`). 12 solutions (11 primary, 1 secondary). 9 trigger_events on RMM-mastered data_objects (all now carry `event_category`). 12 cross-domain handoffs (11 outbound, 1 inbound). 0 intra-domain handoffs. 11 aliases (4 on `monitoring_alerts`, 5 on `monitoring_policies`, 2 on `automation_scripts`). 0 `data_object_lifecycle_states` rows on any of the 5 masters (Rule #12 still fails). 0 system skills / 0 `skill_tools` (F2/F3/F5 still fail, downstream of M1). 0 RMM-scoped `role_modules` rows. Built-in `users` (data_object 748) edges exist for `monitoring_policies` (authored, approved) and `monitoring_alerts` (assigned); Rule #10 gap remains on `rmm_agents`, `patch_jobs`, `automation_scripts`.
- **Vendor-surface basis (unchanged from prior audit):** NinjaOne, ConnectWise RMM, Datto RMM (Kaseya), Kaseya VSA, N-able N-central, Atera, Syncro, Pulseway, Action1, SuperOps, ManageEngine Endpoint Central. Adjacent specialist surface unchanged: EDR (CrowdStrike, SentinelOne, Defender for Endpoint), Vulnerability Management (Tenable, Qualys, Rapid7), MSP Billing (ConnectWise Manage, Kaseya BMS, HaloPSA, Autotask). Newly-recorded secondary flagship since prior audit: GoTo Resolve.
- **Bucket 1 (in-scope, agent fixable):** 9 items (most cascade-blocked on M1).
- **Bucket 2 (surface-for-user, judgment):** 9 items (unchanged from prior audit; none resolved).
- **Bucket 3 (Phase 0 pending, speculative):** 9 entity candidates + 2 modularization candidates + 4 regulation candidates + 3 queued adjacent-domain candidates (EDR, VULN-MGT, MSP-BILLING).

**Structural pass bands:**

- **A (S1-S3):** pass. `domains` row populated, all 7 mandatory metadata fields set (`crud_percentage=70`, `business_logic` populated, `min_org_size='10 xs <50'`, `cost_band='$$'`, `certification_required=false`, `usa_market_size_usd_m=2000`, `market_size_source_year=2024`).
- **M (M1-M7):** **M1 hard-fail unchanged from 2026-05-30** (0 `domain_modules`). M2-M7 cascade-fail.
- **B5 (DMDO coverage):** pass. 12 `domain_data_objects` rollup rows cover the 5 masters + 7 cross-domain rollups; no orphans, no `data_objects` referenced from handoffs or relationships that are absent from the rollup.
- **B7 (aliases):** pass. 11 aliases on 3 masters; no Rule #9 substring collisions against `data_objects.data_object_name`.
- **B9 (trigger_events enums):** pass. All 9 `trigger_events` on RMM-mastered data_objects carry valid `event_category` values from Rule #13. The two 2026-05-30 gaps (651 `automation_script.executed`, 652 `automation_script.failed`) are both `state_change`. **B1-S2 from prior audit is closed.**
- **B9b (intra-domain handoffs):** N/A pending M1. 0 intra-domain handoffs.
- **B10b (cross-domain handoff FKs):** fail. Of 12 cross-domain handoffs, **11 have NULL `source_domain_module_id` on the RMM side** (140, 141, 142, 143, 144, 145, 146, 147, 159, 644, 645) and the lone inbound (150 from HAM) has NULL `target_domain_module_id` on the RMM side. All blocked on M1. Counter-party report-only NULLs: 141 (AIOPS target), 144 (HAM target), 145 (SAM target), 147 (DISCOVERY target), 150 (HAM source). 146 (CMDB), 142/143/644 (ITSM), 159 (MSP-PSA), 645 (ITAM) have the counter-party FK populated.
- **B10b (handoff record_status):** all 12 RMM cross-domain handoffs are at `record_status='new'`; zero `approved`.
- **B11 (relationships graph):** Built-in `users` edges (data_object 748) cover monitoring_policies (authored, approved) and monitoring_alerts (assigned). `rmm_agents`, `patch_jobs`, `automation_scripts` have NO `users` edge despite implied assignee / approver / runner roles (Rule #10 partial gap). Other cross-relationships present: 267 (`configuration_items triggers rmm_agents`), 389 (572 `automated_by` automation_scripts), 397 (748 `maintains script` automation_scripts), 193 (`service_incidents correlates_to monitoring_alerts`).
- **B12 (lifecycle states):** fail. 0 `data_object_lifecycle_states` rows for 5 masters. Rule #12 mandates rows on every `master + required` data_object unless config-shape-exempted; exemption candidates (`monitoring_policies`, `automation_scripts`) pending B2-S6.
- **C1 (capability_domains):** pass. 8 rows.
- **C2 (domain_module_capabilities):** N/A pending M1.
- **D1 (solutions):** pass. 12 solutions, 11 primary.
- **D2 (solution_modules):** N/A pending M1.
- **E1-E5 (RBAC):** fail. 0 RMM-scoped `role_modules`. Uncomputable until M1 + B12 land.
- **F1-F5 (skills/tools):** fail. F2 zero system skills; F3 zero `skill_tools`; F4 N/A; F5 Semantius score uncomputable. Downstream of M1.
- **H1 (APQC tagging):** still hard-fail by SKILL volume metric, but progress since prior audit: **7 of 12 cross-domain handoffs now carry `handoff_processes` rows** (up from 3). 6 `agent_curated` (141, 142, 143, 146, 147, 645) + 1 `discovery_substring` (150). Zero `record_status='approved'`. Volume expectation for N=12 is 6 to 10 agent_curated tags; current 6 is at the floor. Remaining 5 handoffs without any tag: **140 (RMM->ITSM `monitoring_alert.threshold_breached` -> `service_incidents`), 144 (RMM->HAM `hardware_endpoint.discovered` -> `hardware_assets`), 145 (RMM->SAM `software_endpoint.discovered` -> `software_installations`), 159 (RMM->MSP-PSA `monitoring_alert.threshold_breached` -> `msp_tickets`), 644 (RMM->ITSM `automation_script.failed` -> `service_incidents`)**. Handoff 150 carries L1 catch-all 19207 ("Acquire, Construct, and Manage Assets") and remains a REPLACE candidate.

**Continuation context (2026-05-31 prior section in history.md):** B1-S2 verified closed live. All other Bucket 1 items remained deferred pending B2-S1 (module split). Live state diff since prior audit: H1 +4 agent_curated tags; one new secondary solution (GoTo Resolve); no other structural change.

### Bucket 1, In-scope confirmed gaps

Cascade-blocked structural items are unchanged from the 2026-05-30 audit because M1 has not been cleared. Re-stated here so this audit is self-contained.

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard-fail** | 0 `domain_modules` rows; per Rule #14 every `domains` row needs >=1 `module_kind='full'` and a domain with >=3 capabilities needs >=2 full modules (RMM has 8). Proposed shape (per prior audit, carried): 4 full modules `RMM-MONITORING` (masters `monitoring_policies` + `monitoring_alerts`; realizes `RMM-EPM`, `RMM-ALERT`, `RMM-AI`), `RMM-PATCH-MGMT` (masters `patch_jobs`; realizes `RMM-PATCH`), `RMM-AUTOMATION` (masters `automation_scripts`; realizes `RMM-SCRIPT`), `RMM-AGENT-MGMT` (masters `rmm_agents`; realizes `RMM-EPM`, `RMM-MT`, `RMM-DISC`, `RMM-INV`). | Phase-A re-author. Gated on B2-S1. |
| B1-S3 | **B9 missing `trigger_events`** | 12 lifecycle-derived events not in catalog (`rmm_agent.installed`, `rmm_agent.offline`, `rmm_agent.uninstalled`, `monitoring_policy.published`, `monitoring_policy.deprecated`, `monitoring_alert.acknowledged`, `monitoring_alert.resolved`, `monitoring_alert.suppressed`, `patch_job.failed`, `patch_job.rolled_back`, `automation_script.approved`, `automation_script.deprecated`). | INSERT 12 rows post B1-S1 + B1-S4. |
| B1-S4 | **B12 / Rule #12 fail** | 0 lifecycle states on 5 masters. Likely state machines per prior audit. | Author lifecycle rows for the 3 workflow masters (`rmm_agents`, `monitoring_alerts`, `patch_jobs`); gate exemption for `monitoring_policies` + `automation_scripts` on B2-S6. Each row carries `domain_module_id` per Rule #14 permission-materialization scope; depends on B1-S1. |
| B1-S5 | **B10b cascade, 11 outbound source FKs NULL** | Handoffs 140, 141, 142, 143, 144, 145, 146, 147, 159, 644, 645 all carry NULL `source_domain_module_id`. | PATCH each row post B1-S1 with the realizing module ID. |
| B1-S6 | **B10b cascade, 1 inbound target FK NULL** | Handoff 150 (HAM `asset.retired` -> RMM `rmm_agents`) has NULL `target_domain_module_id`. | PATCH 150 set target to `RMM-AGENT-MGMT.id` post B1-S1. |
| B1-S7 | **B10b report-only (4 outbound target NULLs)** | 141 (AIOPS), 144 (HAM), 145 (SAM), 147 (DISCOVERY). Owed by counter-party. | Schedule b1 audits on those four domains. |
| B1-S8 | **B10b report-only (1 inbound source NULL)** | Handoff 150 source. Owed by HAM. | Schedule HAM b1 audit. |
| B1-S9 | **B9b would-fail post-M1** | 0 intra-domain handoffs across the proposed 4-module shape. Candidates per prior audit: `RMM-MONITORING -> RMM-PATCH-MGMT` on auto-patch policy, `RMM-MONITORING -> RMM-AUTOMATION` on remediation script trigger, `RMM-AGENT-MGMT -> RMM-MONITORING` on agent install -> policy enrollment, `RMM-AGENT-MGMT -> RMM-PATCH-MGMT` on agent install -> patch scope enrollment, `RMM-PATCH-MGMT -> RMM-AUTOMATION` on patch failure -> remediation. | INSERT 5 rows post B1-S1 + B1-S3. |
| B1-H1 | **H1 hard-fail (remaining 5 + REPLACE)** | 5 cross-domain handoffs still untagged: 140, 144, 145, 159, 644. Handoff 150 carries L1 catch-all (19207) and should be REPLACE'd with a tighter L3 ("Retire IT assets" or equivalent). Total residual work: 5 INSERTs + 1 REPLACE. | Lookup candidate PCF rows via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`; INSERT `(handoff_id, process_id, proposal_source='agent_curated', record_status='new')` per row. |

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 + B9 events + B12 lifecycle + B10b backfill x2 + B9b intra) | 6 (S1, S3, S4, S5, S6, S9) |
| Report-only (B10b counter-party x2) | 2 (S7, S8) |
| APQC TAGGING (5 INSERT + 1 REPLACE) | 1 (H1) |
| **Bucket 1 total** | **9 items** |

### Bucket 2, Surface-for-user (judgment calls)

Carried over from 2026-05-30 audit; no user decisions captured since. Re-stated for self-containment.

| ID | Question | Options |
|---|---|---|
| B2-S1 | M1 architectural module split: 4 full modules vs alternatives. | (a) 2-module collapse (`RMM-AGENT-OPS` + `RMM-WORKFLOW-AUTOMATION`), (b) 5-module split (separate `RMM-DISCOVERY`), (c) the proposed 4 (`RMM-MONITORING`, `RMM-PATCH-MGMT`, `RMM-AUTOMATION`, `RMM-AGENT-MGMT`), (d) alternative shape. |
| B2-S2 | Rule #15 notes-pollution on every `domain_data_objects` row (12 of 12 have populated narrative `notes` like "Co-master with ITOM, which owns ..."). | (a) Confirm user-typed at load time; leave in place. (b) Confirm auto-populated; PATCH all 12 to empty string and log Rule #15 incident per `references/skill-changelog.md`. |
| B2-S3 | Multi-master collision on `monitoring_alerts` (85) and `monitoring_policies` (86) between RMM and ITOM. | (a) Split into endpoint-specific `endpoint_alerts` / `endpoint_monitoring_policies` for RMM, keep ITOM's broader masters. (b) RMM downgrades to contributor. (c) Defer to architecture pass. |
| B2-S4 | Multi-master collision on `automation_scripts` (225) between RMM and TEST-MGMT. The two existing aliases (`automated test`, `test automation`) bias toward TEST-MGMT. | (a) Split: `test_automation_scripts` for TEST-MGMT, keep `automation_scripts` for RMM. (b) Split the other way: keep `automation_scripts` for TEST-MGMT, rename RMM master to `endpoint_automation_scripts`. (c) Keep shared. (d) Defer. |
| B2-S5 | B4 pattern-flag re-evaluation. Current state: all 5 masters at false / false / false. Candidates: (a) `rmm_agents.has_personal_content=true`, (b) `monitoring_alerts.has_personal_content=true`, (c) `patch_jobs.has_submit_lock=true`, (d) `automation_scripts.has_submit_lock=true` once published, (e) `monitoring_policies.has_submit_lock=true` once active. | Per-flag yes / no. |
| B2-S6 | Rule #12 config-shape exemption candidates: `monitoring_policies`, `automation_scripts`. | (a) Both exempted. (b) Only `monitoring_policies`. (c) Only `automation_scripts`. (d) Neither (full lifecycle for all 5 masters). |
| B2-S7 | Module-permission scope post B1-S1 + B1-S4: which roles bundle which workflow-gate permissions. Proposed: `RMM-OPERATOR`, `RMM-PATCH-MANAGER`, `RMM-AUTOMATION-AUTHOR`, `RMM-ADMIN`. | Confirm role names + bundle shape. |
| B2-S8 | Cross-cutting modules: should any RMM module be hosted via `domain_module_host_domains` on other domains (e.g. `RMM-MONITORING` on ITOM)? | (a) Primary-host-only. (b) Host `RMM-MONITORING` on ITOM. (c) Host `RMM-AGENT-MGMT` on UEM. |
| B2-S9 | System-skill scope per module per Rule #17 (exactly one `system` skill + tool floor). Proposed tool counts: RMM-MONITORING 10-15, RMM-PATCH-MGMT 8-12, RMM-AUTOMATION 6-10, RMM-AGENT-MGMT 8-12. | (a) Match. (b) Larger. (c) Smaller. (d) Defer. |

### Bucket 3, Phase 0 pending (speculative)

Carried over from 2026-05-30 audit. Re-stated.

| Candidate entity | Vendor evidence | Proposed module |
|---|---|---|
| `agent_groups` | NinjaOne, Datto RMM, ConnectWise RMM (`device_groups` / `client_groups`). | RMM-AGENT-MGMT (master) |
| `monitoring_thresholds` | NinjaOne, ManageEngine (a policy bundles many thresholds). | RMM-MONITORING (master or junction) |
| `patch_approval_policies` | Kaseya, Datto, ManageEngine. | RMM-PATCH-MGMT (master) |
| `maintenance_windows` | NinjaOne, ConnectWise, N-able. | RMM-PATCH-MGMT or RMM-AGENT-MGMT (master) |
| `remote_sessions` | NinjaOne, Datto, ConnectWise (TeamViewer / Splashtop / native). | RMM-AGENT-MGMT or REMOTE-ACCESS (master) |
| `script_runs` | NinjaOne, Atera, Action1 (definition vs execution event). | RMM-AUTOMATION (master, separate from `automation_scripts`) |
| `compliance_baselines` | Action1, ManageEngine, N-able (CIS, NIST). | RMM-MONITORING or new RMM-COMPLIANCE module |
| `customer_tenants` | All MSP-RMM vendors (multi-tenant data isolation). | MSP-PSA or new master-data module |
| `agent_install_packages` | NinjaOne, Action1, Atera (per-OS, per-arch, signed binaries). | RMM-AGENT-MGMT (master) |

Modularization candidates: `RMM-COMPLIANCE` (would push to 5 full modules), `RMM-REPORTING` / customer-portal split. Adjacent-domain candidates already queued in `audits/_missing-domains.md`: EDR, VULN-MGT, MSP-BILLING. Regulation candidates (no entity proposed): SOC 2 attestation, HIPAA pass-through, CMMC, NIS2.

### Cross-bucket dependencies

- **B1-S1** gated on **B2-S1**. Cascades S3, S4, S5, S6, S9.
- **B1-S4** depends on **B2-S6** (config-shape exemption).
- **B1-S5 / S6** depend on **B1-S1**.
- **B1-S9** depends on **B1-S1** + **B1-S3**.
- **B3 MISSING entities** (especially `script_runs`, `patch_approval_policies`, `compliance_baselines`) feed back into **B2-S1** module-shape decision; user may choose to vet B3 before settling B2-S1.
- **B2-S3** blast radius covers ITOM, AIOPS, MSP-PSA, ITSM-EVENT-MGMT; coordinate with ITOM b1.
- **B2-S4** blast radius covers TEST-MGMT; coordinate with TEST-MGMT b1.
- **B2-S5 / S7** independent of Bucket 3.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, list (e.g. `H1, S5`), or `skip`. Most items remain gated on B2-S1; B1-H1 partial (5 INSERT + 1 REPLACE) and B1-S7 / B1-S8 (schedule sister audits) are the only ones independently actionable.

**Bucket 2, what's your call on each?** Per-item decisions required before agent acts; B2-S1 unlocks the most downstream work.

**Bucket 3, vet via Phase 0 research or eyeball-mode?** If eyeball-mode, name which of the 9 entity candidates + 2 modularization candidates + 4 regulation candidates to confirm.

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed work |
|---|---|
| AIOPS | B10b: populate `target_domain_module_id` on outbound handoff 141. |
| HAM | B10b: populate `target_domain_module_id` on outbound handoff 144; populate `source_domain_module_id` on inbound handoff 150. |
| SAM | B10b: populate `target_domain_module_id` on outbound handoff 145. |
| DISCOVERY | B10b: populate `target_domain_module_id` on outbound handoff 147. |
| ITSM | Confirm outbound to RMM-AUTOMATION on `service_request.approved` for software-install requests; reconcile ITSM-EVENT-MGMT (module 42) `monitoring_alerts` embedded_master rollup with the RMM / ITOM co-master question (B2-S3). |
| ITOM | Multi-master reconciliation on `monitoring_alerts` and `monitoring_policies` per B2-S3. |
| MSP-PSA | Add cross-relationship `msp_ticket originates_from monitoring_alert`. |
| TEST-MGMT | Multi-master reconciliation on `automation_scripts` per B2-S4. |
| REMOTE-ACCESS | Confirm outbound handoff `remote_session.requested` -> RMM-AGENT-MGMT for RMM-managed endpoints. |

### JWT errors

None.

### Decisions

(none yet, awaiting user)
