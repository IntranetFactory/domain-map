# Domain Map

The organisation's master catalog of enterprise software markets: domains, capabilities, vendors, point solutions, regulations, industries, data objects, and the relationships between them. Lives as a Semantius `master` module (slug `domain_map`, id `1001`); rows added here become load-bearing for every other module that consumes them.

The catalog is maintained through the `domain-map-analyst` Claude skill ([`.claude/skills/domain-map-analyst/`](.claude/skills/domain-map-analyst/)). This README is the entry-point reference for how to invoke that skill. Source-of-truth rules live in [SKILL.md](.claude/skills/domain-map-analyst/SKILL.md) and the [`references/`](.claude/skills/domain-map-analyst/references/) folder.

## Two modes

Everything you do with this skill is one of two things: you're either **adding** to the catalog or **verifying** the catalog. The phases / steps inside each mode are **mandatory sub-stages run in sequence**, not independently-invokable units. Calling sub-stages by name (e.g. "just run Phase A on X" or "just run a market audit on Y") is the failure pattern that produced the half-loaded modules currently in the catalog. Don't.

### a) Research a domain

**Use for:** loading **new scope** into the catalog. Specifically:

- A new domain (no `domains` row exists yet for this market)
- A new module added alongside existing modules in an already-loaded domain (e.g. adding `ATS-CANDIDATE-SOURCING` to the existing ATS modules)
- Vendor / competitor scans with no intent to load
- "Is X a domain?" classification questions

**Use the OTHER mode (Validate) for:** entities or relationships missing from an already-loaded module, suspected wrong-ownership, suspected scope-creep, suspected modularization mistakes, or any "the X domain looks incomplete" instinct. Validate finds the gaps; the fix loop then runs Phase B inserts to close them. Running Research on an already-loaded module to "extend its footprint" is the wrong shape — Phase 0 would enumerate the market surface from scratch without seeing the existing state, and Phase B's idempotent loader would skip-or-insert based on natural keys without catching what's already wrong in the loaded footprint.

**Trigger phrases:** *"research the `<DOMAIN>` market"*, *"load `<DOMAIN>` into the catalog"*, *"add `<DOMAIN>` to the catalog"*, *"is `<X>` a domain"*, *"find competitors for `<VENDOR>`"*, *"add a new module `<NEW_MODULE>` to `<DOMAIN>`"*, *"what point solutions exist in `<MARKET>`"*.

**What it does:** runs the full pipeline as a mandatory sequence with user-review gates between phases. **Pre-flight against existing state** when the domain already exists (adding a new module case): pull the domain's current `domain_modules`, `domain_data_objects`, and `data_objects` list before Phase 0 so the subagent can avoid naming collisions and scope overlap with what's already loaded.

1. **Phase 0 — Vendor surface research.** Subagent names 3–5 flagship vendors, enumerates each vendor's entity surface, builds a union matrix, adds required compliance entities for regulated markets, proposes modularization. **For a new-module-in-existing-domain load, the subagent is told the existing footprint and produces a delta-shaped proposal: which surface entities belong in the new module vs. which already exist in sibling modules.** **Non-skippable.** Output: `c:/tmp/<DOMAIN>-phase0-<date>.md`. User reviews.
2. **Phase A — Market shape.** Loads `domains`, `capabilities`, `domain_modules`, `vendors`, `solutions`, `solution_domains` against the Phase 0 matrix. Idempotent against existing rows. User reviews draft.
3. **Phase B — Data-object footprint.** Loads `data_objects`, `domain_module_data_objects`, `handoffs`, `data_object_relationships`, `data_object_aliases`, `data_object_lifecycle_states`. Every Phase 0 matrix entity loads or carries a one-line skip justification. Naming-collision check against existing domain entities per Rule #9. User reviews draft.
4. **Phase C — Functional ownership.** Loads `business_function_domains` and `business_function_capabilities` overrides.
5. **Phase S — System skills + tools.** Loads `skills`, `tools`, `skill_tools`, `tool_solutions` per Rule #17.

The mode **stops at the right phase based on intent**: classification questions ("is X a domain?") stop after Phase 0; competitor research stops after Phase A; an actual load runs through Phase S. Stopping early is fine; **skipping Phase 0** is not.

**Output:** Phase 0 markdown report + rows in the live catalog (status=`new`, never auto-approved) + a row-count summary + UI links per touched table.

