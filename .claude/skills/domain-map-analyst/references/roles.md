# Personas, RACI, and responsibilities (long-form rules)

Two authored layers, one derived output:

- **`domain_roles`** is the catalog-owned home for **operational personas**: job-shaped workflows that span modules. A Recruiter touches 6 ATS modules; a Service Desk Agent touches 4+ ITSM modules.
- **`process_raci`** is the catalog-owned home for **responsibility**: who is Responsible / Accountable / Consulted / Informed for each process. Its actor is polymorphic: a persona OR an agent skill.
- A persona's permission **bundle** is NOT stored. It is DERIVED (emitter §9) from the persona's `role_modules` reach + its `process_raci` gates + the entity-type write-tier policy, and emitted into the blueprint. You author reach and responsibility; the bundle falls out.

As of Plan 3 (2026-06-02) this replaces the `_core` `roles` / `role_permissions` / `permission_hierarchy` layer, which was deleted (it had rotted: bundles referenced dead permission names). **No catalog loader writes to the `_core` RBAC tables.** Schemas live in [module-shape.md § Role layer](module-shape.md#role-layer). The Phase E checks in [SKILL.md](../SKILL.md) are the review band.

---

## 1. What a persona IS, and isn't

- **A persona is a user job-shaped workflow that spans modules**, stored as a `domain_roles` row. "Recruiter" works across the ATS module set; "Service Desk Agent" across the ITSM set; "Hiring Manager" across ATS modules AND parts of HCM.
- A persona is **NOT** a marketing description, a job title (HR taxonomy), or a vendor role mapping.
- A persona is **NOT a single-module permission tier.** If it only touches one module, it's just `<module>:admin` / `:manage` / `:read`, not a `domain_roles` row (see the 2-module floor).
- A persona is also a **RACI actor**: it can be assigned Responsible / Accountable / Consulted / Informed on a process via `process_raci.actor_role_id`. The other actor kind is an agent skill (`actor_skill_id`).

---

## 2. Hard invariants

### 2-module floor

Every `domain_roles` persona MUST have ≥2 `role_modules` entries. A single-module persona is a permission tier on that module, not a persona. Caught by the review band (E2).

### Flat personas, no composition

- No `parent_role_id`. No persona composition or DAGs.
- Manager-of-IC distinction is expressed by upgrading the derived permission tier (`:manage` to `:admin`), NOT by chaining personas.
- Inheritance lives at the **permission** layer in the DERIVED hierarchy the emitter computes (`<module>:admin ⊃ :manage ⊃ :read`); personas declare reach + responsibility and the derivation does the rest.

### Function-scoped naming

`role_code` format:
- **Function-scoped:** `<FUNCTION-CODE>-<ROLE-NAME>` where `FUNCTION-CODE` is the most-specific `business_functions` row. `RECRUITING-RECRUITER`, `IT-SERVICE-DESK-AGENT`, `FINANCE-AP-SPECIALIST`.
- **Cross-functional:** no prefix. `HIRING-MANAGER`, `EXECUTIVE-SPONSOR`.

NULL `business_function_id` carries the cross-functional meaning; absence of prefix is the visual signal. Domain prefixes (`ATS-RECRUITER`) are an **anti-pattern**: personas are function-scoped, not domain-scoped. A Recruiter belongs to Recruiting (the function), not to ATS (a domain the function uses).

> No `slug` and no `valid_role_slug` constraint. `domain_roles` is a plain catalog entity keyed by `role_code`; the kebab-vs-snake slug rule was a `_core` `roles` artifact and no longer applies.

---

## 3. `role_modules` and `interaction_level` (the REACH layer)

`role_modules` is the FK from a persona to the modules it touches. Columns: `role_id` (to `domain_roles`), `domain_module_id`, `interaction_level`, `notes` (no `record_status`).

### `interaction_level` enum

Two values only: `primary` / `secondary`. No `read_only`: a read-only touch is captured implicitly by the derived bundle holding only `:read` for that module.

- **`primary`**: part of the persona's core workflow. The role-driven on-ramp ("which modules does a Recruiter use?") filters to `primary`.
- **`secondary`**: touched but not central. Default to `secondary` when unsure; over-tagging `primary` breaks the role-union on-ramp.

---

## 4. The permission bundle is DERIVED, not stored (store-vs-derive)

A persona does **not** carry a stored `role_permissions` bundle. The emitter (§9) computes the bundle from three inputs:

1. **Reach** (`role_modules`) gives a baseline tier per module. The baseline follows the entity-type write-tier policy (`deriveWriteTier`): `:read` everywhere, `:manage` for operational masters, `:admin` when the module has a catalog-tier entity.
2. **Responsibility** (`process_raci`) gives workflow gates. A Responsible/Accountable assignment on a process grants that process's gates (the lifecycle states with `process_id = P`, via `data_object_lifecycle_states.process_id`).
3. **Tier policy** gives the hierarchy (`admin ⊃ manage ⊃ read`, plus each gate/override under `admin`).

This is why storing the bundle is forbidden: the old `_core` `role_permissions` rows rotted because they were a frozen snapshot that drifted from the modules' real gates. The derived bundle is always current by construction. The deployer provisions tenant roles + grants from the emitted bundle; the catalog stores none of it.

**What you author:** reach (`role_modules`) and responsibility (`process_raci`). **What you never author:** a permission list. If you want a persona to hold `<module>:approve_offer`, add the `process_raci` Responsible row for the approval process and wire the gate's lifecycle state to that process (`process_id`); the emitter grants it.

---

## 5. `process_raci` (the RESPONSIBILITY layer)

Each row assigns ONE actor ONE RACI letter on ONE process. The actor is polymorphic and exactly one of `actor_role_id` (a persona) / `actor_skill_id` (an agent skill) is set, enforced by the hard `exactly_one_actor` `validation_rules` entry (a `BEFORE INSERT/UPDATE` trigger; neither/both raises a `check_violation`).

### The four letters and how they realize (no new permission tier)

- **R (responsible).** *persona*: grant the process's gates + the gated entities' write tier. *skill*: require/emit `process_tools` (or, for a domain skill, `domain_module_tools`) coverage of the process's mutating ops (the AI-native case, R = agent).
- **A (accountable).** *persona*: an approval gate. *skill*: an autonomous-action note (rare; usually A stays human even when R is an agent).
- **C (consulted).** a consultation lifecycle state when input is required (`consultation_blocking = true`), else a read grant.
- **I (informed).** No derived grant or notification wiring today: the catalog has no `webhook_receiver` entity and `trigger_events` carry no actor FK, so an Informed assignment cannot resolve to a notification side effect. It is a recorded responsibility fact, the `process_raci` I row itself, which surfaces in the per-function RACI reveal (B9e) but produces no permission or notification grant.

### The process-to-permission edge

A Responsible/Accountable assignment resolves to concrete gates through `data_object_lifecycle_states.process_id` (which gate realizes process P). This is a SECOND, distinct edge from `process_raci.process_id` (which RACI row is about process P). Authoring a persona's responsibility therefore has two parts: the `process_raci` row AND populating `process_id` on the process's gated lifecycle transitions. A `process_raci` R/A row whose process has no `process_id`-wired gate derives no grant (a review-band finding).

### Skill actors are deferred

`actor_skill_id` is schema-ready now; populate skill actors when the process-skills layer lands. Author persona actors today.

---

## 6. Cross-functional vs cross-domain (different concepts)

- **Cross-functional** = `domain_roles.business_function_id IS NULL` (explicit, e.g. Hiring Manager, who spans Recruiting + Engineering + sometimes Finance).
- **Cross-domain** = `role_modules` spans ≥2 `domain_modules.domain_id` values. Not stored; aggregate at query time.

A persona can be cross-functional AND cross-domain (Hiring Manager), function-scoped but cross-domain (Service Desk Agent: function = IT, domains = ITSM and ITAM), or function-scoped and single-domain (Recruiter: function = Recruiting, domain = ATS).

---

## 7. Discovering personas (function-anchored)

Personas are function-scoped, so DISCOVERY is anchored to the function, not to a single domain. The per-domain Phase E coverage check is the VERIFIER ("does this domain have a persona touching it?"), NOT the discoverer. A purely per-domain prompt reliably finds "who works in ATS?" (Recruiter) but does NOT reliably surface "who operates across the ATS-to-HCM boundary?" The procedure closes that gap:

1. **Function-anchored.** For each `business_functions` row, author its personas; their `role_modules` reach spans whatever domains `business_function_domains` links the function to (owner / contributor / consumer). A function-scoped persona's cross-domain reach falls out naturally: Recruiting owns ATS and consumes HCM, so `RECRUITING-RECRUITER` reaches both. When a domain's Phase E runs, iterate that domain's owner/contributor/consumer functions and author each one's personas that touch the domain (not just the owning function's).

2. **Seam-driven for cross-functional personas.** A cross-functional persona (NULL `business_function_id`, e.g. Hiring Manager) has no home function, so function iteration alone misses it. Discover these at the cross-domain SEAMS, the `handoffs` graph: a handoff between two domains is where a cross-seam actor operates (the ATS-to-HCM handoff implies a Hiring Manager who lives across it). Walk the domain's inbound and outbound handoffs and ask "who operates across this seam?"

3. **Dedup by `role_code` (accretion, not duplication).** `role_code` is the natural key. A cross-domain persona is authored ONCE; each per-domain pass that touches it ADDS a `role_modules` row (read-before-create on `role_code`), so its full reach ACCRETES across passes. Domain B's pass never re-creates a persona authored under domain A; it extends the reach.

4. **Catalog-wide backstop.** A persona that no single function or domain surfaces (genuinely emergent across the catalog) is caught by a periodic catalog-wide cross-functional reconciliation, part of the standing process. The per-domain coverage check cannot find what no domain pass authored, so this backstop is the safety net for the cross-functional long tail.

---

## 8. Reach reconciliation (replaces the old two-path check)

There is no longer a stored bundle to disagree with reach, so the old "Path A vs Path B" equivalence is gone. The review-band reconciliation is now **reach vs DERIVED permissions**:

- Every module in a persona's `role_modules` reach must receive a derived tier in the emitted bundle (no silent dropped reach).
- Every gate the persona is granted must trace to either a reach row (baseline tier) or a `process_raci` R/A row whose process has a `process_id`-wired gate (no grant from nowhere).
- A `role_modules` row on a module the persona has no derivable interaction with, or a `process_raci` R/A row whose process has no wired gate, is the new drift signal.

Because the bundle is recomputed every emit, the old "a new module gate silently misses existing role bundles" drift (former E6) cannot occur: new gates flow into the derived bundle automatically for any persona Responsible for the owning process.

---

## 9. Anti-patterns

- ❌ Domain-prefixing role codes (`ATS-RECRUITER`). Personas are function-scoped (`RECRUITING-RECRUITER`).
- ❌ A `domain_roles` persona with one `role_modules` entry. That's a permission tier, not a persona.
- ❌ A `parent_role_id` chain to express manager-of-IC. Upgrade the derived tier (`:manage` to `:admin`) via reach/responsibility instead.
- ❌ Trying to author a stored permission bundle for a persona. There is no `role_permissions` for `domain_roles`; author reach + RACI and let the emitter derive the bundle.
- ❌ Writing to the `_core` `roles` / `role_permissions` / `permission_hierarchy` / `permissions` tables from a catalog loader. Those are platform RBAC for the catalog app; catalog personas live in `domain_roles` / `process_raci`.
- ❌ Discovering personas one domain at a time only. A cross-domain or cross-functional persona is missed by a per-domain prompt; discover function-anchored and seam-driven (§7), dedup by `role_code`.
- ❌ Tagging every `role_modules` row `interaction_level='primary'`. Reserve `primary` for the core workflow; default `secondary`.
- ❌ Confusing cross-functional (NULL `business_function_id`) with cross-domain (multiple `domain_id` across `role_modules`). They're orthogonal.
- ❌ A `process_raci` Responsible/Accountable row whose process has no `process_id`-wired lifecycle gate. It derives no grant; either wire the gate or use a different letter.
