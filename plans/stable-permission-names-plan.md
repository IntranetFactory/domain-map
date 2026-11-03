# Stable permissions for embedded entities

**Status:** PROPOSED 2026-11-03. Every decision is answered (section 8). The two entities with two masters are fixed in the catalog (F4, F7). The other catalog fixes still need approval. The skills, generator and docs are not started.

**When built, this replaces:**
- [plan-5](plan-5-entity-scoped-gate-permissions.md), which solved the naming problem with `<entity>:<verb>` names (design only, never run);
- the naming half of [plan-4](plan-4-presence-conditional-required.md) step D;
- rows 6 and 11 of [downstream-updates.md](downstream-updates.md).

**Scope:**
- the Semantius skills, whose source is `C:\dev\semantius-agent\semantius-plugin\skills`;
- the blueprint generator and the domain-map-analyst skill docs in this repo;
- the catalog fixes in section 9, step 2.

No platform, app or CLI change is part of this plan. Section 9 lists the two limitations that leaves.

Permission names are derived, not stored. The one exception is free text: `HIRING-STARTER`'s `specification_requirements` names a permission (F6).

**Nothing is live.** There are no deployed tenants to migrate, and the file format stays `3.1`, changed in place.

**Line numbers** are from a read on 2026-11-03. Re-check them at edit time (see the precondition in section 9).

## 1. The problem

When a module embeds an entity whose owner module is not installed, its gates and overrides take the installing module's name. When the owner installs later, the name changes.

| Step | `candidates` hire gate | `candidates` write permission |
|---|---|---|
| `hiring-starter` installs alone | `hiring-starter:hire_candidate` | `hiring-starter:manage` |
| `ats-candidate-crm` installs later | `ats-candidate-crm:hire_candidate` is added; the old name stays as an orphan | `ats-candidate-crm:manage` |

This has five costs:

1. **Names depend on install order.** The same catalog produces different permissions, grants and hierarchy rows in different tenants. If two modules embedded the entity first, Stage 4n has to sweep two old prefixes.
2. **Gate rules keep testing the old name.** Stage 4n copies permissions, role grants and hierarchy rows, but nothing rewrites `has_permission` inside `validation_rules` or `select_rule`. If the old and new rules share a name, Stage 4e-merge raises a clash and fast flow keeps the live rule. If they don't, both rules run. Either way the old name stays in force, and `ats-candidate-crm:admin` does not hold it. This comes from reading the skills and has not been reproduced on a tenant.
3. **One local name can cover gates from different owners.** `hiring-starter:hire_candidate` gates both `candidates` and `job_applications`, which are separate gates in the full modules. Five local names do this today.
4. **The deployer carries machinery only this causes:** Stage 2i, most of Stage 4n, the `re-prefixed-from` annotation and the `grant_module` lookup.
5. **Module-wide permissions force a bad choice at adoption.** If `hiring-starter:manage` includes `ats-candidate-crm:manage`, the starter's managers can write to every entity in the CRM module. If it doesn't, roles holding only `hiring-starter:manage` lose write access to `candidates`. The same coarseness exists without embedding: a consumer's `read` includes the master's entire `read` (Stage 4i).

## 2. The rule

**An entity's permissions are named by the catalog, never by what is installed. Modules hold them through bundles.**

| Permission | Name | Prefix |
|---|---|---|
| Entity read | `<owner>:read_<entity>` | the entity's master |
| Entity write | `<owner>:write_<entity>` | the entity's master |
| Workflow gate | `<owner>:<verb>` | the module that realizes the state, if the catalog names one; otherwise the entity's master (D2) |
| Override (`view_all_`, `manage_all_`, `submit_`, `bypass_submit_lock`) | `<owner>:<verb>` | the entity's master |
| Bundle (`read`, `manage`, `admin`, and a narrow tier such as `interview`) | `<unit>:<tier>` | the module that declares it, as today |

`<entity>` is the catalog's table name. The prefix can name a module that is not installed yet. These names are identical in every blueprint and every tenant.

Each entity's `view_permission` and `edit_permission` point at its own read and write permissions, and never change.

### What the bundles include

| Permission | Includes |
|---|---|
| `<unit>:read` | `read_<entity>` for every entity the module provisions, consumes or contributes to |
| `<unit>:manage` | `<unit>:read`, and `write_<entity>` for each `:manage`-tier entity |
| `<unit>:admin` | `<unit>:manage`, `write_<entity>` for each `:admin`-tier entity, plus gates and overrides as today |
| Narrow tier | `write_<entity>` for the entities it covers. It is included by `<unit>:manage` as today |
| `write_<entity>` | `read_<entity>`, because a write without read is unusable under row-level security |

