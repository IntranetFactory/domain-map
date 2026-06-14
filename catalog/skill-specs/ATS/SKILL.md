---
name: use-ats
description: >-
  Use this skill for any task involving the Applicant Tracking and Recruiting domain (ATS)
  in this Semantius deployment. Trigger phrases: ats.
  Entities covered: Adverse Action Notices, Applicant Flow Records, Application Dispositions, Application Screening Answers, Application Screening Questions, Application Stage Transitions, Application Stages, Background Check Adjudications, Background Check Components, Background Check Disputes, Background Check Packages, Background Checks, Candidate Assessment Templates, Assessments, Candidate Consents, Candidate Documents, Candidate Emails, Candidate Engagements, Candidate Notes, Candidate Nurture Campaigns, Referrals, Candidate Tag Assignments, Candidate Tags, Candidates, Data Subject Requests, Drug and Health Screenings, EEO Responses, FCRA Disclosures, FCRA Summary of Rights Acknowledgements, Hiring Team Assignments, Interview Kits, Interview Panels, Interview Questions, Interview Scorecards, Interviewer Availability Slots, Interviews, Applications, Offers, Job Posting Distributions, Job Postings, Job Requisitions, OFCCP Audit Trails, Offer Approvals, Offer Letter Documents, Offer Letter Templates, Offer Versions, Pre-Adverse Action Notices, Pre-Employees, Recruiter Interactions, Recruiter Saved Searches, Recruiting Event Attendances, Recruitment Agencies, Recruitment Events, Recruitment Sources, Referral Campaigns, Referral Payouts, Referral Rewards, Requisition Approvals, Talent Pool Memberships, Talent Pools, Talent Segments, Voluntary Self-Identifications.
  Workflows covered: AI-Driven Matching and Screening, Background Screening, Candidate Experience, Interview Management, Offer Management, Requisition Management, Candidate Sourcing.
  Adjacent skills (use them instead for their own scope): use-ben-admin, use-comp-mgmt, use-hcm, use-hrsd, use-onboarding, use-pa, use-payroll, use-swp, use-talent-mgmt.
  Covers entity discovery, lifecycle awareness, cross-domain handoffs, APQC
  process context, and deployment-specific renames or omissions. Loads the
  discovered state automatically; runs a discovery pass on first invocation. Pairs with
  `use-semantius` for CLI mechanics.
---

# use-ats skill

This skill knows the **Applicant Tracking and Recruiting** domain as shipped from the catalog at HQ and as discovered in this deployment. It avoids re-discovering the domain shape on every conversation by persisting deployment-specific findings to local state.

For all Semantius CLI mechanics, PostgREST encoding, and cube DSL, defer to the `use-semantius` skill, which is expected to load alongside.

---

## File layout

| File | Source of truth | Mutated by |
|---|---|---|
| `SKILL.md` | rendered from template + spec at HQ | HQ on skill upgrade |
| `spec.json` | HQ catalog emit (structured per-domain data) | HQ on skill upgrade |
| `state.yaml` | deployment discovery run | this skill |
| `discovered.json` | deployment discovery run (full discovered schema) | this skill |
| `lessons.md` | deployment runtime | this skill (append-only) |
| `improvements.md` | deployment runtime | this skill (append-only) |
| `ready.flag` | written by `scripts/bootstrap.ts` | bootstrap (single producer) |
| `references/` | generic, no per-domain content | HQ on skill upgrade |
| `scripts/` | generic Bun/TypeScript bootstrap scripts | HQ on skill upgrade |

The skill **learns** locally through three append-only files: `state.yaml` (deltas vs. spec), `lessons.md` (tactical pitfalls), and `improvements.md` (procedural meta-patterns). All three are read on every invocation and applied to subsequent operations. `SKILL.md` itself stays untouched, the procedure manual is stable; the learning layer grows around it.

The installer preserves `state.yaml` and `lessons.md` across upgrades. Teams should commit both alongside the skill if they want shared discovery and lessons.

---

## On every invocation

Before doing any domain work, the skill follows this sequence:

