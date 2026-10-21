# VULN-MGMT full-build draft (Vulnerability Management, id 13)

**Domain one-liner:** Find every weakness across the estate, fix the ones an attacker would actually use first, and prove it stayed fixed. Parent domain is SECOPS (id 11); owner business function is the Security Operations Center.

This domain was severely under-built: 5 solutions but zero masters, zero capabilities, zero modules, no system skill. This draft delivers the heaviest build: Phase B masters from scratch, capabilities, three modules, lifecycle states, system-skill tools, module_tools, and personas.

## Capabilities (8)

1. Scanning and Detection (VULN-MGMT-SCAN-DETECT)
2. Vulnerability Knowledge Base (VULN-MGMT-CVE-CATALOG)
3. Risk-Based Prioritization (VULN-MGMT-RISK-PRIORITIZE)
4. Remediation Orchestration (VULN-MGMT-REMEDIATE-ORCH)
5. Exception and Risk Acceptance (VULN-MGMT-EXCEPTION-GOV)
6. Verification and Closure (VULN-MGMT-VERIFY-CLOSE)
7. Compliance Evidence and Reporting (VULN-MGMT-COMPLIANCE-EVIDENCE)
8. Assessment Scoping and Campaigns (VULN-MGMT-ASSESS-CAMPAIGN)

None flagged cross_cutting: every capability is intrinsic to the vulnerability lifecycle this domain owns.

## Module split (3 full modules)

- **VULN-MGMT-DETECT (Scanning and Detection):** scans -> findings -> knowledge-base matching. Masters `vulnerability_scans`, `vulnerabilities`, `vulnerability_definitions`. Consumes `software_installations` (existing, from SAM) and embeds `org_units`.
- **VULN-MGMT-RISK (Prioritization and Risk):** ranking layer plus the point-in-time assessment lens. Masters `vulnerability_assessments`; consumes vulnerabilities and definitions; consumes exploit intel from THREAT-INTEL.
- **VULN-MGMT-REMEDIATE (Remediation and Governance):** the closed loop. Masters `vulnerability_remediations` and `vulnerability_exceptions`; covers remediation, exceptions, verification, and compliance evidence.

Every capability is realized by at least one module; every master is mastered in exactly one module (verified).

## Phase B masters (6 new, all names confirmed free in the live catalog)

- `vulnerabilities` (operational_workflow) - the headline finding/instance.
- `vulnerability_scans` (operational_workflow) - scan jobs (scope-qualified vs existing `discovery_scans`).
- `vulnerability_definitions` (catalog) - the CVE/advisory/check knowledge base.
- `vulnerability_remediations` (operational_workflow) - security-side remediation work.
- `vulnerability_exceptions` (operational_workflow, has_submit_lock + has_single_approver) - governed, time-boxed risk acceptances.
- `vulnerability_assessments` (operational_workflow) - scoped point-in-time campaigns.

Assets are deliberately NOT mastered here (ITAM id 3 / CMDB id 4 own them); linked only as consumers.

## Lifecycle states

Proposed for all 5 workflow masters. `vulnerabilities`: open -> triaged -> remediating -> resolved -> accepted (gated) -> verified -> closed (+ reopened). Scans, remediations, exceptions, and assessments each get their own ordered states with exactly one initial, at least one terminal, and `requires_permission` on approval/verification gates.

## What's reused vs new

- **Reused:** 5 solutions (ServiceNow Vulnerability Response, Tenable One, Qualys VMDR, Rapid7 InsightVM, Wiz) and their vendors; `software_installations` consumer; `org_units` embedded master; inbound handoff `software_install.detected` from SAM.
- **New:** all capabilities, all 3 modules, all 6 masters, lifecycle states, 15 tools, 18 module_tools, 5 personas.
- **vendors_new / solutions_new:** none. Footprint already has 5 flagship primaries; Microsoft Defender VM appears in Phase 0 surface but is not added as a solution row (decision left to the human; not gating).

## Tools and personas

15 tools (query + representative mutate per workflow master, plus `compute_vulnerability_priority`, `fetch_exploit_intel`, `generate_compliance_evidence`, and `notify_team` abstraction). 5 job-shaped personas: Vulnerability Analyst, VM Program Manager, Remediation Owner (IT Ops), Application Remediation Engineer (Eng), and a cross-functional Risk and Compliance Approver.

## Top decisions for the human

1. **MODULE-SPLIT (gating):** recommend three modules (a) over a two- or four-way split.
2. **REMEDIATION-OWNERSHIP:** recommend mastering `vulnerability_remediations` here and handing off to ITSM (id 1) on assignment; flagship vendors keep their own remediation entity.
3. **CVE-INTEL-SOURCE:** recommend mastering the static definitions catalog here but consuming volatile exploit intel from THREAT-INTEL (id 14) via an inbound handoff.

A fourth non-gating decision freezes the exception pattern flags (submit_lock + single_approver).
