# Canonical multi-master examples

Landmark rows in `domain_data_objects` that other research should reason about by analogy. Each entry shows the slice each domain masters or contributes — the part that goes in the junction `notes` column when the row is loaded.

When you encounter a new data_object that "feels like one of these", lean on the analogous decomposition rather than reinventing.

---

## Cluster flagships (3-4 masters)

These are the structural anchors of their cluster. When you start work on a new cluster, find its flagship first.

### `employees` — HR cluster flagship (3 masters)

| domain | role | slice owned |
|---|---|---|
| HCM | master | Canonical HR record: legal name, contact, employment metadata, position/job/org assignment, life-event history |
| Payroll | master | Comp / withholding / payable slice: gross-to-net rules, deductions, tax setup, bank account, pay history |
| IGA | master | Identity / access slice: directory account, group memberships, role assignments, entitlements, last-login |
| PA | consumer | Derives KPIs and cohorts from the canonical record; does not author any slice |
| Onboarding | contributor | Writes onboarding-state fields during the journey window |
| Talent-Mgmt | contributor | Writes talent-specific fields (aspirations, mobility preferences, succession status) |

### `customers` — Customer-facing cluster flagship (4 masters)

| domain | role | slice owned |
|---|---|---|
| CRM | master | Sales view: account hierarchy, opportunities, pipeline, sales activities |
| CSM | master | Service view: cases, entitlements, SLAs, CSAT |
| SUB-MGMT | master | Financial view: subscriptions, invoices, payment status, churn state |
| CDP | master | Unified resolved profile: identity-resolved behavior, segments, derived attributes |
| LOYALTY | contributor | Loyalty tier, points balance, redemption history |
| MA | contributor | Marketing engagement, opt-in state, campaign history |
| B2C-COMM | contributor | Storefront purchase history, cart behavior |
| PA | consumer | Employee-as-customer analytics overlap |

### `configuration_items` — IT-ops cluster flagship (1 master + 4-way contributor fan-in)

Different shape from the others: CMDB is the single canonical master, but the *physical thing* is observed by every IT tool. Total degree of 7 (1 master + 4 contributors + 2 consumers) makes this the most cross-cut row.

| domain | role | slice owned |
|---|---|---|
| CMDB | master | Canonical CI record + relationships + classes + baselines |
| DISCOVERY | contributor | Auto-discovered candidates feed CMDB |
| HAM | contributor | Hardware-asset (financial/lifecycle) view of the same physical thing |
| SAM | contributor | Software-installation view of the same logical thing |
| SMP | contributor | SaaS-application view for sanctioned SaaS CIs |
| ITSM | consumer | Incidents, problems, changes reference CIs |
| AIOPS | consumer | Topology powers correlation; adjacent CIs are likelier shared-cause candidates |

---

## Secondary landmarks (2 masters, useful for analogy)

### `job_requisitions` — Intent vs Execution split

| domain | role | slice owned |
|---|---|---|
| ATS | master | Recruiting execution: pipeline stages, candidates, interviews, offers, acceptance |
| SWP | master | Headcount intent: position approval, budget alignment, plan-to-actual reconciliation |

The "intent vs execution" pattern recurs anywhere an upstream domain authorises and a downstream domain executes. Look for it in:
- `purchase_requisitions` (S2P intent) → `purchase_orders` (S2P execution) — happens to be same-domain here, but cross-domain in some enterprise stacks
- Future: `change_requests` (intent, CAB) → `changes` (execution, ITSM)

### `saas_app_assignments` — Cost vs Identity split

| domain | role | slice owned |
|---|---|---|
| SMP | master | Cost / seat slice: which plan, which seat, last used, paid-for |
| IGA | master | Identity / access slice: SSO account, group membership, actual access |

This is the SaaS-era equivalent of the `employees` HCM-vs-IGA tension — "who's paying for the seat" and "who can actually log in" routinely disagree. Look for the same pattern in:
- Any access-controlled resource where billing and access live in separate systems
- License pools, secret stores, environment access grants

---

## Event-stream firehoses

Data objects in this shape are the unified event stream of their cluster — one master, several contributors, at least one consumer reading the full stream.

### `events` (ITOM) — IT-ops firehose

| domain | role |
|---|---|
| ITOM | master |
| OBS | contributor (alerts from app instrumentation feed back) |
| SECOPS | contributor (security events mirrored for unified correlation) |
| AIOPS | consumer (primary input to correlation/anomaly/RCA) |

### `customer_events` (CDP) — Customer-facing firehose

| domain | role |
|---|---|
| CDP | master |
| MA | contributor (campaign delivery/open/click/bounce) |
| B2C-COMM | contributor (storefront browse/cart/checkout/return) |
| CRM | contributor (sales-activity events, opportunity stage transitions) |
| CSM | contributor (case lifecycle events, CSAT) |

Both follow the same pattern: one canonical store, contributors feed in raw events from operational systems, and the downstream consumer (AIOPS / segment-activation) reads the full stream. When you encounter a new "stream of events about X" entity, default to this shape: one master in the analytics/aggregation domain, contributors in the operational source domains.

---

## Boundary objects

Single-mastered data objects invented specifically to make a fuzzy domain boundary explicit.

### `workforce_cost_projections` — SWP/EPM boundary

SWP masters the workforce-driven cost build (headcount × comp band × loading factor × jurisdiction). EPM consumes the approved projection via the `cost_projection.approved` handoff and rolls it into the consolidated budget.

Without this object: the SWP↔EPM boundary is "the workforce plan somehow becomes a budget line", and the integration is ad-hoc.
With this object: explicit ownership on the SWP side, explicit consumption on the EPM side, one handoff arrow between.

Future candidates worth looking for:
- A boundary object between HCM and Talent-Mgmt for skills/competency catalogs (HCM masters operational job profiles, Talent-Mgmt contributes skills — but the *unified-skills-catalog* itself could be a boundary object)
- A boundary object between SUB-MGMT and Finance/GL for revenue recognition (`revenue_recognition_records` exists but Finance/GL isn't in catalog yet)
- A boundary object between VULN-MGMT and ITSM for remediation prioritisation
