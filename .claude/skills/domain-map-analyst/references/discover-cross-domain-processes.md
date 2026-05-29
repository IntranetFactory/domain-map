# Discover cross-domain processes — mode mechanics

Implements the five-pass Discover mode described in [README.md § c) Discover cross-domain processes](../../../../README.md). Operates catalog-wide (not per-domain) on top of the cross-domain handoff DAG that Research lays down and Validate keeps pairwise-clean.

The mode exists because Phase D was previously a "ranked-table printout" buried under per-market workflows. Once `handoff_processes` became a permanent junction with reviewable rows and `skills.process_id` became a load-bearing FK for APQC linkage, the workflow earned a top-level surface. README's "Two modes" framing was true when Phase D had no persistent substrate; now it's the third mode.

## Layered APQC ownership

APQC linkage is captured at the layer where the information exists. The substring matcher is a fallback, not the primary source:

- **Phase B authors `handoff_processes`** when the per-domain analyst knows the implementing PCF activity (Phase-B deliverable 7). The analyst was reading vendor surface maps, talking to subject matter experts, and reasoning about cross-domain workflows when they wrote the handoff — they often know which PCF activity it implements. Capture that signal at author time.
- **Discover Pass 2 fills the gaps** with substring inference, but ONLY for handoffs Phase B left untagged. Authored rows are never overwritten or re-suggested.
- **Discover Pass 3 reviews both sources** in one batch, with provenance surfaced so authored rows can be weighted higher.

**Rule #1 has no exceptions.** Every `handoff_processes` row the agent writes — Phase B authored, Discover Pass 2 substring-inferred, or override-derived — ships as `record_status='new'`. Author-time tagging captures context; it does not bypass review.

## The dependency on Validate

Discover **layers** APQC PCF mappings + process-skill linkage onto cross-domain handoffs. Each cross-domain `handoffs` row is one edge in the catalog-wide DAG; Discover clusters edges, anchors clusters to PCF activities, and authors process skills whose `skill_tools` orchestrate the cluster.

This only makes sense if the underlying edges are clean. Validate's per-domain Pass 4 (pairwise reconciliation) already guarantees that each handoff between two specific domains is structurally complete: producer master + lifecycle, trigger event, handoff row with both module FKs, consumer DMDO on the target side. Discover assumes this. Pass 0 below is the catalog-wide rollup of those same checks, run as a pre-flight gate.

**Running Discover on unvalidated handoffs is a known failure mode:** APQC clusters get built from edges that may have NULL module FKs, missing consumer DMDOs, or orphaned trigger events. The resulting process skills are anchored to defective substrates and their Semantius coverage rollup is uncomputable in the same way. Pass 0 stops the mode rather than letting this happen.

## The five passes

### Pass 0 — Invoke Validate cross-domain (mode b2) as pre-flight gate

**Pass 0 IS mode b2** (`validate cross-domain`). Same check, different caller. Discover invokes it as a gate; mode b2 is also a top-level user-callable mode for the same audit without Discover's PCF passes.

The check runs five queries against the cross-domain handoff slice of the catalog (`source_domain_id != target_domain_id`):

