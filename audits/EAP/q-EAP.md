# Enterprise Agile Planning (EAP): questions waiting for you

## What this domain is

Plan and coordinate agile delivery across every team, program, and portfolio in one place.

Enterprise Agile Planning is the market for scaling agile delivery: program-increment and
release-train coordination, the epic-to-feature backlog hierarchy, cross-team dependency
management, agile roadmaps, OKR-to-delivery alignment, and flow analytics. It is bought by the
engineering and agile-transformation office (release-train engineers, VP Engineering, the agile
PMO), and is distinct from SPM (top-down CIO/EPMO investment planning), from generic work
management (not framework-aware), and from the value-stream delivery toolchain (which builds and
ships code rather than planning it). The domain was created and fully built this pass
(Phase 0 -> A -> B -> C -> S); everything sits at record_status='new' awaiting your review.

---

q1: Demote Jira Align's existing SPM coverage from primary to secondary? (answer this first) (yes/no)

Recommended: yes. Atlassian Jira Align is the canonical enterprise-agile-planning flagship, purpose-built on Jira for SAFe release trains and program increments; it is not a strategic-portfolio-management product. The SPM pure-plays (Planview Portfolios, Broadcom Clarity, ServiceNow SPM) own the CIO/EPMO investment-planning surface Jira Align does not master. It is now primary on EAP (added this build) and was already primary on SPM from an earlier load, which double-counts it. This rewrites an existing value on SPM's row, so it needs your sign-off before I touch it.

a1:

---

q2: Author Phase E (personas + RACI) for EAP now? (yes/no)

Recommended: yes. You scoped this build to A+B+C+S, so personas were deferred. EAP is a multi-module domain with real workflow gates (approve_epic on epics, commit_pi on program increments), so it has genuine job-shaped personas to author (release-train engineer, agile PMO / portfolio manager, team product owner) and gated RACI to anchor them. This is additive work I can do without any destructive change.

a2:

---

<!-- agent map, ignore: q1=B2-EAP-JIRA-ALIGN q2=B2-EAP-PHASE-E | domain_id=186 -->
