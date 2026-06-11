# Modules — long-form rules

Modules are the **autonomous deployment unit** between capabilities (market-analysis layer) and live Semantius semantic models. Schemas live in [module-shape.md § Module concept](module-shape.md#module-concept); the rules and patterns that make modules work live here.

The mandatory existence of `domain_modules` for every domain is Rule #14 in [SKILL.md](../SKILL.md). The starter-kit contract (`module_kind='starter'`) is Rule #19. This document covers everything beyond those existence and discriminator rules.

---

## 1. The three layers — keep them distinct

| Layer | What it is | Buyer-facing phrasing |
|---|---|---|
| **Domain** | Point-solution market (CRM, ITSM, ATS). The SEO / market-analysis surface. Anchor for vendors, capabilities, RACI, regulations. | "The Applicant Tracking market" |
| **Capability** | Market-analysis noun ("Lead Management", "Background Checks", "Workforce Scheduling"). What an org *can do*. Comparable across vendors. | "Background-check capability" |
| **Module** | Autonomous deployment unit. Owns data_objects, lifecycle states, edges, tools. Installable standalone; composes with other modules via embedded_master demotion. | "Install the Background Checks module" |

Most rows correspond ~1:1 across layers, but the concepts are separable. Some capabilities become modules; some get absorbed into a larger module; cross-cutting capabilities become modules installable across multiple domains.

**Naming:** the catalog tables use `domain_modules`, `domain_module_capabilities`, `domain_module_data_objects`, `domain_module_host_domains` — the `domain_` prefix avoids collision with the Semantius platform's own `domain_modules` (the entity-grouping concept every Semantius entity belongs to). FK columns are `domain_module_id`. In prose, the concept is still "a module" — only the table/column identifiers carry the prefix.

**What's explicitly out:**
- No packages / tiers / SKUs (no "Starter / Pro / Enterprise" gates). Every module is independently deployable and structurally equal regardless of `module_kind`.
- No dependency tree. Composability is expressed via `domain_module_data_objects.role` and the existing embedded_master demotion.
- Starter kits are a separate `module_kind='starter'` discriminator on `domain_modules`, see [SKILL.md Rule #19](../SKILL.md). The prior `is_starter` boolean idea and the `domain_starter_modules` editorial junction are both gone; starters are first-class deployable units that master zero data_objects, not editorial recommendations layered on top of full modules.

---

## 2. Composability — the data shape IS the dependency

The existing master / embedded_master mechanism already handles independence between modules. There is **no `domain_module_dependencies` table** and **no DAG**.

How it works:

- Each module owns its data_objects with the 5-role vocabulary used on domains today: `master`, `embedded_master`, `contributor`, `consumer`, `derived`.
- When a module embedded_masters a data_object, the deployer/architect logic handles three cases:
  1. **Canonical master module deployed**: the canonical master is the source of truth; the embedded_master row references it.
  2. **Canonical master module NOT deployed**: the embedded_master becomes the local master in the consuming module's own deployment.
  3. **Multiple modules embedded_master the same data_object without canonical master**: the deployer materializes **one shared local-master table** by unioning the embedded shells declared by each installed module's own entity definition.
- A module is therefore always self-contained — it ships every data_object it touches, either as canonical master or as embedded master that gets demoted automatically if the canonical version lands later.
- **No declared dependencies needed.** A module's data_object footprint *is* its composition declaration. Two modules sharing a `candidates` data_object compose automatically; either can be deployed alone.

**Worked example — Talent Pools as a standalone module:**

- `ATS-TALENT-POOLS` module masters `talent_pools`, embedded_masters `candidates`.
- Deployed alone: the `candidates` embedded_master demotes to local master automatically — the deployer materializes a thin candidate shell so talent pools have records to group.
- Deployed alongside `ATS-CANDIDATE-CRM` (which canonically masters `candidates`): the deployer detects the canonical master, demotes the embedded_master row to a reference. Talent pool records reference the shared candidates.

---

## 3. Cross-cutting modules — `domain_id` and host-domains

A module can host on multiple domains (e.g. `KNOWLEDGE-MGMT` lives in ITSM, CSM, HRSD, LSD; `APPROVAL-WORKFLOW` is genuinely cross-functional with no obvious primary host).

- `domain_modules.domain_id` is the **primary host** — nullable for modules with no obvious home (`APPROVAL-WORKFLOW`, `AI-TRIAGE`).
- Additional hosts go in `domain_module_host_domains` (one row per extra host).
- **Convention:** never both `domain_modules.domain_id = X` AND `domain_module_host_domains.domain_id = X` for the same module. If a module has a primary host, host_domains rows list only the OTHER hosts.

Querying "which modules are installable on domain X?":

```
(SELECT * FROM domain_modules WHERE domain_id = X)
UNION
(SELECT domain_modules.* FROM domain_modules
   JOIN domain_module_host_domains ON domain_module_host_domains.domain_module_id = domain_modules.id
   WHERE domain_module_host_domains.domain_id = X)
```

**Cross-cutting decision test when authoring a module:** is there a recognised standalone market for this concept? If yes (e.g. `KMS` for Knowledge Management — Bloomfire, Guru, Tettra, Document360), the module's primary host is that market's domain and the cross-cutting links are `domain_module_host_domains` entries. If no (e.g. `APPROVAL-WORKFLOW` has no standalone market), `domain_id` stays NULL and every host is a host_domains row.

---

## 4. Lifecycle-permission materialization

Permissions are **derived** from `data_object_lifecycle_states` (workflow gates) and `data_objects` pattern flags. Modules are the **namespace** in which derivation happens, not the source of the permissions.

### Permission code format

`<domain_module_code>:<verb>` in lowercase-kebab. The realizing module's `domain_module_code` is the prefix.

- **Baseline tiers (always materialized per module):**
  - `<module>:read`
  - `<module>:manage`
  - `<module>:admin`
- **Workflow gates (one per lifecycle state with `requires_permission=true`):**
  - Format: `<module>:<verb>_<entity_singular>`
  - `<verb>` = `data_object_lifecycle_states.permission_verb_override` if set, else `state_name`
  - `<entity_singular>` = derived from `data_objects.singular_label`
- **Pattern-flag overrides (one set per pattern flag = true):**
  - `has_personal_content` → `<module>:view_all_<entity>` + `<module>:manage_all_<entity>`
  - `has_submit_lock` → `<module>:submit_<entity>` + restriction rule
  - `has_single_approver` → `<module>:approve_<entity>_requires_approver` rule

### Write tier by `entity_type` (B2)

Read is uniformly `<module>:read`. Which baseline governs an entity's WRITES is derived from `data_objects.entity_type` (not stored, not authored): `deriveWriteTier` in `scripts/generate_blueprints.ts` resolves it and renders the section-3 "write tier" column.

| `entity_type` | write tier |
|---|---|
| `operational_workflow` / `operational_record` | `<module>:manage` (plus workflow gates for `operational_workflow`) |
| `catalog` | `<module>:admin` |
| `junction` | `<module>:admin` if a linked endpoint is `catalog`, else `<module>:manage` |
| `computed` | none (read-only) |
| `unclassified` | `<module>:manage`, flagged pending (graceful; the hard check is audit band B13) |

No new permission is minted: `:manage` and `:admin` already exist per module, so `entity_type` only selects which existing baseline tier applies. The M6 generator guard suppresses pattern-flag overrides on `catalog` / `junction` / `computed` masters.

### `permissions` (DERIVED + emitted, materialized by the deployer in the tenant)

As of Plan 3 the catalog does NOT store derived permissions. The emitter (§8) derives the per-module codes + tiers from lifecycle states + the entity-type write tier; the blueprint carries them; the deployer materializes them as tenant `permissions` rows. Each derived permission carries:

- a code: `<domain_module_code>:<verb>_<entity_singular>` for gates (verb = `permission_verb_override` if set, else `state_name`), or the baseline `<module>:read` / `:manage` / `:admin`.
- a `tier`: `baseline-read` / `baseline-manage` / `baseline-admin` / `workflow-gate` / `override`.

The catalog's own `_core` `permissions` table holds only the 6 platform rows (the catalog app's RBAC); no catalog loader writes derived permissions into it.

### `permission_hierarchy` (DERIVED + emitted, materialized by the deployer)

The emitter (§9, B2) derives per-module hierarchy edges:
- `<module>:admin` ⊃ `<module>:manage` ⊃ `<module>:read`
- `<module>:admin` ⊃ every workflow gate and pattern-flag override in that module

The derived persona bundle uses tier-level grants (`<module>:admin`) and the derived hierarchy auto-expands them at request time. None of this is stored in the catalog; the deployer provisions it in the tenant from the blueprint.

### Override collisions

When two lifecycle states across different data_objects use the same `permission_verb_override` (e.g. `candidates.hired` and `job_applications.hired` both override to `hire_candidate`), the derived permission rows legitimately collapse to one permission fired by two transitions. The deployer treats them as one.

### State realization at deploy: re-prefix, do not prune (plan-4)

`data_object_lifecycle_states.domain_module_id` is nullable. NULL = state always reachable when the master is installed. Non-NULL = state realized by that specific module.

When a gated state's realizing module is NOT installed but the entity IS present in the deploying unit (carried as `embedded_master`), the gate **re-prefixes to the installing unit** rather than being pruned. A hiring starter that embeds `job_offers` without `ATS-OFFERS` still needs the approval gate, so it emits and mints `hiring-starter:approve_offer` instead of dangling at the absent `ats-offers:approve_offer`. The emitter does this for the blueprint (the shared `deriveGate` re-prefixes the §7 label; `deriveWorkflowGatesAndRules` mints the re-prefixed gate in §8.1); the deployer does the same for arbitrary partial deployments at install time. This supersedes the earlier "prune states whose `domain_module_id` references an un-installed module" rule, which silently dropped governance for embedded entities.

A state is genuinely dropped only when its entity is ALSO absent from the deploying unit (nothing to gate). Transitive embedded_master pull-in carries the entity; there is no `requires_modules` column on lifecycle states.

---

## 5. Embedded-shell contracts live at deploy time, not in the catalog

Field-level shell contracts (which columns each embedded_master rendition includes) are NOT a catalog concern. The deployer reads each installed module's own entity definition (the runtime `fields` table) and resolves shell composition at deploy time:

- A module's local entity definition declares its own shell — the columns it stores when it locally masters another domain's data_object.
- When multiple modules embedded_master the same data_object without the canonical master installed, the deployer unions their shells into one shared local-master table.
- When the canonical master IS installed, all embedded_master shells defer to it and read through the canonical entity.

The catalog (`domain_data_objects`, `domain_module_data_objects`) records *that* a module embedded_masters a data_object and *what role* it plays — it does not duplicate the field-level shape.

> **History.** An earlier `data_objects.minimum_embedded_shape` markdown column intended to declare embed-time required fields was dropped after the field-level contract was correctly relocated to the deployer.

### Self-containment invariant (no hard prerequisites)

`embedded_master` is the mechanism that makes a module **independently deployable**, so the invariant follows: **every module deploys standalone, with no hard prerequisite on another module.** Every data_object a module touches is one of:
- `master` (it owns), or
- `embedded_master` (it carries a local shell; the canonical owner is OPTIONAL, deferred to only if installed), or
- `necessity=optional` (presence-conditional, Rule #16: a required edge to an un-installed target carries no constraint), or
- a `consumer` of a platform built-in / shared master that is always present (`users`, master-data).

A `contributor`, or a `consumer` with `necessity=required`, pointing at **another domain module's** entity that is **not** also embedded here, is a **self-containment VIOLATION** (the module can't deploy without co-installing that module). The fix is to embed the entity (`embedded_master`) or make it optional, NOT to document a dependency. This is enforced by audit check M9; there is deliberately no "deployable closure / required modules" output, because a correct module has none. Modules that are merely *related* (data coupling, handoffs, shared personas) are surfaced as the informational `related_modules` front-matter hint in the blueprint, never as a requirement.

---

## 6. Starter kits — first-class deployable units

Starter kits are `domain_modules` rows with `module_kind='starter'`. Authoring contract and six invariants live in [SKILL.md Rule #19](../SKILL.md). The relevant points from a module-authoring perspective:

- Starters take exactly two `domain_module_data_objects` shapes: `embedded_master` on a `kind='domain_owned'` data_object (canonical master must exist in some full module), or `consumer` on a `kind='platform_builtin'` data_object (today only `users`). Never `master`, never `derived`, never `contributor`, never `consumer + domain_owned`. The platform-side `starter_no_master` validation_rule on `domain_module_data_objects` rejects `role ∈ {master, derived}`; the broader restriction (no `contributor`, no `consumer + domain_owned`) lives in the loader pre-flight `validateStarterDataObjectJunction()` (in [loader-idiom.md](loader-idiom.md)). Why: a starter must be deployable standalone. A `consumer + domain_owned` row points at a master that may not be installed at the deployment where the starter is the entry point; a `contributor` row writes to a target that may not exist. For any domain-owned data_object the starter needs, `embedded_master` ships a local shell that defers to the canonical master via the demotion path when the full module installs alongside.
- `domain_modules.domain_id` is nullable for starters with no obvious primary host (persona-shaped bundles like `REAL-ESTATE-AGENT` spanning CRM + CLM + light project tracking). Use `domain_module_host_domains` to list every domain whose embedded data_object a starter touches.
- Starters carry the **three baseline permissions** (`<starter_code>:read` / `:manage` / `:admin`) **plus the full re-prefixed governance of every entity they embed whose canonical realizing module is out of the deploying unit** (plan-4, §4 "State realization at deploy"): workflow gates, pattern-flag overrides (`view_all_` / `manage_all_` / `submit_`), and the matching §8.2 business rules. A hiring starter embedding `job_offers` without `ATS-OFFERS` emits and mints `hiring-starter:approve_offer` and `hiring-starter:view_all_offers`, not a dangling `ats-offers:approve_offer`. Governance follows the entity, not the role (an embedded entity standalone is the local master and is governed in full). All of it is DERIVED by the emitter and materialized by the deployer; no loader authors permission rows. (This supersedes the earlier "exactly three baseline permissions, no workflow gates" rule, which left embedded entities ungoverned.)
- A starter's blueprint also surfaces its embedded entities' **boundary-crossing handoffs** in §6.2 / §6.3 (events those entities publish to, or react to from, modules the starter does NOT play). A unit "plays" its own modules plus the canonical owner modules of what it embeds; handoffs internal to that played set are hidden, only the ones that cross the boundary surface. Same entity-follows-the-unit principle as the gates.
- Starters carry **exactly one `skill_type='system'` skill** (Rule #17 applies identically). Tool floor: one `query_<entity>` per embedded master plus light mutates where the workflow supports them.
- Upgrade behavior: when the tenant later installs the full module whose data_object the starter embedded, the embedded shell deterministically demotes via the existing `embedded_master`-with-canonical-master rule. No tenant-side data migration. Starter permissions stick around after upgrade (provisional, revisit after first real starter ships); tenant manages skill cleanup.

The prior editorial `domain_starter_modules` junction (one recommended-install ordered list per domain) was retired. It was misshapen: it recommended **full modules** as the entry point, which still meant installing N full modules with all their lifecycle / permission / skill surface, no "lite" path for a small org. First-class starter modules close that gap.

---

## 7. Module-authoring soft rules

- Default to 1:1 capability-to-module; bundle when capabilities are sub-features of the same workflow; never split a capability into multiple modules without a concrete standalone deployability case. Speculative splits dilute SEO; empty landing pages are worse than no landing pages.
- Modules with zero `domain_module_capabilities` rows are a Phase-A gap (M4 in the checklist) — either add the missing capability, or document why the module intentionally has no market-analysis surface.
- Default to `interaction_level='secondary'` for roles touching a module; reserve `primary` for the role's core workflow. Over-tagging `primary` breaks the role-union on-ramp.

---

## 8. Anti-patterns

- ❌ Adding a `domain_module_dependencies` table or any DAG-shaped relationship between modules. The data shape (`domain_module_data_objects.role`) IS the dependency.
- ❌ Hand-editing `domain_data_objects` for a domain that has modules. It's a derived rollup once modules exist — edit `domain_module_data_objects` instead.
- ❌ Cloning a cross-cutting module per host (e.g. `ITSM-KNOWLEDGE` + `CSM-KNOWLEDGE` + `HRSD-KNOWLEDGE` instead of one `KNOWLEDGE-MGMT` with three `domain_module_host_domains` rows). One module row, multiple host rows.
- ❌ Domain-prefixing a permission code on a cross-cutting module (`itsm:publish_article`). The prefix is the **module's** `domain_module_code`, which is `knowledge-mgmt:publish_article` regardless of which host the deploy lives on.
- ❌ Omitting `domain_module_id` on a workflow-gate lifecycle state. NULL is only correct for states always reachable when the master is installed; module-specific states need the FK set.
- ❌ Trying to author a stored permission bundle for a persona. There is no `role_permissions` for `domain_roles` (Plan 3); the bundle is DERIVED (emitter §9) from `role_modules` reach + `process_raci` responsibility. Author reach + RACI, not a permission list.
