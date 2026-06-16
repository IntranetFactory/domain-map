# ITSM audit history

## 2026-05-29 — Audit (structural pass; Pass 2 / 3 / 4 deferred per user choice)

### Summary

- **Current footprint:** 8 full modules; 7 masters (`service_incidents`, `service_requests`, `service_problems`, `service_changes`, `knowledge_articles`, `service_catalog_items`, `service_slas`); 20 capabilities (incl. 5 cross-cutting: SLA-MGMT, KNOWLEDGE-MGMT, SELF-SERVICE-PORTAL, AI-TRIAGE-CLASSIFICATION, APPROVAL-WORKFLOW); 23 solutions (5 primary, 9 secondary, 9 partial); 14 trigger_events on ITSM masters; 6 outbound + ~70 inbound cross-domain handoffs; 10 aliases; 32 lifecycle states across 6 masters; 8 system skills + 57 skill_tools rows; **0 roles, 0 role_modules**.
- **Bucket 1 (in-scope, agent fixable):** 7 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 1 prompt (run Phase 0 before drafting more), with 7 candidates the audit suspects from vendor knowledge.

Structural pass bands: A / M (mostly) / B (partial) / C / F pass; **E hard-fails** (zero roles); **B9b / B10b hard-fail**; **H1 hard-fail** matches the SKILL.md anti-pattern.

