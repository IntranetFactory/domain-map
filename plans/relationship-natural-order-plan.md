# Store relationships in natural order

**Status:** plan only. Nothing here has been done. The owner answered D1 to D4 on 2026-11-03 (see Decisions). No row, skill or blueprint changes until the owner has committed the current work and given the go-ahead.

**Written:** 2026-11-03. Counts are from the live catalog that day.

## The problem

A relationship is written in two opposite ways today:

| Where | Same relationship | Reads from |
| --- | --- | --- |
| Catalog row and blueprint §5 | `users approves job_offers`, `one_to_many` | The parent |
| Deployed field | `job_offers.approver_id` points at `users` | The table holding the field |
| Spec §4 and §6 | `job_offers`, `users`, `N:1` | The table holding the field |
| Salesforce, ServiceNow | A field on the child points at the parent | The table holding the field |

The catalog is the odd one out, by its own choice: `owner_side` is documented as "a domain-map catalog concept, not a Semantius platform primitive". The analyst has to flip direction when it turns a blueprint into a spec (`stage-2-inspect.md:209`), and blueprint rows need `owner_side` and a separate rule about where the field sits to be read correctly. This does not break the relational model. It adds translation and confusion for no benefit.

## Target

**A relationship row reads from the table that holds the field to the table it points at.**

| Column | Today | Target |
| --- | --- | --- |
| `data_object_id` | The parent ("one" side) | The table holding the field |
| `related_data_object_id` | The child ("many" side) | The table it points at |
| `relationship_type` | `one_to_many` | `many_to_one` |
| `relationship_verb` | Reads parent to child | Reads holder to target |
| `inverse_verb` | Reads child to parent | Reads target to holder |
| `owner_side` | Names the parent | Removed. The parent is always `related_data_object_id` |

Examples:

| Rel | Today | Target |
| --- | --- | --- |
| 825 | `users [approves / has approver] job_offers`, `one_to_many` | `job_offers [has approver / approves] users`, `many_to_one` |
| 2880 | `users [owns as recruiter / has owning recruiter] job_offers`, `one_to_many` | `job_offers [has owning recruiter / owns as recruiter] users`, `many_to_one` |
| 1329 | `job_offers [evolves_through / of] offer_versions`, `one_to_many`, composition | `offer_versions [of / evolves_through] job_offers`, `many_to_one`, composition |

Blueprint §5 then needs no translation: `from` always holds the field, and `from -->|verb| to` in the diagram matches the row. The §5.3a and §5.3b split becomes "is `from` in §3 or not". The family relationships in the diagram already read this way (`based entity -.->|verb| base`).

## What each row does

Total: 2,689 relationships.

| Rows | Today | Action |
| --- | --- | --- |
| 2,257 | `one_to_many`, `users` not on the "many" side | Swap endpoints, swap verbs, set `many_to_one` |
| 2 | `one_to_many`, rels 980, 981 (`org_units`, `locations` to `users`) | Same swap. The field really does belong on `users` |
| 7 | `one_to_many`, rels 1060, 1061, 1063, 1662 to 1665 (`strategy_maps owned_by users`) | **Set `many_to_one` only.** These are already written from the holder and were typed wrongly, so a swap would break them |
| 93 | `one_to_one`, `owner_side` `source` | Swap endpoints and verbs. Stays `one_to_one` |
| 36 | `one_to_one`, `owner_side` `target` | No change: already in holder order |
| 296 | `many_to_many` | No change: no field to read from |

**Checked and clear:** no blank verbs or inverse verbs; no field references `data_object_relationships`; no other entity's rules read it; rules 99101 and 99102 work in either direction; the computed label recomputes on write; there is no unique constraint a swap could trip. Self-relationships (8) only swap verbs. The 22 pairs stored in both directions stay two rows.

**Needs review during the work:**
- 207 flippable rows have a forward verb that looks child-first, such as `hardware_assets [covered_by / warrants asset] hardware_warranties`. The ones sampled are passive verbs in the correct direction, but a few could be stored wrongly like the 7 above. Step 2 lists them for a check and stops on any that looks wrong.
- About 500 inverse verbs become forward verbs and were flagged by a rough pattern. Samples read fine (`pim_syndication_jobs [targets] pim_syndication_channels`), with some weak ones (`offer_versions [of] job_offers`). Eight rows have the same verb both ways. The run does not change verb wording: it lists the ones that read wrongly for the owner to approve.

## Decisions

Answered by the owner on 2026-11-03.

