# Plan: fix blueprint §5 and replace `necessity`

## Status (2026-11-02)

Steps 1 to 6 are done. Nothing is committed in either repo, including step 0. The user regenerates the other 47 blueprints one by one, so step 7 is theirs, and step 8 is also theirs. The test deploy was skipped by the user's decision, so the analyst and modeler rules are not proven by a deploy.

Step 6 results: 178 `users` relationships, 470 `owner_side` conflicts and 144 optional composition relationships fixed, with `.tmp_deploy/catalog_cleanup_step6_2026_11_02.ts` and `backups/catalog-cleanup-step6-2026-11-02.json`. Prevention is in place, with `.tmp_deploy/catalog_prevention_step6_2026_11_02.ts`. `owner_side` is computed, and the computed field and the validation rule passed live tests.

Remaining findings, not from this plan: `--released --lint` still fails on 4 R4 findings in LMS modules. 97 modules outside the released set cannot generate a blueprint, mostly for a missing `entity_type`, which will surface during step 7.

Decided during review, and applied to the skills:
1. **Junction leg to an external entity:** a documented exception. Every leg stays `parent` and `cascade`, because a junction row is only a relationship. `cascade` stays invalid on spec §6 rows. Not yet proven by a deploy.
2. **Re-running a deploy:** modeler stage 4h now updates `input_type` and `reference_delete_mode` on an existing §6 field when they differ from the spec.
3. **Template and generator mismatches:** the template and audit now match the generator on `kind` values, `many_to_many` diagram edges and the `personal_content` column.

Changes from the sections below: the §5.3 groups are outgoing and incoming, as written in section B. Only the generator changed for `catalog code`. Only §6.1 needed a caption. `spec-extract-lib.ts` did not change, because it writes a placeholder rather than the §6 relationship table, so only its eval changed. The architect fixtures that used the old format were 9, not 14. `data_object_relationships.is_required` kept its values, but its field description was rewritten because it named `necessity`.

## Context

Reviewing the Hiring Starter blueprint raised a question about this row:

`interviews | convenes | interview_panels | one_to_one | required | ⚠ audit: required composed child out of scope | n/a | -`

The row suggests something is required or broken, when it is only a hint about an entity outside the blueprint. The cause is two independent facts sharing one name and one word. This plan separates them everywhere: in the catalog, the code, the skills and the blueprints. An independent review on 2026-11-02 found further gaps, and they are folded in below.

## The two independent facts

| Fact | Question | Catalog column today | New catalog column | Blueprint column |
| --- | --- | --- | --- | --- |
| About an entity in a module | Can the module be installed without it? | `necessity` on `domain_module_data_objects` and `domain_data_objects` | `is_install_optional` | `install_optional` (§3) |
| About a relationship's field | Once both entities exist, must the field be filled in? | `is_required` on `data_object_relationships` | `is_required` (unchanged) | `field_required` (§5) |

Neither can be derived from the other. In 1,288 cases with both entities in one module (excluding many-to-many and built-ins, Nov 1 cache), the best rule based on `necessity` gets 62.8% of `is_required` values right, the same as always answering `false`.

## The rules for §5

- `field_required` applies only when both entities are installed. It never makes an entity required.
- §5.3 holds relationships to entities outside this blueprint. Each row relates one entity in this blueprint to one entity outside it.
- The outside entity is optional by definition. This blueprint never installs it and never requires it.
- If the outside entity does not exist, nothing is created. If it exists, the relationship is proposed.

## Problems

