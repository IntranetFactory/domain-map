# Session prompt: ground the RESEARCH q-file questions (Phase 0 required)

## Status (2026-06-14): EMPTY. No items currently need fresh research.

The authoritative re-derivation (tightened lint + state.yaml bucket parse + per-question
classification pass) found **zero** market-shape q-questions that need a fresh Phase 0
vendor surface. Every genuine market-shape gap already has a named flagship-vendor surface
in its `history.md`, so it is a SYNTHESIZE item
([_qfile-grounding-synthesize-prompt.md](_qfile-grounding-synthesize-prompt.md)), not
research.

The first draft of this plan listed 9 items. All 9 were wrong:

- **6 were b3 "Optional" ideas, not b2 market-shape decisions** (ESIGN q7 RON, MSP-PSA q15
  contracts-split, FARMER-DIRECT-SALES q8 compliance module, UTIL-OPS q7 DERMS/GIS, PS-LIC
  q7 GIS, COLLAB-GOV q8). b3 promote-to-domain / research-and-add ideas live in the q-file
  "Optional (will not hold up the build)" section, are non-blocking, already carry
  `vendor_evidence`, and Rule #22 does not gate them. The lint now skips the Optional
  section, so they no longer flag.
- **The real market-shape question in those domains was a different q** (e.g. ESIGN's gap is
  q1 module-split, MSP-PSA's is q3 dispatch-master), and those are SYNTHESIZE items.
- **CAFM q6, NCDB q5, PROD-MGMT q7 are real b2 market-shape questions but their history
  already names the vendors**, so they are SYNTHESIZE, not research.

## When this plan applies again

A question belongs here only if ALL of these hold:
1. It is a genuine market-shape decision (module split/count, scope, master-vs-consume,
   promote-to-domain, where an entity is mastered).
2. Its q-file footer maps it to a `b2` item (not `b3` / not the Optional section).
3. Its `history.md` has NO usable named-vendor surface for that axis (a SYNTHESIZE subagent
   returned NOT-FOUND for it, or a fresh audit surfaced it with no Phase 0 behind it).

If the synthesize session returns any NOT-FOUND, those items land here. Re-run the
classification to refresh: `bun run scripts/analytics/qfile_grounding_lint.ts --all`, then
resolve each flagged question's footer to its state.yaml bucket and keep the b2 ones whose
history lacks a vendor surface.

**Known watch item.** MDM q5 (MDM-vs-CDP capability scope) is the most likely future
inhabitant: the synthesize plan flags it as having a thin CDP-side surface, so it may come
back NOT-FOUND and route here.

## Per-domain subagent prompt (kept for when an item does surface; substitute <CODE>, <QID>, <B2_ID>, <DATE>)

```
You are running a focused Phase 0 vendor-surface pass for domain <CODE> to ground one
q-file question, then grounding that question. cwd is already c:/dev/domain-map. Do NOT cd.
Do NOT call any database / semantius / mcp__* tool. Do NOT load anything to the catalog
(Rule #21: research produces the q-file and a Phase 0 report, never a direct catalog
write). Do NOT run git checkout/reset/clean/restore/stash. No Python. No em-dashes; American
English. Vendor names are allowed in q-files and Phase 0 reports.

Question to ground: <QID> in audits/<CODE>/q-<CODE>.md. Evidence target (b2 id): <B2_ID>.

1. Read audits/<CODE>/q-<CODE>.md (<QID>: question, options, current Recommended line) and
   skim audits/<CODE>/history.md so you do not repeat it.
2. Read .claude/skills/domain-map-analyst/references/vendor-research-protocol.md and run a
   Phase 0 pass SCOPED TO THE AXIS THIS QUESTION ASKS (not the whole domain): name 3 to 5
   flagship vendors via web search + product docs, and determine how each packages the
   decision (which entity/module/market each treats as first-class). Include a compliance
   specialist for a regulated axis. (This is a deliberate scoped subset of the full Phase 0
   protocol, sufficient to ground one axis, not the complete union-surface matrix.)
3. Write findings to .tmp_deploy/<CODE>-phase0-<DATE>.md: named vendors, a per-vendor note
   on how each packages this axis, and a one-paragraph verdict with the evidence.
4. Edit audits/<CODE>/q-<CODE>.md: rewrite ONLY the reason of <QID>'s Recommended line to
   LEAD WITH the named-vendor evidence, 1 to 3 sentences. Set the option to whatever the
   evidence supports (keep the current letter if it agrees; change and say so if not). Keep
   question, options, a<N>: line, and footer unchanged. Single line starting "Recommended:
   <letter>. ". No "cleanest / minimal shape / unblocks the build / maps cleanly onto /
   small enough to own".
5. state.yaml: add an "evidence:" field to item <B2_ID> (a b2 item) with a one or two
   sentence version of the grounding. Additive, that one item only; never touch
   record_status. If <B2_ID> is absent verbatim, match the b2 item by the decision; if you
   cannot, skip and say so.
6. After editing, run: bun run scripts/analytics/qfile_grounding_lint.ts <CODE> and confirm
   <QID> no longer flags.

Output (final message):
  <CODE> <QID>: GROUNDED (kept <letter>) | FLIPPED (<old> -> <new>)
  report: .tmp_deploy/<CODE>-phase0-<DATE>.md
  new Recommended line: <the line>
  vendors: <comma-separated flagships used>
```
