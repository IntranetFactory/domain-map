---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: human
open_questions: 16
---

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