| # | Problem | Evidence |
| --- | --- | --- |
| 1 | §5.3 headings do not say the other entity is outside the blueprint | "Context relationships on embedded shells and consumed entities" names only the inside end |
| 2 | §5.3a / §5.3b split by the inside entity's role, which says nothing about what changes at install | `candidates becomes employees` is §5.3a in `ats-candidate-crm` and §5.3b in Hiring Starter, with identical values |
| 3 | `⚠ audit: required composed child out of scope` is a false alarm | It treats a relationship as requiring an entity, against SKILL.md Rule #16. All rows are out of scope anyway, and it names the wrong end on 22 of 162 rows, or 36 if the 14 rows with inconsistent relationships are read by cardinality |
| 4 | Health check M9 fails on that same false alarm | `checkSelfContainment` fails every required composition relationship in either direction |
| 5 | q2 in `q-ATS.md` exists only because of problems 3 and 4 | `B2-M9-COMPOSED-CHILDREN` |
| 6 | §5 shows `is_required` under the wrong name | `scripts/generate_blueprints.ts:317,332` labels it `necessity`, which is a different column |
| 7 | `necessity` is a poor name with no single definition | Rule #16 says what the deployer must install. The field description says `master` rows are required by definition, yet 195 `master` rows are `optional` |
| 8 | `fk_format` and `delete_mode` add nothing in §5.3 | `fk_format` is `n/a` on all 2,104 rows. `delete_mode` only repeats whether the field is required |
| 9 | The docs disagree on when these relationships get created | Blueprint template line 239 says never, analyst stage 2 line 209 says sometimes, and optional rows in §5.3b are never related |
| 10 | "Mandatory" cannot reach deployment | Spec §6 has no `Required` column, and the modeler always sends `input_type: "default"` (`stage-4-execute.md:345`), while `data-modeling.md:640` and `stage-2-inspect.md:209` claim a mandatory field results |
| 11 | Applying the catalog's `is_required` automatically would damage real tables | `candidates becomes employees` would make every employee need a candidate. 361 rows would put a mandatory field on an external entity, 16 of them in Hiring Starter |
| 12 | Many-to-many rows show values for a field that does not exist | `deriveDeleteMode` ignores cardinality (`blueprint_derive.ts:285-291`), so 146 rows in §5.1 and §5.2 show `reference`, while the template says junction legs use `parent` (`semantic-blueprint-template.md:197`) |
| 13 | External many-to-many relationships cannot be built | The spec rules them out because "no model owns" the junction (`semantic-spec-template.md:426`). 246 rows are affected |
| 14 | §6.1 shows another module's value in the same column as this module's | `interview_scorecards` is `required` at line 95 and `optional` at line 190 of the `ats-interviews` blueprint |
| 15 | The template contradicts the generator on who holds the field | `semantic-blueprint-template.md:195` says the `owner_side` end. `blueprint_derive.ts:91-93` and `fkHolderSide` say the other end |
| 16 | Generator and skills use different header names | `canonical code` / `canonical owner(s)` in the generator, `catalog code` / `catalog owner(s)` in the template, the analyst docs and `consistency-check.ts` |
| 17 | `users` relationships are stored as many-to-many, and nothing stops new ones | `checkUserRelationships` finds 211 rows across the catalog, 33 of them in ATS, plus 2 verbs naming two roles. `data_object_relationships` has no validation rules |
| 18 | Cardinality and `owner_side` disagree, because the same fact is stored twice | `checkRelationshipShape` finds 470 rows: 418 reference, 32 association, 20 composition |
| 19 | Hand-written descriptions contradict what the generator derives, and nothing stops them being published | Hiring Starter §1 says "no workflow gates", and §8.1 lists six. `--lint` fails only on `fail` findings and R7 is a `warn`. It does not run the `users` or `owner_side` checks at all. The count across other modules is not measured |
| 20 | Optional composition relationships contradict how they deploy, and no check covers them | 144 of 294 composition relationships are `optional`, about 130 with no other required parent. `fk_format` is `parent`, and a `parent` field cannot be empty on the platform (`data-modeling.md:378`), so `field_required: no` would be false. M9 only reads required relationships, and M7 tests `owner_side` and ownership |

## Proposed changes

### A. Catalog: replace `necessity` with `is_install_optional`

On both `domain_module_data_objects` and `domain_data_objects`:

- Add `is_install_optional`, title "Install Optional", boolean, default `false`, so only the exception is set.
- Set it to `true` where `necessity` is `optional`. `record_status` on `domain_data_objects` stays untouched. `domain_module_data_objects` has no such column.
- Delete `necessity` later, after your review. The platform cannot rename a column in place.

