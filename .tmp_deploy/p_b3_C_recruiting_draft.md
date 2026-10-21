# Phase B3 cluster draft — C_recruiting

Domain ATS — Applicant Tracking and Recruiting (id 56). Lifecycle states and pattern flags for every master+required data_object. Reference vendors: Greenhouse, Workday Recruiting, Lever, iCIMS, Ashby.

### background_checks

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| requested | 1 | true | false | false | _ | Check ordered from the provider for a candidate. |
| in_progress | 2 | false | false | false | _ | Provider is running verification (criminal, employment, education, identity). |
| completed_clear | 3 | false | true | false | _ | Provider returned a clear result; no adverse findings. |
| completed_consider | 4 | false | true | true | _ | Provider returned adverse findings; gated review required before adjudication. |
| cancelled | 5 | false | true | false | _ | Check withdrawn before the provider returned a result. |

### candidate_assessments

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| invited | 1 | true | false | false | _ | Assessment invitation sent to the candidate by the partner system. |
| in_progress | 2 | false | false | false | _ | Candidate is actively taking the assessment. |
| completed | 3 | false | true | false | _ | Candidate finished the assessment and a score/result is recorded. |
| expired | 4 | false | true | false | _ | Invitation lapsed before the candidate completed the assessment. |
| cancelled | 5 | false | true | false | _ | Assessment withdrawn before completion. |

### candidate_referrals

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| submitted | 1 | true | false | false | _ | Employee submitted a referral candidate against a requisition. |
| under_review | 2 | false | false | false | _ | Recruiter is evaluating the referred candidate. |
| converted | 3 | false | true | false | _ | Referral became a job application in the ATS pipeline. |
| bonus_payable | 4 | false | false | true | pay_referral_bonus | Hire confirmed; gated step to approve the referral bonus payout. |
| bonus_paid | 5 | false | true | false | _ | Referral bonus has been issued to the referring employee. |
| rejected | 6 | false | true | false | _ | Referral not pursued. |

### candidates

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| prospect | 1 | true | false | false | _ | Person known to the recruiting org with no active application. |
| active | 2 | false | false | false | _ | Candidate has at least one open application or is actively engaged. |
| hired | 3 | false | true | true | hire_candidate | Candidate accepted an offer and converted to employee. |
| do_not_hire | 4 | false | true | true | flag_do_not_hire | Candidate flagged as ineligible for future consideration; gated decision. |
| archived | 5 | false | true | false | _ | Candidate kept in the database but not active in any pipeline. |

### interview_scorecards

**Pattern flags:** has_personal_content=true; has_submit_lock=true; has_single_approver=false

**Justification:** scorecards are private, per-interviewer feedback that locks on submit to preserve evaluation integrity.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Interviewer is filling in ratings and notes against the rubric. |
| submitted | 2 | false | true | true | _ | Scorecard submitted and locked; hire/no-hire recommendation recorded. |

### interviews

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| scheduled | 1 | true | false | false | _ | Interview booked with candidate, panel, time, and medium. |
| confirmed | 2 | false | false | false | _ | Candidate and panel confirmed attendance. |
| completed | 3 | false | true | false | _ | Interview took place; scorecards are being collected. |
| no_show | 4 | false | true | false | _ | Candidate or panel did not attend; interview did not occur. |
| cancelled | 5 | false | true | false | _ | Interview cancelled before it took place. |
| rescheduled | 6 | false | true | false | _ | Original slot abandoned in favor of a new scheduled interview record. |

### job_applications

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| applied | 1 | true | false | false | _ | Candidate submitted an application against the requisition. |
| screening | 2 | false | false | false | _ | Recruiter is reviewing resume and qualifications. |
| interviewing | 3 | false | false | false | _ | Candidate is progressing through interview loops. |
| offer_extended | 4 | false | false | false | _ | An offer has been generated and is in flight for this application. |
| hired | 5 | false | true | true | hire_candidate | Candidate accepted the offer and was hired; gated transition. |
| rejected | 6 | false | true | false | _ | Application closed without progression by recruiter or hiring manager. |
| withdrawn | 7 | false | true | false | _ | Candidate withdrew their application. |

### job_offers

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=true

**Justification:** offers require an explicit hiring-manager (or compensation) approver before they can be sent to the candidate.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Recruiter is composing offer terms and compensation components. |
| pending_approval | 2 | false | false | false | _ | Offer routed to the designated approver for sign-off. |
| approved | 3 | false | false | true | approve_offer | Approver signed off; offer is ready to send. |
| sent | 4 | false | false | false | _ | Offer delivered to the candidate. |
| accepted | 5 | false | true | false | _ | Candidate accepted the offer. |
| declined | 6 | false | true | false | _ | Candidate declined the offer. |
| rescinded | 7 | false | true | true | rescind_offer | Offer withdrawn by the employer after being sent; gated action. |

### job_postings

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Posting being composed against a requisition for a specific board or region. |
| published | 2 | false | false | true | publish_posting | Posting is live on the target channel; gated publish step. |
| paused | 3 | false | false | false | _ | Posting temporarily hidden from the channel. |
| expired | 4 | false | true | false | _ | Posting reached its scheduled end date. |
| closed | 5 | false | true | false | _ | Posting taken down because the requisition is filled or cancelled. |

### job_requisitions

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=true

**Justification:** opening a requisition is gated by a single budget/headcount approver (hiring manager's manager or finance partner) per standard ATS practice.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Hiring manager is drafting the requisition. |
| pending_approval | 2 | false | false | false | _ | Requisition routed for headcount and budget approval. |
| open | 3 | false | false | true | approve_requisition | Requisition approved and actively recruiting. |
| on_hold | 4 | false | false | false | _ | Recruiting temporarily paused (budget freeze, scope change). |
| filled | 5 | false | true | true | close_requisition | Requisition closed because the role was filled. |
| cancelled | 6 | false | true | false | _ | Requisition closed without a hire. |

### recruitment_agencies

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### recruitment_events

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### recruitment_sources

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### talent_pools

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false
