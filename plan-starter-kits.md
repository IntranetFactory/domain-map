# Starter kits as first-class deployable units

**Status:** ready to execute.
**Author:** assistant (with martin), 2026-05-26.
**Scope:** redefine "starter kit" from "editorial bundle of existing modules" to "first-class deployable unit that masters zero data_objects."

---

## Motivation

Today's model treats a starter kit as a curated list of full modules a tenant should install first (`domain_starter_modules` junction, one row per recommended module per domain, ordered by `position`). In practice this does not work in deployment because:

- Installing a starter kit means installing N full modules with everything they carry (data_objects, lifecycle states, workflow-gate permissions, system skills). For a small org the footprint is too heavy.
- There is no "lite" path. A 10-person org that wants HR tooling either runs the full HCM module or nothing.
- There is no shape for cross-domain, persona-driven bundles like "Real Estate Agent" that span CRM + CLM + light project tracking without belonging to any one market.

Decision: make starter kits first-class deployable units inside `domain_modules`, distinguished from full modules by a discriminator. Starters never master data_objects; they only embed (or consume) data_objects whose canonical master lives in some full module. When the tenant later installs the full module, the embedded shell deterministically demotes via the rule that already exists for `embedded_master` rows with a canonical master elsewhere. No tenant-side data migration required.

Audit of the existing junction (28 domains, 78 rows) confirms the prior design was misaligned: every row recommends a *full module* as the entry point with a sentence of editorial prose. None of those rows is a starter kit in the new sense. The data has no salvage value and goes wholesale.

---

## Decisions locked in this session

| # | Decision | Detail |
|---|---|---|
| 1 | Same table | Reuse `domain_modules` with a discriminator (`module_kind` enum). Do not introduce a parallel `starter_kits` table. Keeps `skills` / `tools` / `permissions` / `role_modules` plumbing free. |
| 2 | Cross-domain hosting | `domain_modules.domain_id` becomes nullable when `module_kind='starter'`. `domain_module_host_domains` carries the list of domains the starter touches (every domain whose data_object the starter embeds). |
| 3 | Retire `domain_starter_modules` | Wholesale removal via `delete_entity`. No salvage, no per-row review. The 78 rows are generic install-order prose with no preservation value. |
| 4 | Starter invariants | Six rules, listed below. Invariant #1 enforced as a Semantius `validation_rules` entry using `set_record`; loader pre-flight remains as a redundant author-time guard. |
| 5 | Permissions after upgrade | Starter's three baseline permissions stick around after the tenant upgrades to the full module. Provisional, revisit after first real starter ships. |
| 6 | Skills after upgrade | Tenant manages cleanup. Catalog ships both the starter's system skill and (after upgrade) the full module's system skill. Deployer does not auto-swap. |
| 7 | Naming convention | No mandatory prefix. Authors pick `<DOMAIN>-LITE`, `<DOMAIN>-STARTER`, `REAL-ESTATE-AGENT`, etc. The `module_kind` discriminator carries the structural signal. |
| 8 | Industry linkage | Deferred. `domain_module_industries` junction is the cheap option when persona-shaped starters need industry discoverability. Revisit after the third persona starter ships. |
| 9 | `domain_module_host_domains` semantics for starters | Mechanical: every domain whose embedded data_object's canonical master lives in some full module on that domain. No editorial layer. Discoverability follows from the data. |

---

## Schema changes

All schema mutation goes through Semantius API calls (`create_field`, `update_field`, `update_entity`, `delete_entity`). No raw DDL.

### 1. `domain_modules` table

Add `module_kind` field via `create_field`: text, NOT NULL, default `'full'`, with an enum / CHECK constraint over `('full', 'starter')`.

Relax `domain_id` to nullable via `update_field`, then add a row-level validation rule on `domain_modules` that enforces "full module ⇒ domain_id NOT NULL". This preserves Rule #14 for full modules while letting starters have NULL `domain_id`.

### 2. `domain_module_data_objects` table

