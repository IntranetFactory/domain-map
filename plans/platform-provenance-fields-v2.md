# Provenance in the platform — required changes

**Purpose.** Make catalog lineage and authoring intent **queryable from the live platform** so no
skill ever reconstructs them by reading another phase's artifact files or guessing by name. This
turns rename detection, canonical-owner-arrival detection, custom-vs-known classification, and
lifecycle/behavior discovery from heuristics-plus-file-scan into deterministic reads.

This is decision-free: it states WHAT to store and WHO reads it. HOW (column types, indexes,
migration) is the platform's call.

---

## 0. Environment this assumes (read this first)

A domain idea becomes a deployed module through three skills, each producing one artifact for the
next:

```
semantius-architect  →  semantius-analyst  →  semantius-modeler  →  live platform catalog
   (blueprint.md)         (spec.md)             (executes)            (modules/entities/fields/…)
```

- The **blueprint** (`*-semantic-blueprint.md`) is entity-level intent: `role`, `mastered_in`,
  `pattern_flags`, lifecycle, permissions. No fields.
- The **spec** (`*-semantic-spec.md`) is the reconciled, field-level deploy plan with explicit
  reconciliation annotations (`create-new`, `reuse-from`, `rename-incoming-from`,
  `promote-to-master`, `dropped`).
- The **platform catalog** is the deployed reality: `modules`, `entities`, `fields`, `permissions`,
  `roles`, plus their relationships.

**The invariant this plan restores.** Each artifact is an input to exactly **one** phase. The live
platform is the durable source of truth. Therefore any fact a skill needs about an
**already-deployed** module / entity / field must be readable **from the platform**, never
reconstructed by opening another phase's artifact or another module's artifact.

**Who consumes the catalog downstream (the reason this matters):**

1. The **analyst**, on every re-reconcile / customize / sibling-module deploy. It classifies each
   incoming entity against what is already live (reuse / rename / promote / collision).
2. The tenant-side **`use-*` discovery skills** (e.g. `use-ats`, generated against domain-map
   output). These run in a customer tenant that has **no blueprint or spec files at all**. The
   catalog is their only input. Today their bootstrap discovery falls back to name heuristics and
   **asks the user** to confirm renames, omissions, and custom entities. This is the "wonky runtime
   discovery" these changes are meant to make deterministic.

**Where the architect stands.** The architect reads only the single file it is handed (greenfield:
none; clone/customize/extend/audit: one source) and has **no catalog awareness at all**. It does
not scan sibling artifacts today and never should. Nothing in this plan adds an architect
dependency; it removes the *analyst's* sibling scan and the *runtime discovery's* guessing.

---

## 1. The leak this closes

The analyst's placement logic (Stage 2 workspace scan, feeding the Stage 3 placement table) builds:

```
{ entity_slug -> { current_module, declared_mastered_in, declared_label } }
```

`current_module` comes from the catalog (`entities.module_id`). But `declared_mastered_in` and
`declared_label` are recovered by **parsing every `semantius/blueprints/*.md` and
`semantius/specs/*.md` in the workspace** (analyst Stage 2 scan, sources listed in its own comment:
blueprint §3 then spec §3), with the skill's note: *"that fact lives in the workspace files even
though the catalog doesn't store it."* A row with `role = embedded_master` and a non-empty
`mastered_in` is the signal for canonical-owner-arrival detection (Stage 3b.0).

This is the **only** place in the pipeline a skill reads an artifact other than the one it is
processing. Consequences of storing this (and the other facts in §3) only in files:

- **Breaks when sibling files are absent.** A single-blueprint clone, a cross-repo or cross-session
  deploy, or a module that arrived in the tenant from elsewhere leaves the analyst blind. It
  mis-classifies: fires a collision prompt where it should silently adopt, or vice versa.
- **Trusts files over reality.** If a sibling file drifted from live, the file wins.
- **Invisible to discovery skills.** `use-*` skills have no workspace artifacts, so this intent is
  simply unavailable to them; they degrade to name-matching and user prompts.

The fix is to persist the small set of facts skills reconstruct (authoring intent, rename codes,
behavior flags, lifecycle shape) onto the catalog, then have every skill read them from there.

---

## 2. Design stance

