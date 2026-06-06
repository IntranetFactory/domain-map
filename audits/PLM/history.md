# PLM audit history

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
- Rule #15 incident-log obligation: 12 + 9 = 21 rescinded-license `notes` writes were reverted. Per Rule #15's audit obligation, an Incidents entry in `references/skill-changelog.md` is owed , surfaced here for the user to handle (per Rule #15 the wording goes to the user, not auto-authored).
- F2/F3/F4/F5 cascade still failing catalog-wide for PLM until B1-S4 + B2-S3 land.

## 2026-05-31, Audit

Fresh Validate b1 structural pass (A / M / B [B5/B7/B9/B9b/B10b/B11/B12] / C / D / E [E1-E5] / F [F1-F5] / H), run against live PostgREST. Replays the post-fix landscape after the 2026-05-31 Continuation loader cured M7, B9 (11 events), Rule-#15 data_objects (12 rows), Rule-#15 handoffs (9 rows), and posted 10 APQC tags. Subsequent agent_curated tagging has grown to 16 rows across the 11 cross-domain handoffs.

### Summary

- **Current footprint:** 5 full modules (PLM-ENG-CORE 66, PLM-CAD-PDM 67, PLM-MFG-PROCESS 68, PLM-COMPLIANCE 69, PLM-REQUIREMENTS 70); 12 PLM-mastered data_objects (engineering_parts, engineering_revisions, engineering_change_orders, engineering_bom_items, cad_models, cad_drawings, manufacturing_boms, manufacturing_routings, plm_product_variants, product_compliance_declarations, regulated_substances, engineering_requirements); 8 capabilities; 10 solutions all primary (Teamcenter, Windchill, Arena, 3DEXPERIENCE ENOVIA, Aras Innovator, Oracle Fusion Cloud PLM, SAP EPD, Autodesk Fusion Manage, Propel, Centric); 18 trigger_events on PLM masters; 11 outbound cross-domain handoffs (targets MFG-OPS 47, ERP-FIN 65, S2P 27, FSM 31, PIM 167); 0 intra-domain handoffs; 0 inbound; 28 data_object_aliases; 25 lifecycle states across 6 of 12 masters (`engineering_parts`, `engineering_revisions`, `engineering_change_orders`, `manufacturing_boms`, `product_compliance_declarations`, `engineering_requirements`); 17 workflow-gate permissions + 15 baseline = 32 permissions; 4 roles (Design Engineer 10032, Manufacturing Engineer 10033, Engineering Change Manager 10034, Regulatory Affairs Specialist 10035); 10 role_modules; 11 role_permissions; 16 handoff_processes (all `agent_curated`, all `record_status='new'`).
- **Vendor-surface basis:** structural pass only, no Phase 0 subagent run this pass. Anchored against the four PLM flagships (Teamcenter, Windchill, 3DEXPERIENCE ENOVIA, Aras Innovator) plus the SaaS-native challengers (Arena, Propel, Autodesk Fusion Manage) and the vertical specialists (Centric for fashion, Oracle Fusion / SAP EPD as ERP-anchored variants).
- **Headline:** the 2026-05-31 continuation closed M7, Rule-#15 noise, B9 events, and seeded APQC tags. The audit-blocker today is **F2 (zero system skills)**, still pending the B2-S3 authoring-scope decision. Secondary structural gaps: B9b (zero intra-domain handoffs), B12 (6 masters with no lifecycle states), A4 + M8 (empty buyer-voice catalog copy), E6 (workflow-gate permission rollups not granted to roles AND no permission_hierarchy rows exist).
- **Bucket 1 (in-scope, agent fixable):** 4 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 1 item.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDOs, unchanged from 2026-05-30):

| Neighbor | Out | In | DMDO | Weight | Pass shape |
|---|---|---|---|---|---|
| PIM (167) | 3 | 0 | 2 (consumer on `engineering_parts`, `product_compliance_declarations`) | 5 | Pairwise (full) |
| MFG-OPS (47) | 3 | 0 | 0 | 3 | Pairwise (full) |
| ERP-FIN (65) | 3 | 0 | 0 | 3 | Pairwise (full) |
| S2P (27) | 1 | 0 | 1 (`suppliers` 206 contributor in PLM-COMPLIANCE) | 2 | Lightweight |
| FSM (31) | 1 | 0 | 0 | 1 | Lightweight |

Pairwise neighbor passes are not run this audit (structural-only scope per the user request). Re-trigger with a follow-up "pairwise PLM <-> <neighbor>" call.

### Band-by-band findings

**A. Phase A — Market shape**