| `necessity` | `is_install_optional` | Module rows | Domain rows |
| --- | --- | --- | --- |
| `required` | `false` (default) | 1,527 | 1,196 |
| `optional` | `true` | 623 | 94 |

That is 717 rows to set, recounted when the step runs. No rules on either table reference `necessity`.

Field descriptions, which also settle the definition:

- Module table: "True when the module can be installed without this entity. False, the default, means every install of the module includes it. Not related to `data_object_relationships.is_required`, which says whether a relationship's field must be filled in."
- Domain table: the same text, with "domain" in place of "module".

### B. Blueprint format

`version` stays `"3.1"`, the only version going forward. It changes in place, and older versions are not supported.

All of §5 gets a caption stating the first rule above, and uses "relationships" and "blueprint" rather than the older wording for a relationship and "scope":

```
## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint
### 5.2 Relationships to platform built-ins (`users`)
### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity
| from | verb | to | cardinality | field_required | notes |
| `job_requisitions` | is advertised through | `job_postings` | one_to_many | yes | - |
| `talent_pools` | groups | `candidates` | many_to_many | - | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity
| from | verb | to | cardinality | field_required | notes |
| `interviews` | convenes | `interview_panels` | one_to_one | yes | - |
```

Direction means where the relationship's field sits and which way it points. It is not the `from` / `to` columns and not `owner_side`.

Which group a §5.3 row goes in:
- §5.3b, incoming: the field sits on the external entity, meaning an entity not listed in this blueprint's §3. An existing external table changes.
- §5.3a, outgoing: everything else. That includes many-to-many, whose new junction table points out to the external entity, and a field on a §3 entity with role `consumer` or `contributor`, such as `org_units engages contingent_workers` in `hcm-core-worker`. For those, the owner rule in D leaves the relationship to the module that owns the entity.

| Group | Hiring Starter | All blueprints |
| --- | --- | --- |
| 5.3a Outgoing | 12 | 862 |
| 5.3b Incoming | 34 | 1,242 |

The counts for all blueprints come from the current files, 47 of them older, so they may shift when regenerated.

Other format changes:
- §5.1 and §5.2: these tables have a column headed `necessity`, but it shows the relationship's `is_required`, not the catalog's `necessity`. The header becomes `field_required`, with `yes` / `no`. `delete_mode` and `fk_format` stay.
- Many-to-many rows, across all of §5: `field_required` shows `-`. In §5.1 and §5.2, `delete_mode` and `fk_format` describe the junction legs (`cascade`, `parent`).
- §3 and §6.4: `necessity` becomes `install_optional`, showing `yes` on exceptions and `-` otherwise. In §6.4 the value is still this module's own, so it needs no caption.
- §6.1: the same column, captioned to say the value belongs to the other module named in that row.
- `canonical code` and `canonical owner(s)` in the generator become `catalog code` and `catalog owner(s)`. The documented 3.1 format and the skills already use those names, so only the generator changes.

### C. Spec relationship table

Add a `Required` column to spec §6, so the decision reaches deployment:

```
| From             | To         | Verb     | Cardinality | Required | Delete   | Reconciliation |
| interview_panels | interviews | convenes | 1:1         | yes      | restrict | proposed       |
```

- `Required` defaults to `no`. `Delete` follows it: `yes` uses `restrict`, `no` uses `clear`.
- `From` stays the table holding the field, so the analyst flips direction when the blueprint's `from` is not that table.
- Modeler stage 4h sends `input_type: "required"` on `yes`, otherwise `"default"`. Its stop-and-ask for a mandatory field on a table with rows stays. `reference` fields are mandatory only in the UI (`stage-1-parse.md:175`), so existing rows do not break.
- Either end may be live or created in the same deploy. Today only `To` is resolved, and only against live tables (`stage-2-reconcile.md:82`), so these rows would go dormant.
- Replace the wording that an inbound `From` "does not yet exist" (`semantic-spec-template.md:423`).
- Remove the rule that rules out cross-model many-to-many (`semantic-spec-template.md:426`).

