# Hiring Starter blueprint review

- **Date:** 2026-11-03
- **Reviewed file:** [hiring-starter-semantic-blueprint.md](../../catalog/blueprints/hiring-starter-semantic-blueprint.md), blob `850cb92` (uncommitted). L numbers refer to this blob, and to other blueprints only where named.
- **Question asked:** is the document logical and self-contained?
- **What this is:** a snapshot of what is open today. It lists no solved or ruled-out entries; for those, see the [2026-11-02 report](hiring-starter-blueprint-review-2026-11-02.md). Bug numbers are stable IDs, so they have gaps.
- **Method:** one pass over the whole document. Every relationship and state it shows was re-read from the live catalog, and every rule cited here was re-read in the current skills. No catalog row changed.
- **Scope:** sections 6.1 to 6.3 are postponed and not reviewed: see [Postponed sections 6.1 to 6.3](#postponed-sections-61-to-63).

## Summary

**32 bugs are open: 10 High, 8 Medium and 14 Low.** They come down to 10 kinds of fix. Anything that contradicts itself or breaks something is rated High.

**The most serious problem is bug-14.** Under `raci` with the default row-scope rule, once a recruiter is recorded on a row, the persona who holds the hire gate cannot edit it, and the persona who can edit it does not hold the gate. From then on, normally only an admin can complete the hire.

The document is not fully logical, because of the bugs below. It is also not self-contained, and that part is by design: the format relies on the template and the deploy skills to define its terms.

| Severity | Meaning | Count | Bugs |
| --- | --- | ---: | --- |
| High | The document contradicts itself, or something breaks in normal use or at deploy | 10 | 1, 2, 12, 14, 17, 22, 32, 51, 52, 72 |
| Medium | No contradiction; breaks only under a condition, or not yet proven | 8 | 4, 5, 6, 8, 18, 26, 73, 74 |
| Low | Minor gaps, judgment calls and values with little effect | 14 | 7, 9, 11, 19, 20, 21, 29, 34, 38, 41, 47, 75, 76, 77 |

**Reading `field_required` in section 5.3:** at deploy it is only a prompt that defaults to optional (A2:208). So the too-strong values below are wrong data, not failed saves, in this starter. Sections 5.1 and 5.2 are different: there the value applies (tmpl:197) and the platform enforces it (M1:162).

**What holds:**

- The file matches the live catalog: the drift check reports `unchanged`.
- The 9 entities match across sections 2, 3 and 6.4 and the diagram.
- The 18 diagram relationships match sections 5.1 and 5.2.
- The dashed diagram nodes match `install_optional`.
- The 7 gates match across sections 7, 8.1 and 9.1.
- The 4 personal-content entities match the 8 overrides and 4 rules.
- The frontmatter personas match the RACI actors.

**Checks run today:**

| Check | Result |
| --- | --- |
| `generate_blueprints.ts --module HIRING-STARTER --check` | Unchanged |
| `generate_blueprints.ts --lint --module HIRING-STARTER` (R1 to R8) | 0 findings. R6 has no rows to check while section 6 is postponed |
| Architect `consistency-check.ts` | Consistent, with one warning: the frontmatter has no `access_scope` |
| `domain_health.ts --domain ATS --json` (not recorded) | 32 pass, 13 warn, 4 fail, 10 agent, 2 delegated, 2 skipped. No fail names HIRING-STARTER. B7c, the check for bug-14, reports "not checked" |

**Accepted by the owner, so not bugs (hist:791):** without requisitions, an application can be saved with no job relationship (rel 809 stays optional). A candidate's source and an application's source are separate facts (rels 812 and 2740).

## Open bugs by kind of fix

| Type | Bugs | Count |
| --- | --- | ---: |
| **Recurring:** too few relationships to `users` | 12 | 1 |
| **Recurring:** row-scope reaches only one person | 14, 72 | 2 |
| **Recurring:** reversible or mid-life states marked terminal | 1, 32, 34 | 3 |
| **Recurring:** subsets lose what the full module provides | 2, 17, 51, 52 | 4 |
| **Recurring:** gates with no process | 26 | 1 |
| **Recurring:** later actor required on a draft | 22 | 1 |
| **Recurring:** RACI rows that do not match the work | 73, 76 | 2 |
| **Old data:** too-strong values on external relationships | 4, 5, 6, 7, 8, 9, 11, 20, 75 | 9 |
| **One-off:** single values, wording or judgment calls | 21, 29, 38, 41, 74 | 5 |
| **Not data:** skill and template rules | 18, 19, 47, 77 | 4 |

### Details

**Bold** bugs are High.

| Type | Kind of fix | Bugs | What changes | Evidence across the catalog | Breaks something? |
| --- | --- | --- | --- | --- | --- |
| **Recurring** | Relationships to `users` | **12** | A new relationship to `users`, or carrying `interview_panels` in the starter | B7 passes at one relationship (SKILL:1062). 219 of 787 workflow entities have 2+ gates and at most one relationship to `users` | Yes |
| **Recurring** | Row-scope reach | **14**, **72** | `specification_requirements` text, override grants and `persona_id` on four relationships | B7c is built for this (SKILL:1070-1076) but cannot run: 0 of 1,040 relationships to `users` have `persona_id`. R8 passes once any one relationship is single-person. 27 of 206 row-scoped entities have 2+ relationships to `users` | Yes |
| **Recurring** | Terminal states | **1**, **32**, 34 | `accepted` (228) and `archived` (208) need a way out or a new state; an offer abandoned before sending needs an end state | The only check is for at least one terminal state (SKILL:1205). 78 terminal states are named exactly `archived` or `accepted`, in 46 domains | Yes: 1, 32. No: 34 |
| **Recurring** | Subsets | **2**, **17**, **51**, **52** | Neutral catalog descriptions (17, 51, 52); a new relationship, or a required requisition (2) | One description per entity, and Rule #19's invariants do not test whether a subset works alone (SKILL:483). 8 of 52 starter entity rows name a related entity outside the starter, by a rough label match that misses phrases like "approval chain" | Yes: 2. No: 17, 51, 52 |
| **Recurring** | Gates with no process | 26 | A process for states 207, 230, 240, or a decision that they stay admin-only | E4b only warns (SKILL:1281). 925 of 1,110 gates in 84 domains have no process | Conditional |
| **Recurring** | Required too early | **22** | `is_required` on rels 821, 825, 1344 | The definition does not ask whether the person is known at first save (`module-shape.md:308`). 8 candidates in 5 domains: a required relationship to `users`, on an entity starting at `draft`, with a verb naming a later actor | Yes |
| **Recurring** | RACI against the work | 73, 76 | `process_raci` rows on processes 1014 and 219 | No check compares a persona's RACI rows with its description. 11 of 84 personas with RACI rows have no Responsible or Accountable row anywhere, so they get no write grant | Conditional: 73. No: 76 |
| **Old data** | Too-strong values | 4, 5, 6, 7, 8, 9, 11, 20, 75 | `is_required` on rels 813, 814, 1022, 828, 829, 830, 1326, 827, 1314; cardinality on 827, 828, 829 | No check tests whether these values are true: M9 reads them on 813, 814, 1022 and 1326, but asks only whether the module should carry the other entity. 35 of 289 cross-domain reference relationships were required. That counts required rows, not wrong ones, and it covers only 5 of these 9 rows, because 813, 814, 1314 and 1326 are ATS to ATS. Judged from labels, every too-strong cross-domain row has an ID of 1435 or lower, and the 8 newest required ones look right. Of the 8 `one_to_one` relationships touching this starter, 4 are wrong (827, 828, 829, 1325); the catalog's 125 are unreviewed | Conditional: 4, 5, 6, 8, 11, 75. No: 7, 9, 20 |
| One-off | Single values and decisions | 21, 29, 38, 41, 74 | `is_required` on rel 1497 (21); cardinality on 832 (38) and 1325 (74); the q26 merge (41); a decision on personal content (29) | Single rows or decisions | Conditional: 38, 74. No: 21, 29, 41 |
| Not data | Skill and template rules | 18, 19, 47, 77 | Say what happens to gates and processes when an optional entity is left out; define two terms; say which RACI row carries an override | - | Unproven: 18, 77. No: 19, 47 |

- **Recurring** means the skill gap recurs. Each bug's row is still a one-off fix in the data, but new domains can get the same problem until the skill changes. Subsets recur per new starter or optional entity, not per domain.
- **Old data** means the values date from before the definition had a test, not from a gap that still produces them. Seven of the nine rows were already required in the oldest source found; rel 1326 was set by the 2026-11-02 cleanup, and rel 1022 could not be traced that far. Each row is a one-off fix.
- **Bugs 1, 2, 12, 14, 32, 34 and 72 need your decision** before any row is drafted, because each changes a lifecycle, a relationship or an access rule.
- **Subsets** has a catch: the wording in bugs 17, 51 and 52 is true for the full modules but false for the starter. The description is shared and there is no per-module text field, so a fix means neutral wording for every module.
- **The catalog figures** come from a read-only count on today's catalog, using the definitions shown. Figures based on state names, verbs or description text are candidates, not confirmed bugs.

## What breaks

This table sets the fix order. 7 bugs break something, 10 break only under a condition, 2 are unproven, and 13 are simply wrong or inconsistent. Of the 10 High bugs, 7 break something and 3 are wording only (17, 51, 52).

| Bug | Severity | Breaks something | What breaks |
| --- | --- | --- | --- |
| bug-14 | High | Yes | With the default row-scope rule, the gate holder cannot edit a row that has a recruiter. Fully under `raci`. |
| bug-72 | High | Yes | With a one-owner rule, either the approver cannot see the offer or the recruiter cannot see their draft. |
| bug-22 | High | Yes | A draft is rejected until its publisher, approver or recruiter is set. |
| bug-12 | High | Yes | An interview cannot record who is interviewing. |
| bug-1 | High | Yes | A check flagged after acceptance has no state to move the offer to. |
| bug-32 | High | Yes | A new application for an archived candidate is open while the candidate stays archived. |
| bug-2 | High | Yes | Without requisitions, a job's hiring manager cannot be named. |
| bug-17 | High | No | Wording only. |
| bug-51 | High | No | Description text only. |
| bug-52 | High | No | Description text only. |
| bug-73 | Medium | Conditional | Only under `raci`: the interview coordinator gets no grant in this module. |
| bug-74 | Medium | Conditional | Only where rel 1325 is applied, as in ATS-INTERVIEWS: a second interviewer on an interview is rejected. It also blocks a fix for bug-12. |
| bug-26 | Medium | Conditional | Only under `raci`: no Accountable can hold these gates. |
| bug-4 | Medium | Conditional | Not in the starter unless chosen at install. Applied in ATS-CANDIDATE-CRM. |
| bug-5 | Medium | Conditional | Not in the starter unless chosen at install. Applied in ATS-CANDIDATE-CRM. |
| bug-6 | Medium | Conditional | Only if someone makes the relationship mandatory at install. The platform then rejects a requisition without a plan. |
| bug-8 | Medium | Conditional | Only where the relationship is applied, as in COMP-STATEMENTS. |
| bug-18 | Medium | Unproven | Section 9 may still name a dropped requisition entity. No deploy test. |
| bug-75 | Low | Conditional | Only where rel 1314 is applied, as in ATS-RECRUITMENT-PIPELINE: a template stage is rejected. |
| bug-11 | Low | Conditional | Only if someone makes the relationship mandatory at install. |
| bug-38 | Low | Conditional | Only if `people_kpis` exists. A junction table is then proposed. |
| bug-77 | Low | Unproven | The bug-14 workaround could be lost at deploy. No deploy test. |
| bug-7 | Low | No | Prompt only, and no module carries both ends. |
| bug-9 | Low | No | The analyst docs never apply this value. |
| bug-19 | Low | No | Idle rows only. |
| bug-20 | Low | No | Prompt only, and no module carries both ends. |
| bug-21 | Low | No | `no` only skips a prompt here. |
| bug-29 | Low | No | A judgment call. |
| bug-34 | Low | No | An offer abandoned before sending simply stays open. |
| bug-41 | Low | No | Two optional external rows. |
| bug-47 | Low | No | Reader inconvenience only. |
| bug-76 | Low | No | The persona still gets `:manage` from its other rows. |

## Postponed sections 6.1 to 6.3

Sections 6.1, 6.2 and 6.3 are postponed, so handoffs are outside this review. The generator shows these sections as if they had no data; the switch is `POSTPONE_SECTIONS_6_1_TO_6_3` in [generate_blueprints.ts](../../scripts/generate_blueprints.ts). The handoff data needs its own review before the sections return.

Only the rows those sections show are absent. The catalog still loads in full, so `related_modules` and section 6.4 are complete. Rendered in memory with the switch off, the sections hold 11 outbound and 6 inbound handoffs. Section 6.1 is empty either way, because the starter masters nothing.

**Gaps while the sections are empty:**

- **Placeholders:** L211 and L215 say there are no handoffs. There are 17.
- **Overview claims:** the overview says the starter reacts when a background check is flagged and that an accepted offer hands the new hire to HCM (L22). No row in section 6 backs either, and lint does not catch it. The text is the module's catalog description.
- **`hcm-lifecycle-workflows`:** it is in `related_modules` (L13) with nothing in the document showing why. The other 14 related modules are explained by section 5.3 or 6.4.

**Effect at deploy:** the modeler wires no handoffs, with or without these rows. Stage 4m wires one only if the platform has a trigger registry (M4:479), and `transition_event_triggers` does not exist on this host. So no live behavior depends on them. Also absent while the sections are empty:

- the parse-time state check on these rows (A2:214, M1:98);
- the copy of the handoffs in the spec, which documents the intent (A2:216);
- the relationships the analyst implies from these rows (A2:170). The effect on the starter was not measured.

**Scope of the switch:** it applies to every CLI build. Only the Hiring Starter file has been built with it. `--regenerate --check` reports that 54 of 55 blueprints would change, so `--regenerate` and `build_catalog.ts` would empty these sections in all of them.

## Open bugs

Every **Fix** is a proposal. Overwriting a value needs per-row approval, and a data model decision needs yours first.

Citation keys:

- **L:** line in blob `850cb92`, unless another blueprint is named.
- **rel:** live `data_object_relationships` id. **State numbers** are live `data_object_lifecycle_states` ids.
- **tmpl, audit:** architect `semantic-blueprint-template.md`, `audit-checklist.md`.
- **A2, A3, A7, A9, A10:** analyst `stage-2-inspect`, `stage-3-collisions`, `stage-7-select-rule`, `stage-9-governance`, `stage-10-rules`.
- **M1, M4:** modeler `stage-1-parse`, `stage-4-execute`.
- **SKILL:** `domain-map-analyst/SKILL.md`.
- **hist, q:** `audits/ATS/history.md`, `q-ATS.md`.
- **plan:** `plans/blueprint-external-relationships-plan.md`.

## High

### bug-14: Most personas have no route to the rows they work on

The default rule admits the owner or a `view_all` holder (A7:15), plus rows with no owner for `:manage` holders (A7:21). Editing follows the same shape: owner or `manage_all` (A10:97). Overrides roll up to admin only (L381-388), and RACI grants the write tier and gates, not row access (M4:412-415). `:read` does not widen a row-scope rule (A7:19).

What each persona reaches under `raci` with the default rule, for a user not recorded as the recruiter:

| Persona | RACI rows | Candidates | Applications | Scorecards | Offers |
| --- | --- | --- | --- | --- | --- |
| RECRUITING-RECRUITER | R on 4, C on 1 | Own | Own | Authored only | Own |
| RECRUITING-SOURCER | R on 1 | No owner only | No owner only | Authored only | No owner only |
| RECRUITING-MANAGER | A on 3, C on 1 | No owner only | No owner only | Authored only | No owner only |
| HIRING-MANAGER | A on 2, R on 1, I on 1 | All, read only (L85) | No owner only | Authored only | No owner only; approver rows only if the rule includes rel 825 (bug-72) |
| RECRUITING-COORDINATOR | I on 1 | None | None | None | None |
| LEGAL-COMPLIANCE-SPECIALIST | I on 1 | None | None | None | None |

**The hire step:** the manager holds `hire_candidate` (L411) but cannot edit a candidate or application that has a recruiter, because L85 grants read only and applications are not covered at all. The recruiter can edit it but holds no gate (M4:412). So once a recruiter is recorded, only an admin, or a manager who is that recruiter, can move the row to `hired`.

**Fix (your decision):**

1. Extend the Additional Requirements (L85). For example, give the hiring manager `manage_all_candidates` and `manage_all_applications`, and the recruiting manager the `view_all` overrides.
2. A rule that looks up the hiring manager through the requisition is possible but discouraged for performance (`select-rule.md:54`), and requisitions are optional.
3. Whichever you choose, set `persona_id` so B7c can run: rels 822, 1343 and 2880 to RECRUITING-RECRUITER, rel 825 to HIRING-MANAGER.

### bug-72: Offers name two people, and nothing says who owns the row

Offers have rel 825 `approves` (L131) and rel 2880 `owns as recruiter` (L135). `offer_edit_scope` says "row-scope by default" with no owner named (L352), the analyst decides (A7:13), and R8 passes as soon as either relationship is single-person.

**Contradiction:** a one-owner rule cannot be right here. If the recruiter owns the row, the approver holding `approve_offer` (L418) cannot see the offer waiting on them. If the approver owns it, the recruiter cannot see their own draft (L287).

**Fix:** say in the Additional Requirements (L85) that both people can see and edit the row. The platform supports a two-person rule (`select-rule.md:74-75`).

### bug-22: Records require people before their step happens

Rels 821 (L127), 825 (L131) and 1344 (L133) apply as required (tmpl:197, M1:162), while L287, L301 and L313 describe drafts. A manager drafting a requisition must name a recruiter, and a draft posting must name its publisher. On offers it is inverted: the recruiter who drafts is optional (L135), and the approver who comes later is required (L131).

**Contradiction:** a posting, offer or requisition starts as a draft, but its publisher, approver or recruiter is already required.

**Fix:** set `is_required` to false on the three rows. If the person must be known at the gate, say so in the Additional Requirements, so the analyst can author a required-when rule (A10 F4).

### bug-12: An interview cannot record its interviewers

Rel 823 `coordinates` (L129) is the only relationship to `users` on interviews, though L31 promises one or more interviewers and a panel. Panelists sit on `interview_panels` (rel 2003), which is external (L185). The scorecard author (rel 824, L130) comes later and is optional in the starter (L93).

**Contradiction:** interviews have one or more interviewers, but the only relationship to `users` on an interview is `coordinates`.

**Fix (your decision):** carry `interview_panels` in the starter, which needs bug-74 fixed first, or add a single interviewer relationship.

### bug-1: A flagged background check cannot affect an accepted offer

`accepted` is terminal (L291, tmpl:302), so it has no moves out and Stage 10 proposes locking the row (A10:99). Yet the overview says the starter reacts when a check is flagged (L22), and the hidden inbound handoff says a flagged check "may force offer rescission". Option c of q:142 says screening is ordered when an offer is accepted.

**Contradiction:** the starter reacts when a check is flagged, but `accepted` leaves no way to `rescinded`.

**Fix (your decision):** make `accepted` non-terminal with a move to `rescinded`, add a later state such as `completed`, or remove the claim from the overview.

### bug-32: `archived` candidates can never come back

State 208 is terminal, with no moves out (L243, tmpl:302, A10:99). Nothing stops a new application for an archived candidate, which is then open while the candidate stays archived, against L240.

**Contradiction:** an active candidate has an open application, but `archived` is terminal and an archived candidate can still get an application.

**Fix (your decision):** make `archived` non-terminal with a move back to `active`, or block new applications for archived candidates.

### bug-2: Without requisitions, nothing names a job's hiring manager

Rel 2739 is the only hiring manager relationship (L134), and requisitions are optional (L96). Gates come through grants (A9:74), and the manager can still be the offer approver (L131). What is lost is the name on the job, not a process.

**Fix (your decision):** add a hiring manager relationship on `job_postings`, or make requisitions required in the starter.

### bug-17: Postings and applications are described against a requisition, which is optional

L28 and L32 describe both against a requisition, as do the state descriptions at L273, L301 and L305. Text only: the canonical description is deployed verbatim, and nothing fails.

**Contradiction:** postings and applications exist against a requisition, but requisitions are optional.

**Fix:** neutral catalog wording, such as "a job" instead of "a requisition".

### bug-51: The offer description mentions an approval chain the starter does not include

L34 says offers carry an approval chain. The starter has one approver (L131), and `offer_approvals` is external (L188). Deployed text is wrong; nothing fails.

**Contradiction:** offers have an approval chain, but there is one approver relationship and the chain is outside the starter.

**Fix:** neutral catalog wording, such as "approval".

### bug-52: The application description overclaims "full evaluation history"

Pipeline stage is met by section 7 (L273-279). Only "full evaluation history" (L28) overclaims, because stage history is external (rel 1315, L179).

**Contradiction:** applications have full evaluation history, but the stage history is outside the starter.

**Fix:** neutral catalog wording. Open question q2 would also resolve it, by carrying the stage history (q:28).

## Medium

### bug-73: The interview coordinator gets no grant

RECRUITING-COORDINATOR's only row here is `informed` (L416), and Informed gets no role grant (M4:417). So under `raci` the persona has no read or write in this module. Yet the catalog describes it as owning interview logistics and scheduling panels, and rel 823 `coordinates` is required on every interview (L129). The event it is told about is on scorecards it cannot read. A tenant can work around this by also giving those users `hiring-starter_manager`.

**Fix:** make the persona `responsible` on process 1014 (`interview_candidates`), which grants the write tier (M4:414).

### bug-74: A panel is a junction, but each interview can have only one panel row

`interview_panels` is a `junction`, and in ATS-INTERVIEWS its summary reads "Interviewers assigned to a specific interview" (`ats-interviews` L31, L93). Each row holds one person (rel 2003, `users sits on`, one_to_many), but rel 1325 is `one_to_one` (L185), and a 1:1 field deploys as unique (M4:348). So where it applies, an interview can have one interviewer.

**Fix:** set rel 1325 to `one_to_many`. This also needs doing before bug-12 can use panels.

### bug-26: Three gates have no process: `close_requisition`, `flag_do_not_hire`, `rescind_offer`

States 240 (L317), 207 (L242) and 230 (L293) are gated with no process, and E4b warns today. There is no issue under `gated`. Under `raci`, no Accountable can hold them (audit:22), so they stay with the admin (L375, L378, L380). The document flags this (L330, L333, L335), but nobody has decided.

**Fix (your decision):** wire each state to a process, or accept that these gates are admin-only.

### bug-18: Nothing says what happens to requisition gates and process when requisitions are left out

A dropped entity is "skipped from all later stages" (A3:51), yet section 9 carries "verbatim" (A9:99). Fast flow drops optionals (A3:13). The whole of `manage_employee_requisitions` hangs on state 238, so leaving requisitions out strands two gates (L329-330) and two RACI rows (L404-405). The consequence is unproven: the test deploy was skipped (plan:5).

**Fix:** state the rule in analyst Stage 9, and test it with a deploy.

### bug-4, bug-5, bug-6, bug-8: Required values that are too strong

All four are prompts only in the starter (A2:208).

| Bug | Row | Line | Why the value is wrong | Where it bites | Fix |
| --- | --- | --- | --- | --- | --- |
| bug-4 | Rel 813, `recruitment_agencies sources candidates` | L148 | Not every candidate has an agency | ATS-CANDIDATE-CRM carries both ends | `is_required` false |
| bug-5 | Rel 814, `recruitment_events attracts candidates` | L149 | Not every candidate comes from an event | ATS-CANDIDATE-CRM carries both ends | `is_required` false |
| bug-6 | Rel 1022, `headcount_plans authorizes job_requisitions` | L153 | A catalog handoff says some organizations auto-open backfills | SWP-DEMAND-FORECAST carries both ends | `is_required` false |
| bug-8 | Rel 829, `job_offers seeds compensation_statements` | L168 | Statements recur "on hire, merit cycle close, and annually", per the entity description | COMP-STATEMENTS carries both ends | `is_required` false, `one_to_many` |

## Low

| Bug | Problem | Evidence | Fix |
| --- | --- | --- | --- |
| bug-7 | `job_offers triggers benefit_enrollments` is one_to_one and required, which is false | Rel 828, L167. Enrollment is per employee per plan. No module carries both ends | `is_required` false, `one_to_many` |
| bug-9 | `candidates becomes employees` is required, which is too strong | Rel 830, L169. The analyst docs cite this exact row and never apply it (A2:208, plan:56). The value stays by decision (plan:253) | Revisit when plan:253 is taken up |
| bug-11 | `interview_panels produces interview_scorecards` is required | Rel 1326, L156. One interviewer is a panel of one. q2 needs rewriting before anyone answers it (hist:755) | Rewrite and answer q2 |
| bug-19 | Leaving out scorecards idles a whole process | State 210 (L252) is the only state on `interview_candidates`, so its four RACI rows go idle (L413-416) and the coordinator has no row left. The event simply does not fire. Same root as bug-18 | Same rule as bug-18 |
| bug-20 | `job_offers spawns onboarding_journeys` is one_to_one and required, which is false | Rel 827, L166. Journeys also start from `employee.created`. No module carries both ends | `is_required` false, `one_to_many` |
| bug-21 | The candidate tag junction has an optional leg | Rel 1497, L197. All 314 composition relationships are required; notes and documents are composition (L195-196), tags a reference | `is_required` true on rel 1497 |
| bug-29 | Whether interviews are personal content is a judgment call | L94 says no. The flag means owner-scoped rows (SKILL:243), and tmpl:141 says "personal data". B4 did not propose it (hist:678) | Your decision |
| bug-34 | An offer abandoned before sending has no terminal state | L287-293. Refusal can return to `draft`, and a sent offer with no reply can be rescinded | Add an end state such as `withdrawn` (your decision) |
| bug-38 | `job_requisitions feeds people_kpis` is the only many_to_many KPI relationship | Rel 832, L152: 1 of 7 on a computed entity. Only proposed when that entity exists (A2:211) | `one_to_many`, or drop the row |
| bug-41 | Recruiter interactions and candidate notes duplicate each other | L174, L196. q26 was answered as a merge but not applied (hist:754), and `a26:` is blank (q:169) | Apply the q26 merge |
| bug-47 | Two terms have no definition: `⚠ no process`, "demotion path" | L330, L22. Neither appears in the template | Define both in the template |
| bug-75 | `job_requisitions defines_pipeline application_stages` is required, but stages can be templates | Rel 1314, L178. The live description says "per-requisition or per-template". Applied in `ats-recruitment-pipeline` L195 | `is_required` false |
| bug-76 | The hiring manager drafts requisitions but has no row on that process | L313, and the persona "defines the req", but L404-405 omit it. It still gets `:manage` from its other rows | Add a row on process 219, or reword state 236 |
| bug-77 | The bug-14 workaround lands on an Informed row | A9:69 appends the override to the persona's first RACI row, which is `informed` here (L409). M4:415 grants it, but M4:417 says Informed gets no role grant | In A9:69, name the first Responsible or Accountable row |

## Limits of this review

- **One pass.** One reviewer read the document and checked each finding against the primary sources. No independent second pass tried to disprove the findings, so bugs 72 to 77 have had less scrutiny than the rest.
- **No deploy test.** Bugs 18 and 77 come from skill text, not observed behavior. The plan says the test deploy was skipped (plan:5).
- **Access level is unknown.** The blueprint has no `access_scope`. Bugs 14 and 72 apply from `advanced` up, where the row-scope rule runs (A7:9). Bugs 26 and 73 apply only under `raci`.
- **Row-scope bugs assume the analyst's default shape.** Bugs 14 and 72 assume A7's owner-plus-oversight rule. An analyst could author a broader rule, but nothing in the document asks for one.
- **Modeling judgments are bounded.** Bugs 1, 29, 32, 34 and 74 rest on catalog text and skill rules, not a check of vendor products.
- **Catalog counts are today's and catalog-wide.** They use the definitions stated above, so they are not comparable with counts in earlier reports.
- **Skills are read as they stand.** The cited skill and plan files have uncommitted changes, so these line numbers can move.
- **Not recorded.** `checks:` in `state.yaml` is still from 2026-11-01, and today's health run did not update it.