- A1 PASS. `crud_percentage=75`, `business_logic` populated, `min_org_size='30 m <2500'`, `cost_band='$$$$'`, `usa_market_size_usd_m=5500`, `market_size_source_year=2024`, `certification_required=false`.
- A2 PASS. 8 capabilities linked (>= 3 floor).
- A3 PASS. 10 solutions, all `coverage_level='primary'`.
- **A4 FAIL.** `domains.catalog_tagline=''` and `catalog_description=''`. Rule #20 requires buyer-voice copy; backfill needs user review before write. → Bucket 2.

**M. Phase M — Modules**

- M1 PASS. 5 full `domain_modules`.
- M2 PASS. 8 capabilities ≥ 3 floor, 5 modules ≥ 2 floor.
- M4 PASS. Every capability realized in at least one module.
- M5 PASS. All 17 workflow-gate lifecycle states carry `domain_module_id` set to the realizing module.
- M6 PASS. All 5 modules realize at least 1 capability (PLM-ENG-CORE 3, PLM-MFG-PROCESS 2, others 1 each).
- M7 PASS. Catalog-wide single-master holds: exactly 1 `master` row per `data_object_id` for all 12 PLM masters. Within-domain coherence holds: no master/consumer co-existence (prior fix landed).
- **M8 FAIL.** All 5 `domain_modules` rows carry empty `catalog_tagline` and `catalog_description`. → Bucket 2.

**B. Phase B — Data-object footprint**

- B5 PARTIAL. `suppliers` (206) is used as `role='contributor'` (not `embedded_master`) in PLM-COMPLIANCE 69, but no domain in the catalog masters `suppliers`. Rule #11's strict integrity check (`embedded_master` integrity) does NOT fire on `contributor`, so this is not a hard B5 fail. The dependency remains unowned, which is a latent boundary issue: when S2P or a future SUP-LIFE / vendor master domain authors the canonical `suppliers` row, this `contributor` row will sit alongside it correctly. → Bucket 1b (blocked by S2P / supplier-master modularization).
- B7 PASS. 8 `users` edges authored from data_object 748: `users → engineering_change_orders` (originates, approves), `users → engineering_parts` (owns), `users → cad_models` (checks_out), `users → cad_drawings` (releases), `users → engineering_requirements` (authors), `users → product_compliance_declarations` (approves_compliance).
- B9 PASS. 18 `trigger_events` against PLM masters covering: engineering_part (released, obsoleted, in_review), engineering_revision (released), engineering_change_order (released, impact_assessment, cab_review, approved, closed), cad_drawing (released), manufacturing_bom (released), manufacturing_routing (released), product_compliance_declaration (approved, received, expired), engineering_requirement (verified, reviewed, approved, obsoleted). Every event has ≥1 handoff or maps to a workflow-gate state.
- **B9b FAIL.** Zero intra-domain `handoffs` rows for PLM (`source_domain_id=target_domain_id=165` returns []). At least 6 cross-module flows are implied by `data_object_relationships`: (a) PLM-ENG-CORE → PLM-CAD-PDM on `engineering_part.released`, (b) PLM-ENG-CORE → PLM-MFG-PROCESS on `engineering_change_order.released`, (c) PLM-ENG-CORE → PLM-COMPLIANCE on `engineering_part.released`, (d) PLM-ENG-CORE → PLM-REQUIREMENTS on `engineering_part.released`, (e) PLM-CAD-PDM → PLM-MFG-PROCESS on `cad_drawing.released`, (f) PLM-COMPLIANCE → PLM-ENG-CORE on `product_compliance_declaration.expired`. Same finding as 2026-05-30 B1-S3, deferred in continuation (editorial `description` + `friction_level` judgments required). → Bucket 1a.
- B10b PARTIAL (report-only). 8 outbound handoffs (1087, 1088, 1089, 1090, 1091, 1092, 1093, 1094) carry NULL `target_domain_module_id`. The 3 PIM-targeting handoffs (1241, 1242, 1243) DO have `target_domain_module_id=141` populated. PLM's own `source_domain_module_id` is populated on all 11 outbound rows. Per B10b's asymmetry rule, NULL on the target side is the target domain's audit to fix. → Bucket 1b (blocked by MFG-OPS / ERP-FIN / S2P / FSM b1 audits).
- B11 PASS. 28 `data_object_aliases` across all 12 masters (typical 2-3 per master).
- **B12 PARTIAL.** 6 of 12 PLM masters carry zero lifecycle states: `engineering_bom_items` (799), `cad_models` (800), `cad_drawings` (801), `manufacturing_routings` (803), `plm_product_variants` (804), `regulated_substances` (806). Anomaly: `cad_drawings` has a `cad_drawing.released` trigger_event (1215) and is the publish-side of handoff 1094, but no state machine. Per Rule #15 the config-shape exemption for `regulated_substances` cannot be re-recorded in `data_objects.notes` (RESCINDED license); user judgment required on which of the 6 are genuine config-shape masters (substance reference data, BOM lines that follow parent lifecycle, variants resolved at order time) vs which need state machines (cad_models / cad_drawings carry independent vault lifecycles in flagship vendors). → Bucket 2.