### D. Analyst rule

When an external entity exists at install:
- 5.3a and 5.3b fields: propose as non-mandatory. When `field_required` is `yes`, ask per row and record the answer in `Required`. Fast flow leaves it `no`.
- Many-to-many: the module being installed creates and owns a junction table with the standing pattern. Only the second module installed sees both entities, so only it creates one. The analyst adds the junction as a new entity in the spec, with the external entity as `reuse-from`. If an explicit junction entity already relates both ends, such as `talent_pool_memberships`, none is created.
- If another installed module owns the inside entity, that module carries the relationship.

No support for older versions or the old headings is kept.

### E. Health check M9

In `checkSelfContainment` (`scripts/lib/health/logic_sam.ts`), treat composition like every other relationship:
- Field on the external entity (child missing, 126 rows): not reported.
- Field on this blueprint's entity (parent missing, 36 rows): warning. This includes 14 rows in `INTGOV-GOVERNANCE` and `WORK-MGMT-GOALS-OKR` caused by relationships whose cardinality and `owner_side` disagree.

Changing what a check tests also requires updating `scripts/lib/health/registry.ts` and bumping `CHECKLIST_VERSION` to 2.

### F. Audit files

No q-file, `state.yaml` or `history.md` is edited by hand, except to record q3 and q6 as answered and applied, as Rule #22 requires. The version bump marks domains for re-validation, and the next ATS audit sees M9 no longer failing on these relationships. Leave `a2:` in `q-ATS.md` blank until then.

Only 1 of 184 `state.yaml` files has health check results recorded, so waiting for audits is not a reliable fix for the catalog data defects. Section I handles those directly.

47 `state.yaml` files and 12 q-files use `necessity`, including open write instructions such as q2's options. Add a note to `audits/README.md` saying how to translate them to `is_install_optional`.

### G. Code

- `scripts/lib/catalog.ts`: remove the role-based split (`DRIVING_ROLES`, `crossOutbound`, `crossContext`), keep `cross`, and read `is_install_optional`.
- `scripts/lib/blueprint_derive.ts`: group `cross` rows into outgoing and incoming using the existing `fkHolderSide` from `scripts/lib/health/logic_sam.ts`. Remove the `⚠ audit` branch and the rest of the cross-scope branch in `deriveDeleteMode`. Make it return junction-leg values for many-to-many.
- `scripts/generate_blueprints.ts`: new headings and captions, a new §5.3 table renderer, the column renames, and the §6 captions.
- All 17 scripts that use `necessity`, including the health checks, `emit_skill_spec.ts` (its output key at line 227), `emit_domain_list.ts`, the analytics probes, `loaders/fix_ats_modules.ts` and the test fixtures. Comparisons with `"required"` / `"optional"` become boolean checks.
- Not edited, because they are historical record: `.tmp_deploy/`, `backups/`.

### H. Docs

In this repo:
- `.claude/skills/domain-map-analyst/SKILL.md`: all 39 lines using `necessity`, including Rule #16, M9 and the coverage signals.
- `.claude/skills/domain-map-analyst/references/`: `module-shape.md`, `modules.md`, `canonical-examples.md`, `skill-changelog.md`, and `domain-audit-procedure.md`, whose queries at lines 35, 38 and 248 would break after the delete.
- `audits/README.md`, as in F.

