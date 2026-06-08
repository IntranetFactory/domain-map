# Discovery procedure

Reconciles the HQ-emitted spec.json against what's actually deployed in this tenant. Runs in two modes:

- **Full discovery** (cold start, or `state.discovered_against_major < spec.facts_major`): every entity in the spec.json is verified against the live deployment.
- **Incremental reconciliation** (`state.discovered_at < spec.emitted`, same major): diff spec against existing state; only verify what changed.

Both modes share the same per-entity check; full discovery is just the incremental case with an empty starting state.

Discovery is read-only against the tenant. It never inserts, updates, or deletes catalog data. Its output is `state.yaml`.

---

## Pass 1: module presence

For each module listed in `spec.modules`:

```bash
semantius call crud postgrestRequest '{"method":"GET","path":"/modules?module_slug=eq.<module_slug>&select=id,module_slug,module_name"}'
```

The module slug derives from the module code (lowercase, dashes -> underscores: `ATS-CANDIDATE-CRM` -> `ats_candidate_crm`).

Record in `state.modules`:
- `present: true` with the live `module_id` and `module_name`, OR
- `present: false` with `reason: "not deployed in this tenant"`

A module being absent is not a failure; it's tenant choice. Note it in state and skip its entities in subsequent passes.

---

## Pass 2: entity (data_object) discovery

For each `data_objects` entry in the spec.json whose owning module is `present: true`, search the tenant's `entities` table by candidate names. The search order matters: catalog name first, then known aliases, then a fuzzy fallback if neither matches.

```bash
# Step 2a: exact match on the catalog name
semantius call crud postgrestRequest '{"method":"GET","path":"/entities?module_id=eq.<id>&name=eq.<facts_name>&select=id,name,singular_label,plural_label"}'

# Step 2b: if zero rows, try each alias from the spec.json
semantius call crud postgrestRequest '{"method":"GET","path":"/entities?module_id=eq.<id>&name=in.(<alias_names>)&select=id,name,singular_label,plural_label"}'

# Step 2c: if still zero rows, fuzzy search on singular_label / plural_label
semantius call crud postgrestRequest '{"method":"GET","path":"/entities?module_id=eq.<id>&or=(singular_label.ilike.<facts_singular>,plural_label.ilike.<facts_plural>)&select=id,name,singular_label,plural_label"}'
```

Four outcomes per entity:

1. **Exact match** (2a hit): record in `state.modules.<module>.entities.<facts_name> = { live_name: <facts_name>, entity_id: <id> }`. No rename.
2. **Alias match** (2b hit): record the rename — `state.entity_renames[<facts_name>] = <live_name>` — and proceed.
3. **Fuzzy match** (2c hit): **ASK THE USER.** Surface the candidate match with the spec description side-by-side, substituting the configured domain name at runtime: *"The spec lists `suppliers` for the `<spec.domain.name>` domain. I found an entity called `vendors` with description matching closely. Treat them as the same?"* On yes, record as a rename. On no, treat as omitted plus a custom entity (Pass 4).
4. **No match** (2c miss): record in `state.omitted_entities`. Ask the user once whether this is intentional; record their answer in `state.unresolved_questions` if they defer.

Never auto-rename without user confirmation. False positives here corrupt every subsequent skill run.

---

## Pass 3: field discovery per discovered entity

For each entity discovered in Pass 2, pull its fields:

```bash
semantius call crud postgrestRequest '{"method":"GET","path":"/fields?entity_id=eq.<id>&select=name,data_type,is_required,reference_table&order=field_order.asc"}'
```

Compare against `spec.data_objects.<name>.lifecycle_states` (which implies a `status` or `state` field exists). The skill cares about field-level shape mainly for:

- Lifecycle fields the spec.json implies (`status`, `state`, or whatever the tenant named it). If absent, record in `state.field_omissions` and note the lifecycle states can't be tracked.
- FK fields to other facts-listed entities. If the tenant dropped a FK (e.g. removed the `cost_center_id` link on `job_requisitions`), record the omission so the skill doesn't generate queries referencing it.

Field-by-field rename discovery is expensive and usually not worth it. Default behavior: trust catalog field names. Add a per-field reconciliation only if a later runtime call fails because of a missing field (the failure becomes a lesson, see [lessons-format.md](lessons-format.md)).

---

## Pass 4: custom entities the tenant added

After Pass 2, query the module for any entities NOT in the facts list:

