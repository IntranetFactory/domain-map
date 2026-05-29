# Semantius coverage rollup — system skills

The saved query that certifies "% Semantius OOTB" per system skill. Re-runnable any time the catalog changes.

Implementation: [scripts/analytics/coverage_rollup.ts](../../../../scripts/analytics/coverage_rollup.ts). Run from project root (the `semantius` CLI reads `.env` from cwd — see [CLAUDE.md](../../../../CLAUDE.md)).

```sh
# Full rollup, sorted by skill_name
bun run scripts/analytics/coverage_rollup.ts

# Only skills <100%, with the specific tools dragging them down
bun run scripts/analytics/coverage_rollup.ts --diagnostic

# Machine-readable CSV (skill_name,domain_code,pct,covered,required)
bun run scripts/analytics/coverage_rollup.ts --csv

# Single skill
bun run scripts/analytics/coverage_rollup.ts --skill crm-system
```

## The formula

For each `skills` row with `skill_type = 'system'`:

```
% = count(required tools whose operation_kind ∈ SEMANTIUS_COVERED)
    / count(required tools)
```

`required` means `skill_tools.requirement_level = 'required'`. `optional` and `fallback` rows are ignored — they don't drag the score down. **Per-tool aggregation, not per-operation_kind**: a skill needing 5 `query` tools + 1 `send_email` tool sits at **5/6 = 83%**, not 50%. The tool is the unit of count; `operation_kind` classifies tools.

## The Semantius-covered set

**Source of truth: hardcoded in [coverage_rollup.ts](../../../../scripts/analytics/coverage_rollup.ts) at the constant `SEMANTIUS_COVERED`.** Today:

```
SEMANTIUS_COVERED = { "query", "mutate" }
```

The cheapest representation while the Semantius-covered set churns. If a customer-coverage rollup later needs to read the set dynamically, promote to a config table (`semantius_native_operation_kinds`) or to a column on a future `operation_kinds` lookup entity. Until then: edit the constant when Semantius gains a new generic primitive.

**Update procedure when the set changes:** When Semantius gains a new generic primitive (e.g. native email send → new `operation_kind` value `notify_email`), edit the constant in [coverage_rollup.ts](../../../../scripts/analytics/coverage_rollup.ts) and re-run. No DDL needed.

## Per-skill diagnostic output

For skills <100%, the script lists the offending tools inline. Example:

```
⬇  86%  pa-system                        12/14   ↳ NOT covered: generate_text(compute), send_email(side_effect)
⬇  60%  ccaas-system                     6/10   ↳ NOT covered: make_phone_call(side_effect), send_sms(side_effect), transcribe_audio(compute), detect_sentiment(compute)
```

The set in parentheses is `operation_kind`. `side_effect` and `compute` are the two non-Semantius kinds today.

## Equivalent SQL (for psql or any DB tool)

```sql
-- Full rollup
with required as (
  select s.skill_name, s.domain_id, t.tool_name, t.operation_kind,
         case when t.operation_kind in ('query', 'mutate') then 1 else 0 end as covered
  from skills s
  join skill_tools st on st.skill_id = s.id
  join tools t        on t.id = st.tool_id
  where s.skill_type = 'system'
    and st.requirement_level = 'required'
)
select skill_name,
       sum(covered)::int       as covered_count,
       count(*)::int           as required_count,
       round(100.0 * sum(covered) / count(*))::int as pct
from required
group by skill_name
order by skill_name;

-- Diagnostic: which specific tools drag each <100% skill down
with required as (
  select s.skill_name, t.tool_name, t.operation_kind,
         case when t.operation_kind in ('query', 'mutate') then 1 else 0 end as covered
  from skills s
  join skill_tools st on st.skill_id = s.id
  join tools t        on t.id = st.tool_id
  where s.skill_type = 'system'
    and st.requirement_level = 'required'
),
pct as (
  select skill_name, round(100.0 * sum(covered) / count(*))::int as pct
  from required group by skill_name
)
select r.skill_name, r.tool_name, r.operation_kind
from required r
join pct on pct.skill_name = r.skill_name
where pct.pct < 100
  and r.operation_kind not in ('query', 'mutate')
order by r.skill_name, r.tool_name;
```

## Interpreting results

- **100% pure-Semantius cluster:** platform/infra/security/content/pure-CRUD domains (APIM, IPAAS, KUBE-PLAT, DCIM, NPMD, UEM, VSDP, ITAM/HAM/SAM, IGA, BPA, PSA, WORK-MGMT, etc). Master count varies, but with no required externals every tool is `query` or `mutate`.
- **+email cluster (~80-92%):** operational domains where notifications are a workflow requirement (CRM, CSM, HRSD, ERP-FIN, OMS, etc).
- **+email +sign cluster (~67-86%):** talent/contract/real-estate/supplier domains where document signing is integral.
- **+email +chat cluster (~67-80%):** IT-ops/ChatOps domains (AIOPS, ITOM, OBS, RMM, MSP-PSA, WSC).
- **Specialty low scores:** CONV-AI (40%, three compute externals), CCAAS (60%, voice+SMS+audio+sentiment), FSM (50%, +email+SMS with only 2 masters).
- **Master-count distortion:** Small-master domains (2-4 masters) in any +external category drop sharply because the denominator is small. Not a coverage deficit — a measurement artifact. Flag to the user when scoring decisions hinge on a thin-master domain.

## Acceptance criterion

≥5 system skills at 100% Semantius-covered. Current state: **54/122**. Re-verify by running the rollup.

## Why the rollup looks this way

- **Per-tool, not per-operation_kind.** The tool is the unit of work an agent calls — counting at the kind-level would conflate "needs 5 reads" with "needs 1 read" into the same denominator.
- **`operation_kind` is the partition.** Semantius covers `{query, mutate}` today via CRUD + cube. `side_effect` (email, SMS, signature, calendar) and `compute` (AI, text generation, web automation) are external by definition. Coverage evolves with the platform — new generic primitives get new `operation_kind` values (or split existing ones) and the constant is updated.
- **Semantius is NOT a row in `solutions`.** Coverage is intrinsic to `operation_kind`. There are no pseudo-tools (`semantius_crud`, etc.) and no `solution_kind='semantius_native'`. `tool_solutions` records non-Semantius deliveries only.

## Related references

- [scripts/loaders/load_p25a_i.ts](../../../../scripts/loaders/load_p25a_i.ts), [load_p25a_ii.ts](../../../../scripts/loaders/load_p25a_ii.ts), [load_p25a_iii.ts](../../../../scripts/loaders/load_p25a_iii.ts) — the three loaders that populated the system-skill matrix this rollup measures.
