# plan-handoffs.md: Make intra-domain handoffs first-class

> **Status:** design intent (draft). Operational status lives in the progress checklist at the bottom of this file.
>
> **Scope:** make handoffs between two `domain_modules` of the **same domain** first-class catalog rows alongside cross-domain handoffs, by dropping the `cross_domain_only` validation rule and renaming `cross_domain_handoffs` → `handoffs`. Add a write-time authoring rule that new rows MUST populate both `source_domain_module_id` and `target_domain_module_id`. The existing nullable shape on module FKs stays for backfill; flip to `NOT NULL` is deferred to the same post-backfill review gate.
>
> **Triggering observation:** plan-modules.md §5.2 line 200 already recognizes that "process skill wraps a cross-module workflow cluster, which may or may not be cross-domain." Plan-modules.md line 130 states the intent directly: "Handoffs really live between modules; the domain pair is a rollup." Line 394 even calls the ATS hire-loop "intra-domain-spilling-cross-domain process skill candidate." But the schema-level enabler (dropping `cross_domain_only`) was never explicitly added to plan-modules.md and the live catalog still rejects intra-domain rows at insert. As of this writing: 0 of 1030 handoff rows are intra-domain.
>
> **Relation to plan-modules.md D3:** D3 was originally gated on "all 88 domains modularized OR explicitly decline." That gate is being lifted early for the rename half of D3, because the misnaming actively misrepresents the model once intra-domain rows become valid. The NOT-NULL-flip on module FKs stays gated on full catalog-wide backfill (still per the original review point).

---

## 1. Decision summary

| Decision | Outcome |
|---|---|
| Drop the `cross_domain_only` validation rule on the handoffs table | YES, in this plan |
| Rename `cross_domain_handoffs` → `handoffs` | YES, in this plan (D3 partial firing) |
| Naming style: `handoffs` vs `module_handoffs` vs `domain_module_handoffs` | `handoffs`. Reasoning in §2 |
| Module FK columns: nullable or `NOT NULL`? | Stay nullable. New write-time authoring rule requires both; `NOT NULL` deferred (§5) |
| Add a new validation rule to replace `cross_domain_only` (e.g. "intra-domain rows must be async")? | NO. Let `friction_level` do the disambiguation (§7) |
| Split into two tables (legacy nullable-module-FK rows vs new required-module-FK rows)? | NO. The distinction is temporal, not structural. Same columns, same semantics, same FKs. UNION tax across two tables for a transitional state is the wrong trade |
| Add `handoff_processes` junction to link individual handoffs to APQC PCF activities? | Split into [plan-handoff-processes.md](plan-handoff-processes.md). The junction adds a new table, a new role enum, and a review workflow whose rollback window is tighter than the rename's; shipping it separately keeps both reversible |
| Classify the two structural shapes intra-domain rows introduce (in-process lifecycle progression vs out-of-process async wiring) | YES, in this plan. Extend the existing `integration_pattern` enum with one new value `lifecycle_progression` (§3.7) rather than add a new column. Smaller change, fits the enum's existing role as "how is this realized," and makes the two shapes directly queryable without conflating with the orthogonal `friction_level` pain axis |

---

## 2. Naming choice: `handoffs`

Rejected alternatives:

- **`module_handoffs`** and **`domain_module_handoffs`** both imply rows are required to be module-attributed. They are not. `source_domain_module_id` / `target_domain_module_id` are nullable today and stay nullable through the catalog-wide backfill window. 99% of existing rows are still NULL on these columns (per SKILL.md B10b, 1019/1029 as of 2026-05-23 ATS backfill). Pure cross-domain rows with NULL module FKs are valid through that entire window.
- The `domain_module_` prefix on `domain_module_capabilities` / `domain_module_data_objects` / `domain_module_host_domains` is correct for those tables because they are junctions that *require* a `domain_module_id`. Handoffs are not such a junction: the module FKs are attribution metadata layered on a row whose load-bearing FKs remain `domains` and `data_objects`.

Plain `handoffs` is the name plan-modules.md §10 line 474 already specified, accurately covers both intra-domain cross-module and pure cross-domain rows, and does not over-promise.

---

## 3. Schema changes

