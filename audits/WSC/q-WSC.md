# Workstream Collaboration (WSC): questions waiting for you

## What this domain is
Persistent, channel-based team chat with voice and video huddles and governed external-guest collaboration. Organize conversations into channels and threads, drop into live huddles from a channel, share files and attachments, and bring in outside partners as guests under controlled invitations and scoped access. This is the chat platform itself (think Slack, Microsoft Teams, Google Chat), so posting a message is the core workflow, not a side effect.

---

q1: (answer this first) The cross-domain handoff notes on 10 WSC rows (the 8 outbound rows plus the inbound row 790) carry old auto-written "target NULL until X is modularized" provenance text that the current rules no longer allow. Handoff 790's note is also factually stale after earlier fixes wired its module and consumer link. How should these notes be handled?

- a) Revert all 10 rows to empty and log a Rule #15 incident entry.
- b) Leave them in place (you confirm they were approved when first loaded).
- c) Partial: revert the 9 stale "X is modularized" rows now, and decide handoff 790's wording separately.

Recommended: a. The text matches the forbidden auto-populated pattern verbatim and 790's note is now incorrect, so a clean revert plus an incident log is the cleanest fix. This is a destructive overwrite of non-empty notes, so it needs your sign-off.

a1:

---

q2: Five WSC data masters (chat_messages, chat_threads, channel_members, chat_message_attachments, channel_file_shares) carry old config-shape exemption text in their notes. That exemption is now captured structurally by each row's entity_type, so the notes text is fully redundant. Should the notes on these 5 rows be reverted to empty? (yes/no)

Recommended: yes. The entity_type classification already records the exemption, so the notes text adds nothing and violates the current notes rule. This is a destructive overwrite of non-empty notes, so it needs your confirmation.

a2:

---

q3: Should chat_channels.has_personal_content flip to true, to reflect that private channels and direct messages surface personal content? (yes/no)

Recommended: yes. Private channels and DMs are a personal-content surface. This flips an existing flag value, so it needs your call.

a3:

---

q4: Should chat_channels.has_submit_lock flip to true, so an archived channel rejects new posts? (yes/no)

Recommended: yes. An archived channel should be immutable to new posts. This flips an existing flag value, so it needs your call.

a4:

---

q5: Should channel_members.has_personal_content flip to true, to reflect that membership lists for sensitive channels are personal content? (yes/no)

Recommended: yes. Membership of a sensitive channel is itself personal information. This flips an existing flag value, so it needs your call.

a5:

---

q6: Microsoft Viva Connections is linked to WSC at coverage_level "partial", but it is an intranet portal product, not a chat surface, and Microsoft's chat is already linked as primary via the correct WSC vehicle. Should that partial link be deleted (Viva moves to INTRANET only), or left in place?

- a) Delete the partial solution link (Viva becomes INTRANET only).
- b) Leave it as partial (the embedded chat surface inside the intranet product justifies it).

Recommended: a. The chat surface is already covered by the primary Microsoft Teams link, so the partial Viva link reads as scope creep. Deleting a solution link is destructive, so it needs your sign-off.

a6:

---

q7: The everyday collaboration user role can manage channels and huddles but holds no grant on external collaboration, so guest invites are admin-only today. Should that role get an external-collaboration grant (so employees can self-serve guest invites)?

- a) Add a read (or manage) grant on external collaboration to the employee role.
- b) Leave it as is (guest invites stay admin-only by intent).
- c) A different mapping (you pick per-org).

Recommended: b unless you want self-serve guest invites. Admin-only guest invites are a defensible governance posture; the missing grant may be intentional rather than an oversight.

a7:

---

q8: The external-collaboration steward role has access on channels and external collaboration but holds no grant on huddles and voice. Should the steward get any grant on the huddles and voice surface?

