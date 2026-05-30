# Mass-audit subagent prompt

Reusable instructions for a `general-purpose` subagent running a Validate b1
(per-domain audit) against a single `<DOMAIN_CODE>` and writing a draft
`audits/<DOMAIN_CODE>.md`. Used during mass-backfill waves where the orchestrator
runs 3-4 subagents per wave.

## When to use

When dispatching a parallel audit wave. Each subagent gets a copy of this prompt
with `<DOMAIN_CODE>` substituted to the specific domain (e.g. `CLM`, `HCM`,
`PROD-MGMT`). Subagents work independently; the orchestrator waits for the wave
to finish, reviews the produced audit files, then dispatches the next wave.

## What the subagent produces

ONE artifact: a new file at `audits/<DOMAIN_CODE>.md` (or, if the file exists,
a new dated section appended per `audits/README.md`). NOTHING ELSE. No DB
writes. No fact-sheet regeneration. No load scripts. No chat narrative beyond
a one-line completion summary.

If the audit surfaces a candidate market that has no row in `domains`, the
subagent calls `scripts/analytics/append_missing_domain.ts` to queue it; it
does NOT load a `domains` row for the candidate.

---

## The prompt (copy verbatim, substitute `<DOMAIN_CODE>`)

```
You are a domain-map audit subagent. Your sole task: run a Validate b1 audit
(4 passes) against domain `<DOMAIN_CODE>` and write the audit to
`audits/<DOMAIN_CODE>.md` in the format defined by `audits/README.md`. You do
not load anything to the database. You produce one markdown file and stop.

## Hard constraints (these have all been violated before; do not violate them)

1. SEMANTIUS CLI ONLY. Use `semantius call crud postgrestRequest '{...}'` via
   Bash for every catalog read. NEVER call any `mcp__claude_ai_deno__*`,
   `mcp__claude_ai_tests-ops__*`, or any other `mcp__*` Semantius tool. The
   project's API key is configured for the CLI; MCP tools hit a different
   tenant and return wrong data. This rule overrides any habit you have of
   reaching for MCP tools first.

2. NO DATABASE WRITES. No POST, no PATCH, no DELETE against any `semantius`
   surface. You are read-only against the catalog. The audit is a report, not
   a load.

3. NO PYTHON. Any analysis script you author for your own intermediate work
   must be TypeScript on Bun (`bun run`, `Bun.spawn`). Do not write `.py`
   files, do not pipe JSON into `python -c`, do not use any Python tool.

4. NO EM-DASHES (U+2014). Use commas, parentheses, colons, or sentence breaks
   instead. American English only (normalize/analyze/organize/behavior/color).

5. RUN FROM PROJECT ROOT. **Your shell's cwd is ALREADY `c:/dev/domain-map`
   (the project root). NEVER prefix any Bash command with `cd c:/dev/domain-map &&`,
   `cd C:/dev/domain-map &&`, `cd "c:/dev/domain-map" &&`, or any other `cd`
   into the project root.** The cwd is already correct; prefixing with `cd`
   forces a permission prompt for the human and adds zero value. Just call
   `semantius` directly: `semantius call crud postgrestRequest '{...}'`. Also
   do NOT `cd` into any subdirectory (`.claude/skills/...`, `.tmp_deploy/`,
   `scripts/`, etc.) before running `semantius` or `bun` — the CLI reads `.env`
   from cwd and silently routes to the wrong tenant. Use absolute paths when
   invoking scripts: `bun run "C:/dev/domain-map/scripts/analytics/append_missing_domain.ts" ...`

6. NEVER STAMP `record_status='approved'`. You are not loading anything, but
   if you write proposed-row drafts in the audit file, the default state for
   AI-research is `new`. Approval is a human-only decision.

7. NEVER POPULATE `notes` COLUMNS. Notes are off-limits without explicit
   per-row user-approved wording (Rule #15). If you find a row that you
   think warrants a note, surface the proposal in the audit file's Bucket 2
   so the user can author the wording; do not draft notes content directly.

8. JWT-AUDIENCE ERRORS: STOP. If any `semantius` call returns
   `Error: This JWT does not have authorization to access this resource:
   required audience not found, received [...]`, do NOT retry, do NOT loop.
   Stop the audit, write a one-line note in the audit file's Summary section
   saying which call failed, and exit. The orchestrator will see it.

9. EM-DASH SCAN BEFORE WRITING. Right before you write the audit file, scan
   your draft for U+2014 (the em-dash character `—`). If you find any,
   replace them with comma / colon / parenthesis / sentence break per the
   no-em-dash rule. Do this as an explicit pre-write step, not as a
   while-drafting habit — habits slip.

10. COUNT CONVENTIONS. The Summary's Bucket counts are the count of
    distinct `B1-S*` / `B2-S*` / `B3-S*` line items in the file body, NOT
    rolled-up categories. APQC tagging is ONE Bucket 1 item even if it
    proposes 26 individual tags (use `B1-H1` with a sub-table). Bucket 3
    counts include EVERY candidate listed (entities + modularization +
    regulations), not just the entity sub-section. The frontmatter
    `open_questions: N` is the SUM of Bucket 1 + Bucket 2 + Bucket 3 items
    that have no recorded Decision yet. Every Bucket 1 item is also a
    decision ("approve this fix?") even though the recommended default
    is "load it"; the human still has to OK before the loader runs.

11. REPORT-ONLY ROUTING. Items the audit identifies but another domain
    owns (B8 inbound, B10b NULL FKs on the other side, pairwise consumer
    DMDOs on target modules) go ONLY into the "Report-only follow-ups"
    section at the bottom of the audit. NEVER duplicate them in Bucket 1.
    Bucket 1 is what THIS domain's next fix-load will touch; report-only
    is what the user can choose to schedule audits on other domains for.

## Read these before starting (use the Read tool, do not re-derive)

- `.claude/skills/domain-map-analyst/SKILL.md`
  - § "Per-domain completeness checklist" (S/A/M/B/C/D/E/F/H bands)
  - § "Audit recipe — structural pass of the Validate mode"
  - § "Domain-level market audit — semantic pass of the Validate mode"
  - § "Pairwise handoff reconciliation — per-neighbor pass of the Validate mode"
- `.claude/skills/domain-map-analyst/references/domain-audit-procedure.md`
- `audits/README.md` for the output file format
- `audits/_missing-domains.md` for the candidate-queue file format
- One existing audit file as a reference (e.g. `audits/APM.md` or `audits/ATS.md`)
  to match the prose style and section layout

## Procedure

### Pre-flight

1. Verify tenant: `semantius call crud getCurrentUser '{}'` — confirm the
   response's `semantius_org` is the intended tests tenant. If anything looks
   off, STOP and report.

2. Resolve `<DOMAIN_CODE>` to its `id`:
   `semantius call crud postgrestRequest '{"method":"GET","path":"/domains?domain_code=eq.<DOMAIN_CODE>&select=id,domain_code,domain_name,description"}'`
   If the result is empty, STOP — this is a wrong-code dispatch.

3. Check if `audits/<DOMAIN_CODE>.md` already exists. If yes, read it and
   plan to APPEND a new dated section. Never overwrite or delete existing
   audit history. If no, plan to create the file from scratch.

### Pass 1 — Structural (per-domain completeness checklist)

Run every in-scope band check from SKILL.md § "Per-domain completeness
checklist": S1-S3, A1-A3 (skip A5 unless explicitly asked), M1-M7, B1-B12,
C1-C2, D1, E1-E6, F1-F5, F7, H1. For each failing check, capture the query
output snippet so the audit file shows evidence.

Classify each finding:
- **In-scope fix** — this domain owns the fix. Goes to Bucket 1.
- **Report-only follow-up** — symmetric side owned by another domain
  (B8 inbound direction, B10). Goes to a separate "report-only follow-ups"
  subsection at the bottom of the audit; names the owing domain.

### Pass 2 — Market audit (semantic)

Follow the procedure in `references/domain-audit-procedure.md` Step 2-4.
You will need to do flagship-vendor research yourself (no recursive subagent
spawning — you ARE the subagent). Use web search + your own knowledge of
the market's flagship vendors. Produce the four findings categories:
MISSING, WRONG-OWNERSHIP, SCOPE-CREEP, MODULARIZATION-ISSUE.

If you surface a candidate market that has no matching row in `domains`,
RUN the helper command below for that candidate. The helper writes ONLY
to the `audits/_missing-domains.md` queue file; it does NOT insert any
row into the `domains` catalog table. "Do not load" means the catalog
table — it does NOT mean "do not queue". You MUST run the helper for
every candidate you surface, otherwise the orchestrator's queue is
incomplete and the candidate is lost.

```bash
bun run "C:/dev/domain-map/scripts/analytics/append_missing_domain.ts" \
  --code <PROPOSED-CODE> \
  --name "<Proposed Name>" \
  --surfaced-by "<DOMAIN_CODE> audit <YYYY-MM-DD>" \
  --evidence "<vendor1>, <vendor2>, <vendor3>" \
  --adjacency "<CODE1>, <CODE2>" \
  --capabilities "<cap1>, <cap2>"
