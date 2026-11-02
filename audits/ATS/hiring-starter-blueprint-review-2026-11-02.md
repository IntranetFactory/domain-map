# Hiring Starter blueprint review

- **Date:** 2026-11-02
- **Reviewed file:** [hiring-starter-semantic-blueprint.md](../../catalog/blueprints/hiring-starter-semantic-blueprint.md), blob `1fd13a2`. L numbers refer to this version, and to other blueprints only where named.
- **Question asked:** is the document logical and self-contained?
- **Method:** a first pass read the document alone and numbered 71 entries. A second, independent pass tried to disprove each one against the blueprint template, the deploy skills, the plan, the generator, the audit decisions and the live catalog. This report states what survived. The first pass's wording is in commit `be8630f`.
- **Scope:** problems only. Causes and fixes are the next step.

## High bugs by kind of fix

The 25 High bugs reduce to 6 kinds of fix: 20 in domain-map data, 3 in the generator and 2 in the skills.

| Fix lives in | Kind of fix | Bugs | What changes | Breaks something? |
| --- | --- | --- | --- | --- |
| **Domain-map data** | Wrong values | 3, 6, 8, 16, 22, 55, 65 | `is_required` on links 809, 1022, 829, 822, 821, 825, 1344; cardinality on 829 and 1328; blank event states on 364 and 372 | Yes: 3, 16, 22. Conditional: 6, 8, 55. No: 65 |
| **Domain-map data** | Wrong text | 17, 31, 51, 52, 57, 62, 63 | Catalog descriptions, handoff descriptions 394 and 398, event name 62 | None |
| **Domain-map data** | Lifecycle | 1, 32 | `accepted` (228) and `archived` (208) are terminal, so they need a way out or a new state | Both |
| **Domain-map data** | Missing structure | 2, 12, 13, 50 | New links, or carrying another entity in the starter | All four |
| **Generator** | Output format | 42, 66, 68 | The handoff transition, the `manage` and `read` role names, and a fixed sentence in section 6.1 | Yes: 42. Unproven: 66. No: 68 |
| **Skills** | Deploy rules | 14, 24 | Row-scope and RACI grants for the people who are not the owner | Both |

- **Bug-42** also needs the analyst and modeler rules changed, because they compare the transition with the payload.
- **Lifecycle and missing structure** need decisions before any row is drafted. Bug-2, for example, exists only because requisitions are optional in the starter.
- **Wrong text** has a catch: the wording in bugs 17, 51 and 52 is true for the full modules but false for the starter. The description is shared and there is no per-module text field, so a fix means neutral wording for every module.
- **Skills:** bugs 14 and 24 could partly be solved with data instead, by adding links. They are placed where the rule that causes them lives.
- This grouping is the main agent's reading of the evidence, not part of the independent pass.

## Summary

**Of the 71 numbered entries, 42 survive and 29 were dropped.** The 42 come down to about 18 distinct problems, and 25 are High. Anything that contradicts itself or breaks something is rated High.

The document is not fully logical, because the problems below are real. It is also not self-contained, and that part is by design: the format relies on the template and the deploy skills to define its terms (bugs 35, 44, 45, 46, 48, 54).

| Verdict | Meaning | Count | Bugs |
| --- | --- | ---: | --- |
| REAL | Confirmed as first stated | 18 | 1, 12, 13, 14, 18, 22, 24, 26, 32, 42, 50, 55, 57, 62, 63, 65, 66, 68 |
| OVERSTATED | A real problem, stated here in corrected form | 24 | 2, 3, 4, 5, 6, 7, 8, 9, 11, 16, 17, 19, 20, 21, 29, 30, 31, 34, 38, 41, 47, 49, 51, 52 |
| BY-DESIGN | Dropped: a deliberate, documented convention or decision | 15 | 23, 27, 28, 35, 39, 43, 44, 45, 46, 48, 54, 58, 61, 67, 71 |
| NOT-A-BUG | Dropped: the entry was wrong | 14 | 10, 15, 25, 33, 36, 37, 40, 53, 56, 59, 60, 64, 69, 70 |

**What survives, by corrected severity:**

