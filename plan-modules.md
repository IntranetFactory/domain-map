# plan-modules.md — Modules as the deployment unit

> **Starter-kit section superseded (2026-05-26).** Section 3 ("Starter junction") and every other passage in this plan that references the `domain_starter_modules` editorial junction is **obsolete**. The junction was retired and the catalog now treats starter kits as first-class deployable units (`module_kind='starter'` discriminator on `domain_modules`). The current contract lives in [plan-starter-kits.md](plan-starter-kits.md) and [SKILL.md Rule #19](.claude/skills/domain-map-analyst/SKILL.md). Read the rest of this plan as historical record of the modular pass; do not load anything against the retired junction.

> **Naming note (2026-05-23):** the catalog table is `domain_modules` (and junctions `domain_module_capabilities`, `domain_module_data_objects`, `domain_module_host_domains`). The bare table name `domain_modules` collides with the Semantius platform's own `domain_modules` table (the entity-grouping concept every Semantius entity belongs to), so the catalog uses the `domain_` prefix — same shape as `domain_data_objects`. FK columns referencing the catalog modules table are `domain_module_id`. The catalog *concept* is still called "a module" in prose; only the table/column identifiers carry the prefix. See §4.1 for the schema shapes.

> **Status:** design intent (draft). Operational status (what's done, what's next) lives in [plan-master-tasks.md](plan-master-tasks.md) once execution starts.
>
> **Scope:** introduce **modules** as the autonomous, independently-deployable unit between capabilities (market-analysis layer) and the live Semantius semantic models. Each module is self-contained: it owns its own data_objects, lifecycle states, edges, and tool surface, and uses the existing master / embedded_master mechanism to compose with other modules at deploy time. The domain layer stays exactly as today — it remains the market-analysis surface (vendors, RACI, SEO).
>
> **Triggering observation:** the catalog currently models capabilities as flat market-analysis nouns (ITSM has 20, ATS has 6). At deploy time everything in a domain is implicitly required, so an Airtable-grad SMB picking up an "ATS" semantic model gets all 22 data_objects whether they need them or not. Real ATS vendors don't ship this way: Greenhouse CRM is sold separately from Greenhouse Recruiting; Workday Recruiting bundles talent pools, BambooHR ATS doesn't. The deployment unit needs to be smaller and composable than the domain, and it needs to compose via existing semantics — not a new dependency tree.

---

## 1. Terminology

Three layers, distinct concerns. Capability ≠ module. Most rows correspond 1:1 across layers, but the concepts are separable.

| Layer | What it is | Existing? | Buyer-facing phrasing |
|---|---|---|---|
| **Domain** | Point-solution market (CRM, ITSM, ATS). Top of the catalog, anchor for vendors, capabilities, RACI, regulations. The SEO/market-analysis surface. | Yes (`domains`) | "The Applicant Tracking market" |
| **Capability** | Market-analysis noun ("Lead Management", "Background Checks", "Workforce Scheduling"). What an org *can do*. Comparable across vendors. | Yes (`capabilities`) | "Background-check capability" |
| **Module** | Autonomous deployment unit. Owns its own data_objects, lifecycle states, edges, tools. Installable standalone; composes with other modules via embedded_master demotion. **New.** | No | "Install the Background Checks module" |

### Naming chosen: `module`

Reasons:
- Semantius itself uses "module" as its top-level deployment concept. A catalog module becomes a Semantius module at deploy time — terminology is consistent end-to-end.
- "Capability" is the right word for market analysis ("the org has the capability to X"), the wrong word for deployment ("install the X capability?" reads as abstract).
- "Feature" implies sub-component (too small). "Package" overloads with billing-package and re-introduces tier baggage we're deliberately avoiding. "App" is Salesforce-flavored.

`capability` stays as a market-analysis term. `module` is the deployment unit. Some capabilities become modules; some get absorbed into a larger module; cross-cutting capabilities become modules installable across multiple domains.

### What's explicitly out

- **No packages / tiers / SKUs.** No "Starter / Pro / Enterprise" gates. Every module is independently deployable and structurally equal. None is "core" or "required first."
- **No dependency tree.** Composability is expressed via `domain_module_data_objects.role` and the existing embedded_master demotion. The data shape IS the dependency.
- **No `is_starter` boolean on modules.** A module might be a recommended starting point for one domain but a pure add-on for another — the relationship is per-domain, not per-module. Captured by the `domain_starter_modules` junction below.

### Pre-modular cleanups (block the modular pass)

Two existing-catalog issues that get amplified across N modules unless fixed in the source data first:

- **Lifecycle-gate permission naming.** Today's gates use state-as-noun phrasing (`ats:submitted_interview_scorecard`, `ats:completed_consider_background_check`). Should be verb-form (`ats:submit_scorecard`, `ats:flag_for_review`). Fix in the §7 emitter and backfill existing rows before the modular pass — otherwise every per-module permission table reproduces the inconsistency.
- **Capability layer review trigger.** Three layers (domain / capability / module) is hard to defend long-term. Pre-commit to a review point: after 20 domains are modularized, evaluate whether `capabilities` has demonstrated use beyond market-analysis tagging. If not, collapse it into a `domain_module_tags` table or merge into `domain_modules` outright. Gated by §12 D3 (destructive batch only fires when the review triggers it).

---

## 2. The composability model — no dependency tree

The user's insight is that the existing master / embedded_master mechanism already handles independence between modules. We do **not** need a `domain_module_dependencies` table or a DAG.

**How it works:**

- Each module owns its data_objects with the same five-role vocabulary used on domains today: `master`, `embedded_master`, `contributor`, `consumer`, `derived`.
- When a module embedded_masters a data_object, the deployer/architect logic that already exists handles two cases:
  - **Master module deployed**: the canonical master is the source of truth; the embedded_master row references it (the existing demotion path).
  - **Master module not deployed**: the embedded_master becomes the local master in the consuming module's own deployment.
- A module is therefore always self-contained — it ships every data_object it touches, either as canonical master or as embedded master that gets demoted automatically if the canonical version lands later.
- **No declared dependencies needed.** A module's data_object footprint *is* its composition declaration. Two modules sharing a `candidates` data_object compose automatically; either can be deployed alone.

**Worked example: Talent Pools as a standalone module**

- `ATS-TALENT-POOLS` module masters `talent_pools`, embedded_masters `candidates`.
- Deployed alone: the `candidates` embedded_master demotes to local master automatically — the deployer materializes a thin candidate shell so talent pools have records to group.
- Deployed alongside `ATS-CANDIDATE-CRM` (which canonically masters `candidates`): the deployer detects the canonical master, demotes the embedded_master row to a reference. Talent pool records reference the shared candidates.
- This is the same demotion path the catalog already documents for cross-domain handoffs (e.g., ATS embedded_masters `hcm_positions`).

This is the whole reason no dependency tree is needed: the data shape *is* the dependency, expressed in a vocabulary the deployer already understands.

**Third case — multiple modules embedded_master the same data_object without the canonical master deployed:** the deployer materializes **one shared local-master table** whose required-field set is the **union of all installed modules' `minimum_embedded_shape` contracts** (§4.5). Example: a tenant installs `ATS-TALENT-POOLS` + `ATS-REFERRALS` together without `ATS-CANDIDATE-CRM` — both modules embedded_master `candidates`; the deployer creates one `candidates` table whose schema is the union of the minimum-shape fields each module requires. When `ATS-CANDIDATE-CRM` lands later, the canonical master's full required-field set supersets the union, so the migration is additive — no shape conflict.

---

## 3. Getting started — the catalog on-ramp (not a deployment helper)

A buyer who searches "applicant tracking system" lands on the ATS domain page knowing zero about modules. The catalog needs to tell them: *ATS is a market of ~8 modules; here's where to begin*. This is **catalog / SEO / education**, not a deployment gate or a tier.

The mechanism is a thin junction that says, per domain, *"if you don't know where to begin, install these modules in this order."* It's editorial, not structural — a buyer can ignore it and pick any subset of the domain's modules. After the starter, buyers add modules a-la-carte.

| Concept | Decision |
|---|---|
| Multiple starter sets per domain (e.g., "SMB starter" + "Enterprise starter") | **No** — re-introduces tier complexity. One recommended set per domain. |
| Starter as a gate ("you must install these first") | **No** — pure recommendation, no enforcement. |
| Starter as a billing-package | **No** — modules are the only thing buyers install. |
| Starter as a documented entry point with position/notes | **Yes** — surfaces in the domain fact sheet as a "Getting started" section. |

**Stored as a junction:** `domain_starter_modules` — `(domain_id, domain_module_id, position int, notes text)`. Semantius lacks array-of-FK columns; junction is the only shape.

Domains without an obvious starter (cross-cutting, leadership-tier, niche) have zero rows — the fact sheet simply omits the "Getting started" section.

For ATS the junction holds 2 rows:

| `position` | `domain_module_id` | `notes` |
|---|---|---|
| 1 | `ATS-CANDIDATE-CRM` | The entity backbone — start here. Provides candidates, prospects, sourcing. |
| 2 | `ATS-RECRUITMENT-PIPELINE` | Adds requisitions, postings, applications, the pipeline-stage workflow. With these two installed you have a minimum recognizable ATS. |

This is editorial copy stored on the junction so the fact sheet generator emits it verbatim. Re-readable in the catalog UI, queryable by agents, surfaces in domain page SEO as a numbered call-to-action.

### 3.1 Two complementary on-ramps

The starter junction is one of **two complementary on-ramps** into the catalog. Neither makes the other redundant:

| On-ramp | Source | Buyer state | Answer |
|---|---|---|---|
| **Editorial starter** | `domain_starter_modules` (this section) | "I'm new to ATS, where do I begin?" | Editorial recommendation per domain: install these N modules first. |
| **Role-driven** | `role_modules` filtered to `interaction_level='primary'` (per [`plan-roles.md`](plan-roles.md) §5) | "I know I need Recruiter + Hiring Manager + Coordinator roles." | Union of `primary` modules across the named roles → the minimum module set that supports them all. |

Both belong in the catalog because they answer different buyer states. A first-time buyer browsing "ATS" lands on the editorial starter. A buyer who arrived with a clear team-shape already gets the role-union. The two paths converge on roughly the same module sets for common cases (the ATS editorial starter `[CANDIDATE-CRM, RECRUITMENT-PIPELINE]` is a subset of the Recruiter + Hiring Manager + Coordinator role-union) but diverge at the edges — the editorial starter is conservative, the role-union is bounded only by what the named roles actually need.

---

## 4. Schema changes

All additive; no migrations needed. Apply via `semantius` field-creation tooling, same pattern as [plan-generate-blueprints.md § 3](plan-generate-blueprints.md).

### 4.1 New tables

| Entity | Holds | Natural key |
|---|---|---|
| `domain_modules` | `domain_module_code`, `domain_module_name`, `domain_id` (parent / primary home — **nullable** for truly cross-cutting modules with no obvious home domain like `APPROVAL-WORKFLOW`), `description`, `record_status`. **No `min_org_size` / `cost_band`** — market metadata stays at the domain level (see §9 resolved Q1). | `domain_module_code` |
| `domain_module_capabilities` | `domain_module_id`, `capability_id` — many-to-many. A module realizes one or more capabilities; a cross-cutting capability can be realized by modules in multiple domains. | composite |
| `domain_module_data_objects` | `domain_module_id`, `data_object_id`, `role` (5-value enum, same as `domain_data_objects.role`), `necessity` (2-value: `required` / `optional` — meaningful only on `consumer` / `embedded_master` rows that gracefully degrade; `master` rows are always required by definition), `notes` | composite |
| `domain_module_host_domains` | `domain_module_id`, `domain_id`, `notes` text — additional domains where this module is installable beyond its `domain_modules.domain_id` home. Only populated for cross-cutting modules. | composite |
| `domain_starter_modules` | `domain_id`, `domain_module_id`, `position` int, `notes` text — recommended on-ramp per domain. Editorial, not a gate. | composite |

### 4.2 New columns on existing tables

| Table | Column | Type | Why |
|---|---|---|---|
| `handoffs` | `source_domain_module_id` | nullable FK → `domain_modules` | Handoffs really live between modules; the domain pair is a rollup. Nullable for backfill. |
| `handoffs` | `target_domain_module_id` | nullable FK → `domain_modules` | Same. |
| `trigger_events` | `domain_module_id` | nullable FK → `domain_modules` | Events are published by the module that masters the data_object, not the whole domain. Nullable for backfill. |
| `skills` | `domain_module_id` | nullable FK → `domain_modules` | A `system` skill now hangs off a module, not a domain. Existing `domain_id` stays; rollup view available. |
| `skills` | `process_id` | nullable FK → `processes` | A `process` skill formally references the APQC PCF row it implements (`processes.source_framework='apqc_pcf_*'`) or the custom-process row (`source_framework='custom'`). Today this match is informal text in the discovery-query output; the FK makes it queryable. NULL on `system` and `role` skills. |
| `data_object_lifecycle_states` | `domain_module_id` | nullable FK → `domain_modules` | A state may be realized only when a specific module is installed (`job_applications.interviewing` is only reachable if `ATS-INTERVIEWS` is deployed). States from un-deployed modules pruned at deploy time. Nullable: states reachable in all deployments leave it NULL. |
| `data_objects` | `minimum_embedded_shape` | text (markdown list of field codes + brief justification per field) | The "minimum-shape contract" any module that embedded_masters this data_object must conform to. Without it, two modules deployed alone in separate tenants create divergent local-master shells that can't merge cleanly when one becomes the canonical master. Curated per shared data_object; NULL for data_objects only ever mastered by one canonical owner. |

### 4.3 No new tables — explicit

- **No `domain_module_dependencies`.** Composition is expressed via `domain_module_data_objects.role`. Embedded_master *is* the dependency.
- **No `packages` / `package_modules`.** Re-introduces tier baggage; the `domain_starter_modules` junction covers the on-ramp use case with no SKU/tier semantics.

### 4.4 Why `domain_module_data_objects.necessity` is back

The original "drop it" argument said every data_object a module touches is required by that module. That's true for `master` rows but wrong for `consumer` / `embedded_master` rows that gracefully degrade. Canonical example: `ATS-OFFERS` embedded_masters `salary_bands` for offer-guidance ranges — without COMP-MGMT deployed, the salary_bands data isn't available, but `ATS-OFFERS` still functions fine (offers go out without the guidance overlay). That's `embedded_master + optional`. The two-value enum stays narrower than the domain-layer `necessity` and only annotates the consumer/embedded_master rows where degradation is meaningful.

### 4.5 Cross-cutting modules and their host domains

A cross-cutting module (e.g., `KNOWLEDGE-MGMT`, `SLA-MGMT`, `APPROVAL-WORKFLOW`, `AI-TRIAGE`, `SELF-SERVICE-PORTAL`) can be installed on multiple domains. The catalog expresses this with two coordinated mechanisms:

- **`domain_modules.domain_id` is the module's primary home** — the standalone-product domain where the module's market analysis lives. `KNOWLEDGE-MGMT.domain_id = KMS` (Knowledge Management is a recognised standalone market). Modules with no obvious standalone-product home (`APPROVAL-WORKFLOW`, `AI-TRIAGE` — both are pure feature shapes that no one sells standalone today) have `domain_modules.domain_id = NULL`.
- **`domain_module_host_domains` lists additional installable hosts.** Cross-cutting modules add one row per additional host domain (`KNOWLEDGE-MGMT` adds rows for ITSM, CSM, HRSD, LSD; its primary home KMS is *not* duplicated in this junction). Normal non-cross-cutting modules have zero rows here.

**Querying "which modules are installable on domain X?"** is `UNION` of (`domain_modules WHERE domain_id = X`) and (`domain_modules JOIN domain_module_host_domains ON ... WHERE domain_module_host_domains.domain_id = X`). The deployer and architect both query this union.

**Convention to avoid ambiguity:** a module's relationship to a domain is **either** via `domain_modules.domain_id` (the home) **or** via a `domain_module_host_domains` row (an additional host) — never both for the same (module, domain) pair. The fact sheet emitter renders the home prominently; additional hosts get a "Also installable on" cross-link section.

### 4.6 Permission naming convention (ratified here)

Permission codes are **`<domain_module_code>:<verb>`** in lowercase-kebab. This is the contract that [`plan-roles.md`](plan-roles.md) and the deployer/architect skills depend on.

- **Baseline tiers:** `<domain_module_code>:read`, `<domain_module_code>:manage`, `<domain_module_code>:admin` (mirrors today's `<slug>:read|manage|admin` from [plan-generate-blueprints.md § 4.1](plan-generate-blueprints.md), just module-scoped instead of domain-scoped).
- **Workflow gates:** `<domain_module_code>:<verb>` or `<domain_module_code>:<verb>_<entity>` for lifecycle gates where the entity disambiguates (e.g., `ats-recruitment-pipeline:approve_requisition`, `ats-offers:approve`, `ats-candidates:hire`). Verb-form, never state-as-noun — see the §11 D2 destructive cleanup that brings existing rows into compliance.
- **Pattern-flag overrides:** `<domain_module_code>:view_all_<entity>`, `<domain_module_code>:manage_all_<entity>`, `<domain_module_code>:submit_<entity>` per the existing pattern-flag derivation rules.

Permissions are derived from `data_object_lifecycle_states` (workflow gates) and `data_objects` pattern flags (`has_personal_content`, `has_submit_lock`, `has_single_approver`) per the existing [plan-generate-blueprints.md § 8](plan-generate-blueprints.md) rules. Modules are the **namespace** in which derivation happens, not the source of the permissions themselves. The lifecycle state lives in some module (`data_object_lifecycle_states.domain_module_id`); the derived permission code uses that module's `domain_module_code` as prefix.

### 4.7 Minimum embedded-shape contract

When multiple modules embedded_master the same data_object (e.g., `candidates` is embedded by `ATS-TALENT-POOLS`, `ATS-REFERRALS`, `ATS-RECRUITMENT-PIPELINE`, `ATS-INTERVIEWS`, `ATS-OFFERS`, `ATS-BACKGROUND-CHECKS`), each deployed-alone tenant materializes its own local master shell. Without a documented minimum shape:

- Tenant A installs `ATS-TALENT-POOLS` alone → shell with `{id, name, email, tags}`.
- Tenant B installs `ATS-REFERRALS` alone → shell with `{id, name, email, referring_employee_id}`.
- Tenant A later installs `ATS-CANDIDATE-CRM` (the canonical master) → merge target schema doesn't match A's local shell. Deployer can't reconcile shape-safely.

The `data_objects.minimum_embedded_shape` column documents the field codes every embedded_master rendition must include — the GDPR-relevant subset for `candidates` (`id`, `legal_name`, `email`, `phone`, `primary_source`, `consent_status`), the application-junction subset for `job_applications`, etc. The deployer reads this at module-install time and asserts the local-master shell includes every minimum field. Modules may extend with their own fields beyond the minimum; they may not omit any.

Convention: the canonical master's required field set is a *superset* of the minimum embedded shape. The minimum is what the deployer asserts; the canonical master's full required set is what the master-deployed-elsewhere tenant gets.

Curate per shared data_object as part of each domain's modularization pass. NULL on data_objects only ever mastered by one canonical owner (no embedded_master rows anywhere in the catalog).

---

## 5. Skills in the modular world

The existing `skills` table has three `skill_type` values (`system`, `process`, `role`). Modularization changes the granularity and the semantics of each. No new skill types are needed.

### 5.1 `system` skills become per-module 1:1

Today a `system` skill mirrors one domain 1:1 with `domain_id` set. Post-modularization each *module* gets its own system skill with `domain_module_id` set (see §4.2). The 22 existing domain-level system skills (P2.5A.i + P2.5A.ii) get retired in favor of per-module ones.

Catalog impact: 22 → roughly 100+ system skills once 20 domains are modularized. Authoring cost is bounded per-domain (~5-15 minutes per domain to derive module-level tool sets from the existing domain skill).

**Why 1:1 with modules instead of one rollup per domain:**

- Coverage % (§5.6) is the killer-hypothesis test; it must compute per-module to make "deploy this module standalone" meaningful. A rollup can't say "Candidate CRM is 100% Semantius, Background Checks is 75%."
- The architect/deployer asks "what tools does *this module* need?", not "what does this whole domain need?"
- **Domain-level coverage % is not computed or rendered at all** — averaging a 100%-and-75% mix into "86%" hides the only actionable answer (which specific module is the weak point). Buyers and deployers act on per-module facts; the domain rollup destroys that signal. The per-module table IS the domain-level coverage view.

### 5.2 `process` skills wrap cross-module workflows — may be intra-domain

Today's `process` skill wraps "a cross-domain handoff cluster." Post-modularization the definition shifts: a process skill wraps **a cross-module workflow cluster**, which *may or may not* be cross-domain. Two distinct shapes both exist:

- **Cross-module within one domain:** e.g., MA "campaign launch" workflow spans `MA-CAMPAIGN-MGMT` + `MA-AUTOMATION-SETUP` + `MA-AUDIENCE`. All MA; still cross-module. Today these are not discoverable because the discovery query (in [.claude/skills/domain-map-analyst/references/discovery-query.md](.claude/skills/domain-map-analyst/references/discovery-query.md)) clusters at the domain level.
- **Cross-module and cross-domain:** the existing 3 process skills (employee-jml, opportunity-l2c, case-service). employee-jml spans HCM-WORKER-RECORD + IGA-IDENTITY + PAYROLL-EARNINGS + ONBOARDING-JOURNEY.

The discovery query gets re-run at module granularity once the substrate is in place. Same five clustering signals; the trigger-event-prefix bucket now groups module-pairs instead of domain-pairs. **No schema change to differentiate cross-domain from intra-domain process skills** — compute "cross-domain count" as a derived metric (distinct `domain_id` over the modules a process skill touches).

**Formal PCF / custom-process linkage.** The new `skills.process_id` nullable FK (§4.2) makes the existing PCF auto-matcher result (today: informal text in the discovery output) into a queryable link. Each process skill that maps to an APQC PCF row sets `process_id` to that row; custom processes (`source_framework='custom'`) get their own row authored per the existing `CUSTOM-<CLUSTER>-<NAME>` convention and the process skill points at it. Modularization will surface *more* custom processes because intra-domain cross-module clusters often don't have PCF leaves (campaign launch, major-incident swarm, dispute resolution). The PCF catalog itself doesn't change — only the discovery granularity and the linkage formality.

### 5.3 Cross-cutting modules get ONE system skill, not one per host

A cross-cutting module (`KNOWLEDGE-MGMT`, `SLA-MGMT`, `APPROVAL-WORKFLOW`, `AI-TRIAGE`) is installable on multiple domains (§4.5). Its system skill is the same regardless of host — read/write articles, version, publish, archive is the KNOWLEDGE-MGMT workflow whether installed on ITSM or HRSD.

**One `skill_type='system'` row with `domain_module_id = KNOWLEDGE-MGMT.id`.** Per-host tool variants (agent-facing vs customer-facing rendering, internal vs external visibility) belong on `skill_tools.notes` or in skill-bound config, not on a duplicated skill row. Coverage % is computed once for the skill and surfaces on its primary blueprint (`blueprints/modules/knowledge-mgmt-semantic-blueprint.md`). Each host-domain fact sheet links to it; no per-host re-computation, no domain-level averaging.

### 5.4 `role` skills are deferred to `plan-roles.md`

Role skills wrap user-role workflows that span multiple modules (a recruiter's daily flow spans Candidate CRM + Pipeline + Interviews + Offers). They naturally fit the modular world but require a `roles` catalog to be useful — there's nothing in the current schema for a role skill to point at.

The role-catalog design (a `roles` table tied to `business_functions`, a `role_modules` junction, and a `role_permissions` junction that lets roles become first-class permission containers) is meaningful scope expansion and gets its own plan file: **[`plan-roles.md`](plan-roles.md)**. That plan is blocked on this plan's schema landing.

For this plan: `skills.role_id` is **not** added in this migration — added in the roles plan instead. Existing `skill_type='role'` rows stay unchanged.

### 5.5 Backfill the 22 existing system skills

Per-domain pass. For each existing domain-level system skill:

1. Delete the domain-level skill (or mark `record_status='deprecated'`).
2. Derive N per-module system skills from that domain's module breakdown.
3. Re-link `skill_tools` rows to the appropriate per-module skill (the tool's `data_object_id` resolves to a specific module via `domain_module_data_objects`).
4. Re-compute coverage % per new module-level skill.
5. **Sanity check is per-module, not domain-rollup.** Verify each new per-module coverage % is internally consistent: every required tool the skill names is in `skill_tools`, every tool's `operation_kind` is one of `query` / `mutate` / `side_effect`, and the percentage matches `(query+mutate tool count) / (total required tool count)`. The pre-existing domain-level coverage value is **not** used as a reference because it's the average we're explicitly throwing away — comparing against it would re-introduce the noise per §5.6.

Bounded to ~5-15 minutes per domain. Total: ~5 hours for the existing 22 domains.

### 5.6 What this implies for the killer-hypothesis test

The current "12 of 12 candidates at 100% Semantius" result (P2.5A.i) becomes a per-module rollup. Expected outcome: *more* 100% modules because the email / sign_document / generate_text drag that dropped some domains below 100% is isolated to specific modules. For example:

- ATS today: 86% (drops because OFFERS needs `sign_document` and BACKGROUND-CHECKS needs `send_email`).
- ATS post-modularization: 5 of 8 modules at 100% (CANDIDATE-CRM, TALENT-POOLS, REFERRALS, RECRUITMENT-PIPELINE, INTERVIEWS, PRE-EMPLOYEE-RECORD), 2 below (OFFERS at ~83%, BACKGROUND-CHECKS at ~75%). The 100%-modules story for ATS goes from "0 of 1" to "6 of 8."

Buyer-facing payoff: "deploy these 6 ATS modules with zero external dependencies; these 2 specific modules need an integration."

**Counting rule:** if a tool serves two modules in the same tenant, count it **once per module** for coverage purposes. Each module's coverage % is independent of what else is installed — the score answers "what does this module need standalone?" not "what does this tenant need overall?" Counting once globally would break the "deploy this one module standalone" narrative. Likewise no domain-level aggregation: averaging per-module percentages destroys the per-module signal (a 100%-and-75% mix becomes "86%" which is true of neither module and actionable about neither).

The formula itself is unchanged: `(required tools with operation_kind ∈ {query, mutate}) / (total required tools)`. It just scopes to the per-module tool set.

---

## 6. Migration approach

Additive only. The existing `domain_data_objects` rows stay; module-level rows are added alongside. Existing fact sheet sections keep rendering until the per-module rollup view is wired in.

### 6.1 Order of operations

1. **Schema first.** Add the five tables + six columns. Zero impact on existing queries.
2. **One worked example end-to-end.** Pick ATS. Load `domain_modules` (8 rows), `domain_module_capabilities` (~7 rows — `ATS-BACKGROUND-CHECKS` deliberately has zero pending capability-layer audit), `domain_module_data_objects` (~30 rows reclassifying the existing 22 data_objects per module), `domain_starter_modules` (2 rows), per-module `data_object_lifecycle_states.domain_module_id` annotations on the affected states, `data_objects.minimum_embedded_shape` text for the 3 shared entities (§7.5). Derive 8 per-module `system` skills with `skill_tools` re-linked per module (§5.5). Re-emit the ATS fact sheet with new §s.
3. **Generator update.** Extend `scripts/generate_blueprints.ts` to render per-module sections (data_objects grouped by module, lifecycle states per module, per-module Semantius coverage % with the §5.6 counting rule), the "Getting started" section from `domain_starter_modules`, and a per-module skill rollup table. Other domain-level §s (vendors, RACI, regulations, market sizing) keep their current rollup shape — they're market-analysis facts that genuinely aggregate. The Semantius coverage section is explicitly *not* one of them: per §5.6, the per-module table IS the coverage view; no domain-level percentage is emitted. Add the second pass for cross-cutting module fact sheets at `domain-fact-sheets/_cross-cutting/`.
4. **One large worked example.** Repeat for ITSM (the 20→8-module collapse). This validates the cross-cutting-module pattern (Knowledge Mgmt module installable on ITSM/CSM/HRSD/LSD) and the per-cross-cutting-module single skill rule (§5.3).
5. **Backfill the rest (Phase 2).** Top-20 implementation-relevant domains first (per [plan-generate-blueprints.md § 6.3](plan-generate-blueprints.md)). The long tail can stay flat until someone needs it modular — every new column is nullable and `domain_modules` rows are not required; a domain without modules renders the same fact sheet as today.
6. **Cross-module handoff backfill.** For each backfilled domain, populate `handoffs.source_domain_module_id` / `target_domain_module_id` from the existing rows. Per-domain pass, ~30-60 minutes per domain.
7. **`domain-map-analyst` SKILL.md update (after Phase 2 of step 5).** Update [.claude/skills/domain-map-analyst/SKILL.md](.claude/skills/domain-map-analyst/SKILL.md) so the modular workflow is baked into every research / verification pass:
   - **Phase A extension:** when loading a new market, also decompose it into modules (per the standalone-deployability test in §1) and populate `domain_modules` + `domain_module_capabilities` + `domain_module_data_objects` alongside the existing domain rows.
   - **Phase B extension:** master data_objects get assigned to their canonical module via `domain_module_data_objects.role='master'`; embedded_masters get assigned to every module that touches them; `data_objects.minimum_embedded_shape` is curated per shared data_object.
   - **Phase C extension:** if `plan-roles.md` has landed by then, roles + `role_modules` + `role_permissions` are part of the per-domain load.
   - **Per-domain completeness checklist additions:** new checks for module shape (every domain has ≥1 module OR is intentionally flat), starter-junction populated, per-module system skills derived, minimum-embedded-shape contracts curated for shared data_objects, lifecycle states correctly assigned `domain_module_id`. **For domains with roles loaded (post-`plan-roles.md`):** every `role_modules.interaction_level='primary'` row is justified by the role's core workflow — `primary` means the role can't function without the module; `secondary` is the right default when in doubt because it preserves graceful degradation. Misuse of `primary` (over-tagging) breaks the role-union on-ramp by recommending modules the role doesn't actually need.
   - **Domain verification / audit pass:** the existing audit recipe (per SKILL.md "Audit recipe" section) extends to verify module-level invariants — orphan embedded_masters, missing starter, modules without capabilities, lifecycle states with un-installed `domain_module_id`, etc.
   - **Anti-patterns added:** loading a domain without modules when modules are expected; per-module data divergence (modules touching the same data_object without conforming to the minimum-shape contract); the module-count-inflation pattern (default 1:1, bundle when sub-features, never split a capability without a concrete standalone case).

### 6.2 What does not change

- `domains` table and the domain fact sheet structure — both stay as today.
- `handoffs` keeps `source_domain_id` / `target_domain_id`; new columns are additive.
- The per-domain completeness checklist in [`.claude/skills/domain-map-analyst/SKILL.md`](.claude/skills/domain-map-analyst/SKILL.md) keeps every existing check. Module-level checks are added as a new section, not a replacement.
- The `roles` catalog is **out of scope** for this plan — see [`plan-roles.md`](plan-roles.md). `skill_type='role'` rows stay unchanged in this migration.
- **Domain-level views are always derived rollups from the module view, never independently editable.** Once a domain has modules, `domain_data_objects` rows are computed from `domain_module_data_objects` (group by `data_object_id`, take strongest role across modules), `business_function_domains` aggregations roll up from `business_function_domain_modules` if it exists, etc. Two stored versions would drift; derivation prevents that. Implementation rule, not a risk.

---

## 7. ATS as the worked example

Eight modules, each independently deployable, no hierarchy. The starter junction marks two of them as the recommended on-ramp; everything else is a-la-carte.

### 7.1 Module shape

Embedded-master rows annotated with `(req)` or `(opt)` to show the `domain_module_data_objects.necessity` value.

Capability codes shown match the actual catalog (`REQ-MGMT`, `SOURCING`, `CANDIDATE-EXP`, `INTERVIEW-MGMT`, `OFFER-MGMT`, `AI-RECRUIT`).

| `domain_module_code` | Capabilities realized | Masters | Embedded-masters | Coverage % (est.) |
|---|---|---|---|---:|
| `ATS-CANDIDATE-CRM` | `SOURCING`, `CANDIDATE-EXP`, `AI-RECRUIT` (folded — matching/parsing tool surface lives in this module's skill) | `candidates`, `recruitment_sources` | — | 100% |
| `ATS-TALENT-POOLS` | `SOURCING` (partial — pool/nurture slice) | `talent_pools` | `candidates` (req) | 100% |
| `ATS-REFERRALS` | `SOURCING` (partial — referral-program slice) | `candidate_referrals` | `candidates` (req) | 100% |
| `ATS-RECRUITMENT-PIPELINE` | `REQ-MGMT`, `CANDIDATE-EXP` (application flow) | `job_requisitions`, `job_postings`, `job_applications` | `candidates` (req), `hcm_positions` (opt), `org_units` (opt) | 100% |
| `ATS-INTERVIEWS` | `INTERVIEW-MGMT` | `interviews`, `interview_scorecards` | `candidates` (req), `job_applications` (req) | 100% |
| `ATS-OFFERS` | `OFFER-MGMT` | `job_offers` | `candidates` (req), `job_applications` (req), `salary_bands` (opt) | ~83% (needs `sign_document`) |
| `ATS-BACKGROUND-CHECKS` | (gap in capability layer — no current ATS capability covers compliance / background-checks; flag for capability-layer audit) | `background_checks` | `candidates` (req), `job_offers` (req) | ~75% (needs `send_email` for adverse-action workflow) |
| `ATS-PRE-EMPLOYEE-RECORD` | `OFFER-MGMT` (pre-hire-workflows slice from the OFFER-MGMT description) | `pre_employees` | `candidates` (req), `job_offers` (req) | 100% |

**Decisions made on capability/data_object placement:**

- **`prospects` is a lifecycle state of `candidates`, not a separate entity.** The existing ATS fact sheet has it as the initial state of the `candidates` lifecycle (`prospect → active → hired/do_not_hire/archived`). Splitting it into a separate `prospects` data_object would duplicate the person record and create exactly the cross-module shape-divergence the minimum-embedded-shape contract exists to prevent. `ATS-CANDIDATE-CRM` masters `candidates` (which includes the `prospect` state); no separate `prospects` master.
- **`AI-RECRUIT` is folded into `ATS-CANDIDATE-CRM`** rather than a separate `ATS-AI-MATCHING` module or a cross-cutting AI module. Reasoning: AI-RECRUIT (resume parsing, ML matching, screening assistants per the catalog description) operates on `candidates` and is tightly bound to candidate workflows. Bundling keeps the model simple. If matching-as-a-pattern grows beyond candidate context later (e.g., supplier matching in S2P, lead matching in MA), revisit and extract as cross-cutting. Distinct from `AI-TRIAGE` (§7.2) which is a generic triage shape across incident/case/HR-case domains with no domain-specific data.
- **`ATS-BACKGROUND-CHECKS` has no current matching capability** — the six ATS capabilities don't include a compliance / background-checks one. Flag as a capability-layer audit gap (separate task; see §10). The module proceeds with no `domain_module_capabilities` row; this is correct shape if no capability backs it, and it's a signal to add one.

**Note on the renaming `NEW-HIRE-HANDOFF` → `PRE-EMPLOYEE-RECORD`:**

The original draft had this module master `employees`. That's structurally wrong — HCM canonically masters `employees`. ATS holds the *pre-employee* record (offer accepted, paperwork in flight, start date not yet reached); at start-date the pre-employee record gets reconciled into HCM-mastered `employees`. The renamed module masters a new `pre_employees` (or `new_hire_drafts`) data_object that captures this distinct lifecycle stage, with `handoffs` row `ATS-PRE-EMPLOYEE-RECORD → HCM-WORKER-RECORD` on `pre_employee.activated` carrying the canonical reconciliation. ATS's role on `employees` in the existing fact sheet (`embedded_master` at the domain rollup level) stays correct because no ATS module canonically masters `employees`.

### 7.2 Starter junction (`domain_starter_modules` rows for ATS)

| `position` | `domain_module_id` | `notes` |
|---|---|---|
| 1 | `ATS-CANDIDATE-CRM` | The entity backbone — start here. Provides candidates, prospects, sourcing. |
| 2 | `ATS-RECRUITMENT-PIPELINE` | Adds requisitions, postings, applications, the pipeline-stage workflow. With these two installed you have a minimum recognizable ATS. |

**Why these two and not one or three:**

- One alone is incomplete: `ATS-CANDIDATE-CRM` standalone is structurally a candidate-relationship product (Beamery, Avature CRM) — useful, but not an ATS. `ATS-RECRUITMENT-PIPELINE` alone is incoherent (applications exist but no real candidates to attach them to; embedded_master demotes candidates to a thin shell, meaning duplicated state).
- Three or more drags in workflow modules a beginner might not need (interviews, offers, background checks, talent pools all viable a-la-carte).

### 7.3 Where each "core" ATS concept lives

| Concept | Module |
|---|---|
| Candidates (the person record, including `prospect` lifecycle state) | `ATS-CANDIDATE-CRM` |
| Job requisitions, postings | `ATS-RECRUITMENT-PIPELINE` |
| Applications (the candidate-to-req junction with pipeline-stage lifecycle) | `ATS-RECRUITMENT-PIPELINE` |
| Interviews + scorecards | `ATS-INTERVIEWS` |
| Offers | `ATS-OFFERS` |
| Background checks | `ATS-BACKGROUND-CHECKS` |
| Talent pools | `ATS-TALENT-POOLS` |
| Referrals | `ATS-REFERRALS` |
| Pre-employee record (bridge to HCM/Onboarding) | `ATS-PRE-EMPLOYEE-RECORD` |

Applications sit in `ATS-RECRUITMENT-PIPELINE` because an application is structurally the junction of candidate × requisition — you apply *to* something. It cannot meaningfully exist without a requisition shape. The pipeline-stage lifecycle (applied / screening / interviewing / offer / hired / rejected) lives on `job_applications`, so the lifecycle and the requisition shape co-locate.

### 7.4 Per-module lifecycle states (the `interviewing` / `offer_extended` / `hired` problem)

The `job_applications` lifecycle reaches states whose work lives in other modules:

| State | Realizing module | `data_object_lifecycle_states.domain_module_id` |
|---|---|---|
| `applied` | `ATS-RECRUITMENT-PIPELINE` | NULL (always reachable when the master is installed) |
| `screening` | `ATS-RECRUITMENT-PIPELINE` | NULL |
| `interviewing` | `ATS-INTERVIEWS` | `ATS-INTERVIEWS.id` |
| `offer_extended` | `ATS-OFFERS` | `ATS-OFFERS.id` |
| `hired` | `ATS-PRE-EMPLOYEE-RECORD` | `ATS-PRE-EMPLOYEE-RECORD.id` |
| `rejected`, `withdrawn` | `ATS-RECRUITMENT-PIPELINE` | NULL |

At deploy time the deployer prunes states whose `domain_module_id` references an un-installed module. A tenant deploying only `ATS-RECRUITMENT-PIPELINE` gets the application lifecycle `{applied, screening, rejected, withdrawn}` — the four states whose realizing module is present. Adding `ATS-INTERVIEWS` unlocks `interviewing`; adding `ATS-OFFERS` unlocks `offer_extended`; adding `ATS-PRE-EMPLOYEE-RECORD` unlocks `hired`. This is exactly the embedded_master demotion principle extended to states.

**Transitive embedded_master pull-in is sufficient (no `requires_modules` column needed today).** A state with `module_id = ATS-PRE-EMPLOYEE-RECORD` is reachable only when that module is installed, and `ATS-PRE-EMPLOYEE-RECORD` itself embedded_masters `job_offers` (which is mastered by `ATS-OFFERS`) and `job_applications` (which is mastered by `ATS-RECRUITMENT-PIPELINE`) — so installing `ATS-PRE-EMPLOYEE-RECORD` either pulls in those upstream modules or lights up local-master shells for them. Either way the state's prerequisites are met. The single-FK `domain_module_id` is enough as long as every multi-module dependency is expressible as a transitive embedded_master chain. **If ITSM modularization (or any future load) surfaces a state that legitimately requires the joint presence of two modules with no embedded_master chain between them, model it as a future schema extension** — likely a `state_required_modules` junction. Don't add the column speculatively.

### 7.5 Minimum embedded-shape contracts for ATS

The shared data_objects in this domain and their minimum-shape contracts:

| `data_object` | Embedded by | Minimum shape |
|---|---|---|
| `candidates` | TALENT-POOLS, REFERRALS, RECRUITMENT-PIPELINE, INTERVIEWS, OFFERS, BACKGROUND-CHECKS, PRE-EMPLOYEE-RECORD | `id`, `legal_name`, `email`, `phone`, `primary_source_id`, `consent_status`, `created_at` |
| `job_applications` | INTERVIEWS, OFFERS, BACKGROUND-CHECKS | `id`, `candidate_id`, `requisition_id`, `current_stage`, `applied_at` |
| `job_offers` | BACKGROUND-CHECKS, PRE-EMPLOYEE-RECORD | `id`, `candidate_id`, `application_id`, `requisition_id`, `state`, `extended_at` |

Curated as part of this load. Stored in `data_objects.minimum_embedded_shape` (per §4.7) as a markdown bullet list with brief per-field justification (the GDPR-relevant subset for `candidates`, the junction-key subset for `job_applications`, the offer-state subset for `job_offers`). Deployer asserts every embedded_master rendition includes these fields; modules may extend.

### 7.6 Why this is more useful than the current flat ATS

- **SMB story:** a 50-person org installs the 2 starter modules (~9 entities) and grows into the rest. The previous flat ATS shape always materialized all 22 data_objects.
- **Composition story:** `ATS-CANDIDATE-CRM` is structurally the same as a standalone Candidate CRM product (Beamery, Avature CRM); the catalog now shows it that way. `ATS-TALENT-POOLS` likewise mirrors standalone talent-acquisition CRMs.
- **Integration story:** the `job_offer.accepted → employees` handoff lives between `ATS-OFFERS` and `ATS-PRE-EMPLOYEE-RECORD`, not abstractly between "ATS" and "ATS." Per-deployment integration burden becomes computable.
- **SEO story:** the catalog gains 8 new module-level landing pages per domain (~440 across the catalog when fully rolled out). Each is a discoverable concept ("background-check module," "talent-pools module") that maps to high-intent search.

### 7.7 Skills for ATS (8 per-module system skills + 1 process candidate)

Eight per-module `system` skills, one per module. The existing single domain-level `ATS-system` skill (loaded in P2.5A.i) gets retired in favor of these.

| `skill_code` | `domain_module_id` | Required tools (master tools + key consumed reads) | Coverage % |
|---|---|---|---:|
| `ats-candidate-crm-system` | `ATS-CANDIDATE-CRM` | `query_candidates`, `create_candidate`, `update_candidate`, `query_recruitment_sources`, `update_recruitment_source`, `parse_resume`, `match_candidate_to_jobs` (AI-RECRUIT folded in) | 100% |
| `ats-talent-pools-system` | `ATS-TALENT-POOLS` | `query_talent_pools`, `add_candidate_to_pool`, `remove_candidate_from_pool`, `query_candidates` (consumer read) | 100% |
| `ats-referrals-system` | `ATS-REFERRALS` | `query_candidate_referrals`, `create_referral`, `update_referral_status`, `query_candidates` (consumer read) | 100% |
| `ats-recruitment-pipeline-system` | `ATS-RECRUITMENT-PIPELINE` | `query_job_requisitions`, `create_requisition`, `approve_requisition`, `query_job_postings`, `publish_posting`, `query_job_applications`, `update_application_stage`, `query_candidates` (consumer read) | 100% |
| `ats-interviews-system` | `ATS-INTERVIEWS` | `query_interviews`, `schedule_interview`, `query_interview_scorecards`, `submit_scorecard`, `query_candidates`, `query_job_applications` (consumer reads) | 100% |
| `ats-offers-system` | `ATS-OFFERS` | `query_job_offers`, `create_offer`, `approve_offer`, `rescind_offer`, **`sign_document`** (side_effect), `query_candidates`, `query_job_applications`, `query_salary_bands` (consumer reads) | ~83% (1 of 6 non-Semantius) |
| `ats-background-checks-system` | `ATS-BACKGROUND-CHECKS` | `query_background_checks`, `request_background_check`, `flag_for_review`, **`send_email`** (side_effect, adverse-action notices), `query_candidates`, `query_job_offers` (consumer reads) | ~75% (1 of 4 non-Semantius) |
| `ats-pre-employee-record-system` | `ATS-PRE-EMPLOYEE-RECORD` | `query_pre_employees`, `create_pre_employee`, `activate_pre_employee` (publishes `pre_employee.activated` handoff to HCM), `query_candidates`, `query_job_offers` (consumer reads) | 100% |

**100% Semantius headline:** 6 of 8 ATS modules at 100%. The 2 below (OFFERS, BACKGROUND-CHECKS) each fail on a single specific non-Semantius tool (`sign_document` and `send_email` respectively). Compare to today's single ATS skill at ~86% — modularization moves the catalog from "ATS is a partial-Semantius story" to "6 ATS modules deploy with zero external dependencies; 2 specific modules need one external tool each."

**Process skill candidate:** the ATS hire-loop (`offer.accepted → pre_employee.activated → employee.created` handoff cluster spanning `ATS-OFFERS` + `ATS-PRE-EMPLOYEE-RECORD` + `HCM-WORKER-RECORD` + `ONBOARDING-JOURNEY`) is the obvious intra-domain-spilling-cross-domain `process` skill candidate. Defer until the discovery query re-runs at module granularity (§5.2); don't author manually as part of this load.

**Role skill candidates** (deferred to [`plan-roles.md`](plan-roles.md), not loaded in this pass): `RECRUITING-RECRUITER`, `HIRING-MANAGER`, `RECRUITING-COORDINATOR`, `RECRUITING-SOURCER`. Each spans 3-5 modules and bundles cross-module permissions in a way the current per-module `:admin` / `:manage` rollups can't express. Function-scoped, not domain-scoped (per the role naming convention in [`plan-roles.md` §1](plan-roles.md)) — `HIRING-MANAGER` is cross-functional (no prefix).

---

## 8. ITSM as the stress-test

ITSM currently lists 20 capabilities — way over the 5-8 norm. The modular pass collapses to roughly **5 ITSM-specific modules + 5 cross-cutting modules**, each cross-cutting module installable across ITSM/CSM/HRSD/LSD.

### 8.1 ITSM-specific modules (sketch)

| `domain_module_code` | Bundles capabilities | Masters |
|---|---|---|
| `ITSM-INCIDENT` | Incident + Major Incident + Problem | `incidents`, `problems`, `major_incidents` |
| `ITSM-CHANGE` | Change + Std Change + Release | `change_requests`, `releases`, `standard_changes` |
| `ITSM-REQUEST` | Service Request + Catalog | `service_requests`, `service_catalog_items` |
| `ITSM-EVENT` | Event handling | `event_records` |
| `ITSM-WORKSPACE` | Agent Workspace + Routing + Walk-up + Skill-Based Assignment | (no new masters; workflow over existing) |

### 8.2 Cross-cutting modules (installable on any service-management domain)

| `domain_module_code` | Installable on | Masters |
|---|---|---|
| `KNOWLEDGE-MGMT` | ITSM, CSM, HRSD, LSD, KMS-standalone | `knowledge_articles` (or embedded_masters when KMS is canonical) |
| `SLA-MGMT` | ITSM, CSM, HRSD | `sla_definitions`, `sla_breaches` |
| `SELF-SERVICE-PORTAL` | ITSM, CSM, HRSD | `portal_pages`, `portal_users` (or embedded `users`) |
| `APPROVAL-WORKFLOW` | ITSM-CHANGE, ATS-OFFERS, S2P-PO, many others | `approval_records` |
| `AI-TRIAGE` | ITSM-INCIDENT, CSM-CASE, HRSD-CASE | (no new masters; tool surface only) |

This is the modular payoff at scale: Knowledge isn't an ITSM feature, it's a module that lives in any service-mgmt domain. The capability already exists as `KNOWLEDGE-MGMT` (cross-cutting, per the existing convention in SKILL.md); the module makes it independently deployable.

### 8.3 Starter junction for ITSM

| `position` | `domain_module_id` | `notes` |
|---|---|---|
| 1 | `ITSM-INCIDENT` | The service-desk core — incidents and problems are the backbone of every ITSM deployment. |
| 2 | `ITSM-REQUEST` | Service requests + catalog: the day-to-day work of the service desk beyond break-fix. |

Drops as not-standalone (absorbed into parents or removed):
- `ITSM-VIRTUAL-AGENT` → folded into Workspace or moved to CONV-AI as cross-cutting.
- `ITSM-CHARGEBACK` → moved to FINOPS or future ITFM domain.
- `ITSM-REPORTING` → every domain has reporting, not distinctive.

### 8.4 Cross-cutting modules in the per-module shape

**Revised per §9 (session 3, 2026-05-23):** with per-module fact sheets in `modules/<MODULE-CODE>.md` for every `domain_modules` row, cross-cutting modules are no longer special — they live in the same folder as everyone else. The previous "primary fact sheet at `_cross-cutting/<MODULE-CODE>.md`" path is dropped.

**What is special about cross-cutting modules:** they have `domain_modules.domain_id = NULL` (no obvious home) or they have `domain_modules.domain_id` set plus rows in `domain_module_host_domains` (additional installable hosts). Their fact sheet:

- Replaces the "parent domain" section with a "host domains" section listing every domain they're installable on (via the UNION of `domain_modules.domain_id` and `domain_module_host_domains` per §4.5). Per-host notes (e.g., `KNOWLEDGE-MGMT` on ITSM uses `agent-facing` rendering; on CSM it uses `customer-facing`) come from `domain_module_host_domains.notes`.
- Doesn't appear in any starter-kit fact sheet's "starter modules" section (the starter junction is editorial per-domain on-ramp, not cross-cutting suggestion).
- Each host-domain starter-kit fact sheet's "Modules installable in this market" section lists the cross-cutting module with a link to its per-module fact sheet.

~440 per-module fact sheets total + ~88 per-starter-kit fact sheets. Cross-cutting count (~10-20) is included in the 440.

---

## 9. Decisions made (design pass)

Resolved during the architect review pass (2026-05-23):

- **Fact sheet shape — REVISED (2026-05-23 session 3):** per-module fact sheets in `domain-fact-sheets/modules/<MODULE-CODE>.md` (one per `domain_modules` row, ~440 catalog-wide when fully rolled out) **plus** per-starter-kit fact sheets in `domain-fact-sheets/starter-kits/<DOMAIN-CODE>.md` (one per domain that has a `domain_starter_modules` junction, ~88 catalog-wide). **No standalone per-domain fact sheet** — the starter-kit page IS the market entry point and carries vendors, RACI, regulations, capabilities, market sizing. Cross-cutting modules live in `modules/` with everyone else (no separate `_cross-cutting/` folder); cross-cutting modules with `domain_id = NULL` simply list their host domains instead of a single parent. The earlier "inline modules in domain fact sheet" decision (§7.6 and original §9 phrasing) is retired because it sub-headed module concepts where §7.6 wanted landing pages — the SEO and architect-handoff use cases both need per-module surfaces.
- **Lifecycle states straddling modules** — `data_object_lifecycle_states.domain_module_id` column added (see §4.2 + §7.4).
- **Minimum embedded-shape contract** — `data_objects.minimum_embedded_shape` text column added (see §4.7 + §7.5).
- **`domain_module_data_objects.necessity`** — added back as 2-value enum on consumer/embedded_master rows (see §4.4).
- **`NEW-HIRE-HANDOFF` → `PRE-EMPLOYEE-RECORD`** — renamed to master `pre_employees` not `employees` (see §7.1 note).
- **Skills layer treatment** — system skills become per-module 1:1, process skills wrap cross-module workflows (may be intra-domain), cross-cutting modules get one shared system skill, role skills deferred to [`plan-roles.md`](plan-roles.md). Captured in §5.
- **Per-module market metadata** — **stays at domain level only.** No `min_org_size` / `cost_band` columns on `domain_modules`. Rationale: domain-level values are already mostly guesstimates; adding per-module values would be guesstimating on top of guesstimates. Per-module SEO pages reference the parent domain's values; cross-cutting modules with no `domain_id` simply have no market metadata. Removed from §4.1.
- **Role catalog timing** — **serialize per domain: modules first, then roles.** Originally proposed parallel-track for ATS but reversed in the 2026-05-23 role-plan architect review: `role_permissions` rows reference per-module permission codes that aren't locked until the modular load completes; concurrent authoring is brittle (if a verb gate renames during the modular pass, in-flight role bundles break). Each pair within a domain is fast (modules ~half a day, roles ~30 min). The "useful early signal" from role spans informing module splits is captured by the post-modular-load review, not concurrent authoring.
- **APQC integration** — `skills.process_id` FK added (§4.2). `domain_module_processes` deferred to §10 TODOs (or a separate `plan-processes.md` if scope warrants).

---

## 10. Deferred TODOs (not blocking, but capture during the migration)

Items raised in review that don't block the ATS load but should be noted in the migration script and SKILL.md updates so they don't fall on the floor.

| TODO | When |
|---|---|
| **Rename `cross_domain_handoffs` → `handoffs`.** ✅ DONE (2026-05-24, [plan-handoffs.md](plan-handoffs.md)). Also dropped the `cross_domain_only` validation rule (intra-domain handoffs are now first-class catalog rows) and added `lifecycle_progression` to the `integration_pattern` enum. The validation-rule drop was not specified here originally; it was added by plan-handoffs.md as part of the same change. The NOT-NULL flip on `source_domain_module_id` / `target_domain_module_id` is the only piece of D3 still pending; it stays gated on catalog-wide backfill per the original review point. |
| **Soft authoring guideline against speculative module splits.** More modules = more SEO surface, which is the goal — but a module created without a concrete standalone deployability case dilutes the SEO signal (an empty landing page is worse than no landing page). Add a one-line authoring rule to SKILL.md (`domain-map-analyst`): "default to 1:1 capability-to-module; bundle when capabilities are sub-features of the same workflow; never split a capability into multiple modules without a concrete standalone deployability case." | When the SKILL.md modules section is authored alongside the schema landing. |
| **Semantic-architect skill flow change.** Today the architect asks the user to design entities from scratch; post-modularization the question becomes "which modules do you want to install?" The architect skill in `C:\dev\semantius-agent\.claude\skills\semantius-architect` needs a Stage 0 update analogous to the existing fact-sheet load (per [plan-generate-blueprints.md § 1](plan-generate-blueprints.md)) but selecting modules from the domain instead of taking the whole domain. | After ATS + ITSM modularized and fact sheet emitter produces module-aware output. |
| **Capability-layer audit for `ATS-BACKGROUND-CHECKS` and similar gaps.** Six ATS capabilities don't include compliance / background-checks; the module exists but has no `domain_module_capabilities` row. Audit pass should surface every module with zero capabilities and either add the missing capability or document why none exists. | After first 5 domains modularized — pattern will emerge for whether this is "missing capability" or "module that intentionally has no market-analysis surface". |
| **`domain_module_processes` junction for "browse APQC PCF → which modules implement it" navigation.** New junction `(module_id, process_id, coverage_notes)` linking modules directly to PCF rows (and custom processes). Inverts the `skills.process_id` link by letting buyers start from an APQC process they need and discover the modules that cover it. Authoring cost is real: 88 domains × ~5 modules × ~2 PCF rows ≈ ~880 junction rows. High SEO value because PCF process IDs are high-intent search targets. Could justify its own `plan-processes.md` if the scope warrants. | After modular pass complete for top-20 domains AND the `skills.process_id` formal linkage has shown enough use to validate buyer demand for the inverse navigation. |

---

## 11. Next concrete step

All steps below are **additive** and reversible by deleting rows. The destructive cleanup is consolidated into §12.

1. Get sign-off on this plan.
2. Apply schema changes (§4) — 5 new tables (`domain_modules`, `domain_module_capabilities`, `domain_module_data_objects`, `domain_module_host_domains`, `domain_starter_modules`) + 7 new columns (`domain_module_id` on lifecycle states; `minimum_embedded_shape` on data_objects; `domain_module_id` + `process_id` on skills; `domain_module_id` on trigger_events; `source_domain_module_id` + `target_domain_module_id` on handoffs, then known as `cross_domain_handoffs`; renamed 2026-05-24 per [plan-handoffs.md](plan-handoffs.md)). `domain_modules.domain_id` is nullable for cross-cutting modules with no obvious home. Single migration script.
3. Hand-author the ATS modules + starter junction + minimum-embedded-shape contracts + per-module lifecycle assignment (§7) **plus the 8 per-module system skills with re-linked `skill_tools` and per-skill coverage % (§7.7, derived per §5)** as the first worked example. The 22 existing domain-level system skills stay in place; new per-module skills coexist with them until §12. Load via the existing `.tmp_deploy/load_research.ts` pattern.
3.5. **Materialize the derived permissions and their hierarchies into the live catalog.** Two schema additions on the existing `permissions` table — `domain_module_id` nullable FK → `domain_modules` (which catalog module this permission belongs to) and `tier` text enum (`baseline-read` / `baseline-manage` / `baseline-admin` / `workflow-gate` / `override`) — let the fact-sheet-derivation logic in `generate_blueprints.ts` be lifted into a loader that writes one `permissions` row per derived code. Per-module hierarchies are encoded in the existing `permission_hierarchy` table with `origin='model'`: `<module>:admin` ⊃ `<module>:manage` ⊃ `<module>:read`, plus `<module>:admin` ⊃ every workflow gate and every pattern-flag override in that module. This unblocks [`plan-roles.md`](plan-roles.md) Phase 1A, which depends on `permissions.id` being queryable for `role_permissions.permission_id` and on the hierarchy edges existing for tier-expansion at request time. **Required before any role authoring starts.**
4. Rewrite [`scripts/generate_blueprints.ts`](scripts/generate_blueprints.ts) into **two passes** per the §9 (revised) shape:
   - **Per-module pass** — for every `domain_modules` row, emit `blueprints/modules/<module-code>-semantic-blueprint.md` covering: parent domain (or host-domains list for cross-cutting), data_objects assigned to this module (role + necessity from `domain_module_data_objects`), lifecycle states on this module's masters (with realizing-module annotation per §7.4), the per-module system skill + skill_tools + Semantius coverage % (§5.6 counting rule), module-scoped permissions and business rules, capabilities realized (`domain_module_capabilities`), outbound and inbound integration handoffs via `handoffs.source_domain_module_id` / `target_domain_module_id`, and architect handoff hints.
   - **Per-starter-kit pass** — for every domain with a `domain_starter_modules` junction, emit `blueprints/starter-kits/<domain-code>-semantic-blueprint.md` covering: market overview (description, business_logic, market sizing), the starter junction table (the editorial on-ramp), all modules installable in this market (primary-home + cross-cutting via `domain_module_host_domains`), combined data_objects across the starter modules, combined lifecycle (which states light up with the starter set vs. need other modules), combined system skills + coverage % (per-module, **no aggregate rollup** per §5.6), combined permissions and business rules, cross-domain integration handoffs from the starter modules, capabilities for the domain, solutions and vendors, functional ownership (RACI), regulatory context, and architect handoff hints.
   - Delete the old per-domain fact sheet path (`domain-fact-sheets/<DOMAIN-CODE>.md`) and the legacy `_cross-cutting/` folder convention.
5. Regenerate ATS's per-module blueprints (`blueprints/modules/ats-*-semantic-blueprint.md`, 8 files) and the starter-kit blueprint (`blueprints/starter-kits/ats-semantic-blueprint.md`). Architect-review.
6. If the rendered shape is right, repeat for ITSM. ITSM is the cross-cutting validator: emit `blueprints/modules/knowledge-mgmt-semantic-blueprint.md` etc. with the host-domains pattern, and verify the ITSM starter-kit page lists cross-cutting modules with links into `blueprints/modules/`.
7. From there, decide whether to roll out to the top-20 implementation-relevant domains or pause for further design iteration.
8. Update [`.claude/skills/domain-map-analyst/SKILL.md`](.claude/skills/domain-map-analyst/SKILL.md) per §6.1 step 7 once 5+ domains have been modularized.

---

## 12. Destructive operations (final step, after additive phase fully validated)

⚠️ **Only execute after additive work in §11 is complete and verified.** Each operation here changes or removes existing rows in ways additive operations can't undo — if anything in §11 needed to be rolled back, doing it before this step keeps that option open.

| # | Operation | Why deferred to here | Rollback shape |
|---|---|---|---|
| D1 | **Delete the 22 retired domain-level system skills** (or mark `record_status='deprecated'` and remove from active queries). Replaced by the per-module system skills loaded in §11 step 3 and the per-domain modular passes. | Per-module skills must be in place AND verified to produce correct coverage % rollups before the old domain-level skills are removed. Premature deletion would orphan coverage queries. | Recreate from git history of `.tmp_deploy/load_*.ts` loaders that originally wrote them. |
| D2 | **Verb-form rename of state-as-noun lifecycle-gate permissions** across all domains (`ats:submitted_interview_scorecard` → `ats:submit_scorecard`, etc.). Update the §7 emitter in [`scripts/generate_blueprints.ts`](scripts/generate_blueprints.ts) so derivation reads `lifecycle.permission_verb_override` first. Backfill the override column on affected `data_object_lifecycle_states` rows. Re-emit affected fact sheets. | The original argument was "do it before the modular pass so per-module tables don't reproduce the inconsistency." Inverted decision: do it AFTER the modular pass as a single batch rename — all per-module permission tables get fixed at once, no per-module catch-up, and the destructive op stays guarded by the §12 validation gate. Cost: inconsistent naming during the modular load window. Benefit: no destructive op until everything works. | Re-derive from saved `data_object_lifecycle_states.state_name` + the pre-rename emitter version. Held in git. |
| D3 | **Per the §10 deferred TODOs that turn destructive:** capability-layer collapse to `domain_module_tags` IF the post-20-domain review triggers it; `cross_domain_handoffs` rename to `handoffs` (✅ DONE 2026-05-24, rename + `cross_domain_only` validation rule drop + `lifecycle_progression` enum value added, all per [plan-handoffs.md](plan-handoffs.md)). The only piece of D3 still pending is the NOT-NULL flip on `source_domain_module_id` / `target_domain_module_id`, which remains gated on catalog-wide backfill. The validation-rule drop was added by plan-handoffs.md and was not originally specified here. | Capability-layer collapse and the NOT-NULL flip are still gated by review-point evaluations. Captured here so they don't get forgotten; when (if) the review triggers them, they belong in this destructive step, not earlier. | Capability-layer collapse is a rename; rollback is the inverse rename. The NOT-NULL flip's rollback is making the columns nullable again. |

**Validation gate before D1–D3:** all checks below must pass.

- Every modularized domain's fact sheet emits cleanly with per-module sections rendered correctly.
- Per-module Semantius coverage % computed for every module-level system skill is internally consistent (every tool listed lives in `skill_tools`, `operation_kind` set per row, percentage matches the formula). Do **not** sanity-check against the pre-deletion domain-level rollup — that's the average we're explicitly retiring per §5.6.
- `domain-map-analyst` SKILL.md update (§11 step 8) has landed and per-domain completeness checklist includes module-level checks.
- Architect (semantic-architect skill) flow change (§10 deferred TODO) tested end-to-end with at least one modularized domain.

---

## 13. Progress checklist

Track execution here. Check items off as they land. Items grouped by §11 step + the §12 destructive batch. Per-domain rollout items live in their own subsection so individual domains can be tracked.

### Next concrete action (for a fresh session)

§11 steps 2 (schema), 3 (full ATS foundation pass), 4 (emitter rewrite), and 5 (ATS pages emitted) are done. Run `bun run scripts/generate_blueprints.ts --all --check` to verify the pages are still in sync with the live catalog before any further work.

**Next: architect review of the 8 ATS module pages + the ATS starter-kit page (still part of §11 step 5).** Eyeball each page; look specifically for:

- Module data_object lists match expectation (no orphan rows, no missing embedded_masters).
- Coverage % matches §7.7 (6 of 8 modules at 100%, OFFERS 83%, BACKGROUND-CHECKS 75%).
- Lifecycle realizing-module annotations are right (`interviewing` → INTERVIEWS, `offer_extended` → OFFERS, `hired` → PRE-EMPLOYEE-RECORD).
- Permission gates use the realizing module's slug per §4.6 (e.g., `ats-pre-employee-record:hire_candidate`, NOT `ats-recruitment-pipeline:hire_candidate`).
- Starter-kit §5 "combined lifecycle" clearly marks which states light up with the starter set vs. need installing other modules.

Then **§11 step 6**: ITSM stress test — load ITSM-specific modules (§8.1) + cross-cutting modules (§8.2) with `domain_module_host_domains` rows, emit, and validate the cross-cutting pattern in `modules/`.

### Session 3 — fact sheet shape revisited (2026-05-23)

The §9 "fact sheet shape" decision (inline modules within a per-domain fact sheet) is retired in favor of **two artifact types**:

- **Per-module blueprints** in `blueprints/modules/<module-code>-semantic-blueprint.md` — one per `domain_modules` row, ~440 catalog-wide when fully rolled out. The deployable unit's full surface (data_objects, lifecycle, system skill, coverage %, integration handoffs, permissions). Matches the SEO story in §7.6 that the original §9 inline-only decision was undercutting.
- **Per-starter-kit blueprints** in `blueprints/starter-kits/<domain-code>-semantic-blueprint.md` — one per domain with a `domain_starter_modules` junction, ~88 catalog-wide. The buyer-facing market entry point: market overview, the editorial on-ramp from `domain_starter_modules`, combined view across the starter modules, and the market-analysis content (vendors, RACI, regulations, capabilities, market sizing) that used to live in the per-domain fact sheet.
- **No standalone per-domain fact sheet.** The starter-kit page is the market overview. Domains without a starter junction (the long tail, cross-cutting-only domains) have no starter-kit page; their modules still appear in `modules/`.
- Cross-cutting modules go in `modules/` with everyone else. The `_cross-cutting/` folder convention is dropped. Cross-cutting modules are distinguished by their fact sheet's structure (host-domains section instead of parent-domain section), not their path.

Trigger for the change: in implementation it surfaced that §7.6 (per-module SEO landing pages, ~440 catalog-wide) and §9 (88 inline-modules fact sheets) directly contradicted each other. §9's inline-only shape muddled three reader concerns (market overview / per-module deployable unit / starter-kit bundle) into one document and forced module concepts into sub-headings where §7.6 wanted landing pages. Splitting into two artifact types lets each reader concern get its own focused page.

Affects §6.1 step 3, §8.4, §9 (the decision itself), §11 step 4, §11 step 5, §11 step 6, and the §13 progress checklist — all updated in this session.

### Session 2 — design sharpening (2026-05-23)

Notes from the second execution session that aren't just checklist ticks:

- **No domain-level Semantius coverage % rendered or stored.** §5.1, §5.3, §5.5, §5.6, §6.1 step 3, §11 step 4, and §12's validation gate all updated to drop the domain-level rollup. The per-module table IS the coverage view; averaging 100%-and-75% into 86% hides the actionable per-module split. Affects how the §7.7 skills pass is validated (internal consistency per skill, no ±5% sanity check against the retired average) and how the fact sheet emitter renders the coverage section in step 4 (per-module table only, no aggregate percentage).
- **Schema-loader gotchas surfaced and recorded in [.claude/skills/domain-map-analyst/SKILL.md](.claude/skills/domain-map-analyst/SKILL.md):**
  - `is_nullable` is a generated column; never pass it to `create_field`. Nullability is derived from omitting `input_type: "required"`.
  - `reference_delete_mode` for nullable FKs is `"clear"`, not `"set null"` or `"set_null"`.
  - SKILL.md rule #13 (catalog enums) now lists the values for `trigger_events.event_category` (use `state_change`, not `state_transition`), `handoffs.integration_pattern` (use `event_stream`, not `event_driven`; the table was `cross_domain_handoffs` at the time this session note was written, renamed 2026-05-24 per [plan-handoffs.md](plan-handoffs.md)), `handoffs.friction_level`, the role/necessity enums, and `record_status`. Future loaders should re-read SKILL.md rule #13 before authoring a new enum value.
  - SKILL.md rule #4b strengthened: no Python for *verification / count summaries* either — past gap where I piped JSON into `python -c '...'` for an ad-hoc count is now explicitly named.

### Sign-off and schema

- [x] §11 step 1 — Plan signed off (2026-05-23)
- [x] **Naming collision resolved (2026-05-23):** during execution, discovered `modules` collides with the Semantius platform's own `modules` table (entity in `module_id=1`, the admin/`_core` module). Renamed catalog table to `domain_modules`; junction tables to `domain_module_capabilities` / `domain_module_data_objects` / `domain_module_host_domains`; FK columns to `domain_module_id` / `source_domain_module_id` / `target_domain_module_id` / `domain_module_code` / `domain_module_name`. Applied across both [plan-modules.md](plan-modules.md) and [plan-roles.md](plan-roles.md). Naming notes added at the top of both files. `domain_starter_modules` kept unchanged. The catalog *concept* is still "a module" in prose; only the table/column identifiers carry the prefix.
- [x] §11 step 2 — Tenant sanity check confirmed via `semantius whoami` (org=`adenin`, api_baseurl=`https://adenin.semantius.ai`) per CLAUDE.md cwd rule
- [x] §11 step 2 — Schema migration applied (5 tables + 7 columns) — [.tmp_deploy/extend_modules_schema.ts](.tmp_deploy/extend_modules_schema.ts)
- [x] §11 step 2 — Schema verified via PostgREST: `/domain_modules`, `/domain_module_capabilities`, `/domain_module_data_objects`, `/domain_module_host_domains`, `/domain_starter_modules` all return empty arrays (not 404); all 7 new columns confirmed present in `/fields`

### ATS worked example (§7)

- [x] §11 step 3 — ATS modules loaded (8 rows) — ids 1–8, [.tmp_deploy/load_ats_modules.ts](.tmp_deploy/load_ats_modules.ts)
- [x] §11 step 3 — `domain_module_capabilities` loaded (10 rows total; `ATS-CANDIDATE-CRM` realizes 3 (SOURCING, CANDIDATE-EXP, AI-RECRUIT) and `ATS-RECRUITMENT-PIPELINE` realizes 2 (REQ-MGMT, CANDIDATE-EXP); `ATS-BACKGROUND-CHECKS` deliberately has 0, flagged in §10 TODO)
- [x] §11 step 3 — `domain_module_data_objects` loaded (29 rows: 4/2/2/6/5/4/3/3 per the 8 modules) with `(req)`/`(opt)` necessity on consumer/embedded_master rows per §4.4
- [x] §11 step 3 — `domain_starter_modules` loaded (2 rows: `ATS-CANDIDATE-CRM`, `ATS-RECRUITMENT-PIPELINE`)
- [x] §11 step 3 — `data_object_lifecycle_states.domain_module_id` annotated per §7.4 (`interviewing` → INTERVIEWS, `offer_extended` → OFFERS, `hired` → PRE-EMPLOYEE-RECORD)
- [x] §11 step 3 — `data_objects.minimum_embedded_shape` curated for `candidates` (1312 chars), `job_applications` (950), `job_offers` (937) per §7.5
- [x] §11 step 3 — 8 ATS per-module system skills authored with `skill_tools` re-linked per §7.7 — [.tmp_deploy/load_ats_module_skills.ts](.tmp_deploy/load_ats_module_skills.ts) (skill ids 127–134; 19 new tools + 48 skill_tools rows). Existing `ats-system` (id=16) stays in place until §12 D1.
- [x] §11 step 3 — Per-module coverage % matches §7.7 expected values (6 at 100%, OFFERS 83%, BACKGROUND-CHECKS 75%) — verified by the loader's internal-consistency check against §5.6 counting rule
- [x] §11 step 3 — `ATS-PRE-EMPLOYEE-RECORD → HCM-WORKER-RECORD` handoff loaded on `pre_employee.activated` per §6.1 note — handoff id=1037, trigger_event id=1183, `target_domain_module_id` left NULL until HCM is modularized
- [x] §11 step 3 — `pre_employees` data_object created (id=749) for ATS-PRE-EMPLOYEE-RECORD per §7.1 rename note
- [x] §11 step 3.5 — `permissions.domain_module_id` + `permissions.tier` columns added — [.tmp_deploy/extend_permissions_and_roles_schema.ts](.tmp_deploy/extend_permissions_and_roles_schema.ts)
- [x] §11 step 3.5 — Derived permissions materialized for the 8 ATS modules (48 rows: baseline tiers + workflow gates + pattern-flag overrides per §4.6 / §5) — [.tmp_deploy/load_ats_module_permissions.ts](.tmp_deploy/load_ats_module_permissions.ts)
- [x] §11 step 3.5 — Permission hierarchy edges loaded (40 edges, `origin='model'`): `<module>:admin` ⊃ `<module>:manage` ⊃ `<module>:read` + `<module>:admin` ⊃ every workflow gate / pattern-flag override per module
- [x] §11 step 4 — `generate_blueprints.ts` rewritten for two-pass shape (modules/ + starter-kits/, per §9 revised). Old per-domain fact sheet path and `_cross-cutting/` convention removed. Realizing-module permission attribution bug fixed mid-implementation (per §4.6: a lifecycle gate's slug is the realizing module's, not the master module's — affects both module pages and starter-kit pages).
- [x] §11 step 5 — `blueprints/modules/ats-*-semantic-blueprint.md` (8 files) + `blueprints/starter-kits/ats-semantic-blueprint.md` emitted; old `domain-fact-sheets/` tree deleted. Drift check via `--all --check` confirms idempotency. Architect review still pending.

### ITSM stress test (§8)

- [ ] §11 step 6 — ITSM-specific modules loaded (5 rows from §8.1)
- [ ] §11 step 6 — Cross-cutting modules loaded with `domain_modules.domain_id` set to primary home (KMS / NULL / etc.) per §4.5
- [ ] §11 step 6 — `domain_module_host_domains` rows for cross-cutting modules' additional hosts loaded
- [ ] §11 step 6 — `domain_starter_modules` for ITSM loaded (`ITSM-INCIDENT`, `ITSM-REQUEST`)
- [ ] §11 step 6 — Cross-cutting modules each have ONE system skill per §5.3 (not duplicated per host)
- [ ] §11 step 6 — `blueprints/modules/itsm-*-semantic-blueprint.md` + cross-cutting modules' per-module blueprints (`blueprints/modules/knowledge-mgmt-semantic-blueprint.md` etc.) emitted; `blueprints/starter-kits/itsm-semantic-blueprint.md` emitted with cross-cutting modules listed in the "Modules installable in this market" section
- [ ] §11 step 6 — Architect review of ITSM fact sheet

### Top-20 rollout (§11 step 7)

- [ ] §11 step 7 — Rollout decision made (proceed / pause / partial)
- [ ] §11 step 7 — Per-domain rollout (track each separately):
  - [ ] CRM
  - [ ] HCM
  - [ ] CMDB
  - [ ] LMS
  - [ ] CPQ
  - [ ] CSM
  - [ ] OMS
  - [ ] PSA
  - [ ] S2P
  - [ ] (continue list per [plan-generate-blueprints.md § 6.3](plan-generate-blueprints.md) order)

### SKILL.md update (§11 step 8)

- [ ] Phase A extension documented in `domain-map-analyst` SKILL.md
- [ ] Phase B extension documented
- [ ] Phase C extension documented (after `plan-roles.md` lands)
- [ ] Per-domain completeness checklist additions added
- [ ] Audit recipe extends to module-level invariants
- [ ] Anti-patterns added
- [ ] `interaction_level` authoring discipline added (post-`plan-roles.md`)

### Destructive batch (§12)

- [ ] Validation gate checks all pass (see §12 final paragraph)
- [ ] D1 — 22 retired domain-level system skills deleted (or marked deprecated)
- [ ] D2 — Verb-form lifecycle-gate permission rename batch executed; affected fact sheets re-emitted
- [ ] D3 — Capability-layer collapse to `domain_module_tags` (only if post-20-domain review triggered)
- [~] D3 (rename + rule-drop done; NOT-NULL flip on source/target_domain_module_id pending catalog-wide backfill). `cross_domain_handoffs` → `handoffs` rename, `cross_domain_only` validation rule dropped, `lifecycle_progression` added to `integration_pattern` enum (2026-05-24, [plan-handoffs.md](plan-handoffs.md)); NOT-NULL flip on `source_domain_module_id` / `target_domain_module_id` still gated on catalog-wide module-FK backfill
