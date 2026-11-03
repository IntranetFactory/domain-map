# Gate permission model: one permission per gate, admin override, high-risk gates

**Status:** APPROVED 2026-11-01, with decisions N1-N7 as recorded in section 7. The `is_high_risk` catalog column still needs its own go when it runs. This is Phase 0 of [domain-health-and-blueprint-quality-plan.md](domain-health-and-blueprint-quality-plan.md).

**Scope:**
- the semantius skills, whose source is `C:\dev\semantius-agent\semantius-plugin\skills` (read on 2026-11-01; line numbers below are from that read and are re-checked at edit time);
- the domain-map blueprint generator.

The blueprint and spec format changes. The format version stays `3.1`, because 3.1 is not live.

**Rules of the plugin repo** (`C:\dev\semantius-agent\CLAUDE.md`):
- only approved changes;
- no commits;
- skills describe current behavior only;
- re-check `docs/flows.md` after every change;
- CHANGELOG entries are headed `## <title>`, with the date on the first body line;
- Semantius is reached only through the `semantius` CLI.

## 1. Why

Today the permission set depends on the access level:

| `access_scope` | gate permissions | who takes a gated step |
|---|---|---|
| `basic`, `advanced` | none | gates not enforced |
| `gated` | none; every gate collapses to `<slug>:admin` | the admin |
| `raci` | one `workflow-gate (lifecycle)` permission per gate, not included in `<slug>:admin` | only the RACI Accountable role |

Problems:
- **Switching levels changes the permissions.** Moving a module from `gated` to `raci` creates new permissions and rewrites every rule. Moving back deletes them (stage-10 L168).
- **No admin override under `raci`.** When the Accountable person is absent, or a record is stuck, an admin can't move it. The only way out is reassigning roles.
- **The catalog generator** (domain-map) gives gates to the Responsible persona, which contradicts the RACI rule (stage-11 L7, L15). That's fixed on the domain-map side (section 5).

## 2. The model

**Principle.** Every gate has its own permission (`<slug>:<verb>`) at every enforcing level (`gated` and `raci`). The level and the RACI mode only decide who holds it. `basic`, `advanced` and `custom` don't change.

| level / mode | gate permission | admin role | Accountable role | gate rule (on the transition into the gated state) |
|---|---|---|---|---|
| `gated` | `<slug>:<verb>` | holds every gate through the hierarchy (`<slug>:admin` → gate), high-risk included (N1) | none | `has_permission(<gate>)` |
| `raci` + `documentation` | `<slug>:<verb>` | holds every gate **except high-risk** through the hierarchy | granted the gate (`role_permissions`, modeler 4k) | `has_permission(<gate>)` |
| `raci` + `living` | `<slug>:<verb>` | holds every gate **except high-risk** through the hierarchy | resolved live from `raci_assignments` | `or(is_raci_actor(<entity>, <to_state>, "accountable"), has_permission(<gate>))` |

Every gate rule uses `has_permission` (N4), wrapped in the usual `if` on the `workflow_state` transition. The rule returns its own `code` and `message`, for example "Only the hiring manager or an admin can approve an offer", instead of the platform's generic `require_permission` error. The checks that look for permission citations recognize `has_permission`: analyst SKILL L393, L412 and L434; modeler stage-1-parse L88 and L91; conflict-resolution L50; the optimizer tier heuristic; and the checker's FK-scope `permCodes`.

- **Responsible** holds the gated entities' write tier, never the gate. This is the existing RACI rule: each process has exactly one Accountable row, and that row holds the process's gates.
- **Why `has_permission`, not `require_permission`.** `require_permission` throws inside an `or` (use-semantius `jsonlogic.md` L138), so in living mode the Accountable branch couldn't pass for anyone who lacks the gate permission. `has_permission` never throws, and the rule keeps its own `code` and `message`.
- **The override lives in the authored rule.** The platform's `is_raci_actor` is unchanged.
- **High-risk** only changes the admin column. The gate keeps its permission. Under `raci` it has `included in :admin?` = `-` and no `<slug>:admin` → gate row, so only the Accountable role can take the step. Under `gated` see decision N1.
- **`included in :admin?` keeps its meaning** (spec template L450): ✓ when the `<slug>:admin` hierarchy includes the permission. Lifecycle gates now show ✓ unless high-risk.

