# Hiring Starter blueprint review

- **Date:** 2026-11-02
- **Reviewed file:** [hiring-starter-semantic-blueprint.md](../../catalog/blueprints/hiring-starter-semantic-blueprint.md), git blob `7bae592` (uncommitted working-tree version). Line numbers (L...) refer to this version and will shift when the blueprint is regenerated, so each entry also names the rows.
- **Question asked:** is the document logical and self-contained?
- **Method:** the document was read on its own. It was not checked against the catalog, the generator or the blueprint template, so some entries may turn out to be template conventions. The "Status" notes come from `git diff`, `audits/ATS/history.md`, `audits/ATS/q-ATS.md` and `scripts/lib/blueprint_invariants.ts`.
- **Scope:** problems only. Root causes and fixes are the next step. No catalog row was changed.

## Summary

The document is **not yet logical or self-contained**: 71 problems, listed below. Many are likely to share a cause, so this is not 71 separate fixes.

| Severity | Meaning | Count | Bugs |
| --- | --- | ---: | --- |
| High | As written, the model cannot do what the document promises, or ordinary valid records cannot be saved. | 16 | bug-1 to bug-16 |
| Medium | The document contradicts itself, or a reader cannot resolve it without outside knowledge. | 38 | bug-17 to bug-54 |
| Low | Wording, naming or presentation. | 17 | bug-55 to bug-71 |

**What holds.** These cross-checks pass:

- The 9 entities match across sections 2, 3 and 6.4 and the diagram.
- The 16 diagram links match sections 5.1 and 5.2.
- The dashed diagram nodes match `install_optional`.
- The 7 gates match across sections 7, 8.1 and 9.1.
- The 4 personal-content entities match the 8 overrides and 4 rules.
- The frontmatter personas match the RACI actors.
- Every module named in section 6 is in `related_modules`.

**Reading note.** "Required" means `field_required = yes`. Under L101 that applies only when both entities are installed.

## High

### bug-1: A flagged background check cannot affect an accepted offer

Lines: L22, L158, L225, L302, L304.

The overview says the starter "reacts when a background check is flagged", and `job_offers is contingent on background_checks`. The handoff has no transition and no description, so the reaction is never stated. `accepted` is terminal and `rescinded` is defined as "after being sent", so a check that fails after acceptance has no state to move the offer to.

### bug-2: Leaving out optional requisitions removes the only hiring manager link

Lines: L14, L90, L127, L422, L424, L429.

`job_requisitions` is `install_optional`, and `users is hiring manager for job_requisitions` is the only link that identifies a hiring manager. Without it, the persona accountable for hires and offers has no place in the data.

### bug-3: Every application must have a posting

Lines: L109, L221, L193, L223, L224.

`job_postings is applied to via job_applications` is required. An application created by `talent_pool.candidate_activated` has no posting, and neither would one for a sourced, referred, agency or internal candidate that skips a posting.

### bug-4: Every candidate must have an agency once agencies are installed

Lines: L111, L140.

`recruitment_agencies sources candidates` is required, so a candidate who did not come through an agency cannot be saved. `recruitment_sources attributes candidates` was made optional for the same reason.

### bug-5: Every candidate must have a recruiting event once events are installed

Lines: L140, L141.

`recruitment_events attracts candidates` is required. With bug-4, a candidate would need both an agency and an event.

### bug-6: Every requisition must have a headcount plan once plans are installed

Lines: L145, L222.

`headcount_plans authorizes job_requisitions` is required, while the `employee.terminated` handoff says some orgs auto-open a backfill requisition without going through planning.

### bug-7: Every benefit enrollment must come from exactly one offer

Lines: L160.

`job_offers triggers benefit_enrollments` is one_to_one and required. An enrollment for an existing employee, or a yearly enrollment with no new offer, cannot be saved.

### bug-8: Every compensation statement must come from exactly one offer

Lines: L161, L210.

`job_offers seeds compensation_statements` is one_to_one and required, but L210 describes the offer as a baseline in "cycle history", so statements recur and most have no offer of their own.

### bug-9: Every employee must have been a candidate

Lines: L162.

`candidates becomes employees` is one_to_one and required. Employees who predate the system or joined through an acquisition cannot be saved.

### bug-10: Every data subject request must belong to a candidate

Lines: L181.

`candidates submits_via data_subject_requests` is required. A request from anyone who is not a candidate cannot be saved once that entity is installed.

### bug-11: Every scorecard must have a panel once panels are installed

Lines: L113, L148, L178.

`interview_panels produces interview_scorecards` is required, so a one-on-one interview without a panel cannot produce a scorecard.

