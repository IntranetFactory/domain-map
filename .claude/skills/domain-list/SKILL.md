---
name: domain-list
description: >-
  Builds a JSON list of every domain and point solution in the live `domain_map`
  catalog that is sold as a standalone product by at least 2 vendors, one entry per
  market with its short name, domain_class, a blueprint-starter prompt ("Build me ..."
  / "I need ..."), the owning department and/or industry, the top 10 entities, and the
  top 10 vendors. Read-only and catalog-only. Trigger on "build the domain list",
  "list all domains and point solutions as JSON", "export the blueprint prompts",
  "regenerate domain-list.json", "which markets can we start a blueprint from", or any
  ask for a machine-readable list of catalog markets with prompts, entities, and vendors.
---

# domain-list

Emits `catalog/domain-map/domain-list.json` from the live `domain_map` module (id `1001`) with [scripts/emit_domain_list.ts](../../../scripts/emit_domain_list.ts). The script does all the work; this skill runs it, checks the result, and reports the gaps.

## Run

From the project root (never `cd` first, see CLAUDE.md "Semantius CLI cwd"):

```bash
bun run scripts/emit_domain_list.ts              # all domains -> catalog/domain-map/domain-list.json
bun run scripts/emit_domain_list.ts --released   # only domains with a catalog_release date
bun run scripts/emit_domain_list.ts --out p.json # custom path
bun run scripts/emit_domain_list.ts --stdout     # print, write nothing
```

The summary and gap lists go to stderr; the JSON goes to the file (or stdout with `--stdout`).

## Entry shape

```json
{
  "name": "ATS",
  "domain_class": "point_solution",
  "prompt": "Build me an applicant tracking and recruiting system to manage candidates, applications, and job requisitions.",
  "department": "Recruiting",
  "industry": null,
  "entities": ["Candidate", "Application", "Job Requisition", "..."],
  "vendors": ["Workday", "Greenhouse Software", "Lever", "..."],
  "semantius_score": 93,
  "min_org_size": "s"
}
```

| Field | Source |
|---|---|
| `name` | `domains.domain_code` |
| `domain_class` | `point_solution` when the domain has a live `parent_domain_id` (a sub-market sold on its own), else `domain` |
| `prompt` | Generated: alternates "Build me" / "I need", the domain name in sentence case, then "to manage" + the top 3 entities. Phrased to trigger `semantius-architect` |
| `department` | The `owner` row in `business_function_domains`. With several owners, the first alphabetically (reported) |
| `industry` | `domains.industry_id` -> `industries.industry_name` |
| `entities` | Up to 10 `singular_label`s from the domain's full modules (`domain_module_data_objects`) unioned with `domain_data_objects`. Ranked master > embedded_master > contributor > derived, required before optional, then most `data_object_relationships` edges. Consumers and platform built-ins (`users`) are skipped |
| `vendors` | Up to 10 `vendor_name`s from `solution_domains` (active solutions only). Ranked by best coverage (primary > secondary > partial), then load order |
| `semantius_score` | The strict score from `domain-map-analyst` SKILL.md "Semantius score", as an integer percent: distinct `coverage_tier='platform'` tools over all distinct tools in `domain_module_tools` across the domain's primary modules. `null` when those modules carry no tools (band F3), never 0 |
| `min_org_size` | The size key of `domains.min_org_size`: `xs` (<50), `s` (<500), `m` (<2500), `l` (<10000), `xl` (10000+). The smallest realistic buyer by headcount, a floor rather than a range. `null` when not assessed |

Entries are ordered by `department`; entries without a department come last, ordered by `industry`. Ties sort by `name`.

## Rules

1. **Inclusion test: 2+ standalone vendors.** A domain qualifies only when at least 2 distinct vendors have an active `coverage_level='primary'` solution on it. Bundles never qualify (no vendors).
2. **Department and/or industry, at least one.** A qualifying domain with neither is left out of the file and listed as a catalog gap.
3. **Catalog-only, read-only.** Never top up vendors or entities from research or model knowledge, and never write to Semantius from this skill. Fewer than 10 vendors or entities is what the catalog holds, and the file says so honestly.
4. **Report the gaps, don't fix them here.** After a run, tell the user the entry count and each stderr gap list (skipped for too few primary vendors, skipped for no department and no industry, multiple owners, thin entities, no Semantius score). Fixing them (adding an owner function, vendors, or modules) is `domain-map-analyst` work; offer it, don't start it.
5. **Change the logic in the script, not by hand-editing the JSON.** The file is regenerated on every run. Tune ranking, wording, or thresholds (`MIN_STANDALONE_VENDORS`, `TOP_N`, `PROMPT_ENTITY_COUNT`) in the script, then update this file to match.
