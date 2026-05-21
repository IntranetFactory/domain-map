# Plan — Extend domain_map for Process-skill discovery

> Drafted 2026-05-20 from a session that closed Phase C (business_function axis) and the cross-cutting capabilities backfill on the `domain_map` module. Intended to be picked up cold in a fresh session.

## Goal

Make `cross_domain_handoffs` complete and structured enough that a deterministic cube query produces a **ranked list of process-skill candidates**, each mapped to an industry-standard process name (APQC PCF) and quantified by friction and function-spread.

A "process skill" is an agent skill that orchestrates a coherent cluster of cross-domain handoffs — e.g. an `onboarding` skill that owns `offer.accepted` (ATS→Onboarding), `task.it_provisioning_required` (Onboarding→ITSM), `employee.created` (HCM→Onboarding/Payroll/IGA). The handoff cluster IS the process; the skill is its agent-side orchestrator.

## Context — what to read before starting

| File | Why |
|---|---|
| [`.claude/skills/domain-map-analyst/SKILL.md`](.claude/skills/domain-map-analyst/SKILL.md) | The project's working agreement with the `domain_map` module. Rules #0–#8 are non-negotiable. |
| [`.claude/skills/domain-map-analyst/references/module-shape.md`](.claude/skills/domain-map-analyst/references/module-shape.md) | Per-entity field shapes and enums. |
| [`CLAUDE.md`](CLAUDE.md) | Project-wide rules (memory off-limits, semantius cwd discipline). |
| [`.tmp_deploy/load_smm_data_objects.ts`](.tmp_deploy/load_smm_data_objects.ts) | Reference Phase-B loader — the shape new handoff loaders should follow. |
| [`.tmp_deploy/load_itsm_capabilities.ts`](.tmp_deploy/load_itsm_capabilities.ts) | Reference loader idiom (CLI-via-stdin, chunked POST, idempotent natural-key flow). |

## Current substrate (snapshot, 2026-05-20)

- `cross_domain_handoffs`: **~11 rows**, almost entirely ITSM-centric (inbound from ITOM, AIOPS, OBS, SAM, CMDB, HRSD, ONBOARDING; outbound to ITAM, CMDB).
- `trigger_event` is free-text. Patterns emerge (`offer.accepted`, `employee.created`, `incident.asset_failure`) but no controlled vocabulary, no FK to a registry.
- No `processes` entity. Handoffs don't know which named business process they belong to.
- No state-machine modelling on data_objects — the implied state transition behind each trigger event isn't enumerated.

## What's missing — required model extensions

| Extension | What it adds | Effort |
|---|---|---|
| **New entity: `processes`** | Hierarchical process reference catalog (APQC PCF + custom). Full schema below. | small (~250-300 rows for PCF cross-industry through level 5) |
| **New entity: `trigger_events`** | Controlled vocabulary. Columns: `event_name` (e.g. `offer.accepted`), `data_object_id` (FK), `from_state` text, `to_state` text, `description`, `event_category` enum (`lifecycle` / `state_change` / `threshold` / `signal`). Replaces the free-text column on handoffs. **`from_state` / `to_state` are free text in v1** — FK to a state-machine table is a future extension if discovery accuracy demands it. | small (~80-150 rows initially) |
| **Migration: `cross_domain_handoffs.trigger_event`** | Change from string → FK to `trigger_events.id`. Backfill existing rows. | one-time |
| **Phase B handoff backfill** | Load handoffs for the remaining clusters: HR, Finance, Procurement, Sales, Customer. Same shape as the ITSM handoffs already loaded. | large — ~150-300 handoffs total, ~30 min per cluster |

**Note on process membership and process-domain mapping.** No `process_handoffs` or `process_domains` junctions in v1 — process membership is **derived at query time** from the clustering signals (trigger-event prefix, data-object lifecycle trace, domain-graph community, friction subset, function involvement). If discovery accuracy or query latency later demands a materialised junction, it can be added without disturbing existing rows.