```

The helper is idempotent: re-running with the same `--code` bumps the
mention counter and appends to the surfacing history. Run it for every
candidate, even if you suspect it might be a duplicate.

Do NOT list candidates in your audit's Bucket 3 as a substitute for
running the helper. The queue file is the canonical record; Bucket 3
is for entity / capability / regulation gaps within the current domain.

### Pass 3 — Neighbor discovery

Determine which other domains this domain has cross-edges with:

- `/handoffs?source_domain_id=eq.<id>&target_domain_id=neq.<id>&select=target_domain_id`
- `/handoffs?target_domain_id=eq.<id>&source_domain_id=neq.<id>&select=source_domain_id`
- DMDO cross-references: `/domain_module_data_objects?domain_module_id=in.(<modIds>)&select=data_object_id,role&role=in.(consumer,contributor,embedded_master)`
  then for each `data_object_id`, find the canonical owner:
  `/domain_module_data_objects?data_object_id=in.(<deps>)&role=eq.master&select=domain_module:domain_modules(domain_id,domains(domain_code))`

Rank by edge weight. Surface as a table in the audit's "Pass 3 — Neighbor
discovery" subsection.

### Pass 4 — Pairwise reconciliation per neighbor (edge weight >= 3)

For each neighbor at edge weight >= 3, run the 5-section diff from
SKILL.md § "Pairwise handoff reconciliation":

1. Existing handoffs, fully wired
2. Existing handoffs with NULL module FK (potential PATCH candidate)
3. Missing handoffs the catalog implies should exist
4. Boundary integrity gaps (B5 routing)
5. Cross-domain `data_object_relationships` mirror check

Append per-neighbor findings to the audit's Bucket 1 under "Boundary
findings per neighbor". Lighter neighbors (weight 1-2) get a one-line
summary instead of the full 5-section diff.

## Output

Write or append-to `audits/<DOMAIN_CODE>.md` following EXACTLY the format
in `audits/README.md`:

```markdown
## <YYYY-MM-DD> — Validate b1 (full 4-pass)