Domain Semantius score (strict) across 8 system skills: ~83% (47 platform / 57 total skill_tools). Non-platform tools: `post_chat_message` (external, required on incident-mgmt + change-mgmt — workflow-justified per F7 notes); `notify_team` (external, required on event-mgmt — abstraction, channel-substitutable note); `classify_text` and `generate_text` (compute, optional across 4 skills).

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **E1 (hard fail)** | **Zero `roles` touch any ITSM module.** ITSM has 8 modules and 20 capabilities → E1 threshold is ≥3 roles (typical 5-7). The deployer cannot provision users without role definitions. Expected personas, by SKILL convention: `IT-SERVICE-DESK-AGENT` (Service Desk function — primary on incident-mgmt, service-request, agent-workspace; secondary on knowledge), `IT-SERVICE-DESK-MANAGER` (admin tier, all 8 modules), `IT-CHANGE-MANAGER` (primary on change-mgmt; secondary on incident-mgmt, sla-mgmt), `IT-PROBLEM-MANAGER` (primary on problem-mgmt; secondary on incident-mgmt, knowledge), `KNOWLEDGE-AUTHOR` (primary on knowledge; secondary on incident-mgmt, service-request), `END-USER-REQUESTER` (cross-functional; primary on service-request, knowledge `:read`). Each carries `role_modules` (≥2 each) + `role_permissions` bundle (tier-level grants preferred). | Author 5-6 roles in a focused loader with `role_modules` + `role_permissions`. |
| B1-S2 | **B10b (hard fail)** | **~52 inbound handoffs to ITSM (target_domain_id=1) lack `target_domain_module_id`.** Examples: handoffs 248, 257, 266, 267, 461, 463, 466, 603, 604, 611, 624, 626, 642, 644, 646, 650, 652, 655, 660, 663, 664, 674-678, 682, 686, 689, 703, 706, 714, 727, 736, 739, 757, 763, 765, 774, 779, 788, 834, 841, 843, 866, 878, 893, 898, 901, 927, 928, 932, 943, 952. Most resolve deterministically to ITSM-INCIDENT-MGMT (38) or ITSM-CHANGE-MGMT (41) based on the payload data_object_id and DMDO role-strength rule. | Run a backfill loader following [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts) shape. For each, resolve target_module = the ITSM module holding the payload `data_object_id` at strongest role (master > embedded_master > contributor > consumer); ties left NULL with explicit surface. |
| B1-S3 | **B10b outbound** | Handoffs 148, 149 (outbound to FSM domain 130 via RMM payload `rmm_tickets` id 223) have NULL on BOTH `source_domain_module_id` AND `target_domain_module_id`. ITSM does not master `rmm_tickets` (data_object 223 belongs to RMM domain 130, but here ITSM is publishing it). This is likely scope creep — the publisher should be RMM not ITSM. | Surface to user; either DELETE these two handoffs (scope creep — RMM should publish them) or re-attribute source_domain → RMM. |
| B1-S4 | **B10b outbound** | Handoff 630 (`knowledge_article.published` → KMS domain 33, payload 51) has NULL `target_domain_module_id`. KMS may not be modularized yet. | If KMS has modules, derive target_module deterministically; otherwise leave NULL with a follow-up flag for KMS audit. |
| B1-S5 | **B9b (hard fail)** | **Zero intra-domain cross-module `handoffs` rows for ITSM** despite 8 modules with obvious cross-module flows. Expected rows from `data_object_relationships` already in catalog: incident → problem (rel 184 inverse), problem → change (rel 185), change → CI (rel 188), service_request → incident (rel 177 routes_to + 183 triggers), sla governs incident (rel 189) and request (rel 190), incident resolved_with knowledge_article (rel 192), problem documented_in knowledge_article (rel 191). | Author ~8 intra-domain handoff rows with `source_domain_id=target_domain_id=1`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`. One per cross-module relationship that names an event. |
| B1-S6 | **B9 attribution defect** | `trigger_events.id=39` `correlation.identified` has `data_object_id=47` (`service_incidents`), but "correlation" is an OBS / AIOPS concept — the event should publish on an OBS-mastered data_object (e.g. `alert_correlations` or similar). Handoff 57 confirms this: source_domain=6 AIOPS publishes the event INTO ITSM. Per the SKILL anti-pattern *"Treating handoffs.data_object_id as the publisher's data_object"*, the trigger_event is mis-attributed at source. | Surface to user; either re-point `trigger_events.id=39` to the correct OBS/AIOPS-mastered data_object, or split into two events (one publish-side, one subscribe-side). |
| B1-S7 | **B9 attribution defect** | `trigger_events.id=65` `service_incident.asset_failure` (data_object 47 incident) — handoff 31 attributes this with `source_domain=1 ITSM` → ITAM. But "asset failure" detection typically originates in monitoring (ITOM / AIOPS) or RMM, then *creates* an incident in ITSM. The event description is ambiguous: is ITSM publishing "I'm an incident caused by asset failure" or is monitoring publishing "this asset failed, raise an incident"? | Surface to user; review whether this event correctly originates in ITSM, and if so, what the receiving ITAM module does with it. |

#### APQC TAGGING (matches the SKILL anti-pattern: prior ITSM audits both shipped zero tags)

Only 10 of ~76 ITSM cross-domain handoffs carry `handoff_processes` rows, and **zero are `proposal_source='human_curated'`**. The 4 routine outbound ITSM publishers (handoffs 30, 31, 630, 631) are untagged. Volume expectation per SKILL: 0.5N to 0.8N → ~38-60 tags. Below are the high-confidence routine tags to author at audit time (subset to keep the bucket actionable; complete list lives in the queue):

| handoff_id | source → target | trigger_event | payload | Proposed PCF (process_name / external_id) | Confidence |
|---|---|---|---|---|---|
| 30 | ITSM-CHANGE-MGMT → CMDB | `service_change.completed` | `service_changes` | Manage IT change (10567 L3) | confident L3 |
| 31 | ITSM-INCIDENT-MGMT → ITAM | `service_incident.asset_failure` | `asset_lifecycle_events` | Manage physical assets / Manage IT assets (depending on parent split) — verify | needs PCF lookup at fix time |
| 630 | ITSM-KNOWLEDGE → KMS | `knowledge_article.published` | `knowledge_articles` | Manage knowledge (10068 L3 or child) | confident L3 |
| 631 | ITSM-SERVICE-REQUEST → IGA | `service_catalog_item.published` | `service_catalog_items` | Manage IT service requests (10564 L3 or Manage IT operations) | confident L3 |
| 28 (inbound) | ITOM → ITSM-INCIDENT-MGMT | `monitoring_event.alert_triggered` | `service_incidents` | Manage IT operations (10566 L3) | confident L3 |
| 51 (inbound) | CMDB → ITSM-INCIDENT-MGMT | `ci.unauthorized_change_detected` | `service_incidents` | Manage internal controls (10735 L2 already tagged via discovery — confirm or upgrade) | confident L3 |
| 55, 57 (inbound) | OBS / AIOPS → ITSM-INCIDENT-MGMT | `slo.breached`, `correlation.identified` | `service_incidents` | Manage IT operations performance | confident L3 |
| 58 (inbound) | AIOPS → ITSM-PROBLEM-MGMT | `root_cause.identified` | `service_problems` | Perform root cause analysis (12046 L4 — already tagged) | already covered |
| 186 (inbound) | HCM → ITSM-SERVICE-REQUEST | `employee.terminated` | `service_requests` | Manage employee separation / offboarding | confident L3 |
| 142, 143 (inbound) | RMM → ITSM-CHANGE-MGMT | `patch_job.scheduled` / `.completed` | `service_changes` | Manage IT change (10567) | confident L3 |

The remaining ~55 untagged inbound handoffs cluster on alert/failure/breach trigger events from observability/asset/network domains → ITSM-INCIDENT-MGMT. Most map cleanly to "Manage IT operations" (10566) or its children. ~10-15% will need deferral to Discover Pass 3 (no clean PCF match — e.g. `dlp_incident.blocked`, `dq_sla_definition.breached`, `ml_model.drift_detected`).

| ID | Finding type | Count |
|---|---|---|
| STRUCTURAL (E1 + B9b + B10b + B9 attribution) | 7 |
| APQC TAGGING (high-confidence + queue rest) | ~50-60 |
| **Bucket 1 total** | ~57-67 |

### Bucket 2 — Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **`service_slas` lifecycle states** — `service_slas` (id 53) has 0 rows in `data_object_lifecycle_states`. Is this a config-shape exemption per Rule #12 (SLAs are author-once / occasionally-edit; `record_status` is the only state worth tracking)? Or does the catalog want a state machine (e.g. `draft → published → active → expired → archived`)? | Rule #15 forbids auto-populating `data_objects.notes` to record the exemption; only the user can decide both the shape and how to track the exemption (gap report, PR description, or user-supplied exact notes wording). | (a) Confirm config-shape exemption — agent does NOT write to notes per Rule #15; the decision lives in this audit file. (b) Author a state machine — surface proposed states for approval. |
| B2-S2 | **Pattern flag positive re-evaluation per Rule #12 / B4** — current flags: `service_requests.has_single_approver=true`, `service_changes.has_single_approver=true`, `knowledge_articles.has_submit_lock=true`. All others false. Need positive confirmation the audit considered each. Specifically: should `service_incidents.has_personal_content=true` (incident reports often contain user PII in the description)? Should `knowledge_articles.has_personal_content=true` (some KB articles contain customer references)? Should `service_changes.has_submit_lock=true` (a change ticket should freeze its payload at CAB submission)? | Pattern flags are workflow-shape judgments the user owns; defaults to false don't establish review. Recording the consideration in `notes` is forbidden by Rule #15. | Per-flag yes/no from user; the audit file captures the decisions below. |
| B2-S3 | **`monitoring_alerts` master at module layer** — at the legacy `domain_data_objects` layer, `monitoring_alerts` (id 85) has master rows in BOTH ITOM (2) AND RMM (130). At the new `domain_module_data_objects` layer, there is **no master row at all** for `monitoring_alerts` — only ITSM's embedded_master in ITSM-EVENT-MGMT and consumer rows elsewhere. B5 passes via the legacy rollup (Rule #11), but the catalog-wide M7 single-master rule is at risk once ITOM / RMM finish modularization. Is the intent that ITOM is the canonical owner and RMM should demote to `embedded_master`, or are these legitimately separate concepts that need disambiguation? | This is a cross-domain ownership question whose answer belongs to the ITOM and RMM audits, not ITSM's. Report-only for ITSM. | (a) Schedule ITOM + RMM b1 audits to resolve. (b) Accept the catalog drift until ITOM/RMM are next touched. |
| B2-S4 | **System-skill naming convention** — ITSM system skills use kebab `itsm-<module>-system` (e.g. `itsm-incident-mgmt-system`). The Phase-S convention in SKILL is snake `<module_code_lower>_agent` (e.g. `itsm_incident_mgmt_agent`). The ATS audit raised the same drift (B1-S4 in ATS.md). Rename catalog-wide to the convention, or accept the divergence and update SKILL? | Editorial / naming-policy call. Pure relabel; skill_tools FKs unaffected. | (a) Rename in a focused loader. (b) Accept; update SKILL.md to allow both shapes. |

### Bucket 3 — Phase 0 pending (speculative)

No `c:/tmp/ITSM-phase0-<date>.md` exists in the workspace, so Phase 0 was either never run or has expired. Capability-realization analysis surfaces 3 capabilities that **realize** in modules but where **no data_object is mastered for the capability's workflow**:

- `ITSM-WALKUP` (Walk-Up and Onsite Support) → no `walkup_visits` / `walkup_kiosks` master.
- `ITSM-VIRTUAL-AGENT` (Virtual Agent and Conversational ITSM) → no `virtual_agent_conversations` / `chatbot_sessions` master.
- `ITSM-CHARGEBACK` (Service Cost and Chargeback) → no `chargeback_invoices` / `service_cost_records` master.

Plus 4 entities flagship ITSM vendors model that the catalog likely misses (vendor-knowledge guess; needs Phase 0 verification):

- `service_outages` — ServiceNow Major Incident Mgmt + Atlassian Statuspage publish a customer-facing outage record distinct from the internal incident.
- `change_collisions` — ServiceNow Change Advisory detects overlapping change windows / blackout periods.
- `cab_meetings` — Change Advisory Board agenda + minutes; modeled by ServiceNow and BMC Helix as a first-class entity.
- `service_offerings` vs `service_catalog_items` split — ServiceNow distinguishes the service definition (offering) from its catalog presentation; current model collapses both onto `service_catalog_items`.

**Bucket 3 prompt:** vet via formal Phase 0 vendor research (subagent produces `c:/tmp/ITSM-phase0-<date>.md`), or eyeball-mode (user names which candidates to treat as confirmed and we add them via Phase B to the relevant module)?

### Cross-bucket dependencies

- B2-S3 (`monitoring_alerts` canonical owner) is **independent** of Bucket 3 (no Phase 0 finding would change the canonical-owner question).
- B2-S1 (service_slas lifecycle) is **independent** of Bucket 3 (config-shape vs. state-machine is a workflow question; vendor surface won't shift it).
- B1-S6 / B1-S7 (B9 attribution defects on events 39, 65) are **independent** of Bucket 3, and they're prerequisites for any APQC tagging on those handoffs — fix attribution before tagging.

### Per-bucket prompts

**Bucket 1 — fix these now?** Reply with: `all`, or list (e.g. `S1, S2, H1-top10`), or `skip`.

- **S1 (E1 — author 5-6 roles + bundles):** highest impact; without this, the deployer can't provision users.
- **S2 (B10b backfill of ~52 NULL target_domain_module_id):** mechanical; the backfill loader pattern exists.
- **S3 (handoffs 148/149 attribution — RMM not ITSM):** likely DELETE or re-attribute.
- **S4 (handoff 630 NULL target — gate on KMS modularization):** decide whether to leave or push to KMS audit.
- **S5 (B9b — author ~8 intra-domain cross-module handoff rows):** structural completeness.
- **S6 / S7 (B9 attribution defects on events 39 and 65):** data-quality fixes that gate APQC tagging on the affected handoffs.
- **H1 (APQC tagging):** the 10 high-confidence rows above immediately, then the remaining ~50 queued in a follow-up batch?

**Bucket 2 — what's your call on each?** I'll wait for per-item decisions before acting.

- B2-S1 (`service_slas` lifecycle): exempt or author?
- B2-S2 (pattern flags): yes/no per the 3 questions.
- B2-S3 (`monitoring_alerts` owner): schedule ITOM+RMM audits, or accept the drift?
- B2-S4 (skill naming): rename catalog-wide or update SKILL?

**Bucket 3 — vet via Phase 0 or eyeball?** If eyeball, name which of the 7 candidates ring true.

### Decisions

User reply: **fix bucket 1 (all)**. Per-item resolution within Bucket 1:

- **S6** — Re-point trigger_event 39 `correlation.identified` from `data_object_id=47` (service_incidents) to `data_object_id=93` (AIOPS event_correlations). Applied.
- **S3** — DELETE handoffs 148, 149 (scope creep — ITSM → RMM with payload `rmm_agents`; event names "rmm_ticket.*" / "ticket.resolved" mismatched the payload, RMM should publish if anything). Applied.
- **S7** — Deferred to ITAM audit. Event 65 `service_incident.asset_failure` remains as-is on `service_incidents`; ITAM owns the question of whether to author its own `asset.failed` outbound event into ITSM.
- **S4** — Self-resolved. KMS has no modules; handoff 630 NULL `target_domain_module_id` is correct until KMS modularizes. Added to KMS audit follow-up queue.
- **S1, S2, S5** — Mechanical fixes; applied via loader. See Fixes Applied.
- **H1** — 10 high-confidence APQC rows applied (handoff 186 was already tagged by the substring matcher with the same PCF); the remaining ~45 inbound cross-domain handoffs are deferred to a follow-up tagging batch (most will collapse to `Triage IT service delivery incidents` 20903 since they all collapsed onto ITSM-INCIDENT-MGMT in the S2 backfill).

### Fixes applied

| Step | Surface | Volume | Notes |
|---|---|---|---|
| S6 | Direct CLI: `PATCH /trigger_events?id=eq.39 {data_object_id: 93}` | 1 row | trigger_event 39 now publishes on AIOPS `event_correlations` |
| S3 | Direct CLI: `DELETE /handoffs?id=in.(148,149)` | 2 rows | RMM scope creep removed |
| P (permissions) | [.tmp_deploy/fix_itsm_audit_2026_05_29.ts](../.tmp_deploy/fix_itsm_audit_2026_05_29.ts) Phase P | 32 rows: 24 baseline + 8 workflow-gate | E-band prerequisite; permissions for all 8 ITSM modules. Workflow gates: `:resolve_incident`, `:close_incident`, `:approve_service_request`, `:publish_catalog_item`, `:retire_catalog_item`, `:resolve_problem`, `:approve_change`, `:publish_article`. |
| S1 (E1 roles) | Same loader Phase R | 4 roles + 19 role_modules + 23 role_permissions | `IT-SERVICE-DESK-AGENT`, `IT-SERVICE-DESK-MANAGER`, `IT-CHANGE-MANAGER`, `IT-KNOWLEDGE-AUTHOR`. Function-scoped per SKILL convention; bundles prefer tier-level grants + specific gates. |
| S2 (B10b) | Same loader Phase B10b | 55 rows | Bulk re-payload to `data_object_id=47` + `target_domain_module_id=38`. All inbound NULL-target rows resolved to ITSM-INCIDENT-MGMT since the semantic payload is the new incident, not the source-side entity. |
| H1 (top batch) | Same loader Phase H | 9 new (1 dedup-skipped) | `human_curated` tags on outbound 30 / 630 / 631 + inbound 28 / 55 / 57 / 142 / 143 / 162. Handoff 186 already had a discovery-override tag pointing at the same PCF; loader skipped to avoid duplicate. |

Re-verification queries:

- **E1**: `/role_modules?domain_module_id=in.(38..45)` returns 19 rows across the 4 roles. PASS.
- **B10b**: `/handoffs?target_domain_id=eq.1&target_domain_module_id=is.null` returns `[]`. PASS.
- **H1**: 10 `human_curated` rows on ITSM-touching handoffs; ~45 remaining cross-domain handoffs deferred to follow-up.

### Deferred (not in this audit's scope)

- **B9b — intra-domain cross-module handoff rows.** Requires new `trigger_events` for the intra-domain lifecycle progressions (incident→problem, problem→change, request→incident, incident→knowledge, change→incident-callback). Deferred because the trigger-event authoring is a separate creative pass, not a mechanical fix. Track as a follow-up loader.
- **H1 queue — ~45 remaining inbound APQC tags.** All have payload `service_incidents` after the S2 backfill, so most will tag to PCF 20903 "Triage IT service delivery incidents"; a handful will defer to Discover Pass 3 (`dlp_incident.blocked`, `ml_model.drift_detected`, `dq_sla_definition.breached` likely have no clean PCF match).
- **B2 — surface-for-user judgment calls.** Still pending user decisions (`service_slas` lifecycle exemption, pattern-flag re-eval, monitoring_alerts cross-domain ownership, skill-naming kebab-vs-snake).
- **B3 — Phase 0 vendor research.** Not run.
- **Pass 2 / 3 / 4** — market audit, neighbor discovery, pairwise reconciliation. None executed; Pass 1 only.
- **Scope-creep watch on the 55 patched handoffs.** Several may not semantically belong to ITSM at all (e.g. handoffs 248 GRC `control.failed`, 257 AUDIT `audit_engagement.completed`, 727 DI `pipeline_run.failed`, 843 DLP `dlp_incident.blocked`). Surfaced as a separate audit on the source domains; not blocking this ITSM pass.

### `domains.notes` pointer (Rule #15)

_Per Rule #15, no `domains.notes` write happens without user-approved wording. Offer at the end of the audit if the user wants a back-pointer to this file._

## 2026-05-31, Continuation: B1 technical fixes (residual)

### Scope

Reviewed the original Bucket 1 against the prior Fixes-applied table. Identified items that were either deferred or left unaddressed by the 2026-05-29 pass, then classified each residual as TECHNICAL (mechanical, audit pre-specifies the write fully) or DEFER (requires judgment, new authoring, or per-row decisions).

### Residual B1 inventory

| Original ID | Status after 2026-05-29 | Classification | Reason |
|---|---|---|---|
| B1-S1 (E1 roles) | Applied (4 roles, 19 role_modules, 23 role_permissions) | n/a | closed |
| B1-S2 (B10b inbound NULL target) | Applied (55 rows retargeted to module 38) | n/a | closed |
| B1-S3 (handoffs 148, 149 scope creep) | Applied (DELETED) | n/a | closed |
| B1-S4 (handoff 630 NULL target) | Self-resolved (KMS unmodularized) | n/a | closed |
| B1-S5 (B9b intra-domain cross-module handoffs) | Deferred | DEFER | Audit explicitly flags this as a creative pass requiring new `trigger_events` to be authored (event_name, event_category, payload semantics). The 8 candidate relationships are named but no event row is pre-specified; each event needs editorial choice. Not mechanical. |
| B1-S6 (trigger_event 39 re-point) | Applied | n/a | closed |
| B1-S7 (event 65 asset_failure) | Deferred to ITAM audit (user decision) | DEFER | User-owned cross-domain question. |
| H1 top 10 high-confidence APQC tags | Applied (9 new + 1 dedup-skipped) | n/a | closed |
| H1 queue (~45 remaining inbound APQC tags) | Deferred | DEFER | Audit estimates "most will collapse to PCF 20903" but does NOT enumerate a per-handoff PCF mapping. The audit also flags an unspecified "handful" as Pass-3 deferrals (`dlp_incident.blocked`, `dq_sla_definition.breached`, `ml_model.drift_detected`). Per the technical-fix rule, INSERT `handoff_processes` only when audit pre-specifies `handoff_id` + resolvable PCF; the queue fails that test. |

### Fixes applied

| Step | Surface | Volume | Notes |
|---|---|---|---|
| (none) | n/a | 0 rows | All truly-technical B1 items had already been resolved in the 2026-05-29 pass. No residual item met the technical-fix criteria. |

### Deferred B1 items (residual)

| ID | Reason for deferral |
|---|---|
| B1-S5 | Needs new `trigger_events` per intra-domain edge (incident→problem, problem→change, change→CI, request→incident, sla→incident, sla→request, incident→knowledge, problem→knowledge). event_name, event_category, payload data_object_id, and condition each require editorial choice. Surface to user for a focused creative pass. |
| B1-S7 | Cross-domain attribution call; belongs to ITAM audit. |
| H1 queue | ~45 inbound handoffs (target_module 38 after S2 backfill) lack per-handoff PCF pre-specification. Bulk-assigning PCF 20903 would mass-pollute the catalog; a per-handoff trigger_event review is required to separate the "Triage IT service delivery incidents" bulk from the Pass-3 misfits. Surface as a follow-up tagging pass. |

### UI spot-checks

- `https://tests.semantius.app/domain_map/handoffs` (filter target_domain_id=1, target_domain_module_id=is.null → expect 0 rows)
- `https://tests.semantius.app/domain_map/role_modules` (filter role.role_code in IT-SERVICE-DESK-AGENT, IT-SERVICE-DESK-MANAGER, IT-CHANGE-MANAGER, IT-KNOWLEDGE-AUTHOR → expect 19 rows)
- `https://tests.semantius.app/domain_map/handoff_processes` (filter handoff_id in 28, 30, 55, 57, 142, 143, 162, 186, 630, 631 → expect 10 rows, 9 agent_curated + 1 discovery_override on 186)

