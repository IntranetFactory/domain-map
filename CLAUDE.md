# Project rules

## Never discard uncommitted work (git is not a cleanup tool)

**Never run any command that discards working-tree changes without the user's explicit, in-the-moment approval.** This is absolute, no exceptions. The banned commands include (any form, any path, any flag): `git checkout -- <path>`, `git checkout .`, `git restore`, `git reset --hard`, `git reset` (when it would unstage/lose work), `git clean`, `git stash drop/clear`, and `git checkout <branch>` when it would overwrite local changes. **`git checkout -- audits/` (or any path) is specifically forbidden.** Uncommitted edits are unrecoverable once discarded; one such command destroyed an entire session of audit work.

If the working tree looks wrong, messy, or "cascaded", **do not try to fix it by reverting.** Stop, run read-only diagnostics (`git status`, `git diff`), and report to the user with what you see. Let the user decide. Reverting another worker's changes is never your call.

This binds **every subagent** too. When dispatching subagents:
- Tell each subagent it may edit ONLY its own assigned files, and that running `git checkout`/`reset`/`clean`/`restore`/`stash drop` is forbidden.
- When multiple writers run in parallel against the shared tree, never run any command that could wipe an earlier wave's uncommitted output (Rule #1 above already covers this). The protection is the ban on destructive commands, **not** an auto-commit. If you think a checkpoint is warranted before the next wave, stop and ask the user to review and commit; do not commit on your own.

## Never commit without explicit instruction

Do **not** run `git commit` (or `git push`, `git merge`, `git rebase`, `git tag`, or any other history-writing command) unless the user has told you to **in that moment**. The normal workflow is: the agent makes changes and leaves them uncommitted in the working tree; **the user reviews the work and commits it.** Approval to make an edit is never approval to commit it, and finishing a task is never a cue to commit. This binds every subagent too. If you believe a commit or checkpoint is warranted, say so and let the user decide.

## Memory is off-limits

Do **not** write to your file-based memory system (`~/.claude/projects/.../memory/`) for anything related to this project. No `MEMORY.md`, no `feedback_*.md`, no `project_*.md`, no `reference_*.md`. Memory entries are not committed, not reviewable, and not visible to other contributors. They invariably drift out of sync with the source of truth.

Every persistent note about this project (project conventions, hard-won lessons, gotchas, references, the "why" behind a decision) lives in **committed files**:

- Repo-wide rules go in this file (`CLAUDE.md`) at the project root.
- Skill-specific rules go in the relevant `.claude/skills/<skill>/SKILL.md`.
- Long-form reference material goes in `.claude/skills/<skill>/references/*.md`.

If you discover a gotcha or learn a non-obvious project fact, update the appropriate committed file. Never save it to memory "as well": committed files are the only allowed location. If a rule would belong to memory under your default behavior, ask yourself which committed file it belongs in instead, and put it there.

The same applies to "remembering" anything across conversations: if it's worth remembering, it's worth committing.

## No em-dashes

The em-dash character (`—`, U+2014) is **forbidden everywhere** in this project. Never write one. Use a comma, parenthesis, colon, or sentence break instead. This applies to:

- All prose: code comments, docs, plan files, commit messages, PR descriptions.
- All emitted artifacts: generated blueprints, loaders, SQL.
- All catalog data written via `semantius`: descriptions, notes, labels, business_logic fields. If you author a description and it contains an em-dash, rewrite it before loading.

The blueprint emitter at [scripts/generate_blueprints.ts](scripts/generate_blueprints.ts) sanitizes em-dashes from DB-sourced content at render time as a safety net, but don't rely on that: keep them out of the source data.

En-dashes (`–`, U+2013) and ASCII hyphens (`-`) are fine. The rule is specifically about the em-dash.

## American English only

Write in **American English** for every artifact in this project (prose, code comments, docs, commit messages, plan files). No British spellings. Common ones to remember: `normalize` (not normalise), `analyze` (not analyse), `organize` (not organise), `materialize` (not materialise), `categorize` (not categorise), `behavior` (not behaviour), `color` (not colour), `center` (not centre), `catalog` (not catalogue), `modeled`/`labeled`/`canceled` (single-l), `program` (not programme), `license` (verb and noun, not licence), `defense` (not defence), `optimize` (not optimise), `recognize` (not recognise). When in doubt, check.

## Semantius CLI cwd

The `semantius` CLI reads `.env` from the **current working directory**. Always invoke it from the project root (`c:/dev/domain-map`). Never `cd` into a subfolder (`.claude/skills/...`, `.tmp_deploy/`, etc.) before running `semantius` or a loader script that spawns it: the CLI silently falls back to a default config pointing at a different tenant. See [.claude/skills/domain-map-analyst/SKILL.md](.claude/skills/domain-map-analyst/SKILL.md) rule #6 for the full symptom list.

**Equally important: do not `cd` *into* the project root either.** Your shell's cwd is **already** `c:/dev/domain-map`. Never prefix Bash commands with `cd c:/dev/domain-map &&`, `cd C:/dev/domain-map &&`, `cd "c:/dev/domain-map" &&`, `cd /c/dev/domain-map &&`, or any case/quoting/slash variant. This prefix is ceremony, adds nothing, and forces a permission prompt for the user. Call `semantius`, `bun`, `yq`, `git`, `grep`, etc. directly with no `cd` prefix. The same applies inside any subagent you dispatch.

## Review, audit and validate never change catalog data

A request to **review / audit / validate / check / report on** a domain (or the catalog) is **read-only on the catalog**: no row is inserted, updated or deleted. It diagnoses and produces an **actionable report** for your approval:

- `domain_health.ts --domain <CODE> --record` (it writes only the `checks:` block of `audits/<CODE>/state.yaml`);
- a dated section in `audits/<CODE>/history.md`;
- `audits/<CODE>/state.yaml` with every agent-doable fix as a `b1a` item carrying the exact rows it would write, every decision as a `b2`, and research ideas as `b3`;
- `audits/<CODE>/q-<CODE>.md` listing every proposed change as a question you can approve: additive fixes grouped into yes/no batches, each destructive change and each decision on its own.

**Catalog writes happen only after approval**, and only for the items approved: an answered `a-` file (SKILL.md Rule #22), or an explicit request that names what to apply ("apply the approved ATS fixes", "fix X"). Approved additive work lands at `record_status='new'`; destructive work (DELETE, overwrite a non-empty value, replace/restructure) needs its own explicit approval per item; nothing is ever stamped `approved` (Rule #1). A request about one module or one finding is scoped to that module or finding, never widened to the whole domain. Full contract: [domain-map-analyst SKILL.md](.claude/skills/domain-map-analyst/SKILL.md) Rule #21.