**Detail:** SKILL.md § "Workflow for any research task"; [references/vendor-research-protocol.md](.claude/skills/domain-map-analyst/references/vendor-research-protocol.md).

### b) Validate a domain

**Use for:** verifying a domain is fully and correctly loaded, end-to-end. Specifically:

- Routine verification of an existing domain ("is X fully loaded", "what's missing for X")
- **Extending an existing module's entity coverage** (suspected MISSING entities surface in pass 1; the fix loop then runs Phase B inserts to close them — this is how you "add more data_objects to an existing module")
- Suspected wrong-ownership (entity in the wrong module within a domain)
- Suspected scope-creep (entity in a module that doesn't belong)
- Suspected modularization mistake (module names / scopes don't cleanly cover the surface)
- Regression test after any prior Research or fix load

**Always** runs the market audit AND the structural completeness checklist AND pairwise reconciliation with every neighbor domain — they're complementary. Running just one is the failure pattern that lets gaps fall through.

**Trigger phrases:** *"validate `<DOMAIN>`"*, *"audit `<DOMAIN>`"*, *"review `<DOMAIN>`"*, *"verify `<DOMAIN>`"*, *"is `<DOMAIN>` fully loaded"*, *"what's missing for `<DOMAIN>`"*, *"check `<DOMAIN>` against market"*.

**What it does:** four passes against the named domain, then a combined gap report:

1. **Market audit pass** (external coverage). Subagent generates the market surface fresh, diffs against live catalog state, classifies findings as **MISSING / WRONG-OWNERSHIP / SCOPE-CREEP / MODULARIZATION ISSUES**. Regression test for Phase 0.
2. **Structural checklist pass** (internal consistency). Runs the S/A/M/B/C/D/E/F band checks (≈28 checks) against live PostgREST. M-band failures are blocking gates.
3. **Neighbor discovery pass** (auto-derived from the catalog). Query `handoffs` (both directions) + cross-domain `domain_module_data_objects` (consumer / contributor / embedded_master rows pointing at foreign-domain masters) to enumerate every domain this one touches. Rank by edge weight (number of handoffs + dependency count). The data is already in the catalog from prior Phase B loads; no user input needed beyond the target domain.
4. **Pairwise reconciliation with each neighbor** (four-leg analysis per boundary). For each neighbor surfaced in pass 3, walk the boundary — producer master + lifecycle, trigger event, handoff with both module FKs, consumer DMDO — and produce a per-boundary diff classified as: existing-fully-wired, existing-with-NULL-module-FK, missing-handoff-implied-by-catalog, boundary-integrity-gap. User approves which neighbors to deep-dive (default: all with edge weight ≥3); shallow neighbors get a single-table summary.

Outputs are combined into a single gap report. User reviews before any fix loads (Rule #1). Validate is read-only by construction; loads happen separately on user approval, using existing loader patterns.

**Manual bilateral form** (skip pass 3, validate two named domains end-to-end and reconcile only their shared boundary): *"validate `<A>` ↔ `<B>` boundary"*, *"reconcile `<A>` and `<B>`"*. Fallback when you specifically want to check one boundary without validating the whole neighbor set.

**Output:** the audit section is **appended** to `audits/<DOMAIN_CODE>.md` (one file per domain, append-only, git-tracked — see [audits/README.md](audits/README.md) for the convention). Each Validate run adds a new dated section; prior history stays visible for diff. The raw subagent JSON drafts stay in `c:/tmp/` (gitignored, ephemeral). Optionally, after the audit lands the agent prompts the user to update `domains.notes` with a one-line pointer back to the audit file (user supplies exact wording per Rule #15).

**After the gap report — fix loop:**

The gap report is always **categorized into three buckets**, and the agent **explicitly prompts per bucket** rather than dumping the report and waiting. This is the discipline that prevents unfinished audits from accumulating:

| Bucket | What it carries | What you decide |
| --- | --- | --- |
| **1. In-scope confirmed gaps** | Findings the agent can fix directly (MISSING / WRONG-OWNERSHIP / SCOPE-CREEP / STRUCTURAL / BOUNDARY). Agent shows the list grouped by finding type. | *"Fix these now?"* — approve all / approve some / decline. Agent applies on approval. |
| **2. Surface-for-user (judgment calls)** | Items needing your judgment (Rule #15 notes wording, policy decisions, architectural-intent questions, legacy reverts). Agent cannot decide alone. | Agent prompts per item: *"What's your call on each? I'll wait for your decision before acting."* |
| **3. Phase 0 pending** | Speculative gaps the semantic pass produced from vendor knowledge but couldn't anchor to a formal Phase 0 baseline (because Phase 0 wasn't run, or pre-dates the domain's existence in the catalog). | Agent prompts: *"Vet via a focused Phase 0 research run, or eyeball-mode — name which candidates ring true?"* |

The agent also surfaces **dependencies between buckets** when they exist (e.g., a Bucket 2 question whose answer would be informed by Bucket 3 vendor research). When buckets are independent, the agent says so explicitly so you can resolve them in any order.

User reviews the combined report and picks which findings to act on (Rule #1: AI-derived findings are research, never auto-approved). For each accepted finding, the fix surface depends on the finding type:

| Finding | Fix surface |
| --- | --- |
| **MISSING** (entity gap) | Phase B insert via idempotent loader. Add `data_object` + `domain_module_data_objects` + lifecycle states + intra-domain relationships. Pattern: [.tmp_deploy/fix_ats_modules.ts](.tmp_deploy/fix_ats_modules.ts) (gitignored; reference shape). |
| **WRONG-OWNERSHIP** (entity in wrong module within the domain) | DELETE the misplaced DMDO row + INSERT in the right module. Surgical `semantius call crud postgrestRequest` for ≤5 rows; idempotent loader for more. Check for dependent handoffs / relationships before deleting. |
| **SCOPE-CREEP** (entity doesn't belong in the domain at all) | DELETE the DMDO row + cascade-check dependent handoffs and relationships. Surface what would break before applying. |
| **STRUCTURAL** (per-band failure) | Per-band fix instructions in SKILL.md § "Audit recipe" and the per-band tables. M-band failures are blocking and fix first. |
| **BOUNDARY: NULL module FK** (B10b) | PATCH via the deterministic derivation logic. Tie cases stay NULL and surface for user decision. |
| **BOUNDARY: missing handoff implied by catalog** | Author the `trigger_events` row on the producing side; the `handoffs` row with both module FKs; the consumer DMDO row on the consuming side if it doesn't already exist. |
| **MODULARIZATION ISSUE** | Separate refactor conversation. Module rename / merge / split is a design decision, not a fix-loader run. Do not fold into the loop. |

After fixes load, **re-run Validate**. Acceptance: zero MISSING / WRONG-OWNERSHIP / SCOPE-CREEP findings, zero structural failures (modulo documented exceptions in B1, B12), no NULL-FK handoffs on this domain's side. MODULARIZATION findings may legitimately remain pending refactor design — they don't block Validate from "passing" in the structural sense; they're a parking-lot item for the user.

**Detail:** SKILL.md § "Per-domain completeness checklist" + § "Audit recipe" + § "Domain-level market audit" + § "Pairwise handoff reconciliation"; [references/domain-audit-procedure.md](.claude/skills/domain-map-analyst/references/domain-audit-procedure.md).

## Things that look like modes but aren't

- **Phase 0 alone, Phase A alone, Phase B alone.** These are sub-stages of Research, not menu items. Research stops at the right phase based on the user's intent; the agent doesn't skip earlier phases by claiming "you only asked for Phase A". When you only need a Phase 0 surface matrix, the trigger is *"research the X market"*, not *"run Phase 0 alone"*.
- **Market audit alone, structural checklist alone, pairwise reconciliation alone.** Sub-passes of Validate, run together. Calling them separately is exactly how gaps fall through.
- **Single-row edits, renames, deletes, surgical patches.** Not workflows. The agent runs `semantius call crud postgrestRequest` directly when asked.
- **Fact-sheet emission.** Build step, not a skill mode. Run `bun run scripts/emit_fact_sheet.ts --all` (or `--module <CODE>`) when you want refreshed [blueprints](blueprints/).
- **Phase D — Process-skill discovery.** A catalog-wide analytic for the agent-tooling layer, not domain validation. Buckets cross-domain handoffs by trigger-event prefix and ranks candidate process skills (e.g. the `employee.*` cluster surfaces "Joiner-Mover-Leaver" as a cross-functional process). Invoked rarely, when you want to extend the agent-tooling layer with new cross-domain process skills. Triggers: *"run Phase D"*, *"discover process skills"*, *"rank cross-domain workflows"*. Detail: SKILL.md § "Phase D — Process-skill discovery"; [references/discovery-query.md](.claude/skills/domain-map-analyst/references/discovery-query.md).

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
