# Privacy Management (PRIV-MGMT): questions waiting for you

## What this domain is
Handle data-subject requests, capture consent, and keep your processing inventory audit-ready.

Run the privacy program end to end: take in and fulfill data-subject requests (access, deletion, correction) against statutory clocks, keep a consent ledger tied to each data subject, maintain a record of processing activities (ROPA), and drive privacy impact assessments (PIA/DPIA) through to sign-off, all aligned to GDPR and CCPA/CPRA. Today this domain has no modules and masters none of these objects on its own, so the build is waiting on the decisions below.

---

q1: (answer this first) Should the four canonical privacy masters (data-subject requests, consent records, subject-access requests, data-deletion requests) be re-homed from their current ATS and LMS homes into Privacy Management?

- a) Re-home all four into Privacy Management modules (data-subject / access / deletion requests into a DSR module, consent records into a consent module); the original modules keep an embedded or consumer copy so they still deploy on their own.
- b) Keep the current ownership and have Privacy Management consume them only via cross-domain handoffs (this leaves Privacy Management with no masters of its own and goes against how every flagship privacy vendor ships).
- c) Re-home only the three LMS masters and leave data-subject requests in the ATS module, if there is a defensible candidate-specific shape there.

Recommended: a. All five flagship privacy vendors ship these as masters in their privacy product, and the classification is settled as master-bearing. Every module, master set, and permission shape below derives from this answer, so it unlocks the rest of the build.

a1:

---

q2: How should Privacy Management be split into modules (the sub-areas of the product)?

- a) Four modules: Data Inventory (processing register and personal-data assets), DSR Management (the data-subject-request pipeline), Consent (the consent ledger), and Assessments (PIA/DPIA workflows).
- b) Three modules: same as (a) but fold Assessments into Data Inventory.
- c) Two modules: DSR Management plus Consent only (the modules covered by the re-homed masters if the extra entity candidates are deferred).
- d) Other: name the modules and the objects each one owns.

Recommended: a. Four is the maximum useful split per the vendor surface. Collapse to (c) if you defer the extra entity candidates below, since that leaves only the re-homed masters to build around. This shapes every module that follows.

a2:

---

q3: If the processing-register and personal-data-asset objects become masters here, they are config-shaped (no workflow), so they need a recorded exemption from lifecycle-state tracking. How should that exemption be recorded?

- a) Track it outside the catalog (a gap report or commit message).
- b) You supply the exact notes wording and the agent writes it into the catalog.

Recommended: a. Keeping it outside the catalog avoids putting agent-authored text into the notes field, which project rules reserve for your wording. This only matters if q1 lands those objects as masters.

a3:

---

q4: One inbound handoff from the data-security-posture domain (a sensitivity-elevated event feeding Privacy Management) is still untagged because the upstream event and its payload point at two different objects. How should its process tag be loaded?

- a) Load the tag now against the current shape (this clears the untagged handoff immediately).
- b) Wait for the upstream domain to fix its attribution, then load against the corrected shape.
- c) Skip it indefinitely.

Recommended: b. The chosen process tag fits either framing, so waiting binds it to the corrected shape rather than the current drifted one. This is independent of the module decisions above.

a4:

---

## Optional (will not hold up the build)

q5: Two flagship privacy specialists routinely cited by Gartner and Forrester are not yet linked as solutions. Should I research and add them once they pass vetting? (yes/no)

Recommended: yes. They would harden the vendor-evidence basis for the module split, but the link threshold is already met, so this is additive and non-blocking.

a5:

---

q6: Should I research and add privacy regulations beyond GDPR and CPRA (PIPEDA, LGPD, PIPL, POPIA, HIPAA) once each is vetted against the flagship vendor matrices? (yes/no)

Recommended: yes, but each needs a vetting pass first, and none have a catalog row yet, so this is additive and non-blocking.

a6:

---

q7: Flagship privacy vendors ship several more canonical masters (processing activities, personal-data assets, processor agreements, data transfers, privacy impact assessments, data-breach records, consent purposes). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Personal-data assets is the only one with a real collision risk (against the data-governance domain's data assets), so it wants a careful boundary check first.

a7:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-4 q4=B2-5 q5=B3-1 q6=B3-2 q7=B3-3 | domain_id=20 -->
