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

### Fact sheet shape

Every fact sheet starts with a **YAML frontmatter block** carrying the architect-facing index (artifact tag, version, domain_code/name/slug, generated_at, generator path, source label, the seven `domains` metadata fields, counts, `related_domains` list, and the `entities` list). The frontmatter is the part agents parse without reading the body.

The body is 13 numbered sections:

| § | Title | Contents | Source |
|---|---|---|---|
| 1 | Overview | Multi-paragraph composed narrative: description + capabilities surface, logic beyond CRUD, market positioning (cost band + min org size + US TAM + flagship vendors), organizational fit (RACI), footprint and pattern (master count + pattern-flag prose) | `domains`, `capabilities`, `solution_domains`, `business_function_domains`, master pattern flags |
| 2 | Entity summary | Single quick-overview table (Name = `plural_label`, Description) **plus** a single colored mermaid graph with one classDef per role (master / embedded_master / contributor / consumer / derived / platform_builtin) and intra-domain + `users` edges | `domain_data_objects`, `data_objects`, `data_object_relationships` |
| 3 | Data object inventory | **One** unified table with columns: # · Name (plural) · Role · Necessity · Canonical? · Pattern flags · Notes/slice. Sorted by role rank, then alphabetical | `domain_data_objects`, `data_objects` |
| 4 | Aliases and industry synonyms | Aliases for any data_object in scope | `data_object_aliases` |
| 5 | Relationships | 5.1 intra-domain, 5.2 built-in edges (`users` and future `kind='platform_builtin'` rows), 5.3 cross-domain `data_object_relationships` | `data_object_relationships` |
| 6 | Cross-domain context | 6.1 co-masters, 6.2 outbound handoffs, 6.3 inbound handoffs, 6.4 embedded/contributing/consuming dependencies with canonical owner domains | `handoffs`, `domain_data_objects` |
| 7 | Lifecycle states | Per master data_object: state table with `requires_permission` and `permission_verb_override` derivation visible | `data_object_lifecycle_states` |
| 8 | Permissions and business rules (derived) | 8.1 permissions table (baseline tier + lifecycle gates + pattern-flag gates, with `:admin` inclusion column); 8.2 business rules from pattern flags | derived from `data_objects` flags + `data_object_lifecycle_states` |
| 9 | Capabilities | Capability list + 9.1 delivery-strength matrix (solution × capability) | `capabilities`, `capability_domains`, `solution_capabilities` |
| 10 | Solutions and vendors | With `coverage_level` and `solution_kind` | `solutions`, `vendors`, `solution_domains` |
| 11 | Functional ownership (RACI) | 11.1 domain-level; 11.2 capability-level overrides | `business_function_domains`, `business_function_capabilities` |
| 12 | Regulatory and jurisdictional context | | `domain_regulations`, `regulations`, `jurisdictions` |
| 13 | Architect handoff hints | `module_slug_suggestion`, `naming_mode`, `suggested_vendor_template` (with rationale) | derived |

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

Phase B expands from `{data_objects, domain_data_objects, handoffs}` to:

1. `data_objects` (existing)
2. `domain_data_objects` (existing)
3. `handoffs` (existing)
4. **NEW** `data_object_relationships` — intra-domain edges + built-in edges + cross-domain edges where a payload-to-target mapping is clear (every `handoffs` row with a clean payload should also have a corresponding `data_object_relationships` row for architect §6)
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
| `applications` (id 4, ATS) | `job_applications` | `domain_data_objects`, `solution_data_objects`, `handoffs.data_object_id`, `trigger_events.data_object_id`, event names |
| `offers` (id 11, ATS) | `job_offers` | same + `offer.accepted` → `job_offer.accepted` |
| `assessments` (id 10, ATS) | `candidate_assessments` | same |
| `referrals` (id 6, ATS) | `candidate_referrals` | same |
| `documents` (id 429) | TBD — query owner first; may be canonical | depends |

Audit query in the loader catches additional cases. **Run the audit, surface the proposed rename list to the user, get explicit per-rename confirmation, then load.**

