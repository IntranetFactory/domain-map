# Plan 5: entity-scoped workflow-gate permission identity (reduce naming friction)

Scope: re-key WORKFLOW-GATE and PATTERN-FLAG-OVERRIDE permissions from the module-prefixed form
`<module>:<verb>_<entity>` to a deployment-stable, entity-scoped form `<entity>:<verb>`. Baseline
tiers (`<module>:read` / `:manage` / `:admin`) stay module-scoped. This gives every gate one stable
identity that follows the ENTITY rather than the installing unit, which dissolves the
rename-on-upgrade problem plan-4's step-D re-prefix created, and retires the re-prefix machinery
itself. Decision context in [model-map-rework-plan.md](model-map-rework-plan.md); this supersedes
the gate-naming half of [plan-4](plan-4-presence-conditional-required.md) step D.

Out of scope:
- The presence-conditional `is_required` work (plan-4 step C) and the M9 relationship-layer band
  (plan-4 step B). Orthogonal; they stay.
- The DEPLOYER implementation. Materializing entity-scoped permissions and the idempotent
  master-install merge live in the platform track (see below). Plan 5 makes the CATALOG derivation,
  the BLUEPRINT, and the docs correct; it changes no tenant.
- A schema change to make permissions a first-class entity-keyed table. Permissions remain DERIVED
  strings (modules.md section 4 / Plan 3); only the string's shape changes.

## The problem (from the plan-4 review)
Permissions are module-namespaced (`<module>:<verb>`). A workflow gate is conceptually a permission
to drive an ENTITY through a transition, but today its name is bound to whichever module realizes
the entity. Plan 4 exposed the cost:

- When an entity is carried as `embedded_master` by a unit whose canonical realizing module is
  absent (a starter, or any standalone-emitted module), plan-4 step D RE-PREFIXES the gate to the
  installing unit (`hiring-starter:approve_offer`) and mints it. Correct for that deployment.
- But when the canonical module later installs, the same transition's gate is `ats-offers:approve_offer`.
  The code CHANGED, so every grant / persona / role referencing `hiring-starter:approve_offer` must
  be migrated. That deploy-time rename is fragile and plan-4 punted it to the platform track.
- Entity-scoping (`job_offers:approve`) makes the gate identity stable across EVERY deployment
  composition (starter standalone, full module, cross-domain bundle). Master-install becomes an
  idempotent no-op (the code is already present), so there is no rename and no grant migration.

## Why entity-scope, not domain-scope (resolved in discussion)
- Domain-prefix (`ats:approve_offer`) is stable within a domain but (a) is undefined for
  cross-cutting modules (`domain_id` NULL: APPROVAL-WORKFLOW, KNOWLEDGE-MGMT) and would need a
  fallback, and (b) directly contradicts the existing anti-pattern that a cross-cutting module's
  permissions are MODULE-prefixed, never domain-prefixed ([modules.md](../.claude/skills/domain-map-analyst/references/modules.md) section 8; SKILL.md).
- Entity-prefix needs no fallback (every gate is on an entity), is fully stable (immune to module
  splits within a domain AND to deployment composition), and the entity token is ALREADY in
  today's gate code (it just moves from the suffix to the prefix).

## What it does NOT cost: permission count
Re-keying RELABELS the same rows; it adds and removes none. The count is fixed by the permission
KINDS, not the prefix:
- baselines: 3 per module (unchanged, still module-scoped)
- workflow gates: 1 per `requires_permission` transition (relabeled)
- pattern-flag overrides: a couple per flagged entity (relabeled)

Ordinary CRUD on every entity is already governed coarsely by `<module>:manage` (operational) and
`<module>:admin` (catalog) - one pair per module, never per entity. Gates and overrides are the
small, deliberate fine-grained set on top. Entity-scoping touches only that small set; baselines
stay module-scoped so per-module grantability is preserved.

## Keystone decision (for sign-off)
1. **Workflow gates: `<entity>:<verb>`** (e.g. `job_offers:approve`, `candidates:hire`).
2. **Pattern-flag overrides: also entity-scoped** (`<entity>:view_all`, `<entity>:manage_all`,
   `<entity>:submit`). They govern a specific entity's rows, so the entity is the natural namespace.
3. **Baseline tiers: UNCHANGED, module-scoped** (`<module>:read` / `:manage` / `:admin`). The module
   is the deploy + grant unit; collapsing baselines would lose per-module grantability.
4. **Hierarchy: `<module>:admin` includes every `<entity>:<gate>` for an entity the module masters
   OR embeds.** Multiple modules' admin can include the SAME stable entity-gate (the starter's admin
   and the canonical module's admin both include `job_offers:approve`). That co-inclusion is correct
   and is exactly what makes master-install a no-op.
5. **The step-D re-prefix is RETIRED.** `deriveGate` no longer takes an installing-unit prefix or a
   `reprefixModuleIdSet`; the entity token is already deployment-stable. The override mint likewise
   drops the `slug` prefix in favor of the entity token.

