# Make `from` always the parent

**Status:** steps a, b, c, e and d are done on 2026-11-03, with the file changes uncommitted in both repos. `owner_side` is gone from the live table; its values are in `backups/relationship-owner-side-drop-2026-11-03.json`. The one open item is the spec proof at the end of step e: the owner stopped it, because an agent cannot generate a spec here. The owner chose D1 and approved the recommendations on the row lists on 2026-11-03. This replaces `relationship-natural-order-plan.md`: no mass flip of rows.

**Written:** 2026-11-03. Counts are from the live catalog that day. After step c it holds 2,690 relationship rows.

## The problem

The words "from" and "to" mean different things in two files. The same relationship, from `C:\dev\sembench\ats\sonnet-h`:

| File | `from` | `to` | Cardinality | What `from` means there |
| --- | --- | --- | --- | --- |
| Blueprint §5 | `candidates` | `applications` | `one_to_many` | The parent |
| Spec §4 | `applications` | `candidates` | `N:1` | The table holding the field |

The verb and both diagrams already agree (`candidates`, submits, `applications`), and the field deploys correctly. So this is not a data or deployment bug. The two files describe different things: the blueprint describes relationships, and the spec lists fields to create. The problem is that they use the same words for it, and that the §6 `Verb` reads the opposite way to its own row (`semantic-spec-template.md:425`).

Separately, `owner_side` says which end is the parent. The two endpoint columns can carry that alone. Today it only adds information on rows stored child-first.

## The rule

- `data_object_id` (`from`) is the parent.
- `related_data_object_id` (`to`) is the child, and holds the field.
- A `many_to_many` row has no parent and no field, so the order carries no meaning there.

`one_to_many` stays. No new column is added. `relationship_verb` stays the verb, in parent voice, and carries straight through to the deployed `relationship_label`.

An `is_a` type, if added later, may need an exception: "Customer is a Person" naturally reads from the child. That is decided when the type is added.

## Decisions

| # | Decision | Answer | What follows |
| --- | --- | --- | --- |
| D1 | How spec §4 and §6 read | **Keep the row order, and rename the headings to FK terms** (owner, 2026-11-03) | §4 becomes `FK table`, `FK field`, `References`. §6 becomes `FK table`, `References`, `Label`. The analyst still turns a relationship into a field, and now the headings say so. The `version` stays `3.1` because the column order, and so the meaning of each position, does not change |

The alternative was to make the spec parent-first. It was rejected: §4 would then disagree with the §3 field rows in the same file (`candidate_id`, `→ candidates (N:1)`), and it would need about 25 skill files changed in meaning, plus a move to version `4.0` that refuses every existing spec.

**How others handle it:**
- Relationships read parent-first: Mermaid's ER example, `CUSTOMER ||--o{ ORDER : places`; ER/Studio, where the inverse verb is the child's point of view; ServiceNow's CMDB, which stores parent, child and a verb pair (`depends on / used by`). The Semantius platform defines `relationship_label` in parent voice (`fieldSchema.ts:60`).
- Fields are listed from the table that holds them: SQL Server's `sp_fkeys` returns `FKTABLE_NAME` and `FKCOLUMN_NAME`, and SQL writes `REFERENCES`. The platform's field has `table_name`, `field_name` and `reference_table`. Salesforce, ServiceNow reference fields and Workday Extend put the field on the child.
- None of this makes either order a formal standard for a relationship catalog, and no study of how people read these diagrams was found.

## Before starting

All done on 2026-11-03:
- The owner went with the recommendations on the row lists in c1.
- The owner committed the current work in `domain-map`.
- The owner confirmed that rels 2881 to 2886 are theirs. No other session may write relationships during step d.
- The baseline was saved with `bun run scripts/analytics/domain_health.ts --domain ATS --json --refresh`.

## Steps

The order is a, b, c, e, d. The column is dropped last, because the code and skills read it until step e is done.

### a and b: describe the rule on the two columns

| Field | Today | New description |
| --- | --- | --- |
| `data_object_id` | The source / subject side of the relationship | The parent: the "one" side of a one_to_many, and the parent of a one_to_one. On a many_to_many, either side. |
| `related_data_object_id` | The target / object side of the relationship | The child, which holds the field: the "many" side of a one_to_many, and the child of a one_to_one. On a many_to_many, the other side. |

### c: fix the rows where `from` is not the parent

**Already done on 2026-11-03, on the owner's instruction:** deleted the inverted row of four pairs stored both ways. Rels 3, 221, 239 and 300 are gone; rels 61, 2256, 254 and 587 stay. The owner accepted that rel 587 stays `one_to_many`. The rows are in `backups/relationship-pairs-before-delete-2026-11-03.json`.

**c1. The list.** Rows were judged by table names and verbs. The test is one question: which table holds the field in the real world? A row is listed only when the answer is `from`.

