# Semantius coverage rollup - per deployable unit (domain + value-stream process)

The saved query that certifies the three Semantius scores per deployable unit. Re-runnable any time the catalog changes. Tier definitions and the formula's authority: SKILL.md § "Semantius score".

Tool requirements live on the modules (`domain_module_tools`) and on the value-stream processes (`process_tools`). A domain's coverage is the rollup of its modules' tool requirements over the domain's
**primary modules only** (`domain_modules.domain_id = X`), deduped by `tool_id`. A starter that merely embeds one of the domain's entities is a CONSUMER of the market
(Rule #19: starters never master, only embed), not a contributor; its tools are not the market's needs
and are excluded, so the score stays a stable property of the market. **NO fallback:** a domain whose modules carry no
`domain_module_tools` reads as INCOMPLETE (band F3), not as 0-of-0 covered.

Implementation: [scripts/analytics/coverage_rollup.ts](../../../../scripts/analytics/coverage_rollup.ts). Run from project root (the `semantius` CLI reads `.env` from cwd - see [CLAUDE.md](../../../../CLAUDE.md)).

```sh
# Full per-domain rollup, sorted by domain_code
bun run scripts/analytics/coverage_rollup.ts

# Only domains whose semantius_agent_first is <100% (or incomplete), with the tools dragging them down
bun run scripts/analytics/coverage_rollup.ts --diagnostic

# Machine-readable CSV (domain_code,semantius_score,semantius_agent_core,semantius_agent_first,total_tools)
bun run scripts/analytics/coverage_rollup.ts --csv

# Single domain
bun run scripts/analytics/coverage_rollup.ts --domain CRM

# Value-stream processes instead of domains (rolls up process_tools)
bun run scripts/analytics/coverage_rollup.ts --process
```

The per-domain list emitter ([scripts/emit_domain_list.ts](../../../../scripts/emit_domain_list.ts)) computes the same three scores into `catalog/domain-map/domain-list.json`.

## The formula

For each deployable unit (a domain via `domain_module_tools`, or a value-stream process via `process_tools`), over ALL of its distinct tools, required and optional:

```
semantius_score       = count(distinct tools with coverage_tier semantius_*)                                       / count(distinct tools)
semantius_agent_core  = count(distinct tools with coverage_tier semantius_* or IN (agent_native, agent_common))         / count(distinct tools)
semantius_agent_first = count(distinct tools with coverage_tier semantius_* or IN (agent_native, agent_common, agent_first)) / count(distinct tools)
```

`business_logic` and `vendor_platform` (build) and `external` (integration work) are uncovered in all three. **Per-tool aggregation**: a domain with 5 `semantius` tools and 1 `external` tool sits at **5/6 = 83%**. The tool is the unit of count; `coverage_tier` classifies tools. `requirement_level` is reported on each listed tool but does not change the score.

The covered-tier sets are the `SCORES` constant in the script; the per-tool classification is data (`tools.coverage_tier`). When a capability changes hands (Semantius ships a capability natively, a provider ships an MCP server), UPDATE the tool rows and re-run. No formula change.

## Per-unit diagnostic output

```
⬇  78%  78%  89%  ACCT-PRACT-MGMT      7/7/8/9   ↳ agent: sign_document(agent_first)   ↳ NOT covered: fetch_irs_acceptance_status(external, optional)
∅  n/a  n/a  n/a  CONV-AI              0/0/0/0   ↳ INCOMPLETE: no domain_module_tools (band M1/F3)
```

Columns: `semantius_score`, `semantius_agent_core`, `semantius_agent_first`, unit, then the covered-tool count per score and the total. `agent:` lists the `agent_*` tools with their tier; `NOT covered:` lists the `vendor_platform` / `external` gaps with tier and, when optional, the level.

## Equivalent SQL (for psql or any DB tool)

```sql
-- Per-domain rollup over domain_module_tools (PRIMARY modules only), deduped by tool.
with module_domain as (   -- each module mapped to its one home domain
  select id as domain_module_id, domain_id from domain_modules where domain_id is not null
),
domain_tool as (          -- distinct tools per domain, required and optional
  select distinct md.domain_id, dmt.tool_id
  from module_domain md
  join domain_module_tools dmt on dmt.domain_module_id = md.domain_module_id
)
select d.domain_code,
       round(100.0 * count(*) filter (where t.coverage_tier like 'semantius_%')
             / nullif(count(*),0))::int as semantius_score,
       round(100.0 * count(*) filter (where t.coverage_tier like 'semantius_%' or t.coverage_tier in ('agent_native','agent_common'))
             / nullif(count(*),0))::int as semantius_agent_core,
       round(100.0 * count(*) filter (where t.coverage_tier like 'semantius_%' or t.coverage_tier in ('agent_native','agent_common','agent_first'))
             / nullif(count(*),0))::int as semantius_agent_first,
       count(*)::int as total_tools
from domain_tool dt
join tools t on t.id = dt.tool_id
join domains d on d.id = dt.domain_id
group by d.domain_code
order by d.domain_code;
```

For the value-stream processes, substitute `process_tools` keyed on `business_processes.id` for the `domain_tool` CTE.

## Interpreting results

- **All three at 100%:** pure records-and-workflow markets; every tool is a `semantius_*` tier.
- **`semantius_agent_core` 100%, `semantius_score` lower:** the gap is agent work (text generation and classification, team notification, calendar, chat). Runs end to end with a capable agent and the customer's office suite.
- **`semantius_agent_first` 100%, `semantius_agent_core` lower:** the rest needs agent-ready subscriptions (e-signature, payments, telephony, transcription, ad platforms) but no integration work.
- **`semantius_agent_first` below 100%:** read the `NOT covered` list. `external` gaps (filings, EDI, MLS, GDS, devices, always-on inbound) need integration work; `vendor_platform` gaps (proprietary scoring, forecasting, inference, runtime) need a build. A domain dominated by `vendor_platform` gaps has a small CRUD share by nature (compare `domains.crud_percentage`).
- **Incomplete (n/a):** a domain whose modules carry no `domain_module_tools` yet. This is a band F3 gap (author the modules' tools), surfaced loudly with no fallback, not a coverage deficit.

## Why the rollup looks this way

- **Per-tool.** The tool is the unit of work an agent calls.
- **`coverage_tier` is the partition, not `operation_kind`.** `operation_kind` describes the shape of work; who provides it is a separate fact. Semantius covers some side effects, inbound receivers, and computations natively, and commodity agents cover much of `compute`.
- **The unit is the deployable thing, not the skill.** A domain's coverage rolls up its modules' `domain_module_tools`; a value stream rolls up its `process_tools`. The `domain` / `process` skill derives its toolset from these relationships and stores nothing.
- **Semantius is NOT a row in `solutions`.** Its coverage is the `semantius_*` tiers. `tool_solutions` records non-Semantius deliveries only.
