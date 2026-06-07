# Integration Platform as a Service (IPAAS): questions waiting for you

## What this domain is
Connect any SaaS app to any other without writing integration code.

Build, run, and monitor integration flows that move data between cloud apps, on-prem systems, and event streams. Use a library of prebuilt connectors, drag-and-drop data mappings, retry-aware execution, and webhook subscriptions to ship integrations in hours instead of weeks, with audit-grade run history and credential rotation built in.

---

q1: (answer this first) How should Integration Platform as a Service be split into modules (the sub-areas of the product)?

- a) Two modules: Recipe Design (recipe authoring, connectors, data mappings, triggers, and webhook subscriptions) and Runtime (recipe execution and run history).
- b) Three modules: same as (a) but split the connectors out into their own Connector Management module (because credentials rotate on their own lifecycle).
- c) Three modules: same as (a) but split run observability out of Runtime into its own Observability module.
- d) A single module.
- e) Other (specify).

Recommended: a. The two-module split matches the vendor surface (Boomi, MuleSoft, Workato) and is the minimal shape that unblocks the build today. This choice drives the build and every capability, lifecycle owner, handoff attribution, and per-module link below it, so it unlocks the rest of the build.

a1:

---

q2: Should integration recipes and data mappings be frozen once published, and completed run records be frozen once they finish, so each published or completed artifact is immutable and edits create a new version instead? (yes/no)

Recommended: yes. A published recipe or mapping and a finished run are fixed artifacts; locking them keeps an accurate record and forces changes through a new version. This overwrites current values on existing rows, so it needs your confirmation.

a2:

---

q3: Should publishing an integration recipe require sign-off from one designated approver? (yes/no)

Recommended: yes. A single accountable approver on publish is normal for integrations that run unattended, especially in regulated tenants. This overwrites a current value, so it needs your confirmation.

a3:

---

q4: Where should connector credentials (OAuth tokens, API keys) live?

- a) On the connector itself (mark the connector as holding personal/credential content).
- b) In a separate connection vault entity, a new master that holds the configured-with-credentials instance bound to a recipe, with the credential flag moved there.

Recommended: b. The flagship vendors (Workato "Connection", Boomi "Account", MuleSoft, Tray.io) model the credential-bearing connection separately from the reusable connector template, which keeps the connector a clean reusable shape. Adding the new master is additive; relocating the credential flag is the destructive part, so it needs your sign-off.

a4:

---

q5: How should a webhook subscription relate to a trigger?

- a) Sibling: webhooks and triggers are separate concepts (the Boomi shape).
- b) Subtype: a webhook is a kind of trigger (the Workato shape).

Recommended: a. Treating them as siblings keeps each concept simple; pick subtype only if webhooks should inherit trigger fields. This shifts the intra-domain relationship count by one. (The trigger lifecycle question is already settled: triggers are config-shape with no workflow.)

a5:

---

q6: How should IPAAS record that it consumes another domain's published artifacts (low-code workflow definitions and API specs) to drive recipe and connector updates?

- a) As consumer data objects on the Recipe Design module (optional), capturing the dependency in the catalog.
- b) As embedded-master shells (optional), which preserves a standalone-deploy story if those source domains are absent.
- c) As domain-level dependencies only, with no data-object row.

Recommended: a. Consumer rows capture the real dependency without the overhead of embedded shells, and they tell the inbound handoffs which module to attribute to.

a6:

---

q7: The connector library is the same surface as an existing capability that was first authored under the low-code domain. How should that shared capability be handled?

- a) Rename it to a neutral INTEGRATION-CONNECTORS and link it to both domains.
- b) Leave the existing one and author a parallel IPAAS-specific connector capability (this double-counts the concept).
- c) Wait until a third domain (likely Data Integration) confirms the same shape before promoting it to cross-cutting.

Recommended: a. Two domains clearly share it now and a third is likely, so renaming to a neutral shared capability avoids double-counting. Pick (c) only if you want to hold to the strict three-domain promotion threshold.

a7:

---

q8: The owning business function on IPAAS is currently "IT Infrastructure", but the canonical function spine uses "IT Operations". How should this be reconciled?

- a) Keep "IT Infrastructure" as a legitimate sub-function and add a parent link to "IT Operations".
- b) Re-link the IPAAS owner to "IT Operations" directly.

Recommended: a. If "IT Infrastructure" is a real sub-function, adding the parent link is the non-destructive fix. Choose (b) only if it was an accidental parallel-tier entry; re-linking overwrites the owner attribution, so it needs your call.

a8:

---

q9: The market surface today lists four iPaaS vendors. Which additional vendors should be added, and at what coverage level?

- a) Add all eight (Zapier, Make.com, Tray.io, Celigo, SnapLogic, IBM App Connect, Microsoft Power Automate, Jitterbit) as primary.
- b) Add a subset (specify which vendors and which coverage level per row).
- c) Defer, pending a decision on whether Zapier and Make.com belong in a separate citizen-automation market instead.

Recommended: b. Several of these (Tray.io, SnapLogic, IBM App Connect, Power Automate) are clearly enterprise iPaaS, while Zapier and Make.com may fit a separate citizen-automation market better, so a curated subset is cleaner than adding all eight. Low stakes, does not block the build.

a9:

---

## Optional (will not hold up the build)

q10: Beyond the connection vault in q4, four more entities show up across the flagship iPaaS vendors (per-step run logs, dev/test/prod environments for promotion, persistent error records that outlive an archived run, and rich scheduling policies). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Each is common across the vendor set, though they still want a verification pass first.

a10:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S3.speclock q3=B2-S3.specapprover q4=B2-S3.vaultsplit+B3-S1 q5=B2-S4 q6=B2-S5 q7=B2-S6 q8=B2-S7 q9=B2-S8 q10=B3-S2,B3-S3,B3-S4,B3-S5 | domain_id=36 -->
