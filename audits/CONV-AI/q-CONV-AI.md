# Conversational AI (CONV-AI): questions waiting for you

## What this domain is
Build, train, and run AI chat and voice assistants that handle customer conversations across every channel. Author bots, define the intents and dialog flows they follow, train the language understanding behind them, then run them live: capture transcripts, detect intent in real time, route across web, messaging, and voice, and hand off cleanly to a human when the bot reaches its limit. The domain is unbuilt today (no modules, no capabilities), so the first decision below shapes everything that follows.

---

q1: (answer this first) How should Conversational AI be split into modules (the sub-areas of the product)?

- a) Two modules: Bot Design (design-time: bot definitions, intents, dialog flows) and Runtime (live transcripts, intent detections, channel integrations).
- b) Three modules: Authoring, Runtime, and a separate Analytics module.
- c) Three modules including a dedicated LLM Agents module (only if the LLM-era entities in the Optional section below are confirmed first).
- d) Another shape (please specify the module codes).

Recommended: a. The two-module design-time-versus-runtime split is the minimal shape that unblocks the build today and matches how flagship vendors expose the product; the third analytics or LLM-agent module only pays off once those extra entities actually exist. This choice drives the capability set, every handoff per-module link, all seven missing-entity placements, and the role authoring below it, so it unlocks the rest of the build.

a1:

---

q2: Should Conversational AI carry these six capabilities: bot authoring, NLU training, dialog management, channel orchestration, conversation analytics, and human handoff orchestration?

- a) Confirm the six recommended.
- b) Add or remove specific capabilities (please list).

Recommended: a. These six are the layered surface that conversational-AI vendors actually master, and they map cleanly onto the recommended module split.

a2:

---

q3: Should the three authoring masters (bot definitions, intents, dialog flows) be publish-locked, so that once published any edit creates a new version rather than mutating the live one?

- a) Lock all three.
- b) Lock only a subset (please name which).
- c) Leave all three unlocked.

Recommended: a. Every flagship vendor implements publish-then-version-lock on these three entities, and locking turns publish into a governed workflow gate rather than a free edit.

a3:

---

q4: How should intent detections (the runtime record of each detected intent) be treated?

- a) Keep it as a plain runtime record with no authored lifecycle.
- b) Re-type it to an authored workflow with detected, routed, and consumed states.

Recommended: a. Intent detections are event-shaped (one row per detected intent at runtime), so the plain-record classification is the natural fit; upgrading to an authored workflow only makes sense if you want to track each detection through routing and consumption.

a4:

---

q5: After the module split lands, which module should consume the shared ai_agents master (owned by the AI platform domain)?

- a) Runtime.
- b) Bot Design.
- c) Both.

Recommended: a. The agent is invoked at conversation time, so the runtime module is the natural consumer. This can only be finalized once the module split in q1 is chosen.

a5:

---

q6: The cross-domain escalation handoff (conversation escalated to a human, going to the contact-center domain) is currently tagged to the APQC process "Respond to customer problems, requests, and inquiries." How should it be tagged?

- a) Keep the current process tag.
- b) Change to "Escalate IT requests" (a more specific escalate process, but carries an IT-domain label).
- c) Change to the broader parent process "Manage customer service problems, requests, and inquiries" (vendor-neutral).
- d) Defer to a later custom-process pass.

Recommended: c. The broader parent process keeps the catalog honest without forcing an IT-domain label onto a contact-center row. Any change here overwrites a non-empty process tag, so it needs your sign-off and is never applied automatically.

a6:

---

q7: Enhanced 911 (E911) is currently marked mandatory for this domain. It only applies when the assistant routes voice traffic that can trigger an emergency-services dispatch; chat-only deployments never trigger it. Should E911 stay mandatory or be scoped down?

- a) Keep it mandatory (assumes voice bots are in scope).
- b) Scope it down to apply only when voice is in scope.

Recommended: b. Scoping it to voice-only keeps the regulation accurate for chat-only deployments. This overwrites a non-empty applicability value, so it needs your confirmation.

a7:

---

q8: For the four masters that have vendor-specific synonyms (bot definitions also called assistants / agents / virtual agents; intents also called topics / flows; dialog flows also called dialog scripts; transcripts also called conversation logs), how should the alias entries be authored?

- a) Let me draft the full alias entries, then you approve each one before it is inserted.
- b) You specify the exact alias name and type directly.
- c) Skip aliases.

Recommended: a. Aliases let buyers find the domain under whichever name their vendor uses, and a draft-then-approve pass keeps you in control of the exact wording.

a8:

---

## Optional (will not hold up the build)

q9: Six extra entities show up across the flagship LLM-era conversational-AI vendors (prompt templates, agent personas, agent-callable function tools, bot evaluation runs, transcript redaction policies, and conversation topic clusters). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are common across the vendor set, though each still wants a verification pass first, and the LLM-era authoring entities (prompt templates, function tools) could justify a third module if confirmed.

a9:

---

q10: Voice biometric profiles (voiceprint enrollment and match) show up in pure-play vendors like Pindrop and Nuance Gatekeeper. Should these be modeled as a master inside this domain, or promoted to their own candidate domain?

- a) Promote to a separate candidate domain (the pure-plays suggest a distinct market).
- b) Model as a master inside Conversational AI.

Recommended: a. The pure-play vendor set points to a distinct voice-biometrics market rather than a Conversational AI sub-feature; promoting it to a candidate domain keeps the boundary clean. Non-blocking either way.

a10:

---

<!-- agent map, ignore: q1=B2-MOD q2=B2-CAP q3=B2-FLAGS q4=B2-DETECT-LIFECYCLE q5=B2-AI-AGENTS-MODULE q6=B2-PCF-228 q7=B2-E911-SCOPE q8=B2-ALIAS-WORDING q9=B3-PROMPT-TEMPLATES+B3-AGENT-PERSONAS+B3-FUNCTION-TOOLS+B3-EVALUATION-RUNS+B3-REDACTION-POLICIES+B3-CONVERSATION-TOPICS q10=B3-VOICE-BIOMETRIC-PROFILES | domain_id=34 -->
