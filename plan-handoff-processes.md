# plan-handoff-processes.md: PCF-anchored discovery via handoff_processes junction

> **Status:** signed off 2026-05-24, executing. Operational status lives in the progress checklist at the bottom.
>
> **Scope:** add a many-to-many junction `handoff_processes` between `handoffs` and `processes` (APQC PCF rows + custom processes), and use it to sharpen Phase D discovery's clustering quality. The junction starts empty; discovery proposes rows from substring matches that today are computed and discarded.
>
> **Prerequisite:** [plan-handoffs.md](plan-handoffs.md) must be complete (the `handoffs` table must exist under its new name).
>
> **Why split from plan-handoffs.md:** the parent plan handles the rename + validation-rule drop, which are mechanical and reversible. This plan adds a new table, a new role enum, and a new review workflow whose rollback window closes as soon as user-approved junction rows accumulate. The two concerns ship and revert independently.

---

## 1. Decision summary

| Decision | Outcome |
|---|---|
| Create `handoff_processes` junction `(handoff_id, process_id, role, notes, record_status)` | YES |
| `role` enum starting values | Start with one value: `implements`. Add others only when discovery surfaces a concrete need (see §3) |
| Discovery rerun persists substring matches instead of discarding | YES |
| User-review loop for proposed rows (Rule #1: `record_status='new'` → user approves → `'approved'`) | YES |
| Buyer-facing PCF navigation surface ("show me every handoff that implements PCF X.Y.Z") | Out of scope; separate plan once junction is populated and quality is known |

---

## 2. Schema

Single junction table created via additive migration:

| Column | Type | Notes |
|---|---|---|
| `handoff_id` | FK → `handoffs` | Required |
| `process_id` | FK → `processes` | Required |
| `role` | enum | Single starting value `implements` (this handoff IS the activity). Other values added when concrete cases demand them, not preemptively |
| `notes` | text | Empty by default. Populated only when there is something exceptional, custom, or special to call out about the pair (e.g. a hand-curated override that overrides a wrong substring match, or a note explaining why an approver kept a borderline match). The provenance of an auto-matched row is recoverable from `discovery_query.ts` + the bucket's prefix, so storing it on every row is noise. |
| `record_status` | enum | Standard `new` / `approved` / `rejected` / `superseded` workflow per Rule #1 |
| `key` | text, computed, unique | Natural-key idempotency column. Mirrors the `handoffs.key` pattern: computed field defined on `entities.computed_fields` via JsonLogic `concat`, materialized into a real column by a BEFORE INSERT/UPDATE trigger, with `unique_value: true` enforcing a partial unique index. JsonLogic body is `{ "concat": [ { "var": "handoff_id" }, ".", { "var": "process_id" } ] }`. The 2-tuple `(handoff_id, process_id)` is the natural key; `role` is metadata about the pair, not part of identity (a single handoff-process pair gets one row, and the `role` may evolve via update if a second pattern emerges per §3). |

**Rerun idempotency contract.** Discovery's persistence step (§5 step 1) MUST treat any row whose `key` already exists as untouchable, regardless of `record_status`. This makes `rejected` rows sticky (they will not be re-proposed) and `approved` rows ground-truth (they survive reruns unchanged). New rows are only inserted for `(handoff_id, process_id)` pairs that have never been proposed before. The unique constraint on `key` is the database-side backstop if the application-layer check is ever bypassed.

Migration is packaged as `.tmp_deploy/create_handoff_processes.ts` following the standard loader idiom.

---

## 3. Why `role` starts with one value

An earlier draft of this plan defined four roles preemptively (`implements`, `triggers`, `completes`, `participates_in`). Two problems:

- `participates_in` is a junk-drawer value that will absorb everything the other three do not fit, and once it dominates the enum, the distinction becomes meaningless.
- The matcher's output shape is unknown. Defining roles before seeing what it actually proposes means inventing a taxonomy with no data behind it.

Start with `implements` (the obvious case: handoff IS the activity). When discovery proposes rows that clearly do not fit `implements` and a second pattern emerges (trigger-only, completion-only, multi-event participation), add the role then. Enum additions are cheap; cleaning up misused enum values is not.

---

## 4. PCF-anchored discovery mechanism

Today's Phase D bucketing rule (trigger-event prefix) systematically conflates distinct processes that share a noun prefix (e.g. `employee.*` lumps Joiner, Leaver, Mover together) and never connects handoffs across different prefixes that implement the same process (e.g. PCF 6.1.4 "Manage employee onboarding" spans `employee.created`, `onboarding_journey.started`, `i9_form.completed`, `equipment_request.fulfilled`, `payroll.first_check_scheduled`: five prefixes today, one process). The junction gives discovery a second clustering axis grounded in an external taxonomy.

**Three uses:**

1. **Sub-cluster within trigger-event prefix buckets** by PCF activity. Tagged rows sharpen the cluster; untagged rows fall back to today's prefix grouping.
2. **Connect handoffs across different trigger-event prefixes** that share a PCF activity. Surfaces process candidates that today's discovery structurally cannot find.
3. **Localize friction within coarse buckets** by computing `friction_score` per PCF activity instead of per prefix.

---

## 5. Production workflow

The junction is populated by discovery, not by hand:

1. Discovery's existing matcher (`guessPcfMatch(prefix)` in [discovery_query.ts:148](.tmp_deploy/discovery_query.ts#L148)) already resolves each trigger-event-prefix bucket to a PCF row. Today its output is only used in the printed table and then discarded. This plan persists it.
   - **Fan-out:** for each bucket whose `guessPcfMatch` returns a non-null `id`, insert one `handoff_processes` row per handoff in the bucket with `(handoff_id, process_id, role='implements', record_status='new', notes='')`. A bucket with N handoffs produces N rows, all pointing at the same `process_id`.
   - **Override vs substring:** persist whatever `guessPcfMatch` returns regardless of how it was derived (`PCF_OVERRIDES`, exact-name lookup, or substring fallback). Hand-curated overrides are the highest-quality matches and absolutely should land in the table. Buckets where `guessPcfMatch` returns `{id: null}` (the four `PCF_OVERRIDES` entries set to `null`, plus any substring miss) produce zero rows: those buckets are correctly untagged for now.
   - **Idempotency on rerun:** per §2's contract, any `(handoff_id, process_id)` pair whose `key` already exists is skipped on the application side before the POST. The unique index is the backstop.
2. User reviews proposed rows as part of the standard post-rerun acceptance pass (Rule #1). Approval flips `record_status='approved'`. Rejection flips to `'rejected'` and the row stays put (the sticky-rejection contract in §2 prevents re-proposal).
3. Subsequent reruns honor approved AND rejected rows as already-decided and propose new ones only for `(handoff_id, process_id)` pairs that have never been seen. When `PCF_OVERRIDES` is updated to reclassify a bucket (e.g. `employee` switches to a different PCF row), the old approved/rejected rows under the previous `process_id` stay (history), and the new `process_id` produces fresh `new` rows for review.
4. Untagged handoffs never gate discovery; they remain visible via the prefix-only fallback. Modern digital concepts (`data_asset.*`, `dlp_incident.*`, `customer_golden_record.*`) where PCF has no clean match stay untagged forever, and that is the correct shape: those areas are surfaced by other Phase D signals (lifecycle, role, vendor-footprint).

**Marginal cost vs benefit:** discovery rerun cost dominates the substring-match cost; persisting matches that already get computed is the cheapest possible improvement to clustering quality.

---

## 6. Execution order

The plan is signed off (§9). Execute end to end without intermediate review gates; any failure aborts the script and the backup (step 1) is the recovery path. The first discovery rerun is a natural follow-on, not part of this plan's execution: it happens on the user's normal discovery cadence and produces `record_status='new'` rows for review per Rule #1 whenever it next runs.

1. **Take a fresh DB backup.** Recovery from any mishap relies on it (§7).
2. **Create junction table** via `.tmp_deploy/create_handoff_processes.ts`. Pre-flight asserts the `handoffs` table exists (the parent plan's deliverable); abort otherwise. Post-flight verifies:
   - `GET /handoff_processes?limit=1` returns `[]`
   - `GET /entities?table_name=eq.handoff_processes&select=computed_fields` includes the `key` computed field with the JsonLogic body from §2
   - `GET /fields?table_name=eq.handoff_processes&field_name=eq.key&select=unique_value` returns `[{ "unique_value": true }]`
   - **Unique-constraint smoke test:** insert one synthetic row `(handoff_id=<X>, process_id=<Y>)` and confirm a second POST with the same pair fails on the unique index. Roll the synthetic row back before exit.
3. **Sweep stale endpoint in [discovery_query.ts:30](.tmp_deploy/discovery_query.ts#L30):** the GET path still reads `/cross_domain_handoffs`. The parent plan's §12 checklist marked this file swept but missed line 30; the endpoint 404s today against the renamed table. Replace `/cross_domain_handoffs` with `/handoffs` and rename the local variable accordingly. Pre-flight on rerun: `GET /handoffs?limit=1` returns rows.
4. **Update discovery query** (`.tmp_deploy/discovery_query.ts`) to persist `guessPcfMatch` output as `handoff_processes` rows per §5: fan out one row per handoff in matched buckets, skip buckets with `{id: null}`, skip pairs whose `key` already exists, leave `notes=''` by default. Honors approved AND rejected rows on subsequent runs by the existence-of-`key` check (no read of `record_status` required).
5. **Sweep docs** for the new junction: `.claude/skills/domain-map-analyst/SKILL.md` (PCF-anchored Phase D body), `.claude/skills/domain-map-analyst/references/module-shape.md` (entity row + field list), `.claude/skills/domain-map-analyst/references/discovery-query.md` (PCF-anchored mechanism). Run sweep validation: no `plan-*.md` leakage into the skill (`rg 'plan-[a-z-]+\.md' .claude/skills/` returns 0 hits).

---

## 7. Recovery

No inverse migration script. Recovery from any mishap is via DB backup, taken in §6 step 1.

---

## 8. Out of scope

- **Buyer-facing PCF navigation surfaces** ("show me every handoff that implements PCF X.Y.Z" as a public fact sheet or SEO landing page). The junction supports this query shape, but rendering it as a buyer-facing surface is a separate plan once junction population is mature and quality is known.
- **Adding `role` enum values beyond `implements`.** Defer until discovery proposes rows that demand a second value.
- **`domain_module_processes` junction** ([plan-modules.md](plan-modules.md) §10 line 478). Independent of this junction; module-to-process linkage is a different query shape.

---

## 9. Progress checklist

### Sign-off (single gate; no mid-execution reviews)

- [x] Plan reviewed and signed off as a whole. Once checked, §6 runs end to end. (Prerequisite [plan-handoffs.md](plan-handoffs.md) is asserted in §6 step 2's pre-flight, not held as a separate review gate.) *(signed off 2026-05-24; backup = Neon PITR window, no script)*

### Schema

- [ ] Junction table `handoff_processes` created with `role` enum starting at `['implements']`
- [ ] `key` computed field present in `entities.computed_fields` (JsonLogic concat of `handoff_id` + `.` + `process_id`); materialized column exists with `unique_value: true`
- [ ] Migration script committed at `.tmp_deploy/create_handoff_processes.ts`
- [ ] Live verification: `GET /handoff_processes?limit=1` returns `[]`; `key` computed field present; `unique_value: true` on `fields.key`; synthetic duplicate-pair POST rejected by the unique index

### Discovery and sweep

- [ ] `.tmp_deploy/discovery_query.ts` line 30 swept: `/cross_domain_handoffs` → `/handoffs` (parent-plan straggler); `GET /handoffs?limit=1` succeeds on rerun
- [ ] `.tmp_deploy/discovery_query.ts` persists `guessPcfMatch` output as `handoff_processes` rows with `record_status='new'`, fan-out per handoff, skipping pairs whose `key` exists; `notes=''` by default
- [ ] First post-deploy discovery rerun produces ≥1 `handoff_processes` row with `record_status='new'` (end-to-end smoke check)
- [ ] `.claude/skills/domain-map-analyst/SKILL.md` updated (PCF-anchored Phase D mechanism)
- [ ] `.claude/skills/domain-map-analyst/references/module-shape.md` updated (entity row + field list for `handoff_processes`)
- [ ] `.claude/skills/domain-map-analyst/references/discovery-query.md` updated (PCF-anchored mechanism)
- [ ] Sweep validation: `rg 'plan-[a-z-]+\.md' .claude/skills/` returns 0 hits

### Deferred

- [ ] Additional `role` enum values, when a concrete second pattern emerges
- [ ] Buyer-facing PCF navigation surfaces (separate plan)
