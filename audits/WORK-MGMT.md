# WORK-MGMT — Audit history

Domain: Work Management (`domain_code='WORK-MGMT'`, id 135). Cross-functional task / project / OKR market. Bought by PMOs, BizOps, marketing, and any team running structured work that isn't engineering-specific. Distinct from SPM (top-down portfolio), PSA (services billing), and software-engineering sprint tooling.

UI: https://tests.semantius.app/domain_map/domains?id=eq.135

---

## 2026-05-28 — Audit

### Summary

Footprint counts (live state):

| Surface | Count | Notes |
| --- | --- | --- |
| `domain_modules` (full) | 2 | WORK-MGMT-TASK-EXEC (149), WORK-MGMT-GOALS-OKR (150) |
| `capability_domains` | 9 | 7 realized in 149, 2 realized in 150 |
| `domain_data_objects` (master) | 4 | `work_items`, `work_projects`, `work_automations`, `okr_objectives` |
| `domain_module_data_objects` | 21 | mix of master + consumer (optional) |
| `solution_domains` | 12 | 10 primary, 1 secondary, 1 partial |
| `business_function_domains` | 5 | owner=Business Operations + 3 contributors + 1 consumer |
| `domain_regulations` | 0 | by-construction — cross-functional work has no statutory anchor |
| `handoffs` (outbound from 135) | 9 | ITSM x2, SPM x2, PSA x2, PROD-MGMT x2, WSC x1 |
| `handoffs` (inbound to 135) | 22 | PROD-MGMT x6, SPM x4, PSA x3, EMP-EXP x2, TEST-MGMT, IPAAS, PROC-MIN, VSDP, NCDB, BPA, CRM x1 each |
| `handoffs` (intra-domain, 135→135) | 0 | B9b candidates exist (see below) |
| `data_object_relationships` touching masters | 28 | intra + cross + 5 `users` edges |
| `data_object_aliases` | 12 | 3 per master |
| `data_object_lifecycle_states` | 24 rows across 4 masters | `okr_objectives` lifecycle is dual-realized in modules 150 + 51 (TALENT-PERFORMANCE-MGMT) |
| `trigger_events` on WORK-MGMT masters | 8 | gaps documented below |
| `skills` (system) | 2 | one per module — 215, 216 |
| `skill_tools` | 14 | 12 required + 2 optional (`notify_person` on both) |
| `roles` for these modules | **0** | Phase E never authored |
| `permissions` for these modules | **0** | Rule #14 / Rule #12 materialization never run |
| `tool_solutions` for top WORK-MGMT solutions | 0 | none of the 12 solutions wired to tool delivery yet |

Vendor-surface basis: **not yet generated**. Phase 0 (formal market-surface enumeration) has not been run for this domain. Existing footprint inherits from earlier load (pre-Phase-0 era). See Bucket 3.

Bucket counts: **6 in-scope confirmed**, **5 surface-for-user**, **1 Phase-0 pending (deferred until user picks vetting mode)**.

---

### Bucket 1 — In-scope confirmed gaps (agent-fixable)

#### STRUCTURAL — `roles` and `role_modules` empty (E1, E2, E3, E4, E5 all fail)

WORK-MGMT is a multi-module domain (2 modules) but has zero `roles` rows touching either module via `role_modules`. The Phase-E checklist requires ≥3 roles for a multi-module domain. The natural Work Management personas are well-defined from the market (Asana/Monday/ClickUp role catalogs):

| Proposed `role_code` | Business function | Modules touched | Why |
| --- | --- | --- | --- |
| `OPERATIONS-WORK-PROGRAM-LEAD` | Business Operations | 149 primary, 150 secondary | PMO / BizOps lead who owns cross-team programs and rolls up OKR progress from work_items |
| `OPERATIONS-WORK-CONTRIBUTOR` | Business Operations | 149 primary | Default IC seat — assigned work_items, files updates, can author automations within their projects |
| `MARKETING-CAMPAIGN-MANAGER` | Marketing | 149 primary | Most-cited cross-functional WORK-MGMT persona (Workfront/Asana/Wrike marketing buyer) — runs campaign projects with creative review |
| `EXECUTIVE-OKR-OWNER` (cross-functional, `business_function_id IS NULL`) | — | 150 primary, 149 secondary | Owns objectives, links KRs to work_items for progress rollup |

Proposed permission bundles (using tier-level grants per the role-layer guidance):