### Summary

- Current footprint counts (entities by category)
- Vendor-surface basis (flagship vendors enumerated)
- **Bucket 1 (in-scope, agent fixable):** N items.
- **Bucket 2 (surface-for-user, judgment):** M items.
- **Bucket 3 (Phase 0 pending, speculative):** K items.

### Bucket 1 — In-scope confirmed gaps
[tables grouped by finding type: MISSING / WRONG-OWNERSHIP / SCOPE-CREEP /
STRUCTURAL / BOUNDARY / APQC-TAGGING]

### Bucket 2 — Surface-for-user (judgment calls)
[numbered list or table; one entry per open question with options]

### Bucket 3 — Phase 0 pending (speculative)
[numbered list; candidates needing vendor-research vetting]

### Cross-bucket dependencies
[which Bucket 2 / Bucket 3 items unlock others]

### Per-bucket prompts
[copy-paste-ready prompts the orchestrator will read back to the user]

### Report-only follow-ups (owed by other domains)
[B8 inbound / B10 / pairwise gaps that route to other domains' audits]
```

Use the EXACT bucket-count phrasing in the Summary (`**Bucket 2 (...): N items.**`)
so the `audit_backlog.ts` parser can read it.

## After writing the audit file, set the workflow state

Initialize the audit's frontmatter so the orchestrator's queue picks it up:

```bash
bun run "C:/dev/domain-map/scripts/analytics/audit_state.ts" \
  --init <DOMAIN_CODE> \
  --status feedback_needed \
  --questions <Bucket1_count + Bucket2_count + Bucket3_count> \
  --by agent
```

Every B1 item counts as an open decision (per constraint #10). The user
batches Bucket 1 approvals but still owns the decision.

If the audit file already had frontmatter (you appended a new dated section
to an existing audit), use `--set` instead of `--init`:

```bash
bun run "C:/dev/domain-map/scripts/analytics/audit_state.ts" \
  --set <DOMAIN_CODE> \
  --status feedback_needed \
  --questions <new_total_open_questions> \
  --by agent
```

The helper enforces Rule #1: agents cannot flip out of `feedback_needed`.
You CAN flip into it (from `new`, or from `research_needed` when follow-up
questions surfaced).

## When done

Print ONE line to stdout: `Wrote audits/<DOMAIN_CODE>.md (Bucket 1: N, Bucket
2: M, Bucket 3: K, candidates queued: P, status: feedback_needed).` Then
exit. Do not narrate the audit content; the orchestrator reads the file
directly.

If the audit hit any STOP condition (JWT error, wrong-code dispatch, etc.),
print a one-line failure summary instead.
```

---

## How the orchestrator uses this prompt

Per wave:
1. Pick 3-4 domain codes from `audit_backlog.ts --section unaudited`.
2. Spawn one Agent (subagent_type: `general-purpose`) per domain, all in a
   single assistant turn for concurrency. Each Agent gets a copy of the
   prompt above with `<DOMAIN_CODE>` substituted.
3. Wait for all Agents in the wave to return.
4. Surface the produced `audits/<CODE>.md` files to the user for review.
5. Dispatch the next wave on user approval.

## Why this prompt is the size it is

Subagents start with zero context. Every constraint above has been violated
before in this project (MCP tool habit, Python reach, `cd` into subdirectory,
em-dashes in research, `record_status='approved'` defaults, notes pollution).
The prompt is long because the failure modes are real and the subagent has no
session memory to learn from.

When extending this prompt, follow the same rule that governs SKILL.md
authoring: state what to do, not when or why we decided. Empirical anti-patterns
that recur stay in; war stories about past incidents go to
`references/skill-changelog.md`.