The §3 `write tier` column keeps its meaning. It now says which bundle includes the entity's write permission.

### `candidates` in `hiring-starter`

```
candidates.view_permission = ats-candidate-crm:read_candidates
candidates.edit_permission = ats-candidate-crm:write_candidates

ats-candidate-crm:write_candidates includes ats-candidate-crm:read_candidates
hiring-starter:read                includes ats-candidate-crm:read_candidates
hiring-starter:manage              includes ats-candidate-crm:write_candidates
hiring-starter:admin               includes ats-candidate-crm:hire_candidate
```

### `hiring-starter` before and after

| Today | Proposed |
|---|---|
| `hiring-starter:hire_candidate` | `ats-candidate-crm:hire_candidate` and `ats-pre-employee-record:hire_candidate` |
| `hiring-starter:flag_do_not_hire` | `ats-candidate-crm:flag_do_not_hire` |
| `hiring-starter:approve_offer` | `ats-offers:approve_offer` |
| `hiring-starter:publish_posting` | `ats-recruitment-pipeline:publish_posting` |
| `hiring-starter:view_all_candidates` | `ats-candidate-crm:view_all_candidates` |
| Not present | `read_` and `write_` for each of its 8 entities, 16 rows |
| `hiring-starter:read`, `:manage`, `:admin` | Same names, now bundles |

## 3. How a module holds these permissions

All of these channels exist today.

| Holder | Channel | Example |
|---|---|---|
| The module's viewer, manager and admin roles | The role holds the bundle, as today | `hiring-starter_manager` holds `hiring-starter:manage` |
| The module's admin, for gates | Hierarchy (not a high-risk gate under `raci`) | `hiring-starter:admin` includes `ats-offers:approve_offer` |
| RACI Accountable role | Direct grant in `role_permissions` | `recruiting_manager` holds `ats-recruitment-pipeline:publish_posting` |
| Persona given an override in the Additional Requirements | Direct grant in `role_permissions` | `hiring_manager` holds `ats-candidate-crm:view_all_candidates` |
| A module that consumes or contributes to an entity | Hierarchy, to that one entity | `ats-candidate-crm:read` includes `lms-skills:read_skill_profiles` |

A contributor's write relationship still follows the existing per-module manage answer (Stage 4i).

The skills already create a cross-module hierarchy row of this shape, from a based entity's tier to its base's `edit_permission` (`stage-3-shared-base.md:112`).

## 4. What happens in each install order

| Sequence | Today | Proposed |
|---|---|---|
| Unit installs alone | Mints `hiring-starter:approve_offer`; the entity uses the unit's baselines | Mints owner-named rows, held by the unit |
| A second module embeds the same entity | Grants on the first installer's names | Same permission rows, plus that module's own bundle rows |
| Owner installs later | New names, copied grants and hierarchy rows, old rows orphaned, entity repointed | Rows already exist: they move to the owner and take the owner's description. Entity columns and grants don't change; the owner adds its own bundle rows |
| Owner installs first, then the unit | Unit's rules use the owner's names | Same as above; the unit adds its bundle rows |

**Once the same modules are installed, every order ends with the same permission names, entity columns, hierarchy rows and grants.** That can be tested directly.

After adoption the unit's managers can still write to `candidates`, but nothing else in the CRM module. Stage 4j's seeding of the owner's manager role is therefore unnecessary for adoption, and would now over-grant. Removing the unit's access is an admin action.

### The one deployer rule that must change first

Stage 2a step 2 sets `module_id` to the deploying module on any row where it differs (`stage-2-reconcile.md:35`). With shared names, each new embedder would take the row from the last one.

Which module holds a row matters, because `permissions.module_id` is `NOT NULL ... ON DELETE CASCADE` (`0060_rbac_schema.once.sql:62`) and an entity's permission columns are `ON DELETE RESTRICT` (`0130_dd_schema.once.sql:30-32`). A consumer holding an entity's permission could not be deleted while that entity exists elsewhere. So a row's holder is, in this order:

1. the module whose slug is the row's prefix, once it is installed;
2. the module where the entity lives;
3. the first module that needed the row.

| Row at deploy | Prefix is this module | Prefix is another module, entity lives here | Prefix is another module, entity lives elsewhere or nowhere |
|---|---|---|---|
| Missing | Create, held here | Create, held here | Create, held here |
| Held by another module | Move here and take this spec's description | Move here, unless the holder's slug is the prefix | Leave alone |

When the owner deploys, the rows held for it land in the first column, so permission adoption needs no separate stage. Stage 2a can tell where an entity lives from the spec's annotations, because it runs before Stage 4c.

## 5. Alternatives considered

### Naming (D1)

