---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 22
---

# PLM - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 5 full modules (`PLM-ENG-CORE`, `PLM-CAD-PDM`, `PLM-MFG-PROCESS`, `PLM-COMPLIANCE`, `PLM-REQUIREMENTS`); 12 masters (`engineering_parts`, `engineering_revisions`, `engineering_change_orders`, `engineering_bom_items`, `cad_models`, `cad_drawings`, `manufacturing_boms`, `manufacturing_routings`, `plm_product_variants`, `product_compliance_declarations`, `regulated_substances`, `engineering_requirements`); 8 capabilities (one capability per module except PLM-ENG-CORE which carries 3 and PLM-MFG-PROCESS which carries 2); 10 solutions (all primary coverage: Teamcenter, Windchill, Arena, 3DEXPERIENCE ENOVIA, Aras Innovator, Oracle Fusion PLM, SAP EPD, Autodesk Fusion Manage, Propel, Centric); 8 trigger_events; 11 outbound cross-domain handoffs, 0 inbound; 28 data_object_aliases; 24 lifecycle states across 6 of 12 masters; 17 workflow-gate permissions + 15 baseline permissions = 32 permissions; 4 roles + 10 role_modules + 12 role_permissions.
- **Vendor-surface basis:** structural pass anchored against the four PLM flagships (Teamcenter, Windchill, 3DEXPERIENCE ENOVIA, Aras Innovator) plus the SaaS-native challengers (Arena, Propel, Autodesk Fusion Manage) and the vertical specialists (Centric for fashion/retail PLM, Oracle Fusion / SAP EPD as ERP-anchored variants). No formal Phase 0 market-surface subagent run yet for Bucket 3; the speculative gaps below come from the structural analyst's reading of the loaded set against general PLM-market knowledge.
- **Bucket 1 (in-scope, agent fixable):** 18 items.
- **Bucket 2 (surface-for-user, judgment):** 3 items.
- **Bucket 3 (Phase 0 pending, speculative):** 1 item.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDOs):

| Neighbor | Out | In | DMDO | Weight | Pass shape |
|---|---|---|---|---|---|
| PIM (167) | 3 | 0 | 2 (consumer on `engineering_parts`, `product_compliance_declarations`) | 5 | Pairwise (full) |
| MFG-OPS (47) | 3 | 0 | 0 | 3 | Pairwise (full) |
| ERP-FIN (65) | 3 | 0 | 0 | 3 | Pairwise (full) |
| S2P (27) | 1 | 0 | 1 (`suppliers` 206 contributor in PLM-COMPLIANCE) | 2 | Lightweight |
| FSM (31) | 1 | 0 | 0 | 1 | Lightweight |

Structural pass bands: A / C / D pass; **M7 hard-fails** (within-domain master+consumer collisions on 3 masters across 6 DMDO rows); **B6 partial-fail** (legacy `domain_data_objects` rollup is empty for domain 165; the new `domain_module_data_objects` shape covers it but the legacy mirror is missing); **B9 partial-fail** (10 workflow-gated lifecycle states have no matching `trigger_events` row); **B9b hard-fail** (zero intra-domain cross-module handoff rows despite 4+ obvious cross-module flows); **F2 hard-fail catalog-wide for PLM** (ZERO `skill_type='system'` skills across all 5 modules; the entire Semantius score layer is uncomputable for the whole domain); **F3/F4/F5 cascade** (no skills means no skill_tools, no operation_kind invariants to check, Semantius score = 0); **H1 hard-fail** (0 of 11 cross-domain handoffs carry any `handoff_processes` row, 0 approved, 0 agent_curated); **Rule #15 hard-fail** (all 12 PLM-master `data_objects.notes` carry rescinded-license commentary; 9 of 11 outbound handoffs carry the rescinded "target NULL until <DOMAIN> is modularized" annotation; handoff 1241 carries a different rescinded-license style note); **E6 partial-drift** (only 1 of 17 workflow-gate permissions is granted to any role; the bundle may be relying on `permission_hierarchy` auto-rollup under `:manage` / `:admin`, surface for confirmation).

