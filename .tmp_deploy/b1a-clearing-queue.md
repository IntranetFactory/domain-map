# b1a clearing queue (audited + modularized domains that flip to `user`)

Working queue for the batch b1a-clearing push. Source set = the 47 audited + modularized
domains whose b1a, once emptied, drops `next_action_by` to `user` (the48 minus REV-INTEL,
which is `blocked`). Process one subagent per domain, 5 per batch.

`.tmp_deploy/` is gitignored; this file is operational scratch, not committed catalog state.

## Policy correction baked into the prompt (read first)

Batch 1 surfaced a glitch: subagents parked drafted catalog UX copy in `history.md` and left
`catalog_tagline` / `catalog_description` EMPTY. That is now forbidden. Per revised Rule #20:
an EMPTY catalog UX field is WRITTEN directly with buyer-voice copy (record_status on the row
is the review signal; the user reviews in-record). Never park UX drafts in history; never
overwrite a NON-empty value. The prompt below already encodes this.

## Progress

- Batch 1 DONE (2026-06-05): ACCT-PRACT-MGMT, AGENCY-MGMT, B2C-COMM, BPA, CDP. All now `user`.
  (AGENCY-MGMT retains 1 b1a item, B1A-SYSTEM-SKILLS, blocked on user decision B2-S2.)
  Catalog UX for all 5 backfilled via `.tmp_deploy/backfill_catalog_ux_2026_06_05.ts`.
