# plan-domain-fact-sheets.md — Holistic-map extensions for per-domain fact sheets

> **Status:** design intent (stable). Operational status (what's done, what's next) lives in [plan-master-tasks.md](plan-master-tasks.md) once execution starts.
>
> **Scope:** extend `domain_map` so it carries enough information to emit a per-domain markdown fact sheet that `semantius-architect` (in `C:\dev\semantius-agent\.claude\skills\semantius-architect`) can consume verbatim, ensuring two architect runs of the same domain produce structurally identical semantic blueprints. This is the holistic-coverage layer that arbitrates naming, relationships, and design patterns across all domains so individual point-solution deployments stay consistent.
>
> **Triggering observation:** the catalog has accumulated bare-word naming collisions (`applications`, `offers`, `assessments`, `referrals` all sit unprefixed in ATS while five+ adjacent domains have prefixed cousins). The relationship graph the architect needs (`job_applications →schedules→ interviews`) is not derivable from a flat data_object list — two architect runs would produce different graphs. These are holistic-coverage failures, not architect-skill bugs.

---

## 1. The fact sheet contract

A **per-domain fact sheet** is a single markdown file emitted by a new generator. It is the contract between the holistic catalog (this skill) and the implementation layer (`semantius-architect`).

**Consumed by:** `semantius-architect` gains a new **Stage 0 — Load fact sheet if available**. When a fact sheet exists for the requested domain, architect loads it before asking the user anything and uses it to pre-populate entity list (Stage 3), intra-domain relationships (Stage 4), vendor template suggestion (Stage 2), aliases, permissions table, business rules, and cross-model links (§6).

**Emitted by:** a new `.tmp_deploy/emit_fact_sheet.ts <domain_code>` script that queries the catalog and renders markdown.

### Fact sheet sections

