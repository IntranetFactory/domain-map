# CONV-AI Phase 0 — Vendor Surface (2026-06-08)

Domain: Conversational AI (domain id 34, no parent). Live state UNBUILT: 5 masters
(`bot_definitions`, `intent_definitions`, `conversation_flows` as operational_workflow;
`conversation_transcripts`, `intent_detections` as operational_record) plus 1 consumer
(`ai_agents`, id 231, mastered by DATA-AI-PLAT). Zero modules, zero capabilities, zero
solution masters of its own. 7 linked solutions (Salesforce Agentforce, ServiceNow Virtual
Agent, Ada, Kore.ai XO, Cognigy.AI primary; Leena AI, Intercom secondary).

Live-domain confirmation: `domain_name='Conversational AI'`, description "Virtual agents,
chatbots, and voice bots for customer and employee self-service", `crud_percentage=20`,
`business_logic` = "NLU/LLM stack, dialog management, intent/entity extraction, and tool-use
orchestration, the model is the product." This is unambiguously the chatbot/voice-bot
build-and-run market, so the candidate vendor set holds (no CLIN-DEV-style pivot needed).

Research basis: current (2025-2026) vendor product/docs/release-note pages. The single
dominant market signal: every flagship has shifted from intent-tree chatbots to LLM-driven
**agentic** platforms in 2024-2025. Cognigy now ships "AI Agent Studio" with Jobs + Tools +
Knowledge AI; Kore.ai ships XO + GALE agent tooling; Dialogflow CX added Playbooks,
Generators, Data Stores, and Tools; Copilot Studio reframed Topics around Agents + Tools +
Knowledge Sources + Triggers; Ada is a dual-model Reasoning Engine with Actions + Playbooks;
Boost.ai ships Generative Actions + API Hooks; Yellow.ai is prompt-first Dynamic AI Agents.
The intent/entity/flow surface still exists in all of them (hybrid architecture), but tools,
prompts, and agent personas are now first-class, not speculative.

## Flagship vendors

| Vendor | Sub-market | URL | What it is | Why included |
| --- | --- | --- | --- | --- |
| Cognigy.AI (NiCE) | Enterprise low-code + agentic | cognigy.com | AI Agent Studio: Flows, Intents, Entities, Playbooks (test scripts), Knowledge AI (RAG), AI Agents with Jobs + Tools, channel + voice | Enterprise authoring leader; defines the hybrid intent+agent surface |
| Kore.ai XO 11 | Enterprise IVA + agent platform | kore.ai | XO + Search AI + GALE: dialog tasks, intents, entities, knowledge graph, agent apps, tools, ~120 languages | Broadest module decomposition; shows where vendors draw lines |
| Google Dialogflow CX | Voice-first / developer | cloud.google.com/dialogflow/cx | Agents, Flows, Pages (state machine), Intents, Entity Types, Webhooks, Generators, Data Stores, Tools | Developer-first + voice baseline; cleanest state-machine model |
| Microsoft Copilot Studio | Suite / low-code (ex Power Virtual Agents) | learn.microsoft.com/microsoft-copilot-studio | Agents, Topics, Entities/Variables, Knowledge Sources, Tools, Actions, Connectors, Triggers, user authentication | Suite vendor; shows mainline LLM-agent packaging |
| Ada | No-code CX / autonomous resolution | ada.cx | Reasoning Engine (dual-model), Knowledge Sources, Actions (API skills), Playbooks (SOP workflows), Coaching, Performance Center | No-code CX leader; autonomous-resolution shape |
| Boost.ai | European, regulated, guardrails | boost.ai | No-code builder, unlimited intents, Generative Actions + API Hooks, agent personas (multi-agent handoff), enterprise guardrails | Compliance/regulated-industry specialist (the Phase 0 compliance lens) |
| Yellow.ai | Multilingual / APAC, prompt-first | yellow.ai | Dynamic AI Agents (prompt-based), DynamicNLP intents, Knowledge Base (Agentic RAG), 35+ channels, 20+ analytics dashboards with topic clustering + sentiment | Prompt-first + analytics-heavy variant |
| Cresta | Regulated CCaaS overlay / agent-assist | cresta.com | AI agents + human agent-assist sharing data/analytics/governance; layers onto CCaaS without rip-and-replace | The CONV-AI <-> CCAAS boundary case |

## Boundary verdicts (the decisions this feeds)

### A. Module split: design-time vs runtime is right, but the agentic layer is now in scope