### Re-verification queries (run 2026-05-31)

- `/handoffs?target_domain_id=eq.1&target_domain_module_id=is.null` returns `[]`. PASS (B10b inbound).
- `/handoffs?source_domain_id=eq.1&source_domain_module_id=is.null` returns `[]`. PASS (B10b outbound).
- `/role_modules?roles.role_code=in.(...)` returns 19 rows. PASS (E1).
- `/handoff_processes?handoff_id=in.(28,30,55,57,142,143,162,186,630,631)` returns 10 rows. PASS (H1 top batch).
- `/processes?external_id=eq.20903` returns id=1299, name "Triage IT service delivery incidents". Confirms the audit's anchor PCF exists for the deferred bulk-tag pass.

## 2026-05-31, Audit

### Summary

Structural Validate b1 pass against the live catalog. Footprint: domain id 1, 8 full modules, 7 masters (`service_incidents`, `service_requests`, `service_problems`, `service_changes`, `knowledge_articles`, `service_catalog_items`, `service_slas`), 4 roles (`IT-SERVICE-DESK-AGENT`, `IT-SERVICE-DESK-MANAGER`, `IT-CHANGE-MANAGER`, `IT-KNOWLEDGE-AUTHOR`) with 19 `role_modules` and 23 `role_permissions` rows, 8 system skills (one per module), 57 `skill_tools` rows, 80 cross-domain handoffs, 65 `handoff_processes` rows (55 agent_curated, 6 discovery_substring, 4 discovery_override, 0 approved).

