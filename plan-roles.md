# plan-roles.md — Roles as cross-module permission containers

> **Status:** design intent (draft). **Blocked on [`plan-modules.md`](plan-modules.md) schema landing.** Do not load until `domain_modules`, `domain_module_capabilities`, `domain_module_data_objects`, `domain_module_host_domains`, and `domain_starter_modules` exist in the live catalog with at least the ATS modular load complete.
>
> **Naming note (2026-05-23):** the catalog table is `domain_modules` (not `modules`) — `modules` collides with the Semantius platform's own `modules` table. FK columns referencing it are `domain_module_id`. The catalog *concept* is still "a module" in prose; only the table/column identifiers carry the prefix. See [`plan-modules.md` §4.1](plan-modules.md).
>
> **Scope:** introduce a **`roles` catalog** that captures the user personas (Recruiter, Hiring Manager, IT Service Desk Agent, RevOps Analyst) whose daily workflows span multiple modules. Roles become the first-class home for **cross-module permission bundling** — the thing today's per-module `:admin` / `:manage` / `:read` rollups can't express. Role skills (`skill_type='role'`) become first-class with `skills.role_id` pointing at a role catalog row.
>
> **Triggering observation:** post-modularization, every recurring user-role workflow in the catalog spans 3-5 modules (a Recruiter touches Candidate CRM + Pipeline + Interviews + Offers; an IT admin touches ITSM-Incident + ITSM-Change + CMDB). Per-module permissions are correct atomically but produce no usable bundle for the persona. A Recruiter being provisioned with the right access requires manually picking permissions across N modules — error-prone, non-discoverable, and impossible to surface as a deployment recommendation.

---

## 1. Terminology

| Concept | What it is | Existing? |
|---|---|---|
| **Role** | A user persona / job-shaped role whose daily workflow spans modules. Tied to a business function. `RECRUITING-RECRUITER`, `IT-SERVICE-DESK-AGENT`, `PROCUREMENT-BUYER`. | No |
| **Role skill** | An agent skill (`skill_type='role'`) that wraps a role's workflow — the tools and operations a Recruiter needs to do recruiter work, spanning their N modules. Points at a role via `skills.role_id`. | Type exists; column doesn't |
| **Role-permission bundle** | The set of permissions a role needs across the modules they touch. Captured via `role_permissions` junction. Replaces ad-hoc per-module `:admin` / `:manage` rollups for cross-module personas. | No |

### Naming choice: `role` (not "persona" or "job title")

- **Role** is the right word for the org-side abstraction — same word HR, IT, and the catalog already use.
- **Persona** is marketing-flavored; reads as buyer persona, not user persona.
- **Job title** is too specific (Senior Recruiter vs Recruiter Lead vs Recruiting Operations Manager all do the same role with different titles).

### `role_code` naming convention

Roles are **function-scoped**, not domain-scoped — a Recruiter belongs to Recruiting, not to ATS. The naming convention reflects this and parallels the cross-cutting-module rule in [`plan-modules.md` §4.5](plan-modules.md):

- **Function-scoped roles:** `<FUNCTION-CODE>-<ROLE-NAME>`. FUNCTION-CODE comes from the most specific `business_functions` row (`RECRUITING-`, `IT-`, `FINANCE-`, `SALES-`, `PROCUREMENT-`, etc.). Example: `RECRUITING-RECRUITER`, `IT-SERVICE-DESK-AGENT`, `FINANCE-AP-SPECIALIST`.
- **Cross-functional roles:** no prefix at all. `HIRING-MANAGER`, `EXECUTIVE-SPONSOR` (when added). The NULL `business_function_id` on the row carries the cross-functional meaning; absence of prefix is the visual signal.
- **Anti-pattern:** domain prefixes (`RECRUITING-RECRUITER`, `ITSM-AGENT`). Domain-prefixing conflates the wrong axis — if Recruiting starts touching another domain alongside ATS, the same role would force "RECRUITING-RECRUITER" / "TALENT-INTEL-RECRUITER" duplication. Role-modules junction captures the per-role module footprint; the role itself stays function-scoped.

### What's explicitly out

- **Vendor-specific role mappings.** "Workday Recruiter" vs "Greenhouse Recruiter" are vendor SKU concepts; the catalog records the abstract Recruiter role. Vendor-specific permission mappings could land later in a separate `solution_role_mappings` table if SEO surface justifies it.
- **Per-tenant role customization.** Customers will fork the catalog roles to make their own; the catalog only ships the reference shapes.
- **Org-chart hierarchy (manager-of relationships).** Roles describe what users do, not who reports to whom. Hierarchical reporting belongs to the deployed semantic model's HCM, not the catalog.

