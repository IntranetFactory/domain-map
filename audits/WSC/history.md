# WSC audit history

## 2026-05-30 ,  Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 3 full modules (`WSC-CHANNELS-CONVERSATIONS` 115, `WSC-HUDDLES-VOICE` 116, `WSC-EXTERNAL-COLLAB` 117); 8 masters (`chat_channels`, `chat_messages`, `chat_threads`, `chat_huddles`, `channel_members`, `external_guest_invitations`, `chat_message_attachments`, `channel_file_shares`); 7 capabilities; 8 solutions (7 primary + 1 partial); 12 trigger_events (ALL with empty `event_category`); 9 outbound + 1 inbound cross-domain handoffs; 12 aliases; 9 lifecycle states across 3 of 8 masters; 3 system skills + 18 skill_tools rows (strict Semantius score = 17/18 = 94%); 3 roles + 7 role_modules + 7 role_permissions; 1 regulation link (ADA).
- **Vendor-surface basis:** Slack, Microsoft Teams (chat surface), Google Chat, Mattermost, Rocket.Chat, Cisco Webex (chat surface), Zoom Team Chat. Microsoft Viva Connections is flagged as a partial match (questionable, see B2-S5).
- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO into WSC | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| IGA | 3 | 0 | 0 (WSC consumes iga_access_requests / iga_provisioning_events / iga_access_certifications via relationships) | 3 | 6 | Pairwise (full) |
| ECM | 2 | 0 | 0 (WSC consumes content_documents, document_folders via relationships) | 4 | 6 | Pairwise (full) |
| ITSM | 1 | 0 | 0 (WSC consumes service_incidents via relationship 296) | 1 | 2 | Lightweight |
| DLP | 1 | 0 | 0 (WSC consumes dlp_incidents via relationship 304) | 1 | 2 | Lightweight |
| CCAAS | 1 | 0 | 0 (WSC consumes support_sessions via relationship 302) | 1 | 2 | Lightweight |
| MSP-PSA | 1 | 0 | 1 (MSP-PSA-SVC-DESK consumer on chat_messages) + 1 rel (msp_tickets) | 3 | Lightweight |
| WORK-MGMT | 0 | 1 | 0 (no WSC DMDO on work_automations) + 1 rel (work_automations posts_to chat_channels) | 2 | Lightweight |
| KMS | 0 | 0 | 0 | 0 (handoff narrative mentions KMS extraction but no row) | 0 | none |
| COLLAB-GOV | 0 | 0 | 0 | 0 (similar narrative-only) | 0 | none |