| # | Decision | Answer | What follows |
| --- | --- | --- | --- |
| D1 | Cardinality value | **Add `many_to_one`, remove `one_to_many`** | The value states the direction. Any old script writing `one_to_many` gets a hard error instead of silently storing a backward row |
| D2 | Wording of the deployed `relationship_label` and the spec verb | **Keep the parent voice ("approves")** | The blueprint gains an `inverse_verb` column and the analyst uses it for the label, so spec, modeler, optimizer and platform do not change. Blueprint diagrams read holder to target, spec diagrams stay parent to child |
| D3 | `version` | **Stay `3.1`** | Old skill copies accept flipped files and read them backward with no error, so the run refreshes them before regenerating. The plan had recommended `4.0` |
| D4 | Which blueprints to regenerate | **Hiring Starter only** | The owner reviews only Hiring Starter. The other 54 keep the old direction: 47 have no `version:` line, and the 7 ATS files say `3.1`, the same as the flipped Hiring Starter, so `version` does not show the direction. Regenerate one with `--module` before using it. This replaces the first answer (the 8 current files) and the plan's recommendation (all 55) |

**Evidence for D2:**
- Semantius defines `relationship_label` as a "Verb describing what the referenced entity does to/with this entity (e.g. "employs", "heads")" (`postgrest-mcp/src/tools/schemas/fieldSchema.ts:60`), so parent voice is the platform's definition. The optimizer draws `reference_table -->|label| table` (`spec-extract-lib.ts:283`), so holder voice would read backward there.
- Salesforce, ServiceNow, Workday, SmartSuite and SAP CDS do not appear to use a verb label: each names each side with its own noun. This does not decide between the two voices.
- Not checked: how the platform UI draws the label. `relationship_label` does not appear in `semantius-ui-kit/apps/web/src` or `semantius-cloud/apps/web`.

## The run

One run, in this order: the code has to understand the new rows before it reads them, and the blueprint is generated from the rows. It stops only where a step says so, then at the end for the owner's review.

**Before the run:** the owner commits the current work, then gives the go-ahead, which covers the live row writes. About 800 and 90 files are uncommitted, and the live catalog already depends on them. Without that commit the flip is mixed into them, and git cannot cleanly undo it.

**During the run:** no other session runs catalog work. Live-reading scripts fail from step 1 until the rows are flipped in step 2.

### Step 1: change code, skills and tests
No catalog writes.

**`domain-map`, direction logic.** These files read the direction or `owner_side`:
- `scripts/lib/catalog_invariants.ts`: shape checks, including `owner_side_not_parent`, which goes away
- `scripts/lib/blueprint_derive.ts`: `fkHolderSide`, `isIncomingRelationship`, delete-mode derivation
- `scripts/lib/blueprint_invariants.ts`: R8 `singlePersonProblem`
- `scripts/lib/catalog.ts`, `scripts/lib/health/logic_b.ts` (B6, B6b, B7, B7b, B7c, B8), `logic_sam.ts` (M7, M9), `checks_b.ts`, `checks_m.ts`
- `scripts/generate_blueprints.ts`: §5 columns including the new `inverse_verb`, diagram, `LINT_BLOCKING_DATA_RULES`
- `scripts/emit_skill_spec.ts`, `scripts/emit_domain_list.ts`, `scripts/analytics/required_relationship_presence_probe.ts`
- `scripts/lib/__tests__/**`, including `fixtures/build.ts`
- Any script under `catalog/domain-skill-template` that reads `relationship_type`; check whether there is one
- Three one-off loaders still name the old form. They stay as records and will now be refused by the enum.

