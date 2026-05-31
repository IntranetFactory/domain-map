# Plan: Split audit files into state.yaml + history.md

**Author:** drafted 2026-05-31 after the first catalog-wide B1 technical pass.
**Scope:** 151 per-domain audit files in `audits/<DOMAIN>.md`. 1 is `status: passed` (ATS), 149 are `status: feedback_needed`, 1 (HAM) has no frontmatter at all.
**Owner of execution:** a fresh Claude Code session under the `domain-map-analyst` skill.

This plan is self-contained. A new session should be able to execute it from cwd `c:/dev/domain-map` without prior conversation context. **This plan does NOT touch catalog data.** A second B1 technical pass over the post-migration catalog is a separate plan and will be written once migration has landed.

---

## Why this exists

Today `audits/<DOMAIN>.md` mixes two data types with different access patterns:

- **State** (current open B1/B2/B3, status) — read on every audit run, mutates on every fix, should be regenerable and machine-queryable.
- **History** (dated audit runs, decisions made, fixes-applied tables, pairwise reconciliation sections) — written once, append-only, narrative.

Mixing them forces append-only on state, accumulates "Continuation" sections that push current state away from the top, makes cross-cutting queries ("every B2 question across the catalog") a 151-file grep, and inflates subagent context cost.

The first catalog-wide B1 pass (2026-05-31) processed all in-scope audits, applied ~2,150 writes, and produced 145 "Continuation" appendices that exposed the mixing problem at scale. This plan migrates the structure so the next B1 pass can operate against a machine-queryable schema.

---

## Target structure

Each domain becomes a directory:

```
audits/<DOMAIN>/
  state.yaml      current open b1/b2/b3 + status. Edit-in-place. Authoritatively regenerated each audit run.
  history.md      append-only timeline of audit runs, decisions, fixes applied, pairwise recon sections.
```

The legacy `audits/<DOMAIN>.md` is split and removed in the same commit batch.

Audits with no B1 content remaining (LMS, RE-BROKERAGE, WORK-MGMT) also get the split, but their `state.yaml` is minimal.

### state.yaml schema (authoritative)

```yaml
schema_version: 1
domain: <DOMAIN_CODE>          # e.g. ATS
domain_id: <int>               # e.g. 56 (from /domains?domain_code=eq.<X>)
status: feedback_needed        # one of: feedback_needed | passed
last_audit: 2026-05-28         # ISO date of most recent audit section in history.md
last_pass: 2026-05-31          # ISO date of most recent B1 technical pass (may be null on fresh migration)

b1:
  open:                         # technical items not yet attempted
    - id: B1-S1
      band: B7
      title: "Seven masters lack users-edges"
      action: "INSERT 7 data_object_relationships rows per Rule #10"
  deferred:                     # tried but parked, with a reason. Pass 2 will analyze and either retry, resolve, or reclassify as b2.open.
    - id: B1-T1
      reason: "target-domain ambiguity for interview.scheduled; see CCAAS/S2P/CLM next audit"
  resolved:                     # fixed in past passes
    - id: B1-S2
      resolved_at: 2026-05-28
      loader: .tmp_deploy/fix_ats_audit_2026_05_28.ts

b2:
  open:                         # user judgment required
    - id: B2-S1
      question: "FERPA scoping: keep or remove?"
      options: ["keep", "remove"]
  resolved:
    - id: B2-S2
      decision: "removed"
      resolved_at: 2026-05-28

b3:
  pending:                      # Phase 0 speculative, needs vendor research
    - id: B3-1
      candidate: "candidate_documents"
      vendor_evidence: "5/5"
      phase0_status: "not_started"  # one of: not_started | in_progress | done
  resolved:
    - id: B3-2
      verdict: "MERGE into candidate_documents"
      resolved_at: 2026-05-30
```

Rules:

- **Migration preserves the legacy B1 classification.** Items the legacy file parked in Continuation "Deferred-B1-items" tables migrate as `b1.deferred` with the deferral reason captured verbatim in `reason:`. No semantic reclassification happens during migration. The next B1 pass (separate plan) is responsible for analyzing each deferred item and either retrying it, marking it resolved, or moving it to `b2.open` if it turns out to need user judgment.
- Going forward (post-pass-2), the invariant should hold that **B1 contains only items the agent can act on (execute or retry on each pass)**. Anything that requires a human choice belongs in `b2.open`. The migration does not enforce this; pass 2 does.
- `state.yaml` is **edit-in-place** — never appended to, always rewritten authoritatively each audit run.
- Anything that says "what happened" goes in `history.md`. Anything that says "what's currently open" goes in `state.yaml`.
- `last_audit` advances when a new dated audit section is appended to `history.md`. `last_pass` advances when a B1 technical pass runs. They diverge intentionally.
- **No `metrics:` snapshot.** Footprint counts drift the moment any loader runs. Re-query the live catalog when current counts matter; don't store them.
- **No `open_questions` field.** Derived: `(.b2.open | length) + (.b3.pending | length)`. Consumers compute it from the lists.

### history.md format

```markdown
# <DOMAIN_CODE> audit history

<every dated `## YYYY-MM-DD` section from the legacy file, unchanged>

<every `## YYYY-MM-DD, Continuation:` section, unchanged>

<pairwise reconciliation sections, unchanged>
```

No frontmatter on `history.md` — frontmatter lives only in `state.yaml`.

---

## Phase A: update the skill to reflect the new structure

**Scope:** documentation only, no audit-file touches yet.

### A.1 — Edit `audits/README.md`

Rewrite the file to describe the new layout. Replace the "File structure" section. Reference the `state.yaml` schema. Keep the "Why files, not the catalog" preamble — that rationale is still valid.

Add a section "**Querying across domains**" with example commands:

```sh
# All open B2 questions across the catalog
for f in audits/*/state.yaml; do
  yq -r '.domain as $d | .b2.open[] | "\($d) | \(.id) | \(.question)"' "$f"
done

# Status counts
yq -r '.status' audits/*/state.yaml | sort | uniq -c

