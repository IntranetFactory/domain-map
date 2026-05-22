# TODO — Build the employee-jml process skill

> Operational task list for authoring the first process skill from the P1.7 discovery output. Design intent lives in [plan-process-skill-employee-jml.md](plan-process-skill-employee-jml.md); catalog rows already exist (`skills.employee-jml-process`, 106 `skill_tools`). This file is what's left: actually *building* the agent skill that the catalog has now described.
>
> **Recommended scope for v1: the LEAVER flow only.** Joiner and Mover ship in v2/v3 once the leaver is proven. Reasons: leaver is the highest-friction workflow in the catalog (6+ subscribers, audit/compliance pain), the most expensive to do manually, and the most isolated (no upstream onboarding-data dependencies). Joiner needs source data from ATS; mover needs HCM history — both extra integration surface. Leaver only needs HCM as trigger source.
>
> Tick checkboxes as work completes. Add `[~]` for in-progress.

---

## Phase 0 — Decide skill packaging + naming (~0.5 sessions)

- [ ] **Pick skill location.** Two options:
  - **(a)** `.claude/skills/employee-jml/` — same project, sibling to `domain-map-analyst`. Easiest dev loop; agent uses the same workspace.
  - **(b)** Separate repo / package — better for reuse across orgs but requires an extra publish step.
  Default: (a) until the skill is proven, then promote.
- [ ] **Confirm skill name.** Current catalog row is `employee-jml-process`. The Skill folder name can be shorter (`employee-jml`). Whichever — keep one canonical mapping.
- [ ] **Decide invocation triggers.** The skill is invoked when an `employee.terminated` event fires (v1). Add to SKILL.md description so the harness picks it up: "Use when an employee is being offboarded — final-pay processing, access revocation, asset recovery, COBRA initiation, ticket auto-close".
- [ ] **Decide tool-access model.** The skill reads from the live Semantius catalog at runtime to find the right `query_<master>` / `update_<master>` for each step (catalog-driven), OR the skill hard-codes the tool list at author time (snapshot). Recommendation: snapshot for v1 (deterministic, debuggable); switch to catalog-driven if the tool set churns.

---

## Phase 1 — Author SKILL.md (~1 session)

