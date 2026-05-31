# REMOTE-ACCESS audit history

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **ZERO `domain_modules` rows** (M1 hard fail), 6 capabilities (all orphaned — no realizing module), 18 solutions (8 primary, 10 secondary), 2 masters (`remote_sessions` id 238, `session_recordings` id 239), 2 consumer DMDOs (legacy rollup only: `rmm_agents` 223 from RMM, `service_incidents` 47 from ITSM), 4 trigger_events, 6 outbound + 1 inbound cross-domain handoffs, 0 lifecycle states, 0 data_object_aliases, 0 data_object_relationships, 0 domain_regulations, 1 legacy domain-level system skill (`remote-access-system` id 100, `domain_module_id=null`) with 4 `skill_tools` rows, 0 roles. Phase 0 vendor-surface research never ran for this domain.
- **Vendor-surface basis:** 8 flagship primary solutions enumerated (TeamViewer, AnyDesk, Splashtop Business Access, BeyondTrust Remote Support, ConnectWise ScreenConnect, Zoho Assist, GoTo Resolve, RealVNC Connect). Compliance specialist: BeyondTrust Remote Support (HIPAA / PCI session-recording retention, vendor-access governance shape).
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 9 items.
- **Candidates queued to `_missing-domains.md`:** 4 (VDI, VPN, ZTNA, DEX).
- **Headline structural verdict:** The domain has Phase A market-shape (capabilities + solutions + domain metadata) and a thin Phase B (2 masters + 4 events + 7 handoffs) but ZERO Phase M (modules). Without modules the F-band (system skills), E-band (roles), B12 (lifecycle states), and M-band all sit blocked. Every B / E / F finding below is downstream of M1. Resolving M1 unblocks the rest of the gap report.

### Pass 1 — Structural

#### S-band coverage sweep

S1 — direct FKs to `domains`:

| Table | FK column | REMOTE-ACCESS rows | Expected non-zero? | Verdict |
| --- | --- | --- | --- | --- |
| `domain_data_objects` | `domain_id` | 4 (2 master + 2 consumer) | yes | pass |
| `solution_domains` | `domain_id` | 18 | yes | pass |
| `business_function_domains` | `domain_id` | 3 (IT Operations owner, Customer Service contributor, Security contributor) | yes | pass |
| `capability_domains` | `domain_id` | 6 | yes | pass |
| `domain_regulations` | `domain_id` | 0 | when applicable (HIPAA / PCI / SOX retention shape suggests applicable) | partial — see B1-S11 |
| `domains.parent_domain_id` | self | 0 inbound | routinely zero | pass |
| `handoffs.source_domain_id` | self | 6 | yes (non-leaf) | pass |
| `handoffs.target_domain_id` | self | 1 | usually non-zero | pass |
| `skills.domain_id` | self | 1 (legacy domain-level system skill) | yes (F2 requires per-module) | partial — see B1-S8 |
| `domain_modules.domain_id` | self | **0** | **yes (M1)** | **hard fail — B1-S1** |
| `domain_module_host_domains.domain_id` | self | 0 | only when cross-cutting modules host here | pass |

S2 — indirect-table per-module coverage: vacuous (no modules to enumerate).

S3 — per-master indirect-table coverage:

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| `remote_sessions` (238) | 0 | 3 (`remote_session.started` 653, `remote_session.ended` 654, `remote_session.unauthorized_access_attempt` 655) | 0 |
| `session_recordings` (239) | 0 | 1 (`session.recorded` 113) | 0 |

Both masters route to B12 (zero lifecycle states) and B11 (zero aliases).

#### Per-band verdict