| Option | Gate names that change on full modules | Stable across install order | Survives the catalog moving a master | Fits `<module>:<action>` |
|---|---|---|---|---|
| **A. Owner prefix (chosen)** | None | Yes | No: needs a rename (section 7) | Yes |
| B. plan-5, `<entity>:<verb>` | All: 1,108 gated states plus every override | Yes | Yes | No: the prefix is a table |
| C. Keep renaming, also rewrite rules | None | No | Not applicable | Yes |
| D. Create an empty owner module at first install | None | Yes | No | Yes |

- **B** has one real advantage, but it renames every gate to protect against an event that A can detect and handle.
- **C** keeps the costs in section 1 except the stale rules, and adds more deployer work.
- **D** would add up to six empty modules for `real-estate-agent`, each with its own scaffold, and breaks the "owner absent" test that entity adoption relies on.

### Permission grain (D3)

| Option | At adoption | Over-granting | Added rows, all 431 modules |
|---|---|---|---|
| Module-wide only | Lost access, or write access to the owner's whole module | Stays | None |
| **Every entity (chosen)** | Nothing changes | Removed from bridges | +3,897 permission, +5,437 hierarchy |
| Only entities embedded somewhere | Nothing changes for those entities | Stays for consumers of other entities | About +1,000 permission, +1,500 hierarchy (estimate) |

## 6. Impact, measured

Measured with read-only probes on the 2026-11-03 13:17 catalog cache, with both the committed generator and the working-tree generator. Both gave the same numbers. This was before the F4 and F7 fixes, so re-measure as the section 9 precondition says.

### Names that change

| Measure | All 431 modules | 55 emitted blueprints |
|---|---|---|
| Modules whose gate or override names change | 137 | 36 |
| Gate rows that change | 635 | 273 |
| Override rows that change | 260 | 116 |
| Total rows | 895 | 389 |

- **Full-module gates:** no gate or override in a module that masters or realizes it changes name.
- **Agreement with owners:** 889 of the 895 new names already match the owner's own blueprint exactly. The other 6 rows are the `legal_contracts` names fixed by F1.
- **A seventh name the count hides:** `ats-pre-employee-record:hire_candidate` on `job_applications`. Its module does not hold that entity, and it only matches today because the module's own re-prefixed `candidates` gate has the same name. F1 fixes this too.
- **Prefixes per unit:** up to 6 different owner prefixes on gates (`real-estate-agent`). `hiring-starter` has 4, or 5 counting overrides.

### Rows that per-entity permissions add

| Measure | Today, all 431 modules | Added | Today, 55 blueprints | Added |
|---|---|---|---|---|
| §8.1 permission rows | 3,615 | +3,897 | 971 | +877 |
| §9.1 hierarchy rows | 3,184 | +5,437 | 916 | +1,275 |

| Module | Entities | Permissions, today to proposed | Hierarchy rows, today to proposed |
|---|---|---|---|
| Median module | 3 | +7 | Not measured |
| `hiring-starter` | 8 | 18 to 34 | 17 to 41 |
| `ats-recruitment-pipeline` | 20 | 33 to 73 | 32 to 92 |
| `lms-course-delivery` | 29 | 52 to 110 | 51 to 138 |

- **The counts include** 543 consumer rows, 105 contributor rows (counted as both read and write, an upper bound) and the `write includes read` row. They count 72 consumer rows that section 7 then skips. The permission count across blueprints overstates a tenant's rows, because a name shared by several modules is one row.
- **Distinct names:** 2,401 across the whole catalog, for 1,226 entities. A tenant only gets those for what it installs.
- **Excluded:** 43 built-in rows, which keep platform permissions. 64 computed or derived rows get read only.

## 7. Edge cases

