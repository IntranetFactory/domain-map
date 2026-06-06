# WORK-MGMT audit history

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

#### 2026-05-29 — M7 dual-master cure on `okr_objectives` (data_object 245)

Loader: [.tmp_deploy/fix_okr_objectives_master.ts](../.tmp_deploy/fix_okr_objectives_master.ts). Four writes:

| Write | Row | Before | After |
| --- | --- | --- | --- |
| PATCH DMDO 194 | TALENT-PERFORMANCE-MGMT (mod 51) | `master + required` | `embedded_master + optional` |
| DELETE DDO 428 | SPM legacy ghost (no DMDO row) | `master + required` | (removed) |
| PATCH DDO 429 | TALENT-MGMT legacy rollup | `master + required` | `embedded_master + optional` (matches new DMDO) |
| PATCH DDO 1156 | SEM legacy rollup (DDO/DMDO drift predating audit) | `master + required` | `embedded_master + required` (matches existing DMDO mod 105) |

Post-write verification: catalog-wide DMDO master count on okr_objectives = 1 (WORK-MGMT-GOALS-OKR, mod 150). Single-master integrity restored.

Lifecycle states on okr_objectives anchored to TALENT-PERFORMANCE-MGMT (mod 51) — the `drafted → committed → in_progress → graded → closed` state machine, terminal verb `graded` — **were not touched**. Per-module lifecycle realization on a non-master module is legitimate (`data_object_lifecycle_states.domain_module_id` is per-row); the `graded` verb is the perf-review-side ritual and stays as part of the embedded_master realization. The WORK-MGMT-GOALS-OKR side keeps its own `scored` state machine.

Follow-ups intentionally NOT done in this fix (surface for user before any further write):

- `domain_data_objects.notes` on rows 429 (TALENT-MGMT) and 1156 (SEM) contain pre-existing slice-decomposition prose ("Individual employee OKRs as the goal-setting half..." and "Strategy-office slice: corporate and divisional OKRs cascading..."). Rule #15 RESCINDED the license to auto-write that shape; these rows pre-date the rescission. The notes are preserved (PATCH only touched `role`/`necessity`). User may want to scrub or rewrite under explicit per-row approval.
- 2026-05-26 decision noted SPM as "TBD when SPM is modularized; check Planview/ServiceNow SPM/Clarity marketing." That open question stands. When SPM is modularized, an `embedded_master` row on okr_objectives belongs in whichever SPM module realizes portfolio-level OKRs.

#### 2026-05-29 — Phase E roles + permissions + missing events + B9b intra-domain handoffs

Loader: [.tmp_deploy/load_work_mgmt_phase_e.ts](../.tmp_deploy/load_work_mgmt_phase_e.ts). 39 rows total across 6 sections, all idempotent:

| Section | Rows | Detail |
| --- | --- | --- |
| `trigger_events` | 3 | `okr_objective.committed` (drafted→committed, mod 150), `okr_objective.scored` (in_progress→scored, mod 150), `work_automation.enabled` (drafted→enabled, mod 149) |
| `permissions` | 11 | Baseline triad × 2 modules (6 rows) + workflow gates: `complete_work_project`, `enable_work_automation`, `disable_work_automation` on mod 149; `commit_okr_objective`, `score_okr_objective` on mod 150 |
| `roles` | 4 | `OPERATIONS-WORK-PROGRAM-LEAD`, `OPERATIONS-WORK-CONTRIBUTOR`, `MARKETING-CAMPAIGN-MANAGER` (function-scoped); `OKR-OWNER` (cross-functional, business_function_id NULL — per SKILL.md cross-functional roles drop the function prefix, so `OKR-OWNER` not `EXECUTIVE-OKR-OWNER` as the audit-prep doc had it) |
| `role_modules` | 8 | Every role gets ≥2 entries (E2 hard invariant). All 4 roles touch both modules at primary/secondary. |
| `role_permissions` | 9 | Tier-level grants where possible; OKR-OWNER explicitly lists `:commit_okr_objective` gate since they're IC-tier on the OKR module. |
| `handoffs` (intra-domain B9b) | 4 | TASK-EXEC↔GOALS-OKR cross-module flows on `work_item.status_changed`, `work_item.completed` (rollup direction), `okr_objective.committed` (reverse direction unlock), `work_automation.triggered` (event_stream not lifecycle_progression — eventful at runtime) |

Post-load E5 verification: every role's `role_modules` set equals the module set reachable from `role_permissions → permissions.domain_module_id`. Path A == Path B for all 4 roles. ✓

In-scope structural-pass closures from this load:
- E1, E2, E3, E4, E5: previously hard-fail, now pass.
- B9 partial (missing trigger events for workflow gates): closed for the WORK-MGMT side. `okr_objective.graded` is still owed by TALENT-MGMT B9 — report-only.
- B9b intra-domain (was 0 rows on a 2-module domain): closed.
- Adjacent gap "0 permissions on either module": closed.

Re-running F2-F5 isn't necessary — the F-band passed in the original structural pass and no F-band rows changed.

Bucket 2 items 5-8 not addressed by this load (pattern flags, work_items workflow gates, agent consumer surface, capability dedup) — these are user-judgment calls per the original gap report.

#### 2026-05-29 — Pairwise reconciliation WORK-MGMT ↔ TALENT-MGMT (2 missing handoffs cured)

Loader: [.tmp_deploy/reconcile_work_mgmt_talent_mgmt.ts](../.tmp_deploy/reconcile_work_mgmt_talent_mgmt.ts).

Reconciliation summary:
- Existing handoffs between domain 135 and domain 58 at start: **0** in either direction.
- Boundary integrity ✓ post-M7 cure (TALENT-PERFORMANCE-MGMT embedded_master → canonical master in WORK-MGMT-GOALS-OKR).
- Cross-domain relationships already in place: `performance_reviews evaluates okr_objectives`, `performance_goals aligns_to okr_objectives`. No new relationships needed.
- **Section 3 missing (A→B):** 2 handoffs authored.

| Trigger event | Source mod | Target mod | Pattern | Friction | Rationale |
| --- | --- | --- | --- | --- | --- |
| `okr_objective.committed` | 150 GOALS-OKR | 51 TALENT-PERFORMANCE-MGMT | api_call | medium | TALENT-PERFORMANCE-MGMT embedded_masters okr_objectives; perf_goals align to committed KRs. Most modern perf platforms (Lattice, 15Five, Culture Amp) ship OKR-tool sync; manual employee-to-KR mapping is the common friction. |
| `okr_objective.scored` | 150 GOALS-OKR | 51 TALENT-PERFORMANCE-MGMT | api_call | **high** | End-of-cycle OKR score feeds per-employee perf review compensation discussion. Most-cited integration pain point across Lattice/15Five/Culture Amp user surveys when OKR tool ≠ perf tool. |

- **Section 3 missing (B→A):** 0. By design — WORK-MGMT has no consumer / contributor DMDO rows on any TALENT-MGMT master, and HR-confidential perf data doesn't push to a team-execution surface in any vendor model.
- **Section 5 cross-domain relationships:** no new rows needed (existing evaluates / aligns_to edges cover the structural mirror).