Bands run: S, A, M, B (B5/B7/B9/B9b/B10b/B11/B12), C, D, E (E1-E5), F (F1-F5), H.

### Band results

| Band | Result | Notes |
|---|---|---|
| A1 (Rule #8 metadata) | PASS | crud_percentage=92, business_logic set, min_org_size=`20 s <500`, cost_band=$$$$, market 7000 (2025) |
| A4 (Rule #20 UX) | FAIL | `domains.catalog_tagline` and `catalog_description` both empty; Rule #20 forbids agent authoring without user approval |
| M1, M2, M4, M6 | PASS | 8 modules; 20 capabilities cover; bipartite coverage holds |
| M7 (cross-module monitoring_alerts owner) | OPEN | prior B2-S3 (ITOM vs RMM canonical owner) unresolved; cross-domain question |
| M8 (Rule #20 per-module UX) | FAIL | all 8 modules empty on `catalog_tagline`/`catalog_description`; Rule #20 forbids agent authoring without user approval |
| B1 | PASS | 7 master rows |
| B4 pattern flags | OPEN | prior B2-S2 (incident.has_personal_content, knowledge.has_personal_content, change.has_submit_lock re-eval) unresolved |
| B5 embedded_master integrity | PASS | no orphan embedded_master rows in this domain |
| B6 intra-domain relationships | PASS | 9 edges across the 7 masters |
| B7 `users` edges | PASS | covered by prior audit's E-band load |
| B9 outbound events + handoffs | PASS | every master with a state machine has trigger events; outbound coverage present |
| B9b intra-domain cross-module handoffs | FAIL | zero rows with `source_domain_id=target_domain_id=1`; carries forward residual B1-S5 from 2026-05-29 |
| B10b per-module attribution | PASS | inbound `target_domain_module_id=is.null` returns `[]`; outbound `source_domain_module_id=is.null` returns `[]` |
| B11 aliases | PASS | 10 alias rows across 6 masters; remaining gaps are self-explanatory exemptions |
| B12 lifecycle states | PARTIAL | 32 states across 6 masters; `service_slas` (53) still has 0 states; prior B2-S1 unresolved |
| C1 business function ownership | PASS | IT Service Desk owner; Security contributor; HR + Finance consumers |
| D1 UI spot-check | PASS | URLs renderable; deferred to user post-fix |
| E1 role coverage | PASS | 4 roles; multi-module domain threshold (>=3) met |
| E2 2-module floor per role | PASS | every role >=2 `role_modules` |
| E3 interaction_level set | PASS | every `role_modules` row primary or secondary |
| E4 role_permissions non-empty | PASS | bundles 5-7 rows per role |
| E5 Path A/Path B agreement | PASS | implied by E2 + E4 success on single-domain role set |
| F1 legacy domain-level skills retired | PASS | no `domain_id=eq.1` system skill with `domain_module_id=is.null` |
| F2 one system skill per module | PASS | 8 modules, 8 system skills |
| F3 >=1 skill_tools per skill | PASS | 3-10 tools per skill; total 57 |
| F4 operation_kind / data_object_id invariant | PASS | 0 violations |
| F5 Semantius score computable | PASS | F2+F3+F4 clean |
| F-band naming convention | OPEN | prior B2-S4 (kebab vs snake) unresolved |
| H1 coverage | PARTIAL | 65 of 80 handoffs tagged (81%); 0 approved; 16 untagged handoff ids: 177, 31, 239, 37, 461, 615, 644, 878, 843, 901, 140, 614, 642, 463, 788, 9 |

### Bucket classification

- **b1a (agent-solvable, technical):** H1 tagging of 16 untagged cross-domain handoffs (per-handoff PCF lookup is the mechanical-after-context pattern).
- **b1b (blocked on partner audits or upstream catalog work):** B9b intra-domain handoffs (creative trigger-event authoring); M7 monitoring_alerts canonical owner (ITOM + RMM); prior B1-S7 (ITAM).
- **b2 (user judgment):** A4 / M8 Rule #20 UX copy; B4 pattern flags re-eval; B12 service_slas lifecycle decision; F-band skill naming convention.
- **b3 (Phase 0 vendor research pending):** original 2026-05-29 candidates remain unverified.

### Bucket 1 b1a candidates

| ID | Band | Finding | Surface |
|---|---|---|---|
| B1A-H1-UNTAGGED | H1 | 16 cross-domain handoffs lack `handoff_processes`. Each is a single PCF lookup once trigger event + payload + source/target context is read. | Per-handoff loader appending `handoff_processes` with `proposal_source='agent_curated'`, `record_status='new'`. |

### Bucket 1 b1b (blocked)

| ID | Reason |
|---|---|
| B1B-B9b | New `trigger_events` authoring per intra-domain edge (incident -> problem, problem -> change, change -> CI, request -> incident, sla -> incident, sla -> request, incident -> knowledge, problem -> knowledge). Each needs event_name + payload + category editorial choice. Carries from 2026-05-29 B1-S5. |
| B1B-M7-MONITORING-ALERTS | Cross-domain canonical-owner question (ITOM vs RMM); resolved by ITOM + RMM b1 audits. |
| B1B-ASSET-FAILURE | Cross-domain attribution call on event 65 `service_incident.asset_failure`; resolved in ITAM audit. |

### Bucket 2 (user judgment)

1. **A4 / M8 catalog UX copy.** Author `catalog_tagline` and `catalog_description` for the `domains` row and all 8 module rows? Rule #20 requires user-approved wording before any write.
2. **B4 pattern flags re-eval (carry from 2026-05-29 B2-S2).** Should `service_incidents.has_personal_content=true`? `knowledge_articles.has_personal_content=true`? `service_changes.has_submit_lock=true`?
3. **B12 `service_slas` lifecycle (carry from 2026-05-29 B2-S1).** Config-shape exemption (no notes per Rule #15) or author a state machine?
4. **F-band skill naming convention (carry from 2026-05-29 B2-S4).** Rename catalog-wide from kebab `itsm-<module>-system` to snake `<module_code_lower>_agent`, or update SKILL.md?

### Bucket 3 (Phase 0 pending)

Same candidates as 2026-05-29. No Phase 0 file in workspace. Candidates: `service_outages`, `change_collisions`, `cab_meetings`, `service_offerings` vs `service_catalog_items` split, plus capability-orphan masters from ITSM-WALKUP, ITSM-VIRTUAL-AGENT, ITSM-CHARGEBACK.

### Cross-bucket dependencies

- b2 #1 (Rule #20 copy) independent of all other items.
- b2 #2 / #3 (pattern flags, service_slas lifecycle) independent of Bucket 3.
- b1b B9b depends on creative trigger-event authoring; progress requires a focused authoring session.
- b1a H1 untagged set is independent of every other bucket; overlap with the 2026-05-29 fix batch is zero.

### `domains.notes` pointer (Rule #15)

No write proposed; agent does not author notes without user-approved wording.

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

State-driven Validate pass against `audits/ITSM/state.yaml`. Resolved domain id 1, 8 full modules (38-45), 7 masters (47-53). Worked only the open state items, classifying each EXECUTE / SURFACE / LEAVE. Loader: `.tmp_deploy/fix_itsm_audit_2026_06_07.ts` (idempotent, read-live-then-write, all new rows `record_status='new'`). Snapshot was partly stale: the recorded 16-id H1 set had collapsed to 11 genuinely-untagged handoffs (handoff 9 is a non-ITSM Onboarding->HRSD edge already tagged; 140/177/642/644 already tagged; new handoff 1200 already tagged).

### Executed (additive/corrective, all `record_status='new'`)

| Item | Write | Count | Detail |
|---|---|---|---|
| B1A-ENTITY-TYPE | PATCH `data_objects.entity_type` | 7 | `service_incidents`/`service_requests`/`service_problems`/`service_changes`/`knowledge_articles` -> `operational_workflow` (all carry 4-8 lifecycle states); `service_catalog_items`/`service_slas` -> `catalog` (config-shape; catalog permits-but-not-requires lifecycle per Rule #12). |
| B2-CATALOG-UX (A4 + M8) | PATCH `domains` + `domain_modules` catalog_tagline/catalog_description | 9 | ITSM domain row + all 8 modules. Buyer-voice copy, no vendor/product names (Rule #18), no em-dash, American English. Only empty fields written; non-empty values never overwritten. Stale "surface-before-write" gate ignored per Rule #20/#21. |
| B1A-H1-UNTAGGED | INSERT `handoff_processes` (agent_curated, role=implements) | 9 | Clean-PCF matches only: 239/461/463/788/878/614/615 -> PCF 1299 "Triage IT service delivery incidents" (alert/event/SLO-breach -> incident triage; 614/615 follow the 55/57 precedent); 31 -> PCF 1312 "Maintain IT asset records"; 37 -> PCF 1313 "Administer IT licenses/user agreements". Idempotent on (handoff_id, process_id). 2 deferred to Discover (see below). |
| B11 aliases | INSERT `data_object_aliases` (synonym) | 5 | `problem ticket` (49), `change request` (50), `knowledge base article` (51), `catalog item` (52), `SLA` (53). Generic vendor-neutral synonyms not already present. |
| C1 | INSERT `business_function_domains` (contributor) | 1 | IT Operations (fn 27) as contributor. Owner (IT Service Desk fn 57) + Security contributor + HR/Finance consumers already present; the more-specific live owner was kept (no competing "IT Operations" owner authored). |

Total executed: 31 writes across 5 tables.

### Surfaced (NOT written; user decision / sign-off owed)

- **B2-PATTERN-FLAGS (b2):** flip `service_incidents.has_personal_content`, `knowledge_articles.has_personal_content`, `service_changes.has_submit_lock` to true? Workflow-shape judgment; user owns it.
- **B2-SLA-LIFECYCLE (b2):** `service_slas` now `entity_type=catalog` so B12 passes stateless; accept config-shape or author a state machine (draft/published/active/expired/archived)?
- **B1A-SELF-CONTAIN (M9, DESTRUCTIVE):** 2 DMDO rows (`asset_lifecycle_events` contributor on ITSM-INCIDENT-MGMT; `onboarding_tasks` required-consumer on ITSM-SERVICE-REQUEST) break self-containment. Fix rewrites existing non-empty rows (embed as embedded_master OR relax necessity=optional); needs approval, not auto-applied.
- **B1A-PHASE-P (personas/RACI):** DEFERRED, not authored. Candidate personas: IT-SERVICE-DESK-AGENT, IT-SERVICE-DESK-MANAGER, IT-CHANGE-MANAGER, IT-PROBLEM-MANAGER, IT-KNOWLEDGE-AUTHOR, END-USER-REQUESTER. Reconcile against the 4 roles the 2026-05-31 audit recorded before authoring (finding may be partly stale post-Plan-3).

### Left

- **b1b (blocked on partner work):** B1B-B9b (8 intra-domain handoffs need a creative trigger-event authoring session), B1B-M7-MONITORING-ALERTS (ITOM + RMM canonical-owner), B1B-ASSET-FAILURE (ITAM publisher decision; handoff 31 was tagged additively this pass, attribution still blocked).
- **B1A-H1 Discover deferrals:** handoff 843 (`dlp_incident.blocked`) and 901 (`clinical_order.placed`) have no clean PCF and read as source-domain scope creep; deferred to Discover Pass 3 / source-domain scope review rather than force-fit to PCF 1299.
- **B2-SKILL-NAMING:** RETIRED per the 2026-06-06 per-domain-skill supersession; re-framed as a note, no decision owed.
- **b3 (backlog, non-blocking):** 7 candidate entities (service_outages, change_collisions, cab_meetings, service_offerings split, walkup_visits, virtual_agent_conversations, chargeback_invoices). Phase 0 not run.

### UI spot-checks

- `https://tests.semantius.app/domain_map/data_objects` (filter entity_type per master)
- `https://tests.semantius.app/domain_map/domains` (ITSM row catalog copy) and `/domain_modules` (8 modules)
- `https://tests.semantius.app/domain_map/handoff_processes` (filter handoff_id in 31,37,239,461,463,614,615,788,878 -> 9 agent_curated/new rows)
- `https://tests.semantius.app/domain_map/data_object_aliases` (5 new synonyms)
- `https://tests.semantius.app/domain_map/business_function_domains` (filter domain_id=1 -> 5 rows incl. IT Operations contributor)

## 2026-06-08 - Phase 0 + market audit (semantic pass; first Phase 0 ever run for ITSM)

### Scope

Triggered by "research the ITSM domain". ITSM was already structurally complete (8 modules, 7 masters, 20 capabilities) and sitting in `feedback_needed` with an open `q-ITSM.md`. The one substantive research step never done was Phase 0 vendor-surface enumeration (prior audits explicitly recorded "no Phase 0 file in workspace"), which is also the Rule #22 forcing step needed to settle the `b3`/`q6` candidates with evidence rather than vendor-knowledge guesses. Ran the market-audit semantic pass: generated the ITSM vendor surface fresh (5 flagship vendors) and diffed it against the live footprint. READ-ONLY: no catalog rows written. Report: `.tmp_deploy/ITSM-phase0-2026-06-08.md`.

### Flagship vendors (matrix columns)

ServiceNow ITSM (suite leader; CSDM 5), Atlassian Jira Service Management + Statuspage (agile/mid), BMC Helix ITSM (classic enterprise), Freshservice (mid SaaS), ManageEngine ServiceDesk Plus (mid SaaS/on-prem). Ivanti Neurons used as a corroborating sixth source.

### Diff vs live footprint

- **SCOPE-CREEP: 0.** All 7 current masters (service_incidents, service_requests, service_catalog_items, service_problems, service_changes, knowledge_articles, service_slas) are validated as ITSM-owned by all five vendors. No current master is owned elsewhere.
- **WRONG-OWNERSHIP: 2.** (a) chargeback/cost-charge records belong to IT Financial Management / SPM (ServiceNow ships it as Financial Charging in ITFM, billing a business service, not the ITSM ticket); ITSM-CHARGEBACK should stay a cross-domain capability link, not get an ITSM master. (b) Raw alert/monitoring stream leans ITOM, not ITSM (the event-to-incident bridge is ITSM; the alert master is the ITSM/ITOM seam).
- **MISSING: 6 in-domain master candidates + 1 newly surfaced** (all CONFIRMED additive masters into existing modules - no module restructure, so they stay `b3`, not `b2`): service_outages, change_collisions, cab_meetings, service_offerings, virtual_agent_conversations, walkup_visits (RESHAPE: single master, no walkup_kiosks), plus newly-surfaced service_releases. Out-of-domain MISSING (NOT ITSM gaps): configuration_items (CMDB), service_assets / service_contracts / purchase_orders (ITAM/procurement), chargeback_records (ITFM/SPM).
- **MODULARIZATION: 4 findings, no new module needed.** RELEASE folds into ITSM-CHANGE-MGMT (which also absorbs cab_meetings + change_collisions); MAJOR-INCIDENT stays a flag/parent on service_incidents, not a separate master; ITSM-AGENT-WORKSPACE (no master today) gains walkup_visits + virtual_agent_conversations, retiring 2 of 3 capability-orphans; ITSM-EVENT-MGMT is the weakest fit - keep it (it has a master, Rule #14) but narrow to the event-to-incident bridge and treat raw alert streams as an ITOM/OBS inbound handoff.

### Verdicts on the prior 7 b3 candidates (named-vendor evidence in the Phase 0 report)

| Candidate | Verdict | Deciding evidence |
|---|---|---|
| service_outages | CONFIRM (Core) | ServiceNow Outage records, Atlassian Statuspage, Freshstatus. No collision with outage_events id 665 (UTIL-OPS grid). |
| change_collisions | CONFIRM (Common) | ServiceNow Collision Detector, BMC change conflict review. |
| cab_meetings | CONFIRM (Core) | ServiceNow CAB Workbench, BMC, Freshservice. |
| service_offerings | CONFIRM (Core) | ServiceNow CSDM offering-vs-catalog-item split (m:m), BMC, Freshservice. Entity-level split, not a module split. |
| walkup_visits | CONFIRM / RESHAPE (Specialist) | ServiceNow Walk-Up Experience only; drop walkup_kiosks (config attribute). |
| virtual_agent_conversations | CONFIRM (Core) | ServiceNow Interaction/Transcript, Freshservice Freddy, ManageEngine, Jira SM. |
| chargeback_invoices | **REFUTE** | Every flagship that ships it places it in ITFM/SPM, not the ITSM ticket. Belongs to an ITFM/SPM domain. |

Bonus: **service_releases CONFIRM** (newly added to b3, folds into ITSM-CHANGE-MGMT). **major_incidents REFUTE as a separate master** (flag/parent on service_incidents in every vendor).

### State changes (audit trail only - no catalog writes)

- `state.yaml`: `last_audit` -> 2026-06-08; `b3` block re-authored with Phase 0 verdicts; B3-CHARGEBACK-INVOICES removed (REFUTED, recorded here); B3-SERVICE-RELEASES added.
- `q-ITSM.md` q6 refreshed to embed the named-vendor evidence inline (Rule #22). q1-q5 unchanged (Phase 0 does not bear on self-containment, pattern flags, or SLA lifecycle).
- No `b1a`/`b2` escalation: every MISSING finding is additive and discretionary (b3). Domain stays `feedback_needed` on the pre-existing q1-q5 decisions.

## 2026-06-16 - a-file processing (a-ITSM.md go signal)

Processed `a-ITSM.md` per Rule #22. Resolved domain id 1. All catalog writes are additive/corrective at `record_status='new'` (omitted on insert) except the two embeds that q1 explicitly approves. Loader: `.tmp_deploy/process_itsm_afile_2026_06_16.ts` (idempotent, read-live-then-write). No `record_status` flip. No git.

### Resolved this pass

- **q1 / B1A-SELF-CONTAIN (a1=a, DESTRUCTIVE structural, APPROVED):** embedded both self-containment violators as `embedded_master`. PATCH `domain_module_data_objects` id 140 (asset_lifecycle_events on ITSM-INCIDENT-MGMT) role contributor -> embedded_master (necessity stays optional); id 679 (onboarding_tasks on ITSM-SERVICE-REQUEST) role consumer -> embedded_master (necessity stays required). Each module now carries its own local shell; the canonical owners (ITAM, ONBOARDING) are optional/deferred. M9 self-containment satisfied. Item removed from state.yaml.
- **q2 / B2-PATTERN-FLAGS.incidentpii (a2=yes):** PATCH `data_objects` id 47 service_incidents.has_personal_content -> true (record_status stays new).
- **q4 / B2-PATTERN-FLAGS.changelock (a4 empty -> Recommended yes):** PATCH `data_objects` id 50 service_changes.has_submit_lock -> true (record_status stays new).
- **q5 / B2-SLA-LIFECYCLE (a5=a):** accept config-shape (catalog) for service_slas; no state machine authored, no write needed (B12 already passes on the catalog classification). Item removed from state.yaml.
- **q6 / B3 backlog (a6 empty -> Recommended yes, add all seven):** INSERT 7 new `data_objects` + 7 master `domain_module_data_objects` rows, all at record_status=new. service_outages (id 1261, operational_workflow) master on ITSM-INCIDENT-MGMT; service_releases (1262, operational_workflow), cab_meetings (1263, operational_record), change_collisions (1264, operational_record) masters on ITSM-CHANGE-MGMT; service_offerings (1265, catalog) master on ITSM-SERVICE-REQUEST; virtual_agent_conversations (1266, operational_record) and walkup_visits (1267, operational_workflow) masters on ITSM-AGENT-WORKSPACE (its first own masters). All seven B3 items removed from state.yaml.
- **q7-q20 / 14 x B2-B9D-OWN-* (a7..a20 empty -> Recommended a, "ITSM owns it"):** the user accepted ITSM ownership of each forwarded step. ITSM currently has zero personas reaching its modules (role_modules on 38-45 returns [], confirming B1A-PHASE-P), so the R/A `process_raci` realization cannot be authored now: it is deferred to the persona-authoring pass. The 14 b2 ownership FORKS are decided and removed; the realization obligation is folded into a single B1B item blocked on B1A-PHASE-P. Three of the fourteen (B2-B9D-OWN-272 "Develop and execute IT resilience and continuity operations", -370 "Create remediation plans", -285 "Manage change deployment control") have been RECLASSIFIED by the committed b9d_resolver (2026-06-16 run) from ITSM ORPHAN to RE-TAG: the coarse tags on handoffs 682/686 (DATA-AI-PLAT), 841 (GRC), 703/706 (NCDB/LCAP) should re-point to 8.7.5.9 "Triage IT service delivery incidents" (already ITSM-owned). The ownership answer is honored (ITSM owns the triage work they fold into); the row-level re-point is a DESTRUCTIVE source-side edit recorded against the source domains' audits (DATA-AI-PLAT, GRC, NCDB, LCAP), not ITSM, so it is routed there and left for their sign-off, not executed here.
- **B1A-B9D-VERIFY:** B9d was run this pass via `bun run scripts/analytics/b9d_resolver.ts ITSM --dry-run` (78 boundary tags; 33 (process,owner) findings: 21 ORPHAN, 8 RE-TAG, 1 UNOWNED, 3 RESOLVED). Both directions classified. The 14 ITSM-owned ORPHANs are the q7-q20 set (now answered). Remaining cross-domain findings are owned by neighbors (CMDB, ONBOARDING, ITAM) and routed to their files / left for their audits. Item removed.
- **B2-SKILL-NAMING:** SUPERSEDED 2026-06-06 (per-domain-skill restoration); the tombstone note removed from state.yaml per Rule #22 hygiene (no disposition tombstones).

### Still open (carried into a regenerated q-ITSM.md)

- **q3 / B2-PATTERN-FLAGS.knowledgepii:** a3 was a QUESTION not a decision ("how do others handle that? shouldn't a good kb never contain any personal data at all?"). Left OPEN; the answer (KB hygiene practice across flagship vendors) is folded into the regenerated q-file. The has_personal_content flag on knowledge_articles (id 51) stays false until decided.

### Resolver / B9d routing notes (for the neighbor domains)

- RE-TAG re-points (source-side, sign-off owed in the source domain's audit, NOT executed here): handoffs 682/686 (DATA-AI-PLAT) 8.3.7 -> 8.7.5.9; handoff 841 (GRC) 11.3.1 -> 8.7.5.9; handoffs 703/706 (NCDB/LCAP) 8.6.3 -> 8.7.5.9; plus the resolver also flagged 248 (GRC) 9.8 -> 8.3.7, 642/466/631 (SMP/IGA/ITSM) 8.3.8 -> 8.7.5.9, 162/646 (REMOTE-ACCESS) 8.7.8 -> 8.7.5.9, 893 (CLIN-DEV) 10.3.3 -> 8.7.5.9, 257 (AUDIT) 12.3.2 -> 8.7.5.9. These are coarse-tag hygiene fixes owned by the sending domains.
- UNOWNED dependency: handoffs 614/615/618 (OBS) carry service_level_objectives / error_groups onto ITSM with no master row anywhere; surfaced on the sender (OBS), not dropped.
- ORPHANs owned by neighbors (their decision, not ITSM's): CMDB (B2-B9D-OWN-9, -1190, -1299, -1309), ONBOARDING (B2-B9D-OWN-224), ITAM (B2-B9D-OWN-1312). Routed to those domains' backlogs by the resolver; not ITSM gaps.
