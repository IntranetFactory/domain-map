# Model-map rework: decisions and plan split

The 2026-06-01 coherence audit ([model-map-coherence-audit.md](model-map-coherence-audit.md))
found the `domain_map` uber-model fails complete / consistent / logical / self-contained at
the agreed altitude (semantic skeleton plus behavior plus RBAC/persona/RACI/process; ordinary
fields excluded, workflow states included). This file tracks the decision made on each
finding and splits the remediation into scoped plans. Downstream (architect / analyst /
deployer) impacts live in [downstream-updates.md](downstream-updates.md).

Calibration note: the audit was repo-only. B6 turned out to be a false positive (live data
contradicted a loader-file assumption). M7 was similarly off: it prescribed flipping
`owner_side` on "16 composition rows," but `owner_side` names the PARENT, and 13 of the 16
already had it correct (child-first `belongs_to` edges where the parent is the `target`); a
blanket flip would have inverted their delete semantics. Only 3 rows were actually wrong.
Lesson: NEVER execute an audit's prescribed data fix without (a) re-deriving the set against
live and (b) reading the actual rows plus the field's authoritative live definition first.
Treat findings grounded in the emitter code or live data as solid; verify findings grounded
in loader files, plan files, or counts before acting.

## Decision tracker

| Finding | Decision | Notes |
|---|---|---|
| B1 blueprint omits load-bearing layers | RE-SCOPED | Not a standalone blocker. Permissions ARE emitted (only the per-entity write TIER is missing, that is B2). `computeCoverage` is module-ranking analytics, NOT a deploy/blueprint concern, removed from contract scope. Roles need research, not just emission. B1 becomes an umbrella over B2 + B4 + M9 + M10 + M11 emission. |
| B2 entity_type write tier unwired | DO (Plan 2) | Verified absent from `catalog.ts` and `generate_blueprints.ts`. Catalog-wide classification is NOT a Plan 2 prerequisite: 927 of 987 data_objects are `unclassified` (only ATS done), and classification happens during the standing per-domain review (alongside persona/RACI). Plan 2 is CODE only. `unclassified` must degrade GRACEFULLY in the emitter (fall back to module-level `:manage`, mark "pending classification"), NOT hard-abort; the hard check lives in the per-domain review band (B13). Revises m2 (which had proposed a hard emitter error). |
| B3 Semantius score / operation_kind inconsistency | POSTPONE | |
| B4 delete-mode not derived, contradictory specs | DECIDED: DERIVE (Plan 2) | The mapping rule lives in CODE (a `deriveDeleteMode` generator function), NOT a database table. Derive from the stored inputs (relationship_kind, owner_side, is_required); store NO new field in domain-map (the inputs already exist). Emit delete-mode + FK format in blueprint section 5; the applied ON DELETE behavior lands in the tenant DB at deploy. `inheritance`: keep in enum, map to `restrict`. Optional nullable override column only if a real per-edge exception appears later. |
| B5 personas / operational RACI have no catalog home | DO (Plan 3) | Research heavy. The 104 `_core` catalog roles are unreviewed/rotted: DELETE them, do NOT migrate. Personas + operational RACI become a STANDING per-domain research phase plus a review band (replacing the E-band that audited `_core` bundles), so the layer cannot re-rot. RACI is the chosen backbone (widely used, pairs with APQC). |
| B6 proposal_source enum lacks `agent_curated` | FALSE POSITIVE | Live: 686 `agent_curated` rows accepted, 0 `human_curated`. Audit trusted a stale loader file. Residual: NONE on the loader. The live enum definition is the only source of truth; the already-applied, idempotent loader is not edited and gets no comment (a comment in a run-once file is read by no one and goes stale itself). The recurring concern (hand-maintained copies drifting from live) is handled by the Plan 1 enum-drift check, not by patching dead files. |
| B7 skills.process_id | DEFER | Process skills not built yet. Revisit when the model is coherent. (Correction 2026-06-01: the live `skills` table DOES already have a `process_id` reference column, so the audit's "column does not exist / no loader creates it" premise is wrong. The deferral still stands on "process skills not built yet," but the column is present, so B7 is a backfill/wiring task, not a create-field task.) |
| M5 operational_workflow vs lifecycle | DECIDED: IMPLICATION | Enforce forward only: operational_workflow => has >=1 lifecycle state (fix the 5 misclassified violators). Reverse NOT enforced: catalog/junction/record MAY carry lifecycle + requires_permission gates (e.g. template approval). requires_permission and entity_type are orthogonal: gates derive from requires_permission on any state, write tier from entity_type. |
| M6 pattern flags by entity_type | DECIDED | Flags valid only on operational_workflow and operational_record; forbidden on catalog, junction, computed. Catalog approval, if needed, via a requires_permission lifecycle state, not flags. Add generator guard + audit invariant. |
| M9 deployable closure scope | DECIDED: MIDDLE | Hard closure = embedded_master + role_modules. Handoff counterparties emitted as an ADVISORY companion list. The ARCHITECT detects dangling companions and either asks the user or records the gap (downstream responsibility, see downstream-updates.md row 5). |
| M13 default tier from market RACI | DECIDED | owner->admin / contributor->manage / consumer->read for the coarse module-level default grant. RACI completeness resolved via C/I decomposition below (not a permissions gap). |
| B5/M16 process-to-permission edge | ANSWERED | `process_id` on the gated lifecycle transition is sufficient for the gate layer, PROVIDED baseline read/manage/admin keep deriving from `role_modules` reach. |
| AI-native RACI actor (the twist) | DECIDED: POLYMORPHIC | The RACI actor is a persona OR an agent skill, not only a persona. Junction `process_raci(process_id, actor_role_id?, actor_skill_id?, raci, consultation_blocking?)` with exactly-one-actor check. Bake the polymorphic shape into the schema NOW; populate persona actors now, skill actors when process-skills land (B7, deferred). Enables R = agent / A = human (human-in-the-loop). |
| m3 pattern_flags_reviewed | DECIDED | Accept `false` as the answer of record; drop the unverifiable per-pass re-evaluation. No stored signal. |
| other majors/minors | see audit | mechanical unless listed above. |

RESOLVED (RACI realization): `process_raci` stores WHO is R/A/C/I per process. The actor is
POLYMORPHIC (a persona via `actor_role_id` OR an agent skill via `actor_skill_id`, exactly
one), which restores the AI-native twist: R can be an agent while A is a human. The
derivation routes each letter to its realizing layer, so there is NO new RBAC permission
tier and no permissions gap:
- Responsible -> persona: a permission (manage/admin + the process's gates); agent skill: the skill's `skill_tools` cover the process's mutating operations.
- Accountable -> normally a persona permission (approval gate; ties to has_single_approver); a skill is allowed for fully-autonomous processes.
- Consulted -> a lifecycle STATE (a consultation/review step) when input is required, else a read grant; the consulted actor may be a persona or an analysis skill invoked at that state.
- Informed -> a notification SIDE EFFECT on the transition: a trigger_event / webhook_receiver fired to a persona or an agent skill. Not a permission, not a state.
The structural flags are the legacy, data-object-level, human-only RACI fragments that this
generalizes: `has_single_approver` = "A = exactly one", `has_submit_lock` = ownership (R + lock).
Short term they coexist with a consistency invariant (single_approver agrees with the
process's Accountable); long term they become derivable from `process_raci`.
Open design detail for Plan 3: model Consulted as a blocking consultation state vs an advisory read grant (likely both, by the `consultation_blocking` flag on the assignment).

## Plan split

Each plan is drafted as its own runnable document: [plan-1-consistency.md](plan-1-consistency.md),
[plan-2-entity-type-tiers.md](plan-2-entity-type-tiers.md), [plan-3-personas-raci.md](plan-3-personas-raci.md).

### Plan 1 - Consistency and invariants (mechanical, no redesign)
Deterministic fixes and self-checks; no new modeling. M1, M2, M3, M4, M7, M14, M15, m1, m4,
m5, m8, m9, m11, plus the enum-drift check that subsumes B6 (live enum is the only source of
truth; no loader edit). Adds emitter-time and
audit invariants so the contradictions cannot recur. Few or no decisions. Can start
immediately, in parallel with planning of Plans 2 and 3.

### Plan 2 - entity_type tiers and delete-mode (complete the structural emitter)
What B1 really meant: make the blueprint carry the structural deploy facts it omits.
B2 (entity_type wiring plus per-entity tier emission), m2 (unclassified), M5 and M6 (the
entity_type / flag invariants), B4 (total delete-mode derivation plus FK-format emission).
Gating decisions: ALL MADE (M5 implication, M6 operational_* flags, B4 derive-in-generator).
Status: UNBLOCKED, ready to draft in full. Only open detail is the exact
(relationship_kind, owner_side, is_required) -> delete-mode mapping table, which the draft
proposes for confirmation.
Scope: CODE only (the two derivation functions, wiring, emission, M5/M6 invariants, plus the
M1/M7 prep under option b). The `entity_type` data classification (927 unclassified) is
deferred to the standing per-domain review, NOT a Plan 2 task. This keeps Plan 2 short and
focused, and likely shorter than Plan 1 (which is broad: many small items across many files).
`unclassified` degrades gracefully in the emitter; the hard classification check is a
per-domain review-band concern (B13).

### Plan 3 - Personas, RACI, and RBAC extraction (research and design)
The big one. B5 (catalog-owned `domain_roles` / `domain_permissions` /
`domain_role_permissions` / `domain_permission_hierarchy`, plus the polymorphic `process_raci`
(persona-or-skill actor) and the `process_id` edge), M10 (baseline role derivation), M11
(market-RACI emission), M13 (default
role grant), M9 (closure as an advisory companion list), the `_core` cleanup (the corrected
successor to extract-role-permission-catalog.md), and persona research. Gating decisions:
M9 and the C/I question are now RESOLVED. Depends on Plan 2 (tiers).
Scope note: this plan adds the entities AND defines a standing per-domain persona/RACI
research phase plus a review band (replacing the E-band), then does the initial research.
The 104 `_core` catalog roles are deleted, not migrated (unreviewed and rotted).
Status: remaining inputs are (a) persona research authored FRESH (which operational personas
exist per domain, their role_modules reach and per-process RACI; authoring, not a yes/no),
(b) confirm the process_raci -> {permission, consultation-state, notify-tool} fan-out
derivation (the draft proposes it; branches on persona-vs-skill actor for R), (c) the
Consulted blocking-vs-advisory flag, (d) confirm
the `_core` cleanup as the corrected successor to extract-role-permission-catalog.md.

## Sequencing
Plan 1 anytime (independent). Plan 2 after the M5 / M6 / B4 decisions. Plan 3 after Plan 2
plus the M9 / M13 / C-I decisions plus persona research.

Intra-plan ordering (soft, not hard blocks): Plan 1's M1 (factor the shared `deriveGate`)
should precede Plan 2's B2 (which adds the write-tier derivation to the same code), and
Plan 1's M7 (fix the 16 composition `owner_side` rows) should precede Plan 2's B4 emission
(which derives delete-mode from `owner_side`). If Plan 1 does not run first, pull M1 and M7
to the front of Plan 2 so it stays self-contained and emits correct output. Each plan appends its contract
changes to downstream-updates.md. Extending the architect and analyst is a later phase,
driven by that ledger, after the model is coherent.
