# Phase P catalog sweep: triage every domain, flag persona/RACI readiness in audit state

Status: NOT STARTED. Self-contained execution plan for a fresh session (the design context is
large; this captures everything needed to run it cold).

## Why this exists (what changed)

Plan 3 ([plan-3-personas-raci.md](plan-3-personas-raci.md), executed 2026-06-02) replaced the
rotted `_core` RBAC with a catalog-owned persona/RACI layer:

- New entities: `domain_roles` (operational personas), `process_raci` (RACI; polymorphic
  persona-OR-skill actor, hard exactly-one-actor `validation_rules`); new column
  `data_object_lifecycle_states.process_id` (the process-to-gate edge). `role_modules.role_id`
  was re-pointed from `_core` `roles` to `domain_roles`.
- The 102 old `_core` personas were DELETED. **Consequence: every domain now has ZERO personas
  except ATS** (the pilot, authored via `scripts/loaders/load_ats_personas_pilot.ts`).
- The emitter (`scripts/generate_blueprints.ts`) now derives + emits §9 (baseline roles, permission
  hierarchy, RACI realization, functional ownership). Permissions are auto-derived per module
  (no authoring). There is NO §10 (deployable closure was removed: modules are self-contained).
- The audit "E-band" is now the persona/RACI review band (SKILL.md `### E. Personas, RACI &
  responsibilities`), whose **E1 is a zero-persona coverage expectation** that FIRES on a
  multi-module domain with 0 personas. A new **M9 self-containment** check was added to the
  M-band.

Authoritative reading before running: [SKILL.md](../.claude/skills/domain-map-analyst/SKILL.md)
audit bands (S/A/M/B/C/E/F, esp. M1/M2/M9, E1-E6, A4/M8, B13);
[references/roles.md](../.claude/skills/domain-map-analyst/references/roles.md) (persona model +
function-anchored discovery §7); [references/modules.md](../.claude/skills/domain-map-analyst/references/modules.md)
§5 (self-containment); the audit-state format in [audits/README.md](../audits/README.md); the
2026-06-02 entries in [references/skill-changelog.md](../.claude/skills/domain-map-analyst/references/skill-changelog.md).

## Goal

A catalog-wide TRIAGE that, for every domain, evaluates the readiness signals and updates
`audits/<DOMAIN>/state.yaml`: set `next_action_by: agent` and add/refresh a `b1a` (agent-solvable)
finding describing the work. This makes the post-Plan-3 backlog loud and trackable.

This sweep is TRIAGE + FLAG only. It does NOT author personas, classify entity_type, fix M9
violations, or write catalog descriptions: those are the per-domain follow-up work the flags
trigger. It performs NO live-tenant writes: it READS the tenant for the triage and WRITES only
local `audits/*/state.yaml` files (git-tracked, reversible).

## Scope

IN (dimensions evaluated per domain):
- **M1** -- >=1 `domain_modules` row (zero-module = unbuilt).
- **M2** -- `capability_count >= 3` implies `module_count >= 2` (under-modularized otherwise).
- **E1** -- multi-module (`module_count >= 2`) implies >=1 persona. Post-Plan-3 this fires on
  every multi-module domain except ATS.
- **B13** -- `entity_type` classified on the domain's masters (unclassified degrades write tiers).
- **M9** -- self-containment shapes: any `contributor`, or `consumer` with `necessity=required`,
  pointing at another domain module's entity that is NOT also `embedded_master` here, and is not a
  platform built-in / shared master (`users`, master-data).

OUT:
- The `catalog` / `domain_modules.catalog` BOOLEANS are MANUALLY maintained (user-confirmed). Do
  NOT read-gate on, audit, or modify them in this sweep.