```bash
semantius call crud postgrestRequest '{"method":"GET","path":"/entities?module_id=eq.<id>&name=not.in.(<all_facts_names>)&select=id,name,singular_label,plural_label,description"}'
```

Record in `state.custom_entities`. Ask the user for each, substituting the configured domain name at runtime: *"I found a custom entity `<name>` in your `<spec.domain.name>` module that the spec doesn't know about. Should I include it when reasoning about this domain? You can describe its role (master, log, reference data)."* Record the answer in `state.custom_entities.<name>`.

---

## Pass 5: relationship and handoff sanity

The spec.json lists intra-domain relationships and outbound handoffs. The skill does not verify each one structurally during discovery; that's the catalog's job at emit time. The skill only flags relationships whose endpoints are missing from this tenant:

- If a relationship references an omitted entity, suppress it from the live model.
- If an outbound handoff's source module is absent, suppress the handoff.

Record suppressions in `state.suppressed_relationships` and `state.suppressed_handoffs`.

---

## Pass 6: write `state.yaml`, write `discovered.json`, report

Write BOTH files. They serve different load patterns and shouldn't be combined.

**`state.yaml`** — lean deltas and summary, loaded on every invocation. Structure shown in the parent [SKILL.md](../SKILL.md#whats-in-stateyaml): module presence flags, entity renames, omitted entities, custom entities, field renames, unresolved questions.

**`discovered.json`** — full discovered schema, loaded on demand when field-level detail is needed. Structure:

```json
{
  "discovered_at": "2026-05-30",
  "discovered_against_major": 1,
  "discovered_against_emitted": "2026-05-30",
  "entities": {
    "<live_entity_name>": {
      "spec_name": "<spec.json entity name, may differ if renamed>",
      "entity_id": 123,
      "module_id": 45,
      "singular_label": "<live label>",
      "plural_label": "<live label>",
      "fields": [
        {
          "name": "<live field name>",
          "format": "string|int|enum|...",
          "is_nullable": true,
          "default_value": "",
          "reference_table": "",
          "enum_values": []
        }
      ],
      "relationships_out": [
        { "to_entity": "<name>", "via_field": "<fk_field>", "cardinality": "one_to_many" }
      ],
      "lifecycle_field": "status",
      "lifecycle_values": ["new", "active", "..."]
    }
  }
}
```

Discovered schema is what makes "what fields does X have?" cheap on subsequent runs — no live re-query needed.

Then surface a one-screen summary to the user:

```
<spec.domain.name> discovery complete.
  Modules: 3 of 4 deployed (<module-code> not deployed)
  Entities: 11 found, 1 renamed (job_applications -> applications), 2 omitted (cost_centers, background_checks)
  Custom entities: 1 (referral_bonuses, classified as: master)
  Unresolved questions: 0
  State written to: state.yaml + discovered.json
```

If there are unresolved questions, surface them as a numbered list and ask whether the user wants to resolve them now or defer.

---

## Incremental reconciliation

When `state.discovered_against_major == spec.facts_major` but `state.discovered_at < spec.emitted`:

1. Diff `facts` against `state` to produce a change list:
   - New modules in facts not in state -> run Pass 1 for them, then Pass 2-3 if present
   - New entities in facts (in modules already discovered) -> run Pass 2-3 for them
   - Removed entities in facts (still in state) -> mark state.modules.<module>.entities.<name> as `removed_by_catalog: true`, ask user whether to keep their custom-usage notes
   - Changed lifecycle states / pattern flags / aliases -> update state record, no live re-discovery needed

2. Skip every entity the diff didn't touch. The point of incremental is to NOT pay the full-discovery cost.

3. Update `state.discovered_at` to the current date and `state.discovered_against_emitted` to `spec.emitted`.

---

## When discovery should ASK vs. ASSUME

Default to ASK on ambiguity. The cost of one user question is low; the cost of a wrong rename baked into `state.yaml` propagates into every subsequent skill run until the user notices.

Specifically:
- **Fuzzy entity match** (Pass 2c): always ASK
- **Custom entity found** (Pass 4): always ASK (to classify its role)
- **Field omissions detected**: log to state, don't ASK upfront — let runtime failures drive it
- **Module not deployed**: ASSUME tenant choice, don't ASK
- **Exact-match entity**: ASSUME, don't ASK
- **Alias match**: ASSUME (alias was authored at HQ, it's a known synonym), don't ASK

If the user says "skip" or "I don't know" to any question, record it in `state.unresolved_questions` and proceed. The skill surfaces unresolved questions at the start of the next session.
