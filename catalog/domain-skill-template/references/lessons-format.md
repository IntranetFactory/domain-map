# Lessons format

`lessons.md` is an append-only log of non-obvious pitfalls the skill encountered while operating against this tenant's deployment. The point: spend one round-trip discovering a mistake, never repeat it.

The skill reads this file in full on every invocation (it's small) and treats each entry as a constraint to apply going forward.

---

## When to append a lesson

Append a lesson when ALL of the following are true:

1. The skill attempted a `semantius` call (or any other action) and it failed in a way that wasn't obvious from the catalog enums or spec.json.
2. The cause is now understood and reusable (not a transient network blip, not a one-off typo).
3. A future session would benefit from knowing this BEFORE attempting the same action.

Do NOT append a lesson for:
- Errors already covered by the spec.json's `enums` section. The spec.json is the right place for catalog enum values; lessons are for things facts can't capture.
- One-off user mistakes ("user gave me a malformed JSON, I asked, they fixed it"). Lessons describe the platform or tenant, not the conversation.
- Anything that should be a fix to `state.yaml` instead (e.g. "entity X was renamed to Y" -> belongs in `state.entity_renames`, not in lessons).
- Errors caused by stale `state.yaml`. Trigger a rediscovery instead.

---

## Format

One lesson per entry. Each entry is a level-2 markdown heading with the date, followed by three labeled lines:

```markdown
## 2026-05-30 — PostgREST filter syntax for nested NULL checks

**Observed:** Tried `filters=approved_by=is.null` to find unapproved offers; got HTTP 400 with `failed to parse filter (is.null)`.

**Cause:** PostgREST requires the literal `null` (lowercase) and the dotted operator form. The leading `=` is wrong.

**Rule:** For null checks on top-level fields, use `<field>=is.null`. For nested fields via embedded resources, use `<resource>.<field>=is.null`. Never use `=is.null` (with the spurious leading `=`).
```

Three sections, in this order:

- **Observed** — what the skill did and what happened. Concrete enough that a future session recognizes the situation.
- **Cause** — why it happened. One sentence.
- **Rule** — the actionable constraint to apply going forward. Written in the imperative.

Keep each lesson under ~6 lines. Lessons are loaded on every invocation; bloat costs context on every run forever.

---

## Sorting

Most recent first. The skill scans top-to-bottom and prefers recent lessons when two seem related (the platform evolves; old lessons may be obsolete).

---

## When a lesson is wrong or obsolete

Strike it through and add a one-line note under it explaining why. Don't delete — the strike-through itself is information for future sessions.

```markdown
## ~~2026-04-15 — Cube DSL `inDateRange` requires ISO format~~

Obsolete: as of 2026-05-20 the cube layer accepts both ISO and relative date strings (`"last 6 months"`).
```

---

## Promoting a lesson to facts

If a lesson turns out to be universal (every tenant would hit it), it should move out of `lessons.md` and into either:
- The HQ-emitted spec.json (if it's domain-specific), or
- The platform-level `use-semantius` skill (if it's CLI-wide)

Tenants can flag candidates for promotion via the catalog's contribution channel. The skill does not auto-publish lessons upstream.