VERDICT: A two-pillar split (authoring/design-time vs runtime/execution) matches every
flagship, BUT the LLM-agent surface (tools/actions, prompts, agent personas, knowledge
binding) is no longer "speculative LLM-era extra": it is the authoring substrate in 2025
product. So whichever shape is chosen, the authoring module must include the agent-tooling
entities, not just intents/flows.

Named-vendor evidence:
- Cognigy splits authoring (Flows + Intents + Entities + Playbooks + Knowledge AI + AI Agent
  Jobs/Tools) from runtime (live conversations, channel delivery, handover). Its own docs
  describe the hybrid as "blend the deterministic structure of intent-based workflows with
  the flexibility of Agentic AI."
- Dialogflow CX is explicitly two-layered: design-time Agents/Flows/Pages/Intents/Entity
  Types/Generators/Tools/Data Stores, runtime conversation handling + webhooks fired per turn.
- Copilot Studio authors Agents from Topics + Knowledge Sources + Tools + Triggers, then runs
  them across channels with per-user authentication.
- Ada cleanly separates build (Knowledge Sources, Actions, Playbooks, Coaching) from run
  (Reasoning Engine resolving live conversations, Performance Center analytics).

A separate Analytics module is defensible (Yellow.ai's 20+ dashboards + topic clustering +
sentiment; Cognigy Insights; Ada Performance Center are a distinct surface), but every vendor
ships analytics as a view over runtime transcripts, not as a standalone authored product, so
analytics is better as a slice of Runtime than a third module unless the build wants a
discrete reporting deliverable. A dedicated LLM-Agents module is NOT warranted: the agentic
entities (tools, prompts, personas) are authoring concerns the vendors keep inside the bot
builder, not a separate product line.

### B. What CONV-AI masters vs consumes (the CCAAS boundary)

VERDICT: CONV-AI masters the autonomous agent logic and its runtime record; it CONSUMES /
hands off the human-agent infrastructure to CCAAS. The escalation event is published by
CONV-AI with full context; CCAAS owns queues, agent desktop, routing, telephony.

Named-vendor evidence:
- Cresta is explicit: "CCaaS handles the infrastructure and routing, while conversational AI
  platforms manage the autonomous agent logic and escalation decision-making." When the AI
  agent escalates, Cresta Agent Assist (a CCaaS-side surface) continues supporting the human
  agent. So routing/desktop is CCAAS; the bot logic + escalation decision is CONV-AI.
- Cognigy "supports voice bots, agent assist, and controlled handoffs to human agents, with
  integrations with telephony systems, CRMs, and CCaaS platforms." Telephony + CCaaS are
  integration targets, not CONV-AI masters.
- Cresta layers "onto existing CCaaS infrastructure without a rip-and-replace": CONV-AI is the
  agent-logic layer above CCAAS infrastructure.

Mastered by CONV-AI: bot_definitions, intent_definitions, entity_definitions,
nlu_training_examples, conversation_flows, fallback_handlers, knowledge_source bindings,
function_tools (agent-callable actions), prompt_templates, agent_personas,
channel_integrations, conversation_transcripts, intent_detections, plus the governance
surface (consent_records, ai_act_risk_classifications, data_subject_requests,
redaction_policies). Consumed / handed off: ai_agents (DATA-AI-PLAT master, the deployed
runtime); human-agent routing/queue/desktop (CCAAS); knowledge_base_articles (KMS master).

### C. LLM-agent entities (function_tools, prompt_templates, agent_personas) are CORE now, not b3

VERDICT: REVERSE the prior treatment. The prior q-file/state filed `function_tools`,
`prompt_templates`, and `agent_personas` as speculative b3 candidates "pending Phase 0
vetting." Phase 0 confirms they are first-class masters across 4-5 of the flagship vendors,
so they belong in the build (b1b MISSING / Phase B), not the optional backlog.

Named-vendor evidence:
- function_tools (agent-callable actions/tools): Cognigy Jobs define "specific Tools (actions)
  the Agent can execute, like accessing APIs, retrieving data, initiating workflows"; Copilot
  Studio "Tools and Actions" via Connectors; Dialogflow CX "Tools" (data-store tools usable by
  any agent, GA 2025); Ada "Actions ... API connections" and "API-based skills framework";
  Boost.ai "Generative Action ... customized API Hooks." 5 of 5 enterprise authoring vendors.
