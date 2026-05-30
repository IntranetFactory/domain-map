# Domain Map

The organisation's master catalog of enterprise software markets: domains, capabilities, vendors, point solutions, regulations, industries, data objects, and the relationships between them. Lives as a Semantius `master` module (slug `domain_map`, id `1001`); rows added here become load-bearing for every other module that consumes them.

The catalog is maintained through the `domain-map-analyst` Claude skill ([`.claude/skills/domain-map-analyst/`](.claude/skills/domain-map-analyst/)). This README is the entry-point reference for how to invoke that skill. Source-of-truth rules live in [SKILL.md](.claude/skills/domain-map-analyst/SKILL.md) and the [`references/`](.claude/skills/domain-map-analyst/references/) folder.

## Three modes

Everything you do with this skill is one of three things: you're either **adding** to the catalog (Research), **verifying** the per-domain substrate (Validate), or **layering APQC PCF mappings + process-skills on top of the cross-domain handoff substrate** (Discover). Each mode's phases / sub-passes are **mandatory steps run in sequence**, not independently-invokable units. Calling sub-stages by name (e.g. "just run Phase A on X" or "just run a market audit on Y" or "just persist handoff_processes") is the failure pattern that produced the half-loaded modules currently in the catalog. Don't.

The modes layer: Research lands the per-domain substrate (data_objects, modules, handoffs both intra- and cross-domain). Validate guarantees each domain's substrate is internally consistent AND that its cross-domain handoffs to each neighbor are pairwise-clean. Discover treats the catalog-wide cross-domain handoff DAG as a single object, clusters its edges against APQC PCF activities, and wires the resulting process skills through `skills.process_id`. **Discover depends on Validate** — pairwise-validated handoffs are the foundation Discover layers PCF mappings on. Running Discover against unvalidated handoffs produces APQC clusters built on broken edges.

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
3. **Phase B — Data-object footprint.** Loads `data_objects`, `domain_module_data_objects`, `handoffs`, `data_object_relationships`, `data_object_aliases`, `data_object_lifecycle_states`. Every Phase 0 matrix entity loads or carries a one-line skip justification. Naming-collision check against existing domain entities per Rule #9. **For each cross-domain handoff the agent authors, also draft a `handoff_processes` row** with `proposal_source='agent_curated'` and `record_status='new'` per Rule #1 (user approves in review). Untagged-deferred is reserved for handoffs with no clean PCF match. `proposal_source='human_curated'` is used only when the user explicitly types *"add tag X for handoff Y"* in chat — never as a default for agent-authored work. User reviews draft.
4. **Phase C — Functional ownership.** Loads `business_function_domains` and `business_function_capabilities` overrides.
5. **Phase S — System skills + tools.** Loads `skills`, `tools`, `skill_tools`, `tool_solutions` per Rule #17.

The mode **stops at the right phase based on intent**: classification questions ("is X a domain?") stop after Phase 0; competitor research stops after Phase A; an actual load runs through Phase S. Stopping early is fine; **skipping Phase 0** is not.

**Output:** Phase 0 markdown report + rows in the live catalog (status=`new`, never auto-approved) + a row-count summary + UI links per touched table.

**Detail:** SKILL.md § "Workflow for any research task"; [references/vendor-research-protocol.md](.claude/skills/domain-map-analyst/references/vendor-research-protocol.md).

### b) Validate

**Two scopes.** Mode b runs at one of two scopes, selected by trigger phrase:

- **Per-domain** (the default form) — verifies one named domain end-to-end, including its boundaries with every neighbor it touches. 4 passes against the named domain.
- **Catalog-wide cross-domain substrate** (`validate cross-domain`) — read-only audit of the entire cross-domain handoff DAG. Rolls up the cross-domain slice of the per-domain B-band checks unfiltered by domain. Surfaces every NULL module FK, missing consumer DMDO, orphaned trigger_event, and B8/B9/B9b/B10b defect across the catalog, grouped by the domain that owes the fix. Discover (mode c) automatically invokes this as its pre-flight.