## 3. The high-risk marker

- **Blueprint §7:** a new column `high risk?` (✓ / -) right after `requires_permission?`. It's meaningful only on rows with `requires_permission? = ✓`.
  - New header: `| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |`.
  - Readers parse by header name (template L443), so readers that don't know the column ignore it.
- **Catalog source:** `domain_map` `data_object_lifecycle_states.is_high_risk boolean default false`, a new additive column. The generator emits it into §7.
- **Spec:** the spec has no lifecycle table, by design. Its states become the `workflow_state` enum (template L380), and its gates become rules plus §8.1 rows (analyst `modes-audit-extend-rebuild.md` L42). So the marker lives in spec §8.1, as a new `high risk?` column (✓ / -) right after `included in :admin?`.
  - New header: `| permission | tier | description | included in :admin? | high risk? | reconciliation |`.
  - It's filled only on `workflow-gate (lifecycle)` rows, and it survives at every access level (N2).
  - Parsers to update:
    - analyst `semantic-spec-template.md` L186 and L191;
    - modeler `stage-1-parse.md` L77 ("five columns in this fixed order" becomes six);
    - optimizer `spec-extract-lib.ts` L640, the header literal the round-trip lint depends on;
    - the spec-side checks in `consistency-check.ts`.
  - The optimizer fills `high risk?` from the live hierarchy only at `raci` (a lifecycle gate with no admin→gate row). At `gated` it can't be recovered from live state and is written as `-`.
- **Architect capture:** see decision N3.

## 4. Changes per skill

Paths are relative to `semantius-plugin/skills`. "gated and raci" below means the per-gate rows, codes and rules now exist at both levels.

**semantius-architect**
- **SKILL.md:**
  - L223 and L306-equivalent text: the unresolved-gate annotation applies under `gated` too.
  - L229: re-prefixed gate rows exist under `gated` too.
  - L291: the hierarchy carries admin→gate rows except for high-risk gates.
  - L383-384 (pre-save checks): the own code and §8.1 rows apply under `gated` and `raci`.
  - New pre-save rows: an admin→gate row exists for every non-high-risk gate and is absent for every high-risk one, and ✓/- agrees with §7 `high risk?`.
  - L388: the RACI rule stays `raci`-only.
- **references/stage-10-workflow-perms.md:**
  - L7, L27 and L54: gate rows under `gated` and `raci`.
  - L75-88: the restricted-steps turn (N3).
  - L96: §7 gets `high risk?`.
  - L113-114: the level table.
  - L147-152: option texts, e.g. `Business roles`: "Each step is assigned to a business role; admins can step in except on high-risk steps."
  - L156: switching to `gated` keeps the gate rows and drops only the RACI trio.
  - L162-165: the body table. `gated` joins `raci` for the derived gate, §8.1 rows, `create` rules and the hierarchy.
  - L168: body conversion. basic and advanced collapse as today. `gated` and `raci` keep the rows and add admin→gate except high-risk.
- **references/consistency-check.ts:**
  - L522-526: update the doc comment.
  - L597-598: allow lifecycle rows under `gated`.
  - L600-607: `gated` uses the own-code branch.
  - L609-614: ✓ unless the §7 `high risk?` of the gate's row is ✓.
  - L616-627: require admin→gate for non-high-risk gates and forbid it for high-risk ones.
  - New: read the §7 `high risk?` column (L544-545 parse by header).
  - FK-scope T2 (L1043-1054): see N5.
- **references/semantic-blueprint-template.md:**
  - L141, L298-299, L306, L329-334, L446-447 and L476-477: rules by level.
  - L286-310: the §7 header and example rows.
  - L323: the §8.1 example row.
  - L353 and L398-412: the living A-gate shape.
  - L369-377: the hierarchy text and example.
  - L443: the column list.
