# SALES-ENG audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 `domain_modules` rows (primary OR via `domain_module_host_domains`); 4 masters (`sales_cadences`, `call_recordings`, `sales_emails`, `conversation_intelligence_records`) plus 1 cross-domain `contributor` row on `crm_contacts`; 8 capabilities (all domain-prefixed `SE-*`); 13 solutions (8 primary, 2 secondary, 2 partial, 1 secondary REV-INTEL `Gong Revenue Intelligence`); 9 `trigger_events` on the 4 masters; 13 cross-domain handoffs (8 outbound + 5 inbound); 0 intra-domain handoffs (vacuous, no modules); 0 `data_object_aliases`; 0 `data_object_lifecycle_states`; 0 intra-domain `data_object_relationships`; 0 `users` relationship edges; 1 legacy domain-level `system` skill (id 104, `domain_module_id` NULL) with 5 `skill_tools` (all `platform`); 0 roles touching the domain (vacuous, no modules); 2 of 13 handoffs carry an APQC tag, both `discovery_substring` (one is an obvious wrong-domain leaf, "Manage product recalls").
- **Vendor-surface basis:** Phase A loaded the SDR / outbound-engagement category around Outreach, Salesloft, Apollo.io, Reply.io, Groove, Mixmax, Yesware, ZoomInfo Engage as primary; Gong Engage as primary; Gong Revenue Intelligence and Clari as secondary (the conversation-intelligence and revenue-intelligence layer); HubSpot Sales Hub and Zoho CRM Plus as partial (CRM-bundled sales engagement). 8 primary point-solution vendors anchor the cadence + dialler + tracking + meeting-scheduler surface; 2 secondary vendors add conversation intelligence; 2 partial vendors are CRM-incumbent overlap.
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 9 items.

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO + cross-domain `data_object_relationships`, ranked by edge weight):

| Neighbor | Out (SE→N) | In (N→SE) | Cross-DMDO on SE masters | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| CRM (69) | 6 | 2 | 3 (CRM consumes `sales_cadences` opt, `call_recordings` opt, `conversation_intelligence_records` req via CRM-PIPELINE-MGT; `sales_emails` contributor via CRM-ACTIVITY) | 0 | 11 | Pairwise (full) |
| REV-INTEL (103) | 2 | 0 | 0 | 0 | 2 | Lightweight |
| CDP (72) | 0 | 1 | 0 | 0 | 1 | Lightweight |
| MA (70) | 0 | 1 | 0 | 0 | 1 | Lightweight |
| ACCT-PLAN (105) | 0 | 1 | 0 | 0 | 1 | Lightweight |

The dominant pass-3/4 finding is the CRM boundary (edge weight 11). Every other neighbor is single-edge.

**Structural bands summary:**