| Severity | Meaning | Count | Bugs |
| --- | --- | ---: | --- |
| High | The document contradicts itself, or something breaks in normal use or at deploy | 25 | 1, 2, 3, 6, 8, 12, 13, 14, 16, 17, 22, 24, 31, 32, 42, 50, 51, 52, 55, 57, 62, 63, 65, 66, 68 |
| Medium | No contradiction; breaks only under a condition, or not yet proven | 4 | 4, 5, 18, 26 |
| Low | Minor gaps, judgment calls and values with little effect | 13 | 7, 9, 11, 19, 20, 21, 29, 30, 34, 38, 41, 47, 49 |

**Reading `field_required` in section 5.3:** at deploy it is only a prompt that defaults to optional, and fast flow never asks (A2:208). So problem E below is wrong data, not a failed save.

**What holds.** These cross-checks pass:

- The 9 entities match across sections 2, 3 and 6.4 and the diagram.
- The 16 diagram links match sections 5.1 and 5.2.
- The dashed diagram nodes match `install_optional`.
- The 7 gates match across sections 7, 8.1 and 9.1.
- The 4 personal-content entities match the 8 overrides and 4 rules.
- The frontmatter personas match the RACI actors.

## Distinct problems

The 25 High bugs touch problems A to K, plus standalone bugs 55 and 65.

| Problem | Bugs | What is wrong |
| --- | --- | --- |
| A. Terminal lifecycle flags | 1, 32, 34 | Canonical terminal states leave no way back |
| B. No interviewer link | 12 | A standalone install cannot record who interviews |
| C. Row-scope has one owner | 13, 14, 24, partly 2 | Single owner link, no route for other personas, no override grant |
| D. Handoff transition | 42 | The transition comes from the event's entity, the payload from another |
| E. Cross-module `is_required` too strong | 4, 5, 6, 7, 8, 9, 11, 20, inversely 21 | Shown as `yes` with no hint it is only a prompt; review deferred by plan:253 |
| F. In-blueprint `is_required` ignores lifecycle | 3, 16, 22 | Required before the person or posting is known |
| G. Optional entity left out | 17, 18, 19 | No stated behavior when it is absent |
| H. Canonical descriptions in a starter | 50, 51, 52, 57 | Deployed verbatim; bug-50 also has a real modeling gap |
| I. Handoff payload choice | 30, 31 | The q31 family |
| J. Stale text after q8 | 62, 63 | Text left behind by the event change |
| K. Generator or template wording | 47, 66, 68 | Labels and fixed strings |

Standalone problems: 26, 29, 38, 41, 49, 55, 65.

## What breaks

This table says what actually goes wrong, so it sets the fix order. Every bug that breaks something is High. Of the 25 High bugs, 12 break something (1, 2, 3, 12, 13, 14, 16, 22, 24, 32, 42, 50) and 9 are wording only (17, 31, 51, 52, 57, 62, 63, 65, 68).

| Value | Meaning | Count |
| --- | --- | ---: |
| Yes | Something goes wrong in normal use or at deploy | 12 |
| Conditional | It goes wrong only under the stated condition | 8 |
| Unproven | The skill text suggests a problem, but no deploy has tested it | 2 |
| No | Nothing fails; the document is simply wrong or inconsistent | 20 |

