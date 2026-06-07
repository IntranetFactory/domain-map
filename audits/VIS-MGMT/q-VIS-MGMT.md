# Visitor Management (VIS-MGMT): questions waiting for you

## What this domain is
Run the full visitor lifecycle for your sites: pre-register guests, check them in at the lobby or kiosk, issue badges, and notify their hosts. Cover the compliance side too: NDA acknowledgements, watchlist screening, sealed audit trails, and an evacuation roster of who is on site. The market reference is the pure-play visitor platforms (Envoy, Proxyclick, SwipedOn, iLobby).

---

q1: (answer this first) How should Visitor Management be split into modules (the sub-areas of the product)?

- a) Two modules: Registration (visitor registrations, check-ins, badges, host assignments) and Compliance (NDA acknowledgements, watchlist screenings, audit logs, evacuation lists).
- b) Three modules: Registration (registrations, check-ins, badges, host assignments), Compliance (NDA acknowledgements, watchlist screenings, audit logs), and Emergency (evacuation lists on its own).

Recommended: b. All the flagship vendors separate the emergency-roster surface, and a standalone Emergency module lines up with a future workplace-safety domain. This is the single decision that unblocks the whole build: every module, capability, lifecycle state, role, and per-module link below it depends on it.

a1:

---

q2: Six masters carry visitor personal data directly (registrations, check-ins, badges, NDA acknowledgements, watchlist screenings, audit logs). Should they be flagged as containing personal data, and should the audit log be frozen once it is sealed? (yes/no)

Recommended: yes. The six masters carry name, ID, photo, and signature, so flagging them scopes DSAR and retention correctly; sealing the audit log is a one-way step, so freezing it preserves an accurate trail. These flips are gated on your sign-off.

a2:

---

q3: Host assignments and evacuation lists only reference visitor data indirectly (a pointer to the host employee, a list of present-visitor names at print time). Should they also be flagged as containing personal data?

- a) Flag both, so DSAR and retention are scoped uniformly across the domain.
- b) Leave both unflagged, since the personal data lives one hop away.
- c) Flag only evacuation lists (they carry visitor names at print time) and leave host assignments unflagged (it only points at an employee record).

Recommended: a. Treating the indirect masters the same way keeps retention and subject-access handling consistent. Pick (c) if you want the narrower scope.

a3:

---

q4: Visitor Management carries direct visitor personal data but has no privacy regulations linked. Which should I load and link?

- a) GDPR plus CCPA (covers EU and California visitors).
- b) GDPR only (the broader scope), defer CCPA.
- c) Defer to a future catalog-wide regulation backfill (none scheduled).

Recommended: a. Both apply to visitor personal data, and linking now closes the regulations gap rather than leaving it for an unscheduled pass.

a4:

---

q5: Evacuation lists are mandated by OSHA emergency-action-plan rules. Should I add OSHA as a regulation and link it to Visitor Management? (yes/no)

Recommended: yes. The evacuation roster exists to satisfy OSHA 29 CFR 1910.38, so the link documents a real obligation.

a5:

---

q6: Should per-visit NDA acknowledgements stay mastered in Visitor Management, or be promoted to the contract-lifecycle (CLM) domain?

- a) Keep them in Visitor Management (a per-visit acknowledgement is operationally distinct from a negotiated corporate NDA).
- b) Promote a slimmer NDA entity to CLM and consume it here.

Recommended: a. The per-visit acknowledgement belongs to the visit workflow; CLM owns negotiated corporate NDAs, which is a different artifact.

a6:

---

q7: A watchlist screening fires on every visitor screened, which is noisy if every event is sent to the compliance domain. How should the handoff be shaped?

- a) One handoff with a filter applied at write time, so only flagged or blocked outcomes go to compliance.
- b) Split it into two distinct events, one for flagged and one for blocked.

Recommended: a. A single filtered handoff keeps the event model simple while still suppressing the routine cleared screenings.

a7:

---

q8: Two relationship rows linking visitors to the audit log use the verb "logged_in", which reads as incomplete and is not the catalog's audit-log idiom. Which wording should replace it?

- a) "audited_in" (inverse: audits)
- b) "records_event_in" (inverse: records)
- c) "appears_in" (inverse: includes)
- d) Supply your own wording.

Recommended: a. It matches how the rest of the catalog phrases audit-log relationships. This overwrites a non-empty value, so it needs your sign-off.

a8:

---

## Optional (will not hold up the build)

q9: Seven extra entities show up as first-class objects across the flagship visitor vendors (pre-registration invitation or QR links, health screenings, government-ID verifications, pre-arrival documents, visitor groups or crews, a configurable visitor-type taxonomy, and delivery or courier check-ins). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Each appears across most of the vendor set, though they still want a verification pass first.

a9:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-PII-INDIRECT.direct q3=B2-PII-INDIRECT.indirect q4=B2-GDPR-CCPA q5=B2-OSHA q6=B2-NDA-OWNERSHIP q7=B2-WATCHLIST-ROUTING q8=B2-LOGGED-IN-VERB q9=B3-INVITATION-LINKS+B3-HEALTH-SCREENINGS+B3-ID-VERIFICATIONS+B3-PRE-ARRIVAL-DOCS+B3-GROUPS+B3-TYPES+B3-DELIVERY-CHECK-INS | domain_id=24 -->
