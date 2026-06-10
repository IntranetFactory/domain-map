# Privacy Management (PRIV-MGMT): questions waiting for you

## What this domain is
Handle data-subject requests, capture consent, and keep your processing inventory audit-ready.

Run the privacy operations that keep you compliant with GDPR, CCPA/CPRA, and the privacy laws that follow them. Intake and fulfill data-subject access, correction, and deletion requests through a tracked pipeline that fans out to every source system and meets the statutory response clock. Capture and prove consent against the specific purpose it was given for, and honor withdrawals across the systems that rely on it. Maintain a living record of processing activities so you always know what personal data you hold, where it lives, who it is shared with, and on what legal basis. Author privacy and data-protection impact assessments, route them for sign-off, and log breaches with the notification timing regulators expect.

---

q1: (answer this first) Should the four canonical privacy masters be re-homed into Privacy Management, and the three request-type masters consolidated into one?

Today data-subject requests are mastered in the ATS module, and consent records, subject-access requests, and data-deletion requests are each a separate master in an LMS compliance-training module. Fresh vendor research (the five privacy leaders, named below) is decisive that individual-rights handling is ONE request object with a request-type field, not a separate table per request type.

- a) Re-home all four into Privacy Management AND consolidate: fold data-subject requests, subject-access requests, and data-deletion requests into one data-subject-requests master that carries a request-type field (access / deletion / correction / portability / opt-out); re-home consent records as a consent master. The ATS and LMS modules keep an embedded or consumer copy so they still deploy standalone.
- b) Re-home all four but keep them as separate masters (one general request master plus a separate access master and a separate deletion master, plus consent).
- c) Keep the current ownership and have Privacy Management consume them only via cross-domain handoffs (leaves Privacy Management with no masters of its own, against how every flagship vendor ships).
- d) Re-home only the three LMS masters and leave data-subject requests in the ATS module.

Recommended: a. All five flagship privacy platforms model rights handling as a single request object with a request-type discriminator: OneTrust Privacy Rights Automation, TrustArc Individual Rights Manager, Securiti's single-pane DSR workbench, DataGrail Request Manager, and Transcend DSR Automation each route access, deletion, and correction through one product, not separate tables. Carrying subject-access and data-deletion as separate masters (as the LMS module does today) is the shape 5/5 vendors reject. Note: collapsing the two existing LMS request masters is a destructive step, so it will come back to you for explicit sign-off at the moment it is executed; this answer only sets the direction.

a1:

---

q2: How should Privacy Management be split into modules, and how much of the vetted surface should the first build cover?

- a) Four modules, built in full: Data Inventory (processing register, personal-data assets, processor agreements, cross-border transfers), DSR Management (the request pipeline), Consent (ledger plus purposes), and Assessments (PIA/DPIA plus breach records).
- b) Three modules: same as (a) but fold Assessments into Data Inventory.
- c) Two modules first: DSR Management plus Consent only (just the re-homed masters), and add Data Inventory and Assessments in a later pass.
- d) Other: name the modules and the objects each one owns.

Recommended: a. Every flagship sells data-mapping/ROPA, DSR, consent, and assessments as distinct, separately licensed product areas with independent data models, so four modules mirror the market one-to-one (OneTrust, TrustArc, Securiti, and Transcend all ship all four; DataGrail ships three). Each module has a clear master and the domain has well over three capabilities, so the two-module floor is exceeded. Vendor research vetted the full entity surface (processing activities, personal-data assets, processor agreements, transfers, PIA/DPIA, breach records, consent purposes) as Core across the leaders, so there is no longer a research reason to ship the minimal two-module shape (c) is now only worth picking if you want to stage the build for delivery reasons, not coverage. One boundary is settled by the research: the privacy personal-data inventory stays a distinct master from the data-governance data catalog (see q7), not a merge.

a2:

---

q3: If the processing-register and personal-data-asset objects become masters here, they are config-shaped (no workflow), so they need a recorded exemption from lifecycle-state tracking. How should that exemption be recorded?

- a) Track it outside the catalog (a gap report or commit message).
- b) You supply the exact notes wording and the agent writes it into the catalog.

Recommended: a. Keeping it outside the catalog avoids putting agent-authored text into the notes field, which project rules reserve for your wording. This only matters if q1 and q2 land those objects as masters here.

a3:

---

q4: One inbound handoff from the data-security-posture domain (a sensitivity-elevated event feeding Privacy Management) is still untagged because the upstream event and its payload point at two different objects. How should its process tag be loaded?

- a) Load the tag now against the current shape (clears the untagged handoff immediately).
- b) Wait for the upstream domain to fix its attribution, then load against the corrected shape.
- c) Skip it indefinitely.

Recommended: b. The chosen process tag fits either framing, so waiting binds it to the corrected shape rather than the current drifted one. This is independent of the module decisions above.

a4:

---

## Optional (will not hold up the build)

q5: Add DataGrail and Transcend as flagship privacy-management solutions? (yes/no)

Recommended: yes. Vendor research confirmed both are full privacy-management platforms, not consent-only or DSR-only point tools: DataGrail spans DSR plus data mapping plus consent, and Transcend spans all four product areas plus AI governance. They qualify as flagship solution rows alongside OneTrust, TrustArc, and Securiti. The current solution count already meets the floor, so this is additive and non-blocking.

a5:

---

q6: Add privacy regulations beyond GDPR and CPRA (PIPEDA, LGPD, PIPL, POPIA)? (yes/no)

Recommended: yes for PIPEDA, LGPD, PIPL, and POPIA (research found all five leaders cover LGPD, four cover PIPEDA, three cover PIPL, two to three cover POPIA); hold HIPAA as a cross-domain healthcare regulation rather than a core privacy one. These need new catalog-wide regulation rows, so they route to a catalog-wide load rather than this domain alone. Additive and non-blocking.

a6:

---

q7: Keep personal-data assets as a distinct privacy master with an optional link to the data-governance data catalog, rather than merging the two? (yes/no)

Recommended: yes (keep distinct). All five flagships build a personal-data inventory inside the privacy product rather than consuming a generic asset catalog, because the privacy inventory tracks semantics the governance catalog does not (special-category flags, lawful basis, retention, linkage to processing activities and to a data subject). Keep personal-data assets as its own master with an optional reference to the data-governance data assets, not a merge or an embed. The rest of the extra-entity list (processing activities, processor agreements, transfers, PIA/DPIA, breach records, consent purposes) is now vetted and folds into the q2 build scope.

a7:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-4 q4=B2-5 q5=B3-1 q6=B3-2 q7=B3-3 | domain_id=20 -->
