# Bare-word audit (Phase B1, Step 4 task 1)

Scanned 747 data_objects rows; 0 bare-word candidates need triage.

Categories:
- **prefix-clash** — another data_object already takes a `_<bare>` form. These need a rename to remove ambiguity.
- **multi-domain** — the bare row is owned/embedded across ≥2 domains. Consider whether it should be promoted to a master + prefixed in non-owning domains, or claimed as canonical.
- **clear** — no clash, single-domain. Likely a true canonical bare-word; flag it with `is_canonical_bare_word=true` and a rationale, or leave alone if it is in fact bare-but-niche.

## prefix-clash (0)

_(none)_

## multi-domain (0)

_(none)_

## clear (0)

_(none)_
