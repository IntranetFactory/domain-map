# Domain Map

The organisation's master catalog of enterprise software markets: domains, capabilities, vendors, point solutions, regulations, industries, data objects, and the relationships between them. Lives as a Semantius `master` module (slug `domain_map`, id `1001`); rows added here become load-bearing for every other module that consumes them.

The catalog is maintained through the `domain-map-analyst` Claude skill ([`.claude/skills/domain-map-analyst/`](.claude/skills/domain-map-analyst/)). This README is a quick-reference card for the different ways to invoke that skill. Source-of-truth rules live in [SKILL.md](.claude/skills/domain-map-analyst/SKILL.md) and the [`references/`](.claude/skills/domain-map-analyst/references/) folder; this file just lists the entry points.

## Invocation modes

### 1. Phase 0 — Vendor surface research (load-time, ahead of any drafting)

**When:** new domain load, extending an existing domain's module set, refactoring a modularization.

**Trigger phrases:** *"run Phase 0 on `<DOMAIN>`"*, *"research the `<DOMAIN>` market"*, *"enumerate vendors for `<DOMAIN>`"*, *"build the surface matrix for `<DOMAIN>`"*.

**What it does:** spawns a `general-purpose` subagent that names 3–5 flagship vendors, enumerates each vendor's entity surface, builds a union matrix, adds required compliance entities for regulated markets, and proposes a modularization. User reviews before Phase A.

**Output:** `c:/tmp/<DOMAIN>-phase0-<YYYY-MM-DD>.md` — vendor list, surface matrix, compliance entities, modularization hypothesis.

**Detail:** [references/vendor-research-protocol.md](.claude/skills/domain-map-analyst/references/vendor-research-protocol.md).

### 2. Phase A → B → C → S full domain load

**When:** Phase 0 is approved and you want to write the catalog rows.

**Trigger phrases:** *"load Phase A for `<DOMAIN>`"*, *"go ahead with the load"* (after a Phase 0 review), *"build the loader for `<DOMAIN>`"*.

**What it does:** sequentially loads market shape (Phase A: domains/capabilities/modules/vendors/solutions), data-object footprint (Phase B: data_objects/DMDO/handoffs/relationships/aliases/lifecycle states), functional ownership (Phase C: business_function_domains), system skills + tools (Phase S). Each phase surfaces a draft before inserting.

**Output:** rows in the live catalog (status=`new`) + a row-count summary + UI links per touched table.

**Detail:** SKILL.md § "Workflow for any research task".

### 3. Domain-level market audit (regression test for Phase 0)

**When:** verifying an existing domain against current vendor practice. Always after a load that involved a subagent. Re-runnable anytime.

**Trigger phrases:** *"market audit on `<DOMAIN>`"*, *"verify `<DOMAIN>` against market"*, *"is `<DOMAIN>` fully loaded"*, *"find missing entities in `<DOMAIN>`"*, *"re-check `<DOMAIN>` modularization"*, *"do a market-vs-catalog check on `<DOMAIN>`"*.

**What it does:** spawns a subagent that generates the market surface fresh, diffs against current catalog state, classifies findings as **MISSING / WRONG-OWNERSHIP / SCOPE-CREEP / MODULARIZATION ISSUES**. Read-only by construction — produces a gap report, never auto-loads fixes.

**Output:** `c:/tmp/<DOMAIN>-market-surface-<date>.json` + `.md` (subagent), then `c:/tmp/<DOMAIN>-audit-<date>.md` (gap report after user review).

**Detail:** [references/domain-audit-procedure.md](.claude/skills/domain-map-analyst/references/domain-audit-procedure.md). SKILL.md § "Domain-level market audit".

### 4. Per-domain structural completeness checklist

**When:** verifying a domain is internally consistent (every junction has its qualifier, every master has labels, every module has its system skill, etc.). Complements the market audit — both should run.

**Trigger phrases:** *"review domain `<DOMAIN>`"*, *"audit `<DOMAIN>`"*, *"what's missing for `<DOMAIN>`"*, *"run the checklist on `<DOMAIN>`"*.

**What it does:** runs the S/A/M/B/C/D/E/F band checks (≈28 checks) against live PostgREST. Surfaces a gap report ranked by severity. M-band failures are blocking gates.

**Output:** gap report with in-scope fixes + report-only follow-ups (gaps that other domains owe this one).

**Detail:** SKILL.md § "Per-domain completeness checklist" + § "Audit recipe".

### 5. Pairwise handoff reconciliation

**When:** closing a cross-domain handoff boundary that has half-loaded edges. Targeted, not routine.

**Trigger phrases:** *"reconcile `<A>` and `<B>`"*, *"check the handoff boundary between `<A>` and `<B>`"*, *"is the `<A>` ↔ `<B>` boundary fully wired"*.

