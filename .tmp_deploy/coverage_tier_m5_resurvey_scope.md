# M5 — inbound re-survey scope

After M1+M2+M3+M4 land, the 31 modules below need a full re-analysis to discover missing inbound primitives (`receive_email`, `receive_webhook`, `receive_sms`, `receive_voice_call`, `ingest_event_stream`, `receive_edi_message`, `receive_file_drop`) and any outbound regulatory tools (`submit_*`, `transmit_edi_message`) that should be in their `skill_tools` required set.

Each module gets its own draft + per-domain user-review pass per Rule #1 (`record_status='new'` on every new `skill_tools` row until you bulk-approve).

Non-modularized domains (115 legacy domain-only system skills) are out of scope — they're already pending a full review per separate plan.

## 8 domains, 31 modules

| Domain | Modules |
|---|---|
| **APM** | APM-PORTFOLIO-REGISTRY, APM-RATIONALIZATION |
| **ATS** | ATS-BACKGROUND-CHECKS, ATS-CANDIDATE-CRM, ATS-INTERVIEWS, ATS-OFFERS, ATS-PRE-EMPLOYEE-RECORD, ATS-RECRUITMENT-PIPELINE, ATS-REFERRALS, ATS-TALENT-POOLS |
| **EMP-EXP** | EMP-EXP-CONTINUOUS-LISTEN |
| **ITAM** | ITAM-CONTRACTS, ITAM-LIFECYCLE, ITAM-NORMALIZATION-CATALOG, ITAM-PORTFOLIO-REPORTING |
| **ITSM** | ITSM-AGENT-WORKSPACE, ITSM-CHANGE-MGMT, ITSM-EVENT-MGMT, ITSM-INCIDENT-MGMT, ITSM-KNOWLEDGE, ITSM-PROBLEM-MGMT, ITSM-SERVICE-REQUEST, ITSM-SLA-MGMT |
| **LMS** | LMS-COMPLIANCE-TRAINING, LMS-COURSE-DELIVERY, LMS-SKILLS |
| **SMP** | SMP-DISCOVERY-OPT, SMP-RENEWAL |
| **TALENT-MGMT** | TALENT-CONTINUOUS-FEEDBACK, TALENT-PERFORMANCE-MGMT, TALENT-SUCCESSION-CAREER |
