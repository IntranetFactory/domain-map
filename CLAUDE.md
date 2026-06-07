# Project rules

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
- All emitted artifacts: generated fact sheets, loaders, SQL.
- All catalog data written via `semantius`: descriptions, notes, labels, business_logic fields. If you author a description and it contains an em-dash, rewrite it before loading.

The fact sheet emitter at [scripts/emit_fact_sheet.ts](scripts/emit_fact_sheet.ts) sanitizes em-dashes from DB-sourced content at render time as a safety net, but don't rely on that: keep them out of the source data.

En-dashes (`–`, U+2013) and ASCII hyphens (`-`) are fine. The rule is specifically about the em-dash.

## American English only

Write in **American English** for every artifact in this project (prose, code comments, docs, commit messages, plan files). No British spellings. Common ones to remember: `normalize` (not normalise), `analyze` (not analyse), `organize` (not organise), `materialize` (not materialise), `categorize` (not categorise), `behavior` (not behaviour), `color` (not colour), `center` (not centre), `catalog` (not catalogue), `modeled`/`labeled`/`canceled` (single-l), `program` (not programme), `license` (verb and noun, not licence), `defense` (not defence), `optimize` (not optimise), `recognize` (not recognise). When in doubt, check.

## Semantius CLI cwd

The `semantius` CLI reads `.env` from the **current working directory**. Always invoke it from the project root (`c:/dev/domain-map`). Never `cd` into a subfolder (`.claude/skills/...`, `.tmp_deploy/`, etc.) before running `semantius` or a loader script that spawns it: the CLI silently falls back to a default config pointing at a different tenant. See [.claude/skills/domain-map-analyst/SKILL.md](.claude/skills/domain-map-analyst/SKILL.md) rule #6 for the full symptom list.

**Equally important: do not `cd` *into* the project root either.** Your shell's cwd is **already** `c:/dev/domain-map`. Never prefix Bash commands with `cd c:/dev/domain-map &&`, `cd C:/dev/domain-map &&`, `cd "c:/dev/domain-map" &&`, `cd /c/dev/domain-map &&`, or any case/quoting/slash variant. This prefix is ceremony, adds nothing, and forces a permission prompt for the user. Call `semantius`, `bun`, `yq`, `git`, `grep`, etc. directly with no `cd` prefix. The same applies inside any subagent you dispatch.

## Review/audit means fix it (not just report)

A request to **review / audit / validate / finish** a domain (or the catalog) means diagnose **and execute every fix the agent can do** in the same pass, leaving each domain either **agent-finished** (all changes at `record_status='new'`, awaiting only your approval) or **waiting on you** (a decision, or a destructive step needing sign-off). It never ends with a `b1a` to-do list or a plan. Only **report / check / "check only"** is read-only.

Additive/corrective work (insert rows, fill empty fields, classify, tag, author `record_status='new'` content) runs without asking. **Destructive work (DELETE, overwrite a non-empty value, replace/restructure) on ANY table is never done unapproved** (Rule #1 still holds: never stamp `approved`). `b3` (discretionary additive entities) and new-domain candidates are non-blocking ideas, never gate "finished", and are never a split (a split is a `b2` decision). Full contract: [domain-map-analyst SKILL.md](.claude/skills/domain-map-analyst/SKILL.md) Rule #21.
