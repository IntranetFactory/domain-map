# Learning Management System (LMS): questions waiting for you

## What this domain is

LMS runs corporate learning end to end: author and publish courses, deliver them online or in a classroom, track every enrollment and completion, and issue the certifications and badges that prove it. It also carries the compliance side, assigning mandatory training, capturing the evidence regulators ask for, and feeding completion signals out to HR, GRC, and identity systems.

---

q1: (answer this first) Should the six per-regulation evidence tables (HIPAA, OSHA, SOX, FERPA, FDA Part 11, BSA/AML) be collapsed into one training-evidence table keyed by regulation type?

- a) Yes: drop the six separate tables, add a regulation-type field on the single evidence table, and recover per-statute install gating through a tenant "active regulations" setting.
- b) Yes, but keep the FDA Part 11 audit-trail table separate as its own audit-log record.
- c) No: keep the six separate tables, and instead just mark the FDA Part 11 and BSA/AML tables as optional rather than required.

Recommended: a. Flagship LMS products model one evidence table keyed by regulation, which is simpler to maintain; the only trade-off is losing per-statute install gating, recoverable via tenant config. This is a high-blast-radius structural change (it deletes tables) and several questions below depend on its shape, so settle it first. It needs your sign-off because it deletes existing tables.

a1:

---

q2: Should learner-data privacy (data-subject requests and consent) be moved out of LMS and consolidated under a dedicated privacy domain shared with the recruiting domain?

- a) Defer: treat this as a separate cross-domain initiative and keep learner privacy in LMS for now.
- b) Plan the privacy-domain build-out now as the prerequisite, then schedule LMS and recruiting to hand their privacy data over to it.
- c) Decline: keep learner-data privacy permanently mastered in LMS.

Recommended: a. Privacy data is currently fragmented across LMS and recruiting, and the proper owner (a privacy domain) holds none of it yet; dissolving the LMS privacy module alone would strand training-data erasure. Defer it to a focused cross-domain effort rather than rushing it here. It is non-destructive as long as nothing is moved yet.

a2:

---

q3: Four cross-domain items that LMS modules pull from other domains (onboarding tasks, policy attestations, performance goals, skills-gap analyses) are currently marked required, which blocks LMS from deploying on its own. How should they be handled?

- a) Flip all four to optional so each module degrades gracefully when the external data is absent.
- b) Convert them to embedded copies that LMS owns.
- c) Decide each of the four separately.

Recommended: a. A required dependency on a table another domain owns breaks standalone deployability; making them optional is the standard fix and lets each module run without the external feed.

a3:

---

q4: A learning-skills capability is linked to LMS but no LMS module actually delivers it. How should the orphan be resolved?

- a) Delete the LMS link to that capability, since the skills-management domain is its real owner.
- b) Add a realizing link from the LMS learning-paths module after the skill-target table ships.

Recommended: a. The skills-management domain owns this capability; the link appears on LMS only because LMS consumes skill tags downstream. Deleting the link is the cleaner fix. It needs your sign-off because it removes an existing link.

a4:

---

q5: Should I draft buyer-voice catalog copy (tagline plus description) for the LMS domain and all eight modules?

- a) Draft all nine, surface them for your row-by-row review, and write them only after you approve.
- b) Draft a single example first to set the voice, then do the rest.
- c) Skip the catalog copy for now.

Recommended: a. Every one of the nine rows is currently empty, so backfill is permitted once you approve the drafts. Drafting all nine and reviewing together is the fastest path. Low stakes.

a5:

---

q6: Should I author the LMS personas and their responsibility assignments now, or schedule a dedicated session for it?

- a) Author the Learning Admin, Compliance Training Manager, Instructor, and Learner personas now.
- b) Schedule a separate session for the people-and-process layer, which also wires the lifecycle approval gates.
- c) Author only the starter-module roles first.

Recommended: b. The people-and-process layer is sizable and pairs naturally with wiring the lifecycle approval gates, so a focused session does it better than bolting it on here.

a6:

---

q7: An inbound handoff from the HR service domain (an HR case-category change) currently has no LMS landing spot. Which LMS module should receive it?

- a) The compliance-training module, where the case category drives compliance-tag inheritance.
- b) The learning-paths module, where the case category drives learning-path assignment.
- c) Neither: the handoff is mis-modeled, so retire it.

Recommended: no preset. The endpoint is genuinely ambiguous (compliance-tag inheritance versus learning-path assignment) and no LMS module currently claims the underlying data, so this needs your read on what the handoff is really for. If retiring it, that removes an existing handoff and needs your sign-off.

a7:

---

q8: The vendor-surface "missing" entities (the prior set of 19 plus newer market items) are not yet loaded. How much should I ship?

- a) Ship them grouped by area: course delivery, classroom delivery, learning paths, credentials, compliance, privacy, automation, and evaluations.
- b) Ship a subset only (tell me which groups).
- c) Defer the whole load.

Recommended: a. These are anchored to flagship-vendor surfaces or specific regulations, so shipping them by group is the clean path. Note the compliance group interacts with q1 and the privacy group with q2, so sequence those after their gates.

a8:

---

q9: The domain currently lists only FERPA as an in-scope regulation, but LMS has a privacy module and HIPAA, OSHA, and SOX evidence tables. Which regulations should be tagged onto LMS?

- a) Add GDPR plus HIPAA, OSHA, and SOX.
- b) Add GDPR only.
- c) Leave it as FERPA only.

Recommended: a. The compliance and privacy modules already bring these statutes into scope, so the regulation list should reflect them. This interacts with the privacy decision in q2.

a9:

---

## Optional (will not hold up the build)

q10: Several extra learning entities show up across the flagship LMS vendors (learning evaluations and training surveys for satisfaction and effectiveness scoring, self-service training requests with approvals, external/off-platform training records, and gamification points and leaderboards). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and best done after the module shape is settled. Learning evaluations and training requests are the strongest candidates; all want a verification pass first.

a10:

---

<!-- agent map, ignore: q1=B2-REFACTOR-C q2=B2-REFACTOR-A q3=B2-M9-DECISION q4=B2-SKILLS-MGMT-ATTRIBUTION q5=B2-CATALOG-COPY q6=B2-PERSONAS q7=B2-1121-ROUTING q8=B2-MISSING-ROUTING q9=B2-DOMAIN-REGULATIONS q10=B3-LEARNING-EVALUATIONS+B3-TRAINING-REQUESTS+B3-EXTERNAL-TRAINING-RECORDS+B3-GAMIFICATION | domain_id=57 -->
