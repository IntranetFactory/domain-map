# Loader idiom

The 4-phase TypeScript loader pattern used for every data-object + multi-master + handoff load. Eight production loaders follow this shape; start from one of them rather than reinventing.

## Reference loaders

| Loader | Cluster | Notable feature |
|---|---|---|
| [.tmp_deploy/load_ats_data_objects.ts](../../../../.tmp_deploy/load_ats_data_objects.ts) | ATS | First clean run; minimal scaffold |
| [.tmp_deploy/load_onboarding.ts](../../../../.tmp_deploy/load_onboarding.ts) | Onboarding | First combined phase 1+2+3 in one file (domain + vendors + solutions + data_objects + handoffs) |
| [.tmp_deploy/load_swp.ts](../../../../.tmp_deploy/load_swp.ts) | SWP | First multi-master row added (`job_requisitions`); refines an existing junction's notes |
| [.tmp_deploy/load_hcm_epm_pa.ts](../../../../.tmp_deploy/load_hcm_epm_pa.ts) | HCM + EPM + PA | Three-domain combined load; signal-row volume increased |
| [.tmp_deploy/load_itsm_itam_saas_clm_s2p.ts](../../../../.tmp_deploy/load_itsm_itam_saas_clm_s2p.ts) | ITSM + ITAM/HAM/SAM + SMP + CLM + S2P | Largest single load; demonstrates master-at-sub-domain reshape |
| [.tmp_deploy/load_itops_backbone.ts](../../../../.tmp_deploy/load_itops_backbone.ts) | CMDB + DISCOVERY + ITOM + OBS + AIOPS | Adds the total-degree leaderboard to the summary |
| [.tmp_deploy/load_customer_cluster.ts](../../../../.tmp_deploy/load_customer_cluster.ts) | CRM + CSM + SUB-MGMT | Customer flagship — the 4-master `customers` row |
| [.tmp_deploy/load_crm_subdomains.ts](../../../../.tmp_deploy/load_crm_subdomains.ts) | CDP + MA + SALES-ENG | Sub-domain cluster under an already-loaded umbrella |

For one-off small loads, `.tmp_deploy/load_research.ts` is the simpler template.

## The 4 phases

Every loader follows the same order; each phase reads existing state before writing so re-running is free.

### Phase 1 — `data_objects`

Define each row with `data_object_name` (snake_case_plural natural key), `display_label`, `description`, and a script-internal `master_domain` field that names the target master domain. Use `syncByKey` against `/data_objects` keyed on `data_object_name`.

### Phase 2 — master links into `domain_data_objects`

For each row in Phase 1, insert a `(domain_id, data_object_id, role: "master", notes: "")` row keyed on the `master_domain` from Phase 1. Skip rows that already exist (idempotent against `(domain_id, data_object_id)`).

### Phase 3 — multi-master / contributor / consumer rows

A separate list of `(data_object, domain, role, notes)` tuples for the Signal-1 rows. Each row needs a *populated* `notes` field explaining the slice — empty `notes` on a multi-master row defeats the purpose (the catalog records WHAT each domain masters, not just THAT it masters).

Roles: `master` / `contributor` / `consumer` / `derived`. Use `master` only for true co-mastership; default to `contributor` when in doubt.

### Phase 4 — `cross_domain_handoffs`

`(source_domain_id, target_domain_id, data_object_id, trigger_event, integration_pattern, friction_level, description, notes: "")`. Idempotent against the `(source, target, data_object, trigger_event)` 4-tuple. The validation rule `cross_domain_only` rejects rows where source == target.

## Standard tail: leaderboard summary

Every loader closes with three leaderboards printed to stdout. This is the artifact the user sees:

1. **Multi-master leaderboard** — `data_objects` with `count(role='master') > 1`, sorted by master count
2. **Total-degree leaderboard** — `data_objects` with the most `domain_data_objects` rows (masters + contributors + consumers combined). Often the most analytically interesting view
3. **Handoff-hotspot leaderboard** — domains by total handoff degree (source + target combined)

Plus three UI links (the affected tables) and a transient-timeout recovery hint: "re-run the script to print the summary if it timed out mid-leaderboard".

## Code patterns that save pain

### Strip `master_domain` before POST

The script-internal `master_domain` is **not** a column on `data_objects`. PostgREST rejects with `PGRST204` if it's included in the body. Always:

```typescript
const insertableObjects = allObjects.map(({ master_domain, ...rest }) => rest);
const dataObjMap = await syncByKey("/data_objects", insertableObjects, "data_object_name");
```

