# Rebuild state.yaml for all stale domains

**Copy the section below into a fresh Claude Code session at the project root (`c:/dev/domain-map`).** The orchestrator will discover the stale domains, batch them, and dispatch one subagent per domain. Each subagent runs a fresh `domain-map-analyst` Validate b1 audit and writes both the new dated section to `history.md` and the rewritten `state.yaml` in the v2 schema.

ATS and LMS were validated on 2026-05-31 (status now `feedback_needed`), so the stale-discovery query naturally excludes them. Expect ~149 stale domains. Batches of 7 in parallel = ~22 batches × ~5–10 min per subagent = 2–3.5 hours wall-clock.

---

## START HERE (paste into new session)

I need you to rebuild `state.yaml` for every domain in `audits/` that currently shows `status: audit_stale`. These were migrated from the legacy single-file format on 2026-05-31; their `history.md` preserves the prior audit narrative verbatim, but `state.yaml` is just a stub. You're going to run a fresh audit per domain to populate it correctly.

### Working directory

`c:/dev/domain-map`. Never `cd`.

### Discover stale domains

```sh
yq -r 'select(.status == "audit_stale") | .domain' audits/*/state.yaml
```

Expect ~151 domains.

### Batch strategy

Dispatch **7 subagents in parallel per batch**. After each batch returns, briefly verify counts and surface any failures, then dispatch the next batch. Do not dispatch all 149 at once.

For each subagent: use the prompt template at the end of this message with `<DOMAIN_CODE>` substituted.

### Per-domain subagent prompt template

```
You are running a fresh Semantius domain-map-analyst Validate b1 audit for domain <DOMAIN_CODE>.

Working directory: c:/dev/domain-map. Do not cd. Use repo-relative paths.

CONTEXT FILES (read these first):
1. .claude/skills/domain-map-analyst/SKILL.md — the full skill, including hard rules #0-#20.
2. .claude/skills/domain-map-analyst/references/domain-audit-procedure.md — the audit recipe.
3. audits/README.md — the state.yaml v2 schema (authoritative).
4. CLAUDE.md — project rules (no em-dashes, American English, semantius CLI from project root, etc.).
5. audits/<DOMAIN_CODE>/history.md — prior audit narrative for this domain. READ FOR CONTEXT, do not extract structured state from it — the v2 audit produces state from live queries, not from prior prose.

TASK

1. Run a fresh structural Validate b1 audit per the recipe in domain-audit-procedure.md:
   - A-band: domain metadata (A1-A4 + regulations linkage)
   - M-band: modularization (M1-M7)
   - B-band: boundary integrity (B5, B7 user-edges, B9 trigger fan-out, B9b intra-domain handoffs, B10b own-side FK backfill, B11 aliases, B12 lifecycle states)
   - C-band: lifecycle states
   - D-band: data objects
   - E-band: RBAC (E1-E5 — roles, role_modules, permissions, role_permissions, Path A == Path B)
   - F-band: skills (F1-F5 — exactly one system skill per module, skill_tools, Semantius score)
   - H-band: APQC coverage (handoff_processes per cross-domain handoff)

2. Query live state via the `semantius` CLI (Rule #0 in SKILL.md). NEVER use mcp__* Semantius tools.

   ```
   semantius call crud postgrestRequest '{"method":"GET","path":"/<table>?<filter>"}'
   ```

3. Classify every gap found into one of four buckets, per the rules in audits/README.md:
   - `b1a`: agent-solvable. Deterministic PATCH/INSERT/DELETE that the agent can execute on the next pass without user input. Examples: backfill a NULL FK with a deterministic value, INSERT missing aliases per market terminology, PATCH event_category enum on workflow-gate events.
   - `b1b`: blocked. The agent has tried/parked it; it's waiting on another domain's audit, a neighbor catch-up, or an external catalog addition. Specify `blocked_by[]` with the gating thing.
   - `b2`: requires user judgment. Pick A vs B, name something, approve wording, decide scope, accept/reject a recommendation. **Critical: if the action requires user input, classify as b2 from the start, NOT as b1.**
   - `b3`: speculative vendor-research-pending. Phase 0 candidates.

4. **Append a new dated section** to `audits/<DOMAIN_CODE>/history.md`. Structure: `## YYYY-MM-DD — Audit`, followed by Summary, Vendor surface basis, Bucket 1 / 2 / 3 findings, any Pairwise reconciliation, any Decisions / Fixes-applied tables if you actually applied fixes during this pass. Use the section template in `domain-audit-procedure.md` Step 4.

