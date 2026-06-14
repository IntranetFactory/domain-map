# Session prompt: ground the SYNTHESIZE q-file questions

Authoritative list (re-derived 2026-06-14 from the tightened lint + state.yaml bucket
parse + a per-question classification pass; supersedes the first draft). Each item is a
genuine **market-shape b2 decision** whose `history.md` already NAMES the flagship vendors
but never mapped them to the decision, so the q-file `Recommended:` reads as
build-convenience. The work is to REASON over the existing vendor surface and write the
mapping into the q-file `Recommended:` line and the matching `state.yaml` b2 `evidence`
field. No fresh web research is needed (the research set is empty, see
[_qfile-grounding-research-prompt.md](_qfile-grounding-research-prompt.md)). Occasionally a
single targeted lookup confirms one packaging fact; that is allowed, building a vendor
surface from scratch is not.

Each row gives the **evidence target** (the `state.yaml` b2 id to attach `evidence:` to)
and a history pointer, so the subagent does not have to resolve the footer itself.

**ID-notation note.** Footer ids are q-file shorthand; the `state.yaml` id may carry a
descriptive suffix or a sub-question `.tag` (e.g. footer `B2-4` vs state `B2-4-LP-REPORTING-MODULARIZATION`;
`B2-5.split` vs state `B2-5`). Strip the suffix/`.tag` and match the b2 item by its decision;
the prompt's step-5 fallback already does this, so do not report a spurious `state-skip`.

**Known residual WARNs that are NOT in this list (do not re-add them on a re-derivation):**
GRC q1 is already Phase-0-grounded inline and only WARNs on a leftover "cleanest" phrase
(DEPHRASE-only, and its footer maps to b3, so no b2 evidence applies); NPMD q4 is
naming-arbitration and WSC q1 is a notes revert (both not-a-gap).

## How to run

One subagent per domain (or small batch). `subagent_type: general-purpose`. Disjoint
files, so run them concurrently; commit a wave before launching the next (CLAUDE.md). After
each domain: `bun run scripts/analytics/qfile_grounding_lint.ts <CODE>` must come back clean
of that question (a residual non-market WARN on a different q is fine).

## Items

