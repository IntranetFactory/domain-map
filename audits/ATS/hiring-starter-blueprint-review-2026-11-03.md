# Hiring Starter blueprint review

- **Date:** 2026-11-03
- **Reviewed file:** [hiring-starter-semantic-blueprint.md](../../catalog/blueprints/hiring-starter-semantic-blueprint.md), blob `5e6decf`. L numbers refer to this blob.
- **Question asked:** is the document logical and self-contained?
- **Access level reviewed:** `gated`. The file has `supports_raci: false` (L15), and `decide-access-scope.ts` returns `gated` for it. A request for `raci` also returns `gated`, with `raci_refused: true`.
- **What this is:** a snapshot of the current file. Bug numbers are stable IDs, so they have gaps.
- **Method:** two separate passes. The second reviewer saw the file and the rules but not the first pass's findings. The owner's own read then added bugs 88 to 91. Every finding here was checked against the primary sources.
- **Scope:** sections 6.1 to 6.3 are postponed and not reviewed: see [Postponed sections 6.1 to 6.3](#postponed-sections-61-to-63).

## Summary

**21 bugs are open: 7 High, 7 Medium and 7 Low.** Anything that contradicts itself or breaks something in normal use is rated High. 3 more issues sit outside the bug list: see [Other open issues](#other-open-issues).

**The main problem: everything restricted falls to the admin role.** With no RACI, the admin alone holds all 7 gates and all 10 overrides, so the file has only two working levels. An admin can do everything. Everyone else can reach only the rows they are personally named on, and can take no gated step. A hiring manager either becomes a full admin or sees no applicant at all (bugs 14, 78 and 79).

The document is not fully logical, because of the bugs below. It is also not self-contained, and that part is by design: the format relies on the template and the deploy skills to define its terms.

| Severity | Meaning | Count | Bugs |
| --- | --- | ---: | --- |
| High | The document contradicts itself, or something breaks in normal use or at deploy | 7 | 14, 78, 79, 72, 22, 12, 80 |
| Medium | No contradiction; breaks only under a condition, or not yet proven | 7 | 88, 2, 81, 82, 89, 83, 18 |
| Low | Minor gaps, judgment calls and values with little effect | 7 | 91, 84, 85, 86, 87, 76, 90 |

### How to read this file without RACI

| In the file | What it does at `gated` |
| --- | --- |
| 7 gates (L334-340) | Each is its own permission, held only through `:admin` (L384-390, st10:115). A gate needs no process here. L352 only explains why `raci` is not supported |
| 10 overrides (L341-350) | Held only through `:admin` (L391-400) |
| 3 roles (L374-376) | These are the only roles deployed. No persona role is created (A9:38, M4:14) |
| RACI realization (L412-431), Processes wired (L402-410), `persona` (L14) | Documentation. The analyst emits none of it (A9:37-38), and modeler Stage 4k is skipped (M4:21). So bugs 76 and 90 have no effect at deploy |
| Section 9.2 (L435-440) | Deploys (M4:14), but each row resolves to a baseline role that already holds that tier (M4:469), so it adds no access. The function names do not become roles |
| Row-scope (L358-362) | Runs at this level (A7:9) |
| `high risk?` (all `-`) | No effect at this level (st10:167) |
| `field_required` | In sections 5.1 and 5.2 the value applies (tmpl:198) and the platform enforces it (M1:162). In section 5.3 it is only a prompt at deploy that defaults to optional (A2:208) |

**What holds:**

- The file matches the live catalog: the drift check reports `unchanged`.
- The 9 entities match across sections 2, 3 and 6.4 and the diagram.
- The 18 diagram relationships match sections 5.1 and 5.2.
- The dashed diagram nodes match `install_optional`.
- The 7 gates match across sections 7, 8.1 and 9.1, each with its `:admin` row.
- The 5 personal-content entities match the 10 overrides and 5 rules.
- `supports_raci: false` agrees with the file: L352 names the only three gates with no process.
- An admin can complete a whole hire.

**Checks run today:**

| Check | Result |
| --- | --- |
| `generate_blueprints.ts --module HIRING-STARTER --check --no-cache` | `unchanged` |
| `generate_blueprints.ts --lint --module HIRING-STARTER --no-cache` (R1 to R10) | 0 fails, 5 warnings. R9 on `LEGAL-COMPLIANCE-SPECIALIST` does not apply here, because its text is about `raci`. The 4 R10 warnings are in bugs 12 and 84. R6 has no rows to check while section 6 is postponed |
| Architect `consistency-check.ts` | Consistent, with one warning: no `access_scope`, which is expected on a catalog file (audit:19) |
| Architect `decide-access-scope.ts` | `gated`; a `raci` request returns `gated` with `raci_refused: true` |
| `domain_health.ts --domain ATS --json` (not recorded) | Domain totals: 32 pass, 13 warn, 4 fail, 10 agent, 2 delegated, 2 skipped. Its only finding on this module is E6, which repeats the R9 and R10 warnings |

## What breaks

This table sets the fix order. 6 of the 7 High bugs break something in normal use, and bug-80 only misleads.

| Bug | Severity | Breaks something | What breaks |
| --- | --- | --- | --- |
| bug-14 | High | Yes | Outside the admin role, nobody sees across rows on 5 of the 8 entities. A viewer sees none of those rows unless named on one. |
| bug-78 | High | Yes | The only access rule for hiring managers applies under `raci`, so it never applies. They see no applicant. |
| bug-79 | High | Yes | A named approver or publisher who is not an admin cannot take the step, and any admin can take it instead. |
| bug-72 | High | Yes | With a one-owner rule, either the named approver cannot see the offer or the recruiter cannot see their draft. |
| bug-22 | High | Yes | A draft is rejected until its publisher, approver or recruiter is set. |
| bug-12 | High | Yes | An interview cannot record who is interviewing, so the interviewers cannot see it. |
| bug-80 | High | No | Section 9 says RACI is provisioned, so a reader expects personas to hold gates. |
| bug-88 | Medium | Unproven | The do-not-hire rule may never become a rule: the written route ends in a note. No deploy test. |
| bug-2 | Medium | Conditional | Without requisitions, a job's hiring manager cannot be named, and the only possible row access route for them is gone. |
| bug-81 | Medium | Conditional | Unless the analyst authors an allowed-move rule, an offer can reach `sent` without approval. |
| bug-82 | Medium | Conditional | A mistaken do-not-hire flag cannot be lifted, and a flagged candidate's offer can reach `accepted` and then stick. |
| bug-89 | Medium | Conditional | With both external entities present, the same fact is proposed twice, including regulated self-identification data. |
| bug-83 | Medium | Unproven | If the override tier is carried as written, the modeler's check would stop the deploy. No deploy test. |
| bug-18 | Medium | Unproven | Whether a deploy with an optional entity left out behaves as the rule says. No deploy test. |
| bug-91 | Low | No | The overview says the requisition approval chain is left out, but one approval step stays. |
| bug-84 | Low | No | Text promises things the file may not carry. |
| bug-85 | Low | No | Field labels would read like identifiers, and the verb style is mixed. |
| bug-86 | Low | No | Format gaps in the frontmatter, section 1 and table order. |
| bug-87 | Low | No | Published process text reads badly for a hiring product. |
| bug-76 | Low | No | A RACI row is missing for the persona who drafts requisitions. Documentation only. |
| bug-90 | Low | No | A RACI Accountable has nothing to approve. Documentation only. |

## Decisions and fixes

**Bold** bugs are High. Most of the High bugs come down to the first two decisions.

| Kind of fix | Bugs | The question or change | Where it lands |
| --- | --- | --- | --- |
| Decision | **14**, **78** | Who reads across rows at `gated`? | Additional Requirements text (L86) |
| Decision | **79**, **72**, **22** | Does a named approver or publisher decide anything at `gated`? | `is_required` on rels 821, 825, 1344; state text; Additional Requirements |
| Decision | **12** | How does an interview record its interviewers? | The starter's entities, or a new relationship |
| Decision | 2 | How is a job's hiring manager named without requisitions? | A new relationship, or requisitions become required |
| Decision | 81, 82 | Should allowed moves be enforced on offers, and can a do-not-hire flag be lifted? | Additional Requirements; state rows |
| Data model decision | 89 | Which overlapping external entities and relationships stay? | Catalog rows, across every module that holds them |
| Format decision | **80**, 88, 83, part of 86 | Section 9 caption, how a module's own rule reaches the spec, and the row-scope labels | `generate_blueprints.ts`, `blueprint_derive.ts`, the template, the checklist and analyst Stage 10 |
| Catalog text | 91, 84, 85, 87, 76, 90, part of 86 | Reword or add rows, with per-row approval. Entity and state text is shared by every module that holds it | Catalog rows |
| Test | 18 | Deploy with an optional entity left out | A test deploy |

## Other open issues

These are not bugs in the document, but each needs a decision or a follow-up.

- **Moves with no one to make them.** "A new application moves the candidate back to active" (L243, L245), and nothing moves an offer to `completed` (L296). The file has no process or rule that does this, and a computed field writes only to its own entity (jsonlogic:35). So a person has to do it, and under row-scope only the candidate's recruiter or an admin can edit the candidate. Until then, an accepted offer stays editable.
- **One hire is four separate edits.** Application `hired` (L279), candidate `hired` (L243), offer `completed` (L296) and requisition `filled` (L322) are set separately, and nothing keeps them in step. An offer reaching `accepted` (L293) triggers none of them, and a manager can set an offer to `completed` ("Candidate was hired") with no hire.
- **Backward moves live only in description text.** `archived` and `hired` back to `active` run against the order column (orders 5 and 3 to 2), and analyst family F3 proposes an ordering check (A10:93), so the analyst has to make an exception at spec time.

## Postponed sections 6.1 to 6.3

Sections 6.1, 6.2 and 6.3 are postponed, so handoffs are outside this review. The generator shows them as if they had no data; the switch is `POSTPONE_SECTIONS_6_1_TO_6_3` in [generate_blueprints.ts](../../scripts/generate_blueprints.ts). So L213 and L217 say there are no handoffs, while 25 catalog handoffs have a payload in this scope.

## Open bugs

Every **Fix** is a proposal. Overwriting a value needs per-row approval, and a data model decision needs yours first. No market comparison was done for the decisions below: see [Limits](#limits-of-this-review).

Citation keys:

- **L:** line in blob `5e6decf`.
- **rel:** live `data_object_relationships` id.
- **tmpl, audit, st10, st11:** architect `semantic-blueprint-template.md`, `audit-checklist.md`, `stage-10-workflow-perms.md`, `stage-11-governance.md`.
- **A1, A2, A3, A4, A7, A9, A10:** analyst `stage-1-parse`, `stage-2-inspect`, `stage-3-collisions`, `stage-4-fields`, `stage-7-select-rule`, `stage-9-governance`, `stage-10-rules`.
- **M1, M4:** modeler `stage-1-parse`, `stage-4-execute`.
- **SR, jsonlogic:** `use-semantius` `select-rule.md`, `jsonlogic.md`.
- **SKILL:** `domain-map-analyst/SKILL.md`.
- **plan:** `plans/blueprint-external-relationships-plan.md`.

## High

### bug-14: Only an admin can see across rows on the five personal-content entities

The default rule admits the owner or a `view_all` holder (A7:15), plus rows with no owner for `:manage` holders when the owner relationship is optional (A7:21). A `select_rule` replaces `view_permission`, so `:read` adds nothing (SR:37-44), and editing needs the same rule to pass (SR:46). The overrides roll up to admin only (L391-400).

What each role reaches, for a user not named on the row:

| Role | Candidates | Applications | Interviews | Scorecards | Offers |
| --- | --- | --- | --- | --- | --- |
| `hiring-starter_admin` | All | All | All | All | All |
| `hiring-starter_manager` | Only rows with no recruiter | Only rows with no recruiter | None | None | Depends on bug-72 |
| `hiring-starter_viewer` | None | None | None | None | None |

A user named on a row can see it: recruiter on candidates and applications (L135, L131), coordinator on interviews (L132), author on scorecards (L133). Requisitions, postings and sources have no row-scope.

**In normal use:**

- A recruiter cannot see the interviews or scorecards on their own application unless they coordinated or authored them. The evidence for a hiring decision reaches only the admin.
- A coordinator cannot see an application that has another recruiter, though every interview must relate to an application (L121).
- Setting a recruiter hides the row from every other manager. Leaving it blank shows it to all of them.
- L331 says `:read` is "Read access to every entity in the module", and L440 gives Finance the viewer role. A viewer sees no rows on 5 of the 8 entities unless named on one.
- Inferred: a recruiter who cannot see a colleague's candidate creates a duplicate, and the duplicate is not flagged, which gets around the do-not-hire rule (L88).

L6 promises a package for a small team, and L437 maps Recruiting to admin. If the whole recruiting team is made admin, they all see everything, but then row-scope and every gate mean nothing inside that team.

**Fix (your decision):**

1. **Recommended:** say in the Additional Requirements (tmpl:143) that `:manage` holders can read every row of these entities. The rule gets a `has_permission` clause for `:manage` (the same shape as SR:51), and writes stay with the named person through the owner-edit rule (A10:97). This also closes bug-78. Viewers still see nothing, so reword L331 or decide separately what Finance should see.
2. Add the `view_all` overrides to the manager role in section 9.1. This changes a derived hierarchy, so it is a format decision.
3. Keep row-scope as it is, and say plainly that non-admins see only their own rows. The hiring manager then has no access (bug-78).

### bug-78: The only access rule for hiring managers depends on `raci`

L86 gives the hiring manager a workaround "under `access_scope: raci`", and L15 and L352 say the file does not support `raci`. Persona overrides are applied in Stage 9.5 Step 3 (A9:80), which runs only under `raci` (A9:37). At `gated` the sentence silently does nothing, and no persona role exists to hold the override.

**Contradiction:** the Additional Requirements rely on an access level the file says it does not support.

**What is left:** a hiring manager with the manager role sees requisitions but no applicant, and L280 says the hiring manager rejects applications. L86 covers only candidates, but applications, interviews, scorecards and offers have the same gap.

**The only other route is optional and indirect.** Their one relationship is rel 2739 on requisitions (L137), which are optional (L99). A rule could reach an application through its optional requisition (L117), and an offer one step further (L123), but cross-entity lookups in a read rule are discouraged for performance (SR:54), and the default rule does not use them. So they reach nothing with or without requisitions, unless they happen to be the named approver on an offer (rel 825, depending on bug-72).

**Fix (your decision):** replace L86 with a rule that works at `gated` (bug-14, option 1), or delete it and accept that hiring managers need the admin role. L86 is an existing value, so overwriting it needs approval. SKILL:492 also describes this field as the way to name a persona override, and that needs a note for a starter with no RACI.

### bug-79: The named approver and publisher cannot take their step

Rel 825 `approves` (L134) and rel 1344 `publishes` (L136) are required and name a person. L290 routes an offer "to the designated approver for sign-off", and L291 says "Approver signed off". At `gated`, however, only the admin holds the gate (st10:115, L389, L386). The rule checks the permission alone (A10:22-29), and its message reads "Only an admin can approve an offer" (A10:33). Nothing ties the rule to the named person.

**Contradiction:** the file designates an approver, but being the approver does not decide who can approve.

**In normal use:**

- A recruiter names a hiring manager who has the manager role. That person cannot approve, so the offer waits at `pending_approval` until an admin acts.
- Any admin can approve an offer that names someone else, and an admin who is also the recruiter can approve their own draft.
- Letting a hiring manager approve means making them an admin, which also gives them all 7 gates and all 10 overrides.

**Fix (your decision):**

1. Accept that an admin takes these steps. Reword L290-291, and make the two relationships optional (bug-22) or drop them from the starter.
2. Say in the Additional Requirements that the named person or a gate holder can take the step. That is close to the RACI rule (A9:95), and nothing authors it at `gated`, so it needs its own decision.
3. Each gate is its own permission, so an admin can grant one to another role by hand after deploy. Nothing in the file sets that up today.

### bug-72: Offers name two people, and nothing says whose row it is

Offers have rel 825 `approves` (L134) and rel 2880 `owns as recruiter` (L138). `offer_edit_scope` says "row-scope by default" with no owner named (L362), the analyst decides (A7:13), and R8 passes as soon as either relationship is single-person.

**Contradiction:** a one-owner rule cannot be right here. If the recruiter owns the row, the named approver cannot see the offer waiting on them (L290). If the approver owns it, the recruiter cannot see their own draft (L289).

**Fix:** say in the Additional Requirements that both people can see the row. The platform supports a two-person rule (SR:69-79). If bug-79 removes `approves`, this bug goes away.

### bug-22: Records require people before their step happens

Rels 821 (L130), 825 (L134) and 1344 (L136) apply as required (M1:162), while L318, L289 and L306 describe drafts. A hiring manager drafting a requisition must name a recruiter, and a draft posting must name its publisher. On offers it is inverted: the recruiter who drafts is optional (L138), and the approver who comes later is required (L134). The template says `yes` holds only if every row has the value, however the row was created (tmpl:198).

**Contradiction:** a posting, offer or requisition starts as a draft, but its publisher, approver or recruiter is already required.

**Fix:** set `is_required` to false on the three rows. If the person must be known at the gate, say so in the Additional Requirements, so the analyst can author a required-when rule (A10:94).

### bug-12: An interview cannot record its interviewers

Rel 823 `coordinates` (L132) is the only relationship to `users` on interviews, though L32 promises one or more interviewers and a panel, and L262, L263 and L265 describe a panel. Panelists sit on `interview_panels` (L187), which is external. The scorecard author (rel 824, L133) comes later, and scorecards are optional (L96). Interviews are row-scoped (L97, L360), so an interviewer who is not the coordinator cannot see the interview, and that includes the interview their scorecard must relate to (L122).

**Contradiction:** interviews have one or more interviewers, but the only relationship to `users` on an interview is `coordinates`.

**Fix (your decision):** carry `interview_panels` in the starter, or add a single interviewer relationship. Either way, the row-scope rule has to admit that person.

### bug-80: Section 9 says RACI is provisioned

L366 says the "RACI realization" is derived and "the deployer provisions it from this blueprint". At `gated` that step is skipped (M4:14), and the analyst emits none of it (A9:37-38). L417, L420, L423 and L430 read `grant gates [...]`; L423, for example, gives `HIRING-MANAGER` the `hire_candidate` gate. Nothing in section 9 says these rows are documentation, which is how the skills treat them (st10:179).

**Contradiction:** L15 and L352 say the file does not support `raci`, and L366 says RACI is provisioned from it.

Nothing breaks at deploy, because the analyst ignores the rows. The harm is to the reader, who concludes that hiring managers hold gates.

**Fix (your decision, format):**

1. When `supports_raci` is false, have the caption at `generate_blueprints.ts:989` say that the baseline roles and hierarchy are provisioned, that the RACI realization and Processes wired are documentation, and that the admin takes every gated step.
2. Or leave the RACI realization and Processes wired out of a `false` blueprint. The skills currently keep them as documentation (st10:171, st11:8), so this changes that rule, and the file would no longer show what is missing before `raci` could work.

## Medium

### bug-88: The do-not-hire rule has no route to enforcement

L88 says an application "cannot" move to `hired`, but the rule is not in section 8.2 (L358-362), which is what analyst Stage 10 converts to rules (A10:11). The generator derives section 8.2 and has no way to add a rule like this one (`blueprint_derive.ts:444-449`). The Additional Requirements reach the spec only as fields or section 7.2 notes (A4:15, A4:19), and the parse names no rule stage among their uses (A1:13). So the written route ends in a note. An analyst may still author it under family F15 (A10:105), but nothing requires that. This is not observed behavior: there is no deploy test.

The proposed fixes for bugs 22, 79 and 81 use the same route, so they depend on this one. Bug-14's option 1 does not, because Stage 7 reads the Additional Requirements directly (A7:13).

**Fix (your decision, format):** have analyst Stage 10 turn a rule stated in the Additional Requirements into a validation rule, or give section 8.2 a way to carry a module's own rule.

### bug-2: Without requisitions, nothing names a job's hiring manager

Rel 2739 is the only hiring manager relationship (L137), and requisitions are optional (L99). No gate depends on it at this level. What is lost is the name, the only possible row access route for a hiring manager (bug-78), and the reference behind L33 ("one job"), L280 and L310.

**Fix (your decision):** add a hiring manager relationship on `job_postings`, or make requisitions required in the starter.

### bug-81: Offer gates can be skipped

A gate fires only on entering its state (A10:22-29). `approved` is gated (L291), `sent` is not (L292), and the file carries no allowed moves. So a manager who can edit the row can go from `draft` to `sent` and never enter `approved`. The same manager can mark a sent offer `canceled` (L297, not gated) rather than `rescinded` (L295, gated). L297 says "before it was sent", but nothing enforces that, and `canceled` on an offer is a signal for a gate under the checklist (audit:136). No other entity has a live ungated state after its gate.

Whether analyst family F3 closes this is unproven. Its shape is only "lifecycle ordering check" (A10:93), a forward skip passes a simple order check, and L243 and L245 need backward moves.

Related: going from `paused` back to `published` (L307-308), or from `on_hold` back to `open` (L320-321), re-enters a gated state. So a manager can pause a posting or requisition, but only an admin can resume it.

**Fix (your decision):** say in the Additional Requirements that `sent` requires `approved` first, or gate `sent` and `canceled`.

### bug-82: The do-not-hire rule blocks only the last step and cannot be undone

L88 says an application cannot move to `hired` "while" the candidate is `do_not_hire`, but L244 makes that state terminal, with no moves out of it (tmpl:303). So "while" never ends, and a mistaken flag cannot be lifted, even by an admin. The rule covers only `hired`, so a flagged candidate can still be interviewed and sent an offer. The offer can reach `accepted`, and the application then stays at `offer_extended`.

**Fix (your decision):** make `do_not_hire` non-terminal with a gated way out, or say that the flag is permanent. Decide whether the rule should also stop an offer earlier.

### bug-89: External relationships record the same thing more than once

Each section 5.3 row is proposed on its own at deploy (A2:206-211), so an overlap reaches the user only when both ends exist. The checklist flags a fact kept in more than one place (audit:145) and redundant entities (audit:209).

| Overlap | Rows | Reading |
| --- | --- | --- |
| `eeo_responses` and `voluntary_self_identifications` | L186, L192 (rels 1322, 1334) | Same thing under two names: both describe voluntary self-identification for equal-employment reporting. This is regulated data, and it would sit in two places |
| `talent_pools` as a many-to-many and through `talent_pool_memberships` | L153, L178 (rels 815, 1302, 1303) | One relationship modeled twice. Analyst rule 3 avoids a second junction when the live one exists (A2:211), but the caption at L142 ("proposed as a new junction table") does not hold for this row |
| `position_demand_forecasts` and `job_requisitions` in both directions | L154, L156 (rels 831, 1023) | A many-to-many `updates` plus a one-to-many `triggers`. Forecasts are `computed`, so `updates` is also doubtful |
| `employees` and `candidates` in both directions | L159, L171 (rels 2266, 830) | Different facts, an employee applying internally and a candidate being hired, so this may be right. It still gives each table a field pointing at the other |
| `recruitment_events`: a field on candidates and `recruiting_event_attendances` | L152, L176 | Candidate: one event on the row, plus many through the junction |
| `recruitment_agencies`: a field on candidates and `agency_submissions` | L151, L203 | Candidate: the agency is recorded on both |
| `candidate_emails` and `candidate_engagements` | L200, L175 | Candidate: email is in both descriptions |
| `hiring_team_assignments` and the recruiter and hiring manager relationships | L196, L130, L137 | Candidate: recruiter and hiring manager are named twice when both exist |

**Fix (your decision, data model):** decide row by row which to keep. Merging or retiring an entity changes every module that holds it, so it needs its own approval.

### bug-83: Two row-scope labels are not in the file format

- **Tier:** L341-350 use `override (personal_content)`. tmpl:142 names it, but the tier vocabulary has no override tier at all (tmpl:332-339), the checklist treats any other tier as a blocker (audit:119), and the modeler accepts only plain `override` (M1:82). The spec template uses plain `override`, but no analyst rule says to rewrite the value. Carried as written, it would stop the modeler's parse. This is not observed behavior: there is no deploy test.
- **Source flag:** L358-362 use `has_personal_content`, which is outside the vocabulary (tmpl:353-358, A1:28).

Both come from `blueprint_derive.ts:434`, `:440` and `:447`.

**Fix (your decision, format):** emit `override` and `owner_edit`, or add these values to the template. Either way, align the template and the checklist.

### bug-18: The rule for a left-out optional entity has no deploy test

A dropped entity is skipped from all later stages (A3:51), and analyst Stage 9.5 removes what depends only on it, at every access level (A9:44-53). `consistency-check.ts` fails a spec that still names one, but it has only run on fixtures. A fast run that does get this question selects none (A3:13).

Leaving requisitions out should remove two gates (L334-335) and their hierarchy rows (L384-385). Leaving scorecards out should remove two overrides (L347-348), their hierarchy rows (L397-398) and a rule (L361). The test deploy was skipped (plan:5), so none of this is observed behavior.

**Fix:** test it with a deploy.

## Low

| Bug | Problem | Evidence | Fix |
| --- | --- | --- | --- |
| bug-91 | The overview says the requisition approval chain is left out, but one approval step stays | L23 against the `pending_approval` state (L319), the gate on `open` (L320, L334) and its RACI owner (L417). A single gate is not a chain, since the chain is external `requisition_approvals` (L182), but the wording misleads, and "routed" (L319) has no recipient | Reword L23 to say that approval is one step, or reword L319 |
| bug-84 | Text promises what the file may not carry | R10 flags "consent" (L30) and "employee" (L243), and bug-12 covers "panel". Also: L264 says "feedback is being collected" on a terminal state, with scorecards optional. L29 promises a "pipeline stage", while stages live on external `application_stages` (L180). L33, L280 and L310 assume requisitions. L29-30 "source" and L333 "Edit reference data" assume sources. Stage 9.5 removes rows, not text (A9:44-53, SKILL:496-502). Some are candidates, since a field could carry them | Reword per row. This changes every module that holds the entity |
| bug-85 | Mixed verb style: 27 of the 51 section 5.3 verbs are identifiers, such as `self_ids_via` and `member_of_via`, and the rest are phrases, such as "is referred through" | They carry over unchanged as the field label (A2:210), and the checklist wants a verb in the parent's voice (audit:113) | Reword per row |
| bug-86 | Format gaps | Tagline is 66 characters against a limit of 40 (A1:9, audit:29). `module_kind` and `initial_request` are absent (audit:13, audit:40). Section 1 has four sentences, with plumbing and scope narration (audit:71, audit:74, audit:75). `recruitment_sources` should lead sections 2 and 3 (tmpl:46). `flowchart TD` where the checklist names `LR` or `TB` (audit:79). L404 headers read `PCF code` and `PCF ID`, not `pcf_code` and `pcf_id` (tmpl:393) | Your decision: fix the generator, or relax the checklist for catalog files |
| bug-87 | L409 tells interviewers to "comprehend his/her personal and professional lives" | This is source process text, and it does not deploy at `gated` (A9:38), but the blueprint publishes it. That wording is a poor fit for a hiring product. This is a judgment, with no legal review | Your decision: reword it for display, or accept it as source text |
| bug-76 | The hiring manager drafts requisitions but has no RACI row on that process | L318 against L416-417. No effect at deploy | Add a row on `manage_employee_requisitions`, or reword L318 |
| bug-90 | An Accountable with nothing to approve | L426 makes `RECRUITING-MANAGER` Accountable for `interview_candidates`, but no interview or scorecard state is gated (L253-254, L262-267). The format allows it (st11:37), and every process must have one Accountable (`deriveSupportsRaci`), so the row passes every check while meaning nothing. No effect at deploy | Your decision: wire a gate to the process, or drop the process from the file |

## Limits of this review

- **Access level.** Reviewed at `gated` only. If the three gates at L352 get a process, `supports_raci` becomes `true`, `raci` becomes reachable, and this review no longer covers the file.
- **RACI rows are read as documentation.** Bugs 76 and 90 judge them as text only. The two passes did not review them, so this part rests on the owner's read and one recheck of L416-431.
- **Not exhaustive.** Both passes missed findings that the owner's read caught. After that read, only the items in it, section 5.3 overlaps and the RACI rows were rechecked.
- **No deploy test.** Bugs 18, 83 and 88 come from skill text, not observed behavior (plan:5).
- **Row-scope bugs assume the analyst's default shape.** Bugs 14, 72 and 78 assume A7's owner-plus-oversight rule. An analyst could author a broader rule, but nothing in the document asks for one.
- **Some consequences are inferred.** The duplicate candidate in bug-14 and the need for a person to make the moves in [Other open issues](#other-open-issues) are inferences from the rules, not confirmed text.
- **No market comparison.** The decisions above carry options and one recommendation, but no evidence of how market products handle them. The owner's data model rule asks for that before any write.
- **Skills are read as they stand,** so the cited line numbers can move.
- **Not recorded.** Today's health run did not update `audits/ATS/state.yaml`, and no catalog row changed.
