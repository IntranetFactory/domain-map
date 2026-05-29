# Validate cross-domain substrate (catalog-wide) — history

Append-only log of mode b2 (`validate cross-domain`) runs. Sits next to:
- [audits/_discover.md](_discover.md) — catalog-wide Discover-mode log
- [audits/&lt;DOMAIN_CODE&gt;.md](.) — per-domain Validate (b1) logs

The underscore prefix marks this as **catalog-scoped**. Mode b2 audits the entire cross-domain handoff DAG, not one domain. Each run appends one dated section.

## Per-run section structure

```markdown
## YYYY-MM-DD — Validate cross-domain

### Substrate sanity summary
- Total cross-domain handoffs audited: N
- Defects: M (across K domains)
- Result: CLEAN | DEFECTS (proceeded for visibility) | DEFECTS (blocking)

### Defect breakdown by check
- B10b NULL source_domain_module_id: N defects on M handoffs (domains: ...)
- B10b NULL target_domain_module_id: N defects on M handoffs (domains: ...)
- B9 trigger_event attribution defect: N defects (domains: ...)
- B8 reverse-direction consumer DMDO gap: N defects (domains: ...)
- Orphaned trigger_event: N defects (data_objects: ...)

### Per-domain ownership rollup
- <DOMAIN_CODE>: B10b: N, B8: M, ... — fix surface is per-domain Validate b1
- ...

### User decisions
- Domains queued for b1 Validate: [list]
- Defects accepted as known / pending: [list with reasons]
```

The fix surface for every defect is **per-domain Validate b1** on the owning domain — each defect lives in a specific domain's substrate.

## See also

- [README.md § b2) Validate cross-domain substrate](../README.md) — mode overview, triggers, output discipline.
- [README.md § c) Discover cross-domain processes](../README.md) — Discover invokes b2 as Pass 0 pre-flight.
- [README.md](README.md) — per-domain Validate b1 audit convention (the files next to this one).

---

## 2026-05-29 — Validate cross-domain (baseline)

First catalog-wide b2 run after the mode was defined. Run via [scripts/analytics/validate_cross_domain.ts](../scripts/analytics/validate_cross_domain.ts). Establishes the baseline defect count and the per-domain ownership breakdown.

### Substrate sanity summary

- Cross-domain handoffs audited: **1,164** (of 1,299 total handoffs in the catalog)
- Defects: **2,075** across **5 checks**
- Result: **DEFECTS (reported for visibility; baseline run, no fix loads attempted)**

### Defect breakdown by check

| Check | Defects | Concentration |
|---|---|---|
| B10b.1 — NULL source_domain_module_id (source has modules) | 51 | 9 domains; SUB-MGMT (14), CSM (10), CPQ (9), HAM (6), RE-BROKERAGE (6) |
| B10b.2 — NULL target_domain_module_id (target has modules) | 211 | 19 domains; ITSM (55), CSM (53), HCM (30), SUB-MGMT (14), PAYROLL (10), PA (8), FSM (7) |
| B9 — trigger_event data_object not publishable from source | 702 | 106 domains; B2C-COMM (18), ERP-FIN (16), OMS (15), SPEND-MGMT (14), OBS (14), DCG (14) |
| B8-rev — payload not touched by target | 838 | 102 domains; ERP-FIN (97), GRC (60), ITSM (58), CSM (46), HCM (35), AUDIT (32), AP-AUTO (20), EPM (20), S2P (17) |
| Orphaned trigger_events | 273 | spread across data_objects with no lifecycle_state authored |

### Headline finding — Phase B never run on multiple domains

Spot-check of ERP-FIN's 97 B8-rev defects revealed the underlying pattern: **ERP-FIN has 0 `domain_module_data_objects` rows** — Phase B was never run on it despite it being a heavy handoff target. Same pattern confirmed on **GRC (0 DMDO), AUDIT (0), AP-AUTO (0), EPM (0), S2P (0)** — 246 of the 838 B8-rev defects come from 6 domains where Phase B never landed at all. These are not 246 individual modeling gaps; they're 6 missing Phase B loads.

Domains with partial DMDO data (ITSM 29, CSM 14, HCM 24) produce more granular per-handoff defects that are actionable as targeted fixes.

### Pass 1.5 coverage snapshot

| Source × Status | Approved | Pending | Rejected |
|---|---|---|---|
| `human_curated` | 0 | 0 | 0 |
| `discovery_override` | 0 | 45 | 0 |
| `discovery_substring` | 0 | 114 | 0 |

Untagged cross-domain handoffs: **1,005 / 1,164 (86%)**. Zero conflicts. Zero approvals. Phase B authoring step did not exist before today, hence 0 `human_curated` rows.

### Per-domain ownership rollup (top 12)

| Domain | B10b.1 | B10b.2 | B9 | B8-rev | Total | Recommended next |
|---|---|---|---|---|---|---|
| ERP-FIN | 0 | 0 | 16 | 97 | 113 | **Phase B (no DMDO data exists)** |
| GRC | 0 | 0 | — | 60 | ≥60 | **Phase B (no DMDO data exists)** |
| ITSM | 2 | 55 | — | 58 | ≥115 | b1 Validate (cleanup + extend) |
| CSM | 10 | 53 | — | 46 | ≥109 | b1 Validate (cleanup + extend) |
| HCM | 0 | 30 | — | 35 | ≥65 | b1 Validate (cleanup + extend) |
| SUB-MGMT | 14 | 14 | — | — | ≥28 | b1 Validate (B10b cleanup) |
| AUDIT | 0 | 0 | — | 32 | ≥32 | **Phase B (no DMDO data exists)** |
| EPM | 0 | 0 | — | 20 | ≥20 | **Phase B (no DMDO data exists)** |
| AP-AUTO | 0 | 0 | — | 20 | ≥20 | **Phase B (no DMDO data exists)** |
| PAYROLL | 1 | 10 | — | — | ≥11 | b1 Validate (B10b cleanup) |
| S2P | 0 | 0 | — | 17 | ≥17 | **Phase B (no DMDO data exists)** |
| CPQ | 9 | 4 | — | — | ≥13 | b1 Validate (B10b cleanup) |

### User decisions

- Queued for b1 Validate (per § "b1 sweep schedule" below): ITSM, CSM, HCM, SUB-MGMT, PAYROLL, CPQ
- Queued for Phase B (Phase B never run): ERP-FIN, GRC, AUDIT, EPM, AP-AUTO, S2P
- Deferred: B9 defects on remaining 100 domains pending sampling (likely a mix of real gaps and modeling-discipline drift)
- Deferred: 273 orphaned trigger_events pending a cleanup-pass design (separate concern from b1)

### Defect-count sanity caveats

- **B8-rev (838) and B9 (702) are heavily inflated by the no-DMDO domains.** ERP-FIN alone accounts for 97 of B8-rev. The "per-handoff" framing implies individual fixes; the truth is closer to "6 Phase B loads close 246 defects in one batch."
- **B10b counts (262) are reliable.** Each is one mechanical PATCH via the [backfill_ats_handoff_modules_2026_05_23.ts](../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts) pattern.
- **Orphaned trigger_events (273) need a query-quality second pass** before treating as actionable. The relaxed v2 check still surfaces trigger_events whose data_objects are config-shaped (no workflow → no lifecycle_state, by Rule #12 exemption) — those are likely false positives.