Structural pass bands: **A1 / A2 / A3 / M1 / M2 / M4 / M6 / M7 / C1 / E1-E5 / F1-F5** pass cleanly; **B1 / B2 / B3** pass; **B6 / B8 / B11** mostly pass; **B7 hard-fail** (all 9 user-edges use noun-phrase form rather than verb-shape, matching the APM B1-S4 anti-pattern); **B9 partial-fail** (every single trigger_event has empty `event_category`, violating Rule #13); **B9b hard-fail** (zero intra-domain cross-module handoffs despite 3 modules with clear cross-module flows: 115→116 huddle-from-channel, 115→117 invite-from-channel); **B10b hard-fail** (1 inbound handoff with NULL `target_domain_module_id` despite WSC being modularized ,  WSC owes the patch); **B12 partial** (5 of 8 masters legitimately exempt as config-shape, but the exemption is recorded in `data_objects.notes` rather than surfaced for user-approved tracking, violating Rule #15); **H1 hard-fail** (0 of 10 cross-domain handoffs carry a `handoff_processes` row; volume expectation 5-8 agent-curated tags from this audit).

Domain Semantius score across 3 system skills: **17 platform / 18 total = 94% strict**, **18 / 18 = 100% operational**. The single non-platform tool is `post_chat_message` (id 40, `coverage_tier='external'`) on skill 174. Per F7 the channel primitive is correctly justified ("Post IS the workflow") since WSC is the chat platform itself, but the score reflects the actual coverage tier.

Rule #15 sweep: **`data_objects.notes` populated on 5 of 8 masters** (chat_messages, chat_threads, channel_members, chat_message_attachments, channel_file_shares ,  all carry config-shape exemption text per the rescinded Rule #12 license); **`handoffs.notes` populated on 9 of 9 outbound and 1 of 1 inbound** (all variants of "target NULL until X is modularized" ,  the rescinded write-time license); **`skill_tools.notes` populated on 6 of 18 rows** (workflow-gate prefixes and channel-justification prose). All three are forbidden patterns under the current Rule #15.

### Vendor surface basis

Slack and Microsoft Teams chat are the dominant flagships; together they cover the durable substrate (channels, messages, threads, huddles, guest invites, file shares, retention). Google Chat and Webex Teams replicate the same surface in their respective ecosystems. Mattermost and Rocket.Chat are the on-prem / regulated-deployment specialists (the closest WSC has to compliance specialists, though formal compliance specialists like Symphony Communication Services in financial services are absent). Microsoft Viva Connections at coverage_level partial is questionable: Viva Connections is an intranet portal, not a chat surface, so the partial link may be a mis-assignment (see B2-S5).

### Bucket 1 ,  In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B9 / Rule #13 (hard fail)** | All 12 `trigger_events` rows on WSC masters carry empty `event_category` (909-920). The enum must be one of `lifecycle / state_change / threshold / signal`. Per the event names: `chat_channel.created` → `lifecycle`; `chat_channel.archived` → `state_change`; `chat_message.posted` → `lifecycle`; `chat_message.flagged` → `state_change`; `chat_thread.escalated_to_ticket` → `state_change`; `chat_huddle.started` → `lifecycle`; `channel_member.added` → `lifecycle`; `external_guest.invited` → `lifecycle`; `external_guest.access_revoked` → `state_change`; `chat_attachment.shared` → `lifecycle`; `channel_file_share.linked` → `lifecycle`; `msp_ticket.from_chat` → `state_change`. | PATCH each row's `event_category` per the mapping. 12 single-field PATCHes. |
| B1-S2 | **B7 (hard fail)** | All 9 `data_object_relationships` rows for user-edges (ids 287-295) use noun-phrase `relationship_verb` form (`"owned channels"`, `"created channels"`, `"posted messages"`, `"started threads"`, `"channel memberships"`, `"started huddles"`, `"uploaded attachments"`, `"shared files"`, `"issued invitations"`). Per the catalog convention (and the APM B1-S4 finding), verb-shape (`owns_channel`, `creates_channel`, `posts_message`, ...) is the correct shape; the noun-phrase form is legacy. Inverse verbs are also a mix: `is_owned_by` is verb-shape but most others are correct. | DELETE the 9 noun-phrase rows; INSERT 9 verb-shape replacements (verb-shape `relationship_verb` + correct `inverse_verb`). |
| B1-S3 | **B9b (hard fail)** | **Zero intra-domain cross-module handoffs.** WSC has 3 modules with obvious cross-module event flows. Expected intra-domain handoffs (derived from cross-module relationships 281 and 283, both anchored on `chat_channels` mastered in 115): (a) `115 → 116` on `chat_huddle.started` when a huddle is initiated inside a channel (the huddle DMDO master sits in 116, the channel master in 115); (b) `115 → 117` on `external_guest.invited` when a guest is invited into a channel context (guest master in 117, channel master in 115). The trigger_events 914 and 916 already exist; only the intra-domain handoff rows are missing. | Author 2 intra-domain handoff rows with `source_domain_id = target_domain_id = 75`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`, `notes=''` (per Rule #15). |
| B1-S4 | **B10b (hard fail)** | Inbound handoff 790 (WORK-MGMT → WSC on `work_automation.triggered`, payload `work_automations`) carries NULL `target_domain_module_id` even though WSC is fully modularized. Per B10b's deterministic derivation: the handoff payload is `work_automations` (id 246) which WSC does NOT declare any DMDO row on. Relationship 751 (`work_automations posts_to chat_channels`) implies the receiving module is `WSC-CHANNELS-CONVERSATIONS` (115), since `chat_channels` is mastered there. The B10b fix has two sub-cases: (a) ADD a `consumer + optional` DMDO row on `work_automations` in module 115 (preferred ,  captures the dependency), then PATCH 790's `target_domain_module_id = 115`; (b) accept the handoff as a domain-level signal (rare, only used when the receiving domain doesn't model the payload at all). Recommendation: (a). | INSERT 1 `domain_module_data_objects` row (module 115, data_object 246, role=`consumer`, necessity=`optional`); PATCH `handoffs.target_domain_module_id = 115` on row 790. Source side (`source_domain_module_id = 149`) is already populated. |
| B1-S5 | **B6 / B9b (in-scope)** | Cross-module `data_object_relationships` rows 281 (`chat_channels hosts chat_huddles`, 115→116) and 283 (`chat_channels invites external_guest_invitations`, 115→117) exist but lack the mirror intra-domain handoff rows surfaced in B1-S3. Loading B1-S3 closes this finding mechanically; listed here as the audit-time observation rather than a separate fix. | Resolved by B1-S3. |
| B1-S6 | **APQC TAGGING (H1 hard fail)** | 0 of 10 cross-domain handoffs (9 outbound + 1 inbound) carry a `handoff_processes` row. Per H1 volume expectation (0.5N to 0.8N for N=10), the audit must author 5-8 high-confidence proposals. The candidate proposals are listed in the APQC TAGGING table below. | Author the 8 high-confidence rows below, `proposal_source='agent_curated'`, `record_status='new'`. The remaining 2 (`chat_attachment.shared` to ECM, `channel_file_share.linked` ECM ,  no clean PCF, see deferred list) defer to Discover Pass 3. |
| B1-S7 | **B8 report-only** | Cross-domain `data_object_relationships` outbound from WSC are well-populated (rows 296, 297, 299, 300, 301, 302, 303, 304 cover handoffs 833/834/830/828/829/836/833 + inferred 832/835). No missing outbound rows surfaced. The inbound row 751 (`work_automations posts_to chat_channels`) covers handoff 790's payload. | No fix needed. Positive finding. |
| B1-S8 | **B10b report-only** | Of the 9 outbound handoffs, 6 carry NULL `target_domain_module_id` (828, 829, 832, 833 are NULL; 830 and 836 are populated, 831 is populated, 834 and 835 are populated). Per B10b's asymmetry rule the NULL belongs to the target domain's B10b ,  not WSC's to fix. The targets are ECM (×2: 828, 829), DLP (×1: 832), CCAAS (×1: 833). The DMDO consumer declarations these depend on must come from those domains' Phase-B passes. | Schedule b1 audits for ECM, DLP, CCAAS. The MSP-PSA target on row 835 IS populated (137) thanks to MSP-PSA-SVC-DESK's consumer DMDO on chat_messages. |
| B1-S9 | **Pairwise (Section 4 boundary integrity)** | Cross-domain relationships reference data_objects WSC doesn't master and other domains do (`iga_access_requests` 704, `iga_provisioning_events` 708, `iga_access_certifications` 705, `service_incidents` 47, `dlp_incidents` 330, `support_sessions` 256, `msp_tickets` 233, `content_documents` 429, `document_folders` 431, `work_automations` 246). None of these are declared as `embedded_master` / `contributor` / `consumer` DMDO rows on any WSC module. Per Rule #11 these are platform-mastered elsewhere so B5 doesn't flag them, but per Section 4 of pairwise reconciliation the consuming side (WSC) should declare the dependency. | Add `consumer + optional` DMDO rows on the relevant WSC module for each. The most defensible mappings (per the relationship's WSC-side anchor): module 115 declares consumers for `content_documents` (429), `document_folders` (431), `work_automations` (246); module 117 declares consumers for `iga_access_requests` (704), `iga_provisioning_events` (708); module 115 declares consumer for `iga_access_certifications` (705), `service_incidents` (47), `dlp_incidents` (330), `support_sessions` (256), `msp_tickets` (233). 10 DMDO rows total. |

#### APQC TAGGING (matches the SKILL anti-pattern: prior similar loads ship structural rows but zero tags)

| handoff_id | source → target | trigger_event | payload | Proposed PCF (process_name / external_id) | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 828 | WSC-CHANNELS-CONVERSATIONS → ECM | `chat_attachment.shared` | `chat_message_attachments` | Develop and manage content (21670 L3) | 428 | confident L3 |
| 829 | WSC-CHANNELS-CONVERSATIONS → ECM | `chat_channel.archived` | `chat_channels` | Deliver approved content / Control delivered content (21679/21683 L3) | 429 or 430 | needs PCF lookup |
| 830 | WSC-EXTERNAL-COLLAB → IGA | `external_guest.invited` | `external_guest_invitations` | Manage IT user identity and authorization (20756 L3) | 273 | confident L3 |
| 831 | WSC-CHANNELS-CONVERSATIONS → IGA | `channel_member.added` | `channel_members` | Manage IT user identity and authorization (20756 L3) | 273 | confident L3 |
| 832 | WSC-CHANNELS-CONVERSATIONS → DLP | `chat_message.posted` | `chat_messages` | Review and monitor physical and logical IT data security measures (20739 L4) | 1179 | confident L4 |
| 833 | WSC-CHANNELS-CONVERSATIONS → CCAAS | `chat_thread.escalated_to_ticket` | `chat_threads` | Manage customer service problems, requests, and inquiries (10388 L3) | 196 | confident L3 |
| 834 | WSC-CHANNELS-CONVERSATIONS → ITSM | `chat_thread.escalated_to_ticket` | `service_incidents` | Triage IT service delivery incidents (20903 L4) | 1299 | confident L4 |
| 835 | WSC-CHANNELS-CONVERSATIONS → MSP-PSA | `msp_ticket.from_chat` | `chat_messages` | Manage customer service problems, requests, and inquiries (10388 L3) | 196 | confident L3 |
| 836 | WSC-EXTERNAL-COLLAB → IGA | `external_guest.access_revoked` | `external_guest_invitations` | Manage IT user identity and authorization (20756 L3) | 273 | confident L3 |
| 790 | WORK-MGMT → WSC-CHANNELS-CONVERSATIONS | `work_automation.triggered` | `work_automations` | (no clean PCF: WSC-side bot/automation post is a modern digital concept) | ,  | deferred to Discover Pass 3 |

#### Bucket 1 counts by finding type

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (B7 + B9 + B9b + B10b) | 4 |
| BOUNDARY (B6 absorbed, B8 report-only, B10b report-only, Pairwise) | 4 |
| APQC TAGGING (high-confidence) | 1 (covers 9 confident tags + 1 deferral as a single load) |
| **Bucket 1 total** | **9** |

### Bucket 2 ,  Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #15 notes-pollution on `handoffs`** ,  9 of 9 outbound and 1 of 1 inbound handoff rows for WSC carry populated `notes` carrying variants of `"target NULL until X is modularized"` or `"target NULL: ITSM is modularized but declares no consumer DMDO on chat_threads; pending ITSM Phase-B extension"`. Rule #15 rescinded the prior license to author this provenance trailer at write time. The audit obligation per Rule #15 is "revert the polluting writes" + log a Rule-#15 incident. Were these notes user-approved at load time, or auto-populated by the loader? | Cannot tell from audit alone. The pattern matches the documented "forbidden patterns: 'until X is modularized'" verbatim, so this is almost certainly auto-population, but Rule #15 explicitly requires per-row user confirmation rather than agent-side inference. | (a) Confirm auto-population; PATCH all 10 rows to empty string and append a Rule-#15 incident entry to `references/skill-changelog.md`. (b) Confirm user-approved at load time; leave in place. |
| B2-S2 | **Rule #15 notes-pollution on `data_objects`** ,  5 masters carry populated `notes` recording the Rule-#12 config-shape exemption: `chat_messages` ("Config-shaped conversational record. ..."), `chat_threads` ("Lightweight message grouping. ..."), `channel_members` ("Membership presence. Add/remove is direct; ..."), `chat_message_attachments` ("Immutable artifact reference ..."), `channel_file_shares` ("Reference link to ECM-mastered content. ..."). Rule #15 specifically rescinded the prior Rule #12 license to write the config-shape exemption to `data_objects.notes`. Same audit obligation as B2-S1. | Same ,  load-time approval status unknown. | (a) Auto-written; PATCH to empty string and record the config-shape exemption decisions in this audit file instead (audit conversation IS the approved persistence surface per Rule #15). (b) User-approved at load time, leave. |
| B2-S3 | **Rule #15 notes-pollution on `skill_tools`** ,  6 of 18 `skill_tools` rows carry populated `notes`: 2 carry workflow-gate templated prefixes (`"Workflow gate (B12: chat_channels.archived)."`, `"Workflow gate (B12: external_guest_invitations.revoked)."`); 1 carries the F7 channel-primitive justification (`"Post IS the workflow: WSC is the chat platform itself, ..."` ,  which is exactly the per-row justification F7 mandates, but Rule #15 requires the wording be user-approved per row); the remaining 3 carry workflow-context descriptions (`"For out-of-channel notifications ..."`, `"Invite participants who are not currently in the channel."`, `"Guest-facing invitation email is required for the invite flow to complete."`). | Same load-time approval ambiguity. The F7 row is the most defensible ,  the rule mandates a per-row justification for channel-primitive linkage ,  but Rule #15 still requires user-approved wording. | (a) Auto-written; PATCH all 6 to empty string. For the F7 row (`post_chat_message`), the audit can record "Post IS the workflow" as the approved justification here instead of in the column. (b) User-approved at load; leave. (c) Partial: revert the 5 non-F7 rows; preserve the F7 row but with user-approved exact wording. |
| B2-S4 | **B4 pattern flag positive re-evaluation per Rule #12** ,  current flags: `chat_messages.has_personal_content=true`, `chat_threads.has_personal_content=true`, `chat_huddles.has_personal_content=true`, `chat_message_attachments.has_personal_content=true`, `external_guest_invitations.has_personal_content=true` (true on 5 of 8 masters). Every `has_submit_lock` and `has_single_approver` is false. Audit needs positive confirmation: should `chat_channels.has_personal_content=true` when DMs or private channels exist (today `chat_channels` is the join point for private-channel scope)? Should `channel_members.has_personal_content=true` (membership lists for sensitive channels)? Should any master flip `has_submit_lock=true` (e.g. an `archived` `chat_channels` should be immutable to posts)? | Pattern flags are workflow-shape judgments the user owns; default false doesn't establish review. Per Rule #15, recording the consideration in `notes` is forbidden. | Per-flag yes/no. The most plausible: `chat_channels.has_personal_content=true` (private-channel surface) and `chat_channels.has_submit_lock=true` (archived channels reject new posts). |
| B2-S5 | **A3 SCOPE ,  Microsoft Viva Connections as a WSC `partial` solution** ,  `solution_domains` row links solution 466 (Microsoft Viva Connections) to WSC at `coverage_level='partial'`. Viva Connections is Microsoft's intranet portal product (employee landing page, news, communities, employee experience) ,  it sits in the INTRANET domain (id 126), not in WSC. Microsoft Teams chat is already linked as `primary` (solution 360), which is the correct WSC vehicle for Microsoft's chat surface. The `partial` link from Viva Connections to WSC reads as scope-creep onto the WSC catalog. | Editorial decision on whether Viva Connections has enough chat surface to remain `partial` linked to WSC (it embeds Teams chat in some scenarios but does not own a chat surface itself). Likely DELETE. | (a) DELETE the `solution_domains` row (Viva Connections moves to INTRANET-only). (b) Leave as `partial` if the embedded Teams chat counts (the catalog convention has not invoked this; Slack is not double-linked to every domain that embeds its widget). |
| B2-S6 | **E6 permission-bundle drift hint** ,  `EMPLOYEE-COLLAB-USER` (10064) has `wsc-channels-conversations:manage` and `wsc-huddles-voice:manage` but NO `wsc-external-collab:*` permission. A typical end-user invites guests via WSC-EXTERNAL-COLLAB; the missing bundle row means guest invites are admin-only by default. Is that the intent (governance posture) or an unintended omission? Similarly `IT-EXTERNAL-COLLAB-STEWARD` (10063) has admin on 117 + manage on 115 but no row on 116; possibly correct (huddles are not the steward's surface), but worth confirming. | RBAC-design decision; depends on whether the org wants employees to self-serve guest invites. | (a) ADD `wsc-external-collab:read` (or `:manage`) to EMPLOYEE-COLLAB-USER. (b) Leave ,  guest invites are intentionally admin-only. (c) Different mapping (per-org). |

### Bucket 3 ,  Phase 0 pending (speculative)

Market knowledge sweep (no formal Phase 0 subagent run for this audit; surfacing candidates for vet-or-eyeball):

| ID | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-S1 | **MISSING `chat_reactions` / `chat_emoji_reactions` master** | Every flagship (Slack, Teams, Google Chat, Mattermost, Webex Teams) has a first-class emoji-reaction surface that drives engagement analytics, message-pinning heuristics, and reaction-policy gates (e.g. "🔥 reactions trigger HR review"). The current WSC footprint has no surface for this. | Phase 0 vendor docs (Slack `reactions.add`/`reactions.remove`, Teams Graph `messages/reactions`, Google Chat `Reaction` resource). High-confidence Core entity. |
| B3-S2 | **MISSING `direct_messages` / `direct_message_threads` masters (1:1 and group DMs)** | DMs are a structurally distinct surface from channel-based messaging in every flagship: separate permission model, separate retention defaults, separate guest-access rules, no channel context. The current footprint collapses everything onto `chat_messages` parented at a `chat_channel`, missing the DM/private-thread surface entirely. | Phase 0 should verify: are DMs modeled as a special-case `chat_channels` row (Slack's MPIM/IM channel types), or as a distinct master? If the former, the catalog still needs a discriminator field on `chat_channels` and DM-specific lifecycle/retention/guest rules. |
| B3-S3 | **MISSING `huddle_recordings` / `huddle_transcripts` masters** | Slack Huddles, Teams Meet, Webex, Zoom Team Chat all support recording + transcript generation. The current `chat_huddles` master only covers the session itself (scheduled → live → ended), not the recording/transcript artifacts that subsequently feed KMS extraction or DLP review. Compliance-regulated deployments (FINRA, MiFID II for finance) require recording capture as a separate master with its own retention. | Phase 0 should add `huddle_recordings` and `huddle_transcripts` as masters in module 116, plus lifecycle states for recording (started/in-progress/processed/expired). Adjacent to KMS extraction and DLP scanning handoffs. |
| B3-S4 | **MISSING `chat_apps` / `chat_app_installations` / `chat_workflows` masters** | The "platform" axis of WSC (Slack Apps, Teams Apps, Workflow Builder, Mattermost Plugins) is a substantial market surface ,  installed apps, bots, slash commands, custom workflows. None of this is in the current footprint. Modeling it likely requires a new module (e.g. `WSC-PLATFORM-APPS`) or fattening 115. | Phase 0 should verify whether this belongs as a third / fourth WSC module, whether it overlaps with WORK-MGMT (which already has `work_automations`), and whether the catalog needs a separate `EXT-APP-MARKETPLACE` domain. |

**Candidate missing domains queued separately** (via `append_missing_domain.ts`):

- **UCAAS** ,  Unified Communications as a Service. The meetings / video-conferencing surface (Zoom Meetings, MS Teams Meetings, Google Meet, Webex Meetings, Cisco BroadWorks, RingCentral) is structurally distinct from chat-anchored huddles. WSC handles chat-anchored voice/video drop-ins (huddles); a separate market handles scheduled multi-party meetings, telephony, contact-center bridging, and unified PBX. Vendor evidence and adjacency listed in the `_missing-domains.md` queue entry.

**Bucket 3 prompt:** vet via formal Phase 0 vendor research (a focused subagent producing `c:/tmp/WSC-phase0-2026-05-30.md` with vendor entity surfaces per row), or eyeball-mode (name which of B3-S1 / B3-S2 / B3-S3 / B3-S4 ring true and they become Bucket 1 items immediately)? Strongest signal is B3-S1 (`chat_reactions` ,  every flagship has it, zero downside to adding); B3-S3 (`huddle_recordings`/`huddle_transcripts`) is the highest-leverage for regulated deployments.

### Cross-bucket dependencies

- **B2-S1 / B2-S2 / B2-S3 (Rule #15 notes-pollution)** are independent of Bucket 3 ,  the questions are about load-time approval, not market surface.
- **B1-S4 / B1-S9 (consumer DMDOs on WSC for cross-domain payloads)** are independent of Bucket 3 ,  the relationships already exist in `data_object_relationships`; only the DMDO declarations are missing.
- **B2-S5 (Viva Connections solution_domains)** is independent of Bucket 3.
- **B3-S2 (DMs)** might inform B2-S4 (pattern flags on `chat_channels`): if DMs are modeled as a `chat_channels` discriminator, then `has_personal_content` definitely flips true.
- **B3-S3 (huddle_recordings)** has a Phase-0 dependency on UCAAS domain queueing: if UCAAS gets promoted, scheduled-meeting recordings live there, and `huddle_recordings` becomes WSC-specific to chat-anchored huddles only.

### Per-bucket prompts

**Bucket 1 ,  fix these now?** Reply: `all`, list (e.g. `S1, S2, S6`), or `skip`.

- **S1 (event_category PATCH on 12 events):** trivial, mechanical.
- **S2 (B7 user-edges DELETE + INSERT verb-shape on 9 rows):** mechanical, mirrors APM B1-S4.
- **S3 (B9b ,  2 intra-domain handoffs):** structural; depends on B2-S1's decision (the new rows will have `notes=''` per Rule #15 either way).
- **S4 (B10b ,  DMDO on `work_automations` + PATCH handoff 790):** mechanical.
- **S5 (resolved by S3):** no separate fix.
- **S6 (H1 APQC ,  9 confident `agent_curated` rows + 1 deferred):** load now or in a follow-up?
- **S7 (B8 report-only):** no action.
- **S8 (B10b report-only on ECM/DLP/CCAAS):** schedule b1 audits for those domains.
- **S9 (Pairwise ,  10 consumer DMDOs on WSC modules for cross-domain payloads):** mechanical; safe to batch.

**Bucket 2 ,  what's your call on each?** Per-item decisions, no batch.

- **B2-S1 / B2-S2 / B2-S3 (Rule #15 notes):** confirm auto-population vs user-approval per category. If auto, the agent reverts and logs an incident; if approved, agent leaves.
- **B2-S4 (pattern flags):** per-flag yes/no on `chat_channels.has_personal_content`, `chat_channels.has_submit_lock`, `channel_members.has_personal_content`.
- **B2-S5 (Viva Connections):** DELETE the `solution_domains` row or leave.
- **B2-S6 (EMPLOYEE-COLLAB-USER bundle):** add `wsc-external-collab:*` or leave admin-only.

**Bucket 3 ,  Phase 0 pending ,  vet or eyeball?** If eyeball, name which of B3-S1 to B3-S4 ring true.

### Report-only follow-ups (owed by other domains)

These items are surfaced by WSC's audit but the fix lives on another domain. Listed for visibility only; not blockers for WSC's pass.

| Owed by | What | Why |
|---|---|---|
| ECM | B9 inbound DMDO declaration on WSC outbound payloads (`chat_message_attachments`, `chat_channels`) | Handoffs 828, 829 carry NULL `target_domain_module_id` because ECM has no module declaring `consumer / contributor / embedded_master` on the two WSC masters. ECM's own b1 audit's B10b will surface this. |
| DLP | B9 inbound DMDO declaration on `chat_messages` | Handoff 832 carries NULL `target_domain_module_id` because DLP has no DMDO row on `chat_messages` (id 565). DLP's b1 audit's B10b will surface this. |
| CCAAS | B9 inbound DMDO declaration on `chat_threads` | Handoff 833 carries NULL `target_domain_module_id` because CCAAS has no DMDO row on `chat_threads` (id 566). CCAAS's b1 audit's B10b will surface this. |
| ITSM | B9 inbound DMDO declaration on `service_incidents` from chat (already populated as 38) but possible Phase-B extension to model the `chat_threads → service_incidents` linkage explicitly on its side | Handoff 834 IS populated (target=38). No fix owed; positive finding. Listed for completeness only. |
| WORK-MGMT | B9 source-side modularization | Inbound handoff 790 has source 149 populated, so this is also a positive finding; listed because WORK-MGMT may want to confirm `work_automations.triggered` fans out to other targets beyond WSC. |

## 2026-05-31, Continuation: B1 technical fixes

Subagent fix-loop pass: applied the audit-pre-specified subset of Bucket 1 that the agent prompt classifies as TECHNICAL (PATCH enum backfills with values named in the audit, derivable B10b FK PATCHes, INSERT `handoff_processes` rows where the audit pre-specifies a resolvable PCF, Rule #10 user-edge canonicalization, pairwise consumer DMDOs derivable from existing modules). All other B1 items deferred to human judgment.

Loader: `c:/dev/domain-map/.tmp_deploy/fix_wsc_b1_technical_2026_05_31.ts` (idempotent, can re-run).

### Fixes applied

| Audit ID | Operation | Rows touched | Outcome |
|---|---|---|---|
| B1-S1 | PATCH `trigger_events.event_category` per audit mapping on ids 909-920 (mix of `lifecycle` and `state_change`) | 12 | 12/12 populated, 0 still empty |
| B1-S2 | DELETE 9 noun-phrase user-edges (ids 287-295) + INSERT 9 verb-shape replacements from `users` (748) to each WSC master per audit naming (`owns_channel`, `creates_channel`, `posts_message`, `starts_thread`, `holds_membership`, `starts_huddle`, `uploads_attachment`, `shares_file`, `issues_invitation`) | 9 DELETE + 9 INSERT | 9 verb-shape rows post-load (ids 1953-1961); 0 noun-phrase rows remain |
| B1-S4 | INSERT `domain_module_data_objects` `(domain_module_id=115, data_object_id=246, role='consumer', necessity='optional')` then PATCH `handoffs.target_domain_module_id=115` on id 790 | 1 INSERT + 1 PATCH | DMDO created; handoff 790 now wired to module 115 |
| B1-S6 | INSERT 6 `handoff_processes` `agent_curated` rows where audit pre-specifies handoff_id + resolvable PCF and no existing row exists: (830, 273), (831, 273), (832, 1179), (834, 1299), (835, 196), (836, 273). Rows 828, 829, 833 already had `handoff_processes` rows from prior loads; left as-is. | 6 INSERT | 6/6 confirmed `agent_curated` |
| B1-S9 | INSERT 10 pairwise consumer+optional DMDO rows per audit's anchor mapping: module 115 consumes (429, 431, 246, 705, 47, 330, 256, 233); module 117 consumes (704, 708). Row (115, 246) collapsed with B1-S4. | 9 INSERT (1 deduped) | 10/10 target DMDO rows present post-load |

Totals: 13 PATCHes + 25 INSERTs + 9 DELETEs across `trigger_events`, `data_object_relationships`, `domain_module_data_objects`, `handoffs`, `handoff_processes`. No JWT-audience errors.

### Deferred

| Audit ID | Reason for deferral |
|---|---|
| B1-S3 | New `handoffs` row inserts (2 intra-domain handoffs). Agent prompt restricts new handoff INSERTs to `handoff_processes` tagging only where audit pre-specifies handoff_id + PCF; new `handoffs` table rows are outside the TECHNICAL scope. |
| B1-S5 | Resolved by B1-S3 per audit; defers with it. |
| B1-S6 row for handoff 790 | Audit explicitly defers (no clean PCF: "WSC-side bot/automation post is a modern digital concept"). |
| B1-S7 | Report-only; no action. |
| B1-S8 | Report-only; B10b NULL `target_domain_module_id` on 828, 829, 832, 833 owed by ECM / DLP / CCAAS b1 audits, not WSC's fix. |
| B2-S1, B2-S2, B2-S3 | Rule #15 notes-pollution reverts require user confirmation per the agent prompt (forbidden to write `notes` and reverts allowed only when audit pre-specifies row IDs; the audit identifies counts but not the exact row IDs being reverted, and these are Bucket 2 by the audit's own classification). |
| B2-S4 | Pattern-flag flips explicitly out of scope per agent prompt. |
| B2-S5 | `solution_domains` DELETE (Viva Connections) is a "user picks" Bucket 2 item. |
| B2-S6 | RBAC bundle change explicitly Bucket 2 user-decision. |
| All Bucket 3 | Phase 0 vendor research pending, requires new entity / market judgment. |

## 2026-05-31, Audit

### Summary

Validate b1 structural re-audit run after the 2026-05-31 Continuation fix-loop. Verifies which prior items closed via live state, surfaces persisting findings, and adds two newly-detected structural failures the prior run did not enumerate (A4 + M8 catalog UX fields, Rule #20).

- **Current footprint:** 3 full modules (WSC-CHANNELS-CONVERSATIONS 115, WSC-HUDDLES-VOICE 116, WSC-EXTERNAL-COLLAB 117); 8 masters (chat_channels 564, chat_messages 565, chat_threads 566, chat_huddles 567, channel_members 568, external_guest_invitations 569, chat_message_attachments 570, channel_file_shares 571); 7 capabilities; 8 solutions (7 primary + 1 partial); 12 trigger_events (ALL with valid event_category post-fix); 9 outbound + 1 inbound cross-domain handoffs; 12 aliases; 9 lifecycle states across 3 of 8 masters (chat_channels, chat_huddles, external_guest_invitations); 3 system skills + 18 skill_tools; 11 permissions (9 baseline + 2 workflow-gate); 3 roles + 7 role_modules + 7 role_permissions; 1 regulation link (ADA); 1 business_function link (End-User Computing, owner).
- **Bucket 1 (in-scope, agent fixable):** 4 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items (all carried from prior audit).
- **Bucket 3 (Phase 0 pending, speculative):** 4 items (carried from prior audit; no new vendor research run).

**Structural pass bands:** A1 / A2 / A3 / M1 / M2 / M4 / M6 / M7 / B5 / B7 / B9 / B10b (WSC-owed side) / B11 / C1 / E1-E5 / F1-F5 / H1 pass cleanly. **A4 hard-fail** (domain catalog_tagline and catalog_description both empty, Rule #20). **M8 hard-fail** (3 of 3 modules carry empty catalog_tagline and catalog_description, Rule #20). **B9b hard-fail** (still zero intra-domain cross-module handoffs; prior B1-S3 deferred). **B12 partial-fail** (5 of 8 masters still carry config-shape exemption text in `data_objects.notes`, violating Rule #15; prior B2-S2 deferred).

**Continuation closure verified (from 2026-05-31 fix-loop):**

| Prior ID | Closure check | Result |
|---|---|---|
| B1-S1 | `trigger_events?data_object_id=in.(564..571)` event_category all non-empty | PASS (12/12 valid) |
| B1-S2 | `data_object_relationships?data_object_id=eq.748` rows 1953-1961 verb-shape; 287-295 absent | PASS (9 verb-shape rows; legacy noun-phrase gone) |
| B1-S4 | DMDO (115, 246, consumer, optional) exists; handoffs.target_domain_module_id=115 on 790 | PASS (both confirmed live) |
| B1-S6 | handoff_processes rows on 9 of 10 cross-domain handoffs | PASS (handoffs 828/829/830/831/832/833/834/835/836 tagged; 790 deferred per prior audit) |
| B1-S9 | DMDO consumer+optional rows: module 115 on (47, 233, 246, 256, 330, 429, 431, 705) and module 117 on (704, 708) | PASS (10/10 present) |

**Semantius score (re-derived):** 17 platform + 1 external = 18 total skill_tools; strict = 17/18 = 94%, operational = 18/18 = 100%. The external tool is `post_chat_message` (id 40) on skill 174 (`coverage_tier='external'`), correctly justified per F7 (channel primitive: post IS the workflow).

**Rule #15 violations still live (not reverted in prior continuation):**

- `data_objects.notes` populated on 5 of 8 masters: chat_messages, chat_threads, channel_members, chat_message_attachments, channel_file_shares (all carry the rescinded Rule #12 config-shape exemption text).
- `handoffs.notes` populated on 9 of 10 cross-domain handoffs (handoff 790 also carries "target NULL until WSC declares a consumer DMDO on work_automations" which is now stale and incorrect given the B1-S4 fix wired the DMDO and target module).
- `skill_tools.notes` populated on 6 of 18 rows on skills 174/175/176 (workflow-gate prefixes, F7 channel-primitive justification, workflow-context prose).

These were Bucket 2 in the prior audit and remain Bucket 2 in this run.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-A4 | **A4 / Rule #20 (hard fail, new)** | `domains.catalog_tagline` and `domains.catalog_description` both empty on row 75 (WSC). Rule #20 requires a buyer-voice tagline (single sentence) and 1-3 paragraph buyer-voice description. Backfill is allowed under Rule #20 but requires draft + user review BEFORE writing. | Draft both fields in buyer voice for user review. Workflow + value: channel-based persistent chat, voice/video huddles, external guest collaboration. Surface drafts in chat; load only after user approves exact wording. |
| B1-M8 | **M8 / Rule #20 (hard fail, new)** | All 3 WSC `domain_modules` rows (115, 116, 117) carry empty `catalog_tagline` and `catalog_description`. Same Rule #20 obligation as A4 but at module grain. | Draft tagline + description per module (WSC-CHANNELS-CONVERSATIONS, WSC-HUDDLES-VOICE, WSC-EXTERNAL-COLLAB) in buyer voice for user review. Surface drafts in chat; load only after user approves each row's exact wording. |
| B1-B9b | **B9b (hard fail, carried as B1-S3)** | Still zero intra-domain cross-module handoffs. Cross-module `data_object_relationships` rows 281 (`chat_channels hosts chat_huddles`, anchored 115 to 116) and 283 (`chat_channels invites external_guest_invitations`, anchored 115 to 117) imply intra-domain handoff rows that do not exist. Carried from prior audit's B1-S3; deferred in the 2026-05-31 fix-loop because new `handoffs` row INSERTs were outside the technical scope. | Author 2 intra-domain handoff rows with `source_domain_id = target_domain_id = 75`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`, `notes=''` per Rule #15: (a) `source_domain_module_id=115, target_domain_module_id=116, trigger_event_id=914 (chat_huddle.started), data_object_id=567`; (b) `source_domain_module_id=115, target_domain_module_id=117, trigger_event_id=916 (external_guest.invited), data_object_id=569`. |
| B1-H790 | **H1 deferred (carried)** | Inbound handoff 790 (WORK-MGMT to WSC, `work_automation.triggered`, payload `work_automations`) has no `handoff_processes` row. Prior audit deferred to Discover Pass 3 (no clean APQC PCF match: bot/automation-post workflow). The deferral stands. | No fix in scope of this audit. Track as Discover Pass 3 custom-process candidate. |

#### Bucket 1 counts by finding type

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A4 + M8 + B9b + H790-deferred) | 4 |
| BOUNDARY (WSC-owed B10b closed last pass; foreign-owed listed separately) | 0 |
| APQC TAGGING (new high-confidence proposals) | 0 |
| MODULARIZATION ISSUES | 0 (always 0 in Bucket 1) |
| **Bucket 1 total** | **4** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #15 notes-pollution on `handoffs` (carried).** 9 of 9 outbound and 1 of 1 inbound WSC cross-domain handoffs still carry populated `notes` with the rescinded "target NULL until X is modularized" provenance text. Handoff 790's note is now also stale (the DMDO was added by B1-S4). | Per Rule #15, reverts to empty string need per-row user approval; the audit can confirm the violation but cannot unilaterally PATCH the column. | (a) Approve revert of all 10 rows to empty string and log a Rule-#15 incident entry in references/skill-changelog.md. (b) Leave in place. (c) Partial: approve revert on the 9 stale "X is modularized" rows; leave handoff 790's note for a separate decision. |
| B2-S2 | **Rule #15 notes-pollution on `data_objects` (carried).** 5 masters still carry the rescinded Rule #12 config-shape exemption text in `notes`: chat_messages, chat_threads, channel_members, chat_message_attachments, channel_file_shares. | Same per-row approval requirement as B2-S1. | (a) Approve revert of 5 rows to empty string; track the config-shape exemption decisions in this history.md narrative instead. (b) Leave in place. |
| B2-S3 | **Rule #15 notes-pollution on `skill_tools` (carried).** 6 of 18 `skill_tools` rows on skills 174/175/176 carry populated `notes`: 2 workflow-gate prefixes, the F7 channel-primitive justification on `post_chat_message` (id 40), and 3 workflow-context lines on `notify_person` rows. | Per-row approval required. | (a) Approve revert of all 6 rows to empty string. For the F7 row, record the justification in this history.md instead. (b) Leave in place. (c) Partial: revert 5 non-F7 rows; preserve F7 with user-approved exact wording. |
| B2-S4 | **B4 pattern flag re-evaluation (carried).** Current: chat_messages / chat_threads / chat_huddles / chat_message_attachments / external_guest_invitations carry `has_personal_content=true`. chat_channels, channel_members, channel_file_shares are all-false. No `has_submit_lock=true` and no `has_single_approver=true` on any WSC master. Should `chat_channels.has_personal_content=true` (private channels / DMs surface)? Should `chat_channels.has_submit_lock=true` (archived channels reject new posts)? Should `channel_members.has_personal_content=true` (sensitive-channel membership lists)? | Pattern-flag judgments are workflow-shape decisions the user owns; Rule #15 forbids recording the consideration in `notes`. | Per-flag yes/no. Likely affirmative on chat_channels (both flags) and channel_members (personal content). |
| B2-S5 | **A3 SCOPE, Microsoft Viva Connections as a WSC `partial` solution (carried).** `solution_domains` still links solution 466 (Microsoft Viva Connections) to WSC at `coverage_level='partial'`. Viva Connections sits semantically in INTRANET (domain 126). | Editorial decision. | (a) DELETE the `solution_domains` row (Viva moves to INTRANET-only). (b) Leave as `partial`. |
| B2-S6 | **E6 permission-bundle drift hint (carried).** `EMPLOYEE-COLLAB-USER` (10064) holds `wsc-channels-conversations:manage` and `wsc-huddles-voice:manage` but no `wsc-external-collab:*` row. `IT-EXTERNAL-COLLAB-STEWARD` (10063) holds `wsc-channels-conversations:manage` and `wsc-external-collab:admin` but no row on WSC-HUDDLES-VOICE. | RBAC bundle design decision. | (a) ADD `wsc-external-collab:read` (or `:manage`) to EMPLOYEE-COLLAB-USER. (b) Leave (guest invites admin-only by intent). (c) Different mapping. Same per-row choice for the steward gap on WSC-HUDDLES-VOICE. |

