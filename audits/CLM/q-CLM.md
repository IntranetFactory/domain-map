# Contract Lifecycle Management (CLM): questions waiting for you

## What this domain is
Run the full life of every contract, from drafting and negotiation through signature, active obligations, and renewal.

Author contracts from approved clauses and templates, route them through negotiation and approval, capture the e-signature, then store the signed contract as the single source of truth. Track the obligations and milestones each contract creates, watch for breaches and due dates, and drive renewals before contracts lapse. Hand signed contracts off to the downstream teams (procurement, finance, subscriptions, customer success) that depend on them.

---

q1: (answer this first) The real-estate starter (REAL-ESTATE-AGENT) currently ships its own embedded copies of the contract and signature records instead of reading the full CLM repository. Should it stay a standalone lite path, or be refactored to consume the full CLM repository when both are deployed together?

- a) Keep it a lite path (a small brokerage can install the starter on its own, with its own embedded contract and signature shells).
- b) Refactor it to consume the full CLM repository (one canonical contract record shared with the full modules when both are installed).

Recommended: a. The starter is meant to be installable on its own; the canonical masters already exist in the full repository, so the invariant is satisfied either way. This is the build-shape decision for how the starter deploys, so it frames the rest.

a1:

---

q2: One CLM repository row depends on a SaaS-subscriptions record that is actually owned by another domain (SMP), which breaks module self-containment. How should it be resolved?

- a) Make the dependency optional (the link stays but is no longer a hard requirement).
- b) Give the repository its own local SaaS-subscription shell so it is standalone-deployable.

Recommended: a. The repository owning a SaaS-subscription shell has no real deployment story; the link to SMP is contextual, not a hard requirement, so relaxing it is the lighter, truer fix. This rewrites an existing non-empty row, so it needs your sign-off.

a2:

---

q3: All five contract master records carry auto-style notes restating the submit-lock rationale and multi-approver context. Were these notes approved by you at load time, or should they be cleared as loader-generated pollution? (yes/no)

- a) They were approved at load time, leave them in place.
- b) They were auto-populated, clear all five notes fields and log a hygiene incident.

Recommended: b, unless you remember approving this wording. The notes read as templated loader output, which the current rules forbid. Clearing them overwrites existing values, so it needs your confirmation.

a3:

---

q4: For the "sign document" e-signature step, should its justification be recorded in the module tool notes, or is it satisfied by this conversation with the notes left empty?

- a) Supply approved wording for the tool notes (on the repository module and the real-estate starter, the only unit that still carries its own skill).
- b) Treat it as satisfied via this audit, leave the notes empty.

Recommended: b. Signing is self-evidently the workflow for these units; a per-tool note adds little, and the agent is not allowed to invent the wording itself.

a4:

---

q5: Should legal contracts be flagged as containing personal data (counterparty contact details and signatory names)? (yes/no)

Recommended: yes. Contracts routinely carry counterparty contacts and signatory names, which are personal data.

a5:

---

q6: Should signature records be flagged as containing personal data (signer names, IP addresses, signature images)? (yes/no)

Recommended: yes. Signature capture records signer identity and often IP addresses and signature images, all personal data.

a6:

---

q7: Should contract obligations be flagged as single-approver (the obligation owner closes the record alone)? (yes/no)

Recommended: no, unless your process really has one owner close obligations unilaterally. The current flag says no, and obligation closure is often a reviewed step.

a7:

---

## Optional (will not hold up the build)

q8: Several flagship CLM vendors model entities CLM does not yet have as first-class records (contract amendments, renewal records, clause libraries, playbooks, risk assessments, counterparties, contract milestones, data-protection addenda, negotiation threads). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the core modules are settled. Each still wants a verification pass first.

a8:

---

q9: CLM currently tags only eIDAS and ASC 606. Should I research and add the broader compliance regulations the flagship vendors carry (GDPR data-processing addenda, HIPAA business-associate agreements, SOX significant-contract attestation, FAR/DFARS federal contracting)? (yes/no)

Recommended: yes, pending a check of which apply to your contract population. Additive and non-blocking.

a9:

---

q10: Should I evaluate splitting modules further (a dedicated compliance module for addenda and risk, and splitting negotiation into redlining versus AI risk detection)? (yes/no)

Recommended: yes in principle, but only once the underlying compliance and risk entities exist; today it would split empty surfaces. Additive and non-blocking.

a10:

---

<!-- agent map, ignore: q1=B2-S6 q2=B1A-SELF-CONTAIN q3=B2-S2 q4=B2-S3 q5=B2-S4.legalcontracts_pii q6=B2-S4.signaturerecords_pii q7=B2-S4.obligations_singleapprover q8=B3-CONTRACT-AMENDMENTS+B3-CONTRACT-RENEWAL-RECORDS+B3-CLAUSE-LIBRARIES+B3-PLAYBOOKS+B3-RISK-ASSESSMENTS+B3-COUNTERPARTIES+B3-CONTRACT-MILESTONES+B3-DATA-PROTECTION-ADDENDA+B3-CONTRACT-NEGOTIATION-THREADS q9=B3-REG-GDPR-DPA+B3-REG-HIPAA-BAA+B3-REG-SOX+B3-REG-FAR-DFARS q10=B3-MOD-CLM-COMPLIANCE+B3-MOD-CLM-NEGOTIATION-SPLIT | domain_id=26 -->