| Bug | Severity | Breaks something | What breaks |
| --- | --- | --- | --- |
| bug-1 | High | Yes | A check flagged after acceptance has no state to move the offer to. |
| bug-2 | High | Yes | Without requisitions, a job's hiring manager cannot be named. |
| bug-3 | High | Yes | In forms only: an application needs a posting. API inserts still save. |
| bug-6 | High | Conditional | Only if someone makes the link mandatory at install. A form then cannot save a requisition without a plan. |
| bug-8 | High | Conditional | Only where the link is applied, such as COMP-STATEMENTS. |
| bug-12 | High | Yes | An interview cannot record who is interviewing. |
| bug-13 | High | Yes | With the default row-scope rule, the drafting recruiter cannot see the offer unless named approver. |
| bug-14 | High | Yes | With the default row-scope rule, the hiring manager holds the hire gate without seeing applications. Fully under `raci`. |
| bug-16 | High | Yes | In forms only: a recruiter must be picked. An API insert saves, but the unowned row is hidden by row-scope. |
| bug-17 | High | No | Wording only. |
| bug-22 | High | Yes | In forms only: a drafter must pick a publisher, approver or recruiter up front. |
| bug-24 | High | Yes | A candidate with no recruiter is visible only to `view_all` holders. |
| bug-31 | High | No | Description text only. |
| bug-32 | High | Yes | Re-engaging an archived candidate creates an open application while the candidate stays archived. |
| bug-42 | High | Yes | The analyst and modeler rules treat the mismatch as a stop. Not proven by a deploy. |
| bug-50 | High | Yes | An application's own source has no link to record it. |
| bug-51 | High | No | Description text only. |
| bug-52 | High | No | Description text only. |
| bug-55 | High | Conditional | Only if availability slots are installed. A multi-interviewer interview then cannot book each slot. |
| bug-57 | High | No | Wording only. |
| bug-62 | High | No | Wording only. |
| bug-63 | High | No | The name confuses, and L206 explains it. |
| bug-65 | High | No | A blank cell. The state exists in section 7. |
| bug-66 | High | Unproven | Default grants naming `manage` and `read` may not resolve at deploy. |
| bug-68 | High | No | A fixed sentence that reads wrong. |
| bug-4 | Medium | Conditional | Not in the starter unless chosen at install. Applied in ATS-CANDIDATE-CRM. |
| bug-5 | Medium | Conditional | Not in the starter unless chosen at install. Applied in ATS-CANDIDATE-CRM. |
| bug-18 | Medium | Unproven | Handoffs and section 9 may still name a dropped requisition entity. No deploy test. |
| bug-26 | Medium | Conditional | Only under `raci`: no Accountable can hold these gates. |
| bug-7 | Low | No | Prompt only, and no module carries both ends. |
| bug-9 | Low | No | The analyst docs never apply this value. |
| bug-11 | Low | Conditional | Only if someone makes the link mandatory at install. |
| bug-19 | Low | No | Idle rows only. |
| bug-20 | Low | No | Prompt only, and no module carries both ends. |
| bug-21 | Low | No | `no` only skips a prompt here. |
| bug-29 | Low | No | A judgment call. |
| bug-30 | Low | No | The payload choice breaks nothing in the starter. |
| bug-34 | Low | No | An offer abandoned before sending simply stays open. Nothing fails. |
| bug-38 | Low | Conditional | Only if `people_kpis` exists. A junction table is then proposed. |
| bug-41 | Low | No | Two optional external rows. |
| bug-47 | Low | No | Reader inconvenience only. |
| bug-49 | Low | No | Reader inconvenience only. |

## Surviving bugs

Citation keys:

- **L:** current blueprint line.
- **rel / h / ev:** live `data_object_relationships` / `handoffs` / `trigger_events` id.
- **tmpl:** architect `semantic-blueprint-template.md`.
- **audit:** architect `audit-checklist.md`.
- **stage-7, stage-11:** architect `stage-7-handoffs.md`, `stage-11-governance.md`.
- **A2, A3, A4, A7, A9, A10:** analyst `stage-2-inspect`, `stage-3-collisions`, `stage-4-fields`, `stage-7-select-rule`, `stage-9-governance`, `stage-10-rules`.
- **M1, M4:** modeler `stage-1-parse`, `stage-4-execute`.
- **SKILL:** `domain-map-analyst/SKILL.md`.
- **hist, q, state:** `audits/ATS/history.md`, `q-ATS.md`, `state.yaml`.
- **plan:** `plans/blueprint-external-links-plan.md`.

## High

### bug-1: A flagged background check cannot affect an accepted offer

**Verdict:** REAL. `accepted` is terminal (L302, tmpl:302, A10:99) and `rescinded` means after sent (L304), yet the handoff says a flagged check may force rescission, and q:142 says screening is ordered at acceptance.

**Contradiction:** An offer may be rescinded when a check is flagged, but `accepted` is terminal and `rescinded` means after being sent.

### bug-2: Without requisitions, nothing names a job's hiring manager

**Verdict:** OVERSTATED. rel 2739 is the only hiring manager link, but gates come through roles (A9:66,72) and the manager can be offer approver (rel 825, L429). Lost: naming a job's manager, not a process.

### bug-3: Form entry of an application requires a posting

