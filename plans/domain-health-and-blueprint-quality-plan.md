# Plan: make domain health verifiable (validate procedure, derivation tests, derived-result checks)

**Status:** planned, not started. Phase 0 is detailed in [gate-permission-model-plan.md](gate-permission-model-plan.md), approved 2026-11-01. The platform label change is a separate spec for the user to execute: [platform-access-scope-labels.md](platform-access-scope-labels.md).

## Context

A review of the Hiring Starter blueprint ([catalog/blueprints/hiring-starter-semantic-blueprint.md](../catalog/blueprints/hiring-starter-semantic-blueprint.md)) surfaced about 20 problems. Most sit on shared ATS catalog rows; several are generator derivation bugs. The domain's audit record (`audits/ATS/state.yaml`) shows none of them. Root causes:

- **Checks added after a domain passed were never re-run.** B6b, B9c and M9 part 2 were added on 2026-06-01/02. Of 184 audited domains, 5 record B6b, 9 record B9c and 28 record M9. 64% of all trigger_events have a blank `to_state`.
- **Many checks are presence-only.** Examples: B7 "a user edge exists", M8 "description filled".
- **Validate is run by hand.** It's an agent-run checklist of about 57 check IDs (the docs say "~28"). Nothing records which checks ran or against which checklist version.
- **Sections 8 and 9 have no tests.** These blueprint sections are derived by code. Derivation bugs are invisible to a data audit: no admin role, a duplicated gate, gates routed to the Responsible persona, fixed "approval gate" and "notification" text, and RACI granting gates that 8.1 never mints.
- **The output doesn't match its consumer.** The semantius-architect skill reads these blueprints, and its contract (`consistency-check.ts` `checkAccessScope`, `stage-10-workflow-perms.md`) differs from what we emit.

**Decisions taken:**
- **The architect checker is the contract,** changed in Phase 0 to the model below.
- **The single Accountable persona holds every gate of its process,** following RACI's one-Accountable-per-process rule. Responsible keeps edit rights on the gated records. Gates that are really the author's own action (such as `submit_scorecard`) are flagged for remodeling as owner rules.
- **One permission model** ([gate-permission-model-plan.md](gate-permission-model-plan.md) section 2). Every gate has its own permission at `gated` and `raci`; the level only changes who holds it.
  - `gated`: admins hold every gate.
  - `raci`: the Accountable role holds it, plus admins except on high-risk gates.
  - Gate rules use `has_permission`. Living RACI mode uses `or(is_raci_actor(...), has_permission(<gate>))`.
  - `basic`, `advanced` and `custom` don't change.
- **High-risk gates** are flagged per gate in the catalog (`data_object_lifecycle_states.is_high_risk`), in blueprint §7 and in spec §8.1. The flag only has an effect under `raci`.
- **Per-check results** go in a `checks:` block in `state.yaml`.
- **Informed RACI rows** show their trigger events, and roles.md is updated to match.
- **The health script ports every mechanical check** in one delivery.
- **In scope:** the minor cleanups, the loader pre-flight, and a two-roles rule inside B7b.
- **The undeployed-handoff check is dropped.** Cross-domain handoffs normally target modules that aren't deployed.
- **Starter handoffs** follow the architect's Writing Convention 10 (Phase 2).
- **The ATS findings are recorded by the health script** in Phase 5, not by hand beforehand.

**Outcome:** one deterministic, read-only health check per domain covering both the data and the derived result. A tested generator whose output passes the architect checker. Audit state that records what was actually verified.

## Global constraints (bind every phase and every subagent)

- **No catalog data changes.** Data fixes go per domain through the normal Validate fix loop, with sign-off. The `is_high_risk` column (Phase 0) is the one additive schema change, and it needs a go when run.
- **No `git commit`, push, merge, rebase or tag,** in this repo or in `C:\dev\semantius-agent`. Everything is left uncommitted for review.
- **Subagents** edit only their assigned files. Never `git checkout`/`restore`/`reset`/`clean`/`stash drop`.
- **`semantius`, `bun` and loaders** run from the project root, with no `cd` prefix.
- **The tracked cache file** `.cache/.catalog-cache.json` is rewritten by any non-cached generator run. Tests never touch it, and Phase 5 calls out its diff separately.

## Phase 0: permission contract change in the semantius plugin (comes first)

This phase is detailed in [gate-permission-model-plan.md](gate-permission-model-plan.md): the model, the high-risk marker, the file-by-file change list for the plugin skills, the tests, and decisions N1-N7.

