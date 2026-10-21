# Embedded-master + necessity backfill — cluster plan

**Why:** SKILL.md Phase 2 was expanded 2026-05-22 with two new classification axes:
- `role` enum gained `embedded_master`
- new `necessity` enum: `required` (default) / `optional`

Existing 726 `domain_data_objects` rows all defaulted to `necessity='required'`. None are tagged `embedded_master` yet — but a substantial share of the catalog's `master` rows actually describe point-solution local-mastership that defers to a canonical master in a holistic deployment (ATS↔positions, LMS↔employees, OMS↔customers, CCAAS↔customers, …). Plus many obvious consumer reads are missing entirely (ATS↔cost_centers, ATS↔positions, FSM↔customers, …).

This drift kills Signal 1 (multi-master integration burden) accuracy and is the root cause of the "23 master-only island domains" finding from the schema audit.

**Approach:** spawn one deep-classification subagent per cluster of related domains. Each subagent:
1. Reads the new SKILL.md Phase 2 + Phase 4 sections (mandatory).
2. Audits its cluster's live `domain_data_objects` rows via semantius CLI.
3. Reasons about each domain's standalone-vs-holistic authority claim per data_object.
4. Outputs a structured markdown draft to `.tmp_deploy/embedded_master_backfill_<slug>.md`.
5. Does NOT write to Semantius — drafts are reviewed cluster-by-cluster.

## Clusters (11)

| # | Slug | Domains (count) | Members |
|---|---|---:|---|
| 1 | `hr` | 13 | HCM, PAYROLL, ATS, ONBOARDING, BEN-ADMIN, COMP-MGMT, LMS, PA, TALENT-MGMT, WFM, EMP-EXP, SWP, HRSD |
| 2 | `customer` | 14 | CRM, CDP, MA, CPQ, SALES-ENG, LOYALTY, B2C-COMM, PRM, SMM, REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN, CSM |
| 3 | `it-ops` | 17 | ITSM, ITOM, ITAM, HAM, SAM, FINOPS, SMP, CMDB, OBS, AIOPS, DISCOVERY, DEM, NPMD, DCIM, UEM, REMOTE-ACCESS, RMM |
| 4 | `security` | 14 | GRC, AUDIT, BCM, ESG, OP-RES, PRIV-MGMT, TPRM, SECOPS, SOAR, THREAT-INTEL, VULN-MGMT, IGA, DLP, DSPM |
| 5 | `finance` | 10 | ERP-FIN, EPM, AP-AUTO, EXPENSE, SPEND-MGMT, S2P, SUP-LIFE, VMS, CLM, SUB-MGMT |
| 6 | `engineering` | 12 | KUBE-PLAT, APIM, APP-PAAS, IPAAS, LCAP, NCDB, VSDP, TEST-MGMT, RPA, PROD-MGMT, SPM, APM |
| 7 | `data-knowledge` | 14 | DATA-AI-PLAT, DCG, DI, DQ, MDM, BI, METRICS-LAYER, KGP, KMS, ECM, DAM, IDP, HCMS, WEB-CONTOPS |
| 8 | `workspace` | 7 | DXP, WSC, COLLAB-GOV, INTRANET, CONV-AI, CCAAS, ESIGN |
| 9 | `field-facilities` | 13 | FSM, FLEET-MGMT, FLEET-MAINT, TELEMATICS, EAM, REAL-EST, CAFM, IWMS, RE-CRE, RE-PROP-MGMT, RE-BROKERAGE, RE-INVEST, VIS-MGMT |
| 10 | `industry-a` | 9 | BANK-OPS, INS-CLAIMS, HC-PATIENT, UTIL-OPS, TELCO-BSS, MFG-OPS, RET-STORE, PS-LIC, CLIN-DEV |
| 11 | `industry-b` | 11 | ACCT-PRACT-MGMT, LEGAL-PRACT-MGMT, VET-PRACT-MGMT, AGENCY-MGMT, MSP-PSA, PSA, LSD, OMS, WORK-MGMT, BPA, PROC-MIN |

Total: 134 domains.

## Output format per cluster

Each subagent writes `embedded_master_backfill_<slug>.md` with:
- Existing rows snapshot
- NEW rows to add (with reasoning per row)
- CHANGES to existing rows (role demotions / necessity flips, with reasoning)
- Boundary observations (cross-cluster authority sharing)
- Open questions for human review

Drafts reviewed and loaded cluster-by-cluster after the user signs off.