| Case | Data | Handling |
|---|---|---|
| State realized by a module that is not the master | 13 of 1,108 gated states | Gates use the realizer, because that is the name its own blueprint mints (D2). Read and write always use the master |
| Realizer does not hold the entity | 3 states: `legal_contracts.approved`, `legal_contracts.renewed`, `job_applications.hired`. Check M5 fails on these | F1 |
| Realizer holds the entity only as a consumer | 3 states: `csa_share_packs.delivered`, `wholesale_orders.fulfilled`, `pim_products.published`. Check M5 warns | F5. A consumer's bundle has no write permission, so the holder of the gate could not write the state |
| Entity with two masters | None since 2026-11-03: `equity_grants` and `supplier_certifications` were the only two. The generator throws on this when it emits an embedder, and check M7 fails on it | F4, F7. A new one needs the same decision: one record or two |
| Embedded with no master anywhere | 3 rows: `inventory_locations`, `dpo_training_acknowledgments`, `pci_dss_awareness_records` | F2 and F3 |
| Consumer of an entity with no master anywhere | 72 rows on 55 entities, such as `purchase_orders`. No owner name exists, and nothing can create the table | No permission row and no bundle row. Regeneration adds them when the catalog gains a master. Check B5 already reports these, and fixing them means modularizing other domains, so this plan does not |
| Consumer or contributor of an entity whose owner is known but not installed | Optional by rule | Still mint the row and the bundle row, so the owner's arrival needs no extra wiring |
| Silo: `rename-incoming-from`, a deliberately separate table | Analyst option 3b.1 | **Keep the local prefix.** A shared name would make a grant on one table open the other |
| Embedded entity renamed locally through `.aliases` | `customizations-protocol.md:15` | Prefix and entity token come from the catalog code, so the local name does not change them |
| Entity already live with other permission names (reused or hand-built) | Any `reuse-from` | **Live names win.** The analyst builds the unit's bundle rows from the entity's live `view_permission` and `edit_permission` |
| Two modules master the same table in one tenant, and the user picks a shared module | Analyst option 3b.2, rare | Live names win, so nothing is renamed. The incoming spec is rewritten to use them. "A new dedicated manager group" removes the old module's hierarchy row to the write permission (D9). This is the only deletion in the design |
| A module is deleted | `ON DELETE CASCADE` on its rows, grants and hierarchy rows | Rows held for an entity go with that entity, because they follow it (section 4). If a consumer holding a row for an absent entity is deleted, another consumer loses its hierarchy row until it redeploys |
| A held row moves at adoption | `bump_module_version_from_related` (`0420_module_version.sql:177`) bumps both modules | Expected: an entity move already does this. The old holder's next deploy reports that the live model changed (`flows.md` row 45) |
| Administrator role | Auto-granted every new permission (`0080_rbac_functions.sql:1490`) | Unchanged, but it makes Administrator the largest permission list |
| Platform built-ins (`users`, `roles`) | 43 rows | Keep platform permissions |
| `access_scope: custom` | Modeler Stage 2.5 | Unchanged: the module keeps its hand-made permissions |
| `access_scope: basic` | Today only `read` and `manage` | Per-entity rows still apply, because adoption stability is needed at every managed level. Every write sits under `manage`, since there is no `admin` |
| Entity with a `select_rule` | The rule replaces `view_permission` for reads | No change: both permissions are still minted, and `edit_permission` still applies |
| Hand-built modules through `use-semantius` or `semantius-importer` | Not deployed by the modeler | May keep module-wide permissions; both shapes stay valid on the platform |
| Owner's slug renamed in a tenant | Stage 4b-rename only renames baselines | Leave entity, gate and override names alone. The analyst takes the prefix from `mastered in`, never from a live slug |
| Catalog moves a master to another module | Would change the name | New check reports any released permission name that disappears (section 10). Handle it as a deliberate rename: the platform cascades a rename to grants, hierarchy rows and entity columns, but nothing in the migrations rewrites `has_permission` in rule JSON, so the rename must do that itself |
| Unit below `gated` | Its gate rule tests `<unit>:admin`, a bundle, so the name is stable but the owner's admin fails that rule after adoption | On adoption, an incoming rule replaces a same-named rule tagged with the module the entity came from (Stage 4e-merge) |

**What does not change:** roles still hold `read`, `manage` and `admin`, role slugs, the RACI structure, `catalog_owner_module`, entity adoption itself, and handoff attribution. The handoff step in Stage 4n moves to its own step instead of going away.

## 8. Decisions

| # | Question | Answer |
|---|---|---|
| D1 | Adopt owner-prefixed names and retire plan-5? | **Yes** |
| D2 | For states whose realizer is not the master, should gates use the realizer or the master? | **Realizer** |
| D3 | Baselines or per-entity permissions? | **A dedicated read and write permission for every entity** |
| D4 | Do deployed tenants need migrating? | **None exist,** so there is no migration phase |
| D5 | Does the format change need a version bump? | **No.** `3.1` is not live, so it stays `3.1` and changes in place. Stage 1 rejects a spec still carrying `re-prefixed-from` or `grant_module` |
| D6 | Propose the catalog fixes separately? | **No, the plan must be complete.** They are section 9, step 2 |
| D8 | Should RACI write grants narrow to the gated entities now? | **Not for now.** In the 118 modules with RACI, only 278 of 705 writable entity rows (39%) have a gate wired to a process, so narrowing would remove write access from the rest. Keep granting `<unit>:manage` and `<unit>:read`. **One exception:** on an `:admin`-tier gated entity, grant its `write_<entity>` instead of `<unit>:admin`. As written, today's rule hands that role every non-high-risk gate. This affects 12 states on at least 6 entities |
| D9 | May the deployer remove the one hierarchy row in option 3b.2 "A new dedicated manager group"? | **Yes.** Nothing is live, and the user chooses it explicitly in the same run. It needs a stated exception to the no-auto-deletion rule. The question itself stays (`flows.md` row 53) |
| D7 | Where would a load test run? | **Ignored.** No load test is part of this plan |
| D10 | How does a user see a module whose entity they can read? | **No action today.** See "Known limitations" in section 9 |
| D11 | Which module masters `equity_grants`? | **`CAP-TABLE-GRANTS`, and the other side is a different thing.** `equity_grants` held both the security issued on the cap table and the pay decision, so `COMP-INCENTIVES` got its own entity, `incentive_awards`. Done, F4 |
| D12 | Which module masters `supplier_certifications`? | **`SRM-RISK-COMPLIANCE`.** This is one record with one lifecycle, its required parent `suppliers` is mastered in SRM, and `FOOD-TRACE-SUPPLIER-PROVENANCE` is scoped to one industry, so it embeds the entity. Done, F7 |

