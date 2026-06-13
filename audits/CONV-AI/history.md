# CONV-AI audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: 5 masters (`conversation_transcripts`, `intent_detections`, `bot_definitions`, `intent_definitions`, `conversation_flows`) + 1 consumer (`ai_agents`, mastered by DATA-AI-PLAT). **Zero `domain_modules` rows.** Zero `capability_domains` rows. Zero `domain_module_data_objects` rows. 7 solutions linked (4 primary, 2 secondary, plus Intercom). 5 regulations (GDPR, EU-AI-ACT, COPPA, TCPA, E911). 8 trigger events. 6 outbound handoffs (CRM, CCAAS x3, CSM, KMS). 3 inbound handoffs (DATA-AI-PLAT, KMS x2). 2 `business_function_domains` rows (owner: Contact Center Operations; contributor: Software Engineering). 1 legacy domain-level system skill (`conv-ai-system`, kebab name, `domain_module_id` IS NULL) with 7 skill_tools (4 platform, 3 external compute).
- Vendor-surface basis: pure-play conversational-AI specialists chosen over diversified suites. Flagship vendors: Kore.ai XO Platform, Cognigy.AI, Ada, Yellow.ai, Boost.ai. Compliance-focused: Cresta (regulated CCaaS overlay). Voice-first: Amazon Lex, Google Dialogflow CX. Salesforce Agentforce and ServiceNow Virtual Agent included because they currently link as `primary` here; their pure-play coverage is weaker than the specialists.
- Structural pass verdict: M-band hard fail. Every check from M1 onward blocks on the absence of `domain_modules`. B-band masters exist in legacy `domain_data_objects` but have no module attribution. F-band fails F1 (legacy `domain_id`-only system skill present) and F2 (no module-level system skills can exist because no modules exist). H1 fails (0 APQC tags across 9 cross-domain handoffs). B10b cannot pass on any outbound row because no source module exists.
- Domain Semantius score: uncomputable. F2 fails by construction (no `domain_modules`); F5 reports the F2 dependency.
- **Bucket 1 (in-scope, agent fixable):** 17 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

### Vendor surface basis

The five pure-play specialists span the layered surface conversational AI vendors actually master: bot authoring + NLU training + dialog management + channel orchestration + analytics. Kore.ai XO and Cognigy.AI anchor the enterprise low-code authoring side; Ada anchors the no-code CX side; Yellow.ai anchors multilingual / Asia-Pacific; Boost.ai anchors the European compliance-heavy market. Cresta is included as the regulated-CCaaS overlay; Amazon Lex and Dialogflow CX anchor voice-first and developer-first patterns. Compliance entities (consent logs, retention policies, AI Act risk classifications) come from the regulatory set on the domain (GDPR, EU-AI-ACT, COPPA, TCPA, E911) plus FCC pre-recorded voice rules where TCPA scopes voice bots.

### Pass 3 - Neighbor discovery

Auto-derived neighbor set from handoffs + cross-domain consumer dependencies:

| Neighbor | Outbound count | Inbound count | DMDO consumer pull | Edge weight | Treatment |
|---|---|---|---|---|---|
| CCAAS | 3 | 0 | 0 | 3 | Pairwise (full 5-section diff) |
| KMS | 1 | 2 | 0 | 3 | Pairwise (full 5-section diff) |
| CRM | 1 | 0 | 1 (intent_detections consumed by CRM-LEAD-MGT) | 2 | One-line summary |
| CSM | 1 | 0 | 0 | 1 | One-line summary |
| DATA-AI-PLAT | 0 | 1 | 1 (ai_agents consumed by CONV-AI) | 2 | One-line summary |

