# Plan — Process skill: opportunity lead-to-cash

> Discovery candidate #2 (rank score 190) from the 2026-05-22 first discovery run. See [plan-process-skill-discovery.md](plan-process-skill-discovery.md) and the saved query at [.claude/skills/domain-map-analyst/references/discovery-query.md](.claude/skills/domain-map-analyst/references/discovery-query.md).

## Process identity

| Field | Value |
|---|---|
| Trigger-event prefix bucket | `opportunity.*` |
| APQC PCF parent | L3 / external_id `10182` — "Manage leads/opportunities" |
| Top events | `opportunity.closed_won` (×3 subscribers), `opportunity.requires_quote`, `opportunity.stage_changed` |
| `processes.source_framework` (when materialized) | `apqc_pcf_cross_industry` — point at the L3 row above |

## Discovery signals

| Metric | Value |
|---|---|
| handoff_count | 9 |
| domain_count | 10 |
| function_count | 10 |
| friction_score | 19 |
| high-friction handoffs | 3 |
| rank_score | 190 |

**Domains involved**: AGENCY-MGMT, CDP, CPQ, CRM, CSM, PSA, REV-INTEL, SALES-ENG, SALES-PERF, WORK-MGMT.

**Functions touched**: Accounting, Business Operations, Customer Service, Customer Success, Data and Analytics, Finance, Marketing, Product Management, Sales, Sales Operations.

## Orchestration shape

The classic lead-to-cash motion. CRM owns opportunity lifecycle; multiple downstream domains react to stage changes. The high-friction concentration is at `opportunity.closed_won` — fan-out to CPQ (quote → contract), CLM (contract draft), FIN (revenue recognition), PSA (project provisioning if services), CSM (account handoff), and REV-INTEL/SALES-PERF (forecast actuals).

Three sub-flows:

1. **Lead → Opportunity** (`opportunity.created`, `opportunity.qualified`): CDP / MA enriches → SALES-ENG starts cadence → CRM creates record → REV-INTEL updates pipeline forecast.
2. **Opportunity → Quote/Contract** (`opportunity.requires_quote`, `opportunity.stage_changed`): CRM → CPQ generates quote → CLM drafts contract → ESIGN delivers for signature.
3. **Closed-won → Provisioning** (`opportunity.closed_won`): CRM → SUB-MGMT activates subscription → CSM accepts account → PSA scopes project → FIN posts revenue recognition → SALES-PERF books commission → AGENCY-MGMT (when sold through agency) seeds external engagement.

## Why this build

- Second-largest function spread (10 functions across 10 domains).
- Three high-friction handoffs cluster at `closed_won` — the most expensive moment in the revenue cycle.
- Adjacent processes (`order.*`, `contract.*`, `subscription.*`) all rank top-15; some will overlap with this skill's downstream. Building lead-to-cash first establishes the canonical orchestration spine that those adjacent buckets refine.

## Open design decisions

- **Closed-lost handling.** The bucket includes `opportunity.closed_lost`. Should the skill own retro-analysis / win-loss capture or hand that to a separate `CUSTOM-WIN-LOSS-ANALYSIS` skill?
- **CPQ-required boundary.** Some opportunities go direct-to-contract without a CPQ pass (simple renewals). Skill should branch on `requires_quote` flag, not assume CPQ in every flow.
- **Agency-sold opportunities.** AGENCY-MGMT participation suggests the agency channel is in scope. Could be split into a separate channel-partner orchestration if AGENCY-MGMT has distinct workflows.

## Tool requirements (deferred to P2.5B)

Expected mix: query/mutate across all 10 domains (loaded via P2.5A.iii); + `send_email` (proposal delivery, signature notifications); + `sign_document` (CLM / ESIGN integration); + `execute_payment` (only if down-payment / activation fee triggered at closed-won). Estimated Semantius-coverage: ~80-90%.

## Status

| Step | Status |
|---|---|
| Discovery candidate surfaced | ✓ 2026-05-22 (P1.7) |
| Skill design | pending P2.5B |
| Skill author | pending |