---

## 2. Schema changes

All additive. No existing rows touched.

### 2.1 New tables

| Entity | Holds | Natural key |
|---|---|---|
| `roles` | `role_code`, `role_name`, `business_function_id` **nullable** FK (NULL = cross-functional role, e.g., Hiring Manager — see §7 resolved Q2), `description`, `record_status` | `role_code` |
| `role_modules` | `role_id`, `domain_module_id`, `interaction_level` enum (`primary` / `secondary` — two values, see §7 resolved Q1), `notes` text — which modules does this role touch, and how heavily | composite |
| `role_permissions` | `role_id`, `permission_id` FK (existing), `notes` text — which permissions does this role need | composite |

**Validation constraint:** every `roles` row MUST have ≥2 `role_modules` entries (see §7 resolved Q5). Loader enforces; single-module personas don't qualify for the catalog — they're modeled at the module level as permission tiers.

### 2.2 New columns on existing tables

| Table | Column | Type | Why |
|---|---|---|---|
| `skills` | `role_id` | nullable FK → `roles` | Required when `skill_type='role'`, NULL otherwise. Links a role skill to the role it wraps. **Role skills themselves are deferred to Phase 2** (see §6.3) — the column lands now so the FK shape is stable; rows referencing it land in Phase 2. |

### 2.3 No new tables — explicit

- **No role-level inheritance (`parent_role_id`, role composition, role DAGs).** Inheritance lives at the **permission** layer, not the role layer — Semantius's existing `permission_hierarchies` table already captures it (`:admin` includes `:manage` includes `:read`, and `:admin` includes all module lifecycle gates per the existing fact-sheet convention). The manager-of-IC distinction is expressed by upgrading the role's tier-level permission on the module (`:manage` → `:admin`), not by chaining roles. Roles stay flat to match Semantius's runtime role model 1:1 — no flattening step in the deployer, no chain walking, no implicit blast radius.
- **No `role_dependencies`.** Roles don't depend on each other in a deployment sense — a Recruiter doesn't require a Hiring Manager to be provisioned first. Reporting relationships live in HCM, not the catalog.
- **No `role_capabilities`.** Capabilities are market-analysis nouns; roles touch modules (the deployment unit) and permissions (the access unit). Going through the capability layer would add an indirection that adds no value.
- **No `role_tiers`.** Same rationale as `plan-modules.md` §1 — no SKU/tier gates. A junior recruiter and a senior recruiter use the same role; access scope differences are captured per-tenant at deploy time, not in the catalog.

---

## 3. The role catalog vocabulary

Roles are anchored to `business_functions` (existing 20-function spine + sub-functions). One role per recurring user-role workflow in a function. Estimated catalog scale: **~80-150 roles across all business functions** once fully loaded. Per-function:

| Business function | Typical roles (function-scoped) |
|---|---|
| Sales | Account Executive, SDR, Sales Manager, Sales Operations Analyst |
| Marketing | Campaign Manager, Content Marketer, Marketing Operations Analyst |
| Customer Success | CSM, Renewals Specialist, Support Manager |
| Recruiting (HR sub-function) | Recruiter, Sourcer, Recruiting Coordinator, Recruiting Manager |
| L&D (HR sub-function) | L&D Specialist, Compliance Training Coordinator |
| IT Operations | Service Desk Agent, Service Desk Manager, Change Manager, CMDB Analyst |
| Security | SOC Analyst, IAM Administrator, Vulnerability Manager |
| Finance / Accounting | Accountant, AP Specialist, AR Specialist, Controller |
| FP&A | Financial Analyst, Budget Owner |
| Procurement | Buyer, Supplier Manager, Procurement Manager |
| Legal | Legal Operations, Contract Manager, Privacy Officer |
| Engineering | SRE, Platform Engineer, Tech Lead |
| ESG | Sustainability Reporter, Carbon Accountant |
| **— (cross-functional)** | **Hiring Manager**, Executive Sponsor, Budget Owner (when generalized beyond FP&A) |

Loaded over time per [plan-modules.md](plan-modules.md) §6.1 rollout order. Per the §1 naming rule, function-scoped roles use `<FUNCTION-CODE>-<ROLE>` and cross-functional roles drop the prefix.

---

## 4. Worked example: ATS roles

Four roles for the ATS domain. Each maps to multiple modules and bundles cross-module permissions.

### 4.1 Role catalog rows

