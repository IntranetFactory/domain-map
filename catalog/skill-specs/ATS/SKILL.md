---
name: use-ats
description: >-
  Use this skill for any task involving the Applicant Tracking System domain (ATS)
  in this Semantius tenant. Trigger phrases: recruiting, hiring, talent acquisition,
  applicant tracking, candidate management, hiring pipeline, ATS.
  Entities covered: Candidates, Job Applications, Job Offers, Candidate Referrals,
  Recruitment Sources, Job Requisitions, Job Postings, Application Notes,
  Interviews, Interview Scorecards, Background Checks.
  Workflows covered: Requisition Management, Candidate Sourcing, Interview Scoring,
  Offer Management.
  Adjacent skills (use them instead for their own scope): use-onboarding, use-hcm, use-bgc.
  Covers entity discovery, lifecycle awareness, cross-domain handoffs, APQC
  process context, and tenant-specific renames or omissions. Loads tenant-discovered
  state automatically; runs a discovery pass on first invocation. Pairs with
  `use-semantius` for CLI mechanics.
---

# use-ats skill

This skill knows the **Applicant Tracking System** domain as shipped from the catalog at HQ and as discovered in this tenant's deployment. It avoids re-discovering the domain shape on every conversation by persisting tenant-specific findings to local state.

For all Semantius CLI mechanics, PostgREST encoding, and cube DSL, defer to the `use-semantius` skill, which is expected to load alongside.

---

## File layout

| File | Source of truth | Mutated by |
|---|---|---|
| `SKILL.md` | rendered from template + spec at HQ | HQ on skill upgrade |
| `spec.json` | HQ catalog emit (structured per-domain data) | HQ on skill upgrade |
| `state.yaml` | tenant discovery run | this skill |
| `discovered.json` | tenant discovery run (full discovered schema) | this skill |
| `lessons.md` | tenant runtime | this skill (append-only) |
| `improvements.md` | tenant runtime | this skill (append-only) |
| `references/` | generic, no per-domain content | HQ on skill upgrade |

The skill **learns** locally through three append-only files: `state.yaml` (deltas vs. spec), `lessons.md` (tactical pitfalls), and `improvements.md` (procedural meta-patterns). All three are read on every invocation and applied to subsequent operations. `SKILL.md` itself stays untouched — the procedure manual is stable; the learning layer grows around it.

The installer preserves `state.yaml` and `lessons.md` across upgrades. Tenants should commit both alongside the skill if their team wants shared discovery and lessons.

---

## On every invocation

Before doing any domain work, the skill follows this sequence:

1. **Read `lessons.md` and `improvements.md`** in full. Lessons are tactical pitfalls (one specific call that failed; the corrected form). Improvements are procedural meta-patterns (a class of operation that needs a different approach). Both apply on every operation: lessons prevent specific mistakes; improvements OVERRIDE the procedure in `references/` when their trigger matches. Format docs: [references/lessons-format.md](references/lessons-format.md), [references/improvements-format.md](references/improvements-format.md).
2. **Check `state.yaml`.** If present and current, proceed. "Current" means:
   - `state.discovered_against_major == spec.facts_major` (else: full re-discovery, see [references/discovery.md](references/discovery.md))
   - `state.discovered_at >= spec.emitted` (else: incremental reconciliation)
3. **If `state.yaml` is missing or stale,** run the bootstrap checks ([references/bootstrap.md](references/bootstrap.md)) and then the discovery procedure ([references/discovery.md](references/discovery.md)). Both halt with a clear, actionable message on failure (link to install / configure / deploy instructions). Discovery writes BOTH `state.yaml` (deltas + summary) AND `discovered.json` (full discovered schema).
4. **Once state is current,** answer the user's request using the discovered entity names, relationships, and lifecycle from `state.yaml` (and `discovered.json` for field-level detail when needed). Never assume catalog names hold; the tenant may have renamed `suppliers` to `vendors`, dropped `cost_centers`, or split a master into two entities.
5. **When a non-obvious pitfall is observed** during the run, append a `lessons.md` entry. **When a recurring procedural pattern is identified** that warrants a different approach than the procedure docs, append an `improvements.md` entry. Both feed back into step 1 on the next invocation.

To force a fresh discovery: delete `state.yaml` AND `discovered.json`. The next invocation will re-run discovery from scratch.

---

## What's in `spec.json`

The HQ-emitted structured snapshot of this domain. Read on demand (not loaded into every conversation). Includes:

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

**Treat `spec.json` as the read-only "as-designed" shape.** What this tenant actually deployed lives in `state.yaml`.

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

modules:                          # which spec-listed modules are live
  ATS-CANDIDATE-CRM: { present: true,  entity_renames: {} }
  ATS-REQUISITION-PIPELINE: { present: true, entity_renames: { application_notes: candidate_notes } }
  ATS-INTERVIEW-MGMT: { present: false, reason: "not deployed in this tenant" }
  ATS-OFFERS: { present: true, entity_renames: {} }

entity_renames:                   # global renames the tenant applied
  job_applications: applications  # tenant prefers the bare-word form
  recruitment_sources: sources

omitted_entities:                 # spec-listed entities the tenant chose not to deploy
  - cost_centers                  # tenant has no finance integration
  - background_checks             # handled in a separate vendor system

custom_entities: []               # tenant-added entities not in spec

field_renames: {}                 # within an entity (rare)
field_omissions: {}

unresolved_questions: []          # things the skill asked the user about during discovery
                                  # populated when the user says "skip for now"
```

---

## What's in `lessons.md` and `improvements.md`

Both are append-only learning surfaces the skill grows over time. They differ in shape:

- **`lessons.md`** — tactical: ONE specific call failed in a way that wasn't obvious, here's the correct form. Format: [references/lessons-format.md](references/lessons-format.md).
- **`improvements.md`** — procedural: a CLASS of operation needs a different approach than the procedure docs. Improvements override `references/*.md` when their trigger matches. Format: [references/improvements-format.md](references/improvements-format.md).

Both are local-tenant by default. If either is genuinely universal, the tenant can choose to upstream via the catalog's contribution channel; the skill does NOT auto-publish.

## What's in `discovered.json`

The full discovered schema written by the discovery procedure: entities → fields → types → relationships → lifecycle field locations. Loaded on demand (not on every conversation) when the skill needs field-level detail. Together with `state.yaml`, gives the complete picture of what this tenant actually has, no live re-query needed.

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

UI base: `https://<tenant>.semantius.app/ats/<table>`

Spec file: [`spec.json`](./spec.json)

State file: `./state.yaml` (created on first discovery)

Lessons file: `./lessons.md` (created on first lesson)

Discovered schema: `./discovered.json` (full entity/field/relationship snapshot)

Improvements file: `./improvements.md` (procedural meta-pattern learnings)

Procedure references:
- [Bootstrap checks](references/bootstrap.md)
- [Discovery procedure](references/discovery.md)
- [Lessons format](references/lessons-format.md)
- [Improvements format](references/improvements-format.md)
- [Skill changelog](references/skill-changelog.md)
