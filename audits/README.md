# Domain audit history + state

Each domain has its own directory:

```
audits/<DOMAIN_CODE>/
  history.md      append-only audit narrative (dated sections, verbatim)
  state.yaml      current open items, schema_version: 2
  q-<CODE>.md     human-readable open decisions; present iff status: feedback_needed
  a-<CODE>.md     the user's answers (a rename of q-); its presence flips next_action_by to agent
```

Catalog-wide artifacts stay flat at the audits/ root: `README.md`, `_apqc-in-use.md`, `_discover.md`, `_missing-domains.md`, `_validate-cross-domain.md`.

## state.yaml schema (v2)

```yaml
schema_version: 2
domain: <DOMAIN_CODE>
status: audit_stale | feedback_needed | passed
next_action_by: agent | user | research | blocked | done
last_audit: <YYYY-MM-DD or null>

b1a:   # agent-solvable: pending technical action the agent can execute next pass
  - id: B1A-<TAG>
    summary: <self-contained one-line>
    finding: <full text, back-references resolved>
    action: <full text>
    # optional standard fields (see below)
    # extras prefixed extra_

b1b:   # blocked: parked, waiting on another domain audit, neighbor catch-up, or external trigger
  - id: B1B-<TAG>
    summary: ...
    finding: ...
    blocked_by:
      - {type: domain_audit, blocking_domain: <DOMAIN_CODE>, milestone: <short-tag>}
      # or: {type: depends_on, ref: <B-X>, reason: <short>}
      # or: {type: user_decision, ref: <B2-X>}
      # or: {type: catalog_addition, scope: solutions|domains|modules, trigger: <short>}
      # or: {type: prerequisite_entity, ref: <B1A-MX>}

b2:    # user judgment required
  - id: B2-<TAG>
    summary: ...
    question: ...
    options: [...]
    why: ...                       # optional

b3:    # vendor research pending (Phase 0): discretionary ADDITIVE entities that fit the existing module shape. NEVER a split (a new/split module, split/new domain, or moving a master between domains is a b2). Non-blocking: never gates "finished".
  - id: B3-<TAG>
    candidate: <entity name>
    rationale: <full text>
    vendor_evidence: [...]
    proposed_module: ...           # optional
```

`next_action_by` derives by priority: agent (b1a non-empty) > user (b2) > research (b3) > blocked (only b1b) > done.

**Execution contract (SKILL.md Rule #21).** A *review / audit / validate / finish* run EXECUTES all additive/corrective `b1a` inline (`record_status='new'`), so a properly-run review leaves `b1a` empty and the domain ends `next_action_by: user` (an open `b2` or a destructive step needs approval), `blocked` (only `b1b` remains), or `done`. `b3` is non-blocking and never sets `next_action_by` on its own; it parks in the ideas backlog. Only a *report / check* run is read-only and may leave `b1a` populated.

### Human-readable decision files (`q-` / `a-`)

`state.yaml` is the machine source of truth; humans review through a plain-language companion file. Full contract: **SKILL.md Rule #22**. In short:

- A domain at `status: feedback_needed` (i.e. `next_action_by: user`) MUST have a `q-<CODE>.md` in its audit directory, listing every open `b2` decision, pending destructive approval, and `record_status` approval gate as yes/no or pick-one questions, each with a recommendation. Open `b3` ideas go in an "Optional" section. A `feedback_needed` state with no current `q-` file is an incomplete audit.
- The user answers in the `a#:` lines and renames the file to `a-<CODE>.md`. That rename flips the domain to `next_action_by: agent`.
- On seeing an `a-` file the agent reads and processes the answers (decisions applied under Rule #21; a question/request in an `a#:` keeps that item open), updates `state.yaml`, **deletes both the `a-` and the stale `q-` file**, then either regenerates a fresh `q-` file (if anything is still open) or continues the build.

### Standard optional fields (use these exact names; no invented variants)

- `affected_handoffs[]`: `{handoff_id, direction, source_domain, target_domain, trigger_event, payload, null_field}`. When source gives only a count: `{count, scope_note, enumeration_status: source_count_only}`.
- `affected_events[]`: `{id, event_name, current_category, proposed_category}`.
- `affected_masters[]`: `{data_object_id, name, target_module_id, workflow}`.
- `affected_modules[]`: flat list of module IDs.
- `affected_entities[]`: flat list of entity names.
- `vendor_evidence[]`: flat list of vendor names or `{vendor, evidence: 1st_class|secondary|absent}`.

Audit-specific extras must be prefixed `extra_` (e.g. `extra_loader_group:`, `extra_sequencing:`).

### Self-containment rules

- **Resolve back-references inline.** Phrases like "5 flagships", "the 3 starters" → name them in parentheses: "All 5 flagships (Cornerstone, Docebo, ...)".
- **Enumerate counts as structured lists.** "6 handoffs" → `affected_handoffs[]` with 6 entries (or one `enumeration_status: source_count_only` entry if the source didn't list them individually).
- **Distinguish `blocked_by[]` (gating) from `affected_*[]` (touched).** "8 handoffs blocked on SPM modularization" is 1 blocker + 8 affected, NOT 8 blockers.

## Querying across domains

```sh
# Domains awaiting user judgment
yq -r 'select(.next_action_by == "user") | .domain' audits/*/state.yaml

# Which partner audits block the most items
grep -hE "blocking_domain:" audits/*/state.yaml | sed 's/.*blocking_domain: //; s/,.*//' | sort | uniq -c | sort -rn

# Stale audits (never run under schema v2)
yq -r 'select(.status == "audit_stale") | .domain' audits/*/state.yaml | wc -l

# Items blocked on a specific domain
grep -lE "blocking_domain: PROD-MGMT" audits/*/state.yaml
```

## How an audit run works

Each Validate audit run by the domain-map-analyst skill produces TWO outputs in the domain directory:

1. **Append to `history.md`**: a new dated `## YYYY-MM-DD — Audit` section with the full audit narrative (Summary, Bucket 1/2/3 findings, Decisions, Fixes applied, Pairwise reconciliation).
2. **Rewrite `state.yaml` in place**: the current open items per the v2 schema. Resolved items live ONLY in history.md.

The split keeps state queryable while history remains the canonical record.

## Migrated from v1

`audits/<DOMAIN>.md` files were the prior format. Migrated on 2026-05-31 via [scripts/loaders/migrate_audits_to_split_v2.ts](../scripts/loaders/migrate_audits_to_split_v2.ts). The migration:

- Copied each `audits/<DOMAIN>.md` to `audits/<DOMAIN>/history.md` verbatim.
- Wrote a stub `state.yaml` with `status: audit_stale`.
- The first fresh audit under schema v2 populates state.yaml properly.

The legacy `audits/<DOMAIN>.md` files were removed; restore with `git checkout` if needed.
