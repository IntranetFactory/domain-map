# Legal Service Delivery (LSD): questions waiting for you

## What this domain is
Run the legal department as an internal service provider. Take in legal requests from across the business, triage and route the work, and run each matter end to end: legal holds and ediscovery, outside-counsel engagements, regulatory-inquiry responses, and an in-house legal knowledge base. The goal is to give the business a single front door to Legal and keep every matter, hold, and engagement moving and auditable.

The domain is now built: five modules (Intake Portal, Matter Management, Legal Hold and eDiscovery, Outside Counsel, Regulatory Response), the eight master records modularized with their workflows, and the cross-domain handoffs wired. Two questions you handed back are still open, plus optional research.

---

q1: (answer this first) legal_contracts is a "required consumer" on Legal: the domain reads the contract record (it does not own it; Contract Lifecycle Management does) and the workflow assumes that read is available. "Demote to optional" would mean a matter can reference a contract without the contract system being deployed at all. Keep it required, or demote?

- a) Keep it required (matters genuinely depend on reading live contract data).
- b) Demote to optional (a matter can reference a contract concept without the contract master deployed).

Recommended: a. ServiceNow LSD, LawVu, and Onit all surface matter-linked contracts as a first-class read, so the dependency is workflow-bearing rather than convenience infrastructure. Demotion overwrites a non-empty value on a live row, so it needs your sign-off either way.

a1:

---

q2: How should the legal knowledge base be realized? With the five-module shape now fixed (you chose five, not the six-module path with a separate Knowledge module), the knowledge capability has to live inside an existing module. Pick one:

- a) Author a legal-specific "legal knowledge articles" master inside Matter Management (a new entity, legal-owned).
- b) Consume the shared cross-cutting knowledge base as a reader, with legal-scoped article types (no new entity).
- c) Drop the knowledge capability link as not load-bearing.

Recommended: b. In-house legal platforms split both ways: LawVu and Onit often carry a distinct legal Knowledge surface (which would argue for a), while ServiceNow Legal Service Delivery reuses the shared ServiceNow Knowledge base with legal scoping (b). Because you chose five modules and declined a separate Knowledge module, (b) consume-the-shared-base is the consistent fit; (a) would add a new master and only ships after you approve it here.

a2:

---

## Optional (will not hold up the build)

q3: Three extra entity candidates show up across the flagship vendors (a typed matter-assignment row separating the lead attorney from collaborators; engagement letters as a distinct pre-engagement deliverable; typed regulatory-inquiry response packages). Research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen any time. Each is well attested (LawVu, Onit, Litera); they still want a verification pass.

a3:

---

q4: Two extra cross-domain handoffs show up as mirror directions of existing flows (an ediscovery-produced evidence handoff to Audit, and a regulatory-obligation inbound from Governance, Risk and Compliance that creates a matter). Research and add the ones that hold up? (yes/no)

Recommended: yes, additive and non-blocking; both mirror handoffs and relationships already in place.

a4:

---

<!-- agent map, ignore: q1=B2-LEGAL-CONTRACTS-NECESSITY q2=B2-KNOWLEDGE-SURFACE q3=B3-MATTER-ASSIGNMENTS+B3-ENGAGEMENT-LETTERS+B3-REGULATORY-INQUIRY-RESPONSES q4=B3-EDISCOVERY-PRODUCED-AUDIT+B3-GRC-INBOUND-COMPLIANCE-OBLIGATION | domain_id=25 -->
