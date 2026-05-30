---
name: use-{{DOMAIN_CODE_LOWER}}
description: >-
  Use this skill for any task involving the {{DOMAIN_NAME}} domain ({{DOMAIN_CODE}})
  in this Semantius tenant. Trigger phrases: {{ALIASES_COMMA_LIST}}. Covers
  entity discovery, lifecycle awareness, cross-domain handoffs, APQC process
  context, and tenant-specific renames or omissions. Trigger when the user wants
  to create, read, update, query, or analyze {{DOMAIN_NAME}} data, configure
  related roles or permissions, or build automations against this domain. Loads
  tenant-discovered state automatically; runs a discovery pass on first
  invocation. Pairs with `use-semantius` for CLI mechanics.
---

# use-{{DOMAIN_CODE_LOWER}} skill

This skill knows the **{{DOMAIN_NAME}}** domain as shipped from the catalog at HQ and as discovered in this tenant's deployment. It avoids re-discovering the domain shape on every conversation by persisting tenant-specific findings to local state.

For all Semantius CLI mechanics, PostgREST encoding, and cube DSL, defer to the `use-semantius` skill, which is expected to load alongside.

---

## File layout

| File | Source of truth | Mutated by |
|---|---|---|
| `SKILL.md` | template + publisher substitution | HQ on skill upgrade |
| `{{DOMAIN_CODE_LOWER}}-facts.yaml` | HQ catalog emit | HQ on skill upgrade |
| `state.yaml` | tenant discovery run | this skill |
| `lessons.md` | tenant runtime | this skill (append-only) |
| `references/` | template | HQ on skill upgrade |

The installer preserves `state.yaml` and `lessons.md` across upgrades. Tenants should commit both alongside the skill if their team wants shared discovery and lessons.

---

## On every invocation

Before doing any domain work, the skill follows this sequence:

1. **Read `lessons.md`** in full. These are tenant-observed pitfalls; they save round-trips and prevent repeated mistakes.
2. **Check `state.yaml`.** If present and current, proceed. "Current" means:
   - `state.discovered_against_major == facts_major` (else: full re-discovery, see [references/discovery.md](references/discovery.md))
   - `state.discovered_at >= facts.emitted` (else: incremental reconciliation)
3. **If `state.yaml` is missing or stale,** run the bootstrap checks ([references/bootstrap.md](references/bootstrap.md)) and then the discovery procedure ([references/discovery.md](references/discovery.md)). Both halt with a clear, actionable message on failure (link to install / configure / deploy instructions).
4. **Once state is current,** answer the user's request using the discovered entity names, relationships, and lifecycle from `state.yaml`. Never assume catalog names hold; the tenant may have renamed `suppliers` to `vendors`, dropped `cost_centers`, or split a master into two entities.

To force a fresh discovery: delete `state.yaml`. The next invocation will re-run discovery from scratch.

---

## What's in `{{DOMAIN_CODE_LOWER}}-facts.yaml`

The HQ-emitted shape of this domain as of `emitted: <date>`. Includes:

- Domain metadata (description, buyer size, cost band, market size)
- Functional ownership (owner / contributor / consumer business functions)
- Capabilities and the modules that realize them
- Modules with their masters, embedded-masters, consumers
- Per-master pattern flags, aliases, lifecycle states
- Intra-domain relationships and edges to platform built-ins
- Outbound cross-domain handoffs (trigger events, payloads, targets, friction, APQC process tags)
- Domain-level APQC process rollup (`apqc_processes_touched`) for cross-domain process queries
- System skills and tool sets per module
- Expected role personas with their module footprints
- Catalog enum vocabularies for any column the skill might write

**Treat the facts file as the read-only "as-designed" shape.** What this tenant actually deployed lives in `state.yaml`.

---

## What's in `state.yaml`

Written by the skill during discovery. Records the deployment-specific reality:

```yaml
discovered_at: 2026-05-30
discovered_against_major: 1
discovered_against_emitted: 2026-05-30

deployment:
  module_slug: <slug from /modules>
  module_id: <id>
  tenant_org: <from getCurrentUser>

modules:                          # which facts-listed modules are live
  ATS-CANDIDATE-CRM: { present: true,  entity_renames: {} }
  ATS-REQUISITION-PIPELINE: { present: true, entity_renames: { application_notes: candidate_notes } }
  ATS-INTERVIEW-MGMT: { present: false, reason: "not deployed in this tenant" }
  ATS-OFFERS: { present: true, entity_renames: {} }

entity_renames:                   # global renames the tenant applied
  job_applications: applications  # tenant prefers the bare-word form
  recruitment_sources: sources

omitted_entities:                 # facts-listed entities the tenant chose not to deploy
  - cost_centers                  # tenant has no finance integration
  - background_checks             # handled in a separate vendor system

custom_entities: []               # tenant-added entities not in facts

field_renames: {}                 # within an entity (rare)
field_omissions: {}

unresolved_questions: []          # things the skill asked the user about during discovery
                                  # populated when the user says "skip for now"
```

---

## What's in `lessons.md`

Append-only file. The skill writes a one-line entry every time it observes a non-obvious pitfall during a run. Format and examples: [references/lessons-format.md](references/lessons-format.md).

Lessons are local to this tenant by default. If a lesson is genuinely universal ("Semantius rejects `=` for nested filters, must use `eq.`"), the tenant can choose to upstream it via the catalog's contribution channel; the skill does not auto-publish.

---

## Hard rules inherited from the catalog

These hold across every Semantius write the skill performs, regardless of what the user asks:

- **`record_status` on agent-authored rows is `new`.** Never stamp `approved` without explicit per-load user confirmation. The default on every `record_status` column is already `"new"`; omitting the field is cleanest.
- **No em-dashes** in any prose written to the catalog or to local files.
- **American English** in every emitted artifact.
- **Use the `semantius` CLI exclusively.** Never call MCP-exposed Semantius tools; they authenticate against the wrong scope and will fail or hit the wrong tenant.
- **`semantius` reads `.env` from cwd.** Invoke from the project root; never `cd` into a subfolder before calling it.
- **JWT-audience errors halt the run.** Surface the verbatim error and wait for user direction.

Full versions of these rules with rationale live in the catalog's [domain-map-analyst SKILL.md](https://github.com/<...>/domain-map/blob/main/.claude/skills/domain-map-analyst/SKILL.md).

---

## Quick reference

UI base: `https://<tenant>.semantius.app/{{MODULE_SLUG}}/<table>`

Facts file: [`{{DOMAIN_CODE_LOWER}}-facts.yaml`](./{{DOMAIN_CODE_LOWER}}-facts.yaml)

State file: `./state.yaml` (created on first discovery)

Lessons file: `./lessons.md` (created on first lesson)

Procedure references:
- [Bootstrap checks](references/bootstrap.md)
- [Discovery procedure](references/discovery.md)
- [Lessons format](references/lessons-format.md)
