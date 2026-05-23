# Roles — long-form rules

Roles are the first-class home for **cross-module permission bundling** — what per-module `:admin` / `:manage` / `:read` rollups can't express. A Recruiter touches 6 ATS modules; a Service Desk Agent touches 4+ ITSM modules. The catalog captures both the role and its access bundle.

Schemas live in [module-shape.md § Role layer](module-shape.md#role-layer). The Phase E checks in [SKILL.md](../SKILL.md#e-roles--permission-bundling-universal-under-rule-14) are the audit surface. This document covers the rules and patterns.

---

## 1. What a role IS, and isn't

- **A role is a user persona / job-shaped workflow that spans modules.** "Recruiter" works across the ATS module set; "Service Desk Agent" works across the ITSM module set; "Hiring Manager" works across ATS modules AND parts of HCM.
- A role is **NOT a persona** (loose marketing description), **NOT a job title** (HR taxonomy), and **NOT a vendor role mapping** (which permissions does ServiceNow's "ITIL" template grant — out of scope).
- A role is **NOT a single-module permission tier.** If a "role" only touches one module, it's just `<module>:admin` or `<module>:manage` — not a row in `roles`. (See 2-module floor below.)

---

## 2. Hard invariants (loader-enforced)

### 2-module floor

Every `roles` row MUST have ≥2 `role_modules` entries. Single-module personas are a permission tier on that module, not a role. The loader pre-flights this; manual edits that violate the floor are caught by E2.

### Flat roles, no composition

- No `parent_role_id`.
- No role composition or DAGs.
- Manager-of-IC distinction is expressed by upgrading the permission tier (`:manage` → `:admin`), NOT by chaining roles.

Inheritance lives at the **permission** layer via Semantius's existing `permission_hierarchy` table (e.g. `<module>:admin` ⊃ `<module>:manage` ⊃ `<module>:read`). Roles bundle tier-level grants directly and let the hierarchy do the rest.

### Function-scoped naming

`role_code` format:
- **Function-scoped:** `<FUNCTION-CODE>-<ROLE-NAME>` where `FUNCTION-CODE` is the most-specific `business_functions` row.
  - `RECRUITING-RECRUITER`, `IT-SERVICE-DESK-AGENT`, `FINANCE-AP-SPECIALIST`.
- **Cross-functional:** no prefix at all. `HIRING-MANAGER`, `EXECUTIVE-SPONSOR`.

NULL `business_function_id` carries the cross-functional meaning; absence of prefix is the visual signal. Domain prefixes (`ATS-RECRUITER`, `ITSM-AGENT`) are an **anti-pattern** — roles are function-scoped, not domain-scoped. A Recruiter belongs to Recruiting (the function), not to ATS (a domain the function happens to use).

### `roles.slug` is snake_case

The built-in `valid_role_slug` check constraint rejects kebab. Slugify the kebab-case `role_code` to lowercase + underscores: `RECRUITING-RECRUITER` → `recruiting_recruiter`.

---

## 3. `role_modules` and `interaction_level`

`role_modules` is the catalog's contribution — the FK from a role to the modules it touches.

Columns: `role_id`, `domain_module_id`, `interaction_level`, `notes`, `record_status`.

### `interaction_level` enum

Two values only: `primary` / `secondary`. No `read_only` — captured implicitly by the role's bundle holding only `:read` for that module.

- **`primary`** — this is part of the role's core workflow. The role-driven on-ramp ("which modules does a Recruiter use?") filters to `primary` rows.
- **`secondary`** — touched but not central. A Recruiter `secondary`-touches HCM for downstream visibility; that's not part of authoring a hire.

Default to `secondary` when unsure. Over-tagging `primary` breaks the role-union on-ramp.

---

## 4. `role_permissions` — bundling tier-level grants

Each role declares its complete bundle directly via `role_permissions`. No role-level inheritance, no role composition.

### Tier-level preference

Prefer tier-level grants (`<module>:admin`, `:manage`, `:read`) over enumerating every workflow gate. `permission_hierarchy` (Semantius built-in) auto-expands at request time:

- `<module>:admin` includes every workflow gate and pattern-flag override in that module.
- `<module>:manage` includes baseline writes but not destructive operations (admin-tier).
- `<module>:read` is the read-only ceiling.

Bundles stay short by design — typical bundle has 4–8 rows.

### When to list specific gates

Enumerate a specific workflow gate when an IC-tier role needs it but isn't promoted to `:admin`. Example: Recruiter has `:manage` on most ATS modules but needs `ats-offers:approve_offer` explicitly because offer approval is a gate that even `:manage` doesn't auto-include.

### Sample bundle — ATS Recruiter

| Permission | Role-side rationale |
|---|---|
| `ats-candidate-crm:manage` | Authors candidate records |
| `ats-recruitment-pipeline:manage` | Drives the requisition-to-offer pipeline |
| `ats-interviews:manage` | Schedules + records interview workflow |
| `ats-offers:manage` | Drafts and sends offers |
| `ats-offers:approve_offer` | Explicit gate the `:manage` tier doesn't auto-include |
| `ats-talent-pools:read` | Visibility into sourcing pools |
| `ats-referrals:read` | Reads referrer attribution |
| `ats-background-checks:read` | Sees vendor results without re-running them |

Eight rows; covers six modules at the right tier each. The bundle is shorter than enumerating every workflow gate would be, and new gates added to those modules automatically flow to `:manage`/`:admin` tier holders.

---

## 5. Cross-functional vs cross-domain — they are different

- **Cross-functional** = `roles.business_function_id IS NULL` (explicit, e.g. Hiring Manager — touches Recruiting + Engineering + sometimes Finance).
- **Cross-domain** = `role_modules` spans ≥2 `domain_modules.domain_id` values. Not stored; aggregate at query time.

A role can be cross-functional AND cross-domain (Hiring Manager), function-scoped but cross-domain (Service Desk Agent touches ITSM + ITAM modules — function=IT, domains=ITSM and ITAM), function-scoped and single-domain (Recruiter touches only ATS modules — function=Recruiting, domain=ATS).

---

## 6. Two equivalent paths from `roles` to `domains` — they must agree

- **Path A:** `roles → role_modules → domain_modules.domain_id` (carries `interaction_level`).
- **Path B:** `roles → role_permissions → permissions.domain_module_id → domain_modules.domain_id` (carries actual granted access).

Path A is authoritative; Path B is the drift cross-check. Divergence means one of:

- A `role_modules` entry exists without a matching `role_permissions` row on that module — the role declares a touch it can't actually perform.
- A `role_permissions` row references a module not in `role_modules` — the bundle grants access the role wasn't supposed to have.

Both are bugs. E5 in the checklist enforces agreement.

---

## 7. Permission-bundle drift over time

When a module adds a new `workflow-gate` permission (a new lifecycle state with `requires_permission=true`), every role touching that module potentially needs the gate. The audit (E6) surfaces drift as a warning, not a load-blocker:

> "Every permission generated by a module is either in at least one role's bundle, OR explicitly marked admin-only via `permission_hierarchy` edges to `<module>:admin`."

Drift resolution: either add the gate to relevant role bundles, OR promote roles that should be admin-tier on this module from `:manage` to `:admin` (which auto-includes the gate via `permission_hierarchy`).

---

## 8. Anti-patterns

- ❌ Domain-prefixing role codes (`ATS-RECRUITER`, `ITSM-AGENT`). Roles are function-scoped — `RECRUITING-RECRUITER`, `IT-SERVICE-DESK-AGENT`.
- ❌ Authoring a "role" with one `role_modules` entry. That's a permission tier, not a role.
- ❌ Creating a `parent_role_id` chain to express manager-of-IC. Upgrade the permission tier (`:manage` → `:admin`) instead.
- ❌ Enumerating every workflow gate in a role's bundle. Use tier-level grants and let `permission_hierarchy` expand them.
- ❌ Tagging every `role_modules` row as `interaction_level='primary'`. Reserve `primary` for the role's core workflow; default `secondary` for incidental touches.
- ❌ Confusing cross-functional with cross-domain. NULL `business_function_id` = cross-functional. Multiple distinct `domain_id` values across `role_modules` = cross-domain. They're orthogonal.
- ❌ Using kebab-case for `roles.slug`. The built-in check constraint will reject it — slugify to snake_case.
