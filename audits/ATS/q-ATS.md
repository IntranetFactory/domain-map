# Applicant Tracking and Recruiting (ATS): questions waiting for you

## What this domain is
Hire faster with a connected pipeline from sourcing through offer acceptance.

Track every candidate from first contact through hire. Manage job requisitions, posting distribution, application intake, interview scheduling, scorecard collection, and offer generation in one connected pipeline.

When a candidate accepts an offer, the workflow hands off cleanly to onboarding so your new hire's first day doesn't start from a blank page. Built-in support for EEOC-compliant funnel analytics, requisition approval routing, and offer-letter version control.

---

This audit changed nothing in the catalog. Every change below is only a proposal; nothing is written until you answer. Questions marked (Hiring Starter) fix the problems found in the Hiring Starter blueprint.

---

q1: One handoff to HRSD carries the wrong process code, and fixing it overwrites an existing tag. Handoff #402 (a flagged background check sent to HRSD) is tagged 7.4 "Manage employee relations", but a flagged pre-hire check is screening work, handled under 7.2.5.1 "Obtain candidate background information". What should happen to the 7.4 tag?

- a) Re-point it to 7.2.5.1 "Obtain candidate background information".
- b) Delete the tag.
- c) Leave it as 7.4.

Recommended: a. The handoff carries a background check, which is screening work under 7.2.5.1; re-pointing keeps the handoff's process coverage and stops the resolver re-flagging it on every run.

a1:

---

q2: (Hiring Starter) Six detail records (consents, FCRA disclosures, stage history, interview panels, offer versions, applicant-flow logs) are marked as required parts of records that most ATS modules carry without them, so those modules (and Hiring Starter) can't stand on their own. How should this be fixed?

- a) Mark the four that many organizations don't keep (consents, FCRA disclosures, interview panels, applicant-flow logs) as not required, and give the modules that lack them their own copy of the two core ones (stage history in Interviews, Offers and Hiring Starter; offer versions in Pre-Employee Record and Hiring Starter).
- b) Give every module its own copy of all six, with the four as optional.
- c) Mark all six as not required and copy nothing.

Recommended: a. FCRA disclosures and applicant-flow logs are US-only rules and consents are kept only by some organizations (the catalog's own necessity rule lists them as optional), and not every interview has a panel, so requiring them is wrong rather than missing; stage history and offer versions belong to every application and offer.

a2:

---

q3: (Hiring Starter) 33 relationships between records and people (owning recruiter, publisher, approver, coordinator, interviewer and more) are stored as many-to-many, and two of them combine two roles in one relationship ("coordinator and panelists", "recruiter and hiring manager"). Restructure them so each role is one person per record, splitting the two combined relationships (yes/no)

Recommended: yes. A role on a record is one person; with many-to-many relationships the "only the owner can see this" rules on candidates, applications, scorecards and offers have no owner to check, which is why the blueprint's row-scope rules can't work.

a3: yes, applied 2026-11-02

---

q4: (Hiring Starter) 10 parent-child relationships name the child as the owning side (for example "candidate submits application"), which inverts what happens on delete. Apply the drafted fix to each one: 8 flips, one flip plus a reworded verb, and one relationship turned the right way round (yes/no)

Recommended: yes. The owning side must be the parent; each relationship was checked one by one rather than flipped in bulk.

a4: yes, applied 2026-11-02

---

q5: (Hiring Starter) Submitting a scorecard is currently a restricted step only the Recruiting Manager (or an admin) can take, so interviewers can't submit their own feedback. Stop restricting it, so each interviewer submits their own scorecard and it locks once submitted (yes/no)

Recommended: yes. Submitting is the author's own step; the lock after submission is a rule about the author, not an approval.

a5: yes, applied 2026-11-02

---

q6: (Hiring Starter) The Hiring Starter description contradicts what the package contains (it says "no workflow gates", but six steps are gated; "one system skill", but skills belong to the domain; "no background-check orchestration", but it reacts to a flagged check; "no pre-employee reconciliation", but an accepted offer hands off to HR). Replace it with this text (yes/no)

"Entry-tier deployable for a basic hiring workflow: post jobs, capture applications, run interviews, and make offers. Embeds the canonical masters from the full ATS modules and inherits their lifecycle states and gated steps, which it governs under its own permission prefix. Leaves out requisitions and their approvals, background-check processing (it reacts when a background check is flagged), and the pre-employee record (an accepted offer hands the new hire to HCM). Upgrades to the full ATS modules without tenant data migration via the embedded-master demotion path."

Recommended: yes. The current text is wrong in the four places listed above; the new text matches what the blueprint shows and names no counts.

a6: yes, applied 2026-11-02

---

q7: (Hiring Starter) Once recruitment sources are installed, every candidate must have a source, so a walk-in or inbound candidate with no known source can't be saved. Make the source optional on a candidate (yes/no)

Recommended: yes. Many candidates arrive with no attributed source. (The other flagged relationship, a scorecard belonging to an interview, is correct as it is.)

a7: yes, applied 2026-11-02

---

q8: (Hiring Starter) Four events point at states or records that don't fit. Which fixes should be applied?

- a) All four: "headcount approved" lands on the requisition's open state; "offer signed" becomes "offer accepted" (its two handoffs move to the existing accepted event and the duplicate event is removed); "source attributed" becomes a signal (recruitment sources have no lifecycle); the two talent-pool events move to the pool membership.
- b) Only the first two.
- c) None.

