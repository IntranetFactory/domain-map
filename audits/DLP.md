---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 35
---

# DLP - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 modules** (M-band hard-fail blocker); 6 masters (`dlp_incidents`, `dlp_policies`, `data_exfiltration_attempts`, `dlp_quarantine_items`, `dlp_exceptions`, `dlp_user_activity_logs`); 1 contributor (`data_classifications`); 1 consumer (`employees`); 8 capabilities; 10 solutions (4 primary, 2 secondary, 4 partial); 11 trigger_events (3 with empty `event_category`); 8 outbound + 10 inbound cross-domain handoffs; 0 intra-domain handoffs; 0 lifecycle states; 0 data_object_aliases; 0 intra-domain data_object_relationships among DLP masters; 0 user-edge relationships on any DLP master; 1 legacy domain-level system skill (`skill_id=50`, `domain_module_id=null`) with 6 query-only skill_tools; 0 mutates, 0 workflow gates, 0 inbound, 0 compute; 0 roles; 0 role_modules; 0 role_permissions; 0 `business_function_domains` rows; 0 `domain_regulations` rows. Only 2 of 18 cross-domain handoffs carry APQC tags (both `discovery_substring`; one points at "Document trade" L3 ext 14095, a finance-trade-doc PCF row, wildly off-topic).
- Vendor-surface basis (Phase 2 inline): Microsoft Purview DLP, Forcepoint DLP, Broadcom (Symantec) Data Protection DLP, Trellix DLP, Proofpoint Information Protection, Netskope SWG DLP, Zscaler ZIA DLP, Code42 Incydr, Nightfall AI, Cyberhaven. Compliance specialists in scope: Nightfall AI (cloud-native PII), Code42 + Cyberhaven (insider-risk-adjacent), Microsoft Purview (Microsoft 365 / Azure data estate).
- **Bucket 1 (in-scope, agent fixable):** 16 items (1 M-band hard fail + 1 business_function_domains hard fail + 4 structural fixes + 1 APQC-tagging top item with sub-table of 18 + 9 other structural sub-items).
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 14 items (10 missing entities + 1 modularization proposal + 3 regulation candidates).
- **Candidates queued:** 3 (IRM, CASB, SSE-SASE).
- **Status set:** `feedback_needed`.

### Neighbor discovery (auto-derived from handoffs + DMDO; ranked by edge weight)

| Neighbor | Out | In | DMDO cross | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| IGA  | 2 | 0 | 2 (consumer on `dlp_incidents`, `dlp_user_activity_logs`) | 0 | 4 | Pairwise (full) |
| SECOPS | 3 | 0 | 0 | 0 | 3 | Pairwise (full) |
| DCG  | 0 | 3 | 0 | 0 | 3 | Pairwise (full) |
| ECM  | 0 | 2 | 0 | 2 (`content_documents is_scanned_by dlp_policies`, `document_classifications recomputes dlp_policies`) | 4 | Pairwise (full) |
| WSC  | 0 | 1 | 0 | 1 (`chat_messages streamed_to dlp_incidents`) | 2 | Lightweight |
| ITSM | 1 | 0 | 0 | 0 | 1 | Lightweight |
| PRIV-MGMT | 1 | 0 | 0 | 0 | 1 | Lightweight |
| GRC  | 1 | 0 | 0 | 0 | 1 | Lightweight |
| BI   | 0 | 1 | 0 | 0 | 1 | Lightweight |
| NCDB | 0 | 1 | 0 | 0 | 1 | Lightweight |
| DI   | 0 | 1 | 0 | 0 | 1 | Lightweight |
| DSPM | 0 | 1 | 0 | 0 | 1 | Lightweight |

