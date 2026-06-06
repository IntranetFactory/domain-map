# CCAAS audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: 6 master data_objects on the legacy `domain_data_objects` rollup (`support_sessions`, `contact_records`, `queue_statistics`, `ccaas_call_recordings`, `agent_states`, `disposition_codes`). Zero `domain_modules`. Zero `domain_module_data_objects` rows. 1 capability (the cross-cutting `SLA-MGMT`). 0 solutions. 0 regulations. 0 business_function_domain rows beyond a single owner (`Contact Center Operations`). 8 trigger_events on these masters (5 wired to handoffs, 3 orphan). 6 outbound handoffs to CSM (2), CRM (2), WFM (2). 5 inbound handoffs from CONV-AI (3), KMS (1), WSC (1). 1 legacy domain-level `system` skill (`ccaas-system`, id 19, `domain_module_id IS NULL`) carrying 13 `skill_tools` rows. 0 roles linked to this domain via `role_modules` (CCAAS has no modules to anchor to).
- Vendor surface basis: pure-play CCaaS leaders Genesys Cloud CX, NICE CXone, Five9, Talkdesk, Amazon Connect, plus Twilio Flex (programmable CCaaS) and Cisco Webex Contact Center. Workforce engagement specialists Verint and Calabrio add the WEM substrate (call recording, QM, speech analytics). Avaya, Mitel for legacy enterprise telephony.
- **Bucket 1 (in-scope, agent fixable):** 16 items.
- **Bucket 2 (surface-for-user, judgment):** 8 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

Structural pass headline: the domain is essentially under-loaded. M-band (modules) is the entire blocker, A2 fails (only one cross-cutting capability), A3 fails (zero solutions), A4 fails (catalog UX fields empty), C-band partially passes but lacks contributors/consumers, F-band is in transitional state (F1 legacy skill present, F2 fails because zero modules). B-band substrate has masters but no DMDO rows because there are no modules to anchor them to, so B5/B6/B7/B11/B12 are vacuously unmet. APQC tagging (H1) at 2 of 11 cross-domain handoffs (both `discovery_substring`, none `agent_curated` or `approved`).

The first job is to author modules (Phase A/M); every B/C/E/F failure cascades from M1.

### Vendor surface basis

Pure-play contact-center cloud platforms chosen over CSM business-app vendors (CCAAS is the engine, CSM is the case-management app): Genesys Cloud CX (ACD + WEM + Genesys AI), NICE CXone (CXone Workforce Engagement, CXone Mpower), Five9 (Intelligent CX), Talkdesk (CX Cloud), Amazon Connect (programmable, AWS-native), Twilio Flex (programmable CCaaS over Twilio Voice + Conversations), Cisco Webex Contact Center, Avaya Experience Platform, Verint Open Platform (WEM specialist), Calabrio ONE (WEM specialist). Verint and Calabrio anchor the WEM leg (recording, QM, speech analytics, agent gamification, scheduling). All 10 are recognized point-solution vendors.

