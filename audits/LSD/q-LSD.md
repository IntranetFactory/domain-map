# Legal Service Delivery (LSD): questions waiting for you

## What this domain is
Run the legal department as an internal service provider. Take in legal requests from across the business, triage and route the work, and run each matter end to end: legal holds and ediscovery, outside-counsel engagements, regulatory-inquiry responses, and an in-house legal knowledge base. The goal is to give the business a single front door to Legal and keep every matter, hold, and engagement moving and auditable.

This domain is currently unbuilt (no modules exist yet), so the first question below decides its overall shape and unlocks everything else.

---

q1: (answer this first) How should Legal Service Delivery be split into modules (the sub-areas of the product)?

- a) Five modules: Intake Portal (requests from the business), Matter Management (running matters, advice, dockets), Legal Hold (holds and ediscovery), Outside Counsel (engagements, scope, accruals), Regulatory Response (regulator inquiries and agency responses).
- b) Four modules: same as (a) but fold Intake Portal into Matter Management.
- c) Six modules: same as (a) plus a separate Knowledge module for legal knowledge management.
- d) One module: a single Legal Service Delivery module (only viable if the legal-specific capability count also stays below three).

Recommended: a. The flagship in-house legal platforms package these five legs distinctly: ServiceNow Legal Service Delivery and LawVu lead with an intake portal feeding matter management, Onit Enterprise Legal Management anchors the outside-counsel engagement and e-billing leg, and legal hold / ediscovery is sold as its own module (Onna, Exterro, Zapproved standalone) while regulatory response stays an in-house workflow distinct from GRC. That vendor packaging is exactly the Intake Portal, Matter Management, Legal Hold, Outside Counsel, and Regulatory Response set. This choice drives every module, capability, lifecycle state, and handoff fix below it, so it unlocks the rest of the build. Nothing is scaffolded until you answer.

a1:

---

q2: legal_contracts is currently a required consumer on this domain, pointing at the contract-lifecycle master. Should it stay required, or be demoted to optional?

- a) Keep it required (contracts carry workflow that matters depend on).
- b) Demote it to optional (a matter can reference a contract concept without the contract master being deployed).

Recommended: a. Contracts are workflow-bearing rather than pure infrastructure, so required likely stands. Demotion would overwrite a non-empty value, so it needs your sign-off either way.

a2:

---

q3: How should the legal knowledge-management capability be realized?

- a) Author a legal-specific legal knowledge articles master in its own Knowledge module.
- b) Consume the shared cross-cutting knowledge base as a consumer, with legal-scoped article types.
- c) Drop the capability link as not load-bearing.

Recommended: a or b, both have vendor backing. In-house legal platforms often carry Knowledge distinctly (a), while service-delivery suites reuse a shared knowledge base (b). Note this choice also decides whether the six-module path in q1 makes sense.

a3:

---

q4: Should the legal advice records master be flagged as carrying personal content (so privilege and privacy handling applies)? (yes/no)

Recommended: yes. Advice memos routinely contain privileged personal content. This flips an existing flag on a live master row, so it needs your sign-off.

a4:

---

q5: Should the outside counsel engagements master be flagged as having a single approver (a General Counsel sign-off)? (yes/no)

Recommended: yes. Engagements typically require one accountable GC sign-off. This flips an existing flag on a live master row, so it needs your sign-off.

a5:

---

q6: An inbound handoff from Real Estate / Property Management (on a tenant-eviction event, carrying a property-tenant payload) lands on Legal with the wrong shape for creating a legal intake. How should it be handled?

- a) Reroute it to a Real Estate internal-legal module if one will be authored.
- b) Repaint its payload as a legal intake request once the Intake Portal module exists.
- c) Delete it as misrouted.

Recommended: b. The intent is correct (route into legal intake) but the shape is wrong; repainting is the cleanest fix once the Intake Portal exists. Each option mutates or deletes a live handoff, so it needs your sign-off.

a6:

---

q7: An inbound handoff from the publishing/content domain (on an editorial-review event, carrying an editorial-workflow payload) lands on Legal with the wrong shape for creating a legal intake. How should it be handled?

- a) Reroute it to a content-side internal-legal module if one will be authored.
- b) Repaint its payload as a legal intake request once the Intake Portal module exists.
- c) Delete it as misrouted.

Recommended: b. Same as q6: correct intent, wrong shape, cleanest fixed by repainting once the Intake Portal exists. This is the handoff whose process tag is currently held back pending this routing call. Each option mutates or deletes a live handoff, so it needs your sign-off.

a7:

---

q8: The "outside counsel engaged" event currently has no subscribers (a likely gap). Which domains should subscribe to it?

- a) Spend Management (accrual and engagement-letter spend tracking).
- b) Contract Lifecycle Management (the engagement letter as a contract).
- c) Governance, Risk and Compliance (conflict-check obligations).
- d) More than one of the above (say which).
- e) None.

Recommended: d, with vendor evidence supporting all three candidate targets. The agent will author the handoff rows for whichever targets you pick after the modules exist.

a8:

---

q9: For the four busiest neighbor domains, the cross-domain reconciliation ran in an abbreviated form because no Legal modules exist yet. Should it be rerun in full after the modules are built, or is the abbreviated result acceptable? (yes/no)

- a) Rerun it in full after the modules land.
- b) Accept the abbreviated result.

Recommended: a. Every row gets concrete fix targets once the Legal modules exist.

a9:

---

## Optional (will not hold up the build)

q10: Three extra entity candidates show up across the flagship vendors (a typed matter-assignment row separating the lead attorney from collaborators; engagement letters as a distinct pre-engagement deliverable; typed regulatory-inquiry response packages). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist.

a10:

---

q11: Two extra cross-domain handoffs show up as mirror directions of existing flows (an ediscovery-produced evidence handoff to Audit, and a regulatory-obligation inbound from Governance, Risk and Compliance that creates a matter). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and non-blocking; both mirror handoffs and relationships already in place.

a11:

---

<!-- agent map, ignore: q1=B2-MODULE-SHAPE q2=B2-LEGAL-CONTRACTS-NECESSITY q3=B2-KNOWLEDGE-SURFACE q4=B2-PATTERN-FLAGS.advice q5=B2-PATTERN-FLAGS.engagement q6=B2-SUSPICIOUS-INBOUNDS.h300 q7=B2-SUSPICIOUS-INBOUNDS.h807 q8=B2-OUTSIDE-COUNSEL-FANOUT q9=B2-PAIRWISE-DEPTH q10=B3-MATTER-ASSIGNMENTS+B3-ENGAGEMENT-LETTERS+B3-REGULATORY-INQUIRY-RESPONSES q11=B3-EDISCOVERY-PRODUCED-AUDIT+B3-GRC-INBOUND-COMPLIANCE-OBLIGATION | domain_id=25 -->
