# Hiring Starter blueprint review

- **Date:** 2026-11-03
- **Reviewed file:** [hiring-starter-semantic-blueprint.md](../../catalog/blueprints/hiring-starter-semantic-blueprint.md), blob `f4890de`. L numbers refer to this blob.
- **Question asked:** is the document logical and self-contained?
- **What this is:** a snapshot of what is open today. Bug numbers are stable IDs, so they have gaps.
- **Method:** one pass over the whole document, which the drift check confirmed matched the live catalog right after the rebuild. Every rule cited here was re-read in the current skills. The review itself changed no catalog row; fixes you approved since then are listed under [Fixed on 2026-11-03](#fixed-on-2026-11-03).
- **Scope:** sections 6.1 to 6.3 are postponed and not reviewed: see [Postponed sections 6.1 to 6.3](#postponed-sections-61-to-63).

## Summary

**9 bugs are open: 5 High, 2 Medium and 2 Low.** They come down to 7 kinds of fix. Anything that contradicts itself or breaks something is rated High. 6 more are fixed: see [Fixed on 2026-11-03](#fixed-on-2026-11-03).

**The most serious problem is bug-14.** Under `raci` with the default row-scope rule, once a recruiter is recorded on a row, the persona who holds the hire gate cannot edit it, and the persona who can edit it does not hold the gate. From then on, normally only an admin can complete the hire.

The document is not fully logical, because of the bugs below. It is also not self-contained, and that part is by design: the format relies on the template and the deploy skills to define its terms.

| Severity | Meaning | Count | Bugs |
| --- | --- | ---: | --- |
| High | The document contradicts itself, or something breaks in normal use or at deploy | 5 | 2, 12, 14, 22, 72 |
| Medium | No contradiction; breaks only under a condition, or not yet proven | 2 | 18, 26 |
| Low | Minor gaps, judgment calls and values with little effect | 2 | 47, 76 |

**Reading `field_required`:** in section 5.3 it is only a prompt at deploy that defaults to optional (A2:208). In sections 5.1 and 5.2 the value applies (tmpl:197) and the platform enforces it (M1:162).

**What holds:**

- The file matches the live catalog: the drift check reported `unchanged` right after the rebuild.
- The 9 entities match across sections 2, 3 and 6.4 and the diagram.
- The 18 diagram relationships match sections 5.1 and 5.2.
- The dashed diagram nodes match `install_optional`.
- The 7 gates match across sections 7, 8.1 and 9.1.
- The 5 personal-content entities match the 10 overrides and 5 rules.
- The frontmatter personas match the RACI actors.

**Checks run today:**

| Check | Result |
| --- | --- |
| `generate_blueprints.ts --module HIRING-STARTER --check` | Unchanged right after the rebuild. It now reports `WOULD-CHANGE`, because an uncommitted generator edit adds a `supports_raci` line to the frontmatter; no catalog row has changed since. Once that line is built in, add one to every L number |
| `generate_blueprints.ts --lint --module HIRING-STARTER` (R1 to R10) | 5 warnings: under R9, `LEGAL-COMPLIANCE-SPECIALIST` is only Informed here; under R10, 4 text warnings on `candidates` and `interviews`. R6 has no rows to check while section 6 is postponed |
| Architect `consistency-check.ts` | Consistent, with one warning: the frontmatter has no `access_scope` |
| `domain_health.ts --domain ATS --json` (not recorded) | 32 pass, 13 warn, 4 fail, 10 agent, 2 delegated, 2 skipped. B7c, the check for bug-14, warns |

**Accepted by the owner, so not bugs (hist:791, hist:875):** an application can be saved with no job relationship (rels 808 and 809 are optional). A candidate's source and an application's source are separate facts (rels 812 and 2740).

## Open bugs by kind of fix

| Type | Bugs | Count |
| --- | --- | ---: |
| **Recurring:** too few relationships to `users` | 12 | 1 |
| **Recurring:** row-scope reaches only one person | 14, 72 | 2 |
| **Recurring:** subsets lose what the full module provides | 2 | 1 |
| **Recurring:** gates with no process | 26 | 1 |
| **Recurring:** later actor required on a draft | 22 | 1 |
| **Recurring:** RACI rows that do not match the work | 76 | 1 |
| **Not data:** skill and template rules | 18, 47 | 2 |

### Details

**Bold** bugs are High.

| Type | Kind of fix | Bugs | What changes | Evidence across the catalog | Breaks something? |
| --- | --- | --- | --- | --- | --- |
| **Recurring** | Relationships to `users` | **12** | A new relationship to `users`, or carrying `interview_panels` in the starter | B7 passes at one relationship (SKILL:1062). 219 of 787 workflow entities have 2+ gates and at most one relationship to `users` | Yes |
| **Recurring** | Row-scope reach | **14**, **72** | `specification_requirements` text, override grants and `persona_id` on five relationships | B7c is built for this (SKILL:1070-1076) but cannot run: 0 of 1,039 relationships to `users` have `persona_id`. R8 passes once any one relationship is single-person. 28 of 206 row-scoped entities have 2+ relationships to `users` | Yes |
| **Recurring** | Subsets | **2** | A new relationship, or a required requisition | Rule #19's invariants do not test whether a subset works alone (SKILL:483) | Yes |
| **Recurring** | Gates with no process | 26 | A process for states 207, 230, 240, or a decision that they stay admin-only | E4b only warns (SKILL:1281). 925 of 1,110 gates have no process | Conditional |
| **Recurring** | Required too early | **22** | `is_required` on rels 821, 825, 1344 | The test at `module-shape.md:308` does not name drafts or first save. 8 candidates in 5 domains: a required relationship to `users`, on an entity starting at `draft`, with a verb naming a later actor | Yes |
| **Recurring** | RACI against the work | 76 | A `process_raci` row on process 219, or new wording on state 236 | No check compares a persona's RACI rows with its description. R9 catches only a persona that is just Informed in a module. 10 of 84 personas with RACI rows have no Responsible or Accountable row anywhere, so they get no write grant | No |
| Not data | Skill and template rules | 18, 47 | Test the dropped-entity rule with a deploy (18); define or move `⚠ no process` (47) | - | Unproven |

- **Recurring** means the skill gap recurs. Each bug's row is still a one-off fix in the data, but new domains can get the same problem until the skill changes. Subsets recur per new starter or optional entity, not per domain.
- **Bugs 2, 12, 14 and 72 need your decision** before any row is drafted, because each changes a relationship or an access rule.
- **The catalog figures** come from a read-only count, using the definitions shown. Figures based on state names, verbs or description text are candidates, not confirmed bugs.

## What breaks

This table sets the fix order. 5 bugs break something, 1 breaks only under a condition, 2 are unproven, and 1 is simply wrong or inconsistent. All 5 High bugs break something.

| Bug | Severity | Breaks something | What breaks |
| --- | --- | --- | --- |
| bug-14 | High | Yes | With the default row-scope rule, the gate holder cannot edit a row that has a recruiter, and an interview reaches only its coordinator. Fully under `raci`. |
| bug-72 | High | Yes | With a one-owner rule, either the approver cannot see the offer or the recruiter cannot see their draft. |
| bug-22 | High | Yes | A draft is rejected until its publisher, approver or recruiter is set. |
| bug-12 | High | Yes | An interview cannot record who is interviewing, so under row-scope the interviewers cannot see it. |
| bug-2 | High | Yes | Without requisitions, a job's hiring manager cannot be named. |
| bug-26 | Medium | Conditional | Only under `raci`: no Accountable can hold these gates. |
| bug-18 | Medium | Unproven | Whether a deploy with an optional entity left out behaves as the rule says. No deploy test. |
| bug-47 | Low | Unproven | `⚠ no process` could reach live permission descriptions. No deploy test. |
| bug-76 | Low | No | The persona still gets `:manage` from its other rows. |

## Fixed on 2026-11-03

You approved these fixes, and each is logged in [history.md](history.md). The lifecycle and description changes are on shared rows, so they apply to every module holding these entities.

| Bug | What was wrong | What changed |
| --- | --- | --- |
| bug-1 | An accepted offer could not be rescinded | `accepted` is no longer terminal, `rescinded` names accepted offers, and offers gain the terminal state `completed` |
| bug-32 | An archived candidate could not come back | `archived` is no longer terminal, and a new application moves the candidate back to active |
| bug-34 | An offer abandoned before sending had no end state | Offers gain the terminal state `canceled` |
| bug-17 | Postings and applications were described against a requisition, which is optional | Neutral wording: "a job" |
| bug-51 | The offer description promised an approval chain | Neutral wording: "approval" |
| bug-52 | The application description promised a full evaluation history | Phrase removed |

**Decided alongside bugs 1 and 32:**

- **A candidate backs out after accepting:** offers gain the terminal state `reneged`.
- **A former employee applies again:** `hired` is no longer terminal, and a new application moves the person back to active.
- **A `do_not_hire` candidate applies again:** the application is accepted, but it cannot move to `hired`. This is in the Additional Requirements of `HIRING-STARTER`.

**Still open from these fixes:**

- **The terminal-state skill gap.** New domains can still mark a mid-life state terminal, because the only check is for at least one terminal state (SKILL:1213). 76 terminal states are still named exactly `archived` or `accepted`; these are candidates, not confirmed bugs. An authoring test, new health checks and a table of allowed moves are all undecided.
- **Moves live only in description text.** The catalog cannot store an allowed move. `archived` and `hired` back to `active` run backward (orders 5 and 3 to 2), and analyst family F3 proposes an ordering check, so the analyst has to make an exception at spec time.
- **Nothing moves an offer to `completed`.** No process is wired, so a person has to set it. Until then, accepted offers stay editable.
- **The do-not-hire rule is on the starter only.** `ATS-RECRUITMENT-PIPELINE`, `ATS-INTERVIEWS` and `ATS-OFFERS` also hold applications and do not have it.
- **Other blueprints are not rebuilt.** Only the Hiring Starter file shows these changes, because rebuilding the others now would empty their sections 6.1 to 6.3.

## Postponed sections 6.1 to 6.3

Sections 6.1, 6.2 and 6.3 are postponed, so handoffs are outside this review. Nothing acts on a handoff at deploy or at runtime (M4:479).

The generator shows these sections as if they had no data; the switch is `POSTPONE_SECTIONS_6_1_TO_6_3` in [generate_blueprints.ts](../../scripts/generate_blueprints.ts). It applies to every CLI build, and only the Hiring Starter file has been built with it, so `--regenerate` and `build_catalog.ts` would empty these sections in all the other blueprints.

The handoff data needs its own review before the sections return. That review should cover analyst Stage 2g, which reads implied relationships from these rows (A2:170).

## Open bugs

Every **Fix** is a proposal. Overwriting a value needs per-row approval, and a data model decision needs yours first.

Citation keys:

- **L:** line in blob `f4890de`.
- **rel:** live `data_object_relationships` id. **State numbers** are live `data_object_lifecycle_states` ids.
- **tmpl, audit:** architect `semantic-blueprint-template.md`, `audit-checklist.md`.
- **A2, A3, A7, A9, A10:** analyst `stage-2-inspect`, `stage-3-collisions`, `stage-7-select-rule`, `stage-9-governance`, `stage-10-rules`.
- **M1, M4:** modeler `stage-1-parse`, `stage-4-execute`.
- **SKILL:** `domain-map-analyst/SKILL.md`.
- **hist:** `audits/ATS/history.md`.
- **plan:** `plans/blueprint-external-relationships-plan.md`.

## High

### bug-14: Most personas have no route to the rows they work on

The default rule admits the owner or a `view_all` holder (A7:15), plus rows with no owner for `:manage` holders (A7:21). Editing follows the same shape: owner or `manage_all` (A10:97). Overrides roll up to admin only (L388-397), and RACI grants the write tier and gates, not row access (M4:412-415). `:read` does not widen a row-scope rule (A7:19).

What each persona reaches under `raci` with the default rule, for a user not recorded as the recruiter:

| Persona | RACI rows | Candidates | Applications | Interviews | Scorecards | Offers |
| --- | --- | --- | --- | --- | --- | --- |
| RECRUITING-RECRUITER | R on 4, C on 1 | Own | Own | Coordinated only | Authored only | Own |
| RECRUITING-SOURCER | R on 1 | No owner only | No owner only | Coordinated only | Authored only | No owner only |
| RECRUITING-MANAGER | A on 3, C on 1 | No owner only | No owner only | Coordinated only | Authored only | No owner only |
| HIRING-MANAGER | A on 2, R on 1, I on 1 | All, read only (L85) | No owner only | Coordinated only | Authored only | No owner only; approver rows only if the rule includes rel 825 (bug-72) |
| RECRUITING-COORDINATOR | R on 1 | No owner only | No owner only | Coordinated only | Authored only | No owner only |
| LEGAL-COMPLIANCE-SPECIALIST | I on 1 | None | None | None | None | None |

**The hire step:** the manager holds `hire_candidate` (L420) but cannot edit a candidate or application that has a recruiter, because L85 grants read only and applications are not covered at all. The recruiter can edit it but holds no gate (M4:412). So once a recruiter is recorded, only an admin, or a manager who is that recruiter, can move the row to `hired`.

**Interviews:** `interviews` is personal content (L96), and its only relationship to `users` is the required rel 823 `coordinates` (L131). So each interview reaches only its coordinator and `view_all_interviews` holders. The hiring manager cannot see it, though that persona is Responsible for interviewing (L422), and neither can the interviewers (bug-12).

**Fix (your decision):**

1. Extend the Additional Requirements (L85). For example, give the hiring manager `manage_all_candidates`, `manage_all_applications` and `view_all_interviews`, and the recruiting manager the `view_all` overrides.
2. A rule that looks up the hiring manager through the requisition is possible but discouraged for performance (`select-rule.md:54`), and requisitions are optional.
3. Whichever you choose, set `persona_id` so B7c can run: rels 822, 1343 and 2880 to RECRUITING-RECRUITER, rel 823 to RECRUITING-COORDINATOR, rel 825 to HIRING-MANAGER.

### bug-72: Offers name two people, and nothing says who owns the row

Offers have rel 825 `approves` (L133) and rel 2880 `owns as recruiter` (L137). `offer_edit_scope` says "row-scope by default" with no owner named (L359), the analyst decides (A7:13), and R8 passes as soon as either relationship is single-person.

**Contradiction:** a one-owner rule cannot be right here. If the recruiter owns the row, the approver holding `approve_offer` (L427) cannot see the offer waiting on them. If the approver owns it, the recruiter cannot see their own draft (L288).

**Fix:** say in the Additional Requirements (L85) that both people can see and edit the row. The platform supports a two-person rule (`select-rule.md:74-75`).

### bug-22: Records require people before their step happens

Rels 821 (L129), 825 (L133) and 1344 (L135) apply as required (tmpl:197, M1:162), while L288, L305 and L317 describe drafts. A manager drafting a requisition must name a recruiter, and a draft posting must name its publisher. On offers it is inverted: the recruiter who drafts is optional (L137), and the approver who comes later is required (L133).

**Contradiction:** a posting, offer or requisition starts as a draft, but its publisher, approver or recruiter is already required.

**Fix:** set `is_required` to false on the three rows. If the person must be known at the gate, say so in the Additional Requirements, so the analyst can author a required-when rule (A10 F4).

### bug-12: An interview cannot record its interviewers

Rel 823 `coordinates` (L131) is the only relationship to `users` on interviews, though L31 promises one or more interviewers and a panel. Panelists sit on `interview_panels` (rel 2003), which is external (L186). The scorecard author (rel 824, L132) comes later and is optional in the starter (L95). Because interviews are row-scoped (L96, L357), an interviewer who is not the coordinator cannot see the interview.

**Contradiction:** interviews have one or more interviewers, but the only relationship to `users` on an interview is `coordinates`.

**Fix (your decision):** carry `interview_panels` in the starter, or add a single interviewer relationship.

### bug-2: Without requisitions, nothing names a job's hiring manager

Rel 2739 is the only hiring manager relationship (L136), and requisitions are optional (L98). Gates come through grants (A9:84), and the manager can still be the offer approver (L133). What is lost is the name on the job, not a process.

**Fix (your decision):** add a hiring manager relationship on `job_postings`, or make requisitions required in the starter.

## Medium

### bug-26: Three gates have no process: `close_requisition`, `flag_do_not_hire`, `rescind_offer`

States 240 (L321), 207 (L243) and 230 (L294) are gated with no process, and E4b warns today. There is no issue under `gated`. Under `raci`, no Accountable can hold them (audit:22), so they stay with the admin (L382, L385, L387). The document flags this (L334, L337, L339), but nobody has decided.

**Fix (your decision):** wire each state to a process, or accept that these gates are admin-only.

### bug-18: The rule for a left-out optional entity has no deploy test

A dropped entity is skipped from all later stages (A3:51), analyst Stage 9.5 removes what depends only on it (A9:44), and section 9 is carried with that removed (A9:109). `consistency-check.ts` fails a spec that still names one, but it has only run on fixtures. Fast flow drops optionals (A3:13).

Leaving requisitions out should remove two gates (L333-334), their hierarchy rows (L381-382), the process `manage_employee_requisitions` and its two RACI rows (L413-414). The test deploy was skipped (plan:5), so none of this is observed behavior. The rule reads a process's dependencies from `grant gates` and `trigger_events`, so a process with neither stays.

**Fix:** test it with a deploy.

## Low

| Bug | Problem | Evidence | Fix |
| --- | --- | --- | --- |
| bug-47 | `⚠ no process` has no definition, and may reach live text | L334, L337, L339, emitted by `blueprint_derive.ts:461`. The template defines only two other `⚠` markers (tmpl:312), which make the deployer skip the row (M4:246). The modeler passes the section 8.1 description verbatim to the live permission (M4:130), and no skill strips the marker. Under `gated` the marker is false, because a gate needs no process there | Your decision: move it to a note under the section 8.1 table (a format change), or keep it, define it in the template and have the analyst strip it |
| bug-76 | The hiring manager drafts requisitions but has no row on that process | L317, and the persona "defines the req", but L413-414 omit it. It still gets `:manage` from its other rows | Add a row on process 219, or reword state 236 |

## Limits of this review

- **One pass.** One reviewer read the document and checked each finding against the primary sources. No independent second pass tried to disprove the findings, so bugs 72 and 76 have had less scrutiny than the rest.
- **No deploy test.** Bugs 18 and 47 come from skill text, not observed behavior (plan:5).
- **Access level is unknown.** The blueprint has no `access_scope`. Bugs 14 and 72 apply from `advanced` up, where the row-scope rule runs (A7:9). Bug 26 applies only under `raci`.
- **Row-scope bugs assume the analyst's default shape.** Bugs 14 and 72 assume A7's owner-plus-oversight rule. An analyst could author a broader rule, but nothing in the document asks for one.
- **Vendor evidence is thin.** The fixes for bugs 1 and 34 and the backing-out decision rest on Oracle Taleo's documentation. The bug-32 fix rests on search excerpts from Lever's help center. The reapplying and do-not-hire decisions rest on blogs, not vendor documentation.
- **Catalog counts are catalog-wide.** They use the definitions stated above. The required-too-early figure (8 candidates) was not recounted for this snapshot.
- **Skills are read as they stand.** The cited skill and plan files have uncommitted changes, so these line numbers can move.
- **Not recorded.** `checks:` in `state.yaml` is still from 2026-11-01, and today's health run did not update it.