Status: this row changed from `no` to `yes` in the uncommitted diff. q2 in `q-ATS.md` states that not every interview has a panel.

### bug-12: The model has no interviewer

Lines: L14, L31, L122, L178.

Interviews promise "one or more interviewers" and a "panel". Panels are external, the only people link on `interviews` is `coordinates`, and no interviewer persona exists. An interview in the starter cannot record who is interviewing.

### bug-13: Recruiters are not linked to the offers they draft

Lines: L124, L298, L363, L428.

`users approves job_offers` is the only people link on offers. The recruiter composes the offer and is Responsible for `draw_up_make_offer`, but under `offer_edit_scope` the only possible owner is the approver.

### bug-14: Accountable and responsible personas have no route to the rows they work on

Lines: L120 to L127, L347 to L354, L415 to L430.

Applications and candidates link only to a recruiter. The hiring manager (L422, L424, L429), sourcer (L417) and coordinator (L427) have no owner link on them, nothing extends row-scope through the requisition, and no RACI row grants a `view_all_*` or `manage_all_*` override.

### bug-15: The default Recruiting grant cancels gates and row-scope

Lines: L339, L385 to L398, L416, L419, L436.

Recruiting defaults to `:admin`, which includes every gate and override. Every recruiter, sourcer and coordinator could therefore approve requisitions and see all candidates, and the RACI gate grants to the Recruiting Manager add nothing.

### bug-16: A recruiter is required the moment a candidate applies

Lines: L121, L125, L284.

`users owns as recruiter job_applications` is required and `applied` is the initial state. A candidate applying on their own has no recruiter yet. The same owner link on `candidates` is optional, and the document gives no reason for the difference.

## Medium

### bug-17: Postings and applications are defined by an optional entity

Lines: L28, L32, L90, L284, L312, L316.

Both are described as existing "against a requisition", and a posting closes "because the requisition is filled or canceled". The document does not say what these mean when requisitions are not installed.

### bug-18: Requisition gates, process and handoffs have no stated behavior without requisitions

Lines: L206, L207, L215, L222, L226, L340, L341, L405, L415, L416.

Two gates, the `manage_employee_requisitions` process and five handoffs all depend on the optional entity.

### bug-19: The same gap applies to the other optional entities

Lines: L87, L92, L212, L213, L427.

Without scorecards, the coordinator's only notification (`interview_scorecard.submitted`) and a handoff have nothing to fire on. Without sources, `recruitment_source.attributed` has nothing to carry.

### bug-20: Every onboarding journey must come from exactly one offer

Lines: L159.

`job_offers spawns onboarding_journeys` is one_to_one and required, which rules out a journey for anyone onboarded without an offer in this system.

### bug-21: Similar candidate child records are required inconsistently

Lines: L165, L167, L187, L188, L189 to L193.

`candidate_notes` and `candidate_documents` require a candidate. `candidate_tag_assignments`, `candidate_emails`, `drug_health_screenings`, `right_to_work_verifications`, `agency_submissions`, `candidate_engagements` and `recruiter_interactions` do not, so a tag assignment can exist with no candidate.

Status: notes and documents changed from `no` to `yes` in the uncommitted diff.

### bug-22: People are required before their step happens

Lines: L120, L124, L126, L298, L312, L324.

A draft posting must already name its publisher, a draft offer its approver, and a draft requisition its recruiter.

### bug-23: Row-scope has no defined owner

Lines: L360 to L363.

All four rules say "Row-scope by default" without naming the link that defines the owner.

### bug-24: A candidate without a recruiter is visible to nobody below the override

Lines: L125, L347, L348, L360.

The recruiter link is optional, and row-scope applies by default. Nothing says who can reach an unowned candidate.

### bug-25: `:read` conflicts with row-scope

Lines: L337, L347, L360, L439.

`:read` promises "every entity", while the overrides imply that seeing all rows needs more. The document does not say whether viewers, including the default Finance grant, see personal rows.

### bug-26: Three gates are held only through `:admin`

Lines: L253, L304, L328, L341, L344, L346.

No RACI row grants `close_requisition`, `flag_do_not_hire` or `rescind_offer`. Marking a requisition filled is a routine step, yet it needs admin.

Status: the document flags these with `⚠ no process`.

### bug-27: Legal gets edit rights it has no process for

Lines: L338, L423, L438.

Legal defaults to `:manage`, while its only RACI row is Informed on `hire_candidate`.

### bug-28: A consumer entity has a write tier

Lines: L93, L338.

`users` is a `consumer` and a platform built-in, but it carries write tier `:manage`. That reads as if the module's managers can edit users.