| domain | q | evidence target (b2 id) | history pointer (vendors already named) |
|---|---|---|---|
| CAFM | q6 | B2-LEASE-UTIL-OWNERSHIP | 2026-05-30 Bucket2 #6 / ENERGY-MGMT candidate (ENGIE Impact, Schneider, Accruent Lucernex, Eptura, Watershed) |
| COLLAB-GOV | q4 | B2-5 | 2026-06-13 Phase 0 + Bucket2 (AvePoint, ShareGate, Syskit Point, CoreView, Orchestry, Rencore) |
| DAM | q1 | B2-1 | 2026-05-30 Bucket2 #1 (Bynder, Brandfolder, Frontify, Adobe AEM, Cloudinary, Widen). NOTE: was NOT-FOUND in the copy pass because the named vendors argue for MORE modules than the recommended 2-module option a, re-rank if the evidence does not support a. |
| EAM | q1 | B2-MODSPLIT | 2026-05-30 B1-S1 (IBM Maximo, Hexagon, IFS, AVEVA APM, SAP PM) |
| ESG | q1 | B2-4 | 2026-05-30 (Persefoni, Sphera, Envizi, Watershed, Workiva, EcoVadis; accounting-first vs disclosure-first axis) |
| ESIGN | q1 | B2-S2 | 2026-05-30 (DocuSign, Adobe Sign, Dropbox Sign, PandaDoc, SignNow, OneSpan; single-product market) |
| EXPENSE | q1 | B2-S2 | 2026-05-30 + SPEND-MGMT neighbor (Brex, Ramp, Mesh, Airwallex; corporate-card-program scope) |
| FIN | q1 | B2-MODULE-SPLIT-CONFIRM | M2 L90-91 (S/4HANA, Oracle Fusion, NetSuite, Workday, D365 Finance). Compound footer (also B3-MISSING-MASTER-AR-AP); attach evidence to the b2 id only. |
| FLEET-MGMT | q3 | B2-VEHICLE-INSPECTIONS-DVIR | L20-24 (Samsara, Geotab, Motive [strongest DVIR], Verizon Connect, Fleetio) |
| FSM | q4 | B2-MOBILE-TECH-SPLIT | L138-146 (ServiceTitan, Salesforce FS, ServiceMax, IFS, Praxedo) |
| HC-PATIENT | q1 | B2-1-MODULE-SPLIT | L8/L20-23 (Epic, Oracle Health/Cerner, MEDITECH, Athenahealth, eClinicalWorks, Innovaccer). Compound footer (also B3-M1); attach evidence to the b2 id only. |
| KGP | q2 | B2-S2 | L8 (Stardog, TopBraid, Anzo, GraphDB, AllegroGraph, Neo4j) |
| MDM | q1 | B2-S2 | Vendor-surface basis (Informatica, Reltio, Profisee, Stibo, Semarchy) |
| MDM | q5 | B2-S4 | B2-S4 (MDM vs CDP; Customer-360 vs Identity-Resolution). Weaker: CDP-side surface thin, may need one lookup or a NOT-FOUND. |
| MSP-PSA | q3 | B2-S7 | B2-S7 / B1-S10 (ConnectWise Dispatch, Autotask, Halo Dispatch model a first-class dispatch entity). NOTE: Recommended already names these vendors; likely DEPHRASE-only (delete "cleanest"), not a re-ground. |
| NCDB | q5 | B2-S4 | Vendor-surface basis (Airtable, Notion, Coda, SmartSuite) |
| NPMD | q3 | B2-NETWORK-DEVICES | Vendor-surface basis (ThousandEyes, Kentik, NETSCOUT; master vs CMDB) |
| OMS | q1 | B2-S4 | Vendor-surface basis (Salesforce OM, IBM Sterling, Manhattan, Fluent) |
| PORT-MONIT | q1 | B2-4 | Vendor-surface basis (Cobalt LP, Chronograph, Allvue; GP-vs-LP). If b2 id not found verbatim in state.yaml, match the b2 item by the decision. |
| PROC-MIN | q2 | B2-CAPABILITIES | Vendor-surface basis (Celonis, Signavio, UiPath; Skan.ai task-mining) |
| PROD-MGMT | q7 | B2-31-4 | solutions (Dragonboat, Aha) + SPM neighbor (roadmap_items PROD-MGMT vs SPM) |
| PS-LIC | q1 | B2-1 | Vendor-surface basis (Accela, OpenGov, Tyler EnerGov, ServiceNow PSDS, CitizenServe) |
| PSA | q1 | B2-S3 | B1-S1/M5 + ASC 606 (Kantata, Certinia, NetSuite OpenAir, Deltek; revenue-rec PSA contributor vs co-master with SUB-MGMT) |
| RPA | q1 | B2-S1 | B2-S1 (UiPath Assets, Automation Anywhere Control Room, Blue Prism vault). NOTE: already vendor-grounded in the copy pass, it only flags because the reason retains a build-convenience phrase ("keeps each area cleanly owned"); the fix here is just to delete that phrase, not re-ground. |
| SECOPS | q2 | B2-2 | Pass 2 + B2-2 (Splunk, Sentinel, CrowdStrike, QRadar, Exabeam, Darktrace) |
| SECOPS | q3 | B2-3 | B2-3 (Splunk SOAR, Palo Alto XSOAR) |
| SKILLS-MGMT | q1 | B2-5.split | B2 item5 + B3-1 (Lightcast, TechWolf, 365Talents; ontology-versioning 3rd module). If the b2 id is not found verbatim, match by the decision. |
| SPEND-MGMT | q1 | B2-S1 | B2-S1 (Brex, Ramp, Airbase, Coupa; reimbursement boundary vs Expense) |
| SUB-MGMT | q1 | B2-S5 | B2-S5 (Metronome, Orb, Lago for metering; Maxio, RightRev for rev-rec) |
| SUP-LIFE | q1 | B2-S1 | B2-S1 (HICX, Ariba SLP, Coupa SIM, Ivalua, Jaggaer) |
| TPRM | q3 | B2-3 | B2 #3 (OneTrust, ProcessUnity, Whistic; vendor/suppliers shared-master collision) |
| VMS | q1 | B2-1 | B2-1 (Workday VNDLY, SAP Fieldglass, Beeline, Magnit, Utmost; staffing-requisition identity) |
| VMS | q2 | B2-4 | B2-4 + B1-S1 (two-module split derived from VMS vendor packaging) |

