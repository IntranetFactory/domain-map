# Discovery query — process-skill candidates

Implements the discovery procedure described in [SKILL.md § Phase D](../SKILL.md#phase-d--process-skill-discovery-substrate-level). Buckets `handoffs` by trigger-event prefix, computes friction-weighted metrics, and ranks by `friction_score × distinct_function_count`.

**Cross-domain candidacy filter.** The discovery query for cross-domain process-skill candidacy must filter `source_domain_id != target_domain_id` (Signal 2). Intra-domain rows (typically `integration_pattern: lifecycle_progression`) are valuable for module-level deployment manifests but should not feed the cross-domain platform-vs-silos signal.

Implementation: [.tmp_deploy/discovery_query.ts](../../../../.tmp_deploy/discovery_query.ts). Run from project root.

```sh
# Top 25 candidates (human table)
bun run .tmp_deploy/discovery_query.ts --top 25

# Full ranked list
bun run .tmp_deploy/discovery_query.ts

# JSON dump (e.g. piping into downstream rank-aware tooling)
bun run .tmp_deploy/discovery_query.ts --json --top 30

# Detailed drill-down on one bucket
bun run .tmp_deploy/discovery_query.ts --bucket employee
```

## Bucketing rule (v1)

Primary clustering signal: **trigger-event prefix** (everything before the first `.`). E.g. all of `employee.created`, `employee.terminated`, `employee.position_changed` go into the `employee` bucket.

The other clustering signals (data-object lifecycle trace, friction-cluster, domain-graph community, function-spread) from the plan are **filters/diagnostics**, not bucket discriminators in v1. Prefix gives a clean primary signal; the others provide ranking and quality assessment.

## Metrics per bucket

| Metric | Definition |
|---|---|
| `handoff_count` | Count of `handoffs` whose trigger event belongs to this prefix bucket. |
| `domain_count` | Distinct `(source_domain_id ∪ target_domain_id)` across the bucket's handoffs. |
| `function_count` | Distinct `business_function_id` reachable via the bucket's domain set through `business_function_domains`. |
| `friction_score` | Sum over the bucket's handoffs: `high=3 / medium=2 / low=1`. |
| `friction_high_count` | Count of `friction_level='high'` handoffs in the bucket. |
| `rank_score` | `friction_score × function_count` (the procedure's payoff formula). |
| `top_events` | Top 3 most-occurring trigger event names within the bucket. |
| `apqc_pcf_*` | Auto-matched APQC PCF process (substring match preferring lower hierarchy_level). **Treat as a hint, not an authority** — semantic refinement is recommended for the top ~15 buckets (see "Refining PCF mappings" below). |
| `meets_success_criteria` | True iff `domain_count ≥ 3 AND function_count ≥ 3 AND handoff_count ≥ 4 AND friction_high_count ≥ 1`. |

## Success criteria

The discovery output must produce:
- ≥10 candidates
- Top 3 with ≥3 domains, ≥3 functions, ≥4 handoffs, ≥1 high-friction

Verify by running the query and checking the trailing "X buckets meet all four success criteria" line.

## Refining PCF mappings

The substring auto-matcher in v1 picks the lowest-level PCF row whose `process_name` contains the prefix (or vice versa). This often lands on weak L4/L5 leaves where an L2/L3 parent better captures the orchestration shape. Examples from the first run:

- `employee` → auto-matched "Recruit, source, and select employees" (L2). Better: "Recruit, source, and select employees" or "Manage employee lifecycle" — the full JML orchestration.
- `case` → auto-matched "Manage financial fraud/dispute cases" (L3). Better: a generic case-management L3 in the customer-service or HR-services categories.
- `alert` → auto-matched "Manage plant alarms and alerts" (L5). Better: an IT/security-incident L3.

**For each bucket the agent acts on, dispatch a focused PCF lookup** (search `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`) before committing to a `processes` row reference. Some buckets (e.g. `data_asset`, `dlp_incident`, `customer_golden_record`, `subscription`) have **no good PCF match** and should be promoted to `source_framework='custom'` rows with the `CUSTOM-<CLUSTER>-<SHORT-NAME>` naming convention.

## Interpreting the output

A high-rank bucket means: **a process orchestration with many cross-function handoffs and high friction** — the kind of work where an agent skill removes the most manual coordination. The top of the list points at where to build process skills first.

Examples from the 2026-05-22 run:
- `employee` (rank 437): the cross-cutting JML orchestration — HCM → IGA → Payroll → Onboarding → ITSM → Talent-Mgmt. The most expensive cross-function workflow in any enterprise; obvious top candidate.
- `opportunity` (rank 190): lead-to-cash orchestration — CRM → SALES-ENG → CPQ → CLM → ERP-FIN. The classic revenue motion.
- `task` (rank 180): cross-tool work coordination — WORK-MGMT → ITSM/PSA/CSM/HRSD. Lower handoff count but high function spread (work routes everywhere).

The rank-score formula deliberately weights *friction × function-spread*: a process that's already cleanly integrated (low friction) but spans many functions ranks lower than one with comparable spread plus painful integration gaps. The agent skill removes friction, so friction is the prize.

## Drill-down format

`--bucket <prefix>` returns a JSON object with the full bucket detail: list of domain codes, list of business-function names, top-3 events with counts, friction breakdown, and the auto-matched PCF row. Use this when surfacing a specific candidate to the user for skill-build prioritisation.

## Re-runnability

The query reads live state every run — no materialised junction tables. Re-running after new handoffs land or after the trigger_events vocabulary expands automatically picks up the new substrate. If discovery latency becomes a problem later, materialise `process_handoffs` / `process_domains` junctions per the plan's open-question note.

## Related references

- [SKILL.md § Phase D](../SKILL.md#phase-d--process-skill-discovery-substrate-level) — clustering signals, ranking formula, and what to do with discovery output.
- [semantius-coverage-rollup.md](semantius-coverage-rollup.md) — sibling saved query (system-skill Semantius coverage)
- The 5 clustering signals (only #1 is implemented in v1; #2-5 are diagnostic refinements for ambiguous buckets)