The remaining overwrites in step 2 still need your approval item by item, per the project rule on destructive catalog writes.

## 9. Work plan

**Precondition.** The `role` to `held_as` and domain roles to `personas` schema rename is live, but another session's matching changes in `scripts/` were still uncommitted when this was written. They touch the same functions, so that work should land first. Re-run the section 6 measurements after it does.

**Order:** four steps. The one ordering rule that matters is that the skills and catalog fixes come before the blueprints regenerate, because today's modeler would mishandle the new names (section 4).

### Platform facts this relies on

These come from reading the source. They need no platform change:

| Question | Answer | Source, `C:\dev\semantius\apps\_core\migrations` |
|---|---|---|
| Must a permission's prefix match its module? | No. There is only a shape check, which these names pass | `0060_rbac_schema.once.sql:77` |
| Does a hierarchy row across modules grant the permission? | Yes. The closure ignores modules | `0080_rbac_functions.sql:684` |
| Does `has_permission` care about the module? | No. It is a string search of the caller's list | `0080_rbac_functions.sql:922` |
| Does moving `module_id` keep grants and hierarchy rows? | Yes. They reference the name. Only `updated_at` and the version bump fire | `0060_rbac_schema.once.sql:145,169`, `0420_module_version.sql:177` |
| What happens when the holding module is deleted? | Rows, grants and hierarchy rows cascade. It is refused while an entity still names the permission | `0060_rbac_schema.once.sql:62`, `0130_dd_schema.once.sql:30-32` |
| Are permissions in the token? | No. Only identity claims are read; the list is built from the database | `0080_rbac_functions.sql:566-634` |

### Known limitations, no action today

| Limitation | What happens | Where the fix would go |
|---|---|---|
| Module visibility (D10) | Navigation asks only for `module.view_permission` (`get_user_modules()`, `0250_public_functions.sql:21`). After adoption, a `hiring-starter` viewer holds `read_candidates`, but `candidates` now lives in the CRM module, which they cannot see. Today the module-wide read bridge hides this | The platform and the app |
| Module export | Export reads permissions by `module_id` (`C:\dev\semantius-cli\src\local-tools\transfer\export.ts:99-119`), so a later embedder's file names rows it does not carry, and importing that file alone onto an empty host fails on the missing permissions | The CLI transfer tools |

### Step 1: skills in `semantius-plugin/skills`

**semantius-architect**

| File | Change |
|---|---|
| `SKILL.md:226-234` | Rewrite Writing Convention 10: an embedded entity keeps the owner's names; the unit holds them through §9 |
| `references/semantic-blueprint-template.md:459` and the §3, §8.1, §9.1 rules | Add tiers `entity-read` and `entity-write`; §3 `write tier` names the including bundle; define the allowed prefixes |
| `references/stage-10-workflow-perms.md`, `stage-13-write.md:17` | Replace `<slug>:<verb>` with the owner rule |
| `references/audit-checklist.md:119-120,134` | Add blockers: a prefix outside the allowed set, an entity missing its permissions or bundle rows |
| `references/consistency-check.ts`, `evals/consistency-check/` | New checks for the above; a §8.1 prefix must be the module's slug, a §3 `mastered in` value, or a §7 realizing module. Update the three RACI fixtures, which carry `grant_module` |

**semantius-analyst**

