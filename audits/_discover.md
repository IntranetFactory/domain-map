# Discover-mode history (catalog-wide)

Append-only log of Discover-mode runs. Sits next to the per-domain `audits/<DOMAIN>.md` files. Each Discover run appends one dated section.

The underscore prefix on the filename signals this is **catalog-scoped**, not domain-scoped. Discover operates on the cross-domain handoff DAG as a whole; per-domain audit history goes in the matching `<DOMAIN>.md` file.

## Per-run section structure

Each Discover run appends a section with this shape:

```markdown
## YYYY-MM-DD — Discover

### Pass 0 — Substrate sanity
- Result: PASSED | STOPPED with N defects across M domains
- (if stopped) Affected domains: <DOMAIN_CODE> (B10b: 3, B8: 1), <DOMAIN_CODE> (B9: 2), ...
- (if proceeded) Override flag used? Y/N

### Pass 1 — PCF_OVERRIDES drift
- Prefixes audited: N entries
- Drift found on: <prefix> (intended "<name>" but resolves to "<actual>")
- User resolution per finding: ...

### Pass 1.5 — Coverage gap audit
- Authored, approved: N
- Authored, pending (resolved this run): N (approved M / rejected K)
- Discovered, pending (added to Pass 3 queue): N
- Untagged (handed to Pass 2): N
- Conflicting (authored vs discovered): N (authored kept / discovered re-routed)

### Pass 2 — Persist + ranked candidates
- Scope: untagged-only (N handoffs)
- New `handoff_processes` rows inserted: M (all `record_status='new'`)
- Skipped (existing): K
- Top 10 candidates (snapshot): <table>

### Pass 3 — Review queue + skills.process_id backfill
- Reviewed batches: <process_name> (M handoffs, K approved, L rejected)
- `skills.process_id` PATCHed on: <skill_name> → <process_id>
- New process skills authored: <skill_name> via <loader_path>
```

The raw ranked-table JSON dumps from Pass 2 stay in `c:/tmp/` (gitignored, ephemeral). This file carries the per-run decisions and counts.

## See also

- [README.md § c) Discover cross-domain processes](../README.md) — mode overview, triggers, output discipline.
- [.claude/skills/domain-map-analyst/references/discover-cross-domain-processes.md](../.claude/skills/domain-map-analyst/references/discover-cross-domain-processes.md) — pass-by-pass mechanics.
- [README.md](README.md) — per-domain audit convention (the file you're reading sits next to those).
