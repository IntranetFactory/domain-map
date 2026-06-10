# Applicant Tracking System (ATS): questions waiting for you

## What this domain is
Run hiring end to end, from open requisition to signed offer. Post jobs, source and track candidates through every stage, schedule interviews and capture scorecards, run background and compliance checks, and make and approve offers. The model also carries the regulated paperwork that hiring in the US and EU requires (FCRA background-check notices, OFCCP applicant-flow logging, EEO self-identification, and GDPR data-subject requests).

---

q1: (answer this first) The "legacy rollup table" is `domain_data_objects`: before this domain was split into modules, each domain listed its data objects there directly. After modularization the real source of truth became the per-module list (`domain_module_data_objects`), and the old table was meant to auto-rebuild from it but never did, so it's frozen at 15 objects while the modules actually hold 60. An auditor who counts from it under-counts by 45. How should that be handled?

- a) Deprecate it: point the audit checklist and any other readers at the live per-module list, so nothing relies on the stale table again. Catalog-wide change.
- b) Regenerate it: run a repeatable script that rebuilds it from the live per-module list, catalog-wide (other modularized domains have likely drifted too).
- c) Leave it: accept the drift, since the report and blueprint generators already read the live per-module list directly.

Recommended: a. Deprecating removes the only thing that can produce a wrong count. Catalog-wide policy that affects audit integrity for every modularized domain, so it is the call to make first.

a1:

---

q2: Two ATS-to-Benefits handoffs are tagged with the wrong process code. Handoff #120 (offer accepted -> Benefits, payload "benefit enrollments") and #395 (candidate hired -> Benefits, payload "candidates") are both tagged 7.3 "Manage employee onboarding, training, and development", but the work they actually hand to Benefits Administration is benefit enrollment, which is process 7.5.2.2 "Administer benefit enrollment". Should I re-tag both from 7.3 to 7.5.2.2? This overwrites an existing tag, so it needs your sign-off. (yes/no)

Recommended: yes. The payload is literally benefit enrollments and the target is Benefits Administration, which owns that work; 7.3 (onboarding/training/development) is the wrong branch. Heads-up: an automated hierarchy check currently wants to roll 7.3 up to 7.3.3.2 "Develop employee career plans" because that sub-code just became used elsewhere, but that match is spurious (career planning is not benefits enrollment) and I have not applied it. Separately, Benefits Administration still needs to wire up 7.5.2.2 on its own side; that is tracked on its audit, not here, and does not hold up ATS.

a2:

---

## Optional (will not hold up the build)

q3: Should I add a right-to-work verification object (US Form I-9 / E-Verify) at the pre-hire stage? You asked whether it is optional: yes, it is a `b3` (won't block the build). One thing to note: `work_eligibility_documents` already exists in the catalog, but that is the supporting paperwork, whereas this would be the verification *event* (the I-9 / E-Verify check itself) with its own status. They are complementary, not duplicates. (yes/no)

Recommended: yes. A mandatory pre-hire compliance record, distinct from FCRA screening and from the existing documents object, with clear vendor precedent (Workday Recruiting, HireRight). Additive.

a3:

---

q4: Should I add an agency-submission object that records which agency submitted which candidate? You asked how others handle it: Greenhouse / SmartRecruiters / Lever model it as a link between agency and candidate carrying the submission date, an ownership/dedup window (if two agencies submit the same person, the first valid submission owns the placement), and fee terms. Today `recruitment_agencies` is a master with nothing recording what any agency actually did. (yes/no)

Recommended: yes. Every agency-fed pipeline needs this link, and it is additive.

a4:

---

q5: Should I add outreach sequences (plus their per-step records) for automated multi-step sourcing cadences? You asked how others handle it and whether it is one sequence or agent-driven: vendors (Ashby / Lever / Gem) model one sequence *definition* (a named cadence: day 0 email, day 3 nudge, day 7 InMail) plus per-step enrollment records (sent / opened / replied per candidate). AI agents increasingly draft and auto-advance the steps, but they still act on exactly this sequence + step + enrollment shape, so modeling it now is forward-compatible, not throwaway. (yes/no)

Recommended: yes. Fills a recognized sourcing gap that the existing nurture-campaign and recruiter-interaction objects do not cover. Additive.

a5:

---

<!-- agent map, ignore: q1=B2-ROLLUP-POLICY q2=B1B-B9D-RETAG-BENADMIN q3=B3-RIGHT-TO-WORK q4=B3-AGENCY-SUBMISSIONS q5=B3-OUTREACH-SEQUENCES | domain_id=56 -->