| File | Change |
|---|---|
| `references/stage-3-collisions.md:75,102` | Adoption wording: the old module keeps its access, not only read |
| `references/stage-3-collisions.md:160-170` | Option 1 of "Manager scope", per D9 |
| `references/stage-3-collisions.md:218-228` | Replace the entity-owning-module rule. Cases 1 to 3 still decide where the entity lives, but no longer change its permission names. Add the silo exception and "live names win" |
| `references/stage-2-inspect.md` | Carry each live entity's `view_permission` and `edit_permission` for "live names win" |
| `references/stage-5-workflow-perms.md:15` | A narrow tier is a bundle that includes `write_<entity>`; the entity no longer points at it |
| `references/stage-9-governance.md:69,74,95-97` | Use the §8.1 code as written; drop the annotation and `grant_module` steps |
| `references/stage-10-rules.md:15,27,31` | Rules cite the gate's §8.1 code, not `<slug>:<verb>` |
| `references/stage-11-write.md:42` | Remove the annotation requirement |
| `references/semantic-spec-template.md:92,191-195,222,363,452,456,470` | Add `**View permission:**`; `**Edit permission:**` becomes the full code; new tiers; drop `re-prefixed-from` and `grant_module` |
| `SKILL.md:422` | Replace the annotation check with the prefix check |

**semantius-modeler**

| File | Change |
|---|---|
| `SKILL.md:237` | State the new rule |
| `SKILL.md:289`, `references/stage-4-execute.md:511` | The stated exception to no-auto-deletion, per D9. These are two copies of one rule, so edit both |
| `references/stage-1-parse.md:55-57,97,103,120` | Read entity permissions as literal codes; accept the new tiers; reject the old shape; remove `grant_module` |
| `references/stage-2-reconcile.md:29,33-36` and Stage 2.5 (also copied in `stage-4-execute.md:5-14`) | Scaffold per-entity rows at every level except `custom`; the holder table in section 4. Drop the NULL `module_id` wording, because the column is `NOT NULL` |
| `references/stage-2-reconcile.md:96-110` | Remove Stage 2i |
| `references/stage-3-plan.md:90-91` | New plan lines. Show per-entity rows as a count, not one line each |
| `references/stage-4-execute.md:164-165,195-196` | Entity columns come from the spec. Add `view_permission` to the sync list, which today covers only `edit_permission` |
| `references/stage-4-execute.md:277-295` | 4e-merge: identical JsonLogic under the same name is not a clash; add the adoption rule from section 7 |
| `references/stage-4-execute.md:376-383` | 4i: bridges name one entity's permissions, not the owner's `read` and `manage` |
| `references/stage-4-execute.md:385-402,524-532` | 4j and Gate B: only for 3b.2 option 1, not adoption |
| `references/stage-4-execute.md:412-416` | 4k, per D8: gate and override codes are literal; tier grants use the unit's bundles; `grant_module` goes |
| `references/stage-4-execute.md:482,486-507` | Remove the sweep in 4n. Keep handoff re-attribution as its own step |
| `references/stage-5-verify.md:18,166-171,203-204` | Verify owner-named rows, their holders and entity columns; keep the two user-facing "home module" lines with their new meaning; summarize per-entity rows as a count |
| `references/deploy-lib.ts`, `deploy-script-template.md:110,140`, `scaffold-lib.ts` | Remove any sweep helper; add the holder rule; entity create uses literal codes |

**semantius-optimizer**

| File | Change |
|---|---|
| `references/spec-extract-lib.ts:349,355,380` | Takes `edit_permission`'s suffix as the tier, so `write_candidates` would read as a narrow tier. Emit the full codes |
| `references/spec-extract-lib.ts:702,730-731,765` | Narrow-tier detection: a bundle that includes write permissions |
| `references/spec-extract-lib.ts:957,1024-1027` | Permissions are read by `module_id` and hierarchy rows are filtered to those. A later embedder would lose its owner-named rows, and the modeler would then reject the extracted spec. Also read permissions reached through hierarchy, entity columns and rules |
| `references/spec-extract-lib.ts:602,720`, `SKILL.md:277`, `evals/round-trip/` | Update `check.ts`, `expected-full.md` and `fixture-full.json` to match |

**Other plugin files**

| File | Change |
|---|---|
| `use-semantius/references/data-modeling.md:646-658` | Rewrite the section |
| `use-semantius/references/rbac.md:11-28` | Add: the prefix names the owning module, which may not be installed yet; describe per-entity permissions and bundles |
| `semantius-admin/references/fast-flow.md` | Check the Gate B and manager wording |
| `semantius-plugin/docs/flows.md` | Re-read every row against the changed skills and report the check. Rows 49, 53 and 99 are the ones expected to change |
| `CHANGELOG.md` for architect, analyst, modeler, optimizer | One entry each. Skills describe current behavior only, so history goes only here |

Do not edit `.agents/skills/`, per this repo's `CLAUDE.md`.

### Step 2: catalog fixes

The generator builds permission names from these rows, so a wrong row gives a wrong name.