- prompt_templates: Yellow.ai is prompt-first ("Ask AI converts ideas into structured
  prompts"); Dialogflow CX Generators use "custom prompts to generate agent responses at
  runtime"; Copilot Studio agents coordinate "instructions" (system prompts). Prompt/generator
  config is a versioned, reusable authoring artifact (the MLflow Prompt Registry pattern
  mirrors it).
- agent_personas: Boost.ai "manage many agents on the same instance that can seamlessly hand
  off to each other"; Cognigy AI Agents have Jobs/roles; Yellow.ai exposes agent personas.
  Multi-agent / persona is a distinct masterable concept from bot_definitions (top-level
  config) in 4 of 5.

These three were the speculative core of q9; the evidence promotes function_tools and
prompt_templates to MISSING (build them), and agent_personas to MISSING/Common. The rest of
the old b3 set (evaluation_runs, redaction_policies, conversation_topics) stay genuinely
discretionary additive (1-3 vendors, workflow degrades gracefully without them).

### D. Compliance surface (regulated market)

VERDICT: The three compliance entities the prior pass flagged are real and load regardless of
vendor presence. The market (EU AI Act + GDPR + TCPA) drives them.

Named-evidence / regulatory:
- EU AI Act: chatbots are "limited risk" (transparency obligation: inform users they are
  interacting with AI, effective Aug 2026), and HIGH risk when used for creditworthiness,
  insurance pricing, or access to essential services. This is exactly an
  `ai_act_risk_classifications` master (per-bot risk tier + documented justification).
- GDPR: valid legal basis + transparency + DSAR support ("export capabilities for quick
  response to data subject requests") => `consent_records` + `data_subject_requests`.
- PII redaction: "PII redaction tools can automatically remove sensitive information from
  transcripts and recordings" => `redaction_policies` (Cresta, Cognigy Insights, Boost.ai
  model it as a distinct master; universal under GDPR/TCPA, so Compliance-classified even
  where only 3 vendors expose it publicly).

### E. Voice biometrics is a separate market, not a CONV-AI master

VERDICT: Keep `voice_biometric_profiles` OUT of CONV-AI (promote to a candidate domain).
Pindrop, Nuance Gatekeeper, LumenVox are pure-plays; none of the conversational-AI flagships
master voiceprint enrollment/match. It integrates with voice bots (telephony fraud / caller
auth) but is a distinct fraud/authentication market.

## Surface matrix

Vendor columns: COG=Cognigy, KOR=Kore.ai XO, DCX=Dialogflow CX, MCS=Copilot Studio, ADA=Ada,
BST=Boost.ai, YEL=Yellow.ai. Mark = present in flagship product docs. Classification: Core
(>=3 vendors), Common (2), Specialist (1), Compliance (regulation-driven).

### Master records (authoring / design-time)

| Entity | Category | COG | KOR | DCX | MCS | ADA | BST | YEL | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| bot_definitions | Master | x | x | x | x | x | x | x | Core | Authoring |
| intent_definitions | Master | x | x | x | x | x | x | x | Core | Authoring |
| entity_definitions | Master | x | x | x | x |  | x | x | Core | Authoring |
| nlu_training_examples | Config | x | x | x | x |  | x | x | Core | Authoring |
| conversation_flows | Master | x | x | x | x | x | x | x | Core | Authoring |
| fallback_handlers | Config | x | x | x | x | x | x |  | Core | Authoring |
| knowledge_source_bindings | Config | x | x | x | x | x | x | x | Core | Authoring (consumes KMS) |
| function_tools | Master | x | x | x | x | x | x |  | Core | Authoring |
| prompt_templates | Config | x | x | x | x |  |  | x | Core | Authoring |
| agent_personas | Master | x | x |  | x |  | x | x | Core | Authoring |
| evaluation_runs | Transition | x |  | x |  | x |  |  | Common | Authoring (discretionary) |

### Runtime records

| Entity | Category | COG | KOR | DCX | MCS | ADA | BST | YEL | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| conversation_transcripts | Master | x | x | x | x | x | x | x | Core | Runtime |
| intent_detections | Transition | x | x | x | x | x | x | x | Core | Runtime |
| channel_integrations | Master | x | x | x | x | x | x | x | Core | Runtime |
| conversation_topics | Computed | x | x |  |  | x |  | x | Common | Runtime (analytics; discretionary) |

### Audit & compliance (regulation-driven, load regardless of vendor count)

| Entity | Regulation | COG | ADA | BST | CRESTA | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | --- | --- |
| consent_records | GDPR / TCPA / E911 | x | x | x | x | Compliance | Runtime |
| ai_act_risk_classifications | EU AI Act | x |  | x |  | Compliance | Authoring |
| data_subject_requests | GDPR Art. 15-22 | x | x |  |  | Compliance | Runtime |
| redaction_policies | GDPR / TCPA | x |  | x | x | Compliance | Runtime |

### Consumed / out-of-domain

| Entity | Owner domain | Relationship | Note |
| --- | --- | --- | --- |
| ai_agents | DATA-AI-PLAT | consumer + required | deployed runtime agent; invoked at conversation time |
| knowledge_base_articles | KMS | consumer (via knowledge_source_bindings) | RAG content source |
| human-agent routing / queues / desktop | CCAAS | handoff target | escalation published by CONV-AI; CCAAS routes |
| voice_biometric_profiles | (candidate VOICE-BIO domain) | not mastered | Pindrop/Nuance/LumenVox pure-play market |

## Compliance entities (non-optional for this market)

| Entity | Regulation | Baseline vs scoped | Proposed module |
| --- | --- | --- | --- |
| consent_records | GDPR / TCPA (recording + AI-processing consent); E911 for voice dispatch | Baseline | Runtime |
| ai_act_risk_classifications | EU AI Act (limited-risk transparency; high-risk for essential services) | Baseline (any EU-facing bot) | Authoring |
| data_subject_requests | GDPR Articles 15-22 (access/erasure/rectification on transcripts) | Baseline (any EU data subjects) | Runtime |
| redaction_policies | GDPR / TCPA (PII removal from transcripts and recordings) | Baseline | Runtime |

E911 note: applies ONLY when the bot routes voice traffic that can trigger emergency-services
dispatch. Chat-only deployments never trigger E911, so its applicability should be voice-scoped,
not blanket-mandatory (feeds the E911-scope decision).

## Modularization hypothesis

Rule #14: every module >=1 master; >=3 capabilities => >=2 modules. CONV-AI has 5 existing
masters + the LLM-agent additions (function_tools, prompt_templates, agent_personas) +
4 compliance masters, easily >=3 capabilities, so >=2 modules.

### Scenario 1 — 2 modules (RECOMMENDED)

1. **CONV-AI-BOT-DESIGN** (design-time / authoring) — masters: bot_definitions,
   intent_definitions, entity_definitions, conversation_flows, function_tools, agent_personas;
   config: nlu_training_examples, fallback_handlers, prompt_templates, knowledge_source_bindings;
   compliance: ai_act_risk_classifications. (master anchor: bot_definitions)
2. **CONV-AI-RUNTIME** (execution + analytics + compliance ops) — masters:
   conversation_transcripts, intent_detections, channel_integrations; compliance:
   consent_records, data_subject_requests, redaction_policies; consumes ai_agents
   (DATA-AI-PLAT) + knowledge_base_articles (KMS). (master anchor: conversation_transcripts)

This is the design-time/runtime split every flagship exhibits, with the agentic-authoring
entities placed in BOT-DESIGN (where the vendors keep them) and compliance ops split by where
the record lives (risk classification is an authoring artifact; consent/DSAR/redaction are
runtime-transcript artifacts).

### Scenario 2 — 3 modules (separate Analytics)

Scenario 1 plus **CONV-AI-ANALYTICS** carving conversation_topics + reporting views off
RUNTIME. Justified only if the build wants a discrete reporting deliverable; the vendors ship
analytics as a runtime view (Yellow.ai dashboards, Ada Performance Center, Cognigy Insights),
so it does not cleanly master its own first-class records beyond conversation_topics (a
Common, computed entity). Weakest standalone-master story of the three modules.

### Scenario 3 — 3 modules incl. CONV-AI-LLM-AGENTS

NOT recommended. The agentic entities (function_tools, prompt_templates, agent_personas) are
authoring concerns the vendors keep inside the bot builder (Cognigy AI Agent Studio, Copilot
Studio agent authoring, Dialogflow CX tools). Splitting them into a separate module fractures
the authoring workflow that vendors deliberately unify. Fold them into BOT-DESIGN instead.

Recommended: Scenario 1 (2 modules), with function_tools / prompt_templates / agent_personas
loaded into BOT-DESIGN as part of the build (NOT held as b3), and the compliance quartet split
authoring/runtime as above. Voice biometrics promotes to a candidate domain.