| `role_code` | `role_name` | `business_function_id` | Description |
|---|---|---|---|
| `RECRUITING-RECRUITER` | Recruiter | Recruiting | Owns candidate sourcing, screening, and pipeline progression for assigned requisitions. Coordinates interviews and extends offers. Permission bundle uses `:manage` tier on most modules + specific lifecycle gates the IC workflow needs. |
| `HIRING-MANAGER` | Hiring Manager | **NULL** (cross-functional) | Owns the requisition, sets job criteria, evaluates candidates, makes final hiring decisions. Every line manager in every function does this role — NULL `business_function_id` per §7 resolved Q2 carries that meaning. |
| `RECRUITING-COORDINATOR` | Recruiting Coordinator | Recruiting | Owns logistics — interview scheduling, candidate communications, scorecard collection, background-check kickoff. |
| `RECRUITING-SOURCER` | Sourcer | Recruiting | Owns talent-pool management, proactive candidate outreach, and pipeline seeding ahead of formal req-opening. |
| `RECRUITING-MANAGER` | Recruiting Manager | Recruiting | Manages a recruiter team. **No role-level inheritance from Recruiter** (per §7 resolved Q3) — instead, Recruiting Manager uses `:admin` permission tier across the modules they oversee, and Semantius's existing `permission_hierarchies` auto-includes the underlying `:manage` / `:read` / lifecycle-gate permissions. When the underlying module adds a new gate, `:admin` picks it up automatically; IC Recruiter gets a deliberate decision via the §8 drift audit. |

### 4.2 `role_modules` (which modules each role touches)

`interaction_level` is two-value (`primary` / `secondary`) per §7 resolved Q1. "Read-only" interactions are captured implicitly by the role's permission bundle containing only `:read` for that module, not a separate axis. Roles are flat (per §7 resolved Q3) — `RECRUITING-MANAGER` declares its own `role_modules` rows directly; no inheritance.

| Role | Module | Interaction |
|---|---|---|
| `RECRUITING-RECRUITER` | `ATS-CANDIDATE-CRM` | primary |
| `RECRUITING-RECRUITER` | `ATS-RECRUITMENT-PIPELINE` | primary |
| `RECRUITING-RECRUITER` | `ATS-OFFERS` | primary |
| `RECRUITING-RECRUITER` | `ATS-INTERVIEWS` | secondary (coordinator drives logistics; recruiter participates) |
| `RECRUITING-RECRUITER` | `ATS-BACKGROUND-CHECKS` | secondary (review only via `:read` in bundle) |
| `RECRUITING-RECRUITER` | `ATS-REFERRALS` | secondary |
| `HIRING-MANAGER` | `ATS-RECRUITMENT-PIPELINE` | primary (owns requisitions) |
| `HIRING-MANAGER` | `ATS-INTERVIEWS` | primary (conducts interviews, submits scorecards) |
| `HIRING-MANAGER` | `ATS-OFFERS` | secondary (approves) |
| `HIRING-MANAGER` | `ATS-CANDIDATE-CRM` | secondary (`:read` only in bundle) |
| `RECRUITING-COORDINATOR` | `ATS-INTERVIEWS` | primary |
| `RECRUITING-COORDINATOR` | `ATS-BACKGROUND-CHECKS` | primary |
| `RECRUITING-COORDINATOR` | `ATS-RECRUITMENT-PIPELINE` | secondary |
| `RECRUITING-COORDINATOR` | `ATS-CANDIDATE-CRM` | secondary |
| `RECRUITING-SOURCER` | `ATS-CANDIDATE-CRM` | primary |
| `RECRUITING-SOURCER` | `ATS-TALENT-POOLS` | primary |
| `RECRUITING-SOURCER` | `ATS-REFERRALS` | secondary |
| `RECRUITING-SOURCER` | `ATS-RECRUITMENT-PIPELINE` | secondary (`:read` only in bundle) |
| `RECRUITING-MANAGER` | `ATS-CANDIDATE-CRM` | primary |
| `RECRUITING-MANAGER` | `ATS-RECRUITMENT-PIPELINE` | primary |
| `RECRUITING-MANAGER` | `ATS-OFFERS` | primary |
| `RECRUITING-MANAGER` | `ATS-INTERVIEWS` | secondary |
| `RECRUITING-MANAGER` | `ATS-BACKGROUND-CHECKS` | secondary |
| `RECRUITING-MANAGER` | `ATS-REFERRALS` | secondary |

### 4.3 `role_permissions` (the cross-module bundle the deployer provisions)