**Done 2026-11-03, owner-approved,** with `.tmp_deploy/fix_two_master_entities_2026_11_03.ts`. Before-values are in `backups/two-master-fix-2026-11-03.json`.

| # | Entity | What changed | Why |
|---|---|---|---|
| F4 | `equity_grants` | `CAP-TABLE-GRANTS` is the only master. Row (79, 158) went from `master` to `consumer`, optional. States 112 to 118 moved to module 21. Handoffs 423, 424 and 1150 now start at `CAP-TABLE-GRANTS`. Descriptions of modules 21 and 79 updated | D11. Its gates are now named `cap-table-grants:*` |
| F4 | `incentive_awards` (new, 1482) | Mastered in `COMP-INCENTIVES`, embedded and optional in `COMP-STATEMENTS`, consumer and optional in `PAYROLL-EARNINGS-DEDUCTIONS`. 3 aliases, 4 states, 6 relationships, 2 events, 1 tool, handoffs 1606 to 1610 | D11. The pay decision: one person's bonus, commission or long-term award |
| F7 | `supplier_certifications` | `SRM-RISK-COMPLIANCE` is the only master. Row (258, 498) went from `master` to `embedded_master`. States 1771 to 1777 and events 1518 to 1520 moved to module 407. Handoff 362 is now inside SRM | D12. Its gates are now named `srm-risk-compliance:*` |