The market is regulated by PCI-DSS (payment IVR, recording redaction), TCPA (outbound dialing consent), HIPAA (healthcare contact centers), GDPR (recording consent, retention), CCPA (call recording opt-out), and FCC / TRAI / Ofcom telephony rules. Recording-consent flows differ by jurisdiction (one-party vs two-party consent states).

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | Zero `domain_modules` rows exist for CCAAS. Every B/E/F structural concern is blocked until modules are authored. Six masters sit on legacy `domain_data_objects` only. The deployable unit is missing entirely. | Author at least 2 full modules (CCAAS has well over 3 capabilities once Phase A is also fixed). Proposed split: `CCAAS-ROUTING-ENGINE` (ACD, IVR, queues, agent_states, queue_statistics, contact_records), `CCAAS-INTERACTION-CAPTURE` (ccaas_call_recordings, support_sessions, disposition_codes, transcripts), `CCAAS-WORKFORCE-ENGAGEMENT` (recording-based QM, speech analytics, agent coaching, scoring), `CCAAS-DIALER` (outbound campaigns, TCPA consent, predictive / preview / progressive dialing). Final shape depends on Bucket 2 #1. |
| B1-S2 | A2 / capability_domains | Only one capability linked (`SLA-MGMT`, id 185, cross-cutting). The CCAAS market has at minimum a dozen flagship capabilities (ACD, IVR runtime, omnichannel routing, recording, QM, speech analytics, agent state mgmt, dialer, IVR designer, real-time monitoring). A2 expects 5 to 8 minimum. | Author 6 to 8 domain-prefixed CCAAS capabilities (`CCAAS-ACD`, `CCAAS-IVR`, `CCAAS-OMNICHANNEL-ROUTING`, `CCAAS-RECORDING`, `CCAAS-QUALITY-MGMT`, `CCAAS-SPEECH-ANALYTICS`, `CCAAS-OUTBOUND-DIALER`, `CCAAS-REAL-TIME-MONITORING`). Keep `SLA-MGMT` as the existing cross-cutting link. |
| B1-S3 | A3 / solution_domains | Zero solutions linked. A3 expects 3+ solutions with at least one `primary`. | Load `solutions` and `solution_domains` for the 10 vendors listed in the vendor-surface basis section above. `primary` for the pure-play CCaaS engines (Genesys, NICE, Five9, Talkdesk, Amazon Connect); `secondary` for Twilio Flex, Cisco, Avaya; `primary` for Verint and Calabrio on WEM scope. |
| B1-S4 | regulations / domain_regulations | Zero regulations linked despite CCAAS being heavily regulated. TCPA (outbound consent), PCI-DSS (IVR payment, recording redaction), HIPAA (healthcare contact centers), GDPR (consent + retention), CCPA, plus jurisdictional one-party / two-party consent rules are all material. | Load 5 `domain_regulations` rows: TCPA, PCI-DSS, HIPAA, GDPR, CCPA. Add `regulations` rows for TCPA and (if absent) the one-party / two-party consent body of state law (or note as a US-state-level reference, not a single regulation). |
| B1-S5 | A4 / catalog UX | `catalog_tagline` and `catalog_description` both empty (Rule #20). | Draft both fields in buyer voice per Rule #20, surface to user for review BEFORE writing. Do NOT auto-overwrite. |
| B1-S6 | F1 / F2 | Legacy domain-level system skill `ccaas-system` (id 19, `domain_module_id IS NULL`) exists. F2 requires exactly one `skill_type='system'` skill per `domain_modules` row. Once Bucket 1 #1 lands modules, this legacy row is obsolete. | After modules ship: DELETE the legacy skill (or PATCH `domain_module_id` to whichever new module best matches), then author one `<module>_agent` skill per module per Phase S. |
| B1-S7 | B3 / naming arbitration | Six masters use bare-word names without `is_canonical_bare_word=true` and without prefix: `support_sessions`, `contact_records`, `queue_statistics`, `agent_states`, `disposition_codes` (the only prefixed one is `ccaas_call_recordings`). Each is collision-prone. `support_sessions` collides with potential CSM / HRSD / DXP support entities; `contact_records` collides with CRM `crm_contacts` and conv-ai; `queue_statistics` collides with potential WFM `wfm_queue_stats`; `agent_states` collides with potential `ai_agent_states` (CONV-AI); `disposition_codes` collides with ATS `application_dispositions`. | Decide per Rule #9: either (a) prefix to `ccaas_<name>` form (default), or (b) claim canonical bare-word with rationale. Recommend (a) for everything except `support_sessions` (which is more of a workflow concept than a CCAAS-specific noun) where the user may want canonical claim or a rename. |

#### MISSING (compliance-mandated entities)

| ID | Entity | Proposed module | Regulation | Notes |
|---|---|---|---|---|
| B1-M1 | `recording_consent_records` | CCAAS-INTERACTION-CAPTURE | GDPR / CCPA / state two-party consent | Per-call (and per-channel) consent ledger; the substrate for redaction and erasure responses. Vendors: Genesys, Five9, NICE all model this distinctly. |
| B1-M2 | `dnc_lists` (do-not-call) | CCAAS-DIALER | TCPA / DNC Registry | Suppression lists for outbound dialing; required for TCPA compliance. Distinct from CRM opt-outs (per-channel scoping). |
| B1-M3 | `tcpa_consent_records` | CCAAS-DIALER | TCPA | Express-written-consent records for outbound auto-dialed campaigns. Vendor universal (Five9, NICE, Genesys, Talkdesk). |
| B1-M4 | `pci_redaction_events` | CCAAS-INTERACTION-CAPTURE | PCI-DSS | Audit log of automated redaction (pause-resume) on payment IVR / payment-card mention windows. Genesys / NICE QM specialty. |

#### MISSING (universal-vendor entities)

| ID | Entity | Proposed module | Notes |
|---|---|---|---|
| B1-U1 | `routing_strategies` | CCAAS-ROUTING-ENGINE | The ACD rule set (skills-based routing, priority queues, overflow rules). Vendor universal. |
| B1-U2 | `ivr_flows` | CCAAS-ROUTING-ENGINE | IVR menu / call-flow definitions. Distinct from `conversation_flows` (CONV-AI) and `bot_definitions` (CONV-AI): IVR is touch-tone / voice prompts on the telephony path; bots are NLU-driven. |
| B1-U3 | `agent_skills` | CCAAS-ROUTING-ENGINE | Skills assigned to agents that the router matches against routing strategy. Universal. |
| B1-U4 | `quality_evaluations` | CCAAS-WORKFORCE-ENGAGEMENT | QM scorecards filled out by supervisors / QA on recordings. Verint / Calabrio / NICE WEM. |
| B1-U5 | `coaching_sessions` | CCAAS-WORKFORCE-ENGAGEMENT | Agent-supervisor coaching tied to QM scores or sentiment events. Verint / Calabrio. |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | `trigger_events.id=200` (`intent.identified`) is wired into handoff 530 with `data_object_id=257` (contact_records) but the trigger_event itself points at `data_object_id=260` (intent_detections, mastered by CONV-AI). This is a B10b sub-case 2 / cross-domain mis-attribution: an intent-detection event lives in CONV-AI's space, not CCAAS. Handoff 530 (CCAAS to CRM) is currently published from CCAAS as if CCAAS owns the event. | Either (a) re-source the handoff to CONV-AI (DELETE 530, let CONV-AI author the equivalent outbound), or (b) flip the trigger_event's `data_object_id` to `contact_records` if CCAAS is genuinely meant to publish "we tagged an intent on this contact" as a CCAAS-side event. Recommend (a): intent detection is the CONV-AI workflow, CCAAS is the runtime. |
| B1-B2 | `data_object_relationships` lacks every intra-domain edge among the six masters. There is one outbound `support_sessions escalates to customer_cases` (CSM) edge and one inbound `chat_threads escalates_to support_sessions` (WSC), but no edges among the CCAAS masters themselves (e.g. `contact_records produces ccaas_call_recordings`, `contact_records assigned_to agent_states`, `contact_records dispositioned_by disposition_codes`, `support_sessions composed_of contact_records`, `queue_statistics aggregates contact_records`). | Draft 5 to 7 intra-domain relationship edges per B6. |
| B1-B3 | B7 user-edges: every CCAAS master with a human actor (agent, supervisor, QA evaluator, dialer admin) lacks an explicit edge to the `users` built-in (id 748). Per Rule #10 these must be authored explicitly. | Author user-edges: `users handles contact_records`, `users handles support_sessions`, `users has agent_states`, `users evaluates ccaas_call_recordings` (post-QM authoring), `users applies disposition_codes`. 5 edges minimum. |

#### B9 trigger-event coverage (orphan events, no handoff exists)

| ID | Trigger event | Notes / proposed subscriber direction |
|---|---|---|
| B1-T1 | `ccaas_call_recording.captured` (502) | QM evaluation in CCAAS-WORKFORCE-ENGAGEMENT (intra-domain once authored), plus CSM coaching attach. Both sides need a handoff row. |
| B1-T2 | `agent_state.aux_threshold_exceeded` (504) | WFM adherence flag (outbound). |
| B1-T3 | `disposition_code.applied` (505) | CRM lead/opportunity outcome update (already publishing in spirit via handoff 530 but with different trigger_event); plus CSM case-resolution attach. |

#### APQC TAGGING (H1)

Cross-domain handoff inventory: 11 total (6 outbound + 5 inbound). Existing tags: 2 of 11 (handoffs 225, 226, both `discovery_substring`, `record_status=new`). 9 are untagged. Tagging volume target per H1 H-band: 0.5 N to 0.8 N = 6 to 9 new `agent_curated` tags. Proposed below.

##### `agent_curated` proposals (9 candidates)

| ID | Handoff | Direction | Trigger event | Payload | Proposed APQC process | PCF external_id | Confidence |
|---|---|---|---|---|---|---|---|
| B1-H1 | 225 | CCAAS to CSM | call.escalated | support_sessions | (existing tag PCF 20110 is wrong - product recalls are unrelated). Replace with `Respond to customer problems, requests, and inquiries` (id 928, ext 10396) | 10396 | high |
| B1-H2 | 226 | CCAAS to CSM | sentiment.negative | support_sessions | (existing tag PCF 19640 is wrong - brand-level social sentiment is unrelated to per-call sentiment escalation). Replace with `Respond to customer complaints` (id 934, ext 10400) | 10400 | high |
| B1-H3 | 501 | CCAAS to CRM | contact_record.captured | contact_records | `Respond to customer problems, requests, and inquiries` (id 928, ext 10396) | 10396 | medium |
| B1-H4 | 530 | CCAAS to CRM | intent.identified | contact_records | (depends on B1-B1 resolution; if kept here) `Analyze and respond to customer insight` (id 138, ext 16613) | 16613 | medium |
| B1-H5 | 499 | CCAAS to WFM | agent_state.changed | agent_states | `Identify staffing requirements` (id 727, ext 11787) is the closest in spirit. Alternative defer to CCAAS-WEM as a custom-process. | 11787 | low |
| B1-H6 | 500 | CCAAS to WFM | queue_statistics.threshold_breached | queue_statistics | `Identify staffing requirements` (id 727, ext 11787) - same comment as above. | 11787 | low |
| B1-H7 | 228 | CONV-AI to CCAAS | conversation.escalated_to_human | conversation_transcripts | `Respond to customer problems, requests, and inquiries` (id 928, ext 10396) | 10396 | high |
| B1-H8 | 722 | KMS to CCAAS | knowledge_base_article.updated | knowledge_base_articles | `Maintain service support knowledge repository` (id 1293, ext 20898) | 20898 | high |
| B1-H9 | 833 | WSC to CCAAS | chat_thread.escalated_to_ticket | chat_threads | `Respond to customer problems, requests, and inquiries` (id 928, ext 10396) | 10396 | medium |

##### Deferred to Discover Pass 3 (2 candidates)

| ID | Handoff | Reason |
|---|---|---|
| B1-H10 | 743 (CONV-AI to CCAAS, conversation_flow.fallback_triggered, conversation_flows) | Fallback / bot-failure is a contact-center engineering / IVR-design concern with no clean PCF cross-industry match; APQC is org-shape not platform-engineering-shape. Candidate for custom process tagging. |
| B1-H11 | 746 (CONV-AI to CCAAS, bot_definition.published, bot_definitions) | Bot deployment / lifecycle is a build-side concern outside APQC PCF cross-industry; candidate for custom process. |

Total: 9 agent_curated proposals + 2 defer = 11 of 11 handoffs accounted for.

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split shape.** Bucket 1 #1 proposes 4 modules (`CCAAS-ROUTING-ENGINE`, `CCAAS-INTERACTION-CAPTURE`, `CCAAS-WORKFORCE-ENGAGEMENT`, `CCAAS-DIALER`). Alternative shapes: (a) 2 modules (`CCAAS-CORE` + `CCAAS-WEM`), (b) 3 modules (collapse Dialer into Routing), (c) 5 modules (split Speech Analytics out of WEM). Decide: which split do you want me to draft? The choice gates Bucket 1 #2 (capability authoring) and Bucket 1 #6 (skill authoring) downstream.
2. **WEM as a standalone domain vs. CCAAS sub-module.** Verint, NICE WEM, Calabrio, Genesys WEM are arguably point-solution vendors in their own right (Workforce Engagement Management market). Should `CCAAS-WORKFORCE-ENGAGEMENT` be a CCAAS module, OR should WEM be promoted to its own domain (queued as `CCAAS-WEM` in `_missing-domains.md`)? Trade-off: as a CCAAS sub-module the substrate is shared with routing; as a separate domain the vendor surface is cleaner (Calabrio is a pure-play WEM, not a CCaaS). Decide before Bucket 1 lands.
3. **Conversation Intelligence overlap.** Gong, Chorus, Refract are conversation-intelligence vendors that overlap CCAAS recording + sentiment substrate (also queued as `CONV-INTEL` in `_missing-domains.md`, now at mention_count=2 because the PA audit also surfaced it). Is the relationship: (a) Conv-Intel is downstream of CCAAS recordings and CCAAS publishes to it, (b) Conv-Intel is a separate vendor surface that CCaaS vendors compete with on the QM leg, or (c) Conv-Intel is a feature of SALES-ENG (where `call_recordings` id 122 currently lives)? Affects Bucket 3 #1 below.
4. **Master rename: `call_recordings` (122) vs. `ccaas_call_recordings` (735).** Two distinct masters exist. id 122 is mastered by SALES-ENG, consumed by CRM-ACTIVITY. id 735 is the CCAAS-owned recording. Sales-call recordings (Gong, Chorus) and contact-center recordings (Genesys, NICE) are different in lifecycle, regulation, retention, redaction. Decide: (a) keep both, document the split (different industries, different lifecycles), or (b) merge under a canonical-bare-word claim on `call_recordings` with role demotion. Recommend keep both (different vendor surfaces; SALES-ENG owns the rep-call recordings, CCAAS owns the contact-center recordings).
5. **`contact_records` cross-domain naming collision.** CRM-ACCT-MGT currently consumes `contact_records` (id 257). The CRM team would more naturally read "Contact" as `crm_contacts` (id 98). Question: is the consumer DMDO on CRM-ACCT-MGT actually correct, or is this a B5 boundary issue where the CRM module should consume `crm_contacts` and not `contact_records`? Inspect whether CRM consumes id 257 for a reason or whether it's left over from an earlier load.
6. **Permission verb overrides on lifecycle states (Phase B12) once authored.** Several masters will need overrides (e.g. `support_sessions.completed` should derive `complete_support_session` not `complete_support_sessions`; `quality_evaluations.signed_off` should derive `sign_off_quality_evaluation`). Decision deferred until Bucket 1 #1 lands and modules exist to host the lifecycle states.
7. **Channel primitives in `ccaas-system` skill_tools.** Five `external` channel rows attached (make_phone_call id 39, send_sms id 38, transcribe_audio id 47, detect_sentiment id 55) on the legacy skill. Per Rule F7: `make_phone_call` is "voice IS the workflow" - legitimately a direct channel link. `send_sms` is generic notification and should be `notify_person` unless the workflow specifically requires SMS (it usually doesn't for CCAAS). `transcribe_audio` / `detect_sentiment` are compute tools, not channel primitives, and stay as-is. Decide: keep `send_sms` direct, or swap to `notify_person`?
8. **Domain Semantius score.** Computed on the legacy skill only (since no module-level skill exists): strict_score = 9 / 13 = 69%, operational_score = 9 / 13 = 69% (none of the 4 external rows are `integration`). Once modules ship, every module needs its own system skill (Bucket 1 #6); the 4 non-platform tools will redistribute. Surface the legacy number now so the post-fix re-score is comparable.

### Bucket 3 - Phase 0 pending (speculative)

Universal-or-near-universal vendor entities surfaced from flagship-vendor knowledge but not yet vetted via the formal Phase 0 vendor-research protocol.

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `agent_skill_assignments` | CCAAS-ROUTING-ENGINE | Universal (Genesys, NICE, Five9, Talkdesk, Amazon Connect). Junction of `users x agent_skills`. |
| `wrap_up_reasons` | CCAAS-INTERACTION-CAPTURE | Common (4/5 vendors). After-call work classification distinct from `disposition_codes`. |
| `agent_scorecards` | CCAAS-WORKFORCE-ENGAGEMENT | Verint / Calabrio / NICE. Rolled-up QM aggregate per agent per period. |
| `speech_analytics_categories` | CCAAS-WORKFORCE-ENGAGEMENT | Verint / NICE. Configurable keyword / phrase categorisation for analytics. |
| `outbound_campaigns` | CCAAS-DIALER | Five9 / NICE / Genesys. Dialer campaign definitions (predictive / preview / progressive). |
| `callback_requests` | CCAAS-ROUTING-ENGINE | Universal. Customer-initiated "call me back" with scheduled slot. |
| `ivr_languages` | CCAAS-ROUTING-ENGINE | Genesys / NICE. Localised prompt sets per supported language. |

### Cross-bucket dependencies

- Bucket 1 #1 (module shape) is the **trunk dependency** for almost every other Bucket 1 item. Bucket 1 #2 (capabilities), #6 (skill cleanup + Phase-S authoring), #M1-M4 (compliance entities), #U1-U5 (universal entities), all depend on module-code naming being settled.
- Bucket 1 #1 and Bucket 2 #1 (split shape) are the same decision viewed from two angles. Resolve Bucket 2 #1 first.
- Bucket 2 #2 (WEM-as-standalone-domain) interacts with Bucket 1 #1: if WEM is promoted, the CCAAS module set drops to 3 (Routing, Capture, Dialer) and `CCAAS-WEM` becomes a separate domain audit.
- Bucket 2 #3 (Conversation Intelligence) and Bucket 2 #4 (call_recordings split) interact: if Conv-Intel becomes a domain, then `call_recordings` (id 122) plausibly moves there, and `ccaas_call_recordings` (id 735) stays in CCAAS.
- Bucket 1 #B1 (intent.identified handoff) depends on whether CONV-AI is in scope for the same audit cycle: declined fix here means CONV-AI audit picks it up.
- Bucket 1 APQC tags B1-H1 and B1-H2 propose replacing existing `discovery_substring` tags (wrong process tagged). Each requires DELETE of the existing tag + INSERT of the new tag, not a PATCH.

### Per-bucket prompts

- **Bucket 1:** "Approve the 16 in-scope fixes? They sequence as: (1) settle module shape (Bucket 2 #1 first), (2) author capabilities + solutions + regulations + catalog UX, (3) author masters (compliance + universal), (4) wire DMDOs + relationships + user-edges, (5) author lifecycle states + module-level skills + tools, (6) replace the 2 wrong APQC tags + add 7 new ones. Fix-load can be staged."
- **Bucket 2:** "Eight judgment calls, ordered. Items 1 and 2 are load-bearing (module shape and WEM scope) and gate Bucket 1. Items 3 to 5 are taxonomy / boundary. Items 6 to 8 are cleanup. What's your call on each?"
- **Bucket 3:** "Seven candidate masters surfaced from the vendor surface but not yet vetted via formal Phase 0. Run a Phase 0 vendor-surface sweep (Verint + Calabrio + Genesys + NICE + Five9 + Talkdesk would be the flagship set), or eyeball-mode greenlight the obvious universals (`agent_skill_assignments`, `wrap_up_reasons`, `outbound_campaigns`, `callback_requests`) and defer the rest?"

### Pass 3 - Neighbor discovery

Auto-derived from handoffs and consumer DMDOs (CCAAS has no DMDOs, so derivation is handoff-only).

| Neighbor | Outbound count | Inbound count | DMDO weight | Edge weight | Pairwise depth |
|---|---|---|---|---|---|
| CSM | 2 | 0 | 0 | 2 | one-line summary |
| CRM | 2 | 0 | 0 | 2 | one-line summary |
| WFM | 2 | 0 | 0 | 2 | one-line summary |
| CONV-AI | 0 | 3 | 0 | 3 | full 5-section diff |
| KMS | 0 | 1 | 0 | 1 | one-line summary |
| WSC | 0 | 1 | 0 | 1 | one-line summary |

### Pass 4 - Pairwise reconciliation per neighbor

#### CCAAS <-> CONV-AI (edge weight 3)

1. **Existing handoffs, fully wired.** None. All 3 inbound (228, 743, 746) have both module FKs NULL (CCAAS isn't modularized).
2. **Existing handoffs with NULL module FK.** All 3 inbound rows. Resolvable target_domain_module_id only after CCAAS Bucket 1 #1 lands (module ids for routing / capture / dialer). source_domain_module_id is owed by CONV-AI's B10b (the CONV-AI side needs to attribute `conversation.escalated_to_human`, `conversation_flow.fallback_triggered`, `bot_definition.published` to specific CONV-AI modules).
3. **Missing handoffs the catalog implies should exist.** None obvious from current state (CCAAS publishes 5 trigger_events on its masters, all addressed in B9 plan; CONV-AI publishes the 3 inbound).
4. **Boundary integrity gaps.** B5 issue surfaces on handoff 530 (`intent.identified`, trigger_event 200): CCAAS publishes an event keyed on `intent_detections` (CONV-AI master) without consuming the data_object. Either CCAAS should add a `consumer` DMDO on `intent_detections` once modularized, or the handoff should be re-sourced to CONV-AI per B1-B1.
5. **Cross-domain `data_object_relationships`.** None exist between CCAAS masters and CONV-AI masters (260, 259, 701, 699). Candidates: `contact_records produces conversation_transcripts`, `contact_records produces intent_detections`. Each is owed by whichever side authors it; if intent-detection is CONV-AI's verb, then CONV-AI's outbound B8.

**Findings for CCAAS audit:** modules first (Bucket 1 #1). Re-run pairwise after CCAAS modularizes.
**Report-only for CONV-AI:** B10b source_domain_module_id NULL on the 3 inbound rows once CONV-AI is next audited.

#### Lighter neighbors (one-line summaries)

- **CSM (weight 2):** 2 outbound (call.escalated, sentiment.negative); both wired to handoffs but both have wrong APQC tags. No CSM-side gap. Fix is in CCAAS Bucket 1 H-band.
- **CRM (weight 2):** 2 outbound (contact_record.captured -> CRM-ACCT-MGT, intent.identified -> CRM-ACCT-MGT). target_domain_module_id set (46 = CRM-ACCT-MGT) on both. source_domain_module_id NULL on both. Bucket 2 #5 asks whether CRM-ACCT-MGT is truly the right consumer.
- **WFM (weight 2):** 2 outbound (agent_state.changed, queue_statistics.threshold_breached); both have both module FKs NULL. WFM also currently lacks DMDO coverage on agent_states / queue_statistics. Pairwise pass after WFM Validate.
- **KMS (weight 1):** 1 inbound (knowledge_base_article.updated). Both module FKs NULL. After KMS modularization, source_domain_module_id should resolve; target_domain_module_id when CCAAS lands modules.
- **WSC (weight 1):** 1 inbound (chat_thread.escalated_to_ticket). source set (115 = WSC-CHANNELS-CONVERSATIONS); target NULL. Target resolves once CCAAS modularizes.

### Report-only follow-ups (owed by other domains)

- **CONV-AI B10b** owes source_domain_module_id attribution on inbound rows 228 / 743 / 746 (assign whichever CONV-AI module masters the published data_object). Surface during CONV-AI Validate.
- **CONV-AI B8 / data_object_relationships** plausibly owes `conversation_transcripts produces intent_detections` (intra-CONV-AI) and `contact_records contains conversation_transcripts` cross-domain edge (whichever side owns the verb).
- **WFM B-band coverage:** WFM should declare consumer DMDOs on `agent_states` and `queue_statistics` once modularized. Currently WFM has no DMDO rows pointing at these CCAAS masters.
- **CRM B5 / boundary:** verify whether CRM-ACCT-MGT genuinely consumes `contact_records` (id 257) or if this is a leftover from the pre-modular era and should be replaced by `crm_contacts` (id 98). Surface during CRM revisit.
- **KMS B10b** owes source_domain_module_id on inbound 722; surface during KMS Validate.
- **SALES-ENG vs CCAAS** boundary: SALES-ENG masters `call_recordings` (id 122), CCAAS masters `ccaas_call_recordings` (id 735). Two distinct masters by design (rep-call vs contact-center). Surface in SALES-ENG audit as a confirmation that the split is intentional (not a duplicate that should be merged).

### Candidates queued

The Pass 2 market sweep surfaced 2 candidate domains queued in [audits/_missing-domains.md](_missing-domains.md):

- `CCAAS-WEM` (Workforce Engagement Management) - vendors Verint, NICE WEM, Calabrio ONE, Genesys WEM, Aspect. New entry.
- `CONV-INTEL` (Conversation Intelligence) - vendors Gong, Chorus, ExecVision, CallRail, Refract. Bumped to mention_count=2 (also surfaced by PA audit).

### `domains.notes` pointer

_not yet written; will require user-approved wording per Rule #15_

## 2026-05-31, Continuation: B1 technical fixes

### Scope

Subagent pass applying only the truly-technical, non-judgmental B1 fixes from the 2026-05-30 audit. Loader: [.tmp_deploy/fix_ccaas_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_ccaas_b1_technical_2026_05_31.ts), executed from project root.

### Applied (7 fixes across 2 fix-classes)

**B1-H APQC tagging (handoff_processes):**
- B1-H1: DELETE handoff_processes id=85 (handoff 225 wrong tag, process 37 / PCF 20110 "product recalls"). INSERT replacement (handoff 225, process 928 / PCF 10396 "Respond to customer problems"), proposal_source `agent_curated`. New id 748.
- B1-H2: DELETE handoff_processes id=127 (handoff 226 wrong tag, process 610 / PCF 19640 "brand-level sentiment"). INSERT replacement (handoff 226, process 934 / PCF 10400 "Respond to customer complaints"). New id 749.
- B1-H3: INSERT handoff 501 → process 928 (PCF 10396). New id 750.
- B1-H4: INSERT handoff 530 → process 138 (PCF 16613 "Analyze and respond to customer insight"). New id 751. NB: B1-B1 boundary question (whether handoff 530 should be re-sourced to CONV-AI) is unresolved; tag added on current state of the handoff.
- B1-H7: INSERT handoff 228 → process 928 (PCF 10396). New id 752.
- B1-H8: INSERT handoff 722 → process 1293 (PCF 20898 "Maintain service support knowledge repository"). New id 753. Pre-existing agent_curated tag id 238 (handoff 722 → process 429) was not flagged by the audit; both tags now coexist on handoff 722, leaving the resolution to a future judgment pass.
- B1-H9: INSERT handoff 833 → process 928 (PCF 10396). New id 754.
- B1-H5 (499 → 922) and B1-H6 (500 → 195) were already present from a prior load; skipped idempotently.

**B1-B3 user-edges (data_object_relationships, Rule #10):**
- INSERT 5 explicit edges from `users` (id 748, kind=`platform_builtin`) to the CCAAS masters the audit pre-specified.
  - id 1892: `users handles contact_records` (related 257)
  - id 1893: `users handles support_sessions` (related 256)
  - id 1894: `users has agent_states` (related 736)
  - id 1895: `users evaluates ccaas_call_recordings` (related 735)
  - id 1896: `users applies disposition_codes` (related 737)
- All rows: `owner_side=source`, `relationship_type=one_to_many`, `relationship_kind=reference`, `is_required=false`, `record_status` omitted (default `new`), `notes` omitted (Rule #15).

### Deferred (16 items)

- **B1-S1 modules (M1)** - new entities; gates almost every other fix. User must pick module split (Bucket 2 #1).
- **B1-S2 capabilities (A2)** - new entities, gated on B1-S1.
- **B1-S3 solutions (A3)** - new entities; involves vendor-named records (the only domain where vendor names are licensed per Rule #18), still treated as deferred new-entity work.
- **B1-S4 regulations (domain_regulations)** - the underlying `regulations` rows for TCPA / PCI-DSS / HIPAA / GDPR / CCPA do not exist in the catalog. Audit specifies INSERT junctions, but the parent rows must be created first as new entities. Both halves deferred to a non-technical pass.
- **B1-S5 catalog UX** - Rule #20 explicitly requires user review before write.
- **B1-S6 legacy skill cleanup (F1/F2)** - gated on B1-S1 (modules to re-anchor or delete against).
- **B1-S7 naming arbitration (B3)** - audit says "user picks", three-way decision per Rule #9.
- **B1-M1..M4 compliance entities** (`recording_consent_records`, `dnc_lists`, `tcpa_consent_records`, `pci_redaction_events`) - new entities, gated on modules.
- **B1-U1..U5 universal vendor entities** (`routing_strategies`, `ivr_flows`, `agent_skills`, `quality_evaluations`, `coaching_sessions`) - new entities, gated on modules.
- **B1-B1 trigger_event mis-attribution (handoff 530)** - audit gives two options (a)/(b), explicit user choice.
- **B1-B2 intra-domain data_object_relationships** - 5 to 7 candidate edges, but they are CCAAS↔CCAAS pairs not covered by Rule #10's "user-edges audit pre-specifies" license. Authoring them requires per-edge verb/inverse decisions, deferred.
- **B1-T1..T3 orphan trigger events** - audit notes "need a handoff row" but does not pre-specify `handoff_id` (the handoff itself does not exist yet) or resolvable PCF anchors, so `handoff_processes` insert path is not unlocked. Deferring per orchestrator prompt's "INSERT handoff_processes ONLY when audit pre-specifies handoff_id" guard.

Also deferred from the cross-bucket frame:
- **B10b FK PATCHes for inbound handoffs 228 / 743 / 746** - `source_domain_module_id` is owed by CONV-AI's side. `target_domain_module_id` would need a CCAAS module to point at, and CCAAS has zero modules (verified live). Both halves unreachable in a CCAAS-only technical pass.
- **Notes reverts** - no audit-named row IDs with notes pollution surfaced for this domain; nothing to revert.
- **Enum backfills, permission_verb_override, handoff_processes from pre-specified `handoff_id`+PCF beyond the 7 above** - none derivable from the audit's pre-specified rows.

### JWT errors

None encountered during this pass.

### Frontmatter

Left unchanged (`status: feedback_needed`, `last_transition: 2026-05-30`, `open_questions: 31`). All deferred items remain open for the next user-led pass.

## 2026-05-31, Audit

### Summary

Fresh Validate b1 structural audit. No new fixes loaded since the 2026-05-31 Continuation; this pass reclassifies what remains into schema_version 2 buckets and refreshes counts.

Live state snapshot (CCAAS, domain id 98):

- `domain_modules`: 0 (M1 blocker, no host-junction entries either).
- `capability_domains`: 1 (`SLA-MGMT`, the cross-cutting capability only).
- `solution_domains`: 0.
- `domain_regulations`: 0.
- `business_function_domains`: 1 owner (`Contact Center Operations`); no contributors / consumers.
- `domain_data_objects`: 6 masters (`support_sessions` 256, `contact_records` 257, `queue_statistics` 258, `ccaas_call_recordings` 735, `agent_states` 736, `disposition_codes` 737). No DMDO rows (no modules to anchor to).
- `data_object_lifecycle_states`: 0 across all 6 masters.
- `data_object_aliases`: 0.
- `data_object_relationships`: 2 cross-domain edges (302 chat-thread escalation in, 450 support_session-to-case out) + 5 user-edges from the 2026-05-31 fix. Intra-domain edges still 0.
- `trigger_events`: 8 on the masters. Wiring: 5 produce handoffs (198, 199, 200, 500, 501, 503). Orphans: 502 (`ccaas_call_recording.captured`), 504 (`agent_state.aux_threshold_exceeded`), 505 (`disposition_code.applied`).
- `trigger_events.event_category` integrity (B9b): 6 rows have an empty `event_category` (500 `contact_record.captured`, 501 `queue_statistics.threshold_breached`, 502, 503, 504, 505). Rule #13 enum vocabulary applies.
- `handoffs` involving CCAAS: 11 total (6 outbound, 5 inbound). Every CCAAS-side `source_domain_module_id` is NULL and every CCAAS-side `target_domain_module_id` is NULL except for 501 / 530 where the partner side (CRM-ACCT-MGT, module 46) carries its half. B10b unreachable until M1 resolves.
- `handoff_processes`: 12 rows across the 11 handoffs (handoff 722 has 2 tags: process 429 `Deliver approved content` and process 1293 `Maintain service support knowledge repository`). All `agent_curated`, all `record_status='new'`. Zero `approved`. H1 quality count = 0; agent_curated side-bar = 12.
- `skills`: 1 legacy domain-level row (`ccaas-system`, id 19, `domain_module_id=NULL`).
- `skill_tools`: 13 (4 platform queries, 3 platform mutates, plus query rows 794-796 added by an earlier load; 4 external channel/compute rows).
- Semantius score on the legacy skill: strict = 9 / 13 = 69%, operational = 9 / 13 = 69%. No `integration`-tier rows, so the two scores agree. Re-scoring is gated on module-level skill authoring (Bucket 1 #6 / B1A-F2).

Counts:
- b1a: 5 (small technical patches the agent can apply once user greenlights)
- b1b: 16 (blocked items, mostly on B2-MODULE-SHAPE / B2-WEM-SCOPE / B2-NAMING-ARBITRATION; nothing can be authored until the module set is decided)
- b2: 8 (judgment calls carried forward from 2026-05-30)
- b3: 7 (Phase 0 vendor entities to vet)

Next action by: user (b2 non-empty and gates b1b).

### Bucket 1 (b1a) - agent-solvable now

| ID | Band | Finding | Action |
|---|---|---|---|
| B1A-DESC-EMDASH | A1 / CLAUDE.md | `domains.description` and `domains.business_logic` on CCAAS each contain a U+2014 em-dash (`Distinct from CSM (case-management business app).` line uses em-dash; `the platform IS the engine.` line uses em-dash). CLAUDE.md forbids em-dashes anywhere. | Surface proposed rewrites and PATCH `domains.id=eq.98`. Rewrite: `description` to "Cloud telephony, omnichannel routing, IVR, workforce engagement management, and AI agent assist for contact centers. Distinct from CSM, which is the case-management business app." and `business_logic` to "ACD/routing engine, IVR runtime, real-time analytics, and workforce engagement (recording, QM, WFM): the platform IS the engine." |
| B1A-B9b-EVENT-CAT | B9b | 6 trigger_events have empty `event_category`: 500 (`contact_record.captured`), 501 (`queue_statistics.threshold_breached`), 502 (`ccaas_call_recording.captured`), 503 (`agent_state.changed`), 504 (`agent_state.aux_threshold_exceeded`), 505 (`disposition_code.applied`). Rule #13 enum is `{lifecycle, state_change, threshold, signal}`. | PATCH each: 500 -> `lifecycle`, 501 -> `threshold`, 502 -> `lifecycle`, 503 -> `state_change`, 504 -> `threshold`, 505 -> `state_change`. |
| B1A-H722-DEDUPE | H1 / per-handoff | Handoff 722 (KMS->CCAAS, `knowledge_base_article.updated`) carries 2 `agent_curated` tags: process 429 `Deliver approved content` (id 238 from earlier load) and process 1293 `Maintain service support knowledge repository` (id 753 from 2026-05-31 continuation). Audit B1-H8 specified PCF 20898 (process 1293) as the correct mapping; the older row is the duplicate. | DELETE `handoff_processes.id=eq.238`. |
| B1A-H743-RETAG | H1 | Handoff 743 (CONV-AI->CCAAS, `conversation_flow.fallback_triggered`) was originally proposed as B1-H10 (defer to Discover Pass 3) but has since been tagged with process 927 `Resolve customer problems, requests, and inquiries`. The match is workable but conflicts with the original "no clean PCF" judgment. | Surface to user for confirmation; either keep the existing agent_curated row or DELETE it and let Discover Pass 3 author a custom process. No write without confirmation. |
| B1A-H746-RETAG | H1 | Handoff 746 (CONV-AI->CCAAS, `bot_definition.published`) was originally proposed as B1-H11 (defer) but now tagged with process 52 `Deploy services/solutions`. Same shape as B1A-H743. | Surface to user for confirmation; keep or DELETE without writes pending user call. |

### Bucket 1 blocked (b1b) - parked on judgment calls

16 items in state.yaml under b1b, each with explicit `blocked_by[]` references. The trunk blockers are B2-MODULE-SHAPE / B2-WEM-SCOPE (module set) and B2-NAMING-ARBITRATION (per-master naming). B1B-M1-MODULES is the most-blocking single item: 12 of the other 15 b1b items reference it as a prerequisite.

### Bucket 2 (b2) - user judgment

Eight judgment calls unchanged from the 2026-05-30 audit. Module-split shape (B2-1) and WEM scope (B2-2) are the trunk dependencies. Items B2-3 / B2-4 / B2-5 (Conv-Intel positioning, call_recordings split, contact_records consumer on CRM-ACCT-MGT) feed the boundary picture. Items B2-6 / B2-7 / B2-8 are downstream cleanup once modules land.

### Bucket 3 (b3) - Phase 0 pending

Seven candidate masters from the original surface (`agent_skill_assignments`, `wrap_up_reasons`, `agent_scorecards`, `speech_analytics_categories`, `outbound_campaigns`, `callback_requests`, `ivr_languages`). Carried forward as-is; vetting path is a flagship-vendor Phase 0 sweep (Verint + Calabrio + Genesys + NICE + Five9 + Talkdesk) or eyeball greenlight for the obvious universals.

### Per-bucket prompts

- **b1a:** "5 small technical patches ready. (1) Replace 2 em-dashes in `domains` text fields, (2) backfill 6 `trigger_events.event_category` enums, (3) DELETE duplicate handoff_processes id 238 on handoff 722, (4) confirm or DELETE the 743 / 746 agent_curated tags. Approve, partial, or skip?"
- **b1b:** "11 items remain blocked on the module-shape and WEM-scope decisions (b2 items 1 and 2). I'll start working them as soon as those land."
- **b2:** "8 judgment calls carried forward, ordered by gating power. What's your call on items 1 and 2 (module split + WEM scope)? The other 6 can wait or run in parallel."
- **b3:** "7 Phase 0 candidates. Vetted sweep or eyeball greenlight on the obvious universals?"

### JWT errors

None encountered during this audit.

### Files written

- `audits/CCAAS/history.md` (this section appended)
- `audits/CCAAS/state.yaml` (rewritten in schema_version 2)

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