Recommended: a. A requisition has no approved state (open is the approved, recruiting state), an offer has no signed state (the offer letter's signed state already records it), a source has no lifecycle, and adding someone to a pool changes the membership, not the pool.

a8: a, applied 2026-11-02

---

q9: (Hiring Starter) No restricted step is marked high risk yet. Mark approving an offer, hiring a candidate and approving a requisition as high risk, so that when business roles take the steps only the assigned role can take them and admins can't step in?

- a) All three.
- b) Only approving an offer and hiring a candidate.
- c) None.

Recommended: a. These are the hiring decisions and financial commitments high risk is meant for; it changes nothing when only admins take the steps.

a9:

---

q21: Hiring on an application is set to happen in the Pre-Employee Record module, which doesn't contain applications. Move it to the Recruitment Pipeline, which owns applications (yes/no)

Recommended: yes. Today it produces a permission under the wrong module, and it is the one problem the design checker reports on the Recruitment Pipeline blueprint.

a21:

---

q22: Treat candidate assessments, candidate referrals and referral payouts as personal data, so each row is visible only to its owner unless someone holds view-all access?

- a) All three.
- b) Only candidate assessments.
- c) None.

Recommended: a. Assessment results, referral submissions and payout amounts are personal data about a candidate or an employee.

a22:

---

q23: Three record descriptions name vendors or products. Replace them with these texts (yes/no)

- Job posting distributions: "Syndication of a job_posting to an external job board or the internal mobility portal. Carries board name, post timestamp, expiry, cost, applicant attribution."
- Interview kits: "Reusable interview template per role / stage. Bundles assigned questions, target competencies, recommended scorecard, expected duration."
- Interviewer availability slots: "Bookable time window an interviewer has marked available. Drives self-serve interview scheduling. Carries interviewer, start, end, allowed interview types."

Recommended: yes. Vendor and product names belong only on vendor and product records.

a23:

---

q24: The Background Checks module no longer owns any record, since Background Verification took over all screening records. What should it be?

- a) Keep it as the standalone screening module: it orders and tracks screening and hands over to Background Verification when that is installed.
- b) Keep it and rename it to say it orders and tracks screening.
- c) Fold it into Job Offers, since screening is ordered when an offer is accepted.

Recommended: a. Greenhouse, Lever, Ashby, SmartRecruiters and iCIMS all run screening through a partner integration and keep no screening record of their own; this module is exactly that integration point. Folding it would move two restricted steps and the processes that depend on them.

a24: c, applied 2026-11-02

---

q25: Two handoffs about background checks are still published by ATS, though Background Verification now owns those records. Move them to Background Verification?

- a) Yes, Background Verification publishes them.
- b) No, ATS keeps publishing from its own copy.

Recommended: b while the Background Checks module stays the standalone screening module (q24 a); a if it is folded or removed.

a25: a, applied 2026-11-02

---

q26: Recruiter interactions and candidate notes are two records with the same meaning. Merge recruiter interactions into candidate notes?

- a) Merge them.
- b) Keep both, but redefine recruiter interactions.
- c) Keep both as they are.

Recommended: a. Greenhouse, Lever, Ashby and SmartRecruiters each keep a single notes record on the candidate; none separates recruiter interactions from notes.