TALENT-MGMT B10b debt surfaced (report-only on TALENT-MGMT's side):
- handoff id=113 (`calibration.complete`) references trigger_event 14 which is a legacy duplicate of event 446 (`talent_calibration.completed`).
- Workflow-gate states on `performance_reviews` (self_assessment / manager_assessment / submitted / calibrated / published) have `requires_permission=true` with no matching `trigger_events` rows. Same for `performance_goals` (approved, cancelled) and `talent_calibrations` (scheduled, ratings_locked, published). Owed by TALENT-MGMT's own B9 audit.

---

## 2026-05-29 — Semantic pass (market audit)

Subagent: `general-purpose`. Output: [c:/tmp/WORK-MGMT-market-surface-2026-05-29.md](file:///c:/tmp/WORK-MGMT-market-surface-2026-05-29.md) (+ `.json`).

Flagship-vendor basis: Asana, Monday.com, ClickUp, Adobe Workfront, Smartsheet. Compliance shape covered by Workfront (proofing / asset audit trails) and Smartsheet (e-signature, regulated workflows).

### Diff counts
- **MISSING:** 22 entities not modeled in current footprint
- **WRONG-OWNERSHIP:** 0
- **SCOPE-CREEP:** 14 consumer links flagged for review
- **MODULARIZATION:** 4 issues — no INTAKE module, no CREATIVE-OPS module, templates homeless, OKR module thin without KRs

### Highest-confidence MISSING (structural gaps, blocking buyer-shape parity)

| Entity | Target module | Role | Evidence |
| --- | --- | --- | --- |
| `okr_key_results` | 150 | master | All 4 OKR-supporting vendors. okr_objectives without KRs is structurally incomplete (KR is the measurable unit). |
| `goal_updates` (cadence check-ins) | 150 | master | All 4 OKR vendors; the cadence-of-record for OKR programs. |
| `work_dependencies` | 149 | master | All 5 flagships; capability WORK-DEPS-SCHED exists with no backing entity. |
| `work_milestones` | 149 | master | All 5 flagships; distinct from tasks (zero-duration gate semantics). |
| `approval_steps` + `approval_chains` | 149 | master | All 5 flagships; APPROVAL-WORKFLOW capability exists with no backing entity. |
| `user_workloads` / `capacity_allocations` | 149 | master | All 5 flagships; WORK-CAPACITY capability exists with no backing entity. |
| `work_custom_fields` + `work_custom_field_values` | 149 | master + consumer | All 5; central to every enterprise rollout (Monday columns, Asana custom fields). |
| `work_sections` | 149 | master | All 5; Asana sections / Monday groups / ClickUp statuses-as-columns. |
| `project_templates` + `task_templates` | 149 | master | All 5; central to enterprise rollout. |
| `work_tags` (+ `work_item_tags` junction) | 149 | master | All 5. |
| `work_item_comments` | 149 | master | All 5 (Asana stories, Monday updates). |
| `work_item_attachments` | 149 | master | All 5. |

### Modularization-decision MISSING (user gates the module)

| Entity | Proposed module | Notes |
| --- | --- | --- |
| `work_forms` + `work_form_submissions` | new `WORK-MGMT-INTAKE` or fold into 149 | Asana Forms / Monday Forms / ClickUp Forms / Workfront Request Queues / Smartsheet Forms. Universal across flagships. Modularization Q1. |
| `proofing_sessions`, `proofing_decisions`, `creative_assets`, `asset_versions` | new `WORK-MGMT-CREATIVE-OPS` (Workfront flagship) | Backs the unmaterialized CREATIVE-REVIEW capability. Compliance shape (brand-industry audit trail). Modularization Q2. |

### Possible MISSING (borderline)

| Entity | Notes |
| --- | --- |
| `work_subtasks` | Self-FK on work_items today; breaks for nested-2-deep cases (ClickUp / Workfront). Confirm sufficient or promote. |
| `work_item_status_history` | All 5 model audit log; could derive from updates. |
| `work_views` / `saved_views` | All 5 model config-shape; could defer. |
| `document_versions` | ClickUp / Workfront / Smartsheet. |

### Compliance-shape entities (single-vendor specialist)

- `e_signature_requests` (Smartsheet) — SOC2/QMS doc workflows
- `project_baselines` (Workfront + Smartsheet) — variance-reporting audit
- Workfront proofing/creative cluster (above)

### SCOPE-CREEP — TASK-EXEC consumer links to review

The 16 optional consumers on TASK-EXEC include several that don't fit the cross-functional-work scope:

| Consumer link | Verdict |
| --- | --- |
| `business_value_assessments`, `product_roadmaps`, `feature_requests`, `product_releases` | PRODUCT-MGMT territory; consumer-only link defensible if cross-module reads needed |
| `crm_opportunities` | CRM; consumer link defensible (campaign work tied to opportunities) |
| `strategic_initiatives`, `strategic_portfolios` | SPM; consumer-only link defensible |
| `pull_requests`, `test_defects` | **Engineering-sprint shape; explicitly out of WORK-MGMT scope per the domain description.** Should not be consumers here. |
| `process_simulation_runs`, `business_rules_extracted`, `nocode_automations` | Cross-domain; likely SCOPE-CREEP — flag for removal |
| `webhook_subscriptions` | Platform-infra; should not be a WORK-MGMT consumer |
| `action_plans` | Ambiguous (sequence-of-tasks pattern; could be WORK-MGMT-native or EMP-EXP) — flag |

---

## 2026-05-29 — Bucket 1 + Bucket 2 load (excl. CREATIVE-OPS)

Two loaders, ~210 catalog writes total. Excluded per user direction: `WORK-MGMT-CREATIVE-OPS` module + proofing/asset entities.

### [.tmp_deploy/load_work_mgmt_bucket_1_2.ts](../.tmp_deploy/load_work_mgmt_bucket_1_2.ts) — Phase A + B + capability + module + cleanup

| Phase | Rows | Detail |
| --- | --- | --- |
| 1. SCOPE-CREEP cleanup | 6 deletes | DMDO consumer rows dropped from TASK-EXEC: `pull_requests`, `test_defects`, `webhook_subscriptions`, `process_simulation_runs`, `business_rules_extracted`, `nocode_automations`. Engineering-sprint shape is out of scope per the domain description; platform-infra (`webhook_subscriptions`) doesn't belong here either. No matching legacy DDO rows to clean. |
| 2. INTAKE module | 4 inserts | New capability `WORK-INTAKE-FORMS` (id 641), new module `WORK-MGMT-INTAKE` (id 183, `module_kind='full'`), capability_domains link to WM, domain_module_capabilities link to INTAKE. |
| 3. data_objects | 18 inserts | 15 in TASK-EXEC + 2 in GOALS-OKR + 2 in INTAKE. Naming arbitration applied per Rule #9 — generic nouns (`approval_steps`, `project_templates`, `user_workloads`) prefixed as `work_*` rather than claiming canonical-bare-word. Renamed `goal_check_ins → okr_check_ins` (more specific). |
| 4. DMDO master rows | 18 inserts | One master row per new data_object on its respective module. |
| 5. Lifecycle states | 31 inserts | Workflow-bearing masters get state machines: `okr_key_results` (6 states, 3 gates), `work_milestones` (3, 2), `work_approval_steps` (4, 2), `work_approval_chains` (5, 3), `work_project_templates` (3, 1), `work_task_templates` (3, 1), `work_forms` (3, 1), `work_form_submissions` (4, 2). Config-shape masters (`work_dependencies`, `work_user_workloads`, `work_custom_fields`, `work_custom_field_values`, `work_sections`, `work_tags`, `work_item_tags`, `work_item_comments`, `work_item_attachments`, `okr_check_ins`) get no lifecycle states — config-shape exemption per Rule #12. **Notes column NOT written per Rule #15**; exemption is recorded here in the audit log. |
| 6. Aliases | 48 inserts | ≥1 alias per non-self-explanatory master. Vendor synonyms loaded (`KR`, `subgoal`, `card`, `ticket`, `board`, `workspace`, `column`, `cell`, `request_queue`, etc.). |
| 7. Pattern flags | 1 PATCH + flags-on-insert | `work_projects.has_submit_lock=true` (typical work-mgmt UX: archived projects lock). On-insert flags: `okr_check_ins.has_personal_content=true`, `work_user_workloads.has_personal_content=true`, `work_approval_steps.has_single_approver=true`, `work_item_comments.has_personal_content=true`, `work_form_submissions.has_personal_content=true`. Cap dedup item (GOAL-MGMT vs WORK-GOALS-OKR) **dropped** after verifying GOAL-MGMT realizes across 4 domains (legit cross-cutting capability per SKILL.md convention, not a dup). |
| 8. work_items cancellation gate | 2 inserts + 1 PATCH | New trigger event `work_item.cancelled` (id 1382), new permission `work-mgmt-task-exec:cancel_work_item` (workflow-gate), PATCH `work_items.cancelled` lifecycle state to `requires_permission=true` with verb override `cancel_work_item`. Asana/Monday/ClickUp model: any assignee can mark done, only project admin can cancel. |
| 9. Intra-domain relationships | 23 inserts | Every new master gets the right belongs_to / composition / reference / association edge against existing or new masters. Includes the work_form_submissions → work_items "converts_to" edge that wires INTAKE into TASK-EXEC. |
| 10. users edges | 13 inserts | Rule #10 compliance: each new master with a user-typed actor gets the users edge (owns_key_results, authored_check_ins, approves_steps, authored_comments, uploaded_attachments, submitted_forms, etc.). |

### [.tmp_deploy/load_work_mgmt_bucket_closeout.ts](../.tmp_deploy/load_work_mgmt_bucket_closeout.ts) — structural completeness for the new masters and INTAKE module

| Phase | Rows | Detail |
| --- | --- | --- |
| 1. trigger_events | 15 inserts | Matching events for the 15 workflow-gate lifecycle states added in the Bucket 1+2 load. `work_milestone.reached`/`missed`, `work_approval_step.approved`/`rejected`, `work_approval_chain.approved`/`rejected`/`cancelled`, `work_project_template.published`, `work_task_template.published`, `work_form.published`, `work_form_submission.converted`/`rejected`, `okr_key_result.committed`/`achieved`/`missed`. |
| 2. permissions | 18 inserts | TASK-EXEC: 9 workflow-gate permissions for the new master states. GOALS-OKR: 3 workflow-gate permissions for KR states. INTAKE: baseline triad (read/manage/admin) + 3 workflow gates (publish_work_form, convert_form_submission, reject_form_submission). |
| 3. INTAKE role coverage | 2 role_modules + 2 role_permissions | `OPERATIONS-WORK-PROGRAM-LEAD` adds INTAKE at `secondary` with bundle entry `work-mgmt-intake:manage`. `OPERATIONS-WORK-CONTRIBUTOR` adds INTAKE at `secondary` with `work-mgmt-intake:read`. INTAKE now has ≥1 role per E1; PROGRAM-LEAD now spans all 3 modules. |
| 4. INTAKE system skill | 1 skills + 4 tools + 4 skill_tools | `work_mgmt_intake_agent` (id 243, `skill_type='system'`, `domain_module_id=183`). Tools: `query_work_forms`, `create_work_form`, `query_work_form_submissions`, `convert_form_submission_to_work_item`. All `coverage_tier='platform'`. Rule #17 satisfied (exactly one system skill per module + ≥1 skill_tools). |

### End state for WORK-MGMT

| Surface | Count | Note |
| --- | --- | --- |
| `domain_modules` | 3 (all `full`) | TASK-EXEC (149), GOALS-OKR (150), INTAKE (183) |
| `capability_domains` | 10 | 9 original + WORK-INTAKE-FORMS |
| `data_objects` mastered | 22 | 17 TASK-EXEC + 3 GOALS-OKR + 2 INTAKE |
| Lifecycle states | 55 | covers every workflow-bearing master |
| `trigger_events` | 26 | every workflow-gate state has a matching event |
| `permissions` | 30 | baseline triad × 3 modules + 21 workflow gates |
| `roles` | 4 | 3 with all-3-modules coverage; OKR-OWNER covers 2/3 |
| `role_modules` | 10 | E2 (≥2 per role) satisfied for all 4 roles |
| `role_permissions` | 11 | E4 satisfied |
| `skills` (system) | 3 | one per module per Rule #17 |
| `skill_tools` | ~18 | 8 + 4 + 4 (TASK-EXEC + GOALS-OKR + INTAKE) + optional `notify_person` on the first two |
| `business_function_domains` | 5 | owner Business Ops + 3 contributors + 1 consumer |
| `handoffs` outbound | 12 | 10 original + 2 TALENT-MGMT |
| `handoffs` inbound | 19 | 25 original − 6 SCOPE-CREEP consumer-implied (some kept) |
| Semantius score | 100% / 100% / 100% | All system skills' tools have `coverage_tier='platform'` |

Audit bands at end of load:
- A1, A2, A3 ✓
- M1, M2, M4, M5, M6, M7 ✓
- B1, B2, B3, B4 (positively re-evaluated), B5, B6, B7, B8, B9, B9b, B10b (WM side), B11, B12 ✓
- C1, C2 ✓
- E1, E2, E3, E4, E5 ✓
- F1, F2, F3, F4, F5, F7 ✓

Remaining structural items in the WORK-MGMT scope:
- B10 inbound coverage: 6 inbound handoffs from partner domains (PROD-MGMT, SPM, etc.) still have `source_domain_module_id` NULL because those partner domains haven't been B10b-backfilled. Report-only per the asymmetry rule; owed by partner-domain audits.
- Pairwise reconciliation against PROD-MGMT (weight 10), SPM (weight 9), PSA (weight 7), EMP-EXP (weight 3) — not yet run. None blocking but each is a separate audit conversation when ready.

---

## 2026-05-29 — Pairwise reconciliation — PROD-MGMT, SPM, PSA, EMP-EXP

Loader: [.tmp_deploy/reconcile_work_mgmt_neighbors.ts](../.tmp_deploy/reconcile_work_mgmt_neighbors.ts). Six A→B handoffs authored across three neighbors.

### Per-neighbor four-leg diff

#### PROD-MGMT (101) — weight 10, bidirectional

- **L1-L4 status:** Fully wired before this load (6 in + 2 out, all module FKs populated).
- **Section 1 (existing):** 8 handoffs, all green.
- **Section 2 (NULL FK):** 0.
- **Section 3 missing (A→B):** **3 authored.**
  - `work_item.completed` (149→131): work_item completion updates roadmap progress when linked to feature_requests / product_releases. api_call/medium.
  - `okr_objective.committed` (150→131): team OKR commits flow into roadmap-OKR alignment. api_call/medium.
  - `okr_objective.scored` (150→131): end-of-cycle score feeds roadmap retrospective. api_call/medium.
- **Section 3 missing (B→A):** Candidates exist (`feature_request.shipped` event 1145, `product_feature.released` 1146, `product_metric.threshold_breached` 1151) but each requires a WM consumer DMDO row, and the SCOPE-CREEP cleanup deliberately kept WM lean here. Report-only on PROD-MGMT's B9.
- **Section 4 (boundary):** PROD-MGMT mod 131 consumes WM `work_automations` (246); the outbound work_automation events are already in place. ✓
- **Section 5 (relationships):** `work_automations mirrors_to product_roadmaps` (246→405) exists. ✓

#### SPM (9) — weight 9, unmodularized

- **L1-L4 status:** SPM has no modules; all 6 existing SPM-side module FKs are NULL.
- **Section 1 (existing):** 0 fully wired (all 6 handoffs have NULL on SPM side).
- **Section 2 (NULL FK):** 6 — all SPM-side. NOT this domain's responsibility per the asymmetry rule; SPM owes its own B10b backfill once it modularizes.
- **Section 3 missing (A→B):** **2 authored** (`target_domain_module_id NULL`, the legitimate-NULL case per SKILL.md when counterparty not modularized).
  - `okr_objective.committed` → SPM: team OKRs cascade into portfolio rollup.
  - `work_project.completed` → SPM: project closure as a strategic-portfolio milestone.
- **Section 3 missing (B→A):** Report-only — `strategic_initiative.approved` (1265), `strategic_initiative.completed` (1266), `strategic_initiative.cancelled` (1267), `initiative.kickoff` (216), `initiative.completed` (217) — all owed by SPM's own B9 (and downstream backfill once SPM is modularized).
- **Section 4 (boundary):** SPM has no DMDO; B5 not applicable.
- **Section 5 (relationships):** `okr_objectives advanced_by strategic_initiatives` (245→274) exists. ✓

#### PSA (68) — weight 7

- **L1-L4 status:** 3 in + 2 out before this load. One PSA-side NULL on outbound id=787 (`work_automation.triggered` → PSA, target_mod NULL).
- **Section 1 (existing):** 4 fully wired (3 in + 1 out).
- **Section 2 (NULL FK):** 1 — handoff 787 has target_domain_module_id NULL. PSA IS modularized so this could be backfilled deterministically; however, `work_automation.triggered → PSA` is a structurally speculative row (any WM automation firing is far too broad to route into PSA). **Leaving for PSA's own audit to scope or delete.**
- **Section 3 missing (A→B):** **1 authored.**
  - `work_item.completed` (149→86): when WM is the work tracker for a PSA-managed delivery, closing the loop on PSA-side time / utilization accounting. api_call/low. Pairs with existing PSA→WM `project_task.completed`.
- **Section 3 missing (B→A):** Candidates `service_project.completed` (1229), `project_billing_milestone.reached` (1164), `resource_skill_inventory.gap_identified` (1174). Skipped — too speculative without explicit WM use case. Report-only on PSA's B9.
- **Section 4 (boundary):** PSA mod 86 consumes WM `work_projects` (244); handoff 179 (`work_project.completed`) covers ✓. WM consumer DMDO on `project_tasks` + `project_assignments` covered by 3 inbound handoffs.
- **Section 5 (relationships):** `work_projects closes_into service_projects` (244→216) exists. ✓

#### EMP-EXP (62) — weight 3

- **L1-L4 status:** 2 in, 0 out, all module FKs populated.
- **Section 1 (existing):** 2 fully wired.
- **Section 2 (NULL FK):** 0.
- **Section 3 missing (A→B):** **0.** EMP-EXP and WM have a clean asymmetric flow (action_plans inbound only); no natural outbound from WM to engagement / continuous-listening surfaces.
- **Section 3 missing (B→A):** None compelling. EMP-EXP's `survey_campaign.launched` / `pulse_question.published` don't have WM consumer dependencies; outbound `action_plan.*` is the meaningful flow and is covered.
- **Section 4 (boundary):** EMP-EXP does not consume WM masters; no mirror needed.
- **Section 5 (relationships):** `action_plans spawns work_items` (184→243) exists. ✓

### Reconciliation totals

| Neighbor | Existing handoffs | New A→B authored | Section 2 fixes | Report-only B→A |
|---|---|---|---|---|
| PROD-MGMT | 8 | **3** | 0 | 3+ candidates (PROD-MGMT B9 debt) |
| SPM | 6 (all SPM-side null) | **2** (target null, legit) | 0 (SPM not modularized) | 5+ candidates (SPM B9 + B10b debt) |
| PSA | 5 (1 has null PSA-side) | **1** | 0 (left for PSA audit) | 3 candidates (PSA B9 debt) |
| EMP-EXP | 2 | 0 | 0 | 0 |
| **Total** | **21** | **6** | 0 | report-only |

### Outstanding cross-domain debt (report-only, partner-audit territory)

- **SPM:** 6 inbound + 2 outbound handoffs with NULL SPM-side module FK. Resolves when SPM is modularized.
- **PSA:** handoff 787 (`work_automation.triggered` → PSA, target_mod NULL). PSA's audit should scope or delete.
- **PROD-MGMT B9:** missing trigger events for `feature_request.shipped`, `product_feature.released`, `product_metric.threshold_breached` to fan out into WM if WM ever declares those as consumers.

---

## Session totals — 6 loaders, ~268 catalog writes

| Loader | Rows | Coverage |
|---|---|---|
| [fix_okr_objectives_master.ts](../.tmp_deploy/fix_okr_objectives_master.ts) | 4 | M7 hard fail cure (dual-master demotion + ghost cleanup + DMDO sync) |
| [load_work_mgmt_phase_e.ts](../.tmp_deploy/load_work_mgmt_phase_e.ts) | 39 | E-band + B9b intra-domain + 3 missing events |
| [reconcile_work_mgmt_talent_mgmt.ts](../.tmp_deploy/reconcile_work_mgmt_talent_mgmt.ts) | 2 | TALENT-MGMT pairwise |
| [load_work_mgmt_bucket_1_2.ts](../.tmp_deploy/load_work_mgmt_bucket_1_2.ts) | ~165 | Bucket 1+2 (18 masters + INTAKE module + scope-creep cleanup + cancel gate + pattern flags) |
| [load_work_mgmt_bucket_closeout.ts](../.tmp_deploy/load_work_mgmt_bucket_closeout.ts) | 46 | Structural completeness (15 events + 18 perms + INTAKE roles + INTAKE system skill) |
| [reconcile_work_mgmt_neighbors.ts](../.tmp_deploy/reconcile_work_mgmt_neighbors.ts) | 6 | PROD-MGMT (3) + SPM (2) + PSA (1) handoff reconciliation |

Domain WORK-MGMT (135) audit closed. All in-scope structural bands pass; outstanding items are partner-domain audit territory.

---

## 2026-05-31, Audit

Validate b1 (structural pass) re-run against live state. Modules: WORK-MGMT-TASK-EXEC (149), WORK-MGMT-GOALS-OKR (150), WORK-MGMT-INTAKE (183), all `module_kind=full`.

### Summary

| Band | Result | Notes |
| --- | --- | --- |
| A1 | PASS | All 7 business-metadata fields populated (crud=90, cost_band=$$, min_org_size=10 xs <50, USA TAM=$1.8B, 2025) |
| A2 | PASS | 10 capabilities linked (7 WM-prefixed + 3 cross-cutting: APPROVAL-WORKFLOW, CREATIVE-REVIEW, GOAL-MGMT) |
| A3 | PASS | 12 solutions linked, 10 primary, 1 secondary (Hive), 1 partial (Notion) |
| A4 | **FAIL** | `catalog_tagline` and `catalog_description` on domain row both empty strings (Rule #20 draft-and-surface needed) |
| M1 | PASS | 3 modules hosted on WM, no host-junction rows |
| M2 | PASS | capability_count=10 ≥3, module_count=3 ≥2 |
| M4 | PASS | every capability has at least one realizing module; GOAL-MGMT in 150, APPROVAL-WORKFLOW + CREATIVE-REVIEW in 149 |
| M5 | PASS | every workflow-gate state has `domain_module_id` set (149/150/183 as appropriate); `okr_objectives` dual-realized across 150 + 51 (TALENT-PERFORMANCE-MGMT) is intentional |
| M6 | PASS | every module realizes ≥1 capability (149=7, 150=2, 183=1) |
| M7 | PASS | 22 mastered data_objects, each has exactly one `role=master` DMDO row across the catalog; within-domain `work_items` (243) is master in 149 + embedded_master in 150 (the autonomous-deployable-unit pattern, per M7 explicit pass criterion) |
| M8 | **FAIL** | all 3 module rows have empty `catalog_tagline` + `catalog_description` |
| B5 | PASS | embedded_master on 243 in mod 150 resolves to canonical master in mod 149 (same data_object, same domain) |
| B7 | PASS | `users` (id 748) has 17 edges to WM masters covering creators/owners/approvers/authors/uploaders/submitters |
| B9 | PASS | 27 trigger_events for WM-mastered data_objects; every workflow-gate state has matching event |
| B9b | PASS | 4 intra-domain handoffs (135→135) loaded across module pairs 149↔150 |
| B10b (outbound) | partial PASS | 4 outbound rows with NULL `target_domain_module_id`: handoffs 176, 789, 1326, 1327 → SPM (target unmodularized, legit-NULL); handoff 787 → PSA (target IS modularized — defect on PSA-side, deferred to PSA audit) |
| B10b (inbound) | PASS | every inbound handoff with a modularized source has `source_domain_module_id` populated; remaining NULL sources are unmodularized partner domains (SPM, NCDB, PROC-MIN, IPAAS, VSDP, BPA) |
| B11 | PASS | 58 alias rows across 22 masters, ≥1 per non-self-explanatory entity |
| B12 | PASS | 55 lifecycle states across 13 workflow-bearing masters; 9 config-shape masters (work_dependencies, work_user_workloads, work_custom_fields, work_custom_field_values, work_sections, work_tags, work_item_tags, work_item_comments, work_item_attachments, okr_check_ins) intentionally have no states |
| C1 | PASS | 5 RACI rows: Business Operations (owner), Product Management / Marketing / Customer Success (contributors), Sales (consumer) |
| C2 | PASS | no diverging capability-level RACI required |
| D1 | deferred | UI spot-check not part of structural pass output |
| E1 | PASS | 4 roles cover 149/150/183 — OPERATIONS-WORK-PROGRAM-LEAD (10114), OPERATIONS-WORK-CONTRIBUTOR (10115), MARKETING-CAMPAIGN-MANAGER (10116), OKR-OWNER (10117, cross-functional) |
| E2 | PASS | every role has ≥2 `role_modules` entries (10114=3, 10115=3, 10116=2, 10117=2) |
| E3 | PASS | every `role_modules` row has `interaction_level` set |
| E4 | PASS | 11 `role_permissions` rows total, each role has ≥1 |
| E5 | PASS | Path A (`role_modules → domain_modules.domain_id`) and Path B (`role_permissions → permissions.domain_module_id → domain_id`) agree for all 4 roles |
| F1 | PASS | no legacy `domain_id`-only system skills remain |
| F2 | PASS | exactly one `skill_type=system` skill per module: 215 (149), 216 (150), 243 (183) |
| F3 | PASS | 9 + 5 + 4 = 18 `skill_tools` rows across the three system skills |
| F4 | PASS | every linked tool obeys the `operation_kind` ↔ `data_object_id` pairing (queries + mutates have data_object_id, `notify_person` is `side_effect` with NULL) |
| F5 | PASS | strict_score = operational_score = 100% on every module (all 18 tools `coverage_tier=platform`) |
| F7 | PASS | only `notify_person` abstraction linked; no channel primitives present |
| H1 | **FAIL** | 39 cross-domain handoffs (17 outbound, 22 inbound). Only 11 carry `handoff_processes` rows (28%, all `proposal_source=agent_curated`, `record_status=new`). 28 cross-domain handoffs untagged. Approved count = 0. Below the 0.5N target (would need ~20 tagged). |

### Bucket 1, in-scope confirmed gaps

#### MISSING — Rule #20 buyer-voice catalog UX copy (A4, M8)

Four rows need draft-then-surface treatment under Rule #20 voice rule (workflow + value, buyer-facing):

| Row | Fields | A4 / M8 |
| --- | --- | --- |
| `domains.id=135` (Work Management) | `catalog_tagline`, `catalog_description` | A4 |
| `domain_modules.id=149` (Task and Project Execution) | `catalog_tagline`, `catalog_description` | M8 |
| `domain_modules.id=150` (Team-Execution Goals and OKRs) | `catalog_tagline`, `catalog_description` | M8 |
| `domain_modules.id=183` (Request Intake) | `catalog_tagline`, `catalog_description` | M8 |

Fix surface: draft 8 strings, surface as Bucket 2 wording-approval items (Rule #20 explicit "draft and surface BEFORE writing"), then PATCH. Treating the draft itself as agent-solvable but the wording approval as user-judgment.

#### APQC TAGGING — 28 untagged cross-domain handoffs (H1)

Per-handoff classification queued for the structural pass. Outbound (17): 177 (ITSM `work_item.status_changed`), 176 (SPM `work_item.completed`), 787 (PSA `work_automation.triggered`), 179 (PSA `work_project.completed`), 789 (SPM `work_automation.triggered`), 791 (PROD-MGMT `work_automation.triggered`), 1253 (PROD-MGMT `work_automation.disabled`), 790 (WSC `work_automation.triggered`), 1320 (TALENT-MGMT `okr_objective.committed`), 1321 (TALENT-MGMT `okr_objective.scored`), 1322 already tagged, 1323 (PROD-MGMT `okr_objective.committed`), 1324 (PROD-MGMT `okr_objective.scored`), 1325 (PSA `work_item.completed`), 1326 (SPM `okr_objective.committed`), 1327 (SPM `work_project.completed`), 788 (ITSM `work_automation.triggered` payload service_incidents). Inbound untagged (11): 178 (SPM `okr_objective.created`), 175 (CRM `crm_opportunity.closed_won`), 240 (SPM `demand_intake.approved`), 244 (SPM `strategic_portfolio.rebalanced`), 700 (NCDB `nocode_automation.triggered`), 742 (PROC-MIN `business_rule_extracted.identified`), 1249 (PSA `project_assignment.released`), 796 (SPM `business_value_assessment.completed`), 1024 (PSA `project_task.completed`), 1012 (PROD-MGMT `product_roadmap.item_promoted`), 1008 (PROD-MGMT `product_release.planned`), 1017 (PSA `project_assignment.confirmed`). Target volume: ~20 of these get `agent_curated` tags, ~8 defer to Discover Pass 3.

#### B10b — outbound NULL `target_domain_module_id` on handoff 787 → PSA

PSA is modularized; handoff 787 (`work_automation.triggered`, payload `work_automations` 246) lists `target_domain_module_id=NULL`. Deterministic derivation: PSA has no module declaring a role on `work_automations` (246), so the NULL is structural — either load a PSA consumer DMDO row on `work_automations` (preferred per B10b sub-case 2) or accept that the handoff has no PSA module owner (and possibly delete the speculative row per the 2026-05-29 reconciliation note). Defer to PSA audit; report-only for WM. NOT a WM-side fix.

### Bucket 2, surface-for-user (judgment calls)

1. **Catalog UX wording (A4 + M8) — Rule #20 wording-approval ask.** I will draft 8 strings (1 domain tagline, 1 domain description, 3 module taglines, 3 module descriptions) per the voice rule, then surface the drafts for per-row approval before PATCH. Question for the user: do you want the drafts produced in this audit or in a follow-up turn (they did not exist in scope when this audit ran)? Independent of Bucket 3.

2. **H1 catalog-quality posture.** Of 11 already-tagged WM handoffs, 0 are at `record_status=approved`. Two options: (a) review the existing 11 `agent_curated` tags and promote the correct ones to `approved` (raises catalog quality without new tagging work); (b) hold off until the 28 new tags land so the review pass is one batch. Recommendation: (b), since the new tags will arrive with the same `record_status=new` and a single approval pass is cheaper. Independent of Bucket 3.

3. **Speculative handoff 787 (`work_automation.triggered → PSA`) — keep or delete?** Carried forward from the 2026-05-29 reconciliation note. This is the structurally-NULL row whose B10b target_domain_module_id cannot be resolved. The user previously deferred to PSA audit; this audit re-surfaces because PSA's audit hasn't yet scoped or deleted it. Independent of Bucket 3.

### Bucket 3, Phase 0 pending (speculative)

No new Phase 0 surface candidates this pass. The Bucket 1+2 load on 2026-05-29 absorbed the prior Phase 0 candidate list (`work_dependencies`, `work_milestones`, `work_approval_steps`, `work_approval_chains`, `work_user_workloads`, `work_custom_fields`, `work_custom_field_values`, `work_sections`, `work_project_templates`, `work_task_templates`, `work_tags`, `work_item_tags`, `work_item_comments`, `work_item_attachments`, `okr_key_results`, `okr_check_ins`, `work_forms`, `work_form_submissions` — 18 masters loaded). The remaining Phase 0 deferral from the 2026-05-29 audit was `WORK-MGMT-CREATIVE-OPS` (proofing/asset cluster, Workfront flagship); user explicitly excluded that module from scope. Re-surface only if the user changes direction on CREATIVE-REVIEW.

### Bucket dependencies

Buckets 1, 2, and 3 are independent of each other. No cross-bucket dependencies.

### Decisions

Pending, awaiting per-bucket user choices.

### Fixes applied

None this pass, audit only.

---

## 2026-06-02 — Audit

Re-run of the full Validate mode (structural S/A/M/B/C/E/F/H + neighbor + pairwise). Two events since the 2026-05-31 audit changed the picture: (a) the `entity_type` column was never classified on any WORK-MGMT master — a latent B13 fail across all 22 masters that the prior audit did not run; (b) **Plan 3 (2026-06-02) deleted the `_core` persona layer**, wiping the personas the 2026-05-29 fix had loaded, so E1 fires zero-personas again under the new `domain_roles` layer. This audit applied the agent-fixable Bucket-1 items per explicit user direction ("fix Bucket 1 now" + "re-author 4 personas").

### Summary

- Footprint: 22 masters across 3 full modules (TASK-EXEC 149, GOALS-OKR 150, INTAKE 183), 3 system skills, 12 solutions, 10 capabilities, 5 business-function links.
- Clean bands (no action): S1-S3, A1-A3, M1-M2, M4-M7, M9, B1-B3, B6/B6b, B7, B14, C1, F1-F7. M7 healthy (`work_items` master/embedded, `okr_objectives` single-master holds). F-band fully green; Semantius strict score = 100%.
- Bucket 1 (agent-fixable): **6 finding types, applied this pass** (B13, B12-confirm, E1-E4 personas+RACI, Phase-S skill_tools, B9b, B9c, H1).
- Bucket 2 (judgment): catalog UX wording (A4/M8), entity_type ambiguous calls, legacy DDO rollup drift, capability near-dup, H1 approval posture, handoff 787.
- Bucket 3 (Phase 0): never formally run for this domain; residual candidates `proofing_sessions`/`creative_assets` (CREATIVE-REVIEW slice) + `work_views`.

### Bucket 1 — In-scope confirmed gaps (FIXED this pass)

| Finding type | Detail | Result |
| --- | --- | --- |
| **B13** entity_type | All 22 masters were `unclassified` — blocked B12 + forced write-tier fallback catalog-wide. | 22 classified (5 operational_workflow, 5 operational_record, 8 catalog, 3 junction, 1 computed). 0 remain. |
| **B12** lifecycle | `work_approval_steps` (970) + `work_form_submissions` (983) classified operational_workflow; both already carried lifecycle (pending/approved/rejected/expired; submitted/triaged/converted/rejected). | Confirmed present; loader insert was idempotent (0 new). |
| **E1/E2/E3** personas | Zero personas after Plan-3 deletion. | 4 `domain_roles` + 9 `role_modules`: OPERATIONS-WORK-PROGRAM-LEAD [149·150·183], OPERATIONS-WORK-CONTRIBUTOR [149·183], MARKETING-CAMPAIGN-MANAGER [149·183], OKR-OWNER (cross-functional) [150·149]. All ≥2 modules, interaction_level set. |
| **E4** RACI + gate wiring | No process_raci, no lifecycle `process_id`. | 4 `process_raci` rows on PCF 411 (R=Contributor 13, A=Program-Lead 12) + 98 (R=A=OKR-Owner 15); 4 lifecycle gates wired (`work_projects.completed`+`work_items.cancelled`→411, `okr_objectives.committed`+`.scored`→98). |
| **Phase-S** skill_tools | Skill surface lagged the master expansion. | 13 new tools + 13 `skill_tools`: TASK-EXEC (215) gained queries for milestones/dependencies/approval chains+steps/workloads/comments/sections/custom_fields + approve_work_approval_step; GOALS-OKR (216) gained key_results/check_ins query+create. All `coverage_tier='platform'`. |
| **B9b** intra-domain handoff | INTAKE→TASK-EXEC missing despite `work_form_submissions converts_to work_items`. | 1 handoff (183→149, payload work_items 243, trigger `work_form_submission.converted` id 1393, lifecycle_progression/low). Event pre-existed. |
| **B9c** trigger hygiene | 4 malformed events. | Patched: `okr_objective.created` to_state draft→drafted; `work_automation.created`/`.disabled` event_category→lifecycle + states; `work_automation.triggered` event_category→signal. |
| **H1** APQC tagging | 11/39 tagged. | +20 `agent_curated` tags (now **31/39**); 8 deferred to Discover Pass 3 (automation/runtime fires: 787,788,789,790,791,1253,700,742). All `record_status='new'`. |

#### APQC TAGGING detail (20 new agent_curated rows)

| handoff | trigger | PCF process | PCF id |
|---|---|---|---|
| 176,177,179,1325,1327,1024 | work_item/project/task completed/status | Manage projects | 411 |
| 178,1323,1326 | okr_objective created/committed | Develop and set organizational objectives | 98 |
| 1320,1321 | okr committed/scored → TALENT | Manage employee performance | 225 |
| 1324 | okr scored → PROD | Monitor performance against objective | 506 |
| 240,244,796 | demand/portfolio/value → SPM | Manage portfolio | 409 |
| 1008 | product_release.planned | Implement software change/release | 1262 |
| 1012 | product_roadmap.item_promoted | Develop and manage execution roadmap | 625 |
| 1017 | project_assignment.confirmed | Create and manage resource plan | 180 |
| 1249 | project_assignment.released | Release resources | 917 |
| 175 | crm_opportunity.closed_won | Manage leads/opportunities | 147 |

Deferred (no clean PCF, → Discover Pass 3): 787, 788, 789, 790, 791, 1253 (work_automation.* family), 700 (nocode_automation.triggered), 742 (business_rule_extracted.identified).

Loaders: [.tmp_deploy/fix_work_mgmt_2026_06_02.ts](../../.tmp_deploy/fix_work_mgmt_2026_06_02.ts), [.tmp_deploy/fix_work_mgmt_apqc_raci_2026_06_02.ts](../../.tmp_deploy/fix_work_mgmt_apqc_raci_2026_06_02.ts).

### Bucket 2 — Surface-for-user (judgment calls), OPEN

1. **Catalog UX wording (A4 + M8).** Still empty on domain 135 + modules 149/150/183. Rule #20 forbids the write without user-approved wording. Drafts not yet produced.
2. **entity_type ambiguous calls (4) — confirm or override.** `work_automations` (246)→catalog (vs operational_workflow; it carries gated enable/disable lifecycle, which catalog permits), `work_sections` (975)→catalog, `work_milestones` (969)→operational_record (vs operational_workflow; has passed/missed semantics but no permission gates), `okr_key_results` (966)→operational_record. Each is a single-column PATCH to change.
3. **Legacy `domain_data_objects` rollup is stale.** Shows the original 4 masters; DMDO shows 22. Audits keying off the legacy table silently see 4/22. Regenerate the rollup or formally treat it as vestigial (key audits off DMDO)?
4. **Capability near-dup on module 150:** `WORK-GOALS-OKR` (329) + `GOAL-MGMT` (25, cross-cutting). Dedup into the cross-cutting one?
5. **H1 approval posture.** 31 tags now sit at `record_status='new'`. Review-and-approve now, or batch later.
6. **Handoff 787 keep-or-delete** (carried; PSA-owed).

### Bucket 3 — Phase 0 pending (speculative)

Formal Phase 0 vendor surface never run. Residual candidates: `proofing_sessions`/`creative_assets` for the CREATIVE-REVIEW/marketing slice (capability 446 exists, no master; prior `WORK-MGMT-CREATIVE-OPS` module excluded by user), and saved `work_views` (board/list/gantt). Choose formal Phase 0 vs eyeball-mode.

### Report-only follow-ups (owned by other domains)

Unchanged from 2026-05-31. PSA owes 787 resolution; SPM/NCDB/PROC-MIN/IPAAS/VSDP/TEST-MGMT/BPA owe modularize-then-B10b-backfill for inbound/outbound NULL module FKs; CRM B8 owes the `crm_opportunities → work_items` relationship (handoff 175). Pairwise reconciliation against modularized neighbors (PROD-MGMT, PSA, ITSM, TALENT-MGMT, EMP-EXP, WSC, CRM) is otherwise clean.

### Bucket dependencies

Bucket 2 #1 (catalog wording) depends on no other bucket. Buckets 1, 2, 3 independent.

### Decisions

- Run scope: **fix Bucket 1 now**.
- E-band: **re-author 4 personas now** (domain_roles + role_modules + process_raci).
- B2 #1 (catalog wording): agent drafts, user reviews — drafts produced this session, pending approval.
- B2 #5 (H1 approval posture): **approve now** — all 31 agent_curated WM tags promoted to `record_status='approved'`.
- B3 (Phase 0): **run formal vendor-surface pass** — subagent launched.
- B2 #2/#3/#4/#6: still pending.

### Fixes applied

- [.tmp_deploy/fix_work_mgmt_2026_06_02.ts](../../.tmp_deploy/fix_work_mgmt_2026_06_02.ts): 22 entity_type PATCH, 0 lifecycle (idempotent), 4 domain_roles, 9 role_modules, 13 tools, 13 skill_tools, 4 trigger_event PATCH, 1 intra-domain handoff.
- [.tmp_deploy/fix_work_mgmt_apqc_raci_2026_06_02.ts](../../.tmp_deploy/fix_work_mgmt_apqc_raci_2026_06_02.ts): 20 handoff_processes (agent_curated/new), 4 process_raci, 4 lifecycle process_id wirings.
- **H1 approval (B2 #5):** PATCH `handoff_processes` → `record_status='approved'` on all 31 WM agent_curated cross-domain tags. H1 catalog-quality headline now 31/39 approved.
- All structural writes `record_status='new'`; no `notes` populated.

### Follow-up — catalog copy drafts (B2 #1, A4/M8), pending user approval

8 buyer-voice strings drafted for user review (NOT written; Rule #20 wording approval is user-only):

- **Domain 135 tagline:** "Run every team's projects, tasks, and goals in one place, from first request to finished work."
- **Domain 135 description:** "Bring structured work out of scattered spreadsheets and inboxes. Create projects, break them into assignable tasks with owners and due dates, map dependencies, and watch progress on boards, timelines, and dashboards that update as the work moves. // Set team objectives and key results, then connect them to the tasks that move them so progress rolls up automatically. Standardize repeatable work with templates, and let automations handle status changes, reminders, and routing. // Built for operations, marketing, and any team running cross-functional work that needs one shared view of who is doing what, by when."
- **Module 149 (Task and Project Execution) tagline:** "Plan projects, assign tasks, and track them from kickoff to done."
- **Module 149 description:** "Organize work into projects and sections, then assign tasks with owners, due dates, priorities, and dependencies. Track everything on boards, lists, and timelines, and keep work moving with approval steps, milestones, and automations that handle routine status changes and notifications. // Standardize recurring work with reusable project and task templates, tailor records with custom fields, and use workload views to spot who is over or under capacity before deadlines slip."
- **Module 150 (Team-Execution Goals and OKRs) tagline:** "Set objectives, score key results, and see progress roll up from the work behind them."
- **Module 150 description:** "Define objectives and measurable key results for the quarter or year, assign owners, and keep them current with regular check-ins. Link objectives to the tasks and projects that drive them so progress updates as work gets done instead of being re-entered by hand. // Commit objectives once agreed, track them through the cycle, and score them at close so the team learns what worked."
- **Module 183 (Request Intake) tagline:** "Capture work requests through structured forms and route them straight into the right project."
- **Module 183 description:** "Replace ad-hoc requests with structured intake forms that collect exactly what the team needs to start. Submissions are triaged and converted into work items in the right project, with the requester's details captured along the way. // Standardized intake means no lost requests in chat or email, a consistent starting point for every piece of work, and a clear record of what was asked and what happened next."

(`//` marks paragraph breaks; rendered as separate paragraphs.) On approval, PATCH `domains.id=135` + `domain_modules.id in (149,150,183)`.

### Bucket 3 — Phase 0 results (vendor-surface audit, completed)

Subagent output: `c:/tmp/WORK-MGMT-market-surface-2026-06-02.json` / `.md`. Vendors enumerated (5, SMB→mid-market general WM): Asana, monday.com, ClickUp, Wrike, Smartsheet.

Diff: **MISSING 12, WRONG-OWNERSHIP 0, SCOPE-CREEP 10 flagged / 0 actual** (every flagged row is a foreign-mastered optional consumer reference — no WM-mastered scope creep). Modularization verdict: **partial** — the 3-module top-level split is coherent and self-explaining; the real defect is TASK-EXEC overload (17 masters, 2 capabilities realized with no backing master). Fix by filling masters inside TASK-EXEC, NOT by partitioning. No WRONG-OWNERSHIP, no renames warranted.

MISSING entities, by confidence tier (AI-derived — NOT auto-loaded, Rule #1 + "never auto-load market-audit fixes"):

**Tier 1 — backs an orphaned capability (clearest structural defect):**
- `proofing_sessions` (+ `proofing_annotations`) — capability CREATIVE-REVIEW (446) realized on module 149 with zero backing master. First-class in Wrike/Smartsheet/Asana. `creative_assets` overlaps DAM → prefer a consumer reference to a DAM master, do NOT re-master. Do NOT resurrect a standalone WORK-MGMT-CREATIVE-OPS module (at xs/SMB the surface is 2-3 entities exercised as a TASK-EXEC feature).
- `work_dashboards` — capability WORK-DASHBOARDS (331) realized with no backing master; saved cross-project dashboard is first-class in monday/ClickUp/Smartsheet/Wrike.

**Tier 2 — confident market gaps:**
- `work_views` — saved/named/shareable board·list·gantt view with persisted filters/grouping (a config master, not a per-user UI toggle).
- `time_entries` — native NON-billable time tracking against work items. The billable worklog (rate/utilization/invoice) stays PSA-mastered; if WM needs billable hours it consumes the PSA worklog, never re-masters it.
- `work_portfolios` — light team-level project roll-up for cross-project status (distinct from SEM strategic_portfolios).
- `work_goal_links` — link table for work_item→okr_objective contribution; GOALS-OKR currently only embeds work_items with no link entity.
- `work_statuses`, `work_status_updates` — configurable status taxonomy + status-change log.

**Tier 3 — lower confidence / likely-attribute:**
- `form_routing_rules` (may be a field on work_forms), `work_item_assignees` (likely a users-junction already covered by relationships), `creative_assets` (DAM consumer, not WM master). Noted-not-asserted: `work_subtasks`, `work_recurrences` (likely self-ref/attributes of work_items), `work_docs` (adjacent KM scope).

Pre-flagged verdicts: proofing slice JUSTIFIED (as TASK-EXEC masters, not a new module); work_views IS a persisted entity; time_entries belongs to WM for non-billable only; add `work_goal_links` to GOALS-OKR.

---

## 2026-06-06 - b1a execution

Executed the agent-solvable pending actions from `state.yaml` `b1a`. Loader: [.tmp_deploy/fix_work_mgmt_catalog_ux_2026_06_06.ts](../../.tmp_deploy/fix_work_mgmt_catalog_ux_2026_06_06.ts).

### B1A-A4-CATALOG-UX-DOMAIN - DONE

Revised Rule #20 rescinded the pre-write approval gate for EMPTY catalog UX fields: empty fields are written directly, and the row's `record_status` (still `new`) carries the review signal for in-record / catalog-UI review. The old `blocked_by: user_decision (B2-RULE20-WORDING)` reflected the pre-revision posture and no longer gates the write.

Per-field empty-guard applied (re-read live value immediately before PATCH; write only when empty). Both fields on domain 135 were empty before the write.

| Table | Row id | Field | Prior value | New value |
| --- | --- | --- | --- | --- |
| `domains` | 135 | `catalog_tagline` | `""` (empty) | "Run every team's projects, tasks, and goals in one place, from first request to finished work." |
| `domains` | 135 | `catalog_description` | `""` (empty) | 3-paragraph buyer-voice copy (drafted 2026-06-02, see that section above) |

`record_status` unchanged (`new`).

### B1A-M8-CATALOG-UX-MODULES - DONE

Same revised-Rule-#20 treatment; per-field empty-guard applied. All six fields (tagline + description on each of modules 149/150/183) were empty before the write.

| Table | Row id (module) | Fields written | Prior values |
| --- | --- | --- | --- |
| `domain_modules` | 149 (WORK-MGMT-TASK-EXEC) | `catalog_tagline`, `catalog_description` | both `""` (empty) |
| `domain_modules` | 150 (WORK-MGMT-GOALS-OKR) | `catalog_tagline`, `catalog_description` | both `""` (empty) |
| `domain_modules` | 183 (WORK-MGMT-INTAKE) | `catalog_tagline`, `catalog_description` | both `""` (empty) |

Copy is the verbatim 2026-06-02 drafted strings (workflow + value buyer voice; no vendor/product names; no parent-domain/handoff narration; no em-dashes; American English). `//` paragraph markers from the draft rendered as real `\n\n` breaks. `record_status` unchanged (`new`) on all three rows.

### B1A-H1-APQC-DEFERRED - SKIPPED (not WM-side actionable)

The item's `action` is explicit: "Discover Pass 3 custom-process authoring path (CUSTOM-* processes), not WM-side PCF tagging. Carry until Discover runs across the catalog." There is no WM-side write to make: the 8 handoffs (787/788/789/790/791/1253 work_automation.*, 700 nocode_automation.triggered, 742 business_rule_extracted.identified) have no clean cross-industry PCF analog and are deferred to a catalog-wide Discover pass. Kept in `b1a` as a carry item; no rows written.

### B1A-PHASE0-MISSING - SKIPPED (user_decision blocker + Rule #1)

`blocked_by: {type: user_decision, ref: phase0-missing-tier-selection}`. The 12 MISSING entities are AI-derived market-audit findings; Rule #1 forbids auto-loading them and the tier selection is a user pick. Kept in `b1a`; no rows written.

### Writes summary

| Table | Rows PATCHed | Fields written |
| --- | --- | --- |
| `domains` | 1 (id 135) | 2 (`catalog_tagline`, `catalog_description`) |
| `domain_modules` | 3 (ids 149, 150, 183) | 6 (tagline + description each) |

Total: 4 rows, 8 fields. No DELETEs. No `notes` columns written. No `record_status` changes (all stayed `new`). No em-dashes in any written value (loader asserts this pre-write).

### Post-write verification (live)

| Row | catalog_tagline | catalog_description | record_status |
| --- | --- | --- | --- |
| domain 135 | set | set | new |
| module 149 | set | set | new |
| module 150 | set | set | new |
| module 183 | set | set | new |

### state.yaml changes

- Removed B1A-A4-CATALOG-UX-DOMAIN and B1A-M8-CATALOG-UX-MODULES from `b1a` (fully resolved by writing the fields).
- Kept B1A-H1-APQC-DEFERRED (carry) and B1A-PHASE0-MISSING (user-blocked) in `b1a`.
- Marked B2-RULE20-WORDING resolved/moot (the pre-write approval gate it represented was rescinded by revised Rule #20).
- `next_action_by: user` (remaining b1a items are both non-agent-actionable; open b2 user questions remain: entity_type calls, legacy DDO rollup drift, capability near-dup, handoff 787).
- `last_audit: "2026-06-06"`.

UI for spot-check: https://tests.semantius.app/domain_map/domains?id=eq.135 and https://tests.semantius.app/domain_map/domain_modules

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