### `processes` entity — concrete schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `process_code` | string | yes | Natural key. For PCF rows: literal PCF ID (e.g. `6.1.1`, `8.4.2.1`). For custom: org-prefixed (e.g. `CUSTOM-ONBOARD-DAY-1`, `ACME-INTRA-LEGAL-REVIEW`). |
| `process_name` | string | yes | Display name. PCF names stay verbatim from the source. |
| `description` | multiline | yes | Detailed description. PCF rows: from the PCF Excel. Custom: authored. |
| `parent_process_id` | reference → `processes` | no | Hierarchical. Null for level-1 categories. |
| `source_framework` | enum | yes | **Discriminator.** Initial values: `apqc_pcf_cross_industry`, `apqc_pcf_banking`, `apqc_pcf_consumer_products`, `apqc_pcf_electric_utilities`, `apqc_pcf_pharmaceutical`, `apqc_pcf_telecom`, `custom`. Designed to extend — add an enum value per industry PCF or per org-specific framework family as they appear. No default; loader must set explicitly so accidents are loud. |
| `external_id` | string | no | The framework's own identifier (PCF ID for any `apqc_pcf_*` row). Empty string for `custom`. |
| `external_url` | url | no | Optional pointer to source documentation. |
| `hierarchy_level` | int | yes | 1–5 matching APQC's level scheme for PCF rows; 1–N for custom. Useful for "show only top categories" queries without recursive CTEs. |
| `record_status` | enum | yes | Default `new`. Per project rule #1, leave at `new` after bulk import; stamp `approved` after a once-over confirms the parse was clean. |

### Why a framework enum (option B) over presence-of-id-as-flag

A 2+ value enum keeps filtering trivial (`WHERE source_framework = 'apqc_pcf_cross_industry'`), makes it obvious in the UI which rows are which, and accommodates loading multiple industry PCFs later without schema change. The `external_id` column carries the framework-specific identifier; for `custom` rows it's empty.

### APQC PCF license — handled

License: the standard APQC clause grants a perpetual, worldwide, royalty-free licence to use / copy / publish / modify / create derivative works of the PCF, requiring attribution on copies. Handled by a repo-level [`LICENSE-APQC-PCF.md`](LICENSE-APQC-PCF.md) containing the full attribution text. No per-row attribution field needed.

## Discovery procedure (the payoff)

Once the model is in place, a single saved cube query produces the candidate list. Process membership is derived at query time, not stored:

```
1. Pull cross_domain_handoffs joined with: trigger_events, data_objects,
   source/target domains, business_function_domains (both ends).

2. Bucket each handoff into one or more candidate processes by applying
   the clustering signals below (trigger-event prefix is the primary signal,
   data-object lifecycle and friction-cluster are secondary, function-spread
   is the filter). For each bucket, match against `processes` (APQC PCF)
   on name/description similarity to assign an industry-standard process
   name. Unmatched buckets are surfaced as candidates for `source_framework='custom'`
   process rows.

3. For each candidate process, compute:
   - handoff_count
   - distinct_domain_count
   - distinct_function_count
   - friction_score (high=3, medium=2, low=1, summed)
   - top 3 trigger events
   - APQC PCF mapping (if any)

4. Rank by (friction_score × distinct_function_count).

5. Output: ranked candidates, each with cluster definition + metadata.
```

The top N are the **high-leverage process-skill candidates** — the orchestrations where building an agent skill removes the most manual friction and pulls in the most functions.

## Clustering signals to feed the discovery

These are documented in [`.claude/skills/domain-map-analyst/SKILL.md`](.claude/skills/domain-map-analyst/SKILL.md) (Discovery section, "Process-skill candidates" if it has been added — if not, see the parent session notes):

1. **Trigger-event prefix** (`offer.*`, `employee.*`, `incident.*`)
2. **Data-object lifecycle trace** (the chain of handoffs an object travels through = the process)
3. **Domain-graph community detection** (densely connected subgraphs in the handoff DAG)
4. **High-friction subset** (`friction_level=high` cluster)
5. **Business-function involvement** (≥3 functions in a handoff cluster ⇒ process candidate)

## Deliverable

1. A populated `processes` entity (APQC PCF reference)
2. A controlled `trigger_events` vocabulary, with existing handoffs migrated
3. Phase-B handoff backfill across the remaining clusters (HR / Finance / Procurement / Sales / Customer) — i.e. the substrate the discovery query reads
4. A saved discovery cube query, runnable on demand
5. The first cut of the ranked candidate list (~15-30 process-skill candidates)

## Sequence