In `C:\dev\semantius-agent\semantius-plugin\`, where the semantius skills reside (read that repo's own rules first, and follow its changelog and version convention). Every skill that describes the blueprint changes:
- `docs/flows.md`, which the repo's rules require to match the skills whenever a question changes. The analyst's new per-row question is such a change.
- `skills/semantius-architect/`: `SKILL.md`, blueprint template (§3, §5, `owner_side` at line 195), `audit-checklist.md`, `stage-3-entities.md`, `stage-5-mermaid.md`, `stage-7-handoffs.md`, `stage-13-write.md`, `modes-audit-extend-rebuild.md`, the `consistency-check.ts` header comment, and the 14 evals fixtures that use the old format.
- `skills/semantius-analyst/`: `SKILL.md`, `stage-1-parse.md`, `stage-2-inspect.md`, `stage-3-collisions.md`, `stage-3-placement.md`, `stage-3f-drift.md`, `stage-4-fields.md`, `stage-9-governance.md`, spec template.
- `skills/semantius-modeler/`: `stage-1-parse.md`, `stage-2-reconcile.md`, `stage-3-plan.md`, `stage-4-execute.md`, `stage-6-sample-data.md`.
- `skills/semantius-optimizer/`: `references/spec-extract-lib.ts`, so it extracts the new §6 column, and the 8 evals fixtures that use the old format.
- `skills/semantius-admin/`: `SKILL.md`, `references/admin-operations.md`, `references/customizations-protocol.md`.
- `skills/use-semantius/references/data-modeling.md`, including the claim at line 640.
- `commands/audit.md` and `docs/architecture.md`.

Checked and not changing, because they use `delete_mode` only as the platform's own parameter, or have no matches: `semantius-importer`, `semantius-transfer`, `use-semantius/references/entity-families.md`. In this repo, `domain-list` and `llm-wiki` have no matches.

The installed copies, in this repo's `.agents/skills/` and in `~/.agents/skills/`, are not edited directly. They match the source today and are updated from it in step 8.

### I. Catalog cleanup and prevention

Decided 2026-11-02: fix the root causes across the catalog, not just in ATS. Every list below rewrites existing catalog values, so each one is drafted first and applied only after you approve it. Nothing here changes `record_status`.

**ATS first (step 1):**
- q6, decided yes: replace the Hiring Starter description with the drafted text in `q-ATS.md`.
- q3, decided yes: restructure the 33 ATS `users` relationships as drafted in `B2-B7B-USER-RELATIONSHIPS`, so each role is one person per record and the two combined relationships are split.
- Reword the ATS background checks description, as recorded under "Conflicts" below.

**The rest of the catalog (step 6):**
1. **`users` relationships:** draft the other 178 rows with the same treatment as q3: one relationship per role, or a junction for a genuine panel (SKILL.md, check B7b).
2. **`owner_side`:** draft corrections for all 470 rows as a reviewed list, not a blind flip. In the 8 non-composition samples read so far, cardinality looks right and `owner_side` wrong, for example `service_catalog_items spawns service_requests`. In the 20 composition rows, about 18 look like cardinality is wrong, for example `work_item_comments belongs_to work_items`. The list includes the ATS rows in q4.
3. **Descriptions:** measure with `--lint`, then draft new text for each module that conflicts.
4. **Optional composition relationships (decided 2026-11-02):** draft a reviewed list of the 144 rows. About 130 have no other parent and would become `is_required = true`. The few whose child has two possible parents, such as `contract_clauses` under `legal_contracts` or `contract_templates`, cannot have two mandatory `parent` fields, so each needs its own call.

**New health check (step 2):** add a rule to `checkRelationshipShape` that flags an optional composition relationship whose child has no other parent, so audits and `--lint` both report these. It falls under the same `CHECKLIST_VERSION` bump.

**Prevention (step 6, once the rows are clean):**
- Add a validation rule on `data_object_relationships` so a `users` relationship cannot be a many-to-many reference.
- Derive `owner_side` from cardinality for everything except one-to-one, so the two cannot disagree, using a computed field. This is untested. If a computed field cannot do it, use a validation rule instead.
- Extend `--lint` in `scripts/generate_blueprints.ts` to run `checkUserRelationships` and `checkRelationshipShape`, and make their findings and R7 blocking, then make `--lint` a required step before blueprints are released.
- Add a writing rule to SKILL.md: module descriptions do not restate facts the generator derives, such as gates, counts and skills.

## Order of work

**Approving this plan approves steps 1 to 4, including the catalog writes in step 1. Steps 5, 6 and 7 each need your separate confirmation.**

0. **You commit first.** The generator and the same 9 blueprints already have uncommitted changes, and regenerating overwrites those blueprints. I do not commit. This gives a clean diff and a baseline for verification.
1. **Catalog:** add `is_install_optional` to both tables and set the 717 rows. The old column stays, so everything keeps working and this part can still be undone. Also apply the ATS catalog changes in section I: the q6 description, the q3 `users` relationships and the reworded description. These overwrite existing values, so back up the affected rows to `backups/` first.
2. **Code:** make the changes in E and G, with tests.
3. **Docs:** make the changes in C, D, F and H.
4. **Regenerate for review.** Do not run `--all`, `--released` or `--regenerate`. Leave everything uncommitted and **stop for your review**.
   - These 9 blueprints, one run each with `bun run scripts/generate_blueprints.ts --module <CODE>`, using `--no-cache` on the first run, because a cache written by the old code has no `is_install_optional`:
     - `ATS-BACKGROUND-CHECKS`, `ATS-CANDIDATE-CRM`, `ATS-INTERVIEWS`, `ATS-OFFERS`, `ATS-PRE-EMPLOYEE-RECORD`, `ATS-RECRUITMENT-PIPELINE`, `ATS-REFERRALS`, `ATS-TALENT-POOLS`
     - `HIRING-STARTER`
   - The ATS skill spec, which writes `catalog/skill-specs/ATS/spec.json` and assembles `catalog/skills/use-ats/`. Confirm the buyer copy in `catalog.yaml` is left alone.
5. **After your review, with your explicit confirmation:**
   - Check that no row differs between the old and new columns, and fix any before going on.
   - Back up `id` and `necessity` from both tables to `backups/`.
   - Delete `necessity` from both tables. The platform treats this as permanent data loss.
   - Run `bun run scripts/analytics/domain_health.ts --stale` to list the domains to re-validate.
6. **Catalog-wide cleanup and prevention, with your approval of each drafted list:** the rest of section I. Back up the affected rows before each list is applied. Prevention goes last, after the rows are clean.
7. **The other blueprints, as their own reviewed batch, with your explicit confirmation:** regenerate the other 47 blueprints, the other skill specs and `catalog/domain-map/domain-map.json`. Those 47 say `blueprint_version: "3.0"` and their last commit is from 2026-06-27, so the diff brings months of generator changes, not just §5.
8. **You commit and push `semantius-agent`, then update the installed skills** in this repo's `.agents/skills/` and in `~/.agents/skills/`. I then verify that all three match. Do this before anyone runs the analyst or modeler against a regenerated blueprint.

## Not changing

- `data_object_relationships.is_required`: the column, its name and its values. Reviewing its values on cross-module relationships is a separate catalog question.
- The modeler's stop-and-ask behavior.
- Whether `domain_data_objects` should be retired. It gets the same change, so both tables stay consistent, and 14 scripts still use it.

## Conflicts in the blueprints, and when each one ends

| Conflict | Ends at |
| --- | --- |
| Hiring Starter §1 "no workflow gates" against §8.1 (q6) | Step 1 |
| ATS `users` relationships shown as many-to-many, or naming two roles (q3) | Step 1 |
| `users` relationships in other modules | Step 6 |
| Composition relationships whose cardinality and `owner_side` disagree, which land in the wrong §5.3 group. None are ATS relationships, so the review in step 4 will not show this | Step 6 |
| Descriptions in other modules that contradict derived facts | Step 6 |
| Optional composition relationships showing `field_required: no` beside `fk_format: parent`, including in ATS | Step 6 |

Other blueprints only show these fixes once they are regenerated in step 7.

Decided 2026-11-02: the ATS background checks catalog description changes from "Screening is necessity-scoped, so deployments outside FCRA jurisdictions enable only what applies to them." to "Screening is scoped by jurisdiction, so deployments outside FCRA jurisdictions enable only what applies to them." This happens in step 1.

## Risks

1. **Two repos change.** The semantius skills are edited in `C:\dev\semantius-agent`, which is on `main` with a clean working tree today. I will not commit or push in either repo. The installed copies keep the old rules until step 8, so skills running on this machine, including in this session, will not know the new format until then.
2. **Permanent delete.** Deleting `necessity` cannot be undone on the platform. The backup and the row check come first, and step 5 needs your separate confirmation.
3. **Other catalog writers.** `data_object_relationships` lost 3 rows since the Nov 1 cache, and not from me, so something else writes to this catalog. A row added with the old column during the transition would get the wrong flag, which is why step 5 rechecks first.
4. **Live catalog.** Blueprints are generated from live data, so the diff also shows any catalog changes made since the last generation.
5. **External junctions are untested.** A junction leg would point at an external entity, and §6 relationships never use `parent` across modules today (`stage-4-execute.md:342`). If this conflicts, I stop and ask rather than choose a workaround.
6. **Analyst and modeler changes are not exercised by this plan.** They are instructions to those skills, and nothing is deployed here. A test deploy on a separate tenant, not `domain-map`, would prove them, with your go-ahead.
7. **Mixed formats until step 7.** The drift check `--check` reports the 47 older blueprints as changed until they are regenerated.
8. **q2 stays visible until the next ATS audit.** Answering it before then would still apply it. I found no written rule that a stale `b2` item gets removed, so the audit may need to drop it explicitly.
9. **Size of the cleanup.** Step 6 rewrites existing values on about 650 rows. Review of each list, the backups and applying after approval are what keep this safe. It can be split by domain if you prefer smaller lists.
10. **Deriving `owner_side` is untested.** A computed field only recalculates on write, and one-to-one rows must keep their stored value. If it does not work, a validation rule still stops new conflicts.
11. **`--lint` touches the cache.** Measuring descriptions refreshes the tracked `.cache/.catalog-cache.json`, but writes no blueprint files.
12. **The ATS counts come from q3 and the Nov 1 cache.** Row counts are rechecked against the live catalog when each list is drafted.

## Verification

1. After step 1: counts of `is_install_optional = true` match `necessity = optional` on both tables, no row differs, and `record_status` counts on `domain_data_objects` are unchanged.
2. Add tests: a row in each §5.3 group, a `consumer` row staying in §5.3a, many-to-many display values, no `⚠ audit` output, and M9 results for missing child and missing parent. Run `bun test scripts/lib`.
3. Run `domain_health.ts --domain ATS` without `--record`, so nothing is written: M9 no longer fails on the six q2 relationships.
4. Regenerate the 9 modules, then check that no other file in `catalog/blueprints/` changed.
5. Run the architect's `consistency-check.ts` on those 9 blueprints.
6. Search those 9 blueprints: no `⚠ audit`, no `required-if-present`, no `5.3a Outbound`, no `necessity` column header, no em-dashes, and `version: "3.1"`.
7. Check Hiring Starter by hand: 12 rows in §5.3a and 34 in §5.3b, `interviews convenes interview_panels` in §5.3b with `field_required` set to `yes`, `talent_pools groups candidates` in §5.3a with `-`, and `interview_scorecards` showing `install_optional` as `yes`.
8. Run `git status` in both repos against the baseline from step 0: only the files named in this plan changed, plus `.cache/.catalog-cache.json` and `crud.log`, which change on ordinary reads. Nothing is committed.
9. After the ATS changes in step 1: `checkUserRelationships` reports no ATS rows, and the 9 regenerated blueprints show the q6 text and one person per role in §5.2.
10. After step 6: `checkUserRelationships` and `checkRelationshipShape` report no `many_to_many_reference`, `owner_side_not_parent` or optional composition rows, and `--lint` passes with its new blocking checks. One invalid write attempt is rejected by the new validation rule.
11. After step 3: search all of `semantius-plugin` and `.claude/skills/domain-map-analyst/` for `necessity`, `required-if-present`, `Context relationships`, `composed child`, `Cross-scope` and `Intra-scope`. Only changelogs and platform uses of `delete_mode` remain. The architect and optimizer evals still pass.
12. After step 8: `diff -r` finds no differences between the source and both installed copies.
