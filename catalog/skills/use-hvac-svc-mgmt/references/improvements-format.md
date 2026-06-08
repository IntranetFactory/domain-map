# Improvements format

`improvements.md` is an append-only log of META-PATTERN learnings the skill applies on subsequent runs. Different from `lessons.md` (which captures tactical, single-call failures): improvements are procedural insights that change HOW the skill operates against THIS tenant.

The skill reads `improvements.md` on every invocation. Before attempting any operation whose trigger matches an improvement entry, the skill uses the improved approach **instead of** the default in `SKILL.md` or `references/*.md`. Improvements form the override layer on top of the stable procedure.

`SKILL.md` itself is never modified — the procedure manual stays stable; the learning lives here.

---

## When to append (vs. lessons.md)

| Symptom | File |
|---|---|
| ONE specific call failed; here's the correct form | `lessons.md` |
| A CLASS of operation needs a different approach | `improvements.md` |
| One bad parse: "I now know X" | `lessons.md` |
| Repeated false-positives during discovery: "I should ask the user differently" | `improvements.md` |
| Single typo in a filter: "use `eq.null` not `=null`" | `lessons.md` |
| Pattern across many entities: "the spec's pattern_flags miss `has_audit_trail` for compliance entities" | `improvements.md` |

Rule of thumb: if the same insight applies to the next 5 operations of the same kind, it's an improvement. If it's a fix for one specific failed call, it's a lesson.

---

## When NOT to append

- The improvement is actually a tenant-specific schema fact → record in `state.yaml` or `discovered.json` instead.
- The improvement is "the spec.json is wrong" → that's still an improvement, but ALSO worth flagging for HQ if universal (see "Upstream contribution" below).
- One-off user clarification ("user prefers shorter answers") → that's session-scoped, not a procedural pattern about the domain.
- The improvement contradicts a hard rule in `SKILL.md` (e.g. attempts to weaken Rule #20 overwrite protection). Hard rules are inviolable; improvements work within them, not around them.

---

## Format

One entry per learning. Each entry is a level-2 markdown heading with the date, followed by four labeled lines:

```markdown
## 2026-05-30 — Fuzzy-match noun-pair confusions need explicit disambiguation

**Observed:** Discovery Pass 2c fuzzy-matched `vendors` -> `suppliers` and `applicants` -> `candidates` across three recent runs, both times incorrectly merging entities the tenant deliberately keeps separate.

**Root cause:** The default fuzzy match relies on substring similarity in `singular_label`/`plural_label`. For noun-pair confusions where both names are common business vocabulary, similarity alone is too weak a signal.

**Improved approach:** When fuzzy match returns a candidate AND both the spec name and the live name appear in a curated noun-pair list (suppliers/vendors, applicants/candidates, accounts/customers, products/items, employees/staff, departments/units), surface BOTH descriptions side-by-side to the user AND show their lifecycle_states. Force explicit user confirmation; never auto-merge.

**When to apply:** Discovery Pass 2c, whenever the candidate match's name is one of the curated noun-pairs.
```

Four sections in this order:

- **Observed** — the pattern (multiple instances, not one-off). Concrete enough that a future run recognizes the trigger.
- **Root cause** — why the default approach falls short.
- **Improved approach** — the new procedure to apply.
- **When to apply** — the precise trigger condition under which this improvement overrides the default procedure.

Keep each entry under ~10 lines. Improvements are loaded on every invocation; bloat costs context forever.

---

## Sorting

Most recent first. The skill scans top-to-bottom and prefers recent improvements when two seem to overlap (the platform evolves; older improvements may be obsolete).

---

## When an improvement is wrong or obsolete

Strike it through and add a one-line note explaining why. Don't delete — the strike-through itself is information for future runs.

```markdown
## ~~2026-04-15 — Always batch handoff queries by source domain~~

Obsolete: as of 2026-05-20 the cube layer handles cross-domain joins efficiently; per-source batching is no longer needed.
```

---

## Upstream contribution (optional, never automatic)

When an improvement is genuinely universal (every tenant would benefit), the tenant can choose to push it upstream via the catalog's contribution channel. The skill **does NOT** auto-publish — that requires the human reviewing and deciding "yes, this is generic enough to share."

Until then, the improvement is local: this skill, this tenant.

---

## Relationship to `references/skill-changelog.md`

`improvements.md` is the operational learning layer (small, applied on every run). `skill-changelog.md` is the audit trail (when did this skill change, and why). When an improvement is significant enough to warrant audit context (e.g. a procedural change that future maintainers should understand), record the improvement here AND append a changelog entry pointing at it.
