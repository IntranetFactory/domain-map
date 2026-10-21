# INTRANET-GOV — Market surface (Validate semantic pass, 2026-06-10)

Complements the build-time white-space study `audits/INTRANET-GOV/INTRANET-GOV-phase0-2026-06-10.md`. That study established there is NO pure-play vendor in this agnostic-overlay market; the flagship substrate below is drawn from ADJACENT M365-governance tools (Orchestry, SAM, ShareGate) and accessibility specialists (Siteimprove, Acquia), and the question this pass raises is how much of that substrate the agnostic overlay should adopt. The build shipped a deliberately-thin MVP (4 masters + computed health score + embedded work_items); this diff is the "deepen vs keep-MVP" decision.

## Flagship substrate (adjacent vendors)

- **Orchestry** — recurring review campaigns ("Review Recurrence"), archival/renewal policies, orphan/stale detection.
- **Microsoft SharePoint Advanced Management + Viva** — "Site Attestation Policy" (recurring owner recertification), inactive-site policies, Data Access Governance / oversharing reports.
- **ShareGate (Protect)** — orphaned-owner assignment, oversharing/permissions findings, governance risk score.
- **Simpplr** — per-page validation periods + expiration states (cycle expressed as a period, not a named campaign).
- **Siteimprove** — accessibility conformance (WCAG / ACT rules), QA issues, content policies (specialist).
- **Acquia Optimize** — accessibility tracker + audit log, PDF audits, remediation requests (specialist).

## Diff vs current footprint

**MISSING (substrate the flagships model, absent in our MVP):**
- **Recertification campaign / review cycle** (Or, MS, SG, Si) — the cadence-driven batch that spawns attestations across many records. We have per-record `intranet_content_attestations` but nothing that owns cadence/scope/due-date/completion-rollup. Most material gap: the domain's stated value ("run recertification cycles") has no driver entity.
- **Governance / lifecycle policy** (all flagships) — config object (thresholds, cadence, archive action, scope) that GENERATES attestations/archival/findings. Distinct from `intranet_content_types`.
- **Findings as a first-class entity** — orphaned/inactivity/stale (Or, MS, SG, Si, Aq) + permissions/oversharing (Or, MS, SG). We emit a health score but no durable finding row (type/severity/target/status/resolution) the workflow can route. Stale detection lives only as a score.
- **Accessibility conformance record** (Si, Aq) — statute-anchored (WCAG / EN 301 549 / EAA / ADA / Section 508). We have a scan tool, no conformance entity. EAA enforceable June 2025.

**SCOPE-CREEP:** none. Health score is legitimate but vendors treat it as a view OVER findings, not the primary object. Provisioning + retention/records correctly excluded.

**MODULARIZATION:** the 2-module split (Inventory+Sources / Ownership+Lifecycle+Planning) matches vendor packaging. If anything splits further, it is the Governance module into a Policy & Campaign config layer vs an Attestation & Remediation execution layer — only worth it once policy+campaign+findings land, otherwise one module carries everything (heavy).

## Verdicts (drive the q-file)
- **q1 (gate):** add recertification-campaign + governance-policy engine to the Governance module. The cadence driver the domain's purpose needs. Module-split deferrable.
- **q2:** add `content_governance_findings`. Health score should aggregate findings.
- **q3:** add `accessibility_conformance_records` + WCAG/EN 301 549/EAA regs (ADA + Section 508 domain_regulations already loaded this pass).
- **A3 (no q):** all solutions `partial` is the build's deliberate, evidence-backed white-space call (no pure-play exists). Documented exception, NOT a fix.
- **optional (b3):** typed remediation/improvement master (the build's original `intranet_improvement_items`, dropped in favor of generic embedded `work_items`).
