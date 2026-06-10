# Conversational AI (CONV-AI): questions waiting for you

## What this domain is
Build, train, and run AI chat and voice assistants that handle customer and employee conversations across every channel. Author bots, define the intents and dialog flows they follow, train the language understanding behind them, then run them live: capture transcripts, detect intent in real time, route across web, messaging, and voice, and hand off cleanly to a human when the bot reaches its limit. The domain is unbuilt today (no modules, no capabilities), so the first decision below shapes everything that follows.

> Grounding: these recommendations are backed by a fresh vendor-surface study (8 flagship vendors, 2025-2026 product docs and release notes) saved at `.tmp_deploy/CONV-AI-phase0-2026-06-08.md`. The framing signal that drives several calls below: every flagship has moved from intent-tree chatbots to LLM-driven agentic platforms in 2024-2025 (Cognigy AI Agent Studio with Jobs + Tools, Kore.ai XO + GALE, Dialogflow CX Playbooks + Generators + Tools + Data Stores, Copilot Studio Agents + Tools + Knowledge Sources, Ada Reasoning Engine + Actions + Playbooks, Boost.ai Generative Actions + API Hooks, Yellow.ai prompt-first Dynamic AI Agents). The intent/entity/flow surface still exists in all of them (hybrid architecture), but tools, prompts, and agent personas are now first-class authoring entities, not future extras.

---

q1: (answer this first) How should Conversational AI be split into modules (the sub-areas of the product)?

- a) Two modules: Bot Design (design-time authoring: bot definitions, intents, entities, dialog flows, NLU training, fallback handlers, knowledge bindings, plus the agentic-authoring entities below: agent-callable tools, prompt templates, agent personas, and the AI-Act risk classification) and Runtime (live transcripts, intent detections, channel integrations, plus the runtime compliance records: consent, data-subject requests, redaction policies).
- b) Three modules: Bot Design, Runtime, and a separate Analytics module (conversation topic clusters and reporting carved off Runtime).
- c) Three modules including a dedicated LLM Agents module (agent tools, prompts, personas split out of Bot Design into their own module).
- d) Another shape (please specify the module codes).

Recommended: a. The design-time-versus-runtime split is the line every flagship draws: Cognigy splits authoring (Flows + Intents + Entities + Playbooks + Knowledge AI + AI Agent Jobs/Tools) from live conversation + handover; Dialogflow CX separates design-time Agents/Flows/Pages/Intents/Entity-Types/Generators/Tools/Data-Stores from per-turn runtime webhooks; Copilot Studio authors Agents from Topics + Knowledge Sources + Tools + Triggers, then runs them across channels with per-user auth; Ada separates build (Knowledge Sources, Actions, Playbooks, Coaching) from run (Reasoning Engine + Performance Center). Note this two-module shape now INCLUDES the agentic-authoring entities (tools, prompts, personas) inside Bot Design, because that is exactly where the vendors keep them, not in a separate product line. A separate Analytics module (option b) is defensible only if you want a discrete reporting deliverable: the vendors ship analytics as a view over runtime transcripts (Yellow.ai's 20+ dashboards, Ada Performance Center, Cognigy Insights), so it masters little of its own beyond topic clusters. A dedicated LLM-Agents module (option c) is NOT recommended: Cognigy, Copilot Studio, and Dialogflow CX all keep tools/prompts/personas inside the bot builder, so splitting them out fractures the authoring workflow the vendors deliberately unify. This choice drives the capability set, every handoff per-module link, the missing-entity placements, and the role authoring below it.

a1:

---

q2: Should Conversational AI carry these six capabilities: bot authoring, NLU training, dialog management, channel orchestration, conversation analytics, and human handoff orchestration?

- a) Confirm the six recommended.
- b) Add or remove specific capabilities (please list).

Recommended: a, with one addition to weigh. These six are the layered surface conversational-AI vendors actually master and they map cleanly onto the recommended module split (the first three live in Bot Design, the last three in Runtime). The fresh vendor surface suggests one capability the original six understate: agent tool-use / action orchestration is now its own competence (Cognigy Jobs + Tools, Ada Actions + API skills, Copilot Studio Tools + Connectors, Boost.ai Generative Actions, Dialogflow CX Tools). If you want the capability set to reflect the LLM-agent shift, add a seventh, "agent action orchestration", folded into Bot Design; if you would rather keep it inside "dialog management", the six stand. Either way this is a low-stakes call that does not block the build.

a2:

---

