# DLP audit history

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

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-technical subset of Bucket 1 (no judgment, audit pre-specified). Loader: `.tmp_deploy/fix_dlp_b1_technical_2026_05_31.ts` (run from project root).

### Applied (6 writes total)

- **B1-S3 (3 PATCHes):** `trigger_events.event_category` backfills per audit map.
  - id=927 `dlp_policy.updated` -> `state_change`
  - id=928 `dlp_quarantine_item.released` -> `state_change`
  - id=929 `dlp_user_activity.flagged` -> `signal`
- **B1-S5 (3 INSERTs, partial cure):** Rule #10 user-edges on `data_object_relationships` for the 3 audit-pre-specified verb names. Shape mirrors project user-edge convention: `data_object_id=748` (users), single-verb, `owner_side=source`, `relationship_type=one_to_many`, `relationship_kind=reference`, `is_required=false`.
  - id=1786 users `reviews` `dlp_incidents` (do 330)
  - id=1787 users `authors` `dlp_policies` (do 331)
  - id=1788 users `approves` `dlp_exceptions` (do 334)

### Deferred (require user judgment, gated, or out-of-scope for technical pass)

- **B1-S1 (M-band modules):** new modules/entities, deferred (Phase A scope; also gated on B2-S1 module-split topology).
- **B1-S2 (C1 business_function_domains):** gated on B2-S4 ownership decision (single owner vs. split vs. IS + Privacy + Legal).
- **B1-S4 (B6 intra-domain rels among DLP masters, 5 verbs):** scope of technical pass is Rule #10 user-edges only; intra-domain master rels deferred.
- **B1-S5 remaining 3 masters:** `dlp_quarantine_items`, `dlp_user_activity_logs`, `data_exfiltration_attempts` have actor-role enumerations (reviewer/release_approver, user-under-monitor, actor) but no audit-pre-specified verb. User picks which actor archetype maps to which verb for the rel row(s).
- **B1-S6 (B12 lifecycle states):** gated on B1-S1 (module FKs) and B2-S3 (config-shape exemptions for `data_exfiltration_attempts` and `dlp_user_activity_logs`).
- **B1-S7 (B11 aliases):** audit gives volume range ("8-15 rows total") but no exact tuples; deferred.
- **B1-S8 (B4 pattern flags):** gated on B2-S2 (per-flag yes/no from user across 4 flag candidates).
- **B1-S9, S10, S11, S12, S13, S14 (F-band + B10b + B9/B9b + E-band):** all gated on B1-S1 modules.
- **B1-S15 (B8 outbound cross-domain rels, 4 verbs):** scope of technical pass is Rule #10 user-edges only; cross-domain rels deferred.
- **B1-S16 (APQC tagging, 17 INSERTs + 1 REPLACE + 1 upgrade):** gated on B2-S5 user bulk-approval.
- **Regulation candidates (Bucket 3, GDPR/HIPAA/PCI-DSS):** audit pre-specifies `applicability='direct'`, but the live enum is `mandatory / recommended / conditional / optional` (per Rule #13 re-query: `domain_regulations.applicability` enum_values). Value not valid; user picks the substitute (likely `mandatory`).

### JWT errors

None encountered during this run.

## 2026-05-31, Audit

Structural Validate b1 re-run (A, M, B [B4/B6/B7/B9/B9b/B10b/B11/B12], C, E [E1-E5], F [F1-F5], H bands). Live state queried directly via `semantius` CLI (Rule #0); no MCP calls; no JWT-audience errors.

### Summary

- **Footprint unchanged at the structural level since 2026-05-30:** still 0 `domain_modules` (M1 hard fail); 6 masters (`dlp_incidents`, `dlp_policies`, `data_exfiltration_attempts`, `dlp_quarantine_items`, `dlp_exceptions`, `dlp_user_activity_logs`); 1 contributor (`data_classifications`); 1 consumer (`employees`); 8 capabilities; 10 solutions (4 primary, 2 secondary, 4 partial); 11 trigger_events; 8 outbound + 10 inbound cross-domain handoffs.
- **Diffs since 2026-05-30:**
  - **B1-S3 cured.** All 3 trigger_events now have valid `event_category`: 927 `dlp_policy.updated` `state_change`, 928 `dlp_quarantine_item.released` `state_change`, 929 `dlp_user_activity.flagged` `signal`.
  - **B1-S5 cured for 3 of 6 masters.** User-edges loaded for `dlp_incidents` (users reviews), `dlp_policies` (users authors), `dlp_exceptions` (users approves). Remaining 3 masters still need user-edges (audit-pre-specified verb missing): `dlp_quarantine_items`, `dlp_user_activity_logs`, `data_exfiltration_attempts`.
  - **APQC tagging partial.** 11 of 18 cross-domain handoffs now carry tags (10 `agent_curated` + 1 `discovery_substring`). 7 untagged: 281 (DLP -> IGA dlp_incident.escalated), 843 (DLP -> ITSM dlp_incident.blocked), 844 (DLP -> GRC dlp_incident.blocked), 845 (DLP -> IGA dlp_user_activity.flagged), 690 (BI -> DLP bi_dashboard.shared_externally), 702 (NCDB -> DLP nocode_view.shared_externally), 847 (DSPM -> DLP data_warehouse.classified). Notable: h822 (`document.classified`) was re-pointed to PCF 21670 "Develop and manage content" (L3 ECM, not the audit-proposed 20735), which is defensible; not flagged.
- **A4 newly visible (gap unchanged):** `domains.catalog_tagline` and `domains.catalog_description` are both empty (Rule #20). This was not called out in the 2026-05-30 narrative but is a real A4 gap.
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items (unchanged from prior audit).
- **Bucket 3 (Phase 0 pending, speculative):** 14 items (10 missing entities + 1 modularization proposal + 3 regulation candidates) (unchanged from prior audit).
- **Candidates queued:** 3 (IRM, CASB, SSE-SASE) (unchanged).
- **next_action_by:** `agent` (b1a non-empty).
- **Status set:** `feedback_needed` (M1 still hard-fails and is gated on B2-S1 module-split topology decision).

### Bucket 1, In-scope confirmed gaps (pending)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 (hard fail, BLOCKING) | DLP has 0 `domain_modules` rows. Gated on B2-S1 (split topology). | Phase A load creating 2 `domain_modules` (`module_kind='full'`) with `domain_module_capabilities` mapping the 8 capabilities and DMDO migration of the 6 masters + 1 contributor + 1 consumer. |
| B1-S2 | C1 (hard fail) | `business_function_domains?domain_id=eq.139` returns zero rows. Gated on B2-S4 ownership decision. | Insert 1 `owner` plus 1-2 contributor/consumer rows. |
| B1-S4 | B6 (hard fail) | Zero intra-domain `data_object_relationships` among the 6 DLP masters. | Draft 5-6 relationship rows per the audit-proposed verb set (e.g. `data_exfiltration_attempt triggers dlp_incident`, `dlp_policy evaluates_against dlp_incident`, `dlp_incident produces dlp_quarantine_item`, `dlp_exception overrides dlp_policy`, `dlp_user_activity_log records dlp_incident`). |
| B1-S5b | B7 (partial, 3 of 6) | 3 user-edges remain unauthored: actor-role enumerations cover `dlp_quarantine_items` (reviewer / release_approver), `dlp_user_activity_logs` (user under monitor), `data_exfiltration_attempts` (actor). | Per-master verb mapping is a B2-shaped pick (multiple plausible verbs per actor). Surface separately as B2-S6 below; the B7 row goes to b1b once verbs are picked. |
| B1-S6 | B12 (hard fail) | Zero `data_object_lifecycle_states` for any DLP master. Gated on B1-S1 (module FK realization column) and B2-S3 (config-shape exemptions). | Author state machines per master once both gates clear. |
| B1-S7 | B11 (soft fail) | Zero `data_object_aliases` for any DLP master. | Draft 8-15 alias rows once B1-S1 lands so vendor terminology can be anchored at the module grain too. |
| B1-S8 | B4 (soft fail) | Pattern flags on all 6 masters are `false` by default; no positive audit pass recorded. Gated on B2-S2 per-flag decisions. | PATCH after B2-S2. |
| B1-S9 | F1 (hard fail) | Skill 50 (`dlp-system`, `domain_module_id=NULL`) is the legacy domain-level system skill. Once B1-S1 lands, retire in favor of per-module system skills (Rule #17). Six query tools (412-417) stay in `tools` catalog; skill_tools junctions migrate. | After B1-S1: author per-module system skills, migrate `skill_tools` to them, DELETE skill 50 and its 6 `skill_tools` rows. |
| B1-S10 | F3/F4/F7 (gated on F2) | Each per-module skill needs >=1 `skill_tools` row with mix `required` + `optional`. Today's surface is 100% `query`. Phase-S floor: >=1 `mutate` per master, >=1 `side_effect` per module (prefer `notify_person` / `notify_team` per Rule #17 channel-vs-capability), >=1 `inbound`. | Phase-S load alongside B1-S9. |
| B1-S11 | B10b (this domain's own side) | 8 outbound handoffs with `source_domain_module_id=NULL` (all 8) and 5 of 8 with `target_domain_module_id=NULL`; 10 inbound handoffs with `target_domain_module_id=NULL` (all 10) and 9 of 10 with `source_domain_module_id=NULL`. Gated on B1-S1. | After B1-S1: deterministic backfill per published recipe. |
| B1-S12 | B9 (partial) | 6 trigger_events without `handoffs`: 261 quarantined, 262 remediated, 265 requested, 266 approved, 927 updated, 928 released. Gated on B1-S1. | Draft missing handoffs with both module FKs populated after modules exist. |
| B1-S13 | B9b (vacuously passes; real check after B1-S1) | 0 modules, so 0 intra-domain handoffs are modellable. Expect 3+ after split: `dlp_policy.activated`, `dlp_incident.detected` (tuning loop), `dlp_exception.approved`. | Draft once modules exist; `integration_pattern='lifecycle_progression'`, `friction_level='low'`. |
| B1-S14 | E1/E2/E4 (gated on B1-S1) | 0 `roles` rows for any DLP-affiliated function, 0 `role_modules`, 0 `role_permissions`. After 2 modules exist: >=3 distinct roles touching both modules. | Author after B1-S1; use function-scoped naming. |
| B1-S15 | B8 (cross-domain rels for outbound) | 8 outbound handoffs but only 2 outbound `data_object_relationships` rows touching DLP masters (the ECM-side incoming pair `is_scanned_by` and `recomputes`; nothing outbound from DLP masters yet). Required edges: `dlp_incidents informs_security_incident`, `dlp_incidents triggers_privacy_review`, `dlp_incidents escalates_to_iga_review`, `dlp_user_activity_logs feeds_sod_review`. | Draft 4-5 cross-domain relationship rows. |
| B1-S16 | APQC TAGGING (H1 partial) | 11 of 18 handoffs tagged. 7 untagged: 281, 843, 844, 845, 690, 702, 847. Volume target 9-14 met as raw count, but the 7 gaps are real (5 outbound, 2 inbound). Catalog-quality headline: 0 `record_status='approved'` on any DLP-touching tag. | Author 7 `agent_curated` tags for the missing handoffs (proposed PCFs identical to 2026-05-30 sub-table). Independent of B1-S1. |
| B1-S17 (new) | A4 (soft fail) | `domains.catalog_tagline=''` and `domains.catalog_description=''` (Rule #20). Domain-grain buyer-facing copy missing. | Draft per Rule #20 voice rule (buyer voice, workflow + value), surface to user for review before writing. Same draft, review, write loop for M8 once modules exist. |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | Module split topology (B1-S1 prerequisite). Policy-vs-Runtime, per-channel, or hybrid? | Modularization design choice with downstream effects on capability assignment, role bundles, Phase-B/Phase-S load shape. | (a) Policy-vs-Runtime split (recommended); (b) Per-channel split (4-5 modules); (c) Hybrid (2 full + 1 starter `DLP-LITE`). |
| B2-S2 | Pattern-flag positive re-evaluation (B1-S8). Per-flag yes/no on `dlp_incidents.has_personal_content`, `dlp_user_activity_logs.has_personal_content`, `dlp_policies.has_submit_lock`, `dlp_exceptions.has_single_approver`. | Pattern flags are workflow-shape judgments the user owns; false-by-default is not a positive answer. | Per-flag yes/no; PATCH after each decision. |
| B2-S3 | Lifecycle-state exemptions (B1-S6) for `data_exfiltration_attempts` and `dlp_user_activity_logs` (transient/append-only). | Cyberhaven vs. Microsoft Purview have different first-class treatments. | (a) Exempt both as config-shape; (b) States for `dlp_user_activity_logs` only; (c) States for both. |
| B2-S4 | Business-function ownership (B1-S2). DLP straddles security + privacy + records management. | Org-design choice with implications for permission-bundle drift and cross-functional role authoring. | (a) `Information Security` single owner; (b) Owner split (`Information Security` runtime, `Privacy Office` policy); (c) `Information Security` + `Privacy Office` + `Legal/RM`. |
| B2-S5 | APQC bulk approval of the 7 remaining `agent_curated` proposals (B1-S16). | Reviewer preference + L3 vs. L4 anchor choice varies. | (a) Approve as proposed; (b) Drop to L4 children where they exist; (c) Pre-vet via Discover Pass 3. |
| B2-S6 (new) | User-edge verbs for the 3 remaining masters (B1-S5b). Audit gave actor-role enumerations but no canonical verb per master. | Multiple plausible verbs per actor (`reviews_quarantine_item` vs `releases_quarantine_item`, `is_monitored_by_user_activity_log` vs `records_user_activity_log`, etc.). | User picks verb-per-actor; agent loads 1-3 user-edge rows per master after that. |

### Bucket 3, Phase 0 pending (speculative)

10 missing-entity candidates from prior audit unchanged (`dlp_sensitive_data_types`, `dlp_content_fingerprints`, `dlp_sensitivity_labels`, `dlp_policy_violations`, `dlp_enforcement_actions`, `dlp_forensic_evidence`, `dlp_alerts`, `dlp_dictionaries`, `dlp_egress_channels`, `dlp_breach_notifications`); 1 modularization proposal (Policy-vs-Runtime split or per-channel split); 3 regulation candidates (GDPR / HIPAA / PCI-DSS) with `applicability='mandatory'` (audit value `direct` corrected to the live enum per Rule #13). Vendor-knowledge basis: Microsoft Purview, Forcepoint, Broadcom, Trellix, Proofpoint, Code42, Netskope, Cyberhaven, Nightfall AI.

### Continuations from prior audits

The 2026-05-31 Continuation applied B1-S3 and B1-S5 (3 of 6 user-edges) plus 10 APQC `agent_curated` tags (handoffs 280, 282, 283, 284, 730, 260, 709, 821, 822, 832). This audit verifies those writes are live and carries forward the remaining items.

### Cross-bucket dependencies

- B1-S1 (M-band) blocks B1-S6, S9, S10, S11, S12, S13, S14, and the M8 module-grain catalog UX rollup.
- B2-S1 (module split topology) gates B1-S1.
- B2-S3 (lifecycle exemptions) gates B1-S6.
- B2-S5 (APQC bulk approval) gates B1-S16.
- B2-S6 (user-edge verbs) gates B1-S5b.
- A4 (B1-S17), B6 (B1-S4), B11 (B1-S7), B8 (B1-S15), APQC (B1-S16) can land in parallel with or before B1-S1.

### JWT errors

None encountered during this run.

## 2026-06-02 Audit (modularization)

### Summary

DLP was built from 0 `domain_modules` to 2 `full` modules under the recommended Policy-vs-Runtime split (B2-S1 option a). This is the M1-blocking build that every B-band, E-band, and F-band item was gated on. Scope of this pass: modules + capability links + data_object assignment ONLY, reusing existing entities. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. The catalog-wide single-master pre-check ran clean for all 6 DLP masters (none mastered elsewhere); only `employees` (31) is mastered elsewhere (HCM module 54) and is correctly assigned `consumer` here, not master.

Loader: `.tmp_deploy/modularize_dlp_2026-06-02.ts` (idempotent; module key = `domain_module_code`, DMC key = `(domain_module_id, capability_id)`, DMDO key = `(domain_module_id, data_object_id)`; re-read modules after insert for the code->id map). Run from project root. Safe to re-run (verified: second pass inserts nothing, no false master conflict).

### Module split

| Module (code) | id | Capabilities (codes) | Masters | Other roles |
|---|---|---|---|---|
| DLP-POLICY-CONTROL (Policy and Classification Control) | 231 | DLP-CLASSIFY (358), DLP-POLICY-ENGINE (359), DLP-FINGERPRINT (365) | dlp_policies (331), dlp_exceptions (334) | data_classifications (303) contributor/required |
| DLP-ENFORCEMENT-RUNTIME (Egress Enforcement and Incident Response) | 232 | DLP-EMAIL-EGRESS (360), DLP-ENDPOINT-AGENT (361), DLP-NETWORK-INLINE (362), DLP-CLOUD-API (363), DLP-INCIDENT-MGMT (364) | dlp_incidents (330), data_exfiltration_attempts (332), dlp_quarantine_items (333), dlp_user_activity_logs (335) | employees (31) consumer/required |

Rationale: POLICY-CONTROL is the authoring surface (what is sensitive, which policies and exceptions apply); ENFORCEMENT-RUNTIME is the runtime detection-and-response surface (egress channels, exfiltration events, incidents, quarantine, activity trail). Classification feeds policy authoring (contributor); employees are referenced in the runtime incident context (consumer).

### Master -> module mapping (each master once, in-domain and catalog-wide)

- dlp_policies (331) -> DLP-POLICY-CONTROL (231) master
- dlp_exceptions (334) -> DLP-POLICY-CONTROL (231) master
- dlp_incidents (330) -> DLP-ENFORCEMENT-RUNTIME (232) master
- data_exfiltration_attempts (332) -> DLP-ENFORCEMENT-RUNTIME (232) master
- dlp_quarantine_items (333) -> DLP-ENFORCEMENT-RUNTIME (232) master
- dlp_user_activity_logs (335) -> DLP-ENFORCEMENT-RUNTIME (232) master

No master demoted to embedded_master: all 6 were unmastered catalog-wide before this pass.

### Counts

- domain_modules created: 2 (both `module_kind=full`, `record_status=new`).
- domain_module_capabilities: 8 (3 on 231, 5 on 232). All 8 DLP capabilities placed (M4 satisfied); every module realizes >=1 capability (M6).
- domain_module_data_objects: 8 (3 on 231, 5 on 232). 6 master + 1 contributor + 1 consumer. Roles and necessity preserved verbatim from legacy `domain_data_objects`. `notes` empty on every row (R15). No empty module.
- Structural rules satisfied: Rule #14 (>=3 caps => >=2 full modules), M4, M6, M7 (single-master in-domain AND catalog-wide).

### Deferred gaps (out of scope for this modules-only pass)

The 2026-05-31 audit's downstream items are now unblocked by the existence of modules 231/232 but were NOT actioned here (entity/relationship/skill/handoff creation is out of scope):

- B12 lifecycle states for the 4 workflow-bearing masters (dlp_incidents, dlp_policies, dlp_quarantine_items, dlp_exceptions); B2-S3 still governs the config-shape exemption for data_exfiltration_attempts and dlp_user_activity_logs. The `domain_module_id` realization column can now be set (231/232 exist).
- F1/F2/F3 per-module system skills (Rule #17): retire legacy skill 50 (domain-level, domain_module_id=NULL), author dlp_policy_control_agent (231) + dlp_enforcement_runtime_agent (232), migrate the 6 query skill_tools, add >=1 mutate/master, >=1 side_effect/module, >=1 inbound.
- B10b handoff module-FK backfill (8 outbound + 10 inbound), now that source/target module ids are resolvable.
- B9 missing handoffs (6 events) and B9b intra-domain handoffs (dlp_policy.activated, dlp_incident.detected, dlp_exception.approved) now modellable across 231<->232.
- E-band roles/role_modules/role_permissions (DLP-ADMIN, DLP-INCIDENT-RESPONDER, SECURITY-ANALYST).
- B6 intra-domain master relationships, B7 remaining 3 user-edges, B8 outbound cross-domain relationships, B11 aliases.
- A4/M8 catalog UX copy (domains.catalog_tagline/description empty; module-grain taglines/descriptions also empty), Rule #20 buyer-voice draft-then-confirm loop.
- B3 missing-master candidates (10) still pending vendor vet: dlp_sensitive_data_types, dlp_content_fingerprints, dlp_sensitivity_labels, dlp_dictionaries, dlp_egress_channels, dlp_breach_notifications (-> POLICY-CONTROL 231); dlp_policy_violations, dlp_enforcement_actions, dlp_forensic_evidence, dlp_alerts (-> ENFORCEMENT-RUNTIME 232).

### JWT errors

None encountered during this run.

## 2026-06-05 - b1a execution

Executed the agent-solvable b1a items against the live `domain_map` module (DLP, domains.id=139, modules 231 DLP-POLICY-CONTROL / 232 DLP-ENFORCEMENT-RUNTIME). Loader: `.tmp_deploy/dlp_b1a_exec_2026_06_05.ts` (idempotent by natural key; `record_status` omitted on every insert; no `notes` column written with content). No JWT errors.

### DONE

- **B1A-MOD-BUILT** - no-op marker. Dropped from state.yaml. No regression (modules 231/232 live, 8 DMDO, 8 capabilities all intact).
- **B1A-S9-S10-PER-MODULE-SKILLS** (Phase S, Rule #17, F1/F2/F3/F4/F7).
  - tools: created 4 mutate tools (`operation_kind=mutate`, `coverage_tier=platform`): `update_dlp_policy` (data_object_id=331), `approve_dlp_exception` (334), `update_dlp_incident_status` (330), `release_dlp_quarantine_item` (333).
  - skills: created 2 system skills - `dlp_policy_control_agent` (id 279, domain_id=139, domain_module_id=231), `dlp_enforcement_runtime_agent` (id 280, domain_id=139, domain_module_id=232). NOTE: platform still enforces `domain_id` NOT NULL on `skill_type=system` (legacy `domain_required_when_skill_type_is_system` rule) - both `domain_id` and `domain_module_id` must be set on a per-module system skill; setting only `domain_module_id` fails with `(23514) A domain_id is required when skill_type is system.`
  - skill_tools: 16 rows. Skill 279 (7): query_dlp_policies(req), query_dlp_exceptions(req), update_dlp_policy(req), approve_dlp_exception(req), query_data_classifications(opt), notify_team(opt), receive_webhook(opt). Skill 280 (9): query_dlp_incidents(req), query_data_exfiltration_attempts(req), query_dlp_quarantine_items(req), query_dlp_user_activity_logs(req), update_dlp_incident_status(req), release_dlp_quarantine_item(req), notify_team(req), receive_webhook(req), query_employees(opt). F4 verified: query/mutate carry data_object_id, side_effect/inbound carry NULL. F7: used the `notify_team` abstraction (id 914), not a channel primitive; reused generic `receive_webhook` (id 896) rather than minting a DLP-specific clone (Rule #9 dedup / channel-vs-capability).
  - DELETE (snapshot for reversibility): legacy domain-level system skill **50** (`dlp-system`, skill_type=system, domain_id=139, domain_module_id=NULL) and its 6 skill_tools rows (ids 478-483 -> tools 412 query_dlp_incidents, 413 query_dlp_policies, 414 query_data_exfiltration_attempts, 415 query_dlp_quarantine_items, 416 query_dlp_exceptions, 417 query_dlp_user_activity_logs, all requirement_level=required). The 6 query tools themselves were NOT deleted (catalog-wide, re-linked on the new module skills). F1 now passes (no legacy domain-level system skill remains).
- **B1A-S11-HANDOFF-MODULE-FKS** (B10b) - PARTIAL (outbound done; inbound has no candidate).
  - Outbound: PATCH `source_domain_module_id=232` on all 8 outbound handoffs (ids 280, 281, 282, 283, 284, 843, 844, 845; prior value NULL on all). Deterministic: every outbound DLP event fires on a master held by module 232 (dlp_incidents 330, data_exfiltration_attempts 332, dlp_user_activity_logs 335). No outbound event fires on a 231-mastered object, so none resolve to 231.
  - Inbound (10 handoffs: 260, 264, 690, 702, 709, 730, 821, 822, 832, 847): `target_domain_module_id` left NULL. The deterministic B10b rule is "module holding the payload with strongest role", and DLP models NONE of the 10 inbound payloads (data_assets, data_access_policies, bi_dashboards, nocode_views, data_domains, sink_connectors, content_documents, document_classifications, chat_messages, data_warehouses) - zero `domain_module_data_objects` rows on any of them. This is B10b "no candidate" sub-case 2. The b1a action's softer "map to 231/232 per payload semantics" requires inventing a semantic classification per payload, which is judgment beyond a deterministic derivation; per the no-guessing-on-master-data rule the inbound side is left NULL and reported as a gap (upstream fix: load `consumer` DMDO rows on the receiving module, then re-run the backfill). Kept open in state.yaml as B1A-S11 (inbound only).
- **B1A-S17-A4-M8-CATALOG-UX** (Rule #20) - wrote buyer-voice copy straight into the EMPTY fields (empty-guard per field; no overwrite of non-empty values; not parked in history). All three rows previously had `catalog_tagline=''` and `catalog_description=''`.
  - domains 139: catalog_tagline + catalog_description written.
  - domain_modules 231: catalog_tagline + catalog_description written.
  - domain_modules 232: catalog_tagline + catalog_description written.
  - The full copy lives in the records (state `new`; the user reviews in the catalog UI per Rule #20).
- **B1A-S4-B6-INTRA-MASTER-RELS** (B6) - inserted 5 intra-domain `data_object_relationships` (record_status=new):
  - 2027: data_exfiltration_attempts(332) `triggers` / `is_triggered_by` dlp_incidents(330), one_to_many reference, owner_side=source.
  - 2028: dlp_policies(331) `evaluates_against` / `is_raised_by` dlp_incidents(330), one_to_many reference, owner_side=source.
  - 2029: dlp_incidents(330) `produces` / `is_produced_by` dlp_quarantine_items(333), one_to_many composition, owner_side=source (incident owns the held artifact).
  - 2030: dlp_exceptions(334) `overrides` / `is_overridden_by` dlp_policies(331), one_to_many reference, owner_side=target (policy is the parent).
  - 2031: dlp_user_activity_logs(335) `records` / `is_recorded_in` dlp_incidents(330), many_to_many reference, owner_side=source.
- **B1A-S15-B8-OUTBOUND-CROSS-RELS** (B8 outbound) - inserted 2 cross-domain `data_object_relationships` (record_status=new):
  - 2032: dlp_incidents(330) `informs_security_incident` / `is_informed_by_dlp_incident` service_incidents(47, ITSM/SECOPS), one_to_many reference, owner_side=source.
  - 2033: dlp_incidents(330) `triggers_privacy_review` / `is_triggered_by_dlp_incident` data_subject_requests(901, PRIV-MGMT), one_to_many reference, owner_side=source.
  - The b1a finding also named `escalates_to_iga_review` (-> an IGA-side entity implied by the IGA consumer DMDO) and `dlp_user_activity_logs feeds_sod_review` (-> IGA-SOD-MGMT). Both lack a concrete, named target master in the action text (IGA entity unidentified), so they were NOT authored to avoid guessing the target data_object. The B8 item is resolved for the two clean, named edges; the two IGA-side edges are dropped from the actionable list pending a named target (no deterministic target exists).

### SKIPPED (blocked by user_decision)

- **B1A-S6-B12-LIFECYCLE-STATES** - blocked_by user_decision B2-S3 (config-shape exemption for data_exfiltration_attempts / dlp_user_activity_logs). Not executed.
- **B1A-S14-E-BAND-ROLES** - blocked_by user_decision B2-S4 (business-function ownership: single owner vs split with Privacy Office). Not executed.
- **B1A-S16-APQC-MISSING-7** - blocked_by user_decision B2-S5 (APQC bulk approval / L3-vs-L4 anchor choice for the 7 remaining handoff_processes proposals). Not executed.

### Prior values snapshot (for the DELETE / PATCH reversibility)

- skill 50: `{id:50, skill_name:"dlp-system", skill_type:"system", domain_id:139, domain_module_id:null}`; skill_tools 478->412, 479->413, 480->414, 481->415, 482->416, 483->417 (all requirement_level=required). All deleted.
- handoffs 280/281/282/283/284/843/844/845: `source_domain_module_id` was NULL on all 8 before PATCH (now 232). `target_domain_module_id` untouched (281=148, 843=38, 845=146 were already set by other domains; 280/282/283/284/844 remain NULL = those target domains' B10b).
- domains 139 / domain_modules 231 / domain_modules 232: `catalog_tagline=''` and `catalog_description=''` before the write.

### Verification (re-queried post-load)

- system skills on 231/232: exactly 2 (279 on 231, 280 on 232). F2 satisfied.
- skill_tools on the 2 skills: 16. F3 satisfied (required floor query+mutate+side_effect+inbound met).
- legacy skill 50 remaining: 0. F1 satisfied.
- outbound handoffs with NULL source module: 0 (was 8).
- inbound handoffs with NULL target module: 10 (unchanged - no DLP-held payload; gap report).
- data_object_relationships touching DLP masters: 13 total (was 6: 304, 595, 596, 1786, 1787, 1788; +7 new 2027-2033).
- catalog UX non-empty: domains 139 (tagline+desc), modules 231 + 232 (tagline+desc each).

### JWT errors (b1a execution)

None encountered during this run.

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

---

## 2026-06-13 - B9d handoff-payload realization (B1A-B9D-VERIFY resolved)

Ran `scripts/analytics/b9d_resolver.ts DLP` in BOTH directions (the B9d band's per-domain
entry point). B1A-B9D-VERIFY is RESOLVED and dropped from state.yaml. No catalog/database
writes; only local audit files edited. No JWT errors.

### Resolver output

- 11 boundary tags -> 9 distinct (process, owner) findings.
- Verdicts: 4 ORPHAN, 2 ROLL-UP/RE-TAG, 2 MIS-TAG, 1 UNOWNED.

| Verdict | Process (pid) | Owner | Payload(s) | Handoff(s) |
|---|---|---|---|---|
| ORPHAN | 13.6 "Manage Content" (83) | ECM (unbuilt) | content_documents | 821 ECM->DLP |
| ORPHAN | 13.6.5 "Develop and manage content" (428) | ECM (unbuilt) | document_classifications | 822 ECM->DLP |
| ORPHAN | 8.3.3.2 "Analyze IT security threat impact" (1164) | DLP (unbuilt) | dlp_incidents, data_exfiltration_attempts | 280, 284 DLP->SECOPS |
| ORPHAN | 8.3.5.4 "Review and monitor physical and logical IT data security measures" (1179) | WSC (unbuilt) | chat_messages | 832 WSC->DLP |
| ROLL-UP | 8.3.3 "Control IT risk, compliance, and security" (268) | DLP | dlp_incidents | 282 DLP->SECOPS |
| ROLL-UP | 8.3.5 "Develop and manage IT security, privacy, and data protection" (270) | DLP | dlp_incidents | 283 DLP->PRIV-MGMT |
| MIS-TAG | 2.1.4.10 "Review and approve data access requests" (557) | DCG | data_access_policies | 264 DCG->DLP |
| MIS-TAG | 8.4.1.2 "Establish data, information, and analytic governance" (1203) | DCG | data_assets, data_domains | 260, 709 DCG->DLP |
| UNOWNED | 8.3.5 (270) | (no master) | sink_connectors | 730 DI->DLP |

### Applied (additive, local audit files only; record_status untouched)

- **DLP** (this domain masters the payload): new b2 item `B2-B9D-OWN-1164` ("Analyze IT
  security threat impact") in state.yaml + q11 in q-DLP.md.
- **ECM** (owner): `B2-B9D-OWN-83` + `B2-B9D-OWN-428` written into ECM's state.yaml + q-ECM.md
  (state.yaml hygiene carve-out (b) - writing a b2 + q into the OWNER domain).
- **WSC** (owner): `B2-B9D-OWN-1179` written into WSC's state.yaml + q-WSC.md.

### Surfaced for sign-off (destructive / judgment; NOT applied, Rule #21)

- ROLL-UP re-point (source DLP): 8.3.3 -> 8.3.3.2 on handoff 282; 8.3.5 -> 8.3.3.2 on
  handoff 283. Both edit DLP-authored handoff_processes tags - need user sign-off.
- MIS-TAG (sender DCG): 2.1.4.10 -> 8.4.4.4 (or delete) on 264; 8.4.1.2 -> 8.4.4.1 (or
  delete) on 260/709. DCG authored these tags - surfaced for DCG-side arbitration.
- UNOWNED dependency: 8.3.5 on handoff 730 (DI->DLP) carries `sink_connectors`, which has
  no master row anywhere in the catalog. Surfaced on the sender (DI); not dropped.

### Net state

B1A-B9D-VERIFY resolved. The only new open item on DLP is `B2-B9D-OWN-1164` (a user
decision, q11). All remaining b1a are still blocked on B2-S3 / B2-S4 / B2-S5 or the upstream
DMDO load (inbound B1A-S11). Status remains feedback_needed; next_action_by stays user.

### JWT errors

None encountered during this run.