| Group | Rows | Proposed | Approval |
| --- | --- | --- | --- |
| Routine: `one_to_many` child-first, pointing at `users` | 7: 1060, 1061, 1063, 1662, 1663, 1664, 1665 | Swap | As one list |
| Routine: self-relationships in child voice | 2: 978, 979 | Swap the verbs only | As one list |
| Routine: `one_to_one` at `target` | 23: 15, 264, 297, 299, 324, 541, 584, 585, 933, 962, 1479, 1732, 1733, 1734, 2338, 2445, 2446, 2470, 2483, 2502, 2549, 2553, 2728 | Swap | As one list |
| `one_to_one` at `target`, but `from` is already the parent | 7: 232, 254, 267, 276, 358, 389, 2495 | Keep the order, set `source`. Rel 254's parent was accepted by the owner when its pair was resolved | Yes or no per row, or accept all |
| `one_to_one` at `source` that looks backward | 8: 848, 1162, 1264, 1942, 2111, 2112, 2113, 2493 | Swap | Yes or no per row, or accept all |
| `one_to_many` that looks backward | 4: 447, 540, 1446, 2148 | Swap | Yes or no per row, or accept all |
| Unclear from the names | 7: 703, 1008, 1433, 1459, 2164, 2768, 2855 | Owner says which table holds the field. Recommended: leave them, except 2164, which swaps | Per row |
| Pair stored both ways, with opposite claims | Rels 208 and 477 | Owner says where the content starts. Recommended: keep 208, set `source`, delete 477 | Own decision |

Rels 980 and 981 (`org_units`, `locations` to `users`) stay as they are: `from` is the parent, and the field really does belong on `users`.

What was read: all 93 `one_to_one` rows at `source`, and the 328 `one_to_many` rows matching `/(^|[_ ])(by|of|to|for|under|from|in|on|at|with)$/i` that do not point at `users`. A verb match alone proves nothing, because passive verbs are valid parent voice (`semantic-spec-template.md:425`). About 1,930 `one_to_many` rows with active verbs were not read.

