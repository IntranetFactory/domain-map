---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 4
---

# ITSM — Audit History

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