Domain Semantius score (strict) across 0 system skills: **0%**. Operational score also 0%. F2 cascades through F3-F5.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 (hard fail)** | **Within-domain incoherence on 3 masters across 6 DMDO rows.** `engineering_parts` (796) carries `role='master'` in PLM-ENG-CORE (66) AND `role='consumer'` in PLM-CAD-PDM (67), PLM-MFG-PROCESS (68), PLM-COMPLIANCE (69), and PLM-REQUIREMENTS (70). `engineering_revisions` (797) carries master(66) + consumer(67). `engineering_bom_items` (799) carries master(66) + consumer(68). All four downstream PLM modules (CAD-PDM, MFG-PROCESS, COMPLIANCE, REQUIREMENTS) assume PLM-ENG-CORE is co-installed (each is a layered extension of the core engineering item master, not a standalone-deployable unit). DELETE the 6 cross-module consumer rows. The master row in 66 is authoritative for the whole domain. | DELETE 6 `domain_module_data_objects` rows: (67, 796), (67, 797), (68, 796), (68, 799), (69, 796), (70, 796). |
| B1-S2 | **B9 missing events** | 10 lifecycle states have `requires_permission=true` but no matching `trigger_events` row covering the transition. Missing events: `engineering_part.in_review` (state 595), `engineering_part.obsoleted` event 1217 exists but the `engineering_part.released` event 1211 is the only one covering state 596 transition (lifecycle category, acceptable); `engineering_revision.released` (state 599 has no event; 1211 covers parent part); `engineering_change_order.impact_assessment` (state 602), `engineering_change_order.cab_review` (state 603), `engineering_change_order.approved` (state 604), `engineering_change_order.closed` (state 606); `product_compliance_declaration.received` (state 611), `product_compliance_declaration.expired` (state 613); `engineering_requirement.reviewed` (state 615), `engineering_requirement.approved` (state 616), `engineering_requirement.obsoleted` (state 618). The pattern is that release / approval / verify events exist for most masters, but the intermediate workflow-gate states (in_review, impact_assessment, cab_review) and the terminal states (closed, expired, obsoleted) do not have events even though the catalog permits per-state workflow gates. | Insert 10 `trigger_events` rows, each `event_category='state_change'`, `data_object_id` pointing at the publishing master, naming pattern `<entity>.<state>`. |
| B1-S3 | **B9b (hard fail)** | **Zero intra-domain cross-module `handoffs` rows for PLM despite 5 modules with obvious cross-module flows.** Expected from existing cross-module `data_object_relationships`: (a) PLM-ENG-CORE (66) → PLM-CAD-PDM (67) on `engineering_part.released` so CAD vault can promote the latest released revision in the vault index, (b) PLM-ENG-CORE (66) → PLM-MFG-PROCESS (68) on `engineering_change_order.released` so MFG can refresh the mBOM/routing for affected parts, (c) PLM-ENG-CORE (66) → PLM-COMPLIANCE (69) on `engineering_part.released` so compliance can issue substance-declaration requests to suppliers, (d) PLM-ENG-CORE (66) → PLM-REQUIREMENTS (70) on `engineering_part.released` so traceability is updated, (e) PLM-CAD-PDM (67) → PLM-MFG-PROCESS (68) on `cad_drawing.released` so manufacturing routing can pick up the controlled artifact, (f) PLM-COMPLIANCE (69) → PLM-ENG-CORE (66) on `product_compliance_declaration.expired` so the affected part is re-flagged for ECO review. | Author at least 6 intra-domain `handoffs` rows, `source_domain_id=target_domain_id=165`, `integration_pattern='lifecycle_progression'`, `friction_level='low'` where the relationship is established / `medium` for COMPLIANCE→ENG-CORE expiry triggers. |
| B1-S4 | **F2 (hard fail catalog-wide)** | **Zero `skill_type='system'` skills exist for any of the 5 PLM modules** (PLM-ENG-CORE, PLM-CAD-PDM, PLM-MFG-PROCESS, PLM-COMPLIANCE, PLM-REQUIREMENTS). Rule #17 mandates exactly one system skill per `domain_modules` row, with >=1 `skill_tools` row each. The entire skill / tool / Semantius-score surface is missing for the whole domain. This is the single largest fix in Bucket 1 and the prerequisite for F3 / F4 / F5 / F7 to be auditable at all. | Author 5 `skills` rows with `skill_type='system'` (one per module), 5 `skill_tools` row-sets (typical 5-20 tools each: `query_<entity>` floor per master + workflow-gate mutates aligned to the 17 permissions + 1-2 compute / side_effect tools per module). Then re-run F3 / F4 / F5 / F7. |
| B1-S5 | **Rule #15 hard-fail on `data_objects.notes`** | **All 12 PLM-mastered data_objects carry `notes` text that Rule #15 explicitly rescinded.** Patterns observed: pattern-flag context ("has_submit_lock=true because a released revision is immutable..."), naming-collision provenance ("Prefixed with 'plm_' to avoid collision with product_configurations..."), workflow-pointer narration ("release authority sits with the change-order workflow on engineering_change_orders rather than on the part record itself"), config-shape exemption ("Config-shape master with no workflow per Rule #12 exemption" on `regulated_substances` 806 , exactly the carve-out Rule #15 rescinded). PATCH all 12 rows to empty string. Re-record the load-time pattern-flag and naming-collision rationale in this audit file's Decisions section if the user wants the substance preserved (per Rule #15: this audit file is the approved persistence surface; `notes` columns are not). | PATCH 12 `data_objects` rows: `data_objects?id=in.(796,797,798,799,800,801,802,803,804,805,806,807)` `notes=""`. Append a Decisions entry to `references/skill-changelog.md` Incidents section per Rule #15 audit obligation. |
| B1-S6 | **Rule #15 hard-fail on `handoffs.notes`** | **9 of 11 outbound handoffs carry the explicitly-rescinded "target NULL until <DOMAIN> is modularized" annotation** (handoffs 1087, 1088, 1089, 1090, 1091, 1092, 1093, 1094, plus handoff 1241 with a different rescinded-style cross-handoff cross-reference annotation: "Joining PLM ECO fan-out alongside MES (handoff 1087), ERP-FIN (1088), S2P (1089)."). Rule #15's bulleted forbidden-patterns list explicitly names "until X is modularized" as the first banned shape. PATCH all 9 to empty string. The NULL target_domain_module_id is already report-only on the receiving side (B1-S7); the annotation on the source-side handoff row adds nothing the schema doesn't already carry. | PATCH 9 `handoffs` rows: `handoffs?id=in.(1087,1088,1089,1090,1091,1092,1093,1094,1241)` `notes=""`. |
| B1-S7 | **B10b report-only** | 8 outbound handoffs (1087, 1088, 1089, 1090, 1091, 1092, 1093, 1094) carry NULL `target_domain_module_id`. Targets: MFG-OPS (×3), ERP-FIN (×3), S2P, FSM. Per B10b's asymmetry rule the NULL is the target domain's B10b, not PLM's to fix. PLM's own side (`source_domain_module_id`) is populated on every outbound row. The 3 PIM-targeting handoffs (1241, 1242, 1243) DO have `target_domain_module_id=141` (PIM-PRODUCT-CONTENT) populated, demonstrating the shape is achievable once the target domain is modularized. | Schedule b1 audits for MFG-OPS, ERP-FIN, S2P, FSM to derive their `target_domain_module_id` per the standard B10b backfill procedure. Listed in Report-only follow-ups below. |
| B1-S8 | **B6 legacy rollup empty** | `domain_data_objects?domain_id=eq.165` returns zero rows despite all 12 masters being properly cataloged in the per-module `domain_module_data_objects` shape. This is the legacy rollup view that some tooling still reads; the new DMDO shape is the source of truth, but tools that haven't migrated will see PLM as having zero entities. Either backfill the legacy rollup as a one-time migration, or confirm with the user that the legacy view is being retired catalog-wide and PLM's empty rollup is intentional (in which case this becomes a Bucket 2 question, not a Bucket 1 fix). | Surface to user: backfill the rollup with 12 rows aggregating from DMDO master rows, OR confirm legacy view retired. |
| B1-S9 | **B8 missing cross-domain consumer DMDOs (REPORT-ONLY)** | 4 of 5 cross-domain target domains (MFG-OPS, ERP-FIN, S2P, FSM) do NOT declare `role IN (consumer, contributor, embedded_master)` on the PLM masters they consume via the 8 outbound handoffs. Only PIM-PRODUCT-CONTENT (141) properly declares `consumer` on `engineering_parts` (796) and `product_compliance_declarations` (805). The missing-consumer pattern means the receiving modules implicitly read the handoff payload without declaring the dependency at the catalog layer, so downstream impact analysis (where-used-as-consumer) under-counts. Listed in Report-only follow-ups below; not PLM's to fix. | Each target domain's b1 audit should add a `consumer` DMDO row on the relevant PLM master. |