- **Where:** `C:\dev\semantius-agent\semantius-plugin\skills` is the source. The `.agents/skills/` copy in this repo is stale, and is re-synced after Phase 0.
- **That repo's rules** (`C:\dev\semantius-agent\CLAUDE.md`):
  - only approved changes;
  - no commits;
  - re-check `docs/flows.md` after every change;
  - its CHANGELOG format;
  - the format version stays `3.1` (decided).
- **Catalog schema (needs a go when run):** add `is_high_risk boolean default false` to `data_object_lifecycle_states`, with a description, through a loader under `scripts/loaders/`. Then add it to the lifecycle select in [catalog.ts](../scripts/lib/catalog.ts). Marking gates is later data work.

## Phase 1 (a): domain health script, data layer

New `scripts/analytics/domain_health.ts --domain <CODE> | --all [--json] [--record] [--stale]`. It is read-only against the catalog.

1. **Data loading.**
   - Reuse `pg`, `loadCatalogIndex` and `loadAllRelationships` from [scripts/lib/catalog.ts](../scripts/lib/catalog.ts).
   - Add the selects the checks need: `trigger_events`, `skills`, `domain_module_tools`, `capability_domains`, `domain_module_capabilities`, `solution_domains`, `naming_authority_rationale`.
   - Add `id` and `trigger_event_id` to the handoffs select, and `id` to the lifecycle select.
2. **Check registry.** One array of `{id, band, kind, run(ctx) -> Finding[]}`, with ids matching the SKILL.md checklist.
   - **Every one of the 57 checklist IDs** gets exactly one entry. Result values: `pass | fail | warn | agent | delegated | skipped`.
     - **Mechanical, run by the script:** S1-S3, A1-A3, M1, M2, M4-M7, M9 (both layers), B1-B3, B5, B6b, B8, B9, B9b, B9c, B10, B10b, B12, B13, B15, B16, C1, E1-E4, F1-F5, H1. B10 is report-only, so its result is at most `warn`.
     - **Mechanical part plus an `agent` part** (the script runs the presence check, and lists the judgment half as `agent`): A4 (copy present / buyer voice), M8 (copy present / buyer voice), B6 (edges present / isolated-master justification), B7 (user edge present / which actors need one), B11 (aliases present / which masters need them), B14 (conditional masters optional / which are conditional), F8 (fields present / no brands, wording).
     - **`agent` only:** A5, B4, C2, D1, F7, M10.
     - **`delegated`:** B9d (`b9d_resolver.ts`) and B9e (re-emit with `emit_domain_map.ts`).
     - **`skipped`:** E5 (retired) and F6 (reserved).
     - **E6** is extended to run the derived-result checks R1-R8 (Phase 3), on top of its existing reach and `entity_type` checks.
   - Port existing logic into a shared module, then have the original scripts call it so the logic isn't duplicated. Sources: `audit_backlog.ts` (A1, A2, B1, C1, M1, F3), `phase_p_triage.ts` (M9 entity layer, B13, E1), `required_edge_presence_probe.ts`, `validate_cross_domain.ts` q1/q2/q3/q5, `be_spelling_sweep.ts`.