**Verdict:** OVERSTATED. rel 809 applies, but only as UI-mandatory (M1:175); h1061-style automation still saves. Form entry without a posting is blocked. A draft posting works around it, and without requisitions a posting is the job anchor.

### bug-6: `headcount_plans authorizes job_requisitions` is marked required, which contradicts the backfill handoff

**Verdict:** OVERSTATED. Prompt only (A2:208); nothing blocks saving a requisition. L145 contradicts L222 within the document. rel 1022.

**Contradiction:** A requisition must have a headcount plan, but some orgs auto-open backfills.

### bug-8: `job_offers seeds compensation_statements` is marked one_to_one and required, though statements recur

**Verdict:** OVERSTATED. Prompt only here (A2:208). rel 829 contradicts L210 and the entity description ("on hire, merit cycle close, and annually"). COMP-STATEMENTS carries both ends, so it can apply there.

**Contradiction:** One statement per offer, but statements go into cycle history.

### bug-12: A Hiring Starter interview cannot record its interviewers

**Verdict:** REAL. rel 823 `coordinates` is the only users link on interviews; panelists moved to `interview_panels` (hist:680), which is external (L178). Scorecard author (L123) is optional and comes later. L31 promises interviewers.

**Contradiction:** Interviews have one or more interviewers, but the only people link on an interview is `coordinates`.

### bug-13: The recruiter drafting an offer has no link to it

**Verdict:** REAL. The catalog has only rel 825 between offers and users. The row-scope owner is that link (A7:13-15, R8), so the drafting recruiter (L298, L428) cannot see the draft unless named approver.

### bug-14: The hiring manager and other personas have no route to the rows they work on

**Verdict:** REAL. The default rule is owner or `view_all` (A7:15); overrides roll up to admin only (L392-399); RACI grants write tier and gates only (M4:412-414). The manager holds the hire gate (L422) without seeing applications. Bites fully only under `raci`.

### bug-16: The application's recruiter is mandatory in forms, while the candidate's recruiter is optional

**Verdict:** OVERSTATED. UI-mandatory only (M1:175), so an API or portal insert saves. What remains: rel 822 required against rel 1343 optional, unexplained, and an unowned row hidden by row-scope.

### bug-17: Postings and applications are described against a requisition, which is optional

**Verdict:** OVERSTATED. Text only: the canonical description is deployed verbatim (tmpl:52), and L101 covers absent entities. Inaccurate wording in a no-requisition install; nothing fails.

**Contradiction:** Postings and applications exist against a requisition, but requisitions are optional.

### bug-22: Forms require people before their step happens

**Verdict:** REAL. L120, L124, L126 apply as required (tmpl:197, M1:175), while L298, L312, L324 describe drafts. A drafting manager must pick a recruiter in the form. q3 kept `is_required` (hist:680). UI only.

**Contradiction:** A posting, offer or requisition starts as a draft, but its publisher, approver or recruiter is already required.

### bug-24: A candidate with no recruiter is visible only to `view_all` holders

**Verdict:** REAL. L125 is optional with `clear`; the default rule has no unassigned clause (A7:15), so such a row shows only to `view_all` holders. `select-rule.md:83` shows an unassigned pattern, but nothing prompts it.

### bug-31: The onboarding handoff's description overclaims what its payload holds

**Verdict:** OVERSTATED. The text overclaims: candidates hold no role or location, and h2 carries that context. But section 6 is "informational context, not a contract" (stage-7:15), and payload names the changed entity (audit:162). No failure.

**Contradiction:** The onboarding payload carries role, location and manager context, but the payload is `candidates`.

### bug-32: `archived` candidates can never come back

**Verdict:** REAL. State 208 is terminal, with no moves out (tmpl:302, A10:99). h1061 notes say re-engagement creates a new application, so an archived candidate gets an open application while stuck archived, against L251.

**Contradiction:** An active candidate has an open application, but `archived` is terminal and re-engaging creates an application.

### bug-42: Inbound handoffs show a state that is not on their payload, which the analyst and modeler treat as a stop

**Verdict:** REAL. A2:214 and M1:97 check an inbound row's `to_state` against its section 3 payload, and a mismatch stops. `terminated`, `hot`, `completed_consider` and `draft -> approved` all mismatch. `completed_consider` was added by the 2026-11-02 fix (blank before). Unproven by deploy.