Permission codes follow the `<domain_module_code>:<verb>` convention ratified in [`plan-modules.md` §4.6](plan-modules.md). **Each role declares its complete bundle directly** — no inheritance, no resolution at deploy time. Roles are short (5-10 rows each) because they declare tier-level permissions (`:read`, `:manage`, `:admin`) and Semantius's existing `permission_hierarchies` table auto-expands them at request time (e.g., `:admin` ⊃ `:manage` ⊃ `:read`; `:admin` ⊃ all lifecycle gates per the existing fact-sheet convention).

`RECRUITING-RECRUITER` bundle (8 rows):

| Permission | Module | Notes |
|---|---|---|
| `ats-candidate-crm:manage` | `ATS-CANDIDATE-CRM` | tier — covers create/update/delete on candidates and sources |
| `ats-recruitment-pipeline:manage` | `ATS-RECRUITMENT-PIPELINE` | tier — covers reqs/postings/applications CRUD |
| `ats-recruitment-pipeline:approve_requisition` | `ATS-RECRUITMENT-PIPELINE` | specific lifecycle gate (not auto-included in `:manage`) |
| `ats-interviews:read` | `ATS-INTERVIEWS` | tier — read-only because coordinator drives scheduling |
| `ats-offers:manage` | `ATS-OFFERS` | tier |
| `ats-offers:approve` | `ATS-OFFERS` | specific lifecycle gate the IC needs |
| `ats-background-checks:read` | `ATS-BACKGROUND-CHECKS` | tier — review only |
| `ats-referrals:read` | `ATS-REFERRALS` | tier — sees referred candidates entering pipeline |

`RECRUITING-MANAGER` bundle (6 rows):

| Permission | Module | Notes |
|---|---|---|
| `ats-candidate-crm:admin` | `ATS-CANDIDATE-CRM` | tier — auto-includes `:manage` + `:read` + cross-recruiter visibility via permission hierarchy |
| `ats-recruitment-pipeline:admin` | `ATS-RECRUITMENT-PIPELINE` | tier — auto-includes all module gates (approve_requisition, reassign_requisition when added, etc.) |
| `ats-offers:admin` | `ATS-OFFERS` | tier — auto-includes approve, approve_override, rescind, all current and future gates |
| `ats-interviews:read` | `ATS-INTERVIEWS` | tier — manager sees but doesn't drive interview workflow |
| `ats-background-checks:read` | `ATS-BACKGROUND-CHECKS` | tier — review only |
| `ats-referrals:read` | `ATS-REFERRALS` | tier |

**Why this is short and stable:** when `ATS-OFFERS` adds a new lifecycle gate (say, `ats-offers:rescind_after_acceptance`), the Manager bundle automatically picks it up via the `:admin` permission hierarchy — no `role_permissions` update needed. The IC Recruiter bundle gets a deliberate review via the §8 drift audit: should this new gate be added explicitly to the Recruiter role, or is it manager-only? The right place for that decision.

The deployer reads `role_permissions` for the role and provisions the user in one shot — no manual cross-module permission selection, no chain resolution. The bundle replaces what's today an undocumented mental model in every customer's head.

### 4.4 Role skills (deferred to Phase 2)

Role skills (`skill_type='role'` with `skills.role_id` set) are **not authored in Phase 1A or 1B**. They depend on per-module system skills being stable across multiple domains, force the coverage-aggregation question (whether role-skill coverage is the SEO landing-page number or the deployment-readiness number), and add work whose payoff is speculative — none are loaded today, no agent flow consumes them.

Phase 1A's value is the **permission bundle** the deployer consumes (§4.3). That alone justifies the schema. Role skills land in Phase 2 (§6.3) when patterns are templated across 3+ domains and the coverage-aggregation question can be answered empirically rather than by guesswork.

When they do land, each role skill will wrap one role's workflow with the tools aggregated from the modules in `role_modules`, filtered by the role's actual permission bundle. The `skills.role_id` column exists from Phase 1A so the FK shape is stable; rows referencing it land in Phase 2.

---

## 5. The triangle: modules / skills / permissions / roles

Roles bridge three previously-disconnected catalog axes. Note the orientation: **permissions are derived from lifecycle states and pattern flags on data_objects**, not from modules directly — modules are the *namespace* in which derivation happens, not the source of the permissions themselves.

```
       [data_objects]
            │
   ┌────────┴───────────────┐
   │                        │
 lifecycle states     pattern flags
 (housed in module      (housed on
  via state.domain_module_id)   data_object)
   │                        │
   └────────┬───────────────┘
            │
            ▼
       [permissions]
       <domain_module_code>:<verb>
            │
            │ (per plan-modules.md §4.6 naming convention)
            ▼
      [role_permissions]
            ▲
            │
         [roles] ─── role_modules ───▶ [modules]
            ▲
            │
       skills.role_id
            │
       (role skills, deferred to Phase 2)
```

