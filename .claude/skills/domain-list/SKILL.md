---
name: domain-list
description: >-
  Builds a JSON list of every domain and point solution in the live `domain_map`
  catalog that is sold as a standalone product by at least 2 vendors, one entry per
  market with its short name, title, tagline, domain_class, a blueprint-starter prompt
  derived from the tagline ("I need a system to ...", "Give my agent a system to ..."),
  the owning department and/or industry, the top 10 entities, and the
  top 10 vendors. Catalog-only; its one write fills empty `domains.catalog_prompt`
  values before the export. Trigger on "build the domain list",
  "list all domains and point solutions as JSON", "export the blueprint prompts",
  "regenerate domain-list.json", "which markets can we start a blueprint from", or any
  ask for a machine-readable list of catalog markets with prompts, entities, and vendors.
---

# domain-list

Emits `catalog/domain-map/domain-list.json` from the live `domain_map` module (id `1001`) with [scripts/emit_domain_list.ts](../../../scripts/emit_domain_list.ts). The export is read-only; prompts are filled in a step before it.

## Run

From the project root (never `cd` first, see CLAUDE.md "Semantius CLI cwd"), in this order:

1. **Fill empty prompts.** `bun run scripts/fill_catalog_prompts.ts --dry-run`, then without `--dry-run`. It writes `domains.catalog_prompt` only where it is empty, generated from `catalog_tagline` ([scripts/lib/catalog_prompt.ts](../../../scripts/lib/catalog_prompt.ts): 14 openers such as "I need a system to", "My agent needs a system to", "Set up a system that lets us", "Can you build us something to ...?", picked per domain; "agent" is always singular; "you / your" becomes "we / our"). It never overwrites a prompt and never writes a tagline.
2. **Domains without a tagline** are listed on stderr with name and description. Write each prompt by hand in the same voice: a one-sentence command to an agent, first person ("we / our"), starting with the opener the generator picks for that domain (`VERB_OPENERS[variant(code, 14)]` in the library; a "?" opener makes the prompt a question), "agent" singular, no vendor names, American English, no em-dash. Do NOT write a tagline. Save them as `{"CODE": "prompt"}` JSON in `.tmp_deploy/` and run `bun run scripts/fill_catalog_prompts.ts --from <file>`.
3. **Export.**

```bash
bun run scripts/emit_domain_list.ts              # all domains -> catalog/domain-map/domain-list.json
bun run scripts/emit_domain_list.ts --released   # only domains with a catalog_release date
bun run scripts/emit_domain_list.ts --out p.json # custom path
bun run scripts/emit_domain_list.ts --stdout     # print, write no files
```

The export reports any domain whose `catalog_prompt` is still empty; go back to step 1.

### Prompt openers and grammar

The prompt is the buyer telling an agent what to build: opener + the tagline, converted. The opener is picked per domain by `variant(domain_code, 14)`, so a domain keeps its wording across runs. Index i is the same voice in both columns:

| # | Verb-led tagline ("Run ...", "Plan, run, and track ...") | Noun-led tagline ("A working surface ...", "Audit-ready ...") |
|---|---|---|
| 0 | I need a system to | I need |
| 1 | Build me a system to | Build me |
| 2 | My agent needs a system to | My agent needs |
| 3 | I want to | I want |
| 4 | We need a tool to | We need |
| 5 | Set up a system that lets us | Set up |
| 6 | Help me build an app to | Help me build |
| 7 | Create a system so we can | Create |
| 8 | I'm looking for a way to | I'm looking for |
| 9 | Our team needs software to | Our team needs |
| 10 | Give my agent a system to | Give my agent |
| 11 | Can you build us something to ...? | Can you build us ...? |
| 12 | We want to | We want |
| 13 | Design a system that helps us | Design |

