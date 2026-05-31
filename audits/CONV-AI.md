---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 31
---

# CONV-AI - Audit History

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