## Per-domain subagent prompt (substitute <CODE>, <QID>, <B2_ID>, <POINTER>)

```
You are grounding a market-shape q-file recommendation for domain <CODE>, question <QID>,
in the domain-map catalog. cwd is already c:/dev/domain-map. Do NOT cd. Do NOT call any
database / semantius / mcp__* tool. Do NOT run git checkout/reset/clean/restore/stash. No
Python. No em-dashes (U+2014); American English. Vendor/product names ARE allowed in
q-files (Rule #18 bars them only from catalog text fields).

Grounding already named in history: <POINTER>.
state.yaml evidence target (b2 id): <B2_ID>.

1. Read audits/<CODE>/q-<CODE>.md (<QID>: question, options, current Recommended line) and
   audits/<CODE>/history.md around the pointer above to pull the named-vendor surface.
2. If the current Recommended reason ALREADY names the flagship vendors and only trips the
   gate because it retains a build-convenience phrase ("cleanest", "minimal shape",
   "unblocks the build", "maps cleanly onto", "small enough to own", "keeps each area
   clean"), just DELETE that phrase. Do not rewrite an already-grounded reason.
3. Otherwise REASON over the named vendors: how do they package this market along the axis
   the question asks (module split/count, scope, master-vs-consume, promote-to-domain)?
   Name the specific vendors and which side of the split/ownership each falls on. One
   targeted web lookup to confirm a single missing packaging fact is allowed; do not build
   a vendor surface from scratch.
4. Verify the evidence SUPPORTS the current recommended option (the letter after
   "Recommended:").
   - If yes: Edit audits/<CODE>/q-<CODE>.md, rewriting ONLY the reason of <QID>'s
     Recommended line so it LEADS WITH the named-vendor mapping, 1 to 3 sentences. Edit ONLY
     the text after "Recommended: <letter>. "; keep the option letter, the question stem
     (including any "(answer this first)" prefix), the options list, the a<N>: line, and the
     footer comment unchanged. Single line. No build-convenience phrases.
   - If the evidence CONTRADICTS the option: rewrite the Recommended line to the option the
     evidence supports, with the named-vendor reasoning, and report that you flipped it
     (the user reviews via the q-file). Keep options and footer unchanged either way.
   - If history genuinely lacks a usable surface for the axis: do not edit; report
     NOT-FOUND (it escalates to a research item).
5. state.yaml: open audits/<CODE>/state.yaml, find item id <B2_ID> (it is a b2 item). Add
   an "evidence:" field carrying a one or two sentence version of the named-vendor
   grounding. Additive change to that one item only; do not reorder, do not touch other
   items, do not touch record_status. If <B2_ID> is not present verbatim, find the b2 item
   matching this question's decision and use it; if you cannot, skip the state.yaml step and
   say so (the q-file grounding is the must-have).
6. After editing, run: bun run scripts/analytics/qfile_grounding_lint.ts <CODE> and confirm
   <QID> no longer flags (a WARN on a different, non-market question is fine).

Output (final message): one line:
  <CODE> <QID>: GROUNDED (kept <letter>) | FLIPPED (<old> -> <new>) | DEPHRASED | NOT-FOUND | state-skip:<reason>
Append the new Recommended line.
```
