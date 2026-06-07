# Applicant Tracking System (ATS): questions waiting for you

## What this domain is
Run hiring end to end, from open requisition to signed offer. Post jobs, source and track candidates through every stage, schedule interviews and capture scorecards, run background and compliance checks, and make and approve offers. The model also carries the regulated paperwork that hiring in the US and EU requires (FCRA background-check notices, OFCCP applicant-flow logging, EEO self-identification, and GDPR data-subject requests).

---

q1: (answer this first) The legacy rollup table that some audits read to count this domain's data objects is stale: it lists only 15 of the 60 objects, because it was never regenerated after the domain was split into modules. How should that be handled?

- a) Deprecate it: point the audit checklist and any other readers at the live per-module junction instead, so nothing relies on the stale rollup again. This is a catalog-wide change.
- b) Regenerate it: run a repeatable script that rebuilds the rollup from the live junction, catalog-wide (other modularized domains have likely drifted too).
- c) Leave it: accept the drift, since the report and blueprint emitters already read the live junction directly and are unaffected.

Recommended: a. Deprecating removes the only thing that can produce a wrong count, and the agent recommends it. This is a catalog-wide policy that affects audit integrity for every modularized domain, so it is the call to make first.

a1:

---

q2: The functional-stakeholder list for this domain has only two entries today (Recruiting as owner, Legal as contributor). Should I add Human Resources as a contributor and Finance as a consumer to round it out?

- a) Add Human Resources (contributor) and Finance (consumer).
- b) Leave it at Recruiting and Legal.

Recommended: a. It sharpens the buyer-persona and RACI picture. This is optional and additive, not a gap.

a2:

---

## Optional (will not hold up the build)

q3: Should I add a right-to-work verification object (US Form I-9 / E-Verify) at the pre-hire stage? It is a hard US legal requirement that is entirely absent today and is distinct from FCRA screening. (yes/no)

Recommended: yes. It is a mandatory pre-hire compliance record with clear vendor precedent, and it is additive.

a3:

---

q4: Should I add an agency-submission object that records which agency submitted which candidate? The recruitment-agencies master currently dangles with no junction capturing the billable, ownership, and dedup event. (yes/no)

Recommended: yes. Every agency-fed pipeline needs this link, and it is additive.

a4:

---

q5: Should I add outreach sequences (plus their per-step records) for automated multi-step sourcing cadences? This is the modern sourcing primitive that the existing nurture-campaign and recruiter-interaction objects do not cover. (yes/no)

Recommended: yes. It fills a recognized sourcing gap and is additive.

a5:

---

q6: Should I add a candidate-email object that persists the candidate communication thread as a first-class record, distinct from free-text notes and engagement summaries? (yes/no)

Recommended: yes. Persisted candidate email is common across the flagship vendors, and it is additive.

a6:

---

q7: Should I research and add any of the lower-confidence market-surface objects (onboarding handoffs, pre-employee documents, candidate data-retention policies, drug and health screenings, continuous-monitoring subscriptions, interview-feedback reminders, offer-approval chains)? (yes/no)

Recommended: yes, with a per-object verification pass first. These are vendor-real but lower-impact, specialist, or boundary-debatable, so each should be confirmed before loading. Additive and non-blocking.

a7:

---

<!-- agent map, ignore: q1=B2-ROLLUP-POLICY q2=B2-C1-FUNCTION-ROWS q3=B3-RIGHT-TO-WORK q4=B3-AGENCY-SUBMISSIONS q5=B3-OUTREACH-SEQUENCES q6=B3-CANDIDATE-EMAILS q7=B3-MARKET-JUDGMENT-LOWER-CONFIDENCE | domain_id=56 -->