a26:

---

q27: Candidate nurture campaigns and outreach sequences are the same thing under two names. Merge them?

- a) Merge them into outreach sequences.
- b) Keep both, redefining nurture campaigns as the audience enrolled into a sequence.
- c) Keep both as they are.

Recommended: a. Ashby has one sequence record and Lever calls the same record a nurture campaign; Greenhouse and SmartRecruiters each have one.

a27:

---

q28: There is no record for candidate message templates, although sequences and emails refer to one. How should they be modeled?

- a) A new candidate message templates record in the Candidate CRM (optional).
- b) Reuse the generic notification templates owned by the learning domain.
- c) Leave them out.

Recommended: a. Greenhouse (Email Templates), Ashby (communication templates) and SmartRecruiters (Message Templates) each keep candidate message templates inside the applicant tracker.

a28:

---

q29: The "AI-driven matching and screening" capability has no record behind it. Give the Candidate CRM optional copies of the fit scores and match runs owned by Talent Intelligence, and keep the people-analytics flight-risk models out of ATS?

- a) Yes.
- b) Only the fit scores.
- c) No.

Recommended: a. All five vendors keep a match or fit score on the application, and the EU AI Act requires logging high-risk AI decisions, which the match runs record.

a29:

---

q30: Pay transparency: postings and offers need the salary band, which was removed from ATS on 2026-05-28. Add it back as optional for Job Offers and the Recruitment Pipeline (yes/no)

Recommended: yes. Lever postings carry a salary range and Ashby postings carry compensation; the EU Pay Transparency Directive requires a pay range before the interview.

a30:

---

q31: The handoff to Benefits Administration carries the candidate record, which benefits doesn't use. Change it to carry the benefit enrollment, keeping its process tag (yes/no)

Recommended: yes. The benefits side works on the enrollment it opens, not on the candidate.

a31:

---

q32: Now that submitting a scorecard is no longer restricted (q5), the "Interview candidates" process has no restricted step left, so its responsibility rows show "no gate wired" and "no event wired" in the Hiring Starter and Candidate Interviews blueprints. A process doesn't need a restricted step, so how should this be fixed?

- a) Detach the submitted state from the process. The process and its warnings leave both blueprints, but the Recruiting Manager and Coordinator drop out of Candidate Interviews, and the Coordinator drops out of Hiring Starter.
- b) Leave it attached, and keep the warnings.
- c) Change the generator. The Accountable row gets the write access the blueprint template already specifies for a process with no restricted step, and the Informed row is notified on "scorecard submitted", which already exists.

Recommended: c. The catalog data is correct and the template allows this case: the warnings come from the generator, which only looks at restricted steps when it builds these rows.

a32: c, applied 2026-11-02

---

## Optional (will not hold up the build)

- AI screening notices and bias audits (NYC Local Law 144, EU AI Act, Illinois and Colorado rules): no home in the catalog yet; needs vendor research first.
- Candidate experience surveys, job templates, interview transcripts, candidate education and employment history, recruiting audit events: modeled by several of the vendors above.
- Referral bonuses reach payroll two ways; one path would be cleaner.

<!-- agent map, ignore: q1=B1B-B9D-MISTAG-402 q2=B2-M9-COMPOSED-CHILDREN q3=B2-B7B-USER-RELATIONSHIPS q4=B2-B6B-OWNER-SIDE q5=B2-E4D-SUBMIT-SCORECARD q6=B2-R7-HIRING-STARTER-DESCRIPTION q7=B2-HS-SOURCE-RELATIONSHIP q8=B2-B9C-EVENT-REPOINTS q9=B2-HIGH-RISK-GATES q21=B2-M5-STATE-221 q22=B2-B4-PERSONAL-CONTENT q23=B2-R18-VENDOR-NAMES q24=B2-MO1-BACKGROUND-CHECKS-MODULE q25=B2-X4-BGV-PUBLISHER q26=B2-S1-RECRUITER-INTERACTIONS q27=B2-S2-NURTURE-VS-SEQUENCES q28=B2-M1-MESSAGE-TEMPLATES q29=B2-M3-AI-MATCHING q30=B2-M10-PAY-RANGES q31=B2-X2-BENADMIN-H395 q32=B2-INTERVIEW-CANDIDATES-NO-GATE | domain_id=56 -->
