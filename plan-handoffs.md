# plan-handoffs.md — Make intra-domain handoffs first-class

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
| Add a new validation rule to replace `cross_domain_only` (e.g. "intra-domain rows must be async")? | NO. Let `friction_level` do the disambiguation (§6) |
| Split into two tables (legacy nullable-module-FK rows vs new required-module-FK rows)? | NO. The distinction is temporal, not structural. Same columns, same semantics, same FKs. UNION tax across two tables for a transitional state is the wrong trade |

---

## 2. Naming choice: `handoffs`

Rejected alternatives:

- **`module_handoffs`** and **`domain_module_handoffs`** both imply rows are required to be module-attributed. They are not. `source_domain_module_id` / `target_domain_module_id` are nullable today and stay nullable through the catalog-wide backfill window. 99% of existing rows are still NULL on these columns (per SKILL.md B10b, 1019/1029 as of 2026-05-23 ATS backfill). Pure cross-domain rows with NULL module FKs are valid through that entire window.
- The `domain_module_` prefix on `domain_module_capabilities` / `domain_module_data_objects` / `domain_module_host_domains` is correct for those tables because they are junctions that *require* a `domain_module_id`. Handoffs are not such a junction: the module FKs are attribution metadata layered on a row whose load-bearing FKs remain `domains` and `data_objects`.

Plain `handoffs` is the name plan-modules.md §10 line 474 already specified, accurately covers both intra-domain cross-module and pure cross-domain rows, and does not over-promise.

---

## 3. Schema changes

All applied via a single migration script. Additive plus one rename and one rule drop. No data loss.

| # | Change | Notes |
|---|---|---|
| 3.1 | Drop validation rule `cross_domain_only` on `cross_domain_handoffs` | The rule body is `{"!=": [{"var": "source_domain_id"}, {"var": "target_domain_id"}]}`. Remove via `update_entity` on the entity's `validation_rules` array. |
| 3.2 | Rename table `cross_domain_handoffs` → `handoffs` | Semantius `update_entity` accepts a new `table_name`. Cascade hits: every FK column with `reference_table='cross_domain_handoffs'` (none today; verify before rename), PostgREST URL paths in loaders, fact-sheet emitter queries. |
| 3.3 | Rename computed field `cross_domain_handoff_label` → `handoff_label` | Update the field's `field_name`. The JsonLogic body keeps working as-is (label text is "<source_domain> → <target_domain> : <event>" which reads correctly for both intra-domain cross-module rows and pure cross-domain rows). |
| 3.4 | Update `entities.label_column` reference from `cross_domain_handoff_label` to `handoff_label` | One-line `update_entity` PATCH on the `label_column` field. |
| 3.5 | Rewrite entity `description` | New description names both purposes explicitly. Draft in §4. |
| 3.6 | Rewrite `singular_label` "Cross-Domain Handoff" → "Handoff", `plural_label` "Cross-Domain Handoffs" → "Handoffs" | Same `update_entity` PATCH. |

The migration ships as a single Bun/TypeScript loader under `.tmp_deploy/rename_handoffs_table.ts` following the standard loader idiom.

---

## 4. New entity description, draft for review

The current description says:

> *Directional event-driven handoffs between two distinct domains, sharing a data object. Captures the integration friction that an integrated platform would absorb: each row is a pipeline / API call / human handoff that exists today because the source and target domains live in separate systems. Signal 2 of the platform-vs-silos analysis (Signal 1 is the multi-master count on domain_data_objects.role). Intra-domain events are out of scope by design, see the cross_domain_only validation rule.*

Proposed replacement:

> *Directional event-driven handoffs between two `domain_modules`, sharing a data object. A row models either (a) a cross-domain handoff between modules in different domains (the historical Signal 2 case), or (b) an intra-domain handoff between two modules in the same domain (cross-store async wiring or in-process lifecycle progression). `source_domain_module_id` / `target_domain_module_id` carry the per-module attribution; `source_domain_id` / `target_domain_id` are the rollup. `friction_level` disambiguates expensive async wiring (`medium` / `high`) from cheap in-process lifecycle walks (`low`); Signal 2 of the platform-vs-silos analysis filters on `source_domain_id != target_domain_id` at the query layer (see Phase D). Authoring rule: new rows MUST populate both module FK columns unless the counterparty domain has not yet been modularized; legacy rows from pre-modularization carry NULL on the module FKs and are backfilled per the per-domain audit B10b.*