**C. Phase C — Functional ownership**

- C1 PASS. 4 `business_function_domains` rows: Research and Development (owner), Supply Chain (contributor), Procurement (contributor), Customer Service (consumer).
- C2 PASS. 1 override row: `PLM-PRODUCT-COMPLIANCE` owned by Governance, Risk and Compliance (diverges from the domain-level R&D owner).

**D. UI spot-check**

- D1 deferred. Audit is structural-only; UI links are surfaced under "Post-state UI links" below.

**E. Roles and permission bundling**

- E1 PASS. 4 roles span PLM modules: Design Engineer (10032), Manufacturing Engineer (10033), Engineering Change Manager (10034), Regulatory Affairs Specialist (10035). Multi-module domain ≥ 3 typical floor.
- E2 PASS. All 4 roles have ≥ 2 `role_modules` rows (Design Engineer 3, Manufacturing Engineer 2, Engineering Change Manager 3, Regulatory Affairs Specialist 2).
- E3 PASS. All `interaction_level` values populated (`primary` or `secondary`).
- E4 PASS. All 4 roles have ≥ 1 `role_permissions` row (Design Engineer 3, Manufacturing Engineer 3, Engineering Change Manager 3, Regulatory Affairs Specialist 2 = 11 total).
- E5 PASS. Path A (role → role_modules → domain_id) and Path B (role → role_permissions → permission.domain_module_id → domain_id) agree for all 4 roles. Specifically: 10032 reaches modules {66, 67, 70} via both paths; 10033 reaches {66, 68}; 10034 reaches {66, 68, 69}; 10035 reaches {66, 69}.
- **E6 drift confirmed.** Two-layer finding: (a) Only 1 of 17 workflow-gate permissions is granted to any role (`plm-mfg-process:release_mbom` → Manufacturing Engineer 10033). (b) `/permission_hierarchy?or=(including_permission_id.in.(15 baseline ids),included_permission_id.in.(17 workflow-gate ids))` returns ZERO rows, so the baseline-manage/admin tiers do NOT auto-include the workflow-gate permissions at request time. The bundles are silently incomplete: Design Engineer with `plm-eng-core:manage` cannot submit_part_review, release_part, obsolete_part, release_revision, submit_change_assessment, submit_requirement_review, approve_requirement, verify_requirement, or obsolete_requirement. Same B2-S2 question as 2026-05-30 still open, but the additional fact that `permission_hierarchy` is genuinely empty for PLM removes option (a) of that question ("hierarchy auto-rollup is the catalog-wide convention"). Either option (b) (add 16 explicit grants) or option (c) (treat the `release_mbom` grant as the deliberate convention) is now the only viable choice. → Bucket 2.

**F. Skill-layer integrity**

- F1 PASS. Zero legacy `domain_id=165, domain_module_id is null, skill_type='system'` rows.
- **F2 FAIL.** Zero `skills` rows with `skill_type='system'` and `domain_module_id IN (66,67,68,69,70)`. The catalog-wide F2 hard-fail from 2026-05-30 persists. → Bucket 1a (B1-S4), gated on Bucket 2 B2-S3 (skill-authoring scope) per cross-bucket dependency.
- F3 N/A. No system skills exist; F3 cannot be tested.
- F4 N/A. No skill_tools rows exist for PLM modules.
- F5 N/A. Semantius score uncomputable across 0 system skills (strict_score = operational_score = 0%).
- F7 N/A. No channel primitives linked because no skill_tools rows exist.

**H. Handoff APQC coverage**