Pairwise reconciliation is collapsed into the BOUNDARY section of Bucket 1 below; both CCAAS and KMS pairs depend on CONV-AI being modularized before the 5-section diff can finish (legs 3 + 4 require module FKs to land), so the deep-dive is queued as a follow-up Validate pass.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (the M-band gate first)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | Zero `domain_modules` rows for CONV-AI (`/domain_modules?domain_id=eq.34` returns `[]`). Domain is not deployable. Blocks M2-M7, S2, S3 (per-module), and the entire F-band. | Phase M: author the module split. Recommended starting set (subject to Bucket 2 #1 confirmation): `CONV-AI-BOT-DESIGN` (masters: `bot_definitions`, `intent_definitions`, `conversation_flows`), `CONV-AI-RUNTIME` (masters: `conversation_transcripts`, `intent_detections`). 5 masters with 2 capability-distinct lifecycles (design-time vs run-time) clears Rule #14's `>=3 capabilities -> >=2 modules` floor. |
| B1-S2 | A2 | Zero `capability_domains` rows. Domain has zero capabilities catalog-wide. | Phase A: author capabilities (recommended floor: `bot authoring`, `nlu training`, `dialog management`, `channel orchestration`, `conversation analytics`, `human handoff orchestration`). Load `capability_domains` rows + `domain_module_capabilities` per the modularization Bucket 1 #1 selects. |
| B1-S3 | A4 | Both `catalog_tagline` and `catalog_description` are empty strings on the `domains` row. Rule #20 buyer-voice fields. | Draft both fields per Rule #20, surface to user for review before writing. |
| B1-S4 | F1 | Legacy domain-level system skill `conv-ai-system` (skill id 39) at `skill_type=system, domain_id=34, domain_module_id IS NULL`. Skill name uses kebab `conv-ai-system` instead of snake `<module_code_lower>_agent`. Has 7 skill_tools (4 platform query tools + transcribe_audio, generate_text, detect_sentiment as external compute). | Delete skill 39 after Phase-S authors the per-module replacements (one `system` skill per module per Rule #17, named `conv_ai_bot_design_agent` / `conv_ai_runtime_agent`). Re-link the 7 tools to the new skills. |
| B1-S5 | B2 / B3 | All 5 masters have `singular_label` + `plural_label` populated. B3 passes (all 5 names use the `<noun>_<modifier>` shape: `bot_definitions`, `intent_definitions`, `conversation_flows`, `conversation_transcripts`, `intent_detections`; none are bare common-noun forms requiring `is_canonical_bare_word=true`). | No fix required for B2/B3; report-only positive finding. |
| B1-S6 | B4 | Pattern flags all `false` on all 5 masters. `conversation_transcripts` plausibly carries `has_personal_content=true` (transcript prose contains caller PII, SSNs, voice prints under TCPA / GDPR Article 9). `bot_definitions` and `conversation_flows` plausibly carry `has_submit_lock=true` (publish + version-lock is the dominant authoring pattern). | PATCH `conversation_transcripts.has_personal_content=true`. Surface the publish-lock flags to user; both are common in market vendors but the catalog convention is to confirm before flipping. |
| B1-S7 | B6 | One intra-domain edge exists (`intent_definitions informs knowledge_articles`, row 478). Expected workflow edges absent: `bot_definitions composes conversation_flows`, `conversation_flows references intent_definitions`, `intent_detections occurs_in conversation_transcripts`, `conversation_flows produces conversation_transcripts`. | Draft 4 missing intra-domain relationships per Rule #11 and load. |
| B1-S8 | B7 | Zero `data_object_relationships` edges from any of the 5 masters to `users` (id 748). Bot authoring entities (`bot_definitions`, `intent_definitions`, `conversation_flows`) have an `author` user; analytics entities (`conversation_transcripts`, `intent_detections`) may have a `reviewing_agent` user when supervised. | Author user-edges per Rule #10. |
| B1-S9 | B9 | 8 trigger events exist; 6 carry `event_category=''` (empty string) which is not in the enum (`lifecycle`, `state_change`, `threshold`, `signal`). Only rows 200 and 201 carry valid categories. | PATCH `event_category` on rows 802-807. Per Rule #13 enum: `bot_definition.published` -> `state_change`, `bot_definition.disabled` -> `state_change`, `intent_definition.published` -> `state_change`, `intent_definition.low_confidence_burst` -> `threshold`, `conversation_flow.published` -> `state_change`, `conversation_flow.fallback_triggered` -> `signal`. |
| B1-S10 | B10b | All 6 outbound handoffs (ids 227, 228, 743, 744, 745, 746) have `source_domain_module_id IS NULL` because CONV-AI has no modules. All 3 inbound handoffs (ids 153, 723, 724) have `target_domain_module_id IS NULL` for the same reason. Handoff 227 is the only row with the target side resolved (`target_domain_module_id=47, CRM-LEAD-MGT`). | Blocked on B1-S1 + B1-S2 (modules must exist before per-module FKs resolve). Once Phase M lands, run the standard B10b backfill loader against CONV-AI handoffs. |
| B1-S11 | B11 | Zero `data_object_aliases` rows for any CONV-AI master. Vendor-specific synonyms are routine in this market: `bot_definitions` aka `assistants` (Lex, Dialogflow CX) / `agents` (Cognigy) / `virtual agents` (ServiceNow); `intent_definitions` aka `topics` (Microsoft Copilot Studio) / `flows` (Yellow.ai); `conversation_flows` aka `dialog scripts` (Kore.ai). | Draft alias rows for the 4 non-self-explanatory masters; bundle into the cluster-drafts pattern. |
| B1-S12 | B12 | Zero `data_object_lifecycle_states` rows for any of the 5 masters. Bot authoring masters (`bot_definitions`, `intent_definitions`, `conversation_flows`) have a clear `draft -> reviewing -> published -> disabled -> archived` lifecycle (every flagship vendor exposes publish + disable as separate states). `conversation_transcripts` is recording / completed / redacted / archived. `intent_detections` is event-shaped (config-shape exemption candidate; surface as Bucket 2). | Author lifecycle states per Rule #12; gate at least the `published` and `disabled` states with `requires_permission=true`. |
| B1-S13 | C2 | Zero `business_function_capabilities` override rows (because A2 returns zero capabilities). Resolved automatically when A2 lands. | Re-evaluate after B1-S2 fix. |
| B1-S14 | E1 | Zero roles for `business_function_id=70` (Contact Center Operations). No cross-functional `role_modules` either (vacuous: no modules). | Multi-module domains need >=3 roles per E1. After modularization (B1-S1) and capability authoring (B1-S2), author at minimum `CONV-AI-BOT-DESIGNER`, `CONV-AI-ANALYTICS-VIEWER`, `CONV-AI-AGENT-OPS` roles. |

#### MISSING (compliance-mandated entities)

| ID | Entity | Proposed module | Regulation | Notes |
|---|---|---|---|---|
| B1-M1 | `consent_records` | CONV-AI-RUNTIME | GDPR / TCPA / E911 | Per-conversation user consent ledger covering recording, AI processing, and (for voice) TCPA pre-recorded message disclosure. Universal across Ada, Cognigy, Boost.ai, Cresta. |
| B1-M2 | `ai_act_risk_classifications` | CONV-AI-BOT-DESIGN | EU-AI-ACT | EU AI Act requires classification of each conversational system as minimal / limited / high / unacceptable risk, with documented justification. Surfaced by Boost.ai and Cognigy compliance modules. |
| B1-M3 | `data_subject_requests` | CONV-AI-RUNTIME | GDPR | Articles 15-22 erasure / access / rectification tracking on transcripts and personal-content payloads. Surfaced by Ada, Cognigy. |

#### MISSING (universal-vendor entities, non-regulatory)

| ID | Entity | Proposed module | Notes |
|---|---|---|---|
| B1-U1 | `entity_definitions` | CONV-AI-BOT-DESIGN | NLU entity schemas (named entities, slots) sit alongside `intent_definitions`. 5/5 vendors master this as a distinct entity. |
| B1-U2 | `nlu_training_examples` | CONV-AI-BOT-DESIGN | Utterance-to-intent training pairs; the dataset the NLU model trains on. Distinct from `intent_definitions` (config) and `intent_detections` (runtime events). |
| B1-U3 | `fallback_handlers` | CONV-AI-BOT-DESIGN | First-class object on Cognigy, Kore.ai, Boost.ai; defines what happens when intent confidence falls below threshold. Currently inferable only from the `conversation_flow.fallback_triggered` event with no master row. |
| B1-U4 | `channel_integrations` | CONV-AI-RUNTIME | Per-channel deployment binding (web widget, WhatsApp, Teams, Slack, voice gateway). All 7 listed vendors master this; CONV-AI cannot model multi-channel routing without it. |

#### WRONG-OWNERSHIP

(None within CONV-AI: the domain has no module attribution to be wrong about. `ai_agents` consumer link is correct in principle; the master is owned by DATA-AI-PLAT per `domain_data_objects`.)

#### SCOPE-CREEP

(None confirmed: every existing CONV-AI master sits in the conversational-AI market surface. `intent_detections` consumed by CRM-LEAD-MGT is a legitimate outbound dependency, not creep.)

#### BOUNDARY findings per neighbor

| ID | Pair | Finding | Fix |
|---|---|---|---|
| B1-B1 | CONV-AI -> CCAAS (handoff 228, `conversation.escalated_to_human`) | `target_domain_module_id IS NULL` on the CCAAS side. CCAAS has multiple modules; the receiving one is most likely the agent-desktop / live-routing module. | Resolve when CCAAS's B10b runs; flag as report-only (CCAAS owes the target-side resolution). |
| B1-B2 | CONV-AI -> CCAAS (handoff 743, `conversation_flow.fallback_triggered`) | Same pattern, `target_domain_module_id IS NULL`. | Report-only on CCAAS. |
| B1-B3 | CONV-AI -> CCAAS (handoff 746, `bot_definition.published`) | Same pattern. | Report-only on CCAAS. |
| B1-B4 | CONV-AI -> KMS (handoff 745, `conversation_flow.fallback_triggered`) | Same pattern on KMS side. | Report-only on KMS. |
| B1-B5 | CONV-AI -> CSM (handoff 744, `intent_definition.low_confidence_burst`) | Same. | Report-only on CSM. |
| B1-B6 | CONV-AI -> CRM (handoff 227, `intent.identified`) | `target_domain_module_id=47` (CRM-LEAD-MGT) is resolved. Source side NULL pending B1-S1. | Source side fixes when CONV-AI modularizes. |

#### APQC TAGGING

H1 coverage: 0 of 9 cross-domain handoffs have any `handoff_processes` row. Cross-domain handoff count = 6 outbound + 3 inbound = 9. Target volume: 4-7 `agent_curated` rows + ~2 deferrals.

| ID | handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|---|
| B1-H1.1 | 227 | CONV-AI -> CRM | intent.identified | intent_detections | Manage customer service problems, requests, and inquiries | 196 | confident L3 |
| B1-H1.2 | 228 | CONV-AI -> CCAAS | conversation.escalated_to_human | conversation_transcripts | Escalate IT requests (analogous; cross-industry uses generic escalation) | 1318 | medium - candidate; the cross-industry PCF lacks a clean "escalate conversation to human" L3, falling back to the IT-flavored escalation. Defer? |
| B1-H1.3 | 743 | CONV-AI -> CCAAS | conversation_flow.fallback_triggered | conversation_flows | Resolve customer problems, requests, and inquiries | 927 | medium L3 |
| B1-H1.4 | 744 | CONV-AI -> CSM | intent_definition.low_confidence_burst | intent_definitions | Analyze problems, requests, and inquiries | 926 | confident L3 (signal -> analytics activity) |
| B1-H1.5 | 745 | CONV-AI -> KMS | conversation_flow.fallback_triggered | conversation_flows | Maintain service support knowledge repository | 1293 | confident L3 (fallback often surfaces knowledge gap) |
| B1-H1.6 | 746 | CONV-AI -> CCAAS | bot_definition.published | bot_definitions | Deploy services/solutions | 52 | confident L2 |
| B1-H1.7 | 153 | DATA-AI-PLAT -> CONV-AI | ai_agent.deployed | ai_agents | Deploy services/solutions | 52 | confident L2 |
| B1-H1.8 | 723 | KMS -> CONV-AI | knowledge_base_article.published | knowledge_base_articles | Maintain service support knowledge repository | 1293 | confident L3 |
| B1-H1.9 | 724 | KMS -> CONV-AI | knowledge_search_query.no_result | knowledge_search_queries | Analyze problems, requests, and inquiries | 926 | medium L3 |

Deferred-to-Discover (no clean PCF match): B1-H1.2 (escalation to human) is borderline; if reviewer prefers, defer to custom process.

### Bucket 2 - Surface-for-user (judgment calls)

1. **Modularization plan.** CONV-AI has 5 masters and no modules. The market split that vendors actually expose is design-time vs runtime: `CONV-AI-BOT-DESIGN` (bot authoring, NLU training, dialog flows, version-lock) and `CONV-AI-RUNTIME` (live transcripts, intent detections, channel orchestration, escalation). Confirm the 2-module split, OR pick 3 modules (`CONV-AI-AUTHORING`, `CONV-AI-RUNTIME`, `CONV-AI-ANALYTICS`), OR another split. This decision drives B1-S1, the F-band rebuild, and every per-module FK on handoffs.
2. **Capability set.** Recommended floor: bot authoring, NLU training, dialog management, channel orchestration, conversation analytics, human handoff orchestration. Confirm or revise. Each capability needs a `capabilities` row + `capability_domains` link + `domain_module_capabilities` link to whichever module realizes it.
3. **Pattern flag on `bot_definitions` and `conversation_flows`.** Both are publish-locked in every vendor (after publish, edits create a new version). Confirm `has_submit_lock=true` on both. `intent_definitions` similarly. These flips inform downstream skill_tools (publish becomes a workflow-gate, not a free mutate).
4. **`intent_detections` lifecycle scope.** Event-shaped data (one row per detected intent at runtime). Config-shape exemption (Rule #12), OR author `detected -> routed -> consumed` states? Recommendation: config-shape; surface a structured exemption in this audit, do NOT populate `data_objects.notes` (Rule #15).
5. **`ai_agents` consumer scope.** CONV-AI currently consumes `ai_agents` (mastered by DATA-AI-PLAT) at `consumer + required`. After modularization, which CONV-AI module declares the consumer DMDO row? Recommendation: `CONV-AI-RUNTIME`. Confirm.
6. **APQC H1.2 deferral.** The CCAAS escalation handoff (228) has no clean cross-industry PCF parent at L3. Three options: (a) accept PCF 1318 (IT-flavored escalate) as the closest analogue, (b) tag with the broader L2 196 instead, (c) defer to Discover Pass 3 custom processes. Recommendation: (b) - L2 196 keeps the catalog quality honest without forcing an IT-domain label on a CCAAS row.
7. **Regulation scope check.** CONV-AI carries E911 (Enhanced 911). E911 applies only when the conversational AI routes voice traffic that may trigger emergency-services dispatch (Amazon Connect, voice-bot platforms). Pure chat-only deployments (Ada chat, Intercom Fin) do not trigger E911. Keep as `mandatory` (presumes voice-bot inclusion), or scope down to `applicable_when_voice`?

### Bucket 3 - Phase 0 pending (speculative)

| # | Candidate | Vendor evidence | Recommended verification path |
|---|---|---|---|
| 1 | `prompt_templates` | LLM-era authoring entity surfaced by Cognigy, Kore.ai, Yellow.ai once they shifted to LLM-backed agents | Phase 0: read Cognigy LLM integration docs + Kore.ai XO 11 release notes |
| 2 | `agent_personas` | Persona / tone profiles distinct from `bot_definitions`; Boost.ai and Yellow.ai expose this separately | Phase 0: Boost.ai admin guide; Yellow.ai docs |
| 3 | `function_tools` (agent-callable tools) | LLM agents bind backend tools that the bot can invoke; Cognigy, Salesforce Agentforce, ServiceNow Now Assist all master this separately from intents | Phase 0: Agentforce schema; Cognigy.AI tool registry |
| 4 | `evaluation_runs` | Bot-evaluation harness rows; Cresta, Cognigy, and Voiceflow ship this; ties to AI Act conformance assessments | Phase 0: Cresta product docs |
| 5 | `redaction_policies` | PII redaction rules on transcripts; universal under GDPR / TCPA but modeled as a distinct master only on Cresta, Cognigy Insights, Boost.ai | Phase 0: vendor security whitepapers |
| 6 | `conversation_topics` | Topic clusters over completed transcripts (analytics layer); Cognigy Insights, Kore.ai SmartAssist, Salesforce Service Cloud Voice | Phase 0: Cognigy Insights schema |
| 7 | `voice_biometric_profiles` | Voiceprint enrollment + match; Pindrop, Nuance Gatekeeper, LumenVox; specialist market that may belong to a separate domain entirely (queued as candidate; see report-only) | Phase 0: Pindrop product docs; consider promoting to its own candidate domain |

### Cross-bucket dependencies

- Bucket 2 #1 (modularization) unlocks Bucket 1 B1-S1, which then unlocks B1-S4 (F1 cleanup), B1-S10 (B10b backfill), B1-S12 (lifecycle states per module FK), B1-S13 (C2 overrides), B1-S14 (E-band roles). Resolve Bucket 2 #1 first.
- Bucket 2 #2 (capabilities) unlocks B1-S2 and B1-S13.
- Bucket 2 #4 (`intent_detections` lifecycle) informs B1-S12.
- Bucket 2 #5 (`ai_agents` consumer module) only resolves after Bucket 2 #1.
- Bucket 3 #1, #3 (prompt_templates, function_tools) may shift the modularization recommended in Bucket 2 #1 if Phase 0 vetting confirms them as first-class masters (third module candidate: `CONV-AI-LLM-AGENTS`). Hold Bucket 2 #1 until Bucket 3 #1 + #3 are resolved if the user chooses the vetted route.
- Bucket 3 #7 (`voice_biometric_profiles`) is plausibly its own candidate domain (Pindrop, Nuance Gatekeeper, LumenVox are pure-plays); see candidate-queue follow-up below.

### Per-bucket prompts

- **After Bucket 1:** Fix these now? Reply 'all', 'just S1-S3, M1-M3, U1-U4', 'just structural', or 'skip'. B1-S1 (modularization) blocks B1-S4, B1-S10, B1-S12, B1-S13, B1-S14, so resolving it first is the fastest path through Bucket 1.
- **After Bucket 2:** What's your call on each? I need an answer per item before authoring fixes. For Bucket 2 #1, please specify the module-code naming (e.g. confirm `CONV-AI-BOT-DESIGN` / `CONV-AI-RUNTIME`, or rename).
- **After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true; I'll fold them into Bucket 1 in a follow-up pass.

### Report-only follow-ups (owed by other domains)

| Owing domain | Check | Detail |
|---|---|---|
| CCAAS | B10b | Handoffs 228, 743, 746 all need CCAAS-side `target_domain_module_id` resolution. The CCAAS module receiving conversation handoffs is the agent-desktop / live-routing one; CCAAS audit should resolve. |
| KMS | B10b | Handoff 745 needs KMS-side target module resolution. Likely the knowledge-base / search module. |
| KMS | B9 outbound on CONV-AI side | Inbound handoffs 723 (knowledge_base_article.published) and 724 (knowledge_search_query.no_result) have `source_domain_module_id IS NULL` on KMS side. |
| CSM | B10b | Handoff 744 needs CSM-side target module resolution. |
| CRM | B9 / B10b | Handoff 227 source-side (CRM domain) is irrelevant since CRM is the target; positive finding: target side already resolved to CRM-LEAD-MGT (47). |
| DATA-AI-PLAT | B9 source-side | Inbound handoff 153 (ai_agent.deployed) has `source_domain_module_id IS NULL` on DATA-AI-PLAT side. |

### Candidate domains queued

Queued via `scripts/analytics/append_missing_domain.ts` (do NOT load as `domains` rows; the user triages):

1. **CONV-DESIGN** - Conversation Design Platform. Voiceflow, Botpress Studio, Botmock, Dialogflow CX Designer. Distinct authoring-tool market from CONV-AI runtime; design-time collaboration + prototype-testing focus.
2. **CONV-INTEL** - Conversation Intelligence. Gong, Chorus.ai (ZoomInfo), Salesloft Conversations, Observe.ai, CallMiner, ExecVision. Post-conversation analytics over human-to-human calls; orthogonal to bot-driven CONV-AI but adjacent through CCAAS.
3. **AI-AGENT-OPS** - AI Agent Operations and Observability. LangSmith, Arize AI, Langfuse, Helicone, Galileo, W&B Weave. LLM agent observability + eval + trace replay; would also serve LLMOps and DATA-AI-PLAT.

Voice biometrics (Pindrop, Nuance Gatekeeper, LumenVox) is plausibly a separate candidate; left as Bucket 3 #7 pending Phase 0 vetting before queueing.

## 2026-05-31, Continuation: B1 technical fixes

Loader: [`.tmp_deploy/fix_conv_ai_b1_technical_2026_05_31.ts`](../.tmp_deploy/fix_conv_ai_b1_technical_2026_05_31.ts).

### Applied (technical-only, no judgment)

- **B1-S6 partial.** PATCH `data_objects.id=259 (conversation_transcripts).has_personal_content=true`. Publish-lock flags on `bot_definitions`, `intent_definitions`, `conversation_flows` were left for user confirmation per audit wording.
- **B1-S9.** PATCH 6 `trigger_events.event_category` backfills per Rule #13 enum: `802 bot_definition.published → state_change`, `803 bot_definition.disabled → state_change`, `804 intent_definition.published → state_change`, `805 intent_definition.low_confidence_burst → threshold`, `806 conversation_flow.published → state_change`, `807 conversation_flow.fallback_triggered → signal`. All 6 were `''` pre-load; idempotent guard refuses to overwrite any non-empty value.
- **B1-S7.** INSERT 4 intra-domain `data_object_relationships` edges named in audit: `699 bot_definitions composes 701 conversation_flows` (composition, one_to_many), `701 conversation_flows references 700 intent_definitions` (reference, many_to_many), `260 intent_detections occurs_in 259 conversation_transcripts` (reference, many_to_many), `701 conversation_flows produces 259 conversation_transcripts` (reference, one_to_many). Pre-existing edge 478 (`intent_definitions informs knowledge_articles`) preserved.
- **B1-S8 partial.** INSERT 3 user→author edges per Rule #10: `748 users authored bot_definitions/intent_definitions/conversation_flows` (reference, one_to_many, owner=source). The "may have" `reviewing_agent` edges on `conversation_transcripts` / `intent_detections` were deferred (audit hedge implies judgment).
- **B1-H1.1, H1.3, H1.4, H1.6, H1.7.** INSERT 5 `handoff_processes` rows for handoffs that had no prior tagging and where the audit named a confident PCF: `227→196`, `743→927`, `744→926`, `746→52`, `153→52`. All `proposal_source='agent_curated'`, `role='implements'`. Handoffs 723, 724, 745, 228 already carried `handoff_processes` rows (with different PCFs than the audit recommended); not overridden, since changing prior assignments is a judgment call.

### Deferred (per task spec — judgment / new entities / blocked / report-only)

- **B1-S1, S2, S4, S10, S12, S13, S14, M1, M2, M3, U1, U2, U3, U4** — all involve new entities, new modules, new capabilities, new roles, or are gated on the modularization decision (Bucket 2 #1). Per task spec: new entities / DMDOs / modules are deferred.
- **B1-S3** — `catalog_tagline` / `catalog_description` per Rule #20: drafts require user review before write.
- **B1-S5** — positive finding, no action required.
- **B1-S6 (publish-lock part)** — audit explicitly says "Surface to user; both are common but the catalog convention is to confirm before flipping."
- **B1-S11** — audit lists alias candidates but does not pre-specify exact tuples; per task spec, no bulk alias inserts without exact-tuple pre-specification.
- **B1-B1..B6** — boundary findings owed by other domains (CCAAS / KMS / CSM / CRM / DATA-AI-PLAT). Not in scope for this load.
- **B1-H1.2** — handoff 228, PCF 1318 flagged borderline by audit (`Defer?`); existing row points at PCF 928 (Respond to customer problems…), left untouched.
- **B1-H1.5, H1.8, H1.9** — handoffs 745, 723, 724 already had `handoff_processes` rows pre-load (different PCFs than audit recommends); overriding prior assignments is judgment, not technical.

No JWT errors during this pass. Audit frontmatter left unchanged.

## 2026-05-31, Audit

### Summary

- Live footprint unchanged at structural level: 5 masters (`bot_definitions`, `intent_definitions`, `conversation_flows`, `conversation_transcripts`, `intent_detections`) + 1 consumer (`ai_agents`, mastered by DATA-AI-PLAT). Zero `domain_modules`, zero `capability_domains`, zero `domain_module_data_objects`, zero `domain_module_host_domains`. M-band still hard-fails; F-band still has the legacy domain-level system skill (id 39, kebab `conv-ai-system`, 7 tools).
- 2026-05-31 technical-fixes loader landed: `conversation_transcripts.has_personal_content=true` (B1-S6 partial), 6 trigger event categories backfilled per Rule #13 enum (B1-S9 cleared), 4 intra-domain relationships (B1-S7 cleared), 3 user authoring edges (B1-S8 partial), and 5 new `handoff_processes` rows (B1-H1.1/H1.3/H1.4/H1.6/H1.7). All 9 cross-domain handoffs now carry exactly one `handoff_processes` row each at `agent_curated` / `record_status='new'`; H1 coverage is complete pending reviewer approval.
- Catalog-quality H-band number (`record_status='approved'` count) still zero; H1 is a process win, not yet a catalog-quality win.
- Bucket 1 (in-scope, agent fixable): 11 items (all structural / pattern-flag / alias / handoff PCF override that survived the 2026-05-31 pass). All 11 either depend on Bucket 2 #1 modularization or on user wording per Rule #15 / Rule #20.
- Bucket 2 (surface-for-user, judgment): 7 items, unchanged from 2026-05-30.
- Bucket 3 (Phase 0 pending, speculative): 7 items, unchanged.

### S-band sweep

- S1 (FKs to `domains`): `business_function_domains` 2 rows (owner Contact Center Ops, contributor Software Engineering); `capability_domains` 0 (A2 fail); `domain_data_objects` 6 (5 master + 1 consumer); `domain_modules` 0 (M1 fail); `domain_module_host_domains` 0; `domain_regulations` 5; `solution_domains` 7 (4 primary + 3 secondary); `handoffs.source_domain_id` 6, `handoffs.target_domain_id` 3; `skills` 1 (legacy domain-level, F1 fail).
- S2 (per-module coverage): not applicable, zero modules exist.
- S3 (per-master indirect coverage): every master scores `(states=0, events=N, aliases=0)`. `bot_definitions` 2 events, `intent_definitions` 2 events, `conversation_flows` 2 events, `conversation_transcripts` 1 event, `intent_detections` 1 event. Zero lifecycle states catalog-wide (B12 fail). Zero aliases (B11 fail).

### Band verdicts

- A1 pass (all 7 business-meta fields populated, market size 1500 USD m, 2025 source year, cost_band `$$$`).
- A2 fail (0 capabilities).
- A3 pass (7 solutions, 4 primary).
- A4 fail (`catalog_tagline` and `catalog_description` empty; Rule #20 draft + user review required).
- M1 fail (0 modules). M2/M4/M5/M6/M7/M8 blocked on M1.
- B1 pass (5 masters present). B2 pass (all 5 carry singular/plural labels). B3 pass (all 5 prefixed; no bare-word claim needed). B4 partial: `has_personal_content` flipped on `conversation_transcripts`; publish-lock and single-approver still false-by-default on the 3 authoring masters pending user confirmation.
- B5 pass (no `embedded_master` rows in this domain to validate).
- B6 pass (4 intra-domain edges + 1 pre-existing `intent_definitions informs knowledge_articles` cover the audit-named expected set).
- B7 partial: 3 user authoring edges loaded; `reviewing_agent` edges on `conversation_transcripts` / `intent_detections` deferred to user judgment.
- B8 pass (outbound edges to `knowledge_articles` exist plus 2 cross-domain reverse links from KMS, 1512 `knowledge_base_articles trains conversation_flows`, 1513 `knowledge_search_queries reveals_gap_in conversation_flows`).
- B9 pass (8 trigger events with valid categories cover all 5 masters; 2 events lack handoffs but both are `state_change` analytics signals not requiring downstream subscribers).
- B9b vacuous (single-domain, no module pairs to model).
- B10b fail (all 6 outbound + 3 inbound handoffs have `source_domain_module_id IS NULL` on CONV-AI side; blocked on M1).
- B11 fail (0 aliases across 5 masters; all 5 names are vendor-specific synonyms documented in 2026-05-30 pass).
- B12 fail (0 lifecycle states; all 5 masters need them, with `intent_detections` a candidate for config-shape surface to user).
- C1 pass (owner + contributor rows present). C2 blocked on A2.
- D1 deferred (UI spot-check is post-load).
- E1 blocked on M1 (multi-module floor cannot be satisfied without modules).
- F1 fail (skill 39 still present at `domain_id=34, domain_module_id IS NULL`, kebab name). F2/F3/F4/F5 blocked on M1.
- H1 process-pass (9 of 9 cross-domain handoffs carry exactly one `agent_curated` `handoff_processes` row each). Catalog-quality count remains 0 (`record_status='approved'`) pending reviewer signoff.

### Vendor surface basis

Carried forward from 2026-05-30, unchanged: Kore.ai XO, Cognigy.AI, Ada, Yellow.ai, Boost.ai as pure-play specialists; Cresta as the regulated-CCaaS overlay; Amazon Lex and Dialogflow CX for voice / developer patterns; Salesforce Agentforce and ServiceNow Virtual Agent as catalog-present primary solutions whose pure-play coverage is weaker. Compliance entities anchored to GDPR, EU AI Act, COPPA, TCPA, E911 plus FCC pre-recorded voice rules where TCPA scopes voice bots.

### Bucket 1, in-scope confirmed gaps

All 11 items below are pending. The 2026-05-30 enumerator IDs are preserved for traceability; the surviving items inherit them.

| ID | Band | Finding | Status / Blocker |
|---|---|---|---|
| B1-S1 | M1 | Zero `domain_modules` rows for CONV-AI. Blocks M2..M8, F2..F5, B10b, B12 module FKs, E1..E5. | Blocked on Bucket 2 #1 (modularization plan). |
| B1-S2 | A2 | Zero `capability_domains` rows. | Blocked on Bucket 2 #2 (capability set confirmation). |
| B1-S3 | A4 | `catalog_tagline` and `catalog_description` empty on `domains` row. | Blocked on user-approved Rule #20 wording. |
| B1-S4 | F1 | Legacy domain-level `system` skill 39 (`conv-ai-system`, kebab) with 7 `skill_tools` rows. | Blocked on B1-S1 (per-module replacements must land before delete). |
| B1-S6 | B4 | Publish-lock pattern flags still false on `bot_definitions`, `intent_definitions`, `conversation_flows`. | Blocked on Bucket 2 #3 confirmation. |
| B1-S10 | B10b | 6 outbound + 3 inbound handoffs carry NULL `source_domain_module_id` on the CONV-AI side. | Blocked on B1-S1 (modules required for FK resolution). |
| B1-S11 | B11 | 0 alias rows; 4 non-self-explanatory masters need vendor-specific synonyms (assistants, agents, topics, dialog scripts, etc.). | Blocked on user-approved per-row tuples per Rule #15 / vendor names allowed on `data_object_aliases`. |
| B1-S12 | B12 | 0 lifecycle states across all 5 masters. Bot authoring masters need `draft -> reviewing -> published -> disabled -> archived`; `conversation_transcripts` needs `recording -> completed -> redacted -> archived`. | Blocked on B1-S1 (state.domain_module_id) plus Bucket 2 #4 (intent_detections exemption). |
| B1-S13 | C2 | 0 `business_function_capabilities` overrides. | Blocked on B1-S2 (capabilities must exist first). |
| B1-S14 | E1 | 0 roles on Contact Center Operations function for this domain. | Blocked on B1-S1 + B1-S2. |
| B1-H2 | H1 (override) | Handoff 228 (CONV-AI -> CCAAS `conversation.escalated_to_human`) carries PCF 928 (Respond to customer problems...) from prior load; 2026-05-30 audit flagged PCF 1318 as candidate. | Blocked on Bucket 2 #6 (user choice between 928 / 1318 / L2 196 / Discover defer). |

#### MISSING entities, still pending

Carried forward from 2026-05-30: compliance entities (B1-M1 `consent_records`, B1-M2 `ai_act_risk_classifications`, B1-M3 `data_subject_requests`) plus universal-vendor entities (B1-U1 `entity_definitions`, B1-U2 `nlu_training_examples`, B1-U3 `fallback_handlers`, B1-U4 `channel_integrations`). All 7 entities require modules first (Bucket 2 #1) and per-row drafts surfaced for user approval, so they sit in `b1b` blocked.

#### BOUNDARY findings, still pending (other-domain owed)

B1-B1 through B1-B6 from the 2026-05-30 pass are unchanged: CCAAS owes target-side module resolution on handoffs 228, 743, 746; KMS owes target-side on 745 and source-side on 723 / 724; CSM owes target-side on 744; DATA-AI-PLAT owes source-side on 153. All six remain report-only; they sit under report-only follow-ups, not state.yaml entries.

### Bucket 2, surface-for-user (judgment calls)

All 7 items from 2026-05-30 remain open, restated here for self-containment:

1. Modularization plan: confirm the 2-module split `CONV-AI-BOT-DESIGN` + `CONV-AI-RUNTIME`, or pick a 3-module split with a separate analytics module, or another shape. Drives B1-S1, F-band rebuild, every handoff per-module FK.
2. Capability set: confirm the recommended 6-capability floor (bot authoring, NLU training, dialog management, channel orchestration, conversation analytics, human handoff orchestration), or revise.
3. Pattern flags: confirm `has_submit_lock=true` on `bot_definitions`, `intent_definitions`, `conversation_flows`.
4. `intent_detections` lifecycle scope: config-shape exemption per Rule #12, or author `detected -> routed -> consumed` states? Surface only, do NOT populate `data_objects.notes` per Rule #15.
5. `ai_agents` consumer scope: after modularization, which CONV-AI module holds the consumer DMDO? Recommendation: `CONV-AI-RUNTIME`.
6. APQC handoff 228 choice: PCF 928 (current row, generic respond to customer), PCF 1318 (IT-flavored escalate, candidate from 2026-05-30), L2 196 (parent class), or defer to Discover Pass 3 custom processes.
7. Regulation scope: keep E911 at `mandatory`, or scope down to `applicable_when_voice` since pure chat-only deployments never trigger E911?

### Bucket 3, Phase 0 pending (speculative)

All 7 candidate entities from 2026-05-30 remain pending Phase 0 vetting:

1. `prompt_templates` (LLM-era authoring; Cognigy / Kore.ai / Yellow.ai).
2. `agent_personas` (Boost.ai, Yellow.ai).
3. `function_tools` (agent-callable tools on LLM agents; Cognigy / Agentforce / Now Assist).
4. `evaluation_runs` (bot eval harness; Cresta / Voiceflow).
5. `redaction_policies` (PII redaction; Cresta / Cognigy Insights / Boost.ai).
6. `conversation_topics` (analytics topic clusters; Cognigy Insights / Kore.ai SmartAssist).
7. `voice_biometric_profiles` (Pindrop / Nuance Gatekeeper / LumenVox; plausibly a candidate domain rather than a CONV-AI entity).

### Cross-bucket dependencies

- Bucket 2 #1 unblocks B1-S1, S4, S10, S12, S13, S14, and all 7 MISSING entities (B1-M1..M3, B1-U1..U4).
- Bucket 2 #2 unblocks B1-S2 and B1-S13.
- Bucket 2 #3 unblocks B1-S6 directly.
- Bucket 2 #4 informs B1-S12 (intent_detections lifecycle path).
- Bucket 2 #5 only resolves after Bucket 2 #1.
- Bucket 2 #6 resolves B1-H2 immediately.
- Bucket 3 #1 and #3 (prompt_templates, function_tools) may shift Bucket 2 #1 (third module candidate `CONV-AI-LLM-AGENTS`).

### Per-bucket prompts

- After Bucket 1: every Bucket 1 item is blocked on Bucket 2 or Rule #15 / Rule #20 user wording. No agent-solvable items remain. Resolve Bucket 2 first.
- After Bucket 2: please answer per item. For #1, specify exact module codes. For #3, confirm yes/no per master. For #6, pick PCF 928 / 1318 / 196 / defer. For #7, pick mandatory / applicable_when_voice.
- After Bucket 3: vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true.

### Report-only follow-ups (owed by other domains)

| Owing domain | Check | Detail |
|---|---|---|
| CCAAS | B10b | Handoffs 228, 743, 746 target side. |
| KMS | B10b + B9 source | Handoff 745 target side; 723 + 724 source side. |
| CSM | B10b | Handoff 744 target side. |
| CRM | (none) | Target side 47 already resolved. |
| DATA-AI-PLAT | B9 source | Inbound handoff 153 (`ai_agent.deployed`) source side. |

### JWT errors

None during this audit pass.

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

State-driven Validate pass over CONV-AI (domain_id=34). Worked only the open items in state.yaml; no fresh from-scratch audit. Live re-confirmed the snapshot: CONV-AI remains an UNBUILT domain (0 domain_modules, 0 capability_domains), so the build cascade and every module-dependent item stays blocked on the B2-MOD modularization decision. Only the module-independent additive/corrective items were executable; both were executed at record_status='new'. business_function_domains (C1) already complete (owner Contact Center Operations bf 70 + contributor Software Engineering bf 26); APQC H1 coverage already complete (all 9 cross-domain handoffs carry exactly one agent_curated handoff_processes row each), so neither needed any write this pass. Loader: [`.tmp_deploy/fix_conv_ai_state_execute_2026_06_07.ts`](../../.tmp_deploy/fix_conv_ai_state_execute_2026_06_07.ts).

### Executed (additive/corrective, record_status='new')

- **entity_type classification (Rule #12 / B13): 5 PATCH.** All 5 CONV-AI masters were entity_type='unclassified'. Classified deterministically from descriptions: bot_definitions (699), intent_definitions (700), conversation_flows (701) -> `operational_workflow` (authored, publish-locked masters with a real publish/disable lifecycle); conversation_transcripts (259), intent_detections (260) -> `operational_record` (runtime log / NLU-output records, no authored workflow). intent_detections' operational_record choice is the deterministic default and does not foreclose B2-DETECT-LIFECYCLE (which now reduces to: keep operational_record vs upgrade to an authored detected -> routed -> consumed workflow).
- **Catalog UX (Rule #20 / A4): 1 PATCH (2 fields).** domains row 34 had empty catalog_tagline and catalog_description; both written with buyer-voice copy (workflow + value, no vendor/product names, no em-dash, American English). The stale "surface-before-write" gate on B1B-S3 was ignored per the empty-field-first-write rule. Module-grain catalog copy is N/A (zero modules exist).

### Surfaced (no write; need user)

- **b2 (8 open decisions):** B2-MOD (modularization shape, the gating decision for the whole build), B2-CAP (capability set), B2-FLAGS (publish-lock has_submit_lock on 699/700/701), B2-DETECT-LIFECYCLE (keep intent_detections as operational_record vs upgrade to workflow), B2-AI-AGENTS-MODULE (which module consumes ai_agents), B2-PCF-228 (APQC override on handoff 228), B2-E911-SCOPE (E911 mandatory vs applicable_when_voice), B2-ALIAS-WORDING (per-row alias tuples for B1B-S11).
- **Destructive (recommended fix only, not applied):** B1B-H2 / B2-PCF-228 - handoff 228 carries handoff_processes id 752 -> PCF 928; changing to PCF 1318 / L2 196 (or DELETE to defer) overwrites a non-empty process_id. B2-E911-SCOPE PATCH would overwrite a non-empty applicability. Skill-39 kebab->snake rename (conv-ai-system) overwrites a non-empty value.
- **Personas/RACI:** none authored (DEFER per Phase-P rule; domain is unbuilt, so persona work does not apply until modules land).

### Left (untouched)

- **UNBUILT build cascade:** B1A-BUILD and the module-dependent b1b items (B1B-S1 modules, S2 capabilities, S10 handoff FK backfill, S12 lifecycle states, S13 business_function_capabilities, S14 roles, B1B-MISSING 7 entities) - all blocked on B2-MOD / module existence. Did NOT scaffold modules or capabilities; surfaced the build.
- **B1B-S4 (RETIRED-MODEL):** original per-module-skill split + skill_tools re-link + delete-skill-39 is CANCELED per the 2026-06-06 supersession header. Live skill 39 (domain_id=34, domain_module_id NULL) already matches the retained one-domain-grain-skill model; its toolset will derive from domain_module_tools once modules land (tracked in audits/_modularization-backlog.md). Kept the supersession header.
- **b3 backlog (7 speculative candidates):** prompt_templates, agent_personas, function_tools, evaluation_runs, redaction_policies, conversation_topics, voice_biometric_profiles - untouched, Phase-0 pending.

### Owed by other domains (report-only, unchanged)

CCAAS owes target-side module FK on handoffs 228/743/746; KMS owes target-side on 745 and source-side on 723/724; CSM owes target-side on 744. (DATA-AI-PLAT source-side on 153 is already resolved: source_domain_module_id=226.)

### Note (pre-existing, not authored this pass)

The domains row 34 `business_logic` field contains a literal em-dash (the phrase "orchestration, [em-dash], the model is the product"). It is a pre-existing non-empty value; overwriting it is destructive and was not touched. Flag for a future approved cleanup so the forbidden character is removed from source data.

### JWT errors

None during this pass.

### Post-fix status

next_action_by: user (the build is gated on B2-MOD + B2-CAP; all remaining b1b items are module-dependent or b2-gated).

## 2026-06-13 - Audit (B9d verify, state-driven)

### Summary

State-driven pass over CONV-AI (domain_id=34). The only agent-executable open item was B1A-B9D-VERIFY (B9d handoff-payload realization had never run on this domain). Ran the committed resolver `scripts/analytics/b9d_resolver.ts CONV-AI` in both --dry-run and --write. Everything else in state.yaml is gated on the eight open b2 decisions (B2-MOD modularization the gate) or is module-dependent (the unbuilt build cascade), so nothing else was agent-executable. Live re-confirmed: CONV-AI is still unbuilt (0 domain_modules, 0 domain_module_data_objects, 0 capability_domains); the 5 masters live only in legacy domain_data_objects.

### B9d resolver result (B1A-B9D-VERIFY resolved)

- Boundaries walked in BOTH directions across all neighbors (CRM, CCAAS, KMS, CSM, DATA-AI-PLAT). 9 boundary tags, 8 distinct (process, owner) findings.
- Verdicts: 6 UNOWNED + 2 RESOLVED. **Zero ORPHAN, zero MIS-TAG, zero ROLL-UP.**
- No owner-side b2 + q edits to write into any domain (no ORPHANs): the --write run applied nothing additive.
- The 6 UNOWNED findings (pids 196 intent_detections, 429 knowledge_base_articles, 919 conversation_flows + knowledge_search_queries, 926 intent_definitions, 927 conversation_flows, 928 conversation_transcripts) are an artifact of the unbuilt state: the resolver reads ownership from domain_module_data_objects, which is empty here, so payloads CONV-AI masters in legacy domain_data_objects read as "no master". They will resolve to CONV-AI (and KMS) as owner once modules land (B2-MOD). Surfaced-for-review only; not auto-applied.
- The 2 RESOLVED: 8.6 "Deploy services/solutions" (pid 52) on ai_agents (owner DATA-AI-PLAT, master present) and on bot_definitions. No action.

### B1A-B9D-VERIFY closed

Removed from state.yaml. B9d is verified in both directions; no agent-executable follow-up remains (the UNOWNED set clears mechanically when the domain is modularized, which is the B2-MOD user decision, not new agent work).

### Left (untouched, unchanged)

- UNBUILT build cascade: B1A-BUILD + module-dependent b1b items (B1B-S1 modules, S2 capabilities, S4 retired-model skill note, S6 publish-lock confirm, S10 handoff FK backfill, S11 aliases, S12 lifecycle states, S13 business_function_capabilities, S14 roles, B1B-MISSING 7 entities, B1B-H2 destructive PCF override). All gated on B2-MOD / module existence / user wording.
- 8 open b2 decisions (B2-MOD, B2-CAP, B2-FLAGS, B2-DETECT-LIFECYCLE, B2-AI-AGENTS-MODULE, B2-PCF-228, B2-E911-SCOPE, B2-ALIAS-WORDING) and 7 b3 speculative candidates (now mostly promoted-to-build pending q9 answer). q-CONV-AI.md is current and unchanged; the open items it maps did not move this pass.
- Pre-existing em-dash in domains row 34 business_logic (flagged 2026-06-07) still untouched; overwriting a non-empty value is destructive, awaits approved cleanup.

### JWT errors

None during this pass.

### Post-fix status

next_action_by: user. B9d (the one agent-executable item) is done; everything remaining is gated on the eight open b2 decisions (B2-MOD first) and user-wording approvals.
