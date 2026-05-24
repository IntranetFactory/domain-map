# plan-handoff-processes.md: PCF-anchored discovery via handoff_processes junction

> **Status:** design intent (draft). Operational status lives in the progress checklist at the bottom.
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
| `notes` | text | Free-form annotation, e.g. matcher provenance |
| `record_status` | enum | Standard `new` / `approved` / `rejected` / `superseded` workflow per Rule #1 |

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

1. Discovery's existing substring matcher (handoff bucket → PCF process name) already runs and discards its output. This plan persists matches as `handoff_processes` rows with `record_status='new'` instead.
2. User reviews proposed rows as part of the standard post-rerun acceptance pass (Rule #1). Approval flips `record_status='approved'`.
3. Subsequent reruns honor approved rows as ground truth and re-propose new ones for unmatched handoffs.
4. Untagged handoffs never gate discovery; they remain visible via the prefix-only fallback. Modern digital concepts (`data_asset.*`, `dlp_incident.*`, `customer_golden_record.*`) where PCF has no clean match stay untagged forever, and that is the correct shape: those areas are surfaced by other Phase D signals (lifecycle, role, vendor-footprint).

**Marginal cost vs benefit:** discovery rerun cost dominates the substring-match cost; persisting matches that already get computed is the cheapest possible improvement to clustering quality.

---

## 6. Execution order

The plan is signed off (§9). Execute end to end without intermediate review gates; any failure aborts the script and the backup (step 1) is the recovery path. The first discovery rerun is a natural follow-on, not part of this plan's execution: it happens on the user's normal discovery cadence and produces `record_status='new'` rows for review per Rule #1 whenever it next runs.

1. **Take a fresh DB backup.** Recovery from any mishap relies on it (§7).
2. **Create junction table** via `.tmp_deploy/create_handoff_processes.ts`. Pre-flight asserts the `handoffs` table exists (the parent plan's deliverable); abort otherwise. Post-flight verifies `GET /handoff_processes?limit=1` returns `[]`.
3. **Update discovery query** (`.tmp_deploy/discovery_query.ts`) to persist substring-match output as `handoff_processes` rows with `record_status='new'` and to honor approved rows on subsequent runs.
4. **Sweep docs** for the new junction: `.claude/skills/domain-map-analyst/SKILL.md` (PCF-anchored Phase D body), `.claude/skills/domain-map-analyst/references/module-shape.md` (entity row + field list), `.claude/skills/domain-map-analyst/references/discovery-query.md` (PCF-anchored mechanism). Run sweep validation: no `plan-*.md` leakage into the skill (`rg 'plan-[a-z-]+\.md' .claude/skills/` returns 0 hits).

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

- [ ] Plan reviewed and signed off as a whole. Once checked, §6 runs end to end. (Prerequisite [plan-handoffs.md](plan-handoffs.md) is asserted in §6 step 2's pre-flight, not held as a separate review gate.)

### Schema

- [ ] Junction table `handoff_processes` created with `role` enum starting at `['implements']`
- [ ] Migration script committed at `.tmp_deploy/create_handoff_processes.ts`
- [ ] Live verification: `GET /handoff_processes?limit=1` returns `[]`

### Discovery and sweep

- [ ] `.tmp_deploy/discovery_query.ts` persists substring-match output as `handoff_processes` rows with `record_status='new'`; honors approved rows on subsequent runs
- [ ] `.claude/skills/domain-map-analyst/SKILL.md` updated (PCF-anchored Phase D mechanism)
- [ ] `.claude/skills/domain-map-analyst/references/module-shape.md` updated (entity row + field list for `handoff_processes`)
- [ ] `.claude/skills/domain-map-analyst/references/discovery-query.md` updated (PCF-anchored mechanism)
- [ ] Sweep validation: `rg 'plan-[a-z-]+\.md' .claude/skills/` returns 0 hits

### Deferred

- [ ] Additional `role` enum values, when a concrete second pattern emerges
- [ ] Buyer-facing PCF navigation surfaces (separate plan)
