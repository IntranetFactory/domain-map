# Remote Access and Support (REMOTE-ACCESS): questions waiting for you

## What this domain is

Connect to and control a remote computer to fix it, support a user, or run an unattended machine, with the session recorded and governed.

Cover the full support session: a technician requests access, the end user consents (or the machine is reached unattended), the connection is established, privileges are elevated when needed, files move both ways, and the whole thing is recorded for compliance and audit. The two things being managed are the live remote sessions and the recordings they produce, which feed your ITSM, MSP, and governance processes.

---

q1: (answer this first) How should remote sessions be shaped: one master record with a session_mode flag, or split into separate attended and unattended session records?

- a) One master with a session_mode discriminator (the TeamViewer / AnyDesk pattern, and the shape the current 2-module build already ships).
- b) Split into two masters: rename the current one to attended_sessions and add unattended_sessions (the BeyondTrust pattern), re-shaping the modules and possibly adding a third.
- c) Defer: keep the shipped single-master shape for now and revisit once you have real deployments to learn from.

Recommended: a. TeamViewer and AnyDesk both treat attended and unattended access as one session entity with a mode field, which is the single-master shape; only BeyondTrust splits them into separate attended and unattended surfaces with distinct access-policy and consent flows. The single-master pattern matches the build that already shipped and stays inside the current 2-master ceiling. This choice drives the lifecycle states, the cross-domain links, and any future re-modularization, so it unlocks the rest of the build.

a1:

---

q2: Should the proposed session and recording state machines be accepted as drawn (sessions: requested, consent_pending, connected, privileged, ended; recordings: recording, archived, retention_lock, expired, with permission gates on elevating, ending, locking, and purging)? (yes/no)

Recommended: yes. Both masters are now classified as operational workflows, so lifecycle states are required, and answering this immediately unblocks the lifecycle write. Pick no only if you want to change the state list or the gated steps (tell me how).

a2:

---

q3: Which "this is sensitive / locked" flags should be turned on for these records?

- a) Turn on all four proposed: sessions carry personal content (screen content can show PII or PHI) and need a single approver for privilege elevation; recordings are personal content and lock once finalized for retention.
- b) Turn on only some (tell me which).
- c) Turn on none (record that "false after review" is the deliberate stance).

Recommended: a. Each flag matches how the record actually behaves: screens expose personal data, privilege elevation is a single-approver gate, and a finalized recording must stay immutable for retention. These overwrite the current false defaults, so they need your confirmation.

a3:

---

q4: Which compliance regulations apply to Remote Access and Support, and how strictly?

- a) All three required: HIPAA, PCI-DSS, and SOX.
- b) HIPAA and PCI-DSS required, SOX optional.
- c) All three optional.
- d) Other (name the regulations and how they apply).

Recommended: b. HIPAA (remote access to ePHI) and PCI-DSS (MFA plus audit-log retention) are core to the vendor-access governance shape, while SOX applies mainly to public companies tracking privileged session activity, so it fits better as optional. These are not equally applicable in every deployment.

a4:

---

q5: Should the 7 cross-domain handoff records already drafted (the links into ITSM, MSP-PSA, and GRC) be approved, moving the catalog-quality headline from 0 approved to 7 approved? (yes/no)

Recommended: yes. All 7 are agent-curated "implements" rows ready for sign-off; approving them is the only thing standing between the headline and zero. Approval flips records to approved, which is a sign-off step that is never applied automatically.

a5:

---

q6: When a remote session produces a recording, is it always one recording per session, or can a single session produce several recording segments?

- a) One recording per session (one-to-one).
- b) Several recording segments per session (one-to-many).

Recommended: b. Session recordings are commonly segmented (pause and resume, multi-monitor, or per-leg captures), so one-to-many is the safer shape; pick (a) only if your recordings are always a single unbroken file per session. This is a genuine modeling choice, so I am holding the link write until you decide.

a6:

---

q8: MSP Professional Services Automation forwards remote session to Remote Access and Support to operate IT user support, but Remote Access and Support does not yet have anyone assigned to operate IT user support, so this step has no owner. How should it be handled?
- a) Record it now as work Remote Access and Support owns, and assign a named owner once Remote Access and Support sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Remote Access and Support decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a8:

---

q9: Governance, Risk and Compliance forwards session recording to Remote Access and Support to control IT risk, compliance, and security, but Remote Access and Support does not yet have anyone assigned to control IT risk, compliance, and security, so this step has no owner. How should it be handled?
- a) Record it now as work Remote Access and Support owns, and assign a named owner once Remote Access and Support sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Remote Access and Support decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a9:

---

## Optional (will not hold up the build)

q7: Nine extra entities show up across the flagship remote-access vendors as first-class objects (registered endpoint devices, endpoint groups, access policies, privilege elevations, file transfers, consent records, MFA challenges, relay nodes, recording retention policies). Should I research the ones that hold up and add them? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Most are first-class across the vendor set (TeamViewer, AnyDesk, Splashtop, ScreenConnect, BeyondTrust, and others), though they still want a verification pass first.

a7:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3 q4=B2-S4 q5=B2-H1 q6=B1A-B6 q7=B3-S1+B3-S2+B3-S3+B3-S4+B3-S5+B3-S6+B3-S7+B3-S8+B3-S9 q8=B2-B9D-OWN-295 q9=B2-B9D-OWN-268 | domain_id=132 -->