This was bumped into twice before being codified. Don't skip the strip step.

### Pre-load existing data_object ids

When signal rows or handoffs reference data_objects loaded by a prior batch (`contracts` from CLM, `knowledge_articles` from ITSM, `customers` from CRM), fetch their ids and merge into `dataObjMap` after the syncByKey:

```typescript
const refObjects = await get(
  "/data_objects?data_object_name=in.(contracts,knowledge_articles)&select=id,data_object_name",
);
for (const r of refObjects) dataObjMap.set(String(r.data_object_name), Number(r.id));
```

Otherwise `dataObjMap.get("contracts")` returns undefined and `doid()` throws.

### Idempotent handoff key

```typescript
const handoffKey = (r: Row) =>
  `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event}`;
```

The 4-tuple `(source, target, data_object, trigger_event)` is the natural key for `cross_domain_handoffs`. Don't try to dedupe by `(source, target, data_object)` only — the same source/target/object can have multiple legitimate trigger events.

### Use stdin or chunk inserts

Windows command-line length limits hit ~32KB. The loader pattern uses `Bun.spawn` with `stdin: "pipe"` for every call, and chunks any insert to ≤50 rows. Both are in the helper `insertChunked` — don't reinvent.

### Uniformize keys before bulk POST

PostgREST requires every object in a bulk-insert array to have the **same set of keys**. Heterogeneous arrays are rejected with the misleading error `PGRST102 Empty or invalid json` — not a "keys mismatch" message — which sends you chasing transport / encoding red herrings.

This bites whenever a row has an optional FK or qualifier set on some rows but not others. The canonical case is `domains.parent_domain_id` (set on sub-domain rows, omitted on top-level rows), but the same pattern hits `solutions.notes`, `vendors.notes`, `solution_domains.notes`, and any other "fill when known" column.

Fix: normalize the batch to the union of keys, filling missing slots with `null`, **inside the `insert` helper** so caller specs can stay sparse:

```typescript
function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}
```

Discovered during the INTRANET / COLLAB-GOV / WEB-CONTOPS load: only `COLLAB-GOV` had `parent_domain_id` (parent = ECM), the other two were top-level. Single-row sends worked; pairs containing the parented row failed. Add this helper to any new loader template — older loaders that didn't trip on it just happened to have uniform-shape rows.

### Recovery from transient timeouts

The MCP transport occasionally times out on the closing summary queries (large `domain_data_objects` reads). Phases 1-4 already wrote successfully; just re-run the script. Idempotency means the inserts are skipped and the summary prints. Don't treat a timeout-on-summary as a load failure.

## Naming conventions to enforce

These have been consistent across 80+ handoffs and 120+ data_objects. Don't drift.

### `data_object_name`

- snake_case, plural, English nouns
- Matches what you'd name a Semantius entity for the same concept
- Disambiguate buyer-side vs seller-side: `saas_subscriptions` ≠ `customer_subscriptions`, `invoices` ≠ `customer_invoices`

### `trigger_event` on handoffs

- Dotted-lowercase noun.verb: `offer.accepted`, `incident.resolved`, `requisition.approved`, `cost_projection.approved`, `case.churn_risk_detected`
- Past tense or past-participle preferred (the event *has happened*, the handoff *reacts to it*)
- Multi-word nouns use underscore: `cost_projection.approved` not `costProjection.approved`

### `integration_pattern`

Pick one: `event_stream` / `api_call` / `batch_sync` / `manual_handoff` / `file_drop`. Default `api_call` when unknown.

### `friction_level`

- `low` for native event streams within a shared platform or same-vendor stack
- `medium` for stable but bespoke integrations
- `high` when the handoff regularly breaks, requires custom maintenance, has measurable error rate, or matches one of the five canonical high-friction shapes (see SKILL.md Phase 3)

## UI link pattern

After every load, print three UI links at minimum:

```
https://tests.semantius.app/domain_map/data_objects
https://tests.semantius.app/domain_map/domain_data_objects
https://tests.semantius.app/domain_map/cross_domain_handoffs
```

Module slug is `domain_map` (lowercase), not `Domain Map`. Common slip — see SKILL.md hard rule #7.

For the standout multi-master row of the load, also link the filtered view:

```
https://tests.semantius.app/domain_map/domain_data_objects?data_object_id=eq.<id>
```

This gives reviewers one-click access to the row that matters most.
