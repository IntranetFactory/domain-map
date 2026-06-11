# Plan 2: entity_type write tiers and delete-mode (complete the structural emitter)

Scope: make the blueprint carry the structural deploy facts it currently omits, the
per-entity write tier (derived from `entity_type`) and the per-edge delete-mode / FK format.
This is what B1 actually meant. Decisions in [model-map-rework-plan.md](model-map-rework-plan.md).

Out of scope: catalog-wide `entity_type` classification (927 of 987 unclassified; that is a
per-domain review task, Plan 3 standing process), personas/RACI (Plan 3), the B3 score
reconciliation (postponed). Plan 2 is CODE only, NO live data writes.

## Prerequisites (from Plan 1) - BOTH SATISFIED as of 2026-06-01
- **M1** (factor the single `deriveGate`) - DONE. `deriveGate` is already factored and shared
  by the section-7 renderer and `deriveWorkflowGatesAndRules`, plus the section-7-vs-8.1
  cross-check (warn). Plan 2's M6 guard edits the same function; no re-factoring is needed.
- **M7** (composition `owner_side`) - DONE (executed 2026-06-01). NOTE: `owner_side` is a
  domain-map catalog column, NOT a Semantius platform primitive; it names the PARENT (cascade
  root) of an edge. The audit's premise ("flip all 16 composition `owner_side=target` rows")
  was WRONG: only 3 rows were actually wrong (ids 1186 / 1187 / 1491, flipped target->source);
  the other 13 are child-first edges (`child belongs_to parent`) where the parent IS the
  target, so `owner_side=target` was already correct and was left untouched. B4's `owner_side`
  inputs are now trustworthy and Plan 2 carries NO live-write dependency. Source: the
  2026-06-01 entry in [references/skill-changelog.md](../.claude/skills/domain-map-analyst/references/skill-changelog.md).

## Resolved decisions
- **M5 = implication.** Enforce only: `operational_workflow` ⇒ has >=1 lifecycle state (FLAG
  the misclassified entities; the corrective write is out of Plan 2's code-only scope, see
  step B and the Live-write inventory). Do NOT enforce the reverse: catalog/junction/record MAY
  carry lifecycle + `requires_permission` gates (e.g. template approval). `requires_permission`
  and `entity_type` are orthogonal, gates derive from `requires_permission` on any state, the
  write tier from `entity_type`.
- **M6 = flags on the operational pair only.** Pattern flags valid only on
  `operational_workflow` and `operational_record`; forbidden on `catalog`, `junction`,
  `computed`. `computed` implies all three flags false. No write override emitted on a
  no-write entity.
- **B4 = derive in code.** `deriveDeleteMode` is a generator function, not a DB table. No new
  stored field (inputs already exist). Emit delete-mode + FK format in section 5; the applied
  `ON DELETE` lands in the tenant DB at deploy. `inheritance` maps to `restrict`.
- **m2 = unclassified degrades gracefully.** `deriveWriteTier('unclassified')` falls back to
  module-level `:manage` and marks "pending classification"; it does NOT abort the emitter.
  The hard check is a per-domain review-band concern (B13).

## Proposed delete-mode mapping (B4, for sign-off)
`owner_side` orients the FK (it names the parent / "one" side and the child holds the FK);
`(relationship_kind, is_required)` selects the mode and format. Total over every combination:

| relationship_kind | is_required | delete_mode | FK format |
|---|---|---|---|
| composition | any | cascade | parent |
| reference | required | restrict | reference |
| reference | optional | clear | reference |
| association | required | restrict | reference |
| association | optional | clear | reference |
| inheritance | any | restrict | reference |

Confirm this table before B4 emits. It is total over all four `relationship_kind` values; `inheritance` is defensive (confirmed 0 edges live on 2026-06-01). Re-derive the live edge counts at run time (Policy 4, mirrored from Plan 1). Live counts as of 2026-06-01: 1,545 reference + 180 composition (167 `owner_side=source` / 13 `target`) + 104 association + 0 inheritance. Treat these as the expectation to re-confirm at run time, not as values to assume.

## Sequenced steps