### Bucket 3, Phase 0 pending (speculative)

Carried verbatim from the prior audit; no new Phase 0 subagent run in this audit pass.

| ID | Candidate | Vendor knowledge basis | Verification path |
|---|---|---|---|
| B3-S1 | `chat_reactions` / `chat_emoji_reactions` master | Every flagship (Slack, Microsoft Teams, Google Chat, Mattermost, Cisco Webex Teams) has a first-class emoji-reaction surface. | Phase 0 vendor docs (Slack `reactions.add`, Microsoft Teams Graph `messages/reactions`, Google Chat `Reaction`). |
| B3-S2 | `direct_messages` / `direct_message_threads` masters | DMs are a structurally distinct surface from channel-based messaging in every flagship: separate permission model, retention defaults, guest-access rules. | Phase 0: are DMs modeled as a special-case `chat_channels` row (Slack MPIM/IM types) or as a distinct master? |
| B3-S3 | `huddle_recordings` / `huddle_transcripts` masters | Slack Huddles, Microsoft Teams Meet, Cisco Webex, Zoom Team Chat all produce recording + transcript artifacts. Regulated deployments (FINRA, MiFID II) require recording capture as a separate master. | Phase 0: add as masters in module 116 with lifecycle states (started/in-progress/processed/expired). |
| B3-S4 | `chat_apps` / `chat_app_installations` / `chat_workflows` masters | The platform axis (Slack Apps, Microsoft Teams Apps, Workflow Builder, Mattermost Plugins) is a substantial market surface absent from the catalog. | Phase 0: belongs as a third / fourth WSC module, or does it overlap with WORK-MGMT (`work_automations`) sufficiently to defer? |