3. **New and extended data checks:**

   | id | check | severity | from the ATS case |
   |---|---|---|---|
   | B6b (automate) | for `one_to_many`, `owner_side=source`; empty `inverse_verb`. 470 rows are flagged for review, never a blanket flip | warn (soft per SKILL.md) | edges 810, 812 |
   | B7b | an edge to `users` that is `many_to_many` with kind `reference` | fail | rows 822-825, 1343, 1344 |
   | B7b (verb) | a user-edge verb that combines two roles ("coordinator and panelists") | warn | row 823 |
   | B9c (extend) | a blank `to_state`, or one that matches no lifecycle state, on a lifecycle or state_change event | warn (soft per SKILL.md) | 10 of 13 starter-entity events blank, 1 (`signed`) invalid |
   | B9f | handoffs with the same trigger event, source module and target module (the payload may differ, so it's a review signal) | warn | 121 / 398 |
   | E4 (tighten) | every gated process has at least 1 Responsible and **exactly 1** Accountable (replaces "at least 1 A") | fail | catalog: 78 processes OK, 1 has two A, 2 have none |
   | E4b | a gated state with no `process_id`. Reported as "RACI readiness" per module, because it only blocks the `raci` level. `gated` needs no process. | warn | `do_not_hire`, `rescinded`; catalog: 923 of 1,085 gated states |
   | E4c | the Accountable persona is also Responsible on the same process | warn | 16 pairs catalog-wide |
   | E4d | the gate verb looks like the author's own action, such as `submit_*` | warn | `submit_scorecard` |

   **Not a check:** a starter without a skill of its own is correct. Skills are no longer attached to modules, and a single-domain starter uses its host domain's skill (SKILL.md F1). Hiring Starter's description saying "one system skill" is a stale-description finding (R7).

4. **Recording results.** `--record` writes a `checks:` block into `audits/<CODE>/state.yaml` with `checklist_version`, `run_at`, and per check `{id, result: pass|fail|warn|agent|delegated|skipped, rows: [...]}`.
   - The block is spliced in as text: only the region from `checks:` to the next top-level key or end of file is replaced. Comments and hand-edited content survive.
   - `b9d_resolver.ts` (`insertB2`, `insertNote`) and `apply_phase_p_triage.ts` are checked and fixed so they also preserve the block.
   - A Validate (b1) run uses `--record`. A "check only" request does not, per Rule #21.
   - `--stale` lists domains whose recorded `checklist_version` is older than the script's, or missing.
5. **Loader pre-flight.** The shape checks (B6b, B7b, B9c, B9f, E4) live in a shared module, `scripts/lib/catalog_invariants.ts`, which the health script and the loaders both use.
   - The existing pre-flight in [load_cluster_drafts.ts](../scripts/loaders/load_cluster_drafts.ts) (L264-276) and the loader idiom ([references/loader-idiom.md](../.claude/skills/domain-map-analyst/references/loader-idiom.md)) call it before any POST or PATCH.
   - **Scope: only the rows being written.** It checks the incoming batch, plus the existing rows each new row interacts with: for E4, the process's existing Accountable rows. It never checks the whole catalog, so existing data, such as the 64% blank `to_state`s, never blocks a load.
   - **Errors refuse the load:**
     - B7b, a new `users` edge that is `many_to_many` with kind `reference`;
     - E4, a new Accountable row on a process that already has one.
   - **Everything else prints a warning and loads:** B6b and B9c (soft by SKILL.md policy, as `load_cluster_drafts.ts` does today), B7b verb, B9f, and E4 with zero Accountable (a batch may add the Responsible rows first).
   - This follows the skill's own policy that every new invariant lives in both the audit and the loader pre-flight.
6. **Fix the two broken audit scripts.** [audit_state.ts](../scripts/analytics/audit_state.ts) and [audit_backlog.ts](../scripts/analytics/audit_backlog.ts) still read the old `audits/<CODE>.md` layout. Make them read `audits/<CODE>/state.yaml` with `js-yaml`, for reading only.

## Phase 2 (b): extract the derivation rules, fix them, test them

1. **Extract** the derive functions from [scripts/generate_blueprints.ts](../scripts/generate_blueprints.ts) into a new `scripts/lib/blueprint_derive.ts`. Today the file exports nothing and runs its CLI on import.
   - Functions to move: `deriveGate` L427, `deriveWriteTier` L1173, `deriveDeleteMode` L1202, `neighborEntityTypes` L1231, `moduleLifecycleScope` L1251, `deriveWorkflowGatesAndRules` L1266, `deriveBaselineRoles` L1371, `derivePermissionHierarchy` L1388, `deriveRaciRealization` L1404, `deriveWiredProcesses` L1452, `deriveMarketRaci` L1481, plus `moduleSlug` and the entity token helpers.
   - Replace the globals they read (L97-103) with a `ctx` parameter.
2. **Add `deriveModuleModel(module, ctx) -> BlueprintModel`**, one typed object for everything sections 2-9 show. The renderers consume it; today sections 8 and 9 each derive separately (L962, L1012).
3. **Offline fixtures and determinism.**
   - Export `buildCatalogIndex` and `buildRelationshipIndices` from catalog.ts.
   - Sort dmdo, relationships, process_raci, role_modules and processes in the index builder. Their queries have no `order=`.
4. **Fix the derivation to match the new contract** ([gate-permission-model-plan.md](gate-permission-model-plan.md) section 5):
   - **Gate holder:** the single Accountable persona of the gate's process gets `grant gates [...]`. Responsible gets the gated entities' write tier only.
   - **One permission set:** every gate keeps its `workflow-gate (lifecycle)` row.
     - `included in :admin?` is ✓, with the matching `:admin -> gate` hierarchy row, unless the gate is high-risk. A high-risk gate gets `-` and no row.
     - §7 carries the new `high risk?` column from `is_high_risk`.
     - Accountable rows name their gates. Unwired gates are marked `⚠ no process`.
     - `access_scope` stays out of the front matter; the architect picks the level when it clones a blueprint.
   - **RACI gate lists:** filtered to gates minted in 8.1 and deduplicated. This fixes the stray `ats-pre-employee-record:hire_candidate` in ats-recruitment-pipeline and the doubled `hire_candidate`.
   - **Admin role:** emit `<slug>_admin` whenever `:admin` is minted (31 of 56 blueprints lack it today).
   - **Fixed text** (L1430, L1436):
     - Accountable rows show their gates or `⚠ no gate wired`.
     - Informed rows list the trigger_events on the process's gated entities, or `⚠ no event wired`.
   - **Module description:** nothing to change in the generator. A stale description such as Hiring Starter's "no workflow gates, one system skill" is a data finding (R7), fixed in the catalog through the Validate loop.
   - **Shared gate codes:** the description names every mapped state.
   - **Embedded-entity handoffs** (architect Writing Convention 10). For an `embedded_master` whose catalog owner isn't installed, §6.2 / §6.3 show the installing unit as source or target, and handoffs between two entities inside the same unit are hidden.
   - **Format version:** the front matter writes `version: "3.1"` in place of `blueprint_version: "3.0"` (`BLUEPRINT_VERSION` L91, its comment L86-90, the emit at L601, the comment at L1090).
     - The architect's 3.1 format dropped `blueprint_version`, and its checker refuses any blueprint without `version: 3.x`. Today every catalog blueprint fails the checker on this alone.
     - Checked on 2026-11-01: with only this key changed, all 56 blueprints pass the current checker.
5. **Tests with `bun test`** in `scripts/lib/__tests__/`:
   - one unit test per rule, on tiny fixtures;
   - a starter-shaped scenario fixture;
   - the Phase 3 invariants over every fixture;
   - one small golden-markdown test.

## Phase 3 (c): checks on the derived result

1. **The invariants.** `scripts/lib/blueprint_invariants.ts`, with `checkModel(model) -> Finding[]`. They use their own prefix, R, because the checklist already has a D1 (UI spot-check):

   | id | invariant | severity |
   |---|---|---|
   | R1 | every role named in 9.2 exists in 9.1 | fail |
   | R2 | every gate in a RACI row is minted in 8.1 | fail |
   | R3 | no gate listed twice in one RACI row | fail |
   | R4 | every gated process has exactly one Accountable row, and every gate wired to a process is held by exactly one Accountable row | fail |
   | R5 | every Informed row resolves to at least one trigger_event | warn |
   | R6 | every handoff event in sections 6.2 / 6.3 resolves `to_state` on its entity's lifecycle | warn |
   | R7 | the module description doesn't contradict the derived counts (heuristic) | warn |
   | R8 | every row-scope rule's entity has a single-person ownership edge to `users` | warn |

2. **Architect checker as an acceptance gate.** A harness copies each blueprint to the scratchpad and runs the current checker from the source, `bun C:/dev/semantius-agent/semantius-plugin/skills/semantius-architect/references/consistency-check.ts`. The harness never modifies the checker.
   - **Which level it injects:**
     - `access_scope: raci` for blueprints whose gates are all wired: 5 of the 52 blueprints that have gates today (56 blueprints in total);
     - `gated` for the other blueprints with gates;
     - none for the 4 blueprints without gates.
   - **For `gated` it first applies the architect's `gated` conversion** to the copy (N1): high-risk gates get ✓ in "included in :admin?" plus their `<slug>:admin -> gate` row, and the RACI trio is dropped. The level-free body the generator emits is shaped for `raci`, so the `gated` check would otherwise fail as soon as any gate is marked high-risk.
3. **Wiring.**
   - The generator runs `checkModel` on every emit, with warnings to stderr.
   - `--lint` writes no files and exits non-zero on any `fail`.
   - `domain_health.ts` records R1-R8 under E6 (extended, Phase 1).

## Phase 4: docs, procedure, minor cleanups

**Docs:**
- **[SKILL.md](../.claude/skills/domain-map-analyst/SKILL.md):**
  - add the new and extended checks;
  - the audit recipe (L1335-1352) runs `domain_health.ts --domain <CODE> --record`, then the agent checks;
  - L844 ("blueprints are not part of this checklist") changes to name the derived-result check;
  - the Rule #22 hygiene note covers the `checks:` block;
  - one canonical check list replaces README:65 "~28", SKILL:1345 and `mass-audit-subagent-prompt.md` L141-142;
  - adding or changing a check bumps `CHECKLIST_VERSION` and is followed by `--all --stale`.
- **[audits/README.md](../audits/README.md):** add the `checks:` block to the v2 schema, and adjust L87 ("`extra_` prefix only").
- **[references/roles.md](../.claude/skills/domain-map-analyst/references/roles.md):** L82 says Informed rows show their notification events. L86 says the Accountable role holds the gates.
- **owner_side means the parent:** fix [references/module-shape.md](../.claude/skills/domain-map-analyst/references/module-shape.md) L341 and the comment at [generate_blueprints.ts](../scripts/generate_blueprints.ts) L1197-1199.
- **README.md b1 section:** fix the stale "read-only by construction" line and the `audits/<CODE>.md` path.

**Minor cleanups:**
- **Permission tokens with a hyphen,** e.g. `view_all_voluntary_self-identifications`, are normalized to snake_case. This renames a permission code, so it's listed in the Phase 5 diff for review.
- **B10** discovery queries move from the deprecated `domain_data_objects` to `domain_module_data_objects`.
- **11 `state.yaml` files** with off-schema top-level keys get them renamed to the `extra_` form. The 2 files with status `built` are documented or normalized. These are audit files, not catalog data.
- **`mass-audit-subagent-prompt.md`** stops telling agents to use the old `audit_state.ts` flow.
- **The A1 fix pointer** to the non-existent `validateDomainRow()` in `load_research.ts` is corrected.
- **`b13_resolver.ts`** stops writing a file in dry-run mode.

## Phase 5: rollout (read-only for the catalog)

1. **`domain_health.ts --domain ATS --record`** must report the full acceptance list below. The script writes only the `checks:` block of `audits/ATS/state.yaml`. The agent running the ATS Validate then writes the open decision (embed or relax the six HIRING-STARTER child entities) as a `b2` item and its q-file question, per Rules #21 and #22. The script never writes the b-buckets.
2. **Regenerate:** `generate_blueprints.ts --regenerate`, then `--lint`. Changed blueprints and the cache file are left uncommitted for review, with the permission-code renames listed separately.
3. **Catalog-wide report:** `domain_health.ts --all --json`, ranked per domain.

## Verification

- **Tests:** `bun test scripts/lib` passes. Each fixed rule has a test that failed before the fix.
- **ATS acceptance list:**
  - B7b: rows 822-825, 1343, 1344.
  - B6b: 810, 812.
  - B9c: event 81 plus 10 blank `to_state`s.
  - B9f: 121 / 398.
  - E4b: `do_not_hire`, `rescinded`.
  - E4d: `submit_scorecard`.
  - M9 part 2: the six HIRING-STARTER children.
  - E6 / R7: the HIRING-STARTER description contradicts the derived gates and skill.
- **Generator after the fix:**
  - hiring-starter has `hiring-starter_admin`;
  - no RACI row lists a gate twice or a gate missing from 8.1;
  - `approve_offer` and `hire_candidate` sit on the Hiring Manager row, `publish_posting` on the Recruiting Manager row, and `submit_scorecard` is flagged by E4d;
  - §6.2 / §6.3 show `hiring-starter` as source or target, per Convention 10.
- **Checker:** the `--lint` harness is clean on every blueprint, except failures the data causes, and each of those also appears as an E4 or E4b data finding. It stays clean when a test fixture marks a gate high-risk, at both `raci` and `gated`.
- **Determinism:** two consecutive `--regenerate --check --no-cache` runs show no drift. Without `--no-cache`, the second run reuses the 5-minute catalog cache and replays the first run's row order, which proves nothing. Each run rewrites the tracked cache file, so its diff is called out as in Phase 5.
- **Format version:** every emitted blueprint carries `version: "3.1"` and no `blueprint_version`.
- **State recording:** `--record` on ATS changes only the `checks:` block, and the comments survive.

## Decisions pending

- None in the plan text. Two go-aheads are asked for when their step runs: the `is_high_risk` catalog column (Phase 0), and the permission-code renames in the Phase 5 diff.

## What this will not do (why the blueprint still won't be "perfect")

- **It checks against the written rules, not whether the rules are right.** A wrong rule passes.
- **It finds problems but doesn't fix them.** Data fixes still need decisions and sign-off.
- **Judgment stays with people:** market coverage, entity boundaries, naming and buyer-voice copy.
- **The catalog can't express everything a blueprint might need.** Cross-entity transition rules ("hired requires an accepted offer"), notification recipients, which edge decides row ownership (including offer to hiring manager), and stages configurable per job stay absent until the catalog schema is extended.
- **Heuristic checks give false positives.** That applies to R7 and E4d.
- **Admin override isn't enforced by the platform itself.** In living RACI mode it lives in each skill-authored gate rule, so a hand-written rule could leave it out.
- **The optimizer can't recover high-risk from a live `gated` module.** It isn't stored live at that level.
