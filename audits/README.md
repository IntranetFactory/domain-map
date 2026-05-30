# Domain audit history

One markdown file per domain (`<DOMAIN_CODE>.md`), append-only. Each Validate run appends a new dated section. The whole timeline of a domain's audits, decisions, and applied fixes lives in one place per domain, git-tracked, diffable.

## Why files, not the catalog

Rule #15 forbids auto-populated prose in `notes` columns. Audit history is exactly that — multi-paragraph findings, vendor-evidence rationales, decision logs. Files in this directory carry the long-form record; the catalog's `domains.notes` (optionally, with user-approved wording) carries a one-line status pointer back to the file.

Git is the audit history layer: every audit produces a commit; `git log audits/<DOMAIN>.md` shows the timeline; `git diff` between audits highlights what changed.

## File structure

One file per domain. Sections delimited by `## YYYY-MM-DD — Audit` headers. Newest section appended at the bottom. Never overwrite, never delete — the whole history stays visible.

Per audit, the section carries:

```markdown
## YYYY-MM-DD — Audit

### Summary
- Current footprint counts
- Vendor-surface basis (flagship vendors enumerated)
- Bucket 1 / 2 / 3 counts

### Bucket 1 — In-scope confirmed gaps
Tables grouped by finding type (MISSING / WRONG-OWNERSHIP / SCOPE-CREEP / STRUCTURAL / BOUNDARY / **APQC TAGGING**).

For **APQC TAGGING**, two tables: (1) `agent_curated` proposals — `(handoff_id, source→target, trigger_event, payload, proposed PCF row, PCF id, confidence)`; (2) deferred-to-Discover-Pass-3 — handoffs the agent couldn't confidently classify, with the deferral reason. The combined count drives the APQC TAGGING line in the summary.

**Report two distinct H-band numbers, don't conflate them:**

- **Catalog quality (the headline)** = how many of the domain's cross-domain handoffs carry a `record_status='approved'` tag. This is the real coverage measure. Independent of how the tag was originally proposed.
- **Process health (secondary)** = how many existing tags are `proposal_source='agent_curated'`. Tells you whether the layered-ownership process is firing. Useful as a review-triage hint (sort by source) and as a regression test.

A `discovery_substring` row a reviewer approved IS a high-quality row. An `agent_curated` row at `record_status='new'` is high-confidence-pending — not yet high-quality. Lead with approved count; mention `agent_curated` count as a side-bar.

Volume expectation (for the audit's own work): roughly 0.5N to 0.8N NEW `agent_curated` rows proposed during this audit (where N = the domain's cross-domain handoff count). This is a process / throughput target for the audit itself, NOT a catalog quality target. Audits that ship zero APQC tags despite the analyst building the mental model are a procedural failure — the design assumes the agent tags while reading. `proposal_source='human_curated'` is reserved for cases where the user explicitly typed *"add tag X for handoff Y"* in chat; the agent's own audit-time tagging is always `agent_curated`.

### Bucket 2 — Surface-for-user (judgment calls)
Numbered list, each with the question + options + dependency status.

### Bucket 3 — Phase 0 pending (speculative)
Numbered list, each with the candidate + vendor knowledge basis + recommended verification.

### Decisions
Per-bucket user choices. Timestamped. *"Bucket 1: approved 1, 3, 5; declined 2, 4. Bucket 2: FERPA removed, notes reverted, master+embedded_master confirmed as architectural intent. Bucket 3: eyeball — outreach_sequences and video_interview_recordings ring true; rest defer to formal Phase 0."*

### Fixes applied
Per-fix log. Loader script path, row counts, timestamps. References the commit if the loader was committed.
```

## When a new audit runs

The agent reads the existing file (if any), generates the new audit section, appends, surfaces to user. Prior sections are never edited — corrections come as new audits, not overwrites.

## When `domains.notes` carries a pointer

After an audit lands, the agent asks the user whether to update `domains.notes` with a one-line status pointer:

> *"Last validated 2026-05-28. M7 soft-fail on talent_pools, Phase 0 pending. See `audits/ATS.md`."*

User supplies the exact wording per Rule #15. The pointer is optional but recommended — it makes the audit state visible in the catalog UI without forcing reviewers to open the audit file.

## Not gitignored

This directory is committed. Audit history is part of the project record, not ephemeral working state. Drafts and subagent JSON output continue to live in `c:/tmp/` and get gitignored; only the final per-audit markdown lands here.