- **references/audit-checklist.md:** L22, L118, L125, L127 and L202 (rows and admin roll-up by level, high-risk checks).
- **references/stage-11-governance.md:**
  - L10: switching to `gated` keeps gates.
  - L31: hierarchy emission.
  - L33: the living rule shape.
  - L37: admin also holds non-high-risk gates.
- **references/stage-8-9-rules-classification.md** L7: the §8.1 row under `gated` too; Accountable only under `raci`.
- **references/modes-audit-extend-rebuild.md:** carry `high risk?` through Customize, Extend and Rebuild.
- **No change:** `decide-access-scope.ts`, whose decision doesn't depend on gate shape, and `stage-13-write.md`.

**semantius-analyst**
- **SKILL.md:**
  - L258-261: the contract table by level.
  - L418-419: the coherence rows. `advanced` and `gated` are split.
  - L393, L412 and L434: `require_permission` / `has_permission` citations.
- **references/semantic-spec-template.md:**
  - L191: ✓ unless high-risk.
  - L215-221 and L465: admin→gate rows.
  - L253-257: the living A-gate shape.
  - L288: the level definitions.
  - L453 and L458: roll-up text.
  - L470: `gated` roles and hierarchy.
- **references/stage-5-workflow-perms.md** L9: gate rows under `gated` and `raci`.
- **references/stage-9-governance.md:**
  - L38: the `gated` hierarchy.
  - L75: living has no A gate grant, and admin holds the gate through the hierarchy.
  - L80 and L84: the living A-gate shape.
  - L92: re-prefix under `gated`.
- **references/stage-10-rules.md** L9, L13 and L77: the gate's own permission at both levels.
- **references/stage-1-parse.md** L25-26: the §7 `high risk?` column, and §8.1 ✓/-.
- **references/modes-audit-extend-rebuild.md** L42: every mode cites the gate permission.
- **references/stage-3-confirm.md** L83: no Accountable under `gated`.

**semantius-modeler**
- **references/stage-1-parse.md:**
  - L91-92: `gated` specs carry lifecycle rows.
  - L105: the living rule cites `has_permission`.
- **references/stage-2-reconcile.md** L104, L127 and L129, plus the duplicate table in **references/stage-4-execute.md** L13-14: the per-level tables.
- **references/stage-4-execute.md** L423: the living A-gate shape.
- **references/stage-5-verify.md:**
  - L58: the lifecycle check under `gated`.
  - L76-77: a missing Accountable no longer locks non-high-risk gates.
  - New: verify the admin→gate rows.
- **references/stage-3-plan.md** L87 (plain wording) and **references/conflict-resolution.md** L50 (orphan gate under `gated`).
- **No code change** in `scaffold-lib.ts`, `deploy-lib.ts` or `deploy-script-template.md`. Gate permissions and admin→gate relationships already land through the bespoke `ensurePairs` batch (template L142-147). Optionally, `verifyScaffold` (L576-585) also checks the admin→gate relationships.

**semantius-optimizer**
- **references/spec-extract-lib.ts** L672-673: the tier heuristic. Every gate is now cited by a rule, so "cited means `workflow-gate (rule)`" would misclass every lifecycle gate. Classify as `workflow-gate (lifecycle)` when the citing rule is a `workflow_state` transition rule (`value_changed` on `workflow_state`), or when the gate sits in the `has_permission` branch next to `is_raci_actor`.
- **evals/round-trip:** update `expected-full.md` (L268 `approve_vendor` becomes ✓ unless the fixture marks it high-risk) and add a `gated` fixture.

**use-semantius**
- `references/data-modeling.md` L84 and `references/crud-tools.md` L331: the `access_scope` enum descriptions switch to the new labels from [platform-access-scope-labels.md](platform-access-scope-labels.md). They're already out of date today: they say "process gates", while the platform says "workflow_state gates".
- `references/jsonlogic.md`: document `is_raci_actor` and the living A-gate shape (N7).

