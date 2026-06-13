# Sales Engagement (SALES-ENG): questions waiting for you

## What this domain is
Run high-volume outbound sales from one place: multi-step cadences and sequences across email, phone, and tasks, with reps working from one queue. Track every email send, open, and reply, place and record dialler calls, book meetings, and feed real intent signals back into who to contact next. Capture and analyze the conversations themselves so reps get coaching and deals get clearer signals.

---

q1: (answer this first) Three outbound handoffs (82, 83, 206) flow out of Sales Engagement, but the events that fire them are attached to data that CRM owns (sales activities and opportunities). How should this be fixed?

- a) Create new Sales-Engagement-owned events on the sales masters (call recordings, cadences) and point the three handoffs at them, so Sales Engagement stays the publisher.
- b) Move the three handoffs to CRM as their true publisher.

Recommended: a. The workflow is rep-initiated from the cadence step, not from a CRM activity row, so Sales Engagement should own the events. This choice decides which domain owns these handoffs and unblocks the module-FK and APQC fixes that depend on them.

a1:

---

q2: Should call recordings be marked as holding personal content (prospect voice and PII, with consent and recording-jurisdiction handling)? (yes/no)

Recommended: yes. Recordings carry prospect voice and identifiable speakers, so they fall under consent and privacy handling.

a2:

---

q3: Should sales emails be marked as holding personal content (recipient PII and opt-out wiring)? (yes/no)

Recommended: yes. Recipient email and contact details are personal data and need opt-out handling.

a3:

---

q4: Should a cadence be frozen once it goes active, so its steps stay stable for downstream reporting? (yes/no)

Recommended: yes. Locking an active cadence keeps the step sequence stable for the emails and calls that reference it.

a4:

---

q5: Should conversation intelligence records be marked as holding personal content (transcripts and identified speakers)? (yes/no)

Recommended: yes. Transcripts name and quote real people, so they carry PII.

a5:

---

q6: Should only the recording owner be able to publish a call recording for coaching review (a single approver)? (yes/no)

Recommended: yes. A single accountable owner keeps coaching publication clean.

a6:

---

q7: The buyer-voice catalog copy (tagline and description) for the Sales Engagement domain and its three modules was empty and has now been written and is awaiting review. Do you accept the copy as written? (yes/no)

Recommended: yes. The copy was authored in buyer voice and sits at review status; any later rewrite of a now-non-empty value would need explicit per-row approval, so answering no means supplying exact replacement text per row.

a7:

---

q8: One existing tag on handoff 82 points at the wrong process ("Manage product recalls and regulatory audits"), a wrong-domain match on the word "calls". A correct tag will be added alongside it. Should the wrong tag be deleted at fix time? (yes/no)

Recommended: yes. The correct curated tag overrides it anyway, and leaving a wrong-domain tag in place pollutes the catalog. Deleting it is a destructive change, so it needs your sign-off.

a8:

---

q9: Handoff 206 is tagged at the detailed "Plan and manage meetings" level. Should it be promoted to its higher-level parent process for better clustering?

- a) Keep the current detailed (L4) tag.
- b) Replace it with the L3 parent (delete the existing row and insert the parent).

Recommended: b. The skill prefers L3 parents for clustering when an obvious parent exists. Option (b) deletes the existing row, so it needs your sign-off.

a9:

---

q10: Three inbound handoffs (81 opportunity assigned, 210 whitespace identified, 510 lead score recomputed) have no clean cross-industry process match. How should they be tagged?

- a) Accept the deferral and leave them untagged.
- b) Force a weak detailed-level tag and accept the catalog-quality hit.

Recommended: a. The skill allows deferrals when no clean process match exists, and forcing a weak tag pollutes the catalog.

a10:

---

q14: Customer Data Platform forwards cadence to Sales Engagement to develop and manage sales plans, but Sales Engagement does not yet have anyone assigned to develop and manage sales plans, so this step has no owner. How should it be handled?
- a) Record it now as work Sales Engagement owns, and assign a named owner once Sales Engagement sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Sales Engagement decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

## Optional (will not hold up the build)

q11: Flagship cadence vendors model several entities Sales Engagement does not have yet: typed cadence steps, a native prospect record (separate from CRM), reusable email templates, dialler phone-number pools and sessions, and conversation-intelligence topics and trackers. Should I research and add the ones that hold up into the existing modules? (yes/no)

Recommended: yes, but additive and can happen after a verification pass. These are common across the vendor set (Outreach, Salesloft, Apollo, Gong, Chorus) but want a check first.

a11:

---

q12: Two areas Sales Engagement touches look like point-solution markets of their own: intent data (Bombora, 6sense, G2) behind the intent-signals capability, and meeting scheduling (Chili Piper, Calendly, Outreach Meetings) behind the scheduler capability. Should I research and spin these out as separate candidate domains rather than entities inside Sales Engagement? (yes/no)

Recommended: yes to researching them, but this is a non-blocking new-domain idea, not part of finishing Sales Engagement.

a12:

---

q13: Sales engagement with dialling and outbound email carries regulatory exposure (TCPA, CAN-SPAM, CASL, GDPR consent), but no compliance or consent entities are linked today. Should I research and add the consent and regulation coverage that applies? (yes/no)

Recommended: yes, pending a compliance scoping pass against the confirmed vendor surface. Additive and non-blocking.

a13:

---

<!-- agent map, ignore: q1=B2-RETARGET-OR-MOVE q2=B2-PATTERN-FLAGS.callrec_pii q3=B2-PATTERN-FLAGS.email_pii q4=B2-PATTERN-FLAGS.cadence_lock q5=B2-PATTERN-FLAGS.ci_pii q6=B2-PATTERN-FLAGS.callrec_approver q7=B2-CATALOG-COPY q8=B2-APQC-WRONG-SUBSTRING q9=B2-APQC-L3-PROMOTION q10=B2-APQC-INBOUND-DEFER q11=B3-CADENCE-STEPS+B3-PROSPECTS+B3-EMAIL-TEMPLATES+B3-DIALER-INFRA+B3-CI-TOPICS-TRACKERS q12=B3-INTENT-SIGNALS+B3-MEETING-SCHEDULER q13=B3-TCPA-CONSENT q14=B2-B9D-OWN-25 | domain_id=95 -->