### bug-29: Interviews are not personal content

Lines: L31, L88.

Interviews carry the candidate, panel and outcome, but unlike scorecards and applications they are not row-scoped.

### bug-30: Benefits and onboarding are triggered from different records in sections 5 and 6

Lines: L159, L160, L211, L214.

Section 5.3b links both to `job_offers`. Section 6.2 triggers both from `candidate.hired` with payload `candidates`.

Status: q31 in `q-ATS.md` is open for the benefits half.

### bug-31: The onboarding handoff expects context its payload does not have

Lines: L33, L214.

The description relies on "role/location/manager context from ATS payload", but the payload is `candidates`. The document places those details on the optional requisition.

### bug-32: `archived` candidates can never come back

Lines: L223, L254.

`archived` is terminal, although the record is "kept in the database" and talent pool activation exists to re-engage past candidates.

### bug-33: `hired` candidates are terminal despite other applications and reapplying

Lines: L110, L150, L252.

A candidate can hold several applications, and employees can apply as candidates, yet `hired` is terminal on the person.

### bug-34: Offers have no outcome for approver refusal or no reply

Lines: L299 to L304.

There is no state for an approver who says no or for a sent offer that gets no answer. A return to `draft` may be intended, but the document has no transitions to show it (bug-44).

### bug-35: Talent pool membership is modeled twice

Lines: L131, L142, L169.

`talent_pools groups candidates` is many_to_many, which per L131 proposes a new junction table, while `talent_pool_memberships` is already that junction.

### bug-36: Candidates and employees point at each other

Lines: L150, L162.

`employees applies_as candidates` and `candidates becomes employees` form a cycle. For an internal applicant, "becomes" is also untrue, since the person already is an employee.

### bug-37: Requisitions and demand forecasts have two links

Lines: L143, L146.

`job_requisitions updates position_demand_forecasts` is many_to_many, and `position_demand_forecasts triggers job_requisitions` is one_to_many. The document does not explain why both exist.

### bug-38: A metric feed is proposed as a junction table

Lines: L131, L144.

`job_requisitions feeds people_kpis` is many_to_many, so per L131 installing it proposes a new junction table for what reads as a reporting feed.

### bug-39: Redundant paths can disagree

Lines: L108, L109, L113, L148, L178.

An application links to a requisition and to a posting of a requisition. A scorecard links to an interview and to a panel of an interview. No rule says the two paths must agree.

### bug-40: EEO responses and voluntary self-identifications look like the same record

Lines: L177, L182.

`self_identifies_via eeo_responses` and `self_ids_via voluntary_self_identifications` are not distinguished anywhere in the document.

### bug-41: Recruiter interactions and candidate notes look like the same record

Lines: L167, L188.

Status: q26 in `q-ATS.md` is open.

### bug-42: Section 6 shows states that do not exist on the record beside them

Lines: L222, L223, L226, L278 to L290, L318 to L329.

`hot` appears beside `job_applications`, and `draft → approved` and `terminated` beside `job_requisitions`. None of these is a state of that record. They belong to the event's own entity, which has no column.

Status: `history.md` (2026-11-02) records this display problem as left as is.

### bug-43: "The gated entities' write tier" cannot be resolved

Lines: L403 to L409, L415, L417, L425.

The process table has no entity column, so the phrase points at nothing. On L425 it is used for a process with no gate at all.

Status: the L425 wording comes from the q32 generator change made today.

### bug-44: Lifecycles have no transitions

Lines: L242 to L329.

Section 7 gives ordered states and terminal flags, but not the allowed moves, such as where `on_hold` or `paused` can return to or which states can be rescinded.

### bug-45: The section 5.3 headings read backwards

Lines: L133, L137, L143, L152, L156.

"Outgoing" rows mostly start at the external entity, and "Incoming" rows start at this blueprint's entity. That is correct only if "points to" means "holds the foreign key", which the document does not say.

### bug-46: External entities name no owning module

Lines: L137 to L150, L156 to L193.

There are 52 external links with no module column, so a reader cannot tell where `skill_profiles`, `people_kpis` or `job_profiles` live.

### bug-47: Key terms are undefined

Lines: L22, L85, L105, L205, L206, L209, L212, L248, L341.

No legend covers `embedded_master`, "demotion path", `owner_side`, `fk_format`, `⚠ no process`, `high risk?`, `lifecycle_progression`, or the `lifecycle`, `state_change` and `signal` labels.

### bug-48: Personas do not map to baseline roles

Lines: L14, L373 to L377, L415 to L430.