**c2. The owner approves the list.** These overwrite existing values, so each row needs approval (Rule #21). Nothing is written before this. Deleting a row from a pair is its own approval.

**c3. Write.** One script in `.tmp_deploy/`, dry-run first:
1. Stop if any row differs from the approved list, and report all differences at once.
2. Stop if a swap would duplicate an existing row.
3. Back up all relationship rows, the table's field definitions and its entity row to `backups/`.
4. Swap endpoints and verbs together, and set `owner_side` to `source`, in resumable batches. A self-relationship swaps verbs only.
5. Never send `record_status`. `persona_id` stays on its row.

**c4. Verify against the backup.** Only the approved rows changed, and only in endpoints, verbs, `owner_side`, the computed label and `updated_at`. Every `one_to_many` row, and every `one_to_one` row other than any the owner chose to leave, now says `source`, which shows the column has nothing left to say.

Also list the open audit items that propose `owner_side` flips or verb swaps by row id, such as `audits/SMP/state.yaml:44`. The review counted 43 `state.yaml` files naming these fields. They are re-derived before anyone applies them. The audit files themselves are not edited.

### e: simplify the blueprint and spec

**`domain-map` code.** This must work with or without the column, so it is safe before step d:
- `scripts/lib/catalog.ts:443`: stop selecting `owner_side`. Left in, every catalog read fails after step d
- `scripts/lib/catalog_invariants.ts`: type, the rule `owner_side_not_parent`, and the `one_to_one` side, which becomes `source`
- `scripts/lib/health/logic_sam.ts:81,582,584`, `scripts/lib/health/checks_b.ts`, comment at `scripts/lib/blueprint_derive.ts:89`
- `scripts/generate_blueprints.ts:336,351,1209`: remove the §5 column and the lint rule
- `scripts/loaders/load_cluster_drafts.ts`: this is the documented loader path, so it stops sending `owner_side`. Drafts keep the column, read only to flip a `one_to_one` that names `to` as the parent. Its flip of `many_to_one` into `one_to_many` stays correct
- Tests: `blueprint_derive.rules.test.ts`, `health_sam.test.ts`, `catalog_invariants.test.ts`, `fixtures/build.ts`
- `scripts/loaders/fix_ats_modules.ts` is a one-off and stays as a record. It will now fail if re-run.

**`domain-map` skill:** `SKILL.md` (the `owner_side` rules, Rule #10, B6b), `references/module-shape.md`, a new entry in `references/skill-changelog.md`.

**Blueprint skills**, in `C:\dev\semantius-agent\semantius-plugin\skills`:
- `semantius-architect`: `semantic-blueprint-template.md`, `audit-checklist.md`, `stage-3-entities.md`, `modes-audit-extend-rebuild.md`, the ten `evals/consistency-check/fixture-blueprint-*.md` files that have the column
- `semantius-analyst`: `references/stage-1-parse.md`. It ignores `owner_side` in an older blueprint, except that a `one_to_one` row with `target` stops the run and asks for a regenerate, because there `from` is not the parent. Older files must not be refused just for having the column
- `consistency-check.ts` reads §5 `from`, `verb` and `to` by position, and those do not move

**Spec headings (D1):**

| Section | Today | New |
| --- | --- | --- |
| §4 | `From`, `Field`, `To` | `FK table`, `FK field`, `References` |
| §6 | `From`, `To`, `Verb` | `FK table`, `References`, `Label` |

The other columns, and the order of all of them, stay the same. Files that name these headings:
- `semantius-analyst`: `SKILL.md`, `references/semantic-spec-template.md`, `stage-2-inspect.md`, `stage-3-collisions.md`, `stage-9-governance.md`, `stage-11-write.md`, `modes-audit-extend-rebuild.md`. In `stage-2-inspect.md:209` the direction rule becomes simple: `FK table` is the blueprint's `to`, and `References` is its `from`
- `semantius-modeler`: `SKILL.md`, `references/stage-1-parse.md`, `stage-2-reconcile.md`, `stage-3-plan.md`, `stage-4-execute.md`, `conflict-resolution.md`. It accepts both the old and new headings, because specs at `3.1` with the old headings exist and the column order is the same
- `semantius-optimizer`: `references/spec-extract-lib.ts`, `evals/round-trip/expected-*.md`, `evals/round-trip/check.ts`
- `semantius-architect`: `evals/consistency-check/fixture-spec-*.md`, and comments in `consistency-check.ts`, which reads §4 by position. `audit-checklist.md:158` and `stage-7-handoffs.md` stay as they are: they name a stale five-column form to reject, not the current headings

`version` stays `3.1`. Spec §3, the spec diagram and the deployed field do not change.

**All skill edits:** a changelog entry per that repo's format, and `docs/architecture.md` as needed. Re-read `docs/flows.md` against the changed skills and report the result, as that repo requires.

**Regenerate Hiring Starter only:** `bun run scripts/generate_blueprints.ts --module HIRING-STARTER --no-cache`. Do not run `--regenerate`, `--released`, `--all`, `build_catalog.ts --yes` or `build_catalog.ts --check`: each rewrites other files. The other 54 blueprints and the generated `catalog/` files wait until the owner asks.

**Prove it on real output:** run the analyst on the new Hiring Starter blueprint to a spec under `.tmp_deploy/`, with no deploy. A one-off script then checks every field relationship: `FK table` equals the blueprint's `to`, `References` equals its `from`, and the deployed label equals the verb.

### d: drop `owner_side`

This deletes a catalog field, so it needs the owner's go-ahead at this point, after reviewing the result of step e (Rule #21).

1. Confirm nothing in the changed code or skills still reads it.
2. Remove the `owner_side` entry from the table's `computed_fields`, keeping `data_object_relationship_label`. The table's rules 99101 and 99102 do not use it.
3. Delete the field.
4. Run the catalog read, the tests and the health check again.

## Done means

- The two column descriptions state the rule.
- Every approved row is changed as listed, and every other row matches the backup.
- `owner_side` is gone from the live table, the code (other than the one-off loader) and the skills' current rules, with changelogs left as history.
- Specs use the new headings, and the modeler still reads a `3.1` spec with the old ones.
- The Hiring Starter blueprint has no `owner_side` column and passes the checker. The other 54 blueprints are unchanged.
- The Hiring Starter spec check above passes.
- All tests in `domain-map`, plus the consistency-check and round-trip evals, pass.
- `domain_health.ts` for ATS matches the baseline, apart from the removed rule and any row the owner approved.

## Rollback

- **Rows:** the backups restore each changed or deleted row.
- **`owner_side`:** before step d, nothing is lost. After it, re-create the field and its computed entry from the backup, and restore the values.
- **Code and skills:** git, in each repo. Discarding uncommitted work needs the owner's approval at that moment.

## Risks

- **Rows not read:** about 1,930 `one_to_many` rows were not read, so some may still be stored child-first. That is existing bad data, and it would be wrong under any design.
- **Rows left as unclear:** any of the 7 the owner leaves in place keeps its current order, so it may not follow the rule until it is resolved.
- **Blueprints generated before step c** can show changed rows in their old order, and the deleted rows. The analyst stops on the `one_to_one` rows at `target`. Regenerate a blueprint before using it.
- **Installed skill copies** (`.agents/skills`, `C:\dev\semantius-cli\skills`) stay on the old rules. The column order does not change, so they do not put a field on the wrong table.
- **Other sessions** writing relationships during steps c and d would be overwritten or stop the script.

## Not in this plan

Flipping rows to holder-first, `many_to_one`, an `inverse_verb` column in the blueprint, making the spec parent-first, a version change, a terminology ban on `one_to_many` or `owner_side`, refreshing `.agents/skills`, regenerating anything but Hiring Starter, rewriting verbs, cardinality fixes such as `order_lines` to `commerce_products` (rel 2338), `is_a` and `has_a` types, and the example "Customer is a Person (1:1, inheritance)" in the table's description (no row uses `inheritance`).