- **Stamp design-time identity for every provisioned object, not only catalog-sourced ones.** The
  deployer always knows the stable code an entity / field / module was deployed under (the
  blueprint's `data_object`, field name, `system_slug`). Stamp it on creation, greenfield included.
  Then a later `table_name` / `field_name` rename is a join for **all** modules. "Empty" then means
  exactly one thing: *created outside the pipeline* (manual / admin), the genuine custom case.
- **Persist the canonical owner as a soft string pointer, not an FK.** An `embedded_master`
  placeholder points at a canonical owner module that **by definition may not be deployed yet**. It
  must be a nullable slug string, never a hard reference.
- **Store identity, derive display.** Store slugs / codes; resolve display names by reading the
  referenced module. Do not denormalize labels or domains into provenance columns.
- **Persist intent and behavior as the skill authored it, not only its deployed consequences.**
  `pattern_flags` and lifecycle shape are reverse-engineered today from the permissions and rules
  they compile into. Store the authored value so discovery reads it instead of pattern-matching.
- **One home per fact.** Lifecycle gate structure already has a home in the in-flight `process_gates`
  registry (see `raci-in-platform-plan.md`). Extend that rather than scattering lifecycle metadata
  across new field columns.
- **All fields additive and nullable, default empty.** Existing rows read empty; downstream falls
  back to today's behavior for them. No backfill required to ship.

---

## 3. Storage — fields to add

### 3.1 Tier 1 — authoring intent + behavior (`entities`)

The three facts the analyst reconstructs from sibling files or pattern-matching, and the rename key.

| table | field | shape | notes |
|---|---|---|---|
| `entities` | `catalog_entity_code` | string, nullable, **not** unique, `is_core` | Stable design-time identity the entity was deployed under (the blueprint `data_object`, e.g. `job_applications`). Stamped on **every** provisioned entity. `table_name` may later drift (alias rename to `applications`); this stays put, so the rename is a join. Empty = created outside the pipeline. Not unique (a shared master like `users` recurs). |
| `entities` | `canonical_owner_module` | string (module slug), nullable, soft pointer, `is_core` | For an `embedded_master` placeholder, the slug of the canonical owner module (`mastered_in`, e.g. `ats-candidate-crm`). Empty when this module **is** the owner (`role = master`) or the entity is local/custom. A non-empty value is the canonical-owner-arrival signal the analyst currently file-scans for. **Soft string, not an FK** — the target module may not exist yet. |
| `entities` | `pattern_flags` | string (semicolon-separated), nullable, `is_core` | The behavior flags the blueprint §3 authored for this entity (`personal_content`, `submit_lock`, `single_approver`, `multi_approver`, `terminal_lock`). Today these survive only as their compiled consequences (`override (personal_content)` permissions, submit-lock rules), so any skill asking "is this personal-content?" pattern-matches permission/rule names. Stamping the authored flags makes it a read. Empty = no special behavior / custom entity. |

```json
{
  "table_name": "entities",
  "field_name": "catalog_entity_code",
  "title": "Catalog Entity Code",
  "description": "Stable design-time identity this entity was deployed under (the blueprint data_object, e.g. job_applications). Stamped on every pipeline-provisioned entity. table_name may later drift; this is the rename-detection join key. Empty = created outside the deploy pipeline.",
  "format": "string",
  "input_type": "default",
  "default_value": "",
  "unique_value": false,
  "searchable": false,
  "is_core": true
}
```

```json
{
  "table_name": "entities",
  "field_name": "canonical_owner_module",
  "title": "Canonical Owner Module",
  "description": "For an embedded-master placeholder, the slug of the module that should eventually own this entity. Empty when this module is the canonical owner or the entity is local. Soft pointer: the target module may not be deployed yet, so this is a slug string, not a foreign key.",
  "format": "string",
  "input_type": "default",
  "default_value": "",
  "unique_value": false,
  "searchable": false,
  "is_core": true
}
```

```json
{
  "table_name": "entities",
  "field_name": "pattern_flags",
  "title": "Pattern Flags",
  "description": "Semicolon-separated behavior flags this entity was authored with (personal_content, submit_lock, single_approver, multi_approver, terminal_lock). Stamped from the blueprint so discovery reads the authored intent instead of inferring it from compiled permissions and rules. Empty = no special behavior.",
  "format": "string",
  "input_type": "default",
  "default_value": "",
  "unique_value": false,
  "searchable": false,
  "is_core": true
}
```

**Optional companion (`entities.entity_role`).** A role enum (`master` / `embedded_master` /
`derived`) the entity was deployed under. `canonical_owner_module` already carries the only
distinction the analyst acts on (placeholder vs owned-here), and `contributor` / `consumer` never
create a local entity row, so a separate role column is largely redundant. Add only if a named
consumer needs the explicit label.

### 3.2 Tier 2 — field rename key + lifecycle shape (`fields` + lifecycle registry)

| table | field | shape | notes |
|---|---|---|---|
| `fields` | `catalog_field_code` | string, nullable, `is_core` | Stable design-time field identity (the blueprint field name, e.g. `status`). Stamped on every provisioned field. Makes field renames a join (the analyst's `lifecycle_state` vs live `status` case; discovery's `field_renames`). Empty = created outside the pipeline. |

```json
{
  "table_name": "fields",
  "field_name": "catalog_field_code",
  "title": "Catalog Field Code",
  "description": "Stable design-time identity this field was deployed under (the blueprint field name, e.g. status). field_name may later drift; this is the field-rename join key. Empty = created outside the deploy pipeline.",
  "format": "string",
  "input_type": "default",
  "default_value": "",
  "unique_value": false,
  "searchable": false,
  "is_core": true
}
```

**Lifecycle shape.** Discovery needs the state machine, not just the state list. Today:

- state **set** → `fields.enum_values` on the lifecycle column (persisted)
- **initial** state → `fields.default_value`, by convention "first enum value" (persisted)
- **gated** transitions → the in-flight `process_gates` registry binds `(entity, state_column,
  to_state, gate_kind)` (persisted once the RACI-in-platform work ships)
- **terminal** states and the **permitted-transition graph** → **not persisted** (live only in
  blueprint §7, plus `terminal_lock` rules)

To fully close it, persist per-state lifecycle metadata in **one** place — extend the
`process_gates` / lifecycle registry anchored on `(entity, state_column)` rather than adding parallel
field columns. Minimal shape:

| field | shape | notes |
|---|---|---|
| `state` | string | the enum value (matches a `fields.enum_values` entry) |
| `is_initial` | boolean | redundant with `default_value` but explicit; optional |
| `is_terminal` | boolean | the missing fact; `terminal_lock` behavior derives from it |
| `requires_permission` | string, nullable | the workflow-gate permission for entering this state (the §7 `derived gate`); cross-references `process_gates` where present |

This makes "which states are terminal / gated" a read instead of a reconstruction from rules and
permission names.

### 3.3 Tier 3 — module lineage + carried metadata (`modules`)

| table | field | shape | notes |
|---|---|---|---|
| `modules` | `catalog_module_code` | string, nullable, **not** unique, `is_core` | The catalog blueprint this module was provisioned / cloned from (e.g. `ATS-CANDIDATE-CRM`; for a starter, the starter code). Lineage only — `module_slug` already is the unique identity. Empty = greenfield. **Not unique** (clone-and-customize deploys one source into more than one module; a unique index would block the second clone). |

Fold the remaining carried-but-unpersisted module metadata into the **existing** `modules.settings`
JSON (already in use for `modules.settings.raci_mode`), not new columns — these are read occasionally
for re-author / audit, never joined:

- `settings.catalog_snapshot` — catalog version that last stamped provenance (drift audits).
- `settings.naming_mode` — `template:<vendor>` / `agent-optimized`. Per-module, so a re-extend keeps
  the module's own naming convention even if the org default later changed.
- `settings.module_kind` — `domain` / `master` / `starter`. `module_type=master` is already a real
  column; the finer `starter` kind is informational and belongs here.
- `settings.promotion_decisions` — the `manage_option` chosen per `promote-to-master` entity. The
  resulting cross-module permission inclusions are already persisted; this records the labeled choice
  so a re-deploy without the spec recovers it.

---

## 4. Self-sufficiency guarantee (the point of the plan)

After §3, every fact any skill needs about a deployed object is on the platform. Concretely, each
runtime / reconcile discovery question becomes a read:

| Discovery question | Answered today by | After this change |
|---|---|---|
| Is this live entity the catalog's X under a renamed table? | name heuristic + ask user | join `entities.catalog_entity_code` |
| Is this a placeholder awaiting a canonical owner (and which)? | analyst parses sibling blueprint/spec files; discovery can't tell at all | read `entities.canonical_owner_module` |
| Is this entity personal-content / submit-locked / approver-gated? | infer from permission + rule name shapes | read `entities.pattern_flags` |
| Is this field the catalog's Y, renamed? | runtime write failure, then heuristic | join `fields.catalog_field_code` |
| Which states are terminal / gated? | reconstruct from rules + permissions | read lifecycle registry / `process_gates` |
| Which catalog blueprint did this module come from? | not knowable from the platform | read `modules.catalog_module_code` |
| Custom (tenant-added) or catalog entity? | name match vs `spec.json` + ask user | `catalog_entity_code` empty = custom |

**Invariant after this lands:** no skill reads a second artifact to do its job.

- **Architect** — already single-file, no catalog awareness. Unchanged.
- **Analyst** — its Stage 2 workspace scan (the sole sibling-file read in the pipeline) is retired:
  `role` / `mastered_in` come from `canonical_owner_module`, rename detection from the catalog codes,
  behavior from `pattern_flags`. The file scan remains only as a fallback for pre-provenance rows.
- **Modeler** — unchanged in inputs; it gains the job of stamping the new columns at provision time.
- **`use-*` discovery** — reads the catalog deterministically; user prompts fire only on genuine
  ambiguity, not on every name mismatch.

The one fact deliberately left in files is the rich §1 Overview prose and §4 aliases / §6 handoff
narrative (the module record carries only the short `description`). These are documentation, not
join keys, and no skill makes a placement or discovery decision from them, so they do not violate
the invariant. Intentional optional-entity omission also stays file/policy-side: on the platform an
omitted entity is simply absent, which discovery reads as absence.

**Provenance removes the guessing, not the governance.** The analyst's must-fire confirmation
widgets and discovery's human review still fire on real rename / omission / merge judgment calls.
The reads just make those questions real instead of noise.

---

## 5. Scope boundary (platform vs skills)

**Platform / core delivers:**

- The columns in §3.1 / §3.2 / §3.3 and the lifecycle-registry extension.
- **Deployer stamping at provision time.** The modeler (the only catalog writer) sets
  `catalog_entity_code`, `canonical_owner_module`, `pattern_flags` on every `create_entity`;
  `catalog_field_code` on every `create_field`; `catalog_module_code` + the `settings` keys on
  `create_module` / `update_module`; and the lifecycle-registry rows when it provisions a lifecycle
  column. Sourced from the spec it is executing. Mirrors how it already plans to provision `tagline`
  once a column exists.

**Skills consume (and change posture):**

- The **analyst** prefers the catalog read over (a) the workspace blueprint/spec scan and (b) the
  name-similarity heuristic. The file scan becomes a pre-provenance fallback only.
- The **`use-*` discovery skills** read the provenance + behavior columns to populate
  `entity_renames`, `omitted_entities`, `custom_entities`, lifecycle, and behavior deterministically.

---

## 6. Dependencies

1. **Blueprint already carries the stable codes and flags** to stamp (`system_slug`, `data_object`,
   field names, `pattern_flags`, §7 lifecycle). No architect change required to *source* them.
2. **Spec already carries them through** to the deployer.
3. **Modeler must write the columns + registry rows.** Net-new but small; natural fit (it already
   writes `modules.settings` and resolves natural keys at write time).
4. **Analyst + discovery skills must be taught to read them** and prefer the read. Coordinated skill
   change; until it lands the columns populate harmlessly and nothing regresses.

---

## 7. Explicitly dropped from the original proposal (and why)

- **`entities.entity_class` enum (`master`/`reference`/`transaction`/`log`/`junction`).** Dropped as
  a platform column. The data-class distinctions that affect permissions / RACI are already computed
  by the architect's Stage 9 (operational vs admin-tier) and persisted as `entities.edit_permission`
  + workflow-gate permissions; the analyst consumes the blueprint's `write tier` verbatim rather
  than deriving tiers, so a persisted enum would feed a derivation that has moved upstream. Note the
  distinction from §3.1's `pattern_flags`: `pattern_flags` is authored intent that is *otherwise
  unrecoverable except by heuristic*, which is why it earns a column; `entity_class` is a
  classification whose *consequence is already stored*. The one under-served case is `log`
  (append-only audit defaults to `:manage`) and pure `junction` — **handle that as an authoring
  refinement in the architect's Stage 9** (let the blueprint flag them so audit tables get no manage
  grant and no RACI Responsible), not as a live column.
- **`modules.catalog_domain_code`.** Dropped. Convenience denormalization the proposal itself said
  to leave empty for cross-domain starters — a column you must remember not to trust for a class of
  modules is a query trap. `domain_code` is in the blueprint and derivable from `catalog_module_code`.
- **Unique index on `modules.catalog_module_code`.** Dropped. Conflicts with clone-and-customize
  (one catalog blueprint deployed into two modules). `module_slug` is the unique identity;
  `catalog_module_code` is non-unique lineage.
- **`modules.catalog_snapshot` as a column.** Folded into the existing `modules.settings` JSON.

---

## 8. Open questions

- **`entity_role` companion column** — include the explicit role enum, or rely on
  `canonical_owner_module` alone? (Leaning: rely on the owner pointer.)
- **Write-once on rename.** A customize pass that renames `table_name` / `field_name` must **not**
  rewrite `catalog_entity_code` / `catalog_field_code` (that would erase the provenance the rename
  detection relies on). Confirm the modeler treats the provenance columns as write-once-at-create.
- **Lifecycle registry home.** Confirm the lifecycle metadata in §3.2 extends `process_gates` /
  the RACI-in-platform lifecycle surface rather than introducing a parallel store, so there is one
  source of lifecycle truth.