- A **module** is the namespace — its `domain_module_code` prefixes every permission generated by lifecycle states and pattern flags within its data_objects.
- A **role** declares which modules it touches (`role_modules`) and which permissions across those modules it needs (`role_permissions`).
- A **role skill** (deferred to Phase 2) will wrap the role's workflow with the right tool set, derivable from the per-module system skills.

The deployer at install time can answer:

- "User X is being onboarded as a Recruiter. Provision them with the `RECRUITING-RECRUITER` role's permission bundle across the 6 ATS modules currently installed."
- "Customer Y is choosing modules to install. They mentioned the Recruiter role — recommend installing the 4 primary modules for that role (`ATS-CANDIDATE-CRM`, `ATS-RECRUITMENT-PIPELINE`, `ATS-OFFERS`, plus `ATS-INTERVIEWS` if they want recruiter-driven scheduling)."

Today neither query is possible without inventing the answer manually each time.

### 5.1 Common query patterns

Three queries fall out of the `role_modules` junction. The third is the genuinely interesting one — the role-driven on-ramp.

| Query | Shape | Use case |
|---|---|---|
| **Modules per role** | `role_modules WHERE role_id = X` | "Which modules does the Recruiter touch?" — populates the per-role view in fact sheets, deployer's "what does this role need access to" answer. |
| **Roles per module** | `role_modules WHERE domain_module_id = X` | "Who needs `ATS-OFFERS` access?" — provisioning audits, "if we deprecate this module, who's affected." |
| **Minimum module set for a role-set** | `SELECT DISTINCT domain_module_id FROM role_modules WHERE role_id IN (...) AND interaction_level = 'primary'` | "Customer wants Recruiter + Hiring Manager + Coordinator roles → install these N modules." The deployer recommendation that complements the editorial `domain_starter_modules`. |

### 5.2 Two complementary on-ramps

The role-union query (5.1 row 3) is one of **two complementary on-ramps** into the catalog. Neither makes the other redundant:

| On-ramp | Source | Buyer state | Answer |
|---|---|---|---|
| **Editorial starter** | `domain_starter_modules` (per [`plan-modules.md` §3](plan-modules.md)) | "I'm new to ATS, where do I begin?" | Editorial recommendation per domain: install these N modules first. |
| **Role-driven** | `role_modules` filtered to `interaction_level='primary'` | "I know I need Recruiter + Hiring Manager + Coordinator." | Union of `primary` modules across the named roles → minimum module set that supports them all. |

Both belong in the catalog because they answer different buyer states. A first-time buyer browsing "ATS" lands on the editorial starter. A buyer who arrived with a clear team-shape gets the role-union. They converge for common cases and diverge at the edges — the editorial starter is conservative; the role-union is bounded only by what the named roles actually need.

---

## 6. Migration approach

Additive. Three phases. **Each phase serializes within a domain: modules first, then roles.** Per the architect review, parallel-track authoring is brittle — `role_permissions` rows reference per-module permission codes (`<domain_module_code>:<verb>`) that aren't locked until the modular load completes, and if a verb gate renames mid-flight, in-flight role bundles break silently. Each pair within a domain is fast (modules ~half a day, roles ~30 min); the dependency is clean.

### 6.1 Phase 1A — Schema + ATS (sequential, after ATS modular load completes)

1. Apply schema changes (§2) — 3 new tables + 1 new column. Lands at the same time as the modular schema in [`plan-modules.md` §4](plan-modules.md) (schema is decoupled from authoring; the `roles` table can sit empty until ATS modular load is done).
2. **Wait for ATS modular load to complete and verify** — all 8 ATS module permission codes are locked (verified via `/permissions?permission_code=like.ats-*`).
3. Load the 5 ATS roles (`RECRUITING-RECRUITER`, `HIRING-MANAGER`, `RECRUITING-COORDINATOR`, `RECRUITING-SOURCER`, `RECRUITING-MANAGER`). The Hiring Manager row has `business_function_id=NULL` per §7 Q2 resolution. Roles are flat (no `parent_role_id`) per §7 Q3 resolution — Manager/IC differences are expressed via permission tier on the same modules. **Validation:** each role has ≥2 `role_modules` entries per §7 Q5 (the 2-module floor).
4. Load `role_modules` rows (~26 rows — `RECRUITING-MANAGER` declares its own rows since there's no inheritance) with deliberate per-row `interaction_level` review per §4.2. Only `primary` / `secondary` — no `read_only` (the read-only-ness is captured by the role's permission bundle holding only `:read` for that module).
5. Load `role_permissions` rows (~26 rows across all 5 roles — each role declares its complete bundle directly; tier-level permissions per §4.3 keep the row count low). **Validation:** every referenced `permission_code` exists in the catalog post-modular-load (the wait gate at step 2 makes this safe).
6. Update the ATS fact sheet generator to render a "Roles" section per domain.
7. Update [`semantic-model-deployer` SKILL](../../C:\dev\semantius-cli\skills\use-semantius) to read `role_permissions` at user-provisioning time and provision the user with those permissions directly. No role-side resolution needed — Semantius's existing `permission_hierarchies` table handles tier expansion at request time (`:admin` auto-grants underlying `:manage` / `:read` / lifecycle-gate permissions).