### A. entity_type wiring (B2)
- Add `entity_type` to the `data_objects` SELECT in `catalog.ts` and to the `DataObject` type.
- Implement `deriveWriteTier(entity_type, endpoints)` returning `{read, writeTier|null}`, total over every enum value: operational_workflow / operational_record give `manage`, catalog gives `admin`, junction gives `admin` if an endpoint is catalog else `manage` (resolved from the relationship endpoints), computed gives no write, unclassified gives the graceful `:manage` fallback marked pending.
- Render the per-entity write tier as a NEW column in blueprint section 3 (entities), via the section-3 renderer (the §3 entity table at `generate_blueprints.ts:605-644`; add the column to the header list at `generate_blueprints.ts:612`), NOT `deriveWorkflowGatesAndRules`.
- The section 8 module-level baselines (`:read` / `:manage` / `:admin`) are UNCHANGED, those permissions exist per module regardless of `entity_type`. The only change inside `deriveWorkflowGatesAndRules` is the M6 guard (step B): suppress flag-derived overrides on computed / no-write entities. The uniform `:manage` baseline push (`generate_blueprints.ts:938`) stays as the module baseline. Section 8 gets NO new per-entity column: its table is per-permission, not per-entity, so the write tier belongs in section 3 only.
- Promote the `entity_type -> tier` mapping into SKILL.md Rule #12 (or a new RBAC rule) and `references/modules.md` section 4 as the canonical derivation (it currently lives only in `plans/entity-type-permission-possibilities.md`).

### B. entity_type invariants (M5, M6)
- M5: `operational_workflow` ⇒ has >=1 lifecycle state, as an audit-band check + a loader pre-flight + an emit-time soft annotation (never a hard abort).
- M6: a generator guard (no write override emitted on catalog/junction/computed) + an audit invariant (flags valid only on operational_workflow/operational_record; computed implies all flags false).

### C. delete-mode (B4)
- Implement `deriveDeleteMode(relationship_kind, owner_side, is_required)` returning `{mode, fk_format}` per the table above.
- Emit the resolved delete-mode and FK format as columns in blueprint section 5.
- Document the canonical rule in `module-shape.md` (and delete the stale `kind+necessity` -> delete-mode formula in `plan-generate-blueprints.md`, which lives at the repo root, around line 82).

### D. Verification
- Snapshot `catalog/blueprints/` before changes. Force a catalog-cache refresh first (delete `.tmp_deploy/.catalog-cache.json` or pass `forceRefresh`): the cache validity check does not detect the new `entity_type` column, so a fresh-but-pre-change cache within its 5-minute TTL would emit `entity_type` as undefined.
- Regenerate ONLY the existing blueprint files (one `bun run scripts/generate_blueprints.ts --module <CODE>` per file already in `catalog/blueprints/`). Do NOT use `--all`: the committed corpus is a curated subset (~18 modules), and `--all` would emit ~130 new blueprints for unclassified modules that have no committed file. Diff. Expected diffs: the new per-entity write-tier column in section 3; the new delete-mode / FK columns in section 5; and, in section 8, the M6 guard suppressing flag-derived overrides on classified catalog / junction / computed masters that still carry a legacy flag. No other section should move.
- Gate: re-run `--module <CODE> --check` over the same existing files and confirm zero drift. Append a `skill-changelog` Decisions entry for the entity_type and delete-mode derivations.

## Live-write inventory
None. Plan 2 is code, docs, and derived blueprint output only. Its one external dependency,
Plan 1's M7 (the composition `owner_side` correction), was applied on 2026-06-01 (3 rows
fixed, 13 already-correct rows left untouched), so B4 can emit correct delete-mode / FK now.
Plan 2 neither performs nor absorbs any live write.

## Downstream impact
Logs rows 1 (per-entity write tier) and 2 (delete-mode / FK format) in
[downstream-updates.md](downstream-updates.md): the analyst stops re-deriving edit tiers and
the deployer selects FK shapes rather than reconstructing them.

## Status
EXECUTED 2026-06-01. B2 (write-tier wiring + section-3 column), B4 (`deriveDeleteMode` +
section-5 columns), and the M5 / M6 guard + soft annotations are implemented in
`scripts/generate_blueprints.ts` + `scripts/lib/catalog.ts`; the delete-mode table above is the one
that shipped. The 18 existing blueprints were regenerated (existing files only, NOT `--all`) and
pass per-module `--check` with zero drift. Docs updated (SKILL.md Rule #12, references/modules.md
section 4, references/module-shape.md, plan-generate-blueprints.md) and a Plan 2 skill-changelog
entry added. Data debt surfaced (3 non-operational masters carrying legacy flags) is deferred to
per-domain review. No live writes.