#### APQC TAGGING

0 of 11 cross-domain handoffs carry any `handoff_processes` row. **0 approved, 0 agent_curated.** Volume expectation: 0.5N to 0.8N for N=11 = 6-9 high-confidence tags. Routine tags to author at fix time (substring searches against `processes` already run during this audit):

| handoff_id | source → target | trigger_event | payload | Proposed PCF (process_name / external_id) | Confidence |
|---|---|---|---|---|---|
| 1087 | PLM-ENG-CORE → MFG-OPS | `engineering_change_order.released` | `manufacturing_boms` | Implement and enforce change control procedures (20752 L4) OR Implement change (11136 L3) | confident L3/L4 |
| 1088 | PLM-ENG-CORE → ERP-FIN | `engineering_change_order.released` | `engineering_parts` | Manage bills of material (11742 L4) | confident L4 |
| 1089 | PLM-ENG-CORE → S2P | `engineering_change_order.released` | `engineering_parts` | Identify requirements for changes to manufacturing/delivery processes (10097 L4) | confident L4 |
| 1090 | PLM-ENG-CORE → ERP-FIN | `engineering_part.released` | `engineering_parts` | Manage bills of material (11742 L4) | confident L4 |
| 1091 | PLM-MFG-PROCESS → MFG-OPS | `manufacturing_bom.released` | `manufacturing_boms` | Manage bills of material (11742 L4) | confident L4 |
| 1092 | PLM-MFG-PROCESS → MFG-OPS | `manufacturing_routing.released` | `manufacturing_routings` | Design for manufacturing (16819 L5) OR parent L4 if available | confident L4/L5 |
| 1093 | PLM-COMPLIANCE → ERP-FIN | `product_compliance_declaration.approved` | `engineering_parts` | Manage regulatory compliance (16463 L3) | confident L3 |
| 1094 | PLM-CAD-PDM → FSM | `cad_drawing.released` | `cad_drawings` | Provide feedback and insights to appropriate teams (product design/development, marketing, manufacturing) (11241 L4) | medium L4, defer-candidate (no clean PCF for drawing-share-to-service) |
| 1241 | PLM-ENG-CORE → PIM | `engineering_change_order.released` | `pim_products` | Implement change (11136 L3) | confident L3 |
| 1242 | PLM-ENG-CORE → PIM | `engineering_part.released` | `pim_products` | Design and manage product data, design, and bill of materials (16818 L5) | confident L5 |
| 1243 | PLM-COMPLIANCE → PIM | `product_compliance_declaration.approved` | `pim_products` | Manage regulatory compliance (16463 L3) | confident L3 |