**Role skills are NOT part of Phase 1A.** Deferred to Phase 2 per §4.4.

### 6.2 Phase 1B — ITSM (sequential with ITSM modular load)

Same modules-first-then-roles pattern. ITSM is the cross-cutting-module stress test for both plans. Author 5-6 ITSM roles (Service Desk Agent, Service Desk Manager, Change Manager, CMDB Analyst, plus 1-2 more) to validate the cross-cutting-module interaction: does an `IT-SERVICE-DESK-AGENT` role need permissions on the `KNOWLEDGE-MGMT` cross-cutting module installed inside ITSM? The answer drives the §5 triangle's edge between roles and cross-cutting modules. Also exercises the permission-tier pattern on a second domain: `IT-SERVICE-DESK-MANAGER` uses `:admin` tier on managed modules and Semantius's `permission_hierarchies` auto-includes the underlying gates.

### 6.3 Phase 2 — Broader rollout + role skills land

After top-5 domains are modularized AND ATS + ITSM role patterns are validated. Two streams in this phase:

**Per-domain role rollout:** for each newly-modularized domain (paired, not batched, modules-first-then-roles):

1. Identify 3-5 canonical roles for the domain's business function.
2. Map `role_modules` (which modules each role touches). Verify 2-module floor.
3. Derive `role_permissions` (which permissions each role needs). Use tier-level permissions (`:read` / `:manage` / `:admin`) wherever possible; Manager-of-IC distinction is upgrading the tier, not chaining roles.

Estimate: ~30-60 minutes per domain. By this phase the patterns are templated and per-domain authoring is mechanical.

**Role-skill authoring (catalog-wide):** after 3+ domains have stable per-module system skills AND patterns from the per-domain rollout have surfaced the coverage-aggregation question (§7 resolved Q4), author role skills for the loaded roles. Skills wrap each role's workflow with tools derived from the modules in `role_modules`, filtered by the role's permission bundle. Skills land in batches per role-cluster, not per-domain (a Recruiter skill in ATS and a Recruiting-Manager skill that extends it form one cluster).

---

## 7. Decisions made (architect review 2026-05-23)

Originally five open questions; all but one resolved during the architect review pass. The remaining one (Q4 role-skill coverage aggregation) is deferred to Phase 2 when role skills actually land.

1. **`role_modules.interaction_level` cardinality** → **two values (`primary` / `secondary`).** `read_only` was structurally redundant — "every permission for this module in the role's bundle is at the `:read` tier" carries the same meaning without a separate axis. The two-value enum keeps the role-union on-ramp clean.
2. **Cross-functional roles** → **`business_function_id` is nullable; NULL means cross-functional.** Hiring Manager is the canonical case (every line manager in every function does this role) and loads with NULL. No `is_cross_functional` boolean — NULL carries the meaning, no extra column needed.
3. **Permission inheritance / role composition** → **flat roles; inheritance lives at the permission layer via Semantius's existing `permission_hierarchies`.** Originally landed as single-parent role inheritance (`parent_role_id`) but reversed during second-round review: Semantius's runtime roles are flat, and the existing `permission_hierarchies` table already captures `:admin ⊃ :manage ⊃ :read` and `:admin ⊃ all module lifecycle gates`. Manager-of-IC distinction is expressed by upgrading the permission tier on the role's bundle (`:manage` → `:admin`), not by chaining roles. Why this is materially easier than role inheritance: catalog and runtime stay 1:1 (no flattening step in the deployer), inspection is trivial (a role's permissions are exactly what's stored), new lifecycle gates auto-flow to `:admin`-tier roles with explicit-decision opportunity for IC roles via the §8 drift audit, no chain walking / cycle detection / DAG ambiguity. Multi-parent role inheritance, single-parent role inheritance, and role composition all explicitly out for the same reason: the work is already done at the permission layer.
4. **Role-skill coverage % vs module coverage %** → **deferred to Phase 2** when role skills land. A role skill aggregates tools from N module skills; coverage % could be computed at the role-skill level OR rolled up to the affected modules' rollup views. Two slightly-different aggregation rules with different SEO implications (one is the role landing-page number, the other is the deployment-readiness number). Decide empirically after the first few role skills land in Phase 2 rather than picking a rule speculatively now.
5. **Does a role need to touch ≥1 module to qualify?** → **No, ≥2.** A single-module persona is just a permission tier on that module, modeled at the module level. The 2-module floor is the structural justification for roles existing as a separate concept. Loader-enforced; rows that don't meet the floor are rejected at load time.