# Every B2 question that originated as a deferred B1 item
yq -r '.domain as $d | .b2.open[] | select(.originally != null) | "\($d) | \(.id) | originally \(.originally)"' audits/*/state.yaml
```

### A.2 — Rewrite audit-path references across the `domain-map-analyst` skill

Audit-path references live in 5 files, not just `SKILL.md`. Find every match with:

```sh
grep -rnE "audits/<DOMAIN|audits/[A-Z]" .claude/skills/domain-map-analyst/
```

Update all of:

- `.claude/skills/domain-map-analyst/SKILL.md`
- `.claude/skills/domain-map-analyst/references/domain-audit-procedure.md`
- `.claude/skills/domain-map-analyst/references/discover-cross-domain-processes.md`
- `.claude/skills/domain-map-analyst/references/mass-audit-subagent-prompt.md`
- `.claude/skills/domain-map-analyst/references/skill-changelog.md`

Most natural mapping:

- "append a new dated section to `audits/<DOMAIN_CODE>.md`" → "append to `audits/<DOMAIN_CODE>/history.md`"
- "the audit file" / "the audit's frontmatter" → "`state.yaml`"
- "open_questions count" → "computed from `state.yaml`"

Conceptual updates:

1. **Per-domain completeness checklist intro** (SKILL.md § "Per-domain completeness checklist") — `state.yaml` is the authoritative source for what's currently open. On a pass, items that get fixed move to `state.yaml.b1.resolved`; items that get tried and parked move to `state.yaml.b1.deferred` with a reason; items that need user judgment go to `state.yaml.b2.open`. History sections in `history.md` are append-only.

2. **Audit recipe** (SKILL.md § "Audit recipe — structural pass of the Validate mode") — step 7 changes from "Re-run the audit. The acceptance criterion is zero failed in-scope IDs..." to: "Re-run the audit. Write fixed items to `state.yaml.b1.resolved`; items requiring user judgment to `state.yaml.b2.open`; items tried but parked to `state.yaml.b1.deferred` with a reason; remaining technical failures to `state.yaml.b1.open`. Append the audit narrative + gap report to `history.md`."

Do NOT rewrite the rest of the skill content. The bucket framing (B1/B2/B3), the per-domain checklist, the structural-vs-semantic distinction, Rule #1, Rule #15, Rule #18, Rule #20 — all unchanged.

### A.3 — Add a one-time migration helper

Write `scripts/loaders/migrate_audit_to_split.ts` that, given a `<DOMAIN_CODE>` argument:

1. Reads `audits/<DOMAIN_CODE>.md`.
2. Parses frontmatter into a state object (`status`, `last_transition` → `last_audit`).
   - **No-frontmatter case** (HAM is the known instance): seed `status: feedback_needed`, set `last_audit` to the date of the first dated `## YYYY-MM-DD` section in the body, leave `last_pass` empty, log a warning to stderr.
3. Finds dated `## YYYY-MM-DD` audit sections + `## YYYY-MM-DD, Continuation:` sections — the union is the history content.
4. Within the most-recent audit section, extracts:
   - **Bucket 1 table rows** (`B1-*`) → `b1.open` by default.
   - If the item appears in a `Fixes applied` table in any Continuation entry → `b1.resolved` (with `resolved_at` and `loader` from the Continuation section).
   - If the item appears in a "Deferred-B1-items" table in any Continuation entry → `b1.deferred` with `reason:` set to the deferral text verbatim. No semantic reclassification. Pass 2 will analyze.
   - **Bucket 2 numbered items** → `b2.open` UNLESS the item appears in a "Decisions" section (then `b2.resolved` with decision text).
   - **Bucket 3 numbered items** → `b3.pending` UNLESS the item appears in a "Phase 0 outcome" or "Decisions" section (then `b3.resolved`).
5. Writes `schema_version: 1`. Does **not** write a `metrics:` block. Does **not** write `open_questions`.
6. Creates `audits/<DOMAIN_CODE>/` directory.
7. Writes `state.yaml` and `history.md`.
8. **Supports `--dry-run`:** writes to `c:/tmp/migrate_<DOMAIN_CODE>/state.yaml` + `history.md` instead of the real path. Phase B uses this; Phase C does not.
9. **Does NOT delete `audits/<DOMAIN_CODE>.md`** — the calling loop deletes after both files exist and the parse is verified. Idempotency: if `audits/<DOMAIN_CODE>/` already exists, exit 0 with an "already migrated" log line.
10. **Section-coverage sanity check:** before writing, count the bytes of preserved sections (dated audit + Continuation + pairwise recon) and compare to the body bytes of the source file. If the delta exceeds a small tolerance, abort and surface — something was dropped.

The script reads from markdown only. No live Semantius calls.

Quality bar: the parser may be imperfect on edge cases. Acceptable failure mode is "leaves items in `b1.open` that should have been `resolved` or `b1.deferred`" — surfaced by the smoke test on ATS + HAM and by the round-trip diff check in B.3. Pass 2 will catch any remaining misclassifications when it re-tests each `b1.*` item against live state.

---

## Phase B: smoke test on ATS + HAM (1-2 domain review before bulk)

Two domains:

- **ATS** is `status: passed`, has 14 resolved B1 items, a Continuation entry with both Fixes-applied and Deferred-B1-items tables, a Bucket 3 outcome section, and a pairwise reconciliation section. It exercises every legacy-format edge case except no-frontmatter.
- **HAM** has no frontmatter at all and a fresh fully-loaded audit with 14 B1 + 6 B2 + 10 B3 items. It exercises the no-frontmatter path and the typical `status: feedback_needed` case.

Together they cover the format surface.

### B.1 — Dry-run both

```sh
bun run scripts/loaders/migrate_audit_to_split.ts ATS --dry-run
bun run scripts/loaders/migrate_audit_to_split.ts HAM --dry-run
```

Outputs land in `c:/tmp/migrate_ATS/` and `c:/tmp/migrate_HAM/`. The `audits/` tree is untouched.

### B.2 — Manual review

Open the four dry-run files. Validate:

For ATS:

- Every B1-* item from the legacy audit is in exactly one of `b1.open`, `b1.deferred`, or `b1.resolved`.
- B1-S2 false-positive (HIRING-MANAGER role_modules) captured as `b1.resolved` with the decision text and loader path from the Continuation section.
- B9 fan-out deferred items (interview.scheduled, recruitment_agency.engaged) captured as `b1.deferred` with `reason:` carrying the Continuation's deferral text verbatim ("target-domain ambiguity, see CCAAS/S2P/CLM next audit"). They are NOT reclassified to b2 during migration — pass 2 will decide.
- Bucket 2 items 1-6 all in `b2.resolved` with their decisions.
- Bucket 3: 7 items in `b3.resolved` with verdicts (LOAD x4, MERGE x2, DEFER x1) + 1 SKIP, plus the structurally-implied `candidate_tag_assignments` row added in Bucket 3 fixes.
- Pairwise reconciliation section preserved in `history.md`.
- `schema_version: 1` present. No `metrics:` block. No `open_questions:` field.

For HAM:

- `state.yaml` exists despite the legacy file having no frontmatter. `status: feedback_needed`. `last_audit: 2026-05-30`. `last_pass` empty.
- A warning was logged about the missing frontmatter.
- 14 Bucket 1 items all in `b1.open` (HAM has had no Continuation entries yet, so nothing is resolved or deferred).
- 6 Bucket 2 items in `b2.open`.
- 10 Bucket 3 items in `b3.pending`.

### B.3 — Diff-check the data

```sh
diff <(grep -E "^\| B1-|^\| B2-|^\| #" audits/ATS.md | sort -u) \
     <(yq -r '(.b1.open[].id, .b1.deferred[].id, .b1.resolved[].id, .b2.open[].id, .b2.resolved[].id, .b3.pending[].id, .b3.resolved[].id) | select(. != null)' c:/tmp/migrate_ATS/state.yaml | sort -u)
```

Empty output (all IDs accounted for) is the pass criterion. Repeat for HAM.

### B.4 — Promote dry-run to real, delete legacy, commit

If review passes:

```sh
bun run scripts/loaders/migrate_audit_to_split.ts ATS
bun run scripts/loaders/migrate_audit_to_split.ts HAM
rm audits/ATS.md audits/HAM.md
git add audits/ATS/ audits/HAM/ audits/ATS.md audits/HAM.md
git status        # confirm: ATS.md + HAM.md deleted, ATS/ + HAM/ added with two files each
git commit -m "chore(audits): migrate ATS and HAM to state.yaml + history.md (smoke test)"
```

**Stop here and surface to user** for sign-off on the schema and the parser quality before going wider.

---

## Phase C: catalog-wide migration

Once the user signs off on the ATS + HAM smoke, run this loop across the remaining 149 audits.

### Procedure per domain

For each `<DOMAIN_CODE>` (excluding ATS and HAM, which are done):

1. `bun run scripts/loaders/migrate_audit_to_split.ts <DOMAIN_CODE>`.
2. Verify `audits/<DOMAIN_CODE>/state.yaml` parses and `audits/<DOMAIN_CODE>/history.md` exists.
3. `rm audits/<DOMAIN_CODE>.md`.
4. Surface a one-line summary.

No catalog writes. No live Semantius calls. Pure file-tree restructure.

### Loop mechanics

- **Batch size: 7 domains in parallel** per batch. Migration is pure markdown parsing — no live writes, no race conditions.
- **Total subagents to spawn:** 149 (the remaining after Phase B), batched 7 at a time = ~22 batches.
- **Expected duration:** ~30-60 minutes wall-clock. Migration is cheap per domain (parse + 2 file writes + rm). No `bun` loader runs, no `semantius` calls.
- **Subagent prompt template:** see Appendix A.

### Verification at end

```sh
# Every domain audit migrated; meta files survive at the audits/ root
ls audits/*.md | wc -l           # expect 5 (README, _apqc-in-use, _discover, _missing-domains, _validate-cross-domain)
ls -d audits/*/ | wc -l          # expect 151 (one directory per domain)