8 high-confidence agent_curated tags (1087, 1088, 1089, 1090, 1091, 1092, 1093, 1241, 1242, 1243), 1 medium-confidence (1094) recommended deferral to Discover Pass 3 if the user prefers strict-confidence-only agent_curated rows. Each row at fix time: `(handoff_id, process_id, proposal_source='agent_curated', record_status='new', role='implements')`.

#### Bucket 1 - count by finding type

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M7 + B6 + B9 + B9b + F2 + Rule-#15 data_objects + Rule-#15 handoffs) | 7 |
| BOUNDARY (B10b report-only + B8 missing-consumer report-only) | 0 in Bucket 1 (both routed to Report-only follow-ups; see below) |
| APQC TAGGING (high-confidence agent_curated) | 10 (1 deferral candidate) |
| MISSING / WRONG-OWNERSHIP / SCOPE-CREEP | 0 (no formal Phase 0 subagent run; routed to Bucket 3) |
| MODULARIZATION | 1 (PLM-PORTFOLIO module , see B1-S10 below) |
| **Bucket 1 total** | **18** |

#### Additional Bucket 1 items

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S10 | **Modularization (in-scope, fixable)** | The 5-module split (ENG-CORE, CAD-PDM, MFG-PROCESS, COMPLIANCE, REQUIREMENTS) cleanly covers the layered PLM stack. M2 floor satisfied (8 capabilities >= 3 floor → >= 2 full modules required, 5 actual). Coverage observations: (a) one cap-per-module (CAD-PDM, COMPLIANCE, REQUIREMENTS) is fine for narrow modules; (b) PLM-ENG-CORE holds 3 caps (PLM-BOM-MGMT, PLM-PART-MASTER, PLM-CHANGE-MGMT) , reasonable, but ECO could plausibly split off as a separate "PLM-CHANGE-MGMT" module if engineering-change-orchestration becomes the highest-traffic surface. No split recommended now; flag as a future refactor surface. (c) Verdict: coherent. The structural pass produces no module rename / split recommendations beyond this note. | No fix; record decision to keep the 5-module split as-is. |

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Pattern-flag confirmation per Rule #12** , current flags: `engineering_revisions.has_submit_lock=true`, `engineering_change_orders.has_submit_lock=true`, `manufacturing_boms.has_submit_lock=true`, `product_compliance_declarations.has_submit_lock=true` and `has_single_approver=true`. All other masters have all three flags false. The flags appear deliberately set, but the audit needs positive confirmation that the false-by-default is correct on: should `engineering_parts.has_submit_lock=true` (a released part should be immutable until ECO mints a new revision)? Should `engineering_requirements.has_submit_lock=true` (an approved requirement should freeze until baseline change-control authorizes edit)? Should `cad_drawings.has_submit_lock=true` (a released drawing is the controlled artifact , many regulated industries treat it as immutable post-release)? Should `regulated_substances.has_personal_content=false` stay false (contains regulator names / CAS numbers, no personal data , false correct)? | Pattern flags are workflow-shape judgments the user owns; the default false doesn't establish review. Per Rule #15, recording the consideration in `notes` is forbidden , surface here for the Decisions section. | Per-flag yes/no from user; the decisions are captured below in the Decisions block once received. |
| B2-S2 | **E6 permission-bundle drift** , only 1 of 17 workflow-gate permissions is currently granted to any role (`plm-mfg-process:release_mbom` → Manufacturing Engineer 10033). The other 16 workflow-gates (`submit_part_review`, `release_part`, `obsolete_part`, `release_revision`, `submit_change_assessment`, `submit_to_cab`, `approve_change_order`, `release_change_order`, `close_change_order`, `log_supplier_declaration`, `approve_compliance_declaration`, `expire_compliance_declaration`, `submit_requirement_review`, `approve_requirement`, `verify_requirement`, `obsolete_requirement`) are unassigned. Either the bundles rely on `permission_hierarchy` to auto-include them under `:manage` / `:admin` (in which case the explicit `release_mbom` grant is redundant), or the 16 gates need explicit grants per role. | RBAC-design decision; depends on whether `permission_hierarchy` rules are seeded for the workflow-gate ↔ baseline-manage / baseline-admin parent relationships. Could not query `permission_hierarchy` because the field names guessed (`parent_permission_id` / `child_permission_id`) did not match the live shape. | (a) Confirm hierarchy auto-rollup is the catalog-wide convention; drop the explicit `release_mbom` grant as redundant. (b) Add the 16 missing workflow-gate grants explicitly to the relevant roles (Design Engineer → submit_part_review, release_part, obsolete_part, release_revision, submit_change_assessment, submit_requirement_review, approve_requirement, verify_requirement, obsolete_requirement; Engineering Change Manager → submit_to_cab, approve_change_order, release_change_order, close_change_order; Manufacturing Engineer → release_mbom (already), and possibly approve / close; Regulatory Affairs Specialist → log_supplier_declaration, approve_compliance_declaration, expire_compliance_declaration). (c) Leave drift if Manufacturing Engineer's `release_mbom` was a deliberate "this role gets one workflow gate explicitly" pattern; document the convention. |
| B2-S3 | **F2 system-skill authoring scope** , Bucket 1 B1-S4 says author 5 system skills. The skill name + tool surface choice is the user's call. Default per-skill shape would be: `plm_eng_core_system` (covering part / revision / ECO / BOM master CRUD + the 9 ENG-CORE workflow gates), `plm_cad_pdm_system` (CAD model / drawing CRUD + check-in/check-out + viewable generation primitives), `plm_mfg_process_system` (mBOM + routing CRUD + release_mbom gate + variant configurator compute), `plm_compliance_system` (substance / declaration CRUD + log/approve/expire gates + roll-up compute), `plm_requirements_system` (requirement CRUD + decomposition + traceability + 4 workflow gates). Should the audit's fix-load proposal cover this shape, or does the user want a custom skill / tool surface? | Skill / tool inventory is editorial; the load-bearing default works but the user may want narrower or broader scopes per module. | (a) Use the default 5-skill shape above; agent authors at fix time. (b) User specifies a custom skill / tool surface per module; agent loads what user specifies. (c) Stage F2 fix-load as a separate concern after Bucket 1 STRUCTURAL fixes land. |

