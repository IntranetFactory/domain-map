# Session prompt: ground the RESEARCH q-file questions (Phase 0 required)

These 9 market-shape q-questions have NO usable vendor surface in their `history.md` for
the decision being asked, so they cannot be grounded by reasoning over existing material.
Each needs a fresh Phase 0 vendor-surface pass
([references/vendor-research-protocol.md](../.claude/skills/domain-map-analyst/references/vendor-research-protocol.md)),
then the q-file `Recommended:` line is grounded from it. See
[_qfile-grounding-worklist.md](_qfile-grounding-worklist.md) for the classification.

This session does NOT load any catalog structure. It produces a Phase 0 report and grounds
the q-file. The actual structural build happens later, only after the user answers the
q-file (Rule #21 / Rule #22).

## How to run

One subagent per domain (these need real web research, so do not batch many per agent).
Spawn `subagent_type: general-purpose`. Each writes its Phase 0 report to
`.tmp_deploy/<CODE>-phase0-<YYYY-MM-DD>.md`, then grounds the q-file. Pass the date in
(scripts cannot call Date.now reliably; the orchestrator supplies today's date).

## Items (domain : question id : the axis that needs a vendor surface)

- CAFM : q6 : lease / utility-data ownership (does a CAFM flagship master leases, or defer to a lease-accounting / IWMS tool?)
- COLLAB-GOV : q8 : which masters this domain should own vs consume (no vendor surface for the candidate masters)
- ESIGN : q7 : remote online notarization (RON) as its own market (name RON vendors: Notarize, Proof, etc., and whether they are a distinct category)
- FARMER-DIRECT-SALES : q8 : a Compliance module (is there a vendor surface, or is it purely regulatory-anchored?)
- NCDB : q5 : capability scope (what the no-code-database market actually spans, by vendor)
- MSP-PSA : q15 : CONTRACTS-overload split (do flagship PSA vendors separate contract types into distinct surfaces?)
- PROD-MGMT : q7 : where roadmap_items is mastered (PROD-MGMT vs an SPM tool; needs the SPM vendor surface)
- PS-LIC : q7 : parcel / GIS as a new domain (name the GIS / land-management vendors)
- UTIL-OPS : q7 : DERMS / utility-GIS as new domains (name the DERMS and utility-GIS vendors)

## Per-domain subagent prompt (substitute <CODE>, <QID>, <DATE>)

```
You are running a focused Phase 0 vendor-surface pass for domain <CODE> to ground one
q-file question, then grounding that question. cwd is already c:/dev/domain-map. Do NOT
cd. Do NOT call any database / semantius / mcp__* tool. Do NOT load anything to the
catalog. Do NOT run git checkout/reset/clean/restore/stash. No Python. No em-dashes
(U+2014); American English. Vendor/product names ARE allowed in q-files and Phase 0
reports.

Question to ground: <QID> in audits/<CODE>/q-<CODE>.md.

1. Read audits/<CODE>/q-<CODE>.md (<QID>: the question, options, current Recommended
   line) and skim audits/<CODE>/history.md so you do not repeat what is there.
2. Read .claude/skills/domain-map-analyst/references/vendor-research-protocol.md and run
   a Phase 0 pass SCOPED TO THE AXIS THIS QUESTION ASKS ABOUT (not the whole domain):
   enumerate 3 to 5 flagship vendors on that axis via web search + product docs, and
   determine how each packages the decision in question (which entity / module / market
   each treats as first-class vs not). For a regulated axis include a compliance
   specialist.
3. Write the findings to .tmp_deploy/<CODE>-phase0-<DATE>.md: the named vendors, a short
   per-vendor note on how they package this axis, and a one-paragraph verdict on the
   question with the vendor evidence behind it.
4. Use Edit on audits/<CODE>/q-<CODE>.md to rewrite ONLY the reason portion of <QID>'s
   Recommended line so it LEADS WITH the named-vendor evidence you found, 1 to 3
   sentences. Set the recommended option to whatever the evidence supports (keep the
   current letter if the evidence agrees; change it if it does not, and say so). Keep the
   question, options, a<N>: line, and footer unchanged. Single line starting
   "Recommended: <letter>. ". Never use "cleanest", "minimal shape", "unblocks the
   build", "maps cleanly onto", "small enough to own".
5. ALSO add an "evidence:" field to the matching b2 item in audits/<CODE>/state.yaml (map
   via the q-file footer "<!-- agent map ... -->" comment), carrying a one or two sentence
   version of the named-vendor grounding. Additive change only; do not touch other items
   or record_status. If risky, skip and say so.

Output (final message):
  <CODE> <QID>: GROUNDED (kept <letter>) | FLIPPED (<old> -> <new>)
  report: .tmp_deploy/<CODE>-phase0-<DATE>.md
  new Recommended line: <the line>
  vendors: <comma-separated flagship vendors you used>
```
```