**`domain-map`, skill:** `SKILL.md` (Rule #10, B6, B6b, B7, B8, the authoring steps, and the guidance that `--regenerate` is the default, because it would convert all 55), `references/module-shape.md` (including the instruction to store a child-first relationship from the parent's side), `references/loader-idiom.md`, changelog.

**Blueprint skill and what reads blueprints**, in `C:\dev\semantius-agent\semantius-plugin\skills`:
- `semantius-architect`: `semantic-blueprint-template.md`, `audit-checklist.md`, `SKILL.md`, `stage-3-entities.md`, `stage-5-mermaid.md`, `stage-13-write.md`, `modes-audit-extend-rebuild.md`, `normalization.md`, `consistency-check.ts`, all eval fixtures. `stage-5-mermaid.md` and `audit-checklist.md` say the deployer stores the §5 `verb` as `relationship_label`; under D2 that becomes `inverse_verb`
- `semantius-analyst`: `stage-1-parse.md`, `stage-2-inspect.md` (the flip goes away), `stage-3-collisions.md`, `semantic-spec-template.md`, `stage-9-governance.md`. Also where the label comes from: `inverse_verb` (D2)
- `use-semantius/references/data-modeling.md`, `docs/architecture.md`, `docs/flows.md` per that repo's rule, changelogs
- `semantius-modeler` and `semantius-optimizer` work from the spec. Expect no change under D2; the evals confirm it
- `version` stays `3.1` per D3, so no version check changes

Add to both terminology tests: `owner_side` and `one_to_many` fail in scanned files. The `domain-map` test scans `plans` and `scripts`, so any plan or script that still names them, including this file, needs an allowance. It leaves out `catalog/blueprints/`, so the other blueprints do not trip it.

### Step 2: flip the live rows
One script in `.tmp_deploy/`, written and dry-run before any write, the same way as the persona rename:
1. Stop if any row differs from what the script expects. Report all differences at once.
2. List the 207 rows for a check. Stop and show the owner any that looks stored wrongly like the 7, before anything is written.
3. Back up all 2,689 rows and the field definitions to `backups/`.
4. Add `many_to_one` to the `relationship_type` values.
5. Write the rows, per the table above, in resumable batches. Never send `record_status`. `persona_id` stays on its row.
6. Remove `one_to_many` from the values, and change the default.
7. Verify every row against the backup: endpoints and verbs swapped or unchanged as planned, nothing else different, labels recomputed.

### Step 3: regenerate Hiring Starter only
First refresh `.agents/skills` and any installed plugin copy, because with `version` at `3.1` an old copy reads a flipped file backward with no error (D3).

Then run `bun run scripts/generate_blueprints.ts --module HIRING-STARTER`. Nothing else is regenerated. Do not run `--regenerate`, `--released`, `--all` or `build_catalog.ts --yes`: each would also rewrite other blueprints. `--regenerate --check` and `build_catalog.ts --check` report the files left alone as changed, so neither can be used as a pass or fail check here.

### Step 4: verify and stop
Check everything under Done means, report the verbs that read wrongly, then stop for the owner's review. Nothing is committed: the owner reviews and commits.

## Not in this run

Each happens only when the owner asks:
- **Deleting `owner_side`.** This is destructive, so it needs its own approval (Rule #21), and only after the owner has reviewed the result. The rollback depends on the field until then.
- **Regenerating anything else.** One blueprint: `generate_blueprints.ts --module <CODE>`. `catalog/domain-map/*.json`, `catalog/skill-specs/*` and `catalog/skills/*` keep the old direction until `build_catalog.ts --yes`, which also regenerates the blueprints of released modules and brings in other catalog changes since the last regenerate, so it gets its own commit.
- **Bugs 12 and 13.** Bug 13's stage 7 change and bug 12 use the new form. Rel 1325 is written holder first: `interview_panels` to `interviews`, `many_to_one`.

## Done means

- A new test proves that for every field relationship, blueprint `from` equals the spec's `From`.
- No `one_to_many` remains in the live schema. No `one_to_many` or `owner_side` remains in the skills, generator or Hiring Starter blueprint. The `owner_side` field stays in the live schema until the owner approves deleting it.
- The relationship count is unchanged, and every row reconciles to the backup.
- Rels 825, 2880 and 1329 read as in the examples above.
- All tests, both terminology checks, and the consistency-check and round-trip evals pass.
- `domain_health.ts` shows the same check results for ATS as before, apart from wording.
- The Hiring Starter blueprint passes the current checker, and the other 54 are unchanged.
- `.agents/skills` and installed plugin copies on this machine are refreshed.

## Rollback

- Code, skills and the Hiring Starter blueprint: git, because the current work is committed before the run.
- Rows: the script's backup restores every row, then the enum goes back. `owner_side` stays until the owner approves deleting it, so this stays possible.
- Deleting `owner_side`: the field definition and values remain in the backup, but restoring means re-creating the field.

## Risks

- **Platform label drawing (D2):** the definition is checked, the drawing is not. Look at an ER diagram in the platform UI to confirm the parent-voice label reads correctly.
- **Installed skill copies:** `.agents/skills` and any installed plugin stay on the old rules until refreshed. With `version` at `3.1` they accept flipped blueprints and read them backward with no error, so the run refreshes them before regenerating. Copies on other machines stay exposed until they are updated.
- **The other 54 blueprints:** they keep the old direction. The 7 ATS files say `3.1` like the flipped Hiring Starter, so one sent to the analyst before being regenerated is read backward with no error. `SKILL.md` documents `--regenerate` as the default way to refresh blueprints, and it would convert all 55, so step 1 changes that guidance.
- **Other sessions:** writing relationships during the run would break. After the flip, an old loader gets a hard error.
- **Published copies:** blueprints published elsewhere keep the old form until republished. A published copy at `3.1` looks the same as a flipped one, so nothing in the file tells them apart. No outside reader was found in `semantius-site`, `saaszilla` or `semantius-cloud` in earlier checks, but other repos are unchecked.

## Out of scope

Rewriting verbs, noun labels for relationships, regenerating anything but Hiring Starter, the persona draft, B7c's list, British spellings, the other open bugs in the Hiring Starter review, and `domain_data_objects`.
