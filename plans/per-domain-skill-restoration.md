# Skill and tool grain: correct state and migration (FINAL, gate-free)

Status: FINAL plan, NOT executed. No manual gates: every off-target row has a deterministic in-pass
resolution. The only deferred work is re-authoring purged tool rows at module grain, which is normal
domain-audit work flowing into the standing audit backlog (tracked, not orphaned). Eight adversarial
review rounds informed this; the eighth returned SAFE-TO-EXECUTE-AS-IS (skill_tools accounting closes
exactly: 2767 = 624 + 226 + 1917). Condensed history at the end.

This plan fixes a real modeling mess: tool requirements are stored on per-module "skills" that should
not exist, the source-of-truth doc (SKILL.md) contradicts itself on skill grain, and ~150 audit files
encode the wrong target. It migrates to one coherent model and brings every off-target row to shape.

---

## 1. The correct state (the target model)

1. A tool is ATOMIC. The `tools` table is the single canonical store of tool definitions. Every other
   table only REFERENCES `tool_id`; nothing copies a tool. `domain_module_tools` and `process_tools`
   are m:n RELATIONSHIPS, not additional tool stores. `skill_tools` is RETIRED (dropped).
2. Tool requirements are m:n relationships from the unit that needs a tool to the atomic tool:
   - module <-> tool: `domain_module_tools`
   - process <-> tool: `process_tools`
3. The `skill` entity has two types: `system` and `process`. A `system` skill belongs to a
   DEPLOYABLE UNIT, of which there are two kinds:
   - a DOMAIN: one skill per domain (`domain_module_id` null), derives from the domain's FULL modules.
   - a STARTER module (`module_kind='starter'`): keeps its own skill anchored on the starter
     `domain_module_id`, derives from the starter module's own tools. Starters are independently
     deployable bundles of entities, sometimes within one domain (e.g. Hiring), sometimes across
     domains (e.g. Real Estate Agent, HVAC).
   FULL modules are NOT deployable units and get NO skill. A `process` skill is cross-domain, linked
   to its process via `skills.process_id`, and derives from that process's `process_tools`.
4. No skill stores tools. A skill DERIVES its toolset from the unit it represents, materialized only
   when the deployed skill TEMPLATE is generated (the template is the snapshot/cache).
