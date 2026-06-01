# Extract role / permission layer out of `_core` into Domain Map catalog

**Status:** drafted 2026-06-01, pending user approval to start Phase A.

**Trigger:** during the ATS audit (2026-05-31 → 2026-06-01) it surfaced that the catalog's "role layer" was being written into the platform's built-in `_core.roles` / `_core.permissions` / `_core.role_permissions` / `_core.permission_hierarchy` tables rather than into Domain Map catalog entities. The Domain Map module's actual entity set (verified live: 33 entities, none of them roles/permissions/role_permissions/permission_hierarchy) confirms that the SKILL.md design treating these as "Semantius built-in (extended)" is a category error. The only legitimate `_core.roles` rows are `id=1` (User) and `id=2` (Administrator), both `origin='system'`; everything else accumulated as catalog work shipped over weeks.

**Affected ATS audit:** holding. The 2026-06-01 loader (`fix_ats_audit_2026_06_01.ts`) created 19 permission rows + 19 auto-granted role_permission rows in `_core` that are now part of the pollution to migrate. Lifecycle states + verb_overrides remain valid catalog content; only the materialized permissions move.

---

## Goal

Move 100% of catalog-origin role + permission data out of `_core` into Domain Map catalog entities so that:

1. The Domain Map module owns its own role / permission model (4 new entities).
2. `_core.roles` is reduced to ~17 rows: 2 origin=`system` (User, Administrator) + 15 origin=`user` (tenant test accounts).
3. `_core.permissions` is reduced to ~6 rows (the platform's own permissions).
4. `_core.role_permissions` is reduced to ~10 rows (the legitimate platform grants).
5. `_core.permission_hierarchy` is reduced to platform-only edges (verify count during Phase A).
6. The platform-layer auto-grant mechanism becomes harmless because catalog work no longer INSERTs into `_core.permissions`.
7. SKILL.md, references, and every loader / emitter / analytics script reflects the new architecture.

## Out of scope (explicitly)

- **Disabling the auto-grant trigger / RPC / platform logic.** That's a platform-engineering concern; capture the empirical observation (matching timestamps, `granted_by=null`) in a separate finding for whoever owns `_core` to act on. The catalog extraction makes the auto-grant moot for catalog work even if it stays in place.
- **The ATS audit close-out.** Resumes after this migration lands.
- **Schema changes to `_core` tables themselves.** We only DELETE rows from them; we do not ALTER columns.
- **All other skills are off-limits.** `semantic-model-deployer`, `semantic-model-optimizer`, `semantic-model-analyst`, `semantius-skill-maker`, `semantius-agent-maker`, `semantius-deploy-test-maker`, `use-semantius` are NOT updated by this plan. They consume blueprint artifacts (the `catalog/blueprints/*-semantic-blueprint.md` files emitted by `scripts/emit_fact_sheet.ts`), not the raw catalog tables. As long as the emitter produces byte-identical blueprints after the migration, these skills' inputs are unchanged and their behaviour is unchanged. The byte-identical-blueprint guarantee is the contract that makes this hands-off possible; it is enforced as a hard gate in Phase E and Phase F.

---

## Target catalog entities (proposed)

Each mirrors a `_core` table but lives in the Domain Map module (`module_id=1001`). Final naming + field shapes subject to confirmation in Phase B0 (design pass).

| New entity | Mirrors | Notable additions over `_core` |
|---|---|---|
| `domain_roles` | `_core.roles` | Drops `module_id` (always 1001). Keeps `origin` (only `model` / `model_master` / `user` ever land here; `system` stays in `_core`). Keeps `role_code`, `slug`, `business_function_id`, `record_status`. |
| `domain_permissions` | `_core.permissions` | Keeps `permission_name`, `description`, `tier`, FK to `domain_modules` (required, since by definition every catalog perm has a realizing module). Drops `module_id` (always 1001). |
| `domain_role_permissions` | `_core.role_permissions` | `role_id` → `domain_roles`; `permission_id` → `domain_permissions`. Keeps `granted_at`, `granted_by`, `notes`. |
| `domain_permission_hierarchy` | `_core.permission_hierarchy` | `including_permission_id` / `included_permission_id` both → `domain_permissions`. |

**FK refactor on existing catalog entity:** `role_modules.role_id` (currently FK → `_core.roles`) re-points to `domain_roles`. This is a schema change that needs to happen between Phase C (copy) and Phase G (delete). Phase B sequences it.

**Open question for Phase B0:** does `data_object_lifecycle_states.permission_verb_override` need anything else, given that the materialization target shifts from `_core.permissions` to `domain_permissions`? Probably not — the column already holds the verb, not an FK — but verify against the emitter contract during Phase A.

---

## Risk register

| Risk | Mitigation |
|---|---|
| `_core` row deletions break a runtime auth path that's grabbing rows by id (not by tenant scoping). | Phase F comparison report + Phase G dry-run mode (count what WOULD be deleted, confirm with user, then DELETE). |
| Auto-grant mechanism fires during Phase C (copy) when we INSERT into `_core.permissions` for any reason. | We do NOT INSERT into `_core.permissions` at all in this plan. All Phase C inserts go into the new catalog entities. The auto-grant only triggers on `_core.permissions` writes. |
| Catalog work in flight (another audit, another loader run) writes new catalog content into `_core` mid-migration. | Freeze all catalog loads for the duration of Phase B → Phase G. State this explicitly to whoever else might run loaders. |
| Skill / loader edits miss a reference and a future run rewrites pollution. | Phase E inventory (deliverable from Phase A) is the gate; the cleanup is only "done" once `grep -rn "/roles\b\|/permissions\b\|/role_permissions\b\|/permission_hierarchy\b" scripts/ .claude/` returns only updated references. |
| New `domain_*` entities can't accept a row count we expect (e.g. enum constraint inherited from `_core`). | Phase B1 row-shape pilot: insert 5 sample rows per new entity, verify the `_core` data shape replays cleanly. Then full Phase C copy. |
| Phase G DELETE removes rows that another tenant or context still depends on. | Phase F comparison report + user approval before any DELETE. Hard rule: no DELETE without per-table user sign-off. |

---

## Phase A — Inventory (read-only)

**Goal:** produce a complete map of every place in this repo and every skill that touches the affected tables. The Phase E rewrite is only complete when every entry in this inventory has been updated; the inventory is the gate.

**Tables to inventory references to:**
- `_core.roles`
- `_core.permissions`
- `_core.role_permissions`
- `_core.permission_hierarchy`
- All variants: `/roles`, `/permissions`, `/role_permissions`, `/permission_hierarchy` in PostgREST paths; `roles`, `permissions`, `role_permissions`, `permission_hierarchy` as bare table names in prose; `create_role`, `create_permission`, `create_role_permission`, `create_permission_hierarchy` as CLI tool names.

**Procedure:**

A1. **`grep` the domain-map repo:**
```
rg -nC2 -e "/roles\\b" -e "/permissions\\b" -e "/role_permissions\\b" -e "/permission_hierarchy\\b" \
  -e "\\broles\\b" -e "\\bpermissions\\b" -e "\\brole_permissions\\b" -e "\\bpermission_hierarchy\\b" \
  -e "create_role\\b" -e "create_permission\\b" -e "create_role_permission" -e "create_permission_hierarchy" \
  -e "update_role\\b" -e "update_permission\\b" -e "delete_role\\b" -e "delete_permission\\b" \
  scripts/ .claude/skills/domain-map-analyst/ audits/ plans/
```
Capture per-file hit list with line numbers; classify each hit:
- **PROSE / docstring** — needs rewrite (e.g. SKILL.md table; references/roles.md).
- **READ-ONLY query against `_core`** — needs re-point if the read is supposed to inspect catalog content (e.g. an analytic). Keep if the read is genuinely about platform auth.
- **WRITE against `_core`** — re-point to new catalog entity.
- **Comment / log message** — needs rewrite.

A2. **Inventory the SKILL.md sections explicitly:**
- Module-at-a-glance "Role layer" subsection
- Rule #14 (modules / permission materialization)
- Rule #17 (system skills)
- Rule #19 (starter kits — 3 baseline permissions per starter; this needs domain_permissions)
- Rule #20 (catalog UX fields — unrelated, but the section bordering it might mention permission_hierarchy)
- "Per-domain completeness checklist" sections E1-E6, F1-F5
- "System-skill tool derivation" — references skills/tools (not roles/perms; verify)
- references/roles.md (whole file)
- references/modules.md (permission-materialization-per-module section)
- references/module-shape.md (field shapes for roles, permissions, role_permissions, permission_hierarchy entries)
- references/loader-idiom.md (starter-module pre-flight checks the 3-baseline-permissions invariant)

A3. **Inventory the loader scripts (scripts/loaders/*.ts):** every loader that POSTed to `/roles`, `/permissions`, `/role_permissions`, `/permission_hierarchy`. For each, capture: what catalog content it loaded, whether it's a one-off or template. Likely affected (non-exhaustive, verify):
- `load_ats_module_permissions.ts`
- `load_ats_module_skills.ts` (only if it also writes permissions; verify)
- `load_ats_roles.ts`
- Every `fix_*` and `reconcile_*` script in `.tmp_deploy/` from the past month that wrote permissions
- The one we just ran: `.tmp_deploy/fix_ats_audit_2026_06_01.ts`

A4. **Inventory generators / emitters:**
- `scripts/emit_fact_sheet.ts` — does it read from `_core.permissions` to render the per-module blueprint's permission section? If yes, re-point to `domain_permissions` in Phase E.
- `scripts/analytics/discovery_query.ts` — verify it doesn't touch the role/perm tables.
- `scripts/analytics/*.ts` — same scan.

A5. **Inventory other skills — read-only confirmation that they consume blueprints, not raw tables.** These skills are NOT touched by this plan, but we need to verify (once) that none of them reads `_core.roles` / `_core.permissions` / `_core.role_permissions` / `_core.permission_hierarchy` or the about-to-be-created `domain_roles` / `domain_permissions` / etc. directly. The contract is: they consume blueprint artifacts only.

Check each by grep against its skill directory:

```
rg -nC1 -e "roles\b" -e "permissions\b" -e "role_permissions\b" -e "permission_hierarchy\b" \
  -e "domain_roles\b" -e "domain_permissions\b" \
  ~/.claude/skills/semantic-model-deployer/ \
  ~/.claude/skills/semantic-model-optimizer/ \
  ~/.claude/skills/semantic-model-analyst/ \
  ~/.claude/skills/semantius-skill-maker/ \
  ~/.claude/skills/semantius-agent-maker/ \
  ~/.claude/skills/semantius-deploy-test-maker/ \
  ~/.claude/skills/use-semantius/
```

Expected outcome of the grep: every hit is either (a) prose about RBAC concepts in general, (b) a reference to platform-RBAC operations against `_core` (which stay valid post-migration for tenant role / permission management), or (c) a reference to a blueprint section that happens to use the words. **No hit should be a write or read against catalog-content roles / permissions in `_core`** — if such a hit exists, it's a sign one of these skills is bypassing the blueprint contract and the user needs to decide what to do BEFORE the plan proceeds.

If the grep is clean (only prose / platform-RBAC / blueprint references), record the result in the Phase A deliverable and proceed. These skills then remain untouched for the duration of this plan.

A6. **Inventory live PolicyGroup-side tables:** the only `_core` rows we leave intact are:
- `roles.id IN (1, 2)` and any `origin='user'` rows (tenant test accounts; ~15 today).
- `permissions.domain_module_id IS NULL` (~6 today).
- `role_permissions` joining the above.
- `permission_hierarchy` joining the above.
Phase A6 produces the exact id sets to preserve, as a verification baseline for Phase G.

A7. **Snapshot the existing blueprints.** This is the contract baseline for the byte-identical-regeneration gate.

- Run `bun run scripts/emit_fact_sheet.ts --all` to regenerate every blueprint against the **pre-migration** catalog (i.e. `_core.roles` / `_core.permissions` are still polluted; the emitter reads from where it currently reads from).
- Copy the resulting `catalog/blueprints/` directory verbatim to `.tmp_deploy/blueprints-pre-migration-<YYYY_MM_DD>/`. This snapshot is the contract.
- Record the exact file list (count + names) of `catalog/blueprints/*-semantic-blueprint.md`. After migration the emitter MUST produce **the same set of files** (no additions, no removals).
- Record a checksum (e.g. SHA256) of each file. After migration each checksum MUST match.
- Commit the snapshot directory to the repo (or, if that's too noisy, commit a `manifest.txt` listing filenames + checksums; the raw files stay in `.tmp_deploy/` for diff inspection).

**Deliverable:** `plans/extract-role-permission-catalog-inventory.md` with:
- Per-file hit list, classified
- The set of `_core` row ids to preserve (legitimate platform RBAC)
- Confirmation that A5's grep shows other skills consume blueprints only
- Pre-migration blueprint snapshot location + filename / checksum manifest
- Open questions for Phase B0 design

**Gate:** user reviews the inventory and signs off on the row-id preservation set before Phase B starts. If the inventory surfaces a skill or generator outside the expected list, the plan expands to cover it.

---

## Phase B — Design + create the new catalog entities

**B0 — Design pass (offline, no DB writes).** Confirm the field shape of each new entity:

- `domain_roles`: every field on `_core.roles` that's used by `model` / `model_master` rows. Drop platform-only fields if any (e.g. `module_id` since all catalog roles belong to Domain Map). Decide on `record_status` enum values (likely the standard `new` / `pending` / `approved` / `rejected` per Rule #1).
- `domain_permissions`: same shape as `_core.permissions` minus platform-only fields. `tier` enum values (`baseline-read` / `baseline-manage` / `baseline-admin` / `workflow-gate` / `override`) — confirm enum constraint from `_core.permissions.tier` is mirrored.
- `domain_role_permissions`: `role_id` FK to `domain_roles`, `permission_id` FK to `domain_permissions`, `granted_at`, `granted_by` (FK to `users` in `_core` — yes, this is fine; tenant users still live in `_core`), optional `notes`.
- `domain_permission_hierarchy`: `including_permission_id` and `included_permission_id`, both FK to `domain_permissions`.

Deliverable: `plans/extract-role-permission-catalog-schema.md` with the proposed entity + field DDL (in `create_entity` / `create_field` form for the use-semantius skill to consume).

**B1 — Pilot insert** (5 rows per entity to validate enum constraints, FK behavior, default values):
- Pick 5 origin=`model` rows from `_core.roles`; insert into `domain_roles` with the same data.
- Pick 5 permissions from `_core.permissions` with `domain_module_id` set; insert into `domain_permissions`.
- Insert matching `domain_role_permissions` rows.
- If `_core.permission_hierarchy` has rows touching the 5 perms, insert into `domain_permission_hierarchy`.

Verify each insert by GET-ing the new row and confirming every field matches the source row. If any field mismatch, fix the entity schema in B0 and re-pilot.

**B2 — Create the entities for real** via the use-semantius skill / `semantic-model-deployer`. Wait for user confirmation that the entities are visible in the Domain Map UI (the sidebar will gain 4 new entries) before proceeding.

**B3 — Re-FK `role_modules.role_id`.** Update the field's reference_table from `roles` to `domain_roles` via `update_field`. This is the schema change that turns role_modules into a proper Domain Map catalog citizen. **Done after Phase C, not Phase B** — because while data is being copied, `role_modules.role_id` still points at `_core.roles`. Phase B3 marker stays here as a forward-reference; the action lives at end of Phase D.

**Gate:** user signs off on the B0 schema design before B2 runs. After B2, user visually confirms the 4 new entities in the UI before Phase C starts.

---

## Phase C — Copy `_core` data into the new catalog entities

**Order matters (FK dependencies):**

1. `_core.roles` (origin in `model`, `model_master`) → `domain_roles`. Preserve all field values. Build `oldRoleId → newRoleId` map.
2. `_core.permissions` (where `domain_module_id IS NOT NULL`) → `domain_permissions`. Preserve all field values. Build `oldPermId → newPermId` map.
3. `_core.role_permissions` joining the above sets → `domain_role_permissions`. Re-map role_id + permission_id via the maps from steps 1 + 2.
4. `_core.permission_hierarchy` joining the above set → `domain_permission_hierarchy`. Re-map both ids via the map from step 2.

**Idempotency:** for each insert, key on the natural key:
- `domain_roles` keyed by `slug` (which is unique per `_core.roles.slug` constraint)
- `domain_permissions` keyed by `permission_name` (unique)
- `domain_role_permissions` keyed by `(role_id, permission_id)` (composite natural key after re-mapping)
- `domain_permission_hierarchy` keyed by `(including_permission_id, included_permission_id)`

Re-running the loader must be a no-op after the first successful run.

**Loader:** new TypeScript script at `scripts/loaders/extract_role_permission_catalog.ts`. Follows the loader-idiom (chunked POST, stdin pipe, idempotent by natural key). Reads from `_core`, writes to `domain_*`. Does NOT delete from `_core` — that's Phase G.

**Verification (in-loader):** after each phase 1-4, GET the new table count and compare to the count of source rows that should have been copied. If counts differ, stop and surface the diff.

**Gate:** loader runs; user reviews the per-phase row counts; Phase D begins.

---

## Phase D — Verify all records copied

D1. **Row-count parity per table.** For each (`_core` source set, `domain_*` target) pair:

```
SELECT COUNT(*) FROM _core.roles WHERE origin IN ('model','model_master');
SELECT COUNT(*) FROM domain_roles;
-- must match
```

D2. **Field-by-field equality on a sampled set.** Pick 20 random rows from each `domain_*` table; for each, GET the corresponding source row from `_core` by natural key and assert every field matches. Any mismatch is a Phase C bug; fix and re-copy.

D3. **FK integrity.** For every `domain_role_permissions` row, assert that `role_id` exists in `domain_roles` and `permission_id` exists in `domain_permissions`. Same for `domain_permission_hierarchy`.

D4. **Re-FK role_modules.role_id (the deferred Phase B3 action).**
- `update_field` on `role_modules.role_id` to point at `domain_roles` instead of `_core.roles`.
- After the re-FK, run a sanity query: every `role_modules.role_id` must resolve to a `domain_roles.id`. If any rows have role_id values that don't exist in `domain_roles` (i.e. they pointed at `_core.roles` rows that weren't migrated — e.g. legitimate origin=`user` or origin=`system` rows that shouldn't be in role_modules anyway), surface as drift to fix.

D5. **Forward query check.** For 5 sampled domain modules, run the "who can do what" question against the NEW catalog (`domain_roles` → `domain_role_permissions` → `domain_permissions`) and confirm it matches the answer from the OLD path (`_core.roles` → `_core.role_permissions` → `_core.permissions`). The two should produce identical permission sets per role.

D6. **No-INSERT-since-copy verification.** Re-query the `_core` counts and confirm no new rows have been added since Phase C started (i.e. no other loader ran during the migration). If counts have grown, surface the new rows; user decides whether to fold them into the migration or treat them as catalog work that needs to be re-done against the new entities.

**Gate:** all D1-D6 checks pass; user reviews the verification report; Phase E begins.

---

## Phase E — Update skills, references, and TypeScript scripts

This is the biggest discrete chunk of work and the one most likely to leave residue. Driven by the Phase A inventory.

E1. **SKILL.md (domain-map-analyst):**
- Rewrite "Role layer (1 new entity + 3 extended built-ins)" — change "Built-in vs. catalog" column. Roles, permissions, role_permissions, permission_hierarchy become "Catalog (NEW)" not "Semantius built-in (extended)". Role_modules already correctly catalog.
- Update Rule #14 permission-materialization paragraph (in "The module at a glance"; permission prefix is still the realizing module's code, but the target table is `domain_permissions`).
- Update Rule #17 (every system skill has ≥1 skill_tools row; check that nothing references _core perms).
- Update Rule #19 starter kits invariant 4 (exactly 3 baseline permissions per starter) — the 3 baseline rows go into `domain_permissions`, not `_core.permissions`. Same for role_permissions on the baseline.
- Update Rule #20 — should be unaffected; verify.
- Update Per-domain completeness checklist E1-E6 (role layer queries re-point to `domain_*`).
- Update F1-F5 (system skill audit — verify no permission queries that need re-pointing).
- Update M5 (workflow-gate state has `domain_module_id` set when the state belongs to a specific module) — wording stays but the permission target shifts.
- Update B12 (lifecycle states audit) — the workflow-gate permissions referenced by `permission_verb_override` materialize into `domain_permissions`, not `_core.permissions`.
- Update §Quick reference and any Markdown link to /permissions or /roles UI paths.

E2. **references/roles.md** — full rewrite against the new entities. Examples updated. Naming conventions stay (function-scoped `<FUNCTION-CODE>-<ROLE-NAME>`); only the target tables change.

E3. **references/modules.md** — per-module permission derivation section. Permission prefix is still `<domain_module_code>:<verb>`; target is now `domain_permissions`.

E4. **references/module-shape.md** — field shapes for roles / permissions / role_permissions / permission_hierarchy entries. Re-source from the new entities' DDL.

E5. **references/loader-idiom.md** — starter-module pre-flight (`validateStarterModule` checks 3 baseline permissions). The validator stays; the target it asserts against shifts to `domain_permissions`.

E6. **scripts/loaders/*.ts** — every loader from the Phase A inventory that wrote to `_core.{roles,permissions,role_permissions,permission_hierarchy}`. Re-point to `domain_*` equivalents. For .tmp_deploy/ dated one-offs, mark each one "MIGRATED 2026-06-XX" in a comment at the top; do NOT delete the file (audit trail).

E7. **scripts/emit_fact_sheet.ts — THE LOAD-BEARING CHANGE.** The blueprint emitter is the contract surface other skills consume.

- Re-point every read of `_core.roles` / `_core.permissions` / `_core.role_permissions` / `_core.permission_hierarchy` (that's about catalog content, not platform RBAC) to `domain_roles` / `domain_permissions` / `domain_role_permissions` / `domain_permission_hierarchy`.
- Preserve every other emitter behaviour exactly: section ordering, prose templates, table column order, alphabetisation, code-block fencing, em-dash sanitisation, blank-line patterns, trailing newline. Any divergence breaks the byte-identical guarantee.
- Run `bun run scripts/emit_fact_sheet.ts --all` against the post-migration catalog.
- Diff the regenerated `catalog/blueprints/` against the A7 snapshot:
  - **File set parity:** `ls catalog/blueprints/*.md` must produce exactly the same filenames as the A7 snapshot — no additions, no removals.
  - **Per-file byte equality:** for every file, the new SHA256 must match the A7 snapshot's SHA256.
- If any file differs OR any file is added / removed, this is a Phase E7 bug that MUST be fixed before Phase F. Common causes: emitter reads a field that doesn't have the same default on the new entity, FK join order differs, a `notes` column was being included from `_core.role_permissions.notes` (always empty) and is now NULL on the new table (NULL vs empty string render differently). Each is fixable by tightening the emitter; the contract is non-negotiable.
- Re-run `bun run scripts/emit_fact_sheet.ts --all --check` as the final acceptance test. This must exit zero (no drift detected) against the post-migration catalog with the snapshot as the comparison source.

**Why this is the hardest part of the migration.** Every consumer of these blueprints (semantic-model-deployer, semantic-model-optimizer, semantic-model-analyst, semantius-skill-maker, semantius-agent-maker, semantius-deploy-test-maker, use-semantius, and any future skill) treats the blueprint as a black-box contract. As long as the blueprints don't change, no consumer changes. The moment a blueprint differs by even a whitespace, downstream skills may diverge silently. Hold E7 to the byte.

E8. **scripts/analytics/*.ts** — `discovery_query.ts` likely doesn't touch the role/perm tables; verify. Other analytics: same scan.

E9. **Other skills are NOT touched.** Explicit non-action. The byte-identical-blueprint contract from E7 + A7 is what makes this possible. If E7's diff shows any blueprint change at all, the answer is to fix the emitter, NOT to touch the consuming skills. The constraint is one-directional: blueprints define what skills see; skills don't see anything else.

If during Phase A5 the grep surfaced a consuming skill that bypasses the blueprint contract (e.g. reads `_core.permissions` directly), the plan stalls at A5 and the user decides whether to (a) fix that skill to consume blueprints, then proceed, or (b) accept the divergence and expand this plan. Either way, the consuming skill is not silently modified.

E10. **Audits and plans:**
- `audits/ATS/history.md` and `audits/ATS/state.yaml` — append a note that the 2026-06-01 audit's permission inserts were migrated as part of the catalog-extraction work. Move open items that depended on the wrong tables to track against `domain_*`.
- Other open audits (audits/*/state.yaml) — scan for any that reference E1-E6 (role layer) or F1-F5 expectations. Re-base against the new model.

E11. **CLAUDE.md** — verify nothing needs updating (likely unaffected; it's about no-em-dash, American-English, semantius cwd, no-Python).

**Verification (per file):** every grep hit from Phase A inventory either updated or marked "no-op (platform-layer reference is intentional)". Phase A inventory is the gate.

**Gate:** all inventory entries resolved; user reviews the diff summary (which files changed, which left intentional `_core` references); Phase F begins.

---

## Phase F — Surface comparison report

A read-only deliverable that answers "are we ready to DELETE from `_core`?".

F0. **Blueprint byte-identical re-verification.** Independent of Phase E7's own verification, re-run the blueprint diff one more time as the leading entry of the comparison report:

```
bun run scripts/emit_fact_sheet.ts --all --check
```

Expected: exit zero, zero files changed. If anything has drifted since Phase E7's run (because catalog content changed during Phase E rewrite, because a loader ran, because a blueprint section depends on a field that's only now stable), find the source of drift and fix it before continuing. Phase F cannot proceed with a non-zero `--check` exit; Phase G cannot proceed without F0 passing.

F1. **Per-table delta.** For each affected `_core` table, show the rows that would be deleted (the migrated catalog rows). Format:

```
_core.roles deletion preview:
  rows to delete: 104 (origin=model: 97, origin=model_master: 7)
  preserved in _core: 17 (origin=system: 2, origin=user: 15)
  mirrored in domain_roles: 104
  ✅ counts agree, no overlap

_core.permissions deletion preview:
  rows to delete: 895 (every row with domain_module_id IS NOT NULL)
  preserved in _core: 6 (no domain_module_id)
  mirrored in domain_permissions: 895
  ✅ counts agree
```

F2. **Sample diff.** For 20 random rows in each `_core` table being deleted, show the equivalent `domain_*` row side-by-side. Reviewer sanity-checks fields.

F3. **FK fanout map.** Confirm that after Phase D's re-FK on `role_modules.role_id`, no other table FK-references the to-be-deleted `_core` rows. Run a fanout query against `_core` schema: for every FK pointing at `_core.roles` / `_core.permissions` / `_core.role_permissions` / `_core.permission_hierarchy`, list the rows that would orphan if we DELETE. Expected: empty result.

F4. **Auto-grant follow-up.** Note that after Phase G, no catalog work will INSERT into `_core.permissions` anymore, so the auto-grant becomes inert from the catalog's perspective. Capture as a separate finding to whoever owns the platform — they may still want to disable it for cleanliness, but it's no longer urgent.

**Deliverable:** `plans/extract-role-permission-catalog-comparison.md` — the comparison report, hand-reviewed by the user.

**Gate:** user explicitly approves "proceed with DELETE" per affected `_core` table. Phase G runs only on approved tables.

---

## Phase G — DELETE migrated rows from `_core` (after user approval)

**Order matters (FK dependencies; reverse of Phase C):**

1. `_core.permission_hierarchy` rows joining migrated permissions → DELETE.
2. `_core.role_permissions` rows joining migrated roles or migrated permissions → DELETE.
3. `_core.permissions` rows with `domain_module_id IS NOT NULL` → DELETE.
4. `_core.roles` rows with `origin IN ('model','model_master')` → DELETE.

**Idempotency:** DELETE is naturally idempotent (re-running deletes nothing new), but the loader should still re-query before each DELETE to handle the case where another loader ran between Phase D's verification and Phase G's run.

**Loader:** `scripts/loaders/delete_role_permission_pollution.ts`. Same idiom as Phase C. Refuses to run unless `--confirm-after-comparison-report` flag is passed (forces deliberate execution).

**Verification (post-DELETE):**
- `_core.roles` count = ~17 (2 system + 15 user, exact preserved set from Phase A6)
- `_core.permissions` count = ~6 (the platform-only set from Phase A6)
- `_core.role_permissions` count = ~10
- `_core.permission_hierarchy` count = the platform-only edge count from Phase A6
- Spot-check: try to log in as a tenant user; auth still works. Try to render the Domain Map UI; sidebar renders. Try to load a small catalog change; loader still works against `domain_*`.

**Rollback:** if any post-DELETE verification fails, re-INSERT the deleted rows from the `domain_*` mirrors. Phase C maps preserved as JSON in `.tmp_deploy/extract-role-permission-catalog-id-map-<date>.json` for this purpose; keep until 60 days post-migration.

**Gate:** post-DELETE verification passes; user signs off; migration is complete.

---

## Closeout

After Phase G:

- Update `audits/_validate-cross-domain.md` (or wherever cross-domain governance lives) with the migration's completion + the platform-layer auto-grant finding for the platform team.
- Resume the ATS audit's open work (B7 user-edges enumeration, H-band APQC tagging, audit close-out).
- Add a `domain_map` rule: "catalog role / permission writes go to `domain_*` entities. Writing to `_core.{roles,permissions,role_permissions,permission_hierarchy}` from catalog loaders is forbidden." Append to SKILL.md hard rules.
- Schedule a 30-day post-migration health check: re-run F1-F3 to confirm no new `_core` pollution has accumulated.

---

## Open questions for user before Phase A starts

1. Should the new entities be named `domain_roles` / `domain_permissions` / `domain_role_permissions` / `domain_permission_hierarchy`, or shorter (`catalog_roles` / etc.)?
2. Are there other tenants / orgs sharing the platform that depend on `_core.roles` / `_core.permissions` rows we're about to delete? (Cross-tenant blast radius. If yes, the plan needs a per-tenant pass.)
3. Is there a separate platform-engineering team / repo for the auto-grant trigger fix, or does this skill author it too?
4. Are the 15 origin=`user` rows in `_core.roles` actually legitimate tenant accounts, or are some of them lingering test data that should also be cleaned? (Phase A6 audits this.)
