# Applicant Tracking and Recruiting (ATS): questions waiting for you

## What this domain is
Hire faster with a connected pipeline from sourcing through offer acceptance.

Track every candidate from first contact through hire. Manage job requisitions, posting distribution, application intake, interview scheduling, scorecard collection, and offer generation in one connected pipeline.

When a candidate accepts an offer, the workflow hands off cleanly to onboarding so your new hire's first day doesn't start from a blank page. Built-in support for EEOC-compliant funnel analytics, requisition approval routing, and offer-letter version control.

---

q1: One ATS-to-HRSD handoff carries the wrong process code, and fixing it overwrites an existing tag, so it needs your sign-off. Handoff #402 (background_check.flagged -> HRSD, payload "background checks") is tagged 7.4 "Manage employee relations". But background checks are mastered and already handled inside ATS under 7.2.5.1 "Obtain candidate background information", so the 7.4 tag describes work that does not actually belong to HRSD (a flagged pre-hire check is not employee-relations work). What should happen to the 7.4 tag?

- a) Re-point it from 7.4 to 7.2.5.1 "Obtain candidate background information" (matches the carried entity, which ATS already realizes).
- b) Delete the 7.4 tag entirely (treat the flagged-check fan-out to HRSD as carrying no APQC process).
- c) Leave it as 7.4 (keep the current tag).

Recommended: a. The payload is background_checks, which ATS masters and already realizes under 7.2.5.1; re-pointing makes the tag agree with the entity it carries and keeps the handoff inside the recruiting process branch. Deleting (b) is acceptable if you prefer the fan-out to carry no process, but re-pointing preserves the cross-domain process coverage. Either a or b clears the standing mis-tag the B9d resolver re-flags on every ATS run; record_status stays "new" either way.

a1:

---

<!-- agent map, ignore: q1=B1B-B9D-MISTAG-402 | domain_id=56 -->