---

## 8. Deferred TODOs

| TODO | When |
|---|---|
| Vendor-specific role mappings (`solution_role_mappings`). | After 5+ domains have roles loaded and a real cross-vendor comparison need surfaces. |
| Role-based fact sheet pages (`role-fact-sheets/<ROLE-CODE>.md`). | If SEO data shows search intent around role-based queries ("recruiter daily workflows", "service desk agent permissions"). |
| Permission-inheritance for hierarchical roles (Recruiter ⊂ Recruiting Manager). | **Never** — §7 Q3 resolved against role-level inheritance; the existing `permission_hierarchies` mechanism (tier-level: `:admin` ⊃ `:manage` ⊃ `:read`) does this job at the permission layer. |
| Tenant-specific role customization mechanism. | Deferred to platform layer, not catalog layer. The catalog ships reference shapes; tenants fork them. |
| **Permission-bundle drift audit.** When a module adds a new lifecycle gate, every role that touches the module potentially needs the new permission. Per-domain audit check: "every permission generated by a module is either in at least one role's bundle, OR explicitly marked admin-only." Surface drift as a fact-sheet warning, not a load-blocker. | After Phase 1B (ITSM) lands and the first new-permission-on-existing-module case appears. |

---

## 9. Next concrete step

All steps below are **additive** and reversible by deleting rows. Destructive operations are consolidated into §10 (currently empty — this plan introduces no destructive work).

1. **Wait for [`plan-modules.md`](plan-modules.md) schema landing.** Phase 1A schema lands in parallel with the modules schema per §6.1; Phase 1A ATS role authoring runs alongside the ATS modular load.
2. Get sign-off on this plan.
3. Apply schema changes (§2) — 3 new tables + 1 new column. Single migration script, paired with the modules schema migration.
4. **Wait for ATS modular load to complete** per §6.1 step 2 (serialized — role authoring depends on per-module permission codes being locked).
5. Hand-author the 5 ATS roles (§4) as flat rows; `RECRUITING-MANAGER` declares its own bundle using `:admin` tier on managed modules per §4.3. **Deliberate per-row review of `interaction_level`** per §6.1 step 4.
6. Update [`scripts/emit_fact_sheet.ts`](scripts/emit_fact_sheet.ts) to render a "Roles" section per domain.
7. Update [`semantic-model-deployer` SKILL](../../C:\dev\semantius-cli\skills\use-semantius) to consume `role_permissions` at user-provisioning time and provision the user with those permissions directly. No role-side resolution needed — Semantius's existing `permission_hierarchies` table handles tier expansion at request time.
8. Phase 1B (ITSM) per §6.2 — same serialized pattern.
9. Phase 2 — per-domain role rollout + role-skill authoring per §6.3.

---

## 10. Destructive operations

⚠️ **None currently.** All work in this plan is additive — new tables, new column, new rows. Existing `skill_type='role'` rows (zero loaded today per [`plan-modules.md` §5.4](plan-modules.md)) stay unchanged; future role skills land as new rows with the new `role_id` FK set.

If future scope adds destructive work (e.g., consolidating duplicate role rows across domains, renaming `roles.role_code` conventions catalog-wide, deprecating `business_function_id` for a different parent shape), it lands here as a final batch after the additive phase is validated. Capture as numbered items (R1, R2, …) with rollback notes per the [`plan-modules.md` §12](plan-modules.md) pattern.

---

## 11. Progress checklist

Track execution here. Check items off as they land. Per-domain rollout items live in their own subsection so individual domains can be tracked.

### Sign-off and schema

