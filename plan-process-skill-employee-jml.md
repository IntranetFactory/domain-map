# Plan — Process skill: employee JML (Joiner-Mover-Leaver)

> Discovery candidate #1 (rank score 437) from the 2026-05-22 first discovery run. See [plan-process-skill-discovery.md](plan-process-skill-discovery.md) and the saved query at [.claude/skills/domain-map-analyst/references/discovery-query.md](.claude/skills/domain-map-analyst/references/discovery-query.md).

## Process identity

| Field | Value |
|---|---|
| Trigger-event prefix bucket | `employee.*` |
| APQC PCF parent | L2 / external_id `20599` — "Manage employee onboarding, training, and development" |
| Top events | `employee.terminated` (×6 subscribers), `employee.created` (×5), `employee.promoted` |
| `processes.source_framework` (when materialised) | `apqc_pcf_cross_industry` — point at the L2 row above (no `custom` row needed) |

## Discovery signals

| Metric | Value |
|---|---|
| handoff_count | 12 |
| domain_count | 12 |
| function_count | 19 |
| friction_score | 23 (3× high + 7× medium + 0× low — see drill-down) |
| high-friction handoffs | 3 |
| rank_score | 437 |

**Domains involved** (all participate via at least one source-or-target row): AGENCY-MGMT, ATS, BEN-ADMIN, COMP-MGMT, HCM, IGA, ITAM, ITSM, ONBOARDING, PAYROLL, TALENT-MGMT, WFM.

**Functions touched**: Accounting, Benefits Administration, Business Operations, Compensation, Employee Onboarding, Finance, Financial Planning & Analysis, Human Resources, IT Asset Management, IT Operations, IT Service Desk, Identity and Access Management, Payroll, Procurement, Recruiting, Sales, Security, Talent Development, Workforce Management.

## Orchestration shape

`employee.*` is the classic Joiner-Mover-Leaver orchestration. The HCM domain publishes one of three lifecycle events, and 4-7 subscriber domains each have an integration that fires in response. The catalog already captures fan-out via the "one event, many subscribers" pattern — all `employee.created` subscribers share the SAME `trigger_events.id`, so an agent skill owning this orchestration replaces N point-to-point integrations with a single skill instance.

Three sub-flows the skill owns:

1. **Joiner** (`employee.created`): HCM creates → IGA provisions identity/groups → ONBOARDING starts onboarding plan → PAYROLL sets pay record → ITAM stages equipment → BEN-ADMIN triggers enrollment → TALENT-MGMT seeds career profile.
2. **Mover** (`employee.promoted`, `employee.position_changed`): HCM updates → IGA re-evaluates entitlements → PAYROLL updates pay band → COMP-MGMT triggers merit cycle eligibility → TALENT-MGMT updates 9-box placement.
3. **Leaver** (`employee.terminated`): HCM marks terminated → IGA revokes access → ITAM recovers assets → ITSM auto-closes assigned tickets → PAYROLL processes final pay → BEN-ADMIN initiates COBRA → AGENCY-MGMT closes any open external assignments. (This is the most friction-heavy of the three — 6 distinct subscribers + compliance trails.)

## Why this is the obvious #1 build

- Cross-function spread is the largest in the catalog (19 functions).
- Friction is high in three of the most expensive corners (PAYROLL final-pay, IGA access-revocation, ITAM asset-recovery — each a known audit/compliance pain point).
- Every enterprise runs this orchestration; an agent skill that owns it is universally useful.
- The substrate is already complete: every subscriber domain has Phase-B handoffs in place from the earlier P1.5* cluster work.

## Open design decisions (for the skill-build session)

- **Which Mover variants are first-class?** The catalog has `employee.promoted` and `employee.position_changed`. Treat as one flow (re-evaluate-derivatives) or split into two skill workflows? Initial recommendation: one flow with the variant as input.
- **Cost-centre re-org events.** When entire departments move (not just individuals), is that a separate orchestration or a fan-out over individual `employee.position_changed`? Likely the latter for v1.
- **Off-cycle pay corrections.** PAYROLL's `pay_cycle.closed` bucket (rank 20 in discovery) is adjacent but distinct. Don't bundle into JML.

## Tool requirements (deferred to P2.5B)

Per [plan-master-tasks.md § P2.5B](plan-master-tasks.md#p25b--process-skill-tool-requirements-depends-on-p17), tool-requirement enumeration for this skill happens after the candidate list lands. Expect a mix of: query/mutate tools across all 12 domains (already loaded by P2.5A.iii); + `send_email` (offer letters, COBRA notices); + `sign_document` (offer letters, NDA, separation agreements); + `post_chat_message` (welcome announcement); + likely `compute` for severance calculation. Estimated Semantius-coverage when modeled: ~75-85%.

## Status

| Step | Status |
|---|---|
| Discovery candidate surfaced | ✓ 2026-05-22 (P1.7) |
| Skill design (workflows + tool requirements) | pending P2.5B |
| Skill author | pending |