### Bucket 3 - Phase 0 pending (speculative)

No formal Phase 0 market-surface subagent has been run for PLM in this audit pass. Speculative findings below are the structural analyst's reading of the loaded set against general PLM-market knowledge (Teamcenter / Windchill / ENOVIA / Aras flagship coverage). Treat as candidate gaps, not vetted gaps. Vendor-research vetting needed before any Phase A or Phase B insert.

| # | Candidate finding | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-1 | **Missing-entity cluster: portfolio / project-management surface.** All 4 flagships carry a project / program / portfolio layer above the engineering-core (Teamcenter Program Planning, Windchill Project Link, ENOVIA Project Management, Aras Innovator Program Management). Candidate entities: `engineering_projects`, `engineering_deliverables`, `program_milestones`. Currently the entire portfolio surface is empty. Could be a deliberate scope decision (PLM-as-engineering-substrate, leaving program-management to SPM / PROD-MGMT), but every flagship treats it as in-scope. If included, this would justify a 6th module `PLM-PORTFOLIO`. | Teamcenter / Windchill / ENOVIA / Aras all ship the surface. | Run a Phase 0 vendor-research pass against the 4 flagships' program-planning module documentation; confirm whether the surface is core PLM or adjacent SPM. If core PLM, propose a 6th module and ~3-5 entities. If adjacent, document the boundary and rely on SPM coverage. |