1. **Verify `use-semantius` is loaded in the session.** Look at the available-skills list in the system reminder. If `use-semantius` is not present, halt with: *"This skill delegates all Semantius CLI mechanics to `use-semantius`. Install it from the catalog and reload the session: https://semantius.app/catalog/use-semantius"*. This is an agent-level check (no script can see what's loaded in the Claude Code session); the agent performs it on every invocation as the cheapest gate.
2. **Verify Bun is installed.** Run `bun --version`. If exit code is non-zero, halt with the install link (`https://bun.sh/install`). All scripts in `scripts/` are TypeScript on Bun (no Python, ever, see hard rules). The skill cannot proceed without Bun.
3. **Read `lessons.md` and `improvements.md`** in full. Lessons are tactical pitfalls (one specific call that failed; the corrected form). Improvements are procedural meta-patterns (a class of operation that needs a different approach). Both apply on every operation: lessons prevent specific mistakes; improvements OVERRIDE the procedure in `references/` when their trigger matches. Format docs: [references/lessons-format.md](references/lessons-format.md), [references/improvements-format.md](references/improvements-format.md).
4. **Check `ready.flag`.** Single-file check. The skill is ready when:
   - `ready.flag` exists, AND
   - `ready.flag.valid_through_emitted == spec.emitted`, AND
   - `ready.flag.valid_through_major == spec.facts_major`.
   If any condition fails, run `bun run scripts/bootstrap.ts` from the project root. Bootstrap orchestrates Phase 1 (environment) → Phase 2a (runs the provenance resolution ladder, writes `discovered.json`) → ready.flag. Phase 2a resolves every uber-model concept against the live deployment by **deterministic platform reads** (no name guessing): see the ladder below. If Phase 2a leaves genuine ambiguities (a live row with an **empty** `catalog_entity_code`, i.e. created outside the deploy pipeline, or a concept that resolves to more than one in-domain entity), bootstrap DOES NOT write `ready.flag`; the agent runs Phase 2b ([references/discovery.md](references/discovery.md)) to surface only those to the user, records resolutions in `state.yaml`, then re-invokes `bootstrap.ts`. A fully provenance-stamped deployment yields zero ambiguities and no prompts.
5. **Once `ready.flag` is current,** answer the user's request using the discovered entity names, relationships, and lifecycle from `state.yaml` (and `discovered.json` for field-level detail when needed). Never assume catalog names hold; this deployment may have renamed `suppliers` to `vendors`, dropped `cost_centers`, or split a master into two entities. Operational failures from semantius calls surface verbatim (Rule #6), the skill does NOT pre-flight authentication on every invocation; trust the CLI to error when it errors.
6. **When a non-obvious pitfall is observed** during the run, append a `lessons.md` entry. **When a recurring procedural pattern is identified** that warrants a different approach than the procedure docs, propose the improvement at end-of-session for user approval before appending to `improvements.md` (improvements OVERRIDE procedure docs, so they need human review, see [references/improvements-format.md](references/improvements-format.md)). Both feed back into step 3 on the next invocation.

To force a fresh discovery: delete `ready.flag` (or also `discovered.json` and `.phase1-cache.json` for a fully cold rebuild). The next invocation will re-run bootstrap.

---

## How discovery resolves concepts (the provenance ladder)

As of core v0.1.2 the live platform carries provenance columns, so discovery reads identity instead of guessing it. For each uber-model concept `X` the domain assumes, Phase 2a resolves it against the live deployment in this order (first hit wins), and a live `table_name` that differs from `X` is a deterministic rename:

1. **FK reachability**, a live FK on the domain's own entities whose `reference_table` resolves to an entity carrying `catalog_entity_code = X`. Reseating is universal, so this catches silo, same-name share, and reuse/merge whenever `X` still has a consumer in the domain.
2. **Owned canonical code**, `catalog_entity_code = X` AND the entity's module is in the domain's `catalog_module_code` slice. Catches masters the domain owns and its own silos (`table_name` is the `X`-rename).
3. **Alias**, an entity whose `catalog_entity_aliases` contains `{ alias_code: X, source_domain: <this domain> }` (JSONB containment; resolve on the **pair**, never `alias_code` alone). Catches a reuse/merge that renamed `X` onto a differently-named host.
4. **Absent**, none of the above → `X` is genuinely not deployed (a true omission).

The provenance columns and their **empty** values (core v0.1.2 stores NOT NULL with an empty default, so test against the empty value, **never `IS NULL`**):

| Column (table) | Empty | Empty means |
|---|---|---|
| `catalog_entity_code` (`entities`) | `''` | outside the deploy pipeline (hand-built / pre-provenance) |
| `canonical_owner_module` (`entities`) | `''` | this module owns it, or local |
| `pattern_flags` (`entities`, json) | `'{}'` | no special behavior |
| `catalog_entity_aliases` (`entities`, json) | `'[]'` | never a merge target |
| `entity_type` (`entities`) | `'unclassified'` | unclassified upstream |
| `catalog_field_code` (`fields`) | `''` | outside the pipeline |
| `catalog_module_code` (`modules`) | `''` | greenfield; also the **domain axis** Pass 1 enumerates by |

`catalog_entity_code` stamps the **canonical** uber-model code (so the join is clean across dialect and silo renames); the deployed name lives in `table_name`. The name/alias/label heuristic survives only as a fallback for rows whose `catalog_entity_code` is empty. Full procedure and query shapes: [references/discovery.md](references/discovery.md).

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

**Treat `spec.json` as the read-only "as-designed" shape.** What this deployment actually configured lives in `state.yaml`.

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
  org: <from getCurrentUser>

modules:                          # which facts-listed modules are live
  ATS-CANDIDATE-CRM: { present: true,  entity_renames: {} }
  ATS-REQUISITION-PIPELINE: { present: true, entity_renames: { application_notes: candidate_notes } }
  ATS-INTERVIEW-MGMT: { present: false, reason: "not part of this deployment" }
  ATS-OFFERS: { present: true, entity_renames: {} }

entity_renames:                   # global renames applied in this deployment
  job_applications: applications  # this deployment prefers the bare-word form
  recruitment_sources: sources

omitted_entities:                 # facts-listed entities not configured in this deployment
  - cost_centers                  # no finance integration in this deployment
  - background_checks             # handled in a separate vendor system

custom_entities: []               # entities added in this deployment, not in facts

field_renames: {}                 # within an entity (rare)
field_omissions: {}

unresolved_questions: []          # things the skill asked the user about during discovery
                                  # populated when the user says "skip for now"
```

---

## What's in `lessons.md` and `improvements.md`

Both are append-only learning surfaces the skill grows over time. They differ in shape:

- **`lessons.md`**, tactical: ONE specific call failed in a way that wasn't obvious, here's the correct form. Format: [references/lessons-format.md](references/lessons-format.md).
- **`improvements.md`**, procedural: a CLASS of operation needs a different approach than the procedure docs. Improvements override `references/*.md` when their trigger matches. Format: [references/improvements-format.md](references/improvements-format.md).

Both are local to this deployment by default. If either is genuinely universal, you can choose to upstream via the catalog's contribution channel; the skill does NOT auto-publish.

## What's in `discovered.json`

The full discovered schema written by the discovery procedure. Loaded on demand (not on every conversation) when the skill needs field-level detail. It carries:

- `resolution`, per concept, how the ladder resolved it (`via: fk_reachability | owned_code | alias | absent`, the `live_table`, and whether it `renamed`).
- `entity_renames`, canonical concept → live `table_name` (deterministic, from the ladder).
- `omitted_entities` / `custom_entities`, true omissions, and live rows not claimed by a concept.
- `entities`, per live table: its `catalog_entity_code`, `canonical_owner_module`, `entity_type`, `pattern_flags`, `catalog_entity_aliases`, fields (each with `catalog_field_code`, `format`, `reference_table`, `enum_values`), and the lifecycle field/values.

Together with `state.yaml` this gives the complete picture of what this deployment actually has, no live re-query needed.

---

## How to talk about the deployment

Use the words the customer knows. They experience Semantius as **the platform**, and their own configured instance as **your platform**, **this deployment**, or **your workspace**. **Never call it a "tenant" in anything the user reads.** "Tenant" is internal infrastructure vocabulary; the customer does not know they are one, and the word means nothing to them.

This governs every explanation you give about renames, omitted modules, or why a table is not present:

- Good: *"Your platform runs the Hiring Starter package, so the Candidate CRM, Interviews, and Offers tables are not part of it."*
- Bad: *"This tenant runs the lightweight Hiring Starter bundle rather than the full catalog ATS module set."*

The word "tenant" may still appear in internal mechanics the customer never sees: state files, field names, script diagnostics, and these procedure docs. Only what the user reads is governed by this rule.

---

## Hard rules inherited from the catalog

These hold across every Semantius write the skill performs, regardless of what the user asks:

- **`record_status` on agent-authored rows is `new`.** Never stamp `approved` without explicit per-load user confirmation. The default on every `record_status` column is already `"new"`; omitting the field is cleanest.
- **No em-dashes** in any prose written to the catalog or to local files.
- **American English** in every emitted artifact.
- **Use the `semantius` CLI exclusively.** Never call MCP-exposed Semantius tools; they authenticate against the wrong scope and will fail or hit the wrong deployment.
- **`semantius` reads `.env` from cwd.** Invoke from the project root; never `cd` into a subfolder before calling it.
- **JWT-audience errors halt the run.** Surface the verbatim error and wait for user direction.
- **Never use Python. Use Bun (TypeScript) for every script.** Python on Windows is brittle in this project's deployment surface (encoding mismatches piping JSON into `semantius`, venv/path drift, subprocess plumbing that swallows stderr). The bootstrap scripts ship as `.ts` files run with `bun`. Any script this skill writes (bootstrap, discovery, ad-hoc helpers, loaders) MUST be TypeScript on Bun. "Just this once" with Python is not acceptable. If you think Python is the right tool, you're wrong, write the TypeScript instead.

Full versions of these rules with rationale live in the catalog's [domain-map-analyst SKILL.md](https://github.com/<...>/domain-map/blob/main/.claude/skills/domain-map-analyst/SKILL.md).

---

## Quick reference

UI base: `https://<org>.semantius.app/ats/<table>`

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