**semantius-admin:** no change. It depends only on whether `access_scope` is present.

**docs** (`semantius-plugin/docs`):
- `flows.md` rows 36 (restricted steps, N3), 39 (the approvals question wording), 85 (an orphan gate can now occur under `gated`) and 101 (access-level wording);
- `architecture.md` L69, L95, L175, L281 and L338.

## 5. domain-map generator (this repo)

Catalog blueprints have no `access_scope`. The architect picks the level when it clones one. The generator emits the level-free body that the `raci` column of the new contract describes, and the architect converts it for `gated` (N1) or basic/advanced:
- §8.1: one `workflow-gate (lifecycle)` row per gate, ✓ unless high-risk.
- §9.1: an admin→gate row for every non-high-risk gate.
- §9 RACI: the single Accountable row holds the process's gates; Responsible holds the write tier.
- §7: the `high risk?` column, from `is_high_risk`.
- §6.2 / §6.3: architect Writing Convention 10, which puts the installing unit on embedded-entity handoffs and hides handoffs inside the same unit.

## 6. Tests

- **The blueprint checker has no fixtures today.** Add fixtures for `consistency-check.ts` (blueprints at `gated`, at `raci` with and without a high-risk gate, and at `basic`), with the expected issues and a small runner.
- **Optimizer round-trip:** a new `gated` fixture and updated goldens. Run with `bun evals/round-trip/check.ts` from the optimizer folder.
- **domain-map:** the `bun test` suite and the lint harness from the main plan, with the checker run from the source path.

## 7. Decisions (all seven decided on 2026-11-01)

| # | question | decision |
|---|---|---|
| N1 | High-risk under `gated` | **Decided: ignore it.** The admin holds every gate at `gated`, since nobody else could. The architect's `gated` conversion sets ✓ and keeps the admin→gate rows for high-risk gates too. |
| N2 | How the spec carries high-risk | **Decided: an explicit `high risk?` column in spec §8.1** (section 3). |
| N3 | How the architect captures high-risk on a new design | **Decided: a `High risk` column in the existing restricted-steps turn** (stage-10 L75-88). The architect proposes ✓ for financial approvals, compliance sign-offs and hiring decisions, and you confirm in the same turn. No new question. Catalog clones take the catalog flag. |
| N4 | Rule shape | **Decided: `has_permission` in every mode** (section 2). |
| N5 | FK-scope check (checker L1044-1054, data-modeling L569) | **Decided: at `gated`, the check treats every lifecycle gate code as `<slug>:admin`.** Results stay exactly as today at every level, and real `raci` divergences are still flagged. The `permCodes` parse also recognizes `has_permission`. |
| N6 | The platform's `access_scope` labels | **Decided: a separate spec for you to execute,** [platform-access-scope-labels.md](platform-access-scope-labels.md). Labels only; the platform reads `access_scope` nowhere. The use-semantius copies switch to the new labels in step 6. |
| N7 | Document `is_raci_actor` in use-semantius `jsonlogic.md` | **Decided: yes.** |

## 8. Order of work

1. Approve this note. Done on 2026-11-01, with N1-N7 decided.
2. semantius-architect: the contract, the checker, and the checker fixtures.
3. semantius-analyst.
4. semantius-modeler.
5. semantius-optimizer and its goldens.
6. use-semantius, then `docs/flows.md` and `architecture.md` (run the flows.md check).
7. Run the harnesses (optimizer round-trip, checker fixtures).
8. The domain-map generator (main plan Phase 2), plus the `is_high_risk` column (needs a go).
9. Re-sync `domain-map/.agents/skills` from the source. The other copies of the skills are yours to re-sync: `C:\dev\semantius-cli\skills` and `C:\dev\semantius-copilot\agents\semantius-admin\skills` (plus its `dist-bundle`).
10. The platform labels ([platform-access-scope-labels.md](platform-access-scope-labels.md)) are executed by you, independently of steps 2-9.

Every step is left uncommitted for review.
