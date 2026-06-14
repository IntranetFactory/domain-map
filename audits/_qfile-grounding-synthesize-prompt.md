# Session prompt: ground the SYNTHESIZE q-file questions

These ~32 market-shape q-questions have a flagship-vendor surface already named in
their `history.md`, but it was never mapped to the specific decision, so the q-file
recommendation reads as build-convenience. The work is to REASON over the existing
vendor surface and write the mapping into the q-file `Recommended:` line. No fresh web
research is needed (that is the RESEARCH set, a separate session). See
[_qfile-grounding-worklist.md](_qfile-grounding-worklist.md) for the classification.

A few of these are "synthesize + spot-check": the right vendors are named but one
packaging fact is not in history. A single targeted lookup is fine; you do not build a
vendor surface from scratch.

## How to run

Orchestrate one subagent per domain (or small batch). Spawn with `subagent_type:
general-purpose`. Each subagent gets the prompt below with `<CODE>` and its question id(s)
substituted. Subagents work disjoint files; run a batch, review, then the next. Do not
launch a second writer wave before the prior one's output is committed (CLAUDE.md).

After all are done: `bun run scripts/analytics/qfile_grounding_lint.ts <CODE>` should be
clean (or only show non-market-shape WARN leaks) for each touched domain.

## Items (domain : question ids)

- COLLAB-GOV : q4
- DATA-AI-PLAT : q6
- DAM : q1   (reclassified from copy: history vendor evidence argues for MORE modules than the recommended 2-module option; this is a real decision, re-rank if the evidence does not support option a)
- DSPM : q1  (reclassified from copy: same shape as DAM q1; Cyera/Securiti/BigID evidence argues for more modules)
- EAM : q1
- ESIGN : q1
- EXPENSE : q1
- FIN : q1
- FLEET-MGMT : q3
- FSM : q4
- HAM : q13
- HC-PATIENT : q1, q13
- KGP : q2
- MDM : q1, q5
- MSP-PSA : q3
- NPMD : q3
- OBS : q10
- OMS : q1, q2
- PORT-MONIT : q1
- PROC-MIN : q2
- PS-LIC : q1
- REAL-EST : q12
- SECOPS : q2, q3
- SKILLS-MGMT : q1
- SPEND-MGMT : q1
- SUB-MGMT : q1, q15
- SUP-LIFE : q1

## Per-domain subagent prompt (substitute <CODE> and <QIDS>)

```
You are grounding market-shape q-file recommendations for domain <CODE> in the
domain-map catalog. cwd is already c:/dev/domain-map. Do NOT cd. Do NOT call any
database / semantius / mcp__* tool. Do NOT run git checkout/reset/clean/restore/stash.
No Python. No em-dashes (U+2014); American English. Vendor/product names ARE allowed in
q-files (Rule #18 bars them only from catalog text fields, not audit files).

Questions to ground: <QIDS>.

For each question id:
1. Read audits/<CODE>/q-<CODE>.md (the question, its options, the current Recommended
   line) and audits/<CODE>/history.md (the vendor surface). Grep history for the
   flagship vendor names, "Vendor-surface basis", "Modularization", "MISSING", and any
   candidate tables.
2. The flagship vendors are already named in history but NOT mapped to this decision.
   REASON over them: how do the named vendors actually package this market along the axis
   the question asks about (module split/count, what is in scope, what is mastered vs
   consumed, promote-to-domain)? Name the specific vendors and which side of the split or
   ownership each falls on. If one packaging fact is genuinely missing from history, a
   single targeted web lookup to confirm it is allowed; do not build a vendor surface
   from scratch (that is the research set).
3. Verify the mapped evidence SUPPORTS the current recommended option (the letter after
   "Recommended:").
   - If it supports it: use Edit on audits/<CODE>/q-<CODE>.md to rewrite ONLY the reason
     portion of that question's Recommended line so it LEADS WITH the named-vendor
     mapping, 1 to 3 sentences. Keep the option letter, the question, the options, the
     a<N>: line, and the footer unchanged. Keep it a single line starting "Recommended:
     <letter>. ". Never use "cleanest", "minimal shape", "unblocks the build", "maps
     cleanly onto", "small enough to own".
   - If the evidence CONTRADICTS the recommended option: the recommendation is wrong.
     Rewrite the Recommended line to the option the vendor evidence actually supports,
     with the named-vendor reasoning, and note in your report that you flipped it (the
     user reviews via the q-file).
4. ALSO populate state.yaml: open audits/<CODE>/state.yaml, find the b2 item whose id the
   q-file footer maps this question to (the "<!-- agent map ... -->" comment), and add an
   "evidence:" field to that item carrying the same named-vendor grounding (one or two
   sentences). Make ONLY that additive change; do not touch other items, do not reorder,
   do not change record_status. If the YAML edit is risky, skip it and say so in your
   report (the q-file grounding is the must-have).

Output (final message): one line per question id:
  <CODE> <q>: GROUNDED (kept <letter>) | FLIPPED (<old> -> <new>) | NOT-FOUND
For GROUNDED/FLIPPED append the new Recommended line. For NOT-FOUND explain what was
missing (this escalates the item to the research set).
```