**Prerequisite:** before the rename loader runs, build a rename-cascade utility and test it against one low-stakes rename. The cascade across `domain_data_objects` / `solution_data_objects` / `handoffs` / `trigger_events` / event-name strings has multiple failure modes; orphan rows would break Signal 1 and Signal 2 silently.

### 6.2 Phase B2 — Built-in seed + relationship-graph population

1. Seed the single `users` `data_objects` row with `kind='platform_builtin'`.
2. For each domain that has Phase-B masters loaded, draft the intra-domain relationship graph + `users` edges in mermaid; surface for user review; load into `data_object_relationships` (with verb + cardinality + necessity + owner_side).
3. Also load cross-domain `data_object_relationships` for every `handoffs` row with a clean payload→target mapping (e.g. `candidates →becomes→ employees`, `job_offers →spawns→ onboarding_journeys`).
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

**Step 1 — SKILL.md updates** (small) ✓ 2026-05-22

- [x] Add Rule #9 (naming arbitration at insert time) to `.claude/skills/domain-map-analyst/SKILL.md`
- [x] Add Rule #10 (built-in edges are first-class)
- [x] Add Rule #11 (embedded-master integrity — every `embedded_master` row needs a matching `master` row somewhere or `kind='platform_builtin'`)
- [x] Add Rule #12 (lifecycle states + pattern flags are part of Phase B; deferral requires a tracked entry)
- [x] Update Phase B contract section to reflect the 6-deliverable shape
- [x] Update naming convention table (three-row form: domain-prefixed / domain-neutral / canonical bare-word)

**Step 2 — Schema changes** (small additive + medium loader cascade) ✓ 2026-05-22

- [x] Add `data_objects.kind` enum (`domain_owned` / `platform_builtin`)
- [x] Add `data_objects.is_canonical_bare_word` boolean
- [x] Add `data_objects.naming_authority_rationale` text
- [x] Add `data_objects.singular_label` text (copy from `display_label`) — 746 rows backfilled
- [x] Add `data_objects.plural_label` text — 746 rows backfilled via naive pluralization (irregulars left for manual review; see Note A)
- [x] Add `data_objects.has_personal_content` boolean
- [x] Add `data_objects.has_submit_lock` boolean
- [x] Add `data_objects.has_single_approver` boolean
- [x] ~~Add `data_object_relationships.relationship_label` text~~ — **already exists as `relationship_verb`**; the plan's `relationship_label` is satisfied by that column. See Note B.
- [x] ~~Add `data_object_relationships.necessity` enum (`required` / `optional`)~~ — **already exists as `is_required` boolean** with equivalent semantics. See Note B.
- [x] Add `data_object_relationships.owner_side` enum (`source` / `target`)
- [x] Create `data_object_lifecycle_states` table (10 columns total — 8 from §3.3 + `notes` + `record_status` for module consistency)
- [x] Seed the `users` row with `kind='platform_builtin'` (id=748, `is_canonical_bare_word=true`)
- [x] → Update every `.tmp_deploy/load_*.ts` loader that writes `display_label` to also write `singular_label` + `plural_label` (additive — display_label retained transitionally). Script: [.tmp_deploy/update_loaders_for_singular_label.ts](.tmp_deploy/update_loaders_for_singular_label.ts) + cleanup pass [.tmp_deploy/cleanup_duplicate_label_annotations.ts](.tmp_deploy/cleanup_duplicate_label_annotations.ts) + type-decl pass [.tmp_deploy/update_type_decls_for_labels.ts](.tmp_deploy/update_type_decls_for_labels.ts). 31 files / 505 annotated sites. Variable-driven sites (`display_label: o.label`) intentionally NOT patched (would require source-data shape changes; rows are already backfilled, so re-run risk is bounded). See Note C.
- [x] → Verify no loader regresses against a dry run (spot-checked `load_phase_b_full.ts`, `load_smm_data_objects.ts`, `load_p15e_customer_handoffs.ts` — all parse and re-run idempotently; pre-existing `load_ats_data_objects.ts` breakage on the renamed `mastery_role → role` column is unrelated to this work)
- [ ] *(Dropping `display_label` is deferred — see Step 10. Keep both columns populated through Steps 3–9 as a recovery safety net.)*