The document never says which of the viewer, manager or admin roles a persona holds.

### bug-49: Five handoffs have no description

Lines: L209, L213, L223, L224, L225.

### bug-50: Applications promise a source that has no link

Lines: L28, L111.

The description lists "source", but `recruitment_sources` links only to `candidates`.

Status: `history.md` records this as finding 1.7, still open.

### bug-51: Offers promise an approval chain the starter does not include

Lines: L34, L124, L180.

The description lists an "approval chain", but `offer_approvals` is external and the starter has a single approver link.

### bug-52: Applications promise stages and history kept outside the starter

Lines: L28, L171, L172.

"Pipeline stage" and "full evaluation history" are described, but `application_stages` and `application_stage_transitions` are external.

### bug-53: Candidates promise records kept outside the starter

Lines: L29, L168, L187, L189.

"Resume, tags, consent" match `candidate_documents`, `candidate_tag_assignments` and `candidate_consents`, all external. These may be meant as plain fields, but the document does not say.

### bug-54: The upgrade path is not explained

Lines: L22, L340 to L354.

The overview relies on "the embedded-master demotion path" without describing it or saying what happens to the `hiring-starter:*` gates, overrides and role grants after an upgrade.

## Low

### bug-55: One availability slot per interview conflicts with several interviewers

Lines: L31, L149.

`interviewer_availability_slots booked_for interviews` is one_to_one.

### bug-56: Scorecards promise a rubric that is not in the starter

Lines: L30, L147.

The closest entity, `interview_kits`, is external.

### bug-57: "Approved requests to hire" includes unapproved states

Lines: L33, L324, L325.

Requisitions start as `draft` and `pending_approval`.

### bug-58: "Leaves out the requisition approval chain" reads as false

Lines: L22, L325, L326.

The starter still has `pending_approval` and the `approve_requisition` gate. The sentence holds only if "chain" means multi-step approval, which the document does not explain.

Status: the wording was chosen deliberately (`history.md`, 2026-11-02).

### bug-59: Two different data claims for the upgrade

Lines: L7, L22.

"Your data moves with you" conflicts with "without tenant data migration".

### bug-60: The tagline overclaims

Lines: L6, L14, L22.

"Everything a small team needs" and "lightweight" sit beside a list of what is left out, six personas and seven gates.

### bug-61: `related_modules` omits the pre-employee module

Lines: L13, L22, L163, L164.

`pre_employees` is linked and named in the overview, and `ats-pre-employee-record` has a blueprint in the catalog, but it is not listed.

### bug-62: "Signed offer" refers to a state that does not exist

Lines: L210, L296 to L304.

Status: `history.md` (2026-11-02) records this as left as is.

### bug-63: `headcount.approved` means a requisition opened

Lines: L206, L226.

The name sits confusingly beside `headcount_plan.approved`.

Status: `history.md` (2026-11-02) records this as left as is.

### bug-64: Event names use inconsistent prefixes

Lines: L207, L208, L209.

`requisition.filled` sits beside `job_offer.accepted` and `job_application.rejected`.

### bug-65: Transitions are blank where the state exists

Lines: L208, L209, L213, L263, L289.

`job_application.rejected` and `interview_scorecard.submitted` show no state, while `job_offer.accepted` shows `accepted`.

### bug-66: Sections 9.1 and 9.2 use different role names

Lines: L375, L376, L437, L439.

Section 9.2 says `manage` and `read`, and section 9.1 says `_manager` and `_viewer`.

Status: `scripts/lib/blueprint_invariants.ts:115` treats these as aliases, but a reader of the document cannot know that.

### bug-67: The `high risk?` column is blank on every state

Lines: L248 to L329.

A reader cannot tell "not high risk" from "not assessed", including for approving and rescinding offers.

Status: q9 in `q-ATS.md` is open.

### bug-68: The section 6.1 sentence does not make sense

Lines: L199.

"No other module embeds this scope's masters; the canonical owners do" says owners embed, but owners master, and this scope masters nothing.

### bug-69: Verb styles are mixed

Lines: L149, L156, L182.

Natural-language verbs such as "is referred through" sit beside snake_case verbs such as `self_ids_via` and `booked_for`.

### bug-70: Processes are out of order

Lines: L405 to L409.

The order is 7.2.1, 7.2.2, 7.2.4.3, 7.2.3.2, 7.2.4.1, so hiring appears before interviewing and making an offer.

### bug-71: Published process descriptions contain poor text

Lines: L408, L409.

"Comprehend his/her personal and professional lives" is a questionable aim for a hiring interview, and "to make up a job" is garbled.
