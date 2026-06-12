# Telecommunications OSS/BSS (TELCO-BSS): questions waiting for you

## What this domain is
Run a communications service provider's commercial and operational back office in one place: the product catalog, customer orders, subscriptions, service provisioning, network inventory, billing, and trouble tickets. A high-throughput rating and charging engine sits at the core, with the rest of the domain carrying the catalog, order, subscription, and customer records that feed it. This is the system that takes an order all the way to an activated, billed, and supported service.

---

q1: (answer this first) How should Telecommunications OSS/BSS be split into modules (the sub-areas of the product)?

- a) Seven modules aligned to the standard telco process areas: Order Management, Catalog, Provisioning, Inventory, Billing, Assurance, Subscriptions.
- b) Five modules: a commercial module (order plus catalog), an operational module (provisioning plus inventory), and Billing, Subscriptions, Assurance kept separate.
- c) Three starter modules: Order-to-Cash, Provisioning-and-Inventory, and Assurance.

Recommended: a. It mirrors the TM Forum eTOM Level 2 process areas the whole market organizes against, and matches how the flagship suites lay out their products. This choice gates the entire build (capabilities, modules, lifecycle states, internal relationships, user edges, and source-module backfill all wait on it), so it unlocks everything else.

a1:

---

q2: The domain's `business_logic` text contains a forbidden em-dash. Should the agent draft and review the replacement wording, rather than you supplying the exact string yourself?

- a) Agent drafts the replacement and you review it before it is written.
- b) You supply the exact replacement string.

Recommended: a. A clean replacement is already proposed (the em-dash becomes a colon, leaving the meaning intact), so the agent can apply it for your review. This overwrites a populated field, so it needs your sign-off either way.

a2:

---

q3: Should US-side telecom regulations (FCC CPNI, FCC LNP, STIR/SHAKEN, CALEA, TCPA, SOX) be added, and at what level?

- a) Add all six as mandatory.
- b) Add CPNI, STIR/SHAKEN, and CALEA as mandatory; LNP, TCPA, and SOX as advisory.
- c) Skip them; the current EU-leaning set is enough.

Recommended: b. Pure-play US telco vendors universally surface CPNI, STIR/SHAKEN, and CALEA as hard obligations, while LNP, TCPA, and SOX vary by operator and dialing footprint. Several of these need new catalog `regulations` rows, which the agent will not create unprompted.

a3:

---

q4: Should an issued customer bill be frozen once it is issued, so it cannot be edited after delivery? (yes/no)

Recommended: yes. An issued bill is a delivered financial document and should be immutable. This flips a flag on a populated record, so it needs your confirmation.

a4:

---

q5: Should trouble tickets be flagged as holding personal content, since they carry customer narratives in their descriptions? (yes/no)

Recommended: yes. Ticket descriptions routinely contain customer-identifying narratives, so the personal-content flag should be set. This flips a flag on a populated record, so it needs your confirmation.

a5:

---

q6: Should a submitted service order be frozen once submitted, so it locks before provisioning begins? (yes/no)

Recommended: yes. Locking the order at submission keeps the provisioning run pinned to a fixed instruction. This flips a flag on a populated record, so it needs your confirmation.

a6:

---

q7: Two state-change events have no downstream handoff today (`telco_service_order.submitted` and `telco_service_catalog.updated`). How should they be handled?

- a) Treat order-submitted as a leaf (it fires only the internal provisioning workflow), and add cross-domain handoffs for catalog-updated (to customer-service agent training and to CRM offer sync).
- b) Treat both as leaf, with an explicit justification for each.
- c) Author new cross-domain handoffs for both.

Recommended: a. A submitted order plausibly drives only the internal provisioning workflow, while a catalog change genuinely needs to reach customer-service and CRM. Any new cross-domain rows also depend on the module split in q1 to set their source module.

a7:

---

q8: The seven cross-domain handoff process tags (to ITSM, CSM, and FIN) are authored and awaiting reviewer approval. Should they be promoted to approved? (yes/no)

Recommended: yes, if you agree the process mappings are correct. Promotion to approved is a per-row sign-off step, so it is never applied automatically.

a8:

---

q9: When the build lands as a multi-module domain, which of the six candidate role personas should be authored?

- a) All six: Order Manager, Network Engineer, Care Agent, Billing Specialist, Catalog Manager, Provisioning Specialist.
- b) A subset you name.

Recommended: a. The six map cleanly onto the seven process areas and cover every master. Persona and RACI authoring is deferred until a multi-module build exists, so this only takes effect after q1 is answered.

a9:

---

## Optional (will not hold up the build)

q10: Thirteen extra market-surface entities show up across the flagship telco BSS vendors (usage/CDR records, convergent charging sessions, mediation records, product offering bundles, tariff plans, customer quotes, MSISDN inventories, SIM/eSIM inventories, number-portability requests, equipment-swap requests, dunning cases, QoS/SLA telemetry, revenue-assurance and fraud alerts). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules exist. These are vendor-knowledge candidates that still want a verification pass, and the chosen module split decides where each one lands.

a10:

---

<!-- agent map, ignore: q1=B2-2 q2=B2-1 q3=B2-3 q4=B2-5.bills q5=B2-5.tickets q6=B2-5.orders q7=B2-7 q8=B1A-H2 q9=B2-4 q10=B3-1+B3-2+B3-3+B3-4+B3-5+B3-6+B3-7+B3-8+B3-9+B3-10+B3-11+B3-12+B3-13 | domain_id=42 -->