**Still needs approval.** These run as one loader script in `.tmp_deploy/`, with a backup in `backups/` first, using the live ids below. `domain_module_data_objects` has no `record_status` column, so no status is set. Nothing is stamped `approved` (Rule #1).

| # | Table and row | Write | Why | Type |
|---|---|---|---|---|
| F1a | `domain_module_data_objects`, new | `domain_module_id` 126 (`CLM-NEGOTIATION`), `data_object_id` 66 (`legal_contracts`), `held_as` `embedded_master`, `is_install_optional` false | It realizes `legal_contracts.approved` and its `contract_negotiation_threads` requires the entity | Additive |
| F1b | `domain_module_data_objects`, new | 129 (`CLM-RENEWAL`), 66, `embedded_master`, false | It realizes `legal_contracts.renewed` and its `contract_renewal_records` requires the entity | Additive |
| F1c | `domain_module_data_objects`, new | 8 (`ATS-PRE-EMPLOYEE-RECORD`), 4 (`job_applications`), `embedded_master`, false | It realizes `job_applications.hired` and its description says so. This answers `audits/ATS/state.yaml` `B2-M5-STATE-221` with its second option, which keeps the gate name, needs no overwrite, and matches D2 | Additive |
| F2a | `domain_module_data_objects`, new | 33 (`LMS-COMPLIANCE-TRAINING`), 1284 (`dpo_training_acknowledgments`), `master`, true | Its sibling `fda_part11_audit_trails` is mastered there the same way, and the record is jurisdiction-conditional | Additive |
| F2b | `domain_module_data_objects`, new | 33, 1285 (`pci_dss_awareness_records`), `master`, true | Same | Additive |
| F3 | `domain_module_data_objects` (61, 425) | `held_as` `embedded_master` to `master` | `inventory_locations`' intended owner, OMS, has no modules. `INV-CORE-STOCK` is the only module that provisions it. Its prefix is the same either way, so no name changes. Demote it if OMS is modularized later | Overwrite |
| F5a | `domain_module_data_objects` (120, 515) | `held_as` `consumer` to `embedded_master` | `FDS-DELIVERY-OPS` realizes `csa_share_packs.delivered`. `contributor` would fail check M7 inside one domain; a master plus `embedded_master` passes | Overwrite |
| F5b | `domain_module_data_objects` (120, 517) | Same | It realizes `wholesale_orders.fulfilled` | Overwrite |
| F5c | `domain_module_data_objects` (143, 811) | Same | `PIM-SYNDICATION` realizes `pim_products.published` | Overwrite |
| F6 | `domain_modules` 154, `specification_requirements` | Replace `hiring-starter:view_all_candidates` with `ats-candidate-crm:view_all_candidates` | The text names the old permission | Overwrite |

After the writes:
1. Run `domain_health.ts --domain <CODE> --record` for each touched domain.
2. Add a dated section to each `audits/<CODE>/history.md`.
3. Close `B2-M5-STATE-221` in ATS and the `inventory_locations` half of `B1B-S1-B5` in INV-MGMT, and clear their `q-` questions.

### Step 3: generator and blueprints in this repo

| File | Change |
|---|---|
| `scripts/lib/blueprint_derive.ts`, `deriveGate` | Build the code from `gateModule` and remove the installing-unit branch. Keep the owner lookup for a NULL realizer and the local fallback for no master |
| `scripts/lib/blueprint_derive.ts`, `deriveWorkflowGatesAndRules` | Overrides and §8.2 text use the entity's master for embedded rows. Keep the `ownsByEmbedding` guard, which decides which gates a unit mints. Add the `entity-read` and `entity-write` rows, including consumer and contributor rows, and skip entities with no master |
| `derivePermissionHierarchy` | Add the bundle rows from section 2, using each row's write tier |
| `deriveRaciRealization` | Follow D8 |
| `scripts/generate_blueprints.ts:887-905` | Drop the "gate re-prefixed" §7 annotation; render the new tiers |
| `scripts/analytics/blueprint_contract_check.ts:150-190,343` | An owner-prefixed gate on an embedded row is minted, not a consumer; handle the new tiers |
| `scripts/lib/blueprint_invariants.ts`, `health/checks_m.ts:86` | Add the checks in section 10 |
| `scripts/lib/__tests__/` | Update `blueprint_derive.rules.test.ts:353`, `blueprint_derive.starter.test.ts`, `blueprint_contract.test.ts`, `blueprint_render.rules.test.ts`, and the hiring-starter golden file |
| `catalog/blueprints/` | Regenerate with `--regenerate`, then run `--check`. Expect every file with a provisioned entity to change, not just the 36 from the renames. On 2026-11-03, `--regenerate --check` already reported all 55 files as changed, so most of that drift predates F4 and F7 |

### Step 4: docs in this repo

| File | Change |
|---|---|
| `.claude/skills/domain-map-analyst/SKILL.md:247,479,488,490,498,2022` | New rule; a starter's permissions are bundles plus owner-named rows; an upgrade changes no names |
| `.claude/skills/domain-map-analyst/references/modules.md:117-121,159` and the §4 permission format | Same |
| `.claude/skills/domain-map-analyst/references/skill-changelog.md` | New entry |
| `plans/plan-5-*.md`, `plans/plan-4-*.md`, `plans/downstream-updates.md` | Mark as superseded; update rows 6 and 11. `downstream-updates.md` is being edited elsewhere, so re-read it first |

## 10. Verification

| # | Check | Where |
|---|---|---|
| V1 | For every embedded gate and override, the name in the unit's §8.1 is byte-identical to the name in the owner's §8.1. Same for `read_` and `write_` | New invariant. Today 889 of 895; all of them after step 2 |
| V2 | The install orders in section 4 end with identical permission names, entity columns, hierarchy rows, grants and rule JSON | Test stack |
| V3 | No §8.1 prefix falls outside the allowed set, and every provisioned entity has its permissions and bundle rows | `consistency-check.ts` and the generator invariant |
| V4 | Regeneration reports any permission name that disappears from a released blueprint. The first regeneration is the baseline | New `--check` output |
| V5 | A gate rule passes for the owner's admin after adoption | Test stack; this is cost 2 in section 1 |
| V6 | After adoption, a holder of `hiring-starter:manage` can write `candidates` but not an entity only the CRM module has | Test stack; this is cost 5 in section 1 |
| V7 | Adopting changes no role's effective permissions, except that the owner's roles gain theirs | Test stack, comparing `get_userinfo` before and after |
| V8 | Deleting a module that holds shared rows behaves as section 7 says | Test stack |
| V9 | Checks M5, M7 and B5 pass on the step 2 rows. B5 still reports the 72 consumer rows in section 7 | `domain_health.ts` |
| V10 | No `re-prefix` wording remains outside changelogs | Search of both repos |
| V11 | `bun test` passes here; `bun test scripts/terminology.test.ts` and the optimizer round-trip eval pass in the plugin repo | Both repos |

## 11. Risks

- **Permission lists get longer and nobody has measured the effect.** Each check is a string search of the caller's whole list, and Administrator's list grows the most. The source suggests this copes, but no load test is part of this plan (D7).
- **The two known limitations in section 9 stay until someone fixes them.** A user can lose sight of an adopted entity in navigation, and a later embedder's export won't import alone.
- **This is much larger than the naming change alone.** It changes every blueprint with a provisioned entity and the file format.
- **Blueprints and permission lists get longer and harder to read.** `lms-course-delivery` goes from 52 to 110 permissions, and a starter's list shows prefixes of modules the customer has never installed. Stage 3 and Stage 5 show per-entity rows as a count, and Stage 5's "kept here until their home module is installed" line already explains the prefixes in plain words.
- **RACI stays broader than it should be.** Under D8, personas keep module-wide write access for now. Per-entity permissions make narrowing possible but don't do it.
- **`inventory_locations` may move later.** F3 makes it stable today, but modularizing OMS would change its names. Check V4 will flag that.
- **The stale-rule finding is from reading the skills.** V5 confirms the fix.