### Cross-bucket dependencies

- **B1-A4 / B1-M8 (catalog UX backfill)** are independent of Bucket 2 and Bucket 3. Both require user-reviewed buyer-voice drafts before writing.
- **B1-B9b (intra-domain handoffs)** is independent of the carried Rule #15 questions (the new rows ship with `notes=''` either way).
- **B2-S1 / B2-S2 / B2-S3 (Rule #15 reverts)** are independent of Bucket 3.
- **B3-S2 (DMs)** may inform B2-S4 (`chat_channels.has_personal_content` flips definitively true if DMs are a `chat_channels` discriminator).
- **B3-S3 (huddle_recordings)** has a forward dependency on UCAAS queueing (see prior _missing-domains.md entry).

### Per-bucket prompts

**Bucket 1, fix these now?** Reply: `all`, list (e.g. `A4, M8`), or `skip`.

**Bucket 2, what's your call on each?** Per-item decisions, no batch.

**Bucket 3, Phase 0 pending, vet or eyeball?** If eyeball, name which of B3-S1 / B3-S2 / B3-S3 / B3-S4 ring true.

### Report-only follow-ups (owed by other domains)

| Owed by | What | Why |
|---|---|---|
| ECM | DMDO declaration on `chat_message_attachments` (570) and `chat_channels` (564); B10b PATCH on handoffs 828, 829 | target_domain_module_id NULL on both. ECM's b1 audit B10b should surface this. |
| DLP | DMDO declaration on `chat_messages` (565); B10b PATCH on handoff 832 | target_domain_module_id NULL. DLP's b1 audit B10b. |
| CCAAS | DMDO declaration on `chat_threads` (566); B10b PATCH on handoff 833 | target_domain_module_id NULL. CCAAS's b1 audit B10b. |
| WORK-MGMT | `trigger_events.event_category` on event 870 (`work_automation.triggered`) is empty | The event sources from WORK-MGMT (used by WSC inbound handoff 790). WORK-MGMT's b1 audit B9 will surface. |

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
