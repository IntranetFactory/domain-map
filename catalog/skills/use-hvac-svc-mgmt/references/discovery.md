# Discovery procedure

Reconciles the HQ-emitted `spec.json` (the uber-model this domain assumes) against what is
actually deployed in this deployment. Discovery is **read-only** against the platform; it never
inserts, updates, or deletes. Its outputs are `discovered.json` (full snapshot + per-concept
resolution) and `state.yaml` (lean deltas).

As of core v0.1.2 the live platform carries **provenance columns**, so discovery is a set of
deterministic reads, not name guessing. `scripts/phase2a-structural.ts` runs the resolution ladder
below for every concept and resolves a fully-stamped deployment with **zero** user prompts. This doc
is (a) the contract phase2a implements and (b) the **Phase 2b** procedure the agent runs for the
genuine ambiguities phase2a could not resolve.

## Empties are never NULL (core v0.1.2)

Every provenance column is NOT NULL with an empty default. Test emptiness against the empty value,
never `IS NULL`:

| Column | Empty value | Empty means |
|---|---|---|
| `catalog_entity_code`, `catalog_field_code`, `catalog_module_code`, `catalog_role_code` | `''` | created outside the deploy pipeline (hand-built / pre-provenance) |
| `canonical_owner_module` | `''` | this module owns it, or the entity is local |
| `pattern_flags` | `'{}'` | no special behavior |
| `catalog_entity_aliases` | `'[]'` | never a merge target |
| `entity_type` | `'unclassified'` | unclassified upstream; derive locally |

---

## Pass 1: domain membership (entity-first)

Domain membership is resolved **entity-first**, not by module code. The deployed module that
hosts the domain may carry any `catalog_module_code` (a "hiring-starter" bundle hosts the ATS
entities under `catalog_module_code = hiring-starter`), so the **domain slice** is the set of
live `module_id`s that host the domain's OWNED entities, resolved from the canonical master
codes (`spec.data_objects[].name`). `catalog_module_code` / `module_slug` are hints only.

```bash
# PRIMARY: entity-first (owned master codes -> the modules that host them).
semantius call crud postgrestRequest '{"method":"GET","path":"/entities?catalog_entity_code=in.(<spec.data_objects[].name>)&select=module_id,catalog_entity_code"}'
# HINT/fallback: module codes + slugs.
semantius call crud postgrestRequest '{"method":"GET","path":"/modules?catalog_module_code=in.(<spec.modules[].code>)&select=id,module_slug,catalog_module_code"}'
```

`phase1-environment.ts` does this and emits the de-duplicated union of `module_id`s as the
**domain slice** (`domain_slice`), which scopes ladder step 2. Keying the entity query on OWNED
masters (not embedded masters / consumers) keeps a foreign module that merely hosts a shared
master out of the slice. An absent spec module is a deployment choice (or a bundled package),
not a failure.

---

## Pass 2: the resolution ladder (per uber-model concept)

For each concept `X` the domain assumes (the union of every module's `masters`,
`embedded_masters`, and `consumers`; each name **is** its canonical code under D6), resolve `X`
against the live deployment in this order. **First hit wins.**

### Step 1 — FK reachability (most robust)

Walk the FK fields on the domain's own entities. For each field with a non-empty `reference_table`,
resolve the target entity's `catalog_entity_code`. Whatever a domain FK points at, carrying
`catalog_entity_code = X`, **is** `X` for this domain. Reseating is universal (silo, same-name
share, and reuse/merge all repoint the FK), so this resolves every topology whenever `X` still has a
consumer in the domain, including a concept owned by another module that this domain only references.

### Step 2 — owned canonical code, scoped to the domain slice

```bash
# entities is keyed by table_name (no name/id column); module_id IN the domain's present modules.
semantius call crud postgrestRequest '{"method":"GET","path":"/entities?catalog_entity_code=eq.<X>&module_id=in.(<domain_module_ids>)&select=table_name,module_id,catalog_entity_code"}'
```

