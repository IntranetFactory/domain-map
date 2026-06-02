# Plan 4: presence-conditional `is_required` and relationship-layer self-containment (M9 part 2)

Scope: redefine `data_object_relationships.is_required` as PRESENCE-CONDITIONAL (a required
edge is a mandatory FK only when the target entity is installed; it never forces the target
to install), and extend Plan 3's M9 self-containment audit from the entity layer to the
relationship layer. Together these make every module genuinely standalone-deployable, the
guarantee Plan 3 declared but only enforced for entity membership. Starter kits fold in as a
special case: a `module_kind='starter'` is just a module that passes the complete
(entity + relationship) self-containment audit. Decisions in
[model-map-rework-plan.md](model-map-rework-plan.md); downstream row 10 in
[downstream-updates.md](downstream-updates.md).

Out of scope:
- The DEPLOYER implementation. Provisioning presence-conditional FKs, gate re-prefixing, and
  `module_kind='starter'` handling lives in the `semantic-model-deployer` skill / platform,
  which today has ZERO handling of any of this. That is a separate platform track (see
  "Platform track" below). Plan 4 makes the CATALOG, the BLUEPRINT, and the AUDIT correct;
  the platform track is what makes a starter actually deploy.
- Bulk reclassification of every offending `is_required` flag. The new audit band surfaces
  them; fixes are per-domain, user-reviewed writes (Rule #1), never a bulk auto-rewrite.

## Prerequisites (from Plans 1-3, all landed)
- **Plan 3 M9 (entity-layer self-containment) - DONE (2026-06-02).** M9 audits
  `domain_module_data_objects`: a `contributor`, or a `consumer + necessity=required`, whose
  data_object is mastered by ANOTHER module and is not also `embedded_master` here, is a
  self-containment violation. Plan 3 DROPPED the "deployable closure / required modules"
  framing and named the fix "set `necessity=optional` (presence-conditional)". Plan 4 is the
  relationship-layer completion of that same audit and reuses its vocabulary; it introduces NO
  "closure" concept.
- **Plan 2 `deriveDeleteMode` - DONE (2026-06-01).** `deriveDeleteMode(relationship_kind,
  owner_side, is_required) -> {mode, fk_format}` (live at scripts/emit_fact_sheet.ts:1050)
  already emits per-edge delete-mode / FK format in blueprint section 5. Plan 4 adds ONE input
  (target-in-scope) and TWO new output branches: reference / association + required + absent =>
  no FK / no constraint, and composition + required + absent => emit FLAGGED as a step-B audit
  finding (never silently dropped). It extends the shipped function; it does not rebuild it.
- **Plan 1 M1 `deriveGate` (shared gate derivation) - DONE.** The gate-prefix piece (step D)
  edits the same shared `deriveGate`. Plan 1's still-open ledger row 6 ("cross-module gate
  ownership") read "prune or realize gates by closure"; "closure" is a now-dropped concept, so
  row 6 is reconciled by this plan.

## The keystone decision (resolved)
`is_required=true` means **"mandatory FK WHEN the target entity is present in the
deployment."** It NEVER forces the target to install. Entity presence is governed solely by
`domain_module_data_objects.necessity` (Rule #16) plus the deploying unit's entity selection.
The genuine "this entity must always be present" case (a `job_application` cannot exist
without a `candidate`) is expressed by the TARGET's own `necessity=required` wherever the
source is installed, NOT by the edge.

No new column. The third state ("required-if-present") is the new DEFAULT reading of the
existing boolean; "required-always" is expressed by the target's `necessity`; the step-B
audit reconciles the two.

## Live evidence (re-derive at run time; Policy 4)
A scan on 2026-06-02 found **531** `is_required=true` edges. **143** point at an entity that
is `necessity=optional` in at least one module; **19** at an entity that is `necessity=optional`
in EVERY module it appears (unambiguous), including:

- `users --grants_consent_in--> gdpr_consent_records` (EU-only)
- `candidates --discloses_via--> fcra_disclosures` (US FCRA)
- `users --logs_ce--> finra_ce_records` (US securities)
- `applicant_flow_records --audited_via--> ofccp_audit_trails` (US federal contractor)

Under the current unconditional reading each silently forces an install-optional entity to
install, defeating Rule #16 and making every subset / starter deployment unbuildable. Treat
these counts as the expectation to re-confirm at run time, not values to assume.

## Proposed presence-conditional delete-mode mapping (extends Plan 2; for sign-off)
The only change from Plan 2's table is the new "target installed?" dimension. The
"target absent + required" cell is what is broken today.

| relationship_kind | is_required | target installed? | delete_mode | FK format |
|---|---|---|---|---|
| (any) | (any) | yes | per Plan 2 table (UNCHANGED) | per Plan 2 |
| reference / association | optional | no | no FK emitted | n/a |
| reference / association | required | no | **no FK / no constraint** (today: broken non-null restrict) | n/a |
| composition | required | no | AUDIT FINDING (step B): a required composed child absent from scope is a self-containment violation; resolve by embedding the child or relaxing, not by silently dropping | n/a |

Confirm before step C emits.

## Sequenced steps

### A. Redefine `is_required` (docs + field metadata)
- Rewrite the `is_required` definition in
  [references/module-shape.md](../.claude/skills/domain-map-analyst/references/module-shape.md)
  (relationships section) to the presence-conditional wording.
- PATCH the live `/fields` description for `data_object_relationships.is_required` from
  "Whether the relationship is mandatory in typical implementations..." to the
  presence-conditional meaning. (One live write; user-approved.)
- Extend SKILL.md Rule #16 with the install-necessity / edge-requiredness bridge. This is a NEW
  framing (Rule #16 does not use "Axis-1 / Axis-2" today): Axis-1 = `necessity` install scope
  (Rule #16), Axis-2 = `is_required` on the edge. The bridge: a required edge into an
  install-optional target is required-only-when-present; no edge forces an install. Append a
  skill-changelog Decisions entry.

### B. Extend the M9 audit to the relationship layer (the new band)
- M9 today queries only `domain_module_data_objects`. Add a relationship-layer check: for the
  audited scope's in-scope entities, flag every `data_object_relationships` row with
  `is_required=true` whose other endpoint is NOT in scope, is NOT `kind='platform_builtin'` /
  master-data, and is NOT also `embedded_master` here.
- Pass: no flagged rows. Under presence-conditional semantics those edges carry no constraint,
  but a REQUIRED edge to an entity the workflow genuinely needs present is still surfaced so
  the author decides embed-vs-optional-vs-target-required.
- Probe (catalog-wide, read-only): WRITE a committed `scripts/analytics/` probe that produces
  the 531 / 143 / 19 counts. It does NOT exist yet, the counts came from an inline `bun -e`
  one-off; this step AUTHORS the real script (it cannot be "promoted").
- Fix per finding: embed the target (`embedded_master`), or relax to presence-conditional (the
  new default), or (genuine always-needed) set the target's `necessity=required` in this
  scope. User-reviewed (Rule #1).

### C. Make `deriveDeleteMode` presence-conditional (emitter code)
- Add a target-in-scope input to `deriveDeleteMode` (emit_fact_sheet.ts:1050). The in-scope test
  is per-blueprint and already available: the emitter partitions intra-scope (section 5.1) vs
  cross-scope (section 5.3) edges, so "target installed?" is decidable at emit time with no
  deploy-time knowledge.
- Two out-of-scope-target branches, matching the table above:
  - reference / association + required: emit NO FK / NO constraint (today: a non-null restrict);
    render in section 5 as "required-if-present", not a hard restrict.
  - composition + required: do NOT silently drop. Render the edge flagged as a step-B audit
    finding (a required composed child absent from scope is a self-containment violation to
    resolve by embedding or relaxing). Today these render as a silent `cascade` / `parent`
    (e.g. `candidates --discloses_via--> fcra_disclosures` in section 5.3b of hiring-starter).
- Re-run the emitter on the existing blueprints; diff; `--check` zero drift.

### D. Gate re-prefix AND mint (TWO emitter functions, not one; folds into ledger row 6)
The gate work is half label, half permission, and BOTH halves are needed or §7 and §8.1
disagree (Plan 1's M1 cross-check fails).
- **`deriveGate` (emit_fact_sheet.ts:373-388) - the §7 label.** Today it reads the prefix off
  the realizing module (:380-387). To re-prefix to the installing unit it needs a SIGNATURE
  CHANGE: receive the current blueprint's installing-unit slug + the in-scope `moduleIdSet`.
  When the realizing module is NOT in scope but the entity IS, emit the installing unit's slug
  (`hiring-starter:approve_offer`) instead of the absent module's (`ats-offers:approve_offer`).
  This is not "edit accordingly"; it is a new parameter threaded through both callers (§7 and
  the §8.1 generator below).
- **`deriveWorkflowGatesAndRules` (emit_fact_sheet.ts:1082) - the §8.1 mint.** Today it
  mints a workflow-gate permission ONLY for states the module owns as realizer
  (`realizingId === thisModuleId`) or as master of a NULL-realizer state (the ownership guard at
  :1100-1103). A starter owns NEITHER (it only `embedded_master`s, and the realizing id points
  at the absent full module), so §8.1 currently carries only the three baseline rows. To mint
  the re-prefixed gate, the ownership guard must ALSO fire when the state's entity is present
  in scope (`embedded_master`) and its realizing module is absent, minting under the installing
  unit's slug via the same updated `deriveGate`.
- This replaces the current "state pruning at deploy" behavior (modules.md section 4 drops
  these states); update modules.md section 4 and SKILL.md Rule #12 accordingly.
- Row 6 in the ledger is reconciled (already done): "prune or realize gates by closure" ->
  "re-prefix gates by what is installed".

### E. Starter folds in (Rule #19 rewrite) - names the SPECIFIC invariants in conflict
Step D mints re-prefixed workflow-gate permissions on a starter. That DIRECTLY contradicts
Rule #19 as written; the rewrite must name the conflicting invariants, not gesture at
"no-gates special-casing":
- **Rule #19 invariant #4 ("Baseline permissions only, exactly three rows", SKILL.md ~:472) is
  rewritten.** A starter no longer ships exactly three permissions. It ships the three baseline
  rows PLUS one re-prefixed `workflow-gate` permission per gated lifecycle state its embedded
  entities can reach standalone. Rationale: a gated transition reachable standalone but with no
  permission is UNGOVERNED (anyone with `:manage` fires it); the gate must exist, re-prefixed
  to the starter.
- **Rule #19 invariant #6 ("No workflow-gate tools", SKILL.md ~:474) is rewritten** in parallel:
  a starter MAY carry workflow-gate tools for those standalone-reachable gated states.
- **modules.md section 6** (the parallel "exactly three baseline permissions, no workflow-gate"
  bullet, ~:152) is rewritten in lockstep.
- **Already-true vs genuinely-new.** Lifecycle STATES for embedded entities ALREADY render in
  §7 of the starter blueprint, so "each embedded entity carries its inherited lifecycle" is NOT
  new work. The genuinely new work is the gate re-prefix (§7 label) + mint (§8.1) from step D,
  which is the same thing as the invariant conflict above. State this plainly or execution
  ships a blueprint that contradicts its own governing rule.
- Upgrade = expand the selection; same `data_object_id` to same table = no migration. On
  upgrade the re-prefixed starter gates are superseded by the full module's canonical gates
  (revisit the lingering-permission cleanup already flagged provisional in Rule #19).
- Update modules.md section 6 in parallel. Append a skill-changelog entry.

### F. Verification
- Re-run the step-B probe: expect the per-scope flagged set to be resolvable
  (embed / optional / target-required) with zero unresolved after the per-domain fixes the
  user approves.
- Re-emit every `module_kind='starter'` module (derive the set at run time, Policy 4; do NOT
  assume a fixed list - of the starters named in earlier drafts only `hiring-starter` and
  `real-estate-agent` have committed blueprints today, so confirm which others exist live before
  relying on them) and confirm the previously-incoherent sections (the empty 5.3a / 6.2 / 6.3,
  the required-edge dangles in 5.3b, and the section-7 gates prefixed with absent modules like
  `ats-offers:approve_offer`) render correctly under presence-conditional + re-prefix semantics.
- `--check` zero drift on the committed corpus.

## Platform track (out of this repo; must be owned separately)
- Deployer honors presence-conditional FKs: a required edge to a non-installed entity
  provisions a nullable / absent FK, never a broken restrict.
- Deployer re-prefixes gated transitions to the installing unit for partial deployments.
- Deployer learns `module_kind='starter'` (zero handling in `semantic-model-deployer` today).

Steps A-F make the catalog + blueprint + audit correct and consistent; the platform track is
what makes a starter actually deploy. Both are required; only A-F are in this repo.

## Live-write inventory
- Step A: one PATCH to the `/fields` description row for `is_required` (metadata,
  user-approved).
- Step B fixes: per-domain `is_required` / `necessity` reclassifications the audit surfaces
  (the 143 / 19 set), each user-reviewed (Rule #1), NOT bulk auto-applied by this plan.
- Steps C, D, E: code + docs + derived blueprint output only; no live writes.

## Downstream impact
Reframes ledger row 10 in [downstream-updates.md](downstream-updates.md) as the
relationship-layer completion of M9 (was split across rows 10 / 11), and reconciles row 6's
stale "closure" wording.

## Status
EXECUTED 2026-06-02 (all four sign-offs given). Steps A-F landed:
- A: module-shape.md `is_required` + delete-mode table, SKILL.md Rule #16 bridge, and one live
  `/fields` description PATCH (the only live write).
- B: SKILL.md M9 split into Part 1 (entity) + Part 2 (relationship); probe
  [scripts/analytics/required_edge_presence_probe.ts](../scripts/analytics/required_edge_presence_probe.ts)
  written and confirms 531 / 143 / 19 (15 reference + 4 composition unambiguous).
- C: `deriveDeleteMode` presence-conditional (cross-scope §5.3 edges render `none
  (required-if-present)` / `none` / `⚠ audit`).
- D: `deriveGate` re-prefix + `deriveWorkflowGatesAndRules` mint (+ `moduleLifecycleScope` helper,
  override-collision dedup); modules.md §4 + Rule #12 updated.
- E: Rule #19 invariants #4 / #6 rewritten, anti-patterns + modules.md §6 reconciled.
- F: all 18 committed blueprints regenerated; `--check` zero drift; no new M1 / M2 warnings.

Full write-up in the skill-changelog (2026-06-02 Plan 4 entry). DEFERRED by design: the per-domain
`is_required` / `necessity` reclassifications the M9 Part-2 band surfaces (143 / 19 set,
user-reviewed, never bulk), and the entire platform / deployer track (presence-conditional FK
provisioning, deploy-time gate re-prefix, `module_kind='starter'` handling).
