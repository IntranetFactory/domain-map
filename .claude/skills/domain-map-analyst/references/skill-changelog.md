# Skill changelog — decisions and incidents

Append-only log of catalog-shape decisions and rule-violation incidents that produced (or should produce) a SKILL.md edit. Two sections, one file, one lazy-load contract.

## When to write to this file

This is the **canonical home for dated context** — the *when* and *why-then* of a SKILL.md change. Per § Authoring discipline in SKILL.md, dated war stories never go inline in SKILL.md or `references/*.md`; they belong here. Append a new entry whenever:

- You add, change, rescind, or rework a rule in SKILL.md (Decisions section).
- A SKILL.md rule was violated and you reverted the writes (Incidents section).
- You strip a chunk of SKILL.md content that was substantial enough to be worth preserving for historical reference (Decisions section — paste the removed content into the entry body).

Skip the entry only when the SKILL.md change is purely editorial (typo, link fix, wording polish that doesn't change the rule).

## When to read this file

- **Before proposing a module split, role split, or capability cut.** Check whether the question has already been settled. A proposal that contradicts a logged decision is a regression; surface the decision and either follow it or argue explicitly for revisiting.
- **When research surfaces a "this looks like its own market / module / capability" instinct.** Cross-check against logged precedents before drafting rows.
- **When the user pushes back with "didn't we decide X already."** Consult this file first, not live state.
- **After a Rule #15 violation (or any similar rule-enforcement loop).** Required reading before writing the incident entry, so the new entry follows the existing format and links the prior SKILL.md edit.

## When NOT to read this file

- Routine audits (every band check has its own query against live state; entries here are interpretive, not authoritative facts).
- Loader execution (loaders read schema, not policy).
- Per-row research (data_object names, alias drafts, handoff payloads — read SKILL.md and live state).

This file is **not** loaded on every skill invocation. It is lazy. Consult on the triggers above.

## Entry format

### Decisions section

```
### YYYY-MM-DD — short title
**Context.** What triggered the decision (one or two sentences).
**Decision.** The call, stated as a rule future-me can apply.
**Reasoning.** Why this and not the alternatives.
**Scope.** Where the decision applies (domain, entity, catalog-wide).
**Status.** active / superseded by [later date] / pending user confirmation.
```

### Incidents section

```
## <ISO date>
- session: <what the user was asking for>
- rows polluted / rule violated: <tables + counts, or rule #>
- example text written: "<verbatim sample>"
- contradicting SKILL.md passage that was the rationalization: <quote + line ref, or "none — pure invention">
- fix applied to SKILL.md: <what was changed>
- revert: <link to revert loader, if any>
```

Entries are dated absolute (never "yesterday" / "last week"). Append new entries at the bottom of the relevant section. Never delete; supersede by writing a new entry that links the prior one.

---

# Decisions

## 2026-05-26 — Module-split criterion for shared data_objects (OKR test case)

**Context.** Drafting the WORK-MGMT module split (`okr_objectives` is multi-mastered by 4 domains). Two readings of the catalog's "module" concept came into tension:

- *Reading 1 — deployable autonomy.* A module is something you can deploy standalone. By this test, OKR fails inside WORK-MGMT (Goals features link to tasks; not autonomous).
- *Reading 2 — marketed product surface.* A module is what reference vendors carve as a distinct surface. By this test, OKR passes for WORK-MGMT (Asana Goals, Monday Goals, ClickUp Goals, Workfront Goals are all separately-marketed features).

User pointed out the two readings are not in conflict: `embedded_master` resolves them.

**Decision.** Module decomposition is driven by **vendor-marketed-surface evidence** (Reading 2). Deployable-autonomy (Reading 1) is handled mechanically by the `embedded_master` pattern, not by merging modules. A module that depends on an upstream master ships an `embedded_master` row on that data_object for the standalone case; the runtime canonical-master-demotion handles the holistic case so no silos form.

Concretely for `okr_objectives`:
- **WORK-MGMT** — Asana/Monday/ClickUp/Workfront/Wrike all carve Goals as a marketed surface ⇒ `WORK-MGMT-GOALS-OKR` is its own module, masters okr_objectives, embedded_masters work_items for KR-to-task linking.
- **TALENT-MGMT** — Lattice/15Five/Culture Amp bundle Goals into the performance-review surface ⇒ folds into `TALENT-PERFORMANCE-MGMT` (existing).
- **SEM** — Workboard/Gtmhub/Betterworks ARE the OKR-first product; OKR is the vehicle for strategy, not a sub-feature ⇒ folds into strategy/execution modules (existing).
- **SPM** — TBD when SPM is modularized; check Planview/ServiceNow SPM/Clarity marketing.

**Reasoning.**

- Reading 1 was driving me toward larger, fewer modules because I treated standalone deployability as a packaging constraint. It isn't. `embedded_master` is the catalog mechanic that lets a small module reach into upstream masters when deployed alone, then defer when the canonical master is co-installed. The pattern is designed for exactly this.
- Once Reading 1 is solved mechanically, the remaining constraint on module granularity is workflow coherence + vendor evidence. WORK-MGMT vendors *do* carve Goals; TALENT-MGMT vendors *don't*. The catalog should mirror the actual market, not impose a uniform "OKR folds in" rule across all hosts.
- This implies the catalog should be **more willing to carve modules along vendor-marketed-surface lines** generally, not less. `embedded_master` removes the silo worry that pushed toward larger modules.

**Scope.** Catalog-wide. Applies to every shared data_object across host domains. The rule: check vendor marketing for each host individually, decide per host.

**Status.** active. Supersedes the earlier-this-session "OKR is not its own module" call that misapplied the TALENT-MGMT/SEM precedent across all hosts.

---

## 2026-05-26 — WORK-MGMT module split

**Context.** WORK-MGMT (id=135) has 9 capabilities, 4 masters, 0 modules. Rule #14 / M2 requires ≥2 modules.

**Decision.** Split into 2 modules:

| Module | Masters | Embedded_masters | Capabilities |
|---|---|---|---|
| `WORK-MGMT-TASK-EXEC` | work_items, work_projects, work_automations | — | WORK-TASK-MGMT, WORK-DEPS-SCHED, WORK-CAPACITY, WORK-WORKFLOW-AUTO, WORK-DASHBOARDS, APPROVAL-WORKFLOW, CREATIVE-REVIEW |
| `WORK-MGMT-GOALS-OKR` | okr_objectives | work_items (for KR-to-task linking when standalone) | WORK-GOALS-OKR, GOAL-MGMT |

**Install on-ramp.** `WORK-MGMT-TASK-EXEC` is the SEO entry point and the natural first install; `WORK-MGMT-GOALS-OKR` is the natural extension. (The prior `domain_starter_modules` editorial-ordering junction was retired 2026-05-26 per [SKILL.md Rule #19](../SKILL.md); the install order lives as prose on the relevant decision now, not as a catalog row.)

**Reasoning.** Follows the module-split criterion above. Asana/Monday/ClickUp/Workfront/Wrike all carve Goals as a separately-marketed surface ⇒ Reading 2 passes. The embedded_master on work_items handles the standalone-deployment case ⇒ Reading 1 passes via mechanics, not via merging.

CREATIVE-REVIEW stays under TASK-EXEC because WORK-MGMT masters no creative-specific data_objects; the capability rides on top of work_items. If Adobe Workfront's creative-ops surface becomes a recurring research target, revisit and consider a third `WORK-MGMT-CREATIVE-OPS` module.

**Status.** active. Implementation pending: Phase M load (modules + capability links + module-level data_object roles), then Phase B12 (lifecycle states for work_items/work_projects/work_automations anchored to TASK-EXEC; the existing okr_objectives lifecycle rows currently anchored to TALENT-PERFORMANCE-MGMT can stay there per the multi-master pattern, but WORK-MGMT-GOALS-OKR will need its own state rows for the team-execution OKR cadence).

---

## 2026-05-27 — Stripped dated war stories from SKILL.md

**Context.** SKILL.md had 43 instances of `2026-05` dates embedded inline as historical justifications, session anecdotes, and "rule added after incident X" trailers. At ~25 tokens average per instance, that's ~1100 tokens of context bloat loaded on every skill invocation. The dates didn't help the agent decide anything at runtime — the rules they justified stand on their own.

**Decision.** Strip dated history from SKILL.md. Skill = what to do. Changelog = when/why we decided it. War stories that informed a rule but don't change how the agent applies it: deleted. Empirical-pattern tables (cross-tranche external tools, high-friction handoff shapes): kept, dates stripped — the patterns transfer regardless of when they were observed.

**Backfill-gaps table specifically removed.** The section titled "Backfill gaps to watch for" listed four dated categories (`business_function_domains`, `business_functions` spine, per-module handoff attribution, `skills`+`tools` per module) with "empty until <date>" qualifiers. User reasoning: a gap is a gap; the audit checklist detects it from live state. Cause-of-gap (pre-X-date load vs. deleted record vs. never-loaded) doesn't change the fix. The per-domain completeness checklist already catches every one of these via S1 / C1 / B10b / F2-F5.

Historical content of the table, preserved here for reference only:

| Category | Was empty until | What to check on touched markets |
|---|---|---|
| `business_function_domains` + `business_function_capabilities` (RACI axis) | Pre–ITSM-review backfill (2026-05-20) | Every domain has at least one `owner` row; every domain has at least one `contributor` or `consumer` row when cross-functional. |
| `business_functions` spine itself | Pre–2026-05-20 | If the table is empty when starting Phase C, load the 20-function canonical spine first. |
| `handoffs.source_domain_module_id` + `target_domain_module_id` | Pre-2026-05-23 ATS backfill | Run B10b. 99% of handoff rows sat at NULL on these columns; backfill is deterministic by payload→master derivation. |
| `skills` + `tools` + `skill_tools` per module (Rule #17 / F2–F5) | Pre-2026-05-25 catalog-wide | Run F2–F5. Only ATS, SMP, TALENT-MGMT, EMP-EXP had any system skills loaded; CRM was the trigger case that surfaced this gap. |

**Reasoning.** The skill is read by an agent that has no memory of what happened on 2026-05-22 or which markets were loaded in "Wave 2". War-story trailers ("rule added after the ATS audit miss") were anchors I wrote for myself while drafting, not load-bearing rules for the agent. The rule's text is the lesson; the date is sentimentality. Empirical tables that observe a recurring pattern (channel-substitution shapes, period-cycle-close handoffs) keep working regardless of when they were first noticed.

**Scope.** SKILL.md only. References folder retains historical specificity where relevant (e.g. `loader-idiom.md` may reference specific reference loaders by path).

**Status.** active.

---

# Incidents

Append one entry per occurrence. Used by SKILL.md Rule #15 — the agent MUST log here when notes have been written without user approval, AND revert the writes, AND propose a SKILL.md edit that removes whatever passage rationalized the violation.

## 2026-05-26 (MSP-PSA M-band + B-band load, user said "go ahead")

- **session:** Deep review of MSP-PSA. After the audit, user said "go ahead" on the recommendation list (M-band, B-band closure, F7). Agent ran two loaders and polluted notes on 44 rows.
- **rows polluted:**
  - `handoffs` — 9 backfilled PATCHes (added " | <source|target> NULL until X..." appends) + 4 newly-inserted intra-domain rows (mechanical descriptions like "New ticket enters dispatch board for scheduling").
  - `data_object_relationships` — 14 newly-inserted rows (7 intra-domain B6 + 7 users-edges B7) with mechanical cardinality / actor restatements.
  - `data_object_aliases` — 12 newly-inserted rows with "ConnectWise PSA terminology" / "Master Service Agreement." context strings.
  - `data_objects` — 2 PATCHes on `msp_contracts` and `msp_invoices` with "Submit-lock engages on activation..." context for the `has_submit_lock=true` flag.
  - `domain_starter_modules` — 3 newly-inserted rows with editorial ramp prose ("Start with the multi-tenant queue: tickets across customer estates...").
- **example text written:**
  - handoffs.notes: `"Same alert-to-ticket pattern as RMM→ITSM; native in unified vendor stacks, friction high in cross-vendor combinations. | source NULL until RMM is modularized"`
  - data_object_relationships.notes: `"Every MSP contract is issued to exactly one client; clients may hold multiple concurrent contracts."`
  - data_object_aliases.notes: `"ConnectWise PSA terminology."`
  - data_objects.notes: `"Submit-lock engages on activation: once active, financial terms are locked from edit."`
  - domain_starter_modules.notes: `"Start with the multi-tenant queue: tickets across customer estates, SLA timers, and the customer portal. This is the daily-operational surface for any MSP."`
- **contradicting SKILL.md passages that were the rationalization (multiple):**
  - The B9 write-time rule for `handoffs.notes`: *"the row carries an explicit `notes` annotation in the shape `target NULL until <DOMAIN_CODE> is modularized`"* — read as a license.
  - The M3 check on `domain_starter_modules`: *"author 1–3 `domain_starter_modules` rows ... with editorial notes the fact sheet emits verbatim"* — read as a positive instruction.
  - The Rule #12 config-shape exemption requiring `data_objects.notes` — generalized to "pattern flags also warrant notes" without explicit license.
  - Rule #15 itself was **scoped to DMDO + relationships only**, leaving every other notes column unguarded.
- **fix applied to SKILL.md:**
  - Rule #15 rewritten as a hard universal rule covering every `notes` column on every table. Explicit override clause: "When Rule #15 contradicts any other instruction in this file, Rule #15 wins."
  - All prior carve-outs (handoffs "until X" annotation, starter-module editorial notes, config-shape exemption, predecessor mention in solutions.notes, skill_tools workflow context) explicitly listed as RESCINDED.
  - "Forbidden patterns" list expanded with every concrete example from this incident.
  - This log file created and referenced from Rule #15.
- **revert:** 44 row-mutations reverted via [.tmp_deploy/revert_msp_psa_notes.ts](../../../.tmp_deploy/revert_msp_psa_notes.ts).
- **user repetition count:** 5th time the user has had to repeat the rule. They were furious.

### Pattern observed across all 5 violations (per user, not all logged before today)

Each violation followed the same shape: SKILL.md had a positive instruction somewhere to populate `<some-column>.notes`, the agent treated it as a license, and the agent extended that license by analogy to other notes columns. The narrow scope of the prior Rule #15 (DMDO only, then DMDO + relationships) created the false impression that *other* notes columns were not covered. Fix: universal scope, no carve-outs, every contradicting passage rescinded.

---

## 2026-05-27 — Starter junction roles tightened to two patterns

**Context.** Drafting HIRING-STARTER (entry-tier ATS starter; first starter authored against Rule #19). Initial draft included `recruitment_sources` as `consumer + optional` and a `users` consumer row. User asked whether `consumer` in a self-contained starter kit makes any sense.

**Decision.** A `module_kind='starter'` row's `domain_module_data_objects` junctions take exactly two shapes:

- `embedded_master` on a `kind='domain_owned'` data_object (canonical master must exist somewhere in a full module, per Rule #19 invariant 2)
- `consumer` on a `kind='platform_builtin'` data_object (today only `users`)

Never `master`, never `derived`, never `contributor`, never `consumer + domain_owned`.

**Reasoning.** The starter's structural promise is standalone deployability. `consumer + domain_owned` points at a master that may not be installed in the deployment where the starter is the entry point, the dependency is unsatisfiable. `contributor` has the same defect for writes: a writer with no canonical target has nowhere to write when standalone. The only substrate a standalone starter can safely depend on beyond its own embedded shells is the platform itself. For any domain-owned data_object the starter needs, `embedded_master` is the right role: it ships a local shell and defers to the canonical master via the demotion path when the full module installs alongside.

The prior Rule #19 invariant 1 wording allowed `embedded_master | consumer | contributor` with no kind constraint. Six months from now the looser form would have produced `consumer + domain_owned` rows on a starter (the schema accepts them, the platform-side `starter_no_master` validation_rule only covers `master`/`derived`) and the bug would be invisible until a tenant tried to deploy a standalone starter and the consumer reads returned empty.

**Edits applied.**

- SKILL.md Rule #19 invariant 1 rewritten with the two-pattern restriction, the "why" inline, and a note on enforcement split (platform-side rule covers `master`/`derived`, loader pre-flight covers the rest).
- SKILL.md anti-patterns block extended with one entry on `consumer + domain_owned` and `contributor` on starters.
- references/modules.md §6 first bullet rewritten in parallel form.
- references/loader-idiom.md `validateStarterDataObjectJunction()` tightened: rejects `contributor`, rejects `consumer` when `data_objects.kind != 'platform_builtin'`. The function now does the kind lookup unconditionally (it was previously conditional on `embedded_master`).

**Scope.** Catalog-wide. All future `module_kind='starter'` rows. No existing starter rows in production yet (HIRING-STARTER is the first), so no audit-revert cycle needed.

**Status.** Active. Platform-side enforcement is partial: `starter_no_master` validation_rule covers the `master`/`derived` slice only. Extending the platform rule to also reject `contributor` and `consumer + domain_owned` is a future cleanup, the loader pre-flight is the sole enforcement until then.

---

## 2026-05-28 — Skills carved out of LMS into SKILLS-MGMT, plus TLNT-INTEL

**Context.** `LMS-SKILLS` (module 34) historically mastered both `skill_profiles` and `learning_paths`. Vendor evidence (Workday Skills Cloud, SuccessFactors Skills, Cornerstone Capabilities, Eightfold Talent DNA, Gloat, Fuel50) is unambiguous: the skills-cloud surface is its own marketed product, distinct from the LMS learning-paths surface. Holding both inside `LMS-SKILLS` mis-attributed every downstream handoff (ATS-CANDIDATE-CRM, TALENT-PERFORMANCE-MGMT, HCM-LIFECYCLE-WORKFLOWS, HCM-ORG-POSITIONS, SWP-DEMAND-FORECAST, LMS-COURSE-DELIVERY, LMS-COMPLIANCE-TRAINING) and propagated the wrong "canonical state machine owner" into every contributor/consumer blueprint that holds `skill_profiles`.

**Decision.** Two new domains, five new modules, one rename:

- New domain `SKILLS-MGMT` (id 169) with modules `SKILLS-MGMT-TAXONOMY` (id 173) and `SKILLS-MGMT-PROFILE` (id 174). `SKILLS-MGMT-PROFILE` is now the canonical master of `skill_profiles` (id 172).
- New domain `TLNT-INTEL` (Talent Intelligence, id 170) with modules `TLNT-INTEL-MARKETPLACE` (id 175), `TLNT-INTEL-MOBILITY` (id 176), `TLNT-INTEL-INSIGHTS` (id 177). Adds 7 new masters (`internal_opportunities`, `opportunity_applications`, `mobility_recommendations`, `fit_scores`, `career_path_suggestions`, `mentorship_engagements`, `match_inference_runs`) and 6 new SKILLS-MGMT masters (`skill_taxonomies`, `skills`, `skill_assessments`, `skill_endorsements`, `competency_models`, `skill_inference_runs`).
- `LMS-SKILLS` (module 34) renamed to `LMS-PATHS` (still under domain `LMS`, id 57). What remains is the sequenced learning-paths surface only.
- Permissions reprefixed: baseline `lms-skills:{read,manage,admin}` → `lms-paths:*` (module 34 retains them). Workflow-gates split: `lms-skills:*_skill_profile` → `skills-mgmt:*` (module 34 → 174); `lms-skills:*_learning_path` → `lms-paths:*` (module 34 retains them).
- Handoffs re-targeted: 2 outbound + 5 inbound on `skill_profiles` moved from module 34 → 174. Handoff 1082 (`learning_path.assigned`) stays on the renamed LMS-PATHS.
- `skill_profiles` lifecycle states 186 (`validated`) and 187 (`inactive`) re-anchored from module 34 → 174.

**Reasoning.** Same precedent as the OKR carve-out logged 2026-05-22: when vendor-marketed surfaces diverge, the catalog should mirror the market rather than impose an LMS-centric grouping. The blueprint emitter renders "canonical state machine owned by X" verbatim from `domain_module_data_objects.role='master'` rows, so leaving `skill_profiles` mis-attributed to `LMS-SKILLS` produced wrong blueprints across every contributor/consumer scope. The split also gives `TLNT-INTEL` its own home for the 7 talent-intelligence masters that have no LMS-side analog.

**Scope.** Catalog-wide. In this session, only the four existing blueprints that previously misattributed `skill_profiles` to `LMS-SKILLS` were regenerated: ATS-CANDIDATE-CRM, LMS-PATHS (rename of LMS-SKILLS), LMS-COURSE-DELIVERY, LMS-COMPLIANCE-TRAINING. Blueprints for the new modules (SKILLS-MGMT-PROFILE, SKILLS-MGMT-TAXONOMY, TLNT-INTEL-MARKETPLACE, TLNT-INTEL-MOBILITY, TLNT-INTEL-INSIGHTS) are *not* authored yet, user wants to review the live data first.

**Status.** Active. Migration applied via [.tmp_deploy/load_skills_tlnt_intel_phase_b.ts](../../../.tmp_deploy/load_skills_tlnt_intel_phase_b.ts) (idempotent). Loader required three corrections during this session: (1) `relationship_kind` enum is `{association, composition, reference}`, not `parent` — replaced; (2) `relationship_type` enum is `{one_to_one, one_to_many, many_to_many}`, no `many_to_one` — rows flipped (source/target and verbs swapped) to express as `one_to_many` with `owner_side="target"`; (3) `alias_type` of `solution_term`/`industry_term` requires `solution_id`/`industry_id` respectively — downgraded the 10 new aliases to `synonym` rather than guess context FKs. The original bash-heredoc call mechanism in the loader yields PGRST102 after a large prior GET response; replaced with `execFileSync` inline-arg + CHUNK=1.

### Process failure that prompted this entry

The earlier session that authored Phase A and Phase B regenerated [ats-candidate-crm-semantic-blueprint.md](../../../blueprints/ats-candidate-crm-semantic-blueprint.md) at 13:10 (commit `93f5ece`) *after* Phase A ran but *before* Phase B ran. The emitter faithfully serialized the live catalog state at 13:10, which still had `skill_profiles` mastered by `LMS-SKILLS`. The committed blueprint therefore contradicted the decision the loader was already authored against. No changelog entry was written, so the next session was blind to both the decision and the in-flight loader, and the user had to forensics-reconstruct the situation from `.tmp_deploy/` filenames.

**Rule for future migrations of this shape:** never regenerate blueprints between Phase A (scaffolding) and Phase B (master migration). Either run both phases before any blueprint emit, or skip blueprint regen until the catalog is in its target shape. Write the changelog entry *with* the loader, not after the next session asks "what happened."

**Second process failure in the same session.** When fixing the misattributed blueprints, the agent also auto-emitted blueprints for the five brand-new modules (`SKILLS-MGMT-*`, `TLNT-INTEL-*`) without user approval. User had not asked for new blueprints and wanted to review the live data first. The five files were deleted on the spot. **Rule:** "regenerate the blueprints affected by X" means only the blueprints that *already exist* and now misrepresent live state. New modules need an explicit "author the blueprint for module Y" from the user, never automatic emission as a side-effect of a fix.
