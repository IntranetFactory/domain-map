# Pre-migration snapshot - per-domain-skill restoration

Captured 2026-06-06 by `scripts/loaders/skill_grain_01_snapshot.ts` as Step 0 of
[../per-domain-skill-restoration.md](../per-domain-skill-restoration.md).

This is the rollback substrate for the skill/tool grain migration. It is a full `select=*`
dump of the two tables the migration mutates, captured BEFORE any destructive step. The plan's
hard invariant: nothing is destroyed that is not in this committed snapshot.

## Contents

| file | rows | note |
| --- | --- | --- |
| `skills.json` | 315 | every `skills` row (312 system + 3 process), full columns |
| `skill_tools.json` | 2767 | every `skill_tools` row, full columns |

## Accounting (plan §4 Step 0 hard invariant)

All 2767 `skill_tools` rows are removed across the migration, disjoint and exhaustive:

- 624 deleted in Step 4 (528 per-domain + 10 reused-skill 55/57 + 86 starter), after Step-2 migration.
- 226 deleted in Step 5 (the 3 process skills' rows), after migration to `process_tools`.
- 1917 removed by cascade in Step 6 (the 244 deleted full-module skills' rows).

624 + 226 + 1917 = 2767. Every row above is present in `skill_tools.json`.

## Rollback

Reconstruct `skills` from `skills.json` and `skill_tools` from `skill_tools.json` (POST each row
back, preserving ids where the deployer allows, or re-key and re-link). Keep these files until the
migration is verified and merged.