5. **Rewrite `audits/<DOMAIN_CODE>/state.yaml` in place** in schema_version: 2 format per `audits/README.md`. Carry only PENDING items. Resolved items live ONLY in history.md.

WRITING STATE.YAML — STRICT RULES

- Use only the standard field names from audits/README.md:
  - `blocked_by[]` typed entries: `{type: domain_audit, blocking_domain: <DOMAIN_CODE>, milestone: ...}` etc.
  - `affected_handoffs[]`, `affected_events[]`, `affected_masters[]`, `affected_modules[]`, `affected_entities[]`, `vendor_evidence[]`.
- NO invented field name variants. NO `handoffs[]`, `blockers[]`, `owed_by_domain:`, etc.
- Audit-specific extras prefixed `extra_` (e.g. `extra_loader_group:`).
- **Self-containment**: each item must read meaningfully without opening history.md. Resolve back-references inline ("5 flagships (Greenhouse, Lever, Ashby, SmartRecruiters, iCIMS)..."). Enumerate counts as structured lists.
- **Distinguish `blocked_by[]` from `affected_*[]` CAREFULLY**. "8 handoffs blocked on SPM modularization" = 1 blocker + 8 affected items, NOT 8 blockers.
- **No truncation.** Long text is fine. State.yaml is the to-do list — give the reader what they need to act.

HARD RULES (read SKILL.md + CLAUDE.md for the full list)

- Rule #0: `semantius` CLI from project root. NEVER mcp__* Semantius tools (JWT-audience errors / wrong tenant).
- Rule #1: omit `record_status` on inserts (default 'new'). NEVER 'approved' without user confirmation.
- Rule #6: never `cd`. Run from project root with absolute / repo-relative paths.
- Rule #15: NEVER populate any column named `notes`.
- Rule #18: no vendor names in non-commerce-entity text.
- Rule #20: never write `catalog_tagline` / `catalog_description` without explicit per-row user approval.
- No em-dashes (use comma, parenthesis, colon).
- American English.
- JWT-audience error → STOP and surface verbatim; do NOT retry.

CONSTRAINTS

- DO NOT modify other domains' files.
- DO NOT commit.
- DO NOT cd.
- This audit is READ-MOSTLY against the live catalog; if you write fixes during the audit, follow Rule #1 (record_status default 'new', user approval before promoting).

REPLY (≤400 words, structured):

- COUNTS per bucket: b1a=N, b1b=N, b2=N, b3=N
- next_action_by value (agent | user | research | blocked | done)
- BUCKET 1 (b1a) summary: N items, briefly what kinds of fixes
- BUCKET 1 (b1b) summary with cross-domain blockers (which domains we're waiting on)
- BUCKET 2 questions surfaced
- BUCKET 3 candidates surfaced
- JWT errors verbatim if any
- File paths written
```

---

## After all batches complete

Run:

```sh
# Confirm no more stale
yq -r 'select(.status == "audit_stale") | .domain' audits/*/state.yaml | wc -l
# Expect 0

# Headline status breakdown
yq -r '.status' audits/*/state.yaml | sort | uniq -c

# Cross-domain blocker ranking
grep -hE "blocking_domain:" audits/*/state.yaml | sed 's/.*blocking_domain: //; s/,.*//' | sort | uniq -c | sort -rn

# Domains by next_action_by
yq -r '.next_action_by' audits/*/state.yaml | sort | uniq -c
```

Then surface the totals and the cross-domain blocker ranking. Commit in batches of ~25 domains (`git add audits/<batch>/ && git commit -m "audit rebuild: batch N"`) so the history is reviewable.