| Band | Pass / fail | Notes |
| --- | --- | --- |
| A1 | pass | All 7 domain metadata fields populated (crud=30, business_logic non-empty, min_org_size `10 xs <50`, cost_band `$$`, certification_required false, US TAM $1.5B, source year 2024). |
| A2 | pass | 6 capabilities (RA-ATTENDED, RA-UNATTENDED, RA-RECORD, RA-XFER, RA-ELEVATE, RA-NAT). |
| A3 | pass | 18 solutions; 8 primary; coverage_level set on every row. |
| **M1** | **HARD FAIL** | Zero `domain_modules`. Blocks every M / B12 / E / F band check below. |
| M2 / M4 / M5 / M6 | vacuous fail | M4 = 6 orphan capabilities (no realizing module). |
| M7 | pass (vacuous) | No DMDO `master` rows on any REMOTE-ACCESS module to single-master-check. Catalog-wide single-master on 238 / 239: each appears `master` only once via the legacy rollup; no conflicting master rows in other domains. |
| B1 | pass | 2 masters: `remote_sessions` (238), `session_recordings` (239). |
| B2 | pass | Both have singular/plural labels (Remote Session, Session Recording). |
| B3 | pass | Both names are prefixed (no bare-word arbitration needed). |
| B4 | fail (positive re-eval needed) | All three pattern flags false on both masters. Per Rule #12 audits MUST positively re-evaluate. See B2-S3. |
| B5 | pass (vacuous) | No `embedded_master` rows. |
| B6 | fail | Zero intra-domain `data_object_relationships`. `remote_sessions` and `session_recordings` are obviously related (a session may produce a recording) but the edge is missing. |
| B7 | fail | Zero `users` edges on both masters. Users edges expected: `users → remote_sessions` (technician initiator, end-user participant), `users → session_recordings` (recorder / author). |
| B8 | fail | Zero cross-domain `data_object_relationships`. 4-5 outbound edges expected (see B1-S5). |
| B9 | partial fail | 4 trigger_events exist on REMOTE-ACCESS masters. Three (653 / 654 / 655) carry empty `event_category` (Rule #13 enum violation — must be one of `lifecycle / state_change / threshold / signal`). |
| B9b | vacuous (no modules) | Cannot evaluate intra-domain cross-module handoffs without modules. Re-runs after M1 fix. |
| B10b | fail | All 6 outbound handoffs (162, 163, 164, 646, 647, 648) carry NULL `source_domain_module_id` (REMOTE-ACCESS has no modules to assign). 1 inbound (160 from MSP-PSA) has NULL `target_domain_module_id` — also REMOTE-ACCESS's fix once modules exist. Two outbound rows (164 → GRC, 648 → GRC) additionally have NULL `target_domain_module_id` — GRC's B10b fix. |
| B11 | fail | Zero `data_object_aliases`. Common synonyms missing: `remote_sessions → support sessions / unattended sessions / attended sessions`, `session_recordings → support recordings / audit recordings`. |
| B12 | fail | Zero `data_object_lifecycle_states` on both masters. Without modules the lifecycle-states can still be authored (master is required), but per Rule #14 the realizing module's `domain_module_code` becomes the workflow-gate prefix, so M1 must land first. |
| C1 | pass | IT Operations (owner), Customer Service + Security (contributors). |
| C2 | pass (none required) | No diverging capability-level RACI observed. |
| D1 | not part of audit | UI spot-check is post-fix, user-triggered. |
| E1-E6 | vacuous (no modules) | No `roles` rows touch REMOTE-ACCESS today; the 2-module floor cannot be evaluated. |
| F1 | partial | Legacy domain-level system skill `remote-access-system` (id 100) exists with `domain_module_id=null`. Transitional state is acceptable ONLY while no module-level skill exists. Once M1 is fixed and per-module system skills land, this row must be retired. |
| F2 | vacuous fail (no modules) | Cannot satisfy 1-system-skill-per-module rule without modules. |
| F3 | partial | The legacy skill has 4 `skill_tools` (query_remote_sessions, query_session_recordings, send_email, post_chat_message). 3 are platform-covered, 1 (`post_chat_message`) is external. |
| F4 | pass | All 4 linked tools satisfy the `operation_kind` ↔ `data_object_id` invariant. |
| F5 | partial | strict_score = 3/4 = 75% on the legacy skill; operational_score also 75%. Once the skill is re-authored per-module with `notify_person` instead of channel primitives, the score recomputes. |
| F7 | fail | `send_email` (37) and `post_chat_message` (40) are linked directly to the system skill with empty `notes`. Generic notifications should use `notify_person`; broadcast uses `notify_team`. Per the Channel vs capability authoring rule, channel primitives are linked only when the workflow requires that specific channel, with workflow-specific justification in `skill_tools.notes`. |
| H1 | fail | 7 cross-domain handoffs total (6 outbound + 1 inbound); only 1 carries a `handoff_processes` row (handoff 162 → process 295 "Operate IT user support", `agent_curated`, `record_status='new'`). Volume expectation 0.5N to 0.8N = 4-6 new tags this audit. |

### Pass 2 — Domain-level market audit (semantic)

Flagship vendors enumerated: **TeamViewer** (pure-play remote control, attended + unattended + recording), **AnyDesk** (pure-play, attended + unattended + privilege elevation on Windows/macOS/Linux), **Splashtop Business Access** (cross-platform unattended workstation access), **ConnectWise ScreenConnect** (MSP-shaped attended + unattended with audit trail), **Zoho Assist** (attended + unattended with screen sharing + file transfer), **GoTo Resolve** (formerly GoToAssist; IT-shaped attended + ticketing integration), **RealVNC Connect** (cross-platform VNC + cloud relay + session recording), **BeyondTrust Remote Support** (compliance specialist — HIPAA / PCI session recording retention, just-in-time vendor access, credential-injection without exposing the credential).

Vendor-surface union — entities flagship products master that REMOTE-ACCESS does not (Rule #18: vendor names appear only here in justification, never in proposed entity names):

| Entity | Vendors-with | Class | Proposed module (Phase 0 hypothesis) |
| --- | --- | --- | --- |
| `endpoint_devices` (registered unattended-access targets) | TeamViewer, AnyDesk, Splashtop, ScreenConnect, RealVNC | Core | REMOTE-ACCESS-UNATTENDED |
| `remote_session_participants` (technician + end-user + observer join records) | TeamViewer, AnyDesk, ScreenConnect, BeyondTrust | Core | REMOTE-ACCESS-ATTENDED |
| `file_transfers` (per-session file move log) | TeamViewer, AnyDesk, Splashtop, ScreenConnect, Zoho Assist, RealVNC, BeyondTrust | Core | REMOTE-ACCESS-ATTENDED (covers attended + unattended file moves) |
| `clipboard_transfers` (clipboard share events) | TeamViewer, AnyDesk, Splashtop, ScreenConnect | Common | REMOTE-ACCESS-ATTENDED |
| `privilege_elevations` (UAC / sudo elevation requests during session) | AnyDesk, ScreenConnect, BeyondTrust, GoTo Resolve | Core | REMOTE-ACCESS-ATTENDED |
| `access_policies` (who can access which endpoints, when, under what MFA) | TeamViewer, AnyDesk, BeyondTrust, ScreenConnect, GoTo Resolve | Core | REMOTE-ACCESS-GOVERNANCE |
| `consent_records` (end-user consent prompts for attended sessions) | TeamViewer, AnyDesk, Splashtop, BeyondTrust | Compliance (GDPR Art. 6) | REMOTE-ACCESS-GOVERNANCE |
| `mfa_challenges` (per-session step-up authentication outcomes) | BeyondTrust, GoTo Resolve, TeamViewer Tensor | Compliance (PCI / HIPAA) | REMOTE-ACCESS-GOVERNANCE |
| `session_chat_messages` (in-session text between technician and end-user) | TeamViewer, ScreenConnect, Zoho Assist, GoTo Resolve | Common | REMOTE-ACCESS-ATTENDED |
| `relay_nodes` (managed NAT-traversal relay servers; on-prem or vendor cloud) | TeamViewer, AnyDesk, BeyondTrust, RealVNC | Specialist | REMOTE-ACCESS-UNATTENDED |
| `endpoint_groups` (logical grouping of endpoints for access-policy assignment) | TeamViewer, ScreenConnect, RealVNC, BeyondTrust | Core | REMOTE-ACCESS-UNATTENDED |
| `remote_command_executions` (one-off scripts / commands without full session) | ScreenConnect, BeyondTrust, AnyDesk | Common | REMOTE-ACCESS-UNATTENDED |
| `branded_access_portals` (customer-facing branded entry points for attended support) | TeamViewer, ScreenConnect, BeyondTrust, Zoho Assist | Common | REMOTE-ACCESS-ATTENDED |
| `unauthorized_access_attempts` (failed-auth, policy-violation incidents) | BeyondTrust, TeamViewer Tensor | Compliance | REMOTE-ACCESS-GOVERNANCE |
| `recording_retention_policies` (per-tenant retention windows for session_recordings) | BeyondTrust, TeamViewer Tensor | Compliance (HIPAA / PCI / SOX) | REMOTE-ACCESS-GOVERNANCE |

Two `data_object_aliases` candidates: `remote_sessions → "support sessions" / "attended sessions" / "unattended sessions"`, `session_recordings → "support recordings" / "compliance recordings" / "audit recordings"`.

Compliance entities likely required regardless of vendor: `consent_records`, `mfa_challenges`, `unauthorized_access_attempts`, `recording_retention_policies` (HIPAA security rule + PCI-DSS 8.2 + 10.7 + SOX audit-trail).

Modularization hypothesis (Phase 0 — speculative; needs user vetting before Phase A load):

- **REMOTE-ACCESS-ATTENDED** (full) — `remote_sessions` (attended slice or shared master), `remote_session_participants`, `file_transfers`, `clipboard_transfers`, `session_chat_messages`, `privilege_elevations`, `branded_access_portals`. Realizes RA-ATTENDED, RA-XFER, RA-ELEVATE. Embedded-masters `session_recordings` (mastered in GOVERNANCE).
- **REMOTE-ACCESS-UNATTENDED** (full) — `endpoint_devices`, `endpoint_groups`, `relay_nodes`, `remote_command_executions`. Realizes RA-UNATTENDED, RA-NAT.
- **REMOTE-ACCESS-GOVERNANCE** (full) — `session_recordings` (master), `access_policies`, `consent_records`, `mfa_challenges`, `unauthorized_access_attempts`, `recording_retention_policies`. Realizes RA-RECORD. Compliance-bearing module.

Three modules satisfies M2 (6 capabilities → ≥2 floor, with headroom). The single-master question for `remote_sessions` (does it live in ATTENDED or split into attended / unattended slices?) is a Bucket 2 decision.

### Pass 3 — Neighbor discovery

| Neighbor | Outbound | Inbound | DMDO consumed | Cross-rels | Weight | Pass shape |
| --- | --- | --- | --- | --- | --- | --- |
| MSP-PSA | 2 (msp_session.completed, remote_session.ended) | 1 (msp_ticket.escalated) | 1 (`remote_sessions` consumer in MSP-PSA-SVC-DESK) | 0 | 4 | Pairwise (full) |
| ITSM | 2 (support_session.completed, remote_session.ended) | 0 | 1 legacy (`service_incidents` consumer rollup) | 0 | 3 | Pairwise (full) |
| GRC | 2 (session.recorded, remote_session.unauthorized_access_attempt) | 0 | 0 | 0 | 2 | Lightweight |
| RMM | 0 | 0 | 1 legacy (`rmm_agents` consumer rollup) | 0 | 1 | Lightweight |

### Pass 4 — Pairwise reconciliation (weight ≥3)

#### MSP-PSA (weight 4)

- **Section 1 — Existing handoffs, fully wired.** None. Every handoff between REMOTE-ACCESS and MSP-PSA carries NULL `source_domain_module_id` (REMOTE-ACCESS owes) on the outbound rows.
- **Section 2 — Existing handoffs with NULL module FK.** Handoff 162 (`support_session.completed` → ITSM) carries the empty source_domain_module_id from REMOTE-ACCESS; handoff 163 (`msp_session.completed` → MSP-PSA), 647 (`remote_session.ended` → MSP-PSA-FIELD-SVC 137) similar. Inbound 160 (MSP-PSA → REMOTE-ACCESS on msp_ticket.escalated) has populated source (MSP-PSA module 137) and NULL target — REMOTE-ACCESS owes the target. Resolution requires M1 fix first.
- **Section 3 — Missing handoffs the catalog implies should exist.** Two candidates: (a) REMOTE-ACCESS → MSP-PSA on `session.recorded` (payload `session_recordings` for billing audit trail) — MSP-PSA does not currently consume `session_recordings`; (b) REMOTE-ACCESS → MSP-PSA on `unauthorized_access_attempt` (escalate to PSA security review) — same gap. Both blocked on REMOTE-ACCESS's M1.
- **Section 4 — Boundary integrity gaps.** MSP-PSA-SVC-DESK declares `remote_sessions` consumer (optional). No B5 issue; the canonical master exists in this domain via the legacy rollup. Once REMOTE-ACCESS is modularized, the canonical master moves to a `domain_module_data_objects.role='master'` row, which makes MSP-PSA's `consumer` row structurally well-anchored.
- **Section 5 — Cross-domain `data_object_relationships` mirror.** Zero relationships in either direction. Should exist: `remote_sessions →references→ msp_tickets` (a session may reference the originating ticket), `remote_sessions →generates_billing→ msp_time_entries` (each completed session may produce a billable time entry). Authoring blocked on M1 (the relationship row is REMOTE-ACCESS-owned by the source-of-verb rule).

#### ITSM (weight 3)

- Existing: 2 outbound (`support_session.completed` 162 → ITSM-INCIDENT-MGMT 38, `remote_session.ended` 646 → ITSM-INCIDENT-MGMT 38). Both have NULL `source_domain_module_id`. Target side fully wired.
- Missing relationship: `remote_sessions →resolves→ service_incidents` (an in-session resolution closes the linked incident). REMOTE-ACCESS owes the row.
- No B5 issues; ITSM `service_incidents` is canonically mastered in ITSM-INCIDENT-MGMT 38. REMOTE-ACCESS's `service_incidents` legacy-rollup consumer row will fold into the relevant new module's DMDO once M1 is fixed.

#### Lightweight summaries (weight 1-2)

- **GRC**: 2 outbound (164 on `session.recorded`, 648 on `remote_session.unauthorized_access_attempt`). Both NULL on both source and target module FKs (REMOTE-ACCESS owes source; GRC owes target). No declared GRC DMDO on `session_recordings` or `remote_sessions`. Pairwise full pass deferred until REMOTE-ACCESS has modules.
- **RMM**: REMOTE-ACCESS consumes `rmm_agents` via the legacy rollup. No handoffs in either direction. The dependency is implicit (an unattended remote-access session targets an endpoint that an RMM agent typically runs on). RMM B9 may legitimately not publish anything to REMOTE-ACCESS; consider as eyeball.

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail)** | **Zero `domain_modules` rows for REMOTE-ACCESS.** Domain has 6 capabilities and 18 solutions but no deployable units. Blocks M2 / M4 / M5 / M6 / E1-E6 / F2 / F3 / F5 / B9b cascade. Recommended module set (per Pass 2 Phase 0 hypothesis): `REMOTE-ACCESS-ATTENDED`, `REMOTE-ACCESS-UNATTENDED`, `REMOTE-ACCESS-GOVERNANCE` (3 full modules, satisfies M2). The two existing masters fold: `remote_sessions` to ATTENDED (or split — see B2-S1), `session_recordings` to GOVERNANCE. | Author 3 `domain_modules` rows + `domain_module_capabilities` linking each of the 6 capabilities to its realizing module + author 2 `domain_module_data_objects.role='master'` rows for the existing masters in their target modules. Standard Phase A extension load. |
| B1-S2 | **M4** | **6 capabilities orphaned** (no `domain_module_capabilities` row). After B1-S1 lands, each capability goes to: RA-ATTENDED → REMOTE-ACCESS-ATTENDED; RA-UNATTENDED → REMOTE-ACCESS-UNATTENDED; RA-RECORD → REMOTE-ACCESS-GOVERNANCE; RA-XFER → REMOTE-ACCESS-ATTENDED; RA-ELEVATE → REMOTE-ACCESS-ATTENDED; RA-NAT → REMOTE-ACCESS-UNATTENDED. | Author 6 `domain_module_capabilities` rows once modules exist. |
| B1-S3 | **B6** | **Zero intra-domain `data_object_relationships`.** Expected: `remote_sessions →produces→ session_recordings` (1:0..1 or 1:N depending on segmentation policy). | Author 1 `data_object_relationships` row with `relationship_verb='produces'`, `inverse_verb='produced_during'`, `relationship_type` (cardinality TBD with user), `relationship_kind`, `is_required=false`, `owner_side='source'`. |
| B1-S4 | **B7** | **Zero `users` edges on either master.** Expected user-typed actors per the catalog convention: `users → remote_sessions` (technician initiator, end-user participant), `users → session_recordings` (recording author / approver). | Author 4 `data_object_relationships` rows linking `users` (748) to each master in both directions per Rule #10. |
| B1-S5 | **B8 cross-domain relationships** | **Zero cross-domain `data_object_relationships`** for any of the 7 cross-domain handoffs. Outbound missing: `remote_sessions →references→ msp_tickets` (handoff 163 / 647 / 646 pairs), `remote_sessions →resolves→ service_incidents` (handoffs 162, 646 to ITSM), `remote_sessions →generates_billing_for→ msp_time_entries` (handoff 163 to MSP-PSA), `session_recordings →feeds_audit→ ???` (handoff 164 to GRC; target master TBD), `remote_sessions →triggers_security_review→ ???` (handoff 648 to GRC; target master TBD). | Author 3-5 cross-domain relationship rows; GRC-targeted edges depend on Bucket 3 (which GRC master, if any, is the canonical landing). REMOTE-ACCESS-side fixes only; B8 is asymmetric. |
| B1-S6 | **B9 event_category invalid** | 3 trigger_events carry empty `event_category` (Rule #13 enum violation): 653 `remote_session.started`, 654 `remote_session.ended`, 655 `remote_session.unauthorized_access_attempt`. The 4th event 113 `session.recorded` is set to `signal` (valid). | PATCH: 653 → `state_change`, 654 → `state_change`, 655 → `signal` (matches existing 113 pattern for security-signal events; consider `state_change` if you read it as a state transition on `remote_sessions`). |
| B1-S7 | **B10b own-side** | All 6 outbound handoffs (162, 163, 164, 646, 647, 648) and 1 inbound (160) carry NULL on REMOTE-ACCESS's side (`source_domain_module_id` for outbound, `target_domain_module_id` for inbound). Cannot be backfilled until B1-S1 lands. After modules exist: source side resolves to the module that holds the event's `data_object_id` with the strongest role (`remote_sessions` master for 162/163/646/647/648 → REMOTE-ACCESS-ATTENDED if ATTENDED owns the master, else GOVERNANCE for the recording-trigger 164/655 events; `session_recordings` master 113 for 164 → REMOTE-ACCESS-GOVERNANCE). Target side on 160 resolves to the receiving REMOTE-ACCESS module — likely ATTENDED if msp_ticket.escalated triggers a new attended session. | After B1-S1, run the standard B10b backfill (deterministic per the procedure). Author one focused loader. |
| B1-S8 | **F1 / F2 legacy skill** | Legacy domain-level system skill `remote-access-system` (id 100, `domain_module_id=null`) currently carries 4 `skill_tools`. F1 says this is acceptable while no module-level system skill exists; once B1-S1 lands and per-module skills are authored, this row must be retired (DELETE). The 4 tools redistribute across the new system skills per Phase S. Note: F1 retire happens AFTER per-module skills exist, not at module-create time. | After B1-S1 + new per-module Phase S load: DELETE skill 100 + its 4 `skill_tools`. |
| B1-S9 | **F7 — channel primitives without justification** | `skill_tools` rows on skill 100 link `send_email` (37) and `post_chat_message` (40) directly with empty `notes`. Per the Channel vs capability authoring rule, generic notifications should use `notify_person`; if both fire on every event (broadcast), use `notify_team`. The 4-tool legacy bundle is going to be rewritten in Phase S after B1-S1, so this can be fixed in flight: replace `send_email` + `post_chat_message` with `notify_person` (or `notify_team`) in the new per-module system skills. | At Phase-S load time, link `notify_person` instead of `send_email` + `post_chat_message`. No retro PATCH needed (the legacy skill itself is being retired per B1-S8). |
| B1-S10 | **B11** | **Zero `data_object_aliases`.** Both masters carry common cross-vendor synonyms: `remote_sessions → "support sessions" / "attended sessions" / "unattended sessions" / "remote control sessions"`; `session_recordings → "support recordings" / "compliance recordings" / "audit recordings" / "session capture"`. | Author 6-8 `data_object_aliases` rows; bundle into the same Phase-B extension load as B1-S3 / B1-S4. |
| B1-S11 | **`domain_regulations` empty** | Zero `domain_regulations` rows. Compliance-bearing markets (session recording for HIPAA / PCI / SOX audit-trail; just-in-time vendor access for SOC 2) routinely apply to this domain — BeyondTrust Remote Support's entire compliance story is HIPAA + PCI + SOX session retention. Candidates: HIPAA Security Rule (technical safeguards on remote access to ePHI), PCI-DSS 8.2 / 10.7 (multi-factor for remote access + audit-log retention), SOX (audit trail for privileged session activity). | Author 3 `domain_regulations` rows linking HIPAA / PCI-DSS / SOX with `applicability` set per regulation scope. Confirm regulation IDs in catalog before insert. |
| B1-S12 | **B12 lifecycle states (workflow gates)** | Zero `data_object_lifecycle_states` on either master. `remote_sessions` has an obvious state machine (`requested → consent_pending → connected → privileged → ended` or similar with `unauthorized` as a side-state). `session_recordings` has a retention-driven state machine (`recording → archived → retention_lock → expired` or `pending_review → reviewed`). Per Rule #12 the state machine + workflow-gate flags are materialized into permissions, prefixed by the realizing module's `domain_module_code`. Blocked on B1-S1 (the realizing module must exist first). | After B1-S1: author lifecycle states with `requires_permission=true` on the gating states (`elevated` requires `elevate_remote_session`, `unauthorized` requires `flag_remote_session`, `archived` requires `archive_session_recording`, `retention_lock` requires `lock_session_recording`). |

#### APQC TAGGING

Existing tags: 1 row (handoff 162 → process 295 "Operate IT user support" L3, `agent_curated`, `record_status='new'`). All other 6 cross-domain handoffs are untagged. Volume target for this audit: 4-6 new agent_curated rows (matches 0.5N to 0.8N for N=7).

Proposed PCF tags (the `agent_curated` set this audit ships into Bucket 1 for user approval):

| handoff_id | source → target | trigger_event | payload | Proposed PCF (process_name / external_id / level) | Confidence |
|---|---|---|---|---|---|
| 163 | REMOTE-ACCESS → MSP-PSA | `msp_session.completed` | `msp_time_entries` (235) | "Operate IT user support" 20921 L3 | confident L3 — session-completed → user-support delivery |
| 164 | REMOTE-ACCESS → GRC | `session.recorded` | `session_recordings` (239) | "Conduct IT compliance control auditing of internal and external services" 20745 L4 (parent "Control IT risk, compliance, and security" 20721 L3) | confident L3 parent (prefer parent for clustering quality per audit-procedure rule) — use 20721 |
| 646 | REMOTE-ACCESS → ITSM | `remote_session.ended` | `service_incidents` (47) | "Operate IT user support" 20921 L3 (same as 162; remote-support session ending updates an ITSM incident) | confident L3 |
| 647 | REMOTE-ACCESS → MSP-PSA | `remote_session.ended` | `remote_sessions` (238) | "Operate IT user support" 20921 L3 | confident L3 |
| 648 | REMOTE-ACCESS → GRC | `remote_session.unauthorized_access_attempt` | `remote_sessions` (238) | "Control IT risk, compliance, and security" 20721 L3 | confident L3 (security-incident reporting flow) |
| 160 (inbound) | MSP-PSA → REMOTE-ACCESS | `msp_ticket.escalated` | `msp_tickets` (233) | "Operate IT user support" 20921 L3 | confident L3 (escalation → user-support handover) |

| ID | Finding type | Count |
|---|---|---|
| MISSING (entity gap, in-scope confirmed) | 0 (all market-surface MISSING items go to Bucket 3 — Phase 0 not yet run) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M1, M4, B6, B7, B8, B9, B10b, F1/F2, F7, B11, regulations, B12) | 12 |
| BOUNDARY (subset of structural, already counted above) | 0 (already in structural) |
| APQC TAGGING | 2 (one for the 6-row agent_curated batch, one for deferred-to-Discover review of existing tag 162's confidence) |
| **Bucket 1 total** | **14** |

### Bucket 2 — Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Should `remote_sessions` split into `attended_sessions` + `unattended_sessions` as separate masters, or stay one master with a `session_mode` discriminator?** Both shapes appear in flagship vendors. TeamViewer / AnyDesk treat them as one entity with a mode field; BeyondTrust splits them (different access-policy surfaces, different consent flows). The decision drives whether REMOTE-ACCESS-ATTENDED and REMOTE-ACCESS-UNATTENDED each `role='master'` a different entity (cleaner Phase-B), or share one master with mode-scoped lifecycle states (cleaner Phase A, harder Phase E). | Architectural / market-shape decision; deployment model varies by vendor. | (a) One master + `session_mode` discriminator; ATTENDED + UNATTENDED both `role='embedded_master'` if needed for autonomous deploy. (b) Split into two masters; rename `remote_sessions` → `attended_sessions` and add `unattended_sessions`; update handoffs + events accordingly. (c) Defer; ship 3-module shape with ATTENDED owning `remote_sessions` master, UNATTENDED `embedded_master`-ing it, revisit once first real deploys exist. |
| B2-S2 | **Lifecycle-state proposals for `remote_sessions` and `session_recordings`** (B1-S12 fix details). Proposed: `remote_sessions` → `requested → consent_pending → connected → privileged → ended` with workflow gates on `privileged` (`elevate_remote_session`) and `ended` (`end_remote_session`); `session_recordings` → `recording → archived → retention_lock → expired` with gates on `retention_lock` (`lock_session_recording`) and `expired` (`purge_session_recording`). | Workflow-shape decisions the user owns; per-vendor practice varies. | Per-state yes/no on the proposed states + per-gate yes/no on `requires_permission=true` markers. |
| B2-S3 | **B4 pattern flags positive re-eval** (Rule #12). Both masters currently false on all three. Specifically: should `remote_sessions.has_personal_content=true` (screen content during a session often contains PII / PHI; recording metadata frequently does)? Should `session_recordings.has_personal_content=true` (almost certainly yes; recording IS the personal content)? Should `session_recordings.has_submit_lock=true` (a finalised recording should be immutable once archived for retention; flag the lock semantic)? Should `remote_sessions.has_single_approver=true` (privilege-elevation typically needs a single approver gate)? | Pattern flags are workflow-shape judgments; defaults are false-by-default which is not the same as false-after-review. | Per-flag yes/no from user. |
| B2-S4 | **Regulation scoping** (B1-S11). Which of HIPAA / PCI-DSS / SOX apply, and with what `applicability` (mandatory / optional-when-customer-handles-X / industry-vertical)? BeyondTrust's compliance pitch is "HIPAA + PCI + SOX + GDPR + ISO 27001 for vendor access" — but the regulations are not equally applicable in every deployment. | Scope decisions require knowing which buyer slice the catalog is modeling (MSP-shaped vs. enterprise-vendor-access vs. consumer-IT support). | (a) All three required; (b) HIPAA + PCI required, SOX optional; (c) all optional; (d) other (specify). |
| B2-S5 | **Module-naming choice.** The Phase 0 hypothesis proposed REMOTE-ACCESS-ATTENDED / REMOTE-ACCESS-UNATTENDED / REMOTE-ACCESS-GOVERNANCE. An alternative split sometimes used by flagship vendors: REMOTE-ACCESS-SUPPORT (attended/help-desk) / REMOTE-ACCESS-PLATFORM (unattended/relay/endpoint mgmt) / REMOTE-ACCESS-COMPLIANCE (recording + governance). The second naming reads better against the BeyondTrust / TeamViewer Tensor pitch ("support" vs "platform" vs "compliance"). The first naming reads better against the capability set already loaded (RA-ATTENDED / RA-UNATTENDED / RA-RECORD). | Naming convention is editorial; both shapes load identically. | (a) ATTENDED / UNATTENDED / GOVERNANCE (matches capability codes). (b) SUPPORT / PLATFORM / COMPLIANCE (matches vendor positioning). (c) other (specify). |

### Bucket 3 — Phase 0 pending (speculative)

Market-audit subagent did NOT run (rate limited / not part of mass-audit scope). The findings below are derived from this audit's own Pass-2 vendor-surface synthesis (TeamViewer, AnyDesk, Splashtop, ConnectWise ScreenConnect, Zoho Assist, GoTo Resolve, RealVNC Connect, BeyondTrust Remote Support) and are speculative until a formal Phase 0 pass vets them per `references/vendor-research-protocol.md`.

| ID | Candidate entity / finding | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-S1 | `endpoint_devices` — registered unattended-access target devices | TeamViewer Devices, AnyDesk Address Book, Splashtop Computers, ScreenConnect Sessions, RealVNC Connections | Pull TeamViewer Management Console API + AnyDesk REST + Splashtop API reference; cross-vendor union. |
| B3-S2 | `endpoint_groups` — logical groups of endpoints for policy assignment | TeamViewer Groups, ScreenConnect Group Path, RealVNC Teams, BeyondTrust Jump Groups | Vendor docs. |
| B3-S3 | `access_policies` — who can access which endpoints under what conditions | TeamViewer Tensor Policies, BeyondTrust Group Policies, AnyDesk Custom Clients, ScreenConnect Roles | Vendor docs; verify if MFA / time-window / source-IP constraints are first-class fields or nested rules. |
| B3-S4 | `privilege_elevations` — UAC / sudo elevations during session | AnyDesk Custom Clients (request_elevation), ScreenConnect Privileged Mode, BeyondTrust Privileged Remote Access | Vendor docs; per-vendor naming varies. |
| B3-S5 | `file_transfers` + `clipboard_transfers` — per-session data movement | All flagship products | Vendor docs; usually exposed as audit-trail tables. |
| B3-S6 | `consent_records` — end-user consent prompts | TeamViewer / AnyDesk attended-mode prompts; BeyondTrust customer-side click-to-allow | Compliance-driven; GDPR Art. 6 lawful-basis evidence. |
| B3-S7 | `mfa_challenges` — per-session step-up auth outcomes | BeyondTrust, TeamViewer Tensor, GoTo Resolve | Vendor compliance docs. |
| B3-S8 | `relay_nodes` — managed NAT-traversal relays | TeamViewer Master Servers, AnyDesk On-Premises, BeyondTrust Appliances, RealVNC Cloud Connections | Vendor architecture docs; on-prem variant lists. |
| B3-S9 | `recording_retention_policies` — per-tenant retention windows | BeyondTrust + TeamViewer Tensor expose policy as first-class object | Compliance docs (HIPAA, PCI, SOX retention windows). |

The strongest signal in the diff: the loaded footprint covers the session + recording masters but misses the entire access-governance layer (policies, consent, MFA, elevations) and the entire endpoint-target layer (devices, groups, relays). A formal Phase 0 + Phase A + Phase B extension would roughly double the entity count of this domain.

**Candidates queued to `audits/_missing-domains.md`:** VDI (Virtual Desktop Infrastructure — Citrix DaaS, VMware Horizon, Azure Virtual Desktop, Amazon WorkSpaces, Nutanix Frame), VPN (Virtual Private Network — Cisco AnyConnect, Palo Alto GlobalProtect, Fortinet FortiClient, Tailscale, Twingate), ZTNA (Zero Trust Network Access — Zscaler Private Access, Netskope Private Access, Cloudflare Access, Cato Networks, Banyan / SonicWall Cloud Secure Access), DEX (Digital Employee Experience — Nexthink, Lakeside SysTrack, ControlUp, 1E Tachyon, Workspace ONE Intelligence DEX).

### Cross-bucket dependencies

- **B1-S1 (M1 fix) is the critical-path gate.** B1-S2 / B1-S7 / B1-S8 / B1-S12 all block on it. B2-S1 / B2-S2 / B2-S5 also feed into the M1 fix shape — the user should answer those before the Phase A extension loader runs.
- **B2-S1 (master split) directly informs B1-S1.** If the user picks (b) split into attended + unattended masters, B1-S5 (cross-domain relationships), B1-S7 (B10b backfill), and B1-S12 (lifecycle states) all need different shapes per master.
- **B2-S4 (regulation scoping) is independent** of all other buckets.
- **B3 candidates (B3-S1 through B3-S9) are MISSING entities not yet vetted.** Formal Phase 0 + Phase B extension is required before any of them load. Eyeball-mode is acceptable; the strongest "definitely needed" signal is `endpoint_devices` + `access_policies` + `consent_records` + `mfa_challenges`.
- **Queued candidate domains (VDI / VPN / ZTNA / DEX) are independent** of this domain's load; they're flagged for the user to triage in `_missing-domains.md`.

### Per-bucket prompts

**Bucket 1 — fix these now?** Reply `all`, list specific items (e.g. `S1, S2, S6, S7`), or `skip`.

- **S1 (M1 hard fail — author 3 `domain_modules` rows; depends on B2-S5 naming + B2-S1 master split):** decide naming + master split first.
- **S2 (M4 — 6 capability links; depends on S1):** mechanical after S1.
- **S3 / S4 / S5 (B6 / B7 / B8 relationships):** can land before S1 (relationship rows are domain-level, not module-level), but B8 cross-domain rows benefit from S1 to anchor at the right module.
- **S6 (B9 event_category PATCH on 3 events):** trivial; one PATCH each. No dependencies.
- **S7 (B10b backfill on 7 handoffs):** depends on S1.
- **S8 (F1 legacy skill retire) + Phase-S re-author:** depends on S1.
- **S9 (F7 channel-primitive replacement with `notify_person`):** rolls into the Phase-S re-author, not a standalone fix.
- **S10 (B11 — 6-8 alias rows):** independent; can ship anytime.
- **S11 (`domain_regulations` — 3 rows):** depends on B2-S4 scoping.
- **S12 (B12 lifecycle states):** depends on S1 + B2-S2.
- **H1 (APQC tagging — 6 agent_curated rows above):** load now or in a follow-up batch? No dependencies; can ship before any other fix.

**Bucket 2 — what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (master split: one master + mode, or two masters?):** (a / b / c)?
- **B2-S2 (lifecycle-state proposals):** per-state + per-gate yes/no.
- **B2-S3 (B4 pattern flags):** per-flag yes/no.
- **B2-S4 (regulation scoping HIPAA / PCI / SOX):** (a / b / c / d)?
- **B2-S5 (module naming ATTENDED / UNATTENDED / GOVERNANCE vs SUPPORT / PLATFORM / COMPLIANCE):** (a / b / c)?

**Bucket 3 — Phase 0 pending — vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball, name which of the 9 candidates to treat as confirmed and we add them via Phase B once B1-S1 lands. Formal Phase 0 is recommended given that the current 2-master footprint is roughly half of any flagship vendor's surface; eyeball-mode is acceptable as a fast path for the obvious additions (`endpoint_devices`, `access_policies`, `consent_records`, `mfa_challenges`).

### Report-only follow-ups (owed by other domains)

| Item | Owed by | Description |
|---|---|---|
| B10b inbound target_domain_module_id on handoff 160 | REMOTE-ACCESS (own-side; blocked on B1-S1) | Inbound MSP-PSA → REMOTE-ACCESS on `msp_ticket.escalated`. Once REMOTE-ACCESS has modules, REMOTE-ACCESS owes the `target_domain_module_id` backfill. (Not literally another domain — listed for completeness.) |
| B10b target_domain_module_id on handoffs 164, 648 (GRC side) | GRC | Outbound REMOTE-ACCESS → GRC carries NULL on the GRC side. GRC's own b1 audit owes the backfill. |
| Missing consumer DMDOs on REMOTE-ACCESS masters | ITSM, MSP-PSA, GRC | ITSM and GRC do not declare `consumer / contributor / embedded_master` on `remote_sessions` or `session_recordings` at the module-DMDO layer (legacy ITSM rollup of `service_incidents` notwithstanding). MSP-PSA-SVC-DESK already declares `remote_sessions` consumer (optional) — the only domain that does. Each target domain's b1 audit should add the relevant consumer DMDO on the receiving module once REMOTE-ACCESS modularizes. |
| RMM cross-domain handoff visibility | RMM | RMM does not publish a `rmm_agent.installed` or `rmm_agent.unreachable` event into REMOTE-ACCESS even though REMOTE-ACCESS's consumer DMDO on `rmm_agents` suggests it expects awareness of agent state. RMM b1 audit should evaluate whether a cross-domain handoff is warranted. |
| Subagent-driven Phase 0 vendor-surface research not run | this audit | The Pass-2 surface was synthesized from the audit's own vendor knowledge rather than from a formal Phase 0 subagent + vendor-research-protocol pass. Re-run formally before any Bucket 3 entity loads. |

## 2026-05-31, Continuation: B1 technical fixes

Applied truly-technical B1 fixes per the continuation prompt's scope (enum backfills, Rule #10 user-edges with audit pre-specified roles, handoff_processes inserts with verified PCF IDs). Judgment-bearing items left for the user.

Loader: `.tmp_deploy/fix_remote_access_b1_technical_2026_05_31.ts` (run from project root, idempotent, all three steps passed post-flight).

### Applied (13 writes)

**B1-S6, PATCH 3 `trigger_events.event_category`** (Rule #13 enum backfill):

- 653 `remote_session.started` -> `state_change`
- 654 `remote_session.ended` -> `state_change`
- 655 `remote_session.unauthorized_access_attempt` -> `signal`

**B1-S4 / B7, INSERT 4 `data_object_relationships`** (Rule #10 user-edges, audit pre-specifies the 4 roles). `data_object_id=748` (users) source, `owner_side='target'`, `one_to_many`, `reference`, `is_required=false` (matches recent loader convention):

- id 1613: users -> remote_sessions (238), verb `initiates`
- id 1614: users -> remote_sessions (238), verb `participates_in`
- id 1615: users -> session_recordings (239), verb `authors`
- id 1616: users -> session_recordings (239), verb `approves`

**B1-H1, INSERT 6 `handoff_processes`** (PCF tags; audit pre-specifies handoff_id + PCF external_id; processes 295 / 268 verified live). `proposal_source='agent_curated'`, `record_status` omitted (DB default `new`, Rule #1):

- id 403: handoff 163 -> process 295 (`Operate IT user support`)
- id 404: handoff 164 -> process 268 (`Control IT risk, compliance, and security`)
- id 405: handoff 646 -> process 295 (`Operate IT user support`)
- id 406: handoff 647 -> process 295 (`Operate IT user support`)
- id 407: handoff 648 -> process 268 (`Control IT risk, compliance, and security`)
- id 408: handoff 160 -> process 295 (`Operate IT user support`)

### Deferred (still open)

| ID | Reason |
|---|---|
| B1-S1 (M1: 3 new `domain_modules`) | New modules; gated on B2-S1 (master split) + B2-S5 (naming). |
| B1-S2 (M4: 6 `domain_module_capabilities`) | Depends on B1-S1. |
| B1-S3 (B6 intra-domain `produces` relationship) | Audit says "cardinality TBD with user". |
| B1-S5 (B8 cross-domain relationships) | Out of technical scope (continuation rule restricts `data_object_relationships` to Rule #10 user-edges). GRC-targeted edges additionally blocked on Bucket 3 target masters. |
| B1-S7 (B10b own-side module FK backfill on 7 handoffs) | Blocked on B1-S1 (REMOTE-ACCESS has zero modules to derive FKs against). |
| B1-S8 (F1 legacy skill 100 retire) | Depends on B1-S1 + per-module Phase-S re-author. |
| B1-S9 (F7 channel-primitive replacement) | Rolls into the Phase-S re-author (B1-S8); not a standalone fix. |
| B1-S10 (B11: 6-8 `data_object_aliases`) | Audit lists slash-separated synonym options, not exact tuples; bulk aliases deferred per scope. |
| B1-S11 (3 `domain_regulations` rows for HIPAA / PCI / SOX) | Blocked on B2-S4 (regulation-scoping user pick). |
| B1-S12 (B12 lifecycle states on both masters) | Blocked on B1-S1 (realizing-module prefix is required for workflow-gate permission prefixes per Rule #14) + B2-S2 (state-list + per-gate user picks). |

### Verification

Loader post-flight confirmed: 3 events now carry the new `event_category` values; 4 user-edges live on `remote_sessions` / `session_recordings`; 7 `handoff_processes` rows now cover the 7 REMOTE-ACCESS handoffs (the pre-existing tag on 162 plus 6 new). No JWT errors during the run.

## 2026-05-31, Audit

### Summary

- **Current footprint:** Same headline shape as prior Validate (2026-05-30) plus the technical fixes from the Continuation. Zero `domain_modules`, zero `domain_module_host_domains` for REMOTE-ACCESS. 6 capabilities (RA-ATTENDED, RA-UNATTENDED, RA-RECORD, RA-XFER, RA-ELEVATE, RA-NAT), all orphaned (no realizing module). 18 solutions (8 primary, 10 secondary). 2 masters in the legacy rollup (`remote_sessions` 238, `session_recordings` 239). 2 consumer rollup rows (`rmm_agents` 223, `service_incidents` 47). 4 `trigger_events` (113, 653, 654, 655 — categories now valid per S6 backfill). 6 outbound + 1 inbound cross-domain handoffs (162, 163, 164, 646, 647, 648 out; 160 in). 7 `handoff_processes` rows (162 / 163 / 164 / 646 / 647 / 648 / 160 — all `agent_curated`, `record_status='new'`). 4 `data_object_relationships` (1613-1616, all `users`-edges to 238 / 239). 0 lifecycle states on either master. 0 `data_object_aliases` on either master. 0 `domain_regulations`. 0 intra-domain `data_object_relationships` (no `remote_sessions produces session_recordings`). 0 cross-domain `data_object_relationships`. 1 legacy domain-level system skill (id 100, `domain_module_id=null`) with 4 `skill_tools` (`query_remote_sessions`, `query_session_recordings`, `send_email`, `post_chat_message`). 0 `roles` rows touching REMOTE-ACCESS. 3 `business_function_domains` rows (IT Operations owner, Customer Service + Security contributors). Catalog UX fields (`catalog_tagline` / `catalog_description`) empty on the `domains` row (A4 fail).
- **Catalog-wide single-master cross-check (M7):** `/domain_module_data_objects?data_object_id=in.(238,239)&role=eq.master` returns ZERO rows. Both REMOTE-ACCESS masters currently exist only via the legacy `domain_data_objects` rollup, not via the module-DMDO layer. The MSP-PSA-SVC-DESK module (137) carries `consumer + optional` on `remote_sessions`; nothing else references the masters at the module layer. This is the structural inverse of "two masters" — it is "zero canonical masters at the module-DMDO layer", which the M1 fix will resolve when REMOTE-ACCESS modularizes and authors `role='master'` DMDO rows for both.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items (carried from prior Validate, unchanged, all still PENDING).
- **Bucket 3 (Phase 0 pending, speculative):** 9 items (carried from prior Validate, unchanged, all still PENDING).
- **Headline verdict:** The Continuation cleared the 13 truly-technical B1 fixes (event_category enums, user-edges, APQC tags). The remaining gap is dominated by M1 (zero `domain_modules`) and its cascade. No new structural findings since the prior Validate; this Audit confirms the current state and re-classifies the open items under schema v2.

### Pass 1 — Structural (per-band verdict, delta from 2026-05-30)

| Band | Verdict | Delta |
|---|---|---|
| A1 | pass | unchanged, all 7 domain metadata fields populated |
| A2 | pass | unchanged, 6 capabilities |
| A3 | pass | unchanged, 18 solutions, 8 primary |
| A4 | fail | unchanged, `domains.catalog_tagline` and `catalog_description` both empty |
| M1 | HARD FAIL | unchanged, zero `domain_modules` |
| M2 / M4 / M5 / M6 / M8 | vacuous fail | unchanged, no modules |
| M7 | pass with zero-master caveat | catalog-wide `role='master'` count on 238 + 239 is ZERO at the module-DMDO layer (legacy `domain_data_objects` rollup carries them, but the modularized layer is empty). Not a duplicate-master hard fail; documenting as "anchor pending" for the M1 fix. |
| B1 | pass | unchanged, 2 masters via legacy rollup |
| B2 | pass | unchanged |
| B3 | pass | unchanged, both names prefixed |
| B4 | fail | unchanged, all three pattern flags false on both masters, no positive re-eval recorded |
| B5 | pass (vacuous) | no `embedded_master` rows on either master |
| B6 | fail | unchanged, zero intra-domain relationships; `remote_sessions produces session_recordings` not authored |
| B7 | partial | improved by Continuation, 4 `users` edges live (1613 `initiates`, 1614 `participates_in`, 1615 `authors`, 1616 `approves`). Audit's pre-specified roles delivered. |
| B8 | fail | unchanged, zero cross-domain `data_object_relationships`; 3-5 outbound edges still owed |
| B9 | pass | improved by Continuation, all 4 trigger_events now carry valid `event_category` values (653 / 654 `state_change`, 655 / 113 `signal`) |
| B9b | vacuous (no modules) | unchanged |
| B10b | fail | unchanged, all 6 outbound handoffs (162, 163, 164, 646, 647, 648) carry NULL `source_domain_module_id`; inbound 160 carries NULL `target_domain_module_id`. Blocked on M1. Two outbound (164, 648 to GRC) also carry NULL `target_domain_module_id`, GRC's own B10b. |
| B11 | fail | unchanged, zero `data_object_aliases` |
| B12 | fail | unchanged, zero lifecycle states; blocked on M1 |
| C1 | pass | unchanged, IT Operations owner, Customer Service + Security contributors |
| C2 | pass | unchanged |
| E1-E5 | vacuous (no modules) | unchanged, zero `roles`, zero `role_modules` touching REMOTE-ACCESS |
| F1 | partial | unchanged, legacy skill 100 still present (acceptable transitional shape while no module-level skills exist) |
| F2 | vacuous fail (no modules) | unchanged |
| F3 | partial | unchanged, 4 `skill_tools` on skill 100 |
| F4 | pass | unchanged |
| F5 | partial | unchanged, strict_score 3/4 = 75% on legacy skill (`post_chat_message` is `external`) |
| H1 (process header) | partial | improved, all 7 cross-domain handoffs carry a `handoff_processes` row (`record_status='new'`, `proposal_source='agent_curated'`). Approved-count remains 0; agent_curated count is 7. The catalog-quality headline is "0 approved"; the process-health side-bar is "7 agent_curated of 7". |
| H1 (regulation header) | fail | unchanged, zero `domain_regulations`; HIPAA / PCI / SOX scoping still pending (B2-S4) |

### Bucket 1 — In-scope confirmed gaps (11)

| ID | Band | Finding | Fix surface | Blocked by |
|---|---|---|---|---|
| B1-M1 | M1 / M2 / M4 / M6 / M8 | Zero `domain_modules` rows for REMOTE-ACCESS. Author 3 full modules (Phase 0 hypothesis: ATTENDED / UNATTENDED / GOVERNANCE or SUPPORT / PLATFORM / COMPLIANCE per B2-S5). Realize the 6 capabilities + master 238 / 239 at the module-DMDO layer with `role='master'` for both. Co-authors A4 / M8 catalog UX copy if user supplies wording (Rule #20). | Phase A extension loader | B2-S1 (master split), B2-S5 (naming) |
| B1-M4 | M4 | 6 capabilities orphaned; link each to its realizing module via `domain_module_capabilities` rows. Mechanical after B1-M1. | same loader | B1-M1 |
| B1-A4 | A4 / Rule #20 | `domains.catalog_tagline` and `catalog_description` empty. User-approved buyer-voice wording required per Rule #20 (no auto-write). | PATCH after user supplies text | user wording |
| B1-B4 | B4 | Both masters have all three pattern flags false; no positive re-evaluation on record. Pattern proposal in B2-S3 (carried). | PATCH after B2-S3 answers | B2-S3 |
| B1-B6 | B6 | Zero intra-domain `data_object_relationships`. Required edge: `remote_sessions produces session_recordings`. Cardinality (1:0..1 or 1:N) is a user decision. | INSERT one relationship row | user cardinality pick |
| B1-B8 | B8 | Zero cross-domain `data_object_relationships`. Outbound edges owed: `remote_sessions references msp_tickets` (h.163 / 647), `remote_sessions resolves service_incidents` (h.162 / 646), `remote_sessions generates_billing_for msp_time_entries` (h.163), plus GRC-targeted edges if target masters land (Bucket 3). | INSERT 3-5 cross-domain relationship rows | B1-M1 (anchor cross-domain rels at module FK once available); GRC edges additionally blocked on B3 |
| B1-B10b | B10b | All 6 outbound handoffs (162, 163, 164, 646, 647, 648) carry NULL `source_domain_module_id`; inbound 160 carries NULL `target_domain_module_id`. Standard B10b backfill after M1 lands. | focused loader | B1-M1 |
| B1-B11 | B11 | Zero `data_object_aliases` on both masters. Synonym candidates listed in prior audit; the user has to confirm the exact tuple set per Rule #15 spirit (alias names are commerce-shaped but tuple choice is editorial). | INSERT 6-8 alias rows | user tuple confirmation |
| B1-B12 | B12 | Zero lifecycle states on either master. State proposals in B2-S2. Workflow-gate permission prefix uses the realizing module's `domain_module_code` per Rule #14. | INSERT lifecycle states + workflow-gate flags | B1-M1, B2-S2 |
| B1-F-RETIRE | F1 / F2 / F3 / F7 | Once per-module system skills land (B1-M1 plus a Phase-S load), retire legacy skill 100 + its 4 `skill_tools`. Re-author replaces `send_email` + `post_chat_message` with `notify_person` (or `notify_team` if broadcast, Channel vs capability rule). | DELETE legacy skill, INSERT per-module skills | B1-M1 |
| B1-REG | H1 regulation / `domain_regulations` empty | Zero `domain_regulations`. Candidates: HIPAA Security Rule, PCI-DSS 8.2 / 10.7, SOX audit-trail. Applicability scoping is B2-S4. | INSERT 3 regulation rows | B2-S4 |

#### APQC TAGGING (no new rows this Audit)

All 7 cross-domain handoffs already carry `handoff_processes` rows (per Continuation). Approved-count remains 0; agent_curated is 7/7. This is a Bucket 2 follow-up: the user has to approve the existing tags before the catalog-quality headline (approved count) moves off zero. No new agent_curated rows authorable this pass.

### Bucket 2 — Surface-for-user (judgment calls) (5, carried unchanged)

1. **B2-S1** — Should `remote_sessions` split into `attended_sessions` + `unattended_sessions` as separate masters, or stay one master with a `session_mode` discriminator? Options: (a) one master + mode; (b) split; (c) defer. Drives B1-M1 module-DMDO shape.
2. **B2-S2** — Lifecycle-state proposals for `remote_sessions` and `session_recordings`. Per-state + per-gate yes/no on the proposed states (`requested, consent_pending, connected, privileged, ended`; `recording, archived, retention_lock, expired`). Drives B1-B12.
3. **B2-S3** — B4 pattern flags positive re-eval. Per-flag yes/no on `has_personal_content` / `has_submit_lock` / `has_single_approver` for each master. Drives B1-B4.
4. **B2-S4** — Regulation scoping. Which of HIPAA / PCI-DSS / SOX apply, and with what `applicability`. Drives B1-REG.
5. **B2-S5** — Module-naming choice. (a) ATTENDED / UNATTENDED / GOVERNANCE (matches capability codes); (b) SUPPORT / PLATFORM / COMPLIANCE (matches vendor positioning); (c) other. Drives B1-M1.

Approve existing `handoff_processes` rows (7 currently `record_status='new'`)? This is a sixth potential Bucket 2 item; surfacing under H1.

### Bucket 3 — Phase 0 pending (speculative) (9, carried unchanged)

| ID | Candidate entity | Vendor basis | Verification |
|---|---|---|---|
| B3-S1 | `endpoint_devices` | TeamViewer Devices, AnyDesk Address Book, Splashtop Computers, ScreenConnect Sessions, RealVNC Connections | Vendor API docs |
| B3-S2 | `endpoint_groups` | TeamViewer Groups, ScreenConnect Group Path, RealVNC Teams, BeyondTrust Jump Groups | Vendor docs |
| B3-S3 | `access_policies` | TeamViewer Tensor Policies, BeyondTrust Group Policies, AnyDesk Custom Clients, ScreenConnect Roles | Vendor docs |
| B3-S4 | `privilege_elevations` | AnyDesk, ScreenConnect Privileged Mode, BeyondTrust Privileged Remote Access | Vendor docs |
| B3-S5 | `file_transfers` + `clipboard_transfers` | All flagship products | Vendor audit-trail docs |
| B3-S6 | `consent_records` | TeamViewer / AnyDesk attended prompts; BeyondTrust customer-side click-to-allow | GDPR Art. 6 lawful-basis evidence |
| B3-S7 | `mfa_challenges` | BeyondTrust, TeamViewer Tensor, GoTo Resolve | Vendor compliance docs |
| B3-S8 | `relay_nodes` | TeamViewer Master Servers, AnyDesk On-Premises, BeyondTrust Appliances, RealVNC Cloud Connections | Vendor architecture docs |
| B3-S9 | `recording_retention_policies` | BeyondTrust + TeamViewer Tensor | HIPAA / PCI / SOX retention docs |

### Cross-bucket dependencies

- B1-M1 is the critical-path gate. B1-M4, B1-B8 (cross-domain anchoring), B1-B10b, B1-B12, and B1-F-RETIRE all block on it.
- B2-S1 + B2-S5 feed into B1-M1's shape; resolve before the Phase A extension loader runs.
- B2-S2 feeds B1-B12; B2-S3 feeds B1-B4; B2-S4 feeds B1-REG.
- B2 items are independent of B3 (no cross-bucket dependency surfaced this Audit).
- Existing 7 `handoff_processes` rows at `record_status='new'` need user approval to move off the quality headline, this is a sixth potential Bucket 2 ask the user may want to resolve in flight.

### Decisions

(no Decisions taken this Audit run; surfacing for user.)

### Fixes applied this Audit

None. Structural re-classification only. Prior Continuation (2026-05-31) applied 13 writes; this Audit run reads live state and re-classifies under schema v2.
