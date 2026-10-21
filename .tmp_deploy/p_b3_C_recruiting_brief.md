# Phase B3 cluster brief — C_recruiting

**Domains:** ATS — author lifecycle states + pattern flags for every master+required data_object listed below.

## Task

For every entity in this brief, return: (a) lifecycle states (snake_case state_name; state_order; is_initial; is_terminal; requires_permission; permission_verb_override only when needed; one-line description), OR `(static-reference: no lifecycle)` if it's pure reference data (e.g. tax_authorities, recruitment_sources, salary_bands, pricing_rules); AND (b) pattern flags has_personal_content / has_submit_lock / has_single_approver (true/false with one-line justification).

## Output format (strict — the loader parses this)

Use this exact shape per entity:

````
### <data_object_name>

**Pattern flags:** has_personal_content=<true|false>; has_submit_lock=<true|false>; has_single_approver=<true|false>

**Justification:** <one-line rationale covering any flag set to true; if all false write `no behavioral pattern applies`>

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| <snake_case> | <int> | <true|false> | <true|false> | <true|false> | <verb or _> | <one line> |
````

Or, for reference data:

````
### <data_object_name>

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false
````

## Decision guidance

- **`has_personal_content=true`** when row content is per-user-scoped and visibility/edit is row-author-only by default (e.g. `interview_scorecards`, `csat_responses`, `merit_recommendations`, `pay_slips`).
- **`has_submit_lock=true`** when the entity follows draft → submit-then-lock (e.g. `interview_scorecards` lock on submit, `tax_filings` lock once filed, `merit_recommendations` lock on submit).
- **`has_single_approver=true`** when an explicit single approver gates a transition (e.g. `job_offers` need hiring-manager approval, `discount_approvals` need a deal-desk approver, `purchase_requisitions` need a budget approver).
- **`requires_permission=true`** on a lifecycle state when reaching that state needs a workflow gate (`approved`, `submitted`, `hired`, `resolved`, `closed`). The state's verb derives the permission name (`approved → ats:approve_<entity>`, `hired → ats:hire_<entity>`); set `verb_override` only when the natural verb differs from the state name.
- **State naming:** snake_case, past-tense or status-noun (`draft`, `submitted`, `approved`, `active`, `closed`, `cancelled`). Stay consistent across sibling entities in a domain.
- **Static-reference test:** if the entity has no meaningful state transitions beyond `active/inactive` and exists primarily to be referenced as configuration (codes, rules, catalogs, banded data), mark it `static-reference`. Don't invent CRUD states.

## Entities in scope

### Domain ATS — Applicant Tracking and Recruiting (id 56)

> Requisition management, candidate sourcing, interview workflows, and offer management. AI-assisted matching and screening overlays are increasingly bundled.

#### background_checks

- **Plural label:** Background Checks · **Singular:** Background Check
- **Description:** External verification result for a candidate (criminal, employment history, education, credit, identity). Status and findings typically returned by a provider (Checkr, HireRight, Sterling).

#### candidate_assessments

- **Plural label:** Assessments · **Singular:** Assessment
- **Description:** Skills, cognitive, technical, or personality test result attached to an application. Often sourced from a partner system (HackerRank, Codility, Pymetrics) and referenced here.

#### candidate_referrals

- **Plural label:** Referrals · **Singular:** Referral
- **Description:** Employee-submitted candidate suggestion linked to a requisition. Tracks the referring employee, candidate, status, and any payable bonus.

#### candidates

- **Plural label:** Candidates · **Singular:** Candidate
- **Description:** Person known to the recruiting org, with or without an active application. Carries contact details, resume, tags, GDPR consent, and source. Distinct from Employee until hired.
- **Relationships (≤12):** skill_profiles —feeds→ candidates (one_to_many)

#### interview_scorecards

- **Plural label:** Interview Scorecards · **Singular:** Interview Scorecard
- **Description:** Structured interviewer feedback against a defined rubric: per-competency ratings, written notes, and a hire/no-hire recommendation.

#### interviews

- **Plural label:** Interviews · **Singular:** Interview
- **Description:** Scheduled assessment event between a candidate and one or more interviewers. Carries time, location/medium, panel, interview kit, and outcome.

#### job_applications

- **Plural label:** Applications · **Singular:** Application
- **Description:** A candidate's submission against a specific requisition. Carries pipeline stage, status (active / rejected / withdrawn / hired), source, and the full evaluation history.

#### job_offers

- **Plural label:** Offers · **Singular:** Offer
- **Description:** Formal employment offer extended to a candidate. Carries compensation components, start date, terms, approval chain, and status (draft / approved / sent / accepted / declined / rescinded).

#### job_postings

- **Plural label:** Job Postings · **Singular:** Job Posting
- **Description:** Published, candidate-facing version of a requisition on a career site or job board. One requisition can have many postings (per board, language, or region).
- **Relationships (≤12):** job_profiles —feeds→ job_postings (one_to_many)

#### job_requisitions

- **Plural label:** Job Requisitions · **Singular:** Job Requisition
- **Description:** Approved request to hire for a specific role. The master ATS work item, carries headcount, level, location, hiring manager, recruiter, and status (draft / open / on_hold / filled / cancelled).
- **Master slice notes:** Recruiting execution — ATS masters the pipeline-stage, candidate, interview, offer, and acceptance slice. SWP co-masters the headcount-intent slice (position approval, budget alignment, plan-to-actual). Cross-domain handoff SWP→ATS on headcount.approved is the bridge.
- **Relationships (≤12):** hcm_positions —spawns→ job_requisitions (one_to_many)

#### recruitment_agencies

- **Plural label:** Recruitment Agencies · **Singular:** Recruitment Agency
- **Description:** Third-party recruiter or staffing firm supplying candidates. Tracks contract terms, contact, performance, and the candidates they have submitted.

#### recruitment_events

- **Plural label:** Recruitment Events · **Singular:** Recruitment Event
- **Description:** Career fair, on-campus event, hackathon, or meetup used as a sourcing channel. Tracks attendees, captured leads, and event ROI.

#### recruitment_sources

- **Plural label:** Recruitment Sources · **Singular:** Recruitment Source
- **Description:** Channel a candidate came from: job board, referral, agency, sourcing campaign, career event, or inbound. Used for source-of-hire analytics and channel ROI.

#### talent_pools

- **Plural label:** Talent Pools · **Singular:** Talent Pool
- **Description:** Curated segment or pipeline of candidates kept warm for future roles (e.g. silver medallists, alumni, target-school grads, hard-to-fill skill clusters).
