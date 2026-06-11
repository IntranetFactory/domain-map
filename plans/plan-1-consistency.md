# Plan 1: Consistency and invariants (mechanical, no redesign)

Scope: the deterministic fixes and self-checks from the 2026-06-01 coherence audit
([model-map-coherence-audit.md](model-map-coherence-audit.md)) that need NO new modeling.
Decisions and the full plan split live in [model-map-rework-plan.md](model-map-rework-plan.md).

Out of scope (deferred): entity_type write-tier (Plan 2), delete-mode derivation (Plan 2),
personas/RACI (Plan 3), the B3 Semantius-score / `operation_kind` / `coverage_tier`
reconciliation (postponed). Catalog-wide `entity_type` classification is a per-domain review
task, not here.

## Resolved policy defaults (so the plan is runnable AFK)

1. **No hard corpus aborts.** Every new invariant is enforced in two safe places, the audit
   band and the loader pre-flight, and at emit time it WARNS (annotates), it does not throw,
   so existing data violations never brick the blueprint corpus. (Generalizes the m2 lesson
   and m9's graceful-emitter fix.) The only pre-existing hard throw, multi-master, stays.
2. **M14 = soft audit cross-check**, not a hard FK on `trigger_events.to_state`. The data is
   free-text today; a hard FK would reject existing rows. Surface mismatches in the audit.
3. **M15 = carve out the B3 slice.** Do the `skills.domain_module_id` doc reconciliation and
   the `handoff_processes` manifest section now; DEFER the `tools.operation_kind` /
   `coverage_tier` reconciliation with B3 (same contradiction).
4. **Re-derive every count at run time; never trust the audit's numbers.** The audit was a
   point-in-time, repo-only read (B6 was a stale-file false positive), so before any write or
   check the executor re-runs the live SELECT and operates on the live set, aborting if it
   differs from the snapshot. The audit counts (M7's "16", m4b's "6") are expectations to
   confirm, not values to assume.

## Sequenced steps

### A. Doc / comment only (no code behavior, no live write)
- **B6 (no loader action)** The live enum definition is the only source of truth. No comment is needed and no loader edit is made: the historical loader is already applied and idempotent, its `enum_values` array has no live effect (live is `agent_curated` dominant at 686 rows, `human_curated` unused), and a comment in a run-once file is read by no one and goes stale itself, so leave line 81 alone. The recurring concern (hand-maintained copies drifting from live) is handled by the enum-drift check in Step C, which treats live as authoritative, not by annotating dead files.
- **m1** Rewrite the stale notes-based lifecycle exemption (SKILL.md ~line 662) to the structural `entity_type` exemption; reconcile with Rule #12 / Rule #15.
- **M15a** Reconcile `skills` anchor to `domain_module_id` (required-when-system) in `module-shape.md`, demote `domain_id` to transitional. Add a `handoff_processes` field-shape section. Count it in the at-a-glance inventory.
- **m4a** Add `owner_side` to the `data_object_relationships` manifest with its delete-mode semantics.
- **m8a / Rule #13** Reframe the Rule #13 table as a generated/checked artifact, not hand-authored truth: its intro states the live `/fields` definitions are the only source of truth and the table is a convenience cache re-derived and verified against live by the Step C enum-drift check. Under that framing, add the `handoff_processes` enums (`proposal_source` = human_curated/agent_curated/discovery_override/discovery_substring, `role` = implements). The table earns its keep only because the check polices it; without the check it would not be maintained by hand.

### B. Emitter code (verify byte-diff against a pre-Plan-1 snapshot)
- **M1** Factor a single `deriveGate(state, scope, module)` used by both the section-7 renderer and `deriveWorkflowGatesAndRules`, with the one canonical fallback (NULL `domain_module_id` gives the master's owning module). Do NOT assert byte-stability a priori: the two paths genuinely diverge (section 7 at `generate_blueprints.ts:744-748` resolves the gate module to the first in-scope master or the realizing module regardless of scope; section 8 at `883-885` emits a gate only when `realizingId === thisModuleId` or null-and-mastered-here, else drops it). FIRST run a cross-section divergence probe against currently-loaded modules: for every `requires_permission` state, does section 7's gate code equal section 8.1's? If ZERO modules diverge, M1 is genuinely byte-stable and the tension is moot. If any diverge, enumerate the corrective diffs as EXPECTED (the way M3 and m8b are), and add the new section-7-vs-8.1 consistency check as a WARN per Policy 1, NOT a throw.
- **M2** When a `requires_permission` state resolves to no prefix, WARN-and-annotate (per policy 1), do not emit a silent empty gate.
- **M3** In the `has_single_approver` rule, look up the entity's approve-class lifecycle state and use its `permission_verb_override`-resolved gate name instead of the unconditional `approve_<entity_singular>`. (Intentionally changes output for affected entities, a correction.)
- **m9** Make the `--all` driver collect per-module integrity errors and emit a per-module error banner instead of aborting the whole corpus on the first failure.
- **m8b** Emit `trigger_events.from_state` / `to_state` (and optionally `event_category`) into section 6 of the blueprint. (Additive output change.)
- **M4-emit** Emit-time soft assert: per data_object with lifecycle, exactly one `is_initial`, at least one `is_terminal`, unique/monotonic `state_order`. Annotate violations, do not throw.

### C. Invariants into the audit bands and loader pre-flights
Note: these checks are EXPECTED to fire on known-pending data, by design (Policy 1 = warn),
NOT a stop condition. M7-check flags exactly the rows M7-fix (step D) then clears, and m4b
surfaces the empty `inverse_verb` rows Plan 1 deliberately leaves unfixed. An executor must
treat these warnings as expected, not as a halt.
- **M4** state-machine shape (as above) as an audit check + a loader pre-flight.
- **M7-check** B6-style cross-check: for `relationship_kind=composition`, `owner_side` equals the cardinality "one" side and the forward verb reads parent-to-child, and the composed child is mastered by the same module/domain as the parent (or is a non-shared dependent).
- **M14** soft cross-check: `trigger_events.to_state` resolves to a real `data_object_lifecycle_states.state_name` on the same data_object; a gated-transition event corresponds to a `requires_permission` state.
- **m4b** Add `inverse_verb`-non-empty to the B6 pass test and the cluster-drafts loader pre-flight. Re-derive the empty-`inverse_verb` set at run time (the audit saw 6); Plan 1 deliberately does NOT fix these, the check WARNs (Policy 1) so they surface without blocking.
- **m5** For `one_to_many` edges, the "one"/parent side is fixed (owner_side names the parent, forward verb reads parent-to-child) in the loader auto-flip and the relationship audit.
- **enum-drift (subsumes B6)** Review-band check: re-derive each catalog enum's allowed values from the live Semantius field metadata and flag any hand-maintained copy that disagrees (loader `enum_values` arrays, the Rule #13 table, prose enum lists). The audit's own B6 false positive came from trusting a stale array, so this check prevents that class of error.

### D. Live data writes (snapshot before each; held for explicit go-ahead)
- **M7-fix** (corrected 2026-06-01) `owner_side` names the PARENT (lifecycle owner / cascade root), so the `composition AND owner_side=target` set is NOT uniformly wrong, and a blanket flip to `source` would invert delete semantics on the correct rows. Re-derive the set at run time (Policy 4), then per row determine the true parent from the verb: a child-first edge (`child belongs_to parent`) already has the parent on `target` and is CORRECT; only rows whose parent is the `source` (e.g. `transaction requires disclosures`) have `owner_side` genuinely wrong. Flip `owner_side=source` ONLY on those. The 2026-06-01 run found **3 of 16 wrong** (ids 1186, 1187, 1491, all flipped); the other 13 were already correct. Snapshot before; per-row and corrective, never a blanket flip. (The 13 child-first rows' verb direction is a separate cosmetic cleanup, not required for delete-mode; their `owner_side` is already a correct Plan 2 input.)
- **m11-fix** (decided 2026-06-01: SURFACE-ONLY, corrective write DEFERRED to per-domain re-analysis) The stored-matches-derived invariant is realized as the read-only `scripts/analytics/m11_rollup_probe.ts`, which recomputes the rollup (strongest role wins, mirroring catalog.ts) and surfaces disagreements without writing. The corrective write is deferred because `domain_data_objects` is consumed only as a FALLBACK for non-modularized domains: the module-blueprint emitter skips it for modularized domains (catalog.ts ~line 592), `generate_blueprints.ts` never reads it, and `emit_domain_map.ts` unions it with module-derived data, so a stale rollup for a modularized domain has no real consumer. The rollup self-heals domain-by-domain as each domain is re-analyzed (the per-domain review rebuilds `domain_module_data_objects`, from which the rollup derives). DANGER if ever auto-recomputed: 708 of 1192 stored rows are legacy non-modularized-domain rows with no module source and must NOT be deleted. 2026-06-01 probe across 46 modularized domains: 376 missing + 43 role/necessity mismatches + 18 stale-extras.

### E. Verification
- Snapshot `catalog/blueprints/` before any emitter change (the pre-Plan-1 baseline).
- After steps B and D, run `bun run scripts/generate_blueprints.ts --all` and diff against the baseline. Expected diffs: m8b (additive trigger states), M3 (corrected approve-rule gate names), and M1 ONLY IF its divergence probe found section-7-vs-8.1 mismatches (those corrective diffs, enumerated up front). M1 produces zero diff if the probe found none; m9, M2, M4-emit produce zero diff except where they correct a real violation.
- Run `bun run scripts/generate_blueprints.ts --all --check` as the final gate.
- Append a `skill-changelog` Decisions entry for the reconciliations (m1, M15a, the policy-1 invariant approach).

## Live-write inventory (the only DB mutations in Plan 1)
- M7-fix: 3 rows in `data_object_relationships` (`owner_side` target->source on ids 1186, 1187, 1491; the audit's "16" was wrong, only 3 had the parent on the source side).
- m11-fix: recompute `domain_data_objects` rollup.
Both are reversible from the pre-write snapshots in `.tmp_deploy/`.

## Status
Ready to run once the live-write steps (D) are green-lit. Steps A, B, C, E are
non-destructive (code, docs, derived output, snapshots). M1 and M7 are included here, so
running Plan 1 first leaves Plan 2 with clean inputs and a factored gate derivation.