**Contradiction:** Each row shows a state that section 7 does not list for its payload.

### bug-50: Applications promise a source that has no link

**Verdict:** REAL. L28 lists source; the only link is L111 to candidates, so per-application source has no home. hist:732: "Finding 1.7, no source link on applications, stays open."

**Contradiction:** Applications carry a source, but sources link only to candidates.

Status: `history.md` records this as finding 1.7, still open.

### bug-51: The offer description mentions an approval chain the starter does not include

**Verdict:** OVERSTATED. Canonical description reused verbatim (tmpl:52). The starter has one approver (L124); the chain is external (hist:680). Wording mismatch in deployed text, no failure.

**Contradiction:** Offers have an approval chain, but there is one approver link and the chain is outside the starter.

### bug-52: The application description overclaims "full evaluation history"

**Verdict:** OVERSTATED. Pipeline stage is met by section 7 (L284-290). Only "full evaluation history" overclaims. Same cause as bug-51.

**Contradiction:** Applications have full evaluation history, but the stage history is outside the starter.

### bug-55: One availability slot per interview conflicts with several interviewers

**Verdict:** REAL. rel 1328 is one_to_one; a slot is one interviewer's window (live description), and L31 allows several. A multi-interviewer interview cannot book each slot. External and optional, so nothing in the starter breaks.

**Contradiction:** One or more interviewers, but one availability slot per interview.

### bug-57: "Approved requests to hire" includes unapproved states

**Verdict:** REAL. L33 says approved, while L324-325 are `draft` and `pending_approval`. Direct wording contradiction in deployed text, no functional effect.

**Contradiction:** Requisitions are approved requests, but they start as `draft` and `pending_approval`.

### bug-62: "Signed offer" refers to a state that does not exist

**Verdict:** REAL. L210 says signed; offers have no signed state (L296-304). hist:728: left as is, not covered by approval. Stale text, not chosen wording.

**Contradiction:** "Signed offer", but no `signed` state exists.

### bug-63: `headcount.approved` is a confusing name for a requisition opening

**Verdict:** REAL. ev 62 fires `pending_approval` to `open`, and its name reads like ev 1790. hist:728 concedes it. L206 explains it, so only the name confuses.

**Contradiction:** The event is `headcount.approved`, but it fires when a requisition opens.

### bug-65: Transitions are blank where the state exists

**Verdict:** REAL. ev 364 and 372 have blank `to_state` although the states exist (L263, L289), while ev 80 has one. B9c warns on both (state:190), and audit:161 expects it on lifecycle rows.

**Contradiction:** `job_offer.accepted` shows its state, but `job_application.rejected` and `interview_scorecard.submitted` show none, though both states exist.

### bug-66: Section 9.2 role names may not resolve at deploy

**Verdict:** REAL. tmpl:437 requires viewer/manager/admin; the generator prints read/manage (`blueprint_invariants.ts:115`). R1 aliases them, but M4:468 names only the baseline three, so these may not resolve.

**Contradiction:** Roles are `_manager` and `_viewer`, but the grants say `manage` and `read`.

### bug-68: The section 6.1 sentence says owners embed their own masters

**Verdict:** REAL. `generate_blueprints.ts:792` is a fixed string saying owners "embed" masters, while section 6.4 says they own them. Reads wrong, no consequence.

**Contradiction:** Owners embed their masters, but section 6.4 says they own them.

## Medium

### bug-4: `recruitment_agencies sources candidates` is marked required, though not every candidate has an agency

**Verdict:** OVERSTATED. Prompt only in the starter, default optional (A2:208, A3:343). The value is still wrong: rel 813 is applied in `ats-candidate-crm` L168, and q7's reasoning fits it.

### bug-5: `recruitment_events attracts candidates` is marked required, though not every candidate comes from an event

**Verdict:** OVERSTATED. Same as bug-4: prompt only here (A2:208). rel 814 is applied in `ats-candidate-crm` L169, so "agency and event" only bites in the full module.

### bug-18: Nothing says what happens to requisition gates, process and handoffs when requisitions are left out