- [ ] **Description block (front-matter):** triggers, when to use, when NOT to use. Cap at 1500 chars (Claude's effective skill-summary window). Key phrasing seeds from [plan-process-skill-employee-jml.md](plan-process-skill-employee-jml.md): "Orchestrates employee offboarding across HCM, IGA, ITAM, ITSM, PAYROLL, BEN-ADMIN, AGENCY-MGMT. Use when an `employee.terminated` event needs cross-domain fan-out: final-pay calc, access revocation, asset recovery, COBRA initiation, agency-engagement close, auto-close of assigned tickets."
- [ ] **The Leaver workflow section** — the spine of v1:
  1. Validate inbound `employee.terminated` event payload (employee_id, termination_date, termination_type, voluntary_flag).
  2. Fetch employee record (`query_employees`) + active assignments (HCM masters).
  3. Branch on termination_type:
     - Voluntary → standard 14-day offboarding window
     - Involuntary → same-day access revocation, asset recovery escalated
     - Death/medical → COBRA + benefits-continuation expedited; family contact via `send_email`
  4. Fan-out (parallel where independent):
     - **IGA**: `query_iga_entitlement_definitions` → list user's entitlements → `update_employees` setting status='terminated' on IGA side → emit `iga_provisioning_events` for each revocation.
     - **ITAM**: query `asset_lifecycle_events` for this employee → schedule recovery → `update_hardware_assets` setting status='pending_recovery' → `send_email` to ITAM coordinator with the asset list.
     - **PAYROLL**: query final-pay calculation inputs → branch (voluntary uses standard payout, involuntary may include severance) → trigger final-pay run via PAYROLL mutate.
     - **BEN-ADMIN**: query active enrollments → `query_life_events` to log termination → trigger COBRA initiation (`send_email` to COBRA admin; mutate `benefit_enrollments` to status='cobra_offered').
     - **ITSM**: query open tickets assigned-to or requested-by this employee → branch (reassign to manager if open, auto-close with note if low-severity).
     - **AGENCY-MGMT**: query open agency_jobs / retainers tied to this employee → close or reassign per business rule.
  5. Compliance trail: write a synthetic `employee.terminated.completed` event back to HCM with the full action log (for audit).
- [ ] **Decision rules subsection.** Explicitly document the branches: voluntary vs involuntary vs medical (3 distinct flows). Each branch lists which downstream domains run and which are skipped.
- [ ] **Error handling subsection.** What if PAYROLL final-pay calc returns an exception? What if IGA revocation hits a system the user doesn't have access to (silent skip vs alert)? Document the failure-recovery posture. Recommendation: **fail-loud** for compliance-critical actions (access revocation, final pay), **best-effort with logging** for nice-to-haves (calendar deletions).
- [ ] **Anti-patterns.** Things the skill must NOT do: never delete the HCM employee row (it stays as a tombstone); never auto-archive the personnel file before the legal retention window; never send the COBRA notice before the termination is confirmed.

---

## Phase 2 — Generate references/ folder (~0.5 sessions)

- [ ] **`references/tool-list.md`** — the 106 tools available to this skill, grouped by purpose. Pull from [.tmp_deploy/load_p25b_process_skills.ts](.tmp_deploy/load_p25b_process_skills.ts) `employee-jml-process` block. Annotate each with "used in: joiner | mover | leaver" so v1 only loads the subset.
- [ ] **`references/domain-glossary.md`** — for each of the 12 involved domains, a one-paragraph what-the-skill-needs-to-know-about-it primer. Pull from existing system-skill SKILL.md fragments where they exist (most of these were loaded in P2.5A.iii without their own SKILL.md, so write fresh).
- [ ] **`references/trigger-events-subscribed.md`** — the `employee.*` events the skill listens for and the events it emits in response. Lookup table: each row maps event_name → action → fan-out destinations.
- [ ] **`references/runbook-leaver.md`** — the prose runbook of the leaver workflow. This is what the skill itself reads during execution. The SKILL.md is for *humans* to understand triggers; the runbook is for the *agent loop* to follow.
- [ ] **`references/test-fixtures.md`** — synthetic employee records covering voluntary / involuntary / medical-leave / death termination scenarios. Use real Semantius IDs so the skill can run end-to-end against the dev tenant.

---

## Phase 3 — Build a validation harness (~1 session)

- [ ] **Seed a test employee** in the dev tenant. Active in HCM with: 2 IGA entitlements, 1 active hardware_asset, 1 benefit_enrollment, 2 open ITSM tickets, 1 active agency assignment. Document the seed script at `.tmp_deploy/seed_test_employee.ts`.
- [ ] **End-to-end test (voluntary path).** Fire `employee.terminated` with `voluntary=true`. Verify post-state: employee status='terminated', IGA entitlements removed, hardware_asset status='pending_recovery', benefit_enrollment status='cobra_offered', ITSM tickets reassigned, agency assignment closed.
- [ ] **End-to-end test (involuntary path).** Same employee, fresh fixture. Verify same actions completed but on a same-day timeline + escalation flags set.
- [ ] **End-to-end test (medical/death path).** Verify expedited COBRA + family-contact email + standard fan-out.
- [ ] **Failure-mode tests.** What happens if PAYROLL is unavailable? IGA partial-failure? Document expected behavior and verify.

---

## Phase 4 — Connect the skill to the catalog (~0.5 sessions)

- [ ] **Wire the skill's tool-resolution.** The skill needs to call `query_employees`, `update_hardware_assets`, `send_email`, etc. Decide the mechanism:
  - Direct PostgREST calls (simplest, matches catalog idiom): the skill calls `semantius call crud postgrestRequest` with the right path. Tool names from the catalog map directly to PostgREST paths via `tools.data_object_id`.
  - SDK/wrapper layer: a thin TS module that wraps the tool calls with typed arguments. Higher dev cost, better safety.
  Recommendation: PostgREST direct for v1.
- [ ] **Wire external tools.** `send_email` needs an actual provider (M365, Google Workspace, SendGrid). Decide the integration: webhook to a dev mailbox for v1; production credential management lives in the harness, not the skill.
- [ ] **Wire `sign_document`** if v1 needs it. Initial decision: defer to v2; v1's leaver flow doesn't actually need a signature (the separation agreement is a follow-up workflow).
- [ ] **Cross-reference the catalog rows.** Add a back-reference: in the Semantius `skills.employee-jml-process` row, set `description` (or a new `repo_url` if/when added) to point at the skill folder. Single source of truth for "what is this skill, where does it live".

---

## Phase 5 — Productionise (~1 session, blocked on Phase 1-4)

- [ ] **Audit trail.** Every action the skill takes writes a row somewhere queryable. Decide where: a new `process_skill_executions` table or reuse `cross_domain_handoffs` with the skill_id added? Recommendation: new table — handoffs are the static catalog, executions are runtime.
- [ ] **Idempotency.** Re-running the skill on an already-offboarded employee must be safe (no double-COBRA notice, no duplicate ITSM ticket reassignments). Add idempotency keys to all mutate calls.
- [ ] **Manager-approval gate** (configurable). Some orgs require an HRBP to approve the COBRA fan-out before sending. Add a config toggle: `requires_approval: true|false` per org.
- [ ] **Observability.** Log every step + outcome to a structured log. Wire to the org's existing observability stack (OBS domain).
- [ ] **Failure escalation.** When a step fails, who gets notified? Document the on-call rotation in the skill's `references/`.

---

## Phase 6 — Pilot + iterate (~2-4 sessions across calendar time)

- [ ] **Pilot org.** Pick one org to run the skill against in shadow mode (skill runs, but no writes — produces a diff report only).
- [ ] **Run for 2 weeks shadow.** Compare skill output to manual offboarding actions. Surface the deltas.
- [ ] **Tighten branches.** The discovery query was based on the catalog's modeled handoffs, not real-world frequency. Some branches will be over-engineered; some will be missing.
- [ ] **Promote to write-mode** once shadow output matches manual within ≥95% confidence.

---

## Out of scope for v1 (deferred to v2+)

- **Joiner flow.** Author after leaver is proven. Estimated +1 session for SKILL.md, +1 for tests.
- **Mover flow.** Author after joiner. Estimated similar.
- **Sub-orchestrations** (severance calculation, separation-agreement drafting via `sign_document`, exit-interview scheduling via `create_calendar_event`). v2 work.
- **Multi-region tax/labor compliance.** Some terminations cross jurisdictions; v1 assumes single-region. Document the limit.
- **Bulk terminations** (layoffs / reductions). The skill processes one employee at a time. Bulk mode is a fan-out wrapper, v2.
- **The other two surfaced candidates** ([opportunity-l2c](plan-process-skill-opportunity-l2c.md), [case-service](plan-process-skill-case-service.md)) — their own todo files, after employee-jml ships.

---

## Effort estimate

| Phase | Est. sessions |
|---|---|
| 0 — packaging decisions | 0.5 |
| 1 — author SKILL.md | 1 |
| 2 — references/ | 0.5 |
| 3 — validation harness | 1 |
| 4 — catalog wire-up | 0.5 |
| 5 — productionise | 1 |
| 6 — pilot + iterate | 2-4 calendar weeks (passive) |

**Active build to ship-ready leaver flow: ~4-5 sessions.**

---

## Why employee-jml first (not opportunity-l2c or case-service)

Decision recap from [plan-process-skill-employee-jml.md](plan-process-skill-employee-jml.md) + the P1.7 discovery output:

| Factor | employee-jml | opportunity-l2c | case-service |
|---|---|---|---|
| Discovery rank score | **437** | 190 | 169 |
| Cross-function spread | **19** | 10 | 13 |
| High-friction handoffs | **3** | 3 | 3 |
| Universal applicability (every org runs it) | **yes** | mostly | yes |
| Single skill or multi-product? | **single** | overlaps with `order.*`, `contract.*`, `subscription.*` candidates | overlaps with HRSD + CSM separately |
| Substrate completeness | **all 12 domains have masters + handoffs** | requires resolving CLM↔CRM contract-draft FK on a future pass | needs the case.churn_risk handoff better-modeled |

employee-jml is the cleanest, highest-impact, most-universally-applicable starting point.