- **H1 covered, not yet approved.** 16 `handoff_processes` rows across the 11 cross-domain handoffs, all `proposal_source='agent_curated'`, all `record_status='new'`. Per-handoff distribution: handoff 1087 has 2 tags (Implement and enforce change control procedures 20752, Identify requirements for changes 10097), 1088 has 1 (Manage BOM 11742), 1089 has 1 (Identify requirements 10097), 1090 has 1 (Manage BOM 11742), 1091 has 2 (Manage BOM 11742, Install production process 10100), 1092 has 2 (Design for manufacturing 16819, Develop prototype process 10098), 1093 has 1 (Manage regulatory compliance 16463), 1094 has 1 (Manage drawings 11745, previously deferred as medium-confidence, now tagged), 1241 has 2 (Implement change 11136, Manage product master data 11740), 1242 has 2 (Design and manage product data 16818, Manage product life cycle 10067), 1243 has 1 (Manage regulatory compliance 16463). **Catalog-quality headline (record_status='approved'):** 0. **Process side-bar (agent_curated):** 16. Volume expectation 0.5N to 0.8N for N=11 = 6-9, actual 16 (over-tagged where multiple PCF activities legitimately implement the same handoff). H1 PASSES on coverage; reviewer approval is the open lift.

### Bucket 1 — count by finding type

| Finding type | Count |
| --- | --- |
| STRUCTURAL (B9b + F2 + A4 + M8 carry over) | 2 (B9b, F2 are Bucket 1a) |
| BOUNDARY (B10b + B5 unowned `suppliers`) | 0 in Bucket 1a (both route to Bucket 1b: blocked) |
| APQC TAGGING | 0 (16 tags already loaded; approval is Bucket 2) |
| MISSING / WRONG-OWNERSHIP / SCOPE-CREEP | 0 (no Phase 0 subagent this pass; speculative findings deferred to Bucket 3) |
| MODULARIZATION | 0 (5-module split confirmed coherent in 2026-05-30 B1-S10, decision recorded) |
| **Bucket 1a (agent-solvable now)** | **2** |
| **Bucket 1b (blocked on other domain or research)** | **2** |

### Per-bucket prompts

- **Bucket 1a — fix now?** Reply `all`, list (`B9b`, `F2`), or `skip`.
  - **B9b (insert 6 intra-domain cross-module handoff rows):** mechanical structurally; needs the user's call on per-row `friction_level` (default `low`) and a one-sentence `description` per row. Per Rule #15, `notes` stays empty unless the user supplies wording. Loader will use the 11 new state_change events from the 2026-05-31 continuation as `trigger_event_id` rather than the generic lifecycle events.
  - **F2 (author 5 system skills + skill_tools):** depends on Bucket 2 B2-S3 user pick (default 5-skill shape vs custom scope). Cannot proceed without that choice.

- **Bucket 1b — blocked, no agent action this pass:**
  - B10b NULL `target_domain_module_id` on 8 handoffs (1087-1094): owed by MFG-OPS, ERP-FIN, S2P, FSM b1 audits.
  - B5 `suppliers` (206) `contributor` row in PLM-COMPLIANCE with no catalog-wide master: owed by S2P / supplier-master modularization. Not strictly a Rule #11 fail, but a latent boundary edge.

- **Bucket 2 — what's your call?** Per-item decisions, waiting on each:
  - **B2-1 A4 / M8 buyer-voice catalog copy:** draft `domains.catalog_tagline` + `catalog_description` for PLM and `domain_modules.catalog_tagline` + `catalog_description` for each of the 5 modules per Rule #20 voice rule (workflow + value), surface drafts for review before any write. Options: (a) draft all 6 now and surface for review; (b) defer to a dedicated catalog-copy pass; (c) skip until marketing supplies copy directly.
  - **B2-2 B12 lifecycle states on 6 masters with zero states:** per-master judgment whether each is genuinely config-shaped (substance reference data, BOM lines following parent part, variants resolved at order time) or workflow-bearing (cad_drawings has a release event + outbound handoff, suggesting it needs a state machine). Options per master (`engineering_bom_items`, `cad_models`, `cad_drawings`, `manufacturing_routings`, `plm_product_variants`, `regulated_substances`): (a) config-shape exemption confirmed; (b) draft a state machine; (c) defer to a Phase B-12 follow-up. Rule #15 forbids re-adding the prior `data_objects.notes` config-shape annotation.
  - **B2-3 E6 RBAC convention (carries over from 2026-05-30 B2-S2; refined):** `permission_hierarchy` is empty for PLM, so option (a) of the original question (hierarchy auto-rollup) is off the table. The two remaining choices: (b) add 16 explicit workflow-gate grants across the 4 roles per the role-to-gate mapping (Design Engineer → submit_part_review, release_part, obsolete_part, release_revision, submit_change_assessment, submit_requirement_review, approve_requirement, verify_requirement, obsolete_requirement; Engineering Change Manager → submit_to_cab, approve_change_order, release_change_order, close_change_order; Regulatory Affairs Specialist → log_supplier_declaration, approve_compliance_declaration, expire_compliance_declaration). (c) Treat the lone `plm-mfg-process:release_mbom` grant as a deliberate exception convention; leave the other 16 unassigned. Surface to user.
  - **B2-4 F2 system-skill authoring scope (carries over from 2026-05-30 B2-S3, unchanged):** (a) default 5-skill shape (`plm_eng_core_agent`, `plm_cad_pdm_agent`, `plm_mfg_process_agent`, `plm_compliance_agent`, `plm_requirements_agent` with the per-module tool surface from 2026-05-30); (b) custom scope per module; (c) stage F2 fix-load separately. Until this resolves, F3/F4/F5/F7 stay N/A.
  - **B2-5 H1 reviewer approval of 16 agent_curated tags:** the 2026-05-31 continuation loaded 10, subsequent passes brought the total to 16. All sit at `record_status='new'`. Per Rule #1, only the user can flip to `approved`. Options: (a) approve all 16; (b) approve a subset (name which handoffs); (c) defer to Discover Pass 3 reviewer flow.