All applied via a single migration script. One rename, one rule drop, plus metadata updates. No data loss.

| # | Change | Notes |
|---|---|---|
| 3.1 | Drop validation rule `cross_domain_only` on `cross_domain_handoffs` | The rule body is `{"!=": [{"var": "source_domain_id"}, {"var": "target_domain_id"}]}`. Remove via `update_entity` on the entity's `validation_rules` array. |
| 3.2 | Rename table `cross_domain_handoffs` → `handoffs` | Semantius `update_entity` accepts a new `table_name`. Cascade hits: every FK column with `reference_table='cross_domain_handoffs'` (none today; verify in the migration's pre-flight via `SELECT * FROM fields WHERE reference_table='cross_domain_handoffs'`, abort if non-empty), PostgREST URL paths in loaders, fact-sheet emitter queries. |
| 3.3 | Rename computed field `cross_domain_handoff_label` → `handoff_label` | Update the field's `field_name`. The JsonLogic body keeps working as-is (label text is "<source_domain> → <target_domain> : <event>" which reads correctly for both intra-domain cross-module rows and pure cross-domain rows). |
| 3.4 | Update `entities.label_column` reference from `cross_domain_handoff_label` to `handoff_label` | One-line `update_entity` PATCH on the `label_column` field. |
| 3.5 | Rewrite entity `description` | New description names both purposes explicitly. Draft in §4. |
| 3.6 | Rewrite `singular_label` "Cross-Domain Handoff" → "Handoff", `plural_label` "Cross-Domain Handoffs" → "Handoffs" | Same `update_entity` PATCH. |
| 3.7 | Add `lifecycle_progression` as a new enum value on `integration_pattern` | The existing values (`event_stream`, `api_call`, `batch_sync`, `manual_handoff`, `file_drop`) all describe out-of-process realization shapes. The new value covers in-process state-transition handoffs where the consumer reads producer state directly (no message moves). Lets §7's two intra-domain shapes be filtered apart at the query layer without overloading `friction_level`. No backfill needed: existing cross-domain rows all already have a value; new intra-domain rows pick this value when appropriate. |

The migration is packaged as a single Bun/TypeScript loader under `.tmp_deploy/rename_handoffs_table.ts` following the standard loader idiom.

---

## 4. New entity description (reviewed and accepted)

The current description says:

> *Directional event-driven handoffs between two distinct domains, sharing a data object. Captures the integration friction that an integrated platform would absorb: each row is a pipeline / API call / human handoff that exists today because the source and target domains live in separate systems. Signal 2 of the platform-vs-silos analysis (Signal 1 is the multi-master count on domain_data_objects.role). Intra-domain events are out of scope by design, see the cross_domain_only validation rule.*

Proposed replacement:

> *Directional event-driven handoffs between two `domain_modules`, sharing a data object. The handoff lives between modules; whether the two modules happen to belong to the same domain or to different ones is a derived property a downstream consumer filters on, not part of the entity's identity. `source_domain_module_id` / `target_domain_module_id` carry the module attribution; `source_domain_id` / `target_domain_id` are the denormalized domain rollup (derivable from the module FKs and kept on the row for backfill-era rows where the module FKs are still NULL). `friction_level` distinguishes expensive async wiring (`medium` / `high`) from cheap in-process lifecycle walks (`low`). Signal 2 of the platform-vs-silos analysis is one such derived filter, applied at the query layer as `source_domain_id != target_domain_id` (see Phase D). Authoring rule: new rows MUST populate both module FK columns unless the counterparty domain has not yet been modularized; legacy rows from pre-modularization carry only the domain FKs and are backfilled per the per-domain audit B10b.*

Reviewed and accepted.

---

## 5. Authoring rule (write-time policy, not DDL)

New rows authored after this plan lands MUST populate both `source_domain_module_id` and `target_domain_module_id`. The only legitimate NULL is when the counterparty domain has not yet been modularized at insert time. In that case the row carries an explicit `notes` annotation in the shape:

> `target NULL until <DOMAIN_CODE> is modularized` (mirroring the existing ATS pre-employee row id=1037, where `target_domain_module_id` is NULL pending HCM modularization)

Loader pre-flight in any new handoff-touching loader (`.tmp_deploy/load_*.ts`) MUST validate this before the POST. The shape of the check:

```typescript
function validateHandoffRow(row: HandoffRow, modularizedDomainIds: Set<number>) {
  if (row.source_domain_module_id === null && modularizedDomainIds.has(row.source_domain_id)) {
    throw new Error(`Handoff row ${row.description}: source_domain_module_id required (source domain ${row.source_domain_code} is already modularized)`);
  }
  if (row.target_domain_module_id === null && modularizedDomainIds.has(row.target_domain_id)) {
    throw new Error(`Handoff row ${row.description}: target_domain_module_id required (target domain ${row.target_domain_code} is already modularized)`);
  }
  if (row.source_domain_module_id === null || row.target_domain_module_id === null) {
    if (!row.notes || !row.notes.match(/until [A-Z0-9_-]+ is modularized/)) {
      throw new Error(`Handoff row ${row.description}: NULL module FK requires explicit notes annotation`);
    }
  }
}
```

The audit gate (B10b in SKILL.md) stays as-is. It already surfaces NULL module FKs as backlog and routes them to per-domain backfill loaders. The deferred `NOT NULL` flip on `source_domain_module_id` / `target_domain_module_id` happens at the same review point that originally gated D3 (after full catalog-wide modularization). The flip is captured in §11 (out of scope) and §12 (deferred-tracking checklist) but does not execute in this plan.

---

## 6. Phase D discovery: out of scope here

The PCF-anchored discovery improvements (and the `handoff_processes` junction that powers them) are split into [plan-handoff-processes.md](plan-handoff-processes.md). The rename + rule-drop in this plan is the prerequisite; the junction work follows once the renamed substrate is in place.

---

## 7. Friction-level disambiguation, do not re-gate

After dropping `cross_domain_only`, do NOT add a replacement validation rule that pre-filters intra-domain rows on async-ness (e.g. "intra-domain rows must have `friction_level` in (medium, high)"). The reasoning:

- Intra-domain rows legitimately include both lifecycle-progression handoffs (in-process FK + state transition, no async hop) and cross-store async handoffs within a domain (real integration cost, just within one domain boundary).
- Lifecycle-progression rows are the cheapest deploy-manifest entries and capturing them is half the value of letting intra-domain rows exist at all. They become the canonical source for "which transitions does this module publish that another module in the same domain subscribes to".
- **Two axes, two columns:** `integration_pattern = 'lifecycle_progression'` (added in §3.7) classifies the structural shape; `friction_level` measures orthogonal operational pain. A lifecycle progression is usually `low` friction but can drift higher if the consumer's state-read is clunky; a cross-store async hop can be `low` friction with a good event stream or `high` with manual reconciliation. Using friction as a proxy for shape (or vice versa) would conflate the two; keeping them separate lets Phase D query either independently.
- Phase D discovery and Signal 2 analysis read both columns at query time. Adding a hard rule that says "intra-domain implies high friction" would push the cheap lifecycle rows out of the table and back into the limbo where they cannot be modeled at all.

Concretely: the only validation rule that goes away is `cross_domain_only`. Nothing replaces it.

---

## 8. Code and documentation sweep

Executed as §9 step 3 immediately after the migration. Find/replace pass across the repo; the known surfaces:

| Surface | Change |
|---|---|
| `.tmp_deploy/discovery_query.ts` (Phase D) | Unfiltered view stays "all handoffs". Signal-2 view adds `source_domain_id != target_domain_id` filter. Per-module bucketing (plan-modules.md §5.2 line 207) and PCF-anchored sub-clustering ([plan-handoff-processes.md](plan-handoff-processes.md)) both stay out of scope here. |
| `scripts/emit_fact_sheet.ts` | Table name in PostgREST URLs; computed-field name (`cross_domain_handoff_label` → `handoff_label`); section labels in rendered markdown. |
| `.tmp_deploy/load_*.ts` (every handoff-touching loader) | Table name; computed-field name. Find/replace; ~30 references catalog-wide. |
| `.claude/skills/domain-map-analyst/SKILL.md` | Hard rule #13 (`cross_domain_handoffs.integration_pattern` row gets the new `lifecycle_progression` value; `friction_level` row unchanged); module-at-a-glance entity row; Phase 3 step 2 ("If the reactor is the same domain, it's intra-domain, out of scope": invert this; intra-domain is now in scope with `integration_pattern: lifecycle_progression` for in-process state transitions); Phase 3 step 3 (add classification guidance: pick `lifecycle_progression` when no message moves, otherwise pick from the existing five values); the anti-pattern "Recording intra-domain events in `cross_domain_handoffs`" (delete or invert); B9 and B10 wording; B10b query paths; trigger-event ownership references; Phase D body; quick-reference reflows. Add the new authoring rule from §5 to the Phase B procedure for any new market load. |
| `.claude/skills/domain-map-analyst/references/module-shape.md` | Entity row for handoffs; field list; description block. |
| `.claude/skills/domain-map-analyst/references/discovery-query.md` | Signal-2 filter doc; intra-domain reading. |
| `plan-modules.md` | §10 line 474 and §12 D3 line 509 amended to mark D3 as **partially fired** (rename done, validation rule dropped, NOT-NULL-flip on module FKs still gated). One-line history note that the validation-rule drop was not originally in §10 / §12 and was added in [plan-handoffs.md](plan-handoffs.md). §13 checklist `[ ] D3` becomes `[~] D3 (rename + rule-drop done; NOT-NULL-flip pending)`. |

The SKILL.md sweep is the largest single artifact but is part of the same PR as the rest.

---

## 9. Execution order

The plan is signed off (§12). Execute end to end without intermediate review gates; any failure aborts the script and the backup (step 1) is the recovery path.

1. **Take a fresh DB backup.** Recovery from any mishap relies on it (§10).
2. **Apply schema changes (§3.1 to §3.7)** as a single `.tmp_deploy/rename_handoffs_table.ts` migration. The script: pre-flight asserts `SELECT * FROM fields WHERE reference_table='cross_domain_handoffs'` returns 0 rows (abort otherwise); snapshots row count and per-module-FK NULL distribution; applies §3.1 to §3.7 in order; post-flight verifies via `semantius call crud read_entity '{"filters":"table_name=eq.handoffs"}'`, a sample `postgrestRequest GET /handoffs?limit=1`, and a post-rename row-count comparison against the snapshot. Any failed assertion aborts the script.
3. **Run the code and documentation sweep (§8)** as a single PR-shaped change. The discovery query gains the Signal-2 filter. Run sweep validation (zero stragglers; no `plan-*.md` leakage into the skill) before commit.
4. **Update plan-modules.md** to record D3 partial firing.

The handoffs table is small enough (1030 rows) that the destructive ops are low-risk.

---

## 10. Recovery

No inverse migration script. Recovery from any mishap is via DB backup, taken in §9 step 1.

---

## 11. Out of scope

Things not in this plan; captured here so they do not creep:

- **`NOT NULL` flip on `source_domain_module_id` / `target_domain_module_id`.** Deferred to the original D3 review gate (full catalog-wide backfill complete). Captured in §11 of plan-modules.md.
- **Per-module bucketing in Phase D discovery** (replacing trigger-event-prefix bucketing with module-pair bucketing). Independent of the PCF-anchored sub-clustering added in §6; plan-modules.md §5.2 line 207 already speculates this. Separate plan.
- **Batch authoring of intra-domain rows for already-modularized domains** (today: just ATS). The new authoring rule applies to *new* loads. A retroactive pass that walks ATS's modules and adds the obvious lifecycle-progression handoffs (e.g. ATS-RECRUITMENT-PIPELINE → ATS-INTERVIEWS on `application.shortlisted`) is valuable but out of scope here; defer to a focused ATS intra-domain pass once the schema lands.
- **PCF-anchored Phase D discovery and the `handoff_processes` junction.** Originally bundled here as §3.7 + §6; split into [plan-handoff-processes.md](plan-handoff-processes.md) so the rename and the junction ship and roll back independently. Includes downstream buyer-facing PCF navigation surfaces.
- **`domain_module_processes` junction** (plan-modules.md §10 line 478). Independent of handoffs.

---

## 12. Progress checklist

Track execution here. Check items off as they land.

### Sign-off (single gate; no mid-execution reviews)

- [ ] Plan reviewed and signed off as a whole. Once checked, §9 runs end to end.

### Schema changes (§3)

- [ ] §3.1: `cross_domain_only` validation rule dropped from the handoffs entity
- [ ] §3.2: Table renamed `cross_domain_handoffs` → `handoffs` (pre-flight FK-orphan check passes; row-count snapshot taken)
- [ ] §3.3: Computed field renamed `cross_domain_handoff_label` → `handoff_label`
- [ ] §3.4: `entities.label_column` updated to `handoff_label`
- [ ] §3.5: Entity description rewritten
- [ ] §3.6: `singular_label` / `plural_label` rewritten
- [ ] §3.7: `lifecycle_progression` added to the `integration_pattern` enum (no backfill of existing rows)
- [ ] Migration script committed at `.tmp_deploy/rename_handoffs_table.ts`
- [ ] Live verification: `semantius call crud read_entity '{"filters":"table_name=eq.handoffs"}'` returns the renamed entity; `GET /handoffs?limit=1` succeeds; `GET /cross_domain_handoffs?limit=1` returns a 404; post-rename row count matches pre-rename snapshot

### Code and documentation sweep (§8)

- [ ] `.tmp_deploy/discovery_query.ts` updated (Signal 2 filter added)
- [ ] `scripts/emit_fact_sheet.ts` updated (table name, computed field name, section labels)
- [ ] All handoff-touching loaders swept for the old table name and computed field name across the 19 files surfaced by grep (`.tmp_deploy/load_*.ts`, `plan-process-skill-discovery.md`, `plan-domain-fact-sheets.md`, `plan-done-master-tasks.md`, `plan-tools-catalog.md`, `todo-process-skill-employee-jml.md`, generated `domain-fact-sheets/modules/*.md`, etc.)
- [ ] `.claude/skills/domain-map-analyst/SKILL.md` updated (rule #13 with the new `lifecycle_progression` value, module-at-a-glance, Phase 3 classification guidance, intra-domain anti-patterns inverted, B9/B10/B10b, quick reference)
- [ ] `.claude/skills/domain-map-analyst/references/module-shape.md` updated (entity row for handoffs, field lists, description blocks)
- [ ] `.claude/skills/domain-map-analyst/references/discovery-query.md` updated (Signal 2 filter doc)
- [ ] `.claude/skills/domain-map-analyst/references/loader-idiom.md` swept for old table name
- [ ] New authoring rule from §5 added to SKILL.md Phase B procedure
- [ ] `plan-modules.md` §10 line 474 and §12 D3 line 509 amended (D3 partially fired, history note added)
- [ ] `plan-modules.md` §13 checklist updated (`[~] D3` partial)

### Sweep validation (run after the sweep, before sign-off)

- [ ] **Zero stragglers:** `rg -i 'cross[_ ]domain[_ ]handoff' --hidden -g '!.git'` returns 0 hits across the entire repo. Each pre-sweep grep hit must either be rewritten or, if the file is a frozen historical record (e.g. `plan-done-master-tasks.md`, `crud.log`), explicitly listed here as an accepted leftover with rationale.
- [ ] **No plan-*.md leakage into the skill:** `rg 'plan-[a-z-]+\.md' .claude/skills/` returns 0 hits. Plans are working docs in the repo root; skill references must stay self-contained. If a sweep edit needs to cite background context, inline the context or move it to a `references/*.md` file under the skill, never link to a `plan-*.md`.

### Deferred (out of scope here, captured for tracking)

- [ ] `NOT NULL` flip on `source_domain_module_id` / `target_domain_module_id` (gated on catalog-wide backfill, original D3 gate)
- [ ] Per-module bucketing in Phase D discovery (plan-modules.md §5.2 follow-up)
- [ ] Retroactive ATS intra-domain handoff load (separate focused pass)
- [ ] PCF-anchored discovery via `handoff_processes` junction (split to [plan-handoff-processes.md](plan-handoff-processes.md))
- [ ] Fact-sheet re-emission (on-demand; not part of this plan, but `scripts/emit_fact_sheet.ts` must continue to build after the rename)