q3: Should the three authoring masters (bot definitions, intents, dialog flows) be publish-locked, so that once published any edit creates a new version rather than mutating the live one?

- a) Lock all three.
- b) Lock only a subset (please name which).
- c) Leave all three unlocked.

Recommended: a. Publish-then-version-lock is the dominant authoring pattern across the flagships: Dialogflow CX versions and publishes flows/agents as discrete artifacts; Copilot Studio publishes agents as a deliberate state separate from editing the draft; Cognigy promotes Flows through environments; Boost.ai and Yellow.ai both treat publish as a governed step. Locking turns publish into a workflow-gate permission rather than a free mutate, which is how the vendors govern who can push a change live. Locking all three (bot definitions, intents, dialog flows) matches the vendor reality and keeps the gate consistent across the authoring surface.

a3:

---

q4: How should intent detections (the runtime record of each detected intent) be treated?

- a) Keep it as a plain runtime record with no authored lifecycle.
- b) Re-type it to an authored workflow with detected, routed, and consumed states.

Recommended: a. Across the flagships, intent detection is an event emitted per turn at runtime (Dialogflow CX matches an intent per page-state transition; Cognigy and Kore.ai score and emit the detected intent inline; Ada's Reasoning Engine decides per message), not a record an operator walks through a lifecycle. None of the vendors expose a detected-routed-consumed state machine on the detection itself; routing is a property of the conversation flow, not of the detection row. So the plain-record classification is the natural fit. Upgrading to an authored workflow only makes sense if you specifically want to track each detection through routing and consumption as a governed object, which no flagship does today.

a4:

---

q5: After the module split lands, which module should consume the shared ai_agents master (owned by the AI platform domain)?

- a) Runtime.
- b) Bot Design.
- c) Both.

Recommended: a. The ai_agents record is the deployed runtime agent, and the vendors invoke it at conversation time, not at authoring time: Cresta frames the conversational-AI platform as the layer that "manages the autonomous agent logic and escalation decision-making" at runtime over CCaaS infrastructure; Ada's Reasoning Engine and Cognigy's AI Agents execute live against the deployed agent. Bot Design authors the bot definition; Runtime invokes the deployed ai_agent. So Runtime is the natural consumer. This can only be finalized once the module split in q1 is chosen.

a5:

---

q6: The cross-domain escalation handoff (conversation escalated to a human, going to the contact-center domain) is currently tagged to the APQC process "Respond to customer problems, requests, and inquiries." How should it be tagged?

- a) Keep the current process tag.
- b) Change to "Escalate IT requests" (a more specific escalate process, but carries an IT-domain label).
- c) Change to the broader parent process "Manage customer service problems, requests, and inquiries" (vendor-neutral).
- d) Defer to a later custom-process pass.

Recommended: c. This is an APQC-tagging call, not a market-shape one, so it grounds in real escalation practice rather than vendor packaging: the vendors treat bot-to-human escalation as a contact-center service activity (Cresta and Cognigy hand the conversation, with full context, to the human-agent desktop in CCaaS), so a customer-service process is the right family. The broader parent process keeps the catalog honest without forcing an IT-domain label onto a contact-center row, which is the defect in option b. Any change here overwrites a non-empty process tag, so it needs your sign-off and is never applied automatically.

a6:

---

q7: Enhanced 911 (E911) is currently marked mandatory for this domain. It only applies when the assistant routes voice traffic that can trigger an emergency-services dispatch; chat-only deployments never trigger it. Should E911 stay mandatory or be scoped down?

- a) Keep it mandatory (assumes voice bots are in scope).
- b) Scope it down to apply only when voice is in scope.

Recommended: b. Grounded in real deployment practice: a large share of the flagship market ships chat-only or chat-first (Ada and Intercom Fin are chat-resolution products; Yellow.ai and Cognigy are omnichannel but most deployments are messaging) and never touch emergency-services dispatch, while only voice-bot deployments over telephony can trigger E911. Scoping it to voice-only keeps the regulation accurate for the chat-only majority. This overwrites a non-empty applicability value, so it needs your confirmation.

a7:

---

q8: For the four masters that have vendor-specific synonyms (bot definitions also called assistants / agents / virtual agents; intents also called topics / flows; dialog flows also called dialog scripts; transcripts also called conversation logs), how should the alias entries be authored?

- a) Let me draft the full alias entries, then you approve each one before it is inserted.
- b) You specify the exact alias name and type directly.
- c) Skip aliases.