5. Every domain has >=1 module (Rule #14). A zero-module domain is an audit gap (band M1), not a
   tool-bearing state; it carries no tool relationships until modularized.
6. Coverage / Semantius % is computed from the relationships (`domain_module_tools` rolled up over a
   domain's modules, `domain_modules.domain_id = X` UNION `domain_module_host_domains.domain_id = X`).
   NO fallback. A domain whose modules carry no tools reads as incomplete because it is incomplete.
   By design a cross-domain starter's tools count into every host domain's coverage (e.g. hvac module
   171 into domains 31/51/69/73/97); the UNION dedupes by module so it is not a within-domain
   double-count, but a host domain with empty full modules can read as covered purely via a hosted
   starter. Expected, not a bug.
7. `capability` stays the finer market-analysis layer (audited via `capability_domains` +
   `domain_module_capabilities`; Rule #14, checklist M4). Capabilities are NOT tool-bearing.

## 2. Current state vs correct (live, 2026-06-06)

- 315 skills = 312 `system` + 3 `process`.
- The 312 system = 251 anchored per-module (`domain_module_id` set) + 61 per-domain. The 251 = 246 on
  FULL modules (WRONG; dissolve) + 5 on STARTER modules (correct; keep). The 246 span 71 domains, 1:1
  with 246 full modules.
- `skill_tools` 2767 = 2013 on the 251 per-module skills (1927 full + 86 starter) + 528 on the 61
  per-domain skills (391 in 45 zero-module domains + 137 in 16 multi-module domains) + 226 on the 3
  process skills.
- The 5 starters: 220 real_estate_agent (cross-domain, hosts 26/69/143), 236 hvac_svc_mgmt
  (cross-domain, hosts 31/51/69/73/97), 226 hiring (ATS 56), 237 csa (158), 242 training_records
  (LMS 57).
- `domain_module_tools` and `process_tools` do NOT exist (clean create). `skill_tools.skill_id` and
  `.tool_id` are both `parent`/cascade. Only two tables reference `skills`: `skill_tools.skill_id` and
  `process_raci.actor_skill_id` (both cascade; 0 non-null actor_skill_id today).
- 2 of the 67 per-domain target names collide with existing full-module skills: domain 62 ->
  `emp-exp-system` (skill id 55, on module 64), domain 67 -> `expense-system` (skill id 57, on module
  191). `skill_name` is not unique. No other of the 67 targets collides.
- Verified clean: requirement_level only {required, optional}; record_status only {new}; 1:1
  skill<->module; no system skill has both domain_id and domain_module_id null; emit_fact_sheet.ts
  does NOT render per-module skills (dead `computeCoverage`, no call site).

## 3. What changes (overview, fully resolved, no gates)

- A. 246 full-module skills: migrate their 1927 tool rows to `domain_module_tools` (on each skill's
  full module); delete the 244 NOT reused as a domain skill (55/57 are reused, see E). Domain skill
  derives.
- B. 5 starter skills: KEEP. Migrate their 86 tool rows to `domain_module_tools` (on each starter
  module). Starter skill derives.
- C. All 528 per-domain-skill tool rows (137 multi-module + 391 zero-module): PURGE uniformly
  (snapshot first). They are pre-modularization domain-grain requirements; the authoritative way tools
  reach modules is the per-module tool authoring a domain audit performs, so re-authoring is standing
  audit-backlog work, NOT a review gate. Keep all 61 per-domain skills (toolless; they derive from
  their modules). Add domains lacking per-module tool authoring to the modularization/audit backlog.
- D. 3 process skills: create `process_tools`, create one value-stream `processes` row per skill, link
  `skills.process_id`, migrate the 226 rows to `process_tools`, delete their `skill_tools`. Process
  skill derives.
- E. 67 domains lacking a per-domain skill: create one. For domains 62/67 REUSE existing skills 55/57
  (null their `domain_module_id`) to avoid the name collision: net 6 reuse (72/91/130/149 + 55/57),
  65 new. The 4 domains 72/91/130/149 already have one.
- F. After A-E, `skill_tools` holds ZERO rows and is dropped. `tools`, `tool_solutions`, and
  capabilities are untouched.

## 4. Execution (ordered for minimal blast radius; no DB transaction; no gates)

Step 0 (snapshot + branch): pull and COMMIT to `plans/snapshots/` (create it; NOT gitignored
  `.tmp_deploy/`): all 315 skills (id, name, domain_id, domain_module_id, description, record_status)
  and all 2767 `skill_tools` (id, skill_id, tool_id, requirement_level, notes, record_status). Verify
  files + counts (skills == 315, skill_tools == 2767). Branch off `main`; commit the already-dirty
  SKILL.md separately first.
  HARD INVARIANT: NO destructive step (the Step-4 delete of 624 skill_tools = 528 per-domain + 10
  reused-skill + 86 starter; the Step-5 delete of the 226 migrated process rows; the Step-6 delete of
  244 skills + their 1917 cascading skill_tools) may run until this snapshot is committed AND verified
  to contain every row that step will remove. 624 + 226 + 1917 = 2767 = every skill_tools row. Nothing
  is destroyed that is not in the committed snapshot.

Step 1 (create the two junction entities): `create_entity` + `create_field`, mirroring
  `scripts/loaders/create_handoff_processes.ts` (both FKs `parent`/cascade; requirement_level enum
  {required, optional}; notes multiline; record_status enum {new, pending, approved, rejected};
  computed unique key; `module_id: 1001`; view/edit perms `domain_map:read`/`:manage`;
  `audit_log: false`):
  - `domain_module_tools` (domain_module_id -> domain_modules, tool_id -> tools; key domain_module_id.tool_id)
  - `process_tools` (process_id -> processes, tool_id -> tools; key process_id.tool_id)
  Idempotent skip-on-exists.

Step 2 (migrate the 2013 per-module tool rows): for each of the 251 per-module skills (full AND
  starter), insert its `skill_tools` into `domain_module_tools` keyed on the skill's `domain_module_id`
  (preserve requirement_level, notes, record_status). Dedup on the unique key. Verify count == 2013.

Step 3 (one system skill per deployable unit): keep the 5 starter skills as-is. For the 67 full-module
  domains lacking a per-domain skill, create one `system` skill (`domain_id` from the full-module
  skill, `domain_module_id` null, name `<domain_code_lower>-system`, description = domain runtime
  composer, no skill_tools). EXCEPTION: for domains 62/67 reuse skills 55/57 (null their
  `domain_module_id`) instead of creating new. Net 6 reuse, 65 new. Verify exactly one
  `domain_module_id`-null `system` skill per full-module domain; no duplicate names.

Step 4 (delete all `skill_tools` on KEPT skills, after Step 2 migrated them): FIRST verify the Step-0
  snapshot contains the target rows (by id), then delete 624 rows: (i) the 528 on the 61 per-domain
  skills; (ii) the 10 on reused skills 55/57 (migrated to `domain_module_tools` on modules 64/191 in
  Step 2); (iii) the 86 on the 5 starter skills 220/226/236/237/242 (migrated to `domain_module_tools`
  on modules 153/154/171/172/182 in Step 2). (ii) and (iii) are lossless (already migrated) and
  required so NO system-skill `skill_tools` survive on any kept skill. Keep all 61 per-domain skills
  AND the 5 starter skills (now toolless; they derive). The 244 full-module skills' rows are removed by
  cascade in Step 6; the 226 process rows in Step 5. Add domains lacking per-module tool authoring
  (45 zero-module + 12 un-authored multi-module) to `audits/_modularization-backlog.md` so re-authoring
  is tracked. (Row accounting: 624 here + 226 Step 5 + 1917 Step-6 cascade = 2767 = all `skill_tools`.)

Step 5 (process agents -> process_tools): create exactly 3 `processes` rows for the value streams,
  each with ALL not-null fields populated (no `value_stream` enum exists; the legal non-APQC value is
  `custom`): `source_framework='custom'`; a unique `process_key` (`employee_jml_value_stream` /
  `opportunity_l2c_value_stream` / `case_service_value_stream`); `process_name`; `description`;
  `process_code`; `external_id`; `external_url=''`; `hierarchy_level=1`; `parent_process_id` null.
  Then set skills 124/125/126 `process_id` to the matching new row, migrate each skill's `skill_tools`
  (107/67/52 = 226) into `process_tools` keyed on the process, then delete those 226 `skill_tools`.
  Verify `process_tools` count == 226 and the 3 skills retain process_id.

Step 6 (delete the remaining full-module skills): re-assert `process_raci.actor_skill_id` is still 0
  non-null, then, AFTER Steps 3 and 5, delete every `system` skill whose `domain_module_id` is not null
  and whose module is NOT a starter. This is 244 (= 246 minus 55/57 reused). Delete BY PREDICATE, not a
  pre-captured id list. `skill_tools` cascade. Descriptions preserved in the Step-0 snapshot. Verify:
  the ONLY remaining `domain_module_id`-not-null system skills are the 5 starters; `skill_tools` now
  holds 0 rows -> drop/deprecate it.

Step 7 (repoint docs and scripts; live-grep, do not edit from memory):
  - SKILL.md per-module assertion sites to rewrite to "one skill per deployable unit (domain + starter),
    tools on modules, processes via process_tools": Rule #17 (409-423), Rule #19 #6 (486, reframe:
    starters keep a skill) and the upgrade clause at 490 ("ships ... the full module's system skill"
    becomes false: reword to the host domain's skill), Phase S (700-704), F-band F1/F2/F3 (1094-1109),
    581/583, 608, 760. Line 609
    is correct grain, wrong source: repoint to `domain_module_tools`. Line 765 (S2 indirect-table
    coverage) is NOT about skills: do NOT touch.
  - F3 rewrite: "the domain's modules carry >=1 `domain_module_tools` (non-empty derived union)". F1/F2
    must EXEMPT starter-anchored skills: the "no module-anchored system skill" check becomes
    `domain_module_id IS NOT NULL AND module_kind != 'starter'`; mirror in `audit_backlog.ts` F2, or the
    audit flags the 5 starters and instructs deleting them.
  - `audits/_modularization-backlog.md` L102 and the ~150 audit files (109 `state.yaml`, ~326
    occurrences, + ~150 history/other `.md`) carrying OPEN per-module-skill action items ("author one
    `<module_code>_agent` per module, then DELETE the domain-level skill"; e.g. EMP-EXP B2-S6): a
    scriptable pass that ENUMERATES and SUPERSEDES every one, cancelling the per-module instruction, or
    a future audit pass undoes this migration. Correct the history of domains that already executed it
    (BPA, DAIRY-MGMT).
  - Rewrite `scripts/analytics/coverage_rollup.ts` (read `domain_module_tools` rolled to domain incl.
    host_domains; per-domain unit; NO fallback; reuse the `m11_rollup_probe.ts` host_domains idiom) and
    `scripts/analytics/audit_backlog.ts` (F2 = module without `domain_module_tools`, starters exempt).
    Run both BEFORE (baseline) and AFTER (gate). Clean the dead skill references in
    `scripts/emit_fact_sheet.ts`. Document the new entities' enums in SKILL.md for `enum_drift_probe.ts`.

Step 8 (verify + commit): 0 per-module full skills; one per-domain `system` skill per full-module
  domain; the 5 starter skills intact; `domain_module_tools` == 2013; `process_tools` == 226;
  `skill_tools` == 0 (dropped); the 3 process skills linked to their process; both scripts green; no
  em-dashes; American English. Commit on the branch.

## 5. Out of scope (tracked elsewhere, not orphaned)
- Re-authoring the purged 528 domain-grain tools at module grain happens as normal domain-audit work
  via the modularization/audit backlog (Step 4 enrolls the domains). Of the 528, exactly 5 are
  per-domain-only generic side_effect links with NO module counterpart that module re-authoring will
  not auto-restore: domain 72 (send_email), 130 (send_email, post_chat_message), 149 (send_email,
  sign_document); domain 91 has none. The backlog entry for those 3 domains MUST list these explicitly
  (the Step-0 snapshot retains all 5).
- `capability_tools` is not created; capabilities stay non-tool-bearing.

## 6. Rollback
- The Step-0 committed snapshots + the branch reconstruct everything. Cascade delete is irreversible
  without the snapshot, so Step 0 is a hard gate. Keep snapshots until verified and merged.

## 7. Review history (condensed)
- R1 DO-NOT-EXECUTE: "per-module = drift" premise wrong; SKILL.md self-contradicts; would break 2
  scripts; content loss; claimed rollback snapshots did not exist.
- R2 DO-NOT-EXECUTE: 74% of the 528 per-domain tools were in zero-module domains; would be destroyed.
- R3 PROCEED-WITH-CHANGES: model + scope sound; fixed a coverage regression (NO fallback), the F3
  rewrite, the doc-surgery list; FK parent/cascade; entity create mirrors create_handoff_processes.ts;
  union includes host_domains.
- R4 EXECUTE-WITH-CHANGES: counts verified; found the name collision (55/57), the ~150-file audit
  corpus, the starter design, the cross-domain modules (= cross-domain starters), the 3 process agents
  having no `processes` target.
- R5 EXECUTE-WITH-CHANGES: numbers all exact; found the F1-vs-starter contradiction (now exempted), the
  246-vs-244 delete wording (now by-predicate), and that the 137-decomposition was a hidden manual
  gate. THIS revision removes both manual gates: the 528 are purged uniformly (re-authored via the
  standing audit backlog) and the 3 process agents are resolved in-pass via `process_tools`.
- R6 EXECUTE-WITH-CHANGES: export-before-purge confirmed AIRTIGHT; found residual skill_tools on reused
  55/57 and an under-specified process-row insert (now: source_framework='custom' + all not-null fields).
- R7 EXECUTE-WITH-CHANGES: four R6 fixes confirmed closed; found the 86 starter skill_tools were never
  deleted (now deleted in Step 4, lossless, already migrated in Step 2).
- R8 SAFE-TO-EXECUTE-AS-IS: skill_tools accounting closes to 0 exactly (2767 = 624 + 226 + 1917,
  disjoint+exhaustive); all 315 skills in the four buckets, 0 orphans; no remaining issue.