The description gets reviewed by the user before §3 hits live.

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
    if (!row.notes || !row.notes.match(/until \w+ is modularized/)) {
      throw new Error(`Handoff row ${row.description}: NULL module FK requires explicit notes annotation`);
    }
  }
}
```

The audit gate (B10b in SKILL.md) stays as-is. It already surfaces NULL module FKs as backlog and routes them to per-domain backfill loaders. The deferred `NOT NULL` flip on `source_domain_module_id` / `target_domain_module_id` happens at the same review point that originally gated D3 (after full catalog-wide modularization). The flip is captured in §11 below but does not execute in this plan.

---

## 6. Friction-level disambiguation, do not re-gate

After dropping `cross_domain_only`, do NOT add a replacement validation rule that pre-filters intra-domain rows on async-ness (e.g. "intra-domain rows must have `friction_level` in (medium, high)"). The reasoning:

- Intra-domain rows legitimately include both lifecycle-progression handoffs (FK + state transition, no async, `friction_level: low`) and cross-store async handoffs within a domain (`friction_level: medium / high`).
- Lifecycle-progression rows are the cheapest deploy-manifest entries and capturing them is half the value of letting intra-domain rows exist at all. They become the canonical source for "which transitions does this module publish that another module in the same domain subscribes to".
- The `friction_level` column already disambiguates. Phase D discovery and Signal 2 analysis read it at query time. Adding a hard rule that says "intra-domain implies high friction" would push the cheap rows out of the table and back into the limbo where they cannot be modeled at all.

Concretely: the only validation rule that goes away is `cross_domain_only`. Nothing replaces it.

---

## 7. Code and documentation sweep

After §3 ships, find/replace pass across the repo. The known surfaces:

| Surface | Change |
|---|---|
| `.tmp_deploy/discovery_query.ts` (Phase D) | Unfiltered view stays "all handoffs". Signal-2 view adds `source_domain_id != target_domain_id` filter. Per-module discovery (already speculated in plan-modules.md §5.2 line 207) becomes the natural intra-domain reading: same five clustering signals, applied at module-pair granularity instead of domain-pair. |
| `scripts/emit_fact_sheet.ts` | Table name in PostgREST URLs; computed-field name (`cross_domain_handoff_label` → `handoff_label`); section labels in rendered markdown. Per-module fact sheets gain a natural intra-domain handoff section (currently empty across the catalog). |
| `.tmp_deploy/load_*.ts` (every handoff-touching loader) | Table name; computed-field name. Find/replace; ~30 references catalog-wide. |
| `.claude/skills/domain-map-analyst/SKILL.md` | Hard rule #13 (`cross_domain_handoffs.integration_pattern` and `friction_level` rows); module-at-a-glance entity row; Phase 3 step 2 ("If the reactor is the same domain, it's intra-domain, out of scope"); Phase 3 step 3 (friction_level guidance unchanged); the anti-pattern "Recording intra-domain events in `cross_domain_handoffs`"; B9 and B10 wording; B10b query paths; trigger-event ownership references; Phase D body; quick-reference reflows. Add the new authoring rule from §5 to the Phase B procedure for any new market load. |
| `.claude/skills/domain-map-analyst/references/module-shape.md` | Entity row for handoffs; field list; description block. |
| `.claude/skills/domain-map-analyst/references/discovery-query.md` | Signal-2 filter doc; intra-domain reading. |
| `plan-modules.md` | §10 line 474 and §12 D3 line 509 amended to mark D3 as **partially fired** (rename done, validation rule dropped, NOT-NULL-flip on module FKs still gated). One-line history note that the validation-rule drop was not originally in §10 / §12 and was added in [plan-handoffs.md](plan-handoffs.md). §13 checklist `[ ] D3` becomes `[~] D3 (rename + rule-drop done; NOT-NULL-flip pending)`. |

The SKILL.md sweep is the largest single artifact. Draft the SKILL.md diff for review before applying it.

---

## 8. Execution order

1. **Draft new entity description + labels + new authoring rule wording** (§4 + §5). User reviews wording before any DDL.
2. **Apply schema changes** (§3.1 to §3.6) as a single `.tmp_deploy/rename_handoffs_table.ts` migration. Verify via `semantius call crud read_entity '{"filters":"table_name=eq.handoffs"}'` and a sample `postgrestRequest GET /handoffs?limit=1` after the rename.
3. **Test the dropped rule** by inserting a deliberate intra-domain row (e.g. ATS-RECRUITMENT-PIPELINE → ATS-OFFERS on a lifecycle-progression event) and verifying the insert succeeds with `friction_level: low`. Surface the new row id to the user; it becomes the canonical example for the new authoring rule. Decide afterward whether to keep the row (and load a small batch of obvious ATS intra-domain rows the audit will subsequently surface) or roll it back as a smoke-test only.
4. **Run the code and documentation sweep** (§7) as a single PR-shaped change. Draft the SKILL.md diff and surface for review before applying.
5. **Re-emit all affected fact sheets** (`bun run scripts/emit_fact_sheet.ts --all`). Compare against the pre-rename render; the diff should be limited to section labels and the new intra-domain section appearing on per-module fact sheets that have intra-domain rows (initially: empty everywhere except the ATS smoke-test row from step 3, if kept).
6. **Update plan-modules.md** (§7 last row) to record D3 partial firing.

The handoffs table is small enough (1030 rows) that the destructive ops are low-risk; rollback shape is the inverse rename plus re-adding the `cross_domain_only` rule. Hold the inverse migration in `.tmp_deploy/` until step 5 is verified.

---

## 9. Rollback

If anything in §8 surfaces a problem, the inverse migration:

1. Re-rename `handoffs` → `cross_domain_handoffs` (and the computed-field name + label_column reference).
2. Re-add the `cross_domain_only` validation rule.
3. Delete any intra-domain rows authored during the window (they were always smoke-test-only; production loaders had not yet been updated to author them).
4. Inverse find/replace across loaders, emitter, SKILL.md.

The window for rollback closes once production loaders start authoring intra-domain rows. After that point, rollback would require either (a) merging intra-domain rows into pure cross-domain rows (lossy, breaks module attribution), or (b) deleting them outright (loses authoring work). Neither is good; the rollback window is "until step 5 verified."

---

## 10. Out of scope

Things not in this plan; captured here so they do not creep:

- **`NOT NULL` flip on `source_domain_module_id` / `target_domain_module_id`.** Deferred to the original D3 review gate (full catalog-wide backfill complete). Captured in §11 of plan-modules.md.
- **Per-module discovery query rewrite.** plan-modules.md §5.2 line 207 already speculates this. Becomes more tractable once intra-domain rows exist, but the actual rewrite is a separate plan.
- **Batch authoring of intra-domain rows for already-modularized domains** (today: just ATS). The new authoring rule applies to *new* loads. A retroactive pass that walks ATS's modules and adds the obvious lifecycle-progression handoffs (e.g. ATS-RECRUITMENT-PIPELINE → ATS-INTERVIEWS on `application.shortlisted`) is valuable but out of scope here; defer to a focused ATS intra-domain pass once the schema lands.
- **`domain_module_processes` junction** (plan-modules.md §10 line 478). Independent of handoffs.

---

## 11. Progress checklist

Track execution here. Check items off as they land.

### Sign-off and design

- [ ] Plan reviewed and signed off
- [ ] New entity description (§4) reviewed and accepted
- [ ] New authoring rule wording (§5) reviewed and accepted
- [ ] SKILL.md diff (§7) drafted and surfaced for review

### Schema changes (§3)

- [ ] §3.1 — `cross_domain_only` validation rule dropped from the handoffs entity
- [ ] §3.2 — Table renamed `cross_domain_handoffs` → `handoffs`
- [ ] §3.3 — Computed field renamed `cross_domain_handoff_label` → `handoff_label`
- [ ] §3.4 — `entities.label_column` updated to `handoff_label`
- [ ] §3.5 — Entity description rewritten
- [ ] §3.6 — `singular_label` / `plural_label` rewritten
- [ ] Migration script committed at `.tmp_deploy/rename_handoffs_table.ts`
- [ ] Live verification: `semantius call crud read_entity '{"filters":"table_name=eq.handoffs"}'` returns the renamed entity; `GET /handoffs?limit=1` succeeds; `GET /cross_domain_handoffs?limit=1` returns a 404

### Smoke test (§8 step 3)

- [ ] Smoke-test row authored: ATS intra-domain handoff with `friction_level: low` (intra-domain insert succeeds with the rule dropped)
- [ ] Decision recorded: keep the smoke-test row, or roll back as test-only

### Code and documentation sweep (§7)

- [ ] `.tmp_deploy/discovery_query.ts` updated (Signal 2 filter, intra-domain reading documented)
- [ ] `scripts/emit_fact_sheet.ts` updated (table name, computed field name, section labels, intra-domain section on per-module fact sheets)
- [ ] All handoff-touching loaders in `.tmp_deploy/load_*.ts` swept for the old table name and computed field name
- [ ] `.claude/skills/domain-map-analyst/SKILL.md` updated (rule #13, module-at-a-glance, Phase 3, anti-patterns, B9/B10/B10b, Phase D, quick reference)
- [ ] `.claude/skills/domain-map-analyst/references/module-shape.md` updated (entity row, field list, description block)
- [ ] `.claude/skills/domain-map-analyst/references/discovery-query.md` updated (Signal 2 filter doc)
- [ ] New authoring rule from §5 added to SKILL.md Phase B procedure
- [ ] `plan-modules.md` §10 line 474 and §12 D3 line 509 amended (D3 partially fired, history note added)
- [ ] `plan-modules.md` §13 checklist updated (`[~] D3` partial)

### Fact-sheet re-emission (§8 step 5)

- [ ] `bun run scripts/emit_fact_sheet.ts --all` runs cleanly post-rename
- [ ] Pre/post diff inspected; changes limited to expected surfaces (table-name references, intra-domain sections on per-module sheets)

### Deferred (out of scope here, captured for tracking)

- [ ] `NOT NULL` flip on `source_domain_module_id` / `target_domain_module_id` (gated on catalog-wide backfill, original D3 gate)
- [ ] Per-module discovery query rewrite (plan-modules.md §5.2 follow-up)
- [ ] Retroactive ATS intra-domain handoff load (separate focused pass)
