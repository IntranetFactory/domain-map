# Hiring Starter blueprint review

- **Date:** 2026-11-02
- **Reviewed file:** [hiring-starter-semantic-blueprint.md](../../catalog/blueprints/hiring-starter-semantic-blueprint.md), blob `a84dc88`. L numbers refer to blob `1fd13a2`, and to other blueprints only where named.
- **Question asked:** is the document logical and self-contained?
- **Method:** a first pass read the document alone and numbered 71 entries. A second, independent pass tried to disprove each one against the blueprint template, the deploy skills, the plan, the generator, the audit decisions and the live catalog. This report states what survived. The first pass's wording is in commit `be8630f`.
- **Scope:** sections 6.1 to 6.3 are postponed and not reviewed: see [Postponed sections 6.1 to 6.3](#postponed-sections-61-to-63).

## Open bugs by kind of fix

| Type | Bugs | Count |
| --- | --- | ---: |
| **Recurring:** too few relationships to `users` | 12, 13 | 2 |
| **Recurring:** reversible or mid-life states marked terminal | 1, 32, 34 | 3 |
| **Recurring:** subsets lose what the full module provides | 2, 17, 51, 52 | 4 |
| **Recurring:** gates with no process | 26 | 1 |
| **Recurring:** later actor required on a draft | 22 | 1 |
| **One-off:** too-strong `is_required` values | 4, 5, 6, 7, 8, 9, 11, 20 | 8 |
| **One-off:** single values, wording or judgment calls | 21, 29, 38, 41 | 4 |

The 27 open bugs are these 23 data bugs plus 14, 18, 19 and 47, which are not data fixes.

### Details

**Bold** bugs are High.

| Type | Kind of fix | Bugs | What changes | Evidence across the catalog | Breaks something? |
| --- | --- | --- | --- | --- | --- |
| **Recurring** | Relationships to `users` | **12**, **13** | New relationships to `users`, or carrying another entity in the starter | B7 passes at one relationship, and its ATS example names only the coordinator on interviews and the approver on offers (SKILL:1062). 212 of 592 workflow entities have 2+ gates and at most one `users` relationship | Both |
| **Recurring** | Terminal states | **1**, **32**, 34 | `accepted` (228) and `archived` (208) need a way out or a new state; an offer abandoned before sending needs an end state | The only check is for at least one terminal state (SKILL:1197). 123 states in 55 of 174 domains have names like `archived` or `accepted` | Yes: 1, 32. No: 34 |
| **Recurring** | Subsets | **2**, **17**, **51**, **52** | Neutral catalog descriptions (17, 51, 52); a new relationship, or carrying another entity in the starter (2) | One description per entity, and Rule #19 does not test whether a subset works alone (SKILL:483). 13 of 52 starter entity rows name an entity outside the starter | Yes: 2. No: 17, 51, 52 |
| **Recurring** | Gates with no process | 26 | A process for states 207, 230, 240 | E4b only warns (SKILL:1270). 923 of 1,084 gates in 84 domains have no process | Conditional |
| **Recurring** | Required too early | **22** | `is_required` on relationships 821, 825, 1344 | The definition does not ask whether the person is known at first save (`module-shape.md:308`). 17 candidates in 13 domains | Yes |
| One-off | Too-strong values | 4, 5, 6, 7, 8, 9, 11, 20 | `is_required` on relationships 813, 814, 827, 828, 829, 830, 1022, 1326; cardinality on 827, 828, 829 | 81 such relationships, mostly older: in the newest third of relationship IDs, 3 of 55 cross-domain relationships are required. Cardinality is less clear: 3 of the 8 `one_to_one` relationships touching ATS are wrong, and the catalog's 93 are unreviewed | Conditional: 4, 5, 6, 8, 11. No: 7, 9, 20 |
| One-off | Single values and decisions | 21, 29, 38, 41 | `is_required` on relationship 1497 (21); cardinality on 832 (38); the q26 merge (41); a decision on personal content (29) | Single rows or decisions | Conditional: 38. No: 21, 29, 41 |
| Not data | Deploy rules | **14** | Row-scope and RACI grants for the people who are not the owner | - | Yes |
| Not data | Optional-entity rules | 18, 19 | Say what happens to gates, processes and notifications when an optional entity is left out | - | Unproven: 18. No: 19 |
| Not data | Template terms | 47 | Define `⚠ no process` and "demotion path" | - | No |

- **Recurring** means the skill gap recurs. Each bug's row is still a one-off fix in the data, but new domains can get the same problem until the skill changes. Subsets recur per new starter or optional entity, not per domain.
- **Terminal states, relationships to `users` and bug 2** need decisions before any row is drafted. Bug-2, for example, exists only because requisitions are optional in the starter.
- **Subsets** has a catch: the wording in bugs 17, 51 and 52 is true for the full modules but false for the starter. The description is shared and there is no per-module text field, so a fix means neutral wording for every module.
- **Bug 14** could partly be solved with data instead, by adding relationships. It is placed where the rule that causes it lives.
- **Worth a spot-check:** 62 of 170 entity pairs named in a description have no direct relationship, by a rough text match.
- This grouping is the main agent's reading of the evidence, not part of the independent pass. The catalog figures come from a read-only count on the 2026-11-03 catalog. Figures based on state names, verbs or description text are candidates, not confirmed bugs, and the newest loaded domains were first audited in June 2026, so they do not test today's skill.

## Summary

**27 bugs are open. They come down to about 12 distinct problems, and 10 are High.** Anything that contradicts itself or breaks something is rated High.

The document is not fully logical, because the problems below are real. It is also not self-contained, and that part is by design: the format relies on the template and the deploy skills to define its terms (bugs 35, 44, 45, 46, 48, 54).

| Verdict | Meaning | Count | Bugs |
| --- | --- | ---: | --- |
| REAL | Confirmed as first stated | 8 | 1, 12, 13, 14, 18, 22, 26, 32 |
| OVERSTATED | A real problem, stated here in corrected form | 19 | 2, 4, 5, 6, 7, 8, 9, 11, 17, 19, 20, 21, 29, 34, 38, 41, 47, 51, 52 |
| BY-DESIGN | Dropped: a deliberate, documented convention or decision | 15 | 23, 27, 28, 35, 39, 43, 44, 45, 46, 48, 54, 58, 61, 67, 71 |
| NOT-A-BUG | Dropped: the entry was wrong | 14 | 10, 15, 25, 33, 36, 37, 40, 53, 56, 59, 60, 64, 69, 70 |

**Open bugs by severity:**

| Severity | Meaning | Count | Bugs |
| --- | --- | ---: | --- |
| High | The document contradicts itself, or something breaks in normal use or at deploy | 10 | 1, 2, 12, 13, 14, 17, 22, 32, 51, 52 |
| Medium | No contradiction; breaks only under a condition, or not yet proven | 6 | 4, 5, 6, 8, 18, 26 |
| Low | Minor gaps, judgment calls and values with little effect | 11 | 7, 9, 11, 19, 20, 21, 29, 34, 38, 41, 47 |

**Reading `field_required` in section 5.3:** at deploy it is only a prompt that defaults to optional, and fast flow never asks (A2:208). So problem E below is wrong data, not a failed save.

**What holds.** These cross-checks pass:

- The 9 entities match across sections 2, 3 and 6.4 and the diagram.
- The 17 diagram relationships match sections 5.1 and 5.2.
- The dashed diagram nodes match `install_optional`.
- The 7 gates match across sections 7, 8.1 and 9.1.
- The 4 personal-content entities match the 8 overrides and 4 rules.
- The frontmatter personas match the RACI actors.

## Postponed sections 6.1 to 6.3

Sections 6.1, 6.2 and 6.3 are postponed, so handoffs are outside this review. The generator shows these sections as if they had no data; the switch is `POSTPONE_SECTIONS_6_1_TO_6_3` in [generate_blueprints.ts](../../scripts/generate_blueprints.ts). The handoff data needs its own review before the sections return.

Only the rows those sections show are absent. The catalog still loads in full, so `related_modules` and section 6.4 are complete. Section 6.1 would be empty anyway, because the starter masters nothing.

**Gaps while the sections are empty:**

- **Overview claims:** the overview says the starter reacts when a background check is flagged and that an accepted offer hands the new hire to HCM. No row in section 6 backs either, and lint does not catch it. The text is the module's catalog description.
- **`hcm-lifecycle-workflows`:** it is in `related_modules` with nothing in the document showing why. The other 14 related modules are explained by section 5.3 or 6.4.

**Effect at deploy:** the modeler wires no handoffs, with or without these rows. Stage 4m wires one only if the platform has a trigger registry (M4:479). CLI v0.8.18 has no trigger or transition tool, and `transition_event_triggers` does not exist on `domain-map.semantius.cloud`. So no live behavior depends on them. Also absent while the sections are empty:

- the parse-time state check that stops on a mismatch (M1:98);
- the "not wired" lines in the deploy report;
- the copy of the handoffs in the spec, which documents the intent (A2:216);
- the relationships the analyst implies from these rows (A2:170). The effect on the starter was not measured.

**Scope of the switch:** it applies to every CLI build. Only the Hiring Starter file has been built with it. `--regenerate --check` reports that 54 of 55 blueprints would change, so `--regenerate` and `build_catalog.ts` would empty these sections in all of them.

**Checks on this build:** R6 reports 0 warnings because it has no rows to check. The architect checker reports 0 issues.

## Distinct problems

The 10 High bugs touch problems A, B, C, F, G and H.

| Problem | Bugs | What is wrong |
| --- | --- | --- |
| A. Terminal lifecycle flags | 1, 32, 34 | Canonical terminal states leave no way back |
| B. No interviewer relationship | 12 | A standalone install cannot record who interviews |
| C. Row-scope has one owner | 13, 14, partly 2 | Single owner relationship, no route for other personas, no override grant |
| E. Cross-module `is_required` too strong | 4, 5, 6, 7, 8, 9, 11, 20, inversely 21 | Shown as `yes` with no hint it is only a prompt; review deferred by plan:253 |
| F. In-blueprint `is_required` ignores lifecycle | 22 | Required before the person is known |
| G. Optional entity left out | 17, 18, 19 | No stated behavior when it is absent |
| H. Canonical descriptions in a starter | 51, 52 | Deployed verbatim |
| K. Generator or template wording | 47 | Labels and terms with no definition |

Standalone problems: 26, 29, 38, 41.

## What breaks

This table says what actually goes wrong, so it sets the fix order. Every bug that breaks something is High. Of the 10 High bugs, 7 break something (1, 2, 12, 13, 14, 22, 32) and 3 are wording only (17, 51, 52).

| Value | Meaning | Count |
| --- | --- | ---: |
| Yes | Something goes wrong in normal use or at deploy | 7 |
| Conditional | It goes wrong only under the stated condition | 7 |
| Unproven | The skill text suggests a problem, but no deploy has tested it | 1 |
| No | Nothing fails; the document is simply wrong or inconsistent | 12 |

| Bug | Severity | Breaks something | What breaks |
| --- | --- | --- | --- |
| bug-1 | High | Yes | A check flagged after acceptance has no state to move the offer to. |
| bug-2 | High | Yes | Without requisitions, a job's hiring manager cannot be named. |
| bug-12 | High | Yes | An interview cannot record who is interviewing. |
| bug-13 | High | Yes | With the default row-scope rule, the drafting recruiter cannot see the offer unless named approver. |
| bug-14 | High | Yes | With the default row-scope rule, the hiring manager holds the hire gate without seeing applications. Fully under `raci`. |
| bug-17 | High | No | Wording only. |
| bug-22 | High | Yes | A draft is rejected until its publisher, approver or recruiter is set. |
| bug-32 | High | Yes | A new application for an archived candidate is open while the candidate stays archived. |
| bug-51 | High | No | Description text only. |
| bug-52 | High | No | Description text only. |
| bug-4 | Medium | Conditional | Not in the starter unless chosen at install. Applied in ATS-CANDIDATE-CRM. |
| bug-5 | Medium | Conditional | Not in the starter unless chosen at install. Applied in ATS-CANDIDATE-CRM. |
| bug-6 | Medium | Conditional | Only if someone makes the relationship mandatory at install. The platform then rejects a requisition without a plan. |
| bug-8 | Medium | Conditional | Only where the relationship is applied, such as COMP-STATEMENTS. |
| bug-18 | Medium | Unproven | Section 9 may still name a dropped requisition entity. No deploy test. |
| bug-26 | Medium | Conditional | Only under `raci`: no Accountable can hold these gates. |
| bug-7 | Low | No | Prompt only, and no module carries both ends. |
| bug-9 | Low | No | The analyst docs never apply this value. |
| bug-11 | Low | Conditional | Only if someone makes the relationship mandatory at install. |
| bug-19 | Low | No | Idle row only. |
| bug-20 | Low | No | Prompt only, and no module carries both ends. |
| bug-21 | Low | No | `no` only skips a prompt here. |
| bug-29 | Low | No | A judgment call. |
| bug-34 | Low | No | An offer abandoned before sending simply stays open. Nothing fails. |
| bug-38 | Low | Conditional | Only if `people_kpis` exists. A junction table is then proposed. |
| bug-41 | Low | No | Two optional external rows. |
| bug-47 | Low | No | Reader inconvenience only. |

## Surviving bugs

Citation keys:

- **L:** line in blob `1fd13a2`, the reviewed version, unless another blueprint is named.
- **rel / h:** live `data_object_relationships` / `handoffs` id.
- **tmpl:** architect `semantic-blueprint-template.md`.
- **audit:** architect `audit-checklist.md`.
- **stage-7, stage-11:** architect `stage-7-handoffs.md`, `stage-11-governance.md`.
- **A2, A3, A4, A7, A9, A10:** analyst `stage-2-inspect`, `stage-3-collisions`, `stage-4-fields`, `stage-7-select-rule`, `stage-9-governance`, `stage-10-rules`.
- **M1, M4:** modeler `stage-1-parse`, `stage-4-execute`.
- **SKILL:** `domain-map-analyst/SKILL.md`.
- **hist, q, state:** `audits/ATS/history.md`, `q-ATS.md`, `state.yaml`.
- **plan:** `plans/blueprint-external-relationships-plan.md`.

## High

### bug-1: A flagged background check cannot affect an accepted offer

**Verdict:** REAL. `accepted` is terminal (L302, tmpl:302, A10:99) and `rescinded` means after sent (L304), yet the overview says the starter reacts when a check is flagged (L22), and q:142 says screening is ordered at acceptance.

**Contradiction:** The starter reacts when a check is flagged, but `accepted` is terminal and `rescinded` means after being sent.

### bug-2: Without requisitions, nothing names a job's hiring manager

**Verdict:** OVERSTATED. rel 2739 is the only hiring manager relationship, but gates come through roles (A9:66,72) and the manager can be offer approver (rel 825, L429). Lost: naming a job's manager, not a process.

### bug-12: A Hiring Starter interview cannot record its interviewers

**Verdict:** REAL. rel 823 `coordinates` is the only users relationship on interviews; panelists moved to `interview_panels` (hist:680), which is external (L178). Scorecard author (L123) is optional and comes later. L31 promises interviewers.

**Contradiction:** Interviews have one or more interviewers, but the only relationship to `users` on an interview is `coordinates`.

### bug-13: The recruiter drafting an offer has no relationship to it

**Verdict:** REAL. The catalog has only rel 825 between offers and users. The row-scope owner is that relationship (A7:13-15, R8), so the drafting recruiter (L298, L428) cannot see the draft unless named approver.

### bug-14: The hiring manager and other personas have no route to the rows they work on

**Verdict:** REAL. The default rule is owner or `view_all` (A7:15); overrides roll up to admin only (L392-399); RACI grants write tier and gates only (M4:412-414). The manager holds the hire gate (L422) without seeing applications. Bites fully only under `raci`.

Status: workaround for candidates only. Under `raci`, `HIRING-MANAGER` holds `view_all_candidates` (module `specification_requirements`). It is read-only, so the hire step stays blocked, and applications, offers and scorecards are not covered.

### bug-17: Postings and applications are described against a requisition, which is optional

**Verdict:** OVERSTATED. Text only: the canonical description is deployed verbatim (tmpl:52), and L101 covers absent entities. Inaccurate wording in a no-requisition install; nothing fails.

**Contradiction:** Postings and applications exist against a requisition, but requisitions are optional.

### bug-22: Records require people before their step happens

**Verdict:** REAL. L120, L124, L126 apply as required (tmpl:197, M1:175) and the platform enforces them, while L298, L312, L324 describe drafts. A drafting manager must set a recruiter before the draft saves. q3 carried `is_required` over unchanged when restructuring the relationships (hist:680).

**Contradiction:** A posting, offer or requisition starts as a draft, but its publisher, approver or recruiter is already required.

### bug-32: `archived` candidates can never come back

**Verdict:** REAL. State 208 is terminal, with no moves out (tmpl:302, A10:99). Nothing stops a new application for an archived candidate, which is then open while the candidate stays archived, against L251.

**Contradiction:** An active candidate has an open application, but `archived` is terminal and an archived candidate can still get an application.

### bug-51: The offer description mentions an approval chain the starter does not include

**Verdict:** OVERSTATED. Canonical description reused verbatim (tmpl:52). The starter has one approver (L124); the chain is external (hist:680). Wording mismatch in deployed text, no failure.

**Contradiction:** Offers have an approval chain, but there is one approver relationship and the chain is outside the starter.

### bug-52: The application description overclaims "full evaluation history"

**Verdict:** OVERSTATED. Pipeline stage is met by section 7 (L284-290). Only "full evaluation history" overclaims. Same cause as bug-51.

**Contradiction:** Applications have full evaluation history, but the stage history is outside the starter.

## Medium

### bug-4: `recruitment_agencies sources candidates` is marked required, though not every candidate has an agency

**Verdict:** OVERSTATED. Prompt only in the starter, default optional (A2:208, A3:343). The value is still wrong: rel 813 is applied in `ats-candidate-crm` L168, and q7's reasoning fits it.

### bug-5: `recruitment_events attracts candidates` is marked required, though not every candidate comes from an event

**Verdict:** OVERSTATED. Same as bug-4: prompt only here (A2:208). rel 814 is applied in `ats-candidate-crm` L169, so "agency and event" only bites in the full module.

### bug-6: `headcount_plans authorizes job_requisitions` is marked required, though not every requisition has a plan

**Verdict:** OVERSTATED. Prompt only (A2:208); nothing blocks saving a requisition. The value is too strong: a catalog handoff says some orgs auto-open backfills. rel 1022.

### bug-8: `job_offers seeds compensation_statements` is marked one_to_one and required, though statements recur

**Verdict:** OVERSTATED. Prompt only here (A2:208). rel 829 contradicts the entity description ("on hire, merit cycle close, and annually"). COMP-STATEMENTS carries both ends, so it can apply there.

### bug-18: Nothing says what happens to requisition gates and process when requisitions are left out

**Verdict:** REAL. A dropped entity is "skipped from all later stages" (A3:51), yet section 9 carries "verbatim" (A9:97). Fast flow drops optionals (A3:13). Consequence unproven: test deploy skipped (plan:5).

### bug-26: Three gates have no process: `close_requisition`, `flag_do_not_hire`, `rescind_offer`

**Verdict:** REAL. States 207, 230, 240 are gated with no process (state:209, SKILL:1270-1272). No issue under `gated`; under `raci` no Accountable can hold them (audit:22). The document flags it; nobody decided.

## Low

### bug-7: `job_offers triggers benefit_enrollments` is marked one_to_one and required, which is false

**Verdict:** OVERSTATED. Prompt only (A2:208). rel 828: no module carries both ends, so no blueprint ever applies it. The value is false (enrollment is per employee per plan), but nothing blocks.

### bug-9: `candidates becomes employees` is marked required, which is too strong

**Verdict:** OVERSTATED. The analyst docs cite this exact row as too strong and never apply it (A2:208, A3:346, plan:56). The value stays by decision (plan:253). Employees are not blocked.

### bug-11: `interview_panels produces interview_scorecards` is marked required, with little effect

**Verdict:** OVERSTATED. Prompt only (A2:208). A panel is a junction of "interviewers assigned to a specific interview" (`ats-interviews` L31, L93), so one interviewer is a panel of one. q2 is stale.

### bug-19: A left-out scorecard entity leaves an idle notification

**Verdict:** OVERSTATED. An event on an uninstalled entity simply does not fire, which a reader can infer. Same root as bug-18, with no gates involved: one idle Informed row.

### bug-20: `job_offers spawns onboarding_journeys` is marked one_to_one and required, which is false

**Verdict:** OVERSTATED. Prompt only (A2:208). rel 827: no module carries both ends. The value is false (journeys also start from `employee.created`, per the live description), but nothing blocks.

### bug-21: Candidate child relationships split into required and optional along composition and reference

**Verdict:** OVERSTATED. Mechanical split: 287 of 287 composition relationships are required; notes and documents are composition (rel 1495, 1496), the others reference. Here `no` only skips a prompt. Optional junction leg (rel 1497) is a catalog flaw.

### bug-29: Whether interviews should be personal content is a judgment call

**Verdict:** OVERSTATED. The flag means owner-scoped rows (SKILL:243); the only users relationship is a coordinator. B4 reviewed ATS without proposing it (hist:678). tmpl:141 wording favors the claim, so this is a judgment call.

### bug-34: An offer abandoned before sending has no terminal state

**Verdict:** OVERSTATED. Refusal can return to non-terminal `draft`; no reply can be rescinded (L304). What remains: an offer abandoned before sending has no terminal state.

### bug-38: `job_requisitions feeds people_kpis` is the only many_to_many KPI relationship

**Verdict:** OVERSTATED. The outlier is real: rel 832 is the only many_to_many of 7 `people_kpis` relationships, on a computed entity. It is only proposed when that entity exists (A2:211).

### bug-41: Recruiter interactions and candidate notes duplicate each other

**Verdict:** OVERSTATED. The duplicate is real (market surface S1, q:161-167), but only two optional external rows here and nothing breaks.

Status: q26 was answered in chat (merge) and is not applied; `a26:` in `q-ATS.md` is still blank.

### bug-47: Two terms have no definition anywhere: `⚠ no process`, "demotion path"

**Verdict:** OVERSTATED. The template defines most terms (tmpl:134, 198, 200, 262, 269, 304) and has no legend by format. Only `⚠ no process` and "demotion path" lack a template definition.

## Dropped entries

These 29 are not bugs. The second column is what the first pass claimed, kept only so the numbers stay traceable. It is not a finding.

| Bug | What the first pass claimed | Verdict | Why it was dropped |
| --- | --- | --- | --- |
| bug-10 | Every data subject request must belong to a candidate | NOT-A-BUG | The entity is defined as a request "from a candidate" (live description, `ats-candidate-crm` L39). Others are out of scope, and it is prompt only here. Re-homing is tracked separately (hist:684). |
| bug-15 | The default Recruiting grant cancels gates and row-scope | NOT-A-BUG | M4:466-470 grants the `_admin` role its `:admin` permission; no user or persona receives it from section 9.2. Recruiter personas are separate roles (M4:408-414). Admin holding gates is tmpl:375. |
| bug-23 | Row-scope has no defined owner | BY-DESIGN | The analyst decides the owner (tmpl:142, A7:13). Each of the four entities has exactly one users relationship (L121, L123, L124, L125), as R8 expects (`blueprint_invariants.ts:332-351`). The owner is determinate. |
| bug-25 | `:read` conflicts with row-scope | NOT-A-BUG | "Every entity" is table-level; `select_rule` replaces row visibility (A7:19). L347 and L360 say row-scope holds unless overridden, so viewers including Finance are scoped too. The document answers it. |
| bug-27 | Legal gets edit rights it has no process for | BY-DESIGN | Section 9.2 is market-level, "distinct from" section 9.1 (tmpl:425). M4:466-470 grants the baseline role, not Legal staff. L423 is the persona layer, so no edit right reaches a Legal persona. |
| bug-28 | A consumer entity has a write tier | BY-DESIGN | The tier derives from `entity_type` (tmpl:144), and `users` is `operational_record` (audit:152). The deployer reuses the built-in. A reader may misread it, but it is the documented derivation. |
| bug-33 | `hired` candidates are terminal despite other applications and reapplying | NOT-A-BUG | Applications have their own states (L288-290), unaffected. L221 says internal applicants get a newly materialized candidate record, and rel 2266 is one_to_many. Nothing is blocked. |
| bug-35 | Talent pool membership is modeled twice | BY-DESIGN | "If an explicit junction entity already relates both ends, none is created" (A2:211); plan:156 names `talent_pool_memberships`. L131 misleads someone reading the document alone. |
| bug-36 | Candidates and employees point at each other | NOT-A-BUG | Two facts with fields on different tables: rel 2266 optional on candidates, rel 830 on employees and prompt only. No save deadlock. "Becomes" on internal hires is wording at most. |
| bug-37 | Requisitions and demand forecasts have two relationships | NOT-A-BUG | Different facts: rel 1023 forecast triggers requisition; rel 831 filled requisition updates actuals, which L215 states. The document explains it. |
| bug-39 | Redundant paths can disagree | BY-DESIGN | Blueprints carry no JsonLogic (tmpl:455); cross-record rules belong to analyst Stage 10 (A10:95,104). The catalog has 1,159 such triangles, so the pattern is the norm. |
| bug-40 | EEO responses and voluntary self-identifications look like the same record | NOT-A-BUG | Live description of `voluntary_self_identifications`: "Distinct from `eeo_responses`" (survey response against offer/decline decision and audit data). Deliberate, and both are external here. |
| bug-43 | "The gated entities' write tier" cannot be resolved | BY-DESIGN | The phrase is template text, including for a no-gate process (tmpl:405-406, tmpl:419, stage-11:35-37). It resolves to the write tier (M4:414), `:manage` on all but one entity here. Only the no-gate case is vague. |
| bug-44 | Lifecycles have no transitions | BY-DESIGN | The section 7 format has no transition column by template (tmpl:291-305). Order and terminal flags are the contract; ordering rules come in analyst Stage 10 (A10:93). |
| bug-45 | The section 5.3 headings read backward | BY-DESIGN | Direction is where the field sits, "not the from / to columns" (tmpl:217-222, plan:116). Rows are placed correctly. The document does not restate this, so a lone reader may be puzzled. |
| bug-46 | External entities name no owning module | BY-DESIGN | The analyst resolves external entities by name and concept against live (A2:170-199); notes hints are optional (tmpl:234); ownership is settled at deploy (stage-7:33). Reader-only gap. |
| bug-48 | Personas do not map to baseline roles | BY-DESIGN | A persona is its own role with the write tier (A9:66,72; M4:404-414), not a baseline role, and exists only under `raci`. The realization column states the grant (tmpl:417-421). |
| bug-53 | Candidates promise records kept outside the starter | NOT-A-BUG | The analyst drafts fields per entity (A4:7), so resume, tags and consent can be fields, as the original finding itself concedes. No promise is broken. |
| bug-54 | The upgrade path is not explained | BY-DESIGN | Defined in SKILL:498, tmpl:134, tmpl:459 and M4:485. audit:70-71 keeps such narration out of section 1. Blueprints are consumed with those skills. |
| bug-56 | Scorecards promise a rubric that is not in the starter | NOT-A-BUG | Per-competency ratings can be fields (A4:7); `interview_kits` are reusable templates, not the only possible rubric. Nothing promised is unreachable. |
| bug-58 | "Leaves out the requisition approval chain" reads as false | BY-DESIGN | hist:709 records the wording as user-approved: `requisition_approvals` is out, the gate stays. Accurate under that definition. |
| bug-59 | Two different data claims for the upgrade | NOT-A-BUG | Both mean same table, no migration (SKILL:498). L7 is buyer voice (tmpl:469), L22 analyst voice. No contradiction. |
| bug-60 | The tagline overclaims | NOT-A-BUG | The tagline is marketing voice by template (tmpl:468), and A4 passed (hist:678). Opinion, not a failure. |
| bug-61 | `related_modules` omits the pre-employee module | BY-DESIGN | Derived from owners, handoffs and persona reach (`catalog.ts:906-942`); the starter has 0 `persona_modules` rows. The field is advisory (tmpl:473). |
| bug-64 | Event names use inconsistent prefixes | NOT-A-BUG | 281 of 1,724 event prefixes do not match the entity singular, by a rough match. No rule requires it. Nothing breaks. |
| bug-67 | The `high risk?` column is blank on every state | BY-DESIGN | Cells show `-`, the template default (tmpl:304). 0 of 1,084 gated states are high risk catalog-wide. q9 tracks the decision; audit:132 is only a suggestion. |
| bug-69 | Verb styles are mixed | NOT-A-BUG | 645 of 2,548 verbs contain underscores, a common catalog pattern, and the consistency checker passes. Style preference, no failure. |
| bug-70 | Processes are out of order | NOT-A-BUG | Order is first-seen in lifecycle rows, as documented (`blueprint_derive.ts:566`). No rule requires PCF order. Nothing depends on it. |
| bug-71 | Published process descriptions contain poor text | BY-DESIGN | Verbatim APQC text (`business_processes` 1014, 1017, framework `apqc_pcf_cross_industry`). A9:77 forbids rewording or fixing grammar. Poor text, but deliberate. |

## Limits of the verdicts

- **No deploy test.** Bug-18 comes from skill text, not observed behavior. The plan says the test deploy was skipped (plan:5).
- **Required fields.** The platform enforces `input_type: required`, as the project owner stated on 2026-11-02.
- **Access level is unknown.** The blueprint has no `access_scope`. Bug-14 bites fully only under `raci`, though `_manager` users are row-scoped under `advanced` and up.
- **Row-scope bugs assume the analyst's default shape.** Bugs 13 and 14 assume A7's owner-plus-oversight rule. An analyst could author a broader rule.
- **Modeling judgments are bounded.** Bugs 29, 32 and 34 rest on catalog text and skill rules, not a re-check of vendor products.
- **What counts as a contradiction.** The `Contradiction` lines are the main agent's reading, not part of the independent pass. Bugs 22 and 32 are the weakest of them.
- **What breaks.** That table is the main agent's reading of the evidence, not part of the independent pass.
- **Spot checks.** The main agent read the citations for the 15 BY-DESIGN verdicts and for bugs 4, 14 and 15. The other verdicts rest on the independent pass alone.
- **Checks not re-run.** R6 and R8 were not recomputed for the verdicts. `state.yaml` `checks:` is from version 1 (2026-11-01).
