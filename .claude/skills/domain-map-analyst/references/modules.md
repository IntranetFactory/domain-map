# Modules — long-form rules

Modules are the **autonomous deployment unit** between capabilities (market-analysis layer) and live Semantius semantic models. Schemas live in [module-shape.md § Module concept](module-shape.md#module-concept); the rules and patterns that make modules work live here.

The mandatory existence of `domain_modules` for every domain is Rule #14 in [SKILL.md](../SKILL.md#14-every-domain-has-at-least-one-domain_modules-row-domains-with-3-capabilities-need-2-modules--a-starter-junction). This document covers everything beyond the existence rule.

---

## 1. The three layers — keep them distinct

| Layer | What it is | Buyer-facing phrasing |
|---|---|---|
| **Domain** | Point-solution market (CRM, ITSM, ATS). The SEO / market-analysis surface. Anchor for vendors, capabilities, RACI, regulations. | "The Applicant Tracking market" |
| **Capability** | Market-analysis noun ("Lead Management", "Background Checks", "Workforce Scheduling"). What an org *can do*. Comparable across vendors. | "Background-check capability" |
| **Module** | Autonomous deployment unit. Owns data_objects, lifecycle states, edges, tools. Installable standalone; composes with other modules via embedded_master demotion. | "Install the Background Checks module" |

Most rows correspond ~1:1 across layers, but the concepts are separable. Some capabilities become modules; some get absorbed into a larger module; cross-cutting capabilities become modules installable across multiple domains.

**Naming:** the catalog tables use `domain_modules`, `domain_module_capabilities`, `domain_module_data_objects`, `domain_module_host_domains`, `domain_starter_modules` — the `domain_` prefix avoids collision with the Semantius platform's own `domain_modules` (the entity-grouping concept every Semantius entity belongs to). FK columns are `domain_module_id`. In prose, the concept is still "a module" — only the table/column identifiers carry the prefix.

**What's explicitly out:**
- No packages / tiers / SKUs (no "Starter / Pro / Enterprise" gates). Every module is independently deployable and structurally equal.
- No dependency tree. Composability is expressed via `domain_module_data_objects.role` and the existing embedded_master demotion.
- No `is_starter` boolean on modules. A module might be a recommended starting point for one domain but a pure add-on for another — captured per-domain by `domain_starter_modules`.

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

### `permissions` table

Two columns added to the Semantius built-in (per [module-shape.md § Role layer](module-shape.md#role-layer)):

- `domain_module_id` (reference, nullable) — set on catalog-derived permissions; NULL on built-in Semantius permissions.
- `tier` (enum) — `baseline-read` / `baseline-manage` / `baseline-admin` / `workflow-gate` / `override`.

### `permission_hierarchy` (Semantius built-in)

Per-module hierarchy edges with `origin='model'`:
- `<module>:admin` ⊃ `<module>:manage` ⊃ `<module>:read`
- `<module>:admin` ⊃ every workflow gate and pattern-flag override in that module

`<module>:admin` ⊃ `<module>:manage` ⊃ `<module>:read` is the standard chain; auto-expansion happens at request time. Roles bundle tier-level grants (`<module>:admin`) and `permission_hierarchy` does the rest.

### Override collisions

When two lifecycle states across different data_objects use the same `permission_verb_override` (e.g. `candidates.hired` and `job_applications.hired` both override to `hire_candidate`), the derived permission rows legitimately collapse to one permission fired by two transitions. The deployer treats them as one.

### State pruning at deploy

`data_object_lifecycle_states.domain_module_id` is nullable. NULL = state always reachable when master is installed. Non-NULL = state realized only when that specific module is deployed. The deployer prunes states whose `domain_module_id` references an un-installed module. Transitive embedded_master pull-in is sufficient — no `requires_modules` column on lifecycle states today.

---

## 5. Embedded-shell contracts live at deploy time, not in the catalog

Field-level shell contracts (which columns each embedded_master rendition includes) are NOT a catalog concern. The deployer reads each installed module's own entity definition (the runtime `fields` table) and resolves shell composition at deploy time:

- A module's local entity definition declares its own shell — the columns it stores when it locally masters another domain's data_object.
- When multiple modules embedded_master the same data_object without the canonical master installed, the deployer unions their shells into one shared local-master table.
- When the canonical master IS installed, all embedded_master shells defer to it and read through the canonical entity.

The catalog (`domain_data_objects`, `domain_module_data_objects`) records *that* a module embedded_masters a data_object and *what role* it plays — it does not duplicate the field-level shape.

> **History.** Prior to 2026-05-23 the catalog carried a `data_objects.minimum_embedded_shape` markdown column intended to declare embed-time required fields. That column was dropped after the field-level contract was correctly relocated to the deployer; the original authoring notes for the 9 data_objects that had shapes are preserved as archived annotations in `data_objects.notes`.

---

## 6. Starter-kit junction — editorial, not structural

`domain_starter_modules` (`domain_id`, `domain_module_id`, `position`, `notes`) is editorial recommendation:

- **One** recommended set per domain. No "SMB starter" / "Enterprise starter" sub-variants — re-introduces tier complexity.
- Not a gate, not a billing-package — pure recommendation. A buyer can ignore it and pick any subset of the domain's modules.
- `position` orders the recommended install sequence; `notes` is editorial copy emitted verbatim by the fact sheet generator.
- Domains with <3 capabilities have **zero** rows (per Rule #14) — recommending "where to start" is meaningless when there's only one module.
- Domains with ≥3 capabilities MUST have ≥1 row (M3 in the per-domain checklist).

Worked example — ATS has 2 starter rows:

| `position` | `domain_module_code` | `notes` |
|---|---|---|
| 1 | `ATS-CANDIDATE-CRM` | The entity backbone — start here. Provides candidates, prospects, sourcing. |
| 2 | `ATS-RECRUITMENT-PIPELINE` | Adds requisitions, postings, applications, the pipeline-stage workflow. With these two installed you have a minimum recognizable ATS. |

---

## 7. Module-authoring soft rules

- Default to 1:1 capability-to-module; bundle when capabilities are sub-features of the same workflow; never split a capability into multiple modules without a concrete standalone deployability case. Speculative splits dilute SEO; empty landing pages are worse than no landing pages.
- Modules with zero `domain_module_capabilities` rows are a Phase-A gap (M4 in the checklist) — either add the missing capability, or document why the module intentionally has no market-analysis surface.
- Default to `interaction_level='secondary'` for roles touching a module; reserve `primary` for the role's core workflow. Over-tagging `primary` breaks the role-union on-ramp.

---

## 8. Anti-patterns

- ❌ Adding a `domain_module_dependencies` table or any DAG-shaped relationship between modules. The data shape (`domain_module_data_objects.role`) IS the dependency.
- ❌ Hand-editing `domain_data_objects` for a domain that has modules. It's a derived rollup once modules exist — edit `domain_module_data_objects` instead.
- ❌ Cloning a cross-cutting module per host (e.g. `ITSM-KNOWLEDGE` + `CSM-KNOWLEDGE` + `HRSD-KNOWLEDGE` instead of one `KNOWLEDGE-MGMT` with three `domain_module_host_domains` rows). Per-host variants live on `skill_tools.notes` or `domain_module_host_domains.notes`, never duplicated module rows.
- ❌ Domain-prefixing a permission code on a cross-cutting module (`itsm:publish_article`). The prefix is the **module's** `domain_module_code`, which is `knowledge-mgmt:publish_article` regardless of which host the deploy lives on.
- ❌ Omitting `domain_module_id` on a workflow-gate lifecycle state. NULL is only correct for states always reachable when the master is installed; module-specific states need the FK set.
- ❌ Listing every workflow gate in a role's `role_permissions` bundle. Use the tier-level grant + `permission_hierarchy` auto-expansion.