**Notes from execution:**

- **Note A — Naive pluralization quirks.** The backfill applied a naive pluralization rule (consonant+`y` → `ies`; `s`/`x`/`z`/`ch`/`sh` → `+es`; else `+s`). A handful of `plural_label` values came out awkward where the singular form was already plural-shaped (e.g. `"Queue Statistics"` → `"Queue Statisticses"`) or had domain-specific conventions (acronyms, mass nouns). A pre–Phase B3 cleanup pass should query for plural_label values ending in unusual patterns and fix the irregulars manually.
- **Note B — Relationships schema consolidation.** `data_object_relationships` already shipped with `relationship_verb` (text, e.g. `owns`, `manages`, `schedules`) and `is_required` (boolean) before this plan landed. Rather than add parallel `relationship_label` and `necessity` columns, this step treats the existing fields as authoritative — the fact sheet generator (§7) reads `relationship_verb` for the §4 verb column and maps `is_required=true/false` to `necessity=required/optional`. Only `owner_side` was genuinely new. The plan §3.2 column list is over-stated by two rows; this Note serves as the reconciliation.
- **Note C — Loader cascade scope.** The mechanical sweep patched 505 `display_label: "X"` literal sites across 31 loaders. ~8 additional sites use variable-driven shapes (`display_label: o.display_label`, `display_label: m.label`) that need source-data changes to forward `singular_label`/`plural_label`. Those are confined to one-time historical loaders whose target rows were already backfilled, so the residual re-run risk is low. If a future re-run of one of those loaders is anticipated, patch the source-data shape first.

**Step 3 — Rename-cascade utility** (small) ✓ 2026-05-22

- [x] Build the utility script — [.tmp_deploy/rename_data_object.ts](.tmp_deploy/rename_data_object.ts). Default mode is dry-run; pass `--execute` to apply. Pre-flight checks the new name is free and rewritten event_names don't collide. The cascade is genuinely small: every downstream junction (`domain_data_objects`, `solution_data_objects`, `handoffs`, `data_object_relationships`, `data_object_aliases`, `data_object_lifecycle_states`) references the data_object by `id`, so the only string-side cascade is `trigger_events.event_name` (singular-prefix rewrite).
- [x] Pick one low-stakes rename and run the utility end-to-end as the dry run — chose `referrals` → `candidate_referrals` (ATS, id=6; one of the Phase B1 targets in §6.1). Dry-run output: 1 data_objects rename + 2 trigger_events (`referral.submitted` → `candidate_referral.submitted`, `referral.bonus_earned` → `candidate_referral.bonus_earned`); no FK changes needed; no collisions; 1 `domain_data_objects` row and 2 `handoffs` rows already FK-linked by id.
- [x] Verify no orphan rows; commit utility to `.tmp_deploy/` — dry-run cleanly enumerates every cascade target with zero orphans flagged. The utility prints `✗ COLLISION` lines when a target event_name would collide and exits non-zero before any write, so a live run is safe.

**Step 4 — Phase B1 bare-word audit & rename** (medium) ✓ 2026-05-22