- `OPERATIONS-WORK-PROGRAM-LEAD` → `work-mgmt-task-exec:admin`, `work-mgmt-goals-okr:manage`
- `OPERATIONS-WORK-CONTRIBUTOR` → `work-mgmt-task-exec:manage`
- `MARKETING-CAMPAIGN-MANAGER` → `work-mgmt-task-exec:admin`
- `EXECUTIVE-OKR-OWNER` → `work-mgmt-goals-okr:admin`, `work-mgmt-task-exec:read`, plus the explicit gate `work-mgmt-goals-okr:commit_okr_objective` (IC-tier OKR owners commit but don't admin the module)

E1/E2/E3/E4/E5 cure together as soon as 3+ roles ship with ≥2 `role_modules` entries each and matching `role_permissions` bundles. Path A / Path B agreement (E5) becomes the loader's pre-flight check.

#### STRUCTURAL — Permission materialization never run for these modules (Rule #12, Rule #14)

The catalog has lifecycle states with `requires_permission=true` on every master, but zero `permissions` rows exist for modules 149 / 150. The expected materialization is:

| Module | Permission | Source |
| --- | --- | --- |
| WORK-MGMT-TASK-EXEC (149) | `work-mgmt-task-exec:read`, `:manage`, `:admin` | baseline triad |
| WORK-MGMT-TASK-EXEC (149) | `work-mgmt-task-exec:complete_work_project` | lifecycle `work_projects.completed` (override verb) |
| WORK-MGMT-TASK-EXEC (149) | `work-mgmt-task-exec:enable_work_automation`, `:disable_work_automation` | lifecycle `work_automations.enabled`/`disabled` |
| WORK-MGMT-GOALS-OKR (150) | `work-mgmt-goals-okr:read`, `:manage`, `:admin` | baseline triad |
| WORK-MGMT-GOALS-OKR (150) | `work-mgmt-goals-okr:commit_okr_objective`, `:score_okr_objective` | lifecycle `okr_objectives.committed`/`scored` (module 150 realization) |

11 rows. Roles can't bundle them until they exist; same for `permission_hierarchy` edges (`:admin` ⊇ workflow-gates).

#### MISSING TRIGGER EVENTS — workflow-gate states without matching events (B9 partial fail)

| Master | State (requires_permission=true) | Expected event | Status |
| --- | --- | --- | --- |
| `okr_objectives` | `committed` | `okr_objective.committed` | missing |
| `okr_objectives` | `scored` | `okr_objective.scored` | missing |
| `okr_objectives` | `graded` (module 51 realization) | `okr_objective.graded` | missing — TALENT-MGMT-side B9 |
| `work_automations` | `enabled` | `work_automation.enabled` | missing |

`work_automation.disabled` exists; `work_automation.enabled` doesn't, despite both being workflow gates. `okr_objective.committed` is the most cross-cutting miss — it's the event downstream subscribers need to start rollup work.

#### MISSING INTRA-DOMAIN HANDOFFS (B9b non-skippable, currently 0 rows)

WORK-MGMT has 2 modules with real cross-module surface (work_items mastered in 149 are embedded_master in 150; okr_objectives mastered in 150 ties back to work_items via `tracked_by` relationship). The B9b set is empty. Implied candidates from the relationship graph + workflow-gate states:

| Source module | Target module | Trigger event | Payload | Pattern | Friction | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| 149 (TASK-EXEC) | 150 (GOALS-OKR) | `work_item.status_changed` | `work_items` (243) | `lifecycle_progression` | `low` | OKR KR progress rollup reads work_item state directly |
| 149 (TASK-EXEC) | 150 (GOALS-OKR) | `work_item.completed` | `work_items` (243) | `lifecycle_progression` | `low` | Same — terminal state drives KR closure recalculation |
| 150 (GOALS-OKR) | 149 (TASK-EXEC) | `okr_objective.committed` *(new event, see above)* | `okr_objectives` (245) | `lifecycle_progression` | `low` | Committing an OKR unlocks work_item linking + auto-creation of placeholder items |
| 149 (TASK-EXEC) | 150 (GOALS-OKR) | `work_automation.triggered` | `work_automations` (246) | `event_stream` | `low` | Automation rules can drive OKR check-in updates |

4 rows. Module-FK columns set on both sides since both modules are loaded.

#### M7 SOFT FAIL — `work_items` is mastered in 149 AND embedded_master in 150

WORK-MGMT-GOALS-OKR's description ("Deploys alongside the task-execution module for full integration, or standalone with a thin embedded work-item shell for KR linking") signals this is **intentional** for standalone deployability. That said, M7 calls it out as redundant when both full modules sit in the same domain — the GOALS-OKR module relying on TASK-EXEC's master row inside the same domain is dead weight, and the standalone-deploy narrative may be better served by promoting GOALS-OKR to `module_kind='starter'` (Rule #19), or by leaving it as is and treating M7 as documented exception. **Surface for user choice in Bucket 2.**

#### A5 NOT RUN — vendor ownership not refreshed

Skipped by default per the checklist. The 12 linked solutions include Atlassian's Trello (acquired Trello 2017, still current), Adobe Workfront (acquired 2020, still current), Asana (public, independent), Monday.com (public, independent). No obvious staleness from a glance, but a formal refresh wasn't run.

---

### Bucket 2 — Surface-for-user (judgment calls)

1. **GOALS-OKR module: keep as `full` with embedded_master shell, or promote to `starter`?**
   - **Option A (keep `full`):** matches current state. Accept M7 soft-fail as the cost of the dual-deployable design.
   - **Option B (promote to `starter`):** GOALS-OKR drops to `module_kind='starter'`, its `data_object_lifecycle_states` rows for `okr_objectives` get removed (Rule #19 invariant 3 — starters don't author lifecycle), workflow-gate permissions move out, three baseline-tier permissions ship. The TASK-EXEC module remains the canonical master and the starter embeds its work_item shell. Cleaner under Rule #19; bigger refactor.
   - **Recommendation:** Option A unless we get strong signal from the user that "standalone OKR module" is a real GTM angle. The current shape is structurally fine and only fails an *advisory* check.

2. **Pattern flags re-evaluation (B4):**
   - `okr_objectives` has `has_personal_content=true`. Defensible — OKR notes/check-ins often discuss individual performance.
   - `work_items` has all three flags `false`. Are any worth flipping? `has_personal_content` could apply (assignee notes, blockers describing health/personal issues), but most products treat work_items as collaborative-by-default. Recommend leaving as is unless the user wants a specific PII / privacy posture.
   - `work_projects` and `work_automations` all `false`. Plausibly correct.
   - **Ask:** are these confirmed after positive re-evaluation, or do you want a focused pass?

3. **Intra-domain B9b — pattern choice on 4 new rows.**
   - All four candidates above default to `lifecycle_progression` + `low` friction. That's the right choice for an integrated within-domain deploy. The exception is if the user wants to model the **standalone GOALS-OKR scenario** (Option B above), in which case some of these rows shift to `api_call` and `medium` friction. **Locked to the answer on Q1.**

4. **CRM inbound on `crm_opportunity.closed_won` (high friction) — payload to work_items implies a relationship row that doesn't exist (B8 inbound is report-only for us, but the structural mirror is missing).**
   - Inbound handoff 175: `CRM.crm_opportunity.closed_won → WORK-MGMT-TASK-EXEC` with payload `crm_opportunities` (id 100).
   - No `data_object_relationships` edge from `crm_opportunities` → any WORK-MGMT master. CRM's B8 owes the row (its master spawns a work_item / work_project for post-sale execution). **Owed by CRM B8; report-only, not in-scope here. Surface to user if they want CRM also queued for audit.**

5. **A5 ownership refresh — run it or skip?** Recommend skip unless the user specifically wants a refresh on the 12 linked solutions.

---

### Bucket 3 — Phase 0 pending (speculative — needs vetting)

1. **Workflow-substrate gaps from flagship Work Management vendors that may be under-represented in this domain's masters.** No formal Phase 0 surface matrix has been produced for WORK-MGMT. The current 4 masters (`work_items`, `work_projects`, `work_automations`, `okr_objectives`) covers the "headline noun" set. Open candidates pulled from rough vendor-knowledge memory (Asana, Monday, ClickUp, Smartsheet, Wrike, Workfront, Trello, Basecamp, Teamwork, Hive, Notion, MS Project for the Web):
   - `work_item_dependencies` — currently modeled as a `data_object_relationships` row (`work_items depends_on work_items`). Some vendors (Smartsheet, MS Project) treat dependencies as first-class entities with their own lag/lead and constraint types. **Plausible MISSING master if dependency modeling beyond a join is required.**
   - `work_item_templates` / `project_templates` — every vendor ships these. Probably worth a master row. **Plausible MISSING.**
   - `work_views` (board/list/gantt/timeline) — modeled as a UI concern in some vendors, as a saved-query entity in others. Borderline; usually a `domain_owned` data_object in the broader catalog if SaaS vendors store it as a versioned record. **Plausible MISSING (low confidence).**
   - `time_entries` / `worklogs` — most WORK-MGMT products track time on work_items. PSA mastery is the more typical answer. **Likely PSA's master, not WORK-MGMT's — defer.**
   - `forms` / `request_forms` — intake surface for cross-team work requests. Several vendors (Asana, Wrike, Smartsheet) ship this as a first-class entity. **Plausible MISSING.**
   - `comments` / `attachments` — currently cross-cutting catalog-wide question; not specific to WORK-MGMT.
   - `proofing_sessions` / `creative_assets` for the Workfront/MARKETING-CAMPAIGN slice — currently covered by capability `CREATIVE-REVIEW` but no master entity. **Plausible MISSING for the marketing-heavy buyer band; possibly a separate sub-module.**
   - `work_dashboards` — implied by capability `WORK-DASHBOARDS` but no master. Likely intentional (dashboards as derived projections, not as first-class entities). **Probably correct as is.**

**Recommended vetting modes:**
- **Eyeball mode (low cost):** user reads the list above and approves / declines each. ~5 min.
- **Formal Phase 0 (high confidence, higher cost):** spawn the vendor-surface subagent against [references/vendor-research-protocol.md](../.claude/skills/domain-map-analyst/references/vendor-research-protocol.md), generate the surface matrix in `c:/tmp/WORK-MGMT-phase0-2026-05-28.md`, drive Bucket 1 amendments from it.

---

### Neighbors (auto-discovered)

Ranked by edge weight (handoff rows + cross-domain DMDO consumer rows):

| Neighbor | Edges (handoffs) | DMDO consumer rows | Weight | Notable shape |
| --- | --- | --- | --- | --- |
| `PROD-MGMT` (101) | 7 (2 out, 5 in) | 3 | 10 | Bidirectional. WORK-MGMT roadmap/release/feature-request consumer; product_roadmaps + product_releases events flow inbound. |
| `SPM` (9) | 6 (2 out, 4 in) | 3 | 9 | WORK-MGMT acts as execution layer below SPM strategy. Multiple high-friction inbound (`strategic_portfolio.rebalanced`, `demand_intake.approved`). |
| `PSA` (68) | 4 (1 out, 3 in) | 3 | 7 | Services-org boundary. WORK-MGMT `work_project.completed` → PSA, PSA `project_assignment.*` → WORK-MGMT. |
| `TALENT-MGMT` (58) | 0 direct handoffs | 0 explicit consumer | structural | `okr_objectives` shared master — module 51 (TALENT-PERFORMANCE-MGMT) realizes its own lifecycle states on the same data_object. Pairwise reconciliation should walk the dual-mastery boundary. |
| `ITSM` (1) | 2 (2 out, 0 in) | 0 explicit | 2+ | `work_items mirrors_to service_requests` relationship exists; high-friction `work_item.status_changed`. |
| `EMP-EXP` (62) | 2 (0 out, 2 in) | 1 | 3 | `action_plan.created/completed` from EMP-EXP feed WORK-MGMT. |
| `WSC` (75) | 1 (1 out, 0 in) | 0 explicit | 1 | `work_automation.triggered` → WSC. |
| `TEST-MGMT` (8) | 1 inbound | 1 | 2 | `test_defect.created` → WORK-MGMT. |
| `CRM` (69) | 1 inbound | 1 | 2 | High-friction `crm_opportunity.closed_won`. |
| `IPAAS` (36) | 1 inbound | 1 | 2 | `webhook_subscription.delivery_failed`. |
| `PROC-MIN` (40) | 1 inbound | 1 | 2 | `business_rule_extracted.identified`. |
| `VSDP` (80) | 1 inbound | 1 | 2 | `pull_request.merged` → WORK-MGMT. |
| `NCDB` (134) | 1 inbound | 1 | 2 | `nocode_automation.triggered` → WORK-MGMT. |
| `BPA` (136) | 1 inbound | 1 | 2 | `process_simulation_run.bottleneck_identified`. |

**Per SKILL.md default**, deep-dive pairwise reconciliation runs against weight ≥3 neighbors: **PROD-MGMT, SPM, PSA, TALENT-MGMT (structural), EMP-EXP**. ITSM (weight 2) is a candidate add given the `work_items↔service_requests` mirror is one of the highest-friction edges in the catalog.

Lighter neighbors (weight ≤2): one-table summary unless explicitly asked.

---

### Decisions

*Pending. Awaiting per-bucket user choices and scope for the semantic + pairwise passes.*

### Fixes applied

*None yet.*