**Verdict:** REAL. A dropped entity is "skipped from all later stages" (A3:51), yet handoffs and section 9 carry "verbatim" (A2:216, A9:97). Fast flow drops optionals (A3:13). Consequence unproven: test deploy skipped (plan:5).

### bug-26: Three gates have no process: `close_requisition`, `flag_do_not_hire`, `rescind_offer`

**Verdict:** REAL. States 207, 230, 240 are gated with no process (state:209, SKILL:1270-1272). No issue under `gated`; under `raci` no Accountable can hold them (audit:22). The document flags it; nobody decided.

## Low

### bug-7: `job_offers triggers benefit_enrollments` is marked one_to_one and required, which is false

**Verdict:** OVERSTATED. Prompt only (A2:208). rel 828: no module carries both ends, so no blueprint ever applies it. The value is false (enrollment is per employee per plan), but nothing blocks.

### bug-9: `candidates becomes employees` is marked required, which is too strong

**Verdict:** OVERSTATED. The analyst docs cite this exact row as too strong and never apply it (A2:208, A3:346, plan:56). The value stays by decision (plan:253). Employees are not blocked.

### bug-11: `interview_panels produces interview_scorecards` is marked required, with little effect

**Verdict:** OVERSTATED. Prompt only (A2:208). A panel is a junction of "interviewers assigned to a specific interview" (`ats-interviews` L31, L93), so one interviewer is a panel of one. q2 is stale.

### bug-19: Left-out scorecards and sources leave an idle notification and idle handoffs

**Verdict:** OVERSTATED. An event on an uninstalled entity simply does not fire, which a reader can infer. Same root as bug-18, with no gates involved: one idle Informed row and two idle handoffs.

### bug-20: `job_offers spawns onboarding_journeys` is marked one_to_one and required, which is false

**Verdict:** OVERSTATED. Prompt only (A2:208). rel 827: no module carries both ends. The value is false (journeys also start from `employee.created`, per the live description), but nothing blocks.

### bug-21: Candidate child links split into required and optional along composition and reference

**Verdict:** OVERSTATED. Mechanical split: 287 of 287 composition links are required; notes and documents are composition (rel 1495, 1496), the others reference. Here `no` only skips a prompt. Optional junction leg (rel 1497) is a catalog flaw.

### bug-29: Whether interviews should be personal content is a judgment call

**Verdict:** OVERSTATED. The flag means owner-scoped rows (SKILL:243); the only users link is a coordinator. B4 reviewed ATS without proposing it (hist:678). tmpl:141 wording favors the claim, so this is a judgment call.

### bug-30: The benefits handoff carries the candidate rather than the enrollment

**Verdict:** OVERSTATED. The catalog has both: h2, h120 (`job_offer.accepted`) and h394, h395 (`candidate.hired`). The starter shows in-scope payloads only (`catalog.ts:829`). A link and a trigger differ. What remains is the q31 payload.

Status: q31 in `q-ATS.md` is open.

### bug-34: An offer abandoned before sending has no terminal state

**Verdict:** OVERSTATED. Refusal can return to non-terminal `draft`; no reply can be rescinded (L304). What remains: an offer abandoned before sending has no terminal state.

### bug-38: `job_requisitions feeds people_kpis` is the only many_to_many KPI link

**Verdict:** OVERSTATED. The outlier is real: rel 832 is the only many_to_many of 7 `people_kpis` links, on a computed entity. It is only proposed when that entity exists (A2:211).

### bug-41: Recruiter interactions and candidate notes duplicate each other

**Verdict:** OVERSTATED. The duplicate is real (market surface S1, q:161-167), but only two optional external rows here and nothing breaks.

Status: q26 was answered in chat (merge) and is not applied; `a26:` in `q-ATS.md` is still blank.

### bug-47: Three terms have no definition anywhere: `signal`, `⚠ no process`, "demotion path"

**Verdict:** OVERSTATED. The template defines most terms (tmpl:134, 198, 200, 262, 269, 304) and has no legend by format. Only `signal` (SKILL:264, not tmpl:262), `⚠ no process` and "demotion path" lack a template definition.

### bug-49: Four handoffs have no description

**Verdict:** OVERSTATED. L209, L213, L223 and L224 have none. 112 of 1,485 handoffs are blank catalog-wide. Reader inconvenience only.

