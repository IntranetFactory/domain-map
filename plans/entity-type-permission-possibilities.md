# Impact of `entity_type` on permission derivation

Before `entity_type`, every mutable `data_object` got the same write tier: `:manage`. There was no signal to distinguish operational data from reference data, so permissions could not say "you may run the workflow but not reconfigure the catalog."

`entity_type` makes the write tier a function of the entity's nature, derived (not authored, not stored as a name):

| `entity_type` | read | mutate (create / update / delete) |
|---|---|---|
| `operational_workflow` | `:read` | `:manage` + workflow gates on `requires_permission` transitions |
| `operational_record` | `:read` | `:manage` |
| `catalog` | `:read` | `:admin` |
| `junction` | `:read` | `:admin` if an endpoint is `catalog`, else `:manage` |
| `computed` | `:read` | none (no write permission) |

This needs no new permissions: `:manage` and `:admin` already exist per module, so `entity_type` only selects which existing baseline tier governs an entity's writes. The name is still resolved at deploy time from the realizing module's code, never stored on `data_objects`.