Recommended: a. The synonyms are real and well-evidenced in the vendor surface (Dialogflow CX and Amazon Lex say "agents"/"bots"; Cognigy says "AI Agents"; ServiceNow says "virtual agents"; Copilot Studio says "topics"; Yellow.ai and Dialogflow CX say "flows"; Kore.ai says "dialog tasks"), so aliases let buyers find the domain under whichever name their vendor uses. Aliases are commerce-shaped entities where vendor names are allowed, so a draft-then-approve pass keeps you in control of the exact wording without blocking the build.

a8:

---

## Optional (will not hold up the build)

q9: The fresh vendor study found the LLM-era entities are not all speculative: agent-callable tools (function tools), prompt templates, and agent personas are now first-class masters across most flagship vendors, while bot evaluation runs, transcript redaction policies, and conversation topic clusters are genuinely discretionary. Should the three confirmed entities be built into the modules, and the other three researched and added where they hold up?

- a) Build the three confirmed entities (agent tools, prompt templates, agent personas) into Bot Design as part of the main build, and research the other three (evaluation runs, redaction policies, conversation topics) as additive later.
- b) Keep all six in the optional backlog and revisit after the modules exist.
- c) Skip them all.

Recommended: a. REVERSED from the prior pass, which filed all six as speculative b3 candidates pending Phase 0 vetting. The vetting is now done and three of them are core, not speculative: agent-callable tools/actions are first-class in 5 of 5 enterprise authoring vendors (Cognigy Jobs define "Tools (actions) the Agent can execute, like accessing APIs, retrieving data, initiating workflows"; Copilot Studio Tools + Actions via Connectors; Dialogflow CX Tools, GA 2025; Ada Actions + API skills framework; Boost.ai Generative Actions + API Hooks); prompt templates are first-class where authoring is prompt-driven (Yellow.ai prompt-first Dynamic AI Agents, Dialogflow CX Generators using custom prompts, Copilot Studio agent instructions); agent personas are a distinct master in 4 of 5 (Boost.ai multi-agent handoff, Cognigy AI Agent Jobs, Yellow.ai personas). These three belong inside Bot Design alongside intents and flows, not in an optional backlog. The remaining three stay discretionary because the vendor surface is thinner and the workflow degrades gracefully without them: bot evaluation runs (Cresta, Cognigy, Voiceflow ship a test harness; 3 vendors), transcript redaction policies (Cresta, Cognigy Insights, Boost.ai model it as a distinct master, though it is also compliance-driven under GDPR/TCPA), and conversation topic clusters (an analytics-layer computed entity; Cognigy Insights, Kore.ai SmartAssist, Yellow.ai). Note: choosing (a) raises the question of whether the agent-tooling surface is heavy enough to justify the q1 option (c) third module, but the vendor evidence says no, keep them in Bot Design.

a9:

---

q10: Voice biometric profiles (voiceprint enrollment and match) show up in pure-play vendors like Pindrop and Nuance Gatekeeper. Should these be modeled as a master inside this domain, or promoted to their own candidate domain?

- a) Promote to a separate candidate domain (the pure-plays suggest a distinct market).
- b) Model as a master inside Conversational AI.

Recommended: a. The vendor surface is decisive here: none of the eight conversational-AI flagships (Cognigy, Kore.ai, Dialogflow CX, Copilot Studio, Ada, Boost.ai, Yellow.ai, Cresta) master voiceprint enrollment or match, while Pindrop, Nuance Gatekeeper, and LumenVox are pure-play voice-biometrics / caller-authentication vendors with a distinct fraud-and-identity buyer. Voice biometrics integrates with voice bots (caller auth, fraud screening) but is structurally a separate authentication market, so promoting it to a candidate domain keeps the boundary clean. Non-blocking either way.

a10:

---

<!-- agent map, ignore: q1=B2-MOD q2=B2-CAP q3=B2-FLAGS q4=B2-DETECT-LIFECYCLE q5=B2-AI-AGENTS-MODULE q6=B2-PCF-228 q7=B2-E911-SCOPE q8=B2-ALIAS-WORDING q9=B3-PROMPT-TEMPLATES+B3-AGENT-PERSONAS+B3-FUNCTION-TOOLS+B3-EVALUATION-RUNS+B3-REDACTION-POLICIES+B3-CONVERSATION-TOPICS q10=B3-VOICE-BIOMETRIC-PROFILES | domain_id=34 | phase0=.tmp_deploy/CONV-AI-phase0-2026-06-08.md | reversed: q9 B3 function_tools/prompt_templates/agent_personas speculative->core (promote to build); q1 reasoning regrounded off build-convenience onto vendor packaging -->
