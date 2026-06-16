# EAP (Enterprise Agile Planning) — audit history

## 2026-06-16 — Initial build (Phase 0 -> A -> B -> C -> S)

New top-level domain created from a Phase 0 vendor-surface decision. User approved
"create both (EAP + VSM), full build (A+B+C+S)" interactively, with the Phase 0 report
(`c:/tmp/EAP-phase0-2026-06-16.md`) as the market-shape grounding.

**Phase 0 verdict.** EAP passes the point-solution-market test decisively: 7 independent
flagships (Atlassian Jira Align, Broadcom Rally, Digital.ai Agility, Planview AgilePlace,
IBM/Apptio Targetprocess, Microsoft Azure Boards, GitLab). Gartner downgraded the EAP Magic
Quadrant to a Market Guide (2025) but the category is still independently named and bought;
that is commoditization, not absorption into SPM. Distinct from SPM (top-down CIO/EPMO
investment planning), generic WORK-MGMT (not framework-aware), and VSDP (the delivery
toolchain). Owner function: Software Engineering.

**Phase A (market shape).** domain_id=186, crud_percentage=60, cost_band=$$$,
min_org_size="30 m <2500", usa_market_size_usd_m=650 (2025). 8 capabilities, 2 full modules
(EAP-PROGRAM-EXECUTION=399, EAP-PORTFOLIO-ROADMAP=400). Solutions: added Jira Align (existing
72) -> EAP primary, plus Broadcom Rally, Digital.ai Agility, Planview AgilePlace, Targetprocess,
Microsoft Azure Boards (primary), GitLab (secondary).

**Phase B (data footprint).** 7 masters: portfolio_epics, agile_features, program_increments
(operational_workflow); agile_release_trains (catalog); pi_objectives, agile_roadmaps
(operational_record); cross_team_dependencies (operational_workflow). 21 lifecycle states with
2 gates (portfolio_epics -> approve_epic on EAP-PR; program_increments -> commit_pi on EAP-PE).
Naming arbitration: dropped proposed `agile_okrs` and `strategic_themes` masters — EAP consumes
existing okr_objectives (WORK-MGMT) and strategic_initiatives / strategic_portfolios (SPM)
instead. 6 trigger_events, 6 handoffs, 21 relationships (intra-domain hierarchy + users edges +
cross-domain), 16 aliases.

**Phase C (functions).** owner Software Engineering, contributor Product Management, consumer
Business Operations.

**Phase S (agents).** system skill `eap-system` (domain-grain), 28 new tools authored across
the catalog, 40 domain_module_tools. Semantius score 21/22 platform = 95% (only `notify_team`
is external).

All rows landed at `record_status='new'`. Nothing approved.

Open at end of build: B2-EAP-JIRA-ALIGN (destructive coverage re-point), B2-EAP-PHASE-E
(personas/RACI deferred by the A+B+C+S scope), B1B-EAP-VSDP-HANDOFF (VSDP unmodularized).