#### b1) Validate a domain (per-domain)

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
| **MISSING** (entity gap) | Phase B insert via idempotent loader. Add `data_object` + `domain_module_data_objects` + lifecycle states + intra-domain relationships. Pattern: [scripts/loaders/fix_ats_modules.ts](scripts/loaders/fix_ats_modules.ts) (gitignored; reference shape). |
| **WRONG-OWNERSHIP** (entity in wrong module within the domain) | DELETE the misplaced DMDO row + INSERT in the right module. Surgical `semantius call crud postgrestRequest` for ≤5 rows; idempotent loader for more. Check for dependent handoffs / relationships before deleting. |
| **SCOPE-CREEP** (entity doesn't belong in the domain at all) | DELETE the DMDO row + cascade-check dependent handoffs and relationships. Surface what would break before applying. |
| **STRUCTURAL** (per-band failure) | Per-band fix instructions in SKILL.md § "Audit recipe" and the per-band tables. M-band failures are blocking and fix first. |
| **BOUNDARY: NULL module FK** (B10b) | PATCH via the deterministic derivation logic. Tie cases stay NULL and surface for user decision. |
| **BOUNDARY: missing handoff implied by catalog** | Author the `trigger_events` row on the producing side; the `handoffs` row with both module FKs; the consumer DMDO row on the consuming side if it doesn't already exist. If the implementing APQC activity is clear, also draft a `handoff_processes` row (`record_status='new'`); otherwise leave for Discover. |
| **APQC TAGGING** (per-handoff PCF activity classification) | **Active fix surface, not informational.** While the analyst is reviewing each cross-domain handoff for B-band findings, they also classify the implementing APQC PCF activity (1-query lookup against `/processes`) and propose a `handoff_processes` row: `(handoff_id, process_id, proposal_source='agent_curated', record_status='new')`. The analyst's mental model is fresh in this pass; deferring to Discover later costs ~40% of the signal (substring matcher recovers most but not all). Handoffs with no clean PCF match (modern digital concepts, industry-specific workflows) get listed under a deferred-to-Discover-Pass-3 sub-section with the reason. The combined count (tagged + deferred) is the APQC TAGGING line in the audit summary. See [references/domain-audit-procedure.md](.claude/skills/domain-map-analyst/references/domain-audit-procedure.md) § APQC TAGGING for the per-handoff procedure. |
| **MODULARIZATION ISSUE** | Separate refactor conversation. Module rename / merge / split is a design decision, not a fix-loader run. Do not fold into the loop. |

After fixes load, **re-run Validate**. Acceptance: zero MISSING / WRONG-OWNERSHIP / SCOPE-CREEP findings, zero structural failures (modulo documented exceptions in B1, B12), no NULL-FK handoffs on this domain's side. MODULARIZATION findings may legitimately remain pending refactor design — they don't block Validate from "passing" in the structural sense; they're a parking-lot item for the user.

**Detail:** SKILL.md § "Per-domain completeness checklist" + § "Audit recipe" + § "Domain-level market audit" + § "Pairwise handoff reconciliation"; [references/domain-audit-procedure.md](.claude/skills/domain-map-analyst/references/domain-audit-procedure.md).

#### b2) Validate cross-domain substrate (catalog-wide)

**Use for:** verifying that every cross-domain handoff in the catalog is structurally sound, without going into APQC PCF mapping (that's mode c). Specifically:

- Routine substrate health check ("are all our cross-domain handoffs healthy?", "any orphaned trigger events?")
- Post-multi-domain-fix-loop verification ("we just touched HCM, IGA, Payroll, ATS in a Joiner cascade — verify the cross-domain edges are still clean")
- Pre-flight before invoking Discover (mode c) directly, or to investigate why a Discover run stopped on Pass 0
- Auditing whether the per-domain Validates that have run so far have actually fixed everything they should have (per-domain B10 is report-only, so cross-domain defects can survive per-domain pass)

**Trigger phrases:** *"validate cross-domain"*, *"validate cross-domain substrate"*, *"audit catalog handoffs"*, *"is the handoff DAG clean"*, *"check every cross-domain handoff"*.

**What it does:** five queries against the cross-domain slice of `handoffs` (`source_domain_id != target_domain_id`), unfiltered by source/target domain. Read-only by construction.

1. **NULL `source_domain_module_id`** on a cross-domain row whose source domain has modules. Each hit is a per-domain B10b failure on the source domain.
2. **NULL `target_domain_module_id`** symmetric to #1, on the target side.
3. **Cross-domain handoff whose `trigger_events.data_object_id` is not mastered on the source side.** B9 attribution defect.
4. **Cross-domain handoff whose payload `data_object_id` is not declared on the target side** via `domain_module_data_objects` with role IN (`consumer`, `contributor`, `embedded_master`). B8 reverse-direction gap on the target.
5. **Cross-domain handoff with a `trigger_events` row that no other handoff references AND no `data_object_lifecycle_states` row whose `permission_verb_override` matches the event's verb suffix.** Orphaned event.

Output groups defects by the domain that owes the fix. The fix surface is the same per-domain mode b1 fix-loop (each defect belongs to one domain). User decides whether to also kick off b1 audits on the affected domains.

**Output:** the cross-domain audit section is **appended** to [audits/_validate-cross-domain.md](audits/_validate-cross-domain.md) (catalog-wide append-only file; the underscore prefix marks it as catalog-scoped, mirroring the [audits/_discover.md](audits/_discover.md) convention).

**Detail:** SKILL.md § "Validate cross-domain substrate"; the queries also feed Discover Pass 0.

### c) Discover cross-domain processes

**APQC ownership is layered.** Capture the link where the information exists: Phase B authors when the analyst knows; Discover fills gaps and aggregates. The substring matcher is a fallback, not the only source of `handoff_processes` rows.

| Catalog row | Authored by | Reviewed/approved by |
|---|---|---|
| `processes` rows from APQC PCF (cross-industry + industry-specific frameworks) | Maintenance scripts (rare; one-off loader on PCF version bumps) | One-off process per Rule #1 |
| `processes` rows with `source_framework='custom'` | Discover Pass 3 when a cluster has no PCF match | User per `record_status` |
| `handoff_processes` — authored at Phase B | Research Phase B when the analyst knows the implementing PCF activity (`record_status='new'`) | User during Phase B draft review per Rule #1 |
| `handoff_processes` — substring-inferred | Discover Pass 2 (`record_status='new'`), only against handoffs with no Phase-B-authored row | User during Discover Pass 3 batch review per Rule #1 |
| `skills.process_id` (the skill → APQC link, only set on `skill_type='process'` skills) | Discover Pass 3 PATCH | User per row |
| `skills` rows with `skill_type='process'` + their `skill_tools` | Discover Pass 3 (sole authoring surface) | User per Rule #1 |

**Every `handoff_processes` row written by the agent, regardless of source (Phase B author, substring matcher, override), starts at `record_status='new'`. Rule #1 has no exceptions.** Provenance (authored vs discovered) is implicit in timing — Phase B rows arrive with the handoff load, Discover Pass 2 rows arrive later — but does not unlock auto-approval.

There is no direct tool→APQC link. Tools reach APQC transitively: `tools → skill_tools → skills.process_id → processes`, and only through process skills (system skills have `domain_module_id` instead, no APQC anchor).

**Use for:** extending or maintaining the APQC PCF layer and the process-skill set that sits on top of the cross-domain handoff DAG. Specifically:

- Substrate has grown materially since the last Discover run (new cross-domain handoffs landed via Research / Validate fix loops) and `handoff_processes` should be re-derived
- Adding a new process skill that orchestrates handoffs across multiple domains
- Auditing `PCF_OVERRIDES` after a wrong-mapping suspicion (the *"subscription was mapped to a Finance L4 row"* class of bug)
- Reviewing the `handoff_processes` queue (`record_status='new'` rows from prior `--persist` runs)
- Backfilling `skills.process_id` on existing process skills whose APQC anchor is unset

**Use the OTHER modes first when:** any of the involved domains have unvalidated handoffs. Discover layers APQC mappings onto a substrate; if the substrate is broken, the mappings are noise. Discover's Pass 0 below invokes mode b2 (`validate cross-domain`) as its pre-flight; if Validate surfaces defects, Discover stops and recommends running mode b1 (`validate <DOMAIN>`) on each affected domain first.

**Trigger phrases:** *"run Phase D"*, *"discover process skills"*, *"rank cross-domain workflows"*, *"audit APQC mappings"*, *"review handoff_processes"*, *"backfill skills.process_id"*, *"extend the process-skill layer"*.

**What it does:** five passes against the catalog as a whole (not per-domain), then a combined report:

1. **Pass 0 — Invoke `validate cross-domain` (mode b2) as pre-flight gate.** Runs the catalog-wide cross-domain handoff substrate sanity check defined in mode b2 above. Surfaces every cross-domain handoff defect grouped by the domain that owes the fix. **If any defects, Discover stops** and recommends running mode b1 on each affected domain first. The user can override with an explicit *"proceed with known defects"* flag, but the resulting APQC clusters will carry those defects. Pass 0 IS mode b2 — same check, different caller.
2. **Pass 1 — PCF_OVERRIDES sanity.** For every non-null entry in [discovery_query.ts:135](scripts/analytics/discovery_query.ts#L135) `PCF_OVERRIDES`, look up the `external_id` in `processes` and check that the resolved row's `process_name` matches the override's intended `name`. Flags drift (the subscription `10145` bug shape). Read-only; surfaces a fix list.
3. **Pass 1.5 — Coverage gap audit.** Read-only diff between `handoff_processes` (any `record_status`) and the set of cross-domain `handoffs`. Surface:
   - **Authored, approved** — Phase B captured the link AND the user has approved it. Highest-confidence rows; Discover treats these as ground truth and does NOT re-suggest via substring matcher.
   - **Authored, pending** — Phase B captured the link but it hasn't been reviewed yet. Surfaces for user review BEFORE Pass 2 runs substring inference (so substring guesses don't overwrite the analyst's intent).
   - **Discovered, pending** — prior Pass 2 substring-inferred rows still awaiting review. Add to the Pass 3 review queue.
   - **Untagged** — handoffs with no `handoff_processes` row at all. Targets for Pass 2's substring matcher.
   - **Conflicting** — handoff has both an authored row and a discovered row pointing at different processes. Surface for user arbitration; the authored row wins by default since the author had context.
4. **Pass 2 — Substring discovery (gap-fill) + persist.** `bun run scripts/analytics/discovery_query.ts --persist`. **Narrowed scope:** runs ONLY against the "Untagged" set from Pass 1.5 — handoffs with no existing `handoff_processes` row, authored or discovered. Emits the ranked candidate table AND inserts new `handoff_processes` rows for those buckets with `record_status='new'`. Sticky-rejection contract holds: existing approved + rejected rows survive untouched. Authored rows from Phase B are NEVER overwritten by Pass 2.
5. **Pass 3 — Review queue + process-skill authoring (the ONLY place process skills are generated).** Groups `handoff_processes WHERE record_status='new'` (both authored-pending and discovered-pending) by `process_id`, sorted by row count. For each top-N process, surfaces (PCF row name + `external_id`, the handoffs tagged, source/target domain pairs, **and provenance: authored-pending vs discovered-pending**) for a batch approve / reject decision per Rule #1. Authored-pending rows are surfaced with higher confidence framing because the per-domain analyst had context. Once a `process_id` reaches a threshold of approved `handoff_processes` rows, three sub-cases on the matching process skill:
   - **Process skill exists with `process_id` already set correctly:** nothing to do; score and surface.
   - **Process skill exists with `process_id=NULL`:** propose PATCH. (The 3 process skills loaded as of 2026-05-29 — `employee-jml-process`, `opportunity-l2c-process`, `case-service-process` — sit in this state.)
   - **No process skill exists yet:** propose authoring a new one + its `skill_tools` set per § "Process-skill tool derivation". Auto-derive `query_<master>` tools across the involved-domain set; mutates from target-side writes; cross-tranche externals (`send_email`, `sign_document`) per the recurring patterns. Surface for user approval per Rule #1; all new rows ship as `record_status='new'`.

   Pass 3 is the step that closes the chain `tool → skill_tools → skill → process → APQC PCF`.

**Rule #1 across every Pass.** Pass 0 + Pass 1 + Pass 1.5 are read-only. Pass 2 writes `record_status='new'` substring proposals. Pass 3's `record_status` PATCHes (new → approved/rejected), `skills.process_id` PATCHes, and new `skills` / `skill_tools` rows all require explicit per-row user approval. The agent never auto-approves anything. Phase B's authored `handoff_processes` rows are also `record_status='new'` at load — they get reviewed alongside discovered rows here, just with higher confidence framing.

**Output:** the discover-pass section is **appended** to `audits/_discover.md` (catalog-wide append-only file; one new dated section per run; sits next to the per-domain `audits/<DOMAIN>.md` files). The ranked candidate table from Pass 2 stays in `c:/tmp/` (ephemeral, regenerable).

**Detail:** SKILL.md § "Phase D — Process-skill discovery"; [references/discover-cross-domain-processes.md](.claude/skills/domain-map-analyst/references/discover-cross-domain-processes.md); [references/discovery-query.md](.claude/skills/domain-map-analyst/references/discovery-query.md).

## Build scripts (not modes)

Modes carry user-review gates and Rule #1 discipline (`record_status='new'` on every AI-derived row, never auto-approved). Build scripts are deterministic, idempotent, and user-triggered with no per-row review. They produce artifacts (markdown blueprints, JSON snapshots, ranked tables) from live catalog state; they don't add catalog rows that need approval.

| Task | Command | What it does |
|---|---|---|
| **Create the domain-map JSON snapshot** | `bun run scripts/emit_domain_map.ts` | Emits [`catalog/domain-map.json`](catalog/domain-map.json) — a full catalog snapshot for external tooling. Regenerable from live state. Git-tracked. |
| **Regenerate one module blueprint** | `bun run scripts/emit_fact_sheet.ts --module <CODE>` | Emits [`catalog/blueprints/<module-code>-semantic-blueprint.md`](catalog/blueprints/) for one module. Run after fix-loop writes that touched the module. |
| **Regenerate every module blueprint** | `bun run scripts/emit_fact_sheet.ts --all` | Emits every per-module blueprint in one pass. Run after multi-domain changes. |
| **CI drift check on blueprints** | `bun run scripts/emit_fact_sheet.ts --all --check` | Exits non-zero if any blueprint would change. Use to gate commits. |
| **Catalog-wide Semantius coverage rollup** | `bun run scripts/analytics/coverage_rollup.ts` | Read-only catalog-wide score (`strict_score` + `operational_score` per system skill, per module, per domain). Surfaces which tools push a skill below 100%. Read-only. |
| **Ranked discovery candidates (read-only)** | `bun run scripts/analytics/discovery_query.ts --top 25` | Read-only Phase D candidate list. **Different from Pass 2 in mode c**: no `--persist` flag means no `handoff_processes` writes, just the table. Useful for ad-hoc inspection. |
| **APQC PCF refresh (rare)** | none yet (one-off loader when needed) | When APQC publishes a new PCF version, or an industry-specific PCF gets added, author a `scripts/loaders/import_apqc_pcf_<version>.ts` one-off. Not a recurring workflow. |

Output discipline applies to scripts the same way it does to modes: scripts that write to live state (PCF refresh, future maintenance loaders) follow Rule #1 — new rows are `record_status='new'`, never auto-`approved`. Read-only scripts (emitters, coverage rollup, discovery without `--persist`) don't touch catalog state.

## Things that look like modes but aren't

- **Phase 0 alone, Phase A alone, Phase B alone.** These are sub-stages of Research, not menu items. Research stops at the right phase based on the user's intent; the agent doesn't skip earlier phases by claiming "you only asked for Phase A". When you only need a Phase 0 surface matrix, the trigger is *"research the X market"*, not *"run Phase 0 alone"*.
- **Market audit alone, structural checklist alone, pairwise reconciliation alone.** Sub-passes of Validate b1 (per-domain), run together. Calling them separately is exactly how gaps fall through.
- **PCF_OVERRIDES audit alone, handoff_processes review alone, skills.process_id backfill alone.** Sub-passes of Discover, run together. Pass 0 substrate sanity gates the rest; skipping it is how Discover output silently embeds upstream defects.
- **Single-row edits, renames, deletes, surgical patches.** Not workflows. The agent runs `semantius call crud postgrestRequest` directly when asked.

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
- [`catalog/`](catalog/) — everything the catalog publisher consumes to produce the public site and installable skills. Contents:
  - [`catalog/blueprints/`](catalog/blueprints/) — per-module semantic blueprints, emitted from live state via [`scripts/emit_fact_sheet.ts`](scripts/emit_fact_sheet.ts).
  - [`catalog/domain-map.json`](catalog/domain-map.json) — emitted snapshot of the catalog (gitted but regenerable via [`scripts/emit_domain_map.ts`](scripts/emit_domain_map.ts)).
  - [`catalog/skill-specs/`](catalog/skill-specs/) — per-domain facts files (`<DOMAIN>.yaml`) consumed by the per-domain skill at install time. Emitted from live state.
  - [`catalog/skills/`](catalog/skills/) — per-domain catalog cards (one file per `use-<domain>` skill), consumed by the site generator to render discovery pages.
  - [`catalog/domain-skill-template/`](catalog/domain-skill-template/) — the single template skill the publisher copies per domain, with placeholders the publisher substitutes from the facts file.
- [`scripts/`](scripts/) — committed TypeScript utilities (Bun). Includes the fact-sheet emitter (`emit_fact_sheet.ts`), domain-map JSON emitter (`emit_domain_map.ts`), and two subdirectories:
  - [`scripts/loaders/`](scripts/loaders/) — reusable, idempotent load/fix/backfill patterns referenced from SKILL.md and `references/`. Reference loader: [`load_research.ts`](scripts/loaders/load_research.ts).
  - [`scripts/analytics/`](scripts/analytics/) — read-only and analytics-with-persistence patterns. Phase D entry point: [`discovery_query.ts`](scripts/analytics/discovery_query.ts). Coverage rollup: [`coverage_rollup.ts`](scripts/analytics/coverage_rollup.ts).
- [`.tmp_deploy/`](.tmp_deploy/) — **gitignored** scratch space for dated one-off work (per-domain audit fixes, in-flight drafts). Anything in here will be lost if the working tree is wiped. When a one-off earns repeated reference from SKILL.md or `references/`, promote it to `scripts/loaders/`.
- [`CLAUDE.md`](CLAUDE.md) — project-wide rules (memory-off-limits, no em-dashes, American English, semantius-CLI-cwd).