## Dropped entries

These 29 are not bugs. The second column is what the first pass claimed, kept only so the numbers stay traceable. It is not a finding.

| Bug | What the first pass claimed | Verdict | Why it was dropped |
| --- | --- | --- | --- |
| bug-10 | Every data subject request must belong to a candidate | NOT-A-BUG | The entity is defined as a request "from a candidate" (live description, `ats-candidate-crm` L39). Others are out of scope, and it is prompt only here. Re-homing is tracked separately (hist:684). |
| bug-15 | The default Recruiting grant cancels gates and row-scope | NOT-A-BUG | M4:466-470 grants the `_admin` role its `:admin` permission; no user or persona receives it from section 9.2. Recruiter personas are separate roles (M4:408-414). Admin holding gates is tmpl:375. |
| bug-23 | Row-scope has no defined owner | BY-DESIGN | The analyst decides the owner (tmpl:142, A7:13). Each of the four entities has exactly one users link (L121, L123, L124, L125), as R8 expects (`blueprint_invariants.ts:332-351`). The owner is determinate. |
| bug-25 | `:read` conflicts with row-scope | NOT-A-BUG | "Every entity" is table-level; `select_rule` replaces row visibility (A7:19). L347 and L360 say row-scope holds unless overridden, so viewers including Finance are scoped too. The document answers it. |
| bug-27 | Legal gets edit rights it has no process for | BY-DESIGN | Section 9.2 is market-level, "distinct from" section 9.1 (tmpl:425). M4:466-470 grants the baseline role, not Legal staff. L423 is the persona layer, so no edit right reaches a Legal persona. |
| bug-28 | A consumer entity has a write tier | BY-DESIGN | The tier derives from `entity_type` (tmpl:144), and `users` is `operational_record` (audit:152). The deployer reuses the built-in. A reader may misread it, but it is the documented derivation. |
| bug-33 | `hired` candidates are terminal despite other applications and reapplying | NOT-A-BUG | Applications have their own states (L288-290), unaffected. L221 says internal applicants get a newly materialized candidate record, and rel 2266 is one_to_many. Nothing is blocked. |
| bug-35 | Talent pool membership is modeled twice | BY-DESIGN | "If an explicit junction entity already links both ends, none is created" (A2:211); plan:156 names `talent_pool_memberships`. L131 misleads someone reading the document alone. |
| bug-36 | Candidates and employees point at each other | NOT-A-BUG | Two facts with fields on different tables: rel 2266 optional on candidates, rel 830 on employees and prompt only. No save deadlock. "Becomes" on internal hires is wording at most. |
| bug-37 | Requisitions and demand forecasts have two links | NOT-A-BUG | Different facts: rel 1023 forecast triggers requisition; rel 831 filled requisition updates actuals, which L215 states. The document explains it. |
| bug-39 | Redundant paths can disagree | BY-DESIGN | Blueprints carry no JsonLogic (tmpl:455); cross-record rules belong to analyst Stage 10 (A10:95,104). The catalog has 1,159 such triangles, so the pattern is the norm. |
| bug-40 | EEO responses and voluntary self-identifications look like the same record | NOT-A-BUG | Live description of `voluntary_self_identifications`: "Distinct from `eeo_responses`" (survey response against offer/decline decision and audit data). Deliberate, and both are external here. |
| bug-43 | "The gated entities' write tier" cannot be resolved | BY-DESIGN | The phrase is template text, including for a no-gate process (tmpl:405-406, tmpl:419, stage-11:35-37). It resolves to the write tier (M4:414), `:manage` on all but one entity here. Only the no-gate case is vague. |
| bug-44 | Lifecycles have no transitions | BY-DESIGN | The section 7 format has no transition column by template (tmpl:291-305). Order and terminal flags are the contract; ordering rules come in analyst Stage 10 (A10:93). |
| bug-45 | The section 5.3 headings read backwards | BY-DESIGN | Direction is where the field sits, "not the from / to columns" (tmpl:217-222, plan:116). Rows are placed correctly. The document does not restate this, so a lone reader may be puzzled. |
| bug-46 | External entities name no owning module | BY-DESIGN | The analyst resolves external entities by name and concept against live (A2:170-199); notes hints are optional (tmpl:234); ownership is settled at deploy (stage-7:33). Reader-only gap. |
| bug-48 | Personas do not map to baseline roles | BY-DESIGN | A persona is its own role with the write tier (A9:66,72; M4:404-414), not a baseline role, and exists only under `raci`. The realization column states the grant (tmpl:417-421). |
| bug-53 | Candidates promise records kept outside the starter | NOT-A-BUG | The analyst drafts fields per entity (A4:7), so resume, tags and consent can be fields, as the original finding itself concedes. No promise is broken. |
| bug-54 | The upgrade path is not explained | BY-DESIGN | Defined in SKILL:498, tmpl:134, tmpl:459 and M4:485. audit:70-71 keeps such narration out of section 1. Blueprints are consumed with those skills. |
| bug-56 | Scorecards promise a rubric that is not in the starter | NOT-A-BUG | Per-competency ratings can be fields (A4:7); `interview_kits` are reusable templates, not the only possible rubric. Nothing promised is unreachable. |
| bug-58 | "Leaves out the requisition approval chain" reads as false | BY-DESIGN | hist:709 records the wording as user-approved: `requisition_approvals` is out, the gate stays. Accurate under that definition. |
| bug-59 | Two different data claims for the upgrade | NOT-A-BUG | Both mean same table, no migration (SKILL:498). L7 is buyer voice (tmpl:469), L22 analyst voice. No contradiction. |
| bug-60 | The tagline overclaims | NOT-A-BUG | The tagline is marketing voice by template (tmpl:468), and A4 passed (hist:678). Opinion, not a failure. |
| bug-61 | `related_modules` omits the pre-employee module | BY-DESIGN | Derived from owners, handoffs and persona reach (`catalog.ts:906-942`); the starter has 0 `role_modules` rows. The field is advisory (tmpl:473). |
| bug-64 | Event names use inconsistent prefixes | NOT-A-BUG | 281 of 1,724 event prefixes do not match the entity singular, by a rough match. No rule requires it. Nothing breaks. |
| bug-67 | The `high risk?` column is blank on every state | BY-DESIGN | Cells show `-`, the template default (tmpl:304). 0 of 1,084 gated states are high risk catalog-wide. q9 tracks the decision; audit:132 is only a suggestion. |
| bug-69 | Verb styles are mixed | NOT-A-BUG | 645 of 2,548 verbs contain underscores, a common catalog pattern, and the consistency checker passes. Style preference, no failure. |
| bug-70 | Processes are out of order | NOT-A-BUG | Order is first-seen in lifecycle rows, as documented (`blueprint_derive.ts:566`). No rule requires PCF order. Nothing depends on it. |
| bug-71 | Published process descriptions contain poor text | BY-DESIGN | Verbatim APQC text (`business_processes` 1014, 1017, framework `apqc_pcf_cross_industry`). A9:77 forbids rewording or fixing grammar. Poor text, but deliberate. |

## Limits of the verdicts

- **No deploy test.** Bug-42, bug-18 and every "UI-mandatory" conclusion come from skill text, not observed behavior. The plan says the test deploy was skipped (plan:5).
- **Access level is unknown.** The blueprint has no `access_scope`. Bug-14 bites fully only under `raci`, though `_manager` users are row-scoped under `advanced` and up.
- **Row-scope bugs assume the analyst's default shape.** Bugs 13, 14 and 24 assume A7's owner-plus-oversight rule. An analyst could author a broader rule.
- **Modeling judgments are bounded.** Bugs 3, 29, 32 and 34 rest on catalog text and skill rules, not a re-check of vendor products.
- **What counts as a contradiction.** The `Contradiction` lines are the main agent's reading, not part of the independent pass. Bugs 22, 32 and 63 are the weakest of them.
- **What breaks.** That table is the main agent's reading of the evidence, not part of the independent pass.
- **Spot checks.** The main agent read the citations for the 15 BY-DESIGN verdicts and for bugs 4, 14, 15, 42 and 66. The other verdicts rest on the independent pass alone.
- **Checks not re-run.** R6 and R8 were not recomputed for the verdicts. `state.yaml` `checks:` is from version 1 (2026-11-01).