No candidates queued via `append_missing_domain.ts`: the speculative cluster B3-1 is an internal-PLM gap, not a missing-domain candidate. All 5 cross-domain neighbors (MFG-OPS, ERP-FIN, S2P, FSM, PIM) are already in the catalog.

### Cross-bucket dependencies

- B1-S4 (F2 system-skill authoring) **enables** F3 / F4 / F5 / F7 to be auditable; without it, the entire skill-layer audit cascade fails. Independent of Bucket 2 / Bucket 3.
- B1-S2 (B9 missing trigger_events) **enables** future intra-domain handoffs (B1-S3) to reference focused events rather than the generic lifecycle events. Resolve B1-S2 before B1-S3 fix-load runs, or accept that B1-S3 will initially use the lifecycle / state_change events that already exist and re-target after B1-S2 lands.
- B2-S2 (E6 permission-bundle drift) is **independent** of Bucket 3 , the question is RBAC-convention shape, not market surface.
- B2-S3 (F2 skill-authoring scope) is **dependent** on B1-S4 (F2 fix authorization). Resolve B2-S3 first to know what to author at B1-S4 fix time.
- B3-1 (PLM-PORTFOLIO surface) is **independent** of all Bucket 1 / Bucket 2 , purely market-research.

### Per-bucket prompts