- [x] Write the bare-word audit query; capture the proposed-rename list — script: [.tmp_deploy/audit_bare_words.ts](.tmp_deploy/audit_bare_words.ts) (classifies into prefix-clash / multi-domain / clear tiers; writes `.tmp_deploy/bare_word_audit_report.md`). Initial scan: 747 data_objects rows, 58 bare-word candidates (25 prefix-clash, 9 multi-domain, 24 clear).
- [x] Surface the list to user for per-rename confirmation — drafted [.tmp_deploy/bare_word_proposal.md](.tmp_deploy/bare_word_proposal.md). User feedback inverted the default: **prefix is the default** for any term with cross-domain ambiguity in the broader SaaS landscape; canonical claims reserved for genuinely unambiguous single-meaning terms (e.g. `influencers`, `courses`, `ontologies`, `milkings`). User also chose canonical (with federated-master rationale) for `customers`/`employees`/`suppliers` rather than a decorative `master_*` prefix. Final decision: 43 renames + 14 canonical claims, zero defers.
- [x] Run the rename cascade utility for each confirmed rename — batch executor: [.tmp_deploy/apply_bare_word_decisions.ts](.tmp_deploy/apply_bare_word_decisions.ts) (inlines the rename + canonical decision tables, pre-flights the whole batch against live state before any writes, then applies on `--execute`). Executed: 43 data_object renames + 81 trigger_events.event_name rewrites + 14 canonical PATCHes. One row (`tenants` → `property_tenants`) was missed in the batch list due to a renumbering bug in the proposal — caught by the post-execute audit and fixed with a single-row run of `rename_data_object.ts`. Final tally: **44 renames + 14 canonical claims** applied. See Note D.
- [x] Verify final state: every bare-word `data_object_name` either has `is_canonical_bare_word=true` or has been renamed — re-ran the audit, returned `bare-word candidates: 0` across all three tiers.

**Notes from execution:**

- **Note D — Tenants miss-and-fix.** The `tenants` (358) row was listed in the proposal's Tier B.3 table but accidentally dropped from the alphabetical rename summary during a renumbering edit. The executor used the summary list (hardcoded) and silently skipped it. The post-execute audit immediately surfaced it (1 row remaining in the `clear` tier), confirming the audit script is a load-bearing safety net — running the audit *after* execution caught a bug the dry-run could not, because the dry-run only validated rows that were in the batch. Lesson: any future batch executor should drive its decision list from a single source (e.g. parse the proposal markdown) rather than maintaining two hand-curated lists.

**Step 5 — Phase B2 relationship-graph backfill (top 23 system-skill domains → expanded to 29 ≥90% CRUD domains)** (medium-large) ✓ 2026-05-22

- [x] Draft intra-domain + cross-domain + `users` edges (with verb + cardinality + necessity + owner_side) for each of the 29 in-scope domains; mermaid block per domain — drafted in parallel by 6 sub-agents (one per cluster), each consuming a context brief generated by [.tmp_deploy/build_cluster_briefs.ts](.tmp_deploy/build_cluster_briefs.ts) and writing to `.tmp_deploy/cluster_<letter>_draft.md`.
- [x] Surface for user review, one cluster at a time (HR cluster, IT cluster, Sales cluster, etc.) — bundled into a single batched review (per the agreed strategy: parallel sub-agents per cluster, batched review). All 6 cluster drafts surfaced together with per-cluster edge/alias counts; user spot-checked and approved.
- [x] Load `data_object_relationships` rows with `record_status='new'` — loader [.tmp_deploy/load_cluster_drafts.ts](.tmp_deploy/load_cluster_drafts.ts) parses the 6 markdown drafts, auto-flips `many_to_one` cardinalities to `one_to_many` (312 rows), drops cross-cluster duplicate edges (5 rows, keeping first occurrence alphabetically), folds `industry_term` aliases to `synonym` with provenance noted in the alias's notes column, and inserts everything with `record_status='new'`. Final tally: **752 edges + 325 aliases** across the 29 domains.
- [x] Backfill `data_object_aliases` (≥1 alias per non-self-explanatory master) for the same 29 domains — bundled into the same loader. 325 aliases total; self-explanatory masters (e.g. `hcm_employees` for "employee") deliberately got no aliases; non-self-explanatory ones got 1-3 (e.g. `itsm_incidents`→"ticket", `cmdb_configuration_items`→"CI", `crm_opportunities`→"deal").

**Scope expansion vs original plan:** the plan called for "top 23 system-skill domains"; the actual scope was 29 domains with `crud_percentage ≥ 90` (excluding 5 zero-row stubs: BCM, CAFM, OP-RES, PRM, TPRM). The expansion was user-requested ("step 5 for all >90% semantius domains").