Open details the draft must pin down before code:
- **Entity token.** `data_object_name` (the table, `job_offers`) vs a `singular_label` token
  (`job_offer`). Recommend `data_object_name`: it is already catalog-unique by Rule #9 naming
  arbitration, so no collision and no ambiguity.
- **Verb derivation.** Today: `<permission_verb_override ?? state_name>_<entity_singular>`. Entity-
  scoped wants just the verb. Options: (a) keep `permission_verb_override` VERBATIM as the verb
  (`job_offers:approve_offer`, redundant but lossless and safe), or (b) strip the entity token from
  the override (`job_offers:approve`). Recommend (a) to avoid a lossy transform, revisit if the
  redundancy grates. `state_name`-derived verbs (no override) are already clean (`approved` ->
  `job_offers:approved`).

## Sequenced steps
### A. Decide the two open details (entity token, verb handling)
Pin down `data_object_name` token + verbatim-override verb (or the alternatives), so B-D are
mechanical.

### B. Rewrite `deriveGate` (generate_blueprints.ts) and DELETE the re-prefix path
- Emit `<entityToken>:<verb>`. Remove the `reprefixModuleIdSet` parameter, the `reprefixed` flag,
  and the installing-unit prefix branch added in plan-4 step D. `gateModule` is still resolved (for
  the section-7 "realizing module" display column), but no longer drives the code's prefix.
- The section-7 in-scope-gate tracking and the M1 section-7-vs-8.1 cross-check simplify: a gate is
  in scope iff its entity is in scope (no re-prefix bookkeeping).

### C. Rewrite the gate + override mint in `deriveWorkflowGatesAndRules`
- Gate codes: `<entityToken>:<verb>` (via the updated `deriveGate`). The `ownsByEmbedding` mint
  guard from plan-4 step D STAYS (it decides WHICH gates a unit materializes when deployed
  standalone), but the code it mints is now entity-scoped and identical to the canonical module's.
- Override codes: `<entityToken>:view_all` / `:manage_all` / `:submit` (drop the `slug` prefix). The
  embedded-entity override extension (plan-4 follow-up) stays; only the prefix changes.
- Baselines unchanged. `derivePermissionHierarchy`: `<module>:admin` -> each entity-scoped gate /
  override in the module's mastered-or-embedded set.

### D. Update `deriveRaciRealization` and any other gate-code consumers
- RACI gate-code lists become entity-scoped (drop the `moduleIdSet` re-prefix arg added in step D;
  it is no longer needed).

### E. Docs
- modules.md section 4 "Permission code format": gates + overrides are `<entity>:<verb>`; baselines
  stay `<module>:...`. Rewrite the "state realization at deploy: re-prefix" subsection: there is no
  re-prefix; the entity-scoped gate is identical whether realized by the canonical module or
  pre-provisioned by an embedding unit, so master-install is an idempotent merge.
- SKILL.md Rule #12 ("Gate prefix and re-prefix"): replace with the entity-scoped identity rule.
- SKILL.md Rule #19 invariant #4: a starter materializes the entity-scoped gates of what it embeds;
  on upgrade they are IDENTICAL to the canonical module's gates (no rename, no migration). Drop the
  re-prefix / supersede-and-rename language from the Upgrade behavior paragraph.
- The cross-cutting anti-pattern (modules.md section 8 / SKILL.md): clarify it governs MODULE-scoped
  permissions (baselines); workflow gates are entity-scoped and exempt from the module-prefix rule.
- references/module-shape.md: any permission-shape notes.

### F. Verification
- Re-emit the committed corpus; diff; `--check` zero drift.
- Confirm the invariant the whole plan buys: for any entity an X embeds and its canonical module Y,
  the gate code emitted in X's blueprint is BYTE-IDENTICAL to the one in Y's blueprint
  (`job_offers:approve` in both HIRING-STARTER and ATS-OFFERS). That identity is the proof there is
  no rename on upgrade.

## Platform track (out of this repo)
- Deployer materializes entity-scoped gate / override permissions. On master-install the gate code
  already exists (idempotent) - merge, do not rename, do not migrate grants. This RETIRES the
  deferred plan-4 platform item "re-prefix gates at deploy / rename on upgrade."
- Dedup: a gate minted by two installed units (a starter and the canonical module) is the same code
  -> one tenant permission row; each module's `:admin` hierarchy edge points at it.

## Live-write inventory
None in this repo. Code (two derivation functions + hierarchy) + docs + regenerated blueprints
only. The tenant-facing permission-code change lands via the deployer (platform track).

## Downstream impact
Supersedes plan-4 step D (gate re-prefix). Reframes [downstream-updates.md](downstream-updates.md)
row 6: gate identity is entity-scoped and deployment-stable, so "realize or re-prefix gates by what
is installed" becomes "entity-scoped gates need no re-prefix; install materializes, never renames."
Row 10 (presence-conditional FK) is unaffected.

## Status
DESIGN, not executed. Pending sign-off on (a) the entity token (`data_object_name`), (b) verb
handling (keep override verbatim), (c) baselines stay module-scoped, and (d) retiring the plan-4
step-D re-prefix. No code or doc change until signed off.
