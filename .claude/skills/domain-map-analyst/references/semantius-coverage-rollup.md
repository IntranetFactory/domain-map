# Semantius coverage rollup - per deployable unit (domain + value-stream process)

The saved query that certifies "% Semantius OOTB" per deployable unit. Re-runnable any time the catalog changes.

Since the per-domain-skill migration (plans/per-domain-skill-restoration.md), tool requirements live on the
modules (`domain_module_tools`) and on the value-stream processes (`process_tools`), not on per-module
`skill_tools` (retired). A domain's coverage is the rollup of its modules' tool requirements over the domain's
**primary modules only** (`domain_modules.domain_id = X`), deduped by tool with `required` winning over
`optional`. A starter that merely embeds one of the domain's entities is a CONSUMER of the market
(Rule #19: starters never master, only embed), not a contributor; its tools are not the market's needs
and are excluded, so the score stays a stable property of the market. **NO fallback:** a domain whose modules carry no
`domain_module_tools` reads as INCOMPLETE (band F3), not as 0-of-0 covered.

Implementation: [scripts/analytics/coverage_rollup.ts](../../../../scripts/analytics/coverage_rollup.ts). Run from project root (the `semantius` CLI reads `.env` from cwd - see [CLAUDE.md](../../../../CLAUDE.md)).

```sh
# Full per-domain rollup, sorted by domain_code
bun run scripts/analytics/coverage_rollup.ts

# Only domains <100% (or incomplete), with the specific tools dragging them down
bun run scripts/analytics/coverage_rollup.ts --diagnostic

# Machine-readable CSV (domain_code,pct,covered,required)
bun run scripts/analytics/coverage_rollup.ts --csv

# Single domain
bun run scripts/analytics/coverage_rollup.ts --domain CRM

# Value-stream processes instead of domains (rolls up process_tools)
bun run scripts/analytics/coverage_rollup.ts --process
```

## The formula

For each deployable unit (a domain via `domain_module_tools`, or a value-stream process via `process_tools`):

```
% = count(distinct required tools whose operation_kind ∈ SEMANTIUS_COVERED)
    / count(distinct required tools)
```

The domain's tool set is the union of `domain_module_tools` across the domain's primary modules only, deduped
by `tool_id` (`required` wins over `optional` on a collision). Starters that embed a domain entity are
consumers of the market, not contributors, so their tools are excluded. `optional` rows are ignored for the percentage -
they don't drag the score down. **Per-tool aggregation, not per-operation_kind**: a domain needing 5 `query`
tools + 1 `send_email` tool sits at **5/6 = 83%**, not 50%. The tool is the unit of count; `operation_kind`
classifies tools. A domain with zero required tools is reported as **incomplete** (`n/a`), never as covered.

## The Semantius-covered set

**Source of truth: hardcoded in [coverage_rollup.ts](../../../../scripts/analytics/coverage_rollup.ts) at the constant `SEMANTIUS_COVERED`.** Today:

```
SEMANTIUS_COVERED = { "query", "mutate" }
```

The cheapest representation while the Semantius-covered set churns. Edit the constant when Semantius gains a new
generic primitive (e.g. native email send → a new `operation_kind` value), then re-run. No DDL needed.

## Per-unit diagnostic output

For units <100%, the script lists the offending tools inline. Example:

```
⬇  86%  PA                   12/14   ↳ NOT covered: generate_text(compute), send_email(side_effect)
∅  n/a  CONV-AI              0/0     ↳ INCOMPLETE: no required domain_module_tools (band M1/F3)
```

The set in parentheses is `operation_kind`. `side_effect` and `compute` are the two non-Semantius kinds today.

## Equivalent SQL (for psql or any DB tool)

```sql
-- Per-domain rollup over domain_module_tools (PRIMARY modules only), deduped by tool.
-- A starter that merely embeds a domain's entity is a consumer of the market, not a contributor,
-- so its tools are NOT rolled into that market's score.
with module_domain as (   -- each module mapped to its one home domain
  select id as domain_module_id, domain_id from domain_modules where domain_id is not null
),
domain_tool as (          -- distinct required tools per domain, required wins over optional
  select md.domain_id, dmt.tool_id, bool_or(dmt.requirement_level = 'required') as is_required
  from module_domain md
  join domain_module_tools dmt on dmt.domain_module_id = md.domain_module_id
  group by md.domain_id, dmt.tool_id
),
scored as (
  select dt.domain_id, t.tool_name, t.operation_kind,
         case when t.operation_kind in ('query','mutate') then 1 else 0 end as covered
  from domain_tool dt
  join tools t on t.id = dt.tool_id
  where dt.is_required
)
select d.domain_code,
       sum(covered)::int as covered_count,
       count(*)::int     as required_count,
       round(100.0 * sum(covered) / nullif(count(*),0))::int as pct
from scored s
join domains d on d.id = s.domain_id
group by d.domain_code
order by d.domain_code;
```

For the value-stream processes, substitute `process_tools` keyed on `processes.id` for the `domain_tool` CTE.

## Interpreting results

- **100% pure-Semantius cluster:** platform/infra/security/content/pure-CRUD domains (APIM, IPAAS, KUBE-PLAT, DCIM, NPMD, UEM, VSDP, ITAM/HAM/SAM, IGA, BPA, PSA, WORK-MGMT, etc). With no required externals every tool is `query` or `mutate`.
- **+email cluster (~80-92%):** operational domains where notifications are a workflow requirement (CRM, CSM, HRSD, FIN, OMS, etc).
- **+email +sign cluster (~67-86%):** talent/contract/real-estate/supplier domains where document signing is integral.
- **+email +chat cluster (~67-80%):** IT-ops/ChatOps domains (AIOPS, ITOM, OBS, RMM, MSP-PSA, WSC).
- **Specialty low scores:** CONV-AI (compute externals), CCAAS (voice+SMS+audio+sentiment).
- **Incomplete (n/a):** a domain whose modules carry no `domain_module_tools` yet. This is a band F3 gap (author the modules' tools), surfaced loudly with no fallback, not a coverage deficit.

## Why the rollup looks this way

- **Per-tool, not per-operation_kind.** The tool is the unit of work an agent calls - counting at the kind-level would conflate "needs 5 reads" with "needs 1 read".
- **`operation_kind` is the partition.** Semantius covers `{query, mutate}` today via CRUD + cube. `side_effect` (email, SMS, signature, calendar) and `compute` (AI, text generation, web automation) are external by definition.
- **The unit is the deployable thing, not the skill.** A domain's coverage rolls up its modules' `domain_module_tools`; a value stream rolls up its `process_tools`. The `domain` / `process` skill derives its toolset from these relationships and stores nothing, so the score is computed from the relationships directly.
- **Semantius is NOT a row in `solutions`.** Coverage is intrinsic to `operation_kind`. `tool_solutions` records non-Semantius deliveries only.