# Every state.yaml parses and carries schema_version: 1
for f in audits/*/state.yaml; do
  v=$(yq -r '.schema_version' "$f" 2>/dev/null || echo MISSING)
  [ "$v" = "1" ] || echo "BAD schema_version in $f: got $v"
done

# Every history.md is non-empty and starts with the # <DOMAIN> audit history header
for f in audits/*/history.md; do
  head -1 "$f" | grep -qE "^# .+ audit history" || echo "BAD history header in $f"
done
```

### Commit

Single commit after all batches complete:

```
chore(audits): split per-domain audits into state.yaml + history.md

- migrated 151 audit files from monolithic audits/<DOMAIN>.md into
  audits/<DOMAIN>/{state.yaml,history.md}
- state.yaml carries current open b1/b2/b3 + status (machine-queryable)
- history.md carries append-only audit timeline
- preserved legacy B1 classification (open / deferred / resolved). Pass 2
  will analyze each b1.deferred item and either retry, resolve, or move
  to b2.open if it needs user judgment.
- frontmatter-less HAM.md migrated with default status + warning logged
- schema_version: 1 on every state.yaml for forward-compat
```

B1 pass 2 is out of scope for this plan and will run from a separate plan against the post-migration state.

---

## Appendix A: Migration subagent prompt template

```
Subagent under domain-map-analyst at `c:/dev/domain-map`. Work on domain <DOMAIN_CODE>.

