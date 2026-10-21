# AUDIT Phase 0: Vendor Surface (2026-06-08)

Internal-audit / assurance market. Produced as the Rule #22 forcing step for the AUDIT (Audit Management, domain_id 16) review. Research only: no DB writes. The prior q-file (2026-06-07) leaned on generic "matches how the vendors present their product" reasoning with no named-vendor specifics; this report grounds every market-shape recommendation in the named flagship surface below.

## Flagship vendors

| Vendor | Product / surface | Specialist in | Why included |
| --- | --- | --- | --- |
| AuditBoard (rebranded "Optro" 2025) | OpsAudit + SOXHUB + RiskOversight | Modern internal-audit + SOX specialist | Gartner / G2 leader; pure-play internal-audit; the cleanest modern surface (plan-to-report in one workspace) |
| Wolters Kluwer TeamMate+ | TeamMate+ Audit + TeamMate Analytics | Big-4 fieldwork heritage; full audit workflow | Pure-play; deepest fieldwork / sampling / time-and-expense surface; multi-year planning + continuous risk assessment |
| Workiva | Workiva platform (Internal Audit + SOX + Internal Controls + ESG assurance) | Financial-reporting + connected-data assurance | Pure-play assurance; strongest shared-data-layer + ESG-assurance + financial-assertion surface |
| Diligent HighBond (formerly ACL Galvanize) | Diligent One: Projects, Results, Frameworks, ACL Analytics, Storyboards | GRC + audit-analytics specialist | Pure-play with the strongest data-analytics-driven testing surface; app-decomposed model is informative for modularization |
| ServiceNow IRM Audit Management | IRM Audit Management (audit plans, engagements, tasks, observations, evidence requests) | Suite competitor (IRM/GRC platform) | The "audit as one workflow inside a GRC suite" view; informs the AUDIT-vs-GRC boundary call |