Author invariant #1 as a `validation_rules` entry on the `domain_module_data_objects` entity (set via `update_entity`). Uses `set_record` to load the parent `domain_modules` row and throws when the parent is a starter and the role is `master` or `derived`:

```json
{
  "code": "starter_no_master",
  "message": "Starter modules cannot master data_objects.",
  "jsonlogic": {
    "set_record": ["dm", "domain_modules", {"var": "domain_module_id"}, {
      "if": [
        {"and": [
          {"==": [{"var": "dm.module_kind"}, "starter"]},
          {"in": [{"var": "role"}, ["master", "derived"]]}
        ]},
        {"throw_error": "Starter modules cannot master data_objects (role must be embedded_master, consumer, or contributor)."},
        true
      ]
    }]
  }
}
```

The `set_record` operator is documented at [.agents/skills/use-semantius/references/data-modeling.md:356-407](.agents/skills/use-semantius/references/data-modeling.md). It loads a parent row by id and binds it for the body of the rule, making cross-entity gates native to Semantius validation_rules.

Loader pre-flight remains as a redundant guard so authoring agents see the error before the catalog write.

### 3. No new tables

The host junction (`domain_module_host_domains`) already exists in the live catalog (verified 2026-05-26) and is reused as-is. No new tables added.

### 4. `domain_starter_modules` removal

After the emitter no longer references it (see § "Rollout sequence" for ordering), call `delete_entity` on the `domain_starter_modules` entity. The Semantius platform cascades through rows, fields, and the physical table.

---

## Starter invariants

Every loader that touches a `domain_modules` row with `module_kind='starter'` MUST validate before any insert / update:

1. **Role restricted.** `domain_module_data_objects.role ∈ ('embedded_master', 'consumer', 'contributor')`. Never `master`, never `derived`. Enforced platform-side by the `set_record` validation rule above; loader pre-flight is the redundant author-time guard.
2. **Canonical master exists.** Every `embedded_master` row points at a data_object that has a `role='master'` row in some full module somewhere in the catalog, OR the data_object is `kind='platform_builtin'`. (Rule #11 already covers this; we enforce the same rule for starters.)
3. **No lifecycle states authored.** No inserts into `data_object_lifecycle_states` from a starter load. Lifecycle is the canonical master's contract. The starter's blueprint renders inherited states (emitter change, § below); the catalog rows live on the master only.
4. **Baseline permissions only, exactly three rows.** The starter ships `<starter_code>:read`, `<starter_code>:manage`, `<starter_code>:admin` with `tier ∈ ('baseline-read', 'baseline-manage', 'baseline-admin')`. No `workflow-gate` permissions from a starter load.
5. **`domain_module_capabilities` allowed.** A starter realizes a subset of capabilities; this is the marketing surface. Same shape as full modules.
6. **Exactly one `system` skill** (Rule #17 unchanged). The starter's `skills` row has `skill_type='system'`, `domain_module_id` set, and ≥1 `skill_tools` row. Floor: `query_<entity>` for each embedded master plus light mutates where the workflow supports them. No workflow-gate tools (those need lifecycle states the starter does not author).

Implementation: extend the existing loader pre-flight validators (analogous to `validateDomainRow()` in [.tmp_deploy/load_research.ts](.tmp_deploy/load_research.ts)) with `validateStarterModule()` and `validateStarterDataObjectJunction()`. Both throw before any POST.

---

## Migration

### Data

78 rows across 28 domains. Confirmed (2026-05-26) to be generic install-order recommendations on existing full modules, no preservation value. Disposition: delete wholesale via `delete_entity` on the entity itself; the cascade removes the rows.

### Existing `domain_modules` rows

All keep `module_kind='full'` (the default). No data migration on existing rows. The discriminator's effect is forward-looking: new starters get authored as `module_kind='starter'`, existing modules stay as they are.

---

## Fact-sheet emitter changes

Current emitter ([scripts/generate_blueprints.ts](scripts/generate_blueprints.ts)) produces two kinds of blueprint:

- Per-module: `blueprints/modules/<module-code>-semantic-blueprint.md`
- Per-starter-kit: `blueprints/starter-kits/<DOMAIN-CODE>-semantic-blueprint.md` driven by `domain_starter_modules` (the `--starter-kit <DOMAIN_CODE>` flag and the `emitOneStarterKit()` path around lines 1203-1247)

After this change:

1. **Per-module blueprint stays.** Now emits for both `module_kind='full'` and `module_kind='starter'` rows. The starter's blueprint:
   - Renders the embedded data_objects with their canonical-master-derived lifecycle states (cross-reference into the master's blueprint).
   - Renders the three baseline permissions.
   - Renders the system skill + tools + coverage score.
   - Cross-links to the full modules the starter's data_objects would upgrade into.
2. **Per-starter-kit-by-domain path retired.** The header comment block (lines 11-16), the GET query at line 1205, the `emitOneStarterKit()` function, the `--starter-kit <DOMAIN_CODE>` CLI flag, and the log message at line 1243 all come out.
3. **New starter blueprint path.** `blueprints/starter-kits/<MODULE-CODE>-semantic-blueprint.md`, one per `module_kind='starter'` row, code matches the starter's `domain_module_code`. (Or fold into `blueprints/modules/` and drop the directory split; revisit at implementation time.)
4. **Legacy starter-kit-by-domain files** in `blueprints/starter-kits/` get cleaned up when the emitter changes land.
5. **CLI flags adjust:**
   - `--module <MODULE_CODE>` works on both kinds.
   - `--starter-kit <DOMAIN_CODE>` removed.
   - `--all` regenerates per-module blueprints for both kinds.

Inherited-lifecycle rendering: when the emitter sees an `embedded_master` row on a starter's `domain_module_data_objects`, it pulls the canonical master's `data_object_lifecycle_states` via `data_object_id` and renders them in the starter blueprint with an "inherited from `<full-module-code>`" annotation.

---

## SKILL.md and references cleanup

The `domain_starter_modules` concept cascaded out of one root (Rule #14) into nine downstream consequences. The cleanup rewrites the root and deletes every cascade.

### [.claude/skills/domain-map-analyst/SKILL.md](.claude/skills/domain-map-analyst/SKILL.md) edits

1. **Lines 235-239 (Rule #14).** Rewrite as: "Every domain has ≥1 `domain_modules` row with `module_kind='full'`. Domains with ≥3 capabilities have ≥2 full modules. Starter kits (`module_kind='starter'`) are optional and not subject to the floor; they have no host-domain requirement (`domain_id` may be NULL)."
2. **Line 339.** Delete the `domain_starter_modules` row from the all-tables catalog.
3. **Line 447 (Phase-A load order).** Remove the "+ populated `domain_starter_modules` junction" clause; the Phase-A rule is now just "≥1 full module per domain, ≥2 for ≥3 capabilities."
4. **Lines 528-536 (S1 coverage sweep).** Drop `domain_starter_modules` from the FK enumeration; drop the "M3, only when capability_count ≥ 3" expected-non-zero note.
5. **Lines 604-607 (per-domain checklist M3).** Delete entirely. The check no longer exists.
6. **Line 894 (emitter doc).** Rewrite to describe per-`module_kind` blueprint emission, drop the per-domain starter-kit blueprint description.
7. **Rule #17.** No textual change; just clarify in prose that "exactly one `skill_type='system'` skill per `domain_modules` row" applies to both `module_kind` values.

### New section in SKILL.md

Insert after Rule #17 (before the at-a-glance):

- Definition: `module_kind='starter'`. First-class deployable unit that masters zero data_objects.
- Use cases: lite variants, onboarding starters, persona / use-case bundles.
- The six invariants (numbered list, exactly as above).
- Naming convention: free-form. The `module_kind` discriminator is the structural signal.
- Upgrade behavior: embedded_master rows demote to consumer when the full module installs. Three baseline permissions stick around. Tenant manages skill cleanup.

### Anti-patterns section additions

- Authoring a `module_kind='starter'` row with a `role='master'` `domain_module_data_objects` entry. Starters never master. If the module needs to master, it is not a starter; promote to `module_kind='full'`.
- Authoring `data_object_lifecycle_states` from a starter load. Lifecycle is the canonical master's contract; starter blueprints inherit and render, never author.
- Authoring workflow-gate permissions on a starter. Starters ship three baseline-tier permissions and nothing else.

### [.claude/skills/domain-map-analyst/references/module-shape.md](.claude/skills/domain-map-analyst/references/module-shape.md) edits

- **Line 448 (`domain_starter_modules` junction definition).** Delete the entire section.

### [.claude/skills/domain-map-analyst/references/modules.md](.claude/skills/domain-map-analyst/references/modules.md) edits

- **Line 19 (table-prefix naming).** Drop `domain_starter_modules` from the list of catalog tables.
- **Line 24 (no-is_starter-boolean prose).** Replace with: "Starter kits are a separate `module_kind='starter'` discriminator on `domain_modules`; see SKILL.md for the invariants."
- **Line 134 (junction description block).** Delete entirely.

---

## Rollout sequence

Strict ordering: emitter must stop reading `domain_starter_modules` before the entity gets deleted.

1. **Schema changes.**
   - `create_field` adds `module_kind` to `domain_modules` (text, NOT NULL, default `'full'`, enum constraint).
   - `update_field` relaxes `domain_modules.domain_id` to nullable.
   - `update_entity` on `domain_modules` adds the validation rule "full module ⇒ domain_id NOT NULL".
   - `update_entity` on `domain_module_data_objects` adds the `set_record` validation rule for invariant #1.
2. **Loader changes.** Implement `validateStarterModule()` and `validateStarterDataObjectJunction()` in the shared loader idiom ([.claude/skills/domain-map-analyst/references/loader-idiom.md](.claude/skills/domain-map-analyst/references/loader-idiom.md)).
3. **Emitter changes.** Adjust [scripts/generate_blueprints.ts](scripts/generate_blueprints.ts) for the new starter blueprint path and inherited-lifecycle rendering. Remove the `--starter-kit` flag, the `emitOneStarterKit()` function, and the `domain_starter_modules` GET. Update CLI flags.
4. **Delete entity.** `delete_entity` on `domain_starter_modules`. Cascade removes the 78 rows, the fields, and the physical table.
5. **SKILL.md and references cleanup.** Apply all edits enumerated above in one pass.
6. **First starter kit.** Author one real starter end-to-end as a validation pass. Candidate: `CRM-LITE` (well-understood domain, clear embedded set: customers + contacts + leads + opportunities) OR a persona starter to stress-test the cross-domain shape (Real Estate Agent). Decision made when this step is reached, not before.
7. **Verify permissions-stick-around** (decision #5). After the first starter's upgrade path is exercised (live or simulated), revisit whether retained baseline permissions cause confusion or work as designed.

---

## Open questions

Not blockers for execution. Tracked for future revisit.

- **Q2: `description` shape on starter rows.** Should the starter's `domain_modules.description` follow a different convention than full modules (e.g. lead with the buyer persona, list the upgrade path)? Defer until first starter authoring; whatever shape that load produces becomes the template.
- **Q4: Order / position on starter blueprints.** Per-module blueprints today have no ordering concern. After the change, starter blueprints render their embedded data_objects in some order, by canonical-master domain? alphabetical? authored order? Defer to emitter implementation; alphabetical is the safe default until UX feedback says otherwise.

---

## Non-goals for this change

- **No retroactive reshaping of existing full modules.** Existing `domain_modules` rows stay `module_kind='full'`. The change is forward-looking; first real starter ships as a brand-new row.
- **No new "personas" table.** Use-case-shaped starters anchor on neither domain nor function. `domain_id` nullable + `domain_module_host_domains` carries the structural footprint; the persona name lives in `domain_module_code` and `description`. Revisit if discoverability becomes a real problem.
- **No industry junction yet.** `domain_module_industries` deferred until the third persona starter ships.
- **No automated post-upgrade reconciliation.** Tenant decides what to do with leftover starter permissions and starter skills after upgrading to a full module. Catalog ships both surfaces; tenant prunes.