The dominant pairwise finding is that **every cross-domain handoff into and out of DLP carries `source_domain_module_id=NULL`** (and most also `target_domain_module_id=NULL`) because DLP has zero `domain_modules` rows. Every B-band band check that depends on module FKs is vacuously stuck until M1 is cured. Pairwise diff vs. each neighbor reduces to the same finding (B-S1 below); per-neighbor reconciliation cannot resolve handoff module FKs without DLP's own modularization.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (M / A / C / B / F)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail) - BLOCKING** | `domain_modules?domain_id=eq.139` returns zero rows. DLP has no deployable unit. Every downstream concern (DMDO attribution, lifecycle-state realization, workflow-gate permissions, system-skill scope, role bundles, handoff `source_domain_module_id`, intra-domain handoffs) is gated on the M-band. Capability count is 8, well above the 3-capability threshold for M2 (Rule #14 floor: 2 full modules). Proposed module split per market practice (see Bucket 3 for vendor evidence): (a) `DLP-POLICY-CONTROL` masters `dlp_policies`, `dlp_exceptions`, `data_classifications` (the policy-authoring + exception-management surface); (b) `DLP-ENFORCEMENT-RUNTIME` masters `dlp_incidents`, `data_exfiltration_attempts`, `dlp_quarantine_items`, `dlp_user_activity_logs` (the runtime detection + response surface). | Phase A load: create 2 `domain_modules` rows with `module_kind='full'`, populate `domain_module_capabilities` to map the 8 existing capabilities (`DLP-POLICY-ENGINE`, `DLP-CLASSIFY`, `DLP-FINGERPRINT` to module a; `DLP-EMAIL-EGRESS`, `DLP-ENDPOINT-AGENT`, `DLP-NETWORK-INLINE`, `DLP-CLOUD-API`, `DLP-INCIDENT-MGMT` to module b), then migrate the 6 master DMDO rows + 1 contributor + 1 consumer from legacy `domain_data_objects` to `domain_module_data_objects` per the split. Lifecycle states, workflow-gate permissions, and system-skill split (Rule #17: one `system` skill per module) follow in the same load. |
| B1-S2 | **C1 (hard fail)** | `business_function_domains?domain_id=eq.139` returns zero rows. The 20-function spine has no owner declaration for DLP. Most adjacent security domains route to `Information Security` (typical owner) with `IT Operations` and `Risk & Compliance` as contributors. | Insert at minimum 1 `owner` row (likely `Information Security`) plus 1-2 contributor/consumer rows. Loader pattern: same as ATS/HCM-area C1 fixes. |
| B1-S3 | **B-band - trigger_events.event_category** | 3 events have empty `event_category` (Rule #13 enum: `lifecycle / state_change / threshold / signal`): `id=927 dlp_policy.updated`, `id=928 dlp_quarantine_item.released`, `id=929 dlp_user_activity.flagged`. | PATCH: 927 -> `state_change`; 928 -> `state_change`; 929 -> `signal` (behavioral pattern, not a single state machine transition). |
| B1-S4 | **B6 (hard fail)** | Zero intra-domain `data_object_relationships` rows among the 6 DLP masters. The workflow demands: `data_exfiltration_attempts -> dlp_incidents` (detection becomes incident), `dlp_policies -> dlp_incidents` (policy fires incident), `dlp_incidents -> dlp_quarantine_items` (incident produces quarantined artifact), `dlp_exceptions -> dlp_policies` (exception modifies policy at evaluation time), `dlp_incidents -> dlp_user_activity_logs` (activity log accumulates incident references). | Draft 5-6 relationship rows (verb + is_required + owner_side) and load via the cluster-drafts pattern. Examples: `data_exfiltration_attempt triggers dlp_incident`, `dlp_policy evaluates_against dlp_incident`, `dlp_incident produces dlp_quarantine_item`, `dlp_exception overrides dlp_policy`, `dlp_user_activity_log records dlp_incident`. |
| B1-S5 | **B7 (hard fail)** | Zero edges between `users` (id 748) and any DLP master. Every master needs at least one user-typed actor: `dlp_incidents` (reviewer, assignee, reporter); `dlp_policies` (author, approver); `dlp_quarantine_items` (reviewer, release_approver); `dlp_exceptions` (requestor, approver); `dlp_user_activity_logs` (user under monitor); `data_exfiltration_attempts` (actor). Rule #10: built-in `users` edges are first-class. | Load 6 `users -> master` relationship rows with verb-shape names per the catalog convention (e.g. `reviews_dlp_incident`, `authors_dlp_policy`, `approves_dlp_exception`). Pattern matches Rule #10 + the corrected ATS B7 fix. |
| B1-S6 | **B12 (hard fail)** | Zero `data_object_lifecycle_states` rows for any DLP master. Per Rule #12 every workflow-bearing master needs a state machine, and workflow-gate permissions materialize from those states (states with `requires_permission=true`). Expected machines: `dlp_incidents (detected -> triaged -> investigated -> remediated -> closed)`, `dlp_policies (draft -> in_review -> approved -> active -> retired)`, `dlp_quarantine_items (held -> reviewed -> released | destroyed)`, `dlp_exceptions (requested -> approved | denied -> active -> expired)`, `data_exfiltration_attempts` is a transient event (likely config-shape exemption candidate, see B2-S3), `dlp_user_activity_logs` is append-only audit (definitely config-shape). | Draft state machines per master once B1-S1 lands (module ids needed for the optional `domain_module_id` realization column on each gated state). Workflow-gate permissions then materialize per the per-module derivation rule. |
| B1-S7 | **B11 (soft fail)** | Zero `data_object_aliases` rows for any DLP master. Vendor terminology is highly fragmented (Purview "Activity Explorer", "Sensitivity Labels"; Forcepoint "DLP Policies", "Incident Risk Ranking"; Code42 "File Events"; Netskope "Real-time Protection Policies"). Aliases help cross-vendor lookup. Cross-industry equivalents: `dlp_incidents <-> data_loss_event`, `dlp_policies <-> sensitive_data_policy`. | Draft 8-15 alias rows total (2-3 per master) once B1-S1 lands. |
| B1-S8 | **B-band - B4 (soft fail)** | Pattern flags on all 6 masters are `false` by default; no positive audit pass recorded. Candidates: `dlp_incidents.has_personal_content=true` (incidents typically reference user identifier + sample of leaked content); `dlp_user_activity_logs.has_personal_content=true` (per-user behavior trail); `dlp_policies.has_submit_lock=true` (policies typically freeze at `approved` so dependent enforcement points have a stable surface); `dlp_exceptions.has_single_approver=true` (single-approver workflow is the dominant pattern at the major vendors). | Decisions belong in Bucket 2 (B2-S2). |
| B1-S9 | **F1 (hard fail)** | Skill 50 (`dlp-system`, `skill_type='system'`, `domain_module_id=NULL`) is a legacy domain-level system skill. Once B1-S1 lands, F1 mandates retiring this legacy row in favor of per-module system skills (one per module per Rule #17). The legacy skill's 6 query tools (`query_dlp_incidents`, `query_dlp_policies`, `query_data_exfiltration_attempts`, `query_dlp_quarantine_items`, `query_dlp_exceptions`, `query_dlp_user_activity_logs`) can stay in the `tools` catalog (the skill_tools junctions move to the new module-level skills); DELETE only the `skills` row and its `skill_tools` rows after the new skills are in place. | After B1-S1, author: `dlp_policy_control_agent` (skill_type=system, domain_module_id=<policy-control id>), `dlp_enforcement_runtime_agent` (skill_type=system, domain_module_id=<enforcement-runtime id>); split the 6 query tools across them per data_object_id, then DELETE skill 50 and its 6 skill_tools rows. |
| B1-S10 | **F3/F4/F7 (gated on F2)** | Once two module-level system skills exist, each needs >=1 skill_tools row with mix of `required` + `optional` (typical 5-20). Today's surface is 100% `query` operations. Phase-S floor: at least one `mutate` per master (e.g. `update_dlp_incident_status`, `approve_dlp_exception`, `release_dlp_quarantine_item`), at least one `side_effect` per module (e.g. `notify_security_team` via `notify_person` per F7), and at least one `inbound` primitive (e.g. `receive_dlp_alert_webhook`). | Phase-S load alongside B1-S9 once modules exist. F4 invariant: `query`/`mutate` set `data_object_id`; `side_effect`/`compute` NULL; `inbound` optional. F7: prefer `notify_person`/`notify_team` over channel primitives. |
| B1-S11 | **B10b (this domain's own side)** | 8 outbound handoffs all carry `source_domain_module_id=NULL` because DLP has zero modules (gated on B1-S1). Also: 10 inbound handoffs all carry `target_domain_module_id=NULL` for the same reason. Both halves are this domain's B10b once B1-S1 lands. | After B1-S1, run the deterministic backfill per the published recipe: `source_domain_module_id` (outbound) = the module that masters the `trigger_events.data_object_id`; `target_domain_module_id` (inbound) = the module that holds the handoff payload with the strongest role (`master > embedded_master > contributor > consumer > derived`). |
| B1-S12 | **B9 (partial)** | 11 trigger_events exist but only 7 have `handoffs` rows pointing at a cross-domain target. Missing handoffs: `dlp_incident.quarantined` (261) - likely fans out to PRIV-MGMT, SECOPS, ITSM; `dlp_incident.remediated` (262) - likely informs SECOPS + ITSM; `dlp_exception.requested` (265) - likely informs GRC; `dlp_exception.approved` (266) - likely informs IGA + SECOPS; `dlp_policy.updated` (927) - likely fans out to DCG (policy alignment) + every consumer module; `dlp_quarantine_item.released` (928) - likely informs ECM + WSC (release reattaches content to host system). | After B1-S1, draft missing handoff rows with both module FKs populated; load via standard handoffs loader. |
| B1-S13 | **B9b (vacuously passes today, real check after B1-S1)** | With 0 modules today, no intra-domain cross-module handoffs are even modellable. Once B1-S1 splits DLP into 2 modules, expect intra-domain handoffs for at least: `dlp_policy.activated` (POLICY-CONTROL -> ENFORCEMENT-RUNTIME), `dlp_incident.detected` (ENFORCEMENT-RUNTIME -> POLICY-CONTROL for tuning loop), `dlp_exception.approved` (POLICY-CONTROL -> ENFORCEMENT-RUNTIME for runtime policy reconfiguration). | Draft once modules exist. `integration_pattern='lifecycle_progression'`, `friction_level='low'`. |
| B1-S14 | **E1/E2/E4 (gated on B1-S1)** | Zero `roles` rows for any DLP-affiliated business function, zero `role_modules`, zero `role_permissions`. Once 2 modules exist (M2 satisfied), E1 mandates >=3 distinct roles touching both modules. Likely roles: `DLP-ADMIN` (policy authoring + approval, spans both modules), `DLP-INCIDENT-RESPONDER` (incident triage + remediation, ENFORCEMENT-RUNTIME primary, POLICY-CONTROL secondary), `SECURITY-ANALYST` (cross-cutting investigator, secondary on both). | Author after B1-S1. Use function-scoped naming. Load with explicit `interaction_level` per E3. |
| B1-S15 | **B8 (outbound cross-domain relationships)** | 8 outbound `handoffs` rows but zero `data_object_relationships` rows with `data_object_id IN (DLP masters)` and `related_data_object_id IN (other-domain masters)`. Required edges: `dlp_incidents informs_security_incident` -> `service_incidents` (SECOPS / ITSM); `dlp_incidents triggers_privacy_review` -> `data_subject_requests` (PRIV-MGMT); `dlp_incidents escalates_to_iga_review` -> the IGA entity that the IGA-AUTO-PROVISIONING consumer DMDO row implies; `dlp_user_activity_logs feeds_sod_review` -> IGA-SOD-MGMT. | Draft 4-5 relationship rows per the verbs above; load via the cluster-drafts pattern. |
| B1-S16 | **APQC TAGGING (H1 hard fail)** | 18 cross-domain handoffs total (8 outbound + 10 inbound); only 2 carry tags, both `discovery_substring`, one mis-anchored. Sub-table below. Volume expectation per SKILL: 0.5N to 0.8N agent_curated tags for N=18 -> 9-14 tags. | Author the agent_curated rows below; DELETE handoff_processes id corresponding to the mis-anchored "Document trade" tag on handoff 822 (or PATCH to the correct PCF row once load_research is touched). |

#### APQC TAGGING (B1-S16 sub-table)

The only two existing tags are `discovery_substring`: handoff 264 (`data_access_request.approved` from DCG -> DLP) at PCF 11750 "Review and approve data access requests" (L4) - this one is actually defensible since the source-side semantic IS access-request approval, but it's a DCG-side concern (the row should be tagged from DCG's audit, not DLP's, since the producer's PCF activity is what fires the event). Handoff 822 (`document.classified` from ECM -> DLP) currently points at PCF 14095 "Document trade" (L3, finance) - this is a substring mis-match and should be REPLACED.

| handoff_id | direction | source -> target | trigger_event | payload | Proposed PCF (name / ext_id / L) | confidence |
|---|---|---|---|---|---|---|
| 280 | out | DLP -> SECOPS | dlp_incident.violation_detected | dlp_incidents | Respond to IT information security and network breaches / 20762 / L4 | confident L4 |
| 281 | out | DLP -> IGA | dlp_incident.escalated | dlp_incidents | Respond to IT information security and network breaches / 20762 / L4 | confident L4 |
| 282 | out | DLP -> SECOPS | dlp_incident.escalated | dlp_incidents | Respond to IT information security and network breaches / 20762 / L4 | confident L4 |
| 283 | out | DLP -> PRIV-MGMT | dlp_incident.blocked | dlp_incidents | Respond to IT information security and network breaches / 20762 / L4 | confident L4 |
| 284 | out | DLP -> SECOPS | data_exfiltration_attempt.initiated | data_exfiltration_attempts | Respond to IT information security and network breaches / 20762 / L4 | confident L4 |
| 843 | out | DLP -> ITSM | dlp_incident.blocked | service_incidents | Triage IT service delivery incidents / 20903 / L4 (target side is ITSM incident triage) | confident L4 |
| 844 | out | DLP -> GRC | dlp_incident.blocked | dlp_incidents | Control IT risk, compliance, and security / 20721 / L3 | confident L3 |
| 845 | out | DLP -> IGA | dlp_user_activity.flagged | dlp_user_activity_logs | Respond to IT information security and network breaches / 20762 / L4 | confident L4 |
| 260 | in | DCG -> DLP | data_asset.classified | data_assets | Develop and manage IT security, privacy, and data protection / 20735 / L3 (DCG's classification feeds DLP policy authoring) | confident L3 |
| 264 | in | DCG -> DLP | data_access_request.approved | data_access_policies | Review and approve data access requests / 11750 / L4 (existing discovery_substring tag - upgrade `proposal_source` to `agent_curated`, leave PCF as-is, this is the rare case where the substring matcher landed correctly) | confident L4 (keep existing) |
| 690 | in | BI -> DLP | bi_dashboard.shared_externally | bi_dashboards | Develop and manage IT security, privacy, and data protection / 20735 / L3 | confident L3 |
| 702 | in | NCDB -> DLP | nocode_view.shared_externally | nocode_views | Develop and manage IT security, privacy, and data protection / 20735 / L3 | confident L3 |
| 709 | in | DCG -> DLP | data_domain.created | data_domains | Develop and manage IT security, privacy, and data protection / 20735 / L3 | confident L3 |
| 730 | in | DI -> DLP | sink_connector.added | sink_connectors | Develop and manage IT security, privacy, and data protection / 20735 / L3 (new egress path triggers policy reconsideration) | confident L3 |
| 821 | in | ECM -> DLP | content_document.uploaded | content_documents | Develop and manage IT security, privacy, and data protection / 20735 / L3 | confident L3 |
| 822 | in | ECM -> DLP | document.classified | document_classifications | Develop and manage IT security, privacy, and data protection / 20735 / L3. **DELETE existing `discovery_substring` tag pointing at PCF 14095 "Document trade" - mis-anchored.** | confident L3 |
| 832 | in | WSC -> DLP | chat_message.posted | chat_messages | Develop and manage IT security, privacy, and data protection / 20735 / L3 (chat ingestion triggers DLP scan policy) | confident L3 |
| 847 | in | DSPM -> DLP | data_warehouse.classified | data_warehouses | Develop and manage IT security, privacy, and data protection / 20735 / L3 | confident L3 |

Sub-counts: 17 fresh `agent_curated` proposals + 1 upgrade-in-place (handoff 264) + 1 REPLACE (handoff 822). All confident at L3 or L4; zero deferred-to-Discover items in this audit.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1, C1, B-band events, B6, B7, B12, B11, B4, F1, F3/F4/F7, B10b, B9, B9b, E-band, B8) | 15 |
| APQC TAGGING (1 top-level Bucket 1 item per SKILL convention; sub-table proposes 18 rows) | 1 |
| **Bucket 1 total** | **16** |

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module split topology** (B1-S1 prerequisite). The proposed split is `DLP-POLICY-CONTROL` (policy + exception authoring) vs. `DLP-ENFORCEMENT-RUNTIME` (incidents + exfiltration + quarantine + activity logs). Some flagships split orthogonally: by **channel** (`DLP-EMAIL`, `DLP-ENDPOINT`, `DLP-CLOUD`, `DLP-NETWORK`). Microsoft Purview is closer to a unified channel; Forcepoint historically per-channel; Broadcom DLP per-channel; Netskope cloud-first; Code42 endpoint-only. | Modularization design choice with downstream effects on capability assignment, role bundles, and the Phase-B + Phase-S load shape. | (a) Policy-vs-Runtime split (recommended for vendor neutrality); (b) Per-channel split (would imply 4-5 modules); (c) Hybrid: 2 full modules + 1 starter (`DLP-LITE` for cloud-only / SMB tier). |
| B2-S2 | **Pattern-flag positive re-evaluation (B1-S8)**. Per-flag decisions: `dlp_incidents.has_personal_content=?`; `dlp_user_activity_logs.has_personal_content=?`; `dlp_policies.has_submit_lock=?`; `dlp_exceptions.has_single_approver=?`. Per Rule #15, the consideration cannot be recorded in `notes` - it lives in this audit conversation. | Pattern flags are workflow-shape judgments the user owns; the false-by-default is not a positive answer. | Per-flag yes/no from user; load via PATCH after each decision. |
| B2-S3 | **Lifecycle-state exemptions (B1-S6)** for `data_exfiltration_attempts` and `dlp_user_activity_logs`. Both are transient/append-only and may qualify for the Rule #12 config-shape exemption. The exemption used to allow a `data_objects.notes` annotation; per Rule #15 that license is rescinded - the exemption decision lives in this audit. | Whether these are workflow-bearing or config-shape is a substantive call (a vendor like Cyberhaven treats activity logs as a first-class investigable surface with its own state machine; Microsoft Purview treats them as append-only audit). | (a) Exempt both as config-shape (skip lifecycle states for these two); (b) Author lifecycle states for `dlp_user_activity_logs` only (`open -> reviewed -> archived`); (c) Author lifecycle states for both. |
| B2-S4 | **Business-function ownership (B1-S2)**. Most adjacent security domains (SECOPS, IGA, DSPM) route to `Information Security` as owner. DLP straddles security + privacy + records management; `Privacy Office` could legitimately own the policy side while `Information Security` owns the runtime side. | Org-design choice with implications for permission-bundle drift (E6) and cross-functional role authoring. | (a) Single owner `Information Security`; (b) Owner split: `Information Security` owns ENFORCEMENT-RUNTIME, `Privacy Office` owns POLICY-CONTROL; (c) `Information Security` owner + `Privacy Office` + `Legal/RM` contributors. |
| B2-S5 | **APQC TAGGING - confirmation on bulk-applying the 18 proposed PCF rows (B1-S16)**. The sub-table proposes 17 fresh `agent_curated` rows + 1 replacement (handoff 822) + 1 in-place upgrade (handoff 264 from `discovery_substring` to `agent_curated`). The "Develop and manage IT security, privacy, and data protection" (20735 L3) anchor is repeated on most inbound rows because every inbound row triggers DLP policy authoring/refinement - that is the substantive job, even though the L3 anchor is the same. Some reviewers prefer L4 children where they exist; the only relevant L4 children are response-side. | Reviewer preference + the "use L3 parent when L4 doesn't add precision" rule have different defaults across audits. | (a) Approve the 18 as proposed (recommended); (b) Drop down to L4 children where they exist (would require pulling more PCF rows); (c) Pre-vet via a Discover Pass 3 review of L3 anchor reuse. |

### Bucket 3 - Phase 0 pending (speculative; vendor knowledge basis)

The DLP catalog footprint covers the basic policy + incident + exception substrate well but lacks: (1) **classification and labeling artifacts** as first-class entities, (2) **content fingerprints** as first-class entities, (3) the **runtime policy decision/enforcement audit trail** at a granularity below incident, (4) **forensic evidence** and chain-of-custody, (5) **regulator notification** entities that DLP must support post-breach, (6) **DSAR-fulfillment integration points**.

#### MISSING (10) - proposed module assignment

| Entity | Proposed module | Vendor evidence |
|---|---|---|
| `dlp_sensitive_data_types` | DLP-POLICY-CONTROL | Purview "Sensitive Information Types", Forcepoint "Data Classifiers", Broadcom "Identity Definitions". First-class pattern catalog (regex + dictionary + ML). |
| `dlp_content_fingerprints` | DLP-POLICY-CONTROL | Purview EDM/EDM, Forcepoint Fingerprinting, Broadcom EDM, Trellix EDM. Exact-data-match registry. |
| `dlp_sensitivity_labels` | DLP-POLICY-CONTROL | Purview Sensitivity Labels, MIP Labels, Forcepoint Classification Labels. Distinct from classifications: labels are user/system-applied artifacts persisted on content; classifications are policy-side definitions. |
| `dlp_policy_violations` | DLP-ENFORCEMENT-RUNTIME | Distinct from `dlp_incidents` (which is the case record): the per-event violation is the raw policy hit; incident aggregates violations. Code42 "File Events", Cyberhaven "Data Flow Events". |
| `dlp_enforcement_actions` | DLP-ENFORCEMENT-RUNTIME | Action taken per violation (block, quarantine, redact, mask, watermark, alert). All flagships log per-action audit. |
| `dlp_forensic_evidence` | DLP-ENFORCEMENT-RUNTIME | Snapshot of the artifact at violation time (file hash, sample bytes, screenshot). Code42 Incydr is the strongest signal; Purview Insider Risk also models this. |
| `dlp_alerts` | DLP-ENFORCEMENT-RUNTIME | Distinct from incidents: alerts are notification primitives delivered to SecOps; incidents are case records. Some flagships keep these separate (Forcepoint, Broadcom). |
| `dlp_dictionaries` | DLP-POLICY-CONTROL | Custom term lists referenced by policies. Forcepoint, Purview. |
| `dlp_egress_channels` | DLP-POLICY-CONTROL (config-shape) | Master of monitored channels (email, web, USB, print, cloud-app-id). Every flagship has a channel master; today's catalog implies channels via separate capabilities (`DLP-EMAIL-EGRESS`, `DLP-ENDPOINT-AGENT`, etc.) but no entity. |
| `dlp_breach_notifications` | DLP-POLICY-CONTROL | Regulator-facing notification primitive triggered by `dlp_incident` of `severity=high`. Compliance-driven (GDPR Art. 33/34, CCPA, HIPAA breach notification). |

(Several of these may collapse onto pure `data_object_relationships` or per-violation columns rather than first-class masters - to be decided per-entity at fix time.)

#### MODULARIZATION (1)

- **2-module split** (`DLP-POLICY-CONTROL` + `DLP-ENFORCEMENT-RUNTIME`) is the recommended baseline per B2-S1. With 8 capabilities, Rule #14 floor of 2 modules is satisfied with headroom. If the user picks the per-channel split (B2-S1 option b), the modularization recommendation shifts to 4 modules: `DLP-EMAIL-MSG`, `DLP-ENDPOINT`, `DLP-NETWORK-WEB`, `DLP-CLOUD-API`, each mastering channel-scoped policies + incidents + quarantine. That shape doubles authoring cost but matches Forcepoint/Broadcom legacy product lines more cleanly.

#### REGULATION CANDIDATES (3)

DLP has zero `domain_regulations` rows - a notable gap given DLP's primary buying motivation is regulatory compliance. Candidates to load (with `applicability`):

| Regulation candidate | applicability | Why |
|---|---|---|
| GDPR | direct | Article 5(1)(f) integrity & confidentiality, Article 33/34 breach notification - DLP is the primary control for both. |
| HIPAA | direct | Security Rule 164.312(a)(1) Access Control, 164.308 Administrative Safeguards - DLP enforces ePHI egress controls. |
| PCI-DSS | direct | Req 3 (Protect stored cardholder data), Req 4 (Protect during transmission) - DLP enforces cardholder-data egress prevention. |

(Each regulation row would need to be confirmed in the `regulations` table as a candidate `domain_regulations` row, not as new regulation entities.)

#### Vendor-research basis (Phase 0 candidates)

The vendor surface walked above is from my own knowledge of the market, not a formal Phase 0 document. The headline signal is that the **policy-vs-runtime split** is correct (every flagship distinguishes the policy authoring surface from the runtime enforcement surface in its product navigation), and the **content fingerprints / sensitivity labels** are first-class entities at every flagship - their absence from the catalog is a real gap.

### Cross-bucket dependencies

- **B1-S1 (M-band) blocks the cascade**. B1-S5/S6/S9/S10/S11/S12/S13/S14/S15 are all downstream of having modules. The fix order is: S1 (modules) -> S6 (lifecycle states with `domain_module_id` set) -> S9 (per-module system skills) -> S10 (skill_tools) -> S11 (handoff module FK backfill) -> S12 (missing handoffs with both module FKs populated) -> S13 (intra-domain handoffs) -> S14 (roles). S3 (event_category PATCH), S2 (C1 row), S4 (intra-domain relationships), S5 (users edges), S7 (aliases), S16 (APQC) can land in parallel with or before S1.
- **B2-S1 (module split topology) gates B1-S1**. The chosen split determines capability assignment and master-to-module attribution.
- **B2-S3 (lifecycle exemptions) gates B1-S6**. The exemption decision determines whether 4 or 6 masters carry state machines.
- **B2-S5 (APQC bulk approval) gates B1-S16**. Trivially independent of all other Bucket 1 items - can land first if the user wants the H-band improvement decoupled from M-band.
- **Bucket 3** is independent of Bucket 1: vendor research either vets the candidates (-> they become Bucket 1 items in a follow-up audit) or eyeball-mode promotes a subset. Either way, the modules in B1-S1 are designed to absorb the Bucket 3 entities without re-splitting.

### Per-bucket prompts

**Bucket 1 - fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S3-only`, or `S16 only` to fast-track APQC tagging), or `skip`.

- **S1 (M1 - load 2 modules + capability mapping + DMDO migration):** decide B2-S1 first (module split topology).
- **S2 (C1 - business_function_domains rows):** gated on B2-S4 ownership decision.
- **S3 (event_category PATCH on 3 events):** trivial; one PATCH each. No dependencies.
- **S4 (B6 - intra-domain relationships among DLP masters, 5-6 rows):** no dependencies.
- **S5 (B7 - users-edge relationships, 6 rows per Rule #10):** no dependencies.
- **S6 (B12 - lifecycle states):** gated on S1 and B2-S3.
- **S7 (B11 - data_object_aliases):** no dependencies; can land in parallel.
- **S8 (B4 - pattern flags PATCH):** gated on B2-S2 decision.
- **S9 / S10 (F1/F2/F3 - retire legacy skill, author per-module system skills + skill_tools):** gated on S1.
- **S11 (B10b - handoff module FK backfill):** gated on S1.
- **S12 (B9 - missing handoffs):** gated on S1.
- **S13 (B9b - intra-domain handoffs):** gated on S1.
- **S14 (E-band - roles):** gated on S1.
- **S15 (B8 - outbound cross-domain relationships, 4-5 rows):** no dependencies.
- **S16 (APQC TAGGING - 17 new + 1 replace + 1 upgrade):** gated on B2-S5 only; can land first.

**Bucket 2 - what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (module split topology - 2 modules vs. per-channel vs. hybrid)**: a / b / c?
- **B2-S2 (pattern flags - per-flag yes/no)**: 4 flags to decide.
- **B2-S3 (lifecycle exemptions for `data_exfiltration_attempts` and `dlp_user_activity_logs`)**: a / b / c?
- **B2-S4 (business-function ownership)**: a / b / c?
- **B2-S5 (APQC bulk approval)**: a / b / c?

**Bucket 3 - Phase 0 pending - vet via formal Phase 0 vendor research or eyeball-mode?**

- Vetted route: spawn a focused Phase 0 subagent walking the 10 entity candidates against Microsoft Purview, Forcepoint, Broadcom, Trellix, Proofpoint, Code42, Netskope schemas. Survivors return as Bucket 1 in a follow-up audit.
- Eyeball route: user names which of the 10 ring true; they become Bucket 1 items immediately. Strongest-signal candidates from my own pass: `dlp_sensitive_data_types`, `dlp_content_fingerprints`, `dlp_sensitivity_labels` (the policy-control trio every flagship masters), and `dlp_forensic_evidence` (the runtime evidence-trail). The remaining 6 are softer signals.
- Regulation candidates (3) need a separate decision: load via `domain_regulations` rows once the 3 are confirmed as catalog `regulations` entries.

### Report-only follow-ups (owed by other domains)

- **DCG B8 owes outbound `data_object_relationships`**: handoffs 260 (`data_assets`), 264 (`data_access_policies`), 709 (`data_domains`) imply DCG-mastered -> DLP-mastered edges. DCG's audit owns the verbs.
- **BI B8 owes outbound `data_object_relationships`**: handoff 690 (`bi_dashboards -> dlp_incidents`).
- **NCDB B8 owes outbound `data_object_relationships`**: handoff 702 (`nocode_views -> dlp_incidents`).
- **DI B8 owes outbound `data_object_relationships`**: handoff 730 (`sink_connectors -> dlp_incidents`).
- **ECM B8 owes outbound `data_object_relationships`**: handoffs 821 (`content_documents -> dlp_policies`), 822 (`document_classifications -> dlp_policies`). ECM also has 2 existing edges (`content_documents is_scanned_by dlp_policies`, `document_classifications recomputes dlp_policies`) - these may already cover the requirement, audit during ECM's pass.
- **WSC B8 owes outbound `data_object_relationships`**: handoff 832 (`chat_messages streamed_to dlp_incidents`). WSC already has the relationship row `chat_messages streamed_to dlp_incidents`; verify direction during WSC's pass.
- **DSPM B8 owes outbound `data_object_relationships`**: handoff 847 (`data_warehouses -> dlp_policies`).
- **ITSM, SECOPS, IGA, PRIV-MGMT, GRC B10b (target_domain_module_id NULL)**: DLP's outbound handoffs land with `target_domain_module_id` populated on 3 of 8 rows (281 -> IGA module 148, 845 -> IGA module 146, 843 -> ITSM module 38); the other 5 are NULL because the receiving module wasn't resolvable at insert time. Schedule the target-domain audits to backfill.
- **DCG, BI, NCDB, DI, ECM, WSC, DSPM B10b (target_domain_module_id NULL on inbound rows)**: all 10 inbound handoffs land at DLP with `target_domain_module_id=NULL` because DLP has zero modules. DLP's own B1-S11 cures this, NOT the source domains. Listed here for visibility.
- **8 inbound source domains owe a DMDO consumer/contributor row on DLP masters**: today only IGA declares consumer on `dlp_incidents` (module 148) and `dlp_user_activity_logs` (module 146). The other 6 inbound sources (DCG, BI, NCDB, DI, ECM, WSC, DSPM) have no DMDO row even though their handoffs land on DLP masters. The reverse direction (DLP modules declaring consumer/contributor on DCG/ECM/BI/etc. masters where DLP scans their payloads) becomes scopeable after B1-S1.

### Candidates queued

- **IRM** (Insider Risk Management) - Code42 Incydr, Microsoft Insider Risk Management, DTEX InTERCEPT, Proofpoint Insider Threat, Securonix UEBA, Cyberhaven, Forcepoint Risk-Adaptive Protection. Distinct from DLP: user-behavior-modeling primary, content-scanning secondary.
- **CASB** (Cloud Access Security Broker) - Netskope, Zscaler, Microsoft Defender for Cloud Apps, Skyhigh Security, Forcepoint CASB. Distinct from DLP: SaaS-app-aware inline + API governance; DLP is one feature.
- **SSE-SASE** (Security Service Edge / SASE) - Zscaler, Netskope, Palo Alto Prisma Access, Cloudflare One, Microsoft Entra Internet Access. Cloud-delivered security stack subsuming CASB + SWG + ZTNA + FWaaS + edge DLP.