Run from project root (Rule #6 — never cd):

  bun run scripts/loaders/migrate_audit_to_split.ts <DOMAIN_CODE>

Verify both files exist and parse:

  test -f audits/<DOMAIN_CODE>/state.yaml && yq -r '.schema_version' audits/<DOMAIN_CODE>/state.yaml
  test -f audits/<DOMAIN_CODE>/history.md && head -1 audits/<DOMAIN_CODE>/history.md

Then:

  rm audits/<DOMAIN_CODE>.md

If `audits/<DOMAIN_CODE>/` already exists (already migrated), skip and reply "already migrated".

This is a pure file-tree restructure. No semantius calls. No loaders to run. No catalog writes.

Reply <=80 words: domain, counts (b1.open / b2.open / b3.pending), any parser warnings emitted by the script (especially "missing frontmatter"), "ok" or specific failure.
```

---

## Appendix B: Risks + mitigations

| Risk | Mitigation |
|---|---|
| Migration parser misclassifies a B1/B2/B3 item | Phase B dry-run on ATS + HAM surfaces it; both reviewed before bulk. The B.3 diff-check ensures every B1/B2/B3 ID round-trips between the legacy file and the new `state.yaml`. Pass 2 catches anything that slipped through by re-testing each `b1.*` item against live state. |
| Migration drops a section the legacy file carried in an unusual format | A.3 step 10: parser counts source-section bytes vs preserved-section bytes; if delta exceeds tolerance, abort and surface. |
| `state.yaml` schema evolves and existing files become stale | `schema_version: 1` written by the migration script. Future schema changes provide a migration script keyed off `schema_version`. |
| HAM-style no-frontmatter cases hide in other audit files | Migration script logs a warning whenever it falls back to defaults. Subagent prompt requires the warning to appear in the reply. Scan run logs for warnings; manually correct `status` and `last_audit` if needed. |

---

## Appendix C: What this plan does NOT do

- **Does not touch catalog data.** No `semantius call crud` writes. No loaders. No Bun scripts that hit the live tenant. Pure file-tree restructure.
- **Does not run B1 pass 2.** That is a separate plan, to be written and executed against the post-migration state.
- **Does not reclassify legacy `b1.deferred` items.** Migration preserves whatever classification the legacy file carried. Pass 2 will analyze each deferred item and decide whether it should be retried, marked resolved, or moved to `b2.open` because it needs user judgment.
- **Does not touch Bucket 2 questions.** Those still await user decisions.
- **Does not reset `status: feedback_needed` → `status: passed`** on any audit. That is user judgment.
- **Does not collapse `audits/_*.md` files** (`_validate-cross-domain.md`, `_discover.md`, `_missing-domains.md`, `_apqc-in-use.md`). Those are catalog-wide artifacts and stay flat at the `audits/` root. `README.md` also stays at the root.
- **Does not change SKILL.md's Rule #0 to #20** — only path references that point to `audits/<DOMAIN>.md`.

---

## Hand-off checklist for the new session

When you start a fresh session to execute this plan:

1. `cd c:/dev/domain-map` and stay there for every command (Rule #6).
2. Read this plan top-to-bottom.
3. Read `CLAUDE.md` and `.claude/skills/domain-map-analyst/SKILL.md` for project rules.
4. Execute **Phase A**: edit `audits/README.md` + audit-path references across the 5 skill files + write the migration script. Do not delete or move any audit file yet.
5. Execute **Phase B**: dry-run ATS + HAM, manual review the four dry-run files, run the B.3 round-trip diff, promote to real, delete legacy, commit. **Stop and surface to user** for sign-off on the schema and parser quality.
6. On user sign-off, execute **Phase C** in 7-domain batches. Use the subagent prompt template in Appendix A. After all batches complete, run the verification block and commit.
7. Surface final aggregate: # migrated, # parser warnings logged, # files in `audits/` root after, total counts of `b1.open` / `b1.deferred` / `b2.open` / `b3.pending` across the catalog (so the user can size pass 2 from real numbers).