- [ ] §9 step 2 — Plan signed off
- [ ] §9 step 3 — Schema migration applied (3 tables + 1 column); paired with `plan-modules.md` §11 step 2
- [ ] §9 step 3 — Schema verified via PostgREST: `/roles`, `/role_modules`, `/role_permissions` return empty arrays (not 404); `/skills?select=role_id` shows the column present

### Phase 1A — ATS (sequential, after ATS modular load completes)

- [ ] §6.1 step 2 — ATS modular load complete; all 8 module permission codes verified in catalog (`/permissions?permission_code=like.ats-*` returns expected set)
- [ ] §6.1 step 3 — 5 ATS roles loaded (`RECRUITING-RECRUITER`, `HIRING-MANAGER` with `business_function_id=NULL`, `RECRUITING-COORDINATOR`, `RECRUITING-SOURCER`, `RECRUITING-MANAGER` — all flat, no parent_role_id)
- [ ] §6.1 step 3 — 2-module floor enforced — every role has ≥2 `role_modules` entries
- [ ] §6.1 step 4 — `role_modules` rows loaded (~26 rows; `RECRUITING-MANAGER` declares its own rows directly, no inheritance) with deliberate per-row `interaction_level` review against §4.2 reference table; only `primary` / `secondary` used
- [ ] §6.1 step 5 — `role_permissions` rows loaded (~26 rows across all 5 roles; each role declares its complete bundle using tier-level permissions per §4.3)
- [ ] §6.1 step 5 — Every referenced `permission_code` exists in catalog (validation guard against the per-module permission codes being locked)
- [ ] §6.1 step 6 — `emit_fact_sheet.ts` renders "Roles" section per domain
- [ ] §6.1 step 7 — `semantic-model-deployer` SKILL reads `role_permissions` at provisioning time and provisions directly (no role-side resolution — Semantius's existing `permission_hierarchies` handles tier expansion at request time)
- [ ] End-to-end test: provision a Recruiting Manager tenant; verify they have effective access to all `ats-offers:approve` / `ats-offers:rescind` lifecycle gates via the `ats-offers:admin` tier in their bundle (without those gates being individually listed in `role_permissions`)
- [ ] Architect review of ATS roles in re-emitted fact sheet
- [ ] Sanity check: role-union query for `[RECRUITING-RECRUITER, HIRING-MANAGER, RECRUITING-COORDINATOR]` returns expected minimum module set
- [ ] **Role skills NOT loaded in Phase 1A** (deferred to Phase 2 per §4.4)

### Phase 1B — ITSM (sequential, after ITSM modular load completes)

- [ ] §6.2 — ITSM modular load complete; module permission codes verified
- [ ] §6.2 — 5-6 ITSM roles loaded (`IT-SERVICE-DESK-AGENT`, `IT-SERVICE-DESK-MANAGER`, `IT-CHANGE-MANAGER`, `IT-CMDB-ANALYST`, + 1-2 more — all flat, Manager/IC distinction via permission tier); 2-module floor enforced
- [ ] §6.2 — Cross-cutting-module role-permission interaction validated (does `IT-SERVICE-DESK-AGENT` need permissions on `KNOWLEDGE-MGMT`?)
- [ ] §6.2 — Triangle (§5) verified end-to-end on ITSM
- [ ] §6.2 — Permission-tier pattern validated on a second domain (`IT-SERVICE-DESK-MANAGER` uses `:admin` on managed modules; verify auto-inclusion of underlying lifecycle gates via Semantius's `permission_hierarchies`)
- [ ] Architect review of ITSM roles

### Phase 2 — Broader rollout (per-domain) + role skills land

- [ ] Per-domain role rollout, sequential after each domain's modular load — track per domain:
  - [ ] CRM
  - [ ] HCM
  - [ ] CMDB
  - [ ] LMS
  - [ ] CPQ
  - [ ] CSM
  - [ ] (continue list per [`plan-modules.md` §13](plan-modules.md) rollout order)
- [ ] After 3+ domains roles loaded — §7 Q4 (role-skill coverage % aggregation) empirically decided
- [ ] Role skills authored for ATS roles (5 skills with `skills.role_id` set, `skill_tools` aggregated from per-module system skills, filtered by role's permission bundle)
- [ ] Role skills authored for ITSM roles
- [ ] Per-cluster role skill authoring continues across other modularized domains

### Phase 2 cross-cutting follow-ups

- [ ] §8 TODO — Per-domain permission-bundle drift audit landed for "every module-generated permission is in at least one role's bundle"

### Destructive batch (§10)

- [ ] (None planned. Add items here if destructive scope is added later.)