Catches masters the domain owns and the domain's own silos (where `table_name` is an `X`-rename,
e.g. `erp_vendors` carrying `catalog_entity_code = vendors`), including an `X` with no incoming FK.
A hit whose `name` differs from `X` is a deterministic **rename** (record `entity_renames[X] = name`).
Exactly one in-slice hit resolves; more than one is a genuine `multi_owner` ambiguity (Phase 2b).

### Step 3 — alias (reuse/merge onto a differently-named host)

```bash
semantius call crud postgrestRequest '{"method":"GET","path":"/entities?catalog_entity_aliases=cs.[{\"alias_code\":\"<X>\",\"source_domain\":\"<D>\"}]&select=table_name,module_id,catalog_entity_aliases"}'
```

(`cs` is PostgREST JSONB containment, `@>`.) Resolve on the **`(alias_code, source_domain)` pair**,
never `alias_code` alone, so the domain matches only its own merge, not another domain's
identically-named one. This catches the reuse/merge where `X` was renamed onto an existing host and
left no FK shadow. The host's `name` is the live table; record `entity_renames[X] = name`.

### Step 4 — absent (true omission vs external context)

None of the above resolved `X`. Split by whether the domain OWNS `X`:

- **Owned** (`X` is one of the domain's masters): genuinely not deployed here. Record in
  `omitted_entities`; the skill must not generate queries against it.
- **External** (`X` is only an `embedded_master` / `consumer` — a concept another domain
  masters that this deployment did not bring along): record in `external_entities`, not
  `omitted_entities`. It was never this domain's to deploy, so do not report it as an ATS
  omission. The skill still cannot query it here; the distinction is for accurate explanation.

(A `step 0` precedes step 1: any resolution the user already recorded in `state.yaml` from a
prior Phase 2b — `entity_renames`, `omitted_entities`, `custom_entities` — is applied first, so
the bootstrap loop converges. See Phase 2b below.)

> The danger the ladder removes: without step 3 (and with no FK shadow) a reuse/merge looks like
> **absence**, so a live, renamed concept is mis-filed as omitted and every workflow it drives is
> silently dropped. Step 1 mitigates; step 3 makes it deterministic.

---

## Pass 3: fields (per discovered entity)

`phase2a` pulls each entity's fields with the field-level provenance key:

```bash
semantius call crud postgrestRequest '{"method":"GET","path":"/fields?table_name=eq.<live_table>&select=field_name,catalog_field_code,format,is_nullable,default_value,reference_table,enum_values&order=field_order.asc"}'
```

- **Field renames are a join:** `catalog_field_code` holds the canonical/blueprint field name (e.g.
  `status`) even when `field_name` drifted (e.g. `stage`). The lifecycle column is the field whose
  `catalog_field_code` is the spec's lifecycle field; do not guess among `status`/`state`. (A bare
  `''` code is a pre-provenance/custom field — fall back to the name.)
- **FK omissions:** if the spec expects an FK on `X` and no live field carries that
  `catalog_field_code`, record the omission so the skill does not reference it.

Field-by-field reconciliation beyond the lifecycle column and FK shapes is not worth it up front;
trust canonical field names and let a runtime failure become a lesson.

---

## Phase 2b: resolve the genuine ambiguities only

`phase2a` emits an `ambiguities[]` list. A fully-stamped deployment yields none. Each remaining one
is a real judgment call. Default to ASK; a wrong resolution propagates into every later run.

**How the loop terminates (read this).** The cycle is: phase2a emits ambiguities → the agent
asks the user → the agent records the resolutions in `state.yaml` → the agent re-invokes
`bootstrap.ts`. This converges **because `phase2a` reads `state.yaml` back on every run** (step 0
of the ladder) and drops anything already resolved from the `ambiguities[]` it emits. Record
each resolution under the matching flat top-level key so phase2a can consume it:

| Resolution | Record in `state.yaml` as | Effect on next phase2a run |
|---|---|---|
| rename confirmed / multi_owner pick | `entity_renames:` flat map, `concept: live_table` | concept resolves via `state_resolution`; ambiguity gone |
| row confirmed custom | `custom_entities:` flat list of live table names | row recorded as custom; no `custom_entity` ambiguity |
| concept confirmed omitted | `omitted_entities:` flat list of concept names | concept forced absent; no ambiguity |
| user said "skip" | `unresolved_questions:` flat list of concept/live names | downgraded to non-blocking `deferred[]`; surfaced next session |

Keep these keys **flat** (a map of `concept: table`, or a list of bare names). phase2a's
state reader is intentionally minimal and only understands the flat shapes above.

| Ambiguity `kind` | When phase2a emits it | Agent action |
|---|---|---|
| `rename_candidate` | a live row with **empty** `catalog_entity_code` whose name/label matches an otherwise-unresolved concept | ASK: *"`<live_name>` has no catalog lineage but looks like your `<concept>`. Same thing?"* On yes, record the rename in `state.yaml`; on no, treat as custom. |
| `custom_entity` | an **empty-code** row matching no concept | ASK to classify its role (master / log / reference data), or confirm it is custom. Record in `state.custom_entities`. |
| `multi_owner` | more than one in-slice entity shares `catalog_entity_code = X` | ASK which is the one the domain means; record the choice. |

Everything phase2a resolved via steps 1–3 is deterministic and needs **no** prompt. Stamped-but-not-
this-domain rows (a neighbor-domain master reused here, non-empty code matching no concept) are
recorded informationally, not prompted.

If the user says "skip" / "I don't know", record the question in `state.unresolved_questions` and
proceed; surface unresolved questions at the start of the next session.

---

## Pass 4: write `discovered.json` + `state.yaml`, report

`phase2a` writes `discovered.json` (full snapshot, loaded on demand). Per entity it records the
provenance reads:

```json
{
  "discovered_at": "2026-06-12",
  "domain_code": "ATS",
  "slice_module_ids": [0],
  "resolution": {
    "<concept>": { "via": "state_resolution|fk_reachability|owned_code|alias|absent|external_absent", "live_table": "<name>", "renamed": false }
  },
  "entity_renames": { "<canonical_concept>": "<live_table>" },
  "omitted_entities": ["<owned_concept_not_deployed>"],
  "external_entities": ["<concept_owned_by_another_domain>"],
  "custom_entities": [{ "live_name": "<name>", "module_id": 0, "catalog_entity_code": "" }],
  "fetch_errors": [],
  "entities": {
    "<live_table>": {
      "catalog_entity_code": "<canonical>", "canonical_owner_module": "", "entity_type": "operational_record",
      "pattern_flags": { "personal_content": true }, "catalog_entity_aliases": [],
      "module_id": 0, "singular_label": "", "plural_label": "",
      "fields": [{ "name": "", "catalog_field_code": "", "format": "", "reference_table": "", "enum_values": null }],
      "lifecycle_field": "status", "lifecycle_values": ["new", "..."]
    }
  }
}
```

The agent then writes the lean `state.yaml` deltas (module presence, `entity_renames`,
`omitted_entities`, `custom_entities`, `unresolved_questions`, plus any Phase 2b resolutions), and
surfaces a one-screen summary:

```
<domain> discovery complete (deterministic).
  Modules: 3 of 4 deployed (<code> not deployed)
  Concepts: 11 resolved (1 rename: job_applications -> applications via owned_code), 2 omitted
  Custom / empty-code rows: 1 (referral_bonuses -> classify)
  Ambiguities needing you: 0
  Written to: discovered.json + state.yaml
```

---

## When discovery should ASK vs ASSUME

The ladder makes most of this moot: steps 1–3 are deterministic and never ASK. ASK only on the
Phase 2b ambiguities above, all of which arise from **empty** provenance (rows outside the deploy
pipeline) or genuine multi-recurrence. Specifically:

- **`rename_candidate` / `custom_entity` / `multi_owner`**: ASK.
- **Deterministic resolution (steps 1–3)**: ASSUME (it is a platform read, not a guess).
- **Module not deployed**: ASSUME deployment choice, don't ASK.
- **Field omissions**: log to state, don't ASK upfront; let runtime failures drive it.
