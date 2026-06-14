# Insider Risk Management (INSIDER-RISK): questions waiting for you

## What this domain is
See, investigate, and contain insider risk before trusted users cause a breach.

Spot the people-shaped risks your perimeter tools miss. Score every user's behavior, surface anomalous data movement and risky activity as prioritized alerts, and turn the noise into a clear case queue. Investigate with file-lineage forensics and a full activity timeline, collect defensible evidence for HR and Legal, and keep a close watch on departing employees during their highest-risk window. Pull in egress signals, sensitive-data context, and employment status automatically, so analysts spend their time on real threats instead of stitching data together.

---

q1: (answer this first) Should Insider Risk Management stay its own domain, or fold into Data Loss Prevention or Data Security Posture Management?

- a) Keep it as its own domain (this is how it was built)
- b) Fold it into Data Loss Prevention as a module
- c) Fold it into Data Security Posture Management as a module

Recommended: a. Insider Risk Management is a recognized standalone market, not a feature of DLP or DSPM. Gartner publishes a dedicated Market Guide for Insider Risk Management Solutions (March 2025) and a dedicated Peer Insights market. At least three independent vendors run insider risk as their flagship product: DTEX markets InTERCEPT explicitly as an insider risk management solution, Teramind is a dedicated insider threat and employee-monitoring product, and Proofpoint sells a dedicated Insider Threat Management line (built on its ObserveIT acquisition). Code42 Incydr (acquired by Mimecast in 2024, now Mimecast Incydr) and Microsoft Purview Insider Risk Management round out the surface. DLP enforces content egress at the perimeter (one signal), DSPM secures data at rest, and UEBA scores anomalies generically; insider risk is the human-centric case-and-investigation discipline that fuses those signals around the person. It consumes DLP/DSPM/UEBA signals but masters its own records, which is why it is its own domain, not a DLP/DSPM module. This is the gate decision that the rest of the build depends on.

a1:

---

q2: Is the signal boundary correct, where Insider Risk consumes (but never re-masters) egress incidents and activity logs from Data Loss Prevention, sensitive-data risk scores from Data Security Posture Management, and employee records from Human Capital Management, and masters only its own scores, alerts, cases, evidence, and exit assessments? (yes/no)

Recommended: yes. The flagship vendors split the same way. Mimecast Incydr is itself a DLP-plus-CASB-plus-UEBA blend that consumes egress and endpoint telemetry rather than redefining it; DTEX and Teramind ingest endpoint, email, and cloud activity; Microsoft Purview Insider Risk consumes Microsoft 365 signals and DLP policy matches rather than re-mastering DLP; and Forcepoint Risk-Adaptive Protection reads the user risk score to drive DLP enforcement (the exact score-breach to DLP handoff modeled here). So the catalog boundary is: DLP masters egress incidents and activity logs, DSPM masters sensitive-data risk scores, HCM masters employees, and Insider Risk consumes all of them as optional signals (it degrades gracefully when one is absent) and masters only the insider-risk-specific records. Single-master integrity is verified: each of the seven Insider Risk masters has exactly one master row across the whole catalog.

a2:

---

q3: Which cross-industry process node should anchor the insider-threat investigation responsibility (RACI)?

- a) "Develop and manage IT security, privacy, and data protection" (PCF 8.3.5, the broader security-program node, built this way)
- b) "Monitor IT infrastructure security" (PCF 8.7.6.7, the narrower monitoring node)
- c) Other / propose a custom process node

Recommended: a. The APQC cross-industry process framework has no insider-risk-specific activity, so the choice is between a program-level home and a monitoring-level home. 8.3.5 was chosen because insider risk spans both the always-on monitoring plane and the program and policy governance plane (exit-risk policy, HR and Legal escalation discipline), which is broader than infrastructure-security monitoring alone. Pick (b) if you would rather anchor it to the tighter monitoring node; the three responsibility rows (Investigator responsible, Program Manager accountable, Analyst consulted) re-point trivially either way. Low stakes, does not change the build.

a3:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3 | domain_id=178 | phase0=.tmp_deploy/IRM-phase0-2026-06-14.md | reversed: none -->
