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

### Phase 4: `handoffs`

`(source_domain_id, target_domain_id, data_object_id, trigger_event, integration_pattern, friction_level, description, notes: "")`. Idempotent against the `(source, target, data_object, trigger_event)` 4-tuple. Intra-domain rows (`source_domain_id == target_domain_id`) are now first-class catalog rows; pick `integration_pattern: lifecycle_progression` for in-process state-transition handoffs where no message moves, otherwise pick from the existing five values per the friction the integration involves.

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

The 4-tuple `(source, target, data_object, trigger_event)` is the natural key for `handoffs`. Don't try to dedupe by `(source, target, data_object)` only, the same source/target/object can have multiple legitimate trigger events.

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

### Starter module pre-flight

Any loader that inserts a `domain_modules` row with `module_kind='starter'` MUST run two pre-flight validators before any POST. Both throw on violation; both exist alongside the platform-side `starter_no_master` validation_rule on `domain_module_data_objects` as a redundant author-time guard so the failure surfaces in the loader log instead of as a remote PostgREST error mid-batch.

```typescript
type ModuleSpec = {
  domain_module_code: string;
  domain_id: number | null;
  module_kind: "full" | "starter";
  lifecycle_states?: unknown[];
  permissions?: { tier: string }[];
  system_skills?: unknown[];
};

function validateStarterModule(m: ModuleSpec): void {
  if (m.module_kind !== "starter") return;
  if ((m.lifecycle_states ?? []).length > 0) {
    throw new Error(
      `Starter ${m.domain_module_code}: lifecycle_states not allowed. ` +
        `Inherit from canonical master; emitter renders inherited states.`,
    );
  }
  const perms = m.permissions ?? [];
  const baseline = perms.filter(p => p.tier?.startsWith("baseline-"));
  const gates = perms.filter(p => p.tier === "workflow-gate");
  if (gates.length > 0) {
    throw new Error(
      `Starter ${m.domain_module_code}: workflow-gate permissions not allowed ` +
        `(found ${gates.length}). Starter ships exactly three baseline tiers.`,
    );
  }
  if (baseline.length !== 3) {
    throw new Error(
      `Starter ${m.domain_module_code}: must ship exactly 3 baseline permissions ` +
        `(read/manage/admin), found ${baseline.length}.`,
    );
  }
  const systemSkills = (m.system_skills ?? []).length;
  if (systemSkills !== 1) {
    throw new Error(
      `Starter ${m.domain_module_code}: must ship exactly 1 system skill ` +
        `(Rule #17), found ${systemSkills}.`,
    );
  }
}

type JunctionSpec = {
  domain_module_code: string;
  data_object_name: string;
  role: "master" | "embedded_master" | "consumer" | "contributor" | "derived";
};

async function validateStarterDataObjectJunction(
  j: JunctionSpec,
  parentKind: "full" | "starter",
): Promise<void> {
  if (parentKind !== "starter") return;
  if (j.role === "master" || j.role === "derived" || j.role === "contributor") {
    throw new Error(
      `Starter ${j.domain_module_code} junction on ${j.data_object_name}: ` +
        `role '${j.role}' forbidden. Allowed shapes: ` +
        `embedded_master on a domain-owned data_object, or consumer on a platform_builtin data_object.`,
    );
  }
  const [dobj] = await get(
    `/data_objects?data_object_name=eq.${encodeURIComponent(j.data_object_name)}` +
      `&select=id,kind`,
  );
  if (!dobj) throw new Error(`Unknown data_object ${j.data_object_name}`);
  if (j.role === "consumer") {
    if (dobj.kind !== "platform_builtin") {
      throw new Error(
        `Starter ${j.domain_module_code} consumer on ${j.data_object_name}: ` +
          `consumer is allowed only on platform_builtin data_objects (today only 'users'). ` +
          `For a domain-owned data_object the starter needs, use embedded_master.`,
      );
    }
    return;
  }
  // j.role === "embedded_master"
  if (dobj.kind === "platform_builtin") return;
  const masters = await get(
    `/domain_module_data_objects?data_object_id=eq.${dobj.id}` +
      `&role=eq.master&select=id&limit=1`,
  );
  if (masters.length === 0) {
    throw new Error(
      `Starter ${j.domain_module_code} embedded_master on ${j.data_object_name}: ` +
        `no canonical master row exists in any full module. Load the master first.`,
    );
  }
}
```

Call both up front, before any insert:

```typescript
for (const m of starterModules) validateStarterModule(m);
for (const j of starterJunctions) {
  const parent = starterModules.find(m => m.domain_module_code === j.domain_module_code);
  await validateStarterDataObjectJunction(j, parent?.module_kind ?? "full");
}
```

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

Pick one: `event_stream` / `api_call` / `batch_sync` / `manual_handoff` / `file_drop` / `lifecycle_progression`. Default `api_call` when unknown. `lifecycle_progression` covers in-process state-transition handoffs where the consumer reads producer state directly, no message moves; typical for intra-domain cross-module rows.

### `friction_level`

- `low` for native event streams within a shared platform or same-vendor stack
- `medium` for stable but bespoke integrations
- `high` when the handoff regularly breaks, requires custom maintenance, has measurable error rate, or matches one of the five canonical high-friction shapes (see SKILL.md Phase 3)

## UI link pattern

After every load, print three UI links at minimum:

```
https://tests.semantius.app/domain_map/data_objects
https://tests.semantius.app/domain_map/domain_data_objects
https://tests.semantius.app/domain_map/handoffs
```

Module slug is `domain_map` (lowercase), not `Domain Map`. Common slip — see SKILL.md hard rule #7.

For the standout multi-master row of the load, also link the filtered view:

```
https://tests.semantius.app/domain_map/domain_data_objects?data_object_id=eq.<id>
```

This gives reviewers one-click access to the row that matters most.