| # | Work | Output | Est |
|---|---|---|---|
| 1 | Design entities: `processes`, `trigger_events`, `process_handoffs`, `process_domains`. Define in `domain_map` module via `semantius` Layer 1 tools. | Schema | ~1 session |
| 2 | Load APQC PCF Cross-Industry v8.0 from `K016808_APQC Process Classification Framework (PCF) - Cross-Industry - Excel Version 8.0.xlsx`. Parse the Excel, flatten the 5-level hierarchy into `processes` rows with `parent_process_id` self-references, set `source_framework='apqc_pcf_cross_industry'`, preserve PCF ID in `external_id`, populate `hierarchy_level` 1–5. Drop the .xlsx into a `references/` folder in the repo. Save the APQC attribution text in `LICENSE-APQC-PCF.md` at the repo root. | Master reference (~250-300 rows) | ~1 session |
| 3 | Draft initial `trigger_events` vocabulary (~80 events) covering existing 11 handoffs plus forward-looking template events. Use snake-case dotted naming consistent with what's in the catalog. | Controlled vocab | ~1 session |
| 4 | Migrate existing 11 `cross_domain_handoffs.trigger_event` strings to FK references. | Cleanup | ~1 hr |
| 5 | Phase-B handoff backfill across remaining clusters. Recommended order: HR-cluster (high handoff density), Finance (S2P, AP, AR flows), Procurement (sourcing-to-contract), Customer (CS support flows), Sales (lead-to-cash). | Substrate completion | ~5 sessions (one per cluster) |
| 6 | Author the discovery cube query as a saved view in the `cube` server. | Discovery view | ~1 hr |
| 7 | Run discovery. Surface ranked candidates. Pick top 2-3 to materialise as process skills. | Decision input | ~1 hr |

## Open questions to resolve at start

*All open questions resolved before drafting this v1. See "Closed questions" below.*

## Closed questions

- **APQC PCF licensing** — resolved. The standard APQC clause permits derivative works with attribution. Repo-level [`LICENSE-APQC-PCF.md`](LICENSE-APQC-PCF.md) covers the attribution requirement. No per-row license field needed; the catalog stays "internal brain" use only.
- **Schema option A vs B vs C for the framework discriminator** — resolved to option B (enum + external_id). See the `processes` entity schema above.
- **`process_handoffs` derivation vs explicit storage** — resolved. **Query-time derivation** for v1. No materialised `process_handoffs` or `process_domains` junctions. Add later only if discovery latency demands it.
- **State-machine modelling depth** — resolved. **Free-text `from_state` / `to_state`** in `trigger_events` for v1. FK to a future `data_object_states` table is a downstream extension if needed.
- **Custom process naming convention** — resolved. **`CUSTOM-<CLUSTER>-<SHORT-NAME>`** (e.g. `CUSTOM-ONBOARD-DAY-1`, `CUSTOM-ACME-INTRA-LEGAL`). Used for any `processes` row with `source_framework='custom'`.
- **Trigger-event ownership: shared vs distinct rows** — resolved to **Option A: one event row, many subscribers**. When a single trigger fires from one domain to multiple targets (`employee.created` → Onboarding + Payroll + IGA + Talent-Mgmt), all subscriber rows in `cross_domain_handoffs` reference the SAME `trigger_events.id`. Event semantics (publisher, data object, state transition) live in one place. Integration metadata (`friction_level`, `integration_pattern`, `notes`) lives on the per-edge handoff row. This is the standard pub/sub model and the only shape that keeps the trigger-event-prefix clustering signal clean for discovery.

## Success criteria

- Running the discovery query produces a deterministic, reproducible ranked list of ≥10 process-skill candidates
- Each candidate maps to an APQC PCF process name
- The top 3 candidates have ≥3 domains, ≥3 functions, ≥4 handoffs, and at least one `friction_level=high` row
- The discovery output is small enough (a single screen) that a human can review and pick which to build next

## Out of scope for this plan

- Building the actual process skills (that's downstream work, one skill at a time)
- Tool-requirement modelling for those skills (see [`plan-tools-catalog.md`](plan-tools-catalog.md))
- Cross-process orchestration patterns (saga, choreography vs orchestration — design decision per skill at build time, not catalog-level)

---

## Operational status

This file is the **design intent only** — stable.
For task tracking, progress checkboxes, and cross-plan staging, see **[`plan-master-tasks.md`](plan-master-tasks.md)** (the single source of truth for operational state across both plans).