AuditBoard, TeamMate+, Workiva, Diligent HighBond are four independent pure-play internal-audit anchors (Rule #2 peer-domain test passes comfortably). ServiceNow IRM is the suite competitor that treats audit as one IRM workflow, which is exactly the "fold into GRC" posture the AUDIT-vs-GRC and domain-peer questions weigh.

## Surface matrix

Columns: AB = AuditBoard, TM = TeamMate+, WK = Workiva, DH = Diligent HighBond, SN = ServiceNow IRM. `Y` = first-class master in the flagship surface; `.` = absent or not first-class.

| Entity | Category | AB | TM | WK | DH | SN | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| audit_universe_entities | Master | Y | Y | Y | Y | . | Core | AUDIT-PLAN-ENGAGE |
| risk_assessments (audit-scoped) | Master | Y | Y | Y | Y | Y | Core | AUDIT-PLAN-ENGAGE |
| audit_plans | Master | Y | Y | Y | Y | Y | Core | AUDIT-PLAN-ENGAGE |
| audit_engagements | Master | Y | Y | Y | Y | Y | Core | AUDIT-PLAN-ENGAGE |
| audit_programs | Config/template | Y | Y | Y | Y | . | Core | AUDIT-PLAN-ENGAGE |
| engagement_workflows | Config/template | Y | Y | Y | . | Y | Core | AUDIT-PLAN-ENGAGE |
| work_papers | Master | Y | Y | Y | Y | . | Core | AUDIT-PLAN-ENGAGE |
| audit_evidence | Master/junction | Y | Y | Y | Y | Y | Core | AUDIT-PLAN-ENGAGE |
| evidence_requests | Junction/workflow | Y | Y | Y | Y | Y | Core | AUDIT-PLAN-ENGAGE |
| control_tests | Master | Y | Y | Y | Y | Y | Core | AUDIT-PLAN-ENGAGE |
| audit_samples | Master | Y | Y | Y | Y | . | Core | AUDIT-PLAN-ENGAGE |
| audit_walkthroughs | Master | Y(SOXHUB) | Y | Y | . | Y | Core | AUDIT-PLAN-ENGAGE |
| audit_findings (issues/observations) | Master | Y | Y | Y | Y | Y | Core | AUDIT-FINDINGS-REPORTING |
| management_responses | Master | Y | Y | Y | Y | Y | Core | AUDIT-FINDINGS-REPORTING |
| audit_recommendations | Master | Y | Y | Y | Y | . | Core | AUDIT-FINDINGS-REPORTING |
| follow_up_actions (remediation/action plans) | Master | Y | Y | Y | Y | Y | Core | AUDIT-FINDINGS-REPORTING |
| audit_reports | Master | Y | Y | Y | Y | Y | Core | AUDIT-FINDINGS-REPORTING |
| audit_committee_meetings (board/committee pack) | Master | Y | . | Y | Y(Storyboards) | . | Common | AUDIT-FINDINGS-REPORTING |
| audit_time_entries | Master | Y | Y | . | . | . | Common | AUDIT-PLAN-ENGAGE |
| auditee_contacts | Master | Y | Y | . | . | . | Common | AUDIT-PLAN-ENGAGE |
| internal_control_narratives | Config/template | Y(SOXHUB) | Y | Y | . | Y | Core | AUDIT-PLAN-ENGAGE |
| audit_assertions | Config/template | . | Y | Y | . | . | Common | AUDIT-PLAN-ENGAGE |
| audit_sampling_methods | Config/template | . | Y | . | Y | . | Common | AUDIT-PLAN-ENGAGE |
| audit_questionnaires | Config/template | Y | Y | . | . | Y(interview) | Common | AUDIT-PLAN-ENGAGE |
| qar_assessments (IIA 1300 QAIP) | Master | Y | Y | . | . | . | Common | AUDIT-FINDINGS-REPORTING |
| audit_metrics (committee KPIs) | Computed | Y | . | Y | Y(Storyboards) | Y | Common | AUDIT-FINDINGS-REPORTING |
| controls (control library) | Master (GRC-owned) | shared | shared | shared | shared | shared | Consumed | consumed from GRC |
| risks (enterprise risk register) | Master (GRC-owned) | shared | shared | shared | shared | shared | Consumed | consumed from GRC |

Workflow substrate beneath the headline masters, confirmed across the surface: annual/multi-year **audit planning** -> **risk assessment** scoring per universe entity -> **engagements** (scope, team, phases/timeline) -> **audit programs / engagement workflows** (reusable step templates) -> **work papers** (version-controlled, e-signed) + **control tests** + **walkthroughs** drawing on **audit samples** and **audit evidence** raised via **evidence requests** -> **findings/observations** -> **management responses** + **audit recommendations** -> **follow-up / remediation action plans** to closure -> **audit reports** to leadership and the **audit committee**, with **audit metrics** for committee KPIs and **time entries** for engagement effort. This is the "miss the substrate, ship only the headline noun" surface the prior load already mostly captured (8 masters live) but which is missing the planning-input layer (universe + risk assessment + programs), the evidence layer (evidence + evidence requests + samples), and the response layer (management_responses).

## Compliance entities (non-optional for regulated scope)

This is an assurance market: SOX audit trails and segregation-of-duties records are load-bearing compliance entities. Each loads regardless of vendor presence (vendors hide compliance internals from public docs).

| Entity | Regulation / standard | Proposed module | Evidence |
| --- | --- | --- | --- |
| sox_audit_trails (immutable change log) | SOX / PCAOB AS 2201 | AUDIT-PLAN-ENGAGE | Workiva ("full audit trail of all changes", granular per-narrative); every flagship advertises an immutable action log on control tests / work papers / approvals |
| sod_violations (segregation-of-duties) | SOX ICFR | AUDIT-PLAN-ENGAGE (or consumed from a SoD/access-governance specialist) | SOX-tooling surface: SoD analysis across SAP/Oracle/Workday, continuous monitoring with violation alerts (Pathlock); AuditBoard SOXHUB control testing |
| electronic_signature_records | SOX / PCAOB; FDA Part 11 for life-sciences audits | AUDIT-PLAN-ENGAGE | AuditBoard OpsAudit "electronic sign-offs"; work-paper sign-off is the e-signature of record |

Governing frameworks to attach via `domain_regulations` (today AUDIT carries SOX, ISO/IEC 27001, SOC 2): add **PCAOB AS 2201** (external SOX ICFR audits) and the **IIA Standards / Global Internal Audit Standards** (the defining internal-audit-practice framework; QAIP, planning, and reporting cadence all derive from it). Both are statutory/standards-body names (Rule #18 allows them in `regulations`), not commercial trademarks.

## Marketed product surfaces (grounds the module-split call)

How each flagship packages the domain into product surfaces:

- **AuditBoard**: separate but data-connected apps. **OpsAudit** = the full plan-to-report internal-audit lifecycle (planning, fieldwork, work papers, findings, reporting). **SOXHUB** = SOX-specific control documentation/testing/walkthroughs. **RiskOversight** = the enterprise risk register the audit plan is built from. Planning/fieldwork is one product; issue tracking/remediation is folded into the same OpsAudit lifecycle, not split off into a separate purchasable surface.
- **TeamMate+**: a single end-to-end audit-workflow product "from establishing annual plans to planning audits, from fieldwork and execution to reporting, to closing the audit and follow up." It bundles planning + risk assessment + work papers + issue tracking + time/expense in one surface. TeamMate Analytics is a separate companion. No planning-vs-findings product split.
- **Workiva**: one connected platform, same data, spanning internal audit + SOX/internal controls + ESG assurance + risk + policies. Findings aggregate up to the audit committee from the same data layer. No internal product split; the modularity is by use-case (audit / SOX / ESG-assurance) over a shared substrate.
- **Diligent HighBond / Diligent One**: explicitly app-decomposed: **Projects** (audit projects + work papers), **Results** (issue remediation + workflow automation), **Frameworks** (controls), **Storyboards** (committee/board reporting + visualization), **ACL Analytics** (data-driven testing). This is the one flagship that separates fieldwork (Projects) from issue management (Results) at the product-surface level, which is the evidence for a planning/fieldwork-vs-findings/reporting module split.
- **ServiceNow IRM Audit Management**: audit is one workflow inside the broader IRM/GRC platform. Audit plans group engagements; engagements carry tasks (Activity / Control Test / Interview / Walkthrough), observations, evidence requests; controls and risks are mastered by the wider IRM suite, not by an audit-specific product. This is the "audit as a GRC sub-module" model.

## Modularization hypothesis

Two-module shape is the recommended cut, grounded in the surface:

- **AUDIT-PLAN-ENGAGE** masters the planning + fieldwork half: audit universe, audit-scoped risk assessments, audit plans, engagements, audit programs / engagement workflows, work papers, control tests, walkthroughs, audit samples, audit evidence + evidence requests, plus the SOX audit-trail / SoD / e-signature compliance substrate, time entries, and auditee contacts. This is the OpsAudit / TeamMate+-fieldwork / HighBond-Projects surface.
- **AUDIT-FINDINGS-REPORTING** masters the issue + reporting half: audit findings/observations, management responses, audit recommendations, follow-up / remediation action plans, audit reports, audit committee meetings, QAR assessments, audit metrics. This is the HighBond-Results + Storyboards surface and the closing arc of OpsAudit / TeamMate+.

Why two, not three: only Diligent HighBond cleanly separates fieldwork (Projects) from issue management (Results) at the product-surface level; AuditBoard, TeamMate+, Workiva, and ServiceNow all run the full lifecycle (or full IRM workflow) as one surface. A three-module split (Universe+Risk / Fieldwork / Issues+Reporting) gives cleaner staff-auditor-vs-director role surfaces and matches HighBond's app shape, but it roughly doubles the cross-module handoffs (about 8 vs about 3 B9b rows) and no other flagship reinforces the universe/risk-vs-fieldwork seam: every other vendor builds planning and fieldwork on the same engagement spine. The two-module shape is therefore the vendor-majority cut; three-module is the cleaner-role-separation alternative.

`controls` and `risks` are consumed from GRC, not mastered here: every flagship draws the audit plan from a risk register and tests against a control library that the wider GRC/IRM suite owns (AuditBoard RiskOversight is its own register; ServiceNow IRM masters controls/risks suite-wide; Workiva's connected layer shares them). AUDIT masters the audit-scoped *assessment* of those risks/controls (the per-engagement risk score, the per-engagement control test), not the enterprise registers themselves.