**Cluster assignments (29 domains, 6 clusters, parallel-agent friendly):**

- Cluster A — People (6): HCM, ONBOARDING, LMS, BEN-ADMIN, EMP-EXP, HRSD
- Cluster B — IT Service & Assets (6): ITSM, APM, CMDB, HAM, ITAM, WSC
- Cluster C — Compliance / Audit / Legal (4): AUDIT, LSD, TEST-MGMT, VIS-MGMT
- Cluster D — Vendor / Contract / Customer (4): CSM, CLM, VMS, SUP-LIFE
- Cluster E — Content / Asset (4): ECM, HCMS, EAM, DAM
- Cluster F — Specialized / Industry (5): CLIN-DEV, PS-LIC, RET-STORE, EXPENSE, WORK-MGMT

**Notes from execution:**

- **Note E — Loader speed mistake.** The loader was written with per-row `Bun.spawn` calls (~300ms each), so executing 752 + 325 = 1,077 inserts took ~6 minutes. The canonical idiom in [.claude/skills/domain-map-analyst/references/loader-idiom.md:87](.claude/skills/domain-map-analyst/references/loader-idiom.md#L87) covers chunked bulk-insert via PostgREST array body (~6 calls instead of 1,077). I copied the per-row pattern from `rename_data_object.ts` (which has a legitimate reason to be per-row — each rename has its own pre-flight) without checking the loader-idiom doc first. **Lesson for Steps 8 and 9**: always start from the `insert()` helper in `loader-idiom.md` for greenfield inserts; reserve per-row patterns for operations with per-row pre-flight.
- **Note F — Sub-agent format precision held up.** Six independent agents drafted markdown that all parsed cleanly with the same loader. Three small format quirks surfaced and were fixed in the loader (not the drafts): (a) auto-flip `many_to_one` to `one_to_many` because agents reach for that cardinality naturally even though the enum doesn't accept it; (b) empty-section marker rows use ` | _ | _ | … | (none — explanation here) | ` rather than literal `(none)`, so the filter must match `_` on placeholder columns regardless of free-form notes content; (c) cross-cluster authoring overlap is real (~5 edges in our run) and best handled by loader-side dedup with a kept/dropped audit log, not by asking agents to coordinate.
- **Note G — Bundled aliases worked.** Bundling Phase B contract deliverable 5 (aliases) into the same draft-and-load pass saved one round-trip. Sub-agents naturally include alias decisions when authoring the entity tables. Industry-term aliases that need an `industry_id` context are folded to `synonym` at load time with provenance in `notes` — those can be promoted to true `industry_term` once an industries-taxonomy backfill happens.
- **Note H — Decision artifacts are gitignored by design.** Per [SKILL.md:277](.claude/skills/domain-map-analyst/SKILL.md#L277), `.tmp_deploy/` is the canonical scratch space; loaders capture write-time intent and immediately drift from live state. The cluster drafts + bare-word proposal are not committed. The durable record is (a) this plan file with checklist + Notes, and (b) the committed `domain-fact-sheets/<DOMAIN>.md` files produced by Step 7. Step 7 is the load-bearing PR-reviewable artifact; the drafts are scaffolding that exists only to populate the catalog for the generator to render from.

**Step 6 — Fact sheet generator + CI drift check** (small) ✓ 2026-05-22

- [x] Build [`scripts/emit_fact_sheet.ts`](scripts/emit_fact_sheet.ts) — single self-contained Bun script, 13 sections + YAML frontmatter, runs against live PostgREST. Lives in `scripts/` (tracked) rather than `.tmp_deploy/` (gitignored scratch); the generator is contract code, not scratch — see Note I.
- [x] Implement §4 derivation rules — baseline tier (`<slug>:read|manage|admin`), lifecycle-derived workflow gates with `permission_verb_override` honored, pattern-flag-derived gates (`view_all_*`, `manage_all_*`, `submit_*`) + business rules (`<entity>_edit_scope`, `submit_restricted_to_*`, `approve_*_requires_approver`), §1 multi-paragraph composed narrative (description + capabilities + cost-band + min-org-size + flagship vendors + RACI + master-count + pattern-flag prose).
- [x] Implement `--all` mode — iterates every domain, writes `domain-fact-sheets/<DOMAIN_CODE>.md`. Combines with `--check` for the drift check.
- [x] CI / pre-commit drift check — `bun run scripts/emit_fact_sheet.ts --all --check` exits non-zero if any fact sheet would change. **No GitHub Actions workflow is wired up** because this repo has no existing CI infrastructure; the drift command is documented here and ready to be invoked by a future workflow or pre-commit hook. Single-domain check works too: `bun run scripts/emit_fact_sheet.ts ATS --check`.

**Step 7 — First fact sheet emission for ATS** (small) ✓ 2026-05-22

- [x] Run the generator for ATS — `bun run scripts/emit_fact_sheet.ts ATS`
- [x] Commit [`domain-fact-sheets/ATS.md`](domain-fact-sheets/ATS.md) — first PR-reviewable fact sheet
- [ ] *(Architect-blueprint comparison deferred — the `semantius-architect` repo owns Stage 0 adoption per §8. Structural parity will be verified there when adoption ships.)*

**Notes from execution:**

- **Note I — Generator location: `scripts/`, not `.tmp_deploy/`.** Plan §7 originally proposed `.tmp_deploy/emit_fact_sheet.ts`, but `.tmp_deploy/` is gitignored scratch (per [SKILL.md:277](.claude/skills/domain-map-analyst/SKILL.md#L277) and Note H) — loaders that capture write-time intent and immediately drift. The fact sheet generator is the opposite: contract code that anyone regenerating sheets needs, and that a CI drift check has to invoke. A first attempt tried to keep the literal `.tmp_deploy/` path via a `!.tmp_deploy/emit_fact_sheet.ts` gitignore exception; user pushback (rightly) flagged that as the wrong layout — "scripts to a folder where any reasonable person would expect them". Resolution: the generator lives at [`scripts/emit_fact_sheet.ts`](scripts/emit_fact_sheet.ts), tracked by default, no `.gitignore` gymnastics. The §7 path reference in this plan has been updated to match. Loaders stay in `.tmp_deploy/`.
- **Note J — Output shape was iterated.** The first emitted ATS sheet was structurally correct (all 13 sections present, derivation rules firing) but visually weak: §2 was just an inventory table, no quick-overview, no mermaid; §3 was four separate role-grouped tables; no YAML frontmatter; §1 was a single sentence from `domains.description`. Comparing against `_DRAFT_ats-domain-fact-sheet.md` (the architect-output gold standard kept locally during this design pass) drove a redesign: YAML frontmatter (`artifact`, `domain_code`/`slug`, `entities`, `related_domains`, counts), §1 Overview composed from description + capabilities + cost-band + min-org-size + flagship vendors + RACI + master inventory + pattern-flag prose, §2 single quick-overview table (Name=plural_label, Description) + one colored mermaid graph with classDef per role, §3 single unified inventory table with a Role column instead of four sub-tables. Lesson: emitting an artifact and reading it cold is faster feedback than reasoning about the rendering rules in the abstract — do that pass on the first domain before declaring a generator done.

**Step 8 — Phase B3 (lifecycle states + pattern flags) for top 20 domains** (large; one-time backfill) ✓ 2026-05-22

- [x] Author lifecycle states for each of: CRM, ITSM, HCM, ATS, ITAM, S2P, OMS, SUB-MGMT, COMP-MGMT, BEN-ADMIN, ONBOARDING, LMS, PAYROLL, FSM, CSM, CMDB, KMS, CPQ, ESIGN — 19 of the planned 20 (INC-MGMT does not exist in the catalog; ITSM already masters `service_incidents`, so the missing slot is benign, see Note K). Authored by 7 parallel sub-agents (one per cluster); each consumed a context brief from [.tmp_deploy/build_phase_b3_briefs.ts](.tmp_deploy/build_phase_b3_briefs.ts) and wrote a markdown draft to `.tmp_deploy/p_b3_<cluster>_draft.md`. Total: 117 master+required data_objects covered, 29 marked as static-reference (codes, catalogs, banded data, append-only event streams), 441 lifecycle state rows authored across the remaining 88 entities.
- [x] Set pattern flags (`has_personal_content`, `has_submit_lock`, `has_single_approver`) on each domain's relevant data_objects — 36 data_objects received at least one flag (PATCHed during the same load run).
- [x] Regenerate fact sheets for the top 20 to verify the §4 derivation rules produce the expected permissions tables — all 19 in-scope domains regenerated; §8.1 now renders baseline tier + lifecycle-derived gates (with `permission_verb_override` honored cleanly after a generator fix — see Note L) + pattern-flag overrides. ATS as canonical exemplar emits 17 permissions (3 baseline + 11 lifecycle gates + 3 personal_content/submit_lock overrides).

**Notes from execution:**

- **Note K — INC-MGMT slot is benign.** Plan §6.3 listed 20 domains; the catalog has 19 of them. `INC-MGMT` was never loaded as a standalone domain because incident management is masters under `ITSM` (`service_incidents` data_object). No backfill needed — the omission reflects how the catalog actually models the market, not a gap. If incident-management ever ships as a standalone domain (e.g. an IRP-style market), it picks up its own Phase B3 row at that point.
- **Note L — Generator bug surfaced by step 8 data.** Step 7 emitted ATS against an empty lifecycle states table; the permission-name derivation in [scripts/emit_fact_sheet.ts](scripts/emit_fact_sheet.ts) appended `_<entity_singular>` to the verb even when `permission_verb_override` was set. That produced absurd duplicates like `ats:hire_candidate_candidate` once real overrides started flowing. Fixed at [emit_fact_sheet.ts:579-580](scripts/emit_fact_sheet.ts#L579-L580) and [emit_fact_sheet.ts:830-833](scripts/emit_fact_sheet.ts#L830-L833): when an override is set, it now replaces the entire verb segment (yielding `ats:hire_candidate`, `ats:approve_offer`, `ats:approve_requisition`); when no override is set, the auto-derivation stays `<state_name>_<entity_singular>` (e.g. `ats:completed_consider_background_check`). Lesson: derivation rules need to be tested against realistic data, not an empty table — Step 7's "first emission" should arguably have included at least a couple of hand-authored lifecycle states to flush out cases like this before Step 8 multiplied them.
- **Note M — One non-blocking collision: `candidates.hired` and `job_applications.hired` both override to `hire_candidate`.** The ATS fact sheet now shows `ats:hire_candidate` twice in §8.1 (one row per source data_object). That's a real data-modeling judgment call: hiring a `candidate` and marking a `job_application` `hired` is conceptually the same gate, so collapsing to a single permission is fine. The generator could dedupe but the duplicate rows still convey "this gate fires from two state transitions" usefully. Worth flagging if the deployer later treats this as two separate permissions — it should treat them as one.
- **Note N — Sub-agent parser format held up at scale.** All 7 cluster drafts parsed cleanly with the same loader (`load_phase_b3.ts`) on first run after a small NOT-NULL fix on `permission_verb_override` (column requires `""` not `null` when no override is set). 441 inserts went through in seconds via the chunked bulk-insert idiom (Note E lesson applied — no per-row spawns this time).

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
- The full-catalog bare-word audit has completed; every bare-word `data_object_name` either carries an explicit `is_canonical_bare_word=true` claim with rationale, or has been renamed and cascade-fixed across `domain_data_objects`, `solution_data_objects`, `handoffs.data_object_id`, and `trigger_events.data_object_id`.
- SKILL.md has rules #9, #10, #11, #12 so future loads can't reintroduce the gaps that prompted this plan.
- The fact sheet for ATS is comprehensive enough that a downstream architect skill, consuming only it, can produce a structurally consistent semantic blueprint without re-deriving naming, relationships, permissions, or business rules.