**Bucket 1 - fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S4`), or `skip`.

- **S1 (M7 hard fail , DELETE 6 cross-module consumer DMDO rows in modules 67/68/69/70):** decision is DELETE (the 4 downstream modules co-install with ENG-CORE by construction). Reply `confirm` or specify "promote to embedded_master" instead.
- **S2 (B9 , insert 10 missing trigger_events for workflow-gated states):** structural; no other dependencies.
- **S3 (B9b , insert 6 intra-domain cross-module handoff rows):** depends on S2 for focused events; otherwise uses the generic `engineering_part.released` / `engineering_change_order.released` events.
- **S4 (F2 hard fail , author 5 system skills + skill_tools across 5 modules):** depends on B2-S3 (skill-authoring scope). Stage as separate batch.
- **S5 (Rule #15 , PATCH 12 `data_objects.notes` to empty string):** mechanical; appends Incidents entry to skill-changelog.md.
- **S6 (Rule #15 , PATCH 9 `handoffs.notes` to empty string):** mechanical.
- **S7 / S8 / S9 (B10b / B6 legacy rollup / B8 missing-consumer report-only):** routed to Report-only follow-ups; not PLM's fix.
- **S10 (Modularization decision , keep 5-module split):** record decision.
- **H1 (APQC tagging , 10 high-confidence rows + 1 deferred):** load now or in follow-up batch?

**Bucket 2 - what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (pattern flags):** per-flag yes/no on `engineering_parts.has_submit_lock`, `engineering_requirements.has_submit_lock`, `cad_drawings.has_submit_lock`. (regulated_substances.has_personal_content stays false confirmed.)
- **B2-S2 (E6 permission-bundle drift):** which option (a/b/c)?
- **B2-S3 (F2 system-skill authoring scope):** which option (a/b/c)?

**Bucket 3 - Phase 0 pending , vet via formal Phase 0 vendor research or eyeball-mode?** B3-1 is the only candidate; if you choose eyeball, name whether the portfolio-surface cluster should land in PLM (new PLM-PORTFOLIO module) or stay deferred to SPM / PROD-MGMT.

### Report-only follow-ups (owed by other domains)

| Item | Owing domain | Reason |
|---|---|---|
| B10b , derive `target_domain_module_id` for handoffs 1087, 1091, 1092 | MFG-OPS | All three target MFG-OPS with NULL `target_domain_module_id`; the symmetric side is MFG-OPS's to backfill once it is modularized. |
| B10b , derive `target_domain_module_id` for handoffs 1088, 1090, 1093 | ERP-FIN | All three target ERP-FIN with NULL `target_domain_module_id`; ERP-FIN to backfill once modularized. |
| B10b , derive `target_domain_module_id` for handoff 1089 | S2P | Targets S2P with NULL `target_domain_module_id`; S2P to backfill. |
| B10b , derive `target_domain_module_id` for handoff 1094 | FSM | Targets FSM with NULL `target_domain_module_id`; FSM to backfill. The handoff itself may be a scope-creep candidate (drawing-share-to-service-field is more PIM-adjacent than FSM-canonical); flag for FSM's audit to confirm. |
| B8 , add `consumer` DMDO on `engineering_parts` (796) and / or `manufacturing_boms` (802) | MFG-OPS | Receives `engineering_change_order.released` + `manufacturing_bom.released` + `manufacturing_routing.released` payloads but does not declare consumer DMDO. |
| B8 , add `consumer` DMDO on `engineering_parts` (796) | ERP-FIN | Receives `engineering_change_order.released` + `engineering_part.released` + `product_compliance_declaration.approved` payloads but does not declare consumer DMDO. |
| B8 , add `consumer` DMDO on `engineering_parts` (796) | S2P | Receives `engineering_change_order.released` payload but does not declare consumer DMDO. |
| B8 , add `consumer` DMDO on `cad_drawings` (801) | FSM | Receives `cad_drawing.released` payload but does not declare consumer DMDO; also confirm boundary (this may be the wrong target, see B10b note above). |

Each of MFG-OPS, ERP-FIN, S2P, FSM should be added to the audit backlog so their per-domain b1 audits can backfill the missing DMDOs and target_domain_module_ids.

## 2026-05-31, Continuation: B1 technical fixes

Applied the technically-deterministic Bucket 1 items from the 2026-05-30 entry. Loader: `c:/dev/domain-map/.tmp_deploy/fix_plm_b1_technical_2026_05_31.ts` (idempotent; re-run confirmed clean).

### Applied

| ID | Action | Result |
|---|---|---|
| B1-S1 | DELETE DMDO ids 304, 305, 309, 310, 313, 316 (M7 within-domain incoherence) | 6 rows deleted; re-run found 0 live |
| B1-S2 | INSERT 11 `trigger_events` for workflow-gate states without matching events (audit listed 11 missing despite "10" headline) | 11 rows inserted (`event_category='state_change'`, `domain_module_id` set per the realizing module of each lifecycle state, `to_state` populated). Affected masters: `engineering_parts` (1), `engineering_revisions` (1), `engineering_change_orders` (4), `product_compliance_declarations` (2), `engineering_requirements` (3). |
| B1-S5 | PATCH 12 `data_objects.notes` (ids 796-807) to `''` per Rule #15 RESCINDED license | 12 rows patched; re-run found 0 with non-empty `notes` |
| B1-S6 | PATCH 9 `handoffs.notes` (ids 1087-1094, 1241) to `''` per Rule #15 RESCINDED license | 9 rows patched; re-run found 0 with non-empty `notes` |
| H1 APQC | INSERT 10 `handoff_processes` for the high-confidence cross-domain handoffs audit pre-specified | 10 rows inserted with `proposal_source='agent_curated'`, `record_status='new'`, default `role='implements'`. All 10 PCF process ids resolved live before insert (external ids 20752, 11136, 11742, 10097, 16819, 16463, 11241→deferred, 16818). |

### Deferred (with reason)

| ID | Reason |
|---|---|
| B1-S3 (B9b 6 intra-domain handoffs) | Authoring new handoff rows requires editorial `description` + per-row `friction_level` judgment; exceeds the technical-fix scope. Pre-specified by audit, ready to load on user approval. |
| B1-S4 (F2 5 system skills + tools) | Gated on B2-S3 user pick (default 5-skill shape vs custom scope vs stage separately). |
| B1-S7 (B10b NULL target FKs) | Symmetric side owned by MFG-OPS / ERP-FIN / S2P / FSM; not PLM's fix. |
| B1-S8 (B6 legacy rollup) | Audit explicitly says "Surface to user" — user must confirm whether the legacy `domain_data_objects` view is retiring catalog-wide or needs backfill. |
| B1-S9 (B8 missing-consumer DMDOs) | Report-only; owed by neighbor domains' audits. |
| B1-S10 (modularization decision) | No fix; decision to keep 5-module split recorded. |
| APQC handoff 1094 | Audit defer-candidate (medium-confidence L4, no clean PCF for drawing-share-to-service-field; awaits Discover Pass 3 or boundary clarification with FSM/PIM). |
| B2-S1, B2-S2, B2-S3 | Judgment calls; outside Bucket 1 technical scope. |
| B3-1 (PLM-PORTFOLIO speculative) | Bucket 3; needs Phase 0 vendor research. |

### Post-state spot-checks (UI links for reviewers)

- DMDO post-DELETE: `https://tests.semantius.app/domain_map/domain_module_data_objects`
- New `trigger_events` (ids 1467-1477): `https://tests.semantius.app/domain_map/trigger_events`
- `data_objects` notes clean: `https://tests.semantius.app/domain_map/data_objects`
- `handoffs` notes clean: `https://tests.semantius.app/domain_map/handoffs`
- New `handoff_processes` (10 rows, `record_status='new'`, awaiting reviewer approval): `https://tests.semantius.app/domain_map/handoff_processes`

### Open follow-ups after this pass

- M7 cleanly cured; the 5 downstream PLM modules now correctly assume PLM-ENG-CORE co-installation without redundant `consumer` DMDOs.
- B9 cured for the 11 named states; B9b (intra-domain handoffs) and B10b (target module FKs) remain open per the deferral list.
- Rule #15 incident-log obligation: 12 + 9 = 21 rescinded-license `notes` writes were reverted. Per Rule #15's audit obligation, an Incidents entry in `references/skill-changelog.md` is owed — surfaced here for the user to handle (per Rule #15 the wording goes to the user, not auto-authored).
- F2/F3/F4/F5 cascade still failing catalog-wide for PLM until B1-S4 + B2-S3 land.