Grammar rules (all applied by `promptFromTagline` in [scripts/lib/catalog_prompt.ts](../../../scripts/lib/catalog_prompt.ts), the source of truth; keep this table in sync with it):
- **Every verb opener takes a bare verb**, so a tagline listing several verbs stays parallel ("... to plan, run, and track every test"). Never use "for" + gerund openers: "for planning, run, and track" breaks the list.
- **Noun-led taglines** (first word "A", "An", "The", "One", "Every", "All", "Your", "Our", "Audit-ready") take the noun opener instead.
- **"agent" is always singular** ("My agent needs", "Give my agent"), never "agents".
- **Second person becomes first person plural.** your -> our, yours -> ours, you're -> we're. "you" becomes "we" before a verb ("before you need it" -> "before we need it") and "us" before a preposition or at the end ("surprises you at month-end" -> "surprises us at month-end").
- **First word lowercased** after the opener, acronyms kept ("ASC 842", "HVAC").
- **Question opener (#11)** ends the prompt with "?" instead of ".".
- Hand-written prompts (step 2) follow the same rules and use the opener their domain's index picks.

Changing the openers or the conversion does not touch saved prompts. Applying a change to all of them means clearing `catalog_prompt` first, which overwrites existing values: snapshot to `.tmp_deploy/snapshots/`, get the user's explicit approval, then rerun steps 1 to 3.

The summary and gap lists go to stderr; the JSON goes to the file (or stdout with `--stdout`).

Every run writes four files: `domain-list.json` (all entries), `domain-list-100.json` (entries with `semantius_agent_first` = 100) and `domain-list-others.json` (all other entries, including those without a score). Each entry in the others file adds `score_gaps`: every tool keeping `semantius_agent_first` below 100 (tier `business_logic`, `vendor_platform` or `external`) as `{tool, tier, requirement}`; `null` when the domain has no tools. A fourth file, `domain-list-site.json`, holds the entries whose domain has `domains.site_catalog = true` (the hand-maintained public site list, seeded with the 100% domains); flagged domains that the list filters out are reported on stderr. The split files sit next to the main one, also with `--out`.

## Entry shape

```json
{
  "name": "ATS",
  "title": "Applicant Tracking and Recruiting",
  "tagline": "Hire faster with a connected pipeline from sourcing through offer acceptance.",
  "domain_class": "point_solution",
  "prompt": "Give my agent a system to hire faster with a connected pipeline from sourcing through offer acceptance.",
  "department": ["Human Resources", "Recruiting"],
  "industry": null,
  "entities": ["Candidate", "Application", "Job Requisition", "..."],
  "vendors": ["Workday", "Greenhouse Software", "Lever", "..."],
  "semantius_score": 89,
  "semantius_agent_core": 98,
  "semantius_agent_first": 100,
  "min_org_size": "s"
}
```

| Field | Source |
|---|---|
| `name` | `domains.domain_code` |
| `title` | `domains.domain_name` |
| `tagline` | `domains.catalog_tagline`, buyer-facing one-liner; `""` when not set |
| `domain_class` | `point_solution` when the domain has a live `parent_domain_id` (a sub-market sold on its own), else `domain` |
| `prompt` | `domains.catalog_prompt` (hand-editable), filled before the export by `scripts/fill_catalog_prompts.ts` from the tagline, or written by hand when the domain has no tagline (see Run). Phrased to trigger `semantius-architect` |
| `department` | The `owner` row in `business_function_domains`, as an array from the top-level function down to the owner (`parent_business_function_id` chain), e.g. `["Finance", "Accounts Payable"]`. With several owners, the first alphabetically (reported). `null` when there is no owner |
| `industry` | `domains.industry_id` -> `industries`, as an array from the top-level industry down (`parent_industry_id` chain), e.g. `["Agriculture, Forestry, Fishing and Hunting", "Crop Production"]`. `null` when the domain has no industry |
| `entities` | Up to 10 `singular_label`s from the domain's full modules (`domain_module_data_objects`) unioned with `domain_data_objects`. Ranked master > embedded_master > contributor > derived, required before optional, then most `data_object_relationships` edges. Consumers and platform built-ins (`users`) are skipped |
| `vendors` | Up to 10 `vendor_name`s from `solution_domains` (active solutions only). Ranked by best coverage (primary > secondary > partial), then load order |
| `semantius_score` | % of the domain Semantius handles out of the box, per `domain-map-analyst` SKILL.md "Semantius score": distinct tools with a `semantius_*` `coverage_tier` (`semantius_crud`, `semantius_workflow`, `semantius_platform`) over all distinct tools (required and optional) in `domain_module_tools` across the domain's primary modules. Integer percent. `null` when those modules carry no tools (band F3), never 0 |
| `semantius_agent_core` | % handled by Semantius plus a capable agent and the customer's office suite: same formula with `agent_native` and `agent_common` added to the covered tiers. `null` exactly when `semantius_score` is |
| `semantius_agent_first` | % handled once agent-ready subscriptions are added: `agent_first` also counts as covered. `vendor_platform` and `external` tools stay uncovered in all three. `null` exactly when `semantius_score` is |
| `min_org_size` | The size key of `domains.min_org_size`: `xs` (<50), `s` (<500), `m` (<2500), `l` (<10000), `xl` (10000+). The smallest realistic buyer by headcount, a floor rather than a range. `null` when not assessed |

Entries are ordered by `department` path (top level first); entries without a department come last, ordered by `industry`. Ties sort by `name`.

## Rules

1. **Inclusion test: 2+ standalone vendors.** A domain qualifies only when at least 2 distinct vendors have an active `coverage_level='primary'` solution on it. Bundles never qualify (no vendors).
2. **Department and/or industry, at least one.** A qualifying domain with neither is left out of the file and listed as a catalog gap.
3. **Catalog-only, one write-back.** Never top up vendors or entities from research or model knowledge, and never write to Semantius from this skill except filling an EMPTY `domains.catalog_prompt` (step 1 and 2 of Run). An existing `catalog_prompt` is never overwritten; to change a prompt, edit `catalog_prompt` and rerun the export. Never write `catalog_tagline` from this skill. Fewer than 10 vendors or entities is what the catalog holds, and the file says so honestly.
4. **Report the gaps, don't fix them here.** After a run, tell the user the entry count and each stderr gap list (skipped for too few primary vendors, skipped for no department and no industry, multiple owners, thin entities, no Semantius score, empty `catalog_prompt`, `site_catalog` = true but not in the list). Fixing them (adding an owner function, vendors, or modules) is `domain-map-analyst` work; offer it, don't start it.
5. **Change the logic in the scripts, not by hand-editing the JSON.** The files are regenerated on every run. Tune ranking or thresholds (`MIN_STANDALONE_VENDORS`, `TOP_N`) in `emit_domain_list.ts` and prompt wording (`VERB_OPENERS`, `NOUN_OPENERS`, the first-person conversion) in `scripts/lib/catalog_prompt.ts`, then update this file to match.
