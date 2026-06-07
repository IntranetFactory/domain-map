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

## 2026-05-28 — Persist audit history per domain in `audits/<DOMAIN>.md` (git-tracked, append-only)

**Context.** Three-bucket Validate output discipline was in place but the audit output was being written to `c:/tmp/<DOMAIN>-audit-<date>.md` — ephemeral. User asked where audit discussions and results should live: in `domains.notes`, in a new schema column, or somewhere else? Both catalog-side options were rejected: `notes` is forbidden territory for auto-generated prose (Rule #15), and a new schema column for what is fundamentally markdown content would add migration friction for content that doesn't belong as relational rows.

**Decision.** One markdown file per domain at `audits/<DOMAIN_CODE>.md`, append-only, git-tracked. Each Validate run appends a new dated section; prior sections are never edited (corrections come as new audits, not overwrites). Git becomes the audit history layer: `git log audits/<DOMAIN>.md` is the timeline; `git diff` highlights what changed between audits.

Section structure per audit:
- Summary (counts per bucket + footprint counts + flagship vendors)
- Vendor surface basis
- Bucket 1, 2, 3 (the three-bucket gap report from Step 3 of the procedure)
- Decisions (per-bucket user choices, captured as the user makes them)
- Fixes applied (loader paths, row counts, timestamps, commit hashes)
- `domains.notes` pointer (if updated — the exact user-approved wording)

Pairwise reconciliation findings flow into the same per-domain audit files: auto-discovered per-neighbor findings append to the host domain's section; manual bilateral form (user names A and B) appends to BOTH `audits/<A>.md` and `audits/<B>.md` with each getting the direction it owns.

**Domain.notes optional pointer.** After an audit lands, the agent prompts the user whether to update `domains.notes` with a one-line status pointer back to the audit file. Pointer wording is user-supplied per Rule #15. The pointer is optional; the file alone is sufficient persistence.

**Files changed.**
- [audits/](../../../../audits/) — new directory, committed. Contains `README.md` explaining the convention (per-domain file, append-only, section structure, why files not catalog, why git-tracked).
- [references/domain-audit-procedure.md](domain-audit-procedure.md) § Step 4: rewrote from "save to `c:/tmp/<DOMAIN>-audit-<date>.md`" to "append a new dated section to `audits/<DOMAIN_CODE>.md`". Drafts and subagent JSON continue to live in `c:/tmp/` (ephemeral). Added the optional `domains.notes` pointer prompt.
- [SKILL.md](../SKILL.md) § "Domain-level market audit" Step 4: updated to reference `audits/<DOMAIN_CODE>.md` as the persistence target. § "Pairwise handoff reconciliation" Step 4: updated to flow findings into both per-domain audit files for the manual bilateral form; the per-neighbor auto-discovery form's findings land in the host domain's audit section.
- [README.md](../../../README.md) § Validate "Output": updated to point at `audits/<DOMAIN_CODE>.md` and mention the optional `domains.notes` pointer.

**Reasoning.** Audit history is multi-page markdown with tables, prose, and append-only logs. The fit is markdown files in a directory, not relational rows. Git already provides the versioning, diffing, and timeline layer; reinventing those as DB columns is reinvention without benefit.

`domains.notes` keeps its Rule #15 discipline. The optional one-line pointer is the user-approved short summary that makes audit state visible in the catalog UI without polluting the column with multi-paragraph history.

The trade-off accepted: audit history is not visible in the Semantius UI (which renders the catalog tables). To see audit history you open the markdown file or check git log. The optional `domains.notes` pointer is the bridge — short enough to show in the UI, deep enough to direct readers to the right file.

**Scope.** Catalog-wide. Future Validate runs append to `audits/<DOMAIN>.md`. Future manual bilateral reconciliations append to both involved files. Drafts and subagent JSON working state continue to live in `c:/tmp/` (gitignored). The `c:/tmp/` location is preserved only for ephemeral working artifacts; final audit content lives in `audits/`.

**Status.** active.

---

## 2026-05-28 — Codify three-bucket Validate output + explicit per-bucket prompt discipline

**Context.** User running an ATS Validate looked at the gap report and asked "what should I do now exactly?" The report had three implicit categories — concrete fixable findings, judgment calls, and speculative "Phase 0 pending" candidates — but the user couldn't tell what action to take per category. The phrase *"Semantic (Phase 0 pending)"* in the report was unfamiliar despite being load-bearing.

The deeper observation from the user: *"unclear next steps are probably a main reason of unfinished domain research."* Once the report lands, if the agent dumps the whole thing and waits, the user has to triage ad-hoc, often silently skips whole categories, and the audit stalls without ever being resolved. The fix is procedural: make the next-step direction deterministic per finding category.

**Decision.** Codify a three-bucket output structure for every Validate gap report, with an explicit per-bucket prompt discipline:

- **Bucket 1 — In-scope confirmed gaps** (agent-fixable). Structurally-confirmed findings: MISSING (vetted entities), WRONG-OWNERSHIP, SCOPE-CREEP, STRUCTURAL band failures, BOUNDARY (NULL FK / missing handoff). Agent prompts: *"Fix these now? Reply 'all', 'just 1, 3, 5', or 'skip'."*
- **Bucket 2 — Surface-for-user (judgment calls)**. Items the agent cannot decide alone: Rule #15 notes wording, policy decisions, architectural-intent questions, legacy reverts. Agent prompts per item: *"What's your call on each? I'll wait for your decision before acting."*
- **Bucket 3 — Phase 0 pending (speculative)**. Findings the semantic pass produced from vendor knowledge but which lack a formal Phase 0 vendor-surface baseline. Agent prompts: *"Vet via Phase 0 research, or eyeball-mode — name which candidates ring true?"*

Plus a **cross-bucket dependency** rule: when a Bucket 2 question would be informed by Bucket 3 research, the agent calls out the dependency at surface time so the user can sequence appropriately. When buckets are independent, the agent says so explicitly.

**Files changed.**
- [references/domain-audit-procedure.md](domain-audit-procedure.md) § Step 3: rewrote from "surface a count table" to the three-bucket template with per-bucket decision shapes, the explicit-prompt discipline, the dependency-callout rule, and a Bucket-1 finding-type sub-summary. § Step 4 updated to mirror the bucket structure in the saved gap-report markdown (Bucket 1 / 2 / 3 sections + User decisions log + Fix history log).
- [README.md](../../../README.md) § Validate "After the gap report — fix loop": prepended the three-bucket table + explicit-prompt rule + dependency-callout rule to the existing finding-type fix-surface table. The two are complementary: bucket structure governs the human dialogue, finding-type table governs the technical fix.
- [SKILL.md](../SKILL.md) § "Audit recipe": added a paragraph at the end of the section pointing to the three-bucket template, explaining why (unclear next steps stall audits), and noting the dependency-callout rule.

**Reasoning.** The earlier README change made the fix loop visible (what to do per finding type once the user has decided to fix). The missing piece was: how does the user *decide* what to fix, given an audit produces 5+ different shapes of findings (MISSING, WRONG-OWNERSHIP, SCOPE-CREEP, BAND failures, BOUNDARY issues, Phase-0 candidates)?

The three buckets correspond to three different **decision shapes**:
- Bucket 1: yes/no on a vetted fix → the agent does it
- Bucket 2: judgment/policy → the user supplies the answer
- Bucket 3: research vs eyeball → the user picks the vetting path

Bundling them into a single dump-and-wait produces the "I'll figure it out later" failure mode. Separating them with per-bucket prompts forces deterministic next steps.

The explicit prompt wording matters. "What do you want to do?" invites no specific answer. "Fix these now? Reply 'all', 'just 1, 3, 5', or 'skip'." has a clear response shape. The prompt scripts in the procedure file are the floor; agents may adapt the wording but must preserve the per-bucket shape.

The dependency rule prevents the user from spending judgment on a Bucket 2 question that's about to be obsolete because Bucket 3 research will reveal the right answer. When dependencies exist, sequencing matters; when they don't, the user can resolve buckets in any order. Either way, the dependency state is explicit.

**Scope.** Catalog-wide. Future Validate runs produce three-bucket reports with explicit per-bucket prompts. The saved gap-report markdown mirrors the bucket structure plus an append-only decision log and fix history.

**Status.** active.

---

## 2026-05-28 — Add cross-domain relationships to bilateral pass; clarify Research vs Validate scoping

**Context.** Two more questions from user that exposed gaps:

1. *"Reconcile A and B — checks only handoffs or more?"* The four-leg analysis (lifecycle states + trigger events + handoffs + DMDO coverage + boundary integrity) covers the handoff substrate but does NOT check cross-domain `data_object_relationships`. These are the structural mirror of cross-domain handoffs: a handoff says *"event X fires from A to B"*, a relationship row says *"A's master has a verb to B's master"* (e.g. `job_offers spawns onboarding_journeys`). The relationship graph drives the mermaid renderer in blueprints and the navigation hints in the architect view; missing relationships leave both silently incomplete. The bilateral pass needs Section 5.

2. *"Is Research only for new domains? What happens when I research an existing domain?"* The README's Research mode listed "extending an existing domain's module set" as a use case without clarifying that adding *new entities to an existing module* is a Validate-then-fix flow, not Research. That ambiguity let the agent run Research on a loaded domain, which means Phase 0 enumerates the market surface from scratch without seeing existing state, and Phase B's idempotent loader skips-or-inserts based on natural keys without catching wrong-ownership or scope-creep that's already there. Existing problems get papered over.

**Decision.** Two changes:

1. **Bilateral pairwise reconciliation gains Section 5 — Cross-domain `data_object_relationships`.** Query `/data_object_relationships?and=(data_object_id.in.(<A-masters>),related_data_object_id.in.(<B-masters>))` plus the symmetric direction. For every cross-domain handoff with a clean payload→target mapping, the catalog should carry a corresponding relationship row. Surface **MISSING-RELATIONSHIP** (handoff without matching relationship) and **ORPHAN-RELATIONSHIP** (relationship without matching handoff). Fix via per-row authoring of the B6/B8-shape relationship row. The diff file now contains ten sections per direction (was eight).

2. **README Research vs Validate scoping clarified.** Research applies to **NEW SCOPE** only:
   - New domain (no `domains` row yet)
   - New module added alongside existing modules in an already-loaded domain
   - Vendor / competitor scans with no intent to load
   - "Is X a domain?" classification

   Anything else — adding entities to an existing module, suspected wrong-ownership, scope creep, modularization mistakes — routes through **Validate** first. Validate finds the gaps; the fix loop runs Phase B inserts to close them.

   Research mode gains an explicit **pre-flight against existing state** when the domain already exists: pull `domain_modules` + `domain_data_objects` + `data_objects` for the domain BEFORE Phase 0, feed to the subagent so its vendor-surface enumeration produces a **delta-shaped proposal** (which surface entities belong in the new module vs. which already exist in sibling modules). Avoids naming collisions and scope overlap. Phase B's naming-collision check (Rule #9) applies as usual.

**Files changed.**
- [SKILL.md](../SKILL.md): added Section 5 to the pairwise reconciliation diff procedure with the query, diff semantics (MISSING-RELATIONSHIP / ORPHAN-RELATIONSHIP), and fix instructions. Updated "four sections per direction (eight total)" to "five sections per direction (ten total)".
- [README.md](../../../README.md): rewrote Research "Use for" to list the four legitimate new-scope cases and explicitly redirect existing-domain extension to Validate; updated Research's "What it does" to describe the pre-flight against existing state for the new-module-in-existing-domain case and the delta-shaped Phase 0 proposal; rewrote Validate "Use for" to list "extending an existing module's entity coverage" as a Validate→fix-loop concern, not a Research concern.

**Reasoning.** The handoff/relationship pair was a known symmetry — handoffs encode events, relationships encode the verb graph; every payload-mapping handoff should have a relationship mirror. The four-leg analysis was authored before relationships were widely loaded; with the catalog now using relationships extensively for the blueprint mermaid renderer and architect-view navigation, the gap was visible enough to fix.

The Research vs Validate ambiguity was a real source of unreliable behavior. The agent was routing "extend the X domain with more entities" requests through Research, which produced thin Phase B drafts that silently overrode existing entity-level decisions. Forcing the existing-domain extension case through Validate-then-fix preserves the per-finding fix loop (MISSING → Phase B insert via loader) and ensures the existing footprint is examined before new rows are proposed.

**Scope.** Catalog-wide. Future bilateral reconciliation produces ten-section diffs. Future Research invocations on an existing domain pre-flight the existing state and propose a delta; future "extend X with more entities" requests route through Validate.

**Status.** active.

---

## 2026-05-28 — Make Validate's fix loop explicit; add M7 (within-domain ownership uniqueness)

**Context.** Same-day follow-up to the prior consolidation entries. User asked two questions:

1. *"When Validate finds problems, what to do?"* The fix surface per finding type was documented in references but never synthesized into a single "after the gap report" flow in the README. Users (and the agent) had to piece the loop together from multiple sources.

2. *"Does Validate check module scopes — are the data_objects of the domain owned by the right `domain_module`?"* Honest answer: only semantically, via Pass 1 (Market audit's WRONG-OWNERSHIP finding). No structural check existed for within-domain redundancy (same `data_object_id` mastered in one module and embedded_master shell in a sibling module of the same domain, or master + consumer in the same domain). The structural M-band checked things like "every module has ≥1 master" and "every capability has a realizing module" but didn't cross-check the ownership map across modules of the same domain. Catalog-internal inconsistencies that didn't require market knowledge were going undetected.

**Decision.** Two additions:

1. **README Validate mode gains an explicit "After the gap report — fix loop" subsection.** Table mapping each finding type to its fix surface: MISSING → Phase B insert via idempotent loader; WRONG-OWNERSHIP → DELETE wrong DMDO + INSERT right module; SCOPE-CREEP → DELETE + cascade; STRUCTURAL → per-band fix; BOUNDARY (NULL FK / missing handoff) → PATCH or author rows; MODULARIZATION → separate refactor conversation (parking lot, not a loader run). Plus the acceptance criterion for re-running Validate and what "passes" means.

2. **New structural check M7 — within-domain ownership uniqueness.** Pulls every DMDO row across the domain's modules, classifies role combinations on data_objects with >1 row, and surfaces:
   - **Hard fail**: same data_object has `master` + `master/consumer/contributor` across sibling modules (incoherent)
   - **Soft fail**: same data_object has `master` + `embedded_master` across sibling modules (redundant; the embedded shell is dead weight when the local master serves the whole domain)
   - **Pass with note**: same data_object has `consumer` (or `contributor`) in multiple modules of the same domain (allowed, but flag if scope overlap suggests deduplication)
   - **Pass**: same data_object has `embedded_master` in multiple starter modules (Rule #19 standalone-deploy shape) — legitimate.

   M7 is a catalog-internal structural query. No market knowledge needed; no subagent required. Routes failures into the existing fix loop: DELETE the wrong row, INSERT in the right module, or surface to user when ambiguous.

**Files changed.**
- [README.md](../../../README.md): added "After the gap report — fix loop" subsection to Validate mode with the finding-to-fix table and the re-run acceptance criterion.
- [SKILL.md](../SKILL.md): added M7 to the M-band with full query + pass criteria + fix instructions; updated "M1–M6" references to "M1–M7" in the audit recipe and elsewhere.

**Reasoning.** The fix loop was implicit and discoverable in references but the agent kept losing track of "what comes next after a Validate finds things". Putting the loop in the README's Validate section means it's loaded automatically whenever the validation triggers fire. The table makes the fix surface unambiguous per finding type.

M7 was a real gap. The market audit catches semantic wrong-ownership ("this entity belongs in a different module per vendor practice") but couldn't catch catalog-internal redundancy that wasn't tied to market knowledge (two modules of the same domain each holding a master/embedded_master of the same data_object). Those failures are local to the catalog and don't need a subagent — a single PostgREST query plus a script-side classification gives the right answer.

Both changes follow the prior pattern: the data was already there (DMDO rows for M7, finding-to-fix mapping for the loop); the procedure just wasn't using it explicitly.

**Scope.** Catalog-wide. Future Validate invocations include M7 in the structural pass. Future fix loops follow the table in the README.

**Status.** active.

---

## 2026-05-28 — Drop Phase D from mode menu; expand Validate with auto-neighbor-discovery + per-neighbor pairwise

**Context.** Same-day follow-up to the prior "Collapse to 2 modes + 1 analytic" decision. User pushed back on two points:

1. **Phase D as mode (c) was a category error.** Phase D is process-skill discovery for the agent-tooling layer (buckets cross-domain handoffs by trigger-event prefix, ranks candidate process skills for the agent-tooling layer to wrap). It's not domain validation. Listing it as a peer mode of Research and Validate implied it's something users regularly invoke on a domain — it isn't. It's a catalog-wide analytic invoked rarely.

2. **Pairwise handoff reconciliation shouldn't require manual two-domain input.** The catalog already encodes the related-domains graph: `handoffs.source_domain_id` / `handoffs.target_domain_id` name every cross-domain event-exchange edge, and cross-domain `domain_module_data_objects` rows (consumer / contributor / embedded_master pointing at foreign-domain masters) name every cross-domain dependency. For domain X, two queries return its neighbor set. Phase B authoring already populates both surfaces, so any single-domain Research load creates the neighbor edges as a side effect. The bilateral pass should auto-discover neighbors, not wait for user input.

**Decision.** Two changes:

1. **Phase D drops out of the README's primary mode menu.** Stays documented in SKILL.md § "Phase D — Process-skill discovery". Mentioned in README under "Things that look like modes but aren't" so the trigger phrases are still findable. The README header becomes "Two modes" (was "Two modes plus one analytic").

2. **Validate mode expands from 2 passes to 4 passes** (per the single-domain trigger; same 4 passes whether the user names one domain or two):
   - Pass 1: Market audit (semantic, vs vendor surface)
   - Pass 2: Structural completeness checklist (A/M/B/C/D/E/F bands)
   - Pass 3: **Neighbor discovery** — auto-derive related domains from `handoffs` (both directions) + cross-domain DMDO rows; rank by edge weight (number of handoffs + dependency count)
   - Pass 4: **Per-neighbor pairwise reconciliation** — run the four-leg analysis against every neighbor with edge weight ≥3 by default; lighter neighbors get a one-table summary

   Manual bilateral form (user names two domain codes) becomes a fallback for "I just want to check one boundary".

**Files changed.**
- [README.md](../../../README.md): dropped Phase D section; rewrote Validate's "what it does" from 2 passes + optional bilateral to 4 mandatory passes; added Phase D to "Things that look like modes but aren't" with triggers preserved; header "Two modes plus one analytic" → "Two modes".
- [SKILL.md](../SKILL.md): updated three section callouts to say "four passes" instead of "two passes" and to call out neighbor discovery + pairwise as default-on. Specifically: § "Audit recipe — structural pass of the Validate mode" now references all four passes; § "Domain-level market audit — semantic pass of the Validate mode" same; § "Pairwise handoff reconciliation — per-neighbor pass of the Validate mode" (renamed from "bilateral form") now explains auto-discovery via the query pattern, ranks by edge weight, defaults to deep-dive on weight ≥3, and frames the manual two-domain form as a fallback.

**Reasoning.** Phase D and Validate are different shapes of work. Putting them in the same menu implied users would alternate between them, which they don't. Phase D is invoked when the agent-tooling layer needs new process skills; Validate is invoked when a domain needs verification. Separating them in the README cleans up the user's mental model.

The auto-discovery change is more consequential. The previous design required the user to name the two domains for bilateral reconciliation — which meant the boundary was only ever checked when the user explicitly remembered to do it. Most boundaries went unchecked. With auto-discovery, every Validate run automatically reaches every neighbor of the named domain, so the boundary coverage scales with the number of Validate invocations rather than with the user's memory.

The data was always there; the procedure just wasn't using it. Same pattern as Phase 0 (the vendor surface info was always findable from public docs; the procedure just hadn't required the agent to enumerate it).

**Scope.** Catalog-wide. Future Validate invocations should run all four passes by default. Phase D triggers still work but route to the SKILL.md section directly, not via the README mode menu.

**Status.** active.

---

## 2026-05-28 — Collapse invocation surface to 2 modes + 1 analytic

**Context.** Earlier the same day, added Phase 0 (vendor surface research) and a domain-level market audit as new mechanisms (see the entry below). Drafted a README that listed 9 invocation modes — Phase 0 alone, Phase A→S full load, market audit alone, structural completeness checklist alone, pairwise reconciliation, Phase D discovery, vendor research, single-row edits, fact-sheet emission. User pushed back: the proliferation of modes is itself a quality problem. Calling Phase 0 a separately-invocable mode reifies the failure pattern — it implies Phase 0 is optional when the whole point is that it CANNOT be skipped from a domain research workflow. Same for market audit and structural checklist being presented as independent triggers: running just one is exactly how gaps fall through in both directions.

**Decision.** Collapse the invocation surface to two modes plus one analytic. Each mode runs its sub-stages as a mandatory sequence, not as a menu.

1. **Research a domain** — Phase 0 → A → B → C → S as a mandatory sequence with user-review gates between phases. Mode stops at the right phase based on intent (classification questions stop after Phase 0; competitor research stops after Phase A; an actual load runs through Phase S). Stopping early is fine; **skipping Phase 0** is not. Trigger phrases are mode-level (*"research the X market"*, *"is X a domain"*, *"find competitors for Y"*), never phase-level. Covers everything that was previously: Phase 0 alone, Phase A/B/C/S load, vendor/competitor research no-load, classification questions, extending an existing domain.

2. **Validate a domain** — market audit pass + structural completeness checklist pass, **always together**, combined gap report. Bilateral form (two domain codes) adds pairwise handoff reconciliation walking the boundary. Trigger phrases are mode-level (*"validate X"*, *"audit X"*, *"verify X"*, *"is X fully loaded"*), never pass-level. Covers everything that was previously: market audit alone, structural checklist alone, pairwise reconciliation.

3. **Phase D — Process-skill discovery** — catalog-wide analytic, separate because it operates on the catalog rather than a single domain. Different shape entirely.

Things that look like modes but aren't, and shouldn't be reached for as if they were: Phase 0 alone (sub-stage of Research), Phase A alone (same), market audit alone (sub-pass of Validate), structural checklist alone (same), single-row edits (just CLI calls), fact-sheet emission (a build step, `bun run scripts/emit_fact_sheet.ts`).

**Files changed.**
- [README.md](../../../README.md): rewrote from 9-mode menu to 2 modes + 1 analytic, with mode-level trigger phrases and "Things that look like modes but aren't" section.
- [SKILL.md](../SKILL.md): tightened the trigger framing in three audit-recipe sections to clarify they're **passes of the Validate mode** (always paired), not standalone modes. Specifically: § "Audit recipe" now says "structural pass of the Validate mode"; § "Domain-level market audit" now says "semantic pass of the Validate mode"; § "Pairwise handoff reconciliation" now says "bilateral form of the Validate mode". Each section's intro callout reinforces "never invoke alone".

**Reasoning.** Modal proliferation is one of the mechanisms producing unreliable research quality. When the agent sees a menu of 9 modes, it picks one and runs that one — which means it runs Phase B when asked for a load, skipping Phase 0; it runs market audit when asked to verify, skipping structural; it treats sub-stages as alternatives rather than as parts of a sequence. Documenting them as separate modes gives the agent permission to skip the others. The README is itself a load-bearing rule surface — what it lists as triggerable shapes how the agent behaves.

The actual operational shape is binary: you're either **adding** to the catalog (Research) or **verifying** the catalog (Validate), with one separate analytic that operates on the substrate rather than on a domain (Phase D). That's the right granularity. Everything finer is sub-stage detail that lives inside the mode procedure, not in the trigger menu.

**Scope.** Catalog-wide. The README is the entry-point reference; SKILL.md retains all the procedural detail but reframes the trigger language. Future invocations should land in one of the three modes; sub-stage triggers are no longer documented as legitimate entry points.

**Status.** active.

---

## 2026-05-28 — Add Phase 0 (vendor surface research) and domain-level market audit

**Context.** ATS-CANDIDATE-CRM landed in the catalog with three out-of-domain rows (`skill_profiles` contributor+required, `career_aspirations` consumer+optional, `internal_opportunities` embedded_master+optional) and zero engagement substrate (no `candidate_engagements`, no `nurture_campaigns`, no `event_attendances`, no `recruiter_interactions`, no `candidate_consents`). User questioned each row. Audit of the other 7 ATS modules surfaced the same shape repeatedly:

- `ATS-TALENT-POOLS` had `talent_pools` + `candidates` only — missing memberships, segments, saved searches.
- `ATS-BACKGROUND-CHECKS` had `background_checks` only — missing the entire FCRA compliance layer (disclosures, components, adjudications, adverse-action notices, disputes).
- `ATS-REFERRALS` had `candidate_referrals` only — missing the reward economy (rewards, payouts, campaigns).
- `ATS-RECRUITMENT-PIPELINE` was missing pipeline stages, stage transitions, requisition approvals, posting distributions, screening questions/answers, and EEO responses. Plus scope-creep consumers from workforce-planning.
- `ATS-INTERVIEWS` was missing interview kits, panels, assessment templates, question banks, availability slots.
- `ATS-OFFERS` was missing offer versions, approval chains, offer letter documents.

Fix: hand-authored corrections, loaded via `.tmp_deploy/fix_ats_modules.ts`. +32 data_objects, +33 DMDO rows, +91 lifecycle states, +32 relationships across 7 modules.

User pushed back on the root cause: why did this happen catalog-wide?

**Decision.** Add two complementary discipline mechanisms to close the failure mode:

1. **Phase 0 — Vendor surface research** (new load-time phase, ahead of Phase A). For new domain loads and module-set extensions, enumerate flagship vendors and their entity surfaces *before* drafting any rows. The enumeration produces a markdown report (saved to `c:/tmp/<DOMAIN>-phase0-<date>.md`) that Phase A and B then use as a subtraction list — every Core/Common/Compliance entity in the matrix either loads with justification or is explicitly skipped with a one-line reason. Full procedure: `references/vendor-research-protocol.md`. SKILL.md additions: callout in workflow intro; new Phase 0 entry in step 5; new bullet in subagent prompt discipline section requiring Phase 0 surface as input or as subagent first-step.

2. **Domain-level market audit** (new audit recipe, complementary to the per-domain structural completeness checklist). Re-runnable diff of current catalog state against a freshly-generated vendor surface. Surfaces four categories: MISSING (gap), WRONG-OWNERSHIP, SCOPE-CREEP, MODULARIZATION ISSUES. Functions as the regression test for Phase 0 — when a load violated Phase 0 or pre-dates it, the next market audit catches the drift. Full procedure + subagent prompt template: `references/domain-audit-procedure.md`. SKILL.md addition: new "Domain-level market audit" section inserted right after the structural Audit recipe.

**Reasoning.** The catalog's existing audit discipline verified structural correctness (every domain has ≥1 master, every junction has its qualifier, every module has its system skill). It did not verify semantic coverage at the domain level. A module could pass A/M/B/C/D/E/F with the headline noun + a couple of embedded shells and still ship a thin point-solution surface. The hole opened specifically during modularization: pre-modular Phase B drafted against a whole domain's market surface in one pass; post-modular Phase B got split into per-module passes, each scoped narrowly. No single pass owned the "does the union of modules cover the full market" question.

Hand-authoring per-market archetype reference files (originally proposed) would not scale to 100+ domains and would drift the moment a market evolved. AI-generated surface on demand (per audit run) is the load-bearing mechanism; small hand-authored reference (compliance entities per regulated market) covers the narrow exception where regulation demands specific entities regardless of vendor practice.

The two changes are paired, not independent: Phase 0 prevents the failure at load time; the market audit catches drift when load discipline slips or for domains that pre-date the discipline. Audit serves as the regression test for Phase 0.

**Scope.** Catalog-wide. Applies to every new domain load (Phase 0 mandatory unless skip case matches); applies to every "audit X" / "verify X" / "is X fully loaded" trigger (market audit recommended alongside structural audit). Already-loaded domains that pre-date Phase 0 will be triaged via the market audit as the user works through them.

**Status.** active.

---

## 2026-06-06 - Per-domain-skill restoration: tools move to modules, `skill_tools` retired

**Context.** Tool requirements were stored on per-module `system` skills (one skill per `domain_modules` row, with a `skill_tools` junction). That grain was wrong: it sharded the agent surface to mirror the module decomposition, contradicted Rule #17's "one coherent domain agent", and made the source-of-truth doc self-contradict on skill grain. The catalog held 312 system skills (251 per-module + 61 per-domain), 2767 `skill_tools`.

**Decision.** A tool is ATOMIC (lives once in `tools`). Tool requirements are m:n RELATIONSHIPS on the deployable unit: `domain_module_tools` (module ↔ tool) and `process_tools` (process ↔ tool). A `system` skill exists per DEPLOYABLE UNIT only: one per DOMAIN (`domain_id` set, `domain_module_id` null) and one per STARTER module (`module_kind='starter'`); FULL modules get NO skill. A `process` skill links via `skills.process_id`. Every skill DERIVES its toolset from the unit's relationships and stores no tools. `skill_tools` is dropped.

**Reasoning.** One domain agent reasons across the domain's modules without inter-skill handoffs; per-module coverage stays computable as a rollup over each module's `domain_module_tools` (a property of `module -> its tools`), so the per-deployable-unit coverage distinction survives without a skill row per module. Storing requirements on the unit (not the skill) makes the skill a pure derivation and removes the duplicate-tool risk.

**Migration (plans/per-domain-skill-restoration.md, executed).** Created `domain_module_tools` + `process_tools`; migrated the 2013 per-module `skill_tools` to `domain_module_tools` (1927 full + 86 starter); created/reused one domain-grain system skill per full-module domain (65 new, 55/57 reused for the EMP-EXP/EXPENSE name collisions); purged the 528 per-domain-skill `skill_tools` (snapshot retained in `plans/snapshots/`; re-authoring at module grain enrolled in `audits/_modularization-backlog.md`, 57 domains + 5 orphan `side_effect` links); built the 3 value-stream `processes` and migrated the 226 process `skill_tools` to `process_tools`; deleted the 244 FULL-module system skills by predicate (cascade) and dropped `skill_tools`. Accounting closed exactly: 2767 = 624 + 226 + 1917. SKILL.md (Rule #17/#18/#19, Phase S, Semantius-score, F-band) and the `coverage_rollup.ts` / `audit_backlog.ts` / `emit_fact_sheet.ts` scripts were repointed; `module-shape.md` / `semantius-coverage-rollup.md` / `discover-cross-domain-processes.md` / `roles.md` updated.

**Scope.** Catalog-wide. The F-band now derives coverage from `domain_module_tools` (F3) with starters exempt from F1; `audit_backlog.ts` F2 flags FULL modules lacking `domain_module_tools`.

**Status.** active.

---

## 2026-06-06 — Review/audit executes fixes; only report/check is read-only (Rule #21)

**Context.** The Validate mode was defined as read-only: an audit wrote agent-solvable items into `b1a` and stopped, so reviewed domains came back as to-do lists nobody executed. A catalog-wide check found ~118 of 151 domains sitting on un-run `b1a` (most created by the late-May / early-June per-domain audits and never executed). The user pushed back hard: requesting a "review" or "audit" changed nothing.

**Decision.** Added SKILL.md Rule #21. "review / audit / validate / finish X" now EXECUTES every additive/corrective fix (`b1a`) in the same pass, landing rows at `record_status='new'`; a reviewed domain ends either agent-finished or waiting-on-user. "report / check / check only" is the only read-only mode. Destructive steps (DELETE, overwrite a non-empty value, replace/restructure) are never executed unapproved on ANY table (skills are not special; the action is what matters, not the table). `b3` and new-domain candidates are non-blocking ideas that never gate "finished"; `b3` is never a split (a new/split module, split/new domain, or moving a master between domains is a `b2`). "Finished" = `b1a` done AND no open `b2` AND no pending destructive approval.

**Reasoning.** The defect was a definition, not a one-off: diagnosis and execution were split and only diagnosis ran. Rule #1 (never stamp `approved`) is preserved by leaving fixes at `record_status='new'`, so the user still reviews the result in-record; the chat-gate on agent-solvable work was needless friction. The additive/destructive boundary replaces the earlier ad-hoc "be careful with skills" framing surfaced during this session: an unapproved destructive action is the violation regardless of table.

**Scope.** Catalog-wide; changes the Validate-mode contract. Rule #21 explicitly overrides every "audit is read-only / never auto-load / triage-list / surface before fixing" passage in SKILL.md and `references/` (those now describe report/check only). Mirrored in `CLAUDE.md` and `audits/README.md` (b3 reclassification + `next_action_by` execution contract).

**Status.** active.

---

## 2026-06-06 — Read `state.yaml` FIRST on any review; live queries never lead

**Context.** On a "review DCG, PSA, SUB-MGMT" request the agent's first action was live PostgREST band queries (a fresh from-scratch audit) instead of opening each `audits/<DOMAIN>/state.yaml`. The three domains already had a full 2026-05-31 triage committed (open `b1a`/`b1b`/`b2`/`b3`). The user pushed back hard: the whole point of `state.yaml` is that a review continues from it, not re-derives the audit from zero. Damage was limited to wasted reads this time, but the general failure mode is duplicated triage and re-opening settled `b2` decisions.

**Decision.** Added a Step 0 to the Validate "Audit recipe — structural pass": for any review / audit / validate / finish of an EXISTING domain, the first action is to read `audits/<DOMAIN_CODE>/state.yaml` (and skim `history.md`) BEFORE any live query. Live queries come next, only to verify/refresh the recorded worklist items against current state. When state exists, drive execution from its worklist. The only mode that skips state is an explicitly-requested "fresh audit" (regenerate state from scratch).

**Reasoning.** The defect was a sequencing/precedence error rooted in conflating "read the existing state" (the committed worklist) with "query live." The audit recipe started at "Resolve DOMAIN_CODE to id" with no read-state step, so nothing forced the right order. The committed worklist is the cheap, authoritative entry point; live PostgREST is for verification, not discovery, when a prior triage exists.

**Scope.** Catalog-wide; Validate-mode entry sequencing. Complements the README `state.yaml` execution contract and Rule #21 (review executes fixes) — Step 0 governs where a review STARTS; Rule #21 governs what it DOES.

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

---

## 2026-05-28 — M7 rewritten: scope catalog-wide, drop the bogus master+embedded_master soft-fail

**Context.** Mid-Validate of WORK-MGMT, the agent flagged `work_items` (mastered in module 149, embedded_master in module 150 — both `module_kind='full'`, both in domain 135) as an M7 soft-fail and asked the user how to reconcile it. The user pushed back: each module is supposed to be deployable alone, so the embedded shell is load-bearing, not dead weight. They asked whether the soft-fail text was wrong and whether the real concern (two `role='master'` rows) was being checked.

Inspection confirmed both:

- The at-a-glance section describes `domain_modules` as **"autonomous deployable units inside a domain"**. Under that framing, a full module B that's installable without sibling module A must ship an `embedded_master` row for any data_object A masters, so B has a local shell at the deploy boundary. That's the textbook shape Rule #19 spells out for starters — and the same logic applies to any standalone-deployable full module. The M7 soft-fail text labeled this case "redundant... dead weight" and recommended DELETEing the embedded_master row, which would break standalone deploy of B.
- The genuine catalog-wide invariant (one `role='master'` row per `data_object_id`, enforced by the blueprint emitter) was scoped in M7 only to *within-domain* via the rule's title ("Within-domain ownership uniqueness"). A query on `okr_objectives` (id 245) surfaced an actual catalog-wide hard fail: module 150 (WORK-MGMT-GOALS-OKR, domain 135) AND module 51 (TALENT-PERFORMANCE-MGMT, domain 58) both carry `role='master'`. M7 as written would not have caught it because the two masters sit in different domains.

The 2026-05-26 "Module-split criterion for shared data_objects" decision was the upstream cause for the okr_objectives multi-master. That decision correctly identified that WORK-MGMT-GOALS-OKR should master `okr_objectives` per vendor evidence (Asana/Monday/ClickUp Goals), but the implementation note said *"the existing okr_objectives lifecycle rows currently anchored to TALENT-PERFORMANCE-MGMT can stay there per the multi-master pattern."* That clause conflated "lifecycle states realized in module 51" (legitimate via `domain_module_data_objects.role='embedded_master'` + `data_object_lifecycle_states.domain_module_id=51`) with "master row in module 51" (illegitimate under the single-master rule). The TALENT-PERFORMANCE-MGMT row was never demoted, so the catalog has carried the multi-master since.

**Decision.** Rewrite M7 to:

1. **Drop the soft-fail clause for master + embedded_master within a domain.** Replaced with an explicit `Pass` outcome: the embedded shell is expected under autonomous-deployable-units. No surface-for-review, no DELETE recommendation.
2. **Extend the hard-fail scope to catalog-wide.** The new Query 1 pulls every `master` row for the audited domain's mastered data_objects across the whole catalog, counts rows per `data_object_id`, and fails on >1. Query 2 keeps the within-domain role-coherence check (master coexisting with consumer/contributor is incoherent in any scope, but specifically detected within a domain).
3. **Re-title** from "Within-domain ownership uniqueness" to "Single-master integrity" to match the actual invariant.
4. **Fix guidance for the catalog-wide hard fail** is "surface to user, demotion is a design decision" — not a mechanical DELETE — because the decision (which side keeps mastery, and whether the demoting side becomes embedded_master or consumer) needs editorial input.

**Reasoning.**

The catalog has two independent invariants on multi-master rows. M7 conflated them:

- *Catalog-wide single-master* is structural. Exactly one row in `domain_module_data_objects` per `data_object_id` has `role='master'`. The deployer / emitter cannot pick a canonical owner otherwise. This needs to be caught at audit time everywhere, not only within a domain.
- *Within-domain role coherence* is workflow-level. A domain mastering AND consuming the same record is incoherent regardless of which modules sit in the domain.

The master+embedded_master case wasn't one of these invariants at all — it was the *correct shape* under autonomous-deployable-units that M7 mistakenly punished. Removing it makes the rule consistent with Rule #19's reasoning and the at-a-glance "autonomous deployable units" framing.

**Scope.** SKILL.md § M7 only. Per-domain audit recipe references to "M1–M7 failures block downstream concerns" still apply unchanged. Every prior audit transcript that called M7 soft-fail "OK to live with" or "documented exception" remains correct under the new wording — the rule now agrees those cases are passes, not soft-fails.

**Status.** Active. The okr_objectives hard fail surfaced by the WORK-MGMT audit is the first finding the rewritten rule catches; resolution (TALENT-PERFORMANCE-MGMT demotes to `embedded_master`, or the alternatives) is pending user decision in that audit thread.

### Process note

The 2026-05-26 module-split decision's "lifecycle rows can stay there per the multi-master pattern" clause should be read narrowly going forward: lifecycle states can sit on multiple modules (because `data_object_lifecycle_states.domain_module_id` is per-row), but `domain_module_data_objects.role='master'` must collapse to one canonical owner. Future module splits that touch a multi-master data_object need an explicit demotion step on the non-canonical side, loaded in the same migration as the new master row. Skipping it produces silent catalog-wide hard fails of the shape M7 now catches.

## 2026-05-31 — Rule #12 moved to a typed column; add B13; ATS audit cleanup

### What changed

- New column `data_objects.entity_type` (enum: `operational_workflow`, `operational_record`, `catalog`, `junction`, `computed`, `unclassified`; default `unclassified`, NOT NULL).
- **Rule #12** rewritten in SKILL.md. The rule was previously a per-row judgment surfaced to the user at audit time ("is this config-shape exempt?"); it is now driven by `entity_type`. Only masters with `entity_type='operational_workflow'` fail B12 when missing lifecycle states. All other classified values pass B12 regardless of lifecycle presence.
- **B12 in the per-domain completeness checklist** rewritten to read `entity_type` and only fail on `operational_workflow + no states`. The prior "config-shape exemption recorded in notes" pattern is gone; the exemption is now structural via the typed column.
- **B13 added to the per-domain completeness checklist**: count `data_objects.entity_type=unclassified` for the domain's masters; pass = 0. Surfaces unclassified rows as audit failures so the typed column can never silently sit empty.
- **`data_objects.notes` description** patched to remove the stale "(1) config-shape exemption justification" use case (Rule #15 had already rescinded the license; this change closes the loop by removing the description's reference to it).
- **Audit recipe "in-scope fix" list** extended from `B11–B12` to `B11–B13`.
- **`references/module-shape.md`** `data_objects` table updated to list `entity_type` next to `kind`.
- **ATS** backfilled: all 22 ATS masters previously without lifecycle states now carry `entity_type` (8 operational_record, 7 catalog, 2 junction, 5 operational_workflow). Loader: [scripts/loaders/backfill_ats_entity_type_2026_05_31.ts](../../../../scripts/loaders/backfill_ats_entity_type_2026_05_31.ts).

### Why

Rule #12's per-row "surface to user for judgment" mechanic produced two pathologies that repeated every audit:

- **False-positive noise.** Catalog tables (taxonomies, question banks, template libraries), junctions (assignment tables), append-only logs, and other genuinely-stateless rows all triggered the rule even though their statelessness was correct. The reviewer had to confirm each one as "config-shape exempt" pass after pass, since the prior decision was recorded only in chat or in `notes` (which Rule #15 then rescinded). Without a structural record, every audit re-asked the same questions about the same entities.
- **False-negative silence.** Operational entities that genuinely needed a state machine could ship without one if the audit user grew tired of the false-positive noise and started rubber-stamping. The 2026-05-31 ATS audit caught five real compliance-driven gaps (`pre_adverse_action_notices`, `applicant_flow_records`, `data_subject_requests`, `fcra_summary_of_rights_acknowledgements`, `voluntary_self_identifications`); under the old rule they were buried alongside 17 non-gaps.

The discussion that produced the change worked through three iterations:

1. *"Append-only log"* was initially a proposed shape; conceded as not real (Semantius tables all support CRUD; append-only is an application-layer property, not a structural one). Collapsed into `operational_record`.
2. *Lifecycle presence as the second axis* was considered (two-column design: `entity_type` + `lifecycle_required: bool`). Rejected after noting that for non-operational entities, the existence of lifecycle states *is itself* the declaration that the entity needs them; no second decision exists to record. One column suffices.
3. *Workflow vs state-machine* as separate concepts was considered. Conceded as the same concept: every state machine is a workflow. The real distinction is gating (`requires_permission` on each state), already captured by the existing column. Collapsed.

### Impact (catalog-wide measurement)

Pre-change Rule #12 surface (catalog-wide masters without lifecycle states): **148**. Heuristic classification under the new rule:

- operational_workflow: 79 (still surfaces)
- catalog: 42 (auto-passes)
- operational_record: 14 (auto-passes)
- computed: 7 (auto-passes)
- junction: 6 (auto-passes)

Mechanical heuristic disappears 69 of 148 = 47%. After careful per-entity classification (the actual backfill workflow), the operational_workflow set shrinks further (the heuristic over-attributes things like `audiences`, `course_modules`, `service_slas`, `salary_bands` to operational_workflow when they are catalog). Realistic post-backfill reduction: ~70%, leaving ~40-50 genuine workflow-gap rows catalog-wide, which is the population that should have always been surfaced.

### Scope of this change

- Schema: one `create_field` call against `data_objects` (catalog-wide column add, default `unclassified` so no data migration needed).
- ATS: 22 rows backfilled to specific values.
- SKILL.md + module-shape.md + this changelog: in-place edits.
- **Not in scope:** catalog-wide backfill of the other 906 - 22 = 884 data_objects rows. They sit at the default `unclassified` until a future per-domain pass touches them. Each domain audit that runs against an unclassified domain will surface B13 failures and prompt the backfill at that point.

### Process notes

- The earlier "surface to user during audit, possibly track via PR description / gap report" mechanism is RESCINDED for the config-shape exemption specifically. That mechanism only ever existed to compensate for the missing structural column; with the column in place, the workaround is no longer needed and authoring it would re-introduce the false-positive noise this change closes.
- Pattern flags (`has_personal_content` / `has_submit_lock` / `has_single_approver`) are unchanged. They still need to be considered for `operational_workflow` masters, and `notes` is still forbidden for explaining a flag (Rule #15).
- Workflow-gate permission materialization (Rule #14 derivation from `data_object_lifecycle_states` with `requires_permission=true`) is unchanged. The change only affects *which* entities the audit demands a state machine on; the materialization mechanic that consumes the state machine continues as before.

### Status

Active. ATS is the first domain on the new contract. Catalog-wide backfill will land incrementally as each domain is audited.

## 2026-06-01 - Plan 1: consistency and invariants reconciliations

**Context.** The 2026-06-01 coherence audit (plans/model-map-coherence-audit.md) found documentation and emitter contradictions needing mechanical fixes with no new modeling. Plan 1 (plans/plan-1-consistency.md) executed them.

**Decision.** Several reconciliations are now canonical:
- **m1:** the lifecycle exemption is structural via `entity_type` (config / record / catalog / junction / computed), not a notes annotation. SKILL.md ~line 662 rewritten to match Rule #12 / Rule #15; the notes-based exemption surface is gone.
- **M15a:** the `skills` system-skill anchor is `domain_module_id` (required-when-system, Rule #14 / #17); `domain_id` is transitional. Documented in references/module-shape.md, with a new `handoff_processes` field-shape section and the at-a-glance inventory recounted to 33 entities (13 junctions; this also corrected a pre-existing 12-vs-14 junction-count mismatch).
- **m4a:** `owner_side` added to the `data_object_relationships` manifest with its delete-mode semantics.
- **Rule #13 reframed:** the enum table is a generated / checked artifact, not hand-authored truth. Live `/fields` is the only source of truth; scripts/analytics/enum_drift_probe.ts verifies the table against live (subsumes the B6 finding). `handoff_processes.proposal_source` / `role` added under that framing.
- **Policy-1 invariant approach:** every new invariant is enforced in the audit band and the loader pre-flight, and at emit time it WARNS (annotates), never throws, so existing data violations cannot brick the blueprint corpus. New emitter self-checks: M1 shared `deriveGate` + section-7-vs-8.1 cross-check (warn), M2 unresolved-gate annotation, M4-emit state-machine shape assert, m9 per-module error banner. New audit bands: B6b (relationship shape: M7 / m5 / m4b), B9c (M14 trigger-state cross-check), B12 extended with the M4 shape check.
- **`owner_side` = parent (terminology):** `owner_side` on `data_object_relationships` names the PARENT (lifecycle owner / cascade root) of an edge; it is a domain-map catalog concept, not a Semantius platform primitive. Clarified in the live field description, references/module-shape.md, and B6b so future authoring sets `owner_side` to the actual parent. M7-fix is per-row, not a blanket flip: for a child-first edge (`child belongs_to parent`) the parent is the `target`, so `owner_side=target` is already correct and flipping it would invert the delete semantics.

**Reasoning.** The audit was repo-only and B6 was a stale-file false positive, so the durable fix is to make live the source of truth and let checks (enum-drift probe, emit-time asserts, audit bands) catch drift, rather than hand-copying facts that re-rot. Soft-warn-not-throw keeps a single bad row from making the whole corpus non-regenerable: before m9, the corpus could not regenerate at all because of a live multi-master on `data_products`.

**Scope.** Catalog-wide. Code: scripts/emit_fact_sheet.ts, scripts/lib/catalog.ts, scripts/loaders/load_cluster_drafts.ts, scripts/analytics/enum_drift_probe.ts. Docs: SKILL.md, references/module-shape.md.

**Data debt surfaced, NOT fixed by Plan 1 (deferred to a separate cleanup):** m9 + M4-emit exposed 10 multi-master violations (data_products, equity_grants, suppliers, monitoring_alerts) and malformed state machines (customers duplicate state_order, okr_objectives 2 initial states, lp_commitments no terminal state). Flagged per Policy 1, not repaired here.

**Status.** Active. M7-fix executed 2026-06-01: only 3 of the audit's 16 composition rows were actually wrong (ids 1186 / 1187 / 1491, flipped owner_side target->source); the other 13 already had `owner_side` correctly naming the parent and were left untouched. m11-fix decided surface-only: the read-only probe `scripts/analytics/m11_rollup_probe.ts` is the standing stored-matches-derived invariant, and the corrective rollup write is DEFERRED to per-domain re-analysis (the rollup is consumed only as a fallback for non-modularized domains, so a stale modularized-domain rollup has no real consumer and self-heals as each domain is rebuilt). No further Plan 1 live writes remain.

## 2026-06-01 - Plan 2: entity_type write tiers and delete-mode derivation

**Context.** Plan 2 (plans/plan-2-entity-type-tiers.md) completed the structural emitter: the blueprint now carries the per-entity write tier (B2) and the per-edge delete-mode / FK format (B4) it previously omitted. Code only, no live writes. Built on Plan 1's M1 (factored `deriveGate`) and M7 (normalized `owner_side`), both already applied.

**Decision.** Two derivations are now canonical, both in scripts/emit_fact_sheet.ts:
- **B2 write tier (`deriveWriteTier`).** Derived from `data_objects.entity_type` (added to the catalog.ts SELECT + `DataObject` type), rendered as the section-3 "write tier" column. operational_workflow / operational_record give `:manage`; catalog gives `:admin`; junction gives `:admin` if a linked endpoint is catalog else `:manage`; computed gives read-only (no write); unclassified gives `:manage` _(pending)_ (graceful, m2). No new permission minted. Documented in SKILL.md Rule #12 and references/modules.md section 4.
- **B4 delete-mode (`deriveDeleteMode`).** Total over relationship_kind: composition gives cascade/parent; reference | association required gives restrict/reference and optional gives clear/reference; inheritance gives restrict/reference (0 live edges). Rendered as the section-5 `delete_mode` / `fk_format` columns. `owner_side` orients the FK side only, not the mode/format. Documented in references/module-shape.md (Delete-mode derivation (B4)); the stale kind+necessity formula in plan-domain-fact-sheets.md was superseded.
- **M5 / M6 invariants.** M6 generator guard suppresses pattern-flag overrides on catalog / junction / computed masters (the operational pair keeps them; unclassified keeps them until classified). M5 / M6 emit-time soft annotations warn (Policy 1, never throw).

**Reasoning.** entity_type makes the write tier a function of the entity's nature instead of a uniform `:manage`, and delete-mode / FK become emitted facts the deployer selects rather than reconstructs (downstream-updates rows 1 and 2). Graceful degradation on unclassified keeps the unclassified majority emitting cleanly; the hard classification check stays in audit band B13.

**Scope.** Existing blueprint corpus only: the 18 committed files were regenerated via per-module emit. `--all` is NOT used because it would emit ~130 new files for unclassified modules with no committed blueprint. Code: scripts/emit_fact_sheet.ts, scripts/lib/catalog.ts. Docs: SKILL.md, references/modules.md, references/module-shape.md, plan-domain-fact-sheets.md.

**Data debt surfaced, NOT fixed (deferred to per-domain review):** 3 classified non-operational masters carry legacy pattern flags whose overrides M6 now suppresses: offer_letter_templates (catalog), recruiting_event_attendances and talent_pool_memberships (junctions). The flags should be removed or the entities reclassified during the per-domain review; Plan 2 is code-only and does not write the correction.

**Status.** Active. All 18 existing blueprints regenerate idempotently (per-module --check clean). No live writes performed.

## 2026-06-02 - Rescind the fixed "leadership-tier" zero-master exemption

**Context.** A REV-INTEL review (a domain on the old "leadership-tier" list) raised the question: can a "leadership-tier, masters nothing" domain ever actually deploy? A read-only sweep of all 16 listed domains (`.tmp_deploy/leadership_tier_sweep_2026_06_02.ts`) found: every one has **zero `domain_modules`** (so none is deployable, and the "empty landing module preserves the deploy contract" rationale was fiction, the landing module did not even exist); 13 of 16 had **zero `domain_data_objects` of any role**; none had a `master` row. Cross-referencing each domain's own `description` and `crud_percentage` showed ~14 of the 16 are master-bearing markets that own real persisted records (BCM/OP-RES/PRM/TPRM at crud 92: continuity plans, service maps, deal registrations, vendor assessments; PRIV-MGMT/INTRANET at 88: DSARs, intranet pages; ACCT-PLAN/COLLAB-GOV at 80; SOAR/GTM-PLAN/SALES-PERF/THREAT-INTEL; VULN-MGMT masters `vulnerabilities`; REV-INTEL masters computed deal scores + forecasts). They were not "leadership-tier by design", they were **unbuilt**, parked behind a label that told future agents to never build them.

**Decision.** The fixed-list, by-design zero-master exemption is RESCINDED. The classification is now per-domain and evidence-based:
- New canonical section in SKILL.md, "Master-bearing vs derive/overlay domains", carrying the **overlay test**: *does the domain persist any record no other domain canonically masters?* Yes => master-bearing, run Phase B + modules + system skill. No (recomputes everything at query time) => genuine derive/overlay.
- A derive/overlay domain is still **non-empty**: its module carries `consumer`/`embedded_master`/`derived` rows for what it reads and republishes. An empty `domain_module_data_objects` set is a smell (unbuilt), never a valid shape. An empty module deploys nothing.
- B1's zero-master exception is narrowed to genuine overlays only, with no hard-coded domain list, and is not a free pass (the overlay must still satisfy B5 footprint + M1 module).
- The "Leadership-layer domains have no system skill" section is replaced by "When a domain has no system skill": skill-less applies only to a genuine overlay with no actionable consumed/derived surface (rare). The "Verified leadership-tier (do NOT scaffold Phase-B for these): 16 domains" block is deleted; the old 16 codes are retained in the text only to mark them explicitly retired. EPM reframed from "partial exception" to the canonical illustration that "derived from upstream" does not mean "owned by upstream".
- Rule #14, the S-band sweep notes (S1/S2), M1 fix text, A2, the fact-sheet placeholder quality check, and two system-skill anti-patterns all updated to match.

**Reasoning.** `crud_percentage` is by definition the share of a domain expressible as CRUD + workflows; assigning 88-92 to a domain while declaring it masters nothing is self-contradictory. The role enum already carries `derived` / `embedded_master` for read-and-republish domains, so "this domain derives signals" was never a reason for an empty footprint. The label's real-world effect was to freeze ~14 records-bearing markets as permanently broken stubs while presenting them as complete.

**Scope.** SKILL.md only (per the user's instruction to adjust the skill and re-run REV-INTEL in a new session). Not touched, flagged as follow-up blast radius: the per-domain `audits/*/state.yaml` files for the affected domains still carry leadership-tier exemption language (self-heals when each is re-audited under the new rule); `scripts/analytics/audit_backlog.ts`, `plan-modules.md`, and `plan-b1-sweep-2026-05-29.md` reference the old concept and may hard-code the list. No live catalog writes. The 14 master-bearing-but-unbuilt domains are a remediation backlog (one Phase A->S build each), not addressed here.

**Status.** Active. No live writes. Sweep script is a read-only one-off in `.tmp_deploy/` (gitignored); promote to `scripts/analytics/` if the remediation backlog is taken up.

## 2026-06-02 - Plan 3 step A + A1 + D: catalog-owned RBAC replaces the `_core` pollution (live)

**Context.** Plan 3 (plans/plan-3-personas-raci.md) step A (store), A1 (role_modules disposition + re-FK), and D (`_core` cleanup) executed on the live tenant (module 1001, `domain_map`). This is the live-writes half; the emitter/runbook (step B), the standing process + doc cascade (step C), and pilot persona authoring (step E) are NOT yet done.

**Decision.** The authored RBAC inputs now live in catalog-owned entities, not `_core`:
- **`domain_roles`** (role_code, role_name, description, business_function_id -> business_functions nullable, record_status) is the persona home. **`process_raci`** (process_id -> processes parent/cascade, actor_role_id -> domain_roles nullable, actor_skill_id -> skills nullable, raci enum, consultation_blocking) is the RACI home. The polymorphic exactly-one-actor invariant is enforced by a hard `validation_rules` (JsonLogic) entry, NOT a SQL CHECK: the platform compiles `validation_rules` into BEFORE INSERT/UPDATE triggers (smoke-tested; rejects neither/both with a 23514 check_violation, accepts exactly one). Added `data_object_lifecycle_states.process_id` (the process-to-permission edge; populated per-domain in Phase E, starts NULL).
- **`role_modules.role_id` re-pointed `roles` -> `domain_roles`** via `update_field` (re-target works directly; format stays `parent`/cascade; drop+recreate fallback not needed). Its `role_module_label` computed_field was repointed from `roles` to `domain_roles`.
- **`_core` RBAC deleted:** 102 researched personas (`origin in (model, model_master) AND role_code != ''`), 895 module permissions (`domain_module_id` set), and their cascaded `role_permissions` (1386 -> 9) and `permission_hierarchy` (92 -> 2). Survivors: 19 roles, 6 permissions, 0 orphans.
- **Correction to the plan's "delete 104":** it is **102**. The 2 empty-`role_code` `model_master` rows (`Domain Map Viewer`/`Manager`, ids 10001/10002) are the catalog app's own scaffold RBAC (wired into `modules.default_viewer_role_id`/`default_manager_role_id`), not researched personas; they are PRESERVED.

**Reasoning.** Deleting (not migrating) converts silent-pass-on-stale into loud-fail-needs-authoring (a zero-persona coverage check is the forcing function). Two execution-discovered facts the plan missed and now records: (1) the inbound-FK guard must include `modules.default_viewer/manager/admin_role_id` (it blocked the first roles delete with a 23503); (2) `is_nullable` is a GENERATED column on `fields` -- never pass it to `create_field` (errors 428C9); nullability derives from `input_type` (`required` -> NOT NULL) and `format` (enum/text always NOT NULL; only reference/date/date-time honor optional).

**Scope.** Live writes on module 1001 (snapshot in `.tmp_deploy/plan3_predelete/`: roles 121, permissions 901, role_permissions 1386, permission_hierarchy 92, role_modules 387). **PENDING follow-up (NOT done), blast radius:** SKILL.md Phase E (E1-E6), references/roles.md, and references/module-shape.md Role-layer still describe the deleted `roles`/`role_modules`-into-`_core` layer and are now STALE -- the step-C doc cascade rewrites them to `domain_roles`/`process_raci`, adds a "no loader writes to `_core` RBAC tables" rule, and replaces the E-band with the persona/RACI review band (incl. the zero-persona coverage check that fires on multi-module domains). Affected multi-module domains' `audits/*/state.yaml` self-heal at re-audit under the new band; no bulk state edit is performed. Step B (emitter §9/§10 -> downstream-updates rows 3/4/5) and step E (pilot ATS) also pending.

**Status.** Active. Live writes done and F-pre verified. **Step C doc cascade DONE 2026-06-02:** SKILL.md Phase E rewritten into the "Personas, RACI & responsibilities" review band (E1 zero-persona coverage expectation that fires on multi-module domains; E4 RACI coverage; E5 single_approver<->Accountable; E6 reach-vs-derived + entity_type); references/roles.md, module-shape.md Role-layer, and modules.md section 4 re-homed from `roles`/`role_permissions`->`_core` to `domain_roles`/`process_raci` with the derive-not-store model; the "no catalog loader writes the `_core` RBAC tables" hard rule added; the inline role-layer summary, workflow Phase E framing, and the role anti-patterns updated. NAMING DECISION: the audit band stays lettered "E" (refocused) rather than churn E1-E6 -> P1-P6 across the audit infrastructure; the plan's "Phase P" is realized as the refocused Phase E. **Step B (emitter) DONE 2026-06-02:** scripts/lib/catalog.ts now loads `domain_roles` / `role_modules` / `process_raci` / `business_functions` / `business_function_domains` / `processes` and adds `lifecycle.process_id` (threaded through `AllRelationships` index maps + the disk cache); scripts/emit_fact_sheet.ts adds `deriveBaselineRoles` (B1), `derivePermissionHierarchy` (B2), `deriveRaciRealization` (B3), `deriveDeployableClosure` (B4), `deriveMarketRaci` (B5) and emits new sections §9 (roles/hierarchy/RACI per module + functional ownership) and §10 (deployable closure). Verified on ATS-CANDIDATE-CRM: B1/B2/B5/B4 produce content; B3 correctly shows the empty state (`process_raci`=0 until step E). downstream-updates rows 3/4/5 -> blueprint-done. GOTCHA: `role_modules` has NO `record_status` column (corrected in module-shape.md + roles.md). **Bulk regen DONE 2026-06-02:** all 18 existing blueprints regenerated per-module (NO new files; `--all` is deliberately avoided since it would emit ~170 unclassified-module files). **Step E ATS pilot DONE + F-post PASSED 2026-06-02:** scripts/loaders/load_ats_personas_pilot.ts (idempotent) authored 6 personas (RECRUITING-RECRUITER/SOURCER/COORDINATOR/MANAGER, cross-functional HIRING-MANAGER, LEGAL-COMPLIANCE-SPECIALIST) + 32 role_modules + 6 `lifecycle.process_id` wirings (PCF 220/1014/1017/1019/222) + 17 process_raci; the regenerated ATS §9.1 B3 resolves persona -> process_raci -> wired gate -> permission end to end (e.g. ATS-OFFERS RECRUITING-RECRUITER responsible grants `ats-offers:approve_offer`). **Review correction DONE 2026-06-02 (the §10 / closure rethink):** §10 "Deployable closure" was CUT and `deriveDeployableClosure` (B4) removed. Root cause: M9's "hard closure = embedded_master + role_modules" inverted the semantics. `embedded_master` is the SELF-SUFFICIENCY mechanism (a module carries a local shell so the canonical owner is optional / deferred-to-if-installed, NOT required, per modules.md section 5), and persona `role_modules` reach is relatedness, not a deploy requirement. So a correctly-modeled module has NO hard prerequisites and §10 was redundant-and-wrong. Replacements: (a) catalog.ts `relatedModuleIds` is now persona-aware (unions role_modules reach), so the front-matter `related_modules` is the single complete "related, not required" hint; (b) a new audit check **M9. Module self-containment** flags a `contributor` / required non-embedded `consumer` of another module's entity as a violation (fix by embedding or making optional), documented in modules.md section 5; (c) plan M9/B4 and downstream-updates row 5 corrected. Also stripped internal step-codes (B1/B2/B5...) from emitted §9 headings. All 18 blueprints regenerated (0 with §10, 0 B-code leaks, 0 em-dashes). REMAINING: the standing per-domain Phase P sweep for the other multi-module domains (ongoing by design, not a one-shot); optional ATS pilot expansion (requisition-approval + FCRA/adverse-action sub-flows).

## 2026-06-02 - Plan 4: presence-conditional `is_required` + relationship-layer self-containment (M9 part 2)

**Context.** Plan 4 (plans/plan-4-presence-conditional-required.md) completed the self-containment guarantee Plan 3 declared but only enforced at the entity layer. M9 part 1 audits `domain_module_data_objects`; it never inspected `data_object_relationships`, so a module could pass M9 yet be non-deployable when an embedded entity carried an `is_required=true` FK to a non-embedded entity (HIRING-STARTER was the worked case: `job_offers` had required edges to non-embedded `onboarding_journeys` / `offer_versions` / `background_checks`). All four execution sign-offs were given by the user.

**Decision (keystone).** `is_required=true` is PRESENCE-CONDITIONAL: a mandatory FK only WHEN the target entity is installed in the deploying unit; it never forces the target to install. The "always present" case is the TARGET's own `necessity=required` (Rule #16), not the edge. No new column; "required-if-present" is the new default reading of the existing boolean.

**What shipped (steps A-F: code + docs + one live write):**
- **A.** module-shape.md `is_required` row + delete-mode table rewritten with a target-present / target-absent split; SKILL.md Rule #16 gained the install-necessity / edge-requiredness bridge; the live `/fields` description for `data_object_relationships.is_required` PATCHed to the presence-conditional meaning (the single approved live write; field metadata, not emitted into blueprints, so no re-emit needed).
- **B.** SKILL.md M9 split into Part 1 (entity layer, existing) + Part 2 (relationship layer, new): flag every `is_required=true` edge whose other endpoint is out of scope, not a platform_builtin / shared master-data, and not embedded here. Read-only probe scripts/analytics/required_edge_presence_probe.ts written + run: 531 `is_required=true` edges, 71 target a platform_builtin, 143 target an entity `necessity=optional` in at least one module, 19 in EVERY module (15 reference + 4 composition; e.g. candidates -> fcra_disclosures, users -> gdpr_consent_records, applicant_flow_records -> ofccp_audit_trails). The per-domain reclassifications the band surfaces are user-reviewed (Rule #1), NOT auto-applied by this plan.
- **C.** `deriveDeleteMode` (scripts/emit_fact_sheet.ts) gained a `targetInScope` input. Cross-scope (§5.3) edges now render presence-conditional: reference / association required -> `none (required-if-present)`, optional -> `none`, composition required -> `⚠ audit: required composed child out of scope` (never silently dropped). Intra-scope (§5.1) + built-in (§5.2) edges unchanged (Plan 2 table). `targetInScope` is decided per-blueprint from the existing intra-vs-cross-scope partition; no deploy-time knowledge.
- **D.** `deriveGate` re-prefixes a gate to the installing unit when the entity is carried as `embedded_master` and its canonical realizing module is out of scope (e.g. `ats-offers:approve_offer` -> `hiring-starter:approve_offer`); `deriveWorkflowGatesAndRules` now MINTS those re-prefixed gates in §8.1 (new `moduleLifecycleScope` helper + `ownsByEmbedding` guard; `emittedModuleIdSet` threaded through §8 / §9 and `deriveRaciRealization`). Override-collision dedup added (two transitions collapsing to one gate code mint once, modules.md §4). modules.md §4 "state pruning at deploy" rewritten to "state realization at deploy: re-prefix, do not prune"; Rule #12 gained "Gate prefix and re-prefix". §7 label and §8.1 mint stay in agreement (M1 cross-check clean on all 18).
- **E.** Rule #19 invariant #4 (was "baseline permissions only, exactly three rows") and #6 (was "no workflow-gate tools") rewritten: a starter ships baseline PLUS the re-prefixed inherited gates of the entities it embeds whose realizer is out of scope. Invariant #3 (no authored lifecycle rows) STAYS, and the loader still inserts no permission rows (the catalog stores no derived permissions; the emitter derives, the deployer materializes). The "Lite variants" use case, "Upgrade behavior", the two starter anti-patterns, and modules.md §6 reconciled to match.
- **F.** All 18 committed blueprints regenerated per-module (NOT `--all`: it would emit ~170 unclassified-module files). Verified: §5 cross-scope edges presence-conditional; embedded entities with out-of-scope realizers re-prefix + mint (HIRING-STARTER mints `hiring-starter:approve_offer` etc.; ATS-CANDIDATE-CRM re-prefixes `internal_opportunities` gates from the absent `tlnt-intel-marketplace`). `--check` zero drift on all 18; no new M1 / M2 warnings (only pre-existing M6 / M4 data debt).

**Reasoning.** A required edge that silently forces an install-optional target defeats Rule #16 and makes every subset / starter deployment unbuildable. Presence-conditional `is_required` + re-prefixing embedded entities' gates is what makes "every module deploys standalone" actually hold at the relationship + permission layers, not just entity membership. Re-prefix-not-prune keeps an embedded entity's gated transitions governed instead of silently ungoverned.

**Scope.** Code: scripts/emit_fact_sheet.ts (deriveDeleteMode, deriveGate, deriveWorkflowGatesAndRules, moduleLifecycleScope, deriveRaciRealization, §5 / §7 / §8 / §9 wiring), scripts/analytics/required_edge_presence_probe.ts (new). Docs: SKILL.md (Rule #12, #16, #19, starter anti-patterns, M9 band), references/module-shape.md, references/modules.md (§4, §6). Live: one `/fields` description PATCH. Derived: 18 blueprints regenerated. Ledger: downstream-updates rows 6 + 10 -> blueprint-done.

**Deferred (NOT done here, by design):**
- The per-domain `is_required` / `necessity` reclassifications the M9 Part-2 band surfaces (the 143 / 19 set), each user-reviewed (Rule #1), never bulk auto-applied.
- The DEPLOYER / platform track: provisioning presence-conditional FKs (a nullable / absent FK to a non-installed entity instead of a broken non-null restrict), re-prefixing gates for arbitrary partial deployments at install time, and learning `module_kind='starter'`. `semantic-model-deployer` has zero handling today; Plan 4 made only the catalog + blueprint + audit correct.

**Status.** Active. All 18 blueprints regenerate idempotently (per-module --check clean). One live write performed (the field description). Platform track + per-domain reclassifications outstanding by design.

**Follow-up 2026-06-02 (embedded-entity governance completeness).** A review of the regenerated HIRING-STARTER surfaced that plan-4 step D lifted the "embedded entities are second-class" restriction for workflow GATES only. Two sibling restrictions remained and were fixed (emitter code only, no live writes, all 18 regenerated, --check clean):
- **Pattern-flag overrides + §8.2 business rules** (`deriveWorkflowGatesAndRules`, emit_fact_sheet.ts): the override loop was gated on `role === "master"`, so a starter minted gates but not the `view_all_` / `manage_all_` / `submit_` overrides (and no business rules) for the same embedded entities. Extended the loop to `embedded_master`, re-prefixed to the installing unit. HIRING-STARTER §8.1 now carries `hiring-starter:view_all_candidates` etc. and §8.2 the row-scope / submit / single-approver rules.
- **Handoff attribution §6.2 / §6.3** (`loadModuleCatalog`, scripts/lib/catalog.ts): handoffs are filtered by payload ENTITY but the outbound/inbound classifier keyed on the unit's OWN modules, so a starter (whose embedded entities' handoffs name the canonical modules as endpoints) matched nothing and §6.2/§6.3 were empty. Added a "played modules" set (own modules + canonical owners of embedded entities) and a boundary-crossing branch: a handoff surfaces only when one endpoint is played here and the other is not (internal handoffs hidden). HIRING-STARTER now shows the genuine crossers (offer/hire -> HCM / ONBOARDING / BEN-ADMIN / COMP-MGMT, background_check -> job_offers, referral -> candidates).

Both are the same entity-follows-the-unit principle plan-4 established for gates, applied consistently. Rule #19 invariant #4 and modules.md §6 updated to say "full governance" (gates + overrides + business rules + boundary-crossing handoffs), not "gates" only. The permission-naming friction this re-prefixing carries (rename on master-install) is written up separately as [plan-5](../../../plans/plan-5-entity-scoped-gate-permissions.md) (entity-scoped gate identity; DESIGN, not executed).

## 2026-06-02 - `<masters>` audit definition reads the module junction; `domain_data_objects` deprecation begins

**Context.** A review of ATS surfaced that `domain_data_objects` (domain-grain rollup) carries 15 masters while `domain_module_data_objects` (module-grain, authoritative) carries 60. The per-domain checklist defined `<masters>` as `domain_data_objects.role='master'`, so a literal audit run pulls 15 and silently misses 45. scripts/analytics/m11_rollup_probe.ts quantified catalog-wide: of 47 modularized domains, 6 UNDER-populate the rollup (ATS +45, WORK-MGMT +18, LIB-MGMT +17, SMP +14, PLM +12, FSM +3) and 5 OVER-populate it with phantom / foreign masters (IGA's rollup claims it masters `employees` and `smp_license_seat_assignments`, both foreign-owned; the real `iga_user_entitlements` is absent from the rollup but present at module grain). The other ~88 domains are un-modularized (e.g. DCG has zero modules), so their `domain_data_objects` rows remain the only master record. Nothing regenerates the rollup, so it drifts (this is the m11 issue from plan-1-consistency.md).

**Decision.** (1) `<masters>` now derives from `domain_module_data_objects` (`role='master'` across the domain's modules: primary host + `domain_module_host_domains`), falling back to `domain_data_objects.role='master'` ONLY when the domain has no modules. (2) `domain_data_objects` is deprecated and being retired as modularization completes: it holds no information the module junction lacks (it is a group-by-strongest-role projection), every committed code reader already treats it as an un-modularized-only fallback (scripts/lib/catalog.ts `domainsWithAnyModule` guard at the master + owner branches; scripts/emit_domain_map.ts union; scripts/emit_fact_sheet.ts ignores it entirely), and the only ddo-exclusive rows for modularized domains are wrong. (3) Loaders must NOT hand-write `domain_data_objects` for modularized domains; masters go to `domain_module_data_objects`. references/loader-idiom.md Phase 2 guarded accordingly.

**Reasoning.** Regenerating the rollup (the rejected "option b") was declined: a derived-but-hand-maintained table is exactly how it drifted. The end state is to read masters from the junction and drop the table once every domain is modularized, at which point the fallback branch becomes dead code. Retiring beats regenerating because the rollup duplicates data the junction already owns; if a domain-grain "what does X master" lookup is wanted, a VIEW over `domain_module_data_objects` serves it without drift.

**Migration sequencing (agreed, not yet executed).** Keep the table as read-only migration scaffolding. As each un-modularized domain is built out, move its masters to `domain_module_data_objects` and DELETE its `domain_data_objects` rows. The 567 rows belonging to the 47 already-modularized domains are a catch-up delete (the cleanup that should have run at each modularization); 18 of them are "stale-extra" (no module source) and need per-row triage before deletion (phantom / false-ownership -> delete; module-coverage-gap where the ddo row is the only record of a real relationship -> assign the entity to a module first, then delete), per Rule #1. The 708 rows on un-modularized domains stay (sole master record). When the table reaches zero rows, drop it and remove the three fallback branches (catalog.ts x2, emit_domain_map union) plus this `<masters>` fallback clause.

**Scope.** SKILL.md `<masters>` definition (audit recipe preamble); references/loader-idiom.md Phase 2. Catalog-wide audit behavior. No live catalog writes in this change (docs only).

**Status.** Active (doc layer). The scoped delete of the 567 modularized-domain rows + the 18-row triage are PENDING explicit user go. The eventual table drop + code-branch removal is gated on modularize-all completing.

## 2026-06-03 — Skill wrote scratch artifacts to the user's `C:\tmp` file share

- session: user invoked `/domain-map-analyst` to report (angrily, fairly) that `C:\tmp` had been flooded with skill output.
- rule violated: no catalog rule. This is a filesystem-hygiene incident, not a catalog-row one. The skill treated `c:/tmp/` as disposable scratch space; `C:\tmp` is in fact the user's long-lived working share (1,082 entries, 12.7 GB, content dating to 2016, 116 of the user's own project folders). 116 loose skill artifacts (~1 MB) had accumulated there across many sessions: `*-market-surface-*.json` / `.md`, `*-phase0-*.md`, `reconcile_*.md`, and scratch `.ts` / `.json` verification dumps.
- contradicting SKILL.md passage that was the rationalization: SKILL.md + three reference files hardcoded `c:/tmp/` as the documented output path (Phase 0 reports, market-surface dumps, reconcile working files). Several reference lines even labeled `c:/tmp/` "gitignored, ephemeral", which was never true: nothing gitignores an absolute path outside the repo.
- fix applied: (1) the 116 artifacts were moved to the Windows Recycle Bin (recoverable), leaving the user's other 850 loose files and 116 folders untouched. (2) every forward-looking `c:/tmp/` write path in SKILL.md, references/vendor-research-protocol.md, references/domain-audit-procedure.md, references/discover-cross-domain-processes.md, and README.md was redirected to the repo's existing gitignored `.tmp_deploy/`. The "gitignored, ephemeral" claim is now accurate. Historical `c:/tmp/` mentions in `audits/**/history.md`, prior changelog entries, and unrelated build scripts were left as-is: they are append-only factual records of past runs, not forward instructions.
- revert: none (no catalog writes). The Recycle Bin holds the moved files if recovery is ever needed.
- standing rule for future runs: scratch / working artifacts (Phase 0 reports, market-surface JSON, reconcile drafts, subagent dumps, verification scripts) go to `.tmp_deploy/` (gitignored, in-repo), NEVER to `c:/tmp/` or any absolute path outside the repo. Durable audit content still lands in `audits/<DOMAIN>/`.

## 2026-06-05 - Rule #20 catalog UX: empty fields are written, not parked in history

**Context.** During a batch b1a-clearing run across 5 domains (ACCT-PRACT-MGMT, AGENCY-MGMT, B2C-COMM, BPA, CDP), each subagent followed the prior Rule #20 ("draft both fields, surface to the user for review BEFORE writing") and left the empty `catalog_tagline` / `catalog_description` on the domain + module rows empty, parking the buyer-voice drafts in `history.md`. The user pushed back: empty fields must be written, and review happens on the record (state `new`) in the catalog UI, not on text buried in an audit log. The "draft and hold" loop was inconsistent with Rule #1, which writes fresh research as `record_status='new'` and reviews it in-record rather than via a pre-write chat gate.

**Decision.** Rule #20's backfill clause is rewritten: an EMPTY catalog UX field is WRITTEN directly with the buyer-voice copy (empty-guard per field; never overwrite a non-empty value). The row's `record_status` carries the review signal, the same in-record review model as Rule #1. Parking the draft in `history.md` (or a chat message) while the column stays empty is now an explicit forbidden pattern. Subagent prompts must instruct "write the empty field," never "draft and leave open."

**Scope.** SKILL.md Rule #20 (backfill clause + forbidden-patterns list), and the A4 + M8 per-domain-checklist fix actions. The non-empty overwrite protection is unchanged.

**Fix applied to live state.** The 5 domains' empty UX fields (5 domain rows + 16 module rows = 21 row-pairs) were backfilled via `.tmp_deploy/backfill_catalog_ux_2026_06_05.ts` (all `record_status='new'`, all previously empty, 0 overwrites). The UX-only items were removed from those 5 state.yaml files; a correction note was appended to each history.md superseding the "drafted, left open" entry.

**Status.** Active. No further migration pending.

## 2026-06-07 - master+embedded_master kept resurfacing as an audit question (incomplete 2026-05-28 fix)

**Context.** Reviewing `audits/CLM/q-CLM.md`, the user (for at least the third time) flagged that the audit had again surfaced a `master + embedded_master` pair as a blocking decision. q1 asked whether the `REAL-ESTATE-AGENT` starter (`module_kind='starter'`, `domain_id=null`) should "keep its lite path or be refactored to consume the full CLM repository." The starter embeds `legal_contracts` (id 66) as `role='embedded_master'`; `CLM-REPOSITORY` (module 127) masters it as `role='master'`. That is the textbook autonomous-deployable-units shape, a settled PASS under Rule #19 and the B1a self-containment check. (Minor data slip in the question text too: it claimed the starter also embeds a signature shell; the starter carries no `signature_records` row at all.)

**Root cause.** The 2026-05-28 "M7 rewritten" decision correctly declared this pattern a PASS with "no surface-for-review", but its **Scope line said "SKILL.md § M7 only."** The bogus framing survived untouched in `references/domain-audit-procedure.md`: the Bucket 2 ("Surface-for-user / judgment calls") definition at line 66 explicitly listed *"architectural intent questions (is this `master + embedded_master` pattern the deployability intent or a redundancy bug?)"*, and the example transcript modeled surfacing it. The audit's question-authoring path reads the bucket definitions, not the M7 check, so it kept manufacturing the question the M7 rewrite thought it had killed. Option (b) of the question ("refactor the starter to consume the full module") is not merely unnecessary, it is illegal: starter invariant #1 forbids `consumer + domain_owned`, enforced by the `starter_no_master` validation_rule and the loader pre-flight; co-deployment already auto-demotes the shell (Rule #19 "Upgrade behavior").

**Decision / fix applied.** `references/domain-audit-procedure.md` only:
1. Removed `master + embedded_master` from the Bucket 2 judgment-call list (line 66) and replaced it with a pointer to a new guard.
2. Added a blockquote **GUARD** under "The three buckets": a `master + embedded_master` pair (starter or standalone full module) is a Rule #19 / B1a / 2026-05-28-M7 PASS, never a Bucket 2 item and never a `q-` question; the "lite vs. consume" fork is false (the role IS the lite path, co-deploy demotes automatically, "consume" is forbidden by starter invariant #1). The only master/embedded_master items that reach the user are genuine structural fails owned by M7 (two `master` rows) or B5 (orphan with no canonical master), neither of which is an "is this intentional?" judgment call.
3. Fixed the example transcript (line ~201) to drop the master+embedded_master Bucket 2 resolution, with an inline note that its absence is deliberate.

**Scope.** `references/domain-audit-procedure.md` only. SKILL.md B1a check and Rule #19 already said PASS; M7 already said PASS. This entry closes the one remaining surface (the Bucket 2 definition) that the 2026-05-28 fix did not reach. No catalog writes. `q-CLM.md` was left unchanged per the user's instruction.

**Status.** Active. No further migration pending.
