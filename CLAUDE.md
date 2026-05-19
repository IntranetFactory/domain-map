# Project rules

## Memory is off-limits

Do **not** write to your file-based memory system (`~/.claude/projects/.../memory/`) for anything related to this project. No `MEMORY.md`, no `feedback_*.md`, no `project_*.md`, no `reference_*.md`. Memory entries are not committed, not reviewable, and not visible to other contributors — they invariably drift out of sync with the source of truth.

Every persistent note about this project — project conventions, hard-won lessons, gotchas, references, the "why" behind a decision — lives in **committed files**:

- Repo-wide rules go in this file (`CLAUDE.md`) at the project root.
- Skill-specific rules go in the relevant `.claude/skills/<skill>/SKILL.md`.
- Long-form reference material goes in `.claude/skills/<skill>/references/*.md`.

If you discover a gotcha or learn a non-obvious project fact, update the appropriate committed file. Never save it to memory "as well" — committed files are the only allowed location. If a rule would belong to memory under your default behaviour, ask yourself which committed file it belongs in instead, and put it there.

The same applies to "remembering" anything across conversations: if it's worth remembering, it's worth committing.

## Semantius CLI cwd

The `semantius` CLI reads `.env` from the **current working directory**. Always invoke it from the project root (`c:/dev/domain-map`). Never `cd` into a subfolder (`.claude/skills/...`, `.tmp_deploy/`, etc.) before running `semantius` or a loader script that spawns it — the CLI silently falls back to a default config pointing at a different tenant. See [.claude/skills/domain-map-analyst/SKILL.md](.claude/skills/domain-map-analyst/SKILL.md) rule #6 for the full symptom list.
