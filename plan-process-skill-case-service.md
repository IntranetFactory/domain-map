# Plan — Process skill: customer / HR case orchestration

> Discovery candidate #3 (rank score 169) from the 2026-05-22 first discovery run. See [plan-process-skill-discovery.md](plan-process-skill-discovery.md) and the saved query at [.claude/skills/domain-map-analyst/references/discovery-query.md](.claude/skills/domain-map-analyst/references/discovery-query.md).

## Process identity

| Field | Value |
|---|---|
| Trigger-event prefix bucket | `case.*` |
| APQC PCF parent | L3 / external_id `10388` — "Manage customer service problems, requests, and inquiries" |
| Top events | `case.it_assistance_required`, `case.critical_health_drop`, `case.churn_risk_detected` |
| `processes.source_framework` (when materialised) | `apqc_pcf_cross_industry` — point at the L3 row above |

## Discovery signals

| Metric | Value |
|---|---|
| handoff_count | 5 |
| domain_count | 7 |
| function_count | 13 |
| friction_score | 13 |
| high-friction handoffs | 3 |
| rank_score | 169 |

**Domains involved**: CDP, CRM, CSM, HRSD, IGA, ITSM, SUB-MGMT.

**Functions touched**: Accounts Receivable, Customer Service, Customer Success, Data and Analytics, Finance, HR Service Delivery, Human Resources, IT Operations, IT Service Desk, Identity and Access Management, Marketing, Sales, Security.

## Orchestration shape

The case-management orchestration spans **two audiences in one bucket** — customer cases (CSM) and HR cases (HRSD). They share the same orchestration shape: a case is opened → routed → escalated → resolved → and may trigger cross-domain downstream actions (churn risk → CRM expansion-block; IT assistance needed → ITSM ticket; access required → IGA provisioning).

Three sub-flows:

1. **Case open + route** (`case.created`, `case.it_assistance_required`): CSM / HRSD intake → categorise → route to ITSM if IT-shaped → IGA if access-shaped.
2. **Health/escalation signals** (`case.critical_health_drop`, `case.churn_risk_detected`): CSM detects pattern via CDP-derived score → SUB-MGMT pauses dunning if retention-active → CRM flags account for retention play.
3. **Resolution + feedback** (`case.resolved`, `case.csat_returned`): CSM closes → CDP updates segment → CRM updates opportunity-from-service if expansion signal.

## Why this build

- Highest function spread per handoff (13 functions / 5 handoffs = 2.6 functions per edge — denser than `employee` at 19/12 = 1.58).
- Three high-friction handoffs in five — every edge is contended.
- The two-audience (customer + HR) overlap is a design decision: build one skill that handles both, or split into `customer-case` and `hr-case` skills. The catalog handoffs span both, suggesting either is defensible. **Recommendation: start with one skill and split only if the workflows diverge significantly during build.**

## Open design decisions

- **Single skill or split (customer vs HR)?** Open question — see "Why this build". Initial recommendation: one skill, branch on case origin.
- **ITSM vs HRSD boundary inside the skill.** When a case needs IT support, the skill routes to ITSM. When HR is the consumer (e.g. employee asking for benefits help), HRSD owns. Document the routing decision rules explicitly during skill design.
- **CRM churn-risk action.** Should the skill trigger CRM workflows directly (write `account_health.declined`), or only emit a signal and let CRM's own automation react? Initial recommendation: emit signal; the skill orchestrates the case loop, not the retention play.

## Tool requirements (deferred to P2.5B)

Expected mix: query/mutate across all 7 domains; + `send_email` (acknowledgement, escalation notifications, CSAT survey); + `post_chat_message` (when ITSM/Slack escalation happens); + `compute` for case-routing classification + `detect_sentiment` (CSAT free-text). Estimated Semantius-coverage: ~65-75% (the lowest of the top 3 — comms-heavy domain).

## Status

| Step | Status |
|---|---|
| Discovery candidate surfaced | ✓ 2026-05-22 (P1.7) |
| Skill design | pending P2.5B |
| Skill author | pending |
