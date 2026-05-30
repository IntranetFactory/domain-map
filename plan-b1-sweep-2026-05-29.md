# Mode b1 Validate sweep schedule — 2026-05-29

Forward-looking work plan. Sourced from the 2026-05-29 catalog-wide b2 baseline (see [audits/_validate-cross-domain.md](audits/_validate-cross-domain.md)).

## Scope

This plan does **not** schedule the 4-pass b1 Validate on every cross-domain offender — that would be ~100+ domains. It schedules the high-leverage fixes that close the most defects per unit of work, and leaves the long tail for later.

## Two queues

The b2 audit surfaced two distinct work shapes that need different handling:

### Queue A — Per-domain b1 Validate (B10b cleanup + extend)

These domains have **existing** Phase B data but cross-domain handoff structural gaps. The 4-pass b1 mode applies cleanly: market audit, structural checklist, neighbor discovery, pairwise reconciliation. Fix-loop closes B10b NULL FKs deterministically and surfaces remaining B8/B9 gaps for per-handoff review.

Priority order by expected B10b defect closure:

| # | Domain | B10b defects | Has DMDO data? | Notes |
|---|---|---|---|---|
| 1 | ITSM | 57 | Yes (29 rows) | High inbound traffic from CMDB, CSM, AIOPS, HRSD; pairwise reconciliation will surface many edges |
| 2 | CSM | 63 | Yes (14 rows) | High inbound + outbound; SUB-MGMT, CRM, FSM neighbors |
| 3 | HCM | 30 | Yes (24 rows) | Joiner cascade publisher; Payroll, IGA, ATS, Talent-Mgmt as downstream |
| 4 | SUB-MGMT | 28 | Partial | 14 outbound + 14 inbound NULL FKs; mostly mechanical B10b derivation |
| 5 | PAYROLL | 11 | Partial | Mostly inbound from HCM, ATS; B10b derivation closes most |
| 6 | CPQ | 13 | Partial | 9 outbound + 4 inbound NULL FKs |

Expected combined closure: **~202 of the 262 catalog-wide B10b defects** plus targeted per-handoff B8/B9 fixes.

### Queue B — Phase B never run

These domains appear as heavy handoff targets but have **zero** `domain_module_data_objects` rows. They need Phase B (Research mode), not Validate. Running b1 against them surfaces nothing actionable — there's no per-domain data to audit. The fix is a Phase B load (Research mode b) per domain.

| # | Domain | B8-rev defects | Why Phase B never landed | Notes |
|---|---|---|---|---|
| 7 | ERP-FIN | 97 | Modules exist, no Phase B loaded against them | Heavy inbound from PLM, ITAM, OMS, PAYROLL, AP-AUTO, EXPENSE, SPEND-MGMT |
| 8 | GRC | 60 | — | Heavy inbound from regulators / risk events |
| 9 | AUDIT | 32 | — | Closely coupled to GRC; load together |
| 10 | EPM | 20 | Leadership-tier-style but with masters expected | See SKILL.md leadership-tier exemption test |
| 11 | AP-AUTO | 20 | — | Procure-to-pay completion |
| 12 | S2P | 17 | — | Procure-to-pay; AP-AUTO neighbor |

Expected combined closure: **~246 of the 838 B8-rev defects** plus the new outbound handoffs each domain will publish during Phase B.

## Sequencing

Run Queue A first (operations: known shape, fast).
Run Queue B second, in clusters to amortize Phase 0 vendor research:
- Cluster 1: ERP-FIN + EPM (Finance core)
- Cluster 2: GRC + AUDIT (compliance pair)
- Cluster 3: AP-AUTO + S2P (procure-to-pay pair)

Within Queue A, ordering is by defect count desc. Within Queue B, ordering is by cluster-fit.

## Stop conditions per item

For each Queue A item:
- Re-run b2 after the fix loads
- Acceptance: domain's row in [audits/_validate-cross-domain.md](audits/_validate-cross-domain.md) drops to 0 B10b on both sides
- **APQC TAGGING expected outcome (two distinct measures, don't conflate):**
  - **Process target (per audit):** the audit's Bucket 1 APQC TAGGING section should propose roughly 0.5N to 0.8N NEW `handoff_processes` rows with `proposal_source='agent_curated'`, where N = the domain's cross-domain handoff count. Zero new proposals despite the analyst having built the mental model is a procedural failure (the first 2026-05-29 ITSM audit shipped zero APQC tags; the H-band added afterward forces the section into Bucket 1 to prevent recurrence).
  - **Catalog quality target (post-fix-loop):** after fix-loop approval, `record_status='approved'` count on the domain's cross-domain handoff_processes rows is the trustworthy-coverage number. THIS is the headline quality measure, not the `agent_curated` count. A `discovery_substring` row a reviewer approved is high-quality; an `agent_curated` row at `record_status='new'` is high-confidence-pending. Lead with approved count when reporting catalog quality.

For each Queue B item:
- Phase B load via Research mode (see [README.md § a) Research a domain](README.md))
- Acceptance: `domain_module_data_objects` count for the domain ≥ the canonical master count from Phase 0 vendor matrix
- **APQC TAGGING expected outcome:** Phase B deliverable 7 produces `handoff_processes` rows alongside the new handoffs (`proposal_source='agent_curated'`); volume scales with the new cross-domain handoff count.

## Out of scope

- **B9 defects on the 100+ smaller offenders** — pending sampling to confirm signal quality before scheduling.
- **273 orphaned trigger_events** — needs a query-quality refinement first (current check still flags config-shaped masters). Separate cleanup-pass design.
- **handoff_processes review** — Pass 3 of Discover mode. Hold until substrate is materially cleaner (Queue A + B done) so the substring matcher has clean inputs.

## How to update this plan

Re-run [scripts/analytics/validate_cross_domain.ts](scripts/analytics/validate_cross_domain.ts) after each completed item; update the per-domain B10b / B8-rev counts in this file. When both queues hit their stop conditions, archive this plan and produce a new one based on what's left.