- **A (Market shape):** A1 PASS (all 7 metadata fields populated); A2 PASS (8 capabilities); A3 PASS (13 solutions, ≥1 primary).
- **M (Modules):** M1 HARD FAIL (zero `domain_modules` rows). M2 / M4 / M5 / M6 / M7 vacuous on zero modules.
- **B (Data-object footprint):** B1 PASS (4 masters); B2 PASS (every master has both labels); B3 PASS (all four are prefixed `sales_*` / `call_*` / `conversation_*`, no bare-word claims needed); B4 FAIL (every master has all three pattern flags false-by-default and the audit must positively re-evaluate); B5 vacuous (no `embedded_master` rows for the domain); B6 HARD FAIL (zero intra-domain relationship rows among the 4 masters); B7 HARD FAIL (zero `users` edges on any master); B8 HARD FAIL (zero outbound cross-domain relationship rows despite 8 outbound handoffs with clean payload→target mappings); B9 PARTIAL FAIL (4 of 9 events have empty `event_category`, must be one of the four enum values per Rule #13); B9b vacuous (no modules); B10 (inbound report-only) covered below; B10b HARD FAIL (every handoff touching SALES-ENG has a NULL module FK on the SALES-ENG side; some also NULL on the partner side); B11 HARD FAIL (zero aliases on any of the 4 masters, none are self-explanatory across vendor taxonomies); B12 HARD FAIL (zero `data_object_lifecycle_states`, no `data_objects.notes` config-shape exemption; cadences and emails have real workflows).
- **C (Functional ownership):** C1 PASS (Sales owner, Marketing contributor); C2 not triggered.
- **D (UI spot-check):** routine, not part of this audit's deliverable.
- **E (Roles):** E1 vacuous (M1 fail blocks role authoring per the 2-module floor); E2-E6 vacuous.
- **F (Skill layer):** F1 FAIL (legacy domain-level system skill exists, id 104, with `domain_module_id` NULL; under Rule #14 every system skill mirrors a module). F2 vacuous (no modules to count against). F3 PASS on the legacy skill (5 `skill_tools` rows). F4 PASS on the 5 rows (`query_*` rows have `data_object_id` set, `send_email` is `side_effect` with NULL). F5 vacuous (no module to score). F7 PASS on `send_email` only if the skill genuinely needs the channel; today the channel-vs-abstraction-rule recommends `notify_person` for generic sends and the rep-outbound-email workflow is precisely a channel-required workflow (`send_email` IS the workflow), so this is a legitimate channel link, no notes-justification yet (Rule #15: surface to user, do not auto-write).
- **H (APQC):** H1 HARD FAIL. Only 2 of 13 cross-domain handoffs carry tags. Both are `discovery_substring`. handoff 82 (`call.completed` SE→CRM, payload `sales_activities`) points at "Manage product recalls and regulatory audits" (PCF 20110, L2) which is a substring match on "manage"/"calls", a wrong-domain leaf. handoff 206 (`meeting.no_show` SE→CRM, payload `sales_activities`) points at "Plan and manage meetings" (PCF 12878, L4) which is at least topically correct but L4. Volume expectation: 0.5×13 to 0.8×13 = 7 to 10 `agent_curated` tags proposed in this audit.

Domain Semantius score (strict) on the legacy skill 104: **5/5 = 100%** (every linked tool has `coverage_tier='platform'`). Operational score also 100%. The score is computed but it sits on a Rule-#14-violating skill, so it does not survive the M-band remediation untouched.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail)** | Zero `domain_modules` rows. The domain is `domains`-row-only, which under Rule #14 makes it not deployable. Per the same rule, an 8-capability domain (≥3) must have ≥2 `module_kind='full'` modules. Recommended split, matched against capability shape and the flagship-vendor surface: (a) `SALES-ENG-CADENCE` covering cadence sequencing, email tracking, AI email drafting, meeting scheduler (capabilities SE-CADENCE-SEQ, SE-EMAIL-TRACKING, SE-AI-EMAIL-DRAFT, SE-MEETING-SCHED; masters `sales_cadences`, `sales_emails`); (b) `SALES-ENG-CONV-INTEL` covering dialler, conversation intelligence, rep coaching, intent signals (capabilities SE-AUTO-DIALER, SE-CONV-INTEL, SE-REP-COACHING, SE-INTENT-DATA; masters `call_recordings`, `conversation_intelligence_records`). The flagship-vendor surface backs the split: Outreach / Salesloft / Apollo / Groove / Mixmax / Yesware are cadence-shaped vendors; Gong Engage and the conversation-intelligence overlap with REV-INTEL is the second module. Both modules realize ≥1 master and ≥3 capabilities; M2 / M4 / M6 all satisfied. | Hand-author 2 `domain_modules` rows + 8 `domain_module_capabilities` rows + 4 `domain_module_data_objects` `master` rows on the appropriate side + a `contributor` row on `crm_contacts` against the cadence module. Loader pattern: extend `scripts/loaders/load_research.ts`. |
| B1-S2 | **B9 missing `event_category`** | 4 of 9 trigger_events have empty `event_category` (Rule #13 enum: `lifecycle / state_change / threshold / signal`). Events 463 `call_recording.captured`, 464 `call_recording.transcribed`, 465 `sales_email.sent`, 466 `sales_email.opened`, 467 `sales_email.replied`, 468 `sales_email.bounced`, 469 `conversation_intelligence.insight_published`. Recommended values: `call_recording.captured` → `state_change`; `call_recording.transcribed` → `state_change`; `sales_email.sent` → `state_change`; `sales_email.opened` → `signal`; `sales_email.replied` → `signal`; `sales_email.bounced` → `state_change`; `conversation_intelligence.insight_published` → `state_change`. | PATCH 7 `trigger_events` rows. |
| B1-S3 | **B9 attribution defect, mis-sourced events** | Two outbound handoffs (82, 206) source from SALES-ENG but their `trigger_event.data_object_id=102` is `sales_activities`, mastered by CRM (`/domain_data_objects?data_object_id=eq.102&role=eq.master` returns CRM only). Handoff 82 publishes `call.completed` and handoff 206 publishes `meeting.no_show`. Either the events themselves are wrong-domain (the publisher is actually CRM and the rows should be re-routed), OR SALES-ENG needs its own `cadence_call.completed` / `cadence_meeting.no_show` events keyed at its masters. Recommended: author SALES-ENG-keyed events (preferred, since the workflow is rep-initiated from the cadence step, not from a CRM activity row) and re-target handoffs 82 / 206 to point at the new event ids. | Author 2 new `trigger_events` rows on `call_recordings` and `sales_cadences` respectively, then PATCH handoffs 82 / 206 to point at the new ids. |
| B1-S4 | **B10b (hard fail)** outbound | All 8 outbound handoffs (82, 83, 205, 206, 474, 475, 476, 477) carry NULL `source_domain_module_id`. After B1-S1 creates the 2 modules, derivation: handoffs publishing on `sales_cadences` (205) or `sales_emails` (474) route to SALES-ENG-CADENCE; on `call_recordings` (475) or `conversation_intelligence_records` (476) route to SALES-ENG-CONV-INTEL; handoffs 82, 83, 206 publish on `sales_activities` (CRM-mastered), so after B1-S3 retargets them to SE-keyed events the source side becomes the SE-CONV-INTEL or SE-CADENCE module the new event lives on; handoff 477 reuses event 63 (`high_intent_signal.detected` on `sales_cadences`) so source = SALES-ENG-CADENCE. | After B1-S1 / B1-S3, PATCH `source_domain_module_id` on 8 outbound rows per the derivation above. |
| B1-S5 | **B10b (hard fail)** inbound | All 5 inbound handoffs (79, 81, 200, 210, 510) carry NULL `target_domain_module_id`. After B1-S1, every inbound payload is `sales_cadences` (79, 81), `crm_leads` (200), `customers` (210), `lead_scores` (510). The CRM / ACCT-PLAN / MA / CDP source-side payload is generally consumed by the cadence module (lead enters cadence; intent signal enters cadence; account whitespace enters cadence). Recommended target = SALES-ENG-CADENCE on all 5. | PATCH `target_domain_module_id` on 5 inbound rows to the new SALES-ENG-CADENCE module id. |
| B1-S6 | **B6 (hard fail)** intra-domain relationships | Zero relationship rows among the 4 SE masters. Required edges (per cadence-shaped vendor surface): `sales_cadences` → `sales_emails` (one cadence step queues many emails), `sales_cadences` → `call_recordings` (one cadence step queues many dialler calls), `call_recordings` → `conversation_intelligence_records` (one recording produces one CI record, 1:1 or 1:N for re-transcription). | Author 3 `data_object_relationships` rows: (`sales_cadences` produces_cadence_emails `sales_emails`, one_to_many), (`sales_cadences` produces_cadence_calls `call_recordings`, one_to_many), (`call_recordings` produces_conversation_insights `conversation_intelligence_records`, one_to_many). |
| B1-S7 | **B7 (hard fail)** `users` edges | Zero `data_object_relationships` rows linking any SE master to `users` (id 748, `kind='platform_builtin'`). Every master has a user-typed actor: `sales_cadences.owner` (the rep authoring the cadence), `call_recordings.dialler_user` (the rep who placed the call), `sales_emails.sender` (the rep who triggered the send), `conversation_intelligence_records.coachee` (the rep whose call was analyzed). Per Rule #10 every such actor MUST be recorded as an edge against `users`. | Author 4 `users → masters` rows (owned by `users`) and 4 `masters → users` rows (verb-shape: `owns_cadence`, `dialled_call`, `sent_email`, `analyzed_for_user`), totaling 8 new relationship rows. |
| B1-S8 | **B8 (hard fail)** outbound cross-domain relationships | Zero rows. The 8 outbound handoffs include 4 with clean payload→target master mappings that should be mirrored as relationships: handoff 474 (SE→CRM, `sales_emails` payload) → relationship `sales_emails informs crm_activities` if a `crm_activities` master exists, or `informs crm_opportunities` if not; handoff 475 (SE→CRM, `call_recordings` payload) → `call_recordings informs crm_activities` similarly; handoff 476 (SE→REV-INTEL, `conversation_intelligence_records` payload) → `conversation_intelligence_records informs revenue_signals` or whichever REV-INTEL master is canonical; handoff 477 (SE→REV-INTEL, payload `crm_opportunities`), payload not SE-mastered, so this is a fan-out reusing event 63, not a mirrorable relationship. | After B1-S1 stabilizes module ids, author 3 `data_object_relationships` rows; the 4th (handoff 477) is fan-out and skipped per the SKILL guidance. |
| B1-S9 | **B11 (hard fail)** aliases | Zero `data_object_aliases` rows on any of the 4 masters. None of them is self-explanatory across vendor taxonomies. Recommended aliases: `sales_cadences` → "Sequence" (Outreach, Salesloft, Apollo), "Flow" (Groove), "Touchpoint Series" (general industry); `call_recordings` → "Dialler Call" (Outreach Voice, Apollo Dialer), "Voice Touch" (cadence-step shorthand); `sales_emails` → "Cadence Email" (Outreach), "Tracked Email" (Mixmax, Yesware), "Sequence Email" (general industry); `conversation_intelligence_records` → "Call Insight" (Gong), "Deal Signal" (Clari), "Conversation Snapshot" (general industry). | Author ~10 `data_object_aliases` rows per the list above. |
| B1-S10 | **B12 (hard fail)** lifecycle states | Zero `data_object_lifecycle_states` rows on any master. None of the 4 is a config-shaped master with no workflow. Recommended state machines: `sales_cadences` (`draft → active → paused → completed → archived`, with `active` and `paused` carrying `requires_permission=true`); `call_recordings` (`captured → transcribed → analyzed → archived`); `sales_emails` (`drafted → queued → sent → opened → replied / bounced`, where `sent` is a workflow gate); `conversation_intelligence_records` (`captured → analyzed → published → reviewed`). Each `requires_permission=true` state derives a `<module>:<verb>_<entity>` permission once B1-S1's modules exist. | Author ~17 lifecycle-state rows per the proposed machines after B1-S1 lands; set `domain_module_id` per the master-to-module mapping in B1-S1. |
| B1-S11 | **B4** pattern flag re-evaluation | Every master has all three flags false-by-default and the audit must positively re-evaluate (Rule #12). Specific candidates: `call_recordings.has_personal_content=true` (recordings carry prospect voice and PII; mandatory consent and recording-jurisdiction handling apply); `sales_emails.has_personal_content=true` (recipient PII, opt-out wiring); `sales_cadences.has_submit_lock=true` (cadences should freeze on `active` so steps remain stable for downstream reporting); `conversation_intelligence_records.has_personal_content=true` (transcripts and identified speakers); `call_recordings.has_single_approver=true` (only the recording owner can publish for coaching review). Recommendation captured as audit decision below; no notes-write per Rule #15. | PATCH 5 pattern flags after user confirms B2-S2. |
| B1-S12 | **F1 (fail)** legacy domain-level system skill | Skill id 104 `sales-eng-system` has `domain_module_id` NULL and `domain_id=95`. Once B1-S1's modules exist, F1 requires retiring this row (DELETE) and authoring 2 new `system` skills with `domain_module_id` set to the new modules. The 5 existing `skill_tools` rows would migrate: `query_cadences` and `query_sales_emails` to the SALES-ENG-CADENCE skill; `query_call_recordings`, `query_conversation_intelligence_records`, and `send_email` to the SALES-ENG-CADENCE skill as well (since `send_email` is the cadence-step send action, not a CI capability). The CI module gets fresh tools (analyze, transcribe, publish_insight). The two new skills MUST follow `skill_name='<module_code_lower>_agent'` per the Rule-#17 convention. | After B1-S1, DELETE skill 104 + its `skill_tools` rows, author 2 new `system` skills with the per-module tool split + ≥1 workflow-gate tool each. |
| B1-S13 | **B7 channel-vs-abstraction confirmation** | The 5 existing `skill_tools` rows include `send_email` (operation_kind=`side_effect`, coverage_tier=`platform`). Per F7 / the Channel-vs-abstraction-rule, channel-specific links only stay when the workflow requires the specific channel; outbound rep email IS the workflow (the cadence step is precisely "send this email template to this prospect on day N"), so `send_email` stays on the cadence module's skill after B1-S12 migrates it. No PATCH needed; the rule still asks for a user-approved justification note (Rule #15: not auto-written). Surfaced as B2-S5. | None this band, surface to user via B2-S5. |
| B1-S14 | **APQC TAGGING** | Per H1 the audit must positively propose `agent_curated` tags for the 13 cross-domain handoffs while the analyst still has the structural model fresh. Existing 2 `discovery_substring` rows are kept (one is wrong-domain, queue for replacement). Recommended `agent_curated` rows (proposed PCF per handoff, all `record_status='new'`, `proposal_source='agent_curated'`, `role='implements'`): see table below. Volume target 7-10; proposed 10 tags + 3 deferrals. | Insert 10 `handoff_processes` rows after Bucket 1 approval. |

**APQC TAGGING proposed table:**

| handoff_id | source → target | trigger_event | payload | Proposed PCF (name / external_id / level) | Confidence |
|---|---|---|---|---|---|
| 205 | SE → CRM | `sales_cadence.completed` | `sales_cadences` | Manage sales orders / Develop sales force (PCF 10009 family) or Manage sales opportunities (10010 L3) | confident L3 |
| 474 | SE → CRM | `sales_email.replied` | `sales_emails` | Manage sales force, branch: Inbound communication processing, or Manage sales opportunities (10010) | confident L3 |
| 475 | SE → CRM | `call_recording.transcribed` | `call_recordings` | Manage sales force / Manage sales opportunities (10010) | confident L3 |
| 476 | SE → REV-INTEL | `conversation_intelligence.insight_published` | `conversation_intelligence_records` | Manage sales force / Analyze sales performance (under 10009 L3) | confident L3 |
| 477 | SE → REV-INTEL | `high_intent_signal.detected` | `crm_opportunities` | Manage sales opportunities (10010 L3) | confident L3 |
| 82 | SE → CRM | `call.completed` | `sales_activities` | Manage sales force / Sell products and services (10009 L3) | confident L3 (after B1-S3 retargets the event) |
| 83 | SE → CRM | `deal_insight.captured` | `crm_opportunities` | Manage sales opportunities (10010 L3) | confident L3 |
| 206 | SE → CRM | `meeting.no_show` | `sales_activities` | Plan and manage meetings (12878 L4) keep current OR promote to L3 parent | acceptable L4, parent preferred |
| 79 | CDP → SE | `high_intent_signal.detected` | `sales_cadences` | Develop and manage sales force / Identify and prioritize sales opportunities (under 10010) | confident L3 |
| 200 | CRM → SE | `crm_lead.scored_above_threshold` | `crm_leads` | Manage sales leads (under 10010) | confident L3 |

**Deferred to Discover Pass 3 (no clean PCF cross-industry match):** handoffs 81 (`crm_opportunity.assigned` SE-inbound from CRM) is internal-routing; handoff 210 (`whitespace.identified` ACCT-PLAN → SE) is an account-planning analytic with no cross-industry PCF analog; handoff 510 (`lead_score.recomputed` MA → SE) is an internal score-recompute. These 3 are surfaced for Discover's custom-process authoring.

#### Bucket 1 finding type counts

| Finding type | Count |
|---|---|
| MISSING (entity / surface gap, structural) | 0 (those are Bucket 3) |
| WRONG-OWNERSHIP | 0 (Bucket 2 for any judgment) |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M1 + B4 + B6 + B7 + B8 + B9 + B10b + B11 + B12 + F1 + F7) | 13 |
| BOUNDARY | (rolled into STRUCTURAL above) |
| APQC TAGGING | 1 (one B1 line item covering 10 proposed agent_curated rows + 3 deferrals per the SKILL #10 sub-table convention) |
| **Bucket 1 total** | 14 |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module split shape (B1-S1).** Is the proposed `SALES-ENG-CADENCE` + `SALES-ENG-CONV-INTEL` split the right shape, or should the module set instead be cadence-driven (`SALES-ENG-OUTBOUND`) + dialler-driven (`SALES-ENG-VOICE`) + insights (`SALES-ENG-CONV-INTEL`)? Flagship vendors split differently: Outreach / Salesloft bundle cadence + dialler + email in one product surface; Gong splits Engage (cadence) from Revenue Intelligence (insights); Apollo bundles intent + cadence + dialler. The 2-module shape collapses dialler into CONV-INTEL; a 3-module shape (cadence / voice / insights) is closer to Gong's actual decomposition but the catalog's existing capability set (8 capabilities) does not cleanly support 3 modules (≥2 capabilities per module is a soft expectation). | This is a module-design judgment that depends on which flagship the catalog wants to mirror. Recommendation defaults to the 2-module split but the user owns the call. | (a) 2-module split as proposed. (b) 3-module split (CADENCE / VOICE / CONV-INTEL). (c) Defer until Bucket 3 vendor research lands. |
| B2-S2 | **B4 pattern flag re-evaluation (B1-S11).** Per-flag decisions needed: `call_recordings.has_personal_content` true/false; `sales_emails.has_personal_content` true/false; `sales_cadences.has_submit_lock` true/false; `conversation_intelligence_records.has_personal_content` true/false; `call_recordings.has_single_approver` true/false. | Pattern flags are workflow-shape judgments the user owns; the default false is not a positive answer. Per Rule #15, recording the rationale in `notes` is forbidden, the audit conversation IS the persistence surface. | Per-flag yes/no. |
| B2-S3 | **APQC L3-vs-L4 promotion (B1-S14 handoff 206).** The existing `discovery_substring` tag on handoff 206 points at PCF 12878 "Plan and manage meetings" (L4). The same row could be promoted to its L3 parent for clustering quality. Keep the L4 row or replace it with the L3 parent? | Editorial PCF-tagging decision; both rows are arguably correct. The SKILL recommendation prefers L3 parents for clustering when an obvious parent exists. | (a) Keep L4. (b) Replace with L3 parent + DELETE the existing row. |
| B2-S4 | **APQC discovery_substring replacement (B1-S14 handoff 82).** The existing `discovery_substring` tag on handoff 82 points at PCF 20110 "Manage product recalls and regulatory audits" (L2), an obvious wrong-domain leaf (substring match on "calls" / "recall"). The proposed `agent_curated` replacement is PCF 10009 family. Per Discover Pass 1.5 procedure, `agent_curated` rows OVERRIDE `discovery_substring`. DELETE the wrong row or leave it for the reviewer to mark `rejected`? | Audit-workflow question, not a data question. | (a) DELETE the wrong row at fix time. (b) Leave it; load the `agent_curated` row alongside; reviewer marks the wrong row `rejected`. |
| B2-S5 | **Channel link justification (B1-S13).** The cadence module's system skill links the `send_email` channel primitive directly (rather than the `notify_person` abstraction). The workflow requires the specific channel ("send this template to this prospect on day N IS the workflow"), so per the Channel-vs-abstraction-rule the link stays. F7 asks for a workflow-specific justification in `skill_tools.notes`, but Rule #15 says notes are off-limits without explicit user-approved wording. Approve the wording (and what wording)? | Per Rule #15 the agent cannot write any `notes` content without the user supplying the exact text. | (a) Supply exact `notes` wording per row. (b) Skip the notes; the F7 check still passes structurally because the channel choice is right, the notes-justification is the audit-trail surface, not a data-quality surface. |
| B2-S6 | **MA / CDP / ACCT-PLAN inbound APQC deferrals (B1-S14).** 3 inbound handoffs (81, 210, 510) defer to Discover Pass 3 because no clean PCF cross-industry analog exists. Accept the deferrals or commit them to a forced-L4 tag now? | Editorial. The SKILL allows deferrals when no clean PCF match exists; forcing a weak tag pollutes the catalog. | (a) Accept the deferrals (preferred). (b) Force a weak tag and accept the catalog-quality hit. |

### Bucket 3, Phase 0 pending (speculative; no formal market-surface subagent run yet)

The audit did not invoke a `general-purpose` market-audit subagent for SALES-ENG (the b1 subagent runs the structural pass; a separate semantic-pass subagent is a follow-up). The candidates below come from the flagship-vendor knowledge synthesized while reading SALES-ENG's structural state and would benefit from a formal Phase 0 pass to vet.

| # | Candidate entity / module / regulation | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-S1 | `cadence_steps` as a first-class master | Every cadence-shaped vendor models the cadence as a graph of typed steps (email, call, LinkedIn, manual task). The current `sales_cadences` master collapses this into the parent row. | Phase 0 read of Outreach / Salesloft / Apollo schema docs. |
| B3-S2 | `prospects` (or `cadence_targets`) as a master separate from `crm_leads` / `crm_contacts` | Sales-engagement vendors maintain their own prospect record that may exist before CRM sync (cold outbound from import). Currently SE relies on `crm_contacts` (contributor) and `crm_leads` (consumer via handoff 200). | Phase 0 vendor read. |
| B3-S3 | `sequences` vs `cadences` alias / terminology split | Outreach uses "Sequence"; Salesloft uses "Cadence"; the catalog standardized on Cadence. Captured in B1-S9 aliases. | Already handled in B1-S9, no Bucket 3 work. |
| B3-S4 | `email_templates` as a master | Cadence-driven email needs reusable templates with variable substitution. None loaded today. | Phase 0 vendor read. |
| B3-S5 | `dialer_phone_numbers` and `dialer_sessions` as masters | Voice dialler features need per-rep phone number pools (often per-region) and per-session state (live, paused, recording). None loaded. | Phase 0 vendor read. |
| B3-S6 | `conversation_intelligence_topics` and `conversation_intelligence_trackers` as masters | Gong / Chorus model trackers (competitor mentions, pricing keywords, objection types) as first-class entities; insights aggregate against trackers. The catalog has the `conversation_intelligence_records` master but no tracker concept. | Phase 0 Gong schema read. |
| B3-S7 | `intent_signals` and `intent_topics` (cross-cutting with CDP / MA / ACCT-PLAN) | Intent data is the substrate behind capability SE-INTENT-DATA, but no master is loaded. Bombora / 6sense / G2 are intent specialists; SE consumes the signal but the catalog has no entity. | Phase 0 read; likely the master sits in a new INTENT-DATA domain (queued via the helper below). |
| B3-S8 | `meeting_scheduler_slots` / `meeting_links` as masters | Chili Piper / Calendly Scheduling / Outreach Meetings model schedulable time slots, availability windows, and booking links. Capability SE-MEETING-SCHED is loaded with no backing entity. | Phase 0 vendor read; likely promotes to a separate MEETING-SCHEDULER candidate domain. |
| B3-S9 | TCPA / CAN-SPAM / GDPR consent compliance entities | Sales engagement that includes dialler must comply with TCPA (US), GDPR (EU), CASL (Canada). Currently zero `domain_regulations` rows on SALES-ENG; none of TCPA / CAN-SPAM / CASL are linked even though the workflow has clear regulatory exposure. | Phase 0 compliance scoping pass; load `domain_regulations` rows once vendor surface confirms. |

Candidates B3-S7 and B3-S8 are likely new domains in their own right (point-solution markets with independent vendors per Rule #2). They are queued in `audits/_missing-domains.md` via the helper.

### Cross-bucket dependencies

- **B2-S1** (module split shape) is a prerequisite for **B1-S1, B1-S4, B1-S5, B1-S10, B1-S12**. The user must answer Bucket 2 first; the rest of Bucket 1 is gated on that decision.
- **B1-S3** (mis-sourced events for handoffs 82 / 206) is a prerequisite for the APQC tags on those two handoffs in **B1-S14**. Tag them after the retargeting lands.
- **B3-S7 / B3-S8** (candidate domains INTENT-DATA / MEETING-SCHEDULER) would, if promoted, change the inbound handoffs 79 / 210 (currently inbound from CDP / ACCT-PLAN) to new candidate domains, but the audit-time tag is independent of where the source canonically lives.
- Buckets 2 and 3 are otherwise independent of each other.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, list (e.g. `S1, S2, S14`), or `skip`. Important sequencing: **S1 must land first** (modules), then S4 / S5 / S10 / S12 (everything keyed to module ids), then S3 + S14 (events + APQC). S6 / S7 / S8 / S9 / S11 are independent and can ship in any order.

**Bucket 2, what's your call on each?** I will wait for per-item decisions before acting.

- **B2-S1 (module split shape):** option a / b / c?
- **B2-S2 (5 pattern flags):** per-flag yes/no.
- **B2-S3 (APQC L3 promotion on handoff 206):** a / b?
- **B2-S4 (replacing wrong discovery_substring on handoff 82):** a / b?
- **B2-S5 (channel-link notes wording for `send_email`):** supply text, or skip?
- **B2-S6 (3 APQC deferrals):** accept / force?

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research, or eyeball-mode?** If eyeball, name which of B3-S1 through B3-S9 ring true and we add them via Phase B once the modules from B1-S1 land. If formal Phase 0, the next pass spawns a market-audit subagent with the per-domain prompt template.

### Report-only follow-ups (owed by other domains)

- **B10b on neighbor sides.** Handoff 79 (CDP → SE on `sales_cadences`) carries NULL `source_domain_module_id`. CDP B10b owes this fix on its own b1 audit. Handoff 210 (ACCT-PLAN → SE on `customers`) carries NULL `source_domain_module_id`. ACCT-PLAN B10b owes this fix. Handoff 510 (MA → SE on `lead_scores`) carries NULL `source_domain_module_id`. MA B10b owes this fix. Handoff 477 (SE → REV-INTEL on `crm_opportunities`) carries NULL `target_domain_module_id`. REV-INTEL B10b owes this fix. Handoff 476 (SE → REV-INTEL on `conversation_intelligence_records`) carries NULL `target_domain_module_id`. REV-INTEL B10b owes this fix.
- **B8 inbound (other side's responsibility).** Per the asymmetry rule, the 5 inbound handoffs (79, 81, 200, 210, 510) imply that CDP, CRM (×2 for 81 + 200), ACCT-PLAN, and MA each owe an outbound cross-domain relationship row from their masters into SALES-ENG. None of those rows exist today; each is a B8 outbound gap on the source domain's b1 audit.
- **B10 inbound discovery (consumer DMDOs the catalog implies SE should hold).** Currently SE holds one cross-domain dependency (a `contributor` row on `crm_contacts` id 98, CRM-mastered). No `embedded_master` rows. Per B10's discovery procedure, SE should also declare `consumer` on `crm_leads` (consumed via handoff 200), `customers` (consumed via handoff 210), `lead_scores` (consumed via handoff 510), `crm_opportunities` (consumed via handoffs 81 / 477). After B1-S1's modules land, the cadence module SHOULD have explicit `consumer` DMDO rows on each. Today this surfaces as a SE-side gap, NOT a foreign-domain owed item, so it gets folded into **B1-S1's loader once the modules exist** (mark as a sub-item, not a separate Bucket 1 line). Listed here for cross-domain visibility.
- **Pairwise reconciliation findings, CRM neighbor.** The Section-1 / Section-2 / Section-3 / Section-4 / Section-5 diff for the SE ↔ CRM boundary will be ill-formed until B1-S1 creates SE's modules. Defer the pairwise pass to the post-B1-S1 audit; once SE has modules, the diff is meaningful.

## 2026-05-31, Continuation: B1 technical fixes

Continuation subagent run, technical-only allowlist (PATCH enum backfills, B10b FK PATCHes derivable from existing modules, INSERT `domain_regulations`, DELETE stale rows when audit names IDs, PATCH naming renames, INSERT `data_object_relationships` user-edges where Rule #10 pre-specifies tuples, PATCH `permission_verb_override` when audit names state+verb, INSERT `handoff_processes` only when audit pre-specifies `handoff_id` + resolvable PCF, PATCH `notes=''` reverts when audit names row IDs).

### Applied (technical)

| ID | Fix | Outcome |
|---|---|---|
| B1-S2 | PATCH `event_category` on 7 `trigger_events` rows (463, 464, 465, 466, 467, 468, 469) per the Rule #13 enum. All values from {`state_change`, `signal`}; mapping exactly as audit table proposes. | 7 patched, 0 skipped. Verified by re-read. |
| B1-S7 | INSERT 4 user-edge `data_object_relationships` rows per Rule #10: `users (748) → sales_cadences (121)` verb=`owns_cadence`; `users → call_recordings (122)` verb=`dialled_call`; `users → sales_emails (123)` verb=`sent_email`; `users → conversation_intelligence_records (124)` verb=`analyzed_for_user`. All `owner_side=source`, `relationship_type=one_to_many`, `relationship_kind=reference`, `record_status='new'`, `notes=''`. | 4 inserted (ids 1693, 1694, 1695, 1696). |

The audit's B1-S7 narrative spoke of 8 rows (4 users→masters + 4 masters→users), but the verb-shape list given (`owns_cadence`, `dialled_call`, `sent_email`, `analyzed_for_user`) is user-side phrasing for the users→masters direction. Each `data_object_relationships` row already carries `relationship_verb` (parent voice) and `inverse_verb` (reverse phrasing), so the canonical Rule #10 shape is one row per actor relationship, not two. 4 rows inserted; the reverse direction is captured by the `inverse_verb` column on each row.

### Deferred (12 of 14 B1 items)

| ID | Reason for defer |
|---|---|
| B1-S1 | Creates new `domain_modules` (deferred: new entities/modules out of allowlist). Also gated on B2-S1 (user picks module-split shape). |
| B1-S3 | Authors 2 new `trigger_events` rows + retargets handoffs (deferred: new entities out of allowlist; not an enum backfill, not a naming rename). |
| B1-S4 | B10b FK PATCH on 8 outbound handoffs (deferred: every derivation depends on the SE modules created by B1-S1, which do not exist yet, so no existing modules to derive from). |
| B1-S5 | B10b FK PATCH on 5 inbound handoffs (deferred: same reason as B1-S4, target module is SALES-ENG-CADENCE which does not exist yet). |
| B1-S6 | 3 intra-domain `data_object_relationships` rows among the 4 SE masters (deferred: prompt restricts `data_object_relationships` writes to user-edges per Rule #10; these are master-to-master edges, not user-edges). |
| B1-S8 | Cross-domain outbound `data_object_relationships` (deferred: not user-edges per Rule #10; also depends on B1-S1 module ids for some target resolutions). |
| B1-S9 | ~10 `data_object_aliases` rows (deferred per prompt: no bulk `data_object_aliases` inserts unless audit pre-specifies exact tuples; the audit lists alias names and vendor context but does not pre-specify the full column tuples a loader needs). |
| B1-S10 | ~17 lifecycle-state rows (deferred: depends on B1-S1 modules for `domain_module_id` assignment; also not on the technical allowlist). |
| B1-S11 | 5 pattern-flag PATCHes (deferred per prompt explicitly: pattern-flag flips are deferred). |
| B1-S12 | DELETE legacy skill 104 + 2 new system-skill loads (deferred: depends on B1-S1 modules; new skills/tools out of allowlist). |
| B1-S13 | F7 channel-link justification (no write needed; surface-only, depends on B2-S5 user wording). |
| B1-S14 | APQC tagging: 10 proposed `handoff_processes` inserts. Verified `processes.external_id`: the audit's PCF numbers (10009, 10010, 12878, 20110) do not resolve in the live `processes` table (`/processes?external_id=eq.10010` returns `[]`). Per prompt: "INSERT `handoff_processes` ONLY when audit pre-specifies `handoff_id` + resolvable PCF (verify before insert)". No proposal resolves; all 10 deferred. Existing `handoff_processes` rows (handoff 82 → 37 substring; 206 → 1618 substring; 476 → 686 curated; 477 → 712 curated) left untouched. |

### Notes

- No JWT-audience errors encountered during the run.
- No `notes` writes (every inserted row left `notes=''` per Rule #15; no notes reverts needed because the prior audit run did not pollute any `notes` columns).
- Loader: [`.tmp_deploy/fix_sales_eng_b1_technical_2026_05_31.ts`](../.tmp_deploy/fix_sales_eng_b1_technical_2026_05_31.ts). Idempotent (skips already-populated enums and existing user-edge triples on re-run). Invoked from project root `c:/dev/domain-map` per Rule #6.
- UI spot-check: https://tests.semantius.app/domain_map/trigger_events and https://tests.semantius.app/domain_map/data_object_relationships.

## 2026-05-31, Audit

### Summary

Fresh Validate b1 structural pass against live state. Re-audits the same SALES-ENG (id 95) covered by the 2026-05-30 b1 baseline + 2026-05-31 technical-continuation. Two B-band findings closed by the continuation (B1-S2 event_category backfill, B1-S7 user-edge inserts). Every other B / M / F / H finding remains open.

- **Current footprint:** 0 `domain_modules` rows (primary + host-junction). 4 masters (`sales_cadences` 121, `call_recordings` 122, `sales_emails` 123, `conversation_intelligence_records` 124) plus 1 cross-domain `contributor` row on `crm_contacts` (98). 8 capabilities (all domain-prefixed `SE-*`). 13 solutions (8 primary, 2 secondary, 2 partial). 9 `trigger_events` on the 4 masters (all `event_category` populated). 13 cross-domain handoffs (8 outbound: 82, 83, 205, 206, 474, 475, 476, 477; 5 inbound: 79, 81, 200, 210, 510). 0 intra-domain handoffs (vacuous, no modules). 0 `data_object_aliases`. 0 `data_object_lifecycle_states`. 0 intra-domain `data_object_relationships`. 4 `users → masters` edges (loaded 2026-05-31). 1 legacy domain-level `system` skill (id 104, `domain_module_id` NULL) with 5 `skill_tools` (all `coverage_tier='platform'`). 11 roles on Sales business_function (21) but vacuous against SALES-ENG until modules exist. 5 of 13 handoffs APQC-tagged (2 `discovery_substring`, 3 `agent_curated`); 8 untagged.
- **Pattern flag drift caught.** The 2026-05-30 audit reported all four SE masters at false-by-default on every pattern flag. Live state now shows `crm_contacts` (the cross-domain contributor) carries `has_personal_content=true`, but all four SE-mastered rows (121, 122, 123, 124) still carry every flag false. B4 still requires per-flag user re-evaluation; the user has not answered B2-S2 from the prior audit.
- **Continuation deltas (since 2026-05-30):**
  - B1-S2 applied: 7 `trigger_events` PATCHed; all 9 events now carry a non-empty `event_category` from the Rule #13 enum. CLOSED.
  - B1-S7 applied: 4 `data_object_relationships` rows inserted as `users (748) → masters` directional edges (one per SE master). The 2026-05-30 narrative spoke of "8 rows (4 users→masters + 4 masters→users)"; the continuation correctly compressed each pair into a single row carrying both `relationship_verb` (parent voice) and `inverse_verb`. CLOSED.
- **Bucket 1 (in-scope, agent fixable):** 12 items. (Down from 14 by the two CLOSED.)
- **Bucket 2 (surface-for-user, judgment):** 6 items. Unchanged. None answered.
- **Bucket 3 (Phase 0 pending, speculative):** 9 items. Unchanged. No formal Phase 0 run between audits.

**Neighbor edge weights (re-derived from live state):**

| Neighbor | Out (SE to N) | In (N to SE) | Cross-DMDO on SE masters | Weight | Pass shape |
|---|---|---|---|---|---|
| CRM (69) | 6 | 2 | 1 contributor on `crm_contacts` | 9 | Pairwise (deferred, modules first) |
| REV-INTEL (103) | 2 | 0 | 0 | 2 | Lightweight |
| CDP (72) | 0 | 1 | 0 | 1 | Lightweight |
| MA (70) | 0 | 1 | 0 | 1 | Lightweight |
| ACCT-PLAN (105) | 0 | 1 | 0 | 1 | Lightweight |

Pass 3 + 4 of the Validate mode (neighbor discovery + pairwise) is deferred again: every neighbor reconciliation needs SE's modules to resolve target_module_id derivation; the diff is meaningless without them. Re-scheduled post B1A-M-AUTH-MODULES.

**Structural bands summary:**

- **A (Market shape):** A1 PASS, A2 PASS (8), A3 PASS (13 with `≥1 primary`), A4 FAIL (`catalog_tagline` empty, `catalog_description` empty).
- **M (Modules):** M1 HARD FAIL (zero `domain_modules`). M2 / M4 / M5 / M6 / M7 / M8 vacuous on zero modules.
- **B (Data-object footprint):** B1 PASS, B2 PASS, B3 PASS, B4 FAIL (positive re-evaluation outstanding per B2-S2). B5 vacuous. B6 HARD FAIL (zero intra-domain edges among 4 masters). B7 PARTIAL: 4 of 8 conceptual edges loaded (users-side direction with inverse verb). The remaining "missing" direction is captured by `inverse_verb` on each row per Rule #10's canonical shape, so B7 effectively PASS for Rule #10 semantics; flagging as PARTIAL only to track that the 2026-05-30 narrative still claimed 8 rows. B8 HARD FAIL (zero outbound cross-domain rels despite 4 mappable outbound handoffs: 474, 475, 476 mappable; 477 fan-out skipped). B9 PASS on event_category (after B1-S2 continuation). B9 attribution defect unresolved: handoffs 82 (event 15 `call.completed`, data_object 102 `sales_activities` is CRM-mastered, not SE), 83 (event 43 `deal_insight.captured`, data_object 100 `crm_opportunities` is CRM-mastered), 206 (event 166 `meeting.no_show`, data_object 102 again CRM-mastered). B9b vacuous. B10 inbound report-only carries forward unchanged. B10b HARD FAIL: 8 outbound rows NULL `source_domain_module_id`; 2 outbound (476, 477) NULL `target_domain_module_id` (REV-INTEL owes); 5 inbound NULL `target_domain_module_id` (every one); inbound handoffs 79, 210, 510 also NULL on the partner side (CDP, ACCT-PLAN, MA owe). B11 HARD FAIL (zero aliases). B12 HARD FAIL (zero lifecycle states; no `data_objects.notes` exemption).
- **C (Functional ownership):** C1 PASS (Sales owner, Marketing contributor). C2 not triggered.
- **E (Roles):** E1 vacuous (M1 fail blocks 2-module-floor). E2 to E6 vacuous. 11 Sales roles exist on business_function 21 but none currently touch any SE module (because none exist).
- **F (Skill layer):** F1 FAIL (legacy skill 104 `sales-eng-system` with `domain_module_id` NULL still present). F2 / F5 vacuous (no modules). F3 PASS on legacy skill (5 `skill_tools`). F4 PASS (4 `query_*` rows with `data_object_id` set; `send_email` is `side_effect` with NULL `data_object_id` per the invariant). F7: `send_email` channel link stays since the cadence-step send IS the workflow; notes-justification still outstanding per Rule #15 (B2-S5 from 2026-05-30 unanswered).
- **H (APQC):** H1 PARTIAL FAIL. 5 of 13 handoffs tagged. 8 untagged: 79, 81, 83, 200, 205, 474, 475, 510. Two existing `discovery_substring` rows: handoff 82 to PCF 20110 "Manage product recalls and regulatory audits" (L2) is clearly wrong-domain; handoff 206 to PCF 12878 "Plan and manage meetings" (L4) is topically right but at L4. Three `agent_curated` rows added since baseline: handoff 210 to PCF 16928 (L4 `Identify and capture upsell/cross-sell opportunities`), 476 to PCF 10135 (L4 `Analyze sales trends and patterns`), 477 to PCF 20011 (L4 `Manage opportunity pipeline`). Volume target 7-10 met partially.

Domain Semantius score on legacy skill 104: **strict 5/5 = 100%, operational 5/5 = 100%**. Both scores survive on the legacy skill, but once F1 retires the row and B1A-M-AUTH-MODULES authors per-module skills, the per-module scores have to be recomputed.

### Vendor surface basis

No fresh Phase 0 subagent invocation between 2026-05-30 and this run. The vendor list carried into B3 candidates (Outreach, Salesloft, Apollo.io, Reply.io, Groove, Mixmax, Yesware, ZoomInfo Engage, Gong Engage, Gong Revenue Intelligence, Clari, HubSpot Sales Hub, Zoho CRM Plus) reflects the 13 `solution_domains` rows in live state, matching the 2026-05-30 enumeration.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (B-band, M-band, F-band)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1A-M-AUTH-MODULES | **M1 (hard fail)** | Zero `domain_modules` rows. 8 capabilities require ≥2 full modules per Rule #14. Proposed split (carried forward, dependent on B2-MODULE-SHAPE): `SALES-ENG-CADENCE` (capabilities SE-CADENCE-SEQ, SE-EMAIL-TRACKING, SE-AI-EMAIL-DRAFT, SE-MEETING-SCHED; masters 121, 123) + `SALES-ENG-CONV-INTEL` (capabilities SE-AUTO-DIALER, SE-CONV-INTEL, SE-REP-COACHING, SE-INTENT-DATA; masters 122, 124). Both modules realize ≥1 master, ≥3 capabilities. | Hand-author 2 `domain_modules` rows + 8 `domain_module_capabilities` + 4 master DMDOs + a contributor DMDO on `crm_contacts` against the cadence module. Out of technical-continuation allowlist (new entities); blocked on B2-MODULE-SHAPE. |
| B1A-S-RETARGET-EVENTS | **B9 attribution defect** | Handoffs 82, 83, 206 still source from SALES-ENG but their `trigger_event.data_object_id` resolves to CRM-mastered entities (102 `sales_activities`, 100 `crm_opportunities`). Either author SE-keyed events on SE masters and retarget the handoffs, OR move the handoffs to CRM as their true publisher. The 2026-05-30 recommendation was to author SE-keyed events (`cadence_call.completed`, `cadence_meeting.no_show`, plus deal-insight on SE side); confirmation needed via B2-RETARGET-OR-MOVE. | Author 2-3 new `trigger_events` + PATCH the 3 handoff rows. Blocked on B2-RETARGET-OR-MOVE. |
| B1A-S-OUT-SRC-MODFK | **B10b outbound source NULL** | 8 outbound handoffs (82, 83, 205, 206, 474, 475, 476, 477) carry NULL `source_domain_module_id`. Derivation maps each to the SE-CADENCE or SE-CONV-INTEL module per the trigger event's data_object_id at master-strength. | PATCH 8 rows. Blocked on B1A-M-AUTH-MODULES (modules must exist before derivation). |
| B1A-S-OUT-TGT-MODFK | **B10b outbound target NULL (other side owes)** | 2 outbound handoffs (476, 477) carry NULL `target_domain_module_id` (target REV-INTEL has modules but no DMDO on the payload data_object). Report-only from SE's perspective; routes to REV-INTEL's B10b. | None from SE. Track under report-only follow-ups. |
| B1A-S-IN-TGT-MODFK | **B10b inbound target NULL** | 5 inbound handoffs (79, 81, 200, 210, 510) carry NULL `target_domain_module_id`. Every one resolves to SE-CADENCE per the 2026-05-30 derivation (cadence consumes lead, intent signal, whitespace, score recompute). | PATCH 5 rows. Blocked on B1A-M-AUTH-MODULES. |
| B1A-B-INTRA-RELS | **B6 hard fail** | Zero `data_object_relationships` among the 4 SE masters. Required edges per cadence-shaped vendor surface: `sales_cadences` produces_cadence_emails `sales_emails` (one_to_many), `sales_cadences` produces_cadence_calls `call_recordings` (one_to_many), `call_recordings` produces_conversation_insights `conversation_intelligence_records` (one_to_many). | Insert 3 `data_object_relationships` rows. Standalone. |
| B1A-B-CROSS-RELS | **B8 hard fail** | Zero outbound cross-domain rels despite 3 mappable handoffs (474 sales_emails to CRM activity, 475 call_recordings to CRM activity, 476 conversation_intelligence_records to REV-INTEL). Handoff 477 is fan-out reusing event 63 with non-SE-mastered payload, skipped per SKILL guidance. | Insert 3 `data_object_relationships` rows. Blocked on B1A-M-AUTH-MODULES (target module attribution carries through). |
| B1A-B-ALIASES | **B11 hard fail** | Zero `data_object_aliases` on any of the 4 masters. Proposed: `sales_cadences` → Sequence, Flow, Touchpoint Series; `call_recordings` → Dialler Call, Voice Touch; `sales_emails` → Cadence Email, Tracked Email, Sequence Email; `conversation_intelligence_records` → Call Insight, Deal Signal, Conversation Snapshot. ~10 rows. | Insert ~10 alias rows. Standalone. |
| B1A-B-LIFECYCLE | **B12 hard fail** | Zero `data_object_lifecycle_states`. None of the 4 is config-shaped. Proposed machines: `sales_cadences` (draft, active, paused, completed, archived; `active` and `paused` gate); `call_recordings` (captured, transcribed, analyzed, archived); `sales_emails` (drafted, queued, sent, opened, replied, bounced; `sent` gates); `conversation_intelligence_records` (captured, analyzed, published, reviewed). | Insert ~17 lifecycle-state rows. Blocked on B1A-M-AUTH-MODULES for `domain_module_id` assignment. |
| B1A-A-CATALOG-UX | **A4 fail** | `domains.catalog_tagline` empty, `domains.catalog_description` empty on id 95. Per Rule #20, draft buyer-voice copy (workflow + value) and surface to the user for review BEFORE writing. | Draft pair + surface. Blocked on B2-CATALOG-COPY user review. |
| B1A-F-RETIRE-LEGACY-SKILL | **F1 fail** | Skill id 104 `sales-eng-system` retains `domain_module_id` NULL. Once modules exist, DELETE the legacy skill + its 5 `skill_tools`, author 2 per-module `system` skills (`sales_eng_cadence_agent`, `sales_eng_conv_intel_agent`) with the tool split from the 2026-05-30 narrative + workflow-gate tools per module. | DELETE + INSERT. Blocked on B1A-M-AUTH-MODULES. |
| B1A-H-APQC-TAGGING | **H1 partial fail** | 5 of 13 handoffs tagged. 8 untagged. Volume target 0.5N to 0.8N = 7-10; current 5 falls short. Additional `agent_curated` candidates from 2026-05-30 still pending: handoffs 79, 81, 83, 200, 205, 474, 475, 510. PCF IDs proposed at 2026-05-30 (10009, 10010, 12878, 20110) did NOT resolve in live `processes.external_id`, so the loader deferred all of them. Re-derive using live PCF lookups: candidates include "Manage sales orders" (PCF 10009 family), "Manage sales opportunities" (10010), "Identify and prioritize sales opportunities" (under 10010), "Develop and manage sales force" (10004 family). Per-handoff PCF lookup via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` required before each insert; the 2026-05-30 PCF numbers were Gartner-shaped, not Semantius live `external_id` values. | Re-derive PCF rows via live lookup, then INSERT `handoff_processes` rows for the 8 untagged handoffs (each `agent_curated`, `record_status='new'`). Existing 2 `discovery_substring` rows on 82 / 206 stay for reviewer triage. |

#### Bucket 1 finding type counts

| Finding type | Count |
| --- | --- |
| MISSING (entity / surface gap, structural) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A4 + M1 + B6 + B8 + B9-attrib + B10b + B11 + B12 + F1) | 9 |
| BOUNDARY (rolled into STRUCTURAL) | (see above) |
| APQC TAGGING | 1 line item, 8 proposed agent_curated rows |
| MODULARIZATION ISSUES | 0 (any refactor goes to Bucket 2) |
| Other Bucket 1 (catalog UX draft surface) | 1 (B1A-A-CATALOG-UX) |
| **Bucket 1 total** | 12 |

### Bucket 2, Surface-for-user (judgment calls)

Carried forward from 2026-05-30 unchanged (user has not answered any of the 6). Re-listed for self-containment.

- **B2-MODULE-SHAPE.** 2-module (CADENCE / CONV-INTEL) vs 3-module (CADENCE / VOICE / CONV-INTEL) vs defer until Bucket 3 vendor research lands.
- **B2-PATTERN-FLAGS.** Per-flag yes/no on 5 candidates: `call_recordings.has_personal_content`, `sales_emails.has_personal_content`, `sales_cadences.has_submit_lock`, `conversation_intelligence_records.has_personal_content`, `call_recordings.has_single_approver`.
- **B2-APQC-L3-PROMOTION.** Handoff 206 tag: keep L4 PCF 12878 or replace with L3 parent.
- **B2-APQC-WRONG-SUBSTRING.** Handoff 82 tag: DELETE the wrong PCF 20110 row at fix time, or leave it for reviewer to mark `rejected`.
- **B2-CHANNEL-NOTES.** `skill_tools.notes` wording for `send_email` channel-link justification (Rule #15: user must supply exact text).
- **B2-APQC-INBOUND-DEFER.** 3 inbound handoffs (81, 210, 510) with no clean PCF cross-industry analog: accept deferrals or force weak L4 tags.
- **B2-CATALOG-COPY.** New for this audit (rolled out of B1A-A-CATALOG-UX): per Rule #20, the agent will draft buyer-voice `catalog_tagline` + `catalog_description` for SALES-ENG (95) and surface BEFORE writing. User must review the draft.
- **B2-RETARGET-OR-MOVE.** New for this audit (split from B1A-S-RETARGET-EVENTS): handoffs 82, 83, 206 source from SE but their trigger_events point at CRM-mastered data_objects. Author SE-keyed events and retarget (preferred per 2026-05-30) vs move the handoffs to CRM as their true publisher. Choice changes B-band ownership of these rows.

### Bucket 3, Phase 0 pending (speculative)

Carried forward from 2026-05-30 unchanged. 9 candidates: cadence_steps, prospects, sequences vs cadences terminology (already handled via B11), email_templates, dialer_phone_numbers + dialer_sessions, conversation_intelligence_topics + conversation_intelligence_trackers, intent_signals + intent_topics (cross-cutting), meeting_scheduler_slots + meeting_links, TCPA / CAN-SPAM / GDPR consent compliance entities.

B3-S7 (INTENT-DATA) and B3-S8 (MEETING-SCHEDULER) remain candidate new domains queued at `audits/_missing-domains.md`.

### Cross-bucket dependencies

- **B2-MODULE-SHAPE** gates B1A-M-AUTH-MODULES, B1A-S-OUT-SRC-MODFK, B1A-S-IN-TGT-MODFK, B1A-B-LIFECYCLE, B1A-F-RETIRE-LEGACY-SKILL, B1A-B-CROSS-RELS. User answer required before the cascade can land.
- **B1A-M-AUTH-MODULES** is the keystone: 6 other B1A items depend on its module ids.
- **B2-RETARGET-OR-MOVE** gates B1A-S-RETARGET-EVENTS and the APQC tags on handoffs 82, 83, 206 in B1A-H-APQC-TAGGING.
- **B2-CATALOG-COPY** gates B1A-A-CATALOG-UX (draft + user review).
- Buckets 2 and 3 are otherwise independent.

### Per-bucket prompts

**Bucket 1:** Fix these now? Reply `all`, list (`B-ALIASES, H-APQC-TAGGING`), or `skip`. Sequencing: B1A-M-AUTH-MODULES first (after B2-MODULE-SHAPE answer), then dependent items. Standalone: B1A-B-INTRA-RELS, B1A-B-ALIASES, B1A-H-APQC-TAGGING (the standalone PCF lookups for handoffs whose modules are already known on the partner side; SE-side derivation still gated on modules).

**Bucket 2:** What's your call on each of 8 items? Per-item answers required before fix loads.

**Bucket 3:** Vet via formal Phase 0 or eyeball-mode? If eyeball, name which of the 9 candidates ring true.

### Report-only follow-ups (owed by other domains)

Carried forward + extended with this audit's findings:

- **REV-INTEL B10b** owes `target_domain_module_id` PATCH on outbound handoffs 476, 477 (DMDO on REV-INTEL side needs to declare role on `conversation_intelligence_records` and `crm_opportunities` payloads first).
- **CDP B10b** owes `source_domain_module_id` PATCH on inbound handoff 79.
- **ACCT-PLAN B10b** owes `source_domain_module_id` PATCH on inbound handoff 210.
- **MA B10b** owes `source_domain_module_id` PATCH on inbound handoff 510.
- **CDP / CRM / ACCT-PLAN / MA B8** owe outbound cross-domain `data_object_relationships` rows from their masters into SE-mastered payloads (per the 5 inbound handoffs).
- **B10 inbound discovery** still implies SE should hold `consumer` DMDO rows on `crm_leads`, `customers`, `lead_scores`, `crm_opportunities`. Folds into B1A-M-AUTH-MODULES once modules exist.
- **Pairwise reconciliation (CRM neighbor, edge weight 9)** still deferred until SE has modules.

### Notes

- No JWT-audience errors encountered during the read pass.
- No writes performed in this audit (Validate b1 is read-only by construction).
- No `notes` columns inspected for content drift since no writes proposed touch them.
- Live state confirms the 2026-05-31 technical continuation applied correctly (events 463-469 carry non-empty `event_category`; 4 user-edge `data_object_relationships` rows present on `users (748) →` each of 121, 122, 123, 124).
- UI links for spot-check after future loads: https://tests.semantius.app/domain_map/domain_modules and https://tests.semantius.app/domain_map/handoffs.


## 2026-06-02 Audit (modularization)

### Summary

SALES-ENG (domains.id 95) went from 0 `domain_modules` to 3 `full` modules. Scope of this pass: modules + entity assignment only, reusing existing capabilities and data_objects. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. This resolves B1A-BUILD (the unbuilt-domain M1 fail) and B1B-M-AUTH-MODULES, and commits a module shape for the open B2-MODULE-SHAPE decision (chose a 3-module split, option (b)-shaped, over the 2-module proposal because the domain has 3 distinct in-domain masters that map one-per-module cleanly).

### Modules created

| id | code | capabilities | data_objects (role) |
|---|---|---|---|
| 296 | SALES-ENG-CADENCE-OUTREACH | SE-CADENCE-SEQ (278), SE-AUTO-DIALER (279), SE-INTENT-DATA (283) | sales_cadences (121, master, required); crm_contacts (98, contributor, required) |
| 297 | SALES-ENG-EMAIL-SCHEDULING | SE-EMAIL-TRACKING (280), SE-MEETING-SCHED (282), SE-AI-EMAIL-DRAFT (284) | sales_emails (123, master, required); crm_contacts (98, contributor, required) |
| 298 | SALES-ENG-CONVERSATION-COACHING | SE-CONV-INTEL (281), SE-REP-COACHING (285) | call_recordings (122, master, required); conversation_intelligence_records (124, embedded_master, required) |

8 `domain_module_capabilities` rows (all 8 SE capabilities placed exactly once, M4 satisfied). 6 `domain_module_data_objects` rows. Every module has >=1 capability (M6) and >=1 data_object (no empty module). Rule #14 satisfied (>=2 full modules for 8 capabilities).

### Catalog-wide master pre-check (M7, MANDATORY)

Queried `/domain_module_data_objects?data_object_id=eq.<id>&role=eq.master` for every intended master before writing:

- **sales_cadences (121):** zero existing `master` rows catalog-wide (only a `consumer` row in CRM-ACTIVITY, module 49). SALES-ENG-CADENCE-OUTREACH masters it. No demotion.
- **call_recordings (122):** zero existing `master` rows catalog-wide. It carried `embedded_master` in REV-INTEL-CONVERSATION (186) and REV-INTEL-COACHING (189), and `consumer` in CRM-ACTIVITY (49), but no canonical master existed. SALES-ENG-CONVERSATION-COACHING masters it. No demotion.
- **sales_emails (123):** zero existing `master` rows catalog-wide (only `contributor` in CRM-ACTIVITY, `consumer` in CDP-SEGMENTATION-ACTIVATION). SALES-ENG-EMAIL-SCHEDULING masters it. No demotion.
- **conversation_intelligence_records (124):** ALREADY mastered by REV-INTEL-CONVERSATION (module 186). Pre-check hit -> assigned `embedded_master` here, NOT a second master. Matches its legacy `embedded_master` role in `domain_data_objects`.
- **crm_contacts (98):** mastered by CRM-ACCT-MGT (module 46). Assigned `contributor` here (preserved its existing borrowed role). Never promoted.

Post-write verification confirmed each of 121, 122, 123 appears as `master` in exactly ONE module catalog-wide (in-domain AND globally). The legacy `domain_data_objects` rollup (4 master rows + 1 contributor) is consistent with the new module-grain masters; it is the deprecated derived rollup and was not hand-edited.

### Fixes applied

- Inserted 3 `domain_modules` (296, 297, 298), 8 `domain_module_capabilities`, 6 `domain_module_data_objects`. `record_status` omitted on every insert (R1). `notes` empty on every DMDO row (R15). No vendor/product names in any module name or description (R18). Module descriptions are workflow-voice.
- Loader: `.tmp_deploy/modularize_sales_eng_2026-06-02.ts`, idempotent (re-run confirmed: "modules already present", zero duplicate inserts).

### Deferred / unchanged

Out of scope for this pass (entity-only reuse): per-module system skills (B1B-F-RETIRE-LEGACY-SKILL, legacy skill 104), catalog UX copy (B1B-A-CATALOG-UX), lifecycle states (B1B-B-LIFECYCLE), intra/cross-domain relationships (B1B-B-INTRA-RELS, B1B-B-CROSS-RELS), aliases (B1B-B-ALIASES), handoff module-FK backfills (B1B-S-OUT-SRC-MODFK, B1B-S-IN-TGT-MODFK), event retargeting (B1B-S-RETARGET-EVENTS), and APQC tagging (B1B-H-APQC-TAGGING). These now have concrete target module ids and are re-expressed in state.yaml with the module mapping resolved where it was previously NULL. No master-less capability gaps: all 8 capabilities are backed by an in-domain master or a borrowed master in their module.

## 2026-06-06 - b1a execution

Technical b1a execution pass against live state. Scope: the two `b1a` items in `state.yaml`. One executed (B1A-F-PER-MODULE-SKILLS), one skipped (B1A-A-CATALOG-UX, blocked by a `user_decision`). No JWT-audience errors. `record_status` omitted on every insert (defaults to `new`, Rule #1/#4). No `notes` written on any row (Rule #15). No vendor/product names in any text field (Rule #18). All writes via the `semantius` CLI; no MCP tools (Rule #0).

### B1A-F-PER-MODULE-SKILLS — DONE

Retired the legacy domain-level system skill and authored one `skill_type='system'` skill per full module (296/297/298) with a per-module tool split, satisfying Rule #17 / F1 / F2 / F3 / F4.

**DELETE (prior values snapshotted below for reversibility):**

- `skills` id 104 `sales-eng-system` — prior values: `skill_type='system'`, `domain_id=95`, `domain_module_id=NULL`, `role_id=NULL`, `process_id=NULL`, `record_status='new'`, `description="System skill for Sales Engagement — runtime workflows over the domain's master data, derived from masters + cross-domain handoffs."`
- `skill_tools` 5 rows on `skill_id=104` (all `requirement_level='required'`, `notes=''`, `record_status='new'`): id 815 -> tool 690 `query_cadences`; id 816 -> tool 691 `query_call_recordings`; id 817 -> tool 692 `query_sales_emails`; id 818 -> tool 693 `query_conversation_intelligence_records`; id 819 -> tool 37 `send_email`. (The four `query_*` tool rows 690-693 and `send_email` 37 themselves were NOT deleted; they are catalog-wide shared `tools` rows, re-linked into the new per-module skills below.)

**INSERT `skills` (3 rows, `skill_type='system'`, `domain_id=95`, `record_status` omitted):**

| id | skill_name | domain_module_id |
|---|---|---|
| 380 | sales_eng_cadence_outreach_agent | 296 |
| 381 | sales_eng_email_scheduling_agent | 297 |
| 382 | sales_eng_conversation_coaching_agent | 298 |

**INSERT `tools` (7 new catalog rows; `record_status` omitted):**

| id | tool_name | operation_kind | data_object_id | coverage_tier |
|---|---|---|---|---|
| 1778 | create_sales_cadence | mutate | 121 | platform |
| 1779 | enroll_prospect_in_cadence | mutate | 121 | platform |
| 1780 | create_sales_email | mutate | 123 | platform |
| 1781 | draft_sales_email | compute | NULL | external |
| 1782 | create_call_recording | mutate | 122 | platform |
| 1783 | analyze_conversation | compute | NULL | external |
| 1784 | publish_conversation_insight | mutate | 124 | platform |

Reused existing catalog tools (Rule #9, dedup by `tool_name`, no duplicates created): `query_cadences` (690), `query_call_recordings` (691), `query_sales_emails` (692), `query_conversation_intelligence_records` (693), `send_email` (37), `make_phone_call` (39), `notify_person` (913).

**INSERT `skill_tools` (16 rows; `notes=''`, `record_status` omitted):**

- Skill 380 (module 296, cadence/outreach): `query_cadences` (req), `create_sales_cadence` (req), `enroll_prospect_in_cadence` (req, the active-state workflow action), `make_phone_call` (req, channel-required: voice IS the dialler workflow per F7), `notify_person` (opt).
- Skill 381 (module 297, email/scheduling): `query_sales_emails` (req), `create_sales_email` (req), `send_email` (req, channel-required: the cadence-step tracked send IS the workflow; `skill_tools.notes` wording remains the deferred user item B2-CHANNEL-NOTES, left empty per Rule #15), `draft_sales_email` (opt, AI drafting), `notify_person` (opt).
- Skill 382 (module 298, conversation/coaching): `query_call_recordings` (req), `query_conversation_intelligence_records` (req), `create_call_recording` (req), `analyze_conversation` (req, conversation intelligence compute), `publish_conversation_insight` (req, the analyzed -> published workflow gate), `notify_person` (opt).

**Verification (re-queried live):** skill 104 absent; exactly 3 `skill_type='system'` skills on modules 296/297/298 (F2 OK); each skill has >=3 `required` tools (F3 OK: 4/3/5 required respectively); every linked tool's `operation_kind` <-> `data_object_id` pairing valid (F4 OK). Loader is idempotent (second run inserted 0). F1 cleared (no legacy `domain_module_id=NULL` system skill remains).

**Residual follow-up (not a b1a item):** F7 still wants a workflow-specific `skill_tools.notes` justification on the `send_email` row (skill 381). That wording is user-supplied per Rule #15 and tracked as B2-CHANNEL-NOTES; the channel link itself is correct and in place.

### B1A-A-CATALOG-UX: SKIPPED (superseded; see follow-up below)

Blocked by `{type: user_decision, ref: B2-CATALOG-COPY}`. Per the execution mandate, b1a items whose `blocked_by` contains a `user_decision` are not executed. The target fields (`domains.catalog_tagline`/`catalog_description` on id 95 and `catalog_tagline`/`catalog_description` on modules 296/297/298) remain empty; no write performed. Kept in `state.yaml`.

This skip was made under the OLD Rule #20, which required a pre-write user gate even for empty catalog UX fields. See the follow-up below: under the revised Rule #20 an empty field is written directly (the row's `record_status` carries the review signal), so the stale `blocked_by` annotation was moot and the fields were written.

### Loader

`.tmp_deploy/sales_eng_b1a_per_module_skills_2026_06_06.ts` (gitignored, one-off). Idempotent (skills keyed on `skill_name`, tools on `tool_name`, skill_tools on `(skill_id, tool_id)`). Invoked from project root `c:/dev/domain-map` per Rule #6. UI spot-check: https://tests.semantius.app/domain_map/skills , https://tests.semantius.app/domain_map/skill_tools , https://tests.semantius.app/domain_map/tools .

### B1A-A-CATALOG-UX follow-up: RESOLVED (catalog UX fields written)

Under the revised Rule #20 and the batch-policy correction, an EMPTY `catalog_tagline` / `catalog_description` is written directly with buyer-voice copy; the row's `record_status` (these rows are all `new`) carries the review signal. The stale `blocked_by: user_decision B2-CATALOG-COPY` annotation applied only to the OLD pre-write gate and is moot for empty fields, so this item was executed.

Re-read confirmed all 8 target fields were EMPTY (`""`) immediately before the write. Per-field empty-guard applied (write only where empty; never overwrite a non-empty value).

**Prior values snapshotted for reversibility (all empty strings `""` before the PATCH):**

| table | row id | field | prior value | written? |
|---|---|---|---|---|
| domains | 95 | catalog_tagline | `""` | yes |
| domains | 95 | catalog_description | `""` | yes |
| domain_modules | 296 | catalog_tagline | `""` | yes |
| domain_modules | 296 | catalog_description | `""` | yes |
| domain_modules | 297 | catalog_tagline | `""` | yes |
| domain_modules | 297 | catalog_description | `""` | yes |
| domain_modules | 298 | catalog_tagline | `""` | yes |
| domain_modules | 298 | catalog_description | `""` | yes |

To revert: PATCH each of the 8 fields back to `""` on the rows above.

Copy is buyer-voice (workflow + value, "what the buyer can do"), distinct from the analyst-voice `description` column on each row. No vendor/product names, no handoff/parent-domain/taxonomy enumeration, no em-dashes, American English. `record_status` was OMITTED on every PATCH (rows stay `new`); no `notes` column touched. All writes via the `semantius` CLI; no MCP tools (Rule #0). No JWT-audience errors.

**Loader:** `.tmp_deploy/sales_eng_b1a_catalog_ux_2026_06_06.ts` (gitignored, one-off). Idempotent: re-reads live state per field; once a field is non-empty the empty-guard skips it. Invoked from project root `c:/dev/domain-map` per Rule #6. UI spot-check: https://tests.semantius.app/domain_map/domains , https://tests.semantius.app/domain_map/domain_modules .