- `catalog_tagline` / `catalog_description` (A4/M8) ARE covered checks, but are user-approval-gated
  (Rule #20). If gaps exist, record them as `b2` (user-judgment) or `b1b` (blocked), NOT as
  agent-auto-fixable `b1a`. Do not draft or write them here.
- Actually authoring personas / classifying entity_type / fixing M9: follow-up, not this sweep.

## Per-domain decision logic

Evaluate in order; a domain can accrue multiple `b1a` items. Re-derive every count live (Policy 4);
do not assume prior figures.

| Domain state | `next_action_by` | `b1a` finding to add/refresh |
|---|---|---|
| 0 modules (M1 fail) | `agent` | `B1A-BUILD`: unbuilt; run Phase A->M->B->S, then Phase P if it ends multi-module |
| 1 module AND capability_count >= 3 (M2 fail) | `agent` | `B1A-MODULARIZE`: >=3 capabilities on 1 module; split per Phase M, then Phase P |
| 1 module AND capability_count < 3 | `agent` | `B1A-VERIFY-SCOPE`: confirm genuinely small (not under-researched in Phase A/B); if real, no personas needed and this clears |
| >=2 modules AND 0 personas | `agent` | `B1A-PHASE-P`: multi-module with 0 personas post-Plan-3; author personas + `role_modules` reach + `process_raci` + wire `lifecycle.process_id`, function-anchored per roles.md section 7 |
| >=2 modules AND >=1 persona | (unchanged; likely ATS) | none for personas; still evaluate B13/M9 below |

Append where present (any domain):
- unclassified masters > 0 -> `b1a` `B1A-ENTITY-TYPE`: classify `entity_type` on N masters (B13).
- M9 violation shapes > 0 -> `b1a` `B1A-SELF-CONTAIN`: N contributor/required-consumer rows break
  self-containment; embed the entity or make it optional (M9).
- A4/M8 gaps -> `b2`/`b1b` (NOT b1a): catalog UX text needs buyer-voice drafting + user approval.

## Mechanics

1. **Triage script (read-only).** Write `scripts/analytics/phase_p_triage.ts` using `pg()` from
   `scripts/lib/catalog.ts`. Bulk-load (one query each, `limit` high): `domains`; `domain_modules`
   (count per `domain_id` + host_domains for cross-cutting); `capability_domains` (capability count
   per domain); `domain_roles` + `role_modules` (persona count reaching each domain via
   `role_modules.domain_module_id -> domain_modules.domain_id`); `domain_module_data_objects`
   (roles + necessity, for M9 shapes) joined to `data_objects` (`entity_type`, `kind`). Compute the
   per-domain signals above. Emit a table + JSON: `{domain_code, module_count, capability_count,
   persona_count, unclassified_masters, m9_shapes, verdict, b1a_codes[]}`. This is the prioritized
   backlog; print summary counts (how many BUILD / MODULARIZE / PHASE-P / VERIFY-SCOPE).
2. **State update.** For each domain with agent-solvable work, rewrite `audits/<DOMAIN>/state.yaml`
   in `schema_version: 2` format (see [audits/README.md](../audits/README.md) for the exact shape;
   examples: `audits/INTRANET/state.yaml`, `audits/UEM/state.yaml`). PRESERVE existing open
   `b1b`/`b2`/`b3` items and any unrelated `b1a` items; ADD or REFRESH the readiness `b1a` item(s)
   from the table; set `next_action_by: agent`; set `status` (e.g. `audit_stale` or
   `needs_phase_p`); set `last_audit` to the run date (pass the date in; `new Date()` is unavailable
   in scripts -- stamp from a CLI arg). Resolved items go to `history.md`, never linger in
   `state.yaml`.
3. **Idempotent.** Re-running refreshes the same `b1a` codes by id, never duplicates. A domain that
   now passes (e.g. personas authored later) has its `B1A-PHASE-P` item removed and, if nothing else
   is open, `next_action_by` flipped back.

## Cautions

- TRIAGE + FLAG only. No persona authoring, no entity_type writes, no M9 fixes in this pass.
- No live-tenant writes. Only local `audits/*/state.yaml` edits.
- Do NOT touch the `catalog` booleans (manual).
- Do NOT clobber existing `state.yaml` findings; merge.
- CLAUDE.md: invoke `semantius` from the project root (never `cd`); no em-dashes; American English.

## Acceptance

- Every multi-module domain (>=2 modules) with 0 personas carries `next_action_by: agent` + a
  `B1A-PHASE-P` item (ATS excepted: it has personas).
- Every zero-module domain carries `B1A-BUILD`; every 1-module/>=3-capability domain carries
  `B1A-MODULARIZE`.
- The triage script's summary counts reconcile with the number of state files touched.
- Spot-check 3 domains by hand against the table.

## Follow-up (separate sessions, after this sweep)

- Per-domain Phase P authoring (the work the flags trigger), highest-value domains first; ATS is
  the worked reference (`scripts/loaders/load_ats_personas_pilot.ts`).
- Optional ATS pilot expansion (requisition-approval + FCRA/adverse-action sub-flows).
- Catalog-readiness rollup + the `catalog` boolean: deferred (manually maintained per user).