- Batch 2 DONE (2026-06-05): DAIRY-MGMT, DATA-AI-PLAT, DLP, DSPM, DXP. Ran as Wave 1
  (DAIRY-MGMT, DATA-AI-PLAT, DLP, DXP concurrent) + Wave 2 (DSPM alone) to keep the adjacent
  DLP/DSPM pair out of the same parallel wave. No JWT errors. Now `user` for 4 of 5.
  DAIRY-MGMT retains 1 b1a item (B1A-S11, lactation_records users-edge) effectively user-gated
  on a verb decision; its next_action_by stayed `agent` but it needs the user's verb choice.
  Catalog UX backfilled by each subagent (revised Rule #20: empty fields written directly).
  Constraint relearned: a `system` skill still requires `domain_id` NOT NULL even when
  module-anchored; set both domain_id and domain_module_id. tools.coverage_tier check enforced.
- Batches 3-11 DONE (2026-06-06): the remaining 36 domains processed in 9 parallel waves of 4
  subagents each (ATS skipped, b1a=0 no-op). Adjacency-safe batching: finance, real-estate,
  fleet/telematics, IT-ops/endpoint, data, marketing, HR, and food clusters were each split so
  no two cluster-mates ran in the same wave. No JWT errors in any wave.
  Wave members:
    W3 ERP-FIN, RE-CRE, FLEET-MAINT, ITOM | W4 EPM, RE-INVEST, FLEET-MGMT, RMM
    W5 EXPENSE, RE-PROP-MGMT, TELEMATICS, REMOTE-ACCESS | W6 FMIS, REAL-EST, KGP, UEM
    W7 SPEND-MGMT, MA, METRICS-LAYER, SAM | W8 HCMS, SMM, NCDB, VMS
    W9 WFM, LOYALTY, FOOD-TRACE, LCAP | W10 LMS, WEB-CONTOPS, FSQM, SALES-ENG
    W11 WORK-MGMT, ECM, VET-PRACT-MGMT, SMP
  34 of 36 flipped to `next_action_by: user`. Two stayed `agent` with a retained, effectively
  user-gated b1a item: ITOM (B1A-ROLE-MODULES, needs lifecycle + multi-module reach decision)
  and REMOTE-ACCESS (B6 cardinality + B11 alias-string picks).
  Catalog-UX follow-up: LOYALTY and SALES-ENG initially skipped their catalog-UX item on a
  stale `blocked_by: user_decision` annotation; both were finished in a cleanup pass (empty
  fields written directly per revised Rule #20). All other domains wrote empty catalog UX inline.

## Queue cleared

All 47 audited + modularized domains in the source set have had their agent-solvable b1a items
executed. Nothing left to launch. Re-query `next_action_by` per domain before assuming a domain
is fully `user`; several retain a single b1a item that is functionally user-gated (skipped, not
removed) and a few still report `next_action_by: agent` for that reason:

- next_action_by still `agent` (retained user-gated b1a): ITOM, REMOTE-ACCESS, DAIRY-MGMT
  (B1A-S11 from batch 2), AGENCY-MGMT (B1A-SYSTEM-SKILLS from batch 1).
- Common retained-but-user-gated b1a residuals elsewhere: FMIS (alias approval), RE-PROP-MGMT
  (B1A-REL-473, B1A-HANDOFF-296-TARGET), METRICS-LAYER (B1A-EMBED-SHELLS), WFM/FLEET-MGMT
  (sign_document + skill-retirement decision), FSQM (pattern flags), SPEND-MGMT (747 lifecycle),
  EPM (S7b/S10b), WORK-MGMT (APQC-deferred + phase0 tier). These need user decisions, not agent
  work; the broad cross-domain b2 queue is now the next front.

## Subagent prompt template (one agent per domain)

Substitute `<CODE>` and `<ID>` per row. subagent_type: `general-purpose`. Do not pair
handoff-adjacent domains in the same parallel wave.

```
You are executing pending technical fixes against the LIVE Semantius `domain_map` master
module (slug `domain_map`, module id 1001) for ONE domain: **<CODE>** (domains.id = <ID>).
This is load-bearing master data; treat every write seriously and conservatively.

FIRST, read and follow exactly:
- c:\dev\domain-map\.claude\skills\domain-map-analyst\SKILL.md (full rule set + Phase procedures)
- c:\dev\domain-map\CLAUDE.md (project rules)
Then read your work list: c:\dev\domain-map\audits\<CODE>\state.yaml. The `b1a` list is your
task list (agent-solvable pending actions). Skim `b1b`/`b2`/`b3` for context only; do NOT
execute those.

YOUR TASK: execute each `b1a` item per its `action`/`finding` text, following the matching
Phase procedure in SKILL.md (Phase S three-source derivation for system skills/tools/skill_tools
per Rule #17; Rule #12 for lifecycle states; B9/B10b for trigger_events/handoffs; B6/B8 for
data_object_relationships; H1 for handoff_processes APQC tagging).

NON-NEGOTIABLE RULES (violating any is a failure):
1. semantius CLI ONLY for every Semantius read/write:
   `semantius call crud postgrestRequest '{"method":"...","path":"..."}'`.
   NEVER call any `mcp__*` tool (Rule #0); they hit the wrong tenant.
2. NO `cd` prefix on any command. cwd is already c:/dev/domain-map. Never cd anywhere.
3. Multi-row writes go in a TypeScript loader run with `bun run <absolute-path>`. NEVER Python.
   Bash only for one-line CLI reads. Chunked array-body POST or stdin (Windows 32KB cmdline limit).
4. record_status: OMIT on every insert (DB default = "new"). NEVER set approved/pending/rejected (Rule #1).
5. NEVER write any column literally named `notes` (Rule #15). Leave it empty.
6. CATALOG UX (revised Rule #20): if a b1a item covers empty `catalog_tagline` /
   `catalog_description` on the domain row or its modules, WRITE the buyer-voice copy directly
   into the EMPTY field (workflow + value voice; no vendor/product names; no em-dashes). The
   row's record_status carries the review signal. Do NOT park the draft in history.md and do
   NOT leave the field empty. Apply an empty-guard per field: write only where the current
   value is empty; NEVER overwrite a non-empty value (that stays user-approval-only).
7. SKIP any b1a item whose `blocked_by` contains a `user_decision`; report it, don't execute.
8. DELETE rows ONLY when a b1a `action` explicitly instructs it. Before any DELETE or PATCH,
   snapshot the prior row values into history.md so the change is reversible.
9. Stay strictly within <CODE> scope. Do NOT author rows for other domains. The `tools` table
   is catalog-wide and shared (other subagents may run concurrently): re-read
   `/tools?tool_name=eq.<name>` immediately before creating any generic/reusable tool and link
   the existing row if present; only domain-specific `query_<entity>`/mutate tools are yours to
   create. Dedup every insert by natural key. Channel-vs-capability rule: default to
   `notify_person`/`notify_team`; link channel primitives only when the workflow requires that
   specific channel.
10. No em-dashes anywhere; American English.
11. JWT-audience error ("required audience not found") -> STOP immediately, include the verbatim
    error in your report, do not retry.
12. If a b1a item is ambiguous or needs judgment beyond its `action` text, SKIP it and explain.
    Do not guess on master data.

AFTER executing:
- Rewrite c:\dev\domain-map\audits\<CODE>\state.yaml: remove b1a items you FULLY resolved (UX
  items are resolved by writing the fields, not by leaving them open); keep skipped/blocked
  ones; recompute `next_action_by` by priority (agent if b1a non-empty > user if b2 > research
  if b3 > blocked if b1b > done); set `last_audit: "2026-06-05"`.
- Append a `## 2026-06-05 - b1a execution` section to history.md listing per item: tables +
  row ids written, prior values for any PATCH/DELETE, anything skipped.
- Re-query affected tables to verify counts.

Do NOT emit fact sheets and do NOT run a full audit. Only execute the listed b1a items.

RETURN a concise structured report:
- Per b1a id: DONE (tables + counts/ids) | SKIPPED (reason).
- Rows written per table (including any catalog UX fields written).
- New `next_action_by` for <CODE>.
- Any JWT/blocker/ambiguity.
```