1. **NULL `source_domain_module_id` on a cross-domain row whose source domain has modules.** `/handoffs?source_domain_id=neq.target_domain_id&source_domain_module_id=is.null&...` cross-joined against `domain_modules` to filter for source domains that actually have modules. Each hit is a Validate B10b failure on the source domain.
2. **NULL `target_domain_module_id` on a cross-domain row whose target domain has modules.** Symmetric to #1. Each hit is a B10b failure on the target domain.
3. **Cross-domain handoff whose `trigger_event_id` resolves to a `trigger_events` row whose `data_object_id` is NOT mastered on the source side.** Each hit is a B9 attribution defect (the event's publisher is not the publisher).
4. **Cross-domain handoff whose `data_object_id` is not declared on the target side via `domain_module_data_objects` with role IN (`consumer`, `contributor`, `embedded_master`).** Each hit is a B8 reverse-direction gap on the target domain.
5. **Cross-domain handoff with a `trigger_events` row that no other handoff references AND no `data_object_lifecycle_states` row whose `permission_verb_override` matches the event's verb suffix.** Each hit is an orphaned event — possible mis-attribution or a stale row.

Group results by the domain that owes the fix. **If any group is non-empty, Discover stops** and surfaces:
- The defect summary by domain
- A recommendation to run per-domain Validate (mode b1) on each affected domain first
- An optional override flag `--proceed-with-known-defects` for the rare case the user knows the defects are accepted (e.g., a domain pending Phase B completion)

When invoked as mode b2 directly (not via Discover), the same output appends to [audits/_validate-cross-domain.md](../../../../audits/_validate-cross-domain.md) rather than [audits/_discover.md](../../../../audits/_discover.md), and there is no Pass 1+/Pass 2/Pass 3 follow-on — mode b2 ends with the audit report.

Read-only by construction.

### Pass 1 — PCF_OVERRIDES sanity

For every non-null entry in [scripts/analytics/discovery_query.ts:135](../../../../scripts/analytics/discovery_query.ts#L135) `PCF_OVERRIDES`, look up the `external_id` in `processes`. If the resolved row's `process_name` does not contain the override's intended `name` substring (or vice versa), flag.

Output table:

| Prefix | Override ext | Override intended name | Resolved process_name | Drift? |
|---|---|---|---|---|

This pass exists because the canonical bug is mis-typed `external_id`. The `subscription` entry once carried `10145` which resolves to "Determine overhead and fixed costs" — a Finance L4 row, completely unrelated to subscription management. 8 `handoff_processes` rows were tagged against the wrong process before the next run caught it. Pass 1 catches this class of bug at audit time, not at use time.

Read-only. Fix list is surfaced for user-approved edits to `PCF_OVERRIDES`; no auto-PATCH of the source file.

### Pass 1.5 — Coverage gap audit

Read-only diff between `handoff_processes` (any `record_status`) and the set of cross-domain `handoffs`. Five categories surface:

| Category | Definition | Discover's response |
|---|---|---|
| **Authored, approved** | Phase B authored the link AND the user has approved | Ground truth; treated as authoritative for Pass 3 clustering; never re-suggested by Pass 2 |
| **Authored, pending** | Phase B authored the link, awaiting user review | **Surfaced for review BEFORE Pass 2 runs** — so substring guesses don't compete with the analyst's intent. User approves / rejects per row |
| **Discovered, pending** | Prior Pass 2 substring-inferred rows still awaiting review | Add to Pass 3 review queue, lower confidence framing than authored-pending |
| **Untagged** | Handoffs with no `handoff_processes` row of any kind | Targets for Pass 2's substring matcher |
| **Conflicting** | Handoff has both an authored row and a discovered row pointing at different processes | **Authored row wins by default** (analyst had context); surface for user arbitration |

Output table:

| handoff_id | trigger_event_name | source_domain | target_domain | authored_processes | discovered_processes | category |
|---|---|---|---|---|---|---|

Read-only by construction. Pass 1.5 ends with the user resolving the **Authored-pending** and **Conflicting** sets before Pass 2 fires.

### Pass 2 — Substring discovery (gap-fill) + persist

`bun run scripts/analytics/discovery_query.ts --persist` from project root.

**Narrowed scope:** runs ONLY against the "Untagged" set from Pass 1.5 — handoffs with no existing `handoff_processes` row, authored or discovered. **Authored rows from Phase B are never overwritten** because the matcher never sees their handoffs.

Two outputs:
1. **Ranked candidate table** (`--top 25` by default) sorted by `friction_score × distinct_function_count`. Each row carries `(prefix, handoff_count, domain_count, function_count, friction_score, friction_high_count, top_3_events, pcf_match)`. The user reads this to find process-skill candidates that don't yet have a `skills` row.
2. **New `handoff_processes` rows** inserted with `record_status='new'` for every `(handoff_id, process_id)` pair in the untagged set that has never been proposed before. The sticky-rejection contract holds: existing `approved` and `rejected` rows survive untouched. New rows only fan out from buckets where `guessPcfMatch` returns a non-null `id` (curated override or substring match).

The candidate table is printed; the `handoff_processes` rows are persisted.

### Pass 3 — Review queue + process-skill authoring (the ONLY place process skills are generated)

Two sub-steps that close the chain `tool → skill_tools → skill → process → APQC PCF`:

**3a. Batch review of `handoff_processes WHERE record_status='new'`.** Group by `process_id`, sort by row count desc. The Pass-1.5 review of authored-pending rows happened earlier, so by this point most authored rows are already approved or rejected. This sub-step focuses on the discovered-pending set from Pass 2.

For each top-N process, surface:
- PCF row name + `external_id` + `hierarchy_level`
- The tagged handoffs as `(trigger_event_name, source_domain_code, target_domain_code, friction_level, provenance)` tuples — provenance = `human_curateded` (if leftover authored-pending) or `discovered_substring`
- The user's review choice: `approve` / `reject` / `defer`

Apply choices via PATCH `record_status`. Rule #1 applies: the agent never auto-flips to `approved`.

**3b. Process-skill linkage.** For each process where `handoff_processes` accumulates `record_status='approved'` rows above some threshold (default: ≥3 approved rows on a process means the orchestration is real), check whether a `skills` row exists with `skill_type='process' AND process_id=<id>`. Three sub-cases:

1. **Process-skill exists with `process_id` set correctly:** nothing to do. Score the skill via the existing tools layer and surface in the report.
2. **Process-skill exists with `process_id=NULL`:** propose PATCH to set `process_id`. The 3 process skills loaded as of 2026-05-29 (`employee-jml-process`, `opportunity-l2c-process`, `case-service-process`) sit in this state.
3. **No process-skill exists yet:** propose authoring one. Derive the involved-domain set from the bucket's source + target domains; derive required tools per § "Process-skill tool derivation" (auto-derive `query_<master>` tools across all involved domains' masters; mutates from target-side writes; cross-tranche externals like `send_email`, `sign_document` per the cross-tranche patterns). Surface for user approval per Rule #1. All new `skills` and `skill_tools` rows ship as `record_status='new'`.

Pass 3 is the only pass that writes outside the `handoff_processes.record_status` PATCH and the optional `skills.process_id` PATCH. Loader writes (a new `skills` row + its `skill_tools` set) only happen on explicit per-row approval.

## Re-runnability

The mode is idempotent end-to-end:
- Pass 0 reads live state; re-running after Validate fixes land surfaces the new clean state.
- Pass 1 reads `PCF_OVERRIDES` from the script file + `processes` from live state; deterministic.
- Pass 2's `--persist` honors the sticky-rejection contract (existing `(handoff_id, process_id)` pairs are skipped regardless of `record_status`).
- Pass 3's review queue shrinks monotonically as the user approves / rejects rows.

A typical cadence: run Discover after a Validate sweep brings several domains to clean state, and again whenever 50+ new cross-domain handoffs land via Research or fix-loop work.

## Output artifact

The Discover report is **appended** to `audits/_discover.md` (a single catalog-wide append-only file; sits next to the per-domain `audits/<DOMAIN>.md` files). Each Discover run adds one new dated section containing:

- Pass 0 substrate sanity summary (which domains had defects, whether the mode proceeded or stopped)
- Pass 1 PCF_OVERRIDES drift findings + the user's resolution per finding
- Pass 1.5 coverage gap audit: counts by category (authored-approved, authored-pending, discovered-pending, untagged, conflicting) + user's resolution of authored-pending and conflicting before Pass 2 ran
- Pass 2 ranked candidate table snapshot + the `handoff_processes` write count (against the untagged-only subset)
- Pass 3 review-queue state (per-process approval counts, broken out by provenance) + which process skills got `process_id` backfilled or newly authored

The raw subagent / ranked-table JSON dumps stay in `c:/tmp/` (gitignored, ephemeral).

## Anti-patterns

- ❌ Skipping Pass 0 because "we just want the ranked candidates". The candidates are derived from the same handoff DAG; if the DAG has NULL module FKs, the candidates are over-counted or mis-attributed. Pass 0 takes seconds; never skip.
- ❌ Skipping Pass 1.5 because "we just want to run discovery". Pass 1.5 prevents Pass 2 from over-writing or duplicating Phase B's authored tags. Without it, the substring matcher will compete with the analyst's curated link, and the authored link gets buried under low-quality substring guesses on the same handoffs.
- ❌ **Setting `record_status='approved'` on any `handoff_processes` row in any script — no exception for Phase B authored rows.** Rule #1 applies uniformly: every row the agent generates is `record_status='new'`. The author's context is captured in provenance and surfaced at Pass 3 review, but does NOT bypass user approval. Auto-approving authored rows would create a class of "trust me, the analyst said so" tags that escape review, which is exactly the failure mode Rule #1 forbids.
- ❌ Bypassing Phase B authoring when the analyst knows the PCF activity. The information dies at handoff-creation time if not captured — Discover has to recover it later via substring matching, which is lossy. When you know, tag at author time; the `record_status='new'` flag protects review discipline.
- ❌ Authoring a process skill before its handoff_processes are approved. The skill's required-tool set is derived from the involved-domain set, which is derived from the approved cluster. Authoring from un-reviewed proposals embeds substring-match defects into the skill's tools.
- ❌ Hand-patching `PCF_OVERRIDES` without re-running Pass 1. The sanity check is the regression test for the override file; bypassing it is how the subscription-shaped bug ships in the first place.
- ❌ Treating Discover as a per-market step run after every domain load. Discover is catalog-wide. Running it after a single Research load processes the same 99% of substrate the previous run did; the new 1% rarely changes the ranked candidates.
- ❌ Re-running Discover while Validate is failing on >2 of the catalog's domains. Pass 0 will stop the mode; running Validate on the affected domains first is the right sequencing.

## Related references

- [README.md § c) Discover cross-domain processes](../../../../README.md) — mode-level overview, triggers, output discipline.
- [discovery-query.md](discovery-query.md) — the ranked candidate analytic itself (Pass 2's mechanics + clustering signals).
- [semantius-coverage-rollup.md](semantius-coverage-rollup.md) — sibling analytic for system-skill coverage; Discover's Pass 3 process-skill authoring uses the same coverage formulas at the per-skill layer.
- [SKILL.md § Phase D](../SKILL.md#phase-d--process-skill-discovery-substrate-level) — the analytic spec the discovery query implements (clustering, ranking, the 5 signals).
- [SKILL.md § Process-skill tool derivation](../SKILL.md#process-skill-tool-derivation) — the authoring recipe Pass 3 sub-step 3 uses.