- **Bucket 3 — Phase 0 pending, vet via Phase 0 or eyeball-mode?**
  - **B3-1 PLM-PORTFOLIO surface (carries over from 2026-05-30):** Teamcenter Program Planning, Windchill Project Link, ENOVIA Project Management, Aras Innovator Program Management all carry program-planning surfaces above engineering-core. Candidate entities: `engineering_projects`, `engineering_deliverables`, `program_milestones`. Could justify a 6th module `PLM-PORTFOLIO`. Options: (a) run Phase 0 vendor-research subagent; (b) eyeball — name whether PLM-PORTFOLIO should land here or stay deferred to SPM / PROD-MGMT; (c) defer indefinitely (boundary stays as-is).

### Report-only follow-ups (owed by other domains)

| Item | Owing domain | Reason |
|---|---|---|
| B10b NULL `target_domain_module_id` on handoffs 1087, 1091, 1092 | MFG-OPS | All three target MFG-OPS with NULL `target_domain_module_id`. |
| B10b NULL `target_domain_module_id` on handoffs 1088, 1090, 1093 | ERP-FIN | All three target ERP-FIN. |
| B10b NULL `target_domain_module_id` on handoff 1089 | S2P | Targets S2P. |
| B10b NULL `target_domain_module_id` on handoff 1094 | FSM | Targets FSM. Audit may confirm or deny the boundary (drawing-share-to-service is also plausibly PIM-adjacent). |
| B5/B8 `suppliers` (206) canonical master | S2P or a future SUP-LIFE / supplier-master domain | PLM-COMPLIANCE has a `contributor` row but no domain masters `suppliers` catalog-wide. |
| B8 missing `consumer` DMDOs on handoff payloads | MFG-OPS (engineering_parts, manufacturing_boms), ERP-FIN (engineering_parts), S2P (engineering_parts), FSM (cad_drawings) | None of these target domains declare a `consumer`/`contributor` DMDO row on the payload of the cross-domain handoff they receive. |

### Cross-bucket dependencies

- **B2-4 (F2 scope) gates Bucket 1a F2 fix.** Resolve B2-4 before running the F2 loader.
- **B9b (Bucket 1a) is independent of all Bucket 2 items.** Can run independently.
- **B2-3 (E6 RBAC) and Bucket 1a F2 are mutually independent.** Resolve in any order.
- **B2-1 (A4/M8 catalog copy) and B2-2 (B12 lifecycle states) are mutually independent.**
- **B3-1 (PLM-PORTFOLIO) is independent of all Bucket 1/2 items.** Speculative; market research only.

### Post-state UI links (for spot-checking)

- Domain landing: `https://tests.semantius.app/domain_map/domains` (PLM id 165)
- Modules: `https://tests.semantius.app/domain_map/domain_modules`
- DMDOs: `https://tests.semantius.app/domain_map/domain_module_data_objects`
- Lifecycle states: `https://tests.semantius.app/domain_map/data_object_lifecycle_states`
- Trigger events: `https://tests.semantius.app/domain_map/trigger_events`
- Handoffs: `https://tests.semantius.app/domain_map/handoffs`
- Handoff processes (16 `agent_curated`, 0 `approved`): `https://tests.semantius.app/domain_map/handoff_processes`
- Role permissions: `https://tests.semantius.app/domain_map/role_permissions`
- Skills (empty for PLM): `https://tests.semantius.app/domain_map/skills`

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