**What it does:** four-leg analysis per direction (producer master + lifecycle, trigger event, handoff with both module FKs, consumer DMDO). Produces a per-side diff naming which side owes which row.

**Output:** `c:/tmp/reconcile_<A>_<B>_<date>.md`. Loads happen separately on the side that owes the fix.

**Detail:** SKILL.md § "Pairwise handoff reconciliation".

### 6. Phase D — process-skill discovery (substrate-level analytic)

**When:** Phase B has shipped for enough clusters and you want to find candidate process skills (cross-domain workflows worth wrapping as an agent skill).

**Trigger phrases:** *"run Phase D"*, *"discover process skills"*, *"find process-skill candidates"*, *"rank cross-domain workflows"*.

**What it does:** runs the discovery query over the cross-domain `handoffs` slice. Buckets by trigger-event prefix, scores by friction × function spread.

**Output:** ranked candidate table (top N). Each candidate carries: handoff count, distinct domains, distinct functions, friction score, auto-matched APQC PCF row (a hint).

**Detail:** [references/discovery-query.md](.claude/skills/domain-map-analyst/references/discovery-query.md). SKILL.md § "Phase D — Process-skill discovery".

### 7. Vendor / competitor / capability research (no load)

**When:** investigating a market without intent to load. Classification questions ("is X a domain?"), competitor scans.

**Trigger phrases:** *"is `<X>` a domain"*, *"find competitors for `<VENDOR>`"*, *"what point solutions exist in `<MARKET>`"*, *"compare `<X>` and `<Y>`"*.

**What it does:** reads catalog state via `semantius call crud postgrestRequest`, applies the point-solution-market test (Rule #2), surfaces analysis. No writes.

**Output:** chat response with reasoning + UI links to current catalog state. Phase 0 skippable here.

### 8. Single-row edits, renames, deletes

**When:** surgical fixes — renaming one data_object, deleting one wrong DMDO row, patching one handoff.

**Trigger phrases:** *"delete row X from module Y"*, *"rename `<entity_a>` to `<entity_b>`"*, *"add a relationship between X and Y"*, *"patch the `<column>` on row N"*.

**What it does:** direct `semantius call crud postgrestRequest` calls. Idempotent loaders for >5 rows; one-shot CLI for ≤5. Phase 0 skippable.

### 9. Fact-sheet emission (explicit, user-triggered)

**When:** the user explicitly asks to refresh the per-module blueprints under [`blueprints/`](blueprints/). Never as part of any other workflow.

**Trigger phrases:** *"emit the `<MODULE>` blueprint"*, *"regenerate the blueprints"*, *"refresh `<module-code>-semantic-blueprint.md`"*.

**What it does:** runs `bun run scripts/emit_fact_sheet.ts --module <CODE>` or `--all`. Reads live PostgREST and writes blueprint markdown.

**Output:** updated files under [`blueprints/`](blueprints/).

**Detail:** SKILL.md § "Fact sheets (explicit step, not part of any sequence)".

---

## What this skill does NOT do

- **Use MCP tools.** Always shells out to the `semantius` CLI (Rule #0). MCP tool calls hit the wrong tenant.
- **Use Python.** Loaders are TypeScript on Bun (Rule #4b).
- **Auto-approve rows.** Every AI-derived row defaults to `record_status='new'` (Rule #1). User approves per load.
- **Auto-populate `notes` columns.** Every `notes` column is empty by default. Populated only with explicit per-row user approval (Rule #15).
- **Use em-dashes anywhere.** Project-wide ban ([CLAUDE.md](CLAUDE.md)).

## Cross-skill dependency

The `use-semantius` skill is the canonical home for platform mechanics (CLI auth, PostgREST encoding, filter syntax, sqlToRest, cube DSL). It is expected to load alongside this skill. When a question is about *how to call Semantius*, defer to `use-semantius`; when it is about *what the domain map catalog should contain and why*, that's this skill.

## Repo layout

- [`.claude/skills/domain-map-analyst/`](.claude/skills/domain-map-analyst/) — skill definition (SKILL.md + references).
- [`blueprints/`](blueprints/) — per-module semantic blueprints, emitted from live state via [`scripts/emit_fact_sheet.ts`](scripts/emit_fact_sheet.ts).
- [`scripts/`](scripts/) — TypeScript utilities (Bun): fact-sheet emitter, domain-map JSON emitter, catalog helpers.
- [`.tmp_deploy/`](.tmp_deploy/) — gitignored loaders. Idempotent TS scripts that POST to the live catalog. Reference loader: `load_research.ts`.
- [`CLAUDE.md`](CLAUDE.md) — project-wide rules (memory-off-limits, no em-dashes, American English, semantius-CLI-cwd).
- [`domain-map.json`](domain-map.json) — emitted snapshot of the catalog (gitted but regenerable).