- a) Add a grant on huddles and voice to the steward role.
- b) Leave it as is (huddles are not the steward's surface).

Recommended: b. Huddles and voice are not the steward's area of responsibility, so the absence is most likely correct, but confirm it is intent rather than an omission.

a8:

---

q9: The WSC owner function is recorded as "End-User Computing", which is not one of the canonical 20-function spine names; the closest canonical owner is "IT Operations". A valid single owner already exists, so this is non-blocking. Re-point the owner to the canonical spine name, or leave it?

- a) Re-point the owner to "IT Operations" (the canonical spine name).
- b) Leave "End-User Computing" as a deliberate finer-grained sub-function.

Recommended: b. The current owner row is valid and the C1 check already passes, and changing the owning function is a destructive overwrite; only re-point if you want strict alignment to the canonical spine.

a9:

---

q11: Contact Center as a Service forwards chat thread to Workstream Collaboration to respond to customer problems, requests, and inquiries, but Workstream Collaboration does not yet have anyone assigned to respond to customer problems, requests, and inquiries, so this step has no owner. How should it be handled?
- a) Record it now as work Workstream Collaboration owns, and assign a named owner once Workstream Collaboration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Workstream Collaboration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a11:

---

q12: MSP Professional Services Automation forwards chat message to Workstream Collaboration to manage customer service problems, requests, and inquiries, but Workstream Collaboration does not yet have anyone assigned to manage customer service problems, requests, and inquiries, so this step has no owner. How should it be handled?
- a) Record it now as work Workstream Collaboration owns, and assign a named owner once Workstream Collaboration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Workstream Collaboration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

q13: Data Loss Prevention forwards chat message to Workstream Collaboration to review and monitor physical and logical IT data security measures, but Workstream Collaboration does not yet have anyone assigned to review and monitor physical and logical IT data security measures, so this step has no owner. How should it be handled?
- a) Record it now as work Workstream Collaboration owns, and assign a named owner once Workstream Collaboration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Workstream Collaboration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Enterprise Content Management forwards chat message attachment to Workstream Collaboration to develop and manage content, but Workstream Collaboration does not yet have anyone assigned to develop and manage content, so this step has no owner. How should it be handled?
- a) Record it now as work Workstream Collaboration owns, and assign a named owner once Workstream Collaboration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Workstream Collaboration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: Enterprise Content Management forwards chat channel to Workstream Collaboration to retain records, but Workstream Collaboration does not yet have anyone assigned to retain records, so this step has no owner. How should it be handled?
- a) Record it now as work Workstream Collaboration owns, and assign a named owner once Workstream Collaboration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Workstream Collaboration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: Identity Governance and Administration forwards channel member to Workstream Collaboration to manage IT user identity and authorization, but Workstream Collaboration does not yet have anyone assigned to manage IT user identity and authorization, so this step has no owner. How should it be handled?
- a) Record it now as work Workstream Collaboration owns, and assign a named owner once Workstream Collaboration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Workstream Collaboration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

## Optional (will not hold up the build)

q10: Four entity surfaces show up across the flagship workstream-collaboration vendors that WSC does not model yet: emoji reactions, direct messages (1:1 and group DMs as a distinct surface from channels), huddle recordings and transcripts, and the chat-apps and workflows platform layer. Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the current build settles. Reactions are universal with no downside; the others want a verification pass first (direct messages may overlap with the chat_channels pattern flags above, and the apps layer may overlap with the work-management automation domain).

a10:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S4.channels_personal q4=B2-S4.channels_submitlock q5=B2-S4.members_personal q6=B2-S5 q7=B2-S6.employee q8=B2-S6.steward q9=B2-NOTE-C1 q10=B3-S1+B3-S2+B3-S3+B3-S4 q11=B2-B9D-OWN-928 q12=B2-B9D-OWN-196 q13=B2-B9D-OWN-1179 q14=B2-B9D-OWN-428 q15=B2-B9D-OWN-1440 q16=B2-B9D-OWN-273 | domain_id=75 -->