| § | Contents | Source |
|---|---|---|
| 1 | Domain identity, market positioning, behavioral-pattern summary (derived) | `domains` |
| 2 | Data object inventory: masters / embedded_masters / contributors / consumers / derived | `data_objects`, `domain_data_objects` |
| 3 | Aliases & industry synonyms per data_object | `data_object_aliases` |
| 4 | Intra-domain relationship graph (verb, cardinality, owner side) | `data_object_relationships` (extended) |
| 5 | Built-in edges (`users` and any future `kind='platform_builtin'` rows referencing this domain's data_objects) | `data_object_relationships` against seeded built-in rows |
| 6 | Cross-domain context: co-masters, handoffs (inbound/outbound), embedded dependencies, suggested cross-model links | `cross_domain_handoffs` + `domain_data_objects` (non-master) + cross-domain `data_object_relationships` |
| 7 | Lifecycle states per master data_object (intra-domain transitions) | `data_object_lifecycle_states` (NEW) |
| 8 | Workflow gates & business rules (derived from lifecycle states + pattern flags) | derived from `data_object_lifecycle_states` + `data_objects` flag columns |
| 9 | Capabilities (with delivery_strength matrix per solution) | `capabilities`, `capability_domains`, `solution_capabilities` |
| 10 | Solutions & vendors (with coverage_level + solution_kind) | `solutions`, `vendors`, `solution_domains`, `solution_data_objects` |
| 11 | Functional ownership (RACI from `business_functions`) | `business_function_domains`, `business_function_capabilities` |
| 12 | Regulatory & jurisdictional context | `domain_regulations`, `regulations`, `jurisdictions` |
| 13 | Architect handoff hints: recommended naming_mode, suggested vendor template | derived from §10 |

---

## 2. Gap analysis

Six concrete gaps. Each maps to schema or generator deliverables in §3–§5.

| # | Gap | Resolution |
|---|---|---|
| 1 | Naming authority is informal — bare words like `applications`, `offers`, `assessments`, `referrals` sit in ATS while adjacent domains had to take prefixed forms. No rule at insert time. | Schema: `is_canonical_bare_word` + rationale; Process: arbitration step in Phase B |
| 2 | Intra-domain relationships are sparse. `data_object_relationships` has no verb, no required-flag, no owner-side; mostly empty. | Schema: 3 new columns; Process: Phase B sub-step + mermaid preview in drafts |
| 3 | Platform built-ins (currently only `users`) cannot participate in relationship graphs. Not represented as `data_objects`. | Schema: `data_objects.kind` enum; seed the `users` row |
| 4 | Intra-domain lifecycle states are not captured. `trigger_events` only handles cross-domain edges. | Schema: new `data_object_lifecycle_states` table |
| 5 | Domain-pattern truths (workflow gates like `<slug>:approve_offer`, business rules like `feedback_edit_scope`, plural labels, embedded-master cluster routing) are not captured. Two architect runs produce different versions. | Schema: 5 boolean/text flags on `data_objects` + `requires_permission` on lifecycle states + `plural_label`; derivation rules in the fact sheet generator. **No new tables for these.** |
| 6 | `data_object_aliases` is under-used. No process rule requires populating it. | Process: Phase B sub-step requires ≥1 alias for non-self-explanatory masters |

---

## 3. Schema changes

All additive; no migrations needed. Apply via `semantius` field-creation tooling.

### 3.1 `data_objects` — new columns

| Column | Type | Purpose |
|---|---|---|
| `kind` | enum (`domain_owned` default / `platform_builtin`) | Discriminator so platform built-ins (only `users` initially — see §3.4) live in `data_objects` and participate in relationship graphs without polluting domain-level analytics. |
| `is_canonical_bare_word` | boolean (default false) | Explicit naming-authority claim. Bare-word inserts MUST set this true with user confirmation; else are forced-prefixed. |
| `naming_authority_rationale` | text | When `is_canonical_bare_word=true`, why this domain owns the unprefixed name. Surfaced in fact sheet collision-prevention notes. |
| `singular_label` | text | Human singular form. **Renamed from `display_label`** for parity with Semantius's `singular_label`/`plural_label` convention. Migration: copy `display_label` → `singular_label`, then drop `display_label`. Cascades through every loader script that references `display_label`. |
| `plural_label` | text | Human plural form (e.g. "Job Applications"). Required going forward. Backfill default = `singular_label + "s"` with per-row override for irregulars. |
| `has_personal_content` | boolean (default false) | Pattern flag: this entity has per-user-scoped content (e.g. interview feedback). Drives derived `view_all_*` / `manage_all_*` override permissions and a scoping business rule. |
| `has_submit_lock` | boolean (default false) | Pattern flag: this entity follows the submit-then-lock pattern. Drives derived `submit_<entity>` workflow gate and a `<rule>_restricted_to_<actor>` business rule. |
| `has_single_approver` | boolean (default false) | Pattern flag: this entity requires a single explicit approver. Drives derived approval workflow gate. |

> **Migration cascade for `display_label` → `singular_label`:** every `.tmp_deploy/load_*.ts` script that writes `display_label` must be updated. The rename is a sequenced three-step: (a) add `singular_label` column, copy values from `display_label`; (b) update all loader scripts to write `singular_label`; (c) drop `display_label` column. Run dry-run between (a) and (b) to confirm no loader regresses. **Step (c) — the column drop — is deferred to a dedicated final step (§9.1 Step 10) after the rest of the program has shipped and stabilized.** Keeping `display_label` alive alongside `singular_label` during the rollout means a loader regression is recoverable from the still-populated old column; dropping it last makes that safety net last as long as possible.

### 3.2 `data_object_relationships` — three new columns

| Column | Type | Purpose |
|---|---|---|
| `relationship_label` | text | Semantic verb (`schedules`, `extends`, `groups`, `owns`, `manages`). The verb that drives §4 of the fact sheet and the architect's relationship narrative. |
| `necessity` | enum (`required` / `optional`) | Required edges exist in every deployment of the domain; optional are deployment-shape-dependent. Combined with `kind` derives delete-mode (parent → cascade; reference + required → restrict; reference + optional → clear). |
| `owner_side` | enum (`source` / `target`) | Which side is the lifecycle owner. Matters for delete-cascade semantics architect derives. |

### 3.3 NEW table `data_object_lifecycle_states`

Intra-domain state machine per master data_object.

| Column | Type | Purpose |
|---|---|---|
| `data_object_id` | FK | The data_object this state belongs to |
| `state_name` | text | snake_case (`applied`, `screening`, `pending_approval`, `approved`, `hired`, `rejected`) |
| `state_order` | int | Sort order for fact sheet rendering |
| `description` | text | What this state means |
| `is_initial` | boolean | True for the entry state (typically one per data_object) |
| `is_terminal` | boolean | True for terminal states (no outgoing transitions) |
| `requires_permission` | boolean (default false) | True when reaching this state requires a workflow gate (drives derived `<slug>:<verb>_<entity>` permission) |
| `permission_verb_override` | text (optional) | Override the auto-derived verb. Rare; default is `<state_name>` (e.g. `approved → approve`); use override when verb differs (e.g. `hired → hire_candidate`). |

### 3.4 Built-in seed rows

Insert into `data_objects` with `kind='platform_builtin'`:

| Name | Singular label | Plural label | Notes |
|---|---|---|---|
| `users` | User | Users | The only true Semantius platform-owned entity in scope today. Referenced by every domain's `data_object_relationships` (assignees, authors, approvers). |

**Not seeded as platform built-ins:** `departments`, `roles`, `permissions`, `tenants`, `tags`, `attachments`, `audit_logs`, `notifications`. These are NOT universal platform tables in this catalog's tenant. When a domain needs `departments` (or any other shared concept), it gets modeled as a regular `data_objects` row with `kind='domain_owned'`, mastered by the owning domain (e.g. HCM masters `departments`), and other domains link via `embedded_master` or `consumer` rows. The deployer routing in §3.5 handles the rest.

The absence of a `master` row anywhere in `domain_data_objects` for a `kind='platform_builtin'` row tells the deployer "use Semantius's built-in table directly." This is currently only meaningful for `users`.

### 3.5 NOT adding (initially proposed, retracted after review)

- ~~`data_objects.master_cluster` text column~~ — redundant. The `master` role on `domain_data_objects` already supplies the cluster routing. Deployer query: for any `embedded_master` row, look up the data_object's `master` row to find the canonical owner domain. `cost_centers` → mastered by ERP-FIN; deployer routes there.
- ~~`domain_workflow_gates` table~~ — derivable from `data_object_lifecycle_states.requires_permission` + the pattern flags on `data_objects`. See §6 derivation rules.
- ~~`domain_business_rules` table~~ — same. Derivable from the pattern flags.
- ~~`data_object_state_transitions` table~~ — defer. State ordering via `state_order` is sufficient for first cut; explicit transition graph is a v2 add if needed.
- ~~`domain_terms` glossary table~~ — defer. Architect glossary is downstream concern.

**Net schema change: 8 new columns + 1 new table + 1 seed row + 1 column rename (`display_label` → `singular_label`).** Much less churn than the original draft.

---

## 4. Derivation rules (fact sheet generator)

The generator applies these rules at emit time. **No new tables** for permissions or business rules — they're computed from the schema additions in §3.

### 4.1 Baseline permission tier (every domain, deterministic)

For every domain `<slug>`, emit:

| Permission | Type | Description |
|---|---|---|
| `<slug>:read` | baseline-read | Read access to every entity in the module |
| `<slug>:manage` | baseline-manage | Edit operational records |
| `<slug>:admin` | baseline-admin | Edit reference data + inherit all workflow gates |

### 4.2 Workflow gates from lifecycle states

For every `data_object_lifecycle_states` row where `requires_permission=true`:

```
<slug>:<verb>_<entity_singular>
```

where `<verb>` = `permission_verb_override` if set, else `state_name`. Example: `job_offers` with `pending_approval → approved` (requires_permission=true, no override) emits `ats:approve_offer`. `job_applications` with `→ hired` (requires_permission=true, override=`hire_candidate`) emits `ats:hire_candidate`.

### 4.3 Pattern-flag derived gates & rules

For every `data_objects` row with pattern flags set:

| Flag | Emits permission(s) | Emits business rule |
|---|---|---|
| `has_personal_content=true` | `<slug>:view_all_<entity_plural>`, `<slug>:manage_all_<entity_plural>` | `<entity>_edit_scope` (row-scope by default, override via view_all/manage_all) |
| `has_submit_lock=true` | `<slug>:submit_<entity_singular>` (override permission) | `submit_restricted_to_<owner_actor>` (where owner is inferred from the FK-to-user relationship) |
| `has_single_approver=true` | (uses the approval gate from §4.2) | `approve_<entity>_requires_approver` |

### 4.4 Workflow-narrow edit permissions

When a `data_object` has `has_personal_content=true`, its `edit_permission` defaults to a workflow-narrow gate scoped to row authorship (e.g., `ats:interview` for external panelists editing only their own feedback). Generator emits this as part of the permission table.

### 4.5 Inheritance

`<slug>:admin` automatically includes every workflow gate emitted by §4.2 + §4.3. Generator renders the "Included in" column accordingly.

### 4.6 §1 behavioral-pattern prose

Composed from the same flags + relationships:

- `has_personal_content=true` on multiple entities → "with personal-content scoping on \<entity-list\>"
- `has_submit_lock=true` on `interview_feedback` → "per-interviewer scorecards that lock on submit"
- `has_single_approver=true` on `job_offers` → "single-approver offer flow"
- `interview_panelists` junction exists between `interviews` and `users` → "panel-interview pattern"

The generator chains these into one or two sentences appended to the `domains.description`.

---

## 5. Process / SKILL.md changes

Four rule additions, one Phase B contract expansion.

### 5.1 NEW Rule #9 — Naming arbitration at insert time

Every proposed `data_object_name` triggers a substring search against existing `data_objects.data_object_name`. If a collision-pattern is detected (proposed name is a substring of an existing name OR vice versa OR shares the same singular form), the loader MUST surface the conflict and ask the user to either:
- (a) prefix the new name (default)
- (b) claim `is_canonical_bare_word=true` with rationale
- (c) abort

No silent inserts of collision-prone names.

### 5.2 NEW Rule #10 — Built-in edges are first-class

When a domain's data_objects reference platform built-ins (currently only `users` — as assignee, creator, approver, author, etc.), the relationship MUST be recorded in `data_object_relationships` against the seeded `users` row. Architect cannot guess these from naming. The same rule applies if additional `kind='platform_builtin'` rows are seeded in the future.

### 5.3 NEW Rule #11 — Embedded master integrity

Every `domain_data_objects` row with `role='embedded_master'` requires that the same `data_object_id` has a `master` row somewhere in `domain_data_objects` (or the data_object has `kind='platform_builtin'`). The deployer relies on this to find the canonical master at deploy time. Loaders MUST validate before inserting an `embedded_master` row.

### 5.4 MODIFIED Phase B contract

Phase B expands from `{data_objects, domain_data_objects, cross_domain_handoffs}` to:

1. `data_objects` (existing)
2. `domain_data_objects` (existing)
3. `cross_domain_handoffs` (existing)
4. **NEW** `data_object_relationships` — intra-domain edges + built-in edges + cross-domain edges where a payload-to-target mapping is clear (every `cross_domain_handoffs` row with a clean payload should also have a corresponding `data_object_relationships` row for architect §6)
5. **NEW** `data_object_aliases` — ≥1 alias for any non-self-explanatory master
6. **NEW** `data_object_lifecycle_states` + pattern flags on `data_objects` (`has_personal_content`, `has_submit_lock`, `has_single_approver`) — for `master + required` data_objects. **Required on every new domain load going forward.** Loading a market without these is permitted only when explicitly noted in `plan-master-tasks.md` as a deferred backfill, with the domain code added to a tracked lifecycle-states-pending list. See Rule #12.

Drafts MUST surface the relationship graph as a mermaid block in the Phase-B preview before loading.

### 5.5 NEW Rule #12 — Lifecycle states and pattern flags are part of Phase B

Every new domain load MUST include lifecycle states + pattern flags for its `master + required` data_objects, OR the domain code MUST be added to the lifecycle-states-pending tracking section of `plan-master-tasks.md` with an explicit backfill commitment. Defaulting to "I'll do it later" without the tracking entry is not permitted — undocumented gaps silently degrade fact sheet quality. The Phase B3 initial backfill (top 20 implementation-relevant domains) is a one-time catchup; from then on every market load adds these contemporaneously.

### 5.6 MODIFIED naming convention table

Split into three rows:

| Naming choice | When |
|---|---|
| Domain-prefixed (default) | New market loads, anything not crossing ≥3 domains |
| Domain-neutral cross-cutting (no prefix, plural-noun-only) | Capability spans ≥3 domains AND vendors market the same shape across them |
| Canonical bare-word (requires `is_canonical_bare_word=true` claim) | The data_object holds the catalog-wide canonical authority for the bare noun |

---

## 6. Backfill plan

Three ordered phases. Each phase is a single `.tmp_deploy/` loader, idempotent, with dry-run support.

### 6.1 Phase B1 — Bare-word audit & rename

Identify every `data_objects` row whose name is a bare noun and where (a) no `is_canonical_bare_word` claim exists, AND (b) any catalog row exists with the same noun as a prefix OR the noun appears in ≥2 other domain contexts.

Known collisions to address:

| Current name | Proposed rename | Cascade impact |
|---|---|---|
| `applications` (id 4, ATS) | `job_applications` | `domain_data_objects`, `solution_data_objects`, `cross_domain_handoffs.data_object_id`, `trigger_events.data_object_id`, event names |
| `offers` (id 11, ATS) | `job_offers` | same + `offer.accepted` → `job_offer.accepted` |
| `assessments` (id 10, ATS) | `candidate_assessments` | same |
| `referrals` (id 6, ATS) | `candidate_referrals` | same |
| `documents` (id 429) | TBD — query owner first; may be canonical | depends |

Audit query in the loader catches additional cases. **Run the audit, surface the proposed rename list to the user, get explicit per-rename confirmation, then load.**

**Prerequisite:** before the rename loader runs, build a rename-cascade utility and test it against one low-stakes rename. The cascade across `domain_data_objects` / `solution_data_objects` / `cross_domain_handoffs` / `trigger_events` / event-name strings has multiple failure modes; orphan rows would break Signal 1 and Signal 2 silently.

### 6.2 Phase B2 — Built-in seed + relationship-graph population

1. Seed the single `users` `data_objects` row with `kind='platform_builtin'`.
2. For each domain that has Phase-B masters loaded, draft the intra-domain relationship graph + `users` edges in mermaid; surface for user review; load into `data_object_relationships` (with verb + cardinality + necessity + owner_side).
3. Also load cross-domain `data_object_relationships` for every `cross_domain_handoffs` row with a clean payload→target mapping (e.g. `candidates →becomes→ employees`, `job_offers →spawns→ onboarding_journeys`).
4. Order: start with the 23 domains that already have system skills (most reviewed), then the ~25 with thick Phase-B masters, then the rest as Phase-B Lite catches up.

### 6.3 Phase B3 — Lifecycle states + pattern flags

Selective rollout. Run only for `master + required` data_objects in the top ~20 most-implementation-relevant domains (CRM, ITSM, HCM, ATS, ITAM, S2P, OMS, SUB-MGMT, COMP-MGMT, BEN-ADMIN, ONBOARDING, LMS, PAYROLL, FSM, CSM, CMDB, KMS, CPQ, ESIGN, INC-MGMT). Defer the long tail.

For each in-scope master data_object:
- Author the lifecycle states list (with `is_initial`/`is_terminal`/`requires_permission` flags + `permission_verb_override` where needed)
- Set the pattern flags on the data_object (`has_personal_content`, `has_submit_lock`, `has_single_approver`)
- User confirms before insert

---

## 7. Fact sheet generator

New script: `.tmp_deploy/emit_fact_sheet.ts <domain_code> [--out path] [--all]`.

- Reads every section from §1's contract via PostgREST queries (no cube — single-row joins, not aggregation)
- Renders markdown with stable section ordering matching the contract
- Embeds the relationship graph as mermaid
- Applies §4 derivation rules to emit the permissions table, business rules, and §1 behavioral-pattern prose
- Writes to `domain-fact-sheets/<domain_code>.md` (**committed to git** — PR-reviewable snapshots) or to a path the user specifies via `--out`
- Idempotent: re-running overwrites; diff-friendly output (stable ordering, snake_case sorts) so a PR shows real catalog changes cleanly
- Optional `--all` mode emits one file per domain (for bulk regeneration after schema/load changes)
- **Drift management:** because the files are committed, a PR's diff is the surface where catalog vs file divergence becomes visible. Add a CI check (or pre-commit hook) that runs `--all` in dry-run and fails if any fact sheet would change without a corresponding regeneration commit. This prevents stale fact sheets from accumulating silently.

---

## 8. Architect integration (contract-only)

This repo ships the **fact sheet contract** (§1 sections + the generator's output format). The architect-side adoption is **not** drafted here. The `semantius-architect` maintainer adapts that skill separately when ready, using the committed fact sheets as the input format.

**What the contract guarantees:**

1. Fact sheet file path: `domain-fact-sheets/<DOMAIN_CODE>.md` (committed, regeneratable)
2. Section ordering: per §1 contract table (§1 → §13)
3. Stable markdown shape per section (tables, mermaid blocks, key-value lists) — architect can parse deterministically
4. Permissions table format per §4 derivation rules
5. Relationship table format per §3.2 column shape (verb + cardinality + necessity + owner_side)
6. Aliases shape per `data_object_aliases` schema
7. Cross-domain context per Appendix A worked sample

**What architect adoption looks like (out of scope for this plan, listed for context):** a new Stage 0 in `semantius-architect/SKILL.md` that detects a fact sheet, parses it, and pre-populates Stages 2/3/4. That work is owned by the `semantius-agent` repo and ships independently. As long as both sides honour the contract above, divergence stays bounded.

**Contract direction:** architect consumes the fact sheet, never writes back to the catalog. Any drift from architect work returns to the analyst skill via the user, not via direct catalog writes.

---

## 9. Sequencing

| Step | Depends on | Effort |
|---|---|---|
| 1. SKILL.md updates (rules #9-#12 + Phase B contract expansion) | — | small |
| 2. Schema changes (8 new columns + 1 new table + 1 seed row + `display_label` → `singular_label` rename cascade) | — | small (additive) + medium (loader cascade) |
| 3. Build rename-cascade utility + test against one low-stakes rename | 2 | small |
| 4. Phase B1 — full-catalog bare-word audit & rename | 2, 3 | medium (cascade across 4-5 tables) |
| 5. Phase B2 — relationship-graph backfill for top 23 domains (intra-domain + `users` edges + cross-domain payload-clean edges) | 1, 2, 4 | medium-large (~25 mermaid graphs to author + review) |
| 6. Fact sheet generator script + CI drift-check | 2, 5 (partial) | small |
| 7. First fact sheet emission for ATS (proof-of-concept; commit to `domain-fact-sheets/ATS.md`) | 2, 4, 5, 6 | small |
| 8. Phase B3 — lifecycle states + pattern flags for top 20 implementation-relevant domains | 5 | large; one-time backfill |
| 9. Phase B2 for the long tail | 5, ongoing | large; interleaves with normal market loads |
| 10. Drop `display_label` column (deferred destructive cleanup) | 2 done + 3–9 stable | small; runs last, requires explicit confirmation |

Steps 1–7 form the **MVP path** — once 7 ships, ATS has a complete committed fact sheet and the contract is provable. Steps 8–9 are catalog-wide quality improvements. **Step 10 is the deferred destructive cleanup** of the `display_label` column: kept until last so the duplicated column survives as a recovery safety net through the rest of the program. **Architect-side Stage 0 adoption is out of scope** (Decision 6) and proceeds independently in the `semantius-agent` repo.

### 9.1 Execution checklist

> Tick each box as it completes. Update this file inline; don't track status in memory or a sibling file. Substeps marked `→` are checkpoints inside a larger step.

**Step 1 — SKILL.md updates** (small)

- [ ] Add Rule #9 (naming arbitration at insert time) to `.claude/skills/domain-map-analyst/SKILL.md`
- [ ] Add Rule #10 (built-in edges are first-class)
- [ ] Add Rule #11 (embedded-master integrity — every `embedded_master` row needs a matching `master` row somewhere or `kind='platform_builtin'`)
- [ ] Add Rule #12 (lifecycle states + pattern flags are part of Phase B; deferral requires a tracked entry)
- [ ] Update Phase B contract section to reflect the 6-deliverable shape
- [ ] Update naming convention table (three-row form: domain-prefixed / domain-neutral / canonical bare-word)

**Step 2 — Schema changes** (small additive + medium loader cascade)

- [ ] Add `data_objects.kind` enum (`domain_owned` / `platform_builtin`)
- [ ] Add `data_objects.is_canonical_bare_word` boolean
- [ ] Add `data_objects.naming_authority_rationale` text
- [ ] Add `data_objects.singular_label` text (copy from `display_label`)
- [ ] Add `data_objects.plural_label` text
- [ ] Add `data_objects.has_personal_content` boolean
- [ ] Add `data_objects.has_submit_lock` boolean
- [ ] Add `data_objects.has_single_approver` boolean
- [ ] Add `data_object_relationships.relationship_label` text
- [ ] Add `data_object_relationships.necessity` enum (`required` / `optional`)
- [ ] Add `data_object_relationships.owner_side` enum (`source` / `target`)
- [ ] Create `data_object_lifecycle_states` table (8 columns per §3.3)
- [ ] Seed the `users` row with `kind='platform_builtin'`
- [ ] → Update every `.tmp_deploy/load_*.ts` loader that writes `display_label` to write `singular_label` instead
- [ ] → Verify no loader regresses against a dry run
- [ ] *(Dropping `display_label` is deferred — see Step 10. Keep both columns populated through Steps 3–9 as a recovery safety net.)*

**Step 3 — Rename-cascade utility** (small)

- [ ] Build the utility script (single rename + cascade across `data_objects`, `domain_data_objects`, `solution_data_objects`, `cross_domain_handoffs.data_object_id`, `trigger_events.data_object_id`, `trigger_events.event_name`)
- [ ] Pick one low-stakes rename and run the utility end-to-end as the dry run
- [ ] Verify no orphan rows; commit utility to `.tmp_deploy/`

**Step 4 — Phase B1 bare-word audit & rename** (medium)

- [ ] Write the bare-word audit query; capture the proposed-rename list
- [ ] Surface the list to user for per-rename confirmation
- [ ] Run the rename cascade utility for each confirmed rename
- [ ] Verify final state: every bare-word `data_object_name` either has `is_canonical_bare_word=true` or has been renamed

**Step 5 — Phase B2 relationship-graph backfill (top 23 system-skill domains)** (medium-large)

- [ ] Draft intra-domain + cross-domain + `users` edges (with verb + cardinality + necessity + owner_side) for each of the 23 domains; mermaid block per domain
- [ ] Surface for user review, one cluster at a time (HR cluster, IT cluster, Sales cluster, etc.)
- [ ] Load `data_object_relationships` rows with `record_status='new'`
- [ ] Backfill `data_object_aliases` (≥1 alias per non-self-explanatory master) for the same 23 domains

**Step 6 — Fact sheet generator + CI drift check** (small)

- [ ] Build `.tmp_deploy/emit_fact_sheet.ts <domain_code>`
- [ ] Implement §4 derivation rules (baseline tier + lifecycle-derived gates + flag-derived rules + §1 narrative composition)
- [ ] Implement `--all` mode
- [ ] Add CI / pre-commit drift check that runs `--all` in dry-run mode

**Step 7 — First fact sheet emission for ATS** (small)

- [ ] Run the generator for ATS
- [ ] Commit `domain-fact-sheets/ATS.md`
- [ ] Compare against the architect-produced ATS blueprint; confirm structural parity on entity list, relationship graph, permissions table

**Step 8 — Phase B3 (lifecycle states + pattern flags) for top 20 domains** (large; one-time backfill)

- [ ] Author lifecycle states for each of: CRM, ITSM, HCM, ATS, ITAM, S2P, OMS, SUB-MGMT, COMP-MGMT, BEN-ADMIN, ONBOARDING, LMS, PAYROLL, FSM, CSM, CMDB, KMS, CPQ, ESIGN, INC-MGMT
- [ ] Set pattern flags (`has_personal_content`, `has_submit_lock`, `has_single_approver`) on each domain's relevant data_objects
- [ ] Regenerate fact sheets for the top 20 to verify the §4 derivation rules produce the expected permissions tables

**Step 9 — Phase B2 long tail** (large; ongoing)

- [ ] Track remaining domains in `plan-master-tasks.md` lifecycle-states-pending section
- [ ] Backfill incrementally as market loads proceed; no hard deadline

**Step 10 — Drop `display_label` column** (small; deferred destructive cleanup)

> Run only after Steps 1–9 have shipped and `singular_label` has been the de-facto label column long enough for any latent loader regressions to surface. Until then `display_label` stays populated as a recovery safety net.

- [ ] Confirm zero `.tmp_deploy/load_*.ts` scripts still write `display_label` (`grep -r "display_label" .tmp_deploy/` should return nothing actionable)
- [ ] Confirm no view / computed field / cube reference still reads `display_label`
- [ ] Confirm `singular_label` is populated for every `data_objects` row (`/data_objects?singular_label=is.null&select=id` returns empty)
- [ ] **Explicit user confirmation** that the drop is safe to execute (rule: destructive schema ops never proceed on standing approval)
- [ ] Drop the `display_label` column
- [ ] Spot-check the UI on a few `data_objects` rows; confirm the singular label renders via `singular_label`

---

## 10. Decisions settled (2026-05-22)

| Decision | Resolution |
|---|---|
| `display_label` rename | **Rename + add plural** — rename `display_label` → `singular_label` AND add `plural_label`. Sequenced three-step cascade through every loader script (see §3.1 migration note): add column + copy values, then update loaders, then drop the old column. **The drop is deferred to §9.1 Step 10** so `display_label` stays alive as a recovery safety net through the rest of the program. |
| Bare-word rename scope | **Full catalog audit** — audit every bare-word `data_object_name` in Phase B1; rename any without an explicit `is_canonical_bare_word` claim. Eliminates the problem class. |
| `record_status` on backfill | **`new` (default)** — backfilled rows enter with `record_status='new'`; user bulk-approves per-domain after review. Consistent with SKILL.md Rule #1. |
| Phase B3 scope | **Top 20 implementation-relevant domains** for the one-time backfill, **plus** Rule #12 (§5.5) requiring every future market load to include lifecycle states + pattern flags contemporaneously OR add to a tracked deferred-backfill list. |
| Fact sheet location | **Committed `domain-fact-sheets/`** at repo root. PR-reviewable snapshots. Drift managed via CI dry-run check (§7). |
| Architect skill update | **Contract-only** — this repo ships the fact sheet contract (§8). The `semantius-agent` repo adopts Stage 0 independently when ready; no coordinated PR drafted here. |
| Built-in seed list | **Only `users`** — the only true Semantius platform-owned entity in scope. `departments`, `roles`, etc. are NOT seeded as platform built-ins; they get modeled as regular domain-owned `data_objects` by their owning domain when needed. |

---

## 11. Out of scope (explicitly NOT in this plan)

- Field-level entity specs (architect's job — fact sheet stays at relationship granularity)
- UI hints, permissions JsonLogic, computed-field expressions (architect's job)
- New analytical rollups beyond what `necessity` already enables
- Renaming domain codes themselves (only `data_object_name` collisions in scope)
- Cross-tenant fact sheet sharing / publishing (the script writes a local file; distribution is downstream)
- Auto-regeneration on write (manual command stays the default; future enhancement)
- Domain-specific glossary table (`domain_terms`) — defer until concrete need

---

## 12. Acceptance criteria

The plan is complete when:

- ATS has a fact sheet at `domain-fact-sheets/ATS.md` that contains every section of §1's contract, with the relationship graph reproduced from `data_object_relationships` and the permissions table derived from the lifecycle states + pattern flags.
- The full-catalog bare-word audit has completed; every bare-word `data_object_name` either carries an explicit `is_canonical_bare_word=true` claim with rationale, or has been renamed and cascade-fixed across `domain_data_objects`, `solution_data_objects`, `cross_domain_handoffs.data_object_id`, and `trigger_events.data_object_id`.
- SKILL.md has rules #9, #10, #11, #12 so future loads can't reintroduce the gaps that prompted this plan.
- The fact sheet for ATS is comprehensive enough that a downstream architect skill, consuming only it, can produce a structurally consistent semantic blueprint without re-deriving naming, relationships, permissions, or business rules.
