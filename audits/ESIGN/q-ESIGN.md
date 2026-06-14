# Electronic Signature (ESIGN): questions waiting for you

## What this domain is
Send documents out for legally binding electronic signature and track them from draft to completion. Prepare an envelope, route it to the right signers in order, verify who they are, capture their signatures, and keep a tamper-evident audit trail behind every completed agreement. The signed result then flows on to wherever the contract lives.

---

q1: (answer this first) How should Electronic Signature be split into modules (the sub-areas of the product)?

- a) One module, ESIGN Signature Ops, covering the whole surface (envelope prep, identity verification, signing workflow, audit trail).
- b) Two modules: Authoring (templates, envelope prep, recipient sequencing) and Completion (signing, identity verification, audit trail, certificate).

Recommended: a. DocuSign eSignature, Adobe Acrobat Sign, Dropbox Sign, PandaDoc, SignNow, and OneSpan Sign each ship the whole signing surface (envelope prep, identity verification, signing, audit trail) as one product, and none of them splits authoring from completion into separate modules: where DocuSign does draw a product line it is between eSignature and CLM, not inside the signing flow. So a single ESIGN-SIGNATURE-OPS module matches how every flagship packages this market; the two-module split buys only a role floor at the cost of authoring two sets of permissions and tooling.

a1:

---

q2: A void action is already a workflow gate. Should a decline by a signer also require permission to record (an operator-decline scenario)? (yes/no)

Recommended: no. A decline is signer-initiated, not an operator action, and typical e-signature platforms gate only operator-initiated voids.

a2:

---

q3: Should an expiration also require permission to record (an operator-triggered expiration)? (yes/no)

Recommended: no. Expiration is clock-triggered, so platforms normally leave it ungated.

a3:

---

q4: Which signer roles should the envelope workflow recognize beyond sender and signer (the two already loaded)?

- a) Sender and signer only (status quo).
- b) Also add witness (notarization flows).
- c) Also add cc viewer (signer convenience).
- d) Also add verifier (qualified-e-signature identity reviewer).
- e) A combination of the above (specify which).

Recommended: a. Sender and signer cover the core workflow; add the others only when a specific flow (notarization, qualified e-signature) actually demands them.

a4:

---

q5: A confident process tag is in place on the completion handoff (envelope completed maps to "Negotiate and document agreements/contracts"). Should that tag be approved, left pending, or rejected?

- a) Approve it.
- b) Keep it pending.
- c) Reject it.

Recommended: a. The match is confident and the tag is already correct; only the approval flip is yours to make, since the agent never sets a record to approved on its own.

a5:

---

## Optional (will not hold up the build)

q6: Three identical-shape entity candidates show up across the flagship vendors: a signature certificate / evidence package, reusable envelope templates, and per-signer identity-verification records. Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist.

a6:

---

q7: Online notarization (Remote Online Notarization) is a regulated layer on top of e-signature. Should I research it and add it as a capability on this domain, or treat it as a separate candidate market? (yes/no)

Recommended: yes to research it; it most likely lands as a capability inside this domain rather than a separate market, but it needs a verification pass first.

a7:

---

q8: The US statutory anchors (the federal ESIGN Act and UETA) are not yet in the catalog as regulation rows. Should I research and add them alongside the eIDAS and FDA 21 CFR Part 11 frameworks already linked? (yes/no)

Recommended: yes. They are the US legal basis for binding e-signature outside the EU. Additive and non-blocking.

a8:

---

q9: Flagship usage implies inbound triggers from other domains (a closed-won opportunity, an extended job offer, a drafted engagement letter, an issued purchase order, onboarding paperwork, a drafted lease, a drafted subscription contract) that create envelopes here. Should I schedule those source domains to wire their outbound side to this domain? (yes/no)

Recommended: yes in principle, but each edge is the source domain's work to author, not this domain's load. Additive and non-blocking.

a9:

---

<!-- agent map, ignore: q1=B2-S2 q2=B2-S4.declined q3=B2-S4.expired q4=B2-S5 q5=B2-S6 q6=B3-S1+B3-S2+B3-S3 q7=B3-S4 q8=B3-S5 q9=B3-S6 | domain_id=94 -->